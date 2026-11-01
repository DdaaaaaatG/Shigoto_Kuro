/**
 * 특수 키 그림 표시 중 팔·펜 손 숨김 TC — CR-071(R-22 개정, 🔒 2026-10-27).
 * 규칙: 키보드 레이어에 특수 키 전용 그림이 실제로 그려질 때(kbDown && 가장 최근 특수 키 && 그 슬롯 등록)만
 *   .canvas에 .specialShown 마커를 단다 — CSS가 .armWrap·.hand(팔 img·펜 손 img)를 visibility: hidden으로 가린다.
 *   미등록 폴백(kb_down / 펜 모드 kb_up)이면 마커 없음. 숨긴 동안에도 팔·펜 손 DOM·위치 계산은 그대로.
 * bridge 는 mock. 실제 Tauri API import 없음. 가짜 시계. CSS 규칙 자체는 overlayStyles.test.ts TC-355.
 * 시나리오: src/overlay/test/scenarios.md 변경 대기열 Q(CR-071) — TC-351 ~ TC-354
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  getAssetManifest,
  getHandAnchor,
  getMonitors,
  getSettings,
  setSettings,
  slotKey,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type MouseSettings,
  type ScreenBounds,
  type Settings,
} from 'bridge'
import { createInitialState, reduce, type MachineState, type SpecialKey } from 'state/inputMachine'
import {
  isSpecialShown,
  pickKeyboardEntry,
  pickPenKeyboardEntry,
  SPECIAL_KEY_SLOT,
} from '../components/LayerStack'
import OverlayApp from '../index'

// ─── bridge mock ─────────────────────────────────────────────────────────
const h = vi.hoisted(() => {
  const handlers: Record<string, ((p: unknown) => void) | undefined> = {}
  const subImpl = (name: string) => (cb: (p: unknown) => void) => {
    handlers[name] = cb
    return Promise.resolve(vi.fn())
  }
  return { handlers, subImpl }
})

vi.mock('bridge/commands', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  getAssetManifest: vi.fn(),
  getMonitors: vi.fn(),
  getHandAnchor: vi.fn(),
  getScreenBounds: vi.fn(),
  getTimer: () => Promise.resolve({ status: 'stopped', elapsedMs: 0 }),
  setResting: () => Promise.resolve({ status: 'stopped', elapsedMs: 0 }),
  getAlarmSound: () => Promise.resolve(null),
}))
vi.mock('bridge/events', () => ({
  onTimerChanged: () => Promise.resolve(() => undefined),
  EVENTS: {
    keyboard: 'input://keyboard',
    mouseMove: 'input://mouse-move',
    mouseButton: 'input://mouse-button',
    settingsChanged: 'settings://changed',
    assetsChanged: 'assets://changed',
    handAnchorChanged: 'assets://hand-anchor-changed',
  },
  onKeyboard: vi.fn(h.subImpl('keyboard')),
  onMouseMove: vi.fn(h.subImpl('mouseMove')),
  onMouseButton: vi.fn(h.subImpl('mouseButton')),
  onSettingsChanged: vi.fn(h.subImpl('settingsChanged')),
  onAssetsChanged: vi.fn(h.subImpl('assetsChanged')),
  onHandAnchorChanged: vi.fn(h.subImpl('handAnchor')),
}))
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
    restOnly: 'restOnly',
    restLayer: 'restLayer',
    specialShown: 'specialShown',
  },
}))

// ─── 픽스처 ───────────────────────────────────────────────────────────────
const T0 = 1_700_000_000_000
const entry = (slot: AssetSlot, width = 900, height = 700): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url: `u:${slotKey(slot)}`,
})
const kbDown = (index: number) => entry({ kind: 'kb_down', index })
const SLOTS = [
  'background',
  'body',
  'idle',
  'rest',
  'kb_up',
  'mouse_base',
  'mouse_left',
  'mouse_right',
]
/** key_space·key_enter 등록, key_z 등 나머지 특수 키 슬롯 미등록 */
const MANIFEST: AssetManifest = {
  canvas: { width: 900, height: 700 },
  entries: [
    ...[...SLOTS, 'key_space', 'key_enter'].map(s => entry(s as AssetSlot)),
    kbDown(0),
    kbDown(1),
  ],
}
const PEN_MANIFEST: AssetManifest = {
  ...MANIFEST,
  entries: [
    ...MANIFEST.entries,
    entry('pen_up' as AssetSlot, 200, 150),
    entry({ kind: 'pen_down', index: 0 } as AssetSlot, 200, 150),
  ],
}
const MOUSE: MouseSettings = {
  shoulder: { x: 620, y: 530 },
  area: [
    { x: 420, y: 430 },
    { x: 620, y: 430 },
    { x: 620, y: 630 },
    { x: 420, y: 630 },
  ],
  hand: null,
  partPos: { x: 0, y: 0 },
  penPos: null,
  penMode: false,
}
const SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  keyHoldMs: 0, // key-hold(R-42): 기존 TC는 유지 0 = 현행 동작 기준
  scale: 1,
  idleSeconds: 300,
  overlay: { x: 100, y: 100, visible: true },
  mouse: MOUSE,
  autostart: false,
}
const PEN_SETTINGS: Settings = { ...SETTINGS, mouse: { ...MOUSE, penMode: true } }
const MONITORS: ScreenBounds[] = [{ x: 0, y: 0, width: 1920, height: 1080 }]

// ─── 헬퍼 ────────────────────────────────────────────────────────────────
const flush = () =>
  act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  })
const mount = async () => {
  const r = render(<OverlayApp />)
  await flush()
  return r
}
const emit = async (name: string, payload: unknown) => {
  await act(async () => {
    h.handlers[name]?.(payload)
  })
}
const key = (pressed: boolean, heldCount: number, special: SpecialKey | null = null) =>
  emit('keyboard', { pressed, heldCount, special, ts: Date.now() })
const move = (x: number, y: number) => emit('mouseMove', { x, y, ts: Date.now() })
const q = {
  canvas: (c: HTMLElement) => c.querySelector('.canvas') as HTMLElement,
  jelly: (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement,
  /** 키보드 레이어 img = .jellyWrap 안 세 번째 img.layer(몸통·상태·키보드 순) */
  kb: (c: HTMLElement) => q.jelly(c).querySelectorAll('img.layer')[2] as HTMLImageElement,
  armWrap: (c: HTMLElement) => c.querySelector('.armWrap') as HTMLElement | null,
  armImg: (c: HTMLElement) => c.querySelector('.armWrap > img.hand') as HTMLImageElement | null,
  /** 펜 손 = .jellyWrap 직계 img.hand(래퍼 없음) */
  pen: (c: HTMLElement) => c.querySelector('.jellyWrap > img.hand') as HTMLImageElement | null,
}

/** 순수 함수용 상태 — reduce로 키 누름 1건을 흘려 만든다 */
const pressedState = (special: SpecialKey | null): MachineState =>
  reduce(
    createInitialState(T0),
    { type: 'key', pressed: true, heldCount: 1, special, repeat: false, ts: T0 },
    { idleMs: 300_000, kbFrames: 2 },
  )

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
  })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(MANIFEST)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue({ x: 520, y: 530 })
  vi.mocked(setSettings).mockImplementation(async s => s)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('isSpecialShown 순수 판정 (CR-071, design.md §10.6)', () => {
  it('TC-351: 들림·특수 키 없음·미등록 폴백이면 false, 등록된 특수 키 누름이면 true — pickKeyboardEntry·pickPenKeyboardEntry가 특수 키 슬롯을 고르는 때와 정확히 같다', () => {
    expect(isSpecialShown(MANIFEST, createInitialState(T0))).toBe(false)
    expect(isSpecialShown(MANIFEST, pressedState(null))).toBe(false)
    expect(isSpecialShown(MANIFEST, pressedState('space'))).toBe(true)
    expect(isSpecialShown(MANIFEST, pressedState('enter'))).toBe(true)
    expect(isSpecialShown(MANIFEST, pressedState('z'))).toBe(false)

    const specials: (SpecialKey | null)[] = [
      null,
      'space',
      'z',
      'question',
      'exclamation',
      'enter',
      'backspace',
      'undo',
    ]
    for (const sp of specials) {
      const m = pressedState(sp)
      const url = sp === null ? null : `u:${slotKey(SPECIAL_KEY_SLOT[sp])}`
      const picksSpecial = (e?: AssetEntry) => e !== undefined && e.url === url
      expect(isSpecialShown(MANIFEST, m), String(sp)).toBe(
        picksSpecial(pickKeyboardEntry(MANIFEST, m)),
      )
      expect(isSpecialShown(MANIFEST, m), String(sp)).toBe(
        picksSpecial(pickPenKeyboardEntry(MANIFEST, m)),
      )
    }
  })
})

describe('OverlayApp 특수 키 그림 중 팔·펜 손 숨김 마커 (CR-071)', () => {
  it('TC-352: key_space 등록 + 스페이스 누름 → .canvas "canvas specialShown"(팔 DOM 유지), 뗌 → "canvas" 즉시 복귀·같은 팔 노드', async () => {
    const { container } = await mount()
    const arm = q.armWrap(container)
    expect(arm).not.toBeNull()
    expect(q.canvas(container).className).toBe('canvas')

    await key(true, 1, 'space')
    expect(q.kb(container).getAttribute('src')).toBe('u:key_space')
    expect(q.canvas(container).className).toBe('canvas specialShown')
    expect(q.armWrap(container)).toBe(arm)
    expect(q.armImg(container)?.className).toBe('hand')
    // 젤리 래퍼 클래스는 마커와 무관(기존 TC-144·157 규칙 유지)
    expect(q.jelly(container).className).toBe('jellyWrap jellyAlt')

    await key(false, 0, 'space')
    expect(q.kb(container).getAttribute('src')).toBe('u:kb_up')
    expect(q.canvas(container).className).toBe('canvas')
    expect(q.armWrap(container)).toBe(arm)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-353: key_z 미등록 + Z 누름 → kb_down 폴백, 마커 없음("canvas"), 일반 키 누름도 마커 없음', async () => {
    const { container } = await mount()
    await key(true, 1, 'z')
    expect(q.kb(container).getAttribute('src')).toMatch(/^u:kb_down_/)
    expect(q.canvas(container).className).toBe('canvas')
    await key(false, 0, 'z')
    await key(true, 1, null)
    expect(q.canvas(container).className).toBe('canvas')
    await key(false, 0, null)
    expect(q.canvas(container).className).toBe('canvas')
  })

  it('TC-354: 펜 모드(pen_up 등록 + penMode true)에서 엔터 누름 → 마커 부착·펜 손 img.hand가 .specialShown 아래, 숨긴 중 마우스 이동도 팔·펜 위치 계산 계속, 뗌 → 해제', async () => {
    vi.mocked(getSettings).mockResolvedValue(PEN_SETTINGS)
    vi.mocked(getAssetManifest).mockResolvedValue(PEN_MANIFEST)
    const { container } = await mount()
    const pen = q.pen(container) as HTMLImageElement
    expect(pen).not.toBeNull()
    expect(pen.getAttribute('src')).toBe('u:pen_up')
    expect(q.canvas(container).className).toBe('canvas')

    await key(true, 1, 'enter')
    expect(q.kb(container).getAttribute('src')).toBe('u:key_enter')
    expect(q.canvas(container).className).toBe('canvas specialShown')
    expect(q.pen(container)).toBe(pen)
    expect(pen.className).toBe('hand')
    expect(pen.closest('.specialShown')).toBe(q.canvas(container))
    expect(q.armImg(container)?.closest('.specialShown')).toBe(q.canvas(container))

    // 숨긴 동안에도 커서 추종 계산은 돈다 — 다시 보일 때 커서 위치에 있어야 한다(규칙 4)
    const armBefore = q.armImg(container)?.style.transform
    const penBefore = pen.style.transform
    await move(1900, 1070)
    expect(q.armImg(container)?.style.transform).not.toBe(armBefore)
    expect(pen.style.transform).not.toBe(penBefore)
    const armMoved = q.armImg(container)?.style.transform

    await key(false, 0, 'enter')
    expect(q.canvas(container).className).toBe('canvas')
    expect(q.armImg(container)?.style.transform).toBe(armMoved)
    expect(pen.getAttribute('src')).toBe('u:pen_up')
  })
})
