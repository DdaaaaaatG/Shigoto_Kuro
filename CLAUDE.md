# kuro_keyviewer

봉고캣(Bongo Cat)류 키뷰어. 키보드·마우스 입력에 따라 사용자가 넣은 PNG 이미지가 바뀌고 움직이는 **Windows 데스크톱 앱**(Tauri 2, Rust + React). OBS 연동 없이 exe를 직접 실행한다.

> **단일 소스: `doc/000_프로젝트_확정사항.md`.** 스택·이미지 규격·레이어 모델·상태 전이·폴더 구조·에이전트 목록이 거기 있다. 이 파일은 요약과 정책만 담는다. 두 문서가 어긋나면 확정사항 문서가 맞다.

---

## 1. 스택 요약

| 항목 | 값 |
|---|---|
| 프레임워크 | Tauri 2 (WebView2) |
| 네이티브 | Rust stable. 전역 입력 후킹은 `windows` 크레이트로 `SetWindowsHookExW(WH_KEYBOARD_LL / WH_MOUSE_LL)` 직접 호출 |
| 프론트 | React 18 + TypeScript + Vite, yarn 1.x |
| 저장 | DB 없음. `%APPDATA%\com.kuro.keyviewer\`에 PNG + settings.json (Tauri identifier 기준) |
| 테스트 | `cargo test` / vitest + @testing-library/react / (선택) tauri-driver E2E |
| 린트 | `cargo fmt --check` · `cargo clippy` / eslint · prettier |
| 배포 | `yarn tauri build` → NSIS 인스톨러 + 포터블 exe |
| Git | GitHub 단일 저장소, `main` 브랜치, 1인 개발 |
| MCP | github만. 브라우저 MCP 사용 안 함 — 화면 확인은 `/run-app` 스크린샷 |

**Rust 툴체인 현황(2026-09-23):** rustup stable-x86_64-pc-windows-msvc 설치 완료(`winget install Rustlang.Rustup`). `cargo check`·`clippy`·`fmt --check`·`test`와 `yarn tauri dev`가 이 PC에서 동작함을 확인했다. cargo 실행 시 PATH에 `~/.cargo/bin`이 있어야 한다(새 셸은 자동, Git Bash 세션은 `export PATH="$HOME/.cargo/bin:$PATH"`).

## 2. 폴더 구조 요약

```
src/            React — main.tsx, overlay/, settings/, components/, bridge/, state/
src-tauri/      Rust  — src/{hook,window,tray,assets,settings,bridge}/, tests/, Cargo.toml, tauri.conf.json, capabilities/
doc/            000_프로젝트_확정사항.md · 100_요구조건/ · 200_설계/{core,bridge}/ · 300_검증/
.claude/        agents/ skills/ commands/ hooks/ scripts/ rules/ reports/
_reference/     안단테 원본 자산(참조 전용, Claude가 로드하지 않음, 삭제 가능, git 제외)
```

- 화면은 둘뿐이다: `src/overlay/`(오버레이), `src/settings/`(설정 창). 각 화면 폴더에 `requirements.md`, `design.md`, `manual.md`, `test/scenarios.md`, `test/change-requests.md`(CR 대장), 소스(`index.tsx`, `components/`).
- `unsafe`는 `src-tauri/src/hook/` 안에서만. 훅이 강제한다.

## 3. 계층 위상과 경계

```
ui (React)  →  bridge (Tauri command·event 계약)  →  core (Rust 모듈)
```

- **단방향.** ui는 `src/bridge/` 래퍼만 호출한다. 화면 코드에서 `invoke`·`listen`을 직접 쓰지 않는다.
- `doc/200_설계/bridge/contract.md`가 TS 타입(`src/bridge/types.ts`)과 Rust 구조체(`src-tauri/src/bridge/`)의 단일 소스다. 셋이 어긋나면 bridge 결함이다.
- core는 ui를 모른다. 이벤트는 bridge를 통해서만 나간다.
- 계층을 넘는 변경이 필요하면 고치지 말고 **요구 명세를 만들어 사용자에게 보고**한다. 허락 후 해당 계층 매니저 세션으로 인계한다. 예외는 구축(build) 모드의 task-manager(세 계층을 한 흐름으로).

## 4. 진입점 선택표

상세 규칙은 `pipeline-routing` 스킬. 먼저 **작업 모드**를 판별한다: 구축(build, 대상이 아직 없음) vs 보강(maintain, 이미 구현된 것의 수정·추가).

| 요구 유형 | 진입점 |
|---|---|
| 처음부터 기능 구축(core→bridge→ui 한 흐름) | `claude --agent task-manager` |
| 여러 계층을 동시에 건드리는 재설계·종단간 점검 | `claude --agent system-architect` |
| Rust 모듈 신규·변경·감사 | `claude --agent core-manager` |
| command·event 계약 신규·변경·감사 | `claude --agent bridge-manager` |
| 화면 신규·개선(구축) | `claude --agent ui-manager` |
| 기존 화면 버그·동작 수정 | `claude --agent ui-debug` |
| 배포 전 통합 검증 | `claude --agent verify-manager` |
| 개발 서버 / 검증 빌드 / 테스트 / 앱 확인 | `/dev-start` `/dev-build` `/test` `/run-app` |
| 커밋·푸시 / 문서 동기화 / 배포 | `/sync` `/doc-sync` `/deploy` |

## 5. 필수 정책 (모든 작업에 걸린다)

0. **위임 원칙 (🔒 사용자 지정 2026-09-23).** 메인 세션은 소스(`src/`·`src-tauri/`)와 산출 문서(화면 문서 4종·CR 대장·`doc/200_설계/**`)를 **직접 수정하지 않는다.** 담당 리프 에이전트에 위임한다(화면 = ui-designer·ui-implementer·ui-fixer 등, Rust = core-implementer, 계약 = bridge-designer·bridge-implementer, 원인 분석 = ui-error-analyst, 검증 = checker·tester·reviewer). 어느 에이전트인지는 §4 진입점 표와 `pipeline-routing` 스킬로 정한다.
   - 메인 세션이 직접 하는 일: 요구 인터뷰, 위임문 작성, 결과 대조·종합, 사용자 보고, `doc/000_프로젝트_확정사항.md`·`doc/next-session.md` 갱신, 사용자가 승인한 의존성 설치, 앱 실행·스크린샷 확인.
   - 에이전트가 가드에 막히면 **메인 세션이 대신 쓰지 않는다.** 막힌 이유를 사용자에게 알리고 결정을 받는다(가드 우회 금지).
   - 사용자가 "직접 고쳐"라고 명시한 건만 예외로 메인 세션이 직접 수정하고, 그 사실을 완료 보고에 적는다.
1. **작업 모드 판별.** 작업 수신 시 구축/보강을 먼저 정하고 개시 보고에 근거를 적는다. 애매하면 사용자에게 묻는다.
2. **라이브러리 설치 허가제.** `yarn add`·`cargo add`·`cargo install`·`npx <새 도구>`·`winget` 등 새 의존성은 **사용자 승인 후 메인 세션에서만**. 서브에이전트는 가드가 차단한다. `yarn install`(기존 복원)은 대상이 아니다.
3. **도구 선확인.** 위임 전 대상 에이전트의 `tools:` 줄을 본다. 설명이 아니라 `tools:`가 사실이다. 서브에이전트에 `Edit`이 없으면 큰 파일 부분 수정을 시키지 않는다.
4. **증거 기반 완료.** "될 것이다" 금지. `cargo test`·vitest 결과, 빌드 exit code, 스크린샷 경로로 증명한다. 증거 없는 완료 보고는 거짓이다.
5. **요구 범위 준수.** 요구ID(`R-xx`)로 역추적되지 않는 기능·필드·버튼을 만들지 않는다. 필요해 보이면 보고만 하고, 승인되면 요구로 승격한 뒤 만든다.
6. **unsafe 격리.** `src-tauri/src/hook/` 밖의 `unsafe`는 훅이 차단한다. 모든 `unsafe` 블록에 `// SAFETY:` 주석.
7. **검증자 독립성.** checker·tester·reviewer에는 「적용 메모리」나 설계 의도를 전달하지 않는다. 문서·소스·실행 결과만 근거다.
8. **보고 채널은 하나.** 서브에이전트는 최종 응답 1회로 보고한다. SendMessage 중간 보고 금지.
9. **실행 예산.** 위임문에 `예산: 도구 호출 N회 · 벽시계 M분`. 기본값 구현 80/30, 설계 50/20, 검증·분석 30/10. 초과 시 진행 보고(`상태: 예산 초과 | 완료 | 미완료 | 막힌 지점 | 잔여 예상 | 권고`)로 반환.
10. **파괴적 명령 금지.** `git reset --hard`·`push --force`·`clean -fd`·앱 데이터 폴더 삭제는 훅이 차단한다. 되돌리기는 `git revert`·파일 단위 복원으로.
11. **절대 경로 금지.** `CLAUDE.md`·`.claude/**/*.md`의 명령은 프로젝트 루트 기준 상대 경로(`src/`·`src-tauri/`·`doc/`). `.claude/rules/claude-doc-paths.md`.

## 6. 개발 명령

| 명령 | 실제 셸 | 설명 |
|---|---|---|
| `/dev-start` | `yarn tauri dev` (백그라운드, 로그 `.dev-tauri.log`) | Vite + Tauri 앱 기동. 포트는 `tauri.conf.json` `build.devUrl`(기본 1420) |
| `/dev-build` | `cd src-tauri && cargo check` · `yarn tsc --noEmit` · `yarn build` | 컴파일 확인. 배포 아님 |
| `/test` | `cd src-tauri && cargo test` · `yarn test --run` | 전체 또는 `core`/`bridge`/`ui`/`<파일>` |
| `/run-app` | 앱 실행 + PowerShell 화면 캡처 | `doc/300_검증/screenshots/{YYYYMMDD-HHMM}/` |
| `/sync` | `git add -A` · `git commit` · `git push origin main` | 변경 목록 확인 후 커밋. verify PASS 후 권고 |
| `/doc-sync` | git history 기준 문서 동기화 위임 | 마커 `doc/doc-sync-state.json` |
| `/deploy` | `yarn tauri build` → `deploy/{version}/` | NSIS 인스톨러 + 포터블 exe + README |

- `yarn build`는 `dist/`만 만든다. Tauri 번들은 `/deploy`에서만.
- `yarn test`는 vitest다. `--run` 없이 실행하면 watch 모드로 세션이 막힌다.

## 7. 문서 규칙

- 모든 문서는 **마크다운**, 한국어.
- 화면 문서 4종(`requirements.md` · `design.md` · `manual.md` · `test/scenarios.md`)은 화면 폴더 안에. 소유자는 각각 ui-designer · ui-designer · ui-manual-writer · ui-test-designer. 다른 에이전트는 이 문서를 직접 고치지 않고 소유자에게 위임한다.
- `design.md`에는 요구 추적 매트릭스(RTM)가 있어야 한다. 요구ID → 설계 섹션 → TC.
- 보강 모드에서 화면을 고치면 `test/change-requests.md`에 CR 엔트리를 남긴다(`change-request-tracking` 스킬). 기록 없이 완료 보고 금지.
- core 설계는 `doc/200_설계/core/{모듈}.md`, bridge 계약은 `doc/200_설계/bridge/contract.md`.
- 소스가 바뀌면 문서를 같이 맞춘다. 훅이 화면·bridge 소스 수정 시 세션당 1회 알린다. 배치 정리는 `/doc-sync`.

## 8. 코드 규칙

| 파일 | 대상 |
|---|---|
| `.claude/skills/rust-rules.md` | Rust 관례 (모듈 경계, 에러 타입, `SAFETY:` 주석, clippy 무경고) |
| `.claude/skills/ts-rules.md` | TypeScript 규칙 (const 기본, 세미콜론 없음, alias import) |
| `.claude/skills/tsx-rules.md` | React 규칙 (불변성, 단방향 흐름, Hook 규칙, 400줄 한계) |
| `.claude/skills/ui_design_concept.md` | UI 디자인 시스템 (색·타이포·스페이싱) |
| `.claude/rules/golden-principles.md` | 파일·함수 한계, 결론 먼저, 증거 기반 완료, unsafe 격리 |

## 9. 확정된 제품 규격 (요약 — 상세는 확정사항 §3~§6)

- 이미지: PNG 32bit RGBA만. 상태 레이어 ≤900×700·1MB, 레이어끼리 같은 크기. 마우스 파츠 ≤256×256.
- 레이어(아래→위): 몸통 / 일반 상태(대기·쉬는중·키연타=동시 6키) / 키보드 파츠(들림·누름) / 마우스 파츠(손바닥·왼클릭·오른클릭, 커서 추종 + 팔 곡선).
- 표시: 기본 450×350 상자에 비율 유지, 배율 25~200%(200% = 900×700 원본).
- 감지: 키보드 누름·뗌(키 구분 없음), 마우스 이동·좌우 클릭. 5분 무입력 → 쉬는중.
- 창: 투명·테두리 없음·항상 위·드래그 이동. 트레이 아이콘, 별도 설정 창, 자동 실행 옵션(기본 꺼짐). 한국어 UI.

## 10. `_reference/andante_claude/`

안단테(사내 Django+React 프레임워크) 자산의 원본이다. 이 프로젝트 자산은 그 구조를 옮겨 만들었다. Claude Code는 이 폴더를 로드하지 않는다. 참조가 끝나면 삭제해도 된다. 안단테 개념(Django·GraphQL·모드 F/D/P·upstream·HTML 문서·client/·server/)을 이 프로젝트 문서에 옮겨 적지 않는다.
