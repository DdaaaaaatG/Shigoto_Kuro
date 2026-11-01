/**
 * 키 그림 최소 유지 순수 TC — CR-072(R-42 신설, 🔒 2026-11-01 key-hold). 대상: src/state/keyHold.ts (React 없음, 시각은 숫자 주입).
 * 규칙: 새 누름(bounceSeq 증가)마다 키 필드 4개(kbDown·kbFrame·specialHeld 최근 1개·clickHeld)를 찍어 두고(hold)
 *   누른 ts + keyHoldMs까지 그 값을 「보이는 상태」로 돌려준다. 뗌·자동 반복·마우스 이동·tick은 hold를 건드리지 않는다.
 *   keyHoldMs ≤ 0(0·NaN·음수)이면 hold가 없고 보이는 상태는 입력 상태 그 객체다(현행과 같음).
 * 근거: 인계 패킷 doc/200_설계/architecture/key-hold-03-packet-ui.md §A.3 K1~K11, 전반 설계 key-hold-02-design.md §2.2.
 * 번호: 스펙 이름의 TC-nnn은 scenarios.md v2.11 정식 번호(TC-357~TC-367). 괄호 안 KH-A-nn은 옛 임시 번호, Kn은 패킷 표 번호.
 * 시나리오: src/overlay/test/scenarios.md v2.11 「CR-072 키 그림 최소 유지」 절(대기열 Q-10 → 전환됨)
 */
import { describe, expect, it } from 'vitest'
import { KEY_HOLD_MS_MAX } from 'bridge/types'
import { isPressing, type MachineConfig, type SpecialKey } from 'state/inputMachine'
import {
  createOverlayState,
  holdDelay,
  reduceOverlay,
  visibleMachine,
  type KeyHold,
  type OverlayInput,
  type OverlayState,
} from 'state/keyHold'

const HOLD_MS = 150
/** 누름 프레임 3장 — 새 누름마다 0 → 1 → 2 → 0 순환이라 프레임이 서로 달라 보인다 */
const CONFIG: MachineConfig = { idleMs: 300_000, kbFrames: 3, clickPress: false }
/** 펜 모드 — 순환 그림이 없어 kbFrames 1, 클릭 누름도 키 누름처럼 센다(CR-027·042) */
const PEN_CONFIG: MachineConfig = { idleMs: 300_000, kbFrames: 1, clickPress: true }

const key = (
  pressed: boolean,
  heldCount: number,
  ts: number,
  special: SpecialKey | null = null,
  repeat = false,
): OverlayInput => ({ type: 'key', pressed, heldCount, special, repeat, ts })
const click = (pressed: boolean, ts: number): OverlayInput => ({
  type: 'mouseButton',
  button: 'left',
  pressed,
  ts,
})
const step = (
  state: OverlayState,
  input: OverlayInput,
  holdMs = HOLD_MS,
  config: MachineConfig = CONFIG,
) => reduceOverlay(state, input, config, holdMs)
const start = () => createOverlayState(0)
/** hold가 있다고 단언하고 꺼낸다(non-null 단언 `!` 대신) */
const holdOf = (state: OverlayState): KeyHold => {
  if (state.hold === null) throw new Error('hold가 있어야 한다')
  return state.hold
}
const view = (state: OverlayState) => visibleMachine(state.machine, state.hold)
/** ts 1000 누름 → ts 1080 뗌 (유지 150이면 until 1150) */
const tapped = () => step(step(start(), key(true, 1, 1000)), key(false, 0, 1080))

describe('keyHold 순수 모듈 — 보이는 키 상태 (R-42, key-hold-02-design.md §2.2)', () => {
  it('TC-357 (KH-A-01·K1): keyHoldMs 0이면 새 누름에도 hold가 없고 보이는 상태는 입력 상태 그 객체(현행과 같음)', () => {
    const s = step(start(), key(true, 1, 1000), 0)
    expect(s.machine.kbDown).toBe(true)
    expect(s.hold).toBeNull()
    expect(visibleMachine(s.machine, null)).toBe(s.machine)
    expect(view(s)).toBe(s.machine)
  })

  it('TC-358 (KH-A-02·K2): 150ms — ts 1000 누름 → hold(seq·until 1150·키 필드), ts 1080 뗌 → hold 같은 객체, 보이는 상태는 눌림·누름 때 프레임, 입력 상태는 뗌', () => {
    const pressed = step(start(), key(true, 1, 1000))
    expect(pressed.hold).toEqual({
      seq: 1,
      until: 1150,
      keys: { kbDown: true, kbFrame: 1, specialHeld: [], clickHeld: [] },
    })

    const released = step(pressed, key(false, 0, 1080))
    expect(released.hold).toBe(pressed.hold)
    expect(released.machine.kbDown).toBe(false)
    const v = view(released)
    expect(v.kbDown).toBe(true)
    expect(v.kbFrame).toBe(pressed.machine.kbFrame)
    // 스냅숏은 키 필드 4개뿐 — 나머지(누른 키 수·레이어·마우스)는 입력 상태 그대로(A-5)
    expect(v.heldCount).toBe(0)
    expect(v.layer).toBe(released.machine.layer)
    expect(v.mouse).toBe(released.machine.mouse)
  })

  it('TC-359 (KH-A-03·K3): holdEnd(seq) → hold null·보이는 상태 = 입력 상태, holdEnd(seq − 1)·이미 끝난 뒤의 holdEnd → 상태 객체 그대로', () => {
    const released = tapped()
    const { seq } = holdOf(released)

    expect(step(released, { type: 'holdEnd', seq: seq - 1 })).toBe(released)

    const ended = step(released, { type: 'holdEnd', seq })
    expect(ended.hold).toBeNull()
    expect(ended.machine).toBe(released.machine)
    expect(view(ended)).toBe(ended.machine)
    expect(view(ended).kbDown).toBe(false)

    expect(step(ended, { type: 'holdEnd', seq })).toBe(ended)
  })

  it('TC-360 (KH-A-04·K4): 유지 중 ts 1100 새 누름 → 새 seq·until 1250·새 프레임으로 교체(유지는 새 누름 기준)', () => {
    const first = tapped()
    const second = step(first, key(true, 1, 1100))
    expect(holdOf(second).seq).toBe(holdOf(first).seq + 1)
    expect(holdOf(second).until).toBe(1250)
    expect(holdOf(first).keys.kbFrame).toBe(1)
    expect(holdOf(second).keys.kbFrame).toBe(2)
    expect(view(second).kbFrame).toBe(2)
  })

  it('TC-361 (KH-A-05·K5): 스페이스를 누른 채 Enter → 입력은 [space, enter]인데 스냅숏 특수 키는 [enter] 1개뿐(R-22 최소 보관), 일반 키 누름이면 비어 있다', () => {
    const space = step(start(), key(true, 1, 1000, 'space'))
    const both = step(space, key(true, 2, 1010, 'enter'))
    expect(both.machine.specialHeld).toEqual(['space', 'enter'])
    expect(holdOf(both).keys.specialHeld).toEqual(['enter'])
    expect(holdOf(space).keys.specialHeld).toEqual(['space'])
    expect(holdOf(step(start(), key(true, 1, 1000))).keys.specialHeld).toEqual([])
  })

  it('TC-362 (KH-A-06·K6): 누른 채 자동 반복(repeat) 여러 번 → hold 같은 객체(새 스냅숏·until 연장 없음), 입력 상태만 반복 중', () => {
    const down = step(start(), key(true, 1, 1000))
    const repeated = [1030, 1060, 1090].reduce(
      (s, ts) => step(s, key(true, 1, ts, null, true)),
      down,
    )
    expect(repeated.hold).toBe(down.hold)
    expect(repeated.machine.repeating).toBe(true)
    expect(repeated.machine.bounceSeq).toBe(down.machine.bounceSeq)
  })

  it('TC-363 (KH-A-07·K7): 펜 모드 왼 클릭 누름 → 뗌 — 스냅숏 clickHeld [left]·kbDown false, 뗌 뒤에도 보이는 상태는 눌림(isPressing)이고 클릭 파츠 버튼은 뗌 즉시 none(D-5)', () => {
    const pressed = step(start(), click(true, 1000), HOLD_MS, PEN_CONFIG)
    expect(holdOf(pressed).keys).toEqual({
      kbDown: false,
      kbFrame: 0,
      specialHeld: [],
      clickHeld: ['left'],
    })

    const released = step(pressed, click(false, 1050), HOLD_MS, PEN_CONFIG)
    expect(released.hold).toBe(pressed.hold)
    expect(released.machine.clickHeld).toEqual([])
    expect(isPressing(released.machine)).toBe(false)
    expect(isPressing(view(released))).toBe(true)
    expect(view(released).kbDown).toBe(false)
    expect(view(released).mouse.button).toBe('none')

    // 펜 모드가 아니면 클릭은 새 누름이 아니다 — hold도 없다(클릭 파츠는 유지 대상 아님)
    expect(step(start(), click(true, 1000)).hold).toBeNull()
  })

  it('TC-364 (KH-A-08·K8): 무변화 tick은 같은 상태 객체, 마우스 이동은 hold를 건드리지 않는다', () => {
    const idle = start()
    expect(step(idle, { type: 'tick', now: 500 })).toBe(idle)

    const pressed = step(idle, key(true, 1, 1000))
    expect(step(pressed, { type: 'tick', now: 1050 })).toBe(pressed)

    const moved = step(pressed, { type: 'mouseMove', x: 10, y: 20, ts: 1060 })
    expect(moved.hold).toBe(pressed.hold)
    expect(moved.machine.mouse).toEqual({ x: 10, y: 20, button: 'none' })
  })

  it('TC-365 (KH-A-09·K9): holdDelay — until − now가 −30 / 120 / 99999여도 0 / 120 / 500(시계가 튀어도 상한 안)', () => {
    const hold: KeyHold = {
      seq: 1,
      until: 1000,
      keys: { kbDown: true, kbFrame: 0, specialHeld: [], clickHeld: [] },
    }
    expect(holdDelay(hold, 1030)).toBe(0)
    expect(holdDelay(hold, 880)).toBe(120)
    expect(holdDelay(hold, 1000 - 99_999)).toBe(500)
    expect(KEY_HOLD_MS_MAX).toBe(500)
  })

  it('TC-366 (KH-A-10·K10): 400ms 꾹 누름 — holdEnd 뒤 보이는 상태 = 입력 상태(아직 눌림·같은 프레임), 뗄 때 즉시 kbDown false', () => {
    const down = step(start(), key(true, 1, 1000))
    const ended = step(down, { type: 'holdEnd', seq: holdOf(down).seq }) // t 1150 만료
    expect(view(ended)).toBe(ended.machine)
    expect(view(ended).kbDown).toBe(true)
    expect(view(ended).kbFrame).toBe(holdOf(down).keys.kbFrame)

    const released = step(ended, key(false, 0, 1400)) // 400ms 뒤 뗌 — 유지 시간은 이미 지났다
    expect(released.hold).toBeNull()
    expect(view(released).kbDown).toBe(false)
  })

  it.each([Number.NaN, -5, Number.NEGATIVE_INFINITY, undefined as unknown as number])(
    'TC-367 (KH-A-11·K11): keyHoldMs %s → 새 누름에도 hold null(0과 같은 취급)',
    holdMs => {
      // step 도우미의 기본 인자(150)가 undefined를 덮지 않도록 reduceOverlay를 직접 부른다
      const s = reduceOverlay(start(), key(true, 1, 1000), CONFIG, holdMs)
      expect(s.machine.kbDown).toBe(true)
      expect(s.hold).toBeNull()
      expect(view(s)).toBe(s.machine)
    },
  )
})
