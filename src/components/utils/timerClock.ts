/**
 * 뽀모도·타이머 모드 표시 계산(design.md §10.14 14.4·§10.15 15.1, design/functions.md §5.6·§5.7 ①,
 * contract v0.21 §5.8-2·v0.23 §3.9) — 순수 함수만. bridge는 타입만 가져오고 런타임 호출은 하지 않는다.
 * 오버레이 TimerText·설정 창 미리보기가 공용으로 쓴다.
 */
import type { CSSProperties } from 'react'
import type { TimerMode, TimerSettings, TimerSnapshot } from 'bridge'

/** 단조 시계 — useTimerSnapshot·useElapsedText는 시각을 이 함수로만 읽는다(테스트는 가짜 타이머로 조작) */
export const nowMs = (): number => performance.now()

/** running만 받은 뒤 흐른 시간을 더한다(음수 차이는 0). 그 밖 상태는 받은 elapsedMs 그대로 */
export const elapsedNow = (s: TimerSnapshot, receivedAt: number, now: number): number =>
  s.elapsedMs + (s.status === 'running' ? Math.max(0, now - receivedAt) : 0)

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** ms → HH:MM:SS. 비유한수·음수는 00:00:00, 시는 99를 넘어도 자르지 않는다 */
export const formatElapsed = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 0) return '00:00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
}

/** (CR-050) 스냅숏의 모드 — 없으면(옛 픽스처·초기값 호환) 스톱워치 */
export const snapshotMode = (s: TimerSnapshot): TimerMode => s.mode ?? 'stopwatch'

/**
 * (CR-050) 화면에 표시할 ms. 카운트다운은 남은 시간(durationMs − elapsedNow, 0 미만은 0),
 * 그 밖(스톱워치·mode 없음)은 elapsedNow 그대로
 */
export const timerDisplayMs = (s: TimerSnapshot, receivedAt: number, now: number): number => {
  if (snapshotMode(s) !== 'countdown') return elapsedNow(s, receivedAt, now)
  return Math.max(0, (s.durationMs ?? 0) - elapsedNow(s, receivedAt, now))
}

/** (CR-050) ms → HH:MM:SS, 올림(카운트다운 표기). 비유한수·음수는 00:00:00, 시는 99를 넘어도 자르지 않는다 */
export const formatRemaining = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 0) return '00:00:00'
  const totalSeconds = Math.ceil(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
}

/** (CR-050) 두 창(오버레이·설정 창 미리보기)이 이 함수 하나로 시간 글자를 만든다 — 카운트다운은 올림, 그 밖은 내림 */
export const timerText = (s: TimerSnapshot, receivedAt: number, now: number): string => {
  const ms = timerDisplayMs(s, receivedAt, now)
  return snapshotMode(s) === 'countdown' ? formatRemaining(ms) : formatElapsed(ms)
}

/** (CR-050) finished 동안만 깜빡인다(글자 자체는 core가 이미 00:00:00으로 보낸다) */
export const isTimerBlinking = (s: TimerSnapshot): boolean => s.status === 'finished'

/** 시간 글자 스타일 — textPos는 글자 상자 중심. 오버레이·설정 창 미리보기가 같은 함수를 쓴다 */
export const timerTextStyle = (t: TimerSettings): CSSProperties => ({
  position: 'absolute',
  left: t.textPos.x,
  top: t.textPos.y,
  transform: `translate(-50%, -50%) rotate(${t.rotation}deg)`,
  transformOrigin: '50% 50%',
  fontSize: t.fontSize,
  color: t.color,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  fontFamily: "'Segoe UI', 'Malgun Gothic', sans-serif",
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  pointerEvents: 'none',
  userSelect: 'none',
})
