# TypeScript 코드 작성 규칙

`src/**` 의 모든 `.ts`·`.tsx`에 적용한다. React 전용 규칙은 [tsx-rules](tsx-rules.md), 디자인 토큰은 [ui_design_concept](ui_design_concept.md) 참조.

## 변수 선언
- `const` 기본, 변경 필요 시 `let`. `var` 금지.

## 세미콜론
- 사용 안 함(prettier `semi: false`).

## 문자열 따옴표
- 기본 `'`. 내부에 `'`가 있을 때만 `"`. 보간은 템플릿 리터럴.

## 들여쓰기
- 2칸, 최대 3레벨. 넘으면 함수로 뺀다.

## 괄호 최소화
```typescript
// Bad
const double = (x: number) => x * 2   // 단일 인자면 괄호 생략 가능 — 단, 타입 주석이 있으면 유지
// Good (타입 없이 추론될 때)
const ids = list.map(item => item.id)
```

## 선언형 코드
```typescript
// Bad
const scaled = apply(toCanvas(cursor))
// Good
const canvasPoint = toCanvas(cursor)
const scaled = apply(canvasPoint)
```

## 타입 규칙 (핵심)
- **명시적 타입은 경계에만**: bridge 페이로드(`src/bridge/types.ts`), 컴포넌트 `Props`, `src/state` 입출력, export 함수 시그니처. 지역 변수는 추론에 맡긴다.
- **`any` 금지.** 외부 입력은 `unknown`으로 받고 narrowing(타입 가드)으로 좁힌다.
- **유니온·리터럴 타입**으로 상태를 표현한다. 문자열 enum 대신 `as const` 객체 + `keyof typeof`.
  ```typescript
  export const LayerState = { idle: 'idle', rest: 'rest', slam: 'slam' } as const
  export type LayerState = (typeof LayerState)[keyof typeof LayerState]
  ```
- `interface`는 확장·구현이 필요한 객체 형태에, 그 외는 `type`.
- 옵셔널은 `?`로 표기하고 `undefined` 유니온을 중복해서 쓰지 않는다.
- `null`은 bridge 응답에서만 허용(Rust `Option`과 1:1). 화면 내부에서는 `undefined`.
- 타입 단언(`as`)은 테스트·narrowing 불가 지점에만. `!` non-null 단언 금지.
- 판별 유니온에는 `switch`와 `never` 체크로 완전성을 보장한다.

## 구조분해 할당
```typescript
const { x, y } = point
const [width, height] = size
```

## 함수
- 화살표 함수 기본. 순수 함수 우선(`src/state`·`utils`는 부수효과 금지).
- 단일 책임, 함수 50줄 한계.
```typescript
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

const toPadPoint = (cursor: Point, screen: Size, pad: Rect): Point => {
  const rx = cursor.x / screen.width
  const ry = cursor.y / screen.height
  return { x: pad.x + rx * pad.width, y: pad.y + ry * pad.height }
}
```

## Array 메서드
- `for` 루프 최소화. `map`/`filter`/`reduce`/`find`/`some`. 성능이 필요한 rAF 루프 안에서만 예외.

## 클로저로 스코프 최소화
```typescript
// Bad — 모듈 전역 가변 상태
let lastTick = 0
// Good — 팩토리로 캡슐화
export const createTicker = () => {
  let last = 0
  return { tick: (now: number) => { const dt = now - last; last = now; return dt } }
}
```

## Import 규칙
자신의 폴더 외 참조 시 alias 사용(`tsconfig.paths`·vite alias 동일):
- `@/*`(src 루트), `components/*`, `bridge/*`, `state/*`
```typescript
import { RangeSlider } from 'components/ui/RangeSlider'   // 다른 폴더 → alias
import { reduceInput } from 'state/input'
import { helper } from './helper'                          // 같은 폴더 → 상대 경로
```
- `@tauri-apps/api`는 **`src/bridge/` 안에서만** import한다. 화면·컴포넌트·state에서 직접 import 금지.
- `import type`으로 타입만 가져온다(런타임 번들 제외).

### 저장 시 정리
- 미사용 import·변수 제거(eslint `@typescript-eslint/no-unused-vars`).

## 주석
- 복잡한 로직의 의도·전략·알고리즘 핵심만. 무엇을 하는지는 코드가 말한다.
- export 함수는 JSDoc 한 줄(`/** 커서 화면 좌표를 패드 구역 좌표로 비례 매핑 */`).

## 논리 연산자

| 연산자 | 용도 |
|--------|------|
| `&&` | 조건 true 시 렌더링/실행 |
| `??` | null/undefined 시 기본값 (`\|\|`는 0·''를 삼키므로 숫자·문자열 기본값에 쓰지 않는다) |
| `?.` | 안전한 프로퍼티 접근 |
| 삼항 | 두 갈래 값 선택. 중첩 삼항 금지 |

## 코드 최소화
```typescript
img.onload = () => setImage(img)                          // 단일 표현식: 중괄호 제거
const toggle = (id: string) => (isSelected(id) ? deselect(id) : select(id))
```

## 에러 처리
- bridge 호출은 래퍼에서 `Result<T>` 형태(`{ ok: true, value } | { ok: false, error }`)로 정규화해 반환한다. 화면은 `throw`를 잡지 않는다.
- 사용자에게 보이는 오류 문구는 `labels.ts` 키로만.
