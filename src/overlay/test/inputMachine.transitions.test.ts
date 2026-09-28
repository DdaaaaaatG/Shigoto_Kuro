/**
 * overlay 상태기계 전이 TC — doc/000_프로젝트_확정사항.md §5 전이표의 모든 행 ≥1.
 * 대상: src/state/inputMachine.ts (design.md §5.2 인용, §10.2)
 * 시간은 주입한다(now·ts 인자 = 가짜 시계). 실제 sleep 없음.
 * 시나리오: src/overlay/test/scenarios.md TC-001 ~ TC-014, TC-102
 * (TC-007 ~ TC-011은 CR-019 쾅 메커니즘 폐기로 폐기 — it 삭제. 전이표 행4 「동시 6키」도 폐기)
 */
import { describe, expect, it } from 'vitest'
import {
  createInitialState,
  reduce,
  type MachineConfig,
  type MachineInput,
  type MachineState,
} from 'state/inputMachine'

const T0 = 1_000_000
const FIVE_MIN = 300_000

/** 확정사항 §5 기본 설정값: 유휴 5분, 누름 프레임 3장(CR-019: 쾅 설정 `slam` 없음) */
const config: MachineConfig = { idleMs: FIVE_MIN, kbFrames: 3 }

const key = (pressed: boolean, heldCount: number, ts: number): MachineInput => ({
  type: 'key',
  pressed,
  heldCount,
  special: null, // CR-021: 일반 키(분류값 없음). 특수 키 TC는 inputMachine.special.test.ts
  ts,
})
const move = (x: number, y: number, ts: number): MachineInput => ({ type: 'mouseMove', x, y, ts })
const btn = (button: 'left' | 'right', pressed: boolean, ts: number): MachineInput => ({
  type: 'mouseButton',
  button,
  pressed,
  ts,
})
const tick = (now: number): MachineInput => ({ type: 'tick', now })

const held = (s: MachineState) => ({ kbDown: s.kbDown, heldCount: s.heldCount, kbFrame: s.kbFrame })

describe('전이표 행 1·2 — 무입력·유휴', () => {
  it('TC-001: 「아무 입력 없음」 — 초기 상태는 대기·키보드 들림·버튼 없음·특수 키 없음·바운스 카운터 0, slamUntil 필드 없음', () => {
    const s = createInitialState(T0)
    expect(s).toEqual({
      layer: 'idle',
      heldCount: 0,
      kbDown: false,
      kbFrame: 0,
      mouse: { x: 0, y: 0, button: 'none' },
      lastInputAt: T0,
      specialHeld: [], // CR-021
      bounceSeq: 0, // CR-021 추가 결정
      repeating: false, // CR-023 — 자동 반복 누름 이어지는 중 아님
      lastRepeatAt: 0, // CR-023
      shiverSeq: -1, // CR-023
      clickHeld: [], // CR-027 — 펜 모드에서 지금 눌린 클릭 버튼 없음
    })
    expect(s).not.toHaveProperty('slamUntil')
    expect(reduce(s, tick(T0 + 1_000), config).layer).toBe('idle')
  })

  it('TC-002: 「5분 무입력」 — idleMs(300000) 경과 tick에서 쉬는중, 1ms 전에는 대기', () => {
    const before = reduce(createInitialState(T0), tick(T0 + FIVE_MIN - 1), config)
    expect(before.layer).toBe('idle')
    const after = reduce(before, tick(T0 + FIVE_MIN), config)
    expect(after.layer).toBe('rest')
    expect(after.kbDown).toBe(false)
    expect(after.mouse.button).toBe('none')
  })

  it('TC-003: 유휴 시간은 설정값(생성 인자)이다 — idleMs 60000이면 60초에 쉬는중', () => {
    const short: MachineConfig = { ...config, idleMs: 60_000 }
    expect(reduce(createInitialState(T0), tick(T0 + 59_999), short).layer).toBe('idle')
    expect(reduce(createInitialState(T0), tick(T0 + 60_000), short).layer).toBe('rest')
    // 기본 5분 설정이면 60초는 아직 대기
    expect(reduce(createInitialState(T0), tick(T0 + 60_000), config).layer).toBe('idle')
  })

  it('TC-004: 쉬는중에서 키 입력·마우스 이동·마우스 클릭 → 대기, lastInputAt = 입력 ts', () => {
    const rested = reduce(createInitialState(T0), tick(T0 + FIVE_MIN), config)
    expect(rested.layer).toBe('rest')
    const ts = T0 + FIVE_MIN + 10
    for (const input of [key(true, 1, ts), move(5, 5, ts), btn('left', true, ts)]) {
      const s = reduce(rested, input, config)
      expect(s.layer).toBe('idle')
      expect(s.lastInputAt).toBe(ts)
    }
  })
})

describe('전이표 행 3 — 키 입력', () => {
  it('TC-005: 「키 입력」 — 누르면 kbDown·heldCount 갱신, 떼면 들림, 상태는 대기·마우스 유지', () => {
    let s = reduce(createInitialState(T0), key(true, 1, T0 + 10), config)
    expect(s.layer).toBe('idle')
    expect(s.kbDown).toBe(true)
    expect(s.heldCount).toBe(1)
    expect(s.mouse).toEqual({ x: 0, y: 0, button: 'none' })
    s = reduce(s, key(false, 0, T0 + 20), config)
    expect(s.kbDown).toBe(false)
    expect(s.heldCount).toBe(0)
    expect(s.layer).toBe('idle')
  })

  it('TC-006: 누름마다 프레임 순환(kbFrames 3: 1→2→0→1), 뗌은 프레임을 바꾸지 않는다', () => {
    let s = createInitialState(T0)
    const frames: number[] = []
    for (let i = 0; i < 4; i++) {
      s = reduce(s, key(true, 1, T0 + i * 100), config)
      frames.push(s.kbFrame)
      const kept = s.kbFrame
      s = reduce(s, key(false, 0, T0 + i * 100 + 50), config)
      expect(s.kbFrame).toBe(kept)
    }
    expect(frames).toEqual([1, 2, 0, 1])
  })
})

describe('전이표 행 5·6·7 — 마우스·둘 다', () => {
  it('TC-012: 「마우스 이동」 — 좌표 갱신, 상태 대기, 키보드·버튼 값은 그대로', () => {
    let s = reduce(createInitialState(T0), key(true, 1, T0 + 1), config)
    s = reduce(s, move(120, 80, T0 + 2), config)
    expect(s.mouse).toEqual({ x: 120, y: 80, button: 'none' })
    expect(s.layer).toBe('idle')
    expect(s.kbDown).toBe(true)
    expect(s.lastInputAt).toBe(T0 + 2)
  })

  it('TC-013: 「마우스 클릭」 — 누르는 동안 left/right, 떼면 none, 상태 대기·키보드 들림', () => {
    let s = reduce(createInitialState(T0), btn('left', true, T0 + 10), config)
    expect(s.mouse.button).toBe('left')
    expect(s.layer).toBe('idle')
    expect(s.kbDown).toBe(false)
    s = reduce(s, btn('left', false, T0 + 20), config)
    expect(s.mouse.button).toBe('none')
    s = reduce(s, btn('right', true, T0 + 30), config)
    expect(s.mouse.button).toBe('right')
    s = reduce(s, btn('right', false, T0 + 40), config)
    expect(s.mouse.button).toBe('none')
  })

  it('TC-014: 「둘 다」 — 키 누름과 마우스 이동·클릭이 서로의 값을 바꾸지 않는다(레이어 독립)', () => {
    let s = createInitialState(T0)
    s = reduce(s, key(true, 1, T0 + 1), config)
    s = reduce(s, move(300, 200, T0 + 2), config)
    s = reduce(s, btn('left', true, T0 + 3), config)
    expect(s.kbDown).toBe(true)
    expect(s.kbFrame).toBe(1)
    expect(s.mouse).toEqual({ x: 300, y: 200, button: 'left' })
    expect(s.layer).toBe('idle')
    s = reduce(s, key(false, 0, T0 + 4), config)
    expect(s.kbDown).toBe(false)
    expect(s.mouse).toEqual({ x: 300, y: 200, button: 'left' })
  })
})

describe('as-built 규칙 — design/functions.md §5.2 tick', () => {
  it('TC-102: 몇 키를 누르고 있든 idleMs 경과 → 쉬는중, kbDown·heldCount·kbFrame 불변', () => {
    // ① 2키 누른 채 유지(마지막 입력 T0+20)
    let two = reduce(createInitialState(T0), key(true, 1, T0 + 10), config)
    two = reduce(two, key(true, 2, T0 + 20), config)
    expect(two.layer).toBe('idle')
    expect(held(two)).toEqual({ kbDown: true, heldCount: 2, kbFrame: 2 })
    expect(reduce(two, tick(T0 + 20 + FIVE_MIN - 1), config).layer).toBe('idle')
    two = reduce(two, tick(T0 + 20 + FIVE_MIN), config)
    expect(two.layer).toBe('rest')
    expect(held(two)).toEqual({ kbDown: true, heldCount: 2, kbFrame: 2 })

    // ② 6키 누른 채 유지(옛 쾅 기준 — CR-019 이후 대기, 마지막 입력 T0+6, 프레임 1→2→0→1→2→0)
    let six = createInitialState(T0)
    for (let n = 1; n <= 6; n++) {
      six = reduce(six, key(true, n, T0 + n), config)
      expect(six.layer).toBe('idle')
    }
    expect(held(six)).toEqual({ kbDown: true, heldCount: 6, kbFrame: 0 })
    expect(reduce(six, tick(T0 + 6 + FIVE_MIN - 1), config).layer).toBe('idle')
    six = reduce(six, tick(T0 + 6 + FIVE_MIN), config)
    expect(six.layer).toBe('rest')
    expect(held(six)).toEqual({ kbDown: true, heldCount: 6, kbFrame: 0 })
    expect(six).not.toHaveProperty('slamUntil')
  })
})
