//! 프리셋 목록·이름 바꾸기·삭제와 폴더 조사 도우미(PS-01·PS-07·PS-09).
//!
//! [목적] `list`(최근 저장이 위, U-4)·`rename`·`delete`, 임시 폴더 정리(`cleanup_leftovers`), 링크 판정.
//! [공개 API] `list`·`rename`·`delete`(mod.rs가 재노출). 나머지는 `pub(super)`: `is_link_like`·
//!        `is_plain_dir`·`is_plain_file`·`check_presets_dir`·`cleanup_leftovers`.
//! [스레드] 없음. 호출자 스레드에서 동기 실행.
//! [unsafe] 없음. `MetadataExt::file_attributes()`는 안전한 std API다(Windows 전용 앱).
//! [에러] `PresetError::{NotFound, InvalidName, NotPreset, Format, InvalidSettings, Io}`.
//! [설정] 없음.
//! [테스트] 이 파일 `#[cfg(test)]`(`is_link_like_table`). 통합은 `tests/presets.rs`.

use std::fs;
use std::io::ErrorKind;
use std::os::windows::fs::MetadataExt;
use std::path::Path;

use super::format::{
    is_valid_id, normalize_name, read_preset_file, write_preset_file, STAGING_PREFIX, TRASH_PREFIX,
};
use super::{ensure_preset_dir, summary, PresetError, PresetSummary};

/// Windows FILE_ATTRIBUTE_REPARSE_POINT — data_reset::wipe와 같은 값.
const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;

/// data_reset::wipe::is_link_like와 같은 식. 모듈 간 비공개 공유 대신 여기 작은 순수 함수를 둔다.
pub(super) fn is_link_like(is_symlink: bool, file_attributes: u32) -> bool {
    is_symlink || file_attributes & FILE_ATTRIBUTE_REPARSE_POINT != 0
}

/// 이미 얻은 `symlink_metadata`가 링크·재분석 지점인가.
pub(super) fn is_link_like_meta(meta: &fs::Metadata) -> bool {
    is_link_like(meta.file_type().is_symlink(), meta.file_attributes())
}

/// `symlink_metadata` 기준 링크 아닌 폴더. NotFound는 호출자가 구분할 수 있게 `io::Result`.
pub(super) fn is_plain_dir(path: &Path) -> std::io::Result<bool> {
    let meta = fs::symlink_metadata(path)?;
    Ok(meta.is_dir() && !is_link_like_meta(&meta))
}

/// `symlink_metadata` 기준 링크 아닌 일반 파일.
pub(super) fn is_plain_file(path: &Path) -> std::io::Result<bool> {
    let meta = fs::symlink_metadata(path)?;
    Ok(meta.is_file() && !is_link_like_meta(&meta))
}

/// `presets/`가 없으면 만들고, 있는데 링크·재분석 지점·폴더 아님이면 `Io`.
pub(super) fn check_presets_dir(presets_dir: &Path) -> Result<(), PresetError> {
    match is_plain_dir(presets_dir) {
        Ok(true) => Ok(()),
        Ok(false) => Err(PresetError::io_other(
            "presets가 링크이거나 폴더가 아닙니다",
        )),
        Err(e) if e.kind() == ErrorKind::NotFound => {
            fs::create_dir_all(presets_dir).map_err(PresetError::io)
        }
        Err(e) => Err(PresetError::io(e)),
    }
}

/// `presets_dir` 바로 아래 `.staging-`·`.trash-` 접두의 링크 아닌 폴더를 지운다(최선, 실패는 경고만).
/// 저장·가져오기·삭제 시작 때 부른다. `list`에서는 부르지 않는다.
pub(super) fn cleanup_leftovers(presets_dir: &Path) {
    let Ok(entries) = fs::read_dir(presets_dir) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let Some(name) = name.to_str() else { continue };
        if !(name.starts_with(STAGING_PREFIX) || name.starts_with(TRASH_PREFIX)) {
            continue;
        }
        let path = entry.path();
        if !matches!(is_plain_dir(&path), Ok(true)) {
            continue;
        }
        if let Err(e) = fs::remove_dir_all(&path) {
            log::warn!("preset: 임시 폴더 정리 실패 kind={:?}", e.kind());
        }
    }
}

/// 프리셋 목록. `saved_at` 내림차순, 같으면 id 내림차순. 폴더가 없으면 빈 목록.
/// 손상·링크·임시 폴더는 건너뛴다. 파일(PNG·알림음) 검사와 부수 효과는 없다.
pub fn list(presets_dir: &Path) -> Result<Vec<PresetSummary>, PresetError> {
    let entries = match fs::read_dir(presets_dir) {
        Ok(e) => e,
        Err(e) if e.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(e) => return Err(PresetError::io(e)),
    };
    let mut out = Vec::new();
    for entry in entries.flatten() {
        let Ok(id) = entry.file_name().into_string() else {
            continue;
        };
        if !is_valid_id(&id) || !matches!(is_plain_dir(&entry.path()), Ok(true)) {
            continue;
        }
        match read_preset_file(&entry.path()) {
            Ok(file) => out.push(summary(&id, &file)),
            Err(e) => log::warn!("preset: 건너뜀 id={id} code={}", e.code()),
        }
    }
    out.sort_by(|a, b| b.saved_at.cmp(&a.saved_at).then_with(|| b.id.cmp(&a.id)));
    Ok(out)
}

/// 이름 바꾸기(PS-07). id·`savedAt`은 바뀌지 않는다.
pub fn rename(presets_dir: &Path, id: &str, name: &str) -> Result<PresetSummary, PresetError> {
    let dir = ensure_preset_dir(presets_dir, id)?;
    let name = normalize_name(name)?;
    let mut file = read_preset_file(&dir)?;
    file.name = name;
    write_preset_file(&dir, &file)?;
    Ok(summary(id, &file))
}

/// 삭제(PS-07). `.trash-{id}`로 옮겨 목록에서 즉시 없애고, 지우기 실패는 경고만(다음에 정리).
pub fn delete(presets_dir: &Path, id: &str) -> Result<(), PresetError> {
    let dir = ensure_preset_dir(presets_dir, id)?;
    cleanup_leftovers(presets_dir);
    let trash = presets_dir.join(format!("{TRASH_PREFIX}{id}"));
    fs::rename(&dir, &trash).map_err(PresetError::io)?;
    if let Err(e) = fs::remove_dir_all(&trash) {
        log::warn!("preset: 삭제 대기 폴더 정리 실패 kind={:?}", e.kind());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_link_like_table() {
        assert!(is_link_like(true, 0x10));
        assert!(is_link_like(false, FILE_ATTRIBUTE_REPARSE_POINT));
        assert!(is_link_like(true, FILE_ATTRIBUTE_REPARSE_POINT));
        assert!(is_link_like(false, 0x10 | FILE_ATTRIBUTE_REPARSE_POINT));
        assert!(!is_link_like(false, 0));
        assert!(!is_link_like(false, 0x10));
    }
}
