//! bridge 계약 타입 표면 (v0.28 — contract.md §3).
//!
//! 타입의 정의는 각 core 모듈이 소유하고(단일 정의), 여기서는 계약에 노출되는 것만 재수출한다.
//! TS 거울: src/bridge/types.ts. 문서: doc/200_설계/bridge/contract.md.
//!
//! [v0.17, CR-037] `SimpleSlot`에 `Hair`(캔버스 레이어, 선택, 내장 기본 없음) 추가 —
//! 정의는 `crate::assets::SimpleSlot`(core) 소유, 이 파일은 재수출만이라 열거값 추가 변경 없음.
//!
//! [v0.21, CR-045] `SimpleSlot`에 `PomoChar`·`PomoBubble`(core 정의, 재수출만) 추가.
//! `settings::TimerSettings`·`timer::{TimerStatus, TimerSnapshot, TimerAction}` 재수출과
//! `impl From<timer::TimerError> for BridgeError`(계약 §6.1 — `error.rs`는 core 쓰기 가드 대상이라
//! v0.14 `AutostartError`와 같은 이유로 이 파일에 둔다) 추가.
//!
//! | 계약 타입 | Rust 정의 | 직렬화 |
//! |---|---|---|
//! | AssetSlot(`background` 포함, v0.6; 특수 키 7종, v0.11; 펜 쥔 손 8종+순번, v0.13 CR-024) | assets::AssetSlot | `"background"`/`"body"` … / `{"kind":"kb_down","index":N}` / `{"kind":"pen_down","index":N}` |
//! | AssetEntry / AssetManifest / CanvasSize | assets::* | camelCase |
//! | ExportReport / ExportFailure(v0.16, CR-035 · DA-05) | assets::export::* | camelCase, 반환 전용(Deserialize 없음) |
//! | Settings(v0.14: `language`·`positionLock`·`showInTaskbar` 추가, SV2-02~04; v0.21: `timer: TimerSettings` 추가, CR-045) / OverlaySettings / MouseSettings(v0.13: `penPos: Option<Point>` 추가, CR-024; v0.15: `penMode: bool` 추가, CR-033; v0.16: `penPos` 기본값 `None`→`Some(380,496)`, DA-07; 현재 `penPos` 기본 `Some(372,476)`, v0.18부터 `penMode` 기본 `true`) / TimerSettings(v0.21, CR-045) / Point / Language(v0.14) | settings::* | camelCase (v0.10: `SlamSettings`·`Settings.slam` 삭제, v0.9: `Rect` 삭제, `MouseSettings.area: [Point; 4]`) |
//! | TimerStatus / TimerSnapshot / TimerAction(v0.21, CR-045) | timer::* | camelCase — `TimerStatus`는 `"restPaused"`(여러 단어도 camelCase, snake_case 아님) |
//! | ScreenBounds / WindowPoint(= `window::Point`, i32, = 계약 Position) | window::* | camelCase |
//! | BridgeError | error::BridgeError | `{code, message}` |
//! | KeyboardPayload / MouseMovePayload / MouseButtonPayload / HandAnchorPayload(v0.3) | events::* | camelCase |
//! | SpecialKey(v0.11, CR-021) | hook::SpecialKey | `"space"` … `"backspace"`/`"undo"` |
//! | PenDownKind(v0.13, CR-024) | assets::PenDownKind | `"pen_down"`(단일 변형, `AssetSlot::PenDown.kind` 강제용) |
//!
//! [v0.14 에러 변환] `impl From<AutostartError> for BridgeError`를 이 파일에 둔다(계약 §6.1은
//! `src-tauri/src/error.rs` 한 곳을 정본으로 지정하지만, 그 파일은 core 모듈이라
//! bridge-implementer 쓰기 가드가 막는다 — orphan rule 상 `BridgeError`·`AutostartError` 모두
//! 이 크레이트 소유라 어느 모듈에 둬도 유효하다. `error.rs`의 옛
//! `From<tauri_plugin_autostart::Error>` 삭제는 core/메인 세션 몫으로 별도 보고).
//!
//! [v0.16] `restore_default_asset`·`export_default_assets`의 에러는 `crate::assets::AssetError`
//! (`NoDefault`·`ExportDir` 포함)라 `error.rs`의 기존 `From<AssetError> for BridgeError`가 그대로
//! 적용된다 — 이 파일에 새 `From` 구현을 추가하지 않는다.
//!
//! [v0.23, CR-048] `settings::timer::TimerMode`·`assets::sound::{AlarmFormat, AlarmSound}` 재수출,
//! `impl From<assets::sound::SoundError> for BridgeError`(위 `AutostartError`·`TimerError`와 같은
//! 이유로 `error.rs` 대신 이 파일에 둔다) 추가.
//!
//! [v0.25, data-reset] `impl From<data_reset::ResetError> for BridgeError`(계약 §6.1 — 위와 같은
//! 이유로 `error.rs` 대신 이 파일에 둔다) 추가. `Io` → `reset.io` / `Seed` → `reset.seed` /
//! `Settings(e)` → `e.code()` 그대로(`transparent`이라 message도 `SettingsError` 문구 그대로).

pub use crate::assets::export::{ExportFailure, ExportReport};
pub use crate::assets::sound::{AlarmFormat, AlarmSound};
pub use crate::assets::{AssetEntry, AssetManifest, AssetSlot, CanvasSize, SimpleSlot};
pub use crate::error::BridgeError;
pub use crate::hook::SpecialKey;
pub use crate::settings::timer::TimerMode;
pub use crate::settings::{Language, MouseSettings, OverlaySettings, Settings, TimerSettings};
pub use crate::timer::{TimerAction, TimerSnapshot, TimerStatus};
pub use crate::tray::autostart::AutostartError;
pub use crate::window::{Point as WindowPoint, ScreenBounds};

pub use super::events::{HandAnchorPayload, KeyboardPayload, MouseButtonPayload, MouseMovePayload};

/// (v0.14, SV2-05) `tray::autostart::AutostartError` → `BridgeError`(계약 §6.1).
/// (v0.22, CR-047 · SEC-001) 승격 경로 삭제로 `Cancelled` 변형이 없어졌다 — `autostart.cancelled`는
/// 더 이상 나오지 않는다. 남은 변형은 `Failed(String)` → `autostart.error`, `Io` → `io.error`,
/// `Settings(SettingsError)` → `e.code()`(잠금 오염은 `state.poisoned`, 그대로 위임한다).
impl From<AutostartError> for BridgeError {
    fn from(e: AutostartError) -> Self {
        BridgeError::new(e.code(), e.to_string())
    }
}

/// (v0.21, CR-045 · PT-05 · PT-10) `crate::timer::TimerError` → `BridgeError`(계약 §6.1). 새 code는
/// `timer.disabled` 하나(`Disabled` 변형뿐).
impl From<crate::timer::TimerError> for BridgeError {
    fn from(e: crate::timer::TimerError) -> Self {
        BridgeError::new(e.code(), e.to_string())
    }
}

/// (v0.23, CR-048 · TM-08 · TM-13) `assets::sound::SoundError` → `BridgeError`(계약 §6.1 —
/// `error.rs`는 core 쓰기 가드 대상이라 v0.14 `AutostartError`·v0.21 `TimerError`와 같은 이유로
/// 이 파일에 둔다). `NotAudio` → `sound.not_audio` / `TooManyBytes` → `sound.too_many_bytes` /
/// `Io` → `sound.io`.
impl From<crate::assets::sound::SoundError> for BridgeError {
    fn from(e: crate::assets::sound::SoundError) -> Self {
        BridgeError::new(e.code(), e.to_string())
    }
}

/// (v0.25, data-reset · R-B3) `crate::data_reset::ResetError` → `BridgeError`(계약 §6.1 —
/// `error.rs`는 core 쓰기 가드 대상이라 위 셋과 같은 이유로 이 파일에 둔다). `Io` → `reset.io` /
/// `Seed` → `reset.seed` / `Settings(e)` → `e.code()` 그대로(`state.poisoned`·`settings.io` 등).
impl From<crate::data_reset::ResetError> for BridgeError {
    fn from(e: crate::data_reset::ResetError) -> Self {
        BridgeError::new(e.code(), e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// contract.md §3.2.1 JSON 직렬화 예시 고정 — 키 순서·이름(written·conflicts·failed).
    #[test]
    fn export_report_serializes_per_contract() {
        let report = ExportReport {
            written: vec!["kb_up.png".to_string()],
            conflicts: vec![],
            failed: vec![],
        };
        assert_eq!(
            serde_json::to_string(&report).expect("ser"),
            r#"{"written":["kb_up.png"],"conflicts":[],"failed":[]}"#
        );
    }

    /// 빈 배열도 항상 키가 있다(skip_serializing_if 없음, §3.2.1).
    #[test]
    fn export_report_default_has_all_keys() {
        let report = ExportReport::default();
        let json = serde_json::to_string(&report).expect("ser");
        assert_eq!(json, r#"{"written":[],"conflicts":[],"failed":[]}"#);
    }

    /// contract.md §6.1 — `TimerError::Disabled` → `timer.disabled`, message는 core 원문 그대로.
    #[test]
    fn timer_error_converts_to_bridge_error() {
        let err: BridgeError = crate::timer::TimerError::Disabled.into();
        assert_eq!(err.code, "timer.disabled");
        assert_eq!(
            err.message,
            "스톱워치나 타이머가 꺼져 있습니다. 먼저 둘 중 하나를 켜 주세요."
        );
    }

    /// contract.md §3.1·§3.9 — `PomoChar`·`PomoBubble`·`TimerSnapshot`·`TimerAction`이 이 재수출
    /// 경로(`crate::bridge::types`)로 컴파일된다는 것 자체가 계약(bridge 노출 표면)이다.
    #[test]
    fn v0_21_types_are_reexported() {
        let slot = AssetSlot::Simple(SimpleSlot::PomoChar);
        assert_eq!(slot.file_key(), "pomo_char");
        assert_eq!(
            AssetSlot::Simple(SimpleSlot::PomoBubble).file_key(),
            "pomo_bubble"
        );
        let snapshot = TimerSnapshot {
            status: TimerStatus::Stopped,
            elapsed_ms: 0,
            mode: crate::settings::timer::TimerMode::Stopwatch,
            duration_ms: 0,
        };
        assert_eq!(
            serde_json::to_string(&snapshot).expect("ser"),
            r#"{"status":"stopped","elapsedMs":0,"mode":"stopwatch","durationMs":0}"#
        );
        assert_eq!(
            serde_json::from_str::<TimerAction>("\"start\"").expect("de"),
            TimerAction::Start
        );
        let timer_settings = TimerSettings::default();
        assert!(!timer_settings.enabled);
    }

    /// contract.md §6.1 — `SoundError` 세 변형이 계약 code로 변환된다(TM-13).
    #[test]
    fn sound_error_converts_to_bridge_error() {
        let too_large: BridgeError =
            crate::assets::sound::SoundError::TooManyBytes { bytes: 2_000_000 }.into();
        assert_eq!(too_large.code, "sound.too_many_bytes");

        let not_audio: BridgeError = crate::assets::sound::SoundError::NotAudio.into();
        assert_eq!(not_audio.code, "sound.not_audio");

        let io: BridgeError =
            crate::assets::sound::SoundError::Io(std::io::Error::other("x")).into();
        assert_eq!(io.code, "sound.io");
    }

    /// contract.md §3.10 — `TimerMode`·`AlarmFormat`·`AlarmSound`가 bridge 노출 표면으로 컴파일된다.
    #[test]
    fn v0_23_alarm_types_are_reexported() {
        let sound = AlarmSound {
            format: AlarmFormat::Mp3,
            bytes: 312_004,
            url: "http://asset.localhost/x/assets/alarm.mp3?v=1758870000000".to_string(),
        };
        assert_eq!(
            serde_json::to_string(&sound).expect("ser"),
            r#"{"format":"mp3","bytes":312004,"url":"http://asset.localhost/x/assets/alarm.mp3?v=1758870000000"}"#
        );
        assert_eq!(TimerMode::default(), TimerMode::Stopwatch);
    }

    /// contract.md §3.2.1 `ExportFailure` = fileName·code(camelCase).
    #[test]
    fn export_failure_serializes_camel_case() {
        let f = ExportFailure {
            file_name: "idle.png".to_string(),
            code: "asset.io",
        };
        assert_eq!(
            serde_json::to_string(&f).expect("ser"),
            r#"{"fileName":"idle.png","code":"asset.io"}"#
        );
    }
}
