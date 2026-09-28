/**
 * 「타이머」 탭 — design/timer-tab.md §1.2·§2·§4·§5.1·§6·§7·§9(CR-045) + §14(CR-050, 대체 목록 §14.1).
 * 카드 1(스톱워치/타이머 두 토글·시작 시간·시작·일시정지·멈춤) + 카드 2(알림음 등록·미리 듣기·기본값·
 * 음량) + 카드 3(시간 글자 미리보기·회전·크기·색). 흐르는 시간·끝남 깜빡임은 이 컴포넌트가 계산하지
 * 않는다(useTimerSnapshot·useElapsedText·isTimerBlinking — TimerPreview·CountdownTimeInput·
 * AlarmSoundCard 몫). 구독(useTimerSnapshot)은 이 컴포넌트가 1회 갖고 자식에 snapshot·receivedAt으로
 * 내려준다(CR-050 — 구독 1개 유지, TC-247). 탭 본문은 다른 탭과 같은 접근성 landmark
 * (<section aria-label> = region)로 감싼다(메인 세션 결정 X-1). 색 초안(colorDraft)은 저장 성공·실패가
 * 끝날 때까지 유지한다(슬라이더 초안과 같은 규칙, 메인 세션 결정 X-2 — design/timer-tab.md §5.1
 * `commitColor`의 즉시 `setColorDraft(null)` 서술을 대체).
 * CR-052: 카드 1 머리 설명문 삭제(스톱워치 토글 설명 한 곳으로), 타이머 모드가 아니면 시작 시간 입력을
 * 회색 비활성(inactive), 카드 안을 모드 토글 / 시작 시간·조작 두 묶음으로 나눠 정돈.
 */
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  controlTimer,
  setSettings,
  toBridgeError,
  TIMER_FONT_SIZE_MAX,
  TIMER_FONT_SIZE_MIN,
  TIMER_ROTATION_MAX,
  TIMER_ROTATION_MIN,
  type AssetManifest,
  type BridgeError,
  type Point,
  type Settings,
  type TimerAction,
  type TimerMode,
  type TimerSettings,
} from 'bridge'
import { useTimerSnapshot } from 'components/hooks/useTimerSnapshot'
import { useMessages } from '../i18n/MessagesContext'
import {
  clampFontSize,
  clampRotation,
  clampVolume,
  fullTimer,
  isDurationLocked,
  normalizeColor,
  timerToggles,
  togglePatch,
} from '../timerValues'
import AlarmSoundCard from './AlarmSoundCard'
import CountdownTimeInput from './CountdownTimeInput'
import SettingsCard from './SettingsCard'
import TimerPreview from './TimerPreview'
import ToggleSwitch from './ToggleSwitch'
import { useSliderDraft } from './useSliderDraft'
import gStyles from './GeneralTab.module.css'
import styles from './TimerTab.module.css'

export type TimerTabProps = {
  settings: Settings
  manifest: AssetManifest
  onError: (e: BridgeError | null) => void
}

const CONTROL_ACTIONS: readonly { action: TimerAction; labelKey: 'timerStart' | 'timerPause' | 'timerStop' }[] = [
  { action: 'start', labelKey: 'timerStart' },
  { action: 'pause', labelKey: 'timerPause' },
  { action: 'stop', labelKey: 'timerStop' },
]

export const TimerTab = ({ settings, manifest, onError }: TimerTabProps) => {
  const t = useMessages()
  const timer = fullTimer(settings.timer)
  const { stopwatchOn, countdownOn } = timerToggles(timer)
  const { snapshot, receivedAt } = useTimerSnapshot()
  const durationLocked = isDurationLocked(timer, snapshot.status)
  const [enabledPending, setEnabledPending] = useState(false)
  const [controlPending, setControlPending] = useState(false)
  const [colorDraft, setColorDraft] = useState<string | null>(null)
  const colorRef = useRef<HTMLInputElement | null>(null)

  const saveTimer = async (patch: Partial<TimerSettings>): Promise<boolean> => {
    try {
      await setSettings({ ...settings, timer: { ...timer, ...patch } })
      onError(null)
      return true
    } catch (e) {
      onError(toBridgeError(e))
      return false
    }
  }

  const commitRotation = async (v: number) => {
    await saveTimer({ rotation: clampRotation(v) })
  }
  const commitSize = async (v: number) => {
    await saveTimer({ fontSize: clampFontSize(v) })
  }
  const commitVolume = async (v: number) => {
    await saveTimer({ alarmVolume: clampVolume(v) })
  }
  const commitCountdownSecs = (secsValue: number) => saveTimer({ countdownSecs: secsValue })
  const rotation = useSliderDraft(timer.rotation, commitRotation)
  const size = useSliderDraft(timer.fontSize, commitSize)

  const onToggleMode = async (mode: TimerMode) => {
    if (enabledPending) return
    const on = !(mode === 'stopwatch' ? stopwatchOn : countdownOn)
    setEnabledPending(true)
    await saveTimer(togglePatch(mode, on))
    setEnabledPending(false)
  }

  const onControl = async (action: TimerAction) => {
    if (!timer.enabled || controlPending) return
    setControlPending(true)
    try {
      await controlTimer(action)
      onError(null)
    } catch (e) {
      onError(toBridgeError(e))
    } finally {
      setControlPending(false)
    }
  }

  const onColorInput = (e: ChangeEvent<HTMLInputElement>) => setColorDraft(e.currentTarget.value)

  // 대화상자가 열려 있는 동안(input)은 미리보기만 바뀐다. 닫힐 때(change, colorRef 구독)만 저장을
  // 시도하고, 저장 응답이 끝날 때까지 초안을 유지한다(X-2 — 슬라이더 flush 와 같은 규칙).
  const commitColor = async (value: string) => {
    const normalized = normalizeColor(value)
    if (normalized === null || normalized === timer.color) {
      setColorDraft(null)
      return
    }
    await saveTimer({ color: normalized })
    setColorDraft(null)
  }

  // 네이티브 change 리스너가 옛 클로저(예약 당시의 timer.color)를 부르지 않도록 렌더마다 갱신하는 ref
  const commitColorRef = useRef(commitColor)
  commitColorRef.current = commitColor

  useEffect(() => {
    const el = colorRef.current
    if (!el) return undefined
    // React 의 onChange 는 색 입력에서 'input' 이벤트(고르는 동안)에 반응한다 — 대화상자가 닫히는
    // 'change' 이벤트는 별도로 구독해야 한다(design/timer-tab.md §5.1 「색 change 구독」).
    const onNativeChange = (e: Event) => void commitColorRef.current((e.target as HTMLInputElement).value)
    el.addEventListener('change', onNativeChange)
    return () => el.removeEventListener('change', onNativeChange)
  }, [])

  const onCommitPos = async (pos: Point): Promise<void> => {
    await saveTimer({ textPos: pos })
  }

  const previewTimer: TimerSettings = {
    ...timer,
    rotation: rotation.shown,
    fontSize: size.shown,
    color: colorDraft ?? timer.color,
  }

  const controlsDisabled = !timer.enabled || enabledPending || controlPending

  return (
    <section aria-label={t.tabTimer} className={styles.tab}>
      <SettingsCard title={t.timerCardTitle}>
        <ToggleSwitch
          id="timer-stopwatch"
          label={t.timerStopwatchEnabled}
          description={t.timerStopwatchDesc}
          checked={stopwatchOn}
          busy={enabledPending}
          onToggle={() => void onToggleMode('stopwatch')}
        />
        <ToggleSwitch
          id="timer-countdown"
          label={t.timerCountdownEnabled}
          description={t.timerCountdownDesc}
          checked={countdownOn}
          busy={enabledPending}
          onToggle={() => void onToggleMode('countdown')}
        />
        <div className={styles.group}>
          <CountdownTimeInput
            secs={timer.countdownSecs}
            locked={durationLocked}
            inactive={!countdownOn}
            onCommit={commitCountdownSecs}
          />
          <div role="group" aria-label={t.timerControlsAria} className={styles.controls}>
            {CONTROL_ACTIONS.map(({ action, labelKey }) => (
              <button
                key={action}
                type="button"
                className={action === 'start' ? `${styles.btn} ${styles.primary}` : styles.btn}
                disabled={controlsDisabled}
                onClick={() => void onControl(action)}
              >
                {t[labelKey]}
              </button>
            ))}
          </div>
          <p className={styles.hint}>{t.timerStopHint}</p>
        </div>
      </SettingsCard>

      <AlarmSoundCard volume={timer.alarmVolume} onCommitVolume={commitVolume} onError={onError} />

      <SettingsCard title={t.timerTextTitle}>
        <p className={styles.desc}>{t.timerTextDesc}</p>
        <TimerPreview
          manifest={manifest}
          timer={previewTimer}
          snapshot={snapshot}
          receivedAt={receivedAt}
          onCommitPos={onCommitPos}
        />
        <div className={gStyles.field}>
          <label htmlFor="timer-rotation">{t.timerRotation}</label>
          <input
            id="timer-rotation"
            type="range"
            min={TIMER_ROTATION_MIN}
            max={TIMER_ROTATION_MAX}
            step={1}
            value={rotation.shown}
            aria-valuetext={`${rotation.shown}°`}
            onChange={rotation.onChange}
            onPointerUp={rotation.onPointerUp}
            onKeyUp={rotation.onKeyUp}
            onBlur={rotation.onBlur}
            className={gStyles.slider}
          />
          <output htmlFor="timer-rotation" className={styles.value}>{rotation.shown}°</output>
        </div>
        <div className={gStyles.field}>
          <label htmlFor="timer-size">{t.timerSize}</label>
          <input
            id="timer-size"
            type="range"
            min={TIMER_FONT_SIZE_MIN}
            max={TIMER_FONT_SIZE_MAX}
            step={1}
            value={size.shown}
            aria-valuetext={`${size.shown}px`}
            onChange={size.onChange}
            onPointerUp={size.onPointerUp}
            onKeyUp={size.onKeyUp}
            onBlur={size.onBlur}
            className={gStyles.slider}
          />
          <output htmlFor="timer-size" className={styles.value}>{size.shown}px</output>
        </div>
        <div className={gStyles.field}>
          <label htmlFor="timer-color">{t.timerColor}</label>
          <input
            id="timer-color"
            ref={colorRef}
            type="color"
            value={colorDraft ?? timer.color}
            onChange={onColorInput}
            className={styles.colorInput}
          />
          <output htmlFor="timer-color" className={styles.value}>{colorDraft ?? timer.color}</output>
        </div>
      </SettingsCard>
    </section>
  )
}

export default TimerTab
