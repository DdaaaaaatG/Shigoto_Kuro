/**
 * 이미지 슬롯 카드 — design/images-tab.md §2·§6·§11(CR-038 R-35). 미리보기·필수 배지·이미지 변경·
 * 기본값(복원/비우기)·(뒷머리 전용) 비우기. 배지·버튼 고정 문구는 자체 `useMessages()`로 읽는다(design.md §3).
 */
import { memo, useId, useRef } from 'react'
import { format } from '../i18n/index'
import { useMessages } from '../i18n/MessagesContext'
import type { ResetKind } from '../imageSlots'
import styles from './ImageSlotCard.module.css'

export type ImageSlotCardProps = {
  cardKey: string
  title: string
  description: string
  required: boolean
  url: string | undefined
  disabled: boolean
  /** (CR-035, 옛 canClear) 「기본값」 단추 활성 — resetKind 로 의미가 갈린다(복원/비우기) */
  canReset: boolean
  /** (CR-035 신규) aria-label 선택용 — 'restore' 는 항상 clearBlockedHint 가 undefined 다 */
  resetKind: ResetKind
  clearBlockedHint: string | undefined
  error: string | undefined
  onChange: () => void
  onReset: (trigger: HTMLButtonElement) => void
  /** (CR-038, R-35) 뒷머리 카드 전용 — 등록돼 있을 때만 「비우기」 활성. 기본 false */
  canEmpty?: boolean
  /** (CR-038, R-35) 있을 때만 셋째 버튼 「비우기」를 그린다(= 뒷머리 카드) */
  onEmpty?: (trigger: HTMLButtonElement, changeButton: HTMLButtonElement | null) => void
}

const ImageSlotCardComponent = ({
  cardKey,
  title,
  description,
  required,
  url,
  disabled,
  canReset,
  resetKind,
  clearBlockedHint,
  error,
  onChange,
  onReset,
  canEmpty = false,
  onEmpty,
}: ImageSlotCardProps) => {
  const t = useMessages()
  const titleId = useId()
  const changeRef = useRef<HTMLButtonElement | null>(null)
  const emptyable = onEmpty !== undefined

  return (
    <article
      className={emptyable ? `${styles.card} ${styles.cardEmptyable}` : styles.card}
      aria-labelledby={titleId}
      data-testid={`slot-card-${cardKey}`}
    >
      <div className={styles.head}>
        <h3 id={titleId} className={styles.title} title={title}>
          {title}
        </h3>
        <span className={required ? styles.badgeRequired : styles.badgeOptional}>
          {required ? t.badgeRequired : t.badgeOptional}
        </span>
      </div>
      <p className={styles.desc} title={description}>
        {description}
      </p>
      <div className={styles.preview}>
        {url ? (
          <img src={url} alt="" draggable={false} className={styles.previewImg} />
        ) : (
          <p className={required ? styles.emptyRequired : styles.empty}>
            {required ? t.emptyRequired : t.emptyOptional}
          </p>
        )}
        {error && (
          <p role="alert" className={styles.cardError} title={error}>
            {error}
          </p>
        )}
      </div>
      <div className={emptyable ? styles.actions2 : styles.actions}>
        <button
          type="button"
          ref={changeRef}
          className={styles.primary}
          aria-label={format(t.changeImageAria, { name: title })}
          disabled={disabled}
          onClick={onChange}
        >
          {t.changeImage}
        </button>
        <button
          type="button"
          className={styles.outline}
          aria-label={format(resetKind === 'restore' ? t.restoreImageAria : t.clearImageAria, { name: title })}
          disabled={disabled || !canReset}
          title={clearBlockedHint}
          onClick={e => onReset(e.currentTarget)}
        >
          {t.clearImage}
        </button>
        {onEmpty && (
          <button
            type="button"
            className={styles.outline}
            aria-label={format(t.emptyImageAria, { name: title })}
            disabled={disabled || !canEmpty}
            onClick={e => onEmpty(e.currentTarget, changeRef.current)}
          >
            {t.emptyImage}
          </button>
        )}
      </div>
    </article>
  )
}

export const ImageSlotCard = memo(ImageSlotCardComponent)

export default ImageSlotCard
