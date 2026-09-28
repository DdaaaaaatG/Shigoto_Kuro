/**
 * settings 「어깨축·손 위치」 탭(옛 「마우스 파츠」, R-26 재사용) 컴포넌트 스펙.
 * CR-028: 문구 출처가 labels.ts → useMessages()(Provider 없으면 ko)로 바뀐다. 이 파일의 ko 문구 리터럴은 그대로 유효하고,
 *          바뀌는 단언은 TC-030 의 section 이름(「어깨축·손 위치」)뿐이다. 픽스처 SETTINGS 에 v0.14 필수 필드를 넣었다.
 * 기준: src/settings/design.md §4·§5.2·§6(P-2·P-3·P-5·confirm 표)·§8·§9·§10 · scenarios.md
 *       TC-010 ~ TC-030(TC-012 는 CR-016 으로 폐기 — 사례 삭제), TC-044, TC-047 ~ TC-058,
 *       TC-063 ~ TC-074(CR-018), TC-080 ~ TC-091 · TC-FLOW-07(CR-026 펜 쥔 손 위치 끌기).
 * bridge 는 mock(vi.mock('bridge/commands')) — 실제 Tauri API 를 부르지 않는다. toBridgeError 만 실물.
 *
 * jsdom 포인터·좌표 규약(scenarios.md 「포인터·좌표 규약」과 같다):
 *   - window.PointerEvent 가 없으면 MouseEvent 를 확장한 stub 을 등록한다. 없으면 testing-library 가 일반 Event 로
 *     만들어 clientX/Y·button·pointerId 가 빠진다. 있으면 그대로 쓴다.
 *   - setPointerCapture·releasePointerCapture·hasPointerCapture 는 jsdom 에 없으므로 매 테스트 Element.prototype 에
 *     상태 있는 vi.fn(잡은 pointerId 집합)으로 설치하고 호출 인자를 단언한다.
 *   - getBoundingClientRect 는 jsdom 기본값 0 → clientX/Y = 미리보기 오프셋. rect 반영은 TC-018·TC-050 에서 spy.
 *   - 포인터 이벤트는 모두 미리보기 div(data-testid="mouse-preview")로 보낸다(손 그림 <img> 는 pointer-events:none).
 *   - jsdom 은 pointerup 뒤 click 을 자동으로 보내지 않는다 — 규칙 ③ 은 TC-049 가 click 을 직접 보낸다.
 * 선행 조건(소스 미적용분·bridge CR-016)은 scenarios.md 각 TC 의 「선행」 줄 참고.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type {
  AssetEntry,
  AssetManifest,
  BridgeError,
  MouseSettings,
  Point,
  Settings,
} from 'bridge/types'
import { DEFAULT_TIMER_SETTINGS } from 'bridge/types'
import { setAutostart, setSettings } from 'bridge/commands'
import MousePartsTab from '../components/MousePartsTab'
import { MessagesProvider } from '../i18n/MessagesContext' // CR-057 TC-305(ja·en 렌더)
import { ko } from '../i18n/ko'
import { ja } from '../i18n/ja'
import { en } from '../i18n/en'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))
vi.mock('bridge/commands', async importOriginal => {
  const actual = await importOriginal<typeof import('bridge/commands')>()
  return {
    ...actual, // toBridgeError 는 실물(정규화 규칙 그대로)
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
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: PointerEventStub,
  })
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
const PART_POS: Point = { x: 100, y: 200 }

/** CR-018: 저장된 이동 영역(왼쪽 위 · 오른쪽 위 · 오른쪽 아래 · 왼쪽 아래) — 옛 pad 자리와 같은 사각형 */
const AREA: MouseSettings['area'] = [
  { x: 200, y: 500 },
  { x: 300, y: 500 },
  { x: 300, y: 560 },
  { x: 200, y: 560 },
]
/** R-17 · CR-018: core settings.md 기본 이동 영역(손 기준점 435,575 중심) = bridge DEFAULT_MOUSE_SETTINGS.area 기대값 */
const DEFAULT_AREA: MouseSettings['area'] = [
  { x: 375, y: 525 },
  { x: 495, y: 525 },
  { x: 495, y: 625 },
  { x: 375, y: 625 },
]

const MOUSE: MouseSettings = {
  shoulder: { x: 600, y: 480 },
  area: AREA,
  hand: { x: 400, y: 560 }, // non-null 이어도 손 위치 마커는 없어야 한다(CR-005)
  partPos: PART_POS,
  penPos: null, // CR-026: 펜 손 위치 미지정 = 기본 위치 규칙(resolvePenPos)
  penMode: false, // CR-033(contract v0.15 §3.3): 펜 손 사용 기본 꺼짐 — 이 탭은 값을 바꾸지 않고 펼쳐 보존
}

const SETTINGS: Settings = {
  scale: 1.5,
  idleSeconds: 120,
  overlay: { x: 30, y: 40, visible: true },
  mouse: MOUSE,
  autostart: false,
  // CR-028(contract v0.14): 필수 필드. 저장 인자는 `{ ...SETTINGS, mouse }` 라 단언 변경 없음
  language: 'ko',
  positionLock: false,
  showInTaskbar: false,
  timer: DEFAULT_TIMER_SETTINGS, // contract v0.21(CR-045) 필수 필드
}

/** R-17 · contract §3.3 + CR-016 + CR-018 + CR-026: 키 5개(area·penPos 있음 · pad·팔 굵기·색 없음) */
/** CR-035(contract v0.16 DA-07 · U-2 = B): DEFAULT_MOUSE_SETTINGS.penPos = 기본 세트 pen_up 자리 */
/** CR-044 🔒(확정사항 §6 2차 교체·contract v0.20): (372,476) — CR-038 (356,504) · CR-035~CR-037 (380,496) 대체 */
const DEFAULT_PEN_POS: Point = { x: 372, y: 476 }
/** CR-044 🔒: 기본 파츠 위치 (411,464) — CR-038 까지 (389,492) */
const DEFAULT_PART_POS: Point = { x: 411, y: 464 }
/**
 * bridge DEFAULT_MOUSE_SETTINGS 기대값(CR-044: shoulder (582,484)·partPos (411,464)·penPos (372,476)·penMode true 불변).
 * mouse null 저장의 바탕
 */
const DEFAULT_MOUSE_EXPECTED: MouseSettings = {
  shoulder: { x: 582, y: 484 }, // CR-044: CR-038 (558,500) · 옛 (620,530)
  area: DEFAULT_AREA,
  hand: null,
  partPos: DEFAULT_PART_POS,
  penPos: DEFAULT_PEN_POS, // CR-035: 리셋 → 기본 penPos. 옛 R-18 「리셋 → null(기본 위치 규칙)」 대체
  penMode: true, // CR-038: 옛 false (CR-044 불변)
}
/**
 * CR-033 결정 ①: 리셋은 penMode 를 현재 값으로 유지 — MOUSE(penMode false)에서 리셋한 기대값.
 * (CR-038 전에는 기본 penMode 도 false 라 DEFAULT_MOUSE_EXPECTED 와 같았다)
 */
const RESET_EXPECTED: MouseSettings = { ...DEFAULT_MOUSE_EXPECTED, penMode: false }

const PICKED = { x: 300, y: 200 }
const SAVED: Settings = { ...SETTINGS, mouse: { ...MOUSE, shoulder: PICKED } }
const withPart = (partPos: Point): Settings => ({ ...SETTINGS, mouse: { ...MOUSE, partPos } })

const entry = (slot: string, width: number, height: number): AssetEntry => ({
  slot: slot as AssetEntry['slot'],
  fileName: `${slot}.png`,
  width,
  height,
  bytes: 1000,
  url: `asset://${slot}.png`,
})

const BODY = entry('body', 900, 700)
const KB_UP = entry('kb_up', 900, 700)
const PART = entry('mouse_base', 200, 150)
/** 기본: 몸통 + 작은 손 그림 200×150 */
const HAND: AssetManifest = { canvas: CANVAS, entries: [BODY, PART] }
const FULL: AssetManifest = { canvas: CANVAS, entries: [BODY, entry('mouse_base', 900, 700)] }
const NO_HAND: AssetManifest = { canvas: CANVAS, entries: [BODY] }
const KB_HAND: AssetManifest = { canvas: CANVAS, entries: [KB_UP, PART] }
const KB_ONLY: AssetManifest = { canvas: CANVAS, entries: [KB_UP] }
const ALL: AssetManifest = {
  canvas: CANVAS,
  entries: [entry('background', 900, 700), BODY, KB_UP, PART],
}
const HAND_NOBASE: AssetManifest = { canvas: null, entries: [PART] }
const EMPTY: AssetManifest = { canvas: null, entries: [] }

const G_IDLE = '어깨축을 설정하면 팔 파츠가 그 점을 축으로 회전합니다.'
/** CR-057(🔒 ko 확정 문구): 이동 영역 시작 버튼 — 옛 「사각형 이동 영역 설정」 */
const AREA_START = '사각형 이동 영역 설정'
/** CR-057(🔒 ko 확정 문구): idle 전용 이동 영역 설명 줄(role 없음, 안내 줄 바로 아래 형제) */
const AREA_DESC_KO =
  '마우스를 움직이면 손이 이 사각형 안에서 따라 움직입니다. 그림 위에서 네 꼭짓점을 차례로 클릭해 사각형을 만드세요.'
const G_PICK ='축이 될 부분을 마우스로 클릭해주세요.'
const G_REVIEW = '축 위치를 확인하고 저장하세요.'
const NO_BASE = '캐릭터 이미지(kb_up)가 등록되지 않았습니다.'
const IO_ERR: BridgeError = { code: 'IO_ERROR', message: '설정 파일을 저장하지 못했습니다.' }

// ─── 도우미 ────────────────────────────────────────────────────────────────
const setup = (p: { settings?: Settings; manifest?: AssetManifest } = {}) => {
  const onError = vi.fn<(e: BridgeError | null) => void>()
  const utils = render(
    <MousePartsTab
      settings={p.settings ?? SETTINGS}
      manifest={p.manifest ?? HAND}
      onError={onError}
    />,
  )
  return { ...utils, onError }
}

const preview = () => screen.getByTestId('mouse-preview')
const srcs = () => Array.from(preview().querySelectorAll('img')).map(i => i.getAttribute('src'))
const handImg = () => preview().querySelector<HTMLImageElement>('img[src="asset://mouse_base.png"]')
const guide = () => screen.getByRole('status')
const btn = (name: string) => screen.getByRole('button', { name })
const buttonNames = () => screen.getAllByRole('button').map(b => b.textContent)
const marker = (x: number, y: number) => screen.getByRole('img', { name: `축(어깨) (${x}, ${y})` })
const shoulderDd = () => screen.getByText('축(어깨)', { selector: 'dt' }).nextElementSibling
const partDd = () => screen.getByText('파츠 위치', { selector: 'dt' }).nextElementSibling
/** 손 그림 위치(미리보기 px = 캔버스 × scale)와 값 목록 「파츠 위치」가 둘 다 p 인지 */
const expectHandAt = (p: Point, scale = 0.5) => {
  expect(handImg()).toHaveStyle({ left: `${p.x * scale}px`, top: `${p.y * scale}px` })
  expect(partDd()?.textContent).toBe(`(${p.x}, ${p.y})`)
}
/**
 * 패드 박스 없음: 미리보기 안 span 은 전부 축 마커(role=img)뿐.
 * CR-040(R-38): 팔·펜 손 영역 상자(PartOutline — aria-hidden span, data-testid outline-arm/pen)는 패드 박스가 아니므로 뺀다
 * (scenarios.md v15 개정 — TC-011·TC-030 기대 불변. 상자 자체는 test/DragHit.test.tsx TC-216 ~ TC-224).
 */
const OUTLINE_BOX = '[data-testid^="outline-"]'
const expectNoPadBox = () => {
  expect(preview().querySelector(`span[aria-hidden="true"]:not(${OUTLINE_BOX})`)).toBeNull()
  for (const s of Array.from(preview().querySelectorAll(`span:not(${OUTLINE_BOX})`))) {
    expect(s).toHaveAttribute('role', 'img')
  }
}
const startAndPick = (clientX = 150, clientY = 100) => {
  fireEvent.click(btn('어깨축 설정하기'))
  fireEvent.click(preview(), { clientX, clientY }) // jsdom rect = 0 → 오프셋 (150,100) → 캔버스 (300,200)
}
const rectAt = (left: number, top: number): DOMRect =>
  ({
    left,
    top,
    right: left + 450,
    bottom: top + 350,
    width: 450,
    height: 350,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect

const PID = 7
const down = (clientX: number, clientY: number, button = 0) =>
  fireEvent.pointerDown(preview(), { clientX, clientY, button, pointerId: PID })
const move = (clientX: number, clientY: number) =>
  fireEvent.pointerMove(preview(), { clientX, clientY, pointerId: PID })
const up = (clientX: number, clientY: number) =>
  fireEvent.pointerUp(preview(), { clientX, clientY, button: 0, pointerId: PID })
const cancel = () => fireEvent.pointerCancel(preview(), { pointerId: PID })

const deferred = <T,>() => {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.resetAllMocks()
  installPointerCapture()
})

// ─── 미리보기 (R-12) ───────────────────────────────────────────────────────
describe('미리보기 (R-12)', () => {
  it('TC-010: 450×350 에 손 그림 → 바탕(body) → 축 마커 순으로 합성, body 가 있으면 kb_up·배경은 넣지 않는다', () => {
    setup({ manifest: ALL })
    expect(preview()).toHaveStyle({ width: '450px', height: '350px' })
    expect(srcs()).toEqual(['asset://mouse_base.png', 'asset://body.png'])
    const imgs = preview().querySelectorAll('img')
    const m = marker(600, 480)
    expect(preview().contains(m)).toBe(true)
    expect(imgs[1].compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-011: 패드 박스는 어떤 이미지 구성에서도 그리지 않는다(idle·review), 손 위치 마커도 없다', () => {
    for (const manifest of [HAND, FULL, NO_HAND, KB_HAND, EMPTY]) {
      const { unmount } = setup({ manifest })
      expectNoPadBox()
      expect(screen.getAllByRole('img')).toHaveLength(1)
      expect(screen.queryByRole('img', { name: /손 위치/ })).toBeNull()
      startAndPick()
      expectNoPadBox()
      expect(screen.getAllByRole('img')).toHaveLength(1)
      unmount()
    }
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-013: idle 에서는 저장된 축·파츠 위치·이동 영역을 값 목록 세 행으로 표시하고 「손 위치」 행은 없다', () => {
    const { container } = setup()
    expect(marker(600, 480)).toHaveStyle({ left: '300px', top: '240px' })
    expect(Array.from(container.querySelectorAll('dl dt')).map(e => e.textContent)).toEqual([
      '축(어깨)',
      '파츠 위치',
      '이동 영역',
    ])
    expect(Array.from(container.querySelectorAll('dl dd')).map(e => e.textContent)).toEqual([
      '(600, 480)',
      '(100, 200)',
      DD_SAVED,
    ])
    expect(screen.queryByText(/손 위치/)).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-014 (CR-038·CR-044 개정): settings.mouse 가 null 이면 기본 축(582, 484)·기본 파츠 위치(411, 464)를 표시한다', () => {
    setup({ settings: { ...SETTINGS, mouse: null } })
    // CR-044: (582,484) × 0.5 = 291px/242px (CR-038 (558,500) · 279px/250px, 옛 (620,530) · 310px/265px)
    expect(marker(582, 484)).toHaveStyle({ left: '291px', top: '242px' })
    expect(shoulderDd()?.textContent).toBe('(582, 484)')
    expectHandAt({ x: 411, y: 464 }) // CR-044: left 205.5px · top 232px (CR-038 (389,492) · 194.5px/246px)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-015: body·kb_up 이 둘 다 없으면 미리보기 안에 새 previewNoBody 문구, canvas null 이면 900×700 기준', () => {
    const { unmount } = setup({ manifest: EMPTY })
    expect(within(preview()).getByText(NO_BASE)).toBeInTheDocument()
    expect(preview()).not.toHaveTextContent('몸통 이미지가 등록되지 않았습니다.')
    expect(preview()).not.toHaveTextContent('이미지 탭에서')
    expect(preview().querySelectorAll('img')).toHaveLength(0)
    expect(preview()).toHaveStyle({ width: '450px', height: '350px' })
    expect(marker(600, 480)).toBeInTheDocument()
    unmount()
    setup({ manifest: HAND_NOBASE }) // 손 그림만 있고 바탕 없음
    expect(within(preview()).getByText(NO_BASE)).toBeInTheDocument()
    expect(srcs()).toEqual(['asset://mouse_base.png'])
    expectHandAt(PART_POS)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-047: 몸통이 없으면 kb_up 을 바탕으로 쓰고 빈 상태 문구는 없다', () => {
    const { unmount } = setup({ manifest: KB_HAND })
    expect(srcs()).toEqual(['asset://mouse_base.png', 'asset://kb_up.png'])
    expect(within(preview()).queryByText(NO_BASE)).toBeNull()
    const m = marker(600, 480)
    const imgs = preview().querySelectorAll('img')
    expect(imgs[1].compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    unmount()
    setup({ manifest: KB_ONLY })
    expect(srcs()).toEqual(['asset://kb_up.png'])
    expect(within(preview()).queryByText(NO_BASE)).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-048: 손 그림은 partPos 에 그림 자연 크기 × scale, 회전 없음, 바탕보다 먼저(아래)', () => {
    setup()
    const hand = handImg()
    expect(hand).not.toBeNull()
    expect(hand).toHaveStyle({ left: '50px', top: '100px', width: '100px', height: '75px' })
    expect(['', 'none', 'rotate(0deg)']).toContain(hand?.style.transform ?? '')
    expect(hand).toHaveAttribute('alt', '')
    expect(hand).toHaveAttribute('draggable', 'false')
    expect(srcs()[0]).toBe('asset://mouse_base.png')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-048: 캔버스 450×350(scale 1)이면 자연 크기 그대로, 캔버스 전체 크기 그림은 미리보기 전체', () => {
    const small: AssetManifest = {
      canvas: { width: 450, height: 350 },
      entries: [entry('body', 450, 350), PART],
    }
    const { unmount } = setup({ manifest: small })
    expect(handImg()).toHaveStyle({ left: '100px', top: '200px', width: '200px', height: '150px' })
    unmount()
    setup({ settings: withPart({ x: 0, y: 0 }), manifest: FULL })
    expect(handImg()).toHaveStyle({ left: '0px', top: '0px', width: '450px', height: '350px' })
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-048: mouse_base 가 없으면 손 그림을 그리지 않고 바탕만, 값 목록은 저장된 파츠 위치', () => {
    setup({ manifest: NO_HAND })
    expect(handImg()).toBeNull()
    expect(srcs()).toEqual(['asset://body.png'])
    expect(partDd()?.textContent).toBe('(100, 200)')
    expect(setSettings).not.toHaveBeenCalled()
  })

  // TC-044: manifest.canvas 가 900×700 이 아니면 결과가 기본값(900×700 → scale 0.5)과 달라져야 한다
  const M200: MouseSettings = { ...MOUSE, shoulder: { x: 200, y: 100 } }
  const S200: Settings = { ...SETTINGS, mouse: M200 }
  const canvasOf = (width: number, height: number): AssetManifest => ({
    canvas: { width, height },
    entries: [entry('body', width, height), entry('mouse_base', width, height)],
  })

  it('TC-044: 캔버스 450×350 → scale 1: 미리보기 450×350, 마커·클릭 좌표가 1:1', () => {
    setup({ settings: S200, manifest: canvasOf(450, 350) })
    expect(preview()).toHaveStyle({ width: '450px', height: '350px' })
    expect(marker(200, 100)).toHaveStyle({ left: '200px', top: '100px' })
    startAndPick(150, 100) // 기본 캔버스였다면 (300, 200)
    expect(marker(150, 100)).toHaveStyle({ left: '150px', top: '100px' })
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-044: 캔버스 900×350 → scale 0.5: 미리보기 450×175, 클릭 고정은 캔버스 높이 350, 저장 인자에 반영', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    setup({ settings: S200, manifest: canvasOf(900, 350) })
    expect(preview()).toHaveStyle({ width: '450px', height: '175px' })
    expect(marker(200, 100)).toHaveStyle({ left: '100px', top: '50px' })
    startAndPick(150, 200) // → (300, 400) → y 는 350 으로 고정(기본 캔버스였다면 400)
    expect(marker(300, 350)).toHaveStyle({ left: '150px', top: '175px' })
    fireEvent.click(btn('저장'))
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(setSettings).toHaveBeenCalledWith({ ...S200, mouse: { ...M200, shoulder: { x: 300, y: 350 } } })
    await waitFor(() => expect(guide().textContent).toBe(G_IDLE))
  })
})

// ─── 마법사 (R-10) ─────────────────────────────────────────────────────────
describe('어깨축 마법사 (R-10, CR-005)', () => {
  it('TC-016: idle 안내와 버튼 [어깨축 설정하기][기본값으로 리셋]', () => {
    setup()
    expect(guide().textContent).toBe(G_IDLE)
    expect(buttonNames()).toEqual(IDLE_BUTTONS)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-017: 「어깨축 설정하기」 → pickShoulder 안내·[취소]만·선택 중 표시·임시 마커 없음', () => {
    setup()
    const idleClass = preview().className
    fireEvent.click(btn('어깨축 설정하기'))
    expect(guide().textContent).toBe(G_PICK)
    expect(buttonNames()).toEqual(['취소'])
    expect(preview().className).not.toBe(idleClass)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(shoulderDd()?.textContent).toBe('(600, 480)')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-018: 미리보기 클릭 → 박스 기준 오프셋을 캔버스 좌표로 바꿔 review, [저장][취소]', () => {
    setup()
    const idleClass = preview().className
    fireEvent.click(btn('어깨축 설정하기'))
    const pickingClass = preview().className
    vi.spyOn(preview(), 'getBoundingClientRect').mockReturnValue(rectAt(10, 20))
    fireEvent.click(preview(), { clientX: 160, clientY: 120 })
    expect(guide().textContent).toBe(G_REVIEW)
    expect(preview().className).not.toBe(idleClass) // review 도 선택 중 클래스(step !== 'idle')
    expect(preview().className).toBe(pickingClass)
    expect(marker(300, 200)).toHaveStyle({ left: '150px', top: '100px' })
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(buttonNames()).toEqual(['저장', '취소'])
    expect(shoulderDd()?.textContent).toBe('(600, 480)')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-019: idle·review 에서 미리보기 클릭은 무시된다', () => {
    setup()
    const idleClass = preview().className
    fireEvent.click(preview(), { clientX: 150, clientY: 100 })
    expect(guide().textContent).toBe(G_IDLE)
    expect(buttonNames()).toEqual(IDLE_BUTTONS)
    expect(marker(600, 480)).toBeInTheDocument()
    expect(preview().className).toBe(idleClass)
    startAndPick(150, 100)
    fireEvent.click(preview(), { clientX: 50, clientY: 50 })
    expect(marker(300, 200)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '축(어깨) (100, 100)' })).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-020: 「저장」 → setSettings({...settings, mouse:{...mouse, shoulder}}) 성공 → 오류 지움·idle', async () => {
    vi.mocked(setSettings).mockResolvedValue(SAVED)
    const { onError, rerender } = setup()
    startAndPick()
    fireEvent.click(btn('저장'))
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(setSettings).toHaveBeenCalledWith(SAVED)
    await waitFor(() => expect(guide().textContent).toBe(G_IDLE))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(null)
    expect(buttonNames()).toEqual(IDLE_BUTTONS)
    expect(marker(600, 480)).toBeInTheDocument() // settings://changed 전에는 props 값(§4 shownShoulder)
    rerender(<MousePartsTab settings={SAVED} manifest={HAND} onError={onError} />)
    expect(marker(300, 200)).toBeInTheDocument()
    expect(shoulderDd()?.textContent).toBe('(300, 200)')
  })

  it('TC-021: 저장 실패 → onError(BridgeError), review 유지, 다시 저장 가능', async () => {
    vi.mocked(setSettings).mockRejectedValueOnce(IO_ERR).mockResolvedValueOnce(SAVED)
    const { onError } = setup()
    startAndPick()
    fireEvent.click(btn('저장'))
    await waitFor(() => expect(onError).toHaveBeenCalledWith(IO_ERR))
    expect(guide().textContent).toBe(G_REVIEW)
    expect(marker(300, 200)).toBeInTheDocument()
    await waitFor(() => expect(btn('저장')).toBeEnabled())
    fireEvent.click(btn('저장'))
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual(SAVED)
    await waitFor(() => expect(guide().textContent).toBe(G_IDLE))
    expect(onError).toHaveBeenLastCalledWith(null)
  })

  // code:'unknown' 의 출처: src/bridge/commands.ts toBridgeError 의 Error 정규화 규칙(계약 §3.5 는 코드 값을 정하지 않음)
  it('TC-021: BridgeError 가 아닌 거절(Error)은 {code:"unknown", message} 로 정규화돼 전달된다', async () => {
    vi.mocked(setSettings).mockRejectedValueOnce(new Error('boom'))
    const { onError } = setup()
    startAndPick()
    fireEvent.click(btn('저장'))
    await waitFor(() => expect(onError).toHaveBeenCalledWith({ code: 'unknown', message: 'boom' }))
    expect(guide().textContent).toBe(G_REVIEW)
  })

  it('TC-022: 「취소」(pickShoulder·review) → 임시 점을 버리고 idle, 저장 없음', () => {
    const { onError } = setup()
    const idleClass = preview().className
    fireEvent.click(btn('어깨축 설정하기'))
    fireEvent.click(btn('취소'))
    expect(guide().textContent).toBe(G_IDLE)
    expect(buttonNames()).toEqual(IDLE_BUTTONS)
    expect(preview().className).toBe(idleClass)
    startAndPick()
    fireEvent.click(btn('취소'))
    expect(guide().textContent).toBe(G_IDLE)
    expect(marker(600, 480)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '축(어깨) (300, 200)' })).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-023: 저장 중(saving)에는 review 의 「저장」·「취소」가 비활성, 끝나면 idle 버튼 활성', async () => {
    const d = deferred<Settings>()
    vi.mocked(setSettings).mockReturnValue(d.promise)
    setup()
    startAndPick()
    fireEvent.click(btn('저장'))
    expect(btn('저장')).toBeDisabled()
    expect(btn('취소')).toBeDisabled()
    fireEvent.click(btn('저장'))
    fireEvent.click(btn('취소'))
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(guide().textContent).toBe(G_REVIEW)
    await act(async () => {
      d.resolve(SAVED)
    })
    expect(btn('어깨축 설정하기')).toBeEnabled()
    expect(btn('기본값으로 리셋')).toBeEnabled()
  })
})

// ─── 기본값 리셋 (R-13) ────────────────────────────────────────────────────
describe('기본값으로 리셋 (R-17 — R-13 이관, CR-018)', () => {
  it('TC-024: 리셋 저장 중에는 「어깨축 설정하기」·「사각형 이동 영역 설정」·「기본값으로 리셋」이 비활성', async () => {
    const d = deferred<Settings>()
    vi.mocked(setSettings).mockReturnValue(d.promise)
    setup()
    fireEvent.click(btn('기본값으로 리셋'))
    expect(btn('어깨축 설정하기')).toBeDisabled()
    expect(btn(AREA_START)).toBeDisabled()
    expect(btn('기본값으로 리셋')).toBeDisabled()
    fireEvent.click(btn('어깨축 설정하기'))
    fireEvent.click(btn(AREA_START))
    fireEvent.click(btn('기본값으로 리셋'))
    expect(guide().textContent).toBe(G_IDLE)
    expect(setSettings).toHaveBeenCalledTimes(1)
    await act(async () => {
      d.resolve({ ...SETTINGS, mouse: DEFAULT_MOUSE_EXPECTED })
    })
    expect(btn('어깨축 설정하기')).toBeEnabled()
    expect(btn(AREA_START)).toBeEnabled()
    expect(btn('기본값으로 리셋')).toBeEnabled()
  })

  it('TC-025 (CR-038·CR-044 개정): 확인 창 없이 즉시 기본값(어깨 582,484 · 이동 영역 core 기본값 · hand null · 파츠 위치 411,464 · 펜 손 372,476 · penMode 현재 값 유지, 패드·팔 굵기·색 없음)으로 저장', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(setSettings).mockResolvedValue({ ...SETTINGS, mouse: RESET_EXPECTED })
    const { onError } = setup()
    fireEvent.click(btn('기본값으로 리셋'))
    expect(setSettings).toHaveBeenCalledTimes(1)
    const arg = vi.mocked(setSettings).mock.calls[0][0]
    expect(arg).toStrictEqual({ ...SETTINGS, mouse: RESET_EXPECTED }) // MOUSE.penMode false 유지(기본 true 아님)
    expect(Object.keys(arg.mouse ?? {}).sort()).toEqual(['area', 'hand', 'partPos', 'penMode', 'penPos', 'shoulder'])
    expect(arg.mouse).not.toHaveProperty('pad')
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    expect(guide().textContent).toBe(G_IDLE)
    confirmSpy.mockRestore()
  })

  it('TC-025 (CR-033 결정 ①): 펜 손 사용이 켜져 있으면 리셋해도 penMode true 를 그대로 싣고 위치류만 기본값', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const on: Settings = { ...SETTINGS, mouse: { ...MOUSE, penMode: true, penPos: { x: 500, y: 100 } } }
    const { onError } = setup({ settings: on })
    fireEvent.click(btn('기본값으로 리셋'))
    expect(setSettings).toHaveBeenCalledTimes(1)
    const arg = vi.mocked(setSettings).mock.calls[0][0]
    // images-tab.md §9.6: { ...DEFAULT_MOUSE_SETTINGS, penMode: (settings.mouse ?? DEFAULT_MOUSE_SETTINGS).penMode }
    expect(arg).toStrictEqual({ ...on, mouse: { ...DEFAULT_MOUSE_EXPECTED, penMode: true } })
    expect(arg.mouse?.penPos).toEqual(DEFAULT_PEN_POS) // CR-035: 옛 기대 null 대체
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('TC-026: 리셋 실패 → onError(BridgeError), 기존 축·파츠 위치·이동 영역 표시 유지, 버튼 다시 활성', async () => {
    vi.mocked(setSettings).mockRejectedValueOnce(IO_ERR)
    const { onError } = setup()
    fireEvent.click(btn('기본값으로 리셋'))
    expect(setSettings).toHaveBeenCalledTimes(1)
    // area 값·pad 부재의 전체 검사는 TC-025 몫(bridge CR-018 대기) — 여기서는 어깨·hand·partPos 만 본다
    expect(setSettings).toHaveBeenCalledWith({
      ...SETTINGS,
      mouse: expect.objectContaining({
        shoulder: { x: 582, y: 484 }, // CR-044: CR-038 (558,500) · 옛 (620,530)
        hand: null,
        partPos: { x: 411, y: 464 }, // CR-044: CR-038 까지 (389,492)
      }),
    })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(IO_ERR))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(marker(600, 480)).toBeInTheDocument()
    expect(shoulderDd()?.textContent).toBe('(600, 480)')
    expectHandAt(PART_POS)
    expect(polygonPts()).toBe(SVG_SAVED)
    expect(areaDd()?.textContent).toBe(DD_SAVED)
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
    expect(btn('어깨축 설정하기')).toBeEnabled()
  })

  it('TC-027: settings.mouse 가 null 이어도 리셋·마법사 저장은 객체 mouse 를 보낸다', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const nullMouse: Settings = { ...SETTINGS, mouse: null }
    const { onError } = setup({ settings: nullMouse })
    fireEvent.click(btn('기본값으로 리셋'))
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({
      ...nullMouse,
      mouse: DEFAULT_MOUSE_EXPECTED,
    })
    // 동기화: 1회차 persist 완료(onError 1회) + saving 해제 렌더(「기본값으로 리셋」은 saving 중 비활성)
    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1)
      expect(btn('기본값으로 리셋')).toBeEnabled()
    })
    startAndPick()
    fireEvent.click(btn('저장'))
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual({
      ...nullMouse,
      mouse: { ...DEFAULT_MOUSE_EXPECTED, shoulder: PICKED },
    })
  })

  it('TC-028: 저장 인자는 mouse 외 필드(autostart:false 포함)를 그대로 싣고, 성공 시 오류만 지운다(CR-004)', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const { onError } = setup()
    fireEvent.click(btn('기본값으로 리셋'))
    const resetArg = vi.mocked(setSettings).mock.calls[0][0]
    expect({ ...resetArg, mouse: null }).toStrictEqual({ ...SETTINGS, mouse: null })
    // 동기화: 1회차 persist 완료(onError 1회) + saving 해제 렌더(「기본값으로 리셋」은 saving 중 비활성)
    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1)
      expect(btn('기본값으로 리셋')).toBeEnabled()
    })
    startAndPick()
    fireEvent.click(btn('저장'))
    const saveArg = vi.mocked(setSettings).mock.calls[1][0]
    expect({ ...saveArg, mouse: null }).toStrictEqual({ ...SETTINGS, mouse: null })
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2))
    expect(onError.mock.calls.every(c => c[0] === null)).toBe(true)
    expect(setAutostart).not.toHaveBeenCalled()
  })
})

// ─── 손 그림 끌어다 놓기 (R-11, P-5) ────────────────────────────────────────
// 좌표: 캔버스 900×700 · scale 0.5 · partPos (100,200) · 손 그림 200×150
//   → 잡히는 사각형 = 캔버스 x∈[100,300)·y∈[200,350) = 미리보기 오프셋 x∈[50,150)·y∈[100,175)
//   → 누름 (100,150) = 캔버스 (200,300), grab (100,100)
describe('손 그림 끌어다 놓기 (R-11, CR-016)', () => {
  it('TC-049: 끌면 그림·값 목록이 따라오고, 놓으면 setSettings 1회(partPos), 뒤이은 click 은 무시된다', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const { onError, rerender } = setup()
    const moved = withPart({ x: 300, y: 300 })
    down(100, 150)
    expect(capture.set).toHaveBeenCalledTimes(1)
    expect(capture.set).toHaveBeenCalledWith(PID)
    expectHandAt(PART_POS) // 누르기만 해서는 움직이지 않는다
    move(150, 175) // 캔버스 (300,350) − grab → (200,250)
    expectHandAt({ x: 200, y: 250 })
    expect(handImg()).toHaveStyle({ width: '100px', height: '75px' })
    move(200, 200) // 캔버스 (400,400) − grab → (300,300)
    expectHandAt({ x: 300, y: 300 })
    expect(setSettings).not.toHaveBeenCalled() // 끌기 중에는 저장하지 않는다
    up(200, 200)
    expect(capture.release).toHaveBeenCalledTimes(1)
    expect(capture.release).toHaveBeenCalledWith(PID)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(moved)
    fireEvent.click(preview(), { clientX: 200, clientY: 200 }) // 놓은 뒤 브라우저가 보내는 click(규칙 ③)
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    expect(onError).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
    expect(guide().textContent).toBe(G_IDLE)
    expect(buttonNames()).toEqual(IDLE_BUTTONS)
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(marker(600, 480)).toBeInTheDocument()
    expectHandAt(PART_POS) // settings://changed 전에는 props 값(§4 shownPartPos = drag ? drag.pos : mouse.partPos)
    rerender(<MousePartsTab settings={moved} manifest={HAND} onError={onError} />)
    expectHandAt({ x: 300, y: 300 })
    expect(setSettings).toHaveBeenCalledTimes(1)
  })

  it('TC-050: 누른 점은 미리보기 박스(getBoundingClientRect) 기준 오프셋으로 판정한다', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    setup()
    vi.spyOn(preview(), 'getBoundingClientRect').mockReturnValue(rectAt(10, 20))
    // ① 오프셋 (45,110) → 캔버스 (90,220): 밖(rect 를 빼지 않으면 (110,260) 으로 안)
    down(55, 130)
    move(105, 155)
    up(105, 155)
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expectHandAt(PART_POS)
    // ② 오프셋 (145,170) → 캔버스 (290,340): 안(rect 를 빼지 않으면 (310,380) 으로 밖), grab (190,140)
    down(155, 190)
    expect(capture.set).toHaveBeenCalledWith(PID)
    move(205, 215) // 오프셋 (195,195) → 캔버스 (390,390) → (200,250)
    expectHandAt({ x: 200, y: 250 })
    up(205, 215)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(withPart({ x: 200, y: 250 }))
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
  })

  it('TC-051: 움직이지 않고 놓거나 원위치에 놓으면 저장하지 않는다', () => {
    setup()
    down(100, 150)
    up(100, 150)
    expect(capture.release).toHaveBeenCalledWith(PID)
    expectHandAt(PART_POS)
    down(100, 150)
    move(150, 175)
    expectHandAt({ x: 200, y: 250 })
    move(100, 150)
    expectHandAt(PART_POS)
    up(100, 150)
    expect(capture.set).toHaveBeenCalledTimes(2)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-051: 캔버스 전체 크기 그림은 (0, 0) 에 고정 — 끌어도 움직이지 않고 저장하지 않는다', () => {
    setup({ settings: withPart({ x: 0, y: 0 }), manifest: FULL })
    expect(handImg()).toHaveStyle({ width: '450px', height: '350px' })
    down(100, 150) // 캔버스 (200,300) — 사각형 [0,900)×[0,700) 안
    move(300, 300)
    expectHandAt({ x: 0, y: 0 })
    move(20, 20)
    expectHandAt({ x: 0, y: 0 })
    up(20, 20)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-052: 끌기 위치는 그림 전체가 캔버스 안에 들도록 제한되고, 제한된 값으로 저장된다', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    setup()
    down(100, 150) // grab (100,100)
    move(440, 345) // 캔버스 (880,690) → (780,590) → 제한 (700,550)
    expectHandAt({ x: 700, y: 550 })
    expect(handImg()).toHaveStyle({ left: '350px', top: '275px', width: '100px', height: '75px' }) // 오른쪽·아래 끝 = 450·350px
    move(-50, -50) // 오프셋 음수 → 캔버스 (0,0) → (−100,−100) → 제한 (0,0)
    expectHandAt({ x: 0, y: 0 })
    move(500, 400) // 캔버스 (1000,800) 을 (900,700) 으로 고정 → (800,600) → 제한 (700,550)
    expectHandAt({ x: 700, y: 550 })
    up(500, 400)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(withPart({ x: 700, y: 550 }))
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
  })

  it('TC-053: 손 그림 사각형 밖 누름·왼쪽 아닌 버튼은 끌기를 시작하지 않는다', () => {
    setup()
    down(20, 20) // 캔버스 (40,40): 밖
    move(150, 175)
    up(150, 175)
    expectHandAt(PART_POS)
    down(100, 150, 2) // 사각형 안이지만 오른쪽 버튼
    move(150, 175)
    up(150, 175)
    expectHandAt(PART_POS)
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-053: mouse_base 가 없으면 손 그림이 없고 끌기도 시작되지 않는다', () => {
    setup({ manifest: NO_HAND })
    expect(handImg()).toBeNull()
    down(100, 150)
    move(150, 175)
    up(150, 175)
    expect(partDd()?.textContent).toBe('(100, 200)')
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-054: pickShoulder·review 에서는 끌기가 시작되지 않고, 사각형 안 클릭도 축 지정으로만 처리된다', () => {
    setup()
    fireEvent.click(btn('어깨축 설정하기'))
    down(100, 150) // 손 그림 사각형 안
    move(150, 175)
    expectHandAt(PART_POS)
    up(150, 175)
    fireEvent.click(preview(), { clientX: 150, clientY: 175 }) // → 축 (300,350)
    expect(guide().textContent).toBe(G_REVIEW)
    expect(marker(300, 350)).toBeInTheDocument()
    expectHandAt(PART_POS)
    down(100, 150) // review
    move(200, 200)
    up(200, 200)
    expectHandAt(PART_POS)
    expect(guide().textContent).toBe(G_REVIEW)
    expect(marker(300, 350)).toBeInTheDocument()
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-055: 리셋 저장 중(saving)에는 끌기가 시작되지 않는다', async () => {
    const d = deferred<Settings>()
    vi.mocked(setSettings).mockReturnValue(d.promise)
    setup()
    fireEvent.click(btn('기본값으로 리셋'))
    down(100, 150)
    move(150, 175)
    expectHandAt(PART_POS)
    up(150, 175)
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).toHaveBeenCalledTimes(1) // 리셋 1회뿐
    await act(async () => {
      d.resolve({ ...SETTINGS, mouse: DEFAULT_MOUSE_EXPECTED })
    })
    expect(btn('기본값으로 리셋')).toBeEnabled()
  })

  it('TC-055: 끌어다 놓기 저장 중에도 다음 끌기가 시작되지 않고 버튼이 비활성', async () => {
    const d = deferred<Settings>()
    vi.mocked(setSettings).mockReturnValue(d.promise)
    setup()
    down(100, 150)
    move(150, 175)
    up(150, 175) // 1회차 저장 대기(partPos 200,250)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(withPart({ x: 200, y: 250 }))
    expect(btn('기본값으로 리셋')).toBeDisabled()
    expect(btn('어깨축 설정하기')).toBeDisabled()
    down(100, 150)
    move(200, 200)
    expectHandAt(PART_POS)
    up(200, 200)
    expect(capture.set).toHaveBeenCalledTimes(1)
    expect(setSettings).toHaveBeenCalledTimes(1)
    await act(async () => {
      d.resolve(withPart({ x: 200, y: 250 }))
    })
    expect(btn('기본값으로 리셋')).toBeEnabled()
  })

  it('TC-056: pointercancel 이면 옛 자리로 돌아가고 저장하지 않으며, 뒤이은 pointerup 도 무시한다', () => {
    const { onError } = setup()
    down(100, 150)
    move(150, 175)
    expectHandAt({ x: 200, y: 250 })
    cancel()
    expectHandAt(PART_POS)
    up(150, 175)
    expectHandAt(PART_POS)
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(guide().textContent).toBe(G_IDLE)
  })

  it('TC-057: 놓기 저장 실패 → onError(BridgeError), 그림·값 목록은 옛 자리, 다시 끌어 저장할 수 있다', async () => {
    vi.mocked(setSettings).mockRejectedValueOnce(IO_ERR).mockImplementationOnce(async s => s)
    const { onError } = setup()
    down(100, 150)
    move(150, 175)
    up(150, 175)
    await waitFor(() => expect(onError).toHaveBeenCalledWith(IO_ERR))
    expect(onError).toHaveBeenCalledTimes(1)
    expectHandAt(PART_POS)
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
    down(100, 150)
    move(150, 175)
    up(150, 175)
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual(withPart({ x: 200, y: 250 }))
    await waitFor(() => expect(onError).toHaveBeenLastCalledWith(null))
  })

  it('TC-058 (CR-044 개정): settings.mouse 가 null 이면 기본 파츠 위치에서 끌고, 저장은 객체 mouse(기본값 + 새 partPos)', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const nullMouse: Settings = { ...SETTINGS, mouse: null }
    setup({ settings: nullMouse })
    expectHandAt(DEFAULT_PART_POS) // CR-044: (411,464)
    // CR-044 재계산: 사각형 [411,611)×[464,614)(200×150), 누름 캔버스 (500,520) 안 → grab (89,56)
    // (CR-038 기준 [389,589)×[492,642)·grab (111,28)·결과 (439,522))
    down(250, 260) // 캔버스 (500,520)
    move(275, 275) // 캔버스 (550,550) → (461,494) — 이동량 (+50,+30) 불변, 제한 범위 x∈[0,700]·y∈[0,550] 안
    expectHandAt({ x: 461, y: 494 })
    up(275, 275)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({
      ...nullMouse,
      mouse: { ...DEFAULT_MOUSE_EXPECTED, partPos: { x: 461, y: 494 } },
    })
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
  })
})

// ─── 접근성 (§9) ───────────────────────────────────────────────────────────
describe('접근성 (§9)', () => {
  // 전제: persist 성공 분기가 dispatch({type:'saved'}) 와 setSaving(false) 를 await 없이 연속 호출해
  // 같은 렌더에서 idle·활성이 된다(design §5.2 persist · §9). 그래야 idle 복귀 focus() 가 비활성 버튼에 걸리지 않는다.
  it('TC-029: 단계가 바뀌면 다음 단계 첫 버튼으로 포커스, 첫 마운트는 옮기지 않는다', async () => {
    vi.mocked(setSettings).mockResolvedValue(SAVED)
    setup()
    expect(document.body).toHaveFocus()
    fireEvent.click(btn('어깨축 설정하기'))
    await waitFor(() => expect(btn('취소')).toHaveFocus())
    fireEvent.click(btn('취소')) // pickShoulder → idle
    await waitFor(() => expect(btn('어깨축 설정하기')).toHaveFocus())
    fireEvent.click(btn('어깨축 설정하기'))
    await waitFor(() => expect(btn('취소')).toHaveFocus())
    fireEvent.click(preview(), { clientX: 150, clientY: 100 })
    await waitFor(() => expect(btn('저장')).toHaveFocus())
    fireEvent.click(btn('취소'))
    await waitFor(() => expect(btn('어깨축 설정하기')).toHaveFocus())
    expect(setSettings).not.toHaveBeenCalled() // 취소 경로는 저장 없음
    startAndPick()
    fireEvent.click(btn('저장'))
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(setSettings).toHaveBeenCalledWith(SAVED)
    await waitFor(() => expect(guide().textContent).toBe(G_IDLE))
    await waitFor(() => expect(btn('어깨축 설정하기')).toHaveFocus())
  })

  it('TC-030: 역할·라벨·장식 숨김·포인터 전용 미리보기·실시간 알림 없음·네이티브 버튼', () => {
    const { container } = setup()
    // CR-028: section 이름 = t.tabMouse(「어깨축·손 위치」). Provider 없이 렌더 → ko(design/i18n.md §3)
    expect(screen.getByRole('region', { name: '어깨축·손 위치' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '마우스 파츠' })).toBeNull()
    expect(guide()).toHaveAttribute('aria-live', 'polite')
    expect(preview()).toHaveAttribute('role', 'presentation')
    expect(preview()).not.toHaveAttribute('tabindex')
    const imgs = Array.from(preview().querySelectorAll('img'))
    expect(imgs).toHaveLength(2) // 손 그림 + 바탕
    for (const img of imgs) {
      expect(img).toHaveAttribute('alt', '')
      expect(img).toHaveAttribute('draggable', 'false')
    }
    expectNoPadBox()
    down(100, 150)
    move(150, 175) // 끌기 중에도 aria-live 는 안내 줄 하나뿐
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1)
    cancel()
    const checkButtons = () =>
      screen.getAllByRole('button').forEach(b => {
        expect(b).toHaveAttribute('type', 'button')
        expect(b).not.toHaveAttribute('tabindex')
      })
    checkButtons()
    startAndPick()
    checkButtons()
    expect(setSettings).not.toHaveBeenCalled()
  })
})

// ─── 이동 영역 설정 (R-15·R-16, CR-018) ─────────────────────────────────────
// 좌표: 캔버스 900×700 · scale 0.5 · rect 0 → 클릭 오프셋 AREA_CLICKS = 캔버스 NEW_AREA
//   (50,200)→(100,400) · (400,200)→(800,400) · (400,325)→(800,650) · (50,325)→(100,650)
//   네 점 모두 손 그림 사각형(오프셋 x∈[50,150)·y∈[100,175)) 밖.
// 선 굵기·색은 CSS Modules — 클래스 비교만 한다(저장 선 ≠ 편집 선). 실물은 manual-checklist M-13.
// CR-057: 버튼·단계 안내 문구 교체(🔒 ko 확정). 버튼 개수·순서·동작은 불변 — idle 의 새 설명 <p> 는 버튼이 아니다.
const IDLE_BUTTONS = ['어깨축 설정하기', AREA_START, '기본값으로 리셋']
const G_AREA = [
  '1/4 사각형의 왼쪽 위 꼭짓점을 클릭해주세요.',
  '2/4 이제 오른쪽 위 꼭짓점을 클릭해주세요.',
  '3/4 이제 오른쪽 아래 꼭짓점을 클릭해주세요.',
  '4/4 마지막으로 왼쪽 아래 꼭짓점을 클릭해주세요.',
]
const G_AREA_REVIEW = '사각형이 맞는지 확인하고 저장하세요.'
const NEW_AREA: MouseSettings['area'] = [
  { x: 100, y: 400 },
  { x: 800, y: 400 },
  { x: 800, y: 650 },
  { x: 100, y: 650 },
]
const AREA_CLICKS: [number, number][] = [
  [50, 200],
  [400, 200],
  [400, 325],
  [50, 325],
]
const AREA_SAVED: Settings = { ...SETTINGS, mouse: { ...MOUSE, area: NEW_AREA } }
const AREA_ERR: BridgeError = { code: 'SETTINGS_INVALID', message: '이동 영역 값이 올바르지 않습니다.' }
const SVG_SAVED = '100,250 150,250 150,280 100,280' // AREA × 0.5
const SVG_NEW = '50,200 400,200 400,325 50,325' // NEW_AREA × 0.5
const SVG_DEFAULT = '187.5,262.5 247.5,262.5 247.5,312.5 187.5,312.5' // DEFAULT_AREA × 0.5
const DD_SAVED = '왼쪽 위 (200, 500) · 오른쪽 위 (300, 500) · 오른쪽 아래 (300, 560) · 왼쪽 아래 (200, 560)'
const DD_NEW = '왼쪽 위 (100, 400) · 오른쪽 위 (800, 400) · 오른쪽 아래 (800, 650) · 왼쪽 아래 (100, 650)'
const DD_DEFAULT = '왼쪽 위 (375, 525) · 오른쪽 위 (495, 525) · 오른쪽 아래 (495, 625) · 왼쪽 아래 (375, 625)'

const outline = () => preview().querySelector('svg')
const polygonPts = () => preview().querySelector('polygon')?.getAttribute('points') ?? null
const polylinePts = () => preview().querySelector('polyline')?.getAttribute('points') ?? null
const lineClass = () => preview().querySelector('polygon, polyline')?.getAttribute('class') ?? null
const dots = () =>
  Array.from(preview().querySelectorAll('circle')).map(c => `${c.getAttribute('cx')},${c.getAttribute('cy')}`)
const areaDd = () => screen.getByText('이동 영역', { selector: 'dt' }).nextElementSibling
const clickArea = (i: number) =>
  fireEvent.click(preview(), { clientX: AREA_CLICKS[i][0], clientY: AREA_CLICKS[i][1] })
const pickArea4 = () => {
  fireEvent.click(btn(AREA_START))
  AREA_CLICKS.forEach((_, i) => clickArea(i))
}

describe('이동 영역 설정 (R-15·R-16, CR-018)', () => {
  it('TC-063: idle 에서는 저장된 이동 영역을 편집 표시 없는 닫힌 선으로, 바탕 위·축 마커 아래에 그린다', () => {
    const first = setup()
    const svg = outline()
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('width', '450')
    expect(svg).toHaveAttribute('height', '350')
    expect(polygonPts()).toBe(SVG_SAVED)
    expect(polylinePts()).toBeNull()
    expect(dots()).toEqual([])
    const imgs = preview().querySelectorAll('img')
    const base = imgs[imgs.length - 1]
    expect(base.compareDocumentPosition(svg as Element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect((svg as Element).compareDocumentPosition(marker(600, 480)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    startAndPick() // 어깨축 마법사 중에도 저장된 영역 선은 그대로(shownArea 「그 외」)
    expect(polygonPts()).toBe(SVG_SAVED)
    expect(dots()).toEqual([])
    first.unmount()
    const nullMouse = setup({ settings: { ...SETTINGS, mouse: null } })
    expect(polygonPts()).toBe(SVG_DEFAULT)
    nullMouse.unmount()
    setup({ manifest: { canvas: { width: 900, height: 350 }, entries: [entry('body', 900, 350), PART] } })
    expect(outline()).toHaveAttribute('width', '450')
    expect(outline()).toHaveAttribute('height', '175')
    expect(polygonPts()).toBe(SVG_SAVED)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-064: 「사각형 이동 영역 설정」 → pickArea: 안내 1/4·[취소]만·선택 중 표시, 저장된 선은 사라지고 축 마커·값 목록은 저장값', () => {
    setup()
    const idleClass = preview().className
    fireEvent.click(btn('어깨축 설정하기'))
    const pickingClass = preview().className
    fireEvent.click(btn('취소'))
    fireEvent.click(btn(AREA_START))
    expect(guide().textContent).toBe(G_AREA[0])
    expect(buttonNames()).toEqual(['취소'])
    expect(preview().className).not.toBe(idleClass)
    expect(preview().className).toBe(pickingClass)
    expect(outline()).toBeNull()
    expect(marker(600, 480)).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(shoulderDd()?.textContent).toBe('(600, 480)')
    expect(areaDd()?.textContent).toBe(DD_SAVED)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-065: 네 점을 박스 기준 오프셋으로 차례 클릭 → 안내 2/4·3/4·4/4 → reviewArea, 열린 편집 선 → 닫힌 사각형, 값 목록은 임시 4점', () => {
    setup()
    const savedClass = lineClass()
    fireEvent.click(btn(AREA_START))
    const pickingClass = preview().className
    vi.spyOn(preview(), 'getBoundingClientRect').mockReturnValue(rectAt(10, 20))
    const at = (i: number) =>
      fireEvent.click(preview(), { clientX: AREA_CLICKS[i][0] + 10, clientY: AREA_CLICKS[i][1] + 20 })
    at(0)
    expect(guide().textContent).toBe(G_AREA[1])
    expect(dots()).toEqual(['50,200'])
    expect(preview().querySelector('polygon')).toBeNull()
    at(1)
    expect(guide().textContent).toBe(G_AREA[2])
    expect(polylinePts()).toBe('50,200 400,200')
    expect(dots()).toEqual(['50,200', '400,200'])
    const editingClass = lineClass()
    expect(editingClass).not.toBe(savedClass)
    at(2)
    expect(guide().textContent).toBe(G_AREA[3])
    expect(polylinePts()).toBe('50,200 400,200 400,325')
    expect(dots()).toHaveLength(3)
    expect(buttonNames()).toEqual(['취소'])
    expect(areaDd()?.textContent).toBe(DD_SAVED) // pickArea 중 값 목록은 저장값
    at(3)
    expect(guide().textContent).toBe(G_AREA_REVIEW)
    expect(polygonPts()).toBe(SVG_NEW)
    expect(polylinePts()).toBeNull()
    expect(dots()).toEqual(['50,200', '400,200', '400,325', '50,325'])
    expect(lineClass()).toBe(editingClass)
    expect(preview().className).toBe(pickingClass)
    expect(buttonNames()).toEqual(['저장', '취소'])
    expect(areaDd()?.textContent).toBe(DD_NEW)
    expect(marker(600, 480)).toBeInTheDocument()
    expect(shoulderDd()?.textContent).toBe('(600, 480)')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-066: reviewArea 에서 미리보기 클릭은 무시된다(다섯 번째 점 없음)', () => {
    setup()
    pickArea4()
    fireEvent.click(preview(), { clientX: 200, clientY: 100 })
    expect(guide().textContent).toBe(G_AREA_REVIEW)
    expect(polygonPts()).toBe(SVG_NEW)
    expect(dots()).toHaveLength(4)
    expect(areaDd()?.textContent).toBe(DD_NEW)
    expect(buttonNames()).toEqual(['저장', '취소'])
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-067: 「저장」 → setSettings 1회({...settings, mouse:{...mouse, area}}) → 오류 지움·idle, 수신 뒤 새 영역이 저장 선으로', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const { onError, rerender } = setup()
    const savedClass = lineClass()
    pickArea4()
    fireEvent.click(btn('저장'))
    expect(setSettings).toHaveBeenCalledTimes(1)
    const arg = vi.mocked(setSettings).mock.calls[0][0]
    expect(arg).toStrictEqual(AREA_SAVED)
    expect(Object.keys(arg.mouse ?? {}).sort()).toEqual(['area', 'hand', 'partPos', 'penMode', 'penPos', 'shoulder'])
    await waitFor(() => expect(guide().textContent).toBe(G_IDLE))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(null)
    expect(buttonNames()).toEqual(IDLE_BUTTONS)
    // settings://changed 전에는 props 값(§4 shownArea 「그 외」 = mouse.area)
    expect(polygonPts()).toBe(SVG_SAVED)
    expect(dots()).toEqual([])
    expect(areaDd()?.textContent).toBe(DD_SAVED)
    rerender(<MousePartsTab settings={AREA_SAVED} manifest={HAND} onError={onError} />)
    expect(polygonPts()).toBe(SVG_NEW)
    expect(lineClass()).toBe(savedClass)
    expect(dots()).toEqual([])
    expect(areaDd()?.textContent).toBe(DD_NEW)
    expect(marker(600, 480)).toBeInTheDocument()
    expect(setSettings).toHaveBeenCalledTimes(1)
  })

  it('TC-068: 저장 실패 → onError(BridgeError), reviewArea 유지(편집 선·점·임시 값), 다시 저장 가능', async () => {
    vi.mocked(setSettings).mockRejectedValueOnce(AREA_ERR).mockImplementationOnce(async s => s)
    const { onError } = setup()
    pickArea4()
    fireEvent.click(btn('저장'))
    await waitFor(() => expect(onError).toHaveBeenCalledWith(AREA_ERR))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(guide().textContent).toBe(G_AREA_REVIEW)
    expect(polygonPts()).toBe(SVG_NEW)
    expect(dots()).toHaveLength(4)
    expect(areaDd()?.textContent).toBe(DD_NEW)
    await waitFor(() => expect(btn('저장')).toBeEnabled())
    fireEvent.click(btn('저장'))
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual(AREA_SAVED)
    await waitFor(() => expect(guide().textContent).toBe(G_IDLE))
    expect(onError).toHaveBeenLastCalledWith(null)
  })

  it('TC-069: 「취소」(pickArea·reviewArea) → 임시 점을 버리고 idle, 저장된 영역 선 복귀, 저장 없음', () => {
    const { onError } = setup()
    const idleClass = preview().className
    fireEvent.click(btn(AREA_START))
    clickArea(0)
    clickArea(1)
    fireEvent.click(btn('취소'))
    expect(guide().textContent).toBe(G_IDLE)
    expect(buttonNames()).toEqual(IDLE_BUTTONS)
    expect(preview().className).toBe(idleClass)
    expect(polygonPts()).toBe(SVG_SAVED)
    expect(polylinePts()).toBeNull()
    expect(dots()).toEqual([])
    pickArea4()
    fireEvent.click(btn('취소'))
    expect(guide().textContent).toBe(G_IDLE)
    expect(polygonPts()).toBe(SVG_SAVED)
    expect(dots()).toEqual([])
    expect(areaDd()?.textContent).toBe(DD_SAVED)
    fireEvent.click(btn(AREA_START)) // 다시 시작하면 점 0개부터
    expect(guide().textContent).toBe(G_AREA[0])
    expect(outline()).toBeNull()
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('TC-070: 저장 중(saving)에는 reviewArea 의 「저장」·「취소」가 비활성, 끝나면 idle 세 버튼 활성', async () => {
    const d = deferred<Settings>()
    vi.mocked(setSettings).mockReturnValue(d.promise)
    setup()
    pickArea4()
    fireEvent.click(btn('저장'))
    expect(btn('저장')).toBeDisabled()
    expect(btn('취소')).toBeDisabled()
    fireEvent.click(btn('저장'))
    fireEvent.click(btn('취소'))
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(guide().textContent).toBe(G_AREA_REVIEW)
    await act(async () => {
      d.resolve(AREA_SAVED)
    })
    expect(guide().textContent).toBe(G_IDLE)
    expect(btn('어깨축 설정하기')).toBeEnabled()
    expect(btn(AREA_START)).toBeEnabled()
    expect(btn('기본값으로 리셋')).toBeEnabled()
  })

  it('TC-071: 상호 배타 — 이동 영역 중 어깨축 버튼 없음·끌기 불가(손 그림 위 클릭은 꼭짓점), 어깨축 마법사 중 이동 영역 버튼 없음·점 안 쌓임', () => {
    setup()
    fireEvent.click(btn(AREA_START))
    expect(screen.queryByRole('button', { name: '어깨축 설정하기' })).toBeNull()
    down(100, 150) // 손 그림 사각형 안
    move(150, 175)
    expectHandAt(PART_POS)
    up(150, 175)
    fireEvent.click(preview(), { clientX: 150, clientY: 175 }) // → 꼭짓점 1 = 캔버스 (300,350)
    expect(guide().textContent).toBe(G_AREA[1])
    expect(dots()).toEqual(['150,175'])
    expectHandAt(PART_POS)
    expect(marker(600, 480)).toBeInTheDocument() // 축 지정으로 처리되지 않음
    for (let i = 1; i < 4; i++) clickArea(i)
    expect(guide().textContent).toBe(G_AREA_REVIEW)
    expect(screen.queryByRole('button', { name: '어깨축 설정하기' })).toBeNull()
    down(100, 150) // reviewArea
    move(200, 200)
    up(200, 200)
    expectHandAt(PART_POS)
    fireEvent.click(btn('취소'))
    fireEvent.click(btn('어깨축 설정하기'))
    expect(screen.queryByRole('button', { name: AREA_START })).toBeNull()
    fireEvent.click(preview(), { clientX: 150, clientY: 100 }) // 축 (300,200)
    expect(guide().textContent).toBe(G_REVIEW)
    expect(screen.queryByRole('button', { name: AREA_START })).toBeNull()
    expect(dots()).toEqual([])
    expect(polygonPts()).toBe(SVG_SAVED)
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-072: 포커스 — pickArea 진입 「취소」, 점이 늘어나는 동안 유지, reviewArea 진입 「저장」, idle 복귀 「어깨축 설정하기」', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    setup()
    expect(document.body).toHaveFocus()
    fireEvent.click(btn(AREA_START))
    await waitFor(() => expect(btn('취소')).toHaveFocus())
    clickArea(0)
    clickArea(1)
    clickArea(2)
    expect(btn('취소')).toHaveFocus()
    clickArea(3)
    await waitFor(() => expect(btn('저장')).toHaveFocus())
    fireEvent.click(btn('취소')) // reviewArea → idle
    await waitFor(() => expect(btn('어깨축 설정하기')).toHaveFocus())
    fireEvent.click(btn(AREA_START))
    await waitFor(() => expect(btn('취소')).toHaveFocus())
    fireEvent.click(btn('취소')) // pickArea → idle
    await waitFor(() => expect(btn('어깨축 설정하기')).toHaveFocus())
    expect(setSettings).not.toHaveBeenCalled()
    pickArea4()
    await waitFor(() => expect(btn('저장')).toHaveFocus())
    fireEvent.click(btn('저장'))
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(setSettings).toHaveBeenCalledWith(AREA_SAVED)
    await waitFor(() => expect(guide().textContent).toBe(G_IDLE))
    await waitFor(() => expect(btn('어깨축 설정하기')).toHaveFocus())
  })

  it('TC-073: 영역 선은 장식(aria-hidden·focusable=false)이라 역할 트리·실시간 알림에 없고, 이동 영역 단계 버튼도 네이티브 type=button', () => {
    const { container } = setup()
    const check = () => {
      const svg = outline()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
      expect(svg).toHaveAttribute('focusable', 'false')
      expect(svg).not.toHaveAttribute('aria-label')
      expect(screen.getAllByRole('img')).toHaveLength(1) // 축 마커뿐
      expect(container.querySelectorAll('[aria-live]')).toHaveLength(1)
      screen.getAllByRole('button').forEach(b => {
        expect(b).toHaveAttribute('type', 'button')
        expect(b).not.toHaveAttribute('tabindex')
      })
    }
    check() // idle
    fireEvent.click(btn(AREA_START))
    clickArea(0)
    check() // pickArea(점 1개)
    for (let i = 1; i < 4; i++) clickArea(i)
    check() // reviewArea
    expect(preview()).toHaveAttribute('role', 'presentation')
    expect(preview()).not.toHaveAttribute('tabindex')
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-074: settings.mouse 가 null 이면 기본 영역을 표시하고, 이동 영역 저장은 객체 mouse(기본값 + 새 area)', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const nullMouse: Settings = { ...SETTINGS, mouse: null }
    setup({ settings: nullMouse })
    expect(polygonPts()).toBe(SVG_DEFAULT)
    expect(areaDd()?.textContent).toBe(DD_DEFAULT)
    pickArea4()
    fireEvent.click(btn('저장'))
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({
      ...nullMouse,
      mouse: { ...DEFAULT_MOUSE_EXPECTED, area: NEW_AREA },
    })
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
  })
})

// ─── 펜 쥔 손 위치 끌기 (R-18, CR-026) ──────────────────────────────────────
// scenarios.md TC-080 ~ TC-091 · TC-FLOW-07. 선행: CR-026 화면 · bridge CR-026(penPos·펜 슬롯) ·
//   overlay CR-025 resolvePenPos(src/state/mouseMapping.ts).
// 좌표: 캔버스 900×700 · scale 0.5 · 펜 손 pen_up 100×80
//   penPos null + MOUSE.hand (400,560) → 기본 위치(손 그림 중심 = hand) (350,520)
//   → 잡히는 사각형 = 캔버스 x∈[350,450)·y∈[520,600) = 미리보기 오프셋 x∈[175,225)·y∈[260,300)
//   → 누름 (200,280) = 캔버스 (400,560), grab (50,40). 제한 범위 x∈[0,800]·y∈[0,620]
//   PEN_OVER (150,250) → 사각형 [150,250)×[250,330) — 팔 파츠 사각형 [100,300)×[200,350) 과 겹친다
//   hand null + DEFAULT_AREA → 기본 이동 영역 중심 (435,575) → 기본 위치 (385,535)
const PEN = entry('pen_up', 100, 80)
const PEN_HAND: AssetManifest = { canvas: CANVAS, entries: [BODY, PART, PEN] }
const PEN_HOME: Point = { x: 350, y: 520 }
const PEN_OVER: Point = { x: 150, y: 250 }
const PEN_DEFAULT_HOME: Point = { x: 385, y: 535 }
const withPen = (penPos: Point | null): Settings => ({ ...SETTINGS, mouse: { ...MOUSE, penPos } })

const penImg = () => preview().querySelector<HTMLImageElement>('img[src="asset://pen_up.png"]')
const penDd = () => screen.queryByText('손 위치', { selector: 'dt' })?.nextElementSibling ?? null
const dtNames = () => Array.from(document.querySelectorAll('dt')).map(d => d.textContent)
const follows = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
/** 펜 손 위치(미리보기 px = 캔버스 × scale)와 값 목록 「손 위치」가 둘 다 p 인지 */
const expectPenAt = (p: Point, scale = 0.5) => {
  expect(penImg()).toHaveStyle({ left: `${p.x * scale}px`, top: `${p.y * scale}px` })
  expect(penDd()?.textContent).toBe(`(${p.x}, ${p.y})`)
}

describe('펜 쥔 손 위치 끌기 (R-18, CR-026)', () => {
  it('TC-080: pen_up 이 있으면 바탕 위·영역 선 아래에 회전 없이 그리고, penPos null 이면 기본 위치 — 값 목록 ④ 「손 위치」', () => {
    setup({ manifest: PEN_HAND })
    expect(srcs()).toEqual(['asset://mouse_base.png', 'asset://body.png', 'asset://pen_up.png'])
    const pen = penImg()!
    const base = preview().querySelector('img[src="asset://body.png"]')!
    expect(follows(base, pen)).toBe(true)
    expect(follows(pen, outline()!)).toBe(true)
    expect(follows(outline()!, marker(600, 480))).toBe(true)
    expect(pen).toHaveStyle({ left: '175px', top: '260px', width: '50px', height: '40px' })
    expect(pen.style.transform).toBe('')
    expect(pen).toHaveAttribute('alt', '')
    expect(pen).toHaveAttribute('draggable', 'false')
    expect(pen.className).toBe(handImg()!.className)
    expect(dtNames()).toEqual(['축(어깨)', '파츠 위치', '이동 영역', '손 위치'])
    expect(penDd()?.textContent).toBe('(350, 520)')
    expectHandAt(PART_POS)
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-080: 저장된 penPos 가 있으면 그 자리(기본 위치 규칙을 쓰지 않는다)', () => {
    setup({ settings: withPen({ x: 500, y: 100 }), manifest: PEN_HAND })
    expectPenAt({ x: 500, y: 100 })
    expect(penImg()).toHaveStyle({ left: '250px', top: '50px' })
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-081: pen_up 이 없으면 펜 손 그림·「손 위치」 행이 없고, 저장된 penPos 자리를 눌러도 끌기가 시작되지 않는다', () => {
    setup({ settings: withPen({ x: 500, y: 100 }), manifest: HAND })
    expect(penImg()).toBeNull()
    expect(srcs()).toEqual(['asset://mouse_base.png', 'asset://body.png'])
    expect(dtNames()).toEqual(['축(어깨)', '파츠 위치', '이동 영역'])
    expect(penDd()).toBeNull()
    down(260, 70) // 캔버스 (520,140) — penPos 사각형 [500,600)×[100,180) 자리지만 그림 없음
    move(300, 100)
    up(300, 100)
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expectHandAt(PART_POS)
  })

  it('TC-082: 펜 손을 끌면 그림·「손 위치」가 따라오고, 놓으면 setSettings 1회(penPos 만 바뀜), 수신 뒤 새 자리', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const { onError, rerender } = setup({ manifest: PEN_HAND })
    const moved = withPen({ x: 450, y: 560 })
    down(200, 280) // 캔버스 (400,560), grab (50,40)
    expect(capture.set).toHaveBeenCalledTimes(1)
    expect(capture.set).toHaveBeenCalledWith(PID)
    expectPenAt(PEN_HOME) // 누르기만 해서는 움직이지 않는다
    move(250, 300) // 캔버스 (500,600) − grab → (450,560)
    expectPenAt({ x: 450, y: 560 })
    expect(penImg()).toHaveStyle({ width: '50px', height: '40px' })
    expect(setSettings).not.toHaveBeenCalled() // 끌기 중에는 저장하지 않는다
    up(250, 300)
    expect(capture.release).toHaveBeenCalledTimes(1)
    expect(capture.release).toHaveBeenCalledWith(PID)
    expect(setSettings).toHaveBeenCalledTimes(1)
    const arg = vi.mocked(setSettings).mock.calls[0][0]
    expect(arg).toStrictEqual(moved)
    expect(arg.mouse?.partPos).toStrictEqual(PART_POS)
    fireEvent.click(preview(), { clientX: 250, clientY: 300 }) // 놓은 뒤 click(규칙 ③) — 무시
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    expect(onError).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
    expect(guide().textContent).toBe(G_IDLE)
    expect(buttonNames()).toEqual(IDLE_BUTTONS)
    expect(marker(600, 480)).toBeInTheDocument()
    expectPenAt(PEN_HOME) // settings://changed 전에는 props 값(§4 shownPenPos = penHome)
    rerender(<MousePartsTab settings={moved} manifest={PEN_HAND} onError={onError} />)
    expectPenAt({ x: 450, y: 560 })
    expectHandAt(PART_POS)
    expect(setSettings).toHaveBeenCalledTimes(1)
  })

  it('TC-083: 펜 손 끌기 위치는 펜 손 크기 기준으로 그림 전체가 캔버스 안 — 제한된 값으로 저장', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    setup({ manifest: PEN_HAND })
    down(200, 280) // grab (50,40)
    move(440, 345) // 캔버스 (880,690) → (830,650) → 제한 (800,620)
    expectPenAt({ x: 800, y: 620 })
    expect(penImg()).toHaveStyle({ left: '400px', top: '310px', width: '50px', height: '40px' })
    move(-50, -50) // 캔버스 (0,0) → (−50,−40) → 제한 (0,0)
    expectPenAt({ x: 0, y: 0 })
    move(500, 400) // 캔버스 (1000,800) 을 (900,700) 으로 고정 → (850,660) → 제한 (800,620)
    expectPenAt({ x: 800, y: 620 })
    up(500, 400)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(withPen({ x: 800, y: 620 }))
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
  })

  it('TC-084: 움직이지 않고 놓기·원위치·pointercancel 은 저장 없음 — penPos null 은 null 로 남아 다음 팔 파츠 저장 인자에도 null', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const { onError } = setup({ manifest: PEN_HAND })
    down(200, 280)
    up(200, 280) // ① 누르고 바로 놓음
    expect(capture.release).toHaveBeenCalledWith(PID)
    expectPenAt(PEN_HOME)
    down(200, 280)
    move(250, 300)
    expectPenAt({ x: 450, y: 560 })
    move(200, 280) // ② 원위치
    expectPenAt(PEN_HOME)
    up(200, 280)
    down(200, 280)
    move(250, 300)
    cancel() // ③ pointercancel → 옛 자리
    expectPenAt(PEN_HOME)
    up(250, 300) // 뒤이은 pointerup 무시
    expectPenAt(PEN_HOME)
    expect(capture.set).toHaveBeenCalledTimes(3)
    expect(setSettings).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    down(100, 150) // 이어서 팔 파츠를 끌어 저장 — penPos 는 null 그대로 실린다
    move(150, 175)
    up(150, 175)
    expect(setSettings).toHaveBeenCalledTimes(1)
    const arg = vi.mocked(setSettings).mock.calls[0][0]
    expect(arg).toStrictEqual(withPart({ x: 200, y: 250 }))
    expect(arg.mouse?.penPos).toBeNull()
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
  })

  // CR-040(v15 개정): 이 파일은 useAlphaMask 를 mock 하지 않는다 → jsdom 에서 이미지가 로드되지 않아 두 마스크 null
  //   → drag-hit §2.3 사각형 대체. 「겹치면 펜 손」은 마스크 없음(또는 둘 다 불투명)일 때의 규칙이다.
  //   픽셀 판정(펜 손 투명 자리 → 팔)은 test/DragHit.test.tsx TC-218 ~ TC-220.
  it('TC-085 (CR-040 개정): 마스크가 없으면(사각형 대체) 두 그림이 겹친 점은 위에 그려진 펜 손을 잡고, 펜 손을 끄는 동안 팔 파츠는 그대로 — 팔 파츠에만 든 점은 팔 파츠', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const s0 = withPen(PEN_OVER)
    setup({ settings: s0, manifest: PEN_HAND })
    expectPenAt(PEN_OVER)
    down(100, 150) // 캔버스 (200,300) — 두 사각형 모두 안 → 펜 손, grab (50,50)
    move(150, 175) // 캔버스 (300,350) → (250,300)
    expectPenAt({ x: 250, y: 300 })
    expectHandAt(PART_POS) // §4 shownPartPos = drag?.target === 'part' ? drag.pos : mouse.partPos
    up(150, 175)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(withPen({ x: 250, y: 300 }))
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
    down(60, 110) // 캔버스 (120,220) — 펜 손 밖·팔 파츠 안 → 팔 파츠, grab (20,20)
    move(110, 135) // 캔버스 (220,270) → (200,250)
    expectHandAt({ x: 200, y: 250 })
    expectPenAt(PEN_OVER) // 팔 파츠를 끄는 동안 펜 손은 저장된 자리
    up(110, 135)
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual({
      ...s0,
      mouse: { ...MOUSE, penPos: PEN_OVER, partPos: { x: 200, y: 250 } },
    })
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
  })

  it('TC-086: 어깨축 마법사·이동 영역 설정 중에는 펜 손 끌기가 시작되지 않고, 펜 손 위 클릭은 축·꼭짓점 지정으로만 처리된다', () => {
    setup({ manifest: PEN_HAND })
    fireEvent.click(btn('어깨축 설정하기'))
    down(200, 280) // pickShoulder — 펜 손 사각형 안
    move(250, 300)
    expectPenAt(PEN_HOME)
    up(250, 300)
    fireEvent.click(preview(), { clientX: 200, clientY: 280 }) // → 축 (400,560)
    expect(guide().textContent).toBe(G_REVIEW)
    expect(marker(400, 560)).toBeInTheDocument()
    down(200, 280) // review
    move(250, 300)
    expectPenAt(PEN_HOME)
    up(250, 300)
    fireEvent.click(btn('취소'))
    fireEvent.click(btn(AREA_START))
    down(200, 280) // pickArea
    move(250, 300)
    expectPenAt(PEN_HOME)
    up(250, 300)
    fireEvent.click(preview(), { clientX: 200, clientY: 280 }) // → 꼭짓점 1 = 캔버스 (400,560)
    expect(guide().textContent).toBe(G_AREA[1])
    expect(dots()).toEqual(['200,280'])
    for (let i = 1; i < 4; i++) clickArea(i)
    expect(guide().textContent).toBe(G_AREA_REVIEW)
    down(200, 280) // reviewArea
    move(250, 300)
    expectPenAt(PEN_HOME)
    up(250, 300)
    expectHandAt(PART_POS)
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-087: 저장 중(리셋 저장·펜 손 놓기 저장)에는 펜 손·팔 파츠 끌기가 시작되지 않는다', async () => {
    const d1 = deferred<Settings>()
    const d2 = deferred<Settings>()
    vi.mocked(setSettings).mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)
    setup({ manifest: PEN_HAND })
    fireEvent.click(btn('기본값으로 리셋'))
    down(200, 280)
    move(250, 300)
    expectPenAt(PEN_HOME)
    up(250, 300)
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).toHaveBeenCalledTimes(1) // 리셋 1회뿐
    await act(async () => {
      d1.resolve({ ...SETTINGS, mouse: DEFAULT_MOUSE_EXPECTED })
    })
    expect(btn('기본값으로 리셋')).toBeEnabled()
    down(200, 280)
    move(250, 300)
    up(250, 300) // 펜 손 놓기 저장 대기(penPos 450,560)
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual(withPen({ x: 450, y: 560 }))
    expect(btn('기본값으로 리셋')).toBeDisabled()
    down(200, 280)
    move(300, 300)
    expectPenAt(PEN_HOME)
    up(300, 300)
    down(100, 150) // 팔 파츠도 불가
    move(150, 175)
    expectHandAt(PART_POS)
    up(150, 175)
    expect(capture.set).toHaveBeenCalledTimes(1)
    expect(setSettings).toHaveBeenCalledTimes(2)
    await act(async () => {
      d2.resolve(withPen({ x: 450, y: 560 }))
    })
    expect(btn('기본값으로 리셋')).toBeEnabled()
  })

  it('TC-088: 펜 손 놓기 저장 실패 → onError(BridgeError), 펜 손·「손 위치」는 저장된 자리로 복귀, 다시 끌어 저장 가능', async () => {
    vi.mocked(setSettings).mockRejectedValueOnce(IO_ERR).mockImplementationOnce(async s => s)
    const { onError } = setup({ manifest: PEN_HAND })
    down(200, 280)
    move(250, 300)
    up(250, 300)
    await waitFor(() => expect(onError).toHaveBeenCalledWith(IO_ERR))
    expect(onError).toHaveBeenCalledTimes(1)
    expectPenAt(PEN_HOME)
    expectHandAt(PART_POS)
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
    down(200, 280)
    move(250, 300)
    up(250, 300)
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(withPen({ x: 450, y: 560 }))
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual(withPen({ x: 450, y: 560 }))
    await waitFor(() => expect(onError).toHaveBeenLastCalledWith(null))
  })

  it('TC-089 (CR-035·CR-038·CR-044 개정): 리셋은 penPos 를 (372,476)(DEFAULT_MOUSE_SETTINGS)으로 보내고(mouse 키 6개), 수신 뒤 펜 손은 그 자리(기본 위치 규칙 아님)', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const s0 = withPen({ x: 500, y: 100 })
    const { onError, rerender } = setup({ settings: s0, manifest: PEN_HAND })
    expectPenAt({ x: 500, y: 100 })
    fireEvent.click(btn('기본값으로 리셋'))
    expect(setSettings).toHaveBeenCalledTimes(1)
    const arg = vi.mocked(setSettings).mock.calls[0][0]
    expect(arg).toStrictEqual({ ...s0, mouse: RESET_EXPECTED }) // s0.mouse.penMode false 유지
    expect(arg.mouse?.penPos).toEqual(DEFAULT_PEN_POS) // 옛 기대 null 대체
    expect(Object.keys(arg.mouse ?? {}).sort()).toEqual(['area', 'hand', 'partPos', 'penMode', 'penPos', 'shoulder'])
    await waitFor(() => expect(onError).toHaveBeenCalledWith(null))
    expectPenAt({ x: 500, y: 100 }) // 수신 전 props 값
    rerender(
      <MousePartsTab settings={{ ...s0, mouse: DEFAULT_MOUSE_EXPECTED }} manifest={PEN_HAND} onError={onError} />,
    )
    expectPenAt(DEFAULT_PEN_POS) // 저장된 penPos 자리 — 옛 기본 위치 규칙 자리 PEN_DEFAULT_HOME (385,535)가 아니다
    expect(DEFAULT_PEN_POS).not.toEqual(PEN_DEFAULT_HOME)
    expect(setSettings).toHaveBeenCalledTimes(1)
  })

  it('TC-090 (CR-035·CR-038·CR-044 개정): settings.mouse 가 null 이면 기본값 penPos (372,476)에서 끌고, 저장은 객체 mouse(기본값 + 새 penPos, penMode true)', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const nullMouse: Settings = { ...SETTINGS, mouse: null }
    setup({ settings: nullMouse, manifest: PEN_HAND })
    expectPenAt(DEFAULT_PEN_POS)
    // CR-044 재계산: 펜 손 [372,472)×[476,556)(100×80)·팔 파츠 [411,611)×[464,614)(200×150) 둘 다 안인 점
    // 캔버스 (420,520) → 펜 손 우선, grab (48,44). 옛 누름 (400,560)은 펜 손 아래 경계(556) 밖이라 교체.
    // (CR-038: 펜 [356,456)×[504,584)·팔 [389,589)×[492,642), 누름 (400,560)·grab (44,56)·결과 (456,544))
    down(210, 260) // 캔버스 (420,520)
    move(260, 280) // 캔버스 (520,560) → (472,516) — 이동량 (+100,+40) 불변, 제한 범위 x∈[0,800]·y∈[0,620] 안
    expectPenAt({ x: 472, y: 516 })
    expectHandAt(DEFAULT_PART_POS) // 팔 파츠 불변 (411,464)
    up(260, 280)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual({
      ...nullMouse,
      mouse: { ...DEFAULT_MOUSE_EXPECTED, penPos: { x: 472, y: 516 } }, // penMode true(기본값) 포함
    })
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
  })

  it('TC-091: 펜 손은 장식(alt="", 역할 없음)·포인터 전용 — 끌기 중에도 역할 img 는 축 마커 하나, aria-live 는 안내 줄 하나', () => {
    const { container } = setup({ manifest: PEN_HAND })
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(penImg()).toHaveAttribute('alt', '')
    expect(penImg()).not.toHaveAttribute('tabindex')
    expect(preview()).toHaveAttribute('role', 'presentation')
    expect(preview()).not.toHaveAttribute('tabindex')
    down(200, 280)
    move(250, 300)
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1)
    expect(penDd()?.textContent).toBe('(450, 560)')
    cancel()
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-FLOW-07: S-8 — 펜 손을 팔 끝으로 끌어 놓고 「손 위치」로 확인한 뒤, 기본값으로 되돌린다', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    const { onError, rerender } = setup({ manifest: PEN_HAND })
    expectPenAt(PEN_HOME) // TC-080 부분
    down(200, 280) // TC-082 부분
    move(250, 300)
    expectPenAt({ x: 450, y: 560 })
    up(250, 300)
    const moved = withPen({ x: 450, y: 560 })
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(moved)
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
    rerender(<MousePartsTab settings={moved} manifest={PEN_HAND} onError={onError} />)
    expectPenAt({ x: 450, y: 560 })
    fireEvent.click(btn('기본값으로 리셋')) // TC-089 부분
    // CR-044: 리셋 인자 = RESET_EXPECTED(shoulder (582,484)·partPos (411,464)·penPos (372,476), MOUSE.penMode false 유지)
    expect(vi.mocked(setSettings).mock.calls[1][0]).toStrictEqual({ ...SETTINGS, mouse: RESET_EXPECTED })
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(2))
    rerender(
      <MousePartsTab settings={{ ...SETTINGS, mouse: RESET_EXPECTED }} manifest={PEN_HAND} onError={onError} />,
    )
    expectPenAt(DEFAULT_PEN_POS) // CR-044: 리셋 → (372,476) (CR-038 (356,504))
    expect(setSettings).toHaveBeenCalledTimes(2)
    expect(onError.mock.calls.every(c => c[0] === null)).toBe(true)
  })
})

// ─── 헤어(뒷머리) 미리보기 (R-34, CR-037) ───────────────────────────────────
// scenarios.md TC-198 · TC-199. 기준: design.md §4 `hairUrl`·§5.2 `findUrl`('hair')·렌더 3 헤어 행·§10 합성 순서.
// 결과 순서 = 헤어 → 팔(손 그림) → 바탕(body/kb_up) → 펜 손 → 영역 선 → 축 마커. 배경은 여전히 넣지 않는다.
// 헤어는 캔버스 전체 크기(.layer)이며 끌기·클릭 판정 대상이 아니다(pickDragTarget 은 좌표 기반).
const HAIR_IMG = entry('hair', 900, 700)
const HAIR_HAND: AssetManifest = { canvas: CANVAS, entries: [HAIR_IMG, BODY, PART] }
const HAIR_ALL: AssetManifest = {
  canvas: CANVAS,
  entries: [entry('background', 900, 700), HAIR_IMG, BODY, KB_UP, PART, PEN],
}
const hairImg = () => preview().querySelector<HTMLImageElement>('img[src="asset://hair.png"]')

describe('헤어(뒷머리) 미리보기 (R-34, CR-037)', () => {
  it('TC-198: hair 가 있으면 미리보기 맨 아래(첫 img, 팔 앞)에 바탕과 같은 .layer 로 그리고, 없으면 그리지 않는다', () => {
    const { rerender, onError } = setup({ manifest: PEN_HAND })
    expect(hairImg()).toBeNull() // 없으면 안내도 없음 — 기존 순서 그대로
    expect(srcs()).toEqual(['asset://mouse_base.png', 'asset://body.png', 'asset://pen_up.png'])
    rerender(<MousePartsTab settings={SETTINGS} manifest={HAIR_ALL} onError={onError} />) // assets://changed 흉내
    expect(srcs()).toEqual(['asset://hair.png', 'asset://mouse_base.png', 'asset://body.png', 'asset://pen_up.png'])
    const hair = hairImg()!
    const base = preview().querySelector<HTMLImageElement>('img[src="asset://body.png"]')!
    expect(preview().querySelector('img')).toBe(hair)
    expect(follows(hair, handImg()!)).toBe(true)
    expect(follows(handImg()!, base)).toBe(true)
    expect(follows(base, penImg()!)).toBe(true)
    expect(follows(penImg()!, outline()!)).toBe(true)
    expect(follows(outline()!, marker(600, 480))).toBe(true)
    expect(hair.className).toBe(base.className) // .layer(캔버스 전체) — 손 그림 .part 아님
    expect(hair.className).not.toBe(handImg()!.className)
    expect(hair.style.left).toBe('')
    expect(hair.style.top).toBe('')
    expect(hair.style.transform).toBe('')
    expect(hair).toHaveAttribute('alt', '')
    expect(hair).toHaveAttribute('draggable', 'false')
    expect(screen.getAllByRole('img')).toHaveLength(1) // 역할 img 는 축 마커 하나(헤어는 장식)
    expectHandAt(PART_POS)
    expectPenAt(PEN_HOME)
    rerender(<MousePartsTab settings={SETTINGS} manifest={PEN_HAND} onError={onError} />) // 비워진 수신
    expect(hairImg()).toBeNull()
    expect(srcs()).toEqual(['asset://mouse_base.png', 'asset://body.png', 'asset://pen_up.png'])
    expect(setSettings).not.toHaveBeenCalled()
  })

  it('TC-199: 헤어가 있어도 끌기 판정은 그대로 — 헤어만 있는 자리는 끌기 없음, 팔 파츠 사각형은 끌어 partPos 만 저장', async () => {
    vi.mocked(setSettings).mockImplementation(async s => s)
    setup({ manifest: HAIR_HAND })
    down(400, 50) // 캔버스 (800,100) — 헤어(캔버스 전체)만 있는 자리, 팔 파츠 사각형 [100,300)×[200,350) 밖, 펜 손 없음
    move(420, 60)
    up(420, 60)
    expect(capture.set).not.toHaveBeenCalled()
    expect(setSettings).not.toHaveBeenCalled()
    expectHandAt(PART_POS)
    down(60, 110) // 캔버스 (120,220) — 팔 파츠 사각형 안, grab (20,20)
    expect(capture.set).toHaveBeenCalledWith(PID)
    move(110, 160) // 캔버스 (220,320) → partPos (200,300)
    expectHandAt({ x: 200, y: 300 })
    up(110, 160)
    expect(setSettings).toHaveBeenCalledTimes(1)
    expect(vi.mocked(setSettings).mock.calls[0][0]).toStrictEqual(withPart({ x: 200, y: 300 }))
    await waitFor(() => expect(btn('기본값으로 리셋')).toBeEnabled())
    expect(srcs()[0]).toBe('asset://hair.png') // 헤어는 움직이지 않고 맨 아래 그대로
    expect(hairImg()!.style.left).toBe('')
  })
})

// ─── 이동 영역 설명 줄 (R-15·R-16, CR-057) ─────────────────────────────────
// scenarios.md TC-305. 기준: CR-057(🔒 사용자 확정 ko 문구) — 새 키 areaDesc 를 idle 에서만 안내 줄(role=status)
// 바로 아래 형제 <p>(같은 .guide 클래스, role·aria-live 없음)로 그린다. 다른 단계(pickShoulder·review·pickArea·reviewArea)는 없음.
// ko 는 확정 문구 리터럴, ja·en 은 CR-057 반영 사전 값 리터럴(검수는 manual-checklist). 단계 이동 버튼 이름만 사전에서 읽는다.
const AREA_TEXT = {
  ko: {
    idle: G_IDLE,
    desc: AREA_DESC_KO,
    start: AREA_START,
    pick1: '1/4 사각형의 왼쪽 위 꼭짓점을 클릭해주세요.',
    review: '사각형이 맞는지 확인하고 저장하세요.',
  },
  ja: {
    idle: '肩の軸を設定すると、腕パーツがその点を軸に回転します。',
    desc:
      'マウスを動かすと、手がこの四角形の中でついて動きます。絵の上で4つの角を順番にクリックして四角形を作ってください。',
    start: '四角形の移動範囲を設定',
    pick1: '1/4 四角形の左上の角をクリックしてください。',
    review: '四角形が合っているか確認して保存してください。',
  },
  en: {
    idle: 'Set the shoulder pivot and the arm part rotates around that point.',
    desc:
      'As you move the mouse, the hand follows it inside this rectangle. Click the four corners on the picture in order to make the rectangle.',
    start: 'Set rectangular movement area',
    pick1: '1/4 Click the top-left corner of the rectangle.',
    review: 'Check that the rectangle looks right, then save.',
  },
} as const
const DICTS = { ko, ja, en } as const

describe('이동 영역 설명 줄 (R-15·R-16, CR-057)', () => {
  it.each(['ko', 'ja', 'en'] as const)(
    'TC-305(%s): areaDesc 설명 줄은 idle 에서만 안내 줄 바로 아래(같은 .guide·role 없음)에 보이고, pickArea·reviewArea·pickShoulder·review 에서는 없다 — 안내 줄(role=status)은 그대로 하나',
    lang => {
      const T = AREA_TEXT[lang]
      const d = DICTS[lang]
      const tab = <MousePartsTab settings={SETTINGS} manifest={HAND} onError={vi.fn()} />
      const wrapped = <MessagesProvider language={lang}>{tab}</MessagesProvider>
      const { container } = render(lang === 'ko' ? tab : wrapped) // ko 는 Provider 밖 기본값
      const descEl = () => screen.queryByText(T.desc)
      const expectOneLiveRegion = () => {
        expect(screen.getAllByRole('status')).toHaveLength(1)
        expect(container.querySelectorAll('[aria-live]')).toHaveLength(1)
      }
      const expectIdleDesc = () => {
        const status = guide()
        const desc = descEl()
        expect(status.textContent).toBe(T.idle) // ⓐ 안내 줄 문구 불변(wizardIdle)
        expect(status.textContent).not.toContain(T.desc) // 설명은 알림 영역 밖
        expect(desc).not.toBeNull()
        expect(desc!.tagName).toBe('P')
        expect(desc!.textContent).toBe(T.desc) // 3개 국어 정확 일치
        expect(desc).not.toHaveAttribute('role')
        expect(desc).not.toHaveAttribute('aria-live')
        expect(desc!.previousElementSibling).toBe(status) // 안내 줄 바로 아래 형제
        expect(desc!.className).toBe(status.className) // 같은 .guide
        // 버튼보다 앞(위). 버튼은 3개 그대로 — 새 <p> 는 버튼이 아니다
        const following = desc!.compareDocumentPosition(btn(T.start))
        expect(following & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(buttonNames()).toEqual([d.wizardStart, T.start, d.resetDefault])
        expectOneLiveRegion()
      }

      expectIdleDesc() // ① idle
      fireEvent.click(btn(T.start)) // ② pickArea(점 0개)
      expect(guide().textContent).toBe(T.pick1)
      expect(descEl()).toBeNull()
      expectOneLiveRegion()
      clickArea(0) // pickArea(점 1개)
      expect(descEl()).toBeNull()
      for (let i = 1; i < 4; i++) clickArea(i) // ③ reviewArea
      expect(guide().textContent).toBe(T.review)
      expect(descEl()).toBeNull()
      expectOneLiveRegion()
      fireEvent.click(btn(d.wizardCancel)) // → idle 복귀
      expectIdleDesc()
      fireEvent.click(btn(d.wizardStart)) // ④ pickShoulder
      expect(guide().textContent).toBe(d.wizardPickShoulder)
      expect(descEl()).toBeNull()
      fireEvent.click(preview(), { clientX: 150, clientY: 100 }) // ⑤ review(축)
      expect(guide().textContent).toBe(d.wizardReview)
      expect(descEl()).toBeNull()
      expectOneLiveRegion()
      fireEvent.click(btn(d.wizardCancel)) // → idle 복귀
      expectIdleDesc()
      // ⓑ 문구만 바뀐 변경 — 저장 없음 · ⓒ bridge 쓰기 호출 0회
      expect(setSettings).not.toHaveBeenCalled()
      expect(setAutostart).not.toHaveBeenCalled()
    },
  )
})
