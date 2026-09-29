//! 오버레이 오른쪽 클릭 메뉴(overlay R-40, CR-062, 7차 감사 반영 — 리뷰 CORE-301·SEC-301).
//! [목적] 훅이 넘긴 오른쪽 누름→뗌 한 쌍을 받아 ① 메뉴가 예약됐거나(Pending) 열려
//!        있으면(Open) 버리고 ② 두 점이 모두 보이는 오버레이 창 사각형 안이 아니면
//!        버리고(🔒 U-1) ③ 전경 창이 다른 앱의 전체 화면이면 버리고(🔒 U-3) ④ 아니면
//!        `Idle → Pending`으로 예약하고 메인 스레드에 팝업을 post한다. 메인 스레드는
//!        `Pending → Open`으로 바꾸고 트레이와 같은 `build_menu`로 새 메뉴를 만들어
//!        커서 위치에 띄우고, 닫히면 `Idle`로 되돌린다. 항목 클릭은 기존 `init`의 전역
//!        `on_menu_event`가 처리한다 — 새 핸들러를 등록하지 않는다(두 리스너가 같은
//!        이벤트를 받으면 한 번의 클릭이 두 번 실행되기 때문).
//! [공개 API] `spawn_popup_listener(app, rx) -> std::io::Result<()>`.
//! [스레드] `spawn_popup_listener`가 전용 스레드 "overlay-menu"를 하나 만든다(수신 전용,
//!        `recv` 대기라 idle CPU 0). 판정(상태 → 창 사각형 → 전경 화면)과 예약은 그
//!        스레드에서, 팝업(`popup_now`)은 `run_on_main_thread`로 메인 스레드에 post해서
//!        실행한다 — `popup_menu`는 닫힐 때까지 호출 스레드를 멈추므로 다른 스레드에서
//!        직접 부르지 않는다. 창 사각형 조회(`window::overlay_screen_rect`)는 상태가
//!        Idle일 때만 `overlay-menu`에서 부른다 — 우리 메뉴 모달과 겹치지 않는다(PU-h).
//! [unsafe] 없음. 전경 창 조회는 `hook::foreground_snapshot()`(안전 래퍼, SAFETY 근거는
//!        hook.md §3.10.3 U12~U19)만 부른다. 이 파일은 `windows` 크레이트를 import하지 않는다.
//! [에러] 새 변형 없음. `spawn_popup_listener`는 `std::io::Result<()>`(스레드 생성 실패 —
//!        호출자 경고 로그). 그 밖의 실패(post·창 위치·메뉴 생성·팝업)는 이 파일 안에서
//!        `log::warn!`으로 끝나고 밖으로 나가지 않는다. 판정으로 버리는 경우는 오류가 아니다
//!        (로그 없음).
//! [설정] 읽지 않는다(`position_lock`을 보지 않는다 — 🔒 잠금 중에도 뜬다). 전체 화면 판정은
//!        설정값이 아니다(켜고 끄는 옵션 없음).
//! [테스트] PM1~PM4(`should_popup`)·PM5~PM10(`PopupGate` 상태 전이, 지역 인스턴스)·
//!        PM11~PM15(`should_request` 판정 순서, 단락 평가)·FS1~FS7(`suppress_for_fullscreen`)
//!        — 모두 순수, 정적 `POPUP`을 거치지 않는다. `spawn_popup_listener`·`request_popup`·
//!        `overlay_rect_or_none`·`popup_now`는 Tauri 런타임·GUI가 필요해 수동
//!        (tray.md §8.3 MC-31~MC-45).

use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::mpsc::Receiver;

use tauri::{AppHandle, Manager};

use crate::hook::{self, ForegroundSnapshot, RightClick};
use crate::window::{self, ScreenBounds};

/// 오버레이 메뉴 상태 기계(Idle → Pending → Open → Idle). 앱 전체에 하나.
static POPUP: PopupGate = PopupGate::new();

/// 오버레이 오른쪽 클릭 메뉴 스레드("overlay-menu")를 띄운다. 수신자가 끊기면(훅 종료)
/// 스레드가 끝난다.
pub fn spawn_popup_listener(app: AppHandle, rx: Receiver<RightClick>) -> std::io::Result<()> {
    std::thread::Builder::new()
        .name("overlay-menu".into())
        .spawn(move || {
            for click in rx {
                request_popup(&app, click);
            }
        })
        .map(|_| ())
}

/// overlay-menu 스레드. 판정(① 상태 ② 창 사각형 ③ 전체 화면) → ④ Idle→Pending 예약 →
/// post. 메인 스레드의 "실행"은 기다리지 않는다. ②의 창 getter는 메인 스레드 동기
/// 왕복이지만 Idle일 때만 부르므로 우리 메뉴 모달과 겹치지 않는다(PU-h).
fn request_popup(app: &AppHandle, click: RightClick) {
    let wanted = should_request(
        POPUP.is_idle(),
        click,
        || overlay_rect_or_none(app),
        hook::foreground_snapshot,
    );
    if !wanted || !POPUP.try_reserve() {
        return; // 판정으로 버림 — 로그 없음
    }
    let handle = app.clone();
    if let Err(e) = app.run_on_main_thread(move || popup_now(&handle)) {
        POPUP.cancel(); // Pending → Idle — post 실패로 고착되지 않게
        log::warn!("오버레이 메뉴를 메인 스레드로 넘기지 못했습니다: {e}");
    }
}

/// 보이는 오버레이 창 사각형(숨김 → None). 조회 실패는 경고 후 None(= 버림).
fn overlay_rect_or_none(app: &AppHandle) -> Option<ScreenBounds> {
    window::overlay_screen_rect(app).unwrap_or_else(|e| {
        log::warn!("오버레이 메뉴: 창 위치를 읽지 못했습니다: {e}");
        None
    })
}

/// 메인 스레드 전용. `popup_menu`는 메뉴가 닫힐 때까지 반환하지 않는다(`TrackPopupMenu` 모달).
/// Pending → Open. 이후 모든 반환 경로에서 가드 Drop → Idle.
fn popup_now(app: &AppHandle) {
    let Some(_open) = POPUP.begin_open() else {
        return; // Pending 이 아님 — 도달 불가(PU-c). 상태를 건드리지 않는다
    };
    let Some(view) = super::current_view(app) else {
        log::warn!("오버레이 메뉴: 메뉴 보기를 계산하지 못했습니다.");
        return;
    };
    let menu = match super::build_menu(app, view) {
        Ok(m) => m,
        Err(e) => {
            log::warn!("오버레이 메뉴를 만들지 못했습니다: {e}");
            return;
        }
    };
    let Some(win) = app.get_webview_window(window::OVERLAY_LABEL) else {
        return;
    };
    if let Err(e) = win.popup_menu(&menu) {
        log::warn!("오버레이 메뉴를 띄우지 못했습니다: {e}");
    }
} // _open drop → Idle

/// 순수 판정 순서(SEC-301): ① 상태 ② 창 사각형 ③ 전경 창. `&&` 단락 평가라 앞 단계에서
/// 걸리면 뒤 조회(`rect`·`foreground`)를 부르지 않는다. 상태는 바꾸지 않는다(예약은 호출자).
pub(super) fn should_request(
    idle: bool,
    click: RightClick,
    rect: impl FnOnce() -> Option<ScreenBounds>,
    foreground: impl FnOnce() -> Option<ForegroundSnapshot>,
) -> bool {
    idle && should_popup(rect(), click) && !suppress_for_fullscreen(foreground())
}

/// 순수(🔒 U-3): `None`(전경 없음·조회 실패) → `false`(띄움, fail-open).
pub(super) fn suppress_for_fullscreen(snap: Option<ForegroundSnapshot>) -> bool {
    snap.is_some_and(|s| !s.own_process && !s.shell && s.client.covers(&s.monitor))
}

/// 순수(🔒 U-1): 보이는 창 사각형이 있고 누름·뗌 두 점이 모두 그 안.
pub(super) fn should_popup(rect: Option<ScreenBounds>, click: RightClick) -> bool {
    rect.is_some_and(|r| {
        r.contains(click.down.x, click.down.y) && r.contains(click.up.x, click.up.y)
    })
}

/// 팝업 상태 기계. 원자 변수 하나(잠금이 아니라 교착 경로 없음). 정적 `POPUP` 하나를
/// 쓰고, 테스트는 지역 인스턴스를 만든다(T13 원칙 — 병렬 cargo test 간섭 없음).
struct PopupGate {
    state: AtomicU8,
}

impl PopupGate {
    const IDLE: u8 = 0;
    const PENDING: u8 = 1;
    const OPEN: u8 = 2;

    const fn new() -> Self {
        Self {
            state: AtomicU8::new(Self::IDLE),
        }
    }

    /// overlay-menu: 빠른 거름. Pending(보냈지만 실행 전)·Open(메뉴 열림)이면 false.
    fn is_idle(&self) -> bool {
        self.state.load(Ordering::Acquire) == Self::IDLE
    }

    /// overlay-menu: Idle → Pending. 성공한 호출만 post 한다.
    fn try_reserve(&self) -> bool {
        self.transition(Self::IDLE, Self::PENDING)
    }

    /// overlay-menu: post 실패 시 Pending → Idle.
    fn cancel(&self) {
        self.transition(Self::PENDING, Self::IDLE);
    }

    /// 메인: Pending → Open. 성공했을 때만 가드를 만든다(가드 Drop이 Idle로 되돌림).
    /// `bool::then_some(OpenGuard { .. })` 금지 — 실패해도 가드가 만들어졌다가 Drop 되어
    /// Open 상태를 Idle 로 덮어쓴다(PM9가 잡는다).
    fn begin_open(&self) -> Option<OpenGuard<'_>> {
        if self.transition(Self::PENDING, Self::OPEN) {
            Some(OpenGuard { gate: self })
        } else {
            None
        }
    }

    fn transition(&self, from: u8, to: u8) -> bool {
        self.state
            .compare_exchange(from, to, Ordering::AcqRel, Ordering::Acquire)
            .is_ok()
    }
}

/// Open 가드. Drop(모든 반환 경로)에서 Idle.
struct OpenGuard<'a> {
    gate: &'a PopupGate,
}

impl Drop for OpenGuard<'_> {
    fn drop(&mut self) {
        self.gate.state.store(PopupGate::IDLE, Ordering::Release);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hook::{ScreenPoint, ScreenRect};
    use std::cell::Cell;

    fn point(x: i32, y: i32) -> ScreenPoint {
        ScreenPoint { x, y }
    }

    fn click(down: (i32, i32), up: (i32, i32)) -> RightClick {
        RightClick {
            down: point(down.0, down.1),
            up: point(up.0, up.1),
        }
    }

    /// 오버레이 창 사각형 기준값(tray.md §3.7.8).
    fn overlay_rect() -> ScreenBounds {
        ScreenBounds {
            x: 100,
            y: 100,
            width: 450,
            height: 350,
        }
    }

    fn monitor() -> ScreenRect {
        ScreenRect {
            left: 0,
            top: 0,
            right: 1920,
            bottom: 1080,
        }
    }

    #[test]
    fn should_popup_both_inside() {
        assert!(should_popup(
            Some(overlay_rect()),
            click((150, 150), (400, 300))
        ));
    }

    #[test]
    fn should_popup_hidden_is_false() {
        assert!(!should_popup(None, click((150, 150), (400, 300))));
    }

    #[test]
    fn should_popup_down_only_inside() {
        assert!(!should_popup(
            Some(overlay_rect()),
            click((150, 150), (900, 300))
        ));
    }

    #[test]
    fn should_popup_up_only_inside() {
        assert!(!should_popup(
            Some(overlay_rect()),
            click((50, 50), (150, 150))
        ));
    }

    #[test]
    fn gate_full_cycle() {
        let gate = PopupGate::new();
        assert!(gate.is_idle());
        assert!(gate.try_reserve());
        assert!(!gate.is_idle());
        let open = gate.begin_open();
        assert!(open.is_some());
        drop(open);
        assert!(gate.is_idle());
    }

    #[test]
    fn gate_second_request_while_pending_is_dropped() {
        let gate = PopupGate::new();
        assert!(gate.try_reserve()); // 첫 요청: post됨(실행 전)
        assert!(!gate.is_idle());
        assert!(!gate.try_reserve()); // 두 번째 요청: 버림(CORE-301)
        let open = gate.begin_open();
        assert!(open.is_some());
        drop(open);
        assert!(gate.is_idle());
    }

    #[test]
    fn gate_cancel_after_post_failure_returns_idle() {
        let gate = PopupGate::new();
        assert!(gate.try_reserve());
        gate.cancel();
        assert!(gate.is_idle());
        assert!(gate.try_reserve()); // 다음 클릭이 다시 예약 가능 — Pending 고착 없음
    }

    /// `popup_now`의 조기 반환 모양(끝이 `true`라 clippy `needless_return` 없음).
    fn simulated_popup(gate: &PopupGate, bail: bool) -> bool {
        let Some(_open) = gate.begin_open() else {
            return false;
        };
        if bail {
            return false;
        }
        true
    }

    #[test]
    fn gate_early_return_restores_idle() {
        let gate = PopupGate::new();
        assert!(gate.try_reserve());
        assert!(!simulated_popup(&gate, true));
        assert!(gate.is_idle());

        assert!(gate.try_reserve());
        assert!(simulated_popup(&gate, false));
        assert!(gate.is_idle());
    }

    #[test]
    fn gate_open_rejects_new_requests() {
        let gate = PopupGate::new();
        assert!(gate.try_reserve());
        let open = gate.begin_open();
        assert!(open.is_some());
        assert!(!gate.is_idle());
        assert!(!gate.try_reserve());
        assert!(gate.begin_open().is_none());
        assert!(!gate.is_idle()); // 실패한 begin_open 뒤에도 여전히 열림
        drop(open);
        assert!(gate.is_idle());
    }

    #[test]
    fn gate_begin_open_without_reservation_is_none() {
        let gate = PopupGate::new();
        assert!(gate.begin_open().is_none());
        assert!(gate.is_idle()); // 상태 불변(PU-c)
    }

    #[test]
    fn busy_skips_window_and_foreground() {
        let rect_calls = Cell::new(0u32);
        let fg_calls = Cell::new(0u32);
        let wanted = should_request(
            false,
            click((150, 150), (400, 300)),
            || {
                rect_calls.set(rect_calls.get() + 1);
                Some(overlay_rect())
            },
            || {
                fg_calls.set(fg_calls.get() + 1);
                None
            },
        );
        assert!(!wanted);
        assert_eq!(rect_calls.get(), 0);
        assert_eq!(fg_calls.get(), 0);
    }

    #[test]
    fn outside_click_skips_foreground_query() {
        let rect_calls = Cell::new(0u32);
        let fg_calls = Cell::new(0u32);
        let wanted = should_request(
            true,
            click((150, 150), (900, 300)),
            || {
                rect_calls.set(rect_calls.get() + 1);
                Some(overlay_rect())
            },
            || {
                fg_calls.set(fg_calls.get() + 1);
                None
            },
        );
        assert!(!wanted);
        assert_eq!(rect_calls.get(), 1);
        assert_eq!(fg_calls.get(), 0);
    }

    #[test]
    fn hidden_overlay_skips_foreground_query() {
        let fg_calls = Cell::new(0u32);
        let wanted = should_request(
            true,
            click((150, 150), (400, 300)),
            || None,
            || {
                fg_calls.set(fg_calls.get() + 1);
                None
            },
        );
        assert!(!wanted);
        assert_eq!(fg_calls.get(), 0);
    }

    #[test]
    fn inside_click_fullscreen_is_dropped() {
        let fg_calls = Cell::new(0u32);
        let m = monitor();
        let wanted = should_request(
            true,
            click((150, 150), (400, 300)),
            || Some(overlay_rect()),
            || {
                fg_calls.set(fg_calls.get() + 1);
                Some(ForegroundSnapshot {
                    own_process: false,
                    shell: false,
                    client: m,
                    monitor: m,
                })
            },
        );
        assert!(!wanted);
        assert_eq!(fg_calls.get(), 1);
    }

    #[test]
    fn inside_click_not_fullscreen_is_requested() {
        let rect_calls = Cell::new(0u32);
        let fg_calls = Cell::new(0u32);
        let wanted = should_request(
            true,
            click((150, 150), (400, 300)),
            || {
                rect_calls.set(rect_calls.get() + 1);
                Some(overlay_rect())
            },
            || {
                fg_calls.set(fg_calls.get() + 1);
                None
            },
        );
        assert!(wanted);
        assert_eq!(rect_calls.get(), 1);
        assert_eq!(fg_calls.get(), 1);
    }

    fn snapshot(
        own_process: bool,
        shell: bool,
        client: ScreenRect,
        monitor: ScreenRect,
    ) -> ForegroundSnapshot {
        ForegroundSnapshot {
            own_process,
            shell,
            client,
            monitor,
        }
    }

    #[test]
    fn fullscreen_none_is_not_suppressed() {
        assert!(!suppress_for_fullscreen(None));
    }

    #[test]
    fn fullscreen_other_app_covering_monitor() {
        let m = monitor();
        assert!(suppress_for_fullscreen(Some(snapshot(false, false, m, m))));
    }

    #[test]
    fn fullscreen_own_process_is_not_suppressed() {
        let m = monitor();
        assert!(!suppress_for_fullscreen(Some(snapshot(true, false, m, m))));
    }

    #[test]
    fn fullscreen_shell_is_not_suppressed() {
        let m = monitor();
        assert!(!suppress_for_fullscreen(Some(snapshot(false, true, m, m))));
    }

    #[test]
    fn windowed_app_is_not_suppressed() {
        let client = ScreenRect {
            left: 320,
            top: 180,
            right: 1600,
            bottom: 900,
        };
        assert!(!suppress_for_fullscreen(Some(snapshot(
            false,
            false,
            client,
            monitor()
        ))));
    }

    #[test]
    fn maximized_with_title_bar_is_not_suppressed() {
        let client = ScreenRect {
            left: 0,
            top: 23,
            right: 1920,
            bottom: 1080,
        };
        assert!(!suppress_for_fullscreen(Some(snapshot(
            false,
            false,
            client,
            monitor()
        ))));
    }

    #[test]
    fn fullscreen_on_secondary_monitor() {
        let m = ScreenRect {
            left: -1920,
            top: 0,
            right: 0,
            bottom: 1080,
        };
        assert!(suppress_for_fullscreen(Some(snapshot(false, false, m, m))));
    }
}
