/// <reference types="node" />
/**
 * 시간 글자 끝남 깜빡임 TC — CR-050(R-38).
 * 근거: design.md §10.15 15.1(깜빡임 = TimerText.module.css .blink, 트리거 = 클래스 부착·해제 = 제거, JS 타이머 없음, transform 없음)·
 *   15.3a(aria-hidden 유지·aria-live 없음·새 문구 없음), design/components.md §3.y(TimerText 개정·TimerText.module.css 전문·규칙 9),
 *   design/functions.md §5.7 ⑥(finished가 아니면 className 속성 자체가 없다).
 * 대상: src/overlay/components/TimerText.tsx(개정) + TimerText.module.css(신규) — 구현 전에는 단언·파일 읽기 실패로 red(정상).
 * bridge mock(vi.mock 'bridge/commands'·'bridge/events') — 실제 Tauri API import 없음. Audio는 전역 스텁(이 스펙은 소리를 관찰하지
 *   않는다 — 재생 판정은 useAlarmOnFinish.test.ts). CSS Modules는 클래스명 = 키 이름으로 mock, CSS 값은 원문을 fs로 읽어 단언
 *   (TC-289와 같은 방식 — 설계의 `?raw`와 같은 목적). 가짜 시계(performance 포함). 실제 sleep 없음.
 * 시나리오: src/overlay/test/scenarios.md TC-296
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAlarmSound,
  getTimer,
  onTimerChanged,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type TimerSettings,
  type TimerSnapshot,
  type TimerStatus,
} from 'bridge'
import PomodoroLayer from '../components/PomodoroLayer'
import TimerText from '../components/TimerText'

const h = vi.hoisted(() => ({ timerCb: undefined as ((p: unknown) => void) | undefined }))
vi.mock('bridge/commands', () => ({ getTimer: vi.fn(), setResting: vi.fn(), getAlarmSound: vi.fn() }))
vi.mock('bridge/events', () => ({ EVENTS: { timerChanged: 'timer://changed' }, onTimerChanged: vi.fn() }))
vi.mock('../components/TimerText.module.css', () => ({ default: { blink: 'blink' } }))
vi.mock('../overlay.module.css', () => ({
  default: { layer: 'layer', pomodoro: 'pomodoro', jellyWrap: 'jellyWrap', jelly: 'jelly', jellyAlt: 'jellyAlt', shiver: 'shiver' },
}))

// ─── Audio 스텁(관찰 안 함 — 재생 경로가 실제 오디오를 건드리지 않게) ───────────
class SilentAudio {
  src: string
  volume = 1
  loop = false
  currentTime = 0
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  constructor(src: string) {
    this.src = src
  }
}

// ─── 픽스처 ───────────────────────────────────────────────────────────────
const DUR = 1_500_000
const cd = (status: TimerStatus, elapsedMs: number): TimerSnapshot => ({ status, elapsedMs, mode: 'countdown', durationMs: DUR })
const CD_ON: TimerSettings = {
  enabled: true,
  mode: 'countdown',
  countdownSecs: 1500,
  alarmVolume: 80,
  textPos: { x: 268, y: 403 },
  rotation: 5,
  fontSize: 36,
  color: '#333333',
}
const entry = (key: string): AssetEntry => ({
  slot: key as unknown as AssetSlot,
  fileName: `${key}.png`,
  width: 900,
  height: 700,
  bytes: 1,
  url: `u:${key}`,
})
const M_BOTH: AssetManifest = {
  canvas: { width: 900, height: 700 },
  entries: [entry('pomo_bubble'), entry('body'), entry('idle'), entry('kb_up'), entry('pomo_char')],
}

const flush = () =>
  act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve()
  })
const emitTimer = async (s: TimerSnapshot) => {
  await act(async () => {
    h.timerCb?.(s)
  })
  await flush()
}

let origCreate: unknown
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] })
  vi.clearAllMocks()
  h.timerCb = undefined
  vi.stubGlobal('Audio', SilentAudio)
  origCreate = (URL as unknown as { createObjectURL?: unknown }).createObjectURL
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:default'), configurable: true, writable: true })
  vi.mocked(onTimerChanged).mockImplementation(((cb: (p: unknown) => void) => {
    h.timerCb = cb
    return Promise.resolve(vi.fn())
  }) as never)
  vi.mocked(getTimer).mockResolvedValue(cd('stopped', 0))
  vi.mocked(getAlarmSound).mockResolvedValue({ format: 'wav', bytes: 1, url: 'u:alarm' })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Object.defineProperty(URL, 'createObjectURL', { value: origCreate, configurable: true, writable: true })
  vi.restoreAllMocks()
})

describe('TimerText — 끝남 깜빡임 (design.md §10.15 15.1·15.3a, design/functions.md §5.7 ⑥)', () => {
  it('TC-296 ①: finished 동안만 글자 div에 .blink, running·paused·stopped·restPaused는 class 속성 없음, aria-hidden 유지·aria-live 없음', async () => {
    const { container } = render(<TimerText timer={CD_ON} />)
    await flush()
    const el = container.firstElementChild as HTMLElement
    expect(el.textContent).toBe('00:25:00')
    expect(el.getAttribute('class')).toBeNull()
    const seq: [TimerSnapshot, string, boolean][] = [
      [cd('running', 0), '00:25:00', false],
      [cd('paused', 600_000), '00:15:00', false],
      [cd('finished', DUR), '00:00:00', true],
      [cd('stopped', 0), '00:25:00', false],
      [{ status: 'restPaused', elapsedMs: 61_000 }, '00:01:01', false],
      [cd('finished', DUR), '00:00:00', true],
      [cd('running', 0), '00:25:00', false],
    ]
    for (const [s, text, blink] of seq) {
      await emitTimer(s)
      expect(container.firstElementChild, s.status).toBe(el)
      expect(el.textContent, s.status).toBe(text)
      if (blink) expect(el.className, s.status).toBe('blink')
      else expect(el.getAttribute('class'), s.status).toBeNull()
      expect(el.getAttribute('aria-hidden'), s.status).toBe('true')
      expect(el.style.transform, s.status).toBe('translate(-50%, -50%) rotate(5deg)')
    }
    expect(container.querySelector('[aria-live]')).toBeNull()
    expect(container.querySelector('[role]')).toBeNull()
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(getTimer).toHaveBeenCalledTimes(1)
  })

  it('TC-296 ②: 첫 getTimer 결과가 finished여도 .blink(깜빡임은 경로 무관), 10초 지나도 오버레이가 스스로 끄지 않음(JS 타이머 없음)', async () => {
    vi.mocked(getTimer).mockResolvedValue(cd('finished', DUR))
    const { container } = render(<TimerText timer={CD_ON} />)
    await flush()
    const el = container.firstElementChild as HTMLElement
    expect(el.textContent).toBe('00:00:00')
    expect(el.className).toBe('blink')
    expect(vi.getTimerCount()).toBe(0)
    await act(async () => {
      vi.advanceTimersByTime(10_000)
    })
    await flush()
    expect(el.className).toBe('blink')
    expect(el.textContent).toBe('00:00:00')
  })

  it('TC-296 ③: 뽀모도 안에서 .blink는 글자 div 하나에만 — .pomodoro·인물·말풍선 img에는 없음, 젤리·부르르 클래스 없음(규칙 9)', async () => {
    const { container } = render(<PomodoroLayer manifest={M_BOTH} timer={CD_ON} />)
    await flush()
    await emitTimer(cd('finished', DUR))
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toBe('pomodoro')
    const blinking = Array.from(root.querySelectorAll('.blink'))
    expect(blinking).toHaveLength(1)
    expect(blinking[0]).toBe(root.lastElementChild)
    expect(blinking[0].tagName).toBe('DIV')
    for (const img of Array.from(root.querySelectorAll('img'))) expect(img.className).toBe('layer')
    expect(root.querySelectorAll('.jelly, .jellyAlt, .shiver, .jellyWrap')).toHaveLength(0)
  })
})

describe('TimerText.module.css 원문 (design/components.md §3.y 전문)', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  it('TC-296 ④: .blink = animation timerBlink 1s infinite 한 줄, @keyframes timerBlink 0%,49.9% opacity 1 / 50%,100% opacity 0(계단식), transform 없음', () => {
    const css = readFileSync(resolve(here, '../components/TimerText.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const block = /\.blink\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    const decl = block
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.replace(/\s+/g, ' '))
    expect(decl).toEqual(['animation: timerBlink 1s infinite'])
    expect(css).toMatch(/@keyframes\s+timerBlink\s*\{/)
    expect(css).toMatch(/0%\s*,\s*49\.9%\s*\{\s*opacity:\s*1\s*;?\s*\}/)
    expect(css).toMatch(/50%\s*,\s*100%\s*\{\s*opacity:\s*0\s*;?\s*\}/)
    expect(css).not.toContain('transform')
  })
})
