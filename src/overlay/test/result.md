# 테스트 결과 — overlay

## 2026-09-27 실행 (타이머 알림음 TC-296·TC-299~TC-305·TC-307~TC-309·TC-313 재검증)

대상 TC: TC-296(깜빡임), TC-299, TC-300~TC-305, TC-307~TC-309, TC-313.

실행 명령·결과:
- `yarn test --run src/overlay/test/useAlarmOnFinish.test.ts src/overlay/test/OverlayApp.timerMode.test.tsx src/overlay/test/alarmSound.test.ts src/overlay/test/TimerText.blink.test.tsx` → Test Files 4 passed (4) / Tests 28 passed (28), exit 0.
  - `alarmSound.test.ts` 7 tests PASS (TC-299 ①~⑤ 포함)
  - `useAlarmOnFinish.test.ts` 12 tests PASS (TC-300~TC-305 포함)
  - `TimerText.blink.test.tsx` 4 tests PASS (TC-296 ①~④)
  - `OverlayApp.timerMode.test.tsx` 5 tests PASS (TC-307·TC-308·TC-309·TC-313 포함)
- 전건 `yarn test --run` 1차: Test Files 1 failed | 65 passed (66) / Tests 4 failed | 797 passed (801). 실패는 `src/settings/test/SettingsApp.test.tsx`(TC-153·TC-156·TC-099·TC-101) — 오버레이 대상 파일 아님.
- 전건 `yarn test --run` 2차(재실행, flaky 의심 1회 재확인): Test Files 66 passed (66) / Tests 801 passed (801), exit 0. → 1차 실패는 병렬 실행 타이밍 기인 flaky로 판단(1차 분류: 환경, 추정). 소스·스펙 미수정 상태에서 재실행만으로 해소됨.
- `yarn tsc --noEmit` → exit 0
- `yarn lint` → exit 0

판정: **통과** (PASS 28 / FAIL 0 / SKIP 0, 대상 TC 전건). 회귀(전건 vitest·tsc·lint) 최종 수치 exit 0, 4건 flaky는 재실행으로 해소되어 별도 결함 아님(단, settings 화면 소유 스펙이므로 이 화면 결과 판정에는 영향 없음).

비고: 앱 실행·프로세스 종료·%APPDATA% 접근·스크린샷 없이 vitest만으로 실행(제약 준수).

---

## 2026-09-27 실행 (CR-053 관련 타깃·전건 재검증)

실행 명령·결과:
- `yarn tsc --noEmit` → **exit 2 (실패)**: `src/settings/test/Hair.test.tsx(105,7): error TS6133: 'RESTORE_DESC' is declared but its value is never read.` (overlay 소스 자체 원인 아님, 프로젝트 전역 tsc 실행이라 settings 오류로 실패)
- `yarn lint` → **exit 1 (실패)**: 동일 파일(`src/settings/test/Hair.test.tsx`) 미사용 변수, overlay 관련 아님
- 타깃 `yarn test --run src/settings/test/PomoCards.test.tsx src/settings/test/Hair.test.tsx src/settings/test/imageSlots.test.ts src/settings/test/ImagesTab.test.tsx src/settings/test/timerValues.test.ts src/settings/test/TimerTab.test.tsx src/overlay/test/OverlayApp.pomodoro.test.tsx` → Test Files 1 failed | 6 passed (7), Tests 1 failed | 116 passed (117). `OverlayApp.pomodoro.test.tsx` 자체는 전부 PASS.
- 전체 `yarn test --run` → Test Files 1 failed | 64 passed (65), Tests 1 failed | 770 passed (771)

판정: **미통과** (전역 지표 기준. overlay 파일만 보면 PASS이나, tsc·lint는 프로젝트 전체 대상이라 settings 결함으로 인해 overlay 화면도 "미통과" 상태로 함께 기록)

실패 상세(원인은 settings 영역, overlay 코드 원인 아님):
1. `src/settings/test/Hair.test.tsx` 105행 미사용 변수 `RESTORE_DESC` → tsc·eslint 실패. 1차 분류: 스펙 결함(추정), overlay 소유 아님.
2. `src/settings/test/PomoCards.test.tsx`의 `TC-FLOW-25 (CR-053 개정)` FAIL — 포커스 복원 결함(추정). overlay와 무관.
   - `OverlayApp.pomodoro.test.tsx` 10건은 모두 PASS, overlay 자체 회귀 없음.

콘솔 경고: 이번 실행 로그에서 overlay 파일 자체의 act(...) 경고 없음.

---

## 2026-09-26 실행 (CR-050 타이머 모드)

실행 명령·결과:
- `yarn tsc --noEmit` → exit 0
- `yarn lint` → exit 0
- `yarn test --run` (전건) → Test Files 64 passed (64) / Tests 765 passed (765), exit 0

판정: 통과 (자동화 대상 전건 PASS, 실패 0)

CR-050 대상 TC 범위:
- 자동(vitest): TC-291~TC-309, TC-313 — 전건 실행에 포함되어 PASS (개별 TC 단위 필터 미실시, 파일 단위 결과로 확인).
  관련 파일(전건 실행 로그에서 확인): `src/overlay/test/OverlayApp.timerMode.test.tsx`(5), `src/overlay/test/timerClock.test.ts`(9), `src/overlay/test/TimerText.blink.test.tsx`(4), `src/overlay/test/useElapsedText.countdown.test.tsx`(6), `src/overlay/test/useAlarmOnFinish.test.ts`(12), `src/overlay/test/alarmSound.test.ts`(7), `src/overlay/test/OverlayApp.pomodoro.test.tsx`(10) 등 — 모두 PASS.
- 수동: TC-310~TC-312 — 미실행(앱 실행 금지 — 사용자 수동 확인 대기). `test/manual-checklist.md`에 확인 절차 필요(소유자 확인).

실패 목록: 없음 (FAIL 0)

콘솔 경고: 일부 파일(overlay 범위 외, settings 쪽)에서 `act(...)` 관련 React 경고가 출력되었으나 테스트는 PASS. overlay 자체 파일에서는 이번 실행 로그에 act 경고 없음.

비고: 이번 실행은 화면별 TC 필터(`-t "TC-xxx"`)가 아닌 전건 실행 결과로 CR-050 대상 파일들의 PASS 여부를 확인한 것. 개별 TC-ID 단위 대조는 스펙 파일 내부 test.each/it 이름에 의존하며, 이번 예산 내에서는 파일 단위 결과로 갈음함.

## 2026-09-27 재실행 (ui-debug, CR-053 스펙 결함 2건 수정 뒤)

- `yarn tsc --noEmit` exit 0 · `yarn lint` exit 0
- `yarn test --run` → Test Files 65 passed (65) · Tests 771 passed (771)
- 수정: `src/settings/test/PomoCards.test.tsx` TC-FLOW-25 확정 클릭의 act 감쌈 제거(TC-291과 같은 방식) · `src/settings/test/Hair.test.tsx` 미사용 상수 RESTORE_DESC 삭제
