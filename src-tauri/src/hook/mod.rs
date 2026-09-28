//! 전역 키보드·마우스 후킹 (Win32 저수준 훅).
//!
//! [목적] 앱이 포커스를 잃어도 키보드 누름/뗌·마우스 이동·좌/우 클릭을 받아 채널로 흘려보낸다.
//!        어떤 키인지는 **특수 키 분류값(`SpecialKey` 7개 — 스페이스·ㅋ(Z)·?·!·Enter·Backspace·
//!        Ctrl+Z 되돌리기)만** 밖으로 나가고, 그 밖의 키는 알 수 없음이다(확정사항 §5, CR-021).
//!        좌·우 Ctrl 중 하나라도 눌려 있으면 Shift 없는 Z(되돌리기)만 분류하고 나머지는 분류하지
//!        않는다. Alt·Win 은 보지 않는다(범위 밖, hook.md §3.1 J11). 누른 채 OS 자동 반복이
//!        들어오면 `repeat: true` 누름 이벤트를 낸다(CR-023). 단 Shift·Ctrl·Alt·Win(좌우 모두)
//!        **자신의** 자동 반복은 이벤트를 내지 않는다(🔒 사용자 결정, hook.md §3.5 A8) — 그 키를
//!        처음 누르고 뗄 때의 이벤트는 다른 키와 같다. 반복 누름은 표·분류를 바꾸지 않는다.
//!        누름 계열 입력(키보드 누름, 마우스 좌/우 버튼 누름)이 올 때마다 표에 남은 다른
//!        `Down` 칸·버튼을 `GetAsyncKeyState`로 대조해 실제로는 떼진 것을 뗌 이벤트로 먼저
//!        내보낸다(CR-046, hook.md §3.7 — 보안 데스크톱 전환·UIPI·IME 토글 키·다른 훅이
//!        뗌을 삼키는 경우의 "눌림 고정" 복구). 마우스 좌·우 버튼도 같은 원리로 정리한다
//!        (hook.md §3.7.10, 같은 원리 보강 — 클릭 유지 고착 복구).
//! [공개 API] `start(tx) -> HookHandle`, `HookHandle::stop()`, `InputEvent`, `MouseButton`,
//!        `SpecialKey`, `HookError`. `pub(crate) fn refresh`
//!        — 트레이 「새로고침」 전용 진입점(tray.md, 훅 스레드가 실행 중이어도 안전 — `KEYS`·
//!        `MOUSE_BUTTONS`는 Mutex 라 콜백과 경합하지 않는다).
//! [방식] Microsoft 공식 `windows` 크레이트로 `SetWindowsHookExW(WH_KEYBOARD_LL / WH_MOUSE_LL)` 직접 호출.
//!        포장 크레이트(rdev 등) 사용 금지(확정사항 §2).
//! [스레드] 전용 스레드 하나가 두 훅을 설치하고 `GetMessageW` 메시지 루프를 돈다.
//!        저수준 훅은 설치한 스레드의 메시지 루프가 있어야 콜백이 불린다.
//!        콜백은 Windows 가 그 스레드에서 호출한다. 콜백 안에서는 채널 send 만 하고 즉시 반환한다
//!        (느리면 Windows 가 훅을 강제 해제한다 — LowLevelHooksTimeout).
//! [unsafe] 이 모듈이 프로젝트에서 unsafe 를 쓰는 **유일한** 자리다. 모든 블록에 `// SAFETY:` 를 단다.
//!        CR-021·CR-023 은 unsafe 블록을 추가·변경하지 않는다 — `classify`·`KeyTable`·반복 판정은
//!        안전한 Rust다. CR-046: `async_key_down`(U11) 하나 — `GetAsyncKeyState` 호출. 키 표
//!        칸(0..255)과 마우스 좌·우 버튼 가상 키 코드(`VK_LBUTTON`·`VK_RBUTTON`) 조회에 함께
//!        쓴다(포인터·핸들 인자가 없어 대상이 늘어도 안전 조건은 같다).
//! [개인정보] `vkCode`는 눌린 키 표(`KeyTable`)와 `classify` 안에서만 쓴다. 키 코드·스캔 코드·문자는
//!        저장(이력)·전달·로그하지 않는다(확정사항 §5). 표는 `start`·`stop`·`refresh` 때 비운다.
//!        밖으로는 개수·분류값·**반복 여부**만 나간다. 반복 횟수·시각은 세지 않는다.
//!        CR-046 조회 대상은 표에 이미 있는 칸·눌린 걸로 믿는 마우스 버튼뿐이다(256칸 전수
//!        훑기·주기 폴링 없음). 조회 결과·정리 횟수·시각은 저장하지 않는다.
//!        [진단 로그] `reset_keys`가 표를 비울 때 `target: "kuro_diag"`로 방향
//!        ("start"|"stop"|"refresh")한 줄만 남긴다(CR-046, 사용자 승인 2026-09-26). 키 값·개수는
//!        싣지 않는다. 콜백(`keyboard_proc`·`mouse_proc`) 안에서는 로그를 호출하지 않는다 — 콜백
//!        지연 위험 때문에 나머지 진단(키/마우스 이벤트 개수·방향)은 콜백 밖 전달 스레드
//!        (`lib.rs`의 `log_input_diag`)가 남긴다.
//! [에러] 훅 설치 실패 → `HookError::Install`. 스레드 생성 실패 → `HookError::Thread`.
//! [설정] 마우스 이동 스로틀 `MOUSE_MOVE_MIN_INTERVAL_MS` (약 60Hz). 특수 키 기능에 켜기/끄기
//!        설정은 없다(요구 없음). 키보드 자동 반복은 스로틀하지 않는다 — 빈도는 OS 반복 속도
//!        (최대 약 30Hz)가 정한다(hook.md §3.5 A5). 수식 키 자신의 반복만 이벤트 없음(A8).
//! [테스트] 실제 훅은 사용자 세션·데스크톱이 필요해 자동 테스트 불가 — `tests/README.md`(hook.md §8.3
//!        수동 체크리스트를 가리킴). 순수 로직은 `tests.rs`(골든 원칙 §1 파일 800줄 한계로 분리,
//!        unsafe 는 이 파일에 그대로 남음)에서 단위 테스트한다 — 특수 키 분류(`classify` C1~C10)·
//!        눌린 키 표(`KeyTable` T1~T17)·전역 경로(`keyboard_event` W1)·마우스 스로틀·버튼 매핑·
//!        뗌 유실 정리(`release_stale` S1~S7, `MouseButtonState::release_stale` MB2~MB4).

// unsafe fn 안에서도 unsafe 연산마다 명시적 블록 + SAFETY 주석을 강제한다.
#![deny(unsafe_op_in_unsafe_fn)]

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc::{self, Sender};
use std::sync::{Mutex, OnceLock, PoisonError};
use std::thread::JoinHandle;
use std::time::{SystemTime, UNIX_EPOCH};

use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows::Win32::System::Threading::GetCurrentThreadId;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, VK_1, VK_BACK, VK_LBUTTON, VK_LCONTROL, VK_LMENU, VK_LSHIFT, VK_LWIN,
    VK_OEM_2, VK_RBUTTON, VK_RCONTROL, VK_RETURN, VK_RMENU, VK_RSHIFT, VK_RWIN, VK_SPACE, VK_Z,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, GetMessageW, PostThreadMessageW, SetWindowsHookExW,
    TranslateMessage, UnhookWindowsHookEx, HHOOK, KBDLLHOOKSTRUCT, MSG, MSLLHOOKSTRUCT,
    WH_KEYBOARD_LL, WH_MOUSE_LL, WM_KEYDOWN, WM_KEYUP, WM_LBUTTONDOWN, WM_LBUTTONUP, WM_MOUSEMOVE,
    WM_QUIT, WM_RBUTTONDOWN, WM_RBUTTONUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
};

// windows 크레이트의 VIRTUAL_KEY(u16) 상수를 match 패턴·배열 인덱스용 정수로 옮긴다(값을 새로
// 정의하지 않는다 — hook.md §11 D10).
const K_SPACE: u32 = VK_SPACE.0 as u32;
const K_Z: u32 = VK_Z.0 as u32;
/// 메인 키 `/?`(0xBF) — 키패드 `/`(`VK_DIVIDE`)와 다른 코드.
const K_SLASH: u32 = VK_OEM_2.0 as u32;
/// 메인 숫자 `1!`(0x31) — 키패드 1(`VK_NUMPAD1`)과 다른 코드.
const K_1: u32 = VK_1.0 as u32;
/// 메인 Enter·숫자패드 Enter 공통.
const K_RETURN: u32 = VK_RETURN.0 as u32;
const K_BACK: u32 = VK_BACK.0 as u32;
const K_LSHIFT: usize = VK_LSHIFT.0 as usize;
const K_RSHIFT: usize = VK_RSHIFT.0 as usize;
const K_LCONTROL: usize = VK_LCONTROL.0 as usize;
const K_RCONTROL: usize = VK_RCONTROL.0 as usize;
/// 수식 키(Shift·Ctrl·Alt·Win 좌우, 🔒 사용자 결정 2026-09-24, hook.md §3.5 A8) — 이 키들
/// 자신의 자동 반복은 이벤트로 내보내지 않는다.
const K_LMENU: usize = VK_LMENU.0 as usize;
const K_RMENU: usize = VK_RMENU.0 as usize;
const K_LWIN: usize = VK_LWIN.0 as usize;
const K_RWIN: usize = VK_RWIN.0 as usize;

/// 마우스 이동 이벤트 최소 간격(ms). 약 60Hz.
pub const MOUSE_MOVE_MIN_INTERVAL_MS: u64 = 16;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MouseButton {
    Left,
    Right,
}

/// 특수 키 분류(CR-021). 그 밖의 키는 분류값이 없다(`Option::None` = 알 수 없음).
/// 직렬화: "space" | "z" | "question" | "exclamation" | "enter" | "backspace" | "undo" (🔒 이름 고정)
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SpecialKey {
    Space,
    Z,
    Question,
    Exclamation,
    Enter,
    Backspace,
    /// Ctrl + Z (되돌리기, 🔒 2026-09-24 2차).
    Undo,
}

/// 훅이 내보내는 이벤트. bridge::events 가 contract 페이로드로 바꾼다.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InputEvent {
    Keyboard {
        pressed: bool,
        /// 이 이벤트 직후 동시에 눌려 있는 키 수. 어떤 키인지는 모듈 밖으로 나가지 않는다.
        held: u32,
        /// 특수 키 분류(CR-021). 누름 = 누른 순간 판정, 뗌 = 그 키를 누를 때 판정한 값.
        /// 그 밖의 키·누름을 보지 못한 뗌은 None. 키 코드는 모듈 밖으로 나가지 않는다.
        special: Option<SpecialKey>,
        /// 이미 눌린 키의 재누름(OS 자동 반복)이면 true(CR-023). 이때 pressed = true,
        /// held 는 늘지 않고, special 은 그 키를 처음 누를 때 정한 값이다. 첫 누름·뗌은 false.
        /// Shift·Ctrl·Alt·Win(좌우) **자신**의 자동 반복은 이벤트 자체를 내지 않는다(§3.5 A8) —
        /// 이 필드가 true 로 나타나는 대상에서 그 여덟 키는 빠진다.
        repeat: bool,
        ts: u64,
    },
    MouseMove {
        x: i32,
        y: i32,
        ts: u64,
    },
    MouseButton {
        button: MouseButton,
        pressed: bool,
        ts: u64,
    },
}

#[derive(Debug, thiserror::Error)]
pub enum HookError {
    #[error("전역 훅 설치에 실패했습니다 ({which}): {source}")]
    Install {
        which: &'static str,
        source: windows::core::Error,
    },
    #[error("훅 스레드를 만들지 못했습니다: {0}")]
    Thread(#[from] std::io::Error),
    #[error("훅 스레드가 준비 신호를 보내지 않았습니다")]
    Ready,
}

/// 콜백은 전역 함수라 채널 송신자를 전역에 둔다. `start` 가 채우고 `stop` 이 비운다.
static SENDER: OnceLock<Mutex<Option<Sender<InputEvent>>>> = OnceLock::new();
static LAST_MOVE_MS: AtomicU64 = AtomicU64::new(0);

/// 가상 키 + 누른 순간의 Shift·Ctrl 상태 → 특수 키 분류. 그 밖의 키는 None(알 수 없음).
/// Ctrl 이 눌려 있으면 Shift 없는 Z(되돌리기)만 분류하고 나머지(Ctrl+Shift+Z 포함)는 None.
/// 물리 키(가상 키 코드) 기준 — 한/영 IME·Caps Lock·Alt·Win 상태는 보지 않는다(hook.md §3.1 J1~J11).
fn classify(vk: u32, shift_down: bool, ctrl_down: bool) -> Option<SpecialKey> {
    if ctrl_down {
        return (vk == K_Z && !shift_down).then_some(SpecialKey::Undo);
    }
    match vk {
        K_SPACE => Some(SpecialKey::Space),
        K_Z => Some(SpecialKey::Z),
        K_RETURN => Some(SpecialKey::Enter),
        K_BACK => Some(SpecialKey::Backspace),
        K_SLASH if shift_down => Some(SpecialKey::Question),
        K_1 if shift_down => Some(SpecialKey::Exclamation),
        _ => None,
    }
}

/// 눌린 키 표의 한 칸. 떼면 Up 으로 돌아가 아무것도 남지 않는다(개인정보 규칙 — 기록 금지).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum KeyState {
    Up,
    /// 눌림 + 누른 순간 정한 특수 키 분류(없으면 None).
    Down(Option<SpecialKey>),
}

/// 표 갱신 결과 — 이벤트에 실을 값.
#[derive(Debug, PartialEq, Eq)]
struct KeyChange {
    held: u32,
    special: Option<SpecialKey>,
    /// 이미 눌린 키의 재누름(OS 자동 반복)이면 true(CR-023). 수식 키 자신의 반복은
    /// `apply`가 `None`을 돌려주므로 이 값이 만들어지지 않는다(A8).
    repeat: bool,
}

/// Shift·Ctrl·Alt·Win(좌우 모두)인지 — 이 여덟 키 자신의 자동 반복은 이벤트로 내보내지
/// 않는다(🔒 사용자 결정 2026-09-24, hook.md §3.5 A8). 첫 누름·뗌은 다른 키와 같다.
fn is_modifier_vk(vk: u32) -> bool {
    matches!(
        vk as usize,
        K_LSHIFT | K_RSHIFT | K_LCONTROL | K_RCONTROL | K_LMENU | K_RMENU | K_LWIN | K_RWIN
    )
}

/// 현재 눌려 있는 키 표(vkCode 0..255). 키 식별자는 이 모듈 안에서만 쓰고,
/// 밖으로는 개수와 분류값만 나간다(확정사항 §5).
struct KeyTable {
    keys: [KeyState; 256],
}

impl KeyTable {
    const fn new() -> Self {
        Self {
            keys: [KeyState::Up; 256],
        }
    }

    /// 누름·뗌을 표에 반영한다. None = 이벤트 없음 — 수식 키(Shift·Ctrl·Alt·Win) 자신의
    /// 자동 반복만 여기 해당한다(A8). 그 밖의 키는 첫 누름·뗌·자동 반복 모두 이벤트가 된다.
    fn apply(&mut self, vk: u32, pressed: bool) -> Option<KeyChange> {
        let idx = (vk & 0xFF) as usize;
        let (special, repeat) = match (pressed, self.keys[idx]) {
            (true, KeyState::Down(s)) => {
                if is_modifier_vk(vk) {
                    return None; // 수식 키 자신의 자동 반복 — 이벤트 없음(A8). 칸은 그대로
                }
                (s, true) // 자동 반복 — 칸 값 그대로, 재판정 없음(J4·A2)
            }
            (true, KeyState::Up) => (classify(vk, self.shift_down(), self.ctrl_down()), false), // 첫 누름에서만
            (false, KeyState::Down(s)) => (s, false), // 뗌 = 누를 때 판정값 그대로
            (false, KeyState::Up) => (None, false),   // 누름을 못 본 뗌
        };
        // 자동 반복이면 Down(s) 를 같은 값으로 다시 쓰는 셈이라 표는 바뀌지 않는다(held 불변, A3).
        self.keys[idx] = if pressed {
            KeyState::Down(special)
        } else {
            KeyState::Up
        };
        Some(KeyChange {
            held: self.held_count(),
            special,
            repeat,
        })
    }

    fn is_down(&self, idx: usize) -> bool {
        self.keys[idx] != KeyState::Up
    }

    fn shift_down(&self) -> bool {
        self.is_down(K_LSHIFT) || self.is_down(K_RSHIFT)
    }

    fn ctrl_down(&self) -> bool {
        self.is_down(K_LCONTROL) || self.is_down(K_RCONTROL)
    }

    fn held_count(&self) -> u32 {
        self.keys.iter().filter(|k| **k != KeyState::Up).count() as u32
    }

    fn clear(&mut self) {
        self.keys = [KeyState::Up; 256];
    }

    /// 뗌을 놓친 칸 정리(CR-046 hook.md §3.7 L2~L4). `except`(지금 이벤트의 키) 칸을 뺀
    /// `Down` 칸 중 `is_down(vk)`가 false 인 칸을 `Up`으로 돌리고, 정리한 칸마다 뗌 변화를
    /// vk 오름차순으로 돌려준다. `is_down`은 `Down` 칸에만 부른다. 정리할 칸이 없으면 빈
    /// `Vec`(할당 없음). 분류값은 칸의 값 그대로(누를 때 판정값).
    fn release_stale(
        &mut self,
        except: Option<u32>,
        is_down: impl Fn(u32) -> bool,
    ) -> Vec<KeyChange> {
        let skip = except.map(|vk| (vk & 0xFF) as usize);
        let mut held = self.held_count();
        let mut released = Vec::new();
        for (idx, cell) in self.keys.iter_mut().enumerate() {
            let KeyState::Down(special) = *cell else {
                continue;
            };
            if Some(idx) == skip || is_down(idx as u32) {
                continue;
            }
            *cell = KeyState::Up;
            held -= 1; // Down 칸이었으므로 held >= 1 — 넘침 없음
            released.push(KeyChange {
                held,
                special,
                repeat: false,
            });
        }
        released
    }
}

/// 마우스 좌·우 버튼이 "지금 눌려 있다고 믿는" 상태(CR-046 보강, hook.md §3.7.10 — 같은
/// 원리를 마우스 버튼에도 적용). `KeyTable`과 같은 성격 — 지금 눌림 여부만 두고 기록하지
/// 않는다(개인정보 규칙 P3와 동급). 순수 구조체라 Win32 없이 단위 테스트한다.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
struct MouseButtonState {
    left: bool,
    right: bool,
}

impl MouseButtonState {
    const fn new() -> Self {
        Self {
            left: false,
            right: false,
        }
    }

    /// 실제 눌림 상태를 반영한다(`mouse_event`가 버튼 메시지마다 부른다).
    fn set(&mut self, button: MouseButton, down: bool) {
        match button {
            MouseButton::Left => self.left = down,
            MouseButton::Right => self.right = down,
        }
    }

    /// 뗌을 놓친 버튼 정리 — `except`(지금 이 클릭을 일으킨 버튼) 자신은 조회하지 않는다
    /// (L2와 같은 이유 — 콜백 시점에는 그 버튼의 비동기 상태가 아직 갱신되기 전이다).
    /// 키보드 트리거에서는 `except = None`으로 둘 다 본다.
    fn release_stale(
        &mut self,
        except: Option<MouseButton>,
        is_down: impl Fn(u32) -> bool,
    ) -> Vec<MouseButton> {
        let mut released = Vec::new();
        if except != Some(MouseButton::Left) && self.left && !is_down(VK_LBUTTON.0 as u32) {
            self.left = false;
            released.push(MouseButton::Left);
        }
        if except != Some(MouseButton::Right) && self.right && !is_down(VK_RBUTTON.0 as u32) {
            self.right = false;
            released.push(MouseButton::Right);
        }
        released
    }

    fn clear(&mut self) {
        *self = Self::new();
    }
}

/// 현재 눌려 있는 키 표. 훅 스레드(콜백)만 잡는다. `start`·`stop`·`refresh`가 비운다
/// (개인정보 규칙).
static KEYS: Mutex<KeyTable> = Mutex::new(KeyTable::new());
/// 마우스 좌·우 버튼의 "지금 눌림" 상태(CR-046 보강). `KEYS`와 같은 수명 규칙을 따른다.
static MOUSE_BUTTONS: Mutex<MouseButtonState> = Mutex::new(MouseButtonState::new());

/// 표 비우기(개인정보 규칙 — 훅 수명 밖으로 기록을 남기지 않는다). `start`·`stop`은 훅
/// 스레드가 없을 때만 부른다 — 콜백과 잠금을 다투지 않는다. `refresh`(트레이 「새로고침」)는
/// 훅 스레드가 실행 중에도 부를 수 있다 — `KEYS`·`MOUSE_BUTTONS`는 Mutex 라 콜백과의
/// 데이터 경합은 없다. 다만 실제 눌림과 표가 잠시 어긋날 수 있고(물리적으로 눌린 키·버튼이
/// 표에서만 사라짐), CR-046 정리·다음 첫 누름 판정으로 곧 다시 맞는다(§3.7 H급 한계와 같은
/// 성격). `reason`은 진단 로그(CR-046, 사용자 승인 2026-09-26)용 방향
/// 표시("start"|"stop"|"refresh")일 뿐 키 정보를 담지 않는다.
fn reset_keys(reason: &'static str) {
    KEYS.lock().unwrap_or_else(PoisonError::into_inner).clear();
    MOUSE_BUTTONS
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .clear();
    log::debug!(target: "kuro_diag", "hook keys cleared reason={reason}");
}

/// 트레이 「새로고침」 전용 진입점(tray.md, CR-046 보강). 눌린 키 표·마우스 버튼 상태를
/// 비운다 — `crate::tray`에서만 부른다.
pub(crate) fn refresh() {
    reset_keys("refresh");
}

/// 전역 표의 뗌 유실을 정리해 뗌 이벤트로 바꾼다(CR-046 hook.md §3.7). 누름 계열 입력의
/// 이벤트보다 먼저 보낸다. 훅 스레드 콜백에서만 부른다(잠금 경합 없음). 평상시 빈 `Vec`.
fn recover_missed_releases(
    except: Option<u32>,
    ts: u64,
    is_down: impl Fn(u32) -> bool,
) -> Vec<InputEvent> {
    let released = KEYS
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .release_stale(except, is_down);
    released
        .into_iter()
        .map(|c| InputEvent::Keyboard {
            pressed: false,
            held: c.held,
            special: c.special,
            repeat: false,
            ts,
        })
        .collect()
}

/// 마우스 버튼 뗌 유실 정리(CR-046 보강 — hook.md §3.7.10). `recover_missed_releases`와
/// 같은 원리를 좌·우 버튼에 적용한다. 평상시 빈 `Vec`.
fn recover_missed_mouse_releases(
    except: Option<MouseButton>,
    ts: u64,
    is_down: impl Fn(u32) -> bool,
) -> Vec<InputEvent> {
    MOUSE_BUTTONS
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .release_stale(except, is_down)
        .into_iter()
        .map(|button| InputEvent::MouseButton {
            button,
            pressed: false,
            ts,
        })
        .collect()
}

/// 운영용 물리 눌림 조회 — 비동기 키 상태의 최상위 비트(CR-046 L3). 지금 콜백을 일으킨
/// 키·버튼에는 쓰지 않는다(그 대상의 상태는 콜백 뒤에 갱신된다 — L2). 키 표 칸(0..255)과
/// 마우스 좌·우 버튼 가상 키 코드(`VK_LBUTTON`·`VK_RBUTTON`)에 함께 쓴다.
fn async_key_down(vk: u32) -> bool {
    // SAFETY: (U11) 포인터·핸들·버퍼 인자가 없는 조회 함수이고 반환값 i16 만 읽는다. 어떤
    // 정수 vk 에도 동작이 정의되어 있어(지원하지 않는 키·비활성 데스크톱이면 0) 메모리 안전
    // 전제가 없다. 인자는 표 칸 번호(0..=255) 또는 마우스 버튼 가상 키 코드라 i32 변환에서
    // 값이 바뀌지 않는다. 호출 스레드 조건이 없다(훅 스레드 콜백에서 부름).
    unsafe { GetAsyncKeyState(vk as i32) < 0 }
}

/// 뗌 유실 정리를 부르는 마우스 메시지인지 — 좌·우 버튼 누름만(CR-046 L1).
fn mouse_button_down(msg: u32) -> bool {
    matches!(msg, WM_LBUTTONDOWN | WM_RBUTTONDOWN)
}

fn sender_slot() -> &'static Mutex<Option<Sender<InputEvent>>> {
    SENDER.get_or_init(|| Mutex::new(None))
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn send(ev: InputEvent) {
    if let Ok(guard) = sender_slot().lock() {
        if let Some(tx) = guard.as_ref() {
            // 수신자가 사라졌으면 조용히 버린다(앱 종료 중).
            let _ = tx.send(ev);
        }
    }
}

/// 마우스 이동 스로틀: 직전 전송에서 MIN_INTERVAL 이 지났을 때만 true 를 돌려주고 시각을 갱신한다.
fn should_emit_move(now: u64) -> bool {
    let last = LAST_MOVE_MS.load(Ordering::Relaxed);
    if now.saturating_sub(last) < MOUSE_MOVE_MIN_INTERVAL_MS {
        return false;
    }
    LAST_MOVE_MS.store(now, Ordering::Relaxed);
    true
}

/// 키보드 메시지 → 눌림 여부. `None` 이면 무시.
fn keyboard_pressed(msg: u32) -> Option<bool> {
    match msg {
        WM_KEYDOWN | WM_SYSKEYDOWN => Some(true),
        WM_KEYUP | WM_SYSKEYUP => Some(false),
        _ => None,
    }
}

/// 키보드 메시지 + vkCode → 이벤트. `None` = 수식 키 자신의 자동 반복(A8)이거나 키보드 메시지가
/// 아님. 그 밖의 자동 반복은 `repeat: true` 이벤트가 된다.
fn keyboard_event(msg: u32, vk: u32, ts: u64) -> Option<InputEvent> {
    let pressed = keyboard_pressed(msg)?;
    let change = KEYS
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .apply(vk, pressed)?;
    Some(InputEvent::Keyboard {
        pressed,
        held: change.held,
        special: change.special,
        repeat: change.repeat,
        ts,
    })
}

/// 마우스 메시지 → 이벤트. 이동은 스로틀을 거친다. 버튼 메시지는 CR-046 보강용 "지금 눌림"
/// 상태(`MOUSE_BUTTONS`)도 함께 갱신한다.
fn mouse_event(msg: u32, x: i32, y: i32, ts: u64) -> Option<InputEvent> {
    match msg {
        WM_MOUSEMOVE => should_emit_move(ts).then_some(InputEvent::MouseMove { x, y, ts }),
        WM_LBUTTONDOWN => Some(mouse_button_event(MouseButton::Left, true, ts)),
        WM_LBUTTONUP => Some(mouse_button_event(MouseButton::Left, false, ts)),
        WM_RBUTTONDOWN => Some(mouse_button_event(MouseButton::Right, true, ts)),
        WM_RBUTTONUP => Some(mouse_button_event(MouseButton::Right, false, ts)),
        _ => None,
    }
}

/// 버튼 이벤트를 만들면서 `MOUSE_BUTTONS`를 갱신한다(CR-046 보강).
fn mouse_button_event(button: MouseButton, pressed: bool, ts: u64) -> InputEvent {
    MOUSE_BUTTONS
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .set(button, pressed);
    InputEvent::MouseButton {
        button,
        pressed,
        ts,
    }
}

unsafe extern "system" fn keyboard_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        // SAFETY: code >= 0 일 때 lparam 은 Windows 가 채운 KBDLLHOOKSTRUCT 포인터다(문서 보장).
        // 콜백이 반환되기 전까지만 유효하므로 여기서 값만 읽는다.
        let info: &KBDLLHOOKSTRUCT = unsafe { &*(lparam.0 as *const KBDLLHOOKSTRUCT) };
        let (msg, ts) = (wparam.0 as u32, now_ms());
        // vkCode 는 눌린 키 표 갱신과 특수 키 분류·반복 판정에만 쓴다. 표 밖에 저장하지 않고,
        // 전달·로그하지 않는다(확정사항 §5, hook.md §1.1). 밖으로는 개수·분류값·반복 여부만
        // 나간다. 누름이면 먼저 뗌 유실을 정리한다 — 지금 키는 조회하지 않는다(CR-046 L1·L2).
        if keyboard_pressed(msg) == Some(true) {
            for ev in recover_missed_releases(Some(info.vkCode), ts, async_key_down) {
                send(ev);
            }
            for ev in recover_missed_mouse_releases(None, ts, async_key_down) {
                send(ev);
            }
        }
        if let Some(ev) = keyboard_event(msg, info.vkCode, ts) {
            send(ev);
        }
    }
    // SAFETY: 훅 체인의 다음 훅으로 넘기는 표준 호출. hhk 는 무시되므로 null 핸들을 넘긴다.
    unsafe { CallNextHookEx(HHOOK::default(), code, wparam, lparam) }
}

unsafe extern "system" fn mouse_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        // SAFETY: code >= 0 일 때 lparam 은 MSLLHOOKSTRUCT 포인터다(문서 보장). 콜백 안에서만 읽는다.
        let info: &MSLLHOOKSTRUCT = unsafe { &*(lparam.0 as *const MSLLHOOKSTRUCT) };
        let (msg, ts) = (wparam.0 as u32, now_ms());
        if mouse_button_down(msg) {
            // 클릭 바운스 판단 전에 남은 키 칸·다른 마우스 버튼을 정리한다(CR-046 L1,
            // 펜 클릭 바운스·클릭 유지 고착 복구 — hook.md §3.7·§3.7.10).
            for ev in recover_missed_releases(None, ts, async_key_down) {
                send(ev);
            }
            let this_button = if msg == WM_LBUTTONDOWN {
                MouseButton::Left
            } else {
                MouseButton::Right
            };
            for ev in recover_missed_mouse_releases(Some(this_button), ts, async_key_down) {
                send(ev);
            }
        }
        if let Some(ev) = mouse_event(msg, info.pt.x, info.pt.y, ts) {
            send(ev);
        }
    }
    // SAFETY: 위와 동일.
    unsafe { CallNextHookEx(HHOOK::default(), code, wparam, lparam) }
}

/// 훅 스레드 핸들. `stop()` 또는 Drop 으로 훅을 해제하고 스레드를 끝낸다.
pub struct HookHandle {
    thread_id: u32,
    join: Option<JoinHandle<()>>,
}

impl HookHandle {
    pub fn stop(mut self) {
        self.shutdown();
    }

    fn shutdown(&mut self) {
        if let Ok(mut guard) = sender_slot().lock() {
            *guard = None;
        }
        // SAFETY: 훅 스레드의 메시지 루프에 WM_QUIT 을 보내 루프를 끝낸다. 대상 스레드 id 는
        // start 에서 그 스레드가 직접 알려준 값이다. 이미 종료됐으면 실패를 무시한다.
        let _ = unsafe { PostThreadMessageW(self.thread_id, WM_QUIT, WPARAM(0), LPARAM(0)) };
        if let Some(join) = self.join.take() {
            let _ = join.join();
        }
        // 훅 스레드가 완전히 끝난 뒤에만 비운다 — 콜백과 잠금이 겹치지 않는다(개인정보 규칙 P4).
        reset_keys("stop");
    }
}

impl Drop for HookHandle {
    fn drop(&mut self) {
        self.shutdown();
    }
}

/// 훅 스레드를 시작한다. 두 훅이 모두 설치된 뒤에 돌아온다.
pub fn start(tx: Sender<InputEvent>) -> Result<HookHandle, HookError> {
    // 훅 스레드를 만들기 전에 비운다 — 이전 실행의 눌림 상태가 남지 않는다(개인정보 규칙 P4).
    reset_keys("start");
    if let Ok(mut guard) = sender_slot().lock() {
        *guard = Some(tx);
    }

    // 훅 설치 결과와 스레드 id 를 한 번만 되돌려 받는 채널
    let (ready_tx, ready_rx) = mpsc::channel::<Result<u32, HookError>>();

    let join = std::thread::Builder::new()
        .name("win32-input-hook".into())
        .spawn(move || run_message_loop(ready_tx))?;

    match ready_rx.recv() {
        Ok(Ok(thread_id)) => Ok(HookHandle {
            thread_id,
            join: Some(join),
        }),
        Ok(Err(e)) => {
            let _ = join.join();
            Err(e)
        }
        Err(_) => Err(HookError::Ready),
    }
}

/// 훅 스레드 본체. 훅 설치 → 준비 신호 → 메시지 루프 → 해제.
fn run_message_loop(ready_tx: Sender<Result<u32, HookError>>) {
    // SAFETY: 이 스레드에서 두 저수준 훅을 설치한다. hmod 는 저수준 훅에서는 null 이어도 되고,
    // dwThreadId=0 은 전역(모든 스레드) 훅을 뜻한다. 콜백은 위 extern "system" 함수다.
    let keyboard = unsafe { SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_proc), None, 0) };
    let keyboard = match keyboard {
        Ok(h) => h,
        Err(source) => {
            let _ = ready_tx.send(Err(HookError::Install {
                which: "keyboard",
                source,
            }));
            return;
        }
    };

    // SAFETY: 위와 동일.
    let mouse = unsafe { SetWindowsHookExW(WH_MOUSE_LL, Some(mouse_proc), None, 0) };
    let mouse = match mouse {
        Ok(h) => h,
        Err(source) => {
            // SAFETY: 방금 설치한 유효한 훅 핸들을 해제한다.
            let _ = unsafe { UnhookWindowsHookEx(keyboard) };
            let _ = ready_tx.send(Err(HookError::Install {
                which: "mouse",
                source,
            }));
            return;
        }
    };

    // SAFETY: 단순 시스템 호출. 현재 스레드 id 를 돌려준다.
    let thread_id = unsafe { GetCurrentThreadId() };
    let _ = ready_tx.send(Ok(thread_id));

    let mut msg = MSG::default();
    loop {
        // SAFETY: msg 는 이 스택 프레임의 유효한 MSG. hwnd None = 이 스레드의 모든 메시지.
        // 반환 0 = WM_QUIT, -1 = 오류. 둘 다 루프를 끝낸다.
        let got = unsafe { GetMessageW(&mut msg, None, 0, 0) };
        if got.0 <= 0 {
            break;
        }
        // SAFETY: GetMessageW 가 채운 msg 를 표준 절차로 처리한다.
        unsafe {
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }
    }

    // SAFETY: 이 스레드가 설치한 훅 핸들 두 개를 해제한다. 실패해도 스레드 종료로 훅은 사라진다.
    unsafe {
        let _ = UnhookWindowsHookEx(mouse);
        let _ = UnhookWindowsHookEx(keyboard);
    }
}

#[cfg(test)]
mod tests;
