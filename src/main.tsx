/**
 * 진입점. Tauri 창 라벨로 화면을 고른다 — `settings` 창이면 설정 화면, 그 외(overlay)는 오버레이.
 * 화면 코드에서 @tauri-apps/api 를 직접 쓰는 곳은 이 파일과 src/bridge 뿐이다.
 *
 * - 화면은 지연 로딩한다. 정적으로 둘 다 import 하면 다른 창의 CSS(전역 body 규칙)까지
 *   주입되어 오버레이 투명 배경이 덮인다(2026-09-23 실측).
 * - body[data-window] 에 창 라벨을 넣어 각 화면 CSS 의 전역 규칙이 자기 창에만 걸리게 한다.
 */
import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { getCurrentWindow } from '@tauri-apps/api/window'

const label = getCurrentWindow().label
document.body.dataset.window = label === 'settings' ? 'settings' : 'overlay'

const App =
  label === 'settings' ? lazy(() => import('./settings')) : lazy(() => import('./overlay'))

const rootEl = document.getElementById('root')
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </React.StrictMode>,
  )
}
