/**
 * 마우스 파츠 마법사 (순수 TS, 부수효과 없음) — 설정 창 「마우스 파츠」 탭.
 * 단계가 하나뿐인 상태기계로 어깨축 설정(R-10)·이동 영역 설정(R-15, CR-018)을 함께 다룬다
 * (버튼·끌기와의 상호 배타는 MousePartsTab.tsx §4가 보장 — 여기서는 상태 모양만 규정).
 *
 * 흐름:
 *   어깨축(CR-005, 한 단계): idle ─[start]→ pickShoulder ─[pick]→ review ─[save/cancel]→ idle
 *     - pickShoulder: "축이 될 부분을 마우스로 클릭해주세요" — 어깨 고정점을 클릭 → shoulder
 *     - review:       축 위치를 미리보기에 표시한다. 저장하면 settings.mouse 에 반영, 취소하면 버린다.
 *   이동 영역(CR-018): idle ─[startArea]→ pickArea ─[pick ×4]→ reviewArea ─[save/cancel]→ idle
 *     - pickArea:   네 점을 순서대로(왼쪽 위 → 오른쪽 위 → 오른쪽 아래 → 왼쪽 아래) 클릭 → area 에 누적
 *     - reviewArea: 네 점을 이은 사각형을 미리보기에 표시한다. 저장하면 settings.mouse.area 에 반영
 * 손 위치 단계·뒤로 가기 버튼·손 위치 표시는 없다(CR-005 — 손 기준점은 core 가 자동 계산한다, getHandAnchor).
 * 리셋은 마법사와 무관하게 기본값(DEFAULT_MOUSE_SETTINGS)으로 되돌린다.
 * 손 그림 끌어다 놓기(CR-016, R-11)의 좌표 판정·범위 제한은 hitPart·clampPartPos 가 맡는다
 * (MousePartsTab.tsx 에서 호출). isPreviewLayerMode 는 CR-016 으로 삭제됨(패드 박스 항상 숨김).
 * 펜 쥔 손 위치 끌기(CR-026, R-18)의 끌 대상(펜 손 vs 팔 파츠) 판정은 pickDragTarget 이 맡는다.
 * CR-040(R-37): 누른 자리에 실제로 그려진(알파>0) 그림을 우선한다(hitOpaque) — 마스크가 없거나
 * 크기가 다르면(로딩 중·실패·교체 직후) 옛 사각형 판정(겹치면 펜 손 우선)으로 대체한다(§2.3). 마스크는
 * 이 파일이 만들지 않고 주입만 받는다(만드는 곳은 alphaMask.ts·components/useAlphaMask.ts).
 * 펜 손 기본 위치 계산은 이 파일이 아니라 src/state/mouseMapping.ts 의 resolvePenPos(overlay CR-025 와
 * 공유, 재구현 금지).
 */
import type { MouseSettings, Point } from 'bridge/types'
import { isOpaqueAt, type AlphaMask } from './alphaMask'

export type WizardStep = 'idle' | 'pickShoulder' | 'review' | 'pickArea' | 'reviewArea'

export interface WizardState {
  step: WizardStep
  shoulder: Point | null
  /** pickArea 중 0~3개, reviewArea 에서 정확히 4개(클릭 순서 그대로), 그 외 빈 배열 */
  area: Point[]
}

export type WizardAction =
  | { type: 'start' }
  | { type: 'startArea' }
  | { type: 'pick'; point: Point }
  | { type: 'cancel' }
  | { type: 'saved' }

export const initialWizard: WizardState = { step: 'idle', shoulder: null, area: [] }

export const wizardReduce = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case 'start':
      return { step: 'pickShoulder', shoulder: null, area: [] }
    case 'startArea':
      return { step: 'pickArea', shoulder: null, area: [] }
    case 'pick':
      if (state.step === 'pickShoulder') {
        return { step: 'review', shoulder: action.point, area: state.area }
      }
      if (state.step === 'pickArea') {
        const nextArea = [...state.area, action.point]
        return nextArea.length === 4
          ? { step: 'reviewArea', shoulder: state.shoulder, area: nextArea }
          : { ...state, area: nextArea }
      }
      return state
    case 'cancel':
    case 'saved':
      return initialWizard
  }
}

/** 마법사가 완성됐을 때 기존 설정 위에 축(또는 이동 영역)만 덮어 쓴 새 MouseSettings. 미완성이면 null */
export const applyWizard = (base: MouseSettings, w: WizardState): MouseSettings | null => {
  if (w.step === 'review' && w.shoulder) return { ...base, shoulder: w.shoulder }
  if (w.step === 'reviewArea' && w.area.length === 4) {
    return { ...base, area: [w.area[0], w.area[1], w.area[2], w.area[3]] }
  }
  return null
}

/** 미리보기(축소 표시) 안의 클릭 위치 → 캔버스 좌표. 정수로 반올림하고 캔버스 안으로 고정한다 */
export const previewToCanvas = (
  offset: Point,
  scale: number,
  canvas: { width: number; height: number },
): Point => {
  const s = scale > 0 ? scale : 1
  const clamp = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v)))
  return { x: clamp(offset.x / s, canvas.width), y: clamp(offset.y / s, canvas.height) }
}

/** 캔버스를 상자에 비율 유지로 맞추는 배율 */
export const fitScale = (
  canvas: { width: number; height: number },
  box: { width: number; height: number },
): number =>
  canvas.width > 0 && canvas.height > 0
    ? Math.min(box.width / canvas.width, box.height / canvas.height)
    : 1

/**
 * 손 그림 끌기 시작 판정(CR-016). 그림 사각형 [partPos.x, partPos.x+w) × [partPos.y, partPos.y+h) 안이면 true.
 * 좌표 기반 판정이다 — 손 그림은 바탕 아래에 깔려 포인터를 받지 못한다(pointer-events: none). 투명 픽셀도 true.
 */
export const hitPart = (
  point: Point,
  partPos: Point,
  size: { width: number; height: number },
): boolean => {
  if (size.width <= 0 || size.height <= 0) return false
  return (
    point.x >= partPos.x &&
    point.x < partPos.x + size.width &&
    point.y >= partPos.y &&
    point.y < partPos.y + size.height
  )
}

/**
 * 손 그림 끌기 범위 제한(CR-016). 그림 전체가 캔버스 안에 들어오도록 반올림 후 고정한다.
 * 캔버스 전체 크기(이상) 그림은 항상 (0, 0)에 고정된다.
 */
export const clampPartPos = (
  p: Point,
  size: { width: number; height: number },
  canvas: { width: number; height: number },
): Point => {
  const maxX = Math.max(0, canvas.width - size.width)
  const maxY = Math.max(0, canvas.height - size.height)
  return {
    x: Math.min(maxX, Math.max(0, Math.round(p.x))),
    y: Math.min(maxY, Math.max(0, Math.round(p.y))),
  }
}

/** 끌 수 있는 그림 하나(CR-040). `mask` 가 없거나 크기가 `size` 와 다르면 사각형 판정으로 대체한다(§2.3) */
export type DragCandidate = {
  pos: Point
  size: { width: number; height: number }
  mask?: AlphaMask | null
}

/**
 * 사각형 예비 판정 뒤 픽셀 판정(CR-040, R-37). hitPart 로 먼저 사각형 안인지 보고, 마스크가 있고
 * 크기가 `c.size` 와 같으면 그 자리의 알파(>0)만 true 로 본다. 마스크가 없거나 크기가 다르면(로딩
 * 중·실패·교체 직후) 사각형 판정 그대로 true — 「끌기 불능」보다 옛 동작을 우선한다(drag-hit.md §2.3).
 */
export const hitOpaque = (point: Point, c: DragCandidate): boolean => {
  if (!hitPart(point, c.pos, c.size)) return false
  if (c.mask == null || c.mask.width !== c.size.width || c.mask.height !== c.size.height) return true
  return isOpaqueAt(c.mask, point.x - c.pos.x, point.y - c.pos.y)
}

/**
 * 끌 대상 판정(CR-026, CR-040 개정). 펜 손이 팔 파츠 바탕 위에 그려지므로 두 그림 모두 픽셀이 있으면
 * 펜 손을 먼저 잡는다(hitOpaque 순서). 어느 쪽도 픽셀이 없으면(또는 사각형 밖이면) null.
 */
export const pickDragTarget = (
  point: Point,
  pen: DragCandidate | null,
  part: DragCandidate | null,
): 'pen' | 'part' | null => {
  if (pen && hitOpaque(point, pen)) return 'pen'
  if (part && hitOpaque(point, part)) return 'part'
  return null
}
