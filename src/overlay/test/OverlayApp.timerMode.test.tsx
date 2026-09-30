/**
 * 타이머 모드 화면 통합 TC — CR-050(R-37·R-38·R-39).
 * 근거: design.md §10.15 15.1(표시 규칙)·15.2(알림음 판정표·반복 없음)·15.3(useAlarmOnFinish 위치 = TimerText — 구독·조회 1개,
 *   OverlayApp 변경 없음, 끝남 중 끄기 → 언마운트 halt)·15.4, §6 P-9, §7 CR-050 행, design/components.md §3.y·규칙 9,
 *   requirements R-37~R-39·§2 S-19·S-20.
 * 대상: src/overlay/index.tsx(OverlayApp, 불변) + TimerText(개정)·useAlarmOnFinish·alarmSound·timerClock(CR-050) — 구현 전 red(정상).
 * bridge mock(vi.mock 'bridge/commands'·'bridge/events') — 실제 Tauri API import 없음. core의 카운트다운 판정(0 도달·10초 뒤 stopped)은
 *   흉내 내지 않는다: 테스트가 core가 보냈을 timer://changed를 직접 넣는다. Audio는 전역 스텁(FakeAudio).
 *   (CR-058, doc-sync 2026-09-30) 기본음은 번들 mp3 자산 URL(src/components/utils/alarmSound.ts `defaultAlarmUrl`)이라
 *   옛 URL.createObjectURL stub은 삭제했다 — 어떤 코드도 부르지 않고 어떤 TC도 관찰하지 않았다(기대 불변).
 *   가짜 시계(performance 포함). 실제 sleep 없음.
 * 시나리오: src/overlay/test/scenarios.md TC-307 ~ TC-309, TC-313(음량 배선 — TimerSettings.alarmVolume → alarmGain → Audio.volume)
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  getAlarmSound,
  getAssetManifest,
  getHandAnchor,
  getMonitors,
  getSettings,
  getTimer,
  onTimerChanged,
  setResting,
  setSettings,
  type AlarmSound,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type ScreenBounds,
  type Settings,
  type TimerSettings,
  type TimerSnapshot,
  type TimerStatus,
} from 'bridge'
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
  getAlarmSound: vi.fn(),
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
vi.mock('../components/TimerText.module.css', () => ({ default: { blink: 'blink' } }))

// ─── Audio 스텁 ────────────────────────────────────────────────────────────
const fa = { instances: [] as FakeAudio[] }
class FakeAudio {
  src: string
  volume = 1
  loop = false
  currentTime = 0
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  constructor(src: string) {
    this.src = src
    fa.instances.push(this)
  }
}

// ─── 픽스처 ───────────────────────────────────────────────────────────────
const T0 = 1_700_000_000_000
const DUR = 1_500_000
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
const M_BOTH: AssetManifest = { canvas: CANVAS, entries: [...BASE, entry('pomo_bubble'), entry('pomo_char')] }
/** 타이머(카운트다운) 켜짐 — 뽀모도 그림이 없어도 U-1(enabled)로 글자가 마운트된다 */
const CD_ON: TimerSettings = {
  enabled: true,
  mode: 'countdown',
  countdownSecs: 1500,
  alarmVolume: 80,
  textPos: { x: 268, y: 403 },
  rotation: 5,
  fontSize: 36,
  color: '#333333',
}
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
const cd = (status: TimerStatus, elapsedMs: number): TimerSnapshot => ({ status, elapsedMs, mode: 'countdown', durationMs: DUR })
const USER: AlarmSound = { format: 'mp3', bytes: 1_000, url: 'u:alarm' }

// ─── 헬퍼 ────────────────────────────────────────────────────────────────
const flush = () =>
  act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve()
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
const pomo = (c: HTMLElement) => c.querySelector('.pomodoro') as HTMLElement | null
const textEl = (c: HTMLElement) => c.querySelector('.pomodoro > div') as HTMLElement

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date', 'performance'] })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  fa.instances = []
  vi.stubGlobal('Audio', FakeAudio)
  vi.mocked(getSettings).mockResolvedValue(withTimer(CD_ON))
  vi.mocked(getAssetManifest).mockResolvedValue(M_NONE)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue(null)
  vi.mocked(setSettings).mockImplementation(async s => s)
  vi.mocked(getTimer).mockResolvedValue(cd('stopped', 0))
  vi.mocked(setResting).mockResolvedValue(cd('stopped', 0))
  vi.mocked(getAlarmSound).mockResolvedValue(USER)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('OverlayApp — 타이머 모드 통합 (design.md §10.15, §6 P-9)', () => {
  it('TC-307 (CR-055 개정): 대기 00:25:00 → 시작·1초 00:24:59 → finished 00:00:00·.blink·알림음 1회 재생(0.8·loop false) → 10초 동안 오버레이는 스스로 끄지 않음 → stopped .blink 없음·pause·00:25:00, 구독·조회 각 1회', async () => {
    const { container } = await mount()
    const t = textEl(container)
    expect(t.textContent).toBe('00:25:00')
    expect(t.getAttribute('class')).toBeNull()
    await emit('timer', cd('running', 0))
    expect(t.textContent).toBe('00:25:00')
    await advance(1_000)
    expect(t.textContent).toBe('00:24:59')
    await emit('timer', cd('finished', DUR))
    expect(textEl(container)).toBe(t)
    expect(t.textContent).toBe('00:00:00')
    expect(t.className).toBe('blink')
    expect(getAlarmSound).toHaveBeenCalledTimes(1)
    expect(getAlarmSound).toHaveBeenCalledWith()
    expect(fa.instances).toHaveLength(1)
    const a = fa.instances[0]
    expect(a.src).toBe('u:alarm')
    expect(a.volume).toBe(0.8)
    expect(a.play).toHaveBeenCalledTimes(1)
    expect(a.loop).toBe(false) // CR-055 — 1회 재생(R-39 「반복 없음」, CR-052 반복 재생 폐기)
    await advance(10_000)
    expect(t.className).toBe('blink')
    expect(a.pause).not.toHaveBeenCalled()
    expect(fa.instances).toHaveLength(1)
    a.currentTime = 2
    await emit('timer', cd('stopped', 0))
    expect(t.getAttribute('class')).toBeNull()
    expect(t.textContent).toBe('00:25:00')
    expect(a.pause).toHaveBeenCalledTimes(1)
    expect(a.currentTime).toBe(0)
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(getAlarmSound).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-308 ①: 끝남 중 끄기(settings://changed enabled false, 그림 없음) → TimerText 언마운트 → 소리 pause 1회·구독 해제', async () => {
    const { container } = await mount()
    await emit('timer', cd('running', DUR - 1_000))
    await emit('timer', cd('finished', DUR))
    expect(fa.instances).toHaveLength(1)
    const a = fa.instances[0]
    await emit('settingsChanged', withTimer({ ...CD_ON, enabled: false }))
    expect(pomo(container)).toBeNull()
    expect(a.pause).toHaveBeenCalledTimes(1)
    expect(a.currentTime).toBe(0)
    expect(h.unlisten.timer).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-308 ②: 앱 시작 때 첫 getTimer가 이미 finished → 00:00:00 깜빡임은 있음, getAlarmSound·Audio 0회, 이어서 stopped면 깜빡임만 사라짐', async () => {
    vi.mocked(getTimer).mockResolvedValue(cd('finished', DUR))
    const { container } = await mount()
    const t = textEl(container)
    expect(t.textContent).toBe('00:00:00')
    expect(t.className).toBe('blink')
    expect(getAlarmSound).not.toHaveBeenCalled()
    expect(fa.instances).toHaveLength(0)
    await emit('timer', cd('stopped', 0))
    expect(t.getAttribute('class')).toBeNull()
    expect(t.textContent).toBe('00:25:00')
    expect(getAlarmSound).not.toHaveBeenCalled()
    expect(fa.instances).toHaveLength(0)
  })

  it('TC-309: 끝남 깜빡임 중 키 누름 젤리 — .blink는 글자 div에만, .jellyWrap에 젤리 클래스, .pomodoro·뽀모도 img에 .blink·.jelly·.shiver 없음(규칙 8·9)', async () => {
    vi.mocked(getAssetManifest).mockResolvedValue(M_BOTH)
    const { container } = await mount()
    await emit('timer', cd('finished', DUR))
    await emit('keyboard', { pressed: true, heldCount: 1, special: null, ts: Date.now() })
    const jw = container.querySelector('.jellyWrap') as HTMLElement
    expect(jw.classList.contains('jelly') || jw.classList.contains('jellyAlt')).toBe(true)
    expect(jw.classList.contains('blink')).toBe(false)
    const p = pomo(container) as HTMLElement
    expect(p.className).toBe('pomodoro')
    const blinking = Array.from(container.querySelectorAll('.blink'))
    expect(blinking).toHaveLength(1)
    expect(blinking[0]).toBe(p.lastElementChild)
    expect(blinking[0]).toBe(textEl(container))
    for (const img of Array.from(p.querySelectorAll('img'))) expect(img.className).toBe('layer')
    expect(p.querySelectorAll('.jelly, .jellyAlt, .shiver')).toHaveLength(0)
    await emit('keyboard', { pressed: false, heldCount: 0, special: null, ts: Date.now() })
    expect(textEl(container).className).toBe('blink')
    expect(fa.instances).toHaveLength(1)
  })

  it('TC-313: 음량 배선 — 설정 alarmVolume 30 → finished에 Audio.volume 0.3, 마운트 중 settings://changed로 50 → 다음 회차 Audio.volume 0.5(앞 회차 0.3 불변), 재조회·재구독 없음', async () => {
    vi.mocked(getSettings).mockResolvedValue(withTimer({ ...CD_ON, alarmVolume: 30 }))
    const { container } = await mount()
    const t = textEl(container)
    await emit('timer', cd('running', 0))
    await emit('timer', cd('finished', DUR))
    expect(fa.instances).toHaveLength(1)
    const first = fa.instances[0]
    expect(first.src).toBe('u:alarm')
    expect(first.volume).toBe(0.3)
    expect(first.play).toHaveBeenCalledTimes(1)
    expect(getAlarmSound).toHaveBeenCalledTimes(1)
    expect(getAlarmSound).toHaveBeenLastCalledWith()
    await emit('timer', cd('stopped', 0))
    expect(first.pause).toHaveBeenCalledTimes(1)
    await emit('settingsChanged', withTimer({ ...CD_ON, alarmVolume: 50 }))
    expect(textEl(container)).toBe(t)
    expect(t.textContent).toBe('00:25:00')
    await emit('timer', cd('running', 0))
    await emit('timer', cd('finished', DUR))
    expect(t.className).toBe('blink')
    expect(fa.instances).toHaveLength(2)
    const second = fa.instances[1]
    expect(second.src).toBe('u:alarm')
    expect(second.volume).toBe(0.5)
    expect(second.play).toHaveBeenCalledTimes(1)
    expect(first.volume).toBe(0.3)
    expect(getAlarmSound).toHaveBeenCalledTimes(2)
    expect(getAlarmSound).toHaveBeenLastCalledWith()
    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })
})
