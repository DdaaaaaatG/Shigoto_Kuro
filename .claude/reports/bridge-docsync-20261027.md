# bridge 감사 — doc-sync 3자 대조 (contract v1.1) (2026-10-27 16:58)

감사자: bridge-analyst · 범위: 계약 전체(command·event·타입·에러 code) + 경계 + 이전 openItem 2건 · 기준 커밋: 255d46c(직전 doc-sync) → HEAD(09f4cae)

## 0. 요약 (결론 먼저)

| 항목 | 결론 |
|---|---|
| 계약↔Rust↔TS 불일치(런타임) | **0건** — command 30/30/30, event 7/7/7, 타입 필드·optional·camelCase 일치, 에러 code 일치 |
| 계약 문서 뒤처짐(HIGH) | **0건** — v1.1 `set_resting` 의미 변경이 계약 §3.9·§5·§5.8·§6.2·§8·§9와 Rust 주석·테스트·TS JSDoc에 모두 반영됨 |
| 소스 주석 낡음(LOW) | **4건** — BRG-001~004 (판 번호 2, 핸들러 수 1, 낡은 파일 경로 1). 런타임 영향 없음 |
| 경계 위반 | **0건** — 화면 코드의 `@tauri-apps/api` import·직접 `invoke`/`listen` 없음. `src/main.tsx` 창 라벨 조회는 §5.4 예외 |
| tauri.conf.json 변경 | 버전 0.5.0 → 0.6.0 한 줄뿐(확인). capabilities 변경 없음 |
| bridge-manager 인계 | BRG-001~004(전부 LOW, 주석만). 확인 필요 2건(§5) |

## 1. 현황

- 계약 버전: **v1.1** (`doc/200_설계/bridge/contract.md:3`, 2026-10-24, 비파괴)
- command: 계약 §5 표 30 · Rust `#[tauri::command]` 30(`commands/mod.rs` 23 + `commands/presets.rs` 7) · `lib.rs` `generate_handler!` 등록 30(`src-tauri/src/lib.rs:164-193`) · TS `call('…')` 30
- event: 계약 §4 표 7 · `src-tauri/src/bridge/events.rs:16-25` 상수 7 · `src/bridge/events.ts` `EVENTS` 7
- 타입: TS interface 28개(`src/bridge/types.ts`) ↔ Rust 구조체(core 정의, `src-tauri/src/bridge/types.rs:45-60` 재수출)
- 구현 상태: Rust·TS 모두 있음
- 255d46c 이후 bridge 관련 커밋: ba352b4 1건(`git log 255d46c..HEAD -- src/bridge src-tauri/src/bridge doc/200_설계/bridge src-tauri/capabilities src-tauri/src/lib.rs`)

## 2. 셋 대조표

### 2.1 command (이름·등록)

| 계약 command | Rust(파일:줄) | TS(`src/bridge/commands.ts`:줄) | 판정 |
|---|---|---|---|
| get_settings | commands/mod.rs:157 | 48 | 일치 |
| set_settings | commands/mod.rs:175 | 49 | 일치 |
| get_asset_manifest | commands/mod.rs:239 | 52 | 일치 |
| import_asset | commands/mod.rs:251 | 54 | 일치 |
| remove_asset | commands/mod.rs:268 | 55 | 일치 |
| restore_default_asset | commands/mod.rs:285 | 62 | 일치 |
| export_default_assets | commands/mod.rs:308 | 70 | 일치 |
| get_hand_anchor | commands/mod.rs:324 | 76 | 일치 |
| get_screen_bounds | commands/mod.rs:334 | 79 | 일치 |
| get_monitors | commands/mod.rs:343 | 85 | 일치 |
| get_overlay_position | commands/mod.rs:353 (`-> Result<Point, BridgeError>`, 계약 §3.4 Position = window::Point) | 86 | 일치 |
| set_overlay_position | commands/mod.rs:360 | 88 | 일치 |
| set_overlay_visible | commands/mod.rs:378 | 90 | 일치 |
| reset_overlay_position | commands/mod.rs:398 | 95 | 일치 |
| set_autostart (async) | commands/mod.rs:419 | 101 | 일치 |
| open_settings_window | commands/mod.rs:446 | 102 | 일치 |
| get_alarm_sound | commands/mod.rs:457 | 116 | 일치 |
| import_alarm_sound | commands/mod.rs:472 | 120 | 일치 |
| remove_alarm_sound | commands/mod.rs:492 | 123 | 일치 |
| get_timer | commands/mod.rs:506 | 106 | 일치 |
| control_timer | commands/mod.rs:516 | 108 | 일치 |
| **set_resting (v1.1)** | commands/mod.rs:548 `(app, state, resting: bool) -> Result<TimerSnapshot, BridgeError>` | 111 `setResting(resting: boolean)` | 일치 — 시그니처 불변, 의미 주석 v1.1 반영 |
| reset_app_data | commands/mod.rs:656 | 134 | 일치 |
| list_presets | commands/presets.rs:102 | 138 | 일치 |
| save_preset | commands/presets.rs:109 | 140 | 일치 |
| apply_preset | commands/presets.rs:124 | 142 | 일치 |
| export_preset | commands/presets.rs:179 | 145 | 일치 |
| import_preset | commands/presets.rs:193 | 147 | 일치 |
| rename_preset | commands/presets.rs:205 | 149 | 일치 |
| delete_preset | commands/presets.rs:218 | 150 | 일치 |

### 2.2 event

| 계약 §4 | Rust `events.rs` | TS `events.ts` `EVENTS` | 판정 |
|---|---|---|---|
| `input://keyboard` | :16 EVENT_KEYBOARD | keyboard | 일치 |
| `input://mouse-move` | :17 | mouseMove | 일치 |
| `input://mouse-button` | :18 | mouseButton | 일치 |
| `settings://changed` | :19 | settingsChanged | 일치 |
| `assets://changed` | :20 | assetsChanged | 일치 |
| `assets://hand-anchor-changed` | :22 | handAnchorChanged | 일치 |
| `timer://changed` | :25 | timerChanged | 일치 |

- 운영 코드(Rust·TS)에서 상수 정의 파일 밖의 이벤트 이름 리터럴: **0건**. 테스트 mock의 재기입은 §5 확인 필요 1.

### 2.3 타입 필드 (스크립트로 TS interface ↔ Rust struct 필드명 camelCase 변환 비교, 계약 TS 블록과도 비교)

| 타입 | 필드 집합 TS=Rust | camelCase | optional | 비고 |
|---|---|---|---|---|
| CanvasSize · AssetEntry · AssetManifest | 일치 | O | 일치 | 계약 §3.2는 canvas를 인라인 객체로 표기(모양 동일) |
| ExportFailure · ExportReport | 일치 | O | 일치 | |
| Point · OverlaySettings · MouseSettings · Settings | 일치 | O | 일치 | 계약 §3.3은 overlay·mouse를 인라인 표기(모양 동일) |
| TimerSettings | 일치 | O(`settings/timer.rs:54`) | TS `mode?`·`countdownSecs?`·`alarmVolume?` ↔ Rust 필수 | 계약 §3.3이 「선택 필드, Rust 항상 직렬화·관대한 역직렬화」로 명시 허용 — 위반 아님 |
| TimerSnapshot | 일치 | O | TS `mode?`·`durationMs?` ↔ Rust 필수 | 계약 §3.9(contract.md:797-801) 「Rust는 항상 보낸다. 없으면 기본값」으로 명시 허용 — 위반 아님 |
| TimerStatus | `'restPaused'` 포함 5값 | O | — | v1.1 주석 계약(:791)·TS(types.ts:250) 동기 |
| BridgeError · AlarmSound | 일치 | O | 일치 | |
| KeyboardInputEvent · MouseMoveEvent · MouseButtonEvent · HandAnchorEvent | 일치(Rust `*Payload`, events.rs) | O | 일치 | |
| ScreenBounds · Position | 일치 | O | 일치 | Position = `window::Point`(계약 §3.4 명시) |
| PresetPreviewLayer · PresetPreview · PresetSummary · PresetProblem · PresetImportReport · PresetExportResult | 일치 | O | 일치 | 계약 §3.11은 `type =` 별칭 표기(모양 동일) |

### 2.4 에러 code

- 계약 §6 표 code 44개 ↔ Rust 문자열 리터럴(`영역.사유` 패턴) 비교 결과 차이 3건, 모두 위반 아님:
  - `autostart.cancelled` — 계약 §6(contract.md:1504)에서 v0.22 폐기(취소선) 표시, Rust는 주석에만 남음(`bridge/types.rs:63`). 일치.
  - `window.reload_failed` — `src-tauri/src/tray/mod.rs:276`. 계약 §5.10 9단계(contract.md:1330)가 「경고 로그, command code로 노출하지 않는다」로 명시, `reset_app_data`는 `log::warn!`으로 삼킴(`commands/mod.rs:716-718`). 일치.
  - `settings.json` — 파일 이름 리터럴(오탐).
- `set_resting` 발생 code: 계약 §5 `state.poisoned` · §6.2(contract.md:1548) `state.poisoned` · Rust `lock_timer(&state)?`(commands/mod.rs:554). 일치.

### 2.5 v1.1 반영 확인 (ba352b4)

| 위치 | 내용 | 판정 |
|---|---|---|
| contract.md:3·5 | 머리 버전 v1.1, (v1.1) 줄 | 반영 |
| contract.md:845·1046·1216-1226·1245·1251 | 옛 「카운트다운 항상 변화 없음」은 취소선, v1.1 「두 모드 공통」 문장 병기 | 반영 |
| contract.md:1666·1678-1684 | §8 v1.1 행, §9 RD-01~RD-03 | 반영 |
| commands/mod.rs:543-545 | `set_resting` 문서 주석 RD-01·RD-02(v1.1) | 반영 |
| commands/tests.rs:238-271 | `set_resting_countdown_pauses_and_resumes`·`set_resting_countdown_finished_noop` (옛 `set_resting_countdown_noop` 제거) — 계약 :1251 테스트 이름과 일치 | 반영 |
| commands.ts:109-111 · types.ts:250 | JSDoc (v1.1) | 반영 |
| 옛 문구 잔존 grep(`항상 변화 없음`·`스톱워치 전용`) | `src/bridge`·`src-tauri/src/bridge` 0건 | 깨끗 |

## 3. 위반 목록

런타임 불일치(CRITICAL)·계약 뒤처짐(HIGH)·경계(HIGH)·리터럴 재기입(MEDIUM, 운영 코드) **0건**. 아래는 전부 소스 머리 주석의 낡은 기재(LOW, 런타임 영향 없음)다. **bridge-manager 인계 항목.**

[BRG-001][LOW] TS 타입 파일 머리 주석 판 번호 낡음 (이전 openItem — 미해소)
  위치: `src/bridge/types.ts:2` · 근거: `bridge 계약 타입 (v0.29) — doc/200_설계/bridge/contract.md 와 … 의 TS 쪽 거울.` · 현행값: 계약 **v1.1**(contract.md:3). 이 파일은 v0.30(프리셋 타입 4개, types.ts:369-397)·v0.31(`PresetSummary.preview`, types.ts:349-375)·v1.1(JSDoc, :250) 변경을 이미 담고 있다 · 기준: 스킬 「계약↔TS 일치」(판 번호 표기) · 조치 방향: 머리 판 번호가 실제 반영 판보다 2단계 이상 뒤처짐.

[BRG-002][LOW] Rust 타입 파일 머리 주석 판 번호 낡음 (이전 openItem — 미해소)
  위치: `src-tauri/src/bridge/types.rs:1` · 근거: `//! bridge 계약 타입 표면 (v0.28 — contract.md §3).` · 현행값: 계약 **v1.1**. 이 파일은 v0.30 프리셋 타입 재수출(`types.rs:50-53` `PresetExportResult … PresetSummary, NAME_MAX_CHARS`)을 이미 담고 있다 · 조치 방향: 같은 사유.

[BRG-003][LOW] bridge 모듈 머리 주석 핸들러 수·구성 낡음 (이전 openItem — 미해소)
  위치: `src-tauri/src/bridge/mod.rs:5` · 근거: `commands/(invoke 핸들러 22개 — mod.rs·tests.rs, v0.3 get_hand_anchor·… v0.23 … remove_alarm_sound 포함, …)` · 현행값: 핸들러 **30개**(`commands/mod.rs` 23 + `commands/presets.rs` 7, `grep -c "#[tauri::command"`; `lib.rs:164-193` 등록 30). 나열에서 v0.16 `restore_default_asset`·`export_default_assets`, v0.25 `reset_app_data`, v0.30 프리셋 7개가 빠졌고, 구성 파일 목록에 `presets.rs`(및 `presets/` 하위 테스트)가 없다 · 조치 방향: 수·나열·파일 목록이 실물과 다름.

[BRG-004][LOW] TS command 래퍼 머리 주석의 Rust 파일 경로가 없는 파일을 가리킴 (신규)
  위치: `src/bridge/commands.ts:3` · 근거: `명령 이름·인자는 src-tauri/src/bridge/commands.rs 와 1:1` · 현행값: `src-tauri/src/bridge/commands.rs`는 없다. 실물은 `src-tauri/src/bridge/commands/mod.rs` + `commands/presets.rs` · 조치 방향: 참조 경로가 실물과 다름.

## 4. 확장 지점

요청 없음 — 생략.

## 5. 확인 필요 (사용자 판단)

1. **테스트 mock의 이벤트 이름 리터럴 재기입.** `src/overlay/test/*.test.tsx`·`src/settings/test/*.test.tsx` 21개 파일이 `vi.mock('bridge/events', …)` 팩토리 안에 `EVENTS` 객체를 문자열로 다시 적는다(예: `src/overlay/test/OverlayApp.test.tsx:67-72`, `src/settings/test/SettingsApp.test.tsx:83-89`). 계약 §4(contract.md 「이벤트 이름 상수는 … 한 곳씩에만 정의한다. 다른 파일에서 문자열 리터럴 재기입 금지」)를 테스트 파일에도 적용하는지 계약이 명시하지 않는다. 운영 코드는 0건이라 런타임 위험은 없다. 일부 mock은 `timerChanged`를 빠뜨려 7개 중 6개만 적는다(예: `OverlayApp.test.tsx:67-72`) — 해당 테스트가 타이머 구독을 쓰지 않는다면 무해. 위반으로 셀지 판단 필요.
2. **`src-tauri/src/bridge/commands/mod.rs:1` 「invoke 23개」.** 이 파일 자체의 `#[tauri::command]` 수는 23으로 **파일 기준으로는 정확**하다. 다만 `commands/mod.rs`는 `commands` 모듈 루트이므로 모듈 전체(30개, `presets` 하위 모듈 7개 포함)를 뜻한다고 읽으면 낡았다. 나열에 v0.30 프리셋 언급도 없다. 어느 뜻으로 읽을지에 따라 정상/LOW가 갈린다 — 이전 openItem의 「23개(실제 30?)」 질문에 대한 답: **파일 내 23 정확, 모듈 전체 30.**

### 부록 — 경계 grep 결과

- `grep -rn "@tauri-apps/" src --include=*.ts --include=*.tsx`(`src/bridge/` 밖·테스트 제외): `src/main.tsx:11` `import { getCurrentWindow } from '@tauri-apps/api/window'` 1건 — contract §5.4 진입점 예외(v1.0 명문화). 위반 0.
- 테스트 파일의 `@tauri-apps/*`는 전부 `vi.mock('@tauri-apps/api/core'|'event'|'window', …)`·`vi.mock('@tauri-apps/plugin-dialog', …)` 차단용 mock(직접 사용 아님).
- `src/overlay`·`src/settings`·`src/components`·`src/state`·`src/main.tsx`(테스트 제외)의 단어 `invoke`·`listen`: 0건.
- `git diff 255d46c..HEAD -- src-tauri/tauri.conf.json`: `"version": "0.5.0"` → `"0.6.0"` 한 줄. `src-tauri/capabilities/` 변경 없음.
