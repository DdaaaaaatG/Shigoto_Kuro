/**
 * 알림음 재생 훅 TC — CR-050(R-39) · CR-055(1회 재생 복원 — CR-052 반복 재생 폐기, `loop` false).
 * 근거: design.md §10.15 15.2(판정표 1~7행·재생 순서·실패 알림 순서·1회 재생(CR-055, R-39 「1회 재생(반복 없음)」))·15.3(훅 위치·ref만)·15.4(Audio 최대 2개),
 *   §4 prevStatusRef·stopRef·genRef·gainRef, design/functions.md §5.7 ⑤(halt·start·효과 1~3·예외), §7 get_alarm_sound 행.
 * 대상: src/overlay/hooks/useAlarmOnFinish.ts(신규 — 구현 전에는 import 실패로 이 파일 전체가 red, 정상).
 *   named export `useAlarmOnFinish(state: TimerSnapshotState, gain: number): void`(design/components.md §3.y).
 * bridge mock(vi.mock 'bridge/commands' — getAlarmSound만 관찰). Audio는 전역 스텁(FakeAudio), defaultAlarmUrl은
 *   실제 alarmSound 모듈을 감싼 부분 mock('blob:default' 고정 — playSound는 실제 구현). 실제 소리·sleep 없음.
 * 시나리오: src/overlay/test/scenarios.md TC-300 ~ TC-305
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAlarmSound, type AlarmSound, type TimerStatus } from 'bridge'
import type { TimerSnapshotState } from '../../components/hooks/useTimerSnapshot'
import { defaultAlarmUrl } from '../../components/utils/alarmSound'
import { useAlarmOnFinish } from '../hooks/useAlarmOnFinish'

vi.mock('bridge/commands', () => ({ getAlarmSound: vi.fn() }))
vi.mock('bridge/events', () => ({ EVENTS: {}, onTimerChanged: vi.fn() }))
vi.mock('../../components/utils/alarmSound', async importOriginal => {
  const actual = await importOriginal<typeof import('../../components/utils/alarmSound')>()
  return { ...actual, defaultAlarmUrl: vi.fn(() => 'blob:default') }
})

// ─── Audio 스텁 ────────────────────────────────────────────────────────────
type PlayMode = 'resolve' | 'reject' | 'pending' | 'throw'
const fa = { instances: [] as FakeAudio[], modes: [] as PlayMode[] }
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

// ─── 픽스처·헬퍼 ────────────────────────────────────────────────────────────
const DUR = 1_500_000
const USER: AlarmSound = { format: 'mp3', bytes: 1_000, url: 'u:alarm' }
/** useTimerSnapshot 반환값 모양 — 매번 새 스냅숏 객체(효과 2 deps [state.snapshot, state.fromEvent]) */
const st = (status: TimerStatus, fromEvent: boolean): TimerSnapshotState => ({
  snapshot: { status, elapsedMs: status === 'finished' ? DUR : 0, mode: 'countdown', durationMs: DUR },
  receivedAt: 0,
  fromEvent,
})
const flush = () =>
  act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve()
  })
const deferred = <T>() => {
  let res!: (v: T) => void
  let rej!: (e: unknown) => void
  const promise = new Promise<T>((a, b) => {
    res = a
    rej = b
  })
  return { promise, resolve: res, reject: rej }
}
type Props = { s: TimerSnapshotState; g: number }
const setup = async (initial: TimerSnapshotState = st('stopped', false), gain = 0.8) => {
  let renders = 0
  const r = renderHook(
    ({ s, g }: Props) => {
      renders++
      useAlarmOnFinish(s, g)
    },
    { initialProps: { s: initial, g: gain } },
  )
  await flush()
  const go = async (s: TimerSnapshotState, g = gain) => {
    r.rerender({ s, g })
    await flush()
  }
  return { ...r, go, renders: () => renders }
}

beforeEach(() => {
  vi.clearAllMocks()
  fa.instances = []
  fa.modes = []
  vi.stubGlobal('Audio', FakeAudio)
  vi.mocked(getAlarmSound).mockResolvedValue(USER)
  vi.mocked(defaultAlarmUrl).mockImplementation(() => 'blob:default')
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAlarmOnFinish — 판정표 (design.md §10.15 15.2)', () => {
  it('TC-300 ① (CR-055 개정): 3행 running → finished(이벤트) → getAlarmSound() 1회(인자 없음) → 등록 url Audio 1개·volume 0.8·play 1회·1회 재생(loop false), 훅은 렌더를 일으키지 않음', async () => {
    const h = await setup()
    await h.go(st('running', true))
    expect(getAlarmSound).not.toHaveBeenCalled()
    const r0 = h.renders()
    await h.go(st('finished', true))
    expect(getAlarmSound).toHaveBeenCalledTimes(1)
    expect(getAlarmSound).toHaveBeenCalledWith()
    expect(fa.instances).toHaveLength(1)
    const a = fa.instances[0]
    expect(a.src).toBe('u:alarm')
    expect(a.volume).toBe(0.8)
    expect(a.play).toHaveBeenCalledTimes(1)
    expect(a.loop).toBe(false) // CR-055: 1회 재생(R-39 「반복 없음」 — CR-052 loop true 폐기)
    expect(a.pause).not.toHaveBeenCalled()
    expect(defaultAlarmUrl).not.toHaveBeenCalled()
    expect(h.renders()).toBe(r0 + 1) // rerender 1회분뿐 — 조회·재생 뒤 추가 렌더 없음(ref만)
  })

  it('TC-300 ②: 4행 — 이전이 stopped·paused·null(마운트)이어도 finished 이벤트면 1회 재생', async () => {
    const a = await setup(st('stopped', true))
    await a.go(st('finished', true))
    expect(fa.instances).toHaveLength(1)
    a.unmount()
    const b = await setup(st('paused', true))
    await b.go(st('finished', true))
    expect(fa.instances).toHaveLength(2)
    b.unmount()
    await setup(st('finished', true))
    expect(fa.instances).toHaveLength(3)
    expect(getAlarmSound).toHaveBeenCalledTimes(3)
    for (const x of fa.instances) expect(x.play).toHaveBeenCalledTimes(1)
  })

  it('TC-301: 1·2·5행 — 마운트 초기값 없음, 첫 조회 결과 finished(fromEvent false) → 울리지 않음, 이어서 finished 이벤트 재수신도 0회', async () => {
    const h = await setup(st('stopped', false))
    expect(getAlarmSound).not.toHaveBeenCalled()
    await h.go(st('finished', false))
    expect(getAlarmSound).not.toHaveBeenCalled()
    expect(fa.instances).toHaveLength(0)
    await h.go(st('finished', true))
    expect(getAlarmSound).not.toHaveBeenCalled()
    expect(fa.instances).toHaveLength(0)
  })

  it('TC-302 ① (CR-055 개정): 6행 finished → stopped(10초 종료·멈춤·끄기) → 1회 재생 중이던(loop false) 소리 pause 1회·currentTime 0, 다음 회차 finished 이벤트는 다시 1회·loop false', async () => {
    const h = await setup(st('running', true))
    await h.go(st('finished', true))
    const a = fa.instances[0]
    expect(a.loop).toBe(false) // CR-055: 1회 재생 — 재생 중 finished를 떠나면 정지는 그대로
    a.currentTime = 4.5
    await h.go(st('stopped', true))
    expect(a.pause).toHaveBeenCalledTimes(1)
    expect(a.currentTime).toBe(0)
    expect(fa.instances).toHaveLength(1)
    await h.go(st('running', true))
    await h.go(st('finished', true))
    expect(fa.instances).toHaveLength(2)
    expect(fa.instances[1].play).toHaveBeenCalledTimes(1)
    expect(fa.instances[1].loop).toBe(false) // CR-055: 다음 회차도 1회 재생
    expect(getAlarmSound).toHaveBeenCalledTimes(2)
    expect(a.pause).toHaveBeenCalledTimes(1)
  })

  it('TC-302 ②③: 6행 finished → running(끝남 중 시작) 정지 / 7행 재생 중 언마운트 정지', async () => {
    const h = await setup(st('running', true))
    await h.go(st('finished', true))
    const a = fa.instances[0]
    await h.go(st('running', true))
    expect(a.pause).toHaveBeenCalledTimes(1)
    expect(a.currentTime).toBe(0)
    h.unmount()
    const k = await setup(st('running', true))
    await k.go(st('finished', true))
    const b = fa.instances[1]
    k.unmount()
    expect(b.pause).toHaveBeenCalledTimes(1)
    expect(b.currentTime).toBe(0)
  })
})

describe('useAlarmOnFinish — 실패 분기 (design.md §10.15 15.2 재생 순서·실패 알림 순서, 15.4)', () => {
  it('TC-303 ①② (CR-055 개정): 등록 url play() 거부 → 기본 url Audio 1개 더·volume 0.8·play 1회·등록 url·대체 기본음 모두 1회 재생(loop false) / 기본음도 거부 → 세 번째 Audio 없음', async () => {
    fa.modes.push('reject')
    const h = await setup(st('running', true))
    await h.go(st('finished', true))
    expect(fa.instances.map(x => x.src)).toEqual(['u:alarm', 'blob:default'])
    expect(fa.instances[1].volume).toBe(0.8)
    expect(fa.instances[1].play).toHaveBeenCalledTimes(1)
    expect(fa.instances.map(x => x.loop)).toEqual([false, false]) // CR-055: 등록 url·대체 기본음 모두 1회 재생
    expect(defaultAlarmUrl).toHaveBeenCalledTimes(1)
    expect(getAlarmSound).toHaveBeenCalledTimes(1) // 회차당 1회 — 기본음 재시도는 재조회하지 않음
    expect(getAlarmSound).toHaveBeenCalledWith()
    h.unmount()
    fa.instances = []
    fa.modes.push('reject', 'reject')
    const k = await setup(st('running', true))
    await k.go(st('finished', true))
    await flush()
    expect(fa.instances.map(x => x.src)).toEqual(['u:alarm', 'blob:default'])
    expect(getAlarmSound).toHaveBeenCalledTimes(2) // 누계(① 1 + ② 1) — 기본음 실패에도 재조회 없음
  })

  it('TC-303 ③ (CR-055 개정): 등록 url play() 동기 예외 → 기본음 Audio 1개·play 1회(1회만)·1회 재생(loop false) → finished를 떠나면(stopped 이벤트) 기본음 pause 1회·currentTime 0', async () => {
    fa.modes.push('throw')
    const h = await setup(st('running', true))
    await h.go(st('finished', true))
    await flush()
    expect(fa.instances.map(x => x.src)).toEqual(['u:alarm', 'blob:default'])
    const d = fa.instances[1]
    expect(d.play).toHaveBeenCalledTimes(1)
    expect(d.volume).toBe(0.8)
    expect(d.loop).toBe(false) // CR-055: 대체 기본음도 1회 재생 — 재생 중 stopped 이면 멈춤
    d.currentTime = 1.2
    await h.go(st('stopped', true))
    expect(d.pause).toHaveBeenCalledTimes(1)
    expect(d.currentTime).toBe(0)
    expect(fa.instances).toHaveLength(2)
    expect(getAlarmSound).toHaveBeenCalledTimes(1) // 회차당 1회(stopped로 재조회 없음)
    expect(getAlarmSound).toHaveBeenCalledWith()
  })

  it('TC-303 ④ (CR-055 개정): 등록 url error 이벤트 → 기본음 1회 재시도·1회 재생(loop false)', async () => {
    fa.modes.push('pending')
    const h = await setup(st('running', true))
    await h.go(st('finished', true))
    expect(fa.instances).toHaveLength(1)
    await act(async () => {
      fa.instances[0].fire('error')
    })
    await flush()
    expect(fa.instances.map(x => x.src)).toEqual(['u:alarm', 'blob:default'])
    expect(fa.instances[1].play).toHaveBeenCalledTimes(1)
    expect(fa.instances.map(x => x.loop)).toEqual([false, false]) // CR-055: 등록 url·error 뒤 대체 기본음 모두 1회 재생
    expect(getAlarmSound).toHaveBeenCalledTimes(1) // 회차당 1회(error 재시도는 재조회 없음)
    expect(getAlarmSound).toHaveBeenCalledWith()
  })

  it('TC-304 (CR-055 개정): getAlarmSound → null이면 기본 url(1회 재생 — loop false), reject면 기본 url(volume 0.8·play 1회·loop false), 기본음 실패는 재시도 없음', async () => {
    vi.mocked(getAlarmSound).mockResolvedValueOnce(null)
    const a = await setup(st('running', true))
    await a.go(st('finished', true))
    expect(fa.instances.map(x => x.src)).toEqual(['blob:default'])
    expect(fa.instances[0].volume).toBe(0.8)
    expect(fa.instances[0].play).toHaveBeenCalledTimes(1)
    expect(fa.instances[0].loop).toBe(false) // CR-055: 등록 없음 → 기본음도 1회 재생
    expect(getAlarmSound).toHaveBeenCalledTimes(1) // ① 1회·인자 없음
    expect(getAlarmSound).toHaveBeenLastCalledWith()
    a.unmount()
    fa.instances = []
    vi.mocked(getAlarmSound).mockRejectedValueOnce({ code: 'sound.io', message: 'x' })
    const b = await setup(st('running', true))
    await b.go(st('finished', true))
    expect(fa.instances.map(x => x.src)).toEqual(['blob:default'])
    expect(fa.instances[0].volume).toBe(0.8)
    expect(fa.instances[0].play).toHaveBeenCalledTimes(1)
    expect(fa.instances[0].loop).toBe(false) // CR-055: 조회 실패 → 기본음도 1회 재생
    expect(getAlarmSound).toHaveBeenCalledTimes(2) // ② 1회(누계 2) — 조회 실패에 재조회 없음
    expect(getAlarmSound).toHaveBeenLastCalledWith()
    b.unmount()
    fa.instances = []
    vi.mocked(getAlarmSound).mockResolvedValueOnce(null)
    fa.modes.push('reject')
    const c = await setup(st('running', true))
    await c.go(st('finished', true))
    await flush()
    expect(fa.instances.map(x => x.src)).toEqual(['blob:default'])
    expect(getAlarmSound).toHaveBeenCalledTimes(3) // ③ 1회(누계 3) — 기본음 실패에 재조회 없음
    expect(getAlarmSound).toHaveBeenLastCalledWith()
  })

  it('TC-305 ①: 회차 폐기 — getAlarmSound가 풀리기 전에 stopped 도착 → 늦게 온 결과로 Audio를 만들지 않음', async () => {
    const d = deferred<AlarmSound | null>()
    vi.mocked(getAlarmSound).mockImplementationOnce(() => d.promise)
    const h = await setup(st('running', true))
    await h.go(st('finished', true))
    await h.go(st('stopped', true))
    await act(async () => d.resolve(USER))
    await flush()
    expect(fa.instances).toHaveLength(0)
    expect(getAlarmSound).toHaveBeenCalledTimes(1) // ⓒ stopped로 재조회 없음
    expect(getAlarmSound).toHaveBeenCalledWith()
    expect(defaultAlarmUrl).not.toHaveBeenCalled() // 늦은 결과 폐기 — 기본음도 시도하지 않음
  })

  it('TC-305 ②: 재생 시작 시점의 gain 사용(조회 중 0.3으로 바뀌면 0.3), 재생 중 gain 변경은 반영하지 않음', async () => {
    const d = deferred<AlarmSound | null>()
    vi.mocked(getAlarmSound).mockImplementationOnce(() => d.promise)
    const h = await setup(st('running', true))
    const fin = st('finished', true)
    await h.go(fin)
    h.rerender({ s: fin, g: 0.3 })
    await flush()
    expect(getAlarmSound).toHaveBeenCalledTimes(1)
    await act(async () => d.resolve(USER))
    await flush()
    expect(fa.instances).toHaveLength(1)
    expect(fa.instances[0].volume).toBe(0.3)
    h.rerender({ s: fin, g: 0.1 })
    await flush()
    expect(fa.instances[0].volume).toBe(0.3)
    expect(fa.instances).toHaveLength(1)
  })

  it('TC-305 ③: 등록 파일 실패 알림(onFail) 전에 finished를 떠나면 기본음 재시도 없음', async () => {
    fa.modes.push('pending')
    const h = await setup(st('running', true))
    await h.go(st('finished', true))
    const a = fa.instances[0]
    await h.go(st('stopped', true))
    expect(a.pause).toHaveBeenCalledTimes(1)
    await act(async () => a.rejectPlay(new DOMException('blocked', 'NotAllowedError')))
    await flush()
    expect(fa.instances).toHaveLength(1)
    expect(defaultAlarmUrl).not.toHaveBeenCalled()
  })
})
