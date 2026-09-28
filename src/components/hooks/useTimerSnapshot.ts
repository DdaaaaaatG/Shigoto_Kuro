/**
 * 뽀모도·타이머 모드 스냅숏 구독(design.md §10.14 14.4·§10.15, design/functions.md §5.6·§5.7 ③,
 * contract v0.21 §5.8-3) — onTimerChanged 구독을 완료한 뒤에만 getTimer를 조회한다(구독 전에 이벤트가
 * 오면 조회 결과는 버린다). 구독 완료 시점을 알아야 하므로 공용 이벤트 구독 훅 대신 이 파일 안에서 직접
 * 구독·해제한다. (CR-050) fromEvent — 이벤트로 받았으면 true, 초기값·조회 결과는 false. useAlarmOnFinish가
 * 「첫 조회 결과가 finished면 울리지 않는다」(R-39)를 이 값으로 판정한다.
 */
import { useEffect, useState } from 'react'
import { getTimer, onTimerChanged, type TimerSnapshot } from 'bridge'
import { fetchWithRetry } from 'components/utils/fetchWithRetry'
import { nowMs } from 'components/utils/timerClock'

export type TimerSnapshotState = {
  snapshot: TimerSnapshot
  receivedAt: number
  fromEvent?: boolean
}

const INITIAL_STATE: TimerSnapshotState = {
  snapshot: { status: 'stopped', elapsedMs: 0 },
  receivedAt: 0,
  fromEvent: false,
}

export const useTimerSnapshot = (): TimerSnapshotState => {
  const [state, setState] = useState<TimerSnapshotState>(INITIAL_STATE)

  useEffect(() => {
    let cancelled = false
    let eventSeen = false
    let unlisten: (() => void) | undefined
    let cancelFetch: (() => void) | undefined

    const apply = (snapshot: TimerSnapshot, fromEvent: boolean) =>
      setState({ snapshot, receivedAt: nowMs(), fromEvent })

    const load = async () => {
      try {
        const unsubscribe = await onTimerChanged(snapshot => {
          if (cancelled) return
          eventSeen = true
          apply(snapshot, true)
        })
        if (cancelled) unsubscribe()
        else unlisten = unsubscribe
      } catch {
        // 구독 실패 — eventSeen은 계속 false로 남아 아래 조회 결과를 그대로 쓴다
      }
      // 구독 성공·실패 모두 조회한다(구독 먼저 → 조회). 조회 전에 이벤트가 왔으면 결과를 버린다
      cancelFetch = fetchWithRetry(getTimer, snapshot => {
        if (!cancelled && !eventSeen) apply(snapshot, false)
      })
    }
    load()

    return () => {
      cancelled = true
      unlisten?.()
      cancelFetch?.()
    }
  }, [])

  return state
}
