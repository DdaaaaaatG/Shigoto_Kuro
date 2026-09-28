/**
 * 마우스 파츠 좌표 계산 (순수 함수) — doc/000_프로젝트_확정사항.md §4 마우스 파츠,
 * CR-015(한 모드) · CR-017(이동 영역·팔 늘어나기, R-20·R-21) · CR-025(펜 쥔 손 파츠, R-25).
 *
 * - pickMonitor: 커서를 포함하는 모니터(없으면 가장 가까운 모니터)를 고른다
 * - cursorUv: 모니터 안에서 커서의 상대 위치 (u, v) ∈ [0, 1]
 * - bilerpQuad: 자유 사각형 네 꼭짓점을 (u, v)로 쌍선형 보간한 점
 * - armTransform: 어깨를 축으로 회전 + 팔 방향 늘어나기/줄어들기(0.5~1.6배)
 * - armTransformCss: armTransform 결과를 CSS transform 문자열로
 * - resolvePivot: 회전 기준점 폴백(anchor → mouse.hand → 이동 영역 중심)
 * - armTransformFor: 위 다섯 함수를 묶어 MouseArm·PenHand가 같은 입력으로 같은 팔 변형을 얻게 한다(CR-025)
 * - defaultPenPos / resolvePenPos: 펜 쥔 손 그림의 자리(penPos === null일 때 기본 위치 규칙, CR-025)
 * - penTransform / penTransformCss: 팔 끝을 따라가는 손의 이동·회전(스케일 없음, CR-025)
 *
 * 삭제(CR-015 — 손바닥 모드·팔 곡선 폐기): mapToPad, armControlPoint, armPath, restPosition.
 * 삭제(CR-017 — 회전만 → 회전+늘어나기, 패드 → 자유 사각형 영역): armRotationDeg, mapAroundPivot.
 */
import type { MouseSettings, Point, ScreenBounds } from 'bridge/types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/** 비유한 값은 중앙(0.5)으로 고정 */
const clampUnit = (v: number) => (Number.isFinite(v) ? clamp01(v) : 0.5)

/** 손이 움직이는 자유 사각형 이동 영역의 네 꼭짓점(왼쪽 위 · 오른쪽 위 · 오른쪽 아래 · 왼쪽 아래, 캔버스 좌표) */
export type Quad = MouseSettings['area']

/** 어깨 축 회전각(θh, 도) · 목표 방향각(θt, 도) · 팔 방향 늘어나기 배율(k) */
export interface ArmTransform {
  baseDeg: number
  targetDeg: number
  stretch: number
}

/** 🔒 사용자 지정 — 설정값 아님(settings에 필드 없음) */
export const STRETCH_MIN = 0.5
export const STRETCH_MAX = 1.6
/** 어깨-기준점 길이 0 판정 */
export const ARM_EPS = 1e-6
/** 쉬는 위치(R-11·R-15·R-21) = 변형 없음 */
export const REST_TRANSFORM: ArmTransform = { baseDeg: 0, targetDeg: 0, stretch: 1 }

/**
 * 커서를 포함하는 모니터를 고른다(반열린 구간). 없으면 가장 가까운 모니터(같으면 목록에서 앞선 것).
 * 유효 모니터는 width>0 && height>0인 것만. 비유한 좌표는 null(CR-017, R-20).
 */
export const pickMonitor = (cursor: Point, monitors: readonly ScreenBounds[]): ScreenBounds | null => {
  if (!Number.isFinite(cursor.x) || !Number.isFinite(cursor.y)) return null
  const valid = monitors.filter(m => m.width > 0 && m.height > 0)
  if (valid.length === 0) return null

  const contained = valid.find(
    m => m.x <= cursor.x && cursor.x < m.x + m.width && m.y <= cursor.y && cursor.y < m.y + m.height,
  )
  if (contained) return contained

  let nearest = valid[0]
  let best = Number.POSITIVE_INFINITY
  for (const m of valid) {
    const dx = Math.max(m.x - cursor.x, 0, cursor.x - (m.x + m.width))
    const dy = Math.max(m.y - cursor.y, 0, cursor.y - (m.y + m.height))
    const dist = dx * dx + dy * dy
    if (dist < best) {
      best = dist
      nearest = m
    }
  }
  return nearest
}

/** 모니터 안에서 커서의 상대 위치 (u, v) ∈ [0, 1](CR-017, R-20). */
export const cursorUv = (cursor: Point, monitor: ScreenBounds): { u: number; v: number } => {
  if (monitor.width <= 0 || monitor.height <= 0) return { u: 0.5, v: 0.5 }
  return {
    u: clamp01((cursor.x - monitor.x) / monitor.width),
    v: clamp01((cursor.y - monitor.y) / monitor.height),
  }
}

/**
 * 자유 사각형 네 꼭짓점을 (u, v)로 쌍선형 보간한 점(CR-017, R-20·R-21).
 * `quad` 순서 = 왼쪽 위·오른쪽 위·오른쪽 아래·왼쪽 아래. 비유한 u·v는 0.5로 고정. 반올림 없음.
 */
export const bilerpQuad = (quad: Quad, u: number, v: number): Point => {
  const uu = clampUnit(u)
  const vv = clampUnit(v)
  const [q0, q1, q2, q3] = quad
  const w0 = (1 - uu) * (1 - vv)
  const w1 = uu * (1 - vv)
  const w2 = uu * vv
  const w3 = (1 - uu) * vv
  return {
    x: w0 * q0.x + w1 * q1.x + w2 * q2.x + w3 * q3.x,
    y: w0 * q0.y + w1 * q1.y + w2 * q2.y + w3 * q3.y,
  }
}

const isFinitePoint = (p: Point) => Number.isFinite(p.x) && Number.isFinite(p.y)

/**
 * 어깨(S)를 축으로, 손 기준점(A)이 목표(T) 방향을 향하도록 회전 + 팔 방향 늘어나기(CR-017, R-21).
 * |A−S| ≈ 0(< ARM_EPS)이거나 비유한 입력이면 REST_TRANSFORM(변형 없음). 목표가 어깨와 겹치면 방향은 유지.
 */
export const armTransform = (shoulder: Point, hand: Point, target: Point): ArmTransform => {
  if (!isFinitePoint(shoulder) || !isFinitePoint(hand) || !isFinitePoint(target)) return REST_TRANSFORM

  const h = { x: hand.x - shoulder.x, y: hand.y - shoulder.y }
  const armLength = Math.hypot(h.x, h.y)
  if (armLength < ARM_EPS) return REST_TRANSFORM

  const t = { x: target.x - shoulder.x, y: target.y - shoulder.y }
  const targetDistance = Math.hypot(t.x, t.y)
  const baseDeg = (Math.atan2(h.y, h.x) * 180) / Math.PI
  const targetDeg = targetDistance < ARM_EPS ? baseDeg : (Math.atan2(t.y, t.x) * 180) / Math.PI
  const stretch = Math.min(STRETCH_MAX, Math.max(STRETCH_MIN, targetDistance / armLength))

  return {
    baseDeg: Number(baseDeg.toFixed(2)),
    targetDeg: Number(targetDeg.toFixed(2)),
    stretch: Number(stretch.toFixed(3)),
  }
}

/**
 * `armTransform` 결과를 CSS transform 문자열로. 원점(`transform-origin`)이 어깨일 때 CSS는 오른쪽부터
 * 적용되므로 ① 팔을 눕히고(−θh) ② 팔 방향으로 k배 늘린 뒤 ③ 목표 방향(θt)으로 세운다.
 */
export const armTransformCss = (t: ArmTransform): string =>
  `rotate(${t.targetDeg}deg) scaleX(${t.stretch}) rotate(${-t.baseDeg}deg)`

/**
 * 회전 기준점 폴백: bridge 기준점(anchor) → mouse.hand → 이동 영역 중심(CR-007·008·017, R-21).
 * ui는 기준점을 계산하지 않는다 — anchor 는 core가 계산해 bridge 로 넘긴 값을 그대로 받는다.
 */
export const resolvePivot = (anchor: Point | null, hand: Point | null, area: Quad): Point =>
  anchor ?? hand ?? bilerpQuad(area, 0.5, 0.5)

/** `armTransformFor` 입력(CR-025) — `MouseArm`·`PenHand`가 같은 값을 넘겨 같은 렌더에서 같은 변형을 쓴다 */
export interface ArmTransformInput {
  mouse: MouseSettings
  monitors: readonly ScreenBounds[]
  cursor: Point
  /** 손 기준점(bridge 계산값). null이면 resolvePivot 이 mouse.hand → 이동 영역 중심으로 폴백 */
  anchor: Point | null
  /** true면 커서·기준점과 무관하게 REST_TRANSFORM(CR-009) */
  atRest: boolean
}

/**
 * 어깨 축 회전 + 팔 방향 늘어나기 변형 하나를 구한다(CR-025 — 옛 `MouseArm` 렌더 1~5단계를 그대로 옮김).
 * atRest 이거나 커서가 속한 모니터를 고를 수 없으면 REST_TRANSFORM. `MouseArm`·`PenHand`가 같은 입력으로
 * 이 함수를 부르므로 팔과 펜 쥔 손이 같은 렌더에서 같은 회전·늘어나기를 쓴다.
 */
export const armTransformFor = ({ mouse, monitors, cursor, anchor, atRest }: ArmTransformInput): ArmTransform => {
  if (atRest) return REST_TRANSFORM
  const pivot = resolvePivot(anchor, mouse.hand, mouse.area)
  const mon = pickMonitor(cursor, monitors)
  if (!mon) return REST_TRANSFORM
  const { u, v } = cursorUv(cursor, mon)
  const target = bilerpQuad(mouse.area, u, v)
  return armTransform(mouse.shoulder, pivot, target)
}

/**
 * 펜 쥔 손의 위치·회전(붙는 점 이동량 dx·dy, 손 회전 deg) — 스케일 필드 없음(CR-025, R-25).
 * 손 크기는 팔 늘어남의 영향을 받지 않는다(손은 늘어나지 않는다).
 */
export interface PenTransform {
  dx: number
  dy: number
  deg: number
}

/** 쉬는 자세(팔 변형이 항등) = penPos 그대로·회전 0(CR-025) */
export const PEN_REST: PenTransform = { dx: 0, dy: 0, deg: 0 }

/** 음수·비유한 크기는 0으로 본다(CR-025) */
const nonNegativeSize = (v: number): number => (Number.isFinite(v) && v > 0 ? v : 0)

/**
 * `penPos === null` 기본 위치 규칙(CR-025, design.md §10.7) — 손 그림 중심을
 * `mouse.hand ?? 이동 영역 중심(bilerpQuad(area, 0.5, 0.5))`에 두는 좌상단 좌표(정수 반올림).
 * settings 미리보기도 같은 함수로 같은 자리를 얻는다(bridge 손 기준점 anchor 는 쓰지 않는다).
 */
export const defaultPenPos = (mouse: MouseSettings, size: { width: number; height: number }): Point => {
  const center = mouse.hand ?? bilerpQuad(mouse.area, 0.5, 0.5)
  const w = nonNegativeSize(size.width)
  const h = nonNegativeSize(size.height)
  return { x: Math.round(center.x - w / 2), y: Math.round(center.y - h / 2) }
}

/** 손 자리 폴백: 지정값(`mouse.penPos`, 크기와 무관) → 기본 위치 규칙(CR-025) */
export const resolvePenPos = (mouse: MouseSettings, size: { width: number; height: number }): Point =>
  mouse.penPos ?? defaultPenPos(mouse, size)

/** (도) 벡터 (x, y)를 원점 기준 deg만큼 회전 — CSS `rotate`와 같은 방향(화면 좌표 y 아래) */
const rotateVec = (deg: number, x: number, y: number): Point => {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: x * cos - y * sin, y: x * sin + y * cos }
}

/** 각도를 (−180, 180]로 접는다 — θt·θh 각각 이 범위 안이라 한 번의 보정이면 충분하다(CR-025) */
const foldDeg = (deg: number): number => {
  let d = deg
  if (d <= -180) d += 360
  if (d > 180) d -= 360
  return d
}

/**
 * 팔 끝(어깨 축 반대쪽)을 따라가는 손의 이동·회전(CR-025, design/functions.md §5.5 ①~⑦).
 * 붙는 점 P = 쉬는 자세 `pen_up` 중심(penPos + size/2). 팔 변형과 같은 사상 P' = S + R(θt)·diag(k,1)·R(−θh)·(P−S)로
 * 옮긴 점을 손의 이동량(dx, dy)으로, 각도차 θt−θh를 손의 회전(deg)으로 쓴다 — 스케일은 이동에만 쓰이고 손
 * 그림 자체에는 걸리지 않는다. 팔 변형이 항등(REST_TRANSFORM 포함)이거나 입력에 비유한 값이 있으면 PEN_REST.
 */
export const penTransform = (
  shoulder: Point,
  arm: ArmTransform,
  penPos: Point,
  size: { width: number; height: number },
): PenTransform => {
  if (arm.stretch === 1 && arm.targetDeg === arm.baseDeg) return PEN_REST
  if (
    !isFinitePoint(shoulder) ||
    !isFinitePoint(penPos) ||
    !Number.isFinite(arm.baseDeg) ||
    !Number.isFinite(arm.targetDeg) ||
    !Number.isFinite(arm.stretch) ||
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height)
  ) {
    return PEN_REST
  }

  const w = nonNegativeSize(size.width)
  const h = nonNegativeSize(size.height)
  const p = { x: penPos.x + w / 2, y: penPos.y + h / 2 }
  const rel = { x: p.x - shoulder.x, y: p.y - shoulder.y }
  const unrotated = rotateVec(-arm.baseDeg, rel.x, rel.y)
  const scaled = { x: unrotated.x * arm.stretch, y: unrotated.y }
  const rotated = rotateVec(arm.targetDeg, scaled.x, scaled.y)
  const pPrime = { x: shoulder.x + rotated.x, y: shoulder.y + rotated.y }

  return {
    dx: Number((pPrime.x - p.x).toFixed(2)),
    dy: Number((pPrime.y - p.y).toFixed(2)),
    deg: Number(foldDeg(arm.targetDeg - arm.baseDeg).toFixed(2)),
  }
}

/** `penTransform` 결과를 CSS transform 문자열로. 원점(`transform-origin`)은 `pen_up` 중심(요소 좌표) */
export const penTransformCss = (p: PenTransform): string =>
  `translate(${p.dx}px, ${p.dy}px) rotate(${p.deg}deg)`
