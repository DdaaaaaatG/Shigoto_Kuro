/**
 * 알림음 카드 — design/timer-tab.md §14.4·§14.6·§14.7.3·§14.8·§14.9·§14.11(CR-050). 등록·미리 듣기·
 * 기본값·음량을 다룬다. 재생은 공용 components/utils/alarmSound 만 쓴다(화면에서 new Audio 직접 생성
 * 금지). 알림 재생(타이머 0 도달)은 오버레이만 — 이 카드는 미리 듣기뿐이다.
 */
import { useEffect, useRef, useState } from 'react'
import {
  getAlarmSound,
  importAlarmSound,
  pickAudioFile,
  removeAlarmSound,
  toBridgeError,
  TIMER_ALARM_VOLUME_MAX,
  type AlarmSound,
  type BridgeError,
} from 'bridge'
import { defaultAlarmUrl, playSound } from 'components/utils/alarmSound'
import { format } from '../i18n/index'
import { useMessages } from '../i18n/MessagesContext'
import { soundSizeKb } from '../timerValues'
import SettingsCard from './SettingsCard'
import { useSliderDraft } from './useSliderDraft'
import gStyles from './GeneralTab.module.css'
import styles from './TimerTab.module.css'

export type AlarmSoundCardProps = {
  volume: number
  onCommitVolume: (v: number) => Promise<void>
  onError: (e: BridgeError | null) => void
}

export const AlarmSoundCard = ({ volume, onCommitVolume, onError }: AlarmSoundCardProps) => {
  const t = useMessages()
  const [sound, setSound] = useState<AlarmSound | null>(null)
  const [soundPending, setSoundPending] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)

  const stopPreview = () => {
    stopRef.current?.()
    stopRef.current = null
  }

  const commitVolume = async (v: number) => {
    await onCommitVolume(v)
  }
  const volumeDraft = useSliderDraft(volume, commitVolume)

  // 마운트 조회 효과 — 언마운트 뒤 늦게 온 응답은 버린다(재시도 없음, 실패는 오류 줄로만)
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const result = await getAlarmSound()
        if (alive) setSound(result)
      } catch (e) {
        if (alive) onError(toBridgeError(e))
      }
    }
    void load()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 1회만(설계 §14.7.3), onError 는 prop
  }, [])

  // 언마운트 정지 효과 — 다른 메뉴로 옮기면(TimerTab 언마운트) 재생 중이던 소리를 멈춘다
  useEffect(() => () => stopPreview(), [])

  // 창 숨김 정지 효과 — 설정 창 X 는 숨기기뿐이라(CR-041) 언마운트되지 않는다. 숨겨지면 멈추고,
  // 다시 보일 때는 아무것도 하지 않는다(자동 재생 없음)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stopPreview()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const onImport = async () => {
    if (soundPending) return
    setSoundPending(true)
    try {
      const path = await pickAudioFile(t.alarmPickTitle)
      if (path === null) return
      const next = await importAlarmSound(path)
      stopPreview()
      setSound(next)
      setPreviewFailed(false)
      onError(null)
    } catch (e) {
      onError(toBridgeError(e))
    } finally {
      setSoundPending(false)
    }
  }

  const onPreview = () => {
    stopPreview()
    setPreviewFailed(false)
    const url = sound?.url ?? defaultAlarmUrl()
    // 음량은 초안값(놓기 전 값)을 0~1 배율로 — 저장된 TimerSettings 가 아니다(§14 머리 인용)
    stopRef.current = playSound(url, volumeDraft.shown / 100, () => setPreviewFailed(true))
  }

  const onReset = async () => {
    if (sound === null || soundPending) return
    setSoundPending(true)
    stopPreview()
    try {
      await removeAlarmSound()
      setSound(null)
      setPreviewFailed(false)
      onError(null)
    } catch (e) {
      onError(toBridgeError(e))
    } finally {
      setSoundPending(false)
    }
  }

  const statusText =
    sound === null
      ? t.alarmCurrentDefault
      : format(t.alarmCurrentCustom, { format: sound.format.toUpperCase(), size: soundSizeKb(sound.bytes) })

  return (
    <SettingsCard title={t.alarmCardTitle}>
      <p className={styles.desc}>{t.alarmCardDesc}</p>
      <p className={styles.soundStatus} aria-live="polite">
        {statusText}
      </p>
      <div className={styles.controls}>
        <button type="button" className={styles.btn} disabled={soundPending} onClick={() => void onImport()}>
          {t.alarmImport}
        </button>
        <button type="button" className={styles.btn} onClick={onPreview}>
          {t.alarmPreview}
        </button>
        <button
          type="button"
          className={styles.btn}
          disabled={sound === null || soundPending}
          onClick={() => void onReset()}
        >
          {t.alarmReset}
        </button>
      </div>
      <p className={styles.hint}>{t.alarmFileHint}</p>
      {previewFailed && (
        <p role="alert" className={`${styles.msg} ${styles.msgError}`}>
          {t.alarmPreviewFailed}
        </p>
      )}
      <div className={`${gStyles.field} ${styles.group}`}>
        <label htmlFor="alarm-volume">{t.alarmVolume}</label>
        <input
          id="alarm-volume"
          type="range"
          min={0}
          max={TIMER_ALARM_VOLUME_MAX}
          step={1}
          value={volumeDraft.shown}
          aria-valuetext={`${volumeDraft.shown}%`}
          onChange={volumeDraft.onChange}
          onPointerUp={volumeDraft.onPointerUp}
          onKeyUp={volumeDraft.onKeyUp}
          onBlur={volumeDraft.onBlur}
          className={gStyles.slider}
        />
        <output htmlFor="alarm-volume" className={styles.value}>{volumeDraft.shown}%</output>
      </div>
    </SettingsCard>
  )
}

export default AlarmSoundCard
