//! 프리셋(PS-01~PS-10) — 그림·알림음·설정(PS-02 필드) 한 벌을 `presets/{id}/` 폴더에 저장·적용·
//! 내보내기·가져오기·이름 바꾸기·삭제. 설계 `doc/200_설계/core/presets.md`.
//!
//! [목적] 지금의 그림·알림음·설정 4필드(배율·휴식 시간·`mouse`·`timer`)를 폴더에 복사해 두고 목록·적용·
//!        내보내기·가져오기·이름 바꾸기·삭제를 하는 단일 소유자. 적용은 「검증 → 백업 → 교체 → 설정 병합 →
//!        실패 시 되돌림」이며 설정 쓰기는 `settings::update` 하나만 쓴다. PC별 설정 5개는 건드리지 않는다.
//! [공개 API] `list`·`save`·`apply`·`export_to`·`import_from`·`rename`·`delete`, `PresetSummary`·
//!        `PresetPreview`·`PresetPreviewLayer`·`PresetProblem`·`PresetImportReport`·`PresetExportResult`·`AppliedPreset`, `PresetError`
//!        (`code()`·`may_have_changed()`), 상수 5개.
//! [형식] `preset.json`(formatVersion 1) + `{file_key}.png` + `alarm.{wav|mp3|ogg}`. 파일 이름은 슬롯·형식에서만
//!        만든다(JSON에 파일 이름 문자열 없음).
//! [보안] 사용자 문자열은 경로 조각이 되지 않는다(id는 규칙 검사, 이름은 내보내기 때만 정화). 링크·재분석
//!        지점 거부, 크기 선검사 후 상한 읽기(SEC-003 방식), 검증에 쓴 바이트를 그대로 쓴다. 에러 message·
//!        로그에 경로·OS 원문을 싣지 않는다.
//! [스레드] 없음. 호출자(동기 command, 메인 스레드) 스레드에서 실행 — 계약 §5.10 C-4 불변식.
//! [unsafe] 없음. 링크 판정은 `std::os::windows::fs::MetadataExt`(안전한 std API).
//! [에러] `PresetError::{NotFound, InvalidName, MissingRequired, NotPreset, Format, InvalidSettings, Damaged,
//!        BadDir, ExportExists, Io, Settings}`.
//! [설정] 읽기/쓰기 대상은 `Settings`의 `scale`·`idle_seconds`·`mouse`·`timer`뿐. `settings.json` 스키마 불변.
//! [테스트] 단위: 이 파일(에러 3개)·`format.rs`·`scan.rs`. 통합: `tests/presets.rs`·`tests/presets_apply.rs`.

use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::assets::AssetManifest;
use crate::settings::SettingsError;

mod apply;
mod format;
mod load;
mod preview;
mod scan;
mod write;

pub use apply::apply;
pub use preview::{PresetPreview, PresetPreviewLayer};
pub use scan::{delete, list, rename};
pub use write::{export_to, import_from, save};

use format::{is_valid_id, PresetFile};

/// 데이터 폴더 아래 프리셋 폴더 이름.
pub const PRESETS_DIR: &str = "presets";
/// 프리셋 폴더 안 메타·설정 파일.
pub const PRESET_FILE: &str = "preset.json";
/// `preset.json` 형식 번호.
pub const FORMAT_VERSION: u32 = 1;
/// TS `PRESET_NAME_MAX`와 1:1 (U-7).
pub const NAME_MAX_CHARS: usize = 50;
/// 프리셋 하나의 그림 수 상한(A-9).
pub const MAX_IMAGES: usize = 64;

/// 목록 카드 한 장. JSON {id, name, savedAt, imageCount, hasAlarm, preview}. `Point`(f64) 때문에 `Eq` 없음.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetSummary {
    pub id: String,
    pub name: String,
    pub saved_at: u64,
    pub image_count: u32,
    pub has_alarm: bool,
    /// 카드 미리보기 재료(PS-09 개정) — 목록 조회 순간 디스크에서 만든다(저장하지 않는다).
    pub preview: PresetPreview,
}

/// 가져오기 파일별 문제. code = 기존 asset.*·sound.* 또는 preset.file_missing·preset.file_link·
/// preset.missing_required·preset.io. file_name은 폴더 안 파일 이름만(경로 없음).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetProblem {
    pub file_name: String,
    pub code: &'static str,
}

/// 불변식: preset.is_some() ⇔ problems.is_empty().
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetImportReport {
    pub preset: Option<PresetSummary>,
    pub problems: Vec<PresetProblem>,
}

/// 내보낸 폴더 이름(경로 없음).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetExportResult {
    pub folder_name: String,
}

/// 적용 결과 — bridge 뒤처리가 이 매니페스트로 emit·리사이즈·손 기준점을 한다.
#[derive(Debug, Clone, PartialEq)]
pub struct AppliedPreset {
    pub manifest: AssetManifest,
}

/// 프리셋 에러. message에 경로·OS 원문을 넣지 않는다(`Io`는 `{0}` 없음 — `ResetError` 선례).
#[derive(Debug, thiserror::Error)]
pub enum PresetError {
    #[error("프리셋을 찾을 수 없습니다.")]
    NotFound,
    #[error("프리셋 이름은 1~50자여야 합니다.")]
    InvalidName,
    #[error("필수 그림(키보드 기본·팔)이 없어 프리셋을 만들 수 없습니다.")]
    MissingRequired,
    #[error("프리셋 폴더가 아닙니다(preset.json이 없습니다).")]
    NotPreset,
    #[error("프리셋 파일 형식이 올바르지 않습니다: {0}")]
    Format(String),
    #[error("프리셋의 설정값이 올바르지 않습니다: {0}")]
    InvalidSettings(String),
    #[error("저장된 프리셋이 손상되었습니다: {file_name}")]
    Damaged { file_name: String },
    #[error("폴더를 찾을 수 없습니다.")]
    BadDir,
    #[error("같은 이름의 폴더가 이미 있습니다.")]
    ExportExists,
    #[error("프리셋 파일을 읽거나 쓰지 못했습니다.")]
    Io {
        source: std::io::Error,
        changed: bool,
    },
    /// SettingsError 문구 그대로. transparent는 필드가 하나일 때만 쓸 수 있어 "{source}"로 같은 표시를 낸다(§11.1 Δ1).
    #[error("{source}")]
    Settings {
        source: SettingsError,
        changed: bool,
    },
}

impl PresetError {
    /// 프론트·계약이 보는 code. `Settings`는 `SettingsError::code()`를 그대로 위임한다.
    pub fn code(&self) -> &'static str {
        match self {
            Self::NotFound => "preset.not_found",
            Self::InvalidName => "preset.invalid_name",
            Self::MissingRequired => "preset.missing_required",
            Self::NotPreset => "preset.not_preset",
            Self::Format(_) => "preset.format",
            Self::InvalidSettings(_) => "preset.invalid_settings",
            Self::Damaged { .. } => "preset.damaged",
            Self::BadDir => "preset.bad_dir",
            Self::ExportExists => "preset.export_exists",
            Self::Io { .. } => "preset.io",
            Self::Settings { source, .. } => source.code(),
        }
    }

    /// 적용 중 되돌림까지 실패해 디스크·메모리가 바뀌었을 수 있음 — bridge가 디스크 재방출을 한다.
    pub fn may_have_changed(&self) -> bool {
        matches!(
            self,
            Self::Io { changed: true, .. } | Self::Settings { changed: true, .. }
        )
    }

    /// 되돌림 전(또는 되돌림 성공) IO 실패. 로그에는 `ErrorKind`만 남긴다(경로·OS 원문 금지).
    pub(super) fn io(source: std::io::Error) -> Self {
        log::warn!("preset: io 실패 kind={:?}", source.kind());
        Self::Io {
            source,
            changed: false,
        }
    }

    /// 원인이 없는 IO 실패(링크·일반 파일 아님 등).
    pub(super) fn io_other(reason: &str) -> Self {
        Self::io(std::io::Error::other(reason.to_string()))
    }
}

/// 목록 카드. `image_count`는 `images.len()`, `has_alarm`은 `alarm.is_some()`. `preset_dir`은 정규 id 폴더.
fn summary(preset_dir: &Path, id: &str, file: &PresetFile) -> PresetSummary {
    PresetSummary {
        id: id.to_string(),
        name: file.name.clone(),
        saved_at: file.saved_at,
        image_count: file.images.len() as u32,
        has_alarm: file.alarm.is_some(),
        preview: preview::preview(preset_dir, id, file),
    }
}

/// id 규칙 검사 → 링크 아닌 폴더 확인. 어긋나면 존재 여부를 흘리지 않고 `NotFound`.
fn ensure_preset_dir(presets_dir: &Path, id: &str) -> Result<PathBuf, PresetError> {
    if !is_valid_id(id) {
        return Err(PresetError::NotFound);
    }
    let dir = presets_dir.join(id);
    match scan::is_plain_dir(&dir) {
        Ok(true) => Ok(dir),
        Ok(false) => Err(PresetError::NotFound),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Err(PresetError::NotFound),
        Err(e) => Err(PresetError::io(e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn all_variants(io_err: std::io::Error) -> Vec<PresetError> {
        vec![
            PresetError::NotFound,
            PresetError::InvalidName,
            PresetError::MissingRequired,
            PresetError::NotPreset,
            PresetError::Format("사유".into()),
            PresetError::InvalidSettings("사유".into()),
            PresetError::Damaged {
                file_name: "kb_up.png".into(),
            },
            PresetError::BadDir,
            PresetError::ExportExists,
            PresetError::Io {
                source: io_err,
                changed: false,
            },
            PresetError::Settings {
                source: SettingsError::StatePoisoned,
                changed: false,
            },
        ]
    }

    #[test]
    fn preset_error_codes() {
        let codes: Vec<&str> = all_variants(std::io::Error::other("x"))
            .iter()
            .map(PresetError::code)
            .collect();
        assert_eq!(
            codes,
            [
                "preset.not_found",
                "preset.invalid_name",
                "preset.missing_required",
                "preset.not_preset",
                "preset.format",
                "preset.invalid_settings",
                "preset.damaged",
                "preset.bad_dir",
                "preset.export_exists",
                "preset.io",
                "state.poisoned",
            ]
        );
        assert_eq!(load::CODE_FILE_MISSING, "preset.file_missing");
        assert_eq!(load::CODE_FILE_LINK, "preset.file_link");
        assert!(!codes.contains(&"preset.forbidden"));
    }

    #[test]
    fn messages_have_no_path() {
        let dir = tempfile::tempdir().expect("tempdir");
        let secret = dir.path().to_string_lossy().to_string();
        let io_err = std::io::Error::other(format!("실패: {secret}"));
        for e in all_variants(io_err) {
            let msg = e.to_string();
            assert!(!msg.contains(&secret), "{msg}");
            assert!(!msg.contains('\\'), "{msg}");
            assert!(!msg.contains(":/") && !msg.contains(":\\"), "{msg}");
        }
    }

    #[test]
    fn may_have_changed_only_when_rollback_failed() {
        let io = |changed| PresetError::Io {
            source: std::io::Error::other("x"),
            changed,
        };
        let st = |changed| PresetError::Settings {
            source: SettingsError::StatePoisoned,
            changed,
        };
        assert!(io(true).may_have_changed());
        assert!(st(true).may_have_changed());
        assert!(!io(false).may_have_changed());
        assert!(!st(false).may_have_changed());
        assert!(!PresetError::NotFound.may_have_changed());
    }
}
