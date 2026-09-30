//! bridge command 핸들러 (invoke 23개, v0.3 get_hand_anchor·v0.9 get_monitors·v0.14
//! reset_overlay_position·v0.16 restore_default_asset·export_default_assets·v0.21
//! get_timer·control_timer·set_resting·v0.23 get_alarm_sound·import_alarm_sound·
//! remove_alarm_sound·v0.25 reset_app_data 포함).
//!
//! [규칙] 핸들러는 얇다 — 인자 검증·상태 잠금·core 모듈 호출·이벤트 emit 만 한다. 로직은 core 모듈에.
//! [인자] Rust snake_case 인자는 JS 에서 camelCase 로 넘어온다 (`set_overlay_position(x, y)` → `{x, y}`).
//! [에러] 모두 `BridgeError {code, message}` 로 직렬화된다.
//! [unsafe] 없음.

use std::path::{Path, PathBuf};
use std::time::Instant;

use tauri::{AppHandle, State};

use crate::assets::export::ExportReport;
use crate::assets::sound::AlarmSound;
use crate::assets::{self, AssetManifest, AssetSlot, SimpleSlot};
use crate::bridge::events;
use crate::data_reset;
use crate::error::BridgeError;
use crate::settings::{self, Settings, TimerSettings};
use crate::timer::{Timer, TimerAction, TimerConfig, TimerSnapshot};
use crate::tray::{self, autostart};
use crate::window::{self, Point, ScreenBounds};
use crate::AppState;

pub mod presets;

fn lock_settings<'a>(
    state: &'a State<'_, AppState>,
) -> Result<std::sync::MutexGuard<'a, Settings>, BridgeError> {
    state.settings.lock().map_err(|_| {
        BridgeError::new(
            "state.poisoned",
            "설정 상태가 손상되었습니다. 앱을 다시 시작하세요.",
        )
    })
}

fn lock_hand_anchor<'a>(
    state: &'a State<'_, AppState>,
) -> Result<std::sync::MutexGuard<'a, Option<settings::Point>>, BridgeError> {
    state.hand_anchor.lock().map_err(|_| {
        BridgeError::new(
            "state.poisoned",
            "설정 상태가 손상되었습니다. 앱을 다시 시작하세요.",
        )
    })
}

/// (v0.21, CR-045) `AppState.timer` 잠금. 설정 잠금과 동시에 쥐지 않는다(계약 §5.8-6).
fn lock_timer<'a>(
    state: &'a State<'_, AppState>,
) -> Result<std::sync::MutexGuard<'a, Timer>, BridgeError> {
    state.timer.lock().map_err(|_| {
        BridgeError::new(
            "state.poisoned",
            "설정 상태가 손상되었습니다. 앱을 다시 시작하세요.",
        )
    })
}

/// 매니페스트를 읽되 실패하면 경고 로그만 남기고 빈 매니페스트(캔버스 없음)로 대체한다.
/// `set_settings`·앱 시작처럼 이미 성공이 확정된 흐름에서 부수 효과(리사이즈·기준점) 계산에만 쓴다
/// (계약 §5.2-5 "실패해도 명령은 성공한다").
fn load_manifest_or_warn(assets_dir: &std::path::Path) -> AssetManifest {
    assets::load_manifest(assets_dir).unwrap_or_else(|e| {
        log::warn!("매니페스트를 읽지 못해 캔버스 없음으로 처리합니다: {e}");
        AssetManifest::default()
    })
}

/// 손 기준점을 재계산하고, 캐시와 다르면 `assets://hand-anchor-changed`를 emit한다(계약 §5.1).
/// 계산은 잠금 없이 하고, 비교·갱신만 짧게 잠근다(§5.1-4·6).
fn refresh_hand_anchor(
    app: &AppHandle,
    state: &State<'_, AppState>,
    manifest: &AssetManifest,
    mouse: Option<&settings::MouseSettings>,
) -> Result<(), BridgeError> {
    let new_value = match mouse {
        None => None,
        Some(m) => {
            assets::compute_hand_anchor(&state.paths.assets_dir, manifest, m.shoulder, m.part_pos)
                .unwrap_or_else(|e| {
                    log::warn!("손 기준점 재계산 실패: {e}");
                    None
                })
        }
    };
    let changed = {
        let mut cache = lock_hand_anchor(state)?;
        let changed = *cache != new_value;
        *cache = new_value;
        changed
    };
    if changed {
        if let Err(e) = events::emit_hand_anchor_changed(app, new_value) {
            log::warn!("손 기준점 변경 emit 실패: {e}");
        }
    }
    Ok(())
}

/// 슬롯이 캔버스 레이어면 새 캔버스로 오버레이 창을 리사이즈한다(계약 §5.2). 실패는 경고 로그만.
fn resize_for_canvas_slot(
    app: &AppHandle,
    state: &State<'_, AppState>,
    slot: AssetSlot,
    manifest: &AssetManifest,
) -> Result<(), BridgeError> {
    if !slot.is_canvas_layer() {
        return Ok(());
    }
    let scale = lock_settings(state)?.scale;
    let canvas = manifest.canvas.map(|c| (c.width, c.height));
    if let Err(e) = window::resize_overlay(app, canvas, scale) {
        log::warn!("오버레이 리사이즈 실패: {e}");
    }
    Ok(())
}

/// 슬롯이 `mouse_base`면 손 기준점을 재계산한다(계약 §5.1-2 ②③).
fn refresh_hand_anchor_if_mouse_base(
    app: &AppHandle,
    state: &State<'_, AppState>,
    slot: AssetSlot,
    manifest: &AssetManifest,
) -> Result<(), BridgeError> {
    if slot != AssetSlot::Simple(SimpleSlot::MouseBase) {
        return Ok(());
    }
    let mouse = lock_settings(state)?.mouse.clone();
    refresh_hand_anchor(app, state, manifest, mouse.as_ref())
}

/// 에셋 변경 성공 후 공통 후처리 — (캔버스 레이어면) 리사이즈 → `assets://changed` emit →
/// (`mouse_base`면) 손 기준점 재계산. `import_asset`·`remove_asset`·(v0.16) `restore_default_asset`
/// 셋이 공유한다(계약 §5.7 「Rust 핸들러」).
fn after_asset_change(
    app: &AppHandle,
    state: &State<'_, AppState>,
    slot: AssetSlot,
    manifest: &AssetManifest,
) -> Result<(), BridgeError> {
    resize_for_canvas_slot(app, state, slot, manifest)?;
    events::emit_assets_changed(app, manifest)?;
    refresh_hand_anchor_if_mouse_base(app, state, slot, manifest)?;
    Ok(())
}

// ─── 설정 ──────────────────────────────────────────────────────────────────

/// [계약] contract.md get_settings [요구] R-미정 [에러] state.poisoned
#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<Settings, BridgeError> {
    Ok(lock_settings(&state)?.clone())
}

/// [계약] contract.md §5·§5.3 set_settings [요구] OV-R-03, OV-R-13, OV-R-14, SV2-02~05
/// 처리 순서(§5.3, CR-047 갱신): 검증 → `settings::update` 한 번(잠금 안에서 core 소유 필드 병합
/// → 검증 → 원자 저장 → 메모리 대입) → settings://changed emit → 창 속성(표시/숨김·위치 잠금·
/// 작업표시줄) 적용 → (scale 변경 시) 리사이즈 → (어깨 변경·mouse 켜짐/꺼짐 시) 손 기준점 재계산
/// → assets://hand-anchor-changed(값이 바뀐 경우만) → (v0.23, CR-048) 타이머 끔·모드·시작 시간
/// 부수 효과(§5.3 6단계) — 바뀌면 core 깔때기 `publish_timer_change`(emit·트레이·마감 스레드 깨움),
/// 아니면 `tray::sync_timer_menu`만. **(CR-047) 저장 뒤 재병합 단계는 없다** — 병합·검증·저장·
/// 메모리 대입이 이미 한 잠금 안에서 끝난다(settings.md §3.9.10 B2). settings://changed를 창
/// 적용보다 먼저 보내 — 창 적용이 실패해도 ui가 저장된 값을 안다(같은 절 권고).
/// (v0.14) 자동 실행은 이 명령으로 바뀌지 않는다 — set_autostart(§5.5)만 바꾼다.
/// [에러] settings.invalid, settings.io, window.not_found, tauri.error, state.poisoned
/// [부수효과] settings://changed emit, (조건부) 오버레이 리사이즈, (조건부) assets://hand-anchor-changed emit,
/// (조건부) timer://changed emit·트레이 메뉴 동기화
#[tauri::command]
pub fn set_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: Settings,
) -> Result<Settings, BridgeError> {
    settings.validate()?;

    // `update` 클로저 안에서 core 소유 필드(overlay.x/y·autostart) 병합 + 이후 비교에 쓸 이전 값
    // 복사(§3.9.2 — 잠금 안에서 IO·emit·다른 잠금 금지, 필드 대입·순수 병합·이전 값 복사만 한다).
    let mut old_scale = 0.0;
    let mut old_mouse_anchor_key = None;
    // (v0.23, CR-048) old_timer는 6단계(타이머 끔·모드·시작 시간 부수 효과) 판정용 — 전체를
    // 복사해 둔다(v0.21의 enabled만 복사를 넓힘, §5.3 6단계).
    let mut old_timer = TimerSettings::default();
    let out = settings::update(&state.settings, &state.paths.settings_file, |current| {
        old_scale = current.scale;
        old_mouse_anchor_key = current.mouse.as_ref().map(|m| (m.shoulder, m.part_pos));
        old_timer = current.timer.clone();
        *current = window::keep_core_owned(settings, current);
    })?;
    let fin = out.settings;
    let scale_changed = old_scale != fin.scale;
    // (v0.8) 어깨뿐 아니라 partPos 변경도 재계산 트리거(§5.1-2 ④).
    let shoulder_changed =
        old_mouse_anchor_key != fin.mouse.as_ref().map(|m| (m.shoulder, m.part_pos));

    // settings://changed 먼저(§3.9.10 권고) — 이후 단계 실패는 경고 로그만 남기고 명령은 성공한다.
    events::emit_settings_changed(&app, &fin)?;

    // 창 속성 적용(표시/숨김·위치 잠금·작업표시줄, SV2-03·04). (v0.14) 자동 실행 반영은 여기서
    // 하지 않는다(set_autostart 전용, D-4).
    window::apply_overlay_window(&app, &fin)?;

    // scale·shoulder 변경 판정에 필요한 매니페스트는 한 번만 읽는다(§5.2-4).
    let manifest = if scale_changed || shoulder_changed {
        Some(load_manifest_or_warn(&state.paths.assets_dir))
    } else {
        None
    };
    if scale_changed {
        let canvas = manifest
            .as_ref()
            .and_then(|m| m.canvas)
            .map(|c| (c.width, c.height));
        if let Err(e) = window::resize_overlay(&app, canvas, fin.scale) {
            log::warn!("오버레이 리사이즈 실패: {e}");
        }
    }
    if shoulder_changed {
        let manifest = manifest.unwrap_or_else(|| load_manifest_or_warn(&state.paths.assets_dir));
        refresh_hand_anchor(&app, &state, &manifest, fin.mouse.as_ref())?;
    }

    // (v0.23, CR-048 · TM-01 · TM-04 · TM-11) 타이머 끔·모드·시작 시간 부수 효과 — 실패해도
    // 명령은 성공한다(경고 로그만).
    apply_timer_config_side_effect(&app, &state, &old_timer, &fin.timer);

    Ok(fin)
}

// ─── 에셋 ──────────────────────────────────────────────────────────────────

/// [계약] contract.md get_asset_manifest [요구] R-미정 [에러] asset.io, asset.manifest
#[tauri::command]
pub fn get_asset_manifest(state: State<'_, AppState>) -> Result<AssetManifest, BridgeError> {
    Ok(assets::load_manifest(&state.paths.assets_dir)?)
}

/// [계약] contract.md §5 import_asset(slot, path) [요구] OV-R-03, OV-R-21, OV-R-17, OV-R-18
/// PNG 검증(형식·크기·용량·캔버스 일치, `background`(v0.6) 포함) → assets/ 복사 → manifest 갱신
/// → (캔버스 레이어면 emit 전) 오버레이 리사이즈 → assets://changed emit
/// → (`mouse_base`면 emit 후) 손 기준점 재계산 → (바뀌면) assets://hand-anchor-changed
/// [에러] asset.not_png, asset.bad_header, asset.not_rgba, asset.too_large, asset.too_many_bytes,
/// asset.canvas_mismatch, asset.io, asset.manifest, tauri.error(emit), state.poisoned
/// [부수효과] assets://changed emit, (조건부) 오버레이 리사이즈, (조건부) assets://hand-anchor-changed emit
#[tauri::command]
pub fn import_asset(
    app: AppHandle,
    state: State<'_, AppState>,
    slot: AssetSlot,
    path: String,
) -> Result<AssetManifest, BridgeError> {
    let manifest = assets::import(&state.paths.assets_dir, slot, &PathBuf::from(path))?;
    after_asset_change(&app, &state, slot, &manifest)?;
    Ok(manifest)
}

/// [계약] contract.md §5 remove_asset(slot) [요구] OV-R-03, OV-R-21, OV-R-17
/// 슬롯 비우기(`background`(v0.6) 포함) → (캔버스 레이어면 emit 전) 오버레이 리사이즈
/// → assets://changed emit → (`mouse_base`면 emit 후) 손 기준점 재계산(결과는 null)
/// [에러] asset.not_found, asset.io, asset.manifest, tauri.error(emit), state.poisoned
/// [부수효과] assets://changed emit, (조건부) 오버레이 리사이즈, (조건부) assets://hand-anchor-changed emit
#[tauri::command]
pub fn remove_asset(
    app: AppHandle,
    state: State<'_, AppState>,
    slot: AssetSlot,
) -> Result<AssetManifest, BridgeError> {
    let manifest = assets::remove(&state.paths.assets_dir, slot)?;
    after_asset_change(&app, &state, slot, &manifest)?;
    Ok(manifest)
}

/// [계약] contract.md §5·§5.7 restore_default_asset(slot) [요구] DA-03
/// 슬롯을 내장 기본 그림으로 되돌린다(core `assets::defaults::restore_default` — 내장 없음이면
/// `asset.no_default`, 있으면 검증 후 같은 파일명 교체). 후처리는 `import_asset`과 같다(`after_asset_change`).
/// [에러] asset.no_default, asset.not_png, asset.bad_header, asset.not_rgba, asset.too_large,
/// asset.too_many_bytes, asset.canvas_mismatch, asset.io, asset.manifest, tauri.error(emit), state.poisoned
/// [부수효과] assets://changed emit, (조건부) 오버레이 리사이즈, (조건부) assets://hand-anchor-changed emit
#[tauri::command]
pub fn restore_default_asset(
    app: AppHandle,
    state: State<'_, AppState>,
    slot: AssetSlot,
) -> Result<AssetManifest, BridgeError> {
    let manifest = do_restore_default_asset(&state.paths.assets_dir, slot)?;
    after_asset_change(&app, &state, slot, &manifest)?;
    Ok(manifest)
}

/// tauri 의존 없는 순수 함수 — 단위 테스트 대상(계약 §5.7 「테스트」).
pub(crate) fn do_restore_default_asset(
    assets_dir: &Path,
    slot: AssetSlot,
) -> Result<AssetManifest, BridgeError> {
    Ok(assets::defaults::restore_default(assets_dir, slot)?)
}

/// [계약] contract.md §5·§5.7 export_default_assets(dir, overwrite) [요구] DA-05
/// 내장 기본 그림 6장(CR-044)을 `dir`에 원본 바이트 그대로 쓴다(core `assets::export::export_defaults`).
/// `overwrite: false`이고 충돌이 있으면 아무것도 쓰지 않고 `conflicts`만 채운다.
/// [에러] asset.export_dir [부수효과] 없음 — 이벤트·매니페스트·앱 데이터 폴더 무관
#[tauri::command]
pub fn export_default_assets(dir: String, overwrite: bool) -> Result<ExportReport, BridgeError> {
    do_export_default_assets(&dir, overwrite)
}

/// tauri 의존 없는 순수 함수 — 단위 테스트 대상(계약 §5.7 「테스트」).
pub(crate) fn do_export_default_assets(
    dir: &str,
    overwrite: bool,
) -> Result<ExportReport, BridgeError> {
    Ok(assets::export::export_defaults(Path::new(dir), overwrite)?)
}

/// [계약] contract.md §3.6·§5 get_hand_anchor [요구] OV-R-14
/// 캐시를 그대로 반환한다. 해독·계산·파일 접근 없음, 부수 효과 없음.
/// [에러] state.poisoned
#[tauri::command]
pub fn get_hand_anchor(state: State<'_, AppState>) -> Result<Option<settings::Point>, BridgeError> {
    // 반환 타입은 캔버스 좌표(settings::Point) — window::Point(창 위치, i32)와 다르다.
    let cache = lock_hand_anchor(&state)?;
    Ok(*cache)
}

// ─── 창·화면 ───────────────────────────────────────────────────────────────

/// [계약] contract.md get_screen_bounds [요구] R-미정 — 모든 모니터 합집합(물리 픽셀) [에러] window.no_monitor
#[tauri::command]
pub fn get_screen_bounds(app: AppHandle) -> Result<ScreenBounds, BridgeError> {
    window::screen_bounds(&app)
}

/// [계약] contract.md §5 get_monitors [요구] OV-R-(CR-017) [에러] WINDOW_ERROR
/// 모니터마다 전체 사각형 1개(물리 px, 가상 화면 좌표)를 OS 열거 순서로 반환. 부수 효과·캐시 없음.
/// 빈 목록이면 `WindowError::NoMonitor` → `WINDOW_ERROR`(core `window::list_monitors`는 빈 목록을
/// 오류로 보지 않으므로 여기서 판정한다, §5 표).
#[tauri::command]
pub fn get_monitors(app: AppHandle) -> Result<Vec<ScreenBounds>, BridgeError> {
    let monitors = window::list_monitors(&app)?;
    if monitors.is_empty() {
        return Err(window::WindowError::NoMonitor.into());
    }
    Ok(monitors)
}

/// [계약] contract.md get_overlay_position [요구] R-미정 [에러] window.not_found
#[tauri::command]
pub fn get_overlay_position(app: AppHandle) -> Result<Point, BridgeError> {
    window::overlay_position(&app)
}

/// [계약] contract.md set_overlay_position(x, y) [요구] R-미정 — 이동 + 설정 저장 [에러] window.not_found, settings.io, state.poisoned
/// (CR-047) 저장은 `settings::update` 하나 — 잠금 안에서 대입·검증·원자 저장·메모리 대입, emit은 잠금 밖(settings.md §3.9.6 S6).
#[tauri::command]
pub fn set_overlay_position(
    app: AppHandle,
    state: State<'_, AppState>,
    x: i32,
    y: i32,
) -> Result<(), BridgeError> {
    window::set_overlay_position(&app, x, y)?;
    let out = settings::update(&state.settings, &state.paths.settings_file, |s| {
        s.overlay.x = x;
        s.overlay.y = y;
    })?;
    events::emit_settings_changed(&app, &out.settings)?;
    Ok(())
}

/// [계약] contract.md set_overlay_visible(visible) [요구] R-미정 — 표시/숨김 + 설정 저장 [에러] window.not_found, settings.io, state.poisoned
/// (CR-047) 저장은 `settings::update` 하나 — 잠금 안에서 대입·검증·원자 저장·메모리 대입, emit은 잠금 밖(settings.md §3.9.6 S7).
#[tauri::command]
pub fn set_overlay_visible(
    app: AppHandle,
    state: State<'_, AppState>,
    visible: bool,
) -> Result<(), BridgeError> {
    window::set_overlay_visible(&app, visible)?;
    let out = settings::update(&state.settings, &state.paths.settings_file, |s| {
        s.overlay.visible = visible;
    })?;
    events::emit_settings_changed(&app, &out.settings)?;
    Ok(())
}

/// [계약] contract.md §5.6 reset_overlay_position [요구] SV2-06
/// 오버레이를 기본 위치((100,100))로 옮기고 저장 → settings://changed emit → 새 위치 반환.
/// 숨김이어도 옮기고 표시 상태는 바꾸지 않는다. 위치 잠금 중에도 동작(프로그램 이동).
/// 리사이즈·손 기준점 재계산 없음(§5.1-3).
/// [에러] window.not_found, tauri.error, state.poisoned, settings.io
/// [부수효과] 창 이동, overlay.x/y 저장, settings://changed emit
#[tauri::command]
pub fn reset_overlay_position(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Point, BridgeError> {
    let saved = window::reset_overlay_position(&app, &state.settings, &state.paths.settings_file)?;
    events::emit_settings_changed(&app, &saved)?;
    Ok(Point {
        x: saved.overlay.x,
        y: saved.overlay.y,
    })
}

/// [계약] contract.md §5.5 set_autostart(enabled) → 실제 등록 상태 반환 [요구] SV2-05
/// (CR-047, SEC-001) 작업 스케줄러 등록/해제 — **일반 권한(LeastPrivilege), 승격 없음**(자식
/// 프로세스 실행만 기다리는 블로킹이라 별도 스레드에서 실행). 성공 시 실제 상태를
/// 설정에 반영·저장(`persist_autostart` → `settings::update`, tray.md §3.5.3) → settings://changed
/// emit(값이 바뀐 경우만). 실패는 설정 불변, emit 없음. **`autostart.cancelled`는 더 이상 나오지
/// 않는다**(승격 경로 삭제로 UAC 취소 자체가 없다).
/// [에러] autostart.error, io.error, tauri.error, state.poisoned, settings.io
/// [부수효과] (성공 + 값 변경 시) settings://changed emit
#[tauri::command]
pub async fn set_autostart(
    app: AppHandle,
    state: State<'_, AppState>,
    enabled: bool,
) -> Result<bool, BridgeError> {
    // UAC 응답을 기다리는 블로킹 호출이라 메인 스레드를 막지 않게 별도 스레드에서 실행한다(§5.5-1).
    let actual = tauri::async_runtime::spawn_blocking(move || autostart::set_enabled(enabled))
        .await
        .map_err(|e| {
            BridgeError::new(
                "tauri.error",
                format!("자동 실행 처리 스레드가 응답하지 않습니다: {e}"),
            )
        })?
        .map_err(BridgeError::from)?;

    if let Some(saved) =
        autostart::persist_autostart(&state.settings, &state.paths.settings_file, actual)
            .map_err(BridgeError::from)?
    {
        events::emit_settings_changed(&app, &saved)?;
    }
    Ok(actual)
}

/// [계약] contract.md open_settings_window [요구] R-미정 [에러] window.not_found
#[tauri::command]
pub fn open_settings_window(app: AppHandle) -> Result<(), BridgeError> {
    window::show_settings_window(&app)
}

// ─── 알림음 ────────────────────────────────────────────────────────────────

/// [계약] contract.md §3.10·§5·§5.9 get_alarm_sound [요구] TM-07, TM-08
/// 등록한 알림음 1개(core `assets::sound::current`) — 여럿이면 최신 수정 시각, 없음·폴더 없음은
/// null. 부수 효과 없음(emit 없음).
/// [에러] sound.io
#[tauri::command]
pub fn get_alarm_sound(state: State<'_, AppState>) -> Result<Option<AlarmSound>, BridgeError> {
    do_get_alarm_sound(&state.paths.assets_dir)
}

/// tauri 의존 없는 순수 함수 — 단위 테스트 대상(계약 §5.9 「테스트」).
pub(crate) fn do_get_alarm_sound(assets_dir: &Path) -> Result<Option<AlarmSound>, BridgeError> {
    Ok(assets::sound::current(assets_dir)?)
}

/// [계약] contract.md §3.10·§5·§5.9 import_alarm_sound(path) [요구] TM-08
/// 크기(> 1MiB) 검사가 형식 검사보다 먼저(core `assets::sound::import`, SEC-003과 같은 순서) —
/// 앞 바이트로 wav·mp3·ogg 판별 후 `assets/alarm.{wav|mp3|ogg}`에 원자 저장, 다른 두 형식 삭제.
/// 이벤트 없음(A-1 — 다른 창은 쓸 때 get_alarm_sound로 조회).
/// [에러] sound.too_many_bytes, sound.not_audio, sound.io
#[tauri::command]
pub fn import_alarm_sound(
    state: State<'_, AppState>,
    path: String,
) -> Result<AlarmSound, BridgeError> {
    do_import_alarm_sound(&state.paths.assets_dir, &path)
}

/// tauri 의존 없는 순수 함수 — 단위 테스트 대상(계약 §5.9 「테스트」).
pub(crate) fn do_import_alarm_sound(
    assets_dir: &Path,
    path: &str,
) -> Result<AlarmSound, BridgeError> {
    Ok(assets::sound::import(assets_dir, Path::new(path))?)
}

/// [계약] contract.md §3.10·§5·§5.9 remove_alarm_sound [요구] TM-08
/// 알림음을 지워 기본음으로 되돌린다 — core `assets::sound::remove`(세 이름 모두 삭제, 없으면
/// 무시 — 멱등). 이벤트 없음(A-1).
/// [에러] sound.io
#[tauri::command]
pub fn remove_alarm_sound(state: State<'_, AppState>) -> Result<(), BridgeError> {
    do_remove_alarm_sound(&state.paths.assets_dir)
}

/// tauri 의존 없는 순수 함수 — 단위 테스트 대상(계약 §5.9 「테스트」).
pub(crate) fn do_remove_alarm_sound(assets_dir: &Path) -> Result<(), BridgeError> {
    Ok(assets::sound::remove(assets_dir)?)
}

// ─── 뽀모도 타이머 ─────────────────────────────────────────────────────────

/// [계약] contract.md §3.9·§5·§5.8 get_timer [요구] PT-03, PT-09 [에러] state.poisoned
/// 지금 타이머 사진. 부수 효과 없음(emit 없음).
#[tauri::command]
pub fn get_timer(state: State<'_, AppState>) -> Result<TimerSnapshot, BridgeError> {
    let timer = lock_timer(&state)?;
    Ok(timer.snapshot(Instant::now()))
}

/// [계약] contract.md §5·§5.8 control_timer(action) [요구] PT-05, TM-05, TM-06
/// ① 설정 잠금으로 timer.enabled 복사(즉시 해제) ② 타이머 잠금으로 적용 ③ (v0.23) 바뀌면 core
/// 깔때기 `crate::publish_timer_change`(emit → 트레이 메뉴 → 마감 스레드 깨움).
/// [에러] timer.disabled, state.poisoned [부수효과] (조건부) timer://changed emit·트레이 메뉴 동기화
#[tauri::command]
pub fn control_timer(
    app: AppHandle,
    state: State<'_, AppState>,
    action: TimerAction,
) -> Result<TimerSnapshot, BridgeError> {
    let enabled = lock_settings(&state)?.timer.enabled;
    let (snapshot, changed) = {
        let mut timer = lock_timer(&state)?;
        do_control_timer(&mut timer, enabled, action, Instant::now())?
    };
    if changed {
        crate::publish_timer_change(&app, &snapshot);
    }
    Ok(snapshot)
}

/// tauri 의존 없는 순수 함수 — 단위 테스트 대상(계약 §5.8 「테스트」).
pub(crate) fn do_control_timer(
    timer: &mut Timer,
    enabled: bool,
    action: TimerAction,
    now: Instant,
) -> Result<(TimerSnapshot, bool), BridgeError> {
    let changed = timer.apply(action, enabled, now)?;
    Ok((timer.snapshot(now), changed))
}

/// [계약] contract.md §5·§5.8 set_resting(resting) [요구] PT-06, TM-05
/// 판정 주체는 오버레이 상태기계(core는 판정하지 않는다). 설정 잠금은 쓰지 않는다. (v0.23) 카운트
/// 다운이면 core가 항상 변화 없음을 돌려준다 — 오버레이는 모드를 보지 않고 그대로 부른다.
/// [에러] state.poisoned [부수효과] (조건부) timer://changed emit·트레이 메뉴 동기화
#[tauri::command]
pub fn set_resting(
    app: AppHandle,
    state: State<'_, AppState>,
    resting: bool,
) -> Result<TimerSnapshot, BridgeError> {
    let (snapshot, changed) = {
        let mut timer = lock_timer(&state)?;
        do_set_resting(&mut timer, resting, Instant::now())
    };
    if changed {
        crate::publish_timer_change(&app, &snapshot);
    }
    Ok(snapshot)
}

/// tauri 의존 없는 순수 함수 — 단위 테스트 대상(계약 §5.8 「테스트」).
pub(crate) fn do_set_resting(
    timer: &mut Timer,
    resting: bool,
    now: Instant,
) -> (TimerSnapshot, bool) {
    let changed = timer.set_resting(resting, now);
    (timer.snapshot(now), changed)
}

/// (v0.23, CR-048 · TM-01 · TM-04 · TM-11) `set_settings` 6단계 — 타이머 끔·모드·시작 시간
/// 부수 효과(계약 §5.3 6단계·§5.8, v0.21의 「7단계」 끔 부수 효과를 대체). 잠금 오염은 경고 로그만
/// 남기고 아무것도 부르지 않는다 — `set_settings`는 이미 성공이 확정된 뒤라 이 단계 실패로 명령을
/// 실패시키지 않는다. 바뀌면 core 깔때기(`publish_timer_change`), 아니면 트레이 메뉴만 동기화한다
/// (켜기·끄기로 스냅숏이 그대로여도 트레이 메뉴 보기는 바뀔 수 있다).
fn apply_timer_config_side_effect(
    app: &AppHandle,
    state: &State<'_, AppState>,
    before: &TimerSettings,
    after: &TimerSettings,
) {
    let snapshot = match lock_timer(state) {
        Ok(mut timer) => do_timer_config_side_effect(&mut timer, before, after, Instant::now()),
        Err(e) => {
            log::warn!("타이머 상태 잠금 실패(설정 부수 효과 건너뜀): {e}");
            return;
        }
    };
    match snapshot {
        Some(snapshot) => crate::publish_timer_change(app, &snapshot),
        None => tray::sync_timer_menu(app),
    }
}

/// tauri 의존 없는 순수 함수 — 단위 테스트 대상(계약 §5.3 6단계·§5.8 「테스트」, 패킷 §3.1).
/// 순서 고정: `before.enabled && !after.enabled`이면 먼저 `Timer::disable` → 그다음 항상
/// `Timer::configure`(모드 전환 = 새 모드 대기, 대기 중 시작 시간 변경 = 새 시작 시간, 흐르는
/// 중·끝남이면 다음 대기부터 — core `Timer::configure` 내부 규칙). 둘 중 하나라도 바뀌면 스냅샷을
/// 돌려준다.
pub(crate) fn do_timer_config_side_effect(
    timer: &mut Timer,
    before: &TimerSettings,
    after: &TimerSettings,
    now: Instant,
) -> Option<TimerSnapshot> {
    let mut changed = false;
    if before.enabled && !after.enabled {
        changed |= timer.disable(now);
    }
    changed |= timer.configure(TimerConfig::from_settings(after), now);
    changed.then(|| timer.snapshot(now))
}

// ─── 데이터 초기화 ─────────────────────────────────────────────────────────

/// (v0.30, A-5) 호출 창 제한 공용 판정 — contract.md §5.11 「호출 창 제한 일반화」.
/// tauri 타입을 받지 않는 순수 함수라 `#[cfg(test)]`에서 그대로 부른다(스킬 §10).
/// `label`이 설정 창(`window::SETTINGS_LABEL`)과 정확히 같을 때만 `Ok`. 아니면 넘겨받은
/// `code`·`message`로 거부한다. message에 라벨·경로를 넣지 않는다(입력값을 그대로 싣지 않는다).
fn ensure_settings_caller(
    label: &str,
    code: &'static str,
    message: &'static str,
) -> Result<(), BridgeError> {
    if label == window::SETTINGS_LABEL {
        Ok(())
    } else {
        Err(BridgeError::new(code, message))
    }
}

/// (v0.26, SEC-002) `reset_app_data` 호출 창 제한 — contract.md §5.10 「호출 창 제한」.
/// (v0.30) `ensure_settings_caller`에 위임만 한다 — code·문구·거부 조건 불변.
fn ensure_reset_caller(label: &str) -> Result<(), BridgeError> {
    ensure_settings_caller(
        label,
        "reset.forbidden",
        "전체 초기화는 설정 창에서만 할 수 있습니다.",
    )
}

/// [계약] contract.md §5·§5.10 reset_app_data [요구] R-B2, R-B3, R-A2 [에러] reset.forbidden,
/// reset.io, reset.seed, settings.io, state.poisoned [부수효과] settings://changed emit(가능하면
/// 2회), assets://changed emit, 오버레이 창 속성 적용·리사이즈·기본 위치 이동·저장, (조건부)
/// assets://hand-anchor-changed emit, (조건부) timer://changed emit·트레이 메뉴 동기화, 오버레이
/// WebView 새로고침. **settings 창 호출만 허용** — 다른 창에서 부르면 0단계에서 거부한다.
/// **🔒 베타 전용**(02-design §0 R-A·R-B) — 사용자 커스텀까지 전부 지우는 정책은 베타 동안만.
/// **동기 command로 유지한다**(§5.10 C-4 불변식 — async로 바꾸려면 먼저 공용 잠금을 도입).
/// 처리 순서(정본 §5.10): 0(호출 창 확인, 거부되면 즉시 반환) → 가(이전 타이머 설정 복사) →
/// 나(core `data_reset::reset_data`, 실패는 code만 경고 로그하고 계속) → 1(메모리 설정·디스크
/// 매니페스트 다시 읽기 — 이 잠금 실패만 `state.poisoned`로 즉시 반환, 나의 결과보다 우선) →
/// 2~9(뒤처리, 실패는 모두 경고 로그만) → 다(나의 결과 반환).
#[tauri::command]
pub fn reset_app_data(
    app: AppHandle,
    caller: tauri::WebviewWindow,
    state: State<'_, AppState>,
) -> Result<(), BridgeError> {
    // 0: 호출 창 확인 — 거부되면 설정 잠금·core·emit·창 조작을 하나도 하지 않고 즉시 반환.
    ensure_reset_caller(caller.label())?;

    // 가: 이전 timer 설정 복사 — 잠금은 이 문장 끝에서 풀린다(나의 settings::update와 교착 방지).
    let old_timer = lock_settings(&state)?.timer.clone();

    let reset_result = data_reset::reset_data(&state.paths, &state.settings);
    if let Err(e) = &reset_result {
        log::warn!("data-reset: reset_app_data 초기화 실패 code={}", e.code());
    }

    // 1: 메모리 설정 복제 + 디스크 매니페스트. 잠금 오염이면 나의 결과와 무관하게 state.poisoned.
    let fin = lock_settings(&state)?.clone();
    let manifest = load_manifest_or_warn(&state.paths.assets_dir);

    reapply_after_reset(&app, &state, &fin, &manifest, &old_timer);

    reset_result.map(|_| ()).map_err(BridgeError::from)
}

/// `reset_app_data` 뒤처리 2~9단계(패킷 이름 `reapply_after_reset`, §5.10). 결과와 무관하게 두
/// 창을 디스크에 남은 실제 상태로 맞춘다 — 실패는 모두 경고 로그만 남기고 계속한다.
fn reapply_after_reset(
    app: &AppHandle,
    state: &State<'_, AppState>,
    fin: &Settings,
    manifest: &AssetManifest,
    old_timer: &TimerSettings,
) {
    if let Err(e) = events::emit_settings_changed(app, fin) {
        log::warn!("data-reset: settings://changed emit 실패: {e}");
    }
    if let Err(e) = events::emit_assets_changed(app, manifest) {
        log::warn!("data-reset: assets://changed emit 실패: {e}");
    }
    if let Err(e) = window::apply_overlay_window(app, fin) {
        log::warn!("data-reset: 오버레이 창 속성 적용 실패: {e}");
    }
    let canvas = manifest.canvas.map(|c| (c.width, c.height));
    if let Err(e) = window::resize_overlay(app, canvas, fin.scale) {
        log::warn!("data-reset: 오버레이 리사이즈 실패: {e}");
    }
    match window::reset_overlay_position(app, &state.settings, &state.paths.settings_file) {
        Ok(saved) if saved.overlay != fin.overlay => {
            if let Err(e) = events::emit_settings_changed(app, &saved) {
                log::warn!("data-reset: 위치 초기화 뒤 settings://changed emit 실패: {e}");
            }
        }
        Ok(_) => {}
        Err(e) => log::warn!("data-reset: 오버레이 위치 초기화 실패: {e}"),
    }
    if let Err(e) = refresh_hand_anchor(app, state, manifest, fin.mouse.as_ref()) {
        log::warn!("data-reset: 손 기준점 재계산 실패: {e}");
    }
    apply_timer_config_side_effect(app, state, old_timer, &fin.timer);
    if let Err(e) = tray::refresh_overlay(app) {
        log::warn!("data-reset: 오버레이 새로고침 실패: {e}");
    }
}

#[cfg(test)]
mod tests;
