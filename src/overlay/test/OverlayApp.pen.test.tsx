/**
 * OverlayApp 펜 쥔 손 통합 TC — CR-025(R-25 펜 쥔 손 파츠) → CR-042(R-31 펜 손 단순화) 개정·추가.
 * 근거: design/components.md §3 OverlayApp 행(PenHand = .jellyWrap 안 LayerStack 뒤, props = MouseArm과 같은 값 + machine)·
 *   렌더 조건 PenHand 행(settings.mouse !== null, monitors 비어도 렌더, pen_up 없으면 null, mouse_base 없어도 팔 변형을 따름)·
 *   배경 DOM 구조(CR-025 애니메이션 클래스 없음), design.md §2 [pen]·§6 P-2·P-4·P-6·§10.7·§10.12,
 *   design/functions.md §5.3·§5.5(CR-042 개정 블록 — config.kbFrames = penMode ? 1 : kbDownFrameCount,
 *   손 = 누름 중 pen_down_0 ?? pen_up, 키보드 = pickPenKeyboardEntry, penDownFrameCount 삭제).
 * bridge mock(vi.mock 'bridge/commands'·'bridge/events') — 실제 Tauri API import 없음. 가짜 시계. 실제 sleep 없음.
 * 펜 슬롯 AssetSlot 표현은 파일명 키 문자열 캐스팅. 입력 순서를 파일·스냅샷·로그로 남기지 않는다(R-22).
 * 시나리오: src/overlay/test/scenarios.md TC-196 ~ TC-202(TC-197·198·199·202 v1.6 개정), TC-255 ~ TC-257(v1.6 신규)
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  getAssetManifest,
  getHandAnchor,
  getMonitors,
  getSettings,
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
import * as commands from 'bridge/commands'
import type { SpecialKey } from 'state/inputMachine'
import { armTransformFor, penTransform, penTransformCss } from 'state/mouseMapping'
import * as LayerStackModule from '../components/LayerStack'
import OverlayApp from '../index'

// ─── bridge mock ────────────────────────────────────────────────────────
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
const penSlot = (key: string) => key as unknown as AssetSlot
const entry = (slot: AssetSlot, width = 900, height = 700): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url: `u:${slotKey(slot)}`,
})
const pen = (key: string) => entry(penSlot(key), 202, 154)
const kbDown = (index: number) => entry({ kind: 'kb_down', index })
const CANVAS_SLOTS = ['background', 'body', 'idle', 'rest', 'kb_up', 'key_space']
const ARM_SLOTS = ['mouse_base', 'mouse_left', 'mouse_right']
const BASE_ENTRIES = [
  ...[...CANVAS_SLOTS, ...ARM_SLOTS].map(s => entry(s as AssetSlot)),
  kbDown(0),
  kbDown(1),
  kbDown(2),
]
/** pen_up·pen_down_0 + 옛 파일 pen_down_1·pen_key_space(CR-042 이후 읽지 않음). 펜 모드 kbFrames = 1(v1.6) */
const PEN_ENTRIES = [pen('pen_up'), pen('pen_down_0'), pen('pen_down_1'), pen('pen_key_space')]
const PEN_MANIFEST: AssetManifest = { canvas: { width: 900, height: 700 }, entries: [...BASE_ENTRIES, ...PEN_ENTRIES] }
/** 펜 슬롯 전혀 없음 */
const NO_PEN: AssetManifest = { canvas: { width: 900, height: 700 }, entries: BASE_ENTRIES }
/** pen_up 없음(pen_down_0·pen_key_space만) = 펜 모드 아님 */
const PARTIAL_PEN: AssetManifest = {
  canvas: { width: 900, height: 700 },
  entries: [...BASE_ENTRIES, pen('pen_down_0'), pen('pen_key_space')],
}
/** 팔 그림(mouse_*) 없음 */
const PEN_NO_ARM: AssetManifest = {
  canvas: { width: 900, height: 700 },
  entries: PEN_MANIFEST.entries.filter(e => !e.url.startsWith('u:mouse_')),
}
/** v1.6(CR-042): design.md §10.12 동작 표 머리 등록 — pen_up·pen_down_0·key_space(key_enter 없음), 옛 파일 없음 */
const SIMPLE_MANIFEST: AssetManifest = {
  canvas: { width: 900, height: 700 },
  entries: [...BASE_ENTRIES, pen('pen_up'), pen('pen_down_0')],
}
/** v1.6(CR-042): pen_down_0 없음 — 옛 파일(pen_down_1·pen_key_space)만 남음 */
const NO_DOWN0: AssetManifest = {
  canvas: { width: 900, height: 700 },
  entries: [...BASE_ENTRIES, pen('pen_up'), pen('pen_down_1'), pen('pen_key_space')],
}
const PEN_POS: Point = { x: 389, y: 492 }
const PEN_SIZE = { width: 202, height: 154 }
const MOUSE_PEN = {
  shoulder: { x: 620, y: 530 },
  area: [
    { x: 420, y: 430 },
    { x: 620, y: 430 },
    { x: 620, y: 630 },
    { x: 420, y: 630 },
  ],
  hand: null,
  partPos: { x: 0, y: 0 },
  penPos: PEN_POS,
  penMode: true, // v1.4(CR-033, R-29): 펜 모드 = pen_up 등록 && penMode — 이 스펙은 토글 켜짐 전제(꺼짐은 OverlayApp.penToggle.test.tsx)
} as MouseSettings
const SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  scale: 1,
  idleSeconds: 300,
  overlay: { x: 100, y: 100, visible: true },
  mouse: MOUSE_PEN,
  autostart: false,
}
/** 토글 꺼짐(같은 값 + penMode false) — TC-255 */
const OFF: Settings = { ...SETTINGS, mouse: { ...MOUSE_PEN, penMode: false } }
const MONITORS: ScreenBounds[] = [{ x: 0, y: 0, width: 1920, height: 1080 }]
const ANCHOR: Point = { x: 520, y: 530 }
const REST = 'rotate(0deg) scaleX(1) rotate(0deg)'
const UP = 'rotate(-135deg) scaleX(1.414) rotate(-180deg)'
const DOWN = 'rotate(135deg) scaleX(1.414) rotate(-180deg)'
const PEN_REST_CSS = 'translate(0px, 0px) rotate(0deg)'
const legacyBounds = (commands as unknown as Record<string, ReturnType<typeof vi.fn>>).getScreenBounds

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
const keyRepeat = (heldCount: number, special: SpecialKey | null = null) =>
  emit('keyboard', { pressed: true, heldCount, special, repeat: true, ts: Date.now() })
const move = (x: number, y: number) => emit('mouseMove', { x, y, ts: Date.now() })
const click = (button: 'left' | 'right', pressed: boolean) => emit('mouseButton', { button, pressed, ts: Date.now() })
const canvas = (c: HTMLElement) => c.querySelector('.canvas') as HTMLElement | null
const jelly = (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement
const penImg = (c: HTMLElement) => c.querySelector('img[src^="u:pen"]') as HTMLImageElement | null
const armImg = (c: HTMLElement) => c.querySelector('.armWrap img') as HTMLImageElement | null
/** 키보드 파츠 img = .jellyWrap 직계 자식 중 마지막 .layer(펜 모드면 그 뒤에 펜 손 img가 온다) */
const kbImg = (c: HTMLElement) => {
  const layers = Array.from(jelly(c).children).filter(e => e.classList.contains('layer'))
  return layers[layers.length - 1] as HTMLImageElement
}
const ids = (el: Element) =>
  Array.from(el.children).map(ch => (ch.tagName === 'IMG' ? ch.getAttribute('src') : ch.classList[0]))
const box = (i: HTMLImageElement) => [i.style.left, i.style.top, i.style.width, i.style.height, i.style.transformOrigin]
const penCss = (cursor: Point) =>
  penTransformCss(
    penTransform(
      MOUSE_PEN.shoulder,
      armTransformFor({ mouse: MOUSE_PEN, monitors: MONITORS, cursor, anchor: ANCHOR, atRest: false }),
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
const loadedOnce = () => {
  for (const fn of [getSettings, getAssetManifest, getMonitors, getHandAnchor]) expect(fn).toHaveBeenCalledTimes(1)
  expect(legacyBounds).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(PEN_MANIFEST)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue(ANCHOR)
  vi.mocked(setSettings).mockImplementation(async s => s)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('펜 손 DOM 위치 (design/components.md 렌더 조건·배경 DOM 구조, design.md §2 [pen])', () => {
  it('TC-196: 펜 손 img = .jellyWrap 마지막 자식(맨 위), class hand, 쉬는 자세 = penPos·pen_up 크기·원점 pen_up 중심·회전 0', async () => {
    const { container } = await mount()
    expect(ids(canvas(container) as HTMLElement)).toEqual(['u:background', 'jellyWrap'])
    expect(container.querySelectorAll('.jellyWrap')).toHaveLength(1)
    const j = jelly(container)
    expect(ids(j)).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up', 'u:pen_up'])
    const p = j.lastElementChild as HTMLImageElement
    expect(p).toBe(penImg(container))
    expect(p.tagName).toBe('IMG')
    expect(p.parentElement).toBe(j)
    expect(p.className).toBe('hand')
    expect(p.getAttribute('alt')).toBe('')
    expect(p.getAttribute('draggable')).toBe('false')
    expect(box(p)).toEqual(['389px', '492px', '202px', '154px', '101px 77px'])
    expect(p.style.transform).toBe(PEN_REST_CSS)
    expect((armImg(container) as HTMLImageElement).style.transform).toBe(REST)
    expect(container.querySelectorAll('img[src^="u:pen"]')).toHaveLength(1)
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('펜 모드 키 입력 (design.md §6 P-2·§10.12 손 그림·키보드 레이어, design/functions.md §5.5 CR-042)', () => {
  it('TC-197: 손 = 누름 중 pen_down_0(순환 없음), 키보드 = 일반 키 kb_up·특수 키 누름 중 key_space(key_enter 없음 → kb_up, Enter 뗌 → 스페이스 복귀), 손 위치·각도 불변, 로그 없음 (v1.6 개정, CR-042)', async () => {
    const { container } = await mount()
    const logs = (['log', 'info', 'debug'] as const).map(m => vi.spyOn(console, m).mockImplementation(() => undefined))
    const p = penImg(container) as HTMLImageElement
    const kb = kbImg(container)
    const pose = [p.style.transform, p.style.left, p.style.top, p.style.transformOrigin]
    const check = (penSrc: string, kbSrc: string) => {
      expect(penImg(container)).toBe(p)
      expect(jelly(container).lastElementChild).toBe(p)
      expect(p.getAttribute('src')).toBe(penSrc)
      expect(p.className).toBe('hand')
      expect(kbImg(container)).toBe(kb)
      expect(kb.getAttribute('src')).toBe(kbSrc)
      expect(kb.className).toBe('layer')
      expect(container.querySelectorAll('img[src^="u:kb_down"]')).toHaveLength(0)
      expect([p.style.transform, p.style.left, p.style.top, p.style.transformOrigin]).toEqual(pose)
    }
    await key(true, 1)
    check('u:pen_down_0', 'u:kb_up')
    await key(false, 0)
    check('u:pen_up', 'u:kb_up')
    await key(true, 1)
    check('u:pen_down_0', 'u:kb_up')
    await key(false, 0)
    check('u:pen_up', 'u:kb_up')
    await key(true, 1)
    check('u:pen_down_0', 'u:kb_up')
    await key(true, 2, 'space')
    check('u:pen_down_0', 'u:key_space')
    await key(true, 3, 'enter')
    check('u:pen_down_0', 'u:kb_up')
    await key(false, 2, 'enter')
    check('u:pen_down_0', 'u:key_space')
    await key(false, 0, null)
    check('u:pen_up', 'u:kb_up')
    for (const s of logs) expect(s).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    loadedOnce()
  })
})

describe('펜 손 팔 끝 추종·클릭 = 손 그림만 (design.md §6 P-4(CR-025·CR-027)·§10.7·§10.8·§10.12, design/functions.md §5.5 PenHand Props)', () => {
  it('TC-198: 이동 → 팔과 같은 armTransformFor로 붙는 점 P가 P′로·θt−θh 기울기(스케일 없음), 클릭은 팔 그림 교체 + 손 pen_down_0·젤리, 손 위치·각도 불변 (v1.6 개정, CR-042)', async () => {
    const { container } = await mount()
    const p = penImg(container) as HTMLImageElement
    await move(960, 0)
    expect((armImg(container) as HTMLImageElement).style.transform).toBe(UP)
    expect(p.style.transform).toBe(penCss({ x: 960, y: 0 }))
    near(parsePen(p.style.transform), [-27.56, -141.4, 45])
    expect(p.style.transform).not.toMatch(/scale/)
    expect(box(p)).toEqual(['389px', '492px', '202px', '154px', '101px 77px'])
    const t = p.style.transform
    // v1.2(CR-027, R-26) 클릭 누름 = 키 누름 + 젤리 / v1.6(CR-042, R-31) 손 누름 그림 = pen_down_0 한 장
    for (const [b, armSrc, penSrc, cls] of [
      ['left', 'u:mouse_left', 'u:pen_down_0', 'jellyWrap jellyAlt'],
      ['right', 'u:mouse_right', 'u:pen_down_0', 'jellyWrap jelly'],
    ] as const) {
      await click(b, true)
      expect((armImg(container) as HTMLImageElement).getAttribute('src')).toBe(armSrc)
      expect(penImg(container)).toBe(p)
      expect(p.getAttribute('src')).toBe(penSrc)
      expect(jelly(container).className).toBe(cls)
      expect(kbImg(container).getAttribute('src')).toBe('u:kb_up')
      expect(p.style.transform).toBe(t)
      expect(box(p)).toEqual(['389px', '492px', '202px', '154px', '101px 77px'])
      await click(b, false)
      expect((armImg(container) as HTMLImageElement).getAttribute('src')).toBe('u:mouse_base')
      expect(p.getAttribute('src')).toBe('u:pen_up')
      expect(jelly(container).className).toBe('jellyWrap')
      expect(p.style.transform).toBe(t)
    }
    await move(960, 1080)
    expect((armImg(container) as HTMLImageElement).style.transform).toBe(DOWN)
    expect(p.style.transform).toBe(penCss({ x: 960, y: 1080 }))
    near(parsePen(p.style.transform), [27.6, 118.56, -45])
    expect(box(p)).toEqual(['389px', '492px', '202px', '154px', '101px 77px'])
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('젤리·부르르와 합성 (design.md §10.7 젤리·부르르·§10.12 바운스·부르르, design/components.md 배경 DOM 구조 (CR-025))', () => {
  it('TC-199: 애니메이션 클래스는 .jellyWrap 하나에만 — 펜 손 img는 class hand 그대로, 반복 누름(부르르) 중 손 그림(pen_down_0)·변형 불변 (v1.6 개정, CR-042)', async () => {
    const { container } = await mount()
    const j = jelly(container)
    const p = penImg(container) as HTMLImageElement
    await move(960, 0)
    const t = p.style.transform
    const only = (cls: string) => {
      const animated = container.querySelectorAll('.jelly, .jellyAlt, .shiver, .bounce, .bounceAlt')
      expect(animated).toHaveLength(1)
      expect(animated[0]).toBe(j)
      expect(j.className).toBe(cls)
      expect(p.className).toBe('hand')
      expect(p.style.transform).toBe(t)
      expect(jelly(container).lastElementChild).toBe(p)
    }
    await key(true, 1)
    only('jellyWrap jellyAlt')
    const src = p.getAttribute('src')
    expect(src).toBe('u:pen_down_0')
    await keyRepeat(1)
    only('jellyWrap shiver')
    expect(p.getAttribute('src')).toBe(src)
    await keyRepeat(1)
    only('jellyWrap shiver')
    expect(p.getAttribute('src')).toBe(src)
    await key(false, 0)
    expect(j.className).toBe('jellyWrap')
    expect(p.getAttribute('src')).toBe('u:pen_up')
    expect(kbImg(container).getAttribute('src')).toBe('u:kb_up')
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('pen_up 없음 = 기존 동작 불변 (design/functions.md §5.3 isPenMode, design.md §10.7 펜 모드)', () => {
  it('TC-200: pen_down_*·pen_key_*만 있으면 펜 손 없음, 키보드는 kb_down 3장 순환·key_space 그대로, .jellyWrap 자식 불변', async () => {
    vi.mocked(getAssetManifest).mockResolvedValue(PARTIAL_PEN)
    const { container } = await mount()
    expect(ids(jelly(container))).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up'])
    const seq: Array<[() => Promise<void>, string]> = [
      [() => key(true, 1), 'u:kb_down_1'],
      [() => key(false, 0), 'u:kb_up'],
      [() => key(true, 1), 'u:kb_down_2'],
      [() => key(false, 0), 'u:kb_up'],
      [() => key(true, 1), 'u:kb_down_0'],
      [() => key(true, 2, 'space'), 'u:key_space'],
      [() => key(false, 0, null), 'u:kb_up'],
      [() => move(960, 0), 'u:kb_up'],
      [() => click('left', true), 'u:kb_up'],
    ]
    for (const [a, src] of seq) {
      await a()
      expect(kbImg(container).getAttribute('src')).toBe(src)
      expect(jelly(container).lastElementChild).toBe(kbImg(container))
      expect(penImg(container)).toBeNull()
    }
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('표시 조건 (design/components.md 렌더 조건 PenHand 행, design.md §10.7 표시 조건)', () => {
  it('TC-201: ① mouse null → 펜 손 없음·펜 모드 아님(isPenMode(manifest, null) = false — v1.4 CR-033)이라 누름 중 키보드 kb_down_1 ② 모니터 없음 → 팔 없음·손은 쉬는 자세 ③ 팔 그림 없음 → 손은 팔 변형을 그대로 따름', async () => {
    // ① v1.4 개정(CR-033): penMode를 읽을 mouse가 없으면 펜 모드 아님 → kbFrames = kbDownFrameCount 3, 첫 누름 kbFrame 1
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS, mouse: null })
    const a = await mount()
    expect(ids(jelly(a.container))).toEqual(['u:body', 'u:idle', 'u:kb_up'])
    expect(penImg(a.container)).toBeNull()
    await key(true, 1)
    expect(kbImg(a.container).getAttribute('src')).toBe('u:kb_down_1')
    expect(penImg(a.container)).toBeNull()
    await key(false, 0)
    loadedOnce()
    a.unmount()

    // ②
    vi.clearAllMocks()
    vi.mocked(getSettings).mockResolvedValue(SETTINGS)
    vi.mocked(getMonitors).mockResolvedValue([])
    const b = await mount()
    expect(armImg(b.container)).toBeNull()
    expect(ids(jelly(b.container))).toEqual(['u:body', 'u:idle', 'u:kb_up', 'u:pen_up'])
    await move(960, 0)
    const pb = penImg(b.container) as HTMLImageElement
    expect(pb.style.transform).toBe(PEN_REST_CSS)
    expect(box(pb)).toEqual(['389px', '492px', '202px', '154px', '101px 77px'])
    loadedOnce()
    b.unmount()

    // ③
    vi.clearAllMocks()
    vi.mocked(getMonitors).mockResolvedValue(MONITORS)
    vi.mocked(getAssetManifest).mockResolvedValue(PEN_NO_ARM)
    const c = await mount()
    expect(armImg(c.container)).toBeNull()
    expect(ids(jelly(c.container))).toEqual(['u:body', 'u:idle', 'u:kb_up', 'u:pen_up'])
    await move(960, 0)
    expect((penImg(c.container) as HTMLImageElement).style.transform).toBe(penCss({ x: 960, y: 0 }))
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('설정·이미지 변경 반영 (design.md §6 P-6(CR-025)·§10.12 config)', () => {
  it('TC-202: settings://changed penPos → 자리 이동·null이면 기본 규칙, assets://changed로 펜 모드 꺼짐(kbFrames 3)·켜짐(kbFrames 1 — 손 pen_down_0 한 장), 재조회 없음 (v1.6 개정, CR-042)', async () => {
    const { container } = await mount()
    const p = penImg(container) as HTMLImageElement
    await emit('settingsChanged', { ...SETTINGS, mouse: { ...MOUSE_PEN, penPos: { x: 100, y: 50 } } })
    expect(penImg(container)).toBe(p)
    expect(box(p)).toEqual(['100px', '50px', '202px', '154px', '101px 77px'])
    await emit('settingsChanged', { ...SETTINGS, mouse: { ...MOUSE_PEN, penPos: null } })
    expect(box(p)).toEqual(['419px', '453px', '202px', '154px', '101px 77px'])

    await emit('assetsChanged', NO_PEN)
    expect(penImg(container)).toBeNull()
    expect(jelly(container).lastElementChild).toBe(kbImg(container))
    const kbSeen = new Set<string>()
    for (let i = 0; i < 3; i++) {
      await key(true, 1)
      kbSeen.add(kbImg(container).getAttribute('src') as string)
      await key(false, 0)
      expect(kbImg(container).getAttribute('src')).toBe('u:kb_up')
    }
    expect([...kbSeen].sort()).toEqual(['u:kb_down_0', 'u:kb_down_1', 'u:kb_down_2'])

    await emit('assetsChanged', PEN_MANIFEST)
    const p2 = penImg(container) as HTMLImageElement
    expect(p2).not.toBeNull()
    expect(jelly(container).lastElementChild).toBe(p2)
    expect(box(p2)).toEqual(['419px', '453px', '202px', '154px', '101px 77px'])
    const penSeen = new Set<string>()
    for (let i = 0; i < 2; i++) {
      await key(true, 1)
      expect(kbImg(container).getAttribute('src')).toBe('u:kb_up')
      penSeen.add(p2.getAttribute('src') as string)
      await key(false, 0)
      expect(p2.getAttribute('src')).toBe('u:pen_up')
    }
    expect([...penSeen]).toEqual(['u:pen_down_0'])
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('CR-042 회귀 ④ config.kbFrames (design.md §10.12 config, design/functions.md §5.5 CR-042 OverlayApp config·penDownFrameCount 삭제)', () => {
  it('TC-255: 펜 모드 kbFrames = 1(kbFrame 늘 0) — 켜짐에서 한 번 누른 뒤 끄면 첫 누름 kb_down_1, 꺼짐 = kbDownFrameCount 3 순환, 다시 켜면 pen_down_0, penDownFrameCount export 없음', async () => {
    const { container } = await mount()
    const p = penImg(container) as HTMLImageElement
    const kb = kbImg(container)
    const steps: Array<[() => Promise<void>, string, string]> = [
      [() => key(true, 1), 'u:pen_down_0', 'u:kb_up'],
      [() => key(false, 0), 'u:pen_up', 'u:kb_up'],
      [() => emit('settingsChanged', OFF), 'u:pen_up', 'u:kb_up'],
      // 켜짐 누름 뒤 kbFrame 0(kbFrames 1) → 꺼짐 첫 누름 (0+1) mod 3 = 1. penDownFrameCount(2)였다면 kb_down_2
      [() => key(true, 1), 'u:pen_up', 'u:kb_down_1'],
      [() => key(false, 0), 'u:pen_up', 'u:kb_up'],
      [() => key(true, 1), 'u:pen_up', 'u:kb_down_2'],
      [() => key(false, 0), 'u:pen_up', 'u:kb_up'],
      [() => key(true, 1), 'u:pen_up', 'u:kb_down_0'],
      [() => key(false, 0), 'u:pen_up', 'u:kb_up'],
      [() => emit('settingsChanged', SETTINGS), 'u:pen_up', 'u:kb_up'],
      [() => key(true, 1), 'u:pen_down_0', 'u:kb_up'],
      [() => key(false, 0), 'u:pen_up', 'u:kb_up'],
    ]
    for (const [run, penSrc, kbSrc] of steps) {
      await run()
      expect(penImg(container)).toBe(p)
      expect(p.getAttribute('src')).toBe(penSrc)
      expect(kbImg(container)).toBe(kb)
      expect(kb.getAttribute('src')).toBe(kbSrc)
    }
    expect('penDownFrameCount' in LayerStackModule).toBe(false)
    expect(typeof LayerStackModule.pickPenKeyboardEntry).toBe('function')
    expect(onSettingsChanged).toHaveBeenCalledTimes(1)
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('CR-042 회귀 ⑤ 남은 옛 파일 (design.md §10.12 남은 옛 파일·계약)', () => {
  it('TC-256: 옛 파일(pen_down_1·pen_key_space)이 등록돼 있어도 쓰지 않음 — 손은 pen_up·pen_down_0 두 장만, pen_down_0 없으면 누름 중에도 pen_up, 안내·오류 없음', async () => {
    const { container } = await mount()
    const p = penImg(container) as HTMLImageElement
    const oldImgs = () => container.querySelectorAll('img[src="u:pen_down_1"], img[src="u:pen_key_space"]')
    const seen = new Set<string>()
    const steps: Array<[() => Promise<void>, string]> = [
      [() => key(true, 1), 'u:kb_up'],
      [() => key(false, 0), 'u:kb_up'],
      [() => key(true, 1), 'u:kb_up'],
      [() => key(false, 0), 'u:kb_up'],
      [() => key(true, 1, 'space'), 'u:key_space'],
      [() => click('left', true), 'u:key_space'],
      [() => key(false, 0, 'space'), 'u:kb_up'],
      [() => click('left', false), 'u:kb_up'],
      [() => click('right', true), 'u:kb_up'],
      [() => click('right', false), 'u:kb_up'],
    ]
    for (const [run, kbSrc] of steps) {
      await run()
      expect(penImg(container)).toBe(p)
      seen.add(p.getAttribute('src') as string)
      expect(kbImg(container).getAttribute('src')).toBe(kbSrc)
      expect(oldImgs()).toHaveLength(0)
    }
    expect([...seen].sort()).toEqual(['u:pen_down_0', 'u:pen_up'])

    // pen_down_0 없음(옛 파일만 남음) → 누름 중에도 pen_up
    await emit('assetsChanged', NO_DOWN0)
    const p2 = penImg(container) as HTMLImageElement
    const steps2: Array<[() => Promise<void>, string]> = [
      [() => key(true, 1), 'u:kb_up'],
      [() => key(true, 2, 'space'), 'u:key_space'],
      [() => click('left', true), 'u:key_space'],
      [() => key(false, 1, 'space'), 'u:kb_up'],
      [() => key(false, 0), 'u:kb_up'],
      [() => click('left', false), 'u:kb_up'],
    ]
    for (const [run, kbSrc] of steps2) {
      await run()
      expect(penImg(container)).toBe(p2)
      expect(p2.getAttribute('src')).toBe('u:pen_up')
      expect(kbImg(container).getAttribute('src')).toBe(kbSrc)
      expect(oldImgs()).toHaveLength(0)
    }
    expect(container.textContent).toBe('')
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('CR-042 동작 표 1~14행 화면 통합 (design.md §10.12 동작 표·바운스·부르르·입력 비보관)', () => {
  it('TC-257: pen_up·pen_down_0·key_space(key_enter 없음) — 키보드는 특수 키 누름 중에만 key_space, 손은 누름 중 pen_down_0(순환 없음), 젤리·부르르 규칙 그대로', async () => {
    vi.mocked(getAssetManifest).mockResolvedValue(SIMPLE_MANIFEST)
    const { container } = await mount()
    const logs = (['log', 'info', 'debug'] as const).map(m => vi.spyOn(console, m).mockImplementation(() => undefined))
    const p = penImg(container) as HTMLImageElement
    const kb = kbImg(container)
    const j = jelly(container)
    const pose = [p.style.transform, p.style.left, p.style.top, p.style.transformOrigin]
    const see = (kbSrc: string, penSrc: string, cls: string) => {
      expect(kbImg(container)).toBe(kb)
      expect(kb.getAttribute('src')).toBe(kbSrc)
      expect(kb.className).toBe('layer')
      expect(penImg(container)).toBe(p)
      expect(p.getAttribute('src')).toBe(penSrc)
      expect(jelly(container)).toBe(j)
      expect(j.className).toBe(cls)
      expect(j.lastElementChild).toBe(p)
      expect([p.style.transform, p.style.left, p.style.top, p.style.transformOrigin]).toEqual(pose)
      expect(container.querySelectorAll('img[src^="u:kb_down"]')).toHaveLength(0)
    }
    const J = 'jellyWrap'
    const A = 'jellyWrap jellyAlt'
    const B = 'jellyWrap jelly'
    const S = 'jellyWrap shiver'
    see('u:kb_up', 'u:pen_up', J) // 1
    const rows: Array<[() => Promise<void>, string, string, string]> = [
      [() => key(true, 1), 'u:kb_up', 'u:pen_down_0', A], // 2
      [() => key(false, 0), 'u:kb_up', 'u:pen_up', J], // 3
      [() => key(true, 1, 'space'), 'u:key_space', 'u:pen_down_0', B], // 4
      [() => key(false, 0, 'space'), 'u:kb_up', 'u:pen_up', J], // 5
      [() => key(true, 1, 'enter'), 'u:kb_up', 'u:pen_down_0', A], // 6
      [() => key(false, 0, 'enter'), 'u:kb_up', 'u:pen_up', J],
      [() => key(true, 1), 'u:kb_up', 'u:pen_down_0', B], // 7
      [() => key(true, 2, 'space'), 'u:key_space', 'u:pen_down_0', A],
      [() => key(false, 1, 'space'), 'u:kb_up', 'u:pen_down_0', A], // 8
      [() => key(false, 0), 'u:kb_up', 'u:pen_up', J],
      [() => click('left', true), 'u:kb_up', 'u:pen_down_0', B], // 9
      [() => click('left', false), 'u:kb_up', 'u:pen_up', J],
      [() => key(true, 1, 'space'), 'u:key_space', 'u:pen_down_0', A], // 10
      [() => click('left', true), 'u:key_space', 'u:pen_down_0', A],
      [() => key(false, 0, 'space'), 'u:kb_up', 'u:pen_down_0', A],
      [() => click('left', false), 'u:kb_up', 'u:pen_up', J],
      [() => click('left', true), 'u:kb_up', 'u:pen_down_0', B], // 11
      [() => key(true, 1, 'space'), 'u:key_space', 'u:pen_down_0', A],
      [() => key(false, 0, 'space'), 'u:kb_up', 'u:pen_down_0', A], // 12
      [() => click('left', false), 'u:kb_up', 'u:pen_up', J],
      [() => key(true, 1, 'space'), 'u:key_space', 'u:pen_down_0', B], // 13
      [() => keyRepeat(1, 'space'), 'u:key_space', 'u:pen_down_0', S],
      [() => keyRepeat(1, 'space'), 'u:key_space', 'u:pen_down_0', S],
      [() => key(false, 0, 'space'), 'u:kb_up', 'u:pen_up', J],
      [() => key(true, 1), 'u:kb_up', 'u:pen_down_0', A], // 14
      [() => key(false, 0), 'u:kb_up', 'u:pen_up', J],
      [() => key(true, 1), 'u:kb_up', 'u:pen_down_0', B],
      [() => key(false, 0), 'u:kb_up', 'u:pen_up', J],
      [() => key(true, 1), 'u:kb_up', 'u:pen_down_0', A],
      [() => key(false, 0), 'u:kb_up', 'u:pen_up', J],
    ]
    for (const [run, kbSrc, penSrc, cls] of rows) {
      await run()
      see(kbSrc, penSrc, cls)
    }
    for (const s of logs) expect(s).not.toHaveBeenCalled()
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})
