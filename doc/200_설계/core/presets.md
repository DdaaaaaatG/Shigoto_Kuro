# presets 모듈 설계

- 상태: 초안(범위·결정은 사용자 확정 🔒 2026-09-30 — 확정사항 §6 「프리셋」 PS-01~PS-10, 결정 U-1~U-7 권고안) · 최종 갱신: 2026-09-30
- 변경이력:

| 날짜 | 차수 | 내용 | 소스 |
|---|---|---|---|
| 2026-09-30 | 1차(신규) | 새 모듈 `presets`(`mod`·`format`·`load`·`scan`·`write`·`apply` 6파일). 공개 API 7개·보고서 타입 4개·`AppliedPreset`·`PresetError`(변형 11개, preset code 10개 + 설정 위임). 정본 인계 패킷 `doc/200_설계/architecture/presets-03-packet-core.md`, 근거 `presets-02-design.md` §2·§3·§5. 짝 변경: [assets.md](assets.md) §3.18(가시성 4곳), [settings.md](settings.md) §3.12(사용처), [data_reset.md](data_reset.md) §3.4(U-1). 패킷 대비 델타는 §11.1 | 미적용 |

- 요구ID 표기: `PS-01`~`PS-10` = 아키텍처 횡단 ID(`doc/000_프로젝트_확정사항.md` §6 「프리셋」, `presets-02-design.md` §6 RTM). `U-1`~`U-7` = 사용자 결정, `A-1`~`A-11` = 아키텍트 결정(02-design §5a). `doc/100_요구조건/`에는 없다.
- 상대 문서: [assets.md](assets.md) §3.18 · [settings.md](settings.md) §3.12 · [data_reset.md](data_reset.md) §3.4 · 계약 `doc/200_설계/bridge/contract.md` v0.30(bridge-designer 소관) · bridge 패킷 `presets-03-packet-bridge.md`

## 1. 목적

결론: `presets`는 **지금의 그림·알림음·설정(PS-02 4필드) 한 벌을 `presets/{id}/` 폴더에 복사해 두고, 목록·적용·내보내기·가져오기·이름 바꾸기·삭제를 하는 단일 소유자**다. 적용은 「검증 → 백업 → 교체 → 설정 병합 → 실패 시 되돌림」이고, 설정 쓰기는 `settings::update` 하나만 쓴다.

비유: 옷장 관리인이다. 옷걸이(폴더)에 이름표(`preset.json`)를 붙여 걸고, 꺼낼 때는 옷을 전부 살핀 다음 지금 옷을 사진 찍어 두고 갈아입힌다. 도중에 문제가 생기면 사진대로 되돌린다. 신발장(창 위치·언어 같은 PC별 설정)은 건드리지 않는다.

| 요구ID | 내용 | 이 모듈의 몫 |
|---|---|---|
| PS-01 | 이름 붙여 저장 → 목록 | `save`·`list`(§3.7.1·§3.7.4) |
| PS-02 | 그림 전부·알림음·배율·휴식 시간·`mouse` 전체·`timer` 전체를 담는다 | `PresetSettings`(4필드)·`PresetFile.images`·`alarm`(§3.2) |
| PS-03 | PC별 설정 5개(`overlay`·`autostart`·`language`·`positionLock`·`showInTaskbar`)는 적용해도 그대로 | `merge_into`(4필드만 대입)·`from_settings` 구조 분해 가드(§3.2, §7) |
| PS-04 (core 부분) | 적용 = 통째 교체(없는 슬롯 비움), 실패하면 되돌림, 자동 백업 없음 | `apply`(§3.7.3). 확인창·화면 반영은 ui·bridge |
| PS-05 | 폴더째 내보내기, 새 의존성 없음 | `export_to`·`export_folder_name`(§3.5·§3.7.7) |
| PS-06 | 폴더 가져오기, 규격 검사, 파일별 사유, 부분 등록 없음, 경로 탈출 금지 | `load_dir`(§3.6)·`import_from`(§3.7.2) |
| PS-07 | 이름 바꾸기·삭제, 이름 중복 허용, 빈 이름 불가 | `rename`·`delete`·`normalize_name`(§3.3·§3.7.5·§3.7.6) |
| PS-08 | `kb_up`·`mouse_base` 없으면 저장 불가(방어 검사) | `save` 2단계 `MissingRequired`(§3.7.1) |
| PS-09 (core 부분) | 설정 창 프리셋 탭의 카드 목록 | `list`가 `PresetSummary`(이름·날짜·장수·알림음) 정렬 목록 제공(U-4). 탭·카드는 ui |
| PS-10 | 적용은 복사 — 이후 변경이 프리셋에 번지지 않음 | `apply`는 프리셋 폴더를 **읽기만**(§3.7.3) |

🔒 사용자 결정(권고안 반영, 02-design §5a) 중 core에 걸리는 것:

| ID | 결정 | 반영 |
|---|---|---|
| U-1 | 전체 초기화·세대 초기화 때 프리셋 **유지** | 코드 변경 없음 — `wipe`가 하위 폴더에 들어가지 않는다. [data_reset.md](data_reset.md) §3.4에 한 줄 |
| U-2 | 가져오기 문제는 **파일 전부**를 목록으로 | `load_dir`가 모든 파일을 끝까지 본다(§3.6) |
| U-3 | 내보낼 위치에 같은 이름 폴더가 있으면 **오류** | `ExportExists`(§3.7.7) |
| U-4 | 목록은 **최근 저장이 위** | `list` 정렬(§3.7.4) |
| U-5 | 가져온 프리셋의 `savedAt`은 **원본 유지** | `import_from`(§3.7.2) |
| U-7 | 이름 최대 **50자** | `NAME_MAX_CHARS`(§2) |

U-6(적용 뒤 오버레이 새로고침 안 함)은 bridge 몫이다.

## 2. 공개 API

모두 `crate::presets`(`lib.rs`에 `pub mod presets;`). 자식 모듈 6개는 비공개이고 `mod.rs`가 재노출한다(§3.1).

| 이름 | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `pub const PRESETS_DIR: &str = "presets"` | — | 데이터 폴더 아래 프리셋 폴더 이름 | — | PS-01 |
| `pub const PRESET_FILE: &str = "preset.json"` | — | 프리셋 폴더 안 메타·설정 파일 | — | PS-01·PS-02 |
| `pub const FORMAT_VERSION: u32 = 1` | — | `preset.json` 형식 번호 | — | PS-06 |
| `pub const NAME_MAX_CHARS: usize = 50` | — | 이름 최대 글자 수(TS `PRESET_NAME_MAX`와 1:1) | — | PS-07, U-7 |
| `pub const MAX_IMAGES: usize = 64` | — | 프리셋 하나의 그림 수 상한 | — | PS-06, A-9 |
| `pub struct PresetSummary` | — | 목록 카드 한 장 | — | PS-01·PS-09 |
| `pub struct PresetProblem` | — | 가져오기 파일별 문제 | — | PS-06, U-2 |
| `pub struct PresetImportReport` | — | 가져오기 결과 | — | PS-06 |
| `pub struct PresetExportResult` | — | 내보낸 폴더 이름 | — | PS-05 |
| `pub struct AppliedPreset` | — | 적용 뒤 새 매니페스트(bridge 뒤처리 입력) | — | PS-04 |
| `pub enum PresetError` + `code()`·`may_have_changed()` | — | §6 | — | 전부 |
| `pub fn list(presets_dir: &Path) -> Result<Vec<PresetSummary>, PresetError>` | 프리셋 폴더 | `savedAt` 내림차순, 같으면 id 내림차순 | `Io`(`presets/` 읽기 자체 실패만). 폴더 없음 = 빈 목록 | PS-01·PS-09, U-4 |
| `pub fn save(paths: &AppPaths, settings: &Mutex<Settings>, name: &str, now_ms: u64) -> Result<PresetSummary, PresetError>` | 앱 경로, 설정 상태, 이름, 현재 Unix ms | 새 프리셋 요약 | `InvalidName`·`MissingRequired`·`Settings{StatePoisoned}`·`Io` | PS-01·PS-02·PS-08 |
| `pub fn apply(paths: &AppPaths, id: &str, settings: &Mutex<Settings>) -> Result<AppliedPreset, PresetError>` | 앱 경로, id, 설정 상태 | 새 매니페스트 | `NotFound`·`NotPreset`·`Format`·`InvalidName`·`InvalidSettings`·`Damaged`·`Io{changed}`·`Settings{changed}` | PS-04·PS-03·PS-10 |
| `pub fn export_to(presets_dir: &Path, id: &str, dest_parent: &Path) -> Result<PresetExportResult, PresetError>` | 프리셋 폴더, id, 사용자가 고른 폴더 | 만든 폴더 이름 | `NotFound`·`NotPreset`·`Format`·`InvalidName`·`InvalidSettings`·`BadDir`·`ExportExists`·`Io` | PS-05, U-3 |
| `pub fn import_from(presets_dir: &Path, src: &Path, now_ms: u64) -> Result<PresetImportReport, PresetError>` | 프리셋 폴더, 가져올 폴더, 현재 Unix ms | 등록 결과 또는 파일별 문제 | `BadDir`·`NotPreset`·`Format`·`InvalidName`·`InvalidSettings`·`Io`. **파일별 문제는 `Ok`(보고서)** | PS-06, U-2·U-5 |
| `pub fn rename(presets_dir: &Path, id: &str, name: &str) -> Result<PresetSummary, PresetError>` | 프리셋 폴더, id, 새 이름 | 새 요약(id 불변) | `NotFound`·`InvalidName`·`NotPreset`·`Format`·`InvalidSettings`·`Io` | PS-07 |
| `pub fn delete(presets_dir: &Path, id: &str) -> Result<(), PresetError>` | 프리셋 폴더, id | 없음 | `NotFound`·`Io` | PS-07 |

구현자가 그대로 옮길 선언(🔒 이름·시그니처 — 패킷 §1):

```rust
//! [목적] 프리셋(PS-01~PS-10) — 그림·알림음·설정(PS-02 필드) 한 벌을 presets/{id}/ 폴더에 저장·적용·
//!        내보내기·가져오기·이름 바꾸기·삭제. presets-02-design.md.
//! [형식] preset.json(formatVersion 1) + {file_key}.png + alarm.{wav|mp3|ogg}. 파일 이름은 슬롯·형식에서만
//!        만든다(JSON에 파일 이름 문자열 없음).
//! [보안] 사용자 문자열은 경로 조각이 되지 않는다(id는 규칙 검사, 이름은 내보내기 때만 정화). 링크·재분석
//!        지점 거부, 크기 선검사 후 상한 읽기(SEC-003 방식), 검증에 쓴 바이트를 그대로 쓴다.
//! [스레드] 없음. 호출자(동기 command, 메인 스레드) 스레드에서 실행 — 계약 §5.10 C-4 불변식.
//! [unsafe] 없음.

use std::path::Path;
use std::sync::Mutex;

use serde::Serialize;

use crate::assets::AssetManifest;
use crate::settings::{Settings, SettingsError};
use crate::AppPaths;

mod apply;
mod format;
mod load;
mod scan;
mod write;

pub use apply::apply;
pub use scan::{delete, list, rename};
pub use write::{export_to, import_from, save};

pub const PRESETS_DIR: &str = "presets";
pub const PRESET_FILE: &str = "preset.json";
pub const FORMAT_VERSION: u32 = 1;
/// TS `PRESET_NAME_MAX`와 1:1 (U-7).
pub const NAME_MAX_CHARS: usize = 50;
/// 프리셋 하나의 그림 수 상한(A-9).
pub const MAX_IMAGES: usize = 64;

/// 목록 카드 한 장. JSON {id, name, savedAt, imageCount, hasAlarm}.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetSummary { pub id: String, pub name: String, pub saved_at: u64, pub image_count: u32, pub has_alarm: bool }

/// 가져오기 파일별 문제. code = 기존 asset.*·sound.* 또는 preset.file_missing·preset.file_link·
/// preset.missing_required·preset.io. file_name은 폴더 안 파일 이름만(경로 없음).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetProblem { pub file_name: String, pub code: &'static str }

/// 불변식: preset.is_some() ⇔ problems.is_empty().
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetImportReport { pub preset: Option<PresetSummary>, pub problems: Vec<PresetProblem> }

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetExportResult { pub folder_name: String }

/// 적용 결과 — bridge 뒤처리가 이 매니페스트로 emit·리사이즈·손 기준점을 한다.
#[derive(Debug, Clone, PartialEq)]
pub struct AppliedPreset { pub manifest: AssetManifest }

#[derive(Debug, thiserror::Error)]
pub enum PresetError { /* §6 */ }
impl PresetError {
    pub fn code(&self) -> &'static str;
    pub fn may_have_changed(&self) -> bool;
}
```

- `now_ms`(Unix ms)는 호출자가 넣는다 — id 생성·`savedAt`을 테스트에서 고정하기 위해(`window/placement.rs` 시각 주입 선례). bridge는 `SystemTime::now()`로 만든다.
- `id: &str`를 받는 모든 함수(`apply`·`export_to`·`rename`·`delete`)는 **첫 줄에서** `is_valid_id`(§3.4)를 검사하고, 어긋나면 `NotFound`다(존재 여부를 흘리지 않는다). 이어서 `presets_dir.join(id)`가 링크 아닌 폴더가 아니면 역시 `NotFound`.
- `PresetSummary` 만들기(비공개 `summary(id, &PresetFile)`, `mod.rs`): `image_count = file.images.len() as u32`, `has_alarm = file.alarm.is_some()`.
- `lib.rs` — 필드는 **늘리지 않는다**(통합 테스트가 `AppPaths { data_dir, assets_dir, settings_file }` 리터럴로 만든다). 기존 `impl AppPaths`(lib.rs:46)에 메서드 1개만:

```rust
impl AppPaths {
    /// 프리셋 폴더(`{data_dir}/presets`). 필드가 아니라 메서드 — 테스트의 구조체 리터럴을 깨지 않는다.
    pub fn presets_dir(&self) -> std::path::PathBuf {
        self.data_dir.join(presets::PRESETS_DIR)
    }
}
```

- `generate_handler!`는 이 단계에서 건드리지 않는다(command가 없다 — bridge 단계에서 core-implementer가 등록, bridge 패킷 §6).

## 3. 내부 구조

### 3.1 파일 분할

모듈 전체가 800줄을 넘으므로 6개로 나눈다(golden-principles §1). 함수는 50줄 이하.

| 파일 | 책임 | 예상 줄 수(테스트 포함) |
|---|---|---|
| `src-tauri/src/presets/mod.rs` (신규) | `//!` 문서주석, 상수 5개, 공개 타입 5개, `PresetError`·`code()`·`may_have_changed()`, 비공개 `summary`·`ensure_preset_dir(presets_dir, id) -> Result<PathBuf, PresetError>`(id 규칙 + 링크 아닌 폴더 → 아니면 `NotFound`), 재노출. 단위 테스트(§8.1 에러 3개) | 약 200 |
| `src-tauri/src/presets/format.rs` (신규) | `PresetFile`·`PresetSettings`(serde)·`from_settings`·`merge_into`·`normalized`·`validate`, `read_preset_file`·`write_preset_file`, `normalize_name`, `is_valid_id`, `claim_staging`, `export_folder_name`, 이름 접두 상수 `STAGING_PREFIX = ".staging-"`·`TRASH_PREFIX = ".trash-"`. 단위 테스트(형식·이름·id) | 약 400 |
| `src-tauri/src/presets/load.rs` (신규) | 폴더 검증기 `load_dir` → `Loaded::{Ok(ValidatedPreset), Problems}`, 파일별 검사 `check_image`·`check_alarm`, 문제 전용 code 상수 `CODE_FILE_MISSING`·`CODE_FILE_LINK` | 약 200 |
| `src-tauri/src/presets/scan.rs` (신규) | `list`·`rename`·`delete`, `cleanup_leftovers`, 링크 판정 `is_link_like`·`is_plain_dir`·`is_plain_file`, `check_presets_dir`. 단위 테스트 `is_link_like` 표 | 약 220 |
| `src-tauri/src/presets/write.rs` (신규) | `save`·`import_from`·`export_to`, 스테이징 공용 `commit_staging(presets_dir, files, file) -> Result<PresetSummary, PresetError>`(선점 → 쓰기 → rename → 실패 시 정리) | 약 260 |
| `src-tauri/src/presets/apply.rs` (신규) | `apply`, `FileBackup::{capture, restore}`, `backup_names`, `commit_files`, `build_manifest` | 약 220 |
| `src-tauri/src/lib.rs` | `pub mod presets;`, `//!` [계층]에 `presets` 추가, `AppPaths::presets_dir`(§2) | +10 |
| `src-tauri/src/assets/mod.rs`·`assets/url.rs` | 가시성만 4곳([assets.md](assets.md) §3.18). **동작 불변** | ±0 |
| `src-tauri/tests/presets.rs` (신규) | 통합 테스트(§8.2). 800줄을 넘으면 적용 영역을 `tests/presets_apply.rs`로 나눈다(§11.1 Δ5) | 약 700~900 |

비공개 가시성: 자식 모듈 사이 공유 항목은 `pub(super)`(패킷의 `pub(crate)` 표기는 모듈 밖에서 안 쓰이므로 `pub(super)`로 좁혀도 된다 — 구현자 재량, 어느 쪽이든 모듈 밖 사용처 없음).

### 3.2 `preset.json` 형식 (`format.rs`, PS-02·PS-06)

비유: 옷걸이 이름표. 옷 목록(슬롯)만 적고, 옷의 파일 이름은 적지 않는다 — 파일 이름은 목록에서 늘 같은 규칙으로 다시 만든다.

```
presets/
  1790000000000/            ← id (폴더 이름, §3.4)
    preset.json
    kb_up.png  mouse_base.png  background.png  kb_down_0.png ...   ← {file_key}.png (stored_file_name)
    alarm.mp3               ← 있을 때만, alarm_file_name(format)
  .staging-1790000000123/   ← 저장·가져오기 도중 임시(점으로 시작 — id 규칙에 안 맞아 목록이 건너뜀)
  .trash-1790000000000/     ← 삭제 도중 임시(같음)
```

```rust
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PresetFile {
    pub format_version: u32,             // 1
    pub name: String,
    pub saved_at: u64,                   // Unix ms
    pub images: Vec<AssetSlot>,          // 기존 serde — 모르는 슬롯이면 역직렬화 실패 → Format
    pub alarm: Option<AlarmFormat>,      // 기존 serde "wav"|"mp3"|"ogg"
    pub settings: PresetSettings,
}

/// PS-02 필드만. 컨테이너 default = Settings::default()의 같은 필드 값.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct PresetSettings {
    pub scale: f64,
    pub idle_seconds: u32,
    pub mouse: Option<MouseSettings>,
    pub timer: TimerSettings,
}
impl Default for PresetSettings { /* PresetSettings::from_settings(&Settings::default()) */ }

impl PresetSettings {
    /// PS-02/PS-03 분류 가드 — Settings를 **구조 분해**로 읽는다. Settings에 필드가 늘면 컴파일이 깨져
    /// 분류를 강제한다(02-design §5).
    pub fn from_settings(s: &Settings) -> Self {
        let Settings { scale, idle_seconds, overlay: _, mouse, autostart: _, language: _,
                       position_lock: _, show_in_taskbar: _, timer } = s;
        Self { scale: *scale, idle_seconds: *idle_seconds, mouse: mouse.clone(), timer: timer.clone() }
    }
    /// PS-02 4필드만 대입(PS-03 5필드 유지). settings::update 클로저 안에서 부른다 — 순수 대입만.
    pub fn merge_into(&self, cur: &mut Settings) { /* scale·idle_seconds·mouse·timer */ }
    /// 읽기 보정(settings::load와 같은 규칙): idle_seconds clamp(IDLE_SECONDS_MIN..=MAX), timer::normalize.
    pub fn normalized(self) -> Self;
    /// Settings { 4필드, ..Settings::default() }.validate() — 실패는 PresetError::InvalidSettings(SettingsError 문구).
    pub fn validate(&self) -> Result<(), PresetError>;
}
```

| 필드 | 타입 | 규칙 |
|---|---|---|
| `formatVersion` | u32 | `FORMAT_VERSION`(1)과 다르면 `Format`(미래 형식은 읽지 않는다) |
| `name` | string | §3.3 이름 규칙. 어긋나면 `InvalidName` |
| `savedAt` | u64 | 저장 때 `now_ms`. 가져오기는 원본 유지(U-5) |
| `images` | `AssetSlot[]` | 기존 serde. 모르는 슬롯 → `Format`. 중복(`file_key` 같음) → `Format`. `len() > MAX_IMAGES` → `Format`. 순서 = 저장 때 매니페스트 순서 |
| `alarm` | `"wav"\|"mp3"\|"ogg"\|null` | 기존 `AlarmFormat` |
| `settings` | `PresetSettings` | 빠진 키는 `Settings::default()` 값. 읽을 때 `normalized()` 후 `validate()` |

- 직렬화 `serde_json::to_string_pretty` → `settings::write_atomic`. 읽기 `settings::read_capped_string(path, MAX_TEXT_FILE_BYTES)`(1MiB).
- **id는 `preset.json`에 넣지 않는다** — 폴더 이름이 id다. 다른 PC에서 가져오면 새 id를 받는다.
- 폴더 안 다른 파일·하위 폴더는 무시한다(읽지도 복사하지도 않는다).

폴더 수준 파싱(목록·이름 바꾸기·내보내기·검증기가 공유):

```rust
/// dir/preset.json 읽기·검사. 파일 검사(PNG·알림음)는 하지 않는다.
pub(crate) fn read_preset_file(dir: &Path) -> Result<PresetFile, PresetError>;
/// to_string_pretty → write_atomic(dir/preset.json). 실패 Io{changed: false}.
pub(crate) fn write_preset_file(dir: &Path, file: &PresetFile) -> Result<(), PresetError>;
```

| `read_preset_file` 조건 | 결과 |
|---|---|
| `dir/preset.json`의 `symlink_metadata`가 NotFound, 링크·재분석 지점, 일반 파일 아님 | `NotPreset` |
| 크기 1MiB 초과·JSON 오류(모르는 슬롯 포함)·`format_version != FORMAT_VERSION`·중복 슬롯·`images.len() > MAX_IMAGES` | `Format(사유)` — 사유는 고정 한국어 문구(경로·원문 값 없음, serde 오류 원문도 넣지 않는다) |
| 그 밖의 읽기 실패 | `Io{changed: false}` |
| `normalize_name(&file.name)` 실패 | `InvalidName` |
| `settings.normalized()` → `validate()` 실패 | `InvalidSettings(SettingsError 문구)` |
| 통과 | `name` = 정리된 이름, `settings` = 정규화 값으로 바꾼 `PresetFile` |

`Format` 사유 문구(고정): `"JSON을 읽을 수 없습니다"`·`"파일이 너무 큽니다"`·`"지원하지 않는 형식 버전입니다"`·`"같은 그림이 두 번 들어 있습니다"`·`"그림이 너무 많습니다"`. (`read_capped_string`의 상한 초과는 `ErrorKind::InvalidData` — 이것만 `Format("파일이 너무 큽니다")`로, 나머지 io 에러는 `Io`.)

### 3.3 이름 규칙 (`format.rs`, A-8·U-7, PS-07)

```rust
/// 앞뒤 공백 제거 후 1..=NAME_MAX_CHARS 글자(chars().count()), char::is_control 없음. 통과하면 정리된 이름.
pub(crate) fn normalize_name(raw: &str) -> Result<String, PresetError>; // 실패 InvalidName
```

- 그 밖의 글자(한글·일본어·이모지·파일 이름 금지 글자)는 허용한다. 폴더 이름은 id라 영향이 없고, 내보내기만 `export_folder_name`이 바꾼다.
- 이름 중복은 허용한다(PS-07).

### 3.4 id 규칙 (`format.rs`, A-3)

```rust
/// ^[0-9a-z][0-9a-z-]{0,39}$ — 정규식 크레이트 없이 바이트 검사.
pub(crate) fn is_valid_id(id: &str) -> bool;
/// "{now_ms}" 또는 "{now_ms}-{n}"(n=1..=999). 후보마다 presets_dir/{후보}가 없고
/// fs::create_dir(presets_dir/.staging-{후보})가 성공할 때까지. 999번 모두 실패하면 Io.
pub(crate) fn claim_staging(presets_dir: &Path, now_ms: u64) -> Result<(String, PathBuf), PresetError>;
```

- `create_dir`은 없을 때만 성공하므로 **자리 선점**이 된다(uuid·rand 없음). `AlreadyExists`면 다음 후보, 그 밖의 에러는 즉시 `Io`.
- 스테이징 `.staging-{id}`, 삭제 대기 `.trash-{id}` — 점으로 시작해 `is_valid_id`에 걸리지 않으므로 `list`가 자연히 건너뛰고, 사용자 입력 id로 이 폴더를 가리킬 수도 없다.

### 3.5 내보내기 폴더 이름 (`format.rs`, PS-05)

```rust
/// < > : " / \ | ? * 와 제어 문자 → '_', 끝의 '.'·' ' 제거, 예약 이름(CON PRN AUX NUL COM1-9 LPT1-9 —
/// 대소문자 무시, 첫 '.' 앞부분 기준)이면 뒤에 '_', 비면 "preset".
pub(crate) fn export_folder_name(name: &str) -> String;
```

| 입력 | 결과 |
|---|---|
| `a:b` | `a_b` |
| `CON` | `CON_` |
| `con.txt` | `con.txt_` |
| `...` | `preset` |
| `이름. ` | `이름` |

- 결과는 한 경로 조각이다(`/`·`\`가 남지 않는다). 사용자 문자열이 경로가 되는 유일한 곳이며, 이 함수를 거친 뒤 `dest_parent.join(…)` 한 번만 쓴다.

### 3.6 폴더 검증기 (`load.rs`, 가져오기·적용 공용, PS-06·PS-04)

비유: 이삿짐 검수원. 이름표에 적힌 짐만 하나씩 열어 보고, 문제가 있으면 짐마다 쪽지를 붙인다. 쪽지가 한 장이라도 있으면 트럭에 싣지 않는다.

```rust
pub(crate) const CODE_FILE_MISSING: &str = "preset.file_missing";
pub(crate) const CODE_FILE_LINK: &str = "preset.file_link";

pub(crate) struct ValidatedPreset {
    pub file: PresetFile,                                  // normalized 설정
    pub images: Vec<(AssetSlot, Vec<u8>, PngInfo)>,        // file.images 순서
    pub alarm: Option<(AlarmFormat, Vec<u8>)>,
}
pub(crate) enum Loaded { Ok(ValidatedPreset), Problems(PresetFile, Vec<PresetProblem>) }
/// 폴더 수준 에러(read_preset_file의 NotPreset·Format·InvalidName·InvalidSettings·Io)는 Err.
pub(crate) fn load_dir(dir: &Path) -> Result<Loaded, PresetError>;
```

순서: `read_preset_file(dir)` → 필수 슬롯 확인 → 그림마다 검사 → 알림음 검사. **파일마다 처음 걸린 문제 하나만** 기록하고, **모든 파일을 끝까지 본다**(U-2).

| # | 검사 | 문제 code |
|---|---|---|
| 0 | `file.images`에 `kb_up`·`mouse_base` 중 없는 것(파일 검사 전, 없는 것마다 1개) | `preset.missing_required`, fileName = `kb_up.png`·`mouse_base.png` |
| 1 | `dir.join(stored_file_name(slot))`의 `symlink_metadata` — `NotFound` | `preset.file_missing` |
| 2 | 링크·재분석 지점(`is_link_like`)·일반 파일 아님 | `preset.file_link` |
| 3 | `len > ASSET_MAX_BYTES`(읽기 전) | `asset.too_many_bytes` |
| 4 | `read_capped(path, ASSET_MAX_BYTES)` 실패 | `TooManyBytes` → `asset.too_many_bytes`, 그 밖(`asset.io`) → `preset.io` |
| 5 | `parse_png_header` → `validate(&info, len, &slot, group)` | 그 `AssetError::code()`(`asset.not_png`·`asset.bad_header`·`asset.not_rgba`·`asset.too_large`·`asset.too_many_bytes`·`asset.canvas_mismatch`) |
| 6 | 알림음(`file.alarm`이 있을 때만): 경로 `dir.join(alarm_file_name(fmt))`, 1·2 검사 → `len > ALARM_MAX_BYTES` | `preset.file_missing`·`preset.file_link`·`sound.too_many_bytes` |
| 7 | 알림음 `read_capped(path, ALARM_MAX_BYTES)` 실패 | `TooManyBytes` → `sound.too_many_bytes`, 그 밖 → `preset.io` (§11.1 Δ3) |
| 8 | 알림음 `detect_format(&bytes) != Some(선언 형식)` | `sound.not_audio` |

- `group` = `file.images` 순서에서 **이미 통과한** 첫 캔버스 레이어(`slot.is_canvas_layer()`)의 크기, 없으면 `None`. 마우스 파츠·펜 그림은 항상 `None`(CR-036). 기존 `recompute_canvas`와 같은 규칙이다. 현재 `assets/` 매니페스트의 캔버스와는 비교하지 않는다(전체 교체라서).
- 문제의 `file_name`은 폴더 안 파일 이름(`stored_file_name`·`alarm_file_name` 결과)뿐이다. 경로가 없다.
- **경로는 `dir.join(PRESET_FILE)`·`dir.join(stored_file_name(slot))`·`dir.join(alarm_file_name(fmt))` 세 가지만 만든다.** JSON 문자열이 경로 조각이 되는 곳이 없다.
- 규격 규칙(`validate`·상한·캔버스)은 assets 것을 그대로 부른다. presets에 다시 쓰지 않는다.
- 함수 50줄 한계 — 그림 한 장 검사 `check_image(dir, slot, group) -> Result<(Vec<u8>, PngInfo), &'static str>`, 알림음 `check_alarm(dir, fmt) -> Result<Vec<u8>, &'static str>`로 나눈다(`Err` = 문제 code).

### 3.7 알고리즘

#### 3.7.1 `save` (`write.rs`, PS-01·PS-02·PS-08)

1. `normalize_name(name)` → 실패 `InvalidName`.
2. `assets::load_manifest(&paths.assets_dir)` → 실패 `Io{changed: false}`(원인 `AssetError`는 로그 code만). `kb_up`·`mouse_base` 중 하나라도 없으면 `MissingRequired`.
3. 설정 잠금 **한 문장**으로 `PresetSettings::from_settings(&*guard)` 복사(문장 끝에서 해제). 오염 → `Settings{source: StatePoisoned, changed: false}`.
4. `assets::sound::current(&paths.assets_dir)` → 알림음 형식(있으면). 실패 `Io`.
5. `check_presets_dir(presets_dir)`: 없으면 `create_dir_all`, 있는데 링크·재분석 지점이면 `Io`. → `cleanup_leftovers`(최선) → `claim_staging`.
6. 매니페스트 순서대로 각 `{file_key}.png`: `symlink_metadata` 일반 파일 확인(아니면 `Io`) → `read_capped(ASSET_MAX_BYTES)` → 스테이징에 `fs::write`. 알림음 같음(`ALARM_MAX_BYTES`). 마지막에 `preset.json`을 `write_atomic`(`images` = 매니페스트 슬롯 순서, `saved_at` = `now_ms`).
7. `fs::rename(.staging-{id} → {id})`.
8. 6·7 실패 → 스테이징 `remove_dir_all`(최선, 경고 로그) → `Io`. **실패하면 목록에 아무것도 생기지 않는다.**
9. `summary(id, &file)` 반환. 이벤트 없음.

- 저장은 현재 파일을 **다시 검증하지 않는다** — `assets/`는 이미 import 때 검증된 파일이다. 대신 적용·가져오기 때 검증기가 다시 본다.

#### 3.7.2 `import_from` (`write.rs`, PS-06·U-2·U-5)

1. `src.is_absolute()`이고 `symlink_metadata(src)`가 링크 아닌 폴더 → 아니면 `BadDir`.
2. `load_dir(src)` — 폴더 수준 에러는 그대로 `Err`. `Problems(_, p)` → `Ok(PresetImportReport { preset: None, problems: p })`(**디스크 불변**).
3. `Ok(v)` → `check_presets_dir` → `cleanup_leftovers` → `claim_staging` → **검증에 쓴 바로 그 바이트**(`v.images`·`v.alarm`)를 스테이징에 `fs::write`(원본을 다시 열지 않는다 — 검사와 복사 사이 경쟁 차단) → `preset.json` = `v.file`(정규화된 구조체) 재직렬화(원문 복사 아님) → `rename`.
4. `Ok(PresetImportReport { preset: Some(summary), problems: vec![] })`. 실패 → 스테이징 삭제(최선) → `Io`.

- `savedAt`은 원본 값을 유지한다(U-5). `now_ms`는 id 생성에만 쓴다.
- 이름 중복 허용, 원본 폴더는 건드리지 않는다. 같은 폴더를 두 번 가져오면 프리셋 2개(id 다름).
- 3의 쓰기 단계는 `save` 6~8과 같은 `commit_staging`을 쓴다.

#### 3.7.3 `apply` (`apply.rs`, PS-04·PS-03·PS-10) — 02-design §3.2

비유: 이사 짐 바꾸기. 새 짐을 전부 검사해 트럭에 싣고(검증·메모리), 옛 짐 사진을 찍어 둔 다음(백업), 방을 바꾼다. 도중에 문이 안 열리면 사진대로 되돌린다.

```rust
struct FileBackup { entries: Vec<(PathBuf, Option<Vec<u8>>)> } // 경로 = assets_dir.join(고정 이름)
impl FileBackup {
    fn capture(assets_dir: &Path, names: &[String]) -> Result<Self, PresetError>; // 없는 파일 = None
    fn restore(&self) -> bool; // Some → write_atomic, None → remove(NotFound 무시). 하나라도 실패하면 false(경고 로그)
}
```

| # | 단계 | 실패 시 | 디스크·메모리 |
|---|---|---|---|
| 1 | `ensure_preset_dir(presets_dir, id)` — id 규칙 → 링크 아닌 폴더 | `NotFound` | 불변 |
| 2 | `load_dir(presets_dir/{id})` — 모든 PNG·알림음 바이트를 메모리에 | 폴더 수준 에러 그대로(`NotPreset`·`Format`·`InvalidName`·`InvalidSettings`·`Io`), `Problems(_, p)` → `Damaged { file_name: p[0].file_name }` | 불변 |
| 3 | 옛 매니페스트 `load_manifest`(실패 `Io`) → 이름 집합 = 옛 매니페스트 키(`stored_file_name`) ∪ 새 키 ∪ `alarm.wav`·`alarm.mp3`·`alarm.ogg` ∪ `manifest.json` → `FileBackup::capture` | `Io{changed: false}` | 불변 |
| 4 | `commit_files`: 새 PNG 전부 `write_atomic` → 옛에만 있던 PNG 삭제(NotFound 무시) → 알림음(있으면 `write_atomic(alarm_file_name)` + 다른 두 이름 삭제, 없으면 세 이름 삭제) → `build_manifest` → `save_manifest` | `changed = !backup.restore()` → `Io{source, changed}` | 되돌림 성공 = 불변 |
| 5 | `settings::update(settings, &paths.settings_file, \|cur\| file.settings.merge_into(cur))` | `changed = !backup.restore()` → `Settings{source, changed}` | 되돌림 성공 = 불변(`update` 실패는 메모리·파일 불변 — store.rs 계약) |
| 6 | `Ok(AppliedPreset { manifest })` | — | 새 상태 |

```rust
/// 새 매니페스트 — 파일을 쓴 뒤에 만든다(url의 ?v=가 새 수정 시각을 담도록).
fn build_manifest(assets_dir: &Path, images: &[(AssetSlot, Vec<u8>, PngInfo)]) -> AssetManifest {
    // entries = images 순서대로 AssetEntry { slot, file_name: stored_file_name(&slot), width, height,
    //           bytes: len, url: versioned_asset_url(&assets_dir.join(file_name)) }
    // canvas = None → recompute_canvas()
}
```

- `assets_dir`가 없으면 4 앞에서 `create_dir_all`(앱 시작이 이미 만들지만 방어).
- 프리셋 폴더는 **읽기만** 한다(PS-10). 쓰는 곳은 `assets/`·`settings.json`뿐이다. 「사용 중」 표시 없음.
- 설정 잠금은 5에서만(`update` 내부). 호출자는 설정 잠금을 쥔 채 `apply`를 부르면 안 된다(교착).
- 「프리셋에 없는 슬롯은 비워짐」 = 4의 「옛에만 있던 PNG 삭제」 + 새 매니페스트에 없음.
- `changed` 의미: **되돌림까지 실패했을 때만 `true`**(디스크 일부가 새 값·일부가 옛 값일 수 있음). 되돌림 성공은 `false` = 불변. `apply` 밖 함수는 항상 `false`.
- 5에서 새 설정이 현재와 같으면 `update`가 파일을 쓰지 않고 `Ok`다(store.rs:35) — 정상 경로.
- 화면 반영(이벤트 재방출·리사이즈·손 기준점·타이머 부수 효과)은 core가 하지 않는다. **반환값 `AppliedPreset.manifest`로 bridge가 emit한다**(§9).
- 함수 50줄 한계 — `apply` 본문은 단계 호출만, 세부는 `backup_names`·`commit_files`·`build_manifest`·`FileBackup`.

#### 3.7.4 `list` (`scan.rs`, PS-01·PS-09·U-4)

1. `presets_dir`가 없으면 `Ok(vec![])`. `read_dir` 실패 → `Io`.
2. 항목마다: 이름이 UTF-8이고 `is_valid_id` 통과 + `symlink_metadata` 링크 아닌 폴더 → `read_preset_file` → 성공이면 `summary`.
3. 실패한 폴더는 `log::warn!("preset: 건너뜀 id={id} code={}", e.code())`(경로 없음) 후 건너뛴다. 점으로 시작하는 임시 폴더는 2에서 이미 빠진다.
4. 정렬: `saved_at` 내림차순, 같으면 id 내림차순.

- 파일(PNG·알림음) 검사는 하지 않는다 — 빠르게(30개 ≤ 50 ms 목표, 02-design §7). 손상된 파일은 적용 때 `Damaged`로 드러난다.
- **부수 효과 없음** — `cleanup_leftovers`를 부르지 않는다.

#### 3.7.5 `rename` (`scan.rs`, PS-07)

`ensure_preset_dir` → `normalize_name(name)` → `read_preset_file(dir)` → `file.name = 정리된 이름` → `write_preset_file`(write_atomic) → `summary(id, &file)`. 폴더 이름(id)·`savedAt`은 바뀌지 않는다.

#### 3.7.6 `delete` (`scan.rs`, PS-07)

`ensure_preset_dir` → `cleanup_leftovers`(최선) → `fs::rename({id} → .trash-{id})`(실패 `Io` — 목록에서 즉시 사라지는 한 걸음) → `remove_dir_all(.trash-{id})`(실패는 경고만 — 다음 저장·가져오기·삭제 때 정리).

- `std::fs::remove_dir_all`은 Windows에서 링크·정션을 따라가지 않는다(Rust 1.58.1, CVE-2022-21658 수정 이후). 그래도 대상 자체가 링크가 아님을 먼저 본다(`ensure_preset_dir`).

#### 3.7.7 `export_to` (`write.rs`, PS-05·U-3)

1. `ensure_preset_dir` → `read_preset_file(dir)`.
2. `dest_parent.is_absolute()` && `dest_parent.is_dir()` → 아니면 `BadDir`.
3. `target = dest_parent.join(export_folder_name(&file.name))` → `fs::create_dir(target)` — `AlreadyExists` → `ExportExists`(대상 폴더 불변), 그 밖 → `Io`.
4. `preset.json` + `file.images`의 `{file_key}.png` + (있으면) 알림음만 `fs::copy`(**목록 기반, 폴더 나열 아님**). 원본이 링크·일반 파일 아님이면 `Io`.
5. 3 이후 실패 → `remove_dir_all(target)`(최선) → `Io`.
6. `Ok(PresetExportResult { folder_name })`.

- 내보내기는 파일 검증을 하지 않는다 — 받는 쪽 가져오기가 검증한다. zip 없음, `std::fs`만.

#### 3.7.8 `cleanup_leftovers` (`scan.rs`)

`presets_dir` 바로 아래에서 이름이 `.staging-`·`.trash-`로 시작하는 **링크 아닌 폴더**를 `remove_dir_all`(최선, 실패는 경고만). 저장·가져오기·삭제 시작 때 부른다. `list`에서는 부르지 않는다.

#### 3.7.9 링크 판정 (`scan.rs`)

```rust
/// Windows FILE_ATTRIBUTE_REPARSE_POINT — data_reset::wipe와 같은 값.
const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
/// data_reset::wipe::is_link_like와 같은 식. 모듈 간 비공개 공유 대신 여기 작은 순수 함수를 둔다.
pub(super) fn is_link_like(is_symlink: bool, file_attributes: u32) -> bool;
/// symlink_metadata 기준 링크 아닌 폴더/일반 파일. NotFound는 호출자가 구분할 수 있게 io::Result.
pub(super) fn is_plain_dir(path: &Path) -> std::io::Result<bool>;
pub(super) fn is_plain_file(path: &Path) -> std::io::Result<bool>;
```

- 속성은 `std::os::windows::fs::MetadataExt::file_attributes` — 안전한 std API다(`unsafe` 없음). 이 앱은 Windows 전용이다.

### 3.8 다른 모듈과의 관계

| 모듈 | 쓰는 것 | 변경 |
|---|---|---|
| `assets` | `AssetSlot`(serde·`file_key`·`is_canvas_layer`), `AssetManifest`·`AssetEntry`·`CanvasSize`·`PngInfo`, `parse_png_header`·`validate`·`load_manifest`·`save_manifest`·`ASSET_MAX_BYTES` | **가시성 4곳만 확대, 동작 불변**: `stored_file_name`·`read_capped` → `pub(crate)`, `AssetManifest::recompute_canvas` → `pub(crate)`, `versioned_asset_url` 재노출(`pub(crate) use url::versioned_asset_url;` + `url.rs:24` `pub(super)` → `pub(crate)`). [assets.md](assets.md) §3.18 |
| `assets::sound` | `AlarmFormat`·`ALARM_MAX_BYTES`·`detect_format`·`alarm_file_name`·`current` | 없음 |
| `settings` | `Settings`·`MouseSettings`·`TimerSettings`·`SettingsError`, **`update`(설정 쓰기 유일 창구, CR-047)**·`write_atomic`·`read_capped_string`·`MAX_TEXT_FILE_BYTES`·`IDLE_SECONDS_MIN/MAX`·`timer::normalize`·`Settings::validate` | 없음. 새 저장 경로를 만들지 않는다. [settings.md](settings.md) §3.12 |
| `data_reset` | 없음(링크 판정 식만 같다) | **없음**(U-1 = A). `wipe`는 `presets/` 하위 폴더에 들어가지 않는다. [data_reset.md](data_reset.md) §3.4 |
| `lib.rs` | `AppPaths` | `pub mod presets;` + `presets_dir()` 메서드. setup·시딩·세대 초기화 순서 **불변**. 앱 시작 때 프리셋 폴더를 읽지 않는다 |
| `bridge`·`window`·`tray`·`timer` | 없음 | core는 ui·bridge를 모른다. emit·창 조작 없음 |

## 4. 스레드·채널

없음. 모든 함수는 호출자 스레드에서 동기로 끝난다.

```
[메인 스레드 — 동기 command 핸들러(bridge)]
   └─ presets::{list, save, apply, export_to, import_from, rename, delete}
         ├─ std::fs (presets/, assets/, 사용자 폴더)
         └─ settings::update  ← 설정 Mutex는 save 3단계(복사 한 문장)·apply 5단계(update 내부)에서만
```

- 채널·스레드·타이머를 만들지 않는다. 앱 데이터를 쓰는 command는 동기라는 계약 §5.10 C-4 불변식이 동시 실행을 막는다(앱 데이터 쓰기가 메인 스레드에서 한 줄로 선다).
- 호출자는 설정 잠금을 쥔 채 `save`·`apply`를 부르지 않는다(교착 — 같은 스레드 재잠금).
- 지연 목표(02-design §7): 적용·저장·가져오기 15장·3MB ≤ 300 ms, 목록 30개 ≤ 50 ms. 최악 64장 × 1MiB면 메인 스레드가 1초 가까이 막힐 수 있다 — 입력 훅은 별도 스레드라 영향 없음.

## 5. unsafe

없음. 링크 판정은 `std::os::windows::fs::MetadataExt::file_attributes`(안전한 std API)를 쓴다.

## 6. 에러 타입

```rust
#[derive(Debug, thiserror::Error)]
pub enum PresetError {
    #[error("프리셋을 찾을 수 없습니다.")]
    NotFound,
    #[error("프리셋 이름은 1~50자여야 합니다.")]
    InvalidName,
    #[error("필수 그림(키보드 기본·팔)이 없어 프리셋을 만들 수 없습니다.")]
    MissingRequired,
    #[error("프리셋 폴더가 아닙니다(preset.json이 없습니다).")]
    NotPreset,
    #[error("프리셋 파일 형식이 올바르지 않습니다: {0}")]
    Format(String),
    #[error("프리셋의 설정값이 올바르지 않습니다: {0}")]
    InvalidSettings(String),
    #[error("저장된 프리셋이 손상되었습니다: {file_name}")]
    Damaged { file_name: String },
    #[error("폴더를 찾을 수 없습니다.")]
    BadDir,
    #[error("같은 이름의 폴더가 이미 있습니다.")]
    ExportExists,
    #[error("프리셋 파일을 읽거나 쓰지 못했습니다.")]
    Io { source: std::io::Error, changed: bool },
    /// SettingsError 문구 그대로. transparent는 필드가 하나일 때만 쓸 수 있어 "{source}"로 같은 표시를 낸다(§11.1 Δ1).
    #[error("{source}")]
    Settings { source: SettingsError, changed: bool },
}

impl PresetError {
    pub fn code(&self) -> &'static str;
    /// 적용 중 되돌림까지 실패해 디스크·메모리가 바뀌었을 수 있음 — bridge가 디스크 재방출을 한다.
    pub fn may_have_changed(&self) -> bool; // Io{changed}·Settings{changed}
}
```

| 변형 | code | 한국어 메시지 | 원인 |
|---|---|---|---|
| `NotFound` | `preset.not_found` | 프리셋을 찾을 수 없습니다. | id 규칙 위반(`..`·`/` 포함), 폴더 없음·링크·폴더 아님 |
| `InvalidName` | `preset.invalid_name` | 프리셋 이름은 1~50자여야 합니다. | 공백만·51자 이상·제어 문자(저장·이름 바꾸기 입력, 또는 `preset.json`의 이름) |
| `MissingRequired` | `preset.missing_required` | 필수 그림(키보드 기본·팔)이 없어 프리셋을 만들 수 없습니다. | 저장 때 매니페스트에 `kb_up`·`mouse_base` 없음(PS-08) |
| `NotPreset` | `preset.not_preset` | 프리셋 폴더가 아닙니다(preset.json이 없습니다). | `preset.json` 없음·링크·일반 파일 아님 |
| `Format(사유)` | `preset.format` | 프리셋 파일 형식이 올바르지 않습니다: {사유} | 1MiB 초과·JSON 오류·모르는 슬롯·형식 버전·중복 슬롯·64장 초과 |
| `InvalidSettings(문구)` | `preset.invalid_settings` | 프리셋의 설정값이 올바르지 않습니다: {문구} | 정규화 뒤 `Settings::validate` 실패(예: scale 5) |
| `Damaged { file_name }` | `preset.damaged` | 저장된 프리셋이 손상되었습니다: {파일 이름} | 적용 때 검증기가 문제를 찾음(첫 문제 파일 이름) |
| `BadDir` | `preset.bad_dir` | 폴더를 찾을 수 없습니다. | 가져오기·내보내기 경로가 상대 경로·없음·파일·링크 |
| `ExportExists` | `preset.export_exists` | 같은 이름의 폴더가 이미 있습니다. | 내보낼 위치에 같은 이름 폴더(U-3) |
| `Io { changed }` | `preset.io` | 프리셋 파일을 읽거나 쓰지 못했습니다. | 파일 IO 실패, 999번 id 선점 실패, 매니페스트 읽기 실패 |
| `Settings { source, changed }` | `source.code()` 그대로(`settings.io`·`settings.invalid`·`settings.format`·`state.poisoned`) | `SettingsError` 문구 그대로 | 저장 3단계 잠금 오염, 적용 5단계 `update` 실패 |

- **message에 경로·OS 원문을 넣지 않는다**(`Io`는 `{0}` 없음 — `ResetError` 선례). `Format` 사유는 고정 문구, `Damaged`는 파일 이름만. 로그는 `io::ErrorKind`·파일 이름·code만.
- `changed`는 **되돌림이 실패했을 때만** `true`. `apply` 밖에서는 항상 `false`. `may_have_changed()` = `matches!(self, Io{changed: true, ..} | Settings{changed: true, ..})`.
- 문제 전용 code(`PresetProblem.code`에만 나온다): `preset.file_missing`·`preset.file_link`(`load.rs` 상수) + 재사용 `preset.missing_required`·`preset.io`·기존 `asset.*`·`sound.*`.
- code 문자열의 정본은 `code()` 하나다(계약 §6에 그대로 오른다). `preset.forbidden`은 core 에러가 아니다(bridge 호출 창 판정).
- `From<PresetError> for BridgeError`는 `error.rs`에 두지 않는다 — bridge가 `bridge/types.rs`에 둔다(ResetError 선례, §9).

## 7. 설정 의존

| `Settings` 필드 | 분류 | `save`(읽기) | `apply`(쓰기, `update` 한 번) |
|---|---|---|---|
| `scale` | PS-02 | 복사 | 프리셋 값 |
| `idle_seconds` | PS-02 | 복사 | 프리셋 값(읽을 때 60~3600 clamp) |
| `mouse`(shoulder·area·partPos·hand·penPos·penMode) | PS-02 | 복사 | 프리셋 값(`null` 포함 통째로) |
| `timer`(enabled·mode·countdownSecs·alarmVolume·textPos·rotation·fontSize·color) | PS-02 | 복사 | 프리셋 값(통째로, 읽을 때 `timer::normalize`) |
| `overlay`(x·y·visible) | PS-03 | 안 읽음 | 유지 |
| `autostart` | PS-03 | 안 읽음 | 유지 |
| `language` | PS-03 | 안 읽음 | 유지 |
| `position_lock` | PS-03 | 안 읽음 | 유지 |
| `show_in_taskbar` | PS-03 | 안 읽음 | 유지 |

- **분류 가드**: `from_settings`가 `Settings`를 필드 이름 전부로 구조 분해한다(`..` 없음). 나중에 `Settings`에 필드가 생기면 컴파일이 깨져 PS-02/PS-03 중 어디에 넣을지 결정하게 강제한다.
- `settings.json` 스키마·`Settings` 구조체 변경 없음. 새 영속 데이터는 `presets/{id}/preset.json`(§3.2)이다.
- 쓰기는 `settings::update` 하나(CR-047). `merge_into`는 클로저 안에서 순수 대입만 한다.

## 8. 테스트 계획

공통 도우미: tempdir, PNG는 기존 `png_header(w, h, 8, 6)` 방식(IHDR만 있는 최소 PNG) 헬퍼, `AppPaths { data_dir, assets_dir, settings_file }` 리터럴, `Mutex::new(Settings::default())`. 모든 이름은 권고(패킷 §7).

### 8.1 단위 (`#[cfg(test)] mod tests`)

| 파일 | 테스트 | 조건 → 기대 |
|---|---|---|
| `format.rs` | `preset_settings_has_exactly_ps02_fields` | `PresetSettings::default()` JSON 키 = `scale`·`idleSeconds`·`mouse`·`timer` 4개 |
| `format.rs` | `merge_into_keeps_pc_local_fields` | overlay·autostart·language·positionLock·showInTaskbar를 기본과 다르게 둔 `Settings`에 병합 → 5필드 불변, 4필드 = 프리셋 값 |
| `format.rs` | `preset_file_round_trip` | 직렬화 → 역직렬화 같음 |
| `format.rs` | `unknown_format_version_rejected` | `formatVersion: 2` → `Format` |
| `format.rs` | `unknown_slot_rejected` | `images: ["nope"]` → `Format` |
| `format.rs` | `duplicate_slot_rejected` | `kb_up` 두 번 → `Format` |
| `format.rs` | `too_many_images_rejected` | 65개 → `Format` |
| `format.rs` | `settings_normalized_on_read` | `idleSeconds: 10` → 60, 잘못된 `timer.color` → 기본 |
| `format.rs` | `invalid_settings_rejected` | `scale: 5` → `InvalidSettings` |
| `format.rs` | `normalize_name_table` | 공백만·51자·제어 문자 거부, 앞뒤 공백 제거, 한글 50자 허용 |
| `format.rs` | `is_valid_id_table` | `..`·`a/b`·`A`·`.staging-1`·41자 거부, `1790000000000`·`1790000000000-2` 허용 |
| `format.rs` | `claim_staging_skips_taken_ids` | `{now}`·`.staging-{now}` 선점 상태 → `{now}-1`… |
| `format.rs` | `export_folder_name_table` | §3.5 표 5행 |
| `scan.rs` | `is_link_like_table` | 링크·재분석·둘 다 참, 0·폴더(0x10) 거짓(`list_skips_link_dirs` 대체용) |
| `mod.rs` | `preset_error_codes` | 변형 11개 → preset code 10개 + `Settings` 위임 code. `load::CODE_FILE_MISSING`·`CODE_FILE_LINK` 값 확인. `preset.forbidden` 없음 |
| `mod.rs` | `messages_have_no_path` | 모든 변형(tempdir 경로를 담은 io::Error 포함) `to_string()`에 tempdir 경로 문자열·`\\`·드라이브 문자 없음 |
| `mod.rs` | `may_have_changed_only_when_rollback_failed` | `Io/Settings{changed: true}`만 참 |

### 8.2 통합 (`src-tauri/tests/presets.rs`, tempdir, 공개 API만)

| 영역 | 테스트 |
|---|---|
| 저장 | `save_creates_folder_with_all_files`, `save_copies_every_manifest_slot_and_alarm`, `save_without_required_rejected`(디스크에 폴더 없음), `save_failure_leaves_no_folder`(매니페스트 항목의 `.png`를 폴더로 만들어 6단계 실패 주입 → `presets/`에 `.staging-*`·새 폴더 없음), `duplicate_names_allowed` |
| 목록 | `list_empty_when_no_dir`, `list_sorted_newest_first`(같은 `savedAt`이면 id 내림차순), `list_skips_broken_and_staging`, `list_skips_link_dirs`(링크 생성 권한이 없으면 건너뛰고 §8.1 `is_link_like_table`로 대체) |
| 가져오기 | `import_rejects_missing_file`, `import_rejects_canvas_mismatch`, `import_rejects_non_rgba`, `import_rejects_over_1mib_before_read`, `import_rejects_wrong_alarm_format`, `import_reports_all_problems`(3개 문제 → problems 3), `import_reports_missing_required`, `import_writes_nothing_on_problem`(presets_dir 불변), `import_not_preset_folder`, `import_bad_dir`(상대 경로·파일), `import_ignores_extra_files`(`../evil.png`·`sub/`가 있어도 복사 안 됨), `import_keeps_saved_at`, `import_round_trip_equals_export`(export → import → 파일 바이트·settings 동일) |
| 적용 | `apply_replaces_all_and_clears_missing_slots`(옛 hair·kb_down_0 파일·항목 삭제), `apply_sets_ps02_settings_only`, `apply_keeps_pc_local_fields`, `apply_replaces_alarm_or_removes_it`, `apply_damaged_changes_nothing`(프리셋 PNG 하나를 RGB로 → assets·settings 바이트 동일, `Damaged`), `apply_rolls_back_on_settings_failure`(settings.json 경로를 폴더로 막아 `update` 실패 → assets·manifest 바이트 원복, `may_have_changed() == false`), `apply_then_edit_does_not_touch_preset`(PS-10), `apply_canvas_from_preset_not_current`(현재 900×700 → 프리셋 450×350 성공), `apply_unknown_id_not_found`(`../x` 포함) |
| 이름·삭제·내보내기 | `rename_keeps_id`, `rename_blank_rejected`, `delete_removes_folder`, `delete_unknown_not_found`, `export_copies_listed_files_only`, `export_existing_folder_rejected`(대상 폴더 불변), `export_bad_dir` |
| 지연(기록용) | `apply_latency_report_15_images` — 15장 프리셋 적용 `Instant` 측정값을 출력(목표 ≤ 300 ms, 실패 조건 아님) |

- **`apply_rolls_back_on_settings_failure` 전제**: 프리셋의 PS-02 설정이 현재 메모리와 **달라야** 한다. 같으면 `update`가 파일을 쓰지 않고 `Ok`를 돌려(store.rs:35) 실패가 주입되지 않는다.
- 파일 크기가 800줄을 넘으면 적용 영역을 `tests/presets_apply.rs`로 나누고 도우미는 두 파일에 작은 사본을 둔다(§11.1 Δ5).
- 증거: `cd src-tauri && cargo fmt --check` · `cargo clippy -- -D warnings`(경고 0) · `cargo test`(기존 전부 + 신규 PASS 수).

### 8.3 수동 체크리스트 (bridge·ui 반영 뒤, verify 단계)

- [ ] 저장 → 탐색기에서 `%APPDATA%\com.kuro.keyviewer\presets\{id}\`에 `preset.json`·PNG·알림음이 있다.
- [ ] 다른 그림으로 바꾼 뒤 적용 → 오버레이·설정 창이 프리셋 그림·배율로 바뀌고, 창 위치·언어는 그대로다.
- [ ] 적용 직후 오버레이가 PNG를 읽는 중에도 실패하지 않는다(실패하면 `preset.io`이고 그림이 옛 상태 그대로인지 — 02-design §7 위험 ①).
- [ ] 내보내기 → 다른 PC(또는 데이터 폴더를 비운 뒤) 가져오기 → 같은 모습.
- [ ] 전체 초기화 뒤에도 프리셋 목록이 남아 있다(U-1).

## 9. bridge 요구 명세 (계약 확정은 bridge-designer)

완료 마커 한 줄: **「presets 공개 API 7개·`PresetError::code()/may_have_changed()`·보고서 타입 4개 준비 완료, `generate_handler!` 미등록」**.

| 받을 명령(후보) | core 함수 | 인자 | 반환 | 빈도 | 실패 |
|---|---|---|---|---|---|
| `list_presets` | `list(&paths.presets_dir())` | — | `PresetSummary[]` | 탭 열 때·변경 뒤 | `preset.io` |
| `save_preset` | `save(&paths, &state.settings, &name, now_ms)` | `name: string` | `PresetSummary` | 사용자 클릭 | §6 |
| `apply_preset` | `apply(&paths, &id, &state.settings)` | `id: string` | `void`(뒤처리 입력 = `AppliedPreset.manifest`) | 사용자 클릭(확인창 뒤) | §6 |
| `export_preset` | `export_to(&paths.presets_dir(), &id, &dir)` | `id, dir: string` | `PresetExportResult` | 사용자 클릭 | §6 |
| `import_preset` | `import_from(&paths.presets_dir(), &dir, now_ms)` | `dir: string` | `PresetImportReport`(파일별 문제는 reject 아님) | 사용자 클릭 | §6 |
| `rename_preset` | `rename(&paths.presets_dir(), &id, &name)` | `id, name: string` | `PresetSummary` | 사용자 입력 | §6 |
| `delete_preset` | `delete(&paths.presets_dir(), &id)` | `id: string` | `void` | 사용자 클릭(확인창 뒤) | §6 |

- **내보낼 사건: 없음.** core는 emit하지 않는다. 적용 뒤 화면 반영은 **반환값 `AppliedPreset.manifest`로 bridge가 emit**한다(`settings://changed` → `assets://changed`·리사이즈·손 기준점·타이머 부수 효과 — 02-design §3.6, data_reset 선례).
- `Err(e)`이고 `e.may_have_changed()`면 bridge가 디스크를 다시 읽어 재방출한 뒤 에러를 돌려준다. 아니면 그대로 반환(이벤트 없음).
- `now_ms`는 bridge가 `SystemTime::now()`로 만든다. 설정 잠금은 쥔 채로 `save`·`apply`를 부르지 않는다(`old_timer` 복사는 문장 끝에서 해제).
- `From<PresetError> for BridgeError`는 **`bridge/types.rs`**에 둔다(code = `e.code()`, message = `e.to_string()`). `error.rs` 아님.
- `PresetSummary`·`PresetProblem`·`PresetImportReport`·`PresetExportResult`는 `Serialize`(camelCase)만 — command 반환 전용. TS `PRESET_NAME_MAX = 50` ↔ `NAME_MAX_CHARS`.
- 호출 창 제한(`preset.forbidden`, A-5)은 bridge 판정이다. 모든 command는 **동기**.
- `generate_handler!` 등록 7줄은 `lib.rs`(core 소유)라 bridge 단계에서 core-implementer가 한다.

## 10. 요구 추적표

| 요구ID | 반영 절 | 테스트 | 상태 |
|---|---|---|---|
| PS-01 | §2 `save`·`list`, §3.7.1·§3.7.4 | `save_creates_folder_with_all_files`·`list_sorted_newest_first`·`list_empty_when_no_dir` | ✅ 설계 · 소스 미적용 |
| PS-02 | §3.2 `PresetSettings`·`images`·`alarm`, §7 | `preset_settings_has_exactly_ps02_fields`·`save_copies_every_manifest_slot_and_alarm`·`apply_sets_ps02_settings_only` | ✅ 설계 · 소스 미적용 |
| PS-03 | §3.2 `from_settings`·`merge_into`, §7 분류 가드 | `merge_into_keeps_pc_local_fields`·`apply_keeps_pc_local_fields` | ✅ 설계 · 소스 미적용 |
| PS-04 (core) | §3.7.3 `apply`·`FileBackup`, §6 `may_have_changed` | `apply_replaces_all_and_clears_missing_slots`·`apply_replaces_alarm_or_removes_it`·`apply_damaged_changes_nothing`·`apply_rolls_back_on_settings_failure`·`apply_canvas_from_preset_not_current`·`apply_unknown_id_not_found` | ✅ 설계 · 소스 미적용 |
| PS-05 | §3.5·§3.7.7 | `export_copies_listed_files_only`·`export_existing_folder_rejected`·`export_bad_dir`·`export_folder_name_table` | ✅ 설계 · 소스 미적용 |
| PS-06 | §3.6 `load_dir`·§3.7.2, §3.2 폴더 수준 검사 | `import_rejects_*` 5종·`import_reports_all_problems`·`import_reports_missing_required`·`import_writes_nothing_on_problem`·`import_not_preset_folder`·`import_bad_dir`·`import_ignores_extra_files`·`import_keeps_saved_at`·`import_round_trip_equals_export`·`unknown_slot_rejected`·`duplicate_slot_rejected`·`too_many_images_rejected`·`unknown_format_version_rejected` | ✅ 설계 · 소스 미적용 |
| PS-07 | §3.3·§3.7.5·§3.7.6 | `normalize_name_table`·`rename_keeps_id`·`rename_blank_rejected`·`duplicate_names_allowed`·`delete_removes_folder`·`delete_unknown_not_found` | ✅ 설계 · 소스 미적용 |
| PS-08 (core 방어) | §3.7.1 2단계 | `save_without_required_rejected` | ✅ 설계 · 소스 미적용 |
| PS-09 (core 부분) | §3.7.4 `list`·`PresetSummary` | `list_sorted_newest_first`·`list_skips_broken_and_staging`·`list_skips_link_dirs` | ✅ 설계 · 소스 미적용 (탭 UI는 ui) |
| PS-10 | §3.7.3 「프리셋 폴더는 읽기만」 | `apply_then_edit_does_not_touch_preset` | ✅ 설계 · 소스 미적용 |

## 11. 설계 결정 노트

### 11.1 패킷(`presets-03-packet-core.md`) 대비 델타

| # | 패킷 | 이 문서 | 이유 |
|---|---|---|---|
| Δ1 | `#[error(transparent)] Settings { source: SettingsError, changed: bool }` | `#[error("{source}")] Settings { source, changed }` | thiserror의 `transparent`는 필드가 정확히 하나일 때만 컴파일된다. `"{source}"`는 같은 Display를 내고, 이름이 `source`인 필드는 자동으로 `source()`가 된다. 동작·code·message 불변 |
| Δ2 | `pub(crate) use url::versioned_asset_url;` 추가만 | 더해서 `assets/url.rs:24` `pub(super) fn` → `pub(crate) fn` | `pub(super)` 항목은 그보다 넓게 재노출할 수 없다(rustc E0364). 동작 불변 — [assets.md](assets.md) §3.18 |
| Δ3 | 검증기 표 「`read_capped` 실패 → 그 에러 code」 | 알림음의 `read_capped` `TooManyBytes`는 `sound.too_many_bytes` | 알림음 크기 문제는 선검사(6행)와 같은 `sound.*` code로 맞춘다. 그림은 `asset.too_many_bytes` 그대로 |
| Δ4 | `pub(crate)` 표기(format·load 항목) | `pub(super)`로 좁혀도 됨(구현자 재량) | 모듈 밖 사용처가 없다. clippy·동작 차이 없음 |
| Δ5 | `tests/presets.rs` 한 파일 | 800줄을 넘으면 `tests/presets_apply.rs`로 분리 | 테스트 약 50개로 한계 근접(golden-principles §1). 완료 마커(`tests/presets.rs` 존재)는 그대로 |
| Δ6 | (명시 없음) | `ensure_preset_dir`·`commit_staging`·`write_preset_file`·`check_presets_dir`·`check_image`·`check_alarm`·`is_plain_dir`·`is_plain_file` 비공개 도우미 이름 | 함수 50줄 한계와 중복 제거용 내부 이름. 공개 API 불변 |
| Δ7 | (명시 없음) | 테스트 `apply_latency_report_15_images`, `is_link_like_table` 이름 부여 | 패킷 §7의 「측정값 출력」·「표 테스트로 대체」를 이름 붙인 것 |

공개 API 7개·타입·에러 변형·code·검증 순서·알고리즘은 패킷과 같다.

### 11.2 결정

- **D-P1 폴더 수준 에러는 적용에서도 그대로 전파** — 저장된 프리셋의 `preset.json`이 손상되면 `apply`는 `preset.format`·`preset.not_preset` 등을 그대로 돌려준다(패킷 §5.3-2). 파일 문제(`Problems`)만 `Damaged`로 묶는다. 02-design §3.2 2행은 `format`·`invalid_settings`·`damaged`만 적었지만 `not_preset`·`invalid_name`·`io`도 같은 경로에서 나온다(확인 필요 C-1).
- **D-P2 저장은 현재 파일을 다시 검증하지 않는다** — `assets/`는 import 때 이미 검증됐다. 대신 가져오기·적용이 항상 검증기를 거친다.
- **D-P3 적용 백업은 메모리** — 폴더 통째 교체(`assets` ↔ `assets.next` rename)는 WebView가 파일을 여는 중이면 실패할 수 있어 택하지 않았다(A-6). 파일 단위 `write_atomic`은 검증된 경로다.
- **D-P4 링크 판정 함수 복제** — `data_reset::wipe::is_link_like`(비공개)를 공개하지 않고 같은 3줄 함수를 `scan.rs`에 둔다(패킷 §4). 모듈 간 결합보다 단순하다.

### 11.3 파급 (Grep 2026-09-30)

- `stored_file_name`·`read_capped`·`recompute_canvas`·`versioned_asset_url`: 가시성만 넓힌다. 기존 호출자(`assets/mod.rs`·`sound.rs`·`anchor.rs`·`manifest_load.rs`·`defaults.rs`·`export.rs`)의 동작·시그니처 불변.
- `AppPaths`: 필드 불변 → `tests/data_reset.rs` 등 구조체 리터럴 영향 없음.
- bridge·ui·계약: 이 단계에서 변경 없음(bridge 패킷 몫). `error.rs` 불변.
- `data_reset`: 코드 불변(U-1 = A). 문서 한 줄([data_reset.md](data_reset.md) §3.4).

### 11.4 확인 필요

- **C-1** 적용 때 저장된 프리셋의 `preset.json`이 없거나 손상되면 ui는 `preset.not_preset`·`preset.format`을 받는다(D-P1). ui 문구가 「가져오기」 맥락으로만 쓰여 있으면 적용 실패 문구로 어색할 수 있다 — `Damaged { file_name: "preset.json" }`로 묶을지 bridge·ui 설계 때 판단(패킷대로 두었다).
- **C-2** `Settings{source}`의 message는 `SettingsError` 문구 그대로다. `SettingsError::Io("{0}")`는 io 에러 문구를 담는다 — 경로는 없지만 OS 원문이 들어갈 수 있다(`ResetError::Settings` 선례와 같음). `messages_have_no_path`는 경로·드라이브 문자만 검사한다.
- **C-3** 02-design §7 위험 ① — 적용 순간 WebView2가 기존 PNG를 읽는 중이면 `write_atomic`의 rename이 공유 위반으로 실패할 수 있다(되돌림 후 `preset.io`, 데이터 안전). 실측은 verify 단계.
- **C-4** U-1이 B(초기화 때 프리셋도 삭제)로 바뀌면 [data_reset.md](data_reset.md) §3.4와 이 문서 §3.8을 다시 받는다.
