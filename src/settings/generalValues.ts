/**
 * 「기본 설정」 탭 순수 모듈 — design/general-tab.md §3.3. 배율(R-03)·유휴 시간(R-04) 변환·범위.
 */
import { SCALE_MAX, SCALE_MIN } from 'bridge/types'

/** 배율 슬라이더 단계 폭(%) */
export const SCALE_STEP_PERCENT = 5
/** 키보드 조작 후 저장까지 지연(ms) — 마지막 키 입력 기준 1회 저장 */
export const SCALE_KEY_COMMIT_MS = 300
/** 유휴 시간 허용 범위(분). 저장 범위는 60~3600초 */
export const IDLE_MIN_MINUTES = 1
export const IDLE_MAX_MINUTES = 60

export const scaleToPercent = (scale: number): number => Math.round(scale * 100)

/** 배율 슬라이더 min·max(%) — 25·200 을 화면에 직접 적지 않는다 */
export const percentBounds = (): { min: number; max: number } => ({
  min: scaleToPercent(SCALE_MIN),
  max: scaleToPercent(SCALE_MAX),
})

/** 저장된 초를 분으로 반올림 표시한다(60 배수가 아니어도 표시만, 저장값은 바꾸지 않는다). 최소 1분 */
export const idleSecondsToMinutes = (seconds: number): number => Math.max(1, Math.round(seconds / 60))

/** 입력 문자열을 1~IDLE_MAX_MINUTES 정수(분)로 판정한다. 그 외(빈 값·소수·범위 밖)는 null */
export const parseIdleMinutes = (text: string): number | null => {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const n = Number(trimmed)
  return n >= IDLE_MIN_MINUTES && n <= IDLE_MAX_MINUTES ? n : null
}
