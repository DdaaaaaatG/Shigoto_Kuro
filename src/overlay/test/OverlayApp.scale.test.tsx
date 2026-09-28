/**
 * OverlayApp TC ③ — 배율·표시 크기·Ctrl+휠·위치 불간섭·조작 영역
 * (design.md §2·§6 P-5·P-6·P-7·§10.5, design/functions.md §5.1 clampScale·onWheel·표시 배율 계산, CR-012·CR-013).
 * 표시 크기 기대값은 doc/200_설계/core/window.md §2.2 계산 예시 표와 같다(window.md §9.2 UI-5).
 * bridge 는 mock. 시나리오: src/overlay/test/scenarios.md TC-069 ~ TC-077
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react'
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
  type Settings,
} from 'bridge'
import OverlayApp from '../index'

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
  // CR-045(scenarios v1.8): OverlayApp 마운트·쉬는중 전이 때 setResting, TimerText가 getTimer — 이 스펙은 관찰하지 않는다(초기화 영향 없는 일반 함수)
  getTimer: () => Promise.resolve({ status: 'stopped', elapsedMs: 0 }),
  setResting: () => Promise.resolve({ status: 'stopped', elapsedMs: 0 }),
  // CR-050(scenarios v1.9): TimerText → useAlarmOnFinish가 finished 진입 이벤트 때 부른다 — 이 스펙은 관찰하지 않는다(일반 함수)
  getAlarmSound: () => Promise.resolve(null),
}))
vi.mock('bridge/events', () => ({
  onTimerChanged: () => Promise.resolve(() => undefined),
  EVENTS: {},
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
    bounce: 'bounce',
    armWrap: 'armWrap',
  },
}))

const entry = (slot: AssetSlot, width: number, height: number): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url: `u:${slotKey(slot)}`,
})
const manifestOf = (width: number, height: number): AssetManifest => ({
  canvas: { width, height },
  entries: (['body', 'idle', 'kb_up'] as AssetSlot[]).map(s => entry(s, width, height)),
})
const SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  scale: 1,
  overlay: { x: 100, y: 100, visible: true },
  mouse: null,
}

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
const root = (c: HTMLElement) => c.querySelector('.root') as HTMLElement
const canvasEl = (c: HTMLElement) => c.querySelector('.canvas') as HTMLElement
const wheel = async (target: Element, deltaY: number, ctrlKey = true) => {
  fireEvent.wheel(target, { ctrlKey, deltaY })
  await flush()
}
const UP = -100
const DOWN = 100
const ERR = { code: 'IO', message: 'x' }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(manifestOf(900, 700))
  // CR-017: getScreenBounds → getMonitors(모니터 목록)
  vi.mocked(getMonitors).mockResolvedValue([{ x: 0, y: 0, width: 1920, height: 1080 }])
  vi.mocked(getHandAnchor).mockResolvedValue(null)
  vi.mocked(setSettings).mockImplementation(async s => s)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('표시 배율 (R-03, §10.5)', () => {
  it('TC-069: settings://changed의 scale 2가 바로 반영(900×700 → scale(1)), 저장 재호출 없음', async () => {
    const { container } = await mount()
    expect(canvasEl(container).style.transform).toBe('scale(0.5)')
    await emit('settingsChanged', { ...SETTINGS, scale: 2 })
    expect(canvasEl(container).style.transform).toBe('scale(1)')
    expect(setSettings).not.toHaveBeenCalled()
  })

  /** [캔버스 W, H, 배율, 표시 W, 표시 H] — window.md §2.2 계산 예시 표 인용 */
  const TABLE: Array<[number, number, number, number, number]> = [
    [900, 700, 0.25, 113, 88],
    [900, 700, 0.5, 225, 175],
    [900, 700, 1, 450, 350],
    [900, 700, 1.1, 495, 385],
    [900, 700, 2, 900, 700],
    [612, 354, 0.25, 113, 66],
    [612, 354, 0.5, 225, 131],
    [612, 354, 1, 450, 261],
    [612, 354, 1.1, 495, 287],
    [612, 354, 2, 900, 521],
    [350, 700, 0.25, 44, 88],
    [350, 700, 0.5, 88, 175],
    [350, 700, 1, 175, 350],
    [350, 700, 1.1, 193, 385],
    [350, 700, 2, 350, 700],
    [300, 200, 0.25, 113, 75],
    [300, 200, 0.5, 225, 150],
    [300, 200, 1, 450, 300],
    [300, 200, 1.1, 495, 330],
    [300, 200, 2, 900, 600],
  ]
  const ceilPx = (v: number) => Math.max(1, Math.ceil(v - 1e-6))

  it.each(TABLE)(
    'TC-070: 캔버스 %i×%i · 배율 %f → 표시 %i×%i (core window.md §2.2와 같은 값)',
    async (w, hgt, scale, expectW, expectH) => {
      vi.mocked(getAssetManifest).mockResolvedValue(manifestOf(w, hgt))
      vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS, scale })
      const { container } = await mount()
      const cv = canvasEl(container)
      expect(cv.style.width).toBe(`${w}px`)
      expect(cv.style.height).toBe(`${hgt}px`)
      expect(cv.style.left).toBe('')
      expect(cv.style.top).toBe('')
      const m = /^scale\((.+)\)$/.exec(cv.style.transform)
      expect(m).not.toBeNull()
      const s = Number((m as RegExpExecArray)[1])
      expect([ceilPx(w * s), ceilPx(hgt * s)]).toEqual([expectW, expectH])
      expect(setSettings).not.toHaveBeenCalled()
    },
  )
})

describe('Ctrl+휠 배율 (R-04, P-5)', () => {
  it('TC-071: Ctrl+휠 위 = +0.05 저장 요청(나머지 필드 그대로)·즉시 반영, 아래 = −0.05', async () => {
    const { container } = await mount()
    await wheel(root(container), UP)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(setSettings).toHaveBeenLastCalledWith({ ...SETTINGS, scale: 1.05 })
    expect(canvasEl(container).style.transform).toBe('scale(0.525)')
    await wheel(root(container), DOWN)
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(setSettings).toHaveBeenLastCalledWith({ ...SETTINGS, scale: 1 })
    expect(canvasEl(container).style.transform).toBe('scale(0.5)')
  })

  it('TC-072: 상한 2에서 위·하한 0.25에서 아래는 호출 없음', async () => {
    vi.mocked(getSettings).mockResolvedValueOnce({ ...SETTINGS, scale: 2 })
    const max = await mount()
    await wheel(root(max.container), UP)
    expect(setSettings).not.toHaveBeenCalled()
    expect(canvasEl(max.container).style.transform).toBe('scale(1)')
    max.unmount()
    vi.mocked(getSettings).mockResolvedValueOnce({ ...SETTINGS, scale: 0.25 })
    const min = await mount()
    await wheel(root(min.container), DOWN)
    expect(setSettings).not.toHaveBeenCalled()
    expect(canvasEl(min.container).style.transform).toBe('scale(0.125)')
  })

  it('TC-072: 경계 근처는 범위 안으로 고정(1.98↑ → 2, 0.3↓ → 0.25)', async () => {
    vi.mocked(getSettings).mockResolvedValueOnce({ ...SETTINGS, scale: 1.98 })
    const hi = await mount()
    await wheel(root(hi.container), UP)
    expect(setSettings).toHaveBeenLastCalledWith({ ...SETTINGS, scale: 2 })
    hi.unmount()
    vi.mocked(getSettings).mockResolvedValueOnce({ ...SETTINGS, scale: 0.3 })
    const lo = await mount()
    await wheel(root(lo.container), DOWN)
    expect(setSettings).toHaveBeenLastCalledWith({ ...SETTINGS, scale: 0.25 })
  })

  it('TC-072: 1에서 20칸 올리면 소수 2자리로 1.05…2, 21번째는 호출 없음(누적 오차 없음)', async () => {
    const { container } = await mount()
    for (let i = 0; i < 21; i++) await wheel(root(container), UP)
    const sent = vi.mocked(setSettings).mock.calls.map(c => c[0].scale)
    expect(sent).toEqual(Array.from({ length: 20 }, (_, i) => Number((1 + 0.05 * (i + 1)).toFixed(2))))
    expect(canvasEl(container).style.transform).toBe('scale(1)')
  })

  it('TC-073: Ctrl 없는 휠은 배율을 바꾸지 않고 저장도 요청하지 않는다', async () => {
    const { container } = await mount()
    await wheel(root(container), UP, false)
    await wheel(root(container), DOWN, false)
    expect(setSettings).not.toHaveBeenCalled()
    expect(canvasEl(container).style.transform).toBe('scale(0.5)')
  })

  it('TC-074: 저장 실패여도 로컬 배율은 유지·문구 없음, 다음 settings://changed가 덮는다', async () => {
    vi.mocked(setSettings).mockRejectedValue(ERR)
    const { container } = await mount()
    await wheel(root(container), UP)
    expect(setSettings).toHaveBeenCalledWith({ ...SETTINGS, scale: 1.05 })
    expect(canvasEl(container).style.transform).toBe('scale(0.525)')
    expect(container.textContent).toBe('')
    await emit('settingsChanged', SETTINGS)
    expect(canvasEl(container).style.transform).toBe('scale(0.5)')
  })

  it('TC-075: 저장 페이로드의 overlay.x/y는 ui가 손대지 않고 settings://changed 값으로 교정된다(CR-013)', async () => {
    const { container } = await mount()
    await wheel(root(container), UP)
    expect(vi.mocked(setSettings).mock.calls[0][0].overlay).toEqual({ x: 100, y: 100, visible: true })
    const moved = { ...SETTINGS, scale: 1.05, overlay: { x: 500, y: 300, visible: true } }
    await emit('settingsChanged', moved)
    await wheel(root(container), UP)
    expect(setSettings).toHaveBeenLastCalledWith({ ...moved, scale: 1.1 })
    for (const fn of [getSettings, getAssetManifest, getMonitors, getHandAnchor]) {
      expect(fn).toHaveBeenCalledTimes(1)
    }
  })
})

describe('위치·조작 영역 (R-12·R-13, P-7, CR-012)', () => {
  it('TC-076: 위치만 바뀐 settings://changed는 화면을 바꾸지 않고 어떤 command도 부르지 않는다', async () => {
    const { container } = await mount()
    const before = canvasEl(container).outerHTML
    await emit('settingsChanged', { ...SETTINGS, overlay: { x: 800, y: 40, visible: true } })
    expect(canvasEl(container).outerHTML).toBe(before)
    expect(setSettings).not.toHaveBeenCalled()
    for (const fn of [getSettings, getAssetManifest, getMonitors]) expect(fn).toHaveBeenCalledTimes(1)
  })

  it('TC-077: .root가 최상위·드래그 영역이고, 이미지 위 Ctrl+휠도 .root가 받아 처리한다(200% 포함)', async () => {
    const { container } = await mount()
    const r = root(container)
    expect(container.firstElementChild).toBe(r)
    expect(r.hasAttribute('data-tauri-drag-region')).toBe(true)
    await wheel(container.querySelector('img[src="u:kb_up"]') as Element, UP)
    expect(setSettings).toHaveBeenLastCalledWith({ ...SETTINGS, scale: 1.05 })
    cleanup()
    vi.mocked(setSettings).mockClear()
    vi.mocked(getSettings).mockResolvedValueOnce({ ...SETTINGS, scale: 2 })
    const big = await mount()
    await wheel(big.container.querySelector('img[src="u:body"]') as Element, DOWN)
    expect(setSettings).toHaveBeenLastCalledWith({ ...SETTINGS, scale: 1.95 })
  })
})
