# pomodoro 인계 패킷 — bridge

- 받는 세션: `claude --agent bridge-manager` (작업 모드: **보강**)
- 전반 설계: `doc/200_설계/architecture/pomodoro-02-design.md`(이 패킷과 어긋나면 02-design이 맞다). 현황 근거: `.claude/reports/bridge-survey-20260926-pomodoro.md`.
- 전략: `bridge-design-strategy`(명명·에러 형태·이벤트 빈도·capabilities), `.claude/skills/rust-rules.md`, `.claude/skills/ts-rules.md`.

## 선행 조건

- **core 패킷 완료 마커**: `src-tauri/src/timer/mod.rs`(`Timer`·`TimerStatus`·`TimerAction`·`TimerSnapshot`·`TimerError`), `src-tauri/src/settings/timer.rs`(`TimerSettings`), `AppState.timer`, `SimpleSlot::PomoChar·PomoBubble`가 있고 `cargo test`가 통과한 상태. core 완료 보고에 붙은 「실물 시그니처 차이 목록」이 있으면 그것을 따른다.
- **새 의존성 없음**. capabilities 변경 없음(contract §7 — app manifest가 없어 `generate_handler!` 등록만으로 허용된다. 두 창 이벤트 구독은 `core:default`).
- 사용자 결정 U-1~U-8은 권고안으로 작성했다. bridge에 걸리는 것은 U-6(TS 기본값 상수)뿐이다.

## 요구ID

PT-01·PT-03·PT-04·PT-05·PT-06·PT-07·PT-08·PT-09·PT-10(에러 code).

## 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `doc/200_설계/bridge/contract.md` → **v0.21** | 머리말 bullet · §3.1 슬롯 2행 · §3.3 `Settings.timer` · **§3.9 신설** 타이머 타입 · §4 이벤트 1행 · §5 command 3행 + `set_settings` 부수 효과 문장 · **§5.8 신설** 타이머 규칙 · §6 code 1개 · §6.1 변환 · §6.2 command별 표 · §7 메모 줄 · §8 이력 v0.21 행 · §9 추적 절(PT-xx) |
| `src-tauri/src/bridge/commands.rs` | `get_timer`·`control_timer`·`set_resting` 핸들러, `set_settings`에 끔 부수 효과 |
| `src-tauri/src/bridge/events.rs` | 상수 `TIMER_CHANGED = "timer://changed"`, `emit_timer_changed(app, &TimerSnapshot)` |
| `src-tauri/src/bridge/types.rs` | core 타입 다시 내보내기(`TimerSnapshot`·`TimerAction`·`TimerStatus`·`TimerSettings`), 문서주석(슬롯 목록에 pomo 2개) |
| `src-tauri/src/error.rs` | `TimerError` → `BridgeError { code: e.code(), message: e.to_string() }` 변환(§6.1 한 곳) |
| `src-tauri/src/lib.rs` | `generate_handler!`에 3개 등록 **만**(선례: window.md §326 `reset_overlay_position` — lib.rs `invoke_handler`는 bridge). 가드가 막으면 우회하지 말고 bridge-manager가 사용자에게 보고 |
| `src/bridge/types.ts` | 슬롯 유니온 +2, `TimerSettings`·상수·`DEFAULT_TIMER_SETTINGS`, `Settings.timer`, `DEFAULT_SETTINGS.timer`, `TimerStatus`·`TimerSnapshot`·`TimerAction` |
| `src/bridge/commands.ts` | `getTimer`·`controlTimer`·`setResting` |
| `src/bridge/events.ts` | `EVENTS.timerChanged`, `onTimerChanged` |
| `src/bridge/index.ts` | barrel export 추가(기존 방식대로 `export *`면 변경 없음) |

## 1. 타입 (contract §3.1·§3.3·§3.9)

### 1.1 슬롯 (§3.1 표에 2행, PT-01)

| TS | Rust | 파일 | 분류 | 필수 | 내장 기본 |
|---|---|---|---|---|---|
| `'pomo_char'` | `SimpleSlot::PomoChar` | `pomo_char.png` | 캔버스 레이어(배경과 같은 크기 규칙), 1장, 위치 없음 | 아니오 | 없음(`hasBuiltinDefault` false, 「기본값」 = 비우기) |
| `'pomo_bubble'` | `SimpleSlot::PomoBubble` | `pomo_bubble.png` | 같음 | 아니오 | 없음 |

```ts
// src/bridge/types.ts — SimpleAssetSlot 유니온(:11-23)에 추가
  | 'pomo_char'   // (v0.21, CR-045) 뽀모도 인물 — 캔버스 레이어·선택·내장 기본 없음
  | 'pomo_bubble' // (v0.21, CR-045) 뽀모도 말풍선 — 같음
```
`DEFAULT_ASSET_SLOTS`·`REQUIRED_SLOTS`·`isRequiredSlot`·`hasBuiltinDefault`는 **바꾸지 않는다**(자동으로 false가 된다).

### 1.2 설정 (§3.3, PT-04·07·08·09)

```ts
/** (v0.21, CR-045) 뽀모도 타이머 표시 설정 — 영속. 경과·실행 상태는 여기 없다(TimerSnapshot) */
export interface TimerSettings {
  /** 타이머 사용(on/off). 꺼도 글자 표시는 ui 규칙(U-1)을 따르고 시간만 멈춘다 */
  enabled: boolean
  /** 시간 글자 상자 **중심**, 캔버스 좌표. 0 ≤ x ≤ 900, 0 ≤ y ≤ 700 */
  textPos: Point
  /** 회전(도, 시계 방향 +). −180 ~ 180 */
  rotation: number
  /** 글자 크기(캔버스 px). 12 ~ 200 */
  fontSize: number
  /** 글자 색 '#rrggbb'(core가 소문자로 저장) */
  color: string
}
export const TIMER_ROTATION_MIN = -180
export const TIMER_ROTATION_MAX = 180
export const TIMER_FONT_SIZE_MIN = 12
export const TIMER_FONT_SIZE_MAX = 200
/** Rust settings::timer::TimerSettings::default()와 1:1 (U-6 권고값) */
export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  enabled: false,
  textPos: { x: 268, y: 403 },
  rotation: 5,
  fontSize: 36,
  color: '#333333',
}
// Settings 인터페이스(:180)에 추가
  /** (v0.21, CR-045) 뽀모도 타이머 표시 설정 */
  timer: TimerSettings
// DEFAULT_SETTINGS(:303)에 추가
  timer: DEFAULT_TIMER_SETTINGS,
```

- JSON 키: `timer.enabled`·`timer.textPos`·`timer.rotation`·`timer.fontSize`·`timer.color`. 옛 settings.json에 `timer`가 없으면 core가 기본값으로 채운다(비파괴).
- `set_settings` 검증 실패는 기존 `settings.invalid`(새 code 없음). 범위와 형식은 02-design §5 표 그대로다.
- `timer`는 **ui 소유 필드**다. `keep_core_owned`의 보호 대상이 아니다. ui는 늘 `{...settings, timer: {...settings.timer, …}}`로 보낸다.

### 1.3 타이머 타입 (§3.9 신설, PT-03·05·06)

```ts
/** (v0.21, CR-045) core timer 상태. restPaused = 쉬는중이라 자동 일시정지(입력 시 자동 재개), paused = 사용자 일시정지·타이머 끔(자동 재개 없음) */
export type TimerStatus = 'stopped' | 'running' | 'paused' | 'restPaused'
/** 이 순간의 타이머. elapsedMs = core가 보낸 순간의 경과(ms, 정수 ≥ 0). ui는 running이면 받은 뒤 흐른 시간을 스스로 더한다 */
export interface TimerSnapshot {
  status: TimerStatus
  elapsedMs: number
}
/** 사용자 조작. stop = 00:00:00 초기화 */
export type TimerAction = 'start' | 'pause' | 'stop'
```

Rust는 core 타입을 그대로 다시 내보낸다(`#[serde(rename_all = "camelCase")]` — `"restPaused"`, `elapsedMs`). `elapsed_ms: u64`는 JS number로 안전하다(2^53 ms ≈ 28만 년).

## 2. command (§5 표 3행 + §5.8)

| command | 인자 | 반환 | 에러 code | 동작 | 요구ID |
|---|---|---|---|---|---|
| `get_timer` | 없음 | `TimerSnapshot` | `state.poisoned` | `AppState.timer` 잠금 → `snapshot(Instant::now())`. 부수 효과 없음 | PT-03·PT-09 |
| `control_timer` | `action: TimerAction` | `TimerSnapshot` | `timer.disabled`, `state.poisoned` | ① `settings` 잠금으로 `timer.enabled`를 복사하고 **즉시 해제** ② `timer` 잠금 → `apply(action, enabled, now)` → snapshot → 해제 ③ `Ok(true)`면 `timer://changed` emit(emit 실패는 `log::warn!`, command는 성공) ④ snapshot 반환. `Err(Disabled)` → `timer.disabled`, emit 없음 | PT-05 |
| `set_resting` | `resting: boolean` | `TimerSnapshot` | `state.poisoned` | `timer` 잠금 → `set_resting(resting, now)` → snapshot → 해제 → true면 emit → 반환. 설정 잠금은 쓰지 않는다 | PT-06 |

`set_settings` 부수 효과(§5 표 해당 행에 문장을 덧붙이고 §5.3 처리 순서에 단계 추가):

- 처리 순서의 **맨 끝**(`settings://changed` emit 뒤, 손 기준점 재계산·`assets://hand-anchor-changed` 뒤)에 **7단계**를 넣는다: 저장 **전** 값 `timer.enabled == true`이고 적용된 값이 `false`이면 `timer` 잠금 → `disable(now)` → true면 `timer://changed`. 설정 잠금과 타이머 잠금을 동시에 쥐지 않는다(core 패킷 §4).
- 실패해도 command는 성공한다(잠금 오염은 경고 로그).
- 핸들러 길이: `set_settings`는 이미 약 58줄이다(BRG-007 미해결). 이 단계는 **별도 private 함수**(`apply_timer_side_effect(app, state, before_enabled, after_enabled)`)로 빼고, 핸들러에는 호출 1줄만 더한다.

§5.8 「타이머 규칙」에 적을 것: 02-design §3.1 전이표 전문, 「core는 상태가 바뀔 때만 emit하고 매초 이벤트는 없다」, ui 표시 계산식(§3.3 `elapsedNow`), 「구독 먼저 → `get_timer`」 순서(§3.6과 같은 규칙), `control_timer`·`set_resting`의 반환값은 이벤트와 같은 값이라는 점, 쉬는중 판정 주체는 오버레이 상태기계라는 점(core는 판정하지 않는다).

## 3. event (§4 표 1행)

| 이벤트 이름 | 페이로드 | 빈도 | 설명 | 요구ID |
|---|---|---|---|---|
| `timer://changed` | `TimerSnapshot` | **상태 변화 시만** — 사용자 조작(시작·일시정지·멈춤·끄기)과 쉬는중 진입·해제. 분당 수 회 이하, 주기 이벤트 없음 | `control_timer`·`set_resting`·`set_settings`(끔)에서 상태가 바뀌었을 때 모든 창에 `app.emit`(오버레이·설정 창 둘 다 소비). 앱 시작 때는 emit하지 않는다(ui는 `get_timer`로 받는다) | PT-03·PT-05·PT-06 |

- 새 도메인 `timer`의 근거는 PT-03·05·06이다(bridge-design-strategy §2 「새 도메인은 요구ID로 역추적될 때만」).
- 상수는 `events.rs`·`events.ts` 한 곳씩에만 둔다. 문자열 리터럴을 다른 곳에 다시 적지 않는다.

```ts
// src/bridge/events.ts
EVENTS.timerChanged = 'timer://changed'
export const onTimerChanged: Subscriber<TimerSnapshot> = cb => listen<TimerSnapshot>(EVENTS.timerChanged, e => cb(e.payload))  // 기존 Subscriber 패턴 그대로
// src/bridge/commands.ts
export const getTimer = (): Promise<TimerSnapshot> => invoke('get_timer')
export const controlTimer = (action: TimerAction): Promise<TimerSnapshot> => invoke('control_timer', { action })
export const setResting = (resting: boolean): Promise<TimerSnapshot> => invoke('set_resting', { resting })
```
래퍼 안에 타이머 계산 로직을 넣지 않는다(전략 §11). 계산은 ui 몫이다(`src/components/utils/timerClock.ts`).

## 4. 에러 code (§6·§6.1·§6.2)

| code | 뜻 | 발생 command | core 원천 | 메시지(ko, core 원문) |
|---|---|---|---|---|
| `timer.disabled` | 타이머가 꺼져 있어 조작을 거부함 | `control_timer` | `TimerError::Disabled` | 타이머가 꺼져 있습니다. 먼저 「타이머 사용」을 켜 주세요. |

- 에러 code 수: 21 → **22**(+ TS 전용 `unknown`). 설정 창 `ErrorCode` 유니온·`ERROR_CODES`·3개 사전은 **ui 소유**라 이 패킷에서 고치지 않는다. ui 패킷이 같은 code 이름으로 문구를 더한다.

## 5. 수용 기준

- Rust 테스트(`cargo test`, 기존 bridge 테스트 위치·방식을 따른다):
  - `control_timer_rejects_when_disabled` → code `timer.disabled`, emit 없음
  - `control_timer_start_emits_changed_once` / `control_timer_noop_does_not_emit`
  - `set_resting_true_pauses_running_and_emits` / `set_resting_noop_when_stopped`
  - `set_settings_disable_pauses_running_timer_and_emits_after_settings_changed`(순서 단언) / `set_settings_enable_does_not_change_timer`
  - `get_timer_initial_is_stopped_zero`
  - `timer_snapshot_json_shape`(`{"status":"running","elapsedMs":…}`), `timer_action_json`(`"start"|"pause"|"stop"`), `settings_timer_json_roundtrip`(camelCase 키 5개)
  - emit 검증이 어려우면 기존 방식(emit 함수를 주입받는 내부 함수 + 테스트 대역)을 따른다. 없으면 「바뀜 여부 bool → emit 호출」 분기를 순수 함수로 빼서 테스트한다.
- `cargo clippy -- -D warnings` 0, `cargo fmt --check` 통과.
- `yarn tsc --noEmit` exit 0. **예외 처리**: `Settings`에 필수 필드 `timer`가 늘어서, 화면 테스트 픽스처가 `Settings` 리터럴을 직접 만들면 타입 오류가 날 수 있다. 오류가 **전부 `src/overlay/test/`·`src/settings/test/` 픽스처의 `timer` 누락뿐**이면 bridge 완료로 인정한다. 그 파일·줄 목록을 완료 보고에 적어 ui 패킷 첫 작업으로 넘긴다(화면 폴더 파일은 고치지 않는다).
- 계약 ↔ Rust ↔ TS 셋 대조표(슬롯 2·`TimerSettings` 5필드·`TimerStatus` 4값·`TimerSnapshot` 2필드·`TimerAction` 3값·command 3·event 1·code 1)를 완료 보고에 붙인다.
- `doc/200_설계/bridge/contract.md` v0.21 머리말·§8 이력(`v0.21 | 2026-09-26 | CR-045 … | 추가(IPC·저장 데이터)·비파괴`)·§9 추적(PT-01~PT-10 → 절 번호) 반영.

## 하지 말 것

- `src/overlay/**`·`src/settings/**`·`src/components/**`·`src/state/**`(화면·상태기계·공용 훅) 수정 금지. `ErrorCode`·i18n 사전도 ui 몫이다.
- core 모듈 내부(`timer/`·`settings/timer.rs`의 로직) 수정 금지. 필요하면 core-manager 세션으로 되돌린다(아키텍트 경유).
- 매초 `timer://changed`를 보내는 스레드·타이머를 만들지 않는다.
- `emit_to`로 특정 창에만 보내지 않는다. 두 창 모두 소비한다.
- `tauri.conf.json`·`capabilities/*` 수정 금지(필요 없음).
- 이번 범위 밖 기존 결함(BRG-001·003·005·006)은 고치지 않는다. 다만 §8 이력 공백(BRG-002, v0.20 행 누락)은 같은 표를 만지므로 v0.20 행을 채워도 된다(선택).

## 완료 마커

- `generate_handler!`에 `get_timer`·`control_timer`·`set_resting` 등록, `cargo test` 전체 통과(테스트 수·PASS 수).
- `src/bridge/{types,commands,events}.ts` 반영, `yarn tsc --noEmit` exit 0(또는 위 예외 목록).
- contract v0.21 반영 + 셋 대조표.
- ui 인계 메모: 새 래퍼 이름(`getTimer`·`controlTimer`·`setResting`·`onTimerChanged`), 상수(`DEFAULT_TIMER_SETTINGS`·`TIMER_*_MIN/MAX`), 새 code(`timer.disabled`), (있으면) 픽스처 오류 목록.
