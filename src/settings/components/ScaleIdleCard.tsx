/**
 * 「크기 · 반응」 카드 — 배율(R-03)·유휴 시간(R-04). design/general-tab.md §3.4~§3.6.
 * 배율 키보드 저장은 300ms 지연 후 1회 — 지연 콜백은 ref(commitScaleRef)로 항상 최신 draft·settings 를 읽는다.
 */
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { setSettings, toBridgeError, type BridgeError, type Settings } from 'bridge'
import { format } from '../i18n/index'
import { useMessages } from '../i18n/MessagesContext'
import {
  IDLE_MAX_MINUTES,
  IDLE_MIN_MINUTES,
  SCALE_KEY_COMMIT_MS,
  SCALE_STEP_PERCENT,
  idleSecondsToMinutes,
  parseIdleMinutes,
  percentBounds,
  scaleToPercent,
} from '../generalValues'
import SettingsCard from './SettingsCard'
import styles from './GeneralTab.module.css'

const SCALE_NAV_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
])

export type ScaleIdleCardProps = {
  settings: Settings
  onError: (e: BridgeError | null) => void
}

export const ScaleIdleCard = ({ settings, onError }: ScaleIdleCardProps) => {
  const t = useMessages()
  const [scaleDraft, setScaleDraft] = useState<number | null>(null)
  const [idleDraft, setIdleDraft] = useState<string | null>(null)
  const [idleInvalid, setIdleInvalid] = useState(false)
  const scaleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { min, max } = percentBounds()
  const percent = scaleToPercent(settings.scale)
  const shownPercent = scaleDraft ?? percent
  const shownIdle = idleDraft ?? String(idleSecondsToMinutes(settings.idleSeconds))

  const commitScale = async () => {
    if (scaleTimer.current) {
      clearTimeout(scaleTimer.current)
      scaleTimer.current = null
    }
    if (scaleDraft === null) return
    if (scaleDraft === percent) {
      setScaleDraft(null)
      return
    }
    try {
      await setSettings({ ...settings, scale: scaleDraft / 100 })
      onError(null)
    } catch (e) {
      onError(toBridgeError(e))
    } finally {
      setScaleDraft(null)
    }
  }

  // 300ms 예약 저장이 옛 클로저를 부르지 않도록 항상 최신 commitScale 을 가리키는 ref
  const commitScaleRef = useRef(commitScale)
  commitScaleRef.current = commitScale

  useEffect(
    () => () => {
      if (scaleTimer.current) clearTimeout(scaleTimer.current)
    },
    [],
  )

  const onScaleInput = (e: ChangeEvent<HTMLInputElement>) => setScaleDraft(Number(e.currentTarget.value))
  const onScalePointerUp = () => void commitScale()
  const onScaleKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!SCALE_NAV_KEYS.has(e.key)) return
    if (scaleTimer.current) clearTimeout(scaleTimer.current)
    scaleTimer.current = setTimeout(() => {
      void commitScaleRef.current()
    }, SCALE_KEY_COMMIT_MS)
  }
  const onScaleBlur = () => {
    if (scaleDraft !== null) void commitScale()
  }

  const commitIdle = async () => {
    if (idleDraft === null) return
    const n = parseIdleMinutes(idleDraft)
    setIdleDraft(null)
    if (n === null) {
      setIdleInvalid(true)
      return
    }
    if (n * 60 === settings.idleSeconds) return
    try {
      await setSettings({ ...settings, idleSeconds: n * 60 })
      onError(null)
    } catch (e) {
      onError(toBridgeError(e))
    }
  }

  const onIdleInput = (e: ChangeEvent<HTMLInputElement>) => {
    setIdleDraft(e.currentTarget.value)
    setIdleInvalid(false)
  }
  const onIdleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void commitIdle()
  }
  const onIdleBlur = () => void commitIdle()

  return (
    <SettingsCard title={t.cardScale}>
      <div className={styles.field}>
        <label htmlFor="scale-slider">{t.scaleLabel}</label>
        <input
          id="scale-slider"
          type="range"
          min={min}
          max={max}
          step={SCALE_STEP_PERCENT}
          value={shownPercent}
          aria-describedby="scale-desc"
          aria-valuetext={`${shownPercent}%`}
          onChange={onScaleInput}
          onPointerUp={onScalePointerUp}
          onKeyUp={onScaleKeyUp}
          onBlur={onScaleBlur}
          className={styles.slider}
        />
        <output htmlFor="scale-slider">{shownPercent}%</output>
        <p id="scale-desc" className={styles.fieldDesc}>
          {format(t.scaleDesc, { min, max })}
        </p>
      </div>
      <div className={styles.field}>
        <label htmlFor="idle-input">{t.idleLabel}</label>
        <input
          id="idle-input"
          type="number"
          inputMode="numeric"
          min={IDLE_MIN_MINUTES}
          max={IDLE_MAX_MINUTES}
          step={1}
          value={shownIdle}
          aria-describedby="idle-desc"
          aria-invalid={idleInvalid || undefined}
          onChange={onIdleInput}
          onKeyDown={onIdleKeyDown}
          onBlur={onIdleBlur}
          className={styles.numberInput}
        />
        <span>{t.idleUnit}</span>
        <p id="idle-desc" className={styles.fieldDesc}>
          {format(t.idleDesc, { min: IDLE_MIN_MINUTES, max: IDLE_MAX_MINUTES })}
        </p>
        {idleInvalid && (
          <p className={styles.hint} role="alert">
            {format(t.idleRangeHint, { min: IDLE_MIN_MINUTES, max: IDLE_MAX_MINUTES })}
          </p>
        )}
      </div>
    </SettingsCard>
  )
}

export default ScaleIdleCard
