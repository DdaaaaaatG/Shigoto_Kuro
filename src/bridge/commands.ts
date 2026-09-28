/**
 * bridge 명령(invoke) 래퍼. 화면 코드는 @tauri-apps/api/core 를 직접 쓰지 않고 이 함수들만 쓴다.
 * 명령 이름·인자는 src-tauri/src/bridge/commands.rs 와 1:1 (Rust snake_case 인자 → JS camelCase).
 * 모든 실패는 BridgeError 형태로 정규화해 던진다.
 */
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { open } from '@tauri-apps/plugin-dialog'
import type {
  AlarmSound,
  AssetManifest,
  AssetSlot,
  BridgeError,
  ExportReport,
  Position,
  ScreenBounds,
  Settings,
  Point,
  TimerAction,
  TimerSnapshot,
} from './types'

const isBridgeError = (e: unknown): e is BridgeError =>
  typeof e === 'object' &&
  e !== null &&
  typeof (e as BridgeError).code === 'string' &&
  typeof (e as BridgeError).message === 'string'

export const toBridgeError = (e: unknown): BridgeError => {
  if (isBridgeError(e)) return e
  if (e instanceof Error) return { code: 'unknown', message: e.message }
  if (typeof e === 'string') return { code: 'unknown', message: e }
  return { code: 'unknown', message: '알 수 없는 오류' }
}

const call = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  try {
    return await invoke<T>(cmd, args)
  } catch (e) {
    throw toBridgeError(e)
  }
}

// ─── 설정 ──────────────────────────────────────────────────────────────────
export const getSettings = () => call<Settings>('get_settings')
export const setSettings = (settings: Settings) => call<Settings>('set_settings', { settings })

// ─── 에셋 ──────────────────────────────────────────────────────────────────
export const getAssetManifest = () => call<AssetManifest>('get_asset_manifest')
export const importAsset = (slot: AssetSlot, path: string) =>
  call<AssetManifest>('import_asset', { slot, path })
export const removeAsset = (slot: AssetSlot) => call<AssetManifest>('remove_asset', { slot })

/**
 * (v0.16, CR-035 · DA-03) 슬롯을 앱에 내장된 기본 그림으로 되돌린다. 후처리·이벤트는
 * importAsset과 같다(contract.md §5·§5.7). 내장 기본이 없는 슬롯은 asset.no_default로 거부.
 */
export const restoreDefaultAsset = (slot: AssetSlot) =>
  call<AssetManifest>('restore_default_asset', { slot })

/**
 * (v0.16, CR-035 · DA-05) 내장 기본 그림 15장을 dir(절대 경로)에 원본 바이트 그대로 쓴다.
 * overwrite: false이고 충돌이 있으면 아무것도 쓰지 않고 conflicts만 채워 반환한다
 * (contract.md §5·§5.7 — 「덮어쓸까요?」 확인 뒤 true로 다시 부른다). 부수 효과 없음.
 */
export const exportDefaultAssets = (dir: string, overwrite: boolean) =>
  call<ExportReport>('export_default_assets', { dir, overwrite })

/**
 * 손 기준점 캐시를 그대로 반환한다(v0.3, contract.md §3.6·§5, OV-R-14). 부수 효과 없음.
 * null 이면 ui가 `mouse.hand` → 이동 영역 중심(v0.9) 순으로 폴백한다.
 */
export const getHandAnchor = () => call<Point | null>('get_hand_anchor')

// ─── 창·화면 ───────────────────────────────────────────────────────────────
export const getScreenBounds = () => call<ScreenBounds>('get_screen_bounds')
/**
 * 모니터마다 전체 사각형 1개(물리 px, 가상 화면 좌표)를 OS 열거 순서로 반환한다
 * (v0.9, CR-017, contract.md §5 getMonitors). 부수 효과·캐시 없음. 모니터 구성 변경 event는
 * 없다 — 커서가 받아 둔 사각형 밖으로 나가면 ui가 다시 부른다.
 */
export const getMonitors = () => call<ScreenBounds[]>('get_monitors')
export const getOverlayPosition = () => call<Position>('get_overlay_position')
export const setOverlayPosition = (x: number, y: number) =>
  call<void>('set_overlay_position', { x, y })
export const setOverlayVisible = (visible: boolean) =>
  call<void>('set_overlay_visible', { visible })
/**
 * (v0.14, SV2-06) 오버레이를 기본 위치((100,100))로 옮기고 저장 후 새 위치를 반환한다.
 * 숨김이어도 옮기고, 위치 잠금 중에도 동작한다(contract.md §5.6).
 */
export const resetOverlayPosition = () => call<Position>('reset_overlay_position')
/**
 * (v0.14, SV2-05. v0.22, CR-047로 절차 갱신) 작업 스케줄러 등록/해제 — 일반 권한(승격 없음),
 * 자식 프로세스(schtasks) 실행만 기다려 보통 1초 안팎이다. UAC 대기는 없다(contract.md §5.5).
 * 동시 재호출은 ui가 막는다.
 */
export const setAutostart = (enabled: boolean) => call<boolean>('set_autostart', { enabled })
export const openSettingsWindow = () => call<void>('open_settings_window')

// ─── 뽀모도 타이머 (contract.md §5·§5.8, v0.21 · CR-045) ────────────────────
/** 지금 타이머 사진. 부수 효과 없음(emit 없음). 창은 onTimerChanged 구독 뒤에 부른다(§5.8-3) */
export const getTimer = () => call<TimerSnapshot>('get_timer')
/** 사용자 조작(시작·일시정지·멈춤). 타이머가 꺼져 있으면 timer.disabled로 거부 */
export const controlTimer = (action: TimerAction) => call<TimerSnapshot>('control_timer', { action })
/** 오버레이가 쉬는중 진입(true)·해제(false)를 알린다. 판정 주체는 오버레이 상태기계.
 * (v0.23) 카운트다운이면 core가 항상 변화 없음을 돌려준다(쉬는중에도 계속 줄어든다) — 오버레이는
 * 모드를 보지 않고 그대로 부른다 */
export const setResting = (resting: boolean) => call<TimerSnapshot>('set_resting', { resting })

// ─── 알림음 (contract.md §3.10·§5·§5.9, v0.23 신규 · CR-048) ────────────────
/** 등록한 알림음 1개, 없으면 null. 부수 효과 없음(emit 없음). 오버레이는 finished 진입 때 1회,
 * 설정 창은 마운트 때 조회한다(§5.9-1) */
export const getAlarmSound = () => call<AlarmSound | null>('get_alarm_sound')
/** 사용자 소리 파일을 등록한다(path는 pickAudioFile 결과 그대로). 이벤트 없음(A-1) — 다른 창은
 * 쓸 때 getAlarmSound로 다시 조회한다 */
export const importAlarmSound = (path: string) =>
  call<AlarmSound>('import_alarm_sound', { path })
/** 알림음을 지워 기본음으로 되돌린다(core가 세 형식 파일 모두 삭제, 없으면 무시 — 멱등).
 * 이벤트 없음(A-1) */
export const removeAlarmSound = () => call<void>('remove_alarm_sound')

// ─── 데이터 초기화 (contract.md §5·§5.10, v0.25 신규 · data-reset) ──────────
/**
 * 🔒 베타 전용(02-design §0 R-A·R-B). 앱 데이터(그림·매니페스트·알림음)를 전부 지우고 내장
 * 기본 7장으로 되돌린다. 언어·자동 실행은 유지, 오버레이 위치는 기본값으로. 결과는 반환값이
 * 아니라 settings://changed·assets://changed 이벤트와 오버레이 새로고침으로 받는다 — 설정 창은
 * 확인 창(ui 몫) 뒤에 호출하고, 응답 전까지 다른 조작을 막는다(02-design §2 resetPhase).
 */
export const resetAppData = () => call<void>('reset_app_data')

const PICK_PNG_DEFAULT_TITLE = 'PNG 이미지 선택'

// ─── 파일 선택 (dialog 플러그인 — 화면에서 직접 import 하지 않도록 여기서 감싼다) ─
/** (v0.14, SV2-02·SV2-07) title 생략 시 기존 기본 문구. 실패는 BridgeError 로 정규화한다(contract.md §5.4). */
export const pickPngFile = async (title?: string): Promise<string | null> => {
  try {
    const picked = await open({
      multiple: false,
      directory: false,
      title: title ?? PICK_PNG_DEFAULT_TITLE,
      filters: [{ name: 'PNG', extensions: ['png'] }],
    })
    return typeof picked === 'string' ? picked : null
  } catch (e) {
    throw toBridgeError(e)
  }
}

const PICK_FOLDER_DEFAULT_TITLE = '폴더 선택'

/**
 * (v0.16, CR-035 · DA-05) 폴더를 고른다 — exportDefaultAssets의 dir 인자로 그대로 넘긴다.
 * title 생략 시 '폴더 선택'. 기존 dialog:allow-open 권한으로 허용된다(contract.md §5.4).
 */
export const pickFolder = async (title?: string): Promise<string | null> => {
  try {
    const picked = await open({
      directory: true,
      multiple: false,
      title: title ?? PICK_FOLDER_DEFAULT_TITLE,
    })
    if (Array.isArray(picked)) return picked[0] ?? null
    return typeof picked === 'string' ? picked : null
  } catch (e) {
    throw toBridgeError(e)
  }
}

const PICK_AUDIO_DEFAULT_TITLE = '소리 파일 선택'

/**
 * (v0.23, CR-048 · TM-08) 알림음 파일을 고른다 — importAlarmSound의 path 인자로 그대로 넘긴다.
 * title 생략 시 '소리 파일 선택'. 필터는 고르기 편의일 뿐 — 형식 판정은 core(앞 바이트, §5.9-2).
 * 기존 dialog:allow-open 권한으로 허용된다(contract.md §5.4).
 */
export const pickAudioFile = async (title?: string): Promise<string | null> => {
  try {
    const picked = await open({
      multiple: false,
      directory: false,
      title: title ?? PICK_AUDIO_DEFAULT_TITLE,
      filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg'] }],
    })
    if (Array.isArray(picked)) return picked[0] ?? null
    return typeof picked === 'string' ? picked : null
  } catch (e) {
    throw toBridgeError(e)
  }
}

/**
 * (v0.14, SV2-02·D-6) 설정 창 제목 표시줄 문구를 바꾼다 — 설정 창에서만 부른다(오버레이 창에는
 * 권한이 없어 reject, contract.md §5.4). 실패는 BridgeError 로 정규화한다.
 */
export const setSettingsWindowTitle = async (title: string): Promise<void> => {
  try {
    await getCurrentWindow().setTitle(title)
  } catch (e) {
    throw toBridgeError(e)
  }
}
