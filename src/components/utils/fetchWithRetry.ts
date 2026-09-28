/**
 * 화면 초기 조회를 실패 시 짧은 간격으로 몇 번 더 시도한다(CR-039).
 * 앱 시작 직후 core 준비 전에 command 가 실패하면 한 번만 조회하는 화면은 빈 상태로 남는다.
 * 사용: useEffect(() => fetchWithRetry(getSettings, setSettings), [])
 * - 성공하면 onOk 를 1회 부르고 멈춘다. 모든 시도가 실패하면 마지막 오류로 onFail 을 1회 부른다.
 * - 반환한 취소 함수를 부르면 대기 중인 타이머를 지우고 이후 결과(성공·실패)를 버린다.
 */
export const RETRY_DELAYS_MS: readonly number[] = [200, 500, 1000]

export const fetchWithRetry = <T, E = unknown>(
  fetch: () => Promise<T>,
  onOk: (value: T) => void,
  onFail?: (error: E) => void,
  delays: readonly number[] = RETRY_DELAYS_MS,
): (() => void) => {
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const attempt = (n: number) => {
    fetch()
      .then(value => {
        if (!cancelled) onOk(value)
      })
      .catch((error: E) => {
        if (cancelled) return
        if (n >= delays.length) {
          onFail?.(error)
          return
        }
        timer = setTimeout(() => attempt(n + 1), delays[n])
      })
  }
  attempt(0)

  return () => {
    cancelled = true
    if (timer !== undefined) clearTimeout(timer)
  }
}
