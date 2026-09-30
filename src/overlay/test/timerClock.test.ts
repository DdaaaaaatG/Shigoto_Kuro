/**
 * 뽀모도 타이머 공용 유틸 TC — CR-045(R-34·R-35·R-36) + CR-050(R-37·R-38, 타이머 모드).
 * 근거: design.md §10.14 14.4(nowMs·elapsedNow·formatElapsed·timerTextStyle)·14.8 ①, design/functions.md §5.6,
 *   contract v0.21 §5.8-2(표시식 — 계약은 식만 고정), requirements R-34(표기 00:00:00, 글자 기본 (268,402)·7°·36px·#333333
 *   — CR-058 🔒 0.4.0 기본 세트, Segoe UI 굵게·등폭 숫자). 아래 `DEF`(268,403·5°)는 식 검증용 픽스처일 뿐 제품 기본값을
 *   단언하지 않는다(제품 기본값 단언은 TC-286 ② `DEFAULT_TIMER_SETTINGS` — doc-sync 2026-09-30 주석 정정, 기대 불변).
 *   CR-050: design.md §10.15 15.1(표시 규칙 표 1~8행), design/functions.md §5.7 ①(snapshotMode·timerDisplayMs·
 *   formatRemaining·timerText·isTimerBlinking), contract v0.23 §3.9(TimerSnapshot mode?·durationMs? — 없으면 'stopwatch'·0).
 * 대상: src/components/utils/timerClock.ts(CR-050 함수 5개는 구현 전이라 import 실패로 이 파일 전체가 red — 정상).
 * 순수 함수 — bridge·DOM 의존 없음(bridge는 타입만 import, 런타임 호출 없음). 시계는 가짜 타이머(performance 포함). 실제 sleep 없음.
 * 시나리오: src/overlay/test/scenarios.md TC-264 ~ TC-267, TC-291 ~ TC-294
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TimerSettings, TimerSnapshot, TimerStatus } from 'bridge'
import {
  elapsedNow,
  formatElapsed,
  formatRemaining,
  isTimerBlinking,
  nowMs,
  snapshotMode,
  timerDisplayMs,
  timerText,
  timerTextStyle,
} from '../../components/utils/timerClock'

const snap = (status: TimerStatus, elapsedMs: number): TimerSnapshot => ({ status, elapsedMs })
/** 카운트다운 스냅숏(core가 항상 보내는 모양 — contract v0.23 §3.9) */
const DUR = 1_500_000
const cd = (status: TimerStatus, elapsedMs: number, durationMs: number = DUR): TimerSnapshot => ({
  status,
  elapsedMs,
  mode: 'countdown',
  durationMs,
})
/** durationMs 키가 아예 없는 카운트다운 스냅숏(방어 분기 — design/functions.md §5.7 timerDisplayMs `durationMs ?? 0`) */
const cdNoDuration = (status: TimerStatus, elapsedMs: number): TimerSnapshot => ({ status, elapsedMs, mode: 'countdown' })
const sw = (status: TimerStatus, elapsedMs: number): TimerSnapshot => ({ status, elapsedMs, mode: 'stopwatch', durationMs: 0 })
const ALL: TimerStatus[] = ['stopped', 'running', 'paused', 'restPaused', 'finished']
const DEF: TimerSettings = Object.freeze({
  enabled: false,
  textPos: Object.freeze({ x: 268, y: 403 }),
  rotation: 5,
  fontSize: 36,
  color: '#333333',
}) as TimerSettings

afterEach(() => {
  vi.useRealTimers()
})

describe('formatElapsed (design.md §10.14 14.4)', () => {
  it('TC-264: 설계 예 5개·초/분/시 경계는 HH:MM:SS, 음수·NaN·±Infinity는 00:00:00, 시는 99를 넘어도 자르지 않음', () => {
    const cases: [number, string][] = [
      [0, '00:00:00'],
      [999, '00:00:00'],
      [1_000, '00:00:01'],
      [59_999, '00:00:59'],
      [60_000, '00:01:00'],
      [3_599_999, '00:59:59'],
      [3_600_000, '01:00:00'],
      [3_723_000, '01:02:03'],
      [3_723_999.9, '01:02:03'],
      [359_999_999, '99:59:59'],
      [360_000_000, '100:00:00'],
    ]
    for (const [ms, text] of cases) expect(formatElapsed(ms), `${ms}`).toBe(text)
    for (const bad of [-1, -1_000, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(formatElapsed(bad), `${bad}`).toBe('00:00:00')
    }
  })
})

describe('elapsedNow (design.md §10.14 14.4, contract v0.21 §5.8-2)', () => {
  it('TC-265: running만 (now − receivedAt)을 더하고(음수 차이 0), paused·restPaused·stopped는 받은 elapsedMs 그대로, 입력 불변', () => {
    expect(elapsedNow(snap('running', 5_000), 1_000, 3_500)).toBe(7_500)
    expect(elapsedNow(snap('running', 0), 0, 0)).toBe(0)
    expect(elapsedNow(snap('running', 5_000), 1_000, 1_000)).toBe(5_000)
    expect(elapsedNow(snap('running', 5_000), 1_000, 400)).toBe(5_000)
    for (const s of ['paused', 'restPaused', 'stopped'] as TimerStatus[]) {
      expect(elapsedNow(snap(s, 61_000), 1_000, 999_999), s).toBe(61_000)
      expect(elapsedNow(snap(s, 61_000), 1_000, 0), s).toBe(61_000)
    }
    expect(formatElapsed(elapsedNow(snap('running', 59_500), 0, 500))).toBe('00:01:00')
    const frozen = Object.freeze(snap('running', 1))
    expect(() => elapsedNow(frozen, 0, 10)).not.toThrow()
    expect(frozen).toEqual({ status: 'running', elapsedMs: 1 })
  })
})

describe('timerTextStyle (design.md §10.14 14.4)', () => {
  it('TC-266: 기본값 → 설계 필드 전부(중심 textPos·translate(-50%,-50%) rotate·fontSize·color·nowrap·Segoe UI 700·tabular-nums·pointer-events none), 다른 값은 그대로 매핑, enabled는 스타일에 영향 없음', () => {
    expect(timerTextStyle(DEF)).toEqual({
      position: 'absolute',
      left: 268,
      top: 403,
      transform: 'translate(-50%, -50%) rotate(5deg)',
      transformOrigin: '50% 50%',
      fontSize: 36,
      color: '#333333',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      fontFamily: "'Segoe UI', 'Malgun Gothic', sans-serif",
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      pointerEvents: 'none',
      userSelect: 'none',
    })
    const other: TimerSettings = { enabled: true, textPos: { x: 100, y: 200 }, rotation: -10, fontSize: 48, color: '#ff0000' }
    const s = timerTextStyle(other)
    expect(s.left).toBe(100)
    expect(s.top).toBe(200)
    expect(s.transform).toBe('translate(-50%, -50%) rotate(-10deg)')
    expect(s.fontSize).toBe(48)
    expect(s.color).toBe('#ff0000')
    expect(timerTextStyle({ ...DEF, enabled: true })).toEqual(timerTextStyle(DEF))
    expect(DEF).toEqual({ enabled: false, textPos: { x: 268, y: 403 }, rotation: 5, fontSize: 36, color: '#333333' })
  })
})

describe('nowMs (design.md §10.14 14.4 — 단조 시계)', () => {
  it('TC-267: nowMs() = performance.now(), 가짜 시계를 1234ms 움직이면 1234 증가', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] })
    const a = nowMs()
    expect(typeof a).toBe('number')
    expect(a).toBe(performance.now())
    vi.advanceTimersByTime(1_234)
    expect(nowMs() - a).toBe(1_234)
    expect(nowMs()).toBe(performance.now())
  })
})

// ─── CR-050 타이머 모드 (design/functions.md §5.7 ①) ─────────────────────────
describe('snapshotMode (design/functions.md §5.7 ① — CR-050)', () => {
  it('TC-291: mode 없음 → stopwatch(옛 픽스처·초기값 호환), countdown → countdown, stopwatch → stopwatch, 입력 불변', () => {
    expect(snapshotMode(snap('stopped', 0))).toBe('stopwatch')
    expect(snapshotMode(snap('running', 12_000))).toBe('stopwatch')
    expect(snapshotMode(cd('running', 0))).toBe('countdown')
    expect(snapshotMode(cd('finished', DUR))).toBe('countdown')
    expect(snapshotMode(sw('running', 0))).toBe('stopwatch')
    const frozen = Object.freeze(cd('paused', 1))
    expect(() => snapshotMode(frozen)).not.toThrow()
    expect(frozen).toEqual({ status: 'paused', elapsedMs: 1, mode: 'countdown', durationMs: DUR })
  })
})

describe('timerDisplayMs (design/functions.md §5.7 ① — CR-050)', () => {
  it('TC-292: 카운트다운 = max(0, durationMs − elapsedNow)(running은 받은 뒤 흐른 시간 차감), durationMs 없음 → 0, 스톱워치·mode 없음 = elapsedNow, finished → 0', () => {
    expect(timerDisplayMs(cd('running', 1_000), 0, 0)).toBe(1_499_000)
    expect(timerDisplayMs(cd('running', 1_000), 0, 500)).toBe(1_498_500)
    expect(timerDisplayMs(cd('running', 0), 2_000, 2_001)).toBe(1_499_999)
    expect(timerDisplayMs(cd('running', 1_499_000), 0, 5_000)).toBe(0)
    const noDur = cdNoDuration('running', 0)
    expect('durationMs' in noDur).toBe(false)
    expect(timerDisplayMs(noDur, 0, 1_000)).toBe(0)
    expect(timerDisplayMs(cd('stopped', 0), 0, 99_999)).toBe(DUR)
    expect(timerDisplayMs(cd('paused', 600_000), 0, 99_999)).toBe(900_000)
    expect(timerDisplayMs(cd('finished', DUR), 0, 99_999)).toBe(0)
    for (const [receivedAt, now] of [
      [1_000, 3_500],
      [1_000, 400],
      [0, 0],
    ]) {
      expect(timerDisplayMs(sw('running', 5_000), receivedAt, now)).toBe(elapsedNow(sw('running', 5_000), receivedAt, now))
      expect(timerDisplayMs(snap('running', 5_000), receivedAt, now)).toBe(elapsedNow(snap('running', 5_000), receivedAt, now))
    }
    expect(timerDisplayMs(snap('running', 5_000), 1_000, 3_500)).toBe(7_500)
    expect(timerDisplayMs(snap('paused', 61_000), 0, 999_999)).toBe(61_000)
  })
})

describe('formatRemaining (design/functions.md §5.7 ① — 올림 표기, CR-050)', () => {
  it('TC-293: 설계 예 7개(1500000·1499001 → 00:25:00, 1499000 → 00:24:59, 1 → 00:00:01, 0, 359999000 → 99:59:59, −1·NaN·Infinity → 00:00:00), 시는 99를 넘어도 자르지 않음', () => {
    const cases: [number, string][] = [
      [1_500_000, '00:25:00'],
      [1_499_001, '00:25:00'],
      [1_499_000, '00:24:59'],
      [1, '00:00:01'],
      [0, '00:00:00'],
      [359_999_000, '99:59:59'],
      [360_000_000, '100:00:00'],
    ]
    for (const [ms, text] of cases) expect(formatRemaining(ms), `${ms}`).toBe(text)
    for (const bad of [-1, -1_000, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(formatRemaining(bad), `${bad}`).toBe('00:00:00')
    }
    // formatElapsed(내림)는 불변 — 같은 입력에서 두 표기가 갈린다
    expect(formatElapsed(1_499_001)).toBe('00:24:59')
    expect(formatElapsed(1)).toBe('00:00:00')
  })
})

describe('timerText · isTimerBlinking (design.md §10.15 15.1 표, design/functions.md §5.7 ① — CR-050)', () => {
  it('TC-294 ①: 15.1 표 1~8행 — 스톱워치 내림(999 → 00:00:00) / 카운트다운 올림(시작 00:25:00, 받은 직후 00:24:59, 1ms 뒤 00:25:00, 일시정지 00:15:00, ≤0 → 00:00:00, finished 00:00:00)', () => {
    expect(timerText(snap('stopped', 0), 0, 0)).toBe('00:00:00') // 1행(mode 없음 = 스톱워치)
    expect(timerText(sw('running', 12_000), 0, 0)).toBe('00:00:12') // 2행
    expect(timerText(snap('running', 999), 0, 0)).toBe('00:00:00') // 스톱워치 내림
    expect(timerText(sw('running', 0), 0, 1_000)).toBe('00:00:01')
    expect(timerText(cd('stopped', 0), 0, 0)).toBe('00:25:00') // 3행
    expect(timerText(cd('running', 1_000), 0, 0)).toBe('00:24:59') // 4행
    expect(timerText(cd('running', 0), 0, 1)).toBe('00:25:00') // 5행
    expect(timerText(cd('paused', 600_000), 0, 999_999)).toBe('00:15:00') // 6행
    expect(timerText(cd('running', 1_499_000), 0, 5_000)).toBe('00:00:00') // 7행(0으로 자름)
    expect(timerText(cd('finished', DUR), 0, 999_999)).toBe('00:00:00') // 8행
  })

  it('TC-294 ②: isTimerBlinking — 5개 status 중 finished만 true(mode 무관)', () => {
    for (const s of ALL) {
      expect(isTimerBlinking(cd(s, 0)), s).toBe(s === 'finished')
      expect(isTimerBlinking(snap(s, 0)), `${s}(mode 없음)`).toBe(s === 'finished')
    }
  })
})
