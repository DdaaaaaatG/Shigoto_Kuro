/**
 * 프리셋 카드 한 장 — design/presets-tab.md §2.2·§5.3·§11(CR-064·CR-065, R-59·R-61·R-62·R-64·R-66·R-67·R-68).
 * 순수 표시 컴포넌트: 합성 미리보기·이름·요약 줄·버튼 4개·인라인 이름 편집. bridge 는 부르지 않고 콜백만 올린다.
 * 편집 중에도 이름 h3 는 DOM 에 남겨(시각적으로만 숨김) li 의 접근 이름 참조가 끊기지 않게 한다.
 */
import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { PRESET_NAME_MAX, type PresetSummary } from 'bridge/types'
import { format } from '../i18n/index'
import { useLanguage, useMessages } from '../i18n/MessagesContext'
import { formatSavedAt, isPresetNameFilled } from '../presetValues'
import PresetPreviewBox from './PresetPreviewBox'
import gen from './GeneralTab.module.css'
import styles from './PresetsTab.module.css'

export type PresetCardFocusTarget = 'apply' | 'export' | 'rename' | 'delete' | 'renameInput'

export type PresetCardProps = {
  preset: PresetSummary
  pending: boolean
  renaming: boolean
  renameDraft: string
  focusTarget: PresetCardFocusTarget | null
  onFocused: () => void
  onApply: () => void
  onExport: () => void
  onStartRename: () => void
  onDelete: () => void
  onRenameDraft: (value: string) => void
  onRenameSave: () => void
  onRenameCancel: () => void
}

export const PresetCard = ({
  preset,
  pending,
  renaming,
  renameDraft,
  focusTarget,
  onFocused,
  onApply,
  onExport,
  onStartRename,
  onDelete,
  onRenameDraft,
  onRenameSave,
  onRenameCancel,
}: PresetCardProps) => {
  const t = useMessages()
  const language = useLanguage()
  const nameId = useId()
  const applyRef = useRef<HTMLButtonElement>(null)
  const exportRef = useRef<HTMLButtonElement>(null)
  const renameRef = useRef<HTMLButtonElement>(null)
  const deleteRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // §8.2 포커스 요청 — 비활성(pending) 버튼은 포커스를 받지 못하므로 pending 이 풀린 렌더에서 옮긴다
  useEffect(() => {
    if (!focusTarget || pending) return
    const targets = {
      apply: applyRef,
      export: exportRef,
      rename: renameRef,
      delete: deleteRef,
      renameInput: inputRef,
    }
    targets[focusTarget].current?.focus()
    onFocused()
  }, [focusTarget, pending, renaming, onFocused])

  const metaDate = format(t.presetSavedAt, { date: formatSavedAt(preset.savedAt, language) })
  const metaInfo = [
    format(t.presetImageCount, { count: preset.imageCount }),
    preset.hasAlarm ? t.presetHasAlarm : t.presetNoAlarm,
  ].join(' · ')
  const aria = (action: string) => format(t.presetActionAria, { action, name: preset.name })
  const canSaveRename = isPresetNameFilled(renameDraft) && !pending

  // 조합(IME) 중 Enter·Esc 는 조합 확정·취소 키이므로 아무것도 하지 않는다
  const onDraftKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') {
      e.preventDefault()
      if (canSaveRename) onRenameSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onRenameCancel()
    }
  }

  return (
    <li className={styles.item} aria-labelledby={nameId}>
      <PresetPreviewBox preview={preset.preview} />
      <h3 id={nameId} title={preset.name} className={renaming ? styles.visuallyHidden : styles.itemName}>
        {preset.name}
      </h3>
      {renaming && (
        <div className={`${styles.nameRow} ${styles.cardNameRow}`}>
          <input
            ref={inputRef}
            type="text"
            className={styles.nameInput}
            autoFocus
            value={renameDraft}
            maxLength={PRESET_NAME_MAX}
            readOnly={pending}
            aria-label={format(t.presetRenameInputAria, { name: preset.name })}
            onFocus={e => e.currentTarget.select()}
            onChange={e => onRenameDraft(e.target.value)}
            onKeyDown={onDraftKeyDown}
          />
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!canSaveRename}
            aria-label={aria(t.presetRenameSave)}
            onClick={() => onRenameSave()}
          >
            {t.presetRenameSave}
          </button>
          <button
            type="button"
            className={gen.outlineButton}
            disabled={pending}
            aria-label={aria(t.confirmCancel)}
            onClick={() => onRenameCancel()}
          >
            {t.confirmCancel}
          </button>
        </div>
      )}
      <p className={styles.itemMeta}>{metaDate}</p>
      <p className={styles.itemMeta}>{metaInfo}</p>
      <div className={styles.actionGrid}>
        <button
          ref={applyRef}
          type="button"
          className={gen.outlineButton}
          disabled={pending}
          title={t.presetApply}
          aria-label={aria(t.presetApply)}
          onClick={() => onApply()}
        >
          {t.presetApply}
        </button>
        <button
          ref={exportRef}
          type="button"
          className={gen.outlineButton}
          disabled={pending}
          title={t.presetExport}
          aria-label={aria(t.presetExport)}
          onClick={() => onExport()}
        >
          {t.presetExport}
        </button>
        <button
          ref={renameRef}
          type="button"
          className={gen.outlineButton}
          disabled={pending || renaming}
          title={t.presetRename}
          aria-label={aria(t.presetRename)}
          onClick={() => onStartRename()}
        >
          {t.presetRename}
        </button>
        <button
          ref={deleteRef}
          type="button"
          className={gen.dangerButton}
          disabled={pending}
          title={t.presetDelete}
          aria-label={aria(t.presetDelete)}
          onClick={() => onDelete()}
        >
          {t.presetDelete}
        </button>
      </div>
    </li>
  )
}

export default PresetCard
