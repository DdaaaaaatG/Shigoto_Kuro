# 테스트 결과 — settings / 2026-10-15 16:08 ~ 16:20

실행: vitest `yarn test --run src/settings src/bridge src/components` · E2E 미설치(tauri-driver 없음) · 스크린샷 5장(앱 실행 캡처)
판정: 통과 (vitest PASS 552 / FAIL 0 · 스크린샷 5장 확인 · SKIP 63 수동)
시나리오: `test/scenarios.md` v32 — TC 행 281개. 수동 체크리스트 M-항목 63개는 실행하지 않고 SKIP(수동)으로 집계만 했다.

## 1. vitest

| 항목 | 값 |
|---|---|
| 파일 | 32 passed (32) |
| 테스트 | 552 passed (552) |
| 실패 | 없음 |
| Duration | 8.71s |

메인 세션 보고(전체 881/881, PresetsTab 40/40)와 범위가 다르다. 이번 실행은 settings·bridge·components 한정이라 552건이다. 차이는 범위 차이이며 실패 차이는 없다. PresetsTab.test.tsx 단독 40건 재확인은 이번 범위 밖(파일 목록 일부만 출력 확인).

콘솔 관찰: TimerPreview·TimerTab 관련 `act(...)` 경고가 출력된다. 모든 테스트는 PASS. 1차 분류: 화면(추정) 또는 스펙(추정). 이전 결과(2026-09-27)와 동일한 경고이며 FAIL이 아니다.

## 2. 앱 스크린샷 (dev 앱, 설정 값 변경 없음)

경로: `doc/300_검증/screenshots/20261015-settings/` (916x679, 한국어 UI)

| 파일 | 탭 | 확인 |
|---|---|---|
| 1-general.png | 기본 설정 | 언어·배율·유휴 시간·창 카드 표시 |
| 2-images.png | 이미지 설정 | 캡처 저장(육안 판정은 수동 체크리스트로) |
| 3-shoulder.png | 어깨축·손 위치 | 제목·안내·미리보기·버튼 3개 표시 |
| 4-timer.png | 타이머 | 캡처 저장(육안 판정은 수동 체크리스트로) |
| 5-presets.png | 프리셋 | 저장 폼·가져오기·내장 프리셋 카드 표시 |

1·3·5번은 육안으로 탭 전환과 본문 렌더를 확인했다. 2·4번은 파일만 저장했다. 스크린샷은 증거 자료이며 M-항목 합격 판정이 아니다.

## 3. 집계

PASS 552(vitest) / FAIL 0 / SKIP 63(수동, M-01~) / E2E 미실행(tauri-driver 미설치 — 설치 승인 필요)

## 4. 프로세스

dev 앱(kuro-keyviewer PID 26752)과 하위 프로세스를 종료했다. 종료 뒤 kuro-keyviewer 잔존 없음. `.dev-tester.log` 끝의 오류 2줄은 종료 신호로 인한 exit code 이며 앱 결함이 아니다.

---

## doc-sync 배치 재수행 — 2026-10-27 17:05
실행: vitest `yarn test --run src/settings src/bridge src/components` · E2E 미설치(tauri-driver) · 스크린샷 3장
판정: 통과(자동) — 32파일 / 552 테스트 전부 PASS, FAIL 0. 기준 scenarios.md v34.
- CR-067(TC-277·286·289)·CR-068·CR-070(TC-269·276·286·248) 개정 TC 포함 전부 통과.
- 스크린샷: doc/300_검증/screenshots/20261027-1710/02-settings.png (기본), doc/300_검증/screenshots/20261027-1710/img-02-settings.png (이미지), doc/300_검증/screenshots/20261027-1710/timer-02-settings.png (타이머: 스톱워치/타이머/시작 시간 잠금 표시)
- 프로세스: 검증용 dev 앱을 띄웠다가 종료함.

## 키 그림 최소 유지 시간 (CR-073) 검증 — 2026-11-01 19:59
실행: vitest `yarn test --run src/settings src/bridge src/components` · E2E 미설치 · 스크린샷 1장
판정: 통과(자동) — 33파일 / 561 테스트 PASS, FAIL 0, SKIP(수동) 2. 기준 scenarios v35.
- 신규 TC-364~370: 스펙 등록 7/7 확인(ScaleIdleCard.keyHold.test.tsx 6건 + i18n.test.ts). 전부 통과.
- 개정 TC-094·130·352·362 통과.
- 증거: doc/300_검증/screenshots/20261101-1959-key-hold-test/keyhold02-settings.png (기본 탭 「키 그림 유지 시간」 슬라이더 150ms, 설명 문구 0~500ms 표시)
- SKIP(수동): TC-379(MC-52), M-69 — 사용자 눈 확인 인계.
- 프로세스: 기존 dev 앱 그대로 유지(종료 안 함).
