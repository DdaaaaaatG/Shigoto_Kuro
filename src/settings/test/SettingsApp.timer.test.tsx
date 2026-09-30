/**
 * 설정 창 「타이머」 탭 통합 스펙(SettingsApp + TimerTab + 실물 공용 훅) — CR-045 · R-43 ~ R-45 · R-48 · R-27 · R-20
 * + CR-050 · R-49 ~ R-55(두 토글·시작 시간·끝남 깜빡임·알림음 카드).
 * 기준: timer-tab.md §1 ~ §13 + §14(CR-050 — 14.1 대체 목록 우선)·§14.9 T-8 ~ T-17·§14.10 계약 · i18n.md §4.9·§4.10
 *       · contract v0.23(get_timer·control_timer·timer://changed + get/import/remove_alarm_sound·pickAudioFile)
 *       · scenarios.md 「CR-045」 절 TC-247 · TC-266 · TC-267 · TC-FLOW-24 · TC-FLOW-27
 *       + 「CR-050 개정」 절 TC-279(오류 줄) · TC-282(탭 이동) · TC-FLOW-28 ~ TC-FLOW-30.
 * 공용 훅(components/hooks/useTimerSnapshot·useElapsedText)·timerClock 은 **실물** — bridge 만 mock. CR-050: 훅 호출은 TimerTab 에서
 * 1회(구독 1개 — getTimer 1회 유지). 소리는 components/utils/alarmSound mock(playSound → 정지 함수 vi.fn).
 * 표시 단언은 paused·stopped·finished 사진(흐르지 않음)과 running 직후(1초 미만 — 카운트다운은 올림 초)만 써서 실제 시간에 기대지 않는다.
 * 저장 인자의 timer 는 늘 { ...DEFAULT_TIMER_SETTINGS, ...settings.timer, ...변경 } 전체(8필드) — 픽스처 TF.
 * 선행: bridge v0.23 + overlay CR-050 공용 3모듈 + CR-050 화면. 구현 전 불일치는 예정된 Red.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { AlarmSound, AssetManifest, BridgeError, Settings, TimerSettings, TimerSnapshot } from 'bridge/types'
import {
  controlTimer,
  getAlarmSound,
  getAssetManifest,
  getSettings,
  getTimer,
  importAlarmSound,
  pickAudioFile,
  removeAlarmSound,
  setSettings,
  setSettingsWindowTitle,
} from 'bridge/commands'
import { onAssetsChanged, onSettingsChanged, onTimerChanged } from 'bridge/events'
import { playSound } from 'components/utils/alarmSound'
import SettingsApp from '../index'
import { ja } from '../i18n/ja'
import { en } from '../i18n/en'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))
vi.mock('bridge/commands', async importOriginal => {
  const actual = await importOriginal<typeof import('bridge/commands')>()
  return {
    ...actual, // toBridgeError 는 실물
    getSettings: vi.fn(),
    setSettings: vi.fn(),
    getAssetManifest: vi.fn(),
    importAsset: vi.fn(),
    removeAsset: vi.fn(),
    restoreDefaultAsset: vi.fn(),
    exportDefaultAssets: vi.fn(),
    pickFolder: vi.fn(),
    setAutostart: vi.fn(),
    pickPngFile: vi.fn(),
    resetOverlayPosition: vi.fn(),
    setSettingsWindowTitle: vi.fn(),
    getHandAnchor: vi.fn(),
    getTimer: vi.fn(), // v0.21
    controlTimer: vi.fn(), // v0.21
    setResting: vi.fn(), // v0.21 — 설정 창은 호출하지 않는다(overlay 몫)
    getAlarmSound: vi.fn(), // v0.23(CR-050)
    importAlarmSound: vi.fn(),
    removeAlarmSound: vi.fn(),
    pickAudioFile: vi.fn(),
  }
})
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
  onKeyboard: vi.fn(),
  onMouseMove: vi.fn(),
  onMouseButton: vi.fn(),
  onSettingsChanged: vi.fn(),
  onAssetsChanged: vi.fn(),
  onHandAnchorChanged: vi.fn(),
  onTimerChanged: vi.fn(),
}))
vi.mock('components/utils/alarmSound', () => ({ defaultAlarmUrl: vi.fn(), playSound: vi.fn(), alarmGain: vi.fn() }))

// ─── 픽스처 ────────────────────────────────────────────────────────────────
/** CR-045 모양(새 필드 없음 — 옛 settings.json) */
const T: TimerSettings = { enabled: false, textPos: { x: 268, y: 403 }, rotation: 5, fontSize: 36, color: '#333333' }
/** CR-050: DEFAULT_TIMER_SETTINGS v0.23 리터럴 */
const TF = { ...T, mode: 'stopwatch' as const, countdownSecs: 1500, alarmVolume: 44 } // CR-059: alarmVolume 은 T 에 없어 라이브 DEFAULT(44)로 채워진다
const SETTINGS: Settings = {
  scale: 1.5,
  idleSeconds: 120,
  overlay: { x: 30, y: 40, visible: true },
  mouse: null,
  autostart: false,
  language: 'ko',
  positionLock: false,
  showInTaskbar: false,
  timer: T,
}
/** 옛 설정 켜짐(mode 없음) = 스톱워치 켜짐 */
const S_ON: Settings = { ...SETTINGS, timer: { ...T, enabled: true } }
const S_CD: Settings = { ...SETTINGS, timer: { ...TF, enabled: true, mode: 'countdown' } }
const CANVAS = { width: 900, height: 700 }
const MANIFEST: AssetManifest = {
  canvas: CANVAS,
  entries: [
    { slot: 'kb_up', fileName: 'kb_up.png', width: 900, height: 700, bytes: 1000, url: 'asset://kb_up.png' },
    { slot: 'mouse_base', fileName: 'mouse_base.png', width: 200, height: 150, bytes: 1000, url: 'asset://mouse_base.png' },
  ],
}
const WITH_POMO: AssetManifest = {
  ...MANIFEST,
  entries: [
    ...MANIFEST.entries,
    { slot: 'pomo_char', fileName: 'pomo_char.png', width: 900, height: 700, bytes: 1000, url: 'asset://pomo_char.png' },
    { slot: 'pomo_bubble', fileName: 'pomo_bubble.png', width: 900, height: 700, bytes: 1000, url: 'asset://pomo_bubble.png' },
  ],
}
const STOPPED: TimerSnapshot = { status: 'stopped', elapsedMs: 0 }
/** 카운트다운 사진(core 규칙: finished 는 elapsedMs = durationMs) */
const CD = (status: TimerSnapshot['status'], elapsedMs: number, durationMs = 1_500_000): TimerSnapshot => ({
  status,
  elapsedMs,
  mode: 'countdown',
  durationMs,
})
const MP3: AlarmSound = { format: 'mp3', bytes: 312_004, url: 'asset://alarm.mp3?v=1' }
const DISABLED: BridgeError = {
  code: 'timer.disabled',
  message: '스톱워치나 타이머가 꺼져 있습니다. 먼저 둘 중 하나를 켜 주세요.', // contract v0.23 §6
}
const NOT_AUDIO: BridgeError = { code: 'sound.not_audio', message: 'wav·mp3·ogg 소리 파일이 아닙니다.' }
const TOO_BIG: BridgeError = { code: 'sound.too_many_bytes', message: '알림음 파일은 1MB 이하여야 합니다. (현재 2000000바이트)' }
const LOCKED = '멈춤 상태에서 바꿀 수 있습니다'

// ─── 이벤트 흉내 ───────────────────────────────────────────────────────────
let emitSettings: (s: Settings) => void = () => {}
let emitAssets: (m: AssetManifest) => void = () => {}
let emitTimer: (s: TimerSnapshot) => void = () => {}
const unlistenTimer = vi.fn()
let order: string[] = []
let stops: Mock[] = []

beforeEach(() => {
  vi.resetAllMocks()
  order = []
  stops = []
  document.documentElement.lang = ''
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(MANIFEST)
  vi.mocked(setSettingsWindowTitle).mockResolvedValue(undefined)
  vi.mocked(setSettings).mockImplementation(async s => s)
  vi.mocked(controlTimer).mockImplementation(async () => STOPPED)
  vi.mocked(getAlarmSound).mockResolvedValue(null)
  vi.mocked(removeAlarmSound).mockResolvedValue(undefined)
  vi.mocked(playSound).mockImplementation(() => {
    const stop = vi.fn()
    stops.push(stop)
    return stop
  })
  vi.mocked(getTimer).mockImplementation(async () => {
    order.push('get')
    return STOPPED
  })
  vi.mocked(onSettingsChanged).mockImplementation(cb => {
    emitSettings = cb
    return Promise.resolve(vi.fn())
  })
  vi.mocked(onAssetsChanged).mockImplementation(cb => {
    emitAssets = cb
    return Promise.resolve(vi.fn())
  })
  vi.mocked(onTimerChanged).mockImplementation(cb => {
    order.push('sub')
    emitTimer = cb
    return Promise.resolve(unlistenTimer)
  })
})

// ─── 도우미 ────────────────────────────────────────────────────────────────
const mount = async () => {
  const utils = render(<SettingsApp />)
  await waitFor(() => {
    expect(getSettings).toHaveBeenCalled()
    expect(getAssetManifest).toHaveBeenCalled()
  })
  await act(async () => {})
  return utils
}
const tablist = (name = '설정 탭') => screen.getByRole('tablist', { name })
const allTabs = (listName?: string) => within(tablist(listName)).getAllByRole('tab')
const tabBtn = (name: string, listName?: string) => within(tablist(listName)).getByRole('tab', { name })
const h1Texts = () => screen.queryAllByRole('heading', { level: 1 }).map(h => h.textContent)
const h2Texts = () => screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)
const panel = () => screen.getByRole('tabpanel')
const openTimer = async (name = '타이머', listName?: string) => {
  fireEvent.click(tabBtn(name, listName))
  await waitFor(() => expect(getTimer).toHaveBeenCalled())
  await act(async () => {})
}
const timeText = () => screen.getByTestId('timer-text').textContent
const timeClass = () => screen.getByTestId('timer-text').className
const swSw = (name = '스톱워치 사용') => screen.getByRole('switch', { name })
const swCd = (name = '타이머 사용') => screen.getByRole('switch', { name })
const checked = () => [swSw().getAttribute('aria-checked'), swCd().getAttribute('aria-checked')]
const ctlButtons = (name = '타이머 조작') => within(screen.getByRole('group', { name })).getAllByRole('button')
const ctl = (label: string) => within(screen.getByRole('group', { name: '타이머 조작' })).getByRole('button', { name: label })
const btn = (name: string) => screen.getByRole('button', { name })
const field = (name: string) => screen.getByRole('textbox', { name }) as HTMLInputElement
const hmsValues = () => ['시', '분', '초'].map(n => field(n).value)
const hmsDisabled = () => ['시', '분', '초'].map(n => field(n).disabled)
const durationMsg = () => document.getElementById('timer-duration-msg')?.textContent
const alertText = () => screen.getByRole('alert').textContent
const out = (id: string) => document.querySelector(`output[for="${id}"]`)?.textContent
const saved = (n: number) => vi.mocked(setSettings).mock.calls[n][0]
const soundStatus = () => screen.getByText(/^지금:/).textContent

describe('SettingsApp — 「타이머」 탭 (R-44·R-27·R-48, T-1)', () => {
  it('TC-247 (CR-050 개정): 메뉴 4번째 「타이머」 — 열면 h1·패널·카드 3장, 구독 먼저 → getTimer 1회(TimerTab 한 곳) → 00:00:00, 알림음 조회 1회, 다른 탭으로 가면 구독 해제, bridge 저장·조작 없음', async () => {
    await mount()
    expect(allTabs().map(t => t.textContent)).toEqual(['기본 설정', '이미지 설정', '어깨축·손 위치', '타이머', '프리셋']) // CR-064: 다섯째 프리셋
    const timerTab = allTabs()[3]
    expect(timerTab).toHaveAttribute('id', 'settings-tab-timer')
    expect(timerTab).toHaveAttribute('aria-controls', 'settings-panel-timer')
    const svg = timerTab.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(timerTab).toHaveAccessibleName('타이머')
    // ⓒ 열기 전: 타이머 조회·구독·알림음 조회 없음
    expect(getTimer).not.toHaveBeenCalled()
    expect(onTimerChanged).not.toHaveBeenCalled()
    expect(getAlarmSound).not.toHaveBeenCalled()
    await openTimer()
    expect(h1Texts()).toEqual(['타이머'])
    expect(panel()).toHaveAttribute('id', 'settings-panel-timer')
    expect(panel()).toHaveAttribute('aria-labelledby', 'settings-tab-timer')
    expect(timerTab).toHaveAttribute('aria-selected', 'true')
    expect(h2Texts()).toEqual(['뽀모도 타이머', '알림음', '시간 글자'])
    expect(timeText()).toBe('00:00:00')
    // ⓑ 구독 1개(TimerTab) — 구독 먼저 → 조회 1회
    expect(order).toEqual(['sub', 'get'])
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledWith()
    expect(getAlarmSound).toHaveBeenCalledTimes(1)
    fireEvent.click(tabBtn('기본 설정'))
    await act(async () => {})
    expect(unlistenTimer).toHaveBeenCalledTimes(1)
    tabBtn('기본 설정').focus()
    // CR-064: End 는 이제 다섯째(프리셋)로 가므로 ArrowDown 3번으로 넷째 타이머에 간다
    for (let i = 0; i < 3; i += 1) fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowDown' })
    await waitFor(() => expect(getTimer).toHaveBeenCalledTimes(2))
    expect(h1Texts()).toEqual(['타이머'])
    expect(allTabs()[3]).toHaveFocus()
    expect(setSettings).not.toHaveBeenCalled()
    expect(controlTimer).not.toHaveBeenCalled()
  })

  it('TC-247(ja) (CR-050 개정): 저장 언어 ja — 메뉴 4번째·h1 = ja.tabTimer, 카드 제목 3장 ja', async () => {
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS, language: 'ja' })
    await mount()
    await waitFor(() => expect(allTabs(ja.tabsAria).map(t => t.textContent)[3]).toBe(ja.tabTimer))
    await openTimer(ja.tabTimer, ja.tabsAria)
    expect(h1Texts()).toEqual([ja.tabTimer])
    expect(h2Texts()).toEqual([ja.timerCardTitle, ja.alarmCardTitle, ja.timerTextTitle])
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-266: timer://changed → 글자 갱신, settings://changed → 스위치(옛 설정 켜짐 = 스톱워치)·버튼·슬라이더 표시, assets://changed → 미리보기 합성(T-7)', async () => {
    await mount()
    await openTimer()
    act(() => emitTimer({ status: 'paused', elapsedMs: 754_000 }))
    expect(timeText()).toBe('00:12:34')
    act(() => emitTimer({ status: 'restPaused', elapsedMs: 3_723_000 }))
    expect(timeText()).toBe('01:02:03')
    act(() => emitTimer(STOPPED))
    expect(timeText()).toBe('00:00:00')
    expect(checked()).toEqual(['false', 'false'])
    act(() => emitSettings({ ...S_ON, timer: { ...S_ON.timer, rotation: 30, fontSize: 60, color: '#112233' } }))
    expect(checked()).toEqual(['true', 'false'])
    for (const b of ctlButtons()) expect(b).toBeEnabled()
    expect([out('timer-rotation'), out('timer-size'), out('timer-color')]).toEqual(['30°', '60px', '#112233'])
    act(() => emitAssets(WITH_POMO))
    const srcs = Array.from(screen.getByRole('group', { name: '시간 글자 위치 미리보기' }).querySelectorAll('img')).map(i =>
      i.getAttribute('src'),
    )
    expect(srcs).toEqual(['asset://pomo_char.png', 'asset://pomo_bubble.png', 'asset://kb_up.png'])
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
    expect(controlTimer).not.toHaveBeenCalled()
  })

  it('TC-267: 조작 실패 오류 줄 — ko 는 core message(v0.23 새 원문), ja·en 은 errors["timer.disabled"], 다음 조작이 성공하면 오류 줄이 지워진다', async () => {
    vi.mocked(getSettings).mockResolvedValue(S_ON)
    vi.mocked(controlTimer).mockRejectedValueOnce(DISABLED)
    await mount()
    await openTimer()
    fireEvent.click(ctl('시작'))
    await waitFor(() => expect(alertText()).toBe(`오류: ${DISABLED.message}`))
    act(() => emitSettings({ ...S_ON, language: 'ja' }))
    expect(alertText()).toBe(`${ja.errorPrefix} ${ja.errors['timer.disabled']}`)
    act(() => emitSettings({ ...S_ON, language: 'en' }))
    expect(alertText()).toBe(`${en.errorPrefix} ${en.errors['timer.disabled']}`)
    act(() => emitSettings(S_ON))
    fireEvent.click(ctl('시작'))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(vi.mocked(controlTimer).mock.calls).toEqual([['start'], ['start']])
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('SettingsApp — 알림음 카드 통합 (R-53 · R-55, T-13 · T-17)', () => {
  it('TC-279(오류 줄): 등록 실패 — ja 대화상자 제목 = ja.alarmPickTitle, 오류 줄 ja·en = errors["sound.*"], ko = core message, 상태 문구 불변', async () => {
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS, language: 'ja' })
    vi.mocked(pickAudioFile).mockResolvedValue('C:/sounds/notes.txt')
    vi.mocked(importAlarmSound).mockRejectedValueOnce(NOT_AUDIO).mockRejectedValueOnce(TOO_BIG)
    await mount()
    await waitFor(() => expect(allTabs(ja.tabsAria).map(t => t.textContent)[3]).toBe(ja.tabTimer))
    await openTimer(ja.tabTimer, ja.tabsAria)
    fireEvent.click(btn(ja.alarmImport))
    // ⓐ ja 오류 줄
    await waitFor(() => expect(alertText()).toBe(`${ja.errorPrefix} ${ja.errors['sound.not_audio']}`))
    // ⓒ 대화상자 제목 = 현재 언어
    expect(vi.mocked(pickAudioFile).mock.calls[0]).toEqual([ja.alarmPickTitle])
    act(() => emitSettings({ ...SETTINGS, language: 'en' }))
    expect(alertText()).toBe(`${en.errorPrefix} ${en.errors['sound.not_audio']}`)
    fireEvent.click(btn(en.alarmImport))
    await waitFor(() => expect(alertText()).toBe(`${en.errorPrefix} ${en.errors['sound.too_many_bytes']}`))
    expect(vi.mocked(pickAudioFile).mock.calls[1]).toEqual([en.alarmPickTitle])
    expect(screen.getByText(en.alarmCurrentDefault)).toBeInTheDocument()
    // ko = core message
    act(() => emitSettings(SETTINGS))
    expect(alertText()).toBe(`오류: ${TOO_BIG.message}`)
    expect(soundStatus()).toBe('지금: 기본 알림음')
    // ⓑ 저장 없음
    expect(setSettings).not.toHaveBeenCalled()
    expect(vi.mocked(importAlarmSound).mock.calls).toEqual([['C:/sounds/notes.txt'], ['C:/sounds/notes.txt']])
  })

  it('TC-282(탭 이동): 미리 듣기 재생 중 다른 메뉴(기본 설정)로 옮기면 정지 함수 1회', async () => {
    await mount()
    await openTimer()
    fireEvent.click(btn('미리 듣기'))
    expect(playSound).toHaveBeenCalledTimes(1)
    expect(stops[0]).not.toHaveBeenCalled()
    fireEvent.click(tabBtn('기본 설정'))
    await act(async () => {})
    // ⓒ 정지 1회 · ⓐ 타이머 탭 사라짐
    expect(stops[0]).toHaveBeenCalledTimes(1)
    expect(h1Texts()).toEqual(['기본 설정'])
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('TC-FLOW (S-23 · S-26 · S-27 · S-28 · S-29)', () => {
  it('TC-FLOW-24 (CR-050 개정): (S-23) 「스톱워치 사용」을 켜고 시작 → 일시정지 → 멈춤(00:00:00) → 끄면 시간이 멈춘 채로 보이고 버튼이 잠긴다', async () => {
    await mount()
    await openTimer()
    expect(timeText()).toBe('00:00:00')
    // Step 2 TC-250(켜기 부분) — 전체 timer 로 저장
    fireEvent.click(swSw())
    await waitFor(() => expect(setSettings).toHaveBeenCalledTimes(1))
    const S1: Settings = { ...SETTINGS, timer: { ...TF, enabled: true, mode: 'stopwatch' } }
    expect(saved(0)).toStrictEqual(S1)
    act(() => emitSettings(S1))
    expect(checked()).toEqual(['true', 'false'])
    // Step 3 TC-253 + TC-266
    fireEvent.click(ctl('시작'))
    await waitFor(() => expect(controlTimer).toHaveBeenCalledTimes(1))
    act(() => emitTimer({ status: 'running', elapsedMs: 0 }))
    expect(timeText()).toBe('00:00:00')
    await waitFor(() => expect(ctl('일시정지')).toBeEnabled())
    fireEvent.click(ctl('일시정지'))
    await waitFor(() => expect(controlTimer).toHaveBeenCalledTimes(2))
    act(() => emitTimer({ status: 'paused', elapsedMs: 5_000 }))
    expect(timeText()).toBe('00:00:05')
    await waitFor(() => expect(ctl('멈춤')).toBeEnabled())
    fireEvent.click(ctl('멈춤'))
    await waitFor(() => expect(controlTimer).toHaveBeenCalledTimes(3))
    act(() => emitTimer(STOPPED))
    expect(timeText()).toBe('00:00:00')
    await waitFor(() => expect(ctl('시작')).toBeEnabled())
    fireEvent.click(ctl('시작'))
    await waitFor(() => expect(controlTimer).toHaveBeenCalledTimes(4))
    act(() => emitTimer({ status: 'paused', elapsedMs: 8_000 }))
    // Step 4 TC-251·TC-252(끄기 — mode 유지)
    fireEvent.click(swSw())
    await waitFor(() => expect(setSettings).toHaveBeenCalledTimes(2))
    const S2: Settings = { ...SETTINGS, timer: { ...TF, enabled: false, mode: 'stopwatch' } }
    expect(saved(1)).toStrictEqual(S2)
    act(() => emitSettings(S2))
    expect(timeText()).toBe('00:00:08')
    for (const b of ctlButtons()) expect(b).toBeDisabled()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(vi.mocked(controlTimer).mock.calls).toEqual([['start'], ['pause'], ['stop'], ['start']])
  })

  it('TC-FLOW-27: (S-26) 다음 날 다시 켠 앱 — 00:00:00(stopped)·켜짐(옛 설정 = 스톱워치)·글자 자리·회전·크기·색 저장값 그대로, 시작을 눌러야 흐른다', async () => {
    const SAVED: Settings = {
      ...SETTINGS,
      timer: { enabled: true, textPos: { x: 500, y: 300 }, rotation: -10, fontSize: 48, color: '#ff0000' },
    }
    vi.mocked(getSettings).mockResolvedValue(SAVED)
    await mount()
    await openTimer()
    expect(timeText()).toBe('00:00:00')
    expect(checked()).toEqual(['true', 'false'])
    for (const b of ctlButtons()) expect(b).toBeEnabled()
    expect([out('timer-rotation'), out('timer-size'), out('timer-color')]).toEqual(['-10°', '48px', '#ff0000'])
    const t = screen.getByTestId('timer-text')
    expect([t.style.left, t.style.top]).toEqual(['500px', '300px'])
    expect(t.style.transform).toBe('translate(-50%, -50%) rotate(-10deg)')
    expect(controlTimer).not.toHaveBeenCalled()
    fireEvent.click(ctl('시작'))
    await waitFor(() => expect(controlTimer).toHaveBeenCalledTimes(1))
    expect(controlTimer).toHaveBeenCalledWith('start')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-FLOW-28: (S-27) 스톱워치가 켜진 채 「타이머 사용」을 켜면 스톱워치가 꺼지고 → 시작 시간 00:10:00 → 시작 → 잠김 → 멈춤 → 풀림 → 끄기', async () => {
    vi.mocked(getSettings).mockResolvedValue(S_ON)
    await mount()
    await openTimer()
    expect(checked()).toEqual(['true', 'false'])
    // Step 1 TC-271(전환 부분) — 한 번의 저장으로 전환
    fireEvent.click(swCd())
    await waitFor(() => expect(setSettings).toHaveBeenCalledTimes(1))
    const S1: Settings = { ...S_ON, timer: { ...TF, enabled: true, mode: 'countdown' } }
    expect(saved(0)).toStrictEqual(S1)
    act(() => emitSettings(S1))
    act(() => emitTimer(CD('stopped', 0))) // core: 모드 바뀜 → 대기(지정 시간)
    expect(checked()).toEqual(['false', 'true'])
    expect(timeText()).toBe('00:25:00')
    expect(hmsValues()).toEqual(['00', '25', '00'])
    // Step 2 TC-274(저장 부분) — 00:10:00
    fireEvent.change(field('분'), { target: { value: '10' } })
    fireEvent.focusOut(field('분'), { relatedTarget: null })
    await waitFor(() => expect(setSettings).toHaveBeenCalledTimes(2))
    const S2: Settings = { ...S1, timer: { ...S1.timer, countdownSecs: 600 } }
    expect(saved(1)).toStrictEqual(S2)
    act(() => emitSettings(S2))
    act(() => emitTimer(CD('stopped', 0, 600_000)))
    expect(hmsValues()).toEqual(['00', '10', '00'])
    expect(timeText()).toBe('00:10:00')
    // Step 3 TC-253(시작) + TC-276(잠금)
    await waitFor(() => expect(ctl('시작')).toBeEnabled())
    fireEvent.click(ctl('시작'))
    await waitFor(() => expect(controlTimer).toHaveBeenCalledTimes(1))
    act(() => emitTimer(CD('running', 0, 600_000)))
    expect(timeText()).toBe('00:10:00') // 올림 초 — 받은 직후
    expect(hmsDisabled()).toEqual([true, true, true])
    expect(durationMsg()).toBe(LOCKED)
    // Step 4 멈춤 → 지정 시간 대기 → 풀림
    await waitFor(() => expect(ctl('멈춤')).toBeEnabled())
    fireEvent.click(ctl('멈춤'))
    await waitFor(() => expect(controlTimer).toHaveBeenCalledTimes(2))
    act(() => emitTimer(CD('stopped', 0, 600_000)))
    expect(hmsDisabled()).toEqual([false, false, false])
    expect(durationMsg()).toBe('')
    expect(timeText()).toBe('00:10:00')
    // Step 5 TC-271(끄기 부분) — mode 유지
    fireEvent.click(swCd())
    await waitFor(() => expect(setSettings).toHaveBeenCalledTimes(3))
    const S3: Settings = { ...S2, timer: { ...S2.timer, enabled: false } }
    expect(saved(2)).toStrictEqual(S3)
    act(() => emitSettings(S3))
    expect(checked()).toEqual(['false', 'false'])
    for (const b of ctlButtons()) expect(b).toBeDisabled()
    // CR-052: 끄면 타이머 모드가 아니라 시작 시간 세 칸도 회색 비활성, 안내 줄은 빈 값(옛 기대 [false,false,false])
    expect(hmsDisabled()).toEqual([true, true, true])
    expect(durationMsg()).toBe('')
    // ⓑ 오류 없음 ⓒ 조작 인자
    expect(screen.queryByRole('alert')).toBeNull()
    expect(vi.mocked(controlTimer).mock.calls).toEqual([['start'], ['stop']])
  })

  it('TC-FLOW-29: (S-28) finished 수신 → 미리보기 00:00:00 깜빡임(설정 창은 소리 없음) → 시작 = 새 회차 → 다시 finished → 멈춤 → 지정 시간 대기·깜빡임 끝', async () => {
    vi.mocked(getSettings).mockResolvedValue(S_CD)
    await mount()
    await openTimer()
    // Step 1 TC-284(끝남 부분)
    act(() => emitTimer(CD('finished', 1_500_000)))
    expect(timeText()).toBe('00:00:00')
    expect(timeClass()).toMatch(/blink/)
    expect(hmsDisabled()).toEqual([true, true, true])
    // Step 2 TC-253(시작 부분) — 끝남 중 시작 = 새 회차(core)
    await waitFor(() => expect(ctl('시작')).toBeEnabled())
    fireEvent.click(ctl('시작'))
    await waitFor(() => expect(controlTimer).toHaveBeenCalledTimes(1))
    act(() => emitTimer(CD('running', 0)))
    expect(timeText()).toBe('00:25:00')
    expect(timeClass()).not.toMatch(/blink/)
    // Step 3 다시 끝남 → 멈춤
    act(() => emitTimer(CD('finished', 1_500_000)))
    expect(timeClass()).toMatch(/blink/)
    await waitFor(() => expect(ctl('멈춤')).toBeEnabled())
    fireEvent.click(ctl('멈춤'))
    await waitFor(() => expect(controlTimer).toHaveBeenCalledTimes(2))
    act(() => emitTimer(CD('stopped', 0)))
    expect(timeText()).toBe('00:25:00')
    expect(timeClass()).not.toMatch(/blink/)
    expect(hmsDisabled()).toEqual([false, false, false])
    // ⓒ 조작 인자 · 저장 없음 · 알람 재생 없음(오버레이만 — R-52)
    expect(vi.mocked(controlTimer).mock.calls).toEqual([['start'], ['stop']])
    expect(setSettings).not.toHaveBeenCalled()
    expect(playSound).not.toHaveBeenCalled()
  })

  it('TC-FLOW-30 (CR-058 개정): (S-29) mp3 등록 → 미리 듣기(44%) → 음량 40 저장 → 다시 미리 듣기(40%) → 잘못된 파일 오류 줄·문구 불변 → 기본값으로 되돌림·오류 줄 지움', async () => {
    await mount()
    await openTimer()
    expect(soundStatus()).toBe('지금: 기본 알림음')
    // Step 1 TC-278(등록 부분)
    vi.mocked(pickAudioFile).mockResolvedValueOnce('C:/sounds/bell.mp3')
    vi.mocked(importAlarmSound).mockResolvedValueOnce(MP3)
    fireEvent.click(btn('파일 등록'))
    await waitFor(() => expect(soundStatus()).toBe('지금: 등록한 알림음 (MP3 · 305 KB)'))
    // Step 2 TC-281(미리 듣기 부분) — CR-058: SETTINGS.timer=T 에 alarmVolume 없음 → 라이브 DEFAULT(44%) = 0.44
    fireEvent.click(btn('미리 듣기'))
    expect(vi.mocked(playSound).mock.calls[0]).toEqual([MP3.url, 0.44, expect.any(Function)])
    // Step 3 TC-283(음량 부분) — 저장 뒤 settings://changed 가 Step 4 의 Given
    fireEvent.change(screen.getByRole('slider', { name: '음량' }), { target: { value: '40' } })
    fireEvent.pointerUp(screen.getByRole('slider', { name: '음량' }))
    await waitFor(() => expect(setSettings).toHaveBeenCalledTimes(1))
    const S1: Settings = { ...SETTINGS, timer: { ...TF, alarmVolume: 40 } }
    expect(saved(0)).toStrictEqual(S1)
    act(() => emitSettings(S1))
    expect(out('alarm-volume')).toBe('40%')
    // Step 4 TC-281(다시 누름 부분)
    fireEvent.click(btn('미리 듣기'))
    expect(stops[0]).toHaveBeenCalledTimes(1)
    expect(vi.mocked(playSound).mock.calls[1]).toEqual([MP3.url, 0.4, expect.any(Function)])
    // Step 5 TC-279(실패 부분)
    vi.mocked(pickAudioFile).mockResolvedValueOnce('C:/sounds/notes.txt')
    vi.mocked(importAlarmSound).mockRejectedValueOnce(NOT_AUDIO)
    fireEvent.click(btn('파일 등록'))
    await waitFor(() => expect(alertText()).toBe(`오류: ${NOT_AUDIO.message}`))
    expect(soundStatus()).toBe('지금: 등록한 알림음 (MP3 · 305 KB)')
    // Step 6 TC-280(기본값 부분)
    fireEvent.click(btn('기본값'))
    await waitFor(() => expect(soundStatus()).toBe('지금: 기본 알림음'))
    expect(stops[1]).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(btn('기본값')).toBeDisabled()
    // ⓒ 호출 인자 합계
    expect(vi.mocked(pickAudioFile).mock.calls).toEqual([['소리 파일 선택'], ['소리 파일 선택']])
    expect(vi.mocked(importAlarmSound).mock.calls).toEqual([['C:/sounds/bell.mp3'], ['C:/sounds/notes.txt']])
    expect(removeAlarmSound).toHaveBeenCalledTimes(1)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(controlTimer).not.toHaveBeenCalled()
  })
})
