//! 오버레이 창 제어.
//!
//! [목적] 오버레이 창의 위치 조회·이동, 표시/숨김, 가상 화면(모든 모니터 합집합) 범위 계산,
//!        드래그 이동 저장·시작 시 복원(OV-R-13), 표시 크기 자동 리사이즈(OV-R-03),
//!        `set_settings`가 위치를 건드리지 않도록 하는 순수 병합(§2.1.1).
//! [공개 API] `overlay_position`, `set_overlay_position`, `set_overlay_visible`,
//!            `screen_bounds`, `apply_overlay_settings`(재정의: `visible`만 적용, 유지·폐기 예정),
//!            `apply_overlay_window`(SV2-03·04, 표시/숨김+작업표시줄+클릭 통과를 매번 재적용),
//!            `default_overlay_position`(SV2-06, (100,100) 단일 출처),
//!            `show_settings_window`, `union`,
//!            `list_monitors`(CR-017, 모니터별 사각형. 물리 px, 훅 마우스 좌표와 같은 좌표계),
//!            `placement::{MOVE_SAVE_DEBOUNCE, MIN_VISIBLE_PX, resolve_overlay_position,
//!            restore_overlay_position, watch_overlay_moves, persist_overlay_position,
//!            keep_overlay_position, keep_core_owned(SV2-05), reset_overlay_position(SV2-06)}`,
//!            `sizing::{OverlaySize, overlay_display_size, resize_overlay}`.
//! [방식] 전부 Tauri 창·모니터 API. Win32(GetSystemMetrics 등)를 직접 부르지 않는다 —
//!        저수준 후킹 코드는 hook/ 에만 허용(확정사항 §2). 필요해지면 hook 모듈에 위임한다.
//! [좌표] 위치는 물리 픽셀(훅이 주는 마우스 좌표와 같은 좌표계). 크기(`OverlaySize`)는 논리
//!        px(= ui CSS px). `list_monitors`의 모니터 사각형도 물리 px, 가상 화면 좌표(모니터
//!        전체 — 작업 영역 아님).
//! [저수준 호출] 없음.
//! [에러] `WindowError`(모듈 신규). `code()`는 기존 bridge 코드값과 같다. 이 모듈의 공개
//!        함수 중 기존 6개(`overlay_position`·`set_overlay_position`·`set_overlay_visible`·
//!        `apply_overlay_settings`·`show_settings_window`·`screen_bounds`)는 **당분간
//!        `BridgeError`를 그대로 반환**한다(내부에서 `WindowError`를 `?`로 변환).
//!        호출부(`bridge/`·`tray/`)를 깨지 않기 위한 임시 조치이며, 반환 타입을
//!        `WindowError`로 바꾸는 것은 bridge-implementer가 호출부와 함께 다음 단계에서 한다
//!        (설계 §11 파급표). 신규 함수(`placement::*`·`sizing::*`)는 설계대로 `WindowError`를
//!        직접 반환한다.
//! [설정] `placement.rs`·`sizing.rs` 참고. 이 파일(`mod.rs`) 자체는 설정을 읽거나 쓰지 않는다.
//! [테스트] 창이 필요한 함수는 자동 테스트 없음. 순수 계산(bounds 합집합)은 단위 테스트.
//!        `placement.rs`·`sizing.rs`의 테스트는 각 파일 참고.

use serde::Serialize;
use tauri::{AppHandle, Manager, PhysicalPosition, Position};

use crate::error::BridgeError;
use crate::settings::{OverlaySettings, Settings};

mod placement;
mod sizing;

pub use placement::{
    keep_core_owned, keep_overlay_position, persist_overlay_position, reset_overlay_position,
    resolve_overlay_position, restore_overlay_position, watch_overlay_moves, MIN_VISIBLE_PX,
    MOVE_SAVE_DEBOUNCE,
};
pub use sizing::{overlay_display_size, resize_overlay, OverlaySize};

pub const OVERLAY_LABEL: &str = "overlay";
pub const SETTINGS_LABEL: &str = "settings";

/// window 모듈 전용 에러(설계 §6). `code()`는 기존 bridge 코드값과 같다.
#[derive(Debug, thiserror::Error)]
pub enum WindowError {
    #[error("{0} 창을 찾을 수 없습니다.")]
    NotFound(&'static str),
    #[error("모니터 정보를 읽을 수 없습니다.")]
    NoMonitor,
    #[error("창을 제어하지 못했습니다: {0}")]
    Tauri(#[from] tauri::Error),
    #[error("설정 상태가 손상되었습니다. 앱을 다시 시작하세요.")]
    StatePoisoned,
    #[error(transparent)]
    Settings(#[from] crate::settings::SettingsError),
    #[error("창 위치 저장 스레드를 시작하지 못했습니다: {0}")]
    Thread(#[source] std::io::Error),
}

impl WindowError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::NotFound(_) => "window.not_found",
            Self::NoMonitor => "window.no_monitor",
            Self::Tauri(_) => "tauri.error",
            Self::StatePoisoned => "state.poisoned",
            Self::Settings(e) => e.code(),
            Self::Thread(_) => "window.thread",
        }
    }
}

/// 같은 크레이트 안에서만 쓰는 임시 변환(설계 §6·§11). 기존 공개 함수 6개의 반환 타입을
/// `BridgeError`로 유지하기 위함이다 — 반환 타입 전환은 호출부와 함께 다음 단계에서 한다.
impl From<WindowError> for BridgeError {
    fn from(e: WindowError) -> Self {
        BridgeError::new(e.code(), e.to_string())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Point {
    pub x: i32,
    pub y: i32,
}

/// 오버레이 창 조회. 비공개 — `placement.rs`·`sizing.rs`(하위 모듈)는 `super::overlay`로 접근한다.
fn overlay(app: &AppHandle) -> Result<tauri::WebviewWindow, WindowError> {
    app.get_webview_window(OVERLAY_LABEL)
        .ok_or(WindowError::NotFound("오버레이"))
}

/// 모든 모니터 사각형 목록(물리 px, 모니터 전체 — 작업 영역 아님). 커서 좌표(훅)와 같은
/// 좌표계라 ui 가 커서 모니터 판정·이동 영역 매핑에 쓴다(CR-017, R-tmp-4). `screen_bounds`와
/// `placement::restore_overlay_position`이 공유한다. 모니터가 없으면 빈 `Vec`(오류 아님).
pub fn list_monitors(app: &AppHandle) -> Result<Vec<ScreenBounds>, WindowError> {
    let monitors = app.available_monitors()?;
    Ok(monitors
        .iter()
        .map(|m| {
            let p = m.position();
            let s = m.size();
            ScreenBounds {
                x: p.x,
                y: p.y,
                width: s.width,
                height: s.height,
            }
        })
        .collect())
}

pub fn overlay_position(app: &AppHandle) -> Result<Point, BridgeError> {
    let pos = overlay(app)?.outer_position()?;
    Ok(Point { x: pos.x, y: pos.y })
}

pub fn set_overlay_position(app: &AppHandle, x: i32, y: i32) -> Result<(), BridgeError> {
    overlay(app)?.set_position(Position::Physical(PhysicalPosition { x, y }))?;
    Ok(())
}

pub fn set_overlay_visible(app: &AppHandle, visible: bool) -> Result<(), BridgeError> {
    let win = overlay(app)?;
    if visible {
        win.show()?;
    } else {
        win.hide()?;
    }
    Ok(())
}

/// 오버레이 설정 중 창에 적용할 부분을 반영한다. **`s.x/y`는 읽지 않는다** — 위치의 주인은
/// 창(드래그·시작 복원·`set_overlay_position`)이다(설계 §2.1.1). `visible`만 적용한다.
pub fn apply_overlay_settings(app: &AppHandle, s: &OverlaySettings) -> Result<(), BridgeError> {
    set_overlay_visible(app, s.visible)
}

/// (100, 100) — 화면 밖 폴백과 위치 초기화의 단일 출처(SV2-06). Windows 가상 화면의 주 모니터
/// 원점은 항상 (0,0)이라 이 점은 주 모니터 안이다.
pub fn default_overlay_position() -> Point {
    let d = Settings::default().overlay;
    Point { x: d.x, y: d.y }
}

/// 오버레이 창 상태를 설정대로 맞춘다(SV2-03·04). 멱등. 창 위치는 읽지도 옮기지도 않는다(§2.1.1).
/// 순서 고정: ① 표시/숨김 ② 작업표시줄 ③ 클릭 통과. 중간 실패는 그 오류를 반환하고 앞 단계는
/// 되돌리지 않는다(다음 호출이 다시 맞춘다).
pub fn apply_overlay_window(app: &AppHandle, settings: &Settings) -> Result<(), WindowError> {
    let win = overlay(app)?;
    if settings.overlay.visible {
        win.show()?;
    } else {
        win.hide()?;
    }
    win.set_skip_taskbar(!settings.show_in_taskbar)?;
    win.set_ignore_cursor_events(settings.position_lock)?;
    Ok(())
}

/// 설정 창을 연다. 창이 이미 있으면(숨김 상태 포함) 그대로 보여준다. 사용자가 설정 창을
/// X로 닫으면 `on_window_event`(설계 §2.5, lib.rs)가 `CloseRequested`를 가로채 숨기기만
/// 하므로 보통은 이 분기로 충분하다. 그래도 창이 파괴된 경우(예: 예외적 종료)를 대비해
/// `tauri.conf.json`의 `settings` 항목으로 재생성한다(CR-041).
pub fn show_settings_window(app: &AppHandle) -> Result<(), BridgeError> {
    let win = match app.get_webview_window(SETTINGS_LABEL) {
        Some(w) => w,
        None => rebuild_settings_window(app).map_err(BridgeError::from)?,
    };
    win.show()?;
    win.set_focus()?;
    Ok(())
}

/// `settings` 라벨의 창을 `tauri.conf.json` 설정 그대로 다시 만든다. 설정 항목 자체가 없으면
/// `NotFound`(정상적으로는 일어나지 않는다 — 항목은 정적 설정 파일에 항상 있다).
fn rebuild_settings_window(app: &AppHandle) -> Result<tauri::WebviewWindow, WindowError> {
    let window_config = app
        .config()
        .app
        .windows
        .iter()
        .find(|w| w.label == SETTINGS_LABEL)
        .cloned()
        .ok_or(WindowError::NotFound("설정"))?;
    let win = tauri::WebviewWindowBuilder::from_config(app, &window_config)?.build()?;
    Ok(win)
}

/// 모든 모니터의 합집합 = 가상 화면.
pub fn screen_bounds(app: &AppHandle) -> Result<ScreenBounds, BridgeError> {
    let rects = list_monitors(app)?;
    union(&rects)
        .ok_or(WindowError::NoMonitor)
        .map_err(BridgeError::from)
}

/// 사각형 합집합. 비어 있으면 None.
pub fn union(rects: &[ScreenBounds]) -> Option<ScreenBounds> {
    let first = rects.first()?;
    let (mut min_x, mut min_y) = (first.x, first.y);
    let (mut max_x, mut max_y) = (first.x + first.width as i32, first.y + first.height as i32);
    for r in &rects[1..] {
        min_x = min_x.min(r.x);
        min_y = min_y.min(r.y);
        max_x = max_x.max(r.x + r.width as i32);
        max_y = max_y.max(r.y + r.height as i32);
    }
    Some(ScreenBounds {
        x: min_x,
        y: min_y,
        width: (max_x - min_x) as u32,
        height: (max_y - min_y) as u32,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn union_of_two_side_by_side_monitors() {
        let a = ScreenBounds {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        };
        let b = ScreenBounds {
            x: -1920,
            y: 0,
            width: 1920,
            height: 1080,
        };
        assert_eq!(
            union(&[a, b]),
            Some(ScreenBounds {
                x: -1920,
                y: 0,
                width: 3840,
                height: 1080
            })
        );
    }

    #[test]
    fn union_of_none_is_none() {
        assert_eq!(union(&[]), None);
    }
}
