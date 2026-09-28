//! CR-024·CR-035 `MouseSettings.pen_pos` 단위 테스트(N1′~N6, 설계
//! `doc/200_설계/core/{assets,settings}.md` §3.8·§3.7).
use super::*;

/// N1‴ (N1″ 대체, CR-044): 기본값은 (372, 476), 직렬화는 `penPos:{"x":372.0,"y":476.0}`이고
/// 옛 필드명 `pen_pos`는 나오지 않는다.
#[test]
fn default_pen_pos_is_372_476() {
    assert_eq!(default_mouse().pen_pos, Some(Point { x: 372.0, y: 476.0 }));
    let json = serde_json::to_string(&Settings::default()).expect("ser");
    assert!(json.contains("\"penPos\":{\"x\":372.0,\"y\":476.0}"));
    assert!(!json.contains("\"pen_pos\""));
}

/// N2: 옛 마우스 JSON에 penPos가 없으면 None으로 읽힌다(기본값 대체 아님 — 필드 default).
#[test]
fn old_mouse_json_without_pen_pos_reads_none() {
    let json = r##"{
        "shoulder": {"x": 1.0, "y": 2.0}
    }"##;
    let m: MouseSettings = serde_json::from_str(json).expect("de");
    assert_eq!(m.pen_pos, None);
}

/// N3: penPos 값이 있으면 저장·복원 왕복이 같다.
#[test]
fn pen_pos_round_trips() {
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join("settings.json");

    let mut s = Settings::default();
    if let Some(m) = &mut s.mouse {
        m.pen_pos = Some(Point {
            x: 410.5,
            y: 505.25,
        });
    }
    save(&path, &s).expect("save");
    let text = fs::read_to_string(&path).expect("read back");
    assert!(text.contains("\"penPos\""));
    assert_eq!(load(&path).expect("load"), Some(s));
}

/// N4: `"penPos": null`은 None으로 읽히고 검증을 통과한다.
#[test]
fn pen_pos_null_reads_none() {
    let json = r##"{"shoulder": {"x": 1.0, "y": 2.0}, "penPos": null}"##;
    let m: MouseSettings = serde_json::from_str(json).expect("de");
    assert_eq!(m.pen_pos, None);

    let s = Settings {
        mouse: Some(m),
        ..Default::default()
    };
    assert!(s.validate().is_ok());
}

/// N5: penPos는 캔버스 범위·유한성을 검사하지 않는다(D17).
#[test]
fn pen_pos_is_not_range_checked() {
    let mut s = Settings::default();
    if let Some(m) = &mut s.mouse {
        m.pen_pos = Some(Point {
            x: -50.0,
            y: 5000.0,
        });
    }
    assert!(s.validate().is_ok());
}

/// N6 (CR-035): 기존 파일에 `"penPos": null`이 저장돼 있으면 기본값 (380, 496)으로 바뀌지 않고
/// None을 유지한다.
#[test]
fn existing_file_pen_pos_null_stays_null() {
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join("settings.json");
    fs::write(
        &path,
        r##"{"mouse":{"shoulder":{"x":620.0,"y":530.0},"penPos":null}}"##,
    )
    .expect("write");

    let s = load(&path).expect("load").expect("some");
    assert_eq!(s.mouse.expect("mouse").pen_pos, None);
}
