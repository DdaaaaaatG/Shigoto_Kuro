/**
 * 알림음 재생 훅(design.md §10.15 15.2·15.3, design/functions.md §5.7 ⑤) — 화면 로컬(알람 재생은
 * 오버레이 한 곳뿐이라 공용 아님). React state 없음, ref만 — 리렌더를 일으키지 않는다. TimerText에서
 * 호출한다(OverlayApp이 아니다 — 구독·조회를 useTimerSnapshot 1개로 유지하기 위해서다).
 */
import { useEffect, useRef, type MutableRefObject } from 'react'
import { getAlarmSound, type TimerStatus } from 'bridge'
import type { TimerSnapshotState } from 'components/hooks/useTimerSnapshot'
import { defaultAlarmUrl, playSound } from 'components/utils/alarmSound'

type StopRef = MutableRefObject<(() => void) | null>
type GenRef = MutableRefObject<number>

/** 재생 중인 소리를 멈추고 회차를 올려(늦게 오는 조회 결과를 폐기) 진행 중인 재생 시도를 무효화한다 */
const halt = (genRef: GenRef, stopRef: StopRef): void => {
  genRef.current += 1
  stopRef.current?.()
  stopRef.current = null
}

/**
 * getAlarmSound 조회 → 등록 파일(실패 시 기본음 1회 재시도) 또는 기본음을 **1회 재생**(R-39 · CR-055 — CR-052
 * 반복 재생 폐기, 깜빡임 10초는 유지. 재생 중 finished를 떠나면·언마운트 시 halt가 멈춘다). 회차 확인으로 늦은 결과를 버린다
 */
const start = (genRef: GenRef, stopRef: StopRef, gainRef: MutableRefObject<number>): void => {
  const gen = ++genRef.current
  getAlarmSound()
    .then(
      sound => sound?.url ?? null,
      () => null,
    )
    .then(url => {
      if (gen !== genRef.current) return
      const volume = gainRef.current
      const playDefault = () => {
        if (gen !== genRef.current) return
        stopRef.current = playSound(defaultAlarmUrl(), volume)
      }
      stopRef.current = url
        ? playSound(url, volume, playDefault)
        : playSound(defaultAlarmUrl(), volume)
    })
}

export const useAlarmOnFinish = (state: TimerSnapshotState, gain: number): void => {
  const prevStatusRef = useRef<TimerStatus | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const genRef = useRef(0)
  const gainRef = useRef(gain)

  // 재생 시작 시점의 최신 음량을 쓴다(재생 중 음량 변경은 반영하지 않는다 — 요구 없음)
  useEffect(() => {
    gainRef.current = gain
  }, [gain])

  useEffect(() => {
    const status = state.snapshot.status
    const prev = prevStatusRef.current
    prevStatusRef.current = status

    if (status !== 'finished') {
      halt(genRef, stopRef)
      return
    }
    // 첫 조회 결과가 이미 finished(fromEvent 없음/false)면 울리지 않는다(R-39) — 방금 일어난 전이(이벤트)일 때만
    if (state.fromEvent === true && prev !== 'finished') start(genRef, stopRef, gainRef)
  }, [state.snapshot, state.fromEvent])

  // 언마운트 시 정지·진행 중 조회 결과 폐기
  useEffect(() => () => halt(genRef, stopRef), [])
}
