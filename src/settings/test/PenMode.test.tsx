/**
 * 「펜 손 사용」 토글·pen_up 첫 등록 확인창 스펙 — CR-033 · R-29 · R-30 (R-25 손 그룹 · R-20 문구).
 * 기준: src/settings/design/images-tab.md §9(9.1 ~ 9.7 — I-5 · I-5′ · I-6 · I-7, 결정 ① ~ ③) · §2 `ConfirmDialog` tone
 *       · design/i18n.md §4.3(CR-033 새 키 11개·pen_up 설명 교체) · contract v0.15 §3.3 `MouseSettings.penMode`
 *       · requirements.md v1.9 R-29 · R-30 · S-13 · scenarios.md TC-159 ~ TC-176 · TC-FLOW-14.
 * bridge 는 mock(vi.mock('bridge/commands')) — toBridgeError 만 실물. `bridge/types`(DEFAULT_MOUSE_SETTINGS·slotKey)와
 * `state/mouseMapping`(resolvePenPos — ImagesTab 이 import)은 실물.
 * settings://changed · assets://changed 는 props 재렌더(update)로 흉내 낸다. 토글 표시는 수신으로만 바뀐다(로컬 선반영 없음).
 * 시간 의존 없음(가짜 시계 불필요). 대기는 결정적 조건(waitFor + 활성/호출 횟수)만.
 * 선행: CR-033 화면(PenModePanel · ConfirmDialog tone · isFirstPenUp · savePenMode …) + bridge v0.15(penMode) 소스 반영.
 *       미적용이면 import·타입 오류로 예정된 FAIL(TDD Red).
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetEntry, AssetManifest, AssetSlot, BridgeError, MouseSettings, Settings } from 'bridge/types'
import { DEFAULT_MOUSE_SETTINGS, DEFAULT_TIMER_SETTINGS, slotKey } from 'bridge/types'
import { importAsset, pickPngFile, removeAsset, setSettings } from 'bridge/commands'
import ImagesTab from '../components/ImagesTab'
import ConfirmDialog from '../components/ConfirmDialog'
import { isFirstPenUp } from '../imageSlots'
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
const withMouse = (m: Partial<MouseSettings>): Settings => ({ ...SETTINGS, mouse: { ...MOUSE, ...m } })
/** 저장값 penMode true */
const ON = withMouse({ penMode: true })
/** pen_up 100×80 중심 = hand (400,560) → (350,520) · hand null 이면 기본 이동 영역 중심 (435,575) → (385,535) */
const PEN_HOME = { x: 350, y: 520 }

const penDown = (index: number): AssetSlot => ({ kind: 'pen_down', index })
const entry = (slot: AssetSlot, w = 900, h = 700): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width: w,
  height: h,
  bytes: 1000,
  url: `asset://${slotKey(slot)}.png`,
})
/** pen_up 없음 */
const BASIC: AssetManifest = {
  canvas: CANVAS,
  entries: [entry('body'), entry('kb_up'), entry({ kind: 'kb_down', index: 0 }), entry('mouse_base', 200, 150)],
}
/** pen_up 100×80 등록 */
const WITH_PEN: AssetManifest = { ...BASIC, entries: [...BASIC.entries, entry('pen_up', 100, 80)] }
const PATH = 'C:\\img\\pen.png'
const SAVE_ERR: BridgeError = { code: 'settings.io', message: '설정 파일을 읽거나 쓸 수 없습니다: 거부' }

/**
 * design/i18n.md §4.3 CR-033 표 11행(penModeLabel ~ penFirstNo) ko 열.
 * CR-042(R-39): penModeNoteOn·penEnableMessage·penFirstMessage 3행에 「특수 키를 누를 때만 특수 키 그림으로 바뀝니다」 반영.
 */
const KO_PEN = {
  penModeLabel: '펜 손 사용',
  penModeDesc: '「손 기본」 그림을 등록해야 켤 수 있습니다.',
  penModeNoteOn:
    'ON: 팔 끝에 붙은 손 그림이 키보드 입력과 클릭 때마다 바뀌고, 키보드 그림은 기본 그림에 고정되며 특수 키를 누를 때만 특수 키 그림으로 바뀝니다.',
  penModeNoteOff: 'OFF: 손 그림은 팔 끝에 붙어 따라다니기만 하고, 키보드 입력은 키보드 그림으로 보여 줍니다.',
  penEnableTitle: '펜 손 사용 켜기',
  penEnableMessage:
    '켜면 팔 끝에 붙은 손 그림이 키보드 입력과 클릭 때마다 바뀌고, 키보드 그림은 기본 그림에 고정되며 특수 키를 누를 때만 특수 키 그림으로 바뀝니다. 켤까요?',
  penEnableOk: '켜기',
  penFirstTitle: '펜 손 모드',
  penFirstMessage:
    '펜 손 모드를 켤까요? 켜면 팔 끝에 붙은 손 그림이 키보드 입력과 클릭 때마다 바뀌고, 키보드 그림은 기본 그림에 고정되며 특수 키를 누를 때만 특수 키 그림으로 바뀝니다.',
  penFirstYes: '예',
  penFirstNo: '아니요',
}

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
const tree = (s: Settings, m: AssetManifest, language?: string) => {
  const tab = <ImagesTab settings={s} manifest={m} onError={onError} />
  return language ? <MessagesProvider language={language}>{tab}</MessagesProvider> : tab
}
const renderPen = (m: AssetManifest, s: Settings = SETTINGS, language?: string) => {
  const utils = render(tree(s, m, language))
  return { ...utils, update: (nm: AssetManifest, ns: Settings = s) => utils.rerender(tree(ns, nm, language)) }
}
const region = () => screen.getByRole('region', { name: '이미지 설정' })
const toggle = () => screen.getByRole('switch', { name: KO_PEN.penModeLabel })
const note = () => document.getElementById('pen-mode-note') as HTMLElement
const noteTexts = () => Array.from(note().querySelectorAll('p')).map(p => p.textContent)
const dialog = () => screen.getByRole('alertdialog')
const card = (key: string) => screen.getByTestId(`slot-card-${key}`)
const changeBtn = (key: string, name: string) =>
  within(card(key)).getByRole('button', { name: `${name} 이미지 변경` })
const penUpChange = () => changeBtn('pen_up', '손 기본')
const follows = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
const call = (i: number) => vi.mocked(setSettings).mock.calls[i][0]
/** pen_up 첫 등록을 일으키고 확인창을 기다린 뒤, assets://changed(WITH_PEN)를 흉내 낸다 */
const firstRegister = async (update: (nm: AssetManifest, ns?: Settings) => void, s?: Settings) => {
  fireEvent.click(penUpChange())
  const dlg = await screen.findByRole('alertdialog')
  update(WITH_PEN, s)
  return dlg
}

// ─── 순수 함수 ──────────────────────────────────────────────────────────────
describe('isFirstPenUp (images-tab.md §9.4, R-30)', () => {
  it('TC-159: isFirstPenUp — 빈→등록 true, 교체 false, pen_down_0 등록 false, 지운 뒤 재등록 true, 결과에 없음·다른 슬롯 false', () => {
    expect(isFirstPenUp('pen_up', BASIC, WITH_PEN)).toBe(true)
    expect(isFirstPenUp('pen_up', WITH_PEN, WITH_PEN)).toBe(false)
    const penDown0: AssetManifest = { ...BASIC, entries: [...BASIC.entries, entry(penDown(0), 100, 80)] }
    expect(isFirstPenUp(penDown(0), BASIC, penDown0)).toBe(false)
    expect(isFirstPenUp(penDown(0), BASIC, WITH_PEN)).toBe(false) // 결과에 pen_up 이 있어도 슬롯이 pen_up 이 아니면 false
    const removed: AssetManifest = { ...WITH_PEN, entries: WITH_PEN.entries.filter(e => e.slot !== 'pen_up') }
    expect(isFirstPenUp('pen_up', removed, WITH_PEN)).toBe(true) // 결정 ③
    expect(isFirstPenUp('pen_up', BASIC, BASIC)).toBe(false)
    expect(isFirstPenUp('kb_up', BASIC, WITH_PEN)).toBe(false)
  })
})

// ─── 토글 표시·안내 상자 (R-29, §9.1 ~ §9.3) ─────────────────────────────────
describe('PenModePanel — 표시 (R-29)', () => {
  it('TC-160: pen_up 없음 → 토글 비활성·꺼짐 표시(저장값 penMode true 여도), 설명 = penModeDesc, 눌러도 확인창·저장 없음', () => {
    const r = renderPen(BASIC, ON)
    expect(toggle()).toBeDisabled()
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    expect(toggle()).toHaveAccessibleDescription(KO_PEN.penModeDesc)
    fireEvent.click(toggle())
    expect(screen.queryByRole('alertdialog')).toBeNull()
    r.update(BASIC, SETTINGS)
    expect(toggle()).toBeDisabled()
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    r.unmount()
    renderPen({ canvas: null, entries: [] }, ON)
    expect(toggle()).toBeDisabled()
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-161 (CR-035 개정): pen_up 있음 → 활성·aria-checked = penMode(수신으로만 바뀜), pen_up 이 매니페스트에서 사라지면(I-7 — 「기본값」은 이제 복원이라 외부 수신으로 흉내) 비활성·꺼짐 표시, 저장값은 건드리지 않음', async () => {
    const { update } = renderPen(WITH_PEN, SETTINGS)
    expect(toggle()).toBeEnabled()
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    update(WITH_PEN, ON) // settings://changed
    expect(toggle()).toBeEnabled()
    expect(toggle()).toHaveAttribute('aria-checked', 'true')
    // CR-035(R-32): pen_up 「기본값」은 복원 칸 — 비우기 aria-label 은 없다
    expect(within(card('pen_up')).queryByRole('button', { name: '손 기본 그림 지우기' })).toBeNull()
    expect(within(card('pen_up')).getByRole('button', { name: '손 기본 기본 그림으로 되돌리기' })).toBeEnabled()
    update(BASIC, ON) // assets://changed(외부에서 pen_up 이 사라짐) — 저장값 penMode 는 true 그대로(결정 ②)
    await waitFor(() => expect(toggle()).toBeDisabled())
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    update(WITH_PEN, ON) // 외부에서 다시 들어오면 저장값대로 켜짐 표시(확인창은 onChangeImage·복원 경로에서만)
    expect(toggle()).toHaveAttribute('aria-checked', 'true')
    expect(removeAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-162: 안내 상자는 비활성·꺼짐·켜짐 모두 두 줄 그대로 보이고, 손 그룹 제목과 카드 격자 사이 한 곳뿐, 포커스 대상 아님', () => {
    const { update } = renderPen(BASIC, SETTINGS)
    const check = () => {
      expect(note()).toBeVisible()
      expect(noteTexts()).toEqual([KO_PEN.penModeNoteOn, KO_PEN.penModeNoteOff])
      expect(note()).not.toHaveAttribute('tabindex')
      expect(note().querySelector('button, input, [tabindex]')).toBeNull()
    }
    check() // 비활성
    update(WITH_PEN, SETTINGS)
    check() // 꺼짐
    update(WITH_PEN, ON)
    check() // 켜짐
    const handH2 = within(region()).getByRole('heading', { level: 2, name: '손 (펜)' })
    const armLast = card('mouse_right')
    expect(follows(armLast, handH2)).toBe(true)
    expect(follows(handH2, toggle())).toBe(true)
    expect(follows(toggle(), note())).toBe(true)
    expect(follows(note(), card('pen_up'))).toBe(true)
    expect(within(region()).getAllByRole('switch')).toHaveLength(1)
    expect(document.querySelectorAll('#pen-mode-note')).toHaveLength(1)
    expect(setSettings).not.toHaveBeenCalled()
  })
})

// ─── 토글 조작 (I-5 · I-5′) ─────────────────────────────────────────────────
describe('PenModePanel — 켜기·끄기 (R-29, I-5 · I-5′)', () => {
  it('TC-163: 꺼짐 → 토글 → 확인창(penEnable*, 강조색, 포커스 「취소」) → 「켜기」 → setSettings 1회 penMode true(penPos 그대로) → 저장 중 busy → onError(null)·포커스 토글, 표시는 수신 뒤', async () => {
    const save = deferred<Settings>()
    vi.mocked(setSettings).mockReturnValueOnce(save.promise)
    const { update } = renderPen(WITH_PEN, SETTINGS)
    fireEvent.click(toggle())
    const dlg = dialog()
    expect(dlg).toHaveAttribute('aria-modal', 'true')
    expect(dlg).toHaveAccessibleName(KO_PEN.penEnableTitle)
    expect(dlg).toHaveAccessibleDescription(KO_PEN.penEnableMessage)
    const ok = within(dlg).getByRole('button', { name: KO_PEN.penEnableOk })
    expect(within(dlg).getByRole('button', { name: '취소' })).toHaveFocus()
    expect(ok.className).toMatch(/accent/)
    expect(ok.className).not.toMatch(/danger/)
    expect(setSettings).not.toHaveBeenCalled()
    fireEvent.click(ok)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(call(0)).toStrictEqual({ ...SETTINGS, mouse: { ...MOUSE, penMode: true } }) // penPos null 그대로(size null)
    await waitFor(() => expect(toggle()).toHaveAttribute('aria-busy', 'true'))
    expect(toggle()).toBeDisabled()
    expect(toggle()).toHaveAttribute('aria-checked', 'false') // 로컬 선반영 없음
    fireEvent.click(toggle()) // 저장 중 연타 무시
    expect(setSettings).toHaveBeenCalledTimes(1)
    await act(async () => save.resolve(ON))
    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(toggle()).not.toHaveAttribute('aria-busy')
    expect(toggle()).toHaveFocus()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(null)
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    update(WITH_PEN, ON) // settings://changed
    expect(toggle()).toHaveAttribute('aria-checked', 'true')
  })

  it('TC-164: 켜기 확인창 「취소」·Esc → 호출 없음·포커스 토글·꺼짐 유지, 배경막 클릭으로는 닫히지 않음', () => {
    renderPen(WITH_PEN, SETTINGS)
    fireEvent.click(toggle())
    fireEvent.click(within(dialog()).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(toggle()).toHaveFocus()
    fireEvent.click(toggle())
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(toggle()).toHaveFocus()
    fireEvent.click(toggle())
    fireEvent.click(dialog().parentElement as HTMLElement)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-165: 켜짐 → 토글 → 확인창 없이 setSettings 1회 penMode false(penPos 그대로) → onError(null), 표시는 수신 뒤', async () => {
    const placed = withMouse({ penMode: true, penPos: { x: 10, y: 20 } })
    const { update } = renderPen(WITH_PEN, placed)
    expect(toggle()).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(toggle())
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(call(0)).toStrictEqual({ ...placed, mouse: { ...MOUSE, penMode: false, penPos: { x: 10, y: 20 } } })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    expect(toggle()).toHaveAttribute('aria-checked', 'true') // 수신 전
    update(WITH_PEN, withMouse({ penMode: false, penPos: { x: 10, y: 20 } }))
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
  })

  it('TC-166: 토글 저장 실패(끄기·켜기) → onError(BridgeError)(창 오류 줄), 토글 원래 값·다시 활성, 카드 오류 없음', async () => {
    vi.mocked(setSettings).mockRejectedValue(SAVE_ERR)
    const r = renderPen(WITH_PEN, ON)
    fireEvent.click(toggle()) // 끄기
    await waitFor(() => expect(onError).toHaveBeenCalledWith(SAVE_ERR))
    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(toggle()).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('alert')).toBeNull()
    r.unmount()
    renderPen(WITH_PEN, SETTINGS)
    fireEvent.click(toggle()) // 켜기
    fireEvent.click(within(dialog()).getByRole('button', { name: KO_PEN.penEnableOk }))
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2))
    expect(onError).toHaveBeenLastCalledWith(SAVE_ERR)
    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(onError).not.toHaveBeenCalledWith(null)
  })

  it('TC-167: 카드 등록 진행 중(slotBusy)에는 토글 비활성·눌러도 무시, 끝나면 다시 활성', async () => {
    const imp = deferred<AssetManifest>()
    vi.mocked(importAsset).mockReturnValue(imp.promise)
    renderPen(WITH_PEN, SETTINGS)
    fireEvent.click(changeBtn('kb_up', '기본'))
    await waitFor(() => expect(importAsset).toHaveBeenCalledTimes(1))
    expect(toggle()).toBeDisabled()
    fireEvent.click(toggle())
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await act(async () => imp.resolve(WITH_PEN))
    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(setSettings).not.toHaveBeenCalled()
  })
})

// ─── pen_up 첫 등록 (I-6, R-30) ─────────────────────────────────────────────
describe('ImagesTab — pen_up 첫 등록 확인창 (R-30, I-6)', () => {
  it('TC-168: 첫 등록 → 확인창(penFirst*, 강조색, 포커스 「아니요」), 대답 전 저장 0회 → 「예」 → setSettings 1회 {penMode true, penPos = resolvePenPos} → 포커스 토글', async () => {
    const save = deferred<Settings>()
    vi.mocked(importAsset).mockResolvedValue(WITH_PEN)
    vi.mocked(setSettings).mockReturnValueOnce(save.promise)
    const { update } = renderPen(BASIC, SETTINGS)
    const dlg = await firstRegister(update)
    expect(importAsset).toHaveBeenCalledWith('pen_up', PATH)
    expect(dlg).toHaveAccessibleName(KO_PEN.penFirstTitle)
    expect(dlg).toHaveAccessibleDescription(KO_PEN.penFirstMessage)
    const yes = within(dlg).getByRole('button', { name: KO_PEN.penFirstYes })
    expect(within(dlg).getByRole('button', { name: KO_PEN.penFirstNo })).toHaveFocus()
    expect(yes.className).toMatch(/accent/)
    expect(setSettings).not.toHaveBeenCalled() // ensurePenPos 를 부르지 않는다
    await waitFor(() => expect(changeBtn('kb_up', '기본')).toBeEnabled()) // slotBusy 해제
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(yes)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(call(0)).toStrictEqual({ ...SETTINGS, mouse: { ...MOUSE, penMode: true, penPos: PEN_HOME } })
    expect(vi.mocked(importAsset).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(setSettings).mock.invocationCallOrder[0],
    )
    await act(async () => save.resolve(withMouse({ penMode: true, penPos: PEN_HOME })))
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(toggle()).toHaveFocus()
    update(WITH_PEN, withMouse({ penMode: true, penPos: PEN_HOME }))
    expect(toggle()).toHaveAttribute('aria-checked', 'true')
    expect(setSettings).toHaveBeenCalledTimes(1)
  })

  it('TC-169: 첫 등록 「아니요」·Esc → 각각 setSettings 1회 {penMode false, penPos = resolvePenPos}, 포커스 토글', async () => {
    vi.mocked(importAsset).mockResolvedValue(WITH_PEN)
    const r = renderPen(BASIC, SETTINGS)
    const dlg = await firstRegister(r.update)
    fireEvent.click(within(dlg).getByRole('button', { name: KO_PEN.penFirstNo }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(setSettings).toHaveBeenCalledTimes(1)
    const expected = { ...SETTINGS, mouse: { ...MOUSE, penMode: false, penPos: PEN_HOME } }
    expect(call(0)).toStrictEqual(expected)
    expect(toggle()).toHaveFocus()
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    r.unmount()
    const r2 = renderPen(BASIC, SETTINGS)
    await firstRegister(r2.update)
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(call(1)).toStrictEqual(expected)
    expect(toggle()).toHaveFocus()
  })

  it('TC-170 (CR-038·CR-044 개정): 첫 등록 penPos 규칙 — 이미 있으면 그대로, mouse null 이면 기본값 기준, 저장값 true·pen_up 지운 상태의 재등록도 다시 묻는다(결정 ② ③)', async () => {
    vi.mocked(importAsset).mockResolvedValue(WITH_PEN)
    const placed = withMouse({ penMode: true, penPos: { x: 10, y: 20 } })
    const r = renderPen(BASIC, placed)
    expect(toggle()).toBeDisabled()
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    const dlg = await firstRegister(r.update)
    expect(dlg).toHaveAccessibleName(KO_PEN.penFirstTitle)
    fireEvent.click(within(dlg).getByRole('button', { name: KO_PEN.penFirstYes }))
    expect(call(0)).toStrictEqual({ ...placed, mouse: { ...MOUSE, penMode: true, penPos: { x: 10, y: 20 } } })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    r.unmount()
    const noMouse: Settings = { ...SETTINGS, mouse: null }
    const r2 = renderPen(BASIC, noMouse)
    const dlg2 = await firstRegister(r2.update)
    fireEvent.click(within(dlg2).getByRole('button', { name: KO_PEN.penFirstYes }))
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(call(1)).toStrictEqual({
      ...noMouse,
      // CR-035(contract v0.16 DA-07): mouse null → DEFAULT_MOUSE_SETTINGS.penPos 가 non-null 이라
      // resolvePenPos 계산 없이 그대로 싣는다(옛 기대 PEN_DEFAULT_HOME (385,535) 대체)
      // CR-044 🔒(확정사항 §6 2차 교체·contract v0.20): 기본 penPos (372,476)(CR-038 (356,504) · 옛 (380,496))
      // — 리터럴로 적어 bridge 상수와 독립 대조
      mouse: { ...DEFAULT_MOUSE_SETTINGS, penMode: true, penPos: { x: 372, y: 476 } },
    })
  })

  it('TC-171: 첫 등록 저장 실패 → onError(창 오류 줄), 카드 오류 없음, 그림 등록 유지(removeAsset 없음), 재시도·추가 저장 없음', async () => {
    vi.mocked(importAsset).mockResolvedValue(WITH_PEN)
    vi.mocked(setSettings).mockRejectedValue(SAVE_ERR)
    const { update } = renderPen(BASIC, SETTINGS)
    const dlg = await firstRegister(update)
    fireEvent.click(within(dlg).getByRole('button', { name: KO_PEN.penFirstYes }))
    await waitFor(() => expect(onError).toHaveBeenCalledWith(SAVE_ERR))
    expect(onError).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(importAsset).toHaveBeenCalledTimes(1)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(removeAsset).not.toHaveBeenCalled()
  })

  it('TC-172: 대답 없이 창을 닫으면(언마운트) 저장 0회, 다시 열면 pen_up 이 있으므로 교체는 확인창 없이 ensurePenPos(penMode 그대로)', async () => {
    vi.mocked(importAsset).mockResolvedValue(WITH_PEN)
    const r = renderPen(BASIC, SETTINGS)
    fireEvent.click(penUpChange())
    await screen.findByRole('alertdialog')
    r.unmount()
    await act(async () => {})
    expect(setSettings).not.toHaveBeenCalled()
    renderPen(WITH_PEN, SETTINGS)
    fireEvent.click(penUpChange())
    await waitFor(() => expect(setSettings).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(call(0)).toStrictEqual({ ...SETTINGS, mouse: { ...MOUSE, penPos: PEN_HOME } }) // penMode false 그대로
  })
})

// ─── ConfirmDialog tone · 문구 · 접근성 ──────────────────────────────────────
describe('ConfirmDialog tone · 펜 문구(R-20) · 접근성(§9.7)', () => {
  it('TC-173: ConfirmDialog tone — 생략 = danger(기존 호출 불변), accent 는 확인 버튼만 강조색, 나머지 동작 동일, 비우기 확인창은 여전히 danger', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const el = (tone?: 'danger' | 'accent') => (
      <ConfirmDialog open title="제목" message="본문" confirmLabel="확인" cancelLabel="닫기" tone={tone} onConfirm={onConfirm} onCancel={onCancel} />
    )
    const classes = (tone?: 'danger' | 'accent') => {
      const { unmount } = render(el(tone))
      const dlg = screen.getByRole('alertdialog', { name: '제목' })
      expect(within(dlg).getByRole('button', { name: '닫기' })).toHaveFocus()
      const out = {
        ok: within(dlg).getByRole('button', { name: '확인' }).className,
        cancel: within(dlg).getByRole('button', { name: '닫기' }).className,
      }
      fireEvent.click(within(dlg).getByRole('button', { name: '확인' }))
      fireEvent.keyDown(dlg, { key: 'Escape' })
      unmount()
      return out
    }
    const def = classes()
    const danger = classes('danger')
    const accent = classes('accent')
    expect(def.ok).toMatch(/danger/)
    expect(def.ok).not.toMatch(/accent/)
    expect(danger).toStrictEqual(def)
    expect(accent.ok).toMatch(/accent/)
    expect(accent.ok).not.toMatch(/danger/)
    expect(accent.cancel).toBe(def.cancel)
    expect(onConfirm).toHaveBeenCalledTimes(3)
    expect(onCancel).toHaveBeenCalledTimes(3)
    renderPen(WITH_PEN, SETTINGS)
    // CR-035: pen_up 「기본값」 = 복원 확인창(tone 기본 danger — images-tab §6 4′)
    fireEvent.click(within(card('pen_up')).getByRole('button', { name: '손 기본 기본 그림으로 되돌리기' }))
    expect(within(dialog()).getByRole('button', { name: '기본 그림으로' }).className).toMatch(/danger/)
    expect(removeAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-174 (CR-042 개정): 사전 — CR-033 새 키 11개 ko 정확 값(펜 모드 문구 3개는 CR-042 값)·ja·en 존재(빈 문자열 없음), pen_up 설명 교체(제목 불변)', () => {
    for (const [k, v] of Object.entries(KO_PEN)) {
      expect((ko as unknown as Record<string, string>)[k], k).toBe(v)
      for (const dict of [ja, en]) {
        const d = (dict as unknown as Record<string, unknown>)[k]
        expect(typeof d, k).toBe('string')
        expect((d as string).trim().length, k).toBeGreaterThan(0)
      }
    }
    expect(ko.confirmCancel).toBe('취소')
    // CR-042(i18n §4.4 CR-042 블록 2): CR-033 설명 「「펜 손 사용」을 켜면 키 입력 때 바뀜」을 다시 대체
    expect(ko.slots.pen_up).toStrictEqual({
      title: '손 기본',
      desc: '팔 끝에 붙는 펜 쥔 손. 「펜 손 사용」을 켜면 아무것도 누르지 않을 때 이 그림',
    })
    expect(ja.slots.pen_up.desc).not.toContain('あるとキーボードは基本画像に固定')
    expect(en.slots.pen_up.desc).not.toContain('When set, the keyboard stays on the base image')
    expect(ja.slots.pen_up.desc.trim().length).toBeGreaterThan(0)
    expect(en.slots.pen_up.desc.trim().length).toBeGreaterThan(0)
  })

  it('TC-175: 3개 국어 — ja 토글·안내 상자·켜기 확인창, en 첫 등록 확인창이 사전 문구', async () => {
    const r = renderPen(WITH_PEN, { ...SETTINGS, language: 'ja' }, 'ja')
    const sw = screen.getByRole('switch', { name: ja.penModeLabel })
    expect(sw).toHaveAccessibleDescription(ja.penModeDesc)
    expect(noteTexts()).toEqual([ja.penModeNoteOn, ja.penModeNoteOff])
    fireEvent.click(sw)
    expect(dialog()).toHaveAccessibleName(ja.penEnableTitle)
    expect(dialog()).toHaveAccessibleDescription(ja.penEnableMessage)
    expect(within(dialog()).getByRole('button', { name: ja.confirmCancel })).toHaveFocus()
    expect(within(dialog()).getByRole('button', { name: ja.penEnableOk })).toBeInTheDocument()
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    r.unmount()
    vi.mocked(importAsset).mockResolvedValue(WITH_PEN)
    renderPen(BASIC, { ...SETTINGS, language: 'en' }, 'en')
    fireEvent.click(screen.getByRole('button', { name: format(en.changeImageAria, { name: en.slots.pen_up.title }) }))
    const dlg = await screen.findByRole('alertdialog')
    expect(pickPngFile).toHaveBeenCalledWith(en.pickTitle)
    expect(dlg).toHaveAccessibleName(en.penFirstTitle)
    expect(dlg).toHaveAccessibleDescription(en.penFirstMessage)
    expect(within(dlg).getByRole('button', { name: en.penFirstNo })).toHaveFocus()
    expect(within(dlg).getByRole('button', { name: en.penFirstYes })).toBeInTheDocument()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-176: 접근성 — 토글 = button·role=switch·id pen-mode-toggle·aria-checked·설명 연결, 포커스 순서 팔 그룹 → 토글 → 손 기본 카드, 비활성이면 건너뜀', () => {
    const r = renderPen(WITH_PEN, ON)
    const sw = toggle()
    expect(sw.tagName).toBe('BUTTON')
    expect(sw).toHaveAttribute('id', 'pen-mode-toggle')
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(sw).toHaveAccessibleDescription(KO_PEN.penModeDesc)
    expect(sw).not.toHaveAttribute('aria-busy')
    expect(sw).not.toHaveAttribute('tabindex')
    const order = () => Array.from(region().querySelectorAll<HTMLElement>('button:not([disabled])'))
    const i = order().indexOf(sw)
    expect(i).toBeGreaterThan(0)
    expect(order()[i - 1]).toBe(changeBtn('mouse_right', '오른클릭'))
    expect(order()[i + 1]).toBe(penUpChange())
    r.update(BASIC, ON)
    expect(order()).not.toContain(toggle())
    const up = order().indexOf(penUpChange())
    expect(order()[up - 1]).toBe(changeBtn('mouse_right', '오른클릭'))
    expect(setSettings).not.toHaveBeenCalled()
  })
})

// ─── 사용자 시나리오 S-13 ────────────────────────────────────────────────────
describe('TC-FLOW-14 (S-13, R-29 · R-30)', () => {
  it('TC-FLOW-14: pen_up 첫 등록 → 「예」 → 켜짐 표시 → 토글 끄기(확인 없음) → 다시 켜기(확인창) — 안내 상자는 내내 보인다', async () => {
    vi.mocked(importAsset).mockResolvedValue(WITH_PEN)
    const { update } = renderPen(BASIC, SETTINGS)
    expect(note()).toBeVisible()
    expect(toggle()).toBeDisabled()
    // TC-168(첫 등록·예 부분)
    const dlg = await firstRegister(update)
    fireEvent.click(within(dlg).getByRole('button', { name: KO_PEN.penFirstYes }))
    const s1 = call(0)
    expect(s1).toStrictEqual({ ...SETTINGS, mouse: { ...MOUSE, penMode: true, penPos: PEN_HOME } })
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    // TC-161(수신 표시 부분)
    update(WITH_PEN, s1)
    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(toggle()).toHaveAttribute('aria-checked', 'true')
    // TC-165(끄기 부분)
    fireEvent.click(toggle())
    expect(screen.queryByRole('alertdialog')).toBeNull()
    const s2 = call(1)
    expect(s2).toStrictEqual({ ...s1, mouse: { ...MOUSE, penMode: false, penPos: PEN_HOME } })
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2))
    update(WITH_PEN, s2)
    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    expect(note()).toBeVisible()
    // TC-163(켜기 확인창 부분)
    fireEvent.click(toggle())
    expect(dialog()).toHaveAccessibleName(KO_PEN.penEnableTitle)
    fireEvent.click(within(dialog()).getByRole('button', { name: KO_PEN.penEnableOk }))
    expect(call(2)).toStrictEqual({ ...s2, mouse: { ...MOUSE, penMode: true, penPos: PEN_HOME } })
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(3))
    update(WITH_PEN, call(2))
    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(toggle()).toHaveAttribute('aria-checked', 'true')
    expect(toggle()).toHaveFocus()
    expect(onError.mock.calls.every(c => c[0] === null)).toBe(true)
    expect(setSettings).toHaveBeenCalledTimes(3)
    expect(noteTexts()).toEqual([KO_PEN.penModeNoteOn, KO_PEN.penModeNoteOff])
  })
})
