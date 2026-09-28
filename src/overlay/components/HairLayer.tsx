/**
 * 헤어(뒷머리) 레이어 (CR-037, R-30) — 등록돼 있으면 `.hairWrap`(`.canvas` 첫 자식, 배경보다 아래 — CR-051) 안에 그린다.
 * 상태(idle/rest)·키 입력·특수 키·클릭·펜 모드·위치 잠금과 무관하게 항상 같은 그림 1장(교체·회전·커서 추종 없음).
 * 젤리·부르르는 부모 `.hairWrap`이 `.jellyWrap`과 같은 motion 클래스로 준다(이 레이어에는 애니메이션 클래스·
 * 인라인 transform을 붙이지 않는다). `BackgroundLayer`와 같은 순수 렌더 모양이지만 슬롯('hair')·자리가 달라 파일을 따로 둔다.
 */
import { memo } from 'react'
import type { AssetManifest } from 'bridge'
import { findEntry } from './LayerStack'
import styles from '../overlay.module.css'

interface Props {
  manifest: AssetManifest
}

const HairLayer = ({ manifest }: Props) => {
  const hair = findEntry(manifest, 'hair')
  return hair ? <img className={styles.layer} src={hair.url} alt="" draggable={false} /> : null
}

export default memo(HairLayer)
