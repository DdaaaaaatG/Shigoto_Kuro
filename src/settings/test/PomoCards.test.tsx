/**
 * 이미지 설정 탭 — 배경 그룹 「뽀모도 인물」·「뽀모도 말풍선」 카드 스펙(CR-045 · R-42 · R-20 · CR-053).
 * 기준: src/settings/design/timer-tab.md §13 · design/images-tab.md §14(§1 ASCII·§3 buildSlotGroups ①·검증 예·§7 I-2·I-3 대체)
 *       · §15(CR-053 — pomo_char 내장 기본 있음: 「기본값」 = 복원(I-3R) + 셋째 버튼 「비우기」(I-11), pomo_bubble 은 §14 그대로)
 *       · design/i18n.md §4.9(slots.pomo_char·pomo_bubble)·§4.3 imagesNote(CR-045)·§4.6 asset.canvas_mismatch(CR-045)·§4.8 emptyImage*
 *       · contract v0.29 `DEFAULT_ASSET_SLOTS` 6개(pomo_char 포함 · hair 없음 — CR-063)·`remove_asset`·`restore_default_asset`
 *       · scenarios.md 「CR-045」 절 TC-241 ~ TC-245 · TC-FLOW-25 · 「CR-053 개정」 절 TC-291 · TC-292
 *       · 「v29 개정」 절 TC-241(`EMPTYABLE_SLOT_KEYS` = ['pomo_char'] — hair 는 셋째 버튼 없는 비우기 칸, images-tab §16).
 * bridge 는 mock(importOriginal — toBridgeError 실물). 카드 판정 상수(hasBuiltinDefault·isRequiredSlot)는 bridge/types 실물 —
 * 목록을 화면에 다시 적지 않는다(timer-tab §13 판정). 미리보기 교체는 props(manifest) 재렌더로 흉내 낸다(assets://changed).
 * 시간 의존 없음(deferred promise + act·waitFor 조건).
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { AssetEntry, AssetManifest, AssetSlot, BridgeError, Settings } from 'bridge/types'
import { hasBuiltinDefault, isRequiredSlot, slotKey } from 'bridge/types'
import { importAsset, pickPngFile, removeAsset, restoreDefaultAsset, setSettings } from 'bridge/commands'
import ImagesTab from '../components/ImagesTab'
import { EMPTYABLE_SLOT_KEYS, buildSlotGroups, slotCard, type CardSpec, type SlotCardSpec } from '../imageSlots'
import { MessagesProvider } from '../i18n/MessagesContext'
import { format } from '../i18n/index'
import { ja } from '../i18n/ja'
import { en } from '../i18n/en'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))
vi.mock('bridge/commands', async importOriginal => {
  const actual = await importOriginal<typeof import('bridge/commands')>()
  return {
    ...actual, // toBridgeError 는 실물
    getSettings: vi.fn(),
    setSettings: vi.fn(),
    getAssetManifest: vi.fn(),
    importAsset: vi.fn(),
    removeAsset: vi.fn(),
    restoreDefaultAsset: vi.fn(),
    exportDefaultAssets: vi.fn(),
    pickFolder: vi.fn(),
    setAutostart: vi.fn(),
    pickPngFile: vi.fn(),
    resetOverlayPosition: vi.fn(),
    setSettingsWindowTitle: vi.fn(),
    controlTimer: vi.fn(),
    getTimer: vi.fn(),
  }
})

// ─── 픽스처 ────────────────────────────────────────────────────────────────
const CANVAS = { width: 900, height: 700 }
const SETTINGS: Settings = {
  scale: 1.5,
  idleSeconds: 120,
  overlay: { x: 30, y: 40, visible: true },
  mouse: null,
  autostart: false,
  language: 'ko',
  positionLock: false,
  showInTaskbar: false,
  // 사용자가 저장한 값 예(CR-045 시점 기본값 모양) — 이 스펙은 timer 를 읽지 않는다
  timer: { enabled: false, textPos: { x: 268, y: 403 }, rotation: 5, fontSize: 36, color: '#333333' },
}
const entry = (slot: AssetSlot, v = ''): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width: 900,
  height: 700,
  bytes: 1000,
  url: `asset://${slotKey(slot)}.png${v}`,
})
const EMPTY: AssetManifest = { canvas: null, entries: [] }
const BASE = [entry('kb_up'), entry('mouse_base')]
const CHAR: AssetManifest = { canvas: CANVAS, entries: [...BASE, entry('pomo_char')] }
const BOTH: AssetManifest = { canvas: CANVAS, entries: [...BASE, entry('pomo_char'), entry('pomo_bubble')] }
const BUBBLE_ONLY: AssetManifest = { canvas: CANVAS, entries: [...BASE, entry('pomo_bubble')] }
const NO_POMO: AssetManifest = { canvas: CANVAS, entries: BASE }
/** CR-053: 내장 기본 인물로 복원된 응답(버전 쿼리로 교체 확인) */
const CHAR_DEF: AssetManifest = { canvas: CANVAS, entries: [...BASE, entry('pomo_char', '?v=d')] }
const PATH = 'C:\\img\\pomo.png'
const MISMATCH: BridgeError = {
  code: 'asset.canvas_mismatch',
  message: '배경·뒷머리·뽀모도·키보드 그림은 모두 같은 크기여야 합니다. (현재 800×600, 캔버스 900×700)',
}
const CHAR_IO: BridgeError = { code: 'asset.io', message: '뽀모도 인물 파일을 지우지 못했습니다. (테스트)' }
const NO_DEFAULT: BridgeError = { code: 'asset.no_default', message: '내장 기본 그림이 없습니다: pomo_char (테스트)' }
/** i18n §4.3 imagesNote(CR-045 개정) ko 확정 — {w}×{h} = 900×700 */
const NOTE_KO = 'PNG(32비트 RGBA)만 쓸 수 있습니다. 최대 900×700·1MB. 배경·뒷머리·뽀모도·키보드 그림은 모두 같은 크기로 만드세요.'
const CHAR_KO = { title: '뽀모도 인물', desc: '타이머 옆에 서 있는 두 번째 캐릭터. 배경처럼 고정되어 흔들리지 않습니다' }
const BUBBLE_KO = { title: '뽀모도 말풍선', desc: '시간이 들어갈 말풍선. 배경처럼 고정됩니다' }
/** 배경 그룹 뒤 그룹들(불변 — CR-042·CR-043 기준 16장) */
const REST_KEYS = [
  'kb_up',
  'kb_down_0',
  'idle',
  'rest',
  'key_space',
  'key_z',
  'key_question',
  'key_exclamation',
  'key_enter',
  'key_backspace',
  'key_undo',
  'mouse_base',
  'mouse_left',
  'mouse_right',
  'pen_up',
  'pen_down_0',
]

const deferred = <V,>() => {
  let resolve!: (v: V) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<V>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let onError: Mock
beforeEach(() => {
  vi.resetAllMocks()
  onError = vi.fn()
  vi.mocked(pickPngFile).mockResolvedValue(PATH)
  vi.mocked(setSettings).mockImplementation(async s => s)
})

// ─── 도우미 ────────────────────────────────────────────────────────────────
const keysOf = (cards: CardSpec[]) => cards.map(c => c.key)
const slotSpecs = (m: AssetManifest) =>
  buildSlotGroups(m)
    .flatMap(g => g.cards)
    .filter((c): c is SlotCardSpec => c.type === 'slot')
const tree = (m: AssetManifest, language?: string) => {
  const tab = <ImagesTab settings={SETTINGS} manifest={m} onError={onError as (e: BridgeError | null) => void} />
  return language ? <MessagesProvider language={language}>{tab}</MessagesProvider> : tab
}
const renderImages = (m: AssetManifest = EMPTY, language?: string) => {
  const utils = render(tree(m, language))
  return { ...utils, update: (nm: AssetManifest) => utils.rerender(tree(nm, language)) }
}
const card = (key: string) => screen.getByTestId(`slot-card-${key}`)
const cardIds = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="slot-card-"], [data-testid^="add-card-"]')).map(
    e => e.dataset.testid,
  )
const cardButtons = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('[data-testid^="slot-card-"] button, [data-testid^="add-card-"] button'))
const changeBtn = (key: string, name: string) => within(card(key)).getByRole('button', { name: `${name} 이미지 변경` })
/** 비우기 칸(resetKind 'clear')의 「기본값」 — CR-053 뒤에는 pomo_bubble 만 */
const clearBtn = (key: string, name: string) => within(card(key)).getByRole('button', { name: `${name} 그림 지우기` })
/** CR-053: 복원 칸 「기본값」(restoreImageAria) — pomo_char */
const restoreBtn = (key: string, name: string) =>
  within(card(key)).getByRole('button', { name: `${name} 기본 그림으로 되돌리기` })
/** CR-053: 셋째 버튼 「비우기」(emptyImageAria) — pomo_char */
const emptyBtn = (key: string, name: string) => within(card(key)).getByRole('button', { name: `${name} 그림 비우기` })
const dialog = () => screen.getByRole('alertdialog')
const CHAR_NAME = CHAR_KO.title
const BUBBLE_NAME = BUBBLE_KO.title

describe('imageSlots — 배경 그룹 뽀모도 두 칸 (R-42, timer-tab §13 · images-tab §15)', () => {
  it('TC-241 (CR-053 · v29 개정): buildSlotGroups 배경 그룹 = [background, hair, pomo_char, pomo_bubble] — pomo_char 는 단일·선택·복원 칸(canReset 늘 true)·「비우기」 칸(canEmpty = 등록), pomo_bubble 은 단일·선택·비우기 칸(canReset = 등록·emptyable false), EMPTYABLE_SLOT_KEYS = [pomo_char](hair 제외), 필수 2장·다른 그룹 불변', () => {
    // bridge 상수(contract v0.29) — 화면이 다시 적지 않는다
    expect(hasBuiltinDefault('pomo_char')).toBe(true) // CR-053: v0.21 false 대체
    expect(hasBuiltinDefault('pomo_bubble')).toBe(false)
    expect(isRequiredSlot('pomo_char')).toBe(false)
    expect(isRequiredSlot('pomo_bubble')).toBe(false)
    // v29(CR-063 · contract v0.29 · images-tab §16): hair 내장 기본 없음 → 셋째 버튼 칸은 pomo_char 뿐(CR-053 ['hair','pomo_char'] 대체)
    expect([...EMPTYABLE_SLOT_KEYS]).toEqual(['pomo_char'])
    // ① 빈 매니페스트
    const groups = buildSlotGroups(EMPTY)
    expect(groups).toHaveLength(4)
    expect(groups[0].id).toBe('background')
    expect(keysOf(groups[0].cards)).toEqual(['background', 'hair', 'pomo_char', 'pomo_bubble'])
    const base = { type: 'slot', n: null, entry: undefined, required: false, lastOnlyBlocked: false } as const
    expect(groups[0].cards[2]).toStrictEqual({
      ...base,
      slot: 'pomo_char',
      key: 'pomo_char',
      msg: 'pomo_char',
      resetKind: 'restore',
      canReset: true,
      emptyable: true,
      canEmpty: false,
    })
    expect(groups[0].cards[3]).toStrictEqual({
      ...base,
      slot: 'pomo_bubble',
      key: 'pomo_bubble',
      msg: 'pomo_bubble',
      resetKind: 'clear',
      canReset: false,
      emptyable: false,
      canEmpty: false,
    })
    for (const [i, slot] of [
      [2, 'pomo_char'],
      [3, 'pomo_bubble'],
    ] as const) {
      expect(slotCard(EMPTY, slot, slot, null)).toStrictEqual(groups[0].cards[i])
    }
    expect(groups.slice(1).flatMap(g => keysOf(g.cards))).toEqual(REST_KEYS)
    expect(slotSpecs(EMPTY)).toHaveLength(20) // 18 + 2
    expect(slotSpecs(EMPTY).filter(c => c.required).map(c => c.key)).toEqual(['kb_up', 'mouse_base'])
    // ② pomo_char 만 등록 — 캔버스 판정은 core 몫
    const withChar = buildSlotGroups(CHAR)
    expect(keysOf(withChar[0].cards)).toEqual(['background', 'hair', 'pomo_char', 'pomo_bubble'])
    expect(withChar[0].cards[2]).toMatchObject({
      entry: CHAR.entries[2],
      resetKind: 'restore',
      canReset: true,
      emptyable: true,
      canEmpty: true,
    })
    expect(withChar[0].cards[3]).toMatchObject({ entry: undefined, resetKind: 'clear', canReset: false, emptyable: false })
    // ③ 둘 다 등록 — pomo_bubble 「기본값」(비우기) 활성, 셋째 버튼 대상 아님
    expect(buildSlotGroups(BOTH)[0].cards[3]).toMatchObject({ resetKind: 'clear', canReset: true, emptyable: false, canEmpty: false })
  })
})

describe('ImagesTab — 뽀모도 카드 화면 (R-42·R-20)', () => {
  it('TC-242 (CR-053 개정): 빈 매니페스트 — 배경 그룹 셋째·넷째 카드(제목·설명·선택 배지·빈 미리보기), 인물 = 버튼 3개(기본값 = 복원 활성·비우기 비활성·두 줄 양식), 말풍선 = 버튼 2개(기본값 = 지우기 비활성), 안내 문구에 뽀모도, 등록되면 미리보기·「비우기」/「기본값」 활성', () => {
    const { update } = renderImages(EMPTY)
    // ⓐ 화면
    expect(screen.getByText(NOTE_KO)).toBeInTheDocument()
    expect(cardIds().slice(0, 5)).toEqual([
      'slot-card-background',
      'slot-card-hair',
      'slot-card-pomo_char',
      'slot-card-pomo_bubble',
      'slot-card-kb_up',
    ])
    expect(cardIds()).toHaveLength(20)
    for (const [key, msg] of [
      ['pomo_char', CHAR_KO],
      ['pomo_bubble', BUBBLE_KO],
    ] as const) {
      const c = card(key)
      expect(within(c).getByRole('heading', { level: 3 }).textContent).toBe(msg.title)
      expect(within(c).getByText(msg.desc)).toBeInTheDocument()
      expect(within(c).getByText('선택')).toBeInTheDocument()
      expect(within(c).queryByText('필수')).toBeNull()
      expect(within(c).getByText('등록된 그림 없음')).toBeInTheDocument()
      expect(c.querySelector('img')).toBeNull()
    }
    // 인물(CR-053): [이미지 변경, 기본값, 비우기] — 「기본값」 = 복원(빈 칸이어도 활성), 「비우기」 비활성, 두 줄 양식
    expect(within(card('pomo_char')).getAllByRole('button').map(b => b.textContent)).toEqual([
      '이미지 변경',
      '기본값',
      '비우기',
    ])
    expect(restoreBtn('pomo_char', CHAR_NAME)).toBeEnabled()
    expect(restoreBtn('pomo_char', CHAR_NAME)).not.toHaveAttribute('title')
    expect(emptyBtn('pomo_char', CHAR_NAME)).toBeDisabled()
    expect(within(card('pomo_char')).queryByRole('button', { name: `${CHAR_NAME} 그림 지우기` })).toBeNull()
    expect(card('pomo_char').className).toMatch(/cardEmptyable/)
    fireEvent.click(emptyBtn('pomo_char', CHAR_NAME))
    expect(screen.queryByRole('alertdialog')).toBeNull() // 비활성 — 확인창 없음
    // 말풍선(변경 없음): [이미지 변경, 기본값] — 「기본값」 = 비우기 칸(비활성·title 없음), 복원·비우기 이름 버튼 없음
    expect(within(card('pomo_bubble')).getAllByRole('button').map(b => b.textContent)).toEqual(['이미지 변경', '기본값'])
    expect(clearBtn('pomo_bubble', BUBBLE_NAME)).toBeDisabled()
    expect(clearBtn('pomo_bubble', BUBBLE_NAME)).not.toHaveAttribute('title')
    expect(within(card('pomo_bubble')).queryByRole('button', { name: /기본 그림으로 되돌리기$|그림 비우기$/ })).toBeNull()
    expect(card('pomo_bubble').className).not.toMatch(/cardEmptyable/)
    // 등록 뒤(assets://changed → props)
    update(BOTH)
    for (const key of ['pomo_char', 'pomo_bubble']) {
      expect(card(key).querySelector('img')).toHaveAttribute('src', `asset://${key}.png`)
    }
    expect(restoreBtn('pomo_char', CHAR_NAME)).toBeEnabled()
    expect(emptyBtn('pomo_char', CHAR_NAME)).toBeEnabled()
    expect(changeBtn('pomo_char', CHAR_NAME)).toBeEnabled()
    expect(clearBtn('pomo_bubble', BUBBLE_NAME)).toBeEnabled()
    expect(changeBtn('pomo_bubble', BUBBLE_NAME)).toBeEnabled()
    // ⓑ 상태: 카드 오류 없음 ⓒ bridge 0회
    expect(screen.queryByRole('alert')).toBeNull()
    for (const f of [pickPngFile, importAsset, removeAsset, restoreDefaultAsset, setSettings]) {
      expect(f).not.toHaveBeenCalled()
    }
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-243: 이미지 변경 — 성공이면 importAsset(pomo_char, PATH) 1회, 캔버스 크기 다름(asset.canvas_mismatch)이면 그 카드 오류 띠(ko = core message, en = 사전 문구)', async () => {
    vi.mocked(importAsset).mockResolvedValueOnce(CHAR).mockRejectedValueOnce(MISMATCH)
    const { unmount } = renderImages(NO_POMO)
    await act(async () => {
      fireEvent.click(changeBtn('pomo_char', '뽀모도 인물'))
    })
    // ⓒ 대화상자 제목·인자
    expect(pickPngFile).toHaveBeenCalledWith('PNG 이미지 선택')
    expect(vi.mocked(importAsset).mock.calls).toEqual([['pomo_char', PATH]])
    expect(within(card('pomo_char')).queryByRole('alert')).toBeNull()
    await act(async () => {
      fireEvent.click(changeBtn('pomo_bubble', '뽀모도 말풍선'))
    })
    // ⓐ 그 카드만 오류 띠, 그림 그대로(없음)
    expect(vi.mocked(importAsset).mock.calls[1]).toEqual(['pomo_bubble', PATH])
    expect(within(card('pomo_bubble')).getByRole('alert')).toHaveTextContent(MISMATCH.message)
    expect(within(card('pomo_char')).queryByRole('alert')).toBeNull()
    expect(card('pomo_bubble').querySelector('img')).toBeNull()
    // ⓑ 오류 줄(onError)은 쓰지 않는다(카드 오류) · 버튼 다시 활성
    expect(onError).not.toHaveBeenCalled()
    expect(changeBtn('pomo_bubble', '뽀모도 말풍선')).toBeEnabled()
    unmount()
    // en — code 문구(i18n §4.6 CR-045: pomodoro 포함)
    vi.mocked(importAsset).mockRejectedValueOnce(MISMATCH)
    renderImages(NO_POMO, 'en')
    await act(async () => {
      fireEvent.click(
        within(card('pomo_bubble')).getByRole('button', {
          name: format(en.changeImageAria, { name: en.slots.pomo_bubble.title }),
        }),
      )
    })
    expect(within(card('pomo_bubble')).getByRole('alert')).toHaveTextContent(en.errors['asset.canvas_mismatch'])
    expect(en.errors['asset.canvas_mismatch']).toContain('pomodoro')
    expect(pickPngFile).toHaveBeenLastCalledWith(en.pickTitle)
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-244: 「기본값」 → 비우기 확인창({name} = 뽀모도 말풍선·danger·포커스 취소) — 취소·Esc 는 호출 없음, 「지우기」 → removeAsset("pomo_bubble") 1회·restoreDefaultAsset 0회', async () => {
    const del = deferred<AssetManifest>()
    vi.mocked(removeAsset).mockReturnValue(del.promise)
    const { update } = renderImages(BOTH)
    const trigger = clearBtn('pomo_bubble', '뽀모도 말풍선')
    // 취소
    fireEvent.click(trigger)
    expect(dialog()).toHaveAttribute('aria-modal', 'true')
    expect(dialog()).toHaveAccessibleName('그림 지우기')
    expect(dialog()).toHaveAccessibleDescription('‘뽀모도 말풍선’ 그림을 지울까요? 되돌릴 수 없습니다.')
    expect(within(dialog()).getAllByRole('button').map(b => b.textContent)).toEqual(['지우기', '취소'])
    expect(within(dialog()).getByRole('button', { name: '취소' })).toHaveFocus()
    fireEvent.click(within(dialog()).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(trigger).toHaveFocus()
    // Esc
    fireEvent.click(trigger)
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(removeAsset).not.toHaveBeenCalled()
    // 확정
    fireEvent.click(trigger)
    fireEvent.click(within(dialog()).getByRole('button', { name: '지우기' }))
    // ⓒ 1회·인자
    expect(vi.mocked(removeAsset).mock.calls).toEqual([['pomo_bubble']])
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    await act(async () => del.resolve(CHAR))
    update(CHAR)
    // ⓐ 빈 칸·「기본값」 비활성 · 다른 뽀모도 카드 그대로
    expect(card('pomo_bubble').querySelector('img')).toBeNull()
    expect(within(card('pomo_bubble')).getByText('등록된 그림 없음')).toBeInTheDocument()
    expect(clearBtn('pomo_bubble', '뽀모도 말풍선')).toBeDisabled()
    expect(card('pomo_char').querySelector('img')).toHaveAttribute('src', 'asset://pomo_char.png')
    // ⓑ 오류 없음
    expect(screen.queryByRole('alert')).toBeNull()
    expect(onError).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-245: ja·en — 카드 제목·설명·「기본값」 aria·확인창 {name}·안내 문구(뽀모도 포함)가 사전 값', () => {
    for (const [lang, d, word] of [
      ['ja', ja, 'ポモドーロ'],
      ['en', en, 'pomodoro'],
    ] as const) {
      const r = renderImages(BUBBLE_ONLY, lang)
      expect(screen.getByText(format(d.imagesNote, { w: 900, h: 700 }))).toBeInTheDocument()
      expect(d.imagesNote).toContain(word)
      for (const key of ['pomo_char', 'pomo_bubble'] as const) {
        const m = d.slots[key]
        expect(within(card(key)).getByRole('heading', { level: 3 }).textContent).toBe(m.title)
        expect(within(card(key)).getByText(m.desc)).toBeInTheDocument()
      }
      const clear = within(card('pomo_bubble')).getByRole('button', {
        name: format(d.clearImageAria, { name: d.slots.pomo_bubble.title }),
      })
      fireEvent.click(clear)
      expect(dialog()).toHaveAccessibleDescription(format(d.confirmClearMessage, { name: d.slots.pomo_bubble.title }))
      fireEvent.click(within(dialog()).getByRole('button', { name: d.confirmCancel }))
      r.unmount()
    }
    expect(removeAsset).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
  })
})

// ─── CR-053 · pomo_char 내장 기본 — images-tab §15.2(「비우기」 = I-11 · 「기본값」 = I-3R) ───
describe('ImagesTab — 뽀모도 인물 「비우기」·「기본값」 복원 (R-42 · R-32 · R-35, CR-053)', () => {
  it("TC-291: 「비우기」 → 비우기 확인창({name} = 뽀모도 인물, 포커스 취소) — 취소·Esc 는 호출 없음·포커스 누른 「비우기」, 「지우기」 → removeAsset('pomo_char') 정확히 1회·restoreDefaultAsset 0회·진행 중 전부 비활성, 응답 뒤 포커스 = 「뽀모도 인물 이미지 변경」, 수신 뒤 빈 칸·「비우기」 비활성·「기본값」 활성 / 실패 → 카드 오류 띠·그림 그대로·포커스 「이미지 변경」", async () => {
    const del = deferred<AssetManifest>()
    vi.mocked(removeAsset).mockReturnValueOnce(del.promise).mockRejectedValueOnce(CHAR_IO)
    const { update, unmount } = renderImages(BOTH)
    const trigger = emptyBtn('pomo_char', CHAR_NAME)
    // 취소
    fireEvent.click(trigger)
    expect(dialog()).toHaveAttribute('aria-modal', 'true')
    expect(dialog()).toHaveAccessibleName('그림 지우기')
    expect(dialog()).toHaveAccessibleDescription('‘뽀모도 인물’ 그림을 지울까요? 되돌릴 수 없습니다.')
    expect(within(dialog()).getAllByRole('button').map(b => b.textContent)).toEqual(['지우기', '취소'])
    expect(within(dialog()).getByRole('button', { name: '지우기' }).className).toMatch(/danger/)
    expect(within(dialog()).getByRole('button', { name: '취소' })).toHaveFocus()
    fireEvent.click(within(dialog()).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(trigger).toHaveFocus()
    // Esc
    fireEvent.click(trigger)
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(trigger).toHaveFocus()
    expect(removeAsset).not.toHaveBeenCalled()
    // 확정
    fireEvent.click(trigger)
    fireEvent.click(within(dialog()).getByRole('button', { name: '지우기' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(removeAsset).toHaveBeenCalledTimes(1))
    // ⓒ 인자 — 복원 호출 없음
    expect(vi.mocked(removeAsset).mock.calls).toEqual([['pomo_char']])
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    for (const b of cardButtons()) expect(b).toBeDisabled() // slotBusy = 'pomo_char'
    await act(async () => del.resolve(BUBBLE_ONLY))
    // ⓐ focusAfter — 비운 뒤 「비우기」는 비활성이 되므로 같은 카드 「이미지 변경」으로
    await waitFor(() => expect(changeBtn('pomo_char', CHAR_NAME)).toHaveFocus())
    expect(card('pomo_char').querySelector('img')).toHaveAttribute('src', 'asset://pomo_char.png') // 수신 전 그대로
    update(BUBBLE_ONLY) // assets://changed 흉내
    expect(card('pomo_char').querySelector('img')).toBeNull()
    expect(within(card('pomo_char')).getByText('등록된 그림 없음')).toBeInTheDocument()
    expect(emptyBtn('pomo_char', CHAR_NAME)).toBeDisabled()
    expect(restoreBtn('pomo_char', CHAR_NAME)).toBeEnabled()
    expect(changeBtn('pomo_char', CHAR_NAME)).toHaveFocus()
    expect(card('pomo_bubble').querySelector('img')).toHaveAttribute('src', 'asset://pomo_bubble.png')
    // ⓑ 오류 없음
    expect(screen.queryByRole('alert')).toBeNull()
    expect(onError).not.toHaveBeenCalled()
    unmount()
    // 실패 분기 — 카드 오류 띠(ko = core message), 그림 그대로, 「비우기」 다시 활성, 포커스 「이미지 변경」
    renderImages(BOTH)
    fireEvent.click(emptyBtn('pomo_char', CHAR_NAME))
    fireEvent.click(within(dialog()).getByRole('button', { name: '지우기' }))
    await waitFor(() => expect(within(card('pomo_char')).getByRole('alert')).toHaveTextContent(CHAR_IO.message))
    expect(card('pomo_char').querySelector('img')).toHaveAttribute('src', 'asset://pomo_char.png')
    await waitFor(() => expect(emptyBtn('pomo_char', CHAR_NAME)).toBeEnabled())
    await waitFor(() => expect(changeBtn('pomo_char', CHAR_NAME)).toHaveFocus())
    expect(within(card('pomo_bubble')).queryByRole('alert')).toBeNull()
    expect(vi.mocked(removeAsset).mock.calls).toEqual([['pomo_char'], ['pomo_char']])
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it("TC-292: 「기본값」(빈 칸이어도 활성) → 복원 확인창({name} = 뽀모도 인물, 2단추·danger·포커스 취소) — 취소는 호출 없음, 「기본 그림으로」 → restoreDefaultAsset('pomo_char') 정확히 1회·removeAsset 0회·setSettings 0회, 응답 뒤 포커스 = 누른 「기본값」, 수신 뒤 내장 인물 미리보기·「비우기」 활성 / 실패(asset.no_default) → 카드 오류 띠(ko = message, en = 사전 code 문구)·빈 칸 그대로", async () => {
    const rs = deferred<AssetManifest>()
    vi.mocked(restoreDefaultAsset).mockReturnValueOnce(rs.promise).mockRejectedValueOnce(NO_DEFAULT).mockRejectedValueOnce(NO_DEFAULT)
    const { update, unmount } = renderImages(NO_POMO)
    const trigger = restoreBtn('pomo_char', CHAR_NAME)
    expect(trigger).toBeEnabled()
    expect(trigger).toHaveTextContent('기본값')
    // 취소
    fireEvent.click(trigger)
    expect(dialog()).toHaveAccessibleName('기본 그림으로 되돌리기')
    expect(dialog()).toHaveAccessibleDescription(
      '‘뽀모도 인물’ 칸을 내장 기본 그림으로 되돌릴까요? 지금 그림은 지워지며 되돌릴 수 없습니다.',
    )
    expect(within(dialog()).getAllByRole('button').map(b => b.textContent)).toEqual(['기본 그림으로', '취소'])
    expect(within(dialog()).getByRole('button', { name: '기본 그림으로' }).className).toMatch(/danger/)
    expect(within(dialog()).getByRole('button', { name: '취소' })).toHaveFocus()
    fireEvent.click(within(dialog()).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(trigger).toHaveFocus()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    // 확정
    fireEvent.click(trigger)
    fireEvent.click(within(dialog()).getByRole('button', { name: '기본 그림으로' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(restoreDefaultAsset).toHaveBeenCalledTimes(1))
    // ⓒ 인자 — 비우기·설정 저장 없음(pen_up 이 아니라 ensurePenPos 저장 없음)
    expect(vi.mocked(restoreDefaultAsset).mock.calls).toEqual([['pomo_char']])
    for (const b of cardButtons()) expect(b).toBeDisabled()
    await act(async () => rs.resolve(CHAR_DEF))
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(card('pomo_char').querySelector('img')).toBeNull() // props 전에는 그대로(빈 칸)
    update(CHAR_DEF)
    expect(card('pomo_char').querySelector('img')).toHaveAttribute('src', 'asset://pomo_char.png?v=d')
    expect(emptyBtn('pomo_char', CHAR_NAME)).toBeEnabled()
    expect(restoreBtn('pomo_char', CHAR_NAME)).toBeEnabled()
    expect(screen.queryByRole('alertdialog')).toBeNull() // 펜 첫 등록 확인창과 무관
    expect(screen.queryByRole('alert')).toBeNull()
    unmount()
    // 실패 분기 ko — core message
    const second = renderImages(NO_POMO)
    fireEvent.click(restoreBtn('pomo_char', CHAR_NAME))
    fireEvent.click(within(dialog()).getByRole('button', { name: '기본 그림으로' }))
    await waitFor(() => expect(within(card('pomo_char')).getByRole('alert')).toHaveTextContent(NO_DEFAULT.message))
    expect(card('pomo_char').querySelector('img')).toBeNull()
    await waitFor(() => expect(restoreBtn('pomo_char', CHAR_NAME)).toHaveFocus())
    second.unmount()
    // 실패 분기 en — errorText 가 code 문구를 고른다
    renderImages(NO_POMO, 'en')
    fireEvent.click(
      within(card('pomo_char')).getByRole('button', {
        name: format(en.restoreImageAria, { name: en.slots.pomo_char.title }),
      }),
    )
    fireEvent.click(within(dialog()).getByRole('button', { name: en.confirmRestoreOk }))
    await waitFor(() =>
      expect(within(card('pomo_char')).getByRole('alert')).toHaveTextContent(en.errors['asset.no_default']),
    )
    expect(vi.mocked(restoreDefaultAsset).mock.calls).toEqual([['pomo_char'], ['pomo_char'], ['pomo_char']])
    expect(removeAsset).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })
})

describe('TC-FLOW (S-24)', () => {
  it('TC-FLOW-25 (CR-053 개정): (S-24) 뽀모도 인물·말풍선 PNG 두 장을 넣고, 필요 없어진 인물은 「비우기」로 없앤다(「기본값」은 내장 인물 복원이라 쓰지 않는다)', async () => {
    vi.mocked(importAsset).mockResolvedValueOnce(CHAR).mockResolvedValueOnce(BOTH)
    vi.mocked(removeAsset).mockResolvedValueOnce(BUBBLE_ONLY)
    const { update } = renderImages(NO_POMO)
    // Step 1 TC-243(성공 부분) — 인물
    await act(async () => {
      fireEvent.click(changeBtn('pomo_char', '뽀모도 인물'))
    })
    update(CHAR) // 상태 전달: Step 1 응답 CHAR 가 Step 2 의 Given
    expect(card('pomo_char').querySelector('img')).toHaveAttribute('src', 'asset://pomo_char.png')
    // Step 2 TC-243(성공 부분) — 말풍선
    await act(async () => {
      fireEvent.click(changeBtn('pomo_bubble', '뽀모도 말풍선'))
    })
    update(BOTH)
    // Step 3 TC-242(등록 뒤 부분) — 두 카드 미리보기·인물 「비우기」 활성
    expect(card('pomo_bubble').querySelector('img')).toHaveAttribute('src', 'asset://pomo_bubble.png')
    expect(emptyBtn('pomo_char', CHAR_NAME)).toBeEnabled()
    // Step 4 TC-291(확정 부분) — 인물 「비우기」
    fireEvent.click(emptyBtn('pomo_char', CHAR_NAME))
    expect(dialog()).toHaveAccessibleDescription('‘뽀모도 인물’ 그림을 지울까요? 되돌릴 수 없습니다.')
    // act 로 감싸면 slotBusy 'pomo_char' → null 이 한 커밋으로 합쳐져 포커스 복귀 효과가 돌지 않는다(TC-291 과 같은 방식)
    fireEvent.click(within(dialog()).getByRole('button', { name: '지우기' }))
    await waitFor(() => expect(changeBtn('pomo_char', CHAR_NAME)).toHaveFocus())
    update(BUBBLE_ONLY)
    // ⓐ 최종: 인물 빈 칸(「비우기」 비활성·「기본값」 활성)·말풍선 그대로
    expect(card('pomo_char').querySelector('img')).toBeNull()
    expect(emptyBtn('pomo_char', CHAR_NAME)).toBeDisabled()
    expect(restoreBtn('pomo_char', CHAR_NAME)).toBeEnabled()
    expect(card('pomo_bubble').querySelector('img')).toHaveAttribute('src', 'asset://pomo_bubble.png')
    // ⓑ 카드 오류 없음 ⓒ 호출 순서·인자
    expect(screen.queryByRole('alert')).toBeNull()
    expect(vi.mocked(importAsset).mock.calls).toEqual([
      ['pomo_char', PATH],
      ['pomo_bubble', PATH],
    ])
    expect(vi.mocked(removeAsset).mock.calls).toEqual([['pomo_char']])
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })
})
