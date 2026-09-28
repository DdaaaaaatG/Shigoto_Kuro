/**
 * OverlayApp 부르르 통합 TC — CR-023(R-24 키 꾹 누름 = 부르르).
 * 근거: design/functions.md §5.1 키보드 핸들러(`repeat: p.repeat === true`)·`jellyClass(motion: WrapMotion)`
 *   ('shiver' → 'jellyWrap shiver', 반환에 .jelly·.jellyAlt·.shiver 중 많아야 하나)·JSX `jellyClass(wrapMotion(machine))`,
 *   §5.2 `wrapMotion`·`REPEAT_TIMEOUT_MS`, design.md §6 P-2·P-3·§10.1·§10.3 부르르 행·규칙 1~5·마우스 팔과의 합성,
 *   design/components.md §3 배경 DOM 구조 5·6.
 * bridge 는 mock(vi.mock 'bridge/commands'·'bridge/events'). 실제 Tauri API import 없음. 가짜 시계(tick 위상 = 마운트 T0). 실제 sleep 없음.
 * 매니페스트 SPECIAL_MANIFEST: 배경·몸통·대기·쉬는중·kb_up·kb_down 3장·마우스 파츠 900×700 + key_space·key_enter·key_undo(key_z 미등록).
 * 바운스 짝: 마운트 뒤 모든 키가 떼진 상태의 첫 누름 = bounceSeq 1 → phase 1 → jellyAlt(scenarios.md v0.8·v0.9 전제).
 * 입력 순서를 파일·스냅샷·로그로 남기지 않는다(R-22).
 * 시나리오: src/overlay/test/scenarios.md TC-169 ~ TC-173
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  getAssetManifest,
  getHandAnchor,
  getMonitors,
  getSettings,
  setSettings,
  slotKey,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type MouseSettings,
  type ScreenBounds,
  type Settings,
} from 'bridge'
import * as commands from 'bridge/commands'
import type { SpecialKey } from 'state/inputMachine'
import OverlayApp from '../index'

// ─── bridge mock: 구독 핸들러를 잡아 두고 테스트가 이벤트를 흘려 넣는다 ─────────────
const h = vi.hoisted(() => {
  const handlers: Record<string, ((p: unknown) => void) | undefined> = {}
  const subImpl = (name: string) => (cb: (p: unknown) => void) => {
    handlers[name] = cb
    return Promise.resolve(vi.fn())
  }
  return { handlers, subImpl }
})

vi.mock('bridge/commands', () => ({
  getSettings: vi.fn(),
  setSettings: vi.fn(),
  getAssetManifest: vi.fn(),
  getMonitors: vi.fn(),
  getHandAnchor: vi.fn(),
  getScreenBounds: vi.fn(),
  // CR-045(scenarios v1.8): OverlayApp 마운트·쉬는중 전이 때 setResting, TimerText가 getTimer — 이 스펙은 관찰하지 않는다(초기화 영향 없는 일반 함수)
  getTimer: () => Promise.resolve({ status: 'stopped', elapsedMs: 0 }),
  setResting: () => Promise.resolve({ status: 'stopped', elapsedMs: 0 }),
  // CR-050(scenarios v1.9): TimerText → useAlarmOnFinish가 finished 진입 이벤트 때 부른다 — 이 스펙은 관찰하지 않는다(일반 함수)
  getAlarmSound: () => Promise.resolve(null),
}))
vi.mock('bridge/events', () => ({
  onTimerChanged: () => Promise.resolve(() => undefined),
  EVENTS: {
    keyboard: 'input://keyboard',
    mouseMove: 'input://mouse-move',
    mouseButton: 'input://mouse-button',
    settingsChanged: 'settings://changed',
    assetsChanged: 'assets://changed',
    handAnchorChanged: 'assets://hand-anchor-changed',
  },
  onKeyboard: vi.fn(h.subImpl('keyboard')),
  onMouseMove: vi.fn(h.subImpl('mouseMove')),
  onMouseButton: vi.fn(h.subImpl('mouseButton')),
  onSettingsChanged: vi.fn(h.subImpl('settingsChanged')),
  onAssetsChanged: vi.fn(h.subImpl('assetsChanged')),
  onHandAnchorChanged: vi.fn(h.subImpl('handAnchor')),
}))
// CR-023 mock 클래스: shiver 추가. bounce·bounceAlt는 잔존 감시용(CR-022)
vi.mock('../overlay.module.css', () => ({
  default: {
    root: 'root',
    canvas: 'canvas',
    layer: 'layer',
    hand: 'hand',
    armWrap: 'armWrap',
    jellyWrap: 'jellyWrap',
    jelly: 'jelly',
    jellyAlt: 'jellyAlt',
    shiver: 'shiver',
    bounce: 'bounce',
    bounceAlt: 'bounceAlt',
  },
}))

// ─── 픽스처 ───────────────────────────────────────────────────────────────
const T0 = 1_700_000_000_000
const entry = (slot: AssetSlot, width = 900, height = 700): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url: `u:${slotKey(slot)}`,
})
const kbDown = (index: number) => entry({ kind: 'kb_down', index })
const SLOTS = ['background', 'body', 'idle', 'rest', 'kb_up', 'mouse_base', 'mouse_left', 'mouse_right']
const SPECIAL_SLOTS = ['key_space', 'key_enter', 'key_undo']
const SPECIAL_MANIFEST: AssetManifest = {
  canvas: { width: 900, height: 700 },
  entries: [...[...SLOTS, ...SPECIAL_SLOTS].map(s => entry(s as AssetSlot)), kbDown(0), kbDown(1), kbDown(2)],
}
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
  penPos: null, // bridge v0.13(CR-024) 필드 추가 — 픽스처 갱신
  penMode: false, // contract v0.15(CR-033) 기본값
}
const SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  scale: 1,
  idleSeconds: 300,
  overlay: { x: 100, y: 100, visible: true },
  mouse: MOUSE,
  autostart: false,
}
const MONITORS: ScreenBounds[] = [{ x: 0, y: 0, width: 1920, height: 1080 }]
/** scenarios.md §0.2 — 기준점 (520,530)·커서 (960,1080) */
const DOWN = 'rotate(135deg) scaleX(1.414) rotate(-180deg)'
const legacyBounds = (commands as unknown as Record<string, ReturnType<typeof vi.fn>>).getScreenBounds

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
const emit = async (name: string, payload: unknown) => {
  await act(async () => {
    h.handlers[name]?.(payload)
  })
}
const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}
/** repeat 인자를 주면 bridge `KeyboardInputEvent.repeat` 필드를 넣는다(없으면 필드 자체 없음) */
const key = (pressed: boolean, heldCount: number, special: SpecialKey | null = null, repeat?: boolean) =>
  emit(
    'keyboard',
    repeat === undefined
      ? { pressed, heldCount, special, ts: Date.now() }
      : { pressed, heldCount, special, repeat, ts: Date.now() },
  )
const move = (x: number, y: number) => emit('mouseMove', { x, y, ts: Date.now() })
const canvas = (c: HTMLElement) => c.querySelector('.canvas') as HTMLElement | null
const jelly = (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement
/** 키보드 파츠 img = .jellyWrap의 마지막 자식 */
const kbImg = (c: HTMLElement) => jelly(c).lastElementChild as HTMLImageElement
const src = (el: Element) => el.getAttribute('src')
const watch = (...els: Element[]) => {
  const mo = new MutationObserver(() => undefined)
  for (const el of els) mo.observe(el, { attributes: true, attributeFilter: ['class', 'src'] })
  return mo
}
const loadedOnce = () => {
  for (const fn of [getSettings, getAssetManifest, getMonitors, getHandAnchor]) expect(fn).toHaveBeenCalledTimes(1)
  expect(legacyBounds).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(T0)
  vi.clearAllMocks()
  for (const k of Object.keys(h.handlers)) delete h.handlers[k]
  vi.mocked(getSettings).mockResolvedValue(SETTINGS)
  vi.mocked(getAssetManifest).mockResolvedValue(SPECIAL_MANIFEST)
  vi.mocked(getMonitors).mockResolvedValue(MONITORS)
  vi.mocked(getHandAnchor).mockResolvedValue({ x: 520, y: 530 })
  vi.mocked(setSettings).mockImplementation(async s => s)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('부르르 켜짐·꺼짐 (design/functions.md §5.1 키보드 핸들러·jellyClass, design.md §6 P-2·§10.3 규칙 1·5)', () => {
  it('TC-169: 일반 키 꾹 누름 — 첫 누름 jellyAlt, 반복 누름 → jellyWrap shiver(프레임 불변), 반복 계속은 class·src 변경 0건, 뗌 → jellyWrap·kb_up', async () => {
    const { container } = await mount()
    const j = jelly(container)
    await key(true, 1, null, false)
    expect([j.className, src(kbImg(container))]).toEqual(['jellyWrap jellyAlt', 'u:kb_down_1'])
    await advance(500)
    await key(true, 1, null, true)
    expect([j.className, src(kbImg(container))]).toEqual(['jellyWrap shiver', 'u:kb_down_1'])
    const img = kbImg(container)
    const mo = watch(j, img)
    for (let i = 0; i < 4; i++) {
      await advance(33)
      await key(true, 1, null, true)
    }
    expect(mo.takeRecords()).toHaveLength(0)
    mo.disconnect()
    expect([j.className, src(img), img.className]).toEqual(['jellyWrap shiver', 'u:kb_down_1', 'layer'])
    await key(false, 0, null, false)
    expect(jelly(container)).toBe(j)
    expect([j.className, src(kbImg(container)), kbImg(container).className]).toEqual(['jellyWrap', 'u:kb_up', 'layer'])
    expect(container.querySelectorAll('.shiver, .jelly, .jellyAlt')).toHaveLength(0)
    expect(setSettings).not.toHaveBeenCalled()
    loadedOnce()
  })

  it('TC-170: 특수 키 꾹 누름 — 전용 그림 유지+부르르, 반복 중 새 특수 키 → 젤리, 그 키 반복 → 부르르, 그 키 뗌 → 정지(젤리 재생 없음)', async () => {
    const { container } = await mount()
    const j = jelly(container)
    const state = () => [j.className, src(kbImg(container))]
    await key(true, 1, 'space', false)
    expect(state()).toEqual(['jellyWrap jellyAlt', 'u:key_space'])
    await key(true, 1, 'space', true)
    expect(state()).toEqual(['jellyWrap shiver', 'u:key_space'])
    const mo = watch(j, kbImg(container))
    await key(true, 1, 'space', true)
    await key(true, 1, 'space', true)
    expect(mo.takeRecords()).toHaveLength(0)
    mo.disconnect()
    await key(true, 2, 'enter', false)
    expect(state()).toEqual(['jellyWrap jelly', 'u:key_enter'])
    await key(true, 2, 'enter', true)
    expect(state()).toEqual(['jellyWrap shiver', 'u:key_enter'])
    await key(false, 1, 'enter', false)
    expect(state()).toEqual(['jellyWrap', 'u:key_space'])
    await key(false, 0, 'space', false)
    expect(state()).toEqual(['jellyWrap', 'u:kb_up'])
    expect(jelly(container)).toBe(j)
    expect(kbImg(container).className).toBe('layer')
    expect((container.querySelector('.armWrap') as HTMLElement).className).toBe('armWrap')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-171: repeat 필드 없음·undefined·true가 아닌 값 → 반복 아님(옛 규칙: 프레임 순환·재생 없음), repeat true만 부르르', async () => {
    const { container } = await mount()
    const j = jelly(container)
    const raw = (extra: Record<string, unknown>) =>
      emit('keyboard', { pressed: true, heldCount: 1, special: null, ts: Date.now(), ...extra })
    await raw({})
    expect([j.className, src(kbImg(container))]).toEqual(['jellyWrap jellyAlt', 'u:kb_down_1'])
    const mo = new MutationObserver(() => undefined)
    mo.observe(j, { attributes: true, attributeFilter: ['class'] })
    const frames: Array<string | null> = []
    for (const extra of [{}, { repeat: 'true' }, { repeat: 1 }, { repeat: undefined }]) {
      await raw(extra)
      frames.push(src(kbImg(container)))
      expect(container.querySelector('.shiver')).toBeNull()
    }
    expect(frames).toEqual(['u:kb_down_2', 'u:kb_down_0', 'u:kb_down_1', 'u:kb_down_2'])
    expect(mo.takeRecords()).toHaveLength(0)
    mo.disconnect()
    expect(j.className).toBe('jellyWrap jellyAlt')
    await raw({ repeat: true })
    expect([j.className, src(kbImg(container))]).toEqual(['jellyWrap shiver', 'u:kb_down_2'])
    await key(false, 0, null)
    expect([j.className, src(kbImg(container))]).toEqual(['jellyWrap', 'u:kb_up'])
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('동시 부착 금지·배경 격리·팔 변형 유지 (design/components.md 배경 DOM 구조 5·6, design.md §10.1·§10.3)', () => {
  it('TC-172: 애니메이션 클래스는 .jellyWrap 하나에 많아야 하나 — 부르르 중에도 안쪽 요소·배경 무변화, 팔 변형 유지', async () => {
    const { container } = await mount()
    await move(960, 1080)
    const cv = canvas(container) as HTMLElement
    const hand = container.querySelector('.armWrap img') as HTMLImageElement
    const bg = container.querySelector('img[src="u:background"]') as HTMLImageElement
    const check = (expected: string) => {
      const j = jelly(container)
      expect(j.className).toBe(expected)
      expect(j.classList.length).toBeLessThanOrEqual(2)
      const animated = container.querySelectorAll('.jelly, .jellyAlt, .shiver')
      expect(animated).toHaveLength(expected === 'jellyWrap' ? 0 : 1)
      if (animated.length > 0) expect(animated[0]).toBe(j)
      expect(container.querySelectorAll('.bounce, .bounceAlt')).toHaveLength(0)
      expect((container.querySelector('.armWrap') as HTMLElement).className).toBe('armWrap')
      for (const img of Array.from(j.querySelectorAll('img'))) expect(['layer', 'hand']).toContain(img.className)
      expect(cv.className).toBe('canvas')
      expect((container.querySelector('.root') as HTMLElement).className).toBe('root')
      expect(hand.style.transform).toBe(DOWN)
      expect(hand.style.transformOrigin).toBe('620px 530px')
      expect(container.querySelector('img[src="u:background"]')).toBe(bg)
      expect(bg.parentElement).toBe(cv)
      expect(bg.closest('.jellyWrap')).toBeNull()
      expect([bg.className, bg.hasAttribute('style')]).toEqual(['layer', false])
      expect(cv.children[0]).toBe(bg)
      expect(cv.children[1]).toBe(j)
    }
    await key(true, 1, null, false)
    check('jellyWrap jellyAlt') // A 첫 누름
    await key(true, 1, null, true)
    check('jellyWrap shiver') // B 반복
    await key(true, 2, 'space', false)
    check('jellyWrap jelly') // C 반복 중 새 특수 키
    await key(true, 2, 'space', true)
    check('jellyWrap shiver') // D 새 키 반복
    await key(false, 0, null, false)
    check('jellyWrap') // E 모두 뗌
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('끊김 방어 통합 (design/functions.md §5.2 tick 행, design.md §6 P-3·§10.3 규칙 2·4)', () => {
  it('TC-173: 뗌 누락 — 마지막 반복 뒤 499ms는 부르르, 500ms tick에서 jellyWrap(젤리 재생 없음), 마우스 이동은 방어를 늦추지 않음', async () => {
    const { container } = await mount()
    const j = jelly(container)
    await advance(1000) // T0+1000 (tick 경계)
    await key(true, 1, null, false)
    expect(j.className).toBe('jellyWrap jellyAlt')
    const pressedSrc = src(kbImg(container))
    await advance(500)
    await key(true, 1, null, true) // 반복 ts T0+1500
    expect(j.className).toBe('jellyWrap shiver')
    await advance(499) // T0+1999 — 마지막 tick T0+1900(400ms)
    expect(j.className).toBe('jellyWrap shiver')
    await advance(1) // tick T0+2000(500ms)
    expect(j.className).toBe('jellyWrap')
    expect(container.querySelectorAll('.jelly, .jellyAlt, .shiver')).toHaveLength(0)
    expect([src(kbImg(container)), kbImg(container).className]).toEqual([pressedSrc, 'layer'])
    await key(true, 1, null, true) // 재시작 ts T0+2000
    expect(j.className).toBe('jellyWrap shiver')
    await advance(200)
    await move(960, 0) // ts T0+2200 — lastInputAt만 갱신
    await advance(299) // T0+2499 — tick T0+2400(400ms)
    expect(j.className).toBe('jellyWrap shiver')
    await advance(1) // tick T0+2500(500ms, 이동 뒤 300ms)
    expect(j.className).toBe('jellyWrap')
    await key(false, 0, null, false)
    expect(jelly(container)).toBe(j)
    expect([j.className, src(kbImg(container))]).toEqual(['jellyWrap', 'u:kb_up'])
    expect(setSettings).not.toHaveBeenCalled()
    loadedOnce()
  })
})
