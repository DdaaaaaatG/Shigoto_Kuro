# bridge 감사 — 설정 창 개편(R-set-v2) 대비 현황 조사 (2026-09-24 18:25)

> 읽기 전용 조사. 근거 = 문서·소스·grep 결과만. 설계 대안은 쓰지 않는다.

## 0. 요약 (결론 먼저)

| 항목 | 결론 |
|---|---|
| command | 13개. 계약 §5·Rust `lib.rs:159-172`·TS `commands.ts:32-61` 이름 13/13 일치. 비-command 래퍼 `pickPngFile` 1개(dialog 플러그인) |
| event | 6개. 계약 §4·`events.rs:15-21`·`events.ts:18-24` 6/6 일치. 모두 `app.emit` 브로드캐스트 |
| R-set-v2 지원 | 이미지 등록(`import_asset`, 경로 문자열)·삭제(`remove_asset`)·목록(`get_asset_manifest`)·설정 전체 교체(`set_settings`)·자동 실행(`set_autostart`)·오버레이 이동(`set_overlay_position`) **있음**. **없음**: 위치 잠금(클릭 통과), 작업표시줄 표시, 언어 설정 필드, 「기본값」 이미지 복원, 전용 위치 초기화 command |
| 가장 중요한 기존 결함 | ① 에러 코드 표기 불일치(계약 `UPPER_SNAKE` ↔ 구현 `영역.사유`) — 계약 스스로 「확인 필요」로 적어 둠 ② capabilities 실물 ↔ 계약 §7 불일치 ③ 자동 실행 구현 = `tauri-plugin-autostart`, 확정사항 §6은 「작업 스케줄러(관리자 권한)」 |
| 위반 건수 | CRITICAL 0 · HIGH 5 · MEDIUM 6 · LOW 4 (런타임 깨짐 수준의 계약↔코드 불일치는 발견 못함) |

## 1. 현황

- 계약 버전: `contract.md:3` "v0.13 (초안 — 소스 미적용. v0.11까지 구현 완료 2026-09-24)". 단 TS `types.ts:2`·Rust `types.rs:1`은 이미 v0.13(펜 슬롯·`penPos`) 반영.
- command 13 · event 6 · 계약 타입: AssetSlot / AssetEntry / AssetManifest / CanvasSize / Settings / OverlaySettings / MouseSettings / Point / ScreenBounds / BridgeError / KeyboardInputEvent / MouseMoveEvent / MouseButtonEvent / HandAnchorEvent / SpecialKey.
- 구현: Rust `src-tauri/src/bridge/{commands,events,types,mod}.rs` 있음, TS `src/bridge/{commands,events,types,index}.ts` + `__tests__/{commands,events}.test.ts` 있음.

## 2. 셋 대조표

### 2.1 command (질문 1)

| command | 인자 | 반환 | 계약 에러(§5) | Rust 실제 code 값 | core 호출 | TS 래퍼 |
|---|---|---|---|---|---|---|
| `get_settings` | 없음 | `Settings` | `IO_ERROR` | `state.poisoned`만(메모리 복제, 파일 안 읽음) `commands.rs:124-126` | 없음(`state.settings` 복제) | `getSettings` `commands.ts:32` |
| `set_settings` | `settings: Settings` | `Settings` | `SETTINGS_INVALID`, `IO_ERROR` | `settings.invalid/io`, `window.not_found`, `autostart.error`, `state.poisoned` `commands.rs:132` | `Settings::validate`, `window::keep_overlay_position`, `settings::save`, `window::apply_overlay_settings`, `apply_autostart`, `window::resize_overlay`, `assets::compute_hand_anchor` `commands.rs:140-190` | `setSettings` `commands.ts:33` |
| `get_asset_manifest` | 없음 | `AssetManifest` | `IO_ERROR` | `asset.manifest`/`asset.io` | `assets::load_manifest` `commands.rs:199-201` | `getAssetManifest` `commands.ts:36` |
| `import_asset` | `slot: AssetSlot`, `path: string` | `AssetManifest` | `ASSET_INVALID_FORMAT`, `ASSET_TOO_LARGE`, `ASSET_CANVAS_MISMATCH`, `ASSET_SLOT_INVALID`, `IO_ERROR` | `asset.not_png/bad_header/not_rgba/too_large/too_many_bytes/canvas_mismatch/io` `assets/mod.rs:145-156` | `assets::import(assets_dir, slot, &PathBuf)` `commands.rs:216` | `importAsset` `commands.ts:37-38` |
| `remove_asset` | `slot: AssetSlot` | `AssetManifest` | `ASSET_SLOT_INVALID`, `IO_ERROR` | `asset.not_found`, `asset.io` | `assets::remove` `commands.rs:234` | `removeAsset` `commands.ts:39` |
| `get_hand_anchor` | 없음 | `Point \| null` | `STATE_POISONED` | `state.poisoned` | 캐시 읽기 `commands.rs:245-249` | `getHandAnchor` `commands.ts:45` |
| `get_screen_bounds` | 없음 | `ScreenBounds` | `WINDOW_ERROR` | `window.no_monitor` 등 | `window::screen_bounds` `commands.rs:255-257` | `getScreenBounds` `commands.ts:48` (ui 사용처 0, 계약 「제거 후보」 `contract.md:512`) |
| `get_monitors` | 없음 | `ScreenBounds[]` | `WINDOW_ERROR` | `tauri.error`, `window.no_monitor` | `window::list_monitors` `commands.rs:264-270` | `getMonitors` `commands.ts:54` |
| `get_overlay_position` | 없음 | `Position` | `WINDOW_ERROR` | `window.*` | `window::overlay_position` `commands.rs:274-276` | `getOverlayPosition` → `Point` `commands.ts:55` |
| `set_overlay_position` | `x, y` | `void` | `WINDOW_ERROR`, `IO_ERROR` | `window.*`, `state.poisoned`, `settings.io` | `window::set_overlay_position` + `settings::save` + emit `commands.rs:280-293` | `setOverlayPosition` `commands.ts:56-57` |
| `set_overlay_visible` | `visible` | `void` | `WINDOW_ERROR`, `IO_ERROR` | 같음 | `window::set_overlay_visible` + save + emit `commands.rs:297-308` | `setOverlayVisible` `commands.ts:58-59` |
| `set_autostart` | `enabled` | `boolean`(실제 상태) | `AUTOSTART_ERROR`, `IO_ERROR` | `autostart.error`, `settings.io`, `state.poisoned` | `apply_autostart`(= `tauri_plugin_autostart` `app.autolaunch()`) `commands.rs:312-343` | `setAutostart` `commands.ts:60` |
| `open_settings_window` | 없음 | `void` | `WINDOW_ERROR` | `window.*` | `window::show_settings_window` `commands.rs:327-329` | `openSettingsWindow` `commands.ts:61` |
| (비-command) | — | `string \| null` | — | — | `@tauri-apps/plugin-dialog` `open()` PNG 필터 | `pickPngFile` `commands.ts:64-72` |

R-set-v2 관련 존재 여부:
- 이미지 등록: `import_asset(slot, path: string)` — **파일 경로 문자열**을 받아 Rust가 읽고 `assets/`로 복사(`commands.rs:210-221`). 바이트 전송 command 없음.
- 이미지 삭제(슬롯 비우기): `remove_asset(slot)` 있음. **「기본값」(내장 기본 이미지로 복원) command는 없음.**
- 에셋 목록: `get_asset_manifest` 있음.
- 설정 쓰기: `set_settings`는 **전체 교체**(`Settings` 전체 인자, 부분 갱신 아님). 예외: `overlay.x/y`는 무시하고 core 현재값 유지(`commands.rs:143-148`, `contract.md:507`). 부분 갱신형은 `set_overlay_position`·`set_overlay_visible`·`set_autostart`(각자 한 필드 + 저장 + `settings://changed`).
- 오버레이 위치 초기화: **전용 command 없음.** `set_overlay_position(x,y)` 있음. 기본 위치 값 = `Settings::default().overlay` (Rust `settings/mod.rs:119` x:100, TS `types.ts:221` `{x:100,y:100}`), 화면 밖 보정 시 core가 쓰는 값(`window/placement.rs:91-92`).
- 자동 실행 토글: `set_autostart` 있음. `set_settings`도 `autostart`를 반영(`commands.rs:159`).
- 위치 잠금(클릭 통과·드래그 금지)·작업표시줄 표시·언어: **command·Settings 필드 모두 없음**(`types.ts:116-125`, `settings/mod.rs:86-94`).

### 2.2 event (질문 2)

| event | Rust 상수 | TS 상수 | 페이로드 | 발신 지점 | 빈도 | TS 구독 래퍼 |
|---|---|---|---|---|---|---|
| `input://keyboard` | `events.rs:15` | `events.ts:18` | `{pressed, heldCount, special, repeat, ts}` `events.rs:25-36` | hook → `emit_input` `events.rs:68-` | 즉시 | `onKeyboard` `events.ts:34` |
| `input://mouse-move` | `events.rs:16` | `events.ts:19` | `{x, y, ts}` (i32, u64) `events.rs:40-44` | hook | ≤60Hz (`hook/mod.rs:80` `MOUSE_MOVE_MIN_INTERVAL_MS = 16`, `hook/mod.rs:288`) | `onMouseMove` `events.ts:35` |
| `input://mouse-button` | `events.rs:17` | `events.ts:20` | `{button:'left'\|'right', pressed, ts}` `events.rs:48-52` | hook | 즉시 | `onMouseButton` `events.ts:36` |
| `settings://changed` | `events.rs:18` | `events.ts:21` | `Settings` 전체 `events.rs:104-106` | `set_settings` `commands.rs:186` · `set_overlay_position` `:291` · `set_overlay_visible` `:306` · `set_autostart` `:321` · 트레이 표시 토글 `tray/mod.rs:76` · 드래그 저장 콜백 `lib.rs:145` | 변경 시 | `onSettingsChanged` `events.ts:37` |
| `assets://changed` | `events.rs:19` | `events.ts:22` | `AssetManifest` 전체 `events.rs:108-110` | `import_asset` `commands.rs:218` · `remove_asset` `:236` | 변경 시 | `onAssetsChanged` `events.ts:38` |
| `assets://hand-anchor-changed` | `events.rs:21` | `events.ts:24` | `{anchor: Point\|null}` `events.rs:57-59` | `refresh_hand_anchor` `commands.rs:81` | 캐시 값 바뀔 때만 | `onHandAnchorChanged` `events.ts:43` |

- 설정·에셋 변경을 오버레이에 알리는 이벤트는 **이미 있다**: `settings://changed`(페이로드 = 전체 Settings), `assets://changed`(페이로드 = 전체 AssetManifest). 둘 다 `app.emit` = 모든 창 브로드캐스트. 오버레이 `overlay/index.tsx:173-174`, 설정 창 `settings/index.tsx:41-42`가 구독 중.

### 2.3 타입·Settings (질문 7)

| 계약 항목 | contract.md | Rust | TS | 판정 |
|---|---|---|---|---|
| `Settings.scale` | §3.3 `:174` | `scale: f64` `settings/mod.rs:88` | `scale: number` `types.ts:118` | 일치 |
| `Settings.idleSeconds` | `:175` | `idle_seconds: u32` `:90` | `idleSeconds: number` `:120` | 일치 |
| `Settings.overlay {x,y,visible}` | `:177` | `OverlaySettings{x:i32,y:i32,visible:bool}` `:32-35` | `OverlaySettings` `:80-84` | 일치 |
| `Settings.mouse: MouseSettings\|null` | `:178-184` | `Option<MouseSettings>` `:93` | `MouseSettings \| null` `:123` | 일치 |
| `MouseSettings.shoulder/area/partPos/hand/penPos` | `:179-183` | `:42-61` (`area`·`part_pos` serde default, `hand`·`pen_pos` `#[serde(default)]`) | `:88-113` | 일치 |
| `Settings.autostart` | `:185` | `autostart: bool` `:94` | `autostart: boolean` `:124` | 일치 |
| `Settings` struct 수준 serde | — | `#[serde(rename_all="camelCase", default)]` `:85` | — | 누락 키는 기본값으로 채움 |
| 기본값 | §3.3 | `impl Default for Settings` `:113-` | `DEFAULT_SETTINGS` `types.ts:218-224` (scale 1, idle 300, overlay 100/100/true, mouse 기본, autostart false) | 일치(확인한 범위) |
| `AssetEntry` | §3.2 `:141-148` | `assets/mod.rs:79` 등 | `types.ts:58-66` | 일치 |
| `AssetManifest.canvas` 타입명 | §3.2 Rust `Size` `:162-165` | `CanvasSize` (`types.rs:135` 재수출) | `CanvasSize` `types.ts:53` | 문서만 뒤처짐 |
| `Position`(창 위치) | §3.4 `:299` | `window::Point`(i32) `types.rs:139` | 타입 없음, `getOverlayPosition`이 캔버스용 `Point` 반환 `commands.ts:55` | 문서↔TS 불일치 |
| `BridgeError` | §3.5 `:318-324` `Deserialize` | `Serialize`+`thiserror`, camelCase `error.rs:10-16` | `{code:string; message:string}` `types.ts:127-130` | 형태 일치 |

## 3. 위반 목록

[BRG-001][HIGH] 에러 코드 표기가 계약과 구현이 다르다
  위치: `contract.md:585-595`(계약 `ASSET_TOO_LARGE` 등) ↔ `error.rs:4`, `assets/mod.rs:145-156`, `settings/mod.rs:142-144`, `window/mod.rs:70-75`, `error.rs:29,35,54`
  근거: 계약 "`ASSET_INVALID_FORMAT` | PNG 아님…"; 구현 `Self::NotPng => "asset.not_png"`. 구현 추가 코드 `tauri.error`·`io.error`·`autostart.error`·`window.thread`·`asset.decode`·`settings.format`, TS 정규화 코드 `unknown`(`commands.ts:18-20`)은 계약 §6 표에 없음
  기준: 스킬 §4(에러 코드는 §6 표가 정본), §2 명명. 계약 자체가 `contract.md:609`에 「현황 불일치(확인 필요)」로 기록
  조치 방향: 정본 표기 결정 필요(§5 확인 필요 1)

[BRG-002][HIGH] capabilities 실물과 계약 §7 불일치
  위치: `src-tauri/capabilities/default.json:6-11` ↔ `contract.md:615-622`
  근거: 실물 = `core:default`, `core:window:allow-start-dragging`, `dialog:allow-open`, `autostart:default`. 계약 = `core:event:default`, `core:window:allow-set-position/allow-show/allow-hide/allow-set-focus` 포함, `allow-start-dragging` 없음
  기준: 스킬 §9(현재 허용 목록은 §7이 정본)
  조치 방향: 문서·실물 중 어느 쪽이 맞는지 정리 필요. 두 창이 한 capability를 공유(`"windows": ["overlay","settings"]`)해 창 라벨별 분리 없음

[BRG-003][HIGH] 계약 머리말 버전 상태가 구현보다 뒤처짐
  위치: `contract.md:3` "v0.13 (초안 — 소스 미적용…)" ↔ `types.ts:2` "(v0.13)", `types.rs:1` "(v0.13 …)", `assets/pen_part_tests.rs:52`
  기준: 스킬 §8(계약→Rust→TS 순서, 문서만 뒤처짐 = HIGH)

[BRG-004][HIGH] 경계 위반 — `src/bridge/` 밖 `@tauri-apps/api` import
  위치: `src/main.tsx:11` `import { getCurrentWindow } from '@tauri-apps/api/window'`
  근거: `main.tsx:3` 주석 "화면 코드에서 @tauri-apps/api 를 직접 쓰는 곳은 이 파일과 src/bridge 뿐이다" — 계약·스킬에 이 예외 규정 없음
  기준: 스킬 §11

[BRG-005][HIGH] 자동 실행 방식이 확정사항과 다르다(계약에 방식 기술 없음)
  위치: `lib.rs:59-62` `tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None)`, `commands.rs:334-343` ↔ `doc/000_프로젝트_확정사항.md:83` "방식 = 작업 스케줄러(관리자 권한, 🔒 2026-09-24)"
  기준: 확정사항이 제품 정본(스킬 머리말). 플러그인의 Windows 등록 방식(레지스트리 Run 키로 알려짐)은 이 조사에서 소스로 확인하지 않음 — §5 확인 필요 2

[BRG-006][MEDIUM] 계약 §5 에러 열이 실제 발생 코드보다 좁다
  위치: `contract.md:506`(`get_settings` → `IO_ERROR`, 실제는 파일을 읽지 않고 `state.poisoned`만 `commands.rs:124-126`), `contract.md:507`(`set_settings` 열에 `WINDOW_ERROR`·`AUTOSTART_ERROR`·`STATE_POISONED` 없음 — `contract.md:581`에 확인 필요로 기록), `set_overlay_*`·`set_autostart`의 `state.poisoned`
  기준: 스킬 §4. 또 `get_settings` 설명 "설정 JSON 로드"(`contract.md:506`)와 실제(메모리 복제) 불일치

[BRG-007][MEDIUM] 핸들러 30줄 초과
  위치: `set_settings` `commands.rs:135-193`(본문 약 58줄)
  기준: 스킬 §1(얇은 핸들러)

[BRG-008][MEDIUM] 핸들러 안 에러 문자열 직접 생성
  위치: `commands.rs:27-31`, `:38-42` `BridgeError::new("state.poisoned", …)`, `tray/mod.rs:65` `BridgeError::new("window.not_found", …)`
  기준: 스킬 §4(`From<CoreError>` 한 곳 변환)

[BRG-009][MEDIUM] `MouseButtonPayload.button`이 enum이 아닌 `&'static str`
  위치: `events.rs:49`, `:61-66`
  기준: 스킬 §3(열거 = Rust enum + rename_all). 직렬화 결과는 `'left'|'right'`로 같아 런타임 영향 없음

[BRG-010][MEDIUM] 요구ID 미정 command·event 다수
  위치: `contract.md:492-495`, `:506`, `:508`, `:512`, `:514-518` "미정"; Rust 주석 `commands.rs:122,197,253,272,278,295,310,325` "R-미정"
  기준: 스킬 §12. R-set-v2 확정 시 역추적 대상(`set_autostart`·`set_overlay_position`·`import_asset`·`remove_asset` 등)

[BRG-011][MEDIUM] `get_screen_bounds` ui 사용처 0
  위치: 래퍼 `commands.ts:48`, grep 결과 `src/` 화면 코드 호출 없음(`overlay/design.md:140` "호출 삭제(CR-017)")
  기준: 스킬 §12. 계약이 이미 「제거 후보」로 표기 `contract.md:512`

[BRG-012][LOW] TS 창 위치 타입 `Position` 부재 — `getOverlayPosition`이 캔버스 좌표용 `Point` 반환
  위치: `commands.ts:55`, `types.ts:75-78` ↔ `contract.md:299`, `:171`("창 위치(§3.4 Position, 정수 물리 px)와 모양만 같고 뜻이 다르다")

[BRG-013][LOW] 계약 §3.2 Rust 타입명 `Size` ↔ 실물 `CanvasSize`
  위치: `contract.md:162-165` ↔ `types.rs:135`

[BRG-014][LOW] TS 잔존 상수·주석
  위치: `types.ts:194` `MOUSE_PART_MAX_SIZE = 256`(계약 v0.8에서 256 규칙 삭제 `contract.md:588`); `types.ts:104` "이것도 null이면 패드 중심"(v0.9 이후 이동 영역 중심 `contract.md:223`)

[BRG-015][LOW] 테스트 파일의 이벤트 이름 리터럴 재기입
  위치: `src/overlay/test/OverlayApp*.test.tsx`(예 `OverlayApp.test.tsx:61-66`), `src/settings/test/SettingsApp.test.tsx:46-51` — `bridge/events` mock에서 `EVENTS` 객체를 문자열로 다시 적음
  기준: 스킬 §8(상수 한 파일씩). 테스트 mock이라 LOW

## 4. 확장 지점 — R-set-v2 요구 대비 (판정만, 설계 아님)

| R-set-v2 항목(확정사항 `:84-87`) | 유사 command/event | 판정 | 근거 |
|---|---|---|---|
| 이미지 변경(등록·교체) | `import_asset(slot, path)` + `pickPngFile` | 기존 사용 | `commands.rs:210`, `commands.ts:37,64`. 설정 창은 아직 미사용(`settings/index.tsx:70-80`은 목록 텍스트만, `settings/requirements.md:83` "화면 미사용") |
| 이미지 「기본값」 | `remove_asset`(비우기만) | 의미 확인 필요 — 「빈 슬롯」이면 기존 사용, 「내장 기본 이미지 복원」이면 신규 | 내장 기본 이미지 복사 command·자원 없음 |
| 필수 = `kb_up`+`kb_down_0`+`mouse_base`, idle·rest 선택 강등 | 없음(Rust가 필수 여부를 검증하지 않음) | 계약 문서 변경(§3.1 필수 열) | `contract.md:124` idle/rest "필수"; Rust는 주석만 `assets/mod.rs:21` |
| 자동 실행 토글 | `set_autostart` | 기존 사용(방식 변경 시 core 변경) | BRG-005 |
| 위치 초기화 | `set_overlay_position(x,y)` | 확장 후보 또는 신규(판단 필요) | 기본값 (100,100) `settings/mod.rs:119`, `types.ts:221`, core `resolve_overlay_position` `placement.rs:91` |
| 위치 잠금(클릭 통과 + 드래그 금지) | 없음 | 신규(Settings 필드 + 창 제어) | `Settings`에 필드 없음; capabilities에 `set-ignore-cursor-events` 없음; 드래그는 `data-tauri-drag-region` + `allow-start-dragging`(`default.json:8`, `overlay/design.md:128`) |
| 작업표시줄 표시 | 없음 | 신규(Settings 필드 + 창 제어) | `tauri.conf.json` overlay `"skipTaskbar": true`(conf 38줄 부근), capabilities에 `set-skip-taskbar` 없음 |
| 언어(ko/ja/en) | 없음 | 확장(Settings 선택 필드) 또는 ui 로컬 — 판단 필요 | `Settings` 필드 없음. 설정 창 문구는 `settings/labels`(ui) |
| 오버레이 반영 이벤트 | `settings://changed`, `assets://changed` | 기존 사용 | 전체 페이로드·브로드캐스트 `events.rs:104-110` |

## 5. 확인 필요 (사용자 판단)

1. 에러 코드 정본: 계약 `UPPER_SNAKE`(8종) vs 구현 `영역.사유`(15종+). 새 command 추가 전에 정해야 표기가 한쪽으로 모인다(`contract.md:609`).
2. 자동 실행: 확정사항 「작업 스케줄러(관리자 권한)」와 현 `tauri-plugin-autostart` 구현의 차이 — 방식 변경이면 core 변경 + capabilities `autostart:default`·npm `@tauri-apps/plugin-autostart`(`package.json:98`, src 사용처 0) 존폐가 따라온다.
3. capabilities 정본: `default.json`(4개) vs 계약 §7(6행). 위치 잠금·작업표시줄을 Rust command로 할지 JS 창 권한으로 할지에 따라 §7이 바뀐다.
4. 「기본값」 버튼의 의미(빈 슬롯 vs 내장 이미지 복원).
5. `main.tsx:11`의 `@tauri-apps/api/window` 직접 import를 예외로 인정할지.
6. 앱 데이터 경로: `lib.rs:34` `app_data_dir()` + asset scope `$APPDATA/assets/**`(`tauri.conf.json` security) — identifier `com.kuro.keyviewer` 기준 폴더이며 CLAUDE.md의 `%APPDATA%\kuro_keyviewer\` 표기와 이름이 다를 수 있음(실행 확인 안 함).

### 부록 — 이미지 표시·파일 선택 방식 (질문 4·5)
- 파일 선택: `pickPngFile()` → `@tauri-apps/plugin-dialog` `open({filters:[png]})` → 경로 문자열 → `importAsset(slot, path)` (`commands.ts:64-72`, `:37`). `<input type=file>`·FileReader·바이트 전송 없음(grep 0건).
- 의존성: npm `@tauri-apps/plugin-dialog ^2.2.0`, `@tauri-apps/plugin-autostart ^2.2.0`(`package.json:98-99`); Cargo `tauri-plugin-dialog = "2"`, `tauri-plugin-autostart = "2"`(`Cargo.toml`). **plugin-fs 없음**(npm·Cargo 모두).
- 표시: `AssetEntry.url` = `http://asset.localhost/` + encodeURIComponent(경로) — Rust가 생성(`assets/mod.rs:351-354`), ui는 `<img src={entry.url}>` 그대로(`LayerStack.tsx:69`, `BackgroundLayer.tsx:17`, `MouseArm.tsx:54`, `PenHand.tsx:61`, `MousePartsTab.tsx:225,237,244`). `convertFileSrc`·base64·바이트 command 없음.
- `tauri.conf.json`: overlay `transparent:true, decorations:false, alwaysOnTop:true, skipTaskbar:true, resizable:false, shadow:false, visible:true, 450×350`; settings `900×640, min 720×480, visible:false, center:true`(skipTaskbar 미지정). CSP `img-src 'self' asset: http://asset.localhost data:`; `assetProtocol.enable:true, scope:["$APPDATA/assets/**"]`; `withGlobalTauri:false`.
- capabilities: 한 파일, 두 창 공유. `core:window:allow-set-ignore-cursor-events`·`allow-set-skip-taskbar` 없음, `allow-start-dragging` 있음.
