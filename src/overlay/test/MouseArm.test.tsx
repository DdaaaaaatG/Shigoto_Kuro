/**
 * 마우스 파츠 TC — design/components.md §3 MouseArm(props monitors·anchor·atRest — CR-022로 bounce prop 삭제),
 * design/functions.md §5.4 (이미지 선택·MouseArm 렌더(한 모드) 1~6단계·.armWrap 컨테이너 1~6·삭제 목록).
 * CR-007·008(기준점)·009(쉬는 위치)·011(래퍼)·015(한 모드)·017(커서가 있는 모니터 기준 쌍선형 목표점,
 * 회전 + 팔 방향 늘어나기 0.5~1.6, prop bounds → monitors, mouse.pad → mouse.area)·022(젤리 — 팔 출렁임은
 * 바깥 .jellyWrap 소관, .armWrap은 애니메이션 없는 컨테이너. bounce prop을 넘기지 않는다).
 * 계약(MouseSettings.area)·구현 전에는 CR-017 TC가 실패한다(scenarios.md §0.3). CR-022 적용 전에는 bounce가
 * 필수 prop이라 이 파일이 yarn tsc --noEmit 타입 오류를 낸다(scenarios.md v0.9 CR-022 red).
 * 시나리오: src/overlay/test/scenarios.md TC-037 ~ TC-040, TC-043, TC-044, TC-046, TC-098, TC-103 ~ TC-108, TC-119, TC-121, TC-125
 * (TC-036·TC-041·TC-042는 CR-015, TC-045는 CR-022로 폐기)
 *
 * 변형 참조(scenarios.md §0.2): 어깨 (620,530) · 기준점 (520,530) · 영역 AREA(중심 520,530, 200×200) · 모니터 1920×1080
 *   커서 (960,1080) → 목표 (520,630) → DOWN, (960,0) → (520,430) → UP, (960,540) → (520,530) → CENTER
 */
import { render } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  slotKey,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type MouseSettings,
} from 'bridge/types'
import * as mapping from 'state/mouseMapping'
import * as armModule from '../components/MouseArm'
import MouseArm from '../components/MouseArm'

vi.mock('bridge/events', () => ({}))
vi.mock('bridge/commands', () => ({}))
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

const CANVAS = { width: 900, height: 700 }
const entry = (slot: AssetSlot, width = 900, height = 700): AssetEntry => ({
  slot,
  fileName: `${slotKey(slot)}.png`,
  width,
  height,
  bytes: 1,
  url: `u:${slotKey(slot)}`,
})
const parts = (w: number, h: number, slots = ['mouse_base', 'mouse_left', 'mouse_right']) =>
  slots.map(s => entry(s as AssetSlot, w, h))
/** 전체 크기 그림(900×700) — partPos (0,0)과 함께 쓰면 이전 레이어 이동 모드와 같은 화면 */
const LAYER: AssetManifest = { canvas: CANVAS, entries: [entry('body'), ...parts(900, 700)] }
/** CR-015 작은 손 그림 — 설계 예시 mouse_pen_hand.png 202×154 */
const SMALL: AssetManifest = { canvas: CANVAS, entries: [entry('body'), ...parts(202, 154)] }

const SHOULDER = { x: 620, y: 530 }
/** 🔒 기본 partPos (design.md §10.4) */
const DEFAULT_PART = { x: 389, y: 492 }
/** 테스트 영역: 중심 (520,530)의 200×200 직사각형(옛 패드 200×200 + 기준점 520,530과 같은 목표점) */
const AREA: MouseSettings['area'] = [
  { x: 420, y: 430 },
  { x: 620, y: 430 },
  { x: 620, y: 630 },
  { x: 420, y: 630 },
]
const mouse = (over: Partial<MouseSettings> = {}): MouseSettings => ({
  shoulder: SHOULDER,
  area: AREA,
  hand: null,
  partPos: { x: 0, y: 0 },
  penPos: null, // bridge v0.13(CR-024) 필드 추가 — 픽스처 갱신
  penMode: false, // contract v0.15(CR-033) 기본값
  ...over,
})
const MON = { x: 0, y: 0, width: 1920, height: 1080 }
/** 두 모니터: 위 WQHD, 아래 1080p(design/functions.md §5.4 예) */
const MON_A = { x: 0, y: 0, width: 2560, height: 1440 }
const MON_B = { x: 320, y: 1440, width: 1920, height: 1080 }

const REST = 'rotate(0deg) scaleX(1) rotate(0deg)'
const DOWN = 'rotate(135deg) scaleX(1.414) rotate(-180deg)'
const UP = 'rotate(-135deg) scaleX(1.414) rotate(-180deg)'
const CENTER = 'rotate(180deg) scaleX(1) rotate(-180deg)'
/** 기준점 (620,430)(θh = −90)에서 목표 (520,430) */
const UP_ALT = 'rotate(-135deg) scaleX(1.414) rotate(90deg)'

type Props = ComponentProps<typeof MouseArm>
/** CR-022: bounce prop 없음 */
const base = (): Props =>
  ({
    manifest: LAYER,
    mouse: mouse(),
    monitors: [MON],
    cursor: { x: 960, y: 540 },
    button: 'none',
    anchor: { x: 520, y: 530 },
    atRest: false,
  }) as Props
const renderArm = (over: Partial<Props> = {}) => render(<MouseArm {...base()} {...over} />)
const wrap = (c: HTMLElement) => c.firstElementChild as HTMLElement
const armImg = (c: HTMLElement) => c.querySelector('.armWrap img') as HTMLImageElement
const tf = (over: Partial<Props>) => {
  const r = renderArm(over)
  const v = armImg(r.container).style.transform
  r.unmount()
  return v
}
/** 인라인 배치(px 숫자) — React가 숫자 0을 '0'으로, 그 외를 'Npx'로 넣어도 같은 값으로 비교한다 */
const box = (img: HTMLImageElement) => ({
  left: parseFloat(img.style.left),
  top: parseFloat(img.style.top),
  width: parseFloat(img.style.width),
  height: parseFloat(img.style.height),
})
/** 작은 그림 + 기본 partPos */
const small = (): Partial<Props> => ({ manifest: SMALL, mouse: mouse({ partPos: DEFAULT_PART }) })

describe('커서 추종 (한 모드, 전체 크기 그림 + partPos 0,0)', () => {
  it('TC-037: img.hand — 어깨 원점(620px 530px)에서 회전 + 늘어나기, 목표 = 영역 쌍선형 보간', () => {
    const down = renderArm({ cursor: { x: 960, y: 1080 } })
    const img = armImg(down.container)
    expect(img.getAttribute('src')).toBe('u:mouse_base')
    expect(img.className).toBe('hand')
    expect(img.style.transformOrigin).toBe('620px 530px')
    expect(img.style.transform).toBe(DOWN)
    down.unmount()
    expect(tf({ cursor: { x: 960, y: 0 } })).toBe(UP)
  })

  it('TC-038: 기준점 폴백 — anchor 우선, null이면 mouse.hand, 둘 다 없으면 이동 영역 중심', () => {
    expect(tf({ anchor: { x: 620, y: 430 }, mouse: mouse({ hand: { x: 520, y: 530 } }), cursor: { x: 960, y: 0 } })).toBe(
      UP_ALT,
    )
    expect(tf({ anchor: null, mouse: mouse({ hand: { x: 520, y: 530 } }), cursor: { x: 960, y: 1080 } })).toBe(DOWN)
    expect(tf({ anchor: null, mouse: mouse({ hand: null }), cursor: { x: 960, y: 1080 } })).toBe(DOWN)
  })

  it('TC-039: 클릭 이미지 — left/right는 해당 이미지, 없으면 mouse_base, 변형은 같은 기준점', () => {
    const cursor = { x: 960, y: 1080 }
    const left = renderArm({ button: 'left', cursor })
    expect(armImg(left.container).getAttribute('src')).toBe('u:mouse_left')
    expect(armImg(left.container).style.transform).toBe(DOWN)
    left.unmount()
    const right = renderArm({ button: 'right', cursor })
    expect(armImg(right.container).getAttribute('src')).toBe('u:mouse_right')
    expect(armImg(right.container).style.transform).toBe(DOWN)
    right.unmount()
    const noLeft: AssetManifest = {
      canvas: CANVAS,
      entries: [entry('body'), ...parts(900, 700, ['mouse_base', 'mouse_right'])],
    }
    const fallback = renderArm({ manifest: noLeft, button: 'left', cursor })
    expect(armImg(fallback.container).getAttribute('src')).toBe('u:mouse_base')
  })

  it('TC-040: atRest이면 커서·기준점과 무관하게 REST_TRANSFORM 문자열, 원점은 어깨 그대로', () => {
    const r = renderArm({ atRest: true, cursor: { x: 960, y: 1080 } })
    expect(armImg(r.container).style.transform).toBe(REST)
    expect(armImg(r.container).style.transformOrigin).toBe('620px 530px')
    r.unmount()
    expect(tf({ atRest: true, anchor: null, cursor: { x: 0, y: 0 } })).toBe(REST)
  })
})

describe('이미지 없음·.armWrap 컨테이너 (CR-022: 애니메이션 없음 — 젤리는 바깥 .jellyWrap)', () => {
  it('TC-043: 마우스 파츠 이미지가 하나도 없으면 래퍼째 그리지 않는다', () => {
    const none: AssetManifest = { canvas: CANVAS, entries: [entry('body')] }
    expect(renderArm({ manifest: none }).container.innerHTML).toBe('')
    expect(renderArm({ manifest: none, button: 'left' }).container.innerHTML).toBe('')
  })

  it('TC-044: 최상위 래퍼 div class는 정확히 "armWrap"(애니메이션 클래스 없음), 변형은 안쪽 img.hand에만', () => {
    const r = renderArm({ cursor: { x: 960, y: 1080 } })
    const w = wrap(r.container)
    expect(w.tagName).toBe('DIV')
    expect(w.className).toBe('armWrap')
    expect(w.hasAttribute('style')).toBe(false)
    expect(w.children).toHaveLength(1)
    expect(armImg(r.container).style.transform).toBe(DOWN)
    expect(armImg(r.container).className).toBe('hand')
  })

  it('TC-046: 래퍼 클래스는 atRest·button·그림 크기와 무관하게 armWrap — 작은 그림도 래퍼 안 img 하나(svg 없음)', () => {
    const rest = renderArm({ atRest: true })
    expect(wrap(rest.container).className).toBe('armWrap')
    expect(armImg(rest.container).style.transform).toBe(REST)
    rest.unmount()
    const click = renderArm({ button: 'right' })
    expect(wrap(click.container).className).toBe('armWrap')
    expect(armImg(click.container).getAttribute('src')).toBe('u:mouse_right')
    click.unmount()
    const s = renderArm({ ...small() })
    const w = wrap(s.container)
    expect(w.className).toBe('armWrap')
    expect(Array.from(w.children).map(el => el.tagName.toLowerCase())).toEqual(['img'])
    expect(armImg(s.container).className).toBe('hand')
    expect(box(armImg(s.container)).left).toBe(389)
  })
})

describe('설정값 반영 — 기본값과 다른 어깨·partPos·영역 (R-18, R-20)', () => {
  it('TC-098: 좌상단 = 설정 partPos, 원점 = 설정 어깨 − 설정 partPos(음수·그림 밖 허용), 목표 = 설정 영역', () => {
    const a = renderArm({
      manifest: SMALL,
      mouse: mouse({
        shoulder: { x: 300, y: 200 },
        partPos: { x: 150, y: 80 },
        area: [
          { x: 100, y: 200 },
          { x: 300, y: 200 },
          { x: 300, y: 400 },
          { x: 100, y: 400 },
        ],
      }),
      anchor: { x: 200, y: 200 },
      cursor: { x: 960, y: 540 },
    })
    const img = armImg(a.container)
    expect(box(img)).toEqual({ left: 150, top: 80, width: 202, height: 154 })
    expect(img.style.transformOrigin).toBe('150px 120px')
    expect(img.style.transform).toBe('rotate(135deg) scaleX(1.414) rotate(-180deg)') // 목표 (200,300)
    a.unmount()
    const b = renderArm({
      manifest: SMALL,
      mouse: mouse({ shoulder: { x: 100, y: 50 }, partPos: DEFAULT_PART }),
      atRest: true,
    })
    expect(armImg(b.container).style.transformOrigin).toBe('-289px -442px')
    expect(armImg(b.container).style.transform).toBe(REST)
  })
})

describe('한 모드 — 작은 손 그림 배치 (CR-015, R-18)', () => {
  it('TC-103: 좌상단 = partPos(389,492), 크기 = 매니페스트 202×154, transformOrigin = 어깨 − partPos(231px 38px)', () => {
    const { container } = renderArm({ ...small(), cursor: { x: 960, y: 1080 } })
    const img = armImg(container)
    expect(img.getAttribute('src')).toBe('u:mouse_base')
    expect(img.className).toBe('hand')
    expect(box(img)).toEqual({ left: 389, top: 492, width: 202, height: 154 })
    expect(img.style.transformOrigin).toBe('231px 38px')
    expect(img.style.transform).toBe(DOWN)
    expect(img.getAttribute('alt')).toBe('')
    expect(img.getAttribute('draggable')).toBe('false')
  })

  it('TC-104: 기준점은 bridge 값(캔버스 좌표) 그대로 — partPos를 더하지 않는다(hand·영역 중심 폴백도 그대로)', () => {
    expect(tf({ ...small(), anchor: { x: 520, y: 530 }, cursor: { x: 960, y: 0 } })).toBe(UP)
    expect(
      tf({
        manifest: SMALL,
        mouse: mouse({ partPos: DEFAULT_PART, hand: { x: 520, y: 530 } }),
        anchor: null,
        cursor: { x: 960, y: 1080 },
      }),
    ).toBe(DOWN)
    expect(tf({ ...small(), anchor: null, cursor: { x: 960, y: 1080 } })).toBe(DOWN)
  })

  it('TC-105: 쉬는 위치 = partPos에 REST_TRANSFORM(작은 그림), 래퍼는 같은 노드·class armWrap·애니메이션 없음', () => {
    const props = { ...base(), ...small(), atRest: true, cursor: { x: 1920, y: 1080 } } as Props
    const { container, rerender } = render(<MouseArm {...props} />)
    const w = wrap(container)
    const check = () => {
      expect(wrap(container)).toBe(w)
      expect(w.className).toBe('armWrap')
      expect(w.hasAttribute('style')).toBe(false)
      expect(w.children).toHaveLength(1)
      const img = armImg(container)
      expect(img.className).toBe('hand')
      expect(img.style.transform).toBe(REST)
      expect(box(img)).toEqual({ left: 389, top: 492, width: 202, height: 154 })
      expect(img.style.transformOrigin).toBe('231px 38px')
    }
    check()
    rerender(<MouseArm {...props} />)
    check()
  })

  it('TC-106: 전체 크기 그림(900×700) + partPos (0,0) = 이전 레이어 이동 모드와 같은 배치·원점', () => {
    const { container } = renderArm({ cursor: { x: 960, y: 1080 } })
    const img = armImg(container)
    expect(box(img)).toEqual({ left: 0, top: 0, width: 900, height: 700 })
    expect(img.style.transformOrigin).toBe('620px 530px')
    expect(img.style.transform).toBe(DOWN)
  })

  it('TC-107: 클릭 이미지도 같은 partPos·같은 크기·같은 원점·같은 변형, 없으면 mouse_base 항목', () => {
    const cursor = { x: 960, y: 1080 }
    const cases = [
      ['left', 'u:mouse_left'],
      ['right', 'u:mouse_right'],
    ] as const
    for (const [button, src] of cases) {
      const r = renderArm({ ...small(), button, cursor })
      const img = armImg(r.container)
      expect(img.getAttribute('src')).toBe(src)
      expect(box(img)).toEqual({ left: 389, top: 492, width: 202, height: 154 })
      expect(img.style.transformOrigin).toBe('231px 38px')
      expect(img.style.transform).toBe(DOWN)
      r.unmount()
    }
    const noLeft: AssetManifest = {
      canvas: CANVAS,
      entries: [entry('body'), ...parts(202, 154, ['mouse_base', 'mouse_right'])],
    }
    const fb = renderArm({ ...small(), manifest: noLeft, button: 'left', cursor })
    expect(armImg(fb.container).getAttribute('src')).toBe('u:mouse_base')
    expect(box(armImg(fb.container))).toEqual({ left: 389, top: 492, width: 202, height: 154 })
  })
})

describe('삭제 확인 (CR-015 — 손바닥 모드·팔 곡선)', () => {
  it('TC-108: isMouseLayerMode·mapToPad·armControlPoint·armPath·restPosition export 없음, 어떤 그림 크기에도 svg·path 없음', () => {
    expect('isMouseLayerMode' in armModule).toBe(false)
    for (const name of ['mapToPad', 'armControlPoint', 'armPath', 'restPosition']) {
      expect(name in mapping).toBe(false)
    }
    const OLD_PALM: AssetManifest = { canvas: CANVAS, entries: [entry('body'), ...parts(200, 100)] }
    for (const manifest of [LAYER, SMALL, OLD_PALM]) {
      const r = renderArm({ manifest, mouse: mouse({ partPos: DEFAULT_PART }) })
      expect(r.container.querySelector('svg, path')).toBeNull()
      expect(r.container.querySelectorAll('img')).toHaveLength(1)
      expect(wrap(r.container).children).toHaveLength(1)
      r.unmount()
    }
  })
})

describe('커서가 있는 모니터 기준 목표점 (CR-017, R-20·R-21)', () => {
  it('TC-119: 두 모니터(위 2560×1440·아래 1920×1080) — 커서가 든 모니터 안 비율로 영역 보간, 밖이면 가장 가까운 모니터', () => {
    const two = { monitors: [MON_A, MON_B] }
    expect(tf({ ...two, cursor: { x: 1280, y: 1980 } })).toBe(CENTER) // 아래 모니터 중앙 → 목표 (520,530)
    expect(tf({ ...two, cursor: { x: 1280, y: 720 } })).toBe(CENTER) // 위 모니터 중앙 → 같은 목표
    expect(tf({ ...two, cursor: { x: 1280, y: 2520 } })).toBe(DOWN) // 아래 모니터 아래 끝(밖, 거리 0) → v = 1
    expect(tf({ ...two, cursor: { x: 1280, y: 0 } })).toBe(UP) // 위 모니터 위 끝 → v = 0
    // 아래 모니터 왼쪽 위 → 목표 = q0 (420,430): θt = −153.43, 배율 2.236 → 상한 1.6
    expect(tf({ ...two, cursor: { x: 320, y: 1440 } })).toBe('rotate(-153.43deg) scaleX(1.6) rotate(-180deg)')
    // 두 모니터 밖(100,1980) → 가장 가까운 아래 모니터, u = 0·v = 0.5 → 목표 (420,530), 배율 2 → 1.6
    expect(tf({ ...two, cursor: { x: 100, y: 1980 } })).toBe('rotate(180deg) scaleX(1.6) rotate(-180deg)')
  })

  it('TC-121: 고를 모니터가 없으면(pickMonitor null) 쉬는 위치와 같은 REST_TRANSFORM — 그림은 partPos 그대로', () => {
    const empty = renderArm({ monitors: [], cursor: { x: 960, y: 1080 } })
    const img = armImg(empty.container)
    expect(img.getAttribute('src')).toBe('u:mouse_base')
    expect(img.style.transform).toBe(REST)
    expect(img.style.transformOrigin).toBe('620px 530px')
    empty.unmount()
    expect(tf({ monitors: [{ x: 0, y: 0, width: 0, height: 0 }], cursor: { x: 960, y: 1080 } })).toBe(REST)
    expect(tf({ cursor: { x: Number.NaN, y: 1080 } })).toBe(REST)
  })

  it('TC-125: 렌더 결과의 배율 상·하한(0.5/1.6)·목표 = 어깨·|A−S|≈0·설계 예 문자열', () => {
    // 커서 오른쪽 끝 → 목표 (620,530) = 어깨 → 방향 유지, 하한 0.5
    expect(tf({ cursor: { x: 1920, y: 540 } })).toBe('rotate(180deg) scaleX(0.5) rotate(-180deg)')
    // 커서 왼쪽 끝 → 목표 (420,530), 배율 2 → 상한 1.6
    expect(tf({ cursor: { x: 0, y: 540 } })).toBe('rotate(180deg) scaleX(1.6) rotate(-180deg)')
    // 기준점 = 어깨(|A−S| = 0) → 변형 없음
    expect(tf({ anchor: SHOULDER, cursor: { x: 960, y: 1080 } })).toBe(REST)
    // 설계 예(design/functions.md §5.4 6단계): 목표 (520,410)
    const area410: MouseSettings['area'] = [
      { x: 420, y: 410 },
      { x: 620, y: 410 },
      { x: 620, y: 610 },
      { x: 420, y: 610 },
    ]
    expect(tf({ mouse: mouse({ area: area410 }), cursor: { x: 960, y: 0 } })).toBe(
      'rotate(-129.81deg) scaleX(1.562) rotate(-180deg)',
    )
  })
})
