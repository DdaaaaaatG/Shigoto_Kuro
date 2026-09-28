---
name: ui-design-strategy
description: kuro_keyviewer 화면(ui 계층, React+TypeScript) 개발 표준. 화면 폴더 구조(src/overlay·src/settings)와 문서 4종(requirements.md·design.md·manual.md·test/scenarios.md), 문서↔소스 양방향 일치, 요구 추적 매트릭스(RTM)·요구 범위 준수·구현 충분성 체크리스트, 컴포넌트 재사용 우선순위, 데이터 계층 경계(src/bridge 래퍼만 호출, invoke/listen 직접 사용 금지, 계약 변경은 bridge 인계), 오버레이 화면 특수 규칙(레이어 4종 z-order·순수 TS 상태기계·requestAnimationFrame·팔 곡선·60fps), 설정 화면 규칙, TDD 원칙, 스타일(CSS Modules)을 정의한다. 화면을 설계·구현·검토할 때 반드시 참조한다.
---

# ui 계층 개발 표준

- 단일 기준: `doc/000_프로젝트_확정사항.md`(제품·이미지 규격·레이어 모델·상태 전이·창 동작·계층 위상). 이 스킬은 그 위에서 **화면을 어떻게 만들 것인가**만 정한다.
- 적용 대상: ui-manager · ui-layout-designer · ui-designer · ui-design-checker · ui-test-designer · ui-test-checker · ui-test-conflict-checker · ui-implementer · ui-tester · ui-fixer · ui-debug · ui-postprocessor · ui-manual-writer · ui-component-designer · ui-component-implementer.
- 화면은 두 개뿐이다: **overlay**(투명 오버레이, 입력에 반응하는 모션 캔버스)와 **settings**(이미지 등록·미리보기·설정 폼). 메뉴·라우트 등록 개념은 없다 — `src/main.tsx`가 Tauri 창 라벨(`overlay` / `settings`)로 화면을 분기한다.

---

## 1. 화면 폴더 표준 구조

### 1.1 폴더

```
src/{screen}/                      screen ∈ { overlay, settings }
├─ index.tsx                       화면 진입 컴포넌트(조립·상태·핸들러만 — 얇게)
├─ components/                     화면 로컬 컴포넌트 (다른 화면에서 쓰지 않는 것)
├─ labels.ts                       확정 문구·aria-label의 단일 소스
├─ styles/                         CSS Modules (*.module.css)
├─ requirements.md                 요구 baseline (요구ID R-xx, 확정 상태)
├─ design.md                       상세 설계 (RTM 포함)
├─ manual.md                       사용 매뉴얼 (스크린샷 포함)
├─ screenshots/                    manual·테스트 증거 이미지
└─ test/
   ├─ scenarios.md                 BDD 시나리오 (TC-ID, 추적표, TC-FLOW)
   ├─ manual-checklist.md          자동화 불가 항목 수동 확인표
   ├─ *.test.tsx / *.test.ts       vitest 스펙
   ├─ change-requests.md           CR 대장 (보강 모드에서 첫 기록 시 생성)
   └─ result.md                    최근 실행 결과 (ui-tester가 기록)
```

- 공용 컴포넌트는 `src/components/{ui,hooks,utils}/`, 입력 상태기계는 `src/state/`, bridge 래퍼는 `src/bridge/`. 화면 폴더 안에서 이들을 **import만** 한다.
- 화면 폴더 밖 수정(공용 컴포넌트·state·bridge)은 **사용자 확인 후**에만. 원치 않으면 화면 로컬로 구현한다.

### 1.2 문서 규칙

- 문서는 **마크다운**. 한국어. 자기완결형(다른 문서를 읽지 않아도 그 문서의 목적을 달성).
- 표는 GFM 표, 레이아웃은 ASCII 코드 블록. ASCII 정렬 불변식: 한글·전각은 2칸, ASCII·박스 문자는 1칸, 이모지 금지, 박스 안 모든 줄의 표시폭 동일.
- `design.md`가 40KB를 넘으면 `design/components.md` · `design/functions.md` · `design/a11y.md`로 분할한다. **RTM은 항상 `design.md` 본문**에 둔다.
- 문서 4종의 소유자: requirements·design = ui-designer, scenarios = ui-test-designer, manual = ui-manual-writer. 소유자 외 수정 금지(CR 대장·result.md·lessons 카탈로그는 기록물 예외).

### 1.3 requirements.md 필수 섹션

1. 헤더: 화면명 · 요구 확정 상태(`미확정` / `확정`) · 확정일 · 변경이력
2. **요구 목록**: `R-01`… 안정 ID. 원문 그대로 전사(재해석·추가·삭제 금지). 사용자가 확정한 항목은 🔒 표기.
3. **사용자·이용 시나리오 명세**: `대상 사용자 × 상황(언제·왜) × 사용 기능` 표. 모든 요구ID가 ≥1행에 매핑.
4. **데이터 계약 요구 명세**: 이 화면이 필요로 하는 bridge command·event 목록(이름·입력·출력·재사용/신규). 계약의 실체는 `doc/200_설계/bridge/contract.md`가 소유한다.
5. **확보한 기술 기능**: 필요한 라이브러리와 설치 승인 여부.

### 1.4 design.md 필수 섹션

1. 개요 · 레이아웃 확정 상태 · 변경이력
2. **레이아웃(ASCII)** — ui-layout-designer 구성안을 수용해 확정 표기
3. **컴포넌트 설계** — 배치 3단계 분류(§4) · 각 컴포넌트의 출처·props·이벤트
4. **상태** — 상태명 · 용도 · 타입 · **초기값** · 소유(로컬/`src/state`)
5. **기능 명세** — function 단위: 시그니처 · 입력 · 출력(반환/상태 변경) · 동작 · 예외 · 관련 요구ID
6. **파이프라인** — 정상 흐름 · 오류 흐름 · 파괴 조작 confirm
7. **bridge 계약 사용표** — command/event 이름 · 페이로드 타입(`src/bridge/types.ts` 기준) · 호출 위치 · 에러 처리
8. **확정 문구·라벨 표** — 사용자에게 보이는 모든 문구·aria-label. `labels.ts`로 전사되는 단일 소스
9. **접근성** — 포커스 순서 · 키보드 조작 · 라벨 · 상태 알림
10. **RTM** — 요구ID → 설계 섹션 → 계약 → 예정 TC → 상태(✅/부분/❌)
11. (overlay만) **레이어·모션 명세** — §6

---

## 2. 문서↔소스 양방향 일치

- 설계 없는 소스 없음, 소스 없는 설계 없음. `design.md`에 적힌 컴포넌트·상태·function·계약은 소스에 존재해야 하고, 소스에 추가된 것은 `design.md`에 반영돼야 한다.
- 소스를 바꾼 주체(ui-implementer·ui-fixer·ui-debug·메인 세션)는 같은 패스에 CR 대장(`change-request-tracking` 스킬)에 엔트리를 남긴다. design 델타는 ui-designer(동기화 모드) 또는 `/doc-sync` 배치가 닫는다.
- 문서가 영구 미동기화되는 것은 금지. 지연은 허용하되 `/doc-sync`에서 반드시 닫는다.

---

## 3. 요구 추적 · 요구 범위 · 구현 충분성

### 3.1 RTM (요구 추적 매트릭스)

| 요구ID | 설계 섹션 | bridge 계약 | 예정 TC | 상태 |
|---|---|---|---|---|

- `requirements.md`의 **모든** 요구ID가 행으로 존재. `✅`는 가리킨 섹션에 **실체**가 있어야 한다(제목만 있는 행은 허위 커버 = 결함).
- `부분`/`❌`가 하나라도 있으면 설계 미완.

### 3.2 요구 범위 준수 (과잉 금지)

- design.md의 모든 버튼·필드·영역·기능·상태는 요구ID로 **역추적**되어야 한다. 역추적 실패 = 과잉 = 결함.
- 예외는 채택한 레이아웃 패턴의 기본 요소뿐(예: 폼의 저장/취소, 탭 패턴의 탭 바). 요구와 무관한 별도 기능(통계·테마·단축키 편집 등)은 예외가 아니다.
- 필요해 보이면 직접 넣지 말고 「추가 후보(이유)」로 보고 → 사용자 승인 시 requirements.md에 새 요구ID로 승격한 뒤에만 설계.

### 3.3 구현 충분성 체크리스트 (9항목)

"ui-implementer가 이 문서만 읽고 추측 없이 만들 수 있는가"의 기준. `미정(확인 필요)`은 그대로 미충족이다.

| # | 항목 | 채워야 하는 것 |
|---|---|---|
| 1 | 컴포넌트 출처·props | 공용(`src/components/ui`)인지 로컬인지, 필수 props·이벤트 |
| 2 | 상태 초기값 | 모든 상태의 타입·초기값·소유 위치 |
| 3 | function 시그니처 | 이름·인자·반환·예외·부작용(상태 변경·bridge 호출) |
| 4 | bridge 계약 인자·반환·에러 | command 이름·입력 타입·출력 타입·실패 시 사용자 표시 |
| 5 | 파이프라인 정상·오류 | 각 기능의 정상 흐름과 실패 분기(무엇을 보여주고 어디로 돌아가는가) |
| 6 | 라벨 단일 소스 | 확정 문구·aria-label 표가 완결되어 `labels.ts`로 전사 가능 |
| 7 | 접근성 | 포커스 순서·키보드 조작·역할(role)·상태 알림 |
| 8 | 창 라벨 분기 등록 | `src/main.tsx`의 창 라벨 → 화면 매핑에 이 화면이 등록되는가(신규 창이면 명시) |
| 9 | 라이브러리 설치 확인 | 필요한 라이브러리가 `package.json`에 있는가, 없으면 승인 여부 |

### 3.4 독립 검증 전제

- `design.md`는 작성 직후 ui-design-checker가 **문서만 보고** 검증한다. 설계자의 설명은 전달되지 않는다. "말로 하면 통하는" 설계는 FAIL.
- 검증자(checker·tester·reviewer)에게는 「적용 메모리」를 전달하지 않는다.

---

## 4. 컴포넌트 재사용 우선순위

```
① src/components/ui      공용 UI (버튼·입력·슬라이더·파일 슬롯·모달 …)
② src/components/hooks   공용 훅 (useBridgeEvent·useSettings …)
③ src/components/utils   공용 유틸 (좌표 변환·검증 …)
④ 화면 로컬 components/  이 화면 전용
⑤ 외부 라이브러리        사용자 승인 후에만 설치
```

- 배치 3단계 분류: 공용 ui → 화면 로컬 → (여러 화면 재발 시) 공용 승격 후보. 승격은 ui-postprocessor 옵트인 흐름으로만.
- 표준 HTML 원소를 화면 코드에 직접 쓰지 않는다(`<button>` → `Button`, `<input type="range">` → `Slider`). 공용에 없으면 로컬 컴포넌트로 감싸고 승격 후보로 표시.
- 컴포넌트 계약은 `component-catalog` 스킬, 알려진 오용은 `component-usage-lessons` 스킬을 구현 전에 조회한다.
- 같은 패턴 3회 이상 반복 → 추출. TSX 파일 400줄 초과 → 분리(golden-principles).

---

## 5. 데이터 계층 경계 (bridge)

- 화면은 **`src/bridge/` 래퍼만** 호출한다. `@tauri-apps/api`의 `invoke`·`listen`을 화면·컴포넌트·state에서 직접 import하지 않는다.
- 래퍼 예: `bridge/commands.ts`(`loadSettings()`, `saveSettings(s)`, `pickImage(slot)`, `validateImage(path)` …), `bridge/events.ts`(`onInputEvent(handler)`, `onSettingsChanged(handler)`), `bridge/types.ts`(Rust 구조체와 1:1 타입).
- 계약의 단일 소스는 `doc/200_설계/bridge/contract.md`. design.md의 계약 사용표는 이를 **인용**한다(재정의 금지).
- 필요한 command/event가 계약에 없으면: 화면 설계는 `미확정 계약(bridge 인계 필요)`로 표기 → ui-manager가 **bridge 요구 명세**를 만들어 사용자 보고 → 허락 후 bridge-manager 세션 인계. 계약 확정 전 구현 금지.
  - 예외: 사용자가 "한 번에 생성"을 옵트인하면 잠정 계약으로 래퍼 시그니처를 정하고 mock으로 구현·테스트를 진행한다. 코드에 `// TODO(bridge): {command} — 계약 확정 필요` 표기 필수.
- 테스트에서 bridge는 항상 mock(`vi.mock('bridge/commands')`). 실제 Tauri 런타임에 의존하는 단위 테스트 금지.

---

## 6. 오버레이 화면 특수 규칙

### 6.1 레이어 z-order (확정사항 §4)

```
z=4  마우스 파츠   손바닥(기본/왼클릭/오른클릭) — 커서 좌표 매핑 + 팔 곡선
z=3  키보드 파츠   들림 / 누름(1장 이상 순환)
z=2  일반 상태     대기 / 쉬는중 / 키연타(쾅)
z=1  몸통          고정 1장
```

- 상태 레이어·키보드 파츠는 전체 캔버스 크기의 PNG를 같은 좌표에 겹친다(위치 계산 없음). 마우스 파츠만 좌표 이동.
- 캔버스 기본 표시 450×350 상자, 비율 유지, 배율 25~200%. 배율은 설정에서 오고 오버레이는 Ctrl+휠로 바꿔 bridge로 저장을 요청한다.

### 6.2 상태기계는 순수 TS (`src/state/`)

- 입력 이벤트(키 누름/뗌, 마우스 이동/클릭)와 시간(유휴 5분, 동시 눌림 6키, 쾅 유지 300ms)을 받아 **레이어별 표시 상태**를 내는 순수 함수/리듀서. React·Tauri·DOM 의존 금지.
- 시간은 주입한다(`now: number` 인자 또는 clock 인터페이스) — 테스트에서 가짜 시계로 유휴·연타를 재현한다.
- 확정사항 §5 상태 전이표가 그대로 테스트 케이스가 된다. 전이표의 모든 행에 vitest ≥1.
- 설정값(유휴 시간·쾅 기준(동시 키 수)·쾅 유지 시간)은 상태기계 생성 인자로 받는다(하드코딩 금지).

### 6.3 렌더링·성능

- 레이어 교체는 `<img>`의 src 교체가 아니라 **미리 로드된 이미지의 표시/숨김**(깜빡임 방지). 첫 렌더 전에 모든 슬롯 이미지를 preload한다.
- 움직임은 CSS `transform`(translate/scale)만 쓴다. `top/left/width/height` 애니메이션 금지.
- 마우스 파츠·팔 곡선은 `requestAnimationFrame` 루프 1개에서 갱신한다. 이벤트마다 React 상태를 갱신하지 않는다 — 좌표는 ref에 쌓고 프레임에서 읽는다.
- 팔 곡선은 Canvas 2D(또는 SVG path) 이차 베지어: 어깨 고정점 → 제어점 → 손바닥 위치. 굵기·색은 설정값.
- 목표 60fps. 리렌더 원인은 레이어 상태 변화뿐이어야 한다(`React.memo`·`useMemo`로 이미지 트리 고정).
- 창 투명: `html, body, #root { background: transparent }`. 오버레이에 스크롤바·포커스 링·선택 하이라이트가 보이지 않게 한다.

### 6.4 오버레이 조작

- 드래그 이동: 빈 영역 드래그 → bridge `startDragging()` 호출. 위치 저장은 core가 담당.
- 우클릭 컨텍스트 메뉴(설정 열기 / 숨기기 / 종료)는 요구ID가 있을 때만.
- 오버레이는 입력을 **소비하지 않는다**(클릭 통과 여부는 설정·bridge 소관).

---

## 7. 설정 화면 규칙

- 폼 입력은 공용 폼 컴포넌트 + 검증 훅. 검증 규칙(범위·필수)은 design.md 기능 명세에 명시.
- **이미지 슬롯**: 확정사항 §4의 슬롯(몸통 1 · 대기 · 쉬는중 · 키연타 · 키보드 들림 · 키보드 누름 n · 마우스 기본/왼클릭/오른클릭). 파일 선택은 tauri dialog 플러그인을 **bridge 래퍼**(`pickImage`)로 호출. 검증(PNG·크기·용량·캔버스 일치)은 core가 하고, ui는 결과 메시지만 표시한다(ui에서 재검증 금지 — 단일 판정).
- **미리보기 캔버스**: 오버레이와 같은 렌더 컴포넌트를 재사용한다(별도 구현 금지). 어깨 고정점·패드 구역은 미리보기 위 드래그로 지정.
- 저장은 명시적 「저장」 버튼 또는 항목별 즉시 저장 중 **design.md가 하나를 확정**한다.
- 이미지 제거·초기화 같은 파괴 조작은 confirm(§11).

---

## 8. 레이아웃 패턴

- 패턴 카탈로그와 선택 가이드는 `layout-templates` 스킬. 레이아웃 선정·다듬기·풀 관리는 ui-layout-designer 단독.
- 재사용 풀: `.claude/skills/layout-pool/SKILL.md`(있으면). 사용자 승인 후에만 저장.

---

## 9. TDD 원칙

- **테스트 스펙 없는 구현 금지.** 순서: design.md 확정 → `test/scenarios.md` + vitest 스펙 초안 → ui-test-checker·ui-test-conflict-checker PASS → 구현 → 실행.
- 커버 기준 세 축: ① design.md 모든 항목(컴포넌트·function·상태·계약·파이프라인·접근성·레이어/모션) → TC ≥1 ② 모든 요구ID → TC ≥1 ③ 사용자·이용 시나리오 모든 행 → `TC-FLOW` ≥1.
- 기대 결과는 **3단**(화면에 보이는 것 · 상태/저장 값 · bridge 호출 인자)으로 쓴다. "정상 동작한다"는 기대가 아니다.
- 자동화 불가(실제 전역 후킹·투명 창·트레이·자동 실행)는 `test/manual-checklist.md`에 수동 항목으로 분리한다. 대신 상태기계·컴포넌트는 vitest로 100% 자동화.
- 보강(maintain) 모드에서는 변경에 걸리는 TC만 돌린다. 전건은 `/doc-sync`·verify-manager.
- 실행 증거(`test/result.md`: 일자·명령·PASS/FAIL 수·실패 사유·스크린샷 경로) 없는 완료 보고 금지.

---

## 10. 스타일

- Tailwind 사용 여부는 미확정 → **CSS Modules(`*.module.css`)를 기본**으로 한다. 전역 스타일은 `src/styles/global.css` 하나.
- 색·간격·타이포·컴포넌트 시각 규칙은 `ui_design_concept.md`(스킬 루트) 참조. 코드 규칙은 `ts-rules.md`·`tsx-rules.md`.
- 오버레이 화면은 배경·테두리·그림자 등 **어떤 시각 장식도 없다**(사용자 이미지만 보인다).

---

## 11. 파괴 조작 confirm

| 조작 | confirm | 문구 위치 |
|---|---|---|
| 이미지 슬롯 비우기 | 필수 | labels.ts |
| 전체 설정 초기화 | 필수 (되돌릴 수 없음 명시) | labels.ts |
| 앱 종료(트레이·컨텍스트 메뉴) | 불필요 | — |

- confirm 컴포넌트는 공용 `ConfirmDialog`. 브라우저 `window.confirm` 금지.

---

## 12. 후작업·문서 동기화 진입 조건

- **후작업(ui-postprocessor)**: 사용자가 명시적으로 요청할 때만. 미리보기 → 승인 → 적용. 대상: 공용 승격·유틸 추출·400줄 초과 분리·미사용 코드 제거·포맷. 후작업으로 바뀐 소스는 ui-designer 동기화 모드로 design.md에 반영.
- **문서 동기화(`/doc-sync`)**: 마지막 동기화 이후 수정된 기존 화면을 git history로 찾아 requirements·scenarios·manual을 소유자에게 위임하고 design 델타 누락을 대조·backfill한 뒤 전건 테스트.
- **CR 대장**: 보강 모드의 모든 화면 변경은 `change-request-tracking` 스킬을 따른다.
