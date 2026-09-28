/**
 * 켬/끔 스위치 — design/general-tab.md §2·§2.1. 라벨 글자 클릭은 토글되지 않는다(버튼만 조작 대상).
 * 화면 로컬(공용 승격 후보 — design.md §12). `src/components/ui`가 비어 있어 로컬로 구현(전략 편차 D-3).
 */
import styles from './ToggleSwitch.module.css'

export type ToggleSwitchProps = {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  busy?: boolean
  onToggle: () => void
}

export const ToggleSwitch = ({
  id,
  label,
  description,
  checked,
  disabled = false,
  busy = false,
  onToggle,
}: ToggleSwitchProps) => (
  <div className={styles.row}>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-desc`}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={onToggle}
      className={checked ? `${styles.track} ${styles.on}` : styles.track}
    >
      <span className={styles.knob} />
    </button>
    <div className={styles.text}>
      <span id={`${id}-label`} className={styles.label}>
        {label}
      </span>
      <p id={`${id}-desc`} className={styles.desc}>
        {description}
      </p>
    </div>
  </div>
)

export default ToggleSwitch
