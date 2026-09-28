/**
 * OverlayApp TC ② — 쉬는 위치·마우스·렌더 조건·배경·R-01
 * (design.md §2·§4 armAtRest·monitors·§6 P-1·P-3·P-4·P-6·§8·§10.1·§10.4, design/components.md 렌더 조건·배경 DOM 구조,
 *  design/functions.md §5.1 마우스 이동 핸들러·쉬는중 진입 효과·모니터 목록 로드·§5.4 MouseArm 렌더(한 모드), design/a11y.md).
 * CR-017: getMonitors()(옛 getScreenBounds 대체)·mouse.area(옛 pad 대체)·팔 변형 = rotate·scaleX·rotate.
 * CR-019: 쾅 폐기 — 슬롯·설정 slam 없음, TC-067의 6키 누름은 대기(상태 레이어 바운스 없음).
 * CR-022: 바운스 = .jellyWrap 하나의 젤리. .canvas 자식 = [배경(있을 때), .jellyWrap], .jellyWrap 자식 = [armWrap, 몸통, 상태, 키보드].
 *   키보드 img class 항상 layer, .armWrap 항상 armWrap, 배경은 .jellyWrap 밖(scenarios.md v0.9 개정표 TC-064·066·067·101).
 * bridge 는 mock. 시간은 가짜 시계. 시나리오: src/overlay/test/scenarios.md TC-059 ~ TC-068, TC-099, TC-101, TC-122, TC-124
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
import * as commands from 'bridge/commands'
import OverlayApp from '../index'
import { labels } from '../labels'

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
  // 옛 command 감시용(CR-017: 이 화면은 더 이상 부르지 않는다)
  getScreenBounds: vi.fn(),
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
// CR-022 mock 클래스(scenarios.md v0.9). bounce·bounceAlt는 잔존 감시용 — 소스가 쓰면 className에 드러난다
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
    bounce: 'bounce',
    bounceAlt: 'bounceAlt',
  },
}))

const T0 = 1_700_000_000_000
const CANVAS = { width: 900, height: 700 }
const entry = (slot: AssetSlot, width = 900, height = 700, url = `u:${slotKey(slot)}`): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url,
})
const SLOTS = ['background', 'body', 'idle', 'rest', 'kb_up'] // CR-019: 슬롯 slam 없음
const MOUSE_SLOTS = ['mouse_base', 'mouse_left', 'mouse_right']
const LAYER_MANIFEST: AssetManifest = {
  canvas: CANVAS,
  entries: [...[...SLOTS, ...MOUSE_SLOTS].map(s => entry(s as AssetSlot)), entry({ kind: 'kb_down', index: 0 })],
}
/** CR-015 작은 손 그림(202×154) — 나머지 항목은 LAYER_MANIFEST와 같다 */
const SMALL_MANIFEST: AssetManifest = {
  ...LAYER_MANIFEST,
  entries: LAYER_MANIFEST.entries.map(e =>
    MOUSE_SLOTS.includes(slotKey(e.slot)) ? { ...e, width: 202, height: 154 } : e,
  ),
}
const withoutBg = (m: AssetManifest): AssetManifest => ({
  ...m,
  entries: m.entries.filter(e => slotKey(e.slot) !== 'background'),
})
const withBgUrl = (m: AssetManifest, url: string): AssetManifest => ({
  ...m,
  entries: m.entries.map(e => (slotKey(e.slot) === 'background' ? { ...e, url } : e)),
})
// CR-015: partPos (0,0) + 900×700 파츠 = 이전 레이어 이동 모드와 같은 화면(기본값 389,492와 다름).
// CR-017: pad 삭제 → area = 중심 (520,530)의 200×200 직사각형.
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
  penPos: null, // bridge v0.13(CR-024) 필드 추가 — 픽스처 갱신
  penMode: false, // contract v0.15(CR-033) 기본값
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
/** 두 모니터: 위 WQHD 2560×1440, 아래 1080p 1920×1080(design/functions.md §5.4 예) */
const TWO_MONITORS: ScreenBounds[] = [
  { x: 0, y: 0, width: 2560, height: 1440 },
  { x: 320, y: 1440, width: 1920, height: 1080 },
]
// 변형 참조(scenarios.md §0.2) — 어깨 (620,530) · 기준점 (520,530) · 위 MOUSE.area
const REST = 'rotate(0deg) scaleX(1) rotate(0deg)'
const DOWN = 'rotate(135deg) scaleX(1.414) rotate(-180deg)' // 목표 (520,630)
const UP = 'rotate(-135deg) scaleX(1.414) rotate(-180deg)' // 목표 (520,430)
const CENTER = 'rotate(180deg) scaleX(1) rotate(-180deg)' // 목표 (520,530) = 기준점
const legacyBounds = (commands as unknown as Record<string, ReturnType<typeof vi.fn>>).getScreenBounds

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
const click = (button: 'left' | 'right', pressed: boolean) =>
  emit('mouseButton', { button, pressed, ts: Date.now() })
const q = {
  canvas: (c: HTMLElement) => c.querySelector('.canvas') as HTMLElement,
  jelly: (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement,
  img: (c: HTMLElement, src: string) => c.querySelector(`img[src="${src}"]`) as HTMLImageElement | null,
  arm: (c: HTMLElement) => c.querySelector('.armWrap img') as HTMLImageElement | null,
  wrap: (c: HTMLElement) => c.querySelector('.armWrap') as HTMLElement | null,
}
/** 인라인 배치(px 숫자) */
const box = (img: HTMLImageElement) => ({
  left: parseFloat(img.style.left),
  top: parseFloat(img.style.top),
  width: parseFloat(img.style.width),
  height: parseFloat(img.style.height),
})
/** 자식 순서 식별자: img는 src, 그 외는 첫 클래스 */
const ids = (el: Element) =>
  Array.from(el.children).map(ch => (ch.tagName === 'IMG' ? ch.getAttribute('src') : ch.className.split(' ')[0]))
/** .canvas 자식 순서(CR-022: [배경(있을 때), jellyWrap]) */
const order = (c: HTMLElement) => ids(q.canvas(c))
/** .jellyWrap 자식 순서(CR-022: [armWrap, 몸통, 상태, 키보드]) */
const inner = (c: HTMLElement) => ids(q.jelly(c))
const noCommandsAfterLoad = () => {
  for (const fn of [getSettings, getAssetManifest, getMonitors]) expect(fn).toHaveBeenCalledTimes(1)
  expect(legacyBounds).not.toHaveBeenCalled()
  expect(setSettings).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(LAYER_MANIFEST)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue({ x: 520, y: 530 })
  vi.mocked(setSettings).mockImplementation(async s => s)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('쉬는 위치 armAtRest (CR-009, R-11·R-15·R-21)', () => {
  it('TC-059: 앱 시작 직후(첫 마우스 이동 전) 팔은 REST_TRANSFORM(회전 0°·배율 1)', async () => {
    const { container } = await mount()
    expect(q.arm(container)?.style.transform).toBe(REST)
    expect(q.arm(container)?.style.transformOrigin).toBe('620px 530px')
    await advance(1_000)
    expect(q.arm(container)?.style.transform).toBe(REST)
    noCommandsAfterLoad()
  })

  it('TC-060: 마우스를 움직이면 커서 추종 재개 — 이벤트마다 변형 갱신', async () => {
    const { container } = await mount()
    await move(960, 1080)
    expect(q.arm(container)?.style.transform).toBe(DOWN)
    await move(960, 0)
    expect(q.arm(container)?.style.transform).toBe(UP)
    expect(q.img(container, 'u:kb_up')).not.toBeNull() // 전이표 행5: 키보드는 들림 그대로
    noCommandsAfterLoad()
  })

  it('TC-061: 쉬는중 진입 → 변형 없음, 키·클릭으로 깨어나도 유지, 다음 마우스 이동에서 추종', async () => {
    const { container } = await mount()
    await move(960, 1080)
    expect(q.arm(container)?.style.transform).toBe(DOWN)
    await advance(300_000)
    expect(q.img(container, 'u:rest')).not.toBeNull()
    expect(q.arm(container)?.style.transform).toBe(REST)
    await key(true, 1)
    expect(q.img(container, 'u:idle')).not.toBeNull()
    expect(q.arm(container)?.style.transform).toBe(REST)
    await key(false, 0)
    await click('left', true)
    expect(q.arm(container)?.getAttribute('src')).toBe('u:mouse_left')
    expect(q.arm(container)?.style.transform).toBe(REST)
    await click('left', false)
    await move(960, 1080)
    expect(q.arm(container)?.style.transform).toBe(DOWN)
    noCommandsAfterLoad()
  })
})

describe('P-4 마우스', () => {
  it('TC-062: 버튼 누름 동안 클릭 이미지(같은 변형), 떼면 기본 이미지', async () => {
    const { container } = await mount()
    await move(960, 1080)
    await click('left', true)
    expect(q.arm(container)?.getAttribute('src')).toBe('u:mouse_left')
    expect(q.arm(container)?.style.transform).toBe(DOWN)
    await click('left', false)
    expect(q.arm(container)?.getAttribute('src')).toBe('u:mouse_base')
    await click('right', true)
    expect(q.arm(container)?.getAttribute('src')).toBe('u:mouse_right')
    noCommandsAfterLoad()
  })

  it('TC-063: 모니터 목록 실패·빈 목록·settings.mouse null이면 마우스 파츠 없음, 설정 변경으로 mouse null이 되면 사라짐', async () => {
    // ⓒ (CR-039 개정) 한 it 안에서 네 번 마운트한다. 설정·매니페스트 누계 n = 마운트 횟수(성공 조회는 재시도 없음),
    // 모니터 누계 = n + 3 — 첫 마운트의 모니터 조회가 끝내 실패해 최초 1회 + 재시도 3회(200·500·1000ms)였기 때문
    const calls = (n: number) => {
      for (const fn of [getSettings, getAssetManifest]) expect(fn).toHaveBeenCalledTimes(n)
      expect(getMonitors).toHaveBeenCalledTimes(n + 3)
      expect(legacyBounds).not.toHaveBeenCalled()
      expect(setSettings).not.toHaveBeenCalled()
    }
    const WIN_ERR = { code: 'WINDOW_ERROR', message: 'x' }
    // 재시도까지 4번 모두 실패시킨다(한 번만 실패하면 200ms 뒤 재시도가 성공해 마우스 파츠가 나타난다 — TC-248 소관)
    for (let i = 0; i < 4; i++) vi.mocked(getMonitors).mockRejectedValueOnce(WIN_ERR)
    const failed = await mount()
    expect(q.wrap(failed.container)).toBeNull()
    expect(q.img(failed.container, 'u:body')).not.toBeNull()
    // 재시도 타이머는 앞 조회가 실패한 뒤에야 걸리므로 간격마다 진행 + flush
    for (const ms of [200, 500, 1_000]) {
      await advance(ms)
      await flush()
      expect(q.wrap(failed.container)).toBeNull()
    }
    await advance(5_000)
    await flush()
    expect(q.wrap(failed.container)).toBeNull()
    calls(1)
    failed.unmount()

    vi.mocked(getMonitors).mockResolvedValueOnce([])
    const empty = await mount()
    expect(q.wrap(empty.container)).toBeNull()
    await move(960, 1080)
    expect(q.wrap(empty.container)).toBeNull()
    await advance(5_000)
    calls(2)
    empty.unmount()

    vi.mocked(getSettings).mockResolvedValueOnce({ ...SETTINGS, mouse: null })
    const noMouse = await mount()
    expect(q.wrap(noMouse.container)).toBeNull()
    expect(q.img(noMouse.container, 'u:body')).not.toBeNull()
    await advance(5_000)
    calls(3)
    noMouse.unmount()

    const later = await mount()
    expect(q.wrap(later.container)).not.toBeNull()
    await emit('settingsChanged', { ...SETTINGS, mouse: null })
    expect(q.wrap(later.container)).toBeNull()
    await advance(5_000)
    calls(4)
  })

  it('TC-122: 두 모니터(getMonitors) — 커서가 든 모니터 안 비율로 목표점, 두 모니터 밖이면 가장 가까운 모니터', async () => {
    vi.mocked(getMonitors).mockResolvedValue(TWO_MONITORS)
    const { container } = await mount()
    expect(q.arm(container)?.style.transform).toBe(REST)
    await move(1280, 1980) // 아래 모니터 중앙
    expect(q.arm(container)?.style.transform).toBe(CENTER)
    await move(1280, 2520) // 아래 모니터 아래 끝(밖, 거리 0) → v = 1
    expect(q.arm(container)?.style.transform).toBe(DOWN)
    await move(1280, 720) // 위 모니터 중앙
    expect(q.arm(container)?.style.transform).toBe(CENTER)
    await move(1280, 0) // 위 모니터 위 끝 → v = 0
    expect(q.arm(container)?.style.transform).toBe(UP)
    await move(100, 1980) // 두 모니터 밖 → 가장 가까운 아래 모니터, u 0·v 0.5 → 목표 (420,530)
    expect(q.arm(container)?.style.transform).toBe('rotate(180deg) scaleX(1.6) rotate(-180deg)')
    expect(getMonitors).toHaveBeenCalledWith()
    noCommandsAfterLoad()
  })

  it('TC-124: settings://changed의 mouse.area가 다음 렌더부터 목표점에 쓰인다(재조회 없음)', async () => {
    const { container } = await mount()
    await move(960, 1080)
    expect(q.arm(container)?.style.transform).toBe(DOWN)
    const area2: MouseSettings['area'] = [
      { x: 320, y: 530 },
      { x: 520, y: 530 },
      { x: 520, y: 730 },
      { x: 320, y: 730 },
    ]
    await emit('settingsChanged', { ...SETTINGS, mouse: { ...MOUSE, area: area2 } })
    // 같은 커서(960,1080) → 새 목표 (420,730): θt 135, 배율 2.83 → 1.6
    expect(q.arm(container)?.style.transform).toBe('rotate(135deg) scaleX(1.6) rotate(-180deg)')
    await move(960, 540) // 새 영역 중심 (420,630): θt 153.43, 배율 2.236 → 1.6
    expect(q.arm(container)?.style.transform).toBe('rotate(153.43deg) scaleX(1.6) rotate(-180deg)')
    expect(q.arm(container)?.style.transformOrigin).toBe('620px 530px')
    noCommandsAfterLoad()
  })
})

describe('렌더 조건·DOM 순서 (§2, §10.1, CR-014·CR-015·CR-022)', () => {
  it('TC-064: .canvas = [배경, .jellyWrap], .jellyWrap = [마우스 파츠(z0), 몸통, 상태, 키보드], 그림 크기와 무관하게 armWrap·jellyWrap 1개', async () => {
    const full = await mount()
    expect(order(full.container)).toEqual(['u:background', 'jellyWrap'])
    expect(inner(full.container)).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up'])
    expect(full.container.querySelectorAll('.armWrap')).toHaveLength(1)
    expect(full.container.querySelectorAll('.jellyWrap')).toHaveLength(1)
    full.unmount()
    vi.mocked(getAssetManifest).mockResolvedValueOnce(SMALL_MANIFEST)
    const small = await mount()
    expect(order(small.container)).toEqual(['u:background', 'jellyWrap'])
    expect(inner(small.container)).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up'])
    expect(small.container.querySelectorAll('.armWrap')).toHaveLength(1)
    expect(small.container.querySelectorAll('.jellyWrap')).toHaveLength(1)
    const w = q.wrap(small.container) as HTMLElement
    expect(Array.from(w.children).map(el => el.tagName.toLowerCase())).toEqual(['img'])
    expect(small.container.querySelector('svg')).toBeNull()
  })

  it('TC-065: 매니페스트 canvas가 null이면 .canvas 없이 빈 .root(드래그 영역)만', async () => {
    vi.mocked(getAssetManifest).mockResolvedValueOnce({ canvas: null, entries: [] })
    const { container } = await mount()
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toBe('root')
    expect(root.hasAttribute('data-tauri-drag-region')).toBe(true)
    expect(container.querySelector('.canvas')).toBeNull()
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('TC-066: assets://changed — 배경 등록·교체·삭제와 손 그림 크기 교체가 즉시 반영(같은 .jellyWrap, 배경은 래퍼 밖), 재조회 없음', async () => {
    vi.mocked(getAssetManifest).mockResolvedValueOnce(withoutBg(LAYER_MANIFEST))
    const { container } = await mount()
    const jelly = q.jelly(container)
    const bgOutside = () => {
      const bg = container.querySelector('img[src^="u:background"]')
      expect(bg?.closest('.jellyWrap')).toBeNull()
      expect(q.jelly(container)).toBe(jelly)
    }
    expect(order(container)).toEqual(['jellyWrap'])
    await emit('assetsChanged', LAYER_MANIFEST)
    expect(order(container)[0]).toBe('u:background')
    bgOutside()
    await emit('assetsChanged', withBgUrl(LAYER_MANIFEST, 'u:background2'))
    expect(order(container)[0]).toBe('u:background2')
    bgOutside()
    await emit('assetsChanged', withoutBg(LAYER_MANIFEST))
    expect(container.querySelector('img[src^="u:background"]')).toBeNull()
    expect(order(container)).toEqual(['jellyWrap'])
    expect(q.jelly(container)).toBe(jelly)
    expect(box(q.arm(container) as HTMLImageElement)).toEqual({ left: 0, top: 0, width: 900, height: 700 })
    await emit('assetsChanged', SMALL_MANIFEST)
    expect(order(container)).toEqual(['u:background', 'jellyWrap'])
    expect(inner(container)).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up'])
    bgOutside()
    expect(box(q.arm(container) as HTMLImageElement)).toEqual({ left: 0, top: 0, width: 202, height: 154 })
    noCommandsAfterLoad()
  })

  it('TC-067: 배경은 어떤 입력·상태 변화에도 같은 요소·같은 src·class "layer"·style 없음, .armWrap·.jellyWrap 조상 없음', async () => {
    const { container } = await mount()
    const cv = q.canvas(container)
    const bg = cv.firstElementChild as HTMLImageElement
    const unchanged = () => {
      expect(cv.firstElementChild).toBe(bg)
      expect(bg.getAttribute('src')).toBe('u:background')
      expect(bg.className).toBe('layer')
      expect(bg.getAttribute('style')).toBeNull()
      expect(bg.parentElement).toBe(cv)
      expect(bg.closest('.armWrap')).toBeNull()
      expect(bg.closest('.jellyWrap')).toBeNull()
    }
    unchanged()
    await move(960, 1080)
    unchanged()
    // 6키 동시 누름 — CR-019 이후 쾅 없음: 상태는 대기. CR-022: 젤리는 .jellyWrap에만(단독 실행 = 마운트 뒤 첫 누름 → jellyAlt)
    await key(true, 6)
    expect(q.img(container, 'u:idle')?.className).toBe('layer')
    expect(container.querySelector('img[src^="u:kb_down_"]')?.className).toBe('layer')
    expect(q.jelly(container).className).toBe('jellyWrap jellyAlt')
    expect(q.wrap(container)?.className).toBe('armWrap')
    unchanged()
    // 누름 유지 중 이동 — 팔 변형만 바뀌고 대기 이미지·누름 프레임·젤리 클래스는 유지(전이표 행7 「둘 다」)
    expect(q.arm(container)?.style.transform).toBe(DOWN)
    await move(960, 0)
    expect(q.arm(container)?.style.transform).toBe(UP)
    expect(q.img(container, 'u:idle')?.className).toBe('layer')
    expect(container.querySelector('img[src^="u:kb_down_"]')?.className).toBe('layer')
    expect(q.jelly(container).className).toBe('jellyWrap jellyAlt')
    unchanged()
    await click('left', true)
    unchanged()
    await click('left', false)
    await key(false, 0)
    expect(q.jelly(container).className).toBe('jellyWrap')
    await advance(400)
    unchanged()
    await advance(300_000)
    expect(q.img(container, 'u:rest')).not.toBeNull()
    unchanged()
    noCommandsAfterLoad()
  })
})

describe('R-01 · §8 · §9 표시 면', () => {
  it('TC-068: 문구·포커스 대상·aria-live 없음, 모든 img alt="" draggable=false, labels = {}', async () => {
    const { container } = await mount()
    await key(true, 1)
    expect(container.textContent).toBe('')
    const imgs = Array.from(container.querySelectorAll('img'))
    expect(imgs.length).toBeGreaterThan(0)
    for (const img of imgs) {
      expect(img.getAttribute('alt')).toBe('')
      expect(img.getAttribute('draggable')).toBe('false')
    }
    expect(
      container.querySelectorAll('button, input, select, textarea, a[href], [tabindex]'),
    ).toHaveLength(0)
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(0)
    expect(labels).toEqual({})
  })
})

describe('설정·이미지 변경 반영 (P-6)', () => {
  it('TC-099: settings://changed로 새 어깨가 변형 원점·각도 기준, assets://changed로 손 그림 크기가 즉시 바뀐다', async () => {
    const { container } = await mount()
    await move(960, 1080)
    expect(q.arm(container)?.style.transformOrigin).toBe('620px 530px')
    expect(q.arm(container)?.style.transform).toBe(DOWN)
    await emit('settingsChanged', { ...SETTINGS, mouse: { ...MOUSE, shoulder: { x: 420, y: 530 } } })
    // 어깨 (420,530) · 기준점 (520,530)(θh 0) · 목표 (520,630)(θt 45, 배율 1.414)
    const AFTER = 'rotate(45deg) scaleX(1.414) rotate(0deg)'
    expect(q.arm(container)?.style.transformOrigin).toBe('420px 530px')
    expect(q.arm(container)?.style.transform).toBe(AFTER)
    await emit('assetsChanged', SMALL_MANIFEST)
    const arm = q.arm(container) as HTMLImageElement
    expect(box(arm)).toEqual({ left: 0, top: 0, width: 202, height: 154 })
    expect(arm.style.transformOrigin).toBe('420px 530px')
    expect(arm.style.transform).toBe(AFTER)
    expect(container.querySelector('.armWrap svg')).toBeNull()
    noCommandsAfterLoad()
  })

  it('TC-101: 빈 창(canvas null)에서 assets://changed로 첫 등록 — .canvas·.jellyWrap·레이어가 처음 나타난다', async () => {
    vi.mocked(getAssetManifest).mockResolvedValueOnce({ canvas: null, entries: [] })
    const { container } = await mount()
    expect(container.querySelector('.canvas')).toBeNull()
    expect(container.querySelector('.jellyWrap')).toBeNull()
    await emit('assetsChanged', withoutBg(LAYER_MANIFEST))
    const cv = q.canvas(container)
    expect(cv).not.toBeNull()
    expect(cv.style.transform).toBe('scale(0.5)')
    expect(order(container)).toEqual(['jellyWrap'])
    expect(inner(container)).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up'])
    expect(q.jelly(container).className).toBe('jellyWrap')
    expect(q.arm(container)?.style.transform).toBe(REST)
    noCommandsAfterLoad()
  })
})
