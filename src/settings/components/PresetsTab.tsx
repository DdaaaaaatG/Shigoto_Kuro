/**
 * 「프리셋」 탭 — design/presets-tab.md §4·§5.1·§6·§8(CR-064, R-58~R-67).
 * 위 = 저장·가져오기 카드(PresetSaveCard), 아래 = 저장한 프리셋 카드 목록(PresetCard). 목록은 core 순서 그대로.
 * 상태 전부(목록·진행 중·안내·문제·확인창·인라인 편집·포커스 요청)를 이 파일이 소유하고 래퍼를 호출한다.
 * 적용 결과(설정·그림)는 낙관적으로 갱신하지 않는다 — SettingsApp 의 기존 settings://changed·assets://changed 구독이 반영한다.
 * 언마운트 뒤에도 흐름은 끝까지 진행하되 로컬 상태 쓰기만 건너뛰고, 실패는 onError 로 보낸다(§4).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyPreset,
  deletePreset,
  exportPreset,
  importPreset,
  listPresets,
  pickFolder,
  renamePreset,
  savePreset,
  toBridgeError,
  type AssetManifest,
  type BridgeError,
  type PresetProblem,
  type PresetSummary,
} from 'bridge'
import { format } from '../i18n/index'
import { useMessages } from '../i18n/MessagesContext'
import { canSavePreset, isPresetNameFilled, presetErrorForDisplay } from '../presetValues'
import ConfirmDialog from './ConfirmDialog'
import gen from './GeneralTab.module.css'
import PresetCard, { type PresetCardFocusTarget } from './PresetCard'
import PresetSaveCard, { type PresetSaveFocusTarget } from './PresetSaveCard'
import SettingsCard from './SettingsCard'
import styles from './PresetsTab.module.css'

export type PresetsTabProps = {
  manifest: AssetManifest
  onError: (e: BridgeError | null) => void
}

type FocusRequest =
  | { area: 'save'; target: PresetSaveFocusTarget }
  | { area: 'card'; id: string; target: PresetCardFocusTarget }

type Confirm = { kind: 'apply' | 'delete'; preset: PresetSummary }

const cardFocus = (id: string, target: PresetCardFocusTarget): FocusRequest => ({ area: 'card', id, target })
const saveFocus = (target: PresetSaveFocusTarget): FocusRequest => ({ area: 'save', target })

export const PresetsTab = ({ manifest, onError }: PresetsTabProps) => {
  const t = useMessages()
  const [presets, setPresets] = useState<PresetSummary[] | null>(null)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState('')
  const [problems, setProblems] = useState<PresetProblem[]>([])
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)
  const aliveRef = useRef(true)
  const busyRef = useRef(false)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  // 로컬 상태 쓰기는 언마운트 뒤 건너뛴다(onError 호출은 건너뛰지 않는다)
  const live = (write: () => void) => {
    if (aliveRef.current) write()
  }

  const reload = useCallback(async (): Promise<PresetSummary[] | null> => {
    try {
      const list = await listPresets()
      if (aliveRef.current) setPresets(list)
      return list
    } catch (e) {
      onError(toBridgeError(e))
      return null
    }
  }, [onError])

  useEffect(() => {
    void reload()
  }, [reload])

  /** 작업 끝 — 진행 표시를 풀고 포커스를 요청한다(같은 배치라 자식은 pending 이 풀린 렌더에서 옮긴다) */
  const finish = (focus: FocusRequest | null) => {
    busyRef.current = false
    live(() => {
      setPending(false)
      if (focus) setFocusRequest(focus)
    })
  }

  /**
   * 프리셋 command 한 건 실행 — 시작(`pending`·안내·문제·편집 초기화) → task → 끝.
   * task 가 돌려준 포커스는 성공 뒤 대상, 실패(reject)면 `base`. `mapError`는 표시용 오류 변환.
   */
  const run = async (
    base: FocusRequest,
    task: () => Promise<FocusRequest | void>,
    mapError: (e: BridgeError) => BridgeError = e => e,
  ) => {
    busyRef.current = true
    setPending(true)
    setStatus('')
    setProblems([])
    setRenamingId(null)
    let focus = base
    try {
      focus = (await task()) ?? base
    } catch (e) {
      onError(mapError(toBridgeError(e)))
    }
    finish(focus)
  }

  const onSave = async (name: string): Promise<boolean> => {
    if (busyRef.current || !canSavePreset(name, manifest)) return false
    let ok = false
    await run(saveFocus('save'), async () => {
      const saved = await savePreset(name.trim())
      live(() => setStatus(format(t.presetSaved, { name: saved.name })))
      onError(null)
      await reload()
      ok = true
      return saveFocus('name')
    })
    return ok
  }

  const onImport = async () => {
    if (busyRef.current) return
    await run(saveFocus('import'), async () => {
      const dir = await pickFolder(t.pickPresetFolderTitle)
      if (dir === null) return
      const report = await importPreset(dir)
      onError(null)
      if (report.preset === null) {
        live(() => setProblems(report.problems))
        return
      }
      const imported = report.preset
      live(() => setStatus(format(t.presetImported, { name: imported.name })))
      await reload()
    })
  }

  const applyConfirmed = async (p: PresetSummary) => {
    await run(cardFocus(p.id, 'apply'), async () => {
      await applyPreset(p.id)
      live(() => setStatus(format(t.presetApplied, { name: p.name })))
      onError(null)
    })
  }

  const deleteConfirmed = async (p: PresetSummary, index: number) => {
    await run(cardFocus(p.id, 'delete'), async () => {
      await deletePreset(p.id)
      live(() => setStatus(format(t.presetDeleted, { name: p.name })))
      onError(null)
      const rest = (presets ?? []).filter(x => x.id !== p.id)
      live(() => setPresets(rest))
      const list = (await reload()) ?? rest
      const next = list[index] ?? list[index - 1]
      return next ? cardFocus(next.id, 'apply') : saveFocus('name')
    })
  }

  const onExport = async (p: PresetSummary) => {
    if (busyRef.current) return
    await run(
      cardFocus(p.id, 'export'),
      async () => {
        const dir = await pickFolder(t.pickExportFolderTitle)
        if (dir === null) return
        const result = await exportPreset(p.id, dir)
        live(() => setStatus(format(t.presetExported, { folder: result.folderName })))
        onError(null)
      },
      presetErrorForDisplay,
    )
  }

  const onRequest = (kind: Confirm['kind'], preset: PresetSummary) => {
    if (busyRef.current) return
    setRenamingId(null)
    setConfirm({ kind, preset })
  }

  const onConfirmCancel = () => {
    if (confirm) setFocusRequest(cardFocus(confirm.preset.id, confirm.kind))
    setConfirm(null)
  }

  const onConfirmOk = () => {
    if (!confirm || busyRef.current) return
    const { kind, preset } = confirm
    setConfirm(null)
    if (kind === 'apply') void applyConfirmed(preset)
    else void deleteConfirmed(preset, (presets ?? []).findIndex(x => x.id === preset.id))
  }

  const onStartRename = (p: PresetSummary) => {
    if (busyRef.current) return
    setStatus('')
    setRenamingId(p.id)
    setRenameDraft(p.name)
  }

  const onRenameCancel = () => {
    if (busyRef.current || renamingId === null) return
    setFocusRequest(cardFocus(renamingId, 'rename'))
    setRenamingId(null)
  }

  // 이름 바꾸기 저장은 편집을 유지한 채 진행한다(실패하면 초안 그대로 입력칸으로 돌아온다)
  const onRenameSave = async () => {
    const id = renamingId
    if (busyRef.current || id === null || !isPresetNameFilled(renameDraft)) return
    busyRef.current = true
    setPending(true)
    setStatus('')
    let focus = cardFocus(id, 'renameInput')
    try {
      await renamePreset(id, renameDraft.trim())
      onError(null)
      live(() => setRenamingId(null))
      await reload()
      focus = cardFocus(id, 'rename')
    } catch (e) {
      onError(toBridgeError(e))
    }
    finish(focus)
  }

  const onFocused = useCallback(() => setFocusRequest(null), [])
  const saveTarget = focusRequest?.area === 'save' ? focusRequest.target : null
  const dialog =
    confirm?.kind === 'delete'
      ? {
          title: t.confirmPresetDeleteTitle,
          message: format(t.confirmPresetDeleteMessage, { name: confirm.preset.name }),
          confirmLabel: t.confirmPresetDeleteOk,
        }
      : {
          title: t.confirmPresetApplyTitle,
          message: format(t.confirmPresetApplyMessage, { name: confirm?.preset.name ?? '' }),
          confirmLabel: t.confirmPresetApplyOk,
        }

  return (
    <section aria-label={t.tabPresets} aria-busy={pending || undefined} className={gen.stack}>
      <PresetSaveCard
        manifest={manifest}
        pending={pending}
        status={status}
        problems={problems}
        focusTarget={saveTarget}
        onFocused={onFocused}
        onSave={onSave}
        onImport={onImport}
      />
      <SettingsCard title={t.cardPresetList}>
        {presets !== null && presets.length === 0 && <p className={gen.fieldDesc}>{t.presetListEmpty}</p>}
        {presets !== null && presets.length > 0 && (
          <ul className={styles.list}>
            {presets.map(p => (
              <PresetCard
                key={p.id}
                preset={p}
                pending={pending}
                renaming={renamingId === p.id}
                renameDraft={renameDraft}
                focusTarget={focusRequest?.area === 'card' && focusRequest.id === p.id ? focusRequest.target : null}
                onFocused={onFocused}
                onApply={() => onRequest('apply', p)}
                onExport={() => void onExport(p)}
                onStartRename={() => onStartRename(p)}
                onDelete={() => onRequest('delete', p)}
                onRenameDraft={setRenameDraft}
                onRenameSave={() => void onRenameSave()}
                onRenameCancel={onRenameCancel}
              />
            ))}
          </ul>
        )}
      </SettingsCard>
      <ConfirmDialog
        open={confirm !== null}
        title={dialog.title}
        message={dialog.message}
        confirmLabel={dialog.confirmLabel}
        cancelLabel={t.confirmCancel}
        onConfirm={onConfirmOk}
        onCancel={onConfirmCancel}
      />
    </section>
  )
}

export default PresetsTab
