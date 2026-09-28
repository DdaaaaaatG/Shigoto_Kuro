//! 타이머 트레이 메뉴 보기 계산 — 순수(Tauri 무관, CR-048 TM-11).
//!
//! [목적] 스톱워치나 타이머가 켜져 있을 때만 메뉴 위에 「시작/일시정지」·「멈춤」을 보인다.
//! [공개 API] `TrayTimerView`, `tray_timer_view`.
//! [스레드] 없음(순수 함수).
//! [unsafe] 없음.
//! [에러] 없음.
//! [설정] 읽지 않음 — `enabled`는 인자로 받는다.
//! [테스트] TV1·TV2(아래 `#[cfg(test)] mod tests`).

use crate::timer::TimerStatus;

/// 트레이 타이머 메뉴 보기. `visible = enabled`, `running = (status == Running)`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TrayTimerView {
    pub visible: bool,
    pub running: bool,
}

/// `Paused`·`RestPaused`·`Stopped`·`Finished`는 모두 `running = false`.
pub fn tray_timer_view(enabled: bool, status: TimerStatus) -> TrayTimerView {
    TrayTimerView {
        visible: enabled,
        running: enabled && status == TimerStatus::Running,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// TV1
    #[test]
    fn tray_timer_view_hidden_when_disabled() {
        for status in [
            TimerStatus::Stopped,
            TimerStatus::Running,
            TimerStatus::Paused,
            TimerStatus::RestPaused,
            TimerStatus::Finished,
        ] {
            let view = tray_timer_view(false, status);
            assert!(!view.visible, "status={status:?}");
            assert!(!view.running, "status={status:?}");
        }
    }

    /// TV2
    #[test]
    fn tray_timer_view_running_label() {
        for (status, expect_running) in [
            (TimerStatus::Running, true),
            (TimerStatus::Paused, false),
            (TimerStatus::RestPaused, false),
            (TimerStatus::Stopped, false),
            (TimerStatus::Finished, false),
        ] {
            let view = tray_timer_view(true, status);
            assert!(view.visible, "status={status:?}");
            assert_eq!(view.running, expect_running, "status={status:?}");
        }
    }
}
