import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))

import { listen } from '@tauri-apps/api/event'
import { EVENTS, onHandAnchorChanged, onKeyboard, onTimerChanged } from '../events'
import type { HandAnchorEvent, KeyboardInputEvent, TimerSnapshot } from '../types'

const mockedListen = vi.mocked(listen)

describe('bridge/events — onHandAnchorChanged', () => {
  beforeEach(() => {
    mockedListen.mockReset()
  })

  it('assets://hand-anchor-changed 를 구독하고 payload 를 그대로 콜백에 넘긴다', async () => {
    const unlisten = vi.fn()
    mockedListen.mockResolvedValueOnce(unlisten)

    const handler = vi.fn()
    await onHandAnchorChanged(handler)

    expect(mockedListen).toHaveBeenCalledWith(EVENTS.handAnchorChanged, expect.any(Function))
    const emittedHandler = mockedListen.mock.calls[0][1] as (ev: { payload: HandAnchorEvent }) => void
    emittedHandler({ payload: { anchor: { x: 262.5, y: 1.5 } } })
    expect(handler).toHaveBeenCalledWith({ anchor: { x: 262.5, y: 1.5 } })
  })

  it('anchor 가 null 인 payload 도 그대로 전달한다', async () => {
    const unlisten = vi.fn()
    mockedListen.mockResolvedValueOnce(unlisten)

    const handler = vi.fn()
    await onHandAnchorChanged(handler)
    const emittedHandler = mockedListen.mock.calls[0][1] as (ev: { payload: HandAnchorEvent }) => void
    emittedHandler({ payload: { anchor: null } })
    expect(handler).toHaveBeenCalledWith({ anchor: null })
  })

  it('구독 해제 함수(unlisten)를 그대로 반환한다', async () => {
    const unlisten = vi.fn()
    mockedListen.mockResolvedValueOnce(unlisten)
    const result = await onHandAnchorChanged(vi.fn())
    expect(result).toBe(unlisten)
  })
})

describe('bridge/events — onKeyboard (v0.11, CR-021)', () => {
  beforeEach(() => {
    mockedListen.mockReset()
  })

  it('input://keyboard 를 구독하고 special 값을 그대로 콜백에 넘긴다', async () => {
    const unlisten = vi.fn()
    mockedListen.mockResolvedValueOnce(unlisten)

    const handler = vi.fn()
    await onKeyboard(handler)

    expect(mockedListen).toHaveBeenCalledWith(EVENTS.keyboard, expect.any(Function))
    const emittedHandler = mockedListen.mock.calls[0][1] as (ev: {
      payload: KeyboardInputEvent
    }) => void
    emittedHandler({
      payload: { pressed: true, heldCount: 2, special: 'undo', repeat: false, ts: 1_760_000_000_450 },
    })
    expect(handler).toHaveBeenCalledWith({
      pressed: true,
      heldCount: 2,
      special: 'undo',
      repeat: false,
      ts: 1_760_000_000_450,
    })
  })

  it('special 이 null 인 payload 도 그대로 전달한다(수식 키·그 밖의 키)', async () => {
    const unlisten = vi.fn()
    mockedListen.mockResolvedValueOnce(unlisten)

    const handler = vi.fn()
    await onKeyboard(handler)
    const emittedHandler = mockedListen.mock.calls[0][1] as (ev: {
      payload: KeyboardInputEvent
    }) => void
    emittedHandler({ payload: { pressed: true, heldCount: 1, special: null, repeat: false, ts: 400 } })
    expect(handler).toHaveBeenCalledWith({
      pressed: true,
      heldCount: 1,
      special: null,
      repeat: false,
      ts: 400,
    })
  })

  it('repeat: true 인 자동 반복 누름을 그대로 전달한다(v0.12, OV-R-24 · CR-023) — heldCount 불변·special 처음 값', async () => {
    const unlisten = vi.fn()
    mockedListen.mockResolvedValueOnce(unlisten)

    const handler = vi.fn()
    await onKeyboard(handler)
    const emittedHandler = mockedListen.mock.calls[0][1] as (ev: {
      payload: KeyboardInputEvent
    }) => void
    emittedHandler({
      payload: { pressed: true, heldCount: 1, special: 'space', repeat: true, ts: 1_760_000_000_500 },
    })
    expect(handler).toHaveBeenCalledWith({
      pressed: true,
      heldCount: 1,
      special: 'space',
      repeat: true,
      ts: 1_760_000_000_500,
    })
  })

  it('special 이 null 인 일반 키 반복도 repeat: true 로 온다', async () => {
    const unlisten = vi.fn()
    mockedListen.mockResolvedValueOnce(unlisten)

    const handler = vi.fn()
    await onKeyboard(handler)
    const emittedHandler = mockedListen.mock.calls[0][1] as (ev: {
      payload: KeyboardInputEvent
    }) => void
    emittedHandler({
      payload: { pressed: true, heldCount: 1, special: null, repeat: true, ts: 1_760_000_001_500 },
    })
    expect(handler).toHaveBeenCalledWith({
      pressed: true,
      heldCount: 1,
      special: null,
      repeat: true,
      ts: 1_760_000_001_500,
    })
  })
})

describe('bridge/events — onTimerChanged (v0.21, CR-045)', () => {
  beforeEach(() => {
    mockedListen.mockReset()
  })

  it('timer://changed 를 구독하고 payload 를 그대로 콜백에 넘긴다', async () => {
    const unlisten = vi.fn()
    mockedListen.mockResolvedValueOnce(unlisten)

    const handler = vi.fn()
    await onTimerChanged(handler)

    expect(mockedListen).toHaveBeenCalledWith(EVENTS.timerChanged, expect.any(Function))
    const emittedHandler = mockedListen.mock.calls[0][1] as (ev: {
      payload: TimerSnapshot
    }) => void
    emittedHandler({ payload: { status: 'running', elapsedMs: 83250 } })
    expect(handler).toHaveBeenCalledWith({ status: 'running', elapsedMs: 83250 })
  })

  it('구독 해제 함수(unlisten)를 그대로 반환한다', async () => {
    const unlisten = vi.fn()
    mockedListen.mockResolvedValueOnce(unlisten)
    const result = await onTimerChanged(vi.fn())
    expect(result).toBe(unlisten)
  })
})
