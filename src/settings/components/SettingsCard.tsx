/**
 * 카드형 섹션 — design/general-tab.md §2·§2.2. 머리 줄(제목 + 선택 action) + 본문.
 * 화면 로컬(공용 승격 후보 — design.md §12).
 */
import { useId, type ReactNode } from 'react'
import styles from './SettingsCard.module.css'

export type SettingsCardProps = {
  title: string
  action?: ReactNode
  children: ReactNode
}

export const SettingsCard = ({ title, action, children }: SettingsCardProps) => {
  const headingId = useId()
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardHead}>
        <h2 id={headingId} className={styles.cardTitle}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default SettingsCard
