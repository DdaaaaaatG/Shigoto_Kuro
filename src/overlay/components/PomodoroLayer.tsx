/**
 * 뽀모도 레이어 (CR-045, R-33·R-34) — `.canvas`의 BackgroundLayer 다음·`.jellyWrap` 앞에 그린다. 배경처럼
 * 고정(젤리·부르르 밖, 애니메이션 없음). 순서(아래→위) = 인물(pomo_char) → 말풍선(pomo_bubble) → 시간 글자.
 * 글자 표시 조건(U-1) = timer.enabled 또는 뽀모도 그림이 1장 이상 등록. 셋 다 없으면 null(DOM 없음).
 */
import { memo } from 'react'
import type { AssetManifest, TimerSettings } from 'bridge'
import { findEntry } from './LayerStack'
import TimerText from './TimerText'
import styles from '../overlay.module.css'

export type PomodoroLayerProps = {
  manifest: AssetManifest
  timer: TimerSettings
}

/** 글자 표시 조건(U-1, design.md §10.14 14.2) — 타이머 on 또는 뽀모도 그림 중 1장 이상 등록 */
export const isTimerTextVisible = (timer: TimerSettings, manifest: AssetManifest): boolean =>
  timer.enabled ||
  findEntry(manifest, 'pomo_char') !== undefined ||
  findEntry(manifest, 'pomo_bubble') !== undefined

const PomodoroLayer = ({ manifest, timer }: PomodoroLayerProps) => {
  const char = findEntry(manifest, 'pomo_char')
  const bubble = findEntry(manifest, 'pomo_bubble')
  const showText = isTimerTextVisible(timer, manifest)

  if (!char && !bubble && !showText) return null

  return (
    <div className={styles.pomodoro}>
      {char && <img className={styles.layer} src={char.url} alt="" draggable={false} />}
      {bubble && <img className={styles.layer} src={bubble.url} alt="" draggable={false} />}
      {showText && <TimerText timer={timer} />}
    </div>
  )
}

export default memo(PomodoroLayer)
