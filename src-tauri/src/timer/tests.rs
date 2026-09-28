//! `timer/mod.rs` 단위 테스트 — 800줄 한계로 분리(패킷 §2.2). 기존 T1~T17(스톱워치, CR-045)과
//! 신규 C1~C18(카운트다운·끝남, CR-048)을 담는다. `sleep` 금지 — `t0 + Duration`을 `now`로 주입한다.

use super::*;

fn snap(t: &Timer, now: Instant) -> (TimerStatus, u64) {
    let s = t.snapshot(now);
    (s.status, s.elapsed_ms)
}

/// `with_config(Countdown, secs)`.
fn cd(secs: u64) -> Timer {
    Timer::with_config(TimerConfig {
        mode: TimerMode::Countdown,
        countdown: Duration::from_secs(secs),
    })
}

// ─── CR-045 스톱워치(T1~T17, 기존 유지) ─────────────────────────────────────

/// T1
#[test]
fn timer_new_is_stopped_zero() {
    let t0 = Instant::now();
    assert_eq!(snap(&Timer::new(), t0), (TimerStatus::Stopped, 0));
    assert_eq!(snap(&Timer::default(), t0), (TimerStatus::Stopped, 0));
}

/// T2
#[test]
fn start_runs_and_elapsed_grows() {
    let t0 = Instant::now();
    let mut t = Timer::new();
    assert_eq!(t.apply(TimerAction::Start, true, t0), Ok(true));
    assert_eq!(
        snap(&t, t0 + Duration::from_secs(3)),
        (TimerStatus::Running, 3000)
    );
}

/// T3
#[test]
fn pause_freezes_elapsed() {
    let t0 = Instant::now();
    let mut t = Timer::new();
    t.apply(TimerAction::Start, true, t0).unwrap();
    t.apply(TimerAction::Pause, true, t0 + Duration::from_secs(2))
        .unwrap();
    assert_eq!(
        snap(&t, t0 + Duration::from_secs(12)),
        (TimerStatus::Paused, 2000)
    );
}

/// T4
#[test]
fn resume_after_pause_accumulates() {
    let t0 = Instant::now();
    let mut t = Timer::new();
    t.apply(TimerAction::Start, true, t0).unwrap();
    t.apply(TimerAction::Pause, true, t0 + Duration::from_secs(2))
        .unwrap();
    t.apply(TimerAction::Start, true, t0 + Duration::from_secs(12))
        .unwrap();
    assert_eq!(
        snap(&t, t0 + Duration::from_secs(15)),
        (TimerStatus::Running, 5000)
    );
}

/// T5
#[test]
fn stop_resets_to_zero_from_running_paused_rest_paused() {
    let t0 = Instant::now();
    for setup in ["running", "paused", "rest_paused"] {
        let mut t = Timer::new();
        t.apply(TimerAction::Start, true, t0).unwrap();
        match setup {
            "paused" => {
                t.apply(TimerAction::Pause, true, t0 + Duration::from_secs(1))
                    .unwrap();
            }
            "rest_paused" => {
                t.set_resting(true, t0 + Duration::from_secs(1));
            }
            _ => {}
        }
        let result = t.apply(TimerAction::Stop, true, t0 + Duration::from_secs(5));
        assert_eq!(result, Ok(true), "setup={setup}");
        assert_eq!(
            snap(&t, t0 + Duration::from_secs(5)),
            (TimerStatus::Stopped, 0)
        );
    }
}

/// T6
#[test]
fn resting_pauses_only_running() {
    let t0 = Instant::now();
    let mut t = Timer::new();
    t.apply(TimerAction::Start, true, t0).unwrap();
    let changed = t.set_resting(true, t0 + Duration::from_secs(2));
    assert!(changed);
    assert_eq!(
        snap(&t, t0 + Duration::from_secs(10)),
        (TimerStatus::RestPaused, 2000)
    );

    let mut stopped = Timer::new();
    assert!(!stopped.set_resting(true, t0));
    assert_eq!(stopped.snapshot(t0).status, TimerStatus::Stopped);

    let mut paused = Timer::new();
    paused.apply(TimerAction::Start, true, t0).unwrap();
    paused.apply(TimerAction::Pause, true, t0).unwrap();
    assert!(!paused.set_resting(true, t0));
    assert_eq!(paused.snapshot(t0).status, TimerStatus::Paused);
}

/// T7
#[test]
fn wake_resumes_only_rest_paused() {
    let t0 = Instant::now();
    let mut t = Timer::new();
    t.apply(TimerAction::Start, true, t0).unwrap();
    t.set_resting(true, t0 + Duration::from_secs(2));
    let woke = t.set_resting(false, t0 + Duration::from_secs(300));
    assert!(woke);
    assert_eq!(
        snap(&t, t0 + Duration::from_secs(303)),
        (TimerStatus::Running, 5000)
    );
}

/// T8
#[test]
fn user_pause_is_not_resumed_by_wake() {
    let t0 = Instant::now();
    let mut t = Timer::new();
    t.apply(TimerAction::Start, true, t0).unwrap();
    t.apply(TimerAction::Pause, true, t0).unwrap();
    let woke = t.set_resting(false, t0);
    assert!(!woke);
    assert_eq!(t.snapshot(t0).status, TimerStatus::Paused);
}

/// T9
#[test]
fn pause_during_rest_paused_becomes_user_paused() {
    let t0 = Instant::now();
    let mut t = Timer::new();
    t.apply(TimerAction::Start, true, t0).unwrap();
    t.set_resting(true, t0);
    let paused = t.apply(TimerAction::Pause, true, t0);
    assert_eq!(paused, Ok(true));
    assert_eq!(t.snapshot(t0).status, TimerStatus::Paused);
    let woke = t.set_resting(false, t0);
    assert!(!woke);
    assert_eq!(t.snapshot(t0).status, TimerStatus::Paused);
}

/// T10
#[test]
fn start_from_rest_paused_runs() {
    let t0 = Instant::now();
    let mut t = Timer::new();
    t.apply(TimerAction::Start, true, t0).unwrap();
    t.set_resting(true, t0 + Duration::from_secs(2));
    let started = t.apply(TimerAction::Start, true, t0 + Duration::from_secs(2));
    assert_eq!(started, Ok(true));
    assert_eq!(
        snap(&t, t0 + Duration::from_secs(3)),
        (TimerStatus::Running, 3000)
    );
}

/// T11
#[test]
fn disabled_rejects_all_actions() {
    let t0 = Instant::now();
    for action in [TimerAction::Start, TimerAction::Pause, TimerAction::Stop] {
        let mut stopped = Timer::new();
        let err = stopped.apply(action, false, t0).unwrap_err();
        assert_eq!(err, TimerError::Disabled);
        assert_eq!(err.code(), "timer.disabled");
        assert_eq!(stopped.snapshot(t0).status, TimerStatus::Stopped);

        let mut running = Timer::new();
        running.apply(TimerAction::Start, true, t0).unwrap();
        let err = running.apply(action, false, t0).unwrap_err();
        assert_eq!(err, TimerError::Disabled);
        assert_eq!(err.code(), "timer.disabled");
        assert_eq!(running.snapshot(t0).status, TimerStatus::Running);
    }
}

/// T12
#[test]
fn disable_pauses_running_and_rest_paused() {
    let t0 = Instant::now();
    let mut running = Timer::new();
    running.apply(TimerAction::Start, true, t0).unwrap();
    assert!(running.disable(t0 + Duration::from_secs(2)));
    assert_eq!(
        snap(&running, t0 + Duration::from_secs(10)),
        (TimerStatus::Paused, 2000)
    );
    assert!(!running.set_resting(false, t0 + Duration::from_secs(10)));

    let mut rest_paused = Timer::new();
    rest_paused.apply(TimerAction::Start, true, t0).unwrap();
    rest_paused.set_resting(true, t0 + Duration::from_secs(1));
    assert!(rest_paused.disable(t0 + Duration::from_secs(5)));
    assert_eq!(
        rest_paused.snapshot(t0 + Duration::from_secs(5)).status,
        TimerStatus::Paused
    );
    assert!(!rest_paused.set_resting(false, t0 + Duration::from_secs(5)));
}

/// T13
#[test]
fn disable_is_noop_when_stopped_or_paused() {
    let t0 = Instant::now();
    let mut stopped = Timer::new();
    assert!(!stopped.disable(t0));
    assert_eq!(snap(&stopped, t0), (TimerStatus::Stopped, 0));

    let mut paused = Timer::new();
    paused.apply(TimerAction::Start, true, t0).unwrap();
    paused
        .apply(TimerAction::Pause, true, t0 + Duration::from_secs(1))
        .unwrap();
    assert!(!paused.disable(t0 + Duration::from_secs(1)));
    assert_eq!(
        snap(&paused, t0 + Duration::from_secs(1)),
        (TimerStatus::Paused, 1000)
    );
}

/// T14
#[test]
fn idempotent_inputs_return_false() {
    let t0 = Instant::now();

    let mut running = Timer::new();
    running.apply(TimerAction::Start, true, t0).unwrap();
    let before = running.snapshot(t0);
    assert_eq!(running.apply(TimerAction::Start, true, t0), Ok(false));
    assert_eq!(running.snapshot(t0), before);

    let mut stopped = Timer::new();
    assert_eq!(stopped.apply(TimerAction::Pause, true, t0), Ok(false));
    assert_eq!(stopped.apply(TimerAction::Stop, true, t0), Ok(false));

    let mut paused = Timer::new();
    paused.apply(TimerAction::Start, true, t0).unwrap();
    paused.apply(TimerAction::Pause, true, t0).unwrap();
    assert_eq!(paused.apply(TimerAction::Pause, true, t0), Ok(false));

    let mut running2 = Timer::new();
    running2.apply(TimerAction::Start, true, t0).unwrap();
    assert!(!running2.set_resting(false, t0));
}

/// T15 (CR-048 갱신 — `mode`·`durationMs` 추가)
#[test]
fn snapshot_serializes_camel_case() {
    let snap = TimerSnapshot {
        status: TimerStatus::RestPaused,
        elapsed_ms: 1234,
        mode: TimerMode::Stopwatch,
        duration_ms: 0,
    };
    assert_eq!(
        serde_json::to_string(&snap).unwrap(),
        r#"{"status":"restPaused","elapsedMs":1234,"mode":"stopwatch","durationMs":0}"#
    );
    for (status, expected) in [
        (TimerStatus::Stopped, "stopped"),
        (TimerStatus::Running, "running"),
        (TimerStatus::Paused, "paused"),
    ] {
        let s = TimerSnapshot {
            status,
            elapsed_ms: 0,
            mode: TimerMode::Stopwatch,
            duration_ms: 0,
        };
        let json = serde_json::to_string(&s).unwrap();
        assert!(json.contains(&format!("\"status\":\"{expected}\"")));
    }
}

/// T16
#[test]
fn action_deserializes_lowercase() {
    assert_eq!(
        serde_json::from_str::<TimerAction>("\"start\"").unwrap(),
        TimerAction::Start
    );
    assert_eq!(
        serde_json::from_str::<TimerAction>("\"pause\"").unwrap(),
        TimerAction::Pause
    );
    assert_eq!(
        serde_json::from_str::<TimerAction>("\"stop\"").unwrap(),
        TimerAction::Stop
    );
    assert!(serde_json::from_str::<TimerAction>("\"Start\"").is_err());
    assert!(serde_json::from_str::<TimerAction>("\"reset\"").is_err());
}

/// T17
#[test]
fn snapshot_before_since_is_saturated() {
    let t0 = Instant::now();
    let mut t = Timer::new();
    t.apply(TimerAction::Start, true, t0 + Duration::from_secs(10))
        .unwrap();
    assert_eq!(snap(&t, t0), (TimerStatus::Running, 0));
}

// ─── CR-048 카운트다운·끝남(C1~C18) ─────────────────────────────────────────

/// C1
#[test]
fn countdown_start_counts_down() {
    let t0 = Instant::now();
    let mut t = cd(60);
    assert_eq!(t.apply(TimerAction::Start, true, t0), Ok(true));
    let s = t.snapshot(t0 + Duration::from_secs(3));
    assert_eq!(s.status, TimerStatus::Running);
    assert_eq!(s.elapsed_ms, 3000);
    assert_eq!(s.mode, TimerMode::Countdown);
    assert_eq!(s.duration_ms, 60000);
}

/// C2
#[test]
fn countdown_pause_keeps_remaining() {
    let t0 = Instant::now();
    let mut t = cd(60);
    t.apply(TimerAction::Start, true, t0).unwrap();
    t.apply(TimerAction::Pause, true, t0 + Duration::from_secs(10))
        .unwrap();
    let s = t.snapshot(t0 + Duration::from_secs(100));
    assert_eq!(s.status, TimerStatus::Paused);
    assert_eq!(s.elapsed_ms, 10000);

    // 마감 뒤·tick 전에 Pause가 와도 남은 시간이 음수가 되지 않는다(T-D9).
    let mut t2 = cd(60);
    t2.apply(TimerAction::Start, true, t0).unwrap();
    t2.apply(TimerAction::Pause, true, t0 + Duration::from_secs(61))
        .unwrap();
    let s2 = t2.snapshot(t0 + Duration::from_secs(61));
    assert_eq!(s2.status, TimerStatus::Paused);
    assert_eq!(s2.elapsed_ms, 60000);
}

/// C3
#[test]
fn countdown_stop_returns_to_duration() {
    let t0 = Instant::now();
    for setup in ["running", "paused"] {
        let mut t = cd(60);
        t.apply(TimerAction::Start, true, t0).unwrap();
        if setup == "paused" {
            t.apply(TimerAction::Pause, true, t0 + Duration::from_secs(5))
                .unwrap();
        }
        assert_eq!(
            t.apply(TimerAction::Stop, true, t0 + Duration::from_secs(10)),
            Ok(true),
            "setup={setup}"
        );
        let s = t.snapshot(t0 + Duration::from_secs(10));
        assert_eq!(s.status, TimerStatus::Stopped);
        assert_eq!(s.elapsed_ms, 0);
        assert_eq!(s.mode, TimerMode::Countdown);
        assert_eq!(s.duration_ms, 60000);
    }
}

/// C4
#[test]
fn countdown_ignores_resting() {
    let t0 = Instant::now();
    let mut t = cd(60);
    t.apply(TimerAction::Start, true, t0).unwrap();
    assert!(!t.set_resting(true, t0 + Duration::from_secs(3)));
    assert!(!t.set_resting(false, t0 + Duration::from_secs(4)));
    let s = t.snapshot(t0 + Duration::from_secs(5));
    assert_eq!(s.status, TimerStatus::Running);
    assert_eq!(s.elapsed_ms, 5000);
}

/// C5
#[test]
fn tick_before_deadline_is_noop() {
    let t0 = Instant::now();
    let mut t = cd(60);
    t.apply(TimerAction::Start, true, t0).unwrap();
    assert!(!t.tick(t0 + Duration::from_millis(59_999)));
    assert_eq!(t.status(), TimerStatus::Running);
}

/// C6
#[test]
fn tick_at_deadline_finishes() {
    let t0 = Instant::now();
    let mut t = cd(60);
    t.apply(TimerAction::Start, true, t0).unwrap();
    let due = t0 + Duration::from_secs(60);
    assert!(t.tick(due));
    let s = t.snapshot(due);
    assert_eq!(s.status, TimerStatus::Finished);
    assert_eq!(s.elapsed_ms, 60000);
    assert_eq!(t.next_wake(), Some(due + Duration::from_secs(10)));
}

/// C7
#[test]
fn finished_holds_ten_seconds_then_stops() {
    let t0 = Instant::now();
    let mut t = cd(60);
    t.apply(TimerAction::Start, true, t0).unwrap();
    let detected = t0 + Duration::from_secs(60);
    assert!(t.tick(detected));
    assert!(!t.tick(detected + Duration::from_millis(9_999)));
    assert_eq!(t.status(), TimerStatus::Finished);
    assert!(t.tick(detected + Duration::from_secs(10)));
    let s = t.snapshot(detected + Duration::from_secs(10));
    assert_eq!(s.status, TimerStatus::Stopped);
    assert_eq!(s.elapsed_ms, 0);
    assert_eq!(s.duration_ms, 60000);
}

/// C8
#[test]
fn finished_measured_from_detection() {
    let t0 = Instant::now();
    let mut t = cd(60);
    t.apply(TimerAction::Start, true, t0).unwrap();
    let late = t0 + Duration::from_secs(65);
    assert!(t.tick(late));
    let s = t.snapshot(late);
    assert_eq!(s.status, TimerStatus::Finished);
    assert_eq!(s.elapsed_ms, 60000);
    assert_eq!(t.next_wake(), Some(late + Duration::from_secs(10)));
}

/// C9
#[test]
fn start_during_finished_restarts_with_configured() {
    let t0 = Instant::now();
    let mut t = cd(60);
    t.apply(TimerAction::Start, true, t0).unwrap();
    t.configure(
        TimerConfig {
            mode: TimerMode::Countdown,
            countdown: Duration::from_secs(30),
        },
        t0 + Duration::from_secs(1),
    );
    let due = t0 + Duration::from_secs(60);
    assert!(t.tick(due));
    assert_eq!(t.status(), TimerStatus::Finished);
    assert_eq!(t.apply(TimerAction::Start, true, due), Ok(true));
    let s = t.snapshot(due);
    assert_eq!(s.status, TimerStatus::Running);
    assert_eq!(s.elapsed_ms, 0);
    assert_eq!(s.duration_ms, 30000);
}

/// C10
#[test]
fn stop_during_finished_stops() {
    let t0 = Instant::now();
    let mut t = cd(60);
    t.apply(TimerAction::Start, true, t0).unwrap();
    let due = t0 + Duration::from_secs(60);
    t.tick(due);
    assert_eq!(t.apply(TimerAction::Stop, true, due), Ok(true));
    let s = t.snapshot(due);
    assert_eq!(s.status, TimerStatus::Stopped);
    assert_eq!(s.elapsed_ms, 0);
    assert_eq!(s.duration_ms, 60000);
}

/// C11
#[test]
fn disable_finished_stops() {
    let t0 = Instant::now();
    let mut t = cd(60);
    t.apply(TimerAction::Start, true, t0).unwrap();
    let due = t0 + Duration::from_secs(60);
    t.tick(due);
    assert!(t.disable(due));
    assert_eq!(t.status(), TimerStatus::Stopped);
}

/// C12
#[test]
fn disable_running_countdown_pauses() {
    let t0 = Instant::now();
    let mut t = cd(60);
    t.apply(TimerAction::Start, true, t0).unwrap();
    assert!(t.disable(t0 + Duration::from_secs(20)));
    let s = t.snapshot(t0 + Duration::from_secs(20));
    assert_eq!(s.status, TimerStatus::Paused);
    assert_eq!(s.elapsed_ms, 20000);
}

/// C13
#[test]
fn configure_mode_switch_resets() {
    let t0 = Instant::now();
    let to_countdown = TimerConfig {
        mode: TimerMode::Countdown,
        countdown: Duration::from_secs(45),
    };
    let to_stopwatch = TimerConfig {
        mode: TimerMode::Stopwatch,
        countdown: Duration::from_secs(45),
    };

    // 스톱워치 Running → Countdown
    let mut t1 = Timer::new();
    t1.apply(TimerAction::Start, true, t0).unwrap();
    assert!(t1.configure(to_countdown, t0 + Duration::from_secs(1)));
    let s1 = t1.snapshot(t0 + Duration::from_secs(1));
    assert_eq!(s1.status, TimerStatus::Stopped);
    assert_eq!(s1.elapsed_ms, 0);
    assert_eq!(s1.mode, TimerMode::Countdown);
    assert_eq!(s1.duration_ms, 45000);

    // 스톱워치 RestPaused → Countdown
    let mut t2 = Timer::new();
    t2.apply(TimerAction::Start, true, t0).unwrap();
    t2.set_resting(true, t0 + Duration::from_secs(2));
    assert!(t2.configure(to_countdown, t0 + Duration::from_secs(3)));
    assert_eq!(t2.status(), TimerStatus::Stopped);

    // 카운트다운 Running → Stopwatch
    let mut t3 = cd(60);
    t3.apply(TimerAction::Start, true, t0).unwrap();
    assert!(t3.configure(to_stopwatch, t0 + Duration::from_secs(1)));
    let s3 = t3.snapshot(t0 + Duration::from_secs(1));
    assert_eq!(s3.status, TimerStatus::Stopped);
    assert_eq!(s3.elapsed_ms, 0);
    assert_eq!(s3.mode, TimerMode::Stopwatch);
    assert_eq!(s3.duration_ms, 0);

    // Finished → Stopwatch
    let mut t4 = cd(60);
    t4.apply(TimerAction::Start, true, t0).unwrap();
    let due = t0 + Duration::from_secs(60);
    t4.tick(due);
    assert_eq!(t4.status(), TimerStatus::Finished);
    assert!(t4.configure(to_stopwatch, due));
    assert_eq!(t4.status(), TimerStatus::Stopped);
}

/// C14
#[test]
fn configure_duration_updates_stopped_only() {
    let t0 = Instant::now();
    let cfg30 = TimerConfig {
        mode: TimerMode::Countdown,
        countdown: Duration::from_secs(30),
    };

    // Stopped 60→30: 즉시 반영
    let mut t1 = cd(60);
    assert!(t1.configure(cfg30, t0));
    assert_eq!(t1.snapshot(t0).duration_ms, 30000);

    // Running 60→30: 다음 대기부터
    let mut t2 = cd(60);
    t2.apply(TimerAction::Start, true, t0).unwrap();
    assert!(!t2.configure(cfg30, t0 + Duration::from_secs(1)));
    assert_eq!(t2.snapshot(t0 + Duration::from_secs(1)).duration_ms, 60000);
    t2.apply(TimerAction::Stop, true, t0 + Duration::from_secs(2))
        .unwrap();
    assert_eq!(t2.snapshot(t0 + Duration::from_secs(2)).duration_ms, 30000);

    // 같은 값
    let mut t3 = cd(60);
    let cfg60 = TimerConfig {
        mode: TimerMode::Countdown,
        countdown: Duration::from_secs(60),
    };
    assert!(!t3.configure(cfg60, t0));

    // 스톱워치 Stopped 시간만 변경(표시에 영향 없음)
    let mut t4 = Timer::new();
    assert!(!t4.configure(
        TimerConfig {
            mode: TimerMode::Stopwatch,
            countdown: Duration::from_secs(999),
        },
        t0
    ));
}

/// C15
#[test]
fn next_wake_values() {
    let t0 = Instant::now();

    let stopped = cd(60);
    assert_eq!(stopped.next_wake(), None);

    let mut running = cd(60);
    running.apply(TimerAction::Start, true, t0).unwrap();
    assert_eq!(running.next_wake(), Some(t0 + Duration::from_secs(60)));

    let mut paused_then_started = cd(60);
    paused_then_started
        .apply(TimerAction::Start, true, t0)
        .unwrap();
    paused_then_started
        .apply(TimerAction::Pause, true, t0 + Duration::from_secs(10))
        .unwrap();
    paused_then_started
        .apply(TimerAction::Start, true, t0 + Duration::from_secs(20))
        .unwrap();
    assert_eq!(
        paused_then_started.next_wake(),
        Some(t0 + Duration::from_secs(70))
    );

    let mut finished = cd(60);
    finished.apply(TimerAction::Start, true, t0).unwrap();
    let due = t0 + Duration::from_secs(60);
    finished.tick(due);
    assert_eq!(finished.next_wake(), Some(due + Duration::from_secs(10)));

    let mut stopwatch_running = Timer::new();
    stopwatch_running
        .apply(TimerAction::Start, true, t0)
        .unwrap();
    assert_eq!(stopwatch_running.next_wake(), None);
}

/// C16
#[test]
fn with_config_starts_stopped_with_duration() {
    let countdown = Timer::with_config(TimerConfig {
        mode: TimerMode::Countdown,
        countdown: Duration::from_secs(1500),
    });
    let t0 = Instant::now();
    let s = countdown.snapshot(t0);
    assert_eq!(s.status, TimerStatus::Stopped);
    assert_eq!(s.elapsed_ms, 0);
    assert_eq!(s.mode, TimerMode::Countdown);
    assert_eq!(s.duration_ms, 1_500_000);
    assert_eq!(countdown.next_wake(), None);

    let stopwatch = Timer::new();
    let s2 = stopwatch.snapshot(t0);
    assert_eq!(s2.status, TimerStatus::Stopped);
    assert_eq!(s2.elapsed_ms, 0);
    assert_eq!(s2.mode, TimerMode::Stopwatch);
    assert_eq!(s2.duration_ms, 0);
}

/// C17
#[test]
fn snapshot_serializes_new_fields() {
    let t0 = Instant::now();
    let mut t = cd(60);
    t.apply(TimerAction::Start, true, t0).unwrap();
    let due = t0 + Duration::from_secs(60);
    t.tick(due);
    let s = t.snapshot(due);
    assert_eq!(
        serde_json::to_string(&s).unwrap(),
        r#"{"status":"finished","elapsedMs":60000,"mode":"countdown","durationMs":60000}"#
    );
}
