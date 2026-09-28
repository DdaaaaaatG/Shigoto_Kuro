/**
 * 슬라이더 초안·지연 저장 훅 — design/timer-tab.md §5.2. 끄는 동안은 초안만 보이고, 놓을 때(pointerup)
 * 1회 저장한다. 키보드 이동 키는 SCALE_KEY_COMMIT_MS(300ms) 뒤 1회, blur 는 즉시. `ScaleIdleCard`
 * (design/general-tab.md §3.4~§3.6)와 같은 패턴의 2번째 사용 — 3번째가 생기면 추출 후보(timer-tab.md §12).
 */
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { SCALE_KEY_COMMIT_MS } from '../generalValues'

const NAV_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'])

export const useSliderDraft = (saved: number, commit: (v: number) => Promise<void>) => {
  const [draft, setDraft] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (draft === null) return
    if (draft === saved) {
      setDraft(null)
      return
    }
    await commit(draft)
    setDraft(null)
  }

  // 지연 콜백이 옛 클로저(예약 당시의 draft·saved)를 부르지 않도록 항상 최신 flush 를 가리키는 ref
  const flushRef = useRef(flush)
  flushRef.current = flush

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setDraft(Number(e.currentTarget.value))
  const onPointerUp = () => void flush()
  const onKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!NAV_KEYS.has(e.key)) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void flushRef.current()
    }, SCALE_KEY_COMMIT_MS)
  }
  const onBlur = () => {
    if (draft !== null) void flush()
  }

  return { shown: draft ?? saved, onChange, onPointerUp, onKeyUp, onBlur }
}
