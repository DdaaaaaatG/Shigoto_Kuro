# settings-v2 전반 설계 (R-set-v2 설정 창 개편)

- 작성: system-architect, 2026-09-24. 선행: `settings-v2-01-analysis.md`.
- 단일 소스: `doc/000_프로젝트_확정사항.md` §6 「설정 창 개편 (🔒 2026-09-24)」·자동 실행 줄. 참고 화면: 사용자 스크린샷 2장(카드형 섹션·알약형 탭·초록 강조색·토글 스위치·이미지 카드의 「이미지 변경」「기본값」). 참고 제품의 이름·제작자 표기는 가져오지 않는다.
- 결론: **새 라이브러리 없이 된다.** core는 설정 필드 3개·창 속성 2개·작업 스케줄러 자동 실행·위치 초기화·에셋 url 버전을, bridge는 계약 v0.14(필드 3개 추가, `set_settings` 의미 변경 1건, `set_autostart` 구현 교체, 새 command 1개, 필수 슬롯 상수)를, ui는 설정 창 3탭 개편과 사전(ko/ja/en) 방식 i18n을 맡는다. 입력 상태 기계와 오버레이 코드는 바뀌지 않는다.

---

## 0. 요구 정규화 (아키텍처 ID)

화면 요구ID(`R-xx`)는 ui-designer가 `src/settings/requirements.md`·`src/overlay/requirements.md`에 붙인다. 아래는 제안 번호다(설정 창 마지막 R-18, 오버레이 마지막 R-26 기준).

| 아키텍처 ID | 요구 (확정사항 §6 전사·요약) | 제안 화면 ID | 대체·수정되는 기존 요구 |
|---|---|---|---|
| SV2-01 | 설정 창 탭 3개(기본 설정 / 이미지 설정 / 어깨축·손 위치). 참고 화면 양식: 카드형 섹션, 알약형 탭, 초록 강조색, 토글 스위치 | 설정 R-19 | 기존 탭 3개(이미지/동작/마우스 파츠) 폐기 |
| SV2-02 | 언어 선택 한국어/일본어/영어 — **설정 창 전체 문구** 3개 국어 | 설정 R-20 | R-01의 「UI 언어 한국어」를 「기본 한국어, 선택 가능」으로 수정 |
| SV2-03 | 위치 잠금 토글 — 켜면 오버레이가 마우스 클릭을 통과시키고 끌어서 옮길 수 없음 | 설정 R-21, 오버레이 R-28 | — |
| SV2-04 | 작업표시줄 표시 토글 | 설정 R-22 | — |
| SV2-05 | 컴퓨터 시작 시 자동 실행 토글 — 작업 스케줄러, 관리자 권한(관리자 게임 안에서도 입력 인식, UIPI) | 설정 R-23 | R-06 대체 |
| SV2-06 | 위치 초기화 버튼 — 오버레이를 기본 자리로 | 설정 R-24 | — |
| SV2-07 | 이미지 설정 탭 — 그룹 배경 / 키보드(본체 겸: `kb_up`, `kb_down_N`, `idle`, `rest`, `key_*` 7종) / 팔(`mouse_base`, `mouse_left`, `mouse_right`) / 손(`pen_up`, `pen_down_N`, `pen_key_*` 7종). 카드마다 미리보기 + 「이미지 변경」 + 「기본값」 | 설정 R-25 | R-14 대체 |
| SV2-08 | 필수 = `kb_up` + `kb_down_0` + `mouse_base`. `idle`·`rest`는 선택(없으면 `kb_up`). 배경·손·특수 키·클릭 그림은 선택 | 설정 R-25 일부, 오버레이 R-27 | 확정사항 §4 「필수 4장」, 오버레이 R-19 문구 |
| SV2-09 | 「어깨축·손 위치」 탭 = 기존 「마우스 파츠」 탭 재사용 | 설정 R-26 | R-10~R-12, R-15~R-18은 유효, 탭 이름만 바뀜 |
| SV2-10 | 참고 화면의 크기(4단 버튼)·흔들림·항상 위·머리글·닫기·설명서·프리셋은 **만들지 않는다**. 크기 조절은 참고 화면의 4단 버튼이 아니라 SV2-11 배율 슬라이더로 한다 | (금지 조건 — 각 R에 주석) | — |
| SV2-11 | 「기본 설정」 탭에 배율 슬라이더 — 범위 25%~200%(200% = 900×700 원본), 설정 JSON 저장. 위치 잠금 중 오버레이 Ctrl+휠 차단은 그대로(설정 창 슬라이더로는 바꿀 수 있음) (🔒 사용자 결정 D-7, 2026-09-24) | 설정 R-03 (보류 해제) | R-03 보류 → 유효 |
| SV2-12 | 「기본 설정」 탭에 유휴 시간(쉬는중 전환까지 무입력 시간, 기본 5분) (🔒 사용자 결정 D-7, 2026-09-24) | 설정 R-04 (보류 해제) | R-04 보류 → 유효 |

## 1. 목표 구조

```
[설정 창 ui — src/settings/]
 SettingsApp ─ MessagesProvider(language = settings.language)          ← SV2-02
  ├ 탭 바(알약형) [기본 설정] [이미지 설정] [어깨축·손 위치]              ← SV2-01
  ├ GeneralTab   언어 선택 · 배율 · 유휴 시간 · 위치 잠금 · 작업표시줄 표시 · 자동 실행 · 위치 초기화
  │    setSettings({...s, language|scale|idleSeconds|positionLock|showInTaskbar}) ──▶ set_settings (scale·idleSeconds는 기존 필드·기존 경로)
  │    setAutostart(enabled)                                      ──▶ set_autostart (async, UAC)
  │    resetOverlayPosition()                                     ──▶ reset_overlay_position (신규)
  ├ ImagesTab    그룹 4개 × ImageSlotCard(미리보기·필수/선택 표시·이미지 변경·기본값)
  │    pickPngFile(title) → importAsset(slot, path)               ──▶ import_asset
  │    확인 대화상자 → removeAsset(slot)                           ──▶ remove_asset
  └ MousePartsTab (기존 그대로, 문구만 사전으로)                    ← SV2-09
                         ▲ settings://changed / assets://changed (기존 이벤트, 변경 없음)
[bridge — contract v0.14]
 set_settings: 검증 → core 소유 필드 병합(overlay.x/y + autostart) → 저장 → 창 속성 적용(visible·클릭 통과·작업표시줄) → 리사이즈 → 재병합 → emit
 set_autostart: async. core tray::autostart 호출 → 성공 시 settings.autostart 저장 → emit
 reset_overlay_position: core window 기본 위치로 이동 → 저장 → emit → Position 반환
[core]
 settings: language / position_lock / show_in_taskbar 필드(serde default)
 window:   apply_overlay_settings 확장(set_ignore_cursor_events, set_skip_taskbar), default_overlay_position, 시작 시 적용
 tray/autostart: 작업 스케줄러 등록·해제·조회(schtasks.exe + XML), UAC 승격 실행은 hook/의 안전 래퍼
 assets:   AssetEntry.url에 버전 쿼리(같은 슬롯 교체 시 url이 바뀜). 필수 판정 로직은 없음(문서주석만 갱신)
[오버레이 ui] 코드 변경 없음 — idle·rest 없으면 이미 투명(=kb_up만 보임), 위치 잠금은 OS가 클릭을 통과시킴
```

판단 기준(스킬 §2.2): 설정은 Rust가 소유하고 ui는 command로 읽고 쓴다. 창 속성(클릭 통과·작업표시줄)은 **core가 적용**한다(JS 창 권한을 늘리지 않는다 — contract §7 v0.4 리사이즈와 같은 근거). 문구 번역은 ui만의 일이다(core는 언어 값을 저장만 한다).

## 2. 상태 기계 확정본

### 2.1 입력 상태 기계 — 변경 없음
`src/state/inputMachine.ts`의 상태(`idle`/`rest`)·전이·유휴 타이머는 그대로다. SV2-08의 「idle·rest 없으면 kb_up」은 상태 기계가 아니라 **렌더 규칙**이며 현행 `LayerStack`이 이미 충족한다(01-analysis §3). 오버레이는 회귀 TC만 추가한다.

### 2.2 설정 창 로컬 상태 (ui 소유, 새로 생김)

| 상태 | 값 | 전이 |
|---|---|---|
| `tab` | `'general' \| 'images' \| 'mouse'`, 초기 `'general'` | 탭 클릭 |
| `autostartPending` | `boolean` | 토글 클릭 → true → `set_autostart` 응답(성공·실패·취소) → false. true인 동안 토글 비활성(중복 UAC 방지) |
| `slotBusy` | `string \| null`(작업 중 슬롯 key) | 「이미지 변경」 파일 선택 완료 또는 「기본값」 확인 → key → 응답 → null. 작업 중에는 모든 카드 버튼 비활성(캔버스 크기 결정 순서가 꼬이지 않게 한 번에 하나) |
| `confirmSlot` | `AssetSlot \| null` | 「기본값」 클릭 → 슬롯 → 확인/취소 → null |
| `resetPending` | `boolean` | 「위치 초기화」 클릭 → true → 응답 → false |

타이머 없음. 모든 확정 값은 `settings://changed`·`assets://changed`로 되돌아와 교체된다(낙관적 갱신 없음 — 기존 설정 창 규칙 그대로).

### 2.3 자동 실행 상태 (core 소유)

| 상태 | 뜻 | 들어가는 길 |
|---|---|---|
| 꺼짐 | 작업 `kuro_keyviewer` 없음 | 기본값 / `set_autostart(false)` 성공 / 시작 시 조회 결과 「없음」 |
| 켜짐 | 작업 있음(로그온 트리거, 가장 높은 권한) | `set_autostart(true)` 성공 / 시작 시 조회 결과 「있음」 |
| (변화 없음) | UAC 취소·실패 | 이전 상태 유지, 에러 반환 |

## 3. 계약 변경 목록 (contract v0.13 → v0.14)

| 종류 | 이름 | 변경 | 하위 호환 | 소비자 |
|---|---|---|---|---|
| 타입 | `Settings.language` | **추가** `'ko' \| 'ja' \| 'en'`, 기본 `'ko'` | 호환(serde default) | 설정 창 |
| 타입 | `Settings.positionLock` | **추가** `boolean`, 기본 `false` | 호환 | 설정 창(core가 적용) |
| 타입 | `Settings.showInTaskbar` | **추가** `boolean`, 기본 `false`(현행 `skipTaskbar: true`와 같은 동작) | 호환 | 설정 창(core가 적용) |
| command | `set_settings` | **의미 변경**: ① 입력 `autostart`를 무시하고 core 현재값 유지(`overlay.x/y`와 같은 「core 소유 필드」) ② 4단계에서 자동 실행을 반영하지 않음 ③ 4단계에서 `positionLock`·`showInTaskbar`를 오버레이 창에 적용 | 실사용 호환(현행 ui는 `autostart`를 바꾼 적 없음). 문서상 의미 변경이라 v0.14 변경 이력에 **파괴 가능 변경**으로 명시 | 설정 창·오버레이(Ctrl+휠) |
| command | `set_autostart(enabled) -> boolean` | 시그니처 **불변**. 구현 교체(작업 스케줄러 + UAC). **async**(UAC 대기 중 창이 멈추지 않게). 성공 시 `settings.autostart` 저장 + `settings://changed` emit(현행과 같음). 새 에러 코드 「사용자가 권한 확인 취소」 | 호환(시그니처) | 설정 창 |
| command | `reset_overlay_position() -> Position` | **신규**. core 기본 위치로 이동 → 저장 → `settings://changed` → 새 위치 반환. 에러 `WINDOW_ERROR`·`IO_ERROR`(표기는 §5 D-3 결정) | 추가 | 설정 창 |
| 타입 | `AssetEntry.url` | 값 규칙 변경: 끝에 버전 쿼리(`?v={수정 시각 ms}` 등). 같은 슬롯을 다른 그림으로 바꾸면 url이 달라진다 | 호환(ui는 url을 그대로 `<img src>`에 넣는다) | 설정 창·오버레이 |
| 상수 | `REQUIRED_SLOTS` (TS, 계약 §3.1) | **신규** `['kb_up', {kind:'kb_down',index:0}, 'mouse_base']`. 계약 §3.1의 필수 문구도 교체(idle·rest 필수 → 선택) | 추가 | 설정 창 |
| 래퍼 | `pickPngFile(title?: string)` | 선택 인자 **추가**(대화상자 제목을 언어별로) | 호환 | 설정 창 |
| 래퍼 | `setSettingsWindowTitle(title: string)` | **신규(미결 D-6에 따름)** — 설정 창 제목 표시줄 번역. `@tauri-apps/api/window` `setTitle` 감쌈 | 추가 | 설정 창 |
| 에러 | 자동 실행 취소 코드 `autostart.cancelled` | **추가**(D-3: 계약 정본 = 실물 `영역.사유` 표기) | 추가 | 설정 창 |
| 에러 | 계약 §6 코드 열 | 대문자 이름 → 실물 값(`asset.too_large` 등)으로 교체, 대문자는 별칭 열(D-3) | 문서 정정(실물 불변) | 설정 창(오류 문구 사전 키) |
| capabilities | `autostart:default` | **삭제**(승인됨, 파일 수정은 메인 세션) | — | — |
| capabilities | `core:window:allow-set-title`(settings 창 한정) | **추가**(D-6 확정, 파일 수정은 메인 세션) | — | 설정 창 |
| command | `set_settings`의 `scale`·`idleSeconds` | **변경 없음** — D-7로 설정 창이 새로 쓰기 시작할 뿐(기존 검증·리사이즈 경로) | — | 설정 창(신규 소비) |
| 문서 | 계약 §7 표 | 실물(`default.json`) 기준으로 정리(BRG-002) | — | — |
| event | 없음 | 새 이벤트 없음. `settings://changed`·`assets://changed` 그대로 | — | — |

## 4. 설정 스키마 변경

| 키 | 타입 | 기본값 | 검증 | 마이그레이션 |
|---|---|---|---|---|
| `language` | `'ko' \| 'ja' \| 'en'` (Rust enum, 소문자 직렬화) | `'ko'` | 세 값만. 알 수 없는 값·키 없음 → `'ko'`로 읽는다(파일 읽기와 `set_settings` 입력 모두 관용 처리 — 파일 전체 읽기 실패·명령 거부 금지. ui는 TS 타입으로 세 값만 보낸다) | 키 없음 → 기본값(serde default). 버전 승격 없음 |
| `positionLock` | bool | `false` | — | 키 없음 → `false` |
| `showInTaskbar` | bool | `false` | — | 키 없음 → `false` |
| `autostart` | bool (기존) | `false` | — | 의미 변경 없음. 쓰기 경로가 `set_autostart`·시작 시 조회 보정뿐으로 좁아짐 |

- 스킬 §1 기준: 기본값 있는 키 추가 → 스키마 버전 승격 불필요. `version` 필드 도입은 이번 범위가 아니다(CORE-004, 별건).

## 5. 사용자 결정 사항 (대안·근거·권고)

**전 항목 확정(🔒 2026-09-24, 사용자 결정 — 메인 세션 전달).** D-7만 권고와 다르게 결정됐다.

| # | 주제 | 대안 | 결정·근거 | 상태 |
|---|---|---|---|---|
| D-1 | 「기본값」 버튼 의미 | A 해당 슬롯 비우기(`remove_asset`) / B 내장 기본 그림 되살리기 | **A.** 앱에 내장 기본 그림이 없다(core·bridge 조사). B는 번들 자산·새 command가 필요한 요구 밖 기능. 비어 있는 슬롯이면 비활성. 확인 대화상자 필수(ui-design-strategy §11 「이미지 슬롯 비우기」). 필수 슬롯도 비울 수 있다 — 캔버스 크기를 바꾸려면 캔버스 그림을 모두 비워야 하므로 막으면 크기 교체가 불가능해진다. 비운 필수 카드는 「필수 · 미등록」 경고로 보인다 | 🔒 A(권고 채택) |
| D-2 | 여러 장 슬롯(`kb_down_N`·`pen_down_N`)의 「기본값」 | A 마지막 장만 비울 수 있음 / B 가운데 장도 비우고 core가 번호를 당김 | **A.** core `import`는 불연속 index를 거부한다. B는 파일 이름 바꾸기·매니페스트 재번호·url 변경이 겹쳐 위험하다. 가운데 장은 「이미지 변경」으로 교체한다. 새 장은 「+ 누름 그림 추가」 카드(다음 index로 등록) | 🔒 A(권고 채택) |
| D-3 | 에러 코드 정본 표기 | A 실물(`asset.too_large` 등 `영역.사유`)을 계약으로 올림 / B 실물을 계약(`ASSET_TOO_LARGE` 등)으로 고침 | **A.** Rust 변경 0, ui는 지금까지 code로 분기한 적 없음. 계약 §6 코드 열을 실물 값으로 교체, 옛 대문자 이름은 별칭 열로만 남긴다. 신규 취소 코드 = `autostart.cancelled` | 🔒 A(메인 세션 판단, 사용자 영향 없음) |
| D-4 | UAC 승격 실행 수단 | A `ShellExecuteExW("runas")` 안전 래퍼를 `hook/`에 둠 + `windows` 크레이트 기능 `Win32_UI_Shell` / B `powershell Start-Process -Verb RunAs -Wait` / C 작업 스케줄러 COM(`ITaskService`) | **A.** 취소(`ERROR_CANCELLED`)와 종료 코드를 정확히 받는다. unsafe는 hook 안에만(golden-principles §6 「hook 모듈에 안전한 래퍼를 추가하는 것이 정답」). **승인 범위**: `Win32_UI_Shell` 추가 승인(`Cargo.toml`은 메인 세션이 수정) · `tauri-plugin-autostart`(Cargo)·`@tauri-apps/plugin-autostart`(npm)·capability `autostart:default` 제거 승인 — 코드 사용처 제거는 core·bridge 구현자, 패키지·capabilities 파일 수정은 메인 세션 | 🔒 A |
| D-5 | 관리자 권한 범위 | A 자동 실행(작업)만 가장 높은 권한으로 실행, 수동 실행은 일반 권한 / B exe 매니페스트 `requireAdministrator`(항상 UAC) | **A.** 요구는 「자동 실행 = 작업 스케줄러(관리자)」뿐이다. 결과: 수동 실행한 앱은 관리자 게임 안의 입력을 못 받는다(UIPI) — 설정 창 설명 문구에 적는다 | 🔒 A(권고 채택) |
| D-6 | 설정 창 제목 표시줄·파일 대화상자 제목 번역 | A 번역(래퍼 `setSettingsWindowTitle` + capability `core:window:allow-set-title` settings 창 한정, `pickPngFile(title)`) / B 제목 고정 | **A.** 「설정 창 전체 문구」에 제목 표시줄 포함. 권한 1개 추가(capabilities 파일 수정은 메인 세션) | 🔒 A(권고 채택) |
| D-7 | 새 3탭에 없던 R-03(배율 슬라이더)·R-04(유휴 시간) | A 보류 유지 / B 폐기 / C 「기본 설정」에 넣음 | **C — 권고(A)와 다르게 사용자 결정.** 두 값 모두 기존 `Settings.scale`(0.25~2, 유한수, 범위 밖 거부)·`idleSeconds`(u32, ≥1)와 기존 `set_settings` 경로(배율 변경 시 core 리사이즈)를 그대로 쓴다 → **core·bridge 계약 변경 없음**, ui만 추가(SV2-11·12). 위치 잠금 중 오버레이 Ctrl+휠 차단은 유지 — 잠금 중 배율은 설정 창 슬라이더로 바꾼다 | 🔒 C |
| D-8 | 몸통(`body`) 카드 | A 없음(§6 목록 그대로, 「키보드 = 본체 겸」) / B 키보드 그룹에 「몸통(선택)」 카드 | **A.** 부작용: 이미 등록된 `body.png`는 계속 그려지지만 화면에서 지울 수 없다(사용자 수용) | 🔒 A |
| D-9 | 작업표시줄 토글 대상 | A 오버레이 창 / B 설정 창 | **A.** 설정 창은 일반 창이라 열려 있으면 늘 작업표시줄에 있다. 오버레이만 `skipTaskbar: true`다 | 🔒 A(권고 채택) |
| D-10 | 강조색 | A 설정 창 한정 토큰 덮어쓰기(초록) / B 디자인 시스템 기본색 개정 | **A.** 오버레이에는 색이 없다. 설정 창 CSS의 `body[data-window='settings']` 범위 변수로 둔다. design.md §11 전략 편차에 기록 | 🔒 A(권고 채택) |

### 5.1 미결 권고 — 요구 밖이라 설계에 넣지 않은 것 (확인 필요)

| # | 항목 | 왜 문제인가 | 권고 |
|---|---|---|---|
| R-1 | **보안: 가장 높은 권한 작업 + 사용자 쓰기 가능 설치 경로** | NSIS `installMode: currentUser` → exe가 `%LOCALAPPDATA%` 아래(사용자 권한으로 바꿔치기 가능). 로그온 때 관리자 권한으로 실행되므로 사용자 권한 악성 프로그램이 exe를 바꾸면 다음 로그온에 관리자 권한을 얻는다(UAC 우회 경로) | **미결 유지(2026-09-24)** — 메인 세션이 사용자에게 위험을 알린다. 완화안: 전체 사용자 설치(`perMachine`, Program Files) 전환 — 설치 방식 변경이라 별도 결정. verify-security-reviewer 확인 항목 |
| R-2 | 단일 인스턴스 없음 | 자동 실행(관리자)과 수동 실행이 겹치면 훅·오버레이가 두 벌 뜬다 | `tauri-plugin-single-instance` 채택 여부(설치 승인 필요) |
| R-3 | 트레이 메뉴 번역 | 요구는 「설정 창 전체 문구」라 트레이(Rust 메뉴 3항목)는 한국어로 남는다 | 필요하면 별도 요구로 |
| R-4 | 잠금 해제 경로 | 위치 잠금 중에는 오버레이를 클릭할 수 없어 설정 창(트레이 → 설정 열기)에서만 푼다 | 현행 유지(트레이 메뉴 추가는 요구 밖) |
| R-5 | CORE-001 설정 저장(삭제 후 rename)·CORE-002 PNG 제자리 덮어쓰기 | 「이미지 변경」이 주 기능이 되면 저장 도중 실패 시 파일 손상 위험이 커진다 | 원자적 교체로 고치는 별건 core 작업 승인 여부 |
| R-6 | 일본어·영어 문구 검수 | 번역 품질은 사용자 확인이 필요하다 | ui 설계 후 확정 문구 표 검수 |
| R-7 | 캔버스 크기 교체 불편 | 다른 크기 캐릭터로 바꾸려면 캔버스 그림(배경·키보드 전부)을 하나씩 비워야 한다 | 「전체 비우기」 같은 기능은 요구 밖 — 필요하면 요구로 |

## 6. 종단간 RTM

| 요구 | 요구 요지 | ui | bridge | core | 설정 키 | 테스트 | 상태 |
|---|---|---|---|---|---|---|---|
| SV2-01 | 3탭·카드·알약 탭·초록·토글 | `index.tsx` 탭 바, `GeneralTab`·`ImagesTab`·`MousePartsTab`, 설정 창 CSS | - | - | - | vitest 탭 전환·기본 탭, 스크린샷 | 설계 |
| SV2-02 | 언어 3개 국어 | `i18n/{ko,ja,en}.ts`, `MessagesProvider`, 오류 code→문구, `<html lang>` | `Settings.language`, `pickPngFile(title)`, `setSettingsWindowTitle`(D-6) | `settings::Language` 저장·관용 읽기 | `language` | vitest 사전 키 동일성·언어 전환 / cargo 알 수 없는 값→ko | 설계 |
| SV2-03 | 위치 잠금 | `GeneralTab` 토글 → `setSettings` | `Settings.positionLock`, `set_settings` 4단계 적용 | `window::apply_overlay_settings` → `set_ignore_cursor_events`, 시작 시 적용 | `positionLock` | cargo 적용 호출 / 수동: 켜면 클릭 통과·끌기 불가, 재시작 후 유지 | 설계 |
| SV2-04 | 작업표시줄 표시 | `GeneralTab` 토글 | `Settings.showInTaskbar`, `set_settings` 4단계 | `window` → `set_skip_taskbar(!show)`, 시작 시 적용 | `showInTaskbar` | 수동: 버튼 생김·사라짐, 숨김→표시 후 유지 | 설계 |
| SV2-05 | 자동 실행(작업 스케줄러·관리자) | `GeneralTab` 토글, pending·취소 처리 | `set_autostart` async, 취소 에러 코드, `set_settings` autostart 무시, `autostart:default` 삭제 | `tray::autostart`(schtasks + XML), `hook` 승격 래퍼(D-4), 시작 시 조회 보정 | `autostart` | cargo XML 생성·인자 이스케이프 단위 테스트 / 수동: UAC 수락·취소, 재로그온 후 관리자 실행 | 설계 |
| SV2-06 | 위치 초기화 | `GeneralTab` 버튼 | `reset_overlay_position` 신규 | `window::default_overlay_position` + 이동·저장 | `overlay.x/y` | cargo 기본 위치 / vitest 호출 / 수동 | 설계 |
| SV2-07 | 이미지 설정 4그룹 카드 | `ImagesTab`, `ImageSlotCard`, 확인 대화상자 | `import_asset`·`remove_asset`·`pickPngFile`(기존), `AssetEntry.url` 버전 | `assets` url 버전 쿼리 | - | vitest 카드 목록·버튼 흐름·오류 / cargo url 버전 변경 / 수동: 교체 즉시 미리보기·오버레이 갱신 | 설계 |
| SV2-08 | 필수 규칙 변경, idle·rest 폴백 | 카드 「필수/선택」 표시(`REQUIRED_SLOTS`) / 오버레이 코드 변경 없음 | `REQUIRED_SLOTS` 상수, 계약 §3.1 문구 | 문서주석만(`assets/mod.rs:21`, `slot.rs:8`, assets.md) | - | vitest 필수 3장 표시 / 오버레이 회귀 TC(idle·rest 없음 → 상태 레이어 없음, kb_up 보임) | 설계 |
| SV2-09 | 어깨축·손 위치 탭 | `MousePartsTab` 재사용, 문구만 사전 | - (기존) | - | `mouse.*` | 기존 TC 전부 통과(회귀) | 설계 |
| SV2-10 | 제외 항목 미구현 | 크기 4단 버튼·흔들림·항상 위·머리글·닫기·설명서·프리셋 없음 | - | - | - | vitest 부재 확인 1건 | 설계 |
| SV2-11 | 배율 슬라이더 25~200% (D-7) | `GeneralTab` 슬라이더(놓을 때 1회 저장), Ctrl+휠 변경은 `settings://changed`로 따라감 | `set_settings`·`settings://changed`(기존, 변경 없음) | `settings::validate` 0.25~2 · `window::resize_overlay`(기존) | `scale` | vitest 슬라이더→`setSettings`·범위·표시 % / cargo 기존 검증 테스트 | 설계 |
| SV2-12 | 유휴 시간 (D-7) | `GeneralTab` 분 단위 입력(초로 저장) | `set_settings`(기존) | `settings::validate` ≥1초(기존) | `idleSeconds` | vitest 분↔초 변환·범위 밖 거부 | 설계 |

끊긴 곳 0. `-` = 해당 없음.

## 7. 비기능 목표와 측정

| 항목 | 목표 | 측정 |
|---|---|---|
| UAC 대기 중 응답성 | 권한 창이 떠 있는 동안 오버레이 애니메이션·설정 창 입력이 멈추지 않음 | 수동: UAC 창을 10초 띄워 두고 오버레이 키 반응 확인 |
| 자동 실행 앱의 입력 지연 | 작업 우선순위가 보통(Normal) — 작업 스케줄러 기본값 7(Below Normal) 금지 | `Get-Process kuro_keyviewer` PriorityClass = Normal |
| 언어 전환 | 선택 즉시(다음 렌더) 전체 문구 교체, 재시작 불필요 | vitest |
| 이미지 교체 반영 | 「이미지 변경」 성공 후 1프레임 안에 설정 창 카드·오버레이 모두 새 그림 | 수동 + vitest(url 변경 시 src 교체) |
| 설정 파일 호환 | 옛 settings.json(새 키 없음)으로 시작해도 모든 값 보존 | cargo 테스트(옛 JSON 픽스처) |

## 8. 새 의존성

| 구분 | 항목 | 이유 | 승인 |
|---|---|---|---|
| 새 크레이트·npm·플러그인 | **없음** | i18n은 사전 객체, 작업 스케줄러는 OS 기본 `schtasks.exe`, 파일 선택은 기존 plugin-dialog | - |
| 기존 크레이트 기능 추가 | `windows` 0.58 feature `Win32_UI_Shell` | D-4 A안(`ShellExecuteExW` runas) | **승인됨(2026-09-24)** — `Cargo.toml`은 메인 세션이 수정 |
| 제거 | `tauri-plugin-autostart`(Cargo), `@tauri-apps/plugin-autostart`(npm, src 사용처 0), capability `autostart:default` | 작업 스케줄러로 교체 후 쓰지 않음 | **승인됨(2026-09-24)** — 코드 사용처 제거 = core(`lib.rs` 초기화)·bridge(`commands.rs` 호출) 구현자, 패키지·capabilities 파일 = 메인 세션 |
| capability 추가 | `core:window:allow-set-title`(settings 창 한정) | D-6 | 확정 — capabilities 파일은 메인 세션 |
| 선택(미결) | `tauri-plugin-single-instance` | 자동 실행 + 수동 실행이 겹치면 훅·오버레이가 두 벌 뜸(요구 밖 — 확인 필요) | 채택 시 설치 승인 필요 |

## 9. 인계 순서

core(`settings-v2-03-packet-core.md`) → bridge(`settings-v2-03-packet-bridge.md`) → ui(`settings-v2-03-packet-ui.md`). 결정 사항 D-1~D-10은 2026-09-24 모두 확정(§5) — 착수를 막는 결정은 없다. core 착수 전 메인 세션이 `Cargo.toml`에 `Win32_UI_Shell`을 넣는다. 미결로 남는 것은 §5.1(요구 밖 권고)뿐이며 R-1(보안)은 메인 세션이 사용자에게 알린다. ui 작업 중 계약을 되돌려야 하면 이 아키텍트 세션으로 돌아와 이 문서를 다시 연다.
