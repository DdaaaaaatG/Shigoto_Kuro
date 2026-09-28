/**
 * 파괴 조작 확인 대화상자(공용 `ConfirmDialog` 승격 후보 — design.md §12, images-tab.md §2).
 * ui-design-strategy §11: 브라우저 `window.confirm` 대신 이 컴포넌트를 쓴다.
 */
import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import styles from './ConfirmDialog.module.css'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  /** (CR-033) 확인 버튼 색조. 기본 'danger'(파괴 조작 빨강) — 기존 호출은 그대로 danger */
  tone?: 'danger' | 'accent'
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const titleId = useId()
  const msgId = useId()
  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  if (!open) return null

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onCancel()
      return
    }
    if (e.key !== 'Tab') return
    e.preventDefault()
    const next = document.activeElement === cancelRef.current ? confirmRef.current : cancelRef.current
    next?.focus()
  }

  return (
    <div className={styles.backdrop}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={msgId}
        className={styles.dialog}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p id={msgId} className={styles.message}>
          {message}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={tone === 'accent' ? styles.accent : styles.danger}
            ref={confirmRef}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button type="button" className={styles.outline} ref={cancelRef} onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
