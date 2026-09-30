/**
 * SettingsApp 초기 조회 재시도(CR-039) — 설정 창은 앱 시작 때 숨긴 채 만들어져 core 준비 전에 조회할 수 있다.
 * 첫 시도 + 실패 시 200·500·1000ms 뒤 재시도(최대 4번 시도), 설정·매니페스트는 따로 판정, 4번 모두 실패할 때만 오류 줄,
 * 언마운트 때 대기 타이머 취소(design.md §6 P-1 — 2026-09-30 doc-sync).
 * 시나리오: src/settings/test/scenarios.md 「doc-sync 개정(v28)」 절 TC-306 · TC-308 · TC-309 · TC-310(대기열 Q-02 전환).
 *   (이동) 옛 가번호 TC-208 · TC-209(ui-fixer 초안)는 CR-040 alphaMask TC-208 · TC-209와 번호가 겹쳐 TC-306 · TC-308로 옮겼다.
 *   TC-307은 결번(CR 대장 CR-052 검증 칸의 기존 「TC-307」 표기와 충돌 방지).
 * bridge 는 mock. 시간은 가짜 시계(vi.useFakeTimers). 실제 sleep 없음.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BridgeError } from 'bridge/types'
import { DEFAULT_SETTINGS, getAssetManifest, getSettings, setSettings, setSettingsWindowTitle } from 'bridge'
import SettingsApp from '../index'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))
vi.mock('bridge/commands', async importOriginal => {
  const actual = await importOriginal<typeof import('bridge/commands')>()
  return {
    ...actual,
    getSettings: vi.fn(),
    setSettings: vi.fn(),
    getAssetManifest: vi.fn(),
    setSettingsWindowTitle: vi.fn(),
  }
})
vi.mock('bridge/events', () => {
  const sub = () => Promise.resolve(() => undefined)
  return {
    EVENTS: {},
    onKeyboard: vi.fn(sub),
    onMouseMove: vi.fn(sub),
    onMouseButton: vi.fn(sub),
    onSettingsChanged: vi.fn(sub),
    onAssetsChanged: vi.fn(sub),
    onHandAnchorChanged: vi.fn(sub),
  }
})

const ERR: BridgeError = { code: 'settings.io', message: '설정 파일을 읽지 못했습니다.' }
const ERR_M: BridgeError = { code: 'asset.manifest', message: '이미지 목록을 읽지 못했습니다.' }

const flush = () =>
  act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  })
const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
  await flush()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.clearAllMocks()
  vi.mocked(getSettings).mockResolvedValue({ ...DEFAULT_SETTINGS, language: 'ko' })
  vi.mocked(getAssetManifest).mockResolvedValue({ canvas: null, entries: [] })
  vi.mocked(setSettingsWindowTitle).mockResolvedValue(undefined)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('CR-039 초기 조회 재시도 (design §6 P-1)', () => {
  // (이동) 옛 가번호 TC-208 → TC-306
  it('TC-306: 첫 조회 실패 → 200ms 뒤 재시도 성공 → 오류 줄 없음, 성공 뒤 추가 조회 없음', async () => {
    vi.mocked(getSettings).mockRejectedValueOnce(ERR)
    render(<SettingsApp />)
    await flush()
    expect(screen.queryByRole('alert')).toBeNull()
    await advance(199)
    expect(getSettings).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(getSettings).toHaveBeenCalledTimes(2)
    await advance(5_000)
    expect(getSettings).toHaveBeenCalledTimes(2)
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
  })

  // (이동) 옛 가번호 TC-209 → TC-308
  it('TC-308: 계속 실패하면 최초 1회 + 재시도 3회(최대 4번) 뒤에만 오류 줄, 그 뒤 추가 조회 없음', async () => {
    vi.mocked(getSettings).mockRejectedValue(ERR)
    render(<SettingsApp />)
    await flush()
    await advance(200)
    await advance(500)
    expect(getSettings).toHaveBeenCalledTimes(3)
    expect(screen.queryByRole('alert')).toBeNull()
    await advance(1_000)
    expect(getSettings).toHaveBeenCalledTimes(4)
    expect(screen.getByRole('alert').textContent).toBe('오류: 설정 파일을 읽지 못했습니다.')
    await advance(5_000)
    expect(getSettings).toHaveBeenCalledTimes(4)
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-309: 설정·매니페스트는 따로 판정 — 매니페스트만 계속 실패하면 설정은 첫 조회로 반영(재조회 없음), 매니페스트 4번째 실패 뒤에만 오류 줄 1개', async () => {
    document.documentElement.lang = ''
    vi.mocked(getSettings).mockResolvedValue({ ...DEFAULT_SETTINGS, language: 'ja' })
    vi.mocked(getAssetManifest).mockRejectedValue(ERR_M)
    render(<SettingsApp />)
    await flush()
    // ⓑ 설정 조회 성공은 매니페스트 실패와 무관하게 즉시 반영(저장된 언어 → <html lang>)
    expect(document.documentElement.lang).toBe('ja')
    expect(screen.queryByRole('alert')).toBeNull()
    await advance(200)
    await advance(500)
    expect(getAssetManifest).toHaveBeenCalledTimes(3)
    expect(screen.queryByRole('alert')).toBeNull()
    await advance(1_000)
    expect(getAssetManifest).toHaveBeenCalledTimes(4)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    await advance(5_000)
    expect(getAssetManifest).toHaveBeenCalledTimes(4)
    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-310: 재시도 대기 중 언마운트 → 대기 타이머 취소, 이후 조회·오류 줄 없음', async () => {
    vi.mocked(getSettings).mockRejectedValue(ERR)
    const { unmount } = render(<SettingsApp />)
    await flush()
    expect(getSettings).toHaveBeenCalledTimes(1)
    unmount()
    await advance(5_000)
    expect(getSettings).toHaveBeenCalledTimes(1)
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
  })
})
