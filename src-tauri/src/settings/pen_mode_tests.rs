//! CR-033 `MouseSettings.pen_mode` 단위 테스트(P1~P5, 설계 `doc/200_설계/core/settings.md` §3.6).
use super::*;

/// P1 (CR-038): 배포용 기본 세트는 펜 손 모드가 기본으로 켜진다. 직렬화에 `"penMode":true`
/// 포함·`"pen_mode"` 없음.
#[test]
fn default_pen_mode_is_true_and_serialized() {
    assert!(default_mouse().pen_mode);
    let json = serde_json::to_string(&Settings::default()).expect("ser");
    assert!(json.contains("\"penMode\":true"));
    assert!(!json.contains("\"pen_mode\""));
}

/// P2: penMode 없는 옛 마우스 JSON·설정 파일은 false로 읽히고, 다른 필드는 그대로다.
#[test]
fn old_file_without_pen_mode_reads_false() {
    let mouse_json = r##"{
        "shoulder": {"x": 620.0, "y": 530.0},
        "partPos": {"x": 389.0, "y": 492.0},
        "penPos": {"x": 410.0, "y": 505.0}
    }"##;
    let m: MouseSettings = serde_json::from_str(mouse_json).expect("de");
    assert!(!m.pen_mode);
    assert_eq!(m.pen_pos, Some(Point { x: 410.0, y: 505.0 }));

    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join("settings.json");
    let old_json = format!(r##"{{"scale": 1.5, "mouse": {mouse_json}}}"##);
    fs::write(&path, old_json).expect("write");

    let s = load(&path).expect("load").expect("some");
    assert!(!s.mouse.as_ref().expect("mouse").pen_mode);
    assert_eq!(s.scale, 1.5);
}

/// P3: 저장·복원 왕복.
#[test]
fn pen_mode_round_trips() {
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join("settings.json");

    let mut s = Settings::default();
    if let Some(m) = &mut s.mouse {
        m.pen_mode = true;
    }
    save(&path, &s).expect("save");
    let text = fs::read_to_string(&path).expect("read back");
    assert!(text.contains("\"penMode\""));
    assert_eq!(load(&path).expect("load"), Some(s));
}

/// P4: penMode는 penPos·pen_up 등록 여부와의 관계를 검사하지 않는다(D26).
#[test]
fn pen_mode_has_no_validation_rule() {
    let mut s = Settings::default();
    if let Some(m) = &mut s.mouse {
        m.pen_mode = true;
        m.pen_pos = None;
    }
    assert!(s.validate().is_ok());

    let mut s = Settings::default();
    if let Some(m) = &mut s.mouse {
        m.pen_mode = false;
        m.pen_pos = Some(Point { x: 1.0, y: 2.0 });
    }
    assert!(s.validate().is_ok());
}

/// P5: penMode가 bool이 아니면 형식 오류(관용 읽기 아님, D27).
#[test]
fn pen_mode_non_bool_is_format_error() {
    for json in [
        r##"{"shoulder": {"x": 1.0, "y": 2.0}, "penMode": null}"##,
        r##"{"shoulder": {"x": 1.0, "y": 2.0}, "penMode": "true"}"##,
        r##"{"shoulder": {"x": 1.0, "y": 2.0}, "penMode": 1}"##,
    ] {
        let result: Result<MouseSettings, _> = serde_json::from_str(json);
        assert!(result.is_err(), "json: {json}");
    }
}
