/**
 * OverlayApp 젤리 래퍼 통합 TC — CR-022(R-23 젤리 바운스).
 * 근거: design.md §1 출력·§2 ASCII(.jellyWrap = .canvas 둘째 자식)·§6 P-2·§10.3 젤리 행·폐기 행·마우스 팔과의 합성,
 *   design/components.md 렌더 조건 .jellyWrap 행·배경 DOM 구조 1~5, design/functions.md §5.1 jellyClass
 *   (null → 'jellyWrap', 0 → 'jellyWrap jelly', 1 → 'jellyWrap jellyAlt', export 없음 → 렌더 결과로 검증),
 *   §5.4 .armWrap 컨테이너(클래스 항상 armWrap).
 * bridge 는 mock(vi.mock 'bridge/commands'·'bridge/events'). 실제 Tauri API import 없음. 가짜 시계. 실제 sleep 없음.
 * 매니페스트 SPECIAL_MANIFEST: 배경·몸통·대기·쉬는중·kb_up·kb_down 3장·마우스 파츠 900×700 + key_space·key_enter·key_undo.
 * 바운스 짝: 마운트 뒤 모든 키가 떼진 상태의 첫 누름 = bounceSeq 1 → phase 1 → jellyAlt(scenarios.md v0.8·v0.9 전제).
 * 입력 순서를 파일·스냅샷·로그로 남기지 않는다(R-22).
 * 시나리오: src/overlay/test/scenarios.md TC-152 ~ TC-157
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
// CR-022 mock 클래스: jellyWrap·jelly·jellyAlt. bounce·bounceAlt는 잔존 감시용(소스가 쓰면 .bounce 선택자로 잡힌다)
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
const NO_BG_MANIFEST: AssetManifest = {
  ...SPECIAL_MANIFEST,
  entries: SPECIAL_MANIFEST.entries.filter(e => e.url !== 'u:background'),
}
const EMPTY_CANVAS: AssetManifest = { canvas: null, entries: [] }
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
const key = (pressed: boolean, heldCount: number, special: SpecialKey | null = null) =>
  emit('keyboard', { pressed, heldCount, special, ts: Date.now() })
const move = (x: number, y: number) => emit('mouseMove', { x, y, ts: Date.now() })
const canvas = (c: HTMLElement) => c.querySelector('.canvas') as HTMLElement | null
const jelly = (c: HTMLElement) => c.querySelector('.jellyWrap') as HTMLElement
/** 키보드 파츠 img = .jellyWrap의 마지막 자식(CR-022 DOM: 배경 | jellyWrap[armWrap, 몸통, 상태, 키보드]) */
const kbImg = (c: HTMLElement) => jelly(c).lastElementChild as HTMLImageElement
/** 자식 식별자: img면 src, 아니면 첫 클래스 */
const ids = (el: Element) =>
  Array.from(el.children).map(ch => (ch.tagName === 'IMG' ? ch.getAttribute('src') : ch.classList[0]))
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

describe('젤리 래퍼 구조 (design.md §2, design/components.md 렌더 조건)', () => {
  it('TC-152: .canvas 자식 = [배경, .jellyWrap], .jellyWrap 자식 = [armWrap, 몸통, 상태, 키보드], 입력 없으면 class jellyWrap', async () => {
    const { container } = await mount()
    const cv = canvas(container) as HTMLElement
    expect(ids(cv)).toEqual(['u:background', 'jellyWrap'])
    expect(container.querySelectorAll('.jellyWrap')).toHaveLength(1)
    const j = jelly(container)
    expect(j.parentElement).toBe(cv)
    expect(j.className).toBe('jellyWrap')
    expect(j.hasAttribute('style')).toBe(false)
    expect(ids(j)).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up'])
    expect(kbImg(container).getAttribute('src')).toBe('u:kb_up')
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-153: .jellyWrap은 조건 없이 렌더 — ① mouse null ② 배경 없음, ③ canvas null이면 없음', async () => {
    // ① 설정 mouse = null → .armWrap 없이 [몸통, 상태, 키보드]
    vi.mocked(getSettings).mockResolvedValue({ ...SETTINGS, mouse: null })
    const a = await mount()
    expect(ids(canvas(a.container) as HTMLElement)).toEqual(['u:background', 'jellyWrap'])
    expect(ids(jelly(a.container))).toEqual(['u:body', 'u:idle', 'u:kb_up'])
    await key(true, 1)
    expect(jelly(a.container).className).toBe('jellyWrap jellyAlt')
    loadedOnce()
    a.unmount()

    // ② 배경 없는 매니페스트 → .canvas 자식은 .jellyWrap 하나
    vi.clearAllMocks()
    vi.mocked(getSettings).mockResolvedValue(SETTINGS)
    vi.mocked(getAssetManifest).mockResolvedValue(NO_BG_MANIFEST)
    const b = await mount()
    expect(ids(canvas(b.container) as HTMLElement)).toEqual(['jellyWrap'])
    expect(ids(jelly(b.container))).toEqual(['armWrap', 'u:body', 'u:idle', 'u:kb_up'])
    await key(true, 1)
    expect(jelly(b.container).className).toBe('jellyWrap jellyAlt')
    loadedOnce()
    b.unmount()

    // ③ canvas null → .canvas·.jellyWrap 모두 없음(.root만)
    vi.clearAllMocks()
    vi.mocked(getAssetManifest).mockResolvedValue(EMPTY_CANVAS)
    const c = await mount()
    expect(canvas(c.container)).toBeNull()
    expect(c.container.querySelector('.jellyWrap')).toBeNull()
    expect(c.container.querySelector('.root')).not.toBeNull()
    loadedOnce()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('젤리 클래스 교대 (design/functions.md §5.1 jellyClass, design.md §10.3 재생 조건)', () => {
  // CR-066: 누름 유지 중 새 누름도 젤리를 다시 시작한다(짝 교대) — 뗌만 class 변경 0건
  it('TC-154: 일반 키 — 첫 누름 jellyAlt, 뗌 해제, 다음 첫 누름 jelly, 누름 유지 중 추가 누름은 교대(CR-066)·뗌은 class 변경 0건, 같은 노드', async () => {
    const { container } = await mount()
    const j = jelly(container)
    const seq: Array<[() => Promise<void>, string, string]> = [
      [() => key(true, 1), 'jellyWrap jellyAlt', 'u:kb_down_1'],
      [() => key(false, 0), 'jellyWrap', 'u:kb_up'],
      [() => key(true, 1), 'jellyWrap jelly', 'u:kb_down_2'],
      [() => key(true, 2), 'jellyWrap jellyAlt', 'u:kb_down_0'],
    ]
    for (const [act_, cls, src] of seq) {
      await act_()
      expect(jelly(container)).toBe(j)
      expect(j.className).toBe(cls)
      expect(kbImg(container).getAttribute('src')).toBe(src)
      expect(kbImg(container).className).toBe('layer')
    }
    const mo = classWatch(j)
    await key(false, 1)
    expect(j.className).toBe('jellyWrap jellyAlt')
    expect(kbImg(container).getAttribute('src')).toBe('u:kb_down_0')
    expect(mo.takeRecords()).toHaveLength(0)
    mo.disconnect()
    await key(false, 0)
    expect(jelly(container)).toBe(j)
    expect(j.className).toBe('jellyWrap')
    expect(kbImg(container).getAttribute('src')).toBe('u:kb_up')
    expect(kbImg(container).className).toBe('layer')
    expect(setSettings).not.toHaveBeenCalled()
    loadedOnce()
  })

  // CR-066: repeat 플래그 없는 같은 특수 키 재누름은 새 누름이라 교대한다(자동 반복 repeat:true는 부르르 — TC-169~173)
  it('TC-155: 특수 키 새 누름마다 교대(다른 키 누른 채여도), 같은 특수 키 재누름(repeat 없음)도 교대(CR-066)·뗌은 class 변경 0건', async () => {
    const { container } = await mount()
    const j = jelly(container)
    const arm = container.querySelector('.armWrap') as HTMLElement
    await key(true, 1, null)
    expect([j.className, kbImg(container).getAttribute('src')]).toEqual(['jellyWrap jellyAlt', 'u:kb_down_1'])
    await key(true, 2, 'space')
    expect([j.className, kbImg(container).getAttribute('src')]).toEqual(['jellyWrap jelly', 'u:key_space'])
    await key(true, 3, 'enter')
    expect([j.className, kbImg(container).getAttribute('src')]).toEqual(['jellyWrap jellyAlt', 'u:key_enter'])
    await key(true, 3, 'enter') // 재누름(repeat 없음) = 새 누름
    expect([j.className, kbImg(container).getAttribute('src')]).toEqual(['jellyWrap jelly', 'u:key_enter'])
    const mo = classWatch(j)
    await key(false, 2, 'enter')
    expect([j.className, kbImg(container).getAttribute('src')]).toEqual(['jellyWrap jelly', 'u:key_space'])
    expect(mo.takeRecords()).toHaveLength(0)
    mo.disconnect()
    await key(false, 0, null)
    expect([j.className, kbImg(container).getAttribute('src')]).toEqual(['jellyWrap', 'u:kb_up'])
    expect(jelly(container)).toBe(j)
    expect(kbImg(container).className).toBe('layer')
    expect(arm.className).toBe('armWrap')
    expect(setSettings).not.toHaveBeenCalled()
  })
})

describe('이중 적용 금지·배경 격리 (design/components.md 배경 DOM 구조 1~5, design.md §10.3)', () => {
  it('TC-156: 애니메이션 클래스는 .jellyWrap 하나에만 — .armWrap·안쪽 img·.canvas·.root에는 없고 팔 변형은 유지', async () => {
    const { container } = await mount()
    await move(960, 1080)
    const hand = container.querySelector('.armWrap img') as HTMLImageElement
    expect(hand.style.transform).toBe(DOWN)
    expect(hand.style.transformOrigin).toBe('620px 530px')

    const check = (expected: string) => {
      const animated = container.querySelectorAll('.jelly, .jellyAlt')
      expect(animated).toHaveLength(1)
      expect(animated[0]).toBe(jelly(container))
      expect(jelly(container).className).toBe(expected)
      expect(container.querySelectorAll('.bounce, .bounceAlt')).toHaveLength(0)
      expect((container.querySelector('.armWrap') as HTMLElement).className).toBe('armWrap')
      for (const img of Array.from(jelly(container).querySelectorAll('img'))) {
        expect(['layer', 'hand']).toContain(img.className)
      }
      expect((canvas(container) as HTMLElement).className).toBe('canvas')
      expect((container.querySelector('.root') as HTMLElement).className).toBe('root')
      expect(hand.style.transform).toBe(DOWN)
      expect(hand.style.transformOrigin).toBe('620px 530px')
    }
    await key(true, 1)
    check('jellyWrap jellyAlt') // 검사 A
    await key(false, 0)
    await key(true, 1)
    check('jellyWrap jelly') // 검사 B
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-157: 배경 img는 .jellyWrap 밖(.canvas 직계 첫 자식) — 키·이동이 와도 같은 노드·부모·class·style 불변, 래퍼만 바뀜', async () => {
    const { container } = await mount()
    const cv = canvas(container) as HTMLElement
    const bg = container.querySelector('img[src="u:background"]') as HTMLImageElement
    const assertBg = (jellyCls: string) => {
      expect(container.querySelector('img[src="u:background"]')).toBe(bg)
      expect(bg.parentElement).toBe(cv)
      expect(bg.closest('.jellyWrap')).toBeNull()
      expect(jelly(container).contains(bg)).toBe(false)
      expect(bg.className).toBe('layer')
      expect(bg.hasAttribute('style')).toBe(false)
      expect(cv.children[0]).toBe(bg)
      expect(cv.children[1]).toBe(jelly(container))
      expect(jelly(container).className).toBe(jellyCls)
    }
    assertBg('jellyWrap')
    await key(true, 1, 'space')
    assertBg('jellyWrap jellyAlt')
    await key(false, 0, 'space')
    assertBg('jellyWrap')
    await key(true, 1, null)
    assertBg('jellyWrap jelly')
    await move(960, 0)
    assertBg('jellyWrap jelly')
    await key(false, 0, null)
    assertBg('jellyWrap')
    expect(getAssetManifest).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })
})
