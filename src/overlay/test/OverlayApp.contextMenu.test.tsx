/**
 * OverlayApp — CR-062(R-40 오버레이 오른쪽 클릭 메뉴)의 ui 몫: WebView2 기본 메뉴 억제만.
 * design.md §10.16(16.1 마지막 행·「ui가 하지 않는 것」·16.3·16.4), §6 P-10 ①③, §7 창 기능(CR-062) 행,
 * design/functions.md §5.1 `preventContextMenu`, design/components.md §3 `OverlayApp` 행(CR-062), design/a11y.md 오른쪽 클릭.
 *
 * TDD Red: 구현 전(`.root`에 `onContextMenu` 없음)에는 fireEvent.contextMenu 반환값이 true라
 * TC-315 ①의 반환값·`defaultPrevented` 단언과 ②의 반환값 단언이 실패하는 것이 정상이다. 나머지 단언은 전후 모두 Green.
 * 메뉴 표시·판정(창 사각형·누름/뗌·숨김·전체 화면)·항목 동작은 core(tray·hook)라 흉내 내지 않는다 → 수동 MC-31~MC-45(TC-316~TC-330).
 * bridge 는 mock(vi.mock 'bridge/commands'·'bridge/events'). 실제 Tauri API import 없음.
 * 시간은 가짜 시계(vi.useFakeTimers + setSystemTime). 실제 sleep 없음.
 * 로케이터: 오버레이는 접근성 이름이 없다(design.md §8·§9) → DOM 구조(.root = container 첫 자식) + img src(매니페스트 url).
 * 시나리오: src/overlay/test/scenarios.md TC-315
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as commands from 'bridge/commands'
import * as events from 'bridge/events'
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
  type Point,
  type ScreenBounds,
  type Settings,
} from 'bridge'
import * as overlayModule from '../index'

/** default export = 화면 진입 컴포넌트. 같은 모듈 네임스페이스로 「preventContextMenu export 없음」도 본다 */
const OverlayApp = overlayModule.default

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
  getScreenBounds: vi.fn(), // 옛 command 감시용(scenarios §0.1) — 호출 0회여야 한다
  // CR-045·CR-050: 이 스펙은 타이머를 켜지 않지만 「bridge 호출 증가 0」을 모든 command로 세려고 mock 함수로 둔다
  getTimer: vi.fn(() => Promise.resolve({ status: 'stopped', elapsedMs: 0 })),
  setResting: vi.fn(() => Promise.resolve({ status: 'stopped', elapsedMs: 0 })),
  getAlarmSound: vi.fn(() => Promise.resolve(null)),
}))
vi.mock('bridge/events', () => ({
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
  onTimerChanged: vi.fn(h.subImpl('timer')),
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
    hairWrap: 'hairWrap',
    pomodoro: 'pomodoro',
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
/** R-27·R-32 필수(kb_up·kb_down_0·mouse_base) + 클릭 파츠 2장(R-09 — 오른쪽 클릭 파츠 교체 관찰용). 펜·헤어·뽀모도 없음 */
const MANIFEST: AssetManifest = {
  canvas: CANVAS,
  entries: [
    named('kb_up'),
    entry({ kind: 'kb_down', index: 0 }),
    named('mouse_base'),
    named('mouse_left'),
    named('mouse_right'),
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
  penMode: false, // 펜 모드 아님 — 오른쪽 클릭은 클릭 파츠만(R-09)
}
/** DEFAULT_SETTINGS 상속 — positionLock false(비잠금: WebView가 오른쪽 클릭을 받는 경로, P-10 ①), 타이머 꺼짐 */
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
const rightButton = (pressed: boolean) => emit('mouseButton', { button: 'right', pressed, ts: Date.now() })

/** bridge/commands·bridge/events 의 모든 mock 함수 호출 수(이름 → 수). 「bridge 호출 증가 0」 판정용 */
const callCounts = () => {
  const out: Record<string, number> = {}
  for (const [name, fn] of [...Object.entries(commands), ...Object.entries(events)]) {
    if (vi.isMockFunction(fn)) out[name] = fn.mock.calls.length
  }
  return out
}

const q = {
  root: (c: HTMLElement) => c.firstElementChild as HTMLElement,
  jelly: (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement,
  /** .jellyWrap 직계 레이어 img(몸통·상태·키보드 — class layer)의 src, 아래 → 위 순서 */
  layers: (c: HTMLElement) =>
    Array.from(q.jelly(c).children)
      .filter(el => el.tagName === 'IMG' && el.classList.contains('layer'))
      .map(el => el.getAttribute('src')),
  arm: (c: HTMLElement) => c.querySelector('.armWrap img') as HTMLImageElement | null,
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(MANIFEST)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue(ANCHOR)
  vi.mocked(setSettings).mockImplementation(async s => s)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('R-40 WebView2 기본 메뉴 억제 — .root onContextMenu = preventDefault 하나뿐 (design.md §10.16, design/functions.md §5.1)', () => {
  it('TC-315 ①: 투명한 자리(.root)·그림 위(키보드·팔 img)의 contextmenu → 기본 동작 취소(반환 false), 전파 유지, DOM·상태·포커스·bridge 호출 불변, 메뉴 요소 없음', async () => {
    const { container } = await mount()
    const root = q.root(container)
    // ⓐ 전제: 창 전체 조작 면 .root(끌기 속성 유지 — 16.3 불변)
    expect(root.className).toBe('root')
    expect(root.hasAttribute('data-tauri-drag-region')).toBe(true)
    const kbImg = container.querySelector('img[src="u:kb_up"]') as HTMLElement | null
    const armImg = q.arm(container)
    expect(kbImg).not.toBeNull()
    expect(armImg).not.toBeNull()

    const html0 = container.innerHTML
    const focus0 = document.activeElement
    const before = callCounts()
    const seenAtDocument: boolean[] = []
    const onDocument = (e: Event) => {
      seenAtDocument.push(e.defaultPrevented)
    }
    document.addEventListener('contextmenu', onDocument)
    try {
      // 투명한 모서리 = .root 자신
      expect(fireEvent.contextMenu(root)).toBe(false)
      // 그림 위 — 이벤트가 .root 까지 올라가 거기서 취소된다(핸들러는 .root 한 곳)
      expect(fireEvent.contextMenu(kbImg as HTMLElement)).toBe(false)
      expect(fireEvent.contextMenu(armImg as HTMLElement)).toBe(false)
    } finally {
      document.removeEventListener('contextmenu', onDocument)
    }
    await flush()

    // stopPropagation 없음: document 까지 3회 모두 도달, 도달 시점에 이미 취소됨
    expect(seenAtDocument).toEqual([true, true, true])
    // ⓐ 화면: 메뉴를 그리지 않음·문구 없음·DOM 그대로
    expect(container.innerHTML).toBe(html0)
    expect(container.querySelector('[role="menu"], [role="menuitem"]')).toBeNull()
    expect(container.textContent).toBe('')
    // ⓑ 상태: dispatch 없음(클릭 파츠·키보드·젤리 그대로), 포커스 이동 없음
    expect(q.arm(container)?.getAttribute('src')).toBe('u:mouse_base')
    expect(q.layers(container)).toEqual(['u:kb_up'])
    expect(q.jelly(container).className).toBe('jellyWrap')
    expect(document.activeElement).toBe(focus0)
    // ⓒ bridge: 모든 command·event 래퍼 호출 수 증가 0(setSettings 0회, 옛 getScreenBounds 0회)
    expect(callCounts()).toEqual(before)
    expect(setSettings).not.toHaveBeenCalled()
    expect(callCounts().getScreenBounds ?? 0).toBe(0) // 래퍼 존폐는 bridge 결정이라 이름 import 없이 센다(§0.1)
    // 모듈 수준 상수 — export 없음(design/functions.md §5.1)
    expect('preventContextMenu' in overlayModule).toBe(false)
  })

  it('TC-315 ②: 실제 순서(input://mouse-button 오른쪽 누름 → 뗌 → DOM contextmenu) — 클릭 파츠는 mouse_right → mouse_base, contextmenu는 억제만·이후 오른쪽 클릭도 그대로', async () => {
    const { container } = await mount()
    const root = q.root(container)
    const before = callCounts()

    await rightButton(true)
    expect(q.arm(container)?.getAttribute('src')).toBe('u:mouse_right')
    await rightButton(false)
    expect(q.arm(container)?.getAttribute('src')).toBe('u:mouse_base')
    const html = container.innerHTML

    // WebView 는 오른쪽 뗌 뒤에 contextmenu 를 보낸다(P-10 ①)
    expect(fireEvent.contextMenu(root)).toBe(false)
    await flush()
    expect(container.innerHTML).toBe(html)
    expect(q.arm(container)?.getAttribute('src')).toBe('u:mouse_base')

    // 다음 오른쪽 클릭도 기존 P-4 그대로(R-09)
    await rightButton(true)
    expect(q.arm(container)?.getAttribute('src')).toBe('u:mouse_right')
    await rightButton(false)
    expect(q.arm(container)?.getAttribute('src')).toBe('u:mouse_base')
    expect(q.layers(container)).toEqual(['u:kb_up'])
    expect(q.jelly(container).className).toBe('jellyWrap') // 펜 모드 아님 — 클릭 바운스 없음
    expect(container.textContent).toBe('')

    // ⓒ bridge: 구독·조회 추가 없음, 저장 없음(페이로드는 기존 input://mouse-button 만)
    expect(callCounts()).toEqual(before)
    expect(setSettings).not.toHaveBeenCalled()
  })
})
