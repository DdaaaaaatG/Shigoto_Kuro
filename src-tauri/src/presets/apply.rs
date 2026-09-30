//! 프리셋 적용(PS-03·PS-04·PS-10).
//!
//! [목적] 검증 → 백업(메모리) → 파일 교체 → 설정 병합 → 실패 시 되돌림. 프리셋 폴더는 읽기만 한다.
//!        「없는 슬롯 비움」은 옛 매니페스트에만 있던 PNG 삭제 + 새 매니페스트에 없음으로 이룬다.
//! [공개 API] `apply`(mod.rs가 재노출). `FileBackup`·`backup_names`·`commit_files`·`build_manifest`는 비공개.
//! [스레드] 없음. 호출자 스레드에서 동기 실행. 설정 잠금은 `settings::update` 안에서만 — 호출자는 잠금을
//!        쥔 채 부르면 안 된다(교착).
//! [unsafe] 없음.
//! [에러] `PresetError::{NotFound, NotPreset, Format, InvalidName, InvalidSettings, Damaged, Io, Settings}`.
//!        `changed`는 되돌림까지 실패했을 때만 true.
//! [설정] `settings::update` 한 번으로 PS-02 4필드만 대입(`merge_into`) — PC별 5필드는 유지.
//! [테스트] 통합 `tests/presets_apply.rs`.

use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use super::load::{load_dir, Loaded, ValidatedPreset};
use super::{ensure_preset_dir, AppliedPreset, PresetError};
use crate::assets::sound::{alarm_file_name, AlarmFormat};
use crate::assets::{
    load_manifest, read_capped, save_manifest, stored_file_name, versioned_asset_url, AssetEntry,
    AssetError, AssetManifest, AssetSlot, PngInfo, ASSET_MAX_BYTES, MANIFEST_FILE,
};
use crate::settings::{update, write_atomic, Settings};
use crate::AppPaths;

/// 알림음 저장 이름 전부(형식이 바뀌어도 하나만 남도록).
const ALL_ALARM_FORMATS: [AlarmFormat; 3] = [AlarmFormat::Wav, AlarmFormat::Mp3, AlarmFormat::Ogg];

/// 교체 대상 파일의 옛 바이트(없던 파일은 `None`). 경로 = `assets_dir.join(고정 이름)`.
struct FileBackup {
    entries: Vec<(PathBuf, Option<Vec<u8>>)>,
}

impl FileBackup {
    /// 이름마다 현재 바이트를 메모리에 잡는다. 없는 파일 = `None`.
    fn capture(assets_dir: &Path, names: &[String]) -> Result<Self, PresetError> {
        let mut entries = Vec::with_capacity(names.len());
        for name in names {
            let path = assets_dir.join(name);
            let bytes = match read_capped(&path, ASSET_MAX_BYTES) {
                Ok(b) => Some(b),
                Err(AssetError::Io(e)) if e.kind() == ErrorKind::NotFound => None,
                Err(AssetError::Io(e)) => return Err(PresetError::io(e)),
                Err(other) => return Err(PresetError::io_other(other.code())),
            };
            entries.push((path, bytes));
        }
        Ok(Self { entries })
    }

    /// `Some` → `write_atomic`, `None` → 삭제(NotFound 무시). 하나라도 실패하면 false(경고 로그).
    fn restore(&self) -> bool {
        let mut all_ok = true;
        for (path, bytes) in &self.entries {
            let result = match bytes {
                Some(b) => write_atomic(path, b),
                None => match fs::remove_file(path) {
                    Err(e) if e.kind() != ErrorKind::NotFound => Err(e),
                    _ => Ok(()),
                },
            };
            if let Err(e) = result {
                log::warn!("preset: 되돌림 실패 kind={:?}", e.kind());
                all_ok = false;
            }
        }
        all_ok
    }
}

/// 백업 대상 이름 = 옛 매니페스트 키 ∪ 새 키 ∪ 알림음 3종 ∪ manifest.json (중복 없이).
fn backup_names(old: &AssetManifest, v: &ValidatedPreset) -> Vec<String> {
    let mut names: Vec<String> = old
        .entries
        .iter()
        .map(|e| stored_file_name(&e.slot))
        .collect();
    names.extend(v.images.iter().map(|(slot, _, _)| stored_file_name(slot)));
    names.extend(
        ALL_ALARM_FORMATS
            .iter()
            .map(|f| alarm_file_name(*f).to_string()),
    );
    names.push(MANIFEST_FILE.to_string());
    let mut seen = std::collections::HashSet::new();
    names.retain(|n| seen.insert(n.clone()));
    names
}

/// `AssetError` → `io::Error`(원인 종류는 유지, 문구는 code만).
fn asset_to_io(e: AssetError) -> std::io::Error {
    match e {
        AssetError::Io(io) => io,
        other => std::io::Error::other(other.code()),
    }
}

/// `NotFound`를 무시하는 삭제.
fn remove_if_exists(path: &Path) -> std::io::Result<()> {
    match fs::remove_file(path) {
        Err(e) if e.kind() != ErrorKind::NotFound => Err(e),
        _ => Ok(()),
    }
}

/// 새 알림음을 쓰고 다른 형식은 지운다. 알림음이 없으면 세 이름을 모두 지운다.
fn commit_alarm(assets_dir: &Path, alarm: &Option<(AlarmFormat, Vec<u8>)>) -> std::io::Result<()> {
    let keep = alarm.as_ref().map(|(f, _)| *f);
    if let Some((fmt, bytes)) = alarm {
        write_atomic(&assets_dir.join(alarm_file_name(*fmt)), bytes)?;
    }
    for fmt in ALL_ALARM_FORMATS {
        if Some(fmt) != keep {
            remove_if_exists(&assets_dir.join(alarm_file_name(fmt)))?;
        }
    }
    Ok(())
}

/// 새 매니페스트 — 파일을 쓴 뒤에 만든다(url의 `?v=`가 새 수정 시각을 담도록).
fn build_manifest(assets_dir: &Path, images: &[(AssetSlot, Vec<u8>, PngInfo)]) -> AssetManifest {
    let entries = images
        .iter()
        .map(|(slot, bytes, info)| {
            let file_name = stored_file_name(slot);
            AssetEntry {
                slot: *slot,
                url: versioned_asset_url(&assets_dir.join(&file_name)),
                file_name,
                width: info.width,
                height: info.height,
                bytes: bytes.len() as u64,
            }
        })
        .collect();
    let mut manifest = AssetManifest {
        canvas: None,
        entries,
    };
    manifest.recompute_canvas();
    manifest
}

/// 새 PNG 전부 쓰기 → 옛에만 있던 PNG 삭제 → 알림음 → 매니페스트 저장.
fn commit_files(
    assets_dir: &Path,
    old: &AssetManifest,
    v: &ValidatedPreset,
) -> std::io::Result<AssetManifest> {
    for (slot, bytes, _) in &v.images {
        write_atomic(&assets_dir.join(stored_file_name(slot)), bytes)?;
    }
    for entry in &old.entries {
        let key = entry.slot.file_key();
        if !v.images.iter().any(|(s, _, _)| s.file_key() == key) {
            remove_if_exists(&assets_dir.join(stored_file_name(&entry.slot)))?;
        }
    }
    commit_alarm(assets_dir, &v.alarm)?;
    let manifest = build_manifest(assets_dir, &v.images);
    save_manifest(assets_dir, &manifest).map_err(asset_to_io)?;
    Ok(manifest)
}

/// 프리셋을 현재 상태로 통째 교체한다(PS-04). 실패하면 되돌리고, 되돌림까지 실패하면 `changed = true`.
/// 화면 반영은 core가 하지 않는다 — 반환한 매니페스트로 bridge가 emit한다.
pub fn apply(
    paths: &AppPaths,
    id: &str,
    settings: &Mutex<Settings>,
) -> Result<AppliedPreset, PresetError> {
    let dir = ensure_preset_dir(&paths.presets_dir(), id)?;
    let v = match load_dir(&dir)? {
        Loaded::Ok(v) => v,
        Loaded::Problems(problems) => {
            let file_name = problems.into_iter().next().map(|p| p.file_name);
            return Err(PresetError::Damaged {
                file_name: file_name.unwrap_or_default(),
            });
        }
    };
    fs::create_dir_all(&paths.assets_dir).map_err(PresetError::io)?;
    let old = load_manifest(&paths.assets_dir).map_err(|e| PresetError::io(asset_to_io(e)))?;
    let backup = FileBackup::capture(&paths.assets_dir, &backup_names(&old, &v))?;

    let manifest = commit_files(&paths.assets_dir, &old, &v).map_err(|source| {
        log::warn!("preset: 교체 실패 kind={:?}", source.kind());
        PresetError::Io {
            source,
            changed: !backup.restore(),
        }
    })?;
    update(settings, &paths.settings_file, |cur| {
        v.file.settings.merge_into(cur)
    })
    .map_err(|source| PresetError::Settings {
        source,
        changed: !backup.restore(),
    })?;
    Ok(AppliedPreset { manifest })
}
