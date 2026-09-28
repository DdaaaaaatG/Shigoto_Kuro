/**
 * OverlayApp 회귀 — CR-029(R-27 대기·쉬는중 그림 선택, R-28 위치 잠금 중 동작). design.md §10.9.
 * 오버레이 소스 변경 없음 — 이 스펙은 처음부터 Green이 정상이다(현행 LayerStack·OverlayApp이 이미 충족).
 * bridge 는 mock(vi.mock 'bridge/commands'·'bridge/events'). 실제 Tauri API import 없음.
 * 시간은 가짜 시계(vi.useFakeTimers + setSystemTime). 실제 sleep 없음.
 * 로케이터: 오버레이는 접근성 이름이 없다(design.md §8·§9) → DOM 구조(.jellyWrap 직계 img) + img src(매니페스트 url).
 * 위치 잠금의 실제 효과(클릭 통과·끌기·휠 무반응)는 core 창 속성이라 수동 MC-22(TC-228).
 * 시나리오: src/overlay/test/scenarios.md TC-223 ~ TC-227
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  getAssetManifest,
  getHandAnchor,
  getMonitors,
  getSettings,
  onAssetsChanged,
  onKeyboard,
  onMouseButton,
  onMouseMove,
  onSettingsChanged,
  setSettings,
  slotKey,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type MouseSettings,
  type Point,
  type ScreenBounds,
  type Settings,
} from 'bridge'
import OverlayApp from '../index'

// ─── bridge mock: 구독 핸들러를 잡아 두고 테스트가 이벤트를 흘려 넣는다 ─────────────
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
  // CR-045(scenarios v1.8): OverlayApp 마운트·쉬는중 전이 때 setResting, TimerText가 getTimer — 이 스펙은 관찰하지 않는다(초기화 영향 없는 일반 함수)
  getTimer: () => Promise.resolve({ status: 'stopped', elapsedMs: 0 }),
  setResting: () => Promise.resolve({ status: 'stopped', elapsedMs: 0 }),
  // CR-050(scenarios v1.9): TimerText → useAlarmOnFinish가 finished 진입 이벤트 때 부른다 — 이 스펙은 관찰하지 않는다(일반 함수)
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
    bounce: 'bounce',
    bounceAlt: 'bounceAlt',
  },
}))

// ─── 픽스처 ───────────────────────────────────────────────────────────────
const T0 = 1_700_000_000_000
const CANVAS = { width: 900, height: 700 }
const penSlot = (key: string) => key as unknown as AssetSlot
const entry = (slot: AssetSlot, width = 900, height = 700): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url: `u:${slotKey(slot)}`,
})
const named = (s: string) => entry(s as AssetSlot)
/** R-27 필수 3장만: kb_up · kb_down_0 · mouse_base (몸통·대기·쉬는중·배경·클릭·특수 키·펜 없음) */
const REQUIRED: AssetEntry[] = [named('kb_up'), entry({ kind: 'kb_down', index: 0 }), named('mouse_base')]
const manifestOf = (...extra: AssetEntry[]): AssetManifest => ({ canvas: CANVAS, entries: [...REQUIRED, ...extra] })
const MIN = manifestOf()
const IDLE_ONLY = manifestOf(named('idle'))
const MIN_CLICK = manifestOf(named('mouse_left'))
const PEN_MIN = manifestOf(entry(penSlot('pen_up'), 202, 154), entry(penSlot('pen_down_0'), 202, 154))

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
  penMode: false, // contract v0.15(CR-033) 기본값
}
/** 기존 픽스처 관례: DEFAULT_SETTINGS 상속(positionLock 기본 false 포함) */
const SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  scale: 1,
  idleSeconds: 300,
  overlay: { x: 100, y: 100, visible: true },
  mouse: MOUSE,
  autostart: false,
}
const LOCKED: Settings = { ...SETTINGS, positionLock: true }
const MONITORS: ScreenBounds[] = [{ x: 0, y: 0, width: 1920, height: 1080 }]
const ANCHOR: Point = { x: 520, y: 530 }
// 변형 참조(scenarios.md §0.2)
const REST = 'rotate(0deg) scaleX(1) rotate(0deg)'
const DOWN = 'rotate(135deg) scaleX(1.414) rotate(-180deg)'

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
const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}
const key = (pressed: boolean, heldCount: number) =>
  emit('keyboard', { pressed, heldCount, special: null, ts: Date.now() })
const move = (x: number, y: number) => emit('mouseMove', { x, y, ts: Date.now() })
const click = (pressed: boolean) => emit('mouseButton', { button: 'left', pressed, ts: Date.now() })

const q = {
  root: (c: HTMLElement) => c.firstElementChild as HTMLElement,
  canvas: (c: HTMLElement) => c.querySelector('.canvas') as HTMLElement,
  jelly: (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement,
  /** .jellyWrap 직계 레이어 img(몸통·상태·키보드 — class layer)의 src, 아래 → 위 순서 */
  layers: (c: HTMLElement) =>
    Array.from(q.jelly(c).children)
      .filter(el => el.tagName === 'IMG' && el.classList.contains('layer'))
      .map(el => el.getAttribute('src')),
  /** 상태 레이어(z2) img 수 — idle·rest url */
  stateImgs: (c: HTMLElement) => c.querySelectorAll('img[src="u:idle"], img[src="u:rest"]').length,
  /** 펜 손 = .jellyWrap 직계 img.hand */
  pen: (c: HTMLElement) =>
    Array.from(q.jelly(c).children)
      .find(el => el.tagName === 'IMG' && el.classList.contains('hand'))
      ?.getAttribute('src') ?? null,
  arm: (c: HTMLElement) => c.querySelector('.armWrap img') as HTMLImageElement | null,
}
const expectLoadOnce = () => {
  for (const fn of [getSettings, getAssetManifest, getMonitors, getHandAnchor]) {
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith()
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(MIN)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue(ANCHOR)
  vi.mocked(setSettings).mockImplementation(async s => s)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('R-27 대기·쉬는중 그림 선택 — 없으면 kb_up (design.md §10.9.2)', () => {
  it('TC-223: idle·rest 없는 매니페스트, 대기·누름 없음 → 상태 레이어 img 없음·kb_up 보임·문구 없음', async () => {
    const { container } = await mount()
    expect(q.stateImgs(container)).toBe(0)
    expect(q.layers(container)).toEqual(['u:kb_up'])
    expect(q.jelly(container).className).toBe('jellyWrap')
    expect(q.arm(container)?.getAttribute('src')).toBe('u:mouse_base')
    expect(q.arm(container)?.style.transform).toBe(REST)
    expect(container.textContent).toBe('')
    // ⓒ 조회 1회·구독 1회·저장 없음
    expectLoadOnce()
    for (const sub of [onKeyboard, onMouseMove, onMouseButton, onSettingsChanged, onAssetsChanged]) {
      expect(sub).toHaveBeenCalledTimes(1)
    }
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-224: 같은 매니페스트로 쉬는중 진입(유휴 300000ms)해도 kb_up 그대로, 전이·팔 쉬는 위치는 그대로 일어남', async () => {
    const { container } = await mount()
    await move(960, 1080)
    expect(q.arm(container)?.style.transform).toBe(DOWN)
    await advance(299_999)
    expect(q.arm(container)?.style.transform).toBe(DOWN) // 아직 대기
    expect(q.layers(container)).toEqual(['u:kb_up'])
    await advance(1)
    // 쉬는중 진입 — 상태기계는 그림 유무를 모른다(armAtRest → REST 가 전이의 증거)
    expect(q.arm(container)?.style.transform).toBe(REST)
    expect(q.stateImgs(container)).toBe(0)
    expect(q.layers(container)).toEqual(['u:kb_up'])
    expect(container.textContent).toBe('')
    expectLoadOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-225: ① 누름 중 kb_down_0 만(kb_up 없음·상태 레이어 없음), 쉬는중에서 누름도 같음', async () => {
    const { container } = await mount()
    await key(true, 1)
    expect(q.layers(container)).toEqual(['u:kb_down_0'])
    expect(container.querySelector('img[src="u:kb_up"]')).toBeNull()
    expect(q.stateImgs(container)).toBe(0)
    expect(q.jelly(container).className).toBe('jellyWrap jellyAlt') // 마운트 뒤 첫 누름 = phase 1
    await key(false, 0)
    expect(q.layers(container)).toEqual(['u:kb_up'])
    expect(q.jelly(container).className).toBe('jellyWrap')

    await advance(300_000) // 마지막 입력(T0) 기준 유휴 → 쉬는중
    expect(q.layers(container)).toEqual(['u:kb_up'])
    await key(true, 1) // 깨어남(idle) — idle 그림도 없으므로 상태 레이어 없음
    expect(q.layers(container)).toEqual(['u:kb_down_0'])
    expect(q.stateImgs(container)).toBe(0)
    expect(q.jelly(container).className).toBe('jellyWrap jelly')
    await key(false, 0)
    expect(q.layers(container)).toEqual(['u:kb_up'])
    expect(container.textContent).toBe('')
    expectLoadOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-225: ② 펜 모드(pen_up 등록 && penMode 켜짐 — v1.4 CR-033) + idle·rest 없음 → 키보드 kb_up 고정, 손만 pen_down_0 ↔ pen_up', async () => {
    vi.mocked(getAssetManifest).mockResolvedValue(PEN_MIN)
    // v1.4 개정(CR-033): 토글이 꺼져 있으면 pen_up이 있어도 펜 모드가 아니므로 이 마운트만 켠다
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS, mouse: { ...MOUSE, penMode: true } })
    const { container } = await mount()
    expect(q.layers(container)).toEqual(['u:kb_up'])
    expect(q.pen(container)).toBe('u:pen_up')
    await key(true, 1)
    expect(q.layers(container)).toEqual(['u:kb_up'])
    expect(q.pen(container)).toBe('u:pen_down_0')
    expect(q.stateImgs(container)).toBe(0)
    await key(false, 0)
    expect(q.layers(container)).toEqual(['u:kb_up'])
    expect(q.pen(container)).toBe('u:pen_up')
    expect(container.textContent).toBe('')
    expectLoadOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-226: idle만 있는 매니페스트 — 쉬는중 진입 시 idle img 사라짐(rest 미등록), 깨어나면 다시 idle', async () => {
    vi.mocked(getAssetManifest).mockResolvedValue(IDLE_ONLY)
    const { container } = await mount()
    expect(q.layers(container)).toEqual(['u:idle', 'u:kb_up'])
    await advance(299_999)
    expect(q.layers(container)).toEqual(['u:idle', 'u:kb_up'])
    await advance(1)
    expect(container.querySelector('img[src="u:idle"]')).toBeNull()
    expect(container.querySelector('img[src="u:rest"]')).toBeNull()
    expect(q.layers(container)).toEqual(['u:kb_up'])
    await key(true, 1)
    expect(q.layers(container)).toEqual(['u:idle', 'u:kb_down_0'])
    await key(false, 0)
    expect(q.layers(container)).toEqual(['u:idle', 'u:kb_up'])
    expect(container.textContent).toBe('')
    expectLoadOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('R-28 위치 잠금 — 오버레이는 positionLock 을 읽지 않는다 (design.md §10.9.1, §7 positionLock 행)', () => {
  it('TC-227: ① positionLock true/false 마운트 DOM 동일, .root 의 data-tauri-drag-region 유지', async () => {
    const unlocked = await mount()
    const html = unlocked.container.innerHTML
    expect(q.root(unlocked.container).hasAttribute('data-tauri-drag-region')).toBe(true)
    cleanup()
    for (const k of Object.keys(h.handlers)) delete h.handlers[k]

    vi.mocked(getSettings).mockResolvedValue(LOCKED)
    const locked = await mount()
    expect(locked.container.innerHTML).toBe(html)
    expect(q.root(locked.container).className).toBe('root')
    expect(q.root(locked.container).hasAttribute('data-tauri-drag-region')).toBe(true)
    expect(locked.container.textContent).toBe('')
    expect(getSettings).toHaveBeenCalledTimes(2) // 마운트마다 1회
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-227: ② 잠금 중에도 키·이동·클릭 반응, 설정 창 배율(settings://changed) 반영, 해제 수신에 DOM 불변', async () => {
    vi.mocked(getSettings).mockResolvedValue(LOCKED)
    vi.mocked(getAssetManifest).mockResolvedValue(MIN_CLICK)
    const { container } = await mount()
    expect(q.canvas(container).style.transform).toBe('scale(0.5)')

    await key(true, 1)
    expect(q.layers(container)).toEqual(['u:kb_down_0'])
    expect(q.jelly(container).className).toBe('jellyWrap jellyAlt')
    await key(false, 0)
    expect(q.layers(container)).toEqual(['u:kb_up'])
    await move(960, 1080)
    expect(q.arm(container)?.style.transform).toBe(DOWN)
    await click(true)
    expect(q.arm(container)?.getAttribute('src')).toBe('u:mouse_left')
    await click(false)
    expect(q.arm(container)?.getAttribute('src')).toBe('u:mouse_base')

    // 잠금 중 배율 = 설정 창 슬라이더 → set_settings → settings://changed (L-6)
    await emit('settingsChanged', { ...LOCKED, scale: 0.5 })
    expect(q.canvas(container).style.transform).toBe('scale(0.25)')
    const before = container.innerHTML
    // 잠금 해제 수신 — 오버레이 쪽 변화 없음(적용은 core 창 속성, L-7)
    await emit('settingsChanged', { ...LOCKED, scale: 0.5, positionLock: false })
    expect(container.innerHTML).toBe(before)
    expect(container.textContent).toBe('')

    expectLoadOnce() // 재조회 없음(이벤트 페이로드만)
    expect(setSettings).not.toHaveBeenCalled()
  })
})
