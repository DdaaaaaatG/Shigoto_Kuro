/**
 * bridge 이벤트 구독 래퍼. 화면 코드는 @tauri-apps/api/event 를 직접 쓰지 않고 이 함수들만 쓴다.
 * 이벤트 이름은 src-tauri/src/bridge/events.rs 의 상수와 1:1.
 */
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type {
  AssetManifest,
  HandAnchorEvent,
  KeyboardInputEvent,
  MouseButtonEvent,
  MouseMoveEvent,
  Settings,
  TimerSnapshot,
} from './types'

export type { UnlistenFn }

export const EVENTS = {
  keyboard: 'input://keyboard',
  mouseMove: 'input://mouse-move',
  mouseButton: 'input://mouse-button',
  settingsChanged: 'settings://changed',
  assetsChanged: 'assets://changed',
  /** v0.3, contract.md §3.6·§4, OV-R-14 */
  handAnchorChanged: 'assets://hand-anchor-changed',
  /** v0.21, contract.md §4·§5.8, CR-045. 상태가 바뀔 때만 — 매초 이벤트 없음 */
  timerChanged: 'timer://changed',
} as const

export type Subscriber<T> = (cb: (payload: T) => void) => Promise<UnlistenFn>

const subscribe =
  <T>(name: string): Subscriber<T> =>
  cb =>
    listen<T>(name, ev => cb(ev.payload))

export const onKeyboard: Subscriber<KeyboardInputEvent> = subscribe(EVENTS.keyboard)
export const onMouseMove: Subscriber<MouseMoveEvent> = subscribe(EVENTS.mouseMove)
export const onMouseButton: Subscriber<MouseButtonEvent> = subscribe(EVENTS.mouseButton)
export const onSettingsChanged: Subscriber<Settings> = subscribe(EVENTS.settingsChanged)
export const onAssetsChanged: Subscriber<AssetManifest> = subscribe(EVENTS.assetsChanged)
/**
 * 손 기준점 변경 통지. ui 사용 순서: 구독 먼저 → getHandAnchor() 조회
 * (구독 전에 바뀐 값을 놓치지 않기 위함, contract.md §3.6).
 */
export const onHandAnchorChanged: Subscriber<HandAnchorEvent> = subscribe(EVENTS.handAnchorChanged)
/**
 * 뽀모도 타이머 상태 변경 통지(v0.21, contract.md §4·§5.8, CR-045). ui 사용 순서: 구독 먼저 →
 * getTimer() 조회(§5.8-3, settings://changed와 같은 규칙).
 */
export const onTimerChanged: Subscriber<TimerSnapshot> = subscribe(EVENTS.timerChanged)
