---
name: component-catalog
description: 공용 컴포넌트(src/components — ui·hooks·utils) 인벤토리/요약 카탈로그. 각 컴포넌트·훅·유틸의 import 경로·분류·용도·핵심 props/시그니처·대표 사용 패턴·테스트 파일을 한눈에 본다. ui-implementer·ui-component-implementer는 구현 전 "무엇이 이미 있고 어떻게 쓰는가"를 이 카탈로그로 확인해 재사용하고, ui-debug·ui-error-analyst는 대상 컴포넌트의 계약을 빠르게 조회한다. 화면/컴포넌트 구현·디버그 시 참조한다.
---

# 공용 컴포넌트 카탈로그 (Inventory — 무엇이 있고 어떻게 쓰나)

`src/components` 아래 **공용** 컴포넌트·훅·유틸의 요약 인벤토리. "이미 있는 것을 다시 만들지 않도록", "쓰려는 것의 import·props·패턴을 즉시 알도록" 돕는다. (짝 문서: `component-usage-lessons` = 오용 경고 카탈로그.)

## 역할 분담 (읽기 / 쓰기)

| 주체 | 동작 |
|---|---|
| **읽기 — ui-implementer · ui-component-implementer** | 구현 전, 필요한 UI/기능을 이 카탈로그에서 **먼저 찾아 재사용**. 없을 때만 신규 생성(ui-component-designer 설계 경유). |
| **읽기 — ui-debug · ui-error-analyst · ui-fixer** | 수정 대상 컴포넌트의 import·props·패턴을 조회해 오용 없이 고친다. |
| **쓰기 — ui-component-implementer** | 새 공용 컴포넌트 구현 완료 시 해당 그룹에 1항목 append(Phase 4). |
| **쓰기 — ui-postprocessor** | 화면 로컬 컴포넌트를 `src/components/ui`로 **승격**하거나 유틸을 추출했을 때 1항목 append. 오래된 항목 정리(옵트인). |

## 경계 (중복 금지 — 무엇을 어디서 보나)

| 알고 싶은 것 | 보는 곳 |
|---|---|
| **무엇이 있고 어떻게 쓰나** (import·props·패턴) | **이 카탈로그** |
| **하지 말 것 → 올바른 사용** (알려진 오용) | `component-usage-lessons` |
| **Props 전체 계약·접근성·variant 상세** | 각 컴포넌트의 `COMPONENT.md`·`Demo.tsx` |
| **재사용 우선순위·bridge 경계·문서 규칙** | `ui-design-strategy` |
| **색·간격·타이포 토큰** | `ui_design_concept.md` |

## 조회·기록 규약

- 컴포넌트명 = **`### {Name}` 헤더** → grep으로 바로 조회 (예: `grep -n "### RangeSlider" SKILL.md`).
- import 경로 컨벤션: **`components/ui/{Name}`** (vite alias, `@/` 안 붙임) 또는 배럴 `components/ui`에서 named import.
- 각 항목 5줄: `import / 분류·용도 / 핵심 props·시그니처 / 패턴 / 테스트`.

```
### {Name}
- import: `import { {Name} } from 'components/ui/{Name}'`
- 분류·용도: {Primitive|Complex|Container} — {한 줄}
- 핵심 props: `value({타입})`; `onChange(value)`; `size('sm'|'md'|'lg')`; …
- 패턴: `<{Name} value={v} onChange={setV} />`
- 테스트: `src/components/ui/{Name}/{Name}.test.tsx` (TC-C-001~)
```

---

## 1. UI 컴포넌트 (`components/ui`)

> 현재 등록 항목: **없음** (프로젝트 초기 상태). 첫 컴포넌트가 구현되면 위 형식으로 append한다.

## 2. 훅 (`components/hooks`)

> 현재 등록 항목: **없음**.
> 예상 형식: `### use{Name}` — import / 용도 / 시그니처 `(args) => { … }` / 패턴 / 테스트.

## 3. 유틸 (`components/utils`)

> 현재 등록 항목: **없음**.
> 상태 전이 규칙은 여기가 아니라 `src/state/`에 둔다(순수 함수·vitest 대상). utils는 화면·상태 무관 순수 계산(좌표 매핑·배율·PNG 헤더 읽기 등)만.

---

## 미구현 후보 (설계 착수 시 참고 — 등록 항목이 아님)

요구조건과 레이어 모델(`doc/000_프로젝트_확정사항.md` §3~§6)에서 예상되는 공용 컴포넌트다. **실제로 필요해졌을 때** ui-component-designer가 COMPONENT.md로 설계하고, 구현 완료 후 위 1절에 등록한다. 미리 만들지 않는다.

| 후보 | 분류 | 예상 용도 | 예상 사용처 |
|---|---|---|---|
| ImageSlot | Complex | PNG 1장 드롭·선택·미리보기·제거. 검증 결과(형식·크기·용량·캔버스 일치) 표시 | settings — 레이어별 이미지 등록 6+3칸 |
| PreviewCanvas | Container | 레이어를 겹쳐 보여주는 450×350 기본 상자. 배율·마우스 파츠 좌표 미리보기 | settings — 미리보기 영역 |
| RangeSlider | Primitive | 값+단위 표시 슬라이더(배율 25~200%, 유휴 분, 연타 기준) | settings |
| PointPicker | Complex | 캔버스 위 한 점(어깨 고정점) 드래그 지정 | settings — 마우스 파츠 |
| RectPicker | Complex | 캔버스 위 사각형(패드 구역) 드래그 지정 | settings — 마우스 파츠 |
| Toggle | Primitive | 켬/끔(자동 실행·오버레이 표시) | settings |

## 변경 이력

| 날짜 | 변경 | 주체 |
|---|---|---|
| 2026-09-23 | 초판(빈 인벤토리 + 미구현 후보) | 자산 변환 |
