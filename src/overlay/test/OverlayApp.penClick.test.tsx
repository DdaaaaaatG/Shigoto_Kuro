/**
 * OverlayApp 펜 모드 클릭 누름 통합 TC — CR-027(R-26 펜 모드에서 마우스 클릭 = 키 누름 + 젤리) → CR-042(R-31) 개정.
 * 근거: design.md §6 P-4(CR-027)·§7 `input://mouse-button` 행(새 계약 없음)·§10.3 젤리 트리거(CR-027)·
 *   §10.8(적용 조건·규칙표 1~14·유지되는 것·젤리 길이·모드 전환·입력 비보관)·§10.12(손 = 누름 중 pen_down_0,
 *   특수 키 누름 중 키보드 key_*, config.kbFrames = 1), design/components.md §3 OverlayApp·PenHand 행(CR-027),
 *   design/functions.md §5.2 onMouseButton·§5.5 CR-042 pickPenEntry·pickPenKeyboardEntry.
 * bridge mock(vi.mock 'bridge/commands'·'bridge/events') — 실제 Tauri API import 없음. 가짜 시계. 실제 sleep 없음.
 * 픽스처는 OverlayApp.pen.test.tsx와 같다(PEN_MANIFEST — pen_up·pen_down_0 + 옛 파일 pen_down_1·pen_key_space,
 *   펜 모드 kbFrames 1(v1.6), penPos (389,492)). 입력 순서를 파일·스냅샷·로그로 남기지 않는다(R-22).
 * 시나리오: src/overlay/test/scenarios.md TC-214 ~ TC-221(v1.6 개정 — TC-219 불변)
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
const kbDown = (index: number) => entry({ kind: 'kb_down', index })
const CANVAS_SLOTS = ['background', 'body', 'idle', 'rest', 'kb_up', 'key_space']
const ARM_SLOTS = ['mouse_base', 'mouse_left', 'mouse_right']
const BASE_ENTRIES = [...[...CANVAS_SLOTS, ...ARM_SLOTS].map(s => entry(s as AssetSlot)), kbDown(0), kbDown(1), kbDown(2)]
const PEN_ENTRIES = [pen('pen_up'), pen('pen_down_0'), pen('pen_down_1'), pen('pen_key_space')]
/** 펜 모드: kbFrames = 1(v1.6 CR-042), clickPress = true. pen_down_1·pen_key_space는 옛 파일(읽지 않음) */
const PEN_MANIFEST: AssetManifest = { canvas: { width: 900, height: 700 }, entries: [...BASE_ENTRIES, ...PEN_ENTRIES] }
/** 펜 슬롯 없음: kbFrames = kb_down 3장, clickPress = false */
const NO_PEN: AssetManifest = { canvas: { width: 900, height: 700 }, entries: BASE_ENTRIES }
/** pen_up 없음 = 펜 모드 아님 */
const PARTIAL_PEN: AssetManifest = {
  canvas: { width: 900, height: 700 },
  entries: [...BASE_ENTRIES, pen('pen_down_0'), pen('pen_key_space')],
}
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
  penPos: { x: 389, y: 492 },
  penMode: true, // v1.4(CR-033): 토글 켜짐 전제 — NO_PEN·PARTIAL_PEN(TC-219·TC-220)은 켜짐이어도 pen_up이 없어 펜 모드 아님
} as MouseSettings
const SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  scale: 1,
  idleSeconds: 300,
  overlay: { x: 100, y: 100, visible: true },
  mouse: MOUSE_PEN,
  autostart: false,
}
const MONITORS: ScreenBounds[] = [{ x: 0, y: 0, width: 1920, height: 1080 }]
const ANCHOR: Point = { x: 520, y: 530 }
const REST = 'rotate(0deg) scaleX(1) rotate(0deg)'
const PEN_REST_CSS = 'translate(0px, 0px) rotate(0deg)'
const PEN_BOX = ['389px', '492px', '202px', '154px', '101px 77px']
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
const click = (button: 'left' | 'right', pressed: boolean) => emit('mouseButton', { button, pressed, ts: Date.now() })
const jelly = (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement
const penImg = (c: HTMLElement) => c.querySelector('img[src^="u:pen"]') as HTMLImageElement | null
const armImg = (c: HTMLElement) => c.querySelector('.armWrap img') as HTMLImageElement | null
/** 키보드 파츠 img = .jellyWrap 직계 자식 중 마지막 .layer */
const kbImg = (c: HTMLElement) => {
  const layers = Array.from(jelly(c).children).filter(e => e.classList.contains('layer'))
  return layers[layers.length - 1] as HTMLImageElement
}
const ids = (el: Element) =>
  Array.from(el.children).map(ch => (ch.tagName === 'IMG' ? ch.getAttribute('src') : ch.classList[0]))
const box = (i: HTMLImageElement) => [i.style.left, i.style.top, i.style.width, i.style.height, i.style.transformOrigin]
const loadedOnce = () => {
  for (const fn of [getSettings, getAssetManifest, getMonitors, getHandAnchor]) expect(fn).toHaveBeenCalledTimes(1)
  expect(legacyBounds).not.toHaveBeenCalled()
}
/**
 * 펜 모드 한 단계 관찰: 펜 손 같은 노드·src, .jellyWrap 같은 노드·class, 팔 그림 src,
 * 키보드 그림(v1.6 CR-042 — 기본 kb_up, 특수 키 누름 중에는 key_*), 애니메이션 클래스는 .jellyWrap에만,
 * 손 위치·크기·원점·변형 = 쉬는 자세 그대로, 옛 파일 그림(pen_down_1·pen_key_space) 없음.
 */
const penChecker = (c: HTMLElement) => {
  const j = jelly(c)
  const p = penImg(c) as HTMLImageElement
  const pose = p.style.transform
  return (penSrc: string, cls: string, armSrc: string, kbSrc = 'u:kb_up') => {
    expect(jelly(c)).toBe(j)
    expect(penImg(c)).toBe(p)
    expect(j.lastElementChild).toBe(p)
    expect(p.getAttribute('src')).toBe(penSrc)
    expect(p.className).toBe('hand')
    expect(j.className).toBe(cls)
    expect((armImg(c) as HTMLImageElement).getAttribute('src')).toBe(armSrc)
    expect(kbImg(c).getAttribute('src')).toBe(kbSrc)
    expect(kbImg(c).className).toBe('layer')
    expect(p.style.transform).toBe(pose)
    expect(box(p)).toEqual(PEN_BOX)
    expect(c.querySelectorAll('img[src="u:pen_down_1"], img[src="u:pen_key_space"]')).toHaveLength(0)
    const animated = c.querySelectorAll('.jelly, .jellyAlt, .shiver, .bounce, .bounceAlt')
    expect(Array.from(animated).every(e => e === j)).toBe(true)
  }
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

describe('펜 모드 클릭 = 누름 (design.md §10.8 규칙표 1·2·3·§10.12·§6 P-4(CR-027)·§7, design/components.md §3 OverlayApp)', () => {
  it('TC-214: 첫 클릭 → pen_down_0 + 젤리, 뗌 → pen_up·클래스 없음, 좌우 번갈아 짝 교대, 클릭 파츠 교체·kb_up·쉬는 자세 유지, 새 계약·로그 없음 (v1.6 개정, CR-042)', async () => {
    const { container } = await mount()
    const logs = (['log', 'info', 'debug'] as const).map(m => vi.spyOn(console, m).mockImplementation(() => undefined))
    const check = penChecker(container)
    check('u:pen_up', 'jellyWrap', 'u:mouse_base')
    expect((penImg(container) as HTMLImageElement).style.transform).toBe(PEN_REST_CSS)
    await click('left', true)
    check('u:pen_down_0', 'jellyWrap jellyAlt', 'u:mouse_left')
    await click('left', false)
    check('u:pen_up', 'jellyWrap', 'u:mouse_base')
    await click('left', true)
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_left')
    await click('left', false)
    check('u:pen_up', 'jellyWrap', 'u:mouse_base')
    await click('right', true)
    check('u:pen_down_0', 'jellyWrap jellyAlt', 'u:mouse_right')
    await click('right', false)
    check('u:pen_up', 'jellyWrap', 'u:mouse_base')
    expect((armImg(container) as HTMLImageElement).style.transform).toBe(REST)
    expect(container.querySelectorAll('.jelly, .jellyAlt, .shiver')).toHaveLength(0)
    expect(onMouseButton).toHaveBeenCalledTimes(1)
    for (const s of logs) expect(s).not.toHaveBeenCalled()
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('일반 키와 겹침 (design.md §10.8 규칙표 4~7)', () => {
  // CR-066: 키 누른 채 클릭·클릭 누른 채 키 모두 새 누름마다 젤리를 다시 시작한다(CR-027 「재생 없음」 대체)
  it('TC-215: 키 누른 채 클릭 → 재생(CR-066), 키만 뗌 → 유지, 버튼 뗌 → pen_up, 클릭 누른 채 키 → 재생(CR-066) — 손은 누름 중 pen_down_0 (v1.6 개정, CR-042)', async () => {
    const { container } = await mount()
    const check = penChecker(container)
    await key(true, 1)
    check('u:pen_down_0', 'jellyWrap jellyAlt', 'u:mouse_base')
    await click('left', true) // 4
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_left')
    await key(false, 0) // 5
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_left')
    await click('left', false) // 6
    check('u:pen_up', 'jellyWrap', 'u:mouse_base')
    await click('left', true) // 7
    check('u:pen_down_0', 'jellyWrap jellyAlt', 'u:mouse_left')
    await key(true, 1)
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_left')
    await key(false, 0)
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_left')
    await click('left', false)
    check('u:pen_up', 'jellyWrap', 'u:mouse_base')
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('특수 키와 겹침 양방향 (design.md §10.8 규칙표 8·9·10, §10.12 동작 표 10·11·12)', () => {
  // CR-066: 스페이스 누른 채 클릭도 새 누름 — 재생
  it('TC-216: 클릭 누른 채 스페이스 → 키보드 key_space + 재생, 스페이스 누른 채 클릭 → key_space 유지·재생(CR-066), 스페이스만 뗌 → 키보드 kb_up — 손은 누름 중 pen_down_0 (v1.6 개정, CR-042)', async () => {
    const { container } = await mount()
    const check = penChecker(container)
    await click('left', true)
    check('u:pen_down_0', 'jellyWrap jellyAlt', 'u:mouse_left')
    await key(true, 1, 'space') // 8
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_left', 'u:key_space')
    await key(false, 0, 'space')
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_left')
    await click('left', false)
    check('u:pen_up', 'jellyWrap', 'u:mouse_base')
    await key(true, 1, 'space')
    check('u:pen_down_0', 'jellyWrap jellyAlt', 'u:mouse_base', 'u:key_space')
    await click('left', true) // 9
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_left', 'u:key_space')
    await key(false, 0, 'space') // 10
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_left')
    await click('left', false)
    check('u:pen_up', 'jellyWrap', 'u:mouse_base')
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('부르르 비생성·유지 (design.md §10.8 규칙표 11·12)', () => {
  // CR-066: 부르르 중 새 클릭은 bounceSeq +1 — 부르르가 우선이고, 키를 떼면 새 번호 젤리가 산다
  it('TC-217: 부르르 중 클릭 → shiver 유지, 키 뗌 → 새 클릭의 젤리(CR-066), 클릭만 오래 눌러도 부르르 없음 — 손은 누름 중 pen_down_0 (v1.6 개정, CR-042)', async () => {
    const { container } = await mount()
    const check = penChecker(container)
    await key(true, 1)
    check('u:pen_down_0', 'jellyWrap jellyAlt', 'u:mouse_base')
    await keyRepeat(1)
    check('u:pen_down_0', 'jellyWrap shiver', 'u:mouse_base')
    await click('left', true) // 11
    check('u:pen_down_0', 'jellyWrap shiver', 'u:mouse_left')
    await key(false, 0) // 12
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_left')
    await click('left', false)
    check('u:pen_up', 'jellyWrap', 'u:mouse_base')
    await click('left', true)
    check('u:pen_down_0', 'jellyWrap jellyAlt', 'u:mouse_left')
    await click('left', true) // 같은 버튼 누름이 다시 와도(뗌 누락 방어) 변화 없음
    check('u:pen_down_0', 'jellyWrap jellyAlt', 'u:mouse_left')
    await act(async () => {
      vi.advanceTimersByTime(1_000)
    })
    check('u:pen_down_0', 'jellyWrap jellyAlt', 'u:mouse_left')
    await click('left', false)
    check('u:pen_up', 'jellyWrap', 'u:mouse_base')
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('좌·우 동시 누름에서 한쪽 뗌 (design.md §10.8 규칙표 13)', () => {
  // CR-066: 두 번째 버튼 누름도 새 누름 — 재생(짝 교대)
  it('TC-218: 두 번째 버튼 누름은 재생(CR-066), 두 버튼 중 하나만 떼면 누름 그림 pen_down_0·젤리 클래스 유지(클릭 파츠는 as-built대로 mouse_base), 둘 다 떼면 pen_up (v1.6 개정, CR-042)', async () => {
    const { container } = await mount()
    const check = penChecker(container)
    await click('left', true)
    check('u:pen_down_0', 'jellyWrap jellyAlt', 'u:mouse_left')
    await click('right', true)
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_right')
    await click('right', false)
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_base')
    await click('left', false)
    check('u:pen_up', 'jellyWrap', 'u:mouse_base')
    await click('right', true)
    check('u:pen_down_0', 'jellyWrap jellyAlt', 'u:mouse_right')
    await click('left', true)
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_left')
    await click('left', false)
    check('u:pen_down_0', 'jellyWrap jelly', 'u:mouse_base')
    await click('right', false)
    check('u:pen_up', 'jellyWrap', 'u:mouse_base')
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('펜 모드 아님 = 기존 동작 (design.md §10.8 적용 조건·규칙표 14, §10.10 config.clickPress)', () => {
  it('TC-219: pen_up 없으면 클릭은 클릭 파츠만 — 젤리·키보드 프레임 변화 없음, 버튼을 누른 채 첫 키 누름은 젤리', async () => {
    vi.mocked(getAssetManifest).mockResolvedValue(NO_PEN)
    const a = await mount()
    const ja = jelly(a.container)
    const obs = (cls: string, kb: string, arm: string) => {
      expect(jelly(a.container)).toBe(ja)
      expect(ja.className).toBe(cls)
      expect(kbImg(a.container).getAttribute('src')).toBe(kb)
      expect((armImg(a.container) as HTMLImageElement).getAttribute('src')).toBe(arm)
      expect(penImg(a.container)).toBeNull()
    }
    await click('left', true)
    obs('jellyWrap', 'u:kb_up', 'u:mouse_left')
    await click('right', true)
    obs('jellyWrap', 'u:kb_up', 'u:mouse_right')
    await key(true, 1)
    obs('jellyWrap jellyAlt', 'u:kb_down_1', 'u:mouse_right')
    await key(false, 0)
    obs('jellyWrap', 'u:kb_up', 'u:mouse_right')
    await click('right', false)
    await click('left', false)
    obs('jellyWrap', 'u:kb_up', 'u:mouse_base')
    loadedOnce()
    a.unmount()

    vi.clearAllMocks()
    vi.mocked(getAssetManifest).mockResolvedValue(PARTIAL_PEN)
    const b = await mount()
    const jb = jelly(b.container)
    await click('left', true)
    expect(jb.className).toBe('jellyWrap')
    expect(kbImg(b.container).getAttribute('src')).toBe('u:kb_up')
    expect(penImg(b.container)).toBeNull()
    await click('left', false)
    expect(jb.className).toBe('jellyWrap')
    await key(true, 1)
    expect(jb.className).toBe('jellyWrap jellyAlt')
    expect(kbImg(b.container).getAttribute('src')).toBe('u:kb_down_1')
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('모드 전환 중 (design.md §10.8 모드 전환(수용))', () => {
  it('TC-220: 누른 채 펜 모드 꺼짐 → 손 사라짐·클래스 유지(새 재생 없음)·뗌에 해제, 누른 채 켜짐 → 떼기 전까지 누름 아님, 다음 누름부터 셈 (v1.6 개정, CR-042)', async () => {
    const { container } = await mount()
    const j = jelly(container)
    await click('left', true)
    expect((penImg(container) as HTMLImageElement).getAttribute('src')).toBe('u:pen_down_0')
    expect(j.className).toBe('jellyWrap jellyAlt')
    await emit('assetsChanged', NO_PEN)
    expect(penImg(container)).toBeNull()
    expect(jelly(container)).toBe(j)
    expect(j.className).toBe('jellyWrap jellyAlt')
    expect(kbImg(container).getAttribute('src')).toBe('u:kb_up')
    await click('left', false)
    expect(j.className).toBe('jellyWrap')
    await click('left', true)
    expect(j.className).toBe('jellyWrap')
    await emit('assetsChanged', PEN_MANIFEST)
    const p = penImg(container) as HTMLImageElement
    expect(p.getAttribute('src')).toBe('u:pen_up')
    expect(j.lastElementChild).toBe(p)
    expect(j.className).toBe('jellyWrap')
    await click('left', false)
    expect(p.getAttribute('src')).toBe('u:pen_up')
    expect(j.className).toBe('jellyWrap')
    await click('left', true)
    expect(p.getAttribute('src')).toBe('u:pen_down_0')
    expect(j.className).toBe('jellyWrap jelly')
    await click('left', false)
    expect(p.getAttribute('src')).toBe('u:pen_up')
    expect(j.className).toBe('jellyWrap')
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('쉬는중에서 펜 모드 클릭 (design.md §10.8 유지되는 것 — 유휴 판정·armAtRest, §6 P-3)', () => {
  it('TC-221: 5분 무입력 쉬는중 → 클릭 누름으로 대기·손 pen_down_0·젤리, 팔·손은 쉬는 자세 그대로 (v1.6 개정, CR-042)', async () => {
    const { container } = await mount()
    const j = jelly(container)
    await act(async () => {
      vi.advanceTimersByTime(300_000)
    })
    expect(ids(j)).toEqual(['armWrap', 'u:body', 'u:rest', 'u:kb_up', 'u:pen_up'])
    expect(j.className).toBe('jellyWrap')
    await click('left', true)
    expect(ids(j)).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up', 'u:pen_down_0'])
    expect(j.className).toBe('jellyWrap jellyAlt')
    const p = penImg(container) as HTMLImageElement
    expect(p.style.transform).toBe(PEN_REST_CSS)
    expect(box(p)).toEqual(PEN_BOX)
    expect((armImg(container) as HTMLImageElement).style.transform).toBe(REST)
    expect((armImg(container) as HTMLImageElement).getAttribute('src')).toBe('u:mouse_left')
    await click('left', false)
    expect(ids(j)).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up', 'u:pen_up'])
    expect(j.className).toBe('jellyWrap')
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})
