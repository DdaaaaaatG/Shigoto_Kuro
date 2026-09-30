/**
 * 알림음 카드(AlarmSoundCard) 스펙 — CR-050 · R-53 · R-54 · R-55.
 * 기준: src/settings/design/timer-tab.md §14.4 `AlarmSoundCard` props·§14.6 `sound`·`soundPending`·`previewFailed`·`stopRef`·
 *       `volumeDraft`·미리 듣기 정지 조건 세 가지·§14.7.3(마운트 조회·`stopPreview`·언마운트 정지·창 숨김 정지 효과·`onImport`·
 *       `onPreview`·`onReset`·`commitVolume`·`statusText`)·버튼 비활성 규칙·§14.3 `.soundStatus`·§14.8 렌더·§14.9 T-13 ~ T-17·
 *       §14.10 계약·§14.11 · design/i18n.md §4.10 · scenarios.md 「CR-050 개정」 절 TC-277 ~ TC-283.
 * bridge 는 mock(vi.mock('bridge/commands') — toBridgeError 실물). 소리는 공용 components/utils/alarmSound 를 mock:
 * defaultAlarmUrl → 'blob:default', playSound → 호출마다 새 정지 함수(vi.fn) 반환(jsdom 에 오디오·createObjectURL 없음).
 * 시간 의존 = 음량 키보드 저장 300ms(useSliderDraft)뿐 — TC-283 만 vi.useFakeTimers({ toFake: setTimeout·clearTimeout }).
 * 창 숨김(TC-282 ②·③)은 document.visibilityState 를 Object.defineProperty 로 테스트가 제어하고 visibilitychange 를 직접 쏜다
 * (테스트 뒤 인스턴스 속성 삭제로 원래 getter 복원, add/removeEventListener spy 도 mockRestore).
 * 선행: bridge v0.23(래퍼 4개·AlarmSound·TIMER_ALARM_VOLUME_MAX) + overlay CR-050 alarmSound + 화면(AlarmSoundCard·timerValues
 *       `soundSizeKb`·useSliderDraft·i18n §4.10). 구현 전 import 오류는 예정된 Red.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { AlarmSound, BridgeError } from 'bridge/types'
import { getAlarmSound, importAlarmSound, pickAudioFile, removeAlarmSound } from 'bridge/commands'
import { defaultAlarmUrl, playSound } from 'components/utils/alarmSound'
import AlarmSoundCard from '../components/AlarmSoundCard'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))
vi.mock('bridge/commands', async importOriginal => {
  const actual = await importOriginal<typeof import('bridge/commands')>()
  return {
    ...actual, // toBridgeError 는 실물
    getAlarmSound: vi.fn(),
    importAlarmSound: vi.fn(),
    removeAlarmSound: vi.fn(),
    pickAudioFile: vi.fn(),
  }
})
vi.mock('components/utils/alarmSound', () => ({ defaultAlarmUrl: vi.fn(), playSound: vi.fn(), alarmGain: vi.fn() }))

// ─── 픽스처 ────────────────────────────────────────────────────────────────
const MP3: AlarmSound = { format: 'mp3', bytes: 312_004, url: 'asset://alarm.mp3?v=1' }
const WAV: AlarmSound = { format: 'wav', bytes: 1024, url: 'asset://alarm.wav?v=2' }
const NOT_AUDIO: BridgeError = { code: 'sound.not_audio', message: 'wav·mp3·ogg 소리 파일이 아닙니다.' }
const TOO_BIG: BridgeError = { code: 'sound.too_many_bytes', message: '알림음 파일은 1MB 이하여야 합니다. (현재 2000000바이트)' }
const IO: BridgeError = { code: 'sound.io', message: '알림음 파일을 읽거나 쓰지 못했습니다. (테스트)' }
// i18n §4.10 ko 열
const DEFAULT_TEXT = '지금: 기본 알림음'
const MP3_TEXT = '지금: 등록한 알림음 (MP3 · 305 KB)'
const FAILED = '이 파일을 재생하지 못했습니다'

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
let onCommitVolume: Mock
let stops: Mock[] = []
beforeEach(() => {
  vi.resetAllMocks()
  onError = vi.fn()
  onCommitVolume = vi.fn(async () => {})
  stops = []
  vi.mocked(getAlarmSound).mockResolvedValue(null)
  vi.mocked(defaultAlarmUrl).mockReturnValue('blob:default')
  vi.mocked(playSound).mockImplementation(() => {
    const stop = vi.fn()
    stops.push(stop)
    return stop
  })
})
afterEach(() => {
  vi.useRealTimers()
})

// ─── 도우미 ────────────────────────────────────────────────────────────────
const tree = (volume: number) => (
  <AlarmSoundCard
    volume={volume}
    onCommitVolume={onCommitVolume as (v: number) => Promise<void>}
    onError={onError as (e: BridgeError | null) => void}
  />
)
const flush = () => act(async () => {})
const mount = async (volume = 80) => {
  const u = render(tree(volume))
  await flush()
  return { ...u, update: (v: number) => u.rerender(tree(v)) }
}
const status = () => document.querySelector('p[aria-live="polite"]') as HTMLElement
const btn = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement
const vol = () => screen.getByRole('slider', { name: '음량' })
const out = () => document.querySelector('output[for="alarm-volume"]')?.textContent
const plays = () => vi.mocked(playSound).mock.calls

describe('AlarmSoundCard — 마운트·상태 문구 (R-53, §14.7.3 마운트 조회·statusText)', () => {
  it('TC-277: getAlarmSound 1회(인자 없음) — 응답 전·null → 「지금: 기본 알림음」·「기본값」 비활성, mp3 312004B → 「(MP3 · 305 KB)」·「기본값」 활성, wav 1024B → 「(WAV · 1 KB)」, 조회 실패 → onError·기본 문구, 언마운트 뒤 응답은 무시, 상태 문구 클래스 soundStatus', async () => {
    const first = deferred<AlarmSound | null>()
    vi.mocked(getAlarmSound).mockReturnValueOnce(first.promise)
    const r1 = render(tree(80))
    // ⓐ 응답 전 = 기본으로 보임
    expect(screen.getByRole('heading', { level: 2, name: '알림음' })).toBeInTheDocument()
    // CR-052: 반복 재생 문구(옛 「타이머가 0이 되면 한 번 울립니다」 대체)
    expect(screen.getByText('타이머가 0이 되면 깜빡이는 10초 동안 반복해서 울립니다')).toBeInTheDocument()
    expect(screen.queryByText('타이머가 0이 되면 한 번 울립니다')).toBeNull()
    expect(screen.getByText('wav·mp3·ogg, 1MB 이하')).toBeInTheDocument()
    expect(status().textContent).toBe(DEFAULT_TEXT)
    // ⓐ §14.3 `.soundStatus`·§14.8 `<p className={styles.soundStatus} aria-live="polite">` (CSS Modules — 클래스 이름 포함 여부로 단언, TC-275 msgError 관례)
    expect(status().className).toMatch(/soundStatus/)
    expect(btn('기본값')).toBeDisabled()
    expect(btn('파일 등록')).toBeEnabled()
    expect(btn('미리 듣기')).toBeEnabled()
    for (const b of [btn('파일 등록'), btn('미리 듣기'), btn('기본값')]) expect(b).toHaveAttribute('type', 'button')
    // ⓒ 조회 1회, 인자 없음
    expect(getAlarmSound).toHaveBeenCalledTimes(1)
    expect(getAlarmSound).toHaveBeenCalledWith()
    await act(async () => first.resolve(MP3))
    // ⓑ sound = MP3 → 형식 대문자·ceil KB
    expect(status().textContent).toBe(MP3_TEXT)
    expect(status().className).toMatch(/soundStatus/)
    expect(btn('기본값')).toBeEnabled()
    r1.unmount()
    // null
    const r2 = await mount()
    expect(status().textContent).toBe(DEFAULT_TEXT)
    expect(btn('기본값')).toBeDisabled()
    r2.unmount()
    // wav 1024B → 1 KB
    vi.mocked(getAlarmSound).mockResolvedValueOnce(WAV)
    const r3 = await mount()
    expect(status().textContent).toBe('지금: 등록한 알림음 (WAV · 1 KB)')
    r3.unmount()
    // 조회 실패 → onError(toBridgeError), 기본 문구 유지
    vi.mocked(getAlarmSound).mockRejectedValueOnce(IO)
    const r4 = await mount()
    expect(onError.mock.calls).toEqual([[{ code: IO.code, message: IO.message }]])
    expect(status().textContent).toBe(DEFAULT_TEXT)
    expect(btn('기본값')).toBeDisabled()
    r4.unmount()
    // 언마운트 뒤 늦은 실패 → 무시(alive)
    const late = deferred<AlarmSound | null>()
    vi.mocked(getAlarmSound).mockReturnValueOnce(late.promise)
    render(tree(80)).unmount()
    await act(async () => late.reject(IO))
    expect(onError).toHaveBeenCalledTimes(1)
    // ⓒ 조회 외 호출 없음
    expect(importAlarmSound).not.toHaveBeenCalled()
    expect(removeAlarmSound).not.toHaveBeenCalled()
    expect(pickAudioFile).not.toHaveBeenCalled()
    expect(playSound).not.toHaveBeenCalled()
    expect(onCommitVolume).not.toHaveBeenCalled()
  })
})

describe('AlarmSoundCard — 파일 등록 (R-53, §14.7.3 onImport · T-13)', () => {
  it('TC-278: 「파일 등록」 → pickAudioFile("소리 파일 선택") → importAlarmSound(path) 1회 → 상태 문구 갱신·onError(null), 처리 중 「파일 등록」 비활성(두 번 누름 무시), 취소(null) → import 0회·문구 불변·onError 없음', async () => {
    await mount()
    const pick = deferred<string | null>()
    vi.mocked(pickAudioFile).mockReturnValueOnce(pick.promise)
    vi.mocked(importAlarmSound).mockResolvedValueOnce(MP3)
    fireEvent.click(btn('파일 등록'))
    // ⓐ 처리 중(soundPending)
    expect(btn('파일 등록')).toBeDisabled()
    expect(btn('기본값')).toBeDisabled()
    fireEvent.click(btn('파일 등록'))
    // ⓒ 대화상자 제목 = t.alarmPickTitle, 1회
    expect(pickAudioFile).toHaveBeenCalledTimes(1)
    expect(pickAudioFile).toHaveBeenCalledWith('소리 파일 선택')
    await act(async () => pick.resolve('C:/sounds/bell.mp3'))
    expect(importAlarmSound).toHaveBeenCalledTimes(1)
    expect(importAlarmSound).toHaveBeenCalledWith('C:/sounds/bell.mp3')
    // ⓐ·ⓑ 새 문구·버튼 활성 · 오류 줄 지움
    expect(status().textContent).toBe(MP3_TEXT)
    expect(btn('파일 등록')).toBeEnabled()
    expect(btn('기본값')).toBeEnabled()
    expect(onError.mock.calls).toEqual([[null]])
    // 취소
    vi.mocked(pickAudioFile).mockResolvedValueOnce(null)
    fireEvent.click(btn('파일 등록'))
    await flush()
    expect(pickAudioFile).toHaveBeenCalledTimes(2)
    expect(importAlarmSound).toHaveBeenCalledTimes(1)
    expect(status().textContent).toBe(MP3_TEXT)
    expect(btn('파일 등록')).toBeEnabled()
    expect(onError.mock.calls).toEqual([[null]])
    expect(removeAlarmSound).not.toHaveBeenCalled()
  })

  it('TC-279(카드): 등록 실패 — sound.not_audio·sound.too_many_bytes 는 BridgeError 그대로, 대화상자 예외는 toBridgeError(unknown) 로 onError, 상태 문구(등록한 MP3) 불변·버튼 다시 활성', async () => {
    vi.mocked(getAlarmSound).mockResolvedValueOnce(MP3)
    await mount()
    vi.mocked(pickAudioFile).mockResolvedValue('C:/sounds/notes.txt')
    vi.mocked(importAlarmSound).mockRejectedValueOnce(NOT_AUDIO).mockRejectedValueOnce(TOO_BIG)
    fireEvent.click(btn('파일 등록'))
    await flush()
    fireEvent.click(btn('파일 등록'))
    await flush()
    vi.mocked(pickAudioFile).mockRejectedValueOnce(new Error('boom'))
    fireEvent.click(btn('파일 등록'))
    await flush()
    // ⓑ 오류 전달(표시 문구는 SettingsApp 오류 줄 — SettingsApp.timer.test.tsx TC-279)
    expect(onError.mock.calls).toEqual([
      [{ code: 'sound.not_audio', message: NOT_AUDIO.message }],
      [{ code: 'sound.too_many_bytes', message: TOO_BIG.message }],
      [{ code: 'unknown', message: 'boom' }],
    ])
    // ⓐ 문구 불변(core 가 기존 알림음 유지)·버튼 활성
    expect(status().textContent).toBe(MP3_TEXT)
    expect(btn('파일 등록')).toBeEnabled()
    expect(btn('기본값')).toBeEnabled()
    // ⓒ import 인자
    expect(vi.mocked(importAlarmSound).mock.calls).toEqual([['C:/sounds/notes.txt'], ['C:/sounds/notes.txt']])
    expect(removeAlarmSound).not.toHaveBeenCalled()
  })
})

describe('AlarmSoundCard — 기본값 (R-53, §14.7.3 onReset · T-15)', () => {
  it('TC-280: 확인창 없이 removeAlarmSound 1회(인자 없음) — 재생 중이면 먼저 정지, 처리 중 두 버튼 비활성, 성공 → 기본 문구·「기본값」 비활성·재생 실패 문구(role=alert) 지움·onError(null) / 파일 없으면 비활성·호출 없음 / 실패(sound.io) → onError·문구 불변', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(getAlarmSound).mockResolvedValueOnce(MP3)
    const r = await mount()
    fireEvent.click(btn('미리 듣기'))
    expect(stops).toHaveLength(1)
    // 재생 실패 문구가 보이는 중(onFail) — 「기본값」 성공 때 지운다(§14.7.3 onReset `setPreviewFailed(false)`)
    act(() => (plays()[0][2] as () => void)())
    expect(screen.getByRole('alert')).toHaveTextContent(FAILED)
    const rm = deferred<void>()
    vi.mocked(removeAlarmSound).mockReturnValueOnce(rm.promise)
    fireEvent.click(btn('기본값'))
    // ⓒ 정지 → 삭제 1회
    expect(stops[0]).toHaveBeenCalledTimes(1)
    expect(removeAlarmSound).toHaveBeenCalledTimes(1)
    expect(removeAlarmSound).toHaveBeenCalledWith()
    // ⓐ 처리 중 · 확인창 없음
    expect(btn('기본값')).toBeDisabled()
    expect(btn('파일 등록')).toBeDisabled()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await act(async () => rm.resolve())
    // ⓑ sound null · previewFailed false
    expect(status().textContent).toBe(DEFAULT_TEXT)
    expect(btn('기본값')).toBeDisabled()
    expect(btn('파일 등록')).toBeEnabled()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(onError.mock.calls).toEqual([[null]])
    // 파일 없음 → 비활성, 눌러도 호출 없음
    fireEvent.click(btn('기본값'))
    await flush()
    expect(removeAlarmSound).toHaveBeenCalledTimes(1)
    r.unmount()
    // 실패
    vi.mocked(getAlarmSound).mockResolvedValueOnce(MP3)
    vi.mocked(removeAlarmSound).mockRejectedValueOnce(IO)
    await mount()
    fireEvent.click(btn('기본값'))
    await flush()
    expect(onError.mock.calls).toEqual([[null], [{ code: IO.code, message: IO.message }]])
    expect(status().textContent).toBe(MP3_TEXT)
    expect(btn('기본값')).toBeEnabled()
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})

describe('AlarmSoundCard — 미리 듣기 (R-53·R-54, §14.7.3 onPreview·stopPreview·언마운트 정지·창 숨김 정지 · T-14·T-17)', () => {
  it('TC-281: 기본음 = defaultAlarmUrl(), 등록 = sound.url · 음량 = 초안/100(놓기 전 값) · 다시 누르면 이전 정지 뒤 처음부터 · 실패(onFail) → role=alert 문구(오류 줄 아님), 다음 누름·등록 때 지움', async () => {
    const r = await mount(80)
    fireEvent.click(btn('미리 듣기'))
    // ⓒ 기본음 · 0.8 · onFail 함수
    expect(defaultAlarmUrl).toHaveBeenCalled()
    expect(plays()).toEqual([['blob:default', 0.8, expect.any(Function)]])
    // 초안 음량 — 슬라이더를 놓지 않은 40.
    // 합성 이벤트(fireEvent.change·click)라 포커스 이동이 없다 = 컴포넌트 계약 테스트(초안값을 쓴다).
    // 실물에서 버튼을 누르면 슬라이더 blur 로 먼저 저장된다 — 그 흐름은 수동 M-50a ④.
    fireEvent.change(vol(), { target: { value: '40' } })
    fireEvent.click(btn('미리 듣기'))
    expect(stops[0]).toHaveBeenCalledTimes(1) // 이전 재생 정지
    expect(plays()[1]).toEqual(['blob:default', 0.4, expect.any(Function)])
    expect(onCommitVolume).not.toHaveBeenCalled() // 미리 듣기는 저장하지 않는다
    // 재생 실패 → 카드 안 alert, 오류 줄 없음
    act(() => (plays()[1][2] as () => void)())
    expect(screen.getByRole('alert')).toHaveTextContent(FAILED)
    expect(onError).not.toHaveBeenCalled()
    // 다음 누름 → 지움
    fireEvent.click(btn('미리 듣기'))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(stops[1]).toHaveBeenCalledTimes(1)
    expect(plays()).toHaveLength(3)
    // 실패 뒤 등록 성공 → 지움·재생 정지
    act(() => (plays()[2][2] as () => void)())
    expect(screen.getByRole('alert')).toHaveTextContent(FAILED)
    vi.mocked(pickAudioFile).mockResolvedValueOnce('C:/sounds/bell.mp3')
    vi.mocked(importAlarmSound).mockResolvedValueOnce(MP3)
    fireEvent.click(btn('파일 등록'))
    await flush()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(stops[2]).toHaveBeenCalledTimes(1)
    // 등록 뒤 = 사용자 url, 초안 40 그대로(놓지 않음)
    vi.mocked(defaultAlarmUrl).mockClear()
    fireEvent.click(btn('미리 듣기'))
    expect(plays()[3]).toEqual([MP3.url, 0.4, expect.any(Function)])
    expect(defaultAlarmUrl).not.toHaveBeenCalled()
    r.unmount()
  })

  it('TC-282: ① 재생 중 언마운트(다른 탭으로 이동) → 정지 함수 1회, 재생 없이 언마운트 → 아무 일 없음', async () => {
    const r = await mount()
    fireEvent.click(btn('미리 듣기'))
    expect(stops[0]).not.toHaveBeenCalled()
    r.unmount()
    // ⓒ 정지 1회
    expect(stops[0]).toHaveBeenCalledTimes(1)
    const r2 = await mount()
    expect(() => r2.unmount()).not.toThrow()
    expect(stops).toHaveLength(1)
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-282(창 숨김): ② 재생 중 visibilitychange + hidden → 정지 함수 1회·카드 그대로, visible → 정지·재생 0회, 재생 없이 hidden → 호출 없음 ③ 언마운트 뒤 visibilitychange → 추가 정지 0회·같은 핸들러로 구독 해제', async () => {
    let visibility: DocumentVisibilityState = 'visible'
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
    const addSpy = vi.spyOn(document, 'addEventListener')
    const rmSpy = vi.spyOn(document, 'removeEventListener')
    const fire = (next: DocumentVisibilityState) => {
      visibility = next
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
    }
    try {
      vi.mocked(getAlarmSound).mockResolvedValueOnce(MP3)
      const r = await mount(80)
      fireEvent.click(btn('미리 듣기'))
      expect(stops).toHaveLength(1)
      // ② 창 숨김(설정 창 X = 숨기기, CR-041) → 정지 1회
      fire('hidden')
      expect(stops[0]).toHaveBeenCalledTimes(1)
      // ⓐ 카드는 그대로(언마운트 아님 — 다시 열면 같은 화면)
      expect(screen.getByRole('heading', { level: 2, name: '알림음' })).toBeInTheDocument()
      expect(status().textContent).toBe(MP3_TEXT)
      expect(out()).toBe('80%')
      // 다시 보임 → 아무것도 하지 않음(자동 재생 없음)
      fire('visible')
      expect(stops[0]).toHaveBeenCalledTimes(1)
      expect(playSound).toHaveBeenCalledTimes(1)
      // 재생 없이 숨김 → 정지할 것 없음(stopRef 비어 있음)
      fire('hidden')
      fire('visible')
      expect(stops[0]).toHaveBeenCalledTimes(1)
      // ③ 다시 재생 → 언마운트(언마운트 정지 1회) → 숨김 이벤트 → 추가 0회
      fireEvent.click(btn('미리 듣기'))
      expect(stops).toHaveLength(2)
      r.unmount()
      expect(stops[1]).toHaveBeenCalledTimes(1)
      fire('hidden')
      expect(stops[1]).toHaveBeenCalledTimes(1)
      expect(stops[0]).toHaveBeenCalledTimes(1)
      // ⓑ 구독 1개(document 'visibilitychange') = 언마운트 때 같은 핸들러로 해제
      const added = addSpy.mock.calls.filter(c => c[0] === 'visibilitychange').map(c => c[1])
      const removed = rmSpy.mock.calls.filter(c => c[0] === 'visibilitychange').map(c => c[1])
      expect(added).toHaveLength(1)
      expect(removed).toEqual(added)
      // ⓒ 재생 2회뿐 · 오류·저장 없음
      expect(playSound).toHaveBeenCalledTimes(2)
      expect(onError).not.toHaveBeenCalled()
      expect(onCommitVolume).not.toHaveBeenCalled()
    } finally {
      addSpy.mockRestore()
      rmSpy.mockRestore()
      Reflect.deleteProperty(document, 'visibilityState') // 인스턴스 속성 삭제 → Document.prototype getter 복원
    }
  })
})

describe('AlarmSoundCard — 음량 (R-54, §14.7.3 commitVolume · useSliderDraft · T-16)', () => {
  // 음량 80 은 명시 픽스처(props)다. 현행 기본 음량은 44(단일 소스 DEFAULT_ALARM_VOLUME — CR-059·CR-060), 기본값 표시는 TimerTab TC-283(탭)·TC-249에서 판정.
  it('TC-283(카드): 0 ~ 100·step 1·픽스처 80% 표시(현행 기본 44 = DEFAULT_ALARM_VOLUME), 끄는 동안 {n}% 만·저장 0회, 놓을 때 onCommitVolume 1회(정수), 같은 값 0회, 키 이동 300ms 뒤 1회(가짜 시계), blur 즉시', async () => {
    const { update } = await mount(80)
    // ⓐ 초기
    expect(vol()).toHaveAttribute('min', '0')
    expect(vol()).toHaveAttribute('max', '100')
    expect(vol()).toHaveAttribute('step', '1')
    expect(vol()).toHaveValue('80')
    expect(vol()).toHaveAttribute('aria-valuetext', '80%')
    expect(out()).toBe('80%')
    // 같은 값 → 0회
    fireEvent.pointerUp(vol())
    fireEvent.change(vol(), { target: { value: '80' } })
    fireEvent.pointerUp(vol())
    await flush()
    expect(onCommitVolume).not.toHaveBeenCalled()
    // 끄는 동안
    fireEvent.change(vol(), { target: { value: '40' } })
    expect(out()).toBe('40%')
    expect(vol()).toHaveAttribute('aria-valuetext', '40%')
    expect(onCommitVolume).not.toHaveBeenCalled()
    fireEvent.pointerUp(vol())
    await flush()
    // ⓒ 1회 · 정수
    expect(onCommitVolume.mock.calls).toEqual([[40]])
    update(40)
    expect(out()).toBe('40%')
    // 키보드 300ms · blur
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    fireEvent.change(vol(), { target: { value: '45' } })
    fireEvent.keyUp(vol(), { key: 'ArrowRight' })
    act(() => vi.advanceTimersByTime(299))
    expect(onCommitVolume).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(1))
    await flush()
    expect(onCommitVolume).toHaveBeenLastCalledWith(45)
    fireEvent.change(vol(), { target: { value: '50' } })
    fireEvent.blur(vol())
    await flush()
    expect(onCommitVolume.mock.calls).toEqual([[40], [45], [50]])
    // ⓑ 오류 없음 · 재생 없음
    expect(onError).not.toHaveBeenCalled()
    expect(playSound).not.toHaveBeenCalled()
  })
})
