//! 내장 프리셋 2개 시딩(PS-11, 0.5.0).
//!
//! [목적] exe에 프리셋 2개(①「세바시에-기본」·②「게님드림」)를 담고, 앱 시작 때 `presets/`가 **없을 때만**
//!        형제 임시 폴더 `.presets-seed`에 두 프리셋을 다 써서 검증한 뒤 rename 한 번으로 `presets/`를 만든다.
//!        폴더가 있으면(비어도·링크여도) 아무것도 하지 않는다. 시딩된 폴더는 일반 프리셋과 구별하지 않는다.
//! [공개 API] `seed_builtin`·`SeedOutcome`·`SeedSkip`(mod.rs 재노출). `builtin_presets`·`BuiltinPreset`은
//!        `pub(super)`.
//! [스레드] 없음. setup(메인 스레드)에서 1회 동기 실행.
//! [unsafe] 없음.
//! [에러] `PresetError::Io`(메타데이터 읽기·임시 폴더 준비·최종 rename 실패). 프리셋 하나의 실패는
//!        `Ok(Seeded{failed})`에 (id, code)로 담고 나머지를 계속한다.
//! [설정] 없음. `preset.json` 원문을 그대로 쓴다(재직렬화 없음).
//! [테스트] 이 파일 `#[cfg(test)]`(형식·id·원본 바이트 대조), 통합 `tests/presets_builtin.rs`.

use std::fs;
use std::io::ErrorKind;
use std::path::Path;

use super::load::{load_dir, Loaded};
use super::scan::is_plain_dir;
use super::{PresetError, PRESET_FILE};
use crate::assets::defaults::DEFAULT_ASSETS;
use crate::assets::sound::{alarm_file_name, AlarmFormat};
use crate::assets::stored_file_name;

/// 형제 임시 폴더 이름(데이터 폴더 바로 아래). 시딩 도중 끊기면 다음 시작에 치운다.
const SEED_STAGING: &str = ".presets-seed";

/// 내장 프리셋 파일 하나: (폴더 안 파일 이름, 바이트). 바이트는 exe 정적 영역(힙 복사 없음).
type BuiltinFile = (String, &'static [u8]);

/// 내장 프리셋 한 벌.
pub(super) struct BuiltinPreset {
    /// 폴더 이름. `is_valid_id` 통과.
    pub id: &'static str,
    /// preset.json 원문(doc/assets/presets/{n}/preset.json). 재직렬화하지 않고 그대로 쓴다.
    pub json: &'static [u8],
    /// PNG + 알림음. preset.json의 images·alarm에서 만든 파일 이름 집합과 같다.
    pub files: Vec<BuiltinFile>,
}

// C-7: doc/assets/presets/1/alarm.mp3 사용(ui 기본음 `src/assets/sounds/default-alarm.mp3`와 분리 —
// 내장 프리셋은 「그때 모습 그대로」). ①·② 공용 — static이라 exe에 1벌.
static BUILTIN_ALARM_MP3: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../doc/assets/presets/1/alarm.mp3"
));

static PRESET1_JSON: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../doc/assets/presets/1/preset.json"
));
static PRESET2_JSON: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../doc/assets/presets/2/preset.json"
));

/// ② 신규 그림(doc/assets/presets/2/). defaults.rs `default_png!`와 같은 모양.
macro_rules! preset2_png {
    ($name:literal) => {
        include_bytes!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../doc/assets/presets/2/",
            $name
        ))
    };
}

/// `DEFAULT_ASSETS`에서 file_key가 같은 항목의 바이트. 없으면 `None`(패닉 금지 — 검증이 그 프리셋만 실패시킨다).
fn defaults_bytes(file_key: &str) -> Option<&'static [u8]> {
    DEFAULT_ASSETS
        .iter()
        .find(|d| d.slot.file_key() == file_key)
        .map(|d| d.bytes)
}

fn alarm_entry() -> BuiltinFile {
    (
        alarm_file_name(AlarmFormat::Mp3).to_string(),
        BUILTIN_ALARM_MP3,
    )
}

/// 내장 프리셋 표. 함수인 이유: ①의 PNG를 `DEFAULT_ASSETS`에서 빌려 쓰기 위해서다(D-P9).
/// 순서 = 시딩 순서(builtin-1 → builtin-2).
pub(super) fn builtin_presets() -> [BuiltinPreset; 2] {
    let mut files1: Vec<BuiltinFile> = DEFAULT_ASSETS
        .iter()
        .map(|d| (stored_file_name(&d.slot), d.bytes))
        .collect();
    files1.push(alarm_entry());

    let mut files2: Vec<BuiltinFile> = Vec::new();
    if let Some(bytes) = defaults_bytes("background") {
        files2.push(("background.png".to_string(), bytes));
    }
    let own: [(&str, &'static [u8]); 6] = [
        ("hair.png", preset2_png!("hair.png")),
        ("kb_up.png", preset2_png!("kb_up.png")),
        ("mouse_base.png", preset2_png!("mouse_base.png")),
        ("pen_down_0.png", preset2_png!("pen_down_0.png")),
        ("pen_up.png", preset2_png!("pen_up.png")),
        ("pomo_char.png", preset2_png!("pomo_char.png")),
    ];
    files2.extend(own.iter().map(|(n, b)| (n.to_string(), *b)));
    files2.push(alarm_entry());

    [
        BuiltinPreset {
            id: "builtin-1",
            json: PRESET1_JSON,
            files: files1,
        },
        BuiltinPreset {
            id: "builtin-2",
            json: PRESET2_JSON,
            files: files2,
        },
    ]
}

/// 시딩을 건너뛴 사유.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SeedSkip {
    /// presets_dir 이름의 무엇이든(폴더·빈 폴더·파일·링크) 이미 있다 — 건드리지 않는다.
    Exists,
}

/// 시딩 결과.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SeedOutcome {
    /// count = 등록한 프리셋 수, failed = (id, code) — code는 `PresetProblem.code` 또는 `PresetError::code()`.
    Seeded {
        count: usize,
        failed: Vec<(&'static str, &'static str)>,
    },
    Skipped(SeedSkip),
}

/// 임시 폴더를 비운 채로 만든다. 지난 시딩 잔재(링크 아닌 폴더)는 지우고, 링크·파일이면 따라가지 않고 실패한다.
fn prepare_staging(staging: &Path) -> Result<(), PresetError> {
    match is_plain_dir(staging) {
        Ok(true) => fs::remove_dir_all(staging).map_err(PresetError::io)?,
        Ok(false) => {
            return Err(PresetError::io_other(
                "시딩 임시 이름이 폴더가 아니거나 링크입니다",
            ))
        }
        Err(e) if e.kind() == ErrorKind::NotFound => {}
        Err(e) => return Err(PresetError::io(e)),
    }
    fs::create_dir(staging).map_err(PresetError::io)
}

/// 프리셋 하나를 쓰고 디스크에서 다시 읽어 검증한다. `Err` = code.
fn write_one(staging: &Path, p: &BuiltinPreset) -> Result<(), &'static str> {
    let dir = staging.join(p.id);
    fs::create_dir(&dir).map_err(|e| PresetError::io(e).code())?;
    for (name, bytes) in &p.files {
        fs::write(dir.join(name), bytes).map_err(|e| PresetError::io(e).code())?;
    }
    fs::write(dir.join(PRESET_FILE), p.json).map_err(|e| PresetError::io(e).code())?;
    match load_dir(&dir) {
        Ok(Loaded::Ok(_)) => Ok(()),
        Ok(Loaded::Problems(problems)) => Err(problems.first().map_or("preset.io", |x| x.code)),
        Err(e) => Err(e.code()),
    }
}

fn remove_best_effort(path: &Path) {
    if let Err(e) = fs::remove_dir_all(path) {
        log::warn!("preset: 시딩 임시 폴더 정리 실패 kind={:?}", e.kind());
    }
}

/// `presets_dir`가 없을 때만 내장 프리셋을 쓴다(PS-11). 프리셋 하나의 실패는 `Ok(Seeded{failed})`로 보고하고
/// 나머지를 계속한다. 하나도 못 만들면 `presets/`를 만들지 않는다(다음 시작에 다시 시도).
pub fn seed_builtin(presets_dir: &Path) -> Result<SeedOutcome, PresetError> {
    match fs::symlink_metadata(presets_dir) {
        Ok(_) => return Ok(SeedOutcome::Skipped(SeedSkip::Exists)),
        Err(e) if e.kind() == ErrorKind::NotFound => {}
        Err(e) => return Err(PresetError::io(e)),
    }
    let staging = presets_dir.with_file_name(SEED_STAGING);
    prepare_staging(&staging)?;
    let mut count = 0;
    let mut failed = Vec::new();
    for p in builtin_presets() {
        match write_one(&staging, &p) {
            Ok(()) => count += 1,
            Err(code) => {
                log::warn!("preset: 내장 프리셋 시딩 실패 id={} code={code}", p.id);
                remove_best_effort(&staging.join(p.id));
                failed.push((p.id, code));
            }
        }
    }
    if count == 0 {
        remove_best_effort(&staging);
        return Ok(SeedOutcome::Seeded { count, failed });
    }
    if let Err(e) = fs::rename(&staging, presets_dir) {
        remove_best_effort(&staging);
        return Err(PresetError::io(e));
    }
    Ok(SeedOutcome::Seeded { count, failed })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::presets::format::{is_valid_id, parse_preset};

    fn expected_names(json: &[u8]) -> Vec<String> {
        let text = std::str::from_utf8(json).expect("utf8");
        let file = parse_preset(text).expect("parse");
        let mut names: Vec<String> = file.images.iter().map(stored_file_name).collect();
        names.extend(file.alarm.map(|f| alarm_file_name(f).to_string()));
        names.sort();
        names
    }

    #[test]
    fn builtin_presets_parse_and_validate() {
        for p in builtin_presets() {
            let mut have: Vec<String> = p.files.iter().map(|(n, _)| n.clone()).collect();
            have.sort();
            assert_eq!(have, expected_names(p.json), "{}", p.id);
        }
        let dir = tempfile::tempdir().expect("tmp");
        let outcome = seed_builtin(&dir.path().join("presets")).expect("seed");
        assert_eq!(
            outcome,
            SeedOutcome::Seeded {
                count: 2,
                failed: vec![]
            }
        );
    }

    #[test]
    fn seed_ids_valid() {
        let presets = builtin_presets();
        let ids: Vec<&str> = presets.iter().map(|p| p.id).collect();
        assert_eq!(ids, ["builtin-1", "builtin-2"]);
        assert!(ids.iter().all(|id| is_valid_id(id) && !id.starts_with('.')));
        let saved = |p: &BuiltinPreset| {
            parse_preset(std::str::from_utf8(p.json).expect("utf8"))
                .expect("parse")
                .saved_at
        };
        assert!(saved(&presets[0]) < saved(&presets[1]));
    }

    #[test]
    fn builtin_bytes_match_source_folder() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../doc/assets/presets");
        for (n, p) in builtin_presets().iter().enumerate() {
            let src = root.join((n + 1).to_string());
            assert_eq!(fs::read(src.join(PRESET_FILE)).expect("json"), p.json);
            for (name, bytes) in &p.files {
                let want = fs::read(src.join(name)).expect("source file");
                assert!(want == *bytes, "{} {name}", p.id);
            }
        }
    }
}
