/**
 * 레이어 TC (몸통·상태·키보드) — design/functions.md §5.3, design/components.md §3 LayerStack·Layer, design.md §11 D-1.
 * 대상: src/overlay/components/LayerStack.tsx
 * 로케이터: 오버레이는 접근성 이름이 없다(design.md §8·§9 — 모든 img alt=""). DOM 구조 + img src(매니페스트 url)로 찾는다.
 * 시나리오: src/overlay/test/scenarios.md TC-026 ~ TC-032 (TC-029는 CR-019 쾅 폐기로 폐기 — it 삭제, 슬롯 `slam` 없음)
 */
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { slotKey, type AssetEntry, type AssetManifest, type AssetSlot } from 'bridge/types'
import { createInitialState, type MachineState } from 'state/inputMachine'
import LayerStack, { findEntry, kbDownFrameCount } from '../components/LayerStack'

// 실제 Tauri API를 불러오지 않도록 bridge 래퍼를 막는다(barrel `bridge`가 re-export)
vi.mock('bridge/events', () => ({}))
vi.mock('bridge/commands', () => ({}))
vi.mock('../overlay.module.css', () => ({
  default: {
    root: 'root',
    canvas: 'canvas',
    layer: 'layer',
    hand: 'hand',
    armWrap: 'armWrap',
    jellyWrap: 'jellyWrap',
    jelly: 'jelly',
    jellyAlt: 'jellyAlt',
    // 잔존 감시용(CR-022 — 소스가 옛 클래스를 쓰면 className에 드러난다)
    bounce: 'bounce',
    bounceAlt: 'bounceAlt',
  },
}))

const entry = (slot: AssetSlot, width = 900, height = 700): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url: `u:${slotKey(slot)}`,
})
const kbDown = (index: number) => entry({ kind: 'kb_down', index })
const simple = (slots: string[]) => slots.map(s => entry(s as AssetSlot))

const FULL: AssetManifest = {
  canvas: { width: 900, height: 700 },
  entries: [...simple(['body', 'idle', 'rest', 'kb_up']), kbDown(0), kbDown(1)],
}
const without = (slot: string): AssetManifest => ({
  ...FULL,
  entries: FULL.entries.filter(e => slotKey(e.slot) !== slot),
})
const machine = (over: Partial<MachineState> = {}): MachineState => ({
  ...createInitialState(0),
  ...over,
})
const imgs = (c: HTMLElement) => Array.from(c.querySelectorAll('img'))
const srcs = (c: HTMLElement) => imgs(c).map(i => i.getAttribute('src'))

describe('레이어 헬퍼', () => {
  it('TC-026: findEntry — 문자열 슬롯·kb_down 객체 슬롯 일치 항목, 없으면 undefined', () => {
    expect(findEntry(FULL, 'body')?.url).toBe('u:body')
    expect(findEntry(FULL, { kind: 'kb_down', index: 1 })?.url).toBe('u:kb_down_1')
    expect(findEntry(FULL, 'mouse_base')).toBeUndefined()
  })

  it('TC-027: kbDownFrameCount — kb_down 항목 수, 0장이면 1', () => {
    expect(kbDownFrameCount(FULL)).toBe(2)
    expect(kbDownFrameCount({ canvas: null, entries: [] })).toBe(1)
    expect(kbDownFrameCount({ ...FULL, entries: [kbDown(0), kbDown(1), kbDown(2)] })).toBe(3)
  })
})

describe('LayerStack 렌더', () => {
  it('TC-028: 대기·들림 — 몸통→대기→들림 순서, 바운스 없음, 모두 alt="" draggable=false', () => {
    const { container } = render(<LayerStack penMode={false} manifest={FULL} machine={machine()} />)
    expect(srcs(container)).toEqual(['u:body', 'u:idle', 'u:kb_up'])
    for (const img of imgs(container)) {
      expect(img.className).toBe('layer')
      expect(img.getAttribute('alt')).toBe('')
      expect(img.getAttribute('draggable')).toBe('false')
    }
  })

  it('TC-030: 빈 슬롯은 그리지 않는다(투명) — 상태 이미지·몸통이 없으면 해당 img 없음', () => {
    const noIdle = render(<LayerStack penMode={false} manifest={without('idle')} machine={machine()} />)
    expect(srcs(noIdle.container)).toEqual(['u:body', 'u:kb_up'])
    noIdle.unmount()
    const noBody = render(<LayerStack penMode={false} manifest={without('body')} machine={machine()} />)
    expect(srcs(noBody.container)).toEqual(['u:idle', 'u:kb_up'])
  })

  it('TC-031: 누름 — kbFrame 프레임 이미지(class layer, 바운스 없음 — CR-022 젤리는 .jellyWrap), 해당 프레임이 없으면 kb_down[0]', () => {
    const m = machine({ kbDown: true, heldCount: 1, kbFrame: 1 })
    const { container, rerender } = render(<LayerStack penMode={false} manifest={FULL} machine={m} />)
    expect(srcs(container)).toEqual(['u:body', 'u:idle', 'u:kb_down_1'])
    expect(imgs(container)[2].className).toBe('layer')
    rerender(<LayerStack penMode={false} manifest={FULL} machine={{ ...m, kbFrame: 2 }} />)
    expect(srcs(container)[2]).toBe('u:kb_down_0')
    expect(imgs(container)[2].className).toBe('layer')
  })

  it('TC-032: 상태가 바뀌면 같은 <img> 요소의 src만 바뀐다(D-1 수용: src 교체 방식)', () => {
    const { container, rerender } = render(<LayerStack penMode={false} manifest={FULL} machine={machine()} />)
    const stateImg = imgs(container)[1]
    rerender(<LayerStack penMode={false} manifest={FULL} machine={machine({ layer: 'rest' })} />)
    expect(imgs(container)[1]).toBe(stateImg)
    expect(stateImg.getAttribute('src')).toBe('u:rest')
  })
})
