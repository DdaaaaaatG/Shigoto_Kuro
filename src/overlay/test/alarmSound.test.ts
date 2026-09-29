/**
 * 알림음 공용 유틸 TC — CR-050(R-39) · CR-058(0.4.0 기본 세트 — 내장 기본음 = 번들 mp3, DEFAULT_ALARM_VOLUME 44).
 * 근거: design/functions.md §5.7 ④(defaultAlarmUrl·alarmGain·playSound), design.md §10.15 15.2(실패 알림
 *   순서 — onFail은 항상 queueMicrotask 비동기, stop() 뒤에는 부르지 않음)·15.4(내장 기본음 = 번들 정적 자산 URL,
 *   런타임 생성물 없음)·15.7 TC-297~TC-299 행. CR-061: DEFAULT_ALARM_VOLUME = DEFAULT_TIMER_SETTINGS.alarmVolume ?? 44.
 * 대상: src/components/utils/alarmSound.ts.
 * Audio는 전역 스텁(FakeAudio — play/pause/currentTime/volume/loop/error 이벤트 흉내).
 * bridge 호출 없음(타입만 import). 실제 소리·sleep 없음. microtask는 Promise.resolve 반복으로 비운다.
 * 시나리오: src/overlay/test/scenarios.md TC-297 ~ TC-299(v2.4 — CR-058 개정: TC-297 = DEFAULT_ALARM_VOLUME 44,
 *   TC-298 = 번들 mp3 자산 URL, TC-299 ⑤ = 없음·NaN → 0.44)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimerSettings } from 'bridge'
import defaultAlarmAsset from '@/assets/sounds/default-alarm.mp3'
import { DEFAULT_ALARM_VOLUME, alarmGain, defaultAlarmUrl, playSound } from '../../components/utils/alarmSound'

// ─── Audio 스텁 ────────────────────────────────────────────────────────────
type PlayMode = 'resolve' | 'reject' | 'pending' | 'throw'
const fa = { instances: [] as FakeAudio[], modes: [] as PlayMode[], ctorThrow: false }
class FakeAudio {
  src: string
  volume = 1
  loop = false
  currentTime = 0
  mode: PlayMode
  rejectPlay: (e: unknown) => void = () => undefined
  listeners: { type: string; fn: (e: Event) => void; once: boolean }[] = []
  play = vi.fn((): Promise<void> => {
    if (this.mode === 'throw') throw new Error('play sync')
    if (this.mode === 'reject') return Promise.reject(new DOMException('blocked', 'NotAllowedError'))
    if (this.mode === 'pending')
      return new Promise<void>((_, rej) => {
        this.rejectPlay = rej
      })
    return Promise.resolve()
  })
  pause = vi.fn()
  addEventListener = vi.fn((type: string, fn: (e: Event) => void, opts?: boolean | AddEventListenerOptions) => {
    this.listeners.push({ type, fn, once: typeof opts === 'object' && opts.once === true })
  })
  removeEventListener = vi.fn((type: string, fn: (e: Event) => void) => {
    this.listeners = this.listeners.filter(l => !(l.type === type && l.fn === fn))
  })
  constructor(src: string) {
    if (fa.ctorThrow) throw new Error('ctor')
    this.src = src
    this.mode = fa.modes.shift() ?? 'resolve'
    fa.instances.push(this)
  }
  fire(type: string) {
    const hit = this.listeners.filter(l => l.type === type)
    this.listeners = this.listeners.filter(l => !(l.type === type && l.once))
    for (const l of hit) l.fn(new Event(type))
  }
}
const last = () => fa.instances[fa.instances.length - 1]
const tick = async (n = 10) => {
  for (let i = 0; i < n; i++) await Promise.resolve()
}
const NOT_ALLOWED = () => new DOMException('blocked', 'NotAllowedError')

beforeEach(() => {
  fa.instances = []
  fa.modes = []
  fa.ctorThrow = false
  vi.stubGlobal('Audio', FakeAudio)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ─── DEFAULT_ALARM_VOLUME ───────────────────────────────────────────────
describe('DEFAULT_ALARM_VOLUME (design/functions.md §5.7 ④, CR-058 0.4.0 기본 세트)', () => {
  it('TC-297 (CR-058 개정 — 옛 synthBeepWav 상수 검증을 대체): DEFAULT_ALARM_VOLUME = 44(옛 80)', () => {
    expect(DEFAULT_ALARM_VOLUME).toBe(44)
    expect(fa.instances).toHaveLength(0) // 순수 상수 — Audio를 만들지 않음
  })
})

// ─── defaultAlarmUrl ────────────────────────────────────────────────────
describe('defaultAlarmUrl (design/functions.md §5.7 ④, design.md §10.15 15.4 — CR-058 이후 번들 mp3 자산)', () => {
  it('TC-298 (CR-058 개정 — 합성 Blob URL 캐시 대신 번들 mp3 자산): 번들된 기본 알림음 mp3 자산 URL을 그대로 반환, 두 번 불러도 같은 문자열, Audio를 만들지 않는다', () => {
    const a = defaultAlarmUrl()
    const b = defaultAlarmUrl()
    expect(a).toBe(defaultAlarmAsset)
    expect(b).toBe(a)
    expect(fa.instances).toHaveLength(0)
  })
})

// ─── playSound · alarmGain ──────────────────────────────────────────────
describe('playSound (design/functions.md §5.7 ④, design.md §10.15 15.2 실패 알림 순서)', () => {
  it('TC-299 ① (CR-052 개정): new Audio(url) 1개·음량 0~1 자르기(1.5→1, −0.2→0, NaN→0, 0.8→0.8)·play 1회·loop 인자 생략 = 반복 없음(false), loop true → a.loop true·false → false, stop() → pause·currentTime 0(반복 중에도), 두 번 불러도 안전', () => {
    const cases: [number, number][] = [
      [1.5, 1],
      [-0.2, 0],
      [Number.NaN, 0],
      [0.8, 0.8],
    ]
    for (const [v, want] of cases) {
      expect(() => playSound('u:a', v)).not.toThrow()
      const a = last()
      expect(a.src).toBe('u:a')
      expect(a.volume, `${v}`).toBe(want)
      expect(a.play).toHaveBeenCalledTimes(1)
      expect(a.loop).toBe(false)
    }
    expect(fa.instances).toHaveLength(4)
    // CR-052: 4번째 인자 loop — true 면 stop() 까지 반복(공용 인자 자체 검증 — CR-055 뒤 오버레이 끝남 알림은 true로 부르지 않음, 1회 재생), 명시 false 는 1회(미리 듣기 기본과 같음)
    const stopLoop = playSound('u:loop', 0.8, undefined, true)
    const lp = last()
    expect(lp.src).toBe('u:loop')
    expect(lp.loop).toBe(true)
    expect(lp.play).toHaveBeenCalledTimes(1)
    lp.currentTime = 7.5
    stopLoop()
    expect(lp.pause).toHaveBeenCalledTimes(1)
    expect(lp.currentTime).toBe(0)
    playSound('u:once', 0.8, undefined, false)
    expect(last().loop).toBe(false)
    expect(fa.instances).toHaveLength(6)
    const stop = playSound('u:b', 0.5)
    const b = last()
    b.currentTime = 3.2
    stop()
    expect(b.pause).toHaveBeenCalledTimes(1)
    expect(b.currentTime).toBe(0)
    expect(() => stop()).not.toThrow()
  })

  it('TC-299 ②: play() 거부 → onFail 1회(동기 시점엔 0회), error 이벤트 + 거부가 겹쳐도 합쳐 1회', async () => {
    fa.modes.push('reject')
    const f1 = vi.fn()
    playSound('u:a', 0.8, f1)
    expect(f1).not.toHaveBeenCalled()
    await tick()
    expect(f1).toHaveBeenCalledTimes(1)
    fa.modes.push('pending')
    const f2 = vi.fn()
    playSound('u:b', 0.8, f2)
    const b = last()
    b.fire('error')
    b.rejectPlay(NOT_ALLOWED())
    await tick()
    expect(f2).toHaveBeenCalledTimes(1)
    fa.modes.push('reject')
    expect(() => playSound('u:c', 0.8)).not.toThrow() // onFail 없이도 던지지 않음
    await tick()
  })

  it('TC-299 ③: stop() 뒤의 거부·error → onFail 0회', async () => {
    fa.modes.push('pending')
    const f = vi.fn()
    const stop = playSound('u:a', 0.8, f)
    const a = last()
    stop()
    a.rejectPlay(NOT_ALLOWED())
    a.fire('error')
    await tick()
    expect(f).not.toHaveBeenCalled()
    expect(a.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function))
  })

  it('TC-299 ④: play() 동기 예외·new Audio 예외 → 던지지 않음, 반환 시점 onFail 0회 → microtask 뒤 1회(항상 비동기), 예외 직후 stop() → 0회', async () => {
    fa.modes.push('throw')
    const f1 = vi.fn()
    let stop1: () => void = () => undefined
    expect(() => {
      stop1 = playSound('u:a', 0.8, f1)
    }).not.toThrow()
    expect(typeof stop1).toBe('function')
    expect(f1).not.toHaveBeenCalled()
    await tick()
    expect(f1).toHaveBeenCalledTimes(1)

    fa.ctorThrow = true
    const f2 = vi.fn()
    let stop2: () => void = () => undefined
    expect(() => {
      stop2 = playSound('u:b', 0.8, f2)
    }).not.toThrow()
    expect(f2).not.toHaveBeenCalled()
    await tick()
    expect(f2).toHaveBeenCalledTimes(1)
    expect(() => stop2()).not.toThrow()
    fa.ctorThrow = false

    fa.modes.push('throw')
    const f3 = vi.fn()
    const stop3 = playSound('u:c', 0.8, f3)
    stop3()
    await tick()
    expect(f3).not.toHaveBeenCalled()
  })
})

describe('alarmGain (design/functions.md §5.7 ④)', () => {
  it('TC-299 ⑤ (CR-058 개정): alarmVolume 없음 → 0.44, 80 → 0.8, 0 → 0, 150 → 1, −5 → 0, NaN → 0.44', () => {
    const base: TimerSettings = { enabled: true, textPos: { x: 268, y: 403 }, rotation: 5, fontSize: 36, color: '#333333' }
    const cases: [number | undefined, number][] = [
      [undefined, 0.44],
      [80, 0.8],
      [0, 0],
      [150, 1],
      [-5, 0],
      [Number.NaN, 0.44],
    ]
    for (const [v, want] of cases) {
      const t: TimerSettings = v === undefined ? base : { ...base, alarmVolume: v }
      expect(alarmGain(t), `${v}`).toBeCloseTo(want, 10)
    }
    expect(fa.instances).toHaveLength(0)
  })
})
