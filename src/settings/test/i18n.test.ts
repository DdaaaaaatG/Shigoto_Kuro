/**
 * settings 3개 국어(i18n) 스펙 — CR-028 · R-20(R-19·R-25 문구 포함).
 * 기준: src/settings/design/i18n.md §1~§5 · scenarios.md TC-093 ~ TC-098 · 수용 기준 U-4.
 * import 경로는 design/i18n.md §1 파일 표를 따른다(구현 전 Red — 파일이 없으면 import 오류가 예정된 실패).
 * ja·en 문구는 「검수 필요(사용자)」라 전 문구 정확 비교는 §4.1(공통·창)만 한다. 나머지는 키 집합·빈 문자열 없음으로 고정.
 * (CR-037, requirements v1.12 R-34 · i18n §4.3 imagesNote·§4.4 slots.hair·§4.6 asset.canvas_mismatch)
 *   개정: SLOT_KEYS 25개(hair), EXPECTED_KO_NEW.imagesNote·EXPECTED_KO_SLOTS.hair·EXPECTED_KO_ERRORS['asset.canvas_mismatch']
 *         (CR-036 문구 「배경·키보드」 → 「배경·뒷머리·키보드」), TC-096 imagesNote 치환 기대값. 신규: TC-197.
 * (CR-042, requirements v1.15 R-39 · i18n §4.4 CR-042 블록) 개정: SLOT_KEYS 18개(pen_key_* 7 삭제), EXPECTED_KO_NEW
 *   addPenDown·SAME_PEN 삭제, pen_up·pen_down 설명, TC-094 단순 키 93. 신규: TC-228. scenarios.md 「CR-042 개정」 절.
 */
import { createElement, type ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BridgeError } from 'bridge/types'
import { ko } from '../i18n/ko'
import { ja } from '../i18n/ja'
import { en } from '../i18n/en'
import { ERROR_CODES } from '../i18n/types'
import { LANGUAGES, LANGUAGE_NAMES, MESSAGES, errorText, format, messagesFor } from '../i18n/index'
import { MessagesProvider, useLanguage, useMessages } from '../i18n/MessagesContext'

/** design/i18n.md §4.6 표 순서 = contract v0.14 §6 코드 목록(20개, `unknown` 포함) */
const EXPECTED_ERROR_CODES = [
  'asset.not_png',
  'asset.bad_header',
  'asset.not_rgba',
  'asset.too_large',
  'asset.too_many_bytes',
  'asset.canvas_mismatch',
  'asset.not_found',
  'asset.io',
  'asset.manifest',
  'asset.no_default', // CR-035(contract v0.16 §6, i18n §4.6 — 20 → 22개)
  'asset.export_dir', // CR-035
  'settings.invalid',
  'settings.io',
  'settings.format',
  'io.error',
  'window.not_found',
  'window.no_monitor',
  'tauri.error',
  'state.poisoned',
  'autostart.error',
  // 'autostart.cancelled': CR-049 폐기(contract v0.22 §6 · i18n §4.6 — 23 → 22개)
  'timer.disabled', // CR-045(contract v0.21 §6, i18n §4.9 — 22 → 23개). 위치 = autostart.error 뒤·unknown 앞(CR-049 뒤)
  'sound.not_audio', // CR-050(contract v0.23 §6, i18n §4.10 — 22 → 25개). timer.disabled 바로 뒤·unknown 앞, 이 순서로 확정
  'sound.too_many_bytes', // CR-050
  'sound.io', // CR-050
  'reset.io', // CR-054(contract v0.25 §6, i18n §4.6 CR-054 주 — 25 → 27개). sound.io 바로 뒤·unknown 앞, 이 순서로 확정
  'reset.seed', // CR-054
  // CR-064(contract v0.30 §6, i18n §4.6 CR-064 추가분 — 27 → 39개). reset.seed 바로 뒤·unknown 앞, 계약 표 순서. preset.forbidden 제외
  'preset.not_found',
  'preset.invalid_name',
  'preset.missing_required',
  'preset.not_preset',
  'preset.format',
  'preset.invalid_settings',
  'preset.damaged',
  'preset.bad_dir',
  'preset.export_exists',
  'preset.io',
  'preset.file_missing',
  'preset.file_link',
  'unknown',
]

/** CR-064(i18n §4.6 CR-064 추가분 ko 열 — 정확 일치) */
const EXPECTED_KO_PRESET_ERRORS = {
  'preset.not_found': '프리셋을 찾을 수 없습니다. 목록을 다시 확인하세요.',
  'preset.invalid_name': '프리셋 이름은 1~50자로 입력하세요.',
  'preset.missing_required': '필수 그림(키보드 기본·팔)이 없습니다.',
  'preset.not_preset': '프리셋 폴더가 아닙니다. preset.json이 있는 폴더를 고르세요.',
  'preset.format': '프리셋 파일 형식이 올바르지 않습니다.',
  'preset.invalid_settings': '프리셋에 들어 있는 설정값이 올바르지 않습니다.',
  'preset.damaged': '저장된 프리셋이 손상되어 적용하지 않았습니다. 지금 상태는 그대로입니다.',
  'preset.bad_dir': '폴더를 찾을 수 없습니다.',
  'preset.export_exists': '고른 위치에 같은 이름의 폴더가 이미 있습니다. 다른 위치를 고르거나 프리셋 이름을 바꾸세요.',
  'preset.io': '프리셋 파일을 읽거나 쓰지 못했습니다.',
  'preset.file_missing': '파일이 없습니다.',
  'preset.file_link': '바로 가기·링크 파일은 쓸 수 없습니다.',
}

/** CR-064(i18n §4.12 ko 열 — 36키, 표 순서. ko 확정·ja·en 검수 필요) */
const EXPECTED_KO_PRESET = {
  tabPresets: '프리셋',
  cardPresetSave: '현재 상태를 프리셋으로 저장',
  presetSaveDesc:
    '지금 등록한 그림 전부·알림음·배율·휴식 시간·「어깨축·손 위치」 탭 설정(어깨축·이동 영역·팔 위치·손 위치·펜 손 사용)·타이머 설정을 한 벌로 저장합니다. 창 위치·언어·자동 실행·작업표시줄·위치 잠금은 들어가지 않습니다.',
  presetNameLabel: '프리셋 이름',
  presetNamePlaceholder: '예: 고양이 A',
  presetSave: '저장',
  presetSaveNeedsRequired: '키보드 기본 그림과 팔 그림이 있어야 저장할 수 있습니다. 「이미지 설정」에서 먼저 등록하세요.',
  presetSaved: '「{name}」 프리셋을 저장했습니다.',
  presetImport: '폴더에서 가져오기',
  presetImportDesc: '내보낸 프리셋 폴더(preset.json이 들어 있는 폴더)를 고르세요.',
  presetImported: '「{name}」 프리셋을 가져왔습니다.',
  presetImportFailed: '가져오지 못했습니다. 아래 파일을 고친 뒤 다시 가져오세요.',
  pickPresetFolderTitle: '가져올 프리셋 폴더 선택',
  pickExportFolderTitle: '내보낼 위치 선택',
  cardPresetList: '저장한 프리셋',
  presetListEmpty: '저장한 프리셋이 없습니다.',
  presetSavedAt: '저장 {date}',
  presetImageCount: '그림 {count}장',
  presetHasAlarm: '알림음 있음',
  presetNoAlarm: '알림음 없음',
  presetApply: '적용',
  presetExport: '내보내기',
  presetRename: '이름 바꾸기',
  presetDelete: '삭제',
  presetRenameSave: '저장',
  presetApplied: '「{name}」 프리셋을 적용했습니다.',
  presetExported: '「{folder}」 폴더로 내보냈습니다.',
  presetDeleted: '「{name}」 프리셋을 삭제했습니다.',
  confirmPresetApplyTitle: '프리셋 적용',
  confirmPresetApplyMessage:
    '지금 그림·알림음·설정이 「{name}」 프리셋의 것으로 모두 바뀝니다. 프리셋에 없는 그림 칸은 비워집니다. 지금 상태는 따로 남지 않으니, 남기려면 먼저 「현재 상태를 프리셋으로 저장」하세요. 창 위치·언어·자동 실행·작업표시줄·위치 잠금은 그대로입니다.',
  confirmPresetApplyOk: '적용',
  confirmPresetDeleteTitle: '프리셋 삭제',
  confirmPresetDeleteMessage: '「{name}」 프리셋을 삭제할까요? 되돌릴 수 없습니다.',
  confirmPresetDeleteOk: '삭제',
  presetActionAria: '{action}: {name}',
  presetRenameInputAria: '「{name}」의 새 이름',
}
/** 자리표시자가 있는 키 — ja·en 에도 같은 자리표시자가 남아 있어야 한다 */
const PRESET_PLACEHOLDERS: Record<string, string[]> = {
  presetSaved: ['{name}'],
  presetImported: ['{name}'],
  presetSavedAt: ['{date}'],
  presetImageCount: ['{count}'],
  presetApplied: ['{name}'],
  presetExported: ['{folder}'],
  presetDeleted: ['{name}'],
  confirmPresetApplyMessage: ['{name}'],
  confirmPresetDeleteMessage: ['{name}'],
  presetActionAria: ['{action}', '{name}'],
  presetRenameInputAria: ['{name}'],
}

/** design/i18n.md §4.4 `SlotMessageKey` — CR-037 로 25개(옛 24 + hair), CR-042 로 18개(pen_key_* 7 삭제 — §4.4 CR-042 블록 1), CR-045 로 20개 */
const SLOT_KEYS = [
  'background',
  'hair', // CR-037 · R-34
  'pomo_char', // CR-045 · R-42(i18n §4.9)
  'pomo_bubble', // CR-045 · R-42
  'kb_up',
  'kb_down',
  'idle',
  'rest',
  'key_space',
  'key_z',
  'key_question',
  'key_exclamation',
  'key_enter',
  'key_backspace',
  'key_undo',
  'mouse_base',
  'mouse_left',
  'mouse_right',
  'pen_up',
  'pen_down',
]

/** CR-045(i18n §4.3 imagesNote CR-045 개정·§4.6 asset.canvas_mismatch CR-045 ko 열) — 「뽀모도」가 들어간 새 문구. CR-037 문구 대체 */
const KO_IMAGES_NOTE =
  'PNG(32비트 RGBA)만 쓸 수 있습니다. 최대 {w}×{h}·1MB. 배경·뒷머리·뽀모도·키보드 그림은 모두 같은 크기로 만드세요.'
const KO_CANVAS_MISMATCH = '배경·뒷머리·뽀모도·키보드 그림은 모두 같은 크기여야 합니다.'
/** CR-045(i18n §4.9 ko 열) — 단순 키 17개. CR-052: timerCardDesc 키 삭제 → 같은 문장이 timerStopwatchDesc 로 옮겨감(15키 유지) */
const EXPECTED_KO_TIMER = {
  tabTimer: '타이머',
  timerCardTitle: '뽀모도 타이머',
  // timerCardDesc: CR-052 삭제(확정사항 CR-048 블록 「수정 (CR-052)」) — 부재는 TC-289
  timerStopwatchDesc:
    '말풍선 안에 0부터 올라가는 시간을 보여 줍니다. 쉬는중이 되면 저절로 멈추고, 다시 입력하면 이어서 흐릅니다.', // CR-052(옛 timerCardDesc 문장)
  // timerEnabled·timerEnabledDesc: CR-050 삭제(i18n §4.9 취소선 → §4.10 두 토글 키) — 17 → 15키
  timerStart: '시작',
  timerPause: '일시정지',
  timerStop: '멈춤',
  timerStopHint: '멈춤을 누르면 처음 시간으로 돌아갑니다', // CR-050 변경(i18n §4.10) — 옛 「00:00:00으로」
  timerControlsAria: '타이머 조작',
  timerTextTitle: '시간 글자',
  timerTextDesc:
    '미리보기에서 글자를 끌어 자리를 옮기고, 아래에서 회전·크기·색을 고릅니다. 뽀모도 인물·말풍선 그림은 「이미지 설정」 탭의 배경 그룹에서 넣습니다.',
  timerPreviewAria: '시간 글자 위치 미리보기',
  timerTextDragAria: '시간 글자 — 끌어서 옮기기',
  timerRotation: '회전',
  timerSize: '크기',
  timerColor: '글자 색',
}
const KO_TIMER_DISABLED = '타이머가 꺼져 있습니다. 먼저 「타이머 사용」을 켜 주세요.'
/** CR-036 문구(옛 기대값) — CR-037 이 대체했다 */
const OLD_KO_CANVAS_MISMATCH = '배경·키보드 그림은 모두 같은 크기여야 합니다.'

/** design/i18n.md §4.1·§4.2·§4.3 ko 열 — CR-028 새 키(43개). 이관 키 26개는 labels.test.ts(TC-009) */
const EXPECTED_KO_NEW = {
  windowTitle: 'kuro_keyviewer 설정',
  pickTitle: 'PNG 이미지 선택',
  tabGeneral: '기본 설정',
  cardLanguage: '언어 / Language',
  languageAria: '표시 언어',
  cardScale: '크기 · 반응',
  scaleLabel: '배율',
  scaleDesc:
    '캐릭터 표시 크기({min}%~{max}%). 오버레이에서 Ctrl+휠로도 바꿀 수 있습니다(위치 잠금 중에는 여기서만).',
  idleLabel: '유휴 시간',
  idleUnit: '분',
  idleDesc: '이 시간 동안 입력이 없으면 쉬는중 그림으로 바뀝니다({min}~{max}분).',
  idleRangeHint: '{min}~{max} 사이의 정수(분)를 입력하세요. 저장되지 않았습니다.',
  cardWindow: '창',
  resetPosition: '위치 초기화',
  lockLabel: '위치 잠금 (마우스 클릭 통과)',
  lockDesc:
    '켜면 마우스 클릭이 캐릭터를 통과하고, 끌어서 옮길 수 없습니다. 잠금은 이 설정 창에서만 풀 수 있습니다.',
  cardStartup: '작업표시줄 · 시작',
  taskbarLabel: '작업표시줄에 표시',
  taskbarDesc: '켜면 작업표시줄에 캐릭터 창 버튼이 생깁니다. 트레이 아이콘은 그대로 있습니다.',
  autostartLabel: '컴퓨터 시작 시 자동 실행',
  // CR-049(i18n §4.2): 일반 권한 기준 새 문구. autostartCancelled 삭제(부재는 TC-094)
  autostartDesc:
    '켜면 Windows에 로그인할 때 자동으로 실행됩니다. 관리자 권한으로 실행한 게임 안에서도 입력을 인식하려면 이 앱을 직접 관리자 권한으로 실행하세요.',
  autostartPending: '자동 실행 설정을 바꾸는 중입니다…',
  imagesNote: KO_IMAGES_NOTE, // CR-037: 옛 「배경·키보드 그림은…」 대체
  groupBackground: '배경',
  groupKeyboard: '키보드 (본체)',
  groupArm: '팔 (마우스)',
  groupHand: '손 (펜)',
  badgeRequired: '필수',
  badgeOptional: '선택',
  emptyOptional: '등록된 그림 없음',
  emptyRequired: '필수 · 미등록',
  changeImage: '이미지 변경',
  changeImageAria: '{name} 이미지 변경',
  clearImage: '기본값',
  clearImageAria: '{name} 그림 지우기',
  clearLastOnly: '마지막 장부터 지울 수 있습니다.',
  addKbDown: '+ 타자 입력 그림 추가',
  // addPenDown: CR-042 삭제(i18n §4.4 CR-042 블록 1) — 부재는 TC-228
  confirmClearTitle: '그림 지우기',
  confirmClearMessage: '‘{name}’ 그림을 지울까요? 되돌릴 수 없습니다.',
  confirmClearOk: '지우기',
  confirmCancel: '취소',
}

const SAME_KEY = '이 키를 칠 때(없으면 타자 입력 그림)'
// SAME_PEN: CR-042 삭제(pen_key_* 설명 상수 — i18n §4.4 CR-042 블록 1)
/** CR-042(i18n §4.4 CR-042 블록 2, ko 확정) — 손 두 카드 설명 */
const KO_PEN_UP_DESC = '팔 끝에 붙는 펜 쥔 손. 「펜 손 사용」을 켜면 아무것도 누르지 않을 때 이 그림'
const KO_PEN_DOWN_DESC = '키·클릭을 누르는 동안의 손. 특수 키는 키보드의 특수 키 그림도 함께 바뀜'
/** CR-043(R-40, i18n §4.4 CR-043 블록 ko 확정) — 「타자 입력 n」 설명. 옛 CR-028 「타자를 칠 때 나오는 그림(여러 장이면 차례로 바뀜)」 대체 */
const KO_KB_DOWN_DESC = '「펜 손 사용」이 꺼져 있을 때(키보드만 쓸 때) 타자를 치면 나오는 그림(여러 장이면 차례로 바뀜)'
/** design/i18n.md §4.4 ko 제목 / 설명(「(같음)」은 바로 위 행과 같은 문장 — 표 아래 주) */
const EXPECTED_KO_SLOTS = {
  background: { title: '배경', desc: '맨 아래에 늘 그대로 있는 그림' },
  // CR-037 · R-34
  hair: { title: '뒷머리', desc: '장발의 뒷머리처럼 팔 뒤에 보일 부분. 본체와 함께 흔들립니다' },
  kb_up: { title: '기본', desc: '가만히 있을 때. 캐릭터 전체를 그려도 됩니다' },
  kb_down: { title: '타자 입력 {n}', desc: KO_KB_DOWN_DESC }, // CR-043: 설명만 개정, 제목 불변(TC-094 개정)
  idle: { title: '대기', desc: '없으면 기본 그림만 보입니다' },
  rest: { title: '쉬는중', desc: '한동안 입력이 없을 때. 없으면 기본 그림만 보입니다' },
  key_space: { title: '스페이스', desc: SAME_KEY },
  key_z: { title: 'ㅋ·Z', desc: SAME_KEY },
  key_question: { title: '?', desc: SAME_KEY },
  key_exclamation: { title: '!', desc: SAME_KEY },
  key_enter: { title: 'Enter', desc: SAME_KEY },
  key_backspace: { title: 'Backspace', desc: SAME_KEY },
  key_undo: { title: 'Ctrl+Z', desc: SAME_KEY },
  mouse_base: { title: '팔 기본', desc: '마우스를 따라 움직이는 팔' },
  mouse_left: { title: '왼클릭', desc: '왼쪽 버튼을 누르는 동안' },
  mouse_right: { title: '오른클릭', desc: '오른쪽 버튼을 누르는 동안' },
  // CR-042(i18n §4.4 CR-042 블록 2): CR-033 설명을 다시 대체, 제목 불변. pen_key_* 7개 삭제(블록 1)
  pen_up: { title: '손 기본', desc: KO_PEN_UP_DESC },
  pen_down: { title: '펜 입력 {n}', desc: KO_PEN_DOWN_DESC },
}

/** design/i18n.md §4.6 ko 열 */
const EXPECTED_KO_ERRORS = {
  'asset.not_png': 'PNG 파일이 아닙니다.',
  'asset.bad_header': 'PNG 헤더가 손상되었습니다.',
  'asset.not_rgba': '32비트 RGBA PNG만 쓸 수 있습니다(투명 배경 필요).',
  'asset.too_large': '이미지가 너무 큽니다. 최대 900×700입니다.',
  'asset.too_many_bytes': '파일 용량이 1MB를 넘습니다.',
  'asset.canvas_mismatch': KO_CANVAS_MISMATCH, // CR-037: 옛 CR-036 문구 대체
  'asset.not_found': '등록되지 않은 그림입니다.',
  'asset.io': '파일을 처리하지 못했습니다.',
  'asset.manifest': '그림 목록 파일을 읽거나 쓰지 못했습니다.',
  'asset.no_default': '이 칸에는 내장 기본 그림이 없습니다.',
  'asset.export_dir': '저장할 폴더를 찾을 수 없습니다.',
  'settings.invalid': '설정값이 올바르지 않습니다.',
  'settings.io': '설정 파일을 읽거나 쓰지 못했습니다.',
  'settings.format': '설정 파일 형식이 올바르지 않습니다.',
  'io.error': '파일을 처리하지 못했습니다.',
  'window.not_found': '캐릭터 창을 찾을 수 없습니다.',
  'window.no_monitor': '모니터 정보를 읽을 수 없습니다.',
  'tauri.error': '창을 제어하지 못했습니다.',
  'state.poisoned': '설정 상태가 손상되었습니다. 앱을 다시 시작하세요.',
  'autostart.error': '자동 실행 설정을 바꾸지 못했습니다.',
  // 'autostart.cancelled': CR-049 삭제(i18n §4.6)
  unknown: '알 수 없는 오류가 발생했습니다.',
}

const simpleKeys = (m: object) =>
  Object.keys(m)
    .filter(k => k !== 'slots' && k !== 'errors')
    .sort()

describe('i18n 사전 (design/i18n.md §2·§4, U-4)', () => {
  it('TC-093: ko·ja·en 의 키 집합이 같고 빈 문자열이 없으며 errors 키 = ERROR_CODES(39개 = 계약 v0.30 §6 ui 대상 code 38 + unknown — CR-049 · CR-050 · CR-054 · CR-064)', () => {
    expect([...ERROR_CODES]).toEqual(EXPECTED_ERROR_CODES)
    for (const dict of [ja, en]) {
      expect(simpleKeys(dict)).toEqual(simpleKeys(ko))
      expect(Object.keys(dict.slots).sort()).toEqual(Object.keys(ko.slots).sort())
      expect(Object.keys(dict.errors).sort()).toEqual(Object.keys(ko.errors).sort())
    }
    expect(Object.keys(ko.slots).sort()).toEqual([...SLOT_KEYS].sort())
    expect(Object.keys(ko.errors).sort()).toEqual([...EXPECTED_ERROR_CODES].sort())
    for (const dict of [ko, ja, en]) {
      for (const k of simpleKeys(dict)) {
        const v = (dict as unknown as Record<string, unknown>)[k]
        expect(typeof v, k).toBe('string')
        expect((v as string).trim().length, k).toBeGreaterThan(0)
      }
      for (const k of SLOT_KEYS) {
        const s = dict.slots[k as keyof typeof dict.slots]
        expect(s.title.trim().length, k).toBeGreaterThan(0)
        expect(s.desc.trim().length, k).toBeGreaterThan(0)
      }
      for (const c of EXPECTED_ERROR_CODES) {
        expect(dict.errors[c as keyof typeof dict.errors].trim().length, c).toBeGreaterThan(0)
      }
    }
  })

  it('TC-094 (CR-049 · CR-050 · CR-054 · CR-057 개정): ko 사전 — 새 키 41개·슬롯 20개·오류 27개 문구가 i18n.md §4 ko 열과 정확히 같다, 단순 키 137개(CR-057 areaDesc +1), autostartCancelled 없음, 표 줄임 「(같음)」은 문장으로 채운다', () => {
    // CR-049(i18n §4.2·§4.6): Messages.autostartCancelled·errors['autostart.cancelled'] 삭제 — 세 사전 모두 부재
    for (const dict of [ko, ja, en]) {
      expect('autostartCancelled' in dict).toBe(false)
      expect('autostart.cancelled' in dict.errors).toBe(false)
    }
    for (const [k, v] of Object.entries(EXPECTED_KO_NEW)) {
      expect((ko as unknown as Record<string, string>)[k], k).toBe(v)
    }
    // CR-045(i18n §4.9): slots + pomo_char·pomo_bubble, errors + timer.disabled(ko 열 정확 일치)
    expect({ ...ko.slots }).toStrictEqual({
      ...EXPECTED_KO_SLOTS,
      pomo_char: { title: '뽀모도 인물', desc: '타이머 옆에 서 있는 두 번째 캐릭터. 배경처럼 고정되어 흔들리지 않습니다' },
      pomo_bubble: { title: '뽀모도 말풍선', desc: '시간이 들어갈 말풍선. 배경처럼 고정됩니다' },
    })
    // CR-050(i18n §4.10): timer.disabled 새 문구(KO_TIMER_DISABLED 는 옛 CR-045 문구 — TC-286 이 부재 확인) + sound.* 3개
    expect({ ...ko.errors }).toStrictEqual({
      ...EXPECTED_KO_ERRORS,
      'timer.disabled': '스톱워치나 타이머가 꺼져 있습니다. 먼저 둘 중 하나를 켜 주세요.',
      'sound.not_audio': 'wav·mp3·ogg 소리 파일이 아닙니다.',
      'sound.too_many_bytes': '알림음 파일은 1MB 이하여야 합니다.',
      'sound.io': '알림음 파일을 읽거나 쓰지 못했습니다.',
      // CR-054(i18n §4.6 CR-054 행 ko 열 — core message 가 빈 문자열일 때의 폴백)
      'reset.io': '데이터를 모두 초기화하지 못했습니다(일부만 초기화됐을 수 있습니다). 앱을 다음에 시작할 때 다시 시도합니다.',
      'reset.seed': '기본 그림을 다시 채우지 못했습니다. 앱을 다음에 시작할 때 다시 시도합니다.',
      ...EXPECTED_KO_PRESET_ERRORS, // CR-064(i18n §4.6 CR-064 추가분)
    })
    // 이관 26 + 새 43(CR-028) + CR-033 11(i18n.md §4.3 표 penModeLabel ~ penFirstNo — 값 단언은 PenMode.test.tsx TC-174).
    // 주: i18n.md 본문 「위 10키」·「+10」과 표 행 수(11)가 어긋난다 — 표를 따른다(scenarios.md 설계 확인 필요 J-1)
    // CR-037 은 단순 키를 늘리지 않는다(imagesNote 값만 교체, hair 는 slots 안)
    // CR-038 R-35: + 2(i18n §4.8 emptyImage·emptyImageAria) — 옛 92
    // CR-042: − 1(addPenDown 삭제, i18n §4.4 CR-042 블록 1) — 옛 94
    // CR-045: + 17(i18n §4.9 tabTimer ~ timerColor — 값 단언은 TC-246) — 옛 93
    // CR-049: − 1(autostartCancelled 삭제, i18n §4.2) — 옛 110
    // CR-050: + 22 − 2(i18n §4.10 — timerStopwatchEnabled ~ alarmPreviewFailed 추가, timerEnabled·timerEnabledDesc 삭제) — 옛 109
    // CR-052: − 1(timerCardDesc 삭제 — 확정사항 CR-048 블록 「수정 (CR-052)」) — 옛 129
    // CR-054: + 8(i18n §4.11 cardReset ~ resetAllDone — 값 단언은 ResetAllCard.test.tsx TC-301) — 옛 128
    // CR-057: + 1(areaDesc — 값 단언은 MousePartsTab.test.tsx TC-305, 3개 국어) — 옛 136
    // CR-064: + 36(i18n §4.12 tabPresets ~ presetRenameInputAria — 값 단언은 TC-352) — 옛 137
    expect(simpleKeys(ko)).toHaveLength(173) // CR-035: + 12(i18n §4.7) — 옛 80
    for (const dict of [ko, ja, en]) {
      expect('areaDesc' in dict, 'CR-057 areaDesc').toBe(true)
    }
    for (const dict of [ko, ja, en]) {
      for (const k of SLOT_KEYS) {
        const desc = dict.slots[k as keyof typeof dict.slots].desc
        expect(['(같음)', '(同上)', '(same)']).not.toContain(desc)
      }
      expect(dict.slots.key_z.desc).toBe(dict.slots.key_space.desc)
      expect(dict.slots.key_undo.desc).toBe(dict.slots.key_space.desc)
      // CR-042: pen_key_* 삭제 — 옛 「pen_key_z·pen_key_undo 설명 = pen_key_space」 단언 삭제
    }
  })

  it('TC-228: CR-042 사전 — 세 사전 모두 addPenDown·pen_key_* 없음(슬롯 20키 — CR-045 pomo 2 포함), pen_up·pen_down 새 설명(ko 정확, ja·en 은 옛 문구와 다름·비어 있지 않음), pen_down 제목 {n} 유지', () => {
    for (const dict of [ko, ja, en]) {
      expect(Object.keys(dict)).not.toContain('addPenDown')
      expect(Object.keys(dict.slots).filter(k => k.startsWith('pen_key_'))).toEqual([])
      expect(Object.keys(dict.slots)).toHaveLength(20) // CR-045: 18 + pomo_char·pomo_bubble
      expect(dict.slots.pen_down.title).toContain('{n}')
      expect(dict.slots.pen_up.desc.trim().length).toBeGreaterThan(0)
      expect(dict.slots.pen_down.desc.trim().length).toBeGreaterThan(0)
    }
    expect(ko.slots.pen_up).toStrictEqual({ title: '손 기본', desc: KO_PEN_UP_DESC })
    expect(ko.slots.pen_down).toStrictEqual({ title: '펜 입력 {n}', desc: KO_PEN_DOWN_DESC })
    expect(format(ko.slots.pen_down.title, { n: 1 })).toBe('펜 입력 1')
    // 옛 문구(CR-033 pen_up · CR-028 pen_down 「여러 장」)가 아니다 — ja·en 은 검수 필요라 정확 비교하지 않는다
    expect(ja.slots.pen_up.desc).not.toBe('腕の先に付くペンを持った手。「ペンの手を使う」をオンにするとキー入力で切り替わる')
    expect(en.slots.pen_up.desc).not.toBe(
      'The pen-holding hand at the end of the arm. Changes on key input when "Use pen hand" is on',
    )
    expect(ko.slots.pen_down.desc).not.toContain('여러 장')
    expect(ja.slots.pen_down.desc).not.toContain('複数枚')
    expect(en.slots.pen_down.desc).not.toContain('alternates')
  })

  // CR-043 · R-40 (requirements v1.17 · i18n §4.4 CR-043 블록 · images-tab §3.3 예정 TC ④) — scenarios.md 「CR-043 개정」 절
  it('TC-231: CR-043 사전 — slots.kb_down 설명 개정(ko 정확, ja·en 은 옛 문구와 다름·토글 이름 표기 같음), 제목·badgeRequired·emptyRequired·key_* 설명 불변', () => {
    expect(ko.slots.kb_down).toStrictEqual({ title: '타자 입력 {n}', desc: KO_KB_DOWN_DESC })
    expect(ja.slots.kb_down.title).toBe('押下 {n}')
    expect(en.slots.kb_down.title).toBe('Press {n}')
    expect(format(ko.slots.kb_down.title, { n: 1 })).toBe('타자 입력 1')
    // 옛 문구(CR-028)가 아니다 — ja·en 은 검수 필요라 정확 비교하지 않는다(v8 관례)
    expect(ko.slots.kb_down.desc).not.toBe('타자를 칠 때 나오는 그림(여러 장이면 차례로 바뀜)')
    expect(ja.slots.kb_down.desc).not.toBe('キーを押したとき(複数枚なら交互に表示)')
    expect(en.slots.kb_down.desc).not.toBe('While a key is pressed (alternates if several)')
    // 토글 이름은 pen_up 설명(CR-042 블록)과 같은 표기(i18n §4.4 CR-043 머리 문단)
    expect(ko.slots.kb_down.desc).toContain('「펜 손 사용」')
    expect(ja.slots.kb_down.desc).toContain('「ペンの手を使う」')
    expect(en.slots.kb_down.desc).toContain('"Use pen hand"')
    for (const d of [ko, ja, en]) {
      expect(d.slots.kb_down.desc.trim().length).toBeGreaterThan(0)
      expect(d.slots.kb_down.title).toContain('{n}')
    }
    // 필수 여부 문구는 불변 — 어느 카드에 붙는지는 isRequiredSlot(contract v0.19)이 정한다
    expect(ko.badgeRequired).toBe('필수')
    expect(ko.emptyRequired).toBe('필수 · 미등록')
    expect(ko.slots.key_space.desc).toBe(SAME_KEY) // 「없으면 타자 입력 그림」 불변
  })

  it('TC-095: ja·en §4.1 공통 문구, LANGUAGES·LANGUAGE_NAMES·MESSAGES·messagesFor', () => {
    expect({
      windowTitle: ja.windowTitle,
      pickTitle: ja.pickTitle,
      tabsAria: ja.tabsAria,
      tabGeneral: ja.tabGeneral,
      tabImages: ja.tabImages,
      tabMouse: ja.tabMouse,
      errorPrefix: ja.errorPrefix,
    }).toStrictEqual({
      windowTitle: 'kuro_keyviewer 設定',
      pickTitle: 'PNG画像を選択',
      tabsAria: '設定タブ',
      tabGeneral: '基本設定',
      tabImages: '画像設定',
      tabMouse: '肩の軸・手の位置',
      errorPrefix: 'エラー:',
    })
    expect({
      windowTitle: en.windowTitle,
      pickTitle: en.pickTitle,
      tabsAria: en.tabsAria,
      tabGeneral: en.tabGeneral,
      tabImages: en.tabImages,
      tabMouse: en.tabMouse,
      errorPrefix: en.errorPrefix,
    }).toStrictEqual({
      windowTitle: 'kuro_keyviewer Settings',
      pickTitle: 'Select a PNG image',
      tabsAria: 'Settings tabs',
      tabGeneral: 'General',
      tabImages: 'Images',
      tabMouse: 'Shoulder & Hand',
      errorPrefix: 'Error:',
    })
    expect([...LANGUAGES]).toEqual(['ko', 'ja', 'en'])
    expect({ ...LANGUAGE_NAMES }).toStrictEqual({ ko: '한국어', ja: '日本語', en: 'English' })
    expect(MESSAGES.ko).toBe(ko)
    expect(MESSAGES.ja).toBe(ja)
    expect(MESSAGES.en).toBe(en)
    expect(messagesFor('ko')).toBe(ko)
    expect(messagesFor('ja')).toBe(ja)
    expect(messagesFor('en')).toBe(en)
    expect(messagesFor('fr')).toBe(ko)
    expect(messagesFor('')).toBe(ko)
  })

  it('TC-197: CR-037 문구 — slots.hair 3개 국어, imagesNote·asset.canvas_mismatch 에 「뒷머리」가 들어간다(ko 정확 일치, ja·en 은 핵심어·자리표시자)', () => {
    // ko — i18n §4.4 hair 행 · §4.3 imagesNote · §4.6 asset.canvas_mismatch 정확 일치
    expect(ko.slots.hair).toStrictEqual({
      title: '뒷머리',
      desc: '장발의 뒷머리처럼 팔 뒤에 보일 부분. 본체와 함께 흔들립니다',
    })
    expect(ko.imagesNote).toBe(KO_IMAGES_NOTE)
    expect(ko.errors['asset.canvas_mismatch']).toBe(KO_CANVAS_MISMATCH)
    expect(ko.errors['asset.canvas_mismatch']).not.toBe(OLD_KO_CANVAS_MISMATCH)
    // ja·en — 검수 필요 문구라 전체 비교 대신 CR-037 이 넣은 핵심어(後ろ髪 / back hair)와 자리표시자 유지만 고정
    expect(ja.slots.hair.title).toBe('後ろ髪')
    expect(en.slots.hair.title).toBe('Back hair')
    for (const dict of [ja, en]) {
      expect(dict.slots.hair.desc.trim().length).toBeGreaterThan(0)
      expect(dict.slots.hair.desc).not.toBe(dict.slots.background.desc)
      expect(dict.imagesNote).toContain('{w}')
      expect(dict.imagesNote).toContain('{h}')
    }
    expect(ja.imagesNote).toContain('後ろ髪')
    expect(ja.errors['asset.canvas_mismatch']).toContain('後ろ髪')
    expect(en.imagesNote).toContain('back hair')
    expect(en.errors['asset.canvas_mismatch']).toContain('back hair')
  })

  // CR-045 · R-42 ~ R-47 · R-20 (i18n §4.9 · §4.3 imagesNote · §4.6 asset.canvas_mismatch CR-045) — scenarios.md 「CR-045」 절
  it('TC-246: CR-045 사전 — 단순 키 17개 ko 정확·ja·en 비어 있지 않음, slots.pomo_* 3개 국어, errors["timer.disabled"] 3개 국어, imagesNote·canvas_mismatch 에 뽀모도, ERROR_CODES 27(CR-054 — 옛 25 CR-050)·slots 20', () => {
    // ko — i18n §4.9 ko 열 정확 일치
    for (const [k, v] of Object.entries(EXPECTED_KO_TIMER)) {
      expect((ko as unknown as Record<string, string>)[k], k).toBe(v)
    }
    // CR-050 개정: timerEnabled·timerEnabledDesc 삭제로 17 → 15, timerStopHint·timer.disabled 새 문구(값 단언은 TC-286)
    expect(Object.keys(EXPECTED_KO_TIMER)).toHaveLength(15)
    expect(ko.imagesNote).toBe(KO_IMAGES_NOTE)
    expect(ko.errors['asset.canvas_mismatch']).toBe(KO_CANVAS_MISMATCH)
    // 수(계약 v0.21 §6 · i18n §4.9) — CR-049: 23 → 22, CR-050(contract v0.23 §6 · i18n §4.10): sound.* 3개로 22 → 25
    // CR-054(contract v0.25 §6 · i18n §4.6): reset.io·reset.seed 로 25 → 27
    expect(ERROR_CODES).toHaveLength(39) // CR-064: 27 → 39(preset.* 12)
    expect(ERROR_CODES).toContain('timer.disabled')
    expect(ERROR_CODES).not.toContain('autostart.cancelled')
    // ja·en — 검수 필요 문구라 전체 비교 대신 키 존재·비어 있지 않음·핵심어만(v8 관례)
    for (const [dict, pomo] of [
      [ja, 'ポモドーロ'],
      [en, 'omodoro'],
    ] as const) {
      for (const k of Object.keys(EXPECTED_KO_TIMER)) {
        const v = (dict as unknown as Record<string, string>)[k]
        expect(typeof v, k).toBe('string')
        expect(v.trim().length, k).toBeGreaterThan(0)
        expect(v, k).not.toBe((ko as unknown as Record<string, string>)[k]) // 번역됨(ko 그대로 아님)
      }
      expect(Object.keys(dict.slots)).toHaveLength(20)
      expect(dict.slots.pomo_char.title).toContain(pomo)
      expect(dict.slots.pomo_bubble.title).toContain(pomo)
      expect(dict.slots.pomo_char.desc.trim().length).toBeGreaterThan(0)
      expect(dict.slots.pomo_bubble.desc.trim().length).toBeGreaterThan(0)
      expect(dict.errors['timer.disabled'].trim().length).toBeGreaterThan(0)
      expect(dict.imagesNote).toContain(pomo === 'omodoro' ? 'pomodoro' : pomo)
      expect(dict.errors['asset.canvas_mismatch']).toContain(pomo === 'omodoro' ? 'pomodoro' : pomo)
      expect(dict.imagesNote).toContain('{w}')
      expect(dict.imagesNote).toContain('{h}')
    }
    expect(ja.tabTimer).toBe('タイマー')
    expect(en.tabTimer).toBe('Timer')
    // 단위 기호는 키가 아니다(°·px 세 언어 공통 리터럴 — i18n §4.9)
    for (const dict of [ko, ja, en]) {
      expect(Object.keys(dict).filter(k => /unit|deg|px/i.test(k) && k.startsWith('timer'))).toEqual([])
    }
  })

  // CR-050 · R-55 · R-49 ~ R-54 (i18n §4.10 · §4.9 삭제·변경 표기 · contract v0.23 §6) — scenarios.md 「CR-050 개정」 절
  it('TC-286: CR-050 사전 — 새 단순 키 22개 ko 정확·ja·en 비어 있지 않음·번역됨, 세 사전 키 집합 일치, timerEnabled·timerEnabledDesc 없음, timerStopHint·errors["timer.disabled"] 새 문구, ERROR_CODES 27(sound.* 3개가 timer.disabled 바로 뒤, CR-054 reset.* 2개가 sound.io 뒤·unknown 앞), 자리표시자 유지', () => {
    const KO_NEW: Record<string, string> = {
      timerStopwatchEnabled: '스톱워치 사용',
      // CR-052: 옛 「00:00:00부터 올라갑니다. 쉬는중에는 자동으로 멈춥니다」 대체
      timerStopwatchDesc:
        '말풍선 안에 0부터 올라가는 시간을 보여 줍니다. 쉬는중이 되면 저절로 멈추고, 다시 입력하면 이어서 흐릅니다.',
      timerCountdownEnabled: '타이머 사용',
      timerCountdownDesc: '정한 시간부터 0까지 내려갑니다. 쉬는중에도 계속 줄어듭니다',
      timerDuration: '시작 시간',
      timerDurationHint: '최대 99:59:59',
      timerDurationInvalid: '00:00:01 ~ 99:59:59 사이로 입력해 주세요',
      timerDurationLocked: '멈춤 상태에서 바꿀 수 있습니다',
      timerHoursAria: '시',
      timerMinutesAria: '분',
      timerSecondsAria: '초',
      alarmCardTitle: '알림음',
      alarmCardDesc: '타이머가 0이 되면 깜빡이는 10초 동안 반복해서 울립니다', // CR-052(반복 재생) — 옛 「한 번 울립니다」
      alarmCurrentDefault: '지금: 기본 알림음',
      alarmCurrentCustom: '지금: 등록한 알림음 ({format} · {size} KB)',
      alarmImport: '파일 등록',
      alarmPreview: '미리 듣기',
      alarmReset: '기본값',
      alarmFileHint: 'wav·mp3·ogg, 1MB 이하',
      alarmVolume: '음량',
      alarmPickTitle: '소리 파일 선택',
      alarmPreviewFailed: '이 파일을 재생하지 못했습니다',
    }
    expect(Object.keys(KO_NEW)).toHaveLength(22)
    // ko 정확 일치
    const koRec = ko as unknown as Record<string, string>
    for (const [k, v] of Object.entries(KO_NEW)) expect(koRec[k], k).toBe(v)
    expect(ko.timerStopHint).toBe('멈춤을 누르면 처음 시간으로 돌아갑니다')
    expect(ko.errors['timer.disabled']).toBe('스톱워치나 타이머가 꺼져 있습니다. 먼저 둘 중 하나를 켜 주세요.')
    expect(ko.errors['timer.disabled']).not.toBe(KO_TIMER_DISABLED) // 옛 CR-045 문구 아님
    expect(format(ko.alarmCurrentCustom, { format: 'MP3', size: 305 })).toBe('지금: 등록한 알림음 (MP3 · 305 KB)')
    // 삭제 키 — 세 사전 모두 없음
    for (const dict of [ko, ja, en]) {
      expect('timerEnabled' in dict).toBe(false)
      expect('timerEnabledDesc' in dict).toBe(false)
    }
    // ERROR_CODES 27(CR-054 개정 — 옛 25) · 순서(timer.disabled → sound.* 3 → reset.io·reset.seed(CR-054) → unknown)
    expect(ERROR_CODES).toHaveLength(39) // CR-064: 27 → 39(preset.* 12)
    const i = ERROR_CODES.indexOf('timer.disabled')
    expect(ERROR_CODES.slice(i)).toEqual([
      'timer.disabled',
      'sound.not_audio',
      'sound.too_many_bytes',
      'sound.io',
      'reset.io',
      'reset.seed',
      // CR-064: preset.* 12개가 reset.seed 바로 뒤·unknown 앞(i18n §4.6 CR-064 추가분)
      ...Object.keys(EXPECTED_KO_PRESET_ERRORS),
      'unknown',
    ])
    // ja·en — 검수 필요 문구라 정확 비교 대신 존재·비어 있지 않음·ko 와 다름·자리표시자(v8 관례)
    for (const dict of [ja, en]) {
      expect(simpleKeys(dict)).toEqual(simpleKeys(ko))
      const rec = dict as unknown as Record<string, string>
      for (const k of Object.keys(KO_NEW)) {
        expect(typeof rec[k], k).toBe('string')
        expect(rec[k].trim().length, k).toBeGreaterThan(0)
        expect(rec[k], k).not.toBe(koRec[k])
      }
      expect(dict.alarmCurrentCustom).toContain('{format}')
      expect(dict.alarmCurrentCustom).toContain('{size}')
      expect(dict.timerDurationHint).toContain('99:59:59')
      expect(dict.timerDurationInvalid).toContain('00:00:01')
      expect(dict.timerDurationInvalid).toContain('99:59:59')
      expect(dict.timerStopHint).not.toBe(ko.timerStopHint)
      for (const c of ['timer.disabled', 'sound.not_audio', 'sound.too_many_bytes', 'sound.io'] as const) {
        expect(dict.errors[c].trim().length, c).toBeGreaterThan(0)
        expect(dict.errors[c], c).not.toBe(ko.errors[c])
      }
    }
    // 옛 ja·en timer.disabled 문구(「タイマーを使う」 하나만 가리킴)가 아니다
    expect(ja.errors['timer.disabled']).not.toBe('タイマーがオフです。先に「タイマーを使う」をオンにしてください。')
    expect(en.errors['timer.disabled']).not.toBe('The timer is off. Turn on "Use timer" first.')
    // 단위 %·구분 : 는 키가 아니다(공통 리터럴)
    for (const dict of [ko, ja, en]) {
      expect(Object.keys(dict).filter(k => /percent|colon|sep/i.test(k))).toEqual([])
    }
  })
})

// CR-064 · R-66 · R-63 · R-20 (i18n §4.12 · §4.6 CR-064 추가분 · contract v0.30 §6) — scenarios.md 「v30 개정」 절
describe('i18n 사전 — 프리셋 (CR-064)', () => {
  it('TC-352: CR-064 사전 — 새 단순 키 36개 ko 정확(표 순서), ja·en 존재·비어 있지 않음·자리표시자 유지, errors preset.* 12개 ko 정확·ja·en 존재, preset.forbidden 은 ERROR_CODES·세 사전 모두 없음, ERROR_CODES 39', () => {
    const koRec = ko as unknown as Record<string, string>
    expect(Object.keys(EXPECTED_KO_PRESET)).toHaveLength(36)
    for (const [k, v] of Object.entries(EXPECTED_KO_PRESET)) expect(koRec[k], k).toBe(v)
    expect(Object.keys(EXPECTED_KO_PRESET_ERRORS)).toHaveLength(12)
    for (const [c, v] of Object.entries(EXPECTED_KO_PRESET_ERRORS)) {
      expect(ko.errors[c as keyof typeof ko.errors], c).toBe(v)
    }
    expect(ERROR_CODES).toHaveLength(39)
    expect(ERROR_CODES).not.toContain('preset.forbidden')
    for (const dict of [ko, ja, en]) {
      expect('preset.forbidden' in dict.errors).toBe(false)
      expect(simpleKeys(dict)).toHaveLength(173)
    }
    for (const dict of [ja, en]) {
      const rec = dict as unknown as Record<string, string>
      for (const k of Object.keys(EXPECTED_KO_PRESET)) {
        expect(typeof rec[k], k).toBe('string')
        expect(rec[k].trim().length, k).toBeGreaterThan(0)
      }
      for (const [k, ph] of Object.entries(PRESET_PLACEHOLDERS)) {
        for (const p of ph) expect(rec[k], `${k} ${p}`).toContain(p)
      }
      for (const c of Object.keys(EXPECTED_KO_PRESET_ERRORS)) {
        expect(dict.errors[c as keyof typeof dict.errors].trim().length, c).toBeGreaterThan(0)
      }
    }
    // i18n §4.12 표에 확정된 ja·en 탭 이름(폭 검산 근거)
    expect(ja.tabPresets).toBe('プリセット')
    expect(en.tabPresets).toBe('Presets')
    // 치환 예(design/presets-tab.md §8.1 — 「적용: 고양이 A」)
    expect(format(ko.presetActionAria, { action: ko.presetApply, name: '고양이 A' })).toBe('적용: 고양이 A')
    expect(format(ko.presetRenameInputAria, { name: '고양이 A' })).toBe('「고양이 A」의 새 이름')
    // 표시 규칙 — ko 는 core message 우선, 빈 message 면 사전(가져오기 문제 줄·export_exists)
    expect(errorText(ko, 'ko', { code: 'preset.file_link', message: '' })).toBe('바로 가기·링크 파일은 쓸 수 없습니다.')
    expect(errorText(ko, 'ko', { code: 'preset.damaged', message: '손상: kb_up.png' })).toBe('손상: kb_up.png')
    expect(errorText(en, 'en', { code: 'preset.forbidden', message: 'x' })).toBe(en.errors.unknown)
    // 구분자 ` · `·` — ` 는 키가 아니다(세 언어 공통 리터럴)
    for (const dict of [ko, ja, en]) {
      expect(Object.keys(dict).filter(k => k.startsWith('preset') && /sep|dash|dot/i.test(k))).toEqual([])
    }
  })
})

describe('i18n 함수 (design/i18n.md §3)', () => {
  it('TC-096: format — {키} 치환, 없는 자리표시자는 그대로, 숫자는 String()', () => {
    expect(format('타자 입력 {n}', { n: 2 })).toBe('타자 입력 2')
    expect(format(ko.scaleDesc, { min: 25, max: 200 })).toBe(
      '캐릭터 표시 크기(25%~200%). 오버레이에서 Ctrl+휠로도 바꿀 수 있습니다(위치 잠금 중에는 여기서만).',
    )
    // CR-045: 옛 기대 「배경·뒷머리·키보드 그림은…」(CR-037) 대체
    expect(format(ko.imagesNote, { w: 900, h: 700 })).toBe(
      'PNG(32비트 RGBA)만 쓸 수 있습니다. 최대 900×700·1MB. 배경·뒷머리·뽀모도·키보드 그림은 모두 같은 크기로 만드세요.',
    )
    expect(format('{name} 그림 지우기', {})).toBe('{name} 그림 지우기')
    expect(format('{a}-{b}', { a: 'x' })).toBe('x-{b}')
    expect(format('고정 문구', { n: 1 })).toBe('고정 문구')
  })

  it('TC-097: errorText — ko 는 message, ja·en 은 code 문구, 모르는 code 는 unknown, ko 빈 message 는 code 문구', () => {
    const tooLarge: BridgeError = {
      code: 'asset.too_large',
      message: '이미지가 너무 큽니다. 최대 900×700 (현재 1000×800).',
    }
    expect(errorText(ko, 'ko', tooLarge)).toBe('이미지가 너무 큽니다. 최대 900×700 (현재 1000×800).')
    expect(errorText(ja, 'ja', tooLarge)).toBe(ja.errors['asset.too_large'])
    expect(errorText(en, 'en', tooLarge)).toBe(en.errors['asset.too_large'])
    expect(errorText(ko, 'ko', { code: 'settings.io', message: '' })).toBe('설정 파일을 읽거나 쓰지 못했습니다.')
    expect(errorText(en, 'en', { code: 'foo.bar', message: 'x' })).toBe(en.errors.unknown)
    expect(errorText(ja, 'ja', { code: 'SETTINGS_INVALID', message: '배율…' })).toBe(ja.errors.unknown)
    expect(errorText(ko, 'ko', { code: 'foo.bar', message: '' })).toBe('알 수 없는 오류가 발생했습니다.')
  })

  it('TC-098: MessagesProvider·useMessages·useLanguage — Provider 밖은 ko, 목록 밖 언어는 ko', () => {
    const Probe = () => {
      const t = useMessages()
      const lang = useLanguage()
      return createElement('p', { 'data-testid': 'probe' }, `${lang}|${t.tabGeneral}`)
    }
    const wrap = (language: string, child: ReactNode) =>
      createElement(MessagesProvider, { language }, child)
    const { unmount } = render(createElement(Probe))
    expect(screen.getByTestId('probe').textContent).toBe('ko|기본 설정')
    unmount()
    const r = render(wrap('ja', createElement(Probe)))
    expect(screen.getByTestId('probe').textContent).toBe('ja|基本設定')
    r.rerender(wrap('en', createElement(Probe)))
    expect(screen.getByTestId('probe').textContent).toBe('en|General')
    r.rerender(wrap('fr', createElement(Probe)))
    expect(screen.getByTestId('probe').textContent).toBe('ko|기본 설정')
  })
})
