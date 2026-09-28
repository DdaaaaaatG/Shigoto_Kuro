/**
 * 그림 URL의 알파 마스크를 화면 밖 캔버스로 읽어 낸다(CR-040, R-37). 실패(로드 실패·getContext
 * 없음·getImageData SecurityError)는 모두 null 로 본다 — 던지지 않고 콘솔에도 남기지 않는다.
 * asset 프로토콜은 모든 응답에 Access-Control-Allow-Origin 을 붙이므로 crossOrigin='anonymous' 로
 * 읽으면 캔버스가 오염되지 않는다(drag-hit.md §2.1). crossOrigin 은 반드시 src 보다 먼저 지정한다.
 * 미리보기에 보이는 `<img>`(crossOrigin 없음)는 오염되므로 재사용하지 않고 마스크용 Image 를 따로 만든다.
 */
import { useEffect, useState } from 'react'
import { buildAlphaMask, type AlphaMask } from '../alphaMask'

export const useAlphaMask = (url: string | undefined): AlphaMask | null => {
  const [mask, setMask] = useState<AlphaMask | null>(null)

  useEffect(() => {
    setMask(null)
    if (!url) return undefined

    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      if (cancelled) return
      const width = img.naturalWidth
      const height = img.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        setMask(null)
        return
      }
      ctx.drawImage(img, 0, 0)
      try {
        setMask(buildAlphaMask(ctx.getImageData(0, 0, width, height).data, width, height))
      } catch {
        setMask(null)
      }
    }
    img.onerror = () => {
      if (!cancelled) setMask(null)
    }
    img.src = url

    return () => {
      cancelled = true
      img.onload = null
      img.onerror = null
    }
  }, [url])

  return mask
}
