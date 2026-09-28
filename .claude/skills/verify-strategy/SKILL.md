---
name: verify-strategy
description: 배포 전 통합 검증 전략. 프로젝트 빌드+린트+테스트(verify-loop — cargo fmt --check·clippy·test / yarn tsc·lint·test·build), 보안(로컬 데스크톱 앱 위협 모델)·코드(ts/tsx/golden·bridge 경계)·core(Rust unsafe·스레드·에러·성능·직렬화) 3대 리뷰를 병렬로 수행하고, PASS/WARN/FAIL/ERROR 게이트로 배포(커밋·푸시·패키징) 가능 여부를 판정한다. 검증은 읽기 전용이며 수정은 생산 에이전트(ui-debug/bridge-manager/core-manager)로 라우팅한다. 검증·리뷰·배포 전 게이트를 다룰 때 참조한다.
---

# 배포 전 통합 검증 전략

- 배포(커밋·푸시·패키징) 직전 통합 검증의 **단일 기준**. verify 4종(verify-manager / verify-security-reviewer / verify-code-reviewer / verify-core-reviewer)이 이 규칙으로 판단한다.
- core/bridge/ui=생산(설계→구현→테스트), verify=세 계층 산출물을 가로지르는 횡단 게이트. 각 매니저 내부 게이트는 *자기 산출물 완전성*, verify는 *전체 코드베이스의 품질·보안·빌드 건전성*을 본다.

## 0. 핵심 원칙

1. **읽기 전용.** 검증·리뷰는 읽고 측정·판정만 한다. 소스(.rs/.ts/.tsx)·설정 수정 금지 — 수정은 생산 에이전트의 일(§5).
2. **증거 기반.** "통과할 것" 금지. 실제 실행 결과(exit code·테스트 PASS 수·리뷰 이슈 목록)로만 판정한다(golden-principles 5).
3. **게이트.** 결과는 **PASS / WARN / FAIL / ERROR** 4단계로 닫는다. FAIL=배포 차단.
4. **수정은 생산자에게.** 발견 이슈는 원인 계층 에이전트로 라우팅한다.
5. **배포 전 단일 관문.** 이 검증 통과 후에만 `/sync`(커밋·푸시) → `/deploy`(패키징).

## 0-A. 도구 선확인

- `cargo --version`·`yarn --version`을 먼저 본다. 없으면 해당 항목은 `SKIP(도구 없음)`이고 판정은 **ERROR**(측정 불가)다. 설치는 사용자 몫.
- 리뷰어 위임 전 `.claude/agents/{name}.md`의 `tools:` 줄을 확인한다.
- 다른 세션이 테스트·앱 실행 중이면 verify-loop를 시작하지 않는다(R6·R7).

## 1. verify-loop — 빌드+린트+테스트 (기계적 검증)

verify-manager가 직접 실행한다. 변경 범위에 따라 TS/Rust를 가른다.

### 1.1 범위 결정
| 변경(`git status --porcelain`·`git diff --name-only HEAD`) | 범위 |
|---|---|
| `src/**`, `package.json`, `vite.config.ts`, `tsconfig.json` | TS |
| `src-tauri/**` | Rust |
| 양쪽 | TS + Rust |
| 변경 없음 | 전체 |

### 1.2 항목 (모두 비변경 모드 — 소스 미수정)
| 계층 | 검증 | 명령 (프로젝트 루트 기준) | 성공 기준 |
|---|---|---|---|
| TS | 타입 | `yarn tsc --noEmit` | exit 0 |
| TS | 린트 | `yarn lint` | exit 0 |
| TS | 테스트 | `yarn test --run` | 전체 PASS |
| TS | 빌드 | `yarn build` | exit 0 |
| Rust | 포맷 | `cd src-tauri && cargo fmt --check` | exit 0 |
| Rust | 린트 | `cd src-tauri && cargo clippy -- -D warnings` | exit 0 |
| Rust | 테스트 | `cd src-tauri && cargo test` | 전체 PASS |

- TS·Rust는 독립 → 병렬 실행 가능. 각 항목 exit code·출력 기록.
- 즉시 중단하지 않고 모든 항목 실행 후 종합. SKIP 규칙: `tsc` FAIL → TS 테스트·빌드 SKIP.
- **자동 수정 금지.** 포맷 불일치·미사용 import 등 Fixable 이슈는 고치지 않고 `ui-postprocessor`(TS) / `core-manager`(Rust) 라우팅 대상으로 기록한다.
- 결과는 **PASS / FAIL**로 닫는다.

## 2. 3대 리뷰 (병렬, 읽기 전용)

verify-manager가 세 리뷰어를 **한 번에 병렬 위임**한다. 각 리뷰어는 심각도(CRITICAL/HIGH/MEDIUM/LOW) + 이슈코드로 보고한다. 리뷰어에는 「적용 메모리」를 넣지 않는다.

### 2.1 보안 리뷰 (verify-security-reviewer) — 로컬 데스크톱 앱 위협 모델
대상: `src-tauri/src/**`, `tauri.conf.json`, `capabilities/*.json`, `Cargo.toml`, `src/bridge/*.ts`, `.gitignore`. 이슈코드 `SEC-NNN`.
- 위협 모델: 악성 PNG·설정 파일 / 전역 입력 특권(훅) / 앱 데이터 폴더 밖 접근 / WebView 원격 콘텐츠.
- 항목: unsafe 범위·SAFETY, 훅 콜백 재진입·패닉·Unhook, 파일 경로 정규화·루트 접두 검사, PNG 크기·시그니처·픽셀 상한, capabilities 최소 권한, CSP·assetProtocol scope, 자동 실행 레지스트리(HKCU·따옴표·해제 시 삭제), 설정 역직렬화 범위 검증, 로그 노출, 비공식 후킹 크레이트, 서명·업데이터 미사용 명시.

### 2.2 코드 리뷰 (verify-code-reviewer) — 2-Stage
대상: 변경된 `src/**/*.ts`·`*.tsx`. 이슈코드 `CR-NNN`. 판정 `APPROVE / REQUEST CHANGES / COMMENT`.
- **Stage 1 (Spec 준수):** 화면 `design.md` 대비 누락·과잉, `src/bridge/*` 호출이 `contract.md`와 일치. design.md 없으면 SKIP.
- **Stage 2 (품질):** `ts-rules`·`tsx-rules`·`golden-principles`(TSX 400줄·함수 50줄), **계층 경계**(화면에서 `@tauri-apps/api` `invoke`·`listen` 직접 import 금지, `src/state`는 순수 TS), **오버레이 성능**(이벤트마다 setState 폭주 금지, transform·opacity 애니메이션, 이미지 미리 로드), 접근성(설정 창).

### 2.3 core 리뷰 (verify-core-reviewer) — Rust 5-Phase
대상: 변경된 `src-tauri/src/**/*.rs`, `tests/`, `Cargo.toml`. 이슈코드 `CORE-NNN`.
- Phase 1 unsafe 격리·SAFETY / Phase 2 스레드·채널(훅 스레드 종료·Unhook·join, backpressure, 마우스 스로틀, `static mut` 금지) / Phase 3 에러 처리(unwrap·expect·panic 금지, Result 전파, thiserror) / Phase 4 성능(콜백 최소 작업, 이미지 바이트 이벤트 금지) / Phase 5 타입·직렬화(serde camelCase, 계약 1:1, `#[serde(default)]`).

> **False Positive 금지(공통):** 프레임워크가 이미 보호하는 항목, 테스트 코드의 unwrap, 정상 코드 나열은 보고 금지. 역할을 넘지 않는다(보안=security, 품질=code, Rust=core).

## 3. 게이트 판정

| verify-loop | 리뷰 종합 | 판정 | 행동 |
|---|---|---|---|
| PASS | CRITICAL 0 + HIGH 0 | **PASS** | `/sync` → `/deploy` 연결 제안 |
| PASS | CRITICAL 0 + HIGH 있음 | **WARN** | 사용자 선택(수정 후 재검증 / 인지 후 진행 / 취소) |
| PASS | CRITICAL 있음 | **FAIL** | 배포 차단 — CRITICAL 즉시 수정 |
| FAIL | (리뷰 생략) | **FAIL** | 배포 차단 — 빌드/테스트부터 |
| 도구 없음 또는 리뷰어 2개 이상 실패 | — | **ERROR** | 설치·재실행 |

- verify-loop FAIL이면 리뷰 생략, 즉시 FAIL.
- 리뷰어 1개 실패 → 나머지로 판정 진행 + 실패 표기. 2개 이상 실패 → ERROR.
- 동일 파일:라인의 유사 이슈는 더 높은 심각도로 중복 제거한다.

## 4. 워크플로우 위치

```
[생산]  core / bridge / ui (설계→구현→테스트, 각 패키지 내부 게이트 통과)
   ↓
[검증]  verify-manager ──┬─ verify-loop (cargo·yarn)
                         ├─ 병렬 리뷰: security · code · core
                         └─ 게이트: PASS / WARN / FAIL / ERROR
   ↓ PASS
[배포]  /sync (커밋·푸시)  →  /deploy (NSIS·포터블)
```

- 단독 실행 가능("배포 전 검증해줘", "보안 검토", "코드 리뷰", "Rust 리뷰").
- 리포트는 `doc/300_검증/verify-{YYYYMMDD-HHMM}.md`.

## 5. 수정 라우팅 (verify는 고치지 않는다)

| 이슈 원인 | 라우팅 대상 |
|---|---|
| 화면(.tsx)·상태 기계(src/state) 버그·품질·경계 위반 | `ui-debug` |
| 포맷·미사용 코드 정리(TS) | `ui-postprocessor`(옵트인) |
| 계약(contract.md·types.ts·bridge rs) 불일치 | `bridge-manager` 세션 |
| 네이티브(hook·window·tray·assets·settings)·Rust 포맷 | `core-manager` 세션 |
| capabilities·CSP·tauri.conf.json | `bridge-manager`(권한) / `core-manager`(창 설정) |

- 수정 후 **재검증**으로 닫는다(수정→재검증 반복, 같은 실패 3회면 멈추고 보고).
- 완료(PASS) 보고에 **단계 체크리스트 + 실행 증거** 포함 필수.
