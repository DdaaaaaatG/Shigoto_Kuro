/**
 * settings 이동 영역 선 컴포넌트 스펙 — CR-018(R-15·R-16).
 * 기준: src/settings/design.md §3 `AreaOutline` · §5.2 「AreaOutline 렌더」 1~7 · scenarios.md TC-075.
 * 선 굵기·색(1px / 2px, #3b82f6, 점의 흰 테두리)은 CSS Modules 값이라 jsdom 계산 스타일로 보지 않는다.
 * 여기서는 클래스 구분(저장 선 ≠ 편집 선, 열린 편집 선 = 닫힌 편집 선, 점 표식 클래스 별도)만 단언하고
 * 실물 모양은 manual-checklist.md M-13.
 * 선행: CR-018 화면(src/settings/components/AreaOutline.tsx 신규).
 */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Point } from 'bridge/types'
import AreaOutline from '../components/AreaOutline'

const P4: Point[] = [
  { x: 100, y: 400 },
  { x: 800, y: 400 },
  { x: 800, y: 650 },
  { x: 100, y: 650 },
]

type Opts = { points?: readonly Point[]; closed?: boolean; editing?: boolean; scale?: number }
const draw = ({ points = P4, closed = true, editing = false, scale = 0.5 }: Opts = {}) =>
  render(
    <AreaOutline
      points={points}
      closed={closed}
      editing={editing}
      scale={scale}
      width={900 * scale}
      height={700 * scale}
    />,
  )
const ptsOf = (c: HTMLElement, tag: 'polygon' | 'polyline') =>
  c.querySelector(tag)?.getAttribute('points') ?? null
const dotsOf = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('circle')).map(
    e => `${e.getAttribute('cx')},${e.getAttribute('cy')},${e.getAttribute('r')}`,
  )
const classOf = (c: HTMLElement, sel: string) => c.querySelector(sel)?.getAttribute('class') ?? null

describe('AreaOutline (design §5.2 렌더 1~7)', () => {
  it('TC-075: 점이 0개면 아무것도 그리지 않는다(렌더 1)', () => {
    for (const closed of [true, false]) {
      for (const editing of [true, false]) {
        const { container, unmount } = draw({ points: [], closed, editing })
        expect(container.firstChild).toBeNull()
        unmount()
      }
    }
  })

  it('TC-075: 저장 표시 — svg 속성, 4점 닫힌 polygon(좌표 × scale), 점 표식 없음(렌더 2·3·4)', () => {
    const { container } = draw()
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('width', '450')
    expect(svg).toHaveAttribute('height', '350')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(container.querySelectorAll('polygon')).toHaveLength(1)
    expect(ptsOf(container, 'polygon')).toBe('50,200 400,200 400,325 50,325')
    expect(container.querySelector('polyline')).toBeNull()
    expect(dotsOf(container)).toEqual([])
  })

  it('TC-075: 편집 표시 — 닫힌 4점은 polygon + 점마다 r=3 표식, 선 클래스가 저장 표시와 다르다(렌더 4·5·6)', () => {
    const saved = draw({ editing: false })
    const savedClass = classOf(saved.container, 'polygon')
    saved.unmount()
    const { container } = draw({ editing: true })
    expect(ptsOf(container, 'polygon')).toBe('50,200 400,200 400,325 50,325')
    expect(container.querySelector('polyline')).toBeNull()
    expect(dotsOf(container)).toEqual(['50,200,3', '400,200,3', '400,325,3', '50,325,3'])
    const editingClass = classOf(container, 'polygon')
    expect(editingClass).not.toBeNull()
    expect(editingClass).not.toBe(savedClass)
    const dotClasses = Array.from(container.querySelectorAll('circle')).map(e => e.getAttribute('class'))
    expect(new Set(dotClasses).size).toBe(1)
    expect(dotClasses[0]).not.toBe(editingClass)
    expect(dotClasses[0]).not.toBe(savedClass)
  })

  it('TC-075: 편집 중 1~3점은 polyline(closed=true 여도 4점이 아니면 polyline), 클래스는 편집 선과 같다', () => {
    const closedEditing = draw({ editing: true })
    const editingClass = classOf(closedEditing.container, 'polygon')
    closedEditing.unmount()
    const three = draw({ points: P4.slice(0, 3), closed: false, editing: true })
    expect(ptsOf(three.container, 'polyline')).toBe('50,200 400,200 400,325')
    expect(three.container.querySelector('polygon')).toBeNull()
    expect(dotsOf(three.container)).toHaveLength(3)
    expect(classOf(three.container, 'polyline')).toBe(editingClass)
    three.unmount()
    const threeClosed = draw({ points: P4.slice(0, 3), closed: true, editing: true })
    expect(threeClosed.container.querySelector('polygon')).toBeNull()
    expect(ptsOf(threeClosed.container, 'polyline')).toBe('50,200 400,200 400,325')
    threeClosed.unmount()
    const two = draw({ points: P4.slice(0, 2), closed: false, editing: true })
    expect(ptsOf(two.container, 'polyline')).toBe('50,200 400,200')
    expect(dotsOf(two.container)).toEqual(['50,200,3', '400,200,3'])
    two.unmount()
    // 점 1개: 선 없이 점 표식만 보인다 — <polyline> 요소 유무는 설계가 정하지 않아 단언하지 않는다
    const one = draw({ points: P4.slice(0, 1), closed: false, editing: true })
    expect(one.container.querySelector('polygon')).toBeNull()
    expect(dotsOf(one.container)).toEqual(['50,200,3'])
  })

  it('TC-075: scale 1 이면 캔버스 좌표 그대로, svg 크기도 캔버스 크기', () => {
    const { container } = draw({ scale: 1 })
    expect(container.querySelector('svg')).toHaveAttribute('width', '900')
    expect(container.querySelector('svg')).toHaveAttribute('height', '700')
    expect(ptsOf(container, 'polygon')).toBe('100,400 800,400 800,650 100,650')
  })

  it('TC-075: React.memo 로 감싸져 있다(렌더 7)', () => {
    expect((AreaOutline as unknown as { $$typeof?: symbol }).$$typeof).toBe(Symbol.for('react.memo'))
  })
})
