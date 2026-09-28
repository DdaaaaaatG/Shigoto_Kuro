/**
 * 마우스 파츠 — 한 모드(CR-015, R-18). 손(펜) 부분만 그린 작은 PNG를 `mouse.partPos`(캔버스 좌표)에
 * 자연 크기로 놓고, 어깨 고정점을 축으로 회전 + 팔 방향 늘어나기/줄어들기(0.5~1.6배, CR-017)를 해
 * 손 기준점이 목표점에 닿도록 한다. 캔버스 전체 크기 그림 + `partPos = (0,0)`이면 이전 「레이어 이동
 * 모드」와 같은 화면이 된다.
 *
 * 회전 기준점(pivot)은 bridge가 계산해 준 `anchor`(끝부분 알파 가중 무게중심, 캔버스 좌표) → `mouse.hand`
 * → 이동 영역 중심 순으로 정해진다(CR-007·008·017). 목표점은 커서가 있는 모니터(없으면 가장 가까운
 * 모니터) 안에서 커서의 상대 위치를 `mouse.area`(자유 사각형)로 쌍선형 보간한 자리다(CR-017, R-20).
 * 앱은 팔을 그리지 않는다 — 손바닥 모드·SVG 팔 곡선은 폐기됐다.
 *
 * `atRest`(CR-009)이거나 커서가 속한 모니터를 고를 수 없으면 REST_TRANSFORM(회전 0°·배율 1, 쉬는 위치
 * 와 같은 모양) — 이 판정과 회전·늘어나기 계산은 `armTransformFor`(state/mouseMapping.ts) 하나로 옮겼다
 * (CR-025, 결과·동작 변경 없음). `PenHand`가 같은 입력으로 이 함수를 불러 팔과 펜 쥔 손이 같은 렌더에서
 * 같은 변형을 쓴다. 키 입력 젤리(CR-022, R-23)는 이 컴포넌트 밖의 `.jellyWrap`이 받는다 — `MouseArm`은
 * 신호를 받지 않고 항상 같은 `.armWrap` 컨테이너를 렌더한다(회전·늘어나기는 안쪽 `<img>`에 그대로 둔다).
 */
import type { AssetManifest, MouseSettings, Point, ScreenBounds } from 'bridge'
import type { MouseButtonState } from 'state/inputMachine'
import { armTransformCss, armTransformFor } from 'state/mouseMapping'
import { findEntry } from './LayerStack'
import styles from '../overlay.module.css'

interface Props {
  manifest: AssetManifest
  mouse: MouseSettings
  /** 모니터마다 사각형 1개(CR-017, 옛 `bounds: ScreenBounds` 대체) */
  monitors: ScreenBounds[]
  cursor: { x: number; y: number }
  button: MouseButtonState
  /** 손 기준점(bridge 계산값, CR-008). null이면 mouse.hand → 이동 영역 중심으로 폴백 */
  anchor: Point | null
  /** true면 커서·기준점과 무관하게 쉬는 위치(회전 0°·배율 1, CR-009, R-11·R-15·R-21) */
  atRest: boolean
}

const MouseArm = ({ manifest, mouse, monitors, cursor, button, anchor, atRest }: Props) => {
  const hand =
    button === 'left'
      ? findEntry(manifest, 'mouse_left')
      : button === 'right'
        ? findEntry(manifest, 'mouse_right')
        : findEntry(manifest, 'mouse_base')
  const entry = hand ?? findEntry(manifest, 'mouse_base')
  if (!entry) return null

  const part = mouse.partPos
  const t = armTransformFor({ mouse, monitors, cursor, anchor, atRest })

  return (
    <div className={styles.armWrap}>
      <img
        className={styles.hand}
        src={entry.url}
        alt=""
        draggable={false}
        style={{
          left: part.x,
          top: part.y,
          width: entry.width,
          height: entry.height,
          transformOrigin: `${mouse.shoulder.x - part.x}px ${mouse.shoulder.y - part.y}px`,
          transform: armTransformCss(t),
        }}
      />
    </div>
  )
}

export default MouseArm
