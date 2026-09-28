/**
 * settings 영어 사전 — design/i18n.md §4(en 열). 검수 필요(사용자) — 전 문구.
 */
import type { Messages } from './types'

const SAME_KEY = 'While that key is held (otherwise the press image)'

export const en: Messages = {
  // 공통·창
  windowTitle: 'kuro_keyviewer Settings',
  pickTitle: 'Select a PNG image',
  tabsAria: 'Settings tabs',
  tabGeneral: 'General',
  tabImages: 'Images',
  tabMouse: 'Shoulder & Hand',
  errorPrefix: 'Error:',
  // 기본 설정 탭
  cardLanguage: 'Language',
  languageAria: 'Display language',
  cardScale: 'Size & Response',
  scaleLabel: 'Scale',
  scaleDesc:
    'Character display size ({min}%–{max}%). You can also use Ctrl+Wheel on the overlay (only here while the position is locked).',
  idleLabel: 'Idle time',
  idleUnit: 'min',
  idleDesc: 'If there is no input for this long, the resting image is shown ({min}–{max} min).',
  idleRangeHint: 'Enter a whole number from {min} to {max} (minutes). Not saved.',
  cardWindow: 'Window',
  resetPosition: 'Reset position',
  lockLabel: 'Lock position (click-through)',
  lockDesc:
    'When on, mouse clicks pass through the character and it cannot be dragged. You can unlock it only from this settings window.',
  cardStartup: 'Taskbar & Startup',
  taskbarLabel: 'Show in taskbar',
  taskbarDesc: 'When on, the character window gets a taskbar button. The tray icon stays.',
  autostartLabel: 'Launch at startup',
  autostartDesc:
    'When on, the app starts automatically when you sign in to Windows. To detect input in games running as administrator, run this app as administrator yourself.',
  autostartPending: 'Changing the startup setting…',
  // Reset all (CR-054) — needs review
  cardReset: 'Reset',
  resetAll: 'Reset all',
  resetAllDesc:
    'Restores your images, alarm sound, and all settings to the just-installed state (default images). Your language and startup settings are kept.',
  confirmResetAllTitle: 'Reset all',
  confirmResetAllMessage:
    'Remove your images, alarm sound, and settings and return to the just-installed state? Your language and startup settings are kept, and the overlay returns to its default position. This cannot be undone.',
  confirmResetAllOk: 'Reset',
  resetAllPending: 'Resetting…',
  resetAllDone: 'Reset complete.',
  // 이미지 설정 탭
  imagesNote:
    'Only PNG (32-bit RGBA), up to {w}×{h} and 1 MB. Make all background, back hair, pomodoro, and keyboard images the same size.', // CR-045: added "pomodoro"
  groupBackground: 'Background',
  groupKeyboard: 'Keyboard (body)',
  groupArm: 'Arm (mouse)',
  groupHand: 'Hand (pen)',
  badgeRequired: 'Required',
  badgeOptional: 'Optional',
  emptyOptional: 'No image',
  emptyRequired: 'Required · not set',
  changeImage: 'Change image',
  changeImageAria: 'Change image: {name}',
  clearImage: 'Reset',
  clearImageAria: 'Remove image: {name}',
  clearLastOnly: 'Remove the last image first.',
  addKbDown: '+ Add press image',
  // addPenDown: CR-042 removed (no hand press add card)
  confirmClearTitle: 'Remove image',
  confirmClearMessage: 'Remove the image "{name}"? This cannot be undone.',
  confirmClearOk: 'Remove',
  confirmCancel: 'Cancel',
  // 펜 손 사용 토글(CR-033) — 검수 필요
  penModeLabel: 'Use pen hand',
  penModeDesc: 'Register the "Hand" image to turn this on.',
  penModeNoteOn:
    'ON: the hand image at the end of the arm changes with each key press and click, and the keyboard image stays on the base image except while a special key is held (then its special key image is shown).', // CR-042
  penModeNoteOff: 'OFF: the hand image only follows the end of the arm, and key presses are shown with the keyboard images.',
  penEnableTitle: 'Turn on pen hand',
  penEnableMessage:
    'When on, the hand image at the end of the arm changes with each key press and click, and the keyboard image stays on the base image except while a special key is held (then its special key image is shown). Turn it on?', // CR-042
  penEnableOk: 'Turn on',
  penFirstTitle: 'Pen hand mode',
  penFirstMessage:
    'Turn on pen hand mode? When on, the hand image at the end of the arm changes with each key press and click, and the keyboard image stays on the base image except while a special key is held (then its special key image is shown).', // CR-042
  penFirstYes: 'Yes',
  penFirstNo: 'No',
  // Default asset set (CR-035) — needs review
  restoreImageAria: 'Restore default image: {name}',
  confirmRestoreTitle: 'Restore default image',
  confirmRestoreMessage:
    'Restore "{name}" to the built-in default image? The current image will be removed. This cannot be undone.',
  confirmRestoreOk: 'Restore',
  downloadDefaults: 'Download default images',
  downloadDefaultsDesc:
    'Saves the {n} built-in default images to a folder at their original size. Use them to trace or edit.',
  pickFolderTitle: 'Select a folder to save the default images',
  exportConflictTitle: 'Files with the same name exist',
  exportConflictMessage:
    'This folder already has {n} file(s) with the same name. Overwrite all of them? Overwritten files cannot be restored.',
  exportConflictOk: 'Overwrite',
  exportDone: 'Saved {n} default images.',
  exportPartial: 'Saved {ok}, failed {fail}: {files}',
  // Back hair clear (CR-038 R-35) — needs review
  emptyImage: 'Clear',
  emptyImageAria: 'Clear image: {name}',
  // Pomodoro timer (CR-045) + timer mode & alarm sound (CR-050) — needs review
  tabTimer: 'Timer',
  timerCardTitle: 'Pomodoro timer',
  timerStopwatchEnabled: 'Use stopwatch',
  timerStopwatchDesc:
    'Shows a time counting up from 0 inside the speech bubble. It stops by itself while resting and continues when you use the keyboard or mouse again.', // CR-052
  timerCountdownEnabled: 'Use timer',
  timerCountdownDesc: 'Counts down to zero. Keeps running while resting',
  timerDuration: 'Start time',
  timerDurationHint: 'Up to 99:59:59',
  timerDurationInvalid: 'Enter a time between 00:00:01 and 99:59:59',
  timerDurationLocked: 'You can change this while stopped',
  timerHoursAria: 'Hours',
  timerMinutesAria: 'Minutes',
  timerSecondsAria: 'Seconds',
  timerStart: 'Start',
  timerPause: 'Pause',
  timerStop: 'Stop',
  timerStopHint: 'Stop returns to the starting time', // CR-050 change (was "resets to 00:00:00")
  timerControlsAria: 'Timer controls',
  alarmCardTitle: 'Alarm sound',
  alarmCardDesc: 'When the timer reaches zero, it repeats during the 10 seconds of blinking', // CR-052
  alarmCurrentDefault: 'Current: default sound',
  alarmCurrentCustom: 'Current: custom sound ({format} · {size} KB)',
  alarmImport: 'Choose file',
  alarmPreview: 'Preview',
  alarmReset: 'Use default',
  alarmFileHint: 'wav, mp3, or ogg, up to 1 MB',
  alarmVolume: 'Volume',
  alarmPickTitle: 'Choose a sound file',
  alarmPreviewFailed: 'Could not play this file',
  timerTextTitle: 'Time text',
  timerTextDesc:
    'Drag the text in the preview to move it, then pick rotation, size and color below. Add the pomodoro character and bubble images in the Background group of the Images tab.',
  timerPreviewAria: 'Time text position preview',
  timerTextDragAria: 'Time text — drag to move',
  timerRotation: 'Rotation',
  timerSize: 'Size',
  timerColor: 'Text color',
  // 어깨축·손 위치 탭
  previewNoBody: 'No character image (kb_up) is registered.',
  wizardIdle: 'Set the shoulder pivot and the arm part rotates around that point.',
  wizardStart: 'Set shoulder pivot',
  wizardPickShoulder: 'Click the point to use as the pivot.',
  wizardReview: 'Check the pivot position and save.',
  wizardSave: 'Save',
  wizardCancel: 'Cancel',
  resetDefault: 'Reset to defaults',
  markerShoulder: 'Pivot (shoulder)',
  markerPart: 'Part position',
  markerPen: 'Hand position',
  // CR-057: 이동 영역 설명(대기 상태, 버튼 위)
  areaDesc:
    'As you move the mouse, the hand follows it inside this rectangle. Click the four corners on the picture in order to make the rectangle.',
  areaStart: 'Set rectangular movement area',
  areaPick1: '1/4 Click the top-left corner of the rectangle.',
  areaPick2: '2/4 Now click the top-right corner.',
  areaPick3: '3/4 Now click the bottom-right corner.',
  areaPick4: '4/4 Finally, click the bottom-left corner.',
  areaReview: 'Check that the rectangle looks right, then save.',
  markerArea: 'Movement area',
  areaCorner1: 'Top left',
  areaCorner2: 'Top right',
  areaCorner3: 'Bottom right',
  areaCorner4: 'Bottom left',
  slots: {
    background: { title: 'Background', desc: 'Always shown at the very bottom' },
    // CR-037 · R-34
    hair: { title: 'Back hair', desc: 'Parts shown behind the arm, like long back hair. Moves with the body' },
    // CR-045 · R-42 — needs review
    pomo_char: {
      title: 'Pomodoro character',
      desc: "A second character standing by the timer. Fixed like the background; it doesn't bounce",
    },
    pomo_bubble: { title: 'Pomodoro bubble', desc: 'The speech bubble that holds the time. Fixed like the background' },
    kb_up: { title: 'Base', desc: 'When idle. You may draw the whole character' },
    // CR-043(R-40): translation review pending — design/i18n.md §4.4 CR-043 draft
    kb_down: { title: 'Press {n}', desc: 'Shown when you type with "Use pen hand" off (keyboard only). Alternates if several' },
    idle: { title: 'Waiting', desc: 'If empty, only the base image is shown' },
    rest: { title: 'Resting', desc: 'After a while with no input. If empty, only the base image is shown' },
    key_space: { title: 'Space', desc: SAME_KEY },
    key_z: { title: 'ㅋ/Z', desc: SAME_KEY },
    key_question: { title: '?', desc: SAME_KEY },
    key_exclamation: { title: '!', desc: SAME_KEY },
    key_enter: { title: 'Enter', desc: SAME_KEY },
    key_backspace: { title: 'Backspace', desc: SAME_KEY },
    key_undo: { title: 'Ctrl+Z', desc: SAME_KEY },
    mouse_base: { title: 'Arm', desc: 'The arm that follows the mouse' },
    mouse_left: { title: 'Left click', desc: 'While the left button is held' },
    mouse_right: { title: 'Right click', desc: 'While the right button is held' },
    // (CR-042, R-39) Hand (pen) group has two cards — 7 special-key cards removed, new behavior — needs review
    pen_up: {
      title: 'Hand',
      desc: 'The pen-holding hand at the end of the arm. With "Use pen hand" on, shown while nothing is pressed',
    },
    pen_down: {
      title: 'Hand press {n}',
      desc: "The hand while a key or click is pressed. Special keys also switch the keyboard's special key image",
    },
  },
  errors: {
    'asset.not_png': 'This is not a PNG file.',
    'asset.bad_header': 'The PNG header is corrupted.',
    'asset.not_rgba': 'Only 32-bit RGBA PNG images are supported (transparent background required).',
    'asset.too_large': 'The image is too large. The maximum is 900×700.',
    'asset.too_many_bytes': 'The file is larger than 1 MB.',
    'asset.canvas_mismatch': 'All background, back hair, pomodoro, and keyboard images must be the same size.', // CR-045: added "pomodoro"
    'asset.not_found': 'This image is not registered.',
    'asset.io': 'The file could not be processed.',
    'asset.manifest': 'The image list file could not be read or written.',
    'asset.no_default': 'This slot has no built-in default image.',
    'asset.export_dir': 'The folder to save to could not be found.',
    'settings.invalid': 'A setting value is invalid.',
    'settings.io': 'The settings file could not be read or written.',
    'settings.format': 'The settings file format is invalid.',
    'io.error': 'The file could not be processed.',
    'window.not_found': 'The character window could not be found.',
    'window.no_monitor': 'Monitor information could not be read.',
    'tauri.error': 'The window could not be controlled.',
    'state.poisoned': 'The settings state is corrupted. Please restart the app.',
    'autostart.error': 'The startup setting could not be changed.',
    'timer.disabled': 'The stopwatch and timer are both off. Turn one of them on first.', // CR-050 change
    'sound.not_audio': 'This is not a wav, mp3, or ogg sound file.',
    'sound.too_many_bytes': 'The sound file must be 1 MB or smaller.',
    'sound.io': 'Could not read or write the sound file.',
    'reset.io': 'Could not reset all data (some of it may already be reset). The app will try again the next time it starts.',
    'reset.seed': 'Could not restore the default images. The app will try again the next time it starts.',
    unknown: 'An unknown error occurred.',
  },
}
