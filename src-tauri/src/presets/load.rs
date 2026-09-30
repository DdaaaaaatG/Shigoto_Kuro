//! 프리셋 폴더 검증기 — 가져오기·적용 공용(PS-06·PS-04).
//!
//! [목적] `preset.json`에 적힌 그림·알림음만 하나씩 열어 규격을 검사한다. 파일마다 처음 걸린 문제 하나만
//!        기록하고 모든 파일을 끝까지 본다(U-2). 문제가 하나라도 있으면 `Loaded::Problems`.
//! [공개 API] 모듈 밖 공개 없음. `pub(super)`: `load_dir`·`Loaded`·`ValidatedPreset`·`CODE_FILE_MISSING`·
//!        `CODE_FILE_LINK`. 규격 규칙(`validate`·상한·캔버스)은 `assets`의 것을 그대로 부른다.
//! [스레드] 없음. 호출자 스레드에서 동기 실행.
//! [unsafe] 없음.
//! [에러] 폴더 수준(`read_preset_file`의 `NotPreset`·`Format`·`InvalidName`·`InvalidSettings`·`Io`)은 `Err`,
//!        파일별 문제는 `PresetProblem.code`로 모은다.
//! [설정] 없음.
//! [테스트] 통합 `tests/presets.rs`의 `import_*`·`apply_damaged_changes_nothing`.

use std::fs;
use std::io::ErrorKind;
use std::path::Path;

use super::format::{read_preset_file, PresetFile};
use super::scan::is_link_like_meta;
use super::{PresetError, PresetProblem};
use crate::assets::sound::{alarm_file_name, detect_format, AlarmFormat, ALARM_MAX_BYTES};
use crate::assets::{
    parse_png_header, read_capped, stored_file_name, validate, AssetError, AssetSlot, CanvasSize,
    PngInfo, SimpleSlot, ASSET_MAX_BYTES,
};

/// 문제 전용 code — 목록에 적힌 파일이 폴더에 없음.
pub(super) const CODE_FILE_MISSING: &str = "preset.file_missing";
/// 문제 전용 code — 링크·재분석 지점·일반 파일 아님.
pub(super) const CODE_FILE_LINK: &str = "preset.file_link";
const CODE_MISSING_REQUIRED: &str = "preset.missing_required";
const CODE_IO: &str = "preset.io";
const CODE_ASSET_TOO_BIG: &str = "asset.too_many_bytes";
const CODE_SOUND_TOO_BIG: &str = "sound.too_many_bytes";
const CODE_NOT_AUDIO: &str = "sound.not_audio";

/// 필수 슬롯(PS-08) — 없으면 `preset.missing_required`.
const REQUIRED: [SimpleSlot; 2] = [SimpleSlot::KbUp, SimpleSlot::MouseBase];

/// 검증을 통과한 프리셋 — 검증에 쓴 바이트를 그대로 들고 있다(검사와 복사 사이 경쟁 차단).
pub(super) struct ValidatedPreset {
    pub file: PresetFile,
    /// `file.images` 순서.
    pub images: Vec<(AssetSlot, Vec<u8>, PngInfo)>,
    pub alarm: Option<(AlarmFormat, Vec<u8>)>,
}

pub(super) enum Loaded {
    Ok(Box<ValidatedPreset>),
    // NOTE(설계 차이): 설계는 `Problems(PresetFile, Vec<PresetProblem>)`. 첫 필드는 어느 호출자도 읽지 않아
    // dead_code 경고(-D warnings)가 되므로 문제 목록만 둔다.
    Problems(Vec<PresetProblem>),
}

fn problem(file_name: &str, code: &'static str) -> PresetProblem {
    PresetProblem {
        file_name: file_name.to_string(),
        code,
    }
}

/// 링크 아닌 일반 파일의 길이. 없음·링크·일반 파일 아님·그 밖 IO는 문제 code로.
fn plain_file_len(path: &Path) -> Result<u64, &'static str> {
    let meta = match fs::symlink_metadata(path) {
        Ok(m) => m,
        Err(e) if e.kind() == ErrorKind::NotFound => return Err(CODE_FILE_MISSING),
        Err(_) => return Err(CODE_IO),
    };
    if is_link_like_meta(&meta) || !meta.is_file() {
        return Err(CODE_FILE_LINK);
    }
    Ok(meta.len())
}

/// 그림 한 장 검사 → (바이트, 헤더). `Err` = 문제 code.
fn check_image(
    dir: &Path,
    slot: &AssetSlot,
    group: Option<CanvasSize>,
) -> Result<(Vec<u8>, PngInfo), &'static str> {
    let path = dir.join(stored_file_name(slot));
    if plain_file_len(&path)? > ASSET_MAX_BYTES {
        return Err(CODE_ASSET_TOO_BIG);
    }
    let bytes = read_capped(&path, ASSET_MAX_BYTES).map_err(|e| match e {
        AssetError::TooManyBytes { .. } => CODE_ASSET_TOO_BIG,
        _ => CODE_IO,
    })?;
    let info = parse_png_header(&bytes).map_err(|e| e.code())?;
    validate(&info, bytes.len() as u64, slot, group).map_err(|e| e.code())?;
    Ok((bytes, info))
}

/// 알림음 검사 → 바이트. `Err` = 문제 code.
fn check_alarm(dir: &Path, fmt: AlarmFormat) -> Result<Vec<u8>, &'static str> {
    let path = dir.join(alarm_file_name(fmt));
    if plain_file_len(&path)? > ALARM_MAX_BYTES {
        return Err(CODE_SOUND_TOO_BIG);
    }
    let bytes = read_capped(&path, ALARM_MAX_BYTES).map_err(|e| match e {
        AssetError::TooManyBytes { .. } => CODE_SOUND_TOO_BIG,
        _ => CODE_IO,
    })?;
    if detect_format(&bytes) != Some(fmt) {
        return Err(CODE_NOT_AUDIO);
    }
    Ok(bytes)
}

/// 필수 슬롯이 목록에 없으면 없는 것마다 문제 1개.
fn missing_required(file: &PresetFile) -> Vec<PresetProblem> {
    REQUIRED
        .iter()
        .map(|s| AssetSlot::Simple(*s))
        .filter(|s| !file.images.iter().any(|i| i.file_key() == s.file_key()))
        .map(|s| problem(&stored_file_name(&s), CODE_MISSING_REQUIRED))
        .collect()
}

/// `dir`의 프리셋을 끝까지 검사한다. 경로는 `dir.join(PRESET_FILE)`·`dir.join(stored_file_name(slot))`·
/// `dir.join(alarm_file_name(fmt))` 세 가지만 만든다 — JSON 문자열이 경로 조각이 되는 곳이 없다.
pub(super) fn load_dir(dir: &Path) -> Result<Loaded, PresetError> {
    let file = read_preset_file(dir)?;
    let mut problems = missing_required(&file);
    // 이미 통과한 첫 캔버스 레이어의 크기 — 마우스 파츠·펜 그림은 항상 None(CR-036).
    let mut group: Option<CanvasSize> = None;
    let mut images = Vec::with_capacity(file.images.len());
    for slot in &file.images {
        let slot_group = slot.is_canvas_layer().then_some(group).flatten();
        match check_image(dir, slot, slot_group) {
            Ok((bytes, info)) => {
                if slot.is_canvas_layer() && group.is_none() {
                    group = Some(CanvasSize {
                        width: info.width,
                        height: info.height,
                    });
                }
                images.push((*slot, bytes, info));
            }
            Err(code) => problems.push(problem(&stored_file_name(slot), code)),
        }
    }
    let mut alarm = None;
    if let Some(fmt) = file.alarm {
        match check_alarm(dir, fmt) {
            Ok(bytes) => alarm = Some((fmt, bytes)),
            Err(code) => problems.push(problem(alarm_file_name(fmt), code)),
        }
    }
    if problems.is_empty() {
        Ok(Loaded::Ok(Box::new(ValidatedPreset {
            file,
            images,
            alarm,
        })))
    } else {
        Ok(Loaded::Problems(problems))
    }
}
