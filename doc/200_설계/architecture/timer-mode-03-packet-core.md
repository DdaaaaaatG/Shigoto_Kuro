# timer-mode 인계 패킷 — core

- 선행 조건: 없음(첫 패킷). 사용자 결정 D-1~D-11은 권고안 기준이다. 결정이 다르면 아키텍트 세션에서 이 패킷을 먼저 고친다. 전반 설계: `doc/200_설계/architecture/timer-mode-02-design.md`.
- 요구ID: TM-01·02·03·04·05·06·08(저장소)·10·11·12·13(core 메시지).
- 작업 모드: 보강. 진입: `claude --agent core-manager`(core-designer → core-implementer).

## 1. 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src-tauri/src/settings/timer.rs` | `TimerMode` 신규, `TimerSettings`에 `mode`·`countdown_secs`·`alarm_volume`, 상수, `validate`·`normalize` 확장, 관대한 역직렬화 |
| `src-tauri/src/timer/mod.rs` | 모드·`finished`·`configure`·`tick`·`next_wake`·`with_config`, 스냅숏 필드 추가. 800줄을 넘으면 테스트를 `timer/tests.rs`로 뺀다 |
| `src-tauri/src/timer/driver.rs` **신규** | 마감 시각 스레드 + `TimerWaker` |
| `src-tauri/src/tray/mod.rs` | 동적 메뉴 `sync_timer_menu`, 타이머 메뉴 핸들러. 순수 보기 계산은 `tray/timer_menu.rs`로 분리 권장 |
| `src-tauri/src/assets/sound.rs` **신규** (+ `assets/mod.rs`에 `pub mod sound;`) | 알림음 검증·저장·조회·삭제 |
| `src-tauri/src/lib.rs` | `AppState.timer_waker`, 시작 시 `Timer::with_config`, 드라이버 스레드 기동, 깔때기 `publish_timer_change`, 트레이 첫 동기화 |
| 문서 | `doc/200_설계/core/timer.md`·`settings.md`·`tray.md`·`assets.md` |

## 2. 시그니처·타입

### 2.1 설정 (`settings/timer.rs`)

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]            // "stopwatch" | "countdown"
pub enum TimerMode { #[default] Stopwatch, Countdown }

pub const COUNTDOWN_SECS_MIN: u32 = 1;
pub const COUNTDOWN_SECS_MAX: u32 = 359_999;     // 99:59:59
pub const DEFAULT_COUNTDOWN_SECS: u32 = 1_500;   // 00:25:00 (D-2)
pub const ALARM_VOLUME_MAX: u32 = 100;
pub const DEFAULT_ALARM_VOLUME: u32 = 80;        // (D-10)

pub struct TimerSettings {          // #[serde(rename_all = "camelCase", default)] 유지
    pub enabled: bool,              // 의미: 스톱워치 또는 타이머 켜짐
    pub mode: TimerMode,            // 신규
    pub countdown_secs: u32,        // 신규, JSON "countdownSecs"
    pub alarm_volume: u32,          // 신규, JSON "alarmVolume", 0~100
    pub text_pos: Point, pub rotation: f64, pub font_size: f64, pub color: String,   // 불변
}
```

- 필드 순서는 직렬화 순서다. 기존 테스트 S-T12(직렬화 문자열 단언)는 새 필드를 넣어 갱신한다.
- **관대한 역직렬화(필수)**: `mode`에 알 수 없는 문자열이나 다른 타입이 오면 `Stopwatch`로 읽는다. `countdownSecs`·`alarmVolume`이 음수·소수·문자열이어도 `Format` 오류를 내지 않는다(음수·타입 오류 → 기본값, 소수 → 내림한 뒤 `normalize`). 구현 방식(`deserialize_with` 함수 등)은 재량이다.
- `validate`: `countdown_secs ∉ 1..=359_999` → `SettingsError::Invalid("타이머 시작 시간은 00:00:01 ~ 99:59:59 사이여야 합니다.")`, `alarm_volume > 100` → `Invalid("알림음 음량은 0 ~ 100 사이여야 합니다.")`.
- `normalize`: `countdown_secs == 0` → 1500, `> MAX` → MAX. `alarm_volume > 100` → 100. 바뀌면 기존 경고 로그 1줄에 포함한다.

### 2.2 타이머 (`timer/mod.rs`)

```rust
pub enum TimerStatus { Stopped, Running, Paused, RestPaused, Finished }   // "finished" 추가

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerSnapshot {
    pub status: TimerStatus,
    pub elapsed_ms: u64,
    pub mode: TimerMode,        // 신규 — crate::settings::timer::TimerMode
    pub duration_ms: u64,       // 신규 — 카운트다운: 이번 회차 시작 시간(active), 스톱워치: 0
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TimerConfig { pub mode: TimerMode, pub countdown: Duration }
impl TimerConfig { pub fn from_settings(t: &TimerSettings) -> Self }

pub const FINISHED_HOLD: Duration = Duration::from_secs(10);

impl Timer {
    pub fn new() -> Self;                                   // 불변: Stopwatch, countdown 1500초, stopped
    pub fn with_config(cfg: TimerConfig) -> Self;           // 신규: 앱 시작
    pub fn snapshot(&self, now: Instant) -> TimerSnapshot;  // 필드 추가
    pub fn apply(&mut self, action: TimerAction, enabled: bool, now: Instant) -> Result<bool, TimerError>; // 시그니처 불변
    pub fn set_resting(&mut self, resting: bool, now: Instant) -> bool;   // 불변, Countdown이면 항상 false
    pub fn disable(&mut self, now: Instant) -> bool;        // 불변 + Finished → Stopped
    pub fn configure(&mut self, cfg: TimerConfig, now: Instant) -> bool;  // 신규: 스냅숏이 바뀌면 true
    pub fn tick(&mut self, now: Instant) -> bool;           // 신규: 마감·끝남 만료 처리, 바뀌면 true
    pub fn next_wake(&self) -> Option<Instant>;             // 신규
    pub fn status(&self) -> TimerStatus;                    // 신규(트레이 보기용)
}
```

- 내부 필드 추가: `mode: TimerMode`, `configured: Duration`, `active: Duration`, `finished_until: Option<Instant>`.
- **`apply`·`set_resting`·`disable`·`snapshot`의 시그니처는 바꾸지 않는다.** 이 패킷 도중에도 `bridge/commands.rs`가 수정 없이 컴파일돼야 한다.
- `TimerError::Disabled` 메시지 변경: `"스톱워치나 타이머가 꺼져 있습니다. 먼저 둘 중 하나를 켜 주세요."`(code `timer.disabled` 불변).

### 2.3 마감 스레드 (`timer/driver.rs`)

```rust
/// 마감 스레드를 깨우는 손잡이. 복제 가능, Send + Sync.
#[derive(Clone)]
pub struct TimerWaker { /* mpsc::Sender<()> */ }
impl TimerWaker { pub fn wake(&self); }   // 실패(스레드 종료)는 무시

/// next_wake: 다음 마감(없으면 None) 조회. on_due: 마감 도달 시 호출(tick + 바뀌면 publish).
pub fn spawn(
    next_wake: impl Fn() -> Option<Instant> + Send + 'static,
    on_due: impl Fn() + Send + 'static,
) -> std::io::Result<TimerWaker>;
```

- 루프: `match next_wake() { Some(t) => rx.recv_timeout(t − now), None => rx.recv() }`. `Ok(())` → 다시 계산, `Timeout` → `on_due()` 후 다시 계산, `Disconnected` → 종료.
- 스레드 이름은 `timer-deadline`이다. 주기 깨움은 없다. `unsafe`도 없다.
- 콜백은 잠금을 쥔 채 호출하지 않는다(콜백 안에서 잠근다).

### 2.4 알림음 저장소 (`assets/sound.rs`)

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AlarmFormat { Wav, Mp3, Ogg }

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlarmSound { pub format: AlarmFormat, pub bytes: u64, pub url: String }

pub const ALARM_MAX_BYTES: u64 = super::ASSET_MAX_BYTES;   // 1 MiB

pub fn detect_format(bytes: &[u8]) -> Option<AlarmFormat>;
pub fn alarm_file_name(f: AlarmFormat) -> &'static str;     // "alarm.wav" | "alarm.mp3" | "alarm.ogg"
pub fn current(assets_dir: &Path) -> Result<Option<AlarmSound>, SoundError>;
pub fn import(assets_dir: &Path, src: &Path) -> Result<AlarmSound, SoundError>;
pub fn remove(assets_dir: &Path) -> Result<(), SoundError>;   // 멱등

#[derive(Debug, thiserror::Error)]
pub enum SoundError {
    #[error("wav·mp3·ogg 소리 파일이 아닙니다.")] NotAudio,
    #[error("알림음 파일은 1MB 이하여야 합니다. (현재 {bytes}바이트)")] TooManyBytes { bytes: u64 },
    #[error("알림음 파일을 읽거나 쓰지 못했습니다: {0}")] Io(#[from] std::io::Error),
}
impl SoundError { pub fn code(&self) -> &'static str }   // "sound.not_audio" | "sound.too_many_bytes" | "sound.io"
```

- `import` 순서: `metadata(src).len() > 1MiB` → `TooManyBytes`(읽지 않음) → `read_capped(src, 1MiB)`(부모 모듈 private fn 재사용. `AssetError::TooManyBytes`/`Io` → `SoundError`로 변환) → `detect_format` → 없으면 `NotAudio` → `create_dir_all` → `settings::write_atomic(assets_dir/alarm_file_name(f), bytes)` → 다른 두 이름 삭제(`NotFound` 무시) → `AlarmSound { url: url::versioned_asset_url(&dest) }`.
- `detect_format` 규칙: 02-design §6.2 표 그대로(wav `RIFF…WAVE`, ogg `OggS`, mp3 `ID3` 또는 Layer III 프레임 동기).
- `current`: 세 이름 중 있는 파일, 여러 개면 수정 시각이 가장 늦은 것. `bytes` = 파일 크기. 파일 내용은 읽지 않는다. 없으면 `Ok(None)`.
- 경로는 항상 `alarm_file_name`으로 만든다. 사용자 경로의 이름·확장자는 쓰지 않는다(CR-047 SEC-002 규칙).

### 2.5 트레이 (`tray/mod.rs` + `tray/timer_menu.rs`)

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TrayTimerView { pub visible: bool, pub running: bool }
pub fn tray_timer_view(enabled: bool, status: TimerStatus) -> TrayTimerView;  // 순수 — visible=enabled, running=(status==Running)
pub fn sync_timer_menu(app: &AppHandle);   // 보기가 마지막과 같으면 아무것도 안 함. 실패는 경고 로그
```

- 메뉴 id: `timer_toggle`(라벨 `시작`/`일시정지`), `timer_stop`(라벨 `멈춤`). 배치는 02-design §7(D-11): 켜짐이면 맨 위 2개 + `PredefinedMenuItem::separator` + 기존 4개.
- 재구성: `app.tray_by_id("main")` → `set_menu(Some(new_menu))`. 마지막 보기는 모듈 안 `Mutex<Option<TrayTimerView>>`(또는 `OnceLock`)에 둔다.
- 핸들러: `timer_toggle` → (설정 잠금: `enabled` 복사·해제) → (타이머 잠금: `status == Running ? Pause : Start`로 `apply` → 스냅숏·해제) → 바뀌었으면 `crate::publish_timer_change(app, &snap)`. `timer_stop`도 같고 action은 `Stop`이다. `Err(Disabled)`(메뉴가 늦게 사라진 경합)는 경고 로그로 남긴다.
- 두 잠금을 동시에 쥐지 않는다(계약 §5.8-6).

### 2.6 조립 (`lib.rs`)

```rust
pub struct AppState { …, pub timer: Mutex<timer::Timer>, pub timer_waker: timer::driver::TimerWaker, … }

/// 모든 타이머 변경이 지나가는 깔때기. 바뀌었을 때만 부른다. 잠금 밖에서.
pub(crate) fn publish_timer_change(app: &AppHandle, snap: &timer::TimerSnapshot) {
    // ① bridge::events::emit_timer_changed(app, snap) — 실패는 경고
    // ② tray::sync_timer_menu(app)
    // ③ app.try_state::<AppState>() 있으면 timer_waker.wake()
}
```

- 시작: `Timer::with_config(TimerConfig::from_settings(&loaded.timer))`. 드라이버는 AppState를 만들기 전에 `spawn`한다. 콜백은 호출 때 `app.try_state::<AppState>()`로 찾는다(없으면 `next_wake` = `None`).
- `on_due` = 타이머 잠금 → `tick(Instant::now())` → 스냅숏 → 해제 → 바뀌었으면 `publish_timer_change`.
- 트레이 `init` 뒤 `sync_timer_menu(app)`를 1회 부른다(켜짐으로 저장돼 있으면 메뉴가 보인다).
- 새 command 등록(`generate_handler!`)은 bridge 패킷 몫이다. 이 패킷에서는 하지 않는다.

## 3. 동작 명세

- 전이표: 02-design §3.2(카운트다운)·§3.3(스톱워치)·§3.4(`configure` 순서). 요약:
  - 카운트다운 `running`: `elapsed = min(acc + (now − since), active)`. `next_wake = since + (active − acc)`.
  - `tick(now)`: 카운트다운 `running`이고 `now ≥ deadline`이면 → `Finished`(acc = active, since = None, `finished_until = now + 10초`), true. `Finished`이고 `now ≥ finished_until`이면 → `Stopped`(active = configured), true. 그 밖은 false.
  - `apply(Start)` in `Finished` → 먼저 대기로 초기화(active = configured)한 뒤 `Running`. `apply(Stop)` in `Finished` → `Stopped`. `apply(Pause)` in `Finished` → false.
  - `set_resting`: `mode == Countdown`이면 false(상태 불변).
  - `disable`: `Finished` → `Stopped`(true). 그 밖은 기존 규칙.
  - `configure`: 모드가 바뀌면 새 모드의 `Stopped`로 초기화한다. 모드가 같고 `countdown`만 바뀌면 `configured`를 갱신한다. `Stopped`이면 `active`도 바꾼다. 반환값은 스냅숏(같은 `now`) 전후 비교다.
- `with_config` 초기 상태: `Stopped`, `active = configured = cfg.countdown`.
- 스톱워치 `snapshot.duration_ms` = 0, 카운트다운 = `active` ms.

## 4. 수용 기준 (cargo test 이름, 전부 신규 — 기존 T1~T17·S-T1~S-T12b는 유지·통과)

| 영역 | 테스트 |
|---|---|
| 설정 | `timer_mode_default_is_stopwatch`, `old_timer_enabled_true_reads_as_stopwatch`(TM-02, `{"timer":{"enabled":true}}`), `unknown_mode_falls_back_to_stopwatch`(설정 나머지 보존), `countdown_secs_validate_bounds`(0·1·359999·360000), `countdown_secs_normalize_on_load`(0→1500, 999999→359999, 음수·문자열 → 1500, 다른 필드 보존), `alarm_volume_validate_and_normalize`(101 거부·보정 100, 타입 오류 → 80), `timer_settings_new_fields_round_trip`, S-T12 직렬화 문자열 갱신 |
| 타이머 | `countdown_start_counts_down`, `countdown_pause_keeps_remaining`, `countdown_stop_returns_to_duration`, `countdown_ignores_resting`, `tick_before_deadline_is_noop`, `tick_at_deadline_finishes`(elapsed = D), `finished_holds_ten_seconds_then_stops`, `finished_measured_from_detection`(늦게 감지해도 10초), `start_during_finished_restarts_with_configured`, `stop_during_finished_stops`, `disable_finished_stops`, `disable_running_countdown_pauses`, `configure_mode_switch_resets`(양방향·`RestPaused`에서도), `configure_duration_updates_stopped_only`(running이면 다음 대기부터), `next_wake_values`(stopped None / countdown running deadline / finished until / stopwatch None), `with_config_starts_stopped_with_duration`, `snapshot_serializes_new_fields`(`{"status":"finished","elapsedMs":…,"mode":"countdown","durationMs":…}`), `stopwatch_behavior_unchanged`(기존 T 계열이 그대로 통과하면 충족) |
| 드라이버 | `driver_calls_on_due_at_deadline`(실제 스레드, 100ms 마감, 허용 오차 < 50ms), `driver_wake_recomputes`(None → wake 뒤 마감 설정 → 콜백), `driver_idle_never_calls_on_due`(None이면 300ms 동안 콜백 0), `driver_exits_when_waker_dropped` |
| 알림음 | `detect_wav`, `detect_ogg`, `detect_mp3_id3`, `detect_mp3_frame_sync`, `reject_adts_aac`, `reject_png_and_empty`, `import_too_large_rejected_before_read`(1MiB+1), `import_exact_limit_ok`, `import_writes_fixed_name_and_removes_others`(wav 등록 → mp3 등록 → alarm.wav 없음), `import_ignores_source_file_name`(원본 `evil..\x.mp3`여도 `alarm.mp3`), `current_none_when_empty`, `current_picks_latest_when_multiple`, `remove_is_idempotent`, `sound_error_codes` |
| 트레이(순수) | `tray_timer_view_hidden_when_disabled`, `tray_timer_view_running_label`(Running만 running=true, RestPaused·Finished는 false) |
| 품질 | `cargo fmt --check`·`cargo clippy -- -D warnings` 경고 0·`cargo test` 전부 PASS·`bridge/commands.rs` **무수정** 컴파일 |

수동 확인(tray.md §8.3에 추가): 스톱워치 켜기 → 트레이에 「시작」·「멈춤」 표시, 트레이 「시작」 → 라벨 「일시정지」, 끄기 → 두 항목 사라짐. 확인은 ui·bridge 패킷 뒤 verify에서 한다.

## 5. 하지 말 것

- `bridge/commands.rs`·`bridge/events.rs`·`bridge/types.rs`·`src/**`(TS)·`contract.md`·`tauri.conf.json`·`capabilities/`를 수정하지 않는다. `tauri.conf.json`은 메인 세션 몫이다.
- 새 크레이트를 추가하지 않는다(`std::sync::mpsc`·`std::thread`만 쓴다).
- 주기 스레드·주기 emit을 만들지 않는다. 마감 스레드는 할 일이 없으면 무기한 잔다.
- `AssetSlot`·매니페스트·PNG 경로에 소리를 섞지 않는다.
- `unsafe`를 쓰지 않는다.
- 쉬는중 판정을 core에 넣지 않는다(판정은 오버레이 상태기계).

## 6. 완료 마커

- `cargo test` 결과(테스트 수·PASS), `cargo clippy` 경고 0, `cargo fmt --check` exit 0.
- `doc/200_설계/core/timer.md`·`settings.md`·`tray.md`·`assets.md` 갱신(요구 추적표에 TM-xx).
- 완료 보고에 **「실물 시그니처 차이 목록」**(이 패킷과 다른 이름·타입이 있으면)을 적는다. bridge 패킷은 그것을 따른다.
- 알려진 과도 상태를 보고에 적는다: bridge 패킷 전까지 설정 창·오버레이 경로는 `publish_timer_change`를 거치지 않는다(트레이·마감 스레드만 거친다).
