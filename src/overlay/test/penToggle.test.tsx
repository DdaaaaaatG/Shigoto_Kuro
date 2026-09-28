/**
 * 펜 손 사용 토글 — 판정·키보드 레이어·펜 손 컴포넌트 TC — CR-033(R-29).
 * 근거: design/functions.md §5.3 CR-033 개정표(isPenMode(manifest, mouse) 예 4개·LayerStack 렌더 prop penMode —
 *   「isPenMode를 내부에서 부르지 않는다」), §5.5 PenHand 렌더 CR-033 개정(② entry = penMode ? pickPenEntry : up,
 *   ①·③~⑥ 그대로), design.md §10.10(판정·LayerStack·PenHand·꺼짐 동작 표·계약), design/components.md §3
 *   LayerStack·PenHand 행(CR-033), contract v0.15 §3.3 MouseSettings.penMode(기본 false, 필드 없는 옛 설정 = 꺼짐).
 * 펜 슬롯 TS 표현은 파일명 키 문자열 캐스팅(scenarios.md v1.1 공통 전제). bridge mock(vi.mock) — 실제 Tauri API import 없음.
 * 시나리오: src/overlay/test/scenarios.md TC-229 ~ TC-231
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
import { armTransformFor, penTransform, penTransformCss, type Quad } from 'state/mouseMapping'
import LayerStack, { isPenMode, pickKeyboardEntry, pickPenKeyboardEntry } from '../components/LayerStack'
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
const kbDown = (index: number) => entry({ kind: 'kb_down', index })
/** 몸통·대기·쉬는중·kb_up·key_space·kb_down 3장·팔 그림 3장(202×154) */
const manifest = (...extra: AssetEntry[]): AssetManifest => ({
  canvas: { width: 900, height: 700 },
  entries: [
    ...['body', 'idle', 'rest', 'kb_up', 'key_space'].map(s => entry(s as AssetSlot)),
    ...['mouse_base', 'mouse_left', 'mouse_right'].map(s => entry(s as AssetSlot, 202, 154)),
    kbDown(0),
    kbDown(1),
    kbDown(2),
    ...extra,
  ],
})
/** pen_down_1만 180×150 — 꺼짐이면 누름 중에도 pen_up(202×154) 크기 그대로인지 본다 */
const PEN = manifest(pen('pen_up'), pen('pen_down_0'), pen('pen_down_1', 180, 150), pen('pen_key_space'))
/** pen_up 없음(pen_down_0·pen_key_space만) */
const PARTIAL = manifest(pen('pen_down_0'), pen('pen_key_space'))
const EMPTY: AssetManifest = { canvas: null, entries: [] }

const AREA: Quad = [
  { x: 420, y: 430 },
  { x: 620, y: 430 },
  { x: 620, y: 630 },
  { x: 420, y: 630 },
]
const PEN_POS: Point = { x: 389, y: 492 }
const PEN_SIZE = { width: 202, height: 154 }
const mouse = (penMode: boolean): MouseSettings => ({
  shoulder: { x: 620, y: 530 },
  area: AREA,
  hand: null,
  partPos: { x: 389, y: 492 },
  penPos: PEN_POS,
  penMode,
})
/** 옛 settings.json(penMode 필드 없음) — 캐스팅 */
const LEGACY = {
  shoulder: { x: 620, y: 530 },
  area: AREA,
  hand: null,
  partPos: { x: 389, y: 492 },
  penPos: PEN_POS,
} as MouseSettings
const MOUSE_OFF = mouse(false)
const MON: ScreenBounds = { x: 0, y: 0, width: 1920, height: 1080 }
const ANCHOR: Point = { x: 520, y: 530 }
const PEN_REST_CSS = 'translate(0px, 0px) rotate(0deg)'
const BOX = ['389px', '492px', '202px', '154px', '101px 77px']

const st = (over: Partial<MachineState> = {}): MachineState => ({ ...createInitialState(T0), ...over })
const box = (i: HTMLImageElement) => [i.style.left, i.style.top, i.style.width, i.style.height, i.style.transformOrigin]
/** 팔과 같은 입력의 손 변형(펜 모드 여부와 무관 — §10.10 PenHand 「위치·팔 끝 추종·기울기는 §10.7 그대로」) */
const penCss = (cursor: Point, atRest = false) =>
  penTransformCss(
    penTransform(
      MOUSE_OFF.shoulder,
      armTransformFor({ mouse: MOUSE_OFF, monitors: [MON], cursor, anchor: ANCHOR, atRest }),
      PEN_POS,
      PEN_SIZE,
    ),
  )
const parsePen = (t: string) => {
  const m = /^translate\((-?[\d.]+)px, (-?[\d.]+)px\) rotate\((-?[\d.]+)deg\)$/.exec(t)
  expect(m).not.toBeNull()
  return (m as RegExpExecArray).slice(1).map(Number)
}
const near = (actual: number[], expected: number[]) =>
  actual.forEach((a, i) => expect(Math.abs(a - expected[i])).toBeLessThanOrEqual(0.05))

afterEach(() => cleanup())

describe('펜 모드 판정 (design/functions.md §5.3 isPenMode CR-033 개정, design.md §10.10 판정·계약)', () => {
  it('TC-229: isPenMode = pen_up 등록 && mouse.penMode === true — 설계 예 4개, 빈 매니페스트·pen_up만·필드 없는 옛 설정', () => {
    // 설계 예 4개(design/functions.md §5.3 CR-033)
    expect(isPenMode(PEN, mouse(true))).toBe(true)
    expect(isPenMode(PEN, mouse(false))).toBe(false)
    expect(isPenMode(PEN, null)).toBe(false)
    expect(isPenMode(PARTIAL, mouse(true))).toBe(false)
    // 보충
    expect(isPenMode(EMPTY, mouse(true))).toBe(false)
    expect(isPenMode(manifest(pen('pen_up')), mouse(true))).toBe(true)
    expect('penMode' in LEGACY).toBe(false)
    expect(isPenMode(PEN, LEGACY)).toBe(false)
  })
})

describe('LayerStack prop penMode (design/functions.md §5.3 LayerStack 렌더 CR-033 개정, design.md §10.10)', () => {
  const srcs = (c: HTMLElement) => Array.from(c.querySelectorAll('img')).map(i => i.getAttribute('src'))
  const kbOf = (c: HTMLElement) => {
    const imgs = c.querySelectorAll('img')
    return imgs[imgs.length - 1] as HTMLImageElement
  }
  const states: Array<[MachineState, string]> = [
    [st(), 'u:kb_up'],
    [st({ kbDown: true, heldCount: 1, kbFrame: 1 }), 'u:kb_down_1'],
    [st({ kbDown: true, heldCount: 1, kbFrame: 2 }), 'u:kb_down_2'],
    [st({ kbDown: true, heldCount: 1, specialHeld: ['space'] }), 'u:key_space'],
    [st({ layer: 'rest' }), 'u:kb_up'],
  ]

  it('TC-230: 키보드 Layer = penMode ? pickPenKeyboardEntry : pickKeyboardEntry — 꺼짐이면 pen_up이 있어도 kb_down·특수 키 그림, prop만으로 정함, 같은 img 유지 (v1.6 개정, CR-042)', () => {
    // ① PEN + penMode false → pickKeyboardEntry
    for (const [s, src] of states) {
      const r = render(<LayerStack manifest={PEN} machine={s} penMode={false} />)
      const kb = kbOf(r.container)
      expect(srcs(r.container)).toEqual(['u:body', s.layer === 'rest' ? 'u:rest' : 'u:idle', src])
      expect(kb.getAttribute('src')).toBe(pickKeyboardEntry(PEN, s)?.url)
      expect(kb.className).toBe('layer')
      r.unmount()
    }
    // ② PARTIAL + penMode true → pickPenKeyboardEntry(내부에서 isPenMode를 부르지 않는다 — prop이 정한다)
    //   v1.6(CR-042): 일반 누름·쉬는중 kb_up, 스페이스 누름 중 key_space(PARTIAL에 key_space 있음), kb_down 안 씀
    const penKb = ['u:kb_up', 'u:kb_up', 'u:kb_up', 'u:key_space', 'u:kb_up']
    states.forEach(([s], i) => {
      const r = render(<LayerStack manifest={PARTIAL} machine={s} penMode />)
      expect(kbOf(r.container).getAttribute('src')).toBe(penKb[i])
      expect(kbOf(r.container).getAttribute('src')).toBe(pickPenKeyboardEntry(PARTIAL, s)?.url)
      r.unmount()
    })
    // ③ 같은 상태에서 prop만 바꿔 rerender → 같은 키보드 img 노드의 src만 바뀜
    const pressed = st({ kbDown: true, heldCount: 1, kbFrame: 1 })
    const r = render(<LayerStack manifest={PEN} machine={pressed} penMode />)
    const kb = kbOf(r.container)
    expect(kb.getAttribute('src')).toBe('u:kb_up')
    r.rerender(<LayerStack manifest={PEN} machine={pressed} penMode={false} />)
    expect(kbOf(r.container)).toBe(kb)
    expect(kb.getAttribute('src')).toBe('u:kb_down_1')
    r.rerender(<LayerStack manifest={PEN} machine={pressed} penMode />)
    expect(kbOf(r.container)).toBe(kb)
    expect(kb.getAttribute('src')).toBe('u:kb_up')
    expect(srcs(r.container).some(x => (x ?? '').startsWith('u:pen'))).toBe(false)
  })
})

describe('PenHand prop penMode (design/functions.md §5.5 PenHand 렌더 CR-033 개정, design.md §10.10 꺼짐 동작 표)', () => {
  type PenProps = ComponentProps<typeof PenHand>
  const PROPS: PenProps = {
    manifest: PEN,
    machine: st(),
    mouse: MOUSE_OFF,
    monitors: [MON],
    cursor: { x: 960, y: 0 },
    anchor: ANCHOR,
    atRest: false,
    penMode: false,
  }

  it('TC-231: 꺼짐 = 누름·특수 키·클릭·반복 중에도 pen_up(202×154), 팔 끝 추종·기울기는 켜짐과 같은 변형, 켜면 같은 img가 누름 그림, pen_up 없으면 null', () => {
    const { container, rerender } = render(<PenHand {...PROPS} />)
    const p = container.querySelector('img') as HTMLImageElement
    const t = penCss({ x: 960, y: 0 })
    near(parsePen(t), [-27.56, -141.4, 45])
    const machines = [
      st(),
      st({ kbDown: true, heldCount: 1, kbFrame: 1 }),
      st({ kbDown: true, heldCount: 1, kbFrame: 0 }),
      st({ kbDown: true, heldCount: 1, specialHeld: ['space'] }),
      st({ clickHeld: ['left'], kbFrame: 1 }),
      st({ kbDown: true, heldCount: 1, kbFrame: 1, repeating: true }),
    ]
    for (const machine of machines) {
      rerender(<PenHand {...PROPS} machine={machine} />)
      expect(container.children).toHaveLength(1)
      expect(container.querySelector('img')).toBe(p)
      expect(p.getAttribute('src')).toBe('u:pen_up')
      expect(p.className).toBe('hand')
      expect(box(p)).toEqual(BOX)
      expect(p.style.transform).toBe(t)
    }
    // 꺼짐이어도 팔 끝 추종(이동·기울기, 크기 불변)·쉬는 자세
    rerender(<PenHand {...PROPS} cursor={{ x: 960, y: 1080 }} />)
    expect(p.style.transform).toBe(penCss({ x: 960, y: 1080 }))
    near(parsePen(p.style.transform), [27.6, 118.56, -45])
    expect(p.style.transform).not.toMatch(/scale/)
    expect(box(p)).toEqual(BOX)
    rerender(<PenHand {...PROPS} atRest />)
    expect(p.style.transform).toBe(PEN_REST_CSS)
    expect(p.getAttribute('src')).toBe('u:pen_up')
    // 같은 입력에서 켜면 같은 img가 누름 그림 — 변형 문자열은 꺼짐일 때와 같음
    const pressed = st({ kbDown: true, heldCount: 1, kbFrame: 1 })
    rerender(<PenHand {...PROPS} machine={pressed} />)
    expect(p.getAttribute('src')).toBe('u:pen_up')
    rerender(<PenHand {...PROPS} machine={pressed} penMode />)
    expect(container.querySelector('img')).toBe(p)
    expect(p.getAttribute('src')).toBe('u:pen_down_0') // v1.6(CR-042): 누름 그림 = pen_down_0 한 장(kbFrame 무관)
    expect(box(p)).toEqual(BOX)
    expect(p.style.transform).toBe(t)
    rerender(<PenHand {...PROPS} machine={pressed} penMode={false} />)
    expect(p.getAttribute('src')).toBe('u:pen_up')
    expect(box(p)).toEqual(BOX)
    // pen_up 없음 → null(토글 값과 무관)
    for (const pm of [false, true]) {
      rerender(<PenHand {...PROPS} manifest={PARTIAL} machine={pressed} penMode={pm} />)
      expect(container.innerHTML).toBe('')
    }
  })
})
