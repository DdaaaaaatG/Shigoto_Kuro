//! kuro_keyviewer Rust 계층 진입점.
//!
//! [목적] Tauri 앱 조립 — 플러그인·상태·트레이·전역 훅 스레드·command 등록.
//! [계층] core 모듈(hook/window/tray/assets/settings/timer/data_reset) ← bridge(commands/events) ← ui(React).
//!        core 는 ui 를 모른다. 밖으로 나가는 것은 bridge::events 의 emit 뿐이다.
//! [스레드] 훅 스레드(hook::start) → mpsc 채널 → 전달 스레드(여기서 spawn) → Tauri emit.
//!        시작 시 단발 스레드 `autostart-sync`(spawn_autostart_sync, SV2-05)가 자동 실행
//!        등록 상태를 조회해 설정을 보정한다. CR-048 TM-06 — 마감 시각 스레드
//!        `timer-deadline`(`timer::driver::spawn`)이 카운트다운 0 도달·끝남 만료를 감지해
//!        `publish_timer_change`(깔때기)를 부른다. 주기 emit 없음.
//! [진단 로그] CR-046 원인 확정용(사용자 승인 2026-09-26). 전달 스레드가 콜백 밖에서
//!        `target: "kuro_diag"`로 개수·방향만 남긴다(`log_input_diag`) — 어떤 키인지·vk 코드는
//!        절대 남기지 않는다(확정사항 §5). `RUST_LOG=kuro_diag=debug`일 때만 보인다.
//! [단일 인스턴스] R-A8·CORE-002(data_reset.md §3.10). `tauri_plugin_single_instance`를 Builder의
//!        첫 플러그인으로 등록한다. 두 번째 실행은 이 플러그인 setup에서 끝나 `run_startup`·훅·
//!        트레이에 닿지 않는다. 기존 인스턴스는 `on_second_instance`가 설정 창을 보여 준다.
//! [unsafe] 이 파일에는 없다. unsafe 는 hook/ 안에서만 허용된다(확정사항 §2).
//! [에러] setup 실패는 로그 후 프로세스 종료. command 에러는 error::BridgeError 로 직렬화.

pub mod assets;
pub mod bridge;
pub mod data_reset;
pub mod error;
pub mod hook;
pub mod settings;
pub mod timer;
pub mod tray;
pub mod window;

use std::sync::{mpsc, Mutex};

use tauri::Manager;

use crate::settings::Settings;

/// 앱 데이터 경로 묶음 (`%APPDATA%/com.kuro.keyviewer/...`).
#[derive(Debug, Clone)]
pub struct AppPaths {
    pub data_dir: std::path::PathBuf,
    pub assets_dir: std::path::PathBuf,
    pub settings_file: std::path::PathBuf,
}

impl AppPaths {
    pub fn new(app: &tauri::AppHandle) -> Result<Self, tauri::Error> {
        let data_dir = app.path().app_data_dir()?;
        Ok(Self {
            assets_dir: data_dir.join("assets"),
            settings_file: data_dir.join("settings.json"),
            data_dir,
        })
    }
}

/// Tauri 관리 상태. command 는 `State<'_, AppState>` 로 받는다.
pub struct AppState {
    pub settings: Mutex<Settings>,
    /// 레이어 이동 모드 손 기준점 캐시(OV-R-14, 계약 v0.3). 없음/계산 실패는 `None`.
    pub hand_anchor: Mutex<Option<settings::Point>>,
    /// 뽀모도 타이머(CR-045, PT-03·05·06·09 + CR-048 TM-01·05·06·12) — 휘발. 잠금은 짧게,
    /// emit은 잠금 밖. `settings`와 동시에 잠그지 않는다.
    pub timer: Mutex<timer::Timer>,
    /// 마감 스레드 깨우기(CR-048 TM-06). `publish_timer_change`가 부른다.
    pub timer_waker: timer::driver::TimerWaker,
    pub paths: AppPaths,
}

/// 훅 핸들 보관 — 앱 종료 시 Drop 되며 훅을 해제한다.
pub struct HookGuard(pub Mutex<Option<hook::HookHandle>>);

pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    let result = tauri::Builder::default()
        // R-A8: 반드시 첫 번째 플러그인. 플러그인 setup은 등록 순서대로, 앱 .setup보다 먼저 돈다.
        .plugin(tauri_plugin_single_instance::init(on_second_instance))
        .plugin(tauri_plugin_dialog::init())
        .on_window_event(|window, event| {
            // 설정 창을 X로 닫으면 파괴하지 않고 숨기기만 한다(CR-041). 그래야 트레이
            // "설정 열기"가 이후에도 같은 창을 다시 보여줄 수 있다. 오버레이 창은 건드리지
            // 않는다 — 오버레이는 트레이 "표시/숨김"으로만 감춘다(window::set_overlay_visible).
            // 진단 로그(2026-09-26, CR-041 재조사): 실측에서 hide()가 조용히 무효화되는
            // 사례가 보고되어, 진입·수신·hide 결과·hide 직후 실제 가시성까지 단계별로 남긴다.
            log::debug!(
                "on_window_event 진입: label={} kind={}",
                window.label(),
                window_event_kind(event)
            );
            if window.label() == window::SETTINGS_LABEL {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    log::debug!("설정 창 CloseRequested 수신 — hide로 전환");
                    api.prevent_close();
                    schedule_deferred_settings_hide(window);
                }
            }
        })
        .setup(|app| {
            let handle = app.handle().clone();

            // 1. 경로·설정(+데이터 세대 검사)·매니페스트·손 기준점 초기 캐시
            let paths = AppPaths::new(&handle)?;
            std::fs::create_dir_all(&paths.assets_dir)?;
            let settings = startup_settings(&paths); // load_or_default → data_reset::run_startup(R-A2)
            seed_default_assets(&paths.assets_dir); // CR-035 DA-02 — data-reset 뒤에 돈다(초기화 직후엔 Skipped)
            let manifest = assets::load_manifest(&paths.assets_dir).unwrap_or_else(|e| {
                log::warn!("매니페스트를 읽지 못해 캔버스 없음으로 처리합니다: {e}");
                assets::AssetManifest::default()
            });
            let initial_hand_anchor = match &settings.mouse {
                Some(m) => assets::compute_hand_anchor(
                    &paths.assets_dir,
                    &manifest,
                    m.shoulder,
                    m.part_pos,
                )
                .unwrap_or_else(|e| {
                    log::warn!("손 기준점 초기 계산 실패: {e}");
                    None
                }),
                None => None,
            };
            // 1-a. 마감 시각 스레드(CR-048 TM-06) — AppState보다 먼저 띄운다. 콜백은 부를
            // 때마다 app.try_state::<AppState>()로 찾는다(없으면 next_wake = None → 무기한 대기).
            let (nw_handle, od_handle) = (handle.clone(), handle.clone());
            let timer_waker = timer::driver::spawn(
                move || timer_next_wake(&nw_handle),
                move || timer_on_due(&od_handle),
            )?;

            app.manage(AppState {
                settings: Mutex::new(settings.clone()),
                hand_anchor: Mutex::new(initial_hand_anchor),
                timer: Mutex::new(timer::Timer::with_config(
                    timer::TimerConfig::from_settings(&settings.timer),
                )),
                timer_waker,
                paths,
            });

            // 2. 오버레이·설정 창 생성. tauri.conf.json 은 두 창 모두 "create": false 로
            // 두어 Tauri 프레임워크가 setup(위 AppState 등록) 이전에 만들지 않게 한다(§0.
            // release 빌드에서 창이 AppState 등록보다 먼저 떠 첫 IPC가 "state not managed"로
            // 실패하던 결함의 수정 — window.md §2.0 참고). 실패해도 앱은 계속 뜬다.
            create_configured_windows(app);

            // 3. 트레이 — init 뒤 sync_timer_menu 1회(켜짐으로 저장돼 있으면 메뉴가 보인다).
            tray::init(&handle)?;
            tray::sync_timer_menu(&handle);

            // 4. 전역 입력 훅 → 이벤트 전달 스레드
            let (tx, rx) = mpsc::channel::<hook::InputEvent>();
            let hook_handle = hook::start(tx)?;
            app.manage(HookGuard(Mutex::new(Some(hook_handle))));

            let emitter = handle.clone();
            std::thread::Builder::new()
                .name("input-forwarder".into())
                .spawn(move || {
                    for ev in rx {
                        log_input_diag(&ev);
                        if let Err(e) = bridge::events::emit_input(&emitter, &ev) {
                            log::warn!("입력 이벤트 emit 실패: {e}");
                        }
                    }
                })?;

            // 5. 오버레이 창 리사이즈·위치 복원·표시(속성 전체)·이동 감시 (계약 §5.1·§5.2, SV2-03·04)
            setup_overlay(&handle, &settings, &manifest);

            // 6. 자동 실행 실제 상태로 보정(SV2-05, tray.md §4)
            spawn_autostart_sync(handle.clone());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            bridge::commands::get_settings,
            bridge::commands::set_settings,
            bridge::commands::get_asset_manifest,
            bridge::commands::import_asset,
            bridge::commands::remove_asset,
            bridge::commands::get_hand_anchor,
            bridge::commands::get_screen_bounds,
            bridge::commands::get_monitors,
            bridge::commands::get_overlay_position,
            bridge::commands::set_overlay_position,
            bridge::commands::set_overlay_visible,
            bridge::commands::set_autostart,
            bridge::commands::open_settings_window,
            bridge::commands::reset_overlay_position,
            bridge::commands::restore_default_asset,
            bridge::commands::export_default_assets,
            bridge::commands::get_timer,
            bridge::commands::control_timer,
            bridge::commands::set_resting,
            bridge::commands::get_alarm_sound,
            bridge::commands::import_alarm_sound,
            bridge::commands::remove_alarm_sound,
            bridge::commands::reset_app_data,
        ])
        .run(tauri::generate_context!());

    if let Err(e) = result {
        log::error!("tauri 실행 실패: {e}");
        std::process::exit(1);
    }
}

/// 두 번째 실행 알림(R-A8, CORE-002). 기존 인스턴스의 메인 스레드에서 불린다. 설정 창을
/// 보이거나(숨김 포함) 없으면 재생성한다 — CR-041 경로(window::show_settings_window) 재사용.
/// 실패는 경고만. argv·cwd에는 exe 경로·사용자 이름이 들어가므로 로그에 남기지 않는다.
fn on_second_instance(app: &tauri::AppHandle, _argv: Vec<String>, _cwd: String) {
    if let Err(e) = window::show_settings_window(app) {
        log::warn!("두 번째 실행 감지 — 설정 창 표시 실패: {e}");
    }
}

/// `on_window_event` 진단 로그용 이벤트 종류 이름(CR-041 재조사, 2026-09-26). 페이로드는
/// 찍지 않는다 — 좌표·크기 등은 진단에 불필요하고 `WindowEvent`는 `non_exhaustive`라 전체
/// `Debug` 매칭 대신 필요한 종류만 이름 붙인다.
fn window_event_kind(event: &tauri::WindowEvent) -> &'static str {
    match event {
        tauri::WindowEvent::Resized(_) => "Resized",
        tauri::WindowEvent::Moved(_) => "Moved",
        tauri::WindowEvent::CloseRequested { .. } => "CloseRequested",
        tauri::WindowEvent::Destroyed => "Destroyed",
        tauri::WindowEvent::Focused(_) => "Focused",
        tauri::WindowEvent::ScaleFactorChanged { .. } => "ScaleFactorChanged",
        tauri::WindowEvent::DragDrop(_) => "DragDrop",
        tauri::WindowEvent::ThemeChanged(_) => "ThemeChanged",
        _ => "기타",
    }
}

/// CR-046 원인 확정용 진단 로그(전달 스레드, 콜백 밖 — 사용자 승인 2026-09-26). 개수·방향만
/// 남기고 어떤 키인지·vk 코드·특수 키 종류는 절대 찍지 않는다(확정사항 §5). 기본 로그 레벨(info)
/// 에서는 보이지 않고 `RUST_LOG=kuro_diag=debug`일 때만 나온다.
fn log_input_diag(ev: &hook::InputEvent) {
    match ev {
        hook::InputEvent::Keyboard {
            pressed,
            held,
            repeat,
            ..
        } => {
            log::debug!(target: "kuro_diag", "kbd pressed={pressed} held={held} repeat={repeat}");
        }
        hook::InputEvent::MouseButton {
            button, pressed, ..
        } => {
            let name = match button {
                hook::MouseButton::Left => "left",
                hook::MouseButton::Right => "right",
            };
            log::debug!(target: "kuro_diag", "mouse button={name} pressed={pressed}");
        }
        hook::InputEvent::MouseMove { .. } => {}
    }
}

/// 설정 창 `hide()`를 `CloseRequested` 콜백 스택 밖에서 실행되도록 미룬다(CR-041
/// 재수정, 2026-09-26). 이 콜백은 이미 메인 스레드에서 실행 중이라 그 안에서 직접
/// `window.hide()`나 `app_handle().run_on_main_thread(..)`를 불러도
/// `send_user_message`가 스레드 일치를 확인하고 그 자리에서 곧장(동기) 실행한다
/// (tauri-runtime-wry 2.11.4 `src/lib.rs:235-254`). 그런데 실측(2026-09-26,
/// release exe, `RUST_LOG=debug`, `WM_CLOSE` 전송)에서 그렇게 부른 `hide()`는
/// `Ok(())`를 반환하고도 `is_visible()`이 곧장·2초 뒤 모두 `true`로 남았다 — `WM_CLOSE`
/// 처리 스택 한가운데의 동기 `hide()`가 실제로는 먹지 않는다는 뜻이다. 별도 OS
/// 스레드에서 부르면 스레드가 달라 `proxy.send_event`로 큐에 들어가(같은 파일
/// `Message::Task` 처리, 3335줄) tao 이벤트 루프가 `CloseRequested` 콜백 스택을
/// 완전히 벗어난 다음 턴에 처리한다 — 이번에는 확실히 콜백 밖에서 실행된다.
fn schedule_deferred_settings_hide<R: tauri::Runtime>(window: &tauri::Window<R>) {
    let w = window.clone();
    let spawned = std::thread::Builder::new()
        .name("settings-hide-defer".into())
        .spawn(move || match w.hide() {
            Ok(()) => {
                log::debug!(
                    "설정 창 hide() 성공(지연 실행), 직후 is_visible()={:?}",
                    w.is_visible()
                );
            }
            Err(e) => log::warn!("설정 창 숨기기 실패: {e}"),
        });
    if let Err(e) = spawned {
        log::warn!("설정 창 지연 hide 스레드 시작 실패: {e}");
    }
}

/// `tauri.conf.json`의 `app.windows` 항목(overlay·settings)을 `AppState` 등록 뒤 직접
/// 만든다. 두 창은 설정에서 `"create": false`로 두어 Tauri 프레임워크의 기본 `setup()`이
/// 이 클로저보다 먼저 만들지 않게 했다 — 그대로 두면 release 빌드에서 창이 `AppState`
/// 관리(:86)보다 먼저 떠 첫 IPC(`get_settings`·`get_asset_manifest`)가 "state not managed"로
/// 실패한다(window.md §2.0). 라벨·속성은 설정 파일 그대로, 실패는 로그 후 계속 진행한다.
fn create_configured_windows<R: tauri::Runtime>(app: &tauri::App<R>) {
    for window_config in app.config().app.windows.iter() {
        let label = window_config.label.clone();
        let build =
            tauri::WebviewWindowBuilder::from_config(app, window_config).and_then(|b| b.build());
        if let Err(e) = build {
            log::warn!("창 생성 실패({label}): {e}");
        }
    }
}

/// 설정 로드 + 데이터 세대 검사(R-A2). 세대가 다르거나 없으면 전체 초기화한 뒤의 값을 돌려준다.
/// 반드시 seed_default_assets·load_manifest보다 먼저 부른다.
fn startup_settings(paths: &AppPaths) -> Settings {
    let state = Mutex::new(settings::load_or_default(&paths.settings_file));
    data_reset::run_startup(paths, &state);
    state
        .into_inner()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
}

/// 첫 실행 기본 이미지 시딩(CR-035 DA-02). 실패해도 앱은 계속 뜬다 — 결과·소요 시간만 로그(경로 없음).
fn seed_default_assets(assets_dir: &std::path::Path) {
    let started = std::time::Instant::now();
    let outcome = assets::defaults::seed_if_empty(assets_dir);
    let ms = started.elapsed().as_millis();
    match &outcome {
        assets::defaults::SeedOutcome::Seeded { failed, .. } if !failed.is_empty() => {
            log::warn!("기본 이미지 시딩 일부 실패: {outcome:?} ({ms} ms)")
        }
        _ => log::info!("기본 이미지 시딩: {outcome:?} ({ms} ms)"),
    }
}

/// 오버레이 창 리사이즈·위치 복원(화면 밖 보정 포함)·표시(속성 전체 재적용)·이동 감시
/// (OV-R-03·13, SV2-03·04). `run()`의 setup 클로저가 50줄을 넘어 분리했다(golden-principles §1).
/// 각 단계 실패는 경고 로그 후 계속 진행한다 — 오버레이가 반투명한 채 시작하는 것보다 낫다.
fn setup_overlay(handle: &tauri::AppHandle, settings: &Settings, manifest: &assets::AssetManifest) {
    let canvas = manifest.canvas.map(|c| (c.width, c.height));
    if let Err(e) = window::resize_overlay(handle, canvas, settings.scale) {
        log::warn!("오버레이 초기 크기 적용 실패: {e}");
    }
    match window::restore_overlay_position(handle, &settings.overlay) {
        Ok(restored) => {
            if restored.x != settings.overlay.x || restored.y != settings.overlay.y {
                let state = handle.state::<AppState>();
                if let Err(e) = window::persist_overlay_position(
                    &state.settings,
                    &state.paths.settings_file,
                    restored,
                ) {
                    log::warn!("화면 밖 보정 위치 저장 실패: {e}");
                }
            }
        }
        Err(e) => log::warn!("오버레이 위치 복원 실패: {e}"),
    }
    // set_overlay_visible → apply_overlay_window: 표시뿐 아니라 작업표시줄·위치 잠금까지
    // 시작 시점의 설정대로 맞춘다(SV2-03·04, window.md §2.4).
    if let Err(e) = window::apply_overlay_window(handle, settings) {
        log::warn!("오버레이 초기 창 속성 적용 실패: {e}");
    }
    let move_saver_handle = handle.clone();
    if let Err(e) = window::watch_overlay_moves(handle, move |pos| {
        let state = move_saver_handle.state::<AppState>();
        match window::persist_overlay_position(&state.settings, &state.paths.settings_file, pos) {
            Ok(Some(saved)) => {
                if let Err(e) = bridge::events::emit_settings_changed(&move_saver_handle, &saved) {
                    log::warn!("설정 변경 이벤트 emit 실패: {e}");
                }
            }
            Ok(None) => {}
            Err(e) => log::warn!("오버레이 위치 저장 실패: {e}"),
        }
    }) {
        log::warn!("오버레이 이동 감시 시작 실패: {e}");
    }
}

/// 마감 스레드 `next_wake` 콜백(CR-048 TM-06) — 타이머 잠금 한 줄로 다음 마감을 읽는다.
/// `AppState`가 아직 없거나 잠금이 오염됐으면 `None`(무기한 대기, 바쁜 반복 없음).
fn timer_next_wake(handle: &tauri::AppHandle) -> Option<std::time::Instant> {
    let state = handle.try_state::<AppState>()?;
    let timer = state.timer.lock().ok()?;
    timer.next_wake()
}

/// 마감 스레드 `on_due` 콜백(CR-048 TM-06) — `tick` 후 스냅샷을 뜨고 잠금을 곧바로 푼 다음,
/// 바뀌었을 때만 잠금 밖에서 `publish_timer_change`를 부른다.
fn timer_on_due(handle: &tauri::AppHandle) {
    let Some(state) = handle.try_state::<AppState>() else {
        return;
    };
    let now = std::time::Instant::now();
    let snapshot = match state.timer.lock() {
        Ok(mut timer) => timer.tick(now).then(|| timer.snapshot(now)),
        Err(e) => {
            log::warn!("타이머 잠금 실패(마감 스레드): {e}");
            None
        }
    };
    if let Some(snapshot) = snapshot {
        publish_timer_change(handle, &snapshot);
    }
}

/// 모든 타이머 변경이 지나가는 깔때기(CR-048 TM-06, 02-design §2) — 바뀌었을 때만, 잠금 밖에서
/// 부른다. ① `timer://changed` emit ② 트레이 메뉴 동기화 ③ 마감 스레드 깨우기(다음 마감 재계산).
/// 실패는 경고 로그만 — 이 함수 자체는 실패하지 않는다.
pub(crate) fn publish_timer_change(app: &tauri::AppHandle, snap: &timer::TimerSnapshot) {
    if let Err(e) = bridge::events::emit_timer_changed(app, snap) {
        log::warn!("타이머 변경 emit 실패: {e}");
    }
    tray::sync_timer_menu(app);
    if let Some(state) = app.try_state::<AppState>() {
        state.timer_waker.wake();
    }
}

/// 자동 실행 실제 등록 상태로 설정을 보정한다(SV2-05, CR-047, tray.md §3.5). 앱 시작 시 1회,
/// 별도 스레드 `autostart-sync`에서 조회한다(`reconcile()`도 자식 프로세스 종료를 기다리므로
/// 메인 스레드를 막지 않기 위해 스레드를 쓴다. 옛 관리자 권한 작업이 있으면 여기서 일반
/// 권한으로 다시 등록한다). 판정 불가(`None`)면 아무것도 하지 않는다.
fn spawn_autostart_sync(handle: tauri::AppHandle) {
    let spawned = std::thread::Builder::new()
        .name("autostart-sync".into())
        .spawn(move || {
            let Some(actual) = tray::autostart::reconcile() else {
                return;
            };
            let state = handle.state::<AppState>();
            match tray::autostart::persist_autostart(
                &state.settings,
                &state.paths.settings_file,
                actual,
            ) {
                Ok(Some(saved)) => {
                    if let Err(e) = bridge::events::emit_settings_changed(&handle, &saved) {
                        log::warn!("설정 변경 이벤트 emit 실패: {e}");
                    }
                }
                Ok(None) => {}
                Err(e) => log::warn!("자동 실행 상태 보정 실패: {e}"),
            }
        });
    if let Err(e) = spawned {
        log::warn!("자동 실행 보정 스레드 시작 실패: {e}");
    }
}
