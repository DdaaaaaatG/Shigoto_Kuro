/**
 * settings 화면 진입(SettingsApp) 스펙 + 사용자 시나리오 흐름(TC-FLOW).
 * 기준: src/settings/design.md §1·§2·§4·§5.3·§6·§7·§9 · design/general-tab.md · design/images-tab.md · design/i18n.md
 *       · scenarios.md TC-031 ~ TC-039(CR-028 개정), TC-076 · TC-077, TC-099 ~ TC-103, TC-FLOW-01 ~ TC-FLOW-06(개정),
 *       TC-FLOW-08 ~ TC-FLOW-13(CR-028 신규). TC-040 ~ TC-043(임시 자리표시 탭)은 CR-028 로 폐기 — 사례 삭제.
 *       (CR-031, requirements v1.8 R-27) 세로 메뉴: TC-031 · TC-032 · TC-099 · TC-100 · TC-101 · TC-FLOW-03 개정,
 *       TC-153 ~ TC-156 신규(역할·로빙 tabindex · 아이콘 aria-hidden·TabIcon · h1·오류 줄 위치 · 세로 탭 키보드).
 *       도우미는 tablist 안 tab 역할로 조회(옛 navigation·button·aria-pressed 폐기).
 * bridge 는 mock(vi.mock('bridge/commands')·vi.mock('bridge/events')) — 실제 Tauri API 를 부르지 않는다.
 * 이벤트는 구독 콜백을 붙잡아 두었다가 emit 함수로 흉내 낸다.
 * 포인터(TC-FLOW-05): MousePartsTab.test.tsx 와 같은 jsdom 보강(PointerEvent stub · 포인터 캡처 stub · rect 0).
 * 선행: bridge v0.14 소스 반영(language·positionLock·showInTaskbar·resetOverlayPosition·setSettingsWindowTitle·
 *       pickPngFile(title?)) + CR-028 화면 — scenarios.md 각 TC 「선행」.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { AssetEntry, AssetManifest, BridgeError, MouseSettings, Settings } from 'bridge/types'
import { DEFAULT_TIMER_SETTINGS } from 'bridge/types'
import {
  getAssetManifest,
  getSettings,
  importAsset,
  pickPngFile,
  removeAsset,
  resetOverlayPosition,
  setAutostart,
  setSettings,
  setSettingsWindowTitle,
} from 'bridge/commands'
import { onAssetsChanged, onSettingsChanged } from 'bridge/events'
import SettingsApp from '../index'
import { ja } from '../i18n/ja'
import { en } from '../i18n/en'

const h = vi.hoisted(() => ({ getHandAnchor: vi.fn(), onHandAnchorChanged: vi.fn() }))

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
    resetOverlayPosition: vi.fn(), // v0.14 신규
    setSettingsWindowTitle: vi.fn(), // v0.14 신규
    getHandAnchor: h.getHandAnchor, // 이 화면은 호출하지 않는다(design §7)
    resetAppData: vi.fn(), // CR-054(contract v0.25 §5.10) — 기본 설정 탭 「전체 초기화」. 흐름 단언은 ResetAllCard.test.tsx
    // (CR-045, contract v0.21) 메뉴 4번째 「타이머」를 지나가는 TC(TC-153·TC-156·TC-099)가 TimerTab 을 마운트한다.
    // 공용 훅이 부르는 래퍼 — resetAllMocks 에 지워지지 않게 일반 함수로 둔다(호출 단언은 SettingsApp.timer.test.tsx).
    getTimer: async () => ({ status: 'stopped', elapsedMs: 0 }),
    controlTimer: async () => ({ status: 'stopped', elapsedMs: 0 }),
    // (CR-050, contract v0.23) TimerTab 안 AlarmSoundCard 가 마운트 때 조회한다 — 같은 이유로 일반 함수(호출 단언은
    // AlarmSoundCard.test.tsx·SettingsApp.timer.test.tsx). null = 기본 알림음.
    getAlarmSound: async () => null,
    importAlarmSound: async () => ({ format: 'wav', bytes: 1024, url: 'asset://alarm.wav' }),
    removeAlarmSound: async () => undefined,
    pickAudioFile: async () => null,
    // (CR-064, contract v0.30 §5.11) 메뉴 다섯째 「프리셋」을 지나가는 TC(TC-099·TC-153·TC-156·TC-351)가 PresetsTab 을
    // 마운트한다 — 마운트 때 listPresets 1회. 같은 이유로 일반 함수(빈 목록). 호출·흐름 단언은 PresetsTab.test.tsx
    listPresets: async () => [],
    savePreset: async () => ({ id: 'x', name: 'x', savedAt: 0, imageCount: 0, hasAlarm: false }),
    applyPreset: async () => undefined,
    exportPreset: async () => ({ folderName: 'x' }),
    importPreset: async () => ({ preset: null, problems: [] }),
    renamePreset: async () => ({ id: 'x', name: 'x', savedAt: 0, imageCount: 0, hasAlarm: false }),
    deletePreset: async () => undefined,
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
    timerChanged: 'timer://changed', // v0.21(CR-045)
  },
  onKeyboard: vi.fn(),
  onMouseMove: vi.fn(),
  onMouseButton: vi.fn(),
  onSettingsChanged: vi.fn(),
  onAssetsChanged: vi.fn(),
  onHandAnchorChanged: h.onHandAnchorChanged, // 이 화면은 구독하지 않는다(design §7)
  onTimerChanged: async () => () => {}, // v0.21(CR-045) — 위 getTimer 와 같은 이유로 일반 함수
}))

// ─── jsdom 포인터 보강 (MousePartsTab.test.tsx 와 같음) ─────────────────────
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number
    readonly pointerType: string
    readonly isPrimary: boolean
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.pointerType = init.pointerType ?? 'mouse'
      this.isPrimary = init.isPrimary ?? true
    }
  }
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: PointerEventStub,
  })
}

let capture: { set: Mock; release: Mock; has: Mock }
const installPointerCapture = () => {
  const held = new Set<number>()
  capture = {
    set: vi.fn((id: number) => {
      held.add(id)
    }),
    release: vi.fn((id: number) => {
      held.delete(id)
    }),
    has: vi.fn((id: number) => held.has(id)),
  }
  const methods: [string, Mock][] = [
    ['setPointerCapture', capture.set],
    ['releasePointerCapture', capture.release],
    ['hasPointerCapture', capture.has],
  ]
  for (const [name, fn] of methods) {
    Object.defineProperty(Element.prototype, name, { configurable: true, writable: true, value: fn })
  }
}

// ─── 픽스처 ────────────────────────────────────────────────────────────────
const CANVAS = { width: 900, height: 700 }
/** CR-018: 저장된 이동 영역 · core 기본 이동 영역(손 기준점 435,575 중심) · 네 번 클릭으로 찍는 영역 */
const AREA: MouseSettings['area'] = [
  { x: 200, y: 500 },
  { x: 300, y: 500 },
  { x: 300, y: 560 },
  { x: 200, y: 560 },
]
const DEFAULT_AREA: MouseSettings['area'] = [
  { x: 375, y: 525 },
  { x: 495, y: 525 },
  { x: 495, y: 625 },
  { x: 375, y: 625 },
]
const NEW_AREA: MouseSettings['area'] = [
  { x: 100, y: 400 },
  { x: 800, y: 400 },
  { x: 800, y: 650 },
  { x: 100, y: 650 },
]
const MOUSE: MouseSettings = {
  shoulder: { x: 600, y: 480 },
  area: AREA,
  hand: { x: 400, y: 560 },
  partPos: { x: 100, y: 200 },
  penPos: null, // CR-026: 펜 손 위치 미지정 = 기본 위치 규칙
  penMode: false, // CR-033(contract v0.15 §3.3): 펜 손 사용 기본 꺼짐
}
/** CR-028(contract v0.14): language·positionLock·showInTaskbar 필수 필드 */
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
/** R-17 · R-18: area = core 기본값, penPos = null(CR-026), pad·팔 필드 없음 */
/**
 * MOUSE(penMode false)에서 리셋한 기대값. CR-044 🔒(확정사항 §6 2차 교체·contract v0.20): shoulder (582,484)·
 * partPos (411,464)·penPos (372,476) — CR-038 (558,500)·(389,492)·(356,504), 그 전 (620,530)·(389,492)·(380,496).
 * bridge 기본 penMode 는 CR-038 부터 true(CR-044 불변)지만 리셋은 현재 값을 유지(CR-033 결정 ①)하므로 여기서는 false.
 */
const DEFAULT_MOUSE_EXPECTED: MouseSettings = {
  shoulder: { x: 582, y: 484 },
  area: DEFAULT_AREA,
  hand: null,
  partPos: { x: 411, y: 464 },
  penPos: { x: 372, y: 476 }, // CR-035(contract v0.16 DA-07, U-2 = B): 리셋 기대값 — 옛 R-18 「리셋은 null」 대체
  penMode: false, // CR-033: 리셋은 penMode 를 현재 값으로 유지 — MOUSE.penMode 가 false 라 기대값도 false
}
const AREA_SAVED: Settings = { ...SETTINGS, mouse: { ...MOUSE, area: NEW_AREA } }
const entry = (slot: string, width: number, height: number, v = ''): AssetEntry => ({
  slot: slot as AssetEntry['slot'],
  fileName: `${slot}.png`,
  width,
  height,
  bytes: 1000,
  url: `asset://${slot}.png${v}`,
})
const BODY = entry('body', 900, 700)
const KB_UP = entry('kb_up', 900, 700)
const PART = entry('mouse_base', 200, 150)
/** 기본 로드 값: 몸통 + 작은 손 그림 200×150 */
const HAND: AssetManifest = { canvas: CANVAS, entries: [BODY, PART] }
const KB_HAND: AssetManifest = { canvas: CANVAS, entries: [KB_UP, PART] }
const EMPTY: AssetManifest = { canvas: null, entries: [] }

const MOUSE_TAB = '어깨축·손 위치' // CR-028(옛 「마우스 파츠」)
const G_IDLE = '어깨축을 설정하면 팔 파츠가 그 점을 축으로 회전합니다.'
/** CR-057(🔒 ko 확정 문구): 이동 영역 시작 버튼 — 옛 「이동 영역 설정하기」 */
const AREA_START = '사각형 이동 영역 설정'
const G_PICK = '축이 될 부분을 마우스로 클릭해주세요.'
const G_REVIEW = '축 위치를 확인하고 저장하세요.'
const NO_BASE = '캐릭터 이미지(kb_up)가 등록되지 않았습니다.'
const TITLE_KO = 'kuro_keyviewer 설정'

// ─── 이벤트 흉내 ───────────────────────────────────────────────────────────
let emitSettings: (s: Settings) => void = () => {}
let emitAssets: (m: AssetManifest) => void = () => {}
const unlistenSettings = vi.fn()
const unlistenAssets = vi.fn()

beforeEach(() => {
  vi.resetAllMocks()
  installPointerCapture()
  document.documentElement.lang = ''
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(HAND)
  vi.mocked(setSettingsWindowTitle).mockResolvedValue(undefined)
  vi.mocked(onSettingsChanged).mockImplementation(cb => {
    emitSettings = cb
    return Promise.resolve(unlistenSettings)
  })
  vi.mocked(onAssetsChanged).mockImplementation(cb => {
    emitAssets = cb
    return Promise.resolve(unlistenAssets)
  })
})

// ─── 도우미 ────────────────────────────────────────────────────────────────
const mount = async () => {
  const utils = render(<SettingsApp />)
  await waitFor(() => {
    expect(getSettings).toHaveBeenCalled()
    expect(getAssetManifest).toHaveBeenCalled()
  })
  await act(async () => {})
  return utils
}
// (CR-031) 세로 메뉴 = role="tablist"(aria-label = t.tabsAria, aria-orientation="vertical") · 항목 role="tab"
// (aria-selected · 로빙 tabindex). 옛 navigation · button · aria-pressed 조회는 폐기. 문구는 i18n 사전 그대로(새 문구 없음).
const tablist = (name = '설정 탭') => screen.getByRole('tablist', { name })
const allTabs = (listName?: string) => within(tablist(listName)).getAllByRole('tab')
const tabBtn = (name: string, listName?: string) => within(tablist(listName)).getByRole('tab', { name })
const tabTexts = (listName?: string) => allTabs(listName).map(b => b.textContent)
const selected = (listName?: string) => allTabs(listName).map(b => b.getAttribute('aria-selected'))
const tabIndexes = (listName?: string) => allTabs(listName).map(b => b.getAttribute('tabindex'))
const h1Texts = () => screen.queryAllByRole('heading', { level: 1 }).map(h => h.textContent)
const panel = () => screen.getByRole('tabpanel')
// (CR-045, R-44·R-27 용어 주 ①) 메뉴 4항목 — 4번째 「타이머」. 타이머 탭 본문도 region(X-1 메인 결정 2026-09-26)
const TIMER_TAB = '타이머'
// (CR-064, R-66·R-27 용어 주 ②) 메뉴 5항목 — 다섯째(맨 끝) 「프리셋」
const PRESETS_TAB = '프리셋'
const tabNames = () => ['기본 설정', '이미지 설정', MOUSE_TAB, TIMER_TAB, PRESETS_TAB]
const openPresetsTab = () => fireEvent.click(tabBtn(PRESETS_TAB))
const openTimerTab = () => fireEvent.click(tabBtn(TIMER_TAB))
const openMouseTab = () => fireEvent.click(tabBtn(MOUSE_TAB))
const openImagesTab = () => fireEvent.click(tabBtn('이미지 설정'))
const btn = (name: string) => screen.getByRole('button', { name })
const preview = () => screen.getByTestId('mouse-preview')
const srcs = () => Array.from(preview().querySelectorAll('img')).map(i => i.getAttribute('src'))
const handImg = () => preview().querySelector<HTMLImageElement>('img[src="asset://mouse_base.png"]')
/**
 * 패드 박스 = 미리보기 안 aria-hidden span. CR-040(R-38): 팔·펜 손 영역 상자(PartOutline, data-testid outline-arm/pen)도
 * aria-hidden span 이라 판정에서 뺀다(scenarios.md v15 개정 — TC-035·TC-037·TC-FLOW-02 기대 불변).
 */
const padBox = () => preview().querySelector('span[aria-hidden="true"]:not([data-testid^="outline-"])')
const guide = () => screen.getByRole('status')
const marker = (x: number, y: number) => screen.getByRole('img', { name: `축(어깨) (${x}, ${y})` })
const shoulderDd = () => screen.getByText('축(어깨)', { selector: 'dt' }).nextElementSibling
const partDd = () => screen.getByText('파츠 위치', { selector: 'dt' }).nextElementSibling
const alertText = () => screen.getByRole('alert').textContent
const titles = () => vi.mocked(setSettingsWindowTitle).mock.calls.map(c => c[0])
const noticeText = (c: HTMLElement) => c.querySelector('p[role="status"]')?.textContent
const outputText = (c: HTMLElement) => c.querySelector('output')?.textContent

const PID = 7
const down = (clientX: number, clientY: number) =>
  fireEvent.pointerDown(preview(), { clientX, clientY, button: 0, pointerId: PID })
const move = (clientX: number, clientY: number) =>
  fireEvent.pointerMove(preview(), { clientX, clientY, pointerId: PID })
const up = (clientX: number, clientY: number) =>
  fireEvent.pointerUp(preview(), { clientX, clientY, button: 0, pointerId: PID })

const expectNoUnusedBridge = () => {
  expect(importAsset).not.toHaveBeenCalled()
  expect(removeAsset).not.toHaveBeenCalled()
  expect(setAutostart).not.toHaveBeenCalled()
  expect(pickPngFile).not.toHaveBeenCalled()
  expect(resetOverlayPosition).not.toHaveBeenCalled()
  expect(h.getHandAnchor).not.toHaveBeenCalled()
  expect(h.onHandAnchorChanged).not.toHaveBeenCalled()
}

// ─── R-01·R-19·R-20 창·탭 ───────────────────────────────────────────────────
describe('SettingsApp — 창 열기·탭 (R-01·R-19·R-20)', () => {
  it('TC-031: 마운트 시 설정·매니페스트를 한 번씩 읽고, 왼쪽 세로 메뉴 3항목·기본 탭 「기본 설정」·섹션 제목 h1 = 「기본 설정」, 창 제목·<html lang> 설정', async () => {
    await mount()
    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(getSettings).toHaveBeenCalledWith()
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
    expect(getAssetManifest).toHaveBeenCalledWith()
    expect(onSettingsChanged).toHaveBeenCalledTimes(1)
    expect(onAssetsChanged).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(tablist()).toHaveAttribute('aria-orientation', 'vertical')
    expect(tabTexts()).toEqual(tabNames())
    expect(selected()).toEqual(['true', 'false', 'false', 'false', 'false']) // CR-064: 5항목(옛 CR-045 4항목)
    for (const t of allTabs()) {
      expect(t).toHaveAttribute('type', 'button')
      expect(t).not.toHaveAttribute('aria-pressed')
    }
    expect(h1Texts()).toEqual(['기본 설정'])
    expect(screen.getByRole('region', { name: '기본 설정' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.documentElement.lang).toBe('ko')
    expect(setSettingsWindowTitle).toHaveBeenCalledTimes(1)
    expect(setSettingsWindowTitle).toHaveBeenCalledWith(TITLE_KO)
    expect(setSettings).not.toHaveBeenCalled()
    expectNoUnusedBridge()
  })

  it('TC-032: 세로 메뉴 항목 클릭으로 본문·섹션 제목이 바뀌고 aria-selected·tabindex 가 따라간다, 탭 전환은 bridge 를 부르지 않는다', async () => {
    await mount()
    openMouseTab()
    expect(selected()).toEqual(['false', 'false', 'true', 'false', 'false']) // CR-064: 5항목(옛 CR-045 4항목)
    expect(tabIndexes()).toEqual(['-1', '-1', '0', '-1', '-1'])
    expect(h1Texts()).toEqual([MOUSE_TAB])
    expect(screen.getByRole('region', { name: MOUSE_TAB })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '기본 설정' })).toBeNull()
    // CR-045: 타이머 탭 — h1 = 「타이머」, 다른 탭 본문 없음
    openTimerTab()
    expect(selected()).toEqual(['false', 'false', 'false', 'true', 'false'])
    expect(tabIndexes()).toEqual(['-1', '-1', '-1', '0', '-1'])
    expect(h1Texts()).toEqual([TIMER_TAB])
    expect(screen.queryByRole('region', { name: MOUSE_TAB })).toBeNull()
    // CR-064: 프리셋 탭 — h1 = 「프리셋」, 다른 탭 본문 없음
    openPresetsTab()
    expect(selected()).toEqual(['false', 'false', 'false', 'false', 'true'])
    expect(tabIndexes()).toEqual(['-1', '-1', '-1', '-1', '0'])
    expect(h1Texts()).toEqual([PRESETS_TAB])
    expect(screen.queryByRole('region', { name: TIMER_TAB })).toBeNull()
    openImagesTab()
    expect(selected()).toEqual(['false', 'true', 'false', 'false', 'false'])
    expect(h1Texts()).toEqual(['이미지 설정'])
    expect(screen.getByRole('region', { name: '이미지 설정' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: MOUSE_TAB })).toBeNull()
    fireEvent.click(tabBtn('기본 설정'))
    expect(screen.getByRole('region', { name: '기본 설정' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '이미지 설정' })).toBeNull()
    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })

  // CR-039: 초기 조회가 끝내 실패하는 마운트(TC-033·TC-034·TC-155 공용). 실패하면 200·500·1000ms 간격으로
  // 최대 3회 재시도하고 그 뒤에만 오류 줄이 뜬다(약 1.7초). RTL waitFor 는 vitest 가짜 setTimeout 과 함께 쓰면
  // 멈추므로 가짜 시계 구간에서는 render + microtask flush 만 쓰고, 재시도를 모두 진행한 뒤 진짜 시계로 돌린다.
  const mountUntilGaveUp = async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const utils = render(<SettingsApp />)
      const flushMicro = () =>
        act(async () => {
          for (let i = 0; i < 10; i++) await Promise.resolve()
        })
      await flushMicro()
      for (const ms of [200, 500, 1_000]) {
        expect(screen.queryByRole('alert')).toBeNull() // 끝내 실패하기 전에는 오류 줄 없음
        await act(async () => {
          vi.advanceTimersByTime(ms)
        })
        await flushMicro()
      }
      return utils
    } finally {
      vi.useRealTimers()
    }
  }

  it('TC-033 (CR-038·CR-039·CR-044 개정): get_settings 실패 → 재시도 3회 뒤 오류 줄 「오류: {message}」, settings 는 초기값(DEFAULT_SETTINGS) 유지', async () => {
    const err: BridgeError = { code: 'settings.io', message: '설정 파일을 읽지 못했습니다.' }
    vi.mocked(getSettings).mockRejectedValue(err)
    await mountUntilGaveUp()
    await waitFor(() => expect(alertText()).toBe('오류: 설정 파일을 읽지 못했습니다.'))
    openMouseTab()
    expect(marker(582, 484)).toBeInTheDocument() // CR-044: 기본 축(CR-038 (558,500) · 옛 (620,530))
    expect(getSettings).toHaveBeenCalledTimes(4) // CR-039: 최초 1회 + 재시도 3회
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
    expect(document.documentElement.lang).toBe('ko')
  })

  it('TC-034 (CR-039 개정): get_asset_manifest 실패 → 재시도 3회 뒤 오류 줄, manifest 는 빈 초기값(미리보기 빈 상태 문구)', async () => {
    const err: BridgeError = { code: 'asset.manifest', message: '이미지 목록을 읽지 못했습니다.' }
    vi.mocked(getAssetManifest).mockRejectedValue(err)
    await mountUntilGaveUp()
    await waitFor(() => expect(alertText()).toBe('오류: 이미지 목록을 읽지 못했습니다.'))
    openMouseTab()
    expect(within(preview()).getByText(NO_BASE)).toBeInTheDocument()
    expect(preview().querySelectorAll('img')).toHaveLength(0)
    expect(preview()).toHaveStyle({ width: '450px', height: '350px' })
    expect(await screen.findByRole('img', { name: '축(어깨) (600, 480)' })).toBeInTheDocument()
    expect(getAssetManifest).toHaveBeenCalledTimes(4) // CR-039: 최초 1회 + 재시도 3회
    expect(getSettings).toHaveBeenCalledTimes(1)
  })

  // ─── CR-031 세로 메뉴 (R-27) ───────────────────────────────────────────────
  it('TC-153: 세로 메뉴 = aside 안 tablist(vertical) · 항목 tab(id·aria-controls) · tabpanel(id·aria-labelledby, main 안 1개) · 로빙 tabindex', async () => {
    await mount()
    expect(tablist().closest('aside')).not.toBeNull()
    expect(tablist()).toHaveAttribute('aria-orientation', 'vertical')
    const ids = ['general', 'images', 'mouse', 'timer', 'presets'] // CR-045: 4번째 timer · CR-064: 5번째 presets
    expect(allTabs()).toHaveLength(5)
    allTabs().forEach((t, i) => {
      expect(t.tagName).toBe('BUTTON')
      expect(t).toHaveAttribute('id', `settings-tab-${ids[i]}`)
      expect(t).toHaveAttribute('aria-controls', `settings-panel-${ids[i]}`)
    })
    const expectPanel = (i: number) => {
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
      expect(panel()).toHaveAttribute('id', `settings-panel-${ids[i]}`)
      expect(panel()).toHaveAttribute('aria-labelledby', `settings-tab-${ids[i]}`)
      expect(panel()).toHaveAccessibleName(tabNames()[i])
      expect(panel().closest('main')).not.toBeNull()
      expect(tabIndexes()).toEqual([0, 1, 2, 3, 4].map(j => (j === i ? '0' : '-1')))
    }
    expectPanel(0)
    openImagesTab()
    expectPanel(1)
    openMouseTab()
    expectPanel(2)
    openTimerTab()
    expectPanel(3)
    openPresetsTab() // CR-064
    expectPanel(4)
    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-154 (CR-045 개정): 메뉴 아이콘 = 항목마다 인라인 svg 1개(aria-hidden·focusable=false), 이름은 글자만 · TabIcon 단독 모양 4종(timer = 스톱워치)', async () => {
    await mount()
    for (const t of allTabs()) {
      const svgs = t.querySelectorAll('svg')
      expect(svgs).toHaveLength(1)
      expect(svgs[0]).toHaveAttribute('aria-hidden', 'true')
      expect(svgs[0]).toHaveAttribute('focusable', 'false')
      expect(t).toHaveAccessibleName(t.textContent ?? '')
    }
    expect(tabBtn('기본 설정')).toHaveAccessibleName('기본 설정')
    expect(document.querySelectorAll('aside img')).toHaveLength(0)
    const { default: TabIcon } = await import('../components/TabIcon')
    const shape = (name: 'general' | 'images' | 'mouse' | 'timer' | 'presets') => {
      const { container, unmount } = render(<TabIcon name={name} className="icon-x" />)
      const svg = container.querySelector('svg') as SVGSVGElement
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
      expect(svg).toHaveAttribute('width', '18')
      expect(svg).toHaveAttribute('height', '18')
      expect(svg).toHaveAttribute('fill', 'none')
      expect(svg).toHaveAttribute('stroke', 'currentColor')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
      expect(svg).toHaveAttribute('focusable', 'false')
      expect(svg.getAttribute('class') ?? '').toContain('icon-x')
      const kids = Array.from(svg.children).map(c => c.tagName.toLowerCase())
      unmount()
      return kids
    }
    expect(shape('general')).toEqual(['path', 'circle', 'circle'])
    expect(shape('images')).toEqual(['rect', 'circle', 'path'])
    expect(shape('mouse')).toEqual(['circle', 'path'])
    // CR-045(timer-tab §2 TabIcon): 스톱워치 = circle(12,13,r8) · path 바늘 · path 꼭지
    expect(shape('timer')).toEqual(['circle', 'path', 'path'])
    // CR-064(presets-tab §2.4): 겹친 카드 두 장 = rect · path(속성 값 단언은 TC-351)
    expect(shape('presets')).toEqual(['rect', 'path'])
    {
      const { container, unmount } = render(<TabIcon name="timer" />)
      const svg = container.querySelector('svg') as SVGSVGElement
      const c = svg.querySelector('circle') as SVGCircleElement
      expect([c.getAttribute('cx'), c.getAttribute('cy'), c.getAttribute('r')]).toEqual(['12', '13', '8'])
      expect(Array.from(svg.querySelectorAll('path')).map(p => p.getAttribute('d'))).toEqual([
        'M12 9v4l2.5 2.5',
        'M10 2h4M12 2v3',
      ])
      expect(svg).toHaveAttribute('stroke-width', '2')
      unmount()
    }
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-155: 섹션 제목 h1 = 선택 탭 이름(제품명·새 문구 없음)·탭 패널 첫 자식, 오류 줄(role=alert)은 h1 바로 다음·탭 본문 앞 — 탭을 바꿔도 같은 자리', async () => {
    const err: BridgeError = { code: 'settings.io', message: '설정 파일을 읽지 못했습니다.' }
    vi.mocked(getSettings).mockRejectedValue(err)
    await mountUntilGaveUp() // CR-039: 오류 줄은 재시도 3회(약 1.7초) 뒤
    await waitFor(() => expect(alertText()).toBe('오류: 설정 파일을 읽지 못했습니다.'))
    const check = (name: string) => {
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1.textContent).toBe(name)
      expect(h1.textContent).not.toMatch(/kuro_keyviewer/)
      expect(panel().firstElementChild).toBe(h1)
      const alert = screen.getByRole('alert')
      expect(h1.nextElementSibling).toBe(alert)
      const body = screen.getByRole('region', { name })
      expect(panel().contains(body)).toBe(true)
      expect(alert.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    check('기본 설정')
    openImagesTab()
    check('이미지 설정')
    openMouseTab()
    check(MOUSE_TAB)
    expect(getSettings).toHaveBeenCalledTimes(4) // CR-039: 최초 1회 + 재시도 3회
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-156 (CR-045 개정): 세로 탭 키보드(4항목) — ArrowDown·ArrowUp(끝에서 순환)·Home·End = 포커스 이동 + 즉시 선택(preventDefault), ArrowLeft·ArrowRight·그 밖의 키는 무반응', async () => {
    await mount()
    allTabs()[0].focus()
    const press = (key: string) => fireEvent.keyDown(document.activeElement as HTMLElement, { key })
    const expectAt = (i: number) => {
      expect(allTabs()[i]).toHaveFocus()
      expect(selected()).toEqual([0, 1, 2, 3, 4].map(j => String(j === i)))
      expect(tabIndexes()).toEqual([0, 1, 2, 3, 4].map(j => (j === i ? '0' : '-1')))
      expect(h1Texts()).toEqual([tabNames()[i]])
      expect(panel()).toHaveAccessibleName(tabNames()[i])
      // X-1 메인 결정(2026-09-26): 타이머 탭 본문도 다른 탭처럼 region(이름 = 탭 이름)
      // CR-064: 프리셋 탭 본문도 region(이름 = tabPresets) — AC-1 ui-designer 확정 예정(presets-tab §8.1 확정 대기)
      expect(screen.getByRole('region', { name: tabNames()[i] })).toBeInTheDocument()
    }
    // CR-064: 5항목 — 다섯째 = 프리셋(End · ArrowUp 처음 순환 대상)
    const steps: [string, number][] = [
      ['ArrowDown', 1],
      ['ArrowDown', 2],
      ['ArrowDown', 3],
      ['ArrowDown', 4],
      ['ArrowDown', 0],
      ['ArrowUp', 4],
      ['ArrowUp', 3],
      ['Home', 0],
      ['End', 4],
    ]
    for (const [key, at] of steps) {
      expect(press(key), key).toBe(false) // 처리한 키 = preventDefault
      expectAt(at)
    }
    for (const key of ['ArrowLeft', 'ArrowRight', 'a']) {
      expect(press(key), key).toBe(true) // 무반응 = 기본 동작도 막지 않음
      expectAt(4)
    }
    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })

  // CR-064 · R-66 · R-27(presets-tab §1.1 · §2 Shell·TabIcon · §2.4 · §4 끝 문단) — scenarios.md 「v30 개정」 절
  it('TC-351: 메뉴 5항목·다섯째 「프리셋」(id·aria-controls·선택·h1·빈 목록), 떠났다 돌아오면 탭 상태 버림, TabIcon presets = 겹친 카드 두 장', async () => {
    await mount()
    expect(tabTexts()).toEqual(['기본 설정', '이미지 설정', MOUSE_TAB, TIMER_TAB, PRESETS_TAB])
    const presets = allTabs()[4]
    expect(presets).toHaveAttribute('id', 'settings-tab-presets')
    expect(presets).toHaveAttribute('aria-controls', 'settings-panel-presets')
    openPresetsTab()
    expect(selected()).toEqual(['false', 'false', 'false', 'false', 'true'])
    expect(tabIndexes()).toEqual(['-1', '-1', '-1', '-1', '0'])
    expect(h1Texts()).toEqual([PRESETS_TAB])
    expect(panel()).toHaveAttribute('id', 'settings-panel-presets')
    expect(await screen.findByText('저장한 프리셋이 없습니다.')).toBeInTheDocument() // listPresets → []
    fireEvent.change(screen.getByRole('textbox', { name: '프리셋 이름' }), { target: { value: '고양이 A' } })
    fireEvent.click(tabBtn('기본 설정'))
    expect(screen.queryByRole('textbox', { name: '프리셋 이름' })).toBeNull()
    openPresetsTab()
    expect((screen.getByRole('textbox', { name: '프리셋 이름' }) as HTMLInputElement).value).toBe('') // 상태 버림(§4)
    const { default: TabIcon } = await import('../components/TabIcon')
    const { container } = render(<TabIcon name="presets" />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(Array.from(svg.children).map(c => c.tagName.toLowerCase())).toEqual(['rect', 'path'])
    const rect = svg.querySelector('rect') as SVGRectElement
    expect(['x', 'y', 'width', 'height', 'rx'].map(a => rect.getAttribute(a))).toEqual(['8', '3', '13', '13', '2'])
    expect(svg.querySelector('path')?.getAttribute('d')).toBe('M16 21H5a2 2 0 0 1-2-2V8')
    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-099: 금지 요소 부재 — 「동작」 탭·사이드바 검색창·배지·구분 그룹 제목·크기 4단 버튼·닫기·설명서·프리셋·흔들림·항상 위 없음, h1 은 선택 탭 이름뿐(제품명 없음)', async () => {
    await mount()
    expect(allTabs()).toHaveLength(5) // CR-045: 4번째 「타이머」 · CR-064: 5번째 「프리셋」
    expect(within(tablist()).queryByRole('tab', { name: '동작' })).toBeNull()
    const aside = tablist().closest('aside') as HTMLElement
    expect(within(aside).queryByRole('searchbox')).toBeNull()
    expect(within(aside).queryByRole('textbox')).toBeNull()
    expect(within(aside).queryAllByRole('heading')).toHaveLength(0)
    expect(aside.textContent).toBe(tabNames().join(''))
    const general = screen.getByRole('region', { name: '기본 설정' })
    // CR-054(general-tab §1 cardReset): 「전체 초기화」 추가 — 크기 4단 버튼·닫기 등 금지 요소는 여전히 없다
    expect(within(general).getAllByRole('button').map(b => b.textContent)).toEqual(['위치 초기화', '전체 초기화'])
    // CR-064: 「프리셋」은 금지 목록에서 뺐다(R-19 금지 해제 — requirements 용어 주 CR-064 ①)
    const banned = /닫기|설명서|흔들림|항상 위|변경한 설정은 바로 적용/
    const opens = [() => {}, openImagesTab, openMouseTab, openTimerTab, openPresetsTab] // CR-045 · CR-064
    opens.forEach((open, i) => {
      open()
      expect(h1Texts()).toEqual([tabNames()[i]])
      expect(document.body.textContent ?? '').not.toMatch(banned)
      expect(screen.queryByText(TITLE_KO)).toBeNull()
    })
  })

  it('TC-100 (CR-045 개정): 저장된 언어(ja)로 열면 메뉴(4항목)·섹션 제목·카드 문구·<html lang>·창 제목이 ja(첫 렌더 ko 제목 뒤 ja 로 교체), 되저장 없음', async () => {
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS, language: 'ja' })
    await mount()
    await waitFor(() =>
      expect(tabTexts(ja.tabsAria)).toEqual([ja.tabGeneral, ja.tabImages, ja.tabMouse, ja.tabTimer, ja.tabPresets]),
    )
    expect(h1Texts()).toEqual([ja.tabGeneral])
    const general = screen.getByRole('region', { name: ja.tabGeneral })
    expect(within(general).getAllByRole('heading', { level: 2 })[0].textContent).toBe(ja.cardLanguage)
    expect(document.documentElement.lang).toBe('ja')
    expect(titles()).toEqual([TITLE_KO, ja.windowTitle])
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-101 (CR-045 개정): settings://changed 로 언어가 바뀌면 재시작 없이 네 탭 문구·창 제목·lang 이 즉시 바뀌고 포커스는 그대로(되저장 없음)', async () => {
    await mount()
    const generalTab = tabBtn('기본 설정')
    generalTab.focus()
    act(() => emitSettings({ ...SETTINGS, language: 'en' }))
    expect(tabTexts(en.tabsAria)).toEqual([en.tabGeneral, en.tabImages, en.tabMouse, en.tabTimer, en.tabPresets])
    expect(generalTab).toHaveFocus()
    expect(generalTab.textContent).toBe(en.tabGeneral)
    expect(h1Texts()).toEqual([en.tabGeneral]) // CR-031 섹션 제목도 즉시 교체
    const general = screen.getByRole('region', { name: en.tabGeneral })
    expect(within(general).getAllByRole('heading', { level: 2 }).map(x => x.textContent)).toEqual([
      en.cardLanguage,
      en.cardScale,
      en.cardWindow,
      en.cardStartup,
      en.cardReset, // CR-054(i18n §4.11)
    ])
    expect(document.documentElement.lang).toBe('en')
    await waitFor(() => expect(titles().at(-1)).toBe(en.windowTitle))
    fireEvent.click(tabBtn(en.tabMouse, en.tabsAria))
    expect(screen.getByRole('region', { name: en.tabMouse })).toBeInTheDocument()
    expect(guide().textContent).toBe(en.wizardIdle)
    expect(btn(en.wizardStart)).toBeInTheDocument()
    fireEvent.click(tabBtn(en.tabImages, en.tabsAria))
    const images = screen.getByRole('region', { name: en.tabImages })
    expect(within(images).getAllByRole('heading', { level: 2 })[0].textContent).toBe(en.groupBackground)
    // CR-045: 타이머 탭 h1·카드 제목도 en
    fireEvent.click(tabBtn(en.tabTimer, en.tabsAria))
    expect(h1Texts()).toEqual([en.tabTimer])
    // CR-050(timer-tab §14.2): 카드 3장 — 뽀모도 타이머 → 알림음 → 시간 글자
    expect(screen.getAllByRole('heading', { level: 2 }).map(x => x.textContent)).toEqual([
      en.timerCardTitle,
      en.alarmCardTitle,
      en.timerTextTitle,
    ])
    act(() => emitSettings(SETTINGS))
    expect(tabTexts()).toEqual(['기본 설정', '이미지 설정', MOUSE_TAB, TIMER_TAB, PRESETS_TAB])
    expect(document.documentElement.lang).toBe('ko')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-102: 오류 줄은 현재 언어로 — ja·en 은 code 문구, ko 는 message, 언어가 바뀌면 같은 오류를 새 언어로 다시 그린다', async () => {
    const err: BridgeError = { code: 'asset.manifest', message: '매니페스트를 읽거나 쓸 수 없습니다: 손상' }
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS, language: 'ja' })
    vi.mocked(getAssetManifest).mockRejectedValue(err)
    await mount()
    // CR-039: 오류 줄은 재시도 3회(200·500·1000ms, 약 1.7초) 뒤에야 뜬다 — 기본 waitFor 1초로는 모자라 명시적 대기 3초
    await waitFor(() => expect(alertText()).toBe(`${ja.errorPrefix} ${ja.errors['asset.manifest']}`), { timeout: 3_000 })
    expect(getAssetManifest).toHaveBeenCalledTimes(4) // 최초 1회 + 재시도 3회
    act(() => emitSettings({ ...SETTINGS, language: 'en' }))
    expect(alertText()).toBe(`${en.errorPrefix} ${en.errors['asset.manifest']}`)
    act(() => emitSettings(SETTINGS))
    expect(alertText()).toBe('오류: 매니페스트를 읽거나 쓸 수 없습니다: 손상')
  })

  it('TC-103: 창 제목 설정 실패 → 오류 줄(toBridgeError 정규화 — unknown·message)', async () => {
    vi.mocked(setSettingsWindowTitle).mockRejectedValue(new Error('permission denied'))
    await mount()
    await waitFor(() => expect(alertText()).toBe('오류: permission denied'))
    expect(setSettingsWindowTitle).toHaveBeenCalledWith(TITLE_KO)
  })
})

// ─── R-12·R-11 미리보기 데이터 흐름 (어깨축·손 위치 탭) ──────────────────────────
describe('SettingsApp — 미리보기 데이터 (R-12·R-11·R-26, P-4)', () => {
  it('TC-035: 로드한 설정·매니페스트가 어깨축·손 위치 탭 미리보기·값 목록에 반영된다', async () => {
    await mount()
    openMouseTab()
    expect(marker(600, 480)).toBeInTheDocument()
    expect(shoulderDd()?.textContent).toBe('(600, 480)')
    expect(partDd()?.textContent).toBe('(100, 200)')
    expect(srcs()).toEqual(['asset://mouse_base.png', 'asset://body.png'])
    expect(handImg()).toHaveStyle({ left: '50px', top: '100px', width: '100px', height: '75px' })
    expect(padBox()).toBeNull()
  })

  it('TC-036: settings://changed 를 받으면 축·손 그림·값 목록이 바뀌고 되저장하지 않는다', async () => {
    await mount()
    openMouseTab()
    act(() =>
      emitSettings({
        ...SETTINGS,
        mouse: { ...MOUSE, shoulder: { x: 320, y: 410 }, partPos: { x: 250, y: 300 } },
      }),
    )
    expect(marker(320, 410)).toBeInTheDocument()
    expect(shoulderDd()?.textContent).toBe('(320, 410)')
    expect(handImg()).toHaveStyle({ left: '125px', top: '150px' })
    expect(partDd()?.textContent).toBe('(250, 300)')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-037: assets://changed 를 받으면 바탕(body → kb_up 대체)·손 그림 크기를 다시 계산한다(패드 박스는 계속 없음)', async () => {
    vi.mocked(getAssetManifest).mockResolvedValue(EMPTY)
    await mount()
    openMouseTab()
    expect(within(preview()).getByText(NO_BASE)).toBeInTheDocument()
    expect(srcs()).toEqual([])
    expect(padBox()).toBeNull()
    act(() => emitAssets(KB_HAND))
    expect(within(preview()).queryByText(NO_BASE)).toBeNull()
    expect(srcs()).toEqual(['asset://mouse_base.png', 'asset://kb_up.png'])
    expect(handImg()).toHaveStyle({ width: '100px', height: '75px' })
    expect(padBox()).toBeNull()
    act(() => emitAssets({ canvas: CANVAS, entries: [BODY, KB_UP, entry('mouse_base', 100, 80)] }))
    expect(srcs()).toEqual(['asset://mouse_base.png', 'asset://body.png'])
    expect(handImg()).toHaveStyle({ left: '50px', top: '100px', width: '50px', height: '40px' })
    expect(padBox()).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-039: 언마운트하면 두 이벤트 구독을 해제한다', async () => {
    const { unmount } = await mount()
    unmount()
    await waitFor(() => {
      expect(unlistenSettings).toHaveBeenCalledTimes(1)
      expect(unlistenAssets).toHaveBeenCalledTimes(1)
    })
  })
})

// ─── 저장 오류 표시 (R-10, §7) ─────────────────────────────────────────────
describe('SettingsApp — set_settings 오류 표시 (R-10, §7)', () => {
  it('TC-038: ko 에서는 code 와 무관하게 「오류: {message}」만 표시, 성공 저장이면 지운다', async () => {
    vi.mocked(setSettings)
      .mockRejectedValueOnce({ code: 'SETTINGS_INVALID', message: '배율은 25%~200% 사이여야 합니다.' })
      .mockRejectedValueOnce({ code: 'settings.io', message: '설정 파일을 저장하지 못했습니다.' })
      .mockImplementationOnce(async s => s)
    await mount()
    openMouseTab()
    fireEvent.click(btn('어깨축 설정하기'))
    fireEvent.click(preview(), { clientX: 150, clientY: 100 })
    fireEvent.click(btn('저장'))
    await waitFor(() => expect(alertText()).toBe('오류: 배율은 25%~200% 사이여야 합니다.'))
    await waitFor(() => expect(btn('저장')).toBeEnabled())
    fireEvent.click(btn('저장'))
    await waitFor(() => expect(alertText()).toBe('오류: 설정 파일을 저장하지 못했습니다.'))
    await waitFor(() => expect(btn('저장')).toBeEnabled())
    fireEvent.click(btn('저장'))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(setSettings).toHaveBeenCalledTimes(3)
    expect(guide().textContent).toBe(G_IDLE)
  })
})

// ─── 사용자 시나리오 흐름 ───────────────────────────────────────────────────
describe('TC-FLOW', () => {
  it('TC-FLOW-01: (S-1, CR-035 개정) 이미지 설정 탭 → 필수 미등록 확인 → 검증 실패 → 다시 등록 → 미리보기 → 기본값으로 되돌리기(복원)', async () => {
    const { restoreDefaultAsset } = await import('bridge/commands')
    const RESTORED: AssetManifest = { canvas: CANVAS, entries: [entry('kb_up', 900, 700, '?v=2')] }
    vi.mocked(restoreDefaultAsset).mockResolvedValue(RESTORED)
    const TOO_LARGE: BridgeError = {
      code: 'asset.too_large',
      message: '이미지가 너무 큽니다. 최대 900×700 (현재 1000×800).',
    }
    const REGISTERED: AssetManifest = { canvas: CANVAS, entries: [entry('kb_up', 900, 700, '?v=1')] }
    vi.mocked(getAssetManifest).mockResolvedValue(EMPTY)
    vi.mocked(pickPngFile).mockResolvedValue('C:\\img\\up.png')
    vi.mocked(importAsset).mockRejectedValueOnce(TOO_LARGE).mockResolvedValueOnce(REGISTERED)
    vi.mocked(removeAsset).mockResolvedValue(EMPTY)
    await mount() // TC-031(마운트 부분)
    openImagesTab() // TC-032(이미지 설정 부분)
    const upCard = () => screen.getByTestId('slot-card-kb_up')
    expect(within(upCard()).getByText('필수 · 미등록')).toBeInTheDocument() // TC-136
    const change = () => within(upCard()).getByRole('button', { name: '기본 이미지 변경' })
    fireEvent.click(change())
    await waitFor(() => expect(within(upCard()).getByRole('alert').textContent).toBe(TOO_LARGE.message)) // TC-140
    await waitFor(() => expect(change()).toBeEnabled())
    fireEvent.click(change())
    await waitFor(() => expect(importAsset).toHaveBeenCalledTimes(2)) // TC-139
    expect(importAsset).toHaveBeenLastCalledWith('kb_up', 'C:\\img\\up.png')
    expect(pickPngFile).toHaveBeenCalledWith('PNG 이미지 선택')
    await waitFor(() => expect(within(upCard()).queryByRole('alert')).toBeNull())
    act(() => emitAssets(REGISTERED))
    expect(upCard().querySelector('img')).toHaveAttribute('src', 'asset://kb_up.png?v=1')
    // CR-035(R-32): 필수 칸 kb_up 은 내장 기본 그림이 있는 칸 — 「기본값」 = 복원(비우기 없음)
    expect(within(upCard()).queryByRole('button', { name: '기본 그림 지우기' })).toBeNull()
    const reset = within(upCard()).getByRole('button', { name: '기본 기본 그림으로 되돌리기' })
    expect(reset).toHaveTextContent('기본값')
    fireEvent.click(reset) // TC-179(복원 부분)
    const dlg = screen.getByRole('alertdialog')
    expect(dlg).toHaveAccessibleName('기본 그림으로 되돌리기')
    fireEvent.click(within(dlg).getByRole('button', { name: '기본 그림으로' }))
    await waitFor(() => expect(restoreDefaultAsset).toHaveBeenCalledWith('kb_up'))
    expect(restoreDefaultAsset).toHaveBeenCalledTimes(1)
    act(() => emitAssets(RESTORED))
    expect(upCard().querySelector('img')).toHaveAttribute('src', 'asset://kb_up.png?v=2')
    expect(within(upCard()).queryByText('필수 · 미등록')).toBeNull()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('TC-FLOW-02: (S-4) 어깨축·손 위치 탭 → 축 클릭 → 검토 → 저장 → settings://changed 로 새 축 표시', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    await mount() // TC-031
    openMouseTab() // TC-032(어깨축·손 위치 탭 부분)
    // TC-035
    expect(marker(600, 480)).toBeInTheDocument()
    expect(shoulderDd()?.textContent).toBe('(600, 480)')
    expect(partDd()?.textContent).toBe('(100, 200)')
    expect(srcs()).toEqual(['asset://mouse_base.png', 'asset://body.png'])
    expect(handImg()).toHaveStyle({ left: '50px', top: '100px', width: '100px', height: '75px' })
    expect(padBox()).toBeNull()
    // TC-016
    expect(guide().textContent).toBe(G_IDLE)
    expect(
      within(screen.getByRole('region', { name: MOUSE_TAB }))
        .getAllByRole('button')
        .map(b => b.textContent),
    ).toEqual(['어깨축 설정하기', AREA_START, '기본값으로 리셋'])
    fireEvent.click(btn('어깨축 설정하기'))
    expect(guide().textContent).toBe(G_PICK)
    fireEvent.click(preview(), { clientX: 150, clientY: 100 })
    expect(guide().textContent).toBe(G_REVIEW)
    expect(marker(300, 200)).toBeInTheDocument()
    fireEvent.click(btn('저장'))
    const saved: Settings = { ...SETTINGS, mouse: { ...MOUSE, shoulder: { x: 300, y: 200 } } }
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(setSettings).toHaveBeenCalledWith(saved)
    await waitFor(() => expect(guide().textContent).toBe(G_IDLE))
    act(() => emitSettings(saved))
    expect(marker(300, 200)).toBeInTheDocument()
    expect(shoulderDd()?.textContent).toBe('(300, 200)')
    expect(screen.queryByRole('alert')).toBeNull()
    expectNoUnusedBridge()
  })

  it('TC-FLOW-03: (S-4 오류·취소) 저장 실패 → 오류 줄·검토 유지 → 재저장 성공 → 다시 시작 후 취소', async () => {
    vi.mocked(setSettings)
      .mockRejectedValueOnce({ code: 'settings.io', message: '설정 파일을 저장하지 못했습니다.' })
      .mockImplementationOnce(async s => s)
    await mount() // TC-031
    expect(getSettings).toHaveBeenCalledTimes(1)
    openMouseTab() // TC-032(어깨축·손 위치 부분)
    expect(tabBtn(MOUSE_TAB)).toHaveAttribute('aria-selected', 'true') // CR-031
    fireEvent.click(btn('어깨축 설정하기'))
    fireEvent.click(preview(), { clientX: 150, clientY: 100 })
    fireEvent.click(btn('저장'))
    await waitFor(() => expect(alertText()).toBe('오류: 설정 파일을 저장하지 못했습니다.'))
    expect(guide().textContent).toBe(G_REVIEW)
    expect(marker(300, 200)).toBeInTheDocument()
    await waitFor(() => expect(btn('저장')).toBeEnabled())
    fireEvent.click(btn('저장'))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(guide().textContent).toBe(G_IDLE)
    fireEvent.click(btn('어깨축 설정하기'))
    fireEvent.click(btn('취소'))
    expect(guide().textContent).toBe(G_IDLE)
    expect(setSettings).toHaveBeenCalledTimes(2)
  })

  it('TC-FLOW-04 (CR-038·CR-044 개정): (S-5) 어깨축·손 위치 탭 → 기본값으로 리셋(확인 창 없음) → settings://changed 로 기본 축·손 그림 자리', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const reset: Settings = { ...SETTINGS, mouse: DEFAULT_MOUSE_EXPECTED }
    let resolveSave!: (s: Settings) => void
    vi.mocked(setSettings).mockReturnValue(new Promise<Settings>(res => (resolveSave = res)))
    await mount() // TC-031
    openMouseTab() // TC-032(어깨축·손 위치 부분)
    expect(marker(600, 480)).toBeInTheDocument() // TC-035(마커 부분)
    fireEvent.click(btn('기본값으로 리셋'))
    // TC-024(클릭 직후 비활성 구간)
    expect(btn('기본값으로 리셋')).toBeDisabled()
    expect(btn('어깨축 설정하기')).toBeDisabled()
    expect(btn(AREA_START)).toBeDisabled()
    // TC-025(인자·확인 창 없음)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(reset)
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
    await act(async () => {
      resolveSave(reset)
    })
    expect(btn('기본값으로 리셋')).toBeEnabled()
    expect(btn('어깨축 설정하기')).toBeEnabled()
    expect(btn(AREA_START)).toBeEnabled()
    // TC-036(수신 → 표시) + CR-018 기본 영역 선·값 목록
    act(() => emitSettings(reset))
    expect(marker(582, 484)).toBeInTheDocument() // CR-044: CR-038 (558,500) · 옛 (620,530)
    expect(shoulderDd()?.textContent).toBe('(582, 484)')
    // CR-044: partPos (411,464) × scale 0.5 = left 205.5px · top 232px (CR-038 (389,492) → 194.5px · 246px)
    expect(handImg()).toHaveStyle({ left: '205.5px', top: '232px' })
    expect(partDd()?.textContent).toBe('(411, 464)')
    expect(polygonPts()).toBe(SVG_DEFAULT)
    expect(areaDd()?.textContent).toBe(DD_DEFAULT)
    expect(screen.queryByRole('alert')).toBeNull()
    confirmSpy.mockRestore()
  })

  it('TC-FLOW-05: (S-6) 어깨축·손 위치 탭 → 손 그림 끌어다 놓기 → 저장 → settings://changed 로 새 자리·값 목록', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    await mount() // TC-031(마운트 부분)
    openMouseTab() // TC-032(어깨축·손 위치 탭 부분)
    // TC-035(손 그림·값 목록 부분)
    expect(handImg()).toHaveStyle({ left: '50px', top: '100px', width: '100px', height: '75px' })
    expect(partDd()?.textContent).toBe('(100, 200)')
    // TC-049(누름·끌기·놓기 부분) — 누름 (100,150) = 캔버스 (200,300), grab (100,100)
    down(100, 150)
    expect(capture.set).toHaveBeenCalledWith(PID)
    move(150, 175) // → (200,250)
    expect(handImg()).toHaveStyle({ left: '100px', top: '125px' })
    expect(partDd()?.textContent).toBe('(200, 250)')
    expect(setSettings).not.toHaveBeenCalled()
    up(150, 175)
    const moved: Settings = { ...SETTINGS, mouse: { ...MOUSE, partPos: { x: 200, y: 250 } } }
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(moved)
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
    // TC-036(수신 → 표시 부분)
    act(() => emitSettings(moved))
    expect(handImg()).toHaveStyle({ left: '100px', top: '125px' })
    expect(partDd()?.textContent).toBe('(200, 250)')
    expect(marker(600, 480)).toBeInTheDocument()
    expect(guide().textContent).toBe(G_IDLE)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(setSettings).toHaveBeenCalledTimes(1)
    expectNoUnusedBridge()
  })
})

// ─── 이동 영역 (R-15·R-16, CR-018) ─────────────────────────────────────────
// 좌표는 MousePartsTab.test.tsx 와 같다: 캔버스 900×700 · scale 0.5 · rect 0 → 클릭 오프셋 = 캔버스 NEW_AREA × 0.5
// CR-057(🔒 ko 확정 문구): 단계 안내 교체 — 옛 「n/4 이동 영역의 …」·「이동 영역을 확인하고 저장하세요.」
const G_AREA = [
  '1/4 사각형의 왼쪽 위 꼭짓점을 클릭해주세요.',
  '2/4 이제 오른쪽 위 꼭짓점을 클릭해주세요.',
  '3/4 이제 오른쪽 아래 꼭짓점을 클릭해주세요.',
  '4/4 마지막으로 왼쪽 아래 꼭짓점을 클릭해주세요.',
]
const G_AREA_REVIEW = '사각형이 맞는지 확인하고 저장하세요.'
const AREA_CLICKS: [number, number][] = [
  [50, 200],
  [400, 200],
  [400, 325],
  [50, 325],
]
const SVG_SAVED = '100,250 150,250 150,280 100,280' // AREA × 0.5
const SVG_NEW = '50,200 400,200 400,325 50,325' // NEW_AREA × 0.5
const SVG_DEFAULT = '187.5,262.5 247.5,262.5 247.5,312.5 187.5,312.5' // DEFAULT_AREA × 0.5
const DD_SAVED = '왼쪽 위 (200, 500) · 오른쪽 위 (300, 500) · 오른쪽 아래 (300, 560) · 왼쪽 아래 (200, 560)'
const DD_NEW = '왼쪽 위 (100, 400) · 오른쪽 위 (800, 400) · 오른쪽 아래 (800, 650) · 왼쪽 아래 (100, 650)'
const DD_DEFAULT = '왼쪽 위 (375, 525) · 오른쪽 위 (495, 525) · 오른쪽 아래 (495, 625) · 왼쪽 아래 (375, 625)'
const polygonPts = () => preview().querySelector('polygon')?.getAttribute('points') ?? null
const dotCount = () => preview().querySelectorAll('circle').length
const areaDd = () => screen.getByText('이동 영역', { selector: 'dt' }).nextElementSibling
const clickArea = (i: number) =>
  fireEvent.click(preview(), { clientX: AREA_CLICKS[i][0], clientY: AREA_CLICKS[i][1] })

describe('SettingsApp — 이동 영역 (R-15·R-16, CR-018)', () => {
  it('TC-076: 로드한 이동 영역이 선·값 목록에 보이고, settings://changed 를 받으면 바뀐다(되저장 없음)', async () => {
    await mount()
    openMouseTab()
    expect(polygonPts()).toBe(SVG_SAVED)
    expect(dotCount()).toBe(0)
    expect(areaDd()?.textContent).toBe(DD_SAVED)
    act(() => emitSettings(AREA_SAVED))
    expect(polygonPts()).toBe(SVG_NEW)
    expect(dotCount()).toBe(0)
    expect(areaDd()?.textContent).toBe(DD_NEW)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-077: 이동 영역 저장 실패도 ko 에서는 「오류: {message}」, reviewArea 유지 → 재저장 성공이면 오류 줄이 사라진다', async () => {
    vi.mocked(setSettings)
      .mockRejectedValueOnce({ code: 'settings.invalid', message: '이동 영역 값이 올바르지 않습니다.' })
      .mockImplementationOnce(async s => s)
    await mount()
    openMouseTab()
    fireEvent.click(btn(AREA_START))
    AREA_CLICKS.forEach((_, i) => clickArea(i))
    fireEvent.click(btn('저장'))
    await waitFor(() => expect(alertText()).toBe('오류: 이동 영역 값이 올바르지 않습니다.'))
    expect(guide().textContent).toBe(G_AREA_REVIEW)
    expect(polygonPts()).toBe(SVG_NEW)
    expect(dotCount()).toBe(4)
    expect(areaDd()?.textContent).toBe(DD_NEW)
    await waitFor(() => expect(btn('저장')).toBeEnabled())
    fireEvent.click(btn('저장'))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(guide().textContent).toBe(G_IDLE)
    expect(setSettings).toHaveBeenCalledTimes(2)
    for (const call of vi.mocked(setSettings).mock.calls) {
      expect(call[0]).toStrictEqual(AREA_SAVED)
    }
  })
})

describe('TC-FLOW (CR-018)', () => {
  it('TC-FLOW-06 (CR-057 개정): (S-7) 저장된 영역 선 확인 → 사각형 이동 영역 설정 → 네 꼭짓점 → 검토 → 저장 → settings://changed 로 새 영역 선·값 목록', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    await mount() // TC-031(마운트 부분)
    openMouseTab() // TC-032(어깨축·손 위치 탭 부분)
    // TC-076(로드 부분)
    expect(polygonPts()).toBe(SVG_SAVED)
    expect(areaDd()?.textContent).toBe(DD_SAVED)
    // TC-064(진입 부분)
    fireEvent.click(btn(AREA_START))
    expect(guide().textContent).toBe(G_AREA[0])
    expect(preview().querySelector('svg')).toBeNull()
    // TC-065(안내·선·값 부분)
    AREA_CLICKS.forEach((_, i) => {
      clickArea(i)
      expect(guide().textContent).toBe(i < 3 ? G_AREA[i + 1] : G_AREA_REVIEW)
    })
    expect(polygonPts()).toBe(SVG_NEW)
    expect(dotCount()).toBe(4)
    expect(areaDd()?.textContent).toBe(DD_NEW)
    // TC-067(저장 인자·idle 복귀 부분)
    fireEvent.click(btn('저장'))
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(AREA_SAVED)
    await waitFor(() => expect(guide().textContent).toBe(G_IDLE))
    // TC-076(수신 부분)
    act(() => emitSettings(AREA_SAVED))
    expect(polygonPts()).toBe(SVG_NEW)
    expect(dotCount()).toBe(0)
    expect(areaDd()?.textContent).toBe(DD_NEW)
    expect(marker(600, 480)).toBeInTheDocument()
    expect(partDd()?.textContent).toBe('(100, 200)')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(setSettings).toHaveBeenCalledTimes(1)
    expectNoUnusedBridge()
  })
})

// ─── 기본 설정 탭 흐름 (CR-028) ─────────────────────────────────────────────
describe('TC-FLOW (CR-028 기본 설정 탭)', () => {
  it('TC-FLOW-08: (S-2) 배율을 끌어 놓아 1회 저장 → 수신 → 유휴 시간 10분 Enter → idleSeconds 600 저장 → 수신', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const { container } = await mount()
    const slider = screen.getByRole('slider', { name: '배율' })
    fireEvent.change(slider, { target: { value: '110' } }) // TC-120
    fireEvent.change(slider, { target: { value: '100' } })
    expect(setSettings).not.toHaveBeenCalled()
    fireEvent.pointerUp(slider)
    const scaled: Settings = { ...SETTINGS, scale: 1 }
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(scaled)
    await act(async () => {})
    act(() => emitSettings(scaled))
    expect(outputText(container)).toBe('100%')
    const idle = screen.getByRole('spinbutton', { name: '유휴 시간' }) as HTMLInputElement
    fireEvent.change(idle, { target: { value: '10' } }) // TC-127
    expect(setSettings).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(idle, { key: 'Enter' })
    const idled: Settings = { ...scaled, idleSeconds: 600 }
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual(idled)
    await act(async () => {})
    act(() => emitSettings(idled))
    expect(idle.value).toBe('10')
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  // CR-049 개정: 일반 권한 흐름 — 옛 「UAC 취소 안내」 단계를 「실패 → 창 오류 줄」 단계로, 끝에 끄기(S-3 「또는 끄려 한다」) 추가
  it('TC-FLOW-09 (CR-049 개정): (S-3) 자동 실행 켜기 실패 → 오류 줄 → 다시 켜기 → 대기 → 성공 → 수신으로 켜짐·오류 줄 사라짐 → 끄기 → 수신으로 꺼짐', async () => {
    const FAIL = { code: 'autostart.error', message: '자동 실행 설정을 바꾸지 못했습니다. (schtasks 종료 코드 1)' }
    let accept!: (v: boolean) => void
    vi.mocked(setAutostart)
      .mockRejectedValueOnce(FAIL)
      .mockReturnValueOnce(new Promise<boolean>(res => (accept = res)))
      .mockResolvedValueOnce(false)
    const { container } = await mount()
    const toggle = () => screen.getByRole('switch', { name: '컴퓨터 시작 시 자동 실행' })
    fireEvent.click(toggle()) // TC-114
    await waitFor(() => expect(alertText()).toBe(`오류: ${FAIL.message}`))
    expect(noticeText(container)).toBe('')
    expect(toggle()).toBeEnabled()
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(toggle()) // TC-113
    expect(noticeText(container)).toBe('자동 실행 설정을 바꾸는 중입니다…')
    expect(toggle()).toHaveAttribute('aria-busy', 'true')
    await act(async () => accept(true))
    act(() => emitSettings({ ...SETTINGS, autostart: true }))
    await waitFor(() => expect(toggle()).toBeEnabled())
    expect(toggle()).toHaveAttribute('aria-checked', 'true')
    expect(noticeText(container)).toBe('')
    expect(screen.queryByRole('alert')).toBeNull() // 성공 응답의 onError(null)로 오류 줄 지움
    fireEvent.click(toggle()) // TC-116
    await waitFor(() => expect(toggle()).toBeEnabled())
    act(() => emitSettings({ ...SETTINGS, autostart: false }))
    expect(toggle()).toHaveAttribute('aria-checked', 'false')
    expect(noticeText(container)).toBe('')
    expect(vi.mocked(setAutostart).mock.calls).toEqual([[true], [true], [false]])
    expect(setSettings).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('TC-FLOW-10: (S-9) 언어를 日本語 로 → 저장 → 수신 → 세 탭·창 제목·lang 이 ja, 이후 저장 오류도 ja 문구', async () => {
    vi.mocked(setSettings)
      .mockImplementationOnce(async s => s)
      .mockRejectedValueOnce({ code: 'settings.io', message: '설정 파일을 읽거나 쓸 수 없습니다: 거부' })
    await mount()
    fireEvent.change(screen.getByRole('combobox', { name: '표시 언어' }), { target: { value: 'ja' } }) // TC-107
    const jaSettings: Settings = { ...SETTINGS, language: 'ja' }
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(jaSettings)
    await act(async () => {})
    act(() => emitSettings(jaSettings)) // TC-101
    expect(tabTexts(ja.tabsAria)).toEqual([ja.tabGeneral, ja.tabImages, ja.tabMouse, ja.tabTimer, ja.tabPresets]) // CR-045
    expect(document.documentElement.lang).toBe('ja')
    await waitFor(() => expect(titles().at(-1)).toBe(ja.windowTitle))
    fireEvent.click(tabBtn(ja.tabMouse, ja.tabsAria))
    expect(guide().textContent).toBe(ja.wizardIdle)
    fireEvent.click(tabBtn(ja.tabGeneral, ja.tabsAria))
    fireEvent.click(screen.getByRole('switch', { name: ja.lockLabel })) // TC-102
    await waitFor(() => expect(alertText()).toBe(`${ja.errorPrefix} ${ja.errors['settings.io']}`))
    expect(setSettings).toHaveBeenCalledTimes(2)
  })

  it('TC-FLOW-11: (S-10) 위치 잠금 켜기 → 수신 → 잠금 중 배율 슬라이더로 크기 변경(positionLock 유지)', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const { container } = await mount()
    const lock = () => screen.getByRole('switch', { name: '위치 잠금 (마우스 클릭 통과)' })
    fireEvent.click(lock()) // TC-109
    const locked: Settings = { ...SETTINGS, positionLock: true }
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(locked)
    await act(async () => {})
    act(() => emitSettings(locked))
    expect(lock()).toHaveAttribute('aria-checked', 'true')
    const slider = screen.getByRole('slider', { name: '배율' })
    fireEvent.change(slider, { target: { value: '80' } }) // TC-120
    fireEvent.pointerUp(slider)
    const smaller: Settings = { ...locked, scale: 0.8 }
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual(smaller)
    await act(async () => {})
    act(() => emitSettings(smaller))
    expect(outputText(container)).toBe('80%')
    expect(lock()).toHaveAttribute('aria-checked', 'true')
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('TC-FLOW-12: (S-11) 작업표시줄 표시 켜기 → 수신 → 끄기 → 수신', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    await mount()
    const tb = () => screen.getByRole('switch', { name: '작업표시줄에 표시' })
    fireEvent.click(tb()) // TC-111
    const on: Settings = { ...SETTINGS, showInTaskbar: true }
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(on)
    await act(async () => {})
    act(() => emitSettings(on))
    expect(tb()).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(tb())
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual({ ...on, showInTaskbar: false })
    await act(async () => {})
    act(() => emitSettings(SETTINGS))
    expect(tb()).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('TC-FLOW-13: (S-12) 위치 초기화 → resetOverlayPosition() 1회 → 수신(overlay 기본 위치) → 버튼 다시 활성·오류 없음', async () => {
    let done!: (p: { x: number; y: number }) => void
    vi.mocked(resetOverlayPosition).mockReturnValue(new Promise(res => (done = res)))
    await mount()
    const reset = screen.getByRole('button', { name: '위치 초기화' })
    fireEvent.click(reset) // TC-117
    expect(resetOverlayPosition).toHaveBeenCalledTimes(1)
    expect(reset).toBeDisabled()
    act(() => emitSettings({ ...SETTINGS, overlay: { x: 100, y: 100, visible: true } }))
    await act(async () => done({ x: 100, y: 100 }))
    await waitFor(() => expect(reset).toBeEnabled())
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
  })
})
