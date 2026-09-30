import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ASSET_SLOTS,
  DEFAULT_MOUSE_SETTINGS,
  DEFAULT_SETTINGS,
  DEFAULT_TIMER_SETTINGS,
  hasBuiltinDefault,
  isKbDownSlot,
  isMousePartSlot,
  isPenDownSlot,
  isRequiredSlot,
  PRESET_NAME_MAX,
  slotKey,
  TIMER_ALARM_VOLUME_MAX,
  TIMER_COUNTDOWN_SECS_MAX,
  TIMER_COUNTDOWN_SECS_MIN,
  TIMER_FONT_SIZE_MAX,
  TIMER_FONT_SIZE_MIN,
  TIMER_ROTATION_MAX,
  TIMER_ROTATION_MIN,
  type AlarmSound,
  type AssetSlot,
  type PresetImportReport,
  type PresetSummary,
} from '../types'

// contract.md §3.1 「TS 슬롯 도우미」 v0.13 고정 테스트.
describe('slotKey', () => {
  it('kb_down 객체는 kb_down_N', () => {
    expect(slotKey({ kind: 'kb_down', index: 2 })).toBe('kb_down_2')
  })

  it('pen_down 객체는 pen_down_N', () => {
    expect(slotKey({ kind: 'pen_down', index: 0 })).toBe('pen_down_0')
  })

  it('문자열 슬롯은 자기 자신', () => {
    expect(slotKey('body')).toBe('body')
    expect(slotKey('pen_up')).toBe('pen_up')
  })
})

describe('isKbDownSlot', () => {
  it('kb_down 객체는 true', () => {
    expect(isKbDownSlot({ kind: 'kb_down', index: 0 })).toBe(true)
  })

  it('pen_down 객체를 kb_down으로 오인하지 않는다', () => {
    expect(isKbDownSlot({ kind: 'pen_down', index: 0 })).toBe(false)
  })

  it('문자열 슬롯은 false', () => {
    expect(isKbDownSlot('body')).toBe(false)
  })
})

describe('isPenDownSlot', () => {
  it('pen_down 객체는 true', () => {
    expect(isPenDownSlot({ kind: 'pen_down', index: 3 })).toBe(true)
  })

  it('kb_down 객체를 pen_down으로 오인하지 않는다', () => {
    expect(isPenDownSlot({ kind: 'kb_down', index: 0 })).toBe(false)
  })

  it('문자열 슬롯은 false', () => {
    expect(isPenDownSlot('pen_up')).toBe(false)
  })
})

describe('isMousePartSlot', () => {
  it('마우스 파츠 3종만 true', () => {
    expect(isMousePartSlot('mouse_base')).toBe(true)
    expect(isMousePartSlot('mouse_left')).toBe(true)
    expect(isMousePartSlot('mouse_right')).toBe(true)
  })

  it('펜 그림·kb_down·pen_down은 false', () => {
    const cases: AssetSlot[] = [
      'pen_up',
      'pen_key_space',
      { kind: 'kb_down', index: 0 },
      { kind: 'pen_down', index: 0 },
    ]
    for (const slot of cases) {
      expect(isMousePartSlot(slot)).toBe(false)
    }
  })
})

// contract.md §3.1 「TS 필수 슬롯 상수」 v0.19(CR-043) 고정 테스트. v0.14~v0.18: kb_down_0도 필수(3장).
describe('isRequiredSlot', () => {
  it('필수 2장은 true', () => {
    expect(isRequiredSlot('kb_up')).toBe(true)
    expect(isRequiredSlot('mouse_base')).toBe(true)
  })

  it('그 밖은 false', () => {
    const cases: AssetSlot[] = [
      'idle',
      'rest',
      { kind: 'kb_down', index: 0 },
      { kind: 'kb_down', index: 1 },
      { kind: 'pen_down', index: 0 },
      'pen_up',
      'mouse_left',
      'body',
    ]
    for (const slot of cases) {
      expect(isRequiredSlot(slot)).toBe(false)
    }
  })
})

// contract.md §3.3 「MouseSettings.penMode」 v0.18(CR-038) 고정 테스트. v0.15~v0.17: false. v0.20(CR-044)도 true 유지.
describe('DEFAULT_MOUSE_SETTINGS.penMode', () => {
  it('기본값은 true', () => {
    expect(DEFAULT_MOUSE_SETTINGS.penMode).toBe(true)
  })
})

// contract.md §3.3 「penPos」 v0.20(CR-044) 고정 테스트. v0.18~v0.19: {x:356, y:504}.
describe('DEFAULT_MOUSE_SETTINGS.penPos', () => {
  it('기본값은 {x:372, y:476}', () => {
    expect(DEFAULT_MOUSE_SETTINGS.penPos).toEqual({ x: 372, y: 476 })
  })
})

// contract.md §3.3 「shoulder」·「partPos」 v0.20(CR-044) 고정 테스트.
describe('DEFAULT_MOUSE_SETTINGS.shoulder · partPos', () => {
  it('shoulder 기본값은 {x:582, y:484}', () => {
    expect(DEFAULT_MOUSE_SETTINGS.shoulder).toEqual({ x: 582, y: 484 })
  })

  it('partPos 기본값은 {x:411, y:464}', () => {
    expect(DEFAULT_MOUSE_SETTINGS.partPos).toEqual({ x: 411, y: 464 })
  })
})

// contract.md §3.1 「TS 내장 기본 슬롯 상수」 v0.29 고정 테스트. hair는 v0.29(0.4.0~)부터 제외.
describe('DEFAULT_ASSET_SLOTS · hasBuiltinDefault', () => {
  it('길이 6, slotKey 중복 없음', () => {
    expect(DEFAULT_ASSET_SLOTS).toHaveLength(6)
    const keys = DEFAULT_ASSET_SLOTS.map(slotKey)
    expect(new Set(keys).size).toBe(6)
  })

  it('6개 파일 키가 계약 목록과 정확히 같은 순서다(hair는 v0.29부터, kb_down_0은 CR-053부터 제외)', () => {
    expect(DEFAULT_ASSET_SLOTS.map(slotKey)).toEqual([
      'kb_up',
      'background',
      'pomo_char',
      'mouse_base',
      'pen_up',
      'pen_down_0',
    ])
  })

  it('6개 슬롯은 true', () => {
    for (const slot of DEFAULT_ASSET_SLOTS) {
      expect(hasBuiltinDefault(slot)).toBe(true)
    }
  })

  it('내장 기본 없는 슬롯은 false', () => {
    const cases: AssetSlot[] = [
      { kind: 'kb_down', index: 0 },
      { kind: 'kb_down', index: 1 },
      { kind: 'pen_down', index: 1 },
      'mouse_left',
      'mouse_right',
      'pen_key_space',
      'body',
      'idle',
      'rest',
      'key_space',
      'pomo_bubble',
    ]
    for (const slot of cases) {
      expect(hasBuiltinDefault(slot)).toBe(false)
    }
  })
})

// contract.md §3.1 「AssetSlot」 v0.29 고정 테스트 — 'hair' 슬롯은 v0.29(0.4.0~)부터 내장 기본 없음.
describe('hair 슬롯 (v0.17 CR-037 도입 · v0.18 CR-038 내장 기본 추가 · v0.20 CR-044 제외 · v0.23 CR-053 재추가 · v0.29 내장 기본 재제외)', () => {
  it('slotKey는 자기 자신', () => {
    expect(slotKey('hair')).toBe('hair')
  })

  it('필수 슬롯이 아니다', () => {
    expect(isRequiredSlot('hair')).toBe(false)
  })

  it('내장 기본 그림이 없다(v0.29)', () => {
    expect(hasBuiltinDefault('hair')).toBe(false)
  })
})

// contract.md §3.1 「AssetSlot」 v0.21(CR-045 · PT-01) 도입 · v0.23(CR-053) pomo_char 내장 기본 추가.
describe('pomo_char · pomo_bubble 슬롯 (v0.21, CR-045 / v0.23, CR-053)', () => {
  it('slotKey는 자기 자신', () => {
    expect(slotKey('pomo_char')).toBe('pomo_char')
    expect(slotKey('pomo_bubble')).toBe('pomo_bubble')
  })

  it('필수 슬롯이 아니다', () => {
    expect(isRequiredSlot('pomo_char')).toBe(false)
    expect(isRequiredSlot('pomo_bubble')).toBe(false)
  })

  it('pomo_char는 내장 기본이 있고 pomo_bubble은 없다(v0.23, CR-053)', () => {
    expect(hasBuiltinDefault('pomo_char')).toBe(true)
    expect(hasBuiltinDefault('pomo_bubble')).toBe(false)
    expect(DEFAULT_ASSET_SLOTS).toHaveLength(6)
  })

  it('마우스 파츠·kb_down·pen_down이 아니다', () => {
    expect(isMousePartSlot('pomo_char')).toBe(false)
    expect(isKbDownSlot('pomo_bubble')).toBe(false)
    expect(isPenDownSlot('pomo_bubble')).toBe(false)
  })
})

// contract.md §3.3 「TimerSettings」 v0.21(CR-045) · v0.23(CR-048, CR-053) 고정 테스트.
describe('TimerSettings · DEFAULT_TIMER_SETTINGS (v0.21, CR-045 / v0.23, CR-048 · CR-053)', () => {
  it('기본값은 U-6 권고값(Rust settings::timer::TimerSettings::default()와 1:1, 0.4.0 기본 세트 기준 재조정)', () => {
    expect(DEFAULT_TIMER_SETTINGS).toEqual({
      enabled: false,
      mode: 'stopwatch',
      countdownSecs: 1500,
      alarmVolume: 44,
      textPos: { x: 268, y: 402 },
      rotation: 7,
      fontSize: 36,
      color: '#333333',
    })
  })

  it('범위 상수(§3.3)', () => {
    expect(TIMER_ROTATION_MIN).toBe(-180)
    expect(TIMER_ROTATION_MAX).toBe(180)
    expect(TIMER_FONT_SIZE_MIN).toBe(12)
    expect(TIMER_FONT_SIZE_MAX).toBe(200)
  })

  it('v0.23 범위 상수(§3.3, CR-048 · TM-04 · TM-10)', () => {
    expect(TIMER_COUNTDOWN_SECS_MIN).toBe(1)
    expect(TIMER_COUNTDOWN_SECS_MAX).toBe(359_999)
    expect(TIMER_ALARM_VOLUME_MAX).toBe(100)
  })

  it('DEFAULT_SETTINGS.timer는 DEFAULT_TIMER_SETTINGS와 같다(필수 필드)', () => {
    expect(DEFAULT_SETTINGS.timer).toEqual(DEFAULT_TIMER_SETTINGS)
  })
})

// contract.md §3.9 「TimerStatus」 v0.23(CR-048) 고정 테스트 — 'finished' 유니온 멤버 추가.
describe('TimerStatus · TimerSnapshot (v0.23, CR-048)', () => {
  it('finished 상태는 mode·durationMs와 함께 스냅숏 모양에 들어간다(선택 필드, 옛 픽스처 호환)', () => {
    const finished: import('../types').TimerSnapshot = {
      status: 'finished',
      elapsedMs: 1_500_000,
      mode: 'countdown',
      durationMs: 1_500_000,
    }
    expect(finished.status).toBe('finished')

    const legacy: import('../types').TimerSnapshot = { status: 'stopped', elapsedMs: 0 }
    expect(legacy.mode).toBeUndefined()
  })
})

// contract.md §3.10 「AlarmFormat · AlarmSound」 v0.23 신규(CR-048 · TM-07 · TM-08).
describe('AlarmSound (v0.23 신규, CR-048)', () => {
  it('계약 JSON 예시 모양대로 값을 만들 수 있다', () => {
    const sound: AlarmSound = {
      format: 'mp3',
      bytes: 312_004,
      url: 'http://asset.localhost/x/assets/alarm.mp3?v=1758870000000',
    }
    expect(sound.format).toBe('mp3')
  })
})

describe('프리셋 타입(v0.30, §3.11)', () => {
  it('PRESET_NAME_MAX는 Rust NAME_MAX_CHARS와 같은 50', () => {
    expect(PRESET_NAME_MAX).toBe(50)
  })

  it('가져오기 보고서 JSON 형태(camelCase, preset null ⇔ problems 있음)', () => {
    const rejected: PresetImportReport = JSON.parse(
      '{"preset":null,"problems":[{"fileName":"kb_up.png","code":"asset.not_rgba"}]}',
    )
    expect(rejected.preset).toBeNull()
    expect(rejected.problems[0]).toEqual({ fileName: 'kb_up.png', code: 'asset.not_rgba' })
    const summary: PresetSummary = JSON.parse(
      '{"id":"1790000000000","name":"고양이 A","savedAt":1790000000000,"imageCount":7,"hasAlarm":true}',
    )
    expect(summary.savedAt).toBe(1790000000000)
    expect(summary.hasAlarm).toBe(true)
  })
})
