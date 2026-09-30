/**
 * settings 3개 국어(i18n) 사전 타입 — design/i18n.md §1·§2.
 * ko·ja·en 세 사전이 이 인터페이스를 만족해야 컴파일된다(키 누락·초과·오타를 tsc 가 막는다).
 */

export interface SlotText {
  title: string
  desc: string
}

/**
 * 이미지 설정 탭 슬롯 카드 문구 키 20개(CR-045: pomo_char·pomo_bubble 2개 추가 — 옛 18개.
 * CR-042: pen_key_* 7개 삭제 — 옛 25개) — imageSlots.ts 의 슬롯 종류와 1:1.
 * 손(펜) 그룹은 `pen_up`·`pen_down` 두 종류만 남는다(§3.2).
 */
export type SlotMessageKey =
  | 'background'
  | 'hair' // CR-037 · R-34
  | 'pomo_char' // CR-045 · R-42(design/timer-tab.md §13, i18n §4.9)
  | 'pomo_bubble' // CR-045 · R-42
  | 'kb_up'
  | 'kb_down'
  | 'idle'
  | 'rest'
  | 'key_space'
  | 'key_z'
  | 'key_question'
  | 'key_exclamation'
  | 'key_enter'
  | 'key_backspace'
  | 'key_undo'
  | 'mouse_base'
  | 'mouse_left'
  | 'mouse_right'
  | 'pen_up'
  | 'pen_down'

/**
 * 계약 v0.25 §6 오류 code 정본(26개 + `unknown` = 27개)과 1:1 — CR-035: `asset.no_default`·`asset.export_dir` 추가.
 * CR-045: `timer.disabled` 추가(위치 = `autostart.error` 뒤·`unknown` 앞). CR-049: `autostart.cancelled`
 * 삭제(계약 v0.22 §6 폐기 — 자동 실행이 일반 권한이라 UAC 취소가 없다). CR-050: `sound.not_audio`·
 * `sound.too_many_bytes`·`sound.io` 추가(`timer.disabled` 바로 뒤·`unknown` 앞, 이 순서로 확정 —
 * design/i18n.md §4.9 끝 문단). CR-054: `reset.io`·`reset.seed` 추가(`sound.io` 바로 뒤·`unknown` 앞,
 * design/i18n.md §4.6 CR-054 주). CR-064: `preset.*` 12개 추가(`reset.seed` 뒤·`unknown` 앞, i18n §4.6 CR-064 표 순서). 39개.
 */
export type ErrorCode =
  | 'asset.not_png'
  | 'asset.bad_header'
  | 'asset.not_rgba'
  | 'asset.too_large'
  | 'asset.too_many_bytes'
  | 'asset.canvas_mismatch'
  | 'asset.not_found'
  | 'asset.io'
  | 'asset.manifest'
  | 'asset.no_default'
  | 'asset.export_dir'
  | 'settings.invalid'
  | 'settings.io'
  | 'settings.format'
  | 'io.error'
  | 'window.not_found'
  | 'window.no_monitor'
  | 'tauri.error'
  | 'state.poisoned'
  | 'autostart.error'
  | 'timer.disabled' // CR-045
  | 'sound.not_audio' // CR-050
  | 'sound.too_many_bytes' // CR-050
  | 'sound.io' // CR-050
  | 'reset.io' // CR-054
  | 'reset.seed' // CR-054
  | 'preset.not_found' // CR-064
  | 'preset.invalid_name' // CR-064
  | 'preset.missing_required' // CR-064
  | 'preset.not_preset' // CR-064
  | 'preset.format' // CR-064
  | 'preset.invalid_settings' // CR-064
  | 'preset.damaged' // CR-064
  | 'preset.bad_dir' // CR-064
  | 'preset.export_exists' // CR-064
  | 'preset.io' // CR-064
  | 'preset.file_missing' // CR-064
  | 'preset.file_link' // CR-064
  | 'unknown'

export const ERROR_CODES: readonly ErrorCode[] = [
  'asset.not_png',
  'asset.bad_header',
  'asset.not_rgba',
  'asset.too_large',
  'asset.too_many_bytes',
  'asset.canvas_mismatch',
  'asset.not_found',
  'asset.io',
  'asset.manifest',
  'asset.no_default',
  'asset.export_dir',
  'settings.invalid',
  'settings.io',
  'settings.format',
  'io.error',
  'window.not_found',
  'window.no_monitor',
  'tauri.error',
  'state.poisoned',
  'autostart.error',
  'timer.disabled', // CR-045
  'sound.not_audio', // CR-050
  'sound.too_many_bytes', // CR-050
  'sound.io', // CR-050
  'reset.io', // CR-054
  'reset.seed', // CR-054
  'preset.not_found', // CR-064
  'preset.invalid_name', // CR-064
  'preset.missing_required', // CR-064
  'preset.not_preset', // CR-064
  'preset.format', // CR-064
  'preset.invalid_settings', // CR-064
  'preset.damaged', // CR-064
  'preset.bad_dir', // CR-064
  'preset.export_exists', // CR-064
  'preset.io', // CR-064
  'preset.file_missing', // CR-064
  'preset.file_link', // CR-064
  'unknown',
]

export interface Messages {
  // ─── §4.1 공통·창 ──────────────────────────────────────────────────────
  windowTitle: string
  pickTitle: string
  tabsAria: string
  tabGeneral: string
  tabImages: string
  tabMouse: string
  errorPrefix: string
  // ─── §4.2 기본 설정 탭 ─────────────────────────────────────────────────
  cardLanguage: string
  languageAria: string
  cardScale: string
  scaleLabel: string
  scaleDesc: string
  idleLabel: string
  idleUnit: string
  idleDesc: string
  idleRangeHint: string
  cardWindow: string
  resetPosition: string
  lockLabel: string
  lockDesc: string
  cardStartup: string
  taskbarLabel: string
  taskbarDesc: string
  autostartLabel: string
  autostartDesc: string
  autostartPending: string
  // ─── §4.11 CR-054 전체 초기화(8키) ──────────────────────────────────────
  cardReset: string
  resetAll: string
  resetAllDesc: string
  confirmResetAllTitle: string
  confirmResetAllMessage: string
  confirmResetAllOk: string
  resetAllPending: string
  resetAllDone: string
  // ─── §4.3 이미지 설정 탭 ───────────────────────────────────────────────
  imagesNote: string
  groupBackground: string
  groupKeyboard: string
  groupArm: string
  groupHand: string
  badgeRequired: string
  badgeOptional: string
  emptyOptional: string
  emptyRequired: string
  changeImage: string
  changeImageAria: string
  clearImage: string
  clearImageAria: string
  clearLastOnly: string
  addKbDown: string
  // addPenDown: CR-042 삭제(펜 입력 추가 카드 없음 — i18n.md §4.4 CR-042 블록 1)
  confirmClearTitle: string
  confirmClearMessage: string
  confirmClearOk: string
  confirmCancel: string
  // ─── §4.3 CR-033 펜 손 사용 토글(11키) ─────────────────────────────────
  penModeLabel: string
  penModeDesc: string
  penModeNoteOn: string
  penModeNoteOff: string
  penEnableTitle: string
  penEnableMessage: string
  penEnableOk: string
  penFirstTitle: string
  penFirstMessage: string
  penFirstYes: string
  penFirstNo: string
  // ─── §4.7 CR-035 기본 이미지 세트(12키) ────────────────────────────────
  restoreImageAria: string
  confirmRestoreTitle: string
  confirmRestoreMessage: string
  confirmRestoreOk: string
  downloadDefaults: string
  downloadDefaultsDesc: string
  pickFolderTitle: string
  exportConflictTitle: string
  exportConflictMessage: string
  exportConflictOk: string
  exportDone: string
  exportPartial: string
  // ─── §4.8 CR-038 R-35 뒷머리 비우기(2키) ───────────────────────────────
  emptyImage: string
  emptyImageAria: string
  // ─── §4.9 CR-045 뽀모도 타이머 + §4.10 CR-050 타이머 모드·알림음 ───────
  // (`Shell`·`TimerTab`·`TimerPreview`·`CountdownTimeInput`·`AlarmSoundCard`)
  // CR-050: timerEnabled·timerEnabledDesc 삭제(두 토글로 대체) — 15 + 22 = 37키
  tabTimer: string
  timerCardTitle: string
  // CR-052: timerCardDesc 삭제(스톱워치 토글 설명 한 곳으로)
  timerStopwatchEnabled: string // CR-050
  timerStopwatchDesc: string // CR-050
  timerCountdownEnabled: string // CR-050
  timerCountdownDesc: string // CR-050
  timerDuration: string // CR-050
  timerDurationHint: string // CR-050
  timerDurationInvalid: string // CR-050
  timerDurationLocked: string // CR-050
  timerHoursAria: string // CR-050
  timerMinutesAria: string // CR-050
  timerSecondsAria: string // CR-050
  timerStart: string
  timerPause: string
  timerStop: string
  timerStopHint: string // CR-050: 문구 변경(스톱워치·타이머 공통 안내)
  timerControlsAria: string
  alarmCardTitle: string // CR-050
  alarmCardDesc: string // CR-050
  alarmCurrentDefault: string // CR-050
  alarmCurrentCustom: string // CR-050
  alarmImport: string // CR-050
  alarmPreview: string // CR-050
  alarmReset: string // CR-050
  alarmFileHint: string // CR-050
  alarmVolume: string // CR-050
  alarmPickTitle: string // CR-050
  alarmPreviewFailed: string // CR-050
  timerTextTitle: string
  timerTextDesc: string
  timerPreviewAria: string
  timerTextDragAria: string
  timerRotation: string
  timerSize: string
  timerColor: string
  // ─── §4.5 어깨축·손 위치 탭(기존 labels.ts 키, 이름 유지) ──────────────
  previewNoBody: string
  wizardIdle: string
  wizardStart: string
  wizardPickShoulder: string
  wizardReview: string
  wizardSave: string
  wizardCancel: string
  resetDefault: string
  markerShoulder: string
  markerPart: string
  markerPen: string
  areaDesc: string // CR-057
  areaStart: string
  areaPick1: string
  areaPick2: string
  areaPick3: string
  areaPick4: string
  areaReview: string
  markerArea: string
  areaCorner1: string
  areaCorner2: string
  areaCorner3: string
  areaCorner4: string
  // ─── §4.12 CR-064 프리셋(36키)
  tabPresets: string
  cardPresetSave: string
  presetSaveDesc: string
  presetNameLabel: string
  presetNamePlaceholder: string
  presetSave: string
  presetSaveNeedsRequired: string
  presetSaved: string
  presetImport: string
  presetImportDesc: string
  presetImported: string
  presetImportFailed: string
  pickPresetFolderTitle: string
  pickExportFolderTitle: string
  cardPresetList: string
  presetListEmpty: string
  presetSavedAt: string
  presetImageCount: string
  presetHasAlarm: string
  presetNoAlarm: string
  presetPreviewUnavailable: string
  presetApply: string
  presetExport: string
  presetRename: string
  presetDelete: string
  presetRenameSave: string
  presetApplied: string
  presetExported: string
  presetDeleted: string
  confirmPresetApplyTitle: string
  confirmPresetApplyMessage: string
  confirmPresetApplyOk: string
  confirmPresetDeleteTitle: string
  confirmPresetDeleteMessage: string
  confirmPresetDeleteOk: string
  presetActionAria: string
  presetRenameInputAria: string
  // ─── §4.4 슬롯 카드 문구 · §4.6 오류 문구 ──────────────────────────────
  slots: Record<SlotMessageKey, SlotText>
  errors: Record<ErrorCode, string>
}
