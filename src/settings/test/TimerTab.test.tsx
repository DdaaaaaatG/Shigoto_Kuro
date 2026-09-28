/**
 * 「타이머」 탭(TimerTab) 스펙 — CR-045 · R-43 ~ R-47 · R-20 + CR-050 · R-49 ~ R-55(타이머 모드).
 * 기준: src/settings/design/timer-tab.md §1 ~ §13(CR-045) + **§14(CR-050 — 14.1 대체 목록이 옛 서술보다 우선)**·
 *       design/i18n.md §4.9·§4.10 · scenarios.md 「CR-045」 절 TC-248 ~ TC-259 · TC-268 · TC-FLOW-26
 *       + 「CR-050 개정」 절 TC-270 ~ TC-276 · TC-283 ~ TC-285 · TC-287.
 * CR-050 저장 인자 규칙: setSettings 의 timer 는 늘 { ...DEFAULT_TIMER_SETTINGS, ...settings.timer, ...변경 } 전체(8필드) —
 *   픽스처 TF(= DEFAULT 리터럴). SETTINGS.timer = T 는 옛 모양(새 필드 없음)이라 fullTimer 가 채우는지도 함께 본다.
 * 스위치 2개: 「스톱워치 사용」·「타이머 사용」(CR-045 의 「타이머 사용」 단언은 「스톱워치 사용」으로 옮겼다 — 옛 설정 = 스톱워치).
 * useTimerSnapshot 호출은 TimerTab 으로 옮겨졌다(§14.4 — 자식 TimerPreview 에 snapshot·receivedAt 전달).
 * bridge 는 mock(vi.mock('bridge/commands') — toBridgeError·bridge/types 상수 실물). 공용 훅(useTimerSnapshot·useElapsedText)·
 * components/utils/alarmSound 는 mock, timerClock(isTimerBlinking·timerTextStyle)은 실물.
 * 시간 의존 = 슬라이더 키보드 저장 지연 300ms(SCALE_KEY_COMMIT_MS)뿐 — TC-256 만 vi.useFakeTimers({ toFake: setTimeout·clearTimeout }).
 * 비동기 대기는 deferred promise + act. 실제 sleep 없음.
 * 선행: bridge v0.23 + overlay CR-050 공용 3모듈 + 화면(TimerTab·CountdownTimeInput·AlarmSoundCard·TimerPreview·useSliderDraft·
 *       timerValues·i18n §4.10). 구현 전 import 오류·기대 불일치는 예정된 Red.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type {
  AlarmSound,
  AssetEntry,
  AssetManifest,
  AssetSlot,
  BridgeError,
  Settings,
  TimerSettings,
  TimerSnapshot,
} from 'bridge/types'
import { controlTimer, getAlarmSound, getTimer, setSettings } from 'bridge/commands'
import { useTimerSnapshot } from 'components/hooks/useTimerSnapshot'
import { useElapsedText } from 'components/hooks/useElapsedText'
import { playSound } from 'components/utils/alarmSound'
import TimerTab from '../components/TimerTab'
import { MessagesProvider } from '../i18n/MessagesContext'
import { format } from '../i18n/index'
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
    controlTimer: vi.fn(), // v0.21
    getTimer: vi.fn(), // v0.21 — 공용 훅이 mock 이라 호출되지 않는다
    getAlarmSound: vi.fn(), // v0.23(CR-050) — AlarmSoundCard 마운트
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

// ─── jsdom 포인터 보강 (MousePartsTab.test.tsx 와 같음) ─────────────────────
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number
    readonly pointerType: string
    readonly isPrimary: boolean
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.pointerType = init.pointerType ?? 'mouse'
      this.isPrimary = init.isPrimary ?? true
    }
  }
  Object.defineProperty(window, 'PointerEvent', { configurable: true, writable: true, value: PointerEventStub })
}
const installPointerCapture = () => {
  const held = new Set<number>()
  const methods: [string, Mock][] = [
    ['setPointerCapture', vi.fn((id: number) => void held.add(id))],
    ['releasePointerCapture', vi.fn((id: number) => void held.delete(id))],
    ['hasPointerCapture', vi.fn((id: number) => held.has(id))],
  ]
  for (const [name, fn] of methods) {
    Object.defineProperty(Element.prototype, name, { configurable: true, writable: true, value: fn })
  }
}

// ─── 픽스처 ────────────────────────────────────────────────────────────────
/** CR-045 모양(새 필드 없음 — 옛 settings.json). contract v0.21 DEFAULT 의 앞 5필드 리터럴 */
const T: TimerSettings = { enabled: false, textPos: { x: 268, y: 403 }, rotation: 5, fontSize: 36, color: '#333333' }
/** CR-050: contract v0.23 DEFAULT_TIMER_SETTINGS 리터럴(독립 대조) — 저장 인자 timer 의 바탕 */
const TF = { ...T, mode: 'stopwatch' as const, countdownSecs: 1500, alarmVolume: 44 } // CR-059: alarmVolume 은 T 에 없어 라이브 DEFAULT(44)로 채워진다
/** 옛 설정 켜짐(mode 없음) → 스톱워치 켜짐으로 읽힌다(R-49 결정) */
const T_ON: TimerSettings = { ...T, enabled: true }
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
const S_ON: Settings = { ...SETTINGS, timer: T_ON }
const S_SW: Settings = { ...SETTINGS, timer: { ...TF, enabled: true, mode: 'stopwatch' } }
const S_CD: Settings = { ...SETTINGS, timer: { ...TF, enabled: true, mode: 'countdown' } }
const S_CD_OFF: Settings = { ...SETTINGS, timer: { ...TF, enabled: false, mode: 'countdown' } }
const C800 = { width: 800, height: 700 }
const entry = (slot: AssetSlot): AssetEntry => ({
  slot,
  fileName: `${String(slot)}.png`,
  width: 800,
  height: 700,
  bytes: 1000,
  url: `asset://${String(slot)}.png`,
})
const POMO: AssetManifest = {
  canvas: C800,
  entries: [entry('background'), entry('pomo_char'), entry('pomo_bubble'), entry('kb_up')],
}
const MP3: AlarmSound = { format: 'mp3', bytes: 312_004, url: 'asset://alarm.mp3?v=1' }
const SAVE_ERR: BridgeError = { code: 'settings.invalid', message: '설정값이 올바르지 않습니다: timer (테스트)' }
const DISABLED: BridgeError = {
  code: 'timer.disabled',
  message: '스톱워치나 타이머가 꺼져 있습니다. 먼저 둘 중 하나를 켜 주세요.', // contract v0.23 §6 새 원문
}
const KO_CARD_DESC =
  '말풍선 안에 0부터 올라가는 시간을 보여 줍니다. 쉬는중이 되면 저절로 멈추고, 다시 입력하면 이어서 흐릅니다.' // §14.15 현행 유지
const LOCKED = '멈춤 상태에서 바꿀 수 있습니다'
const INVALID = '00:00:01 ~ 99:59:59 사이로 입력해 주세요'
type Status = TimerSnapshot['status']
const snap = (status: Status, elapsedMs = 0, mode?: 'stopwatch' | 'countdown', durationMs?: number) => ({
  snapshot: {
    status,
    elapsedMs,
    ...(mode ? { mode } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
  } as TimerSnapshot,
  receivedAt: 1,
})
const cd = (status: Status, elapsedMs = 0) => snap(status, elapsedMs, 'countdown', 1_500_000)

const deferred = <V,>() => {
  let resolve!: (v: V) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<V>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let onError: Mock
let snapNow = snap('stopped')
beforeEach(() => {
  vi.resetAllMocks()
  installPointerCapture()
  onError = vi.fn()
  snapNow = snap('stopped')
  vi.mocked(useTimerSnapshot).mockImplementation(() => snapNow)
  vi.mocked(useElapsedText).mockImplementation(() => '00:00:00')
  vi.mocked(setSettings).mockImplementation(async s => s)
  vi.mocked(controlTimer).mockImplementation(async () => ({ status: 'running', elapsedMs: 0 }))
  vi.mocked(getAlarmSound).mockResolvedValue(null)
  vi.mocked(playSound).mockImplementation(() => vi.fn())
})
afterEach(() => {
  vi.useRealTimers()
})

// ─── 도우미 ────────────────────────────────────────────────────────────────
const tree = (s: Settings, m: AssetManifest, language?: string) => {
  const tab = <TimerTab settings={s} manifest={m} onError={onError as (e: BridgeError | null) => void} />
  return language ? <MessagesProvider language={language}>{tab}</MessagesProvider> : tab
}
const renderTab = (s: Settings = SETTINGS, m: AssetManifest = POMO, language?: string) => {
  const utils = render(tree(s, m, language))
  return { ...utils, update: (ns: Settings, nm: AssetManifest = m) => utils.rerender(tree(ns, nm, language)) }
}
const swSw = (name = '스톱워치 사용') => screen.getByRole('switch', { name })
const swCd = (name = '타이머 사용') => screen.getByRole('switch', { name })
const checked = () => [swSw().getAttribute('aria-checked'), swCd().getAttribute('aria-checked')]
const controls = (name = '타이머 조작') => screen.getByRole('group', { name })
const ctlButtons = (name?: string) => within(controls(name)).getAllByRole('button')
const ctl = (label: string) => within(controls()).getByRole('button', { name: label })
const rot = (name = '회전') => screen.getByRole('slider', { name })
const size = (name = '크기') => screen.getByRole('slider', { name })
const vol = (name = '음량') => screen.getByRole('slider', { name })
const color = (name = '글자 색') => screen.getByLabelText(name) as HTMLInputElement
const field = (name: string) => screen.getByRole('textbox', { name }) as HTMLInputElement
const hms = (names = ['시', '분', '초']) => names.map(field)
const hmsValues = () => hms().map(f => f.value)
const durationMsg = () => document.getElementById('timer-duration-msg')?.textContent
const btn = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement
const h2s = () => screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)
const out = (id: string) => document.querySelector(`output[for="${id}"]`)?.textContent
const text = () => screen.getByTestId('timer-text')
const saved = (n: number) => vi.mocked(setSettings).mock.calls[n][0]
const flush = () => act(async () => {})
const focusables = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input, [tabindex]')).filter(
    e => !(e as HTMLButtonElement).disabled,
  )

describe('TimerTab — 레이아웃·초기 표시 (R-43 ~ R-47 · R-49 ~ R-54, §1.2·§6·§9 → §14.2·§14.8·§14.11)', () => {
  it('TC-248 (CR-050·CR-058 개정): 카드 3장 문구·두 스위치(설명)·시작 시간 00:25:00·버튼 3·새 멈춤 안내·알림음 카드(기본·44%)·미리보기·슬라이더·색이 저장값으로, bridge 저장·조작 없음', async () => {
    renderTab(SETTINGS)
    await flush()
    // ⓐ 화면(ko — i18n §4.9·§4.10). 본문 region(X-1)
    expect(screen.getByRole('region', { name: '타이머' })).toBeInTheDocument()
    expect(h2s()).toEqual(['뽀모도 타이머', '알림음', '시간 글자'])
    // CR-052: 카드 1 머리 설명문 삭제 — 같은 문장은 스톱워치 스위치 설명 한 곳뿐(TC-289)
    expect(screen.getAllByText(KO_CARD_DESC)).toHaveLength(1)
    expect(checked()).toEqual(['false', 'false'])
    expect(swSw()).toHaveAccessibleDescription(KO_CARD_DESC)
    expect(swCd()).toHaveAccessibleDescription('정한 시간부터 0까지 내려갑니다. 쉬는중에도 계속 줄어듭니다')
    expect(screen.getByRole('group', { name: '시작 시간' })).toBeInTheDocument()
    expect(hmsValues()).toEqual(['00', '25', '00'])
    // CR-052: 둘 다 꺼짐 = 타이머 모드 아님 → 세 칸 회색 비활성(disabled·aria-disabled), 안내 줄 빈 값
    for (const f of hms()) {
      expect(f).toBeDisabled()
      expect(f).toHaveAttribute('aria-disabled', 'true')
    }
    expect(durationMsg()).toBe('')
    expect(screen.getByText('최대 99:59:59')).toBeInTheDocument()
    expect(ctlButtons().map(b => b.textContent)).toEqual(['시작', '일시정지', '멈춤'])
    for (const b of ctlButtons()) {
      expect(b).toHaveAttribute('type', 'button')
      expect(b).toBeDisabled() // 둘 다 꺼짐
    }
    expect(screen.getByText('멈춤을 누르면 처음 시간으로 돌아갑니다')).toBeInTheDocument()
    expect(screen.queryByText('멈춤을 누르면 00:00:00으로 돌아갑니다')).toBeNull()
    expect(screen.getByText('타이머가 0이 되면 깜빡이는 10초 동안 반복해서 울립니다')).toBeInTheDocument() // CR-052
    expect(screen.queryByText('타이머가 0이 되면 한 번 울립니다')).toBeNull()
    expect(screen.getByText('지금: 기본 알림음')).toBeInTheDocument()
    expect([btn('파일 등록').disabled, btn('미리 듣기').disabled, btn('기본값').disabled]).toEqual([false, false, true])
    expect(screen.getByText('wav·mp3·ogg, 1MB 이하')).toBeInTheDocument()
    expect(vol()).toHaveValue('44') // CR-058: T 에 alarmVolume 없음 → fullTimer 가 라이브 DEFAULT(44)로 채운다
    expect(vol()).toHaveAttribute('aria-valuetext', '44%')
    expect(out('alarm-volume')).toBe('44%')
    expect(
      screen.getByText(
        '미리보기에서 글자를 끌어 자리를 옮기고, 아래에서 회전·크기·색을 고릅니다. 뽀모도 인물·말풍선 그림은 「이미지 설정」 탭의 배경 그룹에서 넣습니다.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '시간 글자 위치 미리보기' })).toBeInTheDocument()
    expect(rot()).toHaveAttribute('min', '-180')
    expect(rot()).toHaveAttribute('max', '180')
    expect(rot()).toHaveValue('5')
    expect(out('timer-rotation')).toBe('5°')
    expect(size()).toHaveAttribute('min', '12')
    expect(size()).toHaveAttribute('max', '200')
    expect(size()).toHaveValue('36')
    expect(out('timer-size')).toBe('36px')
    expect(color()).toHaveAttribute('type', 'color')
    expect(color()).toHaveValue('#333333')
    // ⓑ 상태: 미리보기 표시값 = 저장값
    expect(text().style.transform).toBe('translate(-50%, -50%) rotate(5deg)')
    expect(text().style.fontSize).toBe('36px')
    expect(text().className).not.toMatch(/blink/)
    // ⓒ bridge: 알림음 조회 1회 외 없음
    expect(getAlarmSound).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
    expect(controlTimer).not.toHaveBeenCalled()
    expect(getTimer).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-285: 카드 순서 뽀모도 타이머 → 알림음 → 시간 글자, Tab 순서(§14.11) — 끔·파일 없음 / 타이머 흐르는 중(잠김)·파일 있음', async () => {
    const r1 = renderTab(SETTINGS)
    await flush()
    expect(h2s()).toEqual(['뽀모도 타이머', '알림음', '시간 글자'])
    // 끔: 세 버튼·「기본값」 건너뜀, 시·분·초도 건너뜀(CR-052 — 타이머 모드가 아니면 disabled)
    expect(focusables(r1.container)).toEqual([
      swSw(),
      swCd(),
      btn('파일 등록'),
      btn('미리 듣기'),
      vol(),
      rot(),
      size(),
      color(),
    ])
    r1.unmount()
    // CR-052: 스톱워치 켜짐(stopped) → 세 버튼 포함, 시·분·초 건너뜀
    const r0 = renderTab(S_SW)
    await flush()
    expect(focusables(r0.container)).toEqual([swSw(), swCd(), ...ctlButtons(), btn('파일 등록'), btn('미리 듣기'), vol(), rot(), size(), color()])
    r0.unmount()
    // CR-052: 타이머 켜짐·stopped → 시·분·초가 입력 가능한 유일한 경우(스위치 → 시·분·초 → 세 버튼)
    snapNow = cd('stopped')
    const r3 = renderTab(S_CD)
    await flush()
    expect(focusables(r3.container)).toEqual([swSw(), swCd(), ...hms(), ...ctlButtons(), btn('파일 등록'), btn('미리 듣기'), vol(), rot(), size(), color()])
    r3.unmount()
    // 타이머 켜짐 + running(잠김) + 사용자 파일: 시·분·초 건너뜀, 세 버튼·「기본값」 포함
    vi.mocked(getAlarmSound).mockResolvedValueOnce(MP3)
    snapNow = cd('running', 1000)
    const r2 = renderTab(S_CD)
    await flush()
    expect(focusables(r2.container)).toEqual([
      swSw(),
      swCd(),
      ...ctlButtons(),
      btn('파일 등록'),
      btn('미리 듣기'),
      btn('기본값'),
      vol(),
      rot(),
      size(),
      color(),
    ])
    // ⓒ 조회만(마운트마다 1회 — CR-052 사례 2개 추가로 4회)
    expect(getAlarmSound).toHaveBeenCalledTimes(4)
    expect(setSettings).not.toHaveBeenCalled()
    expect(controlTimer).not.toHaveBeenCalled()
  })

  it('TC-249 (CR-050·CR-058 개정): settings.timer 없음(옛 값) → DEFAULT 로 보이고(두 스위치 꺼짐·회전 7·글자 268,402·00:25:00·44%), 「스톱워치 사용」 저장 인자 = { ...DEFAULT_TIMER_SETTINGS, enabled: true, mode: "stopwatch" } 전체', async () => {
    const rest: Partial<Settings> = { ...SETTINGS }
    delete rest.timer
    const OLD = rest as unknown as Settings
    renderTab(OLD)
    await flush()
    // ⓐ 기본값(리터럴 — CR-058 0.4.0 기본 세트: textPos (268,402)·rotation 7·alarmVolume 44. 공용 픽스처 T·TF 는 옛 값 그대로 둔다)
    expect(checked()).toEqual(['false', 'false'])
    expect(rot()).toHaveValue('7')
    expect(size()).toHaveValue('36')
    expect(color()).toHaveValue('#333333')
    expect([text().style.left, text().style.top]).toEqual(['268px', '402px'])
    expect(hmsValues()).toEqual(['00', '25', '00'])
    expect(vol()).toHaveValue('44')
    fireEvent.click(swSw())
    await flush()
    // ⓒ 전체 timer 객체 — DEFAULT 리터럴(TF 의 textPos·rotation·alarmVolume 을 CR-058 값으로 덮어씀)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(saved(0)).toStrictEqual({
      ...OLD,
      timer: { ...TF, textPos: { x: 268, y: 402 }, rotation: 7, alarmVolume: 44, enabled: true, mode: 'stopwatch' },
    })
    // ⓑ onError(null)
    expect(onError.mock.calls).toEqual([[null]])
  })
})

describe('TimerTab — 두 토글 (R-49, §14.7.1 onToggleMode · T-8·T-9)', () => {
  it('TC-270: 토글 표시 — 둘 다 꺼짐 · 스톱워치 켜짐 · 타이머 켜짐 · 옛 설정(mode 없음, enabled true) → 스톱워치 켜짐 · 꺼진 타이머 모드 → 둘 다 꺼짐', async () => {
    const { update } = renderTab(SETTINGS)
    await flush()
    const cases: [Settings, [string, string]][] = [
      [SETTINGS, ['false', 'false']],
      [S_SW, ['true', 'false']],
      [S_CD, ['false', 'true']],
      [S_ON, ['true', 'false']],
      [S_CD_OFF, ['false', 'false']],
    ]
    for (const [s, expected] of cases) {
      update(s)
      // ⓐ·ⓑ 표시값 = timerToggles(fullTimer(settings.timer))
      expect(checked(), JSON.stringify(s.timer)).toEqual(expected)
    }
    // ⓒ 표시만으로 저장·조작 없음
    expect(setSettings).not.toHaveBeenCalled()
    expect(controlTimer).not.toHaveBeenCalled()
  })

  it('TC-271: 토글 저장 인자 — 켜기·전환 = { enabled: true, mode } 한 번, 끄기 = { enabled: false }(모드 유지), 나머지 필드(countdownSecs·alarmVolume·글자 4필드) 늘 포함·불변, 확인창 없음', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const CUSTOM: Settings = {
      ...SETTINGS,
      timer: {
        enabled: true,
        mode: 'countdown',
        countdownSecs: 3723,
        alarmVolume: 40,
        textPos: { x: 500, y: 120 },
        rotation: -30,
        fontSize: 80,
        color: '#ff0000',
      },
    }
    const cases: [string, Settings, () => HTMLElement, Settings][] = [
      ['끔 → 스톱워치 켜기(옛 모양)', SETTINGS, swSw, { ...SETTINGS, timer: { ...TF, enabled: true, mode: 'stopwatch' } }],
      ['스톱워치 → 타이머 전환', S_ON, swCd, { ...S_ON, timer: { ...TF, enabled: true, mode: 'countdown' } }],
      ['타이머 → 스톱워치 전환', S_CD, swSw, { ...S_CD, timer: { ...TF, enabled: true, mode: 'stopwatch' } }],
      ['타이머 끄기(모드 유지)', S_CD, swCd, { ...S_CD, timer: { ...TF, enabled: false, mode: 'countdown' } }],
      ['스톱워치 끄기(옛 모양)', S_ON, swSw, { ...S_ON, timer: { ...TF, enabled: false, mode: 'stopwatch' } }],
      ['꺼진 타이머 모드 → 스톱워치 켜기', S_CD_OFF, swSw, { ...S_CD_OFF, timer: { ...TF, enabled: true, mode: 'stopwatch' } }],
      ['나머지 필드 불변', CUSTOM, swSw, { ...CUSTOM, timer: { ...CUSTOM.timer, mode: 'stopwatch' } }],
    ]
    for (const [i, [label, given, target, expected]] of cases.entries()) {
      const r = renderTab(given)
      await flush()
      fireEvent.click(target())
      await flush()
      // ⓒ 한 번 · 전체 timer
      expect(vi.mocked(setSettings).mock.calls, label).toHaveLength(i + 1)
      expect(saved(i), label).toStrictEqual(expected)
      r.unmount()
    }
    // ⓑ 매번 오류 줄 지움 · ⓐ 확인창 없음
    expect(onError.mock.calls).toEqual(cases.map(() => [null]))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(controlTimer).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('TC-272: 토글 저장 중 — 두 스위치 aria-busy·disabled·낙관 갱신 없음, 세 버튼 disabled, 어느 스위치든 다시 눌러도 0회 · 실패 → onError 1회·두 스위치 저장값 그대로·busy 해제', async () => {
    const save = deferred<Settings>()
    vi.mocked(setSettings).mockReturnValueOnce(save.promise)
    renderTab(S_ON) // 스톱워치 켜짐 → 버튼 활성
    await flush()
    fireEvent.click(swCd())
    expect(setSettings).toHaveBeenCalledTimes(1)
    // ⓐ 저장 중
    for (const s of [swSw(), swCd()]) {
      expect(s).toHaveAttribute('aria-busy', 'true')
      expect(s).toBeDisabled()
    }
    expect(checked()).toEqual(['true', 'false'])
    for (const b of ctlButtons()) expect(b).toBeDisabled()
    fireEvent.click(swSw())
    fireEvent.click(swCd())
    expect(setSettings).toHaveBeenCalledTimes(1)
    await act(async () => save.reject(SAVE_ERR))
    // ⓑ 오류 1회(던지지 않음)
    expect(onError.mock.calls).toEqual([[{ code: SAVE_ERR.code, message: SAVE_ERR.message }]])
    // ⓐ 원래 값·busy 해제·버튼 활성
    expect(checked()).toEqual(['true', 'false'])
    for (const s of [swSw(), swCd()]) {
      expect(s).not.toHaveAttribute('aria-busy')
      expect(s).toBeEnabled()
    }
    for (const b of ctlButtons()) expect(b).toBeEnabled()
    // ⓒ 인자 · 재시도 없음
    expect(saved(0)).toStrictEqual({ ...S_ON, timer: { ...TF, enabled: true, mode: 'countdown' } })
    expect(controlTimer).not.toHaveBeenCalled()
  })

  it('TC-250 (CR-050 개정): 켜기 — 저장 중 두 스위치 busy·세 버튼 비활성, setSettings 1회 { ...DEFAULT, enabled: true, mode: "stopwatch" }, 응답 뒤 오류 줄 지움, 표시는 저장값만 따른다', async () => {
    const save = deferred<Settings>()
    vi.mocked(setSettings).mockReturnValue(save.promise)
    const { update } = renderTab(SETTINGS)
    await flush()
    fireEvent.click(swSw())
    // ⓒ bridge
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(saved(0)).toStrictEqual({ ...SETTINGS, timer: { ...TF, enabled: true, mode: 'stopwatch' } })
    // ⓐ 저장 중
    expect(swSw()).toHaveAttribute('aria-busy', 'true')
    expect(swCd()).toHaveAttribute('aria-busy', 'true')
    expect(checked()).toEqual(['false', 'false'])
    for (const b of ctlButtons()) expect(b).toBeDisabled()
    fireEvent.click(swSw())
    expect(setSettings).toHaveBeenCalledTimes(1)
    await act(async () => save.resolve(S_SW))
    // ⓑ 상태
    expect(onError.mock.calls).toEqual([[null]])
    expect(swSw()).not.toHaveAttribute('aria-busy')
    expect(checked()).toEqual(['false', 'false']) // props 가 아직 옛 값
    update(S_SW) // settings://changed
    expect(checked()).toEqual(['true', 'false'])
    for (const b of ctlButtons()) expect(b).toBeEnabled()
    expect(controlTimer).not.toHaveBeenCalled() // 켜도 자동 시작 없음(U-2)
  })

  it('TC-251 (CR-050 개정): 끄기 저장 인자 { enabled: false }(mode 유지) + 실패 → onError(BridgeError) 1회, 스위치 원래 값(켜짐)·busy 해제·버튼 다시 활성', async () => {
    const save = deferred<Settings>()
    vi.mocked(setSettings).mockReturnValue(save.promise)
    renderTab(S_ON)
    await flush()
    fireEvent.click(swSw())
    expect(saved(0)).toStrictEqual({ ...S_ON, timer: { ...TF, enabled: false, mode: 'stopwatch' } })
    for (const b of ctlButtons()) expect(b).toBeDisabled()
    await act(async () => save.reject(SAVE_ERR))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith({ code: SAVE_ERR.code, message: SAVE_ERR.message })
    expect(checked()).toEqual(['true', 'false'])
    expect(swSw()).not.toHaveAttribute('aria-busy')
    for (const b of ctlButtons()) expect(b).toBeEnabled()
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(controlTimer).not.toHaveBeenCalled()
  })
})

describe('TimerTab — 시작 시간 (R-50, §14.7.1 commitCountdownSecs · §14.6 durationLocked · T-10·T-11)', () => {
  it('TC-273(탭): 시작 시간 = 저장값 countdownSecs(옛 모양 → 00:25:00, 3723 → 01:02:03, 359999 → 99:59:59), settings://changed(props) 반영, 묶음 「시작 시간」 안 세 칸, 모드·켜짐과 무관하게 보임', async () => {
    const { update } = renderTab(SETTINGS)
    await flush()
    expect(hmsValues()).toEqual(['00', '25', '00'])
    update({ ...S_CD, timer: { ...S_CD.timer, countdownSecs: 3723 } })
    expect(hmsValues()).toEqual(['01', '02', '03'])
    update({ ...S_SW, timer: { ...S_SW.timer, countdownSecs: 359_999 } }) // 스톱워치여도 보임
    expect(hmsValues()).toEqual(['99', '59', '59'])
    for (const f of hms()) expect(screen.getByRole('group', { name: '시작 시간' })).toContainElement(f)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-274(탭): 01:02:03 입력 → 칸 사이 이동 0회 → 묶음 밖 → setSettings 1회 { ...DEFAULT, countdownSecs: 3723 }(정수), onError(null), 옛 값으로 튀지 않음', async () => {
    // CR-052: 시작 시간은 타이머 모드 켜짐일 때만 입력 가능 — 픽스처 = 타이머 켜짐·stopped(옛 SETTINGS = 둘 다 꺼짐)
    snapNow = cd('stopped')
    const { update } = renderTab(S_CD)
    await flush()
    fireEvent.change(field('시'), { target: { value: '01' } })
    fireEvent.focusOut(field('시'), { relatedTarget: field('분') })
    fireEvent.change(field('분'), { target: { value: '02' } })
    fireEvent.focusOut(field('분'), { relatedTarget: field('초') })
    fireEvent.change(field('초'), { target: { value: '03' } })
    expect(setSettings).not.toHaveBeenCalled()
    fireEvent.focusOut(field('초'), { relatedTarget: null })
    await flush()
    // ⓒ
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(saved(0)).toStrictEqual({ ...S_CD, timer: { ...S_CD.timer, countdownSecs: 3723 } })
    expect(Number.isInteger(saved(0).timer.countdownSecs)).toBe(true)
    // ⓑ
    expect(onError.mock.calls).toEqual([[null]])
    // ⓐ props 아직 1500 이어도 입력값 유지 → 수신 뒤 같음
    expect(hmsValues()).toEqual(['01', '02', '03'])
    update({ ...S_CD, timer: { ...S_CD.timer, countdownSecs: 3723 } })
    expect(hmsValues()).toEqual(['01', '02', '03'])
  })

  it('TC-275(탭): 00:00:00 → 저장 0회·되돌림 안내 / 저장 실패(settings.invalid) → onError·칸 = 옛 저장값(00:25:00)·되돌림 안내 없음', async () => {
    // CR-052: 타이머 켜짐·stopped 픽스처(TC-274 와 같은 이유)
    snapNow = cd('stopped')
    renderTab(S_CD)
    await flush()
    for (const n of ['시', '분', '초']) fireEvent.change(field(n), { target: { value: '00' } })
    fireEvent.focusOut(field('초'), { relatedTarget: null })
    await flush()
    expect(setSettings).not.toHaveBeenCalled()
    expect(hmsValues()).toEqual(['00', '25', '00'])
    expect(durationMsg()).toBe(INVALID)
    // 저장 실패
    vi.mocked(setSettings).mockRejectedValueOnce(SAVE_ERR)
    fireEvent.change(field('분'), { target: { value: '10' } })
    fireEvent.focusOut(field('분'), { relatedTarget: null })
    await flush()
    // ⓒ 인자 · ⓑ 오류 · ⓐ 옛 값
    expect(saved(0)).toStrictEqual({ ...S_CD, timer: { ...S_CD.timer, countdownSecs: 600 } })
    expect(onError.mock.calls).toEqual([[{ code: SAVE_ERR.code, message: SAVE_ERR.message }]])
    expect(hmsValues()).toEqual(['00', '25', '00'])
    expect(durationMsg()).toBe('')
  })

  it('TC-276(탭) (CR-052 개정): 잠김 = 타이머 켜짐 && running·paused·finished → 세 칸 disabled·timerDurationLocked / 타이머 모드 아님(스톱워치 running·stopped·둘 다 꺼짐·꺼진 타이머 모드) → disabled·aria-disabled·안내 빈 값 / 타이머 켜짐·stopped 만 입력 가능, 흐르기 시작하면 입력 중 값 버림', async () => {
    const { update } = renderTab(S_CD)
    await flush()
    // [이름, 설정, 사진, 세 칸 disabled, 안내 줄]
    const cases: [string, Settings, ReturnType<typeof snap>, boolean, string][] = [
      ['타이머 running', S_CD, cd('running', 1000), true, LOCKED],
      ['타이머 paused', S_CD, cd('paused', 1000), true, LOCKED],
      ['타이머 finished', S_CD, cd('finished', 1_500_000), true, LOCKED],
      ['타이머 stopped', S_CD, cd('stopped'), false, ''],
      // CR-052: 타이머 모드가 아니면 회색 비활성(inactive) — 안내 줄은 비운다(잠김 안내는 locked 만)
      ['스톱워치 running', S_ON, snap('running', 1000), true, ''],
      ['스톱워치 stopped', S_SW, snap('stopped'), true, ''],
      ['둘 다 꺼짐 running', SETTINGS, snap('running', 1000), true, ''],
      ['꺼진 타이머 모드 paused', S_CD_OFF, cd('paused', 1000), true, ''],
    ]
    for (const [label, s, sn, off, msg] of cases) {
      snapNow = sn
      update({ ...s })
      expect(hms().map(f => f.disabled), label).toEqual([off, off, off])
      for (const f of hms()) expect(f.getAttribute('aria-disabled'), label).toBe(off ? 'true' : null)
      expect(durationMsg(), label).toBe(msg)
    }
    // 입력 중 값 버림
    snapNow = cd('stopped')
    update({ ...S_CD })
    fireEvent.change(field('시'), { target: { value: '07' } })
    expect(hmsValues()).toEqual(['07', '25', '00'])
    snapNow = cd('running')
    update({ ...S_CD })
    expect(hmsValues()).toEqual(['00', '25', '00'])
    // 잠긴 뒤 묶음 blur(§14.7.2 commit 첫 줄 locked 가드 — 칸이 disabled 되며 올 수 있는 blur) → 저장 0회, 칸 = 저장값
    fireEvent.focusOut(field('시'), { relatedTarget: null })
    await flush()
    expect(setSettings).not.toHaveBeenCalled()
    expect(hmsValues()).toEqual(['00', '25', '00'])
    expect(durationMsg()).toBe(LOCKED)
    snapNow = cd('stopped')
    update({ ...S_CD })
    expect(hmsValues()).toEqual(['00', '25', '00'])
    for (const f of hms()) expect(f).toBeEnabled()
    // ⓒ 잠금은 화면 판정만 — bridge 없음
    expect(setSettings).not.toHaveBeenCalled()
    expect(controlTimer).not.toHaveBeenCalled()
  })
})

describe('TimerTab — 알림음 음량·끝남 깜빡임 (R-54·R-52, §14.7.1 commitVolume · §14.4 TimerPreview props)', () => {
  it('TC-283(탭): 음량 40 으로 끌어 놓으면 setSettings 1회 { ...DEFAULT, alarmVolume: 40 }(정수), 끄는 동안 저장 0회', async () => {
    renderTab(SETTINGS)
    await flush()
    fireEvent.change(vol(), { target: { value: '40' } })
    expect(out('alarm-volume')).toBe('40%')
    expect(setSettings).not.toHaveBeenCalled()
    fireEvent.pointerUp(vol())
    await flush()
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(saved(0)).toStrictEqual({ ...SETTINGS, timer: { ...TF, alarmVolume: 40 } })
    expect(onError.mock.calls).toEqual([[null]])
  })

  it('TC-283(탭 실패, CR-058 개정): 음량 40 저장 실패(settings.invalid) → onError(BridgeError) 1회, 초안 버림 — 슬라이더 값·aria-valuetext·output 이 이전 표시값 44% 로 복귀, setSettings 1회 { ...DEFAULT, alarmVolume: 40 }(T-16 오류 · TC-257 관례)', async () => {
    vi.mocked(setSettings).mockRejectedValueOnce(SAVE_ERR)
    renderTab(SETTINGS)
    await flush()
    fireEvent.change(vol(), { target: { value: '40' } })
    expect(out('alarm-volume')).toBe('40%')
    fireEvent.pointerUp(vol())
    await flush()
    // ⓒ 인자 1회(재시도 없음)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(saved(0)).toStrictEqual({ ...SETTINGS, timer: { ...TF, alarmVolume: 40 } })
    // ⓑ 오류 전달(오류 줄은 SettingsApp)
    expect(onError.mock.calls).toEqual([[{ code: SAVE_ERR.code, message: SAVE_ERR.message }]])
    // ⓐ 이전 표시값 44% 로 복귀(CR-058: T 에 alarmVolume 없음 → 라이브 DEFAULT)
    expect(vol()).toHaveValue('44')
    expect(vol()).toHaveAttribute('aria-valuetext', '44%')
    expect(out('alarm-volume')).toBe('44%')
  })

  it('TC-284(탭): useTimerSnapshot 은 TimerTab 이 부르고 snapshot·receivedAt 을 미리보기로 넘긴다 — finished → 글자 .blink·00:00:00, 그 밖 → 클래스 없음, 설정 창은 소리를 내지 않는다', async () => {
    snapNow = cd('finished', 1_500_000)
    const { update } = renderTab(S_CD)
    await flush()
    // ⓑ 공용 훅 소유 = TimerTab, 미리보기 글자 = useElapsedText(props 스냅숏)
    expect(useTimerSnapshot).toHaveBeenCalled()
    expect(vi.mocked(useElapsedText).mock.calls.at(-1)).toEqual([snapNow.snapshot, 1])
    // ⓐ 깜빡임
    expect(text()).toHaveTextContent('00:00:00')
    expect(text().className).toMatch(/blink/)
    for (const st of ['stopped', 'running', 'paused'] as const) {
      snapNow = cd(st, 1000)
      update({ ...S_CD })
      expect(text().className, st).not.toMatch(/blink/)
    }
    // ⓒ 알람 재생·조작 없음(소리는 오버레이만 — R-52)
    expect(playSound).not.toHaveBeenCalled()
    expect(controlTimer).not.toHaveBeenCalled()
  })
})

describe('TimerTab — 시작·일시정지·멈춤 (R-45 · R-51, T-3)', () => {
  it('TC-252 (CR-050 개정): 둘 다 꺼짐(꺼진 타이머 모드 포함) → 세 버튼 disabled·호출 없음 / 스톱워치·타이머 켜짐 → 상태(stopped·running·paused·restPaused·finished)와 무관하게 셋 다 활성', async () => {
    const { update } = renderTab(SETTINGS)
    await flush()
    for (const b of ctlButtons()) {
      expect(b).toBeDisabled()
      fireEvent.click(b)
    }
    expect(controlTimer).not.toHaveBeenCalled()
    for (const [label, s] of [
      ['스톱워치', S_ON],
      ['타이머', S_CD],
    ] as const) {
      for (const st of ['stopped', 'running', 'paused', 'restPaused', 'finished'] as const) {
        snapNow = s === S_CD ? cd(st, 5_000) : snap(st, 5_000)
        update({ ...s })
        expect(
          ctlButtons().map(b => (b as HTMLButtonElement).disabled),
          `${label} ${st}`,
        ).toEqual([false, false, false])
      }
    }
    update({ ...S_CD_OFF })
    for (const b of ctlButtons()) expect(b).toBeDisabled()
    expect(controlTimer).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-253: 시작 → 일시정지 → 멈춤 = controlTimer("start"|"pause"|"stop") 차례로, 응답 대기 중 세 버튼 비활성(두 번 누름 무시), 매번 오류 줄 지움, 확인창 없음', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const first = deferred<unknown>()
    vi.mocked(controlTimer).mockReturnValueOnce(first.promise as never)
    renderTab(S_ON)
    await flush()
    fireEvent.click(ctl('시작'))
    expect(controlTimer).toHaveBeenCalledTimes(1)
    for (const b of ctlButtons()) expect(b).toBeDisabled()
    expect(swSw()).toBeEnabled()
    fireEvent.click(ctl('일시정지'))
    expect(controlTimer).toHaveBeenCalledTimes(1)
    await act(async () => first.resolve({ status: 'running', elapsedMs: 0 }))
    for (const b of ctlButtons()) expect(b).toBeEnabled()
    fireEvent.click(ctl('일시정지'))
    await flush()
    fireEvent.click(ctl('멈춤'))
    await flush()
    expect(vi.mocked(controlTimer).mock.calls).toEqual([['start'], ['pause'], ['stop']])
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError.mock.calls).toEqual([[null], [null], [null]])
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('TC-254: controlTimer 실패 — timer.disabled 는 BridgeError 그대로, 그 밖의 예외는 toBridgeError 정규화(unknown·message)로 onError, 버튼 다시 활성', async () => {
    vi.mocked(controlTimer).mockRejectedValueOnce(DISABLED).mockRejectedValueOnce(new Error('boom'))
    renderTab(S_ON)
    await flush()
    fireEvent.click(ctl('시작'))
    await flush()
    fireEvent.click(ctl('멈춤'))
    await flush()
    expect(onError.mock.calls).toEqual([
      [{ code: 'timer.disabled', message: DISABLED.message }],
      [{ code: 'unknown', message: 'boom' }],
    ])
    for (const b of ctlButtons()) expect(b).toBeEnabled()
    expect(swSw()).toHaveAttribute('aria-checked', 'true')
    expect(vi.mocked(controlTimer).mock.calls).toEqual([['start'], ['stop']])
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('TimerTab — 회전·크기 슬라이더 (R-46, T-5 · useSliderDraft)', () => {
  it('TC-255: 끄는 동안(change) 미리보기·output·aria-valuetext 만 바뀌고 저장 0회, 놓을 때(pointerup) 1회 · 저장값과 같으면 0회', async () => {
    const { update } = renderTab(SETTINGS)
    await flush()
    fireEvent.pointerUp(rot())
    fireEvent.change(rot(), { target: { value: '5' } })
    fireEvent.pointerUp(rot())
    await flush()
    expect(setSettings).not.toHaveBeenCalled()
    fireEvent.change(rot(), { target: { value: '20' } })
    fireEvent.change(rot(), { target: { value: '30' } })
    expect(rot()).toHaveValue('30')
    expect(rot()).toHaveAttribute('aria-valuetext', '30°')
    expect(out('timer-rotation')).toBe('30°')
    expect(text().style.transform).toBe('translate(-50%, -50%) rotate(30deg)')
    expect(setSettings).not.toHaveBeenCalled()
    fireEvent.pointerUp(rot())
    await flush()
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(saved(0)).toStrictEqual({ ...SETTINGS, timer: { ...TF, rotation: 30 } }) // CR-050: 전체 timer
    expect(onError.mock.calls).toEqual([[null]])
    update({ ...SETTINGS, timer: { ...T, rotation: 30 } })
    expect(out('timer-rotation')).toBe('30°')
    fireEvent.change(size(), { target: { value: '120' } })
    expect(out('timer-size')).toBe('120px')
    expect(size()).toHaveAttribute('aria-valuetext', '120px')
    expect(text().style.fontSize).toBe('120px')
    fireEvent.pointerUp(size())
    await flush()
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(saved(1)).toStrictEqual({ ...SETTINGS, timer: { ...TF, rotation: 30, fontSize: 120 } })
  })

  it('TC-256: 키보드 이동 키 keyup → 300ms 뒤 1회(가짜 시계) · 이동 키가 아니면 예약 없음 · blur 는 즉시 · 언마운트하면 예약 해제', async () => {
    const { unmount } = renderTab(SETTINGS)
    await flush()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    fireEvent.change(size(), { target: { value: '40' } })
    fireEvent.keyUp(size(), { key: 'ArrowRight' })
    act(() => vi.advanceTimersByTime(299))
    expect(setSettings).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    await flush()
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(saved(0)).toStrictEqual({ ...SETTINGS, timer: { ...TF, fontSize: 40 } })
    fireEvent.change(size(), { target: { value: '44' } })
    fireEvent.keyUp(size(), { key: 'a' })
    act(() => vi.advanceTimersByTime(1_000))
    expect(setSettings).toHaveBeenCalledTimes(1)
    fireEvent.blur(size())
    await flush()
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(saved(1)).toStrictEqual({ ...SETTINGS, timer: { ...TF, fontSize: 44 } })
    fireEvent.change(rot(), { target: { value: '-90' } })
    fireEvent.keyUp(rot(), { key: 'Home' })
    unmount()
    act(() => vi.advanceTimersByTime(300))
    await flush()
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(onError.mock.calls).toEqual([[null], [null]])
  })

  it('TC-257: 슬라이더 저장 실패 → onError(BridgeError), 초안은 버리고 저장값(5°)으로 돌아간다', async () => {
    vi.mocked(setSettings).mockRejectedValueOnce(SAVE_ERR)
    renderTab(SETTINGS)
    await flush()
    fireEvent.change(rot(), { target: { value: '90' } })
    fireEvent.pointerUp(rot())
    await flush()
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(saved(0)).toStrictEqual({ ...SETTINGS, timer: { ...TF, rotation: 90 } })
    expect(onError.mock.calls).toEqual([[{ code: SAVE_ERR.code, message: SAVE_ERR.message }]])
    expect(rot()).toHaveValue('5')
    expect(out('timer-rotation')).toBe('5°')
    expect(text().style.transform).toBe('translate(-50%, -50%) rotate(5deg)')
  })
})

describe('TimerTab — 글자 색 (R-47, T-6)', () => {
  it('TC-258: 고르는 동안(input) 미리보기·output 만 바뀌고 저장 0회, 대화상자 닫힘(change) → 소문자 #rrggbb 로 1회 저장', async () => {
    const save = deferred<Settings>()
    vi.mocked(setSettings).mockReturnValue(save.promise)
    const { update } = renderTab(SETTINGS)
    await flush()
    fireEvent.input(color(), { target: { value: '#33AAFF' } })
    expect(out('timer-color')?.toLowerCase()).toBe('#33aaff')
    expect(text()).toHaveStyle({ color: '#33aaff' })
    expect(setSettings).not.toHaveBeenCalled()
    fireEvent.change(color(), { target: { value: '#33AAFF' } })
    await flush()
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(saved(0)).toStrictEqual({ ...SETTINGS, timer: { ...TF, color: '#33aaff' } })
    expect(out('timer-color')?.toLowerCase()).toBe('#33aaff')
    expect(text()).toHaveStyle({ color: '#33aaff' })
    await act(async () => save.resolve({ ...SETTINGS, timer: { ...TF, color: '#33aaff' } }))
    expect(onError.mock.calls).toEqual([[null]])
    update({ ...SETTINGS, timer: { ...T, color: '#33aaff' } })
    expect(color()).toHaveValue('#33aaff')
    expect(out('timer-color')).toBe('#33aaff')
    expect(text()).toHaveStyle({ color: '#33aaff' })
  })

  it('TC-259: 같은 색으로 닫으면 저장 0회 · 저장 실패 → onError, 표시는 저장값 색', async () => {
    renderTab(SETTINGS)
    await flush()
    fireEvent.input(color(), { target: { value: '#333333' } })
    fireEvent.change(color(), { target: { value: '#333333' } })
    await flush()
    expect(setSettings).not.toHaveBeenCalled()
    vi.mocked(setSettings).mockRejectedValueOnce(SAVE_ERR)
    fireEvent.input(color(), { target: { value: '#00ff00' } })
    fireEvent.change(color(), { target: { value: '#00ff00' } })
    await flush()
    expect(vi.mocked(setSettings).mock.calls.map(c => c[0].timer.color)).toEqual(['#00ff00'])
    expect(onError.mock.calls).toEqual([[{ code: SAVE_ERR.code, message: SAVE_ERR.message }]])
    expect(out('timer-color')).toBe('#333333')
    expect(color()).toHaveValue('#333333')
    expect(text()).toHaveStyle({ color: '#333333' })
  })
})

describe('TimerTab — 3개 국어 (R-20 · R-55, i18n §4.9·§4.10)', () => {
  it('TC-268 (CR-050 개정): ja·en — 카드 제목 3·설명·두 스위치 이름/설명·버튼 묶음·버튼 3·새 멈춤 안내·미리보기 이름·슬라이더·색 이름이 사전 값, 단위(°·px·%)는 공통', async () => {
    for (const [lang, d] of [
      ['ja', ja],
      ['en', en],
    ] as const) {
      const r = renderTab(SETTINGS, POMO, lang)
      await flush()
      expect(h2s()).toEqual([d.timerCardTitle, d.alarmCardTitle, d.timerTextTitle])
      // CR-052: timerCardDesc 키 삭제 — 카드 1 설명은 스톱워치 스위치 설명 한 곳뿐(TC-289)
      expect(screen.getAllByText(d.timerStopwatchDesc)).toHaveLength(1)
      expect(screen.getByText(d.timerTextDesc)).toBeInTheDocument()
      expect(swSw(d.timerStopwatchEnabled)).toHaveAccessibleDescription(d.timerStopwatchDesc)
      expect(swCd(d.timerCountdownEnabled)).toHaveAccessibleDescription(d.timerCountdownDesc)
      expect(ctlButtons(d.timerControlsAria).map(b => b.textContent)).toEqual([d.timerStart, d.timerPause, d.timerStop])
      expect(screen.getByText(d.timerStopHint)).toBeInTheDocument()
      expect(screen.getByRole('group', { name: d.timerPreviewAria })).toBeInTheDocument()
      expect(screen.getByRole('img', { name: d.timerTextDragAria })).toBeInTheDocument()
      expect(rot(d.timerRotation)).toHaveAttribute('aria-valuetext', '5°')
      expect(size(d.timerSize)).toHaveAttribute('aria-valuetext', '36px')
      expect(vol(d.alarmVolume)).toHaveAttribute('aria-valuetext', '44%') // CR-058
      expect(color(d.timerColor)).toHaveValue('#333333')
      expect(screen.queryByText('스톱워치 사용')).toBeNull()
      expect(screen.queryByText('타이머 사용')).toBeNull()
      r.unmount()
    }
    expect(setSettings).not.toHaveBeenCalled()
    expect(controlTimer).not.toHaveBeenCalled()
  })

  it('TC-287: ja·en — 시작 시간(묶음·세 칸·힌트·되돌림·잠김 안내)·알림음 카드(설명·기본/등록 상태 문구·세 버튼·힌트) 문구가 사전 값, ko 문구 없음', async () => {
    for (const [lang, d] of [
      ['ja', ja],
      ['en', en],
    ] as const) {
      // ① 타이머 켜짐·stopped·파일 없음 → 기본 문구 + 되돌림 안내
      // (CR-052: 시작 시간은 타이머 모드에서만 입력 가능 — 옛 픽스처 SETTINGS(둘 다 꺼짐)는 칸이 disabled)
      snapNow = cd('stopped')
      const r1 = renderTab(S_CD, POMO, lang)
      await flush()
      expect(screen.getByRole('group', { name: d.timerDuration })).toBeInTheDocument()
      const f = hms([d.timerHoursAria, d.timerMinutesAria, d.timerSecondsAria])
      expect(f.map(x => x.value)).toEqual(['00', '25', '00'])
      expect(screen.getByText(d.timerDurationHint)).toBeInTheDocument()
      for (const x of f) fireEvent.change(x, { target: { value: '00' } })
      fireEvent.focusOut(f[2], { relatedTarget: null })
      await flush()
      expect(durationMsg()).toBe(d.timerDurationInvalid)
      expect(screen.getByText(d.alarmCardDesc)).toBeInTheDocument()
      expect(screen.getByText(d.alarmCurrentDefault)).toBeInTheDocument()
      expect([d.alarmImport, d.alarmPreview, d.alarmReset].map(n => btn(n).textContent)).toEqual([
        d.alarmImport,
        d.alarmPreview,
        d.alarmReset,
      ])
      expect(screen.getByText(d.alarmFileHint)).toBeInTheDocument()
      expect(screen.queryByText('지금: 기본 알림음')).toBeNull()
      r1.unmount()
      // ② 타이머 흐르는 중·사용자 파일 → 잠김 안내 + 등록 문구
      vi.mocked(getAlarmSound).mockResolvedValueOnce(MP3)
      snapNow = cd('running', 1000)
      const r2 = renderTab(S_CD, POMO, lang)
      await flush()
      expect(durationMsg()).toBe(d.timerDurationLocked)
      expect(screen.getByText(format(d.alarmCurrentCustom, { format: 'MP3', size: 305 }))).toBeInTheDocument()
      expect(screen.queryByText(LOCKED)).toBeNull()
      r2.unmount()
      snapNow = snap('stopped')
    }
    expect(setSettings).not.toHaveBeenCalled()
    expect(controlTimer).not.toHaveBeenCalled()
  })
})

// ─── TC-FLOW-26 (S-25) ────────────────────────────────────────────────────
describe('TC-FLOW (S-25)', () => {
  it('TC-FLOW-26: (S-25) 말풍선에 맞게 글자를 끌어 놓고 → 회전 → 크기 → 색을 고른다(매 저장 뒤 settings://changed 로 props 갱신)', async () => {
    const { update } = renderTab(SETTINGS, POMO)
    await flush()
    const pid = 7
    const t = () => text()
    fireEvent.pointerDown(t(), { clientX: 134, clientY: 202, button: 0, pointerId: pid })
    fireEvent.pointerMove(t(), { clientX: 184, clientY: 232, pointerId: pid })
    fireEvent.pointerUp(t(), { clientX: 184, clientY: 232, button: 0, pointerId: pid })
    await flush()
    const S1: Settings = { ...SETTINGS, timer: { ...TF, textPos: { x: 368, y: 463 } } } // CR-050: 전체 timer
    expect(saved(0)).toStrictEqual(S1)
    update(S1)
    fireEvent.change(rot(), { target: { value: '-12' } })
    fireEvent.pointerUp(rot())
    await flush()
    const S2: Settings = { ...S1, timer: { ...S1.timer, rotation: -12 } }
    expect(saved(1)).toStrictEqual(S2)
    update(S2)
    fireEvent.change(size(), { target: { value: '48' } })
    fireEvent.pointerUp(size())
    await flush()
    const S3: Settings = { ...S2, timer: { ...S2.timer, fontSize: 48 } }
    expect(saved(2)).toStrictEqual(S3)
    update(S3)
    fireEvent.input(color(), { target: { value: '#AA0000' } })
    fireEvent.change(color(), { target: { value: '#AA0000' } })
    await flush()
    const S4: Settings = { ...S3, timer: { ...S3.timer, color: '#aa0000' } }
    expect(saved(3)).toStrictEqual(S4)
    update(S4)
    expect([t().style.left, t().style.top]).toEqual(['368px', '463px'])
    expect(t().style.transform).toBe('translate(-50%, -50%) rotate(-12deg)')
    expect(t().style.fontSize).toBe('48px')
    expect(t()).toHaveStyle({ color: '#aa0000' })
    expect([out('timer-rotation'), out('timer-size'), out('timer-color')]).toEqual(['-12°', '48px', '#aa0000'])
    expect(onError.mock.calls).toEqual([[null], [null], [null], [null]])
    expect(setSettings).toHaveBeenCalledTimes(4)
    expect(controlTimer).not.toHaveBeenCalled()
  })
})
