# pomodoro 인계 패킷 — core

- 받는 세션: `claude --agent core-manager` (작업 모드: **보강**)
- 전반 설계: `doc/200_설계/architecture/pomodoro-02-design.md`(이 패킷과 어긋나면 02-design이 맞다). 현황 근거: `.claude/reports/core-survey-20260926-pomodoro.md`.
- 전략: `core-design-strategy`, `.claude/skills/rust-rules.md`, `.claude/rules/golden-principles.md`(Rust 파일 800줄·함수 50줄). **`unsafe` 없음**(필요 없다).

## 선행 조건

- 첫 계층이라 앞 계층의 완료 마커는 없다.
- **새 의존성 없음**: `std::time::{Duration, Instant}`, 기존 `serde`·`thiserror`만 쓴다. `Cargo.toml`·`tauri.conf.json`·`capabilities/`는 건드리지 않는다.
- 사용자 결정 U-1~U-8은 **권고안(02-design §5a)으로 작성**했다. core에 걸리는 것은 U-2(끄면 일시정지)·U-3(자동 시작 없음)·U-4(대기 시간 빼지 않음)·U-6(기본값)이다. 메인 세션이 다른 답을 받아 오면 §2 전이표나 §3 기본값만 바꾼다.

## 요구ID

PT-01(슬롯), PT-03·PT-05·PT-06·PT-09(타이머 상태), PT-04·PT-07·PT-08·PT-09(설정 필드), PT-10(에러 문구 원문 ko).

## 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src-tauri/src/assets/slot.rs` (현 518줄) | `SimpleSlot::PomoChar`·`PomoBubble` 변형, serde 이름 `"pomo_char"`·`"pomo_bubble"`, `file_key` 팔 2개, 모듈 `//!` 슬롯 목록. 테스트가 늘어 한도가 걱정되면 테스트만 `slot/tests.rs` 자식 파일로 뺀다(선택) |
| `src-tauri/src/timer/mod.rs` (**신규**) | 타이머 상태기계 `Timer`·`TimerStatus`·`TimerAction`·`TimerSnapshot`·`TimerError`, 단위 테스트 |
| `src-tauri/src/settings/timer.rs` (**신규**) | `TimerSettings`, `Default`, `validate`, `normalize`, 범위 상수, 단위 테스트 |
| `src-tauri/src/settings/mod.rs` (현 736줄) | `pub mod timer;`, `Settings`에 `pub timer: TimerSettings` 필드, `validate`에서 `timer::validate` 호출, `load`에서 `timer::normalize` 적용(idle 보정 옆). **늘어나는 줄은 20줄 이내로** 하고 나머지는 `timer.rs`에 둔다 |
| `src-tauri/src/lib.rs` | `pub mod timer;`, `AppState`에 `pub timer: Mutex<timer::Timer>` 필드와 초기화(`Timer::new()`). **`generate_handler!`는 건드리지 않는다**(bridge 패킷이 command를 만든 뒤 등록 — 선례 window.md §326 `reset_overlay_position`) |
| `src-tauri/tests/default_assets.rs` | 새 슬롯 2개가 내장 기본 목록·내보내기 목록에 **없다**는 단언(hair 선례 `:81-86`) |
| `src-tauri/examples/import_sample.rs` | 슬롯 목록 출력이 있으면 2개 추가(hair 선례 `:3,16`) |
| `doc/200_설계/core/timer.md` (**신규**, core-designer) | 모듈 목적, 공개 API, 상태 전이표(§2), 스레드 모델(잠금만, 스레드 없음), 에러, 테스트 계획, bridge 요구 명세(§5), 요구 추적(PT-xx) |
| `doc/200_설계/core/assets.md`·`settings.md` | 슬롯 표 2행, `timer` 필드·검증·load 보정 규칙·기본값 |

## 1. 슬롯 (`assets/slot.rs`, PT-01)

hair(CR-037)와 **똑같이** 추가한다. 분류(`is_canvas_layer` = 부정형이라 자동으로 캔버스 레이어)·검증·매니페스트·삭제·복원·내보내기 코드는 바꾸지 않는다(설계 D34 선례).

```rust
// SimpleSlot (slot.rs:22-56 근처, Hair 다음)
PomoChar,    // serde "pomo_char"   — 뽀모도 인물(두 번째 캐릭터), 캔버스 레이어, 선택, 내장 기본 없음 (CR-045)
PomoBubble,  // serde "pomo_bubble" — 뽀모도 말풍선, 캔버스 레이어, 선택, 내장 기본 없음 (CR-045)
// file_key: PomoChar => "pomo_char", PomoBubble => "pomo_bubble"
```

- `DEFAULT_ASSETS`(`defaults.rs:58-77`, 6장)에 **넣지 않는다**. 그래서 `restore_default`는 `asset.no_default`를 내고, 시딩·내보내기 대상도 아니다.
- 필수 판정은 core에 없다(ui 몫). 변경 없음.
- 주의(동작 변화 아님): 캔버스 레이어라 캔버스 크기 일치 검사와 캔버스 결정에 참여한다. 등록할 때 오버레이 리사이즈가 일어나는 것도 hair와 같다.

## 2. 타이머 상태기계 (`timer/mod.rs`, PT-03·05·06·09)

비유: 주방 타이머 하나를 모두가 같이 본다. 누르면 가고, 누르면 선다. 요리사가 자리를 비우면(쉬는중) 저절로 서고, 돌아오면 저절로 다시 간다. 단, 요리사가 **직접** 세운 것은 저절로 다시 가지 않는다.

```rust
//! 뽀모도 타이머(스톱워치) 상태 — 휘발(저장 안 함), 앱 전체에서 하나(AppState.timer).
//! 설계: doc/200_설계/core/timer.md, doc/200_설계/architecture/pomodoro-02-design.md §3.1. 요구 PT-03·05·06·09.
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimerStatus { Stopped, Running, Paused, RestPaused }   // JSON "stopped"|"running"|"paused"|"restPaused"

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimerAction { Start, Pause, Stop }                     // JSON "start"|"pause"|"stop"

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerSnapshot { pub status: TimerStatus, pub elapsed_ms: u64 }   // JSON { status, elapsedMs }

#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum TimerError {
    #[error("타이머가 꺼져 있습니다. 먼저 「타이머 사용」을 켜 주세요.")]
    Disabled,
}
impl TimerError { pub fn code(&self) -> &'static str { match self { Self::Disabled => "timer.disabled" } } }

#[derive(Debug)]
pub struct Timer { status: TimerStatus, accumulated: Duration, since: Option<Instant> }

impl Timer {
    /// Stopped · 0. 앱 시작 때 1회(경과는 저장하지 않는다 — PT-09, U-3: 자동 시작 없음)
    pub fn new() -> Self;
    /// 지금 경과와 상태. Running이면 accumulated + (now - since), 아니면 accumulated
    pub fn snapshot(&self, now: Instant) -> TimerSnapshot;
    /// 사용자 조작. enabled == false면 Err(Disabled), 상태 불변. Ok(true) = 상태나 경과 기준이 바뀜
    pub fn apply(&mut self, action: TimerAction, enabled: bool, now: Instant) -> Result<bool, TimerError>;
    /// 오버레이가 알린 쉬는중 진입(true)·해제(false). Ok 없음 — 항상 성공, 반환 = 바뀜 여부
    pub fn set_resting(&mut self, resting: bool, now: Instant) -> bool;
    /// 설정에서 타이머를 끔(enabled true→false). Running|RestPaused → Paused (U-2), 반환 = 바뀜 여부
    pub fn disable(&mut self, now: Instant) -> bool;
}
impl Default for Timer { fn default() -> Self { Self::new() } }
```

### 2.1 전이표 (정본 — 02-design §3.1과 같다)

| 현재 \ 입력 | `apply(Start)` | `apply(Pause)` | `apply(Stop)` | `set_resting(true)` | `set_resting(false)` | `disable()` |
|---|---|---|---|---|---|---|
| Stopped | Running(0부터) | — | — | — | — | — |
| Running | — | Paused | Stopped(0) | RestPaused | — | Paused |
| Paused | Running | — | Stopped(0) | — | — | — |
| RestPaused | Running | Paused | Stopped(0) | — | Running | Paused |

- `—` = 상태 불변, 반환 `false`(apply는 `Ok(false)`). 에러가 아니다.
- `apply`는 전이표보다 **먼저** `enabled`를 본다. `false`면 어떤 action이든 `Err(TimerError::Disabled)`다.
- Running으로 들어갈 때 `since = Some(now)`. Running에서 나갈 때 `accumulated += now - since`, `since = None`. Stopped로 가면 `accumulated = 0`.
- `elapsed_ms`는 `as_millis()`를 `u64`로 포화 변환한다(`u64::try_from(..).unwrap_or(u64::MAX)`, `unwrap`·`expect`·panic 금지).
- `now < since`가 될 수 없게 `Instant`만 쓴다. 방어로 `now.saturating_duration_since(since)`를 쓴다.

## 3. 타이머 설정 (`settings/timer.rs`, PT-04·07·08·09)

```rust
//! 뽀모도 타이머 표시 설정(영속). 경과·실행 상태는 여기 없다(timer 모듈, 휘발).
use serde::{Deserialize, Serialize};
use super::Point;   // 기존 Point(f64 x,y) — mouse.partPos와 같은 타입

pub const TEXT_POS_MAX_X: f64 = 900.0;   // 캔버스 최대 폭(확정사항 §3). assets에 같은 상수가 있으면 그것을 쓴다(의존 방향 확인)
pub const TEXT_POS_MAX_Y: f64 = 700.0;
pub const ROTATION_MIN: f64 = -180.0;  pub const ROTATION_MAX: f64 = 180.0;
pub const FONT_SIZE_MIN: f64 = 12.0;   pub const FONT_SIZE_MAX: f64 = 200.0;
pub const DEFAULT_COLOR: &str = "#333333";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]          // ← default 필수: 일부 필드만 있는 옛 파일이 형식 오류가 되지 않게
pub struct TimerSettings {
    pub enabled: bool,        // 기본 false
    pub text_pos: Point,      // 글자 상자 중심, 캔버스 좌표. 기본 (268, 403)
    pub rotation: f64,        // 도, 시계 방향 +. 기본 5
    pub font_size: f64,       // 캔버스 px. 기본 36
    pub color: String,        // "#rrggbb" 소문자. 기본 "#333333"
}
impl Default for TimerSettings { /* 위 기본값 — U-6 권고. 근거 주석: 참고 그림 뽀도모셉찬.png 말풍선 몸통 중심·기울기 눈대중(02-design §5) */ }

/// set_settings 검증 — 범위 밖·비유한수·색 형식 오류면 기존 SettingsError::Invalid(→ settings.invalid). 값을 고치지 않는다
pub fn validate(t: &TimerSettings) -> Result<(), SettingsError>;
/// load 보정 — 범위로 자르고, 비유한수는 그 필드 기본값, 색 형식 오류는 DEFAULT_COLOR, 색은 소문자로. 설정 전체를 기본값으로 되돌리지 않기 위해서다
pub fn normalize(t: TimerSettings) -> TimerSettings;
```

- `Settings`(`settings/mod.rs:136-155`)에 `pub timer: TimerSettings`를 넣는다. 컨테이너에 이미 `#[serde(default)]`가 있어 `timer`가 없는 옛 파일은 `TimerSettings::default()`가 된다. **버전 필드 추가 없음**(D19 유지).
- `validate`(`:222-238`)의 끝에서 `timer::validate(&s.timer)?`를 부른다. `load`(`:262-274`)에서는 idle 보정 옆에서 `s.timer = timer::normalize(s.timer)`를 한다.
- 색 검사는 정규식 크레이트 없이 한다. 길이 7, 첫 글자 `#`, 나머지 6글자 `is_ascii_hexdigit`.
- `set_settings`의 `keep_core_owned`(`window/placement.rs:259-264`)는 **바꾸지 않는다**. `timer`는 ui 소유 필드다.

## 4. AppState (`lib.rs`)

```rust
pub struct AppState {
    pub settings: Mutex<Settings>,
    pub hand_anchor: Mutex<Option<Point>>,
    pub timer: Mutex<timer::Timer>,     // 신규 — 휘발. 잠금은 짧게, emit은 잠금 밖(hand_anchor 패턴)
    pub paths: …,
}
// 초기화: timer: Mutex::new(timer::Timer::new())
```

- 잠금 순서 규칙(문서화): `settings`와 `timer` 잠금을 **동시에 쥐지 않는다**. `set_settings`의 끔 부수 효과는 설정 잠금을 푼 뒤 타이머 잠금을 잡는다(bridge 패킷에서 쓴다).

## 5. bridge 요구 명세 (이 패킷은 만들지 않는다 — bridge 패킷이 만든다)

| 항목 | 내용 |
|---|---|
| command | `get_timer() -> TimerSnapshot` · `control_timer(action: TimerAction) -> Result<TimerSnapshot, BridgeError>` · `set_resting(resting: bool) -> TimerSnapshot` |
| event | `timer://changed`(`TimerSnapshot`) — `apply`·`set_resting`·`disable`가 `true`를 돌려줬을 때만 |
| 부수 효과 | `set_settings`: 저장 전 값 `timer.enabled == true` && 저장 후 값 `false` → `Timer::disable(now)` → true면 `settings://changed`(와 손 기준점 이벤트) 뒤에 `timer://changed` |
| 에러 | `TimerError::Disabled` → `BridgeError { code: "timer.disabled", message }`(변환은 `src-tauri/src/error.rs` 한 곳) |

## 6. 수용 기준 (테스트 이름 = 권고, 모두 `cargo test` 통과)

`timer/mod.rs` 단위 테스트(`Instant`를 기준 시각 + `Duration`으로 만들어 주입, `sleep` 금지):

- `timer_new_is_stopped_zero`
- `start_runs_and_elapsed_grows` (Start 후 3초 → elapsed_ms 3000)
- `pause_freezes_elapsed` / `resume_after_pause_accumulates` (2초 + 멈춤 10초 + 3초 → 5000)
- `stop_resets_to_zero_from_running_paused_rest_paused`
- `resting_pauses_only_running` (Stopped·Paused에서 `set_resting(true)` → false, 상태 불변)
- `wake_resumes_only_rest_paused` / `user_pause_is_not_resumed_by_wake`
- `pause_during_rest_paused_becomes_user_paused` (RestPaused → Pause → `set_resting(false)` → 그대로 Paused)
- `start_from_rest_paused_runs`
- `disabled_rejects_all_actions` (3 action 모두 `Err(Disabled)`, `code() == "timer.disabled"`, 상태 불변)
- `disable_pauses_running_and_rest_paused` / `disable_is_noop_when_stopped_or_paused`
- `idempotent_inputs_return_false` (Running에 Start, Stopped에 Pause 등)
- `snapshot_serializes_camel_case` (`{"status":"restPaused","elapsedMs":…}`), `action_deserializes_lowercase`

`settings/timer.rs`·`settings/mod.rs`:

- `timer_settings_default_values` ((268,403)·5·36·"#333333"·false)
- `old_settings_without_timer_load_with_defaults` (timer 키 없는 JSON → 다른 필드 보존 + timer 기본값)
- `partial_timer_object_fills_defaults` (`{"timer":{"enabled":true}}` → 나머지 기본값)
- `out_of_range_timer_clamped_on_load` (rotation 999 → 180, fontSize 1 → 12, textPos (-5, 9999) → (0,700)) — **다른 설정 필드는 기본값으로 되돌아가지 않음**
- `invalid_color_falls_back_on_load` / `color_lowercased_on_load`
- `validate_rejects_out_of_range_timer` (각 범위 경계 밖 → Invalid, 경계값은 통과), `validate_rejects_bad_color`, `validate_rejects_non_finite`

`assets/slot.rs`·`tests/default_assets.rs`:

- `pomo_slots_serde_round_trip` (`"pomo_char"`·`"pomo_bubble"`), `pomo_slots_file_key`, `pomo_slots_are_canvas_layers`, `pomo_slots_have_no_builtin_default`(`has_default` false·`DEFAULT_ASSETS`에 없음)

공통: `cargo fmt --check` 통과, `cargo clippy -- -D warnings` 경고 0, `cargo check` exit 0. 새 파일 모두 800줄·함수 50줄 이내. `settings/mod.rs`는 800줄 미만 유지.

## 하지 말 것

- `src-tauri/src/bridge/**`·`src-tauri/src/error.rs`·`lib.rs`의 `generate_handler!`·`src/**`(TS)·`doc/200_설계/bridge/contract.md` 수정 금지(bridge·ui 패킷 몫).
- 매초 emit하는 스레드나 타이머 스레드를 만들지 않는다. core는 상태만 쥔다(02-design §0-3).
- 쉬는중(유휴) 판정 로직을 Rust에 만들지 않는다(TS 상태기계 한 곳 원칙).
- 경과 시간을 settings.json이나 다른 파일에 저장하지 않는다(PT-09).
- `TimerSettings`에서 `#[serde(default)]`를 빼지 않는다. `validate`에서 값을 몰래 고치지 않는다(보정은 `load`에서만).
- 새 크레이트(`regex`·`chrono`·`tokio` 직접 의존) 추가 금지.

## 완료 마커

- `src-tauri/src/timer/mod.rs`·`src-tauri/src/settings/timer.rs` 존재, `AppState.timer` 필드 존재.
- `cargo test` 전체 통과(테스트 수·PASS 수를 완료 보고에 적는다), clippy 경고 0, fmt 통과.
- `doc/200_설계/core/timer.md` 작성, `assets.md`·`settings.md` 동기화.
- 완료 보고에 **bridge 인계용 실물 시그니처**(위 §2·§3이 실제 코드와 다르게 된 점이 있으면 차이 목록)를 붙인다.
