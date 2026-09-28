/**
 * 알림음 공용 유틸(design.md §10.15 15.2·15.3·15.4, design/functions.md §5.7 ④, contract v0.23 §3.10) —
 * 오버레이 TimerText(useAlarmOnFinish)·설정 창 미리 듣기가 공용으로 쓴다. bridge는 타입만 가져오고
 * 런타임 호출은 하지 않는다(등록 파일 조회는 호출자가 getAlarmSound로 한다).
 * (CR-058, 0.4.0 기본 세트) 내장 기본음은 합성 비프음 대신 번들된 mp3 자산(`src/assets/sounds/default-alarm.mp3`)을
 * 쓴다 — 옛 `synthBeepWav`·`BEEP_*`·Blob URL 캐시는 폐기(아무 데서도 더 참조하지 않아 제거). design.md §10.15
 * 15.3·15.4·design/functions.md §5.7 ④는 아직 옛 합성음 서술로 남아 있음(ui-designer 동기화 대기).
 */
import type { TimerSettings } from 'bridge'
import defaultAlarmAsset from '@/assets/sounds/default-alarm.mp3'

// ─── 상수(설정값 아님) ──────────────────────────────────────────────────────
/** (CR-058, 0.4.0 기본 세트) 알림음 음량 기본값 % — 옛 80 */
export const DEFAULT_ALARM_VOLUME = 44

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/** 내장 기본음 URL — 번들된 정적 mp3 자산(CR-058). 항상 같은 문자열을 돌려준다(부작용 없음) */
export const defaultAlarmUrl = (): string => defaultAlarmAsset

/** 알림음 음량(0~1) — alarmVolume 없음·비유한수는 DEFAULT_ALARM_VOLUME, 0~100으로 자른다 */
export const alarmGain = (t: TimerSettings): number => {
  const raw = typeof t.alarmVolume === 'number' && Number.isFinite(t.alarmVolume) ? t.alarmVolume : DEFAULT_ALARM_VOLUME
  return Math.min(100, Math.max(0, raw)) / 100
}

/**
 * url을 재생하고 정지 함수를 돌려준다. loop 기본 false(1회 — 설정 창 미리 듣기), true면 stop()까지 반복
 * (현재 호출처 없음 — CR-052 반복 재생은 CR-055로 폐기, 오버레이 끝남 알림도 1회). new Audio부터 play()까지 전부 try 안이라 던지지
 * 않는다. onFail은 최대 1회·항상 비동기(queueMicrotask)로 알리고, stop() 뒤에는 부르지 않는다(이미
 * 예약된 microtask도 stopped 확인으로 버린다) — 호출자의 `stopRef.current = playSound(...)` 대입이
 * onFail보다 항상 먼저 끝난다.
 */
export const playSound = (url: string, volume: number, onFail?: () => void, loop = false): (() => void) => {
  let audio: HTMLAudioElement | null = null
  let stopped = false
  let settled = false

  const fail = () => {
    if (settled) return
    settled = true
    queueMicrotask(() => {
      if (stopped) return
      onFail?.()
    })
  }

  try {
    audio = new Audio(url)
    audio.volume = Number.isFinite(volume) ? clamp01(volume) : 0
    audio.loop = loop
    audio.addEventListener('error', fail, { once: true })
    const playing = audio.play()
    if (playing && typeof playing.catch === 'function') playing.catch(fail)
  } catch {
    fail()
  }

  return () => {
    stopped = true
    settled = true
    audio?.removeEventListener('error', fail)
    try {
      audio?.pause()
      if (audio) audio.currentTime = 0
    } catch {
      // 무시 — 일부 환경에서 pause·currentTime 대입이 예외를 던질 수 있다
    }
  }
}
