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

use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

use crate::settings::timer::{TimerMode, TimerSettings, DEFAULT_COUNTDOWN_SECS};

pub mod driver;

/// 타이머 상태. JSON "stopped" | "running" | "paused" | "restPaused" | "finished".
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimerStatus {
    /// 멈춤. 앱 시작 직후와 「멈춤」 뒤. 경과 0.
    Stopped,
    /// 흐르는 중.
    Running,
    /// 사용자 일시정지 또는 타이머 끔. 자동 재개 없음.
    Paused,
    /// 스톱워치 전용. 쉬는중이라 자동 일시정지. 쉬는중이 풀리면 자동 재개. 카운트다운에서는
    /// 생기지 않는다(`set_resting`이 no-op).
    RestPaused,
    /// 카운트다운 전용. 0 도달 뒤 `FINISHED_HOLD` 동안. 경과 = `durationMs`.
    Finished,
}

/// 사용자 조작. JSON "start" | "pause" | "stop".
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimerAction {
    Start,
    Pause,
    Stop,
}

/// 조회 결과. JSON { "status", "elapsedMs", "mode", "durationMs" } — 필드 순서 = 직렬화 순서.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerSnapshot {
    pub status: TimerStatus,
    pub elapsed_ms: u64,
    /// ui는 스냅숏만 보고 그린다(설정 이벤트와의 도착 순서 무관).
    pub mode: TimerMode,
    /// 카운트다운 = 이번 회차 시작 시간(`active`) ms, 스톱워치 = 0.
    pub duration_ms: u64,
}

/// 설정에서 뽑은 타이머 구성.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TimerConfig {
    pub mode: TimerMode,
    pub countdown: Duration,
}

impl TimerConfig {
    /// `mode = t.mode`, `countdown = Duration::from_secs(u64::from(t.countdown_secs))`.
    /// 범위 보장은 settings(`validate`·`normalize`) 몫 — 여기서는 검사하지 않는다.
    pub fn from_settings(t: &TimerSettings) -> Self {
        Self {
            mode: t.mode,
            countdown: Duration::from_secs(u64::from(t.countdown_secs)),
        }
    }
}

/// 끝남 유지 시간 — 감지 시각부터 잰다(A-2).
pub const FINISHED_HOLD: Duration = Duration::from_secs(10);

#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum TimerError {
    #[error("스톱워치나 타이머가 꺼져 있습니다. 먼저 둘 중 하나를 켜 주세요.")]
    Disabled,
}

impl TimerError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Disabled => "timer.disabled",
        }
    }
}

/// 휘발 스톱워치·카운트다운 타이머(저장 안 함). 앱 전체에서 하나(`AppState.timer`).
#[derive(Debug)]
pub struct Timer {
    status: TimerStatus,
    /// Running 이전까지 쌓인 경과(Running이 아닐 때는 이것이 곧 경과, 카운트다운은 `active` 상한).
    accumulated: Duration,
    /// Running으로 들어간 시각. Running일 때만 Some.
    since: Option<Instant>,
    /// 스톱워치·카운트다운 중 어느 쪽인지.
    mode: TimerMode,
    /// 설정의 시작 시간(카운트다운). `configure`로 바뀐다.
    configured: Duration,
    /// 이번 회차 시작 시간. 대기(`Stopped`)로 돌아갈 때마다 `configured`로 되돌아간다.
    active: Duration,
    /// `Finished`일 때만 `Some` — 그 시각이 지나면 `tick`이 `Stopped`로 되돌린다.
    finished_until: Option<Instant>,
}

impl Default for Timer {
    fn default() -> Self {
        Self::new()
    }
}

impl Timer {
    /// **의미 불변**: `with_config(TimerConfig { mode: Stopwatch, countdown: 1500초 })`와 같다.
    pub fn new() -> Self {
        Self::with_config(TimerConfig {
            mode: TimerMode::Stopwatch,
            countdown: Duration::from_secs(u64::from(DEFAULT_COUNTDOWN_SECS)),
        })
    }

    /// `Stopped`, 경과 0, `mode = cfg.mode`, `active = configured = cfg.countdown`(TM-12 — 앱
    /// 시작·재시작은 항상 지정 시간 대기, 자동 시작 없음).
    pub fn with_config(cfg: TimerConfig) -> Self {
        Self {
            status: TimerStatus::Stopped,
            accumulated: Duration::ZERO,
            since: None,
            mode: cfg.mode,
            configured: cfg.countdown,
            active: cfg.countdown,
            finished_until: None,
        }
    }

    /// 현재 스냅샷. `Running`이면 경과에 흐른 시간을 더해 계산한다(패닉 없음, 포화 연산).
    /// 카운트다운은 `active`가 상한이다.
    pub fn snapshot(&self, now: Instant) -> TimerSnapshot {
        TimerSnapshot {
            status: self.status,
            elapsed_ms: to_ms(self.elapsed_at(now)),
            mode: self.mode,
            duration_ms: match self.mode {
                TimerMode::Countdown => to_ms(self.active),
                TimerMode::Stopwatch => 0,
            },
        }
    }

    /// 사용자 조작 적용. `enabled == false`면 어떤 조작이든 거부하고 상태를 바꾸지 않는다.
    /// 전이표: doc/200_설계/core/timer.md §3.2(스톱워치)·§3.5.1(카운트다운).
    pub fn apply(
        &mut self,
        action: TimerAction,
        enabled: bool,
        now: Instant,
    ) -> Result<bool, TimerError> {
        if !enabled {
            return Err(TimerError::Disabled);
        }
        // 상태별 세부 규칙은 도우미(run·freeze·reset)에 있다 — 여기는 어느 (상태, 조작)
        // 조합이 어느 도우미를 부르는지만 나열한다(§3.2 스톱워치·§3.5.1 카운트다운 전이표를
        // 상태 목록으로 묶어 50줄 한계 안에 둔다).
        let changed = match (self.status, action) {
            (
                TimerStatus::Stopped | TimerStatus::Paused | TimerStatus::RestPaused,
                TimerAction::Start,
            ) => {
                self.run(now);
                true
            }
            (TimerStatus::Running | TimerStatus::RestPaused, TimerAction::Pause) => {
                self.freeze(TimerStatus::Paused, now);
                true
            }
            (
                TimerStatus::Running
                | TimerStatus::Paused
                | TimerStatus::RestPaused
                | TimerStatus::Finished,
                TimerAction::Stop,
            ) => {
                self.reset();
                true
            }
            // Finished에서 Start는 대기로 초기화한 뒤 새 회차를 곧바로 시작한다(D-7).
            (TimerStatus::Finished, TimerAction::Start) => {
                self.reset();
                self.run(now);
                true
            }
            _ => false,
        };
        Ok(changed)
    }

    /// 쉬는중 진입(true)·해제(false). 카운트다운이면 항상 `false`(no-op, TM-05 — 쉬는중에도
    /// 계속 줄어듦). 스톱워치는 `Running`만 자동 일시정지, `RestPaused`만 자동 재개.
    pub fn set_resting(&mut self, resting: bool, now: Instant) -> bool {
        if self.mode == TimerMode::Countdown {
            return false;
        }
        match (self.status, resting) {
            (TimerStatus::Running, true) => {
                self.freeze(TimerStatus::RestPaused, now);
                true
            }
            (TimerStatus::RestPaused, false) => {
                self.run(now);
                true
            }
            _ => false,
        }
    }

    /// 타이머 끔(PT-04). `Running`·`RestPaused` → `Paused`(남은 시간 유지). `Finished` → `Stopped`
    /// (대기, TM-12 — 끝남 중 끄면 깜빡임·소리가 멈춘다).
    pub fn disable(&mut self, now: Instant) -> bool {
        match self.status {
            TimerStatus::Running | TimerStatus::RestPaused => {
                self.freeze(TimerStatus::Paused, now);
                true
            }
            TimerStatus::Finished => {
                self.reset();
                true
            }
            _ => false,
        }
    }

    /// 설정 변경 반영. 모드가 바뀌면 새 모드의 `Stopped`로 초기화(D-4, 이전 모드 값을 버린다).
    /// 모드가 같고 시작 시간만 바뀌면 `configured`를 갱신하고, `Stopped`이면 `active`도 즉시
    /// 바꾼다(그 밖은 다음 대기부터 — 안전망, ui가 입력을 잠근다, D-5). 스냅숏이 바뀌면 `true`.
    pub fn configure(&mut self, cfg: TimerConfig, now: Instant) -> bool {
        let before = self.snapshot(now);
        if cfg.mode != self.mode {
            self.mode = cfg.mode;
            self.configured = cfg.countdown;
            self.reset();
        } else if cfg.countdown != self.configured {
            self.configured = cfg.countdown;
            if self.status == TimerStatus::Stopped {
                self.active = self.configured;
            }
        }
        self.snapshot(now) != before
    }

    /// 마감 도달(`Running` 카운트다운, `now ≥ deadline`) → `Finished`. 끝남 만료(`Finished`,
    /// `now ≥ finished_until`) → `Stopped`. 그 밖(스톱워치 포함)은 `false`. 감지 시각부터 10초를
    /// 잰다(A-2) — 스레드가 늦게 깨도 깜빡임은 온전히 10초.
    pub fn tick(&mut self, now: Instant) -> bool {
        match self.status {
            TimerStatus::Running if self.mode == TimerMode::Countdown => match self.deadline() {
                Some(d) if now >= d => {
                    self.finish(now);
                    true
                }
                _ => false,
            },
            TimerStatus::Finished => match self.finished_until {
                Some(until) if now >= until => {
                    self.reset();
                    true
                }
                _ => false,
            },
            _ => false,
        }
    }

    /// 카운트다운 `Running` = 마감 시각, `Finished` = `finished_until`, 그 밖 `None`
    /// (스톱워치 전체 포함 — 스톱워치는 마감이 없다).
    pub fn next_wake(&self) -> Option<Instant> {
        match self.status {
            TimerStatus::Running if self.mode == TimerMode::Countdown => self.deadline(),
            TimerStatus::Finished => self.finished_until,
            _ => None,
        }
    }

    /// 트레이 보기용 현재 상태(상태는 `apply`·`tick` 등으로만 바뀌므로 시각이 필요 없다).
    pub fn status(&self) -> TimerStatus {
        self.status
    }

    fn run(&mut self, now: Instant) {
        self.status = TimerStatus::Running;
        self.since = Some(now);
    }

    /// 남은 시간이 음수가 되지 않도록 `elapsed_at`(카운트다운 상한 `active`)을 쓴다(T-D9) —
    /// 마감~`tick` 사이(수 ms)에 일시정지·끔이 와도 안전하다.
    fn freeze(&mut self, next: TimerStatus, now: Instant) {
        self.accumulated = self.elapsed_at(now);
        self.since = None;
        self.status = next;
    }

    /// `Stopped`로 되돌린다. `mode`·`configured`는 유지한다(T-D10 — `*self = Self::new()`를
    /// 쓰면 카운트다운 설정을 잃는다).
    fn reset(&mut self) {
        self.status = TimerStatus::Stopped;
        self.accumulated = Duration::ZERO;
        self.since = None;
        self.finished_until = None;
        self.active = self.configured;
    }

    fn finish(&mut self, now: Instant) {
        self.accumulated = self.active;
        self.since = None;
        self.finished_until = Some(now.checked_add(FINISHED_HOLD).unwrap_or(now));
        self.status = TimerStatus::Finished;
    }

    /// `Running`이면 `accumulated + (now − since)`, 아니면 `accumulated`. 카운트다운이면
    /// `active`가 상한(스톱워치는 상한 없음). `Instant` 뺄셈은 `saturating_duration_since`만 쓴다.
    fn elapsed_at(&self, now: Instant) -> Duration {
        let raw = match self.since {
            Some(s) => self
                .accumulated
                .saturating_add(now.saturating_duration_since(s)),
            None => self.accumulated,
        };
        if self.mode == TimerMode::Countdown {
            raw.min(self.active)
        } else {
            raw
        }
    }

    /// 카운트다운 `Running`일 때만 마감 시각. `checked_add`만 쓴다(T-D11, 패닉 경로 0) —
    /// 넘치면 `None`(시작 시간 상한 99:59:59라 실제로 생기지 않는다).
    fn deadline(&self) -> Option<Instant> {
        if self.mode != TimerMode::Countdown || self.status != TimerStatus::Running {
            return None;
        }
        let since = self.since?;
        since.checked_add(self.active.saturating_sub(self.accumulated))
    }
}

fn to_ms(d: Duration) -> u64 {
    u64::try_from(d.as_millis()).unwrap_or(u64::MAX)
}

#[cfg(test)]
mod tests;
