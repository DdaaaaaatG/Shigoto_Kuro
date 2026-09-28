//! 삭제 화이트리스트(R-A4, D-4) + 시작 폴더 링크 검사(R-A4 보강, SEC-001).
//!
//! [목적] 데이터 폴더 안의 정해진 파일만 지운다. 하위 폴더·심볼릭 링크·모르는 파일은 건드리지 않는다.
//!        시작 폴더(`data_dir`·`assets_dir`) 자체가 링크·재분석 지점이면 아무것도 지우지 않는다.
//! [공개 API] `pub(super) fn wipe(paths: &AppPaths) -> std::io::Result<usize>`,
//!        `pub(super) fn check_start_dirs(paths: &AppPaths) -> std::io::Result<()>`.
//! [스레드] 없음. 호출자 스레드에서 동기 실행.
//! [unsafe] 없음. `std::os::windows::fs::MetadataExt::file_attributes()`는 안전한 std API다.
//! [에러] `std::io::Error` — 하나라도 지우지 못하면 즉시 반환한다(이미 지운 것은 되돌리지 않는다).
//! [설정] 없음.
//! [테스트] 단위(이 파일 `#[cfg(test)] mod tests`): link_like_table·assets_target_uses_real_extension·
//!        data_target_keeps_attempts_body·not_found_is_skipped. 통합은 `tests/data_reset.rs`(설계 §8.2).

use std::fs;
use std::os::windows::fs::MetadataExt; // file_attributes() — Windows 전용 앱(확정사항 §1)
use std::path::Path;

use crate::AppPaths;

/// Windows `FILE_ATTRIBUTE_REPARSE_POINT` — 심볼릭 링크·정션·마운트 지점 등 재분석 지점 전부.
const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;

/// 지운 파일 수. 하위 폴더에 들어가지 않고, 링크를 따라가지 않는다.
pub(super) fn wipe(paths: &AppPaths) -> std::io::Result<usize> {
    let assets_removed = remove_matching(&paths.assets_dir, is_assets_target)?;
    let data_removed = remove_matching(&paths.data_dir, is_data_target)?;
    Ok(assets_removed + data_removed)
}

/// ⓪ `data_dir` → `assets_dir` 순서로 자기 자신을 `symlink_metadata`(링크를 따라가지 않음)로 본다.
/// 없으면(NotFound) 통과 — 기존 동작(`read_dir` NotFound = 지울 것 없음) 유지. 경로를 에러에 넣지 않는다.
pub(super) fn check_start_dirs(paths: &AppPaths) -> std::io::Result<()> {
    for dir in [&paths.data_dir, &paths.assets_dir] {
        let meta = match fs::symlink_metadata(dir) {
            Ok(m) => m,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => continue,
            Err(e) => return Err(e),
        };
        if is_link_like(meta.file_type().is_symlink(), meta.file_attributes()) {
            return Err(std::io::Error::other(
                "data-reset: 시작 폴더가 링크·재분석 지점",
            ));
        }
    }
    Ok(())
}

/// 순수 판정(단위 테스트 대상). 링크이거나 재분석 지점 속성이 있으면 true.
fn is_link_like(is_symlink: bool, file_attributes: u32) -> bool {
    is_symlink || file_attributes & FILE_ATTRIBUTE_REPARSE_POINT != 0
}

/// `paths.assets_dir` 바로 아래 대상(CORE-004): 이름 manifest.json, 또는 실제 확장자
/// png·tmp·wav·mp3·ogg. `Path::new("png").extension() == None`이라 확장자 없는 "png"·"tmp"는
/// 대상이 아니다.
fn is_assets_target(name: &str) -> bool {
    if name.eq_ignore_ascii_case("manifest.json") {
        return true;
    }
    Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .is_some_and(|ext| {
            matches!(
                ext.to_ascii_lowercase().as_str(),
                "png" | "tmp" | "wav" | "mp3" | "ogg"
            )
        })
}

/// `paths.data_dir` 바로 아래: 아래 접두어로 시작하고 `.tmp`로 끝나는 잔여 임시 파일만(본체 제외).
fn is_data_target(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.ends_with(".tmp")
        && [
            "settings.json",
            super::MARKER_FILE,
            super::attempts::ATTEMPTS_FILE,
        ]
        .iter()
        .any(|p| lower.starts_with(p))
}

/// CORE-003: 항목이 그 사이 사라졌으면(NotFound) `None`, 그 밖의 오류는 그대로.
/// 예: 다른 스레드의 settings 저장이 `settings.json.{pid}-{seq}.tmp`를 rename으로 치운 직후.
fn skip_not_found<T>(r: std::io::Result<T>) -> std::io::Result<Option<T>> {
    match r {
        Ok(v) => Ok(Some(v)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e),
    }
}

/// 폴더 바로 아래 일반 파일 중 `is_target`을 만족하는 것만 지운다. 폴더가 없으면 `Ok(0)`.
fn remove_matching(dir: &Path, is_target: fn(&str) -> bool) -> std::io::Result<usize> {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(0),
        Err(e) => return Err(e),
    };
    let mut removed = 0;
    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        // 링크를 따라가는 metadata를 쓰지 않는다 — symlink_metadata로 실제 종류를 본다.
        // CORE-003: 그 사이 사라졌으면(NotFound) 건너뛴다.
        let Some(meta) = skip_not_found(fs::symlink_metadata(&path))? else {
            continue;
        };
        if !meta.file_type().is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        if is_target(name) && skip_not_found(fs::remove_file(&path))?.is_some() {
            removed += 1;
        }
    }
    Ok(removed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn link_like_table() {
        assert!(!is_link_like(false, 0x10)); // 일반 폴더
        assert!(!is_link_like(false, 0x20)); // 일반 파일(ARCHIVE)
        assert!(is_link_like(true, 0x10)); // is_symlink=true
        assert!(is_link_like(false, FILE_ATTRIBUTE_REPARSE_POINT)); // 재분석 지점만
        assert!(is_link_like(false, 0x10 | FILE_ATTRIBUTE_REPARSE_POINT)); // 폴더+재분석
        assert!(is_link_like(true, FILE_ATTRIBUTE_REPARSE_POINT)); // 둘 다
    }

    #[test]
    fn assets_target_uses_real_extension() {
        for name in [
            "a.png",
            "B.PNG",
            "kb_up.png.123-1.tmp",
            "alarm.WAV",
            "x.mp3",
            "y.ogg",
            "manifest.json",
            "MANIFEST.JSON",
        ] {
            assert!(is_assets_target(name), "대상이어야 함: {name}");
        }
        for name in [
            "png",
            "tmp",
            "wav",
            ".png",
            "keep_me.txt",
            "png.txt",
            "manifest.json.bak",
        ] {
            assert!(!is_assets_target(name), "대상이 아니어야 함: {name}");
        }
    }

    #[test]
    fn data_target_keeps_attempts_body() {
        for name in [
            "settings.json.1-1.tmp",
            "data-generation.json.1-1.tmp",
            "data-reset-attempts.json.1-1.tmp",
        ] {
            assert!(is_data_target(name), "대상이어야 함: {name}");
        }
        for name in [
            "settings.json",
            "data-generation.json",
            "data-reset-attempts.json",
            "other.tmp",
            "EBWebView",
        ] {
            assert!(!is_data_target(name), "대상이 아니어야 함: {name}");
        }
    }

    #[test]
    fn not_found_is_skipped() {
        assert_eq!(skip_not_found(Ok(1)).unwrap(), Some(1));
        assert_eq!(
            skip_not_found::<()>(Err(std::io::Error::from(std::io::ErrorKind::NotFound))).unwrap(),
            None
        );
        let err = skip_not_found::<()>(Err(std::io::Error::from(
            std::io::ErrorKind::PermissionDenied,
        )));
        assert_eq!(
            err.unwrap_err().kind(),
            std::io::ErrorKind::PermissionDenied
        );
    }
}
