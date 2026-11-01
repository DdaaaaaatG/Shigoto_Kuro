/**
 * 보이는 키 상태(표시 전용, 순수 TS — R-42 키 그림 최소 유지, 🔒 2026-11-01 key-hold).
 *
 * 입력 상태기계(inputMachine)는 「지금 눌려 있는가」라는 사실만 다룬다. 이 모듈은 그 위에 「최소 N ms는
 * 보인다」는 표시 규칙을 얹는다 — 새 누름(bounceSeq 증가)마다 그 순간의 키 필드 4개(kbDown·kbFrame·
 * specialHeld·clickHeld)를 찍어 두고(유지 스냅숏), 누른 ts + keyHoldMs까지 그림 선택 함수에 그 값을 넘긴다.
 * - keyHoldMs ≤ 0이면 스냅숏을 만들지 않는다 → visibleMachine이 machine 그 객체를 돌려준다(현행과 같음).
 * - 만료는 OverlayApp의 setTimeout이 { type: 'holdEnd', seq }로 알린다(seq가 다르면 무시).
 * - 개인정보(R-22 개정): 스냅숏은 마지막 누름 1건, 특수 키 분류값은 가장 최근 1개만, 최대 500ms.
 *   이력·횟수·console·storage·bridge 전송 없음. 결과(보이는 상태)는 렌더 전용 — reduce에 다시 넣지 않는다.
 */
import { KEY_HOLD_MS_MAX } from 'bridge/types'
import {
  createInitialState,
  currentSpecial,
  reduce,
  type MachineConfig,
  type MachineInput,
  type MachineState,
} from './inputMachine'

/** 유지 스냅숏에 담는 키 필드 — 그림 선택 함수가 읽는 4개뿐. heldCount·mouse·layer·반복 필드는 담지 않는다 */
export type HeldKeys = Pick<MachineState, 'kbDown' | 'kbFrame' | 'specialHeld' | 'clickHeld'>

/** 마지막 새 누름의 유지 스냅숏. seq = 그때의 bounceSeq(낡은 만료 신호를 가려내는 번호) */
export interface KeyHold {
  seq: number
  /** 이 시각(epoch ms, 이벤트 ts 기준)까지 keys를 보인다 */
  until: number
  keys: HeldKeys
}

/** 오버레이 리듀서 상태 — 입력 상태(machine, 사실)와 유지 스냅숏(hold, 표시 규칙)을 같은 커밋에서 함께 바꾼다 */
export interface OverlayState {
  machine: MachineState
  hold: KeyHold | null
}

/** 입력 상태기계 입력 + 유지 만료 신호 */
export type OverlayInput = MachineInput | { type: 'holdEnd'; seq: number }

export const createOverlayState = (now: number): OverlayState => ({
  machine: createInitialState(now),
  hold: null,
})

const inputTs = (input: MachineInput): number => (input.type === 'tick' ? input.now : input.ts)

/** 새 누름 직후의 키 필드. 특수 키는 가장 최근 1개만 남긴다(R-22 최소 보관 — D-6) */
const snapshotKeys = (m: MachineState): HeldKeys => {
  const special = currentSpecial(m)
  return {
    kbDown: m.kbDown,
    kbFrame: m.kbFrame,
    specialHeld: special === null ? [] : [special],
    clickHeld: m.clickHeld,
  }
}

/** 새 누름 = bounceSeq 증가(키 새 누름·펜 모드 새 클릭 누름 — 뗌·자동 반복·같은 버튼 중복은 증가 없음) */
export const nextKeyHold = (
  prev: KeyHold | null,
  before: MachineState,
  after: MachineState,
  ts: number,
  holdMs: number,
): KeyHold | null => {
  if (after.bounceSeq === before.bounceSeq) return prev
  if (!(holdMs > 0)) return null // 0·NaN·undefined → 유지 없음(현행)
  return { seq: after.bounceSeq, until: ts + holdMs, keys: snapshotKeys(after) }
}

/** 렌더 전용. 유지 없음이면 machine 그 객체(0 = 현행 보장). 결과를 reduce에 다시 넣지 않는다 */
export const visibleMachine = (machine: MachineState, hold: KeyHold | null): MachineState =>
  hold === null ? machine : { ...machine, ...hold.keys }

/** 만료까지 남은 ms — 시스템 시계가 튀어도 0~KEY_HOLD_MS_MAX 안(A-3) */
export const holdDelay = (hold: KeyHold, now: number): number =>
  Math.min(KEY_HOLD_MS_MAX, Math.max(0, hold.until - now))

/** 입력 상태기계 한 걸음 + 유지 스냅숏 갱신. 둘 다 그대로면 같은 state 객체(리렌더 없음) */
export const reduceOverlay = (
  state: OverlayState,
  input: OverlayInput,
  config: MachineConfig,
  holdMs: number,
): OverlayState => {
  if (input.type === 'holdEnd') {
    return state.hold !== null && state.hold.seq === input.seq ? { ...state, hold: null } : state
  }
  const machine = reduce(state.machine, input, config)
  const hold = nextKeyHold(state.hold, state.machine, machine, inputTs(input), holdMs)
  return machine === state.machine && hold === state.hold ? state : { machine, hold }
}
