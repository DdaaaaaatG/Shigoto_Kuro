/**
 * 프리셋 탭 순수 모듈(presetValues) 스펙 — CR-064 · R-58 · R-62 · R-64 · R-65 · R-66.
 * 기준: src/settings/design/presets-tab.md §3(missingRequiredSlots·isPresetNameFilled·canSavePreset·formatSavedAt·
 *       presetErrorForDisplay·LOCALE_BY_LANGUAGE) · contract v0.30 §3.11(PRESET_NAME_MAX) · scenarios.md 「v30 개정」 절 TC-315 ~ TC-318.
 * React·bridge 호출 없음 — bridge/types 상수(REQUIRED_SLOTS·slotKey·PRESET_NAME_MAX)만 실물.
 * 구현 전 Red 가 정상: src/settings/presetValues.ts 가 없으면 import 가 실패한다.
 */
import { describe, expect, it } from 'vitest'
import {
  PRESET_NAME_MAX,
  REQUIRED_SLOTS,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type BridgeError,
} from 'bridge/types'
import {
  LOCALE_BY_LANGUAGE,
  canSavePreset,
  formatSavedAt,
  isPresetNameFilled,
  missingRequiredSlots,
  presetErrorForDisplay,
} from '../presetValues'

// ─── 픽스처 ────────────────────────────────────────────────────────────────
const entry = (slot: AssetSlot, w = 900, h = 700): AssetEntry => {
  const k = typeof slot === 'string' ? slot : `${slot.kind}_${slot.index}`
  return { slot, fileName: `${k}.png`, width: w, height: h, bytes: 1000, url: `asset://${k}.png` }
}
const manifestOf = (slots: AssetSlot[]): AssetManifest => ({
  canvas: slots.length ? { width: 900, height: 700 } : null,
  entries: slots.map(s => entry(s)),
})
const BOTH = manifestOf(['background', 'kb_up', 'mouse_base', 'idle'])
const NO_KB = manifestOf(['background', 'mouse_base'])
const NO_ARM = manifestOf(['kb_up', { kind: 'kb_down', index: 0 }])
const EMPTY: AssetManifest = { canvas: null, entries: [] }
/** 저장 시각 예 — 2026-09-30 12:34 UTC(표시는 PC 로컬 시간대, 기대값도 같은 Intl 로 만든다) */
const MS = Date.UTC(2026, 8, 30, 12, 34, 0)
const intl = (locale: string, ms: number) =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms))

describe('presetValues — 저장 조건 (presets-tab §3, R-65 · R-58)', () => {
  it('TC-315: missingRequiredSlots — REQUIRED_SLOTS(kb_up·mouse_base) 중 매니페스트에 없는 것을 REQUIRED_SLOTS 순서로, 다른 슬롯은 무관', () => {
    // bridge 정본(새 필수 목록을 만들지 않는다) — v0.19 값
    expect([...REQUIRED_SLOTS]).toEqual(['kb_up', 'mouse_base'])
    expect(missingRequiredSlots(BOTH)).toEqual([])
    expect(missingRequiredSlots(NO_KB)).toEqual(['kb_up'])
    expect(missingRequiredSlots(NO_ARM)).toEqual(['mouse_base'])
    expect(missingRequiredSlots(EMPTY)).toEqual(['kb_up', 'mouse_base'])
    // 순서는 entries 순서가 아니라 REQUIRED_SLOTS 순서
    expect(missingRequiredSlots(manifestOf(['background']))).toEqual(['kb_up', 'mouse_base'])
    // 입력을 바꾸지 않는다(순수)
    const before = JSON.stringify(NO_KB)
    missingRequiredSlots(NO_KB)
    expect(JSON.stringify(NO_KB)).toBe(before)
  })

  it('TC-316: isPresetNameFilled·canSavePreset — 빈 이름·공백만 false, 필수 누락 false, 둘 다 충족일 때만 true, 상한(50자)은 판정하지 않는다(입력칸 maxLength + core preset.invalid_name)', () => {
    expect(isPresetNameFilled('')).toBe(false)
    expect(isPresetNameFilled('   ')).toBe(false)
    expect(isPresetNameFilled('\t \n')).toBe(false)
    expect(isPresetNameFilled('고양이 A')).toBe(true)
    expect(isPresetNameFilled('  A  ')).toBe(true)
    expect(PRESET_NAME_MAX).toBe(50)
    expect(isPresetNameFilled('가'.repeat(PRESET_NAME_MAX + 1))).toBe(true) // 상한은 ui 판정 대상 아님(§3)
    // canSavePreset = isPresetNameFilled && 필수 누락 없음
    expect(canSavePreset('고양이 A', BOTH)).toBe(true)
    expect(canSavePreset('', BOTH)).toBe(false)
    expect(canSavePreset('   ', BOTH)).toBe(false)
    expect(canSavePreset('고양이 A', NO_KB)).toBe(false)
    expect(canSavePreset('고양이 A', NO_ARM)).toBe(false)
    expect(canSavePreset('고양이 A', EMPTY)).toBe(false)
    expect(canSavePreset('', EMPTY)).toBe(false)
  })
})

describe('presetValues — 표시 (presets-tab §3, R-66 · R-62)', () => {
  it('TC-317: formatSavedAt — 언어별 로캘(ko-KR·ja-JP·en-US)·dateStyle medium·timeStyle short, 세 언어 결과가 서로 다르고 비지 않음, 무효 입력은 빈 문자열(던지지 않음)', () => {
    expect(LOCALE_BY_LANGUAGE).toEqual({ ko: 'ko-KR', ja: 'ja-JP', en: 'en-US' })
    const ko = formatSavedAt(MS, 'ko')
    const ja = formatSavedAt(MS, 'ja')
    const en = formatSavedAt(MS, 'en')
    expect(ko).toBe(intl('ko-KR', MS))
    expect(ja).toBe(intl('ja-JP', MS))
    expect(en).toBe(intl('en-US', MS))
    for (const s of [ko, ja, en]) expect(s.trim().length).toBeGreaterThan(0)
    expect(new Set([ko, ja, en]).size).toBe(3)
    // 무효 입력 — RangeError 대신 ''
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 8.64e15 + 1]) {
      expect(() => formatSavedAt(bad, 'ko'), String(bad)).not.toThrow()
      expect(formatSavedAt(bad, 'ko'), String(bad)).toBe('')
    }
    expect(formatSavedAt(0, 'en')).toBe(intl('en-US', 0)) // 0 은 유효한 시각
  })

  it('TC-318: presetErrorForDisplay — preset.export_exists 만 message 를 비운 새 객체(ko 도 사전 문구), 다른 code 는 받은 객체 그대로', () => {
    const exists: BridgeError = { code: 'preset.export_exists', message: '같은 이름의 폴더가 이미 있습니다.' }
    const out = presetErrorForDisplay(exists)
    expect(out).toEqual({ code: 'preset.export_exists', message: '' })
    expect(exists.message).toBe('같은 이름의 폴더가 이미 있습니다.') // 입력 불변
    for (const e of [
      { code: 'preset.bad_dir', message: '폴더를 찾을 수 없습니다: X:/out' },
      { code: 'preset.format', message: '프리셋 파일 형식이 올바르지 않습니다: 사유' },
      { code: 'preset.io', message: '' },
      { code: 'unknown', message: 'x' },
    ] as BridgeError[]) {
      expect(presetErrorForDisplay(e), e.code).toBe(e)
    }
  })
})
