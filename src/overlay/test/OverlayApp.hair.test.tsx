/**
 * 헤어(뒷머리) 파츠 TC — CR-037(R-30), 겹침 자리는 CR-051로 개정.
 * 근거: design.md §10.11(자리·그림·좌표·모션·없을 때·갱신·성능·회귀 ①~⑦), §1 출력, §2 [hair]·아래 문단, §7 hair 행,
 *   §8·§9(alt=""), §10.1 hair 행·표 아래 문단, design/components.md §3 HairLayer·.jellyWrap·MouseArm 행·DOM 구조·규칙 7,
 *   design/functions.md §5.3 HairLayer 렌더, contract v0.17 AssetSlot 'hair'(getAssetManifest·onAssetsChanged로 받음 —
 *   새 command·event·래퍼 없음), requirements R-30·§1 용어 주(CR-037)·§2 S-13.
 * CR-051(doc/000_프로젝트_확정사항.md 🔒 2026-09-26, CR 대장 CR-051): 겹침 아래→위 = 헤어 → 배경 → 뽀모도(인물·말풍선·
 *   시간 글자) → .jellyWrap[팔 → 본체 → 펜 손]. 헤어는 .canvas 첫 자식 .hairWrap(hair 있을 때만) 안에 있고, .hairWrap은
 *   .jellyWrap과 같은 motion 클래스(.jelly/.jellyAlt/.shiver)를 같은 커밋에 받는다. 배경·뽀모도는 두 래퍼 밖(고정).
 *   design.md는 아직 옛 구조(헤어 = .jellyWrap 첫 자식) — 설계 확인 필요로 보고됨.
 * 대상: src/overlay/components/HairLayer.tsx, src/overlay/index.tsx.
 * bridge mock(vi.mock 'bridge/commands'·'bridge/events') — 실제 Tauri API import 없음. 가짜 시계. 실제 sleep 없음.
 * 로케이터: 헤어 = img[src^="u:hair"], 헤어 래퍼 = .hairWrap. hair 등록 픽스처에서는 「.canvas 첫 자식 = 배경」 가정을 쓰지 않는다.
 * .jellyWrap 첫 자식은 헤어 유무와 무관(= .armWrap, 팔 없으면 몸통). 키보드 img = .jellyWrap 직계 마지막 .layer.
 * 시나리오: src/overlay/test/scenarios.md TC-238 ~ TC-246 (TC-241·TC-243~TC-246 CR-051 개정)
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
import HairLayer from '../components/HairLayer'
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
// CR-051: hairWrap(헤어 래퍼)·pomodoro(뽀모도 래퍼 — PomodoroLayer도 같은 모듈을 import) 추가
vi.mock('../overlay.module.css', () => ({
  default: {
    root: 'root',
    canvas: 'canvas',
    layer: 'layer',
    hand: 'hand',
    armWrap: 'armWrap',
    hairWrap: 'hairWrap',
    pomodoro: 'pomodoro',
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
/** contract v0.17 — 'hair'는 AssetSlot 값이라 캐스팅하지 않는다 */
const HAIR: AssetSlot = 'hair'
const penSlot = (key: string) => key as unknown as AssetSlot
const entry = (slot: AssetSlot, width = 900, height = 700, url = `u:${slotKey(slot)}`): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url,
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
const PEN_ENTRIES = [pen('pen_up'), pen('pen_down_0'), pen('pen_down_1'), pen('pen_key_space')]
const CANVAS = { width: 900, height: 700 }
/** hair 항목은 entries 맨 뒤 — 매니페스트 순서가 아니라 설계 자리(.canvas 첫 자식 .hairWrap — CR-051)로 그려지는지 본다 */
const HAIR_MANIFEST: AssetManifest = { canvas: CANVAS, entries: [...BASE_ENTRIES, ...PEN_ENTRIES, entry(HAIR)] }
const HAIR2_MANIFEST: AssetManifest = {
  canvas: CANVAS,
  entries: [...BASE_ENTRIES, ...PEN_ENTRIES, entry(HAIR, 900, 700, 'u:hair2')],
}
/** CR-051: 헤어 + 뽀모도 인물·말풍선(글자는 U-1로 함께 그려짐) — 헤어 → 배경 → 뽀모도 → .jellyWrap 순서 확인용 */
const HAIR_POMO_MANIFEST: AssetManifest = {
  canvas: CANVAS,
  entries: [...BASE_ENTRIES, ...PEN_ENTRIES, entry('pomo_char' as AssetSlot), entry('pomo_bubble' as AssetSlot), entry(HAIR)],
}
const NO_HAIR_MANIFEST: AssetManifest = { canvas: CANVAS, entries: [...BASE_ENTRIES, ...PEN_ENTRIES] }
const PLAIN_HAIR_MANIFEST: AssetManifest = { canvas: CANVAS, entries: [...BASE_ENTRIES, entry(HAIR)] }
const PLAIN_MANIFEST: AssetManifest = { canvas: CANVAS, entries: [...BASE_ENTRIES] }
const EMPTY_MANIFEST: AssetManifest = { canvas: CANVAS, entries: [] }

const MOUSE_OFF: MouseSettings = {
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
  penMode: false,
}
const SETTINGS_OFF: Settings = {
  ...DEFAULT_SETTINGS,
  scale: 1,
  idleSeconds: 300,
  overlay: { x: 100, y: 100, visible: true },
  mouse: MOUSE_OFF,
  autostart: false,
}
const SETTINGS_ON: Settings = { ...SETTINGS_OFF, mouse: { ...MOUSE_OFF, penMode: true } }
const SETTINGS_LOCKED: Settings = { ...SETTINGS_ON, positionLock: true }
const MONITORS: ScreenBounds[] = [{ x: 0, y: 0, width: 1920, height: 1080 }]
const ANCHOR: Point = { x: 520, y: 530 }
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
const key = (pressed: boolean, heldCount: number, special: SpecialKey | null = null, repeat?: boolean) =>
  emit(
    'keyboard',
    repeat === undefined
      ? { pressed, heldCount, special, ts: Date.now() }
      : { pressed, heldCount, special, repeat, ts: Date.now() },
  )
const move = (x: number, y: number) => emit('mouseMove', { x, y, ts: Date.now() })
const click = (button: 'left' | 'right', pressed: boolean) => emit('mouseButton', { button, pressed, ts: Date.now() })
const canvasOf = (c: HTMLElement) => c.querySelector('.canvas') as HTMLElement
const jelly = (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement
/** CR-051 헤어 래퍼(.canvas 첫 자식, hair 있을 때만) */
const hairWrapOf = (c: HTMLElement) => c.querySelector('.hairWrap') as HTMLElement | null
const hairImg = (c: HTMLElement) => c.querySelector('img[src^="u:hair"]') as HTMLImageElement | null
const bgImg = (c: HTMLElement) => c.querySelector('img[src="u:background"]') as HTMLImageElement
const penImg = (c: HTMLElement) => c.querySelector('img[src^="u:pen"]') as HTMLImageElement | null
const armImg = (c: HTMLElement) => c.querySelector('.armWrap img') as HTMLImageElement | null
const stateSrc = (c: HTMLElement) =>
  c.querySelector('.jellyWrap > img[src="u:idle"], .jellyWrap > img[src="u:rest"]')?.getAttribute('src') ?? ''
const kbImg = (c: HTMLElement) => {
  const layers = Array.from(jelly(c).children).filter(e => e.classList.contains('layer'))
  return layers[layers.length - 1] as HTMLImageElement
}
const ids = (el: Element) =>
  Array.from(el.children).map(ch => (ch.tagName === 'IMG' ? ch.getAttribute('src') : ch.classList[0]))
/** 애니메이션 클래스가 붙은 요소(문서 순서) — CR-051 뒤 허용 대상은 .hairWrap·.jellyWrap 두 개뿐 */
const animatedEls = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('.jelly, .jellyAlt, .shiver, .bounce, .bounceAlt'))
/** 움직이는 조상 — 배경·뽀모도는 이 중 어느 것도 조상(자신 포함)으로 가지면 안 된다 */
const MOVING = '.hairWrap, .jellyWrap, .jelly, .jellyAlt, .shiver'
/** 앞 요소가 뒤 요소보다 문서 순서상 먼저(= 아래에 그려짐) */
const inOrder = (els: Element[]) => {
  for (let i = 0; i < els.length - 1; i++) {
    expect(els[i].compareDocumentPosition(els[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  }
}
const loadedOnce = () => {
  for (const fn of [getSettings, getAssetManifest, getMonitors, getHandAnchor]) expect(fn).toHaveBeenCalledTimes(1)
  expect(legacyBounds).not.toHaveBeenCalled()
}
const noBridgeCall = () => {
  for (const fn of [getSettings, setSettings, getAssetManifest, getMonitors, getHandAnchor, onAssetsChanged])
    expect(fn).not.toHaveBeenCalled()
  expect(legacyBounds).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(SETTINGS_OFF)
  vi.mocked(getAssetManifest).mockResolvedValue(HAIR_MANIFEST)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue(ANCHOR)
  vi.mocked(setSettings).mockImplementation(async s => s)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('HairLayer (design/functions.md §5.3 HairLayer 렌더)', () => {
  it('TC-238: hair 항목이 있으면 img 1개 — src = hair url, class "layer" 하나, alt="", draggable=false, style 없음, 다른 슬롯은 그리지 않음', () => {
    const { container } = render(<HairLayer manifest={HAIR_MANIFEST} />)
    const all = container.querySelectorAll('img')
    expect(all).toHaveLength(1)
    const img = all[0]
    expect(container.firstElementChild).toBe(img)
    expect(img.getAttribute('src')).toBe('u:hair')
    expect(img.className).toBe('layer')
    expect(img.getAttribute('alt')).toBe('')
    expect(img.getAttribute('draggable')).toBe('false')
    expect(img.getAttribute('style')).toBeNull()
    expect(slotKey(HAIR)).toBe('hair')
    noBridgeCall()
  })

  it('TC-239: hair 항목이 없으면 null — 투명, 안내·오류·경고 없음', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    for (const m of [NO_HAIR_MANIFEST, PLAIN_MANIFEST, EMPTY_MANIFEST]) {
      const { container, unmount } = render(<HairLayer manifest={m} />)
      expect(container.innerHTML).toBe('')
      unmount()
    }
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    noBridgeCall()
  })

  it('TC-240: React.memo 기본 export — 같은 manifest면 같은 노드, 새 manifest면 같은 노드의 src 갱신, 비우면 사라지고 다시 등록되면 나타남', () => {
    expect((HairLayer as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'))
    const { container, rerender } = render(<HairLayer manifest={HAIR_MANIFEST} />)
    const img = container.querySelector('img') as HTMLImageElement
    rerender(<HairLayer manifest={HAIR_MANIFEST} />)
    expect(container.querySelector('img')).toBe(img)
    expect(img.getAttribute('src')).toBe('u:hair')
    rerender(<HairLayer manifest={HAIR2_MANIFEST} />)
    expect(container.querySelector('img')).toBe(img)
    expect(img.getAttribute('src')).toBe('u:hair2')
    rerender(<HairLayer manifest={NO_HAIR_MANIFEST} />)
    expect(container.innerHTML).toBe('')
    rerender(<HairLayer manifest={HAIR_MANIFEST} />)
    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('u:hair')
    noBridgeCall()
  })
})

describe('OverlayApp — 헤어 레이어 통합 (design.md §10.11 회귀 ①~⑦, CR-051 겹침 순서)', () => {
  it('TC-241: hair 등록 → .canvas 자식 [.hairWrap, 배경, (뽀모도), .jellyWrap], .hairWrap 자식 = 헤어 img 하나, 겹침 헤어 → 배경 → 뽀모도 → 팔 → 본체 → 펜 손 (CR-051)', async () => {
    // ① 뽀모도 없음
    let r = await mount()
    let c = r.container
    const cv = canvasOf(c)
    const j = jelly(c)
    const hw = hairWrapOf(c) as HTMLElement
    expect(ids(cv)).toEqual(['hairWrap', 'u:background', 'jellyWrap'])
    expect(c.querySelectorAll('.hairWrap')).toHaveLength(1)
    expect(cv.firstElementChild).toBe(hw)
    expect(hw.className).toBe('hairWrap')
    expect(ids(hw)).toEqual(['u:hair'])
    expect(ids(j)).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up', 'u:pen_up'])
    expect(c.querySelectorAll('img[src^="u:hair"]')).toHaveLength(1)
    const hair = hairImg(c) as HTMLImageElement
    expect(hair.parentElement).toBe(hw)
    expect(hair.className).toBe('layer')
    expect(hair.getAttribute('style')).toBeNull()
    expect(hair.getAttribute('alt')).toBe('')
    expect(hair.getAttribute('draggable')).toBe('false')
    expect(hair.closest('.jellyWrap')).toBeNull()
    expect(hair.closest('.armWrap')).toBeNull()
    expect(hair.closest('.canvas')).toBe(cv)
    const bg = bgImg(c)
    expect(bg.parentElement).toBe(cv)
    expect(bg.closest('.jellyWrap')).toBeNull()
    expect(bg.closest('.hairWrap')).toBeNull()
    const arm = c.querySelector('.armWrap') as HTMLElement
    const body = c.querySelector('.jellyWrap > img[src="u:body"]') as HTMLElement
    const hand = penImg(c) as HTMLElement
    expect(j.lastElementChild).toBe(hand)
    inOrder([hair, bg, arm, body, hand])
    loadedOnce()
    expect(onAssetsChanged).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
    cleanup()

    // ② 뽀모도 인물·말풍선 등록(글자는 U-1로 함께 그려짐) → 누름 1회
    vi.mocked(getAssetManifest).mockResolvedValue(HAIR_POMO_MANIFEST)
    r = await mount()
    c = r.container
    expect(ids(canvasOf(c))).toEqual(['hairWrap', 'u:background', 'pomodoro', 'jellyWrap'])
    const pomo = c.querySelector('.pomodoro') as HTMLElement
    expect(pomo.children).toHaveLength(3)
    expect(ids(pomo).slice(0, 2)).toEqual(['u:pomo_char', 'u:pomo_bubble'])
    const text = pomo.lastElementChild as HTMLElement
    expect(text.tagName).toBe('DIV')
    inOrder([
      hairImg(c) as HTMLElement,
      bgImg(c),
      c.querySelector('img[src="u:pomo_char"]') as HTMLElement,
      c.querySelector('img[src="u:pomo_bubble"]') as HTMLElement,
      text,
      c.querySelector('.armWrap') as HTMLElement,
      c.querySelector('.jellyWrap > img[src="u:body"]') as HTMLElement,
      penImg(c) as HTMLElement,
    ])
    await key(true, 1)
    expect(hairWrapOf(c)?.className).toBe('hairWrap jellyAlt')
    expect(jelly(c).className).toBe('jellyWrap jellyAlt')
    expect(c.querySelector('.pomodoro')).toBe(pomo)
    expect(pomo.className).toBe('pomodoro')
    expect(pomo.closest(MOVING)).toBeNull()
    expect(bgImg(c).closest(MOVING)).toBeNull()
    for (const fn of [getSettings, getAssetManifest, getMonitors, getHandAnchor]) expect(fn).toHaveBeenCalledTimes(2)
    expect(legacyBounds).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-242: hair 없음 → .jellyWrap 첫 자식 = .armWrap, 헤어 img 0개, 안내 없음(기존 기대 그대로)', async () => {
    vi.mocked(getAssetManifest).mockResolvedValue(NO_HAIR_MANIFEST)
    const { container } = await mount()
    const j = jelly(container)
    expect(ids(canvasOf(container))).toEqual(['u:background', 'jellyWrap'])
    expect(ids(j)).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up', 'u:pen_up'])
    expect(j.firstElementChild?.classList.contains('armWrap')).toBe(true)
    expect(container.querySelectorAll('img[src^="u:hair"]')).toHaveLength(0)
    expect(container.textContent).toBe('')
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-243: 키 누름·특수 키·이동·클릭·쉬는중 진입/깨어남·펜 모드 켬·위치 잠금 수신에도 헤어 img는 같은 노드·src·class, 같은 .hairWrap 안(속성 변경 기록 0건), .hairWrap class는 .jellyWrap class와 같은 motion (CR-051)', async () => {
    const { container } = await mount()
    const hair = hairImg(container) as HTMLImageElement
    const hw = hairWrapOf(container) as HTMLElement
    const records: MutationRecord[] = []
    const obs = new MutationObserver(rs => records.push(...rs))
    obs.observe(hair, { attributes: true })
    const same = () => {
      expect(hairImg(container)).toBe(hair)
      expect(container.querySelectorAll('img[src^="u:hair"]')).toHaveLength(1)
      expect(container.querySelectorAll('.hairWrap')).toHaveLength(1)
      expect(hairWrapOf(container)).toBe(hw)
      expect(canvasOf(container).firstElementChild).toBe(hw)
      expect(hw.children).toHaveLength(1)
      expect(hair.parentElement).toBe(hw)
      expect(hair.closest('.jellyWrap')).toBeNull()
      expect(hair.getAttribute('src')).toBe('u:hair')
      expect(hair.className).toBe('layer')
      expect(hair.getAttribute('style')).toBeNull()
      // 같은 motion — 두 래퍼가 같은 커밋에 같은 애니메이션 클래스(CR-051)
      expect(hw.className).toBe(jelly(container).className.replace('jellyWrap', 'hairWrap'))
    }
    same()
    await key(true, 1)
    expect(kbImg(container).getAttribute('src')).toBe('u:kb_down_1')
    expect(jelly(container).className).toBe('jellyWrap jellyAlt')
    expect(hw.className).toBe('hairWrap jellyAlt')
    same()
    await key(true, 2, 'space')
    expect(kbImg(container).getAttribute('src')).toBe('u:key_space')
    expect(jelly(container).className).toBe('jellyWrap jelly')
    same()
    await key(false, 1, 'space')
    expect(kbImg(container).getAttribute('src')).toBe('u:kb_down_2')
    same()
    await key(false, 0)
    expect(kbImg(container).getAttribute('src')).toBe('u:kb_up')
    expect(jelly(container).className).toBe('jellyWrap')
    same()
    await move(960, 0)
    same()
    await click('left', true)
    expect(armImg(container)?.getAttribute('src')).toBe('u:mouse_left')
    same()
    await click('left', false)
    expect(armImg(container)?.getAttribute('src')).toBe('u:mouse_base')
    same()
    await advance(300_000)
    expect(stateSrc(container)).toBe('u:rest')
    same()
    await key(true, 1)
    expect(stateSrc(container)).toBe('u:idle')
    expect(kbImg(container).getAttribute('src')).toBe('u:kb_down_0')
    expect(jelly(container).className).toBe('jellyWrap jellyAlt')
    same()
    await key(false, 0)
    same()
    await emit('settingsChanged', SETTINGS_ON)
    expect(penImg(container)?.getAttribute('src')).toBe('u:pen_up')
    expect(kbImg(container).getAttribute('src')).toBe('u:kb_up')
    same()
    await key(true, 1)
    expect(penImg(container)?.getAttribute('src')).toBe('u:pen_down_0') // v1.6(CR-042): 누름 그림 = pen_down_0 한 장
    expect(kbImg(container).getAttribute('src')).toBe('u:kb_up')
    expect(jelly(container).className).toBe('jellyWrap jelly')
    same()
    await key(false, 0)
    expect(penImg(container)?.getAttribute('src')).toBe('u:pen_up')
    same()
    await emit('settingsChanged', SETTINGS_LOCKED)
    same()
    records.push(...obs.takeRecords())
    obs.disconnect()
    expect(records).toHaveLength(0)
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-244: 젤리·부르르 중 헤어 img의 조상 .hairWrap이 .jellyWrap과 같은 motion 클래스, 배경 img는 두 래퍼 밖, 애니메이션 클래스는 두 래퍼에만 (CR-051)', async () => {
    const { container } = await mount()
    const cv = canvasOf(container)
    const j = jelly(container)
    const hw = hairWrapOf(container) as HTMLElement
    const hair = hairImg(container) as HTMLImageElement
    const bg = bgImg(container)
    const check = (anim: 'jelly' | 'jellyAlt' | 'shiver' | null) => {
      expect(jelly(container)).toBe(j)
      expect(hairWrapOf(container)).toBe(hw)
      expect(hair.parentElement).toBe(hw)
      expect(hair.closest('.jellyWrap')).toBeNull()
      expect(bg.parentElement).toBe(cv)
      expect(bg.closest('.jellyWrap')).toBeNull()
      expect(bg.closest('.hairWrap')).toBeNull()
      expect(j.className).toBe(anim ? `jellyWrap ${anim}` : 'jellyWrap')
      expect(hw.className).toBe(anim ? `hairWrap ${anim}` : 'hairWrap')
      for (const a of ['jelly', 'jellyAlt', 'shiver']) {
        expect(j.classList.contains(a)).toBe(a === anim)
        expect(hw.classList.contains(a)).toBe(a === anim)
        expect(hair.closest(`.${a}`)).toBe(a === anim ? hw : null)
        expect(bg.closest(`.${a}`)).toBeNull()
      }
      expect(hair.className).toBe('layer')
      expect(hair.getAttribute('style')).toBeNull()
      expect(bg.className).toBe('layer')
      expect(bg.getAttribute('style')).toBeNull()
      const moving = animatedEls(container)
      expect(moving).toHaveLength(anim ? 2 : 0)
      if (anim) {
        expect(moving[0]).toBe(hw)
        expect(moving[1]).toBe(j)
      }
    }
    await key(true, 1)
    check('jellyAlt')
    await key(true, 1, null, true)
    check('shiver')
    await key(false, 0)
    check(null)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-245: assets://changed로 헤어 추가·교체·비우기·재등록이 즉시 반영 — .hairWrap 생김·사라짐, .jellyWrap 자식 불변, 재조회 없음, 다른 노드 유지 (CR-051)', async () => {
    vi.mocked(getAssetManifest).mockResolvedValue(NO_HAIR_MANIFEST)
    const { container } = await mount()
    const cv = canvasOf(container)
    const j = jelly(container)
    const arm = container.querySelector('.armWrap') as HTMLElement
    const bg = bgImg(container)
    const stable = () => {
      expect(canvasOf(container)).toBe(cv)
      expect(jelly(container)).toBe(j)
      expect(container.querySelector('.armWrap')).toBe(arm)
      expect(bgImg(container)).toBe(bg)
      expect(j.firstElementChild).toBe(arm)
      expect(ids(j)).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up', 'u:pen_up'])
    }
    expect(hairImg(container)).toBeNull()
    expect(hairWrapOf(container)).toBeNull()
    expect(ids(cv)).toEqual(['u:background', 'jellyWrap'])
    stable()
    // 추가
    await emit('assetsChanged', HAIR_MANIFEST)
    const hw = hairWrapOf(container) as HTMLElement
    const hair = hairImg(container) as HTMLImageElement
    expect(hair.getAttribute('src')).toBe('u:hair')
    expect(ids(cv)).toEqual(['hairWrap', 'u:background', 'jellyWrap'])
    expect(ids(hw)).toEqual(['u:hair'])
    expect(hair.parentElement).toBe(hw)
    stable()
    // 교체
    await emit('assetsChanged', HAIR2_MANIFEST)
    expect(hairImg(container)).toBe(hair)
    expect(hair.getAttribute('src')).toBe('u:hair2')
    expect(hairWrapOf(container)).toBe(hw)
    expect(cv.firstElementChild).toBe(hw)
    stable()
    // 비우기
    await emit('assetsChanged', NO_HAIR_MANIFEST)
    expect(hairImg(container)).toBeNull()
    expect(container.querySelectorAll('.hairWrap')).toHaveLength(0)
    expect(ids(cv)).toEqual(['u:background', 'jellyWrap'])
    stable()
    // 재등록
    await emit('assetsChanged', HAIR_MANIFEST)
    expect(hairImg(container)?.getAttribute('src')).toBe('u:hair')
    expect(container.querySelectorAll('img[src^="u:hair"]')).toHaveLength(1)
    expect(container.querySelectorAll('.hairWrap')).toHaveLength(1)
    expect(cv.firstElementChild).toBe(hairWrapOf(container))
    expect(hairWrapOf(container)?.firstElementChild).toBe(hairImg(container))
    stable()
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
    expect(onAssetsChanged).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-246: settings.mouse = null·monitors = []여도 헤어 표시(.hairWrap), 팔이 없으면 .jellyWrap 첫 자식 = 몸통, 헤어도 없으면 .hairWrap 없음 (CR-051)', async () => {
    // ① mouse null + hair
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS_OFF, mouse: null })
    vi.mocked(getAssetManifest).mockResolvedValue(PLAIN_HAIR_MANIFEST)
    let r = await mount()
    expect(ids(canvasOf(r.container))).toEqual(['hairWrap', 'u:background', 'jellyWrap'])
    expect(ids(hairWrapOf(r.container) as HTMLElement)).toEqual(['u:hair'])
    expect(ids(jelly(r.container))).toEqual(['u:body', 'u:idle', 'u:kb_up'])
    await key(true, 1)
    expect(jelly(r.container).className).toBe('jellyWrap jellyAlt')
    expect(hairWrapOf(r.container)?.className).toBe('hairWrap jellyAlt')
    expect(hairWrapOf(r.container)?.firstElementChild?.getAttribute('src')).toBe('u:hair')
    expect(r.container.querySelectorAll('.armWrap')).toHaveLength(0)
    cleanup()
    // ② monitors [] + hair
    vi.mocked(getSettings).mockResolvedValue(SETTINGS_OFF)
    vi.mocked(getMonitors).mockResolvedValue([])
    r = await mount()
    expect(ids(canvasOf(r.container))).toEqual(['hairWrap', 'u:background', 'jellyWrap'])
    expect(ids(jelly(r.container))).toEqual(['u:body', 'u:idle', 'u:kb_up'])
    expect(r.container.querySelectorAll('.armWrap')).toHaveLength(0)
    cleanup()
    // ③ mouse null + hair 없음
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS_OFF, mouse: null })
    vi.mocked(getMonitors).mockResolvedValue(MONITORS)
    vi.mocked(getAssetManifest).mockResolvedValue(PLAIN_MANIFEST)
    r = await mount()
    expect(ids(canvasOf(r.container))).toEqual(['u:background', 'jellyWrap'])
    expect(ids(jelly(r.container))).toEqual(['u:body', 'u:idle', 'u:kb_up'])
    expect(jelly(r.container).firstElementChild?.getAttribute('src')).toBe('u:body')
    expect(r.container.querySelectorAll('img[src^="u:hair"]')).toHaveLength(0)
    expect(r.container.querySelectorAll('.hairWrap')).toHaveLength(0)
    expect(getAssetManifest).toHaveBeenCalledTimes(3)
    expect(getSettings).toHaveBeenCalledTimes(3)
    expect(setSettings).not.toHaveBeenCalled()
  })
})
