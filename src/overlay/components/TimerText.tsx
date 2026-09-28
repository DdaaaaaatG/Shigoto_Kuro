/**
 * 시간 글자 (CR-045 R-34·R-36, CR-050 R-37~R-39) — 뽀모도 레이어 안에서만 조건부로 마운트된다
 * (PomodoroLayer.isTimerTextVisible). 장식 표시라 aria-hidden, 새 문구 없음. 설정 창 미리보기는 끌기
 * 때문에 별도 컴포넌트를 둔다(공용 승격 대상 아님). (CR-050) finished 동안 .blink(끝남 깜빡임, JS 타이머
 * 없음)·useAlarmOnFinish(알림음, ref만 — 리렌더 없음)를 여기서 부른다. 구독·조회는 useTimerSnapshot 1개
 * 그대로 유지한다(OverlayApp에 두지 않는다).
 */
import type { TimerSettings } from 'bridge'
import { useElapsedText } from 'components/hooks/useElapsedText'
import { useTimerSnapshot } from 'components/hooks/useTimerSnapshot'
import { alarmGain } from 'components/utils/alarmSound'
import { isTimerBlinking, timerTextStyle } from 'components/utils/timerClock'
import { useAlarmOnFinish } from '../hooks/useAlarmOnFinish'
import styles from './TimerText.module.css'

export type TimerTextProps = {
  timer: TimerSettings
}

const TimerText = ({ timer }: TimerTextProps) => {
  const state = useTimerSnapshot()
  const text = useElapsedText(state.snapshot, state.receivedAt)
  useAlarmOnFinish(state, alarmGain(timer))

  return (
    <div
      className={isTimerBlinking(state.snapshot) ? styles.blink : undefined}
      style={timerTextStyle(timer)}
      aria-hidden="true"
    >
      {text}
    </div>
  )
}

export default TimerText
