# default-assets 인계 패킷 — core

- 받는 세션: `claude --agent core-manager` (작업 모드: **보강**)
- 전반 설계: `doc/200_설계/architecture/default-assets-02-design.md`. 이 패킷과 어긋나면 02-design이 맞다. 현황 근거: `.claude/reports/core-survey-20260924-2330.md`.
- 전략: `core-design-strategy`, `.claude/skills/rust-rules.md`, `.claude/rules/golden-principles.md`(Rust 파일 800줄·함수 50줄). `unsafe`는 쓰지 않는다(이 작업에 필요 없음).

## 선행 조건

- 첫 계층이라 앞 계층 완료 마커는 없다.
- **새 의존성 없음**(표준 라이브러리 `std::fs`·`include_bytes!`만). `Cargo.toml`·`tauri.conf.json`·`capabilities/`는 건드리지 않는다.
- 사용자 결정 확정 (🔒 2026-09-24, 확정사항 §6 CR-035 결정 줄, 02-design §5)
  - U-4 = **S1**(§2), U-5 = **A**(충돌을 미리 검사하고 확인 후 전부 덮어쓰기, §4), U-6 = **include_bytes!**(§1).
  - **U-2 = B**: `penPos` 기본값 (380,496). §5-2를 **반드시 적용**한다.
  - U-3 = A(`penMode` 기본 false 유지)이므로 변경 없음.
  - U-1 = B(기본 그림이 있는 칸은 비우지 않음)는 core에 영향이 없다. `remove`는 그대로이고, ui가 복원 칸에서 부르지 않을 뿐이다.

## 요구ID

DA-01(내장), DA-02(시딩), DA-03(복원), DA-05(내보내기), DA-06(에러 코드), DA-07(기본 좌표 점검·주석 정정).

## 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src-tauri/src/assets/defaults.rs` (**신규**) | 내장 표 `DEFAULT_ASSETS`, `default_bytes`·`has_default`, `seed_if_empty`, `restore_default` |
| `src-tauri/src/assets/export.rs` (**신규**) | `ExportReport`·`ExportFailure`, `export_defaults` |
| `src-tauri/src/assets/mod.rs` (현 718줄) | `import_bytes` 추출(`import`는 read + `import_bytes`), `AssetError` 변형 2개 + `code()`, `pub mod defaults; pub mod export;` |
| `src-tauri/src/lib.rs` | setup 안 `:66`(create_dir_all)과 `:68`(load_manifest) 사이에 시딩 호출 1줄 + 로그. **`generate_handler!`(`:118-133`)는 이 패킷에서 건드리지 않는다**(bridge 패킷이 새 command를 만든 뒤 등록한다) |
| `src-tauri/src/settings/mod.rs` | `default_mouse` 주석의 근거 정정(§5-1) + `pen_pos` 기본값 `Some((380,496))`(§5-2, U-2 = B 확정) |
| `src-tauri/tests/default_assets.rs` (**신규**) | 통합 테스트(§6) |
| `doc/200_설계/core/assets.md`, `settings.md` | 설계 동기화(core-designer). 새 공개 API·에러 코드·시딩 순서. 현 문서의 불일치 5건(core-survey Q11: 변경이력의 「소스 미적용」, 파일 표 줄 수, §3.7 6→7개, `validate` 실패 조건의 `PenPartMismatch`, §3.5 펜 그룹 열)을 같은 패스에서 맞춰도 된다 |

## 1. 내장 표 (`assets/defaults.rs`, DA-01)

비유: 앱 안에 견본 사진첩을 풀로 붙여 두는 것이다. 설치 폴더나 인터넷을 찾아갈 필요가 없다.

```rust
/// 내장 기본 그림 1장. 바이트는 exe 정적 영역(힙 복사 없음).
pub struct DefaultAsset {
    pub slot: AssetSlot,
    pub bytes: &'static [u8],
}

macro_rules! default_png {   // 선택: 경로 반복을 줄이는 로컬 매크로
    ($name:literal) => { include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/../doc/assets/defaults/", $name)) };
}

/// 순서 고정: 캔버스 레이어(kb_up 먼저) → mouse_base → pen_up → pen_down_0. 시딩이 이 순서로 등록한다.
pub static DEFAULT_ASSETS: [DefaultAsset; 15] = [
    // kb_up, {kb_down,0}, idle, rest, background,
    // key_space, key_z, key_question, key_exclamation, key_enter, key_backspace, key_undo,
    // mouse_base, pen_up, {pen_down,0}
];

pub fn default_bytes(slot: &AssetSlot) -> Option<&'static [u8]>;   // slot 비교는 file_key 기준(KbDown{0}만 true, KbDown{1} 이상 false)
pub fn has_default(slot: &AssetSlot) -> bool;                      // default_bytes(slot).is_some()
```

- `AssetSlot`을 `static`에 넣을 수 없는 형태라면 `fn default_assets() -> &'static [DefaultAsset]`(`OnceLock`)로 바꿔도 된다. 공개 이름·순서·의미는 같아야 한다.
- 원본은 `doc/assets/defaults/*.png` 15장이다. `manifest.snapshot.json`은 넣지 않는다.
- 모듈 상단 `//!`에 적을 것: CR-035, DA-01, 원본 위치, 「포터블 exe 때문에 resources 대신 include_bytes!」(02-design U-6).

## 2. 시딩 (`seed_if_empty`, DA-02)

```rust
pub enum SeedSkip { NotEmpty, ManifestUnreadable, FilesPresent }
pub enum SeedOutcome {
    Seeded { count: usize, failed: Vec<(String /*file_key*/, &'static str /*code*/)> },
    Skipped(SeedSkip),
}
/// Err를 내지 않는다. 앱 시작을 막지 않기 위해서다. 결과는 호출자(lib.rs)가 로그로 남긴다.
pub fn seed_if_empty(assets_dir: &Path) -> SeedOutcome;
```

동작(순서 고정):
1. `load_manifest(assets_dir/manifest.json)`
   - 최상위 구조 손상(`Err`) → `Skipped(ManifestUnreadable)`. 손상 파일을 덮어쓰지 않는다.
   - `entries`가 비어 있지 않음 → `Skipped(NotEmpty)`.
   - 파일이 없거나 항목이 0개면 2로 간다.
2. 15개 `{file_key}.png` 중 **하나라도** `assets_dir`에 있으면 → `Skipped(FilesPresent)`. 매니페스트만 사라진 사용자 파일을 덮어쓰지 않기 위해서다.
3. `DEFAULT_ASSETS` 순서대로 `import_bytes(assets_dir, slot, bytes)`를 부른다. 실패하면 `failed`에 (key, `err.code()`)를 넣고 **다음 장을 계속** 처리한다. 결과는 `Seeded { count: 성공 수, failed }`.
- `lib.rs`: `create_dir_all`(:66) 직후, `load_manifest`(:68) **앞**에 호출한다. 그래야 뒤의 손 기준점(:72)과 `setup_overlay` 창 크기(:111)가 시딩 결과를 그대로 쓴다.
  - 결과와 소요 시간(`Instant`)을 기존 경고 로그 방식으로 1줄 남긴다.
  - 로그에 경로를 넣지 않는다.
- 설정(settings.json)은 건드리지 않는다.

## 3. 복원 (`restore_default`, DA-03)

```rust
/// 내장 기본이 없으면 NoDefault. 검증을 쓰기 전에 하므로, 실패하면 사용자 그림이 그대로 남는다.
pub fn restore_default(assets_dir: &Path, slot: AssetSlot) -> Result<AssetManifest, AssetError>;
```

- `default_bytes(&slot)`가 `None`이면 `Err(AssetError::NoDefault(slot.file_key()))`, 아니면 `import_bytes(assets_dir, slot, bytes)`.
- `import_bytes`는 기존 `import`의 순서를 그대로 쓴다: 헤더 → 매니페스트 → 검증(그룹 크기) → 쓰기 → 같은 슬롯 교체 → 캔버스 재계산 → 저장.
  - 결과적으로 사용자 그림이 같은 파일명에서 기본 그림으로 교체된다(확정 문구 「사용자 그림 삭제 후 기본 복원」과 결과가 같고, 실패해도 안전하다).
- 다른 캔버스 레이어의 크기가 다르면 `asset.canvas_mismatch`다. 기존 규칙을 그대로 쓰고 새 예외를 만들지 않는다.

`assets/mod.rs` 추출:

```rust
pub fn import_bytes(assets_dir: &Path, slot: AssetSlot, bytes: &[u8]) -> Result<AssetManifest, AssetError>;
pub fn import(assets_dir: &Path, slot: AssetSlot, src: &Path) -> Result<AssetManifest, AssetError>  // 시그니처 불변: fs::read(src) → import_bytes
```

- 기존 `import` 테스트가 모두 그대로 통과해야 한다(동작 불변).

## 4. 내보내기 (`assets/export.rs`, DA-05)

비유: 견본 사진첩의 원판을 사용자가 고른 서랍에 그대로 복사해 주는 것이다. 서랍에 같은 이름의 사진이 있으면, 먼저 넣지 않고 「덮어쓸까요?」를 묻게 한다.

```rust
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExportFailure { pub file_name: String, pub code: &'static str }   // JSON: { fileName, code }

#[derive(Serialize, Debug, Clone, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExportReport {
    pub written: Vec<String>,        // 쓴 파일명(DEFAULT_ASSETS 순서)
    pub conflicts: Vec<String>,      // 쓰기 전에 이미 있던 파일명
    pub failed: Vec<ExportFailure>,  // 쓰지 못한 파일명 + 코드
}

pub fn export_defaults(dest_dir: &Path, overwrite: bool) -> Result<ExportReport, AssetError>;
```

- serde 표기는 `AssetManifest`의 전례를 따른다. bridge가 별도 사본 타입을 둘지는 bridge가 정한다.

동작:
1. `dest_dir`가 절대 경로가 아니거나 `is_dir()`가 거짓이면 `Err(AssetError::ExportDir)`.
2. `conflicts` = 15개 파일명 중 `dest_dir.join(name).exists()`인 것(폴더 포함).
3. `!overwrite && !conflicts.is_empty()`이면 **아무것도 쓰지 않고** `Ok(ExportReport { written: [], conflicts, failed: [] })`.
4. 그 밖에는 15장마다 다음을 한다.
   - 임시 파일 `dest_dir/.{name}.kuro-tmp`에 **내장 바이트를 그대로** 쓰고 `fs::rename`으로 `{name}`에 옮긴다. Windows의 `std::fs::rename`은 기존 파일을 교체한다.
   - 실패하면 임시 파일을 지우고(best-effort) `failed`에 `{ file_name, code: "asset.io" }`를 넣은 뒤 다음 장을 계속 처리한다.
   - 성공하면 `written`에 넣는다.
   - 이때 `conflicts`는 덮어쓴 목록(정보용)이다.
5. 파일명은 내장 표의 `file_key + ".png"`에서만 만든다. 사용자 입력 파일명은 받지 않는다.
6. 매니페스트·앱 데이터 폴더·이벤트와 무관하다.

## 5. 에러 코드와 설정 (DA-06, DA-07)

```rust
// AssetError (assets/mod.rs) 추가 — message에 경로 넣지 않음
NoDefault(String)  // code() = "asset.no_default", 표시 예: "이 칸에는 내장 기본 그림이 없습니다: {key}"
ExportDir          // code() = "asset.export_dir", 표시 예: "저장할 폴더를 찾을 수 없습니다."
```

- 5-1. `settings/mod.rs` `default_mouse`의 `area`·`partPos` 근거 주석을 「기본 세트 `doc/assets/defaults/mouse_base.png`(202×154, CR-035) 기준. 2026-09-24 실사용 settings.json과 일치」로 고친다. **값은 바꾸지 않는다.**
  - 옛 `mouse_pen_hand.png` 근거는 이력으로 한 줄 남긴다.
  - 완료 보고에 싣는 측정값: `compute_hand_anchor`를 기본 `mouse_base` 바이트와 partPos (389,492), shoulder (620,530)로 계산한 **손 기준점 좌표 1줄**. 테스트 단언은 하지 않는다.
  - 테스트 헬퍼가 디스크 파일을 요구하면 tempdir에 시딩한 뒤 계산한다.
- 5-2. **(U-2 = B 확정 — 필수)** `default_mouse().pen_pos = Some(Point { x: 380.0, y: 496.0 })`. 주석은 「기본 세트 pen_up(90×154)을 사용자가 끌어다 놓은 자리(2026-09-24 settings.json)」.
  - 기존 settings 기본값 테스트의 기대값을 갱신한다.
  - 기존 파일의 `"penPos": null`은 null로 읽힌다(키가 있으면 serde default가 적용되지 않음). 이 동작을 테스트 1개로 고정한다.

## 6. 수용 기준 (테스트 이름은 예시, 의미가 같으면 된다)

`src-tauri/tests/default_assets.rs`(tempdir 사용):

| 테스트 | 기대 |
|---|---|
| `default_assets_slot_set` | 15개 file_key가 정확히 `background, idle, rest, kb_up, kb_down_0, key_space, key_z, key_question, key_exclamation, key_enter, key_backspace, key_undo, mouse_base, pen_up, pen_down_0` |
| `default_assets_pass_validation` | 모든 장이 `parse_png_header`와 규격 검증을 통과한다. 캔버스 12장은 900×700, mouse_base는 202×154, pen 2장은 90×154이고, 각각 1 MB 이하 |
| `has_default_rules` | `KbDown{0}`·`PenDown{0}` true, `KbDown{1}`·`PenDown{1}`·`mouse_left`·`mouse_right`·`pen_key_space`·`body` false |
| `seed_fresh_dir` | 빈 폴더에서 `Seeded{count:15, failed:[]}`, 매니페스트 15항목, canvas 900×700 |
| `seed_skips_when_not_empty` | 사용자 항목 1개가 있으면 `Skipped(NotEmpty)`, 파일·매니페스트 불변 |
| `seed_skips_corrupt_manifest` | 손상 manifest.json이면 `Skipped(ManifestUnreadable)`, 파일 바이트 불변 |
| `seed_skips_orphan_files` | 매니페스트는 없고 `kb_up.png`만 있으면 `Skipped(FilesPresent)`, 그 파일 불변 |
| `seed_twice_is_noop` | 두 번째 호출은 `Skipped(NotEmpty)` |
| `restore_replaces_user_image` | 사용자 kb_up(900×700 다른 그림)을 등록한 뒤 복원하면 파일 바이트가 내장 바이트와 같다 |
| `restore_no_default` | `mouse_left`면 `asset.no_default`, 매니페스트 불변 |
| `restore_canvas_mismatch_keeps_user` | 다른 크기 캔버스 세트가 있으면 복원은 `asset.canvas_mismatch`이고 사용자 파일이 불변 |
| `export_fresh_dir` | 15장 `written`, 각 파일 바이트 = 내장 바이트(바이트 비교), 임시 파일 없음 |
| `export_conflict_no_overwrite` | `kb_up.png`가 미리 있으면 `written:[]`, `conflicts:["kb_up.png"]`, 기존 파일 불변, 다른 14장도 쓰지 않음 |
| `export_conflict_overwrite` | 같은 조건에서 `overwrite=true`면 15장 `written`, kb_up.png가 내장 바이트로 교체 |
| `export_partial_failure` | 대상 이름과 같은 **폴더**(예: `kb_up.png/` 디렉터리)가 있으면 그 1건만 `failed[code=asset.io]`, 나머지 14장 `written` |
| `export_bad_dir` | 없는 경로·상대 경로·파일 경로면 `asset.export_dir` |
| `error_codes` | `NoDefault`·`ExportDir`의 `code()`가 각각 `asset.no_default`·`asset.export_dir` |

- 기존 테스트 전부 PASS: `cargo test`. `cargo clippy -- -D warnings` 경고 0, `cargo fmt --check` 통과.
- 완료 보고 실측 4가지
  - 시딩 소요 ms(테스트 또는 로그)
  - 내보내기 소요 ms
  - 기본 mouse_base 손 기준점 좌표(§5-1)
  - `assets/mod.rs` 줄 수(800 미만)

## 7. 하지 말 것

- `src-tauri/src/bridge/**`, `src/**`(TS), `tauri.conf.json`, `capabilities/`, `Cargo.toml`을 수정하지 않는다.
- `lib.rs`의 `generate_handler!`에 새 command를 등록하지 않는다. 아직 존재하지 않으며 bridge 몫이다.
- `remove`·`import`의 기존 동작과 에러 코드를 바꾸지 않는다.
- 시딩에서 settings.json을 쓰지 않는다. 시딩이 앱 시작을 실패시키지 않게 한다(panic·`?` 전파 금지).
- 기존 `asset.io` message의 `{0}` 원문 포함을 이번에 고치지 않는다(계약 §6 기존 과제). **새 에러**만 경로 없이 만든다.
- 새 크레이트를 추가하지 않는다(해시가 필요하면 바이트 비교로 대신한다).

## 완료 마커

- `src-tauri/src/assets/defaults.rs`, `src-tauri/src/assets/export.rs`가 있고, `assets::{import_bytes, defaults::{DEFAULT_ASSETS, default_bytes, has_default, seed_if_empty, restore_default}, export::{export_defaults, ExportReport, ExportFailure}}`가 공개돼 있다.
- `cargo test` 전부 PASS(위 표 포함), clippy 0, fmt 통과를 완료 보고에 붙인다.
- `doc/200_설계/core/assets.md`와 `settings.md`(penPos 기본값 (380,496))를 동기화한다.
- 완료 보고 끝에 한 줄: 「bridge 착수 가능 — `restore_default`·`export_defaults` 시그니처 위와 동일」(달라졌으면 실제 시그니처).
