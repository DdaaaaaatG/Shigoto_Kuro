import { describe, expect, it } from 'vitest'
import { createInitialState, reduce, type MachineConfig } from './inputMachine'

const config: MachineConfig = {
  idleMs: 5000,
  kbFrames: 3,
}

const key = (pressed: boolean, heldCount: number, ts: number) => ({
  type: 'key' as const,
  pressed,
  heldCount,
  special: null, // CR-021: 이 파일은 일반 키만 다룬다. 특수 키 TC는 src/overlay/test/inputMachine.special.test.ts
  ts,
})
const tick = (now: number) => ({ type: 'tick' as const, now })

describe('inputMachine', () => {
  it('초기 상태는 대기(idle), 손 들림', () => {
    const s = createInitialState(0)
    expect(s.layer).toBe('idle')
    expect(s.kbDown).toBe(false)
    expect(s.heldCount).toBe(0)
    expect(s.mouse.button).toBe('none')
  })

  it('idleMs 동안 무입력이면 쉬는중(rest), 입력이 오면 대기로 복귀', () => {
    let s = createInitialState(0)
    s = reduce(s, tick(4999), config)
    expect(s.layer).toBe('idle')
    s = reduce(s, tick(5000), config)
    expect(s.layer).toBe('rest')
    s = reduce(s, { type: 'mouseMove', x: 1, y: 1, ts: 6000 }, config)
    expect(s.layer).toBe('idle')
  })

  it('kbDown 은 눌린 키 수로 정해지고, 새 누름마다 프레임이 순환한다', () => {
    let s = createInitialState(0)
    s = reduce(s, key(true, 1, 10), config)
    expect(s.kbDown).toBe(true)
    expect(s.kbFrame).toBe(1)
    s = reduce(s, key(true, 2, 15), config) // 두 번째 키 추가로 누름
    expect(s.kbDown).toBe(true)
    expect(s.kbFrame).toBe(2)
    s = reduce(s, key(false, 1, 20), config) // 하나 뗌 — 아직 하나 눌려 있음
    expect(s.kbDown).toBe(true)
    expect(s.kbFrame).toBe(2) // 뗌은 프레임을 돌리지 않는다
    s = reduce(s, key(false, 0, 25), config)
    expect(s.kbDown).toBe(false)
    s = reduce(s, key(true, 1, 30), config)
    expect(s.kbFrame).toBe(0)
  })

  it('동시에 눌린 키 수는 상태 레이어에 영향을 주지 않는다(쾅 메커니즘 CR-019로 삭제)', () => {
    let s = createInitialState(0)
    s = reduce(s, key(true, 1, 100), config)
    s = reduce(s, key(true, 2, 110), config)
    s = reduce(s, key(true, 3, 120), config)
    expect(s.layer).toBe('idle')
    expect(s.heldCount).toBe(3)
    // 계속 눌려 있어도 idleMs 미만이면 대기 그대로(예전 쾅 판정과 달리 유휴 규칙만 적용)
    s = reduce(s, tick(120 + config.idleMs - 1), config)
    expect(s.layer).toBe('idle')
    // idleMs 지나면 쉬는중(3개가 눌린 채여도 예외 없음)
    s = reduce(s, tick(120 + config.idleMs), config)
    expect(s.layer).toBe('rest')
    expect(s.heldCount).toBe(3)
  })

  it('마우스 버튼은 누르는 동안만 유지되고 좌표는 이동 이벤트로 갱신된다', () => {
    let s = createInitialState(0)
    s = reduce(s, { type: 'mouseMove', x: 120, y: 80, ts: 10 }, config)
    expect(s.mouse).toEqual({ x: 120, y: 80, button: 'none' })
    s = reduce(s, { type: 'mouseButton', button: 'left', pressed: true, ts: 20 }, config)
    expect(s.mouse.button).toBe('left')
    s = reduce(s, { type: 'mouseButton', button: 'left', pressed: false, ts: 30 }, config)
    expect(s.mouse.button).toBe('none')
    s = reduce(s, { type: 'mouseButton', button: 'right', pressed: true, ts: 40 }, config)
    expect(s.mouse.button).toBe('right')
  })

  it('쉬는중에 키를 누르면 즉시 대기로 깨어난다', () => {
    let s = createInitialState(0)
    s = reduce(s, tick(10_000), config)
    expect(s.layer).toBe('rest')
    s = reduce(s, key(true, 1, 10_001), config)
    expect(s.layer).toBe('idle')
    expect(s.kbDown).toBe(true)
  })
})

// CR-066: 새 누름(자동 반복 아님)은 무엇을 누른 채여도 매번 바운스를 다시 시작한다 — CR-027 조건 대체
describe('inputMachine — 바운스 시작 규칙 (CR-066)', () => {
  it('TC-FIX66-1: Shift 누른 채(held 1→2) 새 키 → bounceSeq +1', () => {
    let s = reduce(createInitialState(0), key(true, 1, 10), config)
    expect(s.bounceSeq).toBe(1)
    s = reduce(s, key(true, 2, 20), config)
    expect(s.bounceSeq).toBe(2)
    expect(s.heldCount).toBe(2)
  })

  it('TC-FIX66-2: 펜 모드 클릭 누른 채 새 키 → bounceSeq +1', () => {
    const pen: MachineConfig = { ...config, clickPress: true }
    let s = reduce(
      createInitialState(0),
      { type: 'mouseButton', button: 'left', pressed: true, ts: 10 },
      pen,
    )
    expect(s.bounceSeq).toBe(1)
    expect(s.clickHeld).toEqual(['left'])
    s = reduce(s, key(true, 1, 20), pen)
    expect(s.bounceSeq).toBe(2)
    expect(s.clickHeld).toEqual(['left'])
  })

  it('TC-FIX66-3: 자동 반복(repeat && pressed) → bounceSeq 불변, shiverSeq = bounceSeq', () => {
    let s = reduce(createInitialState(0), key(true, 1, 10), config)
    s = reduce(s, { ...key(true, 1, 510), repeat: true }, config)
    expect(s.bounceSeq).toBe(1)
    expect(s.shiverSeq).toBe(1)
    expect(s.repeating).toBe(true)
  })

  it('TC-FIX66-4: 키 누른 채 펜 모드 클릭 → bounceSeq +1', () => {
    const pen: MachineConfig = { ...config, clickPress: true }
    let s = reduce(createInitialState(0), key(true, 1, 10), pen)
    expect(s.bounceSeq).toBe(1)
    s = reduce(s, { type: 'mouseButton', button: 'left', pressed: true, ts: 20 }, pen)
    expect(s.bounceSeq).toBe(2)
    expect(s.clickHeld).toEqual(['left'])
  })

  it('TC-FIX66-5: 펜 모드 아님 클릭 → bounceSeq 불변(clickHeld에 안 들어감)', () => {
    let s = reduce(createInitialState(0), key(true, 1, 10), config)
    s = reduce(s, { type: 'mouseButton', button: 'left', pressed: true, ts: 20 }, config)
    expect(s.bounceSeq).toBe(1)
    expect(s.clickHeld).toEqual([])
    s = reduce(
      createInitialState(0),
      { type: 'mouseButton', button: 'right', pressed: true, ts: 10 },
      config,
    )
    expect(s.bounceSeq).toBe(0)
  })
})
