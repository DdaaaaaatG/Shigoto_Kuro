/**
 * CR-015 TC — R-18 손 그림 한 모드(partPos 배치·변경 반영·기준점 미가산), R-19 몸통 선택·kb_up 디폴트.
 * (design.md §2·§6 P-1·P-2·P-6·§10.1·§10.4, design/components.md 렌더 조건, design/functions.md §5.3 LayerStack 렌더·§5.4 MouseArm 렌더)
 * CR-017: getMonitors()(옛 getScreenBounds 대체)·mouse.area(옛 pad 대체)·팔 변형 = rotate·scaleX·rotate.
 * CR-022: 바운스 = .jellyWrap 하나의 젤리. .canvas 자식 = [배경(있을 때), .jellyWrap], .jellyWrap 자식 = [armWrap, 몸통, 상태, 키보드].
 *   키보드 img class는 항상 layer, .armWrap은 항상 armWrap(scenarios.md v0.9 개정표 TC-110·TC-111).
 * bridge 는 mock. 시간은 가짜 시계. 계약·구현 전에는 TC-109·TC-111이 실패한다.
 * 시나리오: src/overlay/test/scenarios.md TC-109 ~ TC-111
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
import { createInitialState } from 'state/inputMachine'
import LayerStack from '../components/LayerStack'
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
const kbDown = (index: number) => entry({ kind: 'kb_down', index })
const MOUSE_SLOTS = ['mouse_base', 'mouse_left', 'mouse_right']
const smallParts = () => MOUSE_SLOTS.map(s => entry(s as AssetSlot, 202, 154))
/** OverlayApp.mouse.test.tsx SMALL_MANIFEST와 같은 구성: 배경·몸통·상태 2(대기·쉬는중 — CR-019 slam 없음)·kb_up·kb_down 1장 + 손 그림 202×154 */
const SMALL_MANIFEST: AssetManifest = {
  canvas: CANVAS,
  entries: [
    ...['background', 'body', 'idle', 'rest', 'kb_up'].map(s => entry(s as AssetSlot)),
    ...smallParts(),
    kbDown(0),
  ],
}
/** R-19: 몸통·상태·배경 없이 kb_up(디폴트 상태 = 캐릭터 전체)·kb_down 1장·손 그림만 */
const NO_BODY: AssetManifest = { canvas: CANVAS, entries: [entry('kb_up'), kbDown(0), ...smallParts()] }
/** 🔒 기본 partPos (389,492) 명시. CR-017: pad 삭제 → area = 중심 (520,530)의 200×200 직사각형 */
const PART_MOUSE: MouseSettings = {
  shoulder: { x: 620, y: 530 },
  area: [
    { x: 420, y: 430 },
    { x: 620, y: 430 },
    { x: 620, y: 630 },
    { x: 420, y: 630 },
  ],
  hand: null,
  partPos: { x: 389, y: 492 },
  penPos: null, // bridge v0.13(CR-024) 필드 추가 — 픽스처 갱신
  penMode: false, // contract v0.15(CR-033) 기본값
}
const PART_SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  scale: 1,
  idleSeconds: 300,
  overlay: { x: 100, y: 100, visible: true },
  mouse: PART_MOUSE,
  autostart: false,
}
const MONITORS: ScreenBounds[] = [{ x: 0, y: 0, width: 1920, height: 1080 }]
// 변형 참조(scenarios.md §0.2)
const REST = 'rotate(0deg) scaleX(1) rotate(0deg)'
const DOWN = 'rotate(135deg) scaleX(1.414) rotate(-180deg)' // 기준점 (520,530) · 커서 (960,1080)
const UP_ALT = 'rotate(-135deg) scaleX(1.414) rotate(90deg)' // 기준점 (620,430) · 커서 (960,0)
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
const key = (pressed: boolean, heldCount: number) =>
  emit('keyboard', { pressed, heldCount, special: null, ts: Date.now() })
const move = (x: number, y: number) => emit('mouseMove', { x, y, ts: Date.now() })
const q = {
  canvas: (c: HTMLElement) => c.querySelector('.canvas') as HTMLElement,
  jelly: (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement,
  img: (c: HTMLElement, src: string) => c.querySelector(`img[src="${src}"]`) as HTMLImageElement | null,
  arm: (c: HTMLElement) => c.querySelector('.armWrap img') as HTMLImageElement,
  wrap: (c: HTMLElement) => c.querySelector('.armWrap') as HTMLElement | null,
}
const box = (img: HTMLImageElement) => ({
  left: parseFloat(img.style.left),
  top: parseFloat(img.style.top),
  width: parseFloat(img.style.width),
  height: parseFloat(img.style.height),
})
/** 자식 순서 식별자: img는 src, 그 외는 첫 클래스 */
const ids = (el: Element) =>
  Array.from(el.children).map(ch => (ch.tagName === 'IMG' ? ch.getAttribute('src') : ch.className.split(' ')[0]))
const srcs = (c: HTMLElement) => Array.from(c.querySelectorAll('img')).map(i => i.getAttribute('src'))
const noCommandsAfterLoad = () => {
  for (const fn of [getSettings, getAssetManifest, getMonitors, getHandAnchor]) {
    expect(fn).toHaveBeenCalledTimes(1)
  }
  expect(legacyBounds).not.toHaveBeenCalled()
  expect(setSettings).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(PART_SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(SMALL_MANIFEST)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue({ x: 520, y: 530 })
  vi.mocked(setSettings).mockImplementation(async s => s)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('R-18 손 그림 한 모드 — partPos 배치·변경 반영 (P-1·P-6)', () => {
  it('TC-109: 손 그림은 설정 partPos에 자연 크기로 놓이고 settings://changed로 옮겨진다 — 기준점은 받은 값 그대로', async () => {
    const { container } = await mount()
    let arm = q.arm(container)
    expect(arm.className).toBe('hand')
    expect(box(arm)).toEqual({ left: 389, top: 492, width: 202, height: 154 })
    expect(arm.style.transformOrigin).toBe('231px 38px')
    expect(arm.style.transform).toBe(REST)
    await move(960, 1080)
    expect(q.arm(container).style.transform).toBe(DOWN)
    // 설정 창에서 손 그림을 (100,50)으로 옮김 — 기준점 이벤트는 아직 없음
    await emit('settingsChanged', { ...PART_SETTINGS, mouse: { ...PART_MOUSE, partPos: { x: 100, y: 50 } } })
    arm = q.arm(container)
    expect(box(arm)).toEqual({ left: 100, top: 50, width: 202, height: 154 })
    expect(arm.style.transformOrigin).toBe('520px 480px')
    expect(arm.style.transform).toBe(DOWN) // ui가 partPos 차이를 기준점에 더하지 않음
    // core가 다시 계산한 기준점(캔버스 좌표)을 그대로 쓴다
    await emit('handAnchor', { anchor: { x: 620, y: 430 } })
    await move(960, 0)
    expect(q.arm(container).style.transform).toBe(UP_ALT)
    expect(box(q.arm(container))).toEqual({ left: 100, top: 50, width: 202, height: 154 })
    noCommandsAfterLoad()
  })
})

describe('R-19 몸통 선택·kb_up 디폴트', () => {
  it('TC-110: LayerStack — 몸통 없으면 body img 없이 kb_up ↔ kb_down 교체(class 항상 layer — CR-022), 몸통·상태 모두 없으면 kb_up 한 장', () => {
    const noBody: AssetManifest = {
      canvas: CANVAS,
      entries: [...['idle', 'rest', 'kb_up'].map(s => entry(s as AssetSlot)), kbDown(0), kbDown(1)],
    }
    const init = createInitialState(0)
    const pressed = { ...init, kbDown: true, heldCount: 1, kbFrame: 1 }
    const { container, rerender } = render(<LayerStack penMode={false} manifest={noBody} machine={init} />)
    expect(srcs(container)).toEqual(['u:idle', 'u:kb_up'])
    rerender(<LayerStack penMode={false} manifest={noBody} machine={pressed} />)
    expect(srcs(container)).toEqual(['u:idle', 'u:kb_down_1'])
    expect(container.querySelectorAll('img')[1].className).toBe('layer')
    rerender(<LayerStack penMode={false} manifest={noBody} machine={{ ...pressed, kbDown: false, heldCount: 0 }} />)
    expect(srcs(container)).toEqual(['u:idle', 'u:kb_up'])
    expect(container.querySelectorAll('img')[1].className).toBe('layer')
    const only: AssetManifest = { canvas: CANVAS, entries: [entry('kb_up'), kbDown(0)] }
    rerender(<LayerStack penMode={false} manifest={only} machine={init} />)
    expect(srcs(container)).toEqual(['u:kb_up'])
    rerender(<LayerStack penMode={false} manifest={only} machine={pressed} />)
    expect(srcs(container)).toEqual(['u:kb_down_0'])
    expect(container.querySelectorAll('img')[0].className).toBe('layer')
    expect(srcs(container).includes('u:body')).toBe(false)
  })

  it('TC-111: OverlayApp — 몸통·상태·배경 없는 매니페스트, kb_up 디폴트·키 누름/뗌 교체 정상, 젤리는 .jellyWrap에만', async () => {
    vi.mocked(getAssetManifest).mockResolvedValueOnce(NO_BODY)
    const { container } = await mount()
    expect(ids(q.canvas(container))).toEqual(['jellyWrap'])
    const jelly = q.jelly(container)
    expect(ids(jelly)).toEqual(['armWrap', 'u:kb_up'])
    expect(q.img(container, 'u:kb_up')?.className).toBe('layer')
    expect(jelly.className).toBe('jellyWrap')
    await key(true, 1)
    expect(ids(q.jelly(container))).toEqual(['armWrap', 'u:kb_down_0'])
    expect(q.img(container, 'u:kb_down_0')?.className).toBe('layer')
    // 마운트 뒤 첫 누름 = bounceSeq 1 → phase 1 → jellyWrap jellyAlt(CR-021 짝 규칙 · CR-022 대상)
    expect(q.jelly(container)).toBe(jelly)
    expect(jelly.className).toBe('jellyWrap jellyAlt')
    expect(q.wrap(container)?.className).toBe('armWrap')
    await key(false, 0)
    expect(ids(q.jelly(container))).toEqual(['armWrap', 'u:kb_up'])
    expect(q.img(container, 'u:kb_up')?.className).toBe('layer')
    expect(jelly.className).toBe('jellyWrap')
    expect(q.wrap(container)?.className).toBe('armWrap')
    expect(q.img(container, 'u:body')).toBeNull()
    expect(container.querySelectorAll('.armWrap')).toHaveLength(1)
    expect(container.textContent).toBe('')
    noCommandsAfterLoad()
  })
})
