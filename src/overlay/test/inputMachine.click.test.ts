/**
 * overlay 상태기계 펜 모드 클릭 누름 TC — CR-027(R-26 펜 모드에서 마우스 클릭 = 키 누름).
 * 대상: src/state/inputMachine.ts — design/functions.md §5.2 `reduce` mouseButton 펜 모드 행(`onMouseButton` ①~④)·
 *   바운스 재생 카운터 ⓐ(`isPressing`)·`isPressing`·`isRepeating`(불변)·`wrapMotion` ②·`bouncePhase`·
 *   `ClickButton`·`MachineState.clickHeld`·`MachineConfig.clickPress`·`DEFAULT_MACHINE_CONFIG`·기록 금지,
 *   design.md §4 `machine`·`config`, §10.8 규칙표 1~14·모드 전환·입력 비보관.
 * 상태기계는 「펜」을 모른다 — 설정 스위치 `clickPress`만 주입한다. 시간은 주입(ts·now 인자). 실제 sleep 없음.
 * 입력 순서를 파일·스냅샷·로그로 남기지 않는다(R-22).
 * 시나리오: src/overlay/test/scenarios.md TC-204 ~ TC-211
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MACHINE_CONFIG,
  bouncePhase,
  createInitialState,
  currentSpecial,
  isPressing,
  isRepeating,
  reduce,
  wrapMotion,
  type ClickButton,
  type MachineConfig,
  type MachineInput,
  type MachineState,
  type SpecialKey,
} from 'state/inputMachine'

const T0 = 1_000_000
/** 펜 모드(클릭 누름 = 키 누름), 펜 누름 그림 2장 */
const PEN: MachineConfig = { idleMs: 300_000, kbFrames: 2, clickPress: true }
/** clickPress 필드 없음(= false — 기존 스펙 픽스처 형태) */
const PLAIN: MachineConfig = { idleMs: 300_000, kbFrames: 2 }
/** clickPress 명시 false */
const OFF: MachineConfig = { idleMs: 300_000, kbFrames: 2, clickPress: false }

const key = (pressed: boolean, heldCount: number, special: SpecialKey | null, ts: number, repeat?: boolean): MachineInput =>
  repeat === undefined
    ? { type: 'key', pressed, heldCount, special, ts }
    : { type: 'key', pressed, heldCount, special, repeat, ts }
const btn = (button: ClickButton, pressed: boolean, ts: number): MachineInput => ({ type: 'mouseButton', button, pressed, ts })
const move = (x: number, y: number, ts: number): MachineInput => ({ type: 'mouseMove', x, y, ts })
const tick = (now: number): MachineInput => ({ type: 'tick', now })
const run = (cfg: MachineConfig, s: MachineState, ...inputs: MachineInput[]) => inputs.reduce((acc, i) => reduce(acc, i, cfg), s)

/** 클릭 누름 규칙이 바꾸는 값 + 렌더 판정 */
const view = (s: MachineState) => ({
  clickHeld: [...s.clickHeld],
  kbFrame: s.kbFrame,
  bounceSeq: s.bounceSeq,
  button: s.mouse.button,
  pressing: isPressing(s),
  phase: bouncePhase(s),
  motion: wrapMotion(s),
})
/** 클릭이 바꾸지 않는 키보드·부르르 필드(design/functions.md §5.2 onMouseButton ④) */
const keyFields = (s: MachineState) => ({
  heldCount: s.heldCount,
  kbDown: s.kbDown,
  specialHeld: [...s.specialHeld],
  repeating: s.repeating,
  lastRepeatAt: s.lastRepeatAt,
  shiverSeq: s.shiverSeq,
})

const s0 = () => createInitialState(T0)

describe('초기값·isPressing·clickPress 기본값 (design.md §4, design/functions.md §5.2)', () => {
  it('TC-204: 초기 clickHeld [], DEFAULT_MACHINE_CONFIG.clickPress false, isPressing = kbDown || clickHeld 비어 있지 않음, bouncePhase는 isPressing 기준', () => {
    const s = s0()
    expect(s.clickHeld).toEqual([])
    expect(isPressing(s)).toBe(false)
    expect(bouncePhase(s)).toBeNull()
    expect(wrapMotion(s)).toBeNull()
    expect(DEFAULT_MACHINE_CONFIG).toEqual({ idleMs: 300_000, kbFrames: 1, clickPress: false })
    expect(isPressing({ ...s, kbDown: true, heldCount: 1 })).toBe(true)
    expect(isPressing({ ...s, clickHeld: ['left'] })).toBe(true)
    expect(isPressing({ ...s, clickHeld: ['left', 'right'] })).toBe(true)
    // 설계 예: kbDown false·clickHeld ['left']·bounceSeq 1 → 1 / kbDown true·bounceSeq 3 → 1
    expect(bouncePhase({ ...s, clickHeld: ['left'], bounceSeq: 1 })).toBe(1)
    expect(bouncePhase({ ...s, clickHeld: ['right'], bounceSeq: 2 })).toBe(0)
    expect(bouncePhase({ ...s, kbDown: true, heldCount: 1, bounceSeq: 3 })).toBe(1)
    // mouse.button은 누름 판정에 쓰지 않는다
    expect(isPressing({ ...s, mouse: { x: 0, y: 0, button: 'left' } })).toBe(false)
  })
})

describe('onMouseButton ④ 새 클릭 누름 (design.md §10.8 규칙표 1·2·3)', () => {
  it('TC-205: 펜 모드 첫 클릭 → kbFrame +1·bounceSeq +1·clickHeld 추가, 뗌 → 제거, 누름마다 짝 교대(왔다갔다)', () => {
    const a = s0()
    const s1 = run(PEN, a, btn('left', true, T0 + 10))
    expect(view(s1)).toEqual({ clickHeld: ['left'], kbFrame: 1, bounceSeq: 1, button: 'left', pressing: true, phase: 1, motion: 1 })
    expect(s1.lastInputAt).toBe(T0 + 10)
    expect(s1.layer).toBe('idle')
    const s2 = run(PEN, s1, btn('left', false, T0 + 20))
    expect(view(s2)).toEqual({ clickHeld: [], kbFrame: 1, bounceSeq: 1, button: 'none', pressing: false, phase: null, motion: null })
    const s3 = run(PEN, s2, btn('left', true, T0 + 30))
    expect(view(s3)).toEqual({ clickHeld: ['left'], kbFrame: 0, bounceSeq: 2, button: 'left', pressing: true, phase: 0, motion: 0 })
    const s4 = run(PEN, s3, btn('left', false, T0 + 40))
    expect(view(s4)).toEqual({ clickHeld: [], kbFrame: 0, bounceSeq: 2, button: 'none', pressing: false, phase: null, motion: null })
    const s5 = run(PEN, s4, btn('right', true, T0 + 50))
    expect(view(s5)).toEqual({ clickHeld: ['right'], kbFrame: 1, bounceSeq: 3, button: 'right', pressing: true, phase: 1, motion: 1 })
    const s6 = run(PEN, s5, btn('right', false, T0 + 60))
    expect(view(s6)).toEqual({ clickHeld: [], kbFrame: 1, bounceSeq: 3, button: 'none', pressing: false, phase: null, motion: null })
    for (const s of [s1, s2, s3, s4, s5, s6]) expect(keyFields(s)).toEqual(keyFields(a))
  })
})

describe('두 버튼·중복 누름·설계 예 (design/functions.md §5.2 onMouseButton 예, design.md §10.8 규칙표 13)', () => {
  it('TC-206: 설계 예 연쇄, 좌·우 동시 누름에서 한쪽 뗌은 누름 유지, 같은 버튼 중복 누름·안 눌린 버튼 뗌은 목록·카운터 불변', () => {
    const a = run(PEN, s0(), btn('left', true, T0 + 10))
    const b = run(PEN, a, btn('right', true, T0 + 20))
    expect(view(b)).toEqual({ clickHeld: ['left', 'right'], kbFrame: 0, bounceSeq: 1, button: 'right', pressing: true, phase: 1, motion: 1 })
    const c = run(PEN, b, btn('left', false, T0 + 30))
    expect(view(c)).toEqual({ clickHeld: ['right'], kbFrame: 0, bounceSeq: 1, button: 'none', pressing: true, phase: 1, motion: 1 })
    const d = run(PEN, c, btn('right', false, T0 + 40))
    expect(view(d)).toEqual({ clickHeld: [], kbFrame: 0, bounceSeq: 1, button: 'none', pressing: false, phase: null, motion: null })
    const e = run(PEN, d, btn('left', true, T0 + 50))
    expect(view(e)).toEqual({ clickHeld: ['left'], kbFrame: 1, bounceSeq: 2, button: 'left', pressing: true, phase: 0, motion: 0 })

    // 규칙표 13: 왼·오른 동시에 누른 뒤 오른만 뗌 → 누름 유지, mouse.button은 as-built대로 'none'
    const f = run(PEN, s0(), btn('left', true, T0 + 10), btn('right', true, T0 + 11), btn('right', false, T0 + 20))
    expect(view(f)).toEqual({ clickHeld: ['left'], kbFrame: 0, bounceSeq: 1, button: 'none', pressing: true, phase: 1, motion: 1 })

    // ③ 같은 버튼 중복 누름(뗌 누락 방어) — 목록·kbFrame·bounceSeq 불변, mouse.button·lastInputAt만 갱신
    const g = run(PEN, a, btn('left', true, T0 + 15))
    expect(view(g)).toEqual({ clickHeld: ['left'], kbFrame: 1, bounceSeq: 1, button: 'left', pressing: true, phase: 1, motion: 1 })
    expect(g.lastInputAt).toBe(T0 + 15)
    // ② 눌리지 않은 버튼 뗌 — 같은 내용
    const h = run(PEN, a, btn('right', false, T0 + 16))
    expect(view(h)).toEqual({ clickHeld: ['left'], kbFrame: 1, bounceSeq: 1, button: 'none', pressing: true, phase: 1, motion: 1 })
    for (const s of [b, c, d, e, f, g, h]) {
      expect(s.clickHeld.length).toBeLessThanOrEqual(2)
      expect(new Set(s.clickHeld).size).toBe(s.clickHeld.length)
    }
  })
})

describe('비펜 모드·모드 전환 (design.md §10.8 적용 조건·규칙표 14·모드 전환, design/functions.md §5.2 onMouseButton ②③)', () => {
  it('TC-207: clickPress 없음/false → 클릭은 목록·프레임·젤리에 영향 없음(기존 동작), 뗌은 모드와 무관하게 항상 제거, 모드 전환 전에 눌린 버튼은 누름으로 보지 않음', () => {
    for (const cfg of [PLAIN, OFF]) {
      const a = run(cfg, s0(), btn('left', true, T0 + 10))
      expect(view(a)).toEqual({ clickHeld: [], kbFrame: 0, bounceSeq: 0, button: 'left', pressing: false, phase: null, motion: null })
      const b = run(cfg, a, btn('right', true, T0 + 20), btn('right', false, T0 + 30), btn('left', false, T0 + 40))
      expect(view(b)).toEqual({ clickHeld: [], kbFrame: 0, bounceSeq: 0, button: 'none', pressing: false, phase: null, motion: null })
      // 버튼을 누른 채 첫 키 누름 = 젤리 재생(ⓐ — 비펜 모드는 clickHeld가 늘 [])
      const k = run(cfg, a, key(true, 1, null, T0 + 50))
      expect(view(k)).toEqual({ clickHeld: [], kbFrame: 1, bounceSeq: 1, button: 'left', pressing: true, phase: 1, motion: 1 })
    }
    // 펜 모드에서 눌린 버튼 → 모드가 꺼진 뒤 뗌 → 제거(카운터 불변)
    const held = run(PEN, s0(), btn('left', true, T0 + 10))
    const off = run(PLAIN, held, btn('left', false, T0 + 20))
    expect(view(off)).toEqual({ clickHeld: [], kbFrame: 1, bounceSeq: 1, button: 'none', pressing: false, phase: null, motion: null })
    // 비펜 모드에서 누른 버튼 → 모드가 켜진 뒤에도 뗄 때까지 누름 아님, 다음 누름부터 센다
    const pre = run(PLAIN, s0(), btn('left', true, T0 + 10))
    expect(isPressing(pre)).toBe(false)
    const rel = run(PEN, pre, btn('left', false, T0 + 20))
    expect(view(rel)).toEqual({ clickHeld: [], kbFrame: 0, bounceSeq: 0, button: 'none', pressing: false, phase: null, motion: null })
    const next = run(PEN, rel, btn('left', true, T0 + 30))
    expect(view(next)).toEqual({ clickHeld: ['left'], kbFrame: 1, bounceSeq: 1, button: 'left', pressing: true, phase: 1, motion: 1 })
  })
})

describe('일반 키와 교차 (design.md §10.8 규칙표 4~7, design/functions.md §5.2 ⓐ isPressing·wrapMotion ②)', () => {
  it('TC-208: 키 누른 채 클릭 → 프레임만(재생 없음), 키만 뗌 → 누름 유지, 버튼 뗌 → 해제, 클릭 누른 채 키 → 프레임만', () => {
    const r4a = run(PEN, s0(), key(true, 1, null, T0 + 10))
    expect(view(r4a)).toMatchObject({ kbFrame: 1, bounceSeq: 1, phase: 1 })
    const r4 = run(PEN, r4a, btn('left', true, T0 + 20))
    expect(view(r4)).toEqual({ clickHeld: ['left'], kbFrame: 0, bounceSeq: 1, button: 'left', pressing: true, phase: 1, motion: 1 })
    expect(keyFields(r4)).toEqual(keyFields(r4a))
    const r5 = run(PEN, r4, key(false, 0, null, T0 + 30))
    expect(r5.kbDown).toBe(false)
    expect(view(r5)).toEqual({ clickHeld: ['left'], kbFrame: 0, bounceSeq: 1, button: 'left', pressing: true, phase: 1, motion: 1 })
    const r6 = run(PEN, r5, btn('left', false, T0 + 40))
    expect(view(r6)).toEqual({ clickHeld: [], kbFrame: 0, bounceSeq: 1, button: 'none', pressing: false, phase: null, motion: null })
    const r7a = run(PEN, r6, btn('left', true, T0 + 50))
    expect(view(r7a)).toMatchObject({ kbFrame: 1, bounceSeq: 2, phase: 0 })
    const r7 = run(PEN, r7a, key(true, 1, null, T0 + 60))
    expect(r7.kbDown).toBe(true)
    expect(r7.heldCount).toBe(1)
    expect(view(r7)).toEqual({ clickHeld: ['left'], kbFrame: 0, bounceSeq: 2, button: 'left', pressing: true, phase: 0, motion: 0 })
    // 대조: 비펜 모드에서 같은 순서면 키 누름이 첫 누름이라 재생된다
    const c7 = run(PLAIN, r6, btn('left', true, T0 + 50), key(true, 1, null, T0 + 60))
    expect(view(c7)).toMatchObject({ clickHeld: [], kbFrame: 1, bounceSeq: 2 })
  })
})

describe('특수 키와 교차 (design.md §10.8 규칙표 8·9·10, design/functions.md §5.2 ⓑ)', () => {
  it('TC-209: 클릭 누른 채 스페이스 → ⓑ 재생·특수 키 우선, 스페이스 누른 채 클릭 → 특수 키 유지·재생 없음·프레임 +1, 스페이스만 뗌 → 일반 누름', () => {
    const r8a = run(PEN, s0(), btn('left', true, T0 + 10))
    const r8 = run(PEN, r8a, key(true, 1, 'space', T0 + 20))
    expect(currentSpecial(r8)).toBe('space')
    expect(view(r8)).toEqual({ clickHeld: ['left'], kbFrame: 0, bounceSeq: 2, button: 'left', pressing: true, phase: 0, motion: 0 })
    const r8r = run(PEN, r8, key(false, 0, 'space', T0 + 30))
    expect(r8r.specialHeld).toEqual([])
    expect(view(r8r)).toEqual({ clickHeld: ['left'], kbFrame: 0, bounceSeq: 2, button: 'left', pressing: true, phase: 0, motion: 0 })
    expect(view(run(PEN, r8r, btn('left', false, T0 + 40)))).toMatchObject({ clickHeld: [], pressing: false, phase: null })

    const r9a = run(PEN, s0(), key(true, 1, 'space', T0 + 10))
    expect(view(r9a)).toMatchObject({ kbFrame: 1, bounceSeq: 1 })
    const r9 = run(PEN, r9a, btn('left', true, T0 + 20))
    expect(r9.specialHeld).toEqual(['space'])
    expect(currentSpecial(r9)).toBe('space')
    expect(view(r9)).toEqual({ clickHeld: ['left'], kbFrame: 0, bounceSeq: 1, button: 'left', pressing: true, phase: 1, motion: 1 })
    const r10 = run(PEN, r9, key(false, 0, 'space', T0 + 30))
    expect(currentSpecial(r10)).toBeNull()
    expect(view(r10)).toEqual({ clickHeld: ['left'], kbFrame: 0, bounceSeq: 1, button: 'left', pressing: true, phase: 1, motion: 1 })
    expect(view(run(PEN, r10, btn('left', false, T0 + 40)))).toMatchObject({ clickHeld: [], pressing: false, phase: null })
  })
})

describe('부르르와 교차 (design.md §10.8 규칙표 11·12, design/functions.md §5.2 isRepeating 불변·wrapMotion ③)', () => {
  it('TC-210: 부르르 중 클릭 → 부르르 유지·repeating 계열 불변, 키 뗌 → 젤리 되살리지 않음, 클릭만으로는 부르르 없음', () => {
    const a = run(PEN, s0(), key(true, 1, null, T0 + 10))
    const b = run(PEN, a, key(true, 1, null, T0 + 510, true))
    expect(wrapMotion(b)).toBe('shiver')
    const c = run(PEN, b, btn('left', true, T0 + 600))
    expect(c.repeating).toBe(true)
    expect(c.lastRepeatAt).toBe(T0 + 510)
    expect(c.shiverSeq).toBe(1)
    expect(isRepeating(c)).toBe(true)
    expect(view(c)).toEqual({ clickHeld: ['left'], kbFrame: 0, bounceSeq: 1, button: 'left', pressing: true, phase: 1, motion: 'shiver' })
    const d = run(PEN, c, key(false, 0, null, T0 + 700))
    expect(d.repeating).toBe(false)
    expect(isRepeating(d)).toBe(false)
    expect(view(d)).toEqual({ clickHeld: ['left'], kbFrame: 0, bounceSeq: 1, button: 'left', pressing: true, phase: 1, motion: null })
    expect(view(run(PEN, d, btn('left', false, T0 + 800)))).toMatchObject({ clickHeld: [], motion: null })

    // 클릭만: 같은 버튼 누름이 반복돼도 부르르 없음
    const f = run(PEN, s0(), btn('left', true, T0 + 10), btn('left', true, T0 + 510), btn('left', true, T0 + 1010))
    expect(f.repeating).toBe(false)
    expect(f.lastRepeatAt).toBe(0)
    expect(f.shiverSeq).toBe(-1)
    expect(isRepeating(f)).toBe(false)
    expect(wrapMotion(f)).toBe(1)
    // isRepeating은 kbDown 기준 그대로 — 버튼만 눌린 동안은 부르르 아님
    const base = s0()
    expect(isRepeating({ ...base, repeating: true, kbDown: false, clickHeld: ['left'] })).toBe(false)
    expect(wrapMotion({ ...base, repeating: true, kbDown: false, clickHeld: ['left'], bounceSeq: 1 })).toBe(1)
  })
})

describe('다른 입력·불변성·입력 비보관 (design/functions.md §5.2 MachineState.clickHeld·기록 금지, design.md §10.8 입력 비보관)', () => {
  it('TC-211: mouseMove·key·tick은 clickHeld 불변, 뗌은 새 배열(이전 상태 불변), 유휴 rest 뒤 클릭은 깨어남, 필드 추가 없음·값은 left/right만', () => {
    const held = run(PEN, s0(), btn('left', true, T0 + 10))
    const arr = held.clickHeld
    expect(run(PEN, held, move(300, 200, T0 + 20)).clickHeld).toEqual(['left'])
    expect(run(PEN, held, key(true, 1, null, T0 + 20), key(false, 0, null, T0 + 30)).clickHeld).toEqual(['left'])
    expect(reduce(held, tick(T0 + 1_000), PEN)).toBe(held)
    const rest = reduce(held, tick(T0 + 10 + 300_000), PEN)
    expect(rest.layer).toBe('rest')
    expect(rest.clickHeld).toEqual(['left'])
    const woke = reduce(rest, btn('right', true, T0 + 400_000), PEN)
    expect(woke.layer).toBe('idle')
    expect(woke.lastInputAt).toBe(T0 + 400_000)
    expect(view(woke)).toMatchObject({ clickHeld: ['left', 'right'], kbFrame: 0, bounceSeq: 1 })

    const rel = reduce(held, btn('left', false, T0 + 40), PEN)
    expect(rel).not.toBe(held)
    expect(rel.clickHeld).toEqual([])
    expect(rel.clickHeld).not.toBe(arr)
    expect(held.clickHeld).toEqual(['left'])
    const both = reduce(held, btn('right', true, T0 + 50), PEN)
    expect(both.clickHeld).not.toBe(arr)
    expect(held.clickHeld).toEqual(['left'])

    const initKeys = Object.keys(s0()).sort()
    let s = s0()
    for (const i of [
      btn('left', true, T0 + 1),
      btn('right', true, T0 + 2),
      btn('left', true, T0 + 3),
      btn('right', false, T0 + 4),
      btn('left', false, T0 + 5),
    ]) {
      s = reduce(s, i, PEN)
      expect(Object.keys(s).sort()).toEqual(initKeys)
      expect(s.clickHeld.length).toBeLessThanOrEqual(2)
      for (const b of s.clickHeld) expect(['left', 'right']).toContain(b)
    }
    expect(s.clickHeld).toEqual([])
  })
})
