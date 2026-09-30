//! 프리셋 저장·가져오기·내보내기(PS-01·PS-05·PS-06·PS-08).
//!
//! [목적] `save`(현재 그림·알림음·설정 → 새 프리셋), `import_from`(폴더 검증 후 등록, 부분 등록 없음),
//!        `export_to`(목록에 적힌 파일만 폴더째 복사). 저장·가져오기는 `.staging-{id}`에 다 쓴 뒤 rename 한 번으로
//!        나타난다(`commit_staging`) — 실패하면 목록에 아무것도 생기지 않는다.
//! [공개 API] `save`·`import_from`·`export_to`(mod.rs가 재노출).
//! [스레드] 없음. 호출자 스레드에서 동기 실행. 설정 잠금은 `save`의 복사 한 문장에서만.
//! [unsafe] 없음.
//! [에러] `PresetError::{InvalidName, MissingRequired, Settings, BadDir, ExportExists, NotFound, NotPreset,
//!        Format, InvalidSettings, Io}`.
//! [설정] `save`가 `Settings`의 PS-02 4필드를 읽기만 한다(`settings.json` 불변).
//! [테스트] 통합 `tests/presets.rs`의 저장·가져오기·내보내기 영역.

use std::fs;
use std::io::ErrorKind;
use std::path::Path;
use std::sync::Mutex;

use super::format::{
    claim_staging, export_folder_name, normalize_name, read_preset_file, write_preset_file,
    PresetFile, PresetSettings,
};
use super::load::{load_dir, Loaded};
use super::scan::{check_presets_dir, cleanup_leftovers, is_plain_dir, is_plain_file};
use super::{
    ensure_preset_dir, summary, PresetError, PresetExportResult, PresetImportReport, PresetSummary,
    FORMAT_VERSION, PRESET_FILE,
};
use crate::assets::sound::{self, alarm_file_name, ALARM_MAX_BYTES};
use crate::assets::{
    load_manifest, read_capped, stored_file_name, AssetError, AssetSlot, SimpleSlot,
    ASSET_MAX_BYTES,
};
use crate::settings::{Settings, SettingsError};
use crate::AppPaths;

/// 스테이징 폴더에 쓸 파일 하나: (폴더 안 파일 이름, 바이트).
type StagedFile = (String, Vec<u8>);

/// `AssetError`(파일 읽기 실패) → `PresetError::Io`. 원인은 `ErrorKind`만 로그에 남는다.
fn asset_io(e: AssetError) -> PresetError {
    match e {
        AssetError::Io(io) => PresetError::io(io),
        other => PresetError::io_other(other.code()),
    }
}

/// `path`가 링크 아닌 일반 파일임을 확인하고 `max`까지만 읽는다. 아니면 `Io`.
fn read_plain(path: &Path, max: u64) -> Result<Vec<u8>, PresetError> {
    match is_plain_file(path) {
        Ok(true) => {}
        Ok(false) => return Err(PresetError::io_other("일반 파일이 아닙니다")),
        Err(e) => return Err(PresetError::io(e)),
    }
    read_capped(path, max).map_err(asset_io)
}

/// 스테이징 폴더에 파일을 다 쓴다(`preset.json`은 마지막).
fn fill_staging(
    staging: &Path,
    files: &[StagedFile],
    file: &PresetFile,
) -> Result<(), PresetError> {
    for (name, bytes) in files {
        fs::write(staging.join(name), bytes).map_err(PresetError::io)?;
    }
    write_preset_file(staging, file)
}

/// 선점 → 쓰기 → rename. 실패하면 스테이징을 지운다(최선) — 목록에 아무것도 생기지 않는다.
fn commit_staging(
    presets_dir: &Path,
    now_ms: u64,
    files: &[StagedFile],
    file: &PresetFile,
) -> Result<PresetSummary, PresetError> {
    check_presets_dir(presets_dir)?;
    cleanup_leftovers(presets_dir);
    let (id, staging) = claim_staging(presets_dir, now_ms)?;
    let done = fill_staging(&staging, files, file)
        .and_then(|()| fs::rename(&staging, presets_dir.join(&id)).map_err(PresetError::io));
    if let Err(e) = done {
        if let Err(re) = fs::remove_dir_all(&staging) {
            log::warn!("preset: 스테이징 정리 실패 kind={:?}", re.kind());
        }
        return Err(e);
    }
    Ok(summary(&presets_dir.join(&id), &id, file))
}

/// 현재 그림·알림음·설정을 새 프리셋으로 저장한다(PS-01·PS-02·PS-08). 현재 파일은 다시 검증하지 않는다.
pub fn save(
    paths: &AppPaths,
    settings: &Mutex<Settings>,
    name: &str,
    now_ms: u64,
) -> Result<PresetSummary, PresetError> {
    let name = normalize_name(name)?;
    let manifest = load_manifest(&paths.assets_dir).map_err(asset_io)?;
    let required = |s| manifest.find(&AssetSlot::Simple(s)).is_some();
    if !(required(SimpleSlot::KbUp) && required(SimpleSlot::MouseBase)) {
        return Err(PresetError::MissingRequired);
    }
    let copied = settings
        .lock()
        .map(|g| PresetSettings::from_settings(&g))
        .map_err(|_| PresetError::Settings {
            source: SettingsError::StatePoisoned,
            changed: false,
        })?;
    let alarm = sound::current(&paths.assets_dir).map_err(|e| match e {
        sound::SoundError::Io(io) => PresetError::io(io),
        other => PresetError::io_other(other.code()),
    })?;

    let mut files: Vec<StagedFile> = Vec::with_capacity(manifest.entries.len() + 1);
    for entry in &manifest.entries {
        let file_name = stored_file_name(&entry.slot);
        let bytes = read_plain(&paths.assets_dir.join(&file_name), ASSET_MAX_BYTES)?;
        files.push((file_name, bytes));
    }
    let alarm_format = alarm.map(|a| a.format);
    if let Some(fmt) = alarm_format {
        let file_name = alarm_file_name(fmt);
        let bytes = read_plain(&paths.assets_dir.join(file_name), ALARM_MAX_BYTES)?;
        files.push((file_name.to_string(), bytes));
    }
    let file = PresetFile {
        format_version: FORMAT_VERSION,
        name,
        saved_at: now_ms,
        images: manifest.entries.iter().map(|e| e.slot).collect(),
        alarm: alarm_format,
        settings: copied,
    };
    commit_staging(&paths.presets_dir(), now_ms, &files, &file)
}

/// 폴더를 검증하고 통과하면 새 프리셋으로 등록한다(PS-06). 파일별 문제는 `Ok(보고서)`이고 디스크는 불변.
/// `savedAt`은 원본 값을 유지한다(U-5) — `now_ms`는 id 생성에만 쓴다.
pub fn import_from(
    presets_dir: &Path,
    src: &Path,
    now_ms: u64,
) -> Result<PresetImportReport, PresetError> {
    if !src.is_absolute() || !matches!(is_plain_dir(src), Ok(true)) {
        return Err(PresetError::BadDir);
    }
    let v = match load_dir(src)? {
        Loaded::Problems(problems) => {
            return Ok(PresetImportReport {
                preset: None,
                problems,
            })
        }
        Loaded::Ok(v) => v,
    };
    // 검증에 쓴 바로 그 바이트를 쓴다 — 원본을 다시 열지 않는다.
    let mut files: Vec<StagedFile> = v
        .images
        .into_iter()
        .map(|(slot, bytes, _)| (stored_file_name(&slot), bytes))
        .collect();
    if let Some((fmt, bytes)) = v.alarm {
        files.push((alarm_file_name(fmt).to_string(), bytes));
    }
    let preset = commit_staging(presets_dir, now_ms, &files, &v.file)?;
    Ok(PresetImportReport {
        preset: Some(preset),
        problems: Vec::new(),
    })
}

/// `src`의 파일을 `dst`로 복사한다. 원본이 링크·일반 파일이 아니면 `Io`.
fn copy_plain(src: &Path, dst: &Path) -> Result<(), PresetError> {
    match is_plain_file(src) {
        Ok(true) => fs::copy(src, dst).map(|_| ()).map_err(PresetError::io),
        Ok(false) => Err(PresetError::io_other("일반 파일이 아닙니다")),
        Err(e) => Err(PresetError::io(e)),
    }
}

/// 목록 기반 복사: `preset.json` + `images`의 PNG + 알림음(폴더 나열 아님).
fn copy_listed(dir: &Path, target: &Path, file: &PresetFile) -> Result<(), PresetError> {
    let mut names: Vec<String> = vec![PRESET_FILE.to_string()];
    names.extend(file.images.iter().map(stored_file_name));
    names.extend(file.alarm.map(|f| alarm_file_name(f).to_string()));
    for name in &names {
        copy_plain(&dir.join(name), &target.join(name))?;
    }
    Ok(())
}

/// 프리셋을 `dest_parent/{정화된 이름}/`으로 내보낸다(PS-05). 같은 이름 폴더가 있으면 `ExportExists`(U-3).
/// 파일 검증은 하지 않는다 — 받는 쪽 가져오기가 검증한다.
pub fn export_to(
    presets_dir: &Path,
    id: &str,
    dest_parent: &Path,
) -> Result<PresetExportResult, PresetError> {
    let dir = ensure_preset_dir(presets_dir, id)?;
    let file = read_preset_file(&dir)?;
    if !dest_parent.is_absolute() || !matches!(is_plain_dir(dest_parent), Ok(true)) {
        return Err(PresetError::BadDir);
    }
    let folder_name = export_folder_name(&file.name);
    let target = dest_parent.join(&folder_name);
    match fs::create_dir(&target) {
        Ok(()) => {}
        Err(e) if e.kind() == ErrorKind::AlreadyExists => return Err(PresetError::ExportExists),
        Err(e) => return Err(PresetError::io(e)),
    }
    if let Err(e) = copy_listed(&dir, &target, &file) {
        if let Err(re) = fs::remove_dir_all(&target) {
            log::warn!("preset: 내보내기 정리 실패 kind={:?}", re.kind());
        }
        return Err(e);
    }
    Ok(PresetExportResult { folder_name })
}
