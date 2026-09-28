//! 예시 이미지(doc/assets/samples/body.png · background.png)가 확정 규격(900×700 RGBA ≤1MB)을
//! 실제로 통과하는지 assets 모듈의 검증·import·손 기준점 계산 경로로 확인하는 통합 테스트.
//! 규격 상수가 바뀌면 이 테스트가 먼저 깨진다.
use std::path::{Path, PathBuf};

use kuro_keyviewer_lib::assets::{
    self, AssetSlot, SimpleSlot, CANVAS_MAX_HEIGHT, CANVAS_MAX_WIDTH,
};
use kuro_keyviewer_lib::settings::Point;

fn sample() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../doc/assets/samples/body.png")
}

fn sample_background() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../doc/assets/samples/background.png")
}

fn sample_mouse_pen_hand() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../doc/assets/samples/mouse_pen_hand.png")
}

fn sample_mouse_pen_layer() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../doc/assets/samples/mouse_pen_layer.png")
}

#[test]
fn constants_match_confirmed_spec() {
    assert_eq!((CANVAS_MAX_WIDTH, CANVAS_MAX_HEIGHT), (900, 700));
}

#[test]
fn sample_body_png_header_is_900x700_rgba() {
    let bytes = std::fs::read(sample()).expect("예시 이미지 읽기");
    let info = assets::parse_png_header(&bytes).expect("PNG 헤더");
    assert_eq!((info.width, info.height), (900, 700));
    assert!(bytes.len() as u64 <= assets::ASSET_MAX_BYTES);
}

#[test]
fn sample_body_imports_and_sets_canvas() {
    let dir = tempfile::tempdir().expect("tempdir");
    let m = assets::import(dir.path(), AssetSlot::Simple(SimpleSlot::Body), &sample())
        .expect("body import");
    let canvas = m.canvas.expect("캔버스 확정");
    assert_eq!((canvas.width, canvas.height), (900, 700));
    // 같은 크기의 상태 레이어는 추가로 들어간다
    let m = assets::import(dir.path(), AssetSlot::Simple(SimpleSlot::Idle), &sample())
        .expect("idle import");
    assert_eq!(m.entries.len(), 2);
}

/// 스모크 (설계 §8.4, OV-R-14): 실제 900×700 PNG로 손 기준점이 캔버스 안의 값으로 결정론적으로 나온다.
#[test]
fn compute_hand_anchor_smoke_on_sample_body_png() {
    let dir = tempfile::tempdir().expect("tempdir");
    let m = assets::import(
        dir.path(),
        AssetSlot::Simple(SimpleSlot::MouseBase),
        &sample(),
    )
    .expect("mouse_base import (마우스 파츠는 캔버스와 무관)");

    let shoulder = Point { x: 620.0, y: 530.0 };
    let part_pos = Point { x: 0.0, y: 0.0 };
    let p1 = assets::compute_hand_anchor(dir.path(), &m, shoulder, part_pos)
        .expect("계산 성공")
        .expect("손 기준점 존재");
    assert!((0.0..=900.0).contains(&p1.x));
    assert!((0.0..=700.0).contains(&p1.y));

    let p2 = assets::compute_hand_anchor(dir.path(), &m, shoulder, part_pos)
        .expect("계산 성공")
        .expect("손 기준점 존재");
    assert_eq!(p1, p2, "같은 입력에는 같은 결과(결정론)");
}

/// B15 스모크 (설계 §8.6, OV-R-17): 배경이 먼저 캔버스를 정하고, 몸통이 그 뒤를 따른다.
#[test]
fn sample_background_sets_canvas_then_body_matches() {
    let dir = tempfile::tempdir().expect("tempdir");
    let m = assets::import(
        dir.path(),
        AssetSlot::Simple(SimpleSlot::Background),
        &sample_background(),
    )
    .expect("background import");
    let canvas = m.canvas.expect("배경이 캔버스를 정함");
    assert_eq!((canvas.width, canvas.height), (900, 700));

    let m = assets::import(dir.path(), AssetSlot::Simple(SimpleSlot::Body), &sample())
        .expect("body import (배경과 같은 크기)");
    assert_eq!(m.entries.len(), 2);
}

/// S1(신규, 설계 §8.4): 작은 손 그림(202×154)을 `part_pos` (389, 492)에 놓았을 때 캔버스 좌표
/// 범위 안의 결정론적인 기준점이 나온다.
#[test]
fn sample_mouse_pen_hand_anchor_at_part_pos() {
    let dir = tempfile::tempdir().expect("tempdir");
    let m = assets::import(
        dir.path(),
        AssetSlot::Simple(SimpleSlot::MouseBase),
        &sample_mouse_pen_hand(),
    )
    .expect("mouse_pen_hand import");
    let info = assets::parse_png_header(&std::fs::read(sample_mouse_pen_hand()).expect("read"))
        .expect("header");
    assert_eq!((info.width, info.height), (202, 154));

    let shoulder = Point { x: 620.0, y: 530.0 };
    let part_pos = Point { x: 389.0, y: 492.0 };
    let p1 = assets::compute_hand_anchor(dir.path(), &m, shoulder, part_pos)
        .expect("계산 성공")
        .expect("손 기준점 존재");
    assert!((389.0..=591.0).contains(&p1.x));
    assert!((492.0..=646.0).contains(&p1.y));

    let p2 = assets::compute_hand_anchor(dir.path(), &m, shoulder, part_pos)
        .expect("계산 성공")
        .expect("손 기준점 존재");
    assert_eq!(p1, p2, "같은 입력에는 같은 결과(결정론)");
}

/// S2(신규, 설계 §8.4): 캔버스 전체 크기 그림(`part_pos` (0,0))과 잘라낸 손 그림(`part_pos`
/// (389,492))이 같은 픽셀을 가리키면 기준점도 같다.
#[test]
fn sample_mouse_pen_layer_matches_cropped_hand_at_offset() {
    let dir_layer = tempfile::tempdir().expect("tempdir");
    let m_layer = assets::import(
        dir_layer.path(),
        AssetSlot::Simple(SimpleSlot::MouseBase),
        &sample_mouse_pen_layer(),
    )
    .expect("mouse_pen_layer import");
    let shoulder = Point { x: 620.0, y: 530.0 };
    let layer_anchor = assets::compute_hand_anchor(
        dir_layer.path(),
        &m_layer,
        shoulder,
        Point { x: 0.0, y: 0.0 },
    )
    .expect("계산 성공");

    let dir_hand = tempfile::tempdir().expect("tempdir");
    let m_hand = assets::import(
        dir_hand.path(),
        AssetSlot::Simple(SimpleSlot::MouseBase),
        &sample_mouse_pen_hand(),
    )
    .expect("mouse_pen_hand import");
    let hand_anchor = assets::compute_hand_anchor(
        dir_hand.path(),
        &m_hand,
        shoulder,
        Point { x: 389.0, y: 492.0 },
    )
    .expect("계산 성공");

    assert_eq!(
        layer_anchor, hand_anchor,
        "확정사항 §3 픽셀 일치: 두 그림이 같은 위치를 가리키면 기준점도 같아야 한다"
    );
}
