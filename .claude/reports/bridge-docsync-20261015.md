# bridge 감사 — doc-sync 배치 b5ff65b..HEAD (계약 v0.28 → v0.31, 프리셋) (2026-10-15 15:49)

## 0. 요약 (결론 먼저)

| 항목 | 결론 |
|---|---|
| 계약 ↔ TS ↔ Rust (v0.30·v0.31) | **불일치 0건 (CRITICAL 0)**. 타입 6개 필드·optional·camelCase, command 7개 이름·인자·반환, 에러 code 13개, `generate_handler!` 등록 7줄 모두 일치 |
| 위반·결함 | CRITICAL 0 · HIGH 2 · MEDIUM 1 · LOW 3 |
| 가장 중요한 결함 | ① BRG-001: §7·머리·§8·§9의 asset scope 표기 `$APPDATA/presets/**`가 실물 `$APPDATA/presets/*/*.png`(좁혀짐)와 다름 ② BRG-003: 「소스 반영 대기」「core-implementer 선행」「lib.rs 등록 대기」 낡은 표기 8줄 ③ BRG-002: `src/main.tsx:11` bridge 밖 `@tauri-apps/api/window` import(기존 예외, 미명문화) |
| 화면 코드 직접 `invoke`·`listen` | **0건** (`src/overlay`·`src/settings`·`src/components`·`src/state`, 테스트 제외) |
| 이벤트 | v0.29~v0.31 새 이벤트 없음. `events.ts`·`events.rs` 변경 없음(b5ff65b..HEAD diff 0). 두 파일 밖 이벤트 리터럴 0건 |
| capabilities | 최소 권한 **준수**. 새 권한 없음, `dialog:allow-open`은 settings 창만, 프리셋 command·`pickFolder` 호출은 `src/settings/`에만 있음 |
| 코드 변경 필요 | 조건부 1건(BRG-002, 래퍼 추가로 결정될 때만). 나머지는 문서 정정만 |

## 1. 현황

- 계약: `doc/200_설계/bridge/contract.md` v0.31 (머리 「초안」 표기 유지), 1939줄
- 대상 커밋(bridge 관련): 13be83d(계약 v0.30) · 8ffb3a9(core presets) · e8850c7(bridge 핸들러·TS) · 06b9d90(lib.rs 등록 7줄) · 047d842(core preview + tauri.conf scope) · 9f25ac4(bridge 재노출·TS 타입 v0.31) · 89990b4·7dc31a5(내장 프리셋 — 계약 영향 없음)
- 범위 내 command 7 (`list_presets`·`save_preset`·`apply_preset`·`export_preset`·`import_preset`·`rename_preset`·`delete_preset`), 타입 6 (`PresetSummary`·`PresetPreview`·`PresetPreviewLayer`·`PresetProblem`·`PresetImportReport`·`PresetExportResult`) + 상수 1 (`PRESET_NAME_MAX`/`NAME_MAX_CHARS`), 에러 code 13 (`preset.*`), 새 event 0
- 구현 상태: Rust 핸들러 `src-tauri/src/bridge/commands/presets.rs`(228줄, 테스트 `presets/tests.rs`), 타입 재노출 `src-tauri/src/bridge/types.rs:50-53`, 원본 `src-tauri/src/presets/{mod.rs,preview.rs}`, TS `src/bridge/types.ts:347-397`·`src/bridge/commands.ts:137-151`, 등록 `src-tauri/src/lib.rs:187-193`(작업 트리. HEAD는 182-188)
- 참고: `src-tauri/src/lib.rs`는 작업 트리에 미커밋 변경(+5줄)이 있다. 줄 번호는 작업 트리 기준이고 HEAD 기준을 괄호로 함께 적었다.

## 2. 셋 대조표

### 2.1 타입 (§3.11)

| 계약 항목 | contract.md | Rust | TS | 판정 |
|---|---|---|---|---|
| `PresetSummary` {id, name, savedAt, imageCount, hasAlarm, preview(필수)} | L930, JSON 예시 L951 | `presets/mod.rs:57-69` camelCase, `saved_at: u64`, `image_count: u32`, `preview: PresetPreview` | `types.ts:369-377` | 일치 |
| `PresetPreview` {canvas: CanvasSize\|null, layers, partPos: Point, penPos: Point\|null} | L934 | `presets/preview.rs:39-47` `Option<CanvasSize>`·`Vec<…>`·`Point`·`Option<Point>`, camelCase | `types.ts:357-366` | 일치 |
| `PresetPreviewLayer` {slot: AssetSlot, url, width, height} | L937 (derive에 `Eq` 표기) | `presets/preview.rs:29-36` (derive `PartialEq`만, `Eq` 없음) | `types.ts:349-354` | 필드 일치. derive 표기만 다름 → BRG-006(LOW) |
| `PresetProblem` {fileName, code} | L941 | `presets/mod.rs:71-77` `code: &'static str` | `types.ts:381-384` `code: string` | 일치 |
| `PresetImportReport` {preset: PresetSummary\|null, problems} | L944 | `presets/mod.rs:79-85` `Option<PresetSummary>` | `types.ts:387-390` | 일치 |
| `PresetExportResult` {folderName} | L947 | `presets/mod.rs:87-91` | `types.ts:392-394` | 일치 |
| 상수 50 | L948 | `presets/mod.rs:52` `NAME_MAX_CHARS = 50` | `types.ts:397` `PRESET_NAME_MAX = 50` | 일치 |
| bridge 재노출 | §3.11 「bridge `types.rs`는 재노출만」 | `bridge/types.rs:50-53` `pub use crate::presets::{…6타입, NAME_MAX_CHARS}` | — | 일치 |

### 2.2 command (§5 L1048-1054, §5.11 L1375-1381·L1386-1392)

| command | 계약 인자 → 반환 | Rust (`bridge/commands/presets.rs`) | TS (`commands.ts`) | 등록 (`lib.rs`) | 판정 |
|---|---|---|---|---|---|
| `list_presets` | 없음 → `PresetSummary[]` | :101-104 `Result<Vec<PresetSummary>, BridgeError>`, 호출 창 제한 없음 | :139 | :187 | 일치 |
| `save_preset` | `name` → `PresetSummary` | :108-116 | :141 `{ name }` | :188 | 일치 |
| `apply_preset` | `id` → `void` | :123-149 `Result<(), BridgeError>`, 처리 순서 0·가·나·1·2~6·다가 §5.11 표와 같음 | :143 `{ id }` | :189 | 일치 |
| `export_preset` | `id`, `dir` → `PresetExportResult` | :178-188 | :145-146 `{ id, dir }` | :190 | 일치 |
| `import_preset` | `dir` → `PresetImportReport` | :192-200 | :148 `{ dir }` | :191 | 일치 |
| `rename_preset` | `id`, `name` → `PresetSummary` | :204-214 | :149-150 `{ id, name }` | :192 | 일치 |
| `delete_preset` | `id` → `void` | :217-225 | :151 `{ id }` | :193 | 일치 |

- 호출 창 제한: 6개 핸들러의 첫 문장이 `ensure_preset_caller(caller.label())?`이다(`presets.rs:33-35`). code·문구 상수는 `presets.rs:30-31` 한 곳에 있다. §5.11 「호출 창 제한 일반화」와 일치한다.
- 핸들러 두께: 가장 긴 `apply_preset` 본문이 약 25줄이다. 파일 IO·검증은 `do_*`(`presets.rs:47-94`)를 거쳐 core에 있다. 기준 30줄 이내.
- 에러 통일: 핸들러에 `unwrap`·`expect`·`panic!`·`Result<_, String>`이 없다. `now_ms`는 `unwrap_or(0)`이다(`presets.rs:38-43`, 계약 「panic 금지」와 일치). 변환은 `From<PresetError>` 한 곳이다(`bridge/types.rs:102-106`).

### 2.3 에러 code (§6 L1463-1475, §6.1 PresetError 행, §6.2 L1541-1547)

| code | §6 | Rust 출처 | TS (i18n 사전 ko·en·ja) | 판정 |
|---|---|---|---|---|
| `preset.forbidden` | 있음 | `bridge/commands/presets.rs:30` | 없음 — 계약상 의도적(§5.11 「ui 사전 추가 대상 아님」) | 일치 |
| `preset.not_found`·`invalid_name`·`missing_required`·`not_preset`·`format`·`invalid_settings`·`damaged`·`bad_dir`·`export_exists`·`io` | 있음 | `presets/mod.rs:137-146` `PresetError::code()` | 있음 (`src/settings/i18n/en.ts:272-281` 등) | 일치 |
| `preset.file_missing`·`preset.file_link` (problems 전용) | 있음 | `presets/load.rs:28,30` | 있음 (`en.ts:282-283` 등) | 일치 |

- 계약 13개 = Rust 13개. TS 사전은 계약 규칙대로 `preset.forbidden`을 뺀 12개다.
- §6.2 프리셋 7행의 code 목록은 각 핸들러 문서주석 `[에러]`(`presets.rs:99·106·118·176·190·202·215`)와 같다.

## 3. 위반 목록

[BRG-001][HIGH] §7·머리·§8·§9의 asset scope 표기가 실물과 다르다
  위치: `doc/200_설계/bridge/contract.md` L4 · L1556 · L1653 · L1665
  근거: 계약 L1556 「`app.security.assetProtocol.scope = ["$APPDATA/assets/**", "$APPDATA/presets/**"]`」, L1653 「**확인 필요**: (a) asset scope를 `presets/*/*.png`로 좁힐지(현재 `presets/**` …)」. 실물 `src-tauri/tauri.conf.json:47` 「`"scope": ["$APPDATA/assets/**", "$APPDATA/presets/*/*.png"]`」. `git log -S'presets/*/*.png'`로 보면 047d842에서 들어갔다.
  기준: 스킬 capabilities 항목(계약 §7이 권한의 단일 소스), 「문서만 뒤처짐 = HIGH」
  조치 방향: 실물이 계약보다 좁다(최소 권한 쪽). 계약 네 곳이 `presets/**`로 남아 있고, §8 v0.31의 「확인 필요 (a)」는 실물에서 이미 좁히는 쪽으로 결정됐다. L1556 「범위 주의」 문단(`.staging-*`·`preset.json`·`alarm.*` 포함 설명)도 실물 범위와 다르다.

[BRG-002][HIGH] `src/main.tsx:11` — bridge 밖 `@tauri-apps/api/window` 직접 import (openItems `main-tsx-boundary`)
  위치: `src/main.tsx:11` `import { getCurrentWindow } from '@tauri-apps/api/window'`, 사용 `src/main.tsx:13` `const label = getCurrentWindow().label`
  근거: 프로덕션 코드 중 `src/bridge/` 밖의 `@tauri-apps/` import는 이 한 줄뿐이다. 나머지는 테스트의 `vi.mock`이다. 계약은 이것을 허용하지 않고 보류만 했다. L1129 「`src/main.tsx`의 기존 예외는 이번 범위 밖 — BRG-004」. 파일 주석 `src/main.tsx:3`은 「@tauri-apps/api 를 직접 쓰는 곳은 이 파일과 src/bridge 뿐이다」라고 스스로 예외를 선언한다.
  기준: 스킬 경계 항목(bridge 밖 `@tauri-apps/api` import = HIGH 기본). CLAUDE.md §3 「ui는 `src/bridge/` 래퍼만 호출한다」
  상태: **잔존**. 기능 위험은 없다. 창 라벨 읽기는 두 창 공통 `core:default` 범위다(계약 L1603).
  판단 재료(요청받은 권고 범위): `src/bridge/commands.ts:7`이 이미 같은 `getCurrentWindow`를 import한다. 래퍼를 하나 두면 bridge 밖 import가 0이 되고 경계 규칙에 예외가 남지 않는다. 예외로 허용하려면 계약 §5.4에 「진입점 `src/main.tsx`만 창 라벨 읽기 허용」을 명문화해야 판정 기준이 생긴다. 지금은 둘 다 없어 매 감사마다 같은 지적이 반복된다. 어느 쪽을 택할지는 「5. 확인 필요」로 올린다.

[BRG-003][MEDIUM] 머리말·§3.1·§8에 반영 완료된 항목의 「대기」 표기가 남아 있다 (점검 항목 2)
  근거(실물 반영 증거): e8850c7(bridge 핸들러·TS v0.30), 06b9d90(lib.rs 7줄 등록, `lib.rs:187-193`), 047d842·9f25ac4(preview core·bridge v0.31), TS `DEFAULT_ASSET_SLOTS` 6개·`hair` 없음(`src/bridge/types.ts:76-83`).
  기준: 스킬 「문서 ↔ 소스 일치」. 계약 내용(이름·필드·타입·code)은 일치하고 반영 상태 메모만 낡았다. 그래서 HIGH가 아닌 MEDIUM으로 판정했다.

  | 줄 | 낡은 표기 (인용) | 실제 |
  |---|---|---|
  | L3 | (v0.31) 「**소스 반영 대기** — core-implementer 선행 → bridge-implementer, §8 v0.31 행」 | 047d842·9f25ac4로 반영 |
  | L3 | (v0.30) 「**소스 반영 대기** — bridge-implementer, `lib.rs` 등록 7줄은 core-implementer(사용자 승인 뒤)」 | e8850c7·06b9d90로 반영 |
  | L3 | (v0.29) 「TS 소스 반영 대기 — bridge-implementer」 | `types.ts:76-83` 6개 |
  | L4 | 「**소스 반영 대기**(core-implementer 선행 → bridge-implementer — §8 v0.31 행 인계 …)」 | 반영 |
  | L5 | 「**소스 반영 대기**(bridge-implementer — §8 v0.30 행 인계 목록)」 | 반영 |
  | L7 | 「**소스 반영 대기**: TS `src/bridge/types.ts`(bridge-implementer — §8 v0.29 행」 | 반영 |
  | L190 | 「TS `src/bridge/types.ts` `DEFAULT_ASSET_SLOTS`(현재 7개, `hair` 포함)는 반영 대기」 | 현재 6개, `hair` 없음 |
  | L1652 | §8 v0.30 행 「`lib.rs` 등록 대기」, 「**bridge-manager가 사용자 승인 뒤 core-implementer에 이 7줄만 위임**한다. 등록 전까지 앱에서 호출 불가」 | 06b9d90로 등록 |
  | L1653 | §8 v0.31 행 「**인계 — core-implementer(선행, `src-tauri/src/presets/**`)**」 (bridge-implementer 쪽에는 「구현 완료(2026-09-30)」가 있으나 core 인계 쪽에는 완료 표기 없음) | 047d842로 반영 |

  참고: L1651(§8 v0.29 행)에서는 「반영 대기」 문구가 검출되지 않았다. L1631·L1632·L1646·L1647·L1648의 「미반영」은 v0.25 이전 행이다. 그 행들의 당시 기록이고 v0.28에서 「당시 기록이라 그대로 둔다」(L1648)로 처리했으므로 대상에서 뺐다.

[BRG-004][LOW] 머리말의 `lib.rs` 줄 번호가 낡았다
  위치: L3 「`src-tauri/src/lib.rs:174` `generate_handler!`에 `bridge::commands::reset_app_data` **등록됨**」
  근거: `git show HEAD:src-tauri/src/lib.rs`에서 `reset_app_data`는 :181, 작업 트리에서는 :186이다.
  조치 방향: 프리셋 7줄 추가 뒤 줄 번호가 밀렸다. 미커밋 `lib.rs` 변경이 있어 확정 줄 번호는 커밋 뒤에 다시 봐야 한다.

[BRG-005][LOW] CR-053 버전 표기 엇갈림 v0.23/v0.24 (openItems `contract-open` — 옛 L185·187)
  위치: 현재 L189
  근거: L189 「v0.23(CR-053)~v0.28엔 다시 있었고」, 「v0.22까지 내장 기본이 없었고, v0.23(CR-053)부터 있다.」 같은 문서의 L11·L12·L148·L149·L177과 §8 L1645(`| v0.24 | 2026-09-27 | CR-053 …`)는 모두 v0.24다.
  상태: **잔존**(줄 번호만 185·187 → 189로 이동).

[BRG-006][LOW] `PresetPreviewLayer` derive 표기가 실물과 다르다
  위치: L935 `#[derive(Debug, Clone, PartialEq, Eq, Serialize)]` (바로 아래 L937 `pub struct PresetPreviewLayer`)
  근거: 실물 `src-tauri/src/presets/preview.rs:29` 「`#[derive(Debug, Clone, PartialEq, Serialize)]`」로 `Eq`가 없다.
  영향: 직렬화 결과는 같아서 IPC 영향은 없다. 계약 Rust 블록의 표기만 다르다.

## 4. openItems 재판정

### 4.1 `contract-open`

| 하위 항목 | 현재 상태 | 근거 | 권고 |
|---|---|---|---|
| §6.2 묶음 행 분리 여부 | **잔존** | §6.2(L1522-)에 묶음 행 5개가 그대로다: `get_screen_bounds · get_monitors`, `get_overlay_position · open_settings_window`, `set_overlay_position · reset_overlay_position(v0.14) · set_overlay_visible`, `get_timer(v0.21) · set_resting(v0.21)`, `get_alarm_sound(v0.23) · remove_alarm_sound(v0.23)`. 이번 배치의 프리셋 7개는 행마다 분리돼 있다 | 묶음 행은 지금 불일치를 낳지 않는다. 분리는 code 목록이 서로 다를 때만 필요하다. 묶인 command마다 실제 발생 code가 같은지는 이번 범위 밖이라 검증하지 않았다. 분리 여부는 사용자 판단(5절) |
| 「테스트 실패 34건」 기록 | **잔존** (옛 L1508 → 현재 L1799, §9 영역) | L1799 「`yarn test --run`(전체) 실패 34건은 전부 `src/settings/test/**`(CR-035 ui 픽스처 …」 — 「실측 2026-09-25」로 시점이 적힌 과거 기록이다 | 현재 테스트 결과는 이 감사의 근거가 아니다(실행 금지). 메인 세션의 최신 실행 결과로 이 줄이 아직 사실인지 대조하고, 과거 기록으로 둘지 정할 것 |
| CR-053 v0.23/v0.24 엇갈림 | **잔존** | BRG-005 | bridge-designer 정정 목록 D-5 |
| 머리 「초안」 → v1 | **잔존** | L3 「버전: **v0.31** (초안 — 사용자 확정 후 매니저가 v1로 올린다)」 | 사용자 결정 사항(5절). 계약 ↔ 소스 셋 대조는 이번 범위에서 불일치 0이라 내용상 걸림은 없다 |

### 4.2 `main-tsx-boundary`

BRG-002 참고. 위반은 **잔존**한다. 래퍼 추가인지 예외 명문화인지는 5절로 올린다.

## 5. capabilities 최소 권한 (점검 항목 6)

| 대상 | 실물 | 판정 |
|---|---|---|
| 프리셋 폴더 선택 dialog | 새 권한 없음. 기존 `pickFolder`(`commands.ts:177`)가 `dialog:allow-open`을 쓴다. 이 권한은 `src-tauri/capabilities/settings.json`에만 있다. 호출처는 `src/settings/components/PresetsTab.tsx:137·177`과 `DefaultsDownloadPanel.tsx:49`뿐이다. `src/overlay/`에는 0건 | 최소 |
| 프리셋 command 7개 | 앱 command다. capability 추가 없이 `generate_handler!` 등록만으로 허용된다(계약 §7 v0.30). 호출 창 제한은 핸들러 0단계에 있다 | 최소 |
| asset scope `$APPDATA/presets/*/*.png` | `tauri.conf.json:47`. 미리보기 URL 대상 `presets/{id}/{file_key}.png`(§3.11)만 덮는다. `preset.json`·`alarm.*`·하위 폴더는 덮지 않는다. 계약에 적힌 `presets/**`보다 좁다 | 최소. 단 계약 표기는 다름(BRG-001) |
| `fs` 권한 | 두 capability 파일 모두 없음 | 준수 |

## 6. bridge-designer 정정 목록 (문서만)

| # | 대상 줄 | 내용 |
|---|---|---|
| D-1 | L4 · L1556 · L1653 · L1665 | asset scope `presets/**` 표기가 실물 `presets/*/*.png`(`tauri.conf.json:47`, 047d842)와 다름. L1556 「범위 주의」 문단과 L1653 「확인 필요 (a)」가 실물 결정과 맞지 않음 (BRG-001) |
| D-2 | L3 (v0.31·v0.30·v0.29 세 곳) · L4 · L5 · L7 | 「소스 반영 대기」「core-implementer 선행」「사용자 승인 뒤」 표기. 실제로는 e8850c7·06b9d90·047d842·9f25ac4로 반영 완료 (BRG-003) |
| D-3 | L190 | 「`DEFAULT_ASSET_SLOTS`(현재 7개, `hair` 포함)는 반영 대기」. 실물은 6개, `hair` 없음 (BRG-003) |
| D-4 | L1652 · L1653 | §8 v0.30 행 「`lib.rs` 등록 대기」「등록 전까지 앱에서 호출 불가」, v0.31 행 core-implementer 선행 인계에 완료 표기 없음 (BRG-003) |
| D-5 | L189 | CR-053 「v0.23」 두 곳. 문서의 다른 곳과 §8은 v0.24 (BRG-005) |
| D-6 | L3 | `lib.rs:174` 줄 번호. HEAD :181, 작업 트리 :186 (BRG-004 — lib.rs 커밋 뒤 확정) |
| D-7 | L935 | `PresetPreviewLayer` derive에 `Eq` 표기. 실물에는 없음 (BRG-006) |
| D-8 | L1799 | 「테스트 실패 34건」 과거 실측 기록. 현재 사실 여부는 메인 세션 결과로 대조 (4.1) |

## 7. bridge-manager 인계 (코드 변경 필요)

| # | 대상 | 내용 | 조건 |
|---|---|---|---|
| H-1 | `src/main.tsx:11·13` (+ `src/bridge/` 래퍼) | bridge 밖 `@tauri-apps/api/window` import 1건 (BRG-002) | 사용자가 「래퍼 추가」를 택할 때만. 「예외 명문화」를 택하면 코드 변경 없이 bridge-designer의 §5.4 문서 작업이 된다 |

그 밖의 코드 변경 필요 항목은 없다. 계약·TS·Rust 대조는 불일치 0건이다.

## 8. 확인 필요 (사용자 판단)

1. **main.tsx 경계(BRG-002).** 진입점의 창 라벨 읽기를 bridge 래퍼로 옮길지, 계약 §5.4에 예외로 명문화할지 결정해야 한다.
2. **§6.2 묶음 행.** 묶음 5행을 command별로 나눌지 결정해야 한다. 지금은 불일치를 낳지 않는다.
3. **머리 「초안」 → v1.** 계약을 v1로 확정할지 결정해야 한다.
4. **scope 패턴의 점 폴더 매칭.** `presets/*/*.png`의 `*`가 `.staging-*`·`.trash-*` 같은 점으로 시작하는 폴더 이름과도 맞는지는 Tauri glob 옵션에 달려 있다. 이번 감사에서 확인하지 않았다. 계약은 core가 그런 폴더의 URL을 만들지 않는다고 보장한다(§3.11). 그래서 노출 경로는 계약상 없다.
5. **lib.rs 미커밋 변경.** 작업 트리의 `src-tauri/src/lib.rs` +5줄은 이번 감사 범위(b5ff65b..HEAD) 밖이다. 커밋 뒤 D-6 줄 번호를 다시 봐야 한다.
