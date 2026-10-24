//! rest-display RD-01~04 단위 테스트(C19~C23) — tests.rs 800줄 한계로 분리. `sleep` 금지.

use super::*;

fn secs(n: u64) -> Duration {
    Duration::from_secs(n)
}

/// `with_config(Countdown, secs)`.
fn cd(secs: u64) -> Timer {
    Timer::with_config(TimerConfig {
        mode: TimerMode::Countdown,
        countdown: Duration::from_secs(secs),
    })
}

fn snap(t: &Timer, now: Instant) -> (TimerStatus, u64) {
    let s = t.snapshot(now);
    (s.status, s.elapsed_ms)
}

// ─── rest-display RD-01~04: 카운트다운 쉬는중 자동 일시정지(C19~C23) ───────────

/// 카운트다운 60초, t0 Start, t0+3s 쉬는중 진입한 타이머.
fn rest_paused() -> (Timer, Instant) {
    let t0 = Instant::now();
    let mut t = cd(60);
    t.apply(TimerAction::Start, true, t0).unwrap();
    assert!(t.set_resting(true, t0 + secs(3)));
    (t, t0)
}

/// C19
#[test]
fn countdown_rest_paused_has_no_deadline() {
    let (mut t, t0) = rest_paused();
    assert_eq!(t.next_wake(), None);
    assert!(!t.tick(t0 + secs(61)));
    assert!(!t.tick(t0 + secs(1000)));
    let s = t.snapshot(t0 + secs(1000));
    assert_eq!((s.status, s.elapsed_ms), (TimerStatus::RestPaused, 3000));
}

/// C20
#[test]
fn countdown_resting_ignored_when_not_running() {
    let t0 = Instant::now();
    let mut stopped = cd(60);
    let mut paused = cd(60);
    paused.apply(TimerAction::Start, true, t0).unwrap();
    paused
        .apply(TimerAction::Pause, true, t0 + secs(10))
        .unwrap();
    let mut finished = cd(60);
    finished.apply(TimerAction::Start, true, t0).unwrap();
    assert!(finished.tick(t0 + secs(60)));
    let wake = finished.next_wake();
    let now = t0 + secs(61);
    for t in [&mut stopped, &mut paused, &mut finished] {
        let before = t.snapshot(now);
        assert!(!t.set_resting(true, now));
        assert!(!t.set_resting(false, now));
        assert_eq!(t.snapshot(now), before);
    }
    assert_eq!(finished.status(), TimerStatus::Finished);
    assert_eq!(finished.next_wake(), wake);
}

/// C21
#[test]
fn countdown_rest_paused_user_actions() {
    let on = true;
    // Pause → Paused, 이후 set_resting(false) 무시
    let (mut t, t0) = rest_paused();
    assert_eq!(t.apply(TimerAction::Pause, on, t0 + secs(4)), Ok(true));
    assert_eq!(t.status(), TimerStatus::Paused);
    assert!(!t.set_resting(false, t0 + secs(5)));
    assert_eq!(t.status(), TimerStatus::Paused);
    // Start → Running, 이어서
    let (mut t, t0) = rest_paused();
    assert_eq!(t.apply(TimerAction::Start, on, t0 + secs(10)), Ok(true));
    assert_eq!(snap(&t, t0 + secs(12)), (TimerStatus::Running, 5000));
    // Stop → Stopped
    let (mut t, t0) = rest_paused();
    assert_eq!(t.apply(TimerAction::Stop, on, t0 + secs(4)), Ok(true));
    let s = t.snapshot(t0 + secs(4));
    assert_eq!(
        (s.status, s.elapsed_ms, s.duration_ms),
        (TimerStatus::Stopped, 0, 60000)
    );
    // disable → Paused
    let (mut t, t0) = rest_paused();
    assert!(t.disable(t0 + secs(4)));
    assert_eq!(snap(&t, t0 + secs(9)), (TimerStatus::Paused, 3000));
    // configure 같은 모드·시작 시간만 변경 → 상태·active 불변
    let (mut t, t0) = rest_paused();
    let cfg = TimerConfig {
        mode: TimerMode::Countdown,
        countdown: secs(30),
    };
    assert!(!t.configure(cfg, t0 + secs(4)));
    let s = t.snapshot(t0 + secs(4));
    assert_eq!((s.status, s.duration_ms), (TimerStatus::RestPaused, 60000));
    // configure 모드 변경 → 새 모드 Stopped
    let (mut t, t0) = rest_paused();
    let cfg = TimerConfig {
        mode: TimerMode::Stopwatch,
        countdown: secs(30),
    };
    assert!(t.configure(cfg, t0 + secs(4)));
    let s = t.snapshot(t0 + secs(4));
    assert_eq!(
        (s.status, s.elapsed_ms, s.mode, s.duration_ms),
        (TimerStatus::Stopped, 0, TimerMode::Stopwatch, 0)
    );
}

/// C22
#[test]
fn countdown_rest_after_deadline_finishes_on_resume() {
    let t0 = Instant::now();
    let mut t = cd(60);
    t.apply(TimerAction::Start, true, t0).unwrap();
    assert!(t.set_resting(true, t0 + secs(61)));
    assert_eq!(snap(&t, t0 + secs(61)), (TimerStatus::RestPaused, 60000));
    assert_eq!(t.next_wake(), None);
    assert!(t.set_resting(false, t0 + secs(100)));
    assert_eq!(t.next_wake(), Some(t0 + secs(100)));
    assert!(t.tick(t0 + secs(100)));
    assert_eq!(t.status(), TimerStatus::Finished);
    assert_eq!(t.next_wake(), Some(t0 + secs(110)));
}

/// C23
#[test]
fn countdown_rest_paused_serializes() {
    let (t, t0) = rest_paused();
    let json = serde_json::to_string(&t.snapshot(t0 + secs(100))).unwrap();
    assert_eq!(
        json,
        r#"{"status":"restPaused","elapsedMs":3000,"mode":"countdown","durationMs":60000}"#
    );
}
