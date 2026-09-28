/**
 * 배경 레이어 (CR-014, R-17) — 등록돼 있으면 캔버스의 가장 아래에 그린다.
 * 바운스·상태 교체·커서 추종·회전 등 어떤 변형도 받지 않는 순수 렌더. 입력·상태기계와 무관하다.
 * `.canvas`의 첫 자식으로 배치해 다른 모든 레이어(마우스 파츠 z0 포함)보다 아래에 둔다.
 */
import { memo } from 'react'
import type { AssetManifest } from 'bridge'
import { findEntry } from './LayerStack'
import styles from '../overlay.module.css'

interface Props {
  manifest: AssetManifest
}

const BackgroundLayer = ({ manifest }: Props) => {
  const bg = findEntry(manifest, 'background')
  return bg ? <img className={styles.layer} src={bg.url} alt="" draggable={false} /> : null
}

export default memo(BackgroundLayer)
