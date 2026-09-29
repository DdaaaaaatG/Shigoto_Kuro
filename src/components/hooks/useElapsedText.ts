/**
 * 경과·남은 시간 문자열(design.md §10.14 14.4·§10.15 15.1, design/functions.md §5.6·§5.7 ②) — running일
 * 때만 250ms마다 다시 계산해 글자가 바뀔 때(= 초가 바뀔 때)만 리렌더한다. paused·restPaused·stopped는
 * interval 없이 받은 스냅숏 그대로. 카운트다운·스톱워치 분기는 timerText(CR-050)가 갖고 있다 — 이 훅은
 * 이름·반환(string)·효과 구조를 바꾸지 않는다(설정 창 설계·스펙이 이 시그니처를 인용·mock한다).
 */
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { TimerSnapshot } from 'bridge'
import { nowMs, timerText } from 'components/utils/timerClock'

export const useElapsedText = (snapshot: TimerSnapshot, receivedAt: number): string => {
  const calc = () => timerText(snapshot, receivedAt, nowMs())
  const [text, setText] = useState(calc)
  const lastRef = useRef(text)

  useEffect(() => {
    const calcNow = () => timerText(snapshot, receivedAt, nowMs())

    // 스냅숏이 바뀐 직후의 즉시 반영은 이 효과의 커밋 안에서 일어나므로 일반 setState로 둔다(React가
    // 이미 처리 중인 렌더 안에서 flushSync를 부르면 경고가 난다).
    const initial = calcNow()
    if (initial !== lastRef.current) {
      lastRef.current = initial
      setText(lastRef.current)
    }
    if (snapshot.status !== 'running') return

    // 이후 tick은 실제 타이머 콜백(effect 커밋 밖)에서 오므로 flushSync로 매 변경을 즉시 커밋한다 —
    // React 18 자동 일괄 처리가 초 경계를 여러 번 건너뛴 tick들을 한 렌더로 뭉쳐 "초당 1회 렌더"
    // 계약이 흐려지는 것을 막는다(예: 가짜 타이머로 한 번에 여러 초를 건너뛰는 테스트).
    const id = setInterval(() => {
      const value = calcNow()
      if (value === lastRef.current) return
      lastRef.current = value
      flushSync(() => setText(value))
    }, 250)
    return () => clearInterval(id)
  }, [snapshot, receivedAt])

  return text
}
