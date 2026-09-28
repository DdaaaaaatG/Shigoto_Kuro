# data-reset 인계 패킷 — core

- 받는 세션: `claude --agent core-manager` (작업 모드: **보강**)
- 전반 설계: `doc/200_설계/architecture/data-reset-02-design.md`. 이 패킷과 어긋나면 02-design이 맞다. 현황 근거: `.claude/reports/core-survey-20260927-1400.md`.
- 전략: `core-design-strategy`, `.claude/skills/rust-rules.md`, `.claude/rules/golden-principles.md`(Rust 파일 800줄·함수 50줄). **`unsafe` 없음**(이 작업에 필요 없다).
- 순서: core-designer가 `doc/200_설계/core/data_reset.md`를 새로 쓰고 `assets.md`·`settings.md`의 시작 순서 절을 동기화한다 → core-implementer가 구현한다.

## 선행 조건

- 첫 계층이라 앞 계층의 완료 마커는 없다.
- **새 의존성 없음.** `tempfile`은 이미 dev-dependency(`Cargo.toml:37`)다. `Cargo.toml` 수정은 `version` 한 줄뿐이다(§7).
- 사용자 결정 (🔒 2026-09-27): R-A·R-B·R-C. 설계 판단 D-1~D-6(02-design §5)은 이 패킷에 반영돼 있다. **D-2(언어)는 결정 대기다.** 결정 전에는 「초기화」로 구현하고, `reset_settings` 한 줄로 바꿀 수 있게 둔다.

## 요구ID

R-A1~R-A6, R-A2'(세대 가드), R-B2(core 부분: `reset_data`·`refresh_overlay` 공개), R-B3(core 부분: `ResetError::code`), R-C1(core 부분: `Cargo.toml`·`tauri.conf.json`·`Cargo.lock`).

## 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src-tauri/src/data_reset/mod.rs` (**신규**) | 상수·정책·`decide`·`reset_settings`·`reset_data`·`run_startup`·`ResetOutcome`·`ResetError` |
| `src-tauri/src/data_reset/generation.rs` (**신규**) | 표식 파일 읽기·쓰기·삭제, 지문 함수 |
| `src-tauri/src/data_reset/wipe.rs` (**신규**) | 화이트리스트 삭제 |
| `src-tauri/src/lib.rs` | `pub mod data_reset;`, setup 안 시작 순서 변경(§5). **`generate_handler!` 목록은 건드리지 않는다**(bridge 패킷이 등록한다) |
| `src-tauri/src/tray/mod.rs` | `fn refresh_overlay` → `pub(crate) fn refresh_overlay`(가시성만 바꾼다. 동작 불변) |
| `src-tauri/tests/data_reset.rs` (**신규**) | 통합 테스트(§8) |
| `src-tauri/Cargo.toml` · `src-tauri/tauri.conf.json` · `src-tauri/Cargo.lock` | 버전 `0.1.0` → `0.1.1`(§7). Cargo.lock은 `cargo check`가 갱신한다 |
| `doc/200_설계/core/data_reset.md` (**신규**) · `assets.md` · `settings.md` | 설계 동기화(core-designer): 새 모듈, 시작 순서, 표식 파일 |

## 1. 공개 API (`data_reset/mod.rs`)

비유: 진열대 딱지 관리인이다. 딱지(표식)를 읽고, 번호가 틀리면 진열대를 비워 새 견본을 채운 다음, 맨 마지막에 딱지를 새로 붙인다.

```rust
//! [목적] 베타 데이터 세대 초기화(R-A)·전체 초기화(R-B) — data-reset-02-design.md
//! [정책] 판정은 decide() 한 곳. 정식 배포 전환(ReplaceUntouchedDefaults)은 02-design §8 메모, 미구현.

/// 앱 데이터 세대. doc/assets/defaults/ = 내장 DEFAULT_ASSETS = 세대 4 (CR-053).
/// 1=defaults-v1(CR-035), 2=defaults-v2(CR-038), 3=defaults-v3(CR-044).
/// 기본 그림을 바꾸면: 옛 폴더를 defaults-v{N}으로 옮기고, 이 값을 +1 하고, DEFAULT_ASSETS_FINGERPRINT를 갱신한다.
pub const DATA_GENERATION: u32 = 4;
pub const MARKER_FILE: &str = "data-generation.json";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResetPolicy {
    /// 베타: 세대가 다르거나 없으면 앱 데이터 전부 초기화(R-A)
    WipeAll,
}
pub const POLICY: ResetPolicy = ResetPolicy::WipeAll;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StartupAction { Keep, WipeAll }

/// 정책 분기 단 한 곳(R-A6). stored = 표식 값(없음·손상 = None).
pub fn decide(stored: Option<u32>, current: u32, policy: ResetPolicy) -> StartupAction;
// WipeAll 정책: stored == Some(current) → Keep, 그 밖(None·작음·큼, D-6) → WipeAll

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResetOutcome { pub removed: usize, pub seeded: usize, pub elapsed_ms: u128 }

#[derive(Debug)]
pub enum ResetError {
    Io(std::io::Error),          // 표식·파일 삭제·표식 기록 실패 → "reset.io"
    Seed,                        // 비운 뒤 시딩이 Seeded{count==DEFAULT_ASSETS.len(), failed 비어 있음}이 아님 → "reset.seed"
    Settings(SettingsError),     // settings::update 실패 → SettingsError::code() 그대로("settings.io" 등)
}
impl ResetError { pub fn code(&self) -> &'static str; }   // 에러 타입 관례는 AssetError·SettingsError와 같게(Display 문구에 경로 금지)

/// 보존 규칙(02-design §4): Settings::default() + autostart 보존(D-3). language는 D-2 결정 전 초기화.
pub fn reset_settings(current: &Settings) -> Settings;

/// 시작·버튼 공통 초기화(R-A2·R-A3·R-B2). 순서 고정 ①~⑤(§2).
pub fn reset_data(paths: &AppPaths, settings: &Mutex<Settings>) -> Result<ResetOutcome, ResetError>;

/// 시작 경로 진입점. 절대 실패를 전파하지 않는다(패닉 금지). 로그만 남긴다(§4).
pub fn run_startup(paths: &AppPaths, settings: &Mutex<Settings>);
```

- `AppPaths`(lib.rs:34, 필드 3개 모두 `pub`)를 그대로 받는다. 테스트는 `AppPaths { data_dir, assets_dir, settings_file }`를 tempdir로 직접 만든다.
- 이름·시그니처를 바꿔야 하면 core-designer가 문서에 근거를 적고 바꾼다. 의미(순서·보존·에러 code)는 바꾸지 않는다.

## 2. `reset_data` 순서 (R-A3, 원자성 규칙)

| 단계 | 동작 | 실패 시 |
|---|---|---|
| ① | `generation::remove_marker(data_dir)` — 없으면 통과 | `Err(Io)`, 아무것도 지우지 않음 |
| ② | `wipe::wipe(paths)`(§3) | `Err(Io)`. 표식이 없으므로 다음 시작 때 재시도 |
| ③ | `assets::defaults::seed_if_empty(&paths.assets_dir)` → `SeedOutcome::Seeded { count, failed }`이면서 `count == DEFAULT_ASSETS.len()`이고 `failed`가 비어 있어야 함 | 그 밖(Skipped·일부 실패)이면 `Err(Seed)` |
| ④ | `settings::update(settings, &paths.settings_file, \|cur\| *cur = reset_settings(cur))` — **CR-047 단일 저장 경로**. 클로저 안에서는 대입만 한다(IO·다른 잠금 금지) | `Err(Settings)` |
| ⑤ | `generation::write_marker(data_dir, DATA_GENERATION)` — `settings::atomic::write_atomic`(settings/atomic.rs:33)으로 원자 기록. 내용 `{"generation":4,"appVersion":"<CARGO_PKG_VERSION>"}` | `Err(Io)` |

- ②에서 settings.json을 먼저 지우므로 ④가 「값이 같아서 저장 생략」해도 손상 파일이 남지 않는다. 파일이 없으면 다음 로드는 기본값이다.
- 버튼 경로에서 ①~④ 중 어디서 끊기든 표식이 없으므로 다음 앱 시작 때 `run_startup`이 처음부터 다시 한다. PNG 본체 비원자 쓰기(CORE-001)도 이 규칙으로 흡수한다. CORE-001 자체는 고치지 않는다(범위 밖).

## 3. `wipe` 화이트리스트 (R-A4)

```rust
/// 반환 = 지운 파일 수. 하위 폴더에 들어가지 않고, 링크를 따라가지 않는다.
pub fn wipe(paths: &AppPaths) -> Result<usize, ResetError>;
```

| 위치 | 지우는 것(일반 파일만) | 지우지 않는 것 |
|---|---|---|
| `paths.assets_dir` 바로 아래 | 확장자 `png`·`tmp`·`wav`·`mp3`·`ogg`, 이름 `manifest.json` | 그 밖의 파일, 모든 하위 폴더, 심볼릭 링크·재분석 지점(`symlink_metadata`로 판정) |
| `paths.data_dir` 바로 아래 | `settings.json`, `settings.json`으로 시작하고 `.tmp`로 끝나는 파일, `data-generation.json`으로 시작하고 `.tmp`로 끝나는 파일 | 그 밖의 모든 것(예: WebView 데이터 폴더, 사용자가 둔 파일) |

- `assets_dir`가 없으면 통과한다(0개). 삭제 대상 경로는 `read_dir` 항목뿐이므로 두 폴더 밖으로 나가지 않는다.
- 파일 하나라도 지우지 못하면 즉시 `Err(Io)`다. 이미 지운 것은 되돌리지 않는다. 표식이 없으므로 다음 시작 때 재시도한다.
- 알림음 삭제는 D-4 채택에 따른 것이다. 작업 스케줄러 등록은 건드리지 않는다(D-3).

## 4. `run_startup` (R-A2·R-A5)

```
let started = Instant::now();
let stored = generation::read_marker(&paths.data_dir);            // 없음·파싱 실패·필드 없음 = None
match decide(stored, DATA_GENERATION, POLICY) {
  Keep    => log::info!("data-reset: 세대 {DATA_GENERATION} 일치 — 건너뜀 ({}ms)", …),
  WipeAll => match reset_data(paths, settings) {
      Ok(o)  => log::info!("data-reset: 저장 세대 {stored:?} → {DATA_GENERATION}, 정책 {POLICY:?}, 삭제 {} · 기본 그림 {} ({}ms)", …),
      Err(e) => log::warn!("data-reset: 초기화 실패 code={} — 앱은 계속 시작, 다음 시작 때 재시도", e.code()),
  }
}
```

- 로그에 **절대 경로·사용자 이름을 넣지 않는다**(경로에 Windows 사용자 이름이 들어간다). 파일 수·code·ms만 남긴다.
- 반환값이 없고 패닉도 없다(`unwrap`·`expect` 금지). `Mutex` poison은 `into_inner`로 복구하거나 경고 후 건너뛴다.

## 5. `lib.rs` 시작 순서 변경

현재 순서(core-survey §2): `:95` AppPaths → `:96` create_dir_all → `:97` seed_if_empty → `:98` load_or_default → `:99` manifest.

목표 순서:

```
:95 AppPaths::new
:96 create_dir_all(assets_dir)
★  let settings_state = Mutex::new(settings::load_or_default(&paths.settings_file));   // :98을 앞으로
★  data_reset::run_startup(&paths, &settings_state);
:97 assets::defaults::seed_if_empty(&paths.assets_dir)   // 유지(CR-035 S1 — 사용자가 전부 비운 경우). 초기화 직후엔 Skipped
:99 manifest 로드 … 이후 코드는 초기화 뒤의 settings 값을 쓴다(손 기준점·타이머 from_settings·AppState.settings)
```

- `AppState.settings`에는 `settings_state`를 그대로 넣는다. 중간 코드가 `Settings` 값을 필요로 하면 잠금 복사본을 쓴다.
- 창·훅·트레이·자동 실행 보정 스레드의 순서와 내용은 바꾸지 않는다. 보정 스레드(:165)는 기존대로 `autostart`를 실제 등록 상태에 맞춘다.

## 6. `tray::refresh_overlay` 공개

- `tray/mod.rs:246` `fn refresh_overlay(app: &AppHandle) -> Result<(), BridgeError>` → `pub(crate)`. 본문은 바꾸지 않는다.
- bridge `reset_app_data`가 마지막 단계에서 부른다.

## 7. 버전 0.1.1 (R-C1 core 부분)

| 파일 | 줄 | 변경 |
|---|---|---|
| `src-tauri/tauri.conf.json` | `"version"`(:4) | `"0.1.0"` → `"0.1.1"` |
| `src-tauri/Cargo.toml` | `[package] version`(:3) | `"0.1.0"` → `"0.1.1"` |
| `src-tauri/Cargo.lock` | `kuro_keyviewer` 항목 | `cargo check`가 자동 갱신(손으로 고치지 않음) |

- `package.json`은 ui 패킷이 맞춘다. 세 파일의 일치는 ui 패킷 완료 때 검사한다.
- 버전과 세대는 **서로 독립**이다. 버전을 올려도 `DATA_GENERATION`은 바뀌지 않는다.

## 8. 테스트 (`src-tauri/tests/data_reset.rs` + 모듈 단위)

공통 픽스처(`tempfile::tempdir()`, 실제 `%APPDATA%` 사용 금지):
- `AppPaths { data_dir: tmp/"data", assets_dir: tmp/"data/assets", settings_file: tmp/"data/settings.json" }`.
- **v3 세트 설치**: `doc/assets/defaults-v3/*.png` 6장. 경로는 `concat!(env!("CARGO_MANIFEST_DIR"), "/../doc/assets/defaults-v3/", …)`이고, `tests/sample_assets.rs`에 전례가 있다. 파일명 = 슬롯 file_key이며, `assets::import_bytes`로 등록해 manifest를 만든다.
- **커스텀 settings.json**: shoulder (1,2), part_pos (3,4), pen_pos (5,6), pen_mode false, timer.text_pos (7,8)·rotation 0, scale 1.5, language `ja`, **autostart true**, overlay x/y 지정. `serde_json`으로 써 둔다.
- 잡동사니: `assets/alarm.wav`(아무 바이트), `assets/kb_up.png.123-1.tmp`, `data/settings.json.123-1.tmp`, `assets/keep_me.txt`, `assets/sub/x.png`(하위 폴더), `data/EBWebView/x`(루트 하위 폴더), `tmp/outside.png`(데이터 폴더 밖 감시 파일).

| 테스트 | 단언 |
|---|---|
| `decide_table` | (None,4)→WipeAll · (Some(3),4)→WipeAll · (Some(4),4)→Keep · (Some(5),4)→WipeAll(D-6) |
| `marker_roundtrip` · `marker_missing_is_none` · `marker_corrupt_is_none` | 쓰고 읽으면 Some(4). 파일이 없으면 None. `{`, `{"x":1}`, `[]`이면 None |
| `reset_settings_keeps_autostart_only` | 결과 == `Settings { autostart: true, ..Settings::default() }`(D-2 결정 전 기준. language도 기본값) |
| `reset_from_v3_with_custom_settings` | 픽스처 + 표식 없음 → `run_startup` 뒤: assets 폴더의 png가 **정확히 내장 7장**이고 각 바이트가 `DEFAULT_ASSETS`와 같음. v3에만 있던 `kb_down_0.png`는 없음. manifest 항목 슬롯 = `DEFAULT_ASSETS` 7개. `alarm.wav`·`.tmp` 두 개 삭제. 메모리와 디스크의 settings == `reset_settings(커스텀)`. 표식 = 4 |
| `wipe_keeps_unknown_files_and_subdirs` | 위 실행 뒤 `keep_me.txt`·`assets/sub/x.png`·`data/EBWebView/x` 그대로 |
| `wipe_never_touches_outside_data_dir` | `tmp/outside.png` 바이트가 그대로 |
| `startup_skips_when_generation_matches` | 초기화 뒤 사용자가 `import_bytes`로 커스텀 kb_up을 넣고 settings를 바꿈 → `run_startup` 재실행 → 둘 다 그대로(Keep) |
| `fresh_empty_dir_is_seeded` | 빈 폴더 → `run_startup` → 7장, 표식 4, settings 기본 |
| `failure_leaves_no_marker_and_retries` | `data/settings.json`을 **폴더로** 만들어 ②를 실패시킴 → `reset_data`가 `Err`, `code()=="reset.io"`, 표식 없음. 폴더를 치운 뒤 `run_startup` → 성공, 표식 4 |
| `startup_never_panics_on_failure` | 위 실패 상태에서 `run_startup`이 반환함(패닉 없음) |
| `reset_error_codes` | Io→`reset.io`, Seed→`reset.seed`, Settings(io)→`settings.io` |
| `generation_fingerprint_guard` | `generation::fingerprint(&DEFAULT_ASSETS)`(장수·바이트 합·FNV-1a 64) == `DEFAULT_ASSETS_FINGERPRINT` 상수. 실패 메시지: 「기본 그림이 바뀌었습니다. DATA_GENERATION을 올리고 옛 세트를 defaults-v{N}으로 옮긴 뒤 지문을 갱신하세요」 |
| `reset_elapsed_under_budget`(측정만) | `ResetOutcome.elapsed_ms`를 출력. 완료 보고에 실측값을 싣는다(목표 ≤ 300 ms, 단언은 하지 않음) |

## 수용 기준

- `cd src-tauri && cargo fmt --check` · `cargo clippy --all-targets -- -D warnings` 경고 0 · `cargo test` 전체 PASS(새 테스트 포함). 테스트 수와 PASS 수를 보고한다.
- `cargo check` exit 0이고, `Cargo.lock`의 `kuro_keyviewer` 버전이 0.1.1이다.
- 새 파일은 각각 800줄 이하이고, 함수는 50줄 이하다. `data_reset/` 안에 `unsafe`가 0건이다.
- 모듈 상단 `//!` 문서주석에 [목적]·[정책]·[순서 ①~⑤]·[삭제 화이트리스트]·[전환 메모 위치]가 있다.
- `doc/200_설계/core/data_reset.md`가 신규 작성돼 있고, `assets.md`·`settings.md` 시작 순서 절이 새 순서와 같다.

## 하지 말 것

- `src-tauri/src/bridge/**`, `generate_handler!` 목록, `src/**`(TS), `contract.md`를 수정하지 않는다. 모두 bridge·ui 패킷 소관이다.
- 새 크레이트를 추가하지 않는다. FNV는 직접 구현하고, 해시 크레이트를 쓰지 않는다.
- 작업 스케줄러(autostart) 등록을 건드리지 않는다. 데이터 폴더 밖 파일도 건드리지 않는다.
- 실제 `%APPDATA%\com.kuro.keyviewer\`를 읽거나 쓰지 않는다(테스트는 tempdir만).
- **⚠ 이 코드가 들어간 앱(`yarn tauri dev` 포함)을 실행하지 않는다.** dev와 release는 같은 identifier를 쓰므로 같은 데이터 폴더를 쓴다. 개발 PC에는 세대 표식이 없어서, 첫 실행 때 개발자 데이터 전체가 초기화된다. 검증은 `cargo test`로만 한다. 앱 실행은 02-design §5 D-7에 따라 메인 세션이 백업한 뒤에 한다.
- 실행 중인 앱·dev 프로세스를 종료하지 않는다.
- 정식 배포 전환안(02-design §8)을 구현하지 않는다. `ResetPolicy`에 변형을 미리 추가하지 않는다.
- CORE-001(PNG 비원자 쓰기)을 이 작업에서 고치지 않는다(별건).

## 완료 마커

- `src-tauri/src/data_reset/{mod,generation,wipe}.rs`와 `src-tauri/tests/data_reset.rs`가 있고 `cargo test` PASS 증거가 있다.
- `tray::refresh_overlay`가 `pub(crate)`다.
- `doc/200_설계/core/data_reset.md`가 있다.
- core-manager 완료 보고에 다음을 싣는다: 「bridge 착수 가능: `data_reset::reset_data(&AppPaths, &Mutex<Settings>) -> Result<ResetOutcome, ResetError>`, `ResetError::code()`, `tray::refresh_overlay` pub(crate)」.
