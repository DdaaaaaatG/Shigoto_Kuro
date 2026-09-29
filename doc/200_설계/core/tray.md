# tray 모듈 설계

- 상태: 확정(사용자) — §3.5(CR-047)는 초안(범위는 사용자 확정, **실측 게이트 G1·G2 통과 조건부**) · §3.6(CR-048)은 인계 패킷 기준 확정 · §3.7(overlay R-40, CR-062)은 횡단 설계 v2(사용자 결정 U-1~U-6) 기준 확정, **§3.7.3·§3.7.5·§3.7.6은 7차 감사 반영(소스 미적용)** · 최종 갱신: 2026-09-29
- 변경이력:
  - 2026-09-29 (7차, overlay R-40 **감사 반영** — 리뷰 CORE-301(MEDIUM)·SEC-301(LOW)·CORE-302(LOW)·CORE-304(MEDIUM, 기존 위반). 요구·사용자 결정 U-1~U-5·메뉴 항목·공개 API 시그니처 **불변**, 새 크레이트·unsafe 없음) ① **CORE-301 상태 3단계**: `POPUP_OPEN: AtomicBool` + `OpenGuard::try_begin` → `static POPUP: PopupGate`(`AtomicU8`, **Idle → Pending → Open → Idle**). `overlay-menu`가 post **전에** `Idle→Pending`(`try_reserve`), post 실패 시 `cancel`(→Idle), 메인 `popup_now`가 `begin_open`(Pending→Open), 모든 반환 경로에서 가드 Drop(→Idle). 근거: tao 0.37.1은 핸들러 실행 중(= `TrackPopupMenu` 모달) 온 사용자 이벤트를 버퍼링했다가 모달 뒤 실행한다(`runner.rs:143-148·208-226`). 그래서 옛 PU-b 전제("재진입을 `try_begin`이 막는다")가 틀렸다. PU-b·PU-c 개정, 상태 전이표 신설. ② **SEC-301 판정 순서**: ① 상태 → ② 오버레이 창 사각형(`overlay_screen_rect`, **`overlay-menu`에서**) → ③ 전경 창 전체 화면 → ④ 예약·post. 순수 `should_request`(단락 평가)로 고정했다. 사각형 밖 클릭은 다른 프로세스 창을 조회하지 않는다. 비메인 스레드 getter 안전 근거는 tauri-runtime-wry 2.12.0 `lib.rs:196-210·263-278`(동기 왕복). Pending·Open이면 getter를 부르지 않아 모달과 겹치지 않는다(PU-h·PU-i 신설). `popup_now`는 인자 `click`을 받지 않고 사각형 판정을 하지 않는다. ③ **CORE-302**: [hook.md](hook.md) §3.10.3 공통 전제를 코드 SAFETY에 넣고 U13 문구를 "실패 시 pid는 쓰지 않는다(tid 0이면 버림)"로 바꾸라는 인계(§3.7.9 표). ④ **CORE-304**: `lib.rs` setup 4단계를 `fn start_input_pipeline`으로 추출(§3.7.6, 필요 시 `initial_hand_anchor`·`build_app_state`). 테스트 PM5 개정 + **PM6~PM15 신설**. §1·§3·§3.7.3·§3.7.5~§3.7.9·§4 R-40·§8.2a·§10·§11(T16~T19, T12·T13 주석, T-j, T-f 보충) 갱신. 상대 [window.md](window.md) §3.1(스레드 문장), [hook.md](hook.md) §3.10.2·§3.10.3. **소스 미적용.**
  - 2026-09-29 (6차, overlay **R-40** 오버레이 오른쪽 클릭 메뉴, CR-062, 🔒 사용자 결정 U-1·U-3·U-5, 수용 U-2·U-4 — 2026-09-29, 정본 `doc/200_설계/architecture/overlay-context-menu.md` v2 §2·§4·§7) **오버레이 오른쪽 클릭 = 트레이와 같은 메뉴.** 신규 `tray/popup.rs`(unsafe 없음) — 스레드 `overlay-menu`(`pub fn spawn_popup_listener(app, rx)`)가 훅의 `RightClick`을 받아 ① `POPUP_OPEN` 가드 ② **전체 화면이면 생략**(`hook::foreground_snapshot()` → 순수 `suppress_for_fullscreen`, fail-open) ③ 메인 스레드 post → `popup_now`: 창 사각형 두 점 판정(순수 `should_popup`, `window::overlay_screen_rect`) → `current_view` → **기존 `build_menu`** → `WebviewWindow::popup_menu`. **메뉴 클릭은 기존 `on_menu_event`(Tauri 전역 메뉴 리스너)가 처리 — 새 핸들러 등록 금지.** `tray/mod.rs`는 `sync_timer_menu_now`의 보기 계산을 `current_view`로 추출(동작 불변). `lib.rs` 4단계 배선(채널 1개·`hook::start(tx, click_tx)`·`spawn_popup_listener`). 메뉴 항목·문구·순서 불변. 의존 확장 `tray → hook`(`RightClick`·`foreground_snapshot`)·`tray → window`(`overlay_screen_rect`). 테스트 PM1~PM5·FS1~FS7, 수동 MC-31~MC-45(§8.3). 증분 전체 **§3.7**. 상대 [hook.md](hook.md) §3.9·§3.10, [window.md](window.md) §3.1.
  - 2026-09-27 (5차, data-reset R-B2) `refresh_overlay` 가시성만 `pub(crate)`로(§3.4 끝 줄). 동작·메뉴 불변. 정본 [data_reset.md](data_reset.md) §3.8. **소스 미적용.**
  - 2026-09-26 (4차, CR-048 타이머 모드, 🔒 사용자 결정 D-11 A·아키텍트 결정 A-3, 정본 패킷 `doc/200_설계/architecture/timer-mode-03-packet-core.md` §2.5, 근거 `timer-mode-02-design.md` §7) **동적 타이머 메뉴.** 스톱워치나 타이머가 켜져 있을 때만 맨 위에 「시작」(흐르면 「일시정지」, id `timer_toggle`)·「멈춤」(`timer_stop`)·구분선. 신규 `tray/timer_menu.rs`(순수 `TrayTimerView`·`tray_timer_view`), `tray/mod.rs`에 `pub fn sync_timer_menu(app)`(보기가 바뀔 때만 `set_menu`, 메인 스레드로 넘겨 실행)·메뉴 핸들러 2갈래(설정 잠금 → 타이머 잠금 차례, 동시 보유 금지 → 바뀌면 `crate::publish_timer_change`). 의존 추가 `tray → timer`. 증분 전체 **§3.6**, §8.3에 M-T12~M-T14, §10에 TM-11. **소스 미적용.**
  - 2026-09-26 (3차, CR-047 점검 후 정리, 🔒 확정사항 §6 자동 실행 줄 「일반 권한(LeastPrivilege)」, 근거 `.claude/reports/verify-20260926-1821.md` SEC-001·CORE-001) **자동 실행 작업 `RunLevel` `HighestAvailable` → `LeastPrivilege`, 등록·해제는 비승격 `schtasks` 직접 실행 — UAC 승격 경로 삭제**(`hook::run_elevated`·`ElevateError`·`hook/elevate.rs`([hook.md](hook.md) §3.8), `AutostartError::{Cancelled, StatePoisoned}`, code `autostart.cancelled`). 신규 `pub fn reconcile() -> Option<bool>`(시작 보정: 옛 관리자 작업이면 일반 권한으로 다시 등록), `query` 비공개화. `persist_autostart`·트레이 표시/숨김 저장은 `settings::update`([settings.md](settings.md) §3.9). 포터블 배포라 제거 훅 없음 — 남은 작업 지우는 법은 README(메인 세션 몫). **이 절이 §1 「가장 높은 권한」·비유의 UAC 문장, §2 `set_enabled` 실패 조건 `Cancelled`·`query` 공개, §3.2 `RunLevel`·승격 실행 절차, §6 `Cancelled`·`StatePoisoned`, §8.3 UAC 수동 항목을 대체한다**(옛 기록으로 유지). 증분 전체 **§3.5**. **소스 미적용.**
  - 2026-09-26 (2차, CR-046 보강, 🔒 사용자 승인 2026-09-26 — task-manager 지시) **메뉴에 「새로고침」 추가(설정 열기 다음, 오버레이 표시/숨김 앞).** 뗌 유실(hook.md §3.7·§3.7.10)로 키보드·마우스 그림이 눌림/클릭 유지에 고착됐을 때 사용자가 되돌리는 비상 스위치다. 누르면 ① `hook::refresh()`(`pub(crate)`, 내부는 `reset_keys("refresh")` 재사용 — 눌린 키 표·마우스 버튼 상태를 비운다. 훅 스레드가 실행 중이어도 Mutex 라 안전) ② 오버레이 창(`window::OVERLAY_LABEL`)의 `WebviewWindow::reload()`로 WebView를 다시 불러온다. 설정 창은 건드리지 않는다. 새 정적 상태·unsafe·크레이트 없음(`reload`는 Tauri 2.11.6 안전 API). 실패(창 없음·reload 실패)는 기존 `toggle_overlay`와 같은 방식으로 `BridgeError` → 메뉴 이벤트 핸들러의 `log::warn!`. **소스 반영 완료**(`cargo fmt --check`·`cargo clippy --all-targets -D warnings`·`cargo test` 273건 PASS). 메뉴 4항목: 설정 열기 / 새로고침 / 오버레이 표시·숨김 / 종료.
  - 2026-09-24 (1차, 신규 문서, R-set-v2 SV2-05, 🔒 사용자 결정 D-4·D-5 — 확정사항 §6 「자동 실행 = 작업 스케줄러(관리자)」) 기존 트레이(`src-tauri/src/tray/mod.rs` 80줄)를 문서로 옮기고, **자동 실행을 `tauri-plugin-autostart`(레지스트리 Run 키)에서 작업 스케줄러 작업 `kuro_keyviewer`(로그온 트리거·가장 높은 권한)로 교체**한다. 신규 `tray/autostart.rs`(unsafe 없음) — `schtasks.exe` + 작업 XML, 승격 실행은 hook의 안전 래퍼 `hook::run_elevated`([hook.md](hook.md) §3.6). 시작 시 작업 등록 상태로 `settings.autostart`를 보정한다. 트레이 「표시/숨김」이 작업표시줄·위치 잠금 속성을 다시 적용한다([window.md](window.md) §2.4). 사용자 결정 완료로 바로 확정. **소스 미적용.**
- 요구ID 표기: `SV2-xx` = 아키텍처 ID(`doc/200_설계/architecture/settings-v2-02-design.md` §0). 화면 요구ID는 ui-designer가 붙인다(제안: 자동 실행 = 설정 R-23, 기존 R-06 대체). 트레이 메뉴(새로고침 포함 4항목)는 확정사항 §6(요구ID 미부여 — §11 확인 필요 T4).
- 상대 문서: [hook.md](hook.md) §3.6(`run_elevated`) · [window.md](window.md) §2.4(`apply_overlay_window`, `keep_core_owned`) · [settings.md](settings.md) §3.5(`autostart` 쓰기 주체) · 인계 패킷 `doc/200_설계/architecture/settings-v2-03-packet-core.md` §3

## 1. 목적

결론: tray는 트레이 아이콘·메뉴 3항목과 **시작 시 자동 실행(작업 스케줄러 작업 등록·해제·조회)**을 맡는다. 자동 실행은 로그온 때 앱을 **가장 높은 권한**으로 띄워, 관리자 권한으로 실행된 게임 안에서도 전역 입력을 받게 한다(UIPI).

비유: 지금은 「현관 메모(레지스트리 Run 키)」에 적어 두면 로그인 때 일반 권한으로 켜진다. 바꾸는 방식은 「관리실 일정표(작업 스케줄러)」에 「이 사용자가 로그인하면 관리자 권한으로 켜기」를 올리는 것이다. 일정표에 관리자 항목을 올리고 내리는 일 자체가 관리자 일이라, 토글할 때마다 Windows 권한 확인 창(UAC)이 한 번 뜬다. 일정표를 **읽는 것**은 관리자가 아니어도 된다(§11 T1 실측 조건).

| 요구ID | 내용 | 이 모듈의 몫 |
|---|---|---|
| (확정사항 §6 트레이, 요구ID 미부여) | 트레이 아이콘, 메뉴: 설정 열기 / **새로고침** / 오버레이 표시·숨김 / 종료 | `init`(기존 + 새로고침 항목). 표시/숨김은 **SV2부터 `window::apply_overlay_window`로 창 속성 전체를 다시 적용**(§3.3) |
| **CR-046 보강(🔒 사용자 승인 2026-09-26, 요구ID 미부여)** | 뗌 유실로 고착된 그림을 수동으로 되돌리는 「새로고침」 | `refresh_overlay(app)` — `hook::refresh()` + 오버레이 `WebviewWindow::reload()`(§3.4) |
| **SV2-05 (🔒 D-4·D-5)** | 컴퓨터 시작 시 자동 실행 토글 — 작업 스케줄러, 관리자 권한(자동 실행 작업만), 기본 꺼짐 | `autostart::{set_enabled, query, persist_autostart, build_task_xml}`, 시작 시 보정(§4) |
| SV2-03·04 | 숨김 → 표시 뒤에도 위치 잠금·작업표시줄 상태 유지 | 트레이 표시 경로에서 `apply_overlay_window` 호출(§3.3) |
| **TM-11 (CR-048, 🔒 D-11 A·A-3)** | 스톱워치·타이머가 켜져 있을 때만 메뉴 맨 위에 「시작」(흐르면 「일시정지」)·「멈춤」, 트레이 조작이 두 창에 반영 | `sync_timer_menu`·`tray_timer_view`·메뉴 핸들러(§3.6), 반영은 깔때기 `crate::publish_timer_change`([timer.md](timer.md) §3.7) |
| **overlay R-40 (CR-062, 🔒 2026-09-29 U-1·U-3·U-5, 수용 U-2·U-4)** | 오버레이 창 위에서 오른쪽 버튼을 누르고 떼면(누른 곳·뗀 곳 모두 창 사각형 안) 커서 위치에 **트레이와 같은 메뉴**(항목·순서·문구·동작 동일, 뜨는 순간의 설정·타이머 상태). 위치 잠금 중에도 뜨고 클릭은 아래 창에도 전달. 숨김이면 안 뜸. **전체 화면이면 안 뜸.** 한 클릭에 메뉴 하나. 포커스 자동 복귀 없음 | `spawn_popup_listener`(스레드 `overlay-menu`)·`request_popup`·`popup_now`·`should_request`·`should_popup`·`suppress_for_fullscreen`·`PopupGate`/`OpenGuard`(7차 3단계 상태)·`current_view`(§3.7). 메뉴 동작은 기존 `on_menu_event` 공유 |

## 2. 공개 API

`tray/mod.rs`(기존) + `tray/autostart.rs`(신규, `pub mod autostart;`). 신규는 **굵게**.

| 이름 | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `pub fn init(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>>` | 앱 | () | 메뉴·트레이 생성 실패, 아이콘 없음 | 확정사항 §6 |
| **`pub const TASK_NAME: &str = "kuro_keyviewer"`** (`autostart`) | — | — | — | SV2-05 |
| **`pub enum AutostartError`** + **`impl AutostartError { pub fn code(&self) -> &'static str }`** | — | §6 | — | SV2-05 |
| **`pub fn build_task_xml(exe_path: &Path, user_id: &str) -> String`** | 실행 파일 경로, `도메인\사용자` | 작업 XML 문자열(순수) | 없음 | SV2-05 |
| **`pub fn set_enabled(enabled: bool) -> Result<bool, AutostartError>`** | 켜기/끄기 | 끝난 뒤 실제 등록 상태 | `Cancelled`, `Failed`, `Io` | SV2-05 |
| **`pub fn query() -> Option<bool>`** | — | 있음 `Some(true)` / 없음 `Some(false)` / 판정 불가 `None`(승격 없음) | 없음 | SV2-05 |
| **`pub fn persist_autostart(settings: &Mutex<Settings>, path: &Path, enabled: bool) -> Result<Option<Settings>, AutostartError>`** | 설정 상태, settings.json 경로, 실제 등록 상태 | 바뀌어 저장했으면 `Some(스냅샷)`, 같으면 `None` | `StatePoisoned`, `Settings` | SV2-05 |
| **`pub fn spawn_popup_listener(app: AppHandle, rx: std::sync::mpsc::Receiver<crate::hook::RightClick>) -> std::io::Result<()>`** (`popup.rs`, `tray/mod.rs`에서 `pub use`) | 앱 핸들(소유), 훅의 오른쪽 클릭 한 쌍 수신자 | () — 스레드 `overlay-menu`를 띄우고 바로 반환(수신자가 끊기면 스레드 종료) | 스레드 생성 실패(`io::Error`) — 호출자(`lib.rs`)는 경고 로그 후 앱 시작 계속 | overlay R-40 |

- 🔒 이름(bridge 착수 조건, 패킷 §7): `tray::autostart::{set_enabled, query, AutostartError::code}` + `persist_autostart`(core-designer 추가 — §11 T3).
- **블로킹**: `set_enabled`는 UAC 창에서 사용자가 누르고 `schtasks.exe`가 끝날 때까지 돌아오지 않는다. **메인 스레드에서 부르지 않는다**(bridge는 `tauri::async_runtime::spawn_blocking` — §9). `query`도 자식 프로세스를 기다린다(보통 0.1초 안팎) — setup에서는 백그라운드 스레드로(§4).
- `persist_autostart`는 window `persist_overlay_position`과 같은 모양이다: 잠금 안에서 비교·갱신·clone만, 저장은 잠금 밖.

## 3. 내부 구조

| 파일 | 책임 | 변경 |
|---|---|---|
| `src-tauri/src/tray/mod.rs` (80줄) | 트레이 아이콘·메뉴·표시/숨김 토글 | `pub mod autostart;`, `toggle_overlay` 본문(§3.3), `//!` [자동 실행]·[공개 API] 갱신 |
| `src-tauri/src/tray/autostart.rs` (신규, 예상 350~400줄 — 테스트 포함) | 작업 XML 생성, 임시 파일, `schtasks.exe` 승격 실행·조회, 설정 반영 | 신규. unsafe 없음 |
| **`src-tauri/src/tray/popup.rs` (R-40 신규, 예상 230줄 — 테스트 포함)** | 오버레이 오른쪽 클릭 메뉴: `overlay-menu` 스레드(상태 → 창 사각형 → 전체 화면 판정, 예약·post), 메인 스레드 팝업, 상태 기계 `PopupGate`(Idle→Pending→Open, 7차), 순수 판정 3종 + PM1~PM15·FS1~FS7 | 신규. unsafe 없음(§3.7). 7차 개정 후 약 420줄 |
| (R-40, 2026-09-29 실측) `tray/mod.rs` **282줄 → 약 290줄** | `mod popup; pub use popup::spawn_popup_listener;`, `current_view` 추출, `//!` 갱신 | §3.7.2 |

### 3.1 `autostart.rs` 비공개 항목

| 항목 | 시그니처 | 책임 |
|---|---|---|
| `schtasks_path` | `fn schtasks_path() -> PathBuf` | `%SystemRoot%\System32\schtasks.exe`(환경변수 `SystemRoot` 없으면 `C:\Windows`). **절대 경로**로 PATH 가로채기 방지 |
| `format_user_id` | `fn format_user_id(domain: Option<&str>, user: Option<&str>) -> Option<String>` | 둘 다 있으면 `도메인\사용자`, 사용자만 있으면 `사용자`, 사용자 없거나 빈 문자열이면 `None`(순수) |
| `current_user_id` | `fn current_user_id() -> Option<String>` | `env::var("USERDOMAIN")`·`env::var("USERNAME")` → `format_user_id`. **비승격 앱 프로세스에서** 읽으므로 다른 관리자 계정으로 승격(어깨 너머 UAC)해도 작업 주인은 로그인 사용자다 |
| `xml_escape` | `fn xml_escape(s: &str) -> String` | `&`→`&amp;` `<`→`&lt;` `>`→`&gt;` `"`→`&quot;` `'`→`&apos;`(`&` 먼저) |
| `utf16le_with_bom` | `fn utf16le_with_bom(s: &str) -> Vec<u8>` | `[0xFF, 0xFE]` + `s.encode_utf16()`의 LE 바이트 |
| `create_args` | `fn create_args(xml_path: &Path) -> String` | `/Create /TN kuro_keyviewer /XML "<경로>" /F`(경로는 큰따옴표 — Windows 경로에 `"` 불가) |
| `delete_args` | `fn delete_args() -> String` | `/Delete /TN kuro_keyviewer /F` |
| `interpret_query_exit` | `fn interpret_query_exit(code: Option<i32>) -> Option<bool>` | `Some(0)`→`Some(true)`, `Some(1)`→`Some(false)`, 그 밖(`None` 포함)→`None`. **§11 T1 실측 조건부** |
| `TempXml` | `struct TempXml(PathBuf)` + `impl Drop`(파일 삭제, 실패 무시) | 임시 XML 수명 — 성공·실패·패닉과 무관하게 지운다 |
| `write_temp_xml` | `fn write_temp_xml(xml: &str) -> Result<TempXml, std::io::Error>` | `env::temp_dir().join(format!("kuro_keyviewer_task_{}.xml", std::process::id()))`. 남은 파일이 있으면 지우고(NotFound 무시) `OpenOptions::new().write(true).create_new(true)`로 만들어 `utf16le_with_bom(xml)`을 쓴다 |
| `enable` / `disable` | `fn enable() -> Result<bool, AutostartError>` / `fn disable() -> Result<bool, AutostartError>` | `set_enabled`의 두 갈래(§3.2). 각 50줄 이하 |
| `run_schtasks_elevated` | `fn run_schtasks_elevated(args: &str) -> Result<u32, AutostartError>` | `hook::run_elevated(&schtasks_path(), args)` → `ElevateError::Cancelled`→`Cancelled`, `ElevateError::Failed(e)`→`Failed(e.to_string())` |

### 3.2 작업 XML과 실행 절차 (🔒 필수 값 — 패킷 §3.1 표)

```rust
/// 작업 스케줄러 작업 XML(스키마 1.2). exe_path·user_id 는 xml_escape 한다(순수, 단위 테스트 대상).
/// exe_path 의 부모 폴더가 없거나 빈 경로면 WorkingDirectory 요소를 넣지 않는다.
pub fn build_task_xml(exe_path: &Path, user_id: &str) -> String {
    let user = xml_escape(user_id);
    let exe = xml_escape(&exe_path.to_string_lossy());
    let dir = exe_path
        .parent()
        .filter(|d| !d.as_os_str().is_empty())
        .map(|d| format!("\n      <WorkingDirectory>{}</WorkingDirectory>", xml_escape(&d.to_string_lossy())))
        .unwrap_or_default();
    format!(
        r#"<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>kuro_keyviewer autostart at logon</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <UserId>{user}</UserId>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>{user}</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>5</Priority>
    <Enabled>true</Enabled>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>{exe}</Command>{dir}
    </Exec>
  </Actions>
</Task>
"#
    )
}
```

| 요소 | 값 | 이유 |
|---|---|---|
| `LogonTrigger/UserId` | 현재 사용자 | 빼면 **모든 사용자** 로그온에 실행된다 |
| `Principal` `UserId`·`LogonType`·`RunLevel` | 같은 사용자 · `InteractiveToken` · `HighestAvailable` | 사용자 데스크톱에 가장 높은 권한으로 뜬다(암호 저장 없음). 표준 사용자 계정이면 일반 권한으로 뜬다(가장 높은 권한 = 일반) |
| `ExecutionTimeLimit` | `PT0S` | 기본 72시간이 지나면 강제 종료된다 |
| 배터리 2개 | `false` | 기본값이면 노트북 배터리일 때 안 켜진다 |
| `Priority` | `5`(보통) | 기본 7(Below Normal)은 훅 콜백이 밀린다 |
| `MultipleInstancesPolicy` | `IgnoreNew` | 작업 중복 실행 방지 |
| `Exec/Command`·`WorkingDirectory` | `std::env::current_exe()`와 그 폴더 | exe를 옮기면 토글을 다시 켜야 한다(설정 창 설명 문구, ui) |
| `LogonTrigger/Delay` | **없음** | tray-icon은 탐색기 재시작(`TaskbarCreated`)에 아이콘을 다시 올린다. 재로그온 수동 검사 M-T6에서 트레이 아이콘이 안 생기면 `<Delay>PT5S</Delay>`를 `LogonTrigger`에 넣는다(사전 승인된 대안 — 구현자는 실측 결과와 함께 보고) |

**`set_enabled(enabled)`**

1. `enabled == true` → `enable()`:
   1. `exe = std::env::current_exe()?`(→ `Io`), `user = current_user_id()` — 없으면 `Failed("현재 사용자 이름을 읽지 못했습니다")`.
   2. `let xml = build_task_xml(&exe, &user)`, `let tmp = write_temp_xml(&xml)?`(→ `Io`).
   3. `let code = run_schtasks_elevated(&create_args(&tmp.0))?`. `tmp`는 이 함수가 끝날 때 Drop으로 지워진다.
   4. `code == 0` → `Ok(query().unwrap_or(true))`. 그 밖 → `Err(Failed(format!("schtasks 종료 코드 {code}")))`.
   - 이미 등록돼 있어도 다시 등록한다(`/F` 덮어쓰기) — exe를 옮긴 뒤 다시 켜는 경로.
2. `enabled == false` → `disable()`:
   1. `query() == Some(false)` → UAC 없이 `Ok(false)`.
   2. `let code = run_schtasks_elevated(&delete_args())?`.
   3. `code == 0` → `Ok(query().unwrap_or(false))`. 그 밖 → `query() == Some(false)`이면 `Ok(false)`(이미 없음 — 조회 직후 다른 곳에서 지운 경우), 아니면 `Err(Failed(format!("schtasks 종료 코드 {code}")))`.
3. 콘솔 창: 승격 실행은 `SW_HIDE`(hook 래퍼), 비승격 조회는 `CommandExt::creation_flags(CREATE_NO_WINDOW.0)`(`windows::Win32::System::Threading::CREATE_NO_WINDOW` 상수 — 호출이 아니라 값만 쓴다, unsafe 아님).
4. 로그: 단계·종료 코드만(`log::info!("자동 실행 등록: schtasks 종료 코드 {code}")`). 사용자 이름·경로·XML은 로그에 남기지 않는다.

**`query()`**

```rust
pub fn query() -> Option<bool> {
    let status = Command::new(schtasks_path())
        .args(["/Query", "/TN", TASK_NAME])
        .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW.0)
        .status()
        .ok()?;
    interpret_query_exit(status.code())
}
```

- 출력 문구(지역화됨)는 읽지 않는다 — 종료 코드만 본다.

### 3.3 `toggle_overlay` 변경 (SV2-03·04 — 숨김→표시 후 창 속성 재적용)

```rust
fn toggle_overlay(app: &AppHandle) -> Result<(), BridgeError> {
    let win = app.get_webview_window(window::OVERLAY_LABEL)
        .ok_or_else(|| BridgeError::new("window.not_found", "오버레이 창을 찾을 수 없습니다."))?;
    let next = !win.is_visible()?;
    let Some(state) = app.try_state::<crate::AppState>() else {
        return Ok(window::set_overlay_visible(app, next)?);
    };
    let snapshot = {
        let mut s = state.settings.lock().map_err(|_| BridgeError::new("state.poisoned", "설정 상태가 손상되었습니다. 앱을 다시 시작하세요."))?;
        s.overlay.visible = next;
        s.clone()
    };
    window::apply_overlay_window(app, &snapshot)?;          // 표시/숨김 + 작업표시줄 + 클릭 통과
    if let Err(e) = crate::settings::save(&state.paths.settings_file, &snapshot) {
        log::warn!("설정 저장 실패: {e}");
    }
    let _ = crate::bridge::events::emit_settings_changed(app, &snapshot);
    Ok(())
}
```

- 달라진 점: ① `set_overlay_visible` → `apply_overlay_window`(재적용) ② 잠근 채 저장·emit하던 것을 잠금 밖으로(스킬 §4). 반환 타입 `BridgeError`는 기존 부채 그대로(§11 T5).

### 3.4 `refresh_overlay` 신설 (CR-046 보강, 🔒 사용자 승인 2026-09-26)

```rust
fn refresh_overlay(app: &AppHandle) -> Result<(), BridgeError> {
    crate::hook::refresh();
    let win = app
        .get_webview_window(window::OVERLAY_LABEL)
        .ok_or_else(|| BridgeError::new("window.not_found", "오버레이 창을 찾을 수 없습니다."))?;
    win.reload().map_err(|e| {
        BridgeError::new(
            "window.reload_failed",
            format!("오버레이를 새로고침하지 못했습니다: {e}"),
        )
    })
}
```

- `hook::refresh()`는 훅 모듈의 `pub(crate) fn`(hook.md §2·§3.7.4 증분) — 내부는 기존 `reset_keys("refresh")`를 그대로 부른다. 새 정적 상태·unsafe 없음.
- `win.reload()`는 `tauri::WebviewWindow`의 안전한 공개 메서드(Tauri 2.11.6 `webview_window.rs:2389`, 내부적으로 `Webview::reload` 위임) — WebView를 다시 로드해 오버레이 프론트엔드 상태(ui `inputMachine` 등)를 초기화한다. 설정 창(`window::SETTINGS_LABEL`)은 건드리지 않는다.
- 실패(오버레이 창 없음·reload 실패)는 `toggle_overlay`와 같은 경로로 메뉴 이벤트 핸들러의 `log::warn!`이 받는다 — 트레이 메뉴 처리 자체는 계속 동작한다.
- 새 에러 코드 `window.reload_failed`(신규) — bridge 계약에는 노출되지 않는다(command가 아니라 트레이 메뉴 내부 처리).
- **data-reset(2026-09-27, R-B2)**: 가시성을 `fn` → **`pub(crate) fn refresh_overlay`**로 바꾼다(본문·동작 불변). bridge `reset_app_data`가 전체 초기화 뒤 마지막 단계에서 부른다([data_reset.md](data_reset.md) §3.8·§9). 그 경로에서 `window.not_found`·`window.reload_failed`를 command 에러로 내보낼지는 bridge 계약 소관이다.

### 3.5 CR-047 — 자동 실행 작업 일반 권한(LeastPrivilege)·승격 경로 제거 (SEC-001, 🔒 확정사항 §6 자동 실행 줄 2026-09-26 — 실측 게이트 G1·G2 통과 조건부, 구현자가 그대로 옮길 것)

결론: 작업 XML의 `RunLevel`을 `LeastPrivilege`로 바꾸면 등록·해제에 UAC 승격이 필요 없다. `schtasks.exe`를 `query()`처럼 **비승격 `Command`로 직접 실행**하고, 승격 경로(`hook::run_elevated`·`ElevateError`·`hook/elevate.rs`·`AutostartError::Cancelled`·`autostart.cancelled`)를 지운다. 시작 보정은 등록 여부와 함께 `RunLevel`을 읽어, 옛 관리자 작업(`HighestAvailable`)이 남아 있으면 일반 권한 작업으로 다시 등록한다. 포터블 배포라 제거 훅은 없다 — 남은 작업을 지우는 법은 **README 안내(메인 세션 몫)**.

비유: 관리실 일정표에 「관리자 권한으로 켜기」 대신 「평소 권한으로 켜기」를 올린다. 평소 권한 항목은 본인이 직접 올리고 내릴 수 있어 관리실 허락(UAC)이 필요 없다. 대신 관리자 권한으로 실행된 게임 안의 입력은 받지 못한다(UIPI) — 필요하면 사용자가 exe를 직접 관리자로 실행한다(확정사항 §6).

#### 3.5.1 근거 — 일반 권한 작업은 승격 없이 등록·해제된다

| # | 근거 | 확인 수단 |
|---|---|---|
| E1 | 작업 스케줄러 2.0 보안 규칙(Microsoft 문서 — 작업 보안·`ILogonTrigger`·`IPrincipal::RunLevel`, 설계자 요약·원문 대조 전): 관리자 권한이 필요한 등록은 ① 부팅 트리거 ② 「모든 사용자」 로그온 트리거(`LogonTrigger`에 `UserId` 없음 — `schtasks /SC ONLOGON` 기본형) ③ 다른 계정·SYSTEM 주체·암호 저장 ④ **`RunLevel=HighestAvailable`을 분할 토큰 관리자가 등록**(승격 토큰 필요 — 현 설계가 UAC를 띄운 이유). 현 XML(`build_task_xml`)은 `LogonTrigger/UserId` = 로그인 사용자, `Principal/UserId` = 같은 사용자, `LogonType=InteractiveToken`(암호 없음)이라 ①②③에 해당하지 않고 ④만 해당 → ④를 빼면 승격 조건이 없다 | **실측 게이트 G1** |
| E2 | 비승격으로 만든 작업은 작성자(같은 사용자 SID)에게 전체 권한이 있어 같은 사용자가 비승격으로 `/Delete`·`/Create /F`(덮어쓰기)를 할 수 있다 | **G2** |
| E3 | 비승격 `schtasks /Query`는 이미 동작한다(현 `query()`, §11 T1) — 비승격 자식 프로세스 실행 경로 자체는 검증됨 | 기존 코드·수동 확인 |
| E4 | 옛 버전이 **승격 상태로** 만든 `HighestAvailable` 작업을 비승격으로 덮어쓰거나 지울 수 있는지는 문서로 단정할 수 없다(작업 보안 설명자·서비스 검사에 따라 다름) | **G3** — 결과에 따라 §3.5.4 A/B 경로 |

설계자는 이 PC에서 schtasks를 실행하지 못했다(읽기 전용 Bash 가드, 시스템 변경 명령). **G1·G2 통과가 승격 경로 삭제의 전제 조건이다.** G1 또는 G2가 실패하면 core-implementer는 삭제를 멈추고 보고한다(대안 D47-3).

#### 3.5.2 실측 게이트 (구현 착수 전 — 관리자 그룹 계정 + UAC 켜짐, **비승격** 셸, 테스트 작업 이름 `kuro_keyviewer_g`)

| # | 절차 | 통과 조건 |
|---|---|---|
| G1 | 새 `build_task_xml` 출력(LeastPrivilege)을 UTF-16LE+BOM 파일로 저장 → `schtasks /Create /TN kuro_keyviewer_g /XML <파일> /F` | 종료 코드 0, UAC 창 없음, `schtasks /Query /TN kuro_keyviewer_g /XML` 출력에 `LeastPrivilege` |
| G2 | `schtasks /Delete /TN kuro_keyviewer_g /F` | 종료 코드 0, 이어서 `/Query /TN kuro_keyviewer_g` 종료 코드 1 |
| G3 | **승격** 셸에서 옛 XML(`HighestAvailable`)로 `kuro_keyviewer_g` 등록 → **비승격**에서 G1 명령(덮어쓰기) 종료 코드 기록 → 비승격 `/Delete` 종료 코드 기록 → 승격 셸로 뒷정리 | 기록만(성공·실패 모두 설계 경로 있음) |
| G4 | `/Query /TN .. /XML` 출력을 Rust `Command::output()`처럼 파이프로 받아 앞 4바이트 확인 | 인코딩 기록(UTF-16LE BOM `FF FE` / 콘솔 코드 페이지) — `parse_run_level`은 둘 다 처리 |
| G5 | 실제 앱: 설정 창에서 켜기 → 로그오프·로그온 | 앱이 뜨고, 작업 관리자 「세부 정보」 `권한 상승` 열 = 아니요, 토글 때 UAC 창 없음 |

기록 위치: `doc/300_검증/`의 이번 CR 검증 기록(메인 세션). G3 결과가 README 문구를 정한다.

#### 3.5.3 공개 API 변경 (🔒)

| 이름 | 변경 |
|---|---|
| `pub fn build_task_xml(exe_path: &Path, user_id: &str) -> String` | 시그니처 불변. `<RunLevel>HighestAvailable</RunLevel>` → **`<RunLevel>LeastPrivilege</RunLevel>`**. 나머지 요소(§3.2) 불변 |
| `pub fn set_enabled(enabled: bool) -> Result<bool, AutostartError>` | 시그니처 불변. `/Create`·`/Delete`를 **비승격 `Command`**로 실행(아래 `run_schtasks`). 실패 조건 `Failed`·`Io`(**`Cancelled` 삭제**). UAC 대기는 없어졌지만 자식 프로세스를 기다리므로 **메인 스레드 금지는 유지**(bridge `spawn_blocking` 유지) |
| **`pub fn reconcile() -> Option<bool>`**(신규) | 시작 보정용. 등록 상태·`RunLevel` 조회 → 옛 관리자 작업이면 일반 권한으로 다시 등록 → 실제 등록 여부. 판정 불가 `None`. 블로킹(메인 스레드 금지) |
| `fn query() -> Option<bool>` | **`pub` → 비공개**(호출자 `lib.rs spawn_autostart_sync`가 `reconcile`로 바뀌어 외부 사용처 0). 본문 불변 |
| `pub fn persist_autostart(settings: &Mutex<Settings>, path: &Path, enabled: bool) -> Result<Option<Settings>, AutostartError>` | 시그니처 불변. 본문 = `settings::update`(클로저: `autostart` 대입) → `changed`면 `Some(settings)`([settings.md](settings.md) §3.9.6 S3) |
| `pub enum AutostartError` | **`Cancelled`·`StatePoisoned` 삭제**, `impl From<ElevateError>` 삭제 → `{ Failed(String), Io(#[from] std::io::Error), Settings(#[from] SettingsError) }` |

`AutostartError`(§6 대체):

| 변형 | 한국어 메시지 | `code()` |
|---|---|---|
| `Failed(String)` | `자동 실행 설정을 바꾸지 못했습니다. ({0})` | `autostart.error` |
| `Io` | `자동 실행 설정 파일을 만들지 못했습니다.` | `io.error` |
| `Settings(SettingsError)` | transparent | `e.code()` — 잠금 오염은 `SettingsError::StatePoisoned` → `state.poisoned`(같은 code 유지) |

#### 3.5.4 비공개 항목·절차

```rust
/// 등록 작업 상태(비공개). `/Query /XML` 결과 해석용.
#[derive(Debug, PartialEq)]
enum TaskState { Missing, Standard, LegacyElevated }

/// schtasks 를 비승격·창 없이(CREATE_NO_WINDOW) 실행하고 종료 코드를 돌려준다(stdout·stderr 버림).
/// 종료 코드 없음 → `Failed`, 실행 실패 → `Io`.
fn run_schtasks(args: &[&OsStr]) -> Result<i32, AutostartError>

/// `/Query /TN kuro_keyviewer /XML` → 종료 1 = Missing, 0 = parse_run_level(stdout), 그 밖 = None.
/// 종료 0인데 해석 불가면 경고 로그 후 Some(Standard)(등록은 확실, 보정 안 함).
fn query_state() -> Option<TaskState>

/// 순수: stdout 바이트 → RunLevel 판정. 앞 2바이트가 `FF FE`이거나 두 번째 바이트가 0이면
/// UTF-16LE, 아니면 UTF-8 lossy 로 읽는다. `HighestAvailable` 포함 → LegacyElevated,
/// `<Task` 포함 → Standard(RunLevel 없음 = 스키마 기본 LeastPrivilege), 그 밖 → None.
fn parse_run_level(stdout: &[u8]) -> Option<TaskState>
```

- `create_args(xml_path) -> String`·`delete_args() -> String`(인자 한 문자열)은 `ShellExecuteExW` 전용이었다 → `Command::args`용 목록 `["/Create", "/TN", TASK_NAME, "/XML", <경로>, "/F"]`·`["/Delete", "/TN", TASK_NAME, "/F"]`을 돌려주는 비공개 함수로 바꾼다(경로 따옴표 불필요 — `Command`가 인용). 반환 타입은 구현자 재량(`Vec<OsString>` 권장).
- `enable()`·`disable()` 흐름 불변(승격 호출 → `run_schtasks`). `disable`의 「이미 없으면 schtasks 호출 안 함」 유지. `run_schtasks_elevated` 삭제.
- `reconcile()`:
  1. `query_state()?`(판정 불가 → `None`).
  2. `Missing` → `Some(false)`, `Standard` → `Some(true)`.
  3. `LegacyElevated` → `log::info!("옛 관리자 권한 자동 실행 작업을 일반 권한으로 다시 등록합니다")` → `enable()`. 성공 → 그 결과. 실패 → `log::warn!("옛 관리자 권한 자동 실행 작업을 바꾸지 못했습니다({code})")` 후 `Some(true)`(작업은 남아 있음).
  - **A 경로(G3 덮어쓰기 성공)**: 새 버전 첫 실행에서 자동 전환 끝. README는 참고 한 줄.
  - **B 경로(G3 실패)**: 로그만 남고 옛 작업이 유지된다. README에 「관리자 PowerShell에서 `schtasks /Delete /TN kuro_keyviewer /F` 후 설정 창에서 다시 켜기」. 이 경우 설정 창에서 끄기도 `autostart.error`로 실패한다(설정 불변).
- `lib.rs spawn_autostart_sync`: `tray::autostart::query()` → **`tray::autostart::reconcile()`**(나머지 불변 — `persist_autostart` → `changed`면 emit). `lib.rs`는 core 소관.
- `toggle_overlay`(tray/mod.rs): `settings::update`로 저장([settings.md](settings.md) §3.9.6 S4) — 저장 실패면 창을 바꾸지 않고 `Err`, 성공이면 `apply_overlay_window(&out.settings)` → `changed`면 emit.
- `write_temp_xml` 불변. SEC-004(임시 XML 이름 예측)는 범위 밖 — 승격 제거로 같은 사용자 권한 안의 문제로 줄어든다(보류).
- `//!` 문서주석(`autostart.rs`·`tray/mod.rs`): 「관리자 권한」「UAC」「가장 높은 권한」「`hook::run_elevated`」 문구를 「일반 권한(LeastPrivilege)·승격 없음」으로, [에러]에서 `Cancelled`·`StatePoisoned` 삭제, [공개 API]에 `reconcile` 추가·`query` 삭제.

#### 3.5.5 삭제 목록 (죽은 코드)

| 항목 | 위치 | 처리 |
|---|---|---|
| `run_elevated`·`ElevateError`·`OwnedProcess`·`to_wide`·`classify_launch_error`·테스트 4건 | `hook/elevate.rs`(145줄) | **파일 삭제**([hook.md](hook.md) §3.8) |
| `mod elevate;`·`pub use elevate::{run_elevated, ElevateError};`·`//!` [공개 API]의 두 이름 | `hook/mod.rs:74-75·17` | 삭제 |
| `AutostartError::Cancelled`·`StatePoisoned`·`From<ElevateError>`·`run_schtasks_elevated`·`use crate::hook::{self, ElevateError}` | `tray/autostart.rs` | 삭제 |
| `windows` 기능 `Win32_UI_Shell`·`Win32_System_Registry` | `Cargo.toml:34-35` | 다른 사용처 0이면 제거 — **Cargo.toml 수정이라 사용자 승인 후**(Q47-2). 남겨도 동작·경고 영향 없음 |
| code `autostart.cancelled` | bridge·ui | bridge 요구 B1(§3.5.7) |

#### 3.5.6 테스트 (= §8 증분)

| ID | 대상 | 기대 |
|---|---|---|
| X2′ | `build_task_xml` | `<RunLevel>LeastPrivilege</RunLevel>` 포함, `HighestAvailable` 없음(나머지 필수 값 그대로) |
| X7′·X8′ | 인자 목록 | `["/Create","/TN","kuro_keyviewer","/XML",<경로>,"/F"]`·`["/Delete","/TN","kuro_keyviewer","/F"]`(공백 든 경로도 한 원소) |
| X12′ | `AutostartError::code` | `Failed` → `autostart.error`, `Io` → `io.error`, `Settings(StatePoisoned)` → `state.poisoned`, `Settings(Invalid)` → `settings.invalid`. `Cancelled`·`StatePoisoned` 단언 삭제 |
| LP1 | `parse_run_level` | UTF-8 XML에 `<RunLevel>HighestAvailable</RunLevel>` → `LegacyElevated` |
| LP2 | `parse_run_level` | 같은 XML을 UTF-16LE+BOM으로 → `LegacyElevated` |
| LP3 | `parse_run_level` | `<RunLevel>LeastPrivilege</RunLevel>` → `Standard` |
| LP4 | `parse_run_level` | `<Task ...>`만 있고 `RunLevel` 요소 없음 → `Standard` |
| LP5 | `parse_run_level` | 빈 바이트·`ERROR:` 문구 → `None` |
| P3′ | `persist_autostart` 오염 잠금 | `Err(AutostartError::Settings(SettingsError::StatePoisoned))` |

- P1·P2는 기대 불변(`update` 경유).
- 수동 체크리스트(§8.3)의 「UAC 창이 뜬다·취소하면 불변」 항목은 **G1·G2·G5로 대체**하고, 「토글 때 UAC 창이 뜨지 않는다」「옛 작업이 있던 PC에서 첫 실행 뒤 `/Query /XML`이 `LeastPrivilege`(A 경로)」를 더한다.

#### 3.5.7 bridge 요구 (= §9 증분, 계약 확정은 bridge-designer)

- **B1 `set_autostart`**: 시그니처·반환 불변. **`autostart.cancelled`는 더 이상 나오지 않는다** → 계약 §5 표·§5.5 1행·§6 code 표·§6.1 `AutostartError` 매핑·명령별 code 표에서 폐기 표기. 설명의 「작업 스케줄러(가장 높은 권한)」「UAC 권한 확인 창」「수 초~수십 초」 → 「일반 권한, 승격 없음, 보통 1초 안팎(자식 프로세스 대기)」. `spawn_blocking`은 유지. `bridge/types.rs:49`·`commands.rs:412` 주석의 `autostart.cancelled` 언급 정리.
  - ui 파급(ui-manager 판단): `src/settings/components/GeneralTab.tsx:71`의 `autostart.cancelled` 분기, i18n `types.ts:63·88`·`ko.ts`·`ja.ts`·`en.ts`, 테스트 `GeneralTab.test.tsx` TC-114·`i18n.test.ts:45·207`·`SettingsApp.test.tsx:1022` — 죽은 분기가 된다(남겨도 무해, 정리하면 한 묶음). 설정 창 자동 실행 안내 문구에 관리자·UAC 언급이 있으면 고친다.
- 새 command·event·code 없음. `reconcile`은 `lib.rs`(core)만 부른다.

#### 3.5.8 결정·확인 필요·추적 (= §10·§11 증분)

- **D47-1** 승격 경로 전체 삭제(조건: G1·G2 통과) — 쓰지 않는 unsafe 4블록(E1~E4)을 남기지 않는다(죽은 unsafe = 검토 비용).
- **D47-2** 옛 관리자 작업 보정은 시작 시 1회 자동(`reconcile`) — 사용자 조작 없이 SEC-001을 닫는 유일한 경로. 실패하면 README.
- **D47-3** 대안(G1·G2 실패 시에만): `elevate.rs` 유지 + XML만 `LeastPrivilege` — 권한 상승 경로(SEC-001)는 닫히고 UAC 창만 남는다.
- **D47-4** `query` 비공개화 — 외부 사용처 0(verify CORE-013 과다 pub 방향과 일치).
- Q47-1 README 문구(메인 세션): 「포터블 exe를 지우기 전에 설정 창에서 자동 실행 끄기」「이미 지웠으면 작업 스케줄러 라이브러리에서 `kuro_keyviewer` 삭제 또는 `schtasks /Delete /TN kuro_keyviewer /F`」「관리자로 실행된 게임 안 입력이 필요하면 exe를 직접 관리자로 실행」「(G3이 B 경로면) 옛 버전에서 자동 실행을 켰던 사용자는 관리자 PowerShell에서 위 삭제 명령 후 다시 켜기」.
- Q47-2 `Cargo.toml` `windows` 기능 2개 제거 승인(사용자).
- 추적: SEC-001 → §3.5 **부분**(설계 완료, 실측 게이트 대기, 소스 미적용) · CORE-001(tray 몫 S3·S4) → §3.5.3·§3.5.4 ✅(설계).

### 3.6 CR-048 — 타이머 메뉴 「시작/일시정지」·「멈춤」 (TM-11, 🔒 패킷 §2.5, 사용자 결정 D-11 A, 아키텍트 결정 A-3, 구현자가 그대로 옮길 것)

결론: 스톱워치나 타이머가 켜져 있을 때만(`timer.enabled`) 메뉴 맨 위에 「시작」(흐르는 중이면 「일시정지」)·「멈춤」과 구분선을 둔다. 보기 `{visible, running}`이 바뀔 때만 메뉴를 새로 만들어 바꿔 끼운다. 조작은 설정 잠금과 타이머 잠금을 **차례로**(동시에 쥐지 않고) 거쳐 `Timer::apply`를 부르고, 바뀌었으면 깔때기 `crate::publish_timer_change`로 두 창·트레이·마감 스레드에 알린다.

비유: 리모컨 버튼판이다. 타이머 전원이 켜져 있을 때만 버튼 두 개가 판 맨 위에 나타나고, 흐르는 중에는 「시작」 버튼 이름표가 「일시정지」로 바뀐다. 이름표가 그대로면 판을 갈지 않는다.

#### 3.6.1 공개 API (신규)

```rust
// tray/timer_menu.rs — 순수(Tauri 무관)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TrayTimerView {
    pub visible: bool,
    pub running: bool,
}

/// visible = enabled, running = (status == Running). Paused·RestPaused·Stopped·Finished는 running=false.
pub fn tray_timer_view(enabled: bool, status: crate::timer::TimerStatus) -> TrayTimerView;

// tray/mod.rs — `mod timer_menu; pub use timer_menu::{tray_timer_view, TrayTimerView};`
/// 트레이 메뉴를 지금 설정·타이머 상태에 맞춘다. 보기가 마지막과 같으면 아무것도 안 함. 실패는 경고 로그.
pub fn sync_timer_menu(app: &AppHandle);
```

| 이름 | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `tray_timer_view` | `timer.enabled`, 타이머 상태 | 보기(순수) | 없음 | TM-11 |
| `sync_timer_menu` | 앱 | `()` | 없음 — 트레이 없음·메뉴 생성 실패·잠금 오염은 `log::warn!` | TM-11 |

- 호출자: `lib.rs` setup(`tray::init` 뒤 1회), 깔때기 `crate::publish_timer_change`(트레이·마감 스레드, bridge 패킷 뒤 command), bridge `set_settings` 부수 효과(bridge 패킷 — 켜고 끌 때 스냅숏이 그대로여도 메뉴는 바뀐다).

#### 3.6.2 메뉴 id·라벨·배치 (02-design §7, D-11 A)

| 보기 | 메뉴(위→아래) |
|---|---|
| `visible == false` | 설정 열기 / 새로고침 / 오버레이 표시/숨김 / 종료(지금과 같음) |
| `visible`, `!running` | **시작**(`timer_toggle`) / **멈춤**(`timer_stop`) / `PredefinedMenuItem::separator` / 기존 4개 |
| `visible`, `running` | **일시정지**(`timer_toggle`) / **멈춤** / 구분선 / 기존 4개 |

- 상수 `ID_TIMER_TOGGLE = "timer_toggle"`, `ID_TIMER_STOP = "timer_stop"`. 라벨은 한국어 고정(A-3 — 트레이 다국어는 요구 없음, §11 T-e).
- 메뉴 조립은 비공개 `fn build_menu(app: &AppHandle, view: TrayTimerView) -> tauri::Result<Menu<tauri::Wry>>` 한 곳. `init`도 이것을 쓴다(`view` = 숨김). 기존 4항목 id·라벨·순서 불변.

#### 3.6.3 `sync_timer_menu` 절차

본문 전체를 `app.run_on_main_thread(move || …)`로 **메인 스레드에 넘겨** 실행한다(넘기기 실패는 `log::warn!`). 메인 스레드 안에서:

1. `app.try_state::<crate::AppState>()` 없으면 반환.
2. (설정 잠금) `enabled = s.timer.enabled` 복사 → 해제. (타이머 잠금) `status = t.status()` → 해제. 오염 → `log::warn!` 후 반환. **두 잠금을 동시에 쥐지 않는다.**
3. `view = tray_timer_view(enabled, status)`.
4. 마지막 보기(모듈 안 `static LAST_VIEW: Mutex<Option<TrayTimerView>>`)와 같으면 반환. 다르면 `build_menu(app, view)` → `app.tray_by_id("main")` → `set_menu(Some(menu))`. 성공하면 `LAST_VIEW = Some(view)`. 실패(트레이 없음·생성 실패) → `log::warn!`, `LAST_VIEW` 그대로(다음 호출에서 다시 시도).

- **메인 스레드로 넘기는 이유**(D48-t1): 호출 스레드가 여럿(메인·마감 스레드·command)이다. ① 늦게 계산한 보기가 먼저 적용되는 뒤바뀜이 없다(실행 순간의 상태를 읽는다) ② `LAST_VIEW`를 쥔 채 메인 스레드를 기다리는 교착 경로가 없다 ③ 메뉴 API를 메인 스레드에서 부른다(02-design §11 R-3). 메인 스레드에서 불려도 이벤트 루프의 다음 차례에 실행된다(메뉴 핸들러가 먼저 끝남 — 무해). 스레드 요구는 구현자가 Tauri 소스로 확인([timer.md](timer.md) §11 T-C6).
- `init`은 `LAST_VIEW = Some(숨김)`으로 둔다 → setup의 `sync_timer_menu` 1회가 켜짐이면 메뉴를 바꾼다.

#### 3.6.4 메뉴 핸들러 (`on_menu_event`에 2갈래 추가)

```rust
ID_TIMER_TOGGLE => { control_timer_from_tray(app, true); Ok(()) }
ID_TIMER_STOP => { control_timer_from_tray(app, false); Ok(()) }
```

`fn control_timer_from_tray(app: &AppHandle, toggle: bool)`(비공개, 실패는 안에서 경고 로그):

1. `app.try_state::<crate::AppState>()` 없으면 반환.
2. (설정 잠금) `enabled = s.timer.enabled` 복사 → 해제.
3. (타이머 잠금) `now = Instant::now()`; `action` = `toggle`이면 `t.status() == Running ? Pause : Start`(`Paused`·`RestPaused`·`Stopped`·`Finished` → `Start`), 아니면 `Stop`; `t.apply(action, enabled, now)` → `Ok(changed)`면 `snap = t.snapshot(now)` → 해제.
4. `changed`면 `crate::publish_timer_change(app, &snap)`(잠금 밖 — emit·메뉴 동기화·마감 스레드 깨움).
5. `Err(TimerError::Disabled)` = 끈 직후 메뉴가 아직 안 사라진 경합 → `log::warn!`(무시). 잠금 오염 → `log::warn!`.

- 두 잠금을 동시에 쥐지 않는다(계약 §5.8-6). 같은 `now`를 `apply`·`snapshot`에 쓴다.
- 반환 타입 `()` — 기존 핸들러의 `BridgeError` 부채(§11 T5)를 늘리지 않는다.

#### 3.6.5 의존·파일 (§3·§7 증분)

- 읽음: `timer.enabled`(설정 잠금, 복사만). 쓰지 않음.
- 모듈 의존 추가: **`tray → timer`**(`TimerStatus`·`TimerAction`·`TimerError`), `tray → lib`(`crate::AppState`·`crate::publish_timer_change` — `toggle_overlay`의 `crate::AppState`·`crate::bridge::events` 사용과 같은 선례). timer는 tray를 모른다(`lib.rs` 깔때기가 tray를 부른다).

| 파일 | 변경 | 예상 줄 수 |
|---|---|---|
| `tray/mod.rs`(113줄) | `build_menu` 추출, `sync_timer_menu`, `control_timer_from_tray`, `LAST_VIEW`, 핸들러 2갈래, `//!` [목적]·[공개 API]·[스레드]·[테스트] 갱신 | ~220 |
| `tray/timer_menu.rs`(신규) | `TrayTimerView`·`tray_timer_view`·단위 테스트 | ~50 |

#### 3.6.6 테스트 (§8 증분)

| # | 이름 | 조건 | 기대 |
|---|---|---|---|
| TV1 | `tray_timer_view_hidden_when_disabled` | `enabled = false` × 다섯 상태 | 모두 `visible == false` |
| TV2 | `tray_timer_view_running_label` | `enabled = true` × `Running`·`Paused`·`RestPaused`·`Stopped`·`Finished` | `visible` 모두 true, `running`은 `Running`만 true |

- `sync_timer_menu`·핸들러는 Tauri 런타임·트레이가 필요 → 수동(§8.3 M-T12~M-T14, ui·bridge 패킷 뒤 verify).

#### 3.6.7 bridge 요구 (§9 증분)

- 새 command·event 없음. 트레이 조작은 기존 `timer://changed`(깔때기 ①)로 두 창에 반영된다.
- `set_settings` 부수 효과에 `tray::sync_timer_menu(app)`(또는 바뀌었으면 `publish_timer_change`) 추가 — bridge 패킷([timer.md](timer.md) §3.9). **과도 상태**: bridge 패킷 전에는 설정 창에서 켜고 꺼도 트레이 메뉴가 앱 재시작 전까지 바뀌지 않는다([timer.md](timer.md) §3.7).
- D48-t1 메인 스레드 넘김 외 결정 없음. 후보 없음.

### 3.7 overlay R-40 — 오버레이 오른쪽 클릭 메뉴 (CR-062, 🔒 사용자 결정 U-1·U-3·U-5, 수용 U-2·U-4 — 2026-09-29, 정본 `doc/200_설계/architecture/overlay-context-menu.md` v2 §2.1~§2.14·§4, 구현자가 그대로 옮길 것)

결론(7차 개정): 훅이 넘긴 오른쪽 누름→뗌 한 쌍(`hook::RightClick`)을 새 스레드 `overlay-menu`가 받는다. ① 메뉴가 예약됐거나(Pending) 열려 있으면(Open) 버린다. ② 두 점이 모두 **보이는 오버레이 창 사각형** 안이 아니면 버린다(🔒 U-1). ③ 전경 창이 다른 앱의 전체 화면이면 버린다(🔒 U-3). ④ 아니면 `Idle → Pending`으로 예약하고 메인 스레드에 팝업을 post한다. 메인 스레드는 ⑤ `Pending → Open`으로 바꾸고 트레이와 **같은 `build_menu`**로 새 메뉴를 만든다. ⑥ `WebviewWindow::popup_menu`로 커서 위치에 띄우고, 닫히면 `Idle`로 되돌린다. 항목 클릭은 **기존 `init`의 `on_menu_event`(Tauri 전역 메뉴 리스너)**가 처리한다 — 새 핸들러를 등록하지 않는다. 위치 잠금으로 분기하지 않는다(🔒 잠금 중에도 뜬다).

비유: 계산대 호출 벨(트레이)과 같은 벨을 진열장(오버레이)에도 하나 더 단다. 전선(메뉴 id·핸들러)은 새로 깔지 않고 기존 벨 전선에 스위치만 병렬로 붙인다. 유리가 잠겨 손이 닿지 않아도(클릭 통과) 누를 수 있게 스위치는 입구 CCTV(전역 훅)에 연결한다. 다만 무대 조명이 꺼진 공연 중(다른 앱의 전체 화면)에는 벨이 울리지 않는다.

#### 3.7.1 공개 API (§2 증분)

```rust
// tray/mod.rs — `mod popup; pub use popup::spawn_popup_listener;`
// tray/popup.rs
/// 오버레이 오른쪽 클릭 메뉴 스레드("overlay-menu")를 띄운다. 수신자가 끊기면(훅 종료) 스레드가 끝난다.
pub fn spawn_popup_listener(app: AppHandle, rx: Receiver<crate::hook::RightClick>) -> std::io::Result<()>;
```

- 호출자: `lib.rs` setup 4단계 1곳(§3.7.6). 반환 `JoinHandle`은 두지 않는다(분리 스레드 — 앱 수명 동안 `recv` 대기, CPU 0).

#### 3.7.2 `current_view` 추출 (`tray/mod.rs`, 동작 불변)

```rust
/// 지금 설정·타이머 상태의 메뉴 보기(트레이 동기화·오버레이 팝업 공용).
/// 설정 잠금 → 해제 → 타이머 잠금 → 해제(두 잠금 동시 보유 금지, 계약 §5.8-6).
/// AppState 없음 → None(로그 없음), 잠금 오염 → log::warn! 후 None.
fn current_view(app: &AppHandle) -> Option<TrayTimerView> {
    let state = app.try_state::<crate::AppState>()?;
    let enabled = match state.settings.lock() {
        Ok(s) => s.timer.enabled,
        Err(e) => {
            log::warn!("설정 잠금 실패(메뉴 보기 계산): {e}");
            return None;
        }
    };
    let status = match state.timer.lock() {
        Ok(t) => t.status(),
        Err(e) => {
            log::warn!("타이머 잠금 실패(메뉴 보기 계산): {e}");
            return None;
        }
    };
    Some(tray_timer_view(enabled, status))
}

fn sync_timer_menu_now(app: &AppHandle) {
    let Some(view) = current_view(app) else {
        return;
    };
    // 이하(LAST_VIEW 비교 → tray_by_id → build_menu → set_menu)는 그대로.
}
```

- 반환·잠금 순서·실패 경로가 같아 트레이 동작은 바뀌지 않는다(TV1·TV2 회귀 PASS). 두 호출자가 공유하므로 경고 문구의 괄호만 「(타이머 메뉴 동기화)」→「(메뉴 보기 계산)」으로 바꾼다.
- `build_menu`는 **그대로**다(비공개, 자식 모듈 `popup`이 `super::build_menu`로 부른다). 항목·순서·문구·id를 바꾸지 않는다(요구: 트레이와 같게. 새 항목 금지).

#### 3.7.3 `popup.rs` 본문 (7차 개정 2026-09-29 — 리뷰 CORE-301·SEC-301 반영, 소스 미적용)

결론: 팝업 상태를 **3단계 `Idle → Pending → Open → Idle`**로 둔다. `overlay-menu`가 post **전에** `Idle → Pending`을 잡으므로 "보냈지만 아직 실행 전"인 요청이 있는 동안 온 클릭은 버려진다. 판정 순서는 **① 상태 → ② 오버레이 창 사각형(🔒 U-1·AC-4) → ③ 전경 창 전체 화면(🔒 U-3) → ④ 예약(Idle→Pending)·post**이고 모두 `overlay-menu` 스레드에서 한다. 사각형 밖 클릭은 다른 프로세스 창을 조회하지 않는다(SEC-301). 메인 스레드 `popup_now`는 `Pending → Open`으로 바꾼 뒤 메뉴를 띄우고, 반환하는 모든 경로에서 `Idle`로 되돌린다.

비유: 접수대(overlay-menu)에 번호표가 한 장뿐이다. 번호표가 나가 있으면(Pending) 진료실(메인)이 부를 때까지 새 환자를 받지 않고, 진료 중(Open)에도 받지 않는다. 진료가 끝나야(Idle) 번호표가 돌아온다. 옛 설계는 진료실 문 앞에서만 막았다. 그래서 대기실에 밀린 환자가 진료가 끝나자마자 들어왔다.

**왜 바꾸나(CORE-301):** tao 0.37.1은 이벤트 핸들러가 실행 중이면(= `popup_now` 안의 `TrackPopupMenu` 모달) 새 사용자 이벤트를 **버퍼에 쌓아 두었다가 핸들러가 끝난 뒤 실행**한다(`platform_impl/windows/event_loop/runner.rs:143-148` `should_buffer` — 핸들러를 빌려 간 상태면 참, `:208-226` `send_event` — 참이면 `event_buffer.push_back`, 아니면 실행 후 `dispatch_buffered_events`). 따라서 옛 PU-b의 전제 "모달 중 `popup_now`가 재진입해도 `try_begin`이 막는다"는 틀렸다. 재진입은 일어나지 않는다. 밀린 `popup_now`는 메뉴가 닫혀 가드가 풀린 **뒤에** 실행되어 통과한다. 게다가 옛 `POPUP_OPEN`은 메인 스레드가 `popup_now`를 시작할 때에야 참이 되었다. 그래서 post와 실행 사이에 온 클릭은 거르지 못했고, 빠른 오른쪽 두 번 클릭으로 메뉴가 닫히자마자 다시 떴다.

```rust
use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::mpsc::Receiver;

use tauri::{AppHandle, Manager};

use crate::hook::{self, ForegroundSnapshot, RightClick};
use crate::window::{self, ScreenBounds};

/// 오버레이 메뉴 상태 기계(Idle → Pending → Open → Idle). 앱 전체에 하나.
static POPUP: PopupGate = PopupGate::new();

pub fn spawn_popup_listener(app: AppHandle, rx: Receiver<RightClick>) -> std::io::Result<()> {
    std::thread::Builder::new()
        .name("overlay-menu".into())
        .spawn(move || {
            for click in rx {
                request_popup(&app, click);
            }
        })
        .map(|_| ())
}

/// overlay-menu 스레드. 판정(① 상태 ② 창 사각형 ③ 전체 화면) → ④ Idle→Pending 예약 → post.
/// 메인 스레드의 "실행"은 기다리지 않는다. ②의 창 getter 는 메인 스레드 동기 왕복이지만
/// Idle 일 때만 부르므로 우리 메뉴 모달과 겹치지 않는다(PU-h).
fn request_popup(app: &AppHandle, click: RightClick) {
    let wanted = should_request(
        POPUP.is_idle(),
        click,
        || overlay_rect_or_none(app),
        hook::foreground_snapshot,
    );
    if !wanted || !POPUP.try_reserve() {
        return; // 판정으로 버림 — 로그 없음
    }
    let handle = app.clone();
    if let Err(e) = app.run_on_main_thread(move || popup_now(&handle)) {
        POPUP.cancel(); // Pending → Idle — post 실패로 고착되지 않게
        log::warn!("오버레이 메뉴를 메인 스레드로 넘기지 못했습니다: {e}");
    }
}

/// 보이는 오버레이 창 사각형(숨김 → None). 조회 실패는 경고 후 None(= 버림).
fn overlay_rect_or_none(app: &AppHandle) -> Option<ScreenBounds> {
    window::overlay_screen_rect(app).unwrap_or_else(|e| {
        log::warn!("오버레이 메뉴: 창 위치를 읽지 못했습니다: {e}");
        None
    })
}

/// 메인 스레드 전용. popup_menu 는 메뉴가 닫힐 때까지 반환하지 않는다(TrackPopupMenu 모달).
/// Pending → Open. 이후 모든 반환 경로에서 가드 Drop → Idle.
fn popup_now(app: &AppHandle) {
    let Some(_open) = POPUP.begin_open() else {
        return; // Pending 이 아님 — 도달 불가(PU-c). 상태를 건드리지 않는다
    };
    let Some(view) = super::current_view(app) else {
        log::warn!("오버레이 메뉴: 메뉴 보기를 계산하지 못했습니다.");
        return;
    };
    let menu = match super::build_menu(app, view) {
        Ok(m) => m,
        Err(e) => {
            log::warn!("오버레이 메뉴를 만들지 못했습니다: {e}");
            return;
        }
    };
    let Some(win) = app.get_webview_window(window::OVERLAY_LABEL) else {
        return;
    };
    if let Err(e) = win.popup_menu(&menu) {
        log::warn!("오버레이 메뉴를 띄우지 못했습니다: {e}");
    }
} // _open drop → Idle

/// 순수 판정 순서(SEC-301): ① 상태 ② 창 사각형 ③ 전경 창. `&&` 단락 평가라 앞 단계에서
/// 걸리면 뒤 조회(`rect`·`foreground`)를 부르지 않는다. 상태는 바꾸지 않는다(예약은 호출자).
pub(super) fn should_request(
    idle: bool,
    click: RightClick,
    rect: impl FnOnce() -> Option<ScreenBounds>,
    foreground: impl FnOnce() -> Option<ForegroundSnapshot>,
) -> bool {
    idle && should_popup(rect(), click) && !suppress_for_fullscreen(foreground())
}

/// 순수(🔒 U-3): None(전경 없음·조회 실패) → false(띄움, fail-open).
pub(super) fn suppress_for_fullscreen(snap: Option<ForegroundSnapshot>) -> bool {
    snap.is_some_and(|s| !s.own_process && !s.shell && s.client.covers(&s.monitor))
}

/// 순수(🔒 U-1): 보이는 창 사각형이 있고 누름·뗌 두 점이 모두 그 안.
pub(super) fn should_popup(rect: Option<ScreenBounds>, click: RightClick) -> bool {
    rect.is_some_and(|r| {
        r.contains(click.down.x, click.down.y) && r.contains(click.up.x, click.up.y)
    })
}

/// 팝업 상태 기계. 원자 변수 하나(잠금이 아니라 교착 경로 없음). 정적 `POPUP` 하나를
/// 쓰고, 테스트는 지역 인스턴스를 만든다(T13 원칙 — 병렬 cargo test 간섭 없음).
struct PopupGate {
    state: AtomicU8,
}

impl PopupGate {
    const IDLE: u8 = 0;
    const PENDING: u8 = 1;
    const OPEN: u8 = 2;

    const fn new() -> Self {
        Self {
            state: AtomicU8::new(Self::IDLE),
        }
    }

    /// overlay-menu: 빠른 거름. Pending(보냈지만 실행 전)·Open(메뉴 열림)이면 false.
    fn is_idle(&self) -> bool {
        self.state.load(Ordering::Acquire) == Self::IDLE
    }

    /// overlay-menu: Idle → Pending. 성공한 호출만 post 한다.
    fn try_reserve(&self) -> bool {
        self.transition(Self::IDLE, Self::PENDING)
    }

    /// overlay-menu: post 실패 시 Pending → Idle.
    fn cancel(&self) {
        self.transition(Self::PENDING, Self::IDLE);
    }

    /// 메인: Pending → Open. 성공했을 때만 가드를 만든다(가드 Drop 이 Idle 로 되돌림).
    /// `bool::then_some(OpenGuard { .. })` 금지 — 실패해도 가드가 만들어졌다가 Drop 되어
    /// Open 상태를 Idle 로 덮어쓴다(PM9가 잡는다).
    fn begin_open(&self) -> Option<OpenGuard<'_>> {
        if self.transition(Self::PENDING, Self::OPEN) {
            Some(OpenGuard { gate: self })
        } else {
            None
        }
    }

    fn transition(&self, from: u8, to: u8) -> bool {
        self.state
            .compare_exchange(from, to, Ordering::AcqRel, Ordering::Acquire)
            .is_ok()
    }
}

/// Open 가드. Drop(모든 반환 경로)에서 Idle.
struct OpenGuard<'a> {
    gate: &'a PopupGate,
}

impl Drop for OpenGuard<'_> {
    fn drop(&mut self) {
        self.gate.state.store(PopupGate::IDLE, Ordering::Release);
    }
}
```

**상태 전이표** (쓰는 주체는 둘뿐: `overlay-menu` 스레드 1개, 메인 스레드 1개)

| 현재 | 사건 | 누가 | 다음 | 비고 |
|---|---|---|---|---|
| Idle | 판정 ①~③ 통과 → `try_reserve` 성공 | overlay-menu | **Pending** | 그다음 post |
| Idle | 판정에서 걸림(사각형 밖·숨김·전체 화면·창 조회 실패) | overlay-menu | Idle | 로그 없음(조회 실패만 경고) |
| Pending | `run_on_main_thread` Err | overlay-menu | **Idle** | `cancel` + 경고 |
| Pending | 새 클릭 | overlay-menu | Pending | ①에서 버림 — 창 getter·전경 조회 안 함 |
| Pending | `popup_now` 시작 → `begin_open` 성공 | 메인 | **Open** | |
| Open | 새 클릭 | overlay-menu | Open | ①에서 버림 |
| Open | `popup_now`가 어떤 경로로든 반환(보기 계산 실패·메뉴 생성 실패·창 없음·팝업 오류·정상 닫힘) | 메인 | **Idle** | `OpenGuard` Drop |
| Idle·Open | `begin_open` | 메인 | 불변 | 도달 불가(PU-c) — `None`, 상태를 건드리지 않음 |

| # | 규칙 |
|---|---|
| PU-a | **스레드**: 다른 스레드에서 `popup_menu`를 직접 부르지 않는다. Tauri `popup_inner`가 메인 스레드에 일을 넘기고 채널로 결과를 기다리므로, 부른 스레드는 메뉴가 닫힐 때까지 멈춘다(횡단 F3). `input-forwarder`에서 부르면 입력 전달이 멈추므로 금지다. `overlay-menu`가 부르는 Tauri API는 둘뿐이다. 창 getter 3종(`window::overlay_screen_rect` — Idle일 때만, PU-h)과 `run_on_main_thread`(post)다 |
| PU-b | **중복 방지 3중**(🔒 U-5 포함, 횡단 D-6): ① 입구는 하나다(훅 → `overlay-menu` → 메인). ② ui가 WebView2 기본 메뉴를 억제한다(ui 패킷). ③ 상태 기계 `PopupGate`가 **post 전에** `Idle → Pending`을 잡는다. 그래서 post된 `popup_now`는 언제나 많아야 하나다. Pending·Open 동안 온 클릭은 `overlay-menu`에서 버려져 post되지 않는다. 따라서 tao가 모달 동안 쌓아 두었다가 모달 뒤에 실행할 **밀린 `popup_now`가 생기지 않는다**(CORE-301). 메뉴가 오버레이 사각형 위에 겹쳐 그려지면 메뉴 위 오른쪽 클릭도 사각형 판정을 통과한다. 그래서 ③이 필요하다 |
| PU-c | **상태 복귀**: `Open → Idle`은 `_open`이 함수 끝(모든 `return` 포함)에서 Drop되며 일어난다. `Pending → Idle`은 post 실패 때 `cancel`이 한다. post가 성공하면 tauri-runtime-wry가 `Message::Task`를 반드시 실행하므로 `popup_now`가 `Pending`을 소비한다. 예외는 이벤트 루프 종료(앱 종료)뿐이고, 그때 남는 `Pending`은 프로세스와 함께 사라진다. `begin_open` 실패(Pending이 아님)는 불변식상 도달할 수 없다. 이때는 상태를 바꾸지 않는다(강제로 Idle을 쓰면 열린 메뉴의 Open을 덮을 수 있다). 패닉 없는 코드라 누수 경로가 없다 |
| PU-d | **메뉴 수명**: 메뉴 객체는 `popup_menu`가 반환한 뒤 버린다. muda는 `TrackPopupMenu(TPM_RETURNCMD)`가 돌려준 명령 id를 메뉴가 살아 있는 동안 항목으로 찾아 `MenuEvent`를 보낸다(muda 0.20.0 `platform_impl/windows/mod.rs:354-360·906-933·1129`). 이벤트는 id 문자열만 실어 이후 처리에 메뉴 객체가 필요 없다 |
| PU-e | **위치**: `popup_menu`(커서 위치)를 쓴다. `popup_menu_at`(창 기준 좌표)은 쓰지 않는다 — 커서는 뗀 곳 근처이고, 창 기준 변환이 필요 없다 |
| PU-f | **포커스(🔒 U-2 수용)**: muda가 `SetForegroundWindow(overlay)`를 부르므로 게임·작업 창이 키보드 포커스를 잃고, 메뉴를 닫아도 자동으로 돌아가지 않는다(트레이 메뉴와 같음). **복귀 코드를 넣지 않는다** |
| PU-g | **입력**: 오른쪽 클릭을 삼키지 않는다(훅이 `CallNextHookEx` 유지 — [hook.md](hook.md) §3.9.3 RC-b). `position_lock`을 읽지 않는다(🔒 잠금 중에도 뜬다, 클릭은 아래 창에도 간다 — U-4 경합 수용) |
| PU-h | **판정 순서와 스레드 안전성(SEC-301)**: `should_request`는 ① `is_idle`(원자 읽기) → ② `overlay_screen_rect`(우리 창) → ③ `foreground_snapshot`(다른 프로세스 창) 순서이고, `&&` 단락 평가라 앞에서 걸리면 뒤를 부르지 않는다. 화면 어디의 오른쪽 클릭이든 ②까지만 거치고, 오버레이 사각형 안의 클릭만 ③을 부른다. **②를 비메인 스레드에서 불러도 되는 근거**(tauri-runtime-wry 2.12.0 `src/lib.rs`): `is_visible`(:1939)·`outer_position`(:1886)·`outer_size`(:1894)는 `window_getter!`(:205-210) → `getter!`(:196-203)이다. `send_user_message`(:263-278)는 호출 스레드가 메인이면 바로 처리하고, 아니면 `proxy.send_event`로 메인 스레드에 넘긴 뒤 `rx.recv()`로 답을 기다린다(타임아웃 없음). 즉 **스레드 안전한 동기 왕복**이고, 창 상태는 메인 스레드에서만 읽힌다. 기다림이 길어지는 경우는 메인 스레드가 tao 핸들러 안에 머물 때뿐이다(위 버퍼링 — 대표 사례가 우리 `popup_now` 모달). 그런데 `Idle → Pending`을 만드는 주체가 `overlay-menu` 하나뿐이다. 그래서 ①에서 Idle을 본 순간 post된 `popup_now`도, 열린 우리 메뉴도 없고, ②가 우리 모달에 막히는 일이 구조적으로 없다. 잠금을 쥐지 않고 기다리며, 메인 스레드는 `overlay-menu`를 기다리지 않는다. 따라서 교착이 없다. 앱 종료로 메시지가 버려지면 `recv`가 `Err`(`FailedToReceiveMessage`)로 풀린다. 이 경우 경고 후 버린다 |
| PU-i | **사각형 판정 시점**: 사각형은 **뗌 직후 `overlay-menu`에서** 한 번 읽는다. `popup_now`는 다시 판정하지 않는다. 🔒 U-1은 "누른 곳·뗀 곳이 그때 창 안"이라 클릭 시각에 가까운 판정이 정의에 맞다. 판정과 팝업 사이(밀리초)에 창을 숨기거나 옮기려면 트레이 메뉴 항목·설정 창 조작 같은 별도 좌클릭이 필요하다. 그래서 같은 오른쪽 클릭과 겹칠 수 없다(§11 T18) |

#### 3.7.4 메뉴 이벤트 공유 — 새 핸들러 금지 (횡단 D-4·D-5)

- Tauri 2.12.0 `TrayIconBuilder::on_menu_event`는 트레이 전용이 아니라 **전역 메뉴 리스너**로 등록된다. 문서 주석은 "called for any menu event, whether it is coming from this window, another window or from the tray icon menu"(tauri `tray/mod.rs:324-334`), 등록은 `manager.menu.global_event_listeners`(`427-434`), 메뉴 이벤트마다 전역 리스너를 모두 부른다(`app.rs:2755-2769`). 팝업 메뉴는 트레이와 **같은 id**(`open_settings`·`refresh`·`toggle_overlay`·`quit`·`timer_toggle`·`timer_stop`)로 만들므로 클릭이 기존 `init`의 핸들러로 간다 → 동작·타이머 동기화(`publish_timer_change`)·`settings://changed`(표시/숨김)가 **구조적으로 트레이와 같다.**
- **새 `on_menu_event`를 등록하지 않는다**(앱·창·트레이 어디든). 두 리스너가 같은 이벤트를 받아 한 번의 클릭이 두 번 실행된다(「표시/숨김」이 두 번 토글돼 원래대로).
- 같은 id가 트레이 메뉴와 팝업 메뉴에 동시에 있어도 된다. `sync_timer_menu`가 이미 같은 id로 메뉴를 갈아 끼우고 있고, 이벤트는 id 문자열만 싣는다.
- 팝업은 뜰 때마다 `build_menu(app, current_view(app))`로 **새로** 만든다. `LAST_VIEW`·트레이 메뉴 객체는 읽지도 쓰지도 않는다. 타이머가 꺼져 있으면 4항목, 켜져 있고 흐르면 「일시정지」, 그 밖이면 「시작」이 붙는다(뜨는 순간의 상태 — §3.6.2 표와 같음).
- 메뉴가 열린 동안 상태가 바뀌어도 라벨은 새로 고쳐지지 않는다(트레이와 같은 한계). 「시작/일시정지」는 `control_timer_from_tray`가 **클릭 순간 상태**로 정하므로 동작은 안전하다(§3.6.4).
- 「오버레이 표시/숨김」을 고르면 기존 `toggle_overlay`가 숨기고 저장·emit한다. 숨긴 뒤 다시 보이는 길은 트레이뿐이다(트레이에서 고른 것과 같음).
- `popup.rs` `//!`에 "메뉴 이벤트 핸들러 없음 — `init`의 전역 `on_menu_event` 공유(이유: 등록하면 두 번 실행)"를 적는다.

#### 3.7.5 전체 화면이면 생략 (🔒 U-3, 횡단 §2.14 D-10~D-12)

아래가 **모두** 참이면 `suppress_for_fullscreen`이 `true`(생략)다.

| # | 조건 | 값의 출처 |
|---|---|---|
| ① | 전경 창이 있고 조회가 모두 성공했다 | `hook::foreground_snapshot()`이 `Some` |
| ② | 전경 창이 이 앱 프로세스의 창이 아니다(오버레이·설정 창·트레이 숨은 창·우리 메뉴 모두 이 앱) | `!own_process` |
| ③ | 바탕 화면·작업표시줄이 아니다 | `!shell` |
| ④ | 전경 창의 **클라이언트 영역**이 자기 모니터 **전체**(작업 영역 아님)를 덮는다 | `client.covers(&monitor)` |

| 전경 상황 | 결과 |
|---|---|
| 독점 전체 화면·테두리 없는 전체 화면 게임, 브라우저 F11·동영상 전체 화면 | **생략**(정의대로 — MC-40·MC-41·MC-44) |
| 테두리 있는 창 모드(최대화 포함, 작업표시줄 자동 숨김 포함 — 제목 표시줄만큼 클라이언트가 모니터보다 작음) | 뜬다(MC-42) |
| 바탕 화면(`Progman`·`WorkerW`)·작업표시줄 | 뜬다(MC-43) |
| 이 앱 창(비잠금 오버레이를 클릭해 활성화된 경우 포함)·설정 창 | 뜬다 |
| 전경 없음(활성화 전환 순간)·조회 실패 | 뜬다(fail-open — 게임 최소화 위험은 "전체 화면 창 조회에 성공했을 때"만 생긴다) |

- **판정 위치·시점**(7차 개정, SEC-301): `overlay-menu` 스레드의 `should_request` ③단계다. **상태가 Idle이고 누름·뗌 두 점이 보이는 오버레이 사각형 안일 때만** 조회한다. 그 뒤 예약·post가 이어진다(🔒 지시 "post 직전" 유지). 사각형 밖·숨김·Pending·Open이면 `foreground_snapshot()`을 부르지 않는다. 다른 프로세스 창(클래스명·pid·사각형)을 읽는 일이 오버레이 위 클릭으로만 줄어든다. 게임 중 화면 곳곳의 오른쪽 클릭에는 Win32 전경 조회가 붙지 않는다. 훅 콜백(최소 작업)·메인 스레드가 아니다. 옛 문장 "창 사각형 판정은 `popup_now`(메인)에서 한다"는 폐기한다 — 사각형도 `overlay-menu`에서 먼저 본다(PU-h·PU-i).
- **unsafe 없음**: Win32 조회는 hook의 안전 함수 `hook::foreground_snapshot()`만 부른다(SAFETY 근거 [hook.md](hook.md) §3.10.3 U12~U19). `tray/popup.rs`에는 `windows` 크레이트 import가 없다.
- 켜고 끄는 설정은 없다(요구 없음 — 항상 적용).

#### 3.7.6 `lib.rs` 배선 (setup 4단계, core-implementer)

```rust
// 4. 전역 입력 훅 → 이벤트 전달 스레드 (+ R-40 오버레이 오른쪽 클릭 메뉴 스레드)
let (tx, rx) = mpsc::channel::<hook::InputEvent>();
let (click_tx, click_rx) = mpsc::channel::<hook::RightClick>();
let hook_handle = hook::start(tx, click_tx)?;
app.manage(HookGuard(Mutex::new(Some(hook_handle))));
// … input-forwarder spawn(불변) …
// 메뉴 기능 실패는 앱 시작을 막지 않는다.
if let Err(e) = tray::spawn_popup_listener(handle.clone(), click_rx) {
    log::warn!("오버레이 메뉴 스레드를 시작하지 못했습니다: {e}");
}
```

- setup 클로저 증가는 약 4줄(이미 50줄 초과 — 새 분기를 더하지 않는다). `//!` [스레드]에 "`overlay-menu`(`tray::spawn_popup_listener`) — 훅의 오른쪽 클릭 한 쌍을 받아 창 사각형·전체 화면 판정 뒤 메인 스레드에 팝업을 post(R-40)" 한 줄(7차: "창 사각형·" 추가).

**4단계 추출 — `start_input_pipeline` (7차, 리뷰 CORE-304 — 기존 위반 정리, 동작 불변).** setup 클로저(`lib.rs:99-182`, 2026-09-29 실측 84줄 — 리뷰 표기 108줄과 셈법이 달라도 50줄 한계 초과는 같다)의 4단계(`lib.rs:152-173`: 채널 2개 → `hook::start` → `HookGuard` 등록 → `input-forwarder` spawn → `spawn_popup_listener`)를 lib.rs 비공개 함수 하나로 옮긴다. 클로저 자리는 `start_input_pipeline(&handle)?;` 한 줄(+ 기존 4단계 주석)이 된다. 순서·스레드 이름·실패 처리(훅 시작·전달 스레드 생성 실패는 setup 실패로 전파, 메뉴 스레드 실패는 경고 후 계속 — T14)는 **그대로다**. `HookGuard`는 `AppHandle`의 `Manager::manage`로 등록한다. `App`과 같은 상태 저장소라 `app.state::<HookGuard>()` 사용처에 영향이 없다.

```rust
/// setup 4단계: 전역 입력 훅 → 이벤트 전달 스레드 `input-forwarder` (+ overlay R-40
/// 오른쪽 클릭 메뉴 스레드 `overlay-menu`). 훅·전달 스레드 실패는 Err(setup 실패 — 기존과
/// 같음), 메뉴 스레드 실패는 경고 후 계속(tray.md §11 T14).
fn start_input_pipeline(handle: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let (tx, rx) = mpsc::channel::<hook::InputEvent>();
    let (click_tx, click_rx) = mpsc::channel::<hook::RightClick>();
    let hook_handle = hook::start(tx, click_tx)?;
    handle.manage(HookGuard(Mutex::new(Some(hook_handle))));

    let emitter = handle.clone();
    std::thread::Builder::new()
        .name("input-forwarder".into())
        .spawn(move || {
            for ev in rx {
                log_input_diag(&ev);
                if let Err(e) = bridge::events::emit_input(&emitter, &ev) {
                    log::warn!("입력 이벤트 emit 실패: {e}");
                }
            }
        })?;

    if let Err(e) = tray::spawn_popup_listener(handle.clone(), click_rx) {
        log::warn!("오버레이 메뉴 스레드를 시작하지 못했습니다: {e}");
    }
    Ok(())
}
```

- 추출 뒤 setup 클로저는 약 64줄로 예상한다. 구현자가 `wc`로 다시 잰다. **여전히 50줄을 넘으면 같은 커밋에서** 1단계 손 기준점 계산(`lib.rs:111-123`)도 `fn initial_hand_anchor(paths: &AppPaths, manifest: &assets::AssetManifest, settings: &Settings) -> Option<settings::Point>`로 뺀다. 본문(`match &settings.mouse` … `unwrap_or_else(|e| { log::warn!(…); None })`)과 경고 문구는 그대로다. 이렇게 하면 약 52줄이 된다. 그래도 넘으면 `AppState` 조립(`lib.rs:132-140`)을 `fn build_app_state(…) -> AppState`로 뺀다. 세 추출 모두 동작 불변이고 요구ID가 없는 정리 작업이다(golden-principles §1 — 표준 강제 항목).
- 테스트: 새 자동 테스트 없음(Tauri 런타임 필요). 회귀 증거는 `cargo test` 전건 PASS와 dev 앱 기동 뒤 오버레이 입력 반응(MC-31)이다.
- `lib.rs` `//!` [스레드]는 스레드 이름을 그대로 쓰므로 바뀌지 않는다(위 "창 사각형·" 한 줄만 추가).
- 순서 근거: 3단계 `tray::init`이 먼저라 전역 메뉴 리스너가 등록된 뒤에만 메뉴가 뜬다. 오버레이 표시(5단계 `setup_overlay`) 전의 클릭은 `overlay_screen_rect`가 `None`이라 무시된다.

#### 3.7.7 개인정보·로그

- 좌표(`RightClick`)·전경 창 정보(`ForegroundSnapshot`)를 로그·파일·IPC에 싣지 않는다. 판정으로 버릴 때(열림·전체 화면·사각형 밖)는 로그를 남기지 않는다. 경고 로그에는 Tauri 오류 값만 싣는다([hook.md](hook.md) §1.1 P7).
- 남는 상태는 `POPUP` 상태 값 하나(`AtomicU8`, Idle·Pending·Open 3값)뿐이다(좌표·시각·횟수를 기억하지 않는다 — 7차).
- 데이터 최소화(7차, SEC-301): 다른 프로세스 창 조회(`foreground_snapshot`)는 오버레이 사각형 안의 클릭이면서 상태가 Idle일 때만 한다(PU-h). 사각형 밖 클릭은 우리 창 getter만 거쳐 버려진다.

#### 3.7.8 테스트 (§8 증분 — `popup.rs` `#[cfg(test)] mod tests`)

기준: 오버레이 `ScreenBounds { x: 100, y: 100, width: 450, height: 350 }`, 모니터 `ScreenRect(0, 0, 1920, 1080)`. `RightClick`·`ForegroundSnapshot`·`ScreenRect`는 pub 필드라 리터럴로 만든다.

| # | 이름(안) | 입력 | 기대 |
|---|---|---|---|
| PM1 | `should_popup_both_inside` | 누름 (150,150)·뗌 (400,300) | `true` |
| PM2 | `should_popup_hidden_is_false` | `rect = None`, 같은 클릭 | `false`(숨김 — AC-4) |
| PM3 | `should_popup_down_only_inside` | 누름 (150,150)·뗌 (900,300) | `false`(🔒 U-1) |
| PM4 | `should_popup_up_only_inside` | 누름 (50,50)·뗌 (150,150) | `false`(🔒 U-1) |
| PM5 | `gate_full_cycle` (7차 개정 — 옛 `open_guard_single_holder` 대체) | 지역 `PopupGate::new()`: `is_idle` → `try_reserve` → `is_idle` → `begin_open`(가드 보유) → 가드 drop → `is_idle` | `true` → `true` → `false` → `Some` → (drop) → `true` |
| PM6 | `gate_second_request_while_pending_is_dropped` | `try_reserve` 성공 뒤(= post됨, 실행 전) 두 번째 `is_idle`·`try_reserve` | `false`·`false`(두 번째 요청 버림 — CORE-301). 이어서 `begin_open` → `Some`, drop 뒤 `is_idle` `true` |
| PM7 | `gate_cancel_after_post_failure_returns_idle` | `try_reserve` → `cancel` → `is_idle` → `try_reserve` | `true` → (취소) → `true` → `true`(다음 클릭이 다시 예약 가능 — Pending 고착 없음) |
| PM8 | `gate_early_return_restores_idle` | 테스트 안 도우미 `fn simulated_popup(gate: &PopupGate, bail: bool) -> bool { let Some(_open) = gate.begin_open() else { return false }; if bail { return false; } true }`(`popup_now`의 조기 반환 모양 — 끝이 `true`라 clippy `needless_return` 없음) — `try_reserve` 후 `simulated_popup(&g, true)`, 다시 `try_reserve` 후 `simulated_popup(&g, false)` | `false`·`true`, 두 번 모두 호출 뒤 `is_idle` `true`(조기 반환·정상 반환 모두 Idle 복귀) |
| PM9 | `gate_open_rejects_new_requests` | `try_reserve` → `begin_open`(가드 보유 중) → `is_idle`·`try_reserve`·`begin_open` | `false`·`false`·`None`. **실패한 `begin_open` 뒤에도 여전히 열림**(`is_idle` `false` — `then_some` 가드 오작성 검출). 가드 drop 뒤 `is_idle` `true` |
| PM10 | `gate_begin_open_without_reservation_is_none` | Idle에서 `begin_open` | `None`, `is_idle` 여전히 `true`(상태 불변 — PU-c) |
| PM11 | `busy_skips_window_and_foreground` | `should_request(false, 안쪽 클릭, rect 카운터 클로저, fg 카운터 클로저)` — 카운터는 `std::cell::Cell<u32>` | `false`, rect 0회·fg 0회(Pending·Open이면 창 getter도 안 부름 — PU-h) |
| PM12 | `outside_click_skips_foreground_query` | `idle = true`, rect = `Some(오버레이)`, 누름 (150,150)·뗌 (900,300) | `false`, rect 1회·**fg 0회**(SEC-301) |
| PM13 | `hidden_overlay_skips_foreground_query` | `idle = true`, rect = `None`, 안쪽 클릭 | `false`, fg 0회 |
| PM14 | `inside_click_fullscreen_is_dropped` | `idle = true`, rect = `Some(오버레이)`, 안쪽 클릭, fg = FS2 스냅숏(다른 앱이 모니터를 덮음) | `false`, fg 1회 |
| PM15 | `inside_click_not_fullscreen_is_requested` | 같은 조건, fg = `None` | `true`, rect 1회·fg 1회 |
| FS1 | `fullscreen_none_is_not_suppressed` | `None` | `false`(띄움 — fail-open) |
| FS2 | `fullscreen_other_app_covering_monitor` | `own_process: false, shell: false, client = monitor = (0,0,1920,1080)` | **`true`**(생략 — 테두리 없는·독점 전체 화면) |
| FS3 | `fullscreen_own_process_is_not_suppressed` | FS2에서 `own_process: true` | `false` |
| FS4 | `fullscreen_shell_is_not_suppressed` | FS2에서 `shell: true` | `false`(바탕 화면 `Progman`/`WorkerW`) |
| FS5 | `windowed_app_is_not_suppressed` | 다른 앱, `client = (320,180,1600,900)` | `false` |
| FS6 | `maximized_with_title_bar_is_not_suppressed` | 다른 앱, `client = (0,23,1920,1080)`(제목 표시줄 아래, 작업표시줄 자동 숨김으로 bottom = 모니터) | `false`(D-11 — 테두리 있으면 뜬다) |
| FS7 | `fullscreen_on_secondary_monitor` | 다른 앱, `client = monitor = (-1920,0,0,1080)` | `true` |

- 회귀: `timer_menu.rs` TV1·TV2 PASS(`current_view` 추출 후). PM1~PM4·FS1~FS7은 7차에서 불변.
- 7차: 정적 `POPUP`을 거치는 테스트는 두지 않는다(PM5~PM10은 지역 `PopupGate::new()`, PM11~PM15는 `should_request`에 `bool`과 클로저를 넘긴다). `spawn_popup_listener`·`request_popup`·`overlay_rect_or_none`·`popup_now`는 Tauri 런타임·GUI가 필요해 자동 테스트하지 않는다 → §8.3 MC-31~MC-45. 7차 개정의 수동 확인 포인트는 **MC-37 ①**(열린 메뉴 위 오른쪽 클릭 → 닫힌 뒤 다시 뜨지 않음)과 **MC-36 ③ 변형**(오버레이 위 오른쪽 클릭을 아주 빠르게 두 번 → 메뉴 1개, 닫은 뒤 저절로 다시 뜨지 않음)이다.

#### 3.7.9 파일·의존·수용 (§3·§7 증분)

| 파일 | 변경 | 예상 줄 수 |
|---|---|---|
| `tray/mod.rs`(282줄) | `mod popup; pub use popup::spawn_popup_listener;`, `current_view` 추출·`sync_timer_menu_now` 앞부분 치환, `//!` [목적]·[공개 API]·[스레드]·[unsafe]·[테스트] 갱신 | ~290 |
| `tray/popup.rs`(신규) | §3.7.3 + §3.7.8 테스트 | ~230 (7차: 285줄 → **약 420줄** — `PopupGate`·`should_request`·`overlay_rect_or_none` + PM5~PM15) |
| `lib.rs`(442줄) | §3.7.6 | ~448 (7차: `start_input_pipeline` 추출 — 줄 수 거의 불변, setup 클로저 84 → 약 64줄, 필요 시 `initial_hand_anchor` 추가 추출) |
| `window/mod.rs` (7차) | `overlay_screen_rect` 문서 주석의 스레드 문장만 교체 — [window.md](window.md) §3.1 | 불변 |
| `hook/foreground.rs` (7차, CORE-302) | U13~U18 SAFETY 주석 문구만 — [hook.md](hook.md) §3.10.3 | 불변 |

- 모듈 의존: `tray → hook` 확장(`RightClick`·`ForegroundSnapshot`·`foreground_snapshot` — 기존 `refresh`에 더해), `tray → window` 확장(`overlay_screen_rect`·`ScreenBounds::contains`·`OVERLAY_LABEL`). hook은 여전히 아무 모듈도 의존하지 않는다.
- 수용 증거(횡단 §4.5): `cargo fmt --check`·`cargo clippy -- -D warnings` 0·`cargo test` 전건 PASS(신규 RC/WR/PM/FG/FS 포함). Grep `unsafe` in `src-tauri/src/tray`·`src-tauri/src/window` = 0. Grep `on_menu_event` in `src-tauri/src` = `tray/mod.rs` 1건. `git diff --stat`에 `Cargo.toml`·`Cargo.lock`·`src-tauri/src/bridge/`·`capabilities/`·`tauri.conf.json`·`src/` 없음.
- **주의(횡단 §4.7)**: core만 반영된 상태에서는 비잠금 오른쪽 클릭에 WebView2 기본 메뉴와 새 메뉴가 **둘 다** 뜬다. ui 패킷(`.root` `onContextMenu` preventDefault) 완료 전에는 배포하지 않는다.

## 4. 스레드·채널

```
[설정 창 클릭] → bridge set_autostart (async) ─ spawn_blocking ─▶ [tokio 블로킹 스레드]
                                                                    autostart::set_enabled
                                                                      ├ write_temp_xml
                                                                      ├ hook::run_elevated ── ShellExecuteExW(runas) ─▶ [UAC 동의 창]
                                                                      │                       WaitForSingleObject ◀── schtasks.exe 종료
                                                                      ├ query() ── schtasks /Query (CREATE_NO_WINDOW)
                                                                      └ Ok(actual)
                                                                    persist_autostart(잠금: 비교·갱신·clone → 해제 → save)
                                                                    ← bridge: settings://changed emit, actual 반환
[lib.rs setup — 메인 스레드]
  … 창 표시·apply_overlay_window(window.md §2.4) 뒤
  spawn_autostart_sync(handle) ─▶ [autostart-sync 스레드, 1회]
                                    query() → Some(v) → persist_autostart(&state.settings, path, v)
                                      Ok(Some(s)) → bridge::events::emit_settings_changed(&handle, &s)
                                      Ok(None) / None → 아무것도 안 함,  Err → log::warn!
                                    스레드 끝
```

- 채널 없음. 공유 상태는 기존 `AppState.settings: Mutex<Settings>`뿐이고 잠금 안에서는 비교·대입·clone만 한다.
- **시작 보정 조립(lib.rs, core-implementer)**: setup 클로저가 이미 50줄을 넘으므로 `fn spawn_autostart_sync(handle: AppHandle)`를 lib.rs 비공개 함수로 뽑는다(위 그림의 본문, 스레드 이름 `autostart-sync`, spawn 실패 → `log::warn!` 후 계속). 호출 위치 = 오버레이 이동 감시(`watch_overlay_moves`) 뒤, `Ok(())` 앞.
- `set_settings`와의 경합: `set_settings`는 `window::keep_core_owned`로 입력 `autostart`를 버리고 core 현재값을 두 번 옮겨 적는다([window.md](window.md) §2.4) → 보정 스레드·`set_autostart`가 쓴 값이 `set_settings`에 덮이지 않는다.
- 보정 스레드와 `set_autostart`가 동시에 끝나면(시작 직후 1초 안에 토글) 늦게 끝난 쪽 값이 남는다 — 수용(§11 T6).
- 종료: `set_enabled` 도중 앱이 종료되면 UAC 창·`schtasks.exe`는 독립 프로세스라 끝까지 돈다. 결과는 다음 시작 보정이 설정에 반영한다.

### R-40 오버레이 오른쪽 클릭 메뉴 (§3.7)

```
win32-input-hook ──(InputEvent)──▶ input-forwarder ──emit──▶ overlay              (기존, 불변)
       └──────(RightClick)──mpsc::Sender<RightClick>──▶ [overlay-menu 스레드, 신규 — spawn_popup_listener]
                              for click in rx:                         (7차 개정 — CORE-301·SEC-301)
                                ① POPUP.is_idle()? 아니면 버림          (Pending·Open — getter·전경 조회 없음)
                                ② overlay_screen_rect(app)             (창 getter 3종 = 메인 스레드 동기 왕복, PU-h)
                                   should_popup(두 점, 🔒 U-1)? 아니면 버림   (사각형 밖·숨김 — 전경 조회 없음)
                                ③ hook::foreground_snapshot()          (Win32 조회, 스레드 무관, 마이크로초)
                                   suppress_for_fullscreen? → 버림       ← 🔒 U-3
                                ④ POPUP.try_reserve()  Idle → Pending
                                   app.run_on_main_thread(popup_now)   (post, 실행은 기다리지 않음)
                                   Err → POPUP.cancel()  Pending → Idle
[메인 스레드] popup_now:
   POPUP.begin_open()  Pending → Open → current_view → build_menu
   → overlay.popup_menu(&menu)   ── TrackPopupMenu 모달(닫힐 때까지, tao는 이 동안 온 사용자 이벤트를 버퍼링) ──
   → 가드 Drop(모든 반환 경로)  Open → Idle
   항목 클릭 → MenuEvent → (기존) init 의 전역 on_menu_event → 트레이와 같은 동작

상태:  Idle ──④ try_reserve──▶ Pending ──begin_open(메인)──▶ Open ──가드 Drop──▶ Idle
                              └──── post 실패 cancel ────▶ Idle
```

- 채널: `std::sync::mpsc::Sender<hook::RightClick>`(hook → tray), 단방향, unbounded. 빈도 = 실제 오른쪽 클릭 수. `overlay-menu`는 `recv` 대기라 유휴 CPU 0.
- 메뉴가 열린 동안 메인 스레드는 모달 루프에 있다(트레이 메뉴와 같은 조건). 훅·`input-forwarder`·`overlay-menu`는 따로 돌아 멈추지 않는다. `overlay-menu`는 Pending·Open 동안 ①에서 버리므로 창 getter를 부르지 않고, 우리 모달에 막히지 않는다(7차, PU-h). Idle일 때 창 getter 3종은 메인 스레드와 동기 왕복이다(쉬고 있는 메인 스레드에서 마이크로초 단위). 메인 스레드가 **다른 이유로** tao 핸들러 안에 오래 머물면 `overlay-menu`가 그동안 기다린다. 그 사이 온 클릭은 채널에 쌓였다가 게이트 때문에 많아야 1개만 메뉴가 된다(§11 T-j 관찰).
- 잠금: `current_view`는 설정 → 해제 → 타이머 → 해제. 상태 기계는 잠금이 아니라 원자 변수이고, `overlay-menu`는 잠금을 쥔 채 기다리지 않으며, 메인 스레드는 `overlay-menu`를 기다리지 않는다. 그래서 교착 경로가 없다.
- 종료: 훅 `stop`(`HookHandle` drop)이 `CLICK_SENDER`를 비우면 유일한 송신자가 사라져 `for click in rx`가 끝난다. 트레이 「종료」(`app.exit(0)`)는 프로세스와 함께 끝난다(정리할 상태 없음).

## 5. unsafe

없음. 승격 실행은 `hook::run_elevated`(안전 래퍼, SAFETY 근거는 [hook.md](hook.md) §3.6.3). 조회는 `std::process::Command`(안전). **R-40**: 전경 창 조회는 hook의 안전 함수 `hook::foreground_snapshot()`만 부른다(SAFETY 근거 [hook.md](hook.md) §3.10.3 U12~U19). `popup.rs`는 `windows` 크레이트를 import하지 않는다. 팝업·창 사각형은 Tauri 안전 API(`run_on_main_thread`·`popup_menu`·`overlay_screen_rect`).

## 6. 에러 타입

`AutostartError`(`#[derive(Debug, thiserror::Error)]`). `code()` 값이 그대로 `BridgeError.code`가 된다(🔒 D-3 — 실물 `영역.사유` 표기).

| 변형 | 한국어 메시지 | 원인 | `code()` |
|---|---|---|---|
| `Cancelled` | 권한 확인이 취소되어 자동 실행 설정을 바꾸지 않았습니다. | UAC에서 「아니요」(`ERROR_CANCELLED`) | `autostart.cancelled` |
| `Failed(String)` | 자동 실행 설정을 바꾸지 못했습니다. ({0}) | `schtasks` 0 아닌 종료 코드, 승격 실행 실패, 사용자 이름 없음 | `autostart.error` |
| `Io(#[from] std::io::Error)` | 자동 실행 설정 파일을 만들지 못했습니다. | `current_exe`·임시 XML 쓰기 실패 | `io.error` |
| **`StatePoisoned`** | 설정 상태가 손상되었습니다. 앱을 다시 시작하세요. | 설정 `Mutex` 독(`persist_autostart`) | `state.poisoned` |
| **`Settings(#[from] SettingsError)`** | {0} (`#[error(transparent)]`) | `settings::save` 실패(`persist_autostart`) | 내부 `SettingsError::code()` |

- 굵은 2개는 패킷 §3.1 표에 없던 변형이다 — `persist_autostart`(§11 T3) 때문에 더했다. 코드 값은 기존 window와 같은 문자열이라 계약에 새 코드가 생기지 않는다.
- bridge: `impl From<AutostartError> for BridgeError { BridgeError::new(e.code(), e.to_string()) }`(bridge 소관). 기존 `From<tauri_plugin_autostart::Error>`(`error.rs:51-58`)는 삭제.
- **R-40**: 에러 변형 추가 없음. `spawn_popup_listener`는 `std::io::Result<()>`(스레드 생성 실패 — 호출자 경고 로그). 그 밖의 실패(메인 스레드 post·창 위치·메뉴 생성·팝업)는 `popup.rs` 안에서 `log::warn!`으로 끝나고 밖으로 나가지 않는다(메뉴 경로는 command가 아니라 ui에 알릴 곳이 없다). 판정으로 버리는 경우는 오류가 아니다(로그 없음).

## 7. 설정 의존

| 방향 | 필드 | 기본값 | 시점 |
|---|---|---|---|
| 씀 | `autostart` | false | `persist_autostart` — `set_autostart` 성공 뒤(bridge), 시작 보정(`Some(v)`이고 다를 때) |
| 씀 | `overlay.visible` | true | 트레이 표시/숨김(기존) |
| 읽음 | `overlay.visible`·`position_lock`·`show_in_taskbar` | true / false / false | 트레이 표시/숨김이 `apply_overlay_window`에 스냅샷을 넘김 |

- `autostart`의 **쓰기 주체는 이 둘뿐**이다. `set_settings` 입력값은 무시된다(🔒 02-design §3 「core 소유 필드」, [settings.md](settings.md) §3.5).
- 모듈 의존: `tray → window`(기존), `tray → settings`(기존 — `toggle_overlay`가 저장), **`tray → hook`(신규, `run_elevated`)**. hook은 여전히 아무 모듈도 의존하지 않는다(§11 T2).
- **R-40**: 읽음 `timer.enabled`(팝업이 뜨는 순간 `current_view`로 복사 — 트레이 동기화와 같은 경로), 창 `is_visible`(= `overlay.visible`의 창 반영값, `overlay_screen_rect`). **쓰지 않음**(쓰기는 기존 메뉴 핸들러 — 「표시/숨김」이 `overlay.visible`). `position_lock`은 읽지 않는다(🔒 잠금 중에도 뜬다). 전체 화면 판정은 설정값이 아니다(토글 없음). 의존 확장: `tray → hook`(`RightClick`·`ForegroundSnapshot`·`foreground_snapshot`), `tray → window`(`overlay_screen_rect`·`ScreenBounds::contains`).

## 8. 테스트 계획

### 8.1 단위 — `autostart.rs` `#[cfg(test)] mod tests`

| # | 이름(안) | 입력 | 기대 |
|---|---|---|---|
| X1 | `task_xml_user_id_appears_twice` (C-5) | `build_task_xml(Path::new(r"C:\Apps\kuro\kuro_keyviewer.exe"), r"PC\kuro")` | `<UserId>PC\kuro</UserId>`가 정확히 2회(트리거·주체) |
| X2 | `task_xml_required_settings` (C-5) | 같음 | `<RunLevel>HighestAvailable</RunLevel>`, `<LogonType>InteractiveToken</LogonType>`, `<ExecutionTimeLimit>PT0S</ExecutionTimeLimit>`, `<DisallowStartIfOnBatteries>false</…>`, `<StopIfGoingOnBatteries>false</…>`, `<Priority>5</Priority>`, `<MultipleInstancesPolicy>IgnoreNew</…>` 모두 포함, `<Delay>` 없음 |
| X3 | `task_xml_escapes_path` (C-5) | 경로 `C:\A&B's <x>\kuro.exe`, 사용자 `D"x` | `C:\A&amp;B&apos;s &lt;x&gt;\kuro.exe`, `<WorkingDirectory>C:\A&amp;B&apos;s &lt;x&gt;</WorkingDirectory>`, `D&quot;x`. 원문 `&B'`·`<x>` 없음 |
| X4 | `task_xml_without_parent_has_no_working_directory` | `Path::new("kuro.exe")`… 부모가 빈 경로면 `parent()`는 `Some("")` → **빈 폴더도 요소 생략**하도록 `filter(|d| !d.as_os_str().is_empty())` | `<WorkingDirectory>` 없음 |
| X5 | `xml_escape_ampersand_first` | `"&lt;"` | `"&amp;lt;"`(이중 치환 없음) |
| X6 | `utf16le_bom_prefix` | `"<a/>"` | 앞 2바이트 `FF FE`, 길이 = 2 + 4×2, 3번째 바이트 `b'<'`, 4번째 `0` |
| X7 | `create_args_quotes_path` | `C:\Users\A B\Temp\kuro_keyviewer_task_7.xml` | `/Create /TN kuro_keyviewer /XML "C:\Users\A B\Temp\kuro_keyviewer_task_7.xml" /F` |
| X8 | `delete_args_fixed` | — | `/Delete /TN kuro_keyviewer /F` |
| X9 | `interpret_query_exit_table` | `Some(0)`/`Some(1)`/`Some(2)`/`None` | `Some(true)`/`Some(false)`/`None`/`None` |
| X10 | `format_user_id_cases` | (`Some("PC")`,`Some("kuro")`) / (`None`,`Some("kuro")`) / (`Some("PC")`,`None`) / (`Some("PC")`,`Some("")`) | `Some("PC\kuro")` / `Some("kuro")` / `None` / `None` |
| X11 | `temp_xml_is_removed_on_drop` | `write_temp_xml("<a/>")` → 경로 확인 → drop | 쓴 직후 파일 존재·첫 2바이트 BOM, drop 뒤 없음. (실제 `temp_dir` 사용 — 파일명에 pid가 들어가 병렬 테스트와 겹치지 않도록 이 테스트 하나만 둔다) |
| X12 | `autostart_error_codes` | 각 변형 | `autostart.cancelled`·`autostart.error`·`io.error`·`state.poisoned`·`settings.invalid`(Settings(Invalid)) |

### 8.2 tempdir — `persist_autostart`

| # | 준비 | 호출 | 기대 |
|---|---|---|---|
| P1 | `Mutex::new(Settings::default())`(autostart false), 빈 tempdir | `persist_autostart(&m, &path, false)` | `Ok(None)`, 파일 생성 안 됨 |
| P2 | 같음 | `persist_autostart(&m, &path, true)` | `Ok(Some(s))`, `s.autostart`, `settings::load(&path)`의 `autostart == true`, 메모리 같음, 다른 필드 불변 |
| P3 | 독이 든 `Mutex` | `persist_autostart` | `Err(AutostartError::StatePoisoned)` |

- `set_enabled`·`query`·`toggle_overlay`는 UAC·작업 스케줄러·Tauri 런타임이 필요해 자동 테스트하지 않는다 → §8.3.

### 8.2a 단위 — `popup.rs` `#[cfg(test)] mod tests` (overlay R-40)

- PM1~PM4(`should_popup`)·PM5~PM10(`PopupGate` 상태 전이, 7차)·PM11~PM15(`should_request` 판정 순서, 7차)·FS1~FS7(`suppress_for_fullscreen`) — 표는 §3.7.8. 정적 `POPUP`을 쓰는 테스트는 두지 않는다(지역 `PopupGate::new()`).
- 짝 테스트: hook RC1~RC6·FG1~FG6([hook.md](hook.md) §3.9.5·§3.10.5), window WR1~WR3([window.md](window.md) §8.8). 회귀: TV1·TV2.

### 8.3 수동 체크리스트 (C-9 — 실행 증거: 명령 출력 캡처 + `settings.json` 캡처를 `doc/300_검증/`에, **T1 결과는 이 문서 §11에 기록 요청**)

| # | 절차 | 기대 |
|---|---|---|
| M-T1 | **(T1 실측, 가장 먼저)** 관리자 PowerShell에서 `set_enabled(true)`와 같은 XML로 등록 → **일반(비승격) PowerShell**에서 `schtasks /Query /TN kuro_keyviewer; $LASTEXITCODE` | `0`. **1이면 즉시 멈추고 보고** — `interpret_query_exit`의 `Some(1) → Some(false)`가 틀린 가정이 되어 설계를 바꿔야 한다(§11 T1 대안 B) |
| M-T2 | 설정 창 토글 켜기 → UAC 「예」 | 반환 `true`, `schtasks /Query /TN kuro_keyviewer /XML` 출력에 X2 값들·현재 사용자 `UserId` 2곳·exe 경로가 보임, `settings.json` `autostart: true`, 콘솔 창 번쩍임 없음, `%TEMP%\kuro_keyviewer_task_*.xml` 남지 않음 |
| M-T3 | 토글 끄기 → UAC 「아니요」 | `autostart.cancelled`, 작업 그대로, `autostart` 불변 |
| M-T4 | 토글 끄기 → UAC 「예」 | 반환 `false`, `/Query` 종료 코드 1, `autostart: false` |
| M-T5 | 작업 없는 상태에서 끄기 | UAC 창 없이 `false`(1단계 조기 반환) |
| M-T6 | 켠 상태로 로그아웃 → 로그인 | 앱이 자동으로 뜨고 트레이 아이콘이 보임. 작업 관리자 「세부 정보」 `상승된 권한` = 예, `Get-Process kuro-keyviewer \| Select PriorityClass` = Normal. 아이콘이 안 보이면 `Delay PT5S` 대안(§3.2)으로 재시험 |
| M-T7 | 켠 상태에서 관리자 권한 게임(또는 관리자 메모장)에 포커스 두고 타이핑 | 오버레이가 반응(UIPI 해소 증거) |
| M-T8 | 앱 종료 → 관리자 PowerShell에서 `schtasks /Delete /TN kuro_keyviewer /F` → 앱 시작(settings는 `autostart: true`) | 시작 1초 안에 `settings.json` `autostart: false`로 보정, 설정 창 토글 꺼짐 |
| M-T9 | 반대: 작업 수동 등록 + `autostart: false`로 시작 | `true`로 보정 |
| M-T10 | UAC 창을 10초 띄워 둔 채 키보드 입력 | 오버레이 계속 반응, 설정 창 멈추지 않음(비기능 목표 02-design §7) |
| M-T11 | 트레이 「표시/숨김」 두 번(작업표시줄 표시 켬 / 위치 잠금 켬 상태) | 다시 보일 때 작업표시줄 버튼·클릭 통과가 유지된다 |
| M-T12 | (CR-048, ui·bridge 패킷 뒤 verify) 설정 창에서 스톱워치 켜기 → 트레이 메뉴 열기 | 맨 위 「시작」·「멈춤」·구분선, 아래 기존 4개(순서 불변) |
| M-T13 | (CR-048) 트레이 「시작」 → 메뉴 다시 열기 | 두 창 글자가 흐르고, 라벨이 「일시정지」 |
| M-T14 | (CR-048) 스톱워치 끄기(설정 창) → 메뉴 열기 | 「시작/일시정지」·「멈춤」·구분선이 사라지고 기존 4개만 |

**overlay R-40 오버레이 오른쪽 클릭 메뉴 (MC-31~MC-45 — 횡단 설계 §7 원본, overlay `test/manual-checklist.md`와 같은 번호).** dev·release 각각. **사용자가 게임 중일 때는 실행하지 않는다** — 검증 세션에서 허락받아 진행한다. 실행 증거는 `doc/300_검증/screenshots/…` 스크린샷(메뉴·캡처)과 관찰 비고. core만 반영된 상태에서는 MC-31에 WebView2 기본 메뉴가 함께 뜬다(ui 패킷 뒤 확인).

| # | 조건 | 절차 | 기대 |
|---|---|---|---|
| MC-31 | 비잠금·표시 | 오버레이 그림 위와 투명한 모서리 위에서 각각 오른쪽 클릭 | 두 곳 모두 트레이와 같은 메뉴가 커서 위치에 **1개** 뜬다. 브라우저 메뉴(뒤로·새로 고침·검사 등)는 없다. 체감 지연 없음(목표 < 100ms) |
| MC-32 | 메뉴 동일성 | 타이머 ① 끔 ② 켬·정지 ③ 켬·흐르는 중 상태마다 트레이 메뉴와 오버레이 메뉴를 캡처 | 세 상태 모두 항목·순서·문구·구분선이 같다(① 4항목, ② 「시작」·「멈춤」+구분선+4, ③ 「일시정지」·「멈춤」+구분선+4) |
| MC-33 | 항목 동작 | 오버레이 메뉴에서 차례로: 설정 열기 → 새로고침 → 시작/일시정지 → 멈춤 → 표시/숨김 → (트레이로 다시 표시) → 종료 | 트레이에서 고른 것과 같다. 설정 창은 한 개만 앞으로 온다. 오버레이가 다시 불러와진다. 오버레이 글자와 설정 창 타이머가 함께 바뀐다. 숨긴 뒤 트레이로 복귀할 수 있다. 앱이 종료된다. **한 번 고른 동작이 두 번 실행되지 않는다**(표시/숨김이 원래대로 돌아오지 않음 — §3.7.4) |
| MC-34 | 🔒 잠금·표시 | 잠금을 켜고 ① 메모장(자체 메뉴 있음) 위 ② 창 모드 게임 또는 그림판 위 오버레이를 오른쪽 클릭 | 두 경우 모두 오버레이 메뉴가 뜬다. 오른쪽 클릭은 아래 창에도 전달된다. ①의 두 메뉴 경합 결과는 **관찰만** 하고 비고에 적는다(U-4 수용) |
| MC-35 | 숨김 | 트레이로 오버레이를 숨기고 옛 자리를 오른쪽 클릭 | 오버레이 메뉴가 뜨지 않는다 |
| MC-36 | 드래그(🔒 U-1) | 오른쪽 버튼을 ① 오버레이 안에서 누르고 밖에서 떼기 ② 밖에서 누르고 안에서 떼기 ③ 키를 누른 채 오른쪽 클릭 반복 | ①② 메뉴 없음. ③ 오른쪽 클릭마다 메뉴 1개, 엉뚱한 때 뜨는 메뉴 없음 |
| MC-37 | 열린 메뉴 | 메뉴가 열린 상태에서 ① 오버레이 위 오른쪽 클릭 ② 바깥 좌클릭 ③ Esc | ① 두 번째 메뉴가 뜨지 않는다 ②③ 메뉴가 닫힌다. **잠금 중에도 닫히는지** 확인(R4). 비고: ①을 "메뉴 위"와 "메뉴 바깥의 오버레이 위"로 나눠 기록한다(§11 T-f·T-g) |
| MC-38 | 트레이 메뉴와 겹침 | 트레이 메뉴를 연 채 오버레이를 오른쪽 클릭 | 동시에 두 메뉴가 남지 않는다(**관찰만**) |
| MC-39 | 창 모드 게임·포커스(🔒 U-2) | **테두리 있는 창 모드** 게임에서 잠금을 켜고 오버레이 메뉴를 열었다 닫은 뒤 키 입력 | 메뉴가 뜬다. 메뉴가 열린 동안에도 키 입력에 오버레이가 반응한다(관찰). 닫은 뒤 게임 입력이 돌아오는 데 클릭이 필요한지 **기록만** 한다(수용된 동작) |
| MC-40 | 🔒 테두리 없는 전체 화면 | 테두리 없는 창 모드 전체 화면 게임에서 잠금 오버레이를 오른쪽 클릭(누름·뗌 모두 오버레이 위) | **메뉴가 뜨지 않는다.** 게임 포커스가 유지되고, 게임은 오른쪽 클릭을 받는다 |
| MC-41 | 🔒 독점 전체 화면 | 독점 전체 화면 게임에서 오버레이가 있던 자리를 오른쪽 클릭 | **메뉴가 뜨지 않고, 게임이 최소화되거나 화면이 전환되지 않는다** |
| MC-42 | 최대화 창(테두리 있음) | 작업표시줄 자동 숨김을 ① 끈 채 ② 켠 채, 최대화한 브라우저 위 잠금 오버레이를 오른쪽 클릭 | ①② 모두 메뉴가 뜬다(클라이언트 영역이 제목 표시줄만큼 모니터보다 작음 — 횡단 D-11) |
| MC-43 | 바탕 화면·작업표시줄 전경 | ① 바탕 화면 빈 곳을 좌클릭한 뒤 바탕 화면 위 잠금 오버레이를 오른쪽 클릭 ② 작업표시줄을 클릭해 전경으로 만든 뒤 오버레이를 오른쪽 클릭(잠금·비잠금) | ①② 메뉴가 뜬다(`Progman`·`WorkerW`·`Shell_TrayWnd` 예외). 비고: Alt+Tab 전환 화면·작업 보기가 떠 있을 때의 결과는 관찰만(R7) |
| MC-44 | 브라우저·동영상 전체 화면 | 브라우저 F11 또는 동영상 전체 화면 위 잠금 오버레이를 오른쪽 클릭 | 메뉴가 뜨지 않는다(테두리 없는 전체 화면 — 정의대로). 전체 화면을 나가면 다시 뜬다 |
| MC-45 | 경합·다중 모니터(관찰) | ① 모니터 A에 테두리 없는 전체 화면 게임(전경), 모니터 B에 잠금 오버레이 → B의 오버레이를 오른쪽 클릭 ② 비잠금 오버레이를 전체 화면 게임 위에서 오른쪽 클릭 ③ 배율이 다른 모니터(WQHD + 1080p)로 오버레이를 옮겨 MC-31 반복 | ① 오른쪽 누름으로 B의 아래 창이 활성화되면 전경이 바뀌어 메뉴가 뜰 수 있다 — 결과만 기록(R6) ② 클릭이 오버레이를 활성화해 전경이 이 앱이면 메뉴가 뜬다(정의대로) — 결과만 기록 ③ 메뉴가 뜨고 창 가장자리 판정이 맞다 |

## 9. bridge 요구 명세 (계약 확정은 bridge-designer)

| 종류 | 이름 | 요구 | 빈도 |
|---|---|---|---|
| command(기존, 구현 교체) | `set_autostart(enabled) -> boolean` | **async**. `tauri::async_runtime::spawn_blocking(move \|\| tray::autostart::set_enabled(enabled))`로 부른다(UAC 대기 중 메인 스레드·IPC가 멈추지 않게). `Ok(actual)` → `tray::autostart::persist_autostart(&state.settings, &state.paths.settings_file, actual)` → `Some(s)`면 `settings://changed`(s) emit(`None`이면 emit 생략 가능 — 값 불변) → `actual` 반환. 에러 코드: `autostart.cancelled`(신규, D-3) · `autostart.error` · `io.error` · `state.poisoned` · `settings.*` | 토글 클릭당 1회 |
| command(기존) | `set_settings` | 입력 `autostart` 무시 — `window::keep_core_owned`로 두 번 병합, 4단계의 `apply_autostart` 호출 삭제([window.md](window.md) §2.4·§9.5) | 변경 없음 |
| 삭제 | `commands.rs:15` `use tauri_plugin_autostart::ManagerExt`, `commands.rs:331-343` `apply_autostart`, `error.rs:51-58` `From<tauri_plugin_autostart::Error>` | plugin 제거(승인 2026-09-24) | — |
| 에러 | `error.rs` | `impl From<AutostartError> for BridgeError` | — |
| 계약 문구 | contract §5 `set_autostart` | "작업 스케줄러 작업 `kuro_keyviewer`(로그온·가장 높은 권한) 등록/해제. 켜기·끄기마다 UAC 창이 뜬다(작업이 없을 때 끄기는 창 없음). 반환 = 끝난 뒤 실제 등록 상태. 앱 시작 때 core가 실제 상태로 `autostart`를 보정하고 바뀌면 `settings://changed`를 보낸다" | — |
| event(기존) | `settings://changed` | 시작 보정으로 `autostart`가 바뀌면 1회(설정 창이 열려 있지 않으면 받는 쪽 없음 — `get_settings`가 보정값을 준다) | 앱 시작당 최대 1회 |

- **R-40 (§3.7): bridge 요구 없음.** 메뉴 id·메뉴 이벤트는 Rust 내부(muda → 이벤트 루프)이고 IPC가 아니다. 팝업은 Rust `WebviewWindow::popup_menu`라 JS `menu` 권한·capabilities 변경이 없다. `InputEvent`·`input://mouse-button`은 불변(hook은 별도 채널). 새 command·event·에러 코드 없음 — contract v0.27 유지(횡단 §5). 「표시/숨김」의 `settings://changed`, 타이머 항목의 `timer://changed`는 기존 핸들러가 그대로 낸다.

### plugin-autostart 제거 순서 (🔒 빌드·실행이 깨지지 않게)

| 순서 | 누가 | 무엇 | 이유 |
|---|---|---|---|
| ① core 구현 세션 | core-implementer | **`lib.rs:58-62` `.plugin(tauri_plugin_autostart::init(…))`를 그대로 둔다**(완료 보고에 "초기화 유지" 명시) | bridge `commands.rs`가 아직 `app.autolaunch()`(= `app.state::<AutoLaunchManager>()`)를 부른다. 초기화를 먼저 지우면 컴파일은 되지만 **`set_settings`마다 미등록 상태 조회로 panic**한다(Tauri `Manager::state`는 미등록이면 panic) |
| ② bridge 구현 세션 | bridge-implementer | `commands.rs`·`error.rs`의 plugin 사용처 삭제(위 표) | — |
| ③ ② 직후 core 후속(W-2) | core-implementer | `lib.rs:58-62` 4줄 삭제, `tray/mod.rs` `//!` [자동 실행] 문구 갱신 | 사용처 0 확인(Grep `autolaunch\|tauri_plugin_autostart` in `src-tauri/src` = lib.rs만) 뒤 |
| ④ 메인 세션 | 메인 | `Cargo.toml` `tauri-plugin-autostart`, npm `@tauri-apps/plugin-autostart`, capability `autostart:default` 삭제 | ③ 뒤라야 `cargo check`가 깨지지 않는다 |

## 10. 요구 추적표

| 요구ID | 반영 절 | 상태 |
|---|---|---|
| SV2-05 — 작업 스케줄러 등록·해제(관리자, 로그온, 현재 사용자) | §2, §3.1, §3.2, §6, §8.1 X1~X12, §8.3 M-T2~M-T7 | ✅ 설계 · 소스 미적용 |
| SV2-05 — UAC 취소 구분 | §3.2, §6 `Cancelled`, M-T3 · [hook.md](hook.md) §3.6 | ✅ 설계 |
| SV2-05 — 시작 시 실제 상태로 보정 | §4, §2 `persist_autostart`, §8.2 P1~P3, M-T8·M-T9 | ✅ 설계 |
| SV2-05 — `set_settings`가 `autostart`를 바꾸지 않음 | §7, [window.md](window.md) §2.4 `keep_core_owned` | ✅ 설계 |
| SV2-05 — 비승격 조회(판정 불가 시 None) | §3.2 `query`, §3.1 `interpret_query_exit`, M-T1 | 부분(T1 실측 대기) |
| SV2-05 — plugin-autostart 제거 순서 | §9 표 | ✅ 설계 |
| SV2-03·04 — 트레이 표시 시 창 속성 재적용 | §3.3, M-T11 | ✅ 설계 |
| 트레이 메뉴 3항목(기존) | §2 `init` | ✅(기존) |
| **TM-11 (CR-048) — 켜져 있을 때만 「시작/일시정지」·「멈춤」, 보기가 바뀔 때만 재구성** | §3.6.1~§3.6.3, §3.6.6 TV1·TV2, §8.3 M-T12~M-T14 | ✅ 설계 · 소스 미적용(수동 확인은 ui·bridge 패킷 뒤 verify) |
| **TM-11 — 트레이 조작(설정 → 타이머 잠금 차례, 동시 보유 금지) → 깔때기로 두 창 반영** | §3.6.4, [timer.md](timer.md) §3.7 | ✅ 설계 · 소스 미적용 |
| **overlay R-40 AC-1 — 오버레이 위 오른쪽 클릭 → 트레이와 같은 메뉴가 커서 위치에 1개** | §3.7.3 `request_popup`·`popup_now`, §4 R-40, PM1, MC-31 | 설계 확정 · 소스 미적용 |
| **R-40 AC-2 — 항목·순서·문구·동작이 트레이와 같다(뜨는 순간 상태)** | §3.7.2 `current_view`, §3.7.4(기존 `build_menu`·전역 `on_menu_event` 공유), MC-32·MC-33 | 설계 확정 · 소스 미적용 |
| **R-40 AC-3 (🔒) — 위치 잠금 중에도 뜨고 클릭은 아래 창에도 전달** | §3.7.3 PU-g, [hook.md](hook.md) §3.9.3 RC-b, MC-34 | 설계 확정 · 소스 미적용 |
| **R-40 AC-4 — 숨김이면 안 뜸** | §3.7.3(`overlay_screen_rect` → `None`), PM2, MC-35 | 설계 확정 · 소스 미적용 |
| **R-40 AC-5 (🔒 U-1) — 누른 곳·뗀 곳 모두 창 사각형(투명 포함) 안** | §3.7.3 `should_popup`·`should_request`(7차 — `overlay-menu`에서 전경 조회보다 먼저), PM1~PM4·PM12·PM13, [window.md](window.md) §3.1 WR1~WR3, MC-36 | 설계 확정 · 소스 미적용 |
| **R-40 AC-6 (🔒 U-5) — 한 클릭에 메뉴 하나(중복 팝업 없음)** | §3.7.3 PU-b·PU-c·`PopupGate`(7차 — Idle→Pending→Open, post 전 예약), PM5~PM10, MC-31·MC-36 ③·MC-37 | 부분(core 몫 7차 설계 개정 · 소스 미적용. WebView2 기본 메뉴 억제는 ui 패킷) |
| **R-40 AC-7 — 합성 뗌·드래그로는 안 뜸** | [hook.md](hook.md) §3.9.3 RC-c·RC-e, RC2·RC4·RC6, MC-36 | 설계 확정 · 소스 미적용 |
| **R-40 AC-8 (🔒 U-3) — 전체 화면이면 안 뜸(테두리 있는 창·바탕 화면·작업표시줄·이 앱 창이면 뜸)** | §3.7.5 `suppress_for_fullscreen`, FS1~FS7·PM14·PM15, [hook.md](hook.md) §3.10 FG1~FG6, MC-40~MC-45 | 설계 확정 · 소스 미적용 |
| **R-40 AC-9 (U-2 수용) — 포커스 자동 복귀 없음** | §3.7.3 PU-f, MC-39(기록) | 수용(구현 없음) |

## 11. 설계 결정 노트

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| **T1** | `query`: 종료 코드 0 → 있음, **1 → 없음**, 그 밖 → 판정 불가(가정 A: 비승격 프로세스가 같은 사용자의 관리자 등록 작업을 조회할 수 있다) | B: 0 아니면 전부 `None` | A면 시작 보정이 양방향(켜짐↔꺼짐)으로 되고 끄기에서 작업이 없을 때 UAC가 뜨지 않는다. 작업 스케줄러는 작업을 등록한 사용자(작성자·주체)에게 읽기 권한을 주는 것이 일반적이지만 이 PC에서 **실측(M-T1)으로 확정**한다. M-T1이 1이면 B로 바꾼다 — 대가: 시작 보정은 `false → true`만, 끄기는 항상 UAC, `disable` 3단계의 "이미 없음" 판정 불가 |
| T2 | `tray → hook` 의존 추가 | window·settings에 래퍼 / PowerShell `Start-Process -Verb RunAs`(D-4 B) / COM `ITaskService`(D-4 C) | 🔒 D-4 A. unsafe는 hook에만 있고 hook은 여전히 다른 모듈을 모른다(스킬 §1 금지는 "hook이 다른 모듈 참조") |
| T3 | `persist_autostart`를 tray 공개 함수로 추가(패킷 목록 밖) | lib.rs·bridge가 각자 잠금·저장 | 시작 보정(lib.rs)과 `set_autostart`(bridge) 두 곳이 같은 "잠금 안 비교·갱신 → 잠금 밖 저장"을 한다. window `persist_overlay_position`과 같은 모양이라 tempdir 테스트(P1~P3)가 된다. 스킬 §4 "잠근 채 IO 금지"를 한 곳에서 지킨다 |
| T4 | 작업 XML은 필요한 요소만(스키마 1.2) | 작업 스케줄러 내보내기 전체 | 빠진 요소는 스케줄러 기본값을 쓴다. 기본값이 해로운 것(72시간·배터리·우선순위 7·모든 사용자)만 명시 |
| T5 | `toggle_overlay`의 `BridgeError` 반환 부채는 이번에 고치지 않음 | `WindowError`로 전환 | 요구 밖(window.md §11 기존 부채 기록과 같은 항목) |
| T6 | 시작 보정 ↔ `set_autostart` 동시 완료 경합 수용 | 전역 원자 플래그로 직렬화 | 보정 조회는 0.1초 안팎이라 시작 직후 설정 창을 열어 토글까지 누르는 일은 드물다. 틀려도 다음 시작 때 실제 상태로 다시 맞는다 |
| T7 | 임시 XML: `%TEMP%` + pid 파일명 + `create_new` + Drop 삭제 | 명령줄 인자만(`/SC ONLOGON /RL HIGHEST`) | 명령줄로는 배터리·실행 시간 제한·우선순위를 못 바꾼다 |
| T8 | 레지스트리 Run 값 정리 코드 없음 | 옛 plugin Run 값 삭제 | 옛 R-06 화면이 배포된 적이 없어 남은 값이 있을 가능성이 낮다(패킷 §3.1). 남아 있으면 로그온 때 일반 권한 앱이 하나 더 뜬다 — 확인 필요 T-c |

### 확인 필요 · 관찰

- **T-a (보안, 02-design §5.1 R-1과 같은 위협 모델)**: 가장 높은 권한 작업이 사용자 쓰기 가능 경로의 exe를 가리킨다. 같은 원리로 임시 XML도 같은 사용자 권한 프로세스가 `schtasks` 실행 전에 바꿔치기할 수 있다(`%TEMP%`는 사용자 전용이라 다른 사용자는 불가). 완화(전체 사용자 설치 등)는 R-1 결정에 따른다 — verify-security-reviewer 항목.
- **T-b**: `ShellExecuteExW` 호출 스레드에서 COM을 초기화하지 않는다(`Win32_System_Com` 기능 없음). exe를 `runas`로 실행하는 데는 셸 확장이 필요 없어 동작한다고 보고 M-T2로 확인한다. 실패하면 `CoInitializeEx` 래퍼가 필요하고 `windows` 기능 추가 승인이 필요하다.
- **T-c**: 옛 plugin Run 값(`HKCU\…\Run`의 앱 이름 값) 잔존 여부 — 개발 PC에서 한 번 확인 권고(`reg query HKCU\Software\Microsoft\Windows\CurrentVersion\Run`). 있으면 정리 방법을 사용자에게 올린다(코드로 지우는 것은 요구 밖).
- **T-d**: 단일 인스턴스 없음(02-design §5.1 R-2) — 자동 실행(관리자) + 수동 실행이 겹치면 두 벌 뜬다. 요구 밖.
- **T-e**: 트레이 메뉴 번역(R-3)·잠금 해제 메뉴(R-4)는 요구 밖 — 트레이 문구는 한국어 그대로.
- **W-2 (후속 작업)**: §9 제거 순서 ③.

### R-40 결정 (2026-09-29, CR-062 — 횡단 설계 v2 §2.2~§2.14·§4 이행)

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| T9 | 메뉴 동작은 **기존 `on_menu_event`(전역 리스너)를 공유**, 새 핸들러 없음 | 팝업 전용 `on_menu_event`·`Window::on_menu_event` 등록 | 횡단 D-4·F2. 등록하면 같은 이벤트를 두 리스너가 받아 한 클릭이 두 번 실행된다. 공유하면 동작·동기화가 구조적으로 트레이와 같아진다 |
| T10 | 팝업마다 `build_menu(current_view)`로 **새 메뉴**, `LAST_VIEW` 불간섭 | 트레이 메뉴 객체 재사용 / `LAST_VIEW`로 보기 캐시 | 횡단 D-5. 트레이 메뉴 객체는 트레이 아이콘에 붙어 있고, `LAST_VIEW`는 "트레이에 마지막으로 적용한 보기"라 팝업이 쓰면 의미가 섞인다. 뜨는 순간의 상태를 직접 읽는 편이 정확하다 |
| T11 | 판단 스레드 `overlay-menu`(post만) + 메인 스레드 `popup_now` | ① `input-forwarder`에서 판단·팝업 ② 훅 콜백에서 post | 횡단 §1.6·F3. `popup_menu`를 다른 스레드에서 부르면 메뉴가 닫힐 때까지 그 스레드가 멈춘다 — ①은 입력 전달이 멈춘다. ②는 콜백 최소 작업 위반이고 전경 창 조회를 둘 곳이 없다 |
| T12 (7차: 순서는 상태·사각형 판정 **뒤** — T17) | 전체 화면 판정은 `overlay-menu`에서 post 직전, **fail-open** | 메인 스레드(`popup_now`)에서 판정 / 조회 실패 시 생략 | 횡단 D-12(🔒 지시). Win32 조회는 스레드 제약이 없어 메인 스레드를 기다릴 이유가 없다. 게임 최소화 위험은 전체 화면 창 조회에 성공했을 때만 생기고, 조회 실패로 기본 기능이 사라지는 쪽이 더 흔하고 더 나쁘다 |
| T13 (7차: 구현 형태는 **T16이 대체**, 지역 인스턴스 원칙만 유지) | `OpenGuard`는 플래그를 인자로 받는다(`OpenGuard<'a>`) | 정적 `POPUP_OPEN`을 직접 쓰는 단위 구조체 | 횡단 §4.2 권고. 테스트(PM5)가 지역 `AtomicBool`로 돌아 정적 상태를 공유하지 않는다(병렬 `cargo test`) |
| T14 | `spawn_popup_listener` 실패는 경고 로그 후 앱 시작 계속 | setup 실패로 전파(`?`) | 메뉴는 부가 기능이다. 트레이 메뉴가 같은 동작을 그대로 제공하므로 앱을 멈출 이유가 없다(횡단 §4.3-9) |
| T15 | `current_view`의 경고 문구 괄호를 「(메뉴 보기 계산)」으로 | 기존 「(타이머 메뉴 동기화)」 유지 | 두 호출자 공용이 되어 기존 문구가 팝업 경로에서 틀린 맥락을 가리킨다. 로그 문구는 계약·테스트 대상이 아니다 |
| **T16** (7차, CORE-301) | 팝업 상태를 **3단계 `Idle → Pending → Open`**(`PopupGate`, `AtomicU8` 하나)로. `overlay-menu`가 post **전에** `compare_exchange(Idle→Pending)`, 메인 `popup_now`가 `Pending→Open`, 가드 Drop이 `→Idle`, post 실패는 `cancel`(`Pending→Idle`). **T13의 `OpenGuard<'a>(&AtomicBool)`를 대체**한다. "플래그를 인자로 받아 테스트가 지역 인스턴스를 쓴다"는 T13 원칙은 `PopupGate::new()` 지역 인스턴스로 유지 | ① 옛 2단계 `POPUP_OPEN` 유지 ② 2단계 + `overlay-menu`에서 `true`를 먼저 세팅(post 전 CAS false→true) ③ 메인 스레드에서 밀린 요청을 시각으로 거름 | 옛 설계의 결함: tao가 모달 중 사용자 이벤트를 버퍼링했다가 닫힌 뒤 실행한다(runner.rs:143-148·208-226). 그래서 "보냈지만 실행 전" 요청이 가드가 풀린 뒤 통과한다. ②도 막을 수는 있다. 다만 한 값이 "예약됨"과 "열림"을 같이 뜻해, `popup_now` 조기 반환·post 실패 때 누가 되돌리는지 경계가 흐려진다. 3단계는 전이 주체가 스레드별로 나뉘고(Idle→Pending은 overlay-menu만, Pending→Open은 메인만) 표(§3.7.3 상태 전이표)와 PM5~PM10으로 검증된다. ③은 `RightClick`에 시각이 없어 hook 타입(횡단 D-8) 변경이 필요하다 |
| **T17** (7차, SEC-301) | 판정 순서 **① 상태 → ② 오버레이 창 사각형 → ③ 전경 창 전체 화면 → ④ 예약·post**, 모두 `overlay-menu`에서. 순서는 순수 함수 `should_request`(단락 평가)로 고정하고 PM11~PM15로 검증. `overlay_screen_rect`는 `overlay-menu`(비메인)에서 부른다 | ① 옛 순서(전경 → post → 메인에서 사각형) ② 창 이동·크기·표시 이벤트로 갱신하는 사각형 캐시 ③ hook에 `GetWindowRect`·`IsWindowVisible` 안전 래퍼 + 오버레이 HWND 저장 | ①은 화면 어디의 오른쪽 클릭이든 다른 프로세스 창을 조회하고 메인 스레드를 깨운다(데이터 최소화·게임 중 비용). Tauri 창 getter는 비메인 스레드에서 **스레드 안전한 동기 왕복**이다(tauri-runtime-wry 2.12.0 `lib.rs:196-210·263-278`, PU-h). 막히는 경우는 메인 스레드가 핸들러 안에 있을 때뿐인데, ①에서 Pending·Open을 먼저 거르므로 우리 모달과는 구조적으로 겹치지 않는다. 그래서 대안이 필요 없다. ②는 표시 상태를 바꾸는 경로가 여럿이다(`toggle_overlay`·`set_overlay_visible`·`apply_overlay_window`·`setup_overlay`). 게다가 `set_size`는 `Moved`를 내지 않는다(window.md 사실). 하나라도 빠지면 캐시가 낡아 AC-4·AC-5를 조용히 어긴다. ③은 새 unsafe·모듈 간 HWND 전달이 필요한데 리뷰 범위 밖이고, 얻는 것이 왕복 3회(마이크로초)뿐이다 |
| **T18** (7차) | 사각형은 `overlay-menu`에서 한 번만 판정하고 `popup_now`는 다시 판정하지 않는다(PU-i) | `popup_now`에서 가시성·사각형 재확인 | 🔒 U-1은 클릭 시각의 창 기준이라 먼저 보는 쪽이 정의에 더 가깝다. 판정과 팝업 사이(밀리초)에 창을 숨기거나 옮기려면 별도 좌클릭 조작이 필요해 같은 클릭과 겹칠 수 없다. 재확인은 메인 스레드 getter 3회와 분기를 더할 뿐 요구를 더 지키지 않는다 |
| **T19** (7차, CORE-304) | `lib.rs` setup 4단계를 비공개 `fn start_input_pipeline(handle: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>>`로 추출. 50줄이 남으면 `initial_hand_anchor`·`build_app_state`도 차례로 추출(§3.7.6) | setup 클로저 그대로(기존 위반 유지) / 단계마다 전부 함수화 | 50줄 한계는 표준 강제 항목(golden-principles §1)이다. 4단계는 채널·훅·스레드 셋이 한 묶음이라 경계가 자연스럽다. 실패 전파 규칙(훅·전달 = setup 실패, 메뉴 = 경고)을 함수 문서 한 곳에 모은다. 전부 함수화는 요구 없는 재구성이라 한계를 넘는 만큼만 뺀다 |

### R-40 확인 필요 · 관찰

- **T-f (관찰 — 횡단 설계에 되돌릴 수 있음)**: 메뉴가 열린 채 **메뉴 바깥의 오버레이 위**를 오른쪽 클릭하면, 누름이 메뉴를 닫아(`TrackPopupMenu` 바깥 클릭 해제) 가드가 풀린 뒤 뗌이 도착한다. 두 점이 모두 창 안이면 **새 메뉴가 그 자리에 다시 뜰 수 있다**(동시에 두 개는 아님 — 바탕 화면 메뉴의 "닫고 다시 열기"와 같은 모양). 메뉴 **위** 오른쪽 클릭은 메뉴가 닫히지 않아 가드가 막는다. 횡단 MC-37 ① 기대 "두 번째 메뉴가 뜨지 않는다"를 "동시에 둘이 없다"로 읽으면 PASS, "다시 뜨지도 않는다"로 읽으면 FAIL이다. 막으려면 `RightClick`에 누름 시점 정보를 실어 "가드가 열린 동안 시작된 클릭"을 버려야 해 **횡단 설계(D-8 타입·§4.2) 변경**이 필요하다 — 이 문서는 반영하지 않고 MC-37 관찰 결과로 아키텍트 세션이 판단한다.
- **T-g (관찰, 횡단 R4)**: 잠금 중에는 마지막 입력을 받은 프로세스가 아래 창이라 muda의 `SetForegroundWindow(overlay)`가 거부될 수 있다. 그러면 메뉴는 떠도 바깥 클릭으로 닫히지 않거나 키보드 조작이 안 될 수 있다. MC-37(잠금)으로 확인하고, 실패하면 횡단 설계 세션으로 되돌린다(core가 임의로 포커스 우회 코드를 넣지 않는다 — U-2).
- **T-h (관찰, 횡단 R6·R7·MC-38·MC-45)**: 다중 모니터에서 오른쪽 누름이 다른 창을 활성화해 전경이 바뀌는 경합, Alt+Tab·작업 보기 같은 셸 전체 화면 창, 트레이 메뉴가 열린 동안의 클릭은 관찰만 한다.
- **T-j (관찰, 7차)**: 메인 스레드가 우리 메뉴가 아닌 이유로 tao 핸들러 안에 오래 머물면 `overlay-menu`가 창 getter에서 그만큼 기다린다. 현재 코드에서 그런 경로는 알려져 있지 않다. 트레이 메뉴는 tray-icon 창 프로시저의 모달이라 핸들러 밖이라고 보지만 미확인이다 — MC-38 관찰. 그 사이 온 오른쪽 클릭은 채널에 쌓인다. 풀린 뒤 첫 클릭이 판정을 통과하면 Pending이 되고, 나머지는 ①에서 버려진다. 그래서 늦게 뜨는 메뉴는 **많아야 1개**다. 늦은 클릭까지 버리려면 `RightClick`에 시각이 필요하다(T-f와 같은 횡단 D-8 변경). 관찰 결과로 아키텍트 세션이 판단한다.
- **T-f 보충(7차)**: 3단계 상태로도 T-f는 그대로다. 메뉴 바깥의 오버레이를 오른쪽 **누르면** 메뉴가 닫혀 Idle이 된다. 그 뒤 **뗌**이 도착하므로 새 요청이 정상 통과한다. CORE-301이 막는 것은 "post됐지만 실행 전" 요청이 모달 뒤에 실행되는 경우다. 누름·뗌이 모두 메뉴가 열린 동안 끝난 클릭은 옛 설계에서도 `load`가 걸렀고 새 설계에서도 ①이 거른다.
- **T-i (요구ID)**: overlay `requirements.md` R-40은 ui-designer가 동시에 추가 중이다(횡단 §9 문구). 번호가 바뀌면 §1·§10을 맞춘다. 확정사항 §6 트레이 행 갱신(U-6)은 메인 세션 몫이다.
