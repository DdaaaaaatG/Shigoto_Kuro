/**
 * OverlayApp 특수 키 통합 TC — design/functions.md §5.1 키보드 핸들러(CR-021: special = isSpecialKey(p.special) ? p.special : null,
 * 보관·누적·console·bridge 전송 없음)·jellyClass(CR-022), §5.3 LayerStack 렌더(pickKeyboardEntry, 바운스 없음),
 * design.md §6 P-2, §10.3 젤리, §10.6 규칙표·입력 내용 비보관. CR-021(R-22 + 추가 결정 ①~③)·CR-022(R-23).
 * bridge 는 mock(vi.mock 'bridge/commands'·'bridge/events'). 실제 Tauri API import 없음. 가짜 시계. 실제 sleep 없음.
 * 매니페스트 SPECIAL_MANIFEST: 배경·몸통·대기·쉬는중·kb_up·kb_down 3장·마우스 파츠 900×700 + key_space·key_enter·key_undo.
 *   key_z·key_question·key_exclamation·key_backspace 미등록. 슬롯 key_* 는 AssetSlot 확장 전이라 캐스팅.
 * 바운스(젤리) 관찰 대상 = .jellyWrap 하나(CR-022): 마운트 뒤 모든 키가 떼진 상태의 첫 누름 = bounceSeq 1 → 'jellyWrap jellyAlt',
 *   다음 재생 = 'jellyWrap jelly'(scenarios.md v0.9 전제). 키보드 img class는 항상 layer, .armWrap은 항상 armWrap.
 * 입력 순서를 파일·스냅샷·로그로 남기지 않는다(R-22).
 * 시나리오: src/overlay/test/scenarios.md TC-144 ~ TC-150 (v0.9 개정표)
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
// CR-022 mock 클래스(scenarios.md v0.9). bounce·bounceAlt는 잔존 감시용 — 소스가 쓰면 className에 드러난다
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
const REST = 'rotate(0deg) scaleX(1) rotate(0deg)'
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
const key = (pressed: boolean, heldCount: number, special: SpecialKey | null = null) =>
  emit('keyboard', { pressed, heldCount, special, ts: Date.now() })
/** 젤리 래퍼(CR-022) — 바운스 클래스는 이 요소에만 */
const jelly = (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement
/** 키보드 파츠 img = .jellyWrap의 마지막 자식(CR-022 DOM: 배경 | jellyWrap[armWrap, 몸통, 상태, 키보드]) */
const kbImg = (c: HTMLElement) => jelly(c).lastElementChild as HTMLImageElement
/** 키보드 src·class와 젤리 래퍼 class를 함께 본다 */
const kb = (c: HTMLElement) => ({
  src: kbImg(c).getAttribute('src'),
  cls: kbImg(c).className,
  jelly: jelly(c).className,
})
const arm = (c: HTMLElement) => c.querySelector('.armWrap') as HTMLElement
const classWatch = (...els: Element[]) => {
  const mo = new MutationObserver(() => undefined)
  for (const el of els) mo.observe(el, { attributes: true, attributeFilter: ['class'] })
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

describe('P-2 특수 키 — 전용 그림·젤리 짝 교대 (design.md §10.3·§10.6)', () => {
  it('TC-144: 스페이스 누름 → 키보드 자리에 key_space + 첫 누름 젤리(jellyWrap jellyAlt), 뗌 → kb_up·젤리 해제, 같은 img', async () => {
    const { container } = await mount()
    const el = kbImg(container)
    expect(kb(container)).toEqual({ src: 'u:kb_up', cls: 'layer', jelly: 'jellyWrap' })
    await key(true, 1, 'space')
    expect(kbImg(container)).toBe(el)
    expect(kb(container)).toEqual({ src: 'u:key_space', cls: 'layer', jelly: 'jellyWrap jellyAlt' })
    expect(arm(container).className).toBe('armWrap')
    expect(container.querySelector('img[src="u:idle"]')?.className).toBe('layer')
    expect(container.querySelector('img[src^="u:kb_down_"]')).toBeNull()
    await key(false, 0, 'space')
    expect(kbImg(container)).toBe(el)
    expect(kb(container)).toEqual({ src: 'u:kb_up', cls: 'layer', jelly: 'jellyWrap' })
    expect(arm(container).className).toBe('armWrap')
    expect(setSettings).not.toHaveBeenCalled()
    loadedOnce()
  })

  // CR-066: 새 누름(자동 반복 아님)은 다른 키를 누른 채여도 매번 젤리를 다시 시작한다 — 아래 TC-145~148 개정
  it('TC-145: 규칙 2~7 — 스페이스 → a → Enter → Enter 뗌 → 스페이스 뗌 → a 뗌: 그림 복귀·젤리 짝 교대(같은 래퍼, a 누름도 교대 CR-066)', async () => {
    const { container } = await mount()
    const el = kbImg(container)
    const j = jelly(container)
    const steps: Array<[() => Promise<void>, string, string]> = [
      [() => key(true, 1, 'space'), 'u:key_space', 'jellyAlt'],
      [() => key(true, 2, null), 'u:key_space', 'jelly'],
      [() => key(true, 3, 'enter'), 'u:key_enter', 'jellyAlt'],
      [() => key(false, 2, 'enter'), 'u:key_space', 'jellyAlt'],
      [() => key(false, 1, 'space'), 'u:kb_down_0', 'jellyAlt'],
    ]
    for (const [step, src, phase] of steps) {
      await step()
      expect(kbImg(container)).toBe(el)
      expect(jelly(container)).toBe(j)
      expect(kb(container)).toEqual({ src, cls: 'layer', jelly: `jellyWrap ${phase}` })
      expect(arm(container).className).toBe('armWrap')
    }
    await key(false, 0, null)
    expect(kb(container)).toEqual({ src: 'u:kb_up', cls: 'layer', jelly: 'jellyWrap' })
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-146: 규칙 8·12·13 — key_z 미등록 Z → 누름 프레임+젤리, Ctrl+Z(undo) → key_undo+재생, Ctrl+C(null) → 그림 변경 없음·젤리 재생(CR-066)', async () => {
    const { container } = await mount()
    await key(true, 1, 'z')
    expect(kb(container)).toEqual({ src: 'u:kb_down_1', cls: 'layer', jelly: 'jellyWrap jellyAlt' })
    await key(false, 0, 'z')
    expect(kb(container)).toEqual({ src: 'u:kb_up', cls: 'layer', jelly: 'jellyWrap' })
    await key(true, 1, null)
    expect(kb(container)).toEqual({ src: 'u:kb_down_2', cls: 'layer', jelly: 'jellyWrap jelly' })
    await key(true, 2, 'undo')
    expect(kb(container)).toEqual({ src: 'u:key_undo', cls: 'layer', jelly: 'jellyWrap jellyAlt' })
    const el = kbImg(container)
    const mo = new MutationObserver(() => undefined)
    mo.observe(el, { attributes: true, attributeFilter: ['class', 'src'] })
    await key(true, 3, null)
    expect(mo.takeRecords()).toHaveLength(0)
    mo.disconnect()
    expect(kb(container)).toEqual({ src: 'u:key_undo', cls: 'layer', jelly: 'jellyWrap jelly' })
    await key(false, 0, null)
    expect(kb(container)).toEqual({ src: 'u:kb_up', cls: 'layer', jelly: 'jellyWrap' })
    expect(setSettings).not.toHaveBeenCalled()
  })

  // CR-066: repeat 플래그 없는 재누름은 새 누름 — 젤리는 교대, 키보드 img class는 변경 0(자동 반복 repeat:true는 OverlayApp.shiver)
  it('TC-147: 규칙 9 — 같은 특수 키 재누름(repeat 없음)은 그림 유지·젤리 교대(CR-066), [space, enter]에서 스페이스 재누름 → key_space로 바뀌고 교대', async () => {
    const { container } = await mount()
    await key(true, 1, 'space')
    const el = kbImg(container)
    const j = jelly(container)
    const mo = classWatch(el)
    for (let i = 0; i < 3; i++) await key(true, 1, 'space')
    expect(mo.takeRecords()).toHaveLength(0)
    expect(jelly(container)).toBe(j)
    expect(kb(container)).toEqual({ src: 'u:key_space', cls: 'layer', jelly: 'jellyWrap jelly' })
    await key(true, 2, 'enter')
    expect(kb(container)).toEqual({ src: 'u:key_enter', cls: 'layer', jelly: 'jellyWrap jellyAlt' })
    mo.takeRecords()
    await key(true, 2, 'space')
    expect(mo.takeRecords()).toHaveLength(0)
    mo.disconnect()
    expect(kb(container)).toEqual({ src: 'u:key_space', cls: 'layer', jelly: 'jellyWrap jelly' })
    expect(arm(container).className).toBe('armWrap')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-148: bridge special 누락·undefined·7종 밖 값은 null — 전용 그림 없음, 누름 유지 중 새 누름은 젤리 교대(CR-066)', async () => {
    const { container } = await mount()
    await emit('keyboard', { pressed: true, heldCount: 1, ts: Date.now() })
    expect(kb(container)).toEqual({ src: 'u:kb_down_1', cls: 'layer', jelly: 'jellyWrap jellyAlt' })
    const mo = classWatch(kbImg(container))
    await emit('keyboard', { pressed: true, heldCount: 2, special: 'bogus', ts: Date.now() })
    await emit('keyboard', { pressed: true, heldCount: 3, special: 'Space', ts: Date.now() })
    await emit('keyboard', { pressed: true, heldCount: 4, special: undefined, ts: Date.now() })
    expect(mo.takeRecords()).toHaveLength(0)
    mo.disconnect()
    expect(kb(container)).toEqual({ src: 'u:kb_down_1', cls: 'layer', jelly: 'jellyWrap jelly' })
    expect(container.querySelector('img[src^="u:key_"]')).toBeNull()
    await emit('keyboard', { pressed: false, heldCount: 0, special: 'bogus', ts: Date.now() })
    expect(kb(container)).toEqual({ src: 'u:kb_up', cls: 'layer', jelly: 'jellyWrap' })
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-150: 쉬는중에서 특수 키 → 대기로 깨어나고 전용 그림·젤리, 팔은 쉬는 위치(REST) 유지', async () => {
    const { container } = await mount()
    await act(async () => {
      vi.advanceTimersByTime(300_000)
    })
    expect(container.querySelector('img[src="u:rest"]')?.className).toBe('layer')
    await key(true, 1, 'enter')
    expect(container.querySelector('img[src="u:idle"]')?.className).toBe('layer')
    expect(container.querySelector('img[src="u:rest"]')).toBeNull()
    expect(kb(container)).toEqual({ src: 'u:key_enter', cls: 'layer', jelly: 'jellyWrap jellyAlt' })
    expect(arm(container).className).toBe('armWrap')
    expect((container.querySelector('.armWrap img') as HTMLImageElement).style.transform).toBe(REST)
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('입력 내용 비보관 (R-22 🔒, design.md §10.6)', () => {
  it('TC-149: 특수 키 입력 동안 console 출력·저장소 쓰기·setSettings·추가 command 0회, 모두 떼면 DOM에 분류값 흔적 없음', async () => {
    const { container } = await mount()
    const title = document.title
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(m =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    )
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const seq: Array<[boolean, number, SpecialKey | null]> = [
      [true, 1, 'space'],
      [true, 2, 'z'],
      [false, 1, 'z'],
      [true, 2, 'question'],
      [true, 3, 'exclamation'],
      [false, 2, 'exclamation'],
      [true, 3, 'backspace'],
      [true, 4, 'undo'],
      [true, 5, 'enter'],
      [false, 4, 'enter'],
      [true, 5, null],
    ]
    for (const [p, n, s] of seq) await key(p, n, s)
    await key(false, 0, null)
    for (const sp of spies) expect(sp).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(setSettings).not.toHaveBeenCalled()
    loadedOnce()
    expect(container.textContent).toBe('')
    expect(container.innerHTML).not.toMatch(/key_|space|question|exclamation|enter|backspace|undo/)
    expect(document.title).toBe(title)
    expect(kb(container)).toEqual({ src: 'u:kb_up', cls: 'layer', jelly: 'jellyWrap' })
  })
})
