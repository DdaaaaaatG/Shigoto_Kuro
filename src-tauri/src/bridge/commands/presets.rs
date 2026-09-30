//! 프리셋 command 7개 (v0.30, PS-01·04·05·06·07·08·09, A-5) — contract.md §5·§5.11.
//!
//! [규칙] 핸들러는 얇다 — 호출 창 확인 → 인자 변환 → `do_*`(core 호출) → `From<PresetError>` 변환.
//!        검증·경로 조립·파일 IO는 core `presets`에 있다. 7개 모두 동기 command(C-4 불변식).
//! [이벤트] 새 이벤트 없음. `apply_preset`만 기존 이벤트를 재방출한다(§5.11 1~6단계).
//! [등록] `lib.rs` `generate_handler!`에 `bridge::commands::presets::xxx` 전체 경로로 등록한다.
//! [unsafe] 없음.

use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, State};

use super::{
    apply_timer_config_side_effect, ensure_settings_caller, load_manifest_or_warn, lock_settings,
    refresh_hand_anchor,
};
use crate::assets::AssetManifest;
use crate::bridge::events;
use crate::error::BridgeError;
use crate::presets::{
    self, AppliedPreset, PresetError, PresetExportResult, PresetImportReport, PresetSummary,
};
use crate::settings::{Settings, TimerSettings};
use crate::window;
use crate::{AppPaths, AppState};

/// 호출 창 제한 code·문구 — 한 곳(§5.11). 라벨·경로를 담지 않는다.
const PRESET_FORBIDDEN_CODE: &str = "preset.forbidden";
const PRESET_FORBIDDEN_MESSAGE: &str = "프리셋은 설정 창에서만 바꿀 수 있습니다.";

fn ensure_preset_caller(label: &str) -> Result<(), BridgeError> {
    ensure_settings_caller(label, PRESET_FORBIDDEN_CODE, PRESET_FORBIDDEN_MESSAGE)
}

/// 현재 시각(Unix ms). 시계 오류면 0(panic 금지).
fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// ─── do_* 순수 함수 (tauri 타입 없음 — 단위 테스트 대상) ─────────────────────

pub(crate) fn do_list(paths: &AppPaths) -> Result<Vec<PresetSummary>, BridgeError> {
    presets::list(&paths.presets_dir()).map_err(BridgeError::from)
}

pub(crate) fn do_save(
    paths: &AppPaths,
    settings: &Mutex<Settings>,
    name: &str,
    now_ms: u64,
) -> Result<PresetSummary, BridgeError> {
    presets::save(paths, settings, name, now_ms).map_err(BridgeError::from)
}

/// `PresetError`를 그대로 돌려준다 — 핸들러가 `may_have_changed()`로 뒤처리 여부를 정한다.
pub(crate) fn do_apply(
    paths: &AppPaths,
    settings: &Mutex<Settings>,
    id: &str,
) -> Result<AppliedPreset, PresetError> {
    presets::apply(paths, id, settings)
}

pub(crate) fn do_export(
    paths: &AppPaths,
    id: &str,
    dir: &Path,
) -> Result<PresetExportResult, BridgeError> {
    presets::export_to(&paths.presets_dir(), id, dir).map_err(BridgeError::from)
}

pub(crate) fn do_import(
    paths: &AppPaths,
    dir: &Path,
    now_ms: u64,
) -> Result<PresetImportReport, BridgeError> {
    presets::import_from(&paths.presets_dir(), dir, now_ms).map_err(BridgeError::from)
}

pub(crate) fn do_rename(
    paths: &AppPaths,
    id: &str,
    name: &str,
) -> Result<PresetSummary, BridgeError> {
    presets::rename(&paths.presets_dir(), id, name).map_err(BridgeError::from)
}

pub(crate) fn do_delete(paths: &AppPaths, id: &str) -> Result<(), BridgeError> {
    presets::delete(&paths.presets_dir(), id).map_err(BridgeError::from)
}

// ─── 핸들러 ────────────────────────────────────────────────────────────────

/// [계약] contract.md §5·§5.11 list_presets [요구] PS-01, PS-09 [에러] preset.io [부수효과] 없음
/// (호출 창 제한 없음 — 읽기 전용)
#[tauri::command]
pub fn list_presets(state: State<'_, AppState>) -> Result<Vec<PresetSummary>, BridgeError> {
    do_list(&state.paths)
}

/// [계약] contract.md §5·§5.11 save_preset [요구] PS-01, PS-08 [에러] preset.forbidden,
/// preset.invalid_name, preset.missing_required, preset.io, state.poisoned [부수효과] 없음(응답으로 반환)
#[tauri::command]
pub fn save_preset(
    caller: tauri::WebviewWindow,
    state: State<'_, AppState>,
    name: String,
) -> Result<PresetSummary, BridgeError> {
    ensure_preset_caller(caller.label())?;
    do_save(&state.paths, &state.settings, &name, now_ms())
}

/// [계약] contract.md §5·§5.11 apply_preset [요구] PS-04 [에러] preset.forbidden, preset.not_found,
/// preset.format, preset.invalid_settings, preset.damaged, preset.io, settings.io, state.poisoned
/// [부수효과] settings://changed → assets://changed emit, 오버레이 리사이즈, 손 기준점 재계산
/// (조건부 assets://hand-anchor-changed), 타이머 설정 반영(조건부 timer://changed).
/// 처리 순서(정본 §5.11): 0(호출 창) → 가(이전 타이머 설정) → 나(core apply) → 1~6(뒤처리) → 다(결과).
#[tauri::command]
pub fn apply_preset(
    app: AppHandle,
    caller: tauri::WebviewWindow,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), BridgeError> {
    // 0: 호출 창 확인 — 거부되면 잠금·core·emit·창 조작 없이 즉시 반환.
    ensure_preset_caller(caller.label())?;

    // 가: 잠금은 이 문장 끝에서 풀린다(나의 settings::update와 교착 방지).
    let old_timer = lock_settings(&state)?.timer.clone();

    // 나: 되돌림 성공까지 포함해 디스크가 안 바뀐 실패는 뒤처리 없이 즉시 반환.
    let (manifest, outcome) = match do_apply(&state.paths, &state.settings, &id) {
        Ok(applied) => (applied.manifest, Ok(())),
        Err(e) if !e.may_have_changed() => return Err(e.into()),
        Err(e) => (load_manifest_or_warn(&state.paths.assets_dir), Err(e)),
    };

    // 1: 잠금 오염이면 이후 단계 없이 state.poisoned.
    let fin = lock_settings(&state)?.clone();
    reapply_after_preset(&app, &state, &fin, &manifest, &old_timer);

    // 다
    outcome.map_err(BridgeError::from)
}

/// `apply_preset` 뒤처리 2~6단계(§5.11). 실패는 모두 경고 로그만 남기고 계속한다.
/// 창 표시·위치·잠금 적용과 오버레이 새로고침은 하지 않는다(U-6 = A).
fn reapply_after_preset(
    app: &AppHandle,
    state: &State<'_, AppState>,
    fin: &Settings,
    manifest: &AssetManifest,
    old_timer: &TimerSettings,
) {
    if let Err(e) = events::emit_settings_changed(app, fin) {
        log::warn!("preset: settings://changed emit 실패: {e}");
    }
    if let Err(e) = events::emit_assets_changed(app, manifest) {
        log::warn!("preset: assets://changed emit 실패: {e}");
    }
    let canvas = manifest.canvas.map(|c| (c.width, c.height));
    if let Err(e) = window::resize_overlay(app, canvas, fin.scale) {
        log::warn!("preset: 오버레이 리사이즈 실패: {e}");
    }
    if let Err(e) = refresh_hand_anchor(app, state, manifest, fin.mouse.as_ref()) {
        log::warn!("preset: 손 기준점 재계산 실패: {e}");
    }
    apply_timer_config_side_effect(app, state, old_timer, &fin.timer);
}

/// [계약] contract.md §5·§5.11 export_preset [요구] PS-05 [에러] preset.forbidden, preset.not_found,
/// preset.format, preset.bad_dir, preset.export_exists, preset.io [부수효과] 사용자 폴더에 새 폴더 1개
#[tauri::command]
pub fn export_preset(
    caller: tauri::WebviewWindow,
    state: State<'_, AppState>,
    id: String,
    dir: String,
) -> Result<PresetExportResult, BridgeError> {
    ensure_preset_caller(caller.label())?;
    do_export(&state.paths, &id, Path::new(&dir))
}

/// [계약] contract.md §5·§5.11 import_preset [요구] PS-06 [에러] preset.forbidden, preset.bad_dir,
/// preset.not_preset, preset.format, preset.invalid_name, preset.invalid_settings, preset.io
/// [부수효과] 없음(파일별 문제는 reject가 아니라 `problems`로 반환)
#[tauri::command]
pub fn import_preset(
    caller: tauri::WebviewWindow,
    state: State<'_, AppState>,
    dir: String,
) -> Result<PresetImportReport, BridgeError> {
    ensure_preset_caller(caller.label())?;
    do_import(&state.paths, Path::new(&dir), now_ms())
}

/// [계약] contract.md §5·§5.11 rename_preset [요구] PS-07 [에러] preset.forbidden, preset.not_found,
/// preset.invalid_name, preset.format, preset.io [부수효과] 없음
#[tauri::command]
pub fn rename_preset(
    caller: tauri::WebviewWindow,
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> Result<PresetSummary, BridgeError> {
    ensure_preset_caller(caller.label())?;
    do_rename(&state.paths, &id, &name)
}

/// [계약] contract.md §5·§5.11 delete_preset [요구] PS-07 [에러] preset.forbidden, preset.not_found,
/// preset.io [부수효과] 없음
#[tauri::command]
pub fn delete_preset(
    caller: tauri::WebviewWindow,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), BridgeError> {
    ensure_preset_caller(caller.label())?;
    do_delete(&state.paths, &id)
}

#[cfg(test)]
mod tests;
