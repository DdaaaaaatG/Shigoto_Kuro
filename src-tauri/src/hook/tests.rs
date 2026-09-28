//! `hook/mod.rs` 단위 테스트(골든 원칙 §1 — 파일 800줄 한계로 CR-021 때 분리).
//!
//! [목적] `classify`(C1~C10)·`KeyTable`(T1~T17, CR-023 자동 반복 T5·T6·T9·T10·T14~T17)·
//!        전역 경로(`keyboard_event` W1)·마우스 스로틀·버튼 매핑을 검증한다. 프로덕션 코드는
//!        `mod.rs`에 그대로 남는다(unsafe 위치 불변).
//! [unsafe] 없음(테스트는 안전한 공개·비공개 함수만 부른다).

use super::*;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    VK_CAPITAL, VK_CONTROL, VK_DIVIDE, VK_END, VK_HANGUL, VK_LMENU, VK_LWIN, VK_NUMPAD1,
    VK_PROCESSKEY, VK_RMENU, VK_SHIFT,
};

// ─── classify(vk, shift, ctrl) — C1~C10 ────────────────────────────────

/// C1: Shift·Ctrl 무관 4종(J6).
#[test]
fn classify_shift_independent_four() {
    for vk in [K_SPACE, K_Z, K_RETURN, K_BACK] {
        for shift in [false, true] {
            let expected = match vk {
                K_SPACE => SpecialKey::Space,
                K_Z => SpecialKey::Z,
                K_RETURN => SpecialKey::Enter,
                K_BACK => SpecialKey::Backspace,
                _ => unreachable!(),
            };
            assert_eq!(classify(vk, shift, false), Some(expected));
        }
    }
}

/// C2: `?` 는 Shift 가 있어야만(J2).
#[test]
fn classify_question_needs_shift() {
    assert_eq!(classify(K_SLASH, true, false), Some(SpecialKey::Question));
    assert_eq!(classify(K_SLASH, false, false), None);
}

/// C3: `!` 는 Shift 가 있어야만(J3).
#[test]
fn classify_exclamation_needs_shift() {
    assert_eq!(classify(K_1, true, false), Some(SpecialKey::Exclamation));
    assert_eq!(classify(K_1, false, false), None);
}

/// C4: 키패드 `/`·1 은 Shift·Ctrl 과 무관하게 제외(J2·J3).
#[test]
fn classify_keypad_excluded() {
    let divide = VK_DIVIDE.0 as u32;
    let numpad1 = VK_NUMPAD1.0 as u32;
    let end = VK_END.0 as u32;
    for vk in [divide, numpad1, end] {
        for shift in [false, true] {
            for ctrl in [false, true] {
                assert_eq!(classify(vk, shift, ctrl), None);
            }
        }
    }
}

/// C5: 수식 키 자체 등 그 밖의 키는 언제나 None.
#[test]
fn classify_other_keys_unknown() {
    let others = [
        0x41, // 'A'
        0x32, // '2'
        K_LSHIFT as u32,
        K_RSHIFT as u32,
        VK_SHIFT.0 as u32,
        K_LCONTROL as u32,
        K_RCONTROL as u32,
        VK_CONTROL.0 as u32,
        VK_LMENU.0 as u32,
        VK_RMENU.0 as u32,
        VK_LWIN.0 as u32,
        VK_HANGUL.0 as u32,
        VK_CAPITAL.0 as u32,
        VK_PROCESSKEY.0 as u32,
        0x00,
        0xFF,
    ];
    for vk in others {
        for shift in [false, true] {
            for ctrl in [false, true] {
                assert_eq!(classify(vk, shift, ctrl), None);
            }
        }
    }
}

/// C6: vk 0..=255 × shift × ctrl 전수(1024조합) 중 `Some` 은 정확히 11개.
#[test]
fn classify_exactly_eleven_combinations() {
    let mut count = 0;
    for vk in 0u32..=255 {
        for shift in [false, true] {
            for ctrl in [false, true] {
                if classify(vk, shift, ctrl).is_some() {
                    count += 1;
                }
            }
        }
    }
    assert_eq!(count, 11);
}

/// C7: 직렬화 문자열 고정.
#[test]
fn special_key_serializes_snake_case() {
    let cases = [
        (SpecialKey::Space, "\"space\""),
        (SpecialKey::Z, "\"z\""),
        (SpecialKey::Question, "\"question\""),
        (SpecialKey::Exclamation, "\"exclamation\""),
        (SpecialKey::Enter, "\"enter\""),
        (SpecialKey::Backspace, "\"backspace\""),
        (SpecialKey::Undo, "\"undo\""),
    ];
    for (v, expected) in cases {
        assert_eq!(serde_json::to_string(&v).expect("ser"), expected);
    }
    assert_eq!(
        serde_json::to_string(&Option::<SpecialKey>::None).expect("ser"),
        "null"
    );
}

/// C8: Shift 없는 Ctrl+Z 만 되돌리기, Ctrl+Shift+Z 는 None(J10).
#[test]
fn classify_ctrl_z_is_undo_only_without_shift() {
    assert_eq!(classify(K_Z, false, true), Some(SpecialKey::Undo));
    assert_eq!(classify(K_Z, true, true), None);
}

/// C9: Ctrl 이 눌려 있으면 Z(되돌리기) 외 나머지 특수 키는 분류하지 않는다(J9·J10).
#[test]
fn classify_ctrl_blocks_other_specials() {
    assert_eq!(classify(K_SPACE, false, true), None);
    assert_eq!(classify(K_RETURN, false, true), None);
    assert_eq!(classify(K_BACK, false, true), None);
    assert_eq!(classify(K_SLASH, true, true), None);
    assert_eq!(classify(K_1, true, true), None);
    assert_eq!(classify(K_SLASH, false, true), None);
    assert_eq!(classify(K_1, false, true), None);
    assert_eq!(classify(K_Z, true, true), None);
}

/// C10: `classify` 에는 Alt·Win 인자가 없다 — Ctrl false 이면 그대로 분류된다(J11, 표 경로는 T14).
#[test]
fn classify_ignores_alt_and_win() {
    assert_eq!(classify(K_Z, false, false), Some(SpecialKey::Z));
    assert_eq!(classify(K_RETURN, false, false), Some(SpecialKey::Enter));
}

// ─── KeyTable — T1~T17 (모두 지역 인스턴스) ────────────────────────────

/// T1: 왼쪽 Shift + `/` = `?`.
#[test]
fn left_shift_slash_is_question() {
    let mut t = KeyTable::new();
    let c1 = t.apply(K_LSHIFT as u32, true).expect("down");
    assert_eq!((c1.held, c1.special), (1, None));
    let c2 = t.apply(K_SLASH, true).expect("down");
    assert_eq!((c2.held, c2.special), (2, Some(SpecialKey::Question)));
}

/// T2: 오른쪽 Shift + `1` = `!`.
#[test]
fn right_shift_one_is_exclamation() {
    let mut t = KeyTable::new();
    t.apply(K_RSHIFT as u32, true).expect("down");
    let c2 = t.apply(K_1, true).expect("down");
    assert_eq!((c2.held, c2.special), (2, Some(SpecialKey::Exclamation)));
}

/// T3: Shift 없으면 `/`·`1` 모두 일반 키.
#[test]
fn no_shift_slash_and_one_are_plain() {
    let mut t = KeyTable::new();
    assert_eq!(t.apply(K_SLASH, true).expect("down").special, None);
    assert_eq!(t.apply(K_1, true).expect("down").special, None);
}

/// T4: Shift 를 먼저 떼도 `1` 을 뗄 때 `Exclamation` 유지.
#[test]
fn release_keeps_press_time_class() {
    let mut t = KeyTable::new();
    t.apply(K_LSHIFT as u32, true).expect("down");
    let c2 = t.apply(K_1, true).expect("down");
    assert_eq!(c2.special, Some(SpecialKey::Exclamation));
    let c3 = t.apply(K_LSHIFT as u32, false).expect("up");
    assert_eq!((c3.held, c3.special), (1, None));
    let c4 = t.apply(K_1, false).expect("up");
    assert_eq!((c4.held, c4.special), (0, Some(SpecialKey::Exclamation)));
}

/// T5: `1` 을 누른 뒤 Shift 를 눌러도 재판정하지 않는다(자동 반복도 이벤트가 오지만 분류는
/// 그대로, J4·A2).
#[test]
fn shift_after_press_no_reclassify() {
    let mut t = KeyTable::new();
    let c1 = t.apply(K_1, true).expect("down");
    assert_eq!((c1.held, c1.special, c1.repeat), (1, None, false));
    t.apply(K_LSHIFT as u32, true).expect("down");
    let c3 = t.apply(K_1, true).expect("repeat"); // 자동 반복 — 이벤트 있음, 재판정 없음
    assert_eq!((c3.held, c3.special, c3.repeat), (2, None, true));
    let c4 = t.apply(K_1, false).expect("up");
    assert_eq!((c4.held, c4.special, c4.repeat), (1, None, false));
}

/// T6: 자동 반복은 특수 키에도 `repeat: true` 이벤트를 낸다(held 불변, 분류 유지, A2·A3).
#[test]
fn auto_repeat_reports_repeat_for_special() {
    let mut t = KeyTable::new();
    let c1 = t.apply(K_SPACE, true).expect("down");
    assert_eq!(
        (c1.held, c1.special, c1.repeat),
        (1, Some(SpecialKey::Space), false)
    );
    let c2 = t.apply(K_SPACE, true).expect("repeat");
    assert_eq!(
        (c2.held, c2.special, c2.repeat),
        (1, Some(SpecialKey::Space), true)
    );
    let c3 = t.apply(K_SPACE, true).expect("repeat");
    assert_eq!(
        (c3.held, c3.special, c3.repeat),
        (1, Some(SpecialKey::Space), true)
    );
    let c4 = t.apply(K_SPACE, false).expect("up");
    assert_eq!(
        (c4.held, c4.special, c4.repeat),
        (0, Some(SpecialKey::Space), false)
    );
}

/// T7: IME 토글·Caps Lock·Shift 는 Z 분류에 영향 없다(J5·J6).
#[test]
fn ime_and_caps_do_not_affect_z() {
    let mut t = KeyTable::new();
    let hangul = VK_HANGUL.0 as u32;
    let capital = VK_CAPITAL.0 as u32;
    t.apply(hangul, true).expect("down");
    t.apply(hangul, false).expect("up");
    t.apply(capital, true).expect("down");
    t.apply(capital, false).expect("up");
    let z1 = t.apply(K_Z, true).expect("down");
    assert_eq!(z1.special, Some(SpecialKey::Z));
    t.apply(K_LSHIFT as u32, true).expect("down");
    let zup = t.apply(K_Z, false).expect("up");
    assert_eq!(zup.special, Some(SpecialKey::Z));
    let z2 = t.apply(K_Z, true).expect("down");
    assert_eq!(z2.special, Some(SpecialKey::Z));
}

/// T8: 왼쪽 Shift 를 떼도 오른쪽 Shift 가 눌려 있으면 `?` 그대로.
#[test]
fn either_shift_counts() {
    let mut t = KeyTable::new();
    t.apply(K_LSHIFT as u32, true).expect("down");
    t.apply(K_RSHIFT as u32, true).expect("down");
    t.apply(K_LSHIFT as u32, false).expect("up");
    let c4 = t.apply(K_SLASH, true).expect("down");
    assert_eq!(c4.special, Some(SpecialKey::Question));
}

/// T9: `clear()` 는 눌림·분류를 모두 잊는다(개인정보 규칙).
#[test]
fn clear_forgets_everything() {
    let mut t = KeyTable::new();
    t.apply(K_SPACE, true).expect("down");
    t.apply(K_LSHIFT as u32, true).expect("down");
    t.apply(K_LCONTROL as u32, true).expect("down");
    t.clear();
    assert_eq!(t.held_count(), 0);
    let c1 = t.apply(K_SLASH, true).expect("down");
    assert_eq!(c1.special, None); // Shift 잊음
    let c2 = t.apply(K_Z, true).expect("down");
    assert_eq!(c2.special, Some(SpecialKey::Z)); // Ctrl 잊음 — Undo 아님
    let c3 = t.apply(K_SPACE, true).expect("down");
    assert_eq!(
        (c3.held, c3.special, c3.repeat),
        (3, Some(SpecialKey::Space), false) // 자동 반복으로 취급 안 함(A4)
    );
}

/// T10: 누름을 못 본 뗌 + 동시 눌림 개수. 서로 다른 키의 누름은 모두 `repeat: false`.
#[test]
fn release_without_press_and_held_count() {
    let mut t = KeyTable::new();
    let c1 = t.apply(K_Z, false).expect("up without down");
    assert_eq!((c1.held, c1.special, c1.repeat), (0, None, false));
    for vk in 0xE0..0xE6u32 {
        let c = t.apply(vk, true).expect("down");
        assert!(c.special.is_none());
        assert!(!c.repeat);
    }
    let c7 = t.apply(0xE6, true).expect("7th down");
    assert_eq!((c7.held, c7.repeat), (7, false));
    let c8 = t.apply(0xE0, false).expect("up");
    assert_eq!((c8.held, c8.repeat), (6, false));
}

/// T11: 좌·우 Ctrl 모두 Z 와 함께면 되돌리기(J9·J10).
#[test]
fn left_and_right_ctrl_z_is_undo() {
    let mut t = KeyTable::new();
    t.apply(K_LCONTROL as u32, true).expect("down");
    let c2 = t.apply(K_Z, true).expect("down");
    assert_eq!((c2.held, c2.special), (2, Some(SpecialKey::Undo)));
    let c3 = t.apply(K_Z, false).expect("up");
    assert_eq!((c3.held, c3.special), (1, Some(SpecialKey::Undo)));
    t.apply(K_LCONTROL as u32, false).expect("up");
    t.apply(K_RCONTROL as u32, true).expect("down");
    let c6 = t.apply(K_Z, true).expect("down");
    assert_eq!(c6.special, Some(SpecialKey::Undo));
}

/// T12: Ctrl 이 눌려 있으면 Enter·Shift+`/`·Shift+`1`·Ctrl+Shift+Z 모두 분류 안 함.
#[test]
fn ctrl_blocks_enter_shift_slash_and_ctrl_shift_z() {
    let mut t = KeyTable::new();
    t.apply(K_RCONTROL as u32, true).expect("down");
    let c2 = t.apply(K_RETURN, true).expect("down");
    assert_eq!(c2.special, None);
    t.apply(K_LSHIFT as u32, true).expect("down");
    let c4 = t.apply(K_SLASH, true).expect("down");
    assert_eq!(c4.special, None);
    let c5 = t.apply(K_1, true).expect("down");
    assert_eq!(c5.special, None);
    let c6 = t.apply(K_Z, true).expect("down");
    assert_eq!(c6.special, None);
}

/// T13: Ctrl 을 먼저 떼도 Z 를 뗄 때 되돌리기 유지(J4).
#[test]
fn ctrl_released_first_keeps_undo() {
    let mut t = KeyTable::new();
    t.apply(K_LCONTROL as u32, true).expect("down");
    let c2 = t.apply(K_Z, true).expect("down");
    assert_eq!(c2.special, Some(SpecialKey::Undo));
    t.apply(K_LCONTROL as u32, false).expect("up");
    let c4 = t.apply(K_Z, false).expect("up");
    assert_eq!((c4.held, c4.special), (0, Some(SpecialKey::Undo)));
}

/// T14: 자동 반복은 Ctrl 이 나중에 눌려도 재판정하지 않고(이벤트는 옴, `repeat: true`),
/// Alt+Z 는 무시된다(J4·J11·A2).
#[test]
fn ctrl_after_press_no_reclassify_and_alt_ignored() {
    let mut t = KeyTable::new();
    let c1 = t.apply(K_Z, true).expect("down");
    assert_eq!(c1.special, Some(SpecialKey::Z));
    t.apply(K_LCONTROL as u32, true).expect("down");
    let c3 = t.apply(K_Z, true).expect("repeat"); // 자동 반복 — 이벤트 있음, Undo 로 바뀌지 않음
    assert_eq!(
        (c3.held, c3.special, c3.repeat),
        (2, Some(SpecialKey::Z), true)
    );
    let c4 = t.apply(K_Z, false).expect("up");
    assert_eq!(c4.special, Some(SpecialKey::Z));
    t.apply(K_LCONTROL as u32, false).expect("up");
    let lmenu = VK_LMENU.0 as u32;
    t.apply(lmenu, true).expect("down");
    let c7 = t.apply(K_Z, true).expect("down");
    assert_eq!(c7.special, Some(SpecialKey::Z));
}

/// T15: Shift 를 뗀 뒤 반복이 와도 누를 때 분류(`Exclamation`)를 유지하고 표는 바뀌지 않는다
/// (A2·A3, hook.md §8.1 T15).
#[test]
fn repeat_keeps_held_and_press_time_class() {
    let mut t = KeyTable::new();
    t.apply(K_LSHIFT as u32, true).expect("down");
    let c2 = t.apply(K_1, true).expect("down");
    assert_eq!(c2.special, Some(SpecialKey::Exclamation));
    let c3 = t.apply(K_LSHIFT as u32, false).expect("up");
    assert_eq!((c3.held, c3.special), (1, None));
    let c4 = t.apply(K_1, true).expect("repeat");
    assert_eq!(
        (c4.held, c4.special, c4.repeat),
        (1, Some(SpecialKey::Exclamation), true)
    );
    let c5 = t.apply(K_1, true).expect("repeat");
    assert_eq!(
        (c5.held, c5.special, c5.repeat),
        (1, Some(SpecialKey::Exclamation), true)
    );
    assert_eq!(t.held_count(), 1); // 반복이 표를 바꾸지 않음(A3)
    let c7 = t.apply(K_1, false).expect("up");
    assert_eq!(
        (c7.held, c7.special, c7.repeat),
        (0, Some(SpecialKey::Exclamation), false) // 뗌은 항상 repeat false
    );
}

/// T16: 뗀 뒤 다시 누르면 첫 누름(`repeat: false`). 일반 키도 반복 표시(A4·A6).
#[test]
fn press_after_release_is_not_repeat() {
    let mut t = KeyTable::new();
    let c1 = t.apply(K_Z, true).expect("down");
    assert_eq!(
        (c1.held, c1.special, c1.repeat),
        (1, Some(SpecialKey::Z), false)
    );
    let c2 = t.apply(K_Z, true).expect("repeat");
    assert_eq!(
        (c2.held, c2.special, c2.repeat),
        (1, Some(SpecialKey::Z), true)
    );
    let c3 = t.apply(K_Z, false).expect("up");
    assert_eq!(
        (c3.held, c3.special, c3.repeat),
        (0, Some(SpecialKey::Z), false)
    );
    let c4 = t.apply(K_Z, true).expect("down again");
    assert_eq!(
        (c4.held, c4.special, c4.repeat),
        (1, Some(SpecialKey::Z), false) // 뗀 뒤 다시 누름 = 첫 누름(A4)
    );
    let a = 0x41u32; // 'A' — 분류 밖 일반 키
    let c5 = t.apply(a, true).expect("down");
    assert_eq!((c5.held, c5.special, c5.repeat), (2, None, false));
    let c6 = t.apply(a, true).expect("repeat");
    assert_eq!((c6.held, c6.special, c6.repeat), (2, None, true)); // 일반 키도 반복 표시(A6)
}

/// T17: 수식 키(Shift·Ctrl) 자신의 자동 반복은 이벤트를 내지 않지만(A8), 눌림 상태는 유지되어
/// 뒤이은 Ctrl+Shift+Z 는 여전히 분류되지 않는다(J10).
#[test]
fn modifier_auto_repeat_suppressed_but_state_kept() {
    let mut t = KeyTable::new();
    let c1 = t.apply(K_LSHIFT as u32, true).expect("down");
    assert_eq!((c1.held, c1.special, c1.repeat), (1, None, false));
    assert_eq!(t.apply(K_LSHIFT as u32, true), None); // 수식 키 자신의 자동 반복 — 이벤트 없음(A8)
    let c3 = t.apply(K_LCONTROL as u32, true).expect("down");
    assert_eq!((c3.held, c3.special, c3.repeat), (2, None, false));
    assert_eq!(t.apply(K_LCONTROL as u32, true), None); // 이벤트 없음(A8)
    let c5 = t.apply(K_Z, true).expect("down");
    assert_eq!(
        (c5.held, c5.special, c5.repeat),
        (3, None, false) // Ctrl+Shift+Z = None(J10). Z 자신은 첫 누름
    );
}

// ─── 전역 경로 — keyboard_event (W1 하나만) ────────────────────────────

/// W1: 전역 `KEYS` 를 거치는 유일한 테스트 — 메시지 → 눌림 → 분류 → 자동 반복 전체 연결 확인.
#[test]
fn keyboard_event_wires_message_table_and_class() {
    // 테스트끼리 전역 KEYS 를 공유하므로 이 테스트만 쓰는 vk 대역(K_SPACE)을 쓴다.
    assert_eq!(
        keyboard_event(WM_KEYDOWN, K_SPACE, 1),
        Some(InputEvent::Keyboard {
            pressed: true,
            held: 1,
            special: Some(SpecialKey::Space),
            repeat: false,
            ts: 1,
        })
    );
    // 같은 키의 자동 반복 KEYDOWN 은 repeat: true 이벤트로 온다(CR-023)
    assert_eq!(
        keyboard_event(WM_KEYDOWN, K_SPACE, 2),
        Some(InputEvent::Keyboard {
            pressed: true,
            held: 1,
            special: Some(SpecialKey::Space),
            repeat: true,
            ts: 2,
        })
    );
    assert_eq!(
        keyboard_event(WM_SYSKEYUP, K_SPACE, 3),
        Some(InputEvent::Keyboard {
            pressed: false,
            held: 0,
            special: Some(SpecialKey::Space),
            repeat: false,
            ts: 3,
        })
    );
    assert_eq!(keyboard_event(0x9999, K_SPACE, 4), None);
}

#[test]
fn mouse_buttons_map_left_right_only() {
    assert_eq!(
        mouse_event(WM_LBUTTONDOWN, 0, 0, 1),
        Some(InputEvent::MouseButton {
            button: MouseButton::Left,
            pressed: true,
            ts: 1
        })
    );
    assert_eq!(
        mouse_event(WM_RBUTTONUP, 0, 0, 1),
        Some(InputEvent::MouseButton {
            button: MouseButton::Right,
            pressed: false,
            ts: 1
        })
    );
    // 가운데 버튼·휠은 무시
    assert_eq!(mouse_event(0x0207, 0, 0, 1), None);
}

#[test]
fn mouse_move_is_throttled() {
    LAST_MOVE_MS.store(0, Ordering::Relaxed);
    assert!(mouse_event(WM_MOUSEMOVE, 1, 1, 1000).is_some());
    assert!(mouse_event(WM_MOUSEMOVE, 2, 2, 1005).is_none());
    assert!(mouse_event(WM_MOUSEMOVE, 3, 3, 1000 + MOUSE_MOVE_MIN_INTERVAL_MS).is_some());
}

// ─── 뗌 유실 정리 — KeyTable::release_stale (S1~S7, CR-046 hook.md §3.7) ───────
// 모두 지역 KeyTable + 조회 함수 주입(클로저) — 전역 상태·Win32 호출 없음.

/// S1: `except` 를 뺀 `Down` 칸 중 `is_down` 이 false 인 칸만 정리, vk 오름차순, 재호출은 빈 Vec.
#[test]
fn release_stale_clears_only_released_cells() {
    let mut t = KeyTable::new();
    t.apply(K_LSHIFT as u32, true).expect("down"); // 0xA0
    t.apply(K_SPACE, true).expect("down"); // 0x20
    t.apply(0x41, true).expect("down"); // 'A'
    let released = t.release_stale(Some(K_Z), |vk| vk == K_LSHIFT as u32);
    assert_eq!(
        released,
        vec![
            KeyChange {
                held: 2,
                special: Some(SpecialKey::Space),
                repeat: false
            },
            KeyChange {
                held: 1,
                special: None,
                repeat: false
            },
        ]
    );
    assert_eq!(t.held_count(), 1);
    assert!(t.shift_down());
    // 두 번째 호출은 이미 정리돼 빈 Vec.
    assert_eq!(
        t.release_stale(Some(K_Z), |vk| vk == K_LSHIFT as u32),
        Vec::new()
    );
}

/// S2: 지금 이벤트를 일으킨 키(`except`)는 조회하지 않는다(L2).
#[test]
fn release_stale_never_queries_current_key() {
    let mut t = KeyTable::new();
    t.apply(K_Z, true).expect("down");
    t.apply(K_LSHIFT as u32, true).expect("down");
    let queried = std::cell::RefCell::new(Vec::new());
    let released = t.release_stale(Some(K_Z), |vk| {
        queried.borrow_mut().push(vk);
        false
    });
    assert_eq!(queried.into_inner(), vec![K_LSHIFT as u32]);
    assert_eq!(
        released,
        vec![KeyChange {
            held: 1,
            special: None,
            repeat: false
        }]
    );
    assert!(t.is_down((K_Z & 0xFF) as usize)); // Z 칸은 여전히 Down
}

/// S3: `Down` 칸만 조회한다 — 빈 표는 0회, 4칸이면 정확히 4회. 표는 바뀌지 않는다(최소 작업).
#[test]
fn release_stale_queries_down_cells_only() {
    let mut empty = KeyTable::new();
    let count = std::cell::Cell::new(0u32);
    assert_eq!(
        empty.release_stale(None, |_| {
            count.set(count.get() + 1);
            true
        }),
        Vec::new()
    );
    assert_eq!(count.get(), 0);

    let mut t = KeyTable::new();
    for vk in 0xE0u32..0xE4 {
        t.apply(vk, true).expect("down");
    }
    let count = std::cell::Cell::new(0u32);
    let released = t.release_stale(None, |_| {
        count.set(count.get() + 1);
        true
    });
    assert_eq!(count.get(), 4);
    assert_eq!(released, Vec::new());
    assert_eq!(t.held_count(), 4);
}

/// S4: 남은 Ctrl 을 정리하면 뒤이은 Z 는 Undo 가 아니라 그냥 Z 로 분류된다(D2 한계 해소, L5).
#[test]
fn stale_ctrl_cleared_before_classify() {
    let mut t = KeyTable::new();
    t.apply(K_LCONTROL as u32, true).expect("down");
    let released = t.release_stale(Some(K_Z), |_| false);
    assert_eq!(
        released,
        vec![KeyChange {
            held: 0,
            special: None,
            repeat: false
        }]
    );
    let z = t.apply(K_Z, true).expect("down");
    assert_eq!((z.held, z.special), (1, Some(SpecialKey::Z)));
}

/// S5: 정리된 특수 키 칸의 뗌 이벤트는 누를 때 분류값을 그대로 싣는다(B4 짝 유지).
#[test]
fn stale_special_release_carries_press_class() {
    let mut t = KeyTable::new();
    t.apply(K_LSHIFT as u32, true).expect("down");
    t.apply(K_1, true).expect("down");
    let released = t.release_stale(None, |_| false);
    assert_eq!(
        released,
        vec![
            KeyChange {
                held: 1,
                special: Some(SpecialKey::Exclamation),
                repeat: false
            },
            KeyChange {
                held: 0,
                special: None,
                repeat: false
            },
        ]
    );
}

/// S6: 정리 뒤 다른 키를 누르면 자동 반복으로 오판하지 않는다(D18 해소).
#[test]
fn after_recovery_other_key_press_is_first_press() {
    let mut t = KeyTable::new();
    t.apply(0x41, true).expect("down"); // 'A'
    let released = t.release_stale(Some(0x42), |_| false);
    assert_eq!(
        released,
        vec![KeyChange {
            held: 0,
            special: None,
            repeat: false
        }]
    );
    let b = t.apply(0x42, true).expect("down"); // 'B'
    assert_eq!((b.held, b.repeat), (1, false));
    let a = t.apply(0x41, true).expect("down again"); // 'A' 재누름
    assert_eq!((a.held, a.repeat), (2, false)); // 첫 누름 — 자동 반복 아님
}

/// S7: 뗌을 놓친 바로 그 키를 다시 누르면 반복으로 보고된다(L7 한계, 문서로 고정).
#[test]
fn same_key_repress_is_reported_as_repeat_limitation() {
    let mut t = KeyTable::new();
    t.apply(0x41, true).expect("down"); // 'A' — 이 뒤 뗌을 놓쳤다고 가정
    assert_eq!(t.release_stale(Some(0x41), |_| false), Vec::new()); // 지금 키는 조회 안 함(L2)
    let repress = t.apply(0x41, true).expect("repeat");
    assert_eq!(
        (repress.held, repress.special, repress.repeat),
        (1, None, true)
    );
    let up = t.apply(0x41, false).expect("up");
    assert_eq!((up.held, up.repeat), (0, false));
}

// ─── 마우스 버튼 뗌 유실 정리 — MouseButtonState (MB2~MB4, CR-046 §3.7.10 보강) ─

/// MB1: 뗌 유실 정리를 부르는 마우스 메시지 판정 — 좌·우 버튼 누름만.
#[test]
fn mouse_button_down_only_left_right_press() {
    assert!(mouse_button_down(WM_LBUTTONDOWN));
    assert!(mouse_button_down(WM_RBUTTONDOWN));
    assert!(!mouse_button_down(WM_LBUTTONUP));
    assert!(!mouse_button_down(WM_RBUTTONUP));
    assert!(!mouse_button_down(WM_MOUSEMOVE));
    assert!(!mouse_button_down(0x0207)); // WM_MBUTTONDOWN
    assert!(!mouse_button_down(0));
}

/// MB2: 눌린 상태로 믿는 버튼이 실제로는 떼져 있으면 정리하고, `except` 버튼은 조회하지 않는다.
#[test]
fn mouse_state_release_stale_skips_except_and_queries_down_only() {
    let mut s = MouseButtonState::new();
    s.set(MouseButton::Left, true);
    s.set(MouseButton::Right, true);
    let queried = std::cell::RefCell::new(Vec::new());
    let released = s.release_stale(Some(MouseButton::Left), |vk| {
        queried.borrow_mut().push(vk);
        false
    });
    assert_eq!(queried.into_inner(), vec![VK_RBUTTON.0 as u32]); // Left(except) 는 조회하지 않음
    assert_eq!(released, vec![MouseButton::Right]);
    assert_eq!(
        s,
        MouseButtonState {
            left: true,
            right: false
        }
    );
}

/// MB3: 둘 다 눌림이 아니면(정상 상태) 정리할 것이 없다 — 조회 0회.
#[test]
fn mouse_state_release_stale_noop_when_nothing_down() {
    let mut s = MouseButtonState::new();
    let count = std::cell::Cell::new(0u32);
    assert_eq!(
        s.release_stale(None, |_| {
            count.set(count.get() + 1);
            true
        }),
        Vec::new()
    );
    assert_eq!(count.get(), 0);
}

/// MB4: `clear`는 좌·우 모두 되돌린다.
#[test]
fn mouse_state_clear_resets_both() {
    let mut s = MouseButtonState::new();
    s.set(MouseButton::Left, true);
    s.set(MouseButton::Right, true);
    s.clear();
    assert_eq!(s, MouseButtonState::new());
}

// ─── 전역 경로 증분 — keyboard_event / recover_missed_releases (W1 ⑤~⑦) ───────

/// W1 증분: 기존 ①~④ 뒤에 이어지는 흐름 — 자동 반복·정리 정경로가 같은 전역 `KEYS`를 쓴다.
#[test]
fn keyboard_event_recovery_increment() {
    // ⑤ Enter 를 새로 누른다(다른 W1 대역과 겹치지 않도록 여기서만 쓰는 키).
    let c5 = keyboard_event(WM_KEYDOWN, K_RETURN, 5).expect("enter down");
    assert_eq!(
        c5,
        InputEvent::Keyboard {
            pressed: true,
            held: 1,
            special: Some(SpecialKey::Enter),
            repeat: false,
            ts: 5,
        }
    );
    // ⑥ 스페이스가 뗌을 놓친 채 남아 있었다고 가정하고 정리한다(Enter 는 except).
    let recovered = recover_missed_releases(Some(K_SPACE), 6, |_| false);
    assert_eq!(
        recovered,
        vec![InputEvent::Keyboard {
            pressed: false,
            held: 0,
            special: Some(SpecialKey::Enter),
            repeat: false,
            ts: 6,
        }]
    );
    // ⑦ 표가 이미 비었으므로 다시 정리할 것이 없다.
    assert_eq!(recover_missed_releases(None, 7, |_| false), Vec::new());
}
