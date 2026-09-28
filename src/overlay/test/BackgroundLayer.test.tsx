/**
 * 배경 레이어 TC — CR-014 · R-17. design/components.md §3 BackgroundLayer·배경 DOM 구조 3,
 * design/functions.md §5.3 「BackgroundLayer 렌더」.
 * 대상: src/overlay/components/BackgroundLayer.tsx (신규 — 구현 전에는 이 파일 전체가 실패한다)
 * 선행: src/bridge/types.ts AssetSlot 에 'background' (bridge UI-B5). 그 전에는 캐스팅으로 넣는다.
 * 시나리오: src/overlay/test/scenarios.md TC-033 ~ TC-035
 */
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { slotKey, type AssetEntry, type AssetManifest, type AssetSlot } from 'bridge/types'
import BackgroundLayer from '../components/BackgroundLayer'

vi.mock('bridge/events', () => ({}))
vi.mock('bridge/commands', () => ({}))
vi.mock('../overlay.module.css', () => ({
  default: {
    root: 'root',
    canvas: 'canvas',
    layer: 'layer',
    hand: 'hand',
    bounce: 'bounce',
    armWrap: 'armWrap',
  },
}))

const BG = 'background' as AssetSlot
const entry = (slot: AssetSlot, url = `u:${slotKey(slot)}`): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width: 900,
  height: 700,
  bytes: 1,
  url,
})
const manifest = (withBg: boolean, bgUrl = 'u:background'): AssetManifest => ({
  canvas: { width: 900, height: 700 },
  entries: [entry('body'), entry('idle'), ...(withBg ? [entry(BG, bgUrl)] : [])],
})

describe('BackgroundLayer', () => {
  it('TC-033: 배경 항목이 있으면 img 1개 — class "layer" 하나, alt="", draggable=false, 변형 없음', () => {
    const { container } = render(<BackgroundLayer manifest={manifest(true)} />)
    const all = container.querySelectorAll('img')
    expect(all).toHaveLength(1)
    const img = all[0]
    expect(container.firstElementChild).toBe(img)
    expect(img.getAttribute('src')).toBe('u:background')
    expect(img.className).toBe('layer')
    expect(img.getAttribute('alt')).toBe('')
    expect(img.getAttribute('draggable')).toBe('false')
    expect(img.style.transform).toBe('')
    expect(img.style.transformOrigin).toBe('')
    expect(img.getAttribute('style')).toBeNull()
  })

  it('TC-034: 배경 항목이 없으면 아무것도 그리지 않는다(투명)', () => {
    const { container } = render(<BackgroundLayer manifest={manifest(false)} />)
    expect(container.innerHTML).toBe('')
  })

  it('TC-035: React.memo로 감싼 기본 export — 같은 manifest면 같은 요소, 새 manifest면 src 갱신', () => {
    expect((BackgroundLayer as unknown as { $$typeof: symbol }).$$typeof).toBe(
      Symbol.for('react.memo'),
    )
    const m = manifest(true)
    const { container, rerender } = render(<BackgroundLayer manifest={m} />)
    const img = container.querySelector('img')
    rerender(<BackgroundLayer manifest={m} />)
    expect(container.querySelector('img')).toBe(img)
    rerender(<BackgroundLayer manifest={manifest(true, 'u:background2')} />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('u:background2')
    rerender(<BackgroundLayer manifest={manifest(false)} />)
    expect(container.innerHTML).toBe('')
  })
})
