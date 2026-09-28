/**
 * OverlayApp 펜 손 사용 토글 통합 TC — CR-033(R-29).
 * 근거: design.md §10.10(판정 penMode = isPenMode(manifest, settings.mouse)·config(kbFrames·clickPress = penMode,
 *   의존성 penMode)·LayerStack/PenHand prop penMode·꺼짐 동작 표·전환·계약·§7 추가 행), design/functions.md §5.3
 *   CR-033 개정표(OverlayApp penMode)·§5.5 PenHand 렌더 CR-033, contract v0.15 §3.3 MouseSettings.penMode
 *   (getSettings·onSettingsChanged로 받음 — 새 command·event·래퍼 없음), requirements §2 S-12.
 * 픽스처는 OverlayApp.pen.test.tsx와 같다(PEN_MANIFEST: kb_down 3장 + pen_up·pen_down_0 + 옛 파일 pen_down_1·pen_key_space,
 *   penPos (389,492)) — 꺼짐 kbFrames = kbDownFrameCount 3, 켜짐 = 1(v1.6 CR-042 — penDownFrameCount 삭제,
 *   손 누름 그림 = pen_down_0 한 장, design.md §10.12 config).
 * bridge mock(vi.mock 'bridge/commands'·'bridge/events') — 실제 Tauri API import 없음. 가짜 시계. 실제 sleep 없음.
 * 입력 순서를 파일·스냅샷·로그로 남기지 않는다(R-22).
 * 시나리오: src/overlay/test/scenarios.md TC-232 ~ TC-236
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  getAssetManifest,
  getHandAnchor,
  getMonitors,
  getSettings,
  onMouseButton,
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
const BASE_ENTRIES = [
  ...['background', 'body', 'idle', 'rest', 'kb_up', 'key_space', 'mouse_base', 'mouse_left', 'mouse_right'].map(s =>
    entry(s as AssetSlot),
  ),
  kbDown(0),
  kbDown(1),
  kbDown(2),
]
const PEN_MANIFEST: AssetManifest = {
  canvas: { width: 900, height: 700 },
  entries: [...BASE_ENTRIES, pen('pen_up'), pen('pen_down_0'), pen('pen_down_1'), pen('pen_key_space')],
}
const PEN_POS: Point = { x: 389, y: 492 }
const PEN_SIZE = { width: 202, height: 154 }
const MOUSE_ON: MouseSettings = {
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
  penMode: true,
}
const MOUSE_OFF: MouseSettings = { ...MOUSE_ON, penMode: false }
const SETTINGS_OFF: Settings = {
  ...DEFAULT_SETTINGS,
  scale: 1,
  idleSeconds: 300,
  overlay: { x: 100, y: 100, visible: true },
  mouse: MOUSE_OFF,
  autostart: false,
}
const SETTINGS_ON: Settings = { ...SETTINGS_OFF, mouse: MOUSE_ON }
const MONITORS: ScreenBounds[] = [{ x: 0, y: 0, width: 1920, height: 1080 }]
const ANCHOR: Point = { x: 520, y: 530 }
const REST = 'rotate(0deg) scaleX(1) rotate(0deg)'
const UP = 'rotate(-135deg) scaleX(1.414) rotate(-180deg)'
const DOWN = 'rotate(135deg) scaleX(1.414) rotate(-180deg)'
const PEN_REST_CSS = 'translate(0px, 0px) rotate(0deg)'
const BOX = ['389px', '492px', '202px', '154px', '101px 77px']
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
const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}
const key = (pressed: boolean, heldCount: number, special: SpecialKey | null = null) =>
  emit('keyboard', { pressed, heldCount, special, ts: Date.now() })
const move = (x: number, y: number) => emit('mouseMove', { x, y, ts: Date.now() })
const click = (button: 'left' | 'right', pressed: boolean) => emit('mouseButton', { button, pressed, ts: Date.now() })
const setPenMode = (on: boolean) => emit('settingsChanged', on ? SETTINGS_ON : SETTINGS_OFF)
const jelly = (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement
const penImg = (c: HTMLElement) => c.querySelector('img[src^="u:pen"]') as HTMLImageElement | null
const armImg = (c: HTMLElement) => c.querySelector('.armWrap img') as HTMLImageElement | null
/** 키보드 파츠 img = .jellyWrap 직계 자식 중 마지막 .layer(펜 손 img는 그 뒤) */
const kbImg = (c: HTMLElement) => {
  const layers = Array.from(jelly(c).children).filter(e => e.classList.contains('layer'))
  return layers[layers.length - 1] as HTMLImageElement
}
const ids = (el: Element) =>
  Array.from(el.children).map(ch => (ch.tagName === 'IMG' ? ch.getAttribute('src') : ch.classList[0]))
const box = (i: HTMLImageElement) => [i.style.left, i.style.top, i.style.width, i.style.height, i.style.transformOrigin]
const animatedOnlyJelly = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('.jelly, .jellyAlt, .shiver, .bounce, .bounceAlt')).every(e => e === jelly(c))
const penCss = (cursor: Point) =>
  penTransformCss(
    penTransform(
      MOUSE_OFF.shoulder,
      armTransformFor({ mouse: MOUSE_OFF, monitors: MONITORS, cursor, anchor: ANCHOR, atRest: false }),
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
/** (손 src · 키보드 src · .jellyWrap class · 팔 src) */
type View = [string, string, string, string]
const view = (c: HTMLElement): View => [
  penImg(c)?.getAttribute('src') ?? '',
  kbImg(c).getAttribute('src') ?? '',
  jelly(c).className,
  armImg(c)?.getAttribute('src') ?? '',
]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(SETTINGS_OFF)
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

describe('토글 꺼짐 (design.md §10.10 꺼짐 동작 표, pen_up 등록 + penMode false)', () => {
  it('TC-232: 키 입력 → 키보드 kb_down 3장 순환·key_space(kbFrames = kbDownFrameCount), 손은 pen_up 고정(같은 노드·자세 불변), 젤리는 기존 규칙, 로그 없음', async () => {
    const { container } = await mount()
    const logs = (['log', 'info', 'debug'] as const).map(m => vi.spyOn(console, m).mockImplementation(() => undefined))
    expect(ids(jelly(container))).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up', 'u:pen_up'])
    const p = penImg(container) as HTMLImageElement
    const kb = kbImg(container)
    const pose = [p.style.transform, ...box(p)]
    expect(pose).toEqual([PEN_REST_CSS, ...BOX])
    const steps: Array<[() => Promise<void>, string, string]> = [
      [() => key(true, 1), 'u:kb_down_1', 'jellyWrap jellyAlt'],
      [() => key(false, 0), 'u:kb_up', 'jellyWrap'],
      [() => key(true, 1), 'u:kb_down_2', 'jellyWrap jelly'],
      [() => key(false, 0), 'u:kb_up', 'jellyWrap'],
      [() => key(true, 1), 'u:kb_down_0', 'jellyWrap jellyAlt'],
      [() => key(true, 2, 'space'), 'u:key_space', 'jellyWrap jelly'],
      [() => key(false, 1, 'space'), 'u:kb_down_1', 'jellyWrap jelly'],
      [() => key(false, 0), 'u:kb_up', 'jellyWrap'],
    ]
    for (const [run, kbSrc, cls] of steps) {
      await run()
      expect(kbImg(container)).toBe(kb)
      expect(kb.getAttribute('src')).toBe(kbSrc)
      expect(kb.className).toBe('layer')
      expect(jelly(container).className).toBe(cls)
      expect(penImg(container)).toBe(p)
      expect(p.getAttribute('src')).toBe('u:pen_up')
      expect(p.className).toBe('hand')
      expect(jelly(container).lastElementChild).toBe(p)
      expect([p.style.transform, ...box(p)]).toEqual(pose)
      expect(animatedOnlyJelly(container)).toBe(true)
      expect(container.querySelectorAll('img[src^="u:pen_down"], img[src^="u:pen_key"]')).toHaveLength(0)
    }
    for (const s of logs) expect(s).not.toHaveBeenCalled()
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-233: 클릭 → 클릭 파츠만 교체, 손 pen_up·젤리 없음(clickPress false), 버튼 누른 채 첫 키 누름은 기존대로 젤리', async () => {
    const { container } = await mount()
    const p = penImg(container) as HTMLImageElement
    const j = jelly(container)
    const pose = [p.style.transform, ...box(p)]
    const steps: Array<[() => Promise<void>, string, string, string]> = [
      [() => click('left', true), 'u:mouse_left', 'jellyWrap', 'u:kb_up'],
      [() => click('left', false), 'u:mouse_base', 'jellyWrap', 'u:kb_up'],
      [() => click('right', true), 'u:mouse_right', 'jellyWrap', 'u:kb_up'],
      [() => click('right', false), 'u:mouse_base', 'jellyWrap', 'u:kb_up'],
      [() => click('left', true), 'u:mouse_left', 'jellyWrap', 'u:kb_up'],
      [() => key(true, 1), 'u:mouse_left', 'jellyWrap jellyAlt', 'u:kb_down_1'],
      [() => key(false, 0), 'u:mouse_left', 'jellyWrap', 'u:kb_up'],
      [() => click('left', false), 'u:mouse_base', 'jellyWrap', 'u:kb_up'],
    ]
    for (const [run, armSrc, cls, kbSrc] of steps) {
      await run()
      expect(armImg(container)?.getAttribute('src')).toBe(armSrc)
      expect(jelly(container)).toBe(j)
      expect(j.className).toBe(cls)
      expect(kbImg(container).getAttribute('src')).toBe(kbSrc)
      expect(penImg(container)).toBe(p)
      expect(p.getAttribute('src')).toBe('u:pen_up')
      expect([p.style.transform, ...box(p)]).toEqual(pose)
    }
    expect(p.style.transform).toBe(PEN_REST_CSS)
    expect(armImg(container)?.style.transform).toBe(REST)
    expect(onMouseButton).toHaveBeenCalledTimes(1)
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-234: 꺼짐이어도 손은 팔 끝을 따라 이동·기울기(켜짐과 같은 변형, 크기 불변), 키 누름에 그림·자세 불변, 쉬는중 진입 시 쉬는 자세', async () => {
    const { container } = await mount()
    const p = penImg(container) as HTMLImageElement
    await move(960, 0)
    expect(armImg(container)?.style.transform).toBe(UP)
    expect(p.style.transform).toBe(penCss({ x: 960, y: 0 }))
    near(parsePen(p.style.transform), [-27.56, -141.4, 45])
    expect(p.style.transform).not.toMatch(/scale/)
    expect(box(p)).toEqual(BOX)
    expect(p.getAttribute('src')).toBe('u:pen_up')
    const t = p.style.transform
    await key(true, 1)
    expect(kbImg(container).getAttribute('src')).toMatch(/^u:kb_down_[0-2]$/)
    expect(p.getAttribute('src')).toBe('u:pen_up')
    expect(p.style.transform).toBe(t)
    await key(false, 0)
    await move(960, 1080)
    expect(armImg(container)?.style.transform).toBe(DOWN)
    expect(penImg(container)).toBe(p)
    expect(p.style.transform).toBe(penCss({ x: 960, y: 1080 }))
    near(parsePen(p.style.transform), [27.6, 118.56, -45])
    expect(box(p)).toEqual(BOX)
    expect(p.getAttribute('src')).toBe('u:pen_up')
    await advance(300_000)
    expect(ids(jelly(container))).toEqual(['armWrap', 'u:body', 'u:rest', 'u:kb_up', 'u:pen_up'])
    expect(armImg(container)?.style.transform).toBe(REST)
    expect(p.style.transform).toBe(PEN_REST_CSS)
    expect(box(p)).toEqual(BOX)
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('토글 전환 (design.md §10.10 전환 — settings://changed, 다음 렌더부터, 상태기계 초기화 없음)', () => {
  it('TC-235: 켜짐 → 꺼짐 → 켜짐 즉시 전환 — 짝 이어짐(초기화 없음), kbFrames 1 ↔ 3·clickPress 재계산, 재조회·저장 없음 (v1.6 개정, CR-042)', async () => {
    vi.mocked(getSettings).mockResolvedValue(SETTINGS_ON)
    const { container } = await mount()
    const p = penImg(container) as HTMLImageElement
    const kb = kbImg(container)
    const j = jelly(container)
    // v1.6(CR-042): 켜짐 kbFrames 1(kbFrame 늘 0) → 꺼짐 첫 누름 kb_down_1. 초기화 없음은 짝으로 본다
    //   (꺼짐 첫 누름 = bounceSeq 2 → jellyWrap jelly. 초기화했다면 jellyWrap jellyAlt)
    const steps: Array<[() => Promise<void>, View]> = [
      [() => key(true, 1), ['u:pen_down_0', 'u:kb_up', 'jellyWrap jellyAlt', 'u:mouse_base']],
      [() => key(false, 0), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_base']],
      [() => setPenMode(false), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_base']],
      [() => key(true, 1), ['u:pen_up', 'u:kb_down_1', 'jellyWrap jelly', 'u:mouse_base']],
      [() => key(false, 0), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_base']],
      [() => key(true, 1), ['u:pen_up', 'u:kb_down_2', 'jellyWrap jellyAlt', 'u:mouse_base']],
      [() => key(false, 0), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_base']],
      [() => click('left', true), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_left']],
      [() => click('left', false), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_base']],
      [() => setPenMode(true), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_base']],
      [() => key(true, 1), ['u:pen_down_0', 'u:kb_up', 'jellyWrap jelly', 'u:mouse_base']],
      [() => key(false, 0), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_base']],
      [() => click('left', true), ['u:pen_down_0', 'u:kb_up', 'jellyWrap jellyAlt', 'u:mouse_left']],
      [() => click('left', false), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_base']],
    ]
    for (const [run, expected] of steps) {
      await run()
      expect(view(container)).toEqual(expected)
      expect(penImg(container)).toBe(p)
      expect(kbImg(container)).toBe(kb)
      expect(jelly(container)).toBe(j)
      expect(jelly(container).lastElementChild).toBe(p)
      expect(box(p)).toEqual(BOX)
      expect(p.style.transform).toBe(PEN_REST_CSS)
    }
    expect(onSettingsChanged).toHaveBeenCalledTimes(1)
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-236: 전환 중 눌린 클릭 — 켜짐에 누른 클릭은 꺼진 뒤 떼면 빠지고(새 재생 없음), 꺼짐에 누른 클릭은 켜진 뒤에도 누름이 아님, 다음 클릭부터 펜 누름', async () => {
    vi.mocked(getSettings).mockResolvedValue(SETTINGS_ON)
    const { container } = await mount()
    const p = penImg(container) as HTMLImageElement
    const j = jelly(container)
    const steps: Array<[() => Promise<void>, View]> = [
      [() => click('left', true), ['u:pen_down_0', 'u:kb_up', 'jellyWrap jellyAlt', 'u:mouse_left']], // v1.6(CR-042)
      [() => setPenMode(false), ['u:pen_up', 'u:kb_up', 'jellyWrap jellyAlt', 'u:mouse_left']],
      [() => click('left', false), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_base']],
      [() => click('left', true), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_left']],
      [() => setPenMode(true), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_left']],
      [() => click('left', false), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_base']],
      [() => click('left', true), ['u:pen_down_0', 'u:kb_up', 'jellyWrap jelly', 'u:mouse_left']],
      [() => click('left', false), ['u:pen_up', 'u:kb_up', 'jellyWrap', 'u:mouse_base']],
    ]
    for (const [run, expected] of steps) {
      await run()
      expect(view(container)).toEqual(expected)
      expect(penImg(container)).toBe(p)
      expect(jelly(container)).toBe(j)
      expect(box(p)).toEqual(BOX)
    }
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})
