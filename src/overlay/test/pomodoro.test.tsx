/// <reference types="node" />
/**
 * 뽀모도 타이머 훅·컴포넌트 TC — CR-045(R-33~R-36) + CR-050(R-39 — useTimerSnapshot fromEvent).
 * 근거: design.md §10.14 14.1(DOM·.pomodoro CSS·격리)·14.2(표시 표 5행)·14.3(PomodoroLayer·TimerText·공용 3파일)·
 *   14.4(useTimerSnapshot·useElapsedText·isTimerTextVisible·PomodoroLayer 렌더·TimerText 렌더)·14.5(리렌더 경계)·14.7(aria-hidden)·
 *   14.8 ②③④, §4 상태({snapshot, receivedAt}·text), §6 P-8 ①②③·오류, §8·§9, design/functions.md §5.6, design/components.md §3.x,
 *   contract v0.21 §5.8-3(구독 먼저 → 조회)·§3.9 TimerSnapshot.
 *   CR-050: design/functions.md §5.7 ③(TimerSnapshotState.fromEvent — 초기·조회 false, 이벤트 true), design.md §4 fromEvent 행.
 *   (scenarios v1.9 개정: TC-268·TC-269·TC-270 ①의 상태 단언에 fromEvent를 더함 — 훅이 항상 채우므로 toEqual 대상이 바뀜)
 * 대상: src/components/hooks/useTimerSnapshot.ts · src/components/hooks/useElapsedText.ts(신규 공용),
 *   src/overlay/components/PomodoroLayer.tsx · TimerText.tsx(신규) — 구현 전에는 import 실패로 이 파일 전체가 red.
 * bridge mock(vi.mock 'bridge/commands'·'bridge/events') — 실제 Tauri API import 없음. 래퍼 이름은 contract v0.21 §5.8
 *   (getTimer·setResting·onTimerChanged) + v0.23 getAlarmSound(CR-050 — 이 스펙은 finished 진입 이벤트를 흘리지 않아 관찰하지 않음).
 *   가짜 시계(performance 포함 — nowMs = performance.now()). 실제 sleep 없음.
 * findEntry는 LayerStack 실제 구현을 감싼 spy — slot 'pomo_char' 호출 수 = PomodoroLayer 렌더 횟수의 대리 관찰.
 * 시나리오: src/overlay/test/scenarios.md TC-268 ~ TC-281, TC-289, TC-306
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { act, cleanup, render, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getTimer,
  onTimerChanged,
  setResting,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type TimerSettings,
  type TimerSnapshot,
  type TimerStatus,
} from 'bridge'
import { useTimerSnapshot } from '../../components/hooks/useTimerSnapshot'
import { useElapsedText } from '../../components/hooks/useElapsedText'
import { findEntry } from '../components/LayerStack'
import PomodoroLayer, { isTimerTextVisible } from '../components/PomodoroLayer'
import TimerText from '../components/TimerText'

// ─── bridge·CSS mock ────────────────────────────────────────────────────
const h = vi.hoisted(() => ({ timerCb: undefined as ((p: unknown) => void) | undefined }))
vi.mock('bridge/commands', () => ({
  getTimer: vi.fn(),
  setResting: vi.fn(),
  // CR-050(scenarios v1.9): TimerText → useAlarmOnFinish가 finished 진입 이벤트 때 부른다 — 이 스펙은 관찰하지 않는다(일반 함수)
  getAlarmSound: () => Promise.resolve(null),
}))
vi.mock('bridge/events', () => ({ EVENTS: { timerChanged: 'timer://changed' }, onTimerChanged: vi.fn() }))
vi.mock('../overlay.module.css', () => ({
  default: { layer: 'layer', pomodoro: 'pomodoro', jellyWrap: 'jellyWrap', jelly: 'jelly', jellyAlt: 'jellyAlt', shiver: 'shiver' },
}))
vi.mock('../components/LayerStack', async importOriginal => {
  const actual = await importOriginal<typeof import('../components/LayerStack')>()
  return { ...actual, findEntry: vi.fn(actual.findEntry) }
})

// ─── 픽스처 ───────────────────────────────────────────────────────────────
const CANVAS = { width: 900, height: 700 }
const entry = (key: string): AssetEntry => ({
  slot: key as unknown as AssetSlot,
  fileName: `${key}.png`,
  width: 900,
  height: 700,
  bytes: 1,
  url: `u:${key}`,
})
const BASE = [entry('body'), entry('idle'), entry('kb_up')]
const M_NONE: AssetManifest = { canvas: CANVAS, entries: BASE }
const M_CHAR: AssetManifest = { canvas: CANVAS, entries: [...BASE, entry('pomo_char')] }
const M_BUBBLE: AssetManifest = { canvas: CANVAS, entries: [...BASE, entry('pomo_bubble')] }
/** 매니페스트 순서를 뒤집어 둔다 — DOM 순서가 설계(인물 → 말풍선 → 글자)로 정해지는지 본다 */
const M_BOTH: AssetManifest = { canvas: CANVAS, entries: [entry('pomo_bubble'), ...BASE, entry('pomo_char')] }
const EMPTY: AssetManifest = { canvas: null, entries: [] } as unknown as AssetManifest
/** 설계 기본값(design.md §4 timer 초기값·requirements R-34)과 같은 값 — bridge 상수에 기대지 않는 지역 픽스처 */
const TIMER_OFF: TimerSettings = { enabled: false, textPos: { x: 268, y: 403 }, rotation: 5, fontSize: 36, color: '#333333' }
const TIMER_ON: TimerSettings = { ...TIMER_OFF, enabled: true }
const T2: TimerSettings = { enabled: true, textPos: { x: 100, y: 200 }, rotation: -10, fontSize: 48, color: '#ff0000' }
const snap = (status: TimerStatus, elapsedMs: number): TimerSnapshot => ({ status, elapsedMs })
/** CR-050 카운트다운 스냅숏(contract v0.23 §3.9 — core가 항상 보내는 모양) */
const cd = (status: TimerStatus, elapsedMs: number): TimerSnapshot => ({ status, elapsedMs, mode: 'countdown', durationMs: 1_500_000 })
const STOPPED = snap('stopped', 0)
const ERR = { code: 'state.poisoned', message: 'x' }

// ─── 헬퍼 ────────────────────────────────────────────────────────────────
const flush = () =>
  act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  })
const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
  await flush()
}
const emitTimer = async (s: TimerSnapshot) => {
  await act(async () => {
    h.timerCb?.(s)
  })
}
const deferred = <T,>() => {
  let res!: (v: T) => void
  let rej!: (e: unknown) => void
  const promise = new Promise<T>((a, b) => {
    res = a
    rej = b
  })
  return { promise, resolve: res, reject: rej }
}
const pomoCalls = () => vi.mocked(findEntry).mock.calls.filter(c => c[1] === ('pomo_char' as unknown as AssetSlot)).length
const pomo = (c: HTMLElement) => c.querySelector('.pomodoro') as HTMLElement | null
const textEl = (c: HTMLElement) => c.querySelector('.pomodoro > div, div[aria-hidden="true"]') as HTMLElement
const ids = (el: Element) => Array.from(el.children).map(ch => (ch.tagName === 'IMG' ? ch.getAttribute('src') : 'text'))

let unlisten: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] })
  vi.clearAllMocks()
  h.timerCb = undefined
  unlisten = vi.fn()
  vi.mocked(onTimerChanged).mockImplementation(((cb: (p: unknown) => void) => {
    h.timerCb = cb
    return Promise.resolve(unlisten)
  }) as never)
  vi.mocked(getTimer).mockResolvedValue(STOPPED)
  vi.mocked(setResting).mockResolvedValue(STOPPED)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ─── useTimerSnapshot ───────────────────────────────────────────────────
describe('useTimerSnapshot (design.md §10.14 14.4, P-8 ①③·오류)', () => {
  it('TC-268: 초기값 {stopped·0, receivedAt 0, fromEvent false} → onTimerChanged 구독 완료 뒤에만 getTimer() 1회 → 응답을 receivedAt = nowMs()·fromEvent false와 함께 반영', async () => {
    const sub = deferred<() => void>()
    vi.mocked(onTimerChanged).mockImplementationOnce(((cb: (p: unknown) => void) => {
      h.timerCb = cb
      return sub.promise
    }) as never)
    const got = deferred<TimerSnapshot>()
    vi.mocked(getTimer).mockImplementationOnce(() => got.promise)
    const { result } = renderHook(() => useTimerSnapshot())
    expect(result.current).toEqual({ snapshot: { status: 'stopped', elapsedMs: 0 }, receivedAt: 0, fromEvent: false })
    await flush()
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(typeof vi.mocked(onTimerChanged).mock.calls[0][0]).toBe('function')
    expect(getTimer).not.toHaveBeenCalled()
    await act(async () => sub.resolve(unlisten))
    await flush()
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledWith()
    expect(vi.mocked(onTimerChanged).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(getTimer).mock.invocationCallOrder[0])
    await advance(1_500)
    const at = performance.now()
    await act(async () => got.resolve(snap('running', 12_000)))
    await flush()
    expect(result.current).toEqual({ snapshot: { status: 'running', elapsedMs: 12_000 }, receivedAt: at, fromEvent: false })
    expect(setResting).not.toHaveBeenCalled()
  })

  it('TC-269: 조회 응답 전에 온 이벤트가 이긴다(늦은 조회 결과 버림), 이후 이벤트는 매번 교체·receivedAt 갱신(fromEvent true)', async () => {
    const got = deferred<TimerSnapshot>()
    vi.mocked(getTimer).mockImplementationOnce(() => got.promise)
    const { result } = renderHook(() => useTimerSnapshot())
    await flush()
    expect(getTimer).toHaveBeenCalledTimes(1)
    await advance(500)
    const at1 = performance.now()
    await emitTimer(snap('paused', 3_000))
    expect(result.current).toEqual({ snapshot: { status: 'paused', elapsedMs: 3_000 }, receivedAt: at1, fromEvent: true })
    await act(async () => got.resolve(snap('running', 1_000)))
    await flush()
    expect(result.current.snapshot).toEqual({ status: 'paused', elapsedMs: 3_000 })
    await advance(700)
    const at2 = performance.now()
    await emitTimer(snap('running', 3_000))
    expect(result.current).toEqual({ snapshot: { status: 'running', elapsedMs: 3_000 }, receivedAt: at2, fromEvent: true })
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
  })

  it('TC-270 ①: getTimer 계속 실패 → 200·500·1000ms 간격 재시도 3회(누계 4회) 뒤 멈춤, 초기값 유지, 이벤트는 계속 받음', async () => {
    vi.mocked(getTimer).mockRejectedValue(ERR)
    const { result } = renderHook(() => useTimerSnapshot())
    await flush()
    expect(getTimer).toHaveBeenCalledTimes(1)
    await advance(199)
    expect(getTimer).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(getTimer).toHaveBeenCalledTimes(2)
    await advance(500)
    expect(getTimer).toHaveBeenCalledTimes(3)
    await advance(1_000)
    expect(getTimer).toHaveBeenCalledTimes(4)
    await advance(10_000)
    expect(getTimer).toHaveBeenCalledTimes(4)
    expect(result.current).toEqual({ snapshot: STOPPED, receivedAt: 0, fromEvent: false })
    await emitTimer(snap('running', 0))
    expect(result.current.snapshot).toEqual({ status: 'running', elapsedMs: 0 })
  })

  it('TC-270 ②: 첫 조회 실패 → 200ms 뒤 재시도 성공이면 그 값 반영, 이후 추가 조회 없음', async () => {
    vi.mocked(getTimer).mockRejectedValueOnce(ERR).mockResolvedValueOnce(snap('paused', 5_000))
    const { result } = renderHook(() => useTimerSnapshot())
    await flush()
    await advance(200)
    expect(getTimer).toHaveBeenCalledTimes(2)
    expect(result.current.snapshot).toEqual({ status: 'paused', elapsedMs: 5_000 })
    await advance(5_000)
    expect(getTimer).toHaveBeenCalledTimes(2)
  })

  it('TC-271: 구독 실패여도 getTimer() 1회로 값을 받는다(재구독·주기 조회 없음)', async () => {
    vi.mocked(onTimerChanged).mockImplementationOnce((() => Promise.reject(ERR)) as never)
    vi.mocked(getTimer).mockResolvedValueOnce(snap('running', 42_000))
    const { result } = renderHook(() => useTimerSnapshot())
    await flush()
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(result.current.snapshot).toEqual({ status: 'running', elapsedMs: 42_000 })
    await advance(10_000)
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
  })

  it('TC-272 ①②: 언마운트하면 구독 해제 1회, 대기 중 재시도 취소', async () => {
    const a = renderHook(() => useTimerSnapshot())
    await flush()
    a.unmount()
    expect(unlisten).toHaveBeenCalledTimes(1)
    vi.clearAllMocks()
    unlisten = vi.fn()
    vi.mocked(getTimer).mockRejectedValue(ERR)
    const b = renderHook(() => useTimerSnapshot())
    await flush()
    expect(getTimer).toHaveBeenCalledTimes(1)
    b.unmount()
    await advance(5_000)
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(unlisten).toHaveBeenCalledTimes(1)
  })

  it('TC-272 ③: 구독이 언마운트 뒤에 완료되면 즉시 해제', async () => {
    const sub = deferred<() => void>()
    vi.mocked(onTimerChanged).mockImplementationOnce((() => sub.promise) as never)
    const { unmount } = renderHook(() => useTimerSnapshot())
    await flush()
    unmount()
    expect(unlisten).not.toHaveBeenCalled()
    await act(async () => sub.resolve(unlisten))
    await flush()
    expect(unlisten).toHaveBeenCalledTimes(1)
  })

  it('TC-306: fromEvent — 초기 false, getTimer 조회 결과(finished여도) false, timer://changed 이벤트는 매번 true, 구독 1회·조회 1회 유지', async () => {
    const got = deferred<TimerSnapshot>()
    vi.mocked(getTimer).mockImplementationOnce(() => got.promise)
    const { result } = renderHook(() => useTimerSnapshot())
    expect(result.current.fromEvent).toBe(false)
    await flush()
    await act(async () => got.resolve(cd('finished', 1_500_000)))
    await flush()
    expect(result.current.snapshot).toEqual(cd('finished', 1_500_000))
    expect(result.current.fromEvent).toBe(false)
    await emitTimer(cd('stopped', 0))
    expect(result.current.snapshot).toEqual(cd('stopped', 0))
    expect(result.current.fromEvent).toBe(true)
    await emitTimer(cd('running', 0))
    expect(result.current.snapshot).toEqual(cd('running', 0))
    expect(result.current.fromEvent).toBe(true)
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(setResting).not.toHaveBeenCalled()
  })
})

// ─── useElapsedText ─────────────────────────────────────────────────────
describe('useElapsedText (design.md §10.14 14.4, P-8 ②)', () => {
  it('TC-273: running이면 250ms interval 1개, 초가 바뀔 때만 다시 그림(3초에 3회), 1000ms마다 1초 증가', async () => {
    let renders = 0
    const s = snap('running', 0)
    const at = performance.now()
    const { result } = renderHook(() => {
      renders++
      return useElapsedText(s, at)
    })
    expect(result.current).toBe('00:00:00')
    expect(vi.getTimerCount()).toBe(1)
    const r0 = renders
    await advance(999)
    expect(result.current).toBe('00:00:00')
    expect(renders).toBe(r0)
    await advance(1)
    expect(result.current).toBe('00:00:01')
    expect(renders).toBe(r0 + 1)
    await advance(2_000)
    expect(result.current).toBe('00:00:03')
    expect(renders).toBe(r0 + 3)
  })

  it('TC-274: paused·restPaused·stopped는 interval 없음, 받은 elapsedMs 그대로 고정', async () => {
    const cases: [TimerStatus, number, string][] = [
      ['paused', 3_723_000, '01:02:03'],
      ['restPaused', 61_000, '00:01:01'],
      ['stopped', 0, '00:00:00'],
    ]
    for (const [status, ms, text] of cases) {
      const s = snap(status, ms)
      const { result, unmount } = renderHook(() => useElapsedText(s, 0))
      expect(result.current, status).toBe(text)
      expect(vi.getTimerCount(), status).toBe(0)
      await advance(10_000)
      expect(result.current, status).toBe(text)
      unmount()
    }
  })

  it('TC-275: 스냅숏이 바뀌면 즉시 반영·interval 전환(running 1개 ↔ 그 밖 0개), 언마운트 시 정리', async () => {
    const { result, rerender, unmount } = renderHook(({ s, at }) => useElapsedText(s, at), {
      initialProps: { s: snap('running', 10_000), at: performance.now() },
    })
    await advance(2_000)
    expect(result.current).toBe('00:00:12')
    expect(vi.getTimerCount()).toBe(1)
    rerender({ s: snap('paused', 15_000), at: performance.now() })
    expect(result.current).toBe('00:00:15')
    expect(vi.getTimerCount()).toBe(0)
    await advance(5_000)
    expect(result.current).toBe('00:00:15')
    rerender({ s: snap('running', 15_000), at: performance.now() })
    expect(vi.getTimerCount()).toBe(1)
    await advance(1_000)
    expect(result.current).toBe('00:00:16')
    rerender({ s: STOPPED, at: performance.now() })
    expect(result.current).toBe('00:00:00')
    expect(vi.getTimerCount()).toBe(0)
    rerender({ s: snap('running', 0), at: performance.now() })
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

// ─── TimerText ──────────────────────────────────────────────────────────
describe('TimerText (design.md §10.14 14.3·14.4 TimerText 렌더·14.7)', () => {
  it('TC-276: div 1개(class 없음·aria-hidden="true"·aria-live 없음), timerTextStyle 적용, 00:00:00 → 이벤트로 흐름·멈춤, setResting 호출 없음', async () => {
    const { container } = render(<TimerText timer={TIMER_ON} />)
    expect(container.children).toHaveLength(1)
    const el = container.firstElementChild as HTMLElement
    expect(el.tagName).toBe('DIV')
    expect(el.getAttribute('class')).toBeNull()
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.getAttribute('role')).toBeNull()
    expect(container.querySelector('[aria-live]')).toBeNull()
    expect(el.textContent).toBe('00:00:00')
    expect(el.style.position).toBe('absolute')
    expect(el.style.left).toBe('268px')
    expect(el.style.top).toBe('403px')
    expect(el.style.transform).toBe('translate(-50%, -50%) rotate(5deg)')
    expect(el.style.fontSize).toBe('36px')
    expect(el.style.color).toBe('rgb(51, 51, 51)')
    expect(el.style.whiteSpace).toBe('nowrap')
    expect(el.style.fontWeight).toBe('700')
    await flush()
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
    await emitTimer(snap('running', 59_000))
    expect(el.textContent).toBe('00:00:59')
    await advance(1_000)
    expect(el.textContent).toBe('00:01:00')
    await emitTimer(snap('restPaused', 61_000))
    expect(el.textContent).toBe('00:01:01')
    await advance(5_000)
    expect(el.textContent).toBe('00:01:01')
    expect(setResting).not.toHaveBeenCalled()
  })
})

// ─── PomodoroLayer ──────────────────────────────────────────────────────
describe('isTimerTextVisible · PomodoroLayer (design.md §10.14 14.2·14.3·14.4)', () => {
  it('TC-277: isTimerTextVisible = timer.enabled || pomo_char 등록 || pomo_bubble 등록(U-1), 다른 슬롯은 무관', () => {
    expect(isTimerTextVisible(TIMER_OFF, M_NONE)).toBe(false)
    expect(isTimerTextVisible(TIMER_ON, M_NONE)).toBe(true)
    expect(isTimerTextVisible(TIMER_OFF, M_CHAR)).toBe(true)
    expect(isTimerTextVisible(TIMER_OFF, M_BUBBLE)).toBe(true)
    expect(isTimerTextVisible(TIMER_OFF, M_BOTH)).toBe(true)
    expect(isTimerTextVisible(TIMER_ON, M_BOTH)).toBe(true)
    expect(isTimerTextVisible(TIMER_OFF, EMPTY)).toBe(false)
    expect(isTimerTextVisible(TIMER_ON, EMPTY)).toBe(true)
    expect(getTimer).not.toHaveBeenCalled()
  })

  it('TC-278: 표시 표 1~5행 — null / 글자만 / 인물+글자 / 말풍선+글자 / 인물→말풍선→글자, img = class "layer"·alt=""·draggable=false·style 없음', async () => {
    const rows: [number, TimerSettings, AssetManifest, string[] | null][] = [
      [1, TIMER_OFF, M_NONE, null],
      [2, TIMER_ON, M_NONE, ['text']],
      [3, TIMER_OFF, M_CHAR, ['u:pomo_char', 'text']],
      [4, TIMER_OFF, M_BUBBLE, ['u:pomo_bubble', 'text']],
      [5, TIMER_ON, M_BOTH, ['u:pomo_char', 'u:pomo_bubble', 'text']],
    ]
    for (const [row, timer, manifest, want] of rows) {
      vi.mocked(onTimerChanged).mockClear()
      const { container, unmount } = render(<PomodoroLayer manifest={manifest} timer={timer} />)
      await flush()
      if (want === null) {
        expect(container.innerHTML, `행 ${row}`).toBe('')
        expect(onTimerChanged, `행 ${row}`).not.toHaveBeenCalled()
      } else {
        expect(container.children, `행 ${row}`).toHaveLength(1)
        const root = container.firstElementChild as HTMLElement
        expect(root.tagName).toBe('DIV')
        expect(root.className, `행 ${row}`).toBe('pomodoro')
        expect(ids(root), `행 ${row}`).toEqual(want)
        for (const img of Array.from(root.querySelectorAll('img'))) {
          expect(img.className).toBe('layer')
          expect(img.getAttribute('alt')).toBe('')
          expect(img.getAttribute('draggable')).toBe('false')
          expect(img.getAttribute('style')).toBeNull()
        }
        const t = root.lastElementChild as HTMLElement
        expect(t.getAttribute('aria-hidden')).toBe('true')
        expect(t.textContent).toBe('00:00:00')
        expect(root.querySelectorAll('.jelly, .jellyAlt, .shiver, .jellyWrap')).toHaveLength(0)
        expect(onTimerChanged, `행 ${row}`).toHaveBeenCalledTimes(1)
      }
      unmount()
    }
    expect(setResting).not.toHaveBeenCalled()
  })

  it('TC-279: 글자 스타일 = timer 값(268,403·36px·#333333·5°) → timer 교체 시 같은 글자 노드에 새 위치·회전·크기·색, 그림이 있으면 enabled false여도 글자 유지', async () => {
    const { container, rerender } = render(<PomodoroLayer manifest={M_BOTH} timer={TIMER_ON} />)
    await flush()
    const t = textEl(container)
    expect(t.style.left).toBe('268px')
    expect(t.style.top).toBe('403px')
    expect(t.style.fontSize).toBe('36px')
    expect(t.style.color).toBe('rgb(51, 51, 51)')
    expect(t.style.transform).toBe('translate(-50%, -50%) rotate(5deg)')
    rerender(<PomodoroLayer manifest={M_BOTH} timer={T2} />)
    expect(textEl(container)).toBe(t)
    expect(t.style.left).toBe('100px')
    expect(t.style.top).toBe('200px')
    expect(t.style.fontSize).toBe('48px')
    expect(t.style.color).toBe('rgb(255, 0, 0)')
    expect(t.style.transform).toBe('translate(-50%, -50%) rotate(-10deg)')
    rerender(<PomodoroLayer manifest={M_BOTH} timer={{ ...T2, enabled: false }} />)
    expect(textEl(container)).toBe(t)
    expect(t.textContent).toBe('00:00:00')
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
  })

  it('TC-280: React.memo — 같은 manifest·timer 참조면 다시 그리지 않음, 초 갱신은 TimerText만, 새 참조면 다시 그림(구독은 1회 유지)', async () => {
    expect((PomodoroLayer as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'))
    const { container, rerender } = render(<PomodoroLayer manifest={M_BOTH} timer={TIMER_ON} />)
    await flush()
    const c1 = pomoCalls()
    expect(c1).toBeGreaterThanOrEqual(1)
    const root = pomo(container) as HTMLElement
    const t = textEl(container)
    rerender(<PomodoroLayer manifest={M_BOTH} timer={TIMER_ON} />)
    expect(pomoCalls()).toBe(c1)
    await emitTimer(snap('running', 0))
    await advance(3_000)
    expect(t.textContent).toBe('00:00:03')
    expect(pomoCalls()).toBe(c1)
    rerender(<PomodoroLayer manifest={M_BOTH} timer={{ ...TIMER_ON }} />)
    const c2 = pomoCalls()
    expect(c2).toBeGreaterThan(c1)
    rerender(<PomodoroLayer manifest={{ ...M_BOTH }} timer={{ ...TIMER_ON }} />)
    expect(pomoCalls()).toBeGreaterThan(c2)
    expect(pomo(container)).toBe(root)
    expect(textEl(container)).toBe(t)
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
  })

  it('TC-281: 글자 조건이 참이 될 때만 TimerText 마운트(구독 → 조회), 거짓이 되면 언마운트(해제)', async () => {
    const { container, rerender } = render(<PomodoroLayer manifest={M_NONE} timer={TIMER_OFF} />)
    await flush()
    expect(container.innerHTML).toBe('')
    expect(onTimerChanged).not.toHaveBeenCalled()
    expect(getTimer).not.toHaveBeenCalled()
    rerender(<PomodoroLayer manifest={M_NONE} timer={TIMER_ON} />)
    await flush()
    expect(ids(pomo(container) as HTMLElement)).toEqual(['text'])
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
    rerender(<PomodoroLayer manifest={M_NONE} timer={TIMER_OFF} />)
    await flush()
    expect(container.innerHTML).toBe('')
    expect(unlisten).toHaveBeenCalledTimes(1)
    rerender(<PomodoroLayer manifest={M_CHAR} timer={TIMER_OFF} />)
    await flush()
    expect(ids(pomo(container) as HTMLElement)).toEqual(['u:pomo_char', 'text'])
    expect(onTimerChanged).toHaveBeenCalledTimes(2)
    expect(getTimer).toHaveBeenCalledTimes(2)
  })
})

// ─── 정적 확인 ───────────────────────────────────────────────────────────
describe('정적 확인 (design.md §10.14 14.1 .pomodoro CSS·14.3 OverlayApp 변경 ④·경계 규칙)', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const read = (p: string) => readFileSync(resolve(here, p), 'utf8')

  it('TC-289: .pomodoro 규칙 = 6개 선언(애니메이션·transform 없음), OverlayApp 흐름 주석·400줄 한계, 새 파일은 Tauri API·useBridgeEvent·localStorage를 쓰지 않음', () => {
    const css = read('../overlay.module.css').replace(/\/\*[\s\S]*?\*\//g, '')
    const block = /\.pomodoro\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    const decl = Object.fromEntries(
      block
        .split(';')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => [s.slice(0, s.indexOf(':')).trim(), s.slice(s.indexOf(':') + 1).trim()]),
    )
    expect(decl).toEqual({
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      'pointer-events': 'none',
    })
    expect(/\.pomodoro[^{]*\{[^}]*(animation|transform)/.test(css)).toBe(false)
    const app = read('../index.tsx')
    expect(app).toContain('PomodoroLayer')
    expect(app).toMatch(/\/\/!.*PomodoroLayer/)
    expect(app.split('\n').length).toBeLessThanOrEqual(400)
    for (const p of [
      '../components/PomodoroLayer.tsx',
      '../components/TimerText.tsx',
      '../../components/hooks/useTimerSnapshot.ts',
      '../../components/hooks/useElapsedText.ts',
      '../../components/utils/timerClock.ts',
    ]) {
      const src = read(p)
      expect(src, p).not.toContain('@tauri-apps/api')
      expect(src, p).not.toContain('localStorage')
      expect(src.split('\n').length, p).toBeLessThanOrEqual(400)
    }
    expect(read('../../components/hooks/useTimerSnapshot.ts')).not.toContain('useBridgeEvent')
  })
})
