//! 오버레이 오른쪽 클릭 신호(overlay R-40, CR-062).
//! [목적] 훅이 실제로 본 오른쪽 버튼 누름→뗌 한 쌍의 화면 좌표를 기억했다가 짝지어 돌려준다.
//!        메뉴를 띄울지(창 사각형·전체 화면·열림 가드)는 이 파일 밖(tray)이 판단한다.
//! [공개 API] `ScreenPoint { x, y }`, `RightClick { down, up }`. 나머지(`RightClickTracker`)는
//!        `pub(super)` — `hook::mod`만 쓴다.
//! [스레드] 없음(순수 자료구조). 호출자는 hook 콜백(`mouse_proc`)뿐이다.
//! [unsafe] 없음. Win32 호출·로그 없음.
//! [에러] 없음 — 실패할 연산이 없다.
//! [설정] 없음.
//! [테스트] RC1~RC6(지역 `RightClickTracker::new()`만 사용, 전역 상태 없음 — hook.md §3.9.5).

/// 화면 좌표(물리 px, 가상 화면). `InputEvent::MouseMove`와 같은 좌표계(`MSLLHOOKSTRUCT.pt`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScreenPoint {
    pub x: i32,
    pub y: i32,
}

/// 훅이 실제로 본 오른쪽 버튼 누름→뗌 한 쌍. 합성 뗌(CR-046 정리)에서는 만들지 않는다.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RightClick {
    pub down: ScreenPoint,
    pub up: ScreenPoint,
}

/// 오른쪽 누름 좌표 1개만 기억한다(개인정보 규칙 P7). 떼거나 정리하면 비운다.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) struct RightClickTracker {
    down: Option<ScreenPoint>,
}

impl RightClickTracker {
    pub(super) const fn new() -> Self {
        Self { down: None }
    }

    /// 오른쪽 누름 좌표를 기억한다(뗌 유실 뒤 새 누름이면 덮어쓴다).
    pub(super) fn on_down(&mut self, p: ScreenPoint) {
        self.down = Some(p);
    }

    /// 기억한 누름과 짝지어 한 쌍을 돌려주고 비운다(한 쌍은 한 번만 나간다).
    pub(super) fn on_up(&mut self, p: ScreenPoint) -> Option<RightClick> {
        self.down.take().map(|down| RightClick { down, up: p })
    }

    pub(super) fn clear(&mut self) {
        self.down = None;
    }

    /// 메시지 매핑(순수). `WM_RBUTTONDOWN` → 기억, `WM_RBUTTONUP` → 짝짓기, 그 밖은 상태 불변.
    pub(super) fn on_message(&mut self, msg: u32, p: ScreenPoint) -> Option<RightClick> {
        use windows::Win32::UI::WindowsAndMessaging::{WM_RBUTTONDOWN, WM_RBUTTONUP};
        match msg {
            WM_RBUTTONDOWN => {
                self.on_down(p);
                None
            }
            WM_RBUTTONUP => self.on_up(p),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const WM_RBUTTONDOWN: u32 = windows::Win32::UI::WindowsAndMessaging::WM_RBUTTONDOWN;
    const WM_RBUTTONUP: u32 = windows::Win32::UI::WindowsAndMessaging::WM_RBUTTONUP;
    const WM_MOUSEMOVE: u32 = windows::Win32::UI::WindowsAndMessaging::WM_MOUSEMOVE;
    const WM_LBUTTONDOWN: u32 = windows::Win32::UI::WindowsAndMessaging::WM_LBUTTONDOWN;
    const WM_LBUTTONUP: u32 = windows::Win32::UI::WindowsAndMessaging::WM_LBUTTONUP;

    fn p(x: i32, y: i32) -> ScreenPoint {
        ScreenPoint { x, y }
    }

    #[test]
    fn down_then_up_pairs() {
        let mut t = RightClickTracker::new();
        t.on_down(p(1, 2));
        assert_eq!(
            t.on_up(p(3, 4)),
            Some(RightClick {
                down: p(1, 2),
                up: p(3, 4),
            })
        );
    }

    #[test]
    fn up_without_down_is_none() {
        let mut t = RightClickTracker::new();
        assert_eq!(t.on_up(p(3, 4)), None);
    }

    #[test]
    fn second_down_overwrites() {
        let mut t = RightClickTracker::new();
        t.on_down(p(1, 1));
        t.on_down(p(5, 5));
        assert_eq!(
            t.on_up(p(6, 6)),
            Some(RightClick {
                down: p(5, 5),
                up: p(6, 6),
            })
        );
    }

    #[test]
    fn clear_drops_pending_down() {
        let mut t = RightClickTracker::new();
        t.on_down(p(1, 1));
        t.clear();
        assert_eq!(t.on_up(p(2, 2)), None);
    }

    #[test]
    fn pair_is_consumed_once() {
        let mut t = RightClickTracker::new();
        t.on_down(p(1, 1));
        assert!(t.on_up(p(2, 2)).is_some());
        assert_eq!(t.on_up(p(3, 3)), None);
    }

    #[test]
    fn on_message_maps_right_button_only() {
        let mut t = RightClickTracker::new();
        assert_eq!(t.on_message(WM_RBUTTONDOWN, p(1, 2)), None);
        assert_eq!(t.on_message(WM_MOUSEMOVE, p(9, 9)), None);
        assert_eq!(t.on_message(WM_LBUTTONDOWN, p(9, 9)), None);
        assert_eq!(t.on_message(WM_LBUTTONUP, p(9, 9)), None);
        assert_eq!(
            t.on_message(WM_RBUTTONUP, p(3, 4)),
            Some(RightClick {
                down: p(1, 2),
                up: p(3, 4),
            })
        );
        assert_eq!(t.on_message(0x9999, p(0, 0)), None);
    }
}
