/**
 * 키보드 모드 폴백 TC — CR-043(R-32 타자 입력 1 선택 강등). design.md §10.13(규칙 표 1~6행·바운스만·불변·회귀 ①~③),
 * design/functions.md §5.3 pickKeyboardEntry(§10.13이 5·6행을 덧붙임)·kbDownFrameCount·LayerStack 렌더.
 * 대상: src/overlay/components/LayerStack.tsx, src/overlay/index.tsx(OverlayApp)
 * bridge 는 mock(vi.mock 'bridge/commands'·'bridge/events'). 실제 Tauri API import 없음.
 * 시간은 가짜 시계(vi.useFakeTimers + setSystemTime). 실제 sleep 없음.
 * 로케이터: 오버레이는 접근성 이름이 없다(design.md §8·§9) → DOM 구조(.jellyWrap 직계 img.layer) + img src(매니페스트 url).
 * CR-043 소스 미적용(LayerStack.tsx +1줄 전)이면 TC-259(5행)·TC-261·TC-262가 red(누름 중 키보드 img 없음)인 것이 정상.
 * TC-260은 적용 전후 모두 Green.
 * 시나리오: src/overlay/test/scenarios.md TC-259 ~ TC-262 (v1.7)
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
import { createInitialState, type MachineState, type SpecialKey } from 'state/inputMachine'
import LayerStack, { kbDownFrameCount, pickKeyboardEntry, pickPenKeyboardEntry } from '../components/LayerStack'
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
const entry = (slot: AssetSlot, width = 900, height = 700): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url: `u:${slotKey(slot)}`,
})
const named = (s: string) => entry(s as AssetSlot)
const kbDown = (index: number) => entry({ kind: 'kb_down', index })
/** R-32 필수 2장(kb_up·mouse_base) + 몸통·대기·쉬는중·key_space. kb_down 하나도 없음, key_enter 미등록 */
const NO_DOWN: AssetManifest = {
  canvas: CANVAS,
  entries: ['body', 'idle', 'rest', 'kb_up', 'key_space', 'mouse_base'].map(s => named(s)),
}
/** NO_DOWN에서 kb_up까지 없음(§10.13 6행) */
const NO_DOWN_UP: AssetManifest = { ...NO_DOWN, entries: NO_DOWN.entries.filter(e => slotKey(e.slot) !== 'kb_up') }
const ONE_DOWN: AssetManifest = { ...NO_DOWN, entries: [...NO_DOWN.entries, kbDown(0)] }
const TWO_DOWN: AssetManifest = { ...NO_DOWN, entries: [...NO_DOWN.entries, kbDown(0), kbDown(1)] }
const EMPTY: AssetManifest = { canvas: null, entries: [] }

const m = (over: Partial<MachineState> = {}): MachineState => ({ ...createInitialState(0), ...over })
const down = (specialHeld: SpecialKey[] = [], kbFrame = 0, over: Partial<MachineState> = {}): MachineState =>
  m({ kbDown: true, heldCount: Math.max(1, specialHeld.length), kbFrame, specialHeld, bounceSeq: 1, ...over })

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
  penMode: false, // 키보드 모드(펜 손 사용 꺼짐) — §10.13 적용 조건
}
const SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  scale: 1,
  idleSeconds: 300,
  overlay: { x: 100, y: 100, visible: true },
  mouse: MOUSE,
  autostart: false,
}
const MONITORS: ScreenBounds[] = [{ x: 0, y: 0, width: 1920, height: 1080 }]
const ANCHOR: Point = { x: 520, y: 530 }

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
/** repeat 인자를 주면 bridge `KeyboardInputEvent.repeat` 필드를 넣는다(없으면 필드 자체 없음) */
const key = (pressed: boolean, heldCount: number, special: SpecialKey | null = null, repeat?: boolean) =>
  emit(
    'keyboard',
    repeat === undefined
      ? { pressed, heldCount, special, ts: Date.now() }
      : { pressed, heldCount, special, repeat, ts: Date.now() },
  )
const assets = async (mf: AssetManifest) => {
  await emit('assetsChanged', mf)
  await flush()
}
const jellyWrap = (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement
/** .jellyWrap 직계 레이어 img(몸통·상태·키보드 — class layer), 아래 → 위 순서 */
const layerImgs = (c: HTMLElement) =>
  Array.from(jellyWrap(c).children).filter(
    el => el.tagName === 'IMG' && el.classList.contains('layer'),
  ) as HTMLImageElement[]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(NO_DOWN)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue(ANCHOR)
  vi.mocked(setSettings).mockImplementation(async s => s)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('pickKeyboardEntry·kbDownFrameCount — kb_down 없음 (design.md §10.13 회귀 ①②)', () => {
  it('TC-259: pickKeyboardEntry — kb_down 없음이면 누름·반복·그림 없는 특수 키 모두 kb_up, key_* 있으면 key_*, kb_up도 없으면 undefined (§10.13 1~6행)', () => {
    const kbUp = NO_DOWN.entries.find(e => slotKey(e.slot) === 'kb_up')
    // 1행: 누름 아님 → kb_up
    expect(pickKeyboardEntry(NO_DOWN, m())).toBe(kbUp)
    // 2행: 가장 최근 특수 키 그림 등록 → key_*
    expect(pickKeyboardEntry(NO_DOWN, down(['space']))?.url).toBe('u:key_space')
    expect(pickKeyboardEntry(NO_DOWN, down(['enter', 'space']))?.url).toBe('u:key_space')
    // 3·4행(불변): kb_down[kbFrame] → kb_down[0]
    expect(pickKeyboardEntry(TWO_DOWN, down([], 1))?.url).toBe('u:kb_down_1')
    expect(pickKeyboardEntry(ONE_DOWN, down([], 1))?.url).toBe('u:kb_down_0')
    expect(pickKeyboardEntry(ONE_DOWN, down(['enter']))?.url).toBe('u:kb_down_0')
    // 5행(신규, CR-043): 2·3·4 모두 없음 → kb_up(findEntry 결과와 같은 참조)
    const fallback: MachineState[] = [
      down(),
      down([], 1),
      down([], 2),
      down(['enter']),
      down(['z']),
      down(['question']),
      down(['backspace']),
      down(['space', 'enter']), // 가장 최근(enter) 그림 없음 → 이전 특수 키(space)가 아니라 kb_up
      down(['z'], 0, { repeating: true }),
    ]
    for (const s of fallback) expect(pickKeyboardEntry(NO_DOWN, s)).toBe(kbUp)
    // 6행: kb_up도 없음 → undefined(오류 없음)
    expect(pickKeyboardEntry(NO_DOWN_UP, m())).toBeUndefined()
    expect(pickKeyboardEntry(NO_DOWN_UP, down())).toBeUndefined()
    expect(pickKeyboardEntry(NO_DOWN_UP, down(['enter']))).toBeUndefined()
    expect(pickKeyboardEntry(NO_DOWN_UP, down(['space']))?.url).toBe('u:key_space')
    expect(pickKeyboardEntry(EMPTY, m())).toBeUndefined()
    expect(pickKeyboardEntry(EMPTY, down())).toBeUndefined()
    // 시그니처 불변(manifest, machine)
    expect(pickKeyboardEntry.length).toBe(2)
    // ⓒ 순수 함수 — bridge 호출 없음
    expect(getAssetManifest).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-260: kbDownFrameCount — 빈 매니페스트·kb_down 없음 → 1(kbFrame 0 고정), 1장 → 1, 2장 → 2', () => {
    expect(kbDownFrameCount(EMPTY)).toBe(1)
    expect(kbDownFrameCount(NO_DOWN)).toBe(1)
    expect(kbDownFrameCount(ONE_DOWN)).toBe(1)
    expect(kbDownFrameCount(TWO_DOWN)).toBe(2)
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('LayerStack 렌더 — kb_down 없음 (design.md §10.13 바운스만·불변)', () => {
  it('TC-261: LayerStack(penMode false) — 누름·반복·그림 없는 특수 키에도 같은 키보드 img가 kb_up, key_space도 같은 img, kb_up도 없으면 키보드 img 없음 / 펜 모드 결과 불변', () => {
    const { container, rerender } = render(<LayerStack penMode={false} manifest={NO_DOWN} machine={m()} />)
    const imgs = () => Array.from(container.querySelectorAll('img'))
    const kb = imgs()[2]
    const see = () => ({
      srcs: imgs().map(i => i.getAttribute('src')),
      classes: imgs().map(i => i.className),
      same: imgs()[2] === kb,
    })
    expect(see()).toEqual({ srcs: ['u:body', 'u:idle', 'u:kb_up'], classes: ['layer', 'layer', 'layer'], same: true })
    const cases: Array<[MachineState, string]> = [
      [down(), 'u:kb_up'],
      [down([], 1, { repeating: true }), 'u:kb_up'],
      [down(['space']), 'u:key_space'],
      [down(['enter']), 'u:kb_up'],
      [m(), 'u:kb_up'],
    ]
    for (const [s, src] of cases) {
      rerender(<LayerStack penMode={false} manifest={NO_DOWN} machine={s} />)
      expect(see()).toEqual({ srcs: ['u:body', 'u:idle', src], classes: ['layer', 'layer', 'layer'], same: true })
    }
    // 6행: kb_up도 없음 → 키보드 img 없음
    rerender(<LayerStack penMode={false} manifest={NO_DOWN_UP} machine={down()} />)
    expect(imgs().map(i => i.getAttribute('src'))).toEqual(['u:body', 'u:idle'])
    // 불변: 펜 모드는 pickPenKeyboardEntry 그대로
    for (const s of [m(), down(), down(['space']), down(['enter'])]) {
      rerender(<LayerStack penMode manifest={NO_DOWN} machine={s} />)
      expect(imgs()[2]?.getAttribute('src')).toBe(pickPenKeyboardEntry(NO_DOWN, s)?.url)
    }
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('OverlayApp — kb_down 없는 매니페스트, 키보드 모드 (design.md §10.13 회귀 ③)', () => {
  it('TC-262: 키 누름 → 같은 키보드 img가 kb_up + 젤리, 반복 → 부르르, key_space는 교체, 그림 없는 Enter는 kb_up, kb_down 등록·비움 즉시 반영, kb_up도 없으면 키보드 img 없음·안내 없음', async () => {
    const { container } = await mount()
    const kbImg = () => {
      const ls = layerImgs(container)
      return ls[ls.length - 1]
    }
    const see = () => ({
      srcs: layerImgs(container).map(i => i.getAttribute('src')),
      jelly: jellyWrap(container).className,
    })
    const at = (src: string, jelly: string) => ({ srcs: ['u:body', 'u:idle', src], jelly })
    const k0 = kbImg()
    expect(see()).toEqual(at('u:kb_up', 'jellyWrap'))

    // 1~9: NO_DOWN — 같은 키보드 img 노드 유지
    await key(true, 1)
    expect(see()).toEqual(at('u:kb_up', 'jellyWrap jellyAlt'))
    expect(kbImg()).toBe(k0)
    await key(false, 0)
    expect(see()).toEqual(at('u:kb_up', 'jellyWrap'))
    await key(true, 1)
    expect(see()).toEqual(at('u:kb_up', 'jellyWrap jelly'))
    await key(true, 1, null, true)
    expect(see()).toEqual(at('u:kb_up', 'jellyWrap shiver'))
    expect(kbImg()).toBe(k0)
    await key(false, 0)
    expect(see()).toEqual(at('u:kb_up', 'jellyWrap'))
    await key(true, 1, 'space')
    expect(see()).toEqual(at('u:key_space', 'jellyWrap jellyAlt'))
    expect(kbImg()).toBe(k0)
    await key(false, 0, 'space')
    expect(see()).toEqual(at('u:kb_up', 'jellyWrap'))
    await key(true, 1, 'enter')
    expect(see()).toEqual(at('u:kb_up', 'jellyWrap jelly'))
    expect(kbImg()).toBe(k0)
    await key(false, 0, 'enter')
    expect(see()).toEqual(at('u:kb_up', 'jellyWrap'))

    // 10: kb_down_0 등록 → 누름 kb_down_0(4행)
    await assets(ONE_DOWN)
    await key(true, 1)
    expect(see()).toEqual(at('u:kb_down_0', 'jellyWrap jellyAlt'))
    await key(false, 0)
    expect(see()).toEqual(at('u:kb_up', 'jellyWrap'))
    // 11: 다시 비움 → 누름 kb_up(5행)
    await assets(NO_DOWN)
    await key(true, 1)
    expect(see()).toEqual(at('u:kb_up', 'jellyWrap jelly'))
    await key(false, 0)
    expect(see()).toEqual(at('u:kb_up', 'jellyWrap'))
    // 12: kb_up까지 없음 → 키보드 img 없음(6행), 오류·안내 없음
    await assets(NO_DOWN_UP)
    expect(see()).toEqual({ srcs: ['u:body', 'u:idle'], jelly: 'jellyWrap' })
    await key(true, 1)
    expect(see()).toEqual({ srcs: ['u:body', 'u:idle'], jelly: 'jellyWrap jellyAlt' })
    await key(false, 0)
    expect(see()).toEqual({ srcs: ['u:body', 'u:idle'], jelly: 'jellyWrap' })
    expect(container.textContent).toBe('')

    // ⓒ bridge: 조회 각 1회(재조회 없음), 키보드·매니페스트 변경 핸들러 등록, 저장 요청 없음
    for (const fn of [getSettings, getAssetManifest, getMonitors, getHandAnchor]) {
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith()
    }
    expect(onKeyboard).toHaveBeenCalled()
    expect(onAssetsChanged).toHaveBeenCalled()
    expect(typeof h.handlers.keyboard).toBe('function')
    expect(setSettings).not.toHaveBeenCalled()
  })
})
