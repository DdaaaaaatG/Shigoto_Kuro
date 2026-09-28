/**
 * 특수 키 렌더 TC — design/functions.md §5.3(SPECIAL_KEY_SLOT·pickKeyboardEntry·LayerStack 렌더 — CR-022: 바운스 없음,
 * Layer 클래스는 항상 layer), design.md §10.1 z3 행·§10.3·§10.6. CR-021(R-22)·CR-022(R-23).
 * 대상: src/overlay/components/LayerStack.tsx
 * 슬롯 key_* 는 bridge AssetSlot 확장(미확정 계약) 전이라 캐스팅으로 넣는다.
 * 로케이터: 오버레이는 접근성 이름이 없다(design.md §8·§9). DOM 구조 + img src(매니페스트 url).
 * 시나리오: src/overlay/test/scenarios.md TC-139 ~ TC-141 (TC-142는 CR-022로 폐기 — MouseArm bounce prop 삭제,
 *   젤리 짝 교대는 OverlayApp.jelly.test.tsx TC-154·TC-155)
 */
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { slotKey, type AssetEntry, type AssetManifest, type AssetSlot } from 'bridge/types'
import { createInitialState, type MachineState, type SpecialKey } from 'state/inputMachine'
import LayerStack, { SPECIAL_KEY_SLOT, pickKeyboardEntry } from '../components/LayerStack'

vi.mock('bridge/events', () => ({}))
vi.mock('bridge/commands', () => ({}))
// CR-022 mock 클래스(scenarios.md v0.9). bounce·bounceAlt는 잔존 감시용 — 소스가 쓰면 className에 드러난다
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
    bounce: 'bounce',
    bounceAlt: 'bounceAlt',
  },
}))

const CANVAS = { width: 900, height: 700 }
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
/** key_space·key_enter·key_undo 등록, key_z·key_question·key_exclamation·key_backspace 미등록(§10.6 규칙표 가정 + undo 등록) */
const MANIFEST: AssetManifest = {
  canvas: CANVAS,
  entries: [...simple(['body', 'idle', 'rest', 'kb_up', 'key_space', 'key_enter', 'key_undo']), kbDown(0), kbDown(1)],
}
const m = (over: Partial<MachineState> = {}): MachineState => ({ ...createInitialState(0), ...over })
const down = (specialHeld: SpecialKey[], kbFrame = 1, bounceSeq = 1): MachineState =>
  m({ kbDown: true, heldCount: Math.max(1, specialHeld.length), kbFrame, specialHeld, bounceSeq })

describe('특수 키 슬롯·그림 선택 (design/functions.md §5.3)', () => {
  it('TC-139: SPECIAL_KEY_SLOT — 분류값 7종 → 선택 슬롯 이름(🔒)', () => {
    expect(SPECIAL_KEY_SLOT).toEqual({
      space: 'key_space',
      z: 'key_z',
      question: 'key_question',
      exclamation: 'key_exclamation',
      enter: 'key_enter',
      backspace: 'key_backspace',
      undo: 'key_undo',
    })
  })

  it('TC-140: pickKeyboardEntry — 들림 kb_up / 가장 최근 특수 키 그림 있으면 그 그림 / 없으면 kb_down[kbFrame] ?? kb_down[0] ?? kb_up', () => {
    const url = (s: MachineState, mf: AssetManifest = MANIFEST) => pickKeyboardEntry(mf, s)?.url
    expect(url(m())).toBe('u:kb_up')
    expect(url(m({ specialHeld: ['space'] }))).toBe('u:kb_up')
    expect(url(down([]))).toBe('u:kb_down_1')
    expect(url(down([], 2))).toBe('u:kb_down_0')
    expect(url(down(['space']))).toBe('u:key_space')
    expect(url(down(['space', 'enter']))).toBe('u:key_enter')
    expect(url(down(['enter', 'space']))).toBe('u:key_space')
    expect(url(down(['undo']))).toBe('u:key_undo')
    expect(url(down(['z']))).toBe('u:kb_down_1')
    // 가장 최근(z) 그림이 없으면 이전 특수 키 그림이 아니라 누름 프레임
    expect(url(down(['space', 'z']))).toBe('u:kb_down_1')
    for (const k of ['question', 'exclamation', 'backspace'] as const) expect(url(down([k], 0))).toBe('u:kb_down_0')
    const noUp: AssetManifest = { ...MANIFEST, entries: MANIFEST.entries.filter(e => slotKey(e.slot) !== 'kb_up') }
    expect(url(m(), noUp)).toBeUndefined()
    const noDown: AssetManifest = {
      ...MANIFEST,
      entries: MANIFEST.entries.filter(e => !slotKey(e.slot).startsWith('kb_down')),
    }
    // v1.7 개정(CR-043, R-32 — design.md §10.13 5행): kb_down 없음 → undefined(투명)가 아니라 kb_up
    expect(url(down(['z']), noDown)).toBe('u:kb_up')
    expect(url(down([]), noDown)).toBe('u:kb_up')
    expect(url(down(['space']), noDown)).toBe('u:key_space')
  })
})

describe('LayerStack 렌더 — 바운스 없음 (CR-022: 젤리는 감싼 .jellyWrap 소관, design/functions.md §5.3)', () => {
  it('TC-141: LayerStack — 특수 키 그림은 같은 키보드 img, 몸통·상태·키보드 img class는 bounceSeq·kbDown과 무관하게 항상 layer', () => {
    const { container, rerender } = render(<LayerStack penMode={false} manifest={MANIFEST} machine={m()} />)
    const imgs = () => Array.from(container.querySelectorAll('img'))
    const kb = imgs()[2]
    const see = () => ({
      srcs: imgs().map(i => i.getAttribute('src')),
      classes: imgs().map(i => i.className),
      same: imgs()[2] === kb,
    })
    const LAYERS = ['layer', 'layer', 'layer']
    expect(see()).toEqual({ srcs: ['u:body', 'u:idle', 'u:kb_up'], classes: LAYERS, same: true })
    const steps: Array<[MachineState, string]> = [
      [down(['space'], 1, 1), 'u:key_space'],
      [down(['space', 'enter'], 2, 2), 'u:key_enter'],
      [down(['space'], 2, 2), 'u:key_space'],
      [down([], 2, 2), 'u:kb_down_0'],
      [m({ bounceSeq: 2 }), 'u:kb_up'],
    ]
    for (const [machine, src] of steps) {
      rerender(<LayerStack penMode={false} manifest={MANIFEST} machine={machine} />)
      expect(see()).toEqual({ srcs: ['u:body', 'u:idle', src], classes: LAYERS, same: true })
    }
    expect(imgs()).toHaveLength(3)
    expect(container.querySelectorAll('.bounce, .bounceAlt, .jelly, .jellyAlt')).toHaveLength(0)
  })
})
