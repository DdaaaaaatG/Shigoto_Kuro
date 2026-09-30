/**
 * 「프리셋」 탭(PresetsTab · PresetSaveCard) 스펙 — CR-064 · R-58 ~ R-67 (사용자행 S-31 ~ S-34).
 * 기준: src/settings/design/presets-tab.md §1.2·§2·§4·§5(5.1 · 5.2)·§6·§7·§8 · design/i18n.md §4.12(36키)·§4.6 CR-064(errors 12)
 *       · contract v0.30 §3.11·§5·§5.11·§6 · scenarios.md 「v30 개정」 절 TC-319 ~ TC-346 · TC-FLOW-33.
 * bridge 는 항상 mock(vi.mock('bridge/commands')·vi.mock('bridge/events')) — toBridgeError·bridge/types 상수만 실물.
 * 이 탭은 이벤트를 구독하지 않는다(§2 — 새 구독 없음): events mock 은 전부 vi.fn 이고 0회를 단언한다.
 * 적용 결과(settings://changed·assets://changed)는 SettingsApp 몫 — 이 스펙은 새 manifest props 로 rerender 해 흉내 낸다.
 * 가짜 시계 없음(시간 의존 동작 없음). 비동기 완료는 상태 줄 문구·포커스·호출 횟수로 waitFor 한다(실제 sleep 없음).
 * 구현 전 Red 가 정상: components/PresetsTab.tsx · PresetSaveCard.tsx · PresetCard.tsx · presetValues.ts · i18n 36키가 없으면 실패한다.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type {
  AssetEntry,
  AssetManifest,
  AssetSlot,
  BridgeError,
  PresetImportReport,
  PresetSummary,
} from 'bridge/types'
import {
  applyPreset,
  deletePreset,
  exportPreset,
  getAlarmSound,
  getAssetManifest,
  getSettings,
  importAsset,
  importPreset,
  listPresets,
  pickFolder,
  removeAsset,
  renamePreset,
  savePreset,
  setSettings,
} from 'bridge/commands'
import * as events from 'bridge/events'
import PresetsTab from '../components/PresetsTab'
import { formatSavedAt } from '../presetValues'
import { MessagesProvider } from '../i18n/MessagesContext'
import { errorText, format } from '../i18n/index'
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
    listPresets: vi.fn(),
    savePreset: vi.fn(),
    applyPreset: vi.fn(),
    exportPreset: vi.fn(),
    importPreset: vi.fn(),
    renamePreset: vi.fn(),
    deletePreset: vi.fn(),
    pickFolder: vi.fn(),
    // 이 탭이 부르지 않아야 하는 래퍼(0회 단언) — §6.2 getAlarmSound 부르지 않음, 낙관적 갱신 없음
    getAlarmSound: vi.fn(),
    getSettings: vi.fn(),
    setSettings: vi.fn(),
    getAssetManifest: vi.fn(),
    importAsset: vi.fn(),
    removeAsset: vi.fn(),
  }
})
vi.mock('bridge/events', () => ({
  EVENTS: {
    keyboard: 'input://keyboard',
    mouseMove: 'input://mouse-move',
    mouseButton: 'input://mouse-button',
    settingsChanged: 'settings://changed',
    assetsChanged: 'assets://changed',
    handAnchorChanged: 'assets://hand-anchor-changed',
    timerChanged: 'timer://changed',
  },
  onKeyboard: vi.fn(),
  onMouseMove: vi.fn(),
  onMouseButton: vi.fn(),
  onSettingsChanged: vi.fn(),
  onAssetsChanged: vi.fn(),
  onHandAnchorChanged: vi.fn(),
  onTimerChanged: vi.fn(),
}))

// ─── 확정 문구(design/i18n.md §4.12 · §4.6 CR-064 ko 열 — 정확 일치) ─────────────
const KO = {
  tab: '프리셋',
  saveCard: '현재 상태를 프리셋으로 저장',
  listCard: '저장한 프리셋',
  nameLabel: '프리셋 이름',
  placeholder: '예: 고양이 A',
  save: '저장',
  needs: '키보드 기본 그림과 팔 그림이 있어야 저장할 수 있습니다. 「이미지 설정」에서 먼저 등록하세요.',
  import: '폴더에서 가져오기',
  importDesc: '내보낸 프리셋 폴더(preset.json이 들어 있는 폴더)를 고르세요.',
  importFailed: '가져오지 못했습니다. 아래 파일을 고친 뒤 다시 가져오세요.',
  pickImport: '가져올 프리셋 폴더 선택',
  pickExport: '내보낼 위치 선택',
  empty: '저장한 프리셋이 없습니다.',
  cancel: '취소', // 기존 confirmCancel
  applyTitle: '프리셋 적용',
  applyOk: '적용',
  deleteTitle: '프리셋 삭제',
  deleteOk: '삭제',
  renameSave: '저장',
}
const saved = (name: string) => `「${name}」 프리셋을 저장했습니다.`
const imported = (name: string) => `「${name}」 프리셋을 가져왔습니다.`
const applied = (name: string) => `「${name}」 프리셋을 적용했습니다.`
const exported = (folder: string) => `「${folder}」 폴더로 내보냈습니다.`
const deleted = (name: string) => `「${name}」 프리셋을 삭제했습니다.`
const applyMsg = (name: string) =>
  `지금 그림·알림음·설정이 「${name}」 프리셋의 것으로 모두 바뀝니다. 프리셋에 없는 그림 칸은 비워집니다. 지금 상태는 따로 남지 않으니, 남기려면 먼저 「현재 상태를 프리셋으로 저장」하세요. 창 위치·언어·자동 실행·작업표시줄·위치 잠금은 그대로입니다.`
const deleteMsg = (name: string) => `「${name}」 프리셋을 삭제할까요? 되돌릴 수 없습니다.`
const aria = (action: string, name: string) => `${action}: ${name}`
const renameAria = (name: string) => `「${name}」의 새 이름`

// ─── 픽스처 ────────────────────────────────────────────────────────────────
const P1: PresetSummary = { id: 'p1', name: '고양이 A', savedAt: Date.UTC(2026, 8, 30, 3, 0), imageCount: 12, hasAlarm: true }
const P2: PresetSummary = { id: 'p2', name: '고양이 B', savedAt: Date.UTC(2026, 8, 29, 3, 0), imageCount: 7, hasAlarm: false }
const P3: PresetSummary = { id: 'p3', name: '강아지', savedAt: Date.UTC(2026, 8, 28, 3, 0), imageCount: 9, hasAlarm: true }
const NEW: PresetSummary = { id: 'n1', name: '고양이 C', savedAt: Date.UTC(2026, 8, 30, 9, 0), imageCount: 10, hasAlarm: false }
const IMP: PresetSummary = { id: 'i1', name: '가져온 고양이', savedAt: Date.UTC(2026, 7, 1, 3, 0), imageCount: 6, hasAlarm: true }
const DIR_IN = 'X:/in/cat-a' // 가짜 경로(폴더 선택 창 결과 흉내)
const DIR_OUT = 'X:/out'
const entry = (slot: AssetSlot): AssetEntry => ({
  slot,
  fileName: `${String(slot)}.png`,
  width: 900,
  height: 700,
  bytes: 1000,
  url: `asset://${String(slot)}.png`,
})
const FULL: AssetManifest = { canvas: { width: 900, height: 700 }, entries: (['kb_up', 'mouse_base'] as AssetSlot[]).map(entry) }
const NO_KB: AssetManifest = { canvas: { width: 900, height: 700 }, entries: (['mouse_base'] as AssetSlot[]).map(entry) }

const deferred = <T,>() => {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let onError: Mock
beforeEach(() => {
  vi.resetAllMocks()
  onError = vi.fn()
})

// ─── 도우미 ────────────────────────────────────────────────────────────────
type Lang = 'ko' | 'ja' | 'en'
const DICT = { ko, ja, en }
const tabEl = (manifest: AssetManifest, language?: Lang) =>
  language ? (
    <MessagesProvider language={language}>
      <PresetsTab manifest={manifest} onError={onError} />
    </MessagesProvider>
  ) : (
    <PresetsTab manifest={manifest} onError={onError} />
  )
/**
 * 목록 응답을 정하고 마운트 → 첫 listPresets 해결까지 기다린다.
 * 재조회 응답(mockResolvedValueOnce 대기열)은 반드시 이 함수가 끝난 **뒤에** 쌓는다 — 먼저 쌓으면 마운트가 그 값을 받는다.
 */
const renderTab = async (list: PresetSummary[] = [P1, P2], manifest = FULL, language?: Lang) => {
  vi.mocked(listPresets).mockResolvedValueOnce(list)
  const utils = render(tabEl(manifest, language))
  await waitFor(() => expect(listPresets).toHaveBeenCalledTimes(1))
  await act(async () => {})
  return utils
}
const saveCard = (name = KO.saveCard) => screen.getByRole('region', { name })
const listCard = (name = KO.listCard) => screen.getByRole('region', { name })
const nameInput = (label = KO.nameLabel) => screen.getByRole('textbox', { name: label })
const saveBtn = (name = KO.save) => within(saveCard()).getByRole('button', { name })
const importBtn = (name = KO.import) => screen.getByRole('button', { name })
const status = () => within(saveCard()).getByRole('status')
const items = () => within(listCard()).queryAllByRole('listitem')
const cardNames = () => items().map(li => li.querySelector('h3')?.textContent)
const card = (name: string) => within(listCard()).getByRole('listitem', { name })
const cardBtn = (preset: string, action: string) => within(card(preset)).getByRole('button', { name: aria(action, preset) })
const dialog = () => screen.queryByRole('alertdialog')
const inDialog = (name: string) => within(screen.getByRole('alertdialog')).getByRole('button', { name })
const meta = (p: PresetSummary, lang: Lang = 'ko') => {
  const t = DICT[lang]
  return [
    format(t.presetSavedAt, { date: formatSavedAt(p.savedAt, lang) }),
    format(t.presetImageCount, { count: p.imageCount }),
    p.hasAlarm ? t.presetHasAlarm : t.presetNoAlarm,
  ].join(' · ')
}
const typeName = (v: string) => fireEvent.change(nameInput(), { target: { value: v } })
const allPresetButtons = () => [
  saveBtn(),
  importBtn(),
  ...items().flatMap(li => within(li).getAllByRole('button')),
]
/** 이 탭이 부르면 안 되는 쓰기·조회(낙관적 갱신·알림음 재조회 없음 — §6.2) */
const expectNoForeignBridge = () => {
  expect(getAlarmSound).not.toHaveBeenCalled()
  expect(getSettings).not.toHaveBeenCalled()
  expect(setSettings).not.toHaveBeenCalled()
  expect(getAssetManifest).not.toHaveBeenCalled()
  expect(importAsset).not.toHaveBeenCalled()
  expect(removeAsset).not.toHaveBeenCalled()
}
const expectNoSubscription = () => {
  for (const k of [
    'onKeyboard',
    'onMouseMove',
    'onMouseButton',
    'onSettingsChanged',
    'onAssetsChanged',
    'onHandAnchorChanged',
    'onTimerChanged',
  ] as const) {
    expect(vi.mocked(events[k]), k).not.toHaveBeenCalled()
  }
}
const nonNullErrors = () => onError.mock.calls.filter(c => c[0] !== null)

// ─── 렌더·목록 (§1.2 · §4 · §5.1 reload · PR-1) ───────────────────────────────
describe('PresetsTab — 렌더·목록 (presets-tab §1.2 · §5.1, R-66 · R-59 · R-60)', () => {
  it('TC-319: 마운트 → listPresets() 1회, 저장 카드(설명·이름 입력·저장·가져오기·빈 상태 줄) 위 · 목록 카드 아래, 카드 = core 순서 그대로·이름 h3·요약 줄, 이벤트 구독·다른 bridge 0회', async () => {
    await renderTab([P1, P2, P3])
    expect(listPresets).toHaveBeenCalledWith()
    // ⓐ 위 = 저장 카드, 아래 = 목록 카드(문서 순서)
    expect(saveCard().compareDocumentPosition(listCard()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(saveCard()).getByText(ko.presetSaveDesc)).toBeInTheDocument()
    expect(ko.presetSaveDesc).toContain('들어가지 않습니다') // R-60 안내(값은 i18n §4.12 — TC-352)
    expect(within(saveCard()).getByText(KO.importDesc)).toBeInTheDocument()
    expect(nameInput()).toHaveAttribute('placeholder', KO.placeholder)
    expect(nameInput()).toHaveAttribute('maxlength', '50')
    expect((nameInput() as HTMLInputElement).value).toBe('')
    expect(status().textContent).toBe('') // 원소는 늘 있다(§8.1)
    expect(status()).toHaveAttribute('aria-live', 'polite')
    expect(within(saveCard()).queryByText(KO.needs)).toBeNull() // FULL = 필수 충족
    // 목록 — core 순서 그대로(다시 정렬하지 않음 — U-4)
    expect(cardNames()).toEqual(['고양이 A', '고양이 B', '강아지'])
    for (const p of [P1, P2, P3]) {
      const li = card(p.name) // li 접근 이름 = h3(aria-labelledby)
      expect(within(li).getByRole('heading', { level: 3 }).textContent).toBe(p.name)
      expect(within(li).getByText(meta(p))).toBeInTheDocument()
      expect(within(li).getAllByRole('button').map(b => b.textContent)).toEqual(['적용', '내보내기', '이름 바꾸기', '삭제'])
    }
    expect(within(card('고양이 B')).getByText(meta(P2)).textContent).toContain('알림음 없음')
    expect(screen.queryByText(KO.empty)).toBeNull()
    expect(dialog()).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    // ⓑ 첫 조회 성공은 onError 를 건드리지 않거나 null 만
    expect(nonNullErrors()).toEqual([])
    // ⓒ 쓰기 command 0회·구독 0회
    for (const f of [savePreset, applyPreset, exportPreset, importPreset, renamePreset, deletePreset, pickFolder]) {
      expect(f).not.toHaveBeenCalled()
    }
    expectNoForeignBridge()
    expectNoSubscription()
  })

  it('TC-320: 빈 목록 [] → 「저장한 프리셋이 없습니다.」 · 첫 조회 전(null) → 목록·빈 문구 모두 없음 · 첫 조회 실패 → onError(err)·목록 자리 비어 있음', async () => {
    // ① 빈 목록
    const r1 = await renderTab([])
    expect(within(listCard()).getByText(KO.empty)).toBeInTheDocument()
    expect(items()).toHaveLength(0)
    r1.unmount()
    // ② 첫 조회 대기 중(null)
    vi.resetAllMocks()
    const d = deferred<PresetSummary[]>()
    vi.mocked(listPresets).mockReturnValueOnce(d.promise)
    const r2 = render(tabEl(FULL))
    expect(listPresets).toHaveBeenCalledTimes(1)
    expect(within(listCard()).queryByText(KO.empty)).toBeNull()
    expect(items()).toHaveLength(0)
    r2.unmount()
    // ③ 첫 조회 실패(PR-1 오류)
    vi.resetAllMocks()
    onError = vi.fn()
    const err: BridgeError = { code: 'preset.io', message: '프리셋 목록을 읽지 못했습니다.' }
    vi.mocked(listPresets).mockRejectedValueOnce(err)
    render(tabEl(FULL))
    await waitFor(() => expect(onError).toHaveBeenCalledWith(err))
    expect(within(listCard()).queryByText(KO.empty)).toBeNull()
    expect(items()).toHaveLength(0)
    expect(listPresets).toHaveBeenCalledTimes(1) // 자동 재시도 없음(다시 들어오면 재조회)
  })
})

// ─── 저장 (§5.1 onSave · §5.2 · §7.1 · PR-2) ─────────────────────────────────
describe('PresetsTab — 저장 (R-58 · R-65)', () => {
  it('TC-321: 필수 그림 누락 → 저장 버튼 비활성 + 이유 줄 항상(입력과 무관)·aria-describedby, 충족이면 이유 줄 없음·이름이 비거나 공백만이면 비활성', async () => {
    const r = await renderTab([P1], NO_KB)
    const reason = within(saveCard()).getByText(KO.needs)
    expect(saveBtn()).toBeDisabled()
    expect(saveBtn()).toHaveAttribute('aria-describedby', reason.id)
    expect(reason.id).not.toBe('')
    typeName('고양이 A')
    expect(saveBtn()).toBeDisabled()
    expect(within(saveCard()).getByText(KO.needs)).toBeInTheDocument()
    fireEvent.click(saveBtn())
    expect(savePreset).not.toHaveBeenCalled()
    // 충족 매니페스트(적용 뒤 assets://changed → SettingsApp 가 props 교체하는 경우와 같음)
    r.rerender(tabEl(FULL))
    expect(within(saveCard()).queryByText(KO.needs)).toBeNull()
    expect(saveBtn()).not.toHaveAttribute('aria-describedby')
    expect(saveBtn()).toBeEnabled() // 이름 '고양이 A' 유지
    typeName('')
    expect(saveBtn()).toBeDisabled()
    typeName('   ')
    expect(saveBtn()).toBeDisabled()
    fireEvent.click(saveBtn())
    expect(savePreset).not.toHaveBeenCalled()
    expect(listPresets).toHaveBeenCalledTimes(1)
  })

  it('TC-322: 이름 입력 → 「저장」 → savePreset(trim) 1회 → 상태 줄 「「{name}」 프리셋을 저장했습니다.」·onError(null) → 재조회(새 카드 맨 위) → 입력 비움·포커스 이름 입력', async () => {
    vi.mocked(savePreset).mockResolvedValueOnce(NEW)
    await renderTab([P1])
    vi.mocked(listPresets).mockResolvedValueOnce([NEW, P1])
    typeName('  고양이 C  ')
    expect(saveBtn()).toBeEnabled()
    fireEvent.click(saveBtn())
    await waitFor(() => expect(status().textContent).toBe(saved('고양이 C')))
    expect(savePreset).toHaveBeenCalledTimes(1)
    expect(savePreset).toHaveBeenCalledWith('고양이 C')
    await waitFor(() => expect(cardNames()).toEqual(['고양이 C', '고양이 A']))
    expect(listPresets).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(nameInput()).toHaveFocus())
    expect((nameInput() as HTMLInputElement).value).toBe('')
    expect(saveBtn()).toBeDisabled() // 빈 이름
    expect(onError).toHaveBeenCalledWith(null)
    expect(nonNullErrors()).toEqual([])
    expectNoForeignBridge()
  })

  it('TC-323: 이름 입력칸 Enter = 저장(preventDefault), IME 조합 중 Enter(isComposing)는 무시, 저장 불가 상태의 Enter 도 무시', async () => {
    vi.mocked(savePreset).mockResolvedValueOnce(NEW)
    await renderTab([P1])
    vi.mocked(listPresets).mockResolvedValueOnce([NEW, P1])
    typeName('')
    fireEvent.keyDown(nameInput(), { key: 'Enter' })
    expect(savePreset).not.toHaveBeenCalled()
    typeName('고양이 C')
    fireEvent.keyDown(nameInput(), { key: 'Enter', isComposing: true })
    expect(savePreset).not.toHaveBeenCalled()
    const notPrevented = fireEvent.keyDown(nameInput(), { key: 'Enter' })
    expect(notPrevented).toBe(false) // preventDefault
    await waitFor(() => expect(status().textContent).toBe(saved('고양이 C')))
    expect(savePreset).toHaveBeenCalledTimes(1)
    expect(savePreset).toHaveBeenCalledWith('고양이 C')
  })

  it('TC-324: 저장 실패(preset.invalid_name) → onError(err)·입력 유지·상태 줄 빈 칸·포커스 「저장」·재조회 없음', async () => {
    const err: BridgeError = { code: 'preset.invalid_name', message: '프리셋 이름이 올바르지 않습니다.' }
    vi.mocked(savePreset).mockRejectedValueOnce(err)
    await renderTab([P1])
    typeName('고양이 C')
    fireEvent.click(saveBtn())
    await waitFor(() => expect(onError).toHaveBeenCalledWith(err))
    expect(savePreset).toHaveBeenCalledWith('고양이 C')
    expect((nameInput() as HTMLInputElement).value).toBe('고양이 C')
    expect(status().textContent).toBe('')
    await waitFor(() => expect(saveBtn()).toHaveFocus())
    expect(listPresets).toHaveBeenCalledTimes(1)
    expect(cardNames()).toEqual(['고양이 A'])
  })

  it('TC-325: 이름 규칙 — 저장 입력·편집 입력 모두 maxLength = PRESET_NAME_MAX(50), 편집 초안이 비거나 공백만이면 편집 「저장」 비활성·Enter 무시(renamePreset 0회)', async () => {
    await renderTab([P1])
    expect(nameInput()).toHaveAttribute('maxlength', '50')
    fireEvent.click(cardBtn('고양이 A', '이름 바꾸기'))
    const input = within(card('고양이 A')).getByRole('textbox', { name: renameAria('고양이 A') })
    expect(input).toHaveAttribute('maxlength', '50')
    for (const v of ['', '   ']) {
      fireEvent.change(input, { target: { value: v } })
      expect(within(card('고양이 A')).getByRole('button', { name: KO.renameSave })).toBeDisabled()
      fireEvent.keyDown(input, { key: 'Enter' })
    }
    expect(renamePreset).not.toHaveBeenCalled()
    expect(within(card('고양이 A')).getByRole('textbox', { name: renameAria('고양이 A') })).toBeInTheDocument() // 편집 유지
  })
})

// ─── 가져오기 (§5.1 onImport · PR-3) ─────────────────────────────────────────
describe('PresetsTab — 가져오기 (R-63)', () => {
  it('TC-326: 「폴더에서 가져오기」 → pickFolder(가져올 프리셋 폴더 선택) → importPreset(dir) → 등록 → 상태 줄 「「{name}」 프리셋을 가져왔습니다.」·재조회·포커스 가져오기 버튼', async () => {
    vi.mocked(pickFolder).mockResolvedValueOnce(DIR_IN)
    vi.mocked(importPreset).mockResolvedValueOnce({ preset: IMP, problems: [] })
    await renderTab([P1])
    vi.mocked(listPresets).mockResolvedValueOnce([P1, IMP])
    fireEvent.click(importBtn())
    await waitFor(() => expect(status().textContent).toBe(imported('가져온 고양이')))
    expect(pickFolder).toHaveBeenCalledTimes(1)
    expect(pickFolder).toHaveBeenCalledWith(KO.pickImport)
    expect(importPreset).toHaveBeenCalledTimes(1)
    expect(importPreset).toHaveBeenCalledWith(DIR_IN)
    await waitFor(() => expect(cardNames()).toEqual(['고양이 A', '가져온 고양이']))
    expect(listPresets).toHaveBeenCalledTimes(2)
    expect(within(saveCard()).queryByRole('alert')).toBeNull()
    await waitFor(() => expect(importBtn()).toHaveFocus())
    expect(onError).toHaveBeenCalledWith(null)
    expect(nonNullErrors()).toEqual([])
  })

  it('TC-327: 폴더 선택 취소(pickFolder null) → importPreset 0회·onError 0회(오류 줄 불변)·재조회 없음·포커스 가져오기 버튼', async () => {
    vi.mocked(pickFolder).mockResolvedValueOnce(null)
    await renderTab([P1])
    fireEvent.click(importBtn())
    await waitFor(() => expect(importBtn()).toHaveFocus())
    expect(pickFolder).toHaveBeenCalledWith(KO.pickImport)
    expect(importPreset).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(listPresets).toHaveBeenCalledTimes(1)
    expect(status().textContent).toBe('')
    expect(importBtn()).toBeEnabled()
  })

  it('TC-328: 문제 보고서(preset null) → role=alert 블록 = 「가져오지 못했습니다…」 + 문제 전부(파일 이름 — 사전 문구, 모르는 code = unknown)·onError(null)·재조회 없음·목록 불변, 다음 조작 시작에 블록 사라짐', async () => {
    const report: PresetImportReport = {
      preset: null,
      problems: [
        { fileName: 'kb_up.png', code: 'asset.not_rgba' },
        { fileName: 'alarm.mp3', code: 'sound.too_many_bytes' },
        { fileName: 'mouse_base.png', code: 'preset.file_link' },
        { fileName: 'idle.png', code: 'preset.file_missing' },
        { fileName: 'rest.png', code: 'weird.code' },
      ],
    }
    vi.mocked(pickFolder).mockResolvedValueOnce(DIR_IN).mockResolvedValueOnce(null)
    vi.mocked(importPreset).mockResolvedValueOnce(report)
    await renderTab([P1, P2])
    fireEvent.click(importBtn())
    const block = await within(saveCard()).findByRole('alert')
    expect(within(block).getByText(KO.importFailed)).toBeInTheDocument()
    const list = within(block).getByRole('list', { name: KO.importFailed }) // ul aria-labelledby
    expect(within(list).getAllByRole('listitem').map(li => li.textContent)).toEqual([
      'kb_up.png — 32비트 RGBA PNG만 쓸 수 있습니다(투명 배경 필요).',
      'alarm.mp3 — 알림음 파일은 1MB 이하여야 합니다.',
      'mouse_base.png — 바로 가기·링크 파일은 쓸 수 없습니다.',
      'idle.png — 파일이 없습니다.',
      'rest.png — 알 수 없는 오류가 발생했습니다.',
    ])
    expect(importPreset).toHaveBeenCalledWith(DIR_IN)
    expect(onError).toHaveBeenCalledWith(null)
    expect(nonNullErrors()).toEqual([])
    expect(listPresets).toHaveBeenCalledTimes(1) // 재조회 없음
    expect(cardNames()).toEqual(['고양이 A', '고양이 B'])
    expect(status().textContent).toBe('')
    await waitFor(() => expect(importBtn()).toHaveFocus())
    // 다음 조작 시작(begin) → problems 비움
    fireEvent.click(importBtn())
    await waitFor(() => expect(within(saveCard()).queryByRole('alert')).toBeNull())
    expect(importPreset).toHaveBeenCalledTimes(1)
  })

  it('TC-329: 가져오기 폴더 수준 실패(preset.not_preset reject) → onError(err)·문제 블록 없음·재조회 없음·포커스 가져오기 버튼', async () => {
    const err: BridgeError = { code: 'preset.not_preset', message: '프리셋 폴더가 아닙니다.' }
    vi.mocked(pickFolder).mockResolvedValueOnce(DIR_IN)
    vi.mocked(importPreset).mockRejectedValueOnce(err)
    await renderTab([P1])
    fireEvent.click(importBtn())
    await waitFor(() => expect(onError).toHaveBeenCalledWith(err))
    expect(within(saveCard()).queryByRole('alert')).toBeNull()
    expect(listPresets).toHaveBeenCalledTimes(1)
    expect(status().textContent).toBe('')
    await waitFor(() => expect(importBtn()).toHaveFocus())
  })
})

// ─── 적용 (§5.1 applyConfirmed · §6.2 · §6.3 · PR-4) ─────────────────────────
describe('PresetsTab — 적용 (R-61 · R-67 · R-60)', () => {
  it('TC-330: 「적용」 → 확인창(제목·본문 {name}·「적용」·「취소」, 첫 포커스 취소) → 확인 → applyPreset(id) 1회 → 상태 줄 「「{name}」 프리셋을 적용했습니다.」·목록 재조회 0회·getAlarmSound 0회·포커스 그 카드 「적용」', async () => {
    vi.mocked(applyPreset).mockResolvedValueOnce(undefined)
    await renderTab([P1, P2])
    fireEvent.click(cardBtn('고양이 B', '적용'))
    const dlg = screen.getByRole('alertdialog', { name: KO.applyTitle })
    expect(dlg).toHaveAccessibleDescription(applyMsg('고양이 B'))
    expect(within(dlg).getAllByRole('button').map(b => b.textContent).sort()).toEqual([KO.applyOk, KO.cancel].sort())
    expect(inDialog(KO.cancel)).toHaveFocus()
    expect(applyPreset).not.toHaveBeenCalled()
    fireEvent.click(inDialog(KO.applyOk))
    expect(dialog()).toBeNull()
    await waitFor(() => expect(status().textContent).toBe(applied('고양이 B')))
    expect(applyPreset).toHaveBeenCalledTimes(1)
    expect(applyPreset).toHaveBeenCalledWith('p2')
    expect(onError).toHaveBeenCalledWith(null)
    expect(nonNullErrors()).toEqual([])
    await waitFor(() => expect(cardBtn('고양이 B', '적용')).toHaveFocus())
    expect(listPresets).toHaveBeenCalledTimes(1) // 적용은 목록을 바꾸지 않는다(PS-10)
    expect(cardNames()).toEqual(['고양이 A', '고양이 B'])
    expectNoForeignBridge() // getAlarmSound·setSettings 0회 — 낙관적 갱신 없음(§6.2)
    expectNoSubscription()
  })

  it('TC-331: 적용 확인창 「취소」·Esc → applyPreset 0회·확인창 닫힘·포커스 연 카드 「적용」', async () => {
    await renderTab([P1, P2])
    fireEvent.click(cardBtn('고양이 A', '적용'))
    fireEvent.click(inDialog(KO.cancel))
    expect(dialog()).toBeNull()
    await waitFor(() => expect(cardBtn('고양이 A', '적용')).toHaveFocus())
    fireEvent.click(cardBtn('고양이 A', '적용'))
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(dialog()).toBeNull()
    await waitFor(() => expect(cardBtn('고양이 A', '적용')).toHaveFocus())
    expect(applyPreset).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(status().textContent).toBe('')
  })

  it('TC-332: 적용 실패(preset.damaged reject) → onError(err)·상태 줄 빈 칸·재조회 없음·포커스 그 카드 「적용」', async () => {
    const err: BridgeError = { code: 'preset.damaged', message: '저장된 프리셋이 손상되었습니다: kb_up.png' }
    vi.mocked(applyPreset).mockRejectedValueOnce(err)
    await renderTab([P1, P2])
    fireEvent.click(cardBtn('고양이 A', '적용'))
    fireEvent.click(inDialog(KO.applyOk))
    await waitFor(() => expect(onError).toHaveBeenCalledWith(err))
    expect(applyPreset).toHaveBeenCalledWith('p1')
    expect(status().textContent).toBe('')
    expect(listPresets).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(cardBtn('고양이 A', '적용')).toHaveFocus())
  })

  it('TC-333: 적용 뒤 「사용 중」 표시·선택 강조 없음(모든 카드 동일 구조·버튼 활성), 새 manifest props(assets://changed 흉내)로 저장 활성이 다시 계산되고 목록은 재조회하지 않는다', async () => {
    vi.mocked(applyPreset).mockResolvedValueOnce(undefined)
    const r = await renderTab([P1, P2])
    typeName('다음 프리셋')
    fireEvent.click(cardBtn('고양이 A', '적용'))
    fireEvent.click(inDialog(KO.applyOk))
    await waitFor(() => expect(status().textContent).toBe(applied('고양이 A')))
    for (const li of items()) {
      expect(li).not.toHaveAttribute('aria-current')
      expect(li).not.toHaveAttribute('aria-selected')
      for (const b of within(li).getAllByRole('button')) {
        expect(b).toBeEnabled()
        expect(b).not.toHaveAttribute('aria-pressed')
      }
    }
    expect(listCard().textContent).not.toMatch(/사용 중|적용됨/)
    // PR-4: core 가 보낸 assets://changed 로 SettingsApp 이 manifest 를 바꾸면 — 여기서는 필수 누락 매니페스트
    r.rerender(tabEl(NO_KB))
    expect(within(saveCard()).getByText(KO.needs)).toBeInTheDocument()
    expect(saveBtn()).toBeDisabled()
    expect(listPresets).toHaveBeenCalledTimes(1)
    expect(cardNames()).toEqual(['고양이 A', '고양이 B'])
  })
})

// ─── 내보내기 (§5.1 onExport · §3 presetErrorForDisplay · PR-5) ─────────────────
describe('PresetsTab — 내보내기 (R-62)', () => {
  it('TC-334: 「내보내기」 → pickFolder(내보낼 위치 선택) → exportPreset(id, dir) → 상태 줄 「「{folderName}」 폴더로 내보냈습니다.」·재조회 없음·포커스 그 카드 「내보내기」', async () => {
    vi.mocked(pickFolder).mockResolvedValueOnce(DIR_OUT)
    vi.mocked(exportPreset).mockResolvedValueOnce({ folderName: '고양이 A (2)' })
    await renderTab([P1, P2])
    fireEvent.click(cardBtn('고양이 A', '내보내기'))
    await waitFor(() => expect(status().textContent).toBe(exported('고양이 A (2)')))
    expect(pickFolder).toHaveBeenCalledWith(KO.pickExport)
    expect(exportPreset).toHaveBeenCalledTimes(1)
    expect(exportPreset).toHaveBeenCalledWith('p1', DIR_OUT)
    expect(listPresets).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(null)
    expect(nonNullErrors()).toEqual([])
    await waitFor(() => expect(cardBtn('고양이 A', '내보내기')).toHaveFocus())
  })

  it('TC-335: 내보내기 폴더 선택 취소(null) → exportPreset 0회·onError 0회·상태 줄 빈 칸·포커스 「내보내기」', async () => {
    vi.mocked(pickFolder).mockResolvedValueOnce(null)
    await renderTab([P1])
    fireEvent.click(cardBtn('고양이 A', '내보내기'))
    await waitFor(() => expect(cardBtn('고양이 A', '내보내기')).toHaveFocus())
    expect(exportPreset).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(status().textContent).toBe('')
  })

  it('TC-336: 내보내기 실패 — preset.export_exists 는 message 를 비워 onError({code, message: ""}) (ko 도 사전 안내 문구), 다른 code(preset.bad_dir)는 받은 그대로, 포커스 「내보내기」', async () => {
    const exists: BridgeError = { code: 'preset.export_exists', message: '같은 이름의 폴더가 이미 있습니다.' }
    const bad: BridgeError = { code: 'preset.bad_dir', message: '폴더를 찾을 수 없습니다: X:/out' }
    vi.mocked(pickFolder).mockResolvedValue(DIR_OUT)
    vi.mocked(exportPreset).mockRejectedValueOnce(exists).mockRejectedValueOnce(bad)
    await renderTab([P1])
    fireEvent.click(cardBtn('고양이 A', '내보내기'))
    await waitFor(() => expect(onError).toHaveBeenCalledWith({ code: 'preset.export_exists', message: '' }))
    expect(onError).not.toHaveBeenCalledWith(exists)
    // 창 공통 오류 줄이 쓰는 문구 = 사전(§4.6) — 할 일 안내 포함
    expect(errorText(ko, 'ko', { code: 'preset.export_exists', message: '' })).toBe(
      '고른 위치에 같은 이름의 폴더가 이미 있습니다. 다른 위치를 고르거나 프리셋 이름을 바꾸세요.',
    )
    await waitFor(() => expect(cardBtn('고양이 A', '내보내기')).toHaveFocus())
    expect(status().textContent).toBe('')
    fireEvent.click(cardBtn('고양이 A', '내보내기'))
    await waitFor(() => expect(onError).toHaveBeenLastCalledWith(bad))
    expect(exportPreset).toHaveBeenCalledTimes(2)
    expect(listPresets).toHaveBeenCalledTimes(1)
  })
})

// ─── 삭제 (§5.1 deleteConfirmed · §8.2 · PR-7) ───────────────────────────────
describe('PresetsTab — 삭제 (R-64)', () => {
  it('TC-337: 「삭제」 → 확인창(프리셋 삭제·{name}·「삭제」·첫 포커스 취소) → 확인 → deletePreset(id) → 상태 줄 「「{name}」 프리셋을 삭제했습니다.」·재조회·카드 사라짐·포커스 같은 위치 카드 「적용」', async () => {
    vi.mocked(deletePreset).mockResolvedValueOnce(undefined)
    await renderTab([P1, P2, P3])
    vi.mocked(listPresets).mockResolvedValueOnce([P1, P3])
    fireEvent.click(cardBtn('고양이 B', '삭제'))
    const dlg = screen.getByRole('alertdialog', { name: KO.deleteTitle })
    expect(dlg).toHaveAccessibleDescription(deleteMsg('고양이 B'))
    expect(inDialog(KO.cancel)).toHaveFocus()
    expect(deletePreset).not.toHaveBeenCalled()
    fireEvent.click(inDialog(KO.deleteOk))
    await waitFor(() => expect(status().textContent).toBe(deleted('고양이 B')))
    expect(deletePreset).toHaveBeenCalledTimes(1)
    expect(deletePreset).toHaveBeenCalledWith('p2')
    await waitFor(() => expect(cardNames()).toEqual(['고양이 A', '강아지']))
    expect(listPresets).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(cardBtn('강아지', '적용')).toHaveFocus()) // index 1 = 같은 위치
    expect(onError).toHaveBeenCalledWith(null)
    expect(nonNullErrors()).toEqual([])
  })

  it('TC-338(마지막 카드): 마지막 위치 카드 삭제 → 포커스 index − 1 카드 「적용」', async () => {
    vi.mocked(deletePreset).mockResolvedValueOnce(undefined)
    await renderTab([P1, P2, P3])
    vi.mocked(listPresets).mockResolvedValueOnce([P1, P2])
    fireEvent.click(cardBtn('강아지', '삭제'))
    fireEvent.click(inDialog(KO.deleteOk))
    await waitFor(() => expect(cardNames()).toEqual(['고양이 A', '고양이 B']))
    await waitFor(() => expect(cardBtn('고양이 B', '적용')).toHaveFocus())
  })

  it('TC-338(유일한 카드): 하나뿐인 카드 삭제 → 빈 목록 문구·포커스 이름 입력', async () => {
    vi.mocked(deletePreset).mockResolvedValueOnce(undefined)
    await renderTab([P1])
    vi.mocked(listPresets).mockResolvedValueOnce([])
    fireEvent.click(cardBtn('고양이 A', '삭제'))
    fireEvent.click(inDialog(KO.deleteOk))
    await waitFor(() => expect(within(listCard()).getByText(KO.empty)).toBeInTheDocument())
    await waitFor(() => expect(nameInput()).toHaveFocus())
    expect(status().textContent).toBe(deleted('고양이 A'))
  })

  it('TC-338(재조회 실패): 삭제 성공 뒤 재조회 reject → 옛 목록에서 삭제 항목을 뺀 목록으로 표시·포커스 판정, 마지막 onError = 재조회 오류', async () => {
    const err: BridgeError = { code: 'preset.io', message: '프리셋 목록을 읽지 못했습니다.' }
    vi.mocked(deletePreset).mockResolvedValueOnce(undefined)
    await renderTab([P1, P2])
    vi.mocked(listPresets).mockRejectedValueOnce(err)
    fireEvent.click(cardBtn('고양이 A', '삭제'))
    fireEvent.click(inDialog(KO.deleteOk))
    await waitFor(() => expect(onError).toHaveBeenLastCalledWith(err))
    expect(cardNames()).toEqual(['고양이 B']) // 삭제된 카드가 남지 않는다(계약 §5.11)
    await waitFor(() => expect(cardBtn('고양이 B', '적용')).toHaveFocus())
    expect(status().textContent).toBe(deleted('고양이 A'))
    expect(listPresets).toHaveBeenCalledTimes(2)
  })

  it('TC-339: 삭제 확인창 취소 → deletePreset 0회·포커스 「삭제」 / 삭제 실패(preset.not_found) → onError(err)·카드 남음·상태 줄 빈 칸·포커스 「삭제」', async () => {
    const err: BridgeError = { code: 'preset.not_found', message: '프리셋을 찾을 수 없습니다.' }
    vi.mocked(deletePreset).mockRejectedValueOnce(err)
    await renderTab([P1, P2])
    fireEvent.click(cardBtn('고양이 A', '삭제'))
    fireEvent.click(inDialog(KO.cancel))
    expect(dialog()).toBeNull()
    await waitFor(() => expect(cardBtn('고양이 A', '삭제')).toHaveFocus())
    expect(deletePreset).not.toHaveBeenCalled()
    fireEvent.click(cardBtn('고양이 A', '삭제'))
    fireEvent.click(inDialog(KO.deleteOk))
    await waitFor(() => expect(onError).toHaveBeenCalledWith(err))
    expect(deletePreset).toHaveBeenCalledWith('p1')
    expect(cardNames()).toEqual(['고양이 A', '고양이 B'])
    expect(status().textContent).toBe('')
    expect(listPresets).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(cardBtn('고양이 A', '삭제')).toHaveFocus())
  })
})

// ─── 이름 바꾸기 (§5.1 onStartRename · onRenameSave · onRenameCancel · §5.3 · PR-6) ──
describe('PresetsTab — 이름 바꾸기 (R-64)', () => {
  const renameInput = (name: string) => within(card(name)).getByRole('textbox', { name: renameAria(name) })

  it('TC-340: 「이름 바꾸기」 → 입력칸(현재 이름·전체 선택·포커스, h3 는 DOM 유지)·그 카드 「이름 바꾸기」 비활성 → 「저장」 → renamePreset(id, trim) → 편집 종료·재조회·상태 줄 없음·포커스 「이름 바꾸기」', async () => {
    vi.mocked(renamePreset).mockResolvedValueOnce({ ...P1, name: '고양이 A2' })
    await renderTab([P1, P2])
    vi.mocked(listPresets).mockResolvedValueOnce([{ ...P1, name: '고양이 A2' }, P2])
    fireEvent.click(cardBtn('고양이 A', '이름 바꾸기'))
    const input = renameInput('고양이 A') as HTMLInputElement
    expect(input.value).toBe('고양이 A')
    await waitFor(() => expect(input).toHaveFocus())
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, '고양이 A'.length])
    expect(within(card('고양이 A')).getByRole('heading', { level: 3, hidden: true }).textContent).toBe('고양이 A')
    expect(cardBtn('고양이 A', '이름 바꾸기')).toBeDisabled()
    expect(cardBtn('고양이 B', '이름 바꾸기')).toBeEnabled()
    expect(within(card('고양이 A')).getByRole('button', { name: KO.cancel })).toBeEnabled()
    fireEvent.change(input, { target: { value: '  고양이 A2 ' } })
    fireEvent.click(within(card('고양이 A')).getByRole('button', { name: KO.renameSave }))
    await waitFor(() => expect(cardNames()).toEqual(['고양이 A2', '고양이 B']))
    expect(renamePreset).toHaveBeenCalledTimes(1)
    expect(renamePreset).toHaveBeenCalledWith('p1', '고양이 A2')
    expect(listPresets).toHaveBeenCalledTimes(2)
    expect(within(listCard()).queryByRole('textbox')).toBeNull()
    expect(status().textContent).toBe('') // 안내 문구 없음(패킷 §2)
    await waitFor(() => expect(cardBtn('고양이 A2', '이름 바꾸기')).toHaveFocus())
    expect(onError).toHaveBeenCalledWith(null)
    expect(nonNullErrors()).toEqual([])
  })

  it('TC-341: 편집 입력 Enter = 저장, Esc = 취소(호출 0회·원래 이름·포커스 「이름 바꾸기」), IME 조합 중 Enter·Esc 는 아무것도 하지 않음', async () => {
    vi.mocked(renamePreset).mockResolvedValueOnce({ ...P1, name: '새 이름' })
    await renderTab([P1, P2])
    vi.mocked(listPresets).mockResolvedValueOnce([{ ...P1, name: '새 이름' }, P2])
    // Esc 취소
    fireEvent.click(cardBtn('고양이 A', '이름 바꾸기'))
    fireEvent.change(renameInput('고양이 A'), { target: { value: '버릴 이름' } })
    expect(fireEvent.keyDown(renameInput('고양이 A'), { key: 'Escape' })).toBe(false) // preventDefault
    expect(within(listCard()).queryByRole('textbox')).toBeNull()
    expect(cardNames()).toEqual(['고양이 A', '고양이 B'])
    await waitFor(() => expect(cardBtn('고양이 A', '이름 바꾸기')).toHaveFocus())
    expect(renamePreset).not.toHaveBeenCalled()
    // 조합 중 — 무시
    fireEvent.click(cardBtn('고양이 A', '이름 바꾸기'))
    fireEvent.change(renameInput('고양이 A'), { target: { value: '새 이름' } })
    fireEvent.keyDown(renameInput('고양이 A'), { key: 'Enter', isComposing: true })
    fireEvent.keyDown(renameInput('고양이 A'), { key: 'Escape', isComposing: true })
    expect(renameInput('고양이 A')).toBeInTheDocument()
    expect(renamePreset).not.toHaveBeenCalled()
    // Enter 저장
    expect(fireEvent.keyDown(renameInput('고양이 A'), { key: 'Enter' })).toBe(false)
    await waitFor(() => expect(cardNames()).toEqual(['새 이름', '고양이 B']))
    expect(renamePreset).toHaveBeenCalledWith('p1', '새 이름')
    await waitFor(() => expect(cardBtn('새 이름', '이름 바꾸기')).toHaveFocus())
  })

  it.each(['click', 'enter'] as const)(
    'TC-342(%s): 이름 바꾸기 실패(preset.invalid_name) → onError(err)·편집 유지(초안 그대로)·재조회 없음·포커스 편집 입력칸',
    async path => {
      const err: BridgeError = { code: 'preset.invalid_name', message: '프리셋 이름이 올바르지 않습니다.' }
      vi.mocked(renamePreset).mockRejectedValueOnce(err)
      await renderTab([P1, P2])
      fireEvent.click(cardBtn('고양이 A', '이름 바꾸기'))
      fireEvent.change(renameInput('고양이 A'), { target: { value: '다른 이름' } })
      if (path === 'click') fireEvent.click(within(card('고양이 A')).getByRole('button', { name: KO.renameSave }))
      else fireEvent.keyDown(renameInput('고양이 A'), { key: 'Enter' })
      await waitFor(() => expect(onError).toHaveBeenCalledWith(err))
      expect(renamePreset).toHaveBeenCalledWith('p1', '다른 이름')
      const input = renameInput('고양이 A') as HTMLInputElement
      expect(input.value).toBe('다른 이름')
      await waitFor(() => expect(input).toHaveFocus())
      expect(listPresets).toHaveBeenCalledTimes(1)
      expect(within(card('고양이 A')).getByRole('button', { name: KO.renameSave })).toBeEnabled()
    },
  )
})

// ─── 진행 중·편집 버림·언마운트 (§4 · §5.1 공통 규칙 · §7.1) ──────────────────────
describe('PresetsTab — 진행 중·공통 규칙 (R-66 · R-64)', () => {
  it('TC-343: 프리셋 command 진행 중(저장 대기·폴더 선택 대기) → 탭 루트 aria-busy·탭 안 모든 프리셋 버튼 비활성·이름 입력 readOnly·재진입 없음, 끝나면 풀림', async () => {
    const d = deferred<PresetSummary>()
    vi.mocked(savePreset).mockReturnValueOnce(d.promise)
    const { container } = await renderTab([P1, P2])
    vi.mocked(listPresets).mockResolvedValueOnce([NEW, P1, P2])
    const root = container.firstElementChild as HTMLElement
    expect(root).not.toHaveAttribute('aria-busy')
    typeName('고양이 C')
    fireEvent.click(saveBtn())
    await waitFor(() => expect(root).toHaveAttribute('aria-busy', 'true'))
    for (const b of allPresetButtons()) expect(b).toBeDisabled()
    expect(nameInput()).toHaveAttribute('readonly')
    fireEvent.keyDown(nameInput(), { key: 'Enter' })
    expect(savePreset).toHaveBeenCalledTimes(1) // 재진입 없음
    expect(pickFolder).not.toHaveBeenCalled()
    await act(async () => d.resolve(NEW))
    await waitFor(() => expect(root).not.toHaveAttribute('aria-busy'))
    expect(importBtn()).toBeEnabled()
    for (const li of items()) for (const b of within(li).getAllByRole('button')) expect(b).toBeEnabled()
    expect(nameInput()).not.toHaveAttribute('readonly')
    // 폴더 선택 대기도 진행 중
    const pf = deferred<string | null>()
    vi.mocked(pickFolder).mockReturnValueOnce(pf.promise)
    fireEvent.click(importBtn())
    await waitFor(() => expect(root).toHaveAttribute('aria-busy', 'true'))
    expect(importBtn()).toBeDisabled()
    expect(cardBtn('고양이 A', '적용')).toBeDisabled()
    await act(async () => pf.resolve(null))
    await waitFor(() => expect(importBtn()).toBeEnabled())
    expect(importPreset).not.toHaveBeenCalled()
  })

  it('TC-344: 다른 조작이 시작되면 인라인 편집을 버린다(적용 요청·다른 카드 이름 바꾸기·가져오기), 이름 바꾸기 시작은 상태 줄을 비운다', async () => {
    vi.mocked(pickFolder).mockResolvedValueOnce(DIR_OUT).mockResolvedValueOnce(null)
    vi.mocked(exportPreset).mockResolvedValueOnce({ folderName: '고양이 A' })
    await renderTab([P1, P2])
    const editing = () => within(listCard()).queryAllByRole('textbox').map(i => i.getAttribute('aria-label'))
    // ① 적용 요청
    fireEvent.click(cardBtn('고양이 A', '이름 바꾸기'))
    expect(editing()).toEqual([renameAria('고양이 A')])
    fireEvent.click(cardBtn('고양이 B', '적용'))
    expect(editing()).toEqual([])
    fireEvent.click(inDialog(KO.cancel))
    // ② 다른 카드 편집 — 한 번에 한 장, 초안은 새 카드 이름
    fireEvent.click(cardBtn('고양이 A', '이름 바꾸기'))
    fireEvent.change(within(card('고양이 A')).getByRole('textbox'), { target: { value: '버릴 초안' } })
    fireEvent.click(cardBtn('고양이 B', '이름 바꾸기'))
    expect(editing()).toEqual([renameAria('고양이 B')])
    expect((within(card('고양이 B')).getByRole('textbox') as HTMLInputElement).value).toBe('고양이 B')
    // ③ 내보내기(begin) — 편집 버림, 성공 안내
    fireEvent.click(cardBtn('고양이 A', '내보내기'))
    await waitFor(() => expect(status().textContent).toBe(exported('고양이 A')))
    expect(editing()).toEqual([])
    // ④ 이름 바꾸기 시작 → 상태 줄 비움
    fireEvent.click(cardBtn('고양이 A', '이름 바꾸기'))
    expect(status().textContent).toBe('')
    // ⑤ 가져오기(begin) — 편집 버림
    fireEvent.click(importBtn())
    expect(editing()).toEqual([])
    await waitFor(() => expect(importBtn()).toHaveFocus())
    expect(renamePreset).not.toHaveBeenCalled()
  })

  it.each(['reject', 'resolve'] as const)(
    'TC-345(%s): 진행 중 언마운트(탭 이동) → 뒤늦은 실패는 onError 로 창 공통 오류 줄에, 성공은 오류 없이 끝나고 던지지 않는다',
    async outcome => {
      const d = deferred<PresetSummary>()
      vi.mocked(savePreset).mockReturnValueOnce(d.promise)
      const r = await renderTab([P1])
      typeName('고양이 C')
      fireEvent.click(saveBtn())
      await waitFor(() => expect(savePreset).toHaveBeenCalledTimes(1))
      r.unmount()
      const err: BridgeError = { code: 'preset.io', message: '프리셋 파일을 쓰지 못했습니다.' }
      await act(async () => (outcome === 'reject' ? d.reject(err) : d.resolve(NEW)))
      if (outcome === 'reject') expect(onError).toHaveBeenCalledWith(err)
      else expect(nonNullErrors()).toEqual([])
      // 언마운트 뒤 재조회 여부는 판정하지 않는다(§4 은 setState 금지만 규정 — scenarios 「설계 확인 필요」 AC-3)
    },
  )
})

// ─── 3개 국어 (§9 · i18n §4.12, R-66 · R-20) ─────────────────────────────────
describe('PresetsTab — ja·en (R-66 · R-20)', () => {
  it.each(['ja', 'en'] as const)(
    'TC-346(%s): 카드 제목·설명·라벨·버튼·요약 줄·aria-label·빈 목록·확인창·문제 줄이 그 언어 사전 값',
    async lang => {
      const t = DICT[lang]
      vi.mocked(pickFolder).mockResolvedValueOnce(DIR_IN)
      vi.mocked(importPreset).mockResolvedValueOnce({ preset: null, problems: [{ fileName: 'kb_up.png', code: 'asset.not_rgba' }] })
      await renderTab([P1], NO_KB, lang)
      expect(saveCard(t.cardPresetSave)).toBeInTheDocument()
      expect(listCard(t.cardPresetList)).toBeInTheDocument()
      expect(within(saveCard(t.cardPresetSave)).getByText(t.presetSaveDesc)).toBeInTheDocument()
      expect(within(saveCard(t.cardPresetSave)).getByText(t.presetSaveNeedsRequired)).toBeInTheDocument()
      expect(nameInput(t.presetNameLabel)).toHaveAttribute('placeholder', t.presetNamePlaceholder)
      expect(within(saveCard(t.cardPresetSave)).getByRole('button', { name: t.presetSave })).toBeDisabled()
      const li = within(listCard(t.cardPresetList)).getByRole('listitem', { name: P1.name })
      expect(within(li).getByText(meta(P1, lang))).toBeInTheDocument()
      for (const action of [t.presetApply, t.presetExport, t.presetRename, t.presetDelete]) {
        expect(within(li).getByRole('button', { name: format(t.presetActionAria, { action, name: P1.name }) })).toHaveTextContent(action)
      }
      fireEvent.click(within(li).getByRole('button', { name: format(t.presetActionAria, { action: t.presetApply, name: P1.name }) }))
      const dlg = screen.getByRole('alertdialog', { name: t.confirmPresetApplyTitle })
      expect(dlg).toHaveAccessibleDescription(format(t.confirmPresetApplyMessage, { name: P1.name }))
      fireEvent.click(within(dlg).getByRole('button', { name: t.confirmCancel }))
      fireEvent.click(screen.getByRole('button', { name: t.presetImport }))
      const block = await within(saveCard(t.cardPresetSave)).findByRole('alert')
      expect(within(block).getByText(t.presetImportFailed)).toBeInTheDocument()
      expect(within(block).getAllByRole('listitem').map(x => x.textContent)).toEqual([
        `kb_up.png — ${errorText(t, lang, { code: 'asset.not_rgba', message: '' })}`,
      ])
      expect(pickFolder).toHaveBeenCalledWith(t.pickPresetFolderTitle)
    },
  )

  it('TC-346(en 빈 목록): en 빈 목록 문구', async () => {
    await renderTab([], FULL, 'en')
    expect(within(listCard(en.cardPresetList)).getByText(en.presetListEmpty)).toBeInTheDocument()
  })
})

// ─── TC-FLOW-33 (S-31 ~ S-34 종단) ──────────────────────────────────────────
describe('TC-FLOW-33 — 저장 → 내보내기(충돌 → 이름 바꾸기 → 다시) → 삭제 → 가져오기 → 적용', () => {
  it('TC-FLOW-33: S-31 ~ S-34 — 앞 Step 결과(목록·포커스)가 다음 Step 의 Given', async () => {
    const A: PresetSummary = { id: 'a1', name: '고양이 A', savedAt: Date.UTC(2026, 8, 30, 10, 0), imageCount: 12, hasAlarm: true }
    const A2: PresetSummary = { ...A, name: '고양이 A 방송' }
    const A_IMP: PresetSummary = { ...A2, id: 'a9' } // 원래 저장 날짜 유지(U-5)
    const exists: BridgeError = { code: 'preset.export_exists', message: '같은 이름의 폴더가 이미 있습니다.' }
    vi.mocked(savePreset).mockResolvedValueOnce(A)
    vi.mocked(pickFolder)
      .mockResolvedValueOnce(DIR_OUT) // 내보내기 1(충돌)
      .mockResolvedValueOnce(DIR_OUT) // 내보내기 2
      .mockResolvedValueOnce(DIR_IN) // 가져오기
    vi.mocked(exportPreset).mockRejectedValueOnce(exists).mockResolvedValueOnce({ folderName: '고양이 A 방송' })
    vi.mocked(renamePreset).mockResolvedValueOnce(A2)
    vi.mocked(deletePreset).mockResolvedValueOnce(undefined)
    vi.mocked(importPreset).mockResolvedValueOnce({ preset: A_IMP, problems: [] })
    vi.mocked(applyPreset).mockResolvedValueOnce(undefined)
    await renderTab([]) // Given: 빈 목록
    vi.mocked(listPresets)
      .mockResolvedValueOnce([A]) // 저장 뒤
      .mockResolvedValueOnce([A2]) // 이름 바꾸기 뒤
      .mockResolvedValueOnce([]) // 삭제 뒤
      .mockResolvedValueOnce([A_IMP]) // 가져오기 뒤
    // Step 1(TC-322) — S-31 저장
    typeName('고양이 A')
    fireEvent.click(saveBtn())
    await waitFor(() => expect(cardNames()).toEqual(['고양이 A']))
    expect(savePreset).toHaveBeenCalledWith('고양이 A')
    // Step 2(TC-336 → TC-340 → TC-334) — S-32 내보내기 충돌 → 이름 바꾸기 → 다시 내보내기
    fireEvent.click(cardBtn('고양이 A', '내보내기'))
    await waitFor(() => expect(onError).toHaveBeenLastCalledWith({ code: 'preset.export_exists', message: '' }))
    fireEvent.click(cardBtn('고양이 A', '이름 바꾸기'))
    fireEvent.change(within(card('고양이 A')).getByRole('textbox'), { target: { value: '고양이 A 방송' } })
    fireEvent.keyDown(within(card('고양이 A')).getByRole('textbox'), { key: 'Enter' })
    await waitFor(() => expect(cardNames()).toEqual(['고양이 A 방송']))
    expect(renamePreset).toHaveBeenCalledWith('a1', '고양이 A 방송')
    fireEvent.click(cardBtn('고양이 A 방송', '내보내기'))
    await waitFor(() => expect(status().textContent).toBe(exported('고양이 A 방송')))
    expect(vi.mocked(exportPreset).mock.calls).toEqual([
      ['a1', DIR_OUT],
      ['a1', DIR_OUT],
    ])
    // Step 3(TC-337 · TC-338 유일한 카드) — S-34 삭제
    fireEvent.click(cardBtn('고양이 A 방송', '삭제'))
    fireEvent.click(inDialog(KO.deleteOk))
    await waitFor(() => expect(within(listCard()).getByText(KO.empty)).toBeInTheDocument())
    expect(deletePreset).toHaveBeenCalledWith('a1')
    await waitFor(() => expect(nameInput()).toHaveFocus())
    // Step 4(TC-326) — S-33 가져오기
    fireEvent.click(importBtn())
    await waitFor(() => expect(cardNames()).toEqual(['고양이 A 방송']))
    expect(importPreset).toHaveBeenCalledWith(DIR_IN)
    expect(status().textContent).toBe(imported('고양이 A 방송'))
    expect(within(card('고양이 A 방송')).getByText(meta(A_IMP))).toBeInTheDocument() // 원래 날짜
    // Step 5(TC-330) — S-31 · S-33 적용
    fireEvent.click(cardBtn('고양이 A 방송', '적용'))
    fireEvent.click(inDialog(KO.applyOk))
    await waitFor(() => expect(status().textContent).toBe(applied('고양이 A 방송')))
    expect(applyPreset).toHaveBeenCalledWith('a9')
    expect(listPresets).toHaveBeenCalledTimes(5) // 마운트 1 + 저장·이름·삭제·가져오기 4, 적용 0
    expectNoForeignBridge()
    expectNoSubscription()
  })
})
