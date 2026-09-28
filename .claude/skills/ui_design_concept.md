# UI Design Concept (kuro_keyviewer)

## 역할 구분
이 파일은 **UI 디자인 시스템(Visual HOW)**을 정의한다: 색·타이포·스페이싱·컨트롤 크기·컴포넌트 톤·상태 색·창별 원칙.
**무엇을 만들지(WHAT)**는 `design.md`, **React 구현 패턴(Code HOW)**은 `tsx-rules.md`.

---

## 1. 개요

| 항목 | 기술 |
|------|------|
| 스타일 | CSS Modules + CSS 변수 토큰 (전역 `src/styles/global.css`) |
| 프레임워크 | 없음(Tailwind·UI 라이브러리 미사용). 필요 시 사용자 승인 후 도입 |
| 클래스 조합 | `cx()` (`components/utils/cx.ts`) |
| 아이콘 | **후보: lucide-react** — 미설치. 설치는 사용자 승인 필요. 그 전까지 인라인 SVG |
| 폰트 | 시스템 폰트 스택(설치 불필요) |
| 테마 | 설정 창: 다크 기본 + 라이트 지원 (`data-theme` on `<html>`) / 오버레이: 테마 없음(투명) |

## 2. 창별 원칙

| 창 | 원칙 |
|---|---|
| **오버레이(overlay)** | UI 크롬 없음. 배경 완전 투명(`background: transparent`, `html/body` 포함). 보이는 것은 사용자 레이어 이미지와 마우스 팔 곡선뿐. 드래그 핸들은 **호버 시에만** 반투명 표시. 포커스·선택 하이라이트 없음 |
| **설정(settings)** | 일반 데스크톱 폼 UI. 좌측 섹션 내비 + 우측 콘텐츠. 미리보기 영역은 항상 보이게 상단 고정. 다크 기본 |

## 3. 색상 시스템 (CSS 변수)

### 테마 적용
- `<html data-theme="dark">`(기본) / `"light"`. `localStorage: theme`에 저장. 오버레이 창은 속성을 두지 않는다.

### 기본 토큰
```css
:root[data-theme='dark'] {
  --color-bg: #1b1d22;          --color-bg-elevated: #23262d;   --color-bg-sunken: #14161a;
  --color-fg: #e8eaf0;          --color-fg-muted: #9aa0ad;      --color-fg-disabled: #5d6270;
  --color-border: #343843;      --color-border-strong: #4a4f5c;
  --color-primary: #5b8def;     --color-primary-fg: #ffffff;    --color-primary-hover: #6f9cf3;
  --color-accent: #f0b35b;      /* 미리보기 캔버스 안내선·피커 */
  --color-success: #4cc38a;     --color-warning: #f0b35b;       --color-danger: #e5534b;
  --color-info: #5b8def;
  --color-focus: #8ab4ff;
  --color-canvas-bg: #2b2e36;   /* 미리보기 캔버스 바탕(체크무늬 대체) */
}
:root[data-theme='light'] {
  --color-bg: #f7f7f9;          --color-bg-elevated: #ffffff;   --color-bg-sunken: #ececf0;
  --color-fg: #1c1e24;          --color-fg-muted: #5f6573;      --color-fg-disabled: #a9adb8;
  --color-border: #d9dbe2;      --color-border-strong: #b9bcc7;
  --color-primary: #3b6fd6;     --color-primary-fg: #ffffff;    --color-primary-hover: #2f5fc0;
  --color-accent: #d18f2a;
  --color-success: #2e9e6a;     --color-warning: #d18f2a;       --color-danger: #c9403a;
  --color-info: #3b6fd6;
  --color-focus: #3b6fd6;
  --color-canvas-bg: #e3e5ea;
}
```

### 컴포넌트별 변수
| 접두사 | 용도 |
|--------|------|
| `--btn-*` | 버튼(bg, fg, hover, secondary-bg, danger-bg) |
| `--input-*` | 입력(bg, fg, border, focus-ring, placeholder) |
| `--card-*` | 섹션 카드(bg, border, radius) |
| `--slider-*` | 슬라이더(track, fill, thumb) |
| `--picker-*` | 캔버스 피커(line, handle, area-fill) |

### 상태 색 사용 규칙
| 상태 | 색 | 예 |
|---|---|---|
| 정상·저장됨 | success | 이미지 검증 통과 배지 |
| 주의 | warning | 마우스 파츠 미등록(선택 항목) |
| 오류·거부 | danger | PNG 아님·900×700 초과·1MB 초과·캔버스 크기 불일치 |
| 안내 | info | 권장 제작 크기 900×700 |

## 4. 타이포그래피

```css
font-family: 'Pretendard Variable', Pretendard, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', system-ui, sans-serif;
```
- Pretendard는 설치돼 있으면 쓰고 없으면 맑은 고딕으로 폴백(번들 포함은 사용자 승인 후).

| 이름 | 크기 | 용도 |
|------|------|------|
| xs | 11px | 배지·보조 |
| sm | 12px | 표·힌트 |
| **base** | **13px** | 본문·폼(기본) |
| md | 14px | 버튼·입력 |
| lg | 16px | 섹션 제목 |
| xl | 20px | 창 제목 |

- line-height 1.5, 숫자는 `font-variant-numeric: tabular-nums`(슬라이더 값·좌표).

## 5. 스페이싱 (8px 기준)

| 토큰 | 값 | 대상 |
|---|---|---|
| `--space-1` | 4px | 컨트롤 내부·아이콘 간격 |
| `--space-2` | 8px | 컨트롤 사이 |
| `--space-3` | 16px | 카드 내부·폼 행 |
| `--space-4` | 24px | 섹션 사이 |
| `--space-5` | 32px | 페이지 여백 |

```
<페이지 p:space-5>
  <섹션 gap:space-4>
    <카드 p:space-3 gap:space-3>
      <행 gap:space-2>
        <컨트롤 p:space-1>
```

## 6. 컨트롤 크기 3단

| size | 높이 | 폰트 | 패딩 | 용도 |
|---|---|---|---|---|
| sm | 24px | 12px | 0 8px | 표 안·보조 |
| **md** | **32px** | **13px** | 0 12px | 기본 |
| lg | 40px | 14px | 0 16px | 주요 액션 |

- 반경 `--radius-sm: 4px` / `--radius-md: 6px` / `--radius-lg: 10px`(카드).
- 테두리 1px `--color-border`, 포커스 링 2px `--color-focus` 바깥.

## 7. 컴포넌트 톤

| 컴포넌트 | 톤 |
|---|---|
| Button | primary(저장·적용) / secondary(취소·닫기) / danger(이미지 제거·초기화) / ghost(아이콘). 텍스트 1~2어절 |
| ImageSlot | 점선 테두리 드롭존 → 등록 후 썸네일 + 크기·용량 배지 + 제거 아이콘. 검증 실패는 danger 테두리 + 한 줄 사유 |
| PreviewCanvas | `--color-canvas-bg` 바탕, 450×350 기준 상자 안내선(accent, 점선), 배율 표시 |
| RangeSlider | 트랙 4px, 썸 16px, 값+단위 우측 표시, 수치 직접 입력 가능 |
| PointPicker / RectPicker | 캔버스 위 accent 핸들 8px, 영역은 accent 20% 채움. 좌표 숫자 입력 병행 |
| Toggle | 스위치 40×20, 켜짐 primary |
| 알림 | 상단 인라인 배너(role=alert). 모달은 파괴적 동작(이미지 전체 초기화) 확인에만 |

## 8. 모션
- 설정 창 전환 150ms ease-out. 이유 없는 애니메이션 금지.
- 오버레이 바운스는 CSS `@keyframes`(transform scale/translate) 120~200ms, 연타 시 재시작. `prefers-reduced-motion`은 오버레이에는 적용하지 않는다(모션이 제품 기능).

## 9. 반응형·창 크기
- 설정 창 최소 880×600, 기본 1040×720. 좌측 내비 200px 고정. 미리보기는 폭에 따라 비율 유지 축소.
- 오버레이 창 크기는 캔버스 표시 크기 × 배율에 맞춰 core가 조정한다(화면은 요청만).

## 10. 다크/라이트 검증 체크
- 두 테마 모두에서 텍스트 대비 4.5:1 이상(`--color-fg-muted` 포함).
- 상태 색만으로 의미를 전달하지 않는다(아이콘·문구 병행).
