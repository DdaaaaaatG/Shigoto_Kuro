# timer 모듈 설계

- 상태: 확정(사용자) — CR-048 증분(§2.3·§3.5~§3.9·§4)은 인계 패킷 기준 확정(사용자 결정 D-1~D-11 권고안) · 최종 갱신: 2026-09-30(doc-sync)
- 변경이력:
  - 2026-09-30 (doc-sync — **설계 변경 아님, 소스가 정본**, 커밋 2be41ce 기준) 1·2차의 「소스 미적용」은 모두 소스에 반영됨을 확인했다: `timer/mod.rs`(`FINISHED_HOLD`:79·`with_config`:130·`disable`:224·`configure`:241·`tick`:259·`next_wake`:281·`status`:290), `timer/driver.rs`(`TimerWaker`:18·`spawn`:32), `lib.rs`(`AppState.timer_waker`, 깔때기 `publish_timer_change`:424), bridge 깔때기 경유(`bridge/commands/mod.rs:511-591`). §10 표의 TM-01·05·06·12 상태를 「소스 반영」으로, 「CR-048 과도 상태」 행을 해소로 바꿨다. 아래 1·2차 행의 「소스 미적용」은 당시 기록이라 그대로 둔다.
  - 2026-09-26 (2차, CR-048 타이머 모드 — 🔒 사용자 결정 D-1~D-11 권고안 확정(확정사항 CR-048 결정 줄), 정본 패킷 `doc/200_설계/architecture/timer-mode-03-packet-core.md`, 근거 `timer-mode-02-design.md` §3.1~§3.4·§10) **카운트다운 모드와 끝남(`Finished`) 상태 추가.** `TimerConfig`(모드·시작 시간)·`FINISHED_HOLD`(10초)·`with_config`·`configure`·`tick`·`next_wake`·`status` 신규, 스냅숏에 `mode`·`durationMs`. `apply`·`set_resting`·`disable`·`snapshot` 시그니처 불변(`bridge/commands.rs` 무수정 컴파일). 신규 `timer/driver.rs` — 마감 시각 스레드 `timer-deadline`(`TimerWaker`·`spawn`, 주기 깨움 없음, `std::sync::mpsc`만). `lib.rs` 조립: `AppState.timer_waker`, 깔때기 `publish_timer_change`, 시작 순서(§3.7). `TimerError::Disabled` 문구 변경(code 불변). 의존 추가 `timer → settings`(`TimerMode`·`TimerSettings`). **§2.3이 §2.1의 `TimerStatus`·`TimerSnapshot`·`TimerError` 문구·`Timer` 필드를, §3.5.2가 §3.3 `reset`·경과 규칙을, §4 머리말이 옛 「스레드 없음」을 대체한다**(옛 절은 스톱워치 기록으로 유지). 테스트는 §3.8(§8 증분), bridge 요구는 §3.9(§9 증분). **소스 미적용.**
  - 2026-09-26 (1차, CR-045 뽀모도 타이머, 🔒 사용자 결정 U-1~U-8 권고안 채택 — 확정사항 §6 CR-045 「결정」 줄, 패킷 `doc/200_설계/architecture/pomodoro-03-packet-core.md`, 근거 `pomodoro-02-design.md` §3.1) **신규 모듈 `src-tauri/src/timer/`** — 휘발 스톱워치 상태기계(`Timer`·`TimerStatus`·`TimerAction`·`TimerSnapshot`·`TimerError`), `AppState.timer: Mutex<Timer>`. 스레드·unsafe·새 의존성 없음. **소스 미적용.**
- 요구ID 표기: `PT-xx` = 뽀모도 아키텍처 요구(02-design §6 RTM 전용). 화면 요구ID(overlay R-33~, settings R-42~)는 ui-designer가 확정한다 — 확정되면 §1·§10에 병기(§11 확인 필요 T-C1).
- 상대 문서: [settings.md](settings.md) §3.8(`TimerSettings` — 영속 표시 설정, `enabled` 값의 출처) · [assets.md](assets.md) §3.13(슬롯 `pomo_char`·`pomo_bubble`) · 계약 `doc/200_설계/bridge/contract.md`(v0.21 예정, bridge-designer)

## 1. 목적

결론: timer는 앱 전체에 **하나뿐인 스톱워치의 상태(멈춤·흐름·사용자 일시정지·쉬는중 일시정지)와 누적 경과**를 메모리에만 쥔다. 시계를 매초 돌리지 않는다 — 상태가 바뀔 때 호출자가 스냅샷을 읽어 방송하고, 각 창이 받은 값에서 초를 센다.

비유: 주방 타이머 하나를 모두가 같이 본다. 누르면 가고, 누르면 선다. 요리사가 자리를 비우면(쉬는중) 저절로 서고, 돌아오면 저절로 다시 간다. 단, 요리사가 **직접** 세운 것은 저절로 다시 가지 않는다. 타이머는 "언제 출발했는지"와 "그전까지 쌓인 시간"만 적어 두므로, 누가 들여다볼 때 계산하면 된다.

| 요구ID | 내용(확정사항 §6 CR-045) | 이 모듈의 몫 |
|---|---|---|
| PT-03 | 0부터 올라가는 스톱워치, 꺼져도 글자는 보임(시간만 멈춤) | `Timer::snapshot` — `{ status, elapsedMs }`. 표기(`HH:MM:SS`)·표시 조건(U-1)은 ui |
| PT-04 | 타이머 on/off 토글 — 흐르는 중 끄면 일시정지(U-2) | `Timer::disable`. `enabled` 저장은 [settings.md](settings.md) §3.8, 부수 효과 연결은 bridge |
| PT-05 | 켜짐이면 시작·일시정지·멈춤. 멈춤 = 00:00:00 | `Timer::apply(action, enabled, now)` 전이표 §3.2, 꺼짐이면 `TimerError::Disabled` |
| PT-06 | 쉬는중 자동 일시정지, 입력 시 자동 재개, 사용자 일시정지는 재개 안 함. 쉬는중 진입 전 무입력 시간은 빼지 않음(U-4) | `Timer::set_resting` — `RestPaused`만 자동 재개. 쉬는중 **판정**은 ui 상태기계(여기 없음) |
| PT-09 | 재시작 시 항상 00:00:00(경과 비저장), 켜짐으로 저장돼 있어도 자동 시작 없음(U-3) | `Timer::new()` = `Stopped`·0, 파일 IO 없음 |
| PT-10 | 에러 문구(원문 ko, 3개 국어 사전은 ui) | `TimerError::Disabled` 한국어 메시지·`code() = "timer.disabled"` |

- 모듈 경계(스킬 §1): 타이머 상태는 저장하지 않는 런타임 상태라 `settings`(JSON 영속)에 속하지 않고, 창·트레이·에셋·훅과도 무관하다 → 새 모듈. PT-03·05·06·09로 역추적된다. 확정사항 §7 폴더 목록에 `timer/` 추가는 메인 세션 몫.
- 의존: `std::time::{Duration, Instant}`, `serde`, `thiserror`만. **다른 core 모듈을 참조하지 않는다**(`enabled`는 인자로 받는다). 다른 core 모듈도 timer를 참조하지 않는다 — 호출자는 bridge와 `lib.rs`(초기화)뿐. **(CR-048로 아래와 같이 바뀐다)**
- 의존(CR-048부터): 위에 더해 `std::sync::mpsc`·`std::thread`(`driver.rs`), **`crate::settings::timer::{TimerMode, TimerSettings}`**(`TimerConfig::from_settings` — 방향 `timer → settings`, settings는 timer를 모른다, §11 T-D13). `enabled`는 여전히 인자로 받는다. timer를 부르는 쪽은 bridge, `lib.rs`(조립·마감 콜백), **`tray`**(보기·조작, [tray.md](tray.md) §3.6).

CR-048 요구(아키텍처 ID `TM-xx`, 02-design §9 RTM — 화면 요구ID는 ui-designer가 정한다):

| 요구ID | 내용(확정사항 CR-048) | 이 모듈의 몫 |
|---|---|---|
| TM-01 | 「스톱워치 사용」·「타이머 사용」 상호배타, 둘 다 꺼짐 허용(D-1 A: `enabled` 유지 + `mode`) | `TimerConfig.mode`·`configure` — 모드가 바뀌면 새 모드의 `Stopped`(§3.5.3, D-4). 토글 조합 계산은 ui |
| TM-03 | 스톱워치 동작 불변 | 전이표 §3.2 그대로. `tick`·`next_wake`는 스톱워치에 아무 일도 안 함 |
| TM-04 | 시작 시간 지정(최대 99:59:59) — 흐르는 중 변경은 안전망 | `configure` — 대기일 때만 즉시, 그 밖은 다음 대기부터(§3.5.3, D-5). 범위는 [settings.md](settings.md) §3.10 |
| TM-05 | 카운트다운: 0까지 내려감, 일시정지·멈춤(멈춤 = 지정 시간), 쉬는중에도 계속 | 전이표 §3.5.1, `set_resting` no-op, 스냅숏 `durationMs` |
| TM-06 | 0 도달 → 끝남 10초(깜빡임) → 자동으로 지정 시간 대기 | `Finished`·`FINISHED_HOLD`·`tick`·`next_wake`(§3.5), 마감 스레드 `driver.rs`(§3.6), 깔때기 `publish_timer_change`(§3.7) |
| TM-11 | 트레이 시작·일시정지·멈춤(켜져 있을 때만) | `status()`(트레이 보기용). 메뉴·핸들러는 [tray.md](tray.md) §3.6 |
| TM-12 | CR-045 102행 결정의 모드별 적용(끄면 일시정지, 끝남 중 끄면 대기, 재시작 시 지정 시간 대기) | `disable`(`Finished → Stopped`), `with_config`(시작 = `Stopped`·`active = D`) |
| TM-13 | 문구(core 원문 ko) | `TimerError::Disabled` 새 문구(§6) |

## 2. 공개 API

모두 `src-tauri/src/timer/mod.rs`에 둔다(파일 1개, `lib.rs`에 `pub mod timer;`). 시간은 **인자 `now: Instant`로 주입**한다 — 호출자(bridge)가 `Instant::now()`를 넘기고, 테스트는 기준 시각 + `Duration`을 넘긴다(`window/placement.rs` 디바운스 선례).

### 2.1 타입 (🔒 이름·직렬화, 구현자가 그대로 옮길 것)

```rust
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

/// 타이머 상태. JSON "stopped" | "running" | "paused" | "restPaused".
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimerStatus {
    /// 멈춤. 앱 시작 직후와 「멈춤」 뒤. 경과 0.
    Stopped,
    /// 흐르는 중.
    Running,
    /// 사용자 일시정지 또는 타이머 끔. 자동 재개 없음.
    Paused,
    /// 쉬는중이라 자동 일시정지. 쉬는중이 풀리면 자동 재개.
    RestPaused,
}

/// 사용자 조작. JSON "start" | "pause" | "stop".
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimerAction {
    Start,
    Pause,
    Stop,
}

/// 조회 결과. JSON { "status": …, "elapsedMs": … }.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerSnapshot {
    pub status: TimerStatus,
    pub elapsed_ms: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum TimerError {
    #[error("타이머가 꺼져 있습니다. 먼저 「타이머 사용」을 켜 주세요.")]
    Disabled,
}

/// 휘발 스톱워치(저장 안 함). 앱 전체에서 하나(`AppState.timer`).
#[derive(Debug)]
pub struct Timer {
    status: TimerStatus,
    /// Running 이전까지 쌓인 경과(Running이 아닐 때는 이것이 곧 경과).
    accumulated: Duration,
    /// Running으로 들어간 시각. Running일 때만 Some.
    since: Option<Instant>,
}
```

### 2.2 함수

| 이름 | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `pub fn new() -> Self` (`impl Timer`) | — | `Stopped`, 경과 0, `since = None` | 없음 | PT-09 |
| `impl Default for Timer { fn default() -> Self { Self::new() } }` | — | `new()`와 같음(clippy `new_without_default` 대응) | 없음 | PT-09 |
| `pub fn snapshot(&self, now: Instant) -> TimerSnapshot` | 현재 시각 | `Running`이면 `accumulated + (now − since)`, 아니면 `accumulated`를 ms로 | 없음(포화 계산, §3.3) | PT-03 |
| `pub fn apply(&mut self, action: TimerAction, enabled: bool, now: Instant) -> Result<bool, TimerError>` | 조작, `settings.timer.enabled`, 현재 시각 | `Ok(true)` = 상태 또는 경과 기준이 바뀜, `Ok(false)` = 전이표 `—` | `enabled == false` → `Err(TimerError::Disabled)`(어떤 action이든, 상태 불변) | PT-05 |
| `pub fn set_resting(&mut self, resting: bool, now: Instant) -> bool` | 쉬는중 진입(true)·해제(false), 현재 시각 | 바뀜 여부 | 없음 — 항상 성공 | PT-06 |
| `pub fn disable(&mut self, now: Instant) -> bool` | 현재 시각 | 바뀜 여부. `Running`·`RestPaused` → `Paused` | 없음 | PT-04 |
| `pub fn code(&self) -> &'static str` (`impl TimerError`) | — | `Disabled => "timer.disabled"` | 없음 | PT-10 |

- `enable`(false→true) 함수는 **두지 않는다** — 켜도 상태가 바뀌지 않으므로(U-2) 할 일이 없다(스킬 §10).
- `Timer`의 필드는 비공개다. 밖에서는 `snapshot`으로만 읽는다.

### 2.3 CR-048 증분 — 모드·끝남·마감 (🔒 패킷 §2.2·§2.3, 이름·타입·직렬화 — 구현자가 그대로 옮길 것)

```rust
use crate::settings::timer::{TimerMode, TimerSettings};

/// 타이머 상태. JSON "stopped" | "running" | "paused" | "restPaused" | "finished".
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimerStatus {
    Stopped,
    Running,
    Paused,
    /// 스톱워치 전용. 카운트다운에서는 생기지 않는다.
    RestPaused,
    /// 카운트다운 전용(신규). 0 도달 뒤 FINISHED_HOLD 동안. 경과 = durationMs.
    Finished,
}

/// 조회 결과. JSON { "status", "elapsedMs", "mode", "durationMs" } — 필드 순서 = 직렬화 순서.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerSnapshot {
    pub status: TimerStatus,
    pub elapsed_ms: u64,
    /// 신규. ui는 스냅숏만 보고 그린다(설정 이벤트와의 도착 순서 무관).
    pub mode: TimerMode,
    /// 신규. 카운트다운 = 이번 회차 시작 시간(`active`) ms, 스톱워치 = 0.
    pub duration_ms: u64,
}

/// 설정에서 뽑은 타이머 구성(신규).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TimerConfig {
    pub mode: TimerMode,
    pub countdown: Duration,
}

impl TimerConfig {
    /// `mode = t.mode`, `countdown = Duration::from_secs(u64::from(t.countdown_secs))`.
    /// 범위 보장은 settings(`validate`·`normalize`) 몫 — 여기서는 검사하지 않는다.
    pub fn from_settings(t: &TimerSettings) -> Self;
}

/// 끝남 유지 시간 — 감지 시각부터 잰다(A-2).
pub const FINISHED_HOLD: Duration = Duration::from_secs(10);

#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum TimerError {
    #[error("스톱워치나 타이머가 꺼져 있습니다. 먼저 둘 중 하나를 켜 주세요.")]
    Disabled, // code "timer.disabled" 불변
}

#[derive(Debug)]
pub struct Timer {
    status: TimerStatus,
    accumulated: Duration,
    since: Option<Instant>,
    mode: TimerMode,                 // 신규
    configured: Duration,            // 신규 — 설정의 시작 시간
    active: Duration,                // 신규 — 이번 회차 시작 시간(대기로 돌아갈 때 configured로)
    finished_until: Option<Instant>, // 신규 — Finished일 때만 Some
}
```

| 이름 (`impl Timer`) | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `pub fn new() -> Self` | — | **의미 불변**: `with_config(TimerConfig { mode: Stopwatch, countdown: 1500초 })`와 같다 — `Stopped`·0·스톱워치 | 없음 | PT-09 |
| **`pub fn with_config(cfg: TimerConfig) -> Self`** | 구성 | `Stopped`, 경과 0, `mode = cfg.mode`, `active = configured = cfg.countdown` | 없음 | TM-12 |
| `pub fn snapshot(&self, now: Instant) -> TimerSnapshot` | 시각 | 필드 추가(§3.5.2) | 없음 | PT-03, TM-05 |
| `pub fn apply(&mut self, action: TimerAction, enabled: bool, now: Instant) -> Result<bool, TimerError>` | **시그니처 불변** | 카운트다운 칸 추가(§3.5.1) | `enabled == false` → `Disabled`(불변) | PT-05, TM-05·06 |
| `pub fn set_resting(&mut self, resting: bool, now: Instant) -> bool` | 불변 | `mode == Countdown`이면 항상 `false`(상태 불변) | 없음 | PT-06, TM-05 |
| `pub fn disable(&mut self, now: Instant) -> bool` | 불변 | 기존 + **`Finished → Stopped`(true)** | 없음 | PT-04, TM-12 |
| **`pub fn configure(&mut self, cfg: TimerConfig, now: Instant) -> bool`** | 구성, 시각 | 같은 `now`의 스냅숏 전후가 다르면 `true`(§3.5.3) | 없음 | TM-01, TM-04 |
| **`pub fn tick(&mut self, now: Instant) -> bool`** | 시각 | 마감 도달 → `Finished`, 끝남 만료 → `Stopped`. 바뀌면 `true` | 없음 | TM-06 |
| **`pub fn next_wake(&self) -> Option<Instant>`** | — | 카운트다운 `Running` = 마감 시각, `Finished` = `finished_until`, 그 밖 `None` | 없음 | TM-06 |
| **`pub fn status(&self) -> TimerStatus`** | — | 현재 상태(상태는 `apply`·`tick` 등으로만 바뀌므로 시각 불필요) | 없음 | TM-11 |

- `timer/mod.rs`에 `pub mod driver;`(§3.6). `TimerMode`는 timer에서 재노출하지 않는다(정의는 settings — 재노출 여부는 bridge 패킷 판단).
- `TimerAction`·`TimerError::code()`·`Default for Timer` 불변.

## 3. 내부 구조

| 파일 | 책임 | 예상 줄 수 |
|---|---|---|
| `src-tauri/src/timer/mod.rs` (신규) | 타입 5개, 전이, 단위 테스트 | 코드 ~130 + 테스트 ~200 ≈ 330(800 한계 안) |
| `src-tauri/src/lib.rs` (변경) | `pub mod timer;`, `AppState.timer` 필드·초기화, `//!` [계층] 목록에 `timer` 추가 | +4줄 |

### 3.1 `AppState` (lib.rs)

```rust
pub struct AppState {
    pub settings: Mutex<Settings>,
    /// 레이어 이동 모드 손 기준점 캐시(OV-R-14, 계약 v0.3). 없음/계산 실패는 `None`.
    pub hand_anchor: Mutex<Option<settings::Point>>,
    /// 뽀모도 스톱워치(CR-045, PT-03·05·06·09) — 휘발. 잠금은 짧게, emit은 잠금 밖.
    /// `settings`와 동시에 잠그지 않는다(§4).
    pub timer: Mutex<timer::Timer>,
    pub paths: AppPaths,
}
// setup(lib.rs:105 `app.manage(AppState { … })`): timer: Mutex::new(timer::Timer::new()),
```

- `generate_handler!`는 이 변경에서 건드리지 않는다(command는 bridge 패킷이 만든 뒤 등록 — §9, §11 확인 필요 T-C3).

### 3.2 전이표 (정본 — 02-design §3.1과 같다)

| 현재 \ 입력 | `apply(Start)` | `apply(Pause)` | `apply(Stop)` | `set_resting(true)` | `set_resting(false)` | `disable()` |
|---|---|---|---|---|---|---|
| Stopped | **Running**(0부터) | — | — | — | — | — |
| Running | — | **Paused** | **Stopped**(0) | **RestPaused** | — | **Paused** |
| Paused | **Running**(이어서) | — | **Stopped**(0) | — | — | — |
| RestPaused | **Running**(이어서) | **Paused** | **Stopped**(0) | — | **Running**(이어서) | **Paused** |

- `—` = 상태·경과 불변, 반환 `false`(`apply`는 `Ok(false)`). 에러가 아니다.
- `apply`는 전이표보다 **먼저** `enabled`를 본다. `false`면 action과 현재 상태에 관계없이 `Err(TimerError::Disabled)`이고 아무것도 바꾸지 않는다.
- 불변식: `enabled == false` ⇒ 상태는 `Stopped` 또는 `Paused`(bridge가 끔 전이 때 `disable`을 부르므로 성립). 그래서 `set_resting`은 `enabled`를 받지 않는다 — 끈 동안에는 전이표상 효과가 없다.
- 쉬는중 진입 전 무입력 대기 시간(기본 5분)은 경과에 **포함**된다(U-4) — `set_resting(true)`는 그 순간의 `now`로 멈출 뿐 되돌리지 않는다.
- `RestPaused`에서 `apply(Pause)` → `Paused`: 사용자 일시정지로 바뀌어 이후 `set_resting(false)`로 재개되지 않는다.

### 3.3 경과 계산 규칙 (비공개 도우미)

| 도우미 | 동작 |
|---|---|
| `fn run(&mut self, now: Instant)` | `status = Running`, `since = Some(now)`. `accumulated`는 그대로(Stopped에서 오면 이미 0) |
| `fn freeze(&mut self, next: TimerStatus, now: Instant)` | `since.take()`가 `Some(s)`면 `accumulated = accumulated.saturating_add(now.saturating_duration_since(s))`. `status = next` |
| `fn reset(&mut self)` | `*self = Self::new()` — Stopped·0·`since = None` |

- Running으로 들어갈 때 `run`, Running에서 나갈 때(`Paused`·`RestPaused`·`Stopped`) `freeze`, Stopped로 갈 때는 `reset`(freeze 불필요). `RestPaused → Paused`는 `since`가 이미 `None`이라 `status`만 바꾼다.
- `snapshot`: `Running`이면 `accumulated.saturating_add(now.saturating_duration_since(since))`, 아니면 `accumulated`. `elapsed_ms = u64::try_from(d.as_millis()).unwrap_or(u64::MAX)`.
- **패닉 경로 없음**: `Duration + Duration`(`+`, `+=`)은 넘치면 패닉하므로 쓰지 않고 `saturating_add`, `Instant − Instant`는 `saturating_duration_since`만 쓴다. `unwrap`·`expect`·`panic!`은 테스트 밖 금지.
- `Instant`(단조 시계)만 쓴다 — 시스템 시각 변경과 무관. `SystemTime` 사용 금지.
- 함수 길이: `apply`는 `enabled` 확인 뒤 `match (self.status, action)` 한 번 — 50줄 안. 넘으면 action별 비공개 메서드(`start`·`pause`·`stop`)로 나눈다.

### 3.4 `//!` 문서주석 (스킬 §11 — 설계 항목과 1:1)

```rust
//! 뽀모도 타이머(스톱워치) 상태 — 휘발(저장 안 함), 앱 전체에서 하나(`AppState.timer`).
//!
//! [목적] CR-045 PT-03·05·06·09 — 멈춤/흐름/사용자 일시정지/쉬는중 일시정지와 누적 경과.
//!        쉬는중 판정은 ui 상태기계(여기 없음), 표시 형식·주기 갱신도 ui.
//! [공개 API] `Timer`(`new`·`snapshot`·`apply`·`set_resting`·`disable`), `TimerStatus`,
//!        `TimerAction`, `TimerSnapshot`, `TimerError`(`code`).
//! [스레드] 없음. 호출자가 `Mutex`로 감싼다. 시각은 인자 `now: Instant`로 주입.
//! [unsafe] 없음.
//! [에러] `TimerError::Disabled`("timer.disabled") — 꺼져 있을 때 `apply`만.
//! [설정] 읽지 않는다. `enabled`는 호출자가 `settings.timer.enabled`를 인자로 넘긴다.
//! [테스트] 전이표 전 칸·경과 누적·직렬화(§8, doc/200_설계/core/timer.md).
```

### 3.5 CR-048 — 카운트다운·끝남 전이 (🔒 패킷 §3, 02-design §3.2~§3.4)

비유: 주방 타이머에 「거꾸로 세기」 다이얼이 생겼다. 돌려 둔 시간(`configured`)에서 내려가고, 0이 되면 10초 동안 깜빡이다가 다시 돌려 둔 시간으로 돌아간다. 타이머는 여전히 매초 돌지 않는다 — 「언제 0이 되는지」만 계산해 머리맡 알람 시계(마감 스레드, §3.6)에게 맡긴다.

#### 3.5.1 카운트다운 전이표 (`mode == Countdown`)

| 현재 \ 입력 | `apply(Start)` | `apply(Pause)` | `apply(Stop)` | `set_resting(±)` | `disable()` | `tick` 마감 도달 | `tick` 끝남 만료 |
|---|---|---|---|---|---|---|---|
| Stopped | **Running**(남은 = `active`) | — | — | — | — | — | — |
| Running | — | **Paused** | **Stopped** | — | **Paused**(남은 유지) | **Finished** | — |
| Paused | **Running**(이어서) | — | **Stopped** | — | — | — | — |
| Finished | **Running**(대기로 초기화한 뒤 새 회차, `active = configured`, D-7) | — | **Stopped** | — | **Stopped** | — | **Stopped** |

- `—` = 불변·`false`(`apply`는 `Ok(false)`). `enabled == false`면 기존처럼 전이표보다 먼저 `Err(Disabled)`.
- `RestPaused`는 카운트다운에서 생기지 않는다(`set_resting` no-op, 모드 전환은 `Stopped`로 초기화).
- **`Stopped`로 들어갈 때마다**: `accumulated = 0`, `since = None`, `finished_until = None`, `active = configured`.
- `tick(now)`:
  - 카운트다운 `Running`이고 `now ≥ deadline` → `Finished`: `accumulated = active`, `since = None`, `finished_until = now + FINISHED_HOLD`, `true`. 끝남 10초는 **감지 시각부터** 잰다(A-2) — 스레드가 늦게 깨거나 절전 복귀 뒤 한참 지나 감지해도 `Finished`를 거치고 온전히 10초다.
  - `Finished`이고 `now ≥ finished_until` → `Stopped`(위 규칙), `true`.
  - 그 밖(스톱워치 포함) → `false`.
- 마감 시각 `deadline = since + (active − accumulated)`(카운트다운 `Running`일 때만).

#### 3.5.2 경과·스냅숏 규칙 (§3.3 대체)

| 도우미(비공개) | 동작 |
|---|---|
| `fn elapsed_at(&self, now: Instant) -> Duration` | `accumulated.saturating_add(now.saturating_duration_since(since))`(Running일 때), 아니면 `accumulated`. **카운트다운이면 `min(…, active)`**. 스톱워치는 상한 없음 |
| `fn run(&mut self, now: Instant)` | 불변 |
| `fn freeze(&mut self, next: TimerStatus, now: Instant)` | `accumulated = elapsed_at(now)`, `since = None`, `status = next` — 마감 직후~`tick` 전(수 ms)에 일시정지·끔이 와도 남은 시간이 음수가 되지 않는다(남은 0으로 `Paused` → 다시 시작하면 마감이 즉시라 곧바로 `Finished`, §11 T-D9) |
| `fn reset(&mut self)` | **`*self = Self::new()` 폐기**(모드·시작 시간을 잃는다) → `status = Stopped`, `accumulated = 0`, `since = None`, `finished_until = None`, `active = configured`. `mode`·`configured` 유지(T-D10) |
| `fn finish(&mut self, now: Instant)` | `accumulated = active`, `since = None`, `finished_until = Some(now.checked_add(FINISHED_HOLD).unwrap_or(now))`, `status = Finished` |

- `snapshot(now)` = `{ status, elapsed_ms: ms(elapsed_at(now)), mode, duration_ms: 카운트다운 ? ms(active) : 0 }`. ms 변환은 기존 `u64::try_from(d.as_millis()).unwrap_or(u64::MAX)`.
- `deadline`은 `since.checked_add(active.saturating_sub(accumulated))`(넘치면 `None` → `next_wake = None`. 시작 시간 상한 99:59:59라 실제로 생기지 않는다). `Instant + Duration`의 `+` 연산자는 쓰지 않는다(패닉 경로 0, T-D6·T-D11).
- `apply`는 `match (self.status, action)` 한 번 유지. 새 칸: `(Finished, Start)` → `reset()` 후 `run(now)`, `(Finished, Stop)` → `reset()`. `(Stopped|Paused, Start)`의 `run`은 두 모드 공통. 50줄을 넘으면 action별 비공개 메서드로 나눈다(§3.3 규칙).
- `set_resting`: 첫 줄 `if self.mode == TimerMode::Countdown { return false; }`.
- `disable`: `Running | RestPaused` → `freeze(Paused, now)`(불변), **`Finished` → `reset()`·`true`**, 그 밖 `false`.
- `next_wake`: `(Countdown, Running)` → `deadline`, `Finished` → `finished_until`, 그 밖 `None`.

#### 3.5.3 `configure(cfg, now)` 판정 순서 (02-design §3.4)

1. `let before = self.snapshot(now);`
2. **모드가 바뀜**(`cfg.mode != self.mode`) → `mode = cfg.mode`, `configured = cfg.countdown`, `reset()` — 새 모드의 `Stopped`(D-4, 이전 모드 값 버림). `Running`·`Paused`·`RestPaused`·`Finished` 어디서든.
3. 모드가 같고 **시작 시간만 바뀜** → `configured = cfg.countdown`. `status == Stopped`이면 `active = configured`. `Running`·`Paused`·`Finished`는 다음 대기부터(ui가 입력을 잠근다 — D-5, core 규칙은 안전망).
4. `self.snapshot(now) != before`를 돌려준다. 스톱워치 `Stopped`에서 시작 시간만 바뀌면 `durationMs`가 0 그대로라 `false`.
- `enabled` 변화는 다루지 않는다. 끔은 `disable`이 먼저다(bridge 순서 `disable` → `configure`, 02-design §3.4-3).

#### 3.5.4 파일 구성

| 파일 | 변경 | 예상 줄 수 |
|---|---|---|
| `timer/mod.rs` | 타입·필드·전이 추가, `pub mod driver;`, `//!` 갱신(§3.5.5) | 코드 ~250 + 기존 테스트 ~310 + 신규 ~300 → **800 초과 예상 → 테스트를 `timer/tests.rs`(`#[cfg(test)] mod tests;`)로 옮긴다**(패킷 §2.2 조건) |
| `timer/driver.rs` (신규) | §3.6 | 코드 ~70 + 테스트 ~100 |
| `lib.rs` | §3.7 | +40 안팎 |

#### 3.5.5 `//!` 문서주석 갱신 (스킬 §11)

```rust
//! 스톱워치·카운트다운 타이머 상태 — 휘발(저장 안 함), 앱 전체에서 하나(`AppState.timer`).
//!
//! [목적] CR-045 PT-03·05·06·09 + CR-048 TM-01·05·06·12 — 모드(스톱워치·카운트다운), 멈춤/흐름/
//!        일시정지/쉬는중 일시정지(스톱워치)/끝남(카운트다운, 10초)과 경과. 쉬는중 판정·표시는 ui.
//! [공개 API] `Timer`(`new`·`with_config`·`snapshot`·`apply`·`set_resting`·`disable`·`configure`·
//!        `tick`·`next_wake`·`status`), `TimerConfig`, `FINISHED_HOLD`, `TimerStatus`, `TimerAction`,
//!        `TimerSnapshot`, `TimerError`(`code`), `driver`(마감 시각 스레드).
//! [스레드] `Timer`는 없음(호출자가 `Mutex`). 마감 스레드 `timer-deadline`은 driver.rs.
//! [unsafe] 없음.
//! [에러] `TimerError::Disabled`("timer.disabled") — 꺼져 있을 때 `apply`만. `driver::spawn`은 io.
//! [설정] `TimerConfig::from_settings`로 `timer.mode`·`countdownSecs`를 받는다. `enabled`는 인자.
//! [테스트] timer/tests.rs(전이표·경과·직렬화), driver.rs(실제 스레드) — doc/200_설계/core/timer.md §8·§3.8.
```

### 3.6 CR-048 — 마감 시각 스레드 `timer/driver.rs` (🔒 패킷 §2.3)

비유: 머리맡 알람 시계다. 다음에 울릴 시각이 있으면 그때까지 자고, 없으면 누가 깨울 때까지 잔다. 누가 버튼을 누르면(상태가 바뀌면) 깨워서 알람 시각을 다시 맞춘다.

```rust
use std::sync::mpsc::{self, RecvTimeoutError};
use std::time::Instant;

/// 마감 스레드를 깨우는 손잡이. 복제 가능, Send + Sync(std `mpsc::Sender`는 Rust 1.72부터 Sync).
#[derive(Clone)]
pub struct TimerWaker {
    tx: mpsc::Sender<()>,
}

impl TimerWaker {
    /// 다음 마감을 다시 계산하게 한다. 스레드가 끝났으면(수신 끊김) 조용히 무시.
    pub fn wake(&self) {
        let _ = self.tx.send(());
    }
}

/// next_wake: 다음 마감(없으면 None) 조회. on_due: 마감 도달 시 호출(tick + 바뀌면 publish).
pub fn spawn(
    next_wake: impl Fn() -> Option<Instant> + Send + 'static,
    on_due: impl Fn() + Send + 'static,
) -> std::io::Result<TimerWaker>;
```

루프(스레드 이름 `timer-deadline`, `std::thread::Builder::new().name(..).spawn` 실패 → `Err(io)`):

```rust
loop {
    let got = match next_wake() {
        Some(t) => rx.recv_timeout(t.saturating_duration_since(Instant::now())),
        None => rx.recv().map_err(|_| RecvTimeoutError::Disconnected),
    };
    match got {
        Ok(()) => {}                                  // 깨움 → 다시 계산
        Err(RecvTimeoutError::Timeout) => on_due(),   // 마감 → tick·publish 후 다시 계산
        Err(RecvTimeoutError::Disconnected) => break, // 모든 TimerWaker drop → 종료
    }
}
```

- **주기 깨움 없음.** 할 일이 없으면(`None`) `recv()`로 무기한 잔다(02-design §10 유휴 CPU).
- 드라이버는 잠금·Tauri를 모른다. 콜백은 잠금을 쥔 채 호출되지 않고, 콜백 **안에서** 잠그고 푼다. publish는 푼 뒤(§3.7).
- 이른 깸 안전: `on_due`의 `tick`이 `false`(아직 마감 전)면 다음 바퀴에서 같은 마감을 다시 기다린다. `wake()`가 여러 번 쌓여도 바퀴마다 다시 계산할 뿐이다.
- 바쁜 반복 없음: `next_wake` 콜백은 상태를 못 읽으면(`AppState` 없음·잠금 오염) `None` → 무기한 대기. 마감이 지났는데 `tick`이 상태를 못 바꾸는 경로는 없다(`now ≥ deadline` → 반드시 `Finished`, `now ≥ finished_until` → 반드시 `Stopped`).
- `unsafe` 없음, 새 크레이트 없음(`std::sync::mpsc`·`std::thread`만, 패킷 §5).

### 3.7 CR-048 — `lib.rs` 조립 (🔒 패킷 §2.6, lib.rs는 core 소관)

```rust
pub struct AppState {
    pub settings: Mutex<Settings>,
    pub hand_anchor: Mutex<Option<settings::Point>>,
    pub timer: Mutex<timer::Timer>,
    /// 마감 스레드 깨우기(CR-048 TM-06). `publish_timer_change`가 부른다.
    pub timer_waker: timer::driver::TimerWaker,
    pub paths: AppPaths,
}

/// 모든 타이머 변경이 지나가는 깔때기. 바뀌었을 때만, 잠금 밖에서 부른다.
pub(crate) fn publish_timer_change(app: &tauri::AppHandle, snap: &timer::TimerSnapshot) {
    // ① bridge::events::emit_timer_changed(app, snap) — 실패는 log::warn!
    // ② tray::sync_timer_menu(app)
    // ③ app.try_state::<AppState>()가 있으면 state.timer_waker.wake()
}
```

시작 순서(setup, 기존 단계에 끼움):

| 순서 | 동작 |
|---|---|
| 1 | 경로·설정(`settings`)·매니페스트·손 기준점(기존) |
| 1-a **신규** | `let timer_waker = timer::driver::spawn(<next_wake 콜백>, <on_due 콜백>)?;` — **`AppState`보다 먼저**. 콜백은 `AppHandle` 복제를 쥐고 부를 때마다 `app.try_state::<AppState>()`로 찾는다(없으면 `next_wake` = `None` → 무기한 대기) |
| 1-b | `app.manage(AppState { …, timer: Mutex::new(timer::Timer::with_config(timer::TimerConfig::from_settings(&settings.timer))), timer_waker, … })` — 재시작 = 지정 시간 대기(TM-12), 자동 시작 없음(U-3) |
| 2 | 창 생성(기존) |
| 3 | `tray::init(&handle)?;` 뒤 **`tray::sync_timer_menu(&handle);` 1회**(켜짐으로 저장돼 있으면 타이머 항목이 보인다) |
| 4~ | 훅·오버레이·자동 실행(기존) |

- `next_wake` 콜백 = `try_state` → `state.timer.lock().ok()?.next_wake()`(잠금은 이 한 줄).
- `on_due` 콜백 = 타이머 잠금 → `let now = Instant::now(); let changed = t.tick(now); let snap = t.snapshot(now);` → 해제 → `changed`면 `publish_timer_change(&app, &snap)`. 잠금 오염 → `log::warn!` 후 아무것도 안 함.
- 두 콜백은 lib.rs 비공개 함수로 뽑는다(setup 클로저 50줄 한계). 이름은 구현 재량. 드라이버 spawn 실패는 기존 `input-forwarder`처럼 `?`로 setup 실패.
- 새 command 등록(`generate_handler!`)은 **이 패킷에서 하지 않는다**(bridge 패킷 몫, §11 T-C3).

**알려진 과도 상태(패킷 §6, 02-design §11 R-4)**: bridge 패킷 전까지 설정 창·오버레이 경로(`control_timer`·`set_resting`·`set_settings` 끔 부수 효과)는 기존처럼 `events::emit_timer_changed`를 직접 부르고 **`publish_timer_change`를 거치지 않는다** → 그 경로의 변경은 마감 스레드를 깨우지 않고 트레이 메뉴도 갱신하지 않는다(예: 설정 창에서 카운트다운을 시작하면 0이 되어도 `Finished`로 가지 않는다). `configure`도 bridge 패킷 전에는 호출처가 없다(모드·시작 시간 변경은 앱 재시작 때 `with_config`로만 반영). 깔때기를 거치는 것은 **트레이 메뉴와 마감 스레드뿐**이다. 배포 전 두 패킷이 모두 끝나야 한다.

### 3.8 CR-048 테스트 (§8 증분 — 패킷 §4 이름 그대로)

위치: `timer/tests.rs`(§3.5.4), 드라이버는 `driver.rs` `#[cfg(test)] mod tests`. 기존 T1~T17은 유지·통과. **T15 갱신**: 리터럴에 `mode: TimerMode::Stopwatch, duration_ms: 0`, 기대 문자열 `{"status":"restPaused","elapsedMs":1234,"mode":"stopwatch","durationMs":0}`. `reset()` 변경 뒤에도 T5(`Stopped`·0)는 그대로 통과해야 한다. 도우미 `fn cd(secs: u64) -> Timer`(= `with_config(Countdown, secs)`). `sleep` 금지(드라이버 제외) — `t0 + Duration`을 주입한다.

| # | 이름 | 조건 | 기대 |
|---|---|---|---|
| C1 | `countdown_start_counts_down` | `cd(60)`, t0 Start, t0+3s 스냅숏 | `Ok(true)`, `{ Running, 3000, Countdown, 60000 }` |
| C2 | `countdown_pause_keeps_remaining` | t0 Start, +10s Pause, +100s 스냅숏 / 별도: +61s(마감 뒤·`tick` 전) Pause | `{ Paused, 10000 }` / `{ Paused, 60000 }`(상한 — T-D9) |
| C3 | `countdown_stop_returns_to_duration` | Running·Paused 각각 Stop | `Ok(true)`, `{ Stopped, 0, Countdown, 60000 }` |
| C4 | `countdown_ignores_resting` | Running에서 `set_resting(true)`·`(false)` | 둘 다 `false`, `Running`, 경과 계속 흐름 |
| C5 | `tick_before_deadline_is_noop` | `cd(60)` t0 Start, `tick(t0+59_999ms)` | `false`, `Running` |
| C6 | `tick_at_deadline_finishes` | `tick(t0+60s)` | `true`, `Finished`, elapsed 60000(= D), `next_wake == Some(t0+70s)` |
| C7 | `finished_holds_ten_seconds_then_stops` | 감지 시각 T에서 Finished → `tick(T+9_999ms)` → `tick(T+10s)` | `false`·Finished → `true`·`{ Stopped, 0, 60000 }` |
| C8 | `finished_measured_from_detection` | `cd(60)` t0 Start, `tick(t0+65s)`(5초 늦게 감지) | `Finished`, elapsed 60000, `next_wake == Some(t0+75s)` |
| C9 | `start_during_finished_restarts_with_configured` | Running 중 `configure(Countdown, 30s)`(active 60 유지) → 마감 → Finished → Start(T) | `Ok(true)`, T에서 `{ Running, 0, 30000 }` |
| C10 | `stop_during_finished_stops` | Finished에서 Stop | `Ok(true)`, `{ Stopped, 0, 60000 }` |
| C11 | `disable_finished_stops` | Finished에서 `disable` | `true`, `Stopped` |
| C12 | `disable_running_countdown_pauses` | Running +20s에서 `disable` | `true`, `{ Paused, 20000 }` |
| C13 | `configure_mode_switch_resets` | 스톱워치 Running → Countdown / 스톱워치 **RestPaused** → Countdown / 카운트다운 Running → Stopwatch / Finished → Stopwatch | 모두 `true`, `Stopped`, elapsed 0, 새 `mode`, `durationMs` = 카운트다운 cfg ms / 스톱워치 0 |
| C14 | `configure_duration_updates_stopped_only` | 카운트다운 Stopped 60→30 / Running 60→30 뒤 Stop / 같은 값 / 스톱워치 Stopped 시간만 변경 | `true`·30000 / `false`·60000 유지 → Stop 뒤 30000 / `false` / `false` |
| C15 | `next_wake_values` | Stopped / 카운트다운 Running(t0 시작) / Pause(+10s)·Start(+20s) 뒤 / Finished / 스톱워치 Running | `None` / `t0+60s` / `t0+70s` / `finished_until` / `None` |
| C16 | `with_config_starts_stopped_with_duration` | `with_config(Countdown, 1500s)` / `Timer::new()` | `{ Stopped, 0, Countdown, 1500000 }`·`next_wake None` / `{ Stopped, 0, Stopwatch, 0 }` |
| C17 | `snapshot_serializes_new_fields` | Finished 스냅숏 직렬화 | `{"status":"finished","elapsedMs":60000,"mode":"countdown","durationMs":60000}`(필드 순서 그대로) |
| C18 | `stopwatch_behavior_unchanged` | 기존 T1~T17이 그대로 통과 | 충족(별도 테스트 없음) |
| D1 | `driver_calls_on_due_at_deadline` | 실제 스레드. `next_wake` = 아직 안 불렸으면 `Some(t0+100ms)` 아니면 `None`, `on_due` = 도착 시각 기록·채널 알림 | 1회, 도착 − t0 ∈ [100ms, 150ms)(허용 오차 < 50ms, 02-design §10) |
| D2 | `driver_wake_recomputes` | 처음 `None` → 공유 값에 `now+50ms` 설정 → `wake()` | `on_due` 호출(1초 제한 안) |
| D3 | `driver_idle_never_calls_on_due` | `next_wake` 항상 `None`, 300ms 관찰 | 콜백 0회 |
| D4 | `driver_exits_when_waker_dropped` | 콜백이 `done_tx: mpsc::Sender<()>`를 붙잡게 하고 waker drop | `done_rx.recv_timeout(1s) == Err(Disconnected)`(스레드 종료 → 클로저 drop 증명) |

- 드라이버 공유 상태는 `Arc<Mutex<…>>`/`Arc<AtomicBool>` + 결과 채널. 대기는 `recv_timeout`으로 하고 `sleep`은 D3 관찰에만 쓴다.
- lib.rs 조립·깔때기는 Tauri 런타임이 필요해 자동 테스트하지 않는다 — 트레이 수동 확인([tray.md](tray.md) §8.3)과 verify에서 확인.
- 완료 기준(패킷 §4·§6): `cargo fmt --check` exit 0, `cargo clippy -- -D warnings` 경고 0, `cargo test` 전부 PASS, `bridge/commands.rs` 무수정 컴파일, 완료 보고에 「실물 시그니처 차이 목록」·과도 상태(§3.7).

### 3.9 CR-048 bridge 요구 명세 (§9 증분 — 계약 확정은 bridge-designer, bridge 패킷)

| 종류 | 이름 | 변경 | 빈도 | 실패 사유 |
|---|---|---|---|---|
| 타입 | `TimerStatus` | + `'finished'` | — | — |
| 타입 | `TimerSnapshot` | + `mode: TimerMode`(`'stopwatch' \| 'countdown'`), `durationMs: number`. Rust는 항상 보낸다(TS 선택 필드는 bridge 판단, 02-design §4) | — | — |
| event | `timer://changed` | 발신 지점 추가: 마감 스레드(`finished` 진입·10초 뒤 대기 복귀), 트레이 메뉴, `configure`. **모두 `crate::publish_timer_change` 경유** | 상태가 바뀔 때만. 카운트다운 1회당 조작 수 + 2 | — |
| command | `control_timer` | 시그니처 불변. 카운트다운 전이. 바뀌면 직접 emit 대신 `crate::publish_timer_change`(`pub(crate)`) | 클릭 | `timer.disabled`(문구 변경), `state.poisoned` |
| command | `set_resting` | 불변. 카운트다운이면 항상 변화 없음. 바뀌면 `publish_timer_change` | 분당 수 회 이하 | `state.poisoned` |
| 부수 효과 | `set_settings` 7단계 | 저장 성공 뒤: 끔이면 `disable(now)` → `configure(TimerConfig::from_settings(&new.timer), now)` → 둘 중 하나라도 `true`면 `publish_timer_change`(emit·트레이·깨움), 아니면 `tray::sync_timer_menu`만(켜고 끄기는 스냅숏이 그대로여도 메뉴를 바꾼다). `settings://changed`·손 기준점 이벤트 **뒤**. 설정·타이머 잠금 동시 보유 금지 | 설정 저장당 | — |
| 규칙 | 계약 §5.8-1 | 「타이머 스레드를 만들지 않는다」 → 「core 마감 시각 스레드 1개, 다음 마감까지 잔다, 주기 emit 금지」 | — | — |
| 에러 문구 | `timer.disabled` | code 불변, 문구만 §6 | — | — |

- 알림음 command(`get_alarm_sound`·`import_alarm_sound`·`remove_alarm_sound`)는 [assets.md](assets.md) §3.15.6.

## 4. 스레드·채널

결론(CR-048부터): core 마감 시각 스레드 **1개**(`timer-deadline`)를 둔다. 다음 마감까지 자고, 할 일이 없으면 무기한 잔다. 주기 emit은 없다. `Timer` 함수 자체는 여전히 호출자 스레드에서 동기로 돌고 할당하지 않는다.

```
[timer-deadline 스레드]
 loop: next_wake() ─(콜백 안: try_state → timer.lock → next_wake → unlock)
        Some(t) → recv_timeout(t − now) ─ Timeout ─▶ on_due(): timer.lock → tick(now)·snapshot(now) → unlock
        None    → recv() (무기한)                        └ changed → publish_timer_change
        Ok(())  → 다시 계산                                            ① emit timer://changed
        Disconnected → 종료                                            ② tray::sync_timer_menu (메인 스레드로 넘김)
                                                                       ③ timer_waker.wake() → 다음 마감 재계산
[트레이 메뉴 — 메인 스레드]  timer_toggle / timer_stop
  settings.lock → enabled 복사 → unlock ─▶ timer.lock → apply → snapshot → unlock ─▶ changed → publish_timer_change

[Tauri command 스레드 — bridge 패킷 뒤]  control_timer / set_resting / set_settings 부수 효과(disable → configure)
  … → changed → publish_timer_change   (bridge 패킷 전 과도 상태: 기존 emit 직접 — §3.7)
```

- 채널: `mpsc::channel::<()>()` — 방향 `TimerWaker`(여러 스레드) → 마감 스레드(1). 값 없음(깨움 신호뿐).
- 마감 스레드가 `on_due` → publish ③으로 자기 자신을 깨워도 다음 바퀴가 곧바로 `Ok(())`로 다시 계산할 뿐 무해하다.
- 종료: 마감 스레드는 모든 `TimerWaker`가 drop되면 `Disconnected`로 끝난다. 앱 종료 때는 join하지 않는다(프로세스와 함께 끝남 — 저장할 것이 없다).

**command 경로(CR-045, 규칙 불변)**:

```
[Tauri command 스레드]                                    AppState
 get_timer / control_timer / set_resting ──lock(짧게)──▶ timer: Mutex<Timer>
        │   (settings.lock → enabled 복사 → unlock)            apply/set_resting/snapshot 한 줄
        │                                                      unlock
        └──▶ changed == true 이면 app.emit("timer://changed", snapshot)   ← 잠금 밖

 set_settings ──lock settings── 검증·저장 ── unlock ──▶ lock timer ── disable ── snapshot ── unlock
                                                        └──▶ settings://changed (…) 뒤에 timer://changed
```

- **잠금 순서 규칙**: `settings`와 `timer` 잠금을 **동시에 쥐지 않는다**. 필요한 값(`enabled`)은 복사해 잠금을 푼 뒤 타이머를 잠근다. emit·IO는 잠금 밖(`hand_anchor` 패턴).
- 종료 순서: 해당 없음(휘발 — 앱 종료 시 그냥 사라진다. 저장 안 함, PT-09).

## 5. unsafe

없음.

## 6. 에러 타입

| 변형 | 한국어 메시지 | `code()` | 원인 |
|---|---|---|---|
| `TimerError::Disabled` | ~~타이머가 꺼져 있습니다. 먼저 「타이머 사용」을 켜 주세요.~~ → **스톱워치나 타이머가 꺼져 있습니다. 먼저 둘 중 하나를 켜 주세요.**(CR-048 TM-13, 패킷 §2.2) | `timer.disabled`(불변) | `settings.timer.enabled == false`(= 스톱워치·타이머 둘 다 꺼짐)일 때 `apply`(시작·일시정지·멈춤). 트레이 메뉴가 늦게 사라진 경합 포함([tray.md](tray.md) §3.6.4) |
| (CR-048) `driver::spawn`의 `std::io::Error` | (사용자 노출 없음) | — | 마감 스레드 생성 실패 → lib.rs setup 실패(기존 `input-forwarder`와 같음). `configure`·`tick`·`next_wake`·`status`·`with_config`는 실패하지 않는다 |

- `#[source]` 없음(외부 원인 없는 규칙 위반).
- `set_resting`·`disable`·`snapshot`은 실패하지 않는다. 잠금 오염(`PoisonError`)은 bridge가 기존 방식대로 다룬다.
- bridge 변환(`From<TimerError> for BridgeError`, `code()`·`to_string()` 이관)은 `src-tauri/src/error.rs` 한 곳 — bridge 소관(§9).

## 7. 설정 의존

- **읽기**: 직접 읽지 않는다. 호출자가 `settings.timer.enabled`(bool, 기본 `false`, [settings.md](settings.md) §3.8)를 `apply`의 인자로 넘긴다.
- **쓰기**: 없음. 경과·상태는 어떤 파일에도 저장하지 않는다(PT-09).
- `idleSeconds`(쉬는중 진입 기준)는 ui 상태기계가 쓴다. timer는 모른다.
- **CR-048 읽기**: `timer.mode`(기본 `stopwatch`)·`timer.countdownSecs`(기본 1500, 1~359999)를 `TimerConfig::from_settings`로 받는다 — 시작 때 `lib.rs`(`with_config`), 설정 변경 때 bridge(`configure`, bridge 패킷). `timer.alarmVolume`은 읽지 않는다(재생은 ui). 쓰기는 여전히 없다 — 남은 시간도 저장하지 않는다(시작 시간만 settings에 저장).
- 범위 보장은 settings(`validate`·`normalize`, [settings.md](settings.md) §3.10). `from_settings`는 검사하지 않는다.

## 8. 테스트 계획

전부 `timer/mod.rs` `#[cfg(test)] mod tests` 단위 테스트. `sleep` 금지 — `let t0 = Instant::now();` 뒤 `t0 + Duration::from_secs(n)`을 `now`로 주입한다. 상태는 `snapshot(..).status`로 단언한다.

| # | 테스트 이름 | 조건 | 기대 |
|---|---|---|---|
| T1 | `timer_new_is_stopped_zero` | `Timer::new()`·`Timer::default()` 스냅샷(아무 `now`) | `{ Stopped, 0 }` 둘 다 |
| T2 | `start_runs_and_elapsed_grows` | t0 Start(enabled), t0+3s 스냅샷 | `Ok(true)`, `{ Running, 3000 }` |
| T3 | `pause_freezes_elapsed` | t0 Start, t0+2s Pause, t0+12s 스냅샷 | `{ Paused, 2000 }` |
| T4 | `resume_after_pause_accumulates` | t0 Start, +2s Pause, +12s Start, +15s 스냅샷 | `{ Running, 5000 }` |
| T5 | `stop_resets_to_zero_from_running_paused_rest_paused` | Running·Paused·RestPaused 각각에서 Stop | `Ok(true)`, `{ Stopped, 0 }` |
| T6 | `resting_pauses_only_running` | Running에서 `set_resting(true)` / Stopped·Paused에서 `set_resting(true)` | `true`·`RestPaused`·경과 고정 / `false`·상태 불변 |
| T7 | `wake_resumes_only_rest_paused` | t0 Start, +2s rest, +300s wake, +303s 스냅샷 | wake `true`, `{ Running, 5000 }`(쉬는 동안 경과 불변) |
| T8 | `user_pause_is_not_resumed_by_wake` | Paused에서 `set_resting(false)` | `false`, `Paused` |
| T9 | `pause_during_rest_paused_becomes_user_paused` | RestPaused → Pause → `set_resting(false)` | Pause `Ok(true)`·`Paused`, wake `false`·그대로 `Paused` |
| T10 | `start_from_rest_paused_runs` | RestPaused(경과 2000)에서 Start, +1s | `Ok(true)`, `{ Running, 3000 }` |
| T11 | `disabled_rejects_all_actions` | Stopped·Running 상태에서 Start·Pause·Stop을 `enabled=false`로 | 모두 `Err(TimerError::Disabled)`, `code() == "timer.disabled"`, 스냅샷 불변 |
| T12 | `disable_pauses_running_and_rest_paused` | Running·RestPaused에서 `disable` | `true`, `Paused`, 경과 고정. 이후 `set_resting(false)` → `false` |
| T13 | `disable_is_noop_when_stopped_or_paused` | Stopped·Paused에서 `disable` | `false`, 상태·경과 불변 |
| T14 | `idempotent_inputs_return_false` | Running에 Start, Stopped에 Pause·Stop, Paused에 Pause, Running에 `set_resting(false)` | 모두 `Ok(false)`/`false`, 스냅샷 불변(Running은 경과 기준 `since` 불변 — 같은 `now`의 스냅샷이 전후 같다) |
| T15 | `snapshot_serializes_camel_case` | `serde_json::to_string(&TimerSnapshot { status: RestPaused, elapsed_ms: 1234 })` | `{"status":"restPaused","elapsedMs":1234}`. 다른 세 상태 `"stopped"`·`"running"`·`"paused"` |
| T16 | `action_deserializes_lowercase` | `"start"`·`"pause"`·`"stop"` 역직렬화, `"Start"`·`"reset"` | 세 변형 / `Err` |
| T17 | `snapshot_before_since_is_saturated` | t0+10s Start, t0 스냅샷(`now < since`) | 패닉 없음, `{ Running, 0 }` |

- 통합(tempdir): 없음 — 파일 IO가 없다.
- 수동(verify 단계, 02-design §7): 스톱워치와 5분 비교(표시 오차 < 1초), 「오버레이 숨김 + 5분 무입력」 자동 일시정지 지연 실측.
- 완료 기준(스킬 §9): `cargo fmt --check`·`cargo clippy -- -D warnings` 경고 0·`cargo test` 전건 PASS·`cargo check` exit 0.

## 9. bridge 요구 명세 (계약 확정은 bridge-designer — 이 패킷에서 만들지 않는다)

| 종류 | 이름 후보 | 인자·페이로드 | 반환 | 빈도 | 실패 사유 |
|---|---|---|---|---|---|
| command | `get_timer` | 없음 | `TimerSnapshot`(`timer.lock()` → `snapshot(Instant::now())`) | 창 마운트 때 1회 | 잠금 오염만 |
| command | `control_timer` | `action: TimerAction`(`"start"\|"pause"\|"stop"`) | `TimerSnapshot` | 사용자 클릭 | `timer.disabled`(`TimerError::Disabled`), 잠금 오염 |
| command | `set_resting` | `resting: bool` | `TimerSnapshot` | 오버레이 `layer`가 rest로 들고 날 때 + 마운트 때 `false` 1회(분당 수 회 이하) | 잠금 오염만 |
| event | `timer://changed` | `TimerSnapshot` = `{ status, elapsedMs }` | — | `apply`·`set_resting`·`disable`가 `true`를 돌려줬을 때만(매초 0건) | — |

- `control_timer` 순서: `settings` 잠금 → `enabled = s.timer.enabled` 복사 → 해제 → `timer` 잠금 → `apply(action, enabled, now)` → `snapshot(now)` → 해제 → `Ok(true)`면 emit → 스냅샷 반환. 같은 `now`를 `apply`와 `snapshot`에 쓴다.
- `set_settings` 부수 효과: 저장 **성공 후** 이전 값 `timer.enabled == true` && 새 값 `false`이면 `timer` 잠금 → `disable(now)` → `snapshot(now)` → 해제 → `true`면 `settings://changed`(와 손 기준점 이벤트) **뒤에** `timer://changed`. 저장 실패면 `disable`을 부르지 않는다(불변식 §3.2 유지).
- 에러 변환: `From<TimerError> for BridgeError` — `code: e.code()`(`"timer.disabled"`), `message: e.to_string()`(`src-tauri/src/error.rs`, 기존 `AssetError`·`SettingsError` 변환과 같은 모양).
- TS 타입: `TimerStatus = 'stopped' | 'running' | 'paused' | 'restPaused'`, `TimerAction = 'start' | 'pause' | 'stop'`, `TimerSnapshot = { status: TimerStatus; elapsedMs: number }`(`u64` → `number`, 실사용 범위에서 2^53 미만).
- 이벤트에 창별 정보·이미지 바이트 없음. `app.emit` 브로드캐스트(기존 원칙).

## 10. 요구 추적표

| 요구 | 반영 절 | 상태 |
|---|---|---|
| PT-03 스톱워치 경과 0부터, 꺼져도 값 유지 | §2.2 `snapshot`, §3.2·§3.3 | ✅ 설계 |
| PT-04 끄면 일시정지(U-2), 다시 켜도 자동 재개 없음 | §2.2 `disable`, §3.2(enable 함수 없음) | ✅ 설계 |
| PT-05 시작·일시정지·멈춤, 멈춤 = 0, 꺼짐이면 거부 | §2.2 `apply`, §3.2 | ✅ 설계 |
| PT-06 쉬는중 자동 일시정지·재개, 사용자 일시정지 보존, 대기 시간 미차감(U-4) | §2.2 `set_resting`, §3.2 `RestPaused` | ✅ 설계 (쉬는중 판정은 ui) |
| PT-09 재시작 시 00:00:00, 자동 시작 없음(U-3), 경과 비저장 | §2.2 `new`, §4, §7 | ✅ 설계 |
| PT-10 에러 문구 원문 ko | §6 | ✅ 설계 (3개 국어는 ui) |
| 표시 형식·250ms 갱신·표시 조건(U-1) | — | 범위 밖(ui) |
| command·event 계약 | §9 | 범위 밖(bridge) |
| **TM-01 모드 전환 시 새 모드 대기(D-4)** | §2.3 `configure`, §3.5.3, §3.8 C13 | ✅ 설계 · 소스 반영 |
| **TM-03 스톱워치 동작 불변** | §3.2(불변), §3.8 C18 | ✅ 설계 |
| **TM-04(안전망) 흐르는 중 시작 시간 변경은 다음 대기부터** | §3.5.3-3, §3.8 C9·C14 | ✅ 설계 (입력 잠금 D-5는 ui, 범위는 settings) |
| **TM-05 카운트다운 전이·멈춤 = 지정 시간·쉬는중에도 계속** | §3.5.1·§3.5.2, §3.8 C1~C4 | ✅ 설계 · 소스 반영 |
| **TM-06 0 도달 → 끝남 10초(감지 시각부터) → 대기, 마감 스레드·깔때기** | §3.5.1 `tick`, §3.6, §3.7, §4, §3.8 C5~C8·C15·D1~D4 | ✅ 설계 · 소스 반영 |
| **TM-11 트레이 보기용 `status`** | §2.3, [tray.md](tray.md) §3.6 | ✅ 설계 |
| **TM-12 끝남 중 끔 → 대기, 흐르는 중 끔 → 일시정지, 재시작 = 지정 시간 대기** | §2.3 `disable`·`with_config`, §3.7 1-b, §3.8 C11·C12·C16 | ✅ 설계 · 소스 반영 |
| **TM-13 `timer.disabled` 새 문구(원문 ko)** | §6 | ✅ 설계 (3개 국어는 ui) |
| CR-048 과도 상태 — bridge 패킷 전 설정 창·오버레이 경로는 깔때기 미경유 | §3.7 | ✅ 해소 — bridge가 깔때기 `crate::publish_timer_change`를 경유한다(`bridge/commands/mod.rs:511-591`, 안 바뀌면 `tray::sync_timer_menu`만) |

## 11. 설계 결정 노트

### CR-048 결정 (2026-09-26)

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| T-D9 | `freeze`도 `elapsed_at`(카운트다운 상한 `active`)을 쓴다 | 상한은 `snapshot`만 | 마감~`tick` 사이(수 ms)에 일시정지·끔이 와도 남은 시간 음수·영구 미완료가 없다. 다시 시작하면 마감이 즉시라 곧바로 `Finished`(알림음) |
| T-D10 | `reset()`이 `mode`·`configured`를 유지(`*self = Self::new()` 폐기) | 그대로 | `new()`는 스톱워치 기본값이라 멈출 때마다 카운트다운 설정을 잃는다 |
| T-D11 | `Instant` 덧셈은 `checked_add`만 | `+` | 패닉 경로 0(T-D6 연장) |
| T-D12 | 마감 스레드는 잠금·Tauri를 모르고 콜백 2개만 받는다(패킷 §2.3) | 드라이버가 `AppState` 직접 참조 | Tauri 없이 실제 스레드 테스트(D1~D4)가 된다. 잠금 쥔 채 콜백 금지가 구조로 보장된다 |
| T-D13 | `TimerMode`는 settings에 정의, `timer → settings` 참조(패킷 §2.1·§2.2) | timer에 정의하고 settings가 참조 | 저장 스키마 타입은 settings 소유. 방향이 한쪽뿐이라 순환 없음. T-D3(「다른 core 모듈 비참조」)은 이 타입과 `from_settings`만큼 완화 |

확인 필요 — CR-048:

- **T-C5 (판단 필요 — 계층 경계)** `src-tauri/src/bridge/types.rs:113-120` 테스트 `v0_21_types_are_reexported`가 `TimerSnapshot { status, elapsed_ms }` 리터럴과 기대 문자열 `{"status":"stopped","elapsedMs":0}`을 쓴다 → 필드 2개 추가로 **`cargo test` 컴파일이 깨진다**(패킷 §4 「cargo test 전부 PASS」와 §5 「`bridge/types.rs` 수정 금지」가 충돌). `bridge/commands.rs`는 `TimerSnapshot` 리터럴이 없어 무수정 컴파일된다(§4 조건 충족). 선택지: (a) core 패킷에서 이 테스트 1건만 core-implementer가 고치도록 허용(리터럴에 `mode: TimerMode::Stopwatch, duration_ms: 0`, 기대 문자열 끝에 `,"mode":"stopwatch","durationMs":0`) (b) bridge-implementer가 core 구현 직후 같은 흐름에서 고친다. 권고 (a) — 기계적 1건, 계약 변경 아님.
- **T-C6** `tray::sync_timer_menu`를 메인 스레드로 넘기는 방식([tray.md](tray.md) §3.6.3)은 Tauri 2 `AppHandle::run_on_main_thread` 기준이다. 구현자는 `TrayIcon::set_menu`·메뉴 생성의 스레드 요구를 Tauri 소스로 확인하고 다르면 보고.
- **T-C7** 과도 상태(§3.7) — 배포 전 bridge 패킷 필수(02-design §11 R-4).
- T-C3 반복: 알림음 command 3개 등록도 `lib.rs`(core 소관) — bridge 패킷에서 등록 주체 확정.

파급 — CR-048 (Grep 2026-09-26):

| 파일 | 변경 | 담당 | 깨짐 여부 |
|---|---|---|---|
| `src-tauri/src/timer/mod.rs` | §2.3·§3.5, T15 리터럴 갱신 | core-implementer | — |
| `src-tauri/src/timer/driver.rs`·`timer/tests.rs` | 신규 | core-implementer | — |
| `src-tauri/src/lib.rs` | §3.7(`AppState` 리터럴은 setup 1곳) | core-implementer | — |
| `src-tauri/src/bridge/commands.rs` | 없음 — `Timer::new()`·`apply`·`set_resting`·`disable`·`snapshot`·`.status` 비교만(`:447-554`, 테스트 `:640-740`) | — | 안 깨짐 |
| `src-tauri/src/bridge/events.rs` `emit_timer_changed(&TimerSnapshot)` | 없음 | — | 안 깨짐(필드 추가만) |
| `src-tauri/src/bridge/types.rs` 테스트 `:113` | T-C5 | 판단 필요 | **깨짐(테스트 컴파일)** |
| `contract.md`, `src/bridge/types.ts` | §3.9 | bridge-designer·bridge-implementer | TS 선택 필드면 비파괴 |

### CR-045 결정 (기록)

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| T-D1 | 상태 소유자 = core 새 모듈 `timer`(휘발) | 오버레이(TS)가 소유 / settings에 둠 | 두 창이 같은 값을 봐야 하고 창 간 경로는 command → Rust 상태 → emit뿐(02-design §0-1). 저장하지 않는 값이라 settings 아님 |
| T-D2 | `now: Instant` 인자 주입 | 내부에서 `Instant::now()` | 시각을 주입하면 `sleep` 없이 전이·경과를 정확히 단위 테스트(placement.rs 선례) |
| T-D3 | `enabled`를 `apply` 인자로 받음 | timer가 settings 참조 / `Timer`에 `enabled` 복제 | 의존 0 유지, 진실의 원천(`settings.timer.enabled`) 하나 |
| T-D4 | 스레드·주기 emit 없음, 변화 시만 `true` 반환 | 1초 emit 스레드 | IPC 매초 0건(02-design §7). 창이 받은 값에서 초를 센다 |
| T-D5 | 누적(`accumulated`) + 출발 시각(`since`) 표현 | 시작 시각만 저장 후 일시정지 구간 목록 | 상태 3칸, 할당 없음, 일시정지 횟수와 무관한 O(1) |
| T-D6 | `saturating_add`·`saturating_duration_since`·`try_from(..).unwrap_or(u64::MAX)` | `+`·`-`·`as u64` | 패닉·잘림 경로 0(스킬 §5) |
| T-D7 | `enable` 함수 없음 | `enable()` 멱등 no-op | 켤 때 바뀌는 것이 없다(U-2) — 요구 없는 함수 금지 |
| T-D8 | `set_resting`은 `enabled`를 받지 않음 | 꺼짐이면 무시 인자 | 불변식(꺼짐 ⇒ Stopped/Paused)으로 전이표상 효과 없음. 인자 하나 줄임 |

확인 필요:

- **T-C1** 화면 요구ID(overlay R-33~, settings R-42~)가 ui-designer에서 확정되면 §1·§10에 병기. 현재 추적은 아키텍처 ID `PT-xx`.
- **T-C2** 경합: `control_timer`가 `enabled`를 복사해 잠금을 푼 사이 `set_settings`가 끄면(끔 → `disable` → 그 뒤 `apply(Start)`) 꺼진 채 Running이 될 수 있다. Tauri 2의 동기 command가 메인 스레드에서 차례로 돈다면 경합은 없다. bridge-designer가 command를 `async`로 만들거나 스레드 모델이 다르면, 「settings → timer 순서로 둘 다 잡기」(고정 순서라 교착 없음)로 바꿀지 판단한다 — 바꾸면 §4 잠금 규칙을 갱신한다.
- **T-C3** `lib.rs`의 `generate_handler!` 등록은 core 소관 파일이다 — 이전에 bridge-implementer가 이 파일 가드에 막힌 전례가 있다(contract.md:853). bridge 패킷에서 command 3개 등록 주체(core-implementer 후속 1줄 작업 여부)를 정한다.
- **T-C4** 확정사항 §7 폴더 구조의 `src-tauri/src/` 목록과 `core-design-strategy` §1 모듈 표(5종)에 `timer/`가 없다 — 메인 세션이 확정사항 §7을 갱신한다(02-design §8). 스킬 표 갱신은 사용자 판단.

파급(Grep 2026-09-26):

| 파일 | 변경 | 담당 | 깨짐 여부 |
|---|---|---|---|
| `src-tauri/src/timer/mod.rs` | 신규 | core-implementer | — |
| `src-tauri/src/lib.rs` | `pub mod timer;`, `AppState.timer` 필드·초기화(`lib.rs:46-51`, `:105-108`), `//!` [계층] | core-implementer | `AppState { … }` 리터럴은 setup 1곳뿐 — 필드 누락 시 컴파일 오류로 드러남 |
| `src-tauri/src/bridge/**`, `src-tauri/src/error.rs`, `contract.md`, `src/bridge/**` | §9 | bridge-designer·bridge-implementer | 이 패킷에서는 변경 없음 |
