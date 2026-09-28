/**
 * settings 「타이머」 탭 순수 모듈 스펙 — CR-045 · R-46 · R-47.
 * 기준: src/settings/design/timer-tab.md §3(표·검증 예) · scenarios.md 「CR-045」 절 TC-238 ~ TC-240.
 * 기대값은 리터럴로 적는다(bridge 상수 DEFAULT_TIMER_SETTINGS·TIMER_ROTATION_MIN/MAX·TIMER_FONT_SIZE_MIN/MAX 와
 * 독립 대조 — CR-058(0.4.0 기본 세트 🔒): 기본 (268,402)·7°·36px·#333333·음량 44%, 회전 −180 ~ 180, 크기 12 ~ 200.
 * v0.24(CR-053) 기본은 (142,458)·9°·음량 80% — CR-058 에서 글자 위치·회전·음량이 다시 바뀜. bridge 쪽 반영은
 * 별도 세션 진행 중(이 파일은 ui 쪽 독립 리터럴만 갱신).
 * 선행: bridge DEFAULT_TIMER_SETTINGS 반영(위 상수 import 가능) + src/settings/timerValues.ts.
 * CR-058 개정: TC-239(비유한수 회전 → 7)·TC-269(DEF 픽스처 textPos·rotation·alarmVolume) — scenarios.md 절 갱신 필요(ui-test-designer).
 * 시간 의존 없음.
 */
import { describe, expect, it } from 'vitest'
import type { TimerSettings } from 'bridge/types'
import {
  TIMER_PREVIEW_BOX,
  clampFontSize,
  clampRotation,
  clampTextPos,
  clampVolume,
  fullTimer,
  isDurationLocked,
  joinHms,
  normalizeColor,
  pad2,
  parseHmsDraft,
  parseHmsField,
  soundSizeKb,
  splitHms,
  timerToggles,
  togglePatch,
} from '../timerValues'

const CANVAS = { width: 900, height: 700 }

// ─── CR-050 픽스처(timer-tab §14.5 — 기대값은 리터럴, contract v0.23 DEFAULT_TIMER_SETTINGS 와 독립 대조) ───
/** 옛 모양(CR-045) — mode·countdownSecs·alarmVolume 없음 */
const OLD: TimerSettings = { enabled: true, textPos: { x: 1, y: 2 }, rotation: 0, fontSize: 36, color: '#333333' }
/** DEFAULT_TIMER_SETTINGS 리터럴(CR-058: textPos (268,402)·rotation 7·alarmVolume 44 — 나머지 v0.23 그대로) */
const DEF = {
  enabled: false,
  textPos: { x: 268, y: 402 },
  rotation: 7,
  fontSize: 36,
  color: '#333333',
  mode: 'stopwatch' as const,
  countdownSecs: 1500,
  alarmVolume: 44,
}
const CD_ON = { ...DEF, enabled: true, mode: 'countdown' as const }
const CD_OFF = { ...DEF, enabled: false, mode: 'countdown' as const }
const SW_ON = { ...DEF, enabled: true, mode: 'stopwatch' as const }

describe('timerValues (timer-tab §3)', () => {
  it('TC-238: TIMER_PREVIEW_BOX = 400×350, clampTextPos — 글자 중심을 캔버스 안 정수로(검증 예 2건·경계·비유한수 0·입력 불변)', () => {
    expect(TIMER_PREVIEW_BOX).toEqual({ width: 400, height: 350 })
    // §3 검증 예
    expect(clampTextPos({ x: -3.4, y: 710.6 }, CANVAS)).toEqual({ x: 0, y: 700 })
    expect(clampTextPos({ x: 268.5, y: 403.2 }, CANVAS)).toEqual({ x: 269, y: 403 })
    // 경계는 포함(0 ≤ x ≤ width, 0 ≤ y ≤ height — contract v0.21 textPos 주석)
    expect(clampTextPos({ x: 900, y: 0 }, CANVAS)).toEqual({ x: 900, y: 0 })
    expect(clampTextPos({ x: 901, y: -1 }, CANVAS)).toEqual({ x: 900, y: 0 })
    // 캔버스 크기는 인자(900×700 고정 아님)
    expect(clampTextPos({ x: 1200, y: 50 }, { width: 800, height: 600 })).toEqual({ x: 800, y: 50 })
    // 비유한수 좌표는 0
    expect(clampTextPos({ x: NaN, y: Infinity }, CANVAS)).toEqual({ x: 0, y: 0 })
    expect(clampTextPos({ x: -Infinity, y: 5 }, CANVAS)).toEqual({ x: 0, y: 5 })
    // 순수 — 입력을 고치지 않는다
    const p = { x: 1000.2, y: 12.7 }
    const out = clampTextPos(p, CANVAS)
    expect(p).toEqual({ x: 1000.2, y: 12.7 })
    expect(out).not.toBe(p)
    expect(out).toEqual({ x: 900, y: 13 })
  })

  it('TC-239 (CR-058 개정): clampRotation(−180 ~ 180)·clampFontSize(12 ~ 200) — 반올림 뒤 자르기, 비유한수는 기본값 7·36', () => {
    // §3 검증 예
    expect(clampRotation(181)).toBe(180)
    expect(clampRotation(-180.4)).toBe(-180)
    expect(clampFontSize(11)).toBe(12)
    expect(clampFontSize(NaN)).toBe(36)
    // 범위 안·반올림·반대쪽 경계
    expect(clampRotation(5)).toBe(5)
    expect(clampRotation(12.5)).toBe(13)
    expect(clampRotation(-181)).toBe(-180)
    expect(clampRotation(180)).toBe(180)
    expect(clampRotation(NaN)).toBe(7) // CR-058: 비유한수 → DEFAULT rotation 7(옛 9)
    expect(clampRotation(Infinity)).toBe(7)
    expect(clampFontSize(36)).toBe(36)
    expect(clampFontSize(47.6)).toBe(48)
    expect(clampFontSize(201)).toBe(200)
    expect(clampFontSize(12)).toBe(12)
    expect(clampFontSize(-Infinity)).toBe(36)
  })

  it('TC-240: normalizeColor — /^#[0-9a-fA-F]{6}$/ 이면 소문자로, 아니면 null', () => {
    // §3 검증 예
    expect(normalizeColor('#ABCDEF')).toBe('#abcdef')
    expect(normalizeColor('red')).toBeNull()
    // 대소문자 섞임·이미 소문자
    expect(normalizeColor('#33AAFF')).toBe('#33aaff')
    expect(normalizeColor('#AbC012')).toBe('#abc012')
    expect(normalizeColor('#333333')).toBe('#333333')
    // 형식 밖: 3자리·16진 아님·# 없음·7자리·앞 공백·빈 문자열
    for (const bad of ['#abc', '#abcdeg', 'abcdef', '#abcdef0', ' #abcdef', '']) {
      expect(normalizeColor(bad), bad).toBeNull()
    }
  })
})

// CR-050 · R-49 · R-50 · R-53 · R-54 (timer-tab §14.5 검증 예 전부 + 식에서 나오는 경계) — scenarios.md 「CR-050 개정」 절
describe('timerValues CR-050 (timer-tab §14.5)', () => {
  it('TC-269 (CR-053 픽스처 연동): fullTimer·timerToggles·togglePatch·isDurationLocked·splitHms·joinHms·pad2·parseHmsField·parseHmsDraft·clampVolume·soundSizeKb — 검증 예·경계·입력 불변', () => {
    // fullTimer — undefined 면 기본값 전체, 옛 설정은 스톱워치·1500·44(CR-058)로 채움, 명시 undefined 도 기본값, 새 필드가 있으면 유지
    expect(fullTimer(undefined)).toStrictEqual(DEF)
    expect(fullTimer(OLD)).toStrictEqual({ ...OLD, mode: 'stopwatch', countdownSecs: 1500, alarmVolume: 44 })
    expect(fullTimer({ ...OLD, mode: undefined, countdownSecs: undefined, alarmVolume: undefined })).toStrictEqual({
      ...OLD,
      mode: 'stopwatch',
      countdownSecs: 1500,
      alarmVolume: 44,
    })
    const custom: TimerSettings = { ...OLD, mode: 'countdown', countdownSecs: 3723, alarmVolume: 40 }
    expect(fullTimer(custom)).toStrictEqual(custom)
    const before = JSON.stringify(OLD)
    expect(fullTimer(OLD)).not.toBe(OLD)
    expect(JSON.stringify(OLD)).toBe(before) // 순수
    // timerToggles — 켜짐 && 모드
    expect(timerToggles(fullTimer(OLD))).toStrictEqual({ stopwatchOn: true, countdownOn: false })
    expect(timerToggles(CD_OFF)).toStrictEqual({ stopwatchOn: false, countdownOn: false })
    expect(timerToggles(CD_ON)).toStrictEqual({ stopwatchOn: false, countdownOn: true })
    expect(timerToggles(DEF)).toStrictEqual({ stopwatchOn: false, countdownOn: false })
    // togglePatch — 켜기 = { enabled: true, mode }, 끄기 = { enabled: false }(모드 키 없음 = 유지)
    expect(togglePatch('countdown', true)).toStrictEqual({ enabled: true, mode: 'countdown' })
    expect(togglePatch('stopwatch', true)).toStrictEqual({ enabled: true, mode: 'stopwatch' })
    expect(togglePatch('stopwatch', false)).toStrictEqual({ enabled: false })
    expect(togglePatch('countdown', false)).toStrictEqual({ enabled: false })
    // isDurationLocked — 타이머 켜짐 && running·paused·finished
    expect(isDurationLocked(CD_ON, 'paused')).toBe(true)
    expect(isDurationLocked(CD_ON, 'running')).toBe(true)
    expect(isDurationLocked(CD_ON, 'finished')).toBe(true)
    expect(isDurationLocked(CD_ON, 'stopped')).toBe(false)
    expect(isDurationLocked(CD_ON, 'restPaused')).toBe(false) // 식의 세 상태 밖
    expect(isDurationLocked(SW_ON, 'running')).toBe(false)
    expect(isDurationLocked(CD_OFF, 'paused')).toBe(false)
    // splitHms — 비유한수 0, floor, 0 ~ 359999 로 자름
    expect(splitHms(1500)).toStrictEqual({ h: 0, m: 25, s: 0 })
    expect(splitHms(3723)).toStrictEqual({ h: 1, m: 2, s: 3 })
    expect(splitHms(359_999)).toStrictEqual({ h: 99, m: 59, s: 59 })
    expect(splitHms(NaN)).toStrictEqual({ h: 0, m: 0, s: 0 })
    expect(splitHms(Infinity)).toStrictEqual({ h: 0, m: 0, s: 0 })
    expect(splitHms(-5)).toStrictEqual({ h: 0, m: 0, s: 0 })
    expect(splitHms(400_000)).toStrictEqual({ h: 99, m: 59, s: 59 })
    expect(splitHms(61.9)).toStrictEqual({ h: 0, m: 1, s: 1 })
    // joinHms · pad2
    expect(joinHms(1, 2, 3)).toBe(3723)
    expect(joinHms(99, 59, 59)).toBe(359_999)
    expect(joinHms(0, 25, 0)).toBe(1500)
    expect(pad2(5)).toBe('05')
    expect(pad2(0)).toBe('00')
    expect(pad2(25)).toBe('25')
    // parseHmsField — trim·빈칸 0·/^\d{1,2}$/·상한
    expect(parseHmsField('', 59)).toBe(0)
    expect(parseHmsField(' 7 ', 59)).toBe(7)
    expect(parseHmsField('59', 59)).toBe(59)
    expect(parseHmsField('60', 59)).toBeNull()
    expect(parseHmsField('99', 99)).toBe(99)
    expect(parseHmsField('100', 99)).toBeNull()
    expect(parseHmsField('1a', 99)).toBeNull()
    expect(parseHmsField('-1', 59)).toBeNull()
    expect(parseHmsField('1.5', 59)).toBeNull()
    // parseHmsDraft — §14.5 검증 예 그대로(정수)
    expect(parseHmsDraft({ h: '01', m: '02', s: '03' })).toBe(3723)
    expect(parseHmsDraft({ h: '', m: '0', s: '5' })).toBe(5)
    expect(parseHmsDraft({ h: '0', m: '0', s: '0' })).toBeNull()
    expect(parseHmsDraft({ h: '', m: '', s: '' })).toBeNull()
    expect(parseHmsDraft({ h: '0', m: '60', s: '0' })).toBeNull()
    expect(parseHmsDraft({ h: '1a', m: '0', s: '0' })).toBeNull()
    expect(parseHmsDraft({ h: '100', m: '0', s: '0' })).toBeNull()
    expect(parseHmsDraft({ h: '99', m: '59', s: '59' })).toBe(359_999)
    expect(parseHmsDraft({ h: '0', m: '0', s: '1' })).toBe(1)
    expect(Number.isInteger(parseHmsDraft({ h: '01', m: '02', s: '03' }))).toBe(true)
    // clampVolume — 비유한수 44(CR-058, 옛 80), round 뒤 0 ~ 100
    expect(clampVolume(80.4)).toBe(80)
    expect(clampVolume(79.5)).toBe(80)
    expect(clampVolume(101)).toBe(100)
    expect(clampVolume(-3)).toBe(0)
    expect(clampVolume(NaN)).toBe(44)
    expect(clampVolume(Infinity)).toBe(44)
    expect(clampVolume(0)).toBe(0)
    expect(clampVolume(100)).toBe(100)
    // soundSizeKb — ceil(bytes / 1024)
    expect(soundSizeKb(312_004)).toBe(305)
    expect(soundSizeKb(1024)).toBe(1)
    expect(soundSizeKb(1025)).toBe(2)
    expect(soundSizeKb(0)).toBe(0)
  })
})
