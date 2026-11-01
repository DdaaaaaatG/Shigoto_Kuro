//! 키 그림 최소 유지 시간 `keyHoldMs`(🔒 2026-11-01 사용자 지정, key-hold KH-01·03·06·08).
//!
//! [목적] 오버레이가 키 그림(누름·특수 키·펜 손 누름)을 누른 시점부터 최소 이만큼 보이게 하는 ms 값의
//!        범위·기본값·쓰기 검증·읽기 보정. 표시 파생은 ui(`src/state/keyHold.ts`) 몫 — core는 저장·검증만.
//! [공개 API] `KEY_HOLD_MS_MIN`·`KEY_HOLD_MS_MAX`·`KEY_HOLD_MS_DEFAULT`, `normalize`(crate 공개),
//!        `validate`(settings 안 전용).
//! [스레드] 없음. 호출자 스레드에서 동기 실행.
//! [규칙] 0 ~ 500 정수 ms, 기본 150. 0 = 떼는 즉시 복귀(v1.1까지 동작). 쓰기(set_settings·프리셋 검증)는 범위 밖
//!        거부(`settings.invalid`), 파일·프리셋 읽기는 clamp(옛 파일이 이 한 필드 때문에 통째로 기본값이 되지
//!        않게 — idle_seconds D24와 같은 이유). 음수·소수는 u32 형식 오류(기존 경로, 관용 읽기 없음 — A-8).
//! [unsafe] 없음.
//! [에러] `SettingsError::Invalid`(범위 밖 쓰기). 형식 오류는 기존 `SettingsError::Format` 경로.
//! [설정] `keyHoldMs`(u32, 0~500, 기본 150). 키 없는 옛 파일·프리셋은 150.
//! [테스트] 이 파일 `tests` — KC1~KC7(key-hold-03-packet-core §5).

use super::SettingsError;

/// 허용 하한(ms). 0 = 떼는 즉시 복귀.
pub const KEY_HOLD_MS_MIN: u32 = 0;
/// 허용 상한(ms).
pub const KEY_HOLD_MS_MAX: u32 = 500;
/// TS `DEFAULT_SETTINGS.keyHoldMs`와 1:1.
pub const KEY_HOLD_MS_DEFAULT: u32 = 150;

/// 쓰기 검증 — `Settings::validate`가 부른다.
pub(super) fn validate(ms: u32) -> Result<(), SettingsError> {
    if !(KEY_HOLD_MS_MIN..=KEY_HOLD_MS_MAX).contains(&ms) {
        return Err(SettingsError::Invalid(
            "키 그림 유지 시간은 0 ~ 500ms 사이여야 합니다.".to_string(),
        ));
    }
    Ok(())
}

/// 읽기 보정 — `settings::load`·`PresetSettings::normalized`가 부른다. 범위 밖이면 clamp + 경고 로그(값만).
pub(crate) fn normalize(ms: u32) -> u32 {
    let clamped = ms.clamp(KEY_HOLD_MS_MIN, KEY_HOLD_MS_MAX);
    if clamped != ms {
        log::warn!("키 그림 유지 시간 {ms}ms가 범위 밖이라 {clamped}ms로 읽습니다");
    }
    clamped
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::sync::Mutex;

    use super::super::{load, load_or_default, update, Settings, SettingsError};

    fn tmp() -> (tempfile::TempDir, std::path::PathBuf) {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        (dir, path)
    }

    /// KC1
    #[test]
    fn default_is_150_and_serialized() {
        let s = Settings::default();
        assert_eq!(s.key_hold_ms, 150);
        assert!(s.validate().is_ok());
        let json = serde_json::to_string(&s).expect("json");
        assert!(json.contains("\"keyHoldMs\":150"));
    }

    /// KC2
    #[test]
    fn old_file_without_key_reads_default() {
        let (_d, path) = tmp();
        fs::write(&path, r##"{"idleSeconds":60}"##).expect("write");
        let s = load(&path).expect("load").expect("some");
        assert_eq!(s.key_hold_ms, 150);
        assert_eq!(s.idle_seconds, 60);
    }

    /// KC3
    #[test]
    fn validate_range() {
        for ok in [0, 150, 500] {
            let s = Settings {
                key_hold_ms: ok,
                ..Settings::default()
            };
            assert!(s.validate().is_ok(), "{ok} 는 통과해야 한다");
        }
        for bad in [501, u32::MAX] {
            let s = Settings {
                key_hold_ms: bad,
                ..Settings::default()
            };
            let err = s.validate().expect_err("거부");
            assert!(matches!(err, SettingsError::Invalid(_)));
            assert_eq!(err.code(), "settings.invalid");
            assert!(err.to_string().contains("0 ~ 500ms"));
        }
    }

    /// KC4
    #[test]
    fn load_clamps_out_of_range() {
        let (_d, path) = tmp();
        fs::write(&path, r##"{"keyHoldMs": 9999, "scale": 1.5}"##).expect("write");
        let s = load(&path).expect("load").expect("some");
        assert_eq!(s.key_hold_ms, 500);
        assert_eq!(s.scale, 1.5);
    }

    /// KC5
    #[test]
    fn round_trip() {
        let (_d, path) = tmp();
        let state = Mutex::new(Settings::default());
        for v in [0, 320] {
            update(&state, &path, |s| s.key_hold_ms = v).expect("update");
            let s = load(&path).expect("load").expect("some");
            assert_eq!(s.key_hold_ms, v);
        }
    }

    /// KC6
    #[test]
    fn bad_type_is_format_error() {
        let (_d, path) = tmp();
        fs::write(&path, r##"{"keyHoldMs": -1}"##).expect("write");
        assert!(matches!(load(&path), Err(SettingsError::Format(_))));
        assert_eq!(load_or_default(&path), Settings::default());
    }

    /// KC7
    #[test]
    fn update_rejects_out_of_range() {
        let (_d, path) = tmp();
        let state = Mutex::new(Settings::default());
        update(&state, &path, |s| s.scale = 1.5).expect("seed");
        let before = fs::read_to_string(&path).expect("read");
        let r = update(&state, &path, |s| s.key_hold_ms = 501);
        assert!(matches!(r, Err(SettingsError::Invalid(_))));
        assert_eq!(state.lock().expect("lock").key_hold_ms, 150);
        assert_eq!(fs::read_to_string(&path).expect("read"), before);
        assert_eq!(load(&path).expect("load").expect("some").key_hold_ms, 150);
    }
}
