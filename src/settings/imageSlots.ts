/**
 * 「이미지 설정」 탭 슬롯 카탈로그 순수 모듈 — design/images-tab.md §3. 카드 목록·순서·필수 판정을 만든다.
 * 필수 판정은 계약 상수 `isRequiredSlot`(bridge)을 그대로 쓴다 — 여기서 필수 목록을 다시 적지 않는다.
 * (CR-042, R-39) 손(펜) 그룹은 `pen_up`·`pen_down_0` 두 칸만 만든다(§3.2) — `PenDownSlot`은 더 이상
 * 이 파일에서 쓰지 않는다(`AddCardSpec.slot`이 `KbDownSlot`만 남았다).
 */
import {
  hasBuiltinDefault,
  isRequiredSlot,
  slotKey,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type BridgeError,
  type ExportReport,
  type KbDownSlot,
  type SpecialKey,
} from 'bridge/types'
import type { SlotMessageKey } from './i18n/types'

export const SPECIAL_KEY_ORDER: readonly SpecialKey[] = [
  'space',
  'z',
  'question',
  'exclamation',
  'enter',
  'backspace',
  'undo',
]

export type SlotGroupId = 'background' | 'keyboard' | 'arm' | 'hand'

/** (CR-035) 'restore' = 내장 기본 그림이 있는 칸(항상 복원만) · 'clear' = 없는 칸(옛 비우기 규칙) */
export type ResetKind = 'restore' | 'clear'

/**
 * (CR-038, R-35 / CR-053) 「기본값」(내장 기본 그림 복원)과 별개로 「비우기」 버튼을 따로 두는 칸.
 * 'hair' = 뒷머리 · 'pomo_char' = 뽀모도 인물 — 둘 다 단일 슬롯이고 CR-053에서 내장 기본이 생겼다
 * (「기본값」 = 복원, 「비우기」 = removeAsset). 'kb_down_0'은 CR-053에서 내장 기본이 없어져 「기본값」
 * 자체가 비우기(resetKind 'clear')가 됐으므로 중복되는 셋째 버튼을 없앴다(CR-043 대체).
 */
export const EMPTYABLE_SLOT_KEYS: readonly string[] = ['hair', 'pomo_char']

export type SlotCardSpec = {
  type: 'slot'
  slot: AssetSlot
  key: string
  msg: SlotMessageKey
  n: number | null
  entry: AssetEntry | undefined
  required: boolean
  resetKind: ResetKind
  canReset: boolean
  lastOnlyBlocked: boolean
  /** (CR-038, R-35) `EMPTYABLE_SLOT_KEYS`에 있는 칸만 true — 카드에 셋째 버튼 「비우기」가 생긴다 */
  emptyable: boolean
  /** (CR-038, R-35) `emptyable && entry !== undefined` — 등록돼 있을 때만 「비우기」 활성 */
  canEmpty: boolean
}

/** (CR-035) DefaultsDownloadPanel 결과 줄 — images-tab.md §3 */
export type DownloadResult =
  | { kind: 'done'; count: number }
  | { kind: 'partial'; ok: number; failed: string[] }
  | { kind: 'error'; error: BridgeError }

export type AddCardSpec = {
  type: 'add'
  slot: KbDownSlot
  key: string
  msg: 'addKbDown'
}

export type CardSpec = SlotCardSpec | AddCardSpec

export interface SlotGroup {
  id: SlotGroupId
  cards: CardSpec[]
}

/** slotKey 로 비교해 항목을 찾는다(객체 슬롯도 안전하게 구분) */
export const findEntry = (manifest: AssetManifest, slot: AssetSlot): AssetEntry | undefined =>
  manifest.entries.find(e => slotKey(e.slot) === slotKey(slot))

/**
 * (CR-033, R-30) `pen_up`을 이번 등록이 "처음"으로 만들었는가 — 확인창(R-30)을 띄울지 판정한다.
 * `before`에 없었고 `next`에 생겼을 때만 true(교체·다른 슬롯 등록·이미 있던 경우는 false).
 * `pen_up`을 지운 뒤 다시 등록하면 `before`에도 없으므로 true(결정 ③ — 재등록은 첫 등록과 같다).
 */
export const isFirstPenUp = (slot: AssetSlot, before: AssetManifest, next: AssetManifest): boolean =>
  slotKey(slot) === 'pen_up' && findEntry(before, 'pen_up') === undefined && findEntry(next, 'pen_up') !== undefined

/**
 * 그 종류(kb_down) 항목들의 index 최댓값 + 1. 없으면 0.
 * (CR-042) 손(펜) 그룹은 `pen_down_0` 한 장 고정이라 `frameCount`를 부르지 않는다 — 호출처는 키보드뿐이다.
 */
export const frameCount = (manifest: AssetManifest, kind: 'kb_down'): number =>
  manifest.entries.reduce((max, e) => {
    if (typeof e.slot !== 'object' || e.slot.kind !== kind) return max
    return Math.max(max, e.slot.index + 1)
  }, 0)

/**
 * 슬롯 하나의 카드 명세.
 * (CR-035) `resetKind`가 먼저다 — 내장 기본이 있는 칸('restore')은 항상 `canReset: true`(빈 칸·가운데
 * 장이어도 복원만 하면 되므로 비우기 규칙이 필요 없다). 내장 기본이 없는 칸('clear')만 옛 규칙(여러 장
 * 슬롯은 등록된 마지막 장만 비울 수 있다)을 따른다.
 */
export const slotCard = (
  manifest: AssetManifest,
  slot: AssetSlot,
  msg: SlotMessageKey,
  frames: number | null,
): SlotCardSpec => {
  const entry = findEntry(manifest, slot)
  const required = isRequiredSlot(slot)
  const key = slotKey(slot)
  const resetKind: ResetKind = hasBuiltinDefault(slot) ? 'restore' : 'clear'
  const n = frames === null || typeof slot !== 'object' ? null : slot.index + 1
  const emptyable = EMPTYABLE_SLOT_KEYS.includes(key)
  // 여러 장 슬롯이 비우기 칸이면 뒤 장이 남아 있을 때 앞 장을 비울 수 없다 — 현재 비우기 칸(hair·pomo_char)은
  // frames가 항상 null이라 이 조건이 걸리지 않는다(방어 규칙으로 유지).
  const laterFrameExists = frames !== null && typeof slot === 'object' && slot.index + 1 < frames
  const canEmpty = emptyable && entry !== undefined && !laterFrameExists
  if (resetKind === 'restore') {
    return {
      type: 'slot',
      slot,
      key,
      msg,
      n,
      entry,
      required,
      resetKind,
      canReset: true,
      lastOnlyBlocked: false,
      emptyable,
      canEmpty,
    }
  }
  if (frames === null || typeof slot !== 'object') {
    return {
      type: 'slot',
      slot,
      key,
      msg,
      n,
      entry,
      required,
      resetKind,
      canReset: entry !== undefined,
      lastOnlyBlocked: false,
      emptyable,
      canEmpty,
    }
  }
  const isLast = slot.index === frames - 1
  return {
    type: 'slot',
    slot,
    key,
    msg,
    n,
    entry,
    required,
    resetKind,
    canReset: entry !== undefined && isLast,
    lastOnlyBlocked: entry !== undefined && !isLast,
    emptyable,
    canEmpty,
  }
}

/** (CR-035) exportDefaultAssets 응답 → 결과 줄. 충돌 판정은 호출자 몫(§10.5) — 충돌만 있어도 done·0장으로 옮긴다 */
export const exportResult = (r: ExportReport): DownloadResult =>
  r.failed.length > 0
    ? { kind: 'partial', ok: r.written.length, failed: r.failed.map(f => f.fileName) }
    : { kind: 'done', count: r.written.length }

const buildKeyboardCards = (manifest: AssetManifest): CardSpec[] => {
  const frames = frameCount(manifest, 'kb_down')
  const downCount = Math.max(1, frames)
  const cards: CardSpec[] = [slotCard(manifest, 'kb_up', 'kb_up', null)]
  for (let i = 0; i < downCount; i += 1) {
    cards.push(slotCard(manifest, { kind: 'kb_down', index: i }, 'kb_down', frames))
  }
  if (findEntry(manifest, { kind: 'kb_down', index: 0 })) {
    cards.push({
      type: 'add',
      slot: { kind: 'kb_down', index: frames },
      key: `kb_down_${frames}`,
      msg: 'addKbDown',
    })
  }
  cards.push(slotCard(manifest, 'idle', 'idle', null))
  cards.push(slotCard(manifest, 'rest', 'rest', null))
  for (const special of SPECIAL_KEY_ORDER) {
    const slot = `key_${special}` as AssetSlot
    cards.push(slotCard(manifest, slot, `key_${special}` as SlotMessageKey, null))
  }
  return cards
}

/**
 * (CR-042, R-39) 손(펜) 그룹 = 「손 기본」(`pen_up`)·「펜 입력 1」(`pen_down_0`) 두 칸만(§3.2 표).
 * 펜 특수 키 7칸·펜 입력 추가 카드는 없앤다 — `pen_down_0`은 내장 기본 칸(`resetKind` 'restore')이라
 * `frames`는 `n`(=1) 계산에만 쓰이고 `isLast` 판정 대상이 아니다(늘 활성). 옛 `pen_down_1+`·`pen_key_*`
 * 파일이 매니페스트에 남아 있어도 무시한다(카드를 만들지 않음 — 지울 수 없고 오버레이도 쓰지 않아 수용).
 */
const buildHandCards = (manifest: AssetManifest): CardSpec[] => [
  slotCard(manifest, 'pen_up', 'pen_up', null),
  slotCard(manifest, { kind: 'pen_down', index: 0 }, 'pen_down', 1),
]

/**
 * 카드 그룹 4개(배경·키보드·팔·손)를 화면에 표시할 순서 그대로 만든다. 몸통(body) 카드는 없다(🔒 D-8).
 * (CR-037, R-34) 배경 그룹 둘째 카드 = `hair`(뒷머리, 캔버스 레이어·선택 — images-tab.md §3.1).
 * (CR-045, R-42) 배경 그룹 셋째·넷째 카드 = `pomo_char`·`pomo_bubble`(뽀모도 인물·말풍선, 캔버스 레이어·선택 —
 * design/timer-tab.md §13·images-tab.md §14). (CR-053) hair·pomo_char는 내장 기본이 있다(「기본값」 = 복원 +
 * 「비우기」), pomo_bubble은 없다(「기본값」 = 비우기).
 */
export const buildSlotGroups = (manifest: AssetManifest): SlotGroup[] => [
  {
    id: 'background',
    cards: [
      slotCard(manifest, 'background', 'background', null),
      slotCard(manifest, 'hair', 'hair', null),
      slotCard(manifest, 'pomo_char', 'pomo_char', null),
      slotCard(manifest, 'pomo_bubble', 'pomo_bubble', null),
    ],
  },
  { id: 'keyboard', cards: buildKeyboardCards(manifest) },
  {
    id: 'arm',
    cards: [
      slotCard(manifest, 'mouse_base', 'mouse_base', null),
      slotCard(manifest, 'mouse_left', 'mouse_left', null),
      slotCard(manifest, 'mouse_right', 'mouse_right', null),
    ],
  },
  { id: 'hand', cards: buildHandCards(manifest) },
]
