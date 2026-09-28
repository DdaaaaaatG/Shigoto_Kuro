/**
 * 펜 쥔 손 — 펜 모드 클릭 누름 TC — CR-027(R-26 펜 모드에서 마우스 클릭 = 키 누름) → CR-042(R-31 펜 손 단순화) 개정.
 * 근거: design/functions.md §5.5 CR-042 `pickPenEntry`(누름(`isPressing`) 중 pen_down_0 ?? pen_up, 아니면 pen_up —
 *   kbFrame·specialHeld 안 읽음)·`PenHand` Props(`machine`만 읽음, `mouse.button` 안 읽음), §5.2 `onMouseButton`,
 *   design/components.md §3 `PenHand` 행, design.md §10.8 규칙표 1·2·3·4·5·9·10·§10.12 손 그림.
 * v1.6(CR-042): 펜 모드 config kbFrames = 1, 손 누름 그림 = pen_down_0 한 장. 픽스처의 pen_down_1·pen_key_space는
 *   옛 파일(남아 있어도 읽지 않음)로 둔다.
 * bridge mock(vi.mock) — 실제 Tauri API import 없음. 입력 순서를 파일·스냅샷·로그로 남기지 않는다(R-22).
 * 시나리오: src/overlay/test/scenarios.md TC-212, TC-213
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
import {
  createInitialState,
  reduce,
  type MachineConfig,
  type MachineInput,
  type MachineState,
  type SpecialKey,
} from 'state/inputMachine'
import PenHand, { pickPenEntry } from '../components/PenHand'

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
const penSlot = (k: string) => k as unknown as AssetSlot
const entry = (slot: AssetSlot, width = 900, height = 700): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url: `u:${slotKey(slot)}`,
})
const pen = (k: string) => entry(penSlot(k), 202, 154)
const manifest = (...extra: AssetEntry[]): AssetManifest => ({
  canvas: { width: 900, height: 700 },
  entries: [
    ...['body', 'idle', 'kb_up', 'key_space', 'mouse_base', 'mouse_left', 'mouse_right'].map(s => entry(s as AssetSlot)),
    ...extra,
  ],
})
/** pen_up·pen_down_0 + 옛 파일 pen_down_1·pen_key_space(CR-042 이후 읽지 않음) */
const PEN = manifest(pen('pen_up'), pen('pen_down_0'), pen('pen_down_1'), pen('pen_key_space'))
const PEN_UP_ONLY = manifest(pen('pen_up'))
const NO_PEN_UP = manifest(pen('pen_down_0'), pen('pen_down_1'), pen('pen_key_space'))
/** 펜 모드 = clickPress true, kbFrames 1(v1.6 CR-042 — design.md §10.12 config) */
const CFG: MachineConfig = { idleMs: 300_000, kbFrames: 1, clickPress: true }
const PLAIN: MachineConfig = { idleMs: 300_000, kbFrames: 1 }

const key = (pressed: boolean, heldCount: number, special: SpecialKey | null, ts: number): MachineInput => ({
  type: 'key',
  pressed,
  heldCount,
  special,
  ts,
})
const btn = (button: 'left' | 'right', pressed: boolean, ts: number): MachineInput => ({
  type: 'mouseButton',
  button,
  pressed,
  ts,
})
const st = (over: Partial<MachineState> = {}): MachineState => ({ ...createInitialState(T0), ...over })
const url = (m: MachineState, man: AssetManifest = PEN) => pickPenEntry(man, m)?.url

const MOUSE = {
  shoulder: { x: 620, y: 530 },
  area: [
    { x: 420, y: 430 },
    { x: 620, y: 430 },
    { x: 620, y: 630 },
    { x: 420, y: 630 },
  ],
  hand: null,
  partPos: { x: 389, y: 492 },
  penPos: { x: 389, y: 492 },
  penMode: true, // v1.4(CR-033): 토글 켜짐 전제
} as MouseSettings
const MON: ScreenBounds = { x: 0, y: 0, width: 1920, height: 1080 }
const ANCHOR: Point = { x: 520, y: 530 }
type PenProps = ComponentProps<typeof PenHand>
const PROPS: PenProps = {
  manifest: PEN,
  machine: st(),
  mouse: MOUSE,
  monitors: [MON],
  cursor: { x: 960, y: 0 },
  anchor: ANCHOR,
  atRest: false,
  penMode: true, // v1.4(CR-033): 토글 켜짐 전제(꺼짐 = penToggle.test.tsx TC-231)
}
const box = (i: HTMLImageElement) => [i.style.left, i.style.top, i.style.width, i.style.height, i.style.transformOrigin]

afterEach(() => cleanup())

describe('pickPenEntry ② isPressing — 클릭 예 (design/functions.md §5.5 CR-042 pickPenEntry, design.md §10.8·§10.12)', () => {
  it('TC-212: 펜 모드 클릭만 눌려도 누름 그림 pen_down_0, 뗌 → pen_up, 스페이스 누름 중에도 pen_down_0(pen_key_space 무시), 키를 뗀 뒤 버튼 유지 = 누름 그림 유지 (v1.6 개정, CR-042)', () => {
    const inputs: MachineInput[] = [
      btn('left', true, T0 + 1), // 규칙 1
      btn('left', false, T0 + 2), // 규칙 2
      btn('right', true, T0 + 3), // 규칙 3
      btn('right', false, T0 + 4),
      key(true, 1, 'space', T0 + 5),
      btn('left', true, T0 + 6), // 규칙 9
      key(false, 0, 'space', T0 + 7), // 규칙 10
      btn('left', false, T0 + 8),
      key(true, 1, null, T0 + 9),
      btn('left', true, T0 + 10), // 규칙 4
      key(false, 0, null, T0 + 11), // 규칙 5
      btn('left', false, T0 + 12), // 규칙 6
    ]
    const states = inputs.reduce<MachineState[]>((acc, i) => [...acc, reduce(acc[acc.length - 1], i, CFG)], [st()])
    expect(states.map(s => url(s))).toEqual([
      'u:pen_up',
      'u:pen_down_0',
      'u:pen_up',
      'u:pen_down_0',
      'u:pen_up',
      'u:pen_down_0',
      'u:pen_down_0',
      'u:pen_down_0',
      'u:pen_up',
      'u:pen_down_0',
      'u:pen_down_0',
      'u:pen_down_0',
      'u:pen_up',
    ])
    expect(states.map(s => s.kbFrame)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

    // 직접 구성한 상태 — 키 없음·버튼만
    expect(url(st({ clickHeld: ['right'], kbFrame: 0 }))).toBe('u:pen_down_0')
    expect(url(st({ clickHeld: ['left', 'right'], kbFrame: 1 }))).toBe('u:pen_down_0') // kbFrame 무관
    expect(url(st({ kbDown: true, heldCount: 1, specialHeld: ['space'], clickHeld: ['left'] }))).toBe('u:pen_down_0')
    expect(url(st({ clickHeld: ['left'], kbFrame: 1 }), PEN_UP_ONLY)).toBe('u:pen_up') // pen_down_0 없음
    expect(url(st({ clickHeld: ['left'], kbFrame: 1 }), NO_PEN_UP)).toBeUndefined() // 펜 모드 아님
    // mouse.button은 읽지 않는다
    expect(url(st({ mouse: { x: 0, y: 0, button: 'left' }, clickHeld: [] }))).toBe('u:pen_up')
    expect(url(st({ mouse: { x: 0, y: 0, button: 'none' }, clickHeld: ['left'], kbFrame: 0 }))).toBe('u:pen_down_0')
    // clickPress 없는 설정으로 만든 상태는 클릭해도 누름 아님
    expect(url(reduce(st(), btn('left', true, T0 + 1), PLAIN))).toBe('u:pen_up')
  })
})

describe('PenHand 렌더 — clickHeld만으로 누름 그림 (design/functions.md §5.5 PenHand 렌더·Props, design/components.md §3 PenHand 행)', () => {
  it('TC-213: 같은 img의 src만 바뀌고(pen_down_0 한 장) 위치·크기·원점·변형 불변, mouse.button과 무관, 애니메이션 클래스 없음 (v1.6 개정, CR-042)', () => {
    const { container, rerender } = render(<PenHand {...PROPS} />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(container.children).toHaveLength(1)
    expect(img.getAttribute('src')).toBe('u:pen_up')
    const t = img.style.transform
    const b = box(img)
    const cases: Array<[Partial<MachineState>, string]> = [
      [{ clickHeld: ['left'], kbFrame: 1 }, 'u:pen_down_0'],
      [{ clickHeld: ['left', 'right'], kbFrame: 0 }, 'u:pen_down_0'],
      [{ clickHeld: [], kbFrame: 0, mouse: { x: 960, y: 0, button: 'left' } }, 'u:pen_up'],
      [{ clickHeld: ['right'], kbFrame: 1, mouse: { x: 960, y: 0, button: 'none' } }, 'u:pen_down_0'],
      [{}, 'u:pen_up'],
    ]
    for (const [over, src] of cases) {
      rerender(<PenHand {...PROPS} machine={st(over)} />)
      expect(container.querySelector('img')).toBe(img)
      expect(img.getAttribute('src')).toBe(src)
      expect(img.className).toBe('hand')
      expect(img.style.transform).toBe(t)
      expect(box(img)).toEqual(b)
      expect(container.querySelectorAll('.jelly, .jellyAlt, .shiver')).toHaveLength(0)
    }
    expect(b).toEqual(['389px', '492px', '202px', '154px', '101px 77px'])
  })
})
