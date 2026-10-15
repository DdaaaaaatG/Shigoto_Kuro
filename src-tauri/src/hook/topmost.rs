//! 오버레이 "항상 위" 재적용 래퍼 (overlay R-01 보강, WT-01~WT-09).
//!
//! [목적] 오버레이가 다른 창 아래로 밀려도 전경 창 변화·창 속성 적용·트레이 「새로고침」 때
//!        다시 맨 위로 올린다. 숨김 상태(미등록)이면 절대 올리지도 보이게 하지도 않는다.
//! [공개 API] `OverlayHwnd`, `OverlayHwnd::from_raw`, `set_topmost_target`, `reassert_topmost_now`.
//!        (`pub(super)`: `install_foreground_watch`, `remove_foreground_watch`, `ForegroundWatch`)
//! [스레드] 전경 변화 감시는 기존 훅 스레드의 `GetMessageW` 루프에 붙는다(새 스레드 없음).
//!        `set_topmost_target`·`reassert_topmost_now`는 어느 스레드에서나 부른다.
//!        WinEvent 콜백은 원자 변수 읽기와 비동기 요청만 하고 즉시 돌아온다(잠금·로그·할당 없음).
//! [unsafe] 이 파일의 U20~U27 (hook.md §3.11.4). 블록마다 `// SAFETY:` 를 단다.
//! [에러] 없음. Win32 실패는 버린다(재적용은 다음 트리거에서 다시 시도된다).
//! [설정] 없음.
//! [개인정보] 어느 창이 전경이 됐는지 보지 않는다. 창 제목·클래스명은 조회도 기록도 하지 않는다.
//!        로그는 `target: "kuro_diag"` debug 에 동작 종류와 누적 횟수만 남긴다.
//! [테스트] 판정 `decide` TP1~TP6, `OverlayHwnd::from_raw` TP7·TP8 단위 테스트. 실제 창이
//!        필요한 부분은 코드 리뷰 + 수동(window.md §3.2.4 MC-51~MC-62).

use std::sync::atomic::{AtomicIsize, AtomicU64, Ordering};

use windows::Win32::Foundation::{HMODULE, HWND};
use windows::Win32::System::Threading::GetCurrentProcessId;
use windows::Win32::UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK};
use windows::Win32::UI::WindowsAndMessaging::{
    GetWindowThreadProcessId, IsIconic, IsWindow, IsWindowVisible, SetWindowPos, ShowWindowAsync,
    EVENT_SYSTEM_FOREGROUND, HWND_TOPMOST, SWP_ASYNCWINDOWPOS, SWP_NOACTIVATE, SWP_NOMOVE,
    SWP_NOSIZE, SW_SHOWNOACTIVATE, WINEVENT_OUTOFCONTEXT, WINEVENT_SKIPOWNPROCESS,
};

/// 등록된 오버레이 HWND 값. 0 = 등록 없음.
static TARGET: AtomicIsize = AtomicIsize::new(0);
/// Skip 이 아닌 재적용 누적 횟수(진단 로그용 — 시각·창 정보는 담지 않는다, WT-09).
static REASSERTS: AtomicU64 = AtomicU64::new(0);

/// 오버레이 창 핸들 값(정수). Win32 `HWND` 는 `Send` 가 아니고 Tauri 가 쓰는 windows 버전의
/// 타입과도 달라 정수로 받는다. 값이 가리키는 창의 유효성은 보장하지 않는다(쓸 때마다 확인, WT-08).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct OverlayHwnd(isize);

impl OverlayHwnd {
    /// window 가 `WebviewWindow::hwnd()?.0 as isize` 로 만든 값을 받는다. 0이면 `None`.
    pub fn from_raw(raw: isize) -> Option<Self> {
        if raw == 0 {
            None
        } else {
            Some(Self(raw))
        }
    }
}

/// 재적용 대상 등록(WT-03·WT-05). `Some` = 사용자가 보이게 둔 오버레이, `None` = 숨김·파괴·
/// 미등록 — 이후 어떤 트리거도 아무것도 하지 않는다. 어느 스레드에서나, 즉시 반환.
pub fn set_topmost_target(target: Option<OverlayHwnd>) {
    TARGET.store(target.map_or(0, |t| t.0), Ordering::SeqCst);
}

/// 등록된 대상에 지금 한 번 재적용(트리거 ⓑ·ⓒ — WT-03·WT-04). 등록이 없으면 아무것도 하지
/// 않는다. 메인 스레드를 기다리지 않는다(`SWP_ASYNCWINDOWPOS`). **훅 콜백 안에서는 부르지
/// 않는다**(로그를 남긴다). 실패는 밖으로 내지 않는다.
pub fn reassert_topmost_now() {
    let action = reassert(TARGET.load(Ordering::SeqCst));
    log::debug!(
        target: "kuro_diag",
        "topmost reassert action={action:?} total={}",
        REASSERTS.load(Ordering::Relaxed)
    );
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TopmostAction {
    Skip,
    Raise,
    RestoreThenRaise,
}

/// 순수 판정. registered = 등록 값 ≠ 0, own = 살아 있고 자기 프로세스 창,
/// visible = 보임, iconic = 최소화.
fn decide(registered: bool, own: bool, visible: bool, iconic: bool) -> TopmostAction {
    if !registered || !own {
        return TopmostAction::Skip; // WT-05 숨김·미등록 / WT-08 파괴·재사용 HWND
    }
    if iconic && visible {
        TopmostAction::RestoreThenRaise // WT-06
    } else {
        TopmostAction::Raise // 안 보이면 Z 순서만 — 절대 보이게 하지 않는다
    }
}

/// 트리거 3곳의 공통 절차. 잠금·로그·할당·panic 경로 없음(콜백에서도 부른다).
fn reassert(raw: isize) -> TopmostAction {
    let hwnd = HWND(raw as *mut core::ffi::c_void);
    let registered = raw != 0;
    let own = registered && is_own_window(hwnd);
    let (visible, iconic) = if own {
        (is_visible(hwnd), is_iconic(hwnd))
    } else {
        (false, false)
    };
    let action = decide(registered, own, visible, iconic);
    match action {
        TopmostAction::Skip => return action,
        TopmostAction::RestoreThenRaise => show_no_activate(hwnd),
        TopmostAction::Raise => {}
    }
    raise(hwnd);
    REASSERTS.fetch_add(1, Ordering::Relaxed);
    action
}

// HWND 인자 블록 U22~U27 공통 전제: 인자 HWND 는 등록 값(정수)을 되돌린 것이라 이미 파괴됐거나
// 다른 창에 재사용됐을 수 있다. 커널이 핸들을 검증해 무효면 실패 값만 돌려주므로 핸들 유효성은
// 메모리 안전의 전제가 아니다. 재사용 창을 건드리지 않는 것은 정확성 규칙이며 U22·U23 판정이 맡는다.
// 호출 스레드 조건 없음.

fn is_own_window(hwnd: HWND) -> bool {
    // SAFETY: (공통 전제) 포인터 인자 없음. 반환 BOOL 만 읽는다.
    if !unsafe { IsWindow(hwnd) }.as_bool() {
        return false;
    }
    let mut pid: u32 = 0;
    // SAFETY: (공통 전제) 출력 포인터는 이 스택 프레임의 지역 u32. 실패 시 pid 는 쓰이지 않고 tid 0 이 돌아온다.
    let tid = unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
    // SAFETY: 인자·포인터 없는 단순 조회.
    tid != 0 && pid == unsafe { GetCurrentProcessId() }
}

fn is_visible(hwnd: HWND) -> bool {
    // SAFETY: (공통 전제) 포인터 인자 없음. 반환 BOOL 만 읽는다.
    unsafe { IsWindowVisible(hwnd) }.as_bool()
}

fn is_iconic(hwnd: HWND) -> bool {
    // SAFETY: (공통 전제) 포인터 인자 없음. 반환 BOOL 만 읽는다.
    unsafe { IsIconic(hwnd) }.as_bool()
}

fn show_no_activate(hwnd: HWND) {
    // SAFETY: (공통 전제) 포인터 인자 없음. 다른 스레드 창이면 요청을 넣고 바로 돌아와 이 스레드가
    // 막히지 않는다. 반환값은 이전 가시성일 뿐 오류가 아니라 버린다.
    let _ = unsafe { ShowWindowAsync(hwnd, SW_SHOWNOACTIVATE) };
}

fn raise(hwnd: HWND) {
    // SAFETY: (공통 전제) 포인터 인자 없음(HWND_TOPMOST 는 상수 −1). SWP_ASYNCWINDOWPOS 로 다른
    // 스레드 창이면 요청만 넣어 막히지 않는다. 실패(Err)는 버린다.
    let _ = unsafe {
        SetWindowPos(
            hwnd,
            HWND_TOPMOST,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_ASYNCWINDOWPOS,
        )
    };
}

/// 훅 스레드 전용 감시 핸들. `HWINEVENTHOOK` 는 `Send` 가 아니라 훅 스레드 지역 변수로만 둔다.
pub(super) struct ForegroundWatch(HWINEVENTHOOK);

/// 저수준 훅 두 개 설치 직후·준비 신호 전에 훅 스레드에서 부른다. 실패하면 `None`.
pub(super) fn install_foreground_watch() -> Option<ForegroundWatch> {
    // SAFETY: 콜백은 이 파일의 extern "system" 함수라 프로세스 수명 동안 유효하다. OUTOFCONTEXT 라
    // 다른 프로세스에 코드가 주입되지 않고, 콜백은 이 스레드의 메시지 루프 안에서만 불린다(호출
    // 스레드 = 훅 스레드, 메시지 루프 있음). 포인터 인자 없음. NULL 반환은 실패로 처리한다.
    let hook = unsafe {
        SetWinEventHook(
            EVENT_SYSTEM_FOREGROUND,
            EVENT_SYSTEM_FOREGROUND,
            HMODULE::default(),
            Some(on_foreground_event),
            0,
            0,
            WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS,
        )
    };
    if hook.is_invalid() {
        None
    } else {
        Some(ForegroundWatch(hook))
    }
}

/// 메시지 루프를 빠져나온 뒤, `UnhookWindowsHookEx` 앞에서 설치 스레드와 같은 스레드에서 부른다.
pub(super) fn remove_foreground_watch(w: ForegroundWatch) {
    // SAFETY: install_foreground_watch 가 이 스레드에서 돌려준 NULL 아닌 핸들을 같은 스레드에서 한
    // 번만 해제한다(ForegroundWatch 를 값으로 받아 소비). 실패해도 스레드·프로세스 종료로 훅이 사라진다.
    let _ = unsafe { UnhookWinEvent(w.0) };
}

/// WinEvent 콜백(훅 스레드). 어느 창이 전경이 됐는지 보지 않는다. 로그 없음.
unsafe extern "system" fn on_foreground_event(
    _hook: HWINEVENTHOOK,
    _event: u32,
    _hwnd: HWND,
    _id_object: i32,
    _id_child: i32,
    _thread: u32,
    _time: u32,
) {
    let _ = reassert(TARGET.load(Ordering::SeqCst));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unregistered_always_skips() {
        for own in [false, true] {
            for visible in [false, true] {
                for iconic in [false, true] {
                    assert_eq!(decide(false, own, visible, iconic), TopmostAction::Skip);
                }
            }
        }
    }

    #[test]
    fn foreign_or_dead_window_skips() {
        for visible in [false, true] {
            for iconic in [false, true] {
                assert_eq!(decide(true, false, visible, iconic), TopmostAction::Skip);
            }
        }
    }

    #[test]
    fn visible_normal_raises() {
        assert_eq!(decide(true, true, true, false), TopmostAction::Raise);
    }

    #[test]
    fn visible_minimized_restores_then_raises() {
        assert_eq!(
            decide(true, true, true, true),
            TopmostAction::RestoreThenRaise
        );
    }

    #[test]
    fn hidden_minimized_never_restores() {
        assert_eq!(decide(true, true, false, true), TopmostAction::Raise);
    }

    #[test]
    fn hidden_normal_raises_zorder_only() {
        assert_eq!(decide(true, true, false, false), TopmostAction::Raise);
    }

    #[test]
    fn from_raw_zero_is_none() {
        assert_eq!(OverlayHwnd::from_raw(0), None);
    }

    #[test]
    fn from_raw_nonzero_round_trips() {
        let a = OverlayHwnd::from_raw(0x1234);
        let b = OverlayHwnd::from_raw(-8);
        assert!(a.is_some() && b.is_some());
        assert_ne!(a, b);
    }
}
