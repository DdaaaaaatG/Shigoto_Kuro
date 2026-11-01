/**
 * 「크기 · 반응」 카드 — 키 그림 유지 시간 슬라이더 스펙 — CR-073 · R-69 (key-hold KH-07, 🔒 사용자 결정 2026-11-01).
 * 기준: doc/200_설계/architecture/key-hold-03-packet-ui.md §B.2 ~ §B.3 · key-hold-02-design.md §5a D-1·D-8
 *       · contract v1.2 §3.3(`Settings.keyHoldMs` 0 ~ 500 정수, 기본 150) · R-03 배율 슬라이더와 같은 저장 규칙.
 * 번호: TC-364 ~ TC-369(정식 — scenarios.md 「v35 개정」 절, 옛 임시 번호 KH-B-01 ~ KH-B-06). 인계 패킷 S1 ~ S6 과 1:1 —
 *       S7(i18n)은 i18n.test.ts 의 TC-370(옛 KH-B-07).
 * bridge 는 mock(vi.mock('bridge/commands')) — toBridgeError 만 실물. 실제 Tauri API 를 부르지 않는다.
 * 시간: 키보드 저장 지연(300ms)만 가짜 시계(setTimeout·clearTimeout 만 가짜). 그 TC 에서는 waitFor 를 쓰지 않는다.
 * 기대값의 숫자(0·500·10·150)는 일부러 리터럴 — 화면 코드는 bridge 상수를 쓰므로 독립 대조가 된다.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_TIMER_SETTINGS, type BridgeError, type Settings } from 'bridge/types'
import { setSettings } from 'bridge/commands'
import ScaleIdleCard from '../components/ScaleIdleCard'
import { MessagesProvider } from '../i18n/MessagesContext'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))
vi.mock('bridge/commands', async importOriginal => {
  const actual = await importOriginal<typeof import('bridge/commands')>()
  return {
    ...actual, // toBridgeError 는 실물
    setSettings: vi.fn(),
  }
})

// ─── 픽스처 ────────────────────────────────────────────────────────────────
const SETTINGS: Settings = {
  scale: 1.5,
  idleSeconds: 120,
  keyHoldMs: 150, // contract v1.2(key-hold) 필수 필드
  overlay: { x: 30, y: 40, visible: true },
  mouse: null,
  autostart: false,
  language: 'ko',
  positionLock: false,
  showInTaskbar: false,
  timer: DEFAULT_TIMER_SETTINGS,
}
const LABEL = '키 그림 유지 시간'
const KO_DESC =
  '키를 짧게 눌러도 바뀐 키보드 그림을 최소 이 시간만큼 보여 줍니다. 0이면 떼는 즉시 돌아갑니다(0~500ms).'

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
const renderCard = (s: Settings = SETTINGS, language = 'ko') => {
  const ui = (n: Settings) => (
    <MessagesProvider language={language}>
      <ScaleIdleCard settings={n} onError={onError} />
    </MessagesProvider>
  )
  const utils = render(ui(s))
  return { ...utils, update: (n: Settings) => utils.rerender(ui(n)) }
}
const khSlider = (name = LABEL) => screen.getByRole('slider', { name }) as HTMLInputElement
/** 키 그림 유지 시간 슬라이더 옆 표시 — 배율 표시(첫 output)와 구분한다 */
const khOutput = (c: HTMLElement) => c.querySelector('output[for="key-hold-slider"]')
const flush = () => act(async () => {})

describe('ScaleIdleCard — 키 그림 유지 시간 (R-69, CR-073)', () => {
  it('TC-364 (S1): 슬라이더 = 저장값 ms, 범위 0~500·10ms 단계, 옆 표시·aria-valuetext·설명(범위 치환), 배율·유휴 시간 다음 같은 카드, 렌더만으로 저장 없음', () => {
    const { container, update } = renderCard()
    const card = screen.getByRole('region', { name: '크기 · 반응' })
    const s = khSlider()
    expect(card).toContainElement(s)
    expect(s.value).toBe('150')
    expect(s).toHaveAttribute('min', '0')
    expect(s).toHaveAttribute('max', '500')
    expect(s).toHaveAttribute('step', '10')
    expect(s).toHaveAttribute('aria-valuetext', '150ms')
    expect(s).toHaveAccessibleDescription(KO_DESC)
    expect(khOutput(container)?.textContent).toBe('150ms')
    // 라벨 연결(label[for] ↔ id)과 DOM 순서(= 포커스 순서): 배율 → 유휴 시간 → 키 그림 유지 시간
    expect(screen.getByLabelText(LABEL)).toBe(s)
    expect(Array.from(card.querySelectorAll('input')).map(e => e.id)).toEqual([
      'scale-slider',
      'idle-input',
      'key-hold-slider',
    ])
    // 경계값 0·500 은 그대로 표시(0 = 떼는 즉시 복귀)
    update({ ...SETTINGS, keyHoldMs: 0 })
    expect(khSlider().value).toBe('0')
    expect(khOutput(container)?.textContent).toBe('0ms')
    expect(khSlider()).toHaveAttribute('aria-valuetext', '0ms')
    update({ ...SETTINGS, keyHoldMs: 500 })
    expect(khSlider().value).toBe('500')
    expect(khOutput(container)?.textContent).toBe('500ms')
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-365 (S2): 끄는 동안 setSettings 0회(표시만), 놓을 때 1회 keyHoldMs 만 바꿔 저장, 표시는 수신 값으로', async () => {
    const { container, update } = renderCard()
    for (const v of ['160', '180', '200']) fireEvent.change(khSlider(), { target: { value: v } })
    expect(khOutput(container)?.textContent).toBe('200ms')
    expect(khSlider()).toHaveAttribute('aria-valuetext', '200ms')
    expect(setSettings).not.toHaveBeenCalled()
    fireEvent.pointerUp(khSlider())
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({ ...SETTINGS, keyHoldMs: 200 })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    expect(khOutput(container)?.textContent).toBe('150ms') // 수신 전에는 저장값
    update({ ...SETTINGS, keyHoldMs: 200 })
    expect(khOutput(container)?.textContent).toBe('200ms')
    expect(khSlider().value).toBe('200')
  })

  it('TC-366 (S3): 키보드 — 탐색 키를 뗀 뒤 300ms 에 1회 저장, 299ms 까지는 저장 없음 (가짜 시계)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    renderCard()
    fireEvent.change(khSlider(), { target: { value: '160' } })
    fireEvent.keyUp(khSlider(), { key: 'ArrowRight' })
    await act(async () => vi.advanceTimersByTime(299))
    expect(setSettings).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(1))
    await flush()
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({ ...SETTINGS, keyHoldMs: 160 })
  })

  it('TC-367 (S4): 놓은 값이 저장값과 같거나(150 → 170 → 150) 바꾸지 않고 놓거나 포커스가 떠나면 저장하지 않는다', () => {
    const { container } = renderCard()
    fireEvent.pointerUp(khSlider())
    fireEvent.blur(khSlider())
    fireEvent.change(khSlider(), { target: { value: '170' } })
    fireEvent.change(khSlider(), { target: { value: '150' } })
    fireEvent.pointerUp(khSlider())
    expect(khOutput(container)?.textContent).toBe('150ms')
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-368 (S5): 저장 실패(settings.invalid) → onError(BridgeError) 1회, 슬라이더·표시가 저장값(150)으로 돌아온다', async () => {
    const invalid: BridgeError = {
      code: 'settings.invalid',
      message: '설정값이 올바르지 않습니다: 키 그림 유지 시간은 0 ~ 500ms 사이여야 합니다.',
    }
    vi.mocked(setSettings).mockRejectedValue(invalid)
    const { container } = renderCard()
    fireEvent.change(khSlider(), { target: { value: '300' } })
    expect(khSlider().value).toBe('300')
    fireEvent.pointerUp(khSlider())
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({ ...SETTINGS, keyHoldMs: 300 })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(invalid))
    await waitFor(() => expect(khSlider().value).toBe('150'))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalledWith(null)
    expect(khOutput(container)?.textContent).toBe('150ms')
    expect(khSlider()).toHaveAttribute('aria-valuetext', '150ms')
  })

  it('TC-369 (S6): 언어 ja·en — 라벨·값 표시·aria-valuetext 가 해당 언어 문구, 설명은 범위({min}·{max})가 치환된다', () => {
    const cases = [
      { lang: 'ja', label: 'キー画像の表示時間', value: '150ms', range: '(0〜500ms)' },
      { lang: 'en', label: 'Key image hold', value: '150 ms', range: '(0–500 ms)' },
    ]
    for (const c of cases) {
      const { container, unmount } = renderCard(SETTINGS, c.lang)
      const s = screen.getByRole('slider', { name: c.label })
      expect(s, c.lang).toHaveAttribute('aria-valuetext', c.value)
      expect(khOutput(container)?.textContent, c.lang).toBe(c.value)
      const descId = s.getAttribute('aria-describedby') ?? ''
      const text = document.getElementById(descId)?.textContent ?? ''
      expect(text, c.lang).toContain(c.range)
      expect(text, c.lang).not.toMatch(/[{}]/)
      expect(screen.queryByRole('slider', { name: LABEL }), c.lang).toBeNull()
      unmount()
    }
  })
})
