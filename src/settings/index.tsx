/**
 * 설정 화면 — design.md §1·§2·§2.1·§3·§5.3(CR-031). 왼쪽 세로 메뉴(role=tablist, vertical) +
 * 오른쪽 내용 영역(h1 섹션 제목 → 오류 줄 → 탭 패널)으로 구성한다(R-27). 탭 4개(기본 설정 / 이미지 설정 /
 * 어깨축·손 위치, R-19 이어받음 / 타이머, CR-045 R-44). `MessagesProvider`가 언어를 감싸고, 안의 `Shell`이
 * 세로 메뉴·오류 줄·본문을 그린다(R-20).
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  DEFAULT_SETTINGS,
  getAssetManifest,
  getSettings,
  onAssetsChanged,
  onSettingsChanged,
  setSettingsWindowTitle,
  type AssetManifest,
  type BridgeError,
  type Settings,
} from 'bridge'
import { useBridgeEvent } from 'components/hooks/useBridgeEvent'
import { fetchWithRetry } from 'components/utils/fetchWithRetry'
import GeneralTab from './components/GeneralTab'
import ImagesTab from './components/ImagesTab'
import MousePartsTab from './components/MousePartsTab'
import TabIcon from './components/TabIcon'
import TimerTab from './components/TimerTab'
import { errorText } from './i18n/index'
import { MessagesProvider, useLanguage, useMessages } from './i18n/MessagesContext'
import styles from './settings.module.css'

type Tab = 'general' | 'images' | 'mouse' | 'timer'

/** 세로 메뉴 순서(고정). 문구 키 = design.md §2.1 「TAB_KEY」. 4번째 = 타이머(CR-045, design/timer-tab.md §1.1) */
const TAB_IDS: readonly Tab[] = ['general', 'images', 'mouse', 'timer']

const TAB_KEY: Record<Tab, 'tabGeneral' | 'tabImages' | 'tabMouse' | 'tabTimer'> = {
  general: 'tabGeneral',
  images: 'tabImages',
  mouse: 'tabMouse',
  timer: 'tabTimer',
}

type ShellProps = {
  tab: Tab
  onTabChange: (tab: Tab) => void
  settings: Settings
  manifest: AssetManifest
  error: BridgeError | null
  onError: (e: BridgeError | null) => void
}

const Shell = ({ tab, onTabChange, settings, manifest, error, onError }: ShellProps) => {
  const t = useMessages()
  const language = useLanguage()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // 첫 마운트(ko)와 언어가 바뀔 때마다 창 제목·<html lang> 을 새로 반영한다(R-20)
  useEffect(() => {
    document.documentElement.lang = language
    setSettingsWindowTitle(t.windowTitle).catch(onError)
  }, [language, t, onError])

  // 세로 탭 키보드(R-27) — 위·아래 화살표(끝에서 순환)·Home·End 는 포커스 이동 + 즉시 선택(자동 활성).
  // 그 밖의 키(좌우 화살표 포함)는 아무것도 하지 않고 기본 동작도 막지 않는다.
  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = TAB_IDS.length
    let next: number | null = null
    if (e.key === 'ArrowDown') next = (index + 1) % count
    else if (e.key === 'ArrowUp') next = (index - 1 + count) % count
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = count - 1
    if (next === null) return
    e.preventDefault()
    onTabChange(TAB_IDS[next])
    tabRefs.current[next]?.focus()
  }

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div role="tablist" aria-orientation="vertical" aria-label={t.tabsAria} className={styles.tablist}>
          {TAB_IDS.map((id, i) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`settings-tab-${id}`}
              aria-selected={id === tab}
              aria-controls={`settings-panel-${id}`}
              tabIndex={id === tab ? 0 : -1}
              ref={el => {
                tabRefs.current[i] = el
              }}
              className={id === tab ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => onTabChange(id)}
              onKeyDown={e => onTabKeyDown(e, i)}
            >
              <TabIcon name={id} className={styles.tabIcon} />
              <span className={styles.tabLabel}>{t[TAB_KEY[id]]}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className={styles.main}>
        <div role="tabpanel" id={`settings-panel-${tab}`} aria-labelledby={`settings-tab-${tab}`}>
          <h1 className={styles.sectionTitle}>{t[TAB_KEY[tab]]}</h1>

          {error && (
            <p role="alert" className={styles.error}>
              {t.errorPrefix} {errorText(t, language, error)}
            </p>
          )}

          {tab === 'general' && <GeneralTab settings={settings} onError={onError} />}
          {tab === 'images' && <ImagesTab settings={settings} manifest={manifest} onError={onError} />}
          {tab === 'mouse' && <MousePartsTab settings={settings} manifest={manifest} onError={onError} />}
          {tab === 'timer' && <TimerTab settings={settings} manifest={manifest} onError={onError} />}
        </div>
      </main>
    </div>
  )
}

const SettingsApp = () => {
  const [tab, setTab] = useState<Tab>('general')
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [manifest, setManifest] = useState<AssetManifest>({ canvas: null, entries: [] })
  const [error, setError] = useState<BridgeError | null>(null)

  // CR-039: 설정 창은 앱 시작 때 숨긴 채 만들어져 core 준비 전에 조회할 수 있다 — 200·500·1000ms 간격으로
  // 최대 3회 재시도하고, 끝내 실패할 때만 오류 문구를 띄운다
  useEffect(() => {
    const cancels = [
      fetchWithRetry(getSettings, setSettings, setError),
      fetchWithRetry(getAssetManifest, setManifest, setError),
    ]
    return () => cancels.forEach(cancel => cancel())
  }, [])

  useBridgeEvent(onSettingsChanged, setSettings)
  useBridgeEvent(onAssetsChanged, setManifest)

  return (
    <MessagesProvider language={settings.language}>
      <Shell
        tab={tab}
        onTabChange={setTab}
        settings={settings}
        manifest={manifest}
        error={error}
        onError={setError}
      />
    </MessagesProvider>
  )
}

export default SettingsApp
