/**
 * 입력 상태기계 (순수 TS, 부수효과 없음) — doc/000_프로젝트_확정사항.md §5 상태 전이의 단일 구현.
 *
 * 입력: bridge 이벤트(키보드·마우스 이동·마우스 버튼)와 주기적 tick.
 * 출력: 오버레이가 그대로 렌더할 수 있는 상태(레이어·키보드 프레임·마우스 위치/버튼·특수 키·바운스 신호).
 *
 * 규칙
 * - 아무 입력 없음 → layer 'idle'
 * - idleMs 동안 무입력 → 'rest'. 어떤 입력이든 오면 'idle' 복귀
 * - 키 누름: heldCount(동시에 눌린 키 수) 갱신, kbDown = heldCount > 0, 새 누름마다 프레임 순환
 *   (동시 키 수는 상태 레이어에 영향을 주지 않는다 — 쾅(slam) 메커니즘은 CR-019로 삭제됐다)
 * - 마우스 이동: 좌표 갱신 / 버튼: 누르는 동안만 button 유지
 * - 특수 키(CR-021, R-22): `specialHeld`가 지금 눌린 특수 키 분류값을 누른 순서로 담는다(길이 ≤ 7).
 *   키 정보는 이 분류값뿐이며 이력·횟수·시각은 남기지 않는다(design.md §10.6 기록 금지).
 * - 바운스(CR-021 추가 결정 · CR-066): `bounceSeq`는 새 키 누름(자동 반복 아님)마다 +1되는 신호일 뿐 어떤
 *   키였는지는 담지 않는다 — 다른 키나 마우스 버튼을 누른 채여도 매번 다시 시작한다(CR-066이 CR-027의
 *   「이미 누르고 있으면 재생 안 함」을 대체). 렌더는 `bouncePhase`(짝홀)로 두 keyframe을 번갈아 재생한다.
 * - 자동 반복(CR-023, R-24): `repeat && pressed`인 `key` 입력은 프레임·특수 키 목록·바운스 신호를 바꾸지 않고
 *   `repeating`만 켠다. `tick`은 마지막 반복 뒤 REPEAT_TIMEOUT_MS(500ms)가 지나면 `repeating`을 끈다(뗌 누락
 *   방어). 렌더는 `wrapMotion`(부르르 우선, 그 다음 `bouncePhase`)으로 젤리와 부르르 중 하나만 고른다.
 * - 펜 모드 클릭(CR-027, R-26): `config.clickPress`가 `true`(펜 모드)면 클릭 누름도 키 누름처럼 센다
 *   (`clickHeld`에 추가, `kbFrame` 순환, 클릭 누름은 아무것도 안 눌린 상태의 첫 누름만 바운스 재생 — `isPressing`
 *   기준. 클릭을 누른 채 새로 누른 키는 CR-066에 따라 바운스를 다시 시작한다).
 *   뗌은 모드와 무관하게 항상 `clickHeld`에서 제거한다. 이 파일은 「펜」을 모른다 — 스위치 하나만 받는다.
 */
import type { KeyboardInputEvent } from 'bridge/types'

export type LayerState = 'idle' | 'rest'
export type MouseButtonState = 'none' | 'left' | 'right'
/** 펜 모드(config.clickPress)에서 클릭 누름으로 세는 버튼(CR-027, R-26). `clickHeld` 원소 타입 */
export type ClickButton = Exclude<MouseButtonState, 'none'>

/** 특수 키 7종 분류값(CR-021, R-22). bridge `KeyboardInputEvent.special`과 같은 값 — 🔒 이름. */
export type SpecialKey = NonNullable<KeyboardInputEvent['special']>

/** `isSpecialKey` 판정용 7종(순서 고정) */
export const SPECIAL_KEYS: readonly SpecialKey[] = [
  'space',
  'z',
  'question',
  'exclamation',
  'enter',
  'backspace',
  'undo',
]

/** `v`가 특수 키 7종 중 하나인지(그 밖의 문자열·undefined·null·숫자·객체는 false) */
export const isSpecialKey = (v: unknown): v is SpecialKey =>
  (SPECIAL_KEYS as readonly unknown[]).includes(v)

/** 렌더가 쓰는 바운스 신호 — null이면 바운스 클래스 없음, 0/1은 번갈아 쓰는 두 클래스 */
export type BouncePhase = 0 | 1 | null

/** 젤리 래퍼에 걸 움직임(CR-023) — 부르르가 `BouncePhase`에 더해진 값 */
export type WrapMotion = BouncePhase | 'shiver'

/** 마지막 자동 반복 누름 뒤 이만큼 반복이 없으면 `tick`이 부르르를 끈다(뗌 누락 방어, CR-023). 설정값 아님 */
export const REPEAT_TIMEOUT_MS = 500

export type MachineInput =
  | {
      type: 'key'
      pressed: boolean
      heldCount: number
      special: SpecialKey | null
      /** (CR-023) true = OS 자동 반복 누름. 없으면 false(bridge 개정 전·뗌 이벤트와 같은 취급) */
      repeat?: boolean
      ts: number
    }
  | { type: 'mouseMove'; x: number; y: number; ts: number }
  | { type: 'mouseButton'; button: 'left' | 'right'; pressed: boolean; ts: number }
  | { type: 'tick'; now: number }

export interface MachineState {
  layer: LayerState
  /** 동시에 눌려 있는 키 수 (bridge 가 알려준 값) */
  heldCount: number
  kbDown: boolean
  /** 현재 보여줄 키보드 누름 프레임 인덱스 (0..kbFrames-1) */
  kbFrame: number
  mouse: { x: number; y: number; button: MouseButtonState }
  lastInputAt: number
  /** 지금 눌려 있는 특수 키(누른 순서, 마지막 = 가장 최근). 길이 ≤ 7. 이력이 아니다(R-22 기록 금지) */
  specialHeld: readonly SpecialKey[]
  /** 바운스 재생 신호(짝홀만 의미). 어떤 키였는지 담지 않는다 */
  bounceSeq: number
  /** (CR-023) 지금 자동 반복 누름이 이어지는 중인가. 어떤 키였는지 담지 않는다 */
  repeating: boolean
  /** (CR-023) 마지막 반복 누름의 ts. `tick` 끊김 방어에만 쓴다(lastInputAt과 별개 — 마우스 이동이 방어를 늦추지 않게) */
  lastRepeatAt: number
  /** (CR-023) 부르르가 시작될 때의 bounceSeq. 부르르가 끝나도 같은 번호의 젤리가 되살아나지 않게 막는다 */
  shiverSeq: number
  /**
   * (CR-027) 펜 모드(config.clickPress)에서 지금 눌려 있는 클릭 버튼(누른 순서, 중복 없음, 길이 ≤ 2).
   * 누름은 펜 모드일 때만 추가하고 뗌은 항상 제거한다(onMouseButton). mouse.button(클릭 파츠용, 마지막
   * 이벤트 기준)과는 별개 — 「아직 눌린 버튼이 있는가」 판정(isPressing)에는 이 필드를 쓴다
   */
  clickHeld: readonly ClickButton[]
}

export interface MachineConfig {
  idleMs: number
  /** 등록된 키보드 누름 이미지 수 (최소 1) */
  kbFrames: number
  /**
   * (CR-027) true면 펜 모드 — 클릭 누름을 키 누름처럼 센다(onMouseButton). 선택 필드라 기존 픽스처
   * `{ idleMs, kbFrames }`가 그대로 컴파일된다. OverlayApp이 isPenMode(manifest)로 채운다
   */
  clickPress?: boolean
}

export const DEFAULT_MACHINE_CONFIG: MachineConfig = {
  idleMs: 300_000,
  kbFrames: 1,
  clickPress: false,
}

export const createInitialState = (now: number): MachineState => ({
  layer: 'idle',
  heldCount: 0,
  kbDown: false,
  kbFrame: 0,
  mouse: { x: 0, y: 0, button: 'none' },
  lastInputAt: now,
  specialHeld: [],
  bounceSeq: 0,
  repeating: false,
  lastRepeatAt: 0,
  shiverSeq: -1,
  clickHeld: [],
})

/**
 * 지금 무언가 누르고 있는가(CR-027) — 키(kbDown) 또는 펜 모드에서 누른 클릭 버튼(clickHeld). 펜 모드가
 * 아니면 clickHeld가 늘 []라 kbDown과 같다. mouse.button(클릭 파츠용)은 판정에 쓰지 않는다
 */
export const isPressing = (state: MachineState): boolean => state.kbDown || state.clickHeld.length > 0

/** 렌더용 바운스 짝홀. 아무것도 누르고 있지 않으면 null(design.md §10.3. CR-027: kbDown → isPressing) */
export const bouncePhase = (state: MachineState): BouncePhase =>
  isPressing(state) ? (state.bounceSeq % 2 === 0 ? 0 : 1) : null

/** 지금 눌린 특수 키 중 가장 최근(목록 마지막), 없으면 null */
export const currentSpecial = (state: MachineState): SpecialKey | null =>
  state.specialHeld.length > 0 ? state.specialHeld[state.specialHeld.length - 1] : null

/**
 * 지금 부르르가 이어지는 중인가(CR-023) — 반복 중이어도 모든 키를 뗀 뒤라면 false.
 * CR-027: 바꾸지 않는다(isPressing이 아니라 kbDown) — 클릭 버튼만 눌린 동안에는 부르르가 없다
 */
export const isRepeating = (state: MachineState): boolean => state.repeating && state.kbDown

/**
 * 젤리 래퍼에 걸 움직임 하나(design.md §10.3·design/functions.md §5.2, CR-023).
 * ① 부르르 중이면 최우선 ② 아무것도 누르고 있지 않으면 없음(CR-027: kbDown → isPressing) ③ 이 번호의
 * 젤리가 이미 부르르로 대체됐으면 없음 ④ 그 밖에는 `bouncePhase` 그대로
 */
export const wrapMotion = (state: MachineState): WrapMotion => {
  if (isRepeating(state)) return 'shiver'
  if (!isPressing(state)) return null
  if (state.bounceSeq === state.shiverSeq) return null
  return bouncePhase(state)
}

const wake = (state: MachineState, ts: number): MachineState => ({
  ...state,
  lastInputAt: ts,
  layer: state.layer === 'rest' ? 'idle' : state.layer,
})

/**
 * 특수 키 목록 갱신(design.md §10.6, design/functions.md §5.2 ①~④).
 * ① special null → 그대로 ② 눌림 → 빼고 맨 뒤에 추가 ③ 뗌 → 그 값만 제거 ④ held===0 → 비움(뗌 누락 방어)
 */
const nextSpecialHeld = (
  specialHeld: readonly SpecialKey[],
  special: SpecialKey | null,
  pressed: boolean,
  held: number,
): readonly SpecialKey[] => {
  const withoutSpecial = special === null ? specialHeld : specialHeld.filter(s => s !== special)
  const next = special !== null && pressed ? [...withoutSpecial, special] : withoutSpecial
  return held === 0 ? [] : next
}

/**
 * 자동 반복 누름(CR-023, design/functions.md §5.2 자동 반복 행) — `repeat && pressed`일 때만.
 * kbFrame·specialHeld 순서·bounceSeq는 바꾸지 않는다(젤리 재시작 없음). `specialHeld`는 held===0일 때만 비운다.
 */
const onKeyRepeat = (state: MachineState, heldCount: number, ts: number): MachineState => {
  const woke = wake(state, ts)
  const held = Math.max(0, heldCount)
  return {
    ...woke,
    heldCount: held,
    kbDown: held > 0,
    specialHeld: held === 0 ? [] : state.specialHeld,
    repeating: held > 0,
    lastRepeatAt: ts,
    shiverSeq: state.bounceSeq,
  }
}

const onKey = (
  state: MachineState,
  pressed: boolean,
  heldCount: number,
  special: SpecialKey | null,
  repeat: boolean,
  ts: number,
  config: MachineConfig,
): MachineState => {
  if (repeat && pressed) return onKeyRepeat(state, heldCount, ts)

  const woke = wake(state, ts)
  const held = Math.max(0, heldCount)
  const frames = Math.max(1, config.kbFrames)
  const kbFrame = pressed ? (state.kbFrame + 1) % frames : state.kbFrame
  // CR-066(design/functions.md §5.2 ⓐ): 새 누름(자동 반복은 위에서 걸렀다)은 다른 키·마우스 버튼을 누른 채여도
  // 매번 바운스를 다시 시작한다 — CR-027의 `!isPressing(state)` 조건을 대체. 특수 키 새 누름(ⓑ)도 여기에 포함된다
  const bounceSeq = pressed ? state.bounceSeq + 1 : state.bounceSeq

  return {
    ...woke,
    heldCount: held,
    kbDown: held > 0,
    kbFrame,
    specialHeld: nextSpecialHeld(state.specialHeld, special, pressed, held),
    bounceSeq,
    repeating: false,
  }
}

/**
 * 마우스 버튼 입력(design/functions.md §5.2 `onMouseButton` ①~④, CR-027). 클릭 파츠 교체용 `mouse.button`은
 * 항상 갱신한다(R-09, 기존 규칙). 뗌은 모드와 무관하게 `clickHeld`에서 항상 제거한다(모드 전환 중에 눌린
 * 버튼이 남지 않게). 새 클릭 누름(펜 모드에서만)은 키 누름과 같은 카운터(kbFrame)를 돌리고, 누르기 전 아무
 * 것도 누르고 있지 않았을 때만 바운스를 재생한다(isPressing, 갱신 전 state 기준). `specialHeld`·`heldCount`·
 * `kbDown`·`repeating`·`lastRepeatAt`·`shiverSeq`는 바꾸지 않는다 — 클릭은 특수 키가 아닌 일반 누름이고
 * 부르르 대상이 아니다.
 */
const onMouseButton = (
  state: MachineState,
  button: ClickButton,
  pressed: boolean,
  ts: number,
  config: MachineConfig,
): MachineState => {
  const woke = wake(state, ts)
  const mouse: MachineState['mouse'] = { ...state.mouse, button: pressed ? button : 'none' }

  if (!pressed) {
    return { ...woke, mouse, clickHeld: state.clickHeld.filter(b => b !== button) }
  }
  if (config.clickPress !== true || state.clickHeld.includes(button)) {
    return { ...woke, mouse }
  }

  const frames = Math.max(1, config.kbFrames)
  return {
    ...woke,
    mouse,
    kbFrame: (state.kbFrame + 1) % frames,
    bounceSeq: isPressing(state) ? state.bounceSeq : state.bounceSeq + 1,
    clickHeld: [...state.clickHeld, button],
  }
}

const onTick = (state: MachineState, now: number, config: MachineConfig): MachineState => {
  const idle = state.layer === 'idle' && now - state.lastInputAt >= config.idleMs
  const repeatTimedOut = state.repeating && now - state.lastRepeatAt >= REPEAT_TIMEOUT_MS
  if (!idle && !repeatTimedOut) return state
  return {
    ...state,
    ...(idle ? { layer: 'rest' as const } : {}),
    ...(repeatTimedOut ? { repeating: false } : {}),
  }
}

export const reduce = (
  state: MachineState,
  input: MachineInput,
  config: MachineConfig = DEFAULT_MACHINE_CONFIG,
): MachineState => {
  switch (input.type) {
    case 'key':
      return onKey(state, input.pressed, input.heldCount, input.special, input.repeat === true, input.ts, config)
    case 'mouseMove':
      return { ...wake(state, input.ts), mouse: { ...state.mouse, x: input.x, y: input.y } }
    case 'mouseButton':
      return onMouseButton(state, input.button, input.pressed, input.ts, config)
    case 'tick':
      return onTick(state, input.now, config)
  }
}
