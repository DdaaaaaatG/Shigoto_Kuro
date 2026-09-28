/**
 * 「이미지 설정」 탭 슬롯 카탈로그 순수 모듈 스펙 — CR-028 · R-25.
 * 기준: src/settings/design/images-tab.md §3(예 2건 포함) · contract v0.14 §3.1 `REQUIRED_SLOTS`·`isRequiredSlot`·`slotKey`
 *       · scenarios.md TC-132 ~ TC-135 · 수용 기준 U-6.
 *       (CR-035, requirements v1.10 R-32·R-33 · contract v0.16 `hasBuiltinDefault`·`ExportReport`)
 *       TC-133·TC-135 개정(canClear → canReset + resetKind), TC-177(slotCard 검증 예 4건)·TC-178(exportResult) 신규.
 *       (CR-038, 확정사항 §6 「배포용 기본 세트 교체」 · bridge/types v0.18 `DEFAULT_ASSET_SLOTS` 7개)
 *       TC-133·TC-177·TC-178·TC-192 개정 — hair 는 복원 칸, idle·rest·key_* 7장은 비우기 칸. scenarios.md 「CR-038 개정」 절.
 *       (CR-042, requirements v1.15 R-39 · images-tab §3.2 — 손(펜) 그룹 = pen_up·pen_down_0 2장, AddCardSpec = kb_down 만,
 *       frameCount kind = 'kb_down' 만) TC-132·TC-134·TC-135·TC-177·TC-192 개정, TC-226 신규. scenarios.md 「CR-042 개정」 절.
 *       (CR-043, requirements v1.17 R-40·R-41 · images-tab §3.3·§12 · contract v0.19 `REQUIRED_SLOTS` = kb_up·mouse_base)
 *       TC-133·TC-134·TC-135·TC-192 개정(필수 3장 → 2장 — kb_down_0 은 선택), TC-229(§3.3 ①②)·TC-232(§12.5 ①②) 신규.
 *       scenarios.md 「CR-043 개정」 절.
 *       (CR-044, 확정사항 §6 「배포용 기본 세트 2차 교체」 🔒 · contract v0.20 `DEFAULT_ASSET_SLOTS` 6개 — hair 기본 없음)
 *       TC-133·TC-177·TC-192 개정. scenarios.md 「CR-044 개정」 절.
 *       (CR-053, 확정사항 CR-053 줄 「배포용 기본 세트 3차」 🔒 · contract v0.24 `DEFAULT_ASSET_SLOTS` 7개 —
 *       kb_up·background·hair·pomo_char·mouse_base·pen_up·pen_down_0, kb_down_0 제외 · images-tab §15.1)
 *       TC-133·TC-135·TC-177·TC-192·TC-229·TC-232 개정(hair·pomo_char = 복원 칸 + 「비우기」 칸, kb_down_0 = 비우기 칸·마지막 장 규칙,
 *       EMPTYABLE_SLOT_KEYS = ['hair','pomo_char']), TC-178 픽스처 연동(DEFAULT_FILES 7장). scenarios.md 「CR-053 개정」 절.
 * bridge/types 의 isRequiredSlot·hasBuiltinDefault 는 실물(목록을 화면에 다시 적지 않는다).
 */
import { describe, expect, it } from 'vitest'
import type { AssetEntry, AssetManifest, AssetSlot, ExportReport } from 'bridge/types'
import { REQUIRED_SLOTS, hasBuiltinDefault, isRequiredSlot, slotKey } from 'bridge/types'
import {
  EMPTYABLE_SLOT_KEYS,
  SPECIAL_KEY_ORDER,
  buildSlotGroups,
  exportResult,
  findEntry,
  frameCount,
  slotCard,
  type CardSpec,
  type SlotCardSpec,
} from '../imageSlots'

const CANVAS = { width: 900, height: 700 }
const entry = (slot: AssetSlot, w = 900, h = 700): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width: w,
  height: h,
  bytes: 1000,
  url: `asset://${slotKey(slot)}.png`,
})
const kbDown = (index: number): AssetSlot => ({ kind: 'kb_down', index })
const penDown = (index: number): AssetSlot => ({ kind: 'pen_down', index })
const EMPTY: AssetManifest = { canvas: null, entries: [] }
const KB3: AssetManifest = {
  canvas: CANVAS,
  entries: [entry('kb_up'), entry(kbDown(0)), entry(kbDown(1))],
}
const KEYS = SPECIAL_KEY_ORDER.map(k => `key_${k}`)
/** CR-042(R-39, images-tab §3.2): 손(펜) 그룹 = 두 장. 옛 PEN_KEYS(pen_key_* 7장)는 카드가 없어 삭제 */
const HAND = ['pen_up', 'pen_down_0']
/** CR-043(R-40, contract v0.19): 필수 카드 = 2장. kb_down_0 은 선택으로 강등(옛 ['kb_up', 'kb_down_0', 'mouse_base']) */
const REQUIRED_KEYS = ['kb_up', 'mouse_base']

const keysOf = (cards: CardSpec[]) => cards.map(c => c.key)
const slotSpec = (cards: CardSpec[], key: string) =>
  cards.find((c): c is SlotCardSpec => c.type === 'slot' && c.key === key)
/** 빈 매니페스트의 카드 스펙(buildSlotGroups 가 넘기는 frames 와 같은 값) */
const emptySpec = (key: string) => slotSpec(buildSlotGroups(EMPTY).flatMap(g => g.cards), key)
/** 매니페스트 전체 카드 중 slot 카드만 */
const slotSpecs = (m: AssetManifest) =>
  buildSlotGroups(m)
    .flatMap(g => g.cards)
    .filter((c): c is SlotCardSpec => c.type === 'slot')

/**
 * 내장 기본 7장 파일명 — CR-053(확정사항 CR-053 줄 3차, contract v0.24: hair·pomo_char 추가, kb_down_0 제외.
 * CR-044 6장 · CR-038 7장(kb_down_0·hair) · CR-035 15장 대체). bridge 상수 DEFAULT_ASSET_SLOTS 를 베끼지 않은 리터럴(독립 대조).
 */
const DEFAULT_FILES = ['kb_up', 'background', 'hair', 'pomo_char', 'mouse_base', 'pen_up', 'pen_down_0'].map(
  k => `${k}.png`,
)
/**
 * CR-038 기본 7장(kb_down_0·hair 포함)이 채워진 매니페스트 — 이제는 「사용자가 kb_down_0 을 넣은 설치」 예로만 쓴다
 * (필수 판정 TC-229). CR-053 첫 실행 매니페스트는 FIRST7.
 */
const DEFAULT7: AssetManifest = {
  canvas: CANVAS,
  entries: [
    entry('kb_up'),
    entry(kbDown(0)),
    entry('background'),
    entry('hair'),
    entry('mouse_base', 171, 199),
    entry('pen_up', 136, 196),
    entry(penDown(0), 136, 196),
  ],
}
/** CR-053 첫 실행(시딩 7장 — kb_down_0 없음, mouse_base 168×150·pen_down_0 143×189) */
const FIRST7: AssetManifest = {
  canvas: CANVAS,
  entries: [
    entry('kb_up'),
    entry('background'),
    entry('hair'),
    entry('pomo_char'),
    entry('mouse_base', 168, 150),
    entry('pen_up', 143, 189),
    entry(penDown(0), 143, 189),
  ],
}

describe('imageSlots (images-tab.md §3)', () => {
  it('TC-132 (CR-042 개정): SPECIAL_KEY_ORDER · findEntry(객체 슬롯은 slotKey 로 비교) · frameCount(kind 는 kb_down 만)', () => {
    expect([...SPECIAL_KEY_ORDER]).toEqual([
      'space',
      'z',
      'question',
      'exclamation',
      'enter',
      'backspace',
      'undo',
    ])
    expect(findEntry(KB3, kbDown(1))?.fileName).toBe('kb_down_1.png')
    expect(findEntry(KB3, 'kb_up')?.fileName).toBe('kb_up.png')
    expect(findEntry(KB3, 'idle')).toBeUndefined()
    expect(findEntry(KB3, penDown(0))).toBeUndefined() // pen_down_0 ≠ kb_down_0
    expect(frameCount(EMPTY, 'kb_down')).toBe(0)
    expect(frameCount(KB3, 'kb_down')).toBe(2)
    // CR-042: frameCount 의 kind 는 'kb_down' 만(images-tab §3.2 frameCount 행) — 옛 frameCount(…, 'pen_down') 단언 삭제
    const gap: AssetManifest = { canvas: CANVAS, entries: [entry(kbDown(0)), entry(kbDown(2))] }
    expect(frameCount(gap, 'kb_down')).toBe(3) // index 최댓값 + 1
  })

  it('TC-133 (CR-035·CR-038·CR-043·CR-044·CR-053 개정): slotCard — 필수 판정은 isRequiredSlot(kb_down_0 은 선택), resetKind = hasBuiltinDefault, 복원 칸(hair·pomo_char 포함)은 늘 canReset, 비우기 칸(kb_down_0 포함)만 마지막 장 규칙', () => {
    const up = slotCard(KB3, 'kb_up', 'kb_up', null)
    expect(up).toMatchObject({
      type: 'slot',
      key: 'kb_up',
      msg: 'kb_up',
      n: null,
      required: true,
      resetKind: 'restore',
      canReset: true,
      lastOnlyBlocked: false,
    })
    expect('canClear' in up).toBe(false) // 옛 필드 이름은 canReset 으로 바뀌었다
    // CR-053: kb_down_0 은 내장 기본이 빠져 비우기 칸 — 가운데 장이면 비활성·툴팁(CR-035 이전 옛 규칙으로 돌아감)
    expect(slotCard(KB3, kbDown(0), 'kb_down', 2)).toMatchObject({
      key: 'kb_down_0',
      n: 1,
      required: false, // CR-043(R-40)
      resetKind: 'clear', // CR-053: CR-035 ~ CR-044 'restore' 대체
      canReset: false, // 뒤 장(kb_down_1)이 있다
      lastOnlyBlocked: true,
    })
    expect(slotCard(KB3, kbDown(1), 'kb_down', 2)).toMatchObject({
      key: 'kb_down_1',
      n: 2,
      required: false,
      resetKind: 'clear',
      canReset: true,
      lastOnlyBlocked: false,
    })
    // CR-038: idle 은 내장 기본이 빠져 비우기 칸 — 미등록이면 canReset false
    const idle = slotCard(KB3, 'idle', 'idle', null)
    expect(idle).toMatchObject({ required: false, resetKind: 'clear', canReset: false, lastOnlyBlocked: false, n: null })
    expect(idle.entry).toBeUndefined()
    // 미등록 선택 복원 칸 예(CR-038) — background 는 비어 있어도 canReset true
    const bg = slotCard(KB3, 'background', 'background', null)
    expect(bg).toMatchObject({ required: false, resetKind: 'restore', canReset: true, lastOnlyBlocked: false, n: null })
    expect(bg.entry).toBeUndefined()
    // CR-053: hair·pomo_char 는 내장 기본이 생겨 복원 칸 — 미등록이어도 canReset true(CR-044·CR-045 기대 clear·false 대체)
    for (const key of ['hair', 'pomo_char'] as const) {
      const s = slotCard(KB3, key, key, null)
      expect(s, key).toMatchObject({ required: false, resetKind: 'restore', canReset: true, lastOnlyBlocked: false, n: null })
      expect(s.entry, key).toBeUndefined()
    }
    // pomo_bubble 은 변경 없음 — 비우기 칸, 미등록이면 false
    expect(slotCard(KB3, 'pomo_bubble', 'pomo_bubble', null)).toMatchObject({ resetKind: 'clear', canReset: false })
    const emptyDown = slotCard(EMPTY, kbDown(0), 'kb_down', 0)
    // CR-053: 빈 kb_down_0 = 빈 비우기 칸 → canReset false(CR-043 「복원 칸·true」 대체)
    expect(emptyDown).toMatchObject({ required: false, resetKind: 'clear', canReset: false, lastOnlyBlocked: false, n: 1 })
    expect(slotCard(EMPTY, 'mouse_base', 'mouse_base', null).required).toBe(true)
    expect(slotCard(EMPTY, 'pen_up', 'pen_up', null).required).toBe(false)
  })

  it('TC-134 (CR-037·CR-042·CR-043 개정): buildSlotGroups(빈 매니페스트) — 그룹 4개·배경 그룹 2장·손 그룹 2장·카드 18장·필수 2장·추가 카드 없음·body 카드 없음', () => {
    const groups = buildSlotGroups(EMPTY)
    expect(groups.map(g => g.id)).toEqual(['background', 'keyboard', 'arm', 'hand'])
    expect(keysOf(groups[0].cards)).toEqual(['background', 'hair', 'pomo_char', 'pomo_bubble']) // CR-037: 옛 ['background'] 대체
    expect(keysOf(groups[1].cards)).toEqual(['kb_up', 'kb_down_0', 'idle', 'rest', ...KEYS])
    expect(groups[1].cards).toHaveLength(11)
    expect(keysOf(groups[2].cards)).toEqual(['mouse_base', 'mouse_left', 'mouse_right'])
    expect(keysOf(groups[3].cards)).toEqual(HAND) // CR-042: 옛 ['pen_up', 'pen_down_0', ...pen_key_* 7]
    const all = groups.flatMap(g => g.cards)
    expect(all).toHaveLength(20) /* CR-045: + pomo_char·pomo_bubble */ // CR-042: 배경 2 + 키보드 11 + 팔 3 + 손 2(옛 25)
    expect(all.every(c => c.type === 'slot')).toBe(true)
    expect(keysOf(all)).not.toContain('body')
    expect(
      all.filter((c): c is SlotCardSpec => c.type === 'slot' && c.required).map(c => c.key),
    ).toEqual(REQUIRED_KEYS) // CR-043: 옛 ['kb_up', 'kb_down_0', 'mouse_base']
    expect(slotSpec(all, 'kb_down_0')).toMatchObject({ msg: 'kb_down', n: 1, required: false })
    expect(slotSpec(all, 'pen_down_0')).toMatchObject({ msg: 'pen_down', n: 1 })
    expect(slotSpec(all, 'key_undo')).toMatchObject({ msg: 'key_undo', n: null })
  })

  it('TC-135 (CR-035·CR-042·CR-043·CR-053 개정): buildSlotGroups(여러 장) — design 예: 키보드 13장·추가 카드 다음 index·kb_down_0(가운데 장)은 비우기 칸이라 잠김·손 그룹은 pen_down_0 이 있어도 2장(추가 카드 없음)·body 등록돼 있어도 카드 없음', () => {
    const manifest: AssetManifest = {
      canvas: CANVAS,
      entries: [
        entry('body'),
        ...KB3.entries,
        entry('pen_up', 100, 80),
        entry(penDown(0), 100, 80),
      ],
    }
    const groups = buildSlotGroups(manifest)
    const kb = groups[1].cards
    expect(keysOf(kb)).toEqual([
      'kb_up',
      'kb_down_0',
      'kb_down_1',
      'kb_down_2',
      'idle',
      'rest',
      ...KEYS,
    ])
    expect(kb).toHaveLength(13)
    expect(slotSpec(kb, 'kb_up')).toMatchObject({ required: true, resetKind: 'restore', canReset: true })
    expect(slotSpec(kb, 'kb_down_0')).toMatchObject({
      required: false, // CR-043(R-40)
      resetKind: 'clear', // CR-053: 'restore' 대체
      canReset: false,
      lastOnlyBlocked: true, // 뒤 장 kb_down_1 이 먼저
    })
    expect(slotSpec(kb, 'kb_down_1')).toMatchObject({
      required: false,
      resetKind: 'clear',
      canReset: true,
      lastOnlyBlocked: false,
    })
    expect(kb[3]).toStrictEqual({ type: 'add', slot: kbDown(2), key: 'kb_down_2', msg: 'addKbDown' })
    const hand = groups[3].cards
    // CR-042: 옛 ['pen_up', 'pen_down_0', 'pen_down_1'(추가 카드 addPenDown), ...pen_key_* 7] 대체
    expect(keysOf(hand)).toEqual(HAND)
    expect(hand.every(c => c.type === 'slot')).toBe(true)
    expect(slotSpec(hand, 'pen_down_0')).toMatchObject({ resetKind: 'restore', canReset: true, lastOnlyBlocked: false })
    expect(keysOf(groups.flatMap(g => g.cards))).not.toContain('body')
  })

  it('TC-177 (CR-038·CR-042·CR-044·CR-053 개정): slotCard 검증 예 4건(images-tab §3·§15.1) — 복원 칸은 늘 활성, 비우기 칸(kb_down_0 포함)은 옛 규칙, resetKind 는 hasBuiltinDefault 와 같다', () => {
    // 예 1: 빈 매니페스트
    expect(emptySpec('background')).toMatchObject({ resetKind: 'restore', canReset: true, lastOnlyBlocked: false })
    expect(emptySpec('mouse_left')).toMatchObject({ resetKind: 'clear', canReset: false, lastOnlyBlocked: false })
    // 예 2: kb_down_0, kb_down_1 만 — CR-053 §15.1 검증 예 끝 행(kb_down_0 잠김·kb_down_1 활성)
    const two: AssetManifest = { canvas: CANVAS, entries: [entry(kbDown(0)), entry(kbDown(1))] }
    expect(slotCard(two, kbDown(0), 'kb_down', 2)).toMatchObject({
      resetKind: 'clear', // CR-053: 'restore'·true 대체
      canReset: false,
      lastOnlyBlocked: true,
    })
    expect(slotCard(two, kbDown(1), 'kb_down', 2)).toMatchObject({ resetKind: 'clear', canReset: true })
    // 예 3: kb_down_0, kb_down_1, kb_down_2
    const three: AssetManifest = { canvas: CANVAS, entries: [entry(kbDown(0)), entry(kbDown(1)), entry(kbDown(2))] }
    expect(slotCard(three, kbDown(0), 'kb_down', 3)).toMatchObject({
      resetKind: 'clear',
      canReset: false,
      lastOnlyBlocked: true,
    })
    expect(slotCard(three, kbDown(1), 'kb_down', 3)).toMatchObject({
      resetKind: 'clear',
      canReset: false,
      lastOnlyBlocked: true,
    })
    expect(slotCard(three, kbDown(2), 'kb_down', 3)).toMatchObject({
      resetKind: 'clear',
      canReset: true,
      lastOnlyBlocked: false,
    })
    // 예 4: 빈 매니페스트의 복원 칸 7개·비우기 칸 5개
    // (CR-053: hair·pomo_char 는 비우기 → 복원, kb_down_0 은 복원 → 비우기, pomo_bubble 은 비우기 그대로)
    for (const key of ['pen_up', 'pen_down_0', 'mouse_base', 'kb_up', 'background', 'hair', 'pomo_char']) {
      expect(emptySpec(key), key).toMatchObject({ resetKind: 'restore', canReset: true, lastOnlyBlocked: false })
    }
    for (const key of ['mouse_right', 'key_space', 'idle', 'kb_down_0', 'pomo_bubble']) {
      expect(emptySpec(key), key).toMatchObject({ resetKind: 'clear', canReset: false, lastOnlyBlocked: false })
    }
    expect(emptySpec('pen_key_space')).toBeUndefined() // CR-042: 손 특수 키 카드 없음(옛 비우기 칸 예)
    // resetKind 의 출처는 bridge 상수 — 20장 모두 hasBuiltinDefault 와 일치, 복원 칸 7장(CR-053, CR-044 6장·CR-038 7장·옛 15장)
    const all = buildSlotGroups(EMPTY)
      .flatMap(g => g.cards)
      .filter((c): c is SlotCardSpec => c.type === 'slot')
    expect(all).toHaveLength(20) /* CR-045: + pomo_char·pomo_bubble */ // CR-042(옛 25)
    for (const c of all) expect(c.resetKind, c.key).toBe(hasBuiltinDefault(c.slot) ? 'restore' : 'clear')
    expect(all.filter(c => c.resetKind === 'restore').map(c => `${c.key}.png`).sort()).toEqual([...DEFAULT_FILES].sort())
  })

  it('TC-178 (CR-038·CR-044·CR-053 픽스처 연동): exportResult — 실패 없음 = done(written 수), 실패 있음 = partial(ok·실패 파일명), 충돌 판정은 하지 않는다', () => {
    const done: ExportReport = { written: DEFAULT_FILES, conflicts: [], failed: [] }
    expect(exportResult(done)).toStrictEqual({ kind: 'done', count: 7 }) // CR-053: 내장 기본 7장(CR-044 6 · CR-038 7 · 옛 15)
    const partial: ExportReport = {
      written: ['a.png'],
      conflicts: [],
      failed: [{ fileName: 'kb_up.png', code: 'asset.io' }],
    }
    expect(exportResult(partial)).toStrictEqual({ kind: 'partial', ok: 1, failed: ['kb_up.png'] })
    // §3 「충돌 판정은 하지 않는다(호출자 몫)」 — conflicts 만 있으면 done·0장으로 옮길 뿐
    expect(exportResult({ written: [], conflicts: ['kb_up.png'], failed: [] })).toStrictEqual({ kind: 'done', count: 0 })
  })

  // ─── CR-037 · R-34 헤어(뒷머리) — images-tab §3 buildSlotGroups ①·검증 예 · §15.1(CR-053) ───
  // CR-038: 복원 칸 → CR-044: 비우기 칸(M-2 emptyable false) → CR-053: 다시 복원 칸 + 「비우기」 칸(emptyable true, canEmpty = 등록).
  it('TC-192 (CR-038·CR-042·CR-043·CR-044·CR-053 개정): 배경 그룹 = [background, hair, pomo_char, pomo_bubble] — hair 는 단일·선택·복원 칸(내장 기본 있음)·「비우기」 칸, canReset 늘 true, emptyable true·canEmpty = 등록, 다른 그룹 불변', () => {
    expect(hasBuiltinDefault('hair')).toBe(true) // bridge 상수(v0.24, CR-053 — CR-044 v0.20 false 대체) — 화면이 다시 적지 않는다
    // ① 빈 매니페스트
    const emptyGroups = buildSlotGroups(EMPTY)
    expect(emptyGroups[0].id).toBe('background')
    expect(keysOf(emptyGroups[0].cards)).toEqual(['background', 'hair', 'pomo_char', 'pomo_bubble'])
    expect(emptyGroups[0].cards[1]).toStrictEqual({
      type: 'slot',
      slot: 'hair',
      key: 'hair',
      msg: 'hair',
      n: null,
      entry: undefined,
      required: false,
      resetKind: 'restore', // CR-053: CR-044 'clear' 대체
      canReset: true, // 복원 칸 — 빈 칸이어도 활성
      lastOnlyBlocked: false,
      emptyable: true, // CR-053: EMPTYABLE_SLOT_KEYS = ['hair','pomo_char'] — CR-044 M-2 false 대체
      canEmpty: false, // 비울 것이 없다
    })
    expect(slotCard(EMPTY, 'hair', 'hair', null)).toStrictEqual(emptyGroups[0].cards[1])
    expect(slotSpec(emptyGroups[0].cards, 'background')).toMatchObject({ emptyable: false, canEmpty: false })
    // ② hair 등록됨(배경 없이도 — 캔버스 판정은 core 몫)
    const hairEntry = entry('hair')
    const withHair: AssetManifest = { canvas: CANVAS, entries: [hairEntry] }
    const groups = buildSlotGroups(withHair)
    expect(keysOf(groups[0].cards)).toEqual(['background', 'hair', 'pomo_char', 'pomo_bubble'])
    expect(slotSpec(groups[0].cards, 'hair')).toMatchObject({
      entry: hairEntry,
      required: false,
      resetKind: 'restore',
      canReset: true,
      lastOnlyBlocked: false,
      n: null,
      emptyable: true,
      canEmpty: true, // 등록됨 → 「비우기」 활성
    })
    expect(slotSpec(groups[0].cards, 'background')).toMatchObject({
      entry: undefined,
      resetKind: 'restore',
      canReset: true,
      emptyable: false, // 배경 카드는 늘 false
      canEmpty: false,
    })
    // 다른 그룹의 카드 수·순서 불변(키보드 11 · 팔 3 · 손 2 — CR-042), 필수 2장(CR-043)
    expect(keysOf(groups[1].cards)).toEqual(['kb_up', 'kb_down_0', 'idle', 'rest', ...KEYS])
    expect(keysOf(groups[2].cards)).toEqual(['mouse_base', 'mouse_left', 'mouse_right'])
    expect(keysOf(groups[3].cards)).toEqual(HAND)
    const all = groups.flatMap(g => g.cards).filter((c): c is SlotCardSpec => c.type === 'slot')
    expect(all.filter(c => c.required).map(c => c.key)).toEqual(REQUIRED_KEYS)
    expect(all.filter(c => c.key === 'hair')).toHaveLength(1) // 1장 고정 — 추가 카드 없음
  })

  // ─── CR-042 · R-39 손(펜) 그룹 단순화 — images-tab §3.2 표·「남은 옛 파일」 줄 ───
  it('TC-226: 손 그룹 = [pen_up, pen_down_0] 2장 — 빈·옛 파일(pen_down_1·pen_down_2·pen_key_space) 남은 매니페스트 모두, pen_down_0 = msg pen_down·n 1·복원 칸, 추가 카드는 키보드(addKbDown)뿐', () => {
    /** 옛 설정 창에서 등록해 둔 pen_down_1+·pen_key_* 파일이 남은 매니페스트(무시 대상 — 지울 수 없음, 수용) */
    const OLD: AssetManifest = {
      canvas: CANVAS,
      entries: [
        entry('kb_up'),
        entry(kbDown(0)),
        entry('pen_up', 100, 80),
        entry(penDown(0), 100, 80),
        entry(penDown(1), 100, 80),
        entry(penDown(2), 100, 80),
        entry('pen_key_space', 100, 80),
      ],
    }
    for (const m of [EMPTY, OLD]) {
      const groups = buildSlotGroups(m)
      expect(groups[3].id).toBe('hand')
      expect(keysOf(groups[3].cards)).toEqual(HAND)
      expect(groups[3].cards.every(c => c.type === 'slot')).toBe(true)
      const keys = keysOf(groups.flatMap(g => g.cards))
      expect(keys.filter(k => k.startsWith('pen_key_'))).toEqual([])
      expect(keys).not.toContain('pen_down_1')
      expect(keys).not.toContain('pen_down_2')
    }
    const hand = buildSlotGroups(OLD)[3].cards
    // frames = 1 → n = 1, 뒤에 pen_down_1 파일이 있어도 isLast 판정 대상 아님(restore 칸은 늘 활성)
    expect(slotSpec(hand, 'pen_down_0')).toMatchObject({
      msg: 'pen_down',
      n: 1,
      required: false,
      resetKind: 'restore',
      canReset: true,
      lastOnlyBlocked: false,
    })
    expect(slotSpec(hand, 'pen_down_0')?.entry?.fileName).toBe('pen_down_0.png')
    expect(slotSpec(hand, 'pen_up')).toMatchObject({
      msg: 'pen_up',
      n: null,
      resetKind: 'restore',
      canReset: true,
      lastOnlyBlocked: false,
    })
    expect(emptySpec('pen_down_0')).toMatchObject({
      msg: 'pen_down',
      n: 1,
      resetKind: 'restore',
      canReset: true,
      lastOnlyBlocked: false,
    })
    // AddCardSpec 는 kb_down·addKbDown 만 — OLD 는 kb_down_0 이 있어 키보드 추가 카드 1장뿐
    const adds = buildSlotGroups(OLD)
      .flatMap(g => g.cards)
      .filter(c => c.type === 'add')
    expect(adds).toStrictEqual([{ type: 'add', slot: kbDown(1), key: 'kb_down_1', msg: 'addKbDown' }])
    // 총 카드: 빈 = 18(배경 2 + 키보드 11 + 팔 3 + 손 2), OLD = 18 + 키보드 추가 카드 1
    expect(buildSlotGroups(EMPTY).flatMap(g => g.cards)).toHaveLength(20) /* CR-045: + pomo_char·pomo_bubble */
    expect(buildSlotGroups(OLD).flatMap(g => g.cards)).toHaveLength(21) /* CR-045: + pomo 2 */
  })

  // ─── CR-043 · R-40 타자 입력 1 선택 강등 — images-tab §3.3 예정 TC ①② · contract v0.19 ───
  it('TC-229 (CR-053 개정): 필수 판정 = bridge REQUIRED_SLOTS(kb_up·mouse_base 2개) — slotCard(kb_down_0) required false(빈·단일·가운데 장 모두, 칸 종류는 CR-053 비우기 칸), 빈·여러 장·첫 실행 매니페스트 모두 필수 카드 2장', () => {
    // bridge 상수 실물(v0.19) — 화면은 목록을 다시 적지 않는다(images-tab §3.3 「필수 판정 출처 불변」)
    expect(REQUIRED_SLOTS.map(slotKey)).toEqual(REQUIRED_KEYS)
    expect(isRequiredSlot(kbDown(0))).toBe(false)
    expect(isRequiredSlot('kb_up')).toBe(true)
    expect(isRequiredSlot('mouse_base')).toBe(true)
    // ① slotCard — kb_down_0 은 빈 칸·등록·뒤 장 있음 어느 경우든 선택. CR-053: 비우기 칸 규칙(등록된 마지막 장만 canReset)
    const cases: [AssetManifest, number, boolean, boolean][] = [
      [EMPTY, 0, false, false],
      [{ canvas: CANVAS, entries: [entry(kbDown(0))] }, 1, true, false],
      [KB3, 2, false, true],
    ]
    for (const [m, frames, canReset, lastOnlyBlocked] of cases) {
      expect(slotCard(m, kbDown(0), 'kb_down', frames), `frames ${frames}`).toMatchObject({
        key: 'kb_down_0',
        msg: 'kb_down',
        n: 1,
        required: false,
        resetKind: 'clear', // CR-053: 'restore' 대체
        canReset,
        lastOnlyBlocked,
      })
    }
    expect(slotCard(EMPTY, 'kb_up', 'kb_up', null).required).toBe(true)
    expect(slotCard(EMPTY, 'mouse_base', 'mouse_base', null).required).toBe(true)
    // ② buildSlotGroups — 어떤 매니페스트든 필수 카드 = [kb_up, mouse_base], 카드 수·순서 불변(빈 20장)
    for (const m of [EMPTY, KB3, DEFAULT7, FIRST7]) {
      expect(slotSpecs(m).filter(c => c.required).map(c => c.key)).toEqual(REQUIRED_KEYS)
      expect(slotSpecs(m).every(c => c.required === isRequiredSlot(c.slot))).toBe(true)
    }
    expect(slotSpecs(EMPTY)).toHaveLength(20) /* CR-045: + pomo_char·pomo_bubble */
    expect(slotSpecs(DEFAULT7).find(c => c.key === 'kb_down_0')).toMatchObject({ required: false, canReset: true })
    // CR-053 첫 실행 — kb_down_0 없음: 선택 칸·빈 비우기 칸(canReset false)
    expect(slotSpecs(FIRST7).find(c => c.key === 'kb_down_0')).toMatchObject({
      required: false,
      resetKind: 'clear',
      canReset: false,
      entry: undefined,
    })
  })

  // ─── CR-043 R-41 → CR-053 · 「비우기」 대상 칸 — images-tab §12.2(옛)·§15.1 검증 예 ───
  it('TC-232 (CR-044·CR-053 개정): EMPTYABLE_SLOT_KEYS = [hair, pomo_char] — 두 칸 emptyable 늘 true·canEmpty = 등록(§15.1 검증 예), kb_down_0 은 대상 아님(emptyable·canEmpty false, 「기본값」 = 비우기 칸 — 검증 예 4행 canReset·lastOnlyBlocked), kb_down_1+·추가 카드는 필드 없음·대상 아님', () => {
    // ② 상수 값 — CR-053(CR-044 ['kb_down_0'] · CR-043 ['hair','kb_down_0'] 대체)
    expect([...EMPTYABLE_SLOT_KEYS]).toEqual(['hair', 'pomo_char'])
    // ① §15.1 검증 예 — hair·pomo_char
    const both: AssetManifest = { canvas: CANVAS, entries: [entry('kb_up'), entry('hair'), entry('pomo_char')] }
    const hairOnly: AssetManifest = { canvas: CANVAS, entries: [entry('kb_up'), entry('hair')] }
    const pomoRows: [string, AssetManifest, boolean, boolean][] = [
      ['빈 매니페스트', EMPTY, false, false],
      ['두 칸 등록', both, true, true],
      ['hair 만', hairOnly, true, false],
    ]
    for (const [label, m, hairCan, pomoCan] of pomoRows) {
      for (const [key, can] of [
        ['hair', hairCan],
        ['pomo_char', pomoCan],
      ] as const) {
        const direct = slotCard(m, key, key, null)
        expect(direct, `${label} ${key}`).toMatchObject({
          emptyable: true,
          canEmpty: can,
          resetKind: 'restore',
          canReset: true,
          lastOnlyBlocked: false,
          required: false,
        })
        expect(slotSpecs(m).find(c => c.key === key), `${label} ${key}`).toStrictEqual(direct)
      }
      expect(slotSpecs(m).filter(c => c.emptyable).map(c => c.key), label).toEqual(['hair', 'pomo_char'])
    }
    expect(slotSpecs(both).filter(c => c.canEmpty).map(c => c.key)).toEqual(['hair', 'pomo_char'])
    expect(slotSpecs(hairOnly).filter(c => c.canEmpty).map(c => c.key)).toEqual(['hair'])
    expect(slotSpecs(EMPTY).filter(c => c.canEmpty).map(c => c.key)).toEqual([])
    // ③ kb_down_0 검증 예 4행 — 셋째 버튼 대상 아님, 「기본값」 = 비우기 칸(마지막 장 규칙)
    const rows: [string, AssetManifest, boolean, boolean][] = [
      ['없음', { canvas: CANVAS, entries: [entry('kb_up')] }, false, false],
      ['kb_down_0만', { canvas: CANVAS, entries: [entry('kb_up'), entry(kbDown(0))] }, true, false],
      ['kb_down_0·kb_down_1', { canvas: CANVAS, entries: [entry('kb_up'), entry(kbDown(0)), entry(kbDown(1))] }, false, true],
      ['kb_down_1만', { canvas: CANVAS, entries: [entry('kb_up'), entry(kbDown(1))] }, false, false],
    ]
    for (const [label, m, canReset, lastOnlyBlocked] of rows) {
      const direct = slotCard(m, kbDown(0), 'kb_down', frameCount(m, 'kb_down'))
      expect(direct, label).toMatchObject({
        key: 'kb_down_0',
        emptyable: false, // CR-053: CR-043·CR-044 true 대체
        canEmpty: false,
        required: false,
        resetKind: 'clear',
        canReset,
        lastOnlyBlocked,
      })
      expect(slotSpecs(m).find(c => c.key === 'kb_down_0'), label).toStrictEqual(direct)
    }
    expect(emptySpec('kb_down_0')).toMatchObject({ emptyable: false, canEmpty: false, canReset: false })
    // kb_down_1+ 카드도 대상 아님 — 기존 「기본값」(clear·마지막 장만) 그대로
    const three: AssetManifest = { canvas: CANVAS, entries: [entry(kbDown(0)), entry(kbDown(1)), entry(kbDown(2))] }
    for (const i of [0, 1, 2]) {
      expect(slotCard(three, kbDown(i), 'kb_down', 3), `kb_down_${i}`).toMatchObject({ emptyable: false, canEmpty: false })
    }
    // 그 밖의 카드(첫 실행 매니페스트 — 키보드·팔·손·배경·말풍선)는 false
    for (const c of slotSpecs(FIRST7).filter(s => s.key !== 'hair' && s.key !== 'pomo_char')) {
      expect(c, c.key).toMatchObject({ emptyable: false, canEmpty: false })
    }
    expect(slotSpecs(FIRST7).filter(c => c.canEmpty).map(c => c.key)).toEqual(['hair', 'pomo_char'])
    // 추가 카드(type 'add')에는 필드가 없다(§11.3)
    const adds = buildSlotGroups(three)
      .flatMap(g => g.cards)
      .filter(c => c.type === 'add')
    expect(keysOf(adds)).toEqual(['kb_down_3'])
    for (const a of adds) expect('emptyable' in a, a.key).toBe(false)
    // 비운 뒤 키보드 그룹 = 빈 매니페스트와 같은 구성 — kb_down_0 빈 카드, 추가 카드 없음
    const afterEmpty = buildSlotGroups({ canvas: CANVAS, entries: [entry('kb_up')] })[1].cards
    expect(keysOf(afterEmpty)).toEqual(keysOf(buildSlotGroups(EMPTY)[1].cards))
    expect(afterEmpty.every(c => c.type === 'slot')).toBe(true)
  })
})
