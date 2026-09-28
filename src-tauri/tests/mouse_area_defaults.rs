//! I1(settings.md §8.2, CR-017 → CR-038 → CR-044 갱신): 예시 mouse_pen_hand.png(202×154)로 실제
//! `compute_hand_anchor` 값을 구해, 기본 이동 영역 `default_area()`의 네 꼭짓점이 어깨→기준점
//! 늘어나기 배율 0.5~1.6(확정사항 §3) 안에 있는지 확인한다.
//!
//! CR-044(🔒 사용자 확정 — 배포용 기본 세트 2차 교체, shoulder (582, 484)·part_pos (411, 464)):
//! area 좌표 자체는 사용자가 지금 실제로 쓰고 있는 값이라 바꾸지 않는다(CR-038과 동일 방침).
//! 새 shoulder·part_pos로 재측정한 결과 왼쪽 아래 꼭짓점의 k 가 상한 1.6 위(약 1.777)로
//! 올라간다(CR-038 때는 오른쪽 위가 하한 밖이었으나, 이번엔 그 꼭짓점이 범위 안으로 들어오고
//! 대신 왼쪽 아래가 상한을 넘는다). 이 이탈은 사용자가 이미 보고 쓰는 동작이라 허용한다(팔이
//! 그만큼 더 늘어나는 모양). 그래서 이 꼭짓점만 별도로 "허용된 이탈"로 단언하고, 나머지 세
//! 꼭짓점은 기존처럼 0.5~1.6 범위 안인지 확인한다. 값이 또 바뀌면(예: shoulder·area 재조정) 이
//! 실측 리터럴도 다시 재야 한다 — 단언을 느슨하게 넓히는 방식으로 얼버무리지 않는다.
use std::path::{Path, PathBuf};

use kuro_keyviewer_lib::assets::{self, AssetSlot, SimpleSlot};
use kuro_keyviewer_lib::settings::{self, Point};

const K_MIN: f64 = 0.5;
const K_MAX: f64 = 1.6;
/// 부동소수 실측값 비교 허용 오차.
const EPSILON: f64 = 1e-6;

/// CR-044 실측(2026-09-26) — shoulder (582, 484), part_pos (411, 464), 예시
/// mouse_pen_hand.png(202×154) 기준 손 기준점.
const EXPECTED_ANCHOR: Point = Point {
    x: 459.29,
    y: 553.29,
};

/// CR-044 실측 k 값(default_area() 순서: 왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래).
/// 왼쪽 아래만 상한 1.6 밖 — 사용자 사용값이라 허용(위 모듈 문서주석 참조).
const EXPECTED_K: [f64; 4] = [
    1.4974396192883574, // 왼쪽 위 — 범위 안
    0.6824861434820476, // 오른쪽 위 — 범위 안
    1.1756935790548624, // 오른쪽 아래 — 범위 안
    1.7772994877623454, // 왼쪽 아래 — 상한 1.6 이탈, CR-044 사용자 사용값이라 허용
];

fn sample_mouse_pen_hand() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../doc/assets/samples/mouse_pen_hand.png")
}

fn dist(a: Point, b: Point) -> f64 {
    ((a.x - b.x).powi(2) + (a.y - b.y).powi(2)).sqrt()
}

#[test]
fn default_area_within_stretch_range_of_real_computed_anchor() {
    let dir = tempfile::tempdir().expect("tempdir");
    let m = assets::import(
        dir.path(),
        AssetSlot::Simple(SimpleSlot::MouseBase),
        &sample_mouse_pen_hand(),
    )
    .expect("mouse_pen_hand import");

    let mouse = settings::default_mouse();
    let anchor = assets::compute_hand_anchor(dir.path(), &m, mouse.shoulder, mouse.part_pos)
        .expect("계산 성공")
        .expect("손 기준점 존재");

    assert!(
        (anchor.x - EXPECTED_ANCHOR.x).abs() < EPSILON
            && (anchor.y - EXPECTED_ANCHOR.y).abs() < EPSILON,
        "손 기준점이 CR-044 실측값과 다릅니다. 실제 = {anchor:?}, 기대 = {EXPECTED_ANCHOR:?}"
    );

    let base = dist(anchor, mouse.shoulder);
    let ks: Vec<f64> = mouse
        .area
        .iter()
        .map(|c| dist(*c, mouse.shoulder) / base)
        .collect();

    for (i, (&k, &expected)) in ks.iter().zip(EXPECTED_K.iter()).enumerate() {
        assert!(
            (k - expected).abs() < EPSILON,
            "k[{i}] 가 CR-044 실측값과 다릅니다. 실제 = {k}, 기대 = {expected}"
        );
    }

    // 왼쪽 아래(index 3)만 CR-044 사용자 사용값으로 상한 이탈이 허용된다.
    for (i, &k) in ks.iter().enumerate() {
        if i == 3 {
            assert!(
                k > K_MAX,
                "왼쪽 아래 꼭짓점이 더 이상 상한을 벗어나지 않습니다({k}) — CR-044 실측 리터럴을 \
                 재측정해 갱신하세요."
            );
            continue;
        }
        assert!(
            (K_MIN..=K_MAX).contains(&k),
            "k[{i}] = {k} 가 허용 범위 {K_MIN}~{K_MAX} 밖입니다."
        );
    }
}
