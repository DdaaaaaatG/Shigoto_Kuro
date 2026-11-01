# key-hold 전반 설계

- 작성: 2026-11-01 · system-architect · 입력: `key-hold-01-analysis.md`
- 사용자 결정(🔒 2026-11-01): ① 최소 유지 시간 — 키를 눌러 키보드 그림이 바뀌면(일반 `kb_down_N`·특수 `key_*`) 키를 떼도 **누른 시점부터 최소 N ms** 그 그림을 보인 뒤 원래(`kb_up`)로 돌아간다. 꾹 누르면 뗄 때까지(기존). 페이드 없음 ② N은 설정 창에서 조절.
- 뒤집거나 고치는 기존 규칙: overlay R-07 「떼면 들림」·R-22 「누르고 있는 동안, 떼면 기본」(시점만 바뀜), design §10.8 「젤리 길이 — 떼면 그 순간 끊긴다(as-built)」(D-4), §10.6 「`specialHeld`에만 잠시 있다(떼면 삭제)」(D-6), PS-02 「설정 4필드」(D-3). 확정사항 문장은 §8 문안으로 메인 세션이 고친다.

**결론.** 입력 상태기계는 그대로 두고, 오버레이에 **「보이는 키 상태」** 를 만드는 순수 모듈 `src/state/keyHold.ts` 하나를 더한다. 새 누름(`bounceSeq` 증가)마다 그 순간의 키 필드 4개를 찍어 두고(유지 스냅숏), 누른 시각 + N ms까지 그림 선택 함수에 그 값을 넘긴다. 만료는 setTimeout 1개가 알린다. 설정은 `idleSeconds`와 같은 길(core 검증·보정 → contract `Settings` → 설정 창 「크기 · 반응」 카드)로 `keyHoldMs`(0~500ms, 기본 150) 하나를 더한다. 계약은 **v1.2 · 추가(비파괴)**. 사용자 결정이 더 필요한 것은 D-1~D-8 여덟 건이며 모두 권고안이 있다.

## 1. 목표 구조

```
hook ─ input://keyboard{ts} · input://mouse-button{ts} ─▶ OverlayApp.dispatch
                                                          │
  useReducer(reduceOverlay)  ── state = { machine, hold } ─┤
   ① machine' = reduce(machine, input, config)            (inputMachine 불변)
   ② hold'    = nextKeyHold(hold, machine, machine', ts, keyHoldMs)
                 · machine'.bounceSeq ≠ machine.bounceSeq(새 누름) && keyHoldMs > 0
                     → { seq, until = ts + keyHoldMs, keys = machine'의 kbDown·kbFrame·specialHeld(최근 1개)·clickHeld }
                 · 새 누름 && keyHoldMs ≤ 0 → null (현행)
                 · 그 밖(뗌·반복·이동·tick) → hold 그대로(같은 객체)
   ③ 둘 다 그대로면 같은 state 객체 → 리렌더 없음
                                                          │
  useEffect([hold]) ─ hold ≠ null → setTimeout(holdDelay = clamp(until − Date.now(), 0, 500))
                      └▶ dispatch({ type:'holdEnd', seq }) → seq 같으면 hold = null   (cleanup = clearTimeout)
                                                          │
  view = visibleMachine(machine, hold) = hold ? { ...machine, ...hold.keys } : machine   (useMemo)
   ├ LayerStack(machine=view)          키보드 그림(kb_down_N · key_* · 펜 모드 kb_up/key_*)
   ├ isSpecialShown(manifest, view)    .canvas.specialShown (CR-071 팔·펜 손 숨김)
   ├ PenHand(machine=view)             pen_down_0 ↔ pen_up (CR-027/042)
   └ wrapMotion(view)                  .hairWrap/.jellyWrap 젤리·부르르 (D-4)
  machine 그대로 쓰는 곳: layer·restOnly(R-41) · MouseArm 커서·클릭 파츠(R-09) · armAtRest · setResting · tick

settings 창 「크기 · 반응」 카드 ─ 슬라이더 keyHoldMs ─ setSettings ─▶ set_settings ─▶ settings::update
   ─▶ settings://changed ─▶ overlay settings.keyHoldMs (다음 새 누름부터 적용)
```

## 2. 표시 상태 설계 (상태 기계 확정본)

### 2.1 입력 상태기계 — 불변

`src/state/inputMachine.ts` 수정 없음. `kbDown`은 계속 「지금 눌려 있다」는 사실만 뜻한다.

### 2.2 유지 스냅숏 상태 (신규, `src/state/keyHold.ts`)

| 상태 | 뜻 | 진입 | 나감 |
|---|---|---|---|
| `hold = null` | 유지 없음 — 보이는 상태 = 입력 상태(같은 객체) | 시작, `holdEnd`(seq 일치), 새 누름 && N ≤ 0 | 새 누름 && N > 0 |
| `hold = {seq, until, keys}` | 마지막 새 누름의 키 필드를 `until`까지 보인다 | 새 누름(`bounceSeq` +1) && N > 0 | `holdEnd`(seq 일치) → `null` / 다음 새 누름 → 새 스냅숏으로 교체 |

| 입력 \ 상태 | `hold = null` | `hold = H` (유지 중) |
|---|---|---|
| 키 새 누름 · 펜 모드 새 클릭 누름 (`bounceSeq` +1) | N > 0 → 새 `H'`(until = ts + N) / N ≤ 0 → `null` | 새 `H'`로 교체(타이머 재설정) / N ≤ 0이면 `null` |
| 뗌(키·클릭), 자동 반복, 같은 버튼 중복, 마우스 이동, tick | 그대로 | 그대로(같은 객체 — 타이머 재설정 없음) |
| `holdEnd(seq)` | 그대로 | seq = H.seq → `null` / 다르면 그대로(낡은 신호 방어) |

의사 코드(정본 — 이름 그대로):

```ts
// src/state/keyHold.ts — 보이는 키 상태(표시 전용, 순수). inputMachine을 고치지 않는다.
import { KEY_HOLD_MS_MAX } from 'bridge/types'
import { createInitialState, currentSpecial, reduce,
         type MachineConfig, type MachineInput, type MachineState } from './inputMachine'

/** 유지 스냅숏에 담는 키 필드 — 그림 선택 함수가 읽는 4개뿐. heldCount·mouse·layer·반복 필드는 담지 않는다 */
export type HeldKeys = Pick<MachineState, 'kbDown' | 'kbFrame' | 'specialHeld' | 'clickHeld'>
export interface KeyHold { seq: number; until: number; keys: HeldKeys }
export interface OverlayState { machine: MachineState; hold: KeyHold | null }
export type OverlayInput = MachineInput | { type: 'holdEnd'; seq: number }

export const createOverlayState = (now: number): OverlayState =>
  ({ machine: createInitialState(now), hold: null })

const inputTs = (input: MachineInput): number => (input.type === 'tick' ? input.now : input.ts)

/** 새 누름 직후의 키 필드. 특수 키는 가장 최근 1개만 남긴다(R-22 최소 보관 — D-6) */
const snapshotKeys = (m: MachineState): HeldKeys => {
  const special = currentSpecial(m)
  return { kbDown: m.kbDown, kbFrame: m.kbFrame,
           specialHeld: special === null ? [] : [special], clickHeld: m.clickHeld }
}

/** 새 누름 = bounceSeq 증가(키 새 누름·펜 모드 새 클릭 누름 — 뗌·자동 반복·같은 버튼 중복은 증가 없음) */
export const nextKeyHold = (prev: KeyHold | null, before: MachineState, after: MachineState,
                            ts: number, holdMs: number): KeyHold | null => {
  if (after.bounceSeq === before.bounceSeq) return prev
  if (!(holdMs > 0)) return null                    // 0·NaN·undefined → 유지 없음(현행)
  return { seq: after.bounceSeq, until: ts + holdMs, keys: snapshotKeys(after) }
}

/** 렌더 전용. 유지 없음이면 machine 그 객체(0 = 현행 보장). 결과를 reduce에 다시 넣지 않는다 */
export const visibleMachine = (machine: MachineState, hold: KeyHold | null): MachineState =>
  hold === null ? machine : { ...machine, ...hold.keys }

/** 만료까지 남은 ms — 시스템 시계가 튀어도 0~KEY_HOLD_MS_MAX 안(A-3) */
export const holdDelay = (hold: KeyHold, now: number): number =>
  Math.min(KEY_HOLD_MS_MAX, Math.max(0, hold.until - now))

export const reduceOverlay = (state: OverlayState, input: OverlayInput,
                              config: MachineConfig, holdMs: number): OverlayState => {
  if (input.type === 'holdEnd')
    return state.hold !== null && state.hold.seq === input.seq ? { ...state, hold: null } : state
  const machine = reduce(state.machine, input, config)
  const hold = nextKeyHold(state.hold, state.machine, machine, inputTs(input), holdMs)
  return machine === state.machine && hold === state.hold ? state : { machine, hold }
}
```

- 유지 기준 시각 = 이벤트 `ts`(hook epoch ms, 01 §5 F-1). 「누른 시점부터 N ms」를 그대로 옮긴다. IPC 지연(수 ms)만큼 화면상 유지가 짧아질 수 있다(수용).
- 꾹 누름: `until`이 지나 `hold = null`이 되면 보이는 상태 = 입력 상태(아직 눌림) → 같은 그림, 끊김 없음. 뗄 때 즉시 `kb_up`(유지 시간은 이미 지남).
- 만료 렌더: 연속 타자 중엔 새 누름이 타이머를 계속 교체해 만료 렌더가 없다. 타자를 멈추면 1회.

### 2.3 시간선 예시 (N = 150, `kb_down_0`·`kb_down_1`·`key_enter` 등록)

| t(ms) | 입력 | 입력 상태 그림 | 보이는 그림 | 비고 |
|---|---|---|---|---|
| 0 | `a` 누름 | `kb_down_1` | `kb_down_1` | hold(until 150), 젤리 시작 |
| 80 | `a` 뗌 | `kb_up` | **`kb_down_1`** | 유지 중, 젤리 이어짐(D-4) |
| 150 | (만료) | `kb_up` | `kb_up` | `holdEnd` → 1회 렌더 |
| 300 | Enter 누름 | `key_enter` | `key_enter` | 팔·펜 손 숨김(CR-071) |
| 330 | Enter 뗌 | `kb_up` | **`key_enter`** | 팔·펜 손 계속 숨김 |
| 400 | `b` 누름 | `kb_down_0` | `kb_down_0` | **즉시 교체**, hold(until 550), 팔·펜 손 다시 보임 |
| 420 | `b` 뗌 | `kb_up` | `kb_down_0` | |
| 550 | (만료) | `kb_up` | `kb_up` | |
| 600~1400 | `c` 꾹 누름 | `kb_down_1` | `kb_down_1` | 750에 만료돼도 그림 같음, 반복 오면 부르르(불변) |
| 1400 | `c` 뗌 | `kb_up` | `kb_up` | 즉시(유지 시간 지남) |

### 2.4 기존 규칙과의 상호작용

| 규칙 | 유지 중 동작 | 판정 기준 | 바뀜 |
|---|---|---|---|
| R-07 일반 누름 `kb_down_N` 순환 | 유지 동안 누른 순간의 프레임 그대로. 새 누름은 즉시 다음 프레임 | 보이는 상태 | 시점만 |
| R-32 `kb_down` 없음 폴백(`kb_up`) | 누름 그림 = `kb_up`이라 보이는 차이 없음 | 보이는 상태 | 없음 |
| R-22 특수 키 `key_*` | 유지 동안 그 그림. 미등록이면 `kb_down` 프레임 유지 | 보이는 상태 | 시점만 |
| §10.6 5행 (스페이스 누른 채 Enter 누름 → Enter 뗌) | `key_enter`가 Enter 누른 시각 + N까지 남았다가 `key_space` | 보이는 상태 | 시점만(문서 표 갱신) |
| §10.6 10행 (`heldCount 0` = 비움, 뗌 누락 방어) | 입력 상태는 즉시 비움. 보이는 그림은 유지 후 `kb_up` | 입력 상태는 그대로 | 없음 |
| CR-071 특수 키 그림 중 팔·펜 손 숨김 | `isSpecialShown(view)` — 특수 그림이 보이는 동안(유지 포함) 숨김 | 보이는 상태 | 시점만 |
| CR-066 젤리(새 누름마다 재시작) | 새 누름 = 즉시 짝 교대·재생(불변). 뗀 뒤에도 유지 동안 클래스 유지 → 350ms 중 N ms까지 재생(N ≥ 350이면 끝까지) | 보이는 상태(D-4) | **젤리 길이**: 「뗌 즉시 끊김」 → 「누른 시각 + N까지」 |
| CR-051 뒷머리 젤리 동기 | `motion` 하나를 공유하므로 본체와 같이 | 보이는 상태 | 위와 같음 |
| R-24 부르르(자동 반복) | 반복은 새 누름이 아니라 스냅숏을 만들지 않는다. `isRepeating(view) = machine.repeating && view.kbDown` — 뗌이 `repeating`을 끄므로 유지 중 부르르 없음. 부르르로 대체된 젤리를 되살리지 않음(`shiverSeq`, 불변) | 입력 상태(`repeating`) | 없음 |
| CR-027 펜 모드 클릭 = 키 누름 | 새 클릭 누름도 `bounceSeq` +1 → 스냅숏(`clickHeld`) → `pen_down_0` 유지 | 보이는 상태(D-5) | 시점만 |
| CR-042 펜 모드 키보드 레이어 | `kb_up` 고정, 특수 그림만 — 특수 그림 유지 | 보이는 상태 | 시점만 |
| R-09 클릭 파츠 `mouse_left/right` | 유지 없음 — 뗌 즉시 `mouse_base` | 입력 상태(`machine.mouse.button`) | 없음(D-5) |
| R-11·R-15 팔 쉬는 자세 `armAtRest` | 불변 | 입력 상태 | 없음 |
| R-41 쉬는중 단독 표시 | 불변. 쉬는중은 무입력 ≥ 60초 뒤라 유지(≤ 500ms)와 겹치지 않는다. 쉬는중에서 키를 누르면 `wake`(같은 커밋)와 함께 새 유지 | 입력 상태(`layer`) | 없음 |
| R-33~R-39 뽀모도·타이머 | 무관 | — | 없음 |
| R-28 위치 잠금·R-40 오른쪽 클릭 메뉴 | 무관 | — | 없음 |
| 설정 변경(`keyHoldMs`) | 진행 중인 유지는 원래 `until`까지, 새 값은 다음 새 누름부터 | — | (A-4) |
| 그림·펜 모드 변경(`assets://changed`·`penMode`) | 스냅숏 `kbFrame`이 프레임 수를 넘으면 기존 폴백(`kb_down[0]` → `kb_up`) | 보이는 상태 | 없음 |

## 3. 계약 변경 목록 (contract v1.1 → **v1.2**)

| 종류 | 이름 | 변경 | 하위 호환 | 소비자 |
|---|---|---|---|---|
| 타입 필드 | `Settings.keyHoldMs` | **추가** — `number`(정수 ms), 0~500, 기본 150. 0 = 떼는 즉시 복귀(v1.1까지 동작). **필수 필드**(Rust가 항상 키를 보낸다 — `penMode`·`timer` 선례) | 추가(비파괴) — 저장 데이터·IPC 런타임 비파괴. TS 전체 리터럴 생성부는 필드를 채워야 함(제품 코드 0곳, 테스트 픽스처만 — 01 §5 F-8) | overlay(읽기), settings 창(읽기·쓰기) |
| Rust 필드 | `Settings.key_hold_ms: u32` | 추가 — 키 없음 = 150(컨테이너 default) | 추가 | core |
| TS 상수 | `KEY_HOLD_MS_MIN = 0` · `KEY_HOLD_MS_MAX = 500` | 추가(`SCALE_MIN/MAX` 선례) | 추가 | settings 창 슬라이더, `state/keyHold.ts` 지연 상한 |
| TS 기본값 | `DEFAULT_SETTINGS.keyHoldMs = 150` | 추가 — Rust `Settings::default()`와 1:1 | 추가 | 두 창 초기 상태 |
| 규칙 | §5.3 `set_settings` 1단계 검증 | `keyHoldMs` 0~500 밖이면 `settings.invalid`(아무것도 안 바뀜). 새 에러 code 없음 | 추가 | — |
| 규칙 | §3.3 읽기 보정 | 파일의 범위 밖 값은 거부 대신 clamp(`idleSeconds` D24와 같은 이유) | 추가 | — |
| 규칙 | §5·§5.11 프리셋 | PS-02 「설정 4필드」 → **5필드**(`keyHoldMs` 추가). 키 없는 옛·내장 프리셋은 150 | 추가(D-3) | 프리셋 탭 |
| 이벤트·command·에러 code·capabilities | — | **없음**(`settings://changed`는 같은 `Settings`를 실을 뿐) | — | — |

- 판 규칙(계약 머리말 4행): 추가·비파괴 = v1.x → **v1.2**. 분류 근거: 새 필드 추가만 있고 기존 필드·이름·의미 불변(`penPos` v0.13·`timer` v0.21 필수 필드 추가 선례 = 「추가」).
- ui·core가 한 exe로 함께 배포돼 판 어긋남(옛 ui가 키 없이 `set_settings`)은 생기지 않는다. 생기더라도 컨테이너 default 150으로 읽힐 뿐 오류는 없다.

## 4. 설정 스키마 변경

| 항목 | 값 |
|---|---|
| JSON 키 | `keyHoldMs` (camelCase) |
| Rust | `pub key_hold_ms: u32` — `crate::settings::Settings` |
| 단위·형식 | 밀리초 정수 |
| 범위 | 0 ≤ v ≤ 500 (Rust `KEY_HOLD_MS_MIN`·`KEY_HOLD_MS_MAX`, TS 같은 이름) |
| 기본값 | 150 (Rust `KEY_HOLD_MS_DEFAULT`, TS `DEFAULT_SETTINGS.keyHoldMs`) |
| 쓰기 검증 | `Settings::validate` — 범위 밖 `SettingsError::Invalid("키 그림 유지 시간은 0 ~ 500ms 사이여야 합니다.")` → `settings.invalid` |
| 읽기 보정 | `settings::load` — 범위 밖이면 clamp + 경고 로그(값만, 키 정보 없음). 음수·소수·문자열은 기존 `u32` 형식 오류 경로(파일 전체 기본값 대체 — `idleSeconds`와 같은 기존 위험, 관용 읽기 추가 안 함 A-8) |
| 옛 파일 | 키 없음 → 150 (D-2) |
| 전체 초기화 | `reset_settings`의 `..Settings::default()` → 150(코드 변경 없음) |
| 프리셋 | PS-02 포함(D-3). `PresetSettings.key_hold_ms`, 키 없음 → 150, 읽기 보정 clamp |
| 버전·마이그레이션 | 없음(컨테이너 default) |
| 설정 창 단계 | 10ms (화면 상수 `KEY_HOLD_STEP_MS`, core는 단계를 검사하지 않는다) |

## 5. 사용자 결정 사항

### 5a. 사용자 결정이 필요한 항목 (권고안 있음 — 메인 세션 가정 확인 포함)

| # | 질문 | 권고 | 대안 | 근거 |
|---|---|---|---|---|
| **D-1** | 설정 키·범위·기본값·조절 단위 (메인 세션 가정) | **가정대로** — `keyHoldMs`, 0~500ms, 기본 150, 설정 창은 10ms 단위 슬라이더 | 범위 0~1000 / 기본 100 | 사람의 짧은 키 누름은 대략 70~120ms라 150이면 뗀 뒤에도 그림이 확실히 한 번 보인다(60Hz 기준 약 9프레임). 젤리 첫 눌림(52ms)·되튀김(122ms)도 보인다. 500을 넘으면 초당 2타만 쳐도 `kb_up`이 거의 안 보여 「멈춘 것처럼」 보인다. 상한 500은 기존 반복 방어 시간(`REPEAT_TIMEOUT_MS`)과 같은 크기 |
| **D-2** | 업데이트한 기존 사용자(옛 `settings.json`, 키 없음)의 값 | **150** — 새 기본값이 바로 적용된다 | 옛 파일만 0(지금 그대로) — 「키 없음」과 「새 설치」를 구분하는 별도 읽기 규칙 필요 | 요구 자체가 「지금은 너무 순식간」이라는 피드백이다. 컨테이너 default 한 줄로 끝나고 마이그레이션 코드가 없다. 싫으면 설정 창에서 0으로 돌릴 수 있다 |
| **D-3** | 프리셋에 넣을지 (메인 세션 가정: `idleSeconds`와 같은 규칙) | **넣는다(PS-02)** — 저장·내보내기에 포함, 적용하면 바뀜. 키 없는 옛 프리셋·내장 프리셋 ①② 적용 시 **150** | A. 넣지 않는다(PS-03 — PC별 설정처럼 적용해도 그대로) · B. 넣되 키가 없으면 현재값 유지(`Option` 필드) | `idleSeconds`·`scale`(반응·크기)이 PS-02라 같은 묶음이다. 컨테이너 default 방식은 기존 PS-02 필드와 같은 규칙이라 코드가 가장 단순하다. 내장 프리셋 JSON(`doc/assets/presets/*/preset.json`)은 고치지 않는다(150 = 기본값). 대신 설정 창 「현재 설정 저장」 설명 문구 3개 국어에 「키 그림 유지 시간」을 넣는다 |
| **D-4** | 젤리(CR-066)도 보이는 그림 기준으로 할지 | **예** — 뗀 뒤에도 그림이 남아 있는 동안 젤리 클래스를 유지(N ≥ 350이면 끝까지 재생) | 입력 기준 유지 — 젤리는 떼는 순간 끊기고 그림만 남는다 | 그림은 「눌림」인데 몸은 이미 멈춘 모습이 섞이면 어색하다. 판정 한 곳(보이는 상태)으로 모으면 규칙이 하나다. design §10.8 「젤리 길이 — as-built」 문장을 개정한다 |
| **D-5** | 유지 대상 범위 | **키보드 그림(일반·특수) + 펜 손 `pen_down_0`(펜 모드 키·클릭 누름 포함)**. 마우스 클릭 파츠(`mouse_left`/`mouse_right`)는 **제외** | 키보드 레이어만(펜 손 제외) / 클릭 파츠도 포함 | 펜 모드에서는 타자 반응이 펜 손 그림으로 보인다(CR-042 — 키보드 레이어는 `kb_up` 고정) → 펜 손을 빼면 펜 모드 사용자에게 요구가 무효다. 클릭 파츠는 「키보드 그림」이 아니고 요구에 없다(요구 범위) |
| **D-6** | 개인정보 규칙 R-22(🔒) 문구 개정 | **개정** — 「떼면 삭제」 → 「떼면 삭제. 단 그림 유지 시간(최대 500ms) 동안 화면 표시용으로 **마지막 누름 1건의 분류값만** 메모리에 둔다 — 이력·횟수·저장·전송 없음」 | 특수 키 그림은 유지하지 않음(일반 키만 유지) — 요구 원문(백스페이스·엔터)과 어긋남 | 유지 시간 동안 특수 키 그림을 보이려면 뗀 뒤에도 그 분류값이 있어야 한다. 스냅숏은 가장 최근 특수 키 1개만 담고(여러 개 눌렸어도) 만료되면 버린다. 이미 `lastInputAt`(시각)·`bounceSeq`가 메모리에 있는 것과 같은 성격 |
| **D-7** | 계약 판·필드 선택성 | **v1.2 · 추가(비파괴) · TS 필수 필드** — bridge 완료~ui 0단계 사이 `yarn tsc --noEmit`이 ui 테스트 픽스처에서만 실패(과도 상태, 문서화) | TS 선택 필드(`keyHoldMs?`) — 과도 실패 없음, 대신 계약 관례(「Rust가 항상 보내면 필수」) 위반·ui 코드마다 `??` 필요 | v0.21 `timer`가 같은 방식(필수 + 픽스처 갱신)으로 들어갔다. 실패는 타입 검사뿐이고 vitest·cargo는 통과(ui가 필드를 읽기 전) |
| **D-8** | 설정 창 문구(3개 국어) | 아래 표 | 더 짧게(ko 「키 그림 유지」) | 기존 `idleDesc`와 같은 구조(설명 + 괄호 범위), 같은 마침표 규칙 |

D-8 문구 초안(키 이름은 `src/settings/i18n/types.ts`에 추가):

| 키 | ko | ja | en |
|---|---|---|---|
| `keyHoldLabel` | 키 그림 유지 시간 | キー画像の表示時間 | Key image hold |
| `keyHoldDesc` | 키를 짧게 눌러도 바뀐 키보드 그림을 최소 이 시간만큼 보여 줍니다. 0이면 떼는 즉시 돌아갑니다({min}~{max}ms). | キーを短く押しても、切り替わったキーボード画像を最低この時間は表示します。0にすると離した瞬間に戻ります({min}〜{max}ms)。 | Keeps the pressed-key image on screen at least this long, even for quick taps. At 0 it returns as soon as you release ({min}–{max} ms). |
| `keyHoldValue` | {ms}ms | {ms}ms | {ms} ms |
| `presetSaveDesc`(개정, D-3 — 삽입 위치만 바뀌고 나머지 글자 그대로) | 「…배율·휴식 시간·**키 그림 유지 시간**·「어깨축·손 위치」 탭 설정…」 | 「…倍率・休憩時間・**キー画像の表示時間**・「肩の軸・手の位置」タブの設定…」 | 「…scale, rest time, **key image hold**, the "Shoulder & hand" tab settings…」 |

### 5b. 아키텍트 결정 (기존 규칙에서 바로 나옴 — 사용자 결정 불필요, 이의 있으면 되돌린다)

| # | 결정 | 근거 |
|---|---|---|
| A-1 | 보이는 상태는 새 순수 모듈 `src/state/keyHold.ts` + `OverlayApp` 합성 리듀서(`{ machine, hold }`)로 만든다. `inputMachine.ts`는 한 줄도 바꾸지 않는다 | 01 §7-1·7-2. 같은 리듀서 커밋에서 스냅숏을 만들어 키 입력당 추가 렌더 0(01 §7-3). 순수 함수라 React 없이 테스트 가능(ui-design-strategy — 상태기계는 `src/state` 순수 함수) |
| A-2 | 만료 신호 = `setTimeout` 1개(유지 스냅숏이 바뀔 때마다 교체, cleanup에서 해제). rAF·tick 아님 | 오버레이에 rAF 루프가 없고 모션은 CSS뿐(01 §5 F-2). tick은 100ms 해상도라 150ms가 최대 250ms로 늘고, 무변화 tick은 리렌더가 없어 만료를 화면에 못 올린다. setTimeout은 유지 중에만 1개 존재 → 유휴 비용 0 |
| A-3 | 유지 기준 = 이벤트 `ts`, 지연 = `clamp(until − Date.now(), 0, 500)` | 「누른 시점」 그대로(01 §5 F-1). 시스템 시계가 뒤로 튀어도 최대 500ms 뒤엔 반드시 끝난다 |
| A-4 | 유지 중 `keyHoldMs` 변경은 다음 새 누름부터 | 진행 중 `until`을 다시 계산하면 슬라이더를 끄는 동안 그림이 깜빡일 수 있다. 값은 리듀서가 ref로 읽는다(`configRef` 선례) |
| A-5 | 스냅숏은 `kbDown`·`kbFrame`·`specialHeld`(최근 1개)·`clickHeld`만. 보이는 상태는 렌더 전용 — `reduce`에 다시 넣지 않는다 | 그림 선택 함수가 읽는 필드뿐(01 §5 F-3). R-22 최소 보관(D-6) |
| A-6 | 소비자 분리: 보이는 상태 → `LayerStack`·`isSpecialShown`·`PenHand`·`wrapMotion` / 입력 상태 → `layer`·`restOnly`·`MouseArm`(커서·클릭 파츠)·`armAtRest`·`setResting`·tick | §2.4 표. 쉬는중·타이머 보고는 사실(입력)에 묶어야 한다 |
| A-7 | core 상수·검증·보정·테스트는 새 파일 `src-tauri/src/settings/key_hold.rs`. `settings/mod.rs`는 10여 줄만 | `mod.rs` 777줄(한계 800, 01 §5 F-4). `timer.rs` 선례 |
| A-8 | 쓰기 = 범위 밖 거부(`settings.invalid`), 파일·프리셋 읽기 = clamp 보정. 음수·소수의 관용 읽기는 추가하지 않는다 | `idleSeconds` D24와 같은 규칙. 관용 읽기는 요구 밖 |
| A-9 | 기존 overlay 테스트 픽스처(19개 파일)는 `keyHoldMs: 0`을 명시해 현행 의미를 보존하고, 유지 동작은 새 테스트만 150으로 검증한다 | 01 §5 F-8 ①. 0 = 현행(01 §7-4)이라 기존 TC 전부가 회귀 기준이 된다 |
| A-10 | 설정 창 미리보기(타이머 탭·프리셋 카드 합성)는 영향 없음 | 키 입력을 흉내 내지 않는 편집 도구 |
| A-11 | 슬라이더는 기존 `useSliderDraft`를 그대로 재사용(세 번째 사용처). 공용 훅 승격은 이번 범위 밖 — 후작업 후보로만 적는다 | `useSliderDraft.ts` 머리 주석 「3번째가 생기면 추출 후보」. 승격은 사용자 요청 시 ui-postprocessor 몫 |

## 6. 종단간 RTM

| 요구ID | 요구 | ui | bridge | core | 설정 키 | 테스트 | 상태 |
|---|---|---|---|---|---|---|---|
| KH-01 | 바뀐 키 그림(일반 `kb_down_N`·특수 `key_*`)을 누른 시점부터 최소 N ms 유지, 꾹 누름은 뗄 때까지(🔒 결정 ①) | overlay **R-42 신설**, R-07·R-22 끝 주석 / `state/keyHold.ts` `nextKeyHold`·`visibleMachine`, `index.tsx` → `LayerStack(view)` | `Settings.keyHoldMs` | `key_hold_ms` | `keyHoldMs` | ui K2·K10 / O1·O2·O5 | 설계 |
| KH-02 | 유지 중 새 누름 = 즉시 새 그림, 유지는 새 누름 기준 재시작 | `nextKeyHold`(`bounceSeq`) | — | — | — | ui K4 / O3 | 설계 |
| KH-03 | N = 0이면 현행과 같음 | `nextKeyHold` → `null`, `visibleMachine` 동일 객체 | 범위 0 포함 | 범위 0 포함 | `keyHoldMs` | ui K1·K11 / O4 + 기존 overlay TC 전부(A-9) | 설계 |
| KH-04 | 보이는 그림 기준 일관 — 특수 키 중 팔·펜 손 숨김(CR-071)·펜 손(CR-027/042, D-5)·젤리(CR-066, D-4). 부르르·클릭 파츠·쉬는중 불변 | `isSpecialShown(view)`·`PenHand(view)`·`wrapMotion(view)` | — | — | — | ui K5·K6·K7 / O2·O6·O7·O10 | 설계 |
| KH-05 | 상태기계 불변, 쉬는중·언마운트·설정 변경 때 타이머 누수·잔상 없음 | 만료 효과(cleanup), `holdEnd` seq 방어, `holdDelay` 상한 | — | — | — | ui K3·K8·K9 / O8·O9·O11 | 설계 |
| KH-06 | 저장·기본 150·범위 0~500·쓰기 거부·읽기 보정·옛 파일 150·초기화 150 | `DEFAULT_SETTINGS` | contract §3.3·§5.3 v1.2, TS 상수 | `settings::key_hold`, `Settings::validate`·`load` | `keyHoldMs` | core KC1~KC7 / bridge TB1·TB2 | 설계 |
| KH-07 | 설정 창 「크기 · 반응」 카드에서 슬라이더로 조절, 3개 국어(D-8) | settings **R-69 신설** / `ScaleIdleCard` 슬라이더, `generalValues.KEY_HOLD_STEP_MS`, i18n 3키 | `setSettings`(불변) | `update`(불변) | `keyHoldMs` | settings S1~S6 | 설계 |
| KH-08 | 프리셋 PS-02 포함, 옛·내장 프리셋 150(D-3) | settings R-59 개정, `presetSaveDesc` 3개 국어 | contract §5·§5.11 「5필드」 | `PresetSettings.key_hold_ms` | `keyHoldMs` | core KP1~KP4 / settings S7 | 설계 |
| KH-09 | 개인정보 — 유지 스냅숏은 마지막 누름 1건·특수 키 분류값 최대 1개·≤500ms·이력·저장·전송 없음(D-6) | overlay R-22 개정 주석, `snapshotKeys` | — | — | — | ui K5(최근 1개만) + 코드 검토(console·storage 0) | 설계 |

끊긴 곳 0 — 모든 행이 ui·bridge·core 중 해당 열을 갖거나 `—`(해당 없음)다. 계층별 집계: ui 9 · bridge 4(KH-01·03·06·08) · core 4(KH-01·03·06·08).

## 7. 비기능 목표

| 항목 | 목표 | 측정 |
|---|---|---|
| 리렌더 | 키 새 누름·뗌당 추가 렌더 0(스냅숏은 같은 리듀서 커밋). 유지 만료당 1회. 연속 타자 중 만료 렌더 0 | vitest — 렌더 횟수 spy 또는 `reduceOverlay`가 무변화 입력에 같은 객체 반환(K8) |
| 타이머 | 대기 중 setTimeout 최대 1개, 유지 없으면 0 | vitest `vi.getTimerCount()` 단언(O8) |
| 정확도 | 화면 유지 = N ± (IPC 지연 + 타이머 지연 수 ms) | fake timers로 경계 ±1ms 단언(O1) |
| 0일 때 | 보이는 상태 = 입력 상태(같은 객체) | K1·기존 TC 전부 |
| 개인정보 | 키 관련 값의 보관은 스냅숏 1건(≤ 500ms)뿐, `console`·`localStorage`·bridge 전송 0 | 코드 검토(verify-code-reviewer), grep |
| core | 설정 검증·보정 O(1), 새 스레드·채널 없음 | 코드 검토 |

## 8. 확정사항 갱신 문안 (메인 세션 몫 — `doc/000_프로젝트_확정사항.md`)

표기 방식은 기존 관례를 따른다 — 뒤집힌 문장은 취소선으로 남기고 바로 뒤에 대체 표시. CR 번호는 화면 쪽 기록 때 확정(예상 overlay CR-072·settings CR-073).

1. **§4 표 7행(키보드 파츠) 「동작」 칸** 끝에 추가:
   > **키 그림 최소 유지 (🔒 2026-11-01 사용자 지정, key-hold):** 키를 빨리 떼도 바뀐 그림(누름·특수 키)을 **누른 시점부터 최소 N ms**(설정 「키 그림 유지 시간」, 0~500ms, 기본 150) 보인 뒤 들림으로 돌아간다. 꾹 누르면 뗄 때까지. 유지 중 새 키를 누르면 즉시 바뀐다. 펜 손 누름 그림(`pen_down_0`)도 같다. 젤리는 그림이 남아 있는 동안 이어진다. 클릭 파츠는 해당 없음.
2. **§5 「특수 키 이미지」 줄** 끝에: 「떼면 기본 — (🔒 2026-11-01) 단 누른 시점부터 「키 그림 유지 시간」이 지난 뒤. 유지 동안 화면 표시용으로 마지막 누름의 분류값 1개만 잠시 둔다(기록·저장·전송 없음)」.
3. **§5 「바운스 시작 규칙」 줄** 끝에: 「(🔒 2026-11-01) 젤리 길이 — 떼는 순간 끊기지 않고 키 그림이 보이는 동안(누른 시점 + 유지 시간) 이어진다」.
4. **§6 설정 창 기본 탭(크기·반응)** 에: 「키 그림 유지 시간(슬라이더 0~500ms, 10ms 단위, 기본 150)」.
5. **§6 프리셋 PS-02(145행)**: 「배율, 휴식 시간(idleSeconds),」 뒤에 「키 그림 유지 시간(keyHoldMs, 🔒 2026-11-01),」 삽입.
6. **§6 마지막 줄 다음에 새 줄**:
   > - **키 그림 최소 유지 (🔒 2026-11-01 사용자 지정, key-hold):** 특수 키·일반 타자 그림이 너무 순식간에 바뀐다는 피드백. 최소 유지 방식(페이드 없음), 설정 창에서 조절(0~500ms, 기본 150 — 업데이트한 기존 사용자도 150). 프리셋에 포함. 계약 v1.2(추가). 설계: `doc/200_설계/architecture/key-hold-*.md`.
7. **CLAUDE.md §9 「감지」 줄**(메인 세션 판단): 「키 누름마다 젤리 바운스(CR-066)」 뒤에 「, 바뀐 키 그림은 최소 유지 시간(기본 150ms) 동안 보임」.

## 9. 문서 갱신 지도

| 문서 | 소유(갱신자) | 패킷 |
|---|---|---|
| `doc/200_설계/core/settings.md`·`doc/200_설계/core/presets.md` | core-designer | core §4 |
| `doc/200_설계/bridge/contract.md` | bridge-designer | bridge §2 |
| overlay `requirements.md`·`design.md`·`design/functions.md`·`design/components.md`·CR 대장 | ui-designer(CR 기록은 ui-manager 지시) | ui §A.4 |
| overlay `manual.md` | ui-manual-writer | ui §A.4 |
| overlay `test/scenarios.md`·`test/manual-checklist.md` | ui-test-designer | ui §A.5 |
| settings `requirements.md`·`design/general-tab.md`·`design/i18n.md`·`design/presets-tab.md`·`design.md`(RTM·계약 사용표)·CR 대장 | ui-designer | ui §B.4 |
| settings `manual.md` | ui-manual-writer | ui §B.4 |
| settings `test/scenarios.md` | ui-test-designer | ui §B.5 |
| `doc/000_프로젝트_확정사항.md`·`CLAUDE.md` | 메인 세션 | 이 문서 §8 |

## 10. 위험·확인 필요

| # | 내용 | 처리 |
|---|---|---|
| K-1 | `DEFAULT_SETTINGS.keyHoldMs = 150`이 overlay 테스트 19개 파일 픽스처에 spread로 들어가, ui 구현 직후 기존 「뗌 즉시」 단언(젤리·특수 키·펜 손·특수 키 숨김)이 대량 실패할 수 있다 | ui 패킷 §A **0단계**: 구현 전에 픽스처 전부에 `keyHoldMs: 0`(A-9). 0단계 뒤 기존 테스트 전부 PASS를 먼저 확인 |
| K-2 | bridge가 TS 필수 필드를 넣은 뒤 ui 0단계 전까지 `yarn tsc --noEmit`이 테스트 픽스처 약 52곳에서 실패(D-7) | bridge 패킷 수용 기준에 「TS2741 `keyHoldMs` 누락만, 대상 파일 목록 한정」으로 명시. 배포 전 ui 0단계까지 반드시 끝낸다 |
| K-3 | 기본 150이 모든 사용자에게 바로 적용되고(D-2) 젤리 길이·§10.6 5행 시점이 달라진다 — 체감 변화 | 사용자 결정 D-2·D-4로 승인받는다. 설정 0이면 현행과 같음(KH-03) |
| K-4 | 오버레이를 트레이로 숨긴 동안 WebView2가 타이머를 늦추면 유지가 길어질 수 있다 | 숨김 중이라 보이지 않는다(수용). 다시 보일 때 다음 타이머 실행으로 끝난다(상한 500ms는 지연 계산에만 적용) |
| K-5 | `settings/mod.rs` 777줄 — 한계 800 | core 패킷 §1: `mod.rs` 추가는 15줄 이하, 나머지는 `key_hold.rs`. 완료 기준에 줄 수 포함 |
