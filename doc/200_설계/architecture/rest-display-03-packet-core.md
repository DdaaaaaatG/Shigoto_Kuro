# rest-display 인계 패킷 — core

- 선행 조건: 없음(첫 패킷). 사용자 결정 D-1~D-5는 `rest-display-02-design.md` §5a 권고안 기준 — core에 걸리는 것은 D-3(끝남 중 쉬는중 = no-op)뿐이다. 결정이 다르면 아키텍트 세션에서 이 패킷을 먼저 고친다.
- 요구ID: RD-01·RD-02·RD-03·RD-04(core 몫) — 아키텍처 ID. core 요구 TM-05 개정(「쉬는중에도 계속」 → 「쉬는중 자동 일시정지·재개」, 🔒 2026-10-24).
- 작업 모드: 보강. 진입: `claude --agent core-manager`(core-designer 문서 → core-implementer 코드).
- 한 줄 요약: `Timer::set_resting`에서 카운트다운 조기 반환을 지워 두 모드가 같은 규칙을 쓰게 하고, 그 사실을 테스트·문서로 고정한다. 나머지 경로(`apply`·`disable`·`tick`·`next_wake`·`configure`·트레이 보기)는 이미 모드 무관이라 **코드를 바꾸지 않는다.**

## 1. 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src-tauri/src/timer/mod.rs` | `set_resting` 본문(모드 분기 삭제)·문서주석, `TimerStatus::RestPaused` 문서주석, 파일 머리 `//!` [목적] 줄 |
| `src-tauri/src/timer/tests.rs` | C4 개정(이름·기대 교체), C19~C23 신규. 지금 685줄 — 추가가 115줄을 넘으면 C19~C23을 `src-tauri/src/timer/rest_tests.rs`로 두고 `mod.rs` 끝에 `#[cfg(test)] mod rest_tests;`(800줄 한계) |
| `doc/200_설계/core/timer.md` | §4 참조 |
| 변경 없음(확인만) | `src-tauri/src/timer/driver.rs`, `src-tauri/src/tray/timer_menu.rs`(TV1·TV2 그대로 통과), `src-tauri/src/tray/mod.rs`, `src-tauri/src/lib.rs`(`publish_timer_change` 불변) |

## 2. 시그니처·타입 (전부 불변)

```rust
pub fn set_resting(&mut self, resting: bool, now: Instant) -> bool   // 시그니처 불변
pub enum TimerStatus { Stopped, Running, Paused, RestPaused, Finished } // 멤버·직렬화 불변
pub struct TimerSnapshot { status, elapsed_ms, mode, duration_ms }      // 모양·순서 불변
```

새 본문(정본 — 그대로 옮긴다):

```rust
/// 쉬는중 진입(true)·해제(false). 두 모드 공통(🔒 2026-10-24, rest-display RD-01·02 — TM-05 개정):
/// `Running`만 자동 일시정지(`RestPaused`, 남은·경과 고정), `RestPaused`만 자동 재개. 그 밖
/// (`Stopped`·`Paused`·`Finished`)은 `false`(사용자 일시정지 보존, 끝남 중 쉬는중 = 영향 없음 D-3).
pub fn set_resting(&mut self, resting: bool, now: Instant) -> bool {
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
```

주석 교체:

| 위치 | 옛 | 새 |
|---|---|---|
| `TimerStatus::RestPaused` 문서주석(32~33행) | 「스톱워치 전용. 쉬는중이라 자동 일시정지. 쉬는중이 풀리면 자동 재개. 카운트다운에서는 생기지 않는다(`set_resting`이 no-op).」 | 「쉬는중이라 자동 일시정지(스톱워치·카운트다운 공통, 🔒 2026-10-24). 쉬는중이 풀리면 자동 재개.」 |
| `//!` [목적](3~4행) | 「… 일시정지/쉬는중 일시정지(스톱워치)/끝남(카운트다운, 10초)과 경과 …」 | 「… 일시정지/쉬는중 일시정지(두 모드)/끝남(카운트다운, 10초)과 경과 …」 + 출처 표기에 「rest-display RD-01~04」 |

## 3. 동작 명세

전이표 정본 = `rest-display-02-design.md` §2.2(카운트다운). 요점:

1. 카운트다운 `Running` + `set_resting(true)` → `freeze(RestPaused, now)` — `accumulated = min(경과, active)`, `since = None`. `true`.
2. 카운트다운 `RestPaused` + `set_resting(false)` → `run(now)` — `since = Some(now)`. `true`. 마감 = `since + (active − accumulated)`.
3. `RestPaused`에서: `next_wake() = None`, `tick(_) = false`(마감 스레드는 깔때기 ③으로 깨어 다시 잠든다). `apply(Start)` → `Running`(이어서), `apply(Pause)` → `Paused`(이후 `set_resting(false)` 무시), `apply(Stop)` → `Stopped`(`active = configured`), `disable()` → `Paused`, `configure` 같은 모드·시작 시간만 변경 → `configured`만 갱신(`active`·상태 불변, `false`), 모드 변경 → 새 모드 `Stopped`. **전부 현행 코드 그대로 — 테스트로 고정만.**
4. `Stopped`·`Paused`·`Finished` + `set_resting(±)` → `false`, 상태·`finished_until`·`next_wake` 불변(D-3).
5. 경계(A-3): 마감 지난 뒤·`tick` 전 `set_resting(true)` → `RestPaused`(경과 = `active`, 남은 0). 재개 → `next_wake == Some(재개 시각)` → `tick(재개 시각)` → `Finished`(감지 시각부터 10초).
6. 쉬는중 진입 전 무입력 시간은 빼지 않는다(카운트다운도 그동안 정상적으로 줄어든 것).

## 4. 문서 (`doc/200_설계/core/timer.md`, core-designer)

| 절 | 변경 |
|---|---|
| 머리 변경 이력 | 「2026-10-24 rest-display — 카운트다운 쉬는중 자동 일시정지(TM-05 개정, 🔒)」 행 |
| §1 요구 표 TM-05(37행) | 「쉬는중에도 계속」 → 「쉬는중 자동 일시정지·입력 시 재개(🔒 2026-10-24, 스톱워치와 같음)」, 설계 열 `set_resting` no-op → 「`set_resting` 두 모드 공통」 |
| §2.3 `RestPaused` 주석(129행)·함수 표 `set_resting` 행(187행) | 위 §2 주석과 같은 문장 / 「`mode == Countdown`이면 항상 `false`」 → 「두 모드 공통(§3.5.1)」 |
| §3.5.1 전이표(270~280행) | `set_resting(±)` 한 열 → `set_resting(true)`·`set_resting(false)` 두 열 + `RestPaused` 행(02-design §2.2 표 그대로). 280행 「`RestPaused`는 카운트다운에서 생기지 않는다」 취소선 + 「(🔒 2026-10-24) 생긴다 — 진입·해제는 스톱워치와 같다」 |
| §3.5.2(301행) | 「`set_resting`: 첫 줄 `if self.mode == TimerMode::Countdown { return false; }`」 취소선 + 「(2026-10-24) 모드 분기 없음 — §3.2와 같은 match」 |
| §3.8 표 | C4 행 개정, C19~C23 행 추가(아래 §5) |
| §10 RTM | TM-05 행 개정, 「RD-01~04」 행 |
| §11 결정 노트 | 「rest-display 결정 (2026-10-24)」 — 결정 ①, D-3, A-3(마감 경계), A-5(bridge 테스트 과도 실패) |

`doc/200_설계/core/tray.md`는 모드 무관 서술이면 손대지 않는다(`rg "스톱워치 전용|카운트다운에서는 생기지" doc/200_설계/core` 결과가 timer.md 밖에 없으면 끝).

## 5. 수용 기준 (테스트 — `cargo test`, `t0 + Duration` 주입·`sleep` 금지, 도우미 `cd(secs)` 재사용)

| # | 이름 | 조건 | 기대 |
|---|---|---|---|
| C4 (개정) | `countdown_resting_pauses_and_resumes` (옛 `countdown_ignores_resting` 삭제) | `cd(60)`, t0 Start → `set_resting(true, t0+3s)` → 스냅숏 `t0+100s` → `set_resting(false, t0+300s)` → 스냅숏 `t0+305s` | `true` / `{ RestPaused, 3000, Countdown, 60000 }` / `true` / `{ Running, 8000 }`, `next_wake == Some(t0+300s+57s)` |
| C19 | `countdown_rest_paused_has_no_deadline` | 위처럼 `t0+3s`에 쉬는중 → `next_wake()` → `tick(t0+61s)`·`tick(t0+1000s)` | `None` / 둘 다 `false`, `RestPaused`, 경과 3000 |
| C20 | `countdown_resting_ignored_when_not_running` | `Stopped`·`Paused`(t0 Start, +10s Pause)·`Finished`(마감 tick) 각각 `set_resting(true)`·`set_resting(false)` | 모두 `false`, 상태·스냅숏 불변. `Finished`는 `next_wake`(= `finished_until`) 불변 |
| C21 | `countdown_rest_paused_user_actions` | `RestPaused`(경과 3000)에서 각각: Pause → `set_resting(false)` / Start / Stop / `disable` / `configure(Countdown, 30s)` / `configure(Stopwatch, …)` | `Ok(true)`·`Paused` → `false`·`Paused` 유지 / `Ok(true)`·`Running`·이어서 흐름 / `Ok(true)`·`{ Stopped, 0, 60000 }` / `true`·`{ Paused, 3000 }` / `false`·`RestPaused`·`durationMs 60000`(다음 대기부터) / `true`·`{ Stopped, 0, Stopwatch, 0 }` |
| C22 | `countdown_rest_after_deadline_finishes_on_resume` | `cd(60)` t0 Start, `tick` 없이 `set_resting(true, t0+61s)` → `set_resting(false, t0+100s)` → `tick(t0+100s)` | `true`·`{ RestPaused, 60000 }`·`next_wake None` / `true`·`next_wake == Some(t0+100s)` / `true`·`Finished`·`next_wake == Some(t0+110s)` |
| C23 | `countdown_rest_paused_serializes` | C4의 `RestPaused` 스냅숏 직렬화 | `{"status":"restPaused","elapsedMs":3000,"mode":"countdown","durationMs":60000}` |
| 회귀 | 기존 T1~T17·C1~C3·C5~C18·D1~D4, `tray::timer_menu` TV1·TV2 | 변경 없음 | 전부 PASS |

- 명령: `cd src-tauri && cargo fmt --check` exit 0 · `cargo clippy -- -D warnings` 경고 0 · `cargo test` — 위 표 PASS.
- **알려진 과도 실패 1건(A-5)**: `bridge::commands::tests::set_resting_countdown_noop`(`src-tauri/src/bridge/commands/tests.rs`, `assert!(!changed)`)이 실패한다. **bridge 소유 파일이라 고치지 않는다.** 완료 보고에 「실패 1건 = 이 테스트뿐, 원인 = RD-01 의도된 의미 변경, bridge 패킷 §3에서 교체」를 적는다. 그 밖의 실패가 있으면 미완료.

## 6. 하지 말 것

- `src-tauri/src/bridge/**`·`src/**`(TS)·`doc/200_설계/bridge/contract.md` 수정 금지 — 위 과도 실패 테스트 포함(bridge 패킷 몫).
- `TimerStatus` 멤버·`TimerSnapshot` 필드·직렬화·`set_resting` 시그니처 변경 금지. 새 공개 API 금지.
- `apply`·`disable`·`tick`·`next_wake`·`configure`·`freeze`·`run`·드라이버·트레이 보기 로직 변경 금지(테스트로 고정만). 끝남(`Finished`) 중 쉬는중 처리 추가 금지(D-3 = no-op).
- `src-tauri/src/lib.rs` 변경 불필요(깔때기 불변) — 바꾸지 않는다.
- 새 크레이트·의존성 금지.

## 7. 완료 마커

- `src-tauri/src/timer/mod.rs`에 `TimerMode::Countdown` 조기 반환 없음(`rg "mode == TimerMode::Countdown" src-tauri/src/timer/mod.rs` 결과에 `set_resting` 안 줄 없음), `rg "스톱워치 전용|카운트다운에서는 생기지" src-tauri/src/timer` = 0건.
- `cargo test` 결과: timer 신규·개정 6건 PASS, 실패는 A-5의 1건뿐(로그 첨부). fmt·clippy 통과.
- `doc/200_설계/core/timer.md` §1·§2.3·§3.5.1·§3.5.2·§3.8·§10·§11 갱신.
- 완료 보고 → 메인 세션이 `rest-display-03-packet-bridge.md`를 bridge-manager 세션에 인계.
