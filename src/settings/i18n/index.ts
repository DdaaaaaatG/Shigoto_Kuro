/**
 * settings i18n 순수 함수·상수 — design/i18n.md §3. React 의존 없음(컨텍스트는 MessagesContext.tsx).
 */
import type { BridgeError, Language } from 'bridge/types'
import { en } from './en'
import { ja } from './ja'
import { ko } from './ko'
import type { ErrorCode, Messages } from './types'

export const LANGUAGES: readonly Language[] = ['ko', 'ja', 'en']

/** 언어 선택 항목 문구 — 각 언어 자기 이름으로 고정(현재 언어와 무관) */
export const LANGUAGE_NAMES: Record<Language, string> = {
  ko: '한국어',
  ja: '日本語',
  en: 'English',
}

export const MESSAGES: Record<Language, Messages> = { ko, ja, en }

const isLanguage = (v: string): v is Language => (LANGUAGES as readonly string[]).includes(v)

/** 목록에 없는 언어는 ko 로 대체한다 */
export const messagesFor = (language: string): Messages => (isLanguage(language) ? MESSAGES[language] : ko)

/** `{키}` 자리표시자를 값으로 채운다. `vars`에 없는 자리표시자는 그대로 둔다 */
export const format = (template: string, vars: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : placeholder,
  )

const isErrorCode = (t: Messages, code: string): code is ErrorCode =>
  Object.prototype.hasOwnProperty.call(t.errors, code)

/**
 * 오류 표시 문구 선택. ko 는 Rust 가 준 자세한 message(빈 문자열이 아닐 때)를 그대로 쓰고,
 * 그 외(또는 ko 인데 message 가 빈 문자열)는 code 사전 문구, 모르는 code 는 unknown.
 */
export const errorText = (t: Messages, language: Language, e: BridgeError): string => {
  if (language === 'ko' && e.message !== '') return e.message
  return isErrorCode(t, e.code) ? t.errors[e.code] : t.errors.unknown
}
