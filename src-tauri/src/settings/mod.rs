//! 설정 JSON 읽기·쓰기·기본값·검증.
//!
//! [목적] 확정사항 §3·§5·§6 의 사용자 설정을 `%APPDATA%/com.kuro.keyviewer/settings.json` 에 보관.
//! [공개 API] `Settings`(+하위 구조체), `Language`, `TimerSettings`(timer.rs), `load_or_default`,
//!        `load`, `Settings::validate`, `SettingsError`, `IDLE_SECONDS_MIN`, `IDLE_SECONDS_MAX`,
//!        `update`·`SaveOutcome`(store.rs, CR-047 저장 단일 창구), `write_atomic`(atomic.rs, CR-047
//!        공용 원자적 쓰기 — assets 매니페스트도 재사용), `read_capped_string`·`MAX_TEXT_FILE_BYTES`
//!        (atomic.rs, 텍스트 파일 상한 읽기). `save`는 비공개(CR-047 ③단계) — 밖에서는 `update`를 쓴다.
//! [규칙] scale 0.25~2 / idleSeconds 60~3600(읽기는 보정) / mouse 가 있으면 area 네 점이
//!        유한수(볼록성·순서는 검사 안 함). language·positionLock·showInTaskbar 는 검증 없음(SV2).
//!        timer 위치·회전·크기·색(읽기는 보정, CR-045).
//! [저장] `update`가 설정 잠금 안에서 검증·원자적 교체·메모리 대입을 한 번에 하는 유일한
//!        창구다(CR-047). 파일 교체는 `write_atomic`(고유 임시 파일 → `sync_all` → rename).
//!        손상된 파일은 기본값으로 대체하고 로그를 남긴다.
//! [직렬화] camelCase — TS `Settings` 와 1:1.
//! [호환] 모르는 키(옛 slam·armWidth·armColor·pad)는 값·형식과 무관하게 무시, 누락 키
//!        (area·partPos·hand·penPos·penMode·language·positionLock·showInTaskbar·timer)는 기본값으로 채운다.
//!        모르는 language 값(다른 문자열·null·숫자·객체)은 ko 로 읽는다(SV2-02).
//!        penMode 는 bool 이 아니면(null·문자열·숫자) Format 오류(관용 읽기 아님, D27).
//! [unsafe] 없음.
//! [테스트] 기본값 유효, 저장/복원 왕복(tempdir), 범위 밖 값 거부, 파일 없음 → 기본값,
//!          area 유한수 검사·임의 모양 허용, 옛 pad 파일 호환, 옛 slam 키 무시(쾅 폐기, CR-019),
//!          새 필드 3개 기본·관용 언어·직렬화 키·읽기 clamp(SV2),
//!          penMode 기본·옛 파일·왕복(CR-033, pen_mode_tests.rs),
//!          penPos 기본·null 유지(pen_pos_tests.rs N1′~N6, CR-035),
//!          타이머 설정(timer.rs, CR-045),
//!          1MiB 상한 초과 파일 → 기본값 대체(SEC-205, atomic.rs AW7과 함께).

use std::path::Path;

#[cfg(test)]
use std::fs;

use serde::{Deserialize, Deserializer, Serialize};

pub mod timer;
pub use timer::TimerSettings;

mod atomic;
mod store;
pub use atomic::{read_capped_string, write_atomic, MAX_TEXT_FILE_BYTES};
pub use store::{update, SaveOutcome};

pub const SCALE_MIN: f64 = 0.25;
pub const SCALE_MAX: f64 = 2.0;
/// 유휴 시간 범위(초) — 설정 창 1~60분(SV2-12). TS·계약 §3.3과 같은 값.
pub const IDLE_SECONDS_MIN: u32 = 60;
pub const IDLE_SECONDS_MAX: u32 = 3600;

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlaySettings {
    pub x: i32,
    pub y: i32,
    pub visible: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MouseSettings {
    /// 마우스 파츠가 회전하는 축인 어깨 고정점(캔버스 좌표)
    pub shoulder: Point,
    /// 손이 움직이는 자유 사각형 이동 영역(캔버스 좌표). 순서 [왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래].
    /// ui 가 커서가 있는 모니터 안의 비율 (u, v)를 네 점에 쌍선형 보간해 손 목표점을 구한다(CR-017).
    /// 키가 없는 옛 settings.json 은 기본값으로 채운다(옛 `pad` 키는 모르는 키라 무시된다).
    #[serde(default = "default_area")]
    pub area: [Point; 4],
    /// 마우스 파츠 그림(기본·왼클릭·오른클릭 공통)의 왼쪽 위 모서리를 놓을 캔버스 좌표.
    /// 캔버스 전체 크기 그림이면 (0, 0). 키가 없는 옛 settings.json 은 기본값으로 채운다.
    #[serde(default = "default_part_pos")]
    pub part_pos: Point,
    /// 회전 기준점의 폴백(캔버스 좌표). 1순위는 mouse_base 에서 자동 계산한 끝부분 무게중심
    /// (assets::compute_hand_anchor), 이것이 없을 때 이 값, 이것도 None 이면 ui 가 이동 영역 중심
    /// (네 꼭짓점 평균)을 쓴다.
    #[serde(default)]
    pub hand: Option<Point>,
    /// 펜 쥔 손 그림(pen_up·pen_down_N·pen_key_*)의 왼쪽 위 모서리 캔버스 좌표 — 쉬는 자세(회전 0°·배율 1)
    /// 기준(CR-024). 기본값(default_mouse) (356, 504) = 배포용 기본 세트 pen_up(136×196, CR-038)을
    /// 사용자가 끌어다 놓은 자리. None = 아직 놓지 않음 — 손 그림을 처음 등록하면 ui 가 정한다.
    /// 키가 없는 옛 settings.json 과 `"penPos": null` 은 None(필드 default — default_mouse 값을 쓰지 않는다).
    #[serde(default)]
    pub pen_pos: Option<Point>,
    /// 펜 손 사용 토글(CR-033). true 면 ui 가 키보드 입력(과 CR-027 클릭) 때 펜 손 그림을 바꾸고
    /// 키보드 레이어를 kb_up 에 고정한다. false 면 pen_up 을 팔 끝에 붙인 채 바꾸지 않는다.
    /// pen_up 등록 여부와 무관하게 저장만 한다(해석은 ui). 키가 없는 옛 settings.json 은 false
    /// (필드 default 는 `bool::default()` — `default_mouse()` 값을 쓰지 않는다).
    #[serde(default)]
    pub pen_mode: bool,
}

/// 마우스 파츠 위치 기본값 — CR-038 에서 바꾸지 않는다(사용자 확정, partPos·area 유지).
/// TS DEFAULT_MOUSE_SETTINGS.partPos 와 1:1.
/// (이력: 처음 근거는 예시 mouse_pen_hand.png(202×154)가 900×700 그림에 놓여 있던 자리, 2026-09-23.
/// CR-035 기본 세트 mouse_base(202×154)도 이 값을 그대로 썼다. CR-038 배포용 세트(mouse_base
/// 171×199)로 바뀐 뒤에도 이 좌표는 그대로 — 재조정은 designer 몫.)
fn default_part_pos() -> Point {
    Point { x: 389.0, y: 492.0 }
}

/// 이동 영역 기본값 — CR-038 에서 바꾸지 않는다(사용자 확정, partPos·area 유지).
/// 손 기준점 둘레의 120×100 직사각형, 늘어나기 배율 허용 0.5~1.6(확정사항 §3, CR-017).
/// TS DEFAULT_MOUSE_SETTINGS.area 와 1:1.
/// (이력: 2026-09-23 재조정 근거는 예시 mouse_pen_hand.png 를 part_pos (389, 492)에 둘 때의 기준점
/// (435.06, 575.27)과 어깨 (620, 530) 기준 배율 1.287 / 0.657 / 0.825 / 1.38 — I1 실측. CR-038 로
/// 어깨가 (558, 500)으로 바뀌었지만 area 좌표 자체는 바꾸지 않는다 — 새 배율은 mouse_area_defaults
/// 테스트가 실측한다.)
fn default_area() -> [Point; 4] {
    [
        Point { x: 375.0, y: 525.0 }, // 왼쪽 위
        Point { x: 495.0, y: 525.0 }, // 오른쪽 위
        Point { x: 495.0, y: 625.0 }, // 오른쪽 아래
        Point { x: 375.0, y: 625.0 }, // 왼쪽 아래
    ]
}

/// 설정 창 표시 언어(SV2-02). core 는 값을 저장만 하고 문구 번역은 ui 가 한다.
/// JSON "ko" | "ja" | "en". 그 밖의 값(다른 문자열·대소문자 다름·null·숫자·객체)은 Ko 로 읽는다 —
/// settings.json 전체 읽기 실패·set_settings 인자 오류가 나지 않게(D20).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    #[default]
    Ko,
    Ja,
    En,
}

impl Language {
    /// "ja"·"en" 과 정확히 같을 때만 해당 값, 그 밖은 Ko.
    fn from_code(code: &str) -> Self {
        match code {
            "ja" => Self::Ja,
            "en" => Self::En,
            _ => Self::Ko,
        }
    }
}

impl<'de> Deserialize<'de> for Language {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        // 어떤 JSON 값이든 먼저 받아 두고(형식 오류 없음) 문자열일 때만 해석한다.
        let value = serde_json::Value::deserialize(deserializer)?;
        Ok(Self::from_code(value.as_str().unwrap_or_default()))
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// 표시 배율 0.25 ~ 2
    pub scale: f64,
    /// 무입력 후 쉬는중 전환까지의 초
    pub idle_seconds: u32,
    pub overlay: OverlaySettings,
    /// 마우스 파츠를 쓰지 않으면 None
    pub mouse: Option<MouseSettings>,
    /// 자동 실행 작업 등록 여부(SV2-05). 쓰기 주체는 core 뿐 — set_autostart(tray::autostart 성공 뒤)와
    /// 시작 시 조회 보정. set_settings 입력값은 무시된다(window::keep_core_owned).
    pub autostart: bool,
    /// 설정 창 언어(SV2-02). 키가 없는 옛 settings.json 은 Ko.
    pub language: Language,
    /// 위치 잠금(SV2-03). true 면 오버레이가 마우스 클릭을 통과시킨다(window::apply_overlay_window).
    pub position_lock: bool,
    /// 오버레이를 작업표시줄에 보일지(SV2-04). 기본 false = 현행(tauri.conf.json skipTaskbar: true)과 같다.
    pub show_in_taskbar: bool,
    /// 뽀모도 타이머 시간 글자 표시 설정(CR-045). ui 소유 — set_settings가 그대로 바꾼다.
    /// 경과·실행 상태는 crate::timer(휘발).
    pub timer: TimerSettings,
}

/// 기본 마우스 파츠 설정 — 배포용 기본 세트 2차 교체(CR-044, 2026-09-26 사용자 확정) 기준.
/// TS DEFAULT_MOUSE_SETTINGS 와 1:1.
pub fn default_mouse() -> MouseSettings {
    MouseSettings {
        // CR-044: 배포용 기본 세트 2차 교체(캔버스 900×700) 기준 어깨 고정점(사용자 확정).
        // 이전 기본값(CR-038): (558.0, 500.0).
        shoulder: Point { x: 582.0, y: 484.0 },
        // area 는 CR-044 에서 바꾸지 않는다(사용자 확정) — 기존 값 그대로.
        area: default_area(),
        // CR-044: mouse_base(168×151) 를 사용자가 끌어다 놓은 자리(사용자 확정). old-file 호환용
        // 마이그레이션 기본값(default_part_pos, (389, 492))과는 다르다 — 그쪽은 그대로 둔다.
        // 이전 기본값(CR-038): (389.0, 492.0)(= default_part_pos()).
        part_pos: Point { x: 411.0, y: 464.0 },
        // CR-007(2026-09-23): 손 기준점은 mouse_base 이미지에서 자동 계산한다(assets::compute_hand_anchor).
        // hand 는 자동 계산이 실패할 때만 쓰는 폴백이라 기본값이 없다.
        // 이전 기본값(예시 몸통 기준) — 사용자 지정으로 삭제하지 않고 보존:
        // hand: Some(Point { x: 495.0, y: 570.0 }),
        hand: None,
        // CR-044: 배포용 기본 세트 2차 교체 pen_up(119×196)을 사용자가 끌어다 놓은 자리(사용자 확정).
        // 이전 기본값(CR-038): Some(356.0, 504.0) — 이전 pen_up(136×196) 기준.
        pen_pos: Some(Point { x: 372.0, y: 476.0 }),
        // CR-044: 배포용 기본 세트는 펜 손 모드를 기본으로 켠다(CR-038 유지, 사용자 확정).
        pen_mode: true,
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            scale: 1.0,
            idle_seconds: 300,
            overlay: OverlaySettings {
                x: 100,
                y: 100,
                visible: true,
            },
            mouse: Some(default_mouse()),
            autostart: false,
            language: Language::Ko,
            position_lock: false,
            show_in_taskbar: false,
            timer: TimerSettings::default(),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SettingsError {
    #[error("설정값이 올바르지 않습니다: {0}")]
    Invalid(String),
    #[error("설정 파일을 읽거나 쓸 수 없습니다: {0}")]
    Io(#[from] std::io::Error),
    #[error("설정 파일 형식이 올바르지 않습니다: {0}")]
    Format(#[from] serde_json::Error),
    #[error("설정 상태가 손상되었습니다. 앱을 다시 시작하세요.")]
    StatePoisoned,
}

impl SettingsError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Invalid(_) => "settings.invalid",
            Self::Io(_) => "settings.io",
            Self::Format(_) => "settings.format",
            Self::StatePoisoned => "state.poisoned",
        }
    }
}

impl Settings {
    pub fn validate(&self) -> Result<(), SettingsError> {
        let bad = |msg: &str| Err(SettingsError::Invalid(msg.to_string()));
        if !(SCALE_MIN..=SCALE_MAX).contains(&self.scale) || !self.scale.is_finite() {
            return bad("배율은 0.25 ~ 2 사이여야 합니다.");
        }
        if !(IDLE_SECONDS_MIN..=IDLE_SECONDS_MAX).contains(&self.idle_seconds) {
            return bad("유휴 시간은 60 ~ 3600초(1 ~ 60분) 사이여야 합니다.");
        }
        if let Some(m) = &self.mouse {
            if m.area.iter().any(|p| !p.x.is_finite() || !p.y.is_finite()) {
                return bad("이동 영역의 네 꼭짓점 좌표는 유한한 수여야 합니다.");
            }
        }
        timer::validate(&self.timer)?;
        Ok(())
    }
}

/// 파일이 없거나 손상됐으면 기본값 (손상은 경고 로그).
pub fn load_or_default(path: &Path) -> Settings {
    match load(path) {
        Ok(Some(s)) => s,
        Ok(None) => Settings::default(),
        Err(e) => {
            log::warn!(
                "설정 파일을 읽지 못해 기본값을 씁니다 (파일={}): {e}",
                path.file_name()
                    .map(|n| n.to_string_lossy())
                    .unwrap_or_default()
            );
            Settings::default()
        }
    }
}

/// 파일이 없으면 Ok(None).
pub fn load(path: &Path) -> Result<Option<Settings>, SettingsError> {
    if !path.exists() {
        return Ok(None);
    }
    // SEC-205: 상한(1MiB)을 넘는 파일은 읽지 않는다 — Io 오류가 돼 load_or_default가 기존
    // "손상된 파일" 경로(기본값 대체)를 그대로 탄다.
    let text = atomic::read_capped_string(path, atomic::MAX_TEXT_FILE_BYTES)?;
    let mut settings: Settings = serde_json::from_str(&text)?;
    // 범위 밖 유휴 시간은 거부 대신 보정한다 — 옛 파일이 이 한 필드 때문에 위치·마우스
    // 설정까지 통째로 기본값으로 대체되지 않게 한다(D24).
    let clamped = settings
        .idle_seconds
        .clamp(IDLE_SECONDS_MIN, IDLE_SECONDS_MAX);
    if clamped != settings.idle_seconds {
        log::warn!(
            "유휴 시간 {}초가 범위 밖이라 {}초로 읽습니다",
            settings.idle_seconds,
            clamped
        );
        settings.idle_seconds = clamped;
    }
    // 타이머 글자 설정도 거부 대신 보정한다(CR-045, 유휴 시간 보정과 같은 이유).
    settings.timer = timer::normalize(settings.timer);
    settings.validate()?;
    Ok(Some(settings))
}

/// 검증 후 원자적으로 저장(고유 임시 파일 → `sync_all` → rename 한 번, CORE-002).
/// 비공개(CR-047 ③단계) — settings 모듈과 그 하위 모듈(store.rs·timer.rs·테스트)에서만 쓴다.
/// 밖에서 설정을 바꿀 때는 `update`를 쓴다 — 잠금 안에서 검증·저장·메모리 대입을
/// 한 번에 하는 창구는 `update` 하나다(CR-047).
fn save(path: &Path, settings: &Settings) -> Result<(), SettingsError> {
    settings.validate()?;
    write_atomic(path, serde_json::to_string_pretty(settings)?.as_bytes())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_is_valid_and_camel_case() {
        let s = Settings::default();
        assert!(s.validate().is_ok());
        let json = serde_json::to_string(&s).expect("ser");
        assert!(json.contains("\"idleSeconds\":300"));
        assert!(!json.contains("\"slam\""));
        assert!(!json.contains("\"keys\""));
        assert!(!json.contains("\"durationMs\""));
        assert!(json.contains("\"partPos\":{\"x\":411.0,\"y\":464.0}"));
        assert!(json.contains(
            "\"area\":[{\"x\":375.0,\"y\":525.0},{\"x\":495.0,\"y\":525.0},\
             {\"x\":495.0,\"y\":625.0},{\"x\":375.0,\"y\":625.0}]"
        ));
        assert!(!json.contains("\"pad\""));
        assert!(!json.contains("armWidth"));
        assert!(!json.contains("armColor"));
    }

    #[test]
    fn save_and_load_round_trip() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        assert_eq!(load(&path).expect("load"), None);

        let mut s = Settings {
            scale: 1.5,
            ..Default::default()
        };
        s.mouse = Some(MouseSettings {
            shoulder: Point { x: 300.0, y: 340.0 },
            area: [
                Point { x: 380.0, y: 200.0 },
                Point { x: 580.0, y: 210.0 },
                Point { x: 570.0, y: 330.0 },
                Point { x: 390.0, y: 320.0 },
            ],
            part_pos: Point { x: 10.0, y: 20.0 },
            hand: None,
            pen_pos: None,
            pen_mode: false,
        });
        save(&path, &s).expect("save");
        assert_eq!(load(&path).expect("load"), Some(s.clone()));

        // 두 번째 저장(덮어쓰기)도 성공해야 한다
        s.scale = 2.0;
        save(&path, &s).expect("save again");
        assert_eq!(load_or_default(&path).scale, 2.0);
    }

    #[test]
    fn rejects_out_of_range_values() {
        let mut s = Settings {
            scale: 5.0,
            ..Default::default()
        };
        assert!(s.validate().is_err());
        s.scale = 1.0;
        s.idle_seconds = 0;
        assert!(s.validate().is_err());
    }

    #[test]
    fn corrupted_file_falls_back_to_default() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        fs::write(&path, "{ not json").expect("write");
        assert_eq!(load_or_default(&path), Settings::default());
    }

    /// SEC-205: 1MiB 를 넘는 settings.json 은 읽지 않고 기본값으로 대체한다(기존 손상 파일 경로).
    #[test]
    fn oversized_file_falls_back_to_default() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let mut json = br#"{"scale": 1.5, "pad": ""#.to_vec();
        json.extend(vec![b'x'; atomic::MAX_TEXT_FILE_BYTES as usize]);
        json.extend_from_slice(br#""}"#);
        fs::write(&path, &json).expect("write");
        assert!(json.len() as u64 > atomic::MAX_TEXT_FILE_BYTES);

        assert!(matches!(load(&path), Err(SettingsError::Io(_))));
        assert_eq!(load_or_default(&path), Settings::default());
    }

    /// CR-007: 손 기준점은 자동 계산이 1순위라 기본 폴백 값이 없다.
    #[test]
    fn default_mouse_hand_is_none() {
        assert_eq!(default_mouse().hand, None);
    }

    /// CR-007: 기본 설정 직렬화에 `hand:null`이 들어가고, JSON 왕복 결과가 기본값과 같다.
    #[test]
    fn default_settings_serializes_hand_as_null_and_round_trips() {
        let s = Settings::default();
        let json = serde_json::to_string(&s).expect("ser");
        assert!(json.contains("\"hand\":null"));
        let back: Settings = serde_json::from_str(&json).expect("de");
        assert_eq!(back, s);
    }

    /// U4: 모르는 키(옛 armWidth·armColor·pad)는 무시하고, 없는 키(area·hand·partPos)는 기본값이 된다.
    #[test]
    fn old_mouse_json_is_read_with_defaults() {
        let json = r##"{
            "shoulder": {"x": 1.0, "y": 2.0},
            "pad": {"x": 0.0, "y": 0.0, "width": 10.0, "height": 10.0},
            "armWidth": 5.0,
            "armColor": "#000000"
        }"##;
        let m: MouseSettings = serde_json::from_str(json).expect("de");
        assert_eq!(m.hand, None);
        assert_eq!(m.area, default_area());
        assert_eq!(m.part_pos, Point { x: 389.0, y: 492.0 });
    }

    /// U5(CR-044 갱신): 기본 마우스 위치는 (411, 464) — default_part_pos()(구 파일 호환용,
    /// (389, 492))와는 다른 값이다.
    #[test]
    fn default_mouse_part_pos_is_default_point() {
        assert_eq!(default_mouse().part_pos, Point { x: 411.0, y: 464.0 });
        assert_eq!(default_part_pos(), Point { x: 389.0, y: 492.0 });
    }

    /// U6(CR-017 교체): area 의 점 하나라도 비유한수면 거부한다.
    #[test]
    fn area_rejects_non_finite_points() {
        let mut s = Settings::default();
        if let Some(m) = &mut s.mouse {
            m.area[2].x = f64::NAN;
        }
        assert!(matches!(s.validate(), Err(SettingsError::Invalid(_))));

        let mut s = Settings::default();
        if let Some(m) = &mut s.mouse {
            m.area[0].y = f64::INFINITY;
        }
        assert!(matches!(s.validate(), Err(SettingsError::Invalid(_))));

        let mut s = Settings::default();
        if let Some(m) = &mut s.mouse {
            m.area[3].x = f64::NEG_INFINITY;
        }
        assert!(matches!(s.validate(), Err(SettingsError::Invalid(_))));
    }

    /// U9: 볼록성·순서·캔버스 범위를 검사하지 않는다 — 어떤 사각형 모양도 허용한다.
    #[test]
    fn area_accepts_any_quad_shape() {
        let shapes: [[Point; 4]; 4] = [
            [Point { x: 500.0, y: 500.0 }; 4],
            [
                Point { x: 430.0, y: 515.0 },
                Point { x: 550.0, y: 615.0 },
                Point { x: 550.0, y: 515.0 },
                Point { x: 430.0, y: 615.0 },
            ],
            [
                Point { x: 0.0, y: 0.0 },
                Point { x: 100.0, y: 0.0 },
                Point { x: 20.0, y: 20.0 },
                Point { x: 0.0, y: 100.0 },
            ],
            [
                Point {
                    x: -100.0,
                    y: -50.0,
                },
                Point { x: 2000.0, y: 0.0 },
                Point {
                    x: 2000.0,
                    y: 1500.0,
                },
                Point {
                    x: -100.0,
                    y: 1500.0,
                },
            ],
        ];
        for area in shapes {
            let mut s = Settings::default();
            if let Some(m) = &mut s.mouse {
                m.area = area;
            }
            assert!(s.validate().is_ok(), "area {area:?} 는 허용돼야 한다");
        }
    }

    /// U10: 기본 영역은 (430,515)~(550,615) 직사각형, 인덱스 순서 = 왼위·오위·오아래·왼아래.
    #[test]
    fn default_mouse_area_is_default_rectangle() {
        let area = default_mouse().area;
        assert_eq!(area, default_area());
        assert_eq!(area[0].y, area[1].y);
        assert_eq!(area[1].x, area[2].x);
        assert_eq!(area[2].y, area[3].y);
        assert_eq!(area[3].x, area[0].x);
        assert!(area[0].x < area[1].x);
        assert!(area[0].y < area[3].y);
    }

    /// U11: 기본 영역의 네 꼭짓점은 어깨→실측 손 기준점(2026-09-23 재조정, I1) 늘어나기 배율
    /// 0.5~1.6 안에 있다.
    #[test]
    fn default_area_within_stretch_range_of_estimated_anchor() {
        const K_MIN: f64 = 0.5;
        const K_MAX: f64 = 1.6;
        let s = Point { x: 620.0, y: 530.0 };
        let a = Point {
            x: 435.06,
            y: 575.27,
        };
        let base = ((a.x - s.x).powi(2) + (a.y - s.y).powi(2)).sqrt();
        for c in default_area() {
            let d = ((c.x - s.x).powi(2) + (c.y - s.y).powi(2)).sqrt();
            let k = d / base;
            assert!(
                (K_MIN..=K_MAX).contains(&k),
                "꼭짓점 {c:?} 의 늘어나기 배율 {k} 가 범위 밖"
            );
        }
    }

    /// U12: area 길이가 4가 아니면 형식 오류.
    #[test]
    fn area_with_wrong_length_is_format_error() {
        let json = r##"{
            "shoulder": {"x": 620.0, "y": 530.0},
            "area": [{"x":1.0,"y":1.0},{"x":2.0,"y":2.0},{"x":3.0,"y":3.0}]
        }"##;
        let result: Result<MouseSettings, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }

    /// U7: 옛 형식 전체 파일(armWidth/armColor 있음, partPos 없음)을 그대로 읽고,
    /// 다시 저장하면 armWidth 는 사라지고 partPos 가 생긴다.
    #[test]
    fn old_settings_file_round_trips_to_new_schema() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let old_json = r##"{
            "scale": 1.0,
            "idleSeconds": 300,
            "slam": { "keys": 6, "durationMs": 300 },
            "overlay": { "x": 100, "y": 100, "visible": true },
            "mouse": {
                "shoulder": {"x": 620.0, "y": 530.0},
                "pad": {"x": 250.0, "y": 560.0, "width": 160.0, "height": 90.0},
                "armWidth": 22.0,
                "armColor": "#e53935"
            },
            "autostart": false
        }"##;
        fs::write(&path, old_json).expect("write old");

        let loaded = load(&path).expect("load").expect("some");
        assert_eq!(
            loaded.mouse.as_ref().expect("mouse").part_pos,
            Point { x: 389.0, y: 492.0 }
        );
        assert_eq!(loaded.mouse.as_ref().expect("mouse").area, default_area());

        save(&path, &loaded).expect("save");
        let text = fs::read_to_string(&path).expect("read back");
        assert!(!text.contains("armWidth"));
        assert!(!text.contains("armColor"));
        assert!(!text.contains("\"pad\""));
        assert!(!text.contains("\"slam\""));
        assert!(text.contains("partPos"));
        assert!(text.contains("\"area\""));
    }

    /// C4: 옛 파일의 `slam` 이 규칙 위반 값(1키, 0ms)이어도 무시하고 나머지 필드는 읽힌다.
    #[test]
    fn old_invalid_slam_is_ignored_on_load() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        fs::write(
            &path,
            r##"{"idleSeconds": 60, "slam": {"keys": 1, "durationMs": 0}}"##,
        )
        .expect("write");

        let loaded = load(&path).expect("load").expect("some");
        assert_eq!(loaded.idle_seconds, 60);
        assert_eq!(load_or_default(&path).idle_seconds, 60);
    }

    /// C5: 옛 `slam` 값이 어떤 형식(문자열·숫자·null·배열)이어도 모르는 키로 무시된다.
    #[test]
    fn old_slam_of_any_shape_is_ignored() {
        for json in [
            r##"{"slam": "x"}"##,
            r##"{"slam": 42}"##,
            r##"{"slam": null}"##,
            r##"{"slam": [1, 2]}"##,
        ] {
            let s: Settings = serde_json::from_str(json).expect("de");
            assert_eq!(s, Settings::default(), "json: {json}");
        }
    }

    // ─── settings-v2: language·positionLock·showInTaskbar·유휴 범위 ───────────

    /// V1: 새 필드 없는 옛 파일 → 기본값(Ko/false/false), 다른 필드는 그대로.
    #[test]
    fn settings_old_file_defaults_new_fields() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let old_json = r##"{
            "scale": 1.5,
            "idleSeconds": 60,
            "overlay": {"x": 300, "y": 400, "visible": false},
            "autostart": true
        }"##;
        fs::write(&path, old_json).expect("write");

        let s = load(&path).expect("load").expect("some");
        assert_eq!(s.language, Language::Ko);
        assert!(!s.position_lock);
        assert!(!s.show_in_taskbar);
        assert_eq!(s.scale, 1.5);
        assert_eq!(s.idle_seconds, 60);
        assert_eq!(
            s.overlay,
            OverlaySettings {
                x: 300,
                y: 400,
                visible: false
            }
        );
        assert!(s.autostart);
    }

    /// V2: 모르는 language 값은 항상 Ko(파일 읽기·직접 역직렬화 모두).
    #[test]
    fn settings_unknown_language_is_ko() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        fs::write(&path, r##"{"language":"fr","idleSeconds":60}"##).expect("write");
        let s = load(&path).expect("load").expect("some");
        assert_eq!(s.language, Language::Ko);
        assert_eq!(s.idle_seconds, 60);

        for (json, expected) in [
            (r##"{"language":"KO"}"##, Language::Ko),
            (r##"{"language":null}"##, Language::Ko),
            (r##"{"language":5}"##, Language::Ko),
            (r##"{"language":{}}"##, Language::Ko),
            (r##"{"language":"ja"}"##, Language::Ja),
            (r##"{"language":"en"}"##, Language::En),
        ] {
            let s: Settings = serde_json::from_str(json).expect("de");
            assert_eq!(s.language, expected, "json: {json}");
        }
    }

    /// V3: 직렬화 키·값 — camelCase, 기본값도 키를 낸다.
    #[test]
    fn settings_serialize_new_keys() {
        let s = Settings {
            language: Language::Ja,
            position_lock: true,
            show_in_taskbar: true,
            ..Default::default()
        };
        let json = serde_json::to_string(&s).expect("ser");
        assert!(json.contains("\"language\":\"ja\""));
        assert!(json.contains("\"positionLock\":true"));
        assert!(json.contains("\"showInTaskbar\":true"));
        assert!(!json.contains("\"position_lock\""));
        assert!(!json.contains("\"show_in_taskbar\""));
        assert!(!json.contains("\"Ja\""));

        let default_json = serde_json::to_string(&Settings::default()).expect("ser");
        assert!(default_json.contains("\"language\":\"ko\""));
        assert!(default_json.contains("\"positionLock\":false"));
        assert!(default_json.contains("\"showInTaskbar\":false"));
    }

    /// V4: 저장·복원 왕복.
    #[test]
    fn settings_new_fields_round_trip() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let s = Settings {
            language: Language::En,
            position_lock: false,
            show_in_taskbar: true,
            ..Default::default()
        };
        save(&path, &s).expect("save");
        assert_eq!(load(&path).expect("load"), Some(s));
    }

    /// V5: validate 에는 세 필드 규칙이 없다 — 모든 조합이 Ok.
    #[test]
    fn validate_has_no_rule_for_new_fields() {
        for language in [Language::Ko, Language::Ja, Language::En] {
            for position_lock in [false, true] {
                for show_in_taskbar in [false, true] {
                    let s = Settings {
                        language,
                        position_lock,
                        show_in_taskbar,
                        ..Default::default()
                    };
                    assert!(s.validate().is_ok());
                }
            }
        }
    }

    /// V6: 유휴 시간 범위 60~3600(검증).
    #[test]
    fn idle_seconds_range() {
        for bad in [0, 59, 3601] {
            let s = Settings {
                idle_seconds: bad,
                ..Default::default()
            };
            assert!(s.validate().is_err(), "idle_seconds {bad} 는 거부돼야 한다");
        }
        for ok in [60, 300, 3600] {
            let s = Settings {
                idle_seconds: ok,
                ..Default::default()
            };
            assert!(s.validate().is_ok(), "idle_seconds {ok} 는 통과해야 한다");
        }
    }

    /// V7: 파일 읽기는 범위 밖 유휴 시간을 거부하지 않고 보정한다(D24).
    #[test]
    fn load_clamps_out_of_range_idle_seconds() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");

        fs::write(&path, r##"{"idleSeconds": 30, "scale": 1.5}"##).expect("write");
        let s = load(&path).expect("load").expect("some");
        assert_eq!(s.idle_seconds, IDLE_SECONDS_MIN);
        assert_eq!(s.scale, 1.5);

        fs::write(&path, r##"{"idleSeconds": 99999}"##).expect("write");
        let s = load(&path).expect("load").expect("some");
        assert_eq!(s.idle_seconds, IDLE_SECONDS_MAX);
    }
}

#[cfg(test)]
mod pen_mode_tests;
#[cfg(test)]
mod pen_pos_tests;
