/**
 * 세로 메뉴 단색 아이콘 — design.md §2.1(SVG 모양표), §3. 인라인 SVG(새 라이브러리 없음),
 * 참고 제품의 아이콘·로고를 쓰지 않는다. 장식 요소라 aria-hidden. 스타일(크기·색)은 부모가
 * className 으로 준다(이 컴포넌트는 모양만 그린다).
 */
import type { ReactNode } from 'react'

export type TabIconProps = {
  name: 'general' | 'images' | 'mouse' | 'timer' | 'presets'
  className?: string
}

const SHAPES: Record<TabIconProps['name'], ReactNode> = {
  general: (
    <>
      <path d="M4 7h6M14 7h6M4 17h10M18 17h2" />
      <circle cx="12" cy="7" r="2" />
      <circle cx="16" cy="17" r="2" />
    </>
  ),
  images: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M21 16l-5-5-8 8" />
    </>
  ),
  mouse: (
    <>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  // CR-045 — 스톱워치(design/timer-tab.md 「TabIcon 개정」)
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M10 2h4M12 2v3" />
    </>
  ),
  // CR-064 — 겹친 카드 두 장(앞 카드 + 뒤 카드 테두리, design/presets-tab.md §2.4)
  presets: (
    <>
      <rect x="8" y="3" width="13" height="13" rx="2" />
      <path d="M16 21H5a2 2 0 0 1-2-2V8" />
    </>
  ),
}

export const TabIcon = ({ name, className }: TabIconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width={18}
    height={18}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {SHAPES[name]}
  </svg>
)

export default TabIcon
