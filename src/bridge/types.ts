/**
 * bridge 계약 타입 (v0.21) — doc/200_설계/bridge/contract.md 와 src-tauri/src/bridge/types.rs 의 TS 쪽 거울.
 * 셋 중 하나가 바뀌면 나머지도 같은 패스에서 맞춘다(bridge-implementer 소관).
 * Rust 쪽은 #[serde(rename_all = "camelCase")] 이므로 여기 필드명은 전부 camelCase.
 */

// ─── 에셋 슬롯 ─────────────────────────────────────────────────────────────
// 단순 슬롯은 문자열, 키보드 누름 프레임({kind:'kb_down', index})·(v0.13) 펜 쥔 손 누름 프레임
// ({kind:'pen_down', index})만 객체.
// 직렬화 예: "background" / "body" / "kb_up" / {"kind":"kb_down","index":0} / "pen_up" / {"kind":"pen_down","index":0}
export type SimpleAssetSlot =
  | 'background'   // v0.6(OV-R-17) — 맨 아래 레이어라 맨 앞. 캔버스 레이어, 필수 4장에는 미포함
  | 'body' | 'idle' | 'rest' | 'kb_up'
  // (v0.11, CR-021 · OV-R-22) 특수 키 이미지 = 'key_' + SpecialKey(아래). 캔버스 레이어, 선택.
  | 'key_space' | 'key_z' | 'key_question' | 'key_exclamation' | 'key_enter' | 'key_backspace' | 'key_undo'
  | 'mouse_base' | 'mouse_left' | 'mouse_right'
  // (v0.13, CR-024 · OV-R-25 · ST-R-18) 펜 쥔 손 — 캔버스 레이어도 마우스 파츠도 아닌 세 번째 그룹.
  | 'pen_up'                                              // 평소(키가 하나도 안 눌림)
  | 'pen_key_space' | 'pen_key_z' | 'pen_key_question'    // 특수 키 = 'pen_key_' + SpecialKey(§3.7)
  | 'pen_key_exclamation' | 'pen_key_enter' | 'pen_key_backspace'
  | 'pen_key_undo'
  // (v0.17, CR-037) 머리카락 — 캔버스 레이어, 선택. v0.20~v0.22: 내장 기본 없음. v0.23(CR-053)부터
  // 다시 내장 기본 있음(hasBuiltinDefault('hair') === true, 배포용 기본 세트 3차).
  | 'hair'
  // (v0.21, CR-045 · PT-01) 뽀모도 인물·말풍선 — 캔버스 레이어, 선택. 각 1장 고정.
  // pomo_char는 v0.23(CR-053)부터 내장 기본 있음. pomo_bubble은 내장 기본 없음(변경 없음).
  | 'pomo_char' | 'pomo_bubble'

export interface KbDownSlot {
  kind: 'kb_down'
  index: number
}

/** (v0.13) 펜 쥔 손 — 키 누름(index 0부터, kb_down과 같은 순번 구조) */
export interface PenDownSlot {
  kind: 'pen_down'
  index: number
}

export type AssetSlot = SimpleAssetSlot | KbDownSlot | PenDownSlot

// (v0.13) 인덱스를 가진 슬롯이 kb_down·pen_down 둘이 되어, 객체 여부만으로는 좁힐 수 없다.
// kind 값까지 비교해 서로를 오인하지 않는다(contract.md §3.1 TS 슬롯 도우미).
export const isKbDownSlot = (slot: AssetSlot): slot is KbDownSlot =>
  typeof slot === 'object' && slot.kind === 'kb_down'

export const isPenDownSlot = (slot: AssetSlot): slot is PenDownSlot =>
  typeof slot === 'object' && slot.kind === 'pen_down'

/** 슬롯을 파일명 키로 (Rust `AssetSlot::file_key` 와 동일 규칙) */
export const slotKey = (slot: AssetSlot): string =>
  typeof slot === 'object' ? `${slot.kind}_${slot.index}` : slot

/** 마우스 파츠 슬롯 여부(마우스 파츠 3종만 true — 펜 그림·kb_down·pen_down은 false) */
export const isMousePartSlot = (slot: AssetSlot): boolean =>
  typeof slot === 'string' && slot.startsWith('mouse_')

/**
 * (v0.19, CR-043 · 🔒 사용자 확정) 필수 이미지 2장 — contract.md §3.1. 판정은 ui만 한다(core는 검사하지 않는다).
 * `idle`·`rest`는 v0.14부터 선택. `{kind:'kb_down', index:0}`은 v0.14~v0.18까지 필수였으나
 * v0.19부터 선택으로 강등(확정사항 §6 「타자 입력 1 선택 강등」).
 */
export const REQUIRED_SLOTS: readonly AssetSlot[] = ['kb_up', 'mouse_base']

export const isRequiredSlot = (slot: AssetSlot): boolean =>
  REQUIRED_SLOTS.some(r => slotKey(r) === slotKey(slot))

/**
 * (v0.23, CR-053 · 🔒 사용자 확정 · 배포용 기본 세트 3차) 내장 기본 그림이 있는 슬롯 7개. 원본은 Rust
 * `assets::defaults::DEFAULT_ASSETS`(순서 동일) — 이 배열은 사본이라 항목·순서 불일치는 bridge 결함.
 * 순서: 캔버스 레이어(kb_up → background → hair → pomo_char) → mouse_base → pen_up → pen_down_0.
 * v0.20~v0.22: 6개(hair 제외, kb_down_0 포함). v0.18~v0.19: 7개(hair 포함, kb_down_0도 포함).
 * v0.17까지 15개(idle·rest·key_* 7종 포함). CR-053부터 kb_down_0은 다시 내장 기본 없음.
 */
export const DEFAULT_ASSET_SLOTS: readonly AssetSlot[] = [
  'kb_up',
  'background',
  'hair',
  'pomo_char',
  'mouse_base',
  'pen_up',
  { kind: 'pen_down', index: 0 },
]

/** (v0.16) 슬롯에 내장 기본 그림이 있는지 — isRequiredSlot과 같은 slotKey 비교 방식. */
export const hasBuiltinDefault = (slot: AssetSlot): boolean =>
  DEFAULT_ASSET_SLOTS.some(d => slotKey(d) === slotKey(slot))

// ─── 에셋 매니페스트 ────────────────────────────────────────────────────────
export interface CanvasSize {
  width: number
  height: number
}

export interface AssetEntry {
  slot: AssetSlot
  fileName: string
  width: number
  height: number
  bytes: number
  /** asset 프로토콜 URL (http://asset.localhost/...) — <img src> 에 그대로 사용 */
  url: string
}

export interface AssetManifest {
  /** 첫 캔버스 레이어(배경 포함, v0.6)가 정한 캔버스 크기. 캔버스 레이어가 하나도 없으면 null */
  canvas: CanvasSize | null
  entries: AssetEntry[]
}

/**
 * (v0.16, CR-035 · DA-05) `exportDefaultAssets`(§5.7)의 반환값. 모든 값은 파일명
 * (`{file_key}.png`)이며 경로를 싣지 않는다.
 */
export interface ExportFailure {
  /** 쓰지 못한 파일명(예: 'kb_up.png'). 경로 아님 */
  fileName: string
  /** '영역.사유' — 현재 'asset.io'뿐 */
  code: string
}

export interface ExportReport {
  /** 쓴 파일명(DEFAULT_ASSET_SLOTS 순서) */
  written: string[]
  /**
   * 호출 전에 이미 있던 파일명. overwrite=false이고 비어 있지 않으면 written = []
   * (아무것도 쓰지 않음). overwrite=true면 덮어쓴 목록(정보용)
   */
  conflicts: string[]
  /** 파일별 실패. 일부만 실패해도 나머지는 written에 있다 */
  failed: ExportFailure[]
}

// ─── 설정 ──────────────────────────────────────────────────────────────────
export interface Point {
  x: number
  y: number
}

export interface OverlaySettings {
  x: number
  y: number
  visible: boolean
}

export interface MouseSettings {
  /** 팔이 시작하는 어깨 고정점 (캔버스 좌표) */
  shoulder: Point
  /**
   * (v0.9, CR-017) 손이 움직이는 자유 사각형 이동 영역의 네 꼭짓점(캔버스 좌표).
   * 인덱스 의미 고정: [0]=왼쪽 위, [1]=오른쪽 위, [2]=오른쪽 아래, [3]=왼쪽 아래.
   * 기본 [(375,525),(495,525),(495,625),(375,625)]. 기준점 최종 폴백 = 네 점 평균(중심).
   * ui는 커서가 든 모니터(getMonitors)에서 (u, v)∈[0,1]를 구해 쌍선형 보간으로 손 목표점을 계산한다.
   */
  area: [Point, Point, Point, Point]
  /**
   * (v0.8, OV-R-18) 마우스 파츠 그림(mouse_base·mouse_left·mouse_right 공통, 같은 크기·같은 위치)의
   * 왼쪽 위 모서리를 놓는 캔버스 좌표. 전체 캔버스 크기 그림이면 {0,0}. 기본 {x:389, y:492}.
   * 손 기준점(§3.6) 재계산의 입력. 검증 없음(범위·캔버스 안 여부 검사 안 함).
   */
  partPos: Point
  /**
   * 회전 기준점의 폴백(캔버스 좌표, CR-007). 1순위는 자동 계산(getHandAnchor,
   * §3.6), 그것이 null일 때만 이 값을, 이것도 null이면 패드 중심을 쓴다.
   */
  hand: Point | null
  /**
   * (v0.13, CR-024 · OV-R-25 · ST-R-18) 캔버스 좌표. 펜 쥔 손 그림(pen_up·pen_down_N·pen_key_* 공통)의
   * 왼쪽 위 모서리를 놓는 자리 — 쉬는 자세(팔 회전 0°·늘어남 없음) 기준. null = 아직 놓지 않음
   * (옛 settings.json 호환 경로 — pen_up 첫 등록 때 ui가 기본 위치를 정해 set_settings로 저장).
   * (v0.16, CR-035 · DA-07 · 🔒 U-2 = B) 기본 {x:380, y:496}(v0.15까지 null) — 기본 세트 pen_up
   * 자리. 검증 없음. 필수 필드(penPos? 아님) — Rust가 항상 키를 보낸다.
   */
  penPos: Point | null
  /**
   * (v0.15, CR-033) 펜 손 사용 토글. true = 키보드 입력(·클릭) 때 펜 손 그림 교체 +
   * 키보드 레이어 kb_up 고정. false = pen_up 그림은 팔 끝에 붙어 따라다니되 바뀌지 않고
   * 키보드 그림은 기존대로. 기본 false. 필수 필드(penMode? 아님) — Rust가 항상 키를 보낸다.
   */
  penMode: boolean
}

/** (v0.14, SV2-02) 설정 창 표시 언어. core는 저장만 한다(번역은 ui 몫). 알 수 없는 값은 core가 'ko'로 읽는다. */
export type Language = 'ko' | 'ja' | 'en'

/** (v0.23, CR-048) 스톱워치 또는 카운트다운(§3.9 TimerSnapshot도 같은 타입을 쓴다) */
export type TimerMode = 'stopwatch' | 'countdown'

/**
 * (v0.21, CR-045) 뽀모도 타이머 표시 설정 — 영속. 경과·실행 상태는 여기 없다(TimerSnapshot).
 * (v0.23, CR-048) `mode`·`countdownSecs`·`alarmVolume` 추가 — Rust는 항상 보낸다, 선택 표기(`?`)는
 * ui 테스트 픽스처 호환용이다(contract.md §3.3 v0.23 「선택 표기의 대가」 — 늘 `{...settings.timer, …}`로
 * 펼쳐 보낸다).
 */
export interface TimerSettings {
  /** (v0.23) 스톱워치 또는 타이머 켜짐(의미 확장, 값 불변). 꺼도 글자 표시는 ui 규칙(U-1)을 따르고 시간만 멈춘다 */
  enabled: boolean
  /** (v0.23) Rust는 항상 보낸다. 없으면 'stopwatch' */
  mode?: TimerMode
  /** (v0.23) 카운트다운 시작 시간(초) 1 ~ 359999(99:59:59). Rust는 항상 보낸다. 없으면 1500 */
  countdownSecs?: number
  /** (v0.23) 알림음 음량 % 0 ~ 100 정수. Rust는 항상 보낸다. 없으면 44(v0.27, CR-058/059. CR-053까지: 80) */
  alarmVolume?: number
  /** 시간 글자 상자 **중심**, 캔버스 좌표. 0 ≤ x ≤ 900, 0 ≤ y ≤ 700 */
  textPos: Point
  /** 회전(도, 시계 방향 +). −180 ~ 180 */
  rotation: number
  /** 글자 크기(캔버스 px). 12 ~ 200 */
  fontSize: number
  /** 글자 색 '#rrggbb'(core가 소문자로 저장) */
  color: string
}
export const TIMER_ROTATION_MIN = -180
export const TIMER_ROTATION_MAX = 180
export const TIMER_FONT_SIZE_MIN = 12
export const TIMER_FONT_SIZE_MAX = 200
/** (v0.23, CR-048 · TM-04) 카운트다운 시작 시간(초) 범위. 99:59:59 상한 */
export const TIMER_COUNTDOWN_SECS_MIN = 1
export const TIMER_COUNTDOWN_SECS_MAX = 359_999
/** (v0.23, CR-048 · TM-10) 알림음 음량 상한(%) */
export const TIMER_ALARM_VOLUME_MAX = 100

export interface Settings {
  /** 표시 배율 0.25 ~ 2 */
  scale: number
  /** 무입력 후 쉬는중 전환까지의 초 */
  idleSeconds: number
  overlay: OverlaySettings
  /** 마우스 파츠를 쓰지 않으면 null */
  mouse: MouseSettings | null
  /** (v0.14, SV2-05) 쓰기 경로는 setAutostart·앱 시작 조회 보정뿐 — setSettings 입력값은 무시된다 */
  autostart: boolean
  /** (v0.14, SV2-02) 기본 'ko' */
  language: Language
  /** (v0.14, SV2-03) 기본 false. true = 오버레이 창이 마우스 입력을 통과시킨다(클릭 통과) */
  positionLock: boolean
  /** (v0.14, SV2-04) 기본 false. true = 오버레이 창이 작업표시줄에 보인다 */
  showInTaskbar: boolean
  /** (v0.21, CR-045) 뽀모도 타이머 표시 설정 */
  timer: TimerSettings
}

export interface BridgeError {
  code: string
  message: string
}

// ─── 뽀모도 타이머 (contract.md §3.9, v0.21 · CR-045 / v0.23 · CR-048) ─────
/**
 * restPaused = 쉬는중이라 자동 일시정지(입력 시 자동 재개 — 스톱워치 전용), paused = 사용자
 * 일시정지·타이머 끔(자동 재개 없음), (v0.23) finished = 카운트다운 0 도달 뒤 10초(깜빡임) —
 * core가 10초 뒤 stopped로 되돌린다(카운트다운 전용)
 */
export type TimerStatus = 'stopped' | 'running' | 'paused' | 'restPaused' | 'finished'

/**
 * 이 순간의 타이머. elapsedMs = core가 보낸 순간의 경과(ms, 정수 ≥ 0). ui는 running이면 받은 뒤
 * 흐른 시간을 스스로 더한다. (v0.23) mode·durationMs — Rust는 항상 보낸다, 선택 표기는 ui 테스트
 * 픽스처 호환용이다(없으면 'stopwatch'·0으로 본다)
 */
export interface TimerSnapshot {
  status: TimerStatus
  elapsedMs: number
  /** (v0.23) Rust는 항상 보낸다. 없으면 'stopwatch'(옛 픽스처 호환) */
  mode?: TimerMode
  /** (v0.23) 카운트다운 이번 회차 시작 시간(ms), 스톱워치는 0. Rust는 항상 보낸다. 없으면 0 */
  durationMs?: number
}

/** 사용자 조작. stop = 대기로 초기화(스톱워치 00:00:00, 카운트다운 시작 시간) */
export type TimerAction = 'start' | 'pause' | 'stop'

// ─── 알림음 (contract.md §3.10, v0.23 신규 · CR-048 · TM-07 · TM-08) ───────
export type AlarmFormat = 'wav' | 'mp3' | 'ogg'
/** 등록한 알림음. url = asset 프로토콜(?v=수정 시각 ms). 미등록이면 getAlarmSound가 null을 돌려준다 */
export interface AlarmSound {
  format: AlarmFormat
  bytes: number
  url: string
}

// ─── 이벤트 페이로드 ────────────────────────────────────────────────────────
/**
 * 특수 키 7종 분류값(v0.11, contract.md §3.7, CR-021 · OV-R-22). 🔒 이름 고정.
 * 'undo' = Shift 없는 Ctrl+Z(되돌리기). 대응 슬롯은 AssetSlot 의 `key_{special}`.
 */
export type SpecialKey = 'space' | 'z' | 'question' | 'exclamation' | 'enter' | 'backspace' | 'undo'

export interface KeyboardInputEvent {
  pressed: boolean
  /** 키보드 누름 표시용 — 0이면 들림. 어떤 키인지는 오지 않는다 */
  heldCount: number
  /**
   * (v0.11) 특수 키 7종 분류값 또는 null. 필수 — 선택(?) 필드가 아니다, 항상 온다.
   * 누름 = 누른 순간 판정, 뗌 = 그 키를 누를 때 보낸 값과 같다(§3.7). 키 코드·문자는 오지 않는다(§3.8).
   */
  special: SpecialKey | null
  /**
   * (v0.12, OV-R-24 · CR-023) 필수 — 항상 온다. true = 이미 눌린 키의 OS 자동 반복 누름.
   * 불변식: repeat: true ⇒ pressed: true(뗌 이벤트의 repeat는 항상 false).
   * 반복이면 heldCount는 그대로(불변)이고, special은 그 키를 처음 누를 때 보낸 값 그대로(재판정 없음 —
   * 그사이 Shift·Ctrl을 바꿔도 바뀌지 않는다). Shift·Ctrl·Alt·Win 단독 꾹 누름은 반복 이벤트가 오지
   * 않는다(hook이 내지 않음). 반복이 멈췄다는 별도 이벤트는 없다(🔒 사용자 결정 2026-09-24,
   * 확정사항 §4 키보드 파츠 행 · contract.md §3.7.1).
   */
  repeat: boolean
  /** epoch ms */
  ts: number
}

export interface MouseMoveEvent {
  /** 가상 화면 절대 좌표(물리 픽셀) */
  x: number
  y: number
  ts: number
}

export type MouseButton = 'left' | 'right'

export interface MouseButtonEvent {
  button: MouseButton
  pressed: boolean
  ts: number
}

/** assets://hand-anchor-changed 페이로드 (v0.3, contract.md §3.6, OV-R-14) */
export interface HandAnchorEvent {
  anchor: Point | null
}

export interface ScreenBounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * (v0.14, BRG-012) 창 좌상단(가상 화면 물리 px, 정수) — getOverlayPosition·resetOverlayPosition 반환.
 * 캔버스 좌표 Point(위)와 모양만 같다.
 */
export interface Position {
  x: number
  y: number
}

// ─── 규격 상수 (doc/000_프로젝트_확정사항.md §3) ───────────────────────────
export const SCALE_MIN = 0.25
export const SCALE_MAX = 2
export const CANVAS_MAX_WIDTH = 900
export const CANVAS_MAX_HEIGHT = 700
export const ASSET_MAX_BYTES = 1024 * 1024
export const MOUSE_PART_MAX_SIZE = 256
/** 기본 표시 상자 (봉고캣 호환) */
export const BASE_BOX: CanvasSize = { width: 450, height: 350 }

/** 기본 마우스 파츠 설정 — 예시 몸통(doc/assets/samples/body.png) 기준. Rust settings::default_mouse 와 1:1 */
export const DEFAULT_MOUSE_SETTINGS: MouseSettings = {
  // (v0.20, CR-044) 🔒 사용자 확정값. v0.18~v0.19: {x:558, y:500}.
  shoulder: { x: 582, y: 484 },
  // (v0.9, CR-017) 실측 손 기준점 (435.06, 575.27) 중심 120×100 직사각형. Rust default_area()와 1:1. pad 삭제.
  // (v0.20, CR-044) area 는 이번 변경 대상이 아니다 — 값 불변.
  area: [
    { x: 375, y: 525 }, // 왼쪽 위
    { x: 495, y: 525 }, // 오른쪽 위
    { x: 495, y: 625 }, // 오른쪽 아래
    { x: 375, y: 625 }, // 왼쪽 아래
  ],
  // (v0.20, CR-044) 🔒 사용자 확정값. v0.8~v0.19: {x:389, y:492}.
  partPos: { x: 411, y: 464 },
  // CR-007(2026-09-23): 손 기준점은 mouse_base 이미지에서 자동 계산한다(getHandAnchor).
  // hand 는 자동 계산이 실패할 때만 쓰는 폴백이라 기본값이 없다.
  // 이전 기본값(예시 몸통 기준) — 사용자 지정으로 삭제하지 않고 보존: hand: { x: 495, y: 570 },
  // (v0.20, CR-044) hand 는 이번 변경 대상이 아니다 — 값 불변.
  hand: null,
  // (v0.20, CR-044) 🔒 사용자 확정값. v0.18~v0.19: {x:356, y:504}.
  penPos: { x: 372, y: 476 },
  // (v0.20, CR-044) 🔒 사용자 확정값 — v0.18부터 true 유지(변경 없음).
  penMode: true,
}

/**
 * Rust settings::timer::TimerSettings::default()와 1:1 (U-6 권고값. v0.23, CR-048로 세 필드 추가).
 * (🔒 사용자 지정 2026-09-28, 0.4.0 기본 세트) 새 pomo_char.png 말풍선 기준으로 textPos·rotation·
 * alarmVolume 재조정 — 이전: {x:142, y:458}·9·80.
 */
export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  enabled: false,
  mode: 'stopwatch',
  countdownSecs: 1500,
  alarmVolume: 44,
  textPos: { x: 268, y: 402 },
  rotation: 7,
  fontSize: 36,
  color: '#333333',
}

export const DEFAULT_SETTINGS: Settings = {
  scale: 1,
  idleSeconds: 300,
  overlay: { x: 100, y: 100, visible: true },
  mouse: DEFAULT_MOUSE_SETTINGS,
  autostart: false,
  // (v0.14, SV2-02~04)
  language: 'ko',
  positionLock: false,
  showInTaskbar: false,
  // (v0.21, CR-045)
  timer: DEFAULT_TIMER_SETTINGS,
}
