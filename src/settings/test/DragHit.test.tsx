/// <reference types="node" />
/**
 * settings 「어깨축·손 위치」 탭 — 팔·손 끌기 픽셀 판정(R-37)·영역 상자(R-38) 스펙. CR-040.
 * 기준: src/settings/design/drag-hit.md §3 ~ §8 · src/settings/requirements.md v1.14 R-37·R-38·S-19 · design.md §11 D-4 토큰 블록
 *       · scenarios.md TC-216 ~ TC-225 · TC-FLOW-20.
 * useAlphaMask 는 vi.mock 으로 바꾼다(drag-hit §5.3 「테스트 이음새」): url → 마스크 Map, 없는 url·undefined → null.
 *   named(useAlphaMask)·default 둘 다 같은 vi.fn 이다. Map 은 렌더 전에 채운다(mock 은 같은 객체를 돌려주므로 렌더 뒤 바꾸면 반영 안 됨).
 * 좌표: 캔버스 900×700 · scale 0.5 · rect 0 → clientX/Y = 미리보기 오프셋 = 캔버스 × 0.5.
 *   기본 그림: 팔(mouse_base) 171×199 @ (389,492) = [389,560)×[492,691) · 펜 손(pen_up) 136×196 @ (356,504) = [356,492)×[504,700).
 *   겹친 점 P = 캔버스 (450,600) = 오프셋 (225,300) — 팔 기준 (61,108) · 펜 손 기준 (94,96).
 *   이동 오프셋 (235,290) = 캔버스 (470,580) → 팔 (409,472) / 펜 손 (376,484). 제한 범위 팔 [0,729]×[0,501] · 펜 손 [0,764]×[0,504] 안.
 *   두 그림 모두 투명한 겹친 자리(TC-FLOW-20) = 캔버스 (480,680) = 오프셋 (240,340).
 * CSS 규칙은 fs.readFileSync 로 원문을 읽는다(`?raw` 는 vitest 가 .module.css 를 CSS Modules 로 처리해 collect 실패 — overlayStyles.test.ts 교훈).
 * 포인터 보강(PointerEvent stub·포인터 캡처 stub)은 MousePartsTab.test.tsx 와 같다(scenarios.md 「포인터·좌표 규약」).
 * 선행: CR-040 소스(alphaMask.ts · components/useAlphaMask.ts · components/PartOutline.tsx·.module.css · settings.module.css 토큰 ·
 *       mouseWizard.ts hitOpaque · MousePartsTab 개정). 없으면 import 단계에서 파일 전체가 실패한다(TDD 예정된 FAIL).
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { AssetEntry, AssetManifest, BridgeError, MouseSettings, Point, Settings } from 'bridge/types'
import { DEFAULT_TIMER_SETTINGS } from 'bridge/types'
import { setSettings } from 'bridge/commands'
import type { AlphaMask } from '../alphaMask'
import MousePartsTab from '../components/MousePartsTab'
import PartOutline from '../components/PartOutline'

const { masks, maskHook } = vi.hoisted(() => ({
  masks: new Map<string, AlphaMask>(),
  maskHook: vi.fn(),
}))

vi.mock('../components/useAlphaMask', () => ({ useAlphaMask: maskHook, default: maskHook }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))
vi.mock('bridge/commands', async importOriginal => {
  const actual = await importOriginal<typeof import('bridge/commands')>()
  return {
    ...actual, // toBridgeError 는 실물
    getSettings: vi.fn(),
    setSettings: vi.fn(),
    getAssetManifest: vi.fn(),
    importAsset: vi.fn(),
    removeAsset: vi.fn(),
    setAutostart: vi.fn(),
    pickPngFile: vi.fn(),
  }
})

// ─── jsdom 포인터 보강 ─────────────────────────────────────────────────────
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventStub extends MouseEvent {
    readonly pointerId: number
    readonly pointerType: string
    readonly isPrimary: boolean
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.pointerType = init.pointerType ?? 'mouse'
      this.isPrimary = init.isPrimary ?? true
    }
  }
  Object.defineProperty(window, 'PointerEvent', { configurable: true, writable: true, value: PointerEventStub })
}

let capture: { set: Mock; release: Mock; has: Mock }
const installPointerCapture = () => {
  const held = new Set<number>()
  capture = {
    set: vi.fn((id: number) => {
      held.add(id)
    }),
    release: vi.fn((id: number) => {
      held.delete(id)
    }),
    has: vi.fn((id: number) => held.has(id)),
  }
  const methods: [string, Mock][] = [
    ['setPointerCapture', capture.set],
    ['releasePointerCapture', capture.release],
    ['hasPointerCapture', capture.has],
  ]
  for (const [name, fn] of methods) {
    Object.defineProperty(Element.prototype, name, { configurable: true, writable: true, value: fn })
  }
}

// ─── 픽스처 ────────────────────────────────────────────────────────────────
const CANVAS = { width: 900, height: 700 }
const ARM_SIZE = { width: 171, height: 199 }
const PEN_SIZE = { width: 136, height: 196 }
const ARM_POS: Point = { x: 389, y: 492 }
const PEN_POS: Point = { x: 356, y: 504 }
const ARM_MOVED: Point = { x: 409, y: 472 }
const PEN_MOVED: Point = { x: 376, y: 484 }

const entry = (slot: string, width: number, height: number): AssetEntry => ({
  slot: slot as AssetEntry['slot'],
  fileName: `${slot}.png`,
  width,
  height,
  bytes: 1000,
  url: `asset://${slot}.png`,
})
const BODY = entry('body', 900, 700)
const ARM = entry('mouse_base', ARM_SIZE.width, ARM_SIZE.height)
const PEN = entry('pen_up', PEN_SIZE.width, PEN_SIZE.height)
/** 기본 그림 배치: 바탕 + 팔 + 펜 손 */
const DEF: AssetManifest = { canvas: CANVAS, entries: [BODY, ARM, PEN] }
const NO_PEN: AssetManifest = { canvas: CANVAS, entries: [BODY, ARM] }
const NO_ARM: AssetManifest = { canvas: CANVAS, entries: [BODY, PEN] }
const BODY_ONLY: AssetManifest = { canvas: CANVAS, entries: [BODY] }
const BIG_ARM: AssetManifest = { canvas: CANVAS, entries: [BODY, entry('mouse_base', 200, 150), PEN] }
const EMPTY: AssetManifest = { canvas: null, entries: [] }

const AREA: MouseSettings['area'] = [
  { x: 375, y: 525 },
  { x: 495, y: 525 },
  { x: 495, y: 625 },
  { x: 375, y: 625 },
]
const MOUSE: MouseSettings = {
  shoulder: { x: 558, y: 500 },
  area: AREA,
  hand: null,
  partPos: ARM_POS,
  penPos: PEN_POS,
  penMode: true,
}
const SETTINGS: Settings = {
  scale: 1.5,
  idleSeconds: 120,
  overlay: { x: 30, y: 40, visible: true },
  mouse: MOUSE,
  autostart: false,
  language: 'ko',
  positionLock: false,
  showInTaskbar: false,
  timer: DEFAULT_TIMER_SETTINGS, // contract v0.21(CR-045) 필수 필드
}
const withArm = (partPos: Point): Settings => ({ ...SETTINGS, mouse: { ...MOUSE, partPos } })
const withPen = (penPos: Point): Settings => ({ ...SETTINGS, mouse: { ...MOUSE, penPos } })
const IO_ERR: BridgeError = { code: 'settings.io', message: '설정 파일을 저장하지 못했습니다.' }
/** CR-057(🔒 ko 확정 문구): 이동 영역 시작 버튼·2/4 안내 교체 — 옛 「이동 영역 설정하기」·「2/4 이동 영역의 …」 */
const AREA_START = '사각형 이동 영역 설정'
const IDLE_BUTTONS = ['어깨축 설정하기', AREA_START, '기본값으로 리셋']
const G_IDLE = '어깨축을 설정하면 팔 파츠가 그 점을 축으로 회전합니다.'
const G_REVIEW = '축 위치를 확인하고 저장하세요.'
const G_AREA_2 = '2/4 이제 오른쪽 위 꼭짓점을 클릭해주세요.'

/** width×height 마스크 — pixels 의 [x, y, 알파]만 값, 나머지 0(투명) */
const maskOf = (width: number, height: number, pixels: [number, number, number][] = []): AlphaMask => {
  const alpha = new Uint8Array(width * height)
  for (const [x, y, a] of pixels) alpha[y * width + x] = a
  return { width, height, alpha }
}
/** 겹친 점 P 자리의 알파 — 팔 (61,108) · 펜 손 (94,96). null 이면 그 그림 마스크 없음(훅이 null) */
const setMasks = (armAlpha: number | null, penAlpha: number | null) => {
  masks.clear()
  if (armAlpha !== null) masks.set(ARM.url, maskOf(ARM_SIZE.width, ARM_SIZE.height, [[61, 108, armAlpha]]))
  if (penAlpha !== null) masks.set(PEN.url, maskOf(PEN_SIZE.width, PEN_SIZE.height, [[94, 96, penAlpha]]))
}

// ─── 도우미 ────────────────────────────────────────────────────────────────
const setup = (p: { settings?: Settings; manifest?: AssetManifest } = {}) => {
  const onError = vi.fn<(e: BridgeError | null) => void>()
  const utils = render(
    <MousePartsTab settings={p.settings ?? SETTINGS} manifest={p.manifest ?? DEF} onError={onError} />,
  )
  const rerenderWith = (settings: Settings, manifest: AssetManifest = DEF) =>
    utils.rerender(<MousePartsTab settings={settings} manifest={manifest} onError={onError} />)
  return { ...utils, onError, rerenderWith }
}
const preview = () => screen.getByTestId('mouse-preview')
const box = (tone: 'arm' | 'pen') => preview().querySelector<HTMLElement>(`[data-testid="outline-${tone}"]`)
const armImg = () => preview().querySelector<HTMLImageElement>('img[src="asset://mouse_base.png"]')
const penImg = () => preview().querySelector<HTMLImageElement>('img[src="asset://pen_up.png"]')
const dd = (term: string) => screen.getByText(term, { selector: 'dt' }).nextElementSibling
const guide = () => screen.getByRole('status')
const btn = (name: string) => screen.getByRole('button', { name })
const buttonNames = () => screen.getAllByRole('button').map(b => b.textContent)
const follows = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
const half = (v: number) => `${v * 0.5}px`

/** 상자 인라인 style = 캔버스 값 × scale(0.5) */
const expectBox = (tone: 'arm' | 'pen', p: Point, size: { width: number; height: number }) => {
  expect(box(tone)).not.toBeNull()
  expect(box(tone)).toHaveStyle({ left: half(p.x), top: half(p.y), width: half(size.width), height: half(size.height) })
}
/** 팔 그림·파란 상자·「파츠 위치」가 모두 p */
const expectArmAt = (p: Point) => {
  expect(armImg()).toHaveStyle({ left: half(p.x), top: half(p.y) })
  expectBox('arm', p, ARM_SIZE)
  expect(dd('파츠 위치')?.textContent).toBe(`(${p.x}, ${p.y})`)
}
/** 펜 손 그림·빨간 상자·「손 위치」가 모두 p */
const expectPenAt = (p: Point) => {
  expect(penImg()).toHaveStyle({ left: half(p.x), top: half(p.y) })
  expectBox('pen', p, PEN_SIZE)
  expect(dd('손 위치')?.textContent).toBe(`(${p.x}, ${p.y})`)
}

const PID = 7
const down = (clientX: number, clientY: number) =>
  fireEvent.pointerDown(preview(), { clientX, clientY, button: 0, pointerId: PID })
const move = (clientX: number, clientY: number) =>
  fireEvent.pointerMove(preview(), { clientX, clientY, pointerId: PID })
const up = (clientX: number, clientY: number) =>
  fireEvent.pointerUp(preview(), { clientX, clientY, button: 0, pointerId: PID })
const cancel = () => fireEvent.pointerCancel(preview(), { pointerId: PID })

/** CSS 원문(주석 제거·공백 1칸 정규화) */
const readCss = (rel: string) =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
/** `selector {` 로 시작하는 블록 본문(중첩 없음 가정). 없으면 '' */
const block = (css: string, selector: string) => {
  const at = css.indexOf(`${selector} {`)
  if (at < 0) return ''
  const start = css.indexOf('{', at)
  return css.slice(start + 1, css.indexOf('}', start))
}

beforeEach(() => {
  vi.resetAllMocks()
  installPointerCapture()
  masks.clear()
  maskHook.mockImplementation((url?: string) => (url ? (masks.get(url) ?? null) : null))
})

// ─── PartOutline 단독 (R-38) ─────────────────────────────────────────────────
describe('PartOutline (R-38, drag-hit §5.4)', () => {
  it('TC-216: 캔버스 좌표·크기 × scale 인라인 style, aria-hidden 장식 span, tone 별 data-testid·클래스, React.memo', () => {
    const { rerender } = render(<PartOutline pos={ARM_POS} size={ARM_SIZE} scale={0.5} tone="arm" />)
    const a = screen.getByTestId('outline-arm')
    expect(a.tagName).toBe('SPAN')
    expect(a).toHaveAttribute('aria-hidden', 'true')
    expect(a).not.toHaveAttribute('role')
    expect(a).not.toHaveAttribute('tabindex')
    expect(a.textContent).toBe('')
    expect(a).toHaveStyle({ left: '194.5px', top: '246px', width: '85.5px', height: '99.5px' })
    const armClass = a.className

    rerender(<PartOutline pos={PEN_POS} size={PEN_SIZE} scale={2} tone="pen" />)
    expect(screen.queryByTestId('outline-arm')).toBeNull()
    const p = screen.getByTestId('outline-pen')
    expect(p).toHaveAttribute('aria-hidden', 'true')
    expect(p).toHaveStyle({ left: '712px', top: '1008px', width: '272px', height: '392px' })

    // className = `${styles.outline} ${styles.arm | styles.pen}` — 첫 토큰(공통 .outline) 같음, 둘째 토큰은 색 구분
    const [armBase, armTone] = armClass.split(/\s+/)
    const [penBase, penTone] = p.className.split(/\s+/)
    expect(penBase).toBe(armBase)
    expect(armTone).toMatch(/arm/)
    expect(penTone).toMatch(/pen/)
    expect(armTone).not.toBe(penTone)

    expect((PartOutline as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'))
  })

  it('TC-216: pos null · size 없음 · 폭 0 · 높이 음수면 아무것도 그리지 않는다(그림이 없으면 상자 없음)', () => {
    const cases: { pos: Point | null; size: { width: number; height: number } | undefined }[] = [
      { pos: null, size: ARM_SIZE },
      { pos: ARM_POS, size: undefined },
      { pos: ARM_POS, size: { width: 0, height: 199 } },
      { pos: ARM_POS, size: { width: 171, height: -1 } },
    ]
    for (const c of cases) {
      const { container, unmount } = render(<PartOutline pos={c.pos} size={c.size} scale={0.5} tone="arm" />)
      expect(container.innerHTML).toBe('')
      unmount()
    }
  })
})

describe('상자 CSS·색 토큰 (R-38, drag-hit §5.4 3·색 결정 표, design §11 D-4)', () => {
  it('TC-217: PartOutline.module.css — .outline 절대 위치·border-box·1px 점선·pointer-events none, .arm/.pen 선 색 = 토큰', () => {
    const css = readCss('../components/PartOutline.module.css')
    const outline = block(css, '.outline')
    expect(outline).toMatch(/position: absolute/)
    expect(outline).toMatch(/box-sizing: border-box/)
    expect(outline).toMatch(/border-width: 1px/)
    expect(outline).toMatch(/border-style: dashed/)
    expect(outline).toMatch(/pointer-events: none/)
    expect(block(css, '.arm')).toMatch(/border-color: var\(--st-outline-arm\)/)
    expect(block(css, '.pen')).toMatch(/border-color: var\(--st-outline-pen\)/)
  })

  it('TC-217: 설정 창 토큰 블록(--st-accent 가 있는 블록)에 --st-outline-arm #1d4ed8 · --st-outline-pen #e11d48', () => {
    const tokens = block(readCss('../settings.module.css'), ":global(body[data-window='settings'])")
    expect(tokens).toMatch(/--st-accent:/)
    expect(tokens).toMatch(/--st-outline-arm: #1d4ed8;/i)
    expect(tokens).toMatch(/--st-outline-pen: #e11d48;/i)
    // 기존 의미 색과 다른 값(위험 #dc2626 · 강조 #BE72AD)
    expect(tokens).toMatch(/--st-danger: #dc2626;/i)
    expect(tokens).toMatch(/--st-accent: #BE72AD;/i)
  })
})

// ─── 화면: 픽셀 판정 끌기 (R-37) · 상자 (R-38) ───────────────────────────────
describe('어깨축·손 위치 미리보기 — 픽셀 판정·영역 상자 (R-37·R-38, CR-040)', () => {
  it('TC-218: 겹친 점에서 펜 손이 투명하고 팔이 칠해져 있으면 팔을 끈다 — 파란 상자만 따라오고, 놓으면 partPos 만 저장', async () => {
    setMasks(255, 0)
    vi.mocked(setSettings).mockImplementation(async s => s)
    const { onError, rerenderWith } = setup()
    expectArmAt(ARM_POS)
    expectPenAt(PEN_POS)

    down(225, 300) // 캔버스 (450,600) → 팔, grab (61,108)
    expect(capture.set).toHaveBeenCalledTimes(1)
    expect(capture.set).toHaveBeenCalledWith(PID)
    move(235, 290) // 캔버스 (470,580) → 팔 (409,472)
    expectArmAt(ARM_MOVED)
    expectPenAt(PEN_POS)
    expect(setSettings).not.toHaveBeenCalled()

    up(235, 290)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(withArm(ARM_MOVED))
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    expectArmAt(ARM_POS) // 수신 전 = props(설계 확인 E-1 구조 그대로 — 상자도 그림과 같이)

    rerenderWith(withArm(ARM_MOVED)) // settings://changed 흉내
    expectArmAt(ARM_MOVED)
    expectPenAt(PEN_POS)
    expect(setSettings).toHaveBeenCalledTimes(1)
  })

  it('TC-219: 두 그림 모두 투명한 자리를 누르면 끌기 없음 — 캡처·저장·표시 변화 없음(상자 안이어도 판정은 픽셀)', () => {
    setMasks(0, 0)
    const { onError } = setup()
    down(225, 300)
    move(235, 290)
    expectArmAt(ARM_POS)
    expectPenAt(PEN_POS)
    up(235, 290)
    fireEvent.click(preview(), { clientX: 235, clientY: 290 }) // idle 클릭은 무시
    expectArmAt(ARM_POS)
    expectPenAt(PEN_POS)
    expect(guide()).toHaveTextContent(G_IDLE)
    expect(screen.getByRole('img', { name: '축(어깨) (558, 500)' })).toBeInTheDocument()
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-220: 펜 손 픽셀이 칠해져 있으면(① 둘 다 칠함 ② 펜 손만) 손을 끈다 — 빨간 상자만 따라오고, 놓으면 penPos 만 저장', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    for (const armAlpha of [255, 0]) {
      setMasks(armAlpha, 255)
      vi.mocked(setSettings).mockClear()
      capture.set.mockClear()
      const { onError, unmount } = setup()
      down(225, 300) // → 펜 손, grab (94,96)
      move(235, 290) // → 펜 손 (376,484)
      expectPenAt(PEN_MOVED)
      expectArmAt(ARM_POS)
      up(235, 290)
      expect(capture.set).toHaveBeenCalledTimes(1)
      expect(setSettings).toHaveBeenCalledTimes(1)
      expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(withPen(PEN_MOVED))
      await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
      unmount()
    }
  })

  it('TC-221: 마스크가 없으면(로딩 중·실패 = null) 사각형 판정으로 대체 — 겹친 점은 펜 손, 훅은 팔·펜 손 url 로 호출', () => {
    // masks 비움 → 두 훅 모두 null
    setup()
    expect(maskHook).toHaveBeenCalledWith(ARM.url)
    expect(maskHook).toHaveBeenCalledWith(PEN.url)
    down(225, 300)
    move(235, 290)
    expectPenAt(PEN_MOVED)
    expectArmAt(ARM_POS)
    cancel()
    expectPenAt(PEN_POS)
    expect(capture.set).toHaveBeenCalledTimes(1)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-221: pen_up 이 없어도 훅은 조건 없이 두 번 호출(펜 손 url undefined) — 팔 마스크만으로 판정', () => {
    setMasks(0, null) // 팔 (61,108) 투명
    setup({ manifest: NO_PEN })
    expect(maskHook).toHaveBeenCalledWith(ARM.url)
    expect(maskHook).toHaveBeenCalledWith(undefined)
    expect(box('pen')).toBeNull()
    down(225, 300)
    move(235, 290)
    up(235, 290)
    expect(armImg()).toHaveStyle({ left: half(ARM_POS.x), top: half(ARM_POS.y) })
    expectBox('arm', ARM_POS, ARM_SIZE)
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-222: 두 상자는 미리보기 안 장식 — 펜 손 위·영역 선 아래, 역할 트리 밖, 선택 버튼 없음, 마법사 단계와 무관하게 표시', () => {
    setup()
    const a = box('arm')
    const p = box('pen')
    expectBox('arm', ARM_POS, ARM_SIZE)
    expectBox('pen', PEN_POS, PEN_SIZE)
    for (const b of [a, p]) {
      expect(b).toHaveAttribute('aria-hidden', 'true')
      expect(b).not.toHaveAttribute('role')
      expect(b).not.toHaveAttribute('tabindex')
      expect(b?.textContent).toBe('')
    }
    // 합성 순서(아래→위): 펜 손 img → 팔 상자 → 펜 손 상자 → 영역 선 svg → 축 마커
    const marker = screen.getByRole('img', { name: '축(어깨) (558, 500)' })
    const svg = preview().querySelector('svg')
    expect(follows(penImg() as Node, a as Node)).toBe(true)
    expect(follows(a as Node, p as Node)).toBe(true)
    expect(follows(p as Node, svg as Node)).toBe(true)
    expect(follows(svg as Node, marker)).toBe(true)
    expect(screen.getAllByRole('img')).toHaveLength(1) // 역할 img = 축 마커뿐
    expect(buttonNames()).toEqual(IDLE_BUTTONS) // 별도 「팔/손 옮기기」 버튼 없음(R-37)
    expect(screen.queryByRole('button', { name: /옮기기/ })).toBeNull()

    fireEvent.click(btn('어깨축 설정하기'))
    expectBox('arm', ARM_POS, ARM_SIZE)
    expectBox('pen', PEN_POS, PEN_SIZE)
    fireEvent.click(btn('취소'))
    fireEvent.click(btn(AREA_START))
    expectBox('arm', ARM_POS, ARM_SIZE)
    expectBox('pen', PEN_POS, PEN_SIZE)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-223: 그림이 없으면 그 상자 없음 — 매니페스트가 바뀌면(assets://changed) 상자가 사라지고 생기며 크기도 따라간다', () => {
    const { rerenderWith } = setup({ manifest: NO_PEN })
    expect(box('pen')).toBeNull()
    expectBox('arm', ARM_POS, ARM_SIZE)
    rerenderWith(SETTINGS, NO_ARM)
    expect(box('arm')).toBeNull()
    expectBox('pen', PEN_POS, PEN_SIZE)
    rerenderWith(SETTINGS, BODY_ONLY)
    expect(box('arm')).toBeNull()
    expect(box('pen')).toBeNull()
    rerenderWith(SETTINGS, DEF)
    expectBox('arm', ARM_POS, ARM_SIZE)
    expectBox('pen', PEN_POS, PEN_SIZE)
    rerenderWith(SETTINGS, BIG_ARM) // 팔 교체 200×150
    expectBox('arm', ARM_POS, { width: 200, height: 150 })
    rerenderWith(SETTINGS, EMPTY)
    expect(box('arm')).toBeNull()
    expect(box('pen')).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-224: 놓기 저장 실패 → onError(BridgeError), 팔 그림·파란 상자·값 목록은 저장된 자리로 복귀', async () => {
    setMasks(255, 0)
    vi.mocked(setSettings).mockRejectedValueOnce(IO_ERR)
    const { onError } = setup()
    down(225, 300)
    move(235, 290)
    expectArmAt(ARM_MOVED)
    up(235, 290)
    await waitFor(() => expect(onError).toHaveBeenCalledWith(IO_ERR))
    expectArmAt(ARM_POS)
    expectPenAt(PEN_POS)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(withArm(ARM_MOVED))
  })

  it('TC-225: 어깨축·이동 영역 단계의 클릭은 픽셀 판정과 무관하게 점 지정 — 투명 자리여도 지정되고 끌기는 없다', () => {
    setMasks(0, 0)
    setup()
    fireEvent.click(btn('어깨축 설정하기'))
    down(225, 300)
    move(235, 290)
    up(235, 290)
    expectArmAt(ARM_POS)
    expectPenAt(PEN_POS)
    fireEvent.click(preview(), { clientX: 225, clientY: 300 })
    expect(guide()).toHaveTextContent(G_REVIEW)
    expect(screen.getByRole('img', { name: '축(어깨) (450, 600)' })).toBeInTheDocument()
    fireEvent.click(btn('취소'))
    fireEvent.click(btn(AREA_START))
    fireEvent.click(preview(), { clientX: 225, clientY: 300 })
    expect(guide()).toHaveTextContent(G_AREA_2)
    const dots = Array.from(preview().querySelectorAll('circle')).map(c => `${c.getAttribute('cx')},${c.getAttribute('cy')}`)
    expect(dots).toEqual(['225,300'])
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

// ─── TC-FLOW-20 (S-19) ───────────────────────────────────────────────────────
describe('TC-FLOW (S-19, CR-040)', () => {
  it('TC-FLOW-20: S-19 — 상자로 두 그림 범위를 보고, 두 그림 모두 투명한 자리를 눌러 아무것도 안 움직임을 확인한 뒤, 팔이 칠해진 자리를 눌러 팔을 옮긴다', async () => {
    // 기본 그림 상황: 펜 손은 겹친 자리 전체가 투명 여백, 팔은 (61,108) 만 칠함
    masks.set(ARM.url, maskOf(ARM_SIZE.width, ARM_SIZE.height, [[61, 108, 255]]))
    masks.set(PEN.url, maskOf(PEN_SIZE.width, PEN_SIZE.height))
    vi.mocked(setSettings).mockImplementation(async s => s)
    const { onError, rerenderWith } = setup()

    // Step 1 (TC-222): 파란·빨간 상자로 범위 확인
    expectBox('arm', ARM_POS, ARM_SIZE)
    expectBox('pen', PEN_POS, PEN_SIZE)

    // Step 2 (TC-219): 캔버스 (480,680) — 두 사각형 모두 안, 두 그림 모두 투명
    down(240, 340)
    move(250, 330)
    up(250, 330)
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expectArmAt(ARM_POS)
    expectPenAt(PEN_POS)

    // Step 3 (TC-218): 팔이 칠해진 자리 (450,600) → 팔 끌기·저장·수신
    down(225, 300)
    move(235, 290)
    expectArmAt(ARM_MOVED)
    expectPenAt(PEN_POS)
    up(235, 290)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(withArm(ARM_MOVED))
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    rerenderWith(withArm(ARM_MOVED))
    expectArmAt(ARM_MOVED)
    expectPenAt(PEN_POS)
  })
})
