/**
 * 쉬는중 단독 표시 화면 통합 TC — CR-069(R-41 신설, R-35·R-37 개정 — 카운트다운도 쉬는중 자동 일시정지).
 * 근거: design.md §10.17(17.1 표시표·17.2 코드 명세·17.3 동작표·17.5 검증), §4 `hasRest`·`restOnly` 파생값, §6 P-3,
 *   §10.1 표(hair·pomo·0·1·2·3·pen 행 「쉬는중 단독 표시 중 숨김」), §10.9.2 첫 행·회귀 ⑩, §10.14 표시 조건 문장(DOM·구독 유지),
 *   §10.15 v1.1 문장(카운트다운도 restPaused — 남은 시간 고정), design/functions.md §5.1(`.canvas` className)·§5.3(`Layer` className·
 *   상태 레이어 마커), 패킷 doc/200_설계/architecture/rest-display-03-packet-ui.md §A.5 O-1~O-6,
 *   requirements R-41·R-35·R-37·R-30·R-33·§2 S-22·S-19.
 * 코드 명세 이름(그대로 단언): `.canvas`에 `restOnly` 클래스(`${styles.canvas} ${styles.restOnly}` → 'canvas restOnly'),
 *   상태 레이어 `<img>`에 `restLayer`(`machine.layer === 'rest'`일 때만 → 'layer restLayer'), 몸통·키보드 img는 늘 'layer'.
 * 대상: src/overlay/index.tsx(OverlayApp) + components/LayerStack.tsx — 구현 전에는 restOnly·restLayer 단언이 red(정상).
 * 잔여 위험 K-2: jsdom은 CSS 모듈 규칙(visibility)을 적용하지 않는다 → 「가려짐」은 클래스·부모 관계로만 단언하고,
 *   CSS 원문은 overlayStyles.test.ts TC-345, 실제 화면은 수동 TC-348(MC-48) 스크린샷이 맡는다.
 * bridge mock(vi.mock 'bridge/commands'·'bridge/events') — 실제 Tauri API import 없음. core 타이머 판정(restPaused·running)은
 *   흉내 내지 않는다: core가 보냈을 timer://changed를 테스트가 직접 넣는다. 가짜 시계(performance 포함). 실제 sleep 없음.
 * 로케이터: 오버레이 img는 alt=""(접근성 이름 없음 — design.md §8·§9) → img[src="u:…"]·클래스·부모 관계.
 * 시나리오: src/overlay/test/scenarios.md TC-338 ~ TC-343
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  DEFAULT_TIMER_SETTINGS,
  getAssetManifest,
  getHandAnchor,
  getMonitors,
  getSettings,
  getTimer,
  onAssetsChanged,
  onTimerChanged,
  setResting,
  setSettings,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type MouseSettings,
  type ScreenBounds,
  type Settings,
  type TimerSettings,
  type TimerSnapshot,
  type TimerStatus,
} from 'bridge'
import OverlayApp from '../index'

// ─── bridge·CSS mock ────────────────────────────────────────────────────
const h = vi.hoisted(() => {
  const handlers: Record<string, ((p: unknown) => void) | undefined> = {}
  const unlisten: Record<string, ReturnType<typeof vi.fn>> = {}
  const subImpl = (name: string) => (cb: (p: unknown) => void) => {
    handlers[name] = cb
    const u = vi.fn()
    unlisten[name] = u
    return Promise.resolve(u)
  }
  return { handlers, unlisten, subImpl }
})
vi.mock('bridge/commands', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  getAssetManifest: vi.fn(),
  getMonitors: vi.fn(),
  getHandAnchor: vi.fn(),
  getScreenBounds: vi.fn(),
  getTimer: vi.fn(),
  setResting: vi.fn(),
  // CR-050: TimerText → useAlarmOnFinish가 finished 진입 때 부른다 — 이 스펙은 finished를 보내지 않는다(일반 함수)
  getAlarmSound: () => Promise.resolve(null),
}))
vi.mock('bridge/events', () => ({
  EVENTS: {
    keyboard: 'input://keyboard',
    mouseMove: 'input://mouse-move',
    mouseButton: 'input://mouse-button',
    settingsChanged: 'settings://changed',
    assetsChanged: 'assets://changed',
    handAnchorChanged: 'assets://hand-anchor-changed',
    timerChanged: 'timer://changed',
  },
  onKeyboard: vi.fn(h.subImpl('keyboard')),
  onMouseMove: vi.fn(h.subImpl('mouseMove')),
  onMouseButton: vi.fn(h.subImpl('mouseButton')),
  onSettingsChanged: vi.fn(h.subImpl('settingsChanged')),
  onAssetsChanged: vi.fn(h.subImpl('assetsChanged')),
  onHandAnchorChanged: vi.fn(h.subImpl('handAnchor')),
  onTimerChanged: vi.fn(h.subImpl('timer')),
}))
// CR-069: restOnly(.canvas 토글)·restLayer(상태 레이어 마커) — design.md §10.17 17.2 클래스 이름 그대로
vi.mock('../overlay.module.css', () => ({
  default: {
    root: 'root',
    canvas: 'canvas',
    layer: 'layer',
    hand: 'hand',
    armWrap: 'armWrap',
    hairWrap: 'hairWrap',
    pomodoro: 'pomodoro',
    jellyWrap: 'jellyWrap',
    jelly: 'jelly',
    jellyAlt: 'jellyAlt',
    shiver: 'shiver',
    restOnly: 'restOnly',
    restLayer: 'restLayer',
  },
}))

// ─── 픽스처 ───────────────────────────────────────────────────────────────
const T0 = 1_700_000_000_000
const CANVAS = { width: 900, height: 700 }
const entry = (key: string, width = 900, height = 700): AssetEntry => ({
  slot: key as unknown as AssetSlot,
  fileName: `${key}.png`,
  width,
  height,
  bytes: 1,
  url: `u:${key}`,
})
/** 배경·뒷머리·뽀모도 인물·말풍선·몸통·대기·쉬는중·kb_up·팔·펜 손 — 패킷 O-1 목록 + 배경·몸통·대기·말풍선(17.1 표 열 전부) */
const M_REST: AssetManifest = {
  canvas: CANVAS,
  entries: [
    ...['background', 'hair', 'pomo_char', 'pomo_bubble', 'body', 'idle', 'rest', 'kb_up', 'mouse_base'].map(k => entry(k)),
    entry('pen_up', 202, 154),
  ],
}
/** 같은 매니페스트에서 rest만 뺌(D-1) */
const M_NO_REST: AssetManifest = { canvas: CANVAS, entries: M_REST.entries.filter(e => e.url !== 'u:rest') }
// 팔 변형 참조(scenarios.md §0.2, OverlayApp.mouse.test.tsx와 같은 기하) — 어깨 (620,530) · 기준점 = 영역 중심 (520,530)
const MOUSE: MouseSettings = {
  shoulder: { x: 620, y: 530 },
  area: [
    { x: 420, y: 430 },
    { x: 620, y: 430 },
    { x: 620, y: 630 },
    { x: 420, y: 630 },
  ],
  hand: null,
  partPos: { x: 0, y: 0 },
  penPos: { x: 389, y: 492 },
  penMode: false,
}
const REST = 'rotate(0deg) scaleX(1) rotate(0deg)'
const DOWN = 'rotate(135deg) scaleX(1.414) rotate(-180deg)' // 커서 (960,1080) → 목표 (520,630)
/** 유휴 60초(패킷 O-1 `idleSeconds` 60) — 61초 진행이면 쉬는중 */
const SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  scale: 1,
  idleSeconds: 60,
  overlay: { x: 100, y: 100, visible: true },
  mouse: MOUSE,
  autostart: false,
}
const REST_AT = 61_000
const TIMER_CD: TimerSettings = { ...DEFAULT_TIMER_SETTINGS, enabled: true, mode: 'countdown', countdownSecs: 1500 }
const MONITORS: ScreenBounds[] = [{ x: 0, y: 0, width: 1920, height: 1080 }]
const snap = (status: TimerStatus, elapsedMs: number): TimerSnapshot => ({ status, elapsedMs })
const cd = (status: TimerStatus, elapsedMs: number): TimerSnapshot => ({
  status,
  elapsedMs,
  mode: 'countdown',
  durationMs: 1_500_000,
})

// ─── 헬퍼 ────────────────────────────────────────────────────────────────
const flush = () =>
  act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  })
const mount = async () => {
  const r = render(<OverlayApp />)
  await flush()
  return r
}
/** 이벤트 1건 = act 1번(같은 커밋에서 restOnly 해제·젤리가 함께 보이는지 본다 — 패킷 O-2) */
const emit = async (name: string, payload: unknown) => {
  await act(async () => {
    h.handlers[name]?.(payload)
  })
  await flush()
}
const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
  await flush()
}
const key = (pressed: boolean, heldCount: number) =>
  emit('keyboard', { pressed, heldCount, special: null, ts: Date.now() })
const move = (x: number, y: number) => emit('mouseMove', { x, y, ts: Date.now() })
const q = {
  canvas: (c: HTMLElement) => c.querySelector('.canvas') as HTMLElement,
  img: (c: HTMLElement, k: string) => c.querySelector(`img[src="u:${k}"]`) as HTMLImageElement | null,
  /** 상태 레이어(z2) — .jellyWrap 직계 idle/rest img */
  state: (c: HTMLElement) =>
    c.querySelector('.jellyWrap > img[src="u:idle"], .jellyWrap > img[src="u:rest"]') as HTMLImageElement | null,
  hairWrap: (c: HTMLElement) => c.querySelector('.hairWrap') as HTMLElement | null,
  pomo: (c: HTMLElement) => c.querySelector('.pomodoro') as HTMLElement | null,
  text: (c: HTMLElement) => c.querySelector('.pomodoro > div') as HTMLElement | null,
  jelly: (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement,
}
const resting = () => vi.mocked(setResting).mock.calls

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date', 'performance'] })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  for (const k of Object.keys(h.unlisten)) delete h.unlisten[k]
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(M_REST)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue(null)
  vi.mocked(setSettings).mockImplementation(async s => s)
  vi.mocked(getTimer).mockResolvedValue(snap('stopped', 0))
  vi.mocked(setResting).mockResolvedValue(snap('stopped', 0))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('OverlayApp — 쉬는중 단독 표시 (design.md §10.17, R-41)', () => {
  it('TC-338: rest 등록·유휴 60초 → .canvas "canvas restOnly", 같은 상태 img가 "layer restLayer", 뒷머리·뽀모도·.jellyWrap·몸통·kb_up·팔·펜 손은 같은 노드로 DOM에 남음, setResting [[false],[true]]', async () => {
    const { container } = await mount()
    const canvas = q.canvas(container)
    expect(canvas.className).toBe('canvas')
    const keep = {
      bg: q.img(container, 'background'),
      hairWrap: q.hairWrap(container),
      hair: q.img(container, 'hair'),
      pomo: q.pomo(container),
      pomoChar: q.img(container, 'pomo_char'),
      bubble: q.img(container, 'pomo_bubble'),
      text: q.text(container),
      jelly: q.jelly(container),
      arm: q.img(container, 'mouse_base'),
      body: q.img(container, 'body'),
      state: q.state(container),
      kb: q.img(container, 'kb_up'),
      pen: q.img(container, 'pen_up'),
    }
    for (const [name, el] of Object.entries(keep)) expect(el, name).not.toBeNull()
    expect(keep.state?.getAttribute('src')).toBe('u:idle')
    expect(keep.state?.className).toBe('layer')
    expect(resting()).toEqual([[false]])

    await advance(REST_AT)

    // ⓐ 표시: .canvas 토글 + rest 마커 1개
    expect(q.canvas(container)).toBe(canvas)
    expect(canvas.className).toBe('canvas restOnly')
    expect(canvas.classList.contains('restOnly')).toBe(true)
    expect(q.state(container)).toBe(keep.state) // 같은 <img>(TC-032 연장)
    expect(keep.state?.getAttribute('src')).toBe('u:rest')
    expect(keep.state?.className).toBe('layer restLayer')
    expect(container.querySelectorAll('.restLayer')).toHaveLength(1)
    expect(keep.body?.className).toBe('layer')
    expect(keep.kb?.className).toBe('layer')
    // DOM 유지(언마운트 없음) — 모든 레이어가 같은 노드
    for (const [name, el] of Object.entries(keep)) expect(el?.isConnected, name).toBe(true)
    expect(q.hairWrap(container)).toBe(keep.hairWrap)
    expect(q.pomo(container)).toBe(keep.pomo)
    expect(q.text(container)).toBe(keep.text)
    expect(q.jelly(container)).toBe(keep.jelly)
    expect(q.img(container, 'mouse_base')).toBe(keep.arm)
    expect(q.img(container, 'pen_up')).toBe(keep.pen)
    // 가려질 부모(.restOnly .hairWrap/.pomodoro/.jellyWrap) 관계 — 배경만 세 부모 밖, rest는 .jellyWrap 안(.restLayer로 되살림)
    expect(keep.bg?.closest('.hairWrap, .pomodoro, .jellyWrap')).toBeNull()
    expect(keep.hair?.closest('.hairWrap')).toBe(keep.hairWrap)
    for (const el of [keep.pomoChar, keep.bubble, keep.text]) expect(el?.closest('.pomodoro')).toBe(keep.pomo)
    for (const el of [keep.arm, keep.body, keep.state, keep.kb, keep.pen]) expect(el?.closest('.jellyWrap')).toBe(keep.jelly)
    // ⓑ 상태: 문구 없음(R-01) — 보이는 글자는 시간 글자뿐
    expect(container.textContent).toBe('00:00:00')
    // ⓒ bridge: 쉬는중 보고는 그대로(R-41 「숨김은 표시만」)
    expect(resting()).toEqual([[false], [true]])
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-339: 쉬는중 단독 표시 중 키 누름 1건(같은 act) → restOnly 해제·상태 img "layer"(idle)·.jellyWrap 젤리, 팔은 쉬는 자세 유지(D-2), setResting 끝 [false]', async () => {
    const { container } = await mount()
    await advance(REST_AT)
    expect(q.canvas(container).className).toBe('canvas restOnly')
    const st = q.state(container)
    expect(q.img(container, 'mouse_base')?.style.transform).toBe(REST)

    await key(true, 1)

    expect(q.canvas(container).className).toBe('canvas')
    expect(q.state(container)).toBe(st)
    expect(st?.getAttribute('src')).toBe('u:idle')
    expect(st?.className).toBe('layer')
    expect(container.querySelectorAll('.restLayer')).toHaveLength(0)
    const jw = q.jelly(container).className
    expect(jw).toMatch(/^jellyWrap (jelly|jellyAlt)$/)
    expect(q.hairWrap(container)?.className).toBe(jw.replace('jellyWrap', 'hairWrap')) // CR-051 같은 motion
    expect(q.img(container, 'mouse_base')?.style.transform).toBe(REST) // armAtRest — 다음 마우스 이동까지
    expect(resting()).toEqual([[false], [true], [false]])
    expect(resting().at(-1)).toEqual([false])
    await key(false, 0)
    expect(q.canvas(container).className).toBe('canvas')
    expect(resting()).toHaveLength(3)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-340: 쉬는중 단독 표시 중 마우스 이동 1건 → restOnly 해제, 팔이 곧바로 커서 추종(REST 아님 = DOWN), 젤리 없음, setResting 끝 [false]', async () => {
    const { container } = await mount()
    await move(960, 1080)
    const arm = q.img(container, 'mouse_base')
    expect(arm?.style.transform).toBe(DOWN)
    await advance(REST_AT)
    expect(q.canvas(container).className).toBe('canvas restOnly')
    expect(arm?.style.transform).toBe(REST)

    await move(960, 1080)

    expect(q.canvas(container).className).toBe('canvas')
    expect(q.img(container, 'mouse_base')).toBe(arm)
    expect(arm?.style.transform).not.toBe(REST)
    expect(arm?.style.transform).toBe(DOWN)
    expect(q.state(container)?.getAttribute('src')).toBe('u:idle')
    expect(q.state(container)?.className).toBe('layer')
    expect(q.jelly(container).className).toBe('jellyWrap')
    expect(resting()).toEqual([[false], [true], [false]])
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-341: rest 미등록(D-1) → 쉬는중에도 .canvas className === "canvas", 상태 img 없음·kb_up "layer"·팔 쉬는 자세·뒷머리·뽀모도·펜 손 그대로, setResting(true)는 그대로 호출', async () => {
    vi.mocked(getAssetManifest).mockResolvedValue(M_NO_REST)
    const { container } = await mount()
    await advance(REST_AT)

    expect(q.canvas(container).className).toBe('canvas')
    expect(q.img(container, 'rest')).toBeNull()
    expect(q.state(container)).toBeNull()
    expect(container.querySelectorAll('.restLayer')).toHaveLength(0)
    expect(q.img(container, 'kb_up')?.className).toBe('layer')
    expect(q.img(container, 'mouse_base')?.style.transform).toBe(REST)
    for (const el of [q.hairWrap(container), q.pomo(container), q.img(container, 'body'), q.img(container, 'pen_up')]) {
      expect(el).not.toBeNull()
    }
    expect(resting()).toEqual([[false], [true]])

    await key(true, 1)
    expect(q.canvas(container).className).toBe('canvas')
    expect(q.state(container)?.getAttribute('src')).toBe('u:idle')
    expect(resting()).toEqual([[false], [true], [false]])
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-342: 쉬는중에 assets://changed로 rest 없는 매니페스트 → restOnly 해제, 다시 rest 있는 매니페스트 → 재부착(hasRest 재계산), 상태 전이·재조회 없음', async () => {
    const { container } = await mount()
    await advance(REST_AT)
    expect(q.canvas(container).className).toBe('canvas restOnly')

    await emit('assetsChanged', M_NO_REST)
    expect(q.canvas(container).className).toBe('canvas')
    expect(q.img(container, 'rest')).toBeNull()
    expect(container.querySelectorAll('.restLayer')).toHaveLength(0)
    expect(q.img(container, 'kb_up')).not.toBeNull()

    await emit('assetsChanged', M_REST)
    expect(q.canvas(container).className).toBe('canvas restOnly')
    expect(q.img(container, 'rest')?.className).toBe('layer restLayer')
    expect(container.querySelectorAll('.restLayer')).toHaveLength(1)

    // 그림 교체는 입력·전이가 아니다 — 쉬는중 보고 추가 없음, 매니페스트 재조회 없음
    expect(resting()).toEqual([[false], [true]])
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
    expect(onAssetsChanged).toHaveBeenCalledTimes(1)
    // 깨움 3번째 경로(design.md §10.17 17.3 「깨움(키·마우스 이동·클릭)」) — 왼쪽 클릭 누름 1건, 비펜 모드라 젤리 없음·팔은 쉬는 자세 유지(TC-061)
    expect(q.img(container, 'mouse_base')?.style.transform).toBe(REST)
    await emit('mouseButton', { button: 'left', pressed: true, ts: Date.now() })
    expect(q.canvas(container).className).toBe('canvas')
    expect(q.state(container)?.className).toBe('layer')
    expect(q.img(container, 'mouse_base')?.style.transform).toBe(REST)
    expect(resting()).toEqual([[false], [true], [false]])
    await emit('mouseButton', { button: 'left', pressed: false, ts: Date.now() })
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-343: 카운트다운 흐르는 중 쉬는중 진입·해제 한 바퀴 — TimerText 언마운트 없음(getTimer 1회·onTimerChanged 1회·해제 0회·같은 글자 노드), restPaused 동안 남은 시간 고정, 복귀 running에서 이어서', async () => {
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS, timer: TIMER_CD })
    vi.mocked(getTimer).mockResolvedValue(cd('stopped', 0))
    const { container } = await mount()
    const pomo = q.pomo(container)
    const t = q.text(container) as HTMLElement
    expect(t.textContent).toBe('00:25:00')
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(onTimerChanged).toHaveBeenCalledTimes(1)

    await emit('timer', cd('running', 0))
    await advance(1_500)
    expect(t.textContent).toBe('00:24:59')
    await advance(60_000) // 누계 61.5초 → 쉬는중
    expect(q.canvas(container).className).toBe('canvas restOnly')
    expect(resting()).toEqual([[false], [true]])

    // core(contract v1.1)가 카운트다운에도 restPaused를 보낸다 — 남은 1_438_500ms → 올림 00:23:59 고정
    await emit('timer', cd('restPaused', 61_500))
    expect(t.textContent).toBe('00:23:59')
    await advance(120_000)
    expect(t.textContent).toBe('00:23:59')
    expect(q.pomo(container)).toBe(pomo)
    expect(q.text(container)).toBe(t)

    await key(true, 1)
    await key(false, 0)
    expect(q.canvas(container).className).toBe('canvas')
    expect(resting()).toEqual([[false], [true], [false]])
    await emit('timer', cd('running', 61_500))
    await advance(1_200)
    expect(t.textContent).toBe('00:23:58') // 멈춘 값에서 이어서(튀지 않음)

    // ⓒ 구독·조회는 마운트 때 1회뿐 — 쉬는중 동안 TimerText가 언마운트되지 않았다(D-3)
    expect(getTimer).toHaveBeenCalledTimes(1)
    expect(onTimerChanged).toHaveBeenCalledTimes(1)
    expect(h.unlisten.timer).not.toHaveBeenCalled()
    expect(q.text(container)).toBe(t)
    expect(setSettings).not.toHaveBeenCalled()
  })
})
