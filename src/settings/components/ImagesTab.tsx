/**
 * 「이미지 설정」 탭 — design/images-tab.md §4~§8. R-25(이미지 등록·미리보기)·R-19(카드 양식)·R-20(문구).
 * 검증은 core 가 한다(PNG·크기·용량·캔버스 일치). 이 탭은 결과 메시지만 보인다 — 클라이언트 재검증 없음.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CANVAS_MAX_HEIGHT,
  CANVAS_MAX_WIDTH,
  DEFAULT_MOUSE_SETTINGS,
  importAsset,
  pickPngFile,
  removeAsset,
  restoreDefaultAsset,
  setSettings,
  slotKey,
  toBridgeError,
  type AssetManifest,
  type AssetSlot,
  type BridgeError,
  type MouseSettings,
  type Settings,
} from 'bridge'
import { resolvePenPos } from 'state/mouseMapping'
import { errorText, format } from '../i18n/index'
import { useLanguage, useMessages } from '../i18n/MessagesContext'
import { buildSlotGroups, findEntry, isFirstPenUp, type ResetKind, type SlotCardSpec, type SlotGroup } from '../imageSlots'
import AddSlotCard from './AddSlotCard'
import ConfirmDialog from './ConfirmDialog'
import DefaultsDownloadPanel from './DefaultsDownloadPanel'
import ImageSlotCard from './ImageSlotCard'
import PenModePanel from './PenModePanel'
import styles from './ImagesTab.module.css'

const GROUP_TITLE = {
  background: 'groupBackground',
  keyboard: 'groupKeyboard',
  arm: 'groupArm',
  hand: 'groupHand',
} as const

export type ImagesTabProps = {
  settings: Settings
  manifest: AssetManifest
  onError: (e: BridgeError | null) => void
}

/**
 * (CR-035) resetKind 로 복원(restore)·비우기(clear) 확인창 문구·확정 동작을 고른다.
 * (CR-038, R-35) `focusAfter` — 뒷머리 「비우기」 완료 뒤 포커스를 돌려줄 버튼(같은 카드 「이미지 변경」).
 * 없으면(기존 비우기 칸) 옛 동작대로 누른 버튼(`trigger`)으로 돌아간다.
 */
type ConfirmTarget = {
  slot: AssetSlot
  key: string
  name: string
  trigger: HTMLButtonElement
  resetKind: ResetKind
  focusAfter?: HTMLButtonElement | null
}
/** (CR-033) 펜 확인창 종류 — 'enable' = 토글로 켤 때(R-29), 'first' = pen_up 첫 등록 직후(R-30) */
type PenDialog = { kind: 'enable' } | { kind: 'first'; size: { width: number; height: number } }

export const ImagesTab = ({ settings, manifest, onError }: ImagesTabProps) => {
  const t = useMessages()
  const language = useLanguage()
  const sectionRef = useRef<HTMLElement>(null)
  const [slotBusy, setSlotBusy] = useState<string | null>(null)
  const [cardError, setCardError] = useState<{ key: string; error: BridgeError } | null>(null)
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null)
  const [penDialog, setPenDialog] = useState<PenDialog | null>(null)
  const [penSaving, setPenSaving] = useState(false)
  const groups: SlotGroup[] = useMemo(() => buildSlotGroups(manifest), [manifest])
  const mouse: MouseSettings = settings.mouse ?? DEFAULT_MOUSE_SETTINGS
  const hasPenUp = findEntry(manifest, 'pen_up') !== undefined
  const penOn = hasPenUp && mouse.penMode === true
  // 비우기 완료 뒤 포커스 복귀 대상. 버튼이 다시 활성화된(re-render 커밋 후) 시점에 focus() 해야
  // 하므로 slotBusy 가 null 로 바뀐 뒤 실행되는 효과에서 처리한다(disabled 버튼은 focus 되지 않는다).
  const pendingFocusRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (slotBusy !== null) return
    const trigger = pendingFocusRef.current
    if (!trigger) return
    pendingFocusRef.current = null
    if (trigger.isConnected) trigger.focus()
    else sectionRef.current?.focus()
  }, [slotBusy])

  const cardTitle = (spec: SlotCardSpec): string => {
    const slotText = t.slots[spec.msg]
    return spec.n === null ? slotText.title : format(slotText.title, { n: spec.n })
  }

  const cardErrorText = (key: string): string | undefined =>
    cardError?.key === key ? errorText(t, language, cardError.error) : undefined

  /** pen_up 첫 등록이 아닌 "교체"에서만 불린다(첫 등록은 savePenMode 가 penPos 를 함께 저장, §9.4) */
  const ensurePenPos = async (slot: AssetSlot, next: AssetManifest): Promise<void> => {
    if (slotKey(slot) !== 'pen_up') return
    if (mouse.penPos !== null) return
    const entry = findEntry(next, 'pen_up')
    if (!entry) return
    try {
      await setSettings({
        ...settings,
        mouse: { ...mouse, penPos: resolvePenPos(mouse, { width: entry.width, height: entry.height }) },
      })
    } catch (e) {
      onError(toBridgeError(e))
    }
  }

  const onChangeImage = async (slot: AssetSlot, key: string) => {
    if (slotBusy !== null) return
    const before = manifest
    try {
      const path = await pickPngFile(t.pickTitle)
      if (path === null) return
      setSlotBusy(key)
      const next = await importAsset(slot, path)
      setCardError(null)
      if (isFirstPenUp(slot, before, next)) {
        // (CR-033, R-30) 첫 등록 — ensurePenPos 대신 확인창을 띄운다. 저장은 대답 뒤 savePenMode 1회
        const e = findEntry(next, 'pen_up')
        if (e) setPenDialog({ kind: 'first', size: { width: e.width, height: e.height } })
      } else {
        await ensurePenPos(slot, next)
      }
    } catch (e) {
      setCardError({ key, error: toBridgeError(e) })
    } finally {
      setSlotBusy(null)
    }
  }

  /**
   * (CR-033, R-29·R-30) `set_settings` 1회로 penMode 와(첫 등록이면) penPos 를 함께 저장한다.
   * 토글 표시는 로컬 선반영 없이 settings://changed 수신으로만 바뀐다(design/general-tab.md saveSettings 와 같은 규칙).
   */
  const savePenMode = async (on: boolean, size: { width: number; height: number } | null) => {
    const m = settings.mouse ?? DEFAULT_MOUSE_SETTINGS
    const penPos = size !== null && m.penPos === null ? resolvePenPos(m, size) : m.penPos
    setPenSaving(true)
    try {
      await setSettings({ ...settings, mouse: { ...m, penMode: on, penPos } })
      onError(null)
    } catch (e) {
      onError(toBridgeError(e))
    } finally {
      setPenSaving(false)
    }
  }

  /** 확인창이 닫힌 뒤 포커스를 토글로 돌린다. 저장은 비동기라 이 시점의 DOM은 아직 비활성화되기 전이다 */
  const focusPenToggle = () => {
    document.getElementById('pen-mode-toggle')?.focus()
  }

  const onTogglePenMode = () => {
    if (!hasPenUp || penSaving || slotBusy !== null) return
    if (penOn) {
      void savePenMode(false, null) // 끌 때는 확인 없음(R-29)
    } else {
      setPenDialog({ kind: 'enable' })
    }
  }

  const onPenDialogConfirm = () => {
    const d = penDialog
    if (!d) return
    setPenDialog(null)
    void savePenMode(true, d.kind === 'first' ? d.size : null)
    focusPenToggle()
  }

  const onPenDialogCancel = () => {
    const d = penDialog
    if (!d) return
    setPenDialog(null)
    if (d.kind === 'first') void savePenMode(false, d.size) // 아니요 = 꺼짐 저장 + penPos 첫 저장(R-30)
    focusPenToggle()
  }

  const onRequestReset = (spec: SlotCardSpec, trigger: HTMLButtonElement) => {
    if (slotBusy !== null || !spec.canReset) return
    setConfirm({ slot: spec.slot, key: spec.key, name: cardTitle(spec), trigger, resetKind: spec.resetKind })
  }

  /** (CR-038, R-35 / CR-053) 뒷머리·뽀모도 인물 카드의 「비우기」 — 기존 비우기 확인창(resetKind 'clear')을 그대로 쓴다 */
  const onRequestEmpty = (spec: SlotCardSpec, trigger: HTMLButtonElement, changeButton: HTMLButtonElement | null) => {
    if (slotBusy !== null || !spec.canEmpty) return
    setConfirm({
      slot: spec.slot,
      key: spec.key,
      name: cardTitle(spec),
      trigger,
      resetKind: 'clear',
      focusAfter: changeButton,
    })
  }

  /** (CR-035) 내장 기본이 없는 칸(resetKind 'clear')에서만 불린다 */
  const onConfirmClear = async () => {
    const c = confirm
    if (!c) return
    setConfirm(null)
    setSlotBusy(c.key)
    // (CR-038, R-35) 뒷머리 「비우기」는 비운 뒤 스스로 비활성화되므로 같은 카드 「이미지 변경」으로 돌린다.
    // focusAfter 가 없는 기존 비우기 칸은 옛 동작대로 누른 버튼(trigger)으로 돌아간다.
    pendingFocusRef.current = c.focusAfter ?? c.trigger
    try {
      await removeAsset(c.slot)
      setCardError(null)
    } catch (e) {
      setCardError({ key: c.key, error: toBridgeError(e) })
    } finally {
      setSlotBusy(null)
    }
  }

  /**
   * (CR-035 신규, R-32) 내장 기본이 있는 칸(resetKind 'restore')에서만 불린다. removeAsset 은 부르지
   * 않는다(U-1 = B — 비우기 없음). 빈 pen_up 을 복원해 처음 등록이 됐으면 R-30 확인창을 띄운다.
   */
  const onConfirmRestore = async () => {
    const c = confirm
    if (!c) return
    setConfirm(null)
    const before = manifest
    setSlotBusy(c.key)
    pendingFocusRef.current = c.trigger
    try {
      const next = await restoreDefaultAsset(c.slot)
      setCardError(null)
      if (isFirstPenUp(c.slot, before, next)) {
        // 포커스는 펜 확인창(「아니요」)이 가져가고, 닫힐 때 토글로 돌아간다(§9.7) — 누른 「기본값」으로는 돌리지 않는다
        pendingFocusRef.current = null
        const penEntry = findEntry(next, 'pen_up')
        if (penEntry) setPenDialog({ kind: 'first', size: { width: penEntry.width, height: penEntry.height } })
      } else {
        await ensurePenPos(c.slot, next)
      }
    } catch (e) {
      setCardError({ key: c.key, error: toBridgeError(e) })
    } finally {
      setSlotBusy(null)
    }
  }

  /** (CR-035) 확인창 「확정」 — resetKind 로 복원·비우기 중 하나로 위임한다 */
  const onConfirmReset = () => {
    if (confirm?.resetKind === 'restore') {
      void onConfirmRestore()
    } else {
      void onConfirmClear()
    }
  }

  const onCancelReset = () => {
    const c = confirm
    setConfirm(null)
    c?.trigger.focus()
  }

  // (CR-033) penDialog === null 일 때는 닫혀 있어 보이지 않으므로 'enable' 문구로 폴백해도 무해하다
  const penKind = penDialog?.kind ?? 'enable'
  // (CR-035) confirm === null 일 때는 닫혀 있어 보이지 않으므로 'clear' 문구로 폴백해도 무해하다
  const resetKind = confirm?.resetKind ?? 'clear'

  return (
    <section aria-label={t.tabImages} tabIndex={-1} ref={sectionRef} className={styles.root}>
      <p className={styles.note}>{format(t.imagesNote, { w: CANVAS_MAX_WIDTH, h: CANVAS_MAX_HEIGHT })}</p>
      <DefaultsDownloadPanel />
      {groups.map(g => (
        <div key={g.id}>
          <h2 className={styles.groupTitle}>{t[GROUP_TITLE[g.id]]}</h2>
          {g.id === 'hand' && (
            <PenModePanel
              checked={penOn}
              disabled={!hasPenUp || slotBusy !== null}
              busy={penSaving}
              onToggle={onTogglePenMode}
            />
          )}
          <div className={styles.grid}>
            {g.cards.map(spec =>
              spec.type === 'slot' ? (
                <ImageSlotCard
                  key={spec.key}
                  cardKey={spec.key}
                  title={cardTitle(spec)}
                  description={t.slots[spec.msg].desc}
                  required={spec.required}
                  url={spec.entry?.url}
                  disabled={slotBusy !== null}
                  canReset={spec.canReset}
                  resetKind={spec.resetKind}
                  clearBlockedHint={spec.lastOnlyBlocked ? t.clearLastOnly : undefined}
                  error={cardErrorText(spec.key)}
                  onChange={() => void onChangeImage(spec.slot, spec.key)}
                  onReset={trigger => onRequestReset(spec, trigger)}
                  canEmpty={spec.canEmpty}
                  onEmpty={
                    spec.emptyable ? (trigger, changeButton) => onRequestEmpty(spec, trigger, changeButton) : undefined
                  }
                />
              ) : (
                <AddSlotCard
                  key={spec.key}
                  cardKey={spec.key}
                  label={t[spec.msg]}
                  disabled={slotBusy !== null}
                  error={cardErrorText(spec.key)}
                  onAdd={() => void onChangeImage(spec.slot, spec.key)}
                />
              ),
            )}
          </div>
        </div>
      ))}
      <ConfirmDialog
        open={confirm !== null}
        title={resetKind === 'restore' ? t.confirmRestoreTitle : t.confirmClearTitle}
        message={format(resetKind === 'restore' ? t.confirmRestoreMessage : t.confirmClearMessage, {
          name: confirm?.name ?? '',
        })}
        confirmLabel={resetKind === 'restore' ? t.confirmRestoreOk : t.confirmClearOk}
        cancelLabel={t.confirmCancel}
        onConfirm={onConfirmReset}
        onCancel={onCancelReset}
      />
      <ConfirmDialog
        open={penDialog !== null}
        tone="accent"
        title={penKind === 'first' ? t.penFirstTitle : t.penEnableTitle}
        message={penKind === 'first' ? t.penFirstMessage : t.penEnableMessage}
        confirmLabel={penKind === 'first' ? t.penFirstYes : t.penEnableOk}
        cancelLabel={penKind === 'first' ? t.penFirstNo : t.confirmCancel}
        onConfirm={onPenDialogConfirm}
        onCancel={onPenDialogCancel}
      />
    </section>
  )
}

export default ImagesTab
