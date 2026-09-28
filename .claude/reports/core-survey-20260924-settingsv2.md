# core 현황 조사: 설정 창 개편(R-set-v2) 대비 (2026-09-24 18:25, core-analyst, 읽기 전용)

## 0. 요약

**판정: R-set-v2의 core 쪽 기반은 대부분 없다.** 새로 만들어야 하는 것은 설정 필드 3개, 창 속성 적용 함수 3개, 작업 스케줄러 자동 실행 경로, 관리자 권한 매니페스트다. 필수 이미지 판정은 core에 없어서 새 규칙을 적용해도 core 코드는 바뀌지 않는다.

- 있는 것: `Settings.autostart`, `Settings::default().overlay`로 얻는 기본 위치 (100,100), 원자적 쓰기에 가까운 저장, PNG 검증, `import`/`remove`, 캔버스 재계산.
- 없는 것: `language`·`positionLock`(클릭 통과)·`showInTaskbar` 필드, `set_ignore_cursor_events`·`set_skip_taskbar` 호출, 작업 스케줄러 등록, UAC 승격, 관리자 권한 매니페스트, 단일 인스턴스, `version` 필드.
- 심각도별 건수(§13 기준): CRITICAL 0 / HIGH 2 / MEDIUM 4 / LOW 1

## 1. 인벤토리

| 모듈 | 파일 | 줄 | pub 항목(요지) | unsafe |
|---|---|---|---|---|
| settings | settings/mod.rs | 563 | `Point`, `OverlaySettings`, `MouseSettings`, `Settings`, `default_mouse`, `SettingsError`, `load_or_default`, `load`, `save`, `validate`, `SCALE_MIN/MAX` | 0 |
| window | window/mod.rs | 225 | `OVERLAY_LABEL`, `SETTINGS_LABEL`, `WindowError`, `ScreenBounds`, `Point`, `list_monitors`, `overlay_position`, `set_overlay_position`, `set_overlay_visible`, `apply_overlay_settings`, `show_settings_window`, `screen_bounds`, `union` | 0 |
| window | window/placement.rs | 589 | `MOVE_SAVE_DEBOUNCE`, `MIN_VISIBLE_PX`, `resolve_overlay_position`, `restore_overlay_position`, `watch_overlay_moves`, `persist_overlay_position`, `keep_overlay_position` | 0 |
| window | window/sizing.rs | 274 | `OverlaySize`, `overlay_display_size`, `resize_overlay` | 0 |
| tray | tray/mod.rs | 80 | `init` | 0 |
| assets | assets/mod.rs | 753 | 상수 4개, `CanvasSize`, `AssetEntry`, `AssetManifest{find}`, `AssetError`, `PngInfo`, `parse_png_header`, `validate`, `load_manifest`, `save_manifest`, `import`, `remove`, `asset_url` | 0 |
| assets | assets/slot.rs | 406 | `SimpleSlot`, `KbDownKind`, `PenDownKind`, `AssetSlot{kb_down, pen_down, file_key, is_mouse_part, is_pen_part, is_canvas_layer}` | 0 |
| assets | assets/manifest_load.rs | 226 | (비공개) `parse_manifest` | 0 |
| assets | assets/anchor.rs | 587 | `compute_hand_anchor` | 0 |
| (루트) | lib.rs 180 / error.rs 58 | — | `AppPaths`, `AppState`, `HookGuard`, `run` / `BridgeError` | 0 |
| hook | hook/mod.rs 494, tests.rs 515 | — | (이번 범위 밖) | 18 / 2 |

- hook/ 밖의 `unsafe` 문자열은 모두 `//! [unsafe] 없음` 같은 문서주석이다. hook/ 밖에 실제 `unsafe`는 없다(lib.rs:7, settings/mod.rs:10 등).
- hook/ 밖의 `unwrap`/`expect`는 모두 `#[cfg(test)]` 안에 있다(예: settings/mod.rs는 208줄 이후만 해당).

## 2. 조사 질문별 사실

### Q1. settings (src-tauri/src/settings/mod.rs)
- `Settings` 구조체(84-95): `#[serde(rename_all = "camelCase", default)]`(85). `deny_unknown_fields`는 없다. 모르는 키는 무시된다(8행, 테스트 C5 483-495).
  | 필드 | 타입 | 기본값(113-127) |
  |---|---|---|
  | `scale` | f64 | 1.0 |
  | `idle_seconds` | u32 | 300 |
  | `overlay` | `OverlaySettings{x:i32, y:i32, visible:bool}` (30-36) | {100,100,true} |
  | `mouse` | `Option<MouseSettings>` | `Some(default_mouse())` |
  | `autostart` | bool | false |
- `MouseSettings`(38-62)에는 `shoulder`, `area`(`#[serde(default="default_area")]`), `part_pos`(`default="default_part_pos"`), `hand: Option`(`#[serde(default)]`), `pen_pos: Option`(`#[serde(default)]`)가 있다. 구조체 단위 `default`가 없어서 `shoulder`는 필수 키다.
- **`version` 필드: 없음.** 마이그레이션 로직: 없음. 호환은 serde 기본값과 모르는 키 무시에만 기댄다(8-9행, settings.md:178·403·425·473 D15/D19에 "확인 필요"로 기록돼 있다).
- 검증(149-165): `validate`는 clamp하지 않고 거부한다. 규칙은 scale 0.25~2이면서 유한수, idle_seconds ≥ 1, `mouse.area` 네 점이 유한수인지다. clamp는 window/sizing.rs:33-38 `normalize_scale`(표시용)에만 있다.
- 저장 경로는 인자로 받는다(`load(path)`/`save(path, ..)`). 경로는 lib.rs:33-40 `AppPaths::new`가 `app.path().app_data_dir()`로 만들며 하드코딩은 없다. 실제 폴더는 identifier `com.kuro.keyviewer`(tauri.conf.json:5)를 따르므로 `%APPDATA%\com.kuro.keyviewer\`다(settings/mod.rs:3, lib.rs:24 주석과 같다).
- 쓰기(193-206): `settings.json.tmp`에 쓴 뒤 **기존 파일을 `remove_file`하고 나서** `rename`한다(201-204). 삭제와 이름 바꾸기 사이에 종료되면 원본이 없어지고 .tmp만 남는다. 그러면 다음 실행에서 `load_or_default`가 기본값으로 떨어진다(CORE-001).
- `load`는 역직렬화 후 `validate`한다(187-189). 검증에 실패하면 `load_or_default`가 파일 **전체**를 기본값으로 대체한다(168-180).
- **R-set-v2 대상 필드 현황:** `autostart`만 있다(94). `language`·`positionLock`(=clickThrough)·`showInTaskbar`는 **없다.** `Settings`에 `default`가 걸려 있어서 새 필드를 추가하면 옛 파일은 기본값으로 읽힌다.

### Q2. window (src-tauri/src/window/*)
- 오버레이 창은 **tauri.conf.json의 정적 설정**으로 만든다(15-27): `transparent:true`, `decorations:false`, `alwaysOnTop:true`, `skipTaskbar:true`, `resizable:false`, `shadow:false`, `visible:true`, 450×350. 코드에서 창을 동적으로 만드는 곳은 없다.
- 설정 창도 정적이다(28-37): label `settings`, 900×640, 최소 720×480, `visible:false`, `center:true`. 여기에는 skipTaskbar 설정이 없어서 기본값인 작업표시줄 표시다. `show_settings_window`(mod.rs:156-163)는 `show`와 `set_focus`만 한다.
- **클릭 통과: `set_ignore_cursor_events`는 어디서도 쓰지 않는다**(src-tauri/src 전체에서 grep 0건). **`set_skip_taskbar`도 쓰지 않는다.** 두 값 모두 런타임 적용 경로가 없다.
- 드래그 이동은 **ui 쪽에서 한다.** `src/overlay/index.tsx:203`의 `data-tauri-drag-region`이 담당하고, 권한은 capabilities/default.json:8 `core:window:allow-start-dragging`이다. overlay/design.md:367 D-4에 "수용 확정"으로 적혀 있다. core는 이동이 끝난 것만 감지한다(placement.rs:197-217 `watch_overlay_moves`, `WindowEvent::Moved`, 500ms 디바운스). 위치 잠금을 하려면 이 속성과 권한을 끄거나(ui) 클릭 통과를 켜야(core) 한다. 클릭 통과를 켜면 드래그도 같이 막힌다.
- 위치 저장과 복원(placement.rs):
  - `persist_overlay_position`(222-238): 잠금 안에서는 비교·갱신·clone만 하고, `settings::save`는 잠금 밖에서 한다.
  - `restore_overlay_position`(100-123): 시작 시 1회 실행된다. `outer_size`와 모니터 목록을 읽어 `resolve_overlay_position`을 부른 뒤 `set_position`하고, `visible`에 따라 show/hide한다.
  - `keep_overlay_position`(244-253): `set_settings`가 위치를 덮어쓰지 못하게 막는 순수 병합이다.
- **기본 위치 계산:** 별도 함수가 없다. `resolve_overlay_position`(67-94) 안의 91행 `Settings::default().overlay`가 (100,100)으로 폴백한다. 위치 초기화에 그대로 재사용할 공개 함수는 없고, `Settings::default().overlay` + `set_overlay_position`(mod.rs:135-138) + `persist_overlay_position` 조합으로 만들 수 있다. 위치 초기화용 bridge 명령도 없다(lib.rs:159-173 목록).
- 좌표계: 위치는 물리 px(mod.rs:135-136 `Position::Physical`), 크기는 논리 px(sizing.rs:77 `Size::Logical`).

### Q3. tray (src-tauri/src/tray/mod.rs)
- 메뉴(17-31)는 3항목이다: 「설정 열기」(`open_settings`), 「오버레이 표시/숨김」(`toggle_overlay`), 「종료」(`quit`). 왼쪽 클릭으로도 메뉴가 열린다(42).
- 표시/숨김(62-80): `win.is_visible()`의 반대로 `window::set_overlay_visible`을 부르고, `settings.overlay.visible`을 저장한 뒤 `settings://changed`를 emit한다(73·76). 저장·emit이 **설정 잠금을 쥔 채로** 일어난다(71-77).
- **자동 실행 등록 코드는 tray에 없다**(6행 주석). 실제 구현은 **tauri-plugin-autostart**다:
  - 등록: lib.rs:59-62 `.plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))`
  - 사용: bridge/commands.rs:334-343 `apply_autostart`(`app.autolaunch().enable()/disable()/is_enabled()`, 멱등 처리 CR-004). 호출처는 `set_settings`(159)와 `set_autostart`(312-323).
  - 권한: capabilities/default.json:10 `autostart:default`
  - Windows에서의 방식은 **레지스트리 `HKCU\...\CurrentVersion\Run`**이다(src/settings/test/manual-checklist.md:29 M-08 기술. 플러그인 내부 구현은 이번에 확인하지 않음).
  - **schtasks·ITaskService·작업 스케줄러 코드: 없음**(grep 0건). 확정사항 §6:83 「작업 스케줄러(관리자 권한)」와 **맞지 않는다.**

### Q4. assets (src-tauri/src/assets/*)
- 슬롯 정의 위치는 slot.rs:20-81이다(`SimpleSlot` + `AssetSlot` untagged). 파일 키는 slot.rs:100-131에서 정한다.
  - 캔버스 레이어: `background`, `body`, `idle`, `rest`, `kb_up`, `kb_down_{N}`, `key_space`·`key_z`·`key_question`·`key_exclamation`·`key_enter`·`key_backspace`·`key_undo`
  - 마우스 파츠: `mouse_base`, `mouse_left`, `mouse_right`
  - 펜 그룹: `pen_up`, `pen_down_{N}`, `pen_key_space`·`pen_key_z`·`pen_key_question`·`pen_key_exclamation`·`pen_key_enter`·`pen_key_backspace`·`pen_key_undo`
  - 분류 함수: `is_mouse_part`(134-139), `is_pen_part`(142-157), `is_canvas_layer`(160-162)
- **필수 이미지 목록(required): core에는 정의가 없다.** Rust 코드에 필수 목록 상수·함수·manifest 플래그가 없다. 필수는 문서주석에만 나온다: assets/mod.rs:21-23 「필수 4장(kb_up·kb_down_0+·idle·rest)」, slot.rs:8. 설계도 "core는 필수 슬롯을 검사하지 않음, 판정은 ui"로 되어 있다(assets.md:8·137·315). `src/**/*.ts(x)`에서 `required|REQUIRED|필수`를 grep해도 필수 목록 상수는 찾지 못했다(types.ts:12 주석만 있음). ui가 어디서 판정하는지는 이번 범위 밖이라 확인 필요다.
  - 필수 이미지가 빠져도 core는 아무 동작을 하지 않는다. 에러도 manifest 플래그도 없다.
  - 새 규칙(§6:86 필수 = `kb_up` + `kb_down_0` + `mouse_base`)이 들어와도 core 코드 변경은 없다. 문서주석(mod.rs:21-23, slot.rs:8)과 설계 문서의 "필수 4장" 문구만 낡는다.
- PNG 검증:
  - `parse_png_header`(172-189): 시그니처, IHDR 길이·타입, w/h, depth, color를 읽는다.
  - `validate`(195-220): RGBA8 → 1MB → 0 < w,h ≤ 900×700 → 그룹 크기 일치 순서로 본다. 순서는 스킬 §7의 1~5와 같다.
  - 마우스 파츠의 ≤256 규칙은 없다. 확정사항 재정의(mod.rs:4-5)에 따라 900×700 상한과 셋이 같은 크기인지만 본다.
- 등록과 삭제:
  - `pub fn import(assets_dir: &Path, slot: AssetSlot, src: &Path) -> Result<AssetManifest, AssetError>`(300-328): 검증 → `assets/{key}.png` 기록 → 같은 슬롯 교체 → 캔버스 재계산 → manifest 저장.
  - `pub fn remove(assets_dir: &Path, slot: AssetSlot) -> Result<AssetManifest, AssetError>`(330-348): 없는 슬롯이면 `NotFound`다. 「기본값」 버튼이 슬롯 비우기라면 이 함수로 된다.
  - bridge 연결: commands.rs:210-239 `import_asset`/`remove_asset`. 캔버스 레이어면 리사이즈, 이어서 `assets://changed` emit, `mouse_base`면 손 기준점을 다시 계산한다.
- 캔버스 기준:
  - `recompute_canvas`(95-104)는 "entries에서 **첫 번째로 나오는** 캔버스 레이어"의 크기를 캔버스로 삼는다. `import`는 새 항목을 끝에 push하므로(324) 사실상 가장 오래 남은 레이어가 기준이다.
  - 비교 기준은 `group_size`(250-275)가 정한다. 다른 캔버스 레이어가 **없으면** 기준이 없어서 크기가 자유롭다(유일 항목 교체 포함).
  - **슬롯을 비우면 `remove`→`recompute_canvas`로 재계산하고, 캔버스 레이어가 모두 없어지면 `None`이 된다**(345, 테스트 slot.rs K5 293-312).
- manifest 쓰기(`save_manifest` 287-297)는 settings와 같은 tmp → remove → rename 패턴이다. PNG 본문은 `fs::write(&dest)`(311)로 **바로 덮어쓴다.** 원자적 쓰기가 아니다(CORE-002).
- manifest_load.rs:
  - `RawManifest{canvas: Option<CanvasSize>, entries: Vec<Value>}`(16-20)를 읽는다.
  - 항목마다 `from_value::<AssetEntry>`를 시도하고, 실패한 항목은 경고 로그를 남기고 건너뛴다(38-50).
  - 건너뛴 항목이 있으면 `recompute_canvas`한다(31-33). 최상위 구조가 손상되면 `AssetError::Manifest`를 낸다.
  - manifest에는 `version`도 필수 플래그도 없다(mod.rs:82-87 `{canvas, entries}`).

### Q5. lib.rs 부트 순서 등
- 순서:
  1. env_logger(55)
  2. 플러그인 `tauri_plugin_dialog`(58), `tauri_plugin_autostart`(59-62)
  3. setup ① 경로 → assets 폴더 생성 → `settings::load_or_default` → `assets::load_manifest`(실패 시 기본) → 손 기준점 계산 → `AppState` 관리(66-91)
  4. setup ② `tray::init`(94)
  5. setup ③ `hook::start` → `input-forwarder` 스레드(97-110)
  6. setup ④ `resize_overlay` → `restore_overlay_position`(보정 위치가 다르면 persist) → `set_overlay_visible` → `watch_overlay_moves`(113-155)
  7. `invoke_handler` 13개(159-173)
- 창은 conf에서 `visible:true`로 먼저 뜬 뒤 setup ④에서 크기·위치를 맞춘다. 창 속성(skip_taskbar, 클릭 통과)을 적용할 단계는 지금 없다.
- **관리자 권한 관련 코드: 없음.** `requireAdministrator`/`requestedExecutionLevel`은 grep 0건이다. build.rs(1-3)는 `tauri_build::build()`만 부르고 `WindowsAttributes::app_manifest`를 쓰지 않는다. src-tauri/에 .manifest 파일도 없다. 실효 권한은 tauri-build 기본 매니페스트를 따른다. asInvoker로 추정하지만 산출물은 확인하지 못해 확인 필요다.
- **단일 인스턴스: 없음.** `tauri-plugin-single-instance` 의존성도 코드도 없다. 작업 스케줄러 자동 실행과 수동 실행이 겹치면 인스턴스가 2개 뜨고, 전역 훅도 두 벌이 된다. 확인 필요다.
- 플러그인은 dialog와 autostart 2개뿐이다.

### Q6. Cargo.toml / 매니페스트
- 의존성(Cargo.toml:16-35):
  - `tauri 2` features `["protocol-asset","tray-icon","image-png"]`
  - `tauri-plugin-dialog 2`, `tauri-plugin-autostart 2`
  - `serde 1(derive)`, `serde_json 1`, `thiserror 2`, `log 0.4`, `env_logger 0.11`
  - `windows 0.58` features `Win32_Foundation`, `Win32_UI_WindowsAndMessaging`, `Win32_UI_Input_KeyboardAndMouse`, `Win32_System_Threading`, `Win32_System_LibraryLoader`, `Win32_Graphics_Gdi`
- 기타: build-dependencies `tauri-build 2`(14), dev `tempfile 3`(38), release 설정은 `panic = "abort"`(44).
- **작업 스케줄러:**
  - `Win32_System_TaskScheduler`·`Win32_System_Com`·`Win32_System_Variant`·`Win32_System_Ole` feature는 **꺼져 있다.** COM `ITaskService` 경로는 feature 추가(=의존성 설정 변경, 사용자 승인 대상)와 hook/ 밖 unsafe 금지 문제를 함께 부른다.
  - `schtasks.exe` 프로세스 호출은 `std::process::Command`만 있으면 되고 feature가 필요 없다. 다만 관리자 권한(`/RL HIGHEST`) 작업을 등록하려면 등록하는 프로세스가 이미 승격돼 있어야 하는 것으로 알고 있다(추정, 확인 필요).
- **UAC 승격:** `ShellExecuteExW`에 필요한 `Win32_UI_Shell`이 **꺼져 있다.** 승격 여부 조회(`GetTokenInformation`/`TokenElevation`)에 필요한 `Win32_Security`도 **꺼져 있다.** 어느 쪽이든 unsafe FFI이므로 hook/ 격리 규칙과 충돌한다. `Command::new("powershell")` + `Start-Process -Verb RunAs` 같은 프로세스 경유 방식이면 feature도 unsafe도 필요 없다(설계 판단 사항).
- tauri.conf.json: `bundle.windows`(56-65)에는 `webviewInstallMode`·`nsis.installMode:"currentUser"`만 있다. `requestedExecutionLevel`·`allowElevation`류 설정은 없다.

### Q7. 에러 타입
- `BridgeError{code, message}`(error.rs:10-16): `From` 구현은 `tauri::Error`→`tauri.error`, `io::Error`→`io.error`, `AssetError`, `SettingsError`, `tauri_plugin_autostart::Error`→`autostart.error`(27-58)다.
- `SettingsError`(settings/mod.rs:129-147): `Invalid`=`settings.invalid`, `Io`=`settings.io`, `Format`=`settings.format`.
- `WindowError`(window/mod.rs:51-78): `NotFound`=`window.not_found`, `NoMonitor`=`window.no_monitor`, `Tauri`=`tauri.error`, `StatePoisoned`=`state.poisoned`, `Settings`=내부 코드, `Thread`=`window.thread`.
- `AssetError`(assets/mod.rs:109-159): `NotPng`, `BadHeader`, `NotRgba`, `TooLarge`, `TooManyBytes`, `CanvasMismatch`·`MousePartMismatch`·`PenPartMismatch`(셋 다 `asset.canvas_mismatch`), `NotFound`, `Io`, `Manifest`, `Decode`.
- `HookError`(hook.md:50 기준 `Thread`, `Install`, `Ready`)는 이번 범위 밖이다.
- 작업 스케줄러, 승격, 권한 부족을 나타내는 에러 변형은 없다.

## 3. 지적 사항(§13)

| ID | 심각도 | 위치 | 항목 | 현재 상태 | 권고 방향 |
|---|---|---|---|---|---|
| CORE-001 | HIGH | settings/mod.rs:201-204, assets/mod.rs:292-295 | #7 비원자적 쓰기 | `if path.exists() { fs::remove_file(path)?; } fs::rename(tmp, path)?;`. 삭제와 이름 바꾸기 사이에 종료되면 원본이 사라진다 | Windows `fs::rename`은 기존 대상을 교체하므로(MoveFileEx REPLACE_EXISTING) 삭제 단계를 빼는 방향을 검토. designer 판단 |
| CORE-002 | HIGH | assets/mod.rs:311 | #7 비원자적 쓰기 | `fs::write(&dest, &bytes)?;`로 PNG를 바로 덮어쓴다 | tmp → rename 패턴. 「이미지 변경」 도입과 함께 검토 |
| CORE-003 | MEDIUM | tray/mod.rs:14·73·76, window/mod.rs:35 | #9 의존 방향 | tray가 `crate::settings::save`·`crate::bridge::events`·`crate::error::BridgeError`를 직접 참조하고, window가 `BridgeError`를 반환한다(주석 20-27에 "임시"로 명시) | 스킬 §1(tray→window만). 설계 부채로 기록돼 있어 HIGH로 올리지 않음. 확인 필요 |
| CORE-004 | MEDIUM | settings/mod.rs:84-95 | 스킬 §6 표준 강제 | `version: u32` 없음. settings.md:473에 확인 필요로 이미 올라가 있다. R-set-v2에서 필드 3개 이상이 추가되는 시점이다 | 도입 여부 사용자 판단 |
| CORE-005 | MEDIUM | assets/mod.rs:21-23, slot.rs:8 | #11 문서주석 | "필수 4장(kb_up·kb_down_0+·idle·rest)"이 확정사항 §6:86 새 규칙(kb_up + kb_down_0 + mouse_base)과 어긋난다 | 문서주석·assets.md 갱신 |
| CORE-006 | MEDIUM | lib.rs:59-62, commands.rs:334-343 | 확정사항 §6:83 불일치 | 자동 실행이 tauri-plugin-autostart(HKCU Run)로 되어 있고 작업 스케줄러(관리자)가 아니다 | R-set-v2 설계에서 교체 경로 결정 |
| CORE-007 | LOW | tray/mod.rs:71-77 | 스킬 §4 잠금 범위 | 설정 잠금을 쥔 채 `settings::save`(파일 IO)와 emit을 한다 | placement.rs:227-236 패턴(스냅샷 후 잠금 밖 IO)으로 맞춤 |

- 함수·파일 한계: 800줄 초과 파일은 없다(최대 assets/mod.rs 753). 50줄 초과 함수는 `set_settings`(commands.rs:134-193, 약 58줄)다. 이것은 bridge 계층이라 이번 표에는 넣지 않았다.
- clippy는 실행하지 않았다(읽기 전용).

## 4. 요구 추적

요구 추적 미수행(R-set-v2 세부 요구ID 목록 미제공). 참고로 확정사항 §6:85-86 항목별 core 기반을 대조하면 다음과 같다.

| 항목 | core 기반 | 상태 |
|---|---|---|
| 언어 선택(설정 창 문구 3개 국어) | `Settings.language` 없음 | ❌(저장 필드 필요 여부는 설계 판단) |
| 위치 잠금 = 클릭 통과 + 드래그 불가 | 필드 없음, `set_ignore_cursor_events` 없음, 드래그는 ui `data-tauri-drag-region` | ❌ |
| 작업표시줄 표시 토글 | 필드 없음, `set_skip_taskbar` 없음, conf 정적 `skipTaskbar:true` | ❌ |
| 자동 실행(작업 스케줄러·관리자) | `autostart` 필드는 있고 구현은 plugin-autostart(Run 키) | 부분 |
| 위치 초기화 | 기본값 (100,100)은 `Settings::default().overlay`, 적용은 `set_overlay_position`, 저장은 `persist_overlay_position` 조합. 전용 함수·명령 없음 | 부분 |
| 이미지 「기본값」 버튼 | `remove`가 슬롯을 비우고 캔버스를 재계산. 번들 기본 이미지 복원 기능은 없음 | 부분(의미 확인 필요) |
| 필수 = kb_up + kb_down_0 + mouse_base | core에 필수 판정 없음(ui 몫) | core 변경 없음 |

## 5. 파급(R-set-v2가 건드릴 core 공개 API)

| API | 호출자 | bridge 사용처 | 테스트 |
|---|---|---|---|
| `settings::Settings`(필드 추가) | lib.rs:69·88, placement.rs:30·91·244, tray/mod.rs:71-76, sizing.rs:35 | commands.rs `get_settings`·`set_settings`·`set_overlay_*`·`set_autostart`, events.rs `emit_settings_changed` | settings/mod.rs tests(구조체 리터럴 없음, `..Default::default()` 사용), placement.rs K1~K5·I1~I4(`settings_with_overlay` 446), TS 픽스처 약 10곳(`autostart: false` 줄: SettingsApp.test.tsx:136, OverlayApp*.test.tsx 등) |
| `window::keep_overlay_position` | commands.rs:145·180 | set_settings | placement.rs:562-567(autostart 보존 검사) |
| `window::set_overlay_position` / `persist_overlay_position` | lib.rs:121·138, commands.rs:286 | set_overlay_position | I1~I4 |
| `apply_autostart`(bridge 비공개) | commands.rs:159·317 | set_settings, set_autostart | 없음(수동 M-08) |
| `assets::import` / `remove` | commands.rs:216·234 | import_asset, remove_asset | assets tests, slot.rs K4·K5, pen_part_tests |
| tauri.conf.json `overlay.skipTaskbar`, capabilities `allow-start-dragging`, `autostart:default` | — | — | — |

## 6. 문서와 코드 대조 (doc/200_설계/core/*.md)

| 문서 위치 | 문서 | 코드 | 비고 |
|---|---|---|---|
| window.md:32-38 | `overlay_position`·`set_overlay_position`·`set_overlay_visible`·`apply_overlay_settings`·`show_settings_window`·`screen_bounds`가 `Result<_, WindowError>` | `Result<_, BridgeError>`(window/mod.rs:130·135·140·152·156·166) | 코드 주석 20-27에 임시 조치로 명시돼 있다. 시그니처 불일치(MEDIUM, CORE-003과 같은 뿌리) |
| window.md:389 K4 | 테스트 항목에 `slam` 필드 | `Settings`에 `slam` 없음(CR-019) | 낡은 문구 |
| assets.md:8·26·137·315·655·691·707 | 필수 4장(kb_up, kb_down_0+, idle, rest) | core 코드 무관, 문서주석 mod.rs:21 같음 | 확정사항 §6:86으로 대체됨. 갱신 대상 |
| settings.md:27 ST-R-06 | 자동 실행 = `autostart`(기존) | plugin-autostart | 작업 스케줄러 방식 반영 없음 |
| settings.md:178·403·425·473 | `version` 없음, 확인 필요 | 같음 | 일치(미해결 항목) |
| CLAUDE.md §1·스킬 §6 | 저장 위치 `%APPDATA%\kuro_keyviewer\` | 실제 `app_data_dir()` = identifier 기준 `%APPDATA%\com.kuro.keyviewer\`(tauri.conf.json:5, settings/mod.rs:3, lib.rs:24) | 상위 문서 표기 불일치(확인 필요) |
| 스킬 §6 | 파일명 `state_idle.png`, `mouse_base.png` 등 | 실제 `idle.png`, `rest.png`, `kb_up.png`(slot.rs:100-131 `file_key` + ".png") | 스킬 문서가 낡음. 코드와 설계 assets.md는 서로 일치 |
| 스킬 §7 | 마우스 파츠 ≤256 | 코드는 ≤900×700 + 셋이 같은 크기(mod.rs:4-5, 테스트 416-418) | 2026-09-23 확정사항 재정의를 따른 것. 스킬 문서가 낡음 |

## 7. 확인 필요

1. 자동 실행을 작업 스케줄러로 바꿀 때 구현 수단: `schtasks.exe` 프로세스 호출(unsafe·feature 불필요) 또는 COM `ITaskService`(`Win32_System_TaskScheduler`·`Com` feature 추가 + unsafe가 hook/ 밖에 필요해 격리 규칙과 충돌).
2. 관리자 권한 부여 방식: exe 매니페스트를 `requireAdministrator`로 바꿀지(build.rs `WindowsAttributes`, 매번 UAC), 설정 토글 시에만 승격 프로세스로 등록할지. 현재 build.rs에는 설정이 없다.
3. 단일 인스턴스 부재: 작업 스케줄러 자동 실행과 사용자 실행이 겹치면 인스턴스가 2개 뜨고 훅도 이중이 된다.
4. 위치 잠금 구현: 클릭 통과(core `set_ignore_cursor_events`)만으로 드래그까지 막히는지, 아니면 ui `data-tauri-drag-region` 제거도 필요한지. 잠금 상태에서 트레이로 풀 수 있어야 하는지.
5. 「기본값」 버튼의 의미: 슬롯 비우기(`remove`)인지, 번들 기본 이미지 복원인지. 후자는 core 기반이 없다.
6. `language`를 settings.json에 저장할지(설정 창만 쓰는 값이라도 재시작 후 유지하려면 필드가 필요하다).
7. 필수 판정의 ui 쪽 위치는 이번 grep에서 찾지 못했다. ui 조사가 필요하다.
