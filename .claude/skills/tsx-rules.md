# TSX(React 18 + TypeScript) 파일 작성 규칙

React 화면·컴포넌트 구현 규칙. 기본 TS 규칙은 [ts-rules](ts-rules.md), 디자인 토큰·스타일 시스템은 [ui_design_concept](ui_design_concept.md) 참조.

## 역할 구분
이 파일은 React **구현 패턴(HOW)**을 정의한다: 컴포넌트 구조, Hook 규칙, 데이터 흐름, 오버레이 성능, 테스트 규약.
**무엇을 만들지(WHAT)**는 화면 `design.md`·`COMPONENT.md`, **시각(Visual)**은 `ui_design_concept.md`.

---

## 1. 컴포넌트 구조

### 네이밍
- 컴포넌트·타입: PascalCase / 함수·변수: camelCase / 상수: UPPER_SNAKE_CASE / 파일: 컴포넌트명과 동일(`RangeSlider.tsx`).

### 화살표 함수 + Props 타입 export + 기본값 구조분해
```tsx
export type ToggleProps = {
  value: boolean
  onChange: (value: boolean) => void
  label: string
  size?: 'sm' | 'md' | 'lg'
  isDisabled?: boolean
}

export const Toggle = ({ value, onChange, label, size = 'md', isDisabled = false }: ToggleProps) => (
  <button role="switch" aria-checked={value} aria-label={label} disabled={isDisabled}
    className={cx(styles.root, styles[size])} onClick={() => onChange(!value)} />
)
```
- `props ?? {}` 패턴은 쓰지 않는다 — TS가 필수 props를 보장한다. 선택 props만 기본값을 준다.
- `React.FC` 사용 안 함. `children`이 필요하면 Props에 `children?: ReactNode`를 명시한다.

### 조건부 렌더링 (순서 고정: error → loading → data → empty)
```tsx
export const LayerPreview = ({ error, isLoading, layers }: LayerPreviewProps) =>
  error ? <ErrorNotice message={error} /> :
  isLoading ? <Spinner /> :
  layers.length > 0 ? <Canvas layers={layers} /> :
  <EmptyState text={labels.preview.empty} />
```

### Props Spread
```tsx
const sliderProps = { value: scale, onChange: setScale, min: 25, max: 300, unit: '%' }
return <RangeSlider {...sliderProps} />
```

### 순수 컴포넌트
- 같은 props → 같은 렌더. `window`·모듈 전역·`Date.now()`를 렌더 중에 읽지 않는다.

### 불변성
```tsx
const setLayer = (layers: Layer[], id: LayerId, next: Partial<Layer>) =>
  layers.map(l => (l.id === id ? { ...l, ...next } : l))
// Bad: layers[i].src = url  ❌
```

## 2. Hook 규칙
- 최상위 레벨에서만 호출, 조건문·반복문 안 금지.
- `useEffect`는 **구독·타이머·외부 동기화**에만. 파생 값은 `useMemo` 또는 그냥 계산. cleanup 필수.
```tsx
useEffect(() => {
  const unsubscribe = subscribeInput(event => dispatch(event))   // bridge/events.ts 래퍼
  return unsubscribe
}, [dispatch])
```
- 커스텀 훅은 `use{Name}`, 하나의 관심사만. bridge 구독 훅은 `src/bridge/hooks/`가 아니라 **화면 폴더 또는 `components/hooks`**에 두되 내부에서는 bridge 래퍼만 호출한다.

## 3. 상태 관리 원칙
- **최소화·최상위 집중**: 화면이 공유하는 상태는 `index.tsx`에 모은다. 하위 전용 상태만 하위에.
- **입력 상태기계는 `src/state`의 순수 리듀서**를 `useReducer`로 감싼다. 컴포넌트 안에 전이 규칙(연타 판정·유휴 타이머 조건)을 다시 쓰지 않는다.
- **설정값은 단일 소스**: 설정 창이 bridge로 저장하면 core가 이벤트로 다시 알린다. 화면끼리 상태를 직접 주고받지 않는다(단방향).
- props가 3단계 이상 깊어지면 Context. Context 값은 `useMemo`로 감싼다.

## 4. 데이터 흐름 (bridge 경계)
```
core(Rust) ─event→ bridge/events.ts ─subscribe→ 화면 훅 ─dispatch→ state 리듀서 ─props→ 레이어 컴포넌트
화면 핸들러 ─call→ bridge/commands.ts ─invoke→ core
```
- 화면·컴포넌트·state에서 `@tauri-apps/api` 직접 import 금지. 래퍼 함수 이름은 `contract.md`와 동일하게.
- 래퍼는 `Result<T>`를 반환한다. 화면은 `result.ok` 분기로 오류 문구(`labels.ts`)를 보여준다.

## 5. 오버레이 성능 규칙 (src/overlay 전용)
- 입력 이벤트 구독은 **한 곳**(`useInputStream`). 이벤트마다 setState하지 말고 `ref`에 쌓은 뒤 `requestAnimationFrame` 1회에 리듀서로 넘긴다.
- 위치·배율·바운스는 CSS `transform`(translate/scale)만. `top/left/width` 변경 금지. 움직이는 요소에 `will-change: transform`.
- 이미지 레이어 컴포넌트는 `memo`로 격리하고, props는 원시값(문자열 src·불린)으로 넘겨 얕은 비교가 통하게 한다.
- 마우스 팔 곡선은 Canvas 2D(또는 SVG `<path>` 1개)로 rAF 안에서 그린다. React 리렌더로 곡선을 그리지 않는다.
- 이미지는 앱 데이터 경로를 `convertFileSrc`한 URL을 **bridge 래퍼가 돌려준 값**으로 쓴다(화면에서 경로 조립 금지). `<img decoding="async" draggable={false}>`.
- 오버레이에는 포커스 가능한 UI 크롬을 두지 않는다. 드래그 핸들만 호버 시 표시.

## 6. CSS Modules 규약
- 파일: `{Name}.module.css`, import: `import styles from './{Name}.module.css'`.
- 클래스 조합은 `cx(...)`(`components/utils/cx.ts`, 없으면 배열 `filter(Boolean).join(' ')`).
- 색·간격·폰트·반경은 `ui_design_concept.md`의 CSS 변수만(`var(--color-bg)`). 하드코딩 색상 금지.
- 전역 스타일은 `src/styles/global.css` 한 곳. 컴포넌트에서 전역 선택자(`:global`)를 만들지 않는다.

## 7. 접근성
- 시맨틱 태그 우선(`button`·`label`·`fieldset`). 클릭 가능한 `div` 금지.
- 아이콘 버튼은 `aria-label`(문구는 `labels.ts`). 폼 입력은 `<label htmlFor>` + `id`.
- 오류는 `aria-invalid` + `role="alert"`, 동적 갱신 영역은 `aria-live="polite"`.
- 키보드: Tab 순서 자연스럽게, `Esc`로 닫기, 슬라이더는 Arrow 키. 포커스 링은 `:focus-visible`.
- 캔버스 피커(PointPicker·RectPicker)는 좌표 숫자 입력을 대체 수단으로 함께 둔다.

## 8. 파일 크기·분리
- TSX 400줄 한계. 넘으면 서브 컴포넌트로 분리. `index.tsx`는 조립·상태·핸들러 중심.
- 같은 JSX 패턴 3회 이상이면 컴포넌트로 추출(화면 로컬 `components/`, 두 화면이 쓰면 승격 후보).

## 9. 테스트 규약 (vitest + @testing-library/react)
- 파일: 컴포넌트 옆 `{Name}.test.tsx`, 상태기계는 `src/state/{name}.test.ts`.
- 케이스 이름은 시나리오 TC-ID로 시작: `it('TC-012 배율 변경 시 저장 명령을 호출한다', …)`.
- 조회는 `getByRole`(name 지정) 우선 → `getByLabelText` → `getByText`. `data-testid`는 캔버스 등 role이 없을 때만.
- 사용자 조작은 `@testing-library/user-event`. 타이머는 `vi.useFakeTimers()`로 유휴·연타 판정을 결정적으로 만든다.
- **bridge mock 패턴**: `vi.mock('bridge/commands')`·`vi.mock('bridge/events')`로 래퍼를 모킹한다. `@tauri-apps/api`를 직접 모킹하지 않는다.
  ```tsx
  vi.mock('bridge/events', () => ({ subscribeInput: vi.fn(cb => { emit = cb; return () => {} }) }))
  ```
- 렌더 스냅샷 테스트 금지. 동작·표시 결과를 단언한다.
- 오버레이 rAF는 `vi.stubGlobal('requestAnimationFrame', cb => setTimeout(cb, 16))`로 고정.
