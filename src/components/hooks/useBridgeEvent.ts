/**
 * bridge 이벤트 구독을 React 생명주기에 묶는 훅.
 * 사용: useBridgeEvent(onKeyboard, e => ...)
 * - 핸들러는 ref 로 들고 있어 매 렌더마다 재구독하지 않는다.
 * - 언마운트 전에 구독이 완료되면 즉시 해제한다(경합 방지).
 */
import { useEffect, useRef } from 'react'
import type { Subscriber, UnlistenFn } from 'bridge/events'

export const useBridgeEvent = <T>(subscribe: Subscriber<T>, handler: (payload: T) => void) => {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    let active = true
    let unlisten: UnlistenFn | undefined

    subscribe(payload => handlerRef.current(payload)).then(fn => {
      if (active) unlisten = fn
      else fn()
    })

    return () => {
      active = false
      unlisten?.()
    }
  }, [subscribe])
}
