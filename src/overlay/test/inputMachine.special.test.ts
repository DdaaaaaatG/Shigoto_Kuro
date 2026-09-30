/**
 * 특수 키 상태기계 TC — design/functions.md §5.2(reduce key의 특수 키 추적 ①~④·바운스 재생 카운터 ⓐⓑ·
 * bouncePhase·currentSpecial·isSpecialKey·SpecialKey·SPECIAL_KEYS·기록 금지), design.md §10.6 규칙표 1~13행, §10.3.
 * CR-021(R-22 + 추가 결정 ①~③ 🔒 2026-09-24).
 * 대상: src/state/inputMachine.ts (순수 함수 — React·Tauri·DOM 의존 없음)
 * 시간은 주입한다(ts·now 인자). 실제 sleep 없음. 입력 순서를 파일·스냅샷·로그로 남기지 않는다(R-22).
 * 계약(KeyboardInputEvent.special)·구현 전에는 실패가 정상(scenarios.md v0.8 「CR-021 red」).
 * 시나리오: src/overlay/test/scenarios.md TC-127 ~ TC-138
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SPECIAL_KEYS,
  bouncePhase,
  createInitialState,
  currentSpecial,
  isSpecialKey,
  reduce,
  type MachineConfig,
  type MachineInput,
  type MachineState,
  type SpecialKey,
} from 'state/inputMachine'

const T0 = 1_000_000
const FIVE_MIN = 300_000
const config: MachineConfig = { idleMs: FIVE_MIN, kbFrames: 3 }

let clock = T0
const nextTs = () => (clock += 10)
const init = () => {
  clock = T0
  return createInitialState(T0)
}
const key = (pressed: boolean, heldCount: number, special: SpecialKey | null = null): MachineInput => ({
  type: 'key',
  pressed,
  heldCount,
  special,
  ts: nextTs(),
})
const run = (s: MachineState, ...inputs: MachineInput[]) => inputs.reduce((acc, i) => reduce(acc, i, config), s)
/** 관찰 값: 눌린 특수 키 목록 · 바운스 카운터 · 짝 · 누름 여부 · 동시 키 수 */
const view = (s: MachineState) => ({
  held: [...s.specialHeld],
  seq: s.bounceSeq,
  phase: bouncePhase(s),
  kbDown: s.kbDown,
  heldCount: s.heldCount,
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('특수 키 분류값·보조 함수 (design/functions.md §5.2)', () => {
  it('TC-127: SPECIAL_KEYS = 7종(순서 고정), isSpecialKey는 7종만 true — 그 밖의 문자열·undefined·null·숫자·객체는 false', () => {
    expect(SPECIAL_KEYS).toEqual(['space', 'z', 'question', 'exclamation', 'enter', 'backspace', 'undo'])
    for (const k of SPECIAL_KEYS) expect(isSpecialKey(k)).toBe(true)
    const others: unknown[] = ['Space', 'Z', 'a', 'slam', 'key_space', 'ctrl', '', ' ', undefined, null, 0, 1, true, {}, ['space']]
    for (const v of others) expect(isSpecialKey(v)).toBe(false)
  })

  it('TC-128: 초기 specialHeld [] · bounceSeq 0, currentSpecial = 목록 마지막(비면 null), bouncePhase = kbDown이면 bounceSeq 짝홀(0/1), 아니면 null', () => {
    const s0 = createInitialState(T0)
    expect(s0.specialHeld).toEqual([])
    expect(s0.bounceSeq).toBe(0)
    expect(currentSpecial(s0)).toBeNull()
    expect(bouncePhase(s0)).toBeNull()
    expect(currentSpecial({ ...s0, specialHeld: ['space', 'enter'] })).toBe('enter')
    expect(currentSpecial({ ...s0, specialHeld: ['undo'] })).toBe('undo')
    expect(bouncePhase({ ...s0, kbDown: false, bounceSeq: 3 })).toBeNull()
    expect(bouncePhase({ ...s0, kbDown: true, bounceSeq: 0 })).toBe(0)
    expect(bouncePhase({ ...s0, kbDown: true, bounceSeq: 3 })).toBe(1)
    expect(bouncePhase({ ...s0, kbDown: true, bounceSeq: 4 })).toBe(0)
  })
})

describe('design.md §10.6 규칙표 1~13 — reduce key', () => {
  // CR-066: 새 누름(자동 반복 아님)은 다른 키를 누른 채여도 매번 bounceSeq +1 — CR-027 「이미 누르고 있으면 재생 안 함」 대체
  it('TC-129: 규칙 1~3 — [] → 스페이스 누름 [space]·bounceSeq +1 → 스페이스 누른 채 a 누름: 목록 그대로·bounceSeq +1(CR-066)·프레임 순환', () => {
    let s = init()
    expect(view(s)).toEqual({ held: [], seq: 0, phase: null, kbDown: false, heldCount: 0 })
    s = run(s, key(true, 1, 'space'))
    expect(view(s)).toEqual({ held: ['space'], seq: 1, phase: 1, kbDown: true, heldCount: 1 })
    expect(currentSpecial(s)).toBe('space')
    expect(s.kbFrame).toBe(1)
    s = run(s, key(true, 2, null))
    expect(view(s)).toEqual({ held: ['space'], seq: 2, phase: 0, kbDown: true, heldCount: 2 })
    expect(currentSpecial(s)).toBe('space')
    expect(s.kbFrame).toBe(2)
  })

  it('TC-130: 규칙 4·5 — 이어서 Enter 누름 [space, enter]·bounceSeq +1(다른 키 눌린 채 새 특수 키), Enter 뗌 [space]·bounceSeq 그대로', () => {
    let s = run(init(), key(true, 1, 'space'), key(true, 2, null))
    s = run(s, key(true, 3, 'enter'))
    expect(view(s)).toEqual({ held: ['space', 'enter'], seq: 3, phase: 1, kbDown: true, heldCount: 3 })
    expect(currentSpecial(s)).toBe('enter')
    expect(s.kbFrame).toBe(0)
    s = run(s, key(false, 2, 'enter'))
    expect(view(s)).toEqual({ held: ['space'], seq: 3, phase: 1, kbDown: true, heldCount: 2 })
    expect(currentSpecial(s)).toBe('space')
    expect(s.kbFrame).toBe(0)
  })

  it('TC-131: 규칙 6·7 — 스페이스 뗌(a 눌림, heldCount 1) → [], kbDown 유지·bounceSeq 그대로, a 뗌(heldCount 0) → kbDown false·bouncePhase null', () => {
    let s = run(init(), key(true, 1, 'space'), key(true, 2, null), key(true, 3, 'enter'), key(false, 2, 'enter'))
    s = run(s, key(false, 1, 'space'))
    expect(view(s)).toEqual({ held: [], seq: 3, phase: 1, kbDown: true, heldCount: 1 })
    expect(currentSpecial(s)).toBeNull()
    s = run(s, key(false, 0, null))
    expect(view(s)).toEqual({ held: [], seq: 3, phase: null, kbDown: false, heldCount: 0 })
  })

  it('TC-132: 규칙 8·조건 ⓐⓑ — 모두 뗀 상태의 Z 누름은 ⓐⓑ 동시 참이어도 +1 한 번, 일반 키 첫 누름 +1(ⓐ), 누름 유지 중 일반 키 +1(CR-066)·뗌은 그대로', () => {
    let s = run(init(), key(true, 1, 'z'))
    expect(view(s)).toEqual({ held: ['z'], seq: 1, phase: 1, kbDown: true, heldCount: 1 })
    s = run(s, key(false, 0, 'z'))
    expect(view(s)).toEqual({ held: [], seq: 1, phase: null, kbDown: false, heldCount: 0 })
    s = run(s, key(true, 1, null))
    expect(view(s)).toEqual({ held: [], seq: 2, phase: 0, kbDown: true, heldCount: 1 })
    s = run(s, key(true, 2, null))
    expect(s.bounceSeq).toBe(3)
    s = run(s, key(false, 1, null), key(false, 0, null))
    expect(s.bounceSeq).toBe(3)
  })

  // CR-066: repeat 플래그 없는 같은 특수 키 누름은 새 누름이다 — bounceSeq +1(진짜 자동 반복 repeat:true는 TC-161·TC-333)
  it('TC-133: 규칙 9 — 같은 특수 키 재누름(repeat 없음)은 빼고 맨 뒤에 추가(중복 없음)·bounceSeq +1(CR-066), 프레임은 누름마다 순환', () => {
    let s = run(init(), key(true, 1, 'space'))
    const frames: number[] = [s.kbFrame]
    for (let i = 0; i < 3; i++) {
      s = run(s, key(true, 1, 'space'))
      frames.push(s.kbFrame)
      expect(view(s)).toEqual({ held: ['space'], seq: 2 + i, phase: (2 + i) % 2, kbDown: true, heldCount: 1 })
    }
    expect(frames).toEqual([1, 2, 0, 1])
    s = run(s, key(true, 2, 'enter'))
    expect(view(s)).toEqual({ held: ['space', 'enter'], seq: 5, phase: 1, kbDown: true, heldCount: 2 })
    s = run(s, key(true, 2, 'space'))
    expect(view(s)).toEqual({ held: ['enter', 'space'], seq: 6, phase: 0, kbDown: true, heldCount: 2 })
    expect(currentSpecial(s)).toBe('space')
  })

  it('TC-134: 규칙 10 — 어떤 뗌이든 heldCount 0(음수 포함)이면 [](뗌 누락 방어), 목록에 없는 특수 키 뗌(heldCount > 0)은 그대로', () => {
    const two = run(init(), key(true, 1, 'space'), key(true, 2, 'enter'))
    expect(two.specialHeld).toEqual(['space', 'enter'])
    expect(run(two, key(false, 1, 'backspace')).specialHeld).toEqual(['space', 'enter'])
    expect(view(run(two, key(false, 0, null)))).toEqual({ held: [], seq: 2, phase: null, kbDown: false, heldCount: 0 })
    expect(run(two, key(false, 0, 'z')).specialHeld).toEqual([])
    const neg = run(two, key(false, -1, null))
    expect(neg.specialHeld).toEqual([])
    expect(neg.kbDown).toBe(false)
  })

  it('TC-135: 규칙 11 — a를 누른 채 스페이스 누름 → [space]·bounceSeq +1(새 특수 키 ⓑ)', () => {
    let s = run(init(), key(true, 1, null))
    expect(view(s)).toEqual({ held: [], seq: 1, phase: 1, kbDown: true, heldCount: 1 })
    s = run(s, key(true, 2, 'space'))
    expect(view(s)).toEqual({ held: ['space'], seq: 2, phase: 0, kbDown: true, heldCount: 2 })
  })

  it('TC-136: 규칙 12·13 — Ctrl 누른 채 Z(undo) → [undo]·+1, 이어서 Ctrl+C(null) → 목록 그대로·+1(CR-066). Ctrl → C만이면 [] 그대로·C도 재생(CR-066)', () => {
    let s = run(init(), key(true, 1, null))
    expect(s.bounceSeq).toBe(1)
    s = run(s, key(true, 2, 'undo'))
    expect(view(s)).toEqual({ held: ['undo'], seq: 2, phase: 0, kbDown: true, heldCount: 2 })
    expect(currentSpecial(s)).toBe('undo')
    s = run(s, key(true, 3, null))
    expect(view(s)).toEqual({ held: ['undo'], seq: 3, phase: 1, kbDown: true, heldCount: 3 })
    const c = run(init(), key(true, 1, null), key(true, 2, null))
    expect(view(c)).toEqual({ held: [], seq: 2, phase: 0, kbDown: true, heldCount: 2 })
  })

  it('TC-137: mouseMove·mouseButton·tick은 specialHeld·bounceSeq 불변, 특수 키 누름은 쉬는중을 깨운다, 목록은 매번 새 배열(불변)', () => {
    let s = run(init(), key(true, 1, 'space'))
    s = reduce(s, { type: 'mouseMove', x: 10, y: 20, ts: nextTs() }, config)
    s = reduce(s, { type: 'mouseButton', button: 'left', pressed: true, ts: nextTs() }, config)
    s = reduce(s, { type: 'mouseButton', button: 'left', pressed: false, ts: nextTs() }, config)
    s = reduce(s, { type: 'tick', now: nextTs() }, config)
    expect(view(s)).toEqual({ held: ['space'], seq: 1, phase: 1, kbDown: true, heldCount: 1 })

    const a = run(init(), key(true, 1, 'space'))
    const snapshot = [...a.specialHeld]
    const b = run(a, key(true, 2, 'enter'))
    expect(a.specialHeld).toEqual(snapshot)
    expect(b.specialHeld).not.toBe(a.specialHeld)
    expect(b.specialHeld).toEqual(['space', 'enter'])

    const rested = reduce(init(), { type: 'tick', now: T0 + FIVE_MIN }, config)
    expect(rested.layer).toBe('rest')
    const woke = reduce(
      rested,
      { type: 'key', pressed: true, heldCount: 1, special: 'enter', ts: T0 + FIVE_MIN + 10 },
      config,
    )
    expect(woke.layer).toBe('idle')
    expect(woke.lastInputAt).toBe(T0 + FIVE_MIN + 10)
    expect(view(woke)).toEqual({ held: ['enter'], seq: 1, phase: 1, kbDown: true, heldCount: 1 })
  })
})

describe('입력 내용 비보관 (R-22 🔒, design/functions.md §5.2 기록 금지)', () => {
  it('TC-138: 상태에는 지금 눌린 분류값만(이력·횟수·시각 필드 추가 없음), 모두 떼면 분류값이 상태 어디에도 없다, console·저장소 호출 0', () => {
    const methods = ['log', 'info', 'warn', 'error', 'debug'] as const
    const spies = methods.map(m => vi.spyOn(console, m).mockImplementation(() => undefined))
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const initialKeys = Object.keys(createInitialState(T0)).sort()
    let s = run(
      init(),
      key(true, 1, 'space'),
      key(true, 2, 'z'),
      key(false, 1, 'z'),
      key(true, 2, 'question'),
      key(true, 3, 'exclamation'),
      key(false, 2, 'exclamation'),
      key(true, 3, 'backspace'),
      key(true, 4, 'undo'),
      key(true, 5, 'enter'),
      key(false, 4, 'enter'),
    )
    expect(Object.keys(s).sort()).toEqual(initialKeys)
    expect(s.specialHeld).toEqual(['space', 'question', 'backspace', 'undo'])
    expect(s.specialHeld.length).toBeLessThanOrEqual(SPECIAL_KEYS.length)
    s = run(s, key(false, 0, null))
    expect(s.specialHeld).toEqual([])
    const dump = JSON.stringify(s)
    for (const k of SPECIAL_KEYS) expect(dump).not.toContain(`"${k}"`)
    for (const sp of spies) expect(sp).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })
})
