/**
 * 프리셋 카드 한 장(PresetCard) 컴포넌트 스펙 — CR-064 · R-59 · R-64 · R-66 · R-67.
 * 기준: src/settings/design/presets-tab.md §2.2(props)·§5.3(meta·aria·onDraftKeyDown·편집 입력·포커스 효과)·§7.1·§8
 *       · design/i18n.md §4.12 · scenarios.md 「v30 개정」 절 TC-347 ~ TC-350.
 * 순수 표시 컴포넌트 — bridge 호출 없음(부모 PresetsTab 가 콜백으로 받는다). 가짜 시계 없음.
 * 구현 전 Red 가 정상: components/PresetCard.tsx 가 없으면 import 가 실패한다.
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { PresetSummary } from 'bridge/types'
import PresetCard from '../components/PresetCard'
import { formatSavedAt } from '../presetValues'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))

const P: PresetSummary = { id: 'p1', name: '고양이 A', savedAt: Date.UTC(2026, 8, 30, 3, 0), imageCount: 12, hasAlarm: true }
const P_NO_ALARM: PresetSummary = { ...P, id: 'p2', name: '고양이 B', imageCount: 1, hasAlarm: false }
const ACTIONS = ['적용', '내보내기', '이름 바꾸기', '삭제'] as const

type Target = 'apply' | 'export' | 'rename' | 'delete' | 'renameInput' | null
let cb: Record<
  'onFocused' | 'onApply' | 'onExport' | 'onStartRename' | 'onDelete' | 'onRenameDraft' | 'onRenameSave' | 'onRenameCancel',
  Mock
>
beforeEach(() => {
  vi.resetAllMocks()
  cb = {
    onFocused: vi.fn(),
    onApply: vi.fn(),
    onExport: vi.fn(),
    onStartRename: vi.fn(),
    onDelete: vi.fn(),
    onRenameDraft: vi.fn(),
    onRenameSave: vi.fn(),
    onRenameCancel: vi.fn(),
  }
})

const el = (o: { preset?: PresetSummary; pending?: boolean; renaming?: boolean; renameDraft?: string; focusTarget?: Target } = {}) => (
  <ul>
    <PresetCard
      preset={o.preset ?? P}
      pending={o.pending ?? false}
      renaming={o.renaming ?? false}
      renameDraft={o.renameDraft ?? ''}
      focusTarget={o.focusTarget ?? null}
      {...cb}
    />
  </ul>
)
const li = (name = P.name) => screen.getByRole('listitem', { name })
const btn = (action: string, name = P.name) => within(li(name)).getByRole('button', { name: `${action}: ${name}` })
const draftInput = (name = P.name) => within(li(name)).getByRole('textbox', { name: `「${name}」의 새 이름` })

describe('PresetCard — 표시 (§5.3 meta·aria, R-59 · R-66 · R-67)', () => {
  it('TC-347: 이름 h3(li 접근 이름)·요약 줄 「저장 {date} · 그림 {n}장 · 알림음 있음/없음」·버튼 4개(보이는 글자 = 동사, aria-label = 「{동사}: {이름}」, type=button)·「사용 중」 표시 없음', () => {
    const r = render(el())
    expect(within(li()).getByRole('heading', { level: 3 }).textContent).toBe('고양이 A')
    expect(within(li()).getByText(`저장 ${formatSavedAt(P.savedAt, 'ko')} · 그림 12장 · 알림음 있음`)).toBeInTheDocument()
    const btns = within(li()).getAllByRole('button')
    expect(btns.map(b => b.textContent)).toEqual([...ACTIONS])
    btns.forEach((b, i) => {
      expect(b).toHaveAttribute('type', 'button')
      expect(b).toHaveAccessibleName(`${ACTIONS[i]}: 고양이 A`)
      expect(b).toBeEnabled()
    })
    expect(li()).not.toHaveAttribute('aria-current')
    expect(li().textContent).not.toMatch(/사용 중/)
    expect(within(li()).queryByRole('textbox')).toBeNull()
    r.rerender(el({ preset: P_NO_ALARM }))
    expect(within(li('고양이 B')).getByText(`저장 ${formatSavedAt(P.savedAt, 'ko')} · 그림 1장 · 알림음 없음`)).toBeInTheDocument()
    for (const f of Object.values(cb)) expect(f).not.toHaveBeenCalled()
  })
})

describe('PresetCard — 버튼·활성 (§2.2 · §7.1, R-66 · R-64)', () => {
  it('TC-348: 버튼 4개는 각자 콜백 1회만, pending 이면 모두 비활성(편집 입력 readOnly·편집 저장/취소 비활성), 편집 중이면 그 카드 「이름 바꾸기」만 비활성', () => {
    const r = render(el())
    const map: [string, Mock][] = [
      ['적용', cb.onApply],
      ['내보내기', cb.onExport],
      ['이름 바꾸기', cb.onStartRename],
      ['삭제', cb.onDelete],
    ]
    for (const [action, f] of map) {
      fireEvent.click(btn(action))
      expect(f, action).toHaveBeenCalledTimes(1)
      expect(f, action).toHaveBeenCalledWith()
    }
    r.rerender(el({ pending: true }))
    for (const a of ACTIONS) expect(btn(a)).toBeDisabled()
    // 편집 중
    r.rerender(el({ renaming: true, renameDraft: '고양이 A' }))
    expect(btn('이름 바꾸기')).toBeDisabled()
    for (const a of ['적용', '내보내기', '삭제']) expect(btn(a)).toBeEnabled()
    expect(within(li()).getByRole('button', { name: '저장' })).toBeEnabled()
    expect(within(li()).getByRole('button', { name: '취소' })).toBeEnabled()
    expect(draftInput()).not.toHaveAttribute('readonly')
    expect(within(li()).getByRole('heading', { level: 3, hidden: true }).textContent).toBe('고양이 A') // DOM 유지
    r.rerender(el({ renaming: true, renameDraft: '고양이 A', pending: true }))
    expect(draftInput()).toHaveAttribute('readonly')
    expect(within(li()).getByRole('button', { name: '저장' })).toBeDisabled()
    expect(within(li()).getByRole('button', { name: '취소' })).toBeDisabled()
    for (const a of ACTIONS) expect(btn(a)).toBeDisabled()
  })
})

describe('PresetCard — 인라인 편집 (§5.3 onDraftKeyDown, R-64)', () => {
  it('TC-349: 입력 → onRenameDraft(값), Enter(저장 가능) → onRenameSave, Enter(빈 초안) → 0회·저장 비활성, Esc → onRenameCancel, 조합 중 Enter·Esc → 둘 다 0회, 「취소」 클릭 → onRenameCancel', () => {
    const r = render(el({ renaming: true, renameDraft: '고양이 A' }))
    expect((draftInput() as HTMLInputElement).value).toBe('고양이 A')
    expect(draftInput()).toHaveAttribute('maxlength', '50')
    fireEvent.change(draftInput(), { target: { value: '고양이 A2' } })
    expect(cb.onRenameDraft).toHaveBeenCalledWith('고양이 A2')
    fireEvent.keyDown(draftInput(), { key: 'Enter', isComposing: true })
    fireEvent.keyDown(draftInput(), { key: 'Escape', isComposing: true })
    expect(cb.onRenameSave).not.toHaveBeenCalled()
    expect(cb.onRenameCancel).not.toHaveBeenCalled()
    expect(fireEvent.keyDown(draftInput(), { key: 'Enter' })).toBe(false) // preventDefault
    expect(cb.onRenameSave).toHaveBeenCalledTimes(1)
    expect(fireEvent.keyDown(draftInput(), { key: 'Escape' })).toBe(false)
    expect(cb.onRenameCancel).toHaveBeenCalledTimes(1)
    fireEvent.click(within(li()).getByRole('button', { name: '저장' }))
    expect(cb.onRenameSave).toHaveBeenCalledTimes(2)
    fireEvent.click(within(li()).getByRole('button', { name: '취소' }))
    expect(cb.onRenameCancel).toHaveBeenCalledTimes(2)
    r.rerender(el({ renaming: true, renameDraft: '   ' }))
    expect(within(li()).getByRole('button', { name: '저장' })).toBeDisabled()
    fireEvent.keyDown(draftInput(), { key: 'Enter' })
    expect(cb.onRenameSave).toHaveBeenCalledTimes(2)
  })
})

describe('PresetCard — 포커스 요청 (§5.3 포커스 효과 · §8.2, R-66)', () => {
  it.each([
    ['apply', '적용'],
    ['export', '내보내기'],
    ['rename', '이름 바꾸기'],
    ['delete', '삭제'],
  ] as const)('TC-350(%s): focusTarget → 그 버튼에 포커스 · onFocused 1회', (target, action) => {
    render(el({ focusTarget: target }))
    expect(btn(action)).toHaveFocus()
    expect(cb.onFocused).toHaveBeenCalledTimes(1)
  })

  it('TC-350(renameInput·pending): renameInput → 편집 입력 포커스 · pending 중에는 옮기지 않고 onFocused 0회, pending 이 풀린 렌더에서 옮긴다', () => {
    const r = render(el({ focusTarget: 'apply', pending: true }))
    expect(btn('적용')).not.toHaveFocus()
    expect(cb.onFocused).not.toHaveBeenCalled()
    r.rerender(el({ focusTarget: 'apply', pending: false }))
    expect(btn('적용')).toHaveFocus()
    expect(cb.onFocused).toHaveBeenCalledTimes(1)
    btn('삭제').focus()
    r.rerender(el({ renaming: true, renameDraft: '다른 이름', focusTarget: 'renameInput' }))
    expect(draftInput()).toHaveFocus()
    expect(cb.onFocused).toHaveBeenCalledTimes(2)
  })
})
