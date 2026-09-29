/**
 * 「기본 설정」 탭 맨 아래 초기화 카드 — design/general-tab.md §7(CR-054, R-56 🔒 베타 전용).
 * 「전체 초기화」 → 확인창(ConfirmDialog 재사용) → resetAppData() 1회. 낙관적 갱신 없음 —
 * 화면 값은 기존 SettingsApp 의 settings://changed·assets://changed 구독으로만 바뀐다(§7.6).
 */
import { useEffect, useRef, useState } from 'react'
import { resetAppData, toBridgeError, type BridgeError } from 'bridge'
import { useMessages } from '../i18n/MessagesContext'
import ConfirmDialog from './ConfirmDialog'
import SettingsCard from './SettingsCard'
import styles from './GeneralTab.module.css'

export type ResetAllCardProps = {
  onError: (e: BridgeError | null) => void
}

type Phase = 'idle' | 'pending' | 'done'

export const ResetAllCard = ({ onError }: ResetAllCardProps) => {
  const t = useMessages()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const focusAfterRef = useRef(false)

  // §7.3 (효과) 포커스 복귀 — 비활성(pending) 버튼은 포커스를 받지 못하므로 활성으로 돌아온 뒤 옮긴다.
  useEffect(() => {
    if (phase === 'pending' || !focusAfterRef.current) return
    focusAfterRef.current = false
    buttonRef.current?.focus()
  }, [phase])

  const onOpenDialog = () => {
    if (phase === 'pending') return
    setDialogOpen(true)
  }

  const onCancel = () => {
    setDialogOpen(false)
    buttonRef.current?.focus()
  }

  const onConfirm = async () => {
    setDialogOpen(false)
    focusAfterRef.current = true
    setPhase('pending')
    try {
      await resetAppData()
      setPhase('done')
      onError(null)
    } catch (e) {
      setPhase('idle')
      onError(toBridgeError(e))
    }
  }

  const statusTextByPhase: Record<Phase, string> = {
    idle: '',
    pending: t.resetAllPending,
    done: t.resetAllDone,
  }
  const statusText = statusTextByPhase[phase]

  return (
    <SettingsCard
      title={t.cardReset}
      action={
        <button
          ref={buttonRef}
          type="button"
          className={styles.dangerButton}
          disabled={phase === 'pending'}
          aria-busy={phase === 'pending' || undefined}
          onClick={onOpenDialog}
        >
          {t.resetAll}
        </button>
      }
    >
      <p className={styles.fieldDesc}>{t.resetAllDesc}</p>
      <p role="status" aria-live="polite" className={styles.notice}>
        {statusText}
      </p>
      <ConfirmDialog
        open={dialogOpen}
        title={t.confirmResetAllTitle}
        message={t.confirmResetAllMessage}
        confirmLabel={t.confirmResetAllOk}
        cancelLabel={t.confirmCancel}
        onConfirm={() => void onConfirm()}
        onCancel={onCancel}
      />
    </SettingsCard>
  )
}

export default ResetAllCard
