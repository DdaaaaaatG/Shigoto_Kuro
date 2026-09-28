# bridge 감사(현황 조사) — 뽀모도로 타이머 확장 지점 (2026-09-26 15:14)

범위: `doc/200_설계/bridge/contract.md`(v0.20) · `src/bridge/{types,commands,events,index}.ts` · `src-tauri/src/bridge/{mod,types,commands,events}.rs` · `src-tauri/capabilities/*.json` · 관련 `src-tauri/src/lib.rs`·`tray/mod.rs`
목적: 확장 지점 파악(읽기 전용). 설계안은 쓰지 않는다.

## 0. 요약 (결론 먼저)

| 항목 | 결론 |
|---|---|
| 확장 판정 | **유사 command·event 없음 → 신규.** 타이머는 설정·에셋·창 어느 자원에도 속하지 않는 새 자원이다(스킬 §5 「새 자원 → 신규 타입 + 신규 command, 도메인 새로 정함」). 이벤트 도메인은 `input`·`settings`·`assets` 3개만 쓰이고 있고(`window://` 이벤트는 0개), 새 도메인은 요구ID 역추적이 전제(스킬 §2). |
| 두 창 공유의 기존 수단 | **Rust가 상태를 쥐고 `app.emit`으로 전 창 브로드캐스트** 하나뿐. `emit_to`·창 간 JS 이벤트는 0건(`src-tauri/src/bridge/events.rs:76-114`). 설정 창 → 오버레이 경로는 모두 "command → core 상태 변경 → 전 창 emit → 각 창 `useBridgeEvent`" |
| 주기적(tick) 이벤트 | **선례 없음.** §4의 이벤트는 입력(즉시·≤60Hz) 또는 변경 시 1회뿐. 스킬 §7 빈도 표에 주기 이벤트 규칙이 없다 → 새 빈도 규칙 결정 필요 |
| capabilities | 앱 command는 **권한 파일 변경 불필요**(`build.rs`에 app manifest 없음 → `generate_handler!` 등록만으로 허용). 이벤트 구독은 두 창 모두 `core:default`로 가능. 단 **`lib.rs` 등록은 bridge-implementer가 못 쓴다**(core/메인 세션 몫 — contract.md:8) |
| 위반 | CRITICAL 0 · HIGH 2 · MEDIUM 4 (타이머와 무관한 기존 결함, 아래 §3) |
| 가장 중요한 결함 | ① 계약 머리말·§3.1·§3.3이 "core 미반영"이라 적었으나 Rust는 이미 v0.20 값 ② §8 변경 이력에 v0.20 행 없음, §9 추적표는 v0.17에서 멈춤 ③ `set_autostart` emit 조건이 계약(무조건)과 코드(값 변경 시만) 불일치 |

## 1. 현황

- 계약 버전 **v0.20**(contract.md:3). 절 번호 §1~§9.
- command **16개** — 계약 §5 표(contract.md:664-681) 16행 = Rust `#[tauri::command]` 16개(commands.rs:136-417) = `generate_handler!` 16개(lib.rs:144-161) = TS 래퍼 16개(commands.ts:42-95). 누락·잉여 없음.
- event **6개** — 계약 §4(contract.md:646-653) = Rust 상수 6(events.rs:15-21) = TS `EVENTS` 6(events.ts:17-25).
- TS 전용 래퍼 3개(`pickPngFile`·`pickFolder`·`setSettingsWindowTitle`, commands.ts:101-145, 계약 §5.4).
- 구현 상태: Rust·TS 모두 존재.

## 2. 셋 대조표 (질문 1 — command·event 전체 목록)

### 2.1 command

| command | 인자 | 반환 | 발생 code(§6.2 정본, contract.md:870-884) | Rust | TS | 판정 |
|---|---|---|---|---|---|---|
| `get_settings` | 없음 | `Settings` | `state.poisoned` | commands.rs:137 | commands.ts:42 | 일치 |
| `set_settings` | `settings: Settings` | `Settings` | `settings.invalid`, `settings.io`, `window.not_found`, `tauri.error`, `state.poisoned` | commands.rs:150 | commands.ts:43 | 일치 |
| `get_asset_manifest` | 없음 | `AssetManifest` | `asset.io`, `asset.manifest` | commands.rs:214 | commands.ts:46 | 일치 |
| `import_asset` | `slot`, `path` | `AssetManifest` | `asset.not_png`·`bad_header`·`not_rgba`·`too_large`·`too_many_bytes`·`canvas_mismatch`·`io`·`manifest`, `tauri.error`, `state.poisoned` | commands.rs:226 | commands.ts:47 | 일치 |
| `remove_asset` | `slot` | `AssetManifest` | `asset.not_found`·`io`·`manifest`, `tauri.error`, `state.poisoned` | commands.rs:243 | commands.ts:49 | 일치 |
| `restore_default_asset` | `slot` | `AssetManifest` | `asset.no_default` + import와 같음 | commands.rs:260 | commands.ts:55 | 일치 |
| `export_default_assets` | `dir`, `overwrite` | `ExportReport` | `asset.export_dir` | commands.rs:283 | commands.ts:63 | 일치 |
| `get_hand_anchor` | 없음 | `Point \| null` | `state.poisoned` | commands.rs:299 | commands.ts:70 | 일치 |
| `get_screen_bounds` | 없음 | `ScreenBounds` | `window.no_monitor`, `tauri.error` | commands.rs:309 | commands.ts:73 | 일치 |
| `get_monitors` | 없음 | `ScreenBounds[]` | 같음 | commands.rs:318 | commands.ts:79 | 일치 |
| `get_overlay_position` | 없음 | `Position` | `window.not_found`, `tauri.error` | commands.rs:328 | commands.ts:80 | 일치 |
| `set_overlay_position` | `x`, `y` | `void` | `window.not_found`, `tauri.error`, `state.poisoned`, `settings.io` | commands.rs:334 | commands.ts:81 | 일치 |
| `set_overlay_visible` | `visible` | `void` | 같음 | commands.rs:351 | commands.ts:83 | 일치 |
| `reset_overlay_position` | 없음 | `Position` | 같음 | commands.rs:371 | commands.ts:89 | 일치 |
| `set_autostart` (async) | `enabled` | `boolean` | `autostart.cancelled`·`autostart.error`, `io.error`, `tauri.error`, `state.poisoned`, `settings.io` | commands.rs:389 | commands.ts:94 | 시그니처 일치 · emit 조건 불일치(BRG-003) |
| `open_settings_window` | 없음 | `void` | `window.not_found`, `tauri.error` | commands.rs:416 | commands.ts:95 | 일치 |

TS는 모든 reject를 `toBridgeError`로 정규화한다(commands.ts:26-39). 형태가 없는 실패는 `code: 'unknown'`.

### 2.2 event

| 이름 | Rust 상수 | TS 상수·구독 래퍼 | 페이로드 | 발신 시점 | 수신 창 | 빈도 |
|---|---|---|---|---|---|---|
| `input://keyboard` | `EVENT_KEYBOARD` events.rs:15 | `EVENTS.keyboard` events.ts:18 · `onKeyboard` :34 | `KeyboardInputEvent {pressed, heldCount, special, repeat, ts}` (events.rs:25-36 ↔ types.ts:210-230) | 훅 → `input-forwarder` 스레드(lib.rs:126-134) | 전체(`app.emit`) | 즉시, 자동 반복 최대 약 30/초 |
| `input://mouse-move` | `EVENT_MOUSE_MOVE` :16 | `mouseMove` :19 · `onMouseMove` :35 | `{x, y, ts}` | 같음 | 전체 | ≤60Hz(hook 스로틀 — hook/mod.rs:83·289) |
| `input://mouse-button` | `EVENT_MOUSE_BUTTON` :17 | `mouseButton` :20 · `onMouseButton` :36 | `{button, pressed, ts}` | 같음 | 전체 | 즉시 |
| `settings://changed` | `EVENT_SETTINGS_CHANGED` :18 | `settingsChanged` :21 · `onSettingsChanged` :37 | `Settings` 전체 | `set_settings`(commands.rs:201) · `set_overlay_position`(:345) · `set_overlay_visible`(:360) · `reset_overlay_position`(:376) · `set_autostart`(:409, 값 변경 시) · 드래그 저장(lib.rs:278) · 자동 실행 조회 보정(lib.rs:307) · 트레이 표시/숨김(tray/mod.rs:92) | 전체 | 변경 시 |
| `assets://changed` | `EVENT_ASSETS_CHANGED` :19 | `assetsChanged` :22 · `onAssetsChanged` :38 | `AssetManifest` 전체 | `after_asset_change`(commands.rs:128) — import/remove/restore 공용 | 전체 | 변경 시 |
| `assets://hand-anchor-changed` | `EVENT_HAND_ANCHOR_CHANGED` :21 | `handAnchorChanged` :24 · `onHandAnchorChanged` :43 | `{anchor: Point \| null}` | `refresh_hand_anchor`(commands.rs:79), 값이 달라질 때만 | 전체(소비자는 overlay) | 드묾 |

- 이름 상수 정의: **Rust `src-tauri/src/bridge/events.rs:15-21`, TS `src/bridge/events.ts:17-25`** 각 한 곳. 비테스트 소스에서 리터럴 재기입은 없다(주석만). 테스트 mock 재기입은 BRG-006.
- 구독 래퍼 형태: `Subscriber<T> = (cb) => Promise<UnlistenFn>`(events.ts:27-32). 스킬 §11의 `() => void` 반환이 아니라 **Promise 반환**이다(기존 형태, 새 래퍼도 이 형태를 따르게 됨).
- `emit_to`·`emit_filter` 사용 0건(src-tauri/src 전체 grep). 모든 emit은 `app.emit`(전 창).

## 3. 위반 목록 (기존 결함 — 타이머와 무관)

[BRG-001][HIGH] 계약서가 "core 미반영"이라 적었으나 core는 이미 v0.20 값
  위치: contract.md:3, :174, :346 · 근거: 머리말 "**core 미반영** — `settings::default_mouse()`·`assets::defaults::DEFAULT_ASSETS`가 아직 옛 값", :346 "Rust `settings::default_mouse()`는 아직 v0.18~v0.19 값…". 실물: `src-tauri/src/settings/mod.rs:163` `shoulder: Point { x: 582.0, y: 484.0 }`, `:177` `pen_pos: Some(Point { x: 372.0, y: 476.0 })`, 테스트 `:404` `part_pos == (411, 464)`; `src-tauri/src/assets/defaults.rs:58` `pub static DEFAULT_ASSETS: [DefaultAsset; 6]`(hair 제외, :9-12 주석). · 기준: 스킬 §8(셋 대조) · 조치 방향: 계약의 상태 서술이 코드보다 뒤처짐.

[BRG-002][MEDIUM] 변경 이력·요구 추적표가 머리말 버전을 따라가지 못함
  위치: contract.md:942-964, :970 · 근거: 머리말은 v0.20(:3)인데 §8 표 마지막 행은 `| v0.19 | 2026-09-26 |`(:964), v0.20 행 없음. §9 서두 "v0.3~v0.17에서 만들거나 바꾼 항목만 싣는다"(:970) — v0.18·v0.19·v0.20 절 없음. · 기준: 스킬 §13 「변경 이력에는 버전·일자·변경·호환성 분류를 한 줄로」 · 조치 방향: 새 v0.21 행을 넣기 전에 v0.20 행 공백이 있음.

[BRG-003][HIGH] `set_autostart`의 `settings://changed` emit 조건 — 계약(성공 시) ↔ Rust(값이 바뀐 경우만)
  위치: commands.rs:385-387, :405-410 · 근거: 코드 주석 "settings://changed emit(값이 바뀐 경우만)", `if let Some(saved) = autostart::persist_autostart(...)? { events::emit_settings_changed(...) }`. 계약 §5.5 4단계 "`settings://changed` emit → `Ok(반환값)`"(contract.md:773), §5 표 "성공 → `autostart` 저장 + `settings://changed` emit"(:680), §4 "① `set_autostart` 성공"(:651). · 기준: 스킬 §8 · 조치 방향: 어느 쪽이 정본인지 문서와 코드가 다름(ui가 성공 후 이벤트를 기다리면 값 불변 시 오지 않음). 판단은 §5 확인 필요.

[BRG-004][MEDIUM] 얇은 핸들러 한도 초과 — `set_settings` 약 58줄
  위치: commands.rs:150-208 · 근거: 본문이 검증·병합·저장·창 속성·리사이즈·재병합·emit·재계산을 모두 포함. 계약 자체가 "(v0.14 구현 메모, BRG-007) `set_settings` 본문(현행 약 58줄)을 … 50줄 이하로"(contract.md:748)라고 미해결로 적음. · 기준: 스킬 §1(30줄), golden-principles §1(50줄) · 조치 방향: 기존 미해결 항목 재확인.

[BRG-005][MEDIUM] 핸들러 밖 `BridgeError` 직접 생성·emit 오류 무시
  위치: tray/mod.rs:73, :79-84, :92 · commands.rs:25-30, :36-41, :397-402 · 근거: `BridgeError::new("state.poisoned", …)` 직접 생성, tray `let _ = crate::bridge::events::emit_settings_changed(app, &snapshot);`(:92 — 실패가 로그도 없이 버려짐). 계약 §6 현황 메모 ③ "state.poisoned와 tray의 window.not_found는 핸들러가 BridgeError::new로 직접 만든다(BRG-008)"(contract.md:850)로 알려진 항목. · 기준: 스킬 §4 「From으로 한 곳에서 변환」 · 조치 방향: 기존 미해결 항목. tray의 emit 무시는 계약에 적혀 있지 않다.

[BRG-006][MEDIUM] 이벤트 이름 리터럴이 화면 테스트 mock에 재기입됨
  위치: src/overlay/test/OverlayApp.test.tsx:61-66, OverlayApp.hair.test.tsx:57-62, OverlayApp.jelly/lock/pen/penClick/penToggle/shiver/special.test.tsx(각 54~64행대), keyboardFallback.test.tsx:56-61, src/settings/test/SettingsApp.test.tsx:61-66 · 근거: `keyboard: 'input://keyboard', … handAnchorChanged: 'assets://hand-anchor-changed'` 6줄 블록 반복. · 기준: 스킬 §8 「문자열 리터럴이 다른 파일에 나타나면 결함」 · 조치 방향: 새 이벤트를 `EVENTS`에 추가하면 이 mock 블록들도 같이 맞춰야 하는 구조(테스트 한정 — 예외 여부는 §5).

(비위반 메모) `src/bridge/mod.rs`에 해당하는 `src-tauri/src/bridge/mod.rs:5` 주석이 "invoke 핸들러 14개", `types.rs:1`이 "v0.17" — 실물 16개·v0.20. 주석만 낡음.
(비위반 메모) `src/main.tsx:11` `@tauri-apps/api/window` import — 계약 §5.4에 알려진 예외로 명시(contract.md:752, BRG-004). 새로 보고하지 않는다.

## 4. 확장 지점 — 뽀모도로 타이머 (질문 1~7 상세)

### 4.1 판정표

| 새 요구 조각 | 유사 계약 | 판정 | 근거 |
|---|---|---|---|
| 설정 창 버튼으로 시작·일시정지·멈춤 | 없음(설정·에셋·창 command뿐) | **신규 command** | 스킬 §5 「새 자원 → 신규 타입 + 신규 command」. `set_settings`에 넣으면 매 호출이 settings.json 저장 + 전체 `Settings` emit(commands.rs:170, :201) — 스킬 §5 「한 command가 두 가지 일」 |
| 오버레이에 시간 표시 | 없음 | **신규 event + 신규 타입** | 기존 6개 이벤트 중 타이머 페이로드를 실을 곳 없음. 도메인 4종 밖(스킬 §2 「새 도메인은 요구에서 역추적될 때만」) |
| 두 창이 같은 값 | `settings://changed` 패턴(core 상태 + 전 창 브로드캐스트) | **패턴 재사용**(이벤트는 신규) | 모든 기존 공유 상태가 Rust `AppState`(lib.rs:46-51)에 있고 `app.emit`으로 두 창에 감. 스킬 §11 「래퍼 안에 상태 기계·타이머 금지」 |
| 창이 늦게 뜬 경우 현재값 | `get_settings`·`get_hand_anchor`의 「구독 먼저 → get 조회」 규칙(contract.md:651, events.ts:40-42) | **조회 command 신규 후보** | 스킬 §7 「페이로드 자기 완결」 + 기존 구독-후-조회 규칙 |
| 설정 저장 여부(작업 길이 등) | `Settings` 필드 확장 선례 多(v0.14 `language` 등) | 요구 확정에 따라 `Settings` **확장** 또는 해당 없음 | 필드 추가는 TS 필수 필드면 파괴(§8 v0.14·v0.15 선례) |

### 4.2 질문 2 — 설정 command

- `get_settings() -> Settings`: 메모리 복제, 파일 안 읽음(commands.rs:137-139, contract.md:666).
- `set_settings(settings: Settings) -> Settings`: **전체 교체(patch 아님).** 입력은 `Settings` 전체(commands.ts:43). ui는 `setSettings({ ...settings, ...patch })`로 사본을 펼쳐 보낸다(GeneralTab.tsx:46, ScaleIdleCard.tsx:61·104, ImagesTab.tsx:104·145, MousePartsTab.tsx:144, overlay/index.tsx:201). 단 **core 소유 필드**(`overlay.x/y`, `autostart`)는 입력을 무시하고 core 현재값 유지 — `window::keep_core_owned` 2회(commands.rs:160, :195; contract §5.3 :730).
- 처리: 검증(:155) → 병합(:158-163) → **파일 저장**(:170) → 창 속성 적용(:174) → (배율 변경 시) 리사이즈(:182-190) → 재병합·메모리(:193-198) → `settings://changed` emit(:201) → (어깨·partPos 변경 시) 손 기준점 재계산(:202-205).
- 브로드캐스트: `settings://changed`(payload `Settings` 전체). 오버레이 수신 `useBridgeEvent(onSettingsChanged, setLocalSettings)`(src/overlay/index.tsx:179), 설정 창 `useBridgeEvent(onSettingsChanged, setSettings)`(src/settings/index.tsx:137). 발신 지점 8곳은 §2.2 표.

### 4.3 질문 3 — 에셋 슬롯

- TS 슬롯 타입: `SimpleAssetSlot` 유니온(src/bridge/types.ts:11-23) + `KbDownSlot`(:25-28) + `PenDownSlot`(:31-34) → `AssetSlot`(:36). 도우미 `slotKey`(:47)·`isKbDownSlot`(:40)·`isPenDownSlot`(:43)·`isMousePartSlot`(:51), 상수 `REQUIRED_SLOTS`(:59)·`DEFAULT_ASSET_SLOTS`(:70)·`hasBuiltinDefault`(:80).
- 계약 슬롯 정의: §3.1 TS 코드(contract.md:53-67), Rust(:91-115), JSON 예시(:117-128), **슬롯 표(:130-140)**, `REQUIRED_SLOTS`(:148-157), `DEFAULT_ASSET_SLOTS`(:161-178).
- `hair`(CR-037, v0.17) 반영 지점: 계약 §3.1 TS 유니온(:55)·Rust `SimpleSlot::Hair`(:102)·슬롯 표 행(:133)·§8 v0.17 행(:962)·§9 v0.17 절(:972-979). TS `types.ts:22-23`(유니온 끝에 추가). Rust는 bridge `types.rs`가 `crate::assets::SimpleSlot` 재수출뿐(types.rs:6-7, :32) — 실제 변경은 core `src-tauri/src/assets/slot.rs:109`(`"hair"`). bridge 핸들러 코드 변경 없음(전수 match 없음). 새 command·event·에러 code·권한 없음(contract.md:6). v0.18에 내장 기본 추가, v0.20에 다시 제거(:173).
- 에셋 변경 이벤트: `assets://changed`, payload `AssetManifest {canvas: CanvasSize|null, entries: AssetEntry[]}`(types.ts:89-103), 발신 `after_asset_change`(commands.rs:121-131) — import/remove/restore 성공 후. export·시딩은 emit 없음(contract.md:652).
- 타이머와의 관계: 슬롯·에셋 경로는 타이머 표시에 쓰이지 않는다(참고용 선례 — "기존 자원에 값 추가 = 확장"의 예).

### 4.4 질문 4 — 에러 형태

- 형태: `BridgeError { code: string; message: string }`(types.ts:198-201, 계약 §3.5 contract.md:473-482, Rust `crate::error::BridgeError` 재수출 types.rs:33).
- **code 표기는 `영역.사유` 소문자 스네이크**(v0.14 D-3 정본, contract.md:822) — 스킬 §2·§4의 `ASSET_TOO_LARGE`식 대문자는 「별칭」 열로만 남음. 즉 새 code는 `영역.사유` 형식을 따라야 실물과 일치.
- 전체 목록(contract.md:824-847): `asset.not_png`, `asset.bad_header`, `asset.not_rgba`, `asset.too_large`, `asset.too_many_bytes`, `asset.canvas_mismatch`, `asset.not_found`, `asset.io`, `asset.manifest`, `asset.no_default`, `asset.export_dir`, `settings.invalid`, `settings.io`, `settings.format`, `io.error`, `window.not_found`, `window.no_monitor`, `tauri.error`, `state.poisoned`, `autostart.error`, `autostart.cancelled`, `unknown`(TS 전용). 로그 전용: `asset.decode`, `window.thread`, `tray.no_icon`(:849).
- 표 위치: §6 표(contract.md:824-847), §6.1 core 에러 → code 변환(:856-864), §6.2 command별 발생 code(:870-884). 변환 구현: `src-tauri/src/error.rs`(`From<CoreError>`), 예외로 `From<AutostartError>`는 types.rs:43-47. ui(설정 창)는 code로 3개 국어 문구를 고른다(contract.md:822) — 새 code는 ui 사전에도 영향.

### 4.5 질문 5 — 창 간 통신

기존에 **ui → ui 직접 경로는 없다.** 설정 창 조작은 전부 command로 Rust 상태를 바꾸고, Rust가 전 창에 emit한다.

| 예 | 설정 창 호출 | Rust 처리 | 오버레이 도달 |
|---|---|---|---|
| 배율·유휴·언어 등 | `setSettings({...settings, …})` (ScaleIdleCard.tsx:61, GeneralTab.tsx:46) | 저장·창 속성·리사이즈 → `settings://changed`(commands.rs:201) | `onSettingsChanged` → `setLocalSettings`(overlay/index.tsx:179) |
| 위치 잠금 토글 | `setSettings({...settings, positionLock})` (GeneralTab.tsx:46) | `window::apply_overlay_window`가 `set_ignore_cursor_events`(commands.rs:174, contract §5.3 4단계) → emit | 오버레이 UI는 값을 읽지 않음 — Rust가 창에 직접 적용(overlay/design.md:161) |
| 위치 초기화 | `resetOverlayPosition()` (GeneralTab.tsx:86) | `window::reset_overlay_position`이 창을 직접 이동 → `settings://changed`(commands.rs:375-376) | 창 자체가 Rust에서 이동. 이벤트는 값 동기화용 |
| 미리보기 | 없음(설정 창이 같은 이벤트를 구독해 스스로 그림) | 입력 이벤트·`settings://changed`·`assets://changed`를 전 창에 emit(events.rs:5 「설정 창 미리보기도 입력을 볼 수 있게」, contract.md:656) | — |
| 에셋 등록 | `importAsset` 등 | `assets://changed`(commands.rs:128) | `onAssetsChanged` → `setManifest`(overlay/index.tsx:180) |

- `emit_to`(특정 창) 사용 0건. 전부 `app.emit`(events.rs:76, 87, 93, 105, 109, 114). 스킬 §7 「특정 창에만 보낼 이유가 있으면 계약 표에 적는다」.
- 비-command 발신 경로 선례: core 스레드 콜백이 `bridge::events::emit_settings_changed`를 부름(lib.rs:274-281 드래그 저장, :293-317 자동 실행 보정, contract.md:657-658 「core는 emit 함수를 모른다 — 콜백으로 넘겨받는다」). **Rust 쪽 백그라운드 스레드가 주기적으로 emit하는 형태의 가장 가까운 선례는 `input-forwarder` 스레드(lib.rs:125-134)** 뿐이다.

### 4.6 질문 6 — capabilities

| 파일 | windows | permissions |
|---|---|---|
| src-tauri/capabilities/overlay.json:5-9 | `["overlay"]` | `core:default`, `core:window:allow-start-dragging` |
| src-tauri/capabilities/settings.json:5-10 | `["settings"]` | `core:default`, `dialog:allow-open`, `core:window:allow-set-title` |

- 커스텀 command: `src-tauri/build.rs`는 `tauri_build::build()`만 호출(app manifest 없음) → **`generate_handler!` 등록(lib.rs:144-161)만으로 두 창 모두 호출 가능**. 계약 §7 서두 "앱 command(§5)는 `build.rs`에 app manifest가 없어 `invoke_handler` 등록만으로 허용된다"(contract.md:890), v0.3·v0.9·v0.14·v0.16 "추가 권한 없음" 선례(:927, :931, :934, :938). → **새 command 추가 시 capabilities 파일 변경 불필요.** 창별로 command를 막는 구조는 현재 없다(오버레이도 설정용 command 호출 가능).
- 이벤트 구독: `core:default`에 포함(contract.md:896) — 두 창 모두 새 이벤트를 `listen` 가능, 권한 변경 불필요.
- `tauri.conf.json`에 `app.security.capabilities` 명시 목록 없음(grep 결과 `assetProtocol`만, :43-46) → capabilities 폴더 파일이 자동 적용.
- 주의: 새 command는 `lib.rs` `generate_handler!`에 등록해야 하며, 이 파일은 bridge-implementer 쓰기 범위 밖(contract.md:8 「`lib.rs` `generate_handler!` 미등록 — core 변경 요구로 남음」, :953 v0.9 같은 기록). 백그라운드 tick 스레드를 둔다면 그 조립 위치도 `lib.rs` setup(core 소관).

### 4.7 질문 7 — 계약서 구조와 삽입 위치

| 절 | 줄 | 새 항목이 들어갈 곳(형식만) |
|---|---|---|
| 머리말(버전 bullet, 최신이 위) | 1-19 | :3 버전 줄 교체 + `- (v0.21) …` bullet을 :4 위에 |
| §1 개요와 위상 | 23 | 변경 없음 |
| §2 직렬화 규약 | 34 | 시각 필드는 `ts: number` epoch **ms**(:39) — 시간값 표기 규약 |
| §3 타입 정의 | 45 | 마지막 소절 §3.8(:634) 뒤에 **§3.9** 신설 — 기존 소절 양식: TS 코드 → Rust 코드 → JSON 예시 → 의미·규칙 bullet |
| §4 이벤트 표 | 644-653 | 표 열: `이벤트 이름 \| 페이로드 \| 빈도 \| 설명 \| 요구ID`. 행 추가 + 표 아래 bullet(:655-658)에 발신 주체 설명 |
| §5 명령 표 | 660-681 | 표 열: `command \| 인자 \| 반환 \| 에러 코드 \| 설명 \| 요구ID`. 행 추가 + 상세는 §5.7(:798) 뒤 **§5.8** 신설(선례 §5.5·§5.6·§5.7) |
| §6 에러 코드 | 820-847 | 표 열: `코드(정본) \| 별칭(~v0.13) \| 발생 \| message 예(실물)`. 새 code는 별칭 `—`로 |
| §6.1 변환 | 852-864 | 새 core 에러 타입이면 행 추가 |
| §6.2 command별 code | 868-884 | 새 command 행 |
| §7 capabilities | 888-938 | 마지막 `- **v0.16: 추가 권한 없음…**`(:938) 뒤에 `- **v0.21: …**` 줄 |
| §8 변경 이력 | 940-966 | 표 열: `\| 버전 \| 일자 \| 변경 \| 호환성 \|`, 오래된 순(아래로 추가). **현재 v0.19(:964)가 마지막 — v0.20 행이 비어 있음(BRG-002)** |
| §9 요구 추적표 | 968-1153 | 최신이 위(v0.17 :972 → v0.16a :987 → …). 소절 머리 `**v0.xx (요구ID — CR-xxx)**` + 표 `\| 요구 \| 계약 항목 \| 판정 \| 호환성 \| core 의존 \|` + 판정 근거 bullet. 새 절은 :972 위 |

- 절 번호 변경 금지(스킬 §13).

## 5. 확인 필요 (사용자 판단)

1. **새 이벤트 도메인.** 스킬 §2가 도메인을 `input`·`settings`·`assets`·`window`로 시작한다고 정하고 새 도메인은 요구 역추적 시에만 허용한다. 타이머용 도메인을 새로 둘지(또는 기존 도메인에 둘지)는 요구ID(R-xx) 확정 뒤 bridge-designer 판단 대상.
2. **주기 이벤트 빈도 규칙 부재.** 스킬 §7·계약 §4에 "일정 간격으로 계속 보내는" 이벤트 규칙이 없다. 매초 emit할지, 상태 변경 때만 보내고 표시는 각 창이 계산할지는 설계 결정 — 단 스킬 §11은 bridge 래퍼 안에 타이머 로직을 금지하고, 스킬 §7은 페이로드 자기 완결을 요구한다.
3. **타이머 상태 저장 여부.** `set_settings`는 호출마다 settings.json을 쓴다(commands.rs:170). 타이머 진행 상태를 `Settings`에 넣으면 조작마다 파일 쓰기가 일어나고 재시작 후 복원이 생긴다 — 요구(재시작 후 이어하기 여부)로 정해야 함.
4. **BRG-003 정본 판정.** `set_autostart`의 emit 조건: 계약(성공 시 항상) vs 코드(값 변경 시만). 어느 쪽을 정본으로 할지.
5. **BRG-006 예외 여부.** 화면 테스트의 `vi.mock('bridge/events')` 안 이벤트 이름 재기입을 스킬 §8 결함으로 볼지, 테스트 픽스처 예외로 볼지. 새 이벤트가 추가되면 이 mock 12곳 안팎이 함께 영향받는다.
6. **새 command·event는 요구ID가 필요**(스킬 §12). 현재 `src/overlay/requirements.md`·`src/settings/requirements.md`에 뽀모도로 요구가 있는지는 이번 범위에서 확인하지 않았다.
