/**
 * 「기본 설정」 탭 순수 모듈 스펙 — CR-028 · R-03(배율) · R-04(유휴 시간).
 * 기준: src/settings/design/general-tab.md §3.3 · scenarios.md TC-131.
 * 결정 사항(위임문): idleSeconds 정본 범위 60~3600초(1~60분).
 */
import { describe, expect, it } from 'vitest'
import { SCALE_MAX, SCALE_MIN } from 'bridge/types'
import {
  IDLE_MAX_MINUTES,
  IDLE_MIN_MINUTES,
  SCALE_KEY_COMMIT_MS,
  SCALE_STEP_PERCENT,
  idleSecondsToMinutes,
  parseIdleMinutes,
  percentBounds,
  scaleToPercent,
} from '../generalValues'

describe('generalValues (general-tab.md §3.3)', () => {
  it('TC-131: 상수·배율 변환·범위', () => {
    expect(SCALE_STEP_PERCENT).toBe(5)
    expect(SCALE_KEY_COMMIT_MS).toBe(300)
    expect(IDLE_MIN_MINUTES).toBe(1)
    expect(IDLE_MAX_MINUTES).toBe(60)
    expect(IDLE_MIN_MINUTES * 60).toBe(60) // 저장 범위 하한 60초
    expect(IDLE_MAX_MINUTES * 60).toBe(3600) // 저장 범위 상한 3600초
    expect(scaleToPercent(1)).toBe(100)
    expect(scaleToPercent(1.5)).toBe(150)
    expect(scaleToPercent(0.25)).toBe(25)
    expect(scaleToPercent(1.03)).toBe(103)
    expect(scaleToPercent(0.8)).toBe(80)
    expect(percentBounds()).toStrictEqual({ min: 25, max: 200 })
    expect(percentBounds()).toStrictEqual({
      min: Math.round(SCALE_MIN * 100),
      max: Math.round(SCALE_MAX * 100),
    })
  })

  it('TC-131: idleSecondsToMinutes — 반올림 표시, 최소 1', () => {
    expect(idleSecondsToMinutes(300)).toBe(5)
    expect(idleSecondsToMinutes(120)).toBe(2)
    expect(idleSecondsToMinutes(90)).toBe(2)
    expect(idleSecondsToMinutes(30)).toBe(1)
    expect(idleSecondsToMinutes(0)).toBe(1)
    expect(idleSecondsToMinutes(3600)).toBe(60)
  })

  it('TC-131: parseIdleMinutes — 1~60 정수만, 그 외 null', () => {
    const cases: [string, number | null][] = [
      ['5', 5],
      [' 60 ', 60],
      ['1', 1],
      ['007', 7],
      ['', null],
      ['   ', null],
      ['0', null],
      ['61', null],
      ['1.5', null],
      ['-3', null],
      ['5분', null],
      ['1e1', null],
    ]
    for (const [text, want] of cases) {
      expect(parseIdleMinutes(text), JSON.stringify(text)).toBe(want)
    }
  })
})
