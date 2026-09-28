# settings-v2 인계 패킷 — ui

- 받는 세션: `claude --agent ui-manager` (작업 모드: **보강** — 설정 창 개편 + 오버레이 문서·회귀 TC)
- 전반 설계: `doc/200_설계/architecture/settings-v2-02-design.md`. 계약: `doc/200_설계/bridge/contract.md` **v0.14**(bridge 완료 후).
- 전략: `ui-design-strategy`(문서 4종·RTM·TDD·bridge 경계·파괴 조작 확인), `.claude/skills/tsx-rules.md`·`ts-rules.md`(TSX 400줄), `ui_design_concept.md`, `change-request-tracking`.
- 시각 참고: 사용자 스크린샷 `기본 설정`·`이미지 설정` 2장(카드형 섹션, 알약형 탭, 초록 강조색, 토글 스위치, 이미지 카드 「이미지 변경」「기본값」). 참고 제품 이름·제작자·버전 표기는 **가져오지 않는다**.

## 선행 조건

- **bridge 패킷 완료 마커**: contract v0.14 반영, `src/bridge`에 `Language`·`Settings` 새 필드·`REQUIRED_SLOTS`·`isRequiredSlot`·`Position`·`resetOverlayPosition`·`pickPngFile(title?)`·(D-6 승인 시)`setSettingsWindowTitle` 존재, `yarn tsc --noEmit` 0.
- 사용자 결정 확정(🔒 2026-09-24, 02-design §5): **D-7 = C**(배율 R-03·유휴 시간 R-04를 「기본 설정」 탭에 넣음 — 권고와 다름), **D-8 = A**(몸통 카드 없음), **D-3 = A**(에러 code = 실물 `영역.사유` 표기), D-1·D-2·D-6·D-9·D-10 권고 채택. 착수를 막는 결정 없음.
- 계약 v0.14 §6(에러 code 목록, `autostart.cancelled` 포함)이 반영돼 있어야 오류 문구 사전(§4.4)의 키를 채울 수 있다.

## 요구ID

| 아키텍처 ID | 화면 요구ID 제안(ui-designer 확정) | 비고 |
|---|---|---|
| SV2-01 | 설정 R-19 탭 3개·카드 양식 | 기존 탭(이미지/동작/마우스 파츠) 폐기 |
| SV2-02 | 설정 R-20 언어 | R-01 「UI 언어 한국어」 → 「기본 한국어, 한·일·영 선택」으로 수정(버전 이력에 근거) |
| SV2-03 | 설정 R-21 위치 잠금 / 오버레이 R-28 잠금 중 동작 | 오버레이 코드 변경 없음(OS가 클릭 통과) |
| SV2-04 | 설정 R-22 작업표시줄 표시 | |
| SV2-05 | 설정 R-23 자동 실행 | R-06 대체(폐기 → R-23) |
| SV2-06 | 설정 R-24 위치 초기화 | |
| SV2-07·08 | 설정 R-25 이미지 설정 / 오버레이 R-27 필수·폴백 | R-14 대체. 오버레이 R-19의 「필수」 표현 정정 |
| SV2-09 | 설정 R-26 어깨축·손 위치 탭 | R-10~R-12·R-15~R-18 유효, 탭 이름·문구만 |
| SV2-10 | 각 R에 금지 조건 주석 | 참고 화면의 크기 4단 버튼·흔들림·항상 위·머리글·닫기·설명서·프리셋 없음 |
| SV2-11 | 설정 R-03 배율 슬라이더 | **보류 → 유효**(D-7). 원문 「범위 25%~200%(200% = 900×700 원본), 설정 JSON에 저장」 그대로 |
| SV2-12 | 설정 R-04 유휴 시간 | **보류 → 유효**(D-7). 원문 「기본 5분, 설정값」 그대로 |

CR: 설정 창 **CR-028**, 오버레이 **CR-029**(현재 마지막 CR-027 기준 — 대장에서 다시 확인).

## 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src/settings/requirements.md`·`design.md`·`test/scenarios.md`·`manual.md`·`test/change-requests.md` | 문서 4종 + CR-028 (소유자: ui-designer·ui-test-designer·ui-manual-writer) |
| `src/settings/index.tsx` | 탭 3개(`'general' \| 'images' \| 'mouse'`, 기본 `'general'`), `MessagesProvider`, 머리글(h1 제목) 삭제, 창 제목 설정(D-6) |
| `src/settings/components/GeneralTab.tsx`(+`.module.css`) | 신규 — §2 |
| `src/settings/components/ImagesTab.tsx`, `ImageSlotCard.tsx`(+`.module.css`) | 신규 — §3 |
| `src/settings/components/ToggleSwitch.tsx`, `ConfirmDialog.tsx` | 신규(화면 로컬. 공용 승격은 후작업 판단 — design.md §12) |
| `src/settings/i18n/{ko,ja,en,index}.ts` | 신규 — §4. `src/settings/labels.ts`는 `i18n/ko.ts`로 옮기고 삭제 |
| `src/settings/components/MousePartsTab.tsx` | `labels` → `useMessages()`만 교체(동작 불변) |
| `src/settings/settings.module.css` | 알약형 탭, 카드, 초록 강조 토큰(설정 창 범위), 언어별 글꼴 |
| `src/settings/test/*` | `labels.test.ts` → i18n 테스트, `SettingsApp.test.tsx` 탭 갱신, `GeneralTab.test.tsx`·`ImagesTab.test.tsx` 신규 |
| `src/overlay/requirements.md`·`design.md`·`test/scenarios.md`·`test/change-requests.md` | 문서 + CR-029 + 회귀 TC(§5) — **오버레이 소스 변경 없음** |

## 1. 공통 레이아웃

```
+-- settings window (900x640, 기존 크기 유지) ------------------------+
| [기본 설정] [이미지 설정] [어깨축·손 위치]     ← 알약형 탭, 선택 = 진한 채움 |
| p[role=alert] 오류 줄 (있을 때만, 현재 언어 문구)                      |
| main (스크롤)                                                        |
|   tab 내용 = 카드(흰 바탕, 둥근 모서리, 옅은 테두리) 나열               |
+----------------------------------------------------------------------+
```

- 머리글(제품명·제작자·버전)·닫기 버튼·설명서 버튼·프리셋 탭 **없음**(SV2-10). 창 닫기는 OS 제목 표시줄로.
- 강조색: `body[data-window='settings']` 범위 CSS 변수로 초록 계열(스크린샷 기준 청록빛 초록, 예 `#1ab39a` 근처 — 최종 값은 ui-designer). 기본 버튼·켜진 토글·선택 탭 외곽에 쓴다. 오버레이 CSS는 건드리지 않는다. 디자인 시스템과 다른 점은 design.md §11 전략 편차로 기록(D-10).
- 글꼴: `html[lang=ko]` Malgun Gothic 계열(현행), `ja` → `'Yu Gothic UI', Meiryo`, `en` → `'Segoe UI'` 앞세움, 끝은 `system-ui, sans-serif`.

## 2. 기본 설정 탭 (`GeneralTab`, SV2-02~06)

```
+-- 언어 / Language -----------------------------+
| select [한국어 ▼]  (항목: 한국어 / 日本語 / English — 각 언어 자기 이름 고정) |
+-----------------------------------------------+
+-- 크기 · 반응 ----------------------------------+
| 배율   [=====o==========]  100%                 |
|        캐릭터 표시 크기(25%~200%). 오버레이에서 Ctrl+휠로도 바꿀 수 있습니다(위치 잠금 중에는 여기서만). |
| 유휴 시간  [ 5 ] 분                              |
|        이 시간 동안 입력이 없으면 쉬는중 그림으로 바뀝니다. |
+-----------------------------------------------+
+-- 창 ----------------------------- [위치 초기화] +
| (●) 위치 잠금                                   |
|     켜면 마우스 클릭이 캐릭터를 통과하고, 끌어서 옮길 수 없습니다. |
+-----------------------------------------------+
+-- 작업표시줄 · 시작 ----------------------------+
| (●) 작업표시줄에 표시                           |
|     켜면 작업표시줄에 오버레이 버튼이 생깁니다. 트레이 아이콘은 그대로 있습니다. |
| (●) 컴퓨터 시작 시 자동 실행                     |
|     켜면 Windows에 로그인할 때 관리자 권한으로 자동 실행됩니다(관리자 권한 게임 안에서도 입력 인식). 켜고 끌 때 Windows 권한 확인 창이 뜹니다. |
+-----------------------------------------------+
```

| 조작 | 호출 | 성공 | 실패 |
|---|---|---|---|
| 언어 선택 | `setSettings({...settings, language})` | `settings://changed` → 사전 교체(재시작 없음), `<html lang>` 갱신, (D-6) `setSettingsWindowTitle(t.windowTitle)` | 오류 줄 |
| 배율 슬라이더 (SV2-11) | `<input type="range">` `SCALE_MIN`~`SCALE_MAX`(bridge 상수, 화면에 25·200을 다시 적지 않음), 표시 %. **끌기 중에는 표시값만 바꾸고 놓을 때 1회** `setSettings({...settings, scale})` — 매 칸마다 저장하면 core가 저장·리사이즈·emit을 반복한다. 키보드 화살표는 마지막 입력 후 짧은 지연(권고 300ms) 뒤 1회 저장. 단계 폭은 ui-designer 결정(권고 5%) | `settings://changed` → 슬라이더 값 교체(오버레이 Ctrl+휠 변경도 같은 이벤트로 따라감). 끌기 중 도착한 이벤트는 놓은 뒤 반영 | 오류 줄, 슬라이더 원래 값 |
| 유휴 시간 (SV2-12) | 분 단위 정수 입력, 저장은 `idleSeconds = 분 × 60`. 확정 시점 = 포커스 아웃·Enter(타이핑 중 저장 안 함). 범위: 최소 1분(core는 ≥1초만 검증), 최대는 ui-designer 결정(권고 60분 — 사용자 확인 권장). 범위 밖·빈 값은 저장하지 않고 입력 칸 아래 안내 | `settings://changed` → 표시 교체(`idleSeconds`가 60의 배수가 아니면 반올림 표시 규칙을 design.md에 명시) | 오류 줄, 원래 값 |
| 위치 잠금 토글 | `setSettings({...settings, positionLock: !v})` | 이벤트로 토글 반영 | 오류 줄, 토글 원래대로 |
| 작업표시줄 토글 | `setSettings({...settings, showInTaskbar: !v})` | 같음 | 같음 |
| 자동 실행 토글 | `setAutostart(!v)` — 응답까지 `autostartPending`(토글 비활성, `aria-busy`) | 반환값·이벤트로 반영 | 취소 코드 → 「권한 확인이 취소되어 바뀌지 않았습니다.」(오류가 아닌 안내 톤) / 그 외 → 오류 줄. 둘 다 토글 원래대로 |
| 위치 초기화 | `resetOverlayPosition()` — 응답까지 버튼 비활성 | 확인 대화상자 없음(되돌리기 쉬운 조작, 파괴 아님) | 오류 줄 |

- 토글은 `<button role="switch" aria-checked>` + 보이는 라벨·설명(`aria-describedby`). 설정값은 **낙관적 갱신 없이** `settings://changed`로만 바뀐다(기존 규칙).
- 넣지 않는 것: 참고 화면의 크기 4단 버튼(작게/보통/크게/아주 크게 — 배율 슬라이더로 대체)·흔들림·항상 위에 고정. 「변경한 설정은 바로 적용…」 안내 줄은 선택(ui-designer 판단, 넣으면 사전 키 추가).

## 3. 이미지 설정 탭 (`ImagesTab`, SV2-07·08)

그룹 제목 4개 아래 카드 격자(3열). 카드 1장 = 슬롯 1개.

```
+-- 카드 ---------------------------------+
| 기본              [필수] 또는 [선택]      |
| 가만히 있을 때 보이는 그림 (한 줄 설명)     |
| [ 체크무늬 바탕 미리보기 (contain) ]        |
|   비어 있으면 "등록된 그림 없음" (필수면 경고색 "필수 · 미등록") |
| [이미지 변경]  [기본값]                    |
| 카드 오류 한 줄 (이 카드 작업 실패 시)       |
+-----------------------------------------+
```

### 3.1 슬롯 카탈로그 (한국어 문구는 초안 — 최종은 design.md 확정 문구 표)

| 그룹 | 슬롯 | 카드 제목 | 필수 | 설명 초안 |
|---|---|---|---|---|
| 배경 | `background` | 배경 | 선택 | 맨 아래에 늘 그대로 있는 그림 |
| 키보드(본체 겸) | `kb_up` | 기본 | **필수** | 가만히 있을 때. 캐릭터 전체를 그려도 됩니다 |
| | `kb_down_0` … `kb_down_{n-1}` | 누름 1 … 누름 n | 누름 1만 **필수** | 키를 누를 때(여러 장이면 번갈아) |
| | (추가 카드) | + 누름 그림 추가 | - | `kb_down_0`이 있을 때만 보임. 다음 index로 등록 |
| | `idle` | 대기 | 선택 | 없으면 기본 그림만 보입니다 |
| | `rest` | 쉬는중 | 선택 | 한동안 입력이 없을 때. 없으면 기본 그림만 보입니다 |
| | `key_space`·`key_z`·`key_question`·`key_exclamation`·`key_enter`·`key_backspace`·`key_undo` | 스페이스 / ㅋ·Z / ? / ! / Enter / Backspace / Ctrl+Z | 선택 | 그 키를 누르는 동안(없으면 누름 그림) |
| 팔(마우스) | `mouse_base` | 팔 기본 | **필수** | 마우스를 따라 움직이는 팔 |
| | `mouse_left`·`mouse_right` | 왼클릭 / 오른클릭 | 선택 | 클릭하는 동안 |
| 손(펜) | `pen_up` | 손 기본 | 선택 | 팔 끝에 붙는 펜 쥔 손. 있으면 키보드는 기본 그림에 고정 |
| | `pen_down_0` … | 손 누름 1 … | 선택 | 키·클릭을 누를 때(여러 장이면 번갈아) |
| | (추가 카드) | + 손 누름 그림 추가 | - | `pen_down_0`이 있을 때만 |
| | `pen_key_*` 7종 | 손 스페이스 … 손 Ctrl+Z | 선택 | 그 키를 누르는 동안(없으면 손 누름) |

- `kb_down_0`·`pen_down_0` 카드는 비어 있어도 늘 보인다. **몸통(`body`) 카드는 없다**(🔒 D-8 = A. 이미 등록된 `body.png`는 오버레이·어깨축 미리보기에 계속 쓰이지만 이 화면에서 지울 수 없다 — 사용자 수용, manual.md FAQ에 한 줄).
- 필수 표시는 `isRequiredSlot`(bridge)만 쓴다. 화면에 필수 목록을 다시 적지 않는다.

### 3.2 동작

| 조작 | 흐름 | 실패 |
|---|---|---|
| 이미지 변경 | `pickPngFile(t.pickTitle)` → `null`이면 끝 → `importAsset(slot, path)` 동안 `slotBusy`(모든 카드 버튼 비활성) → 성공 → `assets://changed`로 미리보기 교체(url이 바뀌므로 새 그림) | 카드 오류 줄에 code별 문구(§4.4). 캔버스 크기 불일치는 「배경·키보드 그림은 모두 같은 크기여야 합니다」 류 |
| 추가 카드 | 이미지 변경과 같고 슬롯 = `{kind, index: 현재 장 수}` | 같음 |
| 기본값 | 비어 있으면 비활성. 여러 장 슬롯은 **마지막 장만** 활성(D-2, 가운데 장은 비활성 + 툴팁 「마지막 장부터 지울 수 있습니다」) → `ConfirmDialog`(「‘{카드 제목}’ 그림을 지울까요? 되돌릴 수 없습니다.」 [지우기] [취소], 포커스 「취소」) → `removeAsset(slot)` | 카드 오류 줄 |
| `pen_up` 첫 등록 | 계약 §3.3 `penPos` 규칙(「`null` = 아직 놓지 않음, `pen_up` 첫 등록 때 ui가 기본 위치를 정해 `set_settings`로 저장」)을 따른다 — 기존 `resolvePenPos` 재사용, 새 계산 금지 | 저장 실패 → 오류 줄(그림 등록은 유지) |

- 파괴 조작 확인: 「기본값」(슬롯 비우기)은 확인 필수(ui-design-strategy §11). 필수 슬롯도 비울 수 있다(캔버스 크기 교체 경로 — 02-design D-1).
- 탭 아래 안내(선택): 「PNG(32비트 RGBA)만, 최대 900×700·1MB. 배경·키보드 그림은 모두 같은 크기로 만드세요.」

## 4. i18n (새 라이브러리 없음, SV2-02)

비유: 번역은 「같은 칸 번호를 가진 세 권의 단어장」이다. 화면은 칸 번호(키)만 알고, 지금 언어의 단어장을 펼쳐 읽는다. 한 권에 칸이 빠지면 TypeScript가 컴파일에서 막는다.

### 4.1 구조
```ts
// src/settings/i18n/ko.ts — 원본(기존 labels.ts 전 항목 + 새 문구)
export const ko = { tabGeneral: '기본 설정', tabImages: '이미지 설정', tabMouse: '어깨축·손 위치', /* … */ errors: { /* §4.4 */ } } as const
export type Messages = { [K in keyof typeof ko]: typeof ko[K] extends object ? Record<keyof typeof ko[K], string> : string }
// ja.ts / en.ts
export const ja: Messages = { … }   // 키 누락·초과 → tsc 오류
// index.ts
export const MESSAGES: Record<Language, Messages> = { ko, ja, en }
export const MessagesProvider  // value = MESSAGES[settings.language] (알 수 없는 값이면 ko)
export const useMessages: () => Messages
```
- `mouseWizard.ts`(순수 모듈)에는 문구를 넣지 않는다(현행 그대로).
- 치환이 필요한 문구는 작은 함수 1개(`format(t.x, { name })`)로. 복수형·날짜 형식은 필요 없다.

### 4.2 범위
설정 창에 보이는 모든 문자열: 탭·카드 제목·설명·버튼·토글·aria-label·안내(마법사 안내 포함)·확인 대화상자·오류 문구·파일 대화상자 제목(`pickPngFile(title)`)·창 제목 표시줄(D-6). **오버레이는 문구가 없어 대상이 아니다. 트레이 메뉴(Rust)는 범위 밖**(미결).

### 4.3 번역 문구
ja·en 문구는 ui-designer가 design.md 확정 문구 표에 3열(ko/ja/en)로 쓴다. 일본어·영어 문구는 **사용자 검수 대상**으로 표시한다.

### 4.4 오류 문구
- `errors` 사전 키 = 계약 §6 에러 code(🔒 D-3: 실물 `영역.사유` 표기 — `asset.too_large`, `autostart.cancelled` 등. 키에 `.`이 있으므로 객체 키는 문자열로 적는다). 표시 규칙: `language === 'ko'`이면 `BridgeError.message`(Rust가 준 자세한 한국어, 크기 수치 포함) 그대로 / `ja`·`en`이면 `t.errors[code] ?? t.errors.unknown`. 자동 실행 취소 code는 오류가 아닌 안내 문구로.
- 사전 키가 계약 code 목록과 1:1인지 테스트로 고정한다(§6 U-4).

## 5. 오버레이 (문서·회귀 TC만, SV2-03·08)

- **소스 변경 없음.** 근거: `LayerStack`은 `idle`·`rest`가 없으면 상태 레이어를 그리지 않고(투명) 키보드 레이어 `kb_up`을 늘 그린다 → 「없으면 kb_up」이 이미 성립(`src/overlay/design.md:186`). 위치 잠금은 core가 창에 클릭 통과를 걸어 `data-tauri-drag-region` 끌기·Ctrl+휠이 닿지 않는다.
- `requirements.md`: R-27(필수 = `kb_up`·`kb_down_0`·`mouse_base`, `idle`·`rest` 선택 — 없으면 상태 레이어 투명, 보이는 그림은 `kb_up`), R-28(위치 잠금 중 클릭 통과·끌기 불가·Ctrl+휠 배율 조절 불가 🔒 유지 — 잠금은 설정 창에서만 풀리고, 잠금 중 배율은 설정 창 슬라이더(설정 R-03)로 바꾼다). R-19 문구의 「필수」 표현은 용어 주로 정정(요구 문구 자체는 바꾸지 않는 기존 관례).
- 회귀 TC(vitest): `idle`·`rest` 없는 매니페스트에서 상태 레이어 `<img>` 없음 + `kb_up` 보임, 쉬는중(`rest`) 진입해도 같음, `kb_down` 누름 때 `kb_up`이 상태 레이어에 겹쳐 그려지지 않음.
- 위치 잠금 동작은 `manual-checklist.md` 항목(클릭이 뒤 창으로 감, 끌기 안 됨, 잠금 해제 후 다시 됨).

## 6. 수용 기준

| # | 기준 | 증거 |
|---|---|---|
| U-1 | 탭 3개, 기본 탭 「기본 설정」, 탭 전환, 제외 항목(크기·흔들림·항상 위·머리글·닫기·설명서·프리셋) 부재 | `SettingsApp.test.tsx` |
| U-2 | 토글 3개·언어 선택·위치 초기화가 올바른 래퍼·인자로 호출, pending 중 비활성, 실패 시 원래 값 유지 | `GeneralTab.test.tsx`(bridge mock) |
| U-3 | 자동 실행 취소 code → 안내 문구, 토글 원래대로 | `GeneralTab.test.tsx` |
| U-4 | `ko`·`ja`·`en` 사전의 키 집합이 같고 빈 문자열 없음. `errors` 키 = 계약 code 목록 | `i18n.test.ts` |
| U-5 | 언어를 바꾸면(이벤트 수신) 탭·카드·마법사 안내 문구가 즉시 그 언어 | vitest |
| U-6 | 카드 목록이 §3.1과 같음(그룹·순서·필수 3장 표시), `body` 카드 없음(D-8 A) | `ImagesTab.test.tsx` |
| U-7 | 이미지 변경: 파일 선택 취소 → 호출 없음 / 성공 → `importAsset(slot, path)` / 실패 → 카드 오류 줄 | vitest |
| U-8 | 기본값: 빈 슬롯 비활성, 여러 장은 마지막 장만 활성, 확인 대화상자 거쳐 `removeAsset` | vitest |
| U-9 | `MousePartsTab` 기존 TC 전부 통과(문구 출처만 바뀜) | `MousePartsTab.test.tsx`·`mouseWizard.test.ts` |
| U-10 | 오버레이 회귀 TC(§5) 통과, 오버레이 소스 diff 0 | vitest + git diff |
| U-11 | `yarn tsc --noEmit` 0, `yarn test --run` 전체 PASS, `yarn build` 0, TSX 파일 400줄 이하 | 실행 로그 |
| U-13 | 배율: 끌기 중 `setSettings` 0회, 놓을 때 1회(`scale` 값 정확), 범위 = `SCALE_MIN`~`SCALE_MAX`, `settings://changed`(Ctrl+휠 가정)로 슬라이더 이동 / 유휴 시간: 분→초 변환 저장, 범위 밖·빈 값 저장 안 함, 타이핑 중 저장 안 함 | `GeneralTab.test.tsx` |
| U-12 | 앱 실행 스크린샷: 세 탭 × 한국어 + 기본 설정 탭 ja·en, 위치 잠금 켠 상태 오버레이 클릭 통과 확인 | `doc/300_검증/screenshots/{YYYYMMDD-HHMM}/` |

## 7. 하지 말 것

- 새 라이브러리(i18n·UI 킷·아이콘) 설치 금지. `invoke`·`listen`·`@tauri-apps/*` 직접 import 금지(`src/bridge` 래퍼만).
- 요구 밖 요소 금지: 크기 4단 버튼·흔들림·항상 위·머리글(제품명·제작자·버전)·닫기·설명서·프리셋, 몸통 카드(🔒 D-8 없음), 내장 기본 그림 복원. 배율·유휴 시간은 D-7로 요구가 됐으므로 만든다(§2).
- `src/state/`·`src/overlay/` 소스, `src/bridge/`, Rust를 고치지 않는다. 계약이 부족하면 멈추고 아키텍트 세션으로 되돌린다(왕복은 아키텍트 세션에서만).
- 필수 목록·기본 위치 좌표를 화면 코드에 다시 적지 않는다(`isRequiredSlot`, `resetOverlayPosition`).

## 8. 완료 마커

- `src/settings/requirements.md`(새 버전, R-19~R-26·R-01 수정·R-06/R-14 대체·**R-03/R-04 보류 해제 → 유효**(D-7)), `design.md`(RTM에 새 R 전부, 확정 문구 표 ko/ja/en), `test/scenarios.md`, `manual.md`(스크린샷 포함), CR-028 「적용·검증」.
- `src/overlay/requirements.md`·`design.md`·`test/scenarios.md` 갱신, CR-029.
- U-1~U-12 증거. 이후 `claude --agent verify-manager`로 배포 전 검증(보안 리뷰에 「작업 스케줄러 가장 높은 권한 + 사용자 쓰기 가능 설치 경로」 확인 요청 — 02-design 미결 참조).
