# settings-v2 인계 패킷 — core

- 받는 세션: `claude --agent core-manager` (작업 모드: **보강**)
- 전반 설계: `doc/200_설계/architecture/settings-v2-02-design.md`(이 패킷과 어긋나면 02-design이 맞다). 현황 근거: `.claude/reports/core-survey-20260924-settingsv2.md`.
- 전략: `core-design-strategy`, `.claude/skills/rust-rules.md`, `.claude/rules/golden-principles.md`(Rust 파일 800줄·함수 50줄, unsafe는 `src-tauri/src/hook/`만).

## 선행 조건

- 이 패킷이 첫 계층이다. 앞 계층 완료 마커 없음.
- 사용자 결정 확정(🔒 2026-09-24, 02-design §5): **D-4 = A안**(`ShellExecuteExW` runas, `hook/` 안전 래퍼). `windows` feature `Win32_UI_Shell` 추가 승인 — **`Cargo.toml`은 메인 세션이 수정**한다. core 세션은 착수 전 `Cargo.toml`에 이 feature가 들어 있는지 확인하고, 없으면 멈추고 메인 세션에 요청한다(서브에이전트 의존성 변경 금지).
- `tauri-plugin-autostart` 제거 승인됨. core 몫 = `lib.rs`의 플러그인 초기화(`lib.rs:59-62`) 삭제. Cargo·npm 패키지와 capability `autostart:default` 삭제는 메인 세션 몫, `commands.rs`의 플러그인 호출 삭제는 bridge 몫이다. 순서 문제로 빌드가 깨지지 않게 **core 세션은 초기화 코드 삭제를 bridge 호출 삭제와 같은 시점에 맞추거나, 호출이 남아 있는 동안은 초기화를 유지**한다(어느 쪽인지 완료 보고에 적는다).
- D-5 = A안(자동 실행 작업만 관리자, exe 매니페스트 변경 없음). D-7 = 배율·유휴 시간을 설정 창 「기본 설정」에 넣음 — **core 변경 없음**(기존 `scale` 0.25~2 유한수·`idle_seconds` ≥1 검증과 배율 변경 시 `resize_overlay` 경로 그대로. 확인만: 두 검증이 `settings/mod.rs:150-164` 그대로인지 완료 보고에 한 줄).

## 요구ID

SV2-02(언어 저장), SV2-03(위치 잠금), SV2-04(작업표시줄), SV2-05(자동 실행), SV2-06(위치 초기화), SV2-07(이미지 교체 반영 — url 버전), SV2-08(필수 규칙 문서주석). 화면 요구ID는 ui 쪽에서 붙는다(02-design §0 제안: 설정 R-20~R-25).

## 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src-tauri/src/settings/mod.rs` | `Language` enum, `Settings` 필드 3개, core 소유 필드 병합 함수 |
| `src-tauri/src/window/mod.rs` (+ 필요 시 `placement.rs`) | 창 속성 적용 확장, 기본 위치, 위치 초기화 |
| `src-tauri/src/tray/autostart.rs` (신규), `src-tauri/src/tray/mod.rs` | 작업 스케줄러 등록·해제·조회 |
| `src-tauri/src/hook/elevate.rs` (신규, D-4 A안), `src-tauri/src/hook/mod.rs` | UAC 승격 실행 안전 래퍼(unsafe 여기만) |
| `src-tauri/src/assets/mod.rs`, `src-tauri/src/assets/slot.rs` | url 버전 쿼리, 필수 규칙 문서주석 |
| `src-tauri/src/lib.rs` | 시작 순서에 창 속성 적용·자동 실행 상태 보정 추가(setup 부분만. `invoke_handler` 등록은 bridge 몫) |
| `src-tauri/tests/` | 옛 settings.json 호환 등 통합 테스트 |
| `doc/200_설계/core/settings.md`, `window.md`, `assets.md`, `hook.md`, `tray.md`(신규) | 설계 동기화(core-designer) |

## 1. settings — 필드 3개 (SV2-02·03·04)

```rust
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum Language { #[default] Ko, Ja, En }   // JSON: "ko" | "ja" | "en"

pub struct Settings {               // 기존 #[serde(rename_all = "camelCase", default)] 유지
    pub scale: f64,
    pub idle_seconds: u32,
    pub overlay: OverlaySettings,
    pub mouse: Option<MouseSettings>,
    pub autostart: bool,
    pub language: Language,         // 신규, 기본 Ko
    pub position_lock: bool,        // 신규, 기본 false  (JSON positionLock)
    pub show_in_taskbar: bool,      // 신규, 기본 false  (JSON showInTaskbar)
}
```

- **알 수 없는 언어 값은 `Ko`로 읽는다.** 파일 읽기(`settings::load`)와 `set_settings` 입력 역직렬화 모두. `"fr"` 같은 값 때문에 settings.json 전체가 형식 오류가 되면 안 된다. 구현 수단(커스텀 `Deserialize`, `#[serde(other)]` 가능 여부 등)은 core-designer가 정한다.
- `validate()`에 새 규칙 없음(bool 두 개와 enum).
- 스키마 버전 승격·마이그레이션 없음(키 추가 + 기본값, 02-design §4).
- **core 소유 필드 병합** — 입력 설정의 일부 필드를 무시하고 core 현재값을 유지한다:

```rust
/// set_settings 입력에서 core만 바꾸는 필드를 현재값으로 되돌린다.
/// 대상: overlay.x, overlay.y (기존 v0.5 규칙), autostart (신규 — set_autostart·시작 보정만 바꾼다)
pub fn keep_core_owned(input: Settings, current: &Settings) -> Settings
```

  기존 `window::keep_overlay_position`을 대체하거나 그 안에서 `autostart`까지 유지하도록 넓힌다(이름·위치는 core-designer 결정, bridge 패킷은 「core 소유 필드 병합 함수」로 부른다). 두 번 병합(contract §5.3 2·5단계)이 모두 이 함수를 쓴다 — `set_autostart`가 `set_settings` 도중 끝나도 `autostart`가 옛 값으로 덮이지 않게.

## 2. window — 위치 잠금·작업표시줄·위치 초기화 (SV2-03·04·06)

```rust
/// 오버레이 창 상태를 설정대로 맞춘다. 멱등. 창 위치는 읽지도 옮기지도 않는다(기존 규칙).
/// - visible            → show / hide (기존)
/// - position_lock      → set_ignore_cursor_events(position_lock)   // 켜면 클릭 통과 → 끌기·Ctrl+휠도 닿지 않음
/// - show_in_taskbar    → set_skip_taskbar(!show_in_taskbar)
pub fn apply_overlay_settings(app: &AppHandle, settings: &Settings) -> Result<(), WindowError>

/// 오버레이 기본 위치(가상 화면 물리 px). 현행 폴백 Settings::default().overlay = (100, 100)과 같은 값의 단일 출처.
pub fn default_overlay_position() -> Position

/// 기본 위치로 옮기고 저장한다. 반환 = 옮긴 뒤 설정(bridge가 emit·반환에 쓴다).
/// 창이 숨김이어도 옮긴다(표시 상태는 바꾸지 않는다). 위치 잠금 중에도 된다(프로그램 이동).
pub fn reset_overlay_position(app: &AppHandle, state: &AppState) -> Result<Settings, WindowError>
```

- `apply_overlay_settings`의 현재 인자(`&OverlaySettings`)를 바꾸면 호출 지점(bridge `set_settings`, tray 표시 토글, `set_overlay_visible`)이 따라 바뀐다. bridge 호출 지점 수정은 bridge 패킷 몫이므로 **core는 옛 시그니처를 남기고 새 함수를 추가하는 방식도 허용**한다(어느 쪽이든 core 설계 문서에 적는다).
- **오버레이를 다시 보이게 하는 모든 경로**(설정 visible=true, 트레이 표시, `set_overlay_visible(true)`)에서 `set_skip_taskbar`·`set_ignore_cursor_events`를 다시 적용한다 — Windows에서 숨김→표시 후 작업표시줄 상태가 초기화되는지 실측하고, 초기화되면 재적용이 필수다.
- `reset_overlay_position`은 기존 `set_overlay_position` + `persist_overlay_position` 조합으로 만든다. 드래그 저장 디바운스와 겹쳐도 최종 위치가 기본 위치여야 한다.
- 위치 초기화 대상 좌표가 모니터 밖일 수 없다(주 모니터 원점 (0,0) 기준 (100,100)). 모니터 밖 보정 로직은 재사용만 한다.

## 3. 자동 실행 — 작업 스케줄러 + 관리자 (SV2-05)

비유: 지금은 「현관 메모(레지스트리 Run 키)」에 적어 두면 로그인 때 일반 권한으로 켜진다. 바꾸는 방식은 「관리실 일정표(작업 스케줄러)」에 「로그인하면 관리자 권한으로 켜기」를 올리는 것이다. 일정표에 관리자 권한 항목을 올리고 내리는 일 자체가 관리자 일이라, 토글할 때마다 Windows 권한 확인 창(UAC)이 한 번 뜬다.

### 3.1 `tray/autostart.rs` (신규, unsafe 없음)

```rust
pub const TASK_NAME: &str = "kuro_keyviewer";

#[derive(Debug, thiserror::Error)]
pub enum AutostartError {
    #[error("권한 확인이 취소되어 자동 실행 설정을 바꾸지 않았습니다.")] Cancelled,
    #[error("자동 실행 설정을 바꾸지 못했습니다. ({0})")]                Failed(String),
    #[error("자동 실행 설정 파일을 만들지 못했습니다.")]                   Io(#[from] std::io::Error),
}
impl AutostartError { pub fn code(&self) -> &'static str }
// code(): Cancelled → "autostart.cancelled", Failed → "autostart.error", Io → "io.error"
//         (🔒 D-3: 계약 정본 = 실물 `영역.사유` 표기. 이 값이 그대로 BridgeError.code가 된다)

/// 작업 XML(순수 함수, 단위 테스트 대상). exe_path·user_id는 XML 이스케이프(& < > " ').
pub fn build_task_xml(exe_path: &Path, user_id: &str) -> String

/// 등록(enabled=true) 또는 해제(false). 끝나면 query()로 실제 상태를 다시 읽어 반환한다.
/// **블로킹 함수**(UAC 창에서 사용자가 누를 때까지 기다린다). 메인 스레드에서 부르지 않는다 — bridge가 별도 스레드에서 부른다.
pub fn set_enabled(enabled: bool) -> Result<bool, AutostartError>

/// 승격 없이 조회. 있으면 true. 판정 불가(권한 등)면 None.
pub fn query() -> Option<bool>
```

작업 XML 필수 값(작업 스케줄러 기본값의 함정을 피한다):

| 요소 | 값 | 이유 |
|---|---|---|
| `Triggers/LogonTrigger/UserId` | 현재 사용자(`%USERDOMAIN%\%USERNAME%`) | 빼면 **모든 사용자** 로그온에 실행된다 |
| `Principals/Principal` | `UserId` = 같은 사용자, `LogonType` = `InteractiveToken`, `RunLevel` = `HighestAvailable` | 사용자 데스크톱에 관리자 권한으로 뜬다(UIPI 목적) |
| `Settings/ExecutionTimeLimit` | `PT0S` | 기본 72시간이 지나면 앱이 강제 종료된다 |
| `Settings/DisallowStartIfOnBatteries`·`StopIfGoingOnBatteries` | `false` | 기본값이면 노트북 배터리일 때 안 켜진다 |
| `Settings/Priority` | `5`(보통) | 기본 7은 낮은 우선순위(Below Normal) — 훅 콜백이 밀린다 |
| `Settings/MultipleInstancesPolicy` | `IgnoreNew` | 작업 중복 실행 방지 |
| `Actions/Exec/Command`·`WorkingDirectory` | `std::env::current_exe()`와 그 폴더 | exe를 옮기면 토글을 다시 켜야 한다(설정 창 설명에 적힘) |
| `LogonTrigger/Delay` | 기본 없음. 로그온 직후 트레이 아이콘이 안 생기는 것이 실측되면 짧은 지연 추가 | core-designer가 실측으로 결정 |

실행 절차:

1. XML을 `std::env::temp_dir()`에 **UTF-16 LE + BOM**으로 쓴다(파일명에 pid 포함). 실행 뒤 성공·실패와 무관하게 지운다.
2. 등록: `%SystemRoot%\System32\schtasks.exe /Create /TN kuro_keyviewer /XML "<임시 경로>" /F` 를 **승격 실행**(§3.2). 절대 경로로 부른다(PATH 가로채기 방지). 경로는 큰따옴표로 감싼다(Windows 경로에는 `"`가 올 수 없다).
3. 해제: 먼저 `query()`가 `Some(false)`이면 UAC 없이 `Ok(false)`. 아니면 `schtasks.exe /Delete /TN kuro_keyviewer /F` 승격 실행.
4. 종료 코드 0 → `query()` 결과 반환(판정 불가면 요청한 값). 승격 취소 → `Cancelled`. 그 외 → `Failed("schtasks 종료 코드 N")`.
5. 콘솔 창이 번쩍이지 않게 한다(승격 실행은 `SW_HIDE`, 비승격 조회는 `CREATE_NO_WINDOW` — `std::os::windows::process::CommandExt`, unsafe 아님).
6. `query()`: `schtasks.exe /Query /TN kuro_keyviewer`(비승격). 종료 코드 0 → `Some(true)`. **비관리자 프로세스가 관리자 등록 작업을 조회할 수 있는지 이 PC에서 실측**해 `tray.md`에 기록한다. 조회할 수 없으면 0이 아닌 코드를 `Some(false)`로 단정하지 말고 `None`.
7. 입력 내용·경로 외 개인정보를 로그에 남기지 않는다. 로그는 종료 코드·단계만.

기존 plugin-autostart: 제거 승인됨(2026-09-24). 호출(`commands.rs`)은 bridge 몫, `lib.rs` 초기화는 core 몫(선행 조건의 순서 규칙). R-06 화면이 나간 적이 없어 레지스트리 Run 값이 남아 있을 가능성은 낮다 — 정리 코드는 넣지 않는다(필요하면 core-designer가 `확인 필요`로 올린다).

### 3.2 `hook/elevate.rs` (신규, 🔒 D-4 A안 — unsafe 격리 구역)

```rust
#[derive(Debug)]
pub enum ElevateError { Cancelled, Failed(std::io::Error) }

/// program을 "runas" 동사로 숨김 실행하고 끝날 때까지 기다려 종료 코드를 돌려준다.
/// 이미 관리자로 실행 중이면 UAC 창 없이 실행된다. 블로킹.
pub fn run_elevated(program: &Path, args: &str) -> Result<u32, ElevateError>
```

- 구현: `ShellExecuteExW`(`lpVerb = "runas"`, `fMask = SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC`, `nShow = SW_HIDE`) → `WaitForSingleObject(hProcess, INFINITE)` → `GetExitCodeProcess` → `CloseHandle`. 실패 시 `GetLastError() == ERROR_CANCELLED(1223)` → `Cancelled`.
- 모든 `unsafe` 블록에 `// SAFETY:` 주석(문자열 버퍼 수명·널 종료, 핸들 닫기 보장).
- 이 래퍼는 훅 콜백과 무관하다 — 훅 스레드·메시지 루프를 건드리지 않는다. `hook.md`에 「hook 모듈 = 앱의 유일한 unsafe 구역이라 여기 둔다(golden-principles §6)」를 적는다.
- PowerShell `Start-Process -Verb RunAs` 방식(D-4 B안)은 쓰지 않는다(사용자 결정 A안).

### 3.3 시작 시 상태 보정 (`lib.rs` setup)

- 창 표시 뒤 **백그라운드 스레드**에서 `autostart::query()`. `Some(v)`이고 `v != settings.autostart`이면 설정 잠금 안에서 `autostart = v`, 잠금 밖에서 저장, `settings://changed` emit 콜백 호출(드래그 저장과 같은 콜백 주입 방식 — core는 emit 함수를 직접 모른다). `None`이면 아무것도 안 한다.
- 시작 순서 추가: 기존 「리사이즈 → 위치 복원 → 표시 → 이동 감시」 뒤에 `apply_overlay_settings(&app, &settings)`(잠금·작업표시줄) → 자동 실행 조회 스레드 시작.

## 4. assets — 이미지 교체 반영·필수 규칙 (SV2-07·08)

- `AssetEntry.url` = 기존 url + `?v={파일 수정 시각 ms}`. 메타데이터를 못 읽으면 쿼리 없이 기존 url. 같은 슬롯을 다른 그림으로 바꾸면 url이 달라져야 한다(현재는 같아서 WebView가 옛 그림을 캐시로 보인다).
- **실측 필수**: Tauri asset 프로토콜이 쿼리 문자열을 무시하고 경로만으로 파일을 찾는지 `yarn tauri dev`에서 확인한다. 쿼리 때문에 404면 대안(파일명에 리비전을 넣고 교체 시 옛 파일 삭제)을 core-designer가 정하고 bridge에 알린다(계약 §3.2 url 규칙 문구가 달라진다).
- 필수 규칙: **core 로직 변경 없음**(core는 필수 판정을 하지 않는다 — assets.md:137). 문서주석과 설계 문서의 「필수 4장(kb_up·kb_down_0·idle·rest)」을 「필수 3장(kb_up·kb_down_0·mouse_base), idle·rest 선택」으로 고친다: `assets/mod.rs:21-23`, `assets/slot.rs:8`, `assets.md`(8·137·315·655·691·707행 부근).
- `import`의 제자리 덮어쓰기(CORE-002)·`settings::save`의 삭제 후 rename(CORE-001)은 이번 요구 밖이다 — 02-design §5 밖 「미결 권고」로 사용자에게 올라가 있다. 승인 없이 고치지 않는다.

## 5. 수용 기준

| # | 기준 | 증거 |
|---|---|---|
| C-1 | 옛 settings.json(새 키 없음)을 읽으면 `language=Ko`, `position_lock=false`, `show_in_taskbar=false`이고 나머지 값이 그대로 | `cargo test` — 테스트 이름 예 `settings_old_file_defaults_new_fields` |
| C-2 | `"language":"fr"`인 파일을 읽어도 실패하지 않고 `Ko` | `settings_unknown_language_is_ko` |
| C-3 | 직렬화 결과 키가 `language`·`positionLock`·`showInTaskbar`(camelCase), 언어 값이 소문자 | `settings_serialize_new_keys` |
| C-4 | core 소유 필드 병합: 입력 `autostart`·`overlay.x/y`가 무시되고 현재값 유지, 나머지는 입력값 | `keep_core_owned_keeps_autostart_and_position` |
| C-5 | `build_task_xml`: UserId 2곳, `HighestAvailable`, `PT0S`, 배터리 false 2개, `Priority` 5, 경로 이스케이프(`&`·`'` 포함 경로) | `task_xml_*` 단위 테스트 |
| C-6 | `default_overlay_position()` = (100,100) = `Settings::default().overlay` | 단위 테스트 |
| C-7 | url에 `?v=`가 붙고, 같은 슬롯을 다른 파일로 `import`하면 url이 달라진다 | `assets` 단위 테스트(tempfile) |
| C-8 | `cargo fmt --check` · `cargo clippy -- -D warnings` · `cargo test` 전부 통과, hook 밖 unsafe 0 | 실행 로그(테스트 수·PASS) |
| C-9 | 수동(core 단독으로 가능한 범위): 이 PC에서 `set_enabled(true)` → UAC 수락 → `schtasks /Query /TN kuro_keyviewer /XML`에 위 값들이 보임 / UAC 취소 → `Cancelled` / `set_enabled(false)` → 작업 삭제. 비승격 `query()` 실측 결과 기록 | `tray.md` 실측 기록, 스크린샷 또는 명령 출력 |
| C-10 | asset 프로토콜 쿼리 실측 결과 기록 | `assets.md` |

통합 동작(설정 창 토글 → 클릭 통과 등)은 bridge 완료 후 ui 세션·verify에서 본다.

## 6. 하지 말 것

- `src-tauri/src/bridge/*`(command 핸들러·`invoke_handler` 등록)·`src/`·`doc/200_설계/bridge/contract.md`·`capabilities/`·`tauri.conf.json`을 고치지 않는다(bridge·ui 몫). 핸들러가 새 core 함수를 부르게 하는 일은 bridge 패킷에 있다.
- `Cargo.toml` 의존성·feature를 직접 바꾸지 않는다(사용자 승인 사항).
- hook 밖 `unsafe` 금지. 작업 스케줄러 COM(`ITaskService`) 방식 금지(02-design D-4).
- 요구 밖 추가 금지: 단일 인스턴스, exe `requireAdministrator` 매니페스트, 트레이 메뉴 번역·잠금 해제 메뉴, 스키마 `version` 필드, CORE-001·002 수정.
- 입력 상태 기계·훅 콜백 경로를 건드리지 않는다.

## 7. 완료 마커

- `doc/200_설계/core/{settings,window,assets,hook,tray}.md`에 「R-set-v2(SV2-xx) 반영」 변경 이력 행과 실측 기록(C-9·C-10).
- `cargo test` 전체 PASS 로그(테스트 수 명시), `cargo clippy -D warnings` 0, `cargo fmt --check` 0.
- core-manager 완료 보고에 **bridge가 부를 core API 목록**(최종 이름·시그니처): `Language`, `Settings` 새 필드, core 소유 필드 병합 함수, `apply_overlay_settings`(새/옛), `default_overlay_position`, `reset_overlay_position`, `tray::autostart::{set_enabled, query, AutostartError::code}`. bridge 패킷은 이 목록을 착수 조건으로 쓴다.
