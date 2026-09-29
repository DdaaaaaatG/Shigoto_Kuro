//! 전경 창 조회 안전 래퍼(overlay R-40 AC-8).
//! [목적] tray가 "지금 전경 창이 다른 앱의 전체 화면인가"를 판정하도록, 필요한 Win32 조회를
//!        안전 함수 `foreground_snapshot()` 하나로 감싼다. 생략 여부 판정 자체는 이 파일 밖
//!        (tray)이 한다. 훅 콜백·훅 스레드·`KeyTable`과 무관한 래퍼다 — hook 모듈이 앱의 유일한
//!        unsafe 구역이라 여기 둔다(golden-principles §6).
//! [공개 API] `ScreenRect { left, top, right, bottom }` + `covers`, `ForegroundSnapshot { own_process,
//!        shell, client, monitor }`, `foreground_snapshot() -> Option<ForegroundSnapshot>`.
//! [스레드] 어느 스레드에서나 부를 수 있다. **훅 콜백 안에서는 부르지 않는다**(호출자는 tray의
//!        `overlay-menu` 스레드).
//! [unsafe] U12~U19 — 전경 창 조회 8종(`GetForegroundWindow`·`GetWindowThreadProcessId`·
//!        `GetShellWindow`·`GetClassNameW`·`GetClientRect`·`ClientToScreen`·`MonitorFromWindow`·
//!        `GetMonitorInfoW`). 각 블록 위에 SAFETY 주석. 훅 콜백·훅 스레드와 무관.
//! [에러] 없음 — 전경 창이 없거나 조회가 하나라도 실패하면 `None`(fail-open, 에러 타입 아님).
//! [설정] 없음.
//! [테스트] FG1~FG6(순수 `covers`·`is_shell_class`). `foreground_snapshot()` 자체는 실행 순간의
//!        전경 창에 좌우돼 결정적이지 않아 자동 테스트하지 않는다 — 수동은 tray.md §8.3 MC-40~MC-45.

use windows::Win32::Foundation::{HWND, POINT, RECT};
use windows::Win32::Graphics::Gdi::{
    ClientToScreen, GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};
use windows::Win32::UI::WindowsAndMessaging::{
    GetClassNameW, GetClientRect, GetForegroundWindow, GetShellWindow, GetWindowThreadProcessId,
};

/// 화면 사각형(물리 px). right·bottom 은 끝(exclusive) 좌표 — Win32 `RECT`와 같다.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScreenRect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

impl ScreenRect {
    /// self 가 other 를 완전히 덮는가(가장자리 포함): left ≤, top ≤, right ≥, bottom ≥.
    pub fn covers(&self, other: &ScreenRect) -> bool {
        self.left <= other.left
            && self.top <= other.top
            && self.right >= other.right
            && self.bottom >= other.bottom
    }
}

/// 전경 창 요약. 클래스명·pid·창 제목은 밖으로 내보내지 않는다(비교 결과만 — 개인정보 P7).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ForegroundSnapshot {
    pub own_process: bool,
    pub shell: bool,
    pub client: ScreenRect,
    pub monitor: ScreenRect,
}

const SHELL_CLASSES: [&str; 4] = [
    "Progman",
    "WorkerW",
    "Shell_TrayWnd",
    "Shell_SecondaryTrayWnd",
];

/// 전경 창이 없거나 조회가 하나라도 실패하면 `None`(호출자는 "띄움" — fail-open).
/// 어느 스레드에서나 부를 수 있다. **훅 콜백 안에서는 부르지 않는다.**
pub fn foreground_snapshot() -> Option<ForegroundSnapshot> {
    let hwnd = foreground_hwnd()?;
    let own_process = window_pid(hwnd)? == std::process::id();
    let shell = hwnd == shell_hwnd() || class_is_shell(hwnd)?;
    let client = client_rect_on_screen(hwnd)?;
    let monitor = monitor_rect(hwnd)?;
    Some(ForegroundSnapshot {
        own_process,
        shell,
        client,
        monitor,
    })
}

fn foreground_hwnd() -> Option<HWND> {
    // SAFETY: (U12) 인자 없는 조회. 반환 HWND 값만 읽고 역참조하지 않는다. NULL 가능 —
    // 호출자가 검사한다.
    let hwnd = unsafe { GetForegroundWindow() };
    (!hwnd.is_invalid()).then_some(hwnd)
}

fn window_pid(hwnd: HWND) -> Option<u32> {
    let mut pid = 0u32;
    // SAFETY: (공통) hwnd 는 GetForegroundWindow 가 방금 준 값이라 그새 무효가 될 수 있으나,
    // 커널이 핸들을 검증해 실패 값만 돌려준다 — 핸들 유효성은 메모리 안전 전제가 아니다.
    // (U13) 출력 포인터는 이 스택 프레임의 지역 u32 를 가리키고 호출 동안 유효하다. 실패 시
    // pid는 쓰지 않는다(tid 0이면 버림).
    let tid = unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid as *mut u32)) };
    (tid != 0).then_some(pid)
}

fn shell_hwnd() -> HWND {
    // SAFETY: (U14) 인자 없는 조회. 반환 값은 비교에만 쓴다.
    unsafe { GetShellWindow() }
}

fn class_is_shell(hwnd: HWND) -> Option<bool> {
    let mut buf = [0u16; 256];
    // SAFETY: (공통) hwnd 는 GetForegroundWindow 가 방금 준 값이라 그새 무효가 될 수 있으나,
    // 커널이 핸들을 검증해 실패 값만 돌려준다 — 핸들 유효성은 메모리 안전 전제가 아니다.
    // (U15) 버퍼는 이 스택 프레임의 [u16; 256]이고 windows 크레이트가 슬라이스 길이를
    // 최대 문자 수로 넘겨 넘침이 없다. 반환 n 은 복사한 문자 수(0..=255)라 n > 0 검사 뒤
    // &buf[..n as usize]가 범위 안이다.
    let n = unsafe { GetClassNameW(hwnd, &mut buf) };
    (n > 0).then(|| is_shell_class(&buf[..n as usize]))
}

fn client_rect_on_screen(hwnd: HWND) -> Option<ScreenRect> {
    let mut rc = RECT::default();
    // SAFETY: (공통) hwnd 는 GetForegroundWindow 가 방금 준 값이라 그새 무효가 될 수 있으나,
    // 커널이 핸들을 검증해 실패 값만 돌려준다 — 핸들 유효성은 메모리 안전 전제가 아니다.
    // (U16) 출력 포인터는 지역 RECT. 실패는 Err 로 돌아온다.
    unsafe { GetClientRect(hwnd, &mut rc) }.ok()?;
    let (x1, y1) = to_screen(hwnd, rc.left, rc.top)?;
    let (x2, y2) = to_screen(hwnd, rc.right, rc.bottom)?;
    // 두 점을 min/max 로 정규화한다(RTL 창 대응, hook.md §11 D30).
    Some(ScreenRect {
        left: x1.min(x2),
        top: y1.min(y2),
        right: x1.max(x2),
        bottom: y1.max(y2),
    })
}

fn to_screen(hwnd: HWND, x: i32, y: i32) -> Option<(i32, i32)> {
    let mut pt = POINT { x, y };
    // SAFETY: (공통) hwnd 는 GetForegroundWindow 가 방금 준 값이라 그새 무효가 될 수 있으나,
    // 커널이 핸들을 검증해 실패 값만 돌려준다 — 핸들 유효성은 메모리 안전 전제가 아니다.
    // (U17) 입출력 포인터는 지역 POINT. 실패는 BOOL 거짓.
    let ok = unsafe { ClientToScreen(hwnd, &mut pt) };
    ok.as_bool().then_some((pt.x, pt.y))
}

fn monitor_rect(hwnd: HWND) -> Option<ScreenRect> {
    // SAFETY: (공통) hwnd 는 GetForegroundWindow 가 방금 준 값이라 그새 무효가 될 수 있으나,
    // 커널이 핸들을 검증해 실패 값만 돌려준다 — 핸들 유효성은 메모리 안전 전제가 아니다.
    // (U18) 포인터 인자 없음. 반환 모니터 핸들은 소유권이 없어 해제하지 않는다.
    let hmon = unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST) };
    if hmon.is_invalid() {
        return None;
    }
    let mut mi = MONITORINFO {
        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };
    // SAFETY: (U19) mi 는 지역 MONITORINFO 이고 cbSize 를 호출 전에 채워 함수가 그 크기까지만
    // 쓴다. hmon 은 U18 이 방금 준 NULL 아닌 값이다.
    let ok = unsafe { GetMonitorInfoW(hmon, &mut mi) };
    ok.as_bool().then_some(ScreenRect {
        left: mi.rcMonitor.left,
        top: mi.rcMonitor.top,
        right: mi.rcMonitor.right,
        bottom: mi.rcMonitor.bottom,
    })
}

/// 할당 없는 완전 일치 비교(UTF-16).
fn is_shell_class(name: &[u16]) -> bool {
    SHELL_CLASSES
        .iter()
        .any(|c| name.iter().copied().eq(c.encode_utf16()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(left: i32, top: i32, right: i32, bottom: i32) -> ScreenRect {
        ScreenRect {
            left,
            top,
            right,
            bottom,
        }
    }

    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().collect()
    }

    #[test]
    fn covers_same_rect_edges_inclusive() {
        let r = rect(0, 0, 1920, 1080);
        assert!(r.covers(&rect(0, 0, 1920, 1080)));
    }

    #[test]
    fn covers_larger_on_all_sides() {
        let r = rect(-8, -8, 1928, 1088);
        assert!(r.covers(&rect(0, 0, 1920, 1080)));
    }

    #[test]
    fn covers_short_side_is_false() {
        let target = rect(0, 0, 1920, 1080);
        assert!(!rect(0, 0, 1920, 1040).covers(&target));
        assert!(!rect(0, 23, 1920, 1080).covers(&target));
    }

    #[test]
    fn covers_negative_secondary_monitor() {
        let target = rect(-1920, 0, 0, 1080);
        assert!(rect(-1920, 0, 0, 1080).covers(&target));
        assert!(!rect(0, 0, 1920, 1080).covers(&target));
    }

    #[test]
    fn shell_classes_match() {
        for c in SHELL_CLASSES {
            assert!(is_shell_class(&wide(c)), "{c} 는 셸 클래스여야 한다");
        }
    }

    #[test]
    fn other_classes_do_not_match() {
        for c in [
            "UnityWndClass",
            "Chrome_WidgetWin_1",
            "",
            "ProgmanX",
            "Progma",
        ] {
            assert!(
                !is_shell_class(&wide(c)),
                "{c} 는 셸 클래스가 아니어야 한다"
            );
        }
    }
}
