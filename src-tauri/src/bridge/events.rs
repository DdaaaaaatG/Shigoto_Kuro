//! bridge 이벤트 — Rust → ui 로 밀어내는 유일한 통로.
//!
//! [이름] TS `EVENTS` 상수와 1:1. Tauri 이벤트 이름은 영숫자·`-`·`/`·`:`·`_` 만 허용된다.
//! [페이로드] camelCase. 입력 이벤트 ts 는 epoch ms.
//! [대상] 모든 창에 emit 한다(설정 창 미리보기도 입력을 볼 수 있게).
//! [unsafe] 없음.

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::assets::AssetManifest;
use crate::hook::{InputEvent, MouseButton, SpecialKey};
use crate::settings::{Point, Settings};
use crate::timer::TimerSnapshot;

pub const EVENT_KEYBOARD: &str = "input://keyboard";
pub const EVENT_MOUSE_MOVE: &str = "input://mouse-move";
pub const EVENT_MOUSE_BUTTON: &str = "input://mouse-button";
pub const EVENT_SETTINGS_CHANGED: &str = "settings://changed";
pub const EVENT_ASSETS_CHANGED: &str = "assets://changed";
/// 손 기준점 변경 통지(v0.3, contract.md §3.6·§4, OV-R-14). 값이 이전 캐시와 다를 때만 emit.
pub const EVENT_HAND_ANCHOR_CHANGED: &str = "assets://hand-anchor-changed";
/// 뽀모도 타이머 상태 변경 통지(v0.21, contract.md §4·§5.8, CR-045). 상태가 바뀔 때만 emit —
/// 매초·주기 이벤트는 없다.
pub const EVENT_TIMER_CHANGED: &str = "timer://changed";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardPayload {
    pub pressed: bool,
    /// 키보드 누름 표시용 — 0이면 들림
    pub held_count: u32,
    /// 특수 키 7종 분류(v0.11, contract.md §3.7, CR-021). skip_serializing_if 없음 —
    /// None 도 "special": null 로 항상 직렬화한다.
    pub special: Option<SpecialKey>,
    /// 이미 눌린 키의 OS 자동 반복 누름이면 true(v0.12, contract.md §3.7.1, CR-023).
    /// skip_serializing_if 없음 — false 도 "repeat": false 로 항상 직렬화한다.
    pub repeat: bool,
    pub ts: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MouseMovePayload {
    pub x: i32,
    pub y: i32,
    pub ts: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MouseButtonPayload {
    pub button: &'static str,
    pub pressed: bool,
    pub ts: u64,
}

/// `get_hand_anchor` 반환·`assets://hand-anchor-changed` 페이로드 공용 (contract.md §3.6).
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HandAnchorPayload {
    pub anchor: Option<Point>,
}

fn button_name(b: MouseButton) -> &'static str {
    match b {
        MouseButton::Left => "left",
        MouseButton::Right => "right",
    }
}

pub fn emit_input(app: &AppHandle, ev: &InputEvent) -> tauri::Result<()> {
    match *ev {
        InputEvent::Keyboard {
            pressed,
            held,
            special,
            repeat,
            ts,
        } => app.emit(
            EVENT_KEYBOARD,
            KeyboardPayload {
                pressed,
                held_count: held,
                special,
                repeat,
                ts,
            },
        ),
        InputEvent::MouseMove { x, y, ts } => {
            app.emit(EVENT_MOUSE_MOVE, MouseMovePayload { x, y, ts })
        }
        InputEvent::MouseButton {
            button,
            pressed,
            ts,
        } => app.emit(
            EVENT_MOUSE_BUTTON,
            MouseButtonPayload {
                button: button_name(button),
                pressed,
                ts,
            },
        ),
    }
}

pub fn emit_settings_changed(app: &AppHandle, settings: &Settings) -> tauri::Result<()> {
    app.emit(EVENT_SETTINGS_CHANGED, settings)
}

pub fn emit_assets_changed(app: &AppHandle, manifest: &AssetManifest) -> tauri::Result<()> {
    app.emit(EVENT_ASSETS_CHANGED, manifest)
}

/// 손 기준점 캐시가 바뀌었을 때만 호출한다(§5.1-6). 값 자체는 앞선 emit 실패와 무관하게 갱신돼 있다.
pub fn emit_hand_anchor_changed(app: &AppHandle, anchor: Option<Point>) -> tauri::Result<()> {
    app.emit(EVENT_HAND_ANCHOR_CHANGED, HandAnchorPayload { anchor })
}

/// 타이머 상태가 바뀌었을 때만 호출한다(§5.8-1). 모든 창(오버레이·설정)에 emit.
pub fn emit_timer_changed(app: &AppHandle, snapshot: &TimerSnapshot) -> tauri::Result<()> {
    app.emit(EVENT_TIMER_CHANGED, snapshot)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn payloads_serialize_camel_case() {
        let p = MouseButtonPayload {
            button: button_name(MouseButton::Right),
            pressed: true,
            ts: 7,
        };
        assert_eq!(
            serde_json::to_string(&p).expect("ser"),
            r#"{"button":"right","pressed":true,"ts":7}"#
        );
    }

    #[test]
    fn event_names_use_allowed_characters_only() {
        for name in [
            EVENT_KEYBOARD,
            EVENT_MOUSE_MOVE,
            EVENT_MOUSE_BUTTON,
            EVENT_SETTINGS_CHANGED,
            EVENT_ASSETS_CHANGED,
            EVENT_HAND_ANCHOR_CHANGED,
            EVENT_TIMER_CHANGED,
        ] {
            assert!(name
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '/' | ':' | '_')));
        }
    }

    /// contract.md §3.7 JSON 직렬화 예시 고정 — special 이 있을 때.
    #[test]
    fn keyboard_payload_serializes_special_value() {
        let p = KeyboardPayload {
            pressed: true,
            held_count: 1,
            special: Some(SpecialKey::Space),
            repeat: false,
            ts: 1_760_000_000_000,
        };
        assert_eq!(
            serde_json::to_string(&p).expect("ser"),
            r#"{"pressed":true,"heldCount":1,"special":"space","repeat":false,"ts":1760000000000}"#
        );
    }

    /// contract.md §3.7 — special 이 None 이어도 "special": null 로 항상 직렬화한다(필수 필드).
    #[test]
    fn keyboard_payload_serializes_null_special_always() {
        let p = KeyboardPayload {
            pressed: true,
            held_count: 1,
            special: None,
            repeat: false,
            ts: 7,
        };
        let json = serde_json::to_string(&p).expect("ser");
        assert_eq!(
            json,
            r#"{"pressed":true,"heldCount":1,"special":null,"repeat":false,"ts":7}"#
        );
        assert!(json.contains("\"special\":null"));
    }

    /// contract.md §3.7 — Ctrl+Z 는 "undo" 로 직렬화한다("z" 가 아니다).
    #[test]
    fn keyboard_payload_serializes_undo_not_z() {
        let p = KeyboardPayload {
            pressed: true,
            held_count: 2,
            special: Some(SpecialKey::Undo),
            repeat: false,
            ts: 1_760_000_000_450,
        };
        let json = serde_json::to_string(&p).expect("ser");
        assert!(json.contains("\"special\":\"undo\""));
    }

    /// contract.md §3.7.1 — 자동 반복 이벤트는 "repeat": true 로 직렬화하고, heldCount 는
    /// 첫 누름과 같은 값을 유지한다(CR-023, v0.12).
    #[test]
    fn keyboard_payload_serializes_repeat_true() {
        let p = KeyboardPayload {
            pressed: true,
            held_count: 1,
            special: Some(SpecialKey::Space),
            repeat: true,
            ts: 1_760_000_000_500,
        };
        assert_eq!(
            serde_json::to_string(&p).expect("ser"),
            r#"{"pressed":true,"heldCount":1,"special":"space","repeat":true,"ts":1760000000500}"#
        );
    }

    /// contract.md §3.6 JSON 직렬화 예시 고정.
    #[test]
    fn hand_anchor_payload_serializes_per_contract() {
        let some = HandAnchorPayload {
            anchor: Some(Point { x: 262.5, y: 1.5 }),
        };
        assert_eq!(
            serde_json::to_string(&some).expect("ser"),
            r#"{"anchor":{"x":262.5,"y":1.5}}"#
        );
        let none = HandAnchorPayload { anchor: None };
        assert_eq!(
            serde_json::to_string(&none).expect("ser"),
            r#"{"anchor":null}"#
        );
    }
}
