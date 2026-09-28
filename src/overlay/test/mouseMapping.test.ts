/**
 * 마우스 파츠 좌표·변형 순수 함수 TC — design/functions.md §5.4, design.md §10.4 (CR-007·008·015·017).
 * 대상: src/state/mouseMapping.ts, src/bridge/types.ts DEFAULT_MOUSE_SETTINGS
 * 시나리오: src/overlay/test/scenarios.md TC-015 ~ TC-017, TC-024, TC-025, TC-113 ~ TC-118, TC-120
 * 폐기: TC-018·TC-019(mapAroundPivot)·TC-020(armRotationDeg) — CR-017. TC-021~TC-023 — CR-015.
 * 계약(MouseSettings.area·pad 삭제)·구현 전에는 CR-017 TC가 실패한다(scenarios.md §0.3).
 */
import { describe, expect, it } from 'vitest'
import * as mapping from 'state/mouseMapping'
import {
  ARM_EPS,
  REST_TRANSFORM,
  STRETCH_MAX,
  STRETCH_MIN,
  armTransform,
  armTransformCss,
  bilerpQuad,
  cursorUv,
  pickMonitor,
  resolvePivot,
  type ArmTransform,
  type Quad,
} from 'state/mouseMapping'
import { DEFAULT_MOUSE_SETTINGS, type Point } from 'bridge/types'

/** 두 모니터 픽스처(design/functions.md §5.4 예): 위 WQHD, 아래 1080p */
const MON_A = { x: 0, y: 0, width: 2560, height: 1440 }
const MON_B = { x: 320, y: 1440, width: 1920, height: 1080 }
/** 기본 이동 영역(core settings.md 기본값, 관리자 정정 2026-09-23) — 중심 (435,575) */
const DEF_AREA: Quad = [
  { x: 375, y: 525 },
  { x: 495, y: 525 },
  { x: 495, y: 625 },
  { x: 375, y: 625 },
]
/** 직사각형 영역(설계 예) — 중심 (330,605) */
const RECT: Quad = [
  { x: 250, y: 560 },
  { x: 410, y: 560 },
  { x: 410, y: 650 },
  { x: 250, y: 650 },
]
/** 자유 사각형(설계 예) — (0.5,0.5) → (57.5,60) */
const FREE: Quad = [
  { x: 0, y: 0 },
  { x: 100, y: 20 },
  { x: 120, y: 120 },
  { x: 10, y: 100 },
]
const UNIT: Quad = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]

describe('resolvePivot — 기준점 폴백 anchor → hand → 이동 영역 중심 (R-21, CR-017 셋째 인자 area)', () => {
  it('TC-015: bridge 기준점(anchor)이 있으면 그대로 쓰고 hand·영역은 무시한다', () => {
    expect(resolvePivot({ x: 262.5, y: 1.5 }, { x: 495, y: 570 }, DEF_AREA)).toEqual({ x: 262.5, y: 1.5 })
  })

  it('TC-016: anchor가 null이면 mouse.hand를 쓴다', () => {
    expect(resolvePivot(null, { x: 495, y: 570 }, DEF_AREA)).toEqual({ x: 495, y: 570 })
  })

  it('TC-017: anchor·hand 모두 null이면 이동 영역 중심(네 꼭짓점을 (0.5,0.5)로 보간)', () => {
    expect(resolvePivot(null, null, DEF_AREA)).toEqual({ x: 435, y: 575 })
    expect(resolvePivot(null, null, RECT)).toEqual({ x: 330, y: 605 })
    expect(resolvePivot(null, null, FREE)).toEqual({ x: 57.5, y: 60 })
  })
})

describe('pickMonitor — 커서가 있는 모니터, 없으면 가장 가까운 모니터 (R-20)', () => {
  const both = [MON_A, MON_B]

  it('TC-113: 포함(반열린 구간)·가장 가까운 모니터·동률은 앞선 것·무효 모니터 제외·비유한 좌표 null', () => {
    expect(pickMonitor({ x: 1000, y: 2000 }, both)).toEqual(MON_B)
    expect(pickMonitor({ x: 1000, y: 500 }, both)).toEqual(MON_A)
    expect(pickMonitor({ x: 0, y: 0 }, both)).toEqual(MON_A)
    // A의 아래 끝 y = 1440은 A 밖, B 안
    expect(pickMonitor({ x: 1000, y: 1440 }, both)).toEqual(MON_B)
    // 두 모니터 밖: A 거리² 560², B 거리² 220² → B
    expect(pickMonitor({ x: 100, y: 2000 }, both)).toEqual(MON_B)
    // A의 오른쪽 끝 x = 2560은 밖이지만 거리 0 → A
    expect(pickMonitor({ x: 2560, y: 100 }, both)).toEqual(MON_A)
    // 음수 원점 모니터
    const left = { x: -1920, y: 0, width: 1920, height: 1080 }
    expect(pickMonitor({ x: -1, y: 500 }, [MON_A, left])).toEqual(left)
    // 거리 동률 → 목록에서 앞선 것
    const m1 = { x: 0, y: 0, width: 100, height: 100 }
    const m2 = { x: 200, y: 0, width: 100, height: 100 }
    expect(pickMonitor({ x: 150, y: 50 }, [m1, m2])).toEqual(m1)
    expect(pickMonitor({ x: 150, y: 50 }, [m2, m1])).toEqual(m2)
    // 너비·높이 ≤ 0인 모니터는 후보에서 뺀다(거리 0이어도)
    const zeroW = { x: 0, y: 0, width: 0, height: 1080 }
    expect(pickMonitor({ x: 0, y: 0 }, [zeroW, MON_B])).toEqual(MON_B)
    expect(pickMonitor({ x: 0, y: 0 }, [zeroW, { x: 0, y: 0, width: 1920, height: -5 }])).toBeNull()
    expect(pickMonitor({ x: 0, y: 0 }, [])).toBeNull()
    // 비유한 좌표
    expect(pickMonitor({ x: Number.NaN, y: 0 }, both)).toBeNull()
    expect(pickMonitor({ x: 0, y: Number.POSITIVE_INFINITY }, both)).toBeNull()
  })
})

describe('cursorUv — 모니터 내 비율 [0,1] 고정 (R-20)', () => {
  it('TC-114: 중앙·모서리·범위 밖 고정·음수 원점, 크기 0 이하는 (0.5,0.5)', () => {
    expect(cursorUv({ x: 1280, y: 1980 }, MON_B)).toEqual({ u: 0.5, v: 0.5 })
    expect(cursorUv({ x: 320, y: 1440 }, MON_B)).toEqual({ u: 0, v: 0 })
    expect(cursorUv({ x: 2240, y: 2520 }, MON_B)).toEqual({ u: 1, v: 1 })
    expect(cursorUv({ x: 100, y: 1980 }, MON_B)).toEqual({ u: 0, v: 0.5 })
    expect(cursorUv({ x: 5000, y: -50 }, MON_B)).toEqual({ u: 1, v: 0 })
    expect(cursorUv({ x: -960, y: 270 }, { x: -1920, y: 0, width: 1920, height: 1080 })).toEqual({
      u: 0.5,
      v: 0.25,
    })
    expect(cursorUv({ x: 10, y: 10 }, { x: 0, y: 0, width: 0, height: 1080 })).toEqual({ u: 0.5, v: 0.5 })
    expect(cursorUv({ x: 10, y: 10 }, { x: 0, y: 0, width: 1920, height: 0 })).toEqual({ u: 0.5, v: 0.5 })
    expect(cursorUv({ x: 10, y: 10 }, { x: 0, y: 0, width: -100, height: 100 })).toEqual({ u: 0.5, v: 0.5 })
  })
})

describe('bilerpQuad — 네 꼭짓점 쌍선형 보간 (R-20, R-21)', () => {
  it('TC-115: 네 모서리 = 꼭짓점, 중앙 = 평균, 자유 사각형, 반올림 없음, [0,1] 고정, 비유한 0.5', () => {
    expect(bilerpQuad(RECT, 0, 0)).toEqual({ x: 250, y: 560 })
    expect(bilerpQuad(RECT, 1, 0)).toEqual({ x: 410, y: 560 })
    expect(bilerpQuad(RECT, 1, 1)).toEqual({ x: 410, y: 650 })
    expect(bilerpQuad(RECT, 0, 1)).toEqual({ x: 250, y: 650 })
    expect(bilerpQuad(RECT, 0.5, 0.5)).toEqual({ x: 330, y: 605 })
    expect(bilerpQuad(DEF_AREA, 0.5, 0.5)).toEqual({ x: 435, y: 575 })
    expect(bilerpQuad(FREE, 0.5, 0.5)).toEqual({ x: 57.5, y: 60 })
    expect(bilerpQuad(FREE, 0.25, 0.5)).toEqual({ x: 31.25, y: 55 })
    expect(bilerpQuad(FREE, 1, 0)).toEqual({ x: 100, y: 20 })
    // 반올림 없음(2자리 반올림이면 0.13·0.38)
    expect(bilerpQuad(UNIT, 0.125, 0.375)).toEqual({ x: 0.125, y: 0.375 })
    // 범위 밖은 [0,1]로 고정
    expect(bilerpQuad(FREE, -1, 2)).toEqual({ x: 10, y: 100 })
    expect(bilerpQuad(FREE, 3, -2)).toEqual({ x: 100, y: 20 })
    // 비유한 값은 0.5
    expect(bilerpQuad(FREE, Number.NaN, Number.NaN)).toEqual({ x: 57.5, y: 60 })
    expect(bilerpQuad(FREE, Number.NaN, 0)).toEqual({ x: 50, y: 10 })
  })
})

describe('armTransform — 어깨 핀 회전 + 팔 방향 늘어나기 0.5~1.6 (R-21)', () => {
  const S0 = { x: 0, y: 0 }
  const A0 = { x: 100, y: 0 }
  const S = { x: 620, y: 530 }
  const A = { x: 520, y: 530 }

  it('TC-116: 각도·배율 식, 배율 상·하한 고정, 목표 = 어깨면 방향 유지, |A−S|≈0·비유한이면 REST_TRANSFORM', () => {
    // 설계 예(design/functions.md §5.4)
    expect(armTransform(S0, A0, { x: 0, y: -120 })).toEqual({ baseDeg: 0, targetDeg: -90, stretch: 1.2 })
    expect(armTransform(S0, A0, { x: 300, y: 0 })).toEqual({ baseDeg: 0, targetDeg: 0, stretch: 1.6 })
    expect(armTransform(S0, A0, { x: 20, y: 0 })).toEqual({ baseDeg: 0, targetDeg: 0, stretch: 0.5 })
    expect(armTransform(S0, A0, { x: 0, y: 0 })).toEqual({ baseDeg: 0, targetDeg: 0, stretch: 0.5 })
    expect(armTransform(S, A, { x: 520, y: 410 })).toEqual({ baseDeg: 180, targetDeg: -129.81, stretch: 1.562 })
    // 경계값 그대로(0.5·1.6)
    expect(armTransform(S0, A0, { x: 50, y: 0 }).stretch).toBe(0.5)
    expect(armTransform(S0, A0, { x: 160, y: 0 }).stretch).toBe(1.6)
    // 소수 3자리(√2 = 1.41421…)
    expect(armTransform(S, A, { x: 520, y: 630 })).toEqual({ baseDeg: 180, targetDeg: 135, stretch: 1.414 })
    // 비스듬한 팔: θh = atan2(80,60) = 53.13
    expect(armTransform(S0, { x: 60, y: 80 }, { x: 0, y: -120 })).toEqual({
      baseDeg: 53.13,
      targetDeg: -90,
      stretch: 1.2,
    })
    // 목표 = 어깨 → 방향 유지(θt = θh), 배율은 하한
    expect(armTransform(S, A, S)).toEqual({ baseDeg: 180, targetDeg: 180, stretch: 0.5 })
    // 각도는 접지 않는다(180과 −179.43을 그대로)
    expect(armTransform(S0, { x: -100, y: 0 }, { x: -100, y: -1 })).toEqual({
      baseDeg: 180,
      targetDeg: -179.43,
      stretch: 1,
    })
    // |A−S| < ARM_EPS → 변형 없음
    expect(armTransform(S, S, { x: 0, y: 0 })).toEqual(REST_TRANSFORM)
    expect(armTransform(S0, { x: 5e-7, y: 0 }, { x: 0, y: -120 })).toEqual(REST_TRANSFORM)
    // 비유한 입력
    expect(armTransform({ x: Number.NaN, y: 0 }, A0, { x: 0, y: -120 })).toEqual(REST_TRANSFORM)
    expect(armTransform(S0, { x: Number.POSITIVE_INFINITY, y: 0 }, { x: 0, y: -120 })).toEqual(REST_TRANSFORM)
    expect(armTransform(S0, A0, { x: Number.NaN, y: 0 })).toEqual(REST_TRANSFORM)
  })

  it('TC-117: 상수 — STRETCH_MIN 0.5 · STRETCH_MAX 1.6 · ARM_EPS 1e-6 · REST_TRANSFORM = 회전 0°·배율 1', () => {
    expect(STRETCH_MIN).toBe(0.5)
    expect(STRETCH_MAX).toBe(1.6)
    expect(ARM_EPS).toBe(1e-6)
    expect(REST_TRANSFORM).toEqual({ baseDeg: 0, targetDeg: 0, stretch: 1 })
  })
})

/** CSS 변형 문자열을 어깨 원점으로 점에 적용한다(오른쪽 변환부터 — CSS 규칙). */
const RE = /^rotate\((-?[\d.]+)deg\) scaleX\(([\d.]+)\) rotate\((-?[\d.]+)deg\)$/
const rot = (deg: number, p: Point): Point => {
  const r = (deg * Math.PI) / 180
  return { x: p.x * Math.cos(r) - p.y * Math.sin(r), y: p.x * Math.sin(r) + p.y * Math.cos(r) }
}
const applyLinear = (css: string, v: Point): Point => {
  const m = RE.exec(css)
  if (!m) throw new Error(`형식 불일치: ${css}`)
  const [, a, k, b] = m
  const r1 = rot(Number(b), v)
  return rot(Number(a), { x: r1.x * Number(k), y: r1.y })
}
const applyAt = (css: string, s: Point, p: Point): Point => {
  const d = applyLinear(css, { x: p.x - s.x, y: p.y - s.y })
  return { x: s.x + d.x, y: s.y + d.y }
}

describe('armTransformCss — rotate(θt) scaleX(k) rotate(−θh) (R-21, R-15)', () => {
  it('TC-118: 문자열 형식(-0은 "0"), 적용하면 손 기준점이 목표(또는 상·하한 거리)에 닿고 팔 두께는 그대로', () => {
    expect(armTransformCss(REST_TRANSFORM)).toBe('rotate(0deg) scaleX(1) rotate(0deg)')
    const t1: ArmTransform = { baseDeg: 0, targetDeg: -90, stretch: 1.2 }
    expect(armTransformCss(t1)).toBe('rotate(-90deg) scaleX(1.2) rotate(0deg)')
    expect(armTransformCss({ baseDeg: 180, targetDeg: -129.81, stretch: 1.562 })).toBe(
      'rotate(-129.81deg) scaleX(1.562) rotate(-180deg)',
    )
    expect(armTransformCss({ baseDeg: -90, targetDeg: 135, stretch: 1.414 })).toBe(
      'rotate(135deg) scaleX(1.414) rotate(90deg)',
    )
    // 기하 확인: 늘어나기가 상·하한 안이면 A → T
    const S = { x: 620, y: 530 }
    const A = { x: 520, y: 530 }
    const T = { x: 520, y: 410 }
    const hit = applyAt(armTransformCss(armTransform(S, A, T)), S, A)
    expect(hit.x).toBeCloseTo(T.x, 0)
    expect(hit.y).toBeCloseTo(T.y, 0)
    const S0 = { x: 0, y: 0 }
    const A2 = { x: 60, y: 80 }
    const hit2 = applyAt(armTransformCss(armTransform(S0, A2, { x: 0, y: -120 })), S0, A2)
    expect(hit2.x).toBeCloseTo(0, 0)
    expect(hit2.y).toBeCloseTo(-120, 0)
    // 상한 1.6에 걸리면 T 방향 위 1.6·|A−S| 지점(T에 닿지 않음 — 수용)
    const capped = applyAt(armTransformCss(armTransform(S0, { x: 100, y: 0 }, { x: 300, y: 0 })), S0, {
      x: 100,
      y: 0,
    })
    expect(capped.x).toBeCloseTo(160, 3)
    expect(capped.y).toBeCloseTo(0, 3)
    // 팔 방향에 수직인 폭(두께)은 바뀌지 않는다
    const n = applyLinear(armTransformCss(armTransform(S0, A2, { x: 0, y: -120 })), { x: -8, y: 6 })
    expect(Math.hypot(n.x, n.y)).toBeCloseTo(10, 3)
  })
})

describe('삭제·기본값 (CR-007·008·015·017)', () => {
  it('TC-024: ui 알파 무게중심 계산은 없다 — alphaCentroid export·useAlphaCentroid 파일 없음', () => {
    expect('alphaCentroid' in mapping).toBe(false)
    const hooks = import.meta.glob('../components/useAlphaCentroid.{ts,tsx}')
    expect(Object.keys(hooks)).toHaveLength(0)
  })

  it('TC-025: DEFAULT_MOUSE_SETTINGS — 어깨 582,484 · area 기본 4점 · hand null · partPos 411,464 · penPos 372,476 · penMode true · pad·팔 굵기·색 없음', () => {
    expect(DEFAULT_MOUSE_SETTINGS).toEqual({
      shoulder: { x: 582, y: 484 }, // contract v0.20(CR-044 🔒): 사용자 확정값(v0.18~v0.19 558,500 · v0.17까지 620,530)
      area: DEF_AREA, // CR-044: 변경 대상 아님 — 값 불변
      hand: null, // CR-044: 변경 대상 아님 — 값 불변
      partPos: { x: 411, y: 464 }, // contract v0.20(CR-044 🔒): 사용자 확정값(v0.8~v0.19 389,492)
      penPos: { x: 372, y: 476 }, // contract v0.20(CR-044 🔒): 사용자 확정값(v0.18~v0.19 356,504 · v0.16~v0.17 380,496 · v0.13~v0.15 null)
      penMode: true, // contract v0.20(CR-044 🔒): v0.18부터 true 유지(v0.15~v0.17 false)
    })
    for (const k of ['pad', 'armWidth', 'armColor']) expect(k in DEFAULT_MOUSE_SETTINGS).toBe(false)
  })

  it('TC-120: CR-017 대체 — armRotationDeg·mapAroundPivot export 없음, 새 함수 6종 export', () => {
    expect('armRotationDeg' in mapping).toBe(false)
    expect('mapAroundPivot' in mapping).toBe(false)
    for (const name of ['pickMonitor', 'cursorUv', 'bilerpQuad', 'armTransform', 'armTransformCss', 'resolvePivot']) {
      expect(typeof (mapping as Record<string, unknown>)[name]).toBe('function')
    }
  })
})
