/**
 * 시작 시간 입력(CountdownTimeInput) 스펙 — CR-050 · R-50 · R-55.
 * 기준: src/settings/design/timer-tab.md §14.4 `CountdownTimeInput` props·§14.6 `draft`·`shownHms`·`invalid`·`saving`·
 *       §14.7.2 `onFieldChange`·`commit`·저장값 동기 효과·`onGroupBlur`·`onFieldKeyDown`·잠금 정리 효과·검증 예·§14.8 렌더·§14.11
 *       · design/i18n.md §4.10 · scenarios.md 「CR-050 개정」 절 TC-273 ~ TC-276
 *       + CR-052: §14.16 `inactive`(타이머 모드 아님 회색 비활성) · 「CR-052 개정」 절 TC-288.
 * 컴포넌트 단독 — bridge 없음(onCommit 은 TimerTab.commitCountdownSecs 자리의 mock: Promise<boolean>, 던지지 않음).
 * 잠금 판정(isDurationLocked)은 TimerTab 몫 — 여기서는 locked prop 만 바꾼다(상태별 판정은 TimerTab.test.tsx TC-276).
 * 포커스 이동: React onBlur = focusout 버블 → fireEvent.focusOut(칸, { relatedTarget }) — 칸 사이 이동은 relatedTarget = 다른 칸,
 * 묶음 밖은 relatedTarget = null. 비동기는 deferred + act. 시간 의존 없음(실제 sleep·가짜 시계 없음).
 * 선행: CR-050 화면(CountdownTimeInput·timerValues §14.5·i18n §4.10). 구현 전 import 오류는 예정된 Red.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import CountdownTimeInput from '../components/CountdownTimeInput'
import { MessagesProvider } from '../i18n/MessagesContext'
import { ja } from '../i18n/ja'
import { en } from '../i18n/en'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))

// i18n §4.10 ko 열
const INVALID = '00:00:01 ~ 99:59:59 사이로 입력해 주세요'
const LOCKED = '멈춤 상태에서 바꿀 수 있습니다'
const HINT = '최대 99:59:59'

const deferred = <V,>() => {
  let resolve!: (v: V) => void
  const promise = new Promise<V>(res => {
    resolve = res
  })
  return { promise, resolve }
}

let onCommit: Mock
beforeEach(() => {
  vi.resetAllMocks()
  onCommit = vi.fn(async () => true)
})

// ─── 도우미 ────────────────────────────────────────────────────────────────
const tree = (secs: number, locked: boolean, language?: string) => {
  const el = <CountdownTimeInput secs={secs} locked={locked} onCommit={onCommit as (s: number) => Promise<boolean>} />
  return language ? <MessagesProvider language={language}>{el}</MessagesProvider> : el
}
const renderInput = (secs = 1500, locked = false, language?: string) => {
  const u = render(tree(secs, locked, language))
  return { ...u, update: (s: number, l = locked) => u.rerender(tree(s, l, language)) }
}
const group = (name = '시작 시간') => screen.getByRole('group', { name })
const field = (name: string) => screen.getByRole('textbox', { name }) as HTMLInputElement
const fields = (names = ['시', '분', '초']) => names.map(field)
const values = () => fields().map(f => f.value)
const msg = () => document.getElementById('timer-duration-msg') as HTMLElement
const type = (name: string, v: string) => fireEvent.change(field(name), { target: { value: v } })
const tabTo = (from: string, to: string) => fireEvent.focusOut(field(from), { relatedTarget: field(to) })
const leave = (from = '초') => fireEvent.focusOut(field(from), { relatedTarget: null })
const flush = () => act(async () => {})

describe('CountdownTimeInput — 표시 (R-50·R-55, §14.6 shownHms·§14.8)', () => {
  it('TC-273: 저장값을 두 자리 시·분·초로(1500 → 00:25:00, 3723 → 01:02:03, 359999 → 99:59:59), props 가 바뀌면 따라감, 묶음 이름·칸 aria-label·힌트·inputMode·maxLength, ja·en 이름', () => {
    const { update, unmount } = renderInput(1500)
    // ⓐ 화면
    expect(values()).toEqual(['00', '25', '00'])
    expect(group()).toHaveAttribute('aria-describedby', 'timer-duration-msg')
    for (const f of fields()) {
      expect(group()).toContainElement(f)
      expect(f).toHaveAttribute('type', 'text')
      expect(f).toHaveAttribute('inputmode', 'numeric')
      expect(f).toHaveAttribute('maxlength', '2')
      expect(f).toHaveAttribute('autocomplete', 'off')
      expect(f).toBeEnabled()
      expect(f).not.toHaveAttribute('aria-invalid')
    }
    expect(screen.getByText(HINT)).toBeInTheDocument()
    expect(msg()).toHaveAttribute('aria-live', 'polite')
    expect(msg().textContent).toBe('')
    // ⓑ 상태: 저장값 동기 — props(settings://changed 로 온 새 저장값)를 그대로 보인다
    update(3723)
    expect(values()).toEqual(['01', '02', '03'])
    update(359_999)
    expect(values()).toEqual(['99', '59', '59'])
    unmount()
    // ja·en(i18n §4.10 — 사전 값으로 대조, 검수 필요)
    for (const [lang, d] of [
      ['ja', ja],
      ['en', en],
    ] as const) {
      const r = renderInput(1500, false, lang)
      expect(group(d.timerDuration)).toBeInTheDocument()
      expect(fields([d.timerHoursAria, d.timerMinutesAria, d.timerSecondsAria]).map(f => f.value)).toEqual(['00', '25', '00'])
      expect(screen.getByText(d.timerDurationHint)).toBeInTheDocument()
      r.unmount()
    }
    // ⓒ 저장 콜백 0회
    expect(onCommit).not.toHaveBeenCalled()
  })
})

describe('CountdownTimeInput — 저장 (R-50, §14.7.2 commit·onGroupBlur·onFieldKeyDown)', () => {
  it('TC-274: 칸 사이 Tab 은 0회 → 묶음 밖으로 나가면 onCommit(3723) 1회(정수) → 저장 중·성공 뒤 01:02:03 유지(튀지 않음) · 같은 값·입력 없음 0회 · Enter 1회 + 대기 중 blur 추가 0회(saving)', async () => {
    const { update } = renderInput(1500)
    // 칸 사이 이동 — 저장 안 함
    type('시', '01')
    tabTo('시', '분')
    type('분', '02')
    tabTo('분', '초')
    type('초', '03')
    expect(onCommit).not.toHaveBeenCalled()
    expect(values()).toEqual(['01', '02', '03'])
    // 묶음 밖 → 1회
    const save = deferred<boolean>()
    onCommit.mockReturnValueOnce(save.promise)
    leave('초')
    // ⓒ 저장 콜백 인자 = parseHmsDraft 결과(정수)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(3723)
    expect(Number.isInteger(onCommit.mock.calls[0][0])).toBe(true)
    // ⓐ 저장 중 입력값 유지
    expect(values()).toEqual(['01', '02', '03'])
    await act(async () => save.resolve(true))
    // ⓑ 성공 → draft 유지(props 가 아직 1500 이어도 옛 값으로 튀지 않음) → 새 저장값 수신 뒤에도 같음
    expect(values()).toEqual(['01', '02', '03'])
    update(3723)
    expect(values()).toEqual(['01', '02', '03'])
    // 입력 없이 나감 · 저장값과 같은 값 → 0회
    leave('시')
    type('초', '03')
    leave('초')
    expect(onCommit).toHaveBeenCalledTimes(1)
    // Enter → 1회(preventDefault) → 저장 대기 중 묶음 밖 blur → 추가 0회
    const save2 = deferred<boolean>()
    onCommit.mockReturnValueOnce(save2.promise)
    type('초', '04')
    expect(fireEvent.keyDown(field('초'), { key: 'Enter' })).toBe(false) // 기본 동작 막음
    expect(onCommit).toHaveBeenCalledTimes(2)
    expect(onCommit).toHaveBeenLastCalledWith(3724)
    leave('초')
    expect(onCommit).toHaveBeenCalledTimes(2)
    expect(values()).toEqual(['01', '02', '04'])
    await act(async () => save2.resolve(true))
    update(3724)
    expect(values()).toEqual(['01', '02', '04'])
    expect(msg().textContent).toBe('')
  })

  it('TC-275: 되돌림 — 00:00:00·분 60·문자·세 자리 → onCommit 0회, 칸 = 저장값, timerDurationInvalid(aria-invalid·msgError), 다시 입력하면 안내 지움 · 빈칸 = 0 · 저장 실패(false) → 옛 저장값, 안내 없음', async () => {
    const { update } = renderInput(1500)
    const expectReverted = () => {
      expect(values()).toEqual(['00', '25', '00'])
      expect(msg().textContent).toBe(INVALID)
      expect(msg().className).toMatch(/msgError/)
      for (const f of fields()) expect(f).toHaveAttribute('aria-invalid', 'true')
    }
    // 합계 0
    type('시', '00')
    type('분', '00')
    type('초', '00')
    leave()
    expectReverted()
    // 다시 입력 → 안내 지움
    type('분', '3')
    expect(msg().textContent).toBe('')
    for (const f of fields()) expect(f).not.toHaveAttribute('aria-invalid')
    // 분 60
    type('분', '60')
    leave('분')
    expectReverted()
    // 문자
    type('시', '1a')
    leave('시')
    expectReverted()
    // 세 자리(maxLength 우회 입력)
    type('시', '100')
    leave('시')
    expectReverted()
    expect(onCommit).not.toHaveBeenCalled()
    // 빈칸 = 0 → 00:00:05 = 5
    type('시', '')
    type('분', '0')
    type('초', '5')
    leave()
    await flush()
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenLastCalledWith(5)
    update(5)
    expect(values()).toEqual(['00', '00', '05'])
    // 저장 실패 → 옛 저장값(00:00:05), 되돌림 안내는 띄우지 않음(오류 줄은 TimerTab.saveTimer)
    onCommit.mockResolvedValueOnce(false)
    type('분', '07')
    leave('분')
    expect(onCommit).toHaveBeenLastCalledWith(425)
    await flush()
    expect(values()).toEqual(['00', '00', '05'])
    expect(msg().textContent).toBe('')
    expect(msg().className).not.toMatch(/msgError/)
    expect(onCommit).toHaveBeenCalledTimes(2)
  })
})

describe('CountdownTimeInput — 잠금 (R-50, §14.7.2 잠금 정리 효과·§14.8)', () => {
  it('TC-276(컴포넌트): locked → 세 칸 disabled·timerDurationLocked(msgError 아님), 입력 중 값·되돌림 안내를 버림 → 풀리면 저장값·빈 안내', () => {
    const { update } = renderInput(1500, false)
    type('시', '01')
    expect(values()).toEqual(['01', '25', '00'])
    update(1500, true)
    // ⓐ 잠김
    for (const f of fields()) expect(f).toBeDisabled()
    expect(values()).toEqual(['00', '25', '00']) // ⓑ draft 버림
    expect(msg().textContent).toBe(LOCKED)
    expect(msg().className).not.toMatch(/msgError/)
    update(1500, false)
    for (const f of fields()) expect(f).toBeEnabled()
    expect(msg().textContent).toBe('')
    // 되돌림 안내 뒤 잠기면 잠김 안내만, 풀리면 빈 안내(invalid 도 버림)
    type('분', '60')
    leave('분')
    expect(msg().textContent).toBe(INVALID)
    update(1500, true)
    expect(msg().textContent).toBe(LOCKED)
    update(1500, false)
    expect(msg().textContent).toBe('')
    for (const f of fields()) expect(f).not.toHaveAttribute('aria-invalid')
    // ⓒ 저장 콜백 0회
    expect(onCommit).not.toHaveBeenCalled()
  })

  // §14.7.2 commit 첫 줄 가드 — 포커스가 있던 칸이 disabled 가 되는 순간 WebView2 가 blur 를 쏠 수 있다(검증 예 끝 행)
  it('TC-276(컴포넌트 가드): 입력 중 locked 재렌더 뒤 묶음 blur → onCommit 0회·칸 = 저장값·잠김 안내 / 잠긴 채 남은 입력(합성) → blur·Enter 모두 0회·aria-invalid 없음(invalid 불변)', async () => {
    const { update } = renderInput(1500, false)
    // ① 칸 입력 → locked true 재렌더 → 그룹 blur(relatedTarget null)
    type('시', '01')
    update(1500, true)
    leave('시')
    await flush()
    expect(onCommit).not.toHaveBeenCalled()
    // ⓐ·ⓑ 칸 = 저장값(잠금 정리 효과) · 잠김 안내
    expect(values()).toEqual(['00', '25', '00'])
    expect(msg().textContent).toBe(LOCKED)
    // ② 가드 격리 — 잠긴 채 draft 가 남은 경우(합성 change: 실제 사용자는 disabled 칸에 입력할 수 없다, 컴포넌트 계약 테스트)
    type('시', '01') // 가드가 없으면 01:25:00 = 5100 저장
    leave('시')
    fireEvent.keyDown(field('시'), { key: 'Enter' })
    type('분', '60') // 가드가 없으면 되돌림(invalid true → aria-invalid)
    leave('분')
    await flush()
    // ⓒ 저장 콜백 0회 · ⓐ invalid 불변(aria-invalid 없음·msgError 아님·잠김 안내 그대로)
    expect(onCommit).not.toHaveBeenCalled()
    for (const f of fields()) expect(f).not.toHaveAttribute('aria-invalid')
    expect(msg().textContent).toBe(LOCKED)
    expect(msg().className).not.toMatch(/msgError/)
  })
})

// CR-052(확정사항 CR-048 블록 「수정 (CR-052)」 🔒 · timer-tab §14.16 `CountdownTimeInput.inactive`): 타이머 모드가 아닐 때
// (스톱워치·둘 다 꺼짐)는 흐르는 중 잠김과 같은 회색 비활성 — off = locked ∥ inactive. 안내 줄은 locked 만 문구, inactive 는 빈 값.
// inactive 판정(!countdownOn)의 상태별 사례는 TimerTab.test.tsx TC-276(탭). 여기서는 locked=false 로 두고 inactive prop 만 바꾼다.
describe('CountdownTimeInput — 타이머 모드 아님 비활성 (R-50, §14.16 inactive · §14.7.2 잠금 정리 효과·commit 첫 줄 가드)', () => {
  const treeI = (secs: number, inactive?: boolean) => (
    <CountdownTimeInput
      secs={secs}
      locked={false}
      {...(inactive === undefined ? {} : { inactive })}
      onCommit={onCommit as (s: number) => Promise<boolean>}
    />
  )
  const row = () => (document.getElementById('timer-duration-label') as HTMLElement).parentElement as HTMLElement

  it('TC-288: inactive → 세 칸 disabled·aria-disabled="true", group aria-disabled="true", 행 className = locked 때와 같음(durationOff), 라벨·힌트 보임·값 = 저장값, 안내 줄 빈 값(msgError 아님) · 생략 = 활성(aria-disabled 없음) · 입력 중 값·되돌림 안내 버림 → 다시 활성이면 저장값·빈 안내 · 비활성 중 blur·Enter → onCommit 0회', async () => {
    // 대조 기준 — locked 일 때 행 className(같은 durationOff 클래스를 쓰는지)
    const lockedView = render(tree(1500, true))
    const lockedClass = row().className
    expect(lockedClass).toMatch(/durationOff/)
    lockedView.unmount()

    // ① inactive 생략 → 활성(기본 false)
    const u = render(treeI(1500))
    for (const f of fields()) {
      expect(f).toBeEnabled()
      expect(f).not.toHaveAttribute('aria-disabled')
    }
    expect(group()).not.toHaveAttribute('aria-disabled')
    expect(row().className).not.toMatch(/durationOff/)

    // ② 입력 중(시 01) → inactive true
    type('시', '01')
    expect(values()).toEqual(['01', '25', '00'])
    u.rerender(treeI(1500, true))
    // ⓐ 화면 — 회색 비활성(잠김과 같은 표시), 라벨·힌트는 그대로 보임
    for (const f of fields()) {
      expect(f).toBeDisabled()
      expect(f).toHaveAttribute('aria-disabled', 'true')
      expect(f).not.toHaveAttribute('aria-invalid')
    }
    expect(group()).toHaveAttribute('aria-disabled', 'true')
    expect(row().className).toBe(lockedClass)
    expect(document.getElementById('timer-duration-label')).toHaveTextContent('시작 시간')
    expect(screen.getByText(HINT)).toBeInTheDocument()
    // ⓑ 입력 중 값 버림 → 저장값, 안내 줄 빈 값(잠김 문구 아님)·msgError 아님
    expect(values()).toEqual(['00', '25', '00'])
    expect(msg().textContent).toBe('')
    expect(msg().className).not.toMatch(/msgError/)
    // 비활성이어도 값 = 저장값(props 를 따라감)
    u.rerender(treeI(3723, true))
    expect(values()).toEqual(['01', '02', '03'])

    // ③ 다시 활성 → 저장값·빈 안내
    u.rerender(treeI(3723, false))
    for (const f of fields()) {
      expect(f).toBeEnabled()
      expect(f).not.toHaveAttribute('aria-disabled')
    }
    expect(group()).not.toHaveAttribute('aria-disabled')
    expect(row().className).not.toMatch(/durationOff/)
    expect(values()).toEqual(['01', '02', '03'])
    expect(msg().textContent).toBe('')

    // ④ 되돌림 안내 표시 중 비활성 → 안내·aria-invalid 버림(빈 값), 다시 활성에도 빈 값
    type('분', '60')
    leave('분')
    expect(msg().textContent).toBe(INVALID)
    u.rerender(treeI(3723, true))
    expect(msg().textContent).toBe('')
    expect(msg().className).not.toMatch(/msgError/)
    for (const f of fields()) expect(f).not.toHaveAttribute('aria-invalid')
    u.rerender(treeI(3723, false))
    expect(msg().textContent).toBe('')
    for (const f of fields()) expect(f).not.toHaveAttribute('aria-invalid')

    // ⑤ commit 첫 줄 가드(off) — 비활성 중 합성 입력(실제 사용자는 disabled 칸에 입력할 수 없다) → blur·Enter
    u.rerender(treeI(3723, true))
    type('시', '05') // 가드가 없으면 05:02:03 = 18123 저장
    leave('시')
    fireEvent.keyDown(field('시'), { key: 'Enter' })
    type('분', '60') // 가드가 없으면 되돌림(aria-invalid·INVALID)
    leave('분')
    await flush()
    // ⓒ 저장 콜백 0회 · ⓐ 안내 빈 값·aria-invalid 없음
    expect(onCommit).not.toHaveBeenCalled()
    expect(msg().textContent).toBe('')
    for (const f of fields()) expect(f).not.toHaveAttribute('aria-invalid')
  })
})
