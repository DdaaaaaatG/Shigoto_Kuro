/**
 * 여러 장 슬롯의 「추가」 카드(점선 테두리) — design/images-tab.md §2·§6.
 */
import styles from './ImageSlotCard.module.css'

export type AddSlotCardProps = {
  cardKey: string
  label: string
  disabled: boolean
  error: string | undefined
  onAdd: () => void
}

export const AddSlotCard = ({ cardKey, label, disabled, error, onAdd }: AddSlotCardProps) => (
  <div className={`${styles.card} ${styles.addCard}`} data-testid={`add-card-${cardKey}`}>
    <button type="button" className={styles.outline} disabled={disabled} onClick={onAdd}>
      {label}
    </button>
    {error && (
      <p role="alert" className={styles.addError} title={error}>
        {error}
      </p>
    )}
  </div>
)

export default AddSlotCard
