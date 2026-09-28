/**
 * 「기본 이미지 다운로드」 패널 — design/images-tab.md §10.3~§10.8(CR-035, R-33).
 * 폴더 선택 → 충돌이면 덮어쓰기 확인 → 저장 → 결과 줄. 카드 등록(slotBusy)과는 독립이다(§10.4).
 */
import { useEffect, useRef, useState } from 'react'
import { DEFAULT_ASSET_SLOTS, exportDefaultAssets, pickFolder, toBridgeError } from 'bridge'
import { errorText, format } from '../i18n/index'
import { useLanguage, useMessages } from '../i18n/MessagesContext'
import { exportResult, type DownloadResult } from '../imageSlots'
import ConfirmDialog from './ConfirmDialog'
import cardStyles from './ImageSlotCard.module.css'
import styles from './ImagesTab.module.css'

type Conflict = { dir: string; files: string[] }

const resultText = (
  t: ReturnType<typeof useMessages>,
  language: ReturnType<typeof useLanguage>,
  r: DownloadResult,
): string => {
  if (r.kind === 'done') return format(t.exportDone, { n: r.count })
  if (r.kind === 'partial') {
    return format(t.exportPartial, { ok: r.ok, fail: r.failed.length, files: r.failed.join(', ') })
  }
  return errorText(t, language, r.error)
}

export const DefaultsDownloadPanel = () => {
  const t = useMessages()
  const language = useLanguage()
  const [busy, setBusy] = useState(false)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [result, setResult] = useState<DownloadResult | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  // 다운로드가 끝나면 단추로 포커스를 돌릴지(§10.5) — 충돌 확인창이 열려 있는 동안은 확인창이 가진다
  const refocusRef = useRef(false)

  useEffect(() => {
    if (busy || conflict !== null || !refocusRef.current) return
    refocusRef.current = false
    buttonRef.current?.focus()
  }, [busy, conflict])

  const onDownload = async () => {
    if (busy || conflict !== null) return
    setResult(null)
    let dir: string | null = null
    try {
      dir = await pickFolder(t.pickFolderTitle)
    } catch (e) {
      setResult({ kind: 'error', error: toBridgeError(e) })
      // K-3(메인 결정): pickFolder 자체가 실패하면 busy 가 한 번도 true 가 되지 않아 위 포커스 효과
      // ([busy, conflict] 의존)가 돌지 않는다 — 단추가 비활성화된 적이 없으므로 바로 포커스한다.
      buttonRef.current?.focus()
      return
    }
    if (dir === null) return // 취소 — exportDefaultAssets 호출 없음, 결과 줄 없음
    setBusy(true)
    refocusRef.current = true
    try {
      const r = await exportDefaultAssets(dir, false)
      if (r.written.length === 0 && r.conflicts.length > 0) {
        setConflict({ dir, files: r.conflicts }) // 아무것도 쓰이지 않았다 — 덮어쓰기 확인창
      } else {
        setResult(exportResult(r))
      }
    } catch (e) {
      setResult({ kind: 'error', error: toBridgeError(e) })
    } finally {
      setBusy(false)
    }
  }

  const onConflictConfirm = async () => {
    const c = conflict
    if (!c) return
    setConflict(null)
    setBusy(true)
    refocusRef.current = true
    try {
      const r = await exportDefaultAssets(c.dir, true) // 전부 덮어쓰기, 1회
      setResult(exportResult(r))
    } catch (e) {
      setResult({ kind: 'error', error: toBridgeError(e) })
    } finally {
      setBusy(false)
    }
  }

  const onConflictCancel = () => {
    setConflict(null) // 2차 호출 없음, 결과 줄 없음
    refocusRef.current = true
  }

  return (
    <div className={styles.download}>
      <p className={styles.downloadDesc} id="download-defaults-desc">
        {format(t.downloadDefaultsDesc, { n: DEFAULT_ASSET_SLOTS.length })}
      </p>
      <button
        type="button"
        ref={buttonRef}
        className={cardStyles.outline}
        aria-describedby="download-defaults-desc"
        aria-busy={busy}
        disabled={busy}
        onClick={() => void onDownload()}
      >
        {t.downloadDefaults}
      </button>
      {result !== null && (
        <p
          className={styles.downloadResult}
          role={result.kind === 'done' ? 'status' : 'alert'}
          data-tone={result.kind === 'done' ? 'ok' : 'error'}
        >
          {resultText(t, language, result)}
        </p>
      )}
      <ConfirmDialog
        open={conflict !== null}
        title={t.exportConflictTitle}
        message={format(t.exportConflictMessage, { n: conflict?.files.length ?? 0 })}
        confirmLabel={t.exportConflictOk}
        cancelLabel={t.confirmCancel}
        onConfirm={() => void onConflictConfirm()}
        onCancel={onConflictCancel}
      />
    </div>
  )
}

export default DefaultsDownloadPanel
