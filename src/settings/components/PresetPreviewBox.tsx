/**
 * 프리셋 카드 합성 미리보기 — design/presets-tab.md §11.2·§11.5(CR-065, R-68).
 * 읽기 전용: previewLayout 결과대로 <img> 를 겹친다. 한 장이라도 불러오기에 실패하면 전체를 안내 문구로 바꾼다.
 * 장식 그림이라 alt="" 이고 포커스 요소가 없다. bridge 는 부르지 않는다.
 */
import { useMemo, useState } from 'react'
import type { PresetPreview } from 'bridge/types'
import { useMessages } from '../i18n/MessagesContext'
import { DEFAULT_PREVIEW_RATIO, previewLayout } from '../presetValues'
import styles from './PresetsTab.module.css'

export type PresetPreviewBoxProps = {
  preview: PresetPreview
}

export const PresetPreviewBox = ({ preview }: PresetPreviewBoxProps) => {
  const t = useMessages()
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const layout = useMemo(() => previewLayout(preview), [preview])
  // url 목록이 바뀌면 실패 기록이 저절로 풀린다
  const failed = failedUrl !== null && layout !== null && layout.items.some(i => i.url === failedUrl)

  return (
    <div className={styles.preview} style={{ aspectRatio: layout?.aspectRatio ?? DEFAULT_PREVIEW_RATIO }}>
      {layout === null || layout.items.length === 0 || failed ? (
        <p className={styles.previewNote}>{t.presetPreviewUnavailable}</p>
      ) : (
        layout.items.map(item => (
          <img
            key={item.key}
            className={styles.previewLayer}
            src={item.url}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              width: `${item.width}%`,
              height: `${item.height}%`,
            }}
            onError={() => setFailedUrl(item.url)}
          />
        ))
      )}
    </div>
  )
}

export default PresetPreviewBox
