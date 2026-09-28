/// <reference types="node" />
/**
 * CSS 규칙 정적 TC — jsdom은 CSS Modules 계산 스타일을 주지 않으므로 소스 규칙을 직접 읽어 단언한다.
 * 대상: src/overlay/overlay.module.css (design.md §2·§10.3·§10.5, design/functions.md §5.4 .armWrap 컨테이너 4, design/a11y.md)
 * 원문 읽기: Node `fs.readFileSync`(이 파일 기준 상대 경로). `?raw` import는 vitest가 `.module.css`를
 *   CSS Modules 객체로 처리해 collect 단계에서 실패하므로(`css.replace is not a function`) 쓰지 않는다(2026-09-25 복구).
 * CR-022(R-23): 바운스 = .jellyWrap 하나의 젤리(.jelly/.jellyAlt, 350ms ease-in-out, transform-origin 50% 100%, scale 6구간).
 *   옛 .bounce/.bounceAlt·@keyframes bounce/bounceAlt 는 삭제 대상이다.
 * CR-023(R-24): 부르르 = .jellyWrap 의 .shiver(80ms ease-in-out infinite, scale 5구간).
 * 시나리오: src/overlay/test/scenarios.md TC-078 ~ TC-082, TC-112, TC-143, TC-158, TC-174
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// jsdom 환경의 전역 URL을 거치지 않도록 문자열 → 경로 변환(fileURLToPath)만 쓴다
const CSS_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../overlay.module.css')
const css = readFileSync(CSS_PATH, 'utf8')

const norm = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')

/** `selector {` 로 시작하는 블록 본문(중첩 괄호 균형). 없으면 '' */
const block = (selector: string): string => {
  const at = norm.indexOf(`${selector} {`)
  if (at < 0) return ''
  const start = norm.indexOf('{', at)
  let depth = 0
  for (let i = start; i < norm.length; i++) {
    if (norm[i] === '{') depth++
    else if (norm[i] === '}') {
      depth--
      if (depth === 0) return norm.slice(start + 1, i)
    }
  }
  return ''
}

/** 선언 목록 → { 속성: 값 } */
const decl = (body: string): Record<string, string> =>
  Object.fromEntries(
    body
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => {
        const k = s.indexOf(':')
        return [s.slice(0, k).trim(), s.slice(k + 1).trim()]
      }),
  )

/**
 * keyframe 구간별 선언 표. "0% {"가 "100% {"의 부분 문자열로 잘못 잡히지 않게,
 * 숫자 앞에 문자열 시작·공백·'}' 중 하나가 와야 구간 시작으로 본다.
 */
const steps = (name: string): Record<string, Record<string, string>> => {
  const out: Record<string, Record<string, string>> = {}
  for (const m of block(`@keyframes ${name}`).matchAll(/(?:^|[\s}])(\d+)%\s*\{([^}]*)\}/g)) out[m[1]] = decl(m[2])
  return out
}
const sortedKeys = (o: Record<string, unknown>) => Object.keys(o).sort((a, b) => Number(a) - Number(b))

/** design.md §10.3 젤리 행 — 6구간 값(🔒 세기 보통) */
const JELLY_STEPS: Record<string, Record<string, string>> = {
  '0': { transform: 'scale(1, 1)' },
  '15': { transform: 'scale(1.06, 0.92)' },
  '35': { transform: 'scale(0.97, 1.04)' },
  '55': { transform: 'scale(1.02, 0.98)' },
  '75': { transform: 'scale(0.99, 1.01)' },
  '100': { transform: 'scale(1, 1)' },
}

/** design.md §10.3 부르르 행 — 5구간 값(CR-023, R-24) */
const SHIVER_STEPS: Record<string, Record<string, string>> = {
  '0': { transform: 'scale(1, 1)' },
  '25': { transform: 'scale(1.02, 0.97)' },
  '50': { transform: 'scale(1, 1)' },
  '75': { transform: 'scale(0.99, 1.02)' },
  '100': { transform: 'scale(1, 1)' },
}

describe('overlay.module.css', () => {
  it('TC-174: .shiver = shiver 80ms ease-in-out infinite(fill 없음), @keyframes shiver 5구간 scale 값, .jellyWrap 자체 animation 없음·.jelly 1회 불변 (CR-023)', () => {
    expect(decl(block('.shiver'))).toEqual({ animation: 'shiver 80ms ease-in-out infinite' })
    const kf = steps('shiver')
    expect(sortedKeys(kf)).toEqual(['0', '25', '50', '75', '100'])
    expect(kf).toEqual(SHIVER_STEPS)
    expect(block('@keyframes shiver')).not.toMatch(/translate|rotate/)
    expect(decl(block('.jellyWrap')).animation).toBeUndefined()
    expect(decl(block('.jelly'))).toEqual({ animation: 'jelly 350ms ease-in-out' })
    expect(decl(block('.jellyAlt'))).toEqual({ animation: 'jellyAlt 350ms ease-in-out' })
  })

  it('TC-078: .root = 창 전체(100vw×100vh)·overflow hidden, 장식 없음, 전역 배경 투명·선택 없음', () => {
    const root = decl(block('.root'))
    expect(root.width).toBe('100vw')
    expect(root.height).toBe('100vh')
    expect(root.overflow).toBe('hidden')
    for (const k of ['background', 'background-color', 'border', 'box-shadow', 'outline']) {
      expect(root[k]).toBeUndefined()
    }
    expect(norm).not.toMatch(/box-shadow|border\s*:/)
    const global = decl(block(":global(body[data-window='overlay'] #root)"))
    expect(global.background).toBe('transparent')
    expect(global.overflow).toBe('hidden')
    expect(global['user-select']).toBe('none')
  })

  it('TC-079: .canvas = 좌상단 원점(left 0·top 0)·transform-origin top left·pointer-events none, 가운데 정렬·애니메이션 없음', () => {
    const cv = decl(block('.canvas'))
    expect(cv.position).toBe('absolute')
    expect(cv.left).toBe('0')
    expect(cv.top).toBe('0')
    expect(cv['transform-origin']).toBe('top left')
    expect(cv['pointer-events']).toBe('none')
    expect(cv.animation).toBeUndefined()
    expect(cv.margin).toBeUndefined()
    expect(cv.transform).toBeUndefined()
  })

  it('TC-080: .jelly = jelly 350ms ease-in-out(1회·fill 없음), @keyframes jelly 6구간 scale 값, 옛 .bounce·.bounceAlt·keyframe 부재 (CR-022)', () => {
    expect(decl(block('.jelly'))).toEqual({ animation: 'jelly 350ms ease-in-out' })
    const kf = steps('jelly')
    expect(sortedKeys(kf)).toEqual(['0', '15', '35', '55', '75', '100'])
    expect(kf).toEqual(JELLY_STEPS)
    expect(block('@keyframes jelly')).not.toMatch(/translate|rotate/)
    // 폐기(CR-022): 개별 요소 바운스 클래스·keyframe이 남으면 래퍼와 이중 적용된다
    for (const sel of ['.bounce', '.bounceAlt', '@keyframes bounce', '@keyframes bounceAlt']) {
      expect(block(sel)).toBe('')
    }
    expect(norm).not.toMatch(/bounce/)
  })

  it('TC-143: .jellyAlt = jellyAlt 350ms ease-in-out, @keyframes jellyAlt는 jelly와 구간·값이 같다(이름만 다름)', () => {
    expect(decl(block('.jellyAlt'))).toEqual({ animation: 'jellyAlt 350ms ease-in-out' })
    const alt = steps('jellyAlt')
    expect(sortedKeys(alt)).toEqual(['0', '15', '35', '55', '75', '100'])
    expect(alt).toEqual(steps('jelly'))
    expect(alt['15']).toEqual({ transform: 'scale(1.06, 0.92)' })
  })

  it('TC-158: .jellyWrap = 캔버스와 같은 상자(left 0·top 0·100%)·pointer-events none·transform-origin 50% 100%, 자체 animation·transform 없음', () => {
    const j = decl(block('.jellyWrap'))
    expect(j.position).toBe('absolute')
    expect(j.left).toBe('0')
    expect(j.top).toBe('0')
    expect(j.width).toBe('100%')
    expect(j.height).toBe('100%')
    expect(j['pointer-events']).toBe('none')
    expect(j['transform-origin']).toBe('50% 100%')
    expect(j.animation).toBeUndefined()
    expect(j.transform).toBeUndefined()
  })

  // CR-051(확정사항 🔒 2026-09-26): 헤어 래퍼 .hairWrap(.canvas 첫 자식) — TC-158 짝. 시나리오 scenarios.md TC-314
  it('TC-314: .hairWrap = .jellyWrap과 같은 7선언(캔버스와 같은 상자·pointer-events none·transform-origin 50% 100%), 자체 animation·transform 없음, .jelly/.jellyAlt/.shiver는 두 래퍼 공용 단독 선택자 (CR-051)', () => {
    const hw = decl(block('.hairWrap'))
    expect(hw).toEqual({
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      'pointer-events': 'none',
      'transform-origin': '50% 100%',
    })
    expect(hw).toEqual(decl(block('.jellyWrap')))
    expect(hw.animation).toBeUndefined()
    expect(hw.transform).toBeUndefined()
    // 애니메이션 클래스가 한 래퍼 전용 복합·자손 선택자면 다른 래퍼에 붙어도 움직이지 않는다
    expect(norm).not.toMatch(/\.(jellyWrap|hairWrap)\s*\.(jelly|jellyAlt|shiver)\b/)
    expect(norm).not.toMatch(/\.(jelly|jellyAlt|shiver)\.(jellyWrap|hairWrap)\b/)
    expect(decl(block('.jelly'))).toEqual({ animation: 'jelly 350ms ease-in-out' })
    expect(decl(block('.jellyAlt'))).toEqual({ animation: 'jellyAlt 350ms ease-in-out' })
    expect(decl(block('.shiver'))).toEqual({ animation: 'shiver 80ms ease-in-out infinite' })
  })

  it('TC-081: .armWrap = 캔버스와 같은 크기·원점, pointer-events none, 자체 transform·animation 없음(CR-022: 애니메이션 없는 컨테이너)', () => {
    const w = decl(block('.armWrap'))
    expect(w.position).toBe('absolute')
    expect(w.left).toBe('0')
    expect(w.top).toBe('0')
    expect(w.width).toBe('100%')
    expect(w.height).toBe('100%')
    expect(w['pointer-events']).toBe('none')
    expect(w.transform).toBeUndefined()
    expect(w.animation).toBeUndefined()
  })

  it('TC-082: .layer = 캔버스 전체(left 0·top 0·100%), transform·animation 없음(배경도 같은 좌표)', () => {
    const l = decl(block('.layer'))
    expect(l.position).toBe('absolute')
    expect(l.left).toBe('0')
    expect(l.top).toBe('0')
    expect(l.width).toBe('100%')
    expect(l.height).toBe('100%')
    expect(l.transform).toBeUndefined()
    expect(l.animation).toBeUndefined()
  })

  it('TC-112: .hand = position absolute(CR-015 손 그림) — 크기·좌표·회전은 인라인(partPos·자연 크기), 100%·transform·animation 없음', () => {
    const hd = decl(block('.hand'))
    expect(hd.position).toBe('absolute')
    for (const k of ['width', 'height', 'left', 'top', 'transform', 'transform-origin', 'animation']) {
      expect(hd[k]).toBeUndefined()
    }
  })
})
