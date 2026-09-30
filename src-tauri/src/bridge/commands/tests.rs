//! bridge command 핸들러 단위 테스트(계약 §5.7·§5.8·§5.9 「테스트」) — commands.rs 800줄 한계로 분리.
//!
//! [대상] tauri 의존 없는 do_* 순수 함수·핸들러 내부 로직. [unsafe] 없음.

use super::*;
use crate::assets::defaults::DEFAULT_ASSETS;
use crate::assets::{KbDownKind, PenDownKind};

/// 계약 §5.7 「테스트」 — 내장 기본이 없는 슬롯은 `asset.no_default`(매니페스트·파일 불변).
#[test]
fn do_restore_default_asset_rejects_slot_without_builtin() {
    let dir = tempfile::tempdir().expect("tempdir");
    let err = do_restore_default_asset(dir.path(), AssetSlot::Simple(SimpleSlot::MouseLeft))
        .expect_err("mouse_left has no builtin default");
    assert_eq!(err.code, "asset.no_default");
}

/// index ≥ 1인 kb_down·pen_down도 내장 기본이 없다(§3.1).
#[test]
fn do_restore_default_asset_rejects_kb_down_index_1() {
    let dir = tempfile::tempdir().expect("tempdir");
    let slot = AssetSlot::KbDown {
        kind: KbDownKind::KbDown,
        index: 1,
    };
    let err = do_restore_default_asset(dir.path(), slot).expect_err("index 1 has no builtin");
    assert_eq!(err.code, "asset.no_default");
}

/// 내장 기본이 있는 슬롯은 성공하고 매니페스트에 그 슬롯이 등록된다.
#[test]
fn do_restore_default_asset_succeeds_for_builtin_slot() {
    let dir = tempfile::tempdir().expect("tempdir");
    let manifest = do_restore_default_asset(dir.path(), AssetSlot::Simple(SimpleSlot::KbUp))
        .expect("kb_up has a builtin default");
    assert!(manifest
        .entries
        .iter()
        .any(|e| e.slot == AssetSlot::Simple(SimpleSlot::KbUp)));
}

/// pen_down index 0은 내장 기본이 있다(§3.1 파일 키 7개 중 하나, CR-038).
#[test]
fn do_restore_default_asset_succeeds_for_pen_down_zero() {
    let dir = tempfile::tempdir().expect("tempdir");
    let slot = AssetSlot::PenDown {
        kind: PenDownKind::PenDown,
        index: 0,
    };
    let manifest = do_restore_default_asset(dir.path(), slot).expect("pen_down_0 is builtin");
    assert!(manifest.entries.iter().any(|e| e.slot == slot));
}

/// 계약 §5.7 「테스트」 — 상대 경로는 `asset.export_dir`(아무것도 쓰지 않음).
#[test]
fn do_export_default_assets_rejects_relative_dir() {
    let err = do_export_default_assets("relative/dir", false).expect_err("relative path");
    assert_eq!(err.code, "asset.export_dir");
}

/// 없는 절대 경로도 `asset.export_dir`.
#[test]
fn do_export_default_assets_rejects_missing_absolute_dir() {
    let dir = tempfile::tempdir().expect("tempdir");
    let missing = dir.path().join("does-not-exist");
    let err =
        do_export_default_assets(missing.to_str().expect("utf8"), false).expect_err("missing dir");
    assert_eq!(err.code, "asset.export_dir");
}

/// 정상 경로는 DEFAULT_ASSETS 장수만큼 쓰고 written 이 채워진다(ExportReport 모양은 types.rs
/// 쪽 직렬화 테스트가 고정. CR-044 때는 6장 — hair 제외. CR-053에서 hair 재포함(7장), 0.4.0에서
/// hair 다시 제외해 6장으로 복귀).
#[test]
fn do_export_default_assets_writes_to_valid_dir() {
    let dir = tempfile::tempdir().expect("tempdir");
    let report =
        do_export_default_assets(dir.path().to_str().expect("utf8"), false).expect("export");
    assert_eq!(report.written.len(), DEFAULT_ASSETS.len());
    assert!(report.conflicts.is_empty());
    assert!(report.failed.is_empty());
}

// ─── 뽀모도 타이머 (계약 §5.8 「테스트」, CR-045) ────────────────────────

/// `get_timer` 핵심 로직 — 앱 시작 직후 = stopped·0(PT-09, 부수 효과 없음이라 순수 `Timer` 그대로).
#[test]
fn get_timer_initial_is_stopped_zero() {
    let timer = Timer::new();
    let snapshot = timer.snapshot(Instant::now());
    assert_eq!(snapshot.status, crate::timer::TimerStatus::Stopped);
    assert_eq!(snapshot.elapsed_ms, 0);
}

/// `enabled == false`면 어떤 action이든 `timer.disabled`, 상태 불변(emit 없음 — changed 계산 전에 거부).
#[test]
fn control_timer_rejects_when_disabled() {
    let mut timer = Timer::new();
    let now = Instant::now();
    for action in [TimerAction::Start, TimerAction::Pause, TimerAction::Stop] {
        let err = do_control_timer(&mut timer, false, action, now).expect_err("disabled");
        assert_eq!(err.code, "timer.disabled");
    }
    assert_eq!(
        timer.snapshot(now).status,
        crate::timer::TimerStatus::Stopped
    );
}

/// `start`(stopped→running)는 바뀜(`true`) — 핸들러는 이 값으로만 emit 여부를 정한다.
#[test]
fn control_timer_start_emits_changed_once() {
    let mut timer = Timer::new();
    let now = Instant::now();
    let (snapshot, changed) =
        do_control_timer(&mut timer, true, TimerAction::Start, now).expect("start");
    assert!(changed);
    assert_eq!(snapshot.status, crate::timer::TimerStatus::Running);
}

/// 전이표의 「—」(예: stopped에서 pause)는 에러가 아니라 변화 없음 — `changed == false`.
#[test]
fn control_timer_noop_does_not_emit() {
    let mut timer = Timer::new();
    let now = Instant::now();
    let (snapshot, changed) =
        do_control_timer(&mut timer, true, TimerAction::Pause, now).expect("noop");
    assert!(!changed);
    assert_eq!(snapshot.status, crate::timer::TimerStatus::Stopped);
}

/// `running` + `resting=true` → `restPaused`, 바뀜(`true`).
#[test]
fn set_resting_true_pauses_running_and_emits() {
    let mut timer = Timer::new();
    let now = Instant::now();
    do_control_timer(&mut timer, true, TimerAction::Start, now).expect("start");
    let (snapshot, changed) = do_set_resting(&mut timer, true, now);
    assert!(changed);
    assert_eq!(snapshot.status, crate::timer::TimerStatus::RestPaused);
}

/// `stopped`에서 `resting=true`는 변화 없음(멱등, emit 없음).
#[test]
fn set_resting_noop_when_stopped() {
    let mut timer = Timer::new();
    let now = Instant::now();
    let (snapshot, changed) = do_set_resting(&mut timer, true, now);
    assert!(!changed);
    assert_eq!(snapshot.status, crate::timer::TimerStatus::Stopped);
}

/// 계약 §5.3 6단계 판정용 — `enabled`만 다르고 나머지는 기본값(스톱워치·1500초).
fn timer_settings(enabled: bool) -> TimerSettings {
    TimerSettings {
        enabled,
        ..TimerSettings::default()
    }
}

/// `set_settings` 6단계(v0.23, v0.21까지의 「7단계」) — 켜짐→꺼짐이고 `running`이면 `disable`을
/// 불러 바뀜(`Some`)을 돌려준다. (emit이 `settings://changed` 뒤라는 순서는 `set_settings`
/// 본문에서 이 호출이 그 뒤에 있다는 코드 배치로 보장한다 — 이 테스트는 「바뀌면 emit」 판정
/// 값만 검증한다.)
#[test]
fn set_settings_disable_pauses_running_timer_and_emits_after_settings_changed() {
    let mut timer = Timer::new();
    let now = Instant::now();
    do_control_timer(&mut timer, true, TimerAction::Start, now).expect("start");
    let snapshot = do_timer_config_side_effect(
        &mut timer,
        &timer_settings(true),
        &timer_settings(false),
        now,
    );
    assert!(snapshot.is_some());
    assert_eq!(
        snapshot.expect("some").status,
        crate::timer::TimerStatus::Paused
    );
    assert_eq!(
        timer.snapshot(now).status,
        crate::timer::TimerStatus::Paused
    );
}

/// 켜기(false→true)는 `disable`을 부르지 않고, 모드·시작 시간도 그대로면 `configure`도
/// 변화 없음(U-2) — `None`, 타이머 상태 불변.
#[test]
fn set_settings_enable_does_not_change_timer() {
    let mut timer = Timer::new();
    let now = Instant::now();
    let snapshot = do_timer_config_side_effect(
        &mut timer,
        &timer_settings(false),
        &timer_settings(true),
        now,
    );
    assert!(snapshot.is_none());
    assert_eq!(
        timer.snapshot(now).status,
        crate::timer::TimerStatus::Stopped
    );
}

/// 이미 `stopped`·`paused`면 끔 부수 효과도 변화 없음(`disable`이 no-op이고 `configure`도
/// 같은 설정이라 변화 없음).
#[test]
fn set_settings_disable_is_noop_when_already_stopped() {
    let mut timer = Timer::new();
    let now = Instant::now();
    let snapshot = do_timer_config_side_effect(
        &mut timer,
        &timer_settings(true),
        &timer_settings(false),
        now,
    );
    assert!(snapshot.is_none());
}

// ─── 타이머 모드(v0.23, CR-048) ────────────────────────────────────────

/// TM-05 — 카운트다운 `stopped`에서 `start`는 `running`으로 바뀐다(`changed == true`).
#[test]
fn control_timer_countdown_start_changes() {
    let mut timer = Timer::with_config(TimerConfig {
        mode: crate::settings::timer::TimerMode::Countdown,
        countdown: std::time::Duration::from_secs(60),
    });
    let now = Instant::now();
    let (snapshot, changed) =
        do_control_timer(&mut timer, true, TimerAction::Start, now).expect("start");
    assert!(changed);
    assert_eq!(snapshot.status, crate::timer::TimerStatus::Running);
    assert_eq!(snapshot.mode, crate::settings::timer::TimerMode::Countdown);
}

/// TM-05 — 카운트다운이면 `set_resting`은 항상 변화 없음(쉬는중에도 계속 줄어든다, 🔒 103행).
#[test]
fn set_resting_countdown_noop() {
    let mut timer = Timer::with_config(TimerConfig {
        mode: crate::settings::timer::TimerMode::Countdown,
        countdown: std::time::Duration::from_secs(60),
    });
    let now = Instant::now();
    do_control_timer(&mut timer, true, TimerAction::Start, now).expect("start");
    let (snapshot, changed) = do_set_resting(&mut timer, true, now);
    assert!(!changed);
    assert_eq!(snapshot.status, crate::timer::TimerStatus::Running);
}

/// TM-01 — 모드가 바뀌면 새 모드의 `stopped`로 초기화한다(어느 상태에서든, D-4).
#[test]
fn set_settings_mode_switch_resets_timer() {
    let mut timer = Timer::new(); // 스톱워치, stopped
    let now = Instant::now();
    do_control_timer(&mut timer, true, TimerAction::Start, now).expect("start");
    let before = TimerSettings {
        enabled: true,
        mode: crate::settings::timer::TimerMode::Stopwatch,
        ..TimerSettings::default()
    };
    let after = TimerSettings {
        enabled: true,
        mode: crate::settings::timer::TimerMode::Countdown,
        ..TimerSettings::default()
    };
    let snapshot = do_timer_config_side_effect(&mut timer, &before, &after, now).expect("changed");
    assert_eq!(snapshot.status, crate::timer::TimerStatus::Stopped);
    assert_eq!(snapshot.mode, crate::settings::timer::TimerMode::Countdown);
}

/// TM-04 — 카운트다운 `stopped`에서 시작 시간만 바뀌면 곧바로 새 값으로 대기(스냅숏 바뀜).
#[test]
fn set_settings_duration_change_updates_stopped_countdown() {
    let mut timer = Timer::with_config(TimerConfig {
        mode: crate::settings::timer::TimerMode::Countdown,
        countdown: std::time::Duration::from_secs(60),
    });
    let now = Instant::now();
    let before = TimerSettings {
        enabled: true,
        mode: crate::settings::timer::TimerMode::Countdown,
        countdown_secs: 60,
        ..TimerSettings::default()
    };
    let after = TimerSettings {
        countdown_secs: 90,
        ..before.clone()
    };
    let snapshot = do_timer_config_side_effect(&mut timer, &before, &after, now).expect("changed");
    assert_eq!(snapshot.duration_ms, 90_000);
}

/// TM-04 — 흐르는 중(`running`)에 시작 시간만 바꾸면 스냅숏은 그대로(다음 대기부터, D-5) —
/// `configure`가 `false`를 돌려주므로 `changed == false`.
#[test]
fn set_settings_duration_change_running_no_snapshot_change() {
    let mut timer = Timer::with_config(TimerConfig {
        mode: crate::settings::timer::TimerMode::Countdown,
        countdown: std::time::Duration::from_secs(60),
    });
    let now = Instant::now();
    do_control_timer(&mut timer, true, TimerAction::Start, now).expect("start");
    let before = TimerSettings {
        enabled: true,
        mode: crate::settings::timer::TimerMode::Countdown,
        countdown_secs: 60,
        ..TimerSettings::default()
    };
    let after = TimerSettings {
        countdown_secs: 90,
        ..before.clone()
    };
    let snapshot = do_timer_config_side_effect(&mut timer, &before, &after, now);
    assert!(snapshot.is_none());
}

/// contract.md §3.9 JSON 직렬화 예시 고정 — 4필드(status·elapsedMs·mode·durationMs).
#[test]
fn timer_snapshot_json_shape() {
    let snapshot = TimerSnapshot {
        status: crate::timer::TimerStatus::Stopped,
        elapsed_ms: 0,
        mode: crate::settings::timer::TimerMode::Stopwatch,
        duration_ms: 0,
    };
    assert_eq!(
        serde_json::to_string(&snapshot).expect("ser"),
        r#"{"status":"stopped","elapsedMs":0,"mode":"stopwatch","durationMs":0}"#
    );
}

/// contract.md §3.3 v0.23 — `TimerSettings` 새 필드(mode·countdownSecs·alarmVolume) 왕복.
#[test]
fn timer_settings_json_roundtrip() {
    let settings = TimerSettings {
        enabled: true,
        mode: crate::settings::timer::TimerMode::Countdown,
        countdown_secs: 1500,
        alarm_volume: 80,
        ..TimerSettings::default()
    };
    let json = serde_json::to_string(&settings).expect("ser");
    assert!(json.contains(r#""mode":"countdown""#));
    assert!(json.contains(r#""countdownSecs":1500"#));
    assert!(json.contains(r#""alarmVolume":80"#));
    let back: TimerSettings = serde_json::from_str(&json).expect("de");
    assert_eq!(back, settings);
}

// ─── 알림음(v0.23, CR-048) ─────────────────────────────────────────────

/// TM-07 — 등록된 알림음이 없으면 `None`(폴더 자체가 없어도 오류가 아니다).
#[test]
fn get_alarm_sound_none_when_empty() {
    let dir = tempfile::tempdir().expect("tempdir");
    let assets_dir = dir.path().join("assets");
    let result = do_get_alarm_sound(&assets_dir).expect("ok");
    assert!(result.is_none());
}

/// TM-08 · TM-13 — 크기 초과는 형식 검사보다 먼저 `sound.too_many_bytes`, 오디오가 아니면
/// `sound.not_audio`.
#[test]
fn import_alarm_sound_error_codes() {
    let dir = tempfile::tempdir().expect("tempdir");
    let assets_dir = dir.path().join("assets");

    let too_big = dir.path().join("big.bin");
    std::fs::write(&too_big, vec![0u8; 1024 * 1024 + 1]).expect("write");
    let err =
        do_import_alarm_sound(&assets_dir, too_big.to_str().expect("utf8")).expect_err("too large");
    assert_eq!(err.code, "sound.too_many_bytes");

    let not_audio = dir.path().join("not-audio.bin");
    std::fs::write(&not_audio, b"not an audio file").expect("write");
    let err = do_import_alarm_sound(&assets_dir, not_audio.to_str().expect("utf8"))
        .expect_err("not audio");
    assert_eq!(err.code, "sound.not_audio");
}

/// TM-08 — 정상 등록은 버전 쿼리(`?v=`)가 붙은 asset URL을 돌려준다.
#[test]
fn import_alarm_sound_returns_versioned_url() {
    let dir = tempfile::tempdir().expect("tempdir");
    let assets_dir = dir.path().join("assets");
    let src = dir.path().join("alarm-src.wav");
    let mut bytes = b"RIFF".to_vec();
    bytes.extend_from_slice(&[0, 0, 0, 0]);
    bytes.extend_from_slice(b"WAVE");
    std::fs::write(&src, &bytes).expect("write");

    let sound = do_import_alarm_sound(&assets_dir, src.to_str().expect("utf8")).expect("ok");
    assert_eq!(sound.format, crate::assets::sound::AlarmFormat::Wav);
    assert!(sound.url.contains("?v="));
}

/// TM-08 — 등록 없이 불러도 성공(멱등).
#[test]
fn remove_alarm_sound_idempotent() {
    let dir = tempfile::tempdir().expect("tempdir");
    let assets_dir = dir.path().join("assets");
    do_remove_alarm_sound(&assets_dir).expect("first");
    do_remove_alarm_sound(&assets_dir).expect("second (idempotent)");
}

/// contract.md §3.10 JSON 직렬화 예시 고정.
#[test]
fn alarm_sound_json_shape() {
    let sound = AlarmSound {
        format: crate::assets::sound::AlarmFormat::Mp3,
        bytes: 312_004,
        url: "http://asset.localhost/x/assets/alarm.mp3?v=1758870000000".to_string(),
    };
    assert_eq!(
        serde_json::to_string(&sound).expect("ser"),
        r#"{"format":"mp3","bytes":312004,"url":"http://asset.localhost/x/assets/alarm.mp3?v=1758870000000"}"#
    );
}

/// contract.md §6.1 — `SoundError` → `BridgeError` code 변환.
#[test]
fn sound_error_to_bridge_error() {
    let err: BridgeError = crate::assets::sound::SoundError::NotAudio.into();
    assert_eq!(err.code, "sound.not_audio");
    let err: BridgeError = crate::assets::sound::SoundError::TooManyBytes { bytes: 9 }.into();
    assert_eq!(err.code, "sound.too_many_bytes");
    let err: BridgeError = crate::assets::sound::SoundError::Io(std::io::Error::other("x")).into();
    assert_eq!(err.code, "sound.io");
}

/// contract.md §5.10 「테스트」 — `ResetError::{Io, Seed, Settings(io)}` → `BridgeError.code`
/// = `reset.io`·`reset.seed`·`settings.io`이고 message에 tempdir 경로 문자열이 섞이지 않는다
/// (§6 「경로·OS 원문 없음」 — core `Display`에 `{0}`이 없다).
#[test]
fn reset_error_maps_to_bridge_codes() {
    let dir = tempfile::tempdir().expect("tempdir");
    let leak_probe = dir.path().to_string_lossy().into_owned();

    let io: BridgeError = data_reset::ResetError::Io(std::io::Error::other("x")).into();
    assert_eq!(io.code, "reset.io");
    assert!(!io.message.contains(&leak_probe));

    let seed: BridgeError = data_reset::ResetError::Seed.into();
    assert_eq!(seed.code, "reset.seed");
    assert!(!seed.message.contains(&leak_probe));

    let settings_io: BridgeError = data_reset::ResetError::Settings(
        crate::settings::SettingsError::Io(std::io::Error::other("x")),
    )
    .into();
    assert_eq!(settings_io.code, "settings.io");
    assert!(!settings_io.message.contains(&leak_probe));
}

/// contract.md §5.10 「호출 창 제한」·「테스트 추가 (v0.26, SEC-002)」 — `ensure_reset_caller`:
/// 정상 `"settings"` → `Ok`. 그 밖(오버레이·빈 문자열·대소문자·공백 차이)은 `reset.forbidden`이고
/// message에 입력 라벨 문자열이 섞이지 않는다.
#[test]
fn ensure_reset_caller_allows_settings_only() {
    assert!(ensure_reset_caller("settings").is_ok());

    for label in ["overlay", "", "Settings", "settings "] {
        let err = ensure_reset_caller(label).expect_err("설정 창이 아니면 거부해야 한다");
        assert_eq!(err.code, "reset.forbidden");
        assert_eq!(err.message, "전체 초기화는 설정 창에서만 할 수 있습니다.");
        if !label.is_empty() {
            assert!(!err.message.contains(label));
        }
    }
}

/// contract.md §5.11 「호출 창 제한 일반화」 — `ensure_settings_caller`: `"settings"` → `Ok`, 그 밖은
/// 넘긴 code·message로 거부하고 message에 입력 라벨이 섞이지 않는다.
#[test]
fn ensure_settings_caller_table() {
    assert!(ensure_settings_caller("settings", "x.forbidden", "거부").is_ok());

    for label in ["overlay", "", "Settings", "settings "] {
        let err = ensure_settings_caller(label, "x.forbidden", "거부")
            .expect_err("설정 창이 아니면 거부해야 한다");
        assert_eq!(err.code, "x.forbidden");
        assert_eq!(err.message, "거부");
        if !label.is_empty() {
            assert!(!err.message.contains(label));
        }
    }
}
