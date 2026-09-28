/**
 * 「타이머」 탭 순수 모듈 — design/timer-tab.md §3(뽀모도 CR-045) + §14.5(타이머 모드 CR-050). 미리보기
 * 상자 크기, 글자 좌표·회전·크기 자르기, 색 문자열 정규화(CR-045) + 두 토글 표시·저장 패치, 시작 시간
 * 잠금·시분초 입력 파싱, 음량 자르기·용량 표시(CR-050). 부수 효과 없음 — 값 계산만 한다.
 */
import {
  DEFAULT_TIMER_SETTINGS,
  TIMER_ALARM_VOLUME_MAX,
  TIMER_COUNTDOWN_SECS_MAX,
  TIMER_COUNTDOWN_SECS_MIN,
  TIMER_FONT_SIZE_MAX,
  TIMER_FONT_SIZE_MIN,
  TIMER_ROTATION_MAX,
  TIMER_ROTATION_MIN,
  type CanvasSize,
  type Point,
  type TimerMode,
  type TimerSettings,
  type TimerStatus,
} from 'bridge/types'

/** 「타이머」 탭 카드 2 미리보기 상자 크기(design/timer-tab.md §1.2) */
export const TIMER_PREVIEW_BOX: { readonly width: 400; readonly height: 350 } = { width: 400, height: 350 }

const clampAxis = (v: number, max: number): number =>
  Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : 0

/** 시간 글자 중심을 캔버스 안 정수 좌표로 자른다. 비유한수는 0 */
export const clampTextPos = (p: Point, canvas: CanvasSize): Point => ({
  x: clampAxis(p.x, canvas.width),
  y: clampAxis(p.y, canvas.height),
})

/** 회전(도)을 TIMER_ROTATION_MIN~MAX 로 반올림 후 자른다. 비유한수는 기본값(DEFAULT_TIMER_SETTINGS.rotation = 7, CR-058) */
export const clampRotation = (v: number): number =>
  Number.isFinite(v)
    ? Math.min(TIMER_ROTATION_MAX, Math.max(TIMER_ROTATION_MIN, Math.round(v)))
    : DEFAULT_TIMER_SETTINGS.rotation

/** 글자 크기(px)를 TIMER_FONT_SIZE_MIN~MAX 로 반올림 후 자른다. 비유한수는 기본값(36) */
export const clampFontSize = (v: number): number =>
  Number.isFinite(v)
    ? Math.min(TIMER_FONT_SIZE_MAX, Math.max(TIMER_FONT_SIZE_MIN, Math.round(v)))
    : DEFAULT_TIMER_SETTINGS.fontSize

/** '#rrggbb' 형식이면 소문자로, 아니면 null(저장하지 않는다) */
export const normalizeColor = (v: string): string | null => (/^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null)

// ─── CR-050(타이머 모드) §14.5 ──────────────────────────────────────────────

/** 새 필드 3개(mode·countdownSecs·alarmVolume)가 항상 채워진 타이머 설정 */
export type FullTimerSettings = Required<TimerSettings>

/**
 * settings.timer(선택 필드 포함·undefined 가능)를 늘 8필드가 채워진 값으로 만든다. 옛 설정(새 필드
 * 없음)은 스톱워치·1500초·44%(CR-058)로 읽힌다. 명시적으로 undefined인 필드도 기본값으로 메운다
 */
export const fullTimer = (t: TimerSettings | undefined): FullTimerSettings => ({
  ...DEFAULT_TIMER_SETTINGS,
  ...t,
  mode: t?.mode ?? DEFAULT_TIMER_SETTINGS.mode ?? 'stopwatch',
  countdownSecs: t?.countdownSecs ?? DEFAULT_TIMER_SETTINGS.countdownSecs ?? 1500,
  alarmVolume: t?.alarmVolume ?? DEFAULT_TIMER_SETTINGS.alarmVolume ?? 44,
})

/** 두 스위치의 표시값 — 켜짐 && 그 모드일 때만 true(한쪽이 켜지면 다른 쪽은 저절로 꺼짐) */
export const timerToggles = (t: FullTimerSettings): { stopwatchOn: boolean; countdownOn: boolean } => ({
  stopwatchOn: t.enabled && t.mode === 'stopwatch',
  countdownOn: t.enabled && t.mode === 'countdown',
})

/** 토글 저장 패치 — 켜기는 모드까지, 끄기는 enabled만(모드는 유지) */
export const togglePatch = (mode: TimerMode, on: boolean): Partial<TimerSettings> =>
  on ? { enabled: true, mode } : { enabled: false }

/** 시작 시간 입력 잠금 — 타이머(카운트다운)가 켜져 있고 흐르는 중·일시정지·끝남일 때만 */
export const isDurationLocked = (t: FullTimerSettings, status: TimerStatus): boolean =>
  t.enabled && t.mode === 'countdown' && (status === 'running' || status === 'paused' || status === 'finished')

/** 초 → 시·분·초. 비유한수는 0, 0 ~ TIMER_COUNTDOWN_SECS_MAX(359999)로 자른다 */
export const splitHms = (secs: number): { h: number; m: number; s: number } => {
  const n = Number.isFinite(secs) ? Math.min(TIMER_COUNTDOWN_SECS_MAX, Math.max(0, Math.floor(secs))) : 0
  return { h: Math.floor(n / 3600), m: Math.floor((n % 3600) / 60), s: n % 60 }
}

/** 시·분·초(정수) → 초. 호출자가 이미 각 칸을 정수로 검증했다는 전제(parseHmsDraft) */
export const joinHms = (h: number, m: number, s: number): number => h * 3600 + m * 60 + s

/** 한 자리 수를 두 자리 문자열로 */
export const pad2 = (n: number): string => String(n).padStart(2, '0')

/** 시작 시간 입력 칸 세 개의 입력 중 문자열 */
export type HmsDraft = { h: string; m: string; s: string }

/** 칸 하나 파싱 — 트림 뒤 빈 문자열은 0, 정수 1~2자리가 아니거나 상한을 넘으면 null */
export const parseHmsField = (raw: string, max: number): number | null => {
  const trimmed = raw.trim()
  if (trimmed === '') return 0
  if (!/^\d{1,2}$/.test(trimmed)) return null
  const n = Number(trimmed)
  return n > max ? null : n
}

/** 세 칸을 초로 — 한 칸이라도 형식이 틀리면 null, 합계가 최소값(1초) 미만이어도 null */
export const parseHmsDraft = (d: HmsDraft): number | null => {
  const h = parseHmsField(d.h, 99)
  const m = parseHmsField(d.m, 59)
  const s = parseHmsField(d.s, 59)
  if (h === null || m === null || s === null) return null
  const total = joinHms(h, m, s)
  return total < TIMER_COUNTDOWN_SECS_MIN ? null : total
}

/** 알림음 음량(%) 자르기 — 비유한수는 기본값(44, CR-058), 반올림 뒤 0 ~ TIMER_ALARM_VOLUME_MAX(100) */
export const clampVolume = (v: number): number =>
  Number.isFinite(v)
    ? Math.min(TIMER_ALARM_VOLUME_MAX, Math.max(0, Math.round(v)))
    : (DEFAULT_TIMER_SETTINGS.alarmVolume ?? 44)

/** 바이트 → 올림 KB(상태 문구 표시용) */
export const soundSizeKb = (bytes: number): number => Math.ceil(bytes / 1024)
