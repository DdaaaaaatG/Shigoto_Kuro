/**
 * 프리셋 탭 순수 판정·표시 함수 — design/presets-tab.md §3(CR-064, R-58·R-62·R-65·R-66).
 * React·bridge 호출 없음(타입·상수만 가져온다). 필수 그림 목록은 bridge `REQUIRED_SLOTS`가 정본이다.
 */
import {
  REQUIRED_SLOTS,
  slotKey,
  type AssetManifest,
  type AssetSlot,
  type BridgeError,
  type Language,
} from 'bridge/types'

/** 저장 시각 표시 로캘(언어별) */
export const LOCALE_BY_LANGUAGE: Readonly<Record<Language, string>> = {
  ko: 'ko-KR',
  ja: 'ja-JP',
  en: 'en-US',
}

/** 매니페스트에 없는 필수 슬롯 — `REQUIRED_SLOTS` 순서 */
export const missingRequiredSlots = (manifest: AssetManifest): AssetSlot[] =>
  REQUIRED_SLOTS.filter(slot => !manifest.entries.some(entry => slotKey(entry.slot) === slotKey(slot)))

/** 이름이 공백만이 아닌지. 상한·제어 문자는 입력칸 maxLength 와 core(`preset.invalid_name`)가 판정한다 */
export const isPresetNameFilled = (name: string): boolean => name.trim().length > 0

/** 저장 가능 여부(진행 중 `pending`은 호출하는 컴포넌트가 따로 AND 한다) */
export const canSavePreset = (name: string, manifest: AssetManifest): boolean =>
  isPresetNameFilled(name) && missingRequiredSlots(manifest).length === 0

/** 저장 시각(Unix ms)을 언어별 짧은 날짜·시각으로. 무효한 값은 빈 문자열(던지지 않는다) */
export const formatSavedAt = (ms: number, language: Language): string => {
  if (!Number.isFinite(ms)) return ''
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language], { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

/**
 * 표시용 오류. `preset.export_exists`는 message 를 비워 ko 도 사전 문구(할 일 안내 포함)를 쓰게 하고,
 * 그 밖의 오류는 그대로 돌려준다.
 */
export const presetErrorForDisplay = (e: BridgeError): BridgeError =>
  e.code === 'preset.export_exists' ? { code: e.code, message: '' } : e
