/**
 * OverlayApp TC ① — 초기 로드·손 기준점 효과·키 입력·tick (design.md §4·§6 P-1~P-3·P-6, design/functions.md §5.1).
 * bridge 는 mock(vi.mock 'bridge/commands'·'bridge/events'). 실제 Tauri API import 없음.
 * 시간은 가짜 시계(vi.useFakeTimers + setSystemTime). 실제 sleep 없음.
 * 로케이터: 오버레이는 접근성 이름이 없다(design.md §8·§9). DOM 구조 + img src(매니페스트 url).
 * CR-017: 모니터 목록 getMonitors()(옛 getScreenBounds 대체), mouse.area(옛 pad 대체), 팔 변형 = rotate·scaleX·rotate.
 * CR-019: 쾅 메커니즘 폐기 — 슬롯·설정 slam 없음, TC-055 폐기(it 삭제), TC-058은 유휴 설정만.
 * 시나리오: src/overlay/test/scenarios.md TC-047 ~ TC-058(TC-055 폐기), TC-100, TC-123
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
  onHandAnchorChanged,
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
import * as commands from 'bridge/commands'
import OverlayApp from '../index'

// ─── bridge mock: 구독 핸들러를 잡아 두고 테스트가 이벤트를 흘려 넣는다 ─────────────
const h = vi.hoisted(() => {
  const handlers: Record<string, ((p: unknown) => void) | undefined> = {}
  const unlistens: Record<string, ReturnType<typeof vi.fn>> = {}
  const subImpl = (name: string) => (cb: (p: unknown) => void) => {
    handlers[name] = cb
    const un = vi.fn()
    unlistens[name] = un
    return Promise.resolve(un)
  }
  return { handlers, unlistens, subImpl }
})

vi.mock('bridge/commands', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  getAssetManifest: vi.fn(),
  getMonitors: vi.fn(),
  getHandAnchor: vi.fn(),
  // 옛 command 감시용(CR-017: 이 화면은 더 이상 부르지 않는다 — 래퍼 존폐는 bridge 결정)
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
    // 잔존 감시용(CR-022 — 소스가 옛 클래스를 쓰면 className에 드러난다)
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
const SLOTS = ['background', 'body', 'idle', 'rest', 'kb_up'] // CR-019: 슬롯 slam 없음
const MOUSE_SLOTS = ['mouse_base', 'mouse_left', 'mouse_right']
const LAYER_MANIFEST: AssetManifest = {
  canvas: CANVAS,
  entries: [
    ...[...SLOTS, ...MOUSE_SLOTS].map(s => entry(s as AssetSlot)),
    kbDown(0),
    kbDown(1),
    kbDown(2),
  ],
}
// CR-015: partPos (0,0) + 900×700 파츠 = 「전체 크기 그림 + (0,0)」(기본값 389,492와 다름).
// CR-017: pad 삭제 → area = 중심 (520,530)의 200×200 직사각형(옛 패드 200×200 + 기준점 520,530과 같은 목표점).
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
const ANCHOR: Point = { x: 520, y: 530 }
// 변형 참조(scenarios.md §0.2)
const REST = 'rotate(0deg) scaleX(1) rotate(0deg)'
const DOWN = 'rotate(135deg) scaleX(1.414) rotate(-180deg)' // 기준점 (520,530) · 커서 (960,1080) → 목표 (520,630)
const UP_ALT = 'rotate(-135deg) scaleX(1.414) rotate(90deg)' // 기준점 (620,430) · 커서 (960,0) → 목표 (520,430)
const UP = 'rotate(-135deg) scaleX(1.414) rotate(-180deg)' // 기준점 (520,530) · 커서 (960,0)
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
/** CR-039 재시도 간격(최초 실패 뒤 200 → 500 → 1000ms). 다음 타이머는 앞 조회가 실패한 뒤에야 걸리므로 간격마다 진행 + flush */
const RETRY_MS = [200, 500, 1_000] as const
const retryAll = async () => {
  for (const ms of RETRY_MS) {
    await advance(ms)
    await flush()
  }
}
const key = (pressed: boolean, heldCount: number) =>
  emit('keyboard', { pressed, heldCount, special: null, ts: Date.now() })
const move = (x: number, y: number) => emit('mouseMove', { x, y, ts: Date.now() })
const deferred =<T,>() => {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
const q = {
  canvas: (c: HTMLElement) => c.querySelector('.canvas') as HTMLElement | null,
  img: (c: HTMLElement, src: string) => c.querySelector(`img[src="${src}"]`) as HTMLImageElement | null,
  kb: (c: HTMLElement) => c.querySelector('img[src^="u:kb_down_"]')?.getAttribute('src'),
  arm: (c: HTMLElement) => c.querySelector('.armWrap img') as HTMLImageElement | null,
  wrap: (c: HTMLElement) => c.querySelector('.armWrap') as HTMLElement | null,
}
const ERR = { code: 'IO', message: 'x' }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(LAYER_MANIFEST)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue(ANCHOR)
  vi.mocked(setSettings).mockImplementation(async s => s)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('P-1 초기 로드', () => {
  it('TC-047: 조회 3종(getSettings·getAssetManifest·getMonitors) 1회씩(인자 없음)·이벤트 5종 구독, getScreenBounds 호출 없음', async () => {
    const { container } = await mount()
    for (const fn of [getSettings, getAssetManifest, getMonitors]) {
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith()
    }
    expect(legacyBounds).not.toHaveBeenCalled()
    for (const sub of [onKeyboard, onMouseMove, onMouseButton, onSettingsChanged, onAssetsChanged]) {
      expect(sub).toHaveBeenCalledTimes(1)
    }
    expect(setSettings).not.toHaveBeenCalled()
    const cv = q.canvas(container) as HTMLElement
    expect(cv.style.width).toBe('900px')
    expect(cv.style.height).toBe('700px')
    expect(cv.style.transform).toBe('scale(0.5)')
    for (const src of ['u:body', 'u:idle', 'u:kb_up']) expect(q.img(container, src)).not.toBeNull()
    expect(q.img(container, 'u:rest')).toBeNull()
  })

  it('TC-048: 조회가 모두 실패하면 빈 투명 창(.root만, .canvas·img·문구 없음)', async () => {
    vi.mocked(getSettings).mockRejectedValue(ERR)
    vi.mocked(getAssetManifest).mockRejectedValue(ERR)
    vi.mocked(getMonitors).mockRejectedValue(ERR)
    vi.mocked(getHandAnchor).mockRejectedValue(ERR)
    const { container } = await mount()
    expect((container.firstElementChild as HTMLElement).className).toBe('root')
    expect(q.canvas(container)).toBeNull()
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.textContent).toBe('')
    // ⓒ (CR-039 개정) 조회 3종은 실패 뒤 200·500·1000ms 간격으로 재시도 — 간격마다 1회씩 늘어 최초 1회 + 3회 = 4회에서 멈춘다
    const counts = (n: number) => {
      for (const fn of [getSettings, getAssetManifest, getMonitors]) expect(fn).toHaveBeenCalledTimes(n)
    }
    counts(1)
    await advance(199)
    await flush()
    counts(1)
    await advance(1)
    await flush()
    counts(2)
    await advance(500)
    await flush()
    counts(3)
    await advance(1_000)
    await flush()
    counts(4)
    for (let i = 0; i < 3; i++) {
      await advance(2_000)
      await flush()
    }
    counts(4)
    // 손 기준점 조회는 재시도 대상이 아니다(1회), 끝내 실패해도 빈 투명 창 그대로·문구 없음
    expect(getHandAnchor).toHaveBeenCalledTimes(1)
    expect(q.canvas(container)).toBeNull()
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.textContent).toBe('')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-048: 설정 조회만 실패하면 DEFAULT_SETTINGS로 동작(scale 1 → scale(0.5), 기본 partPos 411,464·기본 어깨 축, 쉬는 위치 변형 없음)', async () => {
    vi.mocked(getSettings).mockRejectedValue(ERR)
    const { container } = await mount()
    expect(q.canvas(container)?.style.transform).toBe('scale(0.5)')
    const arm = q.arm(container) as HTMLImageElement
    // CR-015: 손 그림 좌상단 = 기본 partPos, 크기 = 매니페스트 항목(900×700), 원점 = 기본 어깨 − 기본 partPos
    // CR-044(🔒 contract v0.20): 기본 어깨 (582,484) − partPos (411,464) = (171, 20) — 정수 차라 반올림 없음.
    // (v0.18~v0.19 CR-038: (558,500) − (389,492) = (169, 8).) 기본 penMode true여도 LAYER_MANIFEST에
    // pen_up 이 없어 isPenMode = false(펜 모드 아님) — 이 TC의 비펜 의도는 그대로다.
    expect(parseFloat(arm.style.left)).toBe(411)
    expect(parseFloat(arm.style.top)).toBe(464)
    expect(parseFloat(arm.style.width)).toBe(900)
    expect(parseFloat(arm.style.height)).toBe(700)
    expect(arm.style.transformOrigin).toBe('171px 20px')
    expect(arm.style.transform).toBe(REST)
    expect(container.textContent).toBe('')
    // ⓒ (CR-039 개정) 실패한 설정 조회만 최초 1회 + 재시도 3회, 성공한 두 조회는 1회. 끝내 실패해도 기본값 그대로
    await retryAll()
    await advance(5_000)
    await flush()
    expect(getSettings).toHaveBeenCalledTimes(4)
    for (const fn of [getAssetManifest, getMonitors]) expect(fn).toHaveBeenCalledTimes(1)
    expect(q.canvas(container)?.style.transform).toBe('scale(0.5)')
    expect(q.arm(container)?.style.transformOrigin).toBe('171px 20px')
    expect(q.arm(container)?.style.transform).toBe(REST)
    expect(container.textContent).toBe('')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-048: 모니터 목록 조회만 실패하면(monitors = []) 마우스 파츠를 그리지 않고 나머지 레이어는 그린다', async () => {
    vi.mocked(getMonitors).mockRejectedValue(ERR)
    const { container } = await mount()
    expect(q.wrap(container)).toBeNull()
    expect(q.img(container, 'u:body')).not.toBeNull()
    expect(q.img(container, 'u:mouse_base')).toBeNull()
    // ⓒ (CR-039 개정) 실패한 모니터 조회만 최초 1회 + 재시도 3회, 끝내 실패하면 monitors = [] 그대로
    await retryAll()
    await advance(5_000)
    await flush()
    expect(getMonitors).toHaveBeenCalledTimes(4)
    for (const fn of [getSettings, getAssetManifest]) expect(fn).toHaveBeenCalledTimes(1)
    await move(960, 1080)
    expect(q.wrap(container)).toBeNull()
    expect(q.img(container, 'u:mouse_base')).toBeNull()
    expect(q.img(container, 'u:body')).not.toBeNull()
    expect(container.textContent).toBe('')
    expect(legacyBounds).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-123: 설정 조회 실패 → 기본 이동 영역(중심 435,575)·기본 어깨(582,484)로 목표점을 계산한다', async () => {
    vi.mocked(getSettings).mockRejectedValue(ERR)
    const { container } = await mount()
    // CR-044 재계산(src/state/mouseMapping.ts armTransform — 어깨 S (582,484) 🔒 contract v0.20 · 기준점 A = ANCHOR (520,530)).
    // 각도는 toFixed(2), 배율은 toFixed(3) 후 Number() — 끝자리 0은 문자열에서 빠진다(168.80 → 168.8, 1.600 → 1.6).
    //   h = A − S = (−62, 46), |h| = √5960 ≈ 77.201
    //   θh = atan2(46, −62) = 180 − atan(23/31); atan(23/31) = atan(3/4) − atan(1/193) = 36.869898 − 0.296867 = 36.573031
    //      → θh = 143.426969 → 143.43 (반올림 경계 143.425와 0.002 차 — 안전)
    // 모니터 중앙 → 목표 = 기본 영역 중심 (435,575): t = (−147, 91)
    //   θt = 180 − atan(13/21); atan(13/21) = atan(3/5) + atan(1/72) = 30.963757 + 0.795724 = 31.759480
    //      → θt = 148.240520 → 148.24 (경계 148.245와 0.004 차)
    //   배율 |t|/|h| = √29890/√5960 ≈ 172.887/77.201 ≈ 2.239 → 상한 1.6
    await move(960, 540)
    expect(q.arm(container)?.style.transform).toBe('rotate(148.24deg) scaleX(1.6) rotate(-143.43deg)')
    // 모니터 왼쪽 위 → 목표 = 기본 영역 q0 (375,525): t = (−207, 41)
    //   θt = 180 − atan(41/207); atan(41/207) = atan(1/5) − atan(1/538) = 11.309932 − 0.106498 = 11.203435
    //      → θt = 168.796565 → toFixed(2) "168.80" → 168.8 (경계 168.795와 0.0016 차)
    //   배율 √44530/√5960 ≈ 211.021/77.201 ≈ 2.733 → 1.6
    await move(0, 0)
    expect(q.arm(container)?.style.transform).toBe('rotate(168.8deg) scaleX(1.6) rotate(-143.43deg)')
    // 원점 = 기본 어깨 (582,484) − 기본 partPos (411,464) = (171, 20) — 정수 차라 반올림 없음(CR-044)
    expect(q.arm(container)?.style.transformOrigin).toBe('171px 20px')
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('손 기준점 효과 (CR-008, contract §3.6)', () => {
  it('TC-049: 구독이 완료된 뒤에만 getHandAnchor()를 1회 호출하고 그 값으로 팔을 변형한다', async () => {
    const sub = deferred<() => void>()
    vi.mocked(onHandAnchorChanged).mockImplementationOnce(((cb: (e: unknown) => void) => {
      h.handlers.handAnchor = cb
      return sub.promise
    }) as never)
    const { container } = await mount()
    expect(onHandAnchorChanged).toHaveBeenCalledTimes(1)
    expect(getHandAnchor).not.toHaveBeenCalled()
    await act(async () => sub.resolve(vi.fn()))
    await flush()
    expect(getHandAnchor).toHaveBeenCalledTimes(1)
    expect(getHandAnchor).toHaveBeenCalledWith()
    await move(960, 1080)
    expect(q.arm(container)?.style.transform).toBe(DOWN)
  })

  it('TC-050: 조회 응답보다 먼저 온 이벤트 값이 이긴다(eventSeen)', async () => {
    const got = deferred<Point | null>()
    vi.mocked(getHandAnchor).mockImplementationOnce(() => got.promise)
    const { container } = await mount()
    expect(getHandAnchor).toHaveBeenCalledTimes(1)
    await emit('handAnchor', { anchor: { x: 620, y: 430 } })
    await act(async () => got.resolve({ x: 520, y: 530 }))
    await flush()
    await move(960, 0)
    // 조회값 (520,530)이 쓰였다면 UP(끝 rotate(-180deg))
    expect(q.arm(container)?.style.transform).toBe(UP_ALT)
  })

  it('TC-051: assets://hand-anchor-changed가 anchor를 교체한다 — null이면 mouse.hand 폴백', async () => {
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS, mouse: { ...MOUSE, hand: { x: 520, y: 530 } } })
    vi.mocked(getHandAnchor).mockResolvedValue({ x: 620, y: 430 })
    const { container } = await mount()
    await move(960, 0)
    expect(q.arm(container)?.style.transform).toBe(UP_ALT)
    await emit('handAnchor', { anchor: null })
    await move(960, 1080)
    expect(q.arm(container)?.style.transform).toBe(DOWN)
    await emit('handAnchor', { anchor: { x: 620, y: 430 } })
    await move(960, 0)
    expect(q.arm(container)?.style.transform).toBe(UP_ALT)
    expect(getHandAnchor).toHaveBeenCalledTimes(1)
  })

  it('TC-052: 구독 실패여도 getHandAnchor()를 1회 호출해 초깃값을 쓴다', async () => {
    vi.mocked(onHandAnchorChanged).mockImplementationOnce((() => Promise.reject(ERR)) as never)
    const { container } = await mount()
    expect(getHandAnchor).toHaveBeenCalledTimes(1)
    await move(960, 1080)
    expect(q.arm(container)?.style.transform).toBe(DOWN)
    expect(container.textContent).toBe('')
  })

  it('TC-052: 조회 실패면 anchor = null 유지 → mouse.hand 폴백, 문구 없음', async () => {
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS, mouse: { ...MOUSE, hand: { x: 620, y: 430 } } })
    vi.mocked(getHandAnchor).mockRejectedValue({ code: 'STATE_POISONED', message: 'x' })
    const { container } = await mount()
    await move(960, 0)
    expect(q.arm(container)?.style.transform).toBe(UP_ALT)
    expect(container.textContent).toBe('')
    // ⓒ 재시도 없음 — 5초가 지나도 조회·구독은 1회씩
    await advance(5_000)
    expect(getHandAnchor).toHaveBeenCalledTimes(1)
    expect(onHandAnchorChanged).toHaveBeenCalledTimes(1)
  })

  // 구독 실패 경로의 `!cancelled` 가드(언마운트 뒤 setAnchor 금지)는 React 18에서 관찰 불가 → 코드 리뷰 항목(scenarios.md 설계↔TC 표)

  it('TC-053: 언마운트하면 이벤트 6종 구독을 모두 해제한다(재렌더로 재구독하지 않음)', async () => {
    const { unmount } = await mount()
    await key(true, 1)
    await key(false, 0)
    for (const sub of [onKeyboard, onMouseMove, onMouseButton, onSettingsChanged, onAssetsChanged]) {
      expect(sub).toHaveBeenCalledTimes(1)
    }
    expect(onHandAnchorChanged).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBeGreaterThan(0) // tick interval
    unmount()
    for (const k of ['keyboard', 'mouseMove', 'mouseButton', 'settingsChanged', 'assetsChanged', 'handAnchor']) {
      expect(h.unlistens[k]).toHaveBeenCalledTimes(1)
    }
    expect(vi.getTimerCount()).toBe(0) // 언마운트 시 clearInterval — 남은 tick 없음
  })

  it('TC-053: 기준점 구독이 끝나기 전에 언마운트하면 완료 즉시 해제한다', async () => {
    const sub = deferred<() => void>()
    vi.mocked(onHandAnchorChanged).mockImplementationOnce((() => sub.promise) as never)
    const { unmount } = await mount()
    unmount()
    const un = vi.fn()
    await act(async () => sub.resolve(un))
    await flush()
    expect(un).toHaveBeenCalledTimes(1)
  })
})

describe('P-2 키 입력 · P-3 시간 경과', () => {
  it('TC-054: 키 누름 → 젤리 래퍼 한 번(.jellyWrap jellyAlt — 키보드·팔·몸통 한 덩어리), 키보드 img·.armWrap에는 애니메이션 없음, 떼면 해제', async () => {
    const { container } = await mount()
    const jelly = container.querySelector('.jellyWrap') as HTMLElement
    await key(true, 1)
    // 프레임 번호는 TC-056 소관 — 여기서는 어떤 누름 프레임이든 본다(FLOW-01 Step 연결용)
    expect(q.kb(container)).toMatch(/^u:kb_down_\d+$/)
    expect(container.querySelector('img[src^="u:kb_down_"]')?.className).toBe('layer')
    expect(q.img(container, 'u:kb_up')).toBeNull()
    expect(container.querySelector('.jellyWrap')).toBe(jelly)
    expect(jelly.className).toBe('jellyWrap jellyAlt') // 마운트 뒤 첫 누름 = phase 1
    expect(q.wrap(container)?.className).toBe('armWrap')
    expect(q.img(container, 'u:idle')?.className).toBe('layer')
    expect(q.arm(container)?.style.transform).toBe(REST)
    await key(false, 0)
    expect(q.img(container, 'u:kb_up')?.className).toBe('layer')
    expect(container.querySelector('.jellyWrap')).toBe(jelly)
    expect(jelly.className).toBe('jellyWrap')
    expect(q.wrap(container)?.className).toBe('armWrap')
    expect(setSettings).not.toHaveBeenCalled()
    expect(getSettings).toHaveBeenCalledTimes(1)
  })

  it('TC-100: 누름 유지 중 추가 누름 — 같은 키보드 img·.jellyWrap 노드, class 속성 변경 없음(젤리 재생 안 됨)', async () => {
    const { container } = await mount()
    await key(true, 1)
    const kbImg = container.querySelector('img[src^="u:kb_down_"]') as HTMLImageElement
    const jelly = container.querySelector('.jellyWrap') as HTMLElement
    expect(kbImg.getAttribute('src')).toBe('u:kb_down_1')
    expect(kbImg.className).toBe('layer')
    expect(jelly.className).toBe('jellyWrap jellyAlt')
    const mo = new MutationObserver(() => undefined)
    mo.observe(kbImg, { attributes: true, attributeFilter: ['class'] })
    mo.observe(jelly, { attributes: true, attributeFilter: ['class'] })
    await key(true, 2)
    const classChanges = mo.takeRecords()
    mo.disconnect()
    expect(container.querySelector('img[src^="u:kb_down_"]')).toBe(kbImg)
    expect(kbImg.getAttribute('src')).toBe('u:kb_down_2')
    expect(kbImg.className).toBe('layer')
    expect(container.querySelector('.jellyWrap')).toBe(jelly)
    expect(jelly.className).toBe('jellyWrap jellyAlt')
    expect(classChanges).toHaveLength(0)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-056: 누름 프레임 수는 매니페스트에서 파생된다(3장 1→2→0, 2장으로 바뀌면 1→0→1)', async () => {
    const { container } = await mount()
    const seen: Array<string | null | undefined> = []
    for (let i = 0; i < 3; i++) {
      await key(true, 1)
      seen.push(q.kb(container))
      await key(false, 0)
    }
    expect(seen).toEqual(['u:kb_down_1', 'u:kb_down_2', 'u:kb_down_0'])
    await emit('assetsChanged', {
      ...LAYER_MANIFEST,
      entries: LAYER_MANIFEST.entries.filter(e => slotKey(e.slot) !== 'kb_down_2'),
    })
    const after: Array<string | null | undefined> = []
    for (let i = 0; i < 3; i++) {
      await key(true, 1)
      after.push(q.kb(container))
      await key(false, 0)
    }
    expect(after).toEqual(['u:kb_down_1', 'u:kb_down_0', 'u:kb_down_1'])
  })

  it('TC-057: 5분 무입력 → 쉬는중 이미지(299999ms까지 대기), 키 입력 → 대기', async () => {
    const { container } = await mount()
    await advance(299_999)
    expect(q.img(container, 'u:idle')).not.toBeNull()
    expect(q.img(container, 'u:rest')).toBeNull()
    await advance(1)
    expect(q.img(container, 'u:rest')).not.toBeNull()
    expect(q.img(container, 'u:idle')).toBeNull()
    await key(true, 1)
    expect(q.img(container, 'u:idle')).not.toBeNull()
    expect(q.img(container, 'u:rest')).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-058: settings://changed의 유휴 설정이 바로 상태기계에 반영된다(60초 유휴 → 쉬는중)', async () => {
    const { container } = await mount()
    await emit('settingsChanged', { ...SETTINGS, idleSeconds: 60 })
    await advance(60_000)
    expect(q.img(container, 'u:rest')).not.toBeNull()
    expect(q.img(container, 'u:idle')).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

// UP은 TC-049~TC-052에서 기준점 (520,530) 사용 여부를 구분할 때 비교용으로만 문서화(scenarios.md §0.2)
void UP
