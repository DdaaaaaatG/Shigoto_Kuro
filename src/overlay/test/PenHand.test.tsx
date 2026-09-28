/**
 * 펜 쥔 손 컴포넌트 TC — CR-025(R-25 펜 쥔 손 파츠).
 * 근거: design/functions.md §5.5 PenHand 렌더 ①~⑥(예: 쉬는 자세 penPos (334,498)·pen_up 202×154 →
 *   left 334·top 498·202×154·transformOrigin '101px 77px'·transform 'translate(0px, 0px) rotate(0deg)'),
 *   PenHand Props(button 없음), §5.4 「(CR-025) 1~5단계 → armTransformFor, 결과·동작 변경 없음」,
 *   design/components.md §3 PenHand 행(래퍼 없음·애니메이션 클래스 없음), design.md §10.7.
 * 펜 슬롯 TS 표현·MouseSettings.penPos는 미확정 계약(bridge 인계) — 픽스처는 캐스팅.
 * bridge mock(vi.mock) — 실제 Tauri API import 없음.
 * 시나리오: src/overlay/test/scenarios.md TC-185, TC-192 ~ TC-195
 */
import { cleanup, render } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  slotKey,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type MouseSettings,
  type Point,
  type ScreenBounds,
} from 'bridge/types'
import { createInitialState, type MachineState } from 'state/inputMachine'
import {
  armTransformCss,
  armTransformFor,
  penTransform,
  penTransformCss,
  type Quad,
} from 'state/mouseMapping'
import MouseArm from '../components/MouseArm'
import PenHand from '../components/PenHand'

vi.mock('bridge/events', () => ({}))
vi.mock('bridge/commands', () => ({}))
vi.mock('../overlay.module.css', () => ({
  default: {
    root: 'root',
    canvas: 'canvas',
    layer: 'layer',
    hand: 'hand',
    armWrap: 'armWrap',
    jellyWrap: 'jellyWrap',
    jelly: 'jelly',
    jellyAlt: 'jellyAlt',
    shiver: 'shiver',
  },
}))

// ─── 픽스처 ───────────────────────────────────────────────────────────────
const T0 = 1_000_000
const penSlot = (key: string) => key as unknown as AssetSlot
const entry = (slot: AssetSlot, width = 900, height = 700): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url: `u:${slotKey(slot)}`,
})
const pen = (key: string, w = 202, h = 154) => entry(penSlot(key), w, h)
const ARM_PARTS = ['mouse_base', 'mouse_left', 'mouse_right'].map(s => entry(s as AssetSlot, 202, 154))
const base = (...extra: AssetEntry[]): AssetManifest => ({
  canvas: { width: 900, height: 700 },
  entries: [...['body', 'idle', 'kb_up'].map(s => entry(s as AssetSlot)), ...extra],
})
/** pen_down_1만 크기가 다르다(180×150) — 붙는 점·회전 원점은 pen_up 크기로 정해지는지 본다 */
const PEN = base(
  ...ARM_PARTS,
  pen('pen_up'),
  pen('pen_down_0'),
  pen('pen_down_1', 180, 150),
  pen('pen_key_space'),
)
const PEN_NO_ARM = base(pen('pen_up'), pen('pen_down_0'), pen('pen_down_1', 180, 150), pen('pen_key_space'))
const SHOULDER: Point = { x: 620, y: 530 }
const AREA: Quad = [
  { x: 420, y: 430 },
  { x: 620, y: 430 },
  { x: 620, y: 630 },
  { x: 420, y: 630 },
]
const DEF_AREA: Quad = [
  { x: 375, y: 525 },
  { x: 495, y: 525 },
  { x: 495, y: 625 },
  { x: 375, y: 625 },
]
type PenMouse = MouseSettings & { penPos: Point | null }
const mouse = (over: Partial<PenMouse> = {}): MouseSettings =>
  ({
    shoulder: SHOULDER,
    area: AREA,
    hand: null,
    partPos: { x: 389, y: 492 },
    penPos: { x: 389, y: 492 },
    ...over,
  }) as MouseSettings
const MON: ScreenBounds = { x: 0, y: 0, width: 1920, height: 1080 }
const MON_A: ScreenBounds = { x: 0, y: 0, width: 2560, height: 1440 }
const MON_B: ScreenBounds = { x: 320, y: 1440, width: 1920, height: 1080 }
const ANCHOR: Point = { x: 520, y: 530 }
const st = (over: Partial<MachineState> = {}): MachineState => ({ ...createInitialState(T0), ...over })

const REST = 'rotate(0deg) scaleX(1) rotate(0deg)'
const DOWN = 'rotate(135deg) scaleX(1.414) rotate(-180deg)'
const UP = 'rotate(-135deg) scaleX(1.414) rotate(-180deg)'
const UP_ALT = 'rotate(-135deg) scaleX(1.414) rotate(90deg)'
const MAX = 'rotate(180deg) scaleX(1.6) rotate(-180deg)'
const PEN_REST_CSS = 'translate(0px, 0px) rotate(0deg)'

type PenProps = ComponentProps<typeof PenHand>
const PROPS: PenProps = {
  manifest: PEN,
  machine: st(),
  mouse: mouse(),
  monitors: [MON],
  cursor: { x: 0, y: 0 },
  anchor: ANCHOR,
  atRest: true,
  penMode: true, // v1.4(CR-033): 이 스펙은 토글 켜짐 전제(꺼짐 = penToggle.test.tsx TC-231)
}
const renderPen =(over: Partial<PenProps> = {}) => render(<PenHand {...PROPS} {...over} />)
const img = (c: HTMLElement) => c.querySelector('img') as HTMLImageElement
const box = (i: HTMLImageElement) => [i.style.left, i.style.top, i.style.width, i.style.height, i.style.transformOrigin]
/** 'translate(dx px, dy px) rotate(deg)' → [dx, dy, deg] */
const parsePen = (t: string) => {
  const m = /^translate\((-?[\d.]+)px, (-?[\d.]+)px\) rotate\((-?[\d.]+)deg\)$/.exec(t)
  expect(m).not.toBeNull()
  return (m as RegExpExecArray).slice(1).map(Number)
}
const near = (actual: number[], expected: number[]) =>
  actual.forEach((a, i) => expect(Math.abs(a - expected[i])).toBeLessThanOrEqual(0.05))

afterEach(() => cleanup())

describe('armTransformFor 추출 — MouseArm 결과 불변 (design/functions.md §5.4 (CR-025)·§5.5)', () => {
  it('TC-185: 같은 입력이면 MouseArm 손 그림 transform = armTransformCss(armTransformFor(…)) = scenarios.md §0.2 값', () => {
    const cases: Array<[string, Partial<ComponentProps<typeof MouseArm>>, string]> = [
      ['쉬는 위치', { atRest: true, cursor: { x: 960, y: 1080 } }, REST],
      ['DOWN', { cursor: { x: 960, y: 1080 } }, DOWN],
      ['UP_ALT(hand 폴백)', { anchor: null, mouse: mouse({ hand: { x: 620, y: 430 } }), cursor: { x: 960, y: 0 } }, UP_ALT],
      ['UP(영역 중심 폴백)', { anchor: null, cursor: { x: 960, y: 0 } }, UP],
      ['두 모니터 밖 → 가장 가까운 B', { monitors: [MON_A, MON_B], cursor: { x: 100, y: 1980 } }, MAX],
      ['모니터 없음', { monitors: [], cursor: { x: 960, y: 1080 } }, REST],
      ['기준점 = 어깨', { anchor: SHOULDER, cursor: { x: 960, y: 1080 } }, REST],
    ]
    for (const [, over, css] of cases) {
      const p = {
        manifest: PEN,
        mouse: mouse(),
        monitors: [MON],
        cursor: { x: 0, y: 0 },
        button: 'none' as const,
        anchor: ANCHOR as Point | null,
        atRest: false,
        ...over,
      }
      const { container, unmount } = render(<MouseArm {...p} />)
      const hand = container.querySelector('.armWrap img') as HTMLImageElement
      expect(hand.style.transform).toBe(css)
      const t = armTransformFor({ mouse: p.mouse, monitors: p.monitors, cursor: p.cursor, anchor: p.anchor, atRest: p.atRest })
      expect(armTransformCss(t)).toBe(css)
      unmount()
    }
  })
})

describe('PenHand 렌더 (design/functions.md §5.5 ①~⑥)', () => {
  it('TC-192: 쉬는 자세 설계 예 — img 1개(래퍼 없음), class hand, left 334·top 498·202×154·원점 101px 77px·회전 0', () => {
    const { container } = renderPen({ mouse: mouse({ area: DEF_AREA, penPos: null, hand: null }) })
    expect(container.children).toHaveLength(1)
    const i = img(container)
    expect(container.firstElementChild).toBe(i)
    expect(i.tagName).toBe('IMG')
    expect(i.className).toBe('hand')
    expect(i.getAttribute('src')).toBe('u:pen_up')
    expect(i.getAttribute('alt')).toBe('')
    expect(i.getAttribute('draggable')).toBe('false')
    expect(box(i)).toEqual(['334px', '498px', '202px', '154px', '101px 77px'])
    expect(i.style.transform).toBe(PEN_REST_CSS)
    // 지정 penPos
    const b = renderPen()
    expect(box(img(b.container))).toEqual(['389px', '492px', '202px', '154px', '101px 77px'])
    expect(img(b.container).style.transform).toBe(PEN_REST_CSS)
  })

  it('TC-193: 팔 끝 추종 — transform = penTransformCss(penTransform(어깨, armTransformFor(같은 입력), penPos, pen_up 크기)), 크기·자리 불변, 모니터 없음·atRest면 회전 0', () => {
    const expected = (cursor: Point) =>
      penTransformCss(
        penTransform(
          SHOULDER,
          armTransformFor({ mouse: mouse(), monitors: [MON], cursor, anchor: ANCHOR, atRest: false }),
          { x: 389, y: 492 },
          { width: 202, height: 154 },
        ),
      )
    const up = renderPen({ atRest: false, cursor: { x: 960, y: 0 } })
    const i = img(up.container)
    expect(i.style.transform).toBe(expected({ x: 960, y: 0 }))
    near(parsePen(i.style.transform), [-27.56, -141.4, 45])
    expect(box(i)).toEqual(['389px', '492px', '202px', '154px', '101px 77px'])
    expect(i.style.transform).not.toMatch(/scale/)

    const down = renderPen({ atRest: false, cursor: { x: 960, y: 1080 } })
    expect(img(down.container).style.transform).toBe(expected({ x: 960, y: 1080 }))
    near(parsePen(img(down.container).style.transform), [27.6, 118.56, -45])

    const noArm = renderPen({ manifest: PEN_NO_ARM, atRest: false, cursor: { x: 960, y: 0 } })
    expect(img(noArm.container).style.transform).toBe(expected({ x: 960, y: 0 }))

    const noMon = renderPen({ atRest: false, monitors: [], cursor: { x: 960, y: 0 } })
    expect(img(noMon.container).style.transform).toBe(PEN_REST_CSS)
    const rest = renderPen({ atRest: true, cursor: { x: 960, y: 0 } })
    expect(img(rest.container).style.transform).toBe(PEN_REST_CSS)
  })

  it('TC-194: 그림 교체는 같은 img의 src만 — 크기는 선택 그림(pen_down_0 180×150), left/top·원점·transform은 pen_up 기준 그대로 (v1.6 개정, CR-042 — 누름 그림 = pen_down_0 한 장)', () => {
    // pen_down_0만 180×150, 옛 파일 pen_down_1·pen_key_space(202×154)는 남아 있어도 쓰이지 않는다
    const small0 = base(...ARM_PARTS, pen('pen_up'), pen('pen_down_0', 180, 150), pen('pen_down_1'), pen('pen_key_space'))
    const r = renderPen({ manifest: small0, atRest: false, cursor: { x: 960, y: 0 } })
    const i = img(r.container)
    const t = i.style.transform
    const seq: Array<[MachineState, string, string, string]> = [
      [st({ kbDown: true, heldCount: 1, kbFrame: 1 }), 'u:pen_down_0', '180px', '150px'],
      [st({ kbDown: true, heldCount: 1, kbFrame: 0 }), 'u:pen_down_0', '180px', '150px'],
      [st({ kbDown: true, heldCount: 1, specialHeld: ['space'] }), 'u:pen_down_0', '180px', '150px'],
      [st({ clickHeld: ['left'], kbFrame: 1 }), 'u:pen_down_0', '180px', '150px'],
      [st(), 'u:pen_up', '202px', '154px'],
    ]
    for (const [machine, src, w, h] of seq) {
      r.rerender(<PenHand {...PROPS} manifest={small0} atRest={false} cursor={{ x: 960, y: 0 }} machine={machine} />)
      expect(img(r.container)).toBe(i)
      expect(i.getAttribute('src')).toBe(src)
      expect(box(i)).toEqual(['389px', '492px', w, h, '101px 77px'])
      expect(i.style.transform).toBe(t)
      expect(i.className).toBe('hand')
    }
  })

  it('TC-195: pen_up이 없으면 아무것도 그리지 않는다(pen_down_*·pen_key_*만 있어도, 누름 중에도)', () => {
    const partial = base(...ARM_PARTS, pen('pen_down_0'), pen('pen_key_space'))
    for (const machine of [st(), st({ kbDown: true, heldCount: 1, specialHeld: ['space'] })]) {
      const a = renderPen({ manifest: partial, machine })
      expect(a.container.innerHTML).toBe('')
      a.unmount()
    }
    const none = renderPen({ manifest: base(...ARM_PARTS), atRest: false, cursor: { x: 960, y: 0 } })
    expect(none.container.innerHTML).toBe('')
  })
})
