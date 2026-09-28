/**
 * SettingsApp 초기 조회 재시도(CR-039) — 설정 창은 앱 시작 때 숨긴 채 만들어져 core 준비 전에 조회할 수 있다.
 * 실패하면 200·500·1000ms 간격으로 최대 3회 재시도하고, 끝내 실패할 때만 오류 줄을 띄운다.
 * 시나리오: src/settings/test/scenarios.md TC-208 · TC-209(CR-039)
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

describe('CR-039 초기 조회 재시도', () => {
  it('TC-208: 첫 조회 실패 → 200ms 뒤 재시도 성공 → 오류 줄 없음, 성공 뒤 추가 조회 없음', async () => {
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

  it('TC-209: 계속 실패하면 최초 1회 + 재시도 3회 뒤에만 오류 줄', async () => {
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
})
