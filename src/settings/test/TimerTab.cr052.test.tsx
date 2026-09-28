/**
 * 「타이머」 탭 CR-052 신규 스펙 — 카드 1 설명문 삭제·스톱워치 토글 설명 새 문장(3개 국어) · 미리 듣기 1회 재생 유지.
 * 근거: 확정사항 CR-048 블록 「수정 (CR-052)」 🔒 · src/settings/design/timer-tab.md §14.16(카드 1 설명문·미리 듣기 행)·§14.2 ·
 *       design/i18n.md(`timerCardDesc` 삭제 행·`timerStopwatchDesc`·`alarmCardDesc` CR-052 변경 행) ·
 *       scenarios.md 「CR-052 개정」 절 TC-289 · TC-290.
 * 옛 문구(대조용): 패킷 doc/200_설계/architecture/timer-mode-03-packet-ui.md §5 표(CR-050 당시 ja·en 열).
 * mock 은 TimerTab.test.tsx 와 같다(bridge/commands·공용 훅 2개·components/utils/alarmSound). 시간 의존 없음(가짜 시계·sleep 없음).
 * TimerTab.test.tsx 가 400줄 한계를 넘어 새 파일로 둔다.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { AlarmSound, AssetEntry, AssetManifest, AssetSlot, BridgeError, Settings, TimerSettings, TimerSnapshot } from 'bridge/types'
import { controlTimer, getAlarmSound, setSettings } from 'bridge/commands'
import { useTimerSnapshot } from 'components/hooks/useTimerSnapshot'
import { useElapsedText } from 'components/hooks/useElapsedText'
import { defaultAlarmUrl, playSound } from 'components/utils/alarmSound'
import TimerTab from '../components/TimerTab'
import { MessagesProvider } from '../i18n/MessagesContext'
import { ko } from '../i18n/ko'
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
    controlTimer: vi.fn(),
    getTimer: vi.fn(),
    getAlarmSound: vi.fn(),
    importAlarmSound: vi.fn(),
    removeAlarmSound: vi.fn(),
    pickAudioFile: vi.fn(),
  }
})
vi.mock('components/hooks/useTimerSnapshot', () => {
  const fn = vi.fn()
  return { useTimerSnapshot: fn, default: fn }
})
vi.mock('components/hooks/useElapsedText', () => {
  const fn = vi.fn()
  return { useElapsedText: fn, default: fn }
})
vi.mock('components/utils/alarmSound', () => ({ defaultAlarmUrl: vi.fn(), playSound: vi.fn(), alarmGain: vi.fn() }))

// ─── 픽스처 (TimerTab.test.tsx 와 같은 값) ─────────────────────────────────
const TF: TimerSettings = {
  enabled: false,
  textPos: { x: 268, y: 403 },
  rotation: 5,
  fontSize: 36,
  color: '#333333',
  mode: 'stopwatch',
  countdownSecs: 1500,
  alarmVolume: 80,
}
const SETTINGS: Settings = {
  scale: 1.5,
  idleSeconds: 120,
  overlay: { x: 30, y: 40, visible: true },
  mouse: null,
  autostart: false,
  language: 'ko',
  positionLock: false,
  showInTaskbar: false,
  timer: TF,
}
const S_CD: Settings = { ...SETTINGS, timer: { ...TF, enabled: true, mode: 'countdown' } }
const entry = (slot: AssetSlot): AssetEntry => ({
  slot,
  fileName: `${String(slot)}.png`,
  width: 800,
  height: 700,
  bytes: 1000,
  url: `asset://${String(slot)}.png`,
})
const POMO: AssetManifest = {
  canvas: { width: 800, height: 700 },
  entries: [entry('background'), entry('pomo_char'), entry('pomo_bubble'), entry('kb_up')],
}
const MP3: AlarmSound = { format: 'mp3', bytes: 312_004, url: 'asset://alarm.mp3?v=1' }

/** CR-052 확정 ko 문장(확정사항 CR-048 블록 「수정 (CR-052)」 원문) */
const KO_STOPWATCH_DESC =
  '말풍선 안에 0부터 올라가는 시간을 보여 줍니다. 쉬는중이 되면 저절로 멈추고, 다시 입력하면 이어서 흐릅니다.'
/** 옛 문구(CR-050 패킷 §5) — CR-052 뒤에는 어느 사전에도 없어야 한다 */
const OLD = {
  ko: { stopwatch: '00:00:00부터 올라갑니다. 쉬는중에는 자동으로 멈춥니다', alarm: '타이머가 0이 되면 한 번 울립니다' },
  ja: { stopwatch: '00:00:00から数えます。休憩中は自動で止まります', alarm: 'タイマーが0になると一度鳴ります' },
  en: { stopwatch: 'Counts up from 00:00:00. Pauses automatically while resting', alarm: 'Plays once when the timer reaches zero' },
} as const

let onError: Mock
let stops: Mock[] = []
beforeEach(() => {
  vi.resetAllMocks()
  onError = vi.fn()
  stops = []
  vi.mocked(useTimerSnapshot).mockImplementation(() => ({
    snapshot: { status: 'stopped', elapsedMs: 0 } as TimerSnapshot,
    receivedAt: 1,
  }))
  vi.mocked(useElapsedText).mockImplementation(() => '00:00:00')
  vi.mocked(setSettings).mockImplementation(async s => s)
  vi.mocked(getAlarmSound).mockResolvedValue(null)
  vi.mocked(defaultAlarmUrl).mockReturnValue('blob:default')
  vi.mocked(playSound).mockImplementation(() => {
    const stop = vi.fn()
    stops.push(stop)
    return stop
  })
})

// ─── 도우미 ────────────────────────────────────────────────────────────────
const renderTab = (s: Settings, language?: string) => {
  const tab = <TimerTab settings={s} manifest={POMO} onError={onError as (e: BridgeError | null) => void} />
  return render(language ? <MessagesProvider language={language}>{tab}</MessagesProvider> : tab)
}
const flush = () => act(async () => {})
const dictHas = (d: object, key: string) => Object.prototype.hasOwnProperty.call(d, key)

describe('TimerTab — CR-052 문구 (R-44 · R-49 · R-53 · R-55, §14.16 카드 1 설명문 · i18n timerCardDesc 삭제 · timerStopwatchDesc · alarmCardDesc)', () => {
  it('TC-289: ko·ja·en 사전에 timerCardDesc 키 없음, ko timerStopwatchDesc = 확정 문장, ja·en 은 비어 있지 않고 옛 문구·ko 와 다름(alarmCardDesc 도) · 탭에서 스톱워치 설명 문장이 정확히 1번(스톱워치 스위치 설명으로만)·옛 문구 없음', async () => {
    // ⓑ 사전(저장 값 자리 — 문구 단일 소스)
    for (const d of [ko, ja, en]) expect(dictHas(d, 'timerCardDesc')).toBe(false)
    expect(ko.timerStopwatchDesc).toBe(KO_STOPWATCH_DESC)
    expect(ko.timerStopwatchDesc).not.toBe(OLD.ko.stopwatch)
    expect(ko.alarmCardDesc).not.toBe(OLD.ko.alarm)
    for (const [lang, d] of [
      ['ja', ja],
      ['en', en],
    ] as const) {
      expect(d.timerStopwatchDesc.trim(), lang).not.toBe('')
      expect(d.timerStopwatchDesc, lang).not.toBe(OLD[lang].stopwatch)
      expect(d.timerStopwatchDesc, lang).not.toBe(ko.timerStopwatchDesc)
      expect(d.alarmCardDesc.trim(), lang).not.toBe('')
      expect(d.alarmCardDesc, lang).not.toBe(OLD[lang].alarm)
      expect(d.alarmCardDesc, lang).not.toBe(ko.alarmCardDesc)
    }

    // ⓐ 화면 — 언어마다 탭을 그려 스톱워치 설명 문장이 스위치 설명 한 곳에만 있는지
    for (const [lang, d] of [
      ['ko', ko],
      ['ja', ja],
      ['en', en],
    ] as const) {
      const r = renderTab(SETTINGS, lang === 'ko' ? undefined : lang)
      await flush()
      const hits = screen.getAllByText(d.timerStopwatchDesc)
      expect(hits, lang).toHaveLength(1)
      expect(hits[0].closest('[id="timer-stopwatch-desc"]'), lang).not.toBeNull()
      expect(screen.getByRole('switch', { name: d.timerStopwatchEnabled }), lang).toHaveAccessibleDescription(
        d.timerStopwatchDesc,
      )
      // 옛 문구(카드 머리 설명·옛 스위치 설명·옛 알림음 설명)는 화면 어디에도 없다
      expect(screen.queryByText(OLD[lang].stopwatch), lang).toBeNull()
      expect(screen.queryByText(OLD[lang].alarm), lang).toBeNull()
      expect(screen.getByText(d.alarmCardDesc), lang).toBeInTheDocument()
      r.unmount()
    }

    // ⓒ bridge — 문구 표시만, 저장·조작 0회(알림음 조회는 마운트마다 1회)
    expect(setSettings).not.toHaveBeenCalled()
    expect(controlTimer).not.toHaveBeenCalled()
    expect(getAlarmSound).toHaveBeenCalledTimes(3)
    expect(playSound).not.toHaveBeenCalled()
  })
})

describe('TimerTab — CR-052 미리 듣기 1회 재생 유지 (R-53 · R-54, §14.16 미리 듣기 행 · §14.7.3 onPreview)', () => {
  it('TC-290: 「미리 듣기」 → playSound(url, 0.8, onFail) 인자 3개(loop 없음 = 1회 재생) — 기본음 blob:default · 등록음 MP3.url, 다시 누르면 앞 소리 정지 뒤 다시 3개 인자, 실패 문구 없음, 저장·조작 0회', async () => {
    // ① 기본 알림음(등록 없음)
    const r = renderTab(S_CD)
    await flush()
    fireEvent.click(screen.getByRole('button', { name: '미리 듣기' }))
    // ⓒ 인자 — 정확히 3개, 4번째(loop) 없음
    expect(playSound).toHaveBeenCalledTimes(1)
    const first = vi.mocked(playSound).mock.calls[0] as unknown[]
    expect(first).toHaveLength(3)
    expect(first[0]).toBe('blob:default')
    expect(first[1]).toBe(0.8)
    expect(typeof first[2]).toBe('function')
    expect(first[3]).toBeUndefined()
    // ⓐ 실패 문구 없음
    expect(screen.queryByRole('alert')).toBeNull()
    r.unmount()

    // ② 등록한 알림음 · 다시 누름
    vi.mocked(getAlarmSound).mockResolvedValue(MP3)
    renderTab(S_CD)
    await flush()
    const preview = screen.getByRole('button', { name: '미리 듣기' })
    fireEvent.click(preview)
    fireEvent.click(preview)
    const calls = vi.mocked(playSound).mock.calls.slice(1) as unknown[][]
    expect(calls).toHaveLength(2)
    for (const c of calls) {
      expect(c).toHaveLength(3)
      expect(c[0]).toBe(MP3.url)
      expect(c[1]).toBe(0.8)
      expect(c[3]).toBeUndefined()
    }
    // ⓑ 다시 누르면 앞 소리(두 번째 호출의 정지 함수)를 먼저 멈춘다 — 반복 소리가 쌓이지 않음
    expect(stops[1]).toHaveBeenCalledTimes(1)
    expect(stops[2]).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
    // ⓒ 미리 듣기는 설정 저장·타이머 조작을 부르지 않는다
    expect(setSettings).not.toHaveBeenCalled()
    expect(controlTimer).not.toHaveBeenCalled()
  })
})
