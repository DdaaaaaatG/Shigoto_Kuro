# 다음 세션 인계 (2026-09-29 갱신)

- 날짜별 경과 기록(2026-09-23~27)은 `doc/archive/next-session-20260923-0927.md`로 옮겼다. 결정은 `doc/000_프로젝트_확정사항.md`, 화면별 이력은 각 `test/change-requests.md`가 단일 소스다.
- 이 문서는 **지금 상태 · 남은 일 · 결정 대기 · 꼭 지킬 것**만 담는다. 항목을 끝내면 지우고, 새 일은 해당 절에 짧게 추가한다.

## 0. 시작 확인
- 세션은 **프로젝트 루트**에서 연다(`.claude` 폴더에서 열면 가드 경로가 어긋나 에이전트 Bash·Write가 막힌다).
- 진행 방식: 메인 세션은 소스·산출 문서를 직접 고치지 않고 리프 에이전트에 위임한다(CLAUDE.md §5-0).

## 1. 현재 상태 (2026-09-28)
- **버전 0.4.0** (2026-09-28) — `deploy/0.4.0/`에 포터블 exe(5.4MB)·NSIS setup(2.0MB)·README. 기본 세트 = 사용자가 쓰던 그림 6장(뒷머리 제외, 옛 세트 `doc/assets/defaults-v4/`)·기본 알림음 = 사용자 mp3(`src/assets/sounds/default-alarm.mp3`)·타이머 기본 textPos(268,402)·rotation 7·음량 44. `DATA_GENERATION` 5(기존 사용자 초기화). CR-058(overlay)·CR-059(settings) 「적용·미검증」. verify-manager 미실행.
- 마지막 검증(2026-09-28): cargo fmt·clippy 0, cargo test lib 375·통합 49 전부 통과 / vitest 801 / tsc·lint 0 / `yarn tauri build` exit 0.
- 사용자 앱 데이터 백업: `%USERPROFILE%\kuro-appdata-backup-20260928`(0.4.0 세대 5로 이 PC 데이터가 초기화되기 전 상태).
- **0.4.0 release exe 실행 확인 안 함** — 실행하면 이 PC 앱 데이터가 초기화된다. 실행 직전 사용자 재확인.
- **Git**: 2026-09-28 공개 저장소를 사용자가 삭제·재생성 → 옛 기록 없는 새 첫 커밋 `99fe564`(orphan)를 `main`으로 푸시(작성자 DdaaaaaatG noreply, 파일 471개). **주의: 커밋 메시지는 「0.3.0」이지만 실제 내용은 위 0.4.0 작업 트리 전체**(병행 세션의 0.4.0 변경이 커밋 시점에 작업 트리에 있었음 — verify-manager 미실행 상태 그대로). 메시지 정정은 force push가 막혀 있어 다음 커밋 메시지에 적어 둠. 원격 `https://DdaaaaaatG@github.com/DdaaaaaatG/Shigoto_Kuro.git`. 옛 커밋 ee5ab8b는 로컬 `old-main` 브랜치에만 남음 — **절대 푸시하지 않는다**(지운 agent-memory 파일 포함). 필요 없으면 사용자가 `git branch -D old-main`.
- 2026-09-28: `doc/100_요구조건/parts-spec.md`를 현재 규격으로 재작성, 확정사항 §1·§3·§4·§5·§6·§7 옛 문장 정리(메인 세션 직접 수정).
- 2026-09-28: 앱 데이터 경로 `%APPDATA%\com.kuro.keyviewer`로 전면 정정 — CLAUDE.md, `.claude`(deploy 명령·rules·core 스킬 §6·§7), 화면 테스트 문서 4개(18곳), `core/data_reset.md` C-5. `/deploy` README 양식 「첫 실행」 문구 갱신, settings manual-checklist 준비 2번 옛 「등록 UI 없음」 문장 정정. **사용자 지시로 메인 세션 직접 수정(이번 1회 예외).** 옛 폴더 `%APPDATA%\kuro_keyviewer`는 원래 없었음.
- 2026-09-28: 떠돌이 `src-tauri/.claude/agent-memory/`(bridge-designer·ui-designer·ui-implementer — `cd src-tauri` 뒤 상대 경로로 쓴 것) 정리. 앞 둘은 `.claude/agent-memory/`로 합치고, ui-implementer의 `?raw` 메모는 해결된 내용이라 삭제. 이 중 4개 파일이 첫 커밋에 들어가 있어 `git rm --cached`(다음 커밋에서 원격에서도 빠짐), `.gitignore`에 `**/.claude/agent-memory/` 추가.
- 2026-09-28: `.claude` 자산 3건 정정(사용자 지시, 메인 세션 직접) — `bridge-design-strategy` §4 `ASSET_CANVAS_MISMATCH`를 캔버스 레이어 한정(CR-036)으로, `kuro-destructive-guard.sh` 앱 데이터 경로 문구를 `%APPDATA%\com.kuro.keyviewer`로(정규식에 `com.kuro.keyviewer` 추가), `validate-report-write.py`가 분석가 3종의 루트 `.claude/agent-memory/{이름}/` 쓰기를 허용(하위 폴더 `src-tauri/.claude/…`·`..` 경로는 차단).

## 2. 남은 일

### 2-1. 우선
1. **커밋 완료 `2be41ce`(2026-09-29, 미푸시)** — 1-3 오른쪽 클릭 메뉴와 함께 커밋. 내용: verify PASS(`doc/300_검증/verify-20260929-1928.md`, C0 H0) 후 1~3 수정 완료 — core 7건(CORE-201 hook 테스트 직렬화 `KEYS_TEST_LOCK`, CORE-207·208 주석, SEC-201 로그 경로, SEC-205 JSON 1MiB 상한 `settings::read_capped_string`), TS 3건(CR-060 settings·CR-061 overlay: 음량 단일 소스·중첩 삼항·calcNow), 문서 동기화(contract v0.27, core 4문서, 두 화면 design·requirements·scenarios·manual-checklist, `//!` 주석 5곳). settings R-46 🔒 문구도 사용자 지시로 (268,402)·7°(requirements v1.25). 사후 검증: fmt·clippy 0, cargo test 429/429, tsc·lint 0, vitest 801/801. 커밋 전 release exe 실행·캡처 확인(사용자 OK 후, 실행 시 이 PC 데이터 초기화). 커밋 메시지에 「원격 첫 커밋 99fe564 메시지는 0.3.0이지만 내용은 0.4.0」 정정 한 줄.
1-1. **예정(사용자 2026-09-29)**: 기본 알림음을 나중에 옛 합성 기본음(삐 소리)으로 되돌릴 계획 — CSP `media-src`의 `blob:`은 **유지**(빼지 않는다).
1-3. **오버레이 오른쪽 클릭 메뉴(overlay R-40, CR-062) 구현 완료·수동 미검증(커밋 2be41ce, 2026-09-29)** — 사용자 피드백 "키뷰어 오른쪽클릭하면 트레이 옵션 같이". 🔒 결정: 잠금 중에도 뜸(전역 훅, 클릭은 아래 창에도 전달), 누른 곳·뗀 곳 둘 다 창 사각형 안, 전체 화면(전경 창 클라이언트 영역이 모니터 전체)이면 안 뜸, 포커스 이탈·메뉴 경합 수용, 브라우저 기본 메뉴 제거. 설계 `doc/200_설계/architecture/overlay-context-menu.md`, core hook·window·tray.md, overlay requirements v3.2·design §10.16. 소스: hook/{right_click,foreground}.rs·tray/popup.rs 신규(unsafe는 foreground.rs U12~U19만), `PopupGate` Idle→Pending→Open(CORE-301), 사각형 판정을 전경 조회보다 먼저(SEC-301), lib.rs `start_input_pipeline`·`initial_hand_anchor` 추출, overlay `.root` onContextMenu preventDefault. 검증: fmt·clippy 0, cargo test 466/466, vitest 803/803, 리뷰 core·security C0 H0. **남은 것: 수동 MC-31~MC-45(dev·release) — 사용자가 게임 끝나고 "띄워" 할 때만 앱 실행.** 관찰·수용: T-f(메뉴 바깥 오버레이 재클릭 시 닫힘→재표시), T-j(늦은 메뉴 최대 1개), 앱 시작 직후 로딩 전 구간 브라우저 메뉴. 문서 잔여: overlay design.md:724·manual-checklist.md:65·scenarios.md:3804의 `POPUP_OPEN` 이름 → `PopupGate`.
1-2. **다음 방향(사용자 합의 2026-09-29)**: 커밋 → 피드백 받아 새 기능(요구ID로 정리, 계층 1개면 해당 리프, 여러 계층이면 system-architect 절차). 남은 구조 이슈(CORE-202 훅 콜백 Mutex·CORE-203 종료 경로 Unhook·CORE-204 채널 상한·CORE-205 set_settings 59줄·리뷰 CR-203 긴 함수 9개·SEC-202·204·206·CORE-206)는 새 기능이 그 영역을 건드릴 때 묶어서, 아니면 정식 배포 전에.
2. `CLAUDE.md` §9 제품 규격 요약이 옛 규격(마우스 파츠 ≤256·키연타 쾅·팔 곡선·한국어 UI) — 확정사항 §3~§6에 맞춰 정정(메인 세션 소관).
3. 병행 세션 주의: 한 작업 트리를 두 세션이 동시에 쓰면 커밋에 상대 세션의 미검증 변경이 섞인다. 커밋 전 `git status`로 내 변경만인지 확인하고, 병행 중이면 파일 단위로 `git add`.
4. ja·en 문구 검수 — CR-057, 초기화 카드(`needs review` 주석 정리는 ui 위임).

### 2-2. 수동 확인 대기 (기록상 미확인 — 이미 봤으면 CR 「검증됨」 처리)
- 오버레이: MC-24(뒷머리), MC-27~30(뽀모도·알림음 자동 재생·타이머), M-40a(알파 기준 끌기, dev·release), 펜 모드 특수 키, 트레이 「새로고침」·타이머 메뉴.
- 설정 창: M-27(확인창 후 포커스), M-28·M-31(ja·en), M-29(새 PC 첫 실행 시딩), M-30(기본 이미지 다운로드), M-32, M-45a~f, M-50a~g, 창 닫았다 다시 열기(CR-041).
- 자동 실행: 재로그온 후 실행, 클릭 통과, 작업표시줄 토글, 옛 레지스트리 Run 값 잔존 여부, M-T1.

### 2-3. 조사·기술 부채
- **Alt+Tab 때 오버레이 사라짐** — 미측정. 조건: 일반 창으로 전환할 때(게임 아님), 오버레이는 원래 Alt+Tab 목록에 없음. ui-error-analyst로 Alt+Tab 전후 IsWindowVisible·IsIconic·GWL_EXSTYLE(TOPMOST 0x8)·GetWindowRect 비교 → 값이 그대로면 WebView2 가림 판정(`additionalBrowserArgs`에 `CalculateNativeWinOcclusion` disable), TOPMOST가 빠지면 window 모듈에서 재적용. 수정 계층 core.
- 모니터 재조회 미구현 — 모니터 구성이 바뀌면 재시작 필요.
- 0.4.0 문서 잔여(2026-09-29 대부분 해소). 남은 것: core `settings.md` §3.7·§3.8·§3.10 코드 조각·S-T 표 옛 기본값, `data_reset.md` 본문 「=4·7장·376 708」(변경이력 행으로만 정리됨), `assets.md` §1 DA-01 「7장」, `timer.md` 「소스 미적용」 표기 확인. 테스트 스펙 주석: settings `AlarmSoundCard.test.tsx` TC-283 이름 「기본 80%」, `TimerTab.test.tsx:334·344`, `TimerTab.cr052.test.tsx:52` / overlay `TimerText.blink.test.tsx:98-111`·`OverlayApp.timerMode.test.tsx` 옛 `createObjectURL` stub 잔재, `timerClock.test.ts` 머리 R-34 옛 값 인용.
- verify 잔여(2026-09-29 리포트 기준, 위 1-1 구조 이슈 외): 리뷰 CR-206(`src/bridge/commands.ts:124-129` resetAppData JSDoc 낡음), 이전 SEC-101·CORE-101·CORE-102, 이전 CR-003(`MousePartsTab.tsx:418` findUrl ↔ imageSlots.findEntry 중복).
- window 6개 함수 반환 타입 `WindowError` 전환, From impl을 error.rs로 이관.
- manual.md(두 화면) 미작성.
- plugin-dialog JS는 2.2대(다른 tauri JS 패키지는 2.12).

### 2-4. `/doc-sync` 대상 (문서 잔여)
- **bridge·core 문서**: `contract.md`(v0.27) 이미 구현된 항목의 「미반영·소스 미적용」 표기(L14·15·358·114·651·680·719·1505·1508·1547·1561·1577, §8 v0.20~v0.26 행), 머리 「초안」→v1 승격 여부, §7 L1358 「확인 필요」, §5 옛 문구, 옛 겹침 순서(contract·`core/assets.md`·`slot.rs` 주석) / `bridge/types.rs:21`, `types.ts:155`·`types.rs`의 「같은 크기」 주석 / core 문서 CR-019·024 「소스 미적용」, `settings.md` 반영 표기.
- **overlay**: design.md 「미확정 계약」·「소스 미적용」 표기, §10.12·`functions.md` §5.5 PenHand Props, RTM R-16의 TC-055 흔적·T-1·T-2 / scenarios TC-080·TC-143 옛 `.bounce`, R-09·R-23~25 추적표에 TC-204+ / manual-checklist 머리글 v1.4·변경 이력.
- **settings**: requirements R-11·15·16·18 미작성, R-19·R-27 「초록 강조색」, S-14·S-17·S-22·S-24 / scenarios M-23(초록)·J-1(10키/11키)·V-1·V-3·Q-02·TC-208/209 번호 중복·TC-208/209 BDD / manual-checklist W-4·W-5·M-4 / design.md P-1 재시도 서술 / `i18n.md` 「24개」 / `images-tab.md` 머리 계약 v0.14·§3.1 `dialogPickImage`.
- CR 「적용·미검증」 → 확인 끝난 것부터 「검증됨」.

## 3. 사용자 결정 대기
| # | 항목 | 비고 |
|---|---|---|
| 2 | `Cargo.toml` rust-version 1.77 → 1.90(single-instance 플러그인 요구) | |
| 3 | 그림 원본 보관 폴더(dist 밖) | 지금은 `doc/assets/samples/`에 복사본 |
| 4 | 흰 글자 on 포인트색 #BE72AD 대비 3.38:1(AA 미달) | 판단 대기 |
| 5 | settings S-18/TC-FLOW-19 부활 여부 | |


## 4. 꼭 지킬 것
- 🔒 **데이터 전체 초기화는 베타 전용 정책**(데이터 세대가 다르면 앱 데이터를 새 기본으로 초기화). 정식 배포 시작 전 초기화 정책을 다시 정한다 — **정식 `/deploy` 전에 사용자에게 반드시 상기**.
- exe 빌드·배포는 **사용자가 요청할 때만**. 개발 중엔 dev 앱으로 확인.
- 배포 전 **release exe를 직접 실행·캡처**해 확인(CR-039 교훈: dev에선 멀쩡하고 release에서 오버레이가 투명했음).
- `yarn build`는 `dist/`를 비운다 — 원본 그림을 `dist/`에 두지 않는다.
- 위임문에 **실행 중인 앱·프로세스 종료 금지**를 적는다(core 에이전트가 dev 앱을 taskkill한 적 있음).
- 테스터 안내: 0.1.0이 실행 중이면 single-instance가 막지 못한다 → 옛 버전 종료 후 실행.
- 게임(관리자 실행) 안 입력이 필요하면 사용자가 앱을 직접 관리자로 실행(자동 실행은 일반 권한, CR-047).

## 5. 참고
- 개발용 에셋 등록: `cd src-tauri && cargo run --example import_sample -- "%APPDATA%\com.kuro.keyviewer" [--demo-settings] slot=path remove=slot`
- 캡처 스크립트: `scripts/dev/capture-overlay-*.ps1` — PowerShell `-File`로 실행, 합성 클릭 전 WindowFromPoint로 대상 창 확인.
- 내장 기본 그림: `doc/assets/defaults/`(7장, CR-053), 옛 세트 `defaults-v1`~`v3`. 이미지 규격 가이드: `doc/100_요구조건/parts-spec.md`.
- 설계 문서(횡단): `doc/200_설계/architecture/` — settings-v2·pomodoro·timer-mode·data-reset.
