/**
 * 「기본 설정」 탭 컴포넌트 스펙 — CR-028 · R-03 · R-04 · R-19 ~ R-24.
 * 기준: src/settings/design/general-tab.md §1 ~ §6 · design/i18n.md §4.2 · contract v0.14 §3.3·§5.3·§5.5·§5.6·§6
 *       · scenarios.md TC-104 ~ TC-130 · 수용 기준 U-2 · U-3 · U-13.
 * bridge 는 mock(vi.mock('bridge/commands')) — toBridgeError 만 실물. 실제 Tauri API 를 부르지 않는다.
 * Provider 없이 렌더하면 useMessages() 기본값 ko(i18n.md §3) — 문구 단언은 ko 문구.
 * 시간: 배율 키보드 저장 지연(300ms)만 가짜 시계(setTimeout·clearTimeout 만 가짜). 그 TC 에서는 waitFor 를 쓰지 않는다.
 * 선행: bridge v0.14 소스 반영(Settings.language·positionLock·showInTaskbar, resetOverlayPosition) + CR-028 화면.
 * (CR-049, contract v0.22 §5.5·§6 · general-tab §3.1·§3.2·§4-5·G-6 · i18n §4.2) 자동 실행 = 일반 권한 — `autostart.cancelled`·
 *   취소 안내(`autostartNotice`·`L.cancelled`) 삭제. 개정: L.pending·autostartDesc 새 문구(TC-104·TC-113), TC-114 = 실패 → 오류 줄·안내 빈 내용.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_TIMER_SETTINGS, type BridgeError, type Settings } from 'bridge/types'
import { resetOverlayPosition, setAutostart, setSettings } from 'bridge/commands'
import GeneralTab from '../components/GeneralTab'
import ScaleIdleCard from '../components/ScaleIdleCard'
import ToggleSwitch from '../components/ToggleSwitch'
import SettingsCard from '../components/SettingsCard'

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
    resetAppData: vi.fn(), // CR-054(contract v0.25 §5.10) — 이 탭 마지막 카드(ResetAllCard)가 부른다. 호출 단언은 ResetAllCard.test.tsx
  }
})

// ─── 픽스처 ────────────────────────────────────────────────────────────────
const SETTINGS: Settings = {
  scale: 1.5,
  idleSeconds: 120,
  overlay: { x: 30, y: 40, visible: true },
  mouse: null,
  autostart: false,
  language: 'ko',
  positionLock: false,
  showInTaskbar: false,
  timer: DEFAULT_TIMER_SETTINGS, // contract v0.21(CR-045) 필수 필드
}
const L = {
  lock: '위치 잠금 (마우스 클릭 통과)',
  taskbar: '작업표시줄에 표시',
  autostart: '컴퓨터 시작 시 자동 실행',
  pending: '자동 실행 설정을 바꾸는 중입니다…', // CR-049(i18n §4.2) — 옛 「Windows 권한 확인을 기다리는 중입니다…」
  // cancelled: CR-049 삭제(취소 안내 없음 — general-tab §4-5)
  reset: '위치 초기화',
  hint: '1~60 사이의 정수(분)를 입력하세요. 저장되지 않았습니다.',
  scaleDesc:
    '캐릭터 표시 크기(25%~200%). 오버레이에서 Ctrl+휠로도 바꿀 수 있습니다(위치 잠금 중에는 여기서만).',
  idleDesc: '이 시간 동안 입력이 없으면 쉬는중 그림으로 바뀝니다(1~60분).',
}
const SAVE_ERR: BridgeError = { code: 'settings.io', message: '설정 파일을 읽거나 쓸 수 없습니다: 거부' }

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
  vi.mocked(setSettings).mockImplementation(async s => s)
})
afterEach(() => {
  vi.useRealTimers()
})

// ─── 도우미 ────────────────────────────────────────────────────────────────
const renderTab = (s: Settings = SETTINGS) => {
  const utils = render(<GeneralTab settings={s} onError={onError} />)
  return { ...utils, update: (n: Settings) => utils.rerender(<GeneralTab settings={n} onError={onError} />) }
}
const renderCard = (s: Settings = SETTINGS) => {
  const utils = render(<ScaleIdleCard settings={s} onError={onError} />)
  return { ...utils, update: (n: Settings) => utils.rerender(<ScaleIdleCard settings={n} onError={onError} />) }
}
const sw = (name: string) => screen.getByRole('switch', { name })
const langSelect = () => screen.getByRole('combobox', { name: '표시 언어' }) as HTMLSelectElement
const slider = () => screen.getByRole('slider', { name: '배율' }) as HTMLInputElement
const idleInput = () => screen.getByRole('spinbutton', { name: '유휴 시간' }) as HTMLInputElement
const output = (c: HTMLElement) => c.querySelector('output')
const notice = (c: HTMLElement) => c.querySelector('p[role="status"]')
const lastError = () => onError.mock.calls.at(-1)?.[0]
const flush = () => act(async () => {})

// ─── 레이아웃·부품 (R-19) ────────────────────────────────────────────────────
describe('GeneralTab — 레이아웃·카드 (R-19 ~ R-24)', () => {
  it('TC-104 (CR-054 개정): 카드 5장 순서(마지막 「초기화」)·언어 선택·배율·유휴 시간·위치 초기화·토글 3개가 저장값으로 보이고 bridge 를 부르지 않는다', () => {
    const { container } = renderTab({ ...SETTINGS, positionLock: true, autostart: true })
    const tab = screen.getByRole('region', { name: '기본 설정' })
    expect(within(tab).getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual([
      '언어 / Language',
      '크기 · 반응',
      '창',
      '작업표시줄 · 시작',
      '초기화', // CR-054(general-tab §1 cardReset — 탭 맨 아래). 카드 내용 단언은 ResetAllCard.test.tsx TC-293
    ])
    const sel = langSelect()
    expect(sel.value).toBe('ko')
    const opts = Array.from(sel.querySelectorAll('option'))
    expect(opts.map(o => o.textContent)).toEqual(['한국어', '日本語', 'English'])
    expect(opts.map(o => o.value)).toEqual(['ko', 'ja', 'en'])
    expect(opts.map(o => o.getAttribute('lang'))).toEqual(['ko', 'ja', 'en'])
    expect(slider().value).toBe('150')
    expect(idleInput().value).toBe('2')
    const windowCard = screen.getByRole('region', { name: '창' })
    expect(within(windowCard).getByRole('button', { name: L.reset })).toBeEnabled()
    expect(within(windowCard).getByRole('switch', { name: L.lock })).toBeInTheDocument()
    const startup = screen.getByRole('region', { name: '작업표시줄 · 시작' })
    expect(within(startup).getAllByRole('switch').map(s => s.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
    ])
    expect(screen.getAllByRole('switch').map(s => s.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'true',
    ])
    expect(sw(L.lock)).toHaveAccessibleDescription(
      '켜면 마우스 클릭이 캐릭터를 통과하고, 끌어서 옮길 수 없습니다. 잠금은 이 설정 창에서만 풀 수 있습니다.',
    )
    expect(sw(L.taskbar)).toHaveAccessibleDescription(
      '켜면 작업표시줄에 캐릭터 창 버튼이 생깁니다. 트레이 아이콘은 그대로 있습니다.',
    )
    // CR-049(i18n §4.2): 일반 권한 기준 설명 — 관리자 확인 창 안내 없음
    expect(sw(L.autostart)).toHaveAccessibleDescription(
      '켜면 Windows에 로그인할 때 자동으로 실행됩니다. 관리자 권한으로 실행한 게임 안에서도 입력을 인식하려면 이 앱을 직접 관리자 권한으로 실행하세요.',
    )
    expect(notice(container)).toHaveAttribute('aria-live', 'polite')
    expect(notice(container)?.textContent).toBe('')
    expect(setSettings).not.toHaveBeenCalled()
    expect(setAutostart).not.toHaveBeenCalled()
    expect(resetOverlayPosition).not.toHaveBeenCalled()
  })

  it('TC-105: ToggleSwitch — role=switch·aria-checked·라벨/설명 연결·disabled·busy(aria-busy)·라벨 글자 클릭은 토글 아님', () => {
    const onToggle = vi.fn()
    const el = (p: Partial<{ checked: boolean; disabled: boolean; busy: boolean }> = {}) => (
      <ToggleSwitch id="t1" label="라벨" description="설명" checked={p.checked ?? false} disabled={p.disabled} busy={p.busy} onToggle={onToggle} />
    )
    const { rerender } = render(el())
    const s = screen.getByRole('switch', { name: '라벨' })
    expect(s).toHaveAttribute('id', 't1')
    expect(s).toHaveAttribute('type', 'button')
    expect(s).toHaveAttribute('aria-checked', 'false')
    expect(s).toHaveAccessibleDescription('설명')
    expect(s).not.toHaveAttribute('aria-busy')
    expect(s).toBeEnabled()
    fireEvent.click(s)
    expect(onToggle).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('라벨'))
    fireEvent.click(screen.getByText('설명'))
    expect(onToggle).toHaveBeenCalledTimes(1)
    rerender(el({ checked: true }))
    expect(s).toHaveAttribute('aria-checked', 'true')
    rerender(el({ disabled: true }))
    expect(s).toBeDisabled()
    expect(s).not.toHaveAttribute('aria-busy')
    fireEvent.click(s)
    expect(onToggle).toHaveBeenCalledTimes(1)
    rerender(el({ busy: true }))
    expect(s).toBeDisabled()
    expect(s).toHaveAttribute('aria-busy', 'true')
  })

  it('TC-106: SettingsCard — section 이름 = 제목(h2), 머리 줄에 action, 본문 children', () => {
    render(
      <SettingsCard title="카드" action={<button type="button">머리</button>}>
        <p>본문</p>
      </SettingsCard>,
    )
    const card = screen.getByRole('region', { name: '카드' })
    const h = within(card).getByRole('heading', { level: 2, name: '카드' })
    expect(card.getAttribute('aria-labelledby')).toBe(h.id)
    expect(h.parentElement).toContainElement(within(card).getByRole('button', { name: '머리' }))
    expect(within(card).getByText('본문')).toBeInTheDocument()
  })
})

// ─── 언어 (R-20) ──────────────────────────────────────────────────────────
describe('GeneralTab — 언어 (R-20, G-1)', () => {
  it('TC-107: 언어를 고르면 setSettings({...settings, language}) 1회, 같은 값·목록 밖 값은 무시, 낙관 갱신 없음', async () => {
    const { update } = renderTab()
    fireEvent.change(langSelect(), { target: { value: 'ja' } })
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({ ...SETTINGS, language: 'ja' })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    expect(langSelect().value).toBe('ko') // settings://changed 전에는 저장값
    update({ ...SETTINGS, language: 'ja' })
    expect(langSelect().value).toBe('ja')
    fireEvent.change(langSelect(), { target: { value: 'ja' } })
    fireEvent.change(langSelect(), { target: { value: 'fr' } })
    expect(setSettings).toHaveBeenCalledTimes(1)
  })

  it('TC-108: 언어 저장 실패 → onError(BridgeError), 선택 상자는 원래 언어', async () => {
    vi.mocked(setSettings).mockRejectedValueOnce(SAVE_ERR).mockRejectedValueOnce(new Error('boom'))
    renderTab()
    fireEvent.change(langSelect(), { target: { value: 'en' } })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(SAVE_ERR))
    expect(langSelect().value).toBe('ko')
    fireEvent.change(langSelect(), { target: { value: 'en' } })
    await waitFor(() => expect(lastError()).toStrictEqual({ code: 'unknown', message: 'boom' }))
    expect(langSelect().value).toBe('ko')
    expect(onError).not.toHaveBeenCalledWith(null)
  })
})

// ─── 위치 잠금·작업표시줄 (R-21·R-22) ─────────────────────────────────────────
describe('GeneralTab — 위치 잠금·작업표시줄 (R-21·R-22, G-4·G-5)', () => {
  it('TC-109: 위치 잠금 토글 → positionLock 만 바꿔 저장(autostart 등 다른 필드 그대로), 표시는 수신 값으로', async () => {
    const S0: Settings = { ...SETTINGS, autostart: true, showInTaskbar: true }
    const { update } = renderTab(S0)
    fireEvent.click(sw(L.lock))
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({ ...S0, positionLock: true })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    expect(sw(L.lock)).toHaveAttribute('aria-checked', 'false')
    update({ ...S0, positionLock: true })
    expect(sw(L.lock)).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(sw(L.lock))
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual({ ...S0, positionLock: false })
    expect(setAutostart).not.toHaveBeenCalled()
  })

  it('TC-110: 위치 잠금·작업표시줄 저장 실패 → onError(BridgeError), 토글은 원래 값', async () => {
    vi.mocked(setSettings).mockRejectedValue(SAVE_ERR)
    renderTab()
    fireEvent.click(sw(L.lock))
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    expect(onError).toHaveBeenCalledWith(SAVE_ERR)
    expect(sw(L.lock)).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(sw(L.taskbar))
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2))
    expect(lastError()).toStrictEqual(SAVE_ERR)
    expect(sw(L.taskbar)).toHaveAttribute('aria-checked', 'false')
  })

  it('TC-111: 작업표시줄 토글 → showInTaskbar 만 바꿔 저장, 수신 뒤 켜짐, 다시 누르면 false 저장', async () => {
    const { update } = renderTab()
    fireEvent.click(sw(L.taskbar))
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({ ...SETTINGS, showInTaskbar: true })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    update({ ...SETTINGS, showInTaskbar: true })
    expect(sw(L.taskbar)).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(sw(L.taskbar))
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual({ ...SETTINGS, showInTaskbar: false })
    expect(setSettings).toHaveBeenCalledTimes(2)
  })

  it('TC-112: 저장 대기 중에도 잠금·작업표시줄 토글은 비활성하지 않는다(연속 클릭 = 마지막 settings 기준)', () => {
    vi.mocked(setSettings).mockReturnValue(new Promise<Settings>(() => {}))
    renderTab()
    fireEvent.click(sw(L.lock))
    expect(sw(L.lock)).toBeEnabled()
    expect(sw(L.lock)).not.toHaveAttribute('aria-busy')
    fireEvent.click(sw(L.lock))
    expect(setSettings).toHaveBeenCalledTimes(2)
    for (const call of vi.mocked(setSettings).mock.calls) {
      expect(call[0]).toStrictEqual({ ...SETTINGS, positionLock: true })
    }
    expect(sw(L.taskbar)).toBeEnabled()
  })
})

// ─── 자동 실행 (R-23) ─────────────────────────────────────────────────────
describe('GeneralTab — 자동 실행 (R-23, G-6)', () => {
  it('TC-113: 대기 중 — setAutostart(true) 1회, 토글 비활성·aria-busy·대기 문구, 응답 뒤 해제, 표시는 수신 값으로', async () => {
    const d = deferred<boolean>()
    vi.mocked(setAutostart).mockReturnValue(d.promise)
    const { container, update } = renderTab()
    fireEvent.click(sw(L.autostart))
    expect(setAutostart).toHaveBeenCalledTimes(1)
    expect(setAutostart).toHaveBeenCalledWith(true)
    expect(sw(L.autostart)).toBeDisabled()
    expect(sw(L.autostart)).toHaveAttribute('aria-busy', 'true')
    expect(notice(container)?.textContent).toBe(L.pending)
    expect(sw(L.lock)).toBeEnabled()
    fireEvent.click(sw(L.autostart))
    expect(setAutostart).toHaveBeenCalledTimes(1)
    await act(async () => d.resolve(true))
    await waitFor(() => expect(sw(L.autostart)).toBeEnabled())
    expect(sw(L.autostart)).not.toHaveAttribute('aria-busy')
    expect(notice(container)?.textContent).toBe('')
    expect(lastError()).toBeNull()
    expect(sw(L.autostart)).toHaveAttribute('aria-checked', 'false')
    update({ ...SETTINGS, autostart: true })
    expect(sw(L.autostart)).toHaveAttribute('aria-checked', 'true')
    expect(setSettings).not.toHaveBeenCalled()
  })

  // CR-049 개정: 옛 「UAC 취소(autostart.cancelled) → 안내 문구」 대체 — 모든 실패 = 오류 줄, 안내 줄은 대기 중에만(general-tab §3.2·§4-5·G-6)
  it('TC-114 (CR-049 개정): setAutostart 실패(io.error) → 오류 줄(onError)·안내 줄 빈 내용·토글 원래대로, 다시 눌러 성공하면 onError(null)', async () => {
    const fail: BridgeError = { code: 'io.error', message: '파일을 처리하지 못했습니다: 임시 작업 파일' }
    const d1 = deferred<boolean>()
    const d2 = deferred<boolean>()
    vi.mocked(setAutostart).mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)
    const { container } = renderTab()
    fireEvent.click(sw(L.autostart))
    expect(notice(container)?.textContent).toBe(L.pending)
    await act(async () => d1.reject(fail))
    await waitFor(() => expect(sw(L.autostart)).toBeEnabled())
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(fail)
    expect(notice(container)?.textContent).toBe('')
    expect(sw(L.autostart)).not.toHaveAttribute('aria-busy')
    expect(sw(L.autostart)).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(sw(L.autostart))
    expect(notice(container)?.textContent).toBe(L.pending)
    await act(async () => d2.resolve(true))
    await waitFor(() => expect(sw(L.autostart)).toBeEnabled())
    expect(onError.mock.calls).toEqual([[fail], [null]])
    expect(notice(container)?.textContent).toBe('')
    expect(vi.mocked(setAutostart).mock.calls).toEqual([[true], [true]])
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-115: 그 밖의 실패 → onError(BridgeError)·안내 없음·토글 원래대로(Error 는 unknown 으로 정규화)', async () => {
    const fail: BridgeError = {
      code: 'autostart.error',
      message: '자동 실행 설정을 바꾸지 못했습니다. (schtasks 종료 코드 1)',
    }
    vi.mocked(setAutostart).mockRejectedValueOnce(fail).mockRejectedValueOnce(new Error('boom'))
    const { container } = renderTab()
    fireEvent.click(sw(L.autostart))
    await waitFor(() => expect(onError).toHaveBeenCalledWith(fail))
    expect(notice(container)?.textContent).toBe('')
    expect(sw(L.autostart)).toBeEnabled()
    expect(sw(L.autostart)).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(sw(L.autostart))
    await waitFor(() => expect(lastError()).toStrictEqual({ code: 'unknown', message: 'boom' }))
  })

  it('TC-116: 켜진 상태에서 누르면 setAutostart(false), 자동 실행은 setSettings 로 보내지 않는다', async () => {
    vi.mocked(setAutostart).mockResolvedValue(false)
    renderTab({ ...SETTINGS, autostart: true })
    expect(sw(L.autostart)).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(sw(L.autostart))
    expect(setAutostart).toHaveBeenCalledWith(false)
    await waitFor(() => expect(sw(L.autostart)).toBeEnabled())
    expect(setSettings).not.toHaveBeenCalled()
  })
})

// ─── 위치 초기화 (R-24) ───────────────────────────────────────────────────
describe('GeneralTab — 위치 초기화 (R-24, G-7)', () => {
  it('TC-117: 누르면 resetOverlayPosition() 1회·응답까지 비활성·확인 창 없음, 성공 시 onError(null)', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const d = deferred<{ x: number; y: number }>()
    vi.mocked(resetOverlayPosition).mockReturnValue(d.promise)
    renderTab()
    const btn = screen.getByRole('button', { name: L.reset })
    fireEvent.click(btn)
    expect(resetOverlayPosition).toHaveBeenCalledTimes(1)
    expect(resetOverlayPosition).toHaveBeenCalledWith()
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(resetOverlayPosition).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(confirmSpy).not.toHaveBeenCalled()
    await act(async () => d.resolve({ x: 100, y: 100 }))
    await waitFor(() => expect(btn).toBeEnabled())
    expect(lastError()).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('TC-118: 위치 초기화 실패 → onError(BridgeError), 버튼 다시 활성', async () => {
    const fail: BridgeError = { code: 'window.not_found', message: 'overlay 창을 찾을 수 없습니다.' }
    vi.mocked(resetOverlayPosition).mockRejectedValue(fail)
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: L.reset }))
    await waitFor(() => expect(onError).toHaveBeenCalledWith(fail))
    expect(screen.getByRole('button', { name: L.reset })).toBeEnabled()
  })
})

// ─── 배율 (R-03) ──────────────────────────────────────────────────────────
describe('ScaleIdleCard — 배율 (R-03, G-2, U-13)', () => {
  it('TC-119: 슬라이더 = 저장값 %, 범위 25~200·5% 단계, 옆 표시·aria-valuetext·설명(잠금 중 안내 포함)', () => {
    const { container } = renderCard()
    expect(screen.getByRole('region', { name: '크기 · 반응' })).toBeInTheDocument()
    const s = slider()
    expect(s.value).toBe('150')
    expect(s).toHaveAttribute('min', '25')
    expect(s).toHaveAttribute('max', '200')
    expect(s).toHaveAttribute('step', '5')
    expect(s).toHaveAttribute('aria-valuetext', '150%')
    expect(s).toHaveAccessibleDescription(L.scaleDesc)
    expect(output(container)?.textContent).toBe('150%')
  })

  it('TC-120: 끄는 동안 setSettings 0회(표시만), 놓을 때 1회 scale = n/100, 표시는 수신 값으로', async () => {
    const { container, update } = renderCard()
    for (const v of ['155', '160', '175']) fireEvent.change(slider(), { target: { value: v } })
    expect(output(container)?.textContent).toBe('175%')
    expect(slider()).toHaveAttribute('aria-valuetext', '175%')
    expect(setSettings).not.toHaveBeenCalled()
    fireEvent.pointerUp(slider())
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({ ...SETTINGS, scale: 1.75 })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    expect(output(container)?.textContent).toBe('150%')
    update({ ...SETTINGS, scale: 1.75 })
    expect(output(container)?.textContent).toBe('175%')
    expect(slider().value).toBe('175')
  })

  it('TC-121: 놓은 값이 저장값과 같거나 바꾸지 않고 놓으면 저장하지 않는다', () => {
    const { container } = renderCard()
    fireEvent.pointerUp(slider())
    fireEvent.change(slider(), { target: { value: '155' } })
    fireEvent.change(slider(), { target: { value: '150' } })
    fireEvent.pointerUp(slider())
    expect(output(container)?.textContent).toBe('150%')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-122: 키보드 — 탐색 키를 뗀 뒤 300ms 에 1회 저장(마지막 키 기준), 다른 키는 예약하지 않는다 (가짜 시계)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    renderCard()
    fireEvent.change(slider(), { target: { value: '155' } })
    fireEvent.keyUp(slider(), { key: 'ArrowRight' })
    await act(async () => vi.advanceTimersByTime(299))
    expect(setSettings).not.toHaveBeenCalled()
    fireEvent.change(slider(), { target: { value: '160' } })
    fireEvent.keyUp(slider(), { key: 'ArrowRight' })
    await act(async () => vi.advanceTimersByTime(299))
    expect(setSettings).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(1))
    await flush()
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({ ...SETTINGS, scale: 1.6 })
    fireEvent.change(slider(), { target: { value: '165' } })
    fireEvent.keyUp(slider(), { key: 'a' })
    await act(async () => vi.advanceTimersByTime(1000))
    expect(setSettings).toHaveBeenCalledTimes(1)
    fireEvent.keyUp(slider(), { key: 'Home' })
    await act(async () => vi.advanceTimersByTime(300))
    await flush()
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual({ ...SETTINGS, scale: 1.65 })
  })

  it('TC-123: 포커스가 떠나면 편집 중 값을 즉시 저장, 편집 없으면 저장 없음, 언마운트 시 예약은 버린다 (가짜 시계)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { unmount } = renderCard()
    fireEvent.blur(slider())
    expect(setSettings).not.toHaveBeenCalled()
    fireEvent.change(slider(), { target: { value: '155' } })
    fireEvent.blur(slider())
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({ ...SETTINGS, scale: 1.55 })
    await flush()
    fireEvent.change(slider(), { target: { value: '170' } })
    fireEvent.keyUp(slider(), { key: 'ArrowUp' })
    unmount()
    await act(async () => vi.advanceTimersByTime(1000))
    expect(setSettings).toHaveBeenCalledTimes(1)
  })

  it('TC-124: 배율 저장 실패 → onError(BridgeError), 슬라이더·표시가 원래 저장값', async () => {
    const invalid: BridgeError = { code: 'settings.invalid', message: '설정값이 올바르지 않습니다: 배율 25%~200%' }
    vi.mocked(setSettings).mockRejectedValue(invalid)
    const { container } = renderCard()
    fireEvent.change(slider(), { target: { value: '175' } })
    fireEvent.pointerUp(slider())
    await waitFor(() => expect(onError).toHaveBeenCalledWith(invalid))
    expect(output(container)?.textContent).toBe('150%')
    expect(slider()).toHaveAttribute('aria-valuetext', '150%')
    expect(onError).not.toHaveBeenCalledWith(null)
  })

  it('TC-125: 외부 변경(오버레이 Ctrl+휠) 수신 → 표시 갱신(5 배수 아니어도 실제 값), 끄는 중에는 draft 우선·놓으면 최신 settings 로 저장', async () => {
    const { container, update } = renderCard()
    update({ ...SETTINGS, scale: 1.03 })
    expect(output(container)?.textContent).toBe('103%')
    expect(slider()).toHaveAttribute('aria-valuetext', '103%')
    fireEvent.change(slider(), { target: { value: '175' } })
    const S08: Settings = { ...SETTINGS, scale: 0.8, idleSeconds: 600 }
    update(S08)
    expect(output(container)?.textContent).toBe('175%')
    fireEvent.pointerUp(slider())
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({ ...S08, scale: 1.75 })
    await waitFor(() => expect(output(container)?.textContent).toBe('80%'))
    expect(setSettings).toHaveBeenCalledTimes(1)
  })
})

// ─── 유휴 시간 (R-04) ─────────────────────────────────────────────────────
describe('ScaleIdleCard — 유휴 시간 (R-04, G-3, U-13)', () => {
  it('TC-126: 입력 칸 = 저장 초 → 분(반올림 표시), 범위 속성·단위·설명, 안내 없음', () => {
    const { update } = renderCard()
    const input = idleInput()
    expect(input.value).toBe('2')
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveAttribute('max', '60')
    expect(input).toHaveAttribute('step', '1')
    expect(input).toHaveAccessibleDescription(L.idleDesc)
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(within(screen.getByRole('region', { name: '크기 · 반응' })).getByText('분')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    update({ ...SETTINGS, idleSeconds: 90 })
    expect(idleInput().value).toBe('2')
    update({ ...SETTINGS, idleSeconds: 30 })
    expect(idleInput().value).toBe('1')
    update({ ...SETTINGS, idleSeconds: 300 })
    expect(idleInput().value).toBe('5')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-127: 타이핑 중 저장 없음, Enter·포커스 이동 때 idleSeconds = 분×60 저장, 같은 값·편집 없음은 저장 없음', async () => {
    const { update } = renderCard()
    fireEvent.change(idleInput(), { target: { value: '5' } })
    fireEvent.keyDown(idleInput(), { key: 'Escape' })
    expect(setSettings).not.toHaveBeenCalled()
    expect(idleInput().value).toBe('5')
    fireEvent.keyDown(idleInput(), { key: 'Enter' })
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({ ...SETTINGS, idleSeconds: 300 })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    expect(idleInput().value).toBe('2') // 수신 전 = 저장값
    const S300: Settings = { ...SETTINGS, idleSeconds: 300 }
    update(S300)
    expect(idleInput().value).toBe('5')
    fireEvent.change(idleInput(), { target: { value: '60' } })
    fireEvent.blur(idleInput())
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual({ ...S300, idleSeconds: 3600 })
    fireEvent.change(idleInput(), { target: { value: '5' } })
    fireEvent.keyDown(idleInput(), { key: 'Enter' })
    fireEvent.keyDown(idleInput(), { key: 'Enter' })
    fireEvent.blur(idleInput())
    expect(setSettings).toHaveBeenCalledTimes(2)
  })

  it('TC-128: 범위 밖·빈 값·소수·음수 → 저장 없음, 입력 칸 저장값 복귀, 안내(role=alert)·aria-invalid, 다시 입력하면 안내 사라짐', () => {
    renderCard()
    const cases: [string, 'Enter' | 'blur'][] = [
      ['0', 'Enter'],
      ['61', 'blur'],
      ['', 'Enter'],
      ['1.5', 'Enter'],
      ['-3', 'blur'],
    ]
    for (const [v, how] of cases) {
      fireEvent.change(idleInput(), { target: { value: v } })
      if (how === 'Enter') fireEvent.keyDown(idleInput(), { key: 'Enter' })
      else fireEvent.blur(idleInput())
      expect(screen.getByRole('alert').textContent, v).toBe(L.hint)
      expect(idleInput(), v).toHaveAttribute('aria-invalid', 'true')
      expect(idleInput().value, v).toBe('2')
    }
    fireEvent.change(idleInput(), { target: { value: '3' } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(idleInput()).not.toHaveAttribute('aria-invalid')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-129: 유휴 시간 저장 실패 → onError(BridgeError), 입력 칸 저장값', async () => {
    vi.mocked(setSettings).mockRejectedValue(SAVE_ERR)
    renderCard()
    fireEvent.change(idleInput(), { target: { value: '10' } })
    fireEvent.keyDown(idleInput(), { key: 'Enter' })
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({ ...SETTINGS, idleSeconds: 600 })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(SAVE_ERR))
    expect(idleInput().value).toBe('2')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

// ─── 접근성 (general-tab.md §6) ─────────────────────────────────────────────
describe('GeneralTab — 접근성 (§6)', () => {
  it('TC-130 (CR-054 개정): 포커스 순서 = DOM 순서(언어 → 배율 → 유휴 → 위치 초기화 → 잠금 → 작업표시줄 → 자동 실행 → 전체 초기화), tabindex 조작 없음, 버튼은 type=button, 상태 줄 2개', () => {
    const { container } = renderTab()
    const focusables = Array.from(container.querySelectorAll<HTMLElement>('select, input, button'))
    expect(focusables.map(e => e.id || e.textContent)).toEqual([
      'language-select',
      'scale-slider',
      'idle-input',
      L.reset,
      'lock-toggle',
      'taskbar-toggle',
      'autostart-toggle',
      '전체 초기화', // CR-054(general-tab §6 — 마지막). 확인창은 닫혀 있어 버튼이 없다
    ])
    for (const e of focusables) expect(e).not.toHaveAttribute('tabindex')
    for (const b of container.querySelectorAll('button')) expect(b).toHaveAttribute('type', 'button')
    expect(screen.getAllByRole('switch')).toHaveLength(3)
    expect(notice(container)).toHaveAttribute('role', 'status') // 첫 상태 줄 = 자동 실행 안내(DOM 순서)
    // CR-054: 초기화 카드 상태 줄(§7.8) — 둘 다 aria-live=polite, 빈 내용
    const statuses = Array.from(container.querySelectorAll('p[role="status"]'))
    expect(statuses).toHaveLength(2)
    for (const s of statuses) {
      expect(s).toHaveAttribute('aria-live', 'polite')
      expect(s.textContent).toBe('')
    }
  })
})
