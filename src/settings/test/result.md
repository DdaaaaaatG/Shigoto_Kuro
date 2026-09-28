# 테스트 결과 — settings / 2026-09-27 15:52 ~ 15:53

실행: vitest (아래 3개 명령) · E2E 없음(대상 아님) · 스크린샷 0장(앱 실행 금지 지시)
판정: 통과 (PASS 486건 합산 / FAIL 0 / SKIP 6 수동)

## 1. 대상 범위 (CR-054 증분)

명령: `yarn test --run src/settings/test/ResetAllCard.test.tsx src/settings/test/i18n.test.ts src/settings/test/GeneralTab.test.tsx src/settings/test/SettingsApp.test.tsx`

결과: 4 files passed (4) · 95 tests passed (95) · Duration 3.75s

| 파일 | 결과 | 커버 |
|---|---|---|
| ResetAllCard.test.tsx | PASS 25/25 | TC-293 ~ TC-304 · TC-FLOW-31 · TC-FLOW-32 (it.each 사례 포함) |
| i18n.test.ts | PASS 11/11 | TC-093·094·246·286·301 (CR-054 개정 포함) |
| GeneralTab.test.tsx | PASS 27/27 | TC-099·101·104·130 (CR-054 개정 포함) |
| SettingsApp.test.tsx | PASS 32/32 | TC-099·101(창 단위)·TC-102 등 |

콘솔 관찰: SettingsApp.test.tsx 실행 중 `TimerTab` 관련 `act(...)` 경고 4건(TC-153·TC-156·TC-099·TC-101). 테스트는 모두 PASS했으나 콘솔 경고는 0이 아니다. 원인은 TimerTab 내부 비동기 상태 갱신 추정(1차 분류: 화면(추정) — 이번 CR-054 변경분과 직접 관련 없음, TimerTab은 CR-054 대상 파일 아님). FAIL 아님, 참고 기록만.

## 2. 회귀 확인

명령: `yarn test --run src/settings`

결과: 24 files passed (24) · 391 tests passed (391) · Duration 4.90s. FAIL 0.
동일한 TimerPreview `act(...)` 경고 1건 추가 관찰(TC-264, TimerPreview.test.tsx) — 위와 같은 분류.

## 3. 정적 검사

| 명령 | exit code | 비고 |
|---|---|---|
| `yarn tsc --noEmit` | 0 | 오류 없음 |
| `yarn lint` (`eslint .`) | 0 | 경고 없음 |

## 4. 버전 대조 (읽기)

| 파일 | version |
|---|---|
| package.json | 0.1.1 |
| src-tauri/tauri.conf.json | 0.1.1 |
| src-tauri/Cargo.toml | 0.1.1 |

세 파일 일치. change-requests.md CR-054 기록(0.1.0 → 0.1.1, tauri.conf.json·Cargo.toml은 이미 0.1.1이라 대조만)과 부합.

## 5. 수동 항목 (M-54a ~ M-54f)

판정: **미실행 — 선행 미충족(D-7: 개발 PC 앱 데이터 백업 확인 대기)**. 지시에 따라 앱 실행(`yarn tauri dev`·`/run-app`·exe)을 하지 않았다. 백업/세대 표식 확인은 메인 세션이 사용자 확인 후 수행 예정.

| 항목 | 상태 |
|---|---|
| M-54a ~ M-54f | SKIP(선행 미충족 D-7) — `src/settings/test/manual-checklist.md` 기존 기록(⚠ 전제 D-7 문단, v18) 그대로 유효, 이번 패스에서 추가 수정 없음 |

## 6. TC 수 대조

`scenarios.md` CR-054 절 표기 TC(TC-293~304, TC-FLOW-31·32, 개정 TC-093·094·099·101·104·130·246·286)는 모두 위 4개 스펙 파일에 존재함을 grep으로 확인(`test/ResetAllCard.test.tsx`에 TC-293~304·FLOW-31·32 전건, 개정 TC는 `i18n.test.ts`·`GeneralTab.test.tsx`·`SettingsApp.test.tsx`에 분산). 누락 없음.

## 종합

CR-054 관련 자동 테스트 전건 PASS(95/95), 회귀 전건 PASS(391/391), 정적 검사 exit 0/0, 버전 파일 3종 일치. 수동 M-54a~f는 D-7 대기로 미실행(SKIP, 사유 명시). 이번 패스는 **통과**로 기록하되 수동 확인은 별도 인계 대상이다.

---

# CR-057 재검증 — 2026-09-27 19:06 ~ 19:07

실행: vitest만 (앱 실행·스크린샷·%APPDATA% 접근 금지 지시 준수). 소스·스펙 미수정.
판정: **통과** (PASS 934건 합산 / FAIL 0 / SKIP 0)

## 1. 대상 범위 명령

`yarn vitest --run src/settings/test/labels.test.ts src/settings/test/i18n.test.ts src/settings/test/MousePartsTab.test.tsx src/settings/test/DragHit.test.tsx src/settings/test/SettingsApp.test.tsx`

결과: **5 files passed (5) · 133 tests passed (133)**, Duration 4.03s. FAIL 0.

| 파일 | 결과 | 비고 |
|---|---|---|
| labels.test.ts | PASS 4/4 | — |
| i18n.test.ts | 파일 목록에 포함, 합산 133건 중 통과 | TC-305 관련 언급(라인 284, 값 단언은 MousePartsTab 쪽) 확인 |
| MousePartsTab.test.tsx | PASS 72/72 | TC-305(ko·ja·en 3건, areaDesc 안내 줄) 라인 1748·1780 확인 — grep으로 스펙 내 존재·실행 확인 |
| DragHit.test.tsx | 파일 목록에 포함, 통과 | — |
| SettingsApp.test.tsx | PASS 32/32 | TC-153·TC-156·TC-099·TC-101·TC-102 등 |

콘솔 관찰: `MousePartsTab`·`TimerTab` 관련 `act(...)` 경고 다수(TC-153·156·099·101 실행 중). 이전 CR-054 재검증에서도 동일 패턴 관찰됨(1차 분류: 화면(추정), TimerTab 비동기 상태 갱신 — CR-057 변경분과 무관, FAIL 아님).

grep으로 TC-305 3건(ko·ja·en) 및 개정 TC(TC-009·TC-094·TC-016·TC-019·TC-020·TC-022·TC-024·TC-049·TC-063~074·TC-077·TC-082·TC-086·TC-222·TC-225·TC-FLOW-02·04·06)이 대상 스펙 파일에 산재해 실행됨을 파일 통과 수(133/133 FAIL 0)로 확인. 개별 TC 이름 단위 실패 없음.

## 2. 정적 검사

| 명령 | exit code | 비고 |
|---|---|---|
| `yarn tsc --noEmit` | 0 | 오류 없음 |
| `yarn lint` (`eslint .`) | 0 | 경고 없음 |

## 3. 전체 회귀 (`yarn test --run`)

결과: **66 files passed (66) · 801 tests passed (801)**, Duration 10.08s. FAIL 0.

src/overlay 쪽(다른 세션 동시 작업 중)도 이번 실행에서는 전건 PASS로 관찰됨 — 별도 조치 불필요, 목록만 기록.

## 종합

CR-057(이동 영역 문구 개선) 대상 범위 vitest 133/133 PASS, tsc/lint exit 0, 전체 회귀 801/801 PASS. FAIL 없음, SKIP 없음. 앱 실행·스크린샷·%APPDATA% 접근은 지시대로 수행하지 않음(수동 확인 항목 없음, 전량 자동화 스펙으로 커버됨). 이번 재검증은 **통과**.
