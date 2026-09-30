/**
 * 「기본 설정」 탭 전체 초기화 카드(ResetAllCard) 스펙 — CR-054 · R-56 (사용자행 S-30).
 * 기준: src/settings/design/general-tab.md §1(cardReset)·§2·§4-6·§5 G-8·§6·§7(§7.2 ~ §7.8)
 *       · design/i18n.md §4.11(단순 키 8)·§4.6 CR-054 주(errors reset.io·reset.seed, ERROR_CODES 27)
 *       · contract v0.25 §5.10(reset_app_data — 이벤트 2·3·6단계가 반환 전에 나감)·§4(settings://changed·assets://changed 순서 비의존)·§6
 *       · scenarios.md 「CR-054 개정」 절 TC-293 ~ TC-304 · TC-FLOW-31 · TC-FLOW-32.
 * bridge 는 항상 mock(vi.mock('bridge/commands')·vi.mock('bridge/events')) — toBridgeError·bridge/types 상수만 실물.
 * 이벤트는 구독 콜백을 붙잡아 emit 함수로 흉내 낸다(SettingsApp.test.tsx 관례). 가짜 시계 없음(시간 의존 없음 — §7.2 타이머 없음).
 * 응답(resolve/reject)과 이벤트의 도착 순서에 의존하지 않는다(general-tab §7.6) — 「응답 → 이벤트」(응답이 이벤트를 앞지른 경우)와
 * 「이벤트 → 응답」(계약 §5.10 순서) 두 사례를 모두 판정한다.
 * 구현 전 Red 가 정상: ResetAllCard.tsx · GeneralTab 연결 · i18n 8키 · errors 2개가 없으면 import·단언이 실패한다.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  DEFAULT_ASSET_SLOTS,
  DEFAULT_TIMER_SETTINGS,
  slotKey,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type BridgeError,
  type Settings,
} from 'bridge/types'
import {
  getAssetManifest,
  getSettings,
  importAsset,
  removeAsset,
  resetAppData,
  resetOverlayPosition,
  restoreDefaultAsset,
  setAutostart,
  setSettings,
  setSettingsWindowTitle,
} from 'bridge/commands'
import { onAssetsChanged, onHandAnchorChanged, onSettingsChanged, onTimerChanged } from 'bridge/events'
import ResetAllCard from '../components/ResetAllCard'
import GeneralTab from '../components/GeneralTab'
import SettingsApp from '../index'
import { MessagesProvider } from '../i18n/MessagesContext'
import { ERROR_CODES } from '../i18n/types'
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
    getHandAnchor: vi.fn(),
    resetAppData: vi.fn(), // CR-054(contract v0.25 §5.10) — 이 스펙의 대상 호출
    // 타이머 탭 공용 훅·알림음 카드 래퍼(SettingsApp.test.tsx 와 같은 이유로 일반 함수 — 이 스펙은 타이머 탭을 열지 않는다)
    getTimer: async () => ({ status: 'stopped', elapsedMs: 0 }),
    controlTimer: async () => ({ status: 'stopped', elapsedMs: 0 }),
    getAlarmSound: async () => null,
    importAlarmSound: async () => ({ format: 'wav', bytes: 1024, url: 'asset://alarm.wav' }),
    removeAlarmSound: async () => undefined,
    pickAudioFile: async () => null,
  }
})
vi.mock('components/utils/alarmSound', () => ({ defaultAlarmUrl: vi.fn(), playSound: vi.fn(), alarmGain: vi.fn() }))
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
  // 호출 수 단언용 vi.fn(TC-296 0회). 구현은 beforeEach 에서 일반 함수와 같은 값으로 다시 건다(resetAllMocks 영향 없게)
  onTimerChanged: vi.fn(),
}))

// ─── 확정 문구(design/i18n.md §4.11 ko 열 — 정확 일치) ─────────────────────────
const KO = {
  card: '초기화',
  button: '전체 초기화',
  desc: '등록한 그림·알림음과 모든 설정을 처음 설치한 상태(기본 그림)로 되돌립니다. 언어와 자동 실행 설정은 그대로 둡니다.',
  title: '전체 초기화',
  message:
    '등록한 그림·알림음과 설정을 지우고 처음 설치한 상태로 되돌릴까요? 언어와 자동 실행 설정은 그대로이고, 오버레이는 기본 위치로 돌아갑니다. 되돌릴 수 없습니다.',
  ok: '초기화',
  cancel: '취소', // 기존 confirmCancel 재사용
  pending: '초기화하는 중입니다…',
  done: '초기화했습니다.',
}
/** design/i18n.md §4.6 CR-054 행 ko 열(core message 가 빈 문자열일 때만 쓰는 폴백) */
const KO_RESET_IO = '데이터를 모두 초기화하지 못했습니다(일부만 초기화됐을 수 있습니다). 앱을 다음에 시작할 때 다시 시도합니다.'
const KO_RESET_SEED = '기본 그림을 다시 채우지 못했습니다. 앱을 다음에 시작할 때 다시 시도합니다.'
/** contract v0.25 §6 core 원문(ko 화면에는 이 message 가 보인다 — i18n §4.6 CR-054 주) */
const CORE_IO = '앱 데이터를 초기화하지 못했습니다. 다음에 앱을 시작할 때 다시 시도합니다.'
const CORE_SEED = '기본 그림을 다시 채우지 못했습니다. 다음에 앱을 시작할 때 다시 시도합니다.'
const SETTINGS_IO_MSG = '설정 파일을 읽거나 쓸 수 없습니다: 거부'

// ─── 픽스처 ────────────────────────────────────────────────────────────────
/** 사용자가 이것저것 바꿔 둔 상태(S-30) — 언어 ko·자동 실행 켬 */
const CUSTOM: Settings = {
  scale: 1.5,
  idleSeconds: 120,
  overlay: { x: 30, y: 40, visible: true },
  mouse: null,
  autostart: true,
  language: 'ko',
  positionLock: true,
  showInTaskbar: true,
  timer: DEFAULT_TIMER_SETTINGS,
}
/** core 초기화 뒤 스냅숏 흉내 — 언어·자동 실행 보존(계약 §5.10 보존 규칙), 나머지 기본. ui 는 이 값을 계산하지 않는다 */
const RESET: Settings = {
  ...CUSTOM,
  scale: 1,
  idleSeconds: 300,
  overlay: { x: 100, y: 100, visible: true },
  positionLock: false,
  showInTaskbar: false,
}
const CANVAS = { width: 900, height: 700 }
const SMALL = new Set(['mouse_base', 'pen_up', 'pen_down_0'])
const entry = (slot: AssetSlot, v: string): AssetEntry => {
  const k = slotKey(slot)
  const [width, height] = SMALL.has(k) ? [168, 150] : [900, 700]
  return { slot, fileName: `${k}.png`, width, height, bytes: 1000, url: `asset://${k}.png?v=${v}` }
}
const CUSTOM_SLOTS: AssetSlot[] = ['background', 'kb_up', 'mouse_base', 'idle', 'rest']
const CUSTOM_MANIFEST: AssetManifest = { canvas: CANVAS, entries: CUSTOM_SLOTS.map(s => entry(s, 'c')) }
/** 기본 그림 6장(contract v0.29 DEFAULT_ASSET_SLOTS — 실물 상수, v29: hair 없음 · 옛 v0.24 7장) */
const DEFAULT_MANIFEST: AssetManifest = { canvas: CANVAS, entries: DEFAULT_ASSET_SLOTS.map(s => entry(s, 'd')) }
const defaultUrls = () => DEFAULT_ASSET_SLOTS.map(s => `asset://${slotKey(s)}.png?v=d`)

/** 기본 설정 탭 표시값 — 스위치 순서 = 잠금 · 작업표시줄 · 자동 실행 */
const CUSTOM_VALUES = { scale: '150', idle: '2', switches: ['true', 'true', 'true'], language: 'ko' }
const RESET_VALUES = { scale: '100', idle: '5', switches: ['false', 'false', 'true'], language: 'ko' }

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
let emitSettings: (s: Settings) => void = () => {}
let emitAssets: (m: AssetManifest) => void = () => {}
beforeEach(() => {
  vi.resetAllMocks()
  onError = vi.fn()
  document.documentElement.lang = ''
  // 이전 일반 함수(async () => () => {})와 같은 동작 — 호출 수만 셀 수 있게 vi.fn 위에 다시 건다
  vi.mocked(onTimerChanged).mockImplementation(async () => () => {})
})

// ─── 도우미 ────────────────────────────────────────────────────────────────
const card = (name = KO.card) => screen.getByRole('region', { name })
const resetBtn = (name = KO.button) => screen.getByRole('button', { name })
const status = (name = KO.card) => within(card(name)).getByRole('status')
const dialog = () => screen.queryByRole('alertdialog')
const openDialog = (name = KO.button) => fireEvent.click(resetBtn(name))
const clickInDialog = (name: string) =>
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name }))
const renderCard = () => render(<ResetAllCard onError={onError} />)
/** resetAppData 를 지연 promise 로 두고 확인까지 누른다(해결은 호출자가) */
const confirmWithDeferred = (btn = KO.button, ok = KO.ok) => {
  const d = deferred<void>()
  vi.mocked(resetAppData).mockReturnValue(d.promise)
  openDialog(btn)
  clickInDialog(ok)
  return d
}
const expectNoOtherBridge = () => {
  expect(setSettings).not.toHaveBeenCalled()
  expect(setAutostart).not.toHaveBeenCalled()
  expect(resetOverlayPosition).not.toHaveBeenCalled()
  expect(importAsset).not.toHaveBeenCalled()
  expect(removeAsset).not.toHaveBeenCalled()
  expect(restoreDefaultAsset).not.toHaveBeenCalled()
}
/** pending 표시(§7.5 렌더 2·4) — 값이 먼저 바뀌어도 응답 전까지 유지돼야 한다(§7.6) */
const expectPending = () => {
  expect(resetBtn()).toBeDisabled()
  expect(resetBtn()).toHaveAttribute('aria-busy', 'true')
  expect(status().textContent).toBe(KO.pending)
}

// SettingsApp 통합(TC-302 · TC-303 · TC-304 · TC-FLOW-31 · TC-FLOW-32)
const setupApp = (s: Settings = CUSTOM) => {
  vi.mocked(getSettings).mockResolvedValue(s)
  vi.mocked(getAssetManifest).mockResolvedValue(CUSTOM_MANIFEST)
  vi.mocked(setSettingsWindowTitle).mockResolvedValue(undefined)
  vi.mocked(onSettingsChanged).mockImplementation(cb => {
    emitSettings = cb
    return Promise.resolve(vi.fn())
  })
  vi.mocked(onAssetsChanged).mockImplementation(cb => {
    emitAssets = cb
    return Promise.resolve(vi.fn())
  })
}
const mountApp = async () => {
  render(<SettingsApp />)
  await waitFor(() => {
    expect(getSettings).toHaveBeenCalled()
    expect(getAssetManifest).toHaveBeenCalled()
  })
  await act(async () => {})
}
const generalValues = () => ({
  scale: (screen.getByRole('slider', { name: '배율' }) as HTMLInputElement).value,
  idle: (screen.getByRole('spinbutton', { name: '유휴 시간' }) as HTMLInputElement).value,
  switches: screen.getAllByRole('switch').map(s => s.getAttribute('aria-checked')),
  language: (screen.getByRole('combobox', { name: '표시 언어' }) as HTMLSelectElement).value,
})
const subCounts = () => [vi.mocked(onSettingsChanged).mock.calls.length, vi.mocked(onAssetsChanged).mock.calls.length]
const h1Texts = () => screen.queryAllByRole('heading', { level: 1 }).map(h => h.textContent)
const tabOf = (name: string) => within(screen.getByRole('tablist', { name: '설정 탭' })).getByRole('tab', { name })
const selectTab = (name: string) => fireEvent.click(tabOf(name))
const generalTabSelected = () => tabOf('기본 설정').getAttribute('aria-selected')
const openImagesTab = () => selectTab('이미지 설정')
const imageSrcs = () =>
  Array.from(screen.getByRole('region', { name: '이미지 설정' }).querySelectorAll('img')).map(i => i.getAttribute('src'))
type Ev = 'settings' | 'assets'
/**
 * core 이벤트를 차례로 보낸다(기본 설정 탭이 열려 있을 때). settings(RESET)는 받는 즉시 RESET_VALUES,
 * assets 는 설정 값을 바꾸지 않는다(§7.6) — 매 이벤트 뒤 판정.
 */
const emitInOrder = (events: readonly Ev[]) => {
  for (const e of events) {
    if (e === 'settings') {
      act(() => emitSettings(RESET))
      expect(generalValues()).toEqual(RESET_VALUES)
    } else {
      const before = generalValues()
      act(() => emitAssets(DEFAULT_MANIFEST))
      expect(generalValues()).toEqual(before)
    }
  }
}

// ─── 카드 렌더·확인창 (§1 · §4-6 · §7.5) ─────────────────────────────────────
describe('ResetAllCard — 렌더·확인창 (general-tab §7, R-56)', () => {
  it('TC-293: 기본 설정 탭 맨 아래 「초기화」 카드 — 제목·「전체 초기화」 위험 버튼·설명 ko 정확, 상태 줄은 항상 있고 빈 문자열, 확인창 없음, bridge 0회', () => {
    const { container } = render(<GeneralTab settings={CUSTOM} onError={onError} />)
    const tab = screen.getByRole('region', { name: '기본 설정' })
    expect(within(tab).getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual([
      '언어 / Language',
      '크기 · 반응',
      '창',
      '작업표시줄 · 시작',
      KO.card,
    ])
    expect(tab.lastElementChild).toBe(card()) // §4-6 section 의 마지막 자식
    const btns = within(card()).getAllByRole('button')
    expect(btns).toHaveLength(1)
    const b = btns[0]
    expect(b.tagName).toBe('BUTTON') // §7.8 네이티브 <button> — Enter·Space 로 연다(실물 키 조작은 M-54f)
    expect(b.textContent).toBe(KO.button)
    expect(b).toHaveAccessibleName(KO.button)
    expect(b).not.toHaveAttribute('aria-label') // §7.8 접근 이름 = 보이는 글자
    expect(b).toHaveAttribute('type', 'button')
    expect(b).toBeEnabled()
    expect(b).not.toHaveAttribute('aria-busy')
    expect(b.className).toMatch(/dangerButton/) // §7.4
    expect(within(card()).getByText(KO.desc).tagName).toBe('P')
    const st = status()
    expect(st.tagName).toBe('P')
    expect(st).toHaveAttribute('aria-live', 'polite')
    expect(st.textContent).toBe('')
    expect(dialog()).toBeNull()
    expect(container.querySelectorAll('p[role="status"]')).toHaveLength(2) // 자동 실행 안내 줄 + 초기화 상태 줄
    expect(resetAppData).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expectNoOtherBridge()
  })

  it('TC-294: 「전체 초기화」 → alertdialog(제목·본문·확인·취소 ko 정확, 확인 = danger), 첫 포커스 취소·Tab 순환, 호출 0회·상태 불변', () => {
    renderCard()
    openDialog()
    const d = screen.getByRole('alertdialog')
    expect(d).toHaveAccessibleName(KO.title)
    expect(d).toHaveAccessibleDescription(KO.message)
    expect(d).toHaveAttribute('aria-modal', 'true')
    expect(d.closest('section')).toBe(card()) // §7.5 본문 ③
    const [ok, cancel] = within(d).getAllByRole('button')
    expect(within(d).getAllByRole('button').map(x => x.textContent)).toEqual([KO.ok, KO.cancel])
    expect(ok.className).toMatch(/danger/) // tone 생략 = 기본 danger
    expect(cancel).toHaveFocus()
    fireEvent.keyDown(d, { key: 'Tab' })
    expect(ok).toHaveFocus()
    fireEvent.keyDown(d, { key: 'Tab' })
    expect(cancel).toHaveFocus()
    expect(status().textContent).toBe('')
    expect(resetBtn()).toBeEnabled()
    expect(resetAppData).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-295: 취소 버튼·Esc — 둘 다 확인창이 닫히고 resetAppData 0회, onError 0회, 상태 줄 빈 문자열 그대로', () => {
    renderCard()
    openDialog()
    clickInDialog(KO.cancel)
    expect(dialog()).toBeNull()
    expect(status().textContent).toBe('')
    openDialog()
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(dialog()).toBeNull()
    expect(status().textContent).toBe('')
    expect(resetBtn()).toBeEnabled()
    expect(resetBtn()).not.toHaveAttribute('aria-busy')
    expect(resetAppData).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })
})

// ─── 확인 → 성공·실패·재진입 (§7.3 onConfirm · §7.2 전이) ────────────────────
describe('ResetAllCard — 확인 흐름 (§7.2 · §7.3 · G-8)', () => {
  it('TC-296: 확인 → 성공 — resetAppData 1회(인자 없음), 해결 전 버튼 disabled·aria-busy·상태 줄 pending, 해결 뒤 done·onError(null) 1회', async () => {
    renderCard()
    const d = confirmWithDeferred()
    expect(dialog()).toBeNull()
    expect(resetAppData).toHaveBeenCalledTimes(1)
    expect(vi.mocked(resetAppData).mock.calls[0]).toEqual([])
    const b = resetBtn()
    expect(b).toBeDisabled()
    expect(b).toHaveAttribute('aria-busy', 'true')
    expect(status().textContent).toBe(KO.pending)
    expect(onError).not.toHaveBeenCalled()
    await act(async () => {
      d.resolve()
    })
    expect(status().textContent).toBe(KO.done)
    expect(b).toBeEnabled()
    expect(b).not.toHaveAttribute('aria-busy')
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(null)
    expect(resetAppData).toHaveBeenCalledTimes(1)
    // 낙관적 갱신·재조회·새 구독 없음(§7.6) — 카드는 다른 bridge 를 부르지 않는다
    expect(getSettings).not.toHaveBeenCalled()
    expect(getAssetManifest).not.toHaveBeenCalled()
    expect(onSettingsChanged).not.toHaveBeenCalled()
    expect(onAssetsChanged).not.toHaveBeenCalled()
    expect(onHandAnchorChanged).not.toHaveBeenCalled()
    expect(onTimerChanged).not.toHaveBeenCalled()
    expectNoOtherBridge()
  })

  it.each(['reset.io', 'reset.seed', 'settings.io', 'state.poisoned'] as const)(
    'TC-297: 확인 → 실패(%s) — onError 가 그 code 로 1회, 상태 줄 빈 문자열, 버튼 다시 활성·aria-busy 없음, 예외를 밖으로 던지지 않음',
    async code => {
      const err: BridgeError = { code, message: 'x' }
      renderCard()
      const d = confirmWithDeferred()
      expect(status().textContent).toBe(KO.pending)
      await act(async () => {
        d.reject(err)
      })
      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith({ code, message: 'x' })
      expect(status().textContent).toBe('')
      expect(resetBtn()).toBeEnabled()
      expect(resetBtn()).not.toHaveAttribute('aria-busy')
      expect(dialog()).toBeNull()
      expect(resetAppData).toHaveBeenCalledTimes(1)
    },
  )

  it('TC-297(Error 객체): reject 값이 Error 면 toBridgeError 로 { code: unknown, message } — onError 1회', async () => {
    renderCard()
    const d = confirmWithDeferred()
    await act(async () => {
      d.reject(new Error('boom'))
    })
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith({ code: 'unknown', message: 'boom' })
    expect(status().textContent).toBe('')
    expect(resetBtn()).toBeEnabled()
  })

  it('TC-298: 중복 클릭·재진입 — pending 중 버튼을 눌러도 창이 안 열리고 호출 수 불변, done 에서 열기·취소는 done 유지, 다시 확인 → pending → 실패면 빈 문자열', async () => {
    const d1 = deferred<void>()
    const d2 = deferred<void>()
    vi.mocked(resetAppData).mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)
    renderCard()
    openDialog()
    clickInDialog(KO.ok)
    fireEvent.click(resetBtn())
    fireEvent.click(resetBtn())
    expect(dialog()).toBeNull()
    expect(resetAppData).toHaveBeenCalledTimes(1)
    expect(status().textContent).toBe(KO.pending)
    await act(async () => {
      d1.resolve()
    })
    expect(status().textContent).toBe(KO.done)
    openDialog()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(status().textContent).toBe(KO.done) // 열기는 phase 불변
    clickInDialog(KO.cancel)
    expect(status().textContent).toBe(KO.done) // 취소도 phase 불변(타이머·자동 해제 없음)
    expect(resetAppData).toHaveBeenCalledTimes(1)
    openDialog()
    clickInDialog(KO.ok)
    expect(status().textContent).toBe(KO.pending)
    expect(resetAppData).toHaveBeenCalledTimes(2)
    expect(vi.mocked(resetAppData).mock.calls).toEqual([[], []])
    await act(async () => {
      d2.reject({ code: 'reset.io', message: 'x' })
    })
    expect(status().textContent).toBe('')
    expect(onError.mock.calls).toEqual([[null], [{ code: 'reset.io', message: 'x' }]])
  })

  it('TC-299: 포커스 복귀 — 취소·Esc 는 즉시 「전체 초기화」, 확인은 pending 동안 버튼 밖 → 해결(성공·실패) 뒤 「전체 초기화」', async () => {
    const d1 = deferred<void>()
    const d2 = deferred<void>()
    vi.mocked(resetAppData).mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)
    renderCard()
    openDialog()
    clickInDialog(KO.cancel)
    expect(resetBtn()).toHaveFocus()
    openDialog()
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(resetBtn()).toHaveFocus()
    openDialog()
    clickInDialog(KO.ok)
    expect(resetBtn()).not.toHaveFocus() // 비활성 버튼은 포커스를 받지 않는다(§7.3 효과)
    await act(async () => {
      d1.resolve()
    })
    expect(resetBtn()).toHaveFocus()
    openDialog()
    clickInDialog(KO.ok)
    expect(resetBtn()).not.toHaveFocus()
    await act(async () => {
      d2.reject({ code: 'reset.seed', message: 'x' })
    })
    expect(resetBtn()).toHaveFocus()
  })
})

// ─── 3개 국어 (R-20 · i18n §4.11 · §4.6) ─────────────────────────────────────
describe('ResetAllCard — ja·en·사전 (i18n §4.11 · §4.6 CR-054)', () => {
  it.each([
    ['ja', 'en'],
    ['en', 'ja'],
  ] as const)(
    'TC-300: %s 렌더 — 카드·버튼·설명·확인창·상태 줄이 사전 값, 언어가 바뀌면(→ %s) done 문구도 새 언어',
    async (lang, other) => {
      const dict = lang === 'ja' ? ja : en
      const next = other === 'ja' ? ja : en
      const d = deferred<void>()
      vi.mocked(resetAppData).mockReturnValue(d.promise)
      const { rerender } = render(
        <MessagesProvider language={lang}>
          <ResetAllCard onError={onError} />
        </MessagesProvider>,
      )
      const c = card(dict.cardReset)
      expect(within(c).getByRole('button', { name: dict.resetAll })).toBeEnabled()
      expect(within(c).getByText(dict.resetAllDesc)).toBeInTheDocument()
      expect(status(dict.cardReset).textContent).toBe('')
      openDialog(dict.resetAll)
      const dlg = screen.getByRole('alertdialog')
      expect(dlg).toHaveAccessibleName(dict.confirmResetAllTitle)
      expect(dlg).toHaveAccessibleDescription(dict.confirmResetAllMessage)
      expect(within(dlg).getAllByRole('button').map(x => x.textContent)).toEqual([
        dict.confirmResetAllOk,
        dict.confirmCancel,
      ])
      clickInDialog(dict.confirmResetAllOk)
      expect(status(dict.cardReset).textContent).toBe(dict.resetAllPending)
      await act(async () => {
        d.resolve()
      })
      expect(status(dict.cardReset).textContent).toBe(dict.resetAllDone)
      rerender(
        <MessagesProvider language={other}>
          <ResetAllCard onError={onError} />
        </MessagesProvider>,
      )
      expect(status(next.cardReset).textContent).toBe(next.resetAllDone) // §7.6 언어 바뀌면 done 도 새 언어
      expect(resetAppData).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(null)
    },
  )

  it('TC-301: i18n 사전 CR-054 — 새 단순 키 8개 ko 정확·ja·en 비어 있지 않음·번역됨, 취소는 기존 confirmCancel, errors reset.io·reset.seed(ko 정확), ERROR_CODES 27 = 계약 26 + unknown(sound.io 뒤·unknown 앞)', () => {
    const KO_NEW: Record<string, string> = {
      cardReset: KO.card,
      resetAll: KO.button,
      resetAllDesc: KO.desc,
      confirmResetAllTitle: KO.title,
      confirmResetAllMessage: KO.message,
      confirmResetAllOk: KO.ok,
      resetAllPending: KO.pending,
      resetAllDone: KO.done,
    }
    // KO_NEW 는 기대값 표(8키 — i18n §4.11)다. 판정은 아래 사전 대조 단언이 한다.
    const koRec = ko as unknown as Record<string, string>
    for (const [k, v] of Object.entries(KO_NEW)) expect(koRec[k], k).toBe(v)
    expect(ko.confirmResetAllMessage).toContain('되돌릴 수 없습니다') // ui-design-strategy §11
    expect(ko.confirmCancel).toBe(KO.cancel)
    for (const dict of [ko, ja, en]) {
      expect(Object.keys(dict).filter(k => /^confirmResetAll/.test(k)).sort()).toEqual([
        'confirmResetAllMessage',
        'confirmResetAllOk',
        'confirmResetAllTitle',
      ]) // 취소 키를 새로 만들지 않는다
    }
    for (const dict of [ja, en]) {
      const rec = dict as unknown as Record<string, string>
      for (const k of Object.keys(KO_NEW)) {
        expect(typeof rec[k], k).toBe('string')
        expect(rec[k].trim().length, k).toBeGreaterThan(0)
        expect(rec[k], k).not.toBe(koRec[k])
      }
    }
    expect(ja.confirmResetAllMessage).toContain('元に戻せません')
    expect(en.confirmResetAllMessage).toContain('cannot be undone')
    // errors(i18n §4.6 CR-054)
    expect(ko.errors['reset.io']).toBe(KO_RESET_IO)
    expect(ko.errors['reset.seed']).toBe(KO_RESET_SEED)
    for (const dict of [ja, en]) {
      for (const c of ['reset.io', 'reset.seed'] as const) {
        expect(dict.errors[c].trim().length, c).toBeGreaterThan(0)
        expect(dict.errors[c], c).not.toBe(ko.errors[c])
      }
    }
    expect(ERROR_CODES).toHaveLength(27)
    expect(ERROR_CODES.filter(c => c !== 'unknown')).toHaveLength(26) // 계약 v0.25 §6 code 26
    const i = ERROR_CODES.indexOf('sound.io')
    expect(ERROR_CODES.slice(i)).toEqual(['sound.io', 'reset.io', 'reset.seed', 'unknown'])
    for (const dict of [ko, ja, en]) {
      expect(Object.keys(dict.errors).sort()).toEqual([...ERROR_CODES].sort())
    }
  })
})

// ─── SettingsApp 통합 (§7.2 언마운트 · §7.6 · §7.7 · G-8) ─────────────────────
describe('SettingsApp — 전체 초기화 뒤 화면 갱신 (§7.6, R-56)', () => {
  it('TC-302: 낙관적 갱신 없음 — 해결 뒤에도 이벤트 전에는 값 불변, assets 이벤트만으로는 설정 값 불변, 재조회·새 구독 없음, 탭·h1 그대로', async () => {
    setupApp()
    await mountApp()
    const subs = subCounts()
    expect(generalValues()).toEqual(CUSTOM_VALUES)
    const d = confirmWithDeferred()
    expect(status().textContent).toBe(KO.pending)
    expect(generalValues()).toEqual(CUSTOM_VALUES)
    await act(async () => {
      d.resolve()
    })
    expect(status().textContent).toBe(KO.done)
    expect(generalValues()).toEqual(CUSTOM_VALUES) // 이벤트 전 — 화면을 먼저 바꾸지 않는다
    expect(h1Texts()).toEqual(['기본 설정'])
    expect(generalTabSelected()).toBe('true')
    act(() => emitAssets(DEFAULT_MANIFEST))
    expect(generalValues()).toEqual(CUSTOM_VALUES) // assets://changed 는 설정 값을 바꾸지 않는다
    expect(status().textContent).toBe(KO.done)
    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
    expect(subCounts()).toEqual(subs)
    expect(resetAppData).toHaveBeenCalledTimes(1)
    expect(vi.mocked(resetAppData).mock.calls[0]).toEqual([])
    expectNoOtherBridge()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('TC-303(en · reset.seed): 실패 → 창 공통 오류 줄 = en 접두어 + en 사전 문구, 상태 줄 빈 문자열', async () => {
    setupApp({ ...CUSTOM, language: 'en' })
    await mountApp()
    await waitFor(() => expect(card(en.cardReset)).toBeInTheDocument())
    const d = confirmWithDeferred(en.resetAll, en.confirmResetAllOk)
    await act(async () => {
      d.reject({ code: 'reset.seed', message: CORE_SEED })
    })
    expect(screen.getByRole('alert').textContent).toBe(`${en.errorPrefix} ${en.errors['reset.seed']}`)
    expect(status(en.cardReset).textContent).toBe('')
    expect(resetBtn(en.resetAll)).toBeEnabled()
    expect(resetAppData).toHaveBeenCalledTimes(1)
  })

  it('TC-303(ko · settings.io · 응답 → 이벤트 — 응답이 이벤트를 앞지른 경우): 실패 → 오류 줄 = core message(재시도 안내 없음 — 알려진 한계), 실패 뒤 이벤트·두 번째 settings://changed 를 같은 구독으로 반영', async () => {
    setupApp()
    await mountApp()
    const subs = subCounts()
    const d = confirmWithDeferred()
    await act(async () => {
      d.reject({ code: 'settings.io', message: SETTINGS_IO_MSG })
    })
    expect(screen.getByRole('alert').textContent).toBe(`${ko.errorPrefix} ${SETTINGS_IO_MSG}`)
    expect(status().textContent).toBe('')
    expect(generalValues()).toEqual(CUSTOM_VALUES)
    act(() => emitSettings(RESET))
    expect(generalValues()).toEqual(RESET_VALUES)
    act(() => emitSettings({ ...RESET, idleSeconds: 600 })) // 계약 §5.10 부분 실패 때 오는 두 번째 스냅숏
    expect(generalValues()).toEqual({ ...RESET_VALUES, idle: '10' })
    expect(subCounts()).toEqual(subs)
    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(resetAppData).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-303(ko · settings.io · 이벤트 → 응답 — 계약 §5.10 순서): pending 중 settings·assets 가 먼저 와서 값이 RESET_VALUES 여도 버튼 비활성·상태 줄 pending 유지, reject 뒤 오류 줄 + 받은 값 그대로·상태 줄 빈 문자열·버튼 활성·포커스 복귀', async () => {
    setupApp()
    await mountApp()
    const subs = subCounts()
    const d = confirmWithDeferred()
    emitInOrder(['settings', 'assets'])
    expectPending() // 값이 먼저 바뀌어도 응답 전까지 pending(§7.6)
    expect(screen.queryByRole('alert')).toBeNull()
    await act(async () => {
      d.reject({ code: 'settings.io', message: SETTINGS_IO_MSG })
    })
    expect(screen.getByRole('alert').textContent).toBe(`${ko.errorPrefix} ${SETTINGS_IO_MSG}`)
    expect(generalValues()).toEqual(RESET_VALUES) // 실패 응답이 받은 스냅숏을 되돌리지 않는다
    expect(status().textContent).toBe('')
    expect(resetBtn()).toBeEnabled()
    expect(resetBtn()).not.toHaveAttribute('aria-busy')
    expect(resetBtn()).toHaveFocus()
    expect(subCounts()).toEqual(subs)
    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
    expect(resetAppData).toHaveBeenCalledTimes(1)
    expectNoOtherBridge()
  })

  it.each([{ outcome: 'reject' }, { outcome: 'resolve' }] as const)(
    'TC-304($outcome): pending 중 다른 탭으로 옮겨 카드가 언마운트돼도 결과는 창 공통 오류 줄로 가고(실패만), 기본 설정 탭으로 돌아오면 카드는 초기값(상태 줄 빈 문자열·버튼 활성)',
    async ({ outcome }) => {
      setupApp()
      await mountApp()
      const d = confirmWithDeferred()
      expectPending()
      openImagesTab() // general-tab §7.2 — GeneralTab 과 함께 ResetAllCard 언마운트
      expect(tabOf('이미지 설정').getAttribute('aria-selected')).toBe('true')
      expect(screen.queryByRole('region', { name: KO.card })).toBeNull()
      await act(async () => {
        if (outcome === 'reject') d.reject({ code: 'reset.io', message: CORE_IO })
        else d.resolve()
      })
      if (outcome === 'reject') {
        expect(screen.getByRole('alert').textContent).toBe(`${ko.errorPrefix} ${CORE_IO}`) // 규범: 반드시 보인다
      } else {
        expect(screen.queryByRole('alert')).toBeNull()
      }
      expect(tabOf('이미지 설정').getAttribute('aria-selected')).toBe('true') // 탭을 옮기지 않는다
      expect(h1Texts()).toEqual(['이미지 설정'])
      expect(resetAppData).toHaveBeenCalledTimes(1)
      // 복귀 — 카드는 보존하지 않고 초기값(§7.2 규범)
      selectTab('기본 설정')
      expect(generalTabSelected()).toBe('true')
      expect(status().textContent).toBe('') // pending·done 문구 없음
      expect(resetBtn()).toBeEnabled()
      expect(resetBtn()).not.toHaveAttribute('aria-busy')
      expect(dialog()).toBeNull()
      expect(resetAppData).toHaveBeenCalledTimes(1) // 복귀가 호출을 만들지 않는다
      expect(getSettings).toHaveBeenCalledTimes(1)
      expectNoOtherBridge()
    },
  )
})

// ─── TC-FLOW (S-30) ─────────────────────────────────────────────────────────
/** respond: 'first' = 응답이 이벤트를 앞지른 경우 · 'last' = 계약 §5.10 순서(이벤트 2·3단계가 반환 전에 나감) */
const FLOW31_CASES: { label: string; respond: 'first' | 'last'; events: readonly Ev[] }[] = [
  { label: '응답 → settings → assets', respond: 'first', events: ['settings', 'assets'] },
  { label: '응답 → assets → settings', respond: 'first', events: ['assets', 'settings'] },
  { label: 'settings → assets → 응답(계약 순서)', respond: 'last', events: ['settings', 'assets'] },
]

describe('TC-FLOW — S-30 전체 초기화 (R-56)', () => {
  it.each(FLOW31_CASES)(
    'TC-FLOW-31($label): 이것저것 바꾼 상태 → 「전체 초기화」 → 확인 → 응답·이벤트 두 개 → 기본 설정 탭·이미지 탭이 기본값, 최종 화면은 순서와 무관',
    async ({ respond, events }) => {
      setupApp()
      await mountApp()
      // Step TC-293(렌더 부분)
      expect(screen.getByRole('region', { name: '기본 설정' }).lastElementChild).toBe(card())
      expect(status().textContent).toBe('')
      expect(generalValues()).toEqual(CUSTOM_VALUES)
      // Step TC-294(열기 부분)
      const d = deferred<void>()
      vi.mocked(resetAppData).mockReturnValue(d.promise)
      openDialog()
      expect(screen.getByRole('alertdialog')).toHaveAccessibleName(KO.title)
      expect(within(screen.getByRole('alertdialog')).getByRole('button', { name: KO.cancel })).toHaveFocus()
      // Step TC-296(확인 부분)
      clickInDialog(KO.ok)
      expectPending()
      if (respond === 'last') {
        // Step TC-303 ③과 같은 순서 — pending 중 값이 먼저 RESET_VALUES 가 돼도 pending 유지
        emitInOrder(events)
        expect(generalValues()).toEqual(RESET_VALUES)
        expectPending()
      }
      await act(async () => {
        d.resolve()
      })
      // Step TC-296(해결 부분) → TC-299 ③(해결 뒤 포커스 부분)
      expect(status().textContent).toBe(KO.done)
      expect(resetBtn()).toBeEnabled()
      expect(resetBtn()).not.toHaveAttribute('aria-busy')
      expect(resetBtn()).toHaveFocus()
      if (respond === 'first') {
        // Step TC-302(구독으로만 갱신 — 응답이 이벤트를 앞지른 경우: 이벤트 전에는 값 불변)
        expect(generalValues()).toEqual(CUSTOM_VALUES)
        emitInOrder(events)
      }
      // 최종 화면 — 세 사례 동일
      expect(generalValues()).toEqual(RESET_VALUES)
      expect(status().textContent).toBe(KO.done)
      expect(h1Texts()).toEqual(['기본 설정'])
      openImagesTab()
      const srcs = imageSrcs()
      expect(srcs.filter(s => s?.endsWith('?v=c'))).toEqual([])
      for (const u of defaultUrls()) expect(srcs).toContain(u)
      expect(resetAppData).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('alert')).toBeNull() // SettingsApp 의 onError 는 mock 이 아니다 — 오류 줄로 판정
      expectNoOtherBridge()
    },
  )

  it.each([
    { label: '응답 → assets → settings', respond: 'first' },
    { label: 'settings → assets → 응답(계약 순서)', respond: 'last' },
  ] as const)(
    'TC-FLOW-32($label): 실패 분기 — 확인 → reset.io(core 원문) → 오류 줄·상태 줄 빈 문자열·버튼 활성·포커스 → core 가 보낸 두 이벤트로 디스크 상태 표시',
    async ({ respond }) => {
      setupApp()
      await mountApp()
      // Step TC-293 → TC-294
      expect(status().textContent).toBe('')
      const d = deferred<void>()
      vi.mocked(resetAppData).mockReturnValue(d.promise)
      openDialog()
      expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(KO.message)
      // Step TC-297(reset.io 부분)
      clickInDialog(KO.ok)
      expectPending()
      if (respond === 'last') {
        // Step TC-303 ③ — 계약 §5.10 ⑤(표식 기록) 실패와 같은 모양: 초기화 뒤 값이 먼저 오고 reset.io 응답
        emitInOrder(['settings', 'assets'])
        expectPending()
      }
      await act(async () => {
        d.reject({ code: 'reset.io', message: CORE_IO })
      })
      expect(screen.getByRole('alert').textContent).toBe(`${ko.errorPrefix} ${CORE_IO}`)
      expect(status().textContent).toBe('')
      expect(resetBtn()).toBeEnabled()
      expect(resetBtn()).not.toHaveAttribute('aria-busy')
      expect(resetBtn()).toHaveFocus()
      if (respond === 'first') {
        expect(generalValues()).toEqual(CUSTOM_VALUES)
        // Step TC-303(실패해도 오는 이벤트 부분) — 순서 비의존
        emitInOrder(['assets', 'settings'])
      }
      expect(generalValues()).toEqual(RESET_VALUES)
      openImagesTab()
      for (const u of defaultUrls()) expect(imageSrcs()).toContain(u)
      expect(resetAppData).toHaveBeenCalledTimes(1)
      expect(getSettings).toHaveBeenCalledTimes(1)
      expect(getAssetManifest).toHaveBeenCalledTimes(1)
      expectNoOtherBridge()
    },
  )
})
