/**
 * settings 마우스 파츠 순수 모듈 스펙 — CR-005(한 단계 마법사) · CR-016(끌어다 놓기 판정·범위) · CR-018(이동 영역).
 * 기준: src/settings/design.md §4 `wizard` · §5.1 · src/settings/test/scenarios.md
 *       TC-001 ~ TC-007, TC-045, TC-046, TC-059 ~ TC-062, TC-078 · TC-079(CR-026 pickDragTarget).
 * CR-026: BASE·기대 리터럴에 penPos: null(bridge 미확정 계약 기본값).
 *
 * TC-008(isPreviewLayerMode)은 CR-016 으로 폐기 — 함수 삭제(design §5.1)에 맞춰 import·사례를 지웠다.
 * 선행: CR-018 화면(WizardState.area · startArea · pickArea/reviewArea · applyWizard reviewArea).
 *       bridge CR-018(MouseSettings.area 추가 · pad 삭제). 그 전에는 tsc 가 픽스처 타입을 거부한다
 *       (vitest 실행은 타입을 지우므로 영향 없음).
 */
import { describe, expect, it } from 'vitest'
import type { MouseSettings, Point } from 'bridge/types'
import type { AlphaMask } from '../alphaMask'
import {
  applyWizard,
  clampPartPos,
  fitScale,
  hitOpaque,
  hitPart,
  initialWizard,
  pickDragTarget,
  previewToCanvas,
  wizardReduce,
  type DragCandidate,
  type WizardState,
} from '../mouseWizard'

/** 저장된 이동 영역(왼쪽 위 · 오른쪽 위 · 오른쪽 아래 · 왼쪽 아래) */
const AREA: MouseSettings['area'] = [
  { x: 200, y: 500 },
  { x: 300, y: 500 },
  { x: 300, y: 560 },
  { x: 200, y: 560 },
]

const BASE: MouseSettings = {
  shoulder: { x: 600, y: 480 },
  area: AREA,
  hand: { x: 400, y: 560 },
  partPos: { x: 100, y: 200 },
  penPos: null, // CR-026(bridge 미확정 계약): 기본 null
  penMode: false, // CR-033(contract v0.15 §3.3): 기본 false — 마법사·끌기는 이 값을 건드리지 않는다(펼쳐 보존)
}

const CANVAS = { width: 900, height: 700 }

const IDLE: WizardState = { step: 'idle', shoulder: null, area: [] }
const PICK_SHOULDER: WizardState = { step: 'pickShoulder', shoulder: null, area: [] }
const PICK_AREA_0: WizardState = { step: 'pickArea', shoulder: null, area: [] }

const P1: Point = { x: 100, y: 400 }
const P2: Point = { x: 800, y: 400 }
const P3: Point = { x: 800, y: 650 }
const P4: Point = { x: 100, y: 650 }

describe('wizardReduce — 한 단계 마법사 (CR-005, CR-018 상태 모양)', () => {
  it('TC-001: start 는 idle·pickShoulder·review 어디서든 { pickShoulder, shoulder: null, area: [] } 로 간다', () => {
    expect(initialWizard).toStrictEqual({ step: 'idle', shoulder: null, area: [] })
    const review: WizardState = { step: 'review', shoulder: { x: 1, y: 2 }, area: [] }
    for (const s of [initialWizard, PICK_SHOULDER, review]) {
      expect(wizardReduce(s, { type: 'start' })).toStrictEqual(PICK_SHOULDER)
    }
  })

  it('TC-002: pickShoulder 에서 pick 한 번이면 review, 상태 키는 area·shoulder·step 뿐(손 위치 단계 없음)', () => {
    const picking = wizardReduce(initialWizard, { type: 'start' })
    const review = wizardReduce(picking, { type: 'pick', point: { x: 620, y: 530 } })
    expect(review).toStrictEqual({ step: 'review', shoulder: { x: 620, y: 530 }, area: [] })
    expect(Object.keys(review).sort()).toEqual(['area', 'shoulder', 'step'])
  })

  it('TC-003: idle·review 에서 pick 은 상태를 바꾸지 않는다', () => {
    expect(wizardReduce(initialWizard, { type: 'pick', point: { x: 1, y: 1 } })).toStrictEqual(IDLE)
    const review: WizardState = { step: 'review', shoulder: { x: 300, y: 200 }, area: [] }
    expect(wizardReduce(review, { type: 'pick', point: { x: 9, y: 9 } })).toStrictEqual({
      step: 'review',
      shoulder: { x: 300, y: 200 },
      area: [],
    })
  })

  it('TC-004: cancel·saved 는 idle·pickShoulder·review 어디서든 initialWizard 로 돌아간다', () => {
    const review: WizardState = { step: 'review', shoulder: { x: 300, y: 200 }, area: [] }
    for (const s of [initialWizard, PICK_SHOULDER, review]) {
      expect(wizardReduce(s, { type: 'cancel' })).toStrictEqual(IDLE)
      expect(wizardReduce(s, { type: 'saved' })).toStrictEqual(IDLE)
    }
  })
})

describe('wizardReduce — 이동 영역 (CR-018)', () => {
  it('TC-059: startArea 는 어느 단계에서든 { pickArea, shoulder: null, area: [] }, 이동 영역 단계의 start 는 pickShoulder', () => {
    const review: WizardState = { step: 'review', shoulder: { x: 1, y: 2 }, area: [] }
    const picking2: WizardState = { step: 'pickArea', shoulder: null, area: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }
    const reviewArea: WizardState = { step: 'reviewArea', shoulder: null, area: [P1, P2, P3, P4] }
    for (const s of [initialWizard, PICK_SHOULDER, review, picking2, reviewArea]) {
      expect(wizardReduce(s, { type: 'startArea' })).toStrictEqual(PICK_AREA_0)
    }
    expect(wizardReduce(picking2, { type: 'start' })).toStrictEqual(PICK_SHOULDER)
    expect(wizardReduce(reviewArea, { type: 'start' })).toStrictEqual(PICK_SHOULDER)
  })

  it('TC-060: pickArea 에서 pick 은 점을 순서대로 쌓고 4번째에 reviewArea — 매번 새 배열(불변)', () => {
    const s0 = wizardReduce(initialWizard, { type: 'startArea' })
    const s1 = wizardReduce(s0, { type: 'pick', point: P1 })
    const s2 = wizardReduce(s1, { type: 'pick', point: P2 })
    const s3 = wizardReduce(s2, { type: 'pick', point: P3 })
    const s4 = wizardReduce(s3, { type: 'pick', point: P4 })
    expect(s1).toStrictEqual({ step: 'pickArea', shoulder: null, area: [P1] })
    expect(s2).toStrictEqual({ step: 'pickArea', shoulder: null, area: [P1, P2] })
    expect(s3).toStrictEqual({ step: 'pickArea', shoulder: null, area: [P1, P2, P3] })
    expect(s4).toStrictEqual({ step: 'reviewArea', shoulder: null, area: [P1, P2, P3, P4] })
    expect(s0.area).toEqual([])
    expect(s1.area).toHaveLength(1)
    expect(s2.area).toHaveLength(2)
    expect(s1.area).not.toBe(s2.area)
    expect(initialWizard.area).toEqual([])
  })

  it('TC-061: reviewArea 에서 pick 은 무시되고, pickArea·reviewArea 의 cancel·saved 는 initialWizard', () => {
    const s2: WizardState = { step: 'pickArea', shoulder: null, area: [P1, P2] }
    const s4: WizardState = { step: 'reviewArea', shoulder: null, area: [P1, P2, P3, P4] }
    expect(wizardReduce(s4, { type: 'pick', point: { x: 5, y: 5 } })).toStrictEqual({
      step: 'reviewArea',
      shoulder: null,
      area: [P1, P2, P3, P4],
    })
    for (const s of [s2, s4]) {
      expect(wizardReduce(s, { type: 'cancel' })).toStrictEqual(IDLE)
      expect(wizardReduce(s, { type: 'saved' })).toStrictEqual(IDLE)
    }
  })
})

describe('applyWizard', () => {
  it('TC-005: review + shoulder 이면 shoulder 만 바꾸고 area·hand·partPos 는 base 그대로', () => {
    const done: WizardState = { step: 'review', shoulder: { x: 300, y: 200 }, area: [] }
    expect(applyWizard(BASE, done)).toStrictEqual({
      shoulder: { x: 300, y: 200 },
      area: AREA,
      hand: { x: 400, y: 560 },
      partPos: { x: 100, y: 200 },
      penPos: null,
      penMode: false,
    })
    expect(BASE.shoulder).toStrictEqual({ x: 600, y: 480 }) // 입력 불변
  })

  it('TC-005: review 가 아니거나 shoulder 가 없으면 null', () => {
    expect(applyWizard(BASE, initialWizard)).toBeNull()
    expect(applyWizard(BASE, PICK_SHOULDER)).toBeNull()
    expect(applyWizard(BASE, { step: 'review', shoulder: null, area: [] })).toBeNull()
  })

  it('TC-062: reviewArea + 4점이면 area 만 클릭 순서대로 바꾸고(새 배열) 나머지는 base 그대로', () => {
    const s4: WizardState = { step: 'reviewArea', shoulder: null, area: [P1, P2, P3, P4] }
    const next = applyWizard(BASE, s4)
    expect(next).toStrictEqual({
      shoulder: { x: 600, y: 480 },
      area: [P1, P2, P3, P4],
      hand: { x: 400, y: 560 },
      partPos: { x: 100, y: 200 },
      penPos: null,
      penMode: false,
    })
    expect(next?.area).not.toBe(s4.area)
    expect(BASE.area).toStrictEqual(AREA) // 입력 불변
  })

  it('TC-062: 영역 모양은 검사하지 않는다(자기 교차 순서도 그대로 적용)', () => {
    const cross: WizardState = { step: 'reviewArea', shoulder: null, area: [P1, P3, P2, P4] }
    expect(applyWizard(BASE, cross)?.area).toStrictEqual([P1, P3, P2, P4])
  })

  it('TC-062: pickArea 이거나 reviewArea 인데 점이 4개가 아니면 null', () => {
    expect(applyWizard(BASE, { step: 'pickArea', shoulder: null, area: [P1, P2, P3] })).toBeNull()
    expect(applyWizard(BASE, { step: 'reviewArea', shoulder: null, area: [P1, P2, P3] })).toBeNull()
    expect(applyWizard(BASE, { step: 'reviewArea', shoulder: null, area: [] })).toBeNull()
  })
})

describe('previewToCanvas', () => {
  it('TC-006: 오프셋 / scale 을 반올림해 캔버스 정수 좌표로 바꾼다', () => {
    expect(previewToCanvas({ x: 247.5, y: 285 }, 0.5, CANVAS)).toEqual({ x: 495, y: 570 })
    expect(previewToCanvas({ x: 100.3, y: 50.2 }, 0.5, CANVAS)).toEqual({ x: 201, y: 100 })
  })

  it('TC-006: 캔버스 밖은 [0, width]·[0, height] 로 고정한다', () => {
    expect(previewToCanvas({ x: -10, y: 9999 }, 0.5, CANVAS)).toEqual({ x: 0, y: 700 })
    expect(previewToCanvas({ x: 950, y: 10 }, 1, CANVAS)).toEqual({ x: 900, y: 10 })
  })

  it('TC-006: scale ≤ 0 이면 1 로 본다', () => {
    expect(previewToCanvas({ x: 30.4, y: 40.6 }, 0, CANVAS)).toEqual({ x: 30, y: 41 })
    expect(previewToCanvas({ x: 30.4, y: 40.6 }, -2, CANVAS)).toEqual({ x: 30, y: 41 })
  })
})

describe('fitScale', () => {
  it('TC-007: 450×350 상자에 비율 유지로 맞추는 배율, 크기 0 이면 1', () => {
    const box = { width: 450, height: 350 }
    expect(fitScale(CANVAS, box)).toBe(0.5)
    expect(fitScale({ width: 450, height: 350 }, box)).toBe(1)
    expect(fitScale({ width: 612, height: 354 }, box)).toBeCloseTo(450 / 612, 10)
    expect(fitScale({ width: 0, height: 700 }, box)).toBe(1)
    expect(fitScale({ width: 900, height: 0 }, box)).toBe(1)
  })
})

describe('hitPart — 끌기 시작 판정 (CR-016)', () => {
  const pos = { x: 100, y: 200 }
  const size = { width: 200, height: 150 }

  it('TC-045: 그림 사각형 [x, x+w) × [y, y+h) 안이면 true — 좌상단 포함, 우·하단 제외', () => {
    expect(hitPart({ x: 100, y: 200 }, pos, size)).toBe(true)
    expect(hitPart({ x: 200, y: 275 }, pos, size)).toBe(true)
    expect(hitPart({ x: 299, y: 349 }, pos, size)).toBe(true)
    expect(hitPart({ x: 300, y: 200 }, pos, size)).toBe(false)
    expect(hitPart({ x: 100, y: 350 }, pos, size)).toBe(false)
    expect(hitPart({ x: 99, y: 250 }, pos, size)).toBe(false)
    expect(hitPart({ x: 150, y: 199 }, pos, size)).toBe(false)
  })

  it('TC-045: 캔버스 전체 크기 그림(0,0)은 캔버스 안 점에서 true, AssetEntry 를 size 로 넘겨도 된다', () => {
    expect(hitPart({ x: 0, y: 0 }, { x: 0, y: 0 }, { width: 900, height: 700 })).toBe(true)
    expect(hitPart({ x: 899, y: 699 }, { x: 0, y: 0 }, { width: 900, height: 700 })).toBe(true)
    const part = {
      slot: 'mouse_base' as const,
      fileName: 'mouse_base.png',
      width: 200,
      height: 150,
      bytes: 1000,
      url: 'asset://mouse_base.png',
    }
    expect(hitPart({ x: 200, y: 300 }, pos, part)).toBe(true)
  })

  it('TC-045: 크기가 0 이하면 false', () => {
    expect(hitPart({ x: 100, y: 200 }, pos, { width: 0, height: 150 })).toBe(false)
    expect(hitPart({ x: 100, y: 200 }, pos, { width: 200, height: -5 })).toBe(false)
  })
})

describe('clampPartPos — 끌기 범위 (CR-016)', () => {
  const size = { width: 200, height: 150 }

  it('TC-046: 범위 안이면 반올림만 한다', () => {
    expect(clampPartPos({ x: 200, y: 250 }, size, CANVAS)).toEqual({ x: 200, y: 250 })
    expect(clampPartPos({ x: 123.4, y: 56.5 }, size, CANVAS)).toEqual({ x: 123, y: 57 })
  })

  it('TC-046: 그림 전체가 캔버스 안 — x ∈ [0, W−w], y ∈ [0, H−h]', () => {
    expect(clampPartPos({ x: -30, y: -1 }, size, CANVAS)).toEqual({ x: 0, y: 0 })
    expect(clampPartPos({ x: 800, y: 600 }, size, CANVAS)).toEqual({ x: 700, y: 550 })
    expect(clampPartPos({ x: 700, y: 550 }, size, CANVAS)).toEqual({ x: 700, y: 550 })
    expect(clampPartPos({ x: 701.4, y: 551 }, size, CANVAS)).toEqual({ x: 700, y: 550 })
  })

  it('TC-046: 캔버스 전체 크기(이상) 그림은 항상 (0, 0), 한 변만 같으면 그 축만 0 고정', () => {
    expect(clampPartPos({ x: 500, y: 300 }, { width: 900, height: 700 }, CANVAS)).toEqual({ x: 0, y: 0 })
    expect(clampPartPos({ x: 50, y: 50 }, { width: 1000, height: 800 }, CANVAS)).toEqual({ x: 0, y: 0 })
    expect(clampPartPos({ x: 40, y: 600 }, { width: 900, height: 150 }, CANVAS)).toEqual({ x: 0, y: 550 })
  })

  it('TC-046: 입력 객체를 바꾸지 않는다', () => {
    const p = { x: -5, y: 900 }
    clampPartPos(p, size, CANVAS)
    expect(p).toEqual({ x: -5, y: 900 })
  })
})

// scenarios.md TC-078 · TC-079. 선행: CR-026 화면(pickDragTarget 신규 — design §5.1)
describe('pickDragTarget — 끌 대상 판정 (CR-026)', () => {
  const part = { pos: { x: 100, y: 200 }, size: { width: 200, height: 150 } } // [100,300)×[200,350)
  const penOver = { pos: { x: 150, y: 250 }, size: { width: 100, height: 80 } } // [150,250)×[250,330) — 팔 파츠와 겹침
  const penApart = { pos: { x: 350, y: 520 }, size: { width: 100, height: 80 } } // [350,450)×[520,600)

  it('TC-078: 겹친 점은 펜 손, 팔 파츠에만 든 점은 팔 파츠, 둘 다 밖은 null (design §5.1 예시)', () => {
    expect(pickDragTarget({ x: 200, y: 300 }, penOver, part)).toBe('pen')
    expect(pickDragTarget({ x: 120, y: 220 }, penOver, part)).toBe('part')
    expect(pickDragTarget({ x: 40, y: 40 }, penOver, part)).toBeNull()
    expect(pickDragTarget({ x: 400, y: 560 }, penApart, part)).toBe('pen')
    expect(pickDragTarget({ x: 200, y: 300 }, penApart, part)).toBe('part')
  })

  it('TC-079: 펜 손 경계는 hitPart 규칙(좌상단 포함·우하단 제외) — 경계 밖이면 팔 파츠로 넘어간다', () => {
    expect(pickDragTarget({ x: 150, y: 250 }, penOver, part)).toBe('pen')
    expect(pickDragTarget({ x: 249, y: 329 }, penOver, part)).toBe('pen')
    expect(pickDragTarget({ x: 250, y: 300 }, penOver, part)).toBe('part')
    expect(pickDragTarget({ x: 200, y: 330 }, penOver, part)).toBe('part')
  })

  it('TC-079: 없는 대상(null)·크기 0 이하 대상은 건너뛴다', () => {
    expect(pickDragTarget({ x: 200, y: 300 }, null, part)).toBe('part')
    expect(pickDragTarget({ x: 400, y: 560 }, penApart, null)).toBe('pen')
    expect(pickDragTarget({ x: 200, y: 300 }, penOver, null)).toBe('pen')
    expect(pickDragTarget({ x: 200, y: 300 }, null, null)).toBeNull()
    expect(pickDragTarget({ x: 200, y: 300 }, { pos: penOver.pos, size: { width: 0, height: 80 } }, part)).toBe('part')
    expect(pickDragTarget({ x: 400, y: 560 }, { pos: penApart.pos, size: { width: 100, height: -1 } }, part)).toBeNull()
  })
})

// ─── CR-040 픽셀 판정 (R-37) ─────────────────────────────────────────────────
// scenarios.md TC-210 ~ TC-212. 기준: src/settings/design/drag-hit.md §5.2 `DragCandidate`·`hitOpaque`·`pickDragTarget`(CR-040 개정)·예 표, §2.3(마스크 없음 → 사각형 대체).
// TC-078·TC-079(위)는 mask 가 없는 DragCandidate — §2.3 사각형 대체라 기대 불변(v15 개정 = 설계 근거만 CR-040).
// 선행: CR-040 소스(mouseWizard.ts hitOpaque·DragCandidate, alphaMask.ts AlphaMask). 그 전에는 hitOpaque 가 undefined 라 아래 사례만 FAIL.

/** width×height 마스크 — pixels 의 [x, y, 알파]만 값, 나머지 0(투명) */
const maskOf = (width: number, height: number, pixels: [number, number, number][] = []): AlphaMask => {
  const alpha = new Uint8Array(width * height)
  for (const [x, y, a] of pixels) alpha[y * width + x] = a
  return { width, height, alpha }
}

describe('hitOpaque — 사각형 예비 판정 뒤 픽셀 판정 (CR-040)', () => {
  // pos (10,20) · 3×2 → 사각형 [10,13)×[20,22). 칠한 픽셀: 그림 기준 (1,0) 알파 255 · (2,1) 알파 1
  const rect = { pos: { x: 10, y: 20 }, size: { width: 3, height: 2 } }
  const c: DragCandidate = { ...rect, mask: maskOf(3, 2, [[1, 0, 255], [2, 1, 1]]) }

  it('TC-210: 마스크가 있으면 좌상단 오프셋을 뺀 자리의 알파>0 만 잡는다(사각형 안 투명 자리는 false)', () => {
    expect(hitOpaque({ x: 11, y: 20 }, c)).toBe(true) // (1,0) 255
    expect(hitOpaque({ x: 12, y: 21 }, c)).toBe(true) // (2,1) 1 — 알파 1 도 칠함
    expect(hitOpaque({ x: 10, y: 20 }, c)).toBe(false) // (0,0) 0 — 사각형 안이지만 투명
    expect(hitOpaque({ x: 12, y: 20 }, c)).toBe(false) // (2,0) 0
    expect(hitOpaque({ x: 13, y: 20 }, c)).toBe(false) // 사각형 밖(우단 제외)
    expect(hitOpaque({ x: 9, y: 20 }, c)).toBe(false) // 사각형 밖
  })

  it('TC-210: 마스크가 null·없음·크기 다름이면 사각형 판정으로 대체, 크기 0 이하는 마스크와 무관하게 false', () => {
    expect(hitOpaque({ x: 10, y: 20 }, { ...rect, mask: null })).toBe(true)
    expect(hitOpaque({ x: 10, y: 20 }, rect)).toBe(true) // mask 키 없음(undefined)
    expect(hitOpaque({ x: 10, y: 20 }, { ...rect, mask: maskOf(2, 2) })).toBe(true) // 폭 다름(교체 직후 옛 마스크) — 전부 0 이어도 대체
    expect(hitOpaque({ x: 10, y: 20 }, { ...rect, mask: maskOf(3, 3) })).toBe(true) // 높이 다름
    expect(hitOpaque({ x: 13, y: 20 }, { ...rect, mask: null })).toBe(false) // 대체여도 사각형 밖은 false
    expect(hitOpaque({ x: 10, y: 20 }, { pos: rect.pos, size: { width: 0, height: 2 }, mask: null })).toBe(false)
    expect(
      hitOpaque({ x: 10, y: 20 }, { pos: rect.pos, size: { width: 3, height: -1 }, mask: maskOf(3, 2, [[0, 0, 255]]) }),
    ).toBe(false)
  })
})

describe('pickDragTarget — 픽셀 판정 (CR-040, 기본 그림 좌표)', () => {
  // 팔 171×199 @ (389,492) = [389,560)×[492,691) · 펜 손 136×196 @ (356,504) = [356,492)×[504,700)
  // 두 사각형 겹침 = x∈[389,492)·y∈[504,691)
  const ARM = { pos: { x: 389, y: 492 }, size: { width: 171, height: 199 } }
  const PEN = { pos: { x: 356, y: 504 }, size: { width: 136, height: 196 } }
  const P = { x: 450, y: 600 } // 팔 기준 (61,108) · 펜 손 기준 (94,96)
  const arm = (a: number): DragCandidate => ({ ...ARM, mask: maskOf(171, 199, [[61, 108, a]]) })
  const pen = (a: number): DragCandidate => ({ ...PEN, mask: maskOf(136, 196, [[94, 96, a]]) })

  it('TC-211: 겹친 점 (450,600) — 설계 예 표 6행(펜 손 투명·팔 칠함이면 팔)', () => {
    expect(pickDragTarget(P, pen(0), arm(255))).toBe('part') // 이번 CR 의 목적
    expect(pickDragTarget(P, pen(255), arm(255))).toBe('pen') // 둘 다 칠함 → 위의 손
    expect(pickDragTarget(P, pen(255), arm(0))).toBe('pen')
    expect(pickDragTarget(P, pen(0), arm(0))).toBeNull() // 둘 다 투명 → 끌기 없음
    expect(pickDragTarget(P, { ...PEN, mask: null }, arm(255))).toBe('pen') // 마스크 없음 → 사각형 대체
    expect(pickDragTarget(P, { ...PEN, mask: maskOf(10, 10) }, arm(255))).toBe('pen') // 크기 다른 마스크 → 사각형 대체
  })

  it('TC-212: 펜 손 사각형에만 든 점 (370,520) — 펜 손 알파 0 이면 null, >0 이면 pen', () => {
    const Q = { x: 370, y: 520 } // 펜 손 기준 (14,16), 팔 사각형 밖(x < 389)
    const penAt = (a: number): DragCandidate => ({ ...PEN, mask: maskOf(136, 196, [[14, 16, a]]) })
    expect(pickDragTarget(Q, penAt(0), arm(255))).toBeNull()
    expect(pickDragTarget(Q, penAt(0), { ...ARM, mask: null })).toBeNull() // 팔 사각형 대체여도 밖
    expect(pickDragTarget(Q, penAt(128), arm(255))).toBe('pen')
  })
})
