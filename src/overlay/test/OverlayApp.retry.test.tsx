/**
 * OverlayApp 초기 조회 재시도(CR-039) — 앱 시작 직후 core 준비 전에 조회가 실패해도 200·500·1000ms 간격으로
 * 최대 3회 다시 조회해 그림을 그린다. 끝내 실패하면 빈 투명 창(문구 없음), 언마운트하면 재시도를 멈춘다.
 * 시나리오: src/overlay/test/scenarios.md TC-248 ~ TC-251(CR-039)
 * bridge 는 mock. 시간은 가짜 시계(vi.useFakeTimers). 실제 sleep 없음.
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  getAssetManifest,
  getHandAnchor,
  getMonitors,
  getSettings,
  slotKey,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type Settings,
} from 'bridge'
import OverlayApp from '../index'

vi.mock('bridge/commands', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  getAssetManifest: vi.fn(),
  getMonitors: vi.fn(),
  getHandAnchor: vi.fn(),
  // CR-045(scenarios v1.8): OverlayApp 마운트·쉬는중 전이 때 setResting, TimerText가 getTimer — 이 스펙은 관찰하지 않는다(초기화 영향 없는 일반 함수)
  getTimer: () => Promise.resolve({ status: 'stopped', elapsedMs: 0 }),
  setResting: () => Promise.resolve({ status: 'stopped', elapsedMs: 0 }),
  // CR-050(scenarios v1.9): TimerText → useAlarmOnFinish가 finished 진입 이벤트 때 부른다 — 이 스펙은 관찰하지 않는다(일반 함수)
  getAlarmSound: () => Promise.resolve(null),
}))
vi.mock('bridge/events', () => {
  const sub = () => Promise.resolve(() => undefined)
  return {
    onTimerChanged: sub,
    EVENTS: {},
    onKeyboard: vi.fn(sub),
    onMouseMove: vi.fn(sub),
    onMouseButton: vi.fn(sub),
    onSettingsChanged: vi.fn(sub),
    onAssetsChanged: vi.fn(sub),
    onHandAnchorChanged: vi.fn(sub),
  }
})
vi.mock('../overlay.module.css', () => ({
  default: { root: 'root', canvas: 'canvas', layer: 'layer', hand: 'hand', armWrap: 'armWrap', jellyWrap: 'jellyWrap' },
}))

const entry = (slot: AssetSlot): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width: 900,
  height: 700,
  bytes: 1,
  url: `u:${slotKey(slot)}`,
})
const MANIFEST: AssetManifest = {
  canvas: { width: 900, height: 700 },
  entries: [entry('body'), entry('idle'), entry('kb_up')],
}
const SETTINGS: Settings = { ...DEFAULT_SETTINGS, scale: 1 }
const ERR = { code: 'IO', message: 'core not ready' }

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
const canvas = (c: HTMLElement) => c.querySelector('.canvas')
const bodyImg = (c: HTMLElement) => c.querySelector('img[src="u:body"]')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  vi.clearAllMocks()
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(MANIFEST)
  vi.mocked(getMonitors).mockResolvedValue([{ x: 0, y: 0, width: 1920, height: 1080 }])
  vi.mocked(getHandAnchor).mockResolvedValue({ x: 0, y: 0 })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('CR-039 초기 조회 재시도', () => {
  it('TC-248: 첫 조회 실패 → 200ms 뒤 재시도 성공 → 캔버스와 그림을 그린다, 성공 뒤 추가 조회 없음', async () => {
    vi.mocked(getAssetManifest).mockRejectedValueOnce(ERR)
    vi.mocked(getSettings).mockRejectedValueOnce(ERR)
    const { container } = render(<OverlayApp />)
    await flush()
    expect(canvas(container)).toBeNull()
    expect(getAssetManifest).toHaveBeenCalledTimes(1)

    await advance(199)
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(getAssetManifest).toHaveBeenCalledTimes(2)
    expect(getSettings).toHaveBeenCalledTimes(2)
    expect(canvas(container)).not.toBeNull()
    expect(bodyImg(container)).not.toBeNull()
    expect(container.textContent).toBe('')

    // 성공한 뒤에는 더 조회하지 않는다. 처음부터 성공한 getMonitors 는 1회뿐(조회마다 따로 재시도)
    await advance(5_000)
    expect(getAssetManifest).toHaveBeenCalledTimes(2)
    expect(getSettings).toHaveBeenCalledTimes(2)
    expect(getMonitors).toHaveBeenCalledTimes(1)
    expect(getMonitors).toHaveBeenCalledWith()
  })

  it('TC-249: 세 번째 재시도(200·500·1000ms 뒤)에서 성공해도 그림을 그린다', async () => {
    vi.mocked(getAssetManifest)
      .mockRejectedValueOnce(ERR)
      .mockRejectedValueOnce(ERR)
      .mockRejectedValueOnce(ERR)
    const { container } = render(<OverlayApp />)
    await flush()
    await advance(200)
    await advance(500)
    expect(getAssetManifest).toHaveBeenCalledTimes(3)
    expect(canvas(container)).toBeNull()
    await advance(1_000)
    expect(getAssetManifest).toHaveBeenCalledTimes(4)
    expect(bodyImg(container)).not.toBeNull()
    await advance(5_000)
    expect(getAssetManifest).toHaveBeenCalledTimes(4)
    expect(getSettings).toHaveBeenCalledTimes(1)
  })

  it('TC-250: 계속 실패하면 최초 1회 + 재시도 3회에서 멈추고 빈 투명 창(문구 없음)', async () => {
    vi.mocked(getAssetManifest).mockRejectedValue(ERR)
    const { container } = render(<OverlayApp />)
    await flush()
    // 재시도 타이머는 앞 조회가 실패한 뒤에야 걸리므로 간격마다 나눠 진행한다
    for (let i = 0; i < 6; i++) await advance(2_000)
    expect(getAssetManifest).toHaveBeenCalledTimes(4)
    for (const fn of [getSettings, getMonitors]) expect(fn).toHaveBeenCalledTimes(1)
    expect(canvas(container)).toBeNull()
    expect(container.textContent).toBe('')
  })

  it('TC-251: 언마운트하면 대기 중인 재시도를 취소한다', async () => {
    vi.mocked(getAssetManifest).mockRejectedValue(ERR)
    const { unmount } = render(<OverlayApp />)
    await flush()
    unmount()
    await advance(10_000)
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
  })
})
