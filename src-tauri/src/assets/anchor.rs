//! [목적] `mouse_base` 이미지에서 손 기준점(끝부분 무게중심)을 캔버스 좌표로 계산한다
//!        (OV-R-14, CR-007·CR-008, 2026-09-23 캔버스 좌표 재정의). 어깨에서 먼 상위 25% 픽셀만
//!        골라 알파 가중 평균을 낸다. 좌표는 그림 좌표에 `part_pos` 오프셋을 더한 캔버스 좌표다.
//! [공개 API] `compute_hand_anchor(assets_dir, manifest, shoulder, part_pos) -> Result<Option<Point>, AssetError>`
//! [스레드] 없음. 호출자 스레드에서 동기 실행. 이벤트 발생 시점에만 부른다(매 프레임 호출 금지).
//! [unsafe] 없음.
//! [에러] `AssetError::{Io, Decode}`(mod.rs 정의 재사용). `Ok(None)`은 오류가 아니라 폴백 신호.
//! [설정] 없음. `TIP_DIVISOR = 4`(끝부분 비율 상수, 사용자 조절 설정 아님).
//! [테스트] 단위: `tip_centroid` 합성 RGBA 버퍼(U1~U10, U12~U16). 통합: tempdir PNG 인코딩(I1~I7, B14).

use std::path::Path;

use crate::settings::Point;

use super::{AssetError, AssetManifest, SimpleSlot};

/// 끝부분 비율: 어깨에서 먼 상위 1/TIP_DIVISOR(= 25%) 픽셀만 쓴다 (CR-007, 사용자 확정)
const TIP_DIVISOR: usize = 4;

/// `mouse_base` 이미지에서 손 기준점(끝부분 무게중심)을 캔버스 좌표로 계산한다.
///
/// `Ok(None)`을 돌려주는 경우(오류 아님, 호출자가 폴백을 쓴다):
/// 1. 매니페스트에 `mouse_base`가 없다.
/// 2. 알파 > 0 픽셀이 하나도 없다(전부 투명).
/// 3. `shoulder` 또는 `part_pos`의 x·y 중 하나라도 유한수가 아니다.
/// 4. 해독 결과 RGBA 길이가 `width × height × 4`와 다르다(방어).
pub fn compute_hand_anchor(
    assets_dir: &Path,
    manifest: &AssetManifest,
    shoulder: Point,
    part_pos: Point,
) -> Result<Option<Point>, AssetError> {
    use crate::assets::AssetSlot;

    let Some(entry) = manifest.find(&AssetSlot::Simple(SimpleSlot::MouseBase)) else {
        return Ok(None);
    };
    // SEC-002: manifest 의 fileName 을 신뢰하지 않고 슬롯에서 경로를 다시 만든다.
    let bytes = std::fs::read(assets_dir.join(super::stored_file_name(&entry.slot)))?;
    let img = tauri::image::Image::from_bytes(&bytes)?;
    Ok(tip_centroid(
        img.rgba(),
        img.width(),
        img.height(),
        shoulder,
        part_pos,
    ))
}

/// 알파 > 0 픽셀 중 어깨에서 먼 상위 25%만 골라 알파 가중 무게중심을 낸다(§3.2 CR-007).
/// 픽셀 좌표는 `part_pos` 만큼 옮긴 캔버스 좌표로 계산한다(2026-09-23 재정의).
fn tip_centroid(
    rgba: &[u8],
    width: u32,
    height: u32,
    shoulder: Point,
    part_pos: Point,
) -> Option<Point> {
    if rgba.len() as u64 != (width as u64) * (height as u64) * 4 {
        return None;
    }
    if !shoulder.x.is_finite()
        || !shoulder.y.is_finite()
        || !part_pos.x.is_finite()
        || !part_pos.y.is_finite()
    {
        return None;
    }

    let canvas_xy = |x: u32, y: u32| -> (f64, f64) {
        (part_pos.x + x as f64 + 0.5, part_pos.y + y as f64 + 0.5)
    };
    let dist_sq = |x: u32, y: u32| -> f64 {
        let (cx, cy) = canvas_xy(x, y);
        (cx - shoulder.x).powi(2) + (cy - shoulder.y).powi(2)
    };

    let mut dist_sqs: Vec<f64> = Vec::new();
    for y in 0..height {
        for x in 0..width {
            let idx = 4 * (y as usize * width as usize + x as usize);
            if rgba[idx + 3] > 0 {
                dist_sqs.push(dist_sq(x, y));
            }
        }
    }
    if dist_sqs.is_empty() {
        return None;
    }

    let threshold = tip_threshold(&mut dist_sqs)?;

    let mut sum_a = 0.0_f64;
    let mut sum_ax = 0.0_f64;
    let mut sum_ay = 0.0_f64;
    for y in 0..height {
        for x in 0..width {
            let idx = 4 * (y as usize * width as usize + x as usize);
            let a = rgba[idx + 3];
            if a == 0 {
                continue;
            }
            if dist_sq(x, y) >= threshold {
                let (cx, cy) = canvas_xy(x, y);
                let a = a as f64;
                sum_a += a;
                sum_ax += a * cx;
                sum_ay += a * cy;
            }
        }
    }
    if sum_a == 0.0 {
        return None;
    }
    Some(Point {
        x: round2(sum_ax / sum_a),
        y: round2(sum_ay / sum_a),
    })
}

/// 상위 k번째(k = ⌈n/TIP_DIVISOR⌉, 최소 1) 거리²를 문턱으로 돌려준다. 빈 슬라이스면 `None`.
fn tip_threshold(dist_sq: &mut [f64]) -> Option<f64> {
    let n = dist_sq.len();
    if n == 0 {
        return None;
    }
    let k = n.div_ceil(TIP_DIVISOR).max(1);
    let (_, pivot, _) = dist_sq.select_nth_unstable_by(k - 1, |a, b| b.total_cmp(a));
    Some(*pivot)
}

fn round2(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::assets::{AssetEntry, AssetSlot};

    fn rgba_from_alpha(alphas: &[u8]) -> Vec<u8> {
        let mut out = Vec::with_capacity(alphas.len() * 4);
        for &a in alphas {
            out.extend_from_slice(&[255, 255, 255, a]);
        }
        out
    }

    /// `part_pos = (0, 0)` — 캔버스 전체 크기 그림과 동일하게 동작(U1~U10 기대값 불변).
    fn zero() -> Point {
        Point { x: 0.0, y: 0.0 }
    }

    #[test]
    fn u1_all_transparent_is_none() {
        let rgba = vec![0u8; 5 * 4 * 4];
        assert_eq!(
            tip_centroid(&rgba, 5, 4, Point { x: 0.0, y: 0.0 }, zero()),
            None
        );
    }

    #[test]
    fn u2_single_pixel_uses_pixel_center() {
        let mut alphas = vec![0u8; 5 * 4];
        alphas[2 * 5 + 3] = 255; // (x=3, y=2), 인덱스 = y*width + x
        let rgba = rgba_from_alpha(&alphas);
        let got = tip_centroid(&rgba, 5, 4, Point { x: 0.0, y: 0.0 }, zero()).expect("some");
        assert_eq!(got, Point { x: 3.5, y: 2.5 });
    }

    #[test]
    fn u3_tip_only_not_full_average() {
        let alphas = vec![255u8; 8];
        let rgba = rgba_from_alpha(&alphas);
        let got = tip_centroid(&rgba, 8, 1, Point { x: 0.0, y: 0.5 }, zero()).expect("some");
        assert_eq!(got, Point { x: 7.0, y: 0.5 });
    }

    #[test]
    fn u4_alpha_weighted() {
        let mut alphas = vec![255u8; 8];
        alphas[6] = 85;
        let rgba = rgba_from_alpha(&alphas);
        let got = tip_centroid(&rgba, 8, 1, Point { x: 0.0, y: 0.5 }, zero()).expect("some");
        assert_eq!(got, Point { x: 7.25, y: 0.5 });
    }

    #[test]
    fn u5_ties_all_included_symmetric() {
        let alphas = vec![255u8; 9];
        let rgba = rgba_from_alpha(&alphas);
        let got = tip_centroid(&rgba, 3, 3, Point { x: 1.5, y: 1.5 }, zero()).expect("some");
        assert_eq!(got, Point { x: 1.5, y: 1.5 });
    }

    #[test]
    fn u6_transparent_excluded_even_if_far() {
        let alphas = [255, 255, 255, 255, 0, 0, 0, 0];
        let rgba = rgba_from_alpha(&alphas);
        let got = tip_centroid(&rgba, 8, 1, Point { x: 0.0, y: 0.5 }, zero()).expect("some");
        assert_eq!(got, Point { x: 3.5, y: 0.5 });
    }

    #[test]
    fn u7_rounds_to_two_decimals() {
        let mut alphas = vec![255u8; 8];
        alphas[6] = 1;
        alphas[7] = 2;
        let rgba = rgba_from_alpha(&alphas);
        let got = tip_centroid(&rgba, 8, 1, Point { x: 0.0, y: 0.5 }, zero()).expect("some");
        assert_eq!(got, Point { x: 7.17, y: 0.5 });
    }

    #[test]
    fn u8_length_mismatch_is_none() {
        let rgba = vec![255u8; 8 * 4 - 4];
        assert_eq!(
            tip_centroid(&rgba, 8, 1, Point { x: 0.0, y: 0.5 }, zero()),
            None
        );
    }

    #[test]
    fn u9_non_finite_shoulder_is_none() {
        let alphas = vec![255u8; 8];
        let rgba = rgba_from_alpha(&alphas);
        assert_eq!(
            tip_centroid(
                &rgba,
                8,
                1,
                Point {
                    x: f64::NAN,
                    y: 0.5
                },
                zero()
            ),
            None
        );
    }

    #[test]
    fn u10_tip_threshold_selects_kth() {
        assert_eq!(tip_threshold(&mut []), None);
        let mut v = vec![1.0, 3.0, 2.0, 4.0, 5.0];
        assert_eq!(tip_threshold(&mut v), Some(4.0));
    }

    /// U12: 오프셋 반영 — 그림 좌표 (7.0, 0.5) + `part_pos` (100, 50) = 캔버스 (107.0, 50.5).
    #[test]
    fn u12_part_pos_offset_is_added_to_canvas_coordinate() {
        let alphas = vec![255u8; 8];
        let rgba = rgba_from_alpha(&alphas);
        let got = tip_centroid(
            &rgba,
            8,
            1,
            Point { x: 100.0, y: 50.5 },
            Point { x: 100.0, y: 50.0 },
        )
        .expect("some");
        assert_eq!(got, Point { x: 107.0, y: 50.5 });
    }

    /// U13: 거리도 캔버스 좌표 기준 — 같은 그림이라도 위치가 바뀌면 끝부분 선택이 달라진다.
    #[test]
    fn u13_position_changes_which_end_is_the_tip() {
        let alphas = vec![255u8; 8];
        let rgba = rgba_from_alpha(&alphas);
        let shoulder = Point { x: 10.0, y: 0.5 };
        let got_origin =
            tip_centroid(&rgba, 8, 1, shoulder, Point { x: 0.0, y: 0.0 }).expect("some");
        assert_eq!(got_origin, Point { x: 1.0, y: 0.5 });
        let got_shifted =
            tip_centroid(&rgba, 8, 1, shoulder, Point { x: 10.0, y: 0.0 }).expect("some");
        assert_eq!(got_shifted, Point { x: 17.0, y: 0.5 });
    }

    /// U14: 오프셋을 더한 뒤 한 번만 반올림한다(소수점 오프셋 보존).
    #[test]
    fn u14_rounds_after_adding_offset_once() {
        let rgba = rgba_from_alpha(&[255]);
        let got = tip_centroid(
            &rgba,
            1,
            1,
            Point { x: 0.0, y: 0.0 },
            Point {
                x: 389.123,
                y: 492.456,
            },
        )
        .expect("some");
        assert_eq!(
            got,
            Point {
                x: 389.62,
                y: 492.96
            }
        );
    }

    /// U15: `part_pos`가 비유한이면 방어적으로 `None`.
    #[test]
    fn u15_non_finite_part_pos_is_none() {
        let alphas = vec![255u8; 8];
        let rgba = rgba_from_alpha(&alphas);
        let shoulder = Point { x: 0.0, y: 0.5 };
        assert_eq!(
            tip_centroid(
                &rgba,
                8,
                1,
                shoulder,
                Point {
                    x: f64::NAN,
                    y: 0.0
                }
            ),
            None
        );
        assert_eq!(
            tip_centroid(
                &rgba,
                8,
                1,
                shoulder,
                Point {
                    x: 0.0,
                    y: f64::INFINITY
                }
            ),
            None
        );
    }

    /// U16: 전체 캔버스 그림 = 잘라낸 작은 그림 + 위치. 둘 다 같은 캔버스 좌표 결과를 낸다.
    #[test]
    fn u16_cropped_image_with_offset_matches_full_canvas_image() {
        let shoulder = Point { x: 0.0, y: 1.5 };

        // ① 10×3 전체 캔버스 그림, y=1 행 x=4~9(6픽셀)만 불투명, part_pos = (0, 0).
        let mut alphas_full = vec![0u8; 10 * 3];
        for x in 4..10 {
            alphas_full[10 + x] = 255; // y=1 행
        }
        let rgba_full = rgba_from_alpha(&alphas_full);
        let got_full =
            tip_centroid(&rgba_full, 10, 3, shoulder, Point { x: 0.0, y: 0.0 }).expect("some");

        // ② 잘라낸 6×1 그림 전부 불투명, part_pos = (4, 1).
        let alphas_cropped = vec![255u8; 6];
        let rgba_cropped = rgba_from_alpha(&alphas_cropped);
        let got_cropped =
            tip_centroid(&rgba_cropped, 6, 1, shoulder, Point { x: 4.0, y: 1.0 }).expect("some");

        assert_eq!(got_full, Point { x: 9.0, y: 1.5 });
        assert_eq!(got_cropped, Point { x: 9.0, y: 1.5 });
    }

    // ─── 통합 — tempdir(합성 PNG 인코딩) ────────────────────────────────────

    /// 필터 바이트 0 + 무압축(stored) deflate + zlib 헤더/트레일러 + CRC-32.
    /// 새 크레이트 없이 실제 해독 가능한 PNG를 만든다(설계 §8.3).
    fn encode_png_rgba(w: u32, h: u32, rgba: &[u8]) -> Vec<u8> {
        let mut raw = Vec::with_capacity((h as usize) * (1 + w as usize * 4));
        for y in 0..h as usize {
            raw.push(0u8); // 필터 없음
            let row_start = y * w as usize * 4;
            raw.extend_from_slice(&rgba[row_start..row_start + w as usize * 4]);
        }

        let mut zlib = Vec::new();
        zlib.push(0x78);
        zlib.push(0x01);
        let mut pos = 0usize;
        loop {
            let remaining = raw.len() - pos;
            let chunk_len = remaining.min(65535);
            let is_final = pos + chunk_len >= raw.len();
            zlib.push(if is_final { 1 } else { 0 });
            zlib.extend_from_slice(&(chunk_len as u16).to_le_bytes());
            zlib.extend_from_slice(&(!(chunk_len as u16)).to_le_bytes());
            zlib.extend_from_slice(&raw[pos..pos + chunk_len]);
            pos += chunk_len;
            if is_final {
                break;
            }
        }
        zlib.extend_from_slice(&adler32(&raw).to_be_bytes());

        let mut png = super::super::PNG_SIGNATURE.to_vec();
        write_chunk(&mut png, b"IHDR", &{
            let mut v = Vec::new();
            v.extend_from_slice(&w.to_be_bytes());
            v.extend_from_slice(&h.to_be_bytes());
            v.extend_from_slice(&[8, 6, 0, 0, 0]);
            v
        });
        write_chunk(&mut png, b"IDAT", &zlib);
        write_chunk(&mut png, b"IEND", &[]);
        png
    }

    fn adler32(data: &[u8]) -> u32 {
        let mut a: u32 = 1;
        let mut b: u32 = 0;
        for &byte in data {
            a = (a + byte as u32) % 65521;
            b = (b + a) % 65521;
        }
        (b << 16) | a
    }

    fn crc32(data: &[u8]) -> u32 {
        let mut crc: u32 = 0xFFFF_FFFF;
        for &byte in data {
            crc ^= byte as u32;
            for _ in 0..8 {
                if crc & 1 != 0 {
                    crc = (crc >> 1) ^ 0xEDB8_8320;
                } else {
                    crc >>= 1;
                }
            }
        }
        crc ^ 0xFFFF_FFFF
    }

    fn write_chunk(out: &mut Vec<u8>, kind: &[u8; 4], data: &[u8]) {
        out.extend_from_slice(&(data.len() as u32).to_be_bytes());
        let mut body = kind.to_vec();
        body.extend_from_slice(data);
        out.extend_from_slice(&body);
        out.extend_from_slice(&crc32(&body).to_be_bytes());
    }

    fn manifest_with(slot: SimpleSlot, width: u32, height: u32, file_name: &str) -> AssetManifest {
        AssetManifest {
            canvas: None,
            entries: vec![AssetEntry {
                slot: AssetSlot::Simple(slot),
                file_name: file_name.to_string(),
                width,
                height,
                bytes: 0,
                url: String::new(),
            }],
        }
    }

    fn write_mouse_base(dir: &Path, w: u32, h: u32, rgba: &[u8]) -> AssetManifest {
        std::fs::create_dir_all(dir).expect("mkdir");
        std::fs::write(dir.join("mouse_base.png"), encode_png_rgba(w, h, rgba)).expect("write");
        manifest_with(SimpleSlot::MouseBase, w, h, "mouse_base.png")
    }

    #[test]
    fn i1_layer_mode_tip_centroid() {
        let dir = tempfile::tempdir().expect("tempdir");
        let mut alphas = vec![0u8; 300 * 4];
        for x in 0..300 {
            alphas[300 + x] = 255; // y=1 행만 불투명
        }
        let rgba = rgba_from_alpha(&alphas);
        let manifest = write_mouse_base(dir.path(), 300, 4, &rgba);
        let got = compute_hand_anchor(dir.path(), &manifest, Point { x: 0.0, y: 1.5 }, zero())
            .expect("ok")
            .expect("some");
        assert_eq!(got, Point { x: 262.5, y: 1.5 });
    }

    #[test]
    fn i2_no_mouse_base_is_none() {
        let dir = tempfile::tempdir().expect("tempdir");
        let manifest = manifest_with(SimpleSlot::Body, 300, 4, "body.png");
        let got = compute_hand_anchor(dir.path(), &manifest, Point { x: 0.0, y: 1.5 }, zero())
            .expect("ok");
        assert_eq!(got, None);
    }

    /// I3(교체): 작은 파츠(16×16)도 크기와 무관하게 해독·계산한다(손바닥 규칙 폐기).
    #[test]
    fn i3_small_mouse_part_is_decoded_and_offset() {
        let dir = tempfile::tempdir().expect("tempdir");
        let rgba = rgba_from_alpha(&vec![255u8; 16 * 16]);
        let manifest = write_mouse_base(dir.path(), 16, 16, &rgba);
        let shoulder = Point { x: 0.0, y: 0.0 };
        let part_pos = Point { x: 389.0, y: 492.0 };
        let got = compute_hand_anchor(dir.path(), &manifest, shoulder, part_pos)
            .expect("ok")
            .expect("some");
        assert!((389.0..=405.0).contains(&got.x));
        assert!((492.0..=508.0).contains(&got.y));
    }

    #[test]
    fn i4_all_transparent_is_none() {
        let dir = tempfile::tempdir().expect("tempdir");
        let rgba = rgba_from_alpha(&vec![0u8; 300 * 4]);
        let manifest = write_mouse_base(dir.path(), 300, 4, &rgba);
        let got = compute_hand_anchor(dir.path(), &manifest, Point { x: 0.0, y: 1.5 }, zero())
            .expect("ok");
        assert_eq!(got, None);
    }

    #[test]
    fn i5_bad_pixel_data_is_decode_error() {
        let dir = tempfile::tempdir().expect("tempdir");
        std::fs::create_dir_all(dir.path()).expect("mkdir");
        // 헤더는 정상, 픽셀 데이터(IDAT)가 없어 해독이 실패한다.
        let mut png = super::super::PNG_SIGNATURE.to_vec();
        write_chunk(&mut png, b"IHDR", &{
            let mut v = Vec::new();
            v.extend_from_slice(&300u32.to_be_bytes());
            v.extend_from_slice(&4u32.to_be_bytes());
            v.extend_from_slice(&[8, 6, 0, 0, 0]);
            v
        });
        write_chunk(&mut png, b"IEND", &[]);
        std::fs::write(dir.path().join("mouse_base.png"), png).expect("write");
        let manifest = manifest_with(SimpleSlot::MouseBase, 300, 4, "mouse_base.png");
        let err = compute_hand_anchor(dir.path(), &manifest, Point { x: 0.0, y: 1.5 }, zero())
            .unwrap_err();
        assert!(matches!(err, AssetError::Decode(_)));
    }

    #[test]
    fn i6_missing_file_is_io_error() {
        let dir = tempfile::tempdir().expect("tempdir");
        let rgba = rgba_from_alpha(&vec![255u8; 300 * 4]);
        let manifest = write_mouse_base(dir.path(), 300, 4, &rgba);
        std::fs::remove_file(dir.path().join("mouse_base.png")).expect("remove");
        let err = compute_hand_anchor(dir.path(), &manifest, Point { x: 0.0, y: 1.5 }, zero())
            .unwrap_err();
        assert!(matches!(err, AssetError::Io(_)));
    }

    /// I7(신규): I1과 같은 파일에 어깨·`part_pos`를 함께 옮기면 결과도 그만큼 옮겨간다.
    #[test]
    fn i7_shoulder_and_part_pos_offset_together() {
        let dir = tempfile::tempdir().expect("tempdir");
        let mut alphas = vec![0u8; 300 * 4];
        for x in 0..300 {
            alphas[300 + x] = 255;
        }
        let rgba = rgba_from_alpha(&alphas);
        let manifest = write_mouse_base(dir.path(), 300, 4, &rgba);
        let shoulder = Point { x: 389.0, y: 493.5 };
        let part_pos = Point { x: 389.0, y: 492.0 };
        let got = compute_hand_anchor(dir.path(), &manifest, shoulder, part_pos)
            .expect("ok")
            .expect("some");
        assert_eq!(got, Point { x: 651.5, y: 493.5 });
    }

    /// B14 (배경 슬롯, OV-R-17): 배경 등록·삭제는 손 기준점 계산에 영향이 없다.
    #[test]
    fn b14_background_does_not_affect_hand_anchor() {
        let dir = tempfile::tempdir().expect("tempdir");
        let mut alphas = vec![0u8; 300 * 4];
        for x in 0..300 {
            alphas[300 + x] = 255;
        }
        let rgba = rgba_from_alpha(&alphas);
        let mut manifest = write_mouse_base(dir.path(), 300, 4, &rgba);
        // background 항목을 매니페스트에 더해도 결과는 같아야 한다(파일은 열지 않음).
        manifest.entries.push(AssetEntry {
            slot: AssetSlot::Simple(SimpleSlot::Background),
            file_name: "background.png".to_string(),
            width: 300,
            height: 4,
            bytes: 0,
            url: String::new(),
        });
        let got = compute_hand_anchor(dir.path(), &manifest, Point { x: 0.0, y: 1.5 }, zero())
            .expect("ok")
            .expect("some");
        assert_eq!(got, Point { x: 262.5, y: 1.5 });

        // background 만 있고 mouse_base 가 없으면 None.
        let bg_only = manifest_with(SimpleSlot::Background, 300, 4, "background.png");
        let got_none = compute_hand_anchor(dir.path(), &bg_only, Point { x: 0.0, y: 1.5 }, zero())
            .expect("ok");
        assert_eq!(got_none, None);
    }
}
