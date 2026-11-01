/**
 * 키 그림 최소 유지 화면 통합 TC — CR-072(R-42 신설, 🔒 2026-11-01 key-hold). 대상: src/overlay/index.tsx(OverlayApp) + state/keyHold.ts
 * 규칙: 키를 눌러 바뀐 키보드 그림(일반 kb_down_N·특수 key_*, 펜 모드의 펜 손 pen_down_0)을 빨리 떼도 「누른 시점부터
 *   keyHoldMs」까지 보인 뒤 들림으로 돌린다. 유지 중 새 누름은 즉시 새 그림(유지는 새 누름 기준), 0이면 뗌 즉시(현행).
 *   특수 키 그림 중 팔·펜 손 숨김(CR-071)·젤리(CR-066)도 보이는 그림을 따르고, 클릭 파츠·부르르·쉬는중은 입력 상태 그대로다.
 * 근거: 인계 패킷 doc/200_설계/architecture/key-hold-03-packet-ui.md §A.3 O1~O11, 전반 설계 key-hold-02-design.md §2.2~2.4.
 * 번호: 스펙 이름의 TC-nnn은 scenarios.md v2.11 정식 번호(TC-368~TC-378). 괄호 안 KH-A-nn은 옛 임시 번호, On은 패킷 표 번호.
 * 시각: 가짜 시계(setTimeout·setInterval·Date·performance). 시점은 T0 기준 오프셋(goto)으로 적고 경계(149 → 150)를 직접 단언한다.
 * 로케이터: jsdom은 CSS를 적용하지 않으므로 「보임」은 <img src>·클래스 문자열로 단언한다(OverlayApp.restOnly 선례).
 * bridge 는 mock. 실제 Tauri API import 없음.
 * 시나리오: src/overlay/test/scenarios.md v2.11 「CR-072 키 그림 최소 유지」 절(대기열 Q-10 → 전환됨)
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  getAssetManifest,
  getHandAnchor,
  getMonitors,
  getSettings,
  setResting,
  setSettings,
  slotKey,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type MouseSettings,
  type ScreenBounds,
  type Settings,
  type TimerSnapshot,
} from 'bridge'
import type { SpecialKey } from 'state/inputMachine'
import OverlayApp from '../index'

// ─── bridge·CSS mock ────────────────────────────────────────────────────
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
  setResting: vi.fn(),
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
    hairWrap: 'hairWrap',
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
const HOLD_MS = 150
const entry = (slot: AssetSlot, width = 900, height = 700): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url: `u:${slotKey(slot)}`,
})
const kbDown = (index: number) => entry({ kind: 'kb_down', index })
const penUp = entry('pen_up' as AssetSlot, 200, 150)
const penDown0 = entry({ kind: 'pen_down', index: 0 } as AssetSlot, 200, 150)
/** 모든 매니페스트의 바탕 — 몸통·대기를 둬서 키보드 레이어가 .jellyWrap 안 세 번째 img.layer가 되게 한다 */
const BASE = ['background', 'body', 'idle', 'kb_up', 'mouse_base', 'mouse_left', 'mouse_right']
const manifest = (...extra: AssetEntry[]): AssetManifest => ({
  canvas: { width: 900, height: 700 },
  entries: [...BASE.map(s => entry(s as AssetSlot)), ...extra],
})
const M_ONE = manifest(kbDown(0))
const M_TWO = manifest(kbDown(0), kbDown(1))
const M_HAIR = manifest(kbDown(0), entry('hair'))
const M_REST = manifest(kbDown(0), entry('rest'))
const M_ENTER = manifest(kbDown(0), entry('key_enter'), penUp)
const M_PEN = manifest(penUp, penDown0)
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
/** 이 스펙의 기본 픽스처는 유지 150(O4·O9는 값을 따로 준다) */
const SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  keyHoldMs: HOLD_MS,
  scale: 1,
  idleSeconds: 300,
  overlay: { x: 100, y: 100, visible: true },
  mouse: MOUSE,
  autostart: false,
}
const PEN_SETTINGS: Settings = { ...SETTINGS, mouse: { ...MOUSE, penMode: true } }
const MONITORS: ScreenBounds[] = [{ x: 0, y: 0, width: 1920, height: 1080 }]
const STOPPED: TimerSnapshot = { status: 'stopped', elapsedMs: 0 }

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
/** 가짜 시계를 T0 + ms 로 맞춘다(이미 지났으면 그대로) */
const goto = (ms: number) => advance(Math.max(0, T0 + ms - Date.now()))
const key = (
  pressed: boolean,
  heldCount: number,
  special: SpecialKey | null = null,
  repeat = false,
) => emit('keyboard', { pressed, heldCount, special, repeat, ts: Date.now() })
const click = (pressed: boolean) => emit('mouseButton', { button: 'left', pressed, ts: Date.now() })
const move = (x: number, y: number) => emit('mouseMove', { x, y, ts: Date.now() })
const src = (el: Element | null | undefined) => el?.getAttribute('src')
const q = {
  canvas: (c: HTMLElement) => c.querySelector('.canvas') as HTMLElement,
  jelly: (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement,
  hairWrap: (c: HTMLElement) => c.querySelector('.hairWrap') as HTMLElement | null,
  /** 키보드 레이어 img = .jellyWrap 안 세 번째 img.layer(몸통·상태·키보드 순) */
  kb: (c: HTMLElement) => q.jelly(c).querySelectorAll('img.layer')[2] as HTMLImageElement,
  armImg: (c: HTMLElement) => c.querySelector('.armWrap > img.hand') as HTMLImageElement | null,
  /** 펜 손 = .jellyWrap 직계 img.hand(래퍼 없음) */
  pen: (c: HTMLElement) => c.querySelector('.jellyWrap > img.hand') as HTMLImageElement | null,
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date', 'performance'],
  })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(M_ONE)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue({ x: 520, y: 530 })
  vi.mocked(setSettings).mockImplementation(async s => s)
  vi.mocked(setResting).mockResolvedValue(STOPPED)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('OverlayApp 키 그림 최소 유지 (R-42, design.md §10.18)', () => {
  it('TC-368 (KH-A-12·O1): kb_down_0 — 80ms 누름은 150ms까지 눌린 그림을 유지하고 150ms에 kb_up으로 돌아온다(149 → 150 경계)', async () => {
    const { container } = await mount()
    expect(src(q.kb(container))).toBe('u:kb_up')

    await key(true, 1)
    expect(src(q.kb(container))).toBe('u:kb_down_0')
    await goto(80)
    await key(false, 0)
    expect(src(q.kb(container))).toBe('u:kb_down_0') // 뗐지만 유지 중
    await goto(149)
    expect(src(q.kb(container))).toBe('u:kb_down_0')
    await goto(150)
    expect(src(q.kb(container))).toBe('u:kb_up')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-369 (KH-A-13·O2): key_enter — Enter 30ms 누름은 149ms까지 key_enter·specialShown(팔·펜 손 숨김)을 유지하고(중간 마우스 이동은 만료 시각을 바꾸지 않는다) 150ms에 kb_up·마커 해제', async () => {
    vi.mocked(getAssetManifest).mockResolvedValue(M_ENTER)
    const { container } = await mount()
    const pen = q.pen(container)
    expect(pen).not.toBeNull()
    const base = vi.getTimerCount()

    await key(true, 1, 'enter')
    expect(src(q.kb(container))).toBe('u:key_enter')
    expect(q.canvas(container).className).toBe('canvas specialShown')
    await goto(30)
    await key(false, 0, 'enter')
    expect(src(q.kb(container))).toBe('u:key_enter') // 뗐지만 유지 중
    expect(q.canvas(container).className).toBe('canvas specialShown')

    await goto(100)
    await move(1900, 1070)
    expect(vi.getTimerCount()).toBe(base + 1) // 유지 타이머는 그대로 1개
    await goto(149)
    expect(src(q.kb(container))).toBe('u:key_enter')
    expect(q.canvas(container).className).toBe('canvas specialShown')
    expect(pen?.closest('.specialShown')).toBe(q.canvas(container))
    expect(q.armImg(container)?.closest('.specialShown')).toBe(q.canvas(container))

    await goto(150)
    expect(src(q.kb(container))).toBe('u:kb_up')
    expect(q.canvas(container).className).toBe('canvas')
    expect(pen?.closest('.specialShown')).toBeNull()
    expect(q.pen(container)).toBe(pen) // 같은 노드 — 숨김은 CSS뿐
    expect(vi.getTimerCount()).toBe(base)
  })

  it('TC-370 (KH-A-14·O3): 유지 중 새 누름은 즉시 새 프레임이고 유지는 새 누름 기준이다(a 0ms → b 100ms → 250ms에 kb_up)', async () => {
    vi.mocked(getAssetManifest).mockResolvedValue(M_TWO)
    const { container } = await mount()
    const base = vi.getTimerCount()

    await key(true, 1) // a
    expect(src(q.kb(container))).toBe('u:kb_down_1')
    await goto(40)
    await key(false, 0)
    expect(src(q.kb(container))).toBe('u:kb_down_1') // 유지 중

    await goto(100)
    await key(true, 1) // b — 즉시 다음 프레임
    expect(src(q.kb(container))).toBe('u:kb_down_0')
    expect(vi.getTimerCount()).toBe(base + 1) // a의 유지 타이머는 b의 것으로 교체됐다
    await goto(120)
    await key(false, 0)
    expect(src(q.kb(container))).toBe('u:kb_down_0')

    await goto(150) // a 기준이었다면 여기서 끝난다
    expect(src(q.kb(container))).toBe('u:kb_down_0')
    await goto(249)
    expect(src(q.kb(container))).toBe('u:kb_down_0')
    await goto(250)
    expect(src(q.kb(container))).toBe('u:kb_up')
    expect(vi.getTimerCount()).toBe(base)
  })

  it('TC-371 (KH-A-15·O4): keyHoldMs 0 — 뗌과 같은 커밋에 kb_up(현행)이고 유지 타이머를 만들지 않는다', async () => {
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS, keyHoldMs: 0 })
    const { container } = await mount()
    const base = vi.getTimerCount()

    await key(true, 1)
    expect(src(q.kb(container))).toBe('u:kb_down_0')
    expect(vi.getTimerCount()).toBe(base)
    await goto(30)
    await key(false, 0)
    expect(src(q.kb(container))).toBe('u:kb_up')
    expect(vi.getTimerCount()).toBe(base)
  })

  it('TC-372 (KH-A-16·O5): 400ms 꾹 누름 — 150ms에 유지가 끝나도 눌린 그림은 그대로(src 변경 0건), 뗌 즉시 kb_up', async () => {
    const { container } = await mount()
    await key(true, 1)
    const img = q.kb(container)
    const srcChanges: MutationRecord[] = []
    const mo = new MutationObserver(records => srcChanges.push(...records))
    mo.observe(img, { attributes: true, attributeFilter: ['src'] })

    for (const ms of [149, 150, 399]) {
      await goto(ms)
      expect(src(img), `t0+${ms}`).toBe('u:kb_down_0')
    }
    await flush()
    expect(srcChanges).toHaveLength(0)

    await goto(400)
    await key(false, 0)
    await flush()
    expect(q.kb(container)).toBe(img)
    expect(src(img)).toBe('u:kb_up')
    expect(srcChanges).toHaveLength(1) // 대조군: 관찰자는 동작하고, src는 뗌에서 한 번만 바뀐다
    mo.disconnect()
  })

  it('TC-373 (KH-A-17·O6): 젤리 — 80ms 누름은 149ms까지 jelly 계열 클래스를 유지(.hairWrap도 같은 모양)하고 150ms에 기본 클래스만 남는다(D-4)', async () => {
    vi.mocked(getAssetManifest).mockResolvedValue(M_HAIR)
    const { container } = await mount()
    expect(q.jelly(container).className).toBe('jellyWrap')
    expect(q.hairWrap(container)?.className).toBe('hairWrap')

    await key(true, 1)
    const anim = q.jelly(container).className
    expect(anim).toMatch(/^jellyWrap (jelly|jellyAlt)$/)
    await goto(80)
    await key(false, 0)

    for (const ms of [80, 149]) {
      await goto(ms)
      expect(q.jelly(container).className, `t0+${ms}`).toBe(anim)
      expect(q.hairWrap(container)?.className, `t0+${ms}`).toBe(
        anim.replace('jellyWrap', 'hairWrap'),
      )
    }
    await goto(150)
    expect(q.jelly(container).className).toBe('jellyWrap')
    expect(q.hairWrap(container)?.className).toBe('hairWrap')
  })

  it('TC-374 (KH-A-18·O7): 펜 모드 — 키 50ms 누름·왼 클릭 50ms 누름 모두 149ms까지 pen_down_0, 150ms에 pen_up. 클릭 파츠(mouse_left)는 뗌 즉시 mouse_base(D-5)', async () => {
    vi.mocked(getSettings).mockResolvedValue(PEN_SETTINGS)
    vi.mocked(getAssetManifest).mockResolvedValue(M_PEN)
    const { container } = await mount()
    const pen = q.pen(container)
    expect(src(pen)).toBe('u:pen_up')
    expect(src(q.armImg(container))).toBe('u:mouse_base')

    // 키: t0 누름 → +50 뗌
    await key(true, 1)
    expect(src(pen)).toBe('u:pen_down_0')
    expect(src(q.kb(container))).toBe('u:kb_up') // 펜 모드 키보드 레이어는 kb_up 고정(CR-042)
    await goto(50)
    await key(false, 0)
    expect(src(pen), '키 뗌 직후').toBe('u:pen_down_0')
    await goto(149)
    expect(src(pen), '키 t0+149').toBe('u:pen_down_0')
    await goto(150)
    expect(src(pen), '키 t0+150').toBe('u:pen_up')

    // 왼 클릭: t0+200 누름 → +250 뗌
    await goto(200)
    await click(true)
    expect(src(pen)).toBe('u:pen_down_0')
    expect(src(q.armImg(container))).toBe('u:mouse_left')
    await goto(250)
    await click(false)
    expect(src(q.armImg(container)), '클릭 파츠 뗌 직후').toBe('u:mouse_base')
    expect(src(pen), '클릭 뗌 직후').toBe('u:pen_down_0')
    await goto(349)
    expect(src(pen), '클릭 t0+349').toBe('u:pen_down_0')
    expect(src(q.armImg(container))).toBe('u:mouse_base')
    await goto(350)
    expect(src(pen), '클릭 t0+350').toBe('u:pen_up')
    expect(q.pen(container)).toBe(pen)
  })

  it('TC-375 (KH-A-19·O8): 누름 → 뗌 직후 언마운트 — 남은 타이머 0, 이후 500ms를 흘려도 React 경고(console.error) 0회', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { unmount } = await mount()
    const base = vi.getTimerCount()

    await key(true, 1)
    await key(false, 0)
    expect(vi.getTimerCount()).toBe(base + 1) // 유지 타이머 1개

    unmount()
    expect(vi.getTimerCount()).toBe(0)
    await advance(500)
    expect(errors).not.toHaveBeenCalled()
  })

  it('TC-376 (KH-A-20·O9): 유지 중 settings://changed로 keyHoldMs 0 — 진행 중 유지는 원래 시각(150ms)까지, 그 뒤 누름·뗌은 즉시 kb_up(A-4)', async () => {
    const { container } = await mount()
    await key(true, 1)
    await goto(30)
    await key(false, 0)
    await goto(50)
    await emit('settingsChanged', { ...SETTINGS, keyHoldMs: 0 })
    expect(src(q.kb(container))).toBe('u:kb_down_0') // 바뀐 값은 진행 중 유지를 건드리지 않는다
    await goto(149)
    expect(src(q.kb(container))).toBe('u:kb_down_0')
    await goto(150)
    expect(src(q.kb(container))).toBe('u:kb_up')

    await key(true, 1)
    expect(src(q.kb(container))).toBe('u:kb_down_0')
    await key(false, 0)
    expect(src(q.kb(container))).toBe('u:kb_up') // 새 값 0 — 뗌 즉시
  })

  it('TC-377 (KH-A-21·O10): 자동 반복 — 반복 중 shiver, 뗀 뒤 유지 동안 눌린 그림은 남지만 부르르로 대체된 젤리는 되살아나지 않는다(R-24)', async () => {
    const { container } = await mount()
    await key(true, 1)
    expect(q.jelly(container).className).toMatch(/^jellyWrap (jelly|jellyAlt)$/)
    for (const ms of [30, 60, 90]) {
      await goto(ms)
      await key(true, 1, null, true)
      expect(q.jelly(container).className, `반복 t0+${ms}`).toBe('jellyWrap shiver')
    }

    await goto(120)
    await key(false, 0)
    expect(src(q.kb(container))).toBe('u:kb_down_0') // 유지 중
    expect(q.jelly(container).className).toBe('jellyWrap')
    await goto(149)
    expect(src(q.kb(container))).toBe('u:kb_down_0')
    expect(q.jelly(container).className).toBe('jellyWrap')
    await goto(150)
    expect(src(q.kb(container))).toBe('u:kb_up')
    expect(container.querySelectorAll('.jelly, .jellyAlt, .shiver')).toHaveLength(0)
  })

  it('TC-378 (KH-A-22·O11): 쉬는중 — 유지 150ms 뒤 kb_up, 61초에 restOnly(R-41 불변), 그 사이 남는 유지 타이머 없음', async () => {
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS, idleSeconds: 60 })
    vi.mocked(getAssetManifest).mockResolvedValue(M_REST)
    const { container } = await mount()
    const base = vi.getTimerCount()

    await key(true, 1)
    await goto(40)
    await key(false, 0)
    expect(vi.getTimerCount()).toBe(base + 1)
    await goto(150)
    expect(src(q.kb(container))).toBe('u:kb_up')
    expect(vi.getTimerCount()).toBe(base)

    await goto(61_000)
    expect(q.canvas(container).className).toBe('canvas restOnly')
    expect(src(q.kb(container))).toBe('u:kb_up')
    expect(vi.getTimerCount()).toBe(base)
    expect(vi.mocked(setResting).mock.calls).toEqual([[false], [true]])
  })
})
