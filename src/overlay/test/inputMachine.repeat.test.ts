/**
 * overlay 상태기계 자동 반복(부르르) TC — CR-023(R-24 키 꾹 누름 = 부르르).
 * 대상: src/state/inputMachine.ts — design/functions.md §5.2 `reduce` 자동 반복 행·`tick` 반복 끊김 방어 행·
 *   `isRepeating`·`wrapMotion`(①~④)·`WrapMotion`·`MachineState.repeating/lastRepeatAt/shiverSeq`·`REPEAT_TIMEOUT_MS`,
 *   design.md §4 `machine` 초기값·상수표, §6 P-3, §10.3 부르르 규칙 1~4, §10.6 9행(CR-023).
 * 반복 누름 = `repeat === true && pressed === true`. `repeat` 필드가 없으면 false(옛 규칙 — TC-133 계열).
 * 시간은 주입(ts·now 인자). 실제 sleep 없음. 입력 순서를 파일·스냅샷·로그로 남기지 않는다(R-22).
 * 시나리오: src/overlay/test/scenarios.md TC-160 ~ TC-168
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  REPEAT_TIMEOUT_MS,
  bouncePhase,
  createInitialState,
  currentSpecial,
  isRepeating,
  reduce,
  wrapMotion,
  type MachineConfig,
  type MachineInput,
  type MachineState,
  type SpecialKey,
  type WrapMotion,
} from 'state/inputMachine'

const T0 = 1_000_000
const config: MachineConfig = { idleMs: 300_000, kbFrames: 3 }

/** repeat 인자를 주지 않으면 필드 자체가 없는 입력(bridge 개정 전 형태) */
const key = (
  pressed: boolean,
  heldCount: number,
  special: SpecialKey | null,
  ts: number,
  repeat?: boolean,
): MachineInput =>
  repeat === undefined
    ? { type: 'key', pressed, heldCount, special, ts }
    : { type: 'key', pressed, heldCount, special, repeat, ts }
/** 자동 반복 누름(pressed true · repeat true) */
const rep = (heldCount: number, special: SpecialKey | null, ts: number) => key(true, heldCount, special, ts, true)
const tick = (now: number): MachineInput => ({ type: 'tick', now })
const run = (s: MachineState, ...inputs: MachineInput[]) => inputs.reduce((acc, i) => reduce(acc, i, config), s)

/** 상태 A: Z 처음 누름(T0+10) — bounceSeq 1 · kbFrame 1 · ['z'] */
const pressedZ = () => run(createInitialState(T0), key(true, 1, 'z', T0 + 10))
/** 상태 B: A에서 Z 자동 반복 누름(T0+510) — 부르르 중 */
const repeatingZ = () => run(pressedZ(), rep(1, 'z', T0 + 510))

describe('초기값·isRepeating (design.md §4, design/functions.md §5.2)', () => {
  it('TC-160: 초기 repeating false·lastRepeatAt 0·shiverSeq -1, REPEAT_TIMEOUT_MS 500, isRepeating = repeating && kbDown', () => {
    const s0 = createInitialState(T0)
    expect(s0.repeating).toBe(false)
    expect(s0.lastRepeatAt).toBe(0)
    expect(s0.shiverSeq).toBe(-1)
    expect(REPEAT_TIMEOUT_MS).toBe(500)
    expect(isRepeating(s0)).toBe(false)
    expect(wrapMotion(s0)).toBeNull()
    expect(isRepeating({ ...s0, repeating: true, kbDown: true })).toBe(true)
    expect(isRepeating({ ...s0, repeating: true, kbDown: false })).toBe(false)
    expect(isRepeating({ ...s0, repeating: false, kbDown: true })).toBe(false)
  })
})

describe('reduce — 자동 반복 누름 (design/functions.md §5.2 자동 반복 행)', () => {
  it('TC-161: 반복 누름은 repeating·lastRepeatAt·shiverSeq·lastInputAt만 바꾸고 bounceSeq·kbFrame·specialHeld는 그대로', () => {
    const a = pressedZ()
    expect([a.bounceSeq, a.kbFrame, a.specialHeld, a.repeating]).toEqual([1, 1, ['z'], false])
    // ① 첫 반복
    const b = reduce(a, rep(1, 'z', T0 + 510), config)
    expect(b).toEqual({ ...a, repeating: true, lastRepeatAt: T0 + 510, shiverSeq: 1, lastInputAt: T0 + 510 })
    expect(isRepeating(b)).toBe(true)
    expect(wrapMotion(b)).toBe('shiver')
    // ② 반복 계속 — lastRepeatAt·lastInputAt만 갱신
    const c = reduce(b, rep(1, 'z', T0 + 543), config)
    expect(c).toEqual({ ...b, lastRepeatAt: T0 + 543, lastInputAt: T0 + 543 })
    // ③ 두 특수 키 눌린 채 먼저 누른 키의 반복 → 목록 순서 그대로(맨 뒤로 옮기지 않음, §10.6 9행 CR-023)
    const two = run(createInitialState(T0), key(true, 1, 'space', T0 + 10), key(true, 2, 'enter', T0 + 20))
    const tr = reduce(two, rep(2, 'space', T0 + 520), config)
    expect(tr.specialHeld).toEqual(['space', 'enter'])
    expect(currentSpecial(tr)).toBe('enter')
    expect([tr.bounceSeq, tr.kbFrame, tr.shiverSeq, tr.repeating]).toEqual([2, 2, 2, true])
    // ④ 쉬는중에서 반복 누름 → 대기(공통 규칙)
    const rested = reduce(a, tick(T0 + 10 + 300_000), config)
    expect(rested.layer).toBe('rest')
    const woke = reduce(rested, rep(1, 'z', T0 + 300_020), config)
    expect([woke.layer, woke.lastInputAt, woke.repeating]).toEqual(['idle', T0 + 300_020, true])
    // ⑤ heldCount 0으로 온 반복 누름 → repeating false·specialHeld 비움(④ 규칙 적용), bounceSeq·kbFrame 불변
    const zero = reduce(a, rep(0, 'z', T0 + 510), config)
    expect([zero.repeating, zero.kbDown, zero.specialHeld, zero.bounceSeq, zero.kbFrame]).toEqual([false, false, [], 1, 1])
  })

  it('TC-162: 반복 아닌 key(뗌·새 일반 키·pressed false+repeat true·새 특수 키·repeat 없음·repeat false) → repeating false, lastRepeatAt·shiverSeq 불변', () => {
    const b = repeatingZ()
    const cases: Array<[MachineInput, Partial<MachineState>, WrapMotion]> = [
      [key(false, 0, 'z', T0 + 600), { kbDown: false, heldCount: 0, specialHeld: [], bounceSeq: 1 }, null],
      [key(true, 2, null, T0 + 600), { kbDown: true, heldCount: 2, specialHeld: ['z'], bounceSeq: 1, kbFrame: 2 }, null],
      [key(false, 0, 'z', T0 + 600, true), { kbDown: false, heldCount: 0, specialHeld: [], bounceSeq: 1 }, null],
      [key(true, 2, 'space', T0 + 600), { kbDown: true, specialHeld: ['z', 'space'], bounceSeq: 2, kbFrame: 2 }, 0],
      [key(true, 1, 'z', T0 + 600), { kbDown: true, specialHeld: ['z'], bounceSeq: 1, kbFrame: 2 }, null],
      [key(true, 1, 'z', T0 + 600, false), { kbDown: true, specialHeld: ['z'], bounceSeq: 1, kbFrame: 2 }, null],
    ]
    for (const [input, expected, motion] of cases) {
      const s = reduce(b, input, config)
      expect(s.repeating).toBe(false)
      expect(s.lastRepeatAt).toBe(T0 + 510)
      expect(s.shiverSeq).toBe(1)
      expect(s.lastInputAt).toBe(T0 + 600)
      expect(s).toMatchObject(expected)
      expect(isRepeating(s)).toBe(false)
      expect(wrapMotion(s)).toBe(motion)
    }
  })

  it('TC-163: mouseMove·mouseButton은 repeating·lastRepeatAt을 바꾸지 않는다 — 끊김 방어는 lastRepeatAt 기준', () => {
    const m = run(
      repeatingZ(),
      { type: 'mouseMove', x: 10, y: 20, ts: T0 + 600 },
      { type: 'mouseButton', button: 'left', pressed: true, ts: T0 + 650 },
      { type: 'mouseButton', button: 'left', pressed: false, ts: T0 + 700 },
    )
    expect([m.repeating, m.lastRepeatAt, m.shiverSeq, m.lastInputAt]).toEqual([true, T0 + 510, 1, T0 + 700])
    expect(wrapMotion(m)).toBe('shiver')
    const t = reduce(m, tick(T0 + 1010), config) // 마지막 반복 뒤 500ms, 마지막 입력 뒤 310ms
    expect([t.repeating, t.lastInputAt]).toEqual([false, T0 + 700])
    expect(wrapMotion(t)).toBeNull()
  })
})

describe('reduce — tick 반복 끊김 방어 (design/functions.md §5.2 tick 행, design.md §6 P-3)', () => {
  it('TC-164: 마지막 반복 뒤 499ms는 같은 참조, 500ms면 repeating false(나머지 불변), 이후 tick은 같은 참조', () => {
    const b = repeatingZ()
    expect(reduce(b, tick(T0 + 510 + 499), config)).toBe(b)
    const s2 = reduce(b, tick(T0 + 510 + 500), config)
    expect(s2).not.toBe(b)
    expect(s2).toEqual({ ...b, repeating: false })
    expect(isRepeating(s2)).toBe(false)
    expect([bouncePhase(s2), wrapMotion(s2)]).toEqual([1, null])
    expect(reduce(s2, tick(T0 + 510 + 600), config)).toBe(s2)
    // 반복 중이 아니면 방어는 아무것도 바꾸지 않는다
    const a = pressedZ()
    expect(reduce(a, tick(T0 + 10 + 500), config)).toBe(a)
  })
})

describe('wrapMotion (design/functions.md §5.2, design.md §10.3 부르르 규칙)', () => {
  it('TC-165: ① 부르르 우선 ② kbDown 아니면 null ③ bounceSeq === shiverSeq면 null ④ 그 밖 bouncePhase — 설계 예 5개', () => {
    const s0 = createInitialState(T0)
    const at = (o: Partial<MachineState>): MachineState => ({ ...s0, ...o })
    // design/functions.md §5.2 wrapMotion 예 5개
    expect(wrapMotion(at({ kbDown: true, heldCount: 1, bounceSeq: 1, shiverSeq: -1, repeating: false }))).toBe(1)
    expect(wrapMotion(at({ kbDown: true, heldCount: 1, bounceSeq: 1, shiverSeq: 1, repeating: true }))).toBe('shiver')
    expect(wrapMotion(at({ kbDown: true, heldCount: 2, bounceSeq: 1, shiverSeq: 1, repeating: false }))).toBeNull()
    expect(wrapMotion(at({ kbDown: true, heldCount: 2, bounceSeq: 2, shiverSeq: 1, repeating: false }))).toBe(0)
    expect(wrapMotion(at({ kbDown: false, heldCount: 0, bounceSeq: 2, shiverSeq: 1, repeating: false }))).toBeNull()
    // 우선순위·경계
    expect(wrapMotion(at({ kbDown: true, heldCount: 1, bounceSeq: 2, shiverSeq: 1, repeating: true }))).toBe('shiver')
    expect(wrapMotion(at({ kbDown: false, heldCount: 0, bounceSeq: 2, shiverSeq: 1, repeating: true }))).toBeNull()
    for (const seq of [3, 4]) {
      const s = at({ kbDown: true, heldCount: 1, bounceSeq: seq, shiverSeq: 1 })
      expect(wrapMotion(s)).toBe(bouncePhase(s))
    }
  })

  it('TC-166: 반복 중 특수 키 새 누름 → 젤리, 그 키 반복 → 부르르, 그 키 뗌 → 정지, 남은 키 반복 → 재시작', () => {
    const steps: Array<[MachineInput, WrapMotion, Partial<MachineState>]> = [
      [key(true, 1, null, T0 + 10), 1, { bounceSeq: 1, kbFrame: 1, repeating: false, shiverSeq: -1 }],
      [rep(1, null, T0 + 510), 'shiver', { bounceSeq: 1, kbFrame: 1, repeating: true, shiverSeq: 1 }],
      [key(true, 2, 'space', T0 + 540), 0, { bounceSeq: 2, kbFrame: 2, repeating: false, shiverSeq: 1, specialHeld: ['space'] }],
      [rep(2, 'space', T0 + 1040), 'shiver', { bounceSeq: 2, kbFrame: 2, repeating: true, shiverSeq: 2, specialHeld: ['space'] }],
      [key(false, 1, 'space', T0 + 1100), null, { bounceSeq: 2, kbDown: true, heldCount: 1, repeating: false, specialHeld: [] }],
      [rep(1, null, T0 + 1600), 'shiver', { bounceSeq: 2, kbFrame: 2, repeating: true, shiverSeq: 2 }],
      [key(false, 0, null, T0 + 1650), null, { kbDown: false, repeating: false, bounceSeq: 2 }],
    ]
    let s = createInitialState(T0)
    for (const [input, motion, expected] of steps) {
      s = reduce(s, input, config)
      expect(wrapMotion(s)).toBe(motion)
      expect(s).toMatchObject(expected)
    }
  })

  it('TC-167: shiverSeq — 부르르가 끝나도 같은 번호의 젤리는 되살아나지 않고, 모두 뗀 뒤 첫 누름은 새 젤리', () => {
    const b = repeatingZ() // bounceSeq 1 · shiverSeq 1
    // ① 500ms 방어로 꺼짐 — bouncePhase는 1이지만 wrapMotion은 null
    const off = reduce(b, tick(T0 + 1010), config)
    expect([bouncePhase(off), wrapMotion(off)]).toEqual([1, null])
    // ② 반복 키 누른 채 일반 키 새 누름 → 그 키 뗌
    const plus = reduce(b, key(true, 2, null, T0 + 600), config)
    expect([plus.bounceSeq, bouncePhase(plus), wrapMotion(plus)]).toEqual([1, 1, null])
    const minus = reduce(plus, key(false, 1, null, T0 + 650), config)
    expect(wrapMotion(minus)).toBeNull()
    // ③ 모두 뗌 → 새 첫 누름 = 새 번호 젤리
    const released = reduce(minus, key(false, 0, 'z', T0 + 700), config)
    expect(wrapMotion(released)).toBeNull()
    const again = reduce(released, key(true, 1, null, T0 + 800), config)
    expect([again.bounceSeq, again.shiverSeq, wrapMotion(again)]).toEqual([2, 1, 0])
  })
})

describe('입력 비보관 (design/functions.md §5.2 기록 금지 — CR-023 필드)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('TC-168: repeating·lastRepeatAt·shiverSeq는 키 정보를 담지 않는다 — 필드 집합 불변·분류값 흔적 없음·console/저장소 0회', () => {
    const logs = (['log', 'info', 'warn', 'error', 'debug'] as const).map(m =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    )
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const s0 = createInitialState(T0)
    const keys0 = Object.keys(s0).sort()
    const inputs = [
      key(true, 1, 'z', T0 + 10),
      rep(1, 'z', T0 + 510),
      rep(1, 'z', T0 + 543),
      rep(1, 'z', T0 + 576),
      key(false, 0, 'z', T0 + 600),
      key(true, 1, 'space', T0 + 700),
      rep(1, 'space', T0 + 1200),
      key(false, 0, 'space', T0 + 1300),
    ]
    let s = s0
    for (const i of inputs) {
      s = reduce(s, i, config)
      expect(Object.keys(s).sort()).toEqual(keys0)
    }
    expect([s.repeating, s.lastRepeatAt, s.shiverSeq, s.bounceSeq]).toEqual([false, T0 + 1200, 2, 2])
    const json = JSON.stringify(s)
    for (const v of ['"z"', '"space"']) expect(json).not.toContain(v)
    for (const spy of logs) expect(spy).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })
})
