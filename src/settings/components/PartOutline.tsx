/**
 * 팔·펜 손 그림 영역 상자(R-38, CR-040) — 각 그림의 범위를 보여 주는 장식. 판정에는 관여하지 않는다
 * (pointer-events: none, aria-hidden). 그림이 없으면(pos 없음·크기 없음·0 이하) 아무것도 그리지 않는다.
 * 기준: src/settings/design/drag-hit.md §5.4.
 */
import { memo } from 'react'
import type { Point } from 'bridge'
import styles from './PartOutline.module.css'

export type PartOutlineProps = {
  pos: Point | null
  size: { width: number; height: number } | undefined
  scale: number
  tone: 'arm' | 'pen'
}

const PartOutline = ({ pos, size, scale, tone }: PartOutlineProps) => {
  if (!pos || !size || size.width <= 0 || size.height <= 0) return null

  return (
    <span
      className={`${styles.outline} ${tone === 'arm' ? styles.arm : styles.pen}`}
      aria-hidden="true"
      data-testid={`outline-${tone}`}
      style={{
        left: pos.x * scale,
        top: pos.y * scale,
        width: size.width * scale,
        height: size.height * scale,
      }}
    />
  )
}

export default memo(PartOutline)
