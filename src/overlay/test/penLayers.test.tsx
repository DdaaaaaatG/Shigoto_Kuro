/**
 * 펜 모드 판별·손 그림 선택·키보드 레이어 TC — CR-025(R-25 펜 쥔 손 파츠) → CR-042(R-31 펜 손 단순화) 개정.
 * 근거: design/functions.md §5.3(findByKey·isPenMode), §5.5 CR-042 개정 블록
 *   (pickPenEntry: 누름(isPressing) 중 pen_down_0 ?? pen_up, 아니면 pen_up — kbFrame·specialHeld를 읽지 않음 /
 *    pickPenKeyboardEntry: kbDown 아님 → kb_up, 특수 키 누름 중이고 key_* 있으면 그 그림, 아니면 kb_up — kb_down을 읽지 않음 /
 *    LayerStack 렌더: kb = penMode ? pickPenKeyboardEntry : pickKeyboardEntry / penDownFrameCount 삭제),
 *   design.md §10.12(키보드 레이어·동작 표·남은 옛 파일·회귀 ①~③), design/components.md §3 LayerStack 행.
 * 펜 슬롯의 TS 표현은 파일명 키 문자열 캐스팅(penSlot). 옛 파일(pen_down_1·pen_key_*)을 픽스처에 남겨 쓰이지 않음을 본다.
 * bridge mock(vi.mock) — 실제 Tauri API import 없음.
 * 시나리오: src/overlay/test/scenarios.md TC-186, TC-187, TC-189 ~ TC-191(v1.6 개정), TC-252 ~ TC-254(v1.6 신규).
 *   TC-188(penDownFrameCount)은 CR-042로 폐기 — it 삭제(번호 유지).
 */
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { slotKey, type AssetEntry, type AssetManifest, type AssetSlot } from 'bridge/types'
import {
  SPECIAL_KEYS,
  createInitialState,
  reduce,
  type MachineConfig,
  type MachineInput,
  type MachineState,
  type SpecialKey,
} from 'state/inputMachine'
import LayerStack, {
  findByKey,
  isPenMode,
  pickKeyboardEntry,
  pickPenKeyboardEntry,
} from '../components/LayerStack'
import { pickPenEntry } from '../components/PenHand'

vi.mock('bridge/events', () => ({}))
vi.mock('bridge/commands', () => ({}))
vi.mock('../overlay.module.css', () => ({
  default: { root: 'root', canvas: 'canvas', layer: 'layer', hand: 'hand', armWrap: 'armWrap', jellyWrap: 'jellyWrap' },
}))

// ─── 픽스처 ───────────────────────────────────────────────────────────────
const T0 = 1_000_000
const penSlot = (key: string) => key as unknown as AssetSlot
const entry = (slot: AssetSlot, width = 900, height = 700): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url: `u:${slotKey(slot)}`,
})
const pen = (key: string, w = 202, h = 154) => entry(penSlot(key), w, h)
const kbDown = (index: number) => entry({ kind: 'kb_down', index })
/** 기본: 몸통·대기·쉬는중·kb_up·key_space·key_enter·kb_down 3장 */
const manifest = (...extra: AssetEntry[]): AssetManifest => ({
  canvas: { width: 900, height: 700 },
  entries: [
    ...['body', 'idle', 'rest', 'kb_up', 'key_space', 'key_enter'].map(s => entry(s as AssetSlot)),
    kbDown(0),
    kbDown(1),
    kbDown(2),
    ...extra,
  ],
})
/** CR-025 설계 예 등록(pen_up·pen_down_0 + 옛 파일 pen_down_1·pen_key_space) — CR-042 이후 옛 파일은 읽지 않는다 */
const PEN = manifest(pen('pen_up'), pen('pen_down_0'), pen('pen_down_1'), pen('pen_key_space'))
/** pen_up 없음 = 펜 모드 아님(pen_down_*·pen_key_*는 쓰지 않는다) */
const PARTIAL = manifest(pen('pen_down_0'), pen('pen_key_space'))
const EMPTY: AssetManifest = { canvas: null, entries: [] }
/** 옛 파일 모두 남은 매니페스트: pen_up·pen_down_0·pen_down_1·pen_key_* 7종 */
const OLD = manifest(pen('pen_up'), pen('pen_down_0'), pen('pen_down_1'), ...SPECIAL_KEYS.map(s => pen(`pen_key_${s}`)))
/** CR-042 규격 두 장: pen_up·pen_down_0 */
const TWO = manifest(pen('pen_up'), pen('pen_down_0'))
/** design.md §10.12 동작 표 머리 등록 — key_space만(key_enter 미등록) + pen_up·pen_down_0 */
const TABLE: AssetManifest = { ...TWO, entries: TWO.entries.filter(e => e.url !== 'u:key_enter') }
/** 펜 모드 config(design.md §10.12 config — kbFrames 1, clickPress true) */
const PEN_CFG: MachineConfig = { idleMs: 300_000, kbFrames: 1, clickPress: true }

const st = (over: Partial<MachineState> = {}): MachineState => ({ ...createInitialState(T0), ...over })
const url = (e: AssetEntry | undefined) => e?.url
const key = (pressed: boolean, heldCount: number, special: SpecialKey | null, ts: number, repeat?: boolean): MachineInput =>
  repeat === undefined
    ? { type: 'key', pressed, heldCount, special, ts }
    : { type: 'key', pressed, heldCount, special, repeat, ts }
const btn = (button: 'left' | 'right', pressed: boolean, ts: number): MachineInput => ({
  type: 'mouseButton',
  button,
  pressed,
  ts,
})

describe('펜 슬롯 조회·판별 (design/functions.md §5.3)', () => {
  it('TC-186: findByKey — slotKey 문자열이 같은 항목(같은 참조), 없으면 undefined', () => {
    const byUrl = (u: string) => PEN.entries.find(e => e.url === u)
    for (const k of ['pen_up', 'pen_down_0', 'pen_down_1', 'pen_key_space', 'kb_up', 'kb_down_2', 'key_space']) {
      expect(findByKey(PEN, k)).toBe(byUrl(`u:${k}`))
      expect(findByKey(PEN, k)).toBeDefined()
    }
    for (const k of ['pen_down_2', 'pen_key_enter', 'pen', '', 'mouse_base']) expect(findByKey(PEN, k)).toBeUndefined()
    expect(findByKey(EMPTY, 'pen_up')).toBeUndefined()
  })

  /** v1.4(CR-033): isPenMode(manifest, mouse) 2인자 — 토글 켜짐 mouse. 꺼짐·null·필드 없음은 penToggle.test.tsx TC-229 */
  const PEN_ON: NonNullable<Parameters<typeof isPenMode>[1]> = {
    shoulder: { x: 620, y: 530 },
    area: [
      { x: 420, y: 430 },
      { x: 620, y: 430 },
      { x: 620, y: 630 },
      { x: 420, y: 630 },
    ],
    hand: null,
    partPos: { x: 389, y: 492 },
    penPos: null,
    penMode: true,
  }

  it('TC-187: isPenMode(manifest, mouse) — 토글 켜짐이면 pen_up 등록 여부로 갈림, pen_down_*·pen_key_*만 있으면 false', () => {
    expect(isPenMode(PEN, PEN_ON)).toBe(true)
    expect(isPenMode(manifest(pen('pen_up')), PEN_ON)).toBe(true)
    expect(isPenMode(PARTIAL, PEN_ON)).toBe(false)
    expect(isPenMode(manifest(pen('pen_down_0'), pen('pen_down_1')), PEN_ON)).toBe(false)
    expect(isPenMode(manifest(), PEN_ON)).toBe(false)
    expect(isPenMode(EMPTY, PEN_ON)).toBe(false)
  })

  // TC-188(penDownFrameCount): v1.6 폐기(CR-042 — function 삭제). 펜 모드 kbFrames = 1·export 없음은 OverlayApp.pen.test.tsx TC-255
})

describe('손 그림·키보드 그림 선택 (design/functions.md §5.5 CR-042, design.md §10.12)', () => {
  it('TC-189: 상태기계 연쇄(펜 모드 kbFrames 1) — 손 = 누름 중 pen_down_0·아니면 pen_up, 키보드 = pickPenKeyboardEntry(특수 키 그림·이전 특수 키 복귀), kbFrame 늘 0', () => {
    const cfg: MachineConfig = { idleMs: 300_000, kbFrames: 1 }
    const steps: Array<[MachineInput | null, string, string]> = [
      [null, 'u:pen_up', 'u:kb_up'],
      [key(true, 1, null, T0 + 10), 'u:pen_down_0', 'u:kb_up'],
      [key(true, 1, null, T0 + 600, true), 'u:pen_down_0', 'u:kb_up'],
      [key(false, 0, null, T0 + 700), 'u:pen_up', 'u:kb_up'],
      [key(true, 1, null, T0 + 800), 'u:pen_down_0', 'u:kb_up'],
      [key(true, 2, 'space', T0 + 900), 'u:pen_down_0', 'u:key_space'],
      [key(true, 3, 'enter', T0 + 1000), 'u:pen_down_0', 'u:key_enter'],
      [key(false, 2, 'enter', T0 + 1100), 'u:pen_down_0', 'u:key_space'],
      [key(false, 0, null, T0 + 1200), 'u:pen_up', 'u:kb_up'],
    ]
    let s = createInitialState(T0)
    for (const [input, hand, kb] of steps) {
      if (input) s = reduce(s, input, cfg)
      expect(s.kbFrame).toBe(0)
      expect(url(pickPenEntry(PEN, s))).toBe(hand)
      expect(url(pickPenKeyboardEntry(PEN, s))).toBe(kb)
    }
  })

  it('TC-190: 폴백 — pen_down_0 없으면 누름 중에도 pen_up(옛 pen_down_1·pen_key_*가 있어도), key_*는 손 그림으로 쓰지 않음, pen_up 없으면 undefined', () => {
    // ② pen_down_0 없음(옛 pen_down_1만) → 키·클릭 누름 중에도 pen_up
    const noDown0 = manifest(pen('pen_up'), pen('pen_down_1'))
    for (const kbFrame of [0, 1]) {
      expect(url(pickPenEntry(noDown0, st({ kbDown: true, heldCount: 1, kbFrame })))).toBe('u:pen_up')
    }
    expect(url(pickPenEntry(noDown0, st({ clickHeld: ['left'], kbFrame: 1 })))).toBe('u:pen_up')
    // ③ 옛 pen_key_space만 → 스페이스 누름 중에도 pen_up
    const keyOnly = manifest(pen('pen_up'), pen('pen_key_space'))
    expect(url(pickPenEntry(keyOnly, st({ kbDown: true, heldCount: 1 })))).toBe('u:pen_up')
    expect(url(pickPenEntry(keyOnly, st({ kbDown: true, heldCount: 1, specialHeld: ['space'] })))).toBe('u:pen_up')
    // ⑤ 키보드 특수 키 그림(key_space)은 손 그림으로 쓰지 않는다
    expect(url(pickPenEntry(TWO, st({ kbDown: true, heldCount: 1, specialHeld: ['space'] })))).toBe('u:pen_down_0')
    // ⑥ pen_up 없음 → 어떤 상태에서도 undefined
    for (const s of [
      st(),
      st({ kbDown: true, heldCount: 1 }),
      st({ kbDown: true, heldCount: 1, specialHeld: ['space'] }),
      st({ clickHeld: ['left'], kbFrame: 1 }),
    ]) {
      expect(pickPenEntry(PARTIAL, s)).toBeUndefined()
      expect(pickPenEntry(EMPTY, s)).toBeUndefined()
    }
  })
})

describe('LayerStack 펜 모드 키보드 (design/functions.md §5.5 CR-042 LayerStack 렌더, design.md §10.12)', () => {
  // v1.4(CR-033): penMode는 OverlayApp이 isPenMode(manifest, settings.mouse)로 계산해 넘기는 prop.
  //   PEN = 토글 켜짐 전제(true), PARTIAL = pen_up이 없어 어떤 토글 값이든 false. 꺼짐 + PEN은 penToggle.test.tsx TC-230
  const renderStack = (m: AssetManifest, s: MachineState) => {
    const r = render(<LayerStack manifest={m} machine={s} penMode={m === PEN} />)
    const imgs = Array.from(r.container.querySelectorAll('img'))
    return { ...r, imgs, kb: imgs[imgs.length - 1] }
  }

  it('TC-191: 펜 모드 키보드 Layer = pickPenKeyboardEntry — 일반 누름·반복·쉬는중 kb_up, 특수 키 누름 중 key_*, kb_down 안 씀, 펜 그림은 그리지 않음 / pen_up 없으면 기존 pickKeyboardEntry', () => {
    const penStates: Array<[MachineState, string]> = [
      [st(), 'u:kb_up'],
      [st({ kbDown: true, heldCount: 1, kbFrame: 1 }), 'u:kb_up'],
      [st({ kbDown: true, heldCount: 1, specialHeld: ['space'] }), 'u:key_space'],
      [st({ kbDown: true, heldCount: 2, kbFrame: 2, specialHeld: ['enter'] }), 'u:key_enter'],
      [st({ kbDown: true, heldCount: 1, kbFrame: 1, repeating: true }), 'u:kb_up'],
      [st({ layer: 'rest' }), 'u:kb_up'],
    ]
    for (const [s, src] of penStates) {
      const { imgs, kb, unmount } = renderStack(PEN, s)
      expect(imgs.map(i => i.getAttribute('src'))).toEqual(['u:body', s.layer === 'rest' ? 'u:rest' : 'u:idle', src])
      expect(kb.getAttribute('src')).toBe(url(pickPenKeyboardEntry(PEN, s)))
      expect(kb.className).toBe('layer')
      expect(imgs.some(i => (i.getAttribute('src') ?? '').startsWith('u:pen'))).toBe(false)
      expect(imgs.some(i => (i.getAttribute('src') ?? '').startsWith('u:kb_down'))).toBe(false)
      unmount()
    }
    const plain: Array<[MachineState, string]> = [
      [st(), 'u:kb_up'],
      [st({ kbDown: true, heldCount: 1, kbFrame: 1 }), 'u:kb_down_1'],
      [st({ kbDown: true, heldCount: 1, specialHeld: ['space'] }), 'u:key_space'],
    ]
    for (const [s, src] of plain) {
      const { kb, imgs, unmount } = renderStack(PARTIAL, s)
      expect(kb.getAttribute('src')).toBe(src)
      expect(kb.getAttribute('src')).toBe(url(pickKeyboardEntry(PARTIAL, s)))
      expect(imgs.some(i => (i.getAttribute('src') ?? '').startsWith('u:pen'))).toBe(false)
      unmount()
    }
  })
})

describe('CR-042 회귀 ① pickPenEntry (design.md §10.12 손 그림·남은 옛 파일, design/functions.md §5.5 CR-042 pickPenEntry)', () => {
  it('TC-252: 누름 없음 → pen_up, 키·클릭·특수 키 7종·반복 누름 모두 pen_down_0 — kbFrame 0·1·2 무관, 옛 pen_down_1·pen_key_* 등록돼 있어도', () => {
    const down0 = findByKey(OLD, 'pen_down_0')
    expect(down0).toBeDefined()
    expect(url(pickPenEntry(OLD, st()))).toBe('u:pen_up')
    expect(url(pickPenEntry(OLD, st({ kbFrame: 1 })))).toBe('u:pen_up')
    const pressed: MachineState[] = [
      ...[0, 1, 2].map(kbFrame => st({ kbDown: true, heldCount: 1, kbFrame })),
      ...SPECIAL_KEYS.map(s => st({ kbDown: true, heldCount: 1, kbFrame: 1, specialHeld: [s] })),
      st({ kbDown: true, heldCount: 2, kbFrame: 1, specialHeld: ['space', 'enter'] }),
      st({ clickHeld: ['left'], kbFrame: 1 }),
      st({ clickHeld: ['left', 'right'], kbFrame: 0 }),
      st({ kbDown: true, heldCount: 1, kbFrame: 1, specialHeld: ['space'], clickHeld: ['right'] }),
      st({ kbDown: true, heldCount: 1, kbFrame: 1, specialHeld: ['z'], repeating: true }),
    ]
    for (const s of pressed) expect(pickPenEntry(OLD, s)).toBe(down0)
    // 상태기계가 kbFrame 1을 내는 설정(kbFrames 2)이어도 손 그림은 pen_down_0
    const cfg2: MachineConfig = { idleMs: 300_000, kbFrames: 2, clickPress: true }
    const k1 = reduce(st(), key(true, 1, null, T0 + 10), cfg2)
    expect(k1.kbFrame).toBe(1)
    expect(url(pickPenEntry(OLD, k1))).toBe('u:pen_down_0')
    const c1 = reduce(st(), btn('left', true, T0 + 10), cfg2)
    expect(c1.kbFrame).toBe(1)
    expect(url(pickPenEntry(OLD, c1))).toBe('u:pen_down_0')
    // 두 장 규격(TWO)도 같은 결과
    expect(url(pickPenEntry(TWO, st({ kbDown: true, heldCount: 1, specialHeld: ['enter'] })))).toBe('u:pen_down_0')
  })
})

describe('CR-042 회귀 ② pickPenKeyboardEntry (design.md §10.12 키보드 레이어·동작 표 1~13, design/functions.md §5.5 CR-042)', () => {
  const run = (m: AssetManifest, inputs: MachineInput[]) => {
    const states = inputs.reduce<MachineState[]>((acc, i) => [...acc, reduce(acc[acc.length - 1], i, PEN_CFG)], [st()])
    return states.map(s => url(pickPenKeyboardEntry(m, s)))
  }

  it('TC-253: 동작 표 1~13행 키보드 열 — 특수 키 누름 중에만 key_*(등록 시), 일반 키·클릭·key_enter 미등록 = kb_up, 이전 특수 키 복귀, kb_down 안 씀', () => {
    // 1~3: 없음 / a 누름 / a 뗌
    expect(run(TABLE, [key(true, 1, null, T0 + 1), key(false, 0, null, T0 + 2)])).toEqual(['u:kb_up', 'u:kb_up', 'u:kb_up'])
    // 4·5: 스페이스 누름 / 뗌
    expect(run(TABLE, [key(true, 1, 'space', T0 + 1), key(false, 0, 'space', T0 + 2)])).toEqual([
      'u:kb_up',
      'u:key_space',
      'u:kb_up',
    ])
    // 6: Enter 누름(key_enter 없음) / 뗌
    expect(run(TABLE, [key(true, 1, 'enter', T0 + 1), key(false, 0, 'enter', T0 + 2)])).toEqual([
      'u:kb_up',
      'u:kb_up',
      'u:kb_up',
    ])
    // 7·8: a 누른 채 스페이스 → 스페이스만 뗌(a 눌림) → a 뗌
    expect(
      run(TABLE, [key(true, 1, null, T0 + 1), key(true, 2, 'space', T0 + 2), key(false, 1, 'space', T0 + 3), key(false, 0, null, T0 + 4)]),
    ).toEqual(['u:kb_up', 'u:kb_up', 'u:key_space', 'u:kb_up', 'u:kb_up'])
    // 9: 왼 클릭만(kbDown false)
    expect(run(TABLE, [btn('left', true, T0 + 1), btn('left', false, T0 + 2)])).toEqual(['u:kb_up', 'u:kb_up', 'u:kb_up'])
    // 10: 스페이스 누른 채 왼 클릭 → 스페이스 뗌(클릭 유지) → 클릭 뗌
    expect(
      run(TABLE, [key(true, 1, 'space', T0 + 1), btn('left', true, T0 + 2), key(false, 0, 'space', T0 + 3), btn('left', false, T0 + 4)]),
    ).toEqual(['u:kb_up', 'u:key_space', 'u:key_space', 'u:kb_up', 'u:kb_up'])
    // 11·12: 왼 클릭 누른 채 스페이스 → 스페이스만 뗌(클릭 유지) → 클릭 뗌
    expect(
      run(TABLE, [btn('left', true, T0 + 1), key(true, 1, 'space', T0 + 2), key(false, 0, 'space', T0 + 3), btn('left', false, T0 + 4)]),
    ).toEqual(['u:kb_up', 'u:kb_up', 'u:key_space', 'u:kb_up', 'u:kb_up'])
    // 13: 스페이스 꾹 누름(자동 반복 ×2) → 뗌
    expect(
      run(TABLE, [
        key(true, 1, 'space', T0 + 1),
        key(true, 1, 'space', T0 + 600, true),
        key(true, 1, 'space', T0 + 650, true),
        key(false, 0, 'space', T0 + 700),
      ]),
    ).toEqual(['u:kb_up', 'u:key_space', 'u:key_space', 'u:key_space', 'u:kb_up'])
    // 이전 특수 키 복귀(design.md §10.6 5행): key_enter 등록(PEN) — 스페이스 → Enter → Enter 뗌 → 스페이스 뗌
    expect(
      run(PEN, [key(true, 1, 'space', T0 + 1), key(true, 2, 'enter', T0 + 2), key(false, 1, 'enter', T0 + 3), key(false, 0, 'space', T0 + 4)]),
    ).toEqual(['u:kb_up', 'u:key_space', 'u:key_enter', 'u:key_space', 'u:kb_up'])
    // 가장 최근 특수 키(enter) 그림이 없으면 앞선 space가 아니라 kb_up, Enter를 떼면 space 그림으로 복귀
    expect(run(TABLE, [key(true, 1, 'space', T0 + 1), key(true, 2, 'enter', T0 + 2), key(false, 1, 'enter', T0 + 3)])).toEqual([
      'u:kb_up',
      'u:key_space',
      'u:kb_up',
      'u:key_space',
    ])
    // kb_down 안 씀: 같은 누름 상태에서 비펜 pickKeyboardEntry는 kb_down_0
    const pressed = reduce(st(), key(true, 1, null, T0 + 1), PEN_CFG)
    expect(url(pickKeyboardEntry(TABLE, pressed))).toBe('u:kb_down_0')
    expect(url(pickPenKeyboardEntry(TABLE, pressed))).toBe('u:kb_up')
    // 특수 키 7종 — 등록된 key_*(PEN: space·enter)만 그 그림, 나머지는 kb_up
    for (const s of SPECIAL_KEYS) {
      const want = s === 'space' || s === 'enter' ? `u:key_${s}` : 'u:kb_up'
      expect(url(pickPenKeyboardEntry(PEN, st({ kbDown: true, heldCount: 1, specialHeld: [s] })))).toBe(want)
    }
  })
})

describe('CR-042 회귀 ③ LayerStack penMode 분기 (design/functions.md §5.5 CR-042 LayerStack 렌더, design.md §10.12)', () => {
  it('TC-254: penMode true = pickPenKeyboardEntry, false = pickKeyboardEntry — 같은 키보드 img 노드의 src만 바뀜, 켜짐에서 kb_down 없음', () => {
    const cases: Array<[MachineState, string]> = [
      [st(), 'u:kb_up'],
      [st({ kbDown: true, heldCount: 1, kbFrame: 1 }), 'u:kb_up'],
      [st({ kbDown: true, heldCount: 1, kbFrame: 2, specialHeld: ['space'] }), 'u:key_space'],
      [st({ kbDown: true, heldCount: 2, kbFrame: 1, specialHeld: ['space', 'enter'] }), 'u:kb_up'],
      [st({ clickHeld: ['left'], kbFrame: 1 }), 'u:kb_up'],
      [st({ layer: 'rest' }), 'u:kb_up'],
    ]
    for (const [s, penSrc] of cases) {
      const r = render(<LayerStack manifest={TABLE} machine={s} penMode />)
      const imgs = () => Array.from(r.container.querySelectorAll('img'))
      const kb = imgs()[imgs().length - 1]
      expect(kb.getAttribute('src')).toBe(penSrc)
      expect(kb.getAttribute('src')).toBe(url(pickPenKeyboardEntry(TABLE, s)))
      expect(imgs().some(i => (i.getAttribute('src') ?? '').startsWith('u:kb_down'))).toBe(false)
      r.rerender(<LayerStack manifest={TABLE} machine={s} penMode={false} />)
      expect(imgs()[imgs().length - 1]).toBe(kb)
      expect(kb.getAttribute('src')).toBe(url(pickKeyboardEntry(TABLE, s)))
      r.rerender(<LayerStack manifest={TABLE} machine={s} penMode />)
      expect(imgs()[imgs().length - 1]).toBe(kb)
      expect(kb.getAttribute('src')).toBe(penSrc)
      expect(kb.className).toBe('layer')
      expect(imgs().map(i => i.getAttribute('src')).slice(0, 2)).toEqual(['u:body', s.layer === 'rest' ? 'u:rest' : 'u:idle'])
      expect(imgs().some(i => (i.getAttribute('src') ?? '').startsWith('u:pen'))).toBe(false)
      r.unmount()
    }
    // 대조: 같은 일반 키 누름이 꺼짐에서는 순환 그림 kb_down_1
    expect(url(pickKeyboardEntry(TABLE, st({ kbDown: true, heldCount: 1, kbFrame: 1 })))).toBe('u:kb_down_1')
  })
})
