/**
 * 헤어(뒷머리) 슬롯 — 「이미지 설정」 탭 카드 스펙 + TC-FLOW-18 — CR-037 · R-34 (R-25·R-32·R-20) · CR-038 R-35 · CR-044 · CR-053.
 * 기준: requirements R-34·R-35·R-36·S-17 · design/images-tab.md §1 ASCII `[card hair]`·§3 `buildSlotGroups` ①·
 *       §3 `slotCard`(resetKind = hasBuiltinDefault)·§5 `onConfirmClear`(focusAfter ?? trigger)·`onConfirmRestore`·§6 4′·§7 I-3R·I-11
 *       · §11.2 셋째 버튼 양식 · §15(CR-053 — 배포용 기본 세트 3차) · design.md §4 `hairUrl`·§5.2 렌더 3
 *       · design/i18n.md §4.3·§4.4·§4.6·§4.8 · contract v0.24 `DEFAULT_ASSET_SLOTS` 7개(hair 포함)·`remove_asset`·`restore_default_asset`
 *       · scenarios.md 「CR-037 개정」 TC-193 ~ TC-196 · 「CR-038 R-35 개정(v14)」 TC-200 ~ TC-207 · 「CR-053 개정(v23)」.
 *       (CR-053 🔒 확정사항 CR-053 줄 「배포용 기본 세트 3차」 — hair 내장 기본 다시 있음 → 「기본값」 = 복원(restore, 빈 칸이어도 활성),
 *        EMPTYABLE_SLOT_KEYS = ['hair', 'pomo_char'] → 뒷머리 카드 셋째 버튼 「비우기」(aria emptyImageAria) 복귀:
 *        등록돼 있을 때만 활성, 기존 비우기 확인창 → removeAsset('hair') 1회·restoreDefaultAsset 0회, 응답 뒤 포커스 = 같은 카드 「이미지 변경」.
 *        CR-044 M-2(뒷머리 「기본값」 = 비우기·버튼 2개) 대체. TC-204·TC-205·TC-FLOW-19 는 폐기 그대로 — TC-196·TC-206 이 「비우기」 경로를 덮는다.)
 * 미리보기 헤어 합성·끌기 판정(TC-198·TC-199)은 test/MousePartsTab.test.tsx(포인터 보강 공유).
 * bridge 는 mock(vi.mock('bridge/commands')) — toBridgeError 만 실물. bridge/types(slotKey·isRequiredSlot·hasBuiltinDefault)는 실물.
 * imageSlots(EMPTYABLE_SLOT_KEYS·slotCard·buildSlotGroups)·i18n 사전도 실물.
 * 매니페스트 교체(assets://changed)는 props 재렌더로 흉내 낸다. 시간 의존 없음 — deferred promise + waitFor 조건.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetEntry, AssetManifest, AssetSlot, BridgeError, MouseSettings, Settings } from 'bridge/types'
import { DEFAULT_TIMER_SETTINGS, hasBuiltinDefault, slotKey } from 'bridge/types'
import { importAsset, pickPngFile, removeAsset, restoreDefaultAsset, setSettings } from 'bridge/commands'
import ImagesTab from '../components/ImagesTab'
import MousePartsTab from '../components/MousePartsTab'
import { EMPTYABLE_SLOT_KEYS, buildSlotGroups, slotCard, type CardSpec, type SlotCardSpec } from '../imageSlots'
import { MessagesProvider } from '../i18n/MessagesContext'
import { format } from '../i18n/index'
import { ko } from '../i18n/ko'
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
  }
})

// ─── 픽스처 ────────────────────────────────────────────────────────────────
const CANVAS = { width: 900, height: 700 }
const MOUSE: MouseSettings = {
  shoulder: { x: 600, y: 480 },
  area: [
    { x: 200, y: 500 },
    { x: 300, y: 500 },
    { x: 300, y: 560 },
    { x: 200, y: 560 },
  ],
  hand: { x: 400, y: 560 },
  partPos: { x: 100, y: 200 },
  penPos: null,
  penMode: false,
}
const SETTINGS: Settings = {
  scale: 1.5,
  idleSeconds: 120,
  overlay: { x: 30, y: 40, visible: true },
  mouse: MOUSE,
  autostart: false,
  language: 'ko',
  positionLock: false,
  showInTaskbar: false,
  timer: DEFAULT_TIMER_SETTINGS, // contract v0.21(CR-045) 필수 필드
}
const kbDown = (index: number): AssetSlot => ({ kind: 'kb_down', index })
const entry = (slot: AssetSlot, w = 900, h = 700, v = ''): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width: w,
  height: h,
  bytes: 1000,
  url: `asset://${slotKey(slot)}.png${v}`,
})
/** 헤어 없음: 기본·타자 입력 1·팔 기본(사용자가 뒷머리를 비운 설치 — CR-053 첫 실행에는 hair 가 있다) */
const NO_HAIR: AssetManifest = {
  canvas: CANVAS,
  entries: [entry('kb_up'), entry(kbDown(0)), entry('mouse_base', 200, 150)],
}
/** 헤어 등록됨(캔버스와 같은 900×700 — 사용자 그림 또는 내장 기본) */
const HAIR: AssetManifest = { ...NO_HAIR, entries: [...NO_HAIR.entries, entry('hair')] }
const PATH = 'C:\\img\\hair.png'
const HAIR_MISMATCH: BridgeError = {
  code: 'asset.canvas_mismatch',
  message: '배경·뒷머리·키보드 그림은 모두 같은 크기여야 합니다. (현재 800×600, 캔버스 900×700)',
}
const HAIR_DESC = '장발의 뒷머리처럼 팔 뒤에 보일 부분. 본체와 함께 흔들립니다'
/** 기존 비우기 확인창 본문 — {name} = 뒷머리 */
const CLEAR_DESC = '‘뒷머리’ 그림을 지울까요? 되돌릴 수 없습니다.'
const IO_FAIL: BridgeError = { code: 'asset.io', message: '뒷머리 파일을 지우지 못했습니다. (테스트)' }
const GONE: BridgeError = { code: 'asset.not_found', message: 'hair.png 없음 (테스트)' }

const deferred = <T,>() => {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let onError: ReturnType<typeof vi.fn>
beforeEach(() => {
  vi.resetAllMocks()
  onError = vi.fn()
  vi.mocked(pickPngFile).mockResolvedValue(PATH)
  vi.mocked(setSettings).mockImplementation(async s => s)
})

// ─── 도우미 ────────────────────────────────────────────────────────────────
const tree = (m: AssetManifest, language?: string) => {
  const tab = <ImagesTab settings={SETTINGS} manifest={m} onError={onError} />
  return language ? <MessagesProvider language={language}>{tab}</MessagesProvider> : tab
}
const renderImages = (m: AssetManifest, language?: string) => {
  const utils = render(tree(m, language))
  return { ...utils, update: (nm: AssetManifest) => utils.rerender(tree(nm, language)) }
}
const region = () => screen.getByRole('region', { name: '이미지 설정' })
const card = (key: string) => screen.getByTestId(`slot-card-${key}`)
const hairChange = () => within(card('hair')).getByRole('button', { name: '뒷머리 이미지 변경' })
/** CR-053: 뒷머리 「기본값」 = 복원 칸(restoreImageAria) — CR-044 비우기 칸 이름 「뒷머리 그림 지우기」 대체 */
const hairRestore = () => within(card('hair')).getByRole('button', { name: '뒷머리 기본 그림으로 되돌리기' })
/** CR-053: 뒷머리 셋째 버튼 「비우기」(emptyImageAria) */
const hairEmpty = () => within(card('hair')).getByRole('button', { name: '뒷머리 그림 비우기' })
const cardIds = () =>
  Array.from(region().querySelectorAll<HTMLElement>('[data-testid^="slot-card-"], [data-testid^="add-card-"]')).map(
    e => e.dataset.testid,
  )
const slotCards = () => Array.from(region().querySelectorAll<HTMLElement>('[data-testid^="slot-card-"]'))
const cardButtons = () =>
  within(region())
    .getAllByRole('button')
    .filter(b => b.closest('[data-testid^="slot-card-"], [data-testid^="add-card-"]') !== null)
const dialog = () => screen.getByRole('alertdialog')
const follows = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
const srcs = () =>
  Array.from(screen.getByTestId('mouse-preview').querySelectorAll('img')).map(i => i.getAttribute('src'))
const slotSpecs = (m: AssetManifest) =>
  buildSlotGroups(m)
    .flatMap(g => g.cards)
    .filter((c): c is SlotCardSpec => c.type === 'slot')
/** 뒷머리 카드에 비우기 칸 이름(clearImageAria)의 「기본값」이 없음(CR-053 — 칸 종류 restore) */
const expectNoClearName = () => {
  expect(within(card('hair')).queryByRole('button', { name: '뒷머리 그림 지우기' })).toBeNull()
}
const expectNoOtherCalls = () => {
  expect(restoreDefaultAsset).not.toHaveBeenCalled()
  expect(setSettings).not.toHaveBeenCalled()
}

describe('헤어(뒷머리) 카드 (R-34, CR-037 · CR-053)', () => {
  it('TC-193 (CR-053 개정): 배경 그룹 둘째 카드 「뒷머리」 — 선택 배지·빈 문구·버튼 3개(이미지 변경·기본값·비우기), 「기본값」 = 복원 칸이라 비어 있어도 활성, 「비우기」는 비어 있으면 비활성, 등록되면 미리보기·「비우기」 활성', () => {
    const { update } = renderImages(NO_HAIR)
    // 위치: 배경 → 뒷머리 → 뽀모 캐릭터 → 뽀모 말풍선 → (키보드 그룹 제목) → 기본 (CR-045)
    expect(cardIds().slice(0, 5)).toEqual([
      'slot-card-background',
      'slot-card-hair',
      'slot-card-pomo_char',
      'slot-card-pomo_bubble',
      'slot-card-kb_up',
    ])
    const [h2Bg, h2Kb] = within(region()).getAllByRole('heading', { level: 2 })
    expect(h2Bg).toHaveTextContent('배경')
    expect(h2Kb).toHaveTextContent('키보드 (본체)')
    expect(follows(h2Bg, card('hair'))).toBe(true)
    expect(follows(card('hair'), h2Kb)).toBe(true)
    // 양식: 제목·설명(+title)·선택 배지·빈 미리보기
    const title = within(card('hair')).getByRole('heading', { level: 3 })
    expect(title).toHaveTextContent('뒷머리')
    expect(title).toHaveAttribute('title', '뒷머리')
    expect(card('hair').children[1]).toHaveTextContent(HAIR_DESC)
    expect(card('hair').children[1]).toHaveAttribute('title', HAIR_DESC)
    expect(within(card('hair')).getByText('선택')).toBeInTheDocument()
    expect(within(card('hair')).queryByText('필수')).toBeNull()
    expect(within(card('hair')).getByText('등록된 그림 없음')).toBeInTheDocument()
    expect(within(card('hair')).queryByText('필수 · 미등록')).toBeNull()
    expect(card('hair').querySelector('img')).toBeNull()
    // 단추: [이미지 변경, 기본값, 비우기] 3개(CR-053 — CR-044 M-2 버튼 2개 대체)
    expect(within(card('hair')).getAllByRole('button').map(b => b.textContent)).toEqual([
      '이미지 변경',
      '기본값',
      '비우기',
    ])
    expect(hairChange()).toBeEnabled()
    expect(hairRestore()).toHaveTextContent('기본값')
    expect(hairRestore()).toBeEnabled() // 복원 칸 — 빈 칸이어도 활성(CR-044 「비활성」 대체)
    expect(hairRestore()).not.toHaveAttribute('title')
    expect(hairEmpty()).toHaveTextContent('비우기')
    expect(hairEmpty()).toBeDisabled() // 비울 것이 없다(canEmpty = 등록)
    expectNoClearName()
    expect(hasBuiltinDefault('hair')).toBe(true) // contract v0.24 — 칸 종류의 출처
    // 등록된 매니페스트 수신(assets://changed 흉내)
    update(HAIR)
    const img = card('hair').querySelector('img')
    expect(img).toHaveAttribute('src', 'asset://hair.png')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('draggable', 'false')
    expect(within(card('hair')).queryByText('등록된 그림 없음')).toBeNull()
    expect(hairRestore()).toBeEnabled()
    expect(hairEmpty()).toBeEnabled()
    expect(hairEmpty()).not.toHaveAttribute('title')
    expectNoClearName()
    // 픽스처에 kb_down_0이 있어 키보드 그룹에 추가 카드 kb_down_1이 붙는다: 배경 4 + 키보드 12 + 팔 3 + 손 2 = 21
    expect(cardIds()).toHaveLength(21)
    expect(pickPngFile).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expectNoOtherCalls()
  })

  it("TC-194: 「뒷머리 이미지 변경」 → pickPngFile('PNG 이미지 선택') → importAsset('hair', 경로) 1회, 펜 확인창·설정 저장 없음", async () => {
    const imp = deferred<AssetManifest>()
    vi.mocked(importAsset).mockReturnValue(imp.promise)
    const { update } = renderImages(NO_HAIR)
    fireEvent.click(hairChange())
    expect(pickPngFile).toHaveBeenCalledTimes(1)
    expect(pickPngFile).toHaveBeenCalledWith('PNG 이미지 선택')
    await waitFor(() => expect(importAsset).toHaveBeenCalledTimes(1))
    expect(importAsset).toHaveBeenCalledWith('hair', PATH)
    for (const b of cardButtons()) expect(b).toBeDisabled() // 진행 중(slotBusy = 'hair')
    await act(async () => imp.resolve(HAIR))
    await waitFor(() => expect(hairChange()).toBeEnabled())
    update(HAIR)
    expect(card('hair').querySelector('img')).toHaveAttribute('src', 'asset://hair.png')
    expect(within(card('hair')).queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull() // R-30 펜 첫 등록 확인창과 무관(§3.1)
    expect(removeAsset).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expectNoOtherCalls()
  })

  it('TC-195: 이미지 변경 실패(asset.canvas_mismatch) → 뒷머리 카드 오류 띠(ko = core message, en = 사전 code 문구), 그림 없음 유지', async () => {
    vi.mocked(importAsset).mockRejectedValue(HAIR_MISMATCH)
    const { unmount } = renderImages(NO_HAIR)
    fireEvent.click(hairChange())
    await waitFor(() => expect(within(card('hair')).getByRole('alert')).toHaveTextContent(HAIR_MISMATCH.message))
    expect(card('hair').querySelector('img')).toBeNull()
    expect(hairChange()).toBeEnabled()
    expect(within(card('kb_up')).queryByRole('alert')).toBeNull()
    expect(importAsset).toHaveBeenCalledWith('hair', PATH)
    unmount()
    renderImages(NO_HAIR, 'en')
    const name = format(en.changeImageAria, { name: en.slots.hair.title })
    fireEvent.click(within(card('hair')).getByRole('button', { name }))
    await waitFor(() =>
      expect(within(card('hair')).getByRole('alert')).toHaveTextContent(en.errors['asset.canvas_mismatch']),
    )
    expect(en.errors['asset.canvas_mismatch']).toContain('back hair')
    expect(importAsset).toHaveBeenCalledTimes(2)
    expect(onError).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expectNoOtherCalls()
  })

  it("TC-196 (CR-053 개정): 「비우기」 → 비우기 확인창({name} = 뒷머리) — 취소·Esc 는 호출 없음·포커스 누른 「비우기」, 「지우기」 → removeAsset('hair') 1회·restoreDefaultAsset 0회, 응답 뒤 포커스 = 같은 카드 「이미지 변경」, 수신 뒤 빈 칸·「비우기」 비활성·「기본값」(복원) 활성", async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    const rm = deferred<AssetManifest>()
    vi.mocked(removeAsset).mockReturnValue(rm.promise)
    const { update } = renderImages(HAIR)
    const trigger = hairEmpty()
    // 취소
    fireEvent.click(trigger)
    let dlg = dialog()
    expect(dlg).toHaveAttribute('aria-modal', 'true')
    expect(dlg).toHaveAccessibleName('그림 지우기')
    expect(dlg).toHaveAccessibleDescription(CLEAR_DESC)
    expect(within(dlg).getAllByRole('button').map(b => b.textContent)).toEqual(['지우기', '취소'])
    expect(within(dlg).getByRole('button', { name: '지우기' }).className).toMatch(/danger/)
    expect(within(dlg).getByRole('button', { name: '취소' })).toHaveFocus()
    fireEvent.click(within(dlg).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(trigger).toHaveFocus()
    // Esc
    fireEvent.click(trigger)
    fireEvent.keyDown(document.activeElement ?? dialog(), { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(trigger).toHaveFocus()
    expect(removeAsset).not.toHaveBeenCalled()
    // 지우기
    fireEvent.click(trigger)
    dlg = dialog()
    fireEvent.click(within(dlg).getByRole('button', { name: '지우기' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(removeAsset).toHaveBeenCalledTimes(1))
    expect(removeAsset).toHaveBeenCalledWith('hair')
    for (const b of cardButtons()) expect(b).toBeDisabled() // 진행 중(slotBusy = 'hair')
    await act(async () => rm.resolve(NO_HAIR))
    // focusAfter 경로(§5 onConfirmClear `c.focusAfter ?? c.trigger`) — 응답 직후(수신 전) 같은 카드 「이미지 변경」
    await waitFor(() => expect(hairChange()).toHaveFocus())
    expect(card('hair').querySelector('img')).toHaveAttribute('src', 'asset://hair.png') // props 전에는 그대로
    update(NO_HAIR) // assets://changed 흉내
    expect(card('hair').querySelector('img')).toBeNull()
    expect(within(card('hair')).getByText('등록된 그림 없음')).toBeInTheDocument()
    expect(hairEmpty()).toBeDisabled()
    expect(hairRestore()).toBeEnabled() // 비운 뒤에도 내장 기본으로 되돌릴 수 있다
    expect(hairChange()).toHaveFocus() // 「이미지 변경」은 활성이라 포커스가 남는다
    expect(within(card('hair')).queryByRole('alert')).toBeNull()
    expect(removeAsset).toHaveBeenCalledTimes(1)
    expect(importAsset).not.toHaveBeenCalled()
    expect(pickPngFile).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(confirmSpy).not.toHaveBeenCalled()
    expectNoOtherCalls()
    confirmSpy.mockRestore()
  })
})

// ─── CR-038 R-35 → CR-044 M-2(삭제) → CR-053(복귀) · 뒷머리 「비우기」 버튼 — images-tab §11.2 ~ §11.7·§15 ───
// TC-204·TC-205(옛 「비우기」 취소·확정)는 폐기 그대로 — 같은 확인창·호출은 TC-196 이 덮는다.
describe('뒷머리 「기본값」 = 복원 · 「비우기」 버튼 (R-34 · R-35, CR-053)', () => {
  it('TC-200 (CR-043·CR-044·CR-053 개정): slotCard — EMPTYABLE_SLOT_KEYS = [hair, pomo_char], hair 는 resetKind restore·canReset 늘 true·emptyable true·canEmpty = 등록, kb_down_0 은 대상 아님 (예 3: hair 등록 / hair 미등록 / 다른 칸)', () => {
    expect([...EMPTYABLE_SLOT_KEYS]).toEqual(['hair', 'pomo_char']) // CR-053: CR-044 ['kb_down_0'] 대체
    // 예 1: hair 등록 — 「기본값」(복원)·「비우기」 모두 활성
    expect(slotCard(HAIR, 'hair', 'hair', null)).toMatchObject({
      key: 'hair',
      emptyable: true,
      canEmpty: true,
      resetKind: 'restore',
      canReset: true,
      lastOnlyBlocked: false,
    })
    // 예 2: hair 미등록 — 「기본값」(복원)은 활성, 비울 것이 없어 「비우기」만 비활성
    expect(slotCard(NO_HAIR, 'hair', 'hair', null)).toMatchObject({
      emptyable: true,
      canEmpty: false,
      resetKind: 'restore',
      canReset: true,
    })
    // 예 3: 다른 칸 — 등록 여부·칸 종류와 무관하게 false
    expect(slotCard(HAIR, 'kb_up', 'kb_up', null)).toMatchObject({ emptyable: false, canEmpty: false })
    expect(slotCard(HAIR, 'background', 'background', null)).toMatchObject({ emptyable: false, canEmpty: false })
    expect(slotCard(HAIR, 'mouse_base', 'mouse_base', null)).toMatchObject({ emptyable: false, canEmpty: false })
    expect(slotCard(HAIR, 'idle', 'idle', null)).toMatchObject({ emptyable: false, canEmpty: false })
    expect(slotCard(HAIR, 'mouse_left', 'mouse_left', null)).toMatchObject({ emptyable: false, canEmpty: false })
    // CR-053: kb_down_0 은 「비우기」 대상에서 빠졌다(「기본값」 자체가 비우기 — resetKind clear)
    expect(slotCard(HAIR, kbDown(0), 'kb_down', 1)).toMatchObject({
      emptyable: false,
      canEmpty: false,
      resetKind: 'clear',
      canReset: true,
    })
    // buildSlotGroups 도 같은 규칙 — emptyable 은 두 카드, canEmpty 는 등록된 hair 뿐(pomo_char 미등록)
    expect(slotSpecs(HAIR).filter(c => c.emptyable).map(c => c.key)).toEqual(['hair', 'pomo_char'])
    expect(slotSpecs(HAIR).filter(c => c.canEmpty).map(c => c.key)).toEqual(['hair'])
    expect(slotSpecs(NO_HAIR).filter(c => c.emptyable).map(c => c.key)).toEqual(['hair', 'pomo_char'])
    expect(slotSpecs(NO_HAIR).filter(c => c.canEmpty).map(c => c.key)).toEqual([])
    // 추가 카드(type 'add')에는 필드가 없다(§11.3)
    const adds = buildSlotGroups(HAIR)
      .flatMap(g => g.cards)
      .filter((c: CardSpec) => c.type === 'add')
    expect(adds.length).toBeGreaterThan(0) // kb_down_1
    for (const a of adds) expect('emptyable' in a, a.key).toBe(false)
  })

  it('TC-201 (CR-044·CR-053 개정): 뒷머리 카드 버튼 3개(이미지 변경 → 기본값 → 비우기)·두 줄 배치(cardEmptyable·actions2), 셋째 버튼은 뒷머리·뽀모도 인물 카드뿐', () => {
    renderImages(HAIR)
    const btns = within(card('hair')).getAllByRole('button')
    expect(btns.map(b => b.textContent)).toEqual(['이미지 변경', '기본값', '비우기'])
    expect(btns.map(b => b.getAttribute('aria-label'))).toEqual([
      '뒷머리 이미지 변경',
      '뒷머리 기본 그림으로 되돌리기',
      '뒷머리 그림 비우기',
    ])
    for (const b of btns) {
      expect(b).toBeEnabled()
      expect(b).toHaveAttribute('type', 'button')
    }
    expect(btns[1]).toBe(hairRestore())
    expect(btns[2]).toBe(hairEmpty())
    expectNoClearName()
    // 두 줄 배치(§11.2 — CR-053 이 CR-044 M-2 「한 줄」 대체): 카드 cardEmptyable, 버튼 셋이 한 부모(actions2), 「비우기」 = outline 재사용
    expect(card('hair').className).toMatch(/cardEmptyable/)
    expect(btns[0].parentElement).toBe(btns[1].parentElement)
    expect(btns[0].parentElement).toBe(btns[2].parentElement)
    expect(btns[0].parentElement?.className).toMatch(/actions2/)
    expect(btns[2].className).toBe(btns[1].className)
    for (const cls of card('kb_up').className.split(' ').filter(Boolean)) {
      expect(card('hair').classList.contains(cls), cls).toBe(true) // 기본 카드 클래스 + cardEmptyable
    }
    // 뽀모도 인물 카드도 같은 양식(CR-053) — HAIR 에는 pomo_char 가 없어 「비우기」 비활성
    const pomo = within(card('pomo_char')).getAllByRole('button')
    expect(pomo.map(b => b.getAttribute('aria-label'))).toEqual([
      '뽀모도 인물 이미지 변경',
      '뽀모도 인물 기본 그림으로 되돌리기',
      '뽀모도 인물 그림 비우기',
    ])
    expect(pomo[2]).toBeDisabled()
    expect(card('pomo_char').className).toMatch(/cardEmptyable/)
    // 다른 슬롯 카드 18장(슬롯 카드 20 − 뒷머리 − 뽀모도 인물): 버튼 2개, 한 줄 배치 — 「타자 입력 1」 포함(CR-053)
    const others = slotCards().filter(
      c => c.dataset.testid !== 'slot-card-hair' && c.dataset.testid !== 'slot-card-pomo_char',
    )
    expect(others).toHaveLength(18)
    for (const c of others) {
      const cb = within(c).getAllByRole('button')
      expect(cb.map(b => b.textContent), c.dataset.testid).toEqual(['이미지 변경', '기본값'])
      expect(c.className, c.dataset.testid).not.toMatch(/cardEmptyable/)
      expect(cb[0].parentElement?.className ?? '', c.dataset.testid).not.toMatch(/actions2/)
    }
    // 화면 전체 「… 그림 비우기」 = 뒷머리·뽀모도 인물 2개(CR-044 「타자 입력 1」 하나 대체)
    const empties = within(region()).getAllByRole('button', { name: /그림 비우기$/ })
    expect(empties.map(b => b.closest('article')?.dataset.testid)).toEqual(['slot-card-hair', 'slot-card-pomo_char'])
    expect(slotSpecs(HAIR).find(c => c.key === 'hair')).toMatchObject({ emptyable: true, canEmpty: true })
    expect(pickPngFile).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expectNoOtherCalls()
  })

  it('TC-202 (CR-044·CR-053 개정): 활성 규칙 — 미등록이면 「기본값」(복원) 활성·「비우기」 비활성(눌러도 확인창 없음), 등록되면 둘 다 활성, 다른 카드 작업 중(slotBusy)에는 둘 다 비활성·확인창 없음', async () => {
    const imp = deferred<AssetManifest>()
    vi.mocked(importAsset).mockReturnValue(imp.promise)
    const { update } = renderImages(NO_HAIR)
    expect(hairRestore()).toBeEnabled()
    expect(hairRestore()).not.toHaveAttribute('title')
    expect(hairEmpty()).toBeDisabled()
    expect(hairEmpty()).not.toHaveAttribute('title')
    expect(hairChange()).toBeEnabled()
    fireEvent.click(hairEmpty())
    expect(screen.queryByRole('alertdialog')).toBeNull()
    // 등록 수신 → 둘 다 활성
    update(HAIR)
    expect(hairRestore()).toBeEnabled()
    expect(hairEmpty()).toBeEnabled()
    // 다른 카드(kb_up) 가져오기 진행 중 — 모든 카드 버튼과 함께 비활성
    fireEvent.click(within(card('kb_up')).getByRole('button', { name: '기본 이미지 변경' }))
    await waitFor(() => expect(importAsset).toHaveBeenCalledTimes(1))
    expect(importAsset).toHaveBeenCalledWith('kb_up', PATH)
    expect(hairRestore()).toBeDisabled()
    expect(hairEmpty()).toBeDisabled()
    fireEvent.click(hairEmpty())
    fireEvent.click(hairRestore())
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await act(async () => imp.resolve(HAIR))
    await waitFor(() => expect(hairEmpty()).toBeEnabled())
    expect(hairRestore()).toBeEnabled()
    expect(removeAsset).not.toHaveBeenCalled()
    expectNoOtherCalls()
  })

  it('TC-203: 사전 — emptyImage·emptyImageAria 3개 국어(i18n §4.8), 치환 결과, 「기본값」·다른 버튼 이름과 구분', () => {
    expect(ko.emptyImage).toBe('비우기')
    expect(ko.emptyImageAria).toBe('{name} 그림 비우기')
    expect(ja.emptyImage).toBe('削除')
    expect(ja.emptyImageAria).toBe('{name}の画像を削除')
    expect(en.emptyImage).toBe('Clear')
    expect(en.emptyImageAria).toBe('Clear image: {name}')
    expect(format(ko.emptyImageAria, { name: ko.slots.hair.title })).toBe('뒷머리 그림 비우기')
    expect(format(ja.emptyImageAria, { name: ja.slots.hair.title })).toBe('後ろ髪の画像を削除')
    expect(format(en.emptyImageAria, { name: en.slots.hair.title })).toBe('Clear image: Back hair')
    for (const d of [ko, ja, en]) {
      expect(d.emptyImage).not.toBe(d.clearImage) // 두 줄 카드 아랫줄 두 버튼 글자 구분(CR-053: 뒷머리·뽀모도 인물 카드)
      expect(d.emptyImageAria).not.toBe(d.restoreImageAria)
      expect(d.emptyImageAria).not.toBe(d.changeImageAria)
    }
    expect(ko.emptyImageAria).not.toBe(ko.clearImageAria) // ko 「지우기」(비우기 칸 「기본값」) ≠ 「비우기」
  })

  it('TC-206 (CR-044·CR-053 개정): 「비우기」 실패 → 뒷머리 카드 오류 띠(ko = core message, en = 사전 code 문구), 그림 그대로·「비우기」 다시 활성·포커스 「이미지 변경」(N-1)', async () => {
    vi.mocked(removeAsset).mockRejectedValueOnce(IO_FAIL).mockRejectedValueOnce(GONE)
    const { unmount } = renderImages(HAIR)
    fireEvent.click(hairEmpty())
    fireEvent.click(within(dialog()).getByRole('button', { name: '지우기' }))
    await waitFor(() => expect(within(card('hair')).getByRole('alert')).toHaveTextContent(IO_FAIL.message))
    expect(card('hair').querySelector('img')).toHaveAttribute('src', 'asset://hair.png')
    await waitFor(() => expect(hairEmpty()).toBeEnabled())
    expect(hairRestore()).toBeEnabled()
    expect(hairChange()).toBeEnabled()
    // onConfirmClear 가 호출 전에 focusAfter(같은 카드 「이미지 변경」)를 넣는다 — 관리자 결정 N-1
    await waitFor(() => expect(hairChange()).toHaveFocus())
    expect(within(card('kb_up')).queryByRole('alert')).toBeNull()
    expect(removeAsset).toHaveBeenCalledWith('hair')
    unmount()
    // en — errorText 가 code 문구를 고른다
    renderImages(HAIR, 'en')
    const name = en.slots.hair.title
    fireEvent.click(within(card('hair')).getByRole('button', { name: format(en.emptyImageAria, { name }) }))
    fireEvent.click(within(dialog()).getByRole('button', { name: en.confirmClearOk }))
    await waitFor(() =>
      expect(within(card('hair')).getByRole('alert')).toHaveTextContent(en.errors['asset.not_found']),
    )
    expect(removeAsset).toHaveBeenCalledTimes(2)
    expect(vi.mocked(removeAsset).mock.calls.every(c => c[0] === 'hair')).toBe(true)
    expect(onError).not.toHaveBeenCalled()
    expectNoOtherCalls()
  })

  it('TC-207 (CR-044·CR-053 개정): ja·en — 뒷머리 카드 버튼 3개 글자·「기본값」 aria(restoreImageAria)·「비우기」 aria(emptyImageAria)·복원/비우기 확인창 문구가 그 언어 사전 값, 취소 뒤 누른 버튼으로 포커스', () => {
    for (const [lang, d] of [
      ['ja', ja],
      ['en', en],
    ] as const) {
      const { unmount } = renderImages(HAIR, lang)
      const name = d.slots.hair.title
      const btns = within(card('hair')).getAllByRole('button')
      expect(btns.map(b => b.textContent), lang).toEqual([d.changeImage, d.clearImage, d.emptyImage])
      expect(btns[1], lang).toHaveAccessibleName(format(d.restoreImageAria, { name }))
      expect(btns[2], lang).toHaveAccessibleName(format(d.emptyImageAria, { name }))
      // 「기본값」 → 복원 확인창
      fireEvent.click(btns[1])
      let dlg = dialog()
      expect(dlg, lang).toHaveAccessibleName(d.confirmRestoreTitle)
      expect(dlg, lang).toHaveAccessibleDescription(format(d.confirmRestoreMessage, { name }))
      expect(within(dlg).getAllByRole('button').map(b => b.textContent), lang).toEqual([
        d.confirmRestoreOk,
        d.confirmCancel,
      ])
      fireEvent.click(within(dlg).getByRole('button', { name: d.confirmCancel }))
      expect(screen.queryByRole('alertdialog')).toBeNull()
      expect(btns[1], lang).toHaveFocus()
      // 「비우기」 → 비우기 확인창
      fireEvent.click(btns[2])
      dlg = dialog()
      expect(dlg, lang).toHaveAccessibleName(d.confirmClearTitle)
      expect(dlg, lang).toHaveAccessibleDescription(format(d.confirmClearMessage, { name }))
      expect(within(dlg).getAllByRole('button').map(b => b.textContent), lang).toEqual([
        d.confirmClearOk,
        d.confirmCancel,
      ])
      expect(within(dlg).getByRole('button', { name: d.confirmCancel }), lang).toHaveFocus()
      fireEvent.click(within(dlg).getByRole('button', { name: d.confirmCancel }))
      expect(screen.queryByRole('alertdialog')).toBeNull()
      expect(btns[2], lang).toHaveFocus()
      unmount()
    }
    expect(removeAsset).not.toHaveBeenCalled()
    expectNoOtherCalls()
  })
})

// TC-FLOW-19(S-18 — 기본 뒷머리를 비웠다가 되돌림)는 CR-044 M-3 으로 폐기 — CR-053 에서도 번호를 되살리지 않는다(설계 확인 필요 보고).
describe('TC-FLOW (S-17, R-34)', () => {
  it('TC-FLOW-18 (CR-044·CR-053 개정): S-17 — 뒷머리 PNG 를 넣고 카드로 확인 → 미리보기 맨 아래 → 필요 없어져 「비우기」로 없애면 미리보기에서도 사라짐', async () => {
    vi.mocked(importAsset).mockResolvedValue(HAIR)
    vi.mocked(removeAsset).mockResolvedValue(NO_HAIR)
    // Step 1 · TC-194(이미지 변경·인자 부분) → TC-193(등록 뒤 표시 부분)
    const images = renderImages(NO_HAIR)
    fireEvent.click(hairChange())
    await waitFor(() => expect(importAsset).toHaveBeenCalledWith('hair', PATH))
    await waitFor(() => expect(hairChange()).toBeEnabled())
    images.update(HAIR) // 응답 매니페스트 = 다음 Step 의 Given
    expect(card('hair').querySelector('img')).toHaveAttribute('src', 'asset://hair.png')
    expect(hairEmpty()).toBeEnabled()
    images.unmount()
    // Step 2 · TC-198(미리보기 합성 순서 부분) — 같은 매니페스트로 어깨축·손 위치 탭
    const mouse = render(<MousePartsTab settings={SETTINGS} manifest={HAIR} onError={onError} />)
    expect(srcs()).toEqual(['asset://hair.png', 'asset://mouse_base.png', 'asset://kb_up.png'])
    mouse.unmount()
    // Step 3 · TC-196(「비우기」 → 비우기 확인 → removeAsset('hair')·포커스 「이미지 변경」 부분) — CR-053: 「기본값」(비우기) 단계 대체
    const again = renderImages(HAIR)
    fireEvent.click(hairEmpty())
    expect(dialog()).toHaveAccessibleDescription(CLEAR_DESC)
    fireEvent.click(within(dialog()).getByRole('button', { name: '지우기' }))
    await waitFor(() => expect(removeAsset).toHaveBeenCalledWith('hair'))
    await waitFor(() => expect(hairChange()).toHaveFocus())
    again.update(NO_HAIR) // 응답 매니페스트 = 다음 Step 의 Given
    expect(card('hair').querySelector('img')).toBeNull()
    expect(hairEmpty()).toBeDisabled()
    expect(hairRestore()).toBeEnabled()
    again.unmount()
    // Step 4 · TC-198(헤어 없으면 미렌더 부분)
    render(<MousePartsTab settings={SETTINGS} manifest={NO_HAIR} onError={onError} />)
    expect(srcs()).toEqual(['asset://mouse_base.png', 'asset://kb_up.png'])
    expect(importAsset).toHaveBeenCalledTimes(1)
    expect(removeAsset).toHaveBeenCalledTimes(1)
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })
})
