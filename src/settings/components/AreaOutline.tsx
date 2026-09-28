/**
 * 이동 영역 선(CR-018, R-15·R-16) — 「마우스 파츠」 탭 미리보기에 겹쳐 그리는 사각형 선.
 * 순수 렌더 컴포넌트. 클릭·끌기 판정에 관여하지 않는다(pointer-events: none, aria-hidden).
 * 평소(저장값, editing=false)는 닫힌 얇은 선, 설정 중(editing=true)은 굵은 선 + 점 표식.
 */
import { memo } from 'react'
import type { Point } from 'bridge'
import styles from './AreaOutline.module.css'

export type AreaOutlineProps = {
  /** 캔버스 좌표. pickArea 중 0~3개, 그 외 0개 또는 4개 */
  points: readonly Point[]
  /** 4점을 닫힌 사각형(polygon)으로 그릴지. 4점이 아니면 무시되고 항상 열린 선(polyline) */
  closed: boolean
  /** 편집 표시(굵은 선 + 점 표식) 여부. false 면 저장값의 얇은 닫힌 선 */
  editing: boolean
  scale: number
  /** 미리보기 픽셀 크기 = 캔버스 크기 × scale */
  width: number
  height: number
}

const AreaOutline = ({ points, closed, editing, scale, width, height }: AreaOutlineProps) => {
  if (points.length === 0) return null

  const toPixel = (p: Point) => `${p.x * scale},${p.y * scale}`
  const pts = points.map(toPixel).join(' ')
  const lineClass = editing ? styles.lineEditing : styles.lineSaved

  return (
    <svg className={styles.area} width={width} height={height} aria-hidden="true" focusable="false">
      {closed && points.length === 4 ? (
        <polygon points={pts} className={lineClass} />
      ) : (
        <polyline points={pts} className={styles.lineEditing} />
      )}
      {editing &&
        points.map((p, i) => (
          <circle key={i} cx={p.x * scale} cy={p.y * scale} r={3} className={styles.point} />
        ))}
    </svg>
  )
}

export default memo(AreaOutline)
