/**
 * settings 알파 마스크 스펙 — CR-040(R-37 끌기 픽셀 판정).
 * 기준: src/settings/design/drag-hit.md §5.1 `AlphaMask`·`buildAlphaMask`·`isOpaqueAt`·예, §5.3 `useAlphaMask`,
 *       §2.1(마스크용 Image 를 따로 만들고 crossOrigin='anonymous' 를 src 보다 먼저), §2.3(실패 = null), §4 `partMask`·`penMask`
 *       · scenarios.md TC-208 · TC-209(순수) · TC-213 ~ TC-215(훅).
 * 훅 테스트: jsdom 은 이미지를 읽지 않고 캔버스 2D 도 없다 → 전역 Image 를 FakeImage 로 바꾸고(vi.stubGlobal),
 *   HTMLCanvasElement.prototype.getContext 를 spy 로 바꿔 onload/onerror 를 테스트가 직접 부른다(실제 sleep·가짜 시계 없음).
 *   실제 WebView2·asset 프로토콜 CORS(개발 localhost:1420 · 배포 tauri.localhost)는 수동 M-40a.
 * 선행: CR-040 소스 — src/settings/alphaMask.ts, src/settings/components/useAlphaMask.ts(named export `useAlphaMask`).
 *   없으면 이 파일은 import 단계에서 실패한다(TDD 예정된 FAIL).
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { buildAlphaMask, isOpaqueAt, type AlphaMask } from '../alphaMask'
import { useAlphaMask } from '../components/useAlphaMask'

// ─── buildAlphaMask · isOpaqueAt (순수) ─────────────────────────────────────
describe('buildAlphaMask (drag-hit §5.1)', () => {
  it('TC-208: RGBA 의 넷째 값(알파)만 행 우선으로 새 Uint8Array(width×height)에 복사하고 입력은 바꾸지 않는다', () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 0, 9, 9, 9, 255])
    const m = buildAlphaMask(rgba, 2, 1)
    expect(m).not.toBeNull()
    expect(m?.width).toBe(2)
    expect(m?.height).toBe(1)
    expect(m?.alpha).toBeInstanceOf(Uint8Array)
    expect(Array.from(m?.alpha ?? [])).toEqual([0, 255])
    expect(Array.from(rgba)).toEqual([0, 0, 0, 0, 9, 9, 9, 255]) // 입력 불변
    rgba[7] = 0 // 복사본이므로 입력을 나중에 바꿔도 마스크는 그대로
    expect(m?.alpha[1]).toBe(255)

    const m22 = buildAlphaMask(new Uint8ClampedArray([1, 2, 3, 1, 4, 5, 6, 128, 7, 8, 9, 0, 0, 0, 0, 7]), 2, 2)
    expect(Array.from(m22?.alpha ?? [])).toEqual([1, 128, 0, 7])

    // 배열이 더 길어도(width×height×4 이상) 된다 — 길이는 width×height
    const longer = buildAlphaMask(new Uint8ClampedArray([0, 0, 0, 5, 0, 0, 0, 6, 0, 0, 0, 99]), 2, 1)
    expect(longer?.alpha).toHaveLength(2)
    expect(Array.from(longer?.alpha ?? [])).toEqual([5, 6])
  })

  it('TC-208: width·height 가 정수 1 이상이 아니거나 배열이 width×height×4 보다 짧으면 null', () => {
    expect(buildAlphaMask(new Uint8ClampedArray(4), 2, 1)).toBeNull() // 길이 부족(설계 예)
    expect(buildAlphaMask(new Uint8ClampedArray(8), 0, 1)).toBeNull() // 폭 0(설계 예)
    expect(buildAlphaMask(new Uint8ClampedArray(8), 2, 0)).toBeNull()
    expect(buildAlphaMask(new Uint8ClampedArray(8), -2, 1)).toBeNull()
    expect(buildAlphaMask(new Uint8ClampedArray(8), 1.5, 1)).toBeNull() // 정수 아님(길이는 충분)
    expect(buildAlphaMask(new Uint8ClampedArray(8), 2, Number.NaN)).toBeNull()
  })
})

describe('isOpaqueAt (drag-hit §5.1)', () => {
  const m: AlphaMask = { width: 2, height: 1, alpha: new Uint8Array([0, 255]) }

  it('TC-209: 설계 예 — (0,0) 투명 · (1,0) 칠함 · (2,0)·(-1,0) 은 밖이라 false', () => {
    expect(isOpaqueAt(m, 0, 0)).toBe(false)
    expect(isOpaqueAt(m, 1, 0)).toBe(true)
    expect(isOpaqueAt(m, 2, 0)).toBe(false)
    expect(isOpaqueAt(m, -1, 0)).toBe(false)
  })

  it('TC-209: 좌표는 내림(floor), 색인은 행 우선 y×width+x, 알파 1 도 칠함, y 가 밖이어도 false', () => {
    expect(isOpaqueAt(m, 1.9, 0.99)).toBe(true) // → (1,0)
    expect(isOpaqueAt(m, 0.99, 0)).toBe(false) // → (0,0)
    expect(isOpaqueAt(m, -0.5, 0)).toBe(false) // → (-1,0)
    expect(isOpaqueAt(m, 1, 1)).toBe(false)
    expect(isOpaqueAt(m, 1, -1)).toBe(false)
    const m32: AlphaMask = { width: 3, height: 2, alpha: new Uint8Array([0, 0, 1, 0, 0, 0]) }
    expect(isOpaqueAt(m32, 2, 0)).toBe(true) // 색인 2, 알파 1
    expect(isOpaqueAt(m32, 1, 0)).toBe(false) // 열 우선(x×height+y = 2)이면 true 가 되므로 구분된다
    expect(isOpaqueAt(m32, 0, 1)).toBe(false)
  })
})

// ─── useAlphaMask (훅) ───────────────────────────────────────────────────────
/** 속성 설정 순서(crossOrigin → src)를 기록하는 가짜 Image. onload/onerror 는 테스트가 직접 부른다 */
class FakeImage {
  static all: FakeImage[] = []
  log: string[] = []
  naturalWidth = 0
  naturalHeight = 0
  decoding = ''
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private cross: string | null = null
  private source = ''
  constructor() {
    FakeImage.all.push(this)
  }
  get crossOrigin(): string | null {
    return this.cross
  }
  set crossOrigin(v: string | null) {
    this.cross = v
    this.log.push(`crossOrigin=${v}`)
  }
  get src(): string {
    return this.source
  }
  set src(v: string) {
    this.source = v
    this.log.push(`src=${v}`)
  }
}

const URL_A = 'http://asset.localhost/C%3A%2Fkv%2Fmouse_base.png?v=1'
const URL_B = 'http://asset.localhost/C%3A%2Fkv%2Fmouse_base.png?v=2'
const URL_C = 'http://asset.localhost/C%3A%2Fkv%2Fpen_up.png?v=1'

const rgbaOf = (alphas: number[]) => new Uint8ClampedArray(alphas.flatMap(a => [7, 7, 7, a]))

let canvases: HTMLCanvasElement[]
let ctx: { drawImage: Mock; getImageData: Mock }
let context: { drawImage: Mock; getImageData: Mock } | null
let nextAlpha: number[]

/** 이미지 로드 완료 흉내 — 자연 크기·픽셀 알파를 정하고 onload 를 act 안에서 부른다 */
const load = (img: FakeImage, w: number, h: number, alphas: number[]) => {
  img.naturalWidth = w
  img.naturalHeight = h
  nextAlpha = alphas
  act(() => {
    img.onload?.()
  })
}

type Props = { url: string | undefined }

describe('useAlphaMask (drag-hit §5.3)', () => {
  beforeEach(() => {
    FakeImage.all = []
    canvases = []
    nextAlpha = []
    ctx = {
      drawImage: vi.fn(),
      getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({
        data: rgbaOf(nextAlpha),
        width: w,
        height: h,
      })),
    }
    context = ctx
    vi.stubGlobal('Image', FakeImage)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      canvases.push(this)
      return context
    } as never)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('TC-213: 마스크용 Image 를 따로 만들어 crossOrigin=anonymous 를 src 보다 먼저 두고, 로드되면 화면 밖 캔버스의 알파로 마스크 — 같은 url 재렌더는 다시 만들지 않는다', () => {
    const { result, rerender } = renderHook(({ url }: Props) => useAlphaMask(url), {
      initialProps: { url: URL_A } as Props,
    })
    expect(result.current).toBeNull() // 로드 전(초기값 null)
    expect(FakeImage.all).toHaveLength(1)
    const img = FakeImage.all[0]
    expect(img.log).toEqual(['crossOrigin=anonymous', `src=${URL_A}`])
    expect(img.decoding).toBe('async')

    load(img, 3, 2, [0, 10, 0, 255, 0, 0])
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledTimes(1)
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d', { willReadFrequently: true })
    expect(canvases[0].width).toBe(3)
    expect(canvases[0].height).toBe(2)
    expect(canvases[0].isConnected).toBe(false) // DOM 에 붙이지 않는다
    expect(ctx.drawImage).toHaveBeenCalledWith(img, 0, 0)
    expect(ctx.getImageData).toHaveBeenCalledWith(0, 0, 3, 2)
    expect(result.current).toEqual({ width: 3, height: 2, alpha: new Uint8Array([0, 10, 0, 255, 0, 0]) })

    const first = result.current
    rerender({ url: URL_A })
    expect(FakeImage.all).toHaveLength(1) // 그림 하나당 로드 1회
    expect(result.current).toBe(first)
  })

  it('TC-213: url 이 undefined 면 Image 를 만들지 않고 null', () => {
    const { result } = renderHook(() => useAlphaMask(undefined))
    expect(result.current).toBeNull()
    expect(FakeImage.all).toHaveLength(0)
    expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled()
  })

  it('TC-214: 로드 실패(onerror)·getContext 없음·getImageData SecurityError(오염 캔버스)는 모두 null — 던지지 않고 콘솔 출력 없음, 재시도 없음', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // ① onerror
    const a = renderHook(() => useAlphaMask(URL_A))
    expect(() =>
      act(() => {
        FakeImage.all[0].onerror?.()
      }),
    ).not.toThrow()
    expect(a.result.current).toBeNull()
    a.unmount()

    // ② getContext → null
    context = null
    const b = renderHook(() => useAlphaMask(URL_B))
    expect(() => load(FakeImage.all[1], 3, 2, [255, 255, 255, 255, 255, 255])).not.toThrow()
    expect(b.result.current).toBeNull()
    expect(ctx.getImageData).not.toHaveBeenCalled()
    b.unmount()

    // ③ getImageData 가 SecurityError(crossOrigin 없이 읽은 경우의 오염 캔버스 흉내)
    context = ctx
    ctx.getImageData.mockImplementation(() => {
      throw new DOMException('The canvas has been tainted by cross-origin data.', 'SecurityError')
    })
    const c = renderHook(() => useAlphaMask(URL_C))
    expect(() => load(FakeImage.all[2], 3, 2, [])).not.toThrow()
    expect(c.result.current).toBeNull()

    expect(FakeImage.all).toHaveLength(3) // 실패해도 다시 읽지 않는다
    expect(err).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })

  it('TC-215: url 이 바뀌면 즉시 null 로 되돌리고 새 Image 로 다시 만든다 — 옛 Image 콜백은 떼고, 늦게 온 옛 onload 는 무시, 비우면 null', () => {
    const { result, rerender, unmount } = renderHook(({ url }: Props) => useAlphaMask(url), {
      initialProps: { url: URL_A } as Props,
    })
    load(FakeImage.all[0], 3, 2, [0, 10, 0, 255, 0, 0])
    expect(result.current?.width).toBe(3)

    const oldImg = FakeImage.all[0]
    const staleOnload = oldImg.onload // 정리 전에 잡아 둔 콜백(늦게 도착한 load 흉내)
    rerender({ url: URL_B }) // 교체 — contract §3.2 url 버전(?v=)이 바뀜
    expect(result.current).toBeNull()
    expect(FakeImage.all).toHaveLength(2)
    expect(oldImg.onload).toBeNull()
    expect(oldImg.onerror).toBeNull()
    const newImg = FakeImage.all[1]
    expect(newImg.log).toEqual(['crossOrigin=anonymous', `src=${URL_B}`])

    const draws = ctx.drawImage.mock.calls.length
    oldImg.naturalWidth = 3
    oldImg.naturalHeight = 2
    nextAlpha = [255, 255, 255, 255, 255, 255]
    act(() => {
      staleOnload?.()
    })
    expect(result.current).toBeNull() // cancelled → 무시
    expect(ctx.drawImage).toHaveBeenCalledTimes(draws)

    load(newImg, 1, 1, [200])
    expect(result.current).toEqual({ width: 1, height: 1, alpha: new Uint8Array([200]) })

    rerender({ url: undefined }) // 비움
    expect(result.current).toBeNull()
    expect(FakeImage.all).toHaveLength(2) // 새 Image 없음
    expect(newImg.onload).toBeNull()
    expect(() => unmount()).not.toThrow()
  })
})
