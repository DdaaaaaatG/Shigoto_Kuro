/**
 * 그림 알파(불투명도) 마스크 — 팔·손 끌기 픽셀 판정(CR-040, R-37)의 데이터 모양·순수 계산.
 * 마스크는 프론트에서 화면 밖 캔버스로 만든다(components/useAlphaMask.ts). 이 파일은 React·DOM에
 * 의존하지 않는 순수 함수만 둬서 jsdom 없이도 테스트한다. 기준: src/settings/design/drag-hit.md §5.1.
 */

/** width×height 그림의 픽셀별 알파(0~255). alpha[y × width + x] 가 그 픽셀의 알파 */
export type AlphaMask = {
  readonly width: number
  readonly height: number
  readonly alpha: Uint8Array
}

/** `ImageData.data`(RGBA 순, width×height×4 이상)에서 알파만 행 우선으로 복사한다. 입력은 바꾸지 않는다 */
export const buildAlphaMask = (
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): AlphaMask | null => {
  if (!Number.isInteger(width) || width < 1) return null
  if (!Number.isInteger(height) || height < 1) return null
  if (rgba.length < width * height * 4) return null

  const alpha = new Uint8Array(width * height)
  for (let i = 0; i < alpha.length; i += 1) {
    alpha[i] = rgba[i * 4 + 3]
  }
  return { width, height, alpha }
}

/** 마스크 기준 좌표(x, y)의 픽셀이 칠해져 있는지(알파 > 0). 좌표는 내림, 밖이면 false */
export const isOpaqueAt = (mask: AlphaMask, x: number, y: number): boolean => {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  if (ix < 0 || ix >= mask.width || iy < 0 || iy >= mask.height) return false
  return mask.alpha[iy * mask.width + ix] > 0
}
