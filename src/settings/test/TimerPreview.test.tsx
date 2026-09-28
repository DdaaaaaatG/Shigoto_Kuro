/**
 * 「타이머」 탭 미리보기(TimerPreview) 스펙 — CR-045 · R-43 · R-46 · R-48.
 * 기준: src/settings/design/timer-tab.md §2 `TimerPreview`·§4 `drag`·`pendingPos`·`shownPos`·`canvas`·`scale`·
 *       §5.3 `toCanvasPoint`·`onTextPointerDown/Move/Up/Cancel`·§6 렌더·§9 접근성 · design/i18n.md §4.9
 *       · scenarios.md 「CR-045」 절 TC-260 ~ TC-265.
 * 공용 훅(overlay 설계 U-A — components/hooks/useTimerSnapshot·useElapsedText)은 이 스펙에서 mock 한다(살아 있는 시간 계산은
 * overlay 스펙 몫). 스타일 함수 components/utils/timerClock `timerTextStyle` 은 실물(오버레이와 같은 모습 1:1).
 * jsdom 보강: MousePartsTab.test.tsx 와 같은 PointerEvent stub · 포인터 캡처 stub. rect 0 → clientX/Y = 미리보기 오프셋.
 * 좌표 예: 캔버스 800×700 · 상자 400×350 → scale 0.5. 글자 중심 (268,403) = 오프셋 (134,201.5).
 * 선행: bridge v0.21(TimerSettings·AssetSlot 'pomo_char'·'pomo_bubble') + overlay U-A 공용 훅·timerClock + 화면 TimerPreview.
 * CR-050 개정(timer-tab §14.4·§14.7.4 · scenarios.md 「CR-050 개정」 절 TC-260 ~ TC-265 개정·TC-284): props 에 snapshot·receivedAt 추가,
 * 내부 useTimerSnapshot() 호출 삭제(TimerTab 이 1회 호출해 넘긴다 — 이 스펙은 훅 mock 이 **불리지 않음**을 단언),
 * finished 면 글자 div 에 styles.blink(isTimerBlinking — timerClock 실물). 선행: overlay CR-050 timerClock.isTimerBlinking.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { AssetEntry, AssetManifest, AssetSlot, TimerSettings, TimerSnapshot } from 'bridge/types'
import { useTimerSnapshot } from 'components/hooks/useTimerSnapshot'
import { useElapsedText } from 'components/hooks/useElapsedText'
import TimerPreview from '../components/TimerPreview'
import { MessagesProvider } from '../i18n/MessagesContext'
import { ja } from '../i18n/ja'
import { en } from '../i18n/en'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
vi.mock('components/hooks/useTimerSnapshot', () => {
  const fn = vi.fn()
  return { useTimerSnapshot: fn, default: fn }
})
vi.mock('components/hooks/useElapsedText', () => {
  const fn = vi.fn()
  return { useElapsedText: fn, default: fn }
})

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
  Object.defineProperty(window, 'PointerEvent', { configurable: true, writable: true, value: PointerEventStub })
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
/** contract v0.21 DEFAULT_TIMER_SETTINGS 와 같은 값(리터럴 — 독립 대조) */
const T: TimerSettings = { enabled: false, textPos: { x: 268, y: 403 }, rotation: 5, fontSize: 36, color: '#333333' }
const C800 = { width: 800, height: 700 }
const entry = (slot: AssetSlot, w = 800, h = 700): AssetEntry => ({
  slot,
  fileName: `${String(slot)}.png`,
  width: w,
  height: h,
  bytes: 1000,
  url: `asset://${String(slot)}.png`,
})
/** 합성 대상 4장 + 합성에서 빠져야 하는 body·hair·mouse_base·kb_down_0 */
const ALL: AssetManifest = {
  canvas: C800,
  entries: [
    entry('body'),
    entry('hair'),
    entry('kb_up'),
    entry({ kind: 'kb_down', index: 0 }),
    entry('mouse_base', 200, 150),
    entry('pomo_bubble'),
    entry('pomo_char'),
    entry('background'),
  ],
}
const BUBBLE_KB: AssetManifest = { canvas: C800, entries: [entry('kb_up'), entry('pomo_bubble')] }
const NOTHING: AssetManifest = { canvas: C800, entries: [] }
const NO_CANVAS: AssetManifest = { canvas: null, entries: [] }
type Snap = { snapshot: TimerSnapshot; receivedAt: number }
const SNAP: Snap = { snapshot: { status: 'paused', elapsedMs: 754_000 }, receivedAt: 1234 }
/** CR-050: 끝남(core 가 elapsedMs = durationMs 로 보냄) */
const FINISHED: Snap = {
  snapshot: { status: 'finished', elapsedMs: 1_500_000, mode: 'countdown', durationMs: 1_500_000 },
  receivedAt: 5678,
}
const NO_BODY_KO = '캐릭터 이미지(kb_up)가 등록되지 않았습니다.'

const deferred = <V,>() => {
  let resolve!: (v: V) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<V>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let onCommitPos: Mock
beforeEach(() => {
  vi.resetAllMocks()
  installPointerCapture()
  vi.mocked(useTimerSnapshot).mockImplementation(() => SNAP)
  vi.mocked(useElapsedText).mockImplementation(() => '00:12:34')
  onCommitPos = vi.fn(async () => {})
})

// ─── 도우미 ────────────────────────────────────────────────────────────────
/** CR-050: 스냅숏은 props(TimerTab 이 useTimerSnapshot 반환값을 넘긴다) */
const view = (m: AssetManifest = ALL, t: TimerSettings = T, language?: string, s: Snap = SNAP) => {
  const el = (
    <TimerPreview
      manifest={m}
      timer={t}
      snapshot={s.snapshot}
      receivedAt={s.receivedAt}
      onCommitPos={onCommitPos as (p: { x: number; y: number }) => Promise<void>}
    />
  )
  return language ? <MessagesProvider language={language}>{el}</MessagesProvider> : el
}
const stage = (name = '시간 글자 위치 미리보기') => screen.getByRole('group', { name })
const text = () => screen.getByTestId('timer-text')
const canvasDiv = () => text().parentElement as HTMLElement
const layers = () =>
  Array.from(canvasDiv().children).map(el => (el.tagName === 'IMG' ? el.getAttribute('src') : el.getAttribute('data-testid')))
const pos = () => [text().style.left, text().style.top]
const PID = 7
const down = (x: number, y: number, button = 0) =>
  fireEvent.pointerDown(text(), { clientX: x, clientY: y, button, pointerId: PID })
const move = (x: number, y: number) => fireEvent.pointerMove(text(), { clientX: x, clientY: y, pointerId: PID })
const up = (x: number, y: number) => fireEvent.pointerUp(text(), { clientX: x, clientY: y, button: 0, pointerId: PID })

describe('TimerPreview — 합성·글자 (R-43·R-46, timer-tab §6)', () => {
  it('TC-260: 합성 5겹 DOM 순서 = 배경 → 뽀모도 인물 → 말풍선 → 글자 → kb_up, body·hair·팔·타자 입력은 넣지 않고 없는 슬롯은 건너뛴다, 상자 = 캔버스 × fitScale(400×350)', () => {
    const { rerender } = render(view(ALL))
    // ⓐ 화면: 순서·장식 img
    expect(layers()).toEqual([
      'asset://background.png',
      'asset://pomo_char.png',
      'asset://pomo_bubble.png',
      'timer-text',
      'asset://kb_up.png',
    ])
    for (const img of Array.from(canvasDiv().querySelectorAll('img'))) {
      expect(img).toHaveAttribute('alt', '')
      expect(img).toHaveAttribute('draggable', 'false')
    }
    // ⓑ 상태(파생 canvas·scale): 800×700 · min(400/800, 350/700) = 0.5
    expect(stage()).toBe(canvasDiv().parentElement)
    expect(stage().style.width).toBe('400px')
    expect(stage().style.height).toBe('350px')
    expect(canvasDiv().style.width).toBe('800px')
    expect(canvasDiv().style.height).toBe('700px')
    expect(canvasDiv().style.transform).toBe('scale(0.5)')
    expect(screen.queryByText(NO_BODY_KO)).toBeNull()
    // 없는 슬롯 생략
    rerender(view(BUBBLE_KB))
    expect(layers()).toEqual(['asset://pomo_bubble.png', 'timer-text', 'asset://kb_up.png'])
    rerender(view(NOTHING))
    expect(layers()).toEqual(['timer-text'])
    // ⓒ bridge: 저장 없음
    expect(onCommitPos).not.toHaveBeenCalled()
  })

  it('TC-261: 글자 = 공용 훅 시간·timerTextStyle(중심 textPos·rotate·fontSize·color) + 끌기용 pointer-events auto·cursor grab, 타이머 꺼짐·뽀모도 그림 없음이어도 보인다(U-1 무관)', () => {
    render(view(NOTHING, T)) // enabled false · 뽀모도 그림 없음
    // ⓐ 화면
    expect(text()).toHaveTextContent('00:12:34')
    expect(text()).toBeVisible()
    expect(pos()).toEqual(['268px', '403px'])
    expect(text().style.transform).toBe('translate(-50%, -50%) rotate(5deg)')
    expect(text().style.fontSize).toBe('36px')
    expect(text()).toHaveStyle({ color: '#333333' })
    expect(text().style.pointerEvents).toBe('auto')
    expect(text().style.cursor).toBe('grab')
    // ⓑ 상태: props 스냅숏을 그대로 넘긴다(useElapsedText(snapshot, receivedAt)) — CR-050: 구독은 TimerTab 몫, 여기서는 훅을 부르지 않는다
    expect(useTimerSnapshot).not.toHaveBeenCalled()
    expect(vi.mocked(useElapsedText).mock.calls.at(-1)).toEqual([SNAP.snapshot, 1234])
    expect(text().className).not.toMatch(/blink/) // paused → 깜빡임 없음
    // 다른 표시값(초안이 반영된 timer prop)도 그대로 스타일로
    render(view(NOTHING, { enabled: true, textPos: { x: 500, y: 120 }, rotation: -30, fontSize: 80, color: '#ff0000' }))
    const second = screen.getAllByTestId('timer-text')[1]
    expect([second.style.left, second.style.top]).toEqual(['500px', '120px'])
    expect(second.style.transform).toBe('translate(-50%, -50%) rotate(-30deg)')
    expect(second.style.fontSize).toBe('80px')
    expect(second).toHaveStyle({ color: '#ff0000' })
    // ⓒ bridge: 없음(훅이 mock — getTimer·onTimerChanged 는 훅 몫)
    expect(onCommitPos).not.toHaveBeenCalled()
  })
})

describe('TimerPreview — 글자 끌기 (R-46, timer-tab §5.3·T-4)', () => {
  it('TC-262: 왼쪽 버튼 누름 → 포인터 캡처·grabbing → 끌면 글자가 따라감 → 놓으면 onCommitPos 1회(정수·캔버스 좌표) → 저장 끝까지 놓은 자리 유지', async () => {
    const save = deferred<void>()
    onCommitPos.mockReturnValue(save.promise)
    const { rerender } = render(view(ALL))
    // 누름 오프셋 (134,202) → 캔버스 (268,404), grab (0,1)
    down(134, 202)
    expect(capture.set).toHaveBeenCalledTimes(1)
    expect(capture.set).toHaveBeenCalledWith(PID)
    expect(text().style.cursor).toBe('grabbing')
    // 이동 (184,232) → 캔버스 (368,464) − grab = (368,463)
    move(184, 232)
    expect(pos()).toEqual(['368px', '463px'])
    expect(onCommitPos).not.toHaveBeenCalled()
    up(184, 232)
    // ⓒ bridge(상위 저장 콜백) 정확히 1회
    expect(onCommitPos).toHaveBeenCalledTimes(1)
    expect(onCommitPos).toHaveBeenCalledWith({ x: 368, y: 463 })
    // ⓑ 상태 pendingPos: 저장 응답 전에는 놓은 자리(튀어 돌아가지 않음)
    expect(pos()).toEqual(['368px', '463px'])
    expect(text().style.cursor).toBe('grab')
    await act(async () => save.resolve())
    // 응답 뒤 pendingPos null → 저장값(props) 자리. settings://changed 로 props 가 바뀌면 새 자리
    expect(pos()).toEqual(['268px', '403px'])
    rerender(view(ALL, { ...T, textPos: { x: 368, y: 463 } }))
    expect(pos()).toEqual(['368px', '463px'])
    expect(onCommitPos).toHaveBeenCalledTimes(1)
  })

  it('TC-263: 저장 0회 — 제자리 놓기 · pointercancel(옛 자리) · 오른쪽 버튼 · 저장 중 다시 누름은 무시', async () => {
    render(view(ALL))
    // ① 제자리
    down(134, 202)
    up(134, 202)
    expect(onCommitPos).not.toHaveBeenCalled()
    expect(pos()).toEqual(['268px', '403px'])
    // ② pointercancel
    down(134, 202)
    move(184, 232)
    expect(pos()).toEqual(['368px', '463px'])
    fireEvent.pointerCancel(text(), { pointerId: PID })
    expect(pos()).toEqual(['268px', '403px'])
    up(184, 232) // drag null → 무시
    expect(onCommitPos).not.toHaveBeenCalled()
    // ③ 오른쪽 버튼
    const before = capture.set.mock.calls.length
    down(134, 202, 2)
    move(184, 232)
    up(184, 232)
    expect(capture.set.mock.calls.length).toBe(before)
    expect(pos()).toEqual(['268px', '403px'])
    expect(onCommitPos).not.toHaveBeenCalled()
    // ④ 저장 중(pendingPos ≠ null) 누름 무시
    const save = deferred<void>()
    onCommitPos.mockReturnValue(save.promise)
    down(134, 202)
    move(184, 232)
    up(184, 232)
    expect(onCommitPos).toHaveBeenCalledTimes(1)
    const held = capture.set.mock.calls.length
    down(184, 232)
    move(100, 100)
    up(100, 100)
    expect(capture.set.mock.calls.length).toBe(held)
    expect(pos()).toEqual(['368px', '463px'])
    expect(onCommitPos).toHaveBeenCalledTimes(1)
    await act(async () => save.resolve())
  })

  it('TC-264: 캔버스 밖으로 끌면 가장자리(0 ~ width·height)에 멈춘다 · 캔버스 없음 → previewNoBody 겹침·900×700 기본 상자·글자는 보이고 끌기는 900×700 안', () => {
    const { unmount } = render(view(ALL))
    // grab (0,0): 오프셋 (134,201.5) = 캔버스 (268,403)
    down(134, 201.5)
    move(1000, 1000)
    expect(pos()).toEqual(['800px', '700px'])
    move(-50, -50)
    expect(pos()).toEqual(['0px', '0px'])
    up(-50, -50)
    expect(onCommitPos).toHaveBeenCalledTimes(1)
    expect(onCommitPos).toHaveBeenCalledWith({ x: 0, y: 0 })
    unmount()
    // 캔버스 없음(manifest.canvas null)
    onCommitPos.mockClear()
    render(view(NO_CANVAS))
    expect(screen.getByText(NO_BODY_KO)).toBeInTheDocument()
    expect(text()).toHaveTextContent('00:12:34')
    expect(parseFloat(stage().style.width)).toBeCloseTo(400, 3)
    expect(parseFloat(stage().style.height)).toBeCloseTo(311.111, 2)
    expect(canvasDiv().style.width).toBe('900px')
    expect(canvasDiv().style.height).toBe('700px')
    // scale 4/9 — 오프셋 (119.11,179.11) ≈ 캔버스 (268,403) → grab (0,0), 멀리 끌면 (900,700)
    down(119.11, 179.11)
    move(2000, 2000)
    expect(pos()).toEqual(['900px', '700px'])
    up(2000, 2000)
    expect(onCommitPos).toHaveBeenCalledTimes(1)
    expect(onCommitPos).toHaveBeenCalledWith({ x: 900, y: 700 })
  })
})

describe('TimerPreview — 접근성·언어 (R-46·R-20, timer-tab §9)', () => {
  it('TC-265: 상자 role=group·글자 role=img(이름 = timerTextDragAria)·그림 alt="" — 글자는 포커스 대상 아님·aria-live 없음, ja·en 이름', () => {
    const { unmount } = render(view(ALL))
    // ⓐ ko 이름
    expect(stage()).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '시간 글자 — 끌어서 옮기기' })).toBe(text())
    expect(text()).not.toHaveAttribute('tabindex')
    expect(stage().querySelector('[aria-live]')).toBeNull()
    expect(stage()).not.toHaveAttribute('aria-live')
    // 장식 img 는 접근성 트리에서 이름 없는 그림
    expect(screen.getAllByRole('img').filter(e => e.tagName === 'IMG')).toHaveLength(0)
    unmount()
    // ⓑ 언어별 이름(i18n §4.9 — ja·en 은 사전 값으로 대조, 검수 필요)
    for (const [lang, dict] of [
      ['ja', ja],
      ['en', en],
    ] as const) {
      const r = render(view(ALL, T, lang))
      expect(stage(dict.timerPreviewAria)).toBeInTheDocument()
      expect(screen.getByRole('img', { name: dict.timerTextDragAria })).toBe(text())
      r.unmount()
    }
    // ⓒ bridge: 없음
    expect(onCommitPos).not.toHaveBeenCalled()
  })
})

// CR-050 · R-52 (timer-tab §14.4 TimerPreview 개정·§14.6 blinking·§14.7.4·§14.3 .blink) — scenarios.md 「CR-050 개정」 절
describe('TimerPreview — 끝남 깜빡임 (R-52, §14.7.4)', () => {
  it('TC-284: finished 스냅숏(props) → 글자 div .blink·텍스트 = 공용 훅 00:00:00, stopped·running·paused·restPaused → 클래스 없음, useTimerSnapshot 을 부르지 않는다·aria-live 없음·끌기 스타일 불변', () => {
    vi.mocked(useElapsedText).mockImplementation(() => '00:00:00')
    const { rerender } = render(view(ALL, T, undefined, FINISHED))
    // ⓐ 깜빡임(CSS 만 — JS 타이머 없음)
    expect(text()).toHaveTextContent('00:00:00')
    expect(text().className).toMatch(/blink/)
    expect(text().style.cursor).toBe('grab')
    expect(stage().querySelector('[aria-live]')).toBeNull()
    // ⓑ 상태: props 스냅숏 → 공용 훅·isTimerBlinking
    expect(vi.mocked(useElapsedText).mock.calls.at(-1)).toEqual([FINISHED.snapshot, 5678])
    expect(useTimerSnapshot).not.toHaveBeenCalled()
    for (const status of ['stopped', 'running', 'paused', 'restPaused'] as const) {
      rerender(view(ALL, T, undefined, { snapshot: { status, elapsedMs: 1000 }, receivedAt: 1 }))
      expect(text().className, status).not.toMatch(/blink/)
    }
    // 다시 finished → 다시 깜빡임
    rerender(view(ALL, T, undefined, FINISHED))
    expect(text().className).toMatch(/blink/)
    // ⓒ bridge(상위 저장 콜백): 없음
    expect(onCommitPos).not.toHaveBeenCalled()
  })
})
