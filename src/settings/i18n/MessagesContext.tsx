/**
 * settings 언어 컨텍스트 — design/i18n.md §3. Provider 밖에서 쓰면 기본값 ko.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Language } from 'bridge/types'
import { LANGUAGES, messagesFor } from './index'
import type { Messages } from './types'

interface MessagesContextValue {
  t: Messages
  language: Language
}

const DEFAULT_LANGUAGE: Language = 'ko'
const DEFAULT_VALUE: MessagesContextValue = {
  t: messagesFor(DEFAULT_LANGUAGE),
  language: DEFAULT_LANGUAGE,
}

const MessagesContext = createContext<MessagesContextValue>(DEFAULT_VALUE)

export type MessagesProviderProps = {
  language: string
  children?: ReactNode
}

export const MessagesProvider = ({ language, children }: MessagesProviderProps) => {
  const value = useMemo<MessagesContextValue>(() => {
    const resolved = (LANGUAGES as readonly string[]).includes(language)
      ? (language as Language)
      : DEFAULT_LANGUAGE
    return { t: messagesFor(language), language: resolved }
  }, [language])
  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>
}

export const useMessages = (): Messages => useContext(MessagesContext).t
export const useLanguage = (): Language => useContext(MessagesContext).language
