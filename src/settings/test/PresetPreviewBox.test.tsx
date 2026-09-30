/**
 * 프리셋 카드 합성 미리보기(PresetPreviewBox) 스펙 — CR-065 · R-68 · R-66.
 * 기준: src/settings/design/presets-tab.md §11.2(props { preview })·§11.4(failedUrl·failed 파생)·§11.5(렌더·onError)·§11.6·§11.7
 *       · design/i18n.md §4.12 CR-065 추가분(presetPreviewUnavailable) · scenarios.md 「v31 개정」 절 TC-357 ~ TC-359.
 * bridge 호출 없음(표시 전용, onError 를 부모로 올리지 않는다). 가짜 시계 없음. 이미지 로드 실패는 fireEvent.error 로 흉내.
 * 위치·크기는 인라인 % 문자열 — 부동소수 표기 차이를 피하려 parseFloat 로 10자리 비교한다.
 * 구현 전 Red 가 정상: components/PresetPreviewBox.tsx 가 없으면 import 가 실패한다.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AssetSlot, PresetPreview, PresetPreviewLayer } from 'bridge/types'
import PresetPreviewBox from '../components/PresetPreviewBox'
import { MessagesProvider } from '../i18n/MessagesContext'
import { ja } from '../i18n/ja'
import { en } from '../i18n/en'

const NOTE_KO = '미리보기를 표시할 수 없습니다.'
const layer = (slot: AssetSlot, w = 900, h = 700, dir = 'p1'): PresetPreviewLayer => ({
  slot,
  url: `asset://presets/${dir}/${String(slot)}.png`,
  width: w,
  height: h,
})
const PV: PresetPreview = {
  canvas: { width: 900, height: 700 },
  layers: [layer('kb_up'), layer('pen_up', 120, 90), layer('background'), layer('mouse_base', 168, 150), layer('rest')],
  partPos: { x: 411, y: 464 },
  penPos: { x: 372, y: 476 },
}
const imgs = (c: HTMLElement) => Array.from(c.querySelectorAll('img'))
const box = (c: HTMLElement) => c.firstElementChild as HTMLElement
const pctOf = (s: string) => {
  expect(s.endsWith('%'), s).toBe(true)
  return parseFloat(s)
}

describe('PresetPreviewBox — 합성 렌더 (§11.5 · §11.7, R-68)', () => {
  it('TC-357: 박스 aspect-ratio = "900 / 700", img = PREVIEW_ORDER 순서(배경 → 팔 → kb_up → 펜 손, rest 제외)·src = core url·alt ""·draggable false·loading lazy·인라인 % 위치(팔 partPos · 펜 penPos · 캔버스 레이어 0/0/100/100)·transform 없음, 박스는 role·이름·글자 없음(시간 글자 없음)', () => {
    const { container } = render(<PresetPreviewBox preview={PV} />)
    expect(box(container).style.aspectRatio).toBe('900 / 700')
    expect(box(container)).not.toHaveAttribute('role')
    expect(box(container)).not.toHaveAttribute('aria-label')
    expect(box(container).textContent).toBe('') // 안내 문구·시간 글자 없음
    const list = imgs(container)
    expect(list.map(i => i.getAttribute('src'))).toEqual([
      'asset://presets/p1/background.png',
      'asset://presets/p1/mouse_base.png',
      'asset://presets/p1/kb_up.png',
      'asset://presets/p1/pen_up.png',
    ])
    for (const i of list) {
      expect(i).toHaveAttribute('alt', '') // 장식 — 보조기술이 건너뜀
      expect(i).toHaveAttribute('draggable', 'false')
      expect(i).toHaveAttribute('loading', 'lazy')
      expect(i.style.transform).toBe('')
    }
    expect(screen.queryAllByRole('img')).toHaveLength(0) // alt="" → presentation
    const [bg, arm, kb, pen] = list
    for (const i of [bg, kb]) {
      expect([i.style.left, i.style.top, i.style.width, i.style.height].map(pctOf)).toEqual([0, 0, 100, 100])
    }
    const expectPos = (i: HTMLImageElement, want: number[]) =>
      [i.style.left, i.style.top, i.style.width, i.style.height].map(pctOf).forEach((v, n) => expect(v).toBeCloseTo(want[n], 10))
    expectPos(arm, [(411 / 900) * 100, (464 / 700) * 100, (168 / 900) * 100, (150 / 700) * 100])
    expectPos(pen, [(372 / 900) * 100, 68, (120 / 900) * 100, (90 / 700) * 100])
  })

  it('TC-358: 표시할 것 없음 — canvas null → 안내 문구 하나만·img 0·박스 비율 "450 / 350", layers 에 미리보기 슬롯 없음 → 안내 문구·비율 "900 / 700", penPos null → 펜 손 img 없음', () => {
    const r = render(<PresetPreviewBox preview={{ ...PV, canvas: null }} />)
    expect(box(r.container).style.aspectRatio).toBe('450 / 350')
    expect(imgs(r.container)).toHaveLength(0)
    expect(box(r.container).textContent).toBe(NOTE_KO)
    expect(r.container.querySelectorAll('p')).toHaveLength(1)
    r.rerender(<PresetPreviewBox preview={{ ...PV, layers: [layer('rest'), layer('key_space')] }} />)
    expect(box(r.container).style.aspectRatio).toBe('900 / 700')
    expect(imgs(r.container)).toHaveLength(0)
    expect(box(r.container).textContent).toBe(NOTE_KO)
    r.rerender(<PresetPreviewBox preview={{ ...PV, penPos: null }} />)
    expect(imgs(r.container).map(i => i.getAttribute('src'))).not.toContain('asset://presets/p1/pen_up.png')
    expect(imgs(r.container)).toHaveLength(3)
    expect(box(r.container).textContent).toBe('')
  })

  it('TC-359: 그림 한 장이라도 로드 실패(img error) → 박스 전체가 안내 문구(img 0), 다른 url 목록으로 다시 렌더되면 저절로 풀림, 같은 url 목록이면 유지 · ja·en 안내 문구', () => {
    const r = render(<PresetPreviewBox preview={PV} />)
    fireEvent.error(imgs(r.container)[1]) // 팔 한 장
    expect(imgs(r.container)).toHaveLength(0)
    expect(box(r.container).textContent).toBe(NOTE_KO)
    expect(box(r.container).style.aspectRatio).toBe('900 / 700') // 박스 비율은 유지
    // 같은 url 목록(새 객체) — 실패 유지
    r.rerender(<PresetPreviewBox preview={{ ...PV, layers: [...PV.layers] }} />)
    expect(box(r.container).textContent).toBe(NOTE_KO)
    // 다른 폴더(url 목록이 바뀜) — 되살림 효과 없이 풀림
    const other: PresetPreview = { ...PV, layers: PV.layers.map(l => layer(l.slot, l.width, l.height, 'p2')) }
    r.rerender(<PresetPreviewBox preview={other} />)
    expect(imgs(r.container)).toHaveLength(4)
    expect(box(r.container).textContent).toBe('')
    r.unmount()
    for (const [dict, lang] of [
      [ja, 'ja'],
      [en, 'en'],
    ] as const) {
      const v = render(
        <MessagesProvider language={lang}>
          <PresetPreviewBox preview={{ ...PV, canvas: null }} />
        </MessagesProvider>,
      )
      expect(box(v.container).textContent).toBe(dict.presetPreviewUnavailable)
      v.unmount()
    }
  })
})
