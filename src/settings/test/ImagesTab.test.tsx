/**
 * 「이미지 설정」 탭 컴포넌트 스펙 — CR-028 · R-25 (R-19 카드 양식 · R-20 문구·파일 대화상자 제목·에러 code 문구).
 * 기준: src/settings/design/images-tab.md §1 ~ §8 · design/i18n.md §4.3·§4.4·§4.6 · contract v0.14 §3.1·§3.2·§3.3·§5·§5.4·§6
 *       · scenarios.md TC-136 ~ TC-152 · 수용 기준 U-6 · U-7 · U-8.
 *       (CR-031, requirements v1.8 R-28) TC-151 개정(카드 자식 4개 순서), TC-157(제목·설명 title ko·ja·en)·
 *       TC-158(카드 오류 = 미리보기 안 띠·title, 추가 카드 오류 title) 신규. 높이·말줄임·칸 수는 수동 M-25.
 *       (CR-035, requirements v1.10 R-31·R-32·R-33 · images-tab §3·§5·§6·§7 I-3·I-3R·§8·§10 · i18n §4.6·§4.7 ·
 *       contract v0.16 restoreDefaultAsset·exportDefaultAssets(dir, overwrite)·ExportReport·pickFolder·
 *       DEFAULT_ASSET_SLOTS·hasBuiltinDefault·DEFAULT_MOUSE_SETTINGS.penPos (380,496))
 *       개정: TC-137·TC-142·TC-143·TC-144·TC-145·TC-146·TC-147·TC-148·TC-150·TC-151·TC-157(import 만).
 *       신규: TC-179 ~ TC-191 · TC-FLOW-15 ~ TC-FLOW-17. 도우미 cardButtons 는 카드 안 버튼만(다운로드 단추 제외 — §10.4).
 *       실제 폴더 저장·원본 크기는 수동 M-30, 첫 실행 채우기는 수동 M-29.
 * bridge 는 mock(vi.mock('bridge/commands')) — toBridgeError 만 실물. `bridge/types`(REQUIRED_SLOTS·isRequiredSlot·slotKey·
 * DEFAULT_MOUSE_SETTINGS·DEFAULT_ASSET_SLOTS·hasBuiltinDefault)와 `state/mouseMapping`(resolvePenPos)은 실물.
 * 미리보기 교체는 assets://changed 로만 일어난다 — 이 컴포넌트 스펙은 props(manifest) 재렌더로 흉내 낸다.
 * 선행: bridge v0.16 소스 반영 + CR-035 화면(DefaultsDownloadPanel·resetKind).
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  AssetEntry,
  AssetManifest,
  AssetSlot,
  BridgeError,
  ExportReport,
  MouseSettings,
  Settings,
} from 'bridge/types'
import { DEFAULT_ASSET_SLOTS, DEFAULT_TIMER_SETTINGS, slotKey } from 'bridge/types'
import {
  exportDefaultAssets,
  importAsset,
  pickFolder,
  pickPngFile,
  removeAsset,
  restoreDefaultAsset,
  setSettings,
} from 'bridge/commands'
import ImagesTab from '../components/ImagesTab'
import ConfirmDialog from '../components/ConfirmDialog'
import { MessagesProvider } from '../i18n/MessagesContext'
import { format } from '../i18n/index'
import { ja } from '../i18n/ja'
import { ko } from '../i18n/ko'
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
    restoreDefaultAsset: vi.fn(), // v0.16 신규(CR-035)
    exportDefaultAssets: vi.fn(), // v0.16 신규(CR-035)
    pickFolder: vi.fn(), // v0.16 신규(CR-035)
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
  penPos: null, // 옛 settings.json 호환 경로(null) — 기본값 (380,496)은 DEFAULT_MOUSE_SETTINGS(CR-035)
  penMode: false, // CR-033(contract v0.15 §3.3). 펜 손 사용 토글·첫 등록 확인창 스펙은 test/PenMode.test.tsx
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
const penDown = (index: number): AssetSlot => ({ kind: 'pen_down', index })
const entry = (slot: AssetSlot, w = 900, h = 700, v = ''): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width: w,
  height: h,
  bytes: 1000,
  url: `asset://${slotKey(slot)}.png${v}`,
})
const EMPTY: AssetManifest = { canvas: null, entries: [] }
/** body 가 등록돼 있어도 카드는 없다(D-8) · kb_down 2장 · 팔 파츠 */
const BASIC: AssetManifest = {
  canvas: CANVAS,
  entries: [entry('body'), entry('kb_up'), entry(kbDown(0)), entry(kbDown(1)), entry('mouse_base', 200, 150)],
}
const WITH_PEN: AssetManifest = { ...BASIC, entries: [...BASIC.entries, entry('pen_up', 100, 80)] }
/** 내장 기본 pen_up(90×154 — contract v0.16 §3.3 penPos 주) */
const DEF_PEN_UP = entry('pen_up', 90, 154, '?v=d')
/** hand (400,560) 에 90×154 중심 → (355,483) (resolvePenPos 실물) */
const DEF_PEN_POS = { x: 355, y: 483 }
const PATH = 'C:\\img\\new.png'
const DIR = 'D:\\trace'
const TOO_LARGE: BridgeError = {
  code: 'asset.too_large',
  message: '이미지가 너무 큽니다. 최대 900×700 (현재 1000×800).',
}
const MISMATCH: BridgeError = {
  code: 'asset.canvas_mismatch',
  message: '같은 묶음의 그림 크기가 다릅니다: 기본 그림 900×700, 현재 캔버스 800×600',
}
const EXPORT_DIR: BridgeError = { code: 'asset.export_dir', message: '저장할 폴더를 찾을 수 없습니다: D:\\gone' }

/** 빈 매니페스트 카드 순서 — CR-037: 배경 그룹 둘째에 hair, CR-042(R-39): 손 그룹 pen_up·pen_down_0 두 장 → 18장 */
const ORDER = [
  'background',
  'hair',
  'pomo_char', // CR-045(R-42, timer-tab §13): 배경 그룹 셋째·넷째 → 20장
  'pomo_bubble',
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
/** CR-042: 옛 끝 7장(손 스페이스 ~ 손 Ctrl+Z) 삭제 */
const TITLES = [
  '배경',
  '뒷머리', // CR-037
  '뽀모도 인물', // CR-045(i18n §4.9)
  '뽀모도 말풍선',
  '기본',
  '타자 입력 1',
  '대기',
  '쉬는중',
  '스페이스',
  'ㅋ·Z',
  '?',
  '!',
  'Enter',
  'Backspace',
  'Ctrl+Z',
  '팔 기본',
  '왼클릭',
  '오른클릭',
  '손 기본',
  '펜 입력 1',
]
/** CR-042(i18n §4.4 CR-042 블록 ko 확정) — 손 두 카드 설명 */
const PEN_UP_DESC_KO = '팔 끝에 붙는 펜 쥔 손. 「펜 손 사용」을 켜면 아무것도 누르지 않을 때 이 그림'
const PEN_DOWN_DESC_KO = '키·클릭을 누르는 동안의 손. 특수 키는 키보드의 특수 키 그림도 함께 바뀜'
/** CR-043(R-40, contract v0.19 REQUIRED_SLOTS): 필수 2장 — kb_down_0 은 선택으로 강등(옛 ['kb_up', 'kb_down_0', 'mouse_base']) */
const REQUIRED = ['kb_up', 'mouse_base']
/** CR-043(i18n §4.4 CR-043 블록 ko 확정) — 「타자 입력 1」 카드 설명 */
const KB_DOWN_DESC_KO = '「펜 손 사용」이 꺼져 있을 때(키보드만 쓸 때) 타자를 치면 나오는 그림(여러 장이면 차례로 바뀜)'
/** CR-043(R-41): kb_down_0 만 있음(뒤 장 없음) → 「타자 입력 1」 「비우기」 활성 */
const KB1: AssetManifest = {
  canvas: CANVAS,
  entries: [entry('kb_up'), entry(kbDown(0)), entry('mouse_base', 200, 150)],
}
/** CR-043(R-41): 비운 뒤 응답·수신 — kb_down 없음(필수 2장은 채워짐) */
const NO_DOWN: AssetManifest = { canvas: CANVAS, entries: [entry('kb_up'), entry('mouse_base', 200, 150)] }
const DOWN_IO: BridgeError = { code: 'asset.io', message: '타자 입력 1 파일을 지우지 못했습니다. (테스트)' }
const DOWN_GONE: BridgeError = { code: 'asset.not_found', message: 'kb_down_0.png 없음 (테스트)' }
/**
 * (CR-053 이후) 「core 가 돌려준 내보내기 응답 예」 전용 6칸 파일명 — CR-044 시점 기본 세트 모양.
 * 결과 줄은 core `written` 수를 그대로 보이므로(화면 판정 없음, images-tab §10.5) 연동 TC-183·TC-184·TC-185·TC-187·TC-191 이
 * 이 응답 모양과 「6장」 문구를 계속 단언한다(CR-053 에서 기대 불변). 내장 기본 목록 대조는 아래 DEFAULT_KEYS7.
 */
const DEFAULT_KEYS = ['kb_up', 'kb_down_0', 'background', 'mouse_base', 'pen_up', 'pen_down_0']
const DEFAULT_FILES = DEFAULT_KEYS.map(k => `${k}.png`)
const DONE6: ExportReport = { written: DEFAULT_FILES, conflicts: [], failed: [] }
/**
 * 내장 기본 7칸(CR-053 🔒, 확정사항 CR-053 줄 「배포용 기본 세트 3차」·contract v0.24 — CR-044 6칸·CR-038 7칸·CR-035 15칸 대체).
 * hair·pomo_char = 복원 칸 + 셋째 버튼 「비우기」, kb_down_0 = 기본 없음(「기본값」 = 비우기, 셋째 버튼 없음).
 * DEFAULT_ASSET_SLOTS 를 베끼지 않고 리터럴로 둔다(bridge 상수와 독립 대조 — 순서는 contract v0.24 표).
 */
const DEFAULT_KEYS7 = ['kb_up', 'background', 'hair', 'pomo_char', 'mouse_base', 'pen_up', 'pen_down_0']
const DEFAULT_FILES7 = DEFAULT_KEYS7.map(k => `${k}.png`)
const DONE7: ExportReport = { written: DEFAULT_FILES7, conflicts: [], failed: [] }
const DESC7_KO = '내장 기본 그림 7장을 원본 크기 그대로 폴더에 저장합니다. 따라 그리거나 고쳐 쓸 때 쓰세요.'

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
  vi.mocked(pickFolder).mockResolvedValue(DIR)
  vi.mocked(setSettings).mockImplementation(async s => s)
})

// ─── 도우미 ────────────────────────────────────────────────────────────────
const tree = (s: Settings, m: AssetManifest, language?: string) => {
  const tab = <ImagesTab settings={s} manifest={m} onError={onError} />
  return language ? <MessagesProvider language={language}>{tab}</MessagesProvider> : tab
}
const renderImages = (m: AssetManifest = EMPTY, s: Settings = SETTINGS, language?: string) => {
  const utils = render(tree(s, m, language))
  return { ...utils, update: (nm: AssetManifest, ns: Settings = s) => utils.rerender(tree(ns, nm, language)) }
}
const region = () => screen.getByRole('region', { name: '이미지 설정' })
const card = (key: string) => screen.getByTestId(`slot-card-${key}`)
const addCard = (key: string) => screen.getByTestId(`add-card-${key}`)
const changeBtn = (key: string, name: string) =>
  within(card(key)).getByRole('button', { name: `${name} 이미지 변경` })
/** 비우기 칸(resetKind 'clear')의 「기본값」 */
const clearBtn = (key: string, name: string) =>
  within(card(key)).getByRole('button', { name: `${name} 그림 지우기` })
/** 복원 칸(resetKind 'restore')의 「기본값」 — restoreImageAria */
const restoreBtn = (key: string, name: string) =>
  within(card(key)).getByRole('button', { name: `${name} 기본 그림으로 되돌리기` })
/** 카드(슬롯·추가) 안 버튼만 — 다운로드 단추는 slotBusy 와 무관(§10.4)이라 뺀다 */
const cardButtons = () =>
  within(region())
    .getAllByRole('button')
    .filter(b => b.closest('[data-testid^="slot-card-"], [data-testid^="add-card-"]') !== null)
const cardIds = () =>
  Array.from(region().querySelectorAll<HTMLElement>('[data-testid^="slot-card-"], [data-testid^="add-card-"]')).map(
    e => e.dataset.testid,
  )
const dialog = () => screen.getByRole('alertdialog')
const openClear = (key: string, name: string) => {
  const trigger = clearBtn(key, name)
  fireEvent.click(trigger)
  return trigger
}
const openRestore = (key: string, name: string) => {
  const trigger = restoreBtn(key, name)
  fireEvent.click(trigger)
  return trigger
}
const confirmRestore = () => fireEvent.click(within(dialog()).getByRole('button', { name: '기본 그림으로' }))
const downloadBtn = () => screen.getByRole('button', { name: '기본 이미지 다운로드' })
/** 다운로드 결과 줄(p.downloadResult — data-tone 을 가진 유일한 원소, 언어 무관) */
const resultLine = () => document.querySelector<HTMLElement>('p[data-tone]')
const follows = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

// ─── 레이아웃 (U-6) ─────────────────────────────────────────────────────────
describe('ImagesTab — 레이아웃·카드 (R-25·R-19, U-6)', () => {
  it('TC-136 (CR-037·CR-042·CR-043 개정): 빈 매니페스트 — 안내·그룹 4개·카드 18장 순서·제목(손 그룹 = 손 기본·펜 입력 1)·필수 배지 2장(kb_up·mouse_base)·빈 미리보기 문구, body 카드 없음, bridge 호출 없음', () => {
    renderImages(EMPTY)
    expect(
      within(region()).getByText(
        'PNG(32비트 RGBA)만 쓸 수 있습니다. 최대 900×700·1MB. 배경·뒷머리·뽀모도·키보드 그림은 모두 같은 크기로 만드세요.', // CR-045
      ),
    ).toBeInTheDocument()
    expect(ORDER).toHaveLength(20) // CR-045: + 뽀모도 2(CR-042: 옛 25 → 18)
    expect(within(region()).getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual([
      '배경',
      '키보드 (본체)',
      '팔 (마우스)',
      '손 (펜)',
    ])
    expect(cardIds()).toEqual(ORDER.map(k => `slot-card-${k}`))
    expect(within(region()).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(TITLES)
    for (const key of ORDER) {
      const required = REQUIRED.includes(key)
      expect(within(card(key)).getByText(required ? '필수' : '선택'), key).toBeInTheDocument()
      expect(within(card(key)).getByText(required ? '필수 · 미등록' : '등록된 그림 없음'), key).toBeInTheDocument()
      expect(card(key).querySelector('img'), key).toBeNull()
    }
    expect(within(card('kb_up')).getByText('가만히 있을 때. 캐릭터 전체를 그려도 됩니다')).toBeInTheDocument()
    expect(screen.queryByTestId('slot-card-body')).toBeNull()
    expect(screen.queryAllByTestId(/^add-card-/)).toHaveLength(0)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(pickPngFile).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-137 (CR-035·CR-038 개정): 등록된 카드 — 미리보기 img, 버튼 문구 「이미지 변경」/「기본값」, aria-label 은 resetKind 로 고르고, 복원 칸은 비어 있어도 활성·빈 비우기 칸(idle)은 비활성', () => {
    renderImages(BASIC)
    const img = card('kb_up').querySelector('img')
    expect(img).toHaveAttribute('src', 'asset://kb_up.png')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('draggable', 'false')
    expect(within(card('kb_up')).queryByText('필수 · 미등록')).toBeNull()
    expect(changeBtn('kb_up', '기본')).toHaveTextContent('이미지 변경')
    expect(restoreBtn('kb_up', '기본')).toHaveTextContent('기본값')
    expect(within(card('kb_up')).queryByRole('button', { name: '기본 그림 지우기' })).toBeNull()
    expect(changeBtn('kb_up', '기본')).toBeEnabled()
    expect(restoreBtn('kb_up', '기본')).toBeEnabled()
    // CR-038: 빈 복원 칸 예 = background(옛 idle — idle 은 내장 기본이 빠져 비우기 칸이 됐다)
    expect(changeBtn('background', '배경')).toBeEnabled()
    expect(restoreBtn('background', '배경')).toBeEnabled() // 빈 복원 칸도 활성(옛 기대 「비활성」 대체)
    expect(restoreBtn('background', '배경')).toHaveTextContent('기본값')
    expect(changeBtn('idle', '대기')).toBeEnabled()
    expect(clearBtn('idle', '대기')).toBeDisabled() // CR-038: 빈 비우기 칸
    expect(clearBtn('idle', '대기')).toHaveTextContent('기본값')
    expect(within(card('idle')).queryByRole('button', { name: '대기 기본 그림으로 되돌리기' })).toBeNull()
    expect(clearBtn('kb_down_1', '타자 입력 2')).toHaveTextContent('기본값') // 비우기 칸 — 보이는 글자는 같다
    expect(clearBtn('kb_down_1', '타자 입력 2')).toBeEnabled()
    expect(clearBtn('mouse_left', '왼클릭')).toBeDisabled() // 빈 비우기 칸
    expect(card('mouse_base').querySelector('img')).toHaveAttribute('src', 'asset://mouse_base.png')
    expect(screen.queryByTestId('slot-card-body')).toBeNull()
  })
})

// ─── 이미지 변경 (U-7) ──────────────────────────────────────────────────────
describe('ImagesTab — 이미지 변경 (R-25, I-1·I-2, U-7)', () => {
  it('TC-138: 파일 대화상자 취소 → pickPngFile(t.pickTitle) 1회 뒤 아무 호출 없음, 버튼 활성 유지', async () => {
    vi.mocked(pickPngFile).mockResolvedValue(null)
    renderImages(EMPTY)
    fireEvent.click(changeBtn('kb_up', '기본'))
    expect(pickPngFile).toHaveBeenCalledTimes(1)
    expect(pickPngFile).toHaveBeenCalledWith('PNG 이미지 선택')
    await act(async () => {})
    expect(importAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expect(cardButtons().filter(b => b.textContent === '이미지 변경').every(b => !(b as HTMLButtonElement).disabled)).toBe(true)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('TC-139: 선택 성공 → importAsset(slot, path), 진행 중 모든 카드 버튼 비활성(대화상자 동안은 아님), 미리보기는 assets://changed 로만 바뀐다', async () => {
    const pick = deferred<string | null>()
    const imp = deferred<AssetManifest>()
    vi.mocked(pickPngFile).mockReturnValue(pick.promise)
    vi.mocked(importAsset).mockReturnValue(imp.promise)
    const { update } = renderImages(EMPTY)
    fireEvent.click(changeBtn('kb_up', '기본'))
    expect(changeBtn('idle', '대기')).toBeEnabled() // 대화상자(OS 모달) 동안은 slotBusy 없음
    await act(async () => pick.resolve(PATH))
    await waitFor(() => expect(importAsset).toHaveBeenCalledTimes(1))
    expect(importAsset).toHaveBeenCalledWith('kb_up', PATH)
    for (const b of cardButtons()) expect(b).toBeDisabled()
    fireEvent.click(changeBtn('idle', '대기'))
    expect(pickPngFile).toHaveBeenCalledTimes(1)
    const next: AssetManifest = { canvas: CANVAS, entries: [entry('kb_up', 900, 700, '?v=2')] }
    await act(async () => imp.resolve(next))
    await waitFor(() => expect(changeBtn('idle', '대기')).toBeEnabled())
    expect(card('kb_up').querySelector('img')).toBeNull() // props 전에는 그대로
    update(next)
    expect(card('kb_up').querySelector('img')).toHaveAttribute('src', 'asset://kb_up.png?v=2')
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('TC-140: 검증 실패·대화상자 실패 → 그 카드 아래 오류 한 줄(ko = message), 다른 카드 성공이면 지워짐, 창 오류 줄은 쓰지 않음', async () => {
    vi.mocked(importAsset).mockRejectedValueOnce(TOO_LARGE).mockResolvedValueOnce(BASIC)
    renderImages(EMPTY)
    fireEvent.click(changeBtn('kb_up', '기본'))
    await waitFor(() => expect(within(card('kb_up')).getByRole('alert').textContent).toBe(TOO_LARGE.message))
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    await waitFor(() => expect(changeBtn('kb_up', '기본')).toBeEnabled())
    fireEvent.click(changeBtn('idle', '대기'))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(importAsset).toHaveBeenNthCalledWith(2, 'idle', PATH)
    vi.mocked(pickPngFile).mockRejectedValueOnce(new Error('dialog failed'))
    fireEvent.click(changeBtn('rest', '쉬는중'))
    await waitFor(() => expect(within(card('rest')).getByRole('alert').textContent).toBe('dialog failed'))
    expect(importAsset).toHaveBeenCalledTimes(2)
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-141 (CR-042 개정): 추가 카드 → 다음 index 로 importAsset(kb_down), 실패는 추가 카드 아래, 첫 장이 없으면 추가 카드 없음 — 손(펜) 그룹에는 pen_down_0 이 있어도 추가 카드가 없다', async () => {
    const PEN2: AssetManifest = { ...WITH_PEN, entries: [...WITH_PEN.entries, entry(penDown(0), 100, 80)] }
    vi.mocked(importAsset).mockResolvedValueOnce(BASIC).mockRejectedValueOnce(TOO_LARGE)
    const { update } = renderImages(PEN2)
    const addKb = within(addCard('kb_down_2')).getByRole('button', { name: '+ 타자 입력 그림 추가' })
    fireEvent.click(addKb)
    await waitFor(() => expect(importAsset).toHaveBeenCalledWith(kbDown(2), PATH))
    await waitFor(() => expect(addKb).toBeEnabled())
    // CR-042(images-tab §3.2): 손 추가 카드(add-card-pen_down_1)·「+ 펜 입력 그림 추가」 없음
    expect(screen.queryByTestId('add-card-pen_down_1')).toBeNull()
    expect(screen.queryByRole('button', { name: '+ 펜 입력 그림 추가' })).toBeNull()
    // 실패 경로는 키보드 추가 카드로(옛 손 추가 카드 경로 소멸)
    fireEvent.click(addKb)
    await waitFor(() => expect(within(addCard('kb_down_2')).getByRole('alert').textContent).toBe(TOO_LARGE.message))
    expect(importAsset).toHaveBeenCalledTimes(2)
    expect(importAsset).toHaveBeenLastCalledWith(kbDown(2), PATH)
    expect(vi.mocked(importAsset).mock.calls.some(([slot]) => slotKey(slot) === 'pen_down_1')).toBe(false)
    expect(setSettings).not.toHaveBeenCalled()
    const ids = cardIds()
    expect(ids.indexOf('add-card-kb_down_2')).toBe(ids.indexOf('slot-card-kb_down_1') + 1)
    expect(ids.filter(id => id?.startsWith('add-card-'))).toEqual(['add-card-kb_down_2'])
    expect(ids.slice(-2)).toEqual(['slot-card-pen_up', 'slot-card-pen_down_0'])
    update(EMPTY) // 첫 장이 없으면 추가 카드 없음
    expect(screen.queryAllByTestId(/^add-card-/)).toHaveLength(0)
  })
})

// ─── 손(펜) 그룹 두 칸 (CR-042 · R-39, images-tab §3.2) ───
describe('ImagesTab — 손(펜) 그룹 두 칸 (R-39, CR-042)', () => {
  /** 옛 설정 창에서 등록해 둔 pen_down_1+·pen_key_* 파일이 남은 매니페스트(카드 없음 — 수용) */
  const OLD_PEN: AssetManifest = {
    ...WITH_PEN,
    entries: [
      ...WITH_PEN.entries,
      entry(penDown(0), 100, 80),
      entry(penDown(1), 100, 80),
      entry(penDown(2), 100, 80),
      entry('pen_key_space', 100, 80),
    ],
  }
  const fromPenUp = () => {
    const ids = cardIds()
    return ids.slice(ids.indexOf('slot-card-pen_up'))
  }

  it('TC-227: 옛 파일(pen_down_1·pen_down_2·pen_key_space)이 남아도 손 그룹 = 「손 기본」·「펜 입력 1」 두 카드 — 새 설명(ko)·추가 카드 없음·pen_down_0 「기본값」 = 복원(활성·title 없음), 호출 없음', () => {
    renderImages(OLD_PEN)
    const ids = cardIds()
    expect(ids).toHaveLength(22) // 배경 4(CR-045 뽀모도 2) + 키보드 12(kb_down_0·1) + 추가 kb_down_2 + 팔 3 + 손 2
    expect(fromPenUp()).toEqual(['slot-card-pen_up', 'slot-card-pen_down_0'])
    expect(ids.filter(id => /pen_key_|pen_down_[1-9]/.test(id ?? ''))).toEqual([])
    expect(within(card('pen_up')).getByRole('heading', { level: 3 }).textContent).toBe('손 기본')
    expect(within(card('pen_down_0')).getByRole('heading', { level: 3 }).textContent).toBe('펜 입력 1')
    expect(card('pen_up').children[1].textContent).toBe(PEN_UP_DESC_KO)
    expect(card('pen_down_0').children[1].textContent).toBe(PEN_DOWN_DESC_KO)
    expect(card('pen_down_0').querySelector('img')).toHaveAttribute('src', 'asset://pen_down_0.png')
    expect(restoreBtn('pen_down_0', '펜 입력 1')).toBeEnabled()
    expect(restoreBtn('pen_down_0', '펜 입력 1')).not.toHaveAttribute('title')
    expect(restoreBtn('pen_up', '손 기본')).toBeEnabled()
    expect(changeBtn('pen_up', '손 기본')).toBeEnabled()
    expect(changeBtn('pen_down_0', '펜 입력 1')).toBeEnabled()
    expect(screen.queryByRole('button', { name: '+ 펜 입력 그림 추가' })).toBeNull()
    expect(screen.queryByText('손 스페이스')).toBeNull()
    expect(pickPngFile).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-FLOW-21: S-20 — 손 그룹 두 카드의 설명을 읽고 「펜 입력 1」에 자기 그림을 넣는다 → importAsset(pen_down_0), 넣은 뒤에도 추가 카드 없이 두 카드 그대로', async () => {
    const MINE: AssetManifest = { ...WITH_PEN, entries: [...WITH_PEN.entries, entry(penDown(0), 100, 80, '?v=2')] }
    vi.mocked(importAsset).mockResolvedValue(MINE)
    const { update } = renderImages(WITH_PEN)
    // Step 1 · TC-227 부분: 두 카드·새 설명
    expect(fromPenUp()).toEqual(['slot-card-pen_up', 'slot-card-pen_down_0'])
    expect(card('pen_up').children[1].textContent).toBe(PEN_UP_DESC_KO)
    expect(card('pen_down_0').children[1].textContent).toBe(PEN_DOWN_DESC_KO)
    // Step 2 · TC-139 부분: 「펜 입력 1 이미지 변경」 → importAsset(pen_down_0, PATH)
    fireEvent.click(changeBtn('pen_down_0', '펜 입력 1'))
    await waitFor(() => expect(importAsset).toHaveBeenCalledWith(penDown(0), PATH))
    await waitFor(() => expect(changeBtn('pen_up', '손 기본')).toBeEnabled())
    update(MINE) // assets://changed 흉내 — Step 2 응답이 Step 3 의 Given
    // Step 3 · TC-141 부분: 첫 장이 생겨도 손 추가 카드 없음
    expect(card('pen_down_0').querySelector('img')).toHaveAttribute('src', 'asset://pen_down_0.png?v=2')
    expect(fromPenUp()).toEqual(['slot-card-pen_up', 'slot-card-pen_down_0'])
    expect(screen.queryByTestId('add-card-pen_down_1')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull() // 첫 등록 확인창은 pen_up 만
    expect(pickPngFile).toHaveBeenCalledTimes(1)
    expect(pickPngFile).toHaveBeenCalledWith('PNG 이미지 선택')
    expect(importAsset).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled() // pen_down 은 penPos 대상 아님
  })
})

// ─── 기본값 = 비우기(내장 기본이 없는 칸, I-3) (U-8) ─────────────────────────
describe('ImagesTab — 기본값 = 비우기(내장 기본 없는 칸) (R-25·R-32, I-3, U-8)', () => {
  it('TC-142 (CR-035·CR-038·CR-042·CR-053 개정): 비우기 칸만 옛 규칙 — 빈 칸(idle 포함)·여러 장의 가운데 장(kb_down_0·kb_down_1, 툴팁) 비활성, 마지막 장 활성 / 복원 칸은 빈 칸(background·hair)도 활성·툴팁 없음', () => {
    const KB3P: AssetManifest = { ...BASIC, entries: [...BASIC.entries, entry(kbDown(2))] }
    renderImages(KB3P)
    expect(clearBtn('kb_down_1', '타자 입력 2')).toBeDisabled()
    expect(clearBtn('kb_down_1', '타자 입력 2')).toHaveAttribute('title', '마지막 장부터 지울 수 있습니다.')
    expect(clearBtn('kb_down_2', '타자 입력 3')).toBeEnabled()
    expect(clearBtn('kb_down_2', '타자 입력 3')).not.toHaveAttribute('title')
    expect(clearBtn('mouse_left', '왼클릭')).toBeDisabled()
    expect(clearBtn('mouse_left', '왼클릭')).not.toHaveAttribute('title')
    // CR-042: 옛 「손 스페이스」(pen_key_space) 카드는 없다 — 같은 종류의 빈 비우기 칸 key_space 로 대체
    expect(screen.queryByTestId('slot-card-pen_key_space')).toBeNull()
    expect(clearBtn('key_space', '스페이스')).toBeDisabled()
    // CR-053: kb_down_0 은 비우기 칸 — 가운데 장이면 비활성·툴팁(CR-035 ~ CR-044 「복원 칸·활성」 대체), 복원 이름 버튼 없음
    expect(clearBtn('kb_down_0', '타자 입력 1')).toBeDisabled()
    expect(clearBtn('kb_down_0', '타자 입력 1')).toHaveAttribute('title', '마지막 장부터 지울 수 있습니다.')
    expect(within(card('kb_down_0')).queryByRole('button', { name: '타자 입력 1 기본 그림으로 되돌리기' })).toBeNull()
    expect(restoreBtn('background', '배경')).toBeEnabled() // CR-038: 빈 복원 칸 예(옛 idle)
    expect(restoreBtn('background', '배경')).not.toHaveAttribute('title')
    expect(restoreBtn('hair', '뒷머리')).toBeEnabled() // CR-053: 빈 복원 칸 예(내장 뒷머리)
    expect(restoreBtn('hair', '뒷머리')).not.toHaveAttribute('title')
    fireEvent.click(clearBtn('kb_down_0', '타자 입력 1'))
    expect(clearBtn('idle', '대기')).toBeDisabled() // CR-038: idle 은 빈 비우기 칸
    expect(clearBtn('idle', '대기')).not.toHaveAttribute('title')
    expect(restoreBtn('kb_up', '기본')).toBeEnabled()
    fireEvent.click(clearBtn('idle', '대기'))
    fireEvent.click(clearBtn('kb_down_1', '타자 입력 2'))
    fireEvent.click(clearBtn('mouse_left', '왼클릭'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
  })

  it('TC-143 (CR-035 개정): 비우기 칸 「기본값」 → 비우기 확인창(포커스 「취소」) → 「지우기」 → removeAsset(slot) 1회·restoreDefaultAsset 0회·진행 중 전부 비활성·끝나면 누른 버튼으로 포커스', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const rm = deferred<AssetManifest>()
    vi.mocked(removeAsset).mockReturnValue(rm.promise)
    renderImages(BASIC)
    const trigger = openClear('kb_down_1', '타자 입력 2')
    const dlg = dialog()
    expect(dlg).toHaveAttribute('aria-modal', 'true')
    expect(dlg).toHaveAccessibleName('그림 지우기')
    expect(dlg).toHaveAccessibleDescription('‘타자 입력 2’ 그림을 지울까요? 되돌릴 수 없습니다.')
    expect(within(dlg).getByRole('button', { name: '취소' })).toHaveFocus()
    expect(removeAsset).not.toHaveBeenCalled()
    fireEvent.click(within(dlg).getByRole('button', { name: '지우기' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(removeAsset).toHaveBeenCalledTimes(1))
    expect(removeAsset).toHaveBeenCalledWith(kbDown(1))
    for (const b of cardButtons()) expect(b).toBeDisabled()
    await act(async () => rm.resolve(BASIC))
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(changeBtn('kb_up', '기본')).toBeEnabled()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('TC-144 (CR-035 개정): 복원·비우기 확인창 모두 「취소」·Esc → 호출 없음·누른 버튼으로 포커스 복귀, 배경막 클릭으로는 닫히지 않는다', () => {
    renderImages(BASIC)
    let trigger = openRestore('kb_up', '기본')
    expect(dialog()).toHaveAccessibleName('기본 그림으로 되돌리기')
    fireEvent.click(within(dialog()).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(trigger).toHaveFocus()
    trigger = openRestore('kb_up', '기본')
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(trigger).toHaveFocus()
    trigger = openClear('kb_down_1', '타자 입력 2')
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(trigger).toHaveFocus()
    openRestore('kb_up', '기본')
    const backdrop = dialog().parentElement as HTMLElement
    fireEvent.click(backdrop)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
  })

  it('TC-145 (CR-035 개정 — 대상 칸만): 확인창 안에서 Tab·Shift+Tab 은 두 버튼 사이에서만 돈다(비우기·복원 모두)', () => {
    renderImages(BASIC)
    openClear('kb_down_1', '타자 입력 2')
    const ok = within(dialog()).getByRole('button', { name: '지우기' })
    const cancel = within(dialog()).getByRole('button', { name: '취소' })
    expect(cancel).toHaveFocus()
    fireEvent.keyDown(cancel, { key: 'Tab' })
    expect(ok).toHaveFocus()
    fireEvent.keyDown(ok, { key: 'Tab' })
    expect(cancel).toHaveFocus()
    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true })
    expect(ok).toHaveFocus()
    fireEvent.keyDown(ok, { key: 'Escape' })
    openRestore('kb_up', '기본')
    const rOk = within(dialog()).getByRole('button', { name: '기본 그림으로' })
    const rCancel = within(dialog()).getByRole('button', { name: '취소' })
    expect(rCancel).toHaveFocus()
    fireEvent.keyDown(rCancel, { key: 'Tab' })
    expect(rOk).toHaveFocus()
    fireEvent.keyDown(rOk, { key: 'Tab' })
    expect(rCancel).toHaveFocus()
  })

  it('TC-146: 비우기 실패 → 그 카드 오류 줄(ko = message), 버튼 다시 활성, 누른 버튼으로 포커스', async () => {
    const notFound: BridgeError = { code: 'asset.not_found', message: '등록되지 않은 슬롯입니다: kb_down_1' }
    vi.mocked(removeAsset).mockRejectedValue(notFound)
    renderImages(BASIC)
    const trigger = openClear('kb_down_1', '타자 입력 2')
    fireEvent.click(within(dialog()).getByRole('button', { name: '지우기' }))
    await waitFor(() => expect(within(card('kb_down_1')).getByRole('alert').textContent).toBe(notFound.message))
    await waitFor(() => expect(trigger).toBeEnabled())
    expect(trigger).toHaveFocus()
    expect(onError).not.toHaveBeenCalled()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
  })

  it('TC-147 (CR-035·CR-053 개정): 필수 칸 「기본값」은 복원만(removeAsset 0회)·비어 있던 필수 칸도 복원 활성(kb_down_0 가운데 장은 CR-053 비우기 칸이라 잠김), 비우기 중 카드가 먼저 사라지면 포커스는 탭 section', async () => {
    const rm = deferred<AssetManifest>()
    vi.mocked(restoreDefaultAsset).mockResolvedValue(BASIC)
    vi.mocked(removeAsset).mockReturnValueOnce(rm.promise)
    const noUp: AssetManifest = { ...BASIC, entries: BASIC.entries.filter(e => e.slot !== 'kb_up') } // 기존 설치에서 비어 있던 필수 칸
    const { update } = renderImages(noUp)
    expect(within(card('kb_up')).getByText('필수 · 미등록')).toBeInTheDocument()
    expect(restoreBtn('kb_up', '기본')).toBeEnabled()
    expect(within(card('kb_up')).queryByRole('button', { name: '기본 그림 지우기' })).toBeNull()
    openRestore('kb_up', '기본')
    confirmRestore()
    await waitFor(() => expect(restoreDefaultAsset).toHaveBeenCalledWith('kb_up'))
    update(BASIC) // assets://changed — 기본 그림
    await waitFor(() => expect(restoreBtn('kb_up', '기본')).toBeEnabled())
    expect(card('kb_up').querySelector('img')).toHaveAttribute('src', 'asset://kb_up.png')
    expect(within(card('kb_up')).queryByText('필수 · 미등록')).toBeNull()
    // CR-053: kb_down_0(뒤에 kb_down_1) = 비우기 칸 가운데 장 → 비활성(옛 기대 「복원 활성」 대체)
    expect(clearBtn('kb_down_0', '타자 입력 1')).toBeDisabled()
    expect(restoreBtn('mouse_base', '팔 기본')).toBeEnabled()
    openClear('kb_down_1', '타자 입력 2')
    fireEvent.click(within(dialog()).getByRole('button', { name: '지우기' }))
    await waitFor(() => expect(removeAsset).toHaveBeenCalledTimes(1))
    update({ ...BASIC, entries: BASIC.entries.filter(e => slotKey(e.slot) !== 'kb_down_1') }) // assets://changed 가 응답보다 먼저
    expect(screen.queryByTestId('slot-card-kb_down_1')).toBeNull()
    await act(async () => rm.resolve(BASIC))
    await waitFor(() => expect(region()).toHaveFocus())
    expect(region()).toHaveAttribute('tabindex', '-1')
    expect(removeAsset).toHaveBeenCalledWith(kbDown(1))
    expect(removeAsset).not.toHaveBeenCalledWith('kb_up')
    expect(restoreDefaultAsset).toHaveBeenCalledTimes(1)
  })
})

// ─── 기본값 = 복원(내장 기본이 있는 칸, I-3R) (R-32) ───────────────────────────
describe('ImagesTab — 기본값 = 내장 기본 그림으로 복원 (R-32·R-30, I-3R)', () => {
  it('TC-179: 복원 확인창(2단추·danger·포커스 취소) → 「기본 그림으로」 → restoreDefaultAsset(slot) 1회·removeAsset 0회·진행 중 전부 비활성·카드 오류 지움·누른 버튼으로 포커스, 미리보기는 assets://changed 로만', async () => {
    const rs = deferred<AssetManifest>()
    vi.mocked(importAsset).mockRejectedValueOnce(TOO_LARGE)
    vi.mocked(restoreDefaultAsset).mockReturnValue(rs.promise)
    const { update } = renderImages(BASIC)
    fireEvent.click(changeBtn('kb_up', '기본'))
    await within(card('kb_up')).findByRole('alert')
    await waitFor(() => expect(restoreBtn('kb_up', '기본')).toBeEnabled())
    const trigger = openRestore('kb_up', '기본')
    const dlg = dialog()
    expect(dlg).toHaveAttribute('aria-modal', 'true')
    expect(dlg).toHaveAccessibleName('기본 그림으로 되돌리기')
    expect(dlg).toHaveAccessibleDescription(
      '‘기본’ 칸을 내장 기본 그림으로 되돌릴까요? 지금 그림은 지워지며 되돌릴 수 없습니다.',
    )
    expect(within(dlg).getAllByRole('button').map(b => b.textContent)).toEqual(['기본 그림으로', '취소'])
    expect(within(dlg).getByRole('button', { name: '기본 그림으로' }).className).toMatch(/danger/)
    expect(within(dlg).getByRole('button', { name: '취소' })).toHaveFocus()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    confirmRestore()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(restoreDefaultAsset).toHaveBeenCalledTimes(1))
    expect(restoreDefaultAsset).toHaveBeenCalledWith('kb_up')
    for (const b of cardButtons()) expect(b).toBeDisabled()
    const next: AssetManifest = {
      ...BASIC,
      entries: BASIC.entries.map(e => (e.slot === 'kb_up' ? entry('kb_up', 900, 700, '?v=2') : e)),
    }
    await act(async () => rs.resolve(next))
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(within(card('kb_up')).queryByRole('alert')).toBeNull()
    expect(card('kb_up').querySelector('img')).toHaveAttribute('src', 'asset://kb_up.png') // props 전에는 그대로
    update(next)
    expect(card('kb_up').querySelector('img')).toHaveAttribute('src', 'asset://kb_up.png?v=2')
    expect(removeAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-179 (CR-038·CR-053 개정 — 대상 칸만): 빈 복원 칸(background, 옛 idle)·빈 뒷머리(hair — CR-053 내장 기본, 옛 「가운데 장 kb_down_0」 대체)도 복원 — 각각 restoreDefaultAsset 1회, removeAsset 0회', async () => {
    vi.mocked(restoreDefaultAsset).mockResolvedValue(BASIC)
    renderImages(BASIC)
    openRestore('background', '배경')
    expect(dialog()).toHaveAccessibleDescription(
      '‘배경’ 칸을 내장 기본 그림으로 되돌릴까요? 지금 그림은 지워지며 되돌릴 수 없습니다.',
    )
    confirmRestore()
    await waitFor(() => expect(restoreDefaultAsset).toHaveBeenCalledWith('background'))
    await waitFor(() => expect(restoreBtn('hair', '뒷머리')).toBeEnabled())
    const trigger = openRestore('hair', '뒷머리')
    expect(dialog()).toHaveAccessibleDescription(
      '‘뒷머리’ 칸을 내장 기본 그림으로 되돌릴까요? 지금 그림은 지워지며 되돌릴 수 없습니다.',
    )
    confirmRestore()
    await waitFor(() => expect(restoreDefaultAsset).toHaveBeenCalledTimes(2))
    expect(restoreDefaultAsset).toHaveBeenLastCalledWith('hair')
    await waitFor(() => expect(trigger).toHaveFocus())
    // CR-053: kb_down_0 에는 복원 버튼이 없다(내장 기본 없음) — 복원 경로 대상 아님
    expect(within(card('kb_down_0')).queryByRole('button', { name: '타자 입력 1 기본 그림으로 되돌리기' })).toBeNull()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-180 (CR-038 개정 — 대상 칸만): 복원 실패 → 그 카드 오류 띠(ko = message, message 가 비면 ko 사전 code 문구), 사용자 그림 그대로, 버튼 다시 활성·누른 버튼으로 포커스, 창 오류 줄 없음', async () => {
    vi.mocked(restoreDefaultAsset)
      .mockRejectedValueOnce(MISMATCH)
      .mockRejectedValueOnce({ code: 'asset.no_default', message: '' })
    renderImages(BASIC)
    const trigger = openRestore('kb_up', '기본')
    confirmRestore()
    await waitFor(() => expect(within(card('kb_up')).getByRole('alert').textContent).toBe(MISMATCH.message))
    await waitFor(() => expect(trigger).toBeEnabled())
    expect(trigger).toHaveFocus()
    expect(card('kb_up').querySelector('img')).toHaveAttribute('src', 'asset://kb_up.png')
    openRestore('background', '배경') // CR-038: 빈 복원 칸 예(옛 idle — 이제 비우기 칸이라 복원 단추가 없다)
    confirmRestore()
    await waitFor(() =>
      expect(within(card('background')).getByRole('alert').textContent).toBe('이 칸에는 내장 기본 그림이 없습니다.'),
    )
    expect(within(card('kb_up')).queryByRole('alert')).toBeNull() // 마지막 실패 1건만
    expect(restoreDefaultAsset).toHaveBeenCalledTimes(2)
    expect(removeAsset).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-181: 빈 pen_up 복원(첫 등록) → R-30 펜 손 확인창(포커스 「아니요」, 누른 버튼으로 돌아가지 않음) → 「예」 → setSettings 1회(penMode true·penPos = resolvePenPos(새 pen_up))', async () => {
    const RESTORED: AssetManifest = { ...BASIC, entries: [...BASIC.entries, DEF_PEN_UP] }
    vi.mocked(restoreDefaultAsset).mockResolvedValue(RESTORED)
    const { update } = renderImages(BASIC)
    const trigger = openRestore('pen_up', '손 기본')
    confirmRestore()
    await waitFor(() => expect(restoreDefaultAsset).toHaveBeenCalledWith('pen_up'))
    const pen = await screen.findByRole('alertdialog', { name: ko.penFirstTitle })
    await waitFor(() => expect(within(pen).getByRole('button', { name: ko.penFirstNo })).toHaveFocus())
    expect(trigger).not.toHaveFocus()
    expect(setSettings).not.toHaveBeenCalled() // 저장은 대답 뒤 1회
    update(RESTORED) // assets://changed
    fireEvent.click(within(screen.getByRole('alertdialog', { name: ko.penFirstTitle })).getByRole('button', { name: ko.penFirstYes }))
    await waitFor(() => expect(setSettings).toHaveBeenCalledTimes(1))
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({
      ...SETTINGS,
      mouse: { ...MOUSE, penMode: true, penPos: DEF_PEN_POS },
    })
    expect(removeAsset).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
  })

  it('TC-181: 이미 있는 pen_up 복원은 첫 등록이 아니다 — 확인창 없음, penPos 가 null 이면 ensurePenPos 로 1회 저장(penMode 그대로), 있으면 저장 없음', async () => {
    const RESTORED: AssetManifest = { ...BASIC, entries: [...BASIC.entries, DEF_PEN_UP] }
    vi.mocked(restoreDefaultAsset).mockResolvedValue(RESTORED)
    const r1 = renderImages(WITH_PEN)
    openRestore('pen_up', '손 기본')
    confirmRestore()
    await waitFor(() => expect(setSettings).toHaveBeenCalledTimes(1))
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({
      ...SETTINGS,
      mouse: { ...MOUSE, penPos: DEF_PEN_POS },
    })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(restoreBtn('pen_up', '손 기본')).toBeEnabled())
    r1.unmount()
    const placed: Settings = { ...SETTINGS, mouse: { ...MOUSE, penPos: { x: 10, y: 20 } } }
    renderImages(WITH_PEN, placed)
    openRestore('pen_up', '손 기본')
    confirmRestore()
    await waitFor(() => expect(restoreDefaultAsset).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(restoreBtn('pen_up', '손 기본')).toBeEnabled())
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(removeAsset).not.toHaveBeenCalled()
  })
})

// ─── 기본 이미지 다운로드 (R-33, I-8 ~ I-10) ─────────────────────────────────
describe('ImagesTab — 기본 이미지 다운로드 (R-33, DefaultsDownloadPanel)', () => {
  it('TC-182 (CR-038·CR-044·CR-053 개정): 패널 위치(p.note 바로 뒤·첫 그룹 앞)·단추(type=button·outline·활성·aria-busy 아님)·설명 7장(aria-describedby)·결과 줄 없음·탭의 첫 버튼, 호출 없음', () => {
    renderImages(EMPTY)
    const btn = downloadBtn()
    expect(btn).toHaveTextContent('기본 이미지 다운로드')
    expect(btn).toHaveAttribute('type', 'button')
    expect(btn).toBeEnabled()
    expect(btn.getAttribute('aria-busy')).not.toBe('true')
    expect(btn).toHaveAttribute('aria-describedby', 'download-defaults-desc')
    expect(document.getElementById('download-defaults-desc')?.tagName).toBe('P')
    expect(DEFAULT_ASSET_SLOTS).toHaveLength(7) // CR-053(CR-044 6 · CR-038 7 · 옛 15)
    expect(DEFAULT_ASSET_SLOTS.map(slotKey)).toEqual(DEFAULT_KEYS7)
    expect(btn).toHaveAccessibleDescription(DESC7_KO) // {n} = DEFAULT_ASSET_SLOTS.length(문구 사전 불변)
    expect(btn.className).toBe(clearBtn('mouse_left', '왼클릭').className) // .outline 재사용
    const note = within(region()).getByText(/^PNG\(32비트 RGBA\)만/)
    const firstH2 = within(region()).getAllByRole('heading', { level: 2 })[0]
    expect(follows(note, btn)).toBe(true)
    expect(follows(btn, firstH2)).toBe(true)
    expect(within(region()).getAllByRole('button')[0]).toBe(btn)
    expect(resultLine()).toBeNull()
    expect(pickFolder).not.toHaveBeenCalled()
    expect(exportDefaultAssets).not.toHaveBeenCalled()
  })

  it('TC-183: 폴더 선택 취소 → pickFolder(t.pickFolderTitle) 1회·exportDefaultAssets 0회·결과 줄 없음, 이전 결과 줄은 다음 다운로드 시작 때 지운다', async () => {
    vi.mocked(pickFolder).mockResolvedValueOnce(null).mockResolvedValueOnce(DIR).mockResolvedValueOnce(null)
    vi.mocked(exportDefaultAssets).mockResolvedValue(DONE6)
    renderImages(BASIC)
    fireEvent.click(downloadBtn())
    expect(pickFolder).toHaveBeenCalledTimes(1)
    expect(pickFolder).toHaveBeenCalledWith('기본 이미지를 저장할 폴더 선택')
    await act(async () => {})
    expect(exportDefaultAssets).not.toHaveBeenCalled()
    expect(resultLine()).toBeNull()
    expect(downloadBtn()).toBeEnabled()
    fireEvent.click(downloadBtn())
    await waitFor(() => expect(resultLine()?.textContent).toBe('기본 이미지 6장을 저장했습니다.'))
    fireEvent.click(downloadBtn())
    await waitFor(() => expect(pickFolder).toHaveBeenCalledTimes(3))
    await act(async () => {})
    expect(resultLine()).toBeNull()
    expect(exportDefaultAssets).toHaveBeenCalledTimes(1)
    expect(importAsset).not.toHaveBeenCalled()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
  })

  it('TC-184: 충돌 없음 → exportDefaultAssets(dir, false) 1회, 진행 중 단추 disabled·aria-busy, 카드 등록과 서로 독립, 결과 줄 exportDone(role=status·data-tone=ok), 끝나면 단추 포커스', async () => {
    const exp = deferred<ExportReport>()
    const imp = deferred<AssetManifest>()
    vi.mocked(exportDefaultAssets).mockReturnValue(exp.promise)
    vi.mocked(importAsset).mockReturnValue(imp.promise)
    renderImages(BASIC)
    fireEvent.click(changeBtn('idle', '대기'))
    await waitFor(() => expect(importAsset).toHaveBeenCalledTimes(1))
    for (const b of cardButtons()) expect(b).toBeDisabled()
    expect(downloadBtn()).toBeEnabled() // slotBusy 와 무관(§10.4)
    fireEvent.click(downloadBtn())
    await waitFor(() => expect(exportDefaultAssets).toHaveBeenCalledTimes(1))
    expect(exportDefaultAssets).toHaveBeenCalledWith(DIR, false)
    expect(downloadBtn()).toBeDisabled()
    expect(downloadBtn()).toHaveAttribute('aria-busy', 'true')
    await act(async () => imp.resolve(BASIC))
    await waitFor(() => expect(changeBtn('idle', '대기')).toBeEnabled()) // 다운로드 중에도 카드 버튼은 그대로
    expect(downloadBtn()).toBeDisabled()
    expect(resultLine()).toBeNull()
    await act(async () => exp.resolve(DONE6))
    await waitFor(() => expect(resultLine()?.textContent).toBe('기본 이미지 6장을 저장했습니다.'))
    expect(resultLine()?.tagName).toBe('P')
    expect(resultLine()).toHaveAttribute('role', 'status')
    expect(resultLine()).toHaveAttribute('data-tone', 'ok')
    await waitFor(() => expect(downloadBtn()).toHaveFocus())
    expect(downloadBtn().getAttribute('aria-busy')).not.toBe('true')
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(exportDefaultAssets).toHaveBeenCalledTimes(1)
    expect(pickFolder).toHaveBeenCalledTimes(1)
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-185: 충돌(written 0·conflicts ≥1) → 덮어쓰기 확인창(개수·danger·포커스 취소, 결과 줄 없음) → 「덮어쓰기」 → exportDefaultAssets(dir, true) 1회 → 결과 줄 → 단추 포커스', async () => {
    const exp2 = deferred<ExportReport>()
    vi.mocked(exportDefaultAssets)
      .mockResolvedValueOnce({ written: [], conflicts: ['kb_up.png', 'background.png'], failed: [] }) // CR-044: hair.png 는 기본 세트 밖(CR-038 idle.png 도 밖)
      .mockReturnValueOnce(exp2.promise)
    renderImages(BASIC)
    fireEvent.click(downloadBtn())
    const dlg = await screen.findByRole('alertdialog')
    expect(dlg).toHaveAttribute('aria-modal', 'true')
    expect(dlg).toHaveAccessibleName('같은 이름의 파일이 있습니다')
    expect(dlg).toHaveAccessibleDescription(
      '이 폴더에 같은 이름의 파일이 2개 있습니다. 모두 덮어쓸까요? 덮어쓴 파일은 되돌릴 수 없습니다.',
    )
    expect(within(dlg).getAllByRole('button').map(b => b.textContent)).toEqual(['덮어쓰기', '취소'])
    expect(within(dlg).getByRole('button', { name: '덮어쓰기' }).className).toMatch(/danger/)
    expect(within(dlg).getByRole('button', { name: '취소' })).toHaveFocus()
    expect(resultLine()).toBeNull()
    expect(exportDefaultAssets).toHaveBeenCalledTimes(1)
    expect(exportDefaultAssets).toHaveBeenCalledWith(DIR, false)
    fireEvent.click(within(dlg).getByRole('button', { name: '덮어쓰기' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(exportDefaultAssets).toHaveBeenCalledTimes(2))
    expect(exportDefaultAssets).toHaveBeenNthCalledWith(2, DIR, true)
    expect(downloadBtn()).toBeDisabled()
    await act(async () => exp2.resolve(DONE6))
    await waitFor(() => expect(resultLine()?.textContent).toBe('기본 이미지 6장을 저장했습니다.'))
    await waitFor(() => expect(downloadBtn()).toHaveFocus())
    expect(pickFolder).toHaveBeenCalledTimes(1)
  })

  it('TC-186: 덮어쓰기 확인창 「취소」·Esc → 2차 호출 0회(모두 overwrite false)·결과 줄 없음·단추 포커스, 배경막 클릭으로는 닫히지 않는다', async () => {
    vi.mocked(exportDefaultAssets).mockResolvedValue({ written: [], conflicts: ['kb_up.png'], failed: [] })
    renderImages(BASIC)
    fireEvent.click(downloadBtn())
    let dlg = await screen.findByRole('alertdialog')
    expect(dlg).toHaveAccessibleDescription(
      '이 폴더에 같은 이름의 파일이 1개 있습니다. 모두 덮어쓸까요? 덮어쓴 파일은 되돌릴 수 없습니다.',
    )
    fireEvent.click(within(dlg).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(downloadBtn()).toHaveFocus())
    expect(resultLine()).toBeNull()
    fireEvent.click(downloadBtn())
    dlg = await screen.findByRole('alertdialog')
    fireEvent.keyDown(dlg, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(downloadBtn()).toHaveFocus())
    fireEvent.click(downloadBtn())
    dlg = await screen.findByRole('alertdialog')
    fireEvent.click(dlg.parentElement as HTMLElement)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(exportDefaultAssets).toHaveBeenCalledTimes(3)
    expect(vi.mocked(exportDefaultAssets).mock.calls.every(c => c[0] === DIR && c[1] === false)).toBe(true)
    expect(resultLine()).toBeNull()
  })

  it('TC-187: 부분 실패(failed ≥1) → 결과 줄 exportPartial(ok·fail·실패 파일명 「, 」 연결), role=alert·data-tone=error — 첫 호출·덮어쓰기 호출 모두', async () => {
    vi.mocked(exportDefaultAssets)
      .mockResolvedValueOnce({
        written: DEFAULT_FILES.slice(2), // CR-044: 6장 중 앞 2장(kb_up·kb_down_0)이 실패 → 4장 저장(CR-038 7장 · 5장)
        conflicts: [],
        failed: [
          { fileName: 'kb_up.png', code: 'asset.io' },
          { fileName: 'kb_down_0.png', code: 'asset.io' },
        ],
      })
      .mockResolvedValueOnce({ written: [], conflicts: ['kb_up.png'], failed: [] })
      .mockResolvedValueOnce({
        written: DEFAULT_FILES.filter(f => f !== 'kb_up.png'),
        conflicts: [],
        failed: [{ fileName: 'kb_up.png', code: 'asset.io' }],
      })
    renderImages(BASIC)
    fireEvent.click(downloadBtn())
    await waitFor(() => expect(resultLine()?.textContent).toBe('4장 저장, 2장 실패: kb_up.png, kb_down_0.png'))
    expect(resultLine()).toHaveAttribute('role', 'alert')
    expect(resultLine()).toHaveAttribute('data-tone', 'error')
    await waitFor(() => expect(downloadBtn()).toBeEnabled())
    fireEvent.click(downloadBtn())
    const dlg = await screen.findByRole('alertdialog')
    fireEvent.click(within(dlg).getByRole('button', { name: '덮어쓰기' }))
    await waitFor(() => expect(resultLine()?.textContent).toBe('5장 저장, 1장 실패: kb_up.png')) // CR-044: 6 − 1(CR-038 6장)
    expect(resultLine()).toHaveAttribute('role', 'alert')
    expect(exportDefaultAssets).toHaveBeenNthCalledWith(3, DIR, true)
    expect(within(region()).queryAllByRole('alert').filter(a => a !== resultLine())).toHaveLength(0) // 카드 오류 아님
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-188: 오류 — exportDefaultAssets reject(asset.export_dir) → 결과 줄 errorText(ko = message)·role=alert·오류색·단추 다시 활성·포커스, pickFolder reject → 결과 줄(export 호출 없음), 창 오류 줄 없음', async () => {
    vi.mocked(exportDefaultAssets).mockRejectedValueOnce(EXPORT_DIR)
    renderImages(BASIC)
    fireEvent.click(downloadBtn())
    await waitFor(() => expect(resultLine()?.textContent).toBe(EXPORT_DIR.message))
    expect(resultLine()).toHaveAttribute('role', 'alert')
    expect(resultLine()).toHaveAttribute('data-tone', 'error')
    await waitFor(() => expect(downloadBtn()).toBeEnabled())
    await waitFor(() => expect(downloadBtn()).toHaveFocus())
    vi.mocked(pickFolder).mockRejectedValueOnce(new Error('dialog failed'))
    fireEvent.click(downloadBtn())
    await waitFor(() => expect(resultLine()?.textContent).toBe('dialog failed'))
    expect(resultLine()).toHaveAttribute('role', 'alert')
    expect(exportDefaultAssets).toHaveBeenCalledTimes(1)
    expect(within(card('kb_up')).queryByRole('alert')).toBeNull()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-191: 포커스 복귀 — 충돌 확인창이 열리면 확인창 「취소」, 닫히면 다운로드 단추, 덮어쓰기 진행 중 단추 비활성·끝나면 단추 / 복원 취소·확정·실패 뒤에는 누른 「기본값」', async () => {
    const exp = deferred<ExportReport>()
    const CONFLICT1: ExportReport = { written: [], conflicts: ['kb_up.png'], failed: [] }
    vi.mocked(exportDefaultAssets)
      .mockResolvedValueOnce(CONFLICT1)
      .mockResolvedValueOnce(CONFLICT1)
      .mockReturnValueOnce(exp.promise)
    vi.mocked(restoreDefaultAsset).mockResolvedValueOnce(BASIC).mockRejectedValueOnce(MISMATCH)
    renderImages(BASIC)
    fireEvent.click(downloadBtn())
    const d1 = await screen.findByRole('alertdialog')
    await waitFor(() => expect(within(d1).getByRole('button', { name: '취소' })).toHaveFocus())
    expect(downloadBtn()).not.toHaveFocus()
    fireEvent.keyDown(d1, { key: 'Escape' })
    await waitFor(() => expect(downloadBtn()).toHaveFocus())
    fireEvent.click(downloadBtn())
    const d2 = await screen.findByRole('alertdialog')
    fireEvent.click(within(d2).getByRole('button', { name: '덮어쓰기' }))
    await waitFor(() => expect(exportDefaultAssets).toHaveBeenCalledTimes(3))
    expect(downloadBtn()).toBeDisabled()
    await act(async () => exp.resolve(DONE6))
    await waitFor(() => expect(downloadBtn()).toHaveFocus())
    let trigger = openRestore('mouse_base', '팔 기본')
    fireEvent.click(within(dialog()).getByRole('button', { name: '취소' }))
    expect(trigger).toHaveFocus()
    trigger = openRestore('mouse_base', '팔 기본')
    confirmRestore()
    await waitFor(() => expect(restoreDefaultAsset).toHaveBeenCalledWith('mouse_base'))
    await waitFor(() => expect(trigger).toHaveFocus())
    trigger = openRestore('kb_up', '기본')
    confirmRestore()
    await within(card('kb_up')).findByRole('alert')
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})

// ─── pen_up 교체 시 penPos 보충 (옛 I-4 — CR-033: 첫 등록은 I-6 확인창, test/PenMode.test.tsx TC-168 ~ TC-172) ──
describe('ImagesTab — pen_up 교체 시 penPos 보충 (R-25, ensurePenPos — 첫 등록 아닌 경우만)', () => {
  it('TC-148: pen_up 이 이미 있고 penPos 가 null 이면 교체 import 뒤 resolvePenPos 기본 위치를 setSettings 1회로 저장(penMode 그대로, 끝날 때까지 비활성), 확인창 없음', async () => {
    const save = deferred<Settings>()
    vi.mocked(importAsset).mockResolvedValue(WITH_PEN)
    vi.mocked(setSettings).mockReturnValueOnce(save.promise)
    renderImages(WITH_PEN) // 호출 전 매니페스트에 pen_up 있음 → isFirstPenUp false → ensurePenPos 경로
    fireEvent.click(changeBtn('pen_up', '손 기본'))
    await waitFor(() => expect(setSettings).toHaveBeenCalledTimes(1))
    expect(importAsset).toHaveBeenCalledWith('pen_up', PATH)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({
      ...SETTINGS,
      mouse: { ...MOUSE, penPos: { x: 350, y: 520 } }, // 손 그림 100×80 중심 = hand (400,560)
    })
    expect(vi.mocked(importAsset).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(setSettings).mock.invocationCallOrder[0],
    )
    expect(changeBtn('idle', '대기')).toBeDisabled()
    await act(async () => save.resolve(SETTINGS))
    await waitFor(() => expect(changeBtn('idle', '대기')).toBeEnabled())
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-148 (CR-035 개정): penPos 가 이미 있거나·pen_up 이 아니거나·결과에 pen_up 이 없으면 저장하지 않고, mouse null 이면 기본값 penPos (380,496)이 이미 있어 저장하지 않는다', async () => {
    vi.mocked(importAsset).mockResolvedValue(WITH_PEN)
    const placed: Settings = { ...SETTINGS, mouse: { ...MOUSE, penPos: { x: 10, y: 20 } } }
    const r1 = renderImages(WITH_PEN, placed) // CR-033: 교체(첫 등록 아님)
    fireEvent.click(changeBtn('pen_up', '손 기본'))
    await waitFor(() => expect(importAsset).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(changeBtn('pen_up', '손 기본')).toBeEnabled())
    fireEvent.click(changeBtn('pen_down_0', '펜 입력 1'))
    await waitFor(() => expect(importAsset).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(changeBtn('pen_up', '손 기본')).toBeEnabled())
    expect(setSettings).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    r1.unmount()
    vi.mocked(importAsset).mockResolvedValueOnce(BASIC) // 결과에 pen_up 없음 → isFirstPenUp false·ensurePenPos 도 저장 없음
    const r2 = renderImages(BASIC)
    fireEvent.click(changeBtn('pen_up', '손 기본'))
    await waitFor(() => expect(importAsset).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(changeBtn('pen_up', '손 기본')).toBeEnabled())
    expect(setSettings).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    r2.unmount()
    const noMouse: Settings = { ...SETTINGS, mouse: null }
    renderImages(WITH_PEN, noMouse) // CR-033: 교체. CR-035: DEFAULT_MOUSE_SETTINGS.penPos = (380,496) ≠ null → 끝
    fireEvent.click(changeBtn('pen_up', '손 기본'))
    await waitFor(() => expect(importAsset).toHaveBeenCalledTimes(4))
    await waitFor(() => expect(changeBtn('pen_up', '손 기본')).toBeEnabled())
    expect(setSettings).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('TC-149: (교체) penPos 저장 실패 → 창 오류 줄(onError), 카드 오류 없음, 그림 등록은 되돌리지 않음', async () => {
    const fail: BridgeError = { code: 'settings.io', message: '설정 파일을 읽거나 쓸 수 없습니다: 거부' }
    vi.mocked(importAsset).mockResolvedValue(WITH_PEN)
    vi.mocked(setSettings).mockRejectedValue(fail)
    renderImages(WITH_PEN) // CR-033: 교체 경로(첫 등록 실패는 PenMode.test.tsx TC-171)
    fireEvent.click(changeBtn('pen_up', '손 기본'))
    await waitFor(() => expect(onError).toHaveBeenCalledWith(fail))
    await waitFor(() => expect(changeBtn('pen_up', '손 기본')).toBeEnabled())
    expect(screen.queryByRole('alert')).toBeNull()
    expect(importAsset).toHaveBeenCalledTimes(1)
    expect(removeAsset).not.toHaveBeenCalled()
  })
})

// ─── 3개 국어·접근성 ────────────────────────────────────────────────────────
describe('ImagesTab — 3개 국어 (R-20)·접근성 (§8)·ConfirmDialog (§6)', () => {
  it('TC-150 (CR-035 개정 — kb_up aria-label): ja — 안내·그룹·카드 제목·배지·버튼·파일 대화상자 제목·카드 오류(code 문구)·확인 대화상자가 ja 사전 문구', async () => {
    vi.mocked(importAsset).mockRejectedValue(TOO_LARGE)
    renderImages(BASIC, { ...SETTINGS, language: 'ja' }, 'ja')
    const tab = screen.getByRole('region', { name: ja.tabImages })
    expect(within(tab).getByText(format(ja.imagesNote, { w: 900, h: 700 }))).toBeInTheDocument()
    expect(within(tab).getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual([
      ja.groupBackground,
      ja.groupKeyboard,
      ja.groupArm,
      ja.groupHand,
    ])
    const upName = ja.slots.kb_up.title
    expect(within(card('kb_up')).getByRole('heading', { level: 3 }).textContent).toBe(upName)
    expect(within(card('kb_up')).getByText(ja.badgeRequired)).toBeInTheDocument()
    expect(within(card('idle')).getByText(ja.badgeOptional)).toBeInTheDocument()
    expect(within(card('idle')).getByText(ja.emptyOptional)).toBeInTheDocument()
    const change = within(card('kb_up')).getByRole('button', { name: format(ja.changeImageAria, { name: upName }) })
    expect(change).toHaveTextContent(ja.changeImage)
    expect(
      within(card('kb_up')).getByRole('button', { name: format(ja.restoreImageAria, { name: upName }) }),
    ).toHaveTextContent(ja.clearImage)
    fireEvent.click(change)
    expect(pickPngFile).toHaveBeenCalledWith(ja.pickTitle)
    await waitFor(() =>
      expect(within(card('kb_up')).getByRole('alert').textContent).toBe(ja.errors['asset.too_large']),
    )
    const down2 = format(ja.slots.kb_down.title, { n: 2 })
    fireEvent.click(within(card('kb_down_1')).getByRole('button', { name: format(ja.clearImageAria, { name: down2 }) }))
    expect(dialog()).toHaveAccessibleName(ja.confirmClearTitle)
    expect(dialog()).toHaveAccessibleDescription(format(ja.confirmClearMessage, { name: down2 }))
    expect(within(dialog()).getByRole('button', { name: ja.confirmCancel })).toHaveFocus()
    expect(within(dialog()).getByRole('button', { name: ja.confirmClearOk })).toBeInTheDocument()
  })

  it('TC-151 (CR-035 개정): 카드 = article(이름 = 제목 h3), 자식 4개 순서, 카드 안 순서 「이미지 변경」 → 「기본값」, 모든 버튼 type=button, section tabIndex=-1, 탭 첫 포커스 = 다운로드 단추(aria-describedby)', () => {
    renderImages(BASIC)
    expect(region()).toHaveAttribute('tabindex', '-1')
    const art = card('kb_up')
    expect(art.tagName).toBe('ARTICLE')
    const h3 = within(art).getByRole('heading', { level: 3 })
    expect(art.getAttribute('aria-labelledby')).toBe(h3.id)
    const kids = Array.from(art.children) as HTMLElement[]
    expect(kids).toHaveLength(4)
    expect(kids[0].contains(h3)).toBe(true)
    expect(kids[1].tagName).toBe('P')
    expect(kids[1].textContent).toBe('가만히 있을 때. 캐릭터 전체를 그려도 됩니다')
    expect(kids[2].querySelector('img')).toHaveAttribute('src', 'asset://kb_up.png')
    expect(within(kids[3]).getAllByRole('button').map(b => b.textContent)).toEqual(['이미지 변경', '기본값'])
    expect(screen.queryByRole('alert')).toBeNull()
    expect(within(art).getAllByRole('button').map(b => b.textContent)).toEqual(['이미지 변경', '기본값'])
    const all = within(region()).getAllByRole('button')
    expect(all[0]).toBe(downloadBtn())
    expect(all[0]).toHaveAttribute('aria-describedby', 'download-defaults-desc')
    for (const b of all) {
      expect(b).toHaveAttribute('type', 'button')
      expect(b).not.toHaveAttribute('tabindex')
    }
    for (const img of region().querySelectorAll('img')) expect(img).toHaveAttribute('alt', '')
  })

  it('TC-157: 카드 제목 h3·설명 p 에 전체 문구 title 속성(말줄임 대비) — ko·ja·en 모두, 추가 카드는 대상 아님', () => {
    const cases = [
      { lang: undefined, dict: ko },
      { lang: 'ja', dict: ja },
      { lang: 'en', dict: en },
    ]
    for (const { lang, dict } of cases) {
      const { unmount } = renderImages(BASIC, SETTINGS, lang)
      const arts = screen.getAllByRole('article')
      expect(arts.length, lang).toBeGreaterThan(0)
      for (const art of arts) {
        const h3 = within(art).getByRole('heading', { level: 3 })
        expect(h3.textContent, lang).not.toBe('')
        expect(h3).toHaveAttribute('title', h3.textContent)
        const desc = art.children[1] as HTMLElement
        expect(desc.tagName, lang).toBe('P')
        expect(desc.textContent, lang).not.toBe('')
        expect(desc).toHaveAttribute('title', desc.textContent)
      }
      const up = card('kb_up')
      expect(within(up).getByRole('heading', { level: 3 })).toHaveAttribute('title', dict.slots.kb_up.title)
      expect(up.children[1]).toHaveAttribute('title', dict.slots.kb_up.desc)
      unmount()
    }
    expect(pickPngFile).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-158: 카드 오류 = 미리보기 상자 안 마지막 자식 띠(role=alert, title = 전체 문구), 버튼 줄 아래 p 없음·카드 자식 수 불변, 추가 카드 오류도 title', async () => {
    vi.mocked(importAsset).mockRejectedValueOnce(TOO_LARGE).mockRejectedValueOnce(TOO_LARGE)
    renderImages(BASIC)
    const up = card('kb_up')
    const before = up.children.length
    fireEvent.click(changeBtn('kb_up', '기본'))
    const alert = await within(up).findByRole('alert')
    expect(alert.tagName).toBe('P')
    expect(alert.textContent).toBe(TOO_LARGE.message)
    expect(alert).toHaveAttribute('title', TOO_LARGE.message)
    const img = up.querySelector('img') as HTMLImageElement
    expect(alert.parentElement).toBe(img.parentElement)
    expect(alert.parentElement?.lastElementChild).toBe(alert)
    expect(up.children).toHaveLength(before)
    expect(up.lastElementChild?.contains(changeBtn('kb_up', '기본'))).toBe(true)
    await waitFor(() => expect(changeBtn('kb_up', '기본')).toBeEnabled())
    fireEvent.click(within(addCard('kb_down_2')).getByRole('button', { name: '+ 타자 입력 그림 추가' }))
    const addAlert = await within(addCard('kb_down_2')).findByRole('alert')
    expect(addAlert.textContent).toBe(TOO_LARGE.message)
    expect(addAlert).toHaveAttribute('title', TOO_LARGE.message)
    await waitFor(() => expect(changeBtn('idle', '대기')).toBeEnabled())
    vi.mocked(pickPngFile).mockRejectedValueOnce(new Error('dialog failed'))
    fireEvent.click(changeBtn('idle', '대기'))
    const idleAlert = await within(card('idle')).findByRole('alert')
    expect(idleAlert.textContent).toBe('dialog failed')
    expect(idleAlert.parentElement).toBe(within(card('idle')).getByText('등록된 그림 없음').parentElement)
    expect(importAsset).toHaveBeenCalledTimes(2)
    expect(importAsset).toHaveBeenNthCalledWith(1, 'kb_up', PATH)
    expect(importAsset).toHaveBeenNthCalledWith(2, kbDown(2), PATH)
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-152: ConfirmDialog 단독 — open=false 면 아무것도 없음, open 이면 alertdialog·포커스 「취소」·버튼·Esc 콜백, 배경막 클릭 무반응', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const el = (open: boolean) => (
      <ConfirmDialog open={open} title="제목" message="본문" confirmLabel="확인" cancelLabel="닫기" onConfirm={onConfirm} onCancel={onCancel} />
    )
    const { container, rerender } = render(el(false))
    expect(container.innerHTML).toBe('')
    rerender(el(true))
    const dlg = screen.getByRole('alertdialog', { name: '제목' })
    expect(dlg).toHaveAttribute('aria-modal', 'true')
    expect(dlg).toHaveAccessibleDescription('본문')
    expect(within(dlg).getByRole('button', { name: '닫기' })).toHaveFocus()
    fireEvent.click(within(dlg).getByRole('button', { name: '확인' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.click(within(dlg).getByRole('button', { name: '닫기' }))
    fireEvent.keyDown(dlg, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(2)
    fireEvent.click(dlg.parentElement as HTMLElement)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(2)
    for (const b of within(dlg).getAllByRole('button')) expect(b).toHaveAttribute('type', 'button')
  })

  it('TC-189 (CR-053 개정 — 개수): CR-035 문구 ja·en — 다운로드 단추·설명(7장)·폴더 대화상자 제목·복원 aria-label·복원 확인창·덮어쓰기 확인창·결과 줄(부분 실패·완료)·오류 code 문구(asset.no_default·asset.export_dir)', async () => {
    for (const [lang, dict] of [
      ['ja', ja],
      ['en', en],
    ] as const) {
      vi.mocked(restoreDefaultAsset).mockRejectedValueOnce({ code: 'asset.no_default', message: 'no default: kb_up' })
      vi.mocked(exportDefaultAssets)
        .mockResolvedValueOnce({ written: [], conflicts: ['kb_up.png'], failed: [] })
        .mockResolvedValueOnce({
          written: DEFAULT_FILES7.filter(f => f !== 'kb_up.png'),
          conflicts: [],
          failed: [{ fileName: 'kb_up.png', code: 'asset.io' }],
        })
        .mockResolvedValueOnce(DONE7)
        .mockRejectedValueOnce(EXPORT_DIR)
      const { unmount } = renderImages(BASIC, { ...SETTINGS, language: lang }, lang)
      const btn = screen.getByRole('button', { name: dict.downloadDefaults })
      expect(btn).toHaveAccessibleDescription(format(dict.downloadDefaultsDesc, { n: 7 })) // CR-053(CR-044 6 · CR-038 7 · 옛 15)
      const upName = dict.slots.kb_up.title
      const reset = within(card('kb_up')).getByRole('button', { name: format(dict.restoreImageAria, { name: upName }) })
      expect(reset).toHaveTextContent(dict.clearImage)
      fireEvent.click(reset)
      expect(dialog()).toHaveAccessibleName(dict.confirmRestoreTitle)
      expect(dialog()).toHaveAccessibleDescription(format(dict.confirmRestoreMessage, { name: upName }))
      expect(within(dialog()).getByRole('button', { name: dict.confirmCancel })).toHaveFocus()
      fireEvent.click(within(dialog()).getByRole('button', { name: dict.confirmRestoreOk }))
      await waitFor(() =>
        expect(within(card('kb_up')).getByRole('alert').textContent, lang).toBe(dict.errors['asset.no_default']),
      )
      fireEvent.click(btn)
      expect(pickFolder).toHaveBeenLastCalledWith(dict.pickFolderTitle)
      const c = await screen.findByRole('alertdialog')
      expect(c).toHaveAccessibleName(dict.exportConflictTitle)
      expect(c).toHaveAccessibleDescription(format(dict.exportConflictMessage, { n: 1 }))
      expect(within(c).getByRole('button', { name: dict.confirmCancel })).toHaveFocus()
      fireEvent.click(within(c).getByRole('button', { name: dict.exportConflictOk }))
      await waitFor(() =>
        expect(resultLine()?.textContent, lang).toBe(
          format(dict.exportPartial, { ok: 6, fail: 1, files: 'kb_up.png' }), // CR-053: 7 − 1(CR-044 ok 5)
        ),
      )
      await waitFor(() => expect(btn).toBeEnabled())
      fireEvent.click(btn)
      await waitFor(() => expect(resultLine()?.textContent, lang).toBe(format(dict.exportDone, { n: 7 }))) // CR-053
      await waitFor(() => expect(btn).toBeEnabled())
      fireEvent.click(btn)
      await waitFor(() => expect(resultLine()?.textContent, lang).toBe(dict.errors['asset.export_dir']))
      unmount()
    }
    expect(removeAsset).not.toHaveBeenCalled()
  })

  it('TC-190: CR-035 사전 — 단순 키 12개 ko 확정 문구·ja·en 비어 있지 않음·자리표시 유지, 새 오류 code 2개 ko 대체 문구', () => {
    const KO: Record<string, string> = {
      restoreImageAria: '{name} 기본 그림으로 되돌리기',
      confirmRestoreTitle: '기본 그림으로 되돌리기',
      confirmRestoreMessage: '‘{name}’ 칸을 내장 기본 그림으로 되돌릴까요? 지금 그림은 지워지며 되돌릴 수 없습니다.',
      confirmRestoreOk: '기본 그림으로',
      downloadDefaults: '기본 이미지 다운로드',
      downloadDefaultsDesc: '내장 기본 그림 {n}장을 원본 크기 그대로 폴더에 저장합니다. 따라 그리거나 고쳐 쓸 때 쓰세요.',
      pickFolderTitle: '기본 이미지를 저장할 폴더 선택',
      exportConflictTitle: '같은 이름의 파일이 있습니다',
      exportConflictMessage: '이 폴더에 같은 이름의 파일이 {n}개 있습니다. 모두 덮어쓸까요? 덮어쓴 파일은 되돌릴 수 없습니다.',
      exportConflictOk: '덮어쓰기',
      exportDone: '기본 이미지 {n}장을 저장했습니다.',
      exportPartial: '{ok}장 저장, {fail}장 실패: {files}',
    }
    const PLACEHOLDERS: Record<string, string[]> = {
      restoreImageAria: ['{name}'],
      confirmRestoreMessage: ['{name}'],
      downloadDefaultsDesc: ['{n}'],
      exportConflictMessage: ['{n}'],
      exportDone: ['{n}'],
      exportPartial: ['{ok}', '{fail}', '{files}'],
    }
    const asMap = (d: unknown) => d as Record<string, unknown>
    for (const [key, text] of Object.entries(KO)) {
      expect(asMap(ko)[key], key).toBe(text)
      for (const d of [ja, en]) {
        const v = asMap(d)[key]
        expect(typeof v, key).toBe('string')
        expect((v as string).trim(), key).not.toBe('')
        for (const p of PLACEHOLDERS[key] ?? []) expect(v as string, key).toContain(p)
      }
    }
    expect(ko.errors['asset.no_default']).toBe('이 칸에는 내장 기본 그림이 없습니다.')
    expect(ko.errors['asset.export_dir']).toBe('저장할 폴더를 찾을 수 없습니다.')
    for (const d of [ja, en]) {
      expect(d.errors['asset.no_default'].trim()).not.toBe('')
      expect(d.errors['asset.export_dir'].trim()).not.toBe('')
    }
  })
})

// ─── 사용자 흐름 (CR-035) ───────────────────────────────────────────────────
describe('ImagesTab — TC-FLOW (S-14 · S-15 · S-16, CR-035)', () => {
  it('TC-FLOW-15 (CR-038·CR-042·CR-044·CR-053 개정): S-14 — 첫 실행에 core 가 채운 기본 7장(hair·pomo_char 포함, kb_down_0 없음)이 카드에 그대로 보이고, 7칸 「기본값」은 복원(활성)·나머지 빈 칸 13개(kb_down_0·idle·rest·key_* 7·mouse_left·mouse_right·pomo_bubble)는 비우기(비활성), 뒷머리·뽀모도 인물 「비우기」 활성, 추가 카드 없음', () => {
    const { update } = renderImages(EMPTY) // TC-136 부분(아직 받기 전)
    expect(region().querySelectorAll('article img')).toHaveLength(0)
    const DEFAULT15: AssetManifest = { canvas: CANVAS, entries: DEFAULT_ASSET_SLOTS.map(s => entry(s)) }
    update(DEFAULT15) // get_asset_manifest / assets://changed 흉내(화면 변경 없음 — images-tab §10.1)
    const arts = Array.from(region().querySelectorAll<HTMLElement>('article'))
    expect(arts).toHaveLength(20) // CR-045: 슬롯 카드 20장(뽀모도 2 — CR-042 18, 옛 25)
    const withImg = arts.filter(a => a.querySelector('img')).map(a => a.dataset.testid)
    expect([...withImg].sort()).toEqual(DEFAULT_KEYS7.map(k => `slot-card-${k}`).sort())
    // CR-053: 13 = 20 − 기본 7(CR-044·CR-045 14)
    expect(arts.filter(a => a.querySelector('img') === null)).toHaveLength(13)
    // CR-053: 뒷머리·뽀모도 인물 = 버튼 3개, 「기본값」 복원 활성·「비우기」 활성(등록됨)
    for (const [key, name] of [
      ['hair', '뒷머리'],
      ['pomo_char', '뽀모도 인물'],
    ] as const) {
      expect(within(card(key)).getAllByRole('button').map(b => b.textContent), key).toEqual(['이미지 변경', '기본값', '비우기'])
      expect(within(card(key)).getByRole('button', { name: `${name} 그림 비우기` }), key).toBeEnabled()
    }
    // CR-053: 「타자 입력 1」 빈 칸 = 선택 칸·버튼 2개(「기본값」 = 비우기 비활성, 셋째 버튼 없음)
    expect(within(card('kb_down_0')).getAllByRole('button').map(b => b.textContent)).toEqual(['이미지 변경', '기본값'])
    expect(clearBtn('kb_down_0', '타자 입력 1')).toBeDisabled()
    expect(screen.queryByTestId('add-card-pen_down_1')).toBeNull() // CR-042: 손 그룹 추가 카드 없음(옛 기대 「있음」 대체)
    expect(within(region()).queryAllByText('필수 · 미등록')).toHaveLength(0)
    for (const a of arts) {
      const reset = within(a).getAllByRole('button')[1]
      const hasImg = a.querySelector('img') !== null
      expect(reset.textContent, a.dataset.testid).toBe('기본값')
      if (hasImg) {
        expect(reset, a.dataset.testid).toBeEnabled()
        expect(reset.getAttribute('aria-label'), a.dataset.testid).toMatch(/ 기본 그림으로 되돌리기$/)
      } else {
        expect(reset, a.dataset.testid).toBeDisabled()
        expect(reset.getAttribute('aria-label'), a.dataset.testid).toMatch(/ 그림 지우기$/)
      }
    }
    // CR-053: kb_down_0 이 없어 키보드 추가 카드도 없다(CR-042 ~ CR-044 기대 [add-card-kb_down_1] 대체)
    expect(screen.queryAllByTestId(/^add-card-/)).toHaveLength(0)
    expect(importAsset).not.toHaveBeenCalled()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-FLOW-16: S-15 — 자기 그림으로 바꿨다가 기본 그림으로 되돌리고, 기본 그림 없는 칸은 비우고, 빈 pen_up 을 복원하자 펜 손 확인창 → 「아니요」', async () => {
    const USER: AssetManifest = { ...BASIC, entries: [...BASIC.entries, entry('mouse_left', 200, 150)] }
    const withUp = (m: AssetManifest, v: string): AssetManifest => ({
      ...m,
      entries: m.entries.map(e => (e.slot === 'kb_up' ? entry('kb_up', 900, 700, v) : e)),
    })
    const MINE = withUp(USER, '?v=2')
    const BACK = withUp(USER, '?v=3')
    const NO_LEFT: AssetManifest = { ...BACK, entries: BACK.entries.filter(e => e.slot !== 'mouse_left') }
    const PEN_BACK: AssetManifest = { ...NO_LEFT, entries: [...NO_LEFT.entries, DEF_PEN_UP] }
    vi.mocked(importAsset).mockResolvedValue(MINE)
    vi.mocked(restoreDefaultAsset).mockResolvedValueOnce(BACK).mockResolvedValueOnce(PEN_BACK)
    vi.mocked(removeAsset).mockResolvedValue(NO_LEFT)
    const { update } = renderImages(USER)
    fireEvent.click(changeBtn('kb_up', '기본')) // TC-139 부분
    await waitFor(() => expect(importAsset).toHaveBeenCalledWith('kb_up', PATH))
    update(MINE)
    expect(card('kb_up').querySelector('img')).toHaveAttribute('src', 'asset://kb_up.png?v=2')
    await waitFor(() => expect(restoreBtn('kb_up', '기본')).toBeEnabled())
    const t1 = openRestore('kb_up', '기본') // TC-179 부분
    confirmRestore()
    await waitFor(() => expect(restoreDefaultAsset).toHaveBeenCalledWith('kb_up'))
    update(BACK)
    expect(card('kb_up').querySelector('img')).toHaveAttribute('src', 'asset://kb_up.png?v=3')
    await waitFor(() => expect(t1).toHaveFocus())
    openClear('mouse_left', '왼클릭') // TC-143 부분(비우기 칸)
    expect(dialog()).toHaveAccessibleName('그림 지우기')
    fireEvent.click(within(dialog()).getByRole('button', { name: '지우기' }))
    await waitFor(() => expect(removeAsset).toHaveBeenCalledWith('mouse_left'))
    update(NO_LEFT)
    expect(within(card('mouse_left')).getByText('등록된 그림 없음')).toBeInTheDocument()
    await waitFor(() => expect(clearBtn('mouse_left', '왼클릭')).toBeDisabled())
    openRestore('pen_up', '손 기본') // TC-181 부분
    confirmRestore()
    await screen.findByRole('alertdialog', { name: ko.penFirstTitle })
    update(PEN_BACK)
    fireEvent.click(within(screen.getByRole('alertdialog', { name: ko.penFirstTitle })).getByRole('button', { name: ko.penFirstNo }))
    await waitFor(() => expect(setSettings).toHaveBeenCalledTimes(1))
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({
      ...SETTINGS,
      mouse: { ...MOUSE, penMode: false, penPos: DEF_PEN_POS },
    })
    expect(removeAsset).toHaveBeenCalledTimes(1)
    expect(restoreDefaultAsset).toHaveBeenCalledTimes(2)
    expect(restoreDefaultAsset).toHaveBeenLastCalledWith('pen_up')
  })

  it('TC-FLOW-17 (CR-038·CR-044·CR-053 개정): S-16 — 기본 이미지를 폴더에 받는다(같은 이름 파일 7개 → 덮어쓰기 확인 → 저장 완료)', async () => {
    vi.mocked(exportDefaultAssets)
      .mockResolvedValueOnce({ written: [], conflicts: DEFAULT_FILES7, failed: [] })
      .mockResolvedValueOnce(DONE7)
    renderImages(BASIC)
    expect(downloadBtn()).toHaveAccessibleDescription(DESC7_KO) // TC-182 부분
    fireEvent.click(downloadBtn()) // TC-185 부분
    expect(pickFolder).toHaveBeenCalledWith('기본 이미지를 저장할 폴더 선택')
    const dlg = await screen.findByRole('alertdialog')
    expect(dlg).toHaveAccessibleDescription(
      '이 폴더에 같은 이름의 파일이 7개 있습니다. 모두 덮어쓸까요? 덮어쓴 파일은 되돌릴 수 없습니다.', // CR-053(CR-044 6개)
    )
    fireEvent.click(within(dlg).getByRole('button', { name: '덮어쓰기' }))
    await waitFor(() => expect(resultLine()?.textContent).toBe('기본 이미지 7장을 저장했습니다.'))
    expect(resultLine()).toHaveAttribute('role', 'status')
    expect(exportDefaultAssets).toHaveBeenNthCalledWith(1, DIR, false)
    expect(exportDefaultAssets).toHaveBeenNthCalledWith(2, DIR, true)
    expect(exportDefaultAssets).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(downloadBtn()).toHaveFocus())
    expect(importAsset).not.toHaveBeenCalled()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

// ─── CR-043 · R-40 타자 입력 1 선택 강등 · R-41 「타자 입력 1」 비우기 ─────────────────
// 기준: requirements v1.17 R-40·R-41·S-21·S-22 · images-tab §3.3·§12(§11.2 ~ §11.6 재사용) · i18n §4.4 CR-043
//       · contract v0.19 REQUIRED_SLOTS(kb_up·mouse_base) · scenarios.md 「CR-043 개정」 절 TC-230·TC-233 ~ TC-237·TC-FLOW-22·23.
// 선행(예정 Red): imageSlots.ts EMPTYABLE_SLOT_KEYS·canEmpty(§12.2), i18n/{ko,ja,en}.ts slots.kb_down.desc(§4.4 CR-043).
const DOWN1 = '타자 입력 1'
/** CR-043(R-41): 「타자 입력 1」 카드 셋째 버튼(emptyImageAria, {name} = 카드 제목) */
const emptyBtn = (key: string, name: string) =>
  within(card(key)).getByRole('button', { name: `${name} 그림 비우기` })
/** 글자(배지·빈 문구)가 들어 있는 카드 id 목록(DOM 순서) */
const badgeCardIds = (text: string) =>
  within(region())
    .getAllByText(text)
    .map(e => e.closest('article')?.dataset.testid)
/** 첫 실행 기본 세트(DEFAULT_ASSET_SLOTS 실물 — CR-044 6장, hair 없음. 이름 d7 은 CR-043 때 붙인 것) */
const d7 = (): AssetManifest => ({ canvas: CANVAS, entries: DEFAULT_ASSET_SLOTS.map(s => entry(s)) })
const withoutDown0 = (m: AssetManifest): AssetManifest => ({
  ...m,
  entries: m.entries.filter(e => slotKey(e.slot) !== 'kb_down_0'),
})

describe('ImagesTab — 타자 입력 1 선택 강등 (R-40, CR-043)', () => {
  it('TC-230: 필수 배지·「필수 · 미등록」은 kb_up·mouse_base 2장뿐 — 「타자 입력 1」은 빈 칸이어도 「선택」·「등록된 그림 없음」·새 설명(title 전체), 등록돼도 선택, kb_down 없는 설치도 경고 없음, bridge 호출 없음', () => {
    const { update } = renderImages(EMPTY)
    expect(badgeCardIds('필수')).toEqual(['slot-card-kb_up', 'slot-card-mouse_base'])
    expect(badgeCardIds('필수 · 미등록')).toEqual(['slot-card-kb_up', 'slot-card-mouse_base'])
    const down = card('kb_down_0')
    expect(within(down).getByRole('heading', { level: 3 })).toHaveTextContent(DOWN1)
    expect(within(down).getByText('선택')).toBeInTheDocument()
    expect(within(down).getByText('등록된 그림 없음')).toBeInTheDocument()
    expect(within(down).queryByText('필수')).toBeNull()
    expect(within(down).queryByText('필수 · 미등록')).toBeNull()
    expect(down.querySelector('img')).toBeNull()
    const desc = within(down).getByText(KB_DOWN_DESC_KO)
    expect(desc.tagName).toBe('P')
    expect(desc).toHaveAttribute('title', KB_DOWN_DESC_KO)
    // 등록된 kb_down_0(여러 장 BASIC)도 선택 배지
    update(BASIC)
    expect(within(card('kb_down_0')).getByText('선택')).toBeInTheDocument()
    expect(within(card('kb_down_0')).queryByText('필수')).toBeNull()
    expect(badgeCardIds('필수')).toEqual(['slot-card-kb_up', 'slot-card-mouse_base'])
    expect(within(region()).queryAllByText('필수 · 미등록')).toHaveLength(0)
    // 필수 2장만 채워지고 kb_down 이 없는 설치 — 경고 문구 없음(옛 기대 「kb_down_0 필수 · 미등록」 대체)
    update(NO_DOWN)
    expect(within(card('kb_down_0')).getByText('등록된 그림 없음')).toBeInTheDocument()
    expect(within(region()).queryAllByText('필수 · 미등록')).toHaveLength(0)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(pickPngFile).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('ImagesTab — 「타자 입력 1」 「기본값」 = 비우기 (R-41, CR-043 → CR-053)', () => {
  // CR-053: kb_down_0 내장 기본이 빠져 「기본값」 자체가 비우기(resetKind clear)가 됐고 셋째 버튼 「비우기」는 없앴다(images-tab §15.2).
  // R-41(「타자 입력 1」을 비울 수 있다)은 「기본값」 경로로 계속 덮는다 — TC 번호 유지, 셋째 버튼 단언은 뒷머리·뽀모도 인물로 옮김(TC-234).
  it('TC-233 (CR-053 개정): 「타자 입력 1」 카드 버튼 2개(셋째 「비우기」 없음), 「기본값」 = 비우기 칸(aria 「타자 입력 1 그림 지우기」) — 뒤 장 없으면 활성, kb_down_1 등록이면 비활성·툴팁, 빈 칸이면 비활성(눌러도 확인창 없음), 화면 전체 「그림 비우기」 = 뒷머리·뽀모도 인물, ja·en 이름', () => {
    const { update, unmount } = renderImages(KB1)
    const btns = within(card('kb_down_0')).getAllByRole('button')
    expect(btns.map(b => b.textContent)).toEqual(['이미지 변경', '기본값'])
    expect(btns.map(b => b.getAttribute('aria-label'))).toEqual(['타자 입력 1 이미지 변경', '타자 입력 1 그림 지우기'])
    for (const b of btns) {
      expect(b).toBeEnabled()
      expect(b).toHaveAttribute('type', 'button')
    }
    expect(btns[1]).toBe(clearBtn('kb_down_0', DOWN1))
    expect(btns[1]).not.toHaveAttribute('title')
    expect(
      within(card('kb_down_0')).queryByRole('button', { name: /그림 비우기$|기본 그림으로 되돌리기$/ }),
    ).toBeNull()
    for (const key of ['kb_up', 'idle', 'rest', 'key_space', 'key_undo']) {
      expect(within(card(key)).getAllByRole('button').map(b => b.textContent), key).toEqual(['이미지 변경', '기본값'])
    }
    expect(within(addCard('kb_down_1')).queryByRole('button', { name: /그림 비우기$/ })).toBeNull()
    // 화면 전체 「… 그림 비우기」 = 뒷머리·뽀모도 인물(CR-053 — CR-044 기대 [kb_down_0] 대체)
    expect(
      within(region())
        .getAllByRole('button', { name: /그림 비우기$/ })
        .map(b => b.closest('article')?.dataset.testid),
    ).toEqual(['slot-card-hair', 'slot-card-pomo_char'])
    // kb_down_1 등록(BASIC) → 비활성·툴팁(마지막 장부터), 「이미지 변경」은 활성, 뒤 장 「기본값」 활성
    update(BASIC)
    expect(clearBtn('kb_down_0', DOWN1)).toBeDisabled()
    expect(clearBtn('kb_down_0', DOWN1)).toHaveAttribute('title', '마지막 장부터 지울 수 있습니다.')
    expect(changeBtn('kb_down_0', DOWN1)).toBeEnabled()
    fireEvent.click(clearBtn('kb_down_0', DOWN1))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(clearBtn('kb_down_1', '타자 입력 2')).toBeEnabled()
    // 빈 칸(EMPTY) → 비활성·툴팁 없음(되돌릴 내장 기본도 없다)
    update(EMPTY)
    expect(clearBtn('kb_down_0', DOWN1)).toBeDisabled()
    expect(clearBtn('kb_down_0', DOWN1)).not.toHaveAttribute('title')
    fireEvent.click(clearBtn('kb_down_0', DOWN1))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    update(KB1)
    expect(clearBtn('kb_down_0', DOWN1)).toBeEnabled()
    unmount()
    // ja·en — aria-label = clearImageAria({name} = slots.kb_down.title, n = 1), 글자 = clearImage
    const cases: [string, { clearImage: string }, string][] = [
      ['ja', ja, '押下 1の画像を削除'],
      ['en', en, 'Remove image: Press 1'],
    ]
    for (const [lang, d, name] of cases) {
      const r = renderImages(KB1, SETTINGS, lang)
      const b = within(card('kb_down_0')).getByRole('button', { name })
      expect(b, lang).toHaveTextContent(d.clearImage)
      expect(within(card('kb_down_0')).getAllByRole('button'), lang).toHaveLength(2)
      expect(within(card('kb_down_0')).getAllByRole('button')[1], lang).toBe(b)
      expect(b, lang).toBeEnabled()
      r.unmount()
    }
    expect(pickPngFile).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-234 (CR-053 개정): 두 줄 양식(cardEmptyable·actions2·outline 재사용) = 뒷머리·뽀모도 인물 카드(등록·빈 칸 모두), 「타자 입력 1」·kb_down_1·다른 키보드 카드는 한 줄', () => {
    const HP: AssetManifest = { ...KB1, entries: [...KB1.entries, entry('hair'), entry('pomo_char')] }
    const { update } = renderImages(KB1)
    for (const m of [KB1, BASIC, EMPTY, HP]) {
      update(m)
      for (const key of ['hair', 'pomo_char']) {
        const c = card(key)
        const btns = within(c).getAllByRole('button')
        expect(btns, key).toHaveLength(3)
        expect(c.className, key).toMatch(/cardEmptyable/)
        for (const cls of card('kb_up').className.split(' ').filter(Boolean)) {
          expect(c.classList.contains(cls), `${key} ${cls}`).toBe(true) // 기본 카드 클래스 + cardEmptyable
        }
        expect(btns[0].parentElement, key).toBe(btns[1].parentElement)
        expect(btns[0].parentElement, key).toBe(btns[2].parentElement)
        expect(btns[0].parentElement?.className, key).toMatch(/actions2/)
        expect(btns[2].className, key).toBe(btns[1].className) // .outline 재사용
      }
      const down = card('kb_down_0')
      const dBtns = within(down).getAllByRole('button')
      expect(dBtns).toHaveLength(2)
      expect(down.className).not.toMatch(/cardEmptyable/)
      expect(dBtns[0].parentElement?.className ?? '').not.toMatch(/actions2/)
      for (const key of ['kb_up', 'idle', 'key_space']) {
        expect(card(key).className, key).not.toMatch(/cardEmptyable/)
        expect(within(card(key)).getAllByRole('button')[0].parentElement?.className ?? '', key).not.toMatch(/actions2/)
      }
    }
    update(BASIC)
    expect(card('kb_down_1').className).not.toMatch(/cardEmptyable/)
    expect(within(card('kb_down_1')).getAllByRole('button')[0].parentElement?.className ?? '').not.toMatch(/actions2/)
    expect(emptyBtn('hair', '뒷머리')).toBeDisabled() // BASIC 에는 hair 가 없다
    expect(pickPngFile).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
  })

  it('TC-235 (CR-053 개정): 「타자 입력 1」 「기본값」 → 기존 비우기 확인창({name} = 타자 입력 1, 포커스 「취소」) — 취소·Esc 는 호출 없음, 포커스는 누른 「기본값」으로, 그림 그대로', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    renderImages(KB1)
    const trigger = clearBtn('kb_down_0', DOWN1)
    fireEvent.click(trigger)
    const dlg = dialog()
    expect(dlg).toHaveAttribute('aria-modal', 'true')
    expect(dlg).toHaveAccessibleName('그림 지우기')
    expect(dlg).toHaveAccessibleDescription('‘타자 입력 1’ 그림을 지울까요? 되돌릴 수 없습니다.')
    expect(within(dlg).getAllByRole('button').map(b => b.textContent)).toEqual(['지우기', '취소'])
    expect(within(dlg).getByRole('button', { name: '지우기' }).className).toMatch(/danger/)
    expect(within(dlg).getByRole('button', { name: '취소' })).toHaveFocus()
    fireEvent.click(within(dlg).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(trigger).toHaveFocus()
    fireEvent.click(trigger)
    expect(dialog()).toBeInTheDocument()
    fireEvent.keyDown(document.activeElement ?? dialog(), { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(trigger).toHaveFocus()
    expect(trigger).toBeEnabled()
    expect(card('kb_down_0').querySelector('img')).toHaveAttribute('src', 'asset://kb_down_0.png')
    expect(removeAsset).not.toHaveBeenCalled()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it("TC-236 (CR-053 개정): 「타자 입력 1」 「기본값」 → 「지우기」 → removeAsset({kind:'kb_down',index:0}) 정확히 1회·restoreDefaultAsset 0회·진행 중 전부 비활성, 응답 뒤 포커스 = 누른 「기본값」(focusAfter 없음), 수신 뒤 빈 미리보기(선택 칸 문구)·「기본값」 비활성·「이미지 변경」 활성·추가 카드 없음", async () => {
    const rm = deferred<AssetManifest>()
    vi.mocked(removeAsset).mockReturnValue(rm.promise)
    const { update } = renderImages(KB1)
    const trigger = clearBtn('kb_down_0', DOWN1)
    fireEvent.click(trigger)
    fireEvent.click(within(dialog()).getByRole('button', { name: '지우기' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(removeAsset).toHaveBeenCalledTimes(1))
    expect(removeAsset).toHaveBeenCalledWith(kbDown(0))
    for (const b of cardButtons()) expect(b).toBeDisabled() // slotBusy = 'kb_down_0'
    await act(async () => rm.resolve(NO_DOWN))
    // 비우기 칸 옛 규칙(§5 onConfirmClear `c.focusAfter ?? c.trigger`) — 수신 전에는 「기본값」이 아직 활성이라 포커스를 받는다
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(card('kb_down_0').querySelector('img')).toHaveAttribute('src', 'asset://kb_down_0.png') // 수신 전 그대로
    update(NO_DOWN) // assets://changed 흉내
    expect(card('kb_down_0').querySelector('img')).toBeNull()
    expect(within(card('kb_down_0')).getByText('등록된 그림 없음')).toBeInTheDocument()
    expect(within(card('kb_down_0')).queryByText('필수 · 미등록')).toBeNull()
    expect(clearBtn('kb_down_0', DOWN1)).toBeDisabled() // 수신 뒤 포커스 위치는 판정하지 않는다(설계 G-1)
    expect(changeBtn('kb_down_0', DOWN1)).toBeEnabled()
    expect(screen.queryAllByTestId(/^add-card-/)).toHaveLength(0)
    expect(within(card('kb_down_0')).queryByRole('alert')).toBeNull()
    expect(removeAsset).toHaveBeenCalledTimes(1)
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
    expect(pickPngFile).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-237 (CR-053 개정): 「타자 입력 1」 「기본값」 비우기 실패 → 카드 오류 띠(ko = core message, en = 사전 code 문구), 그림 그대로·「기본값」 다시 활성·포커스 누른 「기본값」, 다른 카드 오류 없음', async () => {
    vi.mocked(removeAsset).mockRejectedValueOnce(DOWN_IO).mockRejectedValueOnce(DOWN_GONE)
    const { unmount } = renderImages(KB1)
    const trigger = clearBtn('kb_down_0', DOWN1)
    fireEvent.click(trigger)
    fireEvent.click(within(dialog()).getByRole('button', { name: '지우기' }))
    await waitFor(() => expect(within(card('kb_down_0')).getByRole('alert')).toHaveTextContent(DOWN_IO.message))
    expect(card('kb_down_0').querySelector('img')).toHaveAttribute('src', 'asset://kb_down_0.png')
    await waitFor(() => expect(trigger).toBeEnabled())
    expect(changeBtn('kb_down_0', DOWN1)).toBeEnabled()
    await waitFor(() => expect(trigger).toHaveFocus()) // focusAfter 없음 → 누른 버튼(TC-146 과 같은 규칙)
    expect(within(card('kb_up')).queryByRole('alert')).toBeNull()
    expect(within(card('hair')).queryByRole('alert')).toBeNull()
    expect(removeAsset).toHaveBeenCalledWith(kbDown(0))
    unmount()
    renderImages(KB1, SETTINGS, 'en')
    fireEvent.click(within(card('kb_down_0')).getByRole('button', { name: 'Remove image: Press 1' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: en.confirmClearOk }))
    await waitFor(() =>
      expect(within(card('kb_down_0')).getByRole('alert')).toHaveTextContent(en.errors['asset.not_found']),
    )
    expect(removeAsset).toHaveBeenCalledTimes(2)
    expect(vi.mocked(removeAsset).mock.calls.every(c => slotKey(c[0]) === 'kb_down_0')).toBe(true)
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })
})

describe('ImagesTab — TC-FLOW (S-21 · S-22, CR-043)', () => {
  it('TC-FLOW-22 (CR-053 개정): S-21 — 첫 실행(기본 7장 — 타자 그림 없음) 이미지 탭에서 필수 배지 2장(기본·팔 기본)과 「타자 입력 1」의 「선택」 배지·설명·빈 칸(경고 없음)을 보고, 타자 그림을 넣어도 선택 칸임을 확인', () => {
    const D7 = d7() // DEFAULT_ASSET_SLOTS 실물 — CR-053 7장, kb_down_0 없음
    const { update } = renderImages(D7)
    // Step 1 (TC-230 배지·빈 칸 부분) — CR-053: 첫 실행부터 kb_down_0 빈 칸(옛 Step 3 이 Step 1 로 합쳐짐)
    expect(badgeCardIds('필수')).toEqual(['slot-card-kb_up', 'slot-card-mouse_base'])
    expect(within(card('kb_down_0')).getByText('선택')).toBeInTheDocument()
    expect(card('kb_down_0').querySelector('img')).toBeNull()
    expect(within(card('kb_down_0')).getByText('등록된 그림 없음')).toBeInTheDocument()
    expect(within(region()).queryAllByText('필수 · 미등록')).toHaveLength(0)
    expect(screen.queryByRole('alert')).toBeNull()
    // Step 2 (TC-230 설명 부분 · TC-231 값)
    expect(within(card('kb_down_0')).getByText(KB_DOWN_DESC_KO)).toHaveAttribute('title', KB_DOWN_DESC_KO)
    // Step 3 (TC-230 등록 부분) — 사용자가 타자 그림을 넣은 설치(assets://changed 흉내)
    const WITH0: AssetManifest = { ...D7, entries: [...D7.entries, entry(kbDown(0))] }
    update(WITH0)
    expect(card('kb_down_0').querySelector('img')).toHaveAttribute('src', 'asset://kb_down_0.png')
    expect(within(card('kb_down_0')).getByText('선택')).toBeInTheDocument()
    expect(badgeCardIds('필수')).toEqual(['slot-card-kb_up', 'slot-card-mouse_base'])
    expect(withoutDown0(WITH0).entries).toEqual(D7.entries) // 비우면 첫 실행 모양으로 돌아간다(TC-FLOW-23 Step 3 의 Given)
    expect(pickPngFile).not.toHaveBeenCalled()
    expect(importAsset).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-FLOW-23 (CR-053 개정): S-22 — 타자 입력 2 가 있어 「타자 입력 1」 「기본값」(비우기)이 잠긴 것을 보고 → 타자 입력 2 를 먼저 비우고 → 「타자 입력 1」 「기본값」으로 비움 → 빈 칸(되돌릴 내장 기본 없음) → 다시 필요하면 「이미지 변경」으로 넣는다', async () => {
    const D7 = d7()
    const ONE: AssetManifest = { ...D7, entries: [...D7.entries, entry(kbDown(0))] }
    const TWO: AssetManifest = { ...ONE, entries: [...ONE.entries, entry(kbDown(1))] }
    const NO0 = withoutDown0(ONE)
    vi.mocked(removeAsset).mockResolvedValueOnce(ONE).mockResolvedValueOnce(NO0)
    vi.mocked(importAsset).mockResolvedValue(ONE)
    const { update } = renderImages(TWO)
    // Step 1 (TC-233 잠김 부분) — 셋째 버튼 없음, 「기본값」 비활성·툴팁
    expect(within(card('kb_down_0')).getAllByRole('button')).toHaveLength(2)
    expect(clearBtn('kb_down_0', DOWN1)).toBeDisabled()
    expect(clearBtn('kb_down_0', DOWN1)).toHaveAttribute('title', '마지막 장부터 지울 수 있습니다.')
    // Step 2 (TC-143 — 뒤 장 「기본값」 = 비우기)
    openClear('kb_down_1', '타자 입력 2')
    fireEvent.click(within(dialog()).getByRole('button', { name: '지우기' }))
    await waitFor(() => expect(removeAsset).toHaveBeenCalledTimes(1))
    expect(removeAsset).toHaveBeenNthCalledWith(1, kbDown(1))
    await waitFor(() => expect(changeBtn('kb_up', '기본')).toBeEnabled())
    update(ONE)
    expect(screen.queryByTestId('slot-card-kb_down_1')).toBeNull()
    // Step 3 (TC-233 활성 부분 → TC-235 확인창 → TC-236 확정)
    expect(clearBtn('kb_down_0', DOWN1)).toBeEnabled()
    expect(clearBtn('kb_down_0', DOWN1)).not.toHaveAttribute('title')
    const trigger = openClear('kb_down_0', DOWN1)
    expect(dialog()).toHaveAccessibleDescription('‘타자 입력 1’ 그림을 지울까요? 되돌릴 수 없습니다.')
    fireEvent.click(within(dialog()).getByRole('button', { name: '지우기' }))
    await waitFor(() => expect(removeAsset).toHaveBeenCalledTimes(2))
    expect(removeAsset).toHaveBeenNthCalledWith(2, kbDown(0))
    await waitFor(() => expect(trigger).toHaveFocus())
    update(NO0)
    expect(card('kb_down_0').querySelector('img')).toBeNull()
    expect(within(card('kb_down_0')).getByText('등록된 그림 없음')).toBeInTheDocument()
    expect(clearBtn('kb_down_0', DOWN1)).toBeDisabled()
    expect(within(card('kb_down_0')).queryByRole('button', { name: `${DOWN1} 기본 그림으로 되돌리기` })).toBeNull()
    expect(screen.queryAllByTestId(/^add-card-/)).toHaveLength(0)
    // Step 4 (TC-139 — 「이미지 변경」으로 다시 넣기, CR-053: 옛 「기본값」 복원 단계 대체)
    fireEvent.click(changeBtn('kb_down_0', DOWN1))
    expect(pickPngFile).toHaveBeenCalledWith('PNG 이미지 선택')
    await waitFor(() => expect(importAsset).toHaveBeenCalledWith(kbDown(0), PATH))
    await waitFor(() => expect(changeBtn('kb_down_0', DOWN1)).toBeEnabled())
    update(ONE)
    expect(card('kb_down_0').querySelector('img')).toHaveAttribute('src', 'asset://kb_down_0.png')
    expect(clearBtn('kb_down_0', DOWN1)).toBeEnabled()
    expect(removeAsset).toHaveBeenCalledTimes(2)
    expect(importAsset).toHaveBeenCalledTimes(1)
    expect(restoreDefaultAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })
})
