//! 트레이 아이콘·메뉴.
//!
//! [목적] 확정사항 §6 — 메뉴 4항목: 설정 열기 / 새로고침 / 오버레이 표시·숨김 / 종료.
//!        표시/숨김은 SV2부터 `window::apply_overlay_window`로 창 속성 전체(표시·작업표시줄·
//!        클릭 통과)를 다시 적용한다(§3.3). **새로고침**(CR-046 보강, 사용자 승인
//!        2026-09-26)은 훅의 눌린 키·마우스 버튼 표를 비우고(`hook::refresh`) 오버레이
//!        WebView 를 다시 불러온다(`WebviewWindow::reload`) — 뗌 유실로 그림이 눌림에
//!        고착됐을 때 사용자가 수동으로 되돌리는 비상 스위치다.
//!        CR-048 TM-11 — 스톱워치나 타이머가 켜져 있을 때만(`timer.enabled`) 메뉴 맨 위에
//!        「시작」(흐르는 중이면 「일시정지」)·「멈춤」·구분선을 더 보인다(`sync_timer_menu`).
//!        overlay R-40(CR-062) — 훅이 넘긴 오른쪽 누름→뗌 한 쌍을 받아 열림 가드·전체 화면
//!        판정 뒤 오버레이 창 사각형 안이면 트레이와 같은 메뉴를 커서 위치에 띄운다
//!        (`popup.rs`). 메뉴 클릭은 새 핸들러 없이 기존 `init`의 전역 `on_menu_event`가 처리한다.
//! [공개 API] `init(app)`, `autostart::{TASK_NAME, AutostartError, build_task_xml, set_enabled,
//!        reconcile, persist_autostart}`(SV2-05, CR-047, `autostart.rs`), `sync_timer_menu(app)`
//!        (CR-048, `timer_menu::{TrayTimerView, tray_timer_view}` 재수출),
//!        `spawn_popup_listener(app, rx)`(overlay R-40, `popup.rs` 재수출).
//! [방식] Tauri 2 `tray-icon` feature. 아이콘은 번들 기본 창 아이콘을 재사용한다.
//! [스레드] `sync_timer_menu`는 본문 전체를 `AppHandle::run_on_main_thread`로 메인 스레드에
//!        넘겨 실행한다(D48-t1) — 호출 스레드가 여럿(메인·마감 스레드·command)이라 늦게 계산한
//!        보기가 먼저 적용되는 뒤바뀜을 막는다. `TrayIcon::set_menu` 자체도 내부적으로
//!        `run_on_main_thread` + 채널 대기로 메인 스레드에 동기 위임한다(Tauri 2.11.6
//!        `menu/mod.rs` `run_item_main_thread!` 확인, T-C6). 마지막 보기는 모듈 정적
//!        `LAST_VIEW: Mutex<Option<TrayTimerView>>`. overlay R-40: `spawn_popup_listener`가
//!        전용 스레드 "overlay-menu"를 하나 띄운다(수신 전용, `recv` 대기라 idle CPU 0).
//!        상태(`PopupGate`) 판정·창 사각형 조회·전경 화면 판정은 그 스레드에서, 팝업은
//!        `run_on_main_thread`로 메인 스레드에 post한다.
//! [자동 실행] `autostart.rs` — 작업 스케줄러 작업 `kuro_keyviewer`(로그온·일반 권한, CR-047).
//!        옛 tauri-plugin-autostart 는 bridge 전환 전까지 병행 유지(설계 §9 제거 순서).
//! [unsafe] 없음(승격 실행 경로는 CR-047로 삭제됐다. 새로고침은 `hook::refresh`·
//!        `WebviewWindow::reload` 모두 안전한 공개 API. 타이머 메뉴도 안전한 Tauri API만 쓴다.
//!        overlay R-40: 전경 창 조회는 `hook::foreground_snapshot()`(안전 래퍼)만 부른다 —
//!        `popup.rs`는 `windows` 크레이트를 import하지 않는다).
//! [테스트] GUI·UAC 필요 — 수동 확인(tray.md §8.3). `autostart.rs`·`timer_menu.rs`는 순수 로직
//!        단위 테스트. overlay R-40: `popup.rs`의 `should_popup`·`suppress_for_fullscreen`·
//!        `should_request`·`PopupGate`는 PM1~PM15·FS1~FS7(순수, 지역 상태만). `spawn_popup_listener`·
//!        `request_popup`·`popup_now`는 Tauri 런타임·GUI가 필요해 수동(tray.md §8.3 MC-31~MC-45).

use std::sync::Mutex;
use std::time::Instant;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager};

use crate::error::BridgeError;
use crate::timer::{TimerAction, TimerError, TimerStatus};
use crate::window;

pub mod autostart;
mod popup;
mod timer_menu;

pub use popup::spawn_popup_listener;
pub use timer_menu::{tray_timer_view, TrayTimerView};

const ID_OPEN_SETTINGS: &str = "open_settings";
const ID_REFRESH: &str = "refresh";
const ID_TOGGLE_OVERLAY: &str = "toggle_overlay";
const ID_QUIT: &str = "quit";
/// CR-048 TM-11 — 타이머 메뉴 id. 라벨은 한국어 고정(A-3, 트레이 다국어는 요구 없음).
const ID_TIMER_TOGGLE: &str = "timer_toggle";
const ID_TIMER_STOP: &str = "timer_stop";

/// 마지막으로 적용한 타이머 메뉴 보기. 같으면 `sync_timer_menu`가 아무것도 하지 않는다.
static LAST_VIEW: Mutex<Option<TrayTimerView>> = Mutex::new(None);

pub fn init(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let hidden = TrayTimerView {
        visible: false,
        running: false,
    };
    let menu = build_menu(app, hidden)?;

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| BridgeError::new("tray.no_icon", "트레이 아이콘 이미지가 없습니다."))?;

    TrayIconBuilder::with_id("main")
        .icon(icon)
        .tooltip("kuro_keyviewer")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            let result = match event.id.as_ref() {
                ID_OPEN_SETTINGS => window::show_settings_window(app),
                ID_REFRESH => refresh_overlay(app),
                ID_TOGGLE_OVERLAY => toggle_overlay(app),
                ID_TIMER_TOGGLE => {
                    control_timer_from_tray(app, true);
                    Ok(())
                }
                ID_TIMER_STOP => {
                    control_timer_from_tray(app, false);
                    Ok(())
                }
                ID_QUIT => {
                    app.exit(0);
                    Ok(())
                }
                _ => Ok(()),
            };
            if let Err(e) = result {
                log::warn!("트레이 메뉴 처리 실패: {e}");
            }
        })
        .build(app)?;

    // setup의 sync_timer_menu 1회 호출이 켜짐으로 저장돼 있으면 메뉴를 바꾸도록, 초기
    // 보기를 "숨김"으로 기록해 둔다(§3.6.3).
    if let Ok(mut last) = LAST_VIEW.lock() {
        *last = Some(hidden);
    }

    Ok(())
}

/// 메뉴 항목 조립 한 곳(`init`·`sync_timer_menu`가 같이 쓴다). 보기가 숨김이면 기존 4항목만,
/// 아니면 타이머 항목 2개 + 구분선을 위에 더 붙인다(02-design §7, D-11 A).
fn build_menu(app: &AppHandle, view: TrayTimerView) -> tauri::Result<Menu<tauri::Wry>> {
    let open = MenuItem::with_id(app, ID_OPEN_SETTINGS, "설정 열기", true, None::<&str>)?;
    let refresh = MenuItem::with_id(app, ID_REFRESH, "새로고침", true, None::<&str>)?;
    let toggle_overlay = MenuItem::with_id(
        app,
        ID_TOGGLE_OVERLAY,
        "오버레이 표시/숨김",
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, ID_QUIT, "종료", true, None::<&str>)?;

    if !view.visible {
        return Menu::with_items(app, &[&open, &refresh, &toggle_overlay, &quit]);
    }

    let toggle_label = if view.running {
        "일시정지"
    } else {
        "시작"
    };
    let timer_toggle = MenuItem::with_id(app, ID_TIMER_TOGGLE, toggle_label, true, None::<&str>)?;
    let timer_stop = MenuItem::with_id(app, ID_TIMER_STOP, "멈춤", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    Menu::with_items(
        app,
        &[
            &timer_toggle,
            &timer_stop,
            &separator,
            &open,
            &refresh,
            &toggle_overlay,
            &quit,
        ],
    )
}

/// 트레이 메뉴를 지금 설정·타이머 상태에 맞춘다. 보기가 마지막과 같으면 아무것도 하지 않는다.
/// 실패(트레이 없음·메뉴 생성 실패·잠금 오염)는 경고 로그만 남긴다(CR-048 TM-11).
pub fn sync_timer_menu(app: &AppHandle) {
    let handle = app.clone();
    if let Err(e) = app.run_on_main_thread(move || sync_timer_menu_now(&handle)) {
        log::warn!("타이머 메뉴 동기화를 메인 스레드로 넘기지 못했습니다: {e}");
    }
}

/// 지금 설정·타이머 상태의 메뉴 보기(트레이 동기화·오버레이 팝업 공용, overlay R-40).
/// 설정 잠금 → 해제 → 타이머 잠금 → 해제(두 잠금 동시 보유 금지, 계약 §5.8-6).
/// `AppState` 없음 → `None`(로그 없음), 잠금 오염 → `log::warn!` 후 `None`.
fn current_view(app: &AppHandle) -> Option<TrayTimerView> {
    let state = app.try_state::<crate::AppState>()?;
    let enabled = match state.settings.lock() {
        Ok(s) => s.timer.enabled,
        Err(e) => {
            log::warn!("설정 잠금 실패(메뉴 보기 계산): {e}");
            return None;
        }
    };
    let status = match state.timer.lock() {
        Ok(t) => t.status(),
        Err(e) => {
            log::warn!("타이머 잠금 실패(메뉴 보기 계산): {e}");
            return None;
        }
    };
    Some(tray_timer_view(enabled, status))
}

fn sync_timer_menu_now(app: &AppHandle) {
    let Some(view) = current_view(app) else {
        return;
    };

    let mut last = match LAST_VIEW.lock() {
        Ok(l) => l,
        Err(e) => {
            log::warn!("타이머 메뉴 상태 잠금 실패: {e}");
            return;
        }
    };
    if *last == Some(view) {
        return;
    }
    let Some(tray) = app.tray_by_id("main") else {
        log::warn!("트레이 아이콘을 찾을 수 없어 타이머 메뉴를 갱신하지 못했습니다.");
        return;
    };
    match build_menu(app, view) {
        Ok(menu) => match tray.set_menu(Some(menu)) {
            Ok(()) => *last = Some(view),
            Err(e) => log::warn!("타이머 메뉴 적용 실패: {e}"),
        },
        Err(e) => log::warn!("타이머 메뉴 생성 실패: {e}"),
    }
}

/// 트레이 「시작|일시정지」(`toggle == true`)·「멈춤」(`toggle == false`) 처리(CR-048 TM-11).
/// 설정 잠금 → 해제 → 타이머 잠금 → 해제 순서로, 두 잠금을 동시에 쥐지 않는다(계약 §5.8-6).
fn control_timer_from_tray(app: &AppHandle, toggle: bool) {
    let Some(state) = app.try_state::<crate::AppState>() else {
        return;
    };
    let enabled = match state.settings.lock() {
        Ok(s) => s.timer.enabled,
        Err(e) => {
            log::warn!("설정 잠금 실패(트레이 타이머 조작): {e}");
            return;
        }
    };
    let now = Instant::now();
    let outcome = {
        let mut timer = match state.timer.lock() {
            Ok(t) => t,
            Err(e) => {
                log::warn!("타이머 잠금 실패(트레이 타이머 조작): {e}");
                return;
            }
        };
        let action = if toggle {
            if timer.status() == TimerStatus::Running {
                TimerAction::Pause
            } else {
                TimerAction::Start
            }
        } else {
            TimerAction::Stop
        };
        timer
            .apply(action, enabled, now)
            .map(|changed| (changed, timer.snapshot(now)))
    };
    match outcome {
        Ok((true, snapshot)) => crate::publish_timer_change(app, &snapshot),
        Ok((false, _)) => {}
        // 끈 직후 메뉴가 아직 안 사라진 경합 — 무시.
        Err(TimerError::Disabled) => {
            log::warn!("트레이 타이머 조작 무시(스톱워치·타이머가 꺼져 있음)");
        }
    }
}

/// 트레이 「새로고침」(CR-046 보강, 사용자 승인 2026-09-26). 훅의 눌린 키·마우스 버튼
/// 표를 비우고(`hook::refresh`) 오버레이 WebView 를 다시 불러온다. 뗌 유실로 그림이
/// 눌림에 고착됐을 때 사용자가 수동으로 되돌리는 비상 스위치다. 설정 창은 건드리지 않는다.
pub(crate) fn refresh_overlay(app: &AppHandle) -> Result<(), BridgeError> {
    crate::hook::refresh();
    let win = app
        .get_webview_window(window::OVERLAY_LABEL)
        .ok_or_else(|| BridgeError::new("window.not_found", "오버레이 창을 찾을 수 없습니다."))?;
    win.reload().map_err(|e| {
        BridgeError::new(
            "window.reload_failed",
            format!("오버레이를 새로고침하지 못했습니다: {e}"),
        )
    })
}

/// 오버레이 표시/숨김 토글(SV2-03·04). 표시 뒤 `apply_overlay_window`로 작업표시줄·위치
/// 잠금까지 다시 맞춘다 — 숨겼다 다시 보일 때도 설정대로 유지되게 한다(tray.md §3.3).
///
/// 저장은 `settings::update`(CR-047)로 한다. 저장이 실패하면 창을 바꾸지 않고 `Err`를
/// 돌려준다(호출자인 메뉴 핸들러가 경고 로그를 남긴다).
fn toggle_overlay(app: &AppHandle) -> Result<(), BridgeError> {
    let win = app
        .get_webview_window(window::OVERLAY_LABEL)
        .ok_or_else(|| BridgeError::new("window.not_found", "오버레이 창을 찾을 수 없습니다."))?;
    let next = !win.is_visible()?;
    let Some(state) = app.try_state::<crate::AppState>() else {
        return window::set_overlay_visible(app, next);
    };
    let out = crate::settings::update(&state.settings, &state.paths.settings_file, |s| {
        s.overlay.visible = next;
    })
    .map_err(|e| BridgeError::new(e.code(), e.to_string()))?;
    window::apply_overlay_window(app, &out.settings)?;
    if out.changed {
        let _ = crate::bridge::events::emit_settings_changed(app, &out.settings);
    }
    Ok(())
}
