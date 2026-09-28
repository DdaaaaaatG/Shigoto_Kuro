/**
 * 뽀모도 타이머 화면 통합 TC — CR-045(R-33~R-36).
 * 근거: design.md §10.14 14.1(자리·격리)·14.2(표시 표)·14.3 OverlayApp 변경 ①②③·14.4 쉬는중 보고 효과·14.5(리렌더 경계)·
 *   14.6(선행 조건)·14.8 ⑤, §2 [pomo] 문단·.jellyWrap 문단, §4 timer(settings.timer ?? DEFAULT_TIMER_SETTINGS), §6 P-8 ①~⑤·오류,
 *   §7 get_timer·set_resting·timer://changed·Settings.timer·AssetSlot pomo_* 행, §10.1 pomo 행, contract v0.21 §5.8-3·§5.8-5,
 *   requirements R-33~R-36·§2 S-16·S-17·S-18.
 * 대상: src/overlay/index.tsx(OverlayApp) + PomodoroLayer·TimerText·공용 훅 — 구현 전에는 import·단언 실패로 red.
 * bridge mock(vi.mock 'bridge/commands'·'bridge/events') — 실제 Tauri API import 없음. 코어 타이머 동작(일시정지 판정·재개)은
 *   mock이 흉내 내지 않는다: 테스트가 core가 보냈을 timer://changed를 직접 넣는다. 가짜 시계(performance 포함). 실제 sleep 없음.
 * findEntry는 LayerStack 실제 구현을 감싼 spy — slot 'pomo_char' 호출 수 = PomodoroLayer 렌더 대리 관찰.
 * 시나리오: src/overlay/test/scenarios.md TC-282 ~ TC-288
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  DEFAULT_TIMER_SETTINGS,
  getAssetManifest,
  getHandAnchor,
  getMonitors,
  getSettings,
  getTimer,
  onTimerChanged,
  setResting,
  setSettings,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type ScreenBounds,
  type Settings,
  type TimerSettings,
  type TimerSnapshot,
  type TimerStatus,
} from 'bridge'
import { findEntry } from '../components/LayerStack'
import OverlayApp from '../index'

// ─── bridge·CSS mock ────────────────────────────────────────────────────
const h = vi.hoisted(() => {
  const handlers: Record<string, ((p: unknown) => void) | undefined> = {}
  const unlisten: Record<string, ReturnType<typeof vi.fn>> = {}
  const subImpl = (name: string) => (cb: (p: unknown) => void) => {
    handlers[name] = cb
    const u = vi.fn()
    unlisten[name] = u
    return Promise.resolve(u)
  }
  return { handlers, unlisten, subImpl }
})
vi.mock('bridge/commands', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  getAssetManifest: vi.fn(),
  getMonitors: vi.fn(),
  getHandAnchor: vi.fn(),
  getScreenBounds: vi.fn(),
  getTimer: vi.fn(),
  setResting: vi.fn(),
  // CR-050(scenarios v1.9): TimerText → useAlarmOnFinish가 finished 진입 이벤트 때 부른다 — 이 스펙은 관찰하지 않는다(일반 함수)
  getAlarmSound: () => Promise.resolve(null),
}))
vi.mock('bridge/events', () => ({
  EVENTS: {
    keyboard: 'input://keyboard',
    mouseMove: 'input://mouse-move',
    mouseButton: 'input://mouse-button',
    settingsChanged: 'settings://changed',
    assetsChanged: 'assets://changed',
    handAnchorChanged: 'assets://hand-anchor-changed',
    timerChanged: 'timer://changed',
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
    pomodoro: 'pomodoro',
  },
}))
vi.mock('../components/LayerStack', async importOriginal => {
  const actual = await importOriginal<typeof import('../components/LayerStack')>()
  return { ...actual, findEntry: vi.fn(actual.findEntry) }
})

// ─── 픽스처 ───────────────────────────────────────────────────────────────
const T0 = 1_700_000_000_000
const CANVAS = { width: 900, height: 700 }
const entry = (key: string): AssetEntry => ({
  slot: key as unknown as AssetSlot,
  fileName: `${key}.png`,
  width: 900,
  height: 700,
  bytes: 1,
  url: `u:${key}`,
})
const BASE = ['background', 'body', 'idle', 'rest', 'kb_up'].map(entry)
const M_NONE: AssetManifest = { canvas: CANVAS, entries: BASE }
/** 매니페스트 순서를 뒤집어 둔다 — DOM 순서가 설계(인물 → 말풍선 → 글자)로 정해지는지 본다 */
const M_BOTH: AssetManifest = { canvas: CANVAS, entries: [...BASE, entry('pomo_bubble'), entry('pomo_char')] }
const M_CHAR: AssetManifest = { canvas: CANVAS, entries: [...BASE, entry('pomo_char')] }
const M_NOBG_CHAR: AssetManifest = { canvas: CANVAS, entries: [...BASE.slice(1), entry('pomo_char')] }
const TIMER_OFF: TimerSettings = { enabled: false, textPos: { x: 268, y: 403 }, rotation: 5, fontSize: 36, color: '#333333' }
const TIMER_ON: TimerSettings = { ...TIMER_OFF, enabled: true }
const T2: TimerSettings = { enabled: true, textPos: { x: 100, y: 200 }, rotation: -10, fontSize: 48, color: '#ff0000' }
const base: Settings = {
  ...DEFAULT_SETTINGS,
  scale: 1,
  idleSeconds: 300,
  overlay: { x: 100, y: 100, visible: true },
  mouse: null,
  autostart: false,
}
const withTimer = (timer: TimerSettings): Settings => ({ ...base, timer })
const MONITORS: ScreenBounds[] = [{ x: 0, y: 0, width: 1920, height: 1080 }]
const snap = (status: TimerStatus, elapsedMs: number): TimerSnapshot => ({ status, elapsedMs })
const ERR = { code: 'state.poisoned', message: 'x' }

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
  await flush()
}
const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
  await flush()
}
const key = (pressed: boolean, heldCount: number, repeat?: boolean) =>
  emit(
    'keyboard',
    repeat === undefined
      ? { pressed, heldCount, special: null, ts: Date.now() }
      : { pressed, heldCount, special: null, repeat, ts: Date.now() },
  )
const move = (x: number, y: number) => emit('mouseMove', { x, y, ts: Date.now() })
const click = (pressed: boolean) => emit('mouseButton', { button: 'left', pressed, ts: Date.now() })
const canvasOf = (c: HTMLElement) => c.querySelector('.canvas') as HTMLElement
const jelly = (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement
const pomo = (c: HTMLElement) => c.querySelector('.pomodoro') as HTMLElement | null
const textEl = (c: HTMLElement) => c.querySelector('.pomodoro > div') as HTMLElement
const ids = (el: Element) =>
  Array.from(el.children).map(ch => (ch.tagName === 'IMG' ? ch.getAttribute('src') : (ch.classList[0] ?? 'text')))
const stateSrc = (c: HTMLElement) =>
  c.querySelector('.jellyWrap > img[src="u:idle"], .jellyWrap > img[src="u:rest"]')?.getAttribute('src') ?? ''
const restingArgs = () => vi.mocked(setResting).mock.calls.map(c => c[0])
const pomoCalls = () => vi.mocked(findEntry).mock.calls.filter(c => c[1] === ('pomo_char' as unknown as AssetSlot)).length

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date', 'performance'] })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(withTimer(TIMER_ON))
  vi.mocked(getAssetManifest).mockResolvedValue(M_BOTH)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue(null)
  vi.mocked(setSettings).mockImplementation(async s => s)
  vi.mocked(getTimer).mockResolvedValue(snap('stopped', 0))
  vi.mocked(setResting).mockResolvedValue(snap('stopped', 0))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('OverlayApp — 뽀모도 자리 (design.md §10.14 14.1·14.3 ②)', () => {
  it('TC-282 ①: .canvas 자식 = [배경, .pomodoro, .jellyWrap], .pomodoro 안 = 인물 → 말풍선 → 글자, 조회 각 1회·구독 뒤 getTimer·setResting(false) 1회', async () => {
    const { container } = await mount()
    const canvas = canvasOf(container)
    expect(ids(canvas)).toEqual(['u:background', 'pomodoro', 'jellyWrap'])
    const p = pomo(container) as HTMLElement
    expect(ids(p)).toEqual(['u:pomo_char', 'u:pomo_bubble', 'text'])
    expect(textEl(container).textContent).toBe('00:00:00')
    expect(p.closest('.jellyWrap')).toBeNull()
    expect(jelly(container).querySelector('.pomodoro, img[src^="u:pomo"]')).toBeNull()
    for (const fn of [getSettings, getAssetManifest, getMonitors, getHandAnchor]) expect(fn).toHaveBeenCalledTimes(1)
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledWith()
    expect(vi.mocked(onTimerChanged).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(getTimer).mock.invocationCallOrder[0])
    expect(restingArgs()).toEqual([false])
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-282 ②: 타이머 꺼짐·뽀모도 그림 없음 → .pomodoro 없음, .canvas 자식 = [배경, .jellyWrap], 타이머 조회·구독 없음, setResting(false)는 보냄', async () => {
    vi.mocked(getSettings).mockResolvedValue(withTimer(TIMER_OFF))
    vi.mocked(getAssetManifest).mockResolvedValue(M_NONE)
    const { container } = await mount()
    expect(ids(canvasOf(container))).toEqual(['u:background', 'jellyWrap'])
    expect(pomo(container)).toBeNull()
    expect(container.textContent).toBe('')
    expect(onTimerChanged).not.toHaveBeenCalled()
    expect(getTimer).not.toHaveBeenCalled()
    expect(restingArgs()).toEqual([false])
  })

  it('TC-282 ③: 배경 없음 + 인물만·타이머 꺼짐 → .canvas 자식 = [.pomodoro, .jellyWrap], 글자는 멈춘 값 00:00:00', async () => {
    vi.mocked(getSettings).mockResolvedValue(withTimer(TIMER_OFF))
    vi.mocked(getAssetManifest).mockResolvedValue(M_NOBG_CHAR)
    const { container } = await mount()
    expect(ids(canvasOf(container))).toEqual(['pomodoro', 'jellyWrap'])
    expect(ids(pomo(container) as HTMLElement)).toEqual(['u:pomo_char', 'text'])
    expect(textEl(container).textContent).toBe('00:00:00')
  })
})

describe('OverlayApp — 격리·쉬는중 보고 (design.md §10.14 14.1 격리·14.4 쉬는중 보고 효과)', () => {
  it('TC-283: 키 누름 젤리·꾹 누름 부르르·이동·클릭·쉬는중에도 .pomodoro와 자손은 같은 노드·같은 속성, 애니메이션 클래스 없음', async () => {
    const { container } = await mount()
    const p = pomo(container) as HTMLElement
    const kids = Array.from(p.children)
    const html = kids.map(k => k.outerHTML)
    const check = () => {
      expect(pomo(container)).toBe(p)
      expect(p.className).toBe('pomodoro')
      expect(Array.from(p.children)).toEqual(kids)
      expect(Array.from(p.children).map(k => k.outerHTML)).toEqual(html)
      expect(p.querySelectorAll('.jelly, .jellyAlt, .shiver')).toHaveLength(0)
      expect(canvasOf(container).children[1]).toBe(p)
    }
    await key(true, 1)
    expect(jelly(container).className).toBe('jellyWrap jellyAlt')
    check()
    await key(true, 1, true)
    expect(jelly(container).className).toBe('jellyWrap shiver')
    check()
    await key(false, 0)
    expect(jelly(container).className).toBe('jellyWrap')
    await move(300, 300)
    await click(true)
    await click(false)
    check()
    await advance(301_000)
    expect(stateSrc(container)).toBe('u:rest')
    check()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-284: setResting = 마운트 false 1회, idle→rest true, rest→idle false(키·이동·클릭), 같은 layer 지속(tick·입력)엔 추가 호출 없음, 타이머 꺼짐과 무관', async () => {
    vi.mocked(getSettings).mockResolvedValue(withTimer(TIMER_OFF))
    vi.mocked(getAssetManifest).mockResolvedValue(M_NONE)
    const { container } = await mount()
    expect(restingArgs()).toEqual([false])
    await advance(1_000)
    await key(true, 1)
    await key(false, 0)
    await move(10, 10)
    expect(restingArgs()).toEqual([false])
    await advance(299_000)
    expect(restingArgs()).toEqual([false])
    await advance(2_000)
    expect(stateSrc(container)).toBe('u:rest')
    expect(restingArgs()).toEqual([false, true])
    await advance(60_000)
    expect(restingArgs()).toEqual([false, true])
    await key(true, 1)
    expect(stateSrc(container)).toBe('u:idle')
    expect(restingArgs()).toEqual([false, true, false])
    await key(false, 0)
    await advance(1_000)
    expect(restingArgs()).toEqual([false, true, false])
    await advance(301_000)
    expect(restingArgs()).toEqual([false, true, false, true])
    await move(20, 20)
    expect(restingArgs()).toEqual([false, true, false, true, false])
    await advance(301_000)
    await click(true)
    expect(restingArgs()).toEqual([false, true, false, true, false, true, false])
    await click(false)
    expect(setResting).toHaveBeenCalledTimes(7)
    expect(onTimerChanged).not.toHaveBeenCalled()
    expect(getTimer).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-285: setResting 실패는 무시 — 화면 그대로·문구 없음·재시도 없음, 다음 전이 때 다시 보냄', async () => {
    vi.mocked(setResting).mockRejectedValue(ERR)
    vi.mocked(getSettings).mockResolvedValue(withTimer(TIMER_OFF))
    vi.mocked(getAssetManifest).mockResolvedValue(M_NONE)
    const { container } = await mount()
    expect(restingArgs()).toEqual([false])
    await advance(5_000)
    expect(setResting).toHaveBeenCalledTimes(1)
    expect(canvasOf(container)).not.toBeNull()
    expect(container.textContent).toBe('')
    await advance(300_000)
    expect(stateSrc(container)).toBe('u:rest')
    expect(restingArgs()).toEqual([false, true])
    await advance(5_000)
    expect(setResting).toHaveBeenCalledTimes(2)
    await key(true, 1)
    expect(stateSrc(container)).toBe('u:idle')
    expect(restingArgs()).toEqual([false, true, false])
    expect(container.textContent).toBe('')
  })
})

describe('OverlayApp — 설정·이미지 변경과 시간 표시 (P-8 ①~⑤)', () => {
  it('TC-286 ①: settings://changed·assets://changed로 글자 표시·스타일·그림 즉시 반영, 조건 거짓이면 .pomodoro 제거·구독 해제, 재조회 없음', async () => {
    vi.mocked(getSettings).mockResolvedValue(withTimer(TIMER_OFF))
    vi.mocked(getAssetManifest).mockResolvedValue(M_NONE)
    const { container } = await mount()
    expect(pomo(container)).toBeNull()
    await emit('settingsChanged', withTimer(TIMER_ON))
    expect(ids(pomo(container) as HTMLElement)).toEqual(['text'])
    const t = textEl(container)
    expect(t.textContent).toBe('00:00:00')
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
    await emit('settingsChanged', withTimer(T2))
    expect(textEl(container)).toBe(t)
    expect(t.style.left).toBe('100px')
    expect(t.style.top).toBe('200px')
    expect(t.style.fontSize).toBe('48px')
    expect(t.style.color).toBe('rgb(255, 0, 0)')
    expect(t.style.transform).toBe('translate(-50%, -50%) rotate(-10deg)')
    await emit('assetsChanged', M_BOTH)
    expect(ids(pomo(container) as HTMLElement)).toEqual(['u:pomo_char', 'u:pomo_bubble', 'text'])
    expect(textEl(container)).toBe(t)
    await emit('settingsChanged', withTimer({ ...T2, enabled: false }))
    expect(textEl(container)).toBe(t)
    await emit('assetsChanged', M_NONE)
    expect(pomo(container)).toBeNull()
    expect(ids(canvasOf(container))).toEqual(['u:background', 'jellyWrap'])
    expect(h.unlisten.timer).toHaveBeenCalledTimes(1)
    for (const fn of [getSettings, getAssetManifest]) expect(fn).toHaveBeenCalledTimes(1)
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-286 ② (CR-058 개정): 설정에 timer 키가 없으면 DEFAULT_TIMER_SETTINGS(꺼짐·스톱워치·1500초·음량 44·268,402·7°·36px·#333333)로 그린다', async () => {
    // scenarios v1.9 개정(CR-050): contract v0.23 DEFAULT_TIMER_SETTINGS에 mode·countdownSecs·alarmVolume 추가
    // CR-053 개정(contract v0.24): textPos (268,403) → (142,458), rotation 5 → 9
    // CR-058 개정(0.4.0 기본 세트 🔒): textPos (142,458) → (268,402), rotation 9 → 7, alarmVolume 80 → 44. 나머지 불변
    expect(DEFAULT_TIMER_SETTINGS).toEqual({
      enabled: false,
      mode: 'stopwatch',
      countdownSecs: 1500,
      alarmVolume: 44,
      textPos: { x: 268, y: 402 },
      rotation: 7,
      fontSize: 36,
      color: '#333333',
    })
    const noTimer = { ...base } as Partial<Settings>
    delete noTimer.timer
    vi.mocked(getSettings).mockResolvedValue(noTimer as Settings)
    vi.mocked(getAssetManifest).mockResolvedValue(M_CHAR)
    const { container } = await mount()
    const t = textEl(container)
    expect(t.textContent).toBe('00:00:00')
    expect(t.style.left).toBe('268px')
    expect(t.style.top).toBe('402px')
    expect(t.style.fontSize).toBe('36px')
    expect(t.style.color).toBe('rgb(51, 51, 51)')
    expect(t.style.transform).toBe('translate(-50%, -50%) rotate(7deg)')
    await emit('assetsChanged', M_NONE)
    expect(pomo(container)).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-287: 시작 00:00:00(자동 시작 없음) → running 초마다 → 쉬는중 보고·restPaused 멈춤 → 입력 보고·running 재개 → 사용자 paused는 입력해도 멈춤 → 끔 = 멈춘 값 유지, 저장 없음', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { container } = await mount()
    const t = textEl(container)
    expect(t.textContent).toBe('00:00:00')
    await advance(5_000)
    expect(t.textContent).toBe('00:00:00')
    await emit('timer', snap('running', 0))
    expect(t.textContent).toBe('00:00:00')
    await advance(1_000)
    expect(t.textContent).toBe('00:00:01')
    await advance(294_100)
    expect(stateSrc(container)).toBe('u:rest')
    expect(restingArgs()).toEqual([false, true])
    expect(t.textContent).toBe('00:04:55')
    await emit('timer', snap('restPaused', 295_100))
    await advance(60_000)
    expect(t.textContent).toBe('00:04:55')
    await key(true, 1)
    await key(false, 0)
    expect(restingArgs()).toEqual([false, true, false])
    await emit('timer', snap('running', 295_100))
    await advance(5_000)
    expect(t.textContent).toBe('00:05:00')
    await emit('timer', snap('paused', 300_100))
    await advance(301_000)
    expect(restingArgs()).toEqual([false, true, false, true])
    await key(true, 1)
    await key(false, 0)
    expect(restingArgs()).toEqual([false, true, false, true, false])
    await advance(10_000)
    expect(t.textContent).toBe('00:05:00')
    await emit('timer', snap('running', 300_100))
    await advance(2_000)
    expect(t.textContent).toBe('00:05:02')
    await emit('settingsChanged', withTimer(TIMER_OFF))
    await emit('timer', snap('paused', 302_100))
    await advance(10_000)
    expect(textEl(container)).toBe(t)
    expect(t.textContent).toBe('00:05:02')
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('TC-288: 초 갱신·입력·tick으로는 PomodoroLayer를 다시 그리지 않음(OverlayApp·.jellyWrap도 초 갱신에 불변), settings.timer 새 참조면 다시 그림', async () => {
    const { container } = await mount()
    await emit('timer', snap('running', 0))
    const c0 = pomoCalls()
    const all0 = vi.mocked(findEntry).mock.calls.length
    const jw = jelly(container)
    const jwHtml = jw.outerHTML
    const t = textEl(container)
    await advance(3_000)
    expect(t.textContent).toBe('00:00:03')
    expect(pomoCalls()).toBe(c0)
    expect(vi.mocked(findEntry).mock.calls.length).toBe(all0)
    expect(jelly(container)).toBe(jw)
    expect(jw.outerHTML).toBe(jwHtml)
    await key(true, 1)
    await key(false, 0)
    await move(100, 100)
    await click(true)
    await click(false)
    await advance(1_000)
    expect(pomoCalls()).toBe(c0)
    expect(textEl(container)).toBe(t)
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(restingArgs()).toEqual([false])
    await emit('settingsChanged', withTimer({ ...TIMER_ON }))
    expect(pomoCalls()).toBeGreaterThan(c0)
    expect(textEl(container)).toBe(t)
  })
})
