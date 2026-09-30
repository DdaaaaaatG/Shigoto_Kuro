/**
 * 프리셋 저장·가져오기 카드 — design/presets-tab.md §2.1·§5.2(CR-064, R-58·R-60·R-63·R-65·R-66).
 * 이름 입력(로컬 상태)·저장 버튼 활성과 이유 줄·가져오기 버튼·문제 목록·상태 줄(탭 안 안내 위치는 여기 한 곳).
 * bridge 는 부르지 않는다 — 저장·가져오기는 부모(PresetsTab)가 콜백으로 처리한다.
 */
import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { PRESET_NAME_MAX, type AssetManifest, type PresetProblem } from 'bridge/types'
import { errorText } from '../i18n/index'
import { useLanguage, useMessages } from '../i18n/MessagesContext'
import { canSavePreset, missingRequiredSlots } from '../presetValues'
import gen from './GeneralTab.module.css'
import SettingsCard from './SettingsCard'
import styles from './PresetsTab.module.css'

export type PresetSaveFocusTarget = 'name' | 'save' | 'import'

export type PresetSaveCardProps = {
  manifest: AssetManifest
  pending: boolean
  status: string
  problems: readonly PresetProblem[]
  focusTarget: PresetSaveFocusTarget | null
  onFocused: () => void
  onSave: (name: string) => Promise<boolean>
  onImport: () => Promise<void>
}

export const PresetSaveCard = ({
  manifest,
  pending,
  status,
  problems,
  focusTarget,
  onFocused,
  onSave,
  onImport,
}: PresetSaveCardProps) => {
  const t = useMessages()
  const language = useLanguage()
  const [name, setName] = useState('')
  const nameId = useId()
  const needsId = useId()
  const problemsId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const saveRef = useRef<HTMLButtonElement>(null)
  const importRef = useRef<HTMLButtonElement>(null)

  const missing = missingRequiredSlots(manifest)
  const saveEnabled = canSavePreset(name, manifest) && !pending

  // §8.2 포커스 요청 — 비활성 버튼은 포커스를 받지 못하므로 pending 이 풀린 렌더에서 옮긴다
  useEffect(() => {
    if (!focusTarget || pending) return
    const targets = { name: nameRef, save: saveRef, import: importRef }
    targets[focusTarget].current?.focus()
    onFocused()
  }, [focusTarget, pending, onFocused])

  const onNameChange = (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)

  const submit = async () => {
    if (!saveEnabled) return
    if (await onSave(name)) setName('')
  }

  // 조합(IME) 중 Enter 는 조합 확정 키이므로 저장하지 않는다
  const onNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    e.preventDefault()
    void submit()
  }

  return (
    <SettingsCard title={t.cardPresetSave}>
      <p className={gen.fieldDesc}>{t.presetSaveDesc}</p>
      <div className={styles.nameRow}>
        <label htmlFor={nameId}>{t.presetNameLabel}</label>
        <input
          ref={nameRef}
          id={nameId}
          type="text"
          className={styles.nameInput}
          value={name}
          maxLength={PRESET_NAME_MAX}
          placeholder={t.presetNamePlaceholder}
          readOnly={pending}
          onChange={onNameChange}
          onKeyDown={onNameKeyDown}
        />
        <button
          ref={saveRef}
          type="button"
          className={styles.primaryButton}
          disabled={!saveEnabled}
          aria-describedby={missing.length > 0 ? needsId : undefined}
          onClick={() => void submit()}
        >
          {t.presetSave}
        </button>
      </div>
      {missing.length > 0 && (
        <p id={needsId} className={gen.hint}>
          {t.presetSaveNeedsRequired}
        </p>
      )}
      <hr className={styles.divider} />
      <button ref={importRef} type="button" className={gen.outlineButton} disabled={pending} onClick={() => void onImport()}>
        {t.presetImport}
      </button>
      <p className={gen.fieldDesc}>{t.presetImportDesc}</p>
      {problems.length > 0 && (
        <div role="alert" className={styles.problems}>
          <p id={problemsId}>{t.presetImportFailed}</p>
          <ul aria-labelledby={problemsId}>
            {problems.map((p, i) => (
              <li key={`${p.fileName}-${i}`}>
                {p.fileName} — {errorText(t, language, { code: p.code, message: '' })}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p role="status" aria-live="polite" className={gen.notice}>
        {status}
      </p>
    </SettingsCard>
  )
}

export default PresetSaveCard
