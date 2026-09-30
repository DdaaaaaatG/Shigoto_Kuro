# presets 인계 패킷 — core

- 받는 세션: `claude --agent core-manager` (작업 모드: **보강**)
- 전반 설계: `doc/200_설계/architecture/presets-02-design.md`. 이 패킷과 어긋나면 02-design이 맞다.
- 전략: `core-design-strategy`, `.claude/skills/rust-rules.md`, `.claude/rules/golden-principles.md`(Rust 파일 800줄·함수 50줄). **`unsafe` 없음**(이 작업에 필요 없다).
- 순서: core-designer가 `doc/200_설계/core/presets.md`를 새로 쓰고 `assets.md`·`settings.md`·`data_reset.md`를 동기화 → core-implementer가 구현.

## 선행 조건

- 첫 계층이라 앞 계층의 완료 마커는 없다.
- **새 의존성 없음.** `Cargo.toml` 수정 없음. `tempfile`은 이미 dev-dependency.
- 사용자 결정 U-1~U-7은 권고안으로 반영돼 있다(02-design §5a). 결정이 바뀌면 이 패킷의 해당 절(표시)만 바뀐다.

## 요구ID

PS-01(저장·목록), PS-02(담는 필드), PS-03(PC별 필드 유지), PS-04(적용 core 부분), PS-05(내보내기), PS-06(가져오기 검증), PS-07(이름 바꾸기·삭제·이름 규칙), PS-08(저장 방어 검사), PS-10(적용 = 복사).

## 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src-tauri/src/presets/mod.rs` (**신규**) | 상수·공개 타입·`PresetError`·공개 함수 7개(재노출) |
| `src-tauri/src/presets/format.rs` (**신규**) | `PresetFile`·`PresetSettings`(serde)·`merge_into`·`from_settings`·이름 규칙·id 규칙·id 생성·`export_folder_name` |
| `src-tauri/src/presets/load.rs` (**신규**) | 폴더 검증기(가져오기·적용 공용) — `ValidatedPreset`·`PresetProblem` 수집 |
| `src-tauri/src/presets/scan.rs` (**신규**) | `list`·`rename`·`delete`·남은 임시 폴더 정리·링크 판정 |
| `src-tauri/src/presets/write.rs` (**신규**) | `save`·`import_from`(스테이징 → rename)·`export_to` |
| `src-tauri/src/presets/apply.rs` (**신규**) | `apply`(백업 → 교체 → 설정 병합 → 되돌림) |
| `src-tauri/src/assets/mod.rs` | 가시성만: `stored_file_name`·`read_capped` → `pub(crate)`, `AssetManifest::recompute_canvas` → `pub(crate)`, `pub(crate) use url::versioned_asset_url;` 추가. **동작 불변** |
| `src-tauri/src/lib.rs` | `pub mod presets;` + `impl AppPaths { pub fn presets_dir(&self) -> PathBuf }` 1개. `AppPaths` 필드는 **늘리지 않는다**(통합 테스트가 구조체 리터럴로 만든다). **`generate_handler!`는 이 단계에서 건드리지 않는다**(bridge 단계 §bridge 패킷 6에서 core-implementer가 등록) |
| `src-tauri/tests/presets.rs` (**신규**) | 통합 테스트(§7) |
| `doc/200_설계/core/presets.md` (**신규**) · `assets.md` · `settings.md` · `data_reset.md` | 설계 동기화(core-designer) |

파일 크기 권고: 모듈 전체 합이 800줄을 넘을 것이므로 위처럼 6개로 나눈다. 테스트는 각 파일 `#[cfg(test)]` + `tests/presets.rs`.

## 1. 공개 API (`presets/mod.rs`)

비유: 옷장 관리인. 옷걸이(폴더)에 이름표(`preset.json`)를 붙여 걸고, 꺼낼 때는 옷을 전부 살핀 다음 지금 옷을 사진 찍어 두고 갈아입힌다.

```rust
//! [목적] 프리셋(PS-01~PS-10) — 그림·알림음·설정(PS-02 필드) 한 벌을 presets/{id}/ 폴더에 저장·적용·
//!        내보내기·가져오기·이름 바꾸기·삭제. presets-02-design.md.
//! [형식] preset.json(formatVersion 1) + {file_key}.png + alarm.{wav|mp3|ogg}. 파일 이름은 슬롯·형식에서만
//!        만든다(JSON에 파일 이름 문자열 없음).
//! [보안] 사용자 문자열은 경로 조각이 되지 않는다(id는 규칙 검사, 이름은 내보내기 때만 정화). 링크·재분석
//!        지점 거부, 크기 선검사 후 상한 읽기(SEC-003 방식), 검증에 쓴 바이트를 그대로 쓴다.
//! [스레드] 없음. 호출자(동기 command, 메인 스레드) 스레드에서 실행 — 계약 §5.10 C-4 불변식.
//! [unsafe] 없음.

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

pub fn list(presets_dir: &Path) -> Result<Vec<PresetSummary>, PresetError>;
pub fn save(paths: &AppPaths, settings: &Mutex<Settings>, name: &str, now_ms: u64) -> Result<PresetSummary, PresetError>;
pub fn apply(paths: &AppPaths, id: &str, settings: &Mutex<Settings>) -> Result<AppliedPreset, PresetError>;
pub fn export_to(presets_dir: &Path, id: &str, dest_parent: &Path) -> Result<PresetExportResult, PresetError>;
pub fn import_from(presets_dir: &Path, src: &Path, now_ms: u64) -> Result<PresetImportReport, PresetError>;
pub fn rename(presets_dir: &Path, id: &str, name: &str) -> Result<PresetSummary, PresetError>;
pub fn delete(presets_dir: &Path, id: &str) -> Result<(), PresetError>;
```

- `now_ms`(Unix ms)는 호출자가 넣는다 — id 생성·`savedAt`을 테스트에서 고정하기 위해(`window/placement.rs` 시각 주입 선례). bridge는 `SystemTime::now()`로 만든다.
- `id: &str`를 받는 모든 함수는 **첫 줄에서** id 규칙(§2.3)을 검사하고, 어긋나면 `NotFound`(존재 여부를 흘리지 않는다).
- `lib.rs`: `impl AppPaths { pub fn presets_dir(&self) -> std::path::PathBuf { self.data_dir.join(presets::PRESETS_DIR) } }`.

## 2. 형식 (`presets/format.rs`)

### 2.1 `preset.json` 구조체

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
impl Default for PresetSettings { /* Settings::default()에서 4필드 */ }

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
    /// Settings { 4필드, ..Settings::default() }.validate() — 실패는 PresetError::InvalidSettings.
    pub fn validate(&self) -> Result<(), PresetError>;
}
```

- 직렬화는 `to_string_pretty`. 읽기는 `settings::read_capped_string(path, MAX_TEXT_FILE_BYTES)`(1MiB).
- 폴더 수준 파싱 함수 `pub(crate) fn read_preset_file(dir: &Path) -> Result<PresetFile, PresetError>`: 없음·링크·일반 파일 아님 → `NotPreset`, 크기 초과·JSON 오류·`format_version != FORMAT_VERSION`·중복 슬롯(`file_key` 기준)·`images.len() > MAX_IMAGES` → `Format(사유)`, 이름 규칙 → `InvalidName`, 설정 → `normalized()` 후 `validate()` → `InvalidSettings`. `list`·`rename`·`export_to`·검증기가 공유한다.

### 2.2 이름 규칙 (A-8, U-7)

```rust
/// 앞뒤 공백 제거 후 1..=NAME_MAX_CHARS 글자(chars().count()), char::is_control 없음. 통과하면 정리된 이름.
pub(crate) fn normalize_name(raw: &str) -> Result<String, PresetError>; // 실패 InvalidName
```

### 2.3 id 규칙 (A-3)

```rust
/// ^[0-9a-z][0-9a-z-]{0,39}$ — 정규식 크레이트 없이 바이트 검사.
pub(crate) fn is_valid_id(id: &str) -> bool;
/// "{now_ms}" 또는 "{now_ms}-{n}"(n=1..=999). 후보마다 `fs::create_dir(presets_dir/.staging-{후보})`가
/// 성공할 때까지 — 동시에 `presets_dir/{후보}`도 없어야 한다. 999번 모두 실패하면 Io.
pub(crate) fn claim_staging(presets_dir: &Path, now_ms: u64) -> Result<(String, PathBuf), PresetError>;
```

- 스테이징 이름 `.staging-{id}`, 삭제 대기 `.trash-{id}` — 점으로 시작해 id 규칙에 걸리지 않으므로 `list`가 자연히 건너뛴다.

### 2.4 내보내기 폴더 이름

```rust
/// < > : " / \ | ? * 와 제어 문자 → '_', 끝의 '.'·' ' 제거, 예약 이름(CON PRN AUX NUL COM1-9 LPT1-9 —
/// 대소문자 무시, 첫 '.' 앞부분 기준)이면 뒤에 '_', 비면 "preset".
pub(crate) fn export_folder_name(name: &str) -> String;
```

## 3. 에러

```rust
#[derive(Debug, thiserror::Error)]
pub enum PresetError {
    #[error("프리셋을 찾을 수 없습니다.")]                               NotFound,          // preset.not_found
    #[error("프리셋 이름은 1~50자여야 합니다.")]                          InvalidName,       // preset.invalid_name
    #[error("필수 그림(키보드 기본·팔)이 없어 프리셋을 만들 수 없습니다.")] MissingRequired,   // preset.missing_required
    #[error("프리셋 폴더가 아닙니다(preset.json이 없습니다).")]            NotPreset,         // preset.not_preset
    #[error("프리셋 파일 형식이 올바르지 않습니다: {0}")]                  Format(String),    // preset.format — 사유만, 경로·원문 값 없음
    #[error("프리셋의 설정값이 올바르지 않습니다: {0}")]                   InvalidSettings(String), // preset.invalid_settings — SettingsError 규칙 문구
    #[error("저장된 프리셋이 손상되었습니다: {file_name}")]                Damaged { file_name: String }, // preset.damaged
    #[error("폴더를 찾을 수 없습니다.")]                                  BadDir,            // preset.bad_dir
    #[error("같은 이름의 폴더가 이미 있습니다.")]                          ExportExists,      // preset.export_exists
    #[error("프리셋 파일을 읽거나 쓰지 못했습니다.")]                      Io { source: std::io::Error, changed: bool }, // preset.io
    #[error(transparent)]                                                  Settings { source: SettingsError, changed: bool }, // e.code() 그대로
}
impl PresetError {
    pub fn code(&self) -> &'static str;
    /// 적용 중 되돌림까지 실패해 디스크·메모리가 바뀌었을 수 있음 — bridge가 디스크 재방출을 한다.
    pub fn may_have_changed(&self) -> bool; // Io{changed}·Settings{changed}
}
```

- **message에 경로·OS 원문을 넣지 않는다**(`Io`는 `{0}` 없음 — `ResetError` 선례). 로그는 `io::ErrorKind`·파일 이름만.
- `Io`·`Settings`의 `changed`는 **되돌림이 실패했을 때만** `true`(되돌림 성공 = 불변 = `false`). `apply` 밖에서는 항상 `false`.
- code 문자열의 정본은 `code()` 하나(계약 §6에 그대로 오른다). `preset.forbidden`은 core 에러가 아니다(bridge 판정 — bridge 패킷).

## 4. 검증기 (`presets/load.rs`) — 가져오기·적용 공용

```rust
pub(crate) struct ValidatedPreset {
    pub file: PresetFile,                                  // normalized 설정
    pub images: Vec<(AssetSlot, Vec<u8>, PngInfo)>,        // file.images 순서
    pub alarm: Option<(AlarmFormat, Vec<u8>)>,
}
pub(crate) enum Loaded { Ok(ValidatedPreset), Problems(PresetFile, Vec<PresetProblem>) }
pub(crate) fn load_dir(dir: &Path) -> Result<Loaded, PresetError>; // 폴더 수준 에러는 Err
```

파일마다 아래 순서로 처음 걸린 문제 하나만 기록하고, **모든 파일을 끝까지 본다**(U-2):

| 검사 | 문제 code |
|---|---|
| `file.images`에 `kb_up`·`mouse_base` 중 없는 것(파일 검사 전, 없는 것마다 1개) | `preset.missing_required`, fileName = `kb_up.png`·`mouse_base.png` |
| `dir.join(stored_file_name(slot))`의 `symlink_metadata` — `NotFound` | `preset.file_missing` |
| 링크·재분석 지점(`is_symlink() \|\| attrs & 0x400`)·일반 파일 아님 | `preset.file_link` |
| `len > ASSET_MAX_BYTES`(읽기 전) | `asset.too_many_bytes` |
| `read_capped` 실패 | 그 에러 code(`asset.too_many_bytes`·`asset.io`) — `asset.io`는 `preset.io`로 바꿔 싣는다 |
| `parse_png_header` → `validate(&info, len, &slot, group)` | 그 `AssetError::code()` |
| 알림음: 위 링크·크기(`ALARM_MAX_BYTES` → `sound.too_many_bytes`) 검사 → `detect_format(bytes) == Some(선언)` 아니면 | `sound.not_audio` |

- `group` = `file.images` 순서에서 **이미 통과한** 첫 캔버스 레이어의 크기(`slot.is_canvas_layer()`), 없으면 `None`. 마우스 파츠·펜 그림은 항상 `None`(CR-036).
- 링크 판정 `is_link_like(is_symlink, attrs)`는 `data_reset::wipe`와 같은 식이다. 모듈 간 비공개 공유 대신 `presets/scan.rs`에 같은 작은 순수 함수를 둔다(`std::os::windows::fs::MetadataExt::file_attributes` — 안전한 std API).
- 경로는 `dir.join(PRESET_FILE)`·`dir.join(stored_file_name(slot))`·`dir.join(alarm_file_name(fmt))`만 만든다.

## 5. 동작 (알고리즘은 02-design §3 정본, 여기는 구현 요점)

### 5.1 `save` (`write.rs`)
1. `normalize_name` → 2. `assets::load_manifest(assets_dir)`(실패 `Io`) — `kb_up`·`mouse_base` 없으면 `MissingRequired` → 3. 설정 잠금 한 문장으로 `PresetSettings::from_settings` 복사(오염 `Settings{StatePoisoned}`) → 4. `sound::current`(실패 `Io`) → 5. `cleanup_leftovers`(최선) → `claim_staging` → 6. 매니페스트 순서대로 각 `{file_key}.png`: `symlink_metadata` 일반 파일 확인(아니면 `Io`) → `read_capped` → 스테이징에 `fs::write` → 알림음 같음 → `preset.json` `write_atomic` → 7. `fs::rename(staging, presets_dir/{id})`. 6·7 실패 → 스테이징 `remove_dir_all`(최선, 경고) → `Io`.
- `presets_dir`가 없으면 `create_dir_all`(자기 자신이 링크면 `Io` — 폴더 자체 링크 검사 `check_presets_dir`).

### 5.2 `import_from` (`write.rs`)
1. `src` 절대 경로·`symlink_metadata`가 링크 아닌 폴더 → 아니면 `BadDir` → 2. `load_dir(src)` — `Problems` → `Ok(Report{preset: None, problems})`(디스크 불변) → 3. `cleanup_leftovers` → `claim_staging` → 검증된 **바이트 그대로** 쓰기 → `preset.json` = `file`(정규화) 재직렬화 → rename → `Ok(Report{preset: Some, problems: []})`. 실패 → 스테이징 삭제 → `Io`.
- `savedAt`은 원본 유지(U-5). 이름 중복 허용.

### 5.3 `apply` (`apply.rs`) — 02-design §3.2
```rust
struct FileBackup { entries: Vec<(PathBuf, Option<Vec<u8>>)> } // 경로 = assets_dir.join(고정 이름)
impl FileBackup {
    fn capture(assets_dir: &Path, names: &[String]) -> Result<Self, PresetError>; // 없는 파일 = None
    fn restore(&self) -> bool; // Some → write_atomic, None → remove(NotFound 무시). 하나라도 실패하면 false(경고 로그)
}
```
1. `is_valid_id` → `presets_dir/{id}` 링크 아닌 폴더 → 아니면 `NotFound`
2. `load_dir` → `Problems(_, p)` → `Damaged { file_name: p[0].file_name }`
3. 이름 집합 = 옛 매니페스트 키 ∪ 새 키(`{file_key}.png`) ∪ `alarm.wav`·`alarm.mp3`·`alarm.ogg` ∪ `manifest.json` → `FileBackup::capture`
4. `commit_files`: 새 PNG `write_atomic` → 옛에만 있던 PNG 삭제 → 알림음(있으면 `write_atomic(alarm_file_name)` + 다른 두 이름 삭제, 없으면 세 이름 삭제) → 새 `AssetManifest { entries: [AssetEntry{slot, file_name: stored_file_name, width, height, bytes, url: versioned_asset_url(&dest)}], canvas }` + `recompute_canvas` → `save_manifest`. 실패 → `changed = !backup.restore()` → `Io{source, changed}`
5. `settings::update(settings, settings_file, |cur| file.settings.merge_into(cur))`. 실패 → `changed = !backup.restore()` → `Settings{source, changed}`
6. `Ok(AppliedPreset { manifest })`
- 프리셋 폴더는 **읽기만** 한다(PS-10). 설정 잠금은 5에서만(`update` 내부).
- 함수 50줄 한계 — `commit_files`·`build_manifest`·`FileBackup`로 나눈다.

### 5.4 `list`·`rename`·`delete`·`export_to` (`scan.rs`·`write.rs`)
- `list`: `presets_dir` 없음 → `Ok(vec![])`. `read_dir` 실패 → `Io`. 항목마다 `symlink_metadata` 링크 아닌 폴더 + `is_valid_id(이름)` → `read_preset_file` → 실패는 `log::warn!("preset: 건너뜀 id={id} code={}")`(경로 없음) → 정렬 `saved_at` 내림차순, 같으면 id 내림차순(U-4).
- `rename`: id 확인 → `normalize_name` → `read_preset_file` → `name` 교체 → `write_atomic(preset.json)` → 요약.
- `delete`: id 확인(링크 아닌 폴더) → `cleanup_leftovers` → `fs::rename({id} → .trash-{id})`(실패 `Io`) → `remove_dir_all(.trash-{id})`(실패 경고만 — 다음 정리 때).
- `export_to`: id 확인 → `read_preset_file` → `dest_parent` 절대·`is_dir` → 아니면 `BadDir` → `target = dest_parent.join(export_folder_name(&name))` → `fs::create_dir(target)`(`AlreadyExists` → `ExportExists`) → `preset.json`·`images` 각 `{file_key}.png`·알림음만 `fs::copy`(원본 링크·일반 파일 아님이면 `Io`) → 실패 → `remove_dir_all(target)`(최선) → `Io`. 반환 `folder_name`.
- `cleanup_leftovers(presets_dir)`: 바로 아래 `.staging-*`·`.trash-*` 중 링크 아닌 폴더를 `remove_dir_all`(최선, 경고만). `list`에서는 부르지 않는다(읽기에 부수 효과 없음).

## 6. 다른 모듈과의 관계

- `assets`: 가시성 4개만 넓힌다(변경 대상 표). 규격 규칙(`validate`·캔버스·상한)을 presets에 다시 쓰지 않는다.
- `assets::sound`: `detect_format`·`alarm_file_name`·`current`·`AlarmFormat`·`ALARM_MAX_BYTES` 그대로 사용.
- `settings`: `update`(설정 쓰기 **유일 창구**, CR-047)·`write_atomic`·`read_capped_string`·`MAX_TEXT_FILE_BYTES`·`IDLE_SECONDS_MIN/MAX`·`timer::normalize`·`Settings::validate`. 새 저장 경로를 만들지 않는다.
- `data_reset`: **변경 없음**(U-1 = A). `wipe`는 `presets/` 하위 폴더에 들어가지 않는다 — `data_reset.md`에 「프리셋 폴더는 초기화 대상이 아니다(U-1)」 한 줄만 추가. U-1이 B로 결정되면 이 절을 다시 받는다.
- `lib.rs` setup·시딩·세대 초기화 순서 **불변**. 앱 시작 때 프리셋 폴더를 읽지 않는다.

## 7. 수용 기준 (테스트 이름 권고 — tempdir, PNG는 기존 `png_header(w,h,8,6)` 방식 헬퍼)

| 영역 | 테스트 |
|---|---|
| 형식 | `preset_settings_has_exactly_ps02_fields`(JSON 키 = scale·idleSeconds·mouse·timer 4개), `merge_into_keeps_pc_local_fields`(overlay·autostart·language·positionLock·showInTaskbar 불변), `preset_file_round_trip`, `unknown_format_version_rejected`, `unknown_slot_rejected`, `duplicate_slot_rejected`, `too_many_images_rejected`, `settings_normalized_on_read`(idle 10 → 60, 잘못된 색 → 기본), `invalid_settings_rejected`(scale 5) |
| 이름·id | `normalize_name_table`(공백만·51자·제어 문자 거부, 앞뒤 공백 제거, 50자 한글 허용), `is_valid_id_table`(`..`·`a/b`·`A`·`.staging-1`·41자 거부), `claim_staging_skips_taken_ids`, `export_folder_name_table`(`a:b` → `a_b`, `CON` → `CON_`, `con.txt` → `con.txt_`, `"..."` → `preset`, `이름. ` → `이름`) |
| 저장 | `save_creates_folder_with_all_files`, `save_copies_every_manifest_slot_and_alarm`, `save_without_required_rejected`(디스크에 폴더 없음), `save_failure_leaves_no_folder`(스테이징 정리), `duplicate_names_allowed` |
| 목록 | `list_empty_when_no_dir`, `list_sorted_newest_first`, `list_skips_broken_and_staging`, `list_skips_link_dirs`(링크 생성 권한이 없으면 `is_link_like` 표 테스트로 대체) |
| 가져오기 | `import_rejects_missing_file`, `import_rejects_canvas_mismatch`, `import_rejects_non_rgba`, `import_rejects_over_1mib_before_read`, `import_rejects_wrong_alarm_format`, `import_reports_all_problems`(3개 문제 → problems 3), `import_reports_missing_required`, `import_writes_nothing_on_problem`(presets_dir 불변), `import_not_preset_folder`, `import_bad_dir`(상대 경로·파일), `import_ignores_extra_files`(`../evil.png`·`sub/`가 있어도 복사 안 됨), `import_keeps_saved_at`, `import_round_trip_equals_export`(export → import → 파일 바이트·settings 동일) |
| 적용 | `apply_replaces_all_and_clears_missing_slots`(옛 hair·kb_down_0 파일·항목 삭제), `apply_sets_ps02_settings_only`, `apply_keeps_pc_local_fields`, `apply_replaces_alarm_or_removes_it`, `apply_damaged_changes_nothing`(프리셋 PNG 하나를 RGB로 바꿔 둠 → assets·settings 바이트 동일), `apply_rolls_back_on_settings_failure`(settings.json 경로를 폴더로 막아 `update` 실패 → assets·manifest 바이트 원복, `may_have_changed() == false`), `apply_then_edit_does_not_touch_preset`(PS-10), `apply_canvas_from_preset_not_current`(현재 900×700 → 프리셋 450×350 적용 성공), `apply_unknown_id_not_found`(`../x` 포함) |
| 이름·삭제·내보내기 | `rename_keeps_id`, `rename_blank_rejected`, `delete_removes_folder`, `delete_unknown_not_found`, `export_copies_listed_files_only`, `export_existing_folder_rejected`(대상 폴더 불변), `export_bad_dir` |
| 에러 | `preset_error_codes`(변형 11개 → preset code 10개 + `Settings` 위임 code. 문제 전용 code `preset.file_missing`·`preset.file_link`는 `load.rs` 상수로 따로 확인. `preset.forbidden`은 bridge 판정이라 core에 없음), `messages_have_no_path`(tempdir 경로 문자열·`\\`·드라이브 문자 없음), `may_have_changed_only_when_rollback_failed` |

- 증거: `cd src-tauri && cargo fmt --check` · `cargo clippy -- -D warnings`(경고 0) · `cargo test`(기존 전부 + 신규 PASS 수). 적용 지연은 `tests/presets.rs`에서 15장 프리셋 `Instant` 측정값을 출력(목표 ≤ 300 ms, 02-design §7 — 실패 조건 아님, 기록용).

## 8. 하지 말 것

- `src-tauri/src/bridge/**`·`src/**`·`doc/200_설계/bridge/contract.md`·화면 문서 수정 금지(bridge·ui 패킷 몫). `error.rs`에 `From<PresetError>`를 넣지 않는다 — bridge가 `bridge/types.rs`에 둔다(ResetError 선례).
- `generate_handler!` 수정 금지(command가 아직 없다 — bridge 단계에서 등록).
- `AppPaths`에 필드 추가 금지(메서드만). `settings.json` 스키마·`Settings` 구조체 변경 금지.
- `data_reset` 동작 변경 금지(U-1 = A). 새 크레이트·`Cargo.toml` 수정 금지. `unsafe` 금지.
- 이벤트 emit·창 조작 금지(core는 ui를 모른다 — 뒤처리는 bridge).
- 사용자 문자열(이름·JSON 값)로 경로를 만들지 않는다. message·로그에 경로를 넣지 않는다.

## 9. 완료 마커

- `src-tauri/src/presets/{mod,format,load,scan,write,apply}.rs`, `src-tauri/tests/presets.rs` 존재, `lib.rs`에 `pub mod presets;`·`AppPaths::presets_dir`.
- `cargo fmt --check`·`cargo clippy -- -D warnings`·`cargo test` 전부 통과(수치를 보고에 첨부).
- `doc/200_설계/core/presets.md` 작성, `assets.md`·`settings.md`·`data_reset.md` 동기화.
- bridge 세션에 넘길 한 줄: 「presets 공개 API 7개·`PresetError::code()/may_have_changed()`·보고서 타입 4개 준비 완료, `generate_handler!` 미등록」.
