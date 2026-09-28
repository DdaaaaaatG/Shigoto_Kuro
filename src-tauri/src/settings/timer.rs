//! 뽀모도 타이머 시간 글자 표시 설정(영속, CR-045 PT-04·07·08·09 + CR-048 TM-01·02·04·10·13).
//!
//! [목적] 켜짐 여부(`enabled`, CR-048부터 「스톱워치 또는 타이머 켜짐」)·모드(`mode`, 스톱워치·
//!        카운트다운)·시작 시간(`countdownSecs`)·알림음 음량(`alarmVolume`)·글자 위치(중심, 캔버스
//!        좌표)·회전·크기·색. 경과·실행 상태는 여기 없다(`crate::timer`, 휘발 — 저장 안 함).
//! [공개 API] `TimerSettings`, `TimerMode`, `validate`, `normalize`, 범위 상수, `DEFAULT_COLOR`.
//! [규칙] 위치 0~900·0~700, 회전 −180~180, 크기 12~200, 모두 유한수. 색 `#` + 16진수 6자리.
//!        시작 시간 1~359999초(99:59:59), 음량 0~100. `validate`(set_settings)는 거부만,
//!        `normalize`(load)는 보정만 한다. `mode`·`countdownSecs`·`alarmVolume`은 값의 타입이
//!        틀려도 그 필드만 기본값으로 읽는다(관대한 역직렬화, §3.10.2) — 설정 전체가 `Format`
//!        오류로 번지지 않는다.
//! [호환] 컨테이너 `#[serde(default)]` — `timer`가 없거나 일부만 있으면 빠진 값은 기본값.
//!        옛 파일 `{"timer":{"enabled":true}}`은 이행 코드 없이 `mode: Stopwatch`로 읽혀
//!        「스톱워치 켜짐」이 된다(TM-02).
//! [unsafe] 없음.
//! [테스트] 기본값·옛 파일·부분 객체·읽기 보정·색·검증 경계·모드/시작 시간/음량 관대한 역직렬화·
//!        검증·왕복(아래 `#[cfg(test)] mod tests`).
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::Value;

use super::{Point, SettingsError};

/// 글자 위치 상한 = 캔버스 최대 크기(확정사항 §3). `assets::CANVAS_MAX_WIDTH/HEIGHT`(u32)와 같은
/// 값이지만 의존 방향(assets → settings)상 여기서 참조하지 않는다 — 일치는 통합 테스트가 지킨다.
pub const TEXT_POS_MAX_X: f64 = 900.0;
pub const TEXT_POS_MAX_Y: f64 = 700.0;
pub const ROTATION_MIN: f64 = -180.0;
pub const ROTATION_MAX: f64 = 180.0;
pub const FONT_SIZE_MIN: f64 = 12.0;
pub const FONT_SIZE_MAX: f64 = 200.0;
pub const DEFAULT_COLOR: &str = "#333333";

/// 타이머 시작 시간(초) 범위(CR-048 TM-04, D-2·D-3). 99:59:59 상한.
pub const COUNTDOWN_SECS_MIN: u32 = 1;
pub const COUNTDOWN_SECS_MAX: u32 = 359_999;
/// 기본 시작 시간 00:25:00(D-2).
pub const DEFAULT_COUNTDOWN_SECS: u32 = 1_500;
/// 알림음 음량 상한(%).
pub const ALARM_VOLUME_MAX: u32 = 100;
/// 기본 음량 44%(0.4.0, 사용자 확정 배포 기본값).
pub const DEFAULT_ALARM_VOLUME: u32 = 44;

/// 타이머 모드(CR-048 TM-01). JSON "stopwatch" | "countdown". `enabled`와 별개로, 어느 쪽이
/// 켜졌는지를 나타낸다 — 상호배타는 타입 수준에서 보장된다(둘 다 켜진 상태를 만들 수 없다).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimerMode {
    #[default]
    Stopwatch,
    Countdown,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)] // default 필수: 일부 필드만 있는 옛 파일이 Format 오류가 되지 않게
pub struct TimerSettings {
    /// 스톱워치 또는 타이머 켜짐(CR-048부터 의미 확장, 값 자체는 불변). 끄면 bridge가
    /// `Timer::disable`을 부른다(일시정지, U-2).
    pub enabled: bool,
    /// 스톱워치·카운트다운 중 어느 쪽인지(CR-048 TM-01). 알 수 없는 문자열·다른 타입은
    /// `Stopwatch`로 읽는다(§3.10.2, 설정 전체를 무너뜨리지 않기 위해).
    #[serde(deserialize_with = "deserialize_mode")]
    pub mode: TimerMode,
    /// 카운트다운 시작 시간(초), JSON "countdownSecs". 1~359999(CR-048 TM-04). 범위 밖·타입
    /// 오류는 읽을 때 기본값으로 보정한다(§3.10.2·`normalize`).
    #[serde(deserialize_with = "deserialize_countdown_secs")]
    pub countdown_secs: u32,
    /// 알림음 음량(%), JSON "alarmVolume". 0~100(CR-048 TM-10).
    #[serde(deserialize_with = "deserialize_alarm_volume")]
    pub alarm_volume: u32,
    /// 글자 상자 중심, 캔버스 좌표(PT-07).
    pub text_pos: Point,
    /// 도, 시계 방향 +(PT-07).
    pub rotation: f64,
    /// 캔버스 px(PT-07).
    pub font_size: f64,
    /// "#rrggbb"(PT-08). 읽을 때 소문자로 맞춘다.
    pub color: String,
}

impl Default for TimerSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            mode: TimerMode::Stopwatch,
            countdown_secs: DEFAULT_COUNTDOWN_SECS,
            alarm_volume: DEFAULT_ALARM_VOLUME,
            // 0.4.0(🔒 사용자 지정 2026-09-28): 새 pomo_char.png 말풍선 기준.
            text_pos: Point { x: 268.0, y: 402.0 },
            // 말풍선 기울기(시계 방향 +).
            rotation: 7.0,
            // 안쪽 폭 약 225px에 "00:00:00"(굵은 표 숫자 약 4.8em)이 들어가는 크기.
            font_size: 36.0,
            // 흰 말풍선 위 진회색.
            color: DEFAULT_COLOR.to_string(),
        }
    }
}

/// 어떤 JSON 값이든 먼저 받아 두고(형식 오류 없음) 문자열일 때만 해석한다(§3.10.2).
/// 알 수 없는 문자열·다른 타입은 `Stopwatch`(IPC `set_settings`에도 같은 규칙이 걸린다).
fn deserialize_mode<'de, D>(deserializer: D) -> Result<TimerMode, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Value::deserialize(deserializer)?;
    Ok(match value.as_str() {
        Some("countdown") => TimerMode::Countdown,
        _ => TimerMode::Stopwatch,
    })
}

fn deserialize_countdown_secs<'de, D>(deserializer: D) -> Result<u32, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Value::deserialize(deserializer)?;
    Ok(lenient_u32(&value).unwrap_or(DEFAULT_COUNTDOWN_SECS))
}

fn deserialize_alarm_volume<'de, D>(deserializer: D) -> Result<u32, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Value::deserialize(deserializer)?;
    Ok(lenient_u32(&value).unwrap_or(DEFAULT_ALARM_VOLUME))
}

/// 0 이상 정수·소수(내림)만 값으로 인정한다. 음수·문자열·`null`·bool·객체·배열은 `None`
/// (호출자가 그 필드의 기본값으로 대체한다, §3.10.2).
fn lenient_u32(v: &Value) -> Option<u32> {
    if let Some(u) = v.as_u64() {
        return Some(u32::try_from(u).unwrap_or(u32::MAX));
    }
    if let Some(f) = v.as_f64() {
        if f.is_finite() && f >= 0.0 {
            let floored = f.floor();
            return Some(if floored > f64::from(u32::MAX) {
                u32::MAX
            } else {
                floored as u32
            });
        }
    }
    None
}

/// set_settings 검증 — 범위 밖·비유한수·색 형식 오류면 `SettingsError::Invalid`. 값을 고치지 않는다.
pub fn validate(t: &TimerSettings) -> Result<(), SettingsError> {
    let bad = |msg: &str| Err(SettingsError::Invalid(msg.to_string()));
    if !in_range(t.text_pos.x, 0.0, TEXT_POS_MAX_X) || !in_range(t.text_pos.y, 0.0, TEXT_POS_MAX_Y)
    {
        return bad("타이머 글자 위치는 캔버스 안(x 0~900, y 0~700)의 유한한 수여야 합니다.");
    }
    if !in_range(t.rotation, ROTATION_MIN, ROTATION_MAX) {
        return bad("타이머 글자 회전은 -180 ~ 180도 사이의 유한한 수여야 합니다.");
    }
    if !in_range(t.font_size, FONT_SIZE_MIN, FONT_SIZE_MAX) {
        return bad("타이머 글자 크기는 12 ~ 200px 사이의 유한한 수여야 합니다.");
    }
    if !is_hex_color(&t.color) {
        return bad("타이머 글자 색은 #rrggbb 형식(16진수 6자리)이어야 합니다.");
    }
    if !(COUNTDOWN_SECS_MIN..=COUNTDOWN_SECS_MAX).contains(&t.countdown_secs) {
        return bad("타이머 시작 시간은 00:00:01 ~ 99:59:59 사이여야 합니다.");
    }
    if t.alarm_volume > ALARM_VOLUME_MAX {
        return bad("알림음 음량은 0 ~ 100 사이여야 합니다.");
    }
    Ok(())
}

/// load 보정 — 범위로 자르고, 비유한 좌표·값은 그 값의 기본값, 색 형식 오류는 DEFAULT_COLOR,
/// 색은 소문자로. 시작 시간 0·상한 초과는 각각 기본값·상한으로, 음량 초과는 상한으로 자른다.
/// 바뀐 것이 있으면 경고 로그 1줄. 설정 전체를 기본값으로 되돌리지 않기 위해서다.
pub fn normalize(t: TimerSettings) -> TimerSettings {
    let d = TimerSettings::default();
    let fixed = TimerSettings {
        enabled: t.enabled,
        mode: t.mode,
        countdown_secs: normalize_countdown_secs(t.countdown_secs),
        alarm_volume: t.alarm_volume.min(ALARM_VOLUME_MAX),
        text_pos: Point {
            x: clamp_or(t.text_pos.x, 0.0, TEXT_POS_MAX_X, d.text_pos.x),
            y: clamp_or(t.text_pos.y, 0.0, TEXT_POS_MAX_Y, d.text_pos.y),
        },
        rotation: clamp_or(t.rotation, ROTATION_MIN, ROTATION_MAX, d.rotation),
        font_size: clamp_or(t.font_size, FONT_SIZE_MIN, FONT_SIZE_MAX, d.font_size),
        color: if is_hex_color(&t.color) {
            t.color.to_ascii_lowercase()
        } else {
            d.color
        },
    };
    if fixed != t {
        log::warn!("타이머 글자 설정을 보정해 읽습니다: {t:?} → {fixed:?}");
    }
    fixed
}

fn normalize_countdown_secs(secs: u32) -> u32 {
    if secs == 0 {
        DEFAULT_COUNTDOWN_SECS
    } else if secs > COUNTDOWN_SECS_MAX {
        COUNTDOWN_SECS_MAX
    } else {
        secs
    }
}

fn in_range(v: f64, min: f64, max: f64) -> bool {
    v.is_finite() && (min..=max).contains(&v)
}

fn clamp_or(v: f64, min: f64, max: f64, fallback: f64) -> f64 {
    if v.is_finite() {
        v.clamp(min, max)
    } else {
        fallback
    }
}

/// 정규식 크레이트 없이 `^#[0-9a-fA-F]{6}$`.
fn is_hex_color(s: &str) -> bool {
    s.strip_prefix('#')
        .is_some_and(|h| h.len() == 6 && h.bytes().all(|b| b.is_ascii_hexdigit()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::{load, save, Settings};

    /// S-T1
    #[test]
    fn timer_settings_default_values() {
        let d = TimerSettings::default();
        assert!(!d.enabled);
        assert_eq!(d.mode, TimerMode::Stopwatch);
        assert_eq!(d.countdown_secs, DEFAULT_COUNTDOWN_SECS);
        assert_eq!(d.alarm_volume, DEFAULT_ALARM_VOLUME);
        assert_eq!(d.text_pos, Point { x: 268.0, y: 402.0 });
        assert_eq!(d.rotation, 7.0);
        assert_eq!(d.font_size, 36.0);
        assert_eq!(d.color, "#333333");
        assert_eq!(Settings::default().timer, d);
        assert!(Settings::default().validate().is_ok());
    }

    /// S-T2
    #[test]
    fn old_settings_without_timer_load_with_defaults() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(
            &path,
            r##"{"scale":1.5,"idleSeconds":120,"overlay":{"x":10,"y":20,"visible":true}}"##,
        )
        .expect("write");
        let s = load(&path).expect("load").expect("some");
        assert_eq!(s.timer, TimerSettings::default());
        assert_eq!(s.scale, 1.5);
        assert_eq!(s.idle_seconds, 120);
    }

    /// S-T3
    #[test]
    fn partial_timer_object_fills_defaults() {
        let json = r##"{"timer":{"enabled":true}}"##;
        let s: Settings = serde_json::from_str(json).expect("de");
        assert!(s.timer.enabled);
        assert_eq!(s.timer.mode, TimerMode::Stopwatch);
        assert_eq!(s.timer.countdown_secs, DEFAULT_COUNTDOWN_SECS);
        assert_eq!(s.timer.alarm_volume, DEFAULT_ALARM_VOLUME);
        assert_eq!(s.timer.text_pos, TimerSettings::default().text_pos);
        assert_eq!(s.timer.rotation, TimerSettings::default().rotation);
        assert_eq!(s.timer.font_size, TimerSettings::default().font_size);
        assert_eq!(s.timer.color, TimerSettings::default().color);
    }

    /// S-T4
    #[test]
    fn out_of_range_timer_clamped_on_load() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(
            &path,
            r##"{"scale":1.5,"timer":{"rotation":999,"fontSize":1,"textPos":{"x":-5,"y":9999}}}"##,
        )
        .expect("write");
        let s = load(&path).expect("load").expect("some");
        assert_eq!(s.timer.rotation, ROTATION_MAX);
        assert_eq!(s.timer.font_size, FONT_SIZE_MIN);
        assert_eq!(
            s.timer.text_pos,
            Point {
                x: 0.0,
                y: TEXT_POS_MAX_Y
            }
        );
        assert_eq!(s.scale, 1.5);
    }

    /// S-T5
    #[test]
    fn invalid_color_falls_back_on_load() {
        for bad in ["red", "#12345", "#GGGGGG", ""] {
            let dir = tempfile::tempdir().expect("tempdir");
            let path = dir.path().join("settings.json");
            std::fs::write(&path, format!(r##"{{"timer":{{"color":"{bad}"}}}}"##)).expect("write");
            let s = load(&path).expect("load").expect("some");
            assert_eq!(s.timer.color, DEFAULT_COLOR, "bad color: {bad}");
        }
    }

    /// S-T6
    #[test]
    fn color_lowercased_on_load() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(&path, r##"{"timer":{"color":"#AbCdEf"}}"##).expect("write");
        let s = load(&path).expect("load").expect("some");
        assert_eq!(s.timer.color, "#abcdef");
    }

    /// S-T7
    #[test]
    fn validate_rejects_out_of_range_timer() {
        let base = TimerSettings::default();
        let bad_cases = [
            TimerSettings {
                text_pos: Point { x: -0.01, y: 0.0 },
                ..base.clone()
            },
            TimerSettings {
                text_pos: Point { x: 900.01, y: 0.0 },
                ..base.clone()
            },
            TimerSettings {
                text_pos: Point { x: 0.0, y: 700.01 },
                ..base.clone()
            },
            TimerSettings {
                rotation: -180.01,
                ..base.clone()
            },
            TimerSettings {
                rotation: 180.01,
                ..base.clone()
            },
            TimerSettings {
                font_size: 11.99,
                ..base.clone()
            },
            TimerSettings {
                font_size: 200.01,
                ..base.clone()
            },
        ];
        for t in bad_cases {
            assert!(validate(&t).is_err(), "{t:?} 는 거부돼야 한다");
        }

        let ok_cases = [
            TimerSettings {
                text_pos: Point { x: 0.0, y: 0.0 },
                ..base.clone()
            },
            TimerSettings {
                text_pos: Point { x: 900.0, y: 700.0 },
                ..base.clone()
            },
            TimerSettings {
                rotation: -180.0,
                ..base.clone()
            },
            TimerSettings {
                rotation: 180.0,
                ..base.clone()
            },
            TimerSettings {
                font_size: 12.0,
                ..base.clone()
            },
            TimerSettings {
                font_size: 200.0,
                ..base
            },
        ];
        for t in ok_cases {
            assert!(validate(&t).is_ok(), "{t:?} 는 통과해야 한다");
        }
    }

    /// S-T8
    #[test]
    fn validate_rejects_bad_color() {
        let base = TimerSettings::default();
        for bad in ["#12345", "123456", "#12345g", "#1234567"] {
            let t = TimerSettings {
                color: bad.to_string(),
                ..base.clone()
            };
            assert!(validate(&t).is_err(), "{bad} 는 거부돼야 한다");
        }
        for ok in ["#ABCDEF", "#abcdef"] {
            let t = TimerSettings {
                color: ok.to_string(),
                ..base.clone()
            };
            assert!(validate(&t).is_ok(), "{ok} 는 통과해야 한다");
        }
    }

    /// S-T9
    #[test]
    fn validate_rejects_non_finite() {
        let base = TimerSettings::default();
        for t in [
            TimerSettings {
                text_pos: Point {
                    x: f64::NAN,
                    y: 0.0,
                },
                ..base.clone()
            },
            TimerSettings {
                rotation: f64::INFINITY,
                ..base.clone()
            },
            TimerSettings {
                font_size: f64::NEG_INFINITY,
                ..base
            },
        ] {
            assert!(validate(&t).is_err());
        }
    }

    /// S-T10
    #[test]
    fn normalize_non_finite_uses_field_default() {
        let d = TimerSettings::default();
        let t = TimerSettings {
            text_pos: Point {
                x: f64::NAN,
                y: 10.0,
            },
            rotation: f64::INFINITY,
            font_size: f64::NEG_INFINITY,
            ..d.clone()
        };
        let fixed = normalize(t);
        assert_eq!(fixed.text_pos.x, d.text_pos.x);
        assert_eq!(fixed.text_pos.y, 10.0);
        assert_eq!(fixed.rotation, d.rotation);
        assert_eq!(fixed.font_size, d.font_size);
    }

    /// S-T12 (CR-048 갱신 — 새 필드 3개 포함)
    #[test]
    fn timer_serializes_camel_case() {
        let json = serde_json::to_string(&Settings::default()).expect("ser");
        assert!(json.contains(
            "\"timer\":{\"enabled\":false,\"mode\":\"stopwatch\",\"countdownSecs\":1500,\
             \"alarmVolume\":44,\"textPos\":{\"x\":268.0,\"y\":402.0},\
             \"rotation\":7.0,\"fontSize\":36.0,\"color\":\"#333333\"}"
        ));
    }

    /// S-T12b: save/load 왕복(CR-048 갱신 — 새 필드 3개).
    #[test]
    fn timer_round_trips_through_save_load() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let s = Settings {
            timer: TimerSettings {
                enabled: true,
                mode: TimerMode::Countdown,
                countdown_secs: 3661,
                alarm_volume: 42,
                text_pos: Point { x: 100.0, y: 200.0 },
                rotation: -10.0,
                font_size: 50.0,
                color: "#abcdef".to_string(),
            },
            ..Default::default()
        };
        save(&path, &s).expect("save");
        assert_eq!(load(&path).expect("load"), Some(s));
    }

    /// S-T13
    #[test]
    fn timer_mode_default_is_stopwatch() {
        let d = TimerSettings::default();
        assert_eq!(d.mode, TimerMode::Stopwatch);
        assert_eq!(d.countdown_secs, DEFAULT_COUNTDOWN_SECS);
        assert_eq!(d.alarm_volume, DEFAULT_ALARM_VOLUME);
        assert_eq!(Settings::default().timer, d);
        assert!(Settings::default().validate().is_ok());
    }

    /// S-T14 (TM-02)
    #[test]
    fn old_timer_enabled_true_reads_as_stopwatch() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(&path, r##"{"timer":{"enabled":true}}"##).expect("write");
        let s = load(&path).expect("load").expect("some");
        assert!(s.timer.enabled);
        assert_eq!(s.timer.mode, TimerMode::Stopwatch);
        assert_eq!(s.timer.countdown_secs, DEFAULT_COUNTDOWN_SECS);
        assert_eq!(s.timer.alarm_volume, DEFAULT_ALARM_VOLUME);
    }

    /// S-T15
    #[test]
    fn unknown_mode_falls_back_to_stopwatch() {
        let json =
            r##"{"scale":1.5,"timer":{"enabled":true,"mode":"pomodoro","countdownSecs":60}}"##;
        let s: Settings = serde_json::from_str(json).expect("de");
        assert_eq!(s.timer.mode, TimerMode::Stopwatch);
        assert!(s.timer.enabled);
        assert_eq!(s.timer.countdown_secs, 60);
        assert_eq!(s.scale, 1.5);

        let json2 = r##"{"timer":{"mode":5}}"##;
        let s2: Settings = serde_json::from_str(json2).expect("de");
        assert_eq!(s2.timer.mode, TimerMode::Stopwatch);
    }

    /// S-T16
    #[test]
    fn countdown_secs_validate_bounds() {
        let base = TimerSettings::default();
        for bad in [0, COUNTDOWN_SECS_MAX + 1] {
            let t = TimerSettings {
                countdown_secs: bad,
                ..base.clone()
            };
            assert!(validate(&t).is_err(), "{bad} 는 거부돼야 한다");
        }
        for ok in [COUNTDOWN_SECS_MIN, COUNTDOWN_SECS_MAX] {
            let t = TimerSettings {
                countdown_secs: ok,
                ..base.clone()
            };
            assert!(validate(&t).is_ok(), "{ok} 는 통과해야 한다");
        }
    }

    /// S-T17
    #[test]
    fn countdown_secs_normalize_on_load() {
        for (raw, expected) in [
            (r#""countdownSecs":0"#, 1500u32),
            (r#""countdownSecs":999999"#, 359_999),
            (r#""countdownSecs":-5"#, 1500),
            (r#""countdownSecs":"abc""#, 1500),
            (r#""countdownSecs":12.7"#, 12),
        ] {
            let dir = tempfile::tempdir().expect("tempdir");
            let path = dir.path().join("settings.json");
            std::fs::write(
                &path,
                format!(r##"{{"scale":1.5,"timer":{{"color":"#abcdef",{raw}}}}}"##),
            )
            .expect("write");
            let s = load(&path).expect("load").expect("some");
            assert_eq!(s.timer.countdown_secs, expected, "raw={raw}");
            assert_eq!(s.scale, 1.5);
            assert_eq!(s.timer.color, "#abcdef");
        }
    }

    /// S-T18
    #[test]
    fn alarm_volume_validate_and_normalize() {
        let base = TimerSettings::default();
        assert!(validate(&TimerSettings {
            alarm_volume: 101,
            ..base.clone()
        })
        .is_err());
        assert!(validate(&TimerSettings {
            alarm_volume: 100,
            ..base.clone()
        })
        .is_ok());
        assert!(validate(&TimerSettings {
            alarm_volume: 0,
            ..base.clone()
        })
        .is_ok());

        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::write(&path, r##"{"timer":{"alarmVolume":101}}"##).expect("write");
        let s = load(&path).expect("load").expect("some");
        assert_eq!(s.timer.alarm_volume, 100);

        let path2 = dir.path().join("settings2.json");
        std::fs::write(&path2, r##"{"timer":{"alarmVolume":"loud"}}"##).expect("write");
        let s2 = load(&path2).expect("load").expect("some");
        assert_eq!(s2.timer.alarm_volume, DEFAULT_ALARM_VOLUME);
    }

    /// S-T19
    #[test]
    fn timer_settings_new_fields_round_trip() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let s = Settings {
            timer: TimerSettings {
                mode: TimerMode::Countdown,
                countdown_secs: 3661,
                alarm_volume: 0,
                ..TimerSettings::default()
            },
            ..Default::default()
        };
        save(&path, &s).expect("save");
        assert_eq!(load(&path).expect("load"), Some(s));
    }
}
