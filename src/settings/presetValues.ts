/**
 * 프리셋 탭 순수 판정·표시 함수 — design/presets-tab.md §3(CR-064, R-58·R-62·R-65·R-66).
 * React·bridge 호출 없음(타입·상수만 가져온다). 필수 그림 목록은 bridge `REQUIRED_SLOTS`가 정본이다.
 */
import {
  BASE_BOX,
  REQUIRED_SLOTS,
  slotKey,
  type AssetManifest,
  type AssetSlot,
  type BridgeError,
  type Language,
  type PresetPreview,
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

/** 미리보기에 쓰는 슬롯 키(= `slotKey` 반환 문자열) */
export type PreviewKey = 'hair' | 'background' | 'pomo_char' | 'pomo_bubble' | 'mouse_base' | 'body' | 'idle' | 'kb_up' | 'pen_up'

/** 한 장의 표시 위치·크기 — 단위 = 캔버스 대비 %(범위 밖 허용, 박스가 잘라 낸다) */
export type PreviewItem = { key: PreviewKey; url: string; left: number; top: number; width: number; height: number }

export type PreviewLayout = { aspectRatio: string; items: PreviewItem[] }

/** 겹침 순서(아래 → 위) — 오버레이 렌더 순서(CR-051)의 쉬는 자세, 시간 글자 제외 */
export const PREVIEW_ORDER: readonly PreviewKey[] = [
  'hair',
  'background',
  'pomo_char',
  'pomo_bubble',
  'mouse_base',
  'body',
  'idle',
  'kb_up',
  'pen_up',
]

/** 캔버스를 모를 때 박스 비율 */
export const DEFAULT_PREVIEW_RATIO = `${BASE_BOX.width} / ${BASE_BOX.height}`

const isPositive = (n: number): boolean => Number.isFinite(n) && n > 0

/** 미리보기 배치 계산(순수). 캔버스를 모르면 null, 목록 밖 슬롯은 무시, 입력을 바꾸지 않는다 */
export const previewLayout = (preview: PresetPreview): PreviewLayout | null => {
  const { canvas, layers, partPos, penPos } = preview
  if (!canvas || !isPositive(canvas.width) || !isPositive(canvas.height)) return null
  const { width: cw, height: ch } = canvas
  const items: PreviewItem[] = []
  for (const key of PREVIEW_ORDER) {
    const layer = layers.find(l => slotKey(l.slot) === key)
    if (!layer) continue
    const pos = key === 'mouse_base' ? partPos : key === 'pen_up' ? penPos : undefined
    if (key === 'pen_up' && !pos) continue
    const box = pos
      ? {
          left: (pos.x / cw) * 100,
          top: (pos.y / ch) * 100,
          width: (layer.width / cw) * 100,
          height: (layer.height / ch) * 100,
        }
      : { left: 0, top: 0, width: 100, height: 100 }
    items.push({ key, url: layer.url, ...box })
  }
  return { aspectRatio: `${cw} / ${ch}`, items }
}
