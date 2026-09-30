//! `preset.json` 형식·이름·id·내보내기 폴더 이름(PS-02·PS-06·PS-07).
//!
//! [목적] `PresetFile`·`PresetSettings`(PS-02 4필드) 직렬화·읽기 보정·검사, 이름 규칙(U-7), id 규칙(A-3)과
//!        자리 선점(`claim_staging`), 내보내기 폴더 이름 정화(PS-05).
//! [공개 API] 모듈 밖 공개 없음. `pub(super)` 항목만: `PresetFile`·`PresetSettings`·`read_preset_file`·
//!        `write_preset_file`·`normalize_name`·`is_valid_id`·`claim_staging`·`export_folder_name`.
//! [스레드] 없음. 호출자 스레드에서 동기 실행.
//! [unsafe] 없음.
//! [에러] `PresetError::{NotPreset, Format, InvalidName, InvalidSettings, Io}`. `Format` 사유는 고정 문구.
//! [설정] `PresetSettings`가 `Settings`의 PS-02 필드(`scale`·`idle_seconds`·`mouse`·`timer`)만 담는다.
//! [테스트] 이 파일 `#[cfg(test)]` — 설계 §8.1 `format.rs` 13개.

use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::scan::is_plain_file;
use super::{PresetError, FORMAT_VERSION, MAX_IMAGES, NAME_MAX_CHARS, PRESET_FILE};
use crate::assets::sound::AlarmFormat;
use crate::assets::AssetSlot;
use crate::settings::{
    read_capped_string, timer, write_atomic, MouseSettings, Settings, TimerSettings,
    IDLE_SECONDS_MAX, IDLE_SECONDS_MIN, MAX_TEXT_FILE_BYTES,
};

/// 저장·가져오기 도중 임시 폴더 접두(점으로 시작 — id 규칙에 안 맞아 목록이 건너뛴다).
pub(super) const STAGING_PREFIX: &str = ".staging-";
/// 삭제 도중 임시 폴더 접두(같음).
pub(super) const TRASH_PREFIX: &str = ".trash-";
/// id 최대 길이(바이트).
const ID_MAX_LEN: usize = 40;
/// `claim_staging`이 `{now}-{n}` 후보를 시도하는 상한.
const CLAIM_MAX_SUFFIX: u32 = 999;

const FORMAT_JSON: &str = "JSON을 읽을 수 없습니다";
const FORMAT_TOO_BIG: &str = "파일이 너무 큽니다";
const FORMAT_VERSION_BAD: &str = "지원하지 않는 형식 버전입니다";
const FORMAT_DUPLICATE: &str = "같은 그림이 두 번 들어 있습니다";
const FORMAT_TOO_MANY: &str = "그림이 너무 많습니다";

/// `preset.json` 전체. id는 넣지 않는다(폴더 이름이 id).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct PresetFile {
    pub format_version: u32,
    pub name: String,
    /// Unix ms.
    pub saved_at: u64,
    /// 순서 = 저장 때 매니페스트 순서.
    pub images: Vec<AssetSlot>,
    pub alarm: Option<AlarmFormat>,
    #[serde(default)]
    pub settings: PresetSettings,
}

/// PS-02 필드만. 컨테이너 default = `Settings::default()`의 같은 필드 값.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(super) struct PresetSettings {
    pub scale: f64,
    pub idle_seconds: u32,
    pub mouse: Option<MouseSettings>,
    pub timer: TimerSettings,
}

impl Default for PresetSettings {
    fn default() -> Self {
        Self::from_settings(&Settings::default())
    }
}

impl PresetSettings {
    /// PS-02/PS-03 분류 가드 — `Settings`를 **구조 분해**로 읽는다. `Settings`에 필드가 늘면 컴파일이 깨져
    /// 분류를 강제한다(02-design §5).
    pub fn from_settings(s: &Settings) -> Self {
        let Settings {
            scale,
            idle_seconds,
            overlay: _,
            mouse,
            autostart: _,
            language: _,
            position_lock: _,
            show_in_taskbar: _,
            timer,
        } = s;
        Self {
            scale: *scale,
            idle_seconds: *idle_seconds,
            mouse: mouse.clone(),
            timer: timer.clone(),
        }
    }

    /// PS-02 4필드만 대입(PS-03 5필드 유지). `settings::update` 클로저 안에서 부른다 — 순수 대입만.
    pub fn merge_into(&self, cur: &mut Settings) {
        cur.scale = self.scale;
        cur.idle_seconds = self.idle_seconds;
        cur.mouse = self.mouse.clone();
        cur.timer = self.timer.clone();
    }

    /// 읽기 보정(`settings::load`와 같은 규칙): idle_seconds clamp, `timer::normalize`.
    pub fn normalized(self) -> Self {
        Self {
            idle_seconds: self.idle_seconds.clamp(IDLE_SECONDS_MIN, IDLE_SECONDS_MAX),
            timer: timer::normalize(self.timer),
            ..self
        }
    }

    /// `Settings { 4필드, ..Settings::default() }.validate()` — 실패는 `InvalidSettings`.
    pub fn validate(&self) -> Result<(), PresetError> {
        let full = Settings {
            scale: self.scale,
            idle_seconds: self.idle_seconds,
            mouse: self.mouse.clone(),
            timer: self.timer.clone(),
            ..Settings::default()
        };
        full.validate()
            .map_err(|e| PresetError::InvalidSettings(e.to_string()))
    }
}

fn format_err(reason: &str) -> PresetError {
    PresetError::Format(reason.to_string())
}

/// JSON 문자열 → 검사된 `PresetFile`(형식 버전·중복·개수·이름·설정). 파일 검사는 하지 않는다.
fn parse_preset(text: &str) -> Result<PresetFile, PresetError> {
    let mut file: PresetFile = serde_json::from_str(text).map_err(|_| format_err(FORMAT_JSON))?;
    if file.format_version != FORMAT_VERSION {
        return Err(format_err(FORMAT_VERSION_BAD));
    }
    if file.images.len() > MAX_IMAGES {
        return Err(format_err(FORMAT_TOO_MANY));
    }
    let mut keys: Vec<String> = file.images.iter().map(AssetSlot::file_key).collect();
    keys.sort();
    if keys.windows(2).any(|w| w[0] == w[1]) {
        return Err(format_err(FORMAT_DUPLICATE));
    }
    file.name = normalize_name(&file.name)?;
    file.settings = file.settings.normalized();
    file.settings.validate()?;
    Ok(file)
}

/// `dir/preset.json` 읽기·검사. 파일 검사(PNG·알림음)는 하지 않는다.
pub(super) fn read_preset_file(dir: &Path) -> Result<PresetFile, PresetError> {
    let path = dir.join(PRESET_FILE);
    match is_plain_file(&path) {
        Ok(true) => {}
        Ok(false) => return Err(PresetError::NotPreset),
        Err(e) if e.kind() == ErrorKind::NotFound => return Err(PresetError::NotPreset),
        Err(e) => return Err(PresetError::io(e)),
    }
    match std::fs::metadata(&path) {
        Ok(m) if m.len() > MAX_TEXT_FILE_BYTES => return Err(format_err(FORMAT_TOO_BIG)),
        Ok(_) => {}
        Err(e) => return Err(PresetError::io(e)),
    }
    match read_capped_string(&path, MAX_TEXT_FILE_BYTES) {
        Ok(text) => parse_preset(&text),
        // 상한 선검사를 통과한 뒤의 InvalidData = UTF-8이 아닌 내용.
        Err(e) if e.kind() == ErrorKind::InvalidData => Err(format_err(FORMAT_JSON)),
        Err(e) => Err(PresetError::io(e)),
    }
}

/// `to_string_pretty` → `write_atomic(dir/preset.json)`. 실패 `Io{changed: false}`.
pub(super) fn write_preset_file(dir: &Path, file: &PresetFile) -> Result<(), PresetError> {
    let json = serde_json::to_string_pretty(file)
        .map_err(|e| PresetError::io(std::io::Error::other(e.to_string())))?;
    write_atomic(&dir.join(PRESET_FILE), json.as_bytes()).map_err(PresetError::io)
}

/// 앞뒤 공백 제거 후 1..=`NAME_MAX_CHARS` 글자, 제어 문자 없음. 통과하면 정리된 이름.
pub(super) fn normalize_name(raw: &str) -> Result<String, PresetError> {
    let name = raw.trim();
    let len = name.chars().count();
    if len == 0 || len > NAME_MAX_CHARS || name.chars().any(char::is_control) {
        return Err(PresetError::InvalidName);
    }
    Ok(name.to_string())
}

/// `^[0-9a-z][0-9a-z-]{0,39}$` — 정규식 크레이트 없이 바이트 검사.
pub(super) fn is_valid_id(id: &str) -> bool {
    let b = id.as_bytes();
    if b.is_empty() || b.len() > ID_MAX_LEN {
        return false;
    }
    let alnum = |c: u8| c.is_ascii_digit() || c.is_ascii_lowercase();
    alnum(b[0]) && b[1..].iter().all(|&c| alnum(c) || c == b'-')
}

/// `"{now_ms}"` 또는 `"{now_ms}-{n}"`(n=1..=999). 후보마다 `presets_dir/{후보}`가 없고
/// `create_dir(presets_dir/.staging-{후보})`가 성공할 때까지. 모두 실패하면 `Io`.
pub(super) fn claim_staging(
    presets_dir: &Path,
    now_ms: u64,
) -> Result<(String, PathBuf), PresetError> {
    for n in 0..=CLAIM_MAX_SUFFIX {
        let id = if n == 0 {
            now_ms.to_string()
        } else {
            format!("{now_ms}-{n}")
        };
        if std::fs::symlink_metadata(presets_dir.join(&id)).is_ok() {
            continue;
        }
        let staging = presets_dir.join(format!("{STAGING_PREFIX}{id}"));
        match std::fs::create_dir(&staging) {
            Ok(()) => return Ok((id, staging)),
            Err(e) if e.kind() == ErrorKind::AlreadyExists => {}
            Err(e) => return Err(PresetError::io(e)),
        }
    }
    Err(PresetError::io_other("id 자리를 얻지 못했습니다"))
}

/// Windows 예약 장치 이름(대소문자 무시). 첫 '.' 앞부분으로 판정한다.
fn is_reserved_name(name: &str) -> bool {
    let stem = name
        .split('.')
        .next()
        .unwrap_or_default()
        .to_ascii_uppercase();
    matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || ["COM", "LPT"].iter().any(|p| {
            stem.strip_prefix(p)
                .is_some_and(|d| matches!(d.as_bytes(), [b'1'..=b'9']))
        })
}

/// `< > : " / \ | ? *`와 제어 문자 → '_', 끝의 '.'·' ' 제거, 예약 이름이면 뒤에 '_', 비면 "preset".
/// 결과는 한 경로 조각이다. 사용자 문자열이 경로가 되는 유일한 곳(내보내기 폴더 이름).
pub(super) fn export_folder_name(name: &str) -> String {
    let replaced: String = name
        .chars()
        .map(|c| {
            if c.is_control() || "<>:\"/\\|?*".contains(c) {
                '_'
            } else {
                c
            }
        })
        .collect();
    let mut out = replaced.trim_end_matches(['.', ' ']).to_string();
    if out.is_empty() {
        return "preset".to_string();
    }
    if is_reserved_name(&out) {
        out.push('_');
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn json(extra: &str) -> String {
        format!(
            r#"{{"formatVersion":1,"name":"a","savedAt":1,"images":["kb_up","mouse_base"],"alarm":null{extra}}}"#
        )
    }

    fn is_format(r: Result<PresetFile, PresetError>) -> bool {
        matches!(r, Err(PresetError::Format(_)))
    }

    #[test]
    fn preset_settings_has_exactly_ps02_fields() {
        let v = serde_json::to_value(PresetSettings::default()).expect("json");
        let mut keys: Vec<&String> = v.as_object().expect("obj").keys().collect();
        keys.sort();
        assert_eq!(keys, ["idleSeconds", "mouse", "scale", "timer"]);
    }

    #[test]
    fn merge_into_keeps_pc_local_fields() {
        let mut cur = Settings {
            autostart: true,
            position_lock: true,
            show_in_taskbar: true,
            language: crate::settings::Language::En,
            ..Settings::default()
        };
        cur.overlay.x = 777;
        let before = cur.clone();
        let ps = PresetSettings {
            scale: 1.5,
            idle_seconds: 600,
            mouse: None,
            timer: TimerSettings {
                enabled: true,
                ..TimerSettings::default()
            },
        };
        ps.merge_into(&mut cur);
        assert_eq!(cur.overlay, before.overlay);
        assert_eq!(cur.autostart, before.autostart);
        assert_eq!(cur.language, before.language);
        assert_eq!(cur.position_lock, before.position_lock);
        assert_eq!(cur.show_in_taskbar, before.show_in_taskbar);
        assert_eq!(PresetSettings::from_settings(&cur), ps);
    }

    #[test]
    fn preset_file_round_trip() {
        let file = parse_preset(&json("")).expect("parse");
        let text = serde_json::to_string_pretty(&file).expect("ser");
        assert_eq!(parse_preset(&text).expect("re-parse"), file);
    }

    #[test]
    fn unknown_format_version_rejected() {
        let text = json("").replace("\"formatVersion\":1", "\"formatVersion\":2");
        assert!(is_format(parse_preset(&text)));
    }

    #[test]
    fn unknown_slot_rejected() {
        let text = json("").replace("\"kb_up\"", "\"nope\"");
        assert!(is_format(parse_preset(&text)));
    }

    #[test]
    fn duplicate_slot_rejected() {
        let text = json("").replace("\"mouse_base\"", "\"kb_up\"");
        assert!(is_format(parse_preset(&text)));
    }

    #[test]
    fn too_many_images_rejected() {
        let mut file = parse_preset(&json("")).expect("parse");
        file.images = (0..=MAX_IMAGES as u32).map(AssetSlot::kb_down).collect();
        assert_eq!(file.images.len(), 65);
        let text = serde_json::to_string(&file).expect("ser");
        assert!(is_format(parse_preset(&text)));
    }

    #[test]
    fn settings_normalized_on_read() {
        let extra = r#","settings":{"idleSeconds":10,"timer":{"color":"zzz"}}"#;
        let file = parse_preset(&json(extra)).expect("parse");
        assert_eq!(file.settings.idle_seconds, 60);
        assert_eq!(file.settings.timer.color, TimerSettings::default().color);
    }

    #[test]
    fn invalid_settings_rejected() {
        let extra = r#","settings":{"scale":5}"#;
        assert!(matches!(
            parse_preset(&json(extra)),
            Err(PresetError::InvalidSettings(_))
        ));
    }

    #[test]
    fn normalize_name_table() {
        assert!(matches!(
            normalize_name("   "),
            Err(PresetError::InvalidName)
        ));
        assert!(matches!(normalize_name(""), Err(PresetError::InvalidName)));
        assert!(matches!(
            normalize_name(&"a".repeat(51)),
            Err(PresetError::InvalidName)
        ));
        assert!(matches!(
            normalize_name("a\nb"),
            Err(PresetError::InvalidName)
        ));
        assert_eq!(normalize_name("  이름 ").expect("ok"), "이름");
        assert_eq!(
            normalize_name(&"한".repeat(50))
                .expect("50")
                .chars()
                .count(),
            50
        );
    }

    #[test]
    fn is_valid_id_table() {
        for bad in ["", "..", "a/b", "A", ".staging-1", "-1", &"1".repeat(41)] {
            assert!(!is_valid_id(bad), "{bad}");
        }
        for ok in ["1790000000000", "1790000000000-2", &"1".repeat(40)] {
            assert!(is_valid_id(ok), "{ok}");
        }
    }

    #[test]
    fn claim_staging_skips_taken_ids() {
        let dir = tempfile::tempdir().expect("tempdir");
        std::fs::create_dir(dir.path().join("100")).expect("taken");
        std::fs::create_dir(dir.path().join(".staging-100-1")).expect("taken staging");
        let (id, staging) = claim_staging(dir.path(), 100).expect("claim");
        assert_eq!(id, "100-2");
        assert!(staging.is_dir());
    }

    #[test]
    fn export_folder_name_table() {
        assert_eq!(export_folder_name("a:b"), "a_b");
        assert_eq!(export_folder_name("CON"), "CON_");
        assert_eq!(export_folder_name("con.txt"), "con.txt_");
        assert_eq!(export_folder_name("..."), "preset");
        assert_eq!(export_folder_name("이름. "), "이름");
        assert_eq!(export_folder_name("a/b\\c"), "a_b_c");
        assert_eq!(export_folder_name("com1"), "com1_");
        assert_eq!(export_folder_name("com10"), "com10");
    }
}
