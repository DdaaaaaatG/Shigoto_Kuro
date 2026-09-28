/**
 * 오버레이 화면. 상세 설계는 overlay/design.md.
 *
 * 흐름: bridge 이벤트 → inputMachine → .hairWrap(HairLayer 뒷머리, 맨 아래 — CR-051. hair가 있을 때만,
 *       .jellyWrap과 같은 motion 클래스로 함께 출렁임) → BackgroundLayer(배경, 애니메이션 없음) → PomodoroLayer(뽀모도
 *       인물·말풍선·시간 글자, 배경처럼 고정 — CR-045) → .jellyWrap(키 입력마다 안의 레이어 전부가 한 덩어리로
 *       출렁이는 젤리 래퍼 — CR-022) 안에 MouseArm(손 그림 1장을
 *       mouse.partPos에 자연 크기로 놓고 어깨 축 회전, 몸통 아래, 한 모드 — CR-015) → LayerStack(몸통/상태/키보드,
 *       펜 모드면 키보드는 kb_up 고정 — CR-025) → PenHand(펜 쥔 손, 팔 끝을 따라 이동, 맨 위 — CR-025)
 * - 창은 100vw×100vh(CR-012). 캔버스를 450×350 상자에 비율 유지로 맞춘 뒤 settings.scale 을 곱해 표시
 * - 창 배경 투명, 루트 영역 드래그로 창 이동(data-tauri-drag-region)
 * - Ctrl+휠로 배율 조절(0.25~2) → 설정 저장
 * - 펜 모드 판정(CR-033, R-29) = pen_up 등록 && settings.mouse.penMode === true. 렌더에서 한 번 계산해
 *   config(kbFrames·clickPress)·LayerStack·PenHand에 같은 값을 넘긴다. 켜짐이면 config.clickPress = true 로
 *   상태기계에 알려 마우스 클릭도 키 누름처럼 센다(CR-027, R-26)
 */
//! CR-051: .hairWrap(뒷머리, 젤리 동기) → BackgroundLayer → PomodoroLayer(고정, CR-045) → .jellyWrap 순으로 그린다
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type WheelEvent,
} from 'react'
import {
  BASE_BOX,
  DEFAULT_SETTINGS,
  DEFAULT_TIMER_SETTINGS,
  SCALE_MAX,
  SCALE_MIN,
  getAssetManifest,
  getHandAnchor,
  getMonitors,
  getSettings,
  onAssetsChanged,
  onHandAnchorChanged,
  onKeyboard,
  onMouseButton,
  onMouseMove,
  onSettingsChanged,
  setResting,
  setSettings,
  type AssetManifest,
  type Point,
  type ScreenBounds,
  type Settings,
  type UnlistenFn,
} from 'bridge'
import { useBridgeEvent } from 'components/hooks/useBridgeEvent'
import { fetchWithRetry } from 'components/utils/fetchWithRetry'
import {
  createInitialState,
  isSpecialKey,
  reduce,
  wrapMotion,
  type MachineConfig,
  type MachineInput,
  type MachineState,
  type WrapMotion,
} from 'state/inputMachine'
import BackgroundLayer from './components/BackgroundLayer'
import HairLayer from './components/HairLayer'
import LayerStack, { findEntry, isPenMode, kbDownFrameCount } from './components/LayerStack'
import MouseArm from './components/MouseArm'
import PenHand from './components/PenHand'
import PomodoroLayer from './components/PomodoroLayer'
import styles from './overlay.module.css'

const TICK_MS = 100
const EMPTY_MANIFEST: AssetManifest = { canvas: null, entries: [] }

const clampScale = (v: number) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, v))

/**
 * 젤리 래퍼 클래스(CR-022, CR-023 — design/functions.md §5.1) — null이면 기본, 0/1이면 짝 교대 클래스,
 * 'shiver'면 부르르(꾹 누름). 반환에는 .jelly·.jellyAlt·.shiver 중 많아야 하나만 들어간다(동시 부착 금지).
 * base = 기본 클래스(.jellyWrap 본체 래퍼 / .hairWrap 뒷머리 래퍼 — CR-051, 같은 motion을 받아 동기로 출렁인다).
 */
const jellyClass = (motion: WrapMotion, base: string = styles.jellyWrap): string => {
  if (motion === 0) return `${base} ${styles.jelly}`
  if (motion === 1) return `${base} ${styles.jellyAlt}`
  if (motion === 'shiver') return `${base} ${styles.shiver}`
  return base
}

const OverlayApp = () => {
  const [settings, setLocalSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [manifest, setManifest] = useState<AssetManifest>(EMPTY_MANIFEST)
  /** 모니터마다 사각형 1개(CR-017, 옛 `bounds: ScreenBounds` 대체). 시작 시 getMonitors() 1회로 채운다 */
  const [monitors, setMonitors] = useState<ScreenBounds[]>([])
  /** 손 기준점(bridge 계산값, CR-008) */
  const [anchor, setAnchor] = useState<Point | null>(null)
  /** true면 마우스 파츠는 쉬는 위치(CR-009, R-11·R-15). 시작 직후·쉬는중 진입 시 true, 마우스 이동 시 false */
  const [armAtRest, setArmAtRest] = useState(true)

  // 펜 모드 판정(CR-033, R-29) — pen_up 등록 && settings.mouse.penMode === true. 한 번만 계산해
  // config·LayerStack·PenHand에 같은 값을 넘긴다(design.md §10.10)
  const penMode = isPenMode(manifest, settings.mouse)

  const config = useMemo<MachineConfig>(
    () => ({
      idleMs: settings.idleSeconds * 1000,
      // 펜 모드에서는 순환 그림이 없다 — 손 그림은 늘 pen_down_0 한 장이라 kbFrame은 항상 0(CR-042, R-31)
      kbFrames: penMode ? 1 : kbDownFrameCount(manifest),
      // 펜 모드면 마우스 클릭도 키 누름처럼 센다 — 상태기계는 「펜」을 모른다(스위치만 주입, CR-027, R-26)
      clickPress: penMode,
    }),
    [settings.idleSeconds, manifest, penMode],
  )

  const configRef = useRef(config)
  configRef.current = config

  const reducer = useCallback(
    (state: MachineState, input: MachineInput) => reduce(state, input, configRef.current),
    [],
  )
  const [machine, dispatch] = useReducer(reducer, Date.now(), createInitialState)

  // 초기 로드 — CR-039: core 준비 전 실패에 대비해 200·500·1000ms 간격으로 최대 3회 재시도(끝내 실패하면 문구 없음)
  useEffect(() => {
    const cancels = [
      fetchWithRetry(getSettings, setLocalSettings),
      fetchWithRetry(getAssetManifest, setManifest),
      // CR-017: 앱 시작 때만 조회한다 — 실행 중 재조회 없음(design/functions.md §5.1 모니터 목록 로드)
      fetchWithRetry(getMonitors, setMonitors),
    ]
    return () => cancels.forEach(cancel => cancel())
  }, [])

  // 손 기준점 로드·구독(CR-008, contract §3.6) — 구독이 완료된 뒤에만 조회한다(순서 위반 시 초기 변경을 놓친다)
  useEffect(() => {
    let cancelled = false
    let eventSeen = false
    let unlisten: UnlistenFn | undefined

    const load = async () => {
      try {
        const fn = await onHandAnchorChanged(e => {
          eventSeen = true
          setAnchor(e.anchor)
        })
        if (cancelled) fn()
        else unlisten = fn
      } catch {
        // 구독 실패 — eventSeen 은 계속 false로 남아 아래 조회 결과를 그대로 쓴다
      }
      try {
        const p = await getHandAnchor()
        if (!cancelled && !eventSeen) setAnchor(p)
      } catch {
        // 조회 실패 — anchor 유지, 문구 없음
      }
    }
    load()

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])

  // bridge 이벤트 구독
  // CR-021: special 은 분류값만 그대로 dispatch로 넘긴다 — 별도 보관·누적·console·bridge 전송 없음(R-22)
  // CR-023: repeat 도 보관·누적·출력 없이 그대로 넘긴다 — 없거나 true가 아니면 false
  useBridgeEvent(onKeyboard, e =>
    dispatch({
      type: 'key',
      pressed: e.pressed,
      heldCount: e.heldCount,
      special: isSpecialKey(e.special) ? e.special : null,
      repeat: e.repeat === true,
      ts: e.ts,
    }),
  )
  useBridgeEvent(onMouseMove, e => {
    dispatch({ type: 'mouseMove', x: e.x, y: e.y, ts: e.ts })
    setArmAtRest(false)
  })
  useBridgeEvent(onMouseButton, e =>
    dispatch({ type: 'mouseButton', button: e.button, pressed: e.pressed, ts: e.ts }),
  )
  useBridgeEvent(onSettingsChanged, setLocalSettings)
  useBridgeEvent(onAssetsChanged, setManifest)

  // 유휴·쾅 만료 판정용 tick
  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: 'tick', now: Date.now() }), TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  // 쉬는중 진입 시 마우스 파츠를 쉬는 위치로 되돌린다(CR-009). 깨어나도 다음 마우스 이동 전까지 유지
  useEffect(() => {
    if (machine.layer === 'rest') setArmAtRest(true)
  }, [machine.layer])

  // 쉬는중 여부를 core 타이머에 알린다(CR-045) — core가 running↔restPaused 전이를 판정한다(R-35).
  // 반환값은 쓰지 않는다(표시는 timer://changed로만), 실패는 무시(문구·재시도 없음 — 다음 전이 때 다시 보냄)
  useEffect(() => {
    setResting(machine.layer === 'rest').catch(() => undefined)
  }, [machine.layer])

  // Ctrl+휠 배율
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey) return
    e.preventDefault()
    const next = clampScale(Number((settings.scale + (e.deltaY < 0 ? 0.05 : -0.05)).toFixed(2)))
    if (next === settings.scale) return
    const updated = { ...settings, scale: next }
    setLocalSettings(updated)
    setSettings(updated).catch(() => undefined)
  }

  const canvas = manifest.canvas
  const fit = canvas ? Math.min(BASE_BOX.width / canvas.width, BASE_BOX.height / canvas.height) : 1
  const scale = fit * settings.scale
  /** 본체 래퍼와 뒷머리 래퍼가 같은 커밋에서 같은 클래스를 받도록 한 번만 계산(CR-051) */
  const motion = wrapMotion(machine)
  const hasHair = useMemo(() => findEntry(manifest, 'hair') !== undefined, [manifest])

  return (
    <div className={styles.root} data-tauri-drag-region onWheel={onWheel}>
      {canvas && (
        <div
          className={styles.canvas}
          style={{
            width: canvas.width,
            height: canvas.height,
            transform: `scale(${scale})`,
          }}
        >
          {hasHair && (
            <div className={jellyClass(motion, styles.hairWrap)}>
              <HairLayer manifest={manifest} />
            </div>
          )}
          <BackgroundLayer manifest={manifest} />
          <PomodoroLayer manifest={manifest} timer={settings.timer ?? DEFAULT_TIMER_SETTINGS} />
          <div className={jellyClass(motion)}>
            {settings.mouse && monitors.length > 0 && (
              <MouseArm
                manifest={manifest}
                mouse={settings.mouse}
                monitors={monitors}
                cursor={machine.mouse}
                button={machine.mouse.button}
                anchor={anchor}
                atRest={armAtRest}
              />
            )}
            <LayerStack manifest={manifest} machine={machine} penMode={penMode} />
            {settings.mouse && (
              <PenHand
                manifest={manifest}
                machine={machine}
                mouse={settings.mouse}
                monitors={monitors}
                cursor={machine.mouse}
                anchor={anchor}
                atRest={armAtRest}
                penMode={penMode}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default OverlayApp
