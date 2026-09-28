//! [목적] 펜 쥔 손 파츠 그룹(CR-024)의 크기 자유(CR-036, 2026-09-25 사용자 확정 「팔·손 파츠 크기
//!        자유」) 검증·저장 규칙 테스트 P3~P6. `mod.rs`의 `validate`·`group_size`·`import`·`remove`와
//!        `anchor.rs`의 `compute_hand_anchor`(펜 그림 무시)를 대상으로 한다. 이전(CR-024) 버전은 펜
//!        그림끼리 크기 일치를 강제했으나(`AssetError::PenPartMismatch`), CR-036이 그 강제를 없앴다
//!        — 이 파일의 테스트는 그 반전(크기가 달라도 통과)을 단언한다.
//! [공개 API] 없음(테스트 전용 모듈).
//! [스레드] 없음.
//! [unsafe] 없음.
//! [에러] 없음(테스트 전용).
//! [설정] 없음.
//! [테스트] P3~P6 — 설계 `doc/200_설계/core/assets.md` §8.10(CR-036 갱신).

use std::fs;

use super::tests::png_header;
use super::*;
use crate::settings::Point;

/// P3: `validate`가 펜 그림에도 캔버스·마우스 파츠와 무관한 상한 규칙만 적용한다(그룹 일치 강제 없음).
#[test]
fn pen_validate_has_no_group_size_rule() {
    let slot = AssetSlot::Simple(SimpleSlot::PenUp);

    let ok = parse_png_header(&png_header(202, 154, 8, 6)).expect("header");
    assert!(validate(&ok, 10, &slot, None).is_ok());

    let too_wide = parse_png_header(&png_header(901, 700, 8, 6)).expect("header");
    assert!(matches!(
        validate(&too_wide, 10, &slot, None),
        Err(AssetError::TooLarge { .. })
    ));

    let too_heavy = parse_png_header(&png_header(202, 154, 8, 6)).expect("header");
    assert!(matches!(
        validate(&too_heavy, ASSET_MAX_BYTES + 1, &slot, None),
        Err(AssetError::TooManyBytes { .. })
    ));

    // group_size 를 넘겨도(구식 호출부 호환) 펜 그림에는 적용되지 않는다 — group_size() 헬퍼가
    // 펜 그림에는 항상 None 을 준다.
    assert_eq!(group_size(&AssetManifest::default(), &slot), None);
}

/// P4: 펜 그림은 캔버스·마우스 파츠와 비교되지 않는다(불변 — CR-036과 무관).
#[test]
fn pen_parts_ignore_canvas_and_mouse_parts() {
    let dir = tempfile::tempdir().expect("tempdir");
    let assets = dir.path().join("assets");

    let body = dir.path().join("body.png");
    fs::write(&body, png_header(450, 350, 8, 6)).expect("write");
    let m = import(&assets, AssetSlot::Simple(SimpleSlot::Body), &body).expect("body");
    assert_eq!(
        m.canvas,
        Some(CanvasSize {
            width: 450,
            height: 350
        })
    );

    let base = dir.path().join("mouse_base.png");
    fs::write(&base, png_header(202, 154, 8, 6)).expect("write");
    import(&assets, AssetSlot::Simple(SimpleSlot::MouseBase), &base).expect("mouse base");

    let pen_up = dir.path().join("pen_up.png");
    fs::write(&pen_up, png_header(120, 90, 8, 6)).expect("write");
    let m = import(&assets, AssetSlot::Simple(SimpleSlot::PenUp), &pen_up).expect("pen up");
    assert_eq!(
        m.canvas,
        Some(CanvasSize {
            width: 450,
            height: 350
        })
    );
}

/// P5(CR-036 신규): 기본 세트(`pen_down_0` 90×154)가 있는 폴더에서 다른 크기 `pen_up` 교체가
/// 성공하고, 다른 크기 `pen_down_1` 추가도 성공한다.
#[test]
fn pen_parts_with_different_sizes_all_register_ok() {
    let dir = tempfile::tempdir().expect("tempdir");
    let assets = dir.path().join("assets");

    // 기본 세트: pen_down_0 90×154, pen_up 120×90(다른 크기 — 기본 세트 시딩과 동등한 상황).
    let pen_down_0 = dir.path().join("pen_down_0.png");
    fs::write(&pen_down_0, png_header(90, 154, 8, 6)).expect("write");
    import(&assets, AssetSlot::pen_down(0), &pen_down_0).expect("pen down 0");

    let pen_up = dir.path().join("pen_up.png");
    fs::write(&pen_up, png_header(120, 90, 8, 6)).expect("write");
    import(&assets, AssetSlot::Simple(SimpleSlot::PenUp), &pen_up).expect("pen up (diff size ok)");

    // 다른 크기 pen_key_space 교체(기존 pen_up 120×90 과도 다름).
    let pen_key_space = dir.path().join("pen_key_space.png");
    fs::write(&pen_key_space, png_header(100, 90, 8, 6)).expect("write");
    import(
        &assets,
        AssetSlot::Simple(SimpleSlot::PenKeySpace),
        &pen_key_space,
    )
    .expect("different size pen_key_space registers ok (CR-036)");
    assert!(assets.join("pen_key_space.png").exists());

    // pen_up 을 또 다른 크기로 교체(기존 등록과 무관하게 자유).
    let pen_up2 = dir.path().join("pen_up2.png");
    fs::write(&pen_up2, png_header(200, 150, 8, 6)).expect("write");
    let m = import(&assets, AssetSlot::Simple(SimpleSlot::PenUp), &pen_up2)
        .expect("pen_up replace with different size ok (CR-036)");
    assert_eq!(
        m.find(&AssetSlot::Simple(SimpleSlot::PenUp))
            .map(|e| (e.width, e.height)),
        Some((200, 150))
    );

    // 크기가 다른 pen_down_1 추가도 성공한다.
    let pen_down_1 = dir.path().join("pen_down_1.png");
    fs::write(&pen_down_1, png_header(300, 250, 8, 6)).expect("write");
    let m = import(&assets, AssetSlot::pen_down(1), &pen_down_1)
        .expect("different size pen_down_1 registers ok (CR-036)");
    assert!(assets.join("pen_down_1.png").exists());
    assert_eq!(m.entries.len(), 4);
}

/// P6: 손 기준점 계산은 펜 그림을 `mouse_base` 대신 쓰지 않는다(불변 — CR-036과 무관).
#[test]
fn hand_anchor_ignores_pen_parts() {
    let dir = tempfile::tempdir().expect("tempdir");
    let assets = dir.path().join("assets");

    let pen_up = dir.path().join("pen_up.png");
    fs::write(&pen_up, png_header(120, 90, 8, 6)).expect("write");
    import(&assets, AssetSlot::Simple(SimpleSlot::PenUp), &pen_up).expect("pen up");

    let manifest = load_manifest(&assets).expect("load");
    let shoulder = Point { x: 620.0, y: 530.0 };
    let part_pos = Point { x: 389.0, y: 492.0 };
    let result = compute_hand_anchor(&assets, &manifest, shoulder, part_pos).expect("no io/decode");
    assert_eq!(result, None);
}
