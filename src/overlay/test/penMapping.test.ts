/**
 * 펜 쥔 손 좌표·변형 순수 함수 TC — CR-025(R-25 펜 쥔 손 파츠).
 * 근거: design/functions.md §5.5(armTransformFor·defaultPenPos·resolvePenPos·penTransform·penTransformCss·
 *   PenTransform·PEN_REST, 예 ⓐ~ⓓ — ⓓ는 허용오차 ±0.05), §5.4(armTransform·armTransformCss·상수), design.md §10.7.
 * 대상: src/state/mouseMapping.ts (새 export는 구현 전이라 이 파일은 red — scenarios.md v1.1 §0.3 보충)
 * 미확정 계약: MouseSettings.penPos: Point | null(bridge 인계) — 픽스처는 캐스팅으로 넣는다.
 * 시나리오: src/overlay/test/scenarios.md TC-176 ~ TC-184
 */
import { describe, expect, it } from 'vitest'
import {
  PEN_REST,
  REST_TRANSFORM,
  armTransform,
  armTransformCss,
  armTransformFor,
  bilerpQuad,
  cursorUv,
  defaultPenPos,
  penTransform,
  penTransformCss,
  pickMonitor,
  resolvePenPos,
  resolvePivot,
  type ArmTransform,
  type PenTransform,
  type Quad,
} from 'state/mouseMapping'
import type { MouseSettings, Point, ScreenBounds } from 'bridge/types'

// ─── 픽스처 ───────────────────────────────────────────────────────────────
const O: Point = { x: 0, y: 0 }
const SHOULDER: Point = { x: 620, y: 530 }
/** 테스트 영역: 중심 (520,530)의 200×200 직사각형(scenarios.md §0.1 AREA) */
const AREA: Quad = [
  { x: 420, y: 430 },
  { x: 620, y: 430 },
  { x: 620, y: 630 },
  { x: 420, y: 630 },
]
/** 기본 이동 영역(scenarios.md §0.1 DEF_AREA) — 중심 (435,575) */
const DEF_AREA: Quad = [
  { x: 375, y: 525 },
  { x: 495, y: 525 },
  { x: 495, y: 625 },
  { x: 375, y: 625 },
]
type PenMouse = MouseSettings & { penPos: Point | null }
/** penPos는 미확정 계약 필드라 캐스팅한다(bridge 확정 뒤에도 그대로 유효) */
const mouse = (over: Partial<PenMouse> = {}): MouseSettings =>
  ({ shoulder: SHOULDER, area: AREA, hand: null, partPos: { x: 0, y: 0 }, penPos: null, ...over }) as MouseSettings
const MON: ScreenBounds = { x: 0, y: 0, width: 1920, height: 1080 }
const MON_A: ScreenBounds = { x: 0, y: 0, width: 2560, height: 1440 }
const MON_B: ScreenBounds = { x: 320, y: 1440, width: 1920, height: 1080 }
const PEN_SIZE = { width: 202, height: 154 }

/** scenarios.md §0.2 변형 문자열 */
const REST = 'rotate(0deg) scaleX(1) rotate(0deg)'
const DOWN = 'rotate(135deg) scaleX(1.414) rotate(-180deg)'
const UP = 'rotate(-135deg) scaleX(1.414) rotate(-180deg)'
const UP_ALT = 'rotate(-135deg) scaleX(1.414) rotate(90deg)'
const MAX = 'rotate(180deg) scaleX(1.6) rotate(-180deg)'

/** -0 과 0 을 같게 본다(설계는 수치 객체의 부호 있는 0을 정하지 않음 — 문자열은 TC-181) */
const z = (p: PenTransform): PenTransform => ({ dx: p.dx + 0, dy: p.dy + 0, deg: p.deg + 0 })
const arm = (baseDeg: number, targetDeg: number, stretch: number): ArmTransform => ({ baseDeg, targetDeg, stretch })

describe('penTransform 쉬는 자세·예시 (design/functions.md §5.5 ①③~⑦, 예 ⓐ~ⓒ)', () => {
  it('TC-176: PEN_REST = {0,0,0}(스케일 필드 없음), 팔 변형이 항등(REST_TRANSFORM·θt = θh·k = 1)이면 penPos·크기와 무관하게 PEN_REST', () => {
    expect(PEN_REST).toEqual({ dx: 0, dy: 0, deg: 0 })
    expect(Object.keys(PEN_REST).sort()).toEqual(['deg', 'dx', 'dy'])
    expect(REST_TRANSFORM).toEqual({ baseDeg: 0, targetDeg: 0, stretch: 1 })
    // 예 ⓒ
    expect(z(penTransform(O, REST_TRANSFORM, { x: 125, y: -5 }, { width: 50, height: 30 }))).toEqual(PEN_REST)
    // 항등이지만 REST_TRANSFORM 객체가 아닌 경우
    expect(z(penTransform(SHOULDER, arm(45, 45, 1), { x: 389, y: 492 }, PEN_SIZE))).toEqual(PEN_REST)
    expect(z(penTransform(SHOULDER, arm(180, 180, 1), { x: 389, y: 492 }, PEN_SIZE))).toEqual(PEN_REST)
  })

  it('TC-177: 예 ⓐ·ⓑ 정확값, 늘어나기만(θt = θh·k ≠ 1)은 회전 0·이동만, 어깨가 원점이 아니어도 같은 상대 결과', () => {
    // ⓐ S (0,0), arm {0,-90,1.2}, penPos (125,-5), 50×30 → P (150,10) → P' (10,-180)
    expect(z(penTransform(O, arm(0, -90, 1.2), { x: 125, y: -5 }, { width: 50, height: 30 }))).toEqual({
      dx: -140,
      dy: -190,
      deg: -90,
    })
    // ⓑ S (0,0), arm {0,90,1}, penPos (90,-10), 20×20 → P (100,0) → P' (0,100)
    expect(z(penTransform(O, arm(0, 90, 1), { x: 90, y: -10 }, { width: 20, height: 20 }))).toEqual({
      dx: -100,
      dy: 100,
      deg: 90,
    })
    // 늘어나기만: P (150,10) → P' (180,10)
    expect(z(penTransform(O, arm(0, 0, 1.2), { x: 125, y: -5 }, { width: 50, height: 30 }))).toEqual({
      dx: 30,
      dy: 0,
      deg: 0,
    })
    // 어깨 (100,100): P (200,100), P − S = (100,0) → P' = (100,200)
    expect(z(penTransform({ x: 100, y: 100 }, arm(0, 90, 1), { x: 190, y: 90 }, { width: 20, height: 20 }))).toEqual({
      dx: -100,
      dy: 100,
      deg: 90,
    })
  })

  it('TC-178: 예 ⓓ(§5.4 렌더 예와 같은 팔) — dx ≈ -29.97·dy ≈ -170.02(±0.05), deg 50.19, 소수 2자리 반올림', () => {
    const a = arm(180, -129.81, 1.562)
    expect(armTransformCss(a)).toBe('rotate(-129.81deg) scaleX(1.562) rotate(-180deg)')
    const r = penTransform(SHOULDER, a, { x: 389, y: 492 }, PEN_SIZE)
    expect(Math.abs(r.dx - -29.97)).toBeLessThanOrEqual(0.05)
    expect(Math.abs(r.dy - -170.02)).toBeLessThanOrEqual(0.05)
    expect(r.deg).toBeCloseTo(50.19, 2)
    for (const n of [r.dx, r.dy, r.deg]) expect(Math.abs(n * 100 - Math.round(n * 100))).toBeLessThan(1e-6)
    expect(Object.keys(r).sort()).toEqual(['deg', 'dx', 'dy'])
  })
})

describe('penTransform 각도 접기·예외 (design/functions.md §5.5 ②⑥)', () => {
  it('TC-179: deg = θt − θh 를 (−180, 180]로 접는다 — −309.81 → 50.19, 180 유지, −180 → 180, 340 → −20, −340 → 20', () => {
    const size = { width: 20, height: 20 }
    const cases: Array<[ArmTransform, number]> = [
      [arm(180, -129.81, 1.562), 50.19],
      [arm(-90, 90, 1), 180],
      [arm(90, -90, 1), 180],
      [arm(-170, 170, 1), -20],
      [arm(170, -170, 1), 20],
      [arm(0, -90, 1.2), -90],
    ]
    for (const [a, deg] of cases) {
      const r = penTransform(O, a, { x: 90, y: -10 }, size)
      expect(r.deg).toBeCloseTo(deg, 2)
      expect(r.deg).toBeGreaterThan(-180)
      expect(r.deg).toBeLessThanOrEqual(180)
    }
  })

  it('TC-180: 입력에 비유한 값이 있으면 PEN_REST, 음수 크기는 0으로 본다, 결과 필드는 dx·dy·deg뿐(스케일 없음)', () => {
    const A = arm(0, 90, 1)
    const P = { x: 90, y: -10 }
    const S = { width: 20, height: 20 }
    const bad: Array<[Point, ArmTransform, Point, { width: number; height: number }]> = [
      [{ x: NaN, y: 0 }, A, P, S],
      [{ x: 0, y: Infinity }, A, P, S],
      [O, arm(0, NaN, 1), P, S],
      [O, arm(-Infinity, 90, 1), P, S],
      [O, arm(0, 90, Infinity), P, S],
      [O, A, { x: NaN, y: -10 }, S],
      [O, A, { x: 90, y: -Infinity }, S],
      [O, A, P, { width: NaN, height: 20 }],
      [O, A, P, { width: 20, height: Infinity }],
    ]
    for (const [s, a, p, sz] of bad) expect(z(penTransform(s, a, p, sz))).toEqual(PEN_REST)
    // 음수 크기 = 0 → P = penPos (100,0) → P' (0,100)
    expect(z(penTransform(O, A, { x: 100, y: 0 }, { width: -20, height: -20 }))).toEqual({ dx: -100, dy: 100, deg: 90 })
    expect(Object.keys(penTransform(O, A, P, S)).sort()).toEqual(['deg', 'dx', 'dy'])
  })
})

describe('penTransformCss (design/functions.md §5.5)', () => {
  it('TC-181: `translate(${dx}px, ${dy}px) rotate(${deg}deg)` — PEN_REST·-0은 0으로, 음수·소수 그대로', () => {
    expect(penTransformCss(PEN_REST)).toBe('translate(0px, 0px) rotate(0deg)')
    expect(penTransformCss({ dx: -0, dy: -0, deg: -0 })).toBe('translate(0px, 0px) rotate(0deg)')
    expect(penTransformCss({ dx: -140, dy: -190, deg: -90 })).toBe('translate(-140px, -190px) rotate(-90deg)')
    expect(penTransformCss({ dx: -29.97, dy: -170.02, deg: 50.19 })).toBe(
      'translate(-29.97px, -170.02px) rotate(50.19deg)',
    )
    expect(penTransformCss({ dx: 27.6, dy: 118.56, deg: -45 })).toBe('translate(27.6px, 118.56px) rotate(-45deg)')
    expect(penTransformCss({ dx: 1, dy: 2, deg: 3 })).not.toMatch(/scale/)
  })
})

describe('defaultPenPos·resolvePenPos (design/functions.md §5.5, design.md §10.7 기본 위치 규칙)', () => {
  it('TC-182: 손 그림 중심을 mouse.hand ?? 이동 영역 중심에 — 설계 예 (334,498), hand 우선, 정수 반올림, 음수·비유한 크기 = 0, penPos 무시', () => {
    expect(defaultPenPos(mouse({ area: DEF_AREA }), PEN_SIZE)).toEqual({ x: 334, y: 498 })
    expect(defaultPenPos(mouse({ area: DEF_AREA, hand: { x: 500, y: 600 } }), { width: 50, height: 30 })).toEqual({
      x: 475,
      y: 585,
    })
    // AREA 중심 (520,530) − (100.5, 77.5) = (419.5, 452.5) → Math.round
    expect(defaultPenPos(mouse(), { width: 201, height: 155 })).toEqual({ x: 420, y: 453 })
    expect(defaultPenPos(mouse(), PEN_SIZE)).toEqual({ x: 419, y: 453 })
    expect(defaultPenPos(mouse({ hand: { x: 500, y: 600 } }), { width: -10, height: -10 })).toEqual({ x: 500, y: 600 })
    expect(defaultPenPos(mouse({ hand: { x: 500, y: 600 } }), { width: NaN, height: Infinity })).toEqual({
      x: 500,
      y: 600,
    })
    expect(defaultPenPos(mouse({ area: DEF_AREA, penPos: { x: 1, y: 2 } }), PEN_SIZE)).toEqual({ x: 334, y: 498 })
  })

  it('TC-183: resolvePenPos = mouse.penPos ?? defaultPenPos — 지정값은 크기와 무관, (0,0)도 지정값, null이면 기본 규칙', () => {
    expect(resolvePenPos(mouse({ penPos: { x: 10, y: 20 } }), PEN_SIZE)).toEqual({ x: 10, y: 20 })
    expect(resolvePenPos(mouse({ penPos: { x: 10, y: 20 } }), { width: 1, height: 1 })).toEqual({ x: 10, y: 20 })
    expect(resolvePenPos(mouse({ penPos: { x: 0, y: 0 } }), PEN_SIZE)).toEqual({ x: 0, y: 0 })
    const m = mouse({ area: DEF_AREA, penPos: null })
    expect(resolvePenPos(m, PEN_SIZE)).toEqual(defaultPenPos(m, PEN_SIZE))
    expect(resolvePenPos(m, PEN_SIZE)).toEqual({ x: 334, y: 498 })
  })
})

describe('armTransformFor (design/functions.md §5.5 ①~⑤ = §5.4 MouseArm 1~5단계)', () => {
  it('TC-184: atRest·모니터 없음·기준점 = 어깨 → REST_TRANSFORM, 그 밖에는 resolvePivot → pickMonitor → cursorUv → bilerpQuad → armTransform 합성과 같다', () => {
    const base = { mouse: mouse(), monitors: [MON], cursor: { x: 960, y: 1080 }, anchor: { x: 520, y: 530 }, atRest: false }
    expect(armTransformFor({ ...base, atRest: true })).toEqual(REST_TRANSFORM)
    expect(armTransformFor({ ...base, monitors: [] })).toEqual(REST_TRANSFORM)
    expect(armTransformFor({ ...base, monitors: [{ x: 0, y: 0, width: 0, height: 0 }] })).toEqual(REST_TRANSFORM)
    expect(armTransformFor({ ...base, anchor: SHOULDER })).toEqual(REST_TRANSFORM)
    expect(armTransformCss(armTransformFor({ ...base, atRest: true }))).toBe(REST)

    const compose = (inp: typeof base) => {
      const mon = pickMonitor(inp.cursor, inp.monitors) as ScreenBounds
      const { u, v } = cursorUv(inp.cursor, mon)
      const m = inp.mouse
      return armTransform(m.shoulder, resolvePivot(inp.anchor, m.hand, m.area), bilerpQuad(m.area, u, v))
    }
    const cases: Array<[typeof base, string]> = [
      [base, DOWN],
      [{ ...base, anchor: null as unknown as Point, mouse: mouse({ hand: { x: 620, y: 430 } }), cursor: { x: 960, y: 0 } }, UP_ALT],
      [{ ...base, anchor: null as unknown as Point, cursor: { x: 960, y: 0 } }, UP],
      [{ ...base, monitors: [MON_A, MON_B], cursor: { x: 100, y: 1980 } }, MAX],
    ]
    for (const [inp, css] of cases) {
      const t = armTransformFor(inp)
      expect(t).toEqual(compose(inp))
      expect(armTransformCss(t)).toBe(css)
    }
  })
})
