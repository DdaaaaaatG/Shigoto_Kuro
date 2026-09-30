/**
 * 프리셋 카드 미리보기 배치(presetValues — previewLayout · PREVIEW_ORDER · DEFAULT_PREVIEW_RATIO) 스펙 — CR-065 · R-68.
 * 기준: src/settings/design/presets-tab.md §11.3(순수 모듈 추가·검증 예·겹침 순서 근거표)·§11.9 · requirements v1.29 R-68
 *       · contract v0.31 PresetPreview · PresetPreviewLayer(src/bridge/types.ts 실물) · scenarios.md 「v31 개정」 절 TC-354 ~ TC-356.
 * React·bridge 호출 없음 — bridge/types 상수(BASE_BOX·slotKey)만 실물.
 * 겹침 순서는 EXPECTED_ORDER 한 곳에만 적는다. body·idle 포함 여부·위치는 §11.3 확정 대기(scenarios AD-1) —
 * 확정본과 다르면 이 상수 한 줄만 고친다(판정 방식 불변).
 * 구현 전 Red 가 정상: previewLayout·PREVIEW_ORDER·DEFAULT_PREVIEW_RATIO 가 없으면 import 가 실패한다.
 */
import { describe, expect, it } from 'vitest'
import { BASE_BOX, type AssetSlot, type PresetPreview, type PresetPreviewLayer } from 'bridge/types'
import { DEFAULT_PREVIEW_RATIO, PREVIEW_ORDER, previewLayout } from '../presetValues'

/** 오버레이 렌더 순서(src/overlay/index.tsx, CR-051): 헤어 → 배경 → 뽀모도 인물·말풍선 → 팔 → 몸통·상태(대기) → 키보드 → 펜 손 */
const EXPECTED_ORDER = ['hair', 'background', 'pomo_char', 'pomo_bubble', 'mouse_base', 'body', 'idle', 'kb_up', 'pen_up']

const layer = (slot: AssetSlot, w = 900, h = 700, tag = ''): PresetPreviewLayer => {
  const k = typeof slot === 'string' ? slot : `${slot.kind}_${slot.index}`
  return { slot, url: `asset://presets/p1/${k}.png${tag}`, width: w, height: h }
}
const CANVAS = { width: 900, height: 700 }
const FULL_BOX = { left: 0, top: 0, width: 100, height: 100 }
const pct = (v: number, of: number) => (v / of) * 100
const pick = ({ key, left, top, width, height }: { key: string; left: number; top: number; width: number; height: number }) => ({
  key,
  left,
  top,
  width,
  height,
})
/** 부동소수 비교 — 설계 「반올림 없음」: 10자리까지 같으면 같은 값 */
const expectBox = (got: { left: number; top: number; width: number; height: number }, want: typeof got) => {
  for (const k of ['left', 'top', 'width', 'height'] as const) expect(got[k], k).toBeCloseTo(want[k], 10)
}

describe('previewLayout — 배치 계산 (presets-tab §11.3, R-68)', () => {
  it('TC-354: 설계 검증 예 — 캔버스 900×700 · kb_up · mouse_base 200×150 @ partPos (411,464) · pen_up 120×90 @ penPos (372,476) → aspectRatio "900 / 700", 팔·펜 손 = 캔버스 대비 %(반올림 없음), kb_up = (0,0,100,100), 순서 mouse_base → kb_up → pen_up', () => {
    const preview: PresetPreview = {
      canvas: CANVAS,
      layers: [layer('pen_up', 120, 90), layer('kb_up'), layer('mouse_base', 200, 150)], // 순서 의미 없음(계약)
      partPos: { x: 411, y: 464 },
      penPos: { x: 372, y: 476 },
    }
    const out = previewLayout(preview)
    expect(out).not.toBeNull()
    expect(out!.aspectRatio).toBe('900 / 700')
    expect(out!.items.map(i => i.key)).toEqual(['mouse_base', 'kb_up', 'pen_up'])
    const [arm, kb, pen] = out!.items
    expectBox(arm, { left: pct(411, 900), top: pct(464, 700), width: pct(200, 900), height: pct(150, 700) })
    expect(arm.left).toBeCloseTo(45.6667, 3)
    expect(arm.top).toBeCloseTo(66.2857, 3)
    expect(arm.width).toBeCloseTo(22.2222, 3)
    expect(arm.height).toBeCloseTo(21.4286, 3)
    expect(kb).toMatchObject(FULL_BOX)
    expectBox(pen, { left: pct(372, 900), top: 68, width: pct(120, 900), height: pct(90, 700) })
    expect(pen.left).toBeCloseTo(41.3333, 3)
    expect(pen.width).toBeCloseTo(13.3333, 3)
    expect(pen.height).toBeCloseTo(12.8571, 3)
    // url 은 core 값 그대로(ui 가 경로를 조립하지 않음 — §11.8)
    expect(out!.items.map(i => i.url)).toEqual([
      'asset://presets/p1/mouse_base.png',
      'asset://presets/p1/kb_up.png',
      'asset://presets/p1/pen_up.png',
    ])
    // 위임문 예(기본 세트 팔 168×150): width 18.666…%
    const arm168 = previewLayout({ ...preview, layers: [layer('mouse_base', 168, 150)] })!.items[0]
    expectBox(arm168, { left: pct(411, 900), top: pct(464, 700), width: pct(168, 900), height: pct(150, 700) })
    expect(arm168.width).toBeCloseTo(18.6667, 3)
  })

  it('TC-355: 겹침 순서 = PREVIEW_ORDER(오버레이 순서) — 캔버스 레이어는 전부 (0,0,100,100), 목록 밖 슬롯(rest·key_*·kb_down·mouse_left/right·pen_down) 무시, 같은 키 여럿이면 첫째만', () => {
    expect([...PREVIEW_ORDER]).toEqual(EXPECTED_ORDER)
    const ignored: AssetSlot[] = [
      'rest',
      'key_space',
      { kind: 'kb_down', index: 0 },
      'mouse_left',
      'mouse_right',
      { kind: 'pen_down', index: 0 },
    ]
    const all: PresetPreviewLayer[] = [
      ...ignored.map(s => layer(s)),
      layer('pen_up', 100, 80),
      layer('kb_up'),
      layer('kb_up', 900, 700, '?dup'), // 같은 키 둘째 — 무시
      layer('idle'),
      layer('body'),
      layer('mouse_base', 168, 150),
      layer('pomo_bubble'),
      layer('pomo_char'),
      layer('background'),
      layer('hair'),
    ]
    const out = previewLayout({ canvas: CANVAS, layers: all, partPos: { x: 411, y: 464 }, penPos: { x: 0, y: 0 } })!
    expect(out.items.map(i => i.key)).toEqual(EXPECTED_ORDER)
    for (const item of out.items) {
      if (item.key === 'mouse_base' || item.key === 'pen_up') continue
      expect(pick(item), item.key).toEqual({ key: item.key, ...FULL_BOX })
    }
    expect(out.items.find(i => i.key === 'kb_up')!.url).toBe('asset://presets/p1/kb_up.png') // 첫째
    expect(out.items.find(i => i.key === 'pen_up')).toMatchObject({ left: 0, top: 0 })
    // 시간 글자 등 그림 아닌 항목은 만들지 않는다(키는 슬롯뿐)
    expect(out.items).toHaveLength(EXPECTED_ORDER.length)
  })

  it('TC-356: 표시 불가·생략 — canvas null·0·무한 → null, layers [] → items [], penPos null → pen_up 생략, 캔버스 레이어 없이 팔만 있어도 canvas 가 있으면 배치, 입력 불변, DEFAULT_PREVIEW_RATIO = BASE_BOX 비율 "450 / 350"', () => {
    expect(DEFAULT_PREVIEW_RATIO).toBe(`${BASE_BOX.width} / ${BASE_BOX.height}`)
    expect(DEFAULT_PREVIEW_RATIO).toBe('450 / 350')
    const base: PresetPreview = {
      canvas: CANVAS,
      layers: [layer('kb_up'), layer('mouse_base', 168, 150), layer('pen_up', 100, 80)],
      partPos: { x: 411, y: 464 },
      penPos: null,
    }
    expect(previewLayout({ ...base, canvas: null })).toBeNull()
    for (const c of [
      { width: 0, height: 700 },
      { width: 900, height: 0 },
      { width: -900, height: 700 },
      { width: Number.NaN, height: 700 },
      { width: 900, height: Number.POSITIVE_INFINITY },
    ]) {
      expect(previewLayout({ ...base, canvas: c }), JSON.stringify(c)).toBeNull()
    }
    expect(previewLayout({ ...base, layers: [] })).toEqual({ aspectRatio: '900 / 700', items: [] })
    const noPen = previewLayout(base)!
    expect(noPen.items.map(i => i.key)).toEqual(['mouse_base', 'kb_up'])
    const armOnly = previewLayout({ ...base, layers: [layer('mouse_base', 168, 150)] })!
    expect(armOnly.items.map(i => i.key)).toEqual(['mouse_base'])
    // 범위 밖 위치도 그대로(박스가 잘라 낸다)
    const off = previewLayout({ ...base, partPos: { x: 990, y: -70 } })!.items[0]
    expectBox(off, { left: 110, top: -10, width: pct(168, 900), height: pct(150, 700) })
    // 비정사각 캔버스
    expect(previewLayout({ ...base, canvas: { width: 600, height: 700 } })!.aspectRatio).toBe('600 / 700')
    // 입력 불변
    const before = JSON.stringify(base)
    previewLayout(base)
    expect(JSON.stringify(base)).toBe(before)
    expect(() => previewLayout({ ...base, canvas: { width: Number.NaN, height: Number.NaN } })).not.toThrow()
  })
})
