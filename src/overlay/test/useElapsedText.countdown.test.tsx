/**
 * useElapsedText 카운트다운 TC — CR-050(R-37·R-38).
 * 근거: design.md §10.15 15.1(표시 규칙 표 1~8행·interval 열)·15.3(반환 string 유지)·15.4(새 interval 없음),
 *   design/functions.md §5.7 ②(계산식만 timerText로 — 효과 구조·250ms·값이 바뀔 때만 setState 불변).
 * 대상: src/components/hooks/useElapsedText.ts(개정 전에는 카운트다운 단언이 red — 정상).
 * bridge 호출 없음(훅은 스냅숏을 인자로 받는다) — 안전을 위해 bridge 모듈은 빈 mock. 가짜 시계(performance 포함). 실제 sleep 없음.
 * 시나리오: src/overlay/test/scenarios.md TC-295
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TimerSnapshot, TimerStatus } from 'bridge'
import { useElapsedText } from '../../components/hooks/useElapsedText'

vi.mock('bridge/commands', () => ({}))
vi.mock('bridge/events', () => ({ EVENTS: {} }))

const DUR = 1_500_000
const cd = (status: TimerStatus, elapsedMs: number): TimerSnapshot => ({ status, elapsedMs, mode: 'countdown', durationMs: DUR })

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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useElapsedText — 카운트다운 (design/functions.md §5.7 ②, design.md §10.15 15.1)', () => {
  it('TC-295 ①: countdown running 시작 00:25:00 → 999ms 00:25:00 → 1000ms 00:24:59, 초 경계마다 렌더 1회(3초에 3회), interval 1개, 반환은 string', async () => {
    let renders = 0
    const s = cd('running', 0)
    const at = performance.now()
    const { result } = renderHook(() => {
      renders++
      return useElapsedText(s, at)
    })
    expect(typeof result.current).toBe('string')
    expect(result.current).toBe('00:25:00')
    expect(vi.getTimerCount()).toBe(1)
    const r0 = renders
    await advance(999)
    expect(result.current).toBe('00:25:00')
    expect(renders).toBe(r0)
    await advance(1)
    expect(result.current).toBe('00:24:59')
    expect(renders).toBe(r0 + 1)
    await advance(2_000)
    expect(result.current).toBe('00:24:57')
    expect(renders).toBe(r0 + 3)
  })

  it('TC-295 ②: finished → 00:00:00·interval 없음(getTimerCount 0), 10초 지나도 그대로·렌더 없음', async () => {
    let renders = 0
    const s = cd('finished', DUR)
    const { result } = renderHook(() => {
      renders++
      return useElapsedText(s, 0)
    })
    expect(result.current).toBe('00:00:00')
    expect(vi.getTimerCount()).toBe(0)
    const r0 = renders
    await advance(10_000)
    expect(result.current).toBe('00:00:00')
    expect(renders).toBe(r0)
  })

  it('TC-295 ③: countdown stopped 00:25:00 · paused 00:15:00 — interval 없음·값 고정', async () => {
    const cases: [TimerSnapshot, string][] = [
      [cd('stopped', 0), '00:25:00'],
      [cd('paused', 600_000), '00:15:00'],
    ]
    for (const [s, text] of cases) {
      const { result, unmount } = renderHook(() => useElapsedText(s, 0))
      expect(result.current, s.status).toBe(text)
      expect(vi.getTimerCount(), s.status).toBe(0)
      await advance(10_000)
      expect(result.current, s.status).toBe(text)
      unmount()
    }
  })

  it('TC-295 ④: 0 직전 running(남은 500ms) 00:00:01 → 500ms 뒤 00:00:00 → core finished 전까지 00:00:00 유지(0으로 자름, 추가 렌더 없음)', async () => {
    let renders = 0
    const s = cd('running', 1_499_500)
    const at = performance.now()
    const { result } = renderHook(() => {
      renders++
      return useElapsedText(s, at)
    })
    expect(result.current).toBe('00:00:01')
    await advance(500)
    expect(result.current).toBe('00:00:00')
    const r0 = renders
    await advance(3_000)
    expect(result.current).toBe('00:00:00')
    expect(renders).toBe(r0)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('TC-295 ⑤: running → finished → stopped(지정 시간) 스냅숏 교체 즉시 반영, interval 1 → 0 → 0, 언마운트 정리', async () => {
    const { result, rerender, unmount } = renderHook(({ s, at }) => useElapsedText(s, at), {
      initialProps: { s: cd('running', 1_498_000), at: performance.now() },
    })
    expect(result.current).toBe('00:00:02')
    expect(vi.getTimerCount()).toBe(1)
    rerender({ s: cd('finished', DUR), at: performance.now() })
    expect(result.current).toBe('00:00:00')
    expect(vi.getTimerCount()).toBe(0)
    rerender({ s: cd('stopped', 0), at: performance.now() })
    expect(result.current).toBe('00:25:00')
    expect(vi.getTimerCount()).toBe(0)
    rerender({ s: cd('running', 0), at: performance.now() })
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('TC-295 ⑥: 스톱워치 결과 불변 — mode 없음·stopwatch 모두 내림(999ms 00:00:00 → 1000ms 00:00:01)', async () => {
    for (const s of [
      { status: 'running', elapsedMs: 0 } as TimerSnapshot,
      { status: 'running', elapsedMs: 0, mode: 'stopwatch', durationMs: 0 } as TimerSnapshot,
    ]) {
      const at = performance.now()
      const { result, unmount } = renderHook(() => useElapsedText(s, at))
      expect(result.current).toBe('00:00:00')
      await advance(999)
      expect(result.current).toBe('00:00:00')
      await advance(1)
      expect(result.current).toBe('00:00:01')
      unmount()
    }
    const { result } = renderHook(() => useElapsedText({ status: 'paused', elapsedMs: 12_000, mode: 'stopwatch', durationMs: 0 }, 0))
    expect(result.current).toBe('00:00:12')
  })
})
