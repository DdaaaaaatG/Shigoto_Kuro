---
name: doc-sync
description: 배치 문서 동기화 전략. 마지막 /doc-sync 이후 git history로 수정된 기존 화면(src/overlay·src/settings)·core 모듈·bridge 계약을 찾아, 화면은 requirements→scenarios→manual 동기화와 design.md 델타 대조·backfill을 단일 소유 에이전트(ui-designer/ui-test-designer/ui-manual-writer)에 위임하고, core 모듈은 `//!` 문서주석↔doc/200_설계/core/*.md 대조를 core-designer에, bridge는 contract.md↔코드 대조를 bridge-analyst에 위임한 뒤, 전체 테스트를 재수행하고 CR을 「검증됨」으로 마킹하고 마커(doc/doc-sync-state.json)를 전진시킨다. 스킬 자체는 문서를 직접 쓰지 않는다. "문서 동기화", "doc-sync" 요청 또는 /doc-sync 명령 시 참조한다.
---

# 배치 문서 동기화 전략 (Doc-Sync)

- 소스 수정은 빠르게 하되(ui-debug 1단계·직접 수정), 문서는 **git history 기준으로 한꺼번에** 맞춘다. 기준은 *누가 고쳤는가*가 아니라 **무엇이 바뀌었는가**다.
- 이 문서가 그 절차의 **단일 소스**다.

## 0. 전제 — 실행 위치

- **`Agent` 툴이 있는 메인 세션**에서 실행한다(문서 갱신을 단일 소유 에이전트에 위임해야 하므로).
- **문서를 직접 쓰지 않는다.** 화면 requirements/design=`ui-designer`, scenarios=`ui-test-designer`, manual=`ui-manual-writer`, core 설계 md=`core-designer`, 계약 대조=`bridge-analyst`, 전체 테스트=`ui-tester`(+`cargo test`는 메인 세션 직접). doc-sync는 **오케스트레이션 + git 분석 + 마커 관리**만 한다.

## 1. 변경 범위 산출 (git 기반)

1. **마커 읽기.** `doc/doc-sync-state.json`:
   ```json
   { "lastSyncedSha": "…", "syncedAt": "yyyy-mm-dd", "syncedTargets": [], "openItems": {} }
   ```
   마커가 없으면(최초) 사용자에게 **기준 ref/날짜**를 묻는다(`/doc-sync --since <ref>`). 추측 금지.
2. **변경 파일 수집.** `git diff <lastSyncedSha>..HEAD --name-status` + 미커밋 작업트리(`git status --porcelain`).
3. **영역 분류.**

| 경로 | 영역 | 문서 |
|---|---|---|
| `src/overlay/**`, `src/settings/**`, `src/state/**` | 화면 | 화면 폴더 `requirements.md`·`design.md`·`test/scenarios.md`·`manual.md` |
| `src/components/**` | 공용 컴포넌트 | `component-catalog` 스킬 인벤토리 |
| `src-tauri/src/{hook,window,tray,assets,settings}/**` | core 모듈 | `doc/200_설계/core/{module}.md` |
| `src-tauri/src/bridge/**`, `src/bridge/**` | bridge | `doc/200_설계/bridge/contract.md` |
| `src-tauri/tauri.conf.json`, `capabilities/` | 설정 | core/bridge 문서의 해당 절 |

4. **변경 의도 수집.** `git log <lastSyncedSha>..HEAD --format='%h %s%n%b'` — 🔒 사용자 지정·변경 이유·CR-ID를 여기서 읽는다.

## 2. 대상 선별 — 수정된 기존 것만

- **신규 생성 제외.** 마커 이후 폴더·모듈이 새로 생겼고 `design.md`(또는 `doc/200_설계/core/{module}.md`)도 같은 구간에 추가(A)됐으면 생성 파이프라인이 문서를 함께 만든 것 — 제외하고 리포트에 「생성 — 제외」로만 표기.
- **기존 것의 수정(M)만 포함.** 기존 화면 안의 하위 컴포넌트 파일 추가는 그 화면의 *수정*이다.
- `src/state/**` 변경은 **overlay 화면**에 귀속한다(상태 기계는 오버레이 설계의 일부).

## 3. 변경 요약 생성 (위임 입력)

- 대상마다 `git diff`/`git log`로 **사람이 읽는 변경 요약**을 만든다 — 소유 에이전트는 git을 읽지 않으므로 이 요약이 위임의 명시적 입력이다. 내용: 무엇이 바뀌었나(컴포넌트·상태·전이·bridge 호출·문구·command 시그니처·설정 키), 관련 커밋 메시지, 🔒 단서.
- **CR 대장 대조(backfill).** 화면 `test/change-requests.md`를 git history와 대조한다 — 소스 수정은 있는데 CR 엔트리가 없으면 커밋 메시지·diff로 엔트리를 보완하고, 조치 컬럼이 비어 있으면 채운다(과거 엔트리 삭제·재작성 금지 — append·상태 마킹만).
- **2단계 미완료 감지.** `test/scenarios.md` 「변경 대기열(미검증)」에 「대기」 행 또는 CR 「적용·미검증」이 있으면 ui-debug 2단계가 끝나지 않은 것 — 위임문에 「2단계 미완료: Q-nn…/CR-nnn… — design·requirements 델타를 이 배치가 대신 닫는다」를 명시한다. ui-debug 2단계를 먼저 돌리라고 되돌리지 않는다.

## 4. 문서 동기화 위임 (순서 중요)

### 4.1 화면 (대상 화면마다)
1. **requirements.md / design.md → `ui-designer`.** 컴포넌트·레이아웃·상태·bridge 호출·기능 명세에 영향을 준 변경이면 본문 + 변경이력 + RTM 갱신. 2단계 미완료 화면은 델타를 **신규 작성**(CR-ID별 변경이력 행 append, 요구가 바뀐 CR은 requirements 행도 함께 — 옛 요구는 「폐기(CR-nnn으로 대체)」 마킹). CSS·문구만 바뀌면 변경이력만.
2. **test/scenarios.md + vitest 스펙 → `ui-test-designer`.** TC 번호 보존, 추가·수정만. 대기열 「대기」 행이 있으면 `대기열: Q-nn…`으로 소진 모드 호출(행마다 TC ≥ 1, 상태 「전환됨(TC-nnn)」). 대기열이 전부 「검증됨」이고 대기열 밖 변경이 없으면 생략.
3. **manual.md → `ui-manual-writer`.** 사용법·외형·스크린샷이 어긋난 경우만.

### 4.2 core 모듈 (대상 모듈마다)
- `core-designer`에 위임: 모듈 `//!` 문서주석·공개 함수 시그니처·스레드 모델 ↔ `doc/200_설계/core/{module}.md` 대조, 어긋난 절 갱신 + 변경이력 행. 코드는 건드리지 않는다(문서를 코드에 맞춘다 — 코드가 설계를 위반했다고 판단되면 「확인 필요」로 리포트).

### 4.3 bridge
- `bridge-analyst`에 위임: `contract.md` ↔ `src/bridge/types.ts` ↔ `src-tauri/src/bridge/*.rs` 3자 대조 리포트. 불일치는 문서 수정이 아니라 **bridge-manager 인계 항목**으로 리포트에 남긴다(계약 문서 소유는 bridge-designer).

### 4.4 공용 컴포넌트
- 변경된 컴포넌트의 props·시그니처를 `component-catalog` 스킬에 반영하도록 `ui-component-designer`에 위임(인벤토리 행 갱신만).

## 5. 전체 테스트 재수행

- 메인 세션이 직접: `cd src-tauri && cargo test`, `yarn test --run`.
- `ui-tester`에 위임: 대상 화면 시나리오 전건 + 앱 스크린샷 → `test/result.md`.
- 실패는 고치지 않는다 — 리포트에 실패 TC·원인 후보를 남기고 `ui-debug` 라우팅.

## 6. 마킹·마커 전진

- 전건 PASS인 화면의 대기열 행·CR 엔트리를 「검증됨(yyyy-mm-dd, TC-nnn)」으로 마킹(`ui-test-designer`·`ui-designer` 위임 또는 메인 세션이 상태 컬럼만 편집).
- `doc/doc-sync-state.json` 갱신: `lastSyncedSha`=HEAD, `syncedAt`, `syncedTargets`, 미해결은 `openItems`에.
- 미커밋 산출물은 `/sync` 대상임을 보고에 명시한다.

## 7. 리포트 양식 (최종 응답)

```
[doc-sync] 기준 {sha7} → HEAD
■ 대상: 화면 N(overlay, settings) / core 모듈 N / bridge 변경 여부 / 공용 컴포넌트 N
■ 제외: 생성 — …
■ 위임 결과: designer ✅ | test-designer ✅(TC +3) | manual ✅ | core-designer ✅ | bridge-analyst 불일치 2건 → bridge-manager
■ 테스트: cargo N/N | vitest N/N | 화면 TC N/N (FAIL: TC-…, → ui-debug)
■ 마킹: CR-… 검증됨 / 대기열 Q-… 검증됨
■ 마커: lastSyncedSha {old} → {new}
■ 미해결(openItems): …
```
