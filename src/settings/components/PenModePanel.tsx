/**
 * 「펜 손 사용」 토글 + 항상 보이는 안내 상자 — design/images-tab.md §9.1·§9.2(CR-033, R-29).
 * ToggleSwitch 를 재사용하고 안내 상자는 켜짐·꺼짐·비활성 어떤 상태든 항상 보인다.
 */
import { useMessages } from '../i18n/MessagesContext'
import ToggleSwitch from './ToggleSwitch'
import styles from './ImagesTab.module.css'

export type PenModePanelProps = {
  checked: boolean
  disabled: boolean
  busy: boolean
  onToggle: () => void
}

export const PenModePanel = ({ checked, disabled, busy, onToggle }: PenModePanelProps) => {
  const t = useMessages()
  return (
    <div className={styles.penPanel}>
      <ToggleSwitch
        id="pen-mode-toggle"
        label={t.penModeLabel}
        description={t.penModeDesc}
        checked={checked}
        disabled={disabled}
        busy={busy}
        onToggle={onToggle}
      />
      <div className={styles.penNote} id="pen-mode-note">
        <p>{t.penModeNoteOn}</p>
        <p>{t.penModeNoteOff}</p>
      </div>
    </div>
  )
}

export default PenModePanel
