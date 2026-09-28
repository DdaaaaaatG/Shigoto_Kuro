//! 오버레이 창 표시 크기 계산·적용(OV-R-03).
//!
//! [목적] 캔버스(상태 레이어) 픽셀 크기와 배율로부터 오버레이 창의 표시 크기를 구하고,
//!        창을 그 크기로 리사이즈한다. 좌상단은 고정(크기만 변경).
//! [공개 API] `OverlaySize`, `overlay_display_size`(순수), `resize_overlay`.
//! [스레드] 없음. Tauri 메인 스레드(setup·동기 command)에서만 호출된다.
//! [저수준 호출] 없음. `set_size(Size::Logical)`만 사용(tao 가 내부에서 위치 고정 플래그를 처리).
//! [에러] `WindowError::{NotFound, Tauri}`(모듈 상위 `mod.rs` 정의).
//! [설정] 읽음(인자로 전달받음): `scale`(0.25~2, `settings::SCALE_MIN/MAX`),
//!        캔버스 크기(`assets::CanvasSize`를 `(u32,u32)`로 변환해 호출자가 넘김). 이 모듈은
//!        `Settings`를 직접 잠그지 않는다. 저장하는 값 없음(창 크기는 파생값).
//! [테스트] 단위: `overlay_display_size` S1~S12(설계 §8.4) — clamp·기준 상자 대체·fit·올림·상한.

use tauri::{AppHandle, LogicalSize, Size};

use super::WindowError;

/// 기준 상자(확정사항 §3 🔒). ui `BASE_BOX`(`src/bridge/types.ts`)와 같은 값.
const BASE_BOX_W: f64 = 450.0;
const BASE_BOX_H: f64 = 350.0;

/// 올림 전 부동소수 오차 흡수(예: `450 × 1.1 = 495.00000000000006`).
const SIZE_EPSILON: f64 = 1e-6;

/// 오버레이 창 안쪽 크기(논리 px = ui CSS px).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct OverlaySize {
    pub width: u32,
    pub height: u32,
}

/// 배율을 유효 범위로 정규화한다. 비유한(NaN·무한대) 값은 기본 배율(1.0)로 대체한다.
fn normalize_scale(scale: f64) -> f64 {
    if !scale.is_finite() {
        return crate::settings::Settings::default().scale;
    }
    scale.clamp(crate::settings::SCALE_MIN, crate::settings::SCALE_MAX)
}

/// 올림 + 최소 1px. 내림은 콘텐츠 마지막 픽셀을 자르므로 쓰지 않는다.
fn ceil_px(v: f64) -> u32 {
    let rounded = (v - SIZE_EPSILON).ceil();
    if rounded < 1.0 {
        1
    } else {
        rounded as u32
    }
}

/// 캔버스 크기(가로, 세로; 없거나 0이면 기준 상자로 대체)와 배율로 창 표시 크기를 구한다(순수).
///
/// 식(설계 §2.2): `fit = min(450/cw, 350/ch)`, `w = cw × fit × scale`, `h = ch × fit × scale`.
/// 비 9:7 캔버스는 여백을 포함하지 않는다(D10) — 창은 비율 유지로 맞춘 캔버스 크기만큼만 잡힌다.
pub fn overlay_display_size(canvas: Option<(u32, u32)>, scale: f64) -> OverlaySize {
    let scale = normalize_scale(scale);
    let (cw, ch) = match canvas {
        Some((w, h)) if w > 0 && h > 0 => (w as f64, h as f64),
        _ => (BASE_BOX_W, BASE_BOX_H),
    };
    let fit = (BASE_BOX_W / cw).min(BASE_BOX_H / ch);
    let w = cw * fit * scale;
    let h = ch * fit * scale;
    OverlaySize {
        width: ceil_px(w),
        height: ceil_px(h),
    }
}

/// 오버레이 창을 표시 크기로 리사이즈한다. 좌상단 고정(`set_size`는 위치를 바꾸지 않는다).
pub fn resize_overlay(
    app: &AppHandle,
    canvas: Option<(u32, u32)>,
    scale: f64,
) -> Result<OverlaySize, WindowError> {
    let size = overlay_display_size(canvas, scale);
    let win = super::overlay(app)?;
    win.set_size(Size::Logical(LogicalSize::new(
        size.width as f64,
        size.height as f64,
    )))?;
    Ok(size)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn s1_base_canvas_scale_1() {
        assert_eq!(
            overlay_display_size(Some((900, 700)), 1.0),
            OverlaySize {
                width: 450,
                height: 350
            }
        );
    }

    #[test]
    fn s2_base_canvas_scale_half() {
        assert_eq!(
            overlay_display_size(Some((900, 700)), 0.5),
            OverlaySize {
                width: 225,
                height: 175
            }
        );
    }

    #[test]
    fn s3_base_canvas_scale_2_equals_original() {
        assert_eq!(
            overlay_display_size(Some((900, 700)), 2.0),
            OverlaySize {
                width: 900,
                height: 700
            }
        );
    }

    #[test]
    fn s4_quarter_scale_rounds_up_from_half_pixel() {
        assert_eq!(
            overlay_display_size(Some((900, 700)), 0.25),
            OverlaySize {
                width: 113,
                height: 88
            }
        );
    }

    #[test]
    fn s5_epsilon_avoids_float_error_rounding_up() {
        assert_eq!(
            overlay_display_size(Some((900, 700)), 1.1),
            OverlaySize {
                width: 495,
                height: 385
            }
        );
    }

    #[test]
    fn s6_non_9x7_canvas_no_padding() {
        assert_eq!(
            overlay_display_size(Some((612, 354)), 0.5),
            OverlaySize {
                width: 225,
                height: 131
            }
        );
        assert_eq!(
            overlay_display_size(Some((612, 354)), 1.0),
            OverlaySize {
                width: 450,
                height: 261
            }
        );
        assert_eq!(
            overlay_display_size(Some((612, 354)), 2.0),
            OverlaySize {
                width: 900,
                height: 521
            }
        );
    }

    #[test]
    fn s7_tall_canvas_fits_by_height() {
        assert_eq!(
            overlay_display_size(Some((350, 700)), 1.0),
            OverlaySize {
                width: 175,
                height: 350
            }
        );
    }

    #[test]
    fn s8_small_canvas_scales_up() {
        assert_eq!(
            overlay_display_size(Some((300, 200)), 1.0),
            OverlaySize {
                width: 450,
                height: 300
            }
        );
    }

    #[test]
    fn s9_no_canvas_uses_base_box() {
        assert_eq!(
            overlay_display_size(None, 1.0),
            OverlaySize {
                width: 450,
                height: 350
            }
        );
        assert_eq!(
            overlay_display_size(None, 2.0),
            OverlaySize {
                width: 900,
                height: 700
            }
        );
    }

    #[test]
    fn s10_scale_normalization_clamp_and_non_finite() {
        assert_eq!(
            overlay_display_size(Some((900, 700)), 5.0),
            OverlaySize {
                width: 900,
                height: 700
            }
        );
        assert_eq!(
            overlay_display_size(Some((900, 700)), 0.1),
            OverlaySize {
                width: 113,
                height: 88
            }
        );
        assert_eq!(
            overlay_display_size(Some((900, 700)), f64::NAN),
            OverlaySize {
                width: 450,
                height: 350
            }
        );
        assert_eq!(
            overlay_display_size(Some((900, 700)), f64::INFINITY),
            OverlaySize {
                width: 450,
                height: 350
            }
        );
    }

    #[test]
    fn s11_zero_dimension_canvas_falls_back_to_base_box() {
        assert_eq!(
            overlay_display_size(Some((0, 700)), 1.0),
            OverlaySize {
                width: 450,
                height: 350
            }
        );
        assert_eq!(
            overlay_display_size(Some((900, 0)), 1.0),
            OverlaySize {
                width: 450,
                height: 350
            }
        );
    }

    #[test]
    fn s12_size_bounds_hold_across_canvases() {
        let canvases = [
            (900, 700),
            (612, 354),
            (350, 700),
            (300, 200),
            (1, 1),
            (900, 1),
        ];
        for c in canvases {
            let size = overlay_display_size(Some(c), 2.0);
            assert!(size.width <= 900 && size.height <= 700);
            assert!(size.width >= 1 && size.height >= 1);
        }
    }
}
