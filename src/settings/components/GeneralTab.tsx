/**
 * 「기본 설정」 탭 — design/general-tab.md §3.1·§3.2·§4. 언어(R-20)·위치 잠금(R-21)·
 * 작업표시줄 표시(R-22)·자동 실행(R-23)·위치 초기화(R-24)는 항목별 즉시 저장.
 */
import { useState, type ChangeEvent } from 'react'
import {
  resetOverlayPosition,
  setAutostart,
  setSettings,
  toBridgeError,
  type BridgeError,
  type Language,
  type Settings,
} from 'bridge'
import { LANGUAGES, LANGUAGE_NAMES } from '../i18n/index'
import { useMessages } from '../i18n/MessagesContext'
import ResetAllCard from './ResetAllCard'
import ScaleIdleCard from './ScaleIdleCard'
import SettingsCard from './SettingsCard'
import ToggleSwitch from './ToggleSwitch'
import styles from './GeneralTab.module.css'

export type GeneralTabProps = {
  settings: Settings
  onError: (e: BridgeError | null) => void
}

const isLanguage = (v: string): v is Language => (LANGUAGES as readonly string[]).includes(v)

export const GeneralTab = ({ settings, onError }: GeneralTabProps) => {
  const t = useMessages()
  const [autostartPending, setAutostartPending] = useState(false)
  const [resetPending, setResetPending] = useState(false)

  const saveSettings = async (
    patch: Partial<Pick<Settings, 'language' | 'positionLock' | 'showInTaskbar'>>,
  ) => {
    try {
      await setSettings({ ...settings, ...patch })
      onError(null)
    } catch (e) {
      onError(toBridgeError(e))
    }
  }

  const onLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.currentTarget.value
    if (!isLanguage(v) || v === settings.language) return
    void saveSettings({ language: v })
  }

  const onToggleLock = () => void saveSettings({ positionLock: !settings.positionLock })
  const onToggleTaskbar = () => void saveSettings({ showInTaskbar: !settings.showInTaskbar })

  const onToggleAutostart = async () => {
    if (autostartPending) return
    setAutostartPending(true)
    try {
      await setAutostart(!settings.autostart)
      onError(null)
    } catch (e) {
      onError(toBridgeError(e)) // CR-049: 일반 권한(LeastPrivilege)이라 취소 code가 없다 — 모든 실패는 오류 줄
    } finally {
      setAutostartPending(false)
    }
  }

  const onResetPosition = async () => {
    if (resetPending) return
    setResetPending(true)
    try {
      await resetOverlayPosition()
      onError(null)
    } catch (e) {
      onError(toBridgeError(e))
    } finally {
      setResetPending(false)
    }
  }

  return (
    <section aria-label={t.tabGeneral} className={styles.stack}>
      <SettingsCard title={t.cardLanguage}>
        <select
          id="language-select"
          aria-label={t.languageAria}
          value={settings.language}
          onChange={onLanguageChange}
          className={styles.languageSelect}
        >
          {LANGUAGES.map(l => (
            <option key={l} value={l} lang={l}>
              {LANGUAGE_NAMES[l]}
            </option>
          ))}
        </select>
      </SettingsCard>

      <ScaleIdleCard settings={settings} onError={onError} />

      <SettingsCard
        title={t.cardWindow}
        action={
          <button
            type="button"
            className={styles.outlineButton}
            disabled={resetPending}
            onClick={() => void onResetPosition()}
          >
            {t.resetPosition}
          </button>
        }
      >
        <ToggleSwitch
          id="lock-toggle"
          label={t.lockLabel}
          description={t.lockDesc}
          checked={settings.positionLock}
          onToggle={onToggleLock}
        />
      </SettingsCard>

      <SettingsCard title={t.cardStartup}>
        <ToggleSwitch
          id="taskbar-toggle"
          label={t.taskbarLabel}
          description={t.taskbarDesc}
          checked={settings.showInTaskbar}
          onToggle={onToggleTaskbar}
        />
        <ToggleSwitch
          id="autostart-toggle"
          label={t.autostartLabel}
          description={t.autostartDesc}
          checked={settings.autostart}
          busy={autostartPending}
          onToggle={() => void onToggleAutostart()}
        />
        <p role="status" aria-live="polite" className={styles.notice}>
          {autostartPending ? t.autostartPending : ''}
        </p>
      </SettingsCard>

      <ResetAllCard onError={onError} />
    </section>
  )
}

export default GeneralTab
