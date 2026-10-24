# rest-display 인계 패킷 — bridge

- 선행 조건: core 패킷 완료 마커 — `src-tauri/src/timer/mod.rs` `set_resting`에 카운트다운 조기 반환 없음, `cargo test` 실패가 `bridge::commands::tests::set_resting_countdown_noop` 1건뿐(core 패킷 §5 A-5 과도 실패). 이 패킷이 그 1건을 해소한다.
- 요구ID: RD-01·RD-02·RD-03(계약 몫). 사용자 결정 D-5 = **v1.1 · 비파괴**(02-design §5a 권고). 사용자가 v2.0·파괴로 정하면 이 패킷을 아키텍트 세션에서 먼저 고친다.
- 작업 모드: 보강. 진입: `claude --agent bridge-manager`(bridge-designer 계약 → bridge-implementer 코드).
- 한 줄 요약: **타입·시그니처·래퍼·이벤트는 하나도 바뀌지 않는다.** `set_resting`의 카운트다운 의미를 「항상 변화 없음」에서 「스톱워치와 같음」으로 계약에 적고, 그 의미를 단언하던 테스트 1건을 교체하고, 주석 4곳을 맞춘다.

## 1. 변경 대상 파일

| 파일 | 소유 | 변경 |
|---|---|---|
| `doc/200_설계/bridge/contract.md` | bridge-designer | §2 표 전부 |
| `src-tauri/src/bridge/commands/mod.rs` | bridge-implementer | `set_resting` 문서주석(543~546행)만 |
| `src-tauri/src/bridge/commands/tests.rs` | bridge-implementer | `set_resting_countdown_noop`(238~250행) 삭제 → 테스트 2건(§3) |
| `src/bridge/types.ts` | bridge-implementer | `TimerStatus` JSDoc(249~253행)만 |
| `src/bridge/commands.ts` | bridge-implementer | `setResting` JSDoc(109~111행)만 |
| 변경 없음 | — | `src-tauri/src/bridge/types.rs`·`events.rs`, `src/bridge/events.ts`, `src/bridge/__tests__/*`, capabilities, `tauri.conf.json`, `src-tauri/src/lib.rs` |

## 2. 계약 (`contract.md` → v1.1)

| 위치 | 변경 |
|---|---|
| 머리말 3행 「버전」 | **v1.1** — 「(v1.1) rest-display(🔒 2026-10-24 사용자 결정 ①): `set_resting` 카운트다운 의미 변경 — 두 모드 공통. 타입·시그니처·래퍼·이벤트·에러 불변, 비파괴」 줄 추가. 4행 판 규칙 그대로 |
| §3.9 TS 코드블록 790행 주석 | 「입력 시 자동 재개 — 스톱워치 전용」 → 「입력 시 자동 재개 — (v1.1) 스톱워치·카운트다운 공통」 |
| §3.9 JSON 예시(824~834행) | `{ "status": "restPaused", "elapsedMs": 83250, "mode": "countdown", "durationMs": 1500000 }` 한 줄 추가(카운트다운 `running` 예시 뒤) |
| §3.9 상태×모드 표 843행 | 카운트다운 칸 「**생기지 않음**(쉬는중에도 계속 줄어듦 — 🔒 103행)」 → 「~~생기지 않음~~ (v1.1, 🔒 2026-10-24) 쉬는중 자동 일시정지 — 남은 시간 고정(`durationMs − elapsedMs`)」 |
| §5 표 `set_resting` 행(1044행) | 「(v0.23, CR-048) 카운트다운이면 core가 항상 `false`(변화 없음) — 쉬는중에도 계속 줄어든다(🔒 103행)」 취소선 + 「**(v1.1) 두 모드 공통** — 카운트다운도 `running`이면 `restPaused`, `restPaused`면 `running`(남은 시간 이어서). `paused`·`stopped`·`finished`에서는 변화 없음(끝남 깜빡임·알림음 그대로 — D-3)」. 요구 열에 `RD-01, RD-02` 추가 |
| §5.8 카운트다운 전이표(1214~1221행) | `resting=±` 한 열 → `resting=true`·`resting=false` 두 열, `restPaused` 행 추가 — 02-design §2.2 표를 계약 표기(`running`·`restPaused`·D)로 옮긴다: `running` +true → **`restPaused`**, `restPaused` 행 = start `running`(이어서) · pause `paused` · stop `stopped`(D) · true — · false **`running`**(이어서) · disable `paused` · 마감 — · 만료 — |
| §5.8 `configure` 줄(1225행) | 「`running`·`paused`·`finished`면 다음 대기부터」 → 「`running`·`paused`·`restPaused`·`finished`면 …」 |
| §5.8 1232행 | 「쉬는중 진입 전 무입력 대기 시간(기본 5분)은 경과에 포함(U-4, 스톱워치)」 → 「…(U-4, (v1.1) 두 모드)」 |
| §5.8 규칙 5(1240행) | 「(v0.23) 카운트다운이면 core `set_resting`이 항상 변화 없음(쉬는중에도 계속 줄어든다)」 취소선 + 「(v1.1) 두 모드 공통 — 오버레이는 여전히 모드를 보지 않고 그대로 부른다(판정 한 곳 = core)」 |
| §5.8 테스트 목록(1246행) | `set_resting_countdown_noop` 취소선 → `set_resting_countdown_pauses_and_resumes`, `set_resting_countdown_finished_noop` |
| §8 변경 이력 | v1.1 행: 일자 2026-10-24 · 변경(위 목록 요약) · **호환성 「비파괴(의미 변경 — 타입·시그니처·반환·에러 불변, 유일 호출자 overlay 코드 변경 없음, `restPaused` 소비자는 이미 모드 무관)」** · 각주: 「bridge-design-strategy §5 표 「기존 command의 의미가 바뀜 → 파괴」와의 차이 — §6 ui 영향 기준·v0.23 선례로 비파괴 분류(사용자 결정 D-5, 02-design §5a)」 |
| §9 RTM | 「v1.1 (RD-01~03 — rest-display)」 블록: RD-01·RD-02 → `set_resting`·§5.8 · 확장(의미, 시그니처 불변) · 비파괴 · `Timer::set_resting` / RD-03 → §5.8 전이표 · 기존 · — · `Timer::set_resting`·`apply`·`disable`. 옛 TM-05 행(1733행)은 고치지 않고 「(v1.1에서 `set_resting` 카운트다운 의미 대체 — RD-01)」만 덧붙인다 |
| ui 인계 메모(§9 v1.1 끝) | 「ui 영향: 코드 수정 필수 없음. 표시는 기존 `restPaused` 경로로 동작. 화면 쪽 후속(문구 `timerCountdownDesc`, 시작 시간 잠금 `isDurationLocked`, 쉬는중 단독 표시)은 ui 패킷 `rest-display-03-packet-ui.md` 몫 — 계약 요구 아님」 |

## 3. 코드 (bridge-implementer)

### 3.1 Rust 문서주석 — `src-tauri/src/bridge/commands/mod.rs` `set_resting`

```rust
/// [계약] contract.md §5·§5.8 set_resting(resting) [요구] PT-06, RD-01·RD-02(v1.1 — TM-05 개정)
/// 판정 주체는 오버레이 상태기계(core는 판정하지 않는다). 설정 잠금은 쓰지 않는다. (v1.1) 두 모드
/// 공통 — core가 `running`↔`restPaused`를 정한다. 오버레이는 모드를 보지 않고 그대로 부른다.
/// [에러] state.poisoned [부수효과] (조건부) core 깔때기 publish_timer_change
```

본문(`set_resting`·`do_set_resting`) **변경 없음.**

### 3.2 Rust 테스트 — `src-tauri/src/bridge/commands/tests.rs`

`set_resting_countdown_noop` 삭제, 같은 자리에 두 개(같은 픽스처: `Timer::with_config(TimerConfig { mode: TimerMode::Countdown, countdown: 60s })`, `do_control_timer(.., Start, now)`):

| 이름 | 절차 | 기대 |
|---|---|---|
| `set_resting_countdown_pauses_and_resumes` | `do_set_resting(&mut timer, true, now)` → `do_set_resting(&mut timer, false, now + 1s)` | 첫째 `changed == true`, `status == RestPaused`, `mode == Countdown` / 둘째 `changed == true`, `status == Running` |
| `set_resting_countdown_finished_noop` | `timer.tick(now + 60s)`(→ `Finished`) → `do_set_resting(&mut timer, true, now + 61s)` | `changed == false`, `status == Finished`(D-3) |

doc 주석: `/// RD-01·RD-02(v1.1) — 카운트다운도 쉬는중 자동 일시정지·재개(🔒 2026-10-24).` / `/// RD-03·D-3 — 끝남 중 쉬는중은 변화 없음.`

### 3.3 TS JSDoc (타입·런타임 불변)

```ts
/**
 * restPaused = 쉬는중이라 자동 일시정지(입력 시 자동 재개 — (v1.1) 스톱워치·카운트다운 공통), paused = 사용자
 * 일시정지·타이머 끔(자동 재개 없음), (v0.23) finished = 카운트다운 0 도달 뒤 10초(깜빡임) —
 * core가 10초 뒤 stopped로 되돌린다(카운트다운 전용)
 */
export type TimerStatus = 'stopped' | 'running' | 'paused' | 'restPaused' | 'finished'   // 불변
```

```ts
/** 오버레이가 쉬는중 진입(true)·해제(false)를 알린다. 판정 주체는 오버레이 상태기계.
 * (v1.1) 두 모드 공통 — core가 running↔restPaused를 정한다. 오버레이는 모드를 보지 않고 그대로 부른다 */
export const setResting = (resting: boolean) => call<TimerSnapshot>('set_resting', { resting })   // 불변
```

## 4. 셋 대조표 (완료 보고에 그대로 채운다)

| 항목 | contract v1.1 | Rust | TS | 일치 |
|---|---|---|---|---|
| `set_resting` 인자·반환 | `resting: boolean` → `TimerSnapshot` | `resting: bool` → `Result<TimerSnapshot, BridgeError>` | `setResting(resting: boolean): Promise<TimerSnapshot>` | 불변 |
| 카운트다운 의미 | 두 모드 공통 | core `Timer::set_resting`(모드 분기 없음) | JSDoc 「두 모드 공통」 | |
| `TimerStatus` 멤버 | 5개 | 5개 | 5개 | 불변 |
| `TimerSnapshot` 필드·순서 | status·elapsedMs·mode·durationMs | 같음 | 같음(mode?·durationMs? 선택 표기 불변) | 불변 |
| 이벤트·에러 code | 변화 없음 | 변화 없음 | 변화 없음 | |

## 5. 수용 기준

- `cd src-tauri && cargo fmt --check` exit 0 · `cargo clippy -- -D warnings` 경고 0 · `cargo test` **전부 PASS**(core 패킷의 과도 실패 해소 — 실패 0).
- `yarn tsc --noEmit` exit 0 · `yarn test --run src/bridge` PASS(테스트 변경 없음 — 회귀만).
- grep: `rg "스톱워치 전용|계속 줄어든다|countdown_noop" src/bridge src-tauri/src/bridge` = 0건. `rg "emit_timer_changed\(" src-tauri/src/bridge` = `events.rs` 정의 1건(규칙 1 불변).
- 테스트 수: Rust 1 삭제 · 2 추가, TS 0.

## 6. 하지 말 것

- `src-tauri/src/timer/**`·`src-tauri/src/lib.rs`·`src-tauri/src/tray/**`(core), `src/overlay/**`·`src/settings/**`·`src/components/**`·`src/state/**`(ui) 수정 금지.
- `TimerStatus`·`TimerSnapshot`·`setResting` 시그니처·필드 선택성 변경 금지. 새 command·event·에러 code 금지. capabilities·`tauri.conf.json` 변경 금지.
- 래퍼에 모드 판정·계산 추가 금지(bridge-design-strategy §11). `set_resting` 핸들러 본문 변경 금지.
- 화면 문구(`timerCountdownDesc`)·잠금(`isDurationLocked`)을 bridge에서 고치지 않는다 — ui 패킷 몫.

## 7. 완료 마커

- `contract.md` 머리말 v1.1, §3.9·§5·§5.8·§8·§9 반영.
- `cargo test` 실패 0, `yarn tsc --noEmit` exit 0, `yarn test --run src/bridge` PASS 로그, §4 대조표.
- 완료 보고 → 메인 세션이 `rest-display-03-packet-ui.md`를 ui-manager 세션에 인계(overlay §A, settings §B — 별도 세션 권장).
