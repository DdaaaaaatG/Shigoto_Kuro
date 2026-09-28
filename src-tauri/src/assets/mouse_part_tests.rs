//! [목적] 마우스 파츠 크기 자유(CR-036, 2026-09-25 사용자 확정 「팔·손 파츠 크기 자유」)의 검증·저장
//!        규칙 테스트 M1~M6. `mod.rs`의 `validate`·`import`를 대상으로 한다. 이전(2026-09-23) 버전은
//!        마우스 파츠끼리 크기 일치를 강제했으나(`AssetError::MousePartMismatch`), CR-036이 그 강제를
//!        없앴다 — 이 파일의 테스트는 그 반전(크기가 달라도 통과)을 단언한다.
//! [공개 API] 없음(테스트 전용 모듈).
//! [스레드] 없음.
//! [unsafe] 없음.
//! [에러] 없음(테스트 전용).
//! [설정] 없음.
//! [테스트] M1~M6 — 설계 `doc/200_설계/core/assets.md` §8.2(CR-036 갱신).

use std::fs;

use super::tests::png_header;
use super::*;

/// M1: 작은 마우스 파츠는 256 규칙 없이 허용된다.
#[test]
fn m1_small_mouse_parts_are_ok_without_palm_rule() {
    let base = parse_png_header(&png_header(202, 154, 8, 6)).expect("header");
    assert!(validate(&base, 10, &AssetSlot::Simple(SimpleSlot::MouseBase), None).is_ok());
    let left = parse_png_header(&png_header(1, 1, 8, 6)).expect("header");
    assert!(validate(&left, 10, &AssetSlot::Simple(SimpleSlot::MouseLeft), None).is_ok());
}

/// M2: 900×700 상한은 마우스 파츠도 그대로 적용된다.
#[test]
fn m2_mouse_part_respects_canvas_upper_bound() {
    let ok = parse_png_header(&png_header(900, 700, 8, 6)).expect("header");
    assert!(validate(&ok, 10, &AssetSlot::Simple(SimpleSlot::MouseRight), None).is_ok());
    for (w, h) in [(901, 700), (900, 701), (0, 154)] {
        let info = parse_png_header(&png_header(w, h, 8, 6)).expect("header");
        assert!(matches!(
            validate(&info, 10, &AssetSlot::Simple(SimpleSlot::MouseRight), None),
            Err(AssetError::TooLarge {
                max_w: 900,
                max_h: 700,
                ..
            })
        ));
    }
}

/// M3: 용량·색상 규칙은 마우스 파츠에도 동일하게 적용된다.
#[test]
fn m3_mouse_part_rejects_bytes_and_non_rgba() {
    let info = parse_png_header(&png_header(202, 154, 8, 6)).expect("header");
    assert!(matches!(
        validate(
            &info,
            ASSET_MAX_BYTES + 1,
            &AssetSlot::Simple(SimpleSlot::MouseBase),
            None
        ),
        Err(AssetError::TooManyBytes { .. })
    ));
    let not_rgba = parse_png_header(&png_header(202, 154, 8, 2)).expect("header");
    assert!(matches!(
        validate(
            &not_rgba,
            10,
            &AssetSlot::Simple(SimpleSlot::MouseBase),
            None
        ),
        Err(AssetError::NotRgba)
    ));
}

/// M4(CR-036 반전): `group_size`를 넘겨도(구식 호출부 호환) 마우스 파츠는 그룹 크기와 무관하게
/// 통과한다 — `group_size()` 헬퍼가 마우스 파츠에는 항상 `None`을 주므로 실제로는 자유롭다.
#[test]
fn m4_mouse_part_group_size_is_ignored() {
    let info = parse_png_header(&png_header(202, 154, 8, 6)).expect("header");
    assert!(validate(&info, 10, &AssetSlot::Simple(SimpleSlot::MouseLeft), None).is_ok());
}

/// M5(CR-036 신규): 등록된 `mouse_base`와 크기가 다른 `mouse_left`도 등록에 성공한다.
#[test]
fn m5_mouse_left_with_different_size_from_mouse_base_registers_ok() {
    let dir = tempfile::tempdir().expect("tempdir");
    let assets = dir.path().join("assets");

    let base = dir.path().join("mouse_base.png");
    fs::write(&base, png_header(202, 154, 8, 6)).expect("write");
    import(&assets, AssetSlot::Simple(SimpleSlot::MouseBase), &base).expect("mouse base");

    let left = dir.path().join("mouse_left.png");
    fs::write(&left, png_header(64, 48, 8, 6)).expect("write");
    let m = import(&assets, AssetSlot::Simple(SimpleSlot::MouseLeft), &left)
        .expect("different size mouse_left registers ok (CR-036)");
    assert!(assets.join("mouse_left.png").exists());
    assert_eq!(
        m.find(&AssetSlot::Simple(SimpleSlot::MouseLeft))
            .map(|e| (e.width, e.height)),
        Some((64, 48))
    );
}

/// M6: 마우스 파츠 등록·삭제는 캔버스를 정하지도, 막지도 않는다(불변 — CR-036과 무관).
#[test]
fn m6_mouse_part_does_not_touch_canvas() {
    let dir = tempfile::tempdir().expect("tempdir");
    let assets = dir.path().join("assets");

    let base = dir.path().join("mouse_base.png");
    fs::write(&base, png_header(202, 154, 8, 6)).expect("write");
    let m = import(&assets, AssetSlot::Simple(SimpleSlot::MouseBase), &base).expect("mouse only");
    assert_eq!(m.canvas, None);

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

    let m = remove(&assets, AssetSlot::Simple(SimpleSlot::MouseBase)).expect("remove mouse base");
    assert_eq!(
        m.canvas,
        Some(CanvasSize {
            width: 450,
            height: 350
        })
    );
}
