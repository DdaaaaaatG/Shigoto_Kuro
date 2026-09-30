# presets 인계 패킷 — bridge

- 받는 세션: `claude --agent bridge-manager` (작업 모드: **보강**)
- 전반 설계: `doc/200_설계/architecture/presets-02-design.md`(§3.6 뒤처리·§4 계약 변경 목록). 이 패킷과 어긋나면 02-design이 맞다.
- 전략: `bridge-design-strategy`(명명·에러 형태·호환성 분류·capabilities 최소 권한 — 여기서 재정의하지 않는다), `.claude/skills/rust-rules.md`·`ts-rules.md`, golden-principles(파일 800/400줄·함수 50줄).
- 순서: bridge-designer가 `contract.md` v0.30 개정 → bridge-implementer가 Rust 핸들러 + TS 래퍼·타입 구현 → (사용자 승인 뒤) core-implementer가 `lib.rs` `generate_handler!` 7줄 등록(§6).

## 선행 조건

- **core 패킷 완료 마커**: `src-tauri/src/presets/` 공개 API 7개(`list`·`save`·`apply`·`export_to`·`import_from`·`rename`·`delete`), `PresetError::{code, may_have_changed}`, 타입 `PresetSummary`·`PresetProblem`·`PresetImportReport`·`PresetExportResult`·`AppliedPreset`, `AppPaths::presets_dir()` — `cargo test` PASS.
- 새 의존성 없음. capabilities·`tauri.conf.json` 변경 없음.

## 요구ID

PS-01(save·list), PS-04(apply + 뒤처리), PS-05(export), PS-06(import 보고서), PS-07(rename·delete), PS-08(방어 code), PS-09(list 소비), 호출 창 제한 A-5.

## 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `doc/200_설계/bridge/contract.md` | **v0.30**: 머리말 줄, §3.11 신설(타입 4·상수 1), §5 표 7행, §5.11 신설(규칙·뒤처리·호출 창 제한 일반화·테스트), §6 code 13개(27 → 40)·§6.1 `PresetError` 행·§6.2 7행, §7 v0.30 메모(권한 불변), §8 이력 행, §9 ui 인계 |
| `src-tauri/src/bridge/commands/presets.rs` (**신규**) | 핸들러 7개 + `do_*` 순수 함수 + 적용 뒤처리 `reapply_after_preset` |
| `src-tauri/src/bridge/commands/mod.rs` | `pub mod presets;` 1줄, `ensure_reset_caller` → 일반화 `ensure_settings_caller`(아래 §3) — **`reset_app_data` 동작·code·message 불변**. 파일이 709줄이라 핸들러는 여기 넣지 않는다 |
| `src-tauri/src/bridge/types.rs` | 프리셋 타입 재노출(타이머 선례), `impl From<PresetError> for BridgeError`(ResetError 선례 — `error.rs`는 core 가드 대상) |
| `src-tauri/src/bridge/commands/tests.rs` (또는 `presets` 전용 테스트 파일) | §5 cargo 테스트 |
| `src/bridge/types.ts` | 타입 4·`PRESET_NAME_MAX` |
| `src/bridge/commands.ts` | 래퍼 7개(기존 `call<T>` 패턴) |
| `src/bridge/__tests__/commands.test.ts` · `types.test.ts` | §5 vitest |
| `src-tauri/src/lib.rs` | `generate_handler!`에 7줄 — **core 소유 파일, bridge-implementer 가드 대상** → §6 절차 |

## 1. 계약 v0.30 — 타입 (§3.11 신설)

```ts
/** 프리셋 목록 카드(PS-01·PS-09). savedAt = Unix ms(로컬 날짜로 표시는 ui 몫). */
export type PresetSummary = {
  id: string
  name: string
  savedAt: number
  imageCount: number
  hasAlarm: boolean
}
/** 가져오기 파일별 문제(PS-06). code = 기존 asset.*·sound.* 또는 preset.file_missing·preset.file_link·
 *  preset.missing_required·preset.io. fileName = 폴더 안 파일 이름(경로 없음). */
export type PresetProblem = { fileName: string; code: string }
/** 불변식: preset !== null ⇔ problems.length === 0. 문제가 있으면 아무것도 등록되지 않았다. */
export type PresetImportReport = { preset: PresetSummary | null; problems: PresetProblem[] }
export type PresetExportResult = { folderName: string }
/** Rust presets::NAME_MAX_CHARS와 1:1(U-7). 앞뒤 공백 제거 후 1~50자, 제어 문자 금지(판정은 core). */
export const PRESET_NAME_MAX = 50
```

Rust 쪽은 core 타입을 그대로 재노출한다(`crate::presets::{PresetSummary, PresetProblem, PresetImportReport, PresetExportResult}` — 모두 `Serialize`, camelCase). `PresetProblem.code`는 Rust `&'static str` → JSON 문자열.

`preset.json` 폴더 형식(02-design §2.1)은 **계약이 아니다**(IPC가 아닌 파일 형식 — core 소유). 계약서에는 링크만 둔다.

## 2. 계약 v0.30 — command (§5 표 7행 + §5.11)

모두 **동기** `#[tauri::command] pub fn`(계약 §5.10 C-4 불변식 — 앱 데이터를 쓰는 command는 동기). 이벤트 추가 없음.

| command | JS 인자 | 반환 | 부수 효과 | 에러(§6.2) | 호출 창 |
|---|---|---|---|---|---|
| `list_presets` | 없음 | `PresetSummary[]` | 없음 | `preset.io` | 제한 없음 |
| `save_preset` | `{ name }` | `PresetSummary` | `presets/{새 id}/` 생성. 이벤트 없음 | `preset.forbidden`, `preset.invalid_name`, `preset.missing_required`, `preset.io`, `state.poisoned` | settings |
| `apply_preset` | `{ id }` | `void` | `assets/*`·`settings.json` 교체 → 뒤처리 §2.1 | `preset.forbidden`, `preset.not_found`, `preset.format`, `preset.invalid_settings`, `preset.damaged`, `preset.io`, `settings.io`, `state.poisoned` | settings |
| `export_preset` | `{ id, dir }` | `PresetExportResult` | 사용자 폴더에 `{이름}/` 생성. 이벤트 없음 | `preset.forbidden`, `preset.not_found`, `preset.format`, `preset.bad_dir`, `preset.export_exists`, `preset.io` | settings |
| `import_preset` | `{ dir }` | `PresetImportReport` | 문제 없으면 `presets/{새 id}/` 생성. 이벤트 없음. **파일별 문제는 reject가 아니라 `problems`** | `preset.forbidden`, `preset.bad_dir`, `preset.not_preset`, `preset.format`, `preset.invalid_name`, `preset.invalid_settings`, `preset.io` | settings |
| `rename_preset` | `{ id, name }` | `PresetSummary` | `preset.json` 이름만. 이벤트 없음 | `preset.forbidden`, `preset.not_found`, `preset.invalid_name`, `preset.format`, `preset.io` | settings |
| `delete_preset` | `{ id }` | `void` | 폴더 삭제. 이벤트 없음 | `preset.forbidden`, `preset.not_found`, `preset.io` | settings |

- 판정: 7개 모두 **신규**. 기존 command에 얹을 수 있는 것이 없다 — `import_asset`·`reset_app_data`는 슬롯 하나·전체 초기화라는 다른 범위이고, 얹으면 기존 의미가 바뀐다(스킬 「확장 vs 신규」).
- 새 이벤트 없음 근거(02-design §4 event 행): 목록 소비자는 설정 창 하나뿐이고 바꾸는 주체도 그 창의 command뿐. 적용의 화면 반영은 기존 이벤트 재방출.

### 2.1 `apply_preset` 처리 순서 (02-design §3.6, `reset_app_data` §5.10 선례)

```rust
#[tauri::command]
pub fn apply_preset(app: AppHandle, caller: tauri::WebviewWindow, state: State<'_, AppState>, id: String)
    -> Result<(), BridgeError>
```

| # | 단계 | 실패 시 |
|---|---|---|
| 0 | `ensure_settings_caller(caller.label(), PRESET_FORBIDDEN)?` | `preset.forbidden` — 아무것도 안 함 |
| 가 | `let old_timer = lock_settings(&state)?.timer.clone();` — **문장 끝에서 잠금 해제**(나의 `settings::update`와 교착 방지) | `state.poisoned` 즉시 반환 |
| 나 | `presets::apply(&state.paths, &id, &state.settings)` | `Err(e)` && `!e.may_have_changed()` → `Err(e.into())` 즉시(디스크 불변, 이벤트 없음). `may_have_changed()` → 1~6 뒤 `Err(e.into())` |
| 1 | `fin = lock_settings(&state)?.clone()`, `manifest` = 나의 `AppliedPreset.manifest`(실패 경로는 `load_manifest_or_warn`) | `state.poisoned` |
| 2 | `events::emit_settings_changed(&app, &fin)` | 경고 로그만 |
| 3 | `events::emit_assets_changed(&app, &manifest)` — 2 뒤 고정 | 경고 로그만 |
| 4 | `window::resize_overlay(&app, manifest.canvas, fin.scale)` — 항상(캔버스·배율 둘 다 바뀔 수 있다, §5.2) | 경고 로그만 |
| 5 | `super::refresh_hand_anchor(&app, &state, &manifest, fin.mouse.as_ref())` — 항상 | 경고 로그만 |
| 6 | `super::apply_timer_config_side_effect(&app, &state, &old_timer, &fin.timer)` | 헬퍼가 처리 |
| 다 | 나의 결과 반환 | — |

- 뒤처리 1~6은 비공개 `fn reapply_after_preset(app, state, fin, manifest, old_timer)`로 묶는다(`reapply_after_reset`과 같은 모양, 50줄 이하). 부모 모듈 비공개 헬퍼(`lock_settings`·`load_manifest_or_warn`·`refresh_hand_anchor`·`apply_timer_config_side_effect`)는 자식 모듈에서 `super::`로 부를 수 있다 — 복사하지 않는다.
- `window::apply_overlay_window`·`reset_overlay_position`·`tray::refresh_overlay`는 **부르지 않는다**(PS-03 필드 불변, U-6 = A). U-6이 B로 결정되면 6 뒤에 `tray::refresh_overlay` 한 단계만 더한다.
- 2·3 emit 실패는 `set_settings`와 달리 경고 로그만(`reset_app_data`와 같은 이유 — 디스크는 이미 바뀌었고 4~6은 끝까지 해야 한다). 그래서 `tauri.error`는 발생 code가 아니다.

### 2.2 나머지 핸들러 (얇게 — 인자 변환 → core 호출 → 에러 변환)

```rust
#[tauri::command] pub fn list_presets(state: State<'_, AppState>) -> Result<Vec<PresetSummary>, BridgeError>;
#[tauri::command] pub fn save_preset(caller: tauri::WebviewWindow, state: State<'_, AppState>, name: String) -> Result<PresetSummary, BridgeError>;
#[tauri::command] pub fn export_preset(caller: tauri::WebviewWindow, state: State<'_, AppState>, id: String, dir: String) -> Result<PresetExportResult, BridgeError>;
#[tauri::command] pub fn import_preset(caller: tauri::WebviewWindow, state: State<'_, AppState>, dir: String) -> Result<PresetImportReport, BridgeError>;
#[tauri::command] pub fn rename_preset(caller: tauri::WebviewWindow, state: State<'_, AppState>, id: String, name: String) -> Result<PresetSummary, BridgeError>;
#[tauri::command] pub fn delete_preset(caller: tauri::WebviewWindow, state: State<'_, AppState>, id: String) -> Result<(), BridgeError>;
```

- 각 핸들러 = `ensure_settings_caller`(list 제외) → `do_*` 순수 함수. `do_*`는 tauri 타입을 받지 않는다(경로·문자열·`&Mutex<Settings>`·`now_ms`) — cargo 단위 테스트 대상(§5.7 선례).
- `now_ms` = `SystemTime::now().duration_since(UNIX_EPOCH)` ms(실패하면 0 — 시계가 1970 이전일 리 없지만 panic 금지).
- 문서주석 `/// [계약] contract.md §5·§5.11 {이름} [요구] PS-xx [에러] … [부수효과] …`(기존 형식).
- `generate_handler!` 경로는 하위 모듈 전체 경로 `bridge::commands::presets::list_presets` 등(명령 매크로가 만드는 숨은 항목 때문에 `pub use` 재노출로는 등록하지 않는다).

## 3. 호출 창 제한 일반화 (A-5)

```rust
/// (v0.30) settings 창에서만 허용하는 command의 0단계. label == window::SETTINGS_LABEL이면 Ok.
/// message에 라벨·경로를 넣지 않는다.
fn ensure_settings_caller(label: &str, code: &'static str, message: &'static str) -> Result<(), BridgeError>;
/// 기존 함수는 위임만 — reset.forbidden·문구 불변(기존 테스트 ensure_reset_caller_allows_settings_only 그대로 통과).
fn ensure_reset_caller(label: &str) -> Result<(), BridgeError> {
    ensure_settings_caller(label, "reset.forbidden", "전체 초기화는 설정 창에서만 할 수 있습니다.")
}
```

- 프리셋: code `preset.forbidden`, message 「프리셋은 설정 창에서만 바꿀 수 있습니다.」. `presets.rs`는 `super::ensure_settings_caller`를 쓴다(mod.rs 안에서 `pub(super)` 불필요 — 자식은 부모 비공개 항목 접근 가능).
- `list_presets`는 읽기 전용이라 제한하지 않는다.

## 4. 에러 code (§6 — 27 → 40, 전부 「추가」)

| code | 발생 | message(실물 = core `PresetError` Display, 경로 없음) |
|---|---|---|
| `preset.forbidden` | 6개 command, 호출 창이 settings 아님(bridge 판정) | 프리셋은 설정 창에서만 바꿀 수 있습니다. |
| `preset.not_found` | id 규칙 위반·폴더 없음·링크 | 프리셋을 찾을 수 없습니다. |
| `preset.invalid_name` | 빈 이름·50자 초과·제어 문자 | 프리셋 이름은 1~50자여야 합니다. |
| `preset.missing_required` | `save_preset` — `kb_up`·`mouse_base` 없음(ui가 먼저 막는다). 가져오기 `problems`에도 쓰임 | 필수 그림(키보드 기본·팔)이 없어 프리셋을 만들 수 없습니다. |
| `preset.not_preset` | 가져오기 폴더에 `preset.json` 없음 | 프리셋 폴더가 아닙니다(preset.json이 없습니다). |
| `preset.format` | `preset.json` 형식·버전·슬롯·개수 | 프리셋 파일 형식이 올바르지 않습니다: {사유} |
| `preset.invalid_settings` | 프리셋 설정값 검증 실패 | 프리셋의 설정값이 올바르지 않습니다: {규칙} |
| `preset.damaged` | `apply_preset` — 저장된 프리셋 파일이 검사 불통과(디스크 불변) | 저장된 프리셋이 손상되었습니다: {파일 이름} |
| `preset.bad_dir` | 가져오기·내보내기 폴더가 절대 경로 아님·없음·폴더 아님·링크 | 폴더를 찾을 수 없습니다. |
| `preset.export_exists` | 내보낼 위치에 같은 이름 폴더가 이미 있음(U-3) | 같은 이름의 폴더가 이미 있습니다. |
| `preset.io` | 파일 읽기·쓰기 실패(적용은 되돌림 후) | 프리셋 파일을 읽거나 쓰지 못했습니다. |
| `preset.file_missing` | 가져오기 `problems` 전용 — 목록에 있는 파일 없음 | (보고서 code — message 없음) |
| `preset.file_link` | 가져오기 `problems` 전용 — 링크·재분석 지점·일반 파일 아님 | (보고서 code — message 없음) |

- §6.1 행: `presets::PresetError` → `e.code()` / `message: e.to_string()`, `Settings{source}` 변형은 `SettingsError` code 그대로(`settings.io`·`state.poisoned`). 위치 `src-tauri/src/bridge/types.rs`.
- `problems[].code`로 오는 기존 code: `asset.not_png`·`asset.bad_header`·`asset.not_rgba`·`asset.too_large`·`asset.too_many_bytes`·`asset.canvas_mismatch`·`sound.not_audio`·`sound.too_many_bytes`(모두 ui 사전에 이미 있음).
- ui 사전: `preset.forbidden`은 **추가 대상 아님**(`reset.forbidden` 선례 — 허용 창이 settings뿐). 나머지 12개는 ui가 추가(ui `ErrorCode` 27 → 39).

## 5. 수용 기준

cargo(`do_*` 순수 함수·tempdir — tauri 없이):
- `ensure_settings_caller_table`: `"settings"` → Ok. `"overlay"`·`""`·`"Settings"`·`"settings "` → Err, code = 넘긴 code, message에 입력 라벨 없음. 기존 `ensure_reset_caller_allows_settings_only` 그대로 PASS.
- `preset_error_maps_to_bridge_codes`: 변형별 code, `Settings{SettingsError::Io}` → `settings.io`, message에 tempdir 경로 문자열·`\\` 없음.
- `do_save_then_list_returns_summary`, `do_import_report_serializes_camel_case`(`{"preset":null,"problems":[{"fileName":"kb_up.png","code":"asset.not_rgba"}]}`), `do_export_returns_folder_name`, `do_rename_then_list_shows_new_name`, `do_delete_then_list_empty`, `do_apply_returns_manifest`(뒤처리 제외 — core 호출·에러 변환만).
- 뒤처리(emit·리사이즈·손 기준점·타이머)는 tauri 없이 테스트할 수 없다 → 수동 확인(dev 앱): 적용 뒤 오버레이 그림·크기·팔 위치·타이머 글자가 바로 바뀌고 설정 창 이미지·기본 설정·어깨축·타이머 탭 값이 바뀜. 창 위치·위치 잠금·작업표시줄·언어·자동 실행은 그대로.

vitest(`src/bridge/__tests__`):
- 래퍼 7개가 정확한 command 이름·인자 객체(`{name}`·`{id}`·`{id, dir}`·`{dir}`·`{id, name}`, `listPresets`는 인자 없음)로 `invoke`를 1회 부르고 반환을 그대로 resolve.
- reject `{code:'preset.export_exists', message}` → `BridgeError` 그대로.
- `PRESET_NAME_MAX === 50`.

증거: `cargo fmt --check`·`cargo clippy -- -D warnings`(0)·`cargo test`, `yarn tsc --noEmit`(exit 0)·`yarn test --run src/bridge`, 계약 ↔ Rust ↔ TS **셋 대조표**(타입 4 필드·command 7 인자·에러 13).

## 6. `lib.rs` 등록 (core 소유 파일)

`src-tauri/src/lib.rs` `generate_handler!` 끝에 7줄:

```rust
bridge::commands::presets::list_presets,
bridge::commands::presets::save_preset,
bridge::commands::presets::apply_preset,
bridge::commands::presets::export_preset,
bridge::commands::presets::import_preset,
bridge::commands::presets::rename_preset,
bridge::commands::presets::delete_preset,
```

- bridge-implementer는 가드로 이 파일을 못 쓴다(v0.21·v0.25 선례). bridge-manager가 **사용자 승인 후** core-implementer에 이 7줄만 위임한다(보강 모드 규칙). 등록 전까지 앱에서 호출 불가 — 완료 마커에 포함.

## 7. 하지 말 것

- 기존 command·event·타입·code의 이름·인자·반환·의미 변경 금지(이번 개정은 전부 「추가」). `BridgeError` 모양 변경 금지.
- core 모듈 내부(`src-tauri/src/presets/**`·`assets/**`·`settings/**`)·화면 코드(`src/settings/**`)·capabilities·`tauri.conf.json` 수정 금지.
- 새 이벤트 만들지 않는다. async command로 만들지 않는다(C-4).
- 핸들러에 로직(검증·경로 조립·파일 IO)을 넣지 않는다 — core 호출과 에러 변환만.
- `preset.json` 파일 형식을 계약서에 복제하지 않는다(core 설계 `doc/200_설계/core/presets.md` 링크만).

## 8. 완료 마커

- `contract.md` v0.30(머리말·§3.11·§5·§5.11·§6·§6.1·§6.2·§7·§8·§9).
- `src-tauri/src/bridge/commands/presets.rs`, `types.rs` 변환, `src/bridge/{types,commands}.ts` 반영, 테스트 PASS(수치 첨부).
- `lib.rs` 7줄 등록 완료(core-implementer) 또는 「등록 대기」 명시.
- 셋 대조표.
- ui 세션에 넘길 한 줄: 「래퍼 7개(`listPresets`·`savePreset`·`applyPreset`·`exportPreset`·`importPreset`·`renamePreset`·`deletePreset`)·타입 4·`PRESET_NAME_MAX`·에러 code 12개(ui 사전 대상) 준비 완료」.
