/**
 * 펜 쥔 손 파츠(CR-025, R-25 · CR-027, R-26 · CR-033, R-29 · CR-042, R-31) — 팔 파츠와 별개의 작은 손
 * 그림. 팔 끝(어깨 축 반대쪽)에 압정 하나로 꽂힌 것처럼 붙어 팔과 같은 각도로 기울지만 크기는 늘어나지
 * 않는다. prop penMode가 켜짐이면 「누름」(키보드 또는 펜 모드에서 누른 클릭 버튼 — isPressing, CR-027) 시
 * 손 그림만 pickPenEntry 로 교체한다 — 평소 pen_up, 누름 중 pen_down_0 → 없으면 pen_up(CR-042: 순환·
 * 특수 키 전용 손 그림(pen_key_*) 폐기 — kbFrame·specialHeld 를 읽지 않는다). penMode가 꺼짐이면 그림 교체
 * 없이 항상 pen_up(팔 끝 추종·기울기는 그대로 유지, §10.10).
 *
 * `pen_up`이 매니페스트에 없으면 penMode 값과 무관하게 null 을 반환한다(LayerStack.isPenMode 의 첫 조건과
 * 같음 — pen_up 없으면 pen_down_*·pen_key_* 가 있어도 그리지 않는다). 위치·변형은 src/state/mouseMapping.ts
 * 의 순수 함수(armTransformFor·resolvePenPos·penTransform·penTransformCss)만 부른다 — 이미지 픽셀을 읽지
 * 않는다. 래퍼·애니메이션 클래스가 없다 — 젤리·부르르는 감싼 .jellyWrap 이 팔·몸통과 함께 준다.
 */
import type { AssetEntry, AssetManifest, MouseSettings, Point, ScreenBounds } from 'bridge'
import { isPressing, type MachineState } from 'state/inputMachine'
import { armTransformFor, penTransform, penTransformCss, resolvePenPos } from 'state/mouseMapping'
import { findByKey } from './LayerStack'
import styles from '../overlay.module.css'

interface Props {
  manifest: AssetManifest
  machine: MachineState
  mouse: MouseSettings
  /** 모니터마다 사각형 1개(MouseArm 과 같은 값) */
  monitors: ScreenBounds[]
  cursor: { x: number; y: number }
  /** 손 기준점(bridge 계산값). MouseArm 과 같은 값을 넘긴다 */
  anchor: Point | null
  /** true면 커서·기준점과 무관하게 쉬는 자세(penPos 그대로·회전 0) */
  atRest: boolean
  /** 펜 손 사용 토글(CR-033) — false면 그림 교체 없이 항상 pen_up(팔 끝 추종은 유지) */
  penMode: boolean
}

/**
 * 손 그림 선택(design/functions.md §5.5 CR-042 개정) — pen_up 이 없으면 undefined(펜 모드 아님).
 * 들림(!isPressing) → pen_up / 누름(isPressing — 키 또는 펜 모드 클릭 버튼, CR-027) → pen_down_0(없으면
 * pen_up). kbFrame·specialHeld 는 읽지 않는다(CR-042 — 순환·특수 키 전용 손 그림(pen_key_*) 폐기, 어떤
 * 키·클릭·특수 키 누름이든 같은 pen_down_0).
 */
export const pickPenEntry = (manifest: AssetManifest, machine: MachineState): AssetEntry | undefined => {
  const up = findByKey(manifest, 'pen_up')
  if (!up) return undefined
  if (!isPressing(machine)) return up

  return findByKey(manifest, 'pen_down_0') ?? up
}

const PenHand = ({ manifest, machine, mouse, monitors, cursor, anchor, atRest, penMode }: Props) => {
  const up = findByKey(manifest, 'pen_up')
  if (!up) return null

  const entry = penMode ? (pickPenEntry(manifest, machine) as AssetEntry) : up
  const size = { width: up.width, height: up.height }
  const pos = resolvePenPos(mouse, size)
  const arm = armTransformFor({ mouse, monitors, cursor, anchor, atRest })
  const t = penTransform(mouse.shoulder, arm, pos, size)

  return (
    <img
      className={styles.hand}
      src={entry.url}
      alt=""
      draggable={false}
      style={{
        left: pos.x,
        top: pos.y,
        width: entry.width,
        height: entry.height,
        transformOrigin: `${up.width / 2}px ${up.height / 2}px`,
        transform: penTransformCss(t),
      }}
    />
  )
}

export default PenHand
