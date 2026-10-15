# window 모듈 설계

- 상태: 확정(사용자) — §3.1(overlay R-40, CR-062)은 횡단 설계 v2(사용자 결정 U-1~U-6) 기준 확정 · **소스 반영**(커밋 2be41ce) · **§3.2(항상 위 재적용 WT-01~WT-09)는 확정(사용자) · 소스 적용(2026-10-15, 커밋 전) · 수동 MC-51~MC-62 미확인** · 최종 갱신 2026-10-15
- 변경이력:
  - 2026-10-15 (doc-sync — **설계 변경 아님, 소스가 정본**) ① §4 「앱 시작 순서」 제목의 setup 단계 번호를 현재 `lib.rs`에 맞췄다(오버레이 = 5단계 `setup_overlay`, 당시 4단계). 현재 순서 한 줄을 더했다(`apply_overlay_window` 포함, 매니페스트는 기본 그림·내장 프리셋 시딩 뒤 값). §11 파급 표의 「setup 4단계」도 같이 고쳤다. ② openItem window-bridge-error 판정을 §11 항목 14로 남겼다. core → bridge 역참조가 맞고, 후속 W-2로 둔다. `apply_overlay_settings` 호출자 0도 적었다. WT 절은 손대지 않았다. 공개 API 불변.
  - 2026-10-15 (WT 소스 적용 표기 — 설계 변경 없음) §3.2와 §10 WT 9행을 「확정(사용자) · 소스 적용(2026-10-15, 커밋 전) · MC 미확인」으로 바꿨다. 근거는 메인 세션 보고(fmt·clippy 0, `cargo test` lib 456·통합 102 통과)다. 수동 MC-51~MC-62는 미확인이다.
  - 2026-10-05 (overlay **R-01 보강 — 항상 위 재적용**, 🔒 사용자 결정 2026-10-05 ①~⑤, 베타 제보) 신규 **§3.2**(WT-01~WT-09). 공개 함수 시그니처 불변, `apply_overlay_window`에 ④단계(보일 때만 대상 등록 + 즉시 재적용), 숨김 경로는 `hide()` 앞에서 등록 해제. `set_overlay_visible`도 같은 처리. 비공개 도우미 `keep_overlay_on_top`·`release_overlay_top`. HWND는 Tauri `WebviewWindow::hwnd()` → 정수(`isize`)로만 hook에 넘긴다. Win32는 hook 안전 래퍼([hook.md](hook.md) §3.11, U20~U27), 트레이 「새로고침」 트리거는 [tray.md](tray.md) §3.8. **의존 추가 `window → hook`.** 새 에러 변형·스레드·설정 필드 없음. 수동 MC-51~MC-62. §1·§2·§3.2·§5·§10·§11(D34~D38, 파급) 갱신. **소스 미적용.**
  - 2026-09-30 (doc-sync — **설계 변경 아님, 소스가 정본**, 커밋 2be41ce 기준) §3.1(overlay R-40)의 「소스 미적용」을 걷어냈다. 대조 결과: `pub fn overlay_screen_rect(app: &AppHandle) -> Result<Option<ScreenBounds>, WindowError>`(`window/mod.rs:157`)와 `ScreenBounds::contains(&self, x: i32, y: i32) -> bool`(`:108`)이 있고, 호출자는 `tray/popup.rs`다(`should_popup`:125, 조회는 `overlay-menu` 스레드에서 상태가 Idle일 때만 — PU-h). §10 R-40 행을 「소스 반영」으로 바꿨다. 같은 날 2차로 §10(SV2-03~06, CR-017 `list_monitors`, OV-R-13 위치 불간섭·이동 감지, OV-R-03 표시 크기)의 「✅ 설계 · 소스 미적용」 8곳도 「소스 반영」으로 바꿨다. 근거 공개 함수: `window/mod.rs` `list_monitors`:134·`apply_overlay_settings`:194·`default_overlay_position`:200·`apply_overlay_window`:208, `window/placement.rs` `watch_overlay_moves`:198·`persist_overlay_position`:224·`keep_overlay_position`:240·`keep_core_owned`:256·`reset_overlay_position`:265, `window/sizing.rs` `overlay_display_size`:54. 「(요구ID 확인 필요)」 꼬리는 그대로 둔다.
  - 2026-09-29 (R-40 감사 반영, 리뷰 SEC-301 — 문서 주석만, 시그니처·본문·에러 불변) `overlay_screen_rect`의 호출자가 tray `popup_now`(메인)에서 **tray `overlay-menu` 스레드(비메인)**로 바뀐다. 전경 창 조회보다 먼저 사각형을 판정하기 위해서다. 비메인 호출 안전 근거(tauri-runtime-wry 2.12.0 getter = 메인 스레드 동기 왕복)와 호출 조건(메뉴 상태 Idle일 때만)을 §3.1 문서 주석·스레드 줄에 적었다. 정본 [tray.md](tray.md) §3.7.3 PU-h·§11 T17. **소스 미적용**(`window/mod.rs:151-153` 문서 주석 교체).
  - 2026-09-29 (overlay **R-40** 오버레이 오른쪽 클릭 메뉴, CR-062, 🔒 사용자 결정 U-1 2026-09-29, 정본 `doc/200_설계/architecture/overlay-context-menu.md` v2 §2.3·§4.2) **신규 공개 항목 2개**: `impl ScreenBounds { pub fn contains(&self, x: i32, y: i32) -> bool }`(반열림 `[x, x+w) × [y, y+h)`, i64 계산, 순수)·`pub fn overlay_screen_rect(app) -> Result<Option<ScreenBounds>, WindowError>`(보이는 오버레이 창의 바깥 사각형, 물리 px — 숨김이면 `Ok(None)`). 호출자는 [tray.md](tray.md) §3.7 `popup_now`(메인 스레드). 새 에러 변형·unsafe·스레드·설정 없음. 테스트 WR1~WR3(`mod.rs` 테스트). 증분 전체 **§3.1**, §1·§2·§5·§6·§8.8·§10·§11 갱신.
  - 2026-09-24 (R-set-v2 SV2-03·04·05·06, 🔒 사용자 결정 D-1~D-10, 확정사항 §6 「설정 창 개편」) **신규 공개 함수 4개**: `apply_overlay_window(app, &Settings)`(표시/숨김 + 작업표시줄 `set_skip_taskbar(!show_in_taskbar)` + 클릭 통과 `set_ignore_cursor_events(position_lock)`, 멱등, **호출마다 재적용**), `keep_core_owned(incoming, &current)`(`overlay.x/y` + `autostart` 유지 — 기존 `keep_overlay_position` 재사용), `default_overlay_position()`((100,100) 단일 출처 = `Settings::default().overlay`), `reset_overlay_position(app, &Mutex<Settings>, &Path)`(기본 위치로 이동·저장, 반환 = 저장 후 설정). **옛 `apply_overlay_settings(&OverlaySettings)`는 bridge 전환까지 유지**(core만 먼저 들어가도 `cargo check`가 깨지지 않게 — §2.4 D27). 시작 순서에 창 속성 적용·자동 실행 보정 추가. 이번 변경의 §1·§2·§4·§7·§8·§9·§10·§11 증분은 **§2.4에 모아 적었다.** 사용자 결정 완료로 바로 확정. **소스 미적용.**
  - 2026-09-23 (CR-017, 🔒 사용자 결정, 확정사항 §3 「이동 영역·팔 늘어나기」) 비공개 `monitor_rects` → **공개 `list_monitors(app) -> Result<Vec<ScreenBounds>, WindowError>`**(모니터별 사각형, 물리 px — 훅 마우스 좌표와 같은 좌표계). ui가 커서가 있는 모니터 기준으로 이동 영역(settings.md `mouse.area`)에 매핑한다. bridge 요구: 새 command `get_monitors`(§9.4). 사용자 결정 완료로 바로 확정.
  - 2026-09-23 확정 전환(직전 초안: R-13·R-03·set_settings 위치 불간섭 반영). §11 확인 필요 4(D10 여백 미포함)는 사용자 확인 완료로 D10 유지. 나머지 §11 관찰·후보(2, 3-1, 5~9)는 후속 후보로 유지하며 확정을 막지 않는다.
- 요구ID 표기: `OV-R-xx` = `src/overlay/requirements.md`. `doc/100_요구조건/`에는 아직 R-xx 목록이 없다.
- 상대 문서: [settings.md](settings.md)(`OverlaySettings`, `save`, `SCALE_MIN/MAX`) · [assets.md](assets.md)(`CanvasSize`, `load_manifest`) · 계약 `doc/200_설계/bridge/contract.md` · 화면 `src/overlay/design.md`

## 1. 목적

결론: window는 오버레이 창을 제어하고, R-13부터 **드래그 이동이 끝나면 스스로 감지해 위치를 설정에 저장하고, 앱 시작 때 그 위치로 복원**한다(모니터 밖이면 기본 위치). R-03부터 **창 크기를 표시 크기(캔버스를 450×350에 비율 유지로 맞춘 크기 × 배율)에 맞춰 리사이즈**한다 — 좌상단은 고정.

비유: 창 위치 저장은 "손을 뗀 뒤 0.5초 기다렸다가 메모하는 비서"다. 끄는 동안 매 순간 받아 적지 않고, 움직임이 멎으면 마지막 자리만 한 번 적는다. 다음 날 출근하면 메모대로 앉히되, 그 자리가 없어졌으면(모니터 분리) 기본 자리로 안내한다.
창 크기 맞춤은 "액자 재단"이다. 그림(캔버스)을 450×350 틀에 비율대로 넣은 크기에 배율을 곱하고, 액자를 그림에 딱 맞게 자른다. 벽에 박힌 못(좌상단)은 그대로 두고 오른쪽·아래로만 늘이거나 줄인다.

| 요구ID | 내용 | 이 모듈의 몫 |
|---|---|---|
| OV-R-01 | 투명·테두리 없음·항상 위 | `tauri.conf.json` 창 속성(기존). **2026-10-05 보강(WT-01~WT-09)**: 항상 위가 풀려도 전경 변화·창 속성 적용·트레이 「새로고침」 때 다시 맨 위로 — 대상 등록·해제는 window(`apply_overlay_window`·`set_overlay_visible`), Win32 재적용은 hook 안전 래퍼(§3.2) |
| OV-R-12 | 드래그로 위치 이동 | ui의 `data-tauri-drag-region`(Tauri 내장). window는 이동 결과(`WindowEvent::Moved`)만 받는다 |
| OV-R-13 | 창 위치는 설정에 저장 | **신규**: 이동 감지·디바운스 저장(`watch_overlay_moves`·`persist_overlay_position`), 시작 시 복원·화면 밖 보정(`restore_overlay_position`·`resolve_overlay_position`) |
| OV-R-03 | 창 크기 = 표시 크기 자동 조절(확정사항 §3·§6) | **신규**: 표시 크기 계산(`overlay_display_size`, 순수)·창 리사이즈(`resize_overlay`). 호출 시점 3곳(시작·배율 변경·캔버스 변경)은 setup·bridge가 부른다(§4, §9.1) |
| **R-tmp-4 (확인 필요 — CR-017, 확정사항 §3 「커서가 있는 모니터 기준」, 요구ID 미부여)** | 커서가 있는 모니터 안의 비율로 이동 영역에 매핑(ui 계산) | **모니터 목록 제공**: 비공개 `monitor_rects` → 공개 `list_monitors`(§2.3). 매핑 계산은 ui |
| **overlay R-40 (CR-062, 🔒 2026-09-29 U-1)** | 오버레이 창 위 오른쪽 클릭(누른 곳·뗀 곳 모두 창 사각형 안, 투명 부분 포함) → 트레이와 같은 메뉴. 숨김이면 안 뜸 | **창 사각형 제공·점 판정**: `overlay_screen_rect`(보이는 창의 바깥 사각형, 숨김 → `None`)·`ScreenBounds::contains`(§3.1). 메뉴 표시·판정 흐름은 [tray.md](tray.md) §3.7 |

## 2.0 창 생성 시점 (2026-09-25, 긴급 결함 수정)

창(overlay·settings)은 `AppState` 등록 뒤 생성한다. `tauri.conf.json`의 두 창 모두 `"create": false`로 두고, `lib.rs`의 `setup()` 안에서 `app.manage(AppState)` 직후 `WebviewWindowBuilder::from_config`로 직접 만든다 — release 빌드에서 프레임워크 기본 창 생성이 `AppState` 등록보다 먼저 끝나 첫 IPC(`get_settings` 등, `State<AppState>`)가 "state not managed"로 실패하던 결함의 수정.

### 2.0.1 설정 창 닫기·재열기 (CR-041, 2026-09-25, 결함 수정)

설정 창을 X로 닫아도 창을 파괴하지 않는다 — `lib.rs`의 `Builder::on_window_event`가 라벨 `settings`의 `CloseRequested`만 가로채 `prevent_close()` 후 `hide()`한다(오버레이 창은 그대로 둠). 트레이 「설정 열기」(`show_settings_window`)는 이미 있는 창을 `show()`+`set_focus()`할 뿐이라 재사용된다. 그래도 창이 파괴된 예외 상황을 대비해 `show_settings_window`는 `get_webview_window`가 `None`이면 `tauri.conf.json`의 `settings` 항목으로 `WebviewWindowBuilder::from_config`를 다시 호출해 재생성한다. 트레이 「종료」는 `app.exit(0)`으로 `CloseRequested`를 거치지 않으므로 이 가로채기가 종료를 막지 않는다.

- (2026-09-27 교차 참조) 앱을 두 번째로 실행하면 `lib.rs`의 단일 인스턴스 콜백(`on_second_instance`)이 기존 인스턴스에서 이 `show_settings_window`를 그대로 재사용한다(숨김이면 표시, 파괴됐으면 재생성). 시그니처·본문 불변 — [data_reset.md](data_reset.md) §3.10(R-A8).

## 2. 공개 API

기존 함수는 동작이 같고 **반환 에러 타입만 `BridgeError` → `WindowError`**로 바뀐다(스킬 §5 — core는 bridge 타입을 모른다). 신규는 굵게.

| 이름 | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `pub const OVERLAY_LABEL: &str = "overlay"` / `SETTINGS_LABEL` | — | — | — | OV-R-01 |
| `pub fn overlay_position(app: &AppHandle) -> Result<Point, WindowError>` | 앱 | 창 좌상단(물리 px) | `NotFound`, `Tauri` | OV-R-13 |
| `pub fn set_overlay_position(app: &AppHandle, x: i32, y: i32) -> Result<(), WindowError>` | 좌표 | () | `NotFound`, `Tauri` | OV-R-13 |
| `pub fn set_overlay_visible(app: &AppHandle, visible: bool) -> Result<(), WindowError>` | 표시 여부 | () | `NotFound`, `Tauri` | (트레이·설정) |
| `pub fn apply_overlay_settings(app: &AppHandle, s: &OverlaySettings) -> Result<(), WindowError>` | 오버레이 설정 | () — **(재정의 2026-09-23) `s.visible`만 적용, `s.x/y`는 읽지 않는다(창을 옮기지 않음)** §2.1.1 | `NotFound`, `Tauri` | OV-R-13 |
| **`pub fn keep_overlay_position(incoming: Settings, current: &Settings) -> Settings`** | 들어온 설정(값 이동), 현재 메모리 설정 | `incoming`에서 `overlay.x/y`만 `current` 값으로 바꾼 설정 | 없음(순수) | OV-R-13(위치 불간섭) |
| `pub fn show_settings_window(app: &AppHandle) -> Result<(), WindowError>` | 앱 | () | `NotFound`, `Tauri` | (트레이) |
| `pub fn screen_bounds(app: &AppHandle) -> Result<ScreenBounds, WindowError>` | 앱 | 모든 모니터 합집합 | `NoMonitor`, `Tauri` | OV-R-08 (CR-017 후 ui 사용처가 없어질 예정 — §11 D24) |
| **`pub fn list_monitors(app: &AppHandle) -> Result<Vec<ScreenBounds>, WindowError>`** (CR-017, 🔒 이름) | 앱 | 모니터마다 사각형 1개(물리 px, 가상 화면 좌표), OS 열거 순서. 모니터가 없으면 빈 `Vec` | `Tauri` | R-tmp-4, OV-R-13(복원 판정) |
| `pub fn union(rects: &[ScreenBounds]) -> Option<ScreenBounds>` | 사각형들 | 합집합 | 없음 | OV-R-08 |
| **`pub fn restore_overlay_position(app: &AppHandle, saved: &OverlaySettings) -> Result<Point, WindowError>`** | 저장된 오버레이 설정 | 실제로 적용한 위치 | `NotFound`, `Tauri` | OV-R-13 |
| **`pub fn resolve_overlay_position(saved: Point, width: u32, height: u32, monitors: &[ScreenBounds]) -> Point`** | 저장 위치, 창 바깥 크기(물리 px), 모니터 사각형들 | 적용할 위치(저장 위치 또는 기본 위치) | 없음(순수) | OV-R-13 |
| **`pub fn watch_overlay_moves<F>(app: &AppHandle, on_settled: F) -> Result<(), WindowError> where F: Fn(Point) + Send + 'static`** | 앱, 이동이 멎었을 때 부를 콜백 | () | `NotFound`, `Thread` | OV-R-13 |
| **`pub fn persist_overlay_position(settings: &Mutex<Settings>, path: &Path, pos: Point) -> Result<Option<Settings>, WindowError>`** | 설정 상태, settings.json 경로, 새 위치 | 바뀌어 저장했으면 `Some(저장한 설정 스냅샷)`, 같으면 `None` | `StatePoisoned`, `Settings` | OV-R-13 |
| **`pub const MOVE_SAVE_DEBOUNCE: Duration = Duration::from_millis(500)`** | — | — | — | OV-R-13 |
| **`pub const MIN_VISIBLE_PX: u32 = 48`** | — | — | — | OV-R-13 |
| **`pub fn overlay_display_size(canvas: Option<(u32, u32)>, scale: f64) -> OverlaySize`** | 캔버스 픽셀 크기(가로, 세로; 없으면 `None`), 배율 | 창 안쪽 크기(논리 px) | 없음(순수) | OV-R-03 |
| **`pub fn resize_overlay(app: &AppHandle, canvas: Option<(u32, u32)>, scale: f64) -> Result<OverlaySize, WindowError>`** | 앱, 캔버스, 배율 | 적용한 크기(논리 px) | `NotFound`, `Tauri` | OV-R-03 |
| **`impl ScreenBounds { pub fn contains(&self, x: i32, y: i32) -> bool }`** (R-40, §3.1) | 화면 좌표(물리 px) | 반열림 `[x, x+width) × [y, y+height)` 안이면 `true`(순수, i64 계산). 너비·높이 0이면 항상 `false` | 없음 | R-40 AC-5 |
| **`pub fn overlay_screen_rect(app: &AppHandle) -> Result<Option<ScreenBounds>, WindowError>`** (R-40, §3.1) | 앱 | 보이는 오버레이 창의 바깥 사각형(`outer_position` + `outer_size`, 물리 px). **숨김이면 `Ok(None)`** | `NotFound`, `Tauri` | R-40 AC-4·AC-5 |

타입(기존): `Point { x: i32, y: i32 }`(물리 px, camelCase), `ScreenBounds { x: i32, y: i32, width: u32, height: u32 }`.
타입(신규): **`#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct OverlaySize { pub width: u32, pub height: u32 }`** — 논리 px(= ui의 CSS px). bridge로 직렬화하지 않으므로 serde 없음.

- 캔버스 인자를 `assets::CanvasSize`가 아닌 `(u32, u32)`로 받는 이유: 의존 방향은 `window → settings`뿐이다(스킬 §1). 호출자가 `manifest.canvas.map(|c| (c.width, c.height))`로 넘긴다.

### 2.1 함수별 규칙 — 위치(OV-R-13)

**`resolve_overlay_position`** (순수)
1. `monitors`가 비었으면 판단 불가 → `saved` 그대로.
2. 창 사각형 `R = (saved.x, saved.y, width, height)`.
3. 모니터 하나라도 `R ∩ M`의 가로 ≥ `min(MIN_VISIBLE_PX, width)` **그리고** 세로 ≥ `min(MIN_VISIBLE_PX, height)`이면 `saved`.
4. 아니면 기본 위치 `Point { x: Settings::default().overlay.x, y: Settings::default().overlay.y }` = (100, 100). Windows 가상 화면에서 주 모니터 원점은 항상 (0,0)이라 기본 위치는 주 모니터 안이다.
- 근거: 화면 가장자리에 일부러 반쯤 걸쳐 둔 위치는 보존하고, 잡아서 끌 수 있는 부분(48×48)조차 안 보이면 "모니터 밖"으로 본다.

**`restore_overlay_position`** (앱 시작 시 1회)
1. 오버레이 창의 `outer_size()`와 모든 모니터 사각형(`available_monitors()` → `position()`·`size()`)을 읽는다.
2. `resolve_overlay_position`으로 위치를 정해 `set_position(Physical)` → `saved.visible`대로 표시/숨김.
3. 적용한 위치를 반환한다. 호출자는 반환값 ≠ 저장값이면 `persist_overlay_position`으로 보정값을 저장한다(§4 시작 순서).
- `outer_size()`가 실제 표시 크기를 돌려주려면 `resize_overlay`가 먼저 불려야 한다(§4 시작 순서 0단계).

**`watch_overlay_moves`**
1. `mpsc::channel::<Point>()` 생성, 저장 스레드 `overlay-move-saver`를 `std::thread::Builder`로 spawn(실패 → `Thread`).
2. 오버레이 창에 `on_window_event` 등록. 클로저는 `WindowEvent::Moved(p)`일 때만 `Point{p.x, p.y}`를 만들고, **최소화 좌표**(`x ≤ -32000 && y ≤ -32000`)면 버린 뒤 `tx.send`. 잠금·IO·로그 없음.
3. 저장 스레드는 §4의 디바운스 루프를 돌고, 마지막 `Moved` 뒤 `MOVE_SAVE_DEBOUNCE` 동안 새 이동이 없으면 `on_settled(마지막 위치)`를 1회 부른다.
- 호출은 앱 수명 동안 1회. 두 번 부르면 저장 스레드가 둘이 된다 — 호출자(setup)만 부른다.

**`persist_overlay_position`**
1. `settings.lock()` (독 → `StatePoisoned`). 한 블록 안에서: `overlay.x/y`가 `pos`와 같으면 `Ok(None)` 반환. 다르면 메모리 값을 `pos`로 갱신하고 전체를 `clone`해 스냅샷을 만든 뒤 잠금 해제.
2. 잠금 밖에서 `settings::save(path, &snapshot)?` (원자적 쓰기는 settings 모듈이 보장).
3. `Ok(Some(snapshot))`. 저장 실패 시 메모리 값은 이미 새 위치다(창이 실제로 그 자리에 있으므로 사실과 일치). 다음 저장 때 함께 기록된다.

### 2.1.1 위치 불간섭 — `set_settings`는 창을 옮기지 않는다 (OV-R-13, 2026-09-23 사용자 신고)

결론: **오버레이 위치의 주인은 창(core window)이다.** `set_settings`는 창 위치를 바꾸지 않고, 받은 `overlay.x/y`는 버린 뒤 core 메모리의 현재값으로 채워 저장한다.

비유: ui가 들고 있는 설정은 "어제 찍은 사진"이다. 배율 한 칸을 바꾸려고 사진을 통째로 돌려줘도, 비서(window)는 사진 속 캐릭터 자리는 보지 않고 자기 메모장(메모리 값)의 자리를 그대로 옮겨 적는다. 캐릭터를 실제로 옮기는 손은 사용자(드래그)와 비서(시작 복원)뿐이다.

- 신고 증상: 드래그로 옮긴 뒤 Ctrl+휠 → ui가 `scale`만 바꾼 설정 사본 전체로 `set_settings` → 기존 `apply_overlay_settings`가 `set_overlay_position(s.x, s.y)` → 사본의 x/y(드래그가 저장되지 않아 기본값)로 창이 튄 뒤 리사이즈.
- **위치를 바꾸는 경로(🔒 이것뿐)**: ① 사용자 드래그(Tauri 내장) ② 앱 시작 복원·화면 밖 보정(`restore_overlay_position`) ③ 명시적 `set_overlay_position` command. `set_settings`·리사이즈·트레이는 위치를 바꾸지 않는다.
- `overlay.x/y` 쓰기 주체: `persist_overlay_position`(드래그 저장·시작 보정), `set_overlay_position` command. `set_settings`는 메모리 값을 **옮겨 적기만** 한다(값 불변).

**`keep_overlay_position`** (순수, `placement.rs`)
1. `Settings { overlay: OverlaySettings { x: current.overlay.x, y: current.overlay.y, ..incoming.overlay }, ..incoming }`를 반환한다. `overlay.visible`과 나머지 필드는 전부 `incoming` 값.
2. 검증·IO·잠금 없음. 잠금은 호출자가 쥔다(아래 순서).

**`apply_overlay_settings`** (재정의)
1. `set_overlay_visible(app, s.visible)`만 한다. `s.x/y`는 읽지 않는다.
2. 시그니처 불변(호출자 `commands.rs:51` 수정 없음).
- ⚠ 현재 앱 시작 위치 복원(`lib.rs:93`)이 이 함수의 위치 적용에 기대고 있다. 재정의는 **§4 시작 순서 1단계(`restore_overlay_position`으로 교체)와 같은 변경 묶음**으로 구현한다. R-13보다 먼저 이 수정만 넣는다면 `lib.rs:93`을 `set_overlay_position(&handle, s.x, s.y)` → `apply_overlay_settings` 순서로 바꿔 시작 복원을 유지한다.

**`set_settings` 처리 순서** (bridge 조립 — §9.3. 위치 관련 단계만, 리사이즈·손 기준점은 §9.1·contract §5.1 그대로)
1. `settings.validate()?`
2. 잠금 한 블록: `old_scale = g.scale; merged = window::keep_overlay_position(settings, &g)` → 해제
3. `settings::save(path, &merged)?` — 실패하면 메모리 불변(기존 의미 유지)
4. `window::apply_overlay_settings(&app, &merged.overlay)?`(표시/숨김만) → 자동 실행 → 리사이즈(§9.1)
5. 잠금 한 블록: `let fin = window::keep_overlay_position(merged, &g); *g = fin.clone();` → 해제 — **x/y를 쓰는 순간 다시 읽는다**
6. `settings://changed`(`fin`) emit, `Ok(fin)` 반환 — ui 사본의 낡은 x/y가 이 값으로 교정된다
- 두 번 병합하는 이유: 2에서 한 번만 하면 5의 `*g = merged`가 2~4 사이 `persist`가 쓴 새 x/y를 옛 값으로 덮는다(메모리 역행 → 이후 저장이 전부 옛 위치 → 재시작 때 옛 자리). 파일은 3의 스냅샷(옛 x/y)이 `persist`의 쓰기보다 늦게 도착할 수 있으나(D4와 같은 "한 박자 늦은 스냅샷") 메모리는 맞으므로 다음 저장에서 교정된다.

**알려진 한계 해소 판정**

| 한계(이전 기록) | 이 변경 후 |
|---|---|
| 설정 저장이 ui 사본의 옛 `overlay.x/y`로 창을 되돌림(§11 확인 필요 3, M5) | **해소.** `set_settings`가 창을 옮기지 않으므로 사본이 얼마나 낡았든(로드 전 `DEFAULT_SETTINGS` 포함) 튀지 않는다. `settings://changed` 수신 여부와도 무관 |
| 드래그 후 500ms 안에 Ctrl+휠 | **해소(튐 없음).** 이 순간 메모리 x/y는 아직 옛 자리라 3에서 파일에 옛 x/y가 한 번 쓰이고 emit되지만 창은 제자리다. 디바운스가 끝나면 `persist`가 메모리(옛)와 새 위치를 비교해 저장·emit → 최종 파일 = 새 위치 |
| R-13 미구현 상태 | 튐은 해소(창을 안 옮김). 드래그 위치 저장·재시작 복원은 R-13 구현 전까지 없다(별개 항목) |

### 2.2 함수별 규칙 — 크기(OV-R-03)

**`overlay_display_size`** (순수, 전 입력에서 값이 정해짐)
1. **배율 정규화**: `scale`이 유한하지 않으면 `Settings::default().scale`(1.0), 아니면 `scale.clamp(SCALE_MIN, SCALE_MAX)`(= 0.25~2, `settings` 상수). `validate`를 거치지 않은 값(손으로 고친 settings.json)에도 창이 0이나 거대 크기가 되지 않게 한다.
2. **캔버스 정규화**: `None`이거나 가로·세로 중 하나가 0이면 기준 상자 450×350을 캔버스로 본다(fit = 1). ui `MouseArm`의 `canvas ?? {450, 350}` 대체와 같다.
3. `fit = min(450 / cw, 350 / ch)` (f64).
4. `w = cw × fit × scale`, `h = ch × fit × scale`.
5. `ceil_px(v) = max(1, ceil(v − SIZE_EPSILON)) as u32`, `SIZE_EPSILON = 1e-6`. 올림: 내림하면 콘텐츠 마지막 픽셀이 잘린다. ε: `450 × 1.1 = 495.00000000000006` 같은 부동소수 오차로 1px 커지는 것을 막는다.
- 상한: `cw × fit ≤ 450`, `ch × fit ≤ 350`이므로 배율 200%에서 가로 ≤ 900, 세로 ≤ 700(확정사항 §11-1 "상한 900×700").
- **여백 미포함**: 캔버스 비율이 9:7이 아니면 창은 비율 유지로 맞춘 캔버스 크기만큼만 잡힌다(450×350 상자의 남는 부분은 창에 넣지 않음). 근거는 §11 D10.

계산 예시(창 안쪽 크기, 논리 px):

| 캔버스 | fit | 배율 0.25 | 배율 0.5 | 배율 1 | 배율 1.1 | 배율 2 |
|---|---|---|---|---|---|---|
| 900×700 (권장, 9:7) | 0.5 | 113×88 (112.5×87.5 올림) | **225×175** | **450×350** | 495×385 | **900×700** |
| 없음(상태 레이어 0장) | 1 (450×350 상자) | 113×88 | 225×175 | 450×350 | 495×385 | 900×700 |
| 612×354 (봉고캣, 1.73:1) | 0.7353 (가로 기준) | 113×66 | 225×131 | 450×261 | 495×287 | 900×521 |
| 350×700 (세로형) | 0.5 (세로 기준) | 44×88 | 88×175 | 175×350 | 193×385 | 350×700 |
| 300×200 (작은 캔버스) | 1.5 (확대) | 113×75 | 225×150 | 450×300 | 495×330 | 900×600 |

**`resize_overlay`**
1. `size = overlay_display_size(canvas, scale)`.
2. 오버레이 창 조회(없으면 `NotFound`) → `win.set_size(Size::Logical(LogicalSize::new(size.width as f64, size.height as f64)))?`(실패 `Tauri`).
3. `Ok(size)`.
- **좌상단 고정**: Tauri `set_size`는 tao `set_inner_size_physical` → `SetWindowPos(…, SWP_NOMOVE | …)`로 크기만 바꾼다(tao 0.35.3 `platform_impl/windows/util.rs` 91–118행). 위치 인자가 없으므로 기준점을 따로 지정하지 않는다.
- **`Moved` 없음**: tao는 `WM_WINDOWPOSCHANGED`에서 `SWP_NOMOVE`가 없을 때만 `Moved`를 낸다(같은 버전 `event_loop.rs` 1211–1221행). 따라서 리사이즈는 R-13 저장 스레드를 깨우지 않는다.
- **논리 px**: ui가 CSS px로 그리므로 창도 논리 px로 지정해야 125%·150% DPI에서 창과 콘텐츠 경계가 일치한다(§11 D12).
- **멱등**: 같은 크기로 다시 불러도 위치 불변·`Moved` 없음. 호출자가 "크기가 바뀌었는지"를 판정할 필요가 없다.
- 창이 숨김 상태여도 적용된다(다시 표시될 때 새 크기).

### 2.3 함수별 규칙 — 모니터 목록 (CR-017, R-tmp-4)

결론: `list_monitors`는 **모니터 하나당 사각형 하나**를 물리 px로 돌려준다. 커서 좌표(훅)와 같은 좌표계라 ui가 변환 없이 "커서가 어느 사각형 안에 있나"를 판정하고 그 안의 비율 (u, v)를 구한다.

비유: 예전에는 벽 전체(모든 모니터를 합친 큰 사각형) 한 장만 줬다. 이제는 벽에 걸린 액자(모니터)마다 위치·크기 카드를 한 장씩 준다. 손님(커서)이 어느 액자 앞에 서 있는지, 그 액자 안에서 어디쯤인지는 ui가 카드로 계산한다.

**`list_monitors`**
1. `app.available_monitors()?` — 실패 → `WindowError::Tauri`.
2. 모니터마다 `position()`(물리 px, 가상 화면 좌표 — 주 모니터 원점 (0,0), 왼쪽·위쪽 보조 모니터는 음수)과 `size()`(물리 px)로 `ScreenBounds { x, y, width, height }`를 만든다. 기존 비공개 `monitor_rects` 본문과 같다(이름·가시성만 바뀜).
3. **모니터 전체 사각형**이다. 작업 영역(`work_area()`, 작업 표시줄 제외)이 아니다 — 커서는 작업 표시줄 위에도 가고 훅은 그 좌표도 보낸다.
4. 순서는 OS 열거 순서 그대로(정렬·중복 제거 없음). 주 모니터 표시 필드는 없다(요구 없음).
5. 모니터가 0개면 `Ok(vec![])`. 판단은 호출자 몫: `restore_overlay_position`은 "판단 불가 → 저장 위치 유지"(§2.1 규칙 1), `screen_bounds`는 `NoMonitor`, bridge `get_monitors`는 §9.4 권장대로.
- **단위 근거**: tao `MonitorHandle::position()/size()`는 물리 px이고, Tauri(tao)는 프로세스를 Per-Monitor(v2) DPI 인식으로 올린다. 이 조건에서 `WH_MOUSE_LL`의 `MSLLHOOKSTRUCT.pt`는 "per-monitor aware 화면 좌표" = 물리 px 가상 화면 좌표다. 따라서 혼합 DPI(100% + 150%)에서도 커서 좌표와 사각형이 같은 단위다(모듈 `//!` [좌표]와 같은 전제, 수동 L3·L4로 확인).
- 호출자(모듈 내부): `screen_bounds`(`mod.rs`), `placement::restore_overlay_position`(`placement.rs:106` `super::monitor_rects` → `super::list_monitors`). 동작 변화 없음.
- 반환 에러 타입은 `WindowError`다(신규 공개 함수 규칙 — `placement::*`·`sizing::*`와 같음). 기존 6개 함수의 임시 `BridgeError` 반환 부채(모듈 `//!` [에러])와 섞지 않는다.

### 2.4 settings-v2 — 위치 잠금·작업표시줄·위치 초기화·core 소유 필드 (SV2-03·04·05·06, 🔒 구현자가 그대로 옮길 것)

결론: 오버레이 창 속성(표시·작업표시줄·클릭 통과)은 **한 함수 `apply_overlay_window`가 설정 스냅샷대로 매번 모두 다시 맞춘다.** 위치 초기화는 기존 이동·저장 부품(`set_position` + `persist_overlay_position`)의 조합이다. `set_settings`가 건드리면 안 되는 필드(위치·자동 실행)는 `keep_core_owned` 하나로 되돌린다.

비유: 창은 "무대 위 인형"이다. 조명(표시)·출연자 명단(작업표시줄)·유리벽(클릭 통과)을 켜고 끌 때마다 체크리스트 한 장을 처음부터 끝까지 다시 확인한다 — 커튼을 내렸다 올리면 명단이 저절로 되살아나는 무대(Windows 작업표시줄)라서, 올릴 때마다 명단을 다시 지운다. 위치 초기화는 "인형을 처음 자리(100,100)에 놓고 메모장에 적기"다.

**§1 증분**

| 요구ID | 내용 | 이 모듈의 몫 |
|---|---|---|
| SV2-03 (제안 설정 R-21·오버레이 R-28) | 위치 잠금 — 켜면 클릭 통과, 끌기 불가 | `apply_overlay_window` → `set_ignore_cursor_events(position_lock)`(창 전체가 통과 → 드래그·Ctrl+휠도 닿지 않음) |
| SV2-04 (제안 설정 R-22, D-9 대상 = 오버레이) | 작업표시줄 표시 | `apply_overlay_window` → `set_skip_taskbar(!show_in_taskbar)` |
| SV2-05 | `set_settings`가 `autostart`를 바꾸지 않음 | `keep_core_owned` |
| SV2-06 (제안 설정 R-24) | 위치 초기화 | `default_overlay_position`, `reset_overlay_position` |

**§2 증분 — 공개 API** (재노출: `mod.rs`에 `apply_overlay_window`·`default_overlay_position`, `pub use placement::{keep_core_owned, reset_overlay_position, …}`)

| 이름 | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `pub fn apply_overlay_window(app: &AppHandle, settings: &Settings) -> Result<(), WindowError>` (`mod.rs`) | 앱, 설정 스냅샷 | () | `NotFound`, `Tauri` | SV2-03·04, OV-R-13(표시) |
| `pub fn apply_overlay_settings(app: &AppHandle, s: &OverlaySettings) -> Result<(), BridgeError>` (**기존, 유지·폐기 예정**) | — | — | — | bridge 전환 뒤 삭제(후속 W-1) |
| `pub fn keep_core_owned(incoming: Settings, current: &Settings) -> Settings` (`placement.rs`) | 들어온 설정(값 이동), 현재 메모리 설정 | `overlay.x/y`·`autostart`만 `current` 값 | 없음(순수) | SV2-05, OV-R-13 |
| `pub fn default_overlay_position() -> Point` (`mod.rs`) | — | (100, 100) = `Settings::default().overlay` | 없음(순수) | SV2-06, OV-R-13 |
| `pub fn reset_overlay_position(app: &AppHandle, settings: &Mutex<Settings>, path: &Path) -> Result<Settings, WindowError>` (`placement.rs`) | 앱, 설정 상태, settings.json 경로 | 이동·저장 후 설정 스냅샷 | `NotFound`, `Tauri`, `StatePoisoned`, `Settings` | SV2-06 |

- `keep_overlay_position`(기존 공개)은 그대로 둔다 — `keep_core_owned`가 안에서 쓰고 K1~K5 테스트가 남는다.
- 새 `WindowError` 변형 없음.

**규칙**

```rust
/// 오버레이 창 상태를 설정대로 맞춘다. 멱등. 창 위치는 읽지도 옮기지도 않는다(§2.1.1).
/// 순서 고정: ① 표시/숨김 ② 작업표시줄 ③ 클릭 통과. 중간 실패는 그 오류를 반환하고 앞 단계는
/// 되돌리지 않는다(다음 호출이 다시 맞춘다).
pub fn apply_overlay_window(app: &AppHandle, settings: &Settings) -> Result<(), WindowError> {
    let win = overlay(app)?;
    if settings.overlay.visible {
        win.show()?;
    } else {
        win.hide()?;
    }
    win.set_skip_taskbar(!settings.show_in_taskbar)?;
    win.set_ignore_cursor_events(settings.position_lock)?;
    Ok(())
}

/// (100, 100) — 화면 밖 폴백과 위치 초기화의 단일 출처. Windows 가상 화면의 주 모니터 원점은
/// 항상 (0,0)이라 이 점은 주 모니터 안이다.
pub fn default_overlay_position() -> Point {
    let d = Settings::default().overlay;
    Point { x: d.x, y: d.y }
}

/// set_settings 입력에서 core 만 바꾸는 필드를 현재값으로 되돌린다(순수).
/// 대상: overlay.x/y(위치 주인 = 창), autostart(주인 = set_autostart·시작 보정, tray.md §7).
pub fn keep_core_owned(incoming: Settings, current: &Settings) -> Settings {
    Settings {
        autostart: current.autostart,
        ..keep_overlay_position(incoming, current)
    }
}

/// 기본 위치로 옮기고 저장한다. 표시·잠금·작업표시줄은 바꾸지 않는다. 숨김이어도, 위치 잠금 중에도
/// 옮긴다(프로그램 이동). 이미 기본 위치면 저장 없이 현재 스냅샷을 돌려준다.
pub fn reset_overlay_position(
    app: &AppHandle,
    settings: &Mutex<Settings>,
    path: &Path,
) -> Result<Settings, WindowError> {
    let pos = super::default_overlay_position();
    super::overlay(app)?.set_position(Position::Physical(PhysicalPosition { x: pos.x, y: pos.y }))?;
    match persist_overlay_position(settings, path, pos)? {
        Some(saved) => Ok(saved),
        None => Ok(settings.lock().map_err(|_| WindowError::StatePoisoned)?.clone()),
    }
}
```

- `resolve_overlay_position`의 폴백(`placement.rs:91-92`)은 `super::default_overlay_position()`으로 바꾼다(값 동일, 단일 출처).
- **재적용 근거(작업표시줄)**: tao 0.35.3은 `set_skip_taskbar`를 `ITaskbarList::DeleteTab`/`AddTab`으로 하고, 다시 적용하는 때는 탐색기 재시작(`TaskbarCreated`)뿐이다(`platform_impl/windows/event_loop.rs:2250-2252`). 숨김 → 표시에서 셸이 버튼을 되살리는지는 수동 W4로 기록하되, 결과와 무관하게 **표시 뒤에 매번 다시 적용**한다(멱등·저비용이라 실측 결과로 코드가 갈리지 않게). 그래서 순서가 "표시 먼저, 작업표시줄 다음"이다.
- **클릭 통과**: tao는 `WS_EX_TRANSPARENT|WS_EX_LAYERED` 창 플래그로 저장해(`window.rs:566-576`) 숨김·표시에도 남지만 같은 이유로 매번 다시 적용한다. 잠금 중에는 오버레이의 드래그 영역·Ctrl+휠이 입력을 받지 못한다(🔒 요구 — D-7: 잠금 중 배율은 설정 창 슬라이더로). 잠금 해제 경로는 설정 창뿐(02-design §5.1 R-4).
- **호출 지점(오버레이를 보이게 하는 모든 경로)**: ① bridge `set_settings` 4단계 ② bridge `set_overlay_visible` ③ tray 「표시/숨김」([tray.md](tray.md) §3.3) ④ `lib.rs` setup(아래). `restore_overlay_position`의 표시/숨김은 그대로 두고 ④가 이어서 속성을 맞춘다.
- **위치 초기화 × 드래그 디바운스**: `set_position`이 `Moved(기본 위치)`를 낸다 → 저장 스레드의 대기 위치가 최신값(기본 위치)으로 바뀐다 → 500ms 뒤 `persist`는 메모리 값과 같아 no-op. 드래그 대기 위치 P가 초기화 직전에 먼저 저장되더라도 그 뒤 도착하는 `Moved(기본)`이 마지막 저장이 되므로 **최종 위치 = 기본 위치**(채널은 FIFO, 디바운스는 마지막 값). 이미 기본 위치라 `Moved`가 안 나면 대기 위치도 있을 수 없다.

**§4 증분 — 앱 시작 순서 (`lib.rs` setup)**: 기존 0 리사이즈 → 1 복원 → 2 화면 밖 보정 저장 뒤,
3. **`window::apply_overlay_window(&handle, &settings)`** — 기존 `window::set_overlay_visible(&handle, settings.overlay.visible)`(`lib.rs:132-134`)를 이것으로 **교체**(표시 + 잠금 + 작업표시줄). 실패 → `log::warn!` 후 계속.
4. `watch_overlay_moves`(기존).
5. **`spawn_autostart_sync(handle.clone())`**([tray.md](tray.md) §4, lib.rs 비공개 함수).
- setup 클로저가 이미 50줄을 넘는다(golden-principles §1) → 4단계 오버레이 부분을 `fn setup_overlay(handle: &AppHandle, settings: &Settings, manifest: &AssetManifest)`로 뽑는다(동작 불변).
- `tauri.conf.json` 오버레이 `skipTaskbar: true`는 그대로(3단계 전까지의 초기값 = 기본값 `show_in_taskbar: false`와 같다).
- plugin-autostart 초기화(`lib.rs:58-62`)는 **이번 core 세션에서 지우지 않는다**([tray.md](tray.md) §9 제거 순서).

**§7 증분 — 설정 의존**: 읽음 `position_lock`(false)·`show_in_taskbar`(false)·`overlay.visible` — `apply_overlay_window` 인자로. 씀 `overlay.x/y` — `reset_overlay_position`(`persist_overlay_position` 경유, 값이 다를 때만). `autostart`는 `keep_core_owned`가 옮겨 적기만 한다(값 불변).

**§8 증분 — 테스트**

단위 — `placement.rs`·`mod.rs` `#[cfg(test)]` (`cur` = §8.6과 같음 + `autostart = false`)

| # | 이름 | 입력 | 기대 |
|---|---|---|---|
| K6 | `keep_core_owned_keeps_autostart_and_position` (C-4) | incoming = `cur` 복제 + `autostart = true`, `overlay = {100,100,false}`, `scale = 1.5`, `language = Ja`, `position_lock = true`, `show_in_taskbar = true` | `autostart == false`, x/y = (1500, 800), `visible == false`, `scale == 1.5`, `language == Ja`, `position_lock`, `show_in_taskbar` (나머지는 입력값) |
| K7 | `keep_core_owned_remerge_uses_latest_autostart` | K6 결과를 `cur2`(= `cur` + `autostart = true`, x/y (1600, 900))로 재병합 | `autostart == true`, x/y = (1600, 900) — `set_autostart`가 `set_settings` 도중 끝나도 옛 값으로 덮이지 않음 |
| D1 | `default_overlay_position_is_settings_default` (C-6) | — | `== Point { x: 100, y: 100 }`이고 `Settings::default().overlay`의 x/y와 같음 |
| D2 | `resolve_fallback_uses_default_overlay_position` | U3 입력 | `== default_overlay_position()` |

- 기존 K1~K5·U1~U14·I1~I4·S1~S12 전건 PASS(K4는 `keep_overlay_position`이 `autostart`를 입력값으로 두는 기존 단언 그대로 — 두 함수의 차이가 테스트로 드러난다).
- `apply_overlay_window`·`reset_overlay_position`은 Tauri 런타임 의존 → 수동. `reset`의 저장 부분은 I1~I3(`persist`)이 덮는다.

수동 체크리스트 (실행 증거: `/run-app` 스크린샷 + `settings.json` 캡처)

| # | 절차 | 기대 |
|---|---|---|
| W1 | 설정 창 위치 잠금 켜기 → 오버레이 위 클릭·드래그·Ctrl+휠 | 클릭이 아래 앱으로 간다, 끌리지 않는다, 배율 안 바뀜. 끄면 모두 복귀 |
| W2 | 잠금 켠 채 재시작 | 잠금 유지(시작 3단계) |
| W3 | 작업표시줄 표시 켜기 / 끄기 | 오버레이 버튼 생김 / 사라짐. 설정 창 버튼은 영향 없음(D-9) |
| W4 | 표시 켠 상태·끈 상태 각각에서 트레이 숨김 → 표시 | 켠 상태: 버튼 유지. 끈 상태: 버튼 안 생김. **재적용 없이도 유지되는지는 기록만**(코드는 항상 재적용) |
| W5 | 작업표시줄 표시 켠 채 재시작 | 버튼 있음 |
| W6 | 오버레이를 보조 모니터로 옮기고 1초 뒤 「위치 초기화」 | (100,100)으로 이동, `settings.json` `overlay` (100,100), 설정 창에 `settings://changed` 반영, 1초 뒤에도 유지 |
| W7 | 끌어 놓고 0.5초 안에 「위치 초기화」 | 최종 (100,100)(파일·창 모두) |
| W8 | 숨김 상태에서 초기화 → 트레이 표시 / 잠금 중 초기화 | (100,100)에 뜬다 / 잠금 유지한 채 이동 |
| W9 | 잠금 켠 상태에서 설정 창 조작 | 설정 창은 정상 클릭(잠금은 오버레이만) |

**§9 증분 — bridge 요구 명세**

| 종류 | 이름 | 요구 | 빈도 |
|---|---|---|---|
| command(기존, 의미 변경) | `set_settings` | 2·5단계 병합 `window::keep_overlay_position` → **`window::keep_core_owned`**(입력 `autostart` 무시). 4단계 `apply_overlay_settings(&app, &merged.overlay)` + `apply_autostart(..)` → **`window::apply_overlay_window(&app, &merged)?`**(자동 실행 반영 삭제). 나머지 순서 그대로 | 변경 없음 |
| command(기존) | `set_overlay_visible(visible)` | 잠금 한 블록에서 `s.overlay.visible = visible; snap = s.clone()` → 잠금 밖 `window::apply_overlay_window(&app, &snap)?` → `settings::save` → emit(재적용 — 숨김→표시 후 작업표시줄·잠금 유지) | 변경 없음 |
| command(**신규**) | `reset_overlay_position() -> Position` | `let s = window::reset_overlay_position(&app, &state.settings, &state.paths.settings_file)?` → `settings://changed`(s) emit(이미 기본 위치여도 1회 — ui 사본 교정) → `Position { x: s.overlay.x, y: s.overlay.y }` 반환. 에러 `window.not_found`·`tauri.error`·`state.poisoned`·`settings.*`(D-3 실물 표기). 등록: `invoke_handler`(bridge) | 버튼 클릭당 1회 |
| 삭제(후속) | `window::apply_overlay_settings` | bridge가 `apply_overlay_window`로 옮긴 뒤 core 후속 W-1에서 삭제 | — |
| capabilities | — | 추가 없음(창 속성은 Rust가 적용 — JS 창 권한을 늘리지 않음, 02-design §1) | — |

**§10 증분 — 요구 추적**

| 요구ID | 반영 | 상태 |
|---|---|---|
| SV2-03 — 위치 잠금(클릭 통과·끌기 불가, 재시작 유지) | §2.4 `apply_overlay_window`, 시작 3단계, W1·W2·W9 | ✅ 설계 · 소스 반영 |
| SV2-04 — 작업표시줄 표시(숨김→표시 후 유지) | §2.4 `apply_overlay_window`, 호출 지점 ①~④, W3~W5 | ✅ 설계 · 소스 반영 |
| SV2-05 — `set_settings`의 `autostart` 무시 | §2.4 `keep_core_owned`, K6·K7, §9 증분 | ✅ 설계 · 소스 반영 |
| SV2-06 — 위치 초기화(숨김·잠금 중 가능, 디바운스와 겹쳐도 기본 위치) | §2.4 `default_overlay_position`·`reset_overlay_position`, D1·D2, W6~W8 | ✅ 설계 · 소스 반영 |

**§11 증분 — 설계 결정**

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| **D26** | `keep_core_owned`를 window(`placement.rs`)에 두고 `keep_overlay_position`을 감싼다 | ① `settings::keep_core_owned`(패킷 제안) ② `keep_overlay_position`을 넓힘 ③ tray에 `keep_autostart` 별도 | ①은 settings "의미 해석 금지"·의존 방향 역전(settings.md D22). ②는 이름이 거짓이 된다. ③은 bridge가 병합을 네 번 불러야 한다. 병합 한 번에 core 소유 필드 전부 — bridge 두 번 병합(§2.1.1 D19) 구조 그대로 |
| **D27** | 새 이름 `apply_overlay_window` 추가, 옛 `apply_overlay_settings` 유지 | 옛 함수 시그니처를 `&Settings`로 변경(패킷 제안) | 시그니처를 바꾸면 bridge `commands.rs:158`이 core 세션 동안 컴파일되지 않는다(core는 bridge 파일을 못 고침 — C-8 `cargo check` 실패). 패킷 §2가 허용한 방식 |
| **D28** | 호출마다 표시 → 작업표시줄 → 클릭 통과를 **모두 재적용** | 표시 경로에서만 재적용 / 실측 뒤 분기 | 멱등·저비용. 실측 결과(W4)에 코드가 좌우되지 않는다. 작업표시줄은 표시 뒤라야 셸이 버튼을 되살리는 경우에도 남지 않는다 |
| **D29** | `reset_overlay_position(app, &Mutex<Settings>, &Path)` | 패킷 `(app, &AppState)` | window가 `lib.rs`의 `AppState`를 알면 결합이 늘고 `persist_overlay_position`과 모양이 달라진다. bridge는 `&state.settings, &state.paths.settings_file`로 부른다 |
| **D30** | `default_overlay_position() -> window::Point` | `tauri::Position` | window의 위치 타입은 `Point`(물리 px, i32). bridge 반환 `Position`은 bridge가 만든다 |
| **D31** | 이미 기본 위치여도 `reset`은 `Ok(스냅샷)` | `Option<Settings>` | bridge가 늘 같은 경로(emit·반환)를 타게 한다 |

- **후속 W-1(core)**: bridge `set_settings`가 `apply_overlay_window`로 옮긴 뒤 `apply_overlay_settings` 삭제 + `//!` [공개 API] 정리(Grep 사용처 0 확인).
- **파급(Grep 2026-09-24)**: `bridge/commands.rs:145,180`(`keep_overlay_position` → `keep_core_owned`), `:158-159`(`apply_overlay_window`, `apply_autostart` 삭제), `:302`(`set_overlay_visible` 재적용), 신규 `reset_overlay_position` command + `lib.rs` `invoke_handler`(bridge) · `lib.rs:132-134`(시작 3단계, core) · `tray/mod.rs:62-80`(`toggle_overlay`, core — tray.md §3.3) · `placement.rs:91-92`(폴백 단일 출처, core).

## 3. 내부 구조

| 파일 | 책임 | 변경 |
|---|---|---|
| `src-tauri/src/window/mod.rs` | 창 조회·이동·표시, 모니터 목록·합집합, 에러 타입, 공개 API 재노출 | `BridgeError` → `WindowError`, 신규 API 재노출(`pub use placement::{…}`, `pub use sizing::{overlay_display_size, resize_overlay, OverlaySize}`). 모니터 사각형 수집을 `fn monitor_rects(app) -> Result<Vec<ScreenBounds>, WindowError>`로 추출해 `screen_bounds`와 `restore_overlay_position`이 공유. **(CR-017) `monitor_rects`를 `pub fn list_monitors`로 이름 변경·공개**(§2.3). 모듈 `//!` [공개 API]에 `list_monitors` 추가, 문서주석 "모든 모니터 사각형 목록(물리 px, 모니터 전체 — 작업 영역 아님). ui 커서 모니터 판정·복원 판정·합집합이 공유". 오버레이 창 조회 `fn overlay(app)`는 비공개 그대로 둔다(자식 모듈 `sizing.rs`·`placement.rs`가 `super::overlay`로 접근 — Rust 비공개 항목은 하위 모듈에서 보인다) |
| `src-tauri/src/window/placement.rs` (신규) | R-13: 복원(`restore`·`resolve`), 이동 감시(`watch`), 저장(`persist`), 디바운스 상태 + 테스트 | 신규. 예상 250줄 안팎(테스트 포함) |
| `src-tauri/src/window/sizing.rs` (신규) | R-03: 표시 크기 계산(`overlay_display_size`)·창 리사이즈(`resize_overlay`) + 테스트 | 신규. 예상 120줄 안팎(테스트 포함) |

비공개 항목(placement.rs):

| 항목 | 시그니처·형태 | 책임 |
|---|---|---|
| `MoveDebounce` | `struct MoveDebounce { pending: Option<(Point, Instant)>, delay: Duration }` | 디바운스 순수 상태(시각을 인자로 받아 테스트 가능) |
| `MoveDebounce::push` | `fn push(&mut self, pos: Point, now: Instant)` | 대기 위치를 최신값으로 교체, 시각 갱신 |
| `MoveDebounce::wait_for` | `fn wait_for(&self, now: Instant) -> Option<Duration>` | 대기 위치 없으면 `None`(무기한 대기), 있으면 남은 시간(최소 0) |
| `MoveDebounce::take_if_settled` | `fn take_if_settled(&mut self, now: Instant) -> Option<Point>` | 마지막 push 후 `delay` 이상 지났으면 꺼내고 비움 |
| `MoveDebounce::take` | `fn take(&mut self) -> Option<Point>` | 채널 닫힘 시 남은 위치 flush |
| `run_saver` | `fn run_saver<F: Fn(Point)>(rx: Receiver<Point>, delay: Duration, on_settled: F)` | 저장 스레드 루프(§4) |
| `is_minimized_sentinel` | `fn is_minimized_sentinel(p: Point) -> bool` | `p.x <= -32000 && p.y <= -32000` |
| `intersection` | `fn intersection(a: &ScreenBounds, b: &ScreenBounds) -> Option<ScreenBounds>` | 교집합(면적 0이면 `None`) |

상수(placement.rs): `MOVE_SAVE_DEBOUNCE`(500ms), `MIN_VISIBLE_PX`(48), `const MINIMIZED_COORD: i32 = -32000`(비공개).

비공개 항목(sizing.rs):

| 항목 | 시그니처·형태 | 책임 |
|---|---|---|
| `BASE_BOX_W` / `BASE_BOX_H` | `const BASE_BOX_W: f64 = 450.0; const BASE_BOX_H: f64 = 350.0;` | 기준 상자(확정사항 §3 🔒). ui `BASE_BOX`(`src/bridge/types.ts`)와 같은 값 |
| `SIZE_EPSILON` | `const SIZE_EPSILON: f64 = 1e-6;` | 올림 전 부동소수 오차 흡수 |
| `normalize_scale` | `fn normalize_scale(scale: f64) -> f64` | §2.2 1단계 |
| `ceil_px` | `fn ceil_px(v: f64) -> u32` | §2.2 5단계 |

### 3.1 오버레이 창 사각형 판정 (overlay R-40, CR-062, 🔒 사용자 결정 U-1 2026-09-29 — 정본 횡단 설계 `doc/200_설계/architecture/overlay-context-menu.md` v2 §2.3·§4.2, 구현자가 그대로 옮길 것)

결론: tray가 "오른쪽 누른 곳·뗀 곳이 모두 오버레이 위인가"를 판정할 수 있도록, 보이는 오버레이 창의 **바깥 사각형**(물리 px)을 주는 `overlay_screen_rect`와 점 포함 판정 `ScreenBounds::contains`를 더한다. "오버레이 위" = **창 사각형**(투명 부분 포함)이다 — 알파 판정은 하지 않는다(횡단 D-2). 좌표계는 훅 마우스 좌표와 같다(§1 [좌표], 횡단 F7).

비유: 액자 테두리 안에 손가락이 들어왔는지만 본다. 그림이 비어 있는 투명 부분도 액자 안이다. 액자를 치워 두었으면(숨김) 판정하지 않는다.

```rust
// window/mod.rs
impl ScreenBounds {
    /// 점이 반열림 사각형 [x, x+width) × [y, y+height) 안인가(물리 px). 넘침 없게 i64로 계산한다.
    /// 너비·높이가 0이면 항상 false. 모니터 경계 판정(ui `[x, x+width)`)과 같은 규칙.
    pub fn contains(&self, x: i32, y: i32) -> bool {
        let (px, py) = (i64::from(x), i64::from(y));
        let (left, top) = (i64::from(self.x), i64::from(self.y));
        px >= left
            && px < left + i64::from(self.width)
            && py >= top
            && py < top + i64::from(self.height)
    }
}

/// 보이는 오버레이 창의 바깥 사각형(물리 px, 가상 화면 — 훅 좌표와 같은 좌표계).
/// 숨김이면 Ok(None) — 숨긴 창의 옛 자리는 판정에 쓰지 않는다(R-40 AC-4).
/// 어느 스레드에서 불러도 된다 — 창 getter 3종은 비메인 스레드면 메인 스레드와 동기 왕복한다.
/// 메인 스레드가 이벤트 핸들러 안(예: 팝업 메뉴 모달)이면 끝날 때까지 기다리므로, 호출자
/// tray `overlay-menu`는 메뉴 상태가 Idle 일 때만 부른다(tray.md §3.7.3 PU-h).
pub fn overlay_screen_rect(app: &AppHandle) -> Result<Option<ScreenBounds>, WindowError> {
    let win = overlay(app)?;
    if !win.is_visible()? {
        return Ok(None);
    }
    let pos = win.outer_position()?;
    let size = win.outer_size()?;
    Ok(Some(ScreenBounds {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
    }))
}
```

| # | 규칙 |
|---|---|
| WR-a | 바깥 사각형(`outer_position`·`outer_size`)을 쓴다. 오버레이는 테두리·제목 표시줄이 없어 바깥 = 안쪽이고, 위치 저장(R-13)과 같은 기준이다 |
| WR-b | 반열림: 왼쪽·위 가장자리는 안, 오른쪽·아래 가장자리(x+width, y+height)는 밖. `list_monitors`(§2.3)의 모니터 경계 규칙과 같다 |
| WR-c | `ScreenBounds`의 직렬화 모양(`{x, y, width, height}` camelCase)은 바뀌지 않는다 — 메서드만 는다. bridge `get_screen_bounds`·`get_monitors` 계약 영향 없음 |
| WR-d | `position_lock`(클릭 통과)은 보지 않는다 — 🔒 잠금 중에도 메뉴가 뜬다. 창 속성은 판정과 무관하다 |
| WR-e | 최소화는 따로 판정하지 않는다. 오버레이는 테두리·최소화 버튼이 없고, 최소화돼도 Windows가 창을 (−32000, −32000)으로 옮겨 실제 클릭 좌표가 그 안에 들 수 없다(§3 `is_minimized_sentinel`과 같은 사실 — D33) |

- 파일: `window/mod.rs`(271줄 → 약 330줄, 테스트 포함). 새 파일 없음. `//!` [공개 API]에 `overlay_screen_rect`, `ScreenBounds::contains` 추가, [목적]에 "오른쪽 클릭 메뉴용 창 사각형 판정(R-40)" 한 줄.
- 스레드·에러·설정: 새 스레드 없음. **호출자는 tray `overlay-menu` 스레드(비메인)**다(7차 개정, 리뷰 SEC-301 — 옛 "tray `popup_now`가 메인 스레드에서 부른다"를 대체, [tray.md](tray.md) §3.7.3 PU-h). 비메인 호출이 안전한 근거는 tauri-runtime-wry 2.12.0 `src/lib.rs`다. `is_visible`(:1939)·`outer_position`(:1886)·`outer_size`(:1894)는 `window_getter!`(:205-210)이고, `send_user_message`(:263-278)가 비메인이면 `proxy.send_event`로 넘긴 뒤 `rx.recv()`로 답을 기다린다. 창 상태는 메인 스레드에서만 읽힌다. 기다림이 길어지는 경우는 메인 스레드가 tao 핸들러 안에 머물 때(tao 0.37.1 `runner.rs:143-148·208-226` 버퍼링)뿐이다. 우리 팝업 모달과 겹치지 않게 하는 것은 호출자 몫이다(Pending·Open이면 부르지 않음). 함수 본문·시그니처는 **불변**이고 문서 주석의 스레드 문장만 바뀐다. 새 에러 변형 없음(`NotFound`·`Tauri`만. 앱 종료로 답이 버려지면 `Tauri`(`FailedToReceiveMessage`)). 설정을 읽지도 쓰지도 않는다.
- 테스트: §8.8 WR1~WR3. `overlay_screen_rect`는 Tauri 런타임이 필요해 수동([tray.md](tray.md) §8.3 MC-31·MC-35·MC-36·MC-45 ③).
- 파급: 신규만. 호출자는 `tray/popup.rs` 하나. 기존 `ScreenBounds` 사용처(`bridge/types.rs:18` 재노출, `placement.rs`, `list_monitors`, `union`)는 바뀌지 않는다.

### 3.2 항상 위 재적용 (WT-01~WT-09, overlay R-01 🔒 보강 — 사용자 결정 2026-10-05, 구현자가 그대로 옮길 것)

결론: 오버레이가 다른 창 아래로 밀려도 **전경 창이 바뀔 때마다·창 속성을 적용할 때마다·트레이 「새로고침」 때** Win32 `SetWindowPos(HWND_TOPMOST)`로 다시 맨 위에 올린다. Win32 호출은 전부 hook의 안전 래퍼([hook.md](hook.md) §3.11 `topmost.rs`, U20~U27)가 하고, window는 **대상 등록·해제와 즉시 1회 요청**만 한다. 사용자가 숨긴 오버레이(`overlay.visible=false`)는 절대 올리거나 보이지 않는다.

비유: 게시판 맨 위에 붙인 공지(오버레이)가 누가 다른 종이를 덧붙이면 가려진다. 이제는 게시판 관리인(hook 스레드)이 "누가 게시판을 건드렸다"는 소리(전경 창 변화)가 날 때마다 공지를 다시 맨 위로 꽂는다. 공지를 떼어 둔 상태(숨김)면 관리인 명단에서 지워 두므로 다시 꽂지 않는다.

#### 3.2.1 원인과 요구

- 결함(베타 제보·사용자 재현 2026-10-05): 여러 창을 오가다 오버레이가 다른 창 아래에 깔리고, 트레이 「숨기기→표시」로도 돌아오지 않는다.
- 근거(메인 세션 확인, tao 0.37.1 `window_state.rs` `apply_diff`): 항상 위는 `tauri.conf.json` `alwaysOnTop: true` 한 번뿐이다. tao의 플래그 캐시가 이미 `ALWAYS_ON_TOP=true`라 `set_always_on_top(true)`는 diff가 없어 무효다. 표시 전환은 `SetWindowLongW(GWL_EXSTYLE)`로 스타일 비트만 쓰고 `SetWindowPos`를 `SWP_NOZORDER`로 부르므로 Z 순서가 복구되지 않는다. 그래서 **Tauri API가 아니라 Win32 `SetWindowPos(HWND_TOPMOST)` 직접 호출**이 필요하다.
- 풀리는 트리거(OS·다른 앱의 `HWND_NOTOPMOST` 등)는 특정하지 못했다. 이 설계는 트리거와 무관하게 복구 경로를 만든다.

| 설계ID | 내용 | 근거(🔒 사용자 결정 2026-10-05) | 담당 |
|---|---|---|---|
| WT-01 | 재적용 = `SetWindowPos(hwnd, HWND_TOPMOST, 0,0,0,0, SWP_NOMOVE｜SWP_NOSIZE｜SWP_NOACTIVATE｜SWP_ASYNCWINDOWPOS)` 1회. tao 캐시를 거치지 않는다 | 배경 분석 | hook `topmost.rs` U27 |
| WT-02 | 트리거 ⓐ 전경 창 변화 — `SetWinEventHook(EVENT_SYSTEM_FOREGROUND, WINEVENT_OUTOFCONTEXT｜WINEVENT_SKIPOWNPROCESS)`를 훅 스레드의 기존 메시지 루프에 붙인다. 주기 폴링 없음 | 결정 2ⓐ | hook §3.11 |
| WT-03 | 트리거 ⓑ `apply_overlay_window` 끝(④단계)·`set_overlay_visible` 표시 경로 끝 — 대상 등록 + 즉시 1회 | 결정 2ⓑ | **window(이 절)** |
| WT-04 | 트리거 ⓒ 트레이 「새로고침」 — 등록된 대상에 즉시 1회 | 결정 2ⓒ | [tray.md](tray.md) §3.8 |
| WT-05 | `overlay.visible=false`면 절대 올리거나 보이지 않는다. 숨길 때 **숨기기 전에** 대상 등록을 해제하고, 등록이 없으면 어떤 트리거도 아무것도 하지 않는다 | 결정 3 | window(등록) + hook(판정) |
| WT-06 | 최소화(`IsIconic`)이고 보이는 창이면 `ShowWindowAsync(SW_SHOWNOACTIVATE)`로 복원한 뒤 WT-01 | 결정 4 | hook U25·U26 |
| WT-07 | 포커스를 빼앗지 않는다(`SWP_NOACTIVATE`·`SW_SHOWNOACTIVATE`). 다른 앱이 전체 화면이어도 판정 없이 재적용한다(R-40 U-3 생략 규칙과 무관) | 결정 1·5 | hook |
| WT-08 | 무효·재사용 HWND 방어 — 매번 `IsWindow` + 창 pid == 자기 pid를 확인. 오버레이 `Destroyed` 때 등록 해제. 앱·훅 종료 시 `UnhookWinEvent` | 위임문 설계 요구 | hook U22·U23·U21, `lib.rs` |
| WT-09 | 과잉 방지·로그 — 트리거 1건당 `SetWindowPos` 최대 1회. 로그는 `kuro_diag` debug에 동작 종류·누적 횟수만. 창 제목·클래스명은 조회도 기록도 하지 않는다(P7) | 위임문 설계 요구 | hook |

#### 3.2.2 window 공개 API 변경 (§2 증분 — 시그니처 불변, 동작 추가)

| 함수 | 변경 | 설계ID |
|---|---|---|
| `pub fn apply_overlay_window(app: &AppHandle, settings: &Settings) -> Result<(), WindowError>` | 순서 ① 표시/숨김 ② 작업표시줄 ③ 클릭 통과 **④ 항상 위 재적용(보일 때만)**. 숨길 때는 ①의 `hide()` **앞에서** 등록 해제 | WT-03·WT-05 |
| `pub fn set_overlay_visible(app: &AppHandle, visible: bool) -> Result<(), BridgeError>` | 표시면 `show()` 뒤 ④와 같은 처리, 숨김이면 `hide()` 앞에서 등록 해제. 반환 타입 불변(`BridgeError` 임시 유지 — §11 파급) | WT-03·WT-05 |

새 공개 함수는 없다. 비공개 도우미 2개를 `window/mod.rs`에 둔다.

```rust
use crate::hook::{self, OverlayHwnd};

/// ④ 항상 위 재적용 대상 등록 + 즉시 1회(WT-03). **보이는 상태(설정 visible=true)일 때만** 부른다.
/// HWND 값은 정수로만 옮긴다 — 포인터→정수 `as` 변환은 안전 Rust이고, window는 `windows`
/// 크레이트를 import하지 않는다(Tauri의 `HWND`는 Tauri가 쓰는 windows 버전의 타입이라 우리
/// 0.58 `HWND`와 타입이 다르다 — 정수로 건너면 버전 차이가 문제되지 않는다).
fn keep_overlay_on_top(win: &tauri::WebviewWindow) -> Result<(), WindowError> {
    let raw = win.hwnd()?.0 as isize;
    hook::set_topmost_target(OverlayHwnd::from_raw(raw));
    hook::reassert_topmost_now();
    Ok(())
}

/// 숨기기 전에 부른다(WT-05). 이후 어떤 트리거도 오버레이를 건드리지 않는다.
fn release_overlay_top() {
    hook::set_topmost_target(None);
}

pub fn apply_overlay_window(app: &AppHandle, settings: &Settings) -> Result<(), WindowError> {
    let win = overlay(app)?;
    if settings.overlay.visible {
        win.show()?;
    } else {
        release_overlay_top();
        win.hide()?;
    }
    win.set_skip_taskbar(!settings.show_in_taskbar)?;
    win.set_ignore_cursor_events(settings.position_lock)?;
    if settings.overlay.visible {
        keep_overlay_on_top(&win)?;
    }
    Ok(())
}

pub fn set_overlay_visible(app: &AppHandle, visible: bool) -> Result<(), BridgeError> {
    let win = overlay(app)?;
    if visible {
        win.show()?;
        keep_overlay_on_top(&win)?;
    } else {
        release_overlay_top();
        win.hide()?;
    }
    Ok(())
}
```

- `win.hwnd()`는 Tauri 2.12.0 `WebviewWindow::hwnd(&self) -> crate::Result<HWND>`(안전 함수, `webview_window.rs:1971`). `?`는 기존 `WindowError::Tauri`로 바뀐다 — **새 에러 변형 없음**.
- `OverlayHwnd::from_raw(0)`은 `None`이라 등록 해제와 같다(HWND가 비정상으로 0이면 아무것도 하지 않음).
- 순서 근거: ④를 끝에 둔 것은 결정 2ⓑ "표시·속성 적용 끝에"를 따른 것이다. `set_skip_taskbar`·`set_ignore_cursor_events`는 Z 순서를 바꾸지 않지만, 앞으로 단계가 늘어도 마지막에 다시 올리면 안전하다.
- 비메인 스레드 호출: bridge command가 비메인 스레드에서 부르면 Tauri `show()`는 메인 스레드로 비동기 전달돼 ④ 시점에 아직 안 보일 수 있다. hook 판정은 "보이지 않으면 복원(ShowWindow)은 하지 않고 Z 순서만 올린다"(hook.md §3.11.3 TP5·TP6)라서, 숨김 상태 창의 Z 순서만 먼저 맨 위로 잡히고 이어서 `show()`가 그 자리에서 보인다. 창을 보이게 만드는 것은 여전히 `show()`뿐이다.
- `placement::restore_overlay_position`(시작 시 1회)의 `show()`/`hide()`는 바꾸지 않는다. setup은 바로 뒤에 `apply_overlay_window`를 불러 등록을 맞춘다(`lib.rs` `setup_overlay` 순서). 시작 전 등록은 비어 있다(정적 초기값 0).
- `lib.rs` `on_window_event`(core-implementer): 라벨 `overlay`의 `WindowEvent::Destroyed`면 `hook::set_topmost_target(None)`(WT-08). 정상 운영에서 오버레이는 파괴되지 않는다 — 방어용 한 줄이다.

#### 3.2.3 스레드·채널 (§4 증분 — 새 스레드·채널 없음)

```
[메인 스레드 또는 command 스레드]                         [win32-input-hook 스레드 (기존)]
 apply_overlay_window / set_overlay_visible              GetMessageW 루프
   표시 → show() → keep_overlay_on_top                     ├ 저수준 키보드·마우스 콜백(기존)
            ├ hook::set_topmost_target(Some(h)) ─┐         └ WinEvent 콜백(EVENT_SYSTEM_FOREGROUND, 다른 프로세스만)
            └ hook::reassert_topmost_now() ──┐   │              └ reassert(TARGET) ── 같은 판정·같은 Win32 호출
   숨김 → set_topmost_target(None) → hide()  │   ▼
 tray 「새로고침」 → hook::reassert_topmost_now()  [정적 TARGET: AtomicIsize — 0 = 등록 없음]
                                             ▼
                         판정 decide(등록, 자기 창, 보임, 최소화) → SetWindowPos(…ASYNCWINDOWPOS) [+ ShowWindowAsync]
                                             │ (비동기 요청 — 메인 스레드가 자기 메시지 루프에서 처리)
                                             ▼
                                   [메인 스레드] 오버레이 Z 순서 = 맨 위
```

- 공유 상태는 hook의 원자 변수 `TARGET` 하나다. 잠금이 없어 교착 경로가 없다.
- 종료: 트레이 「종료」(`app.exit(0)`) → 오버레이 `Destroyed`면 등록 해제. 훅 스레드는 `HookHandle` 종료 경로에서 `UnhookWinEvent` 후 끝난다([hook.md](hook.md) §3.11.5). 프로세스가 먼저 끝나도 OS가 WinEvent 훅을 함께 거둔다.

#### 3.2.4 테스트 (§8 증분)

- 단위: 판정 순수 함수 `decide`·`OverlayHwnd::from_raw`는 hook `topmost.rs`의 TP1~TP8([hook.md](hook.md) §3.11.6). window 도우미 2개는 Tauri 런타임이 필요해 자동 테스트 없음 — 코드 리뷰 + 아래 수동.
- 수동 MC-51~MC-62(`yarn tauri dev`와 release 각각, `RUST_LOG=kuro_diag=debug`, 증거는 `/run-app` 스크린샷·로그를 `doc/300_검증/`에). **강제 해제 재현**: 트리거를 특정하지 못했으므로 PowerShell로 직접 `HWND_NOTOPMOST`를 걸어 결함 상태를 만든다.

```powershell
# 결함 상태 만들기(MC-52~MC-54): 오버레이 창을 항상 위에서 내린다. 창 제목은 tauri.conf.json의 오버레이 title.
Add-Type -Name W -Namespace K -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int cx, int cy, uint f); [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindow(string c, string t);'
$h = [K.W]::FindWindow($null, "<오버레이 창 제목>")
[K.W]::SetWindowPos($h, [IntPtr](-2), 0, 0, 0, 0, 0x13)   # HWND_NOTOPMOST, NOSIZE|NOMOVE|NOACTIVATE
```

| # | 조건 | 절차 | 기대 | 설계ID |
|---|---|---|---|---|
| MC-51 | 제보 재현 | 그림 앱(레이어 패널 등 보조 창 포함)·브라우저·메모장을 5분 이상 오가며 클릭·Alt+Tab | 오버레이가 다른 창 아래에 남지 않는다. 잠깐 가려져도 다음 창 전환 때 바로 위로 온다 | WT-01·WT-02 |
| MC-52 | 강제 해제 → ⓐ | 위 스크립트로 내린 뒤 메모장을 오버레이 위로 끌어 겹치고 → 다른 앱 창 클릭 | 클릭(전경 변화) 직후 오버레이가 메모장 위로 온다. 로그에 재적용 1줄도 남지 않는다(콜백은 로그 없음 — 누적 횟수는 다음 ⓑ·ⓒ 줄에서 늘어난 값으로 확인) | WT-02 |
| MC-53 | 강제 해제 → ⓑ | 내린 뒤 트레이 「표시/숨김」 두 번 | 다시 보일 때 맨 위. 로그 `topmost reassert … action=Raise` | WT-03 |
| MC-54 | 강제 해제 → ⓒ | 내린 뒤 트레이 「새로고침」 | 맨 위. 로그 `action=Raise`(트레이 클릭으로 ⓐ도 함께 일어날 수 있어 화면만으로는 구분되지 않는다 — 로그 줄로 ⓒ 실행을 확인) | WT-04 |
| MC-55 | 🔒 숨김 유지 | 트레이로 숨긴 뒤 창 전환 20회·「새로고침」·설정 창에서 다른 설정 저장 | 오버레이가 한 번도 보이지 않는다. 로그 `action=Skip` | WT-05 |
| MC-56 | 🔒 최소화 | ① Win+D ② Win+M ③ 바탕 화면 보기(작업표시줄 오른쪽 끝) | 바탕 화면이 보인 직후 오버레이가 다시 보이고 맨 위다. 포커스는 바탕 화면에 남는다. **관찰 기록**: 각 경우 오버레이가 실제로 최소화됐는지(로그 `RestoreThenRaise` 여부) | WT-06 |
| MC-57 | 🔒 포커스 | 메모장에 타자하면서 Alt+Tab·클릭으로 창 전환 반복, R-40 오른쪽 클릭 메뉴 열기·닫기, 설정 창 열기 | 키 입력은 늘 사용자가 고른 창으로 간다. 오른쪽 클릭 메뉴가 오버레이 뒤로 가려지지 않는다. 설정 창은 정상 조작된다(오버레이가 설정 창 위에 뜨는 것은 원래 동작) | WT-07 |
| MC-58 | 🔒 전체 화면 | 브라우저 F11·동영상 전체 화면·테두리 없는 전체 화면 게임 | 오버레이가 그 위에 보인다. **독점 전체 화면 게임은 관찰**: 게임 최소화·화면 깜박임·프레임 저하 여부 기록(§11 D37) | WT-07 |
| MC-59 | 입력 지연 | Alt+Tab을 1초에 여러 번 누르며 다른 손으로 타자·마우스 이동 1분 | 키·마우스 입력 지연·누락 없음(hook.md H4와 같음), CPU 급증 없음 | WT-02·WT-09 |
| MC-60 | 다른 항상 위 앱 | 작업 관리자 「옵션 → 항상 위」를 켜고 두 창을 겹친 뒤 창 전환 반복 | 전경이 바뀔 때마다 오버레이가 위로 온다. 두 창이 서로 번갈아 끝없이 깜박이지 않는다(되먹임 없음) | WT-01·WT-02 |
| MC-61 | 종료 | 트레이 「종료」 뒤 창 전환·타자 | 오류 대화상자·잔존 프로세스 없음, 시스템 입력 정상(hook.md H5) | WT-08 |
| MC-62 | 개인정보 | MC-51~MC-61 뒤 `.dev-tauri.log` 확인 | `topmost` 줄에는 동작 종류·누적 횟수만 있다. 창 제목·클래스명·pid 없음 | WT-09 |

## 4. 스레드·채널

```
[Tauri 메인 스레드 — 이벤트 루프]
  overlay 창 WindowEvent::Moved(pos)            (드래그 중 연속 발생, 프로그램 이동 때도 발생)
    └ on_window_event 클로저: 최소화 좌표 거르기 → tx.send(Point)      ← 잠금·IO·로그 없음
                    │  std::sync::mpsc::Sender<Point>  (단방향, 클로저가 소유)
                    ▼
[overlay-move-saver 스레드 — watch_overlay_moves 가 1개 spawn]
  loop {
    대기 위치 없음 → rx.recv()              (블로킹, busy loop 없음)
    대기 위치 있음 → rx.recv_timeout(남은 시간)
      Ok(p)            → debounce.push(p, now)
      Timeout          → (아래 settled 검사)
      Disconnected     → debounce.take() 있으면 on_settled 1회 → 종료
    debounce.take_if_settled(now) → Some(p) 이면 on_settled(p)
  }
                    │  on_settled: 호출자(lib.rs setup)가 넘긴 클로저
                    ▼
  window::persist_overlay_position(&AppState.settings, &paths.settings_file, pos)
     잠금: 비교·메모리 갱신·clone (한 블록)  →  잠금 해제  →  settings::save(스냅샷)
  └ Ok(Some(s)) → bridge::events::emit_settings_changed(app, &s)   (bridge 함수, 실패는 경고 로그)
    Ok(None)    → 아무것도 안 함 (프로그램 이동·같은 자리)
    Err(e)      → log::warn!
```

- 디바운스 500ms: 끄는 도중 0.5초 이상 멈추면 중간 저장이 한 번 더 생길 수 있으나 무해하다(마지막 위치가 결국 저장된다). 디스크 쓰기는 최악에도 초당 2회를 넘지 않는다.
- 프로그램 이동(`set_overlay_position` command, 시작 시 복원)도 `Moved`를 낸다. `persist`가 메모리 값과 비교하므로 **쓰기·emit이 생기지 않는다**. `set_settings`는 창을 옮기지 않으므로(2026-09-23, §2.1.1) `Moved` 자체를 만들지 않는다.

### 리사이즈 흐름 (OV-R-03)

새 스레드·채널은 없다. 모든 호출은 Tauri 메인 스레드(setup, 동기 command)에서 일어난다.

```
[호출 지점 — Tauri 메인 스레드]
  ① 앱 시작 setup                       : 설정·매니페스트 로드 직후, 위치 복원보다 먼저
  ② set_settings command                : 이전 scale ≠ 새 scale 일 때
  ③ import_asset / remove_asset command : 슬롯이 캔버스 레이어(slot.is_canvas_layer())일 때
        (= background·body·idle·rest·slam·kb_up·kb_down. 마우스 파츠 3종 제외.
         2026-09-23 배경 슬롯 추가 — assets.md §3.4. 이 문서의 "상태 레이어"는 모두 이 뜻)
        │ canvas = manifest.canvas.map(|c| (c.width, c.height))   scale = 설정 값(잠금 한 줄로 복사)
        ▼
  window::resize_overlay(app, canvas, scale)
     overlay_display_size (순수) → set_size(Logical) → SetWindowPos(SWP_NOMOVE)
        ├ WM_SIZE → WindowEvent::Resized       (window는 구독하지 않음)
        └ SWP_NOMOVE → tao가 Moved 를 내지 않음 → overlay-move-saver 스레드는 깨지 않음
```

- 잠금: 호출자는 설정 `Mutex`를 쥔 채 `resize_overlay`를 부르지 않는다(스킬 §4). `scale`을 복사하고 잠금을 푼 뒤 부른다.
- R-13과의 상호작용: 리사이즈는 위치를 바꾸지 않고 `Moved`도 내지 않으므로 위치 저장·`settings://changed`가 생기지 않는다. 설령 다른 경로로 같은 자리의 `Moved`가 와도 `persist`의 비교가 no-op으로 막는다(이중 안전).
- DPI가 다른 모니터로 끌어 옮기면 Windows가 `WM_DPICHANGED`로 창을 옮기고 tao가 **논리 크기를 보존**해 물리 크기를 다시 잡는다(tao 0.35.3 `event_loop.rs` 1966–1973행). 논리 px로 지정했으므로 창과 CSS 콘텐츠가 계속 일치한다. 이때의 `Moved`는 실제 이동이라 R-13 규칙대로 저장된다.

### 앱 시작 순서 (`lib.rs` setup 5단계 `setup_overlay` — 설계 당시 4단계, 2026-10-15 doc-sync 번호 현행화)

0. (OV-R-03) `assets::load_manifest(&paths.assets_dir)` — 실패는 경고 로그 후 `canvas = None`(ui도 매니페스트 실패 시 빈 매니페스트로 동작). → `window::resize_overlay(&handle, canvas, settings.scale)` — 실패는 경고 로그 후 계속.
1. `window::restore_overlay_position(&handle, &settings.overlay)` — 실패는 경고 로그 후 계속(기존 `apply_overlay_settings` 호출을 대체).
2. 반환 위치 ≠ 저장 위치(화면 밖 보정) → `window::persist_overlay_position(&state.settings, &state.paths.settings_file, pos)` — 실패는 경고 로그.
3. `window::watch_overlay_moves(&handle, 콜백)` — 실패는 경고 로그(위치 저장만 안 될 뿐 앱은 동작).
- **현재 소스(2026-10-15 doc-sync, `lib.rs:385-425` `setup_overlay`)**: `resize_overlay` → `restore_overlay_position` → 보정 저장 → **`apply_overlay_window`**(§2 SV2 「§4 증분」) → `watch_overlay_moves`. setup 1단계는 기본 그림 시딩 → 내장 프리셋 시딩(PS-11) → `load_manifest` 순서다(`lib.rs:117-119`). 그래서 0단계의 매니페스트는 시딩 뒤 값이다. 자동 실행 보정은 setup 6단계다([tray.md](tray.md) §4).
- 0이 1보다 먼저인 이유: `restore`는 `outer_size()`로 화면 밖 여부를 판정한다. 리사이즈 전이면 `tauri.conf.json`의 450×350으로 판정해, 25% 창(113×88)이 실제로는 화면 밖인데 "보인다"고 오판하거나 200% 창의 가시 영역을 과소 계산한다. setup은 메인 스레드이므로 `set_size`가 즉시 처리돼 이어지는 `outer_size()`가 새 크기를 돌려준다는 전제다(수동 R10으로 확인).
- 1·2가 3보다 먼저인 이유: 복원 이동이 만든 `Moved`는 이벤트 루프 시작 뒤 도착하고, 그때는 메모리 값이 이미 같아 no-op이다.
- 0단계의 매니페스트는 계약 v0.3 손 기준점 초기 계산(contract §5.1 ①)과 같은 값이므로 setup에서 한 번만 읽어 둘 다에 쓴다.

### 종료

- Sender는 `on_window_event` 클로저가 소유한다. 창이 파괴돼 클로저가 drop되면 `recv`가 `Disconnected` → 대기 위치 flush → 스레드 종료.
- 트레이 「종료」(`app.exit(0)`)가 먼저 프로세스를 끝내면 flush가 안 될 수 있다. **마지막 이동 후 0.5초 안에 종료하면 그 이동은 저장되지 않는다**(수용, §11 D5).
- 리사이즈는 상태를 남기지 않으므로 종료 처리가 없다.

## 5. unsafe

없음. 이동 감지는 Tauri `WindowEvent::Moved`, 모니터는 Tauri `available_monitors()`, 리사이즈는 Tauri `set_size`로 한다. R-40 창 사각형(§3.1)도 Tauri `is_visible`·`outer_position`·`outer_size`만 쓴다(전경 창 조회 Win32는 hook의 안전 래퍼 — [hook.md](hook.md) §3.10). Win32 직접 호출(`WM_EXITSIZEMOVE` 서브클래싱 등)이 필요해지면 hook 모듈에 안전한 래퍼를 두는 방향으로 재설계한다.

- **항상 위 재적용(§3.2, 2026-10-05)도 unsafe 없음.** `SetWindowPos`·`IsIconic`·`ShowWindowAsync`·`SetWinEventHook` 등은 hook `topmost.rs`의 안전 함수 `set_topmost_target`·`reassert_topmost_now`만 부른다(SAFETY 근거 [hook.md](hook.md) §3.11.4 U20~U27). window가 하는 저수준 작업은 Tauri `hwnd()`가 준 값의 포인터→정수 변환(`as isize`, 안전 Rust)뿐이고 `windows` 크레이트를 import하지 않는다.

## 6. 에러 타입

`WindowError` (`#[derive(Debug, thiserror::Error)]`, 신규). `code()`는 기존 bridge 코드와 같게 유지해 ui 영향이 없다.

| 변형 | 한국어 메시지 | 원인 | `code()` |
|---|---|---|---|
| `NotFound(&'static str)` | {0} 창을 찾을 수 없습니다. (인자 "오버레이"/"설정") | 라벨로 창 조회 실패 | `window.not_found` |
| `NoMonitor` | 모니터 정보를 읽을 수 없습니다. | 모니터 목록이 빔(`screen_bounds`) | `window.no_monitor` |
| `Tauri(#[from] tauri::Error)` | 창을 제어하지 못했습니다: {0} | Tauri 창·모니터 API 실패(`set_size` 포함) | `tauri.error` |
| `StatePoisoned` | 설정 상태가 손상되었습니다. 앱을 다시 시작하세요. | 설정 `Mutex` 독 | `state.poisoned` |
| `Settings(#[from] SettingsError)` | {0} (`#[error(transparent)]`) | `settings::save` 실패 | 내부 `SettingsError::code()` |
| `Thread(#[source] std::io::Error)` | 창 위치 저장 스레드를 시작하지 못했습니다: {0} | 저장 스레드 spawn 실패 | `window.thread` |

- OV-R-03은 **새 변형이 없다**. `overlay_display_size`는 실패하지 않고, `resize_overlay`는 `NotFound`·`Tauri`만 낸다.
- CR-017 `list_monitors`도 **새 변형이 없다**. `Tauri`만 낸다(모니터 0개는 오류가 아니라 빈 `Vec` — §11 D23).
- R-40 `overlay_screen_rect`도 **새 변형이 없다**. `NotFound`(오버레이 창 없음)·`Tauri`만 낸다. 숨김은 오류가 아니라 `Ok(None)`. `contains`는 실패하지 않는다.
- bridge 쪽 `error.rs`에 `impl From<WindowError> for BridgeError { code(), to_string() }` 추가가 필요하다(bridge 소관, §9).

## 7. 설정 의존

| 방향 | 필드 | 기본값 | 시점 |
|---|---|---|---|
| 읽음 | `overlay.x`, `overlay.y` | 100, 100 | 시작 시 복원, `persist` 비교, `keep_overlay_position`(`set_settings`가 메모리 값을 옮겨 적음 — 값 불변, §2.1.1) |
| 읽음 | `overlay.visible` | true | 시작 시 복원 |
| 씀 | `overlay.x`, `overlay.y` | — | 이동이 500ms 멎은 뒤(값이 다를 때만), 시작 시 화면 밖 보정 때 |
| 읽음 | `Settings::default().overlay` | (100, 100) | 화면 밖 폴백 위치(기본값 단일 소스) |
| 읽음(인자로) | `scale` | 1.0 (범위 0.25~2) | 리사이즈 3시점(§4). window는 `Settings`를 직접 잠그지 않고 호출자가 값을 넘긴다 |
| 읽음 | `settings::SCALE_MIN`/`SCALE_MAX`, `Settings::default().scale` | 0.25 / 2 / 1.0 | `overlay_display_size` 배율 정규화 |

- 파일 IO는 `settings::save`만 쓴다(window가 JSON을 직접 쓰지 않음, 스킬 §1). 리사이즈는 설정을 **쓰지 않는다**(창 크기는 파생값이라 저장하지 않음).

## 8. 테스트 계획

### 8.1 단위 — `placement.rs` `#[cfg(test)]`

모니터 A = (0, 0, 1920, 1080), B = (−1920, 0, 1920, 1080), 창 450×350.

| # | 대상 | 입력 | 기대 |
|---|---|---|---|
| U1 | `resolve` | 저장 (500, 300), [A] | (500, 300) |
| U2 | `resolve` 가장자리 보존 | (1860, 100), [A] (보이는 가로 60) | (1860, 100) |
| U3 | `resolve` 가장자리 부족 | (1880, 100), [A] (보이는 가로 40 < 48) | (100, 100) |
| U4 | `resolve` 모니터 분리 | (−1500, 200), [A] | (100, 100) |
| U5 | `resolve` 보조 모니터 있음 | (−1500, 200), [A, B] | (−1500, 200) |
| U6 | `resolve` 위로 벗어남 | (100, −330), [A] (보이는 세로 20) | (100, 100) |
| U7 | `resolve` 모니터 정보 없음 | (−5000, −5000), [] | (−5000, −5000) |
| U8 | `resolve` 작은 창 | (10, 10), 창 30×30, [A] | (10, 10) (기준 `min(48, 30)`) |
| U9 | `intersection` | A와 (1900, 0, 100, 100) | `Some((1900, 0, 20, 100))`, 겹침 없으면 `None` |
| U10 | `MoveDebounce` | t0 push p1 → `wait_for(t0+100ms)` | `Some(400ms)` |
| U11 | `MoveDebounce` | t0 push p1, t0+300ms push p2 → `take_if_settled(t0+700ms)` / `(t0+800ms)` | `None` / `Some(p2)`(최신값), 이후 `wait_for` = `None` |
| U12 | `MoveDebounce::take` | push 후 `take()` | `Some`, 다시 `take()` = `None` |
| U13 | `is_minimized_sentinel` | (−32000, −32000) / (−1920, 0) | true / false |
| U14 | `run_saver` | 채널에 p1, p2를 보내고 Sender drop, delay 10ms, 콜백은 `Arc<Mutex<Vec<Point>>>`에 기록 | 콜백 정확히 1회, 값 p2 (flush 경로) |

### 8.2 통합 — tempdir (`placement.rs` 테스트 또는 `src-tauri/tests/`)

| # | 준비 | 호출 | 기대 |
|---|---|---|---|
| I1 | `Mutex::new(Settings::default())`, 빈 tempdir | `persist(&m, &path, (100,100))` | `Ok(None)`, `settings.json` 생성 안 됨 |
| I2 | 같은 상태 | `persist(&m, &path, (300,400))` | `Ok(Some(s))`, `s.overlay`=(300,400), `settings::load(&path)`의 overlay 동일, 메모리 값 동일, 다른 필드 불변 |
| I3 | I2 직후 | 같은 위치 재호출 | `Ok(None)`, 파일 수정 시각 불변 |
| I4 | 독이 든 `Mutex`(테스트 스레드에서 잠근 채 panic) | `persist` | `Err(WindowError::StatePoisoned)` |

- Tauri 런타임이 필요한 `restore_overlay_position`·`watch_overlay_moves`·`resize_overlay`는 자동 테스트하지 않는다(스킬 §9). 순수 부분(`resolve`, `MoveDebounce`, `run_saver`, `persist`, `overlay_display_size`)으로 로직을 덮는다.

### 8.3 수동 체크리스트 — 위치(OV-R-13) (실행 증거: settings.json 내용 캡처 + 로그)

| # | 절차 | 기대 |
|---|---|---|
| M1 | 오버레이를 끌어 옮기고 손을 뗀 뒤 1초 대기 | `settings.json`의 `overlay.x/y`가 새 위치(물리 px) |
| M2 | 천천히 오래 끌기(5초) | 파일 쓰기가 멈춤 구간마다 최대 1회, 마지막 위치가 저장됨 |
| M3 | 앱 종료 후 재실행 | 마지막 저장 위치에 뜬다 |
| M4 | 보조 모니터로 옮겨 저장 → 앱 종료 → 보조 모니터 분리(또는 디스플레이 설정에서 해제) → 재실행 | (100, 100)에 뜨고 `settings.json`도 (100, 100)으로 보정 |
| M5 | 설정 창을 연 상태에서 오버레이 드래그 | 설정 창이 `settings://changed`를 받아 이후 설정 저장 시 오버레이가 옛 위치로 튀지 않는다 |
| M6 | 드래그 없이 설정 창에서 배율 등만 저장 | `overlay.x/y` 불변, 추가 쓰기 없음 |
| M7 | Win+D(바탕 화면 보기) 후 복귀 | (−32000, −32000)이 저장되지 않는다 |
| M8 | 125%·150% DPI 모니터에서 M1·M3 | 복원 위치가 저장 위치와 같다(물리 px 일관) |

### 8.4 단위 — `sizing.rs` `#[cfg(test)]` (OV-R-03)

| # | 입력 (canvas, scale) | 기대 `OverlaySize` | 확인하는 것 |
|---|---|---|---|
| S1 | (900, 700), 1.0 | 450×350 | 기본 |
| S2 | (900, 700), 0.5 | 225×175 | 축소 |
| S3 | (900, 700), 2.0 | 900×700 | 상한 = 원본 |
| S4 | (900, 700), 0.25 | 113×88 | 소수 올림(112.5, 87.5) |
| S5 | (900, 700), 1.1 | 495×385 | ε — 부동소수 오차로 496이 되지 않음 |
| S6 | (612, 354), 0.5 / 1.0 / 2.0 | 225×131 / 450×261 / 900×521 | 비 9:7 캔버스, 여백 미포함(가로 기준 fit) |
| S7 | (350, 700), 1.0 | 175×350 | 세로 기준 fit |
| S8 | (300, 200), 1.0 | 450×300 | 작은 캔버스 확대(fit 1.5) |
| S9 | `None`, 1.0 / 2.0 | 450×350 / 900×700 | 캔버스 없음 → 기준 상자 |
| S10 | (900, 700), 5.0 / 0.1 / `f64::NAN` / `f64::INFINITY` | 900×700 / 113×88 / 450×350 / 450×350 | 배율 정규화(clamp, 비유한 → 1.0) |
| S11 | (0, 700), 1.0 / (900, 0), 1.0 | 450×350 / 450×350 | 0 크기 캔버스 → 기준 상자(0 나눗셈 없음) |
| S12 | 캔버스 {(900,700), (612,354), (350,700), (300,200), (1,1), (900,1)} × 배율 2.0 | 모두 `width ≤ 900 && height ≤ 700 && width ≥ 1 && height ≥ 1` | 상한·하한 성질 |

### 8.5 수동 체크리스트 — 크기(OV-R-03) (실행 증거: `/run-app` 스크린샷 + `resize_overlay` 결과 로그 `info!("오버레이 크기 {w}×{h}")`)

전제: 예시 몸통 `doc/assets/samples/body.png`(900×700) 등록, DPI 100%, ui 요구 UI-1 반영 후.

| # | 절차 | 기대 |
|---|---|---|
| R1 | 배율 100%로 시작 | 창 450×350, 캐릭터와 창 경계 일치 |
| R2 | 오버레이 위 Ctrl+휠 위로 → 200% | 창 900×700, 캐릭터 잘림 없음. 창 오른쪽 아래 구석을 잡고도 드래그 가능 |
| R3 | Ctrl+휠 아래로 → 25% | 창 113×88. 캐릭터 옆 빈 곳(창 밖)을 클릭하면 아래 앱이 클릭을 받는다 |
| R4 | 설정 창 슬라이더로 50% | 창 225×175 |
| R5 | 상태 레이어 전부 삭제 → 612×354 몸통 등록(배율 100%) | 창 450×261, 위아래 투명 여백 없음 |
| R6 | 상태 레이어 전부 삭제 | 창 = 450×350 × 배율 |
| R7 | 200%로 두고 종료 → 재실행 | 900×700으로 뜨고 위치는 저장 위치 그대로 |
| R8 | 배율을 여러 번 바꾼 뒤 `settings.json` 확인 | `overlay.x/y` 불변, 위치 저장 로그 없음(리사이즈가 R-13 저장을 일으키지 않음). 창 좌상단 화면 좌표 불변 |
| R9 | 125%·150% DPI 모니터에서 R1·R2 / 다른 DPI 모니터로 드래그 | 창 물리 크기 ≈ 논리 크기 × DPI(예: 150%에서 100% 배율 = 675×525), 콘텐츠와 창 경계 일치 유지 |
| R10 | 25%로 두고 창 대부분을 화면 왼쪽 밖(보이는 부분 < 48px)에 둔 채 종료 → 재실행 | (100,100)으로 보정된다(시작 판정이 450×350이 아니라 113×88로 이뤄졌다는 증거) |
| R11 | Ctrl+휠을 여러 번 | WebView 자체 확대(글자·레이어가 창과 다른 비율로 커짐)가 일어나지 않는다 — 일어나면 CSS px ≠ 논리 px가 되어 창 크기가 어긋난다 |

### 8.6 위치 불간섭 (OV-R-13, §2.1.1)

단위 — `placement.rs` `#[cfg(test)]`. `cur` = `Settings::default()`에 `overlay = { x: 1500, y: 800, visible: true }`, `scale = 1.0`. 비교는 필드별.

| # | incoming | 기대 `keep_overlay_position(incoming, &cur)` | 확인하는 것 |
|---|---|---|---|
| K1 | `cur` 복제 + `scale = 1.5`, `overlay = {100, 100, true}`(기본값 사본) | `overlay.x/y` = (1500, 800), `scale` = 1.5 | 신고 재현 — 낡은 사본의 기본 x/y가 버려지고 배율은 반영 |
| K2 | `overlay = {-1920, 0, true}`, 나머지 `cur`와 같음 | x/y = (1500, 800) | 어떤 입력 x/y도 반영되지 않음 |
| K3 | `overlay = {100, 100, false}` | `visible` = false, x/y = (1500, 800) | `visible`은 입력값 유지 |
| K4 | `idle_seconds`·`slam`·`mouse`·`autostart`·`scale`을 모두 `cur`와 다르게 | 반환의 해당 필드 = incoming 값 | 위치 외 필드 불변 |
| K5 | K1 반환값을 `cur2`(x/y = (1600, 900))로 다시 병합 | x/y = (1600, 900), `scale` = 1.5 | 재병합이 최신 메모리 값으로 덮음(§2.1.1 5단계) |

- `apply_overlay_settings`·`set_settings` 조립은 Tauri 런타임 의존이라 자동 테스트 없음(스킬 §9) → 아래 수동. §8.3 M5는 이 변경 후 `settings://changed` 수신 여부와 무관하게 성립한다(P4가 대체).

수동 체크리스트 (실행 증거: 전후 `/run-app` 스크린샷 + `settings.json` 캡처)

| # | 절차 | 기대 |
|---|---|---|
| P1 | (신고 재현) 오버레이를 기본 자리에서 멀리 끌어 두고 0.5초 안에 Ctrl+휠 위로 | 제자리(좌상단 불변)에서 커진다. 기본 자리로 튀지 않는다 |
| P2 | P1 후 1초 대기 → `settings.json` | `scale` = 새 배율. `overlay.x/y` = 끌어 둔 위치(R-13 구현 후. 구현 전이면 시작 때 값 그대로) |
| P3 | 끌어 두고 1초 이상 지난 뒤 Ctrl+휠 위·아래 여러 번 | 매번 제자리 확대·축소, `overlay.x/y` 불변 |
| P4 | 설정 창을 열어 둔 채 오버레이를 끈 직후 설정 창 마우스 탭에서 저장 | 오버레이가 움직이지 않는다 |
| P5 | 재시작 | 끌어 둔 위치·새 배율로 뜬다(R-13 구현 후) |

### 8.7 모니터 목록 (CR-017, §2.3)

- 자동 테스트: **없음.** `list_monitors`는 Tauri 런타임(`available_monitors`)이 필요하다(스킬 §9). 순수 부분이 없다(사각형 조립 한 줄). 기존 `placement.rs` U1~U9·`mod.rs` `union` 테스트는 이름 변경 후에도 그대로 PASS해야 한다(회귀).
- 수동 체크리스트 (실행 증거: `get_monitors` 반환 로그 또는 개발자 도구 콘솔 캡처 + 디스플레이 설정 스크린샷)

| # | 절차 | 기대 |
|---|---|---|
| L1 | 모니터 1대(1920×1080, 100%) | 1개: `{x:0, y:0, width:1920, height:1080}` |
| L2 | 모니터 2대, 보조를 주 모니터 왼쪽에 배치 | 2개, 보조는 `x < 0`(예: −1920). 순서는 무관 |
| L3 | 150% DPI 모니터(예: 2560×1440) | `width:2560, height:1440`(물리 px). 1707×960 같은 논리 값이면 FAIL |
| L4 | L2·L3 구성에서 커서를 각 모니터 오른쪽 아래 끝으로 옮기며 훅 마우스 좌표 로그와 비교 | 커서 좌표가 해당 모니터 사각형 `[x, x+width) × [y, y+height)` 안에 든다(좌표계 일치 증거) |
| L5 | 작업 표시줄 위에 커서 | 좌표가 모니터 사각형 안(작업 영역이 아니라 전체 사각형이라는 증거) |
| L6 | 앱 실행 중 모니터 1대 분리 → `get_monitors` 재호출 | 목록이 1개로 줄어든다(캐시 없음 — 호출마다 OS 조회) |

### 8.8 오른쪽 클릭 메뉴 창 사각형 (overlay R-40, §3.1) — `window/mod.rs` `#[cfg(test)] mod tests`

| # | 이름(안) | 입력 | 기대 |
|---|---|---|---|
| WR1 | `contains_half_open_edges` | `ScreenBounds { x: 100, y: 200, width: 450, height: 350 }`에 (100,200)·(549,549)·(550,300)·(300,550)·(99,300)·(300,199) | 앞 둘 `true`(왼쪽·위 가장자리·마지막 픽셀), 나머지 `false`(오른쪽 x+w·아래 y+h 가장자리와 바깥) |
| WR2 | `contains_negative_origin` | 왼쪽 보조 모니터 위 창 `{ x: -1920, y: 0, width: 1920, height: 1080 }`에 (-1920,0)·(-1,1079)·(0,0)·(-1921,0) | `true`·`true`·`false`·`false` |
| WR3 | `contains_zero_size_is_false` | `{ x: 0, y: 0, width: 0, height: 350 }`·`{ x: 0, y: 0, width: 450, height: 0 }`에 (0,0) | 둘 다 `false` |

- 기존 `union` 테스트 2건은 그대로 PASS(회귀). `overlay_screen_rect`는 Tauri 런타임이 필요해 자동 테스트 없음 → [tray.md](tray.md) §8.3 MC-31(투명 모서리 포함)·MC-35(숨김)·MC-36(한쪽만 안)·MC-45 ③(배율 다른 모니터 가장자리).

## 9. bridge 요구 명세 (계약 확정은 bridge-designer)

**결론: 새 command·event는 필요 없다.** 위치 저장은 core 내부에서 끝나고, 기존 `settings://changed`를 재사용한다.

| 종류 | 이름 | 요구 | 빈도 |
|---|---|---|---|
| event(기존) | `settings://changed` | 드래그 저장(`persist`가 `Some`)과 시작 시 화면 밖 보정 저장 뒤에도 emit한다. 계약 §4 설명에 "창 드래그 위치 저장 시" 추가. 시작 시 보정은 창이 아직 구독 전일 수 있으므로 emit 생략 가능(메모리 값이 이미 갱신돼 `get_settings`가 새 값을 준다) | 드래그 종료당 최대 1회 |
| command(기존) | `set_overlay_position` | 그대로 유지(이동 + 저장). 이후 도착하는 `Moved`는 no-op | 변경 없음 |
| 조립 | `lib.rs` setup | §4 시작 순서 1~3과 `on_settled` 콜백(persist → emit) 연결. 콜백은 `AppHandle` 클론을 잡고 `try_state::<AppState>()`로 상태를 얻는다 | 1회 |
| 에러 | `error.rs` | `impl From<WindowError> for BridgeError`(코드는 §6 `code()`). 새 코드 `window.thread`는 command로 노출되지 않음(로그 전용) | — |
| capabilities | — | 추가 없음(`on_window_event`는 Rust 쪽) | — |

- ui 영향: 없음. overlay는 `data-tauri-drag-region`만 유지한다. `src/overlay/requirements.md`의 R-13 "미확정 계약(bridge 인계 필요)"은 "core window 모듈이 이동을 감지해 저장"으로 확정 — ui-designer 갱신 대상.

### 9.1 OV-R-03 창 리사이즈 — bridge 요구

**결론: 새 command·event·페이로드 없음.** 기존 command 3개와 setup에 `window::resize_overlay` 호출만 붙인다(확정사항 §11-1 "계약 추가 없음"과 일치). 창 크기는 ui에 알리지 않는다 — ui는 같은 식으로 스스로 그리고, 루트 요소가 창을 채운다(§9.2 UI-1).

| 종류 | 이름 | 요구 | 빈도 |
|---|---|---|---|
| 조립 | `lib.rs` setup | §4 시작 순서 **0단계**: 매니페스트 로드(실패 → 경고, `None`) → `resize_overlay(&handle, canvas, settings.scale)`(실패 → 경고). 반드시 `restore_overlay_position`보다 먼저 | 1회 |
| command(기존) | `set_settings` | ① 설정 잠금 한 줄로 **이전 `scale`** 복사(기존 `*lock = settings.clone()` 전에) ② 기존 검증·저장·`apply_overlay_settings` ③ `old_scale != settings.scale`이면 `assets::load_manifest(&state.paths.assets_dir)`(v0.3 손 기준점 재계산과 같은 호출이면 한 번만) → `window::resize_overlay(&app, canvas, settings.scale)` ④ `settings://changed` emit. 리사이즈·매니페스트 실패는 **경고 로그, 명령은 성공**(§11 D16). 잠금을 쥔 채 ③을 부르지 않는다 | 배율 변경당 1회(Ctrl+휠 한 칸 = 1회) |
| command(기존) | `import_asset` | 성공 후 `slot.is_canvas_layer()`이면 core가 돌려준 `manifest.canvas`와 설정의 `scale`(잠금 한 줄 복사)로 `resize_overlay`. 실패는 경고 로그. `assets://changed` emit 전에 부른다 | 상태 레이어 등록당 1회 |
| command(기존) | `remove_asset` | `import_asset`과 같다(마지막 상태 레이어 삭제 → `canvas = None` → 450×350 × 배율) | 상태 레이어 삭제당 1회 |
| 계약 문구 | contract §5 | `set_settings` 설명은 이미 있음("scale 변경 시 … 리사이즈"). `import_asset`·`remove_asset`에 부수 효과 "상태 레이어 슬롯이면 캔버스 변경에 맞춰 오버레이 창 리사이즈(core `window::resize_overlay`)" 추가. §4 이벤트 변경 없음 | — |
| 에러 | `error.rs` | 기존 `From<WindowError> for BridgeError`로 충분. 새 코드 없음 | — |
| capabilities | — | 추가 없음(Rust 쪽 `set_size`. JS `core:window:allow-set-size` 불필요) | — |

- 호출 조건(scale 변경·상태 레이어)은 매니페스트 IO를 줄이려는 최적화다. `resize_overlay`는 멱등이라 조건 없이 불러도 결과는 같다.

### 9.2 OV-R-03 — ui 요구 명세 (ui-manager 인계, 계약 변경 없음)

| # | 대상 | 요구 | 근거 |
|---|---|---|---|
| UI-1 | `src/overlay/overlay.module.css` `.root` | `width: 450px; height: 350px; overflow: visible` → `width: 100vw; height: 100vh; overflow: hidden` (창 전체를 덮음) | 창이 더 이상 450×350이 아니다. 고정 크기를 두면 200%(900×700 창)에서 오른쪽·아래 3/4 영역에서 드래그(`data-tauri-drag-region`)·Ctrl+휠이 먹지 않는다 |
| UI-2 | `src/overlay/index.tsx` 표시 배율 식 | **유지**: `fit = canvas ? min(450/W, 350/H) : 1`, `scale = fit × settings.scale`, `.canvas`는 `left 0 / top 0`, `transform-origin: top left`, 가운데 정렬 없음. core `overlay_display_size`와 같은 식이므로 바꾸면 창과 어긋난다 | 식을 두 계층이 각자 계산(§11 D11) |
| UI-3 | Ctrl+휠·슬라이더 | 변경 없음. 로컬 상태 먼저 반영 → `setSettings` → core 리사이즈까지 1~2프레임 잘림/여백이 보일 수 있다(수용) | 추가 동기화는 요구 없음 |
| UI-4 | `src/overlay/design.md` §2(`.root`는 450×350 고정 문구)·§10.5·RTM R-03 | "`.root` = 창 전체(100vw×100vh), 창 크기는 core가 표시 크기로 맞춤(window.md §2.2)"로 갱신 | ui-designer 소관 |
| UI-5 | 테스트 | 표시 배율 계산을 순수 함수로 두는 경우 §8.4 S1~S9 표를 같은 기대값(표시 크기 = `ceil(W×fit×scale)`)으로 두면 두 식의 일치를 잡는다 | ui-test-designer 판단 |

### 9.3 set_settings 위치 불간섭 — bridge 요구 (2026-09-23 사용자 신고)

**결론: 계약 표면(이름·인자·반환 타입·이벤트)은 그대로이고, `set_settings` 입력 `settings.overlay.x/y`의 의미만 "무시(core 현재값 유지)"로 바뀐다. 비파괴 변경으로 판정한다.**

| 종류 | 이름 | 요구 | 빈도 |
|---|---|---|---|
| command(기존) | `set_settings` | §2.1.1 처리 순서 1~6. 입력 `overlay.x/y`는 무시하고 `window::keep_overlay_position`으로 메모리 현재값을 채운다(저장 전 1회, 메모리 쓰기 직전 1회). 창 위치를 바꾸지 않는다(`apply_overlay_settings`는 표시/숨김만). 반환값·`settings://changed` 페이로드의 `overlay.x/y` = core 현재값 | 변경 없음 |
| 계약 문구 | contract §5 `set_settings` | 설명에 추가: "`settings.overlay.x/y`는 무시한다 — 창 위치는 드래그·앱 시작 복원·`set_overlay_position`으로만 바뀐다(core window.md §2.1.1). 저장·반환·emit되는 `overlay.x/y`는 core 현재값. `overlay.visible`은 그대로 적용" | — |
| 계약 문구 | contract §3.3 `OverlaySettings` | `x/y` 설명: "쓰기는 드래그 저장(core)·`set_overlay_position`만. `set_settings` 입력값은 무시" | — |
| 조립 | `lib.rs` setup | §2.1.1 ⚠ — `apply_overlay_settings` 재정의 전에 시작 복원이 `restore_overlay_position`(또는 `set_overlay_position` 직접 호출)로 바뀌어 있어야 한다 | 1회 |
| 에러 | — | 새 코드 없음. `set_settings`에서 위치 이동 실패 경로가 사라질 뿐(`window.not_found`는 표시/숨김으로 여전히 가능) | — |

비파괴 판정 근거:
1. 타입·필드·필수 여부·이벤트 이름이 같다 — contract 호환성 분류의 파괴 조건(필드 삭제·이름·타입 변경, 필수 필드 추가, 이벤트 이름 변경)에 해당 없음. TS `Settings`·Rust `Settings` 변경 없음.
2. `set_settings`로 창을 옮기려는 호출자가 없다. 현재 ui 호출자(Grep `setSettings(` in `src/overlay`·`src/settings`)는 overlay Ctrl+휠(`src/overlay/index.tsx:112-114`, `{ ...settings, scale }`)과 설정 창 마우스 탭(`src/settings/components/MousePartsTab.tsx:49`, `{ ...settings, mouse }`)이고, 둘 다 사본을 펼쳐 x/y를 되돌려 보낼 뿐이다. 위치 입력 UI는 없고, overlay requirements R-13은 "ui는 `set_overlay_position`을 호출하지 않는다"(위치 주인 = core, CR-010).
3. "적용된 값 반환" 계약은 유지된다 — 적용된 x/y가 core 현재값일 뿐이다. overlay는 반환값을 쓰지 않고(`.catch`만), 두 화면 모두 `settings://changed`로 사본을 교체한다.

ui 영향: **코드 변경 없음.**
- 사본의 x/y가 낡아도 무해하므로 ui가 위치를 동기화할 필요가 없다. 반환·`settings://changed`로 사본의 x/y가 자연히 교정된다.
- 문서(선택, ui-designer 소관): `src/overlay/design.md` P-7에 "`set_settings`는 창을 옮기지 않는다(core window.md §2.1.1)" 한 줄. 화면 소스 변경이 없으므로 CR 기록 여부는 ui-manager 판단.

### 9.4 CR-017 모니터 목록 — bridge 요구

**결론: 새 command `get_monitors`를 추가한다(비파괴 확장). 기존 `get_screen_bounds`는 바꾸지 않는다. 모니터 구성 변경 알림 event는 권장하지 않는다(ui 재조회로 대체).**

| 종류 | 이름(후보) | 요구 | 빈도 |
|---|---|---|---|
| command(신규) | `get_monitors` | 인자 없음 → `ScreenBounds[]`(모니터별, 물리 px, 가상 화면 좌표, OS 열거 순서). Rust `pub fn get_monitors(app: AppHandle) -> Result<Vec<ScreenBounds>, BridgeError>` = `Ok(window::list_monitors(&app)?)`. 실패: `Tauri` → `WINDOW_ERROR`(`tauri.error`). **빈 목록 권장 처리**: `WINDOW_ERROR`(`window.no_monitor`, 메시지 "모니터 정보를 읽을 수 없습니다.")로 바꿔 반환 — ui 실패 경로를 하나로(기존 `get_screen_bounds` 실패 = 마우스 파츠 미표시와 같게). 최종 판단은 bridge-designer | overlay 마운트 1회 + 재조회 규칙(아래) |
| 타입 | `ScreenBounds`(기존) | 재사용. TS 주석 "가상 화면 전체" → "사각형(물리 px, 가상 화면 좌표). `get_screen_bounds` = 모든 모니터 합집합, `get_monitors` = 모니터 하나씩" | — |
| TS 래퍼 | `getMonitors()` | `src/bridge/commands.ts`에 `call<ScreenBounds[]>('get_monitors')` | — |
| 등록 | `lib.rs` `invoke_handler` | `bridge::commands::get_monitors` 추가. capabilities는 기존 앱 command와 같은 방식(추가 권한 없음 — bridge 확인) | — |
| 에러 | `error.rs` | 기존 `From<WindowError> for BridgeError`로 충분. 새 코드 없음 | — |

**`get_screen_bounds` 확장 대신 새 command인 근거**
1. 반환 모양을 `ScreenBounds` → 배열(또는 `{ bounds, monitors }`)로 바꾸면 **파괴 변경**이다. 현재 호출자: `src/overlay/index.tsx:94`, 목 5개 테스트 파일(`OverlayApp*.test.tsx`, `handPart.test.tsx`). 새 command는 계약 호환성 분류상 확장(비파괴)이다.
2. 의미가 다르다 — 합집합 1개 대 모니터별 목록. 이름이 반환을 설명해야 한다(`get_screen_bounds`가 배열을 주면 이름이 거짓이 된다).
3. 전환 순서가 자유롭다: 새 command를 먼저 넣고 ui가 옮긴 뒤, `get_screen_bounds`의 ui 사용처가 0이 되면 제거 여부를 따로 정한다(§11 D24 — 제거는 파괴 변경이라 bridge-manager 판단).

**모니터 구성 변경 알림 — 권장하지 않음(현 단계)**
- 이유 ① Tauri 2/tao는 디스플레이 구성 변경(`WM_DISPLAYCHANGE`) 이벤트를 앱에 노출하지 않는다. 받으려면 창 프로시저 서브클래싱(Win32, unsafe)이 필요하고, hook 밖 unsafe 금지라 hook 모듈에 래퍼를 새로 둬야 한다 — 요구 대비 비용이 크다. ② 모니터 연결·해제·해상도 변경은 드물다. ③ ui 재조회로 대부분 스스로 복구된다.
- 대신 ui 재조회 규칙(권장, ui 소관): **커서 좌표가 알려진 어느 모니터 사각형에도 들지 않으면 `get_monitors`를 다시 부른다(1초에 최대 1회).** 재조회 결과가 올 때까지는 가장 가까운 모니터 기준으로 (u, v)를 0~1로 고정한다.
- 남는 한계(수용): 배치가 같고 해상도·배율만 바뀌어 커서가 여전히 옛 사각형 안에 있으면 재조회 조건이 걸리지 않아 매핑이 어긋난 채로 남는다 — 앱 재시작(또는 설정 창 재진입 시 재조회)으로 해소. 신고가 생기면 후보: (a) ui 주기 재조회(core 변경 없음) (b) core event `window://monitors-changed`(hook 모듈 `WM_DISPLAYCHANGE` 래퍼). 이 문서는 (b)를 설계하지 않는다.

ui 영향(ui-manager 인계, 참고): overlay 초기 로드 P-1의 `getScreenBounds` → `getMonitors`, 매핑 = 커서가 든 모니터 m에서 `u = (cx − m.x)/m.width`, `v = (cy − m.y)/m.height`(0~1 고정) → settings.md §3.1의 쌍선형 식. 모니터 경계 판정은 반열린 구간 `[x, x+width)`.

## 10. 요구 추적표

| 요구ID | 반영 절 | 상태 |
|---|---|---|
| R-tmp-4 — 커서가 있는 모니터 기준 매핑용 모니터 목록 (CR-017) | §2 `list_monitors`, §2.3, §3, §8.7 L1~L6, §9.4 | ✅ 설계 · 소스 반영 (요구ID 확인 필요) |
| OV-R-13 — `set_settings` 위치 불간섭(사용자 신고 2026-09-23) | §2 `keep_overlay_position`·`apply_overlay_settings` 재정의, §2.1.1, §4, §7, §8.6 K1~K5·P1~P5, §9.3 | ✅ 설계 · 소스 반영 |
| OV-R-13 — 이동 감지·저장 | §2 `watch_overlay_moves`·`persist_overlay_position`, §4, §8 | ✅ 설계 · 소스 반영 |
| OV-R-13 — 연속 쓰기 방지 | §2 `MOVE_SAVE_DEBOUNCE`, §3 `MoveDebounce`, §4 | ✅ 설계 |
| OV-R-13 — 시작 시 복원 | §2 `restore_overlay_position`, §4 시작 순서 | ✅ 설계 |
| OV-R-13 — 모니터 밖이면 기본 위치 | §2.1 `resolve_overlay_position`, U3~U7, M4 | ✅ 설계 |
| OV-R-03 — 창 크기 = 표시 크기(계산식) | §2.2 `overlay_display_size`, S1~S12 | ✅ 설계 · 소스 반영 |
| OV-R-03 — 배율 변경 시 리사이즈 | §2.2 `resize_overlay`, §4 리사이즈 흐름 ②, §9.1 `set_settings`, R2~R4 | ✅ 설계 |
| OV-R-03 — 시작 시 저장 배율 복원 | §4 시작 순서 0단계, R7, R10 | ✅ 설계 |
| OV-R-03 — 캔버스 변경 시 리사이즈 | §4 ③, §9.1 `import_asset`·`remove_asset`, R5·R6 | ✅ 설계 |
| OV-R-03 — 드래그 영역이 창 전체 | §9.2 UI-1 | 부분(ui 인계 필요) |
| OV-R-12 | §1(ui 내장 드래그, 결과만 수신) | ✅(기존) |
| OV-R-01 | §1(`tauri.conf.json`) | ✅(기존) |
| **overlay R-01 🔒 보강 — WT-01 재적용 = Win32 `SetWindowPos(HWND_TOPMOST, …NOACTIVATE｜ASYNCWINDOWPOS)`** | §3.2.1, [hook.md](hook.md) §3.11 U27, MC-51~MC-54·MC-60 | 확정(사용자) · 소스 적용(2026-10-15, 커밋 전) · MC 미확인 |
| **R-01 보강 — WT-02 트리거 ⓐ 전경 창 변화(WinEvent, 폴링 없음)** | §3.2.3, [hook.md](hook.md) §3.11 U20·U21, MC-51·MC-52·MC-59 | 확정(사용자) · 소스 적용(2026-10-15, 커밋 전) · MC 미확인 |
| **R-01 보강 — WT-03 트리거 ⓑ `apply_overlay_window` ④·`set_overlay_visible` 표시 끝** | §3.2.2 `keep_overlay_on_top`, MC-53 | 확정(사용자) · 소스 적용(2026-10-15, 커밋 전) · MC 미확인 |
| **R-01 보강 — WT-04 트리거 ⓒ 트레이 「새로고침」** | [tray.md](tray.md) §3.8, MC-54 | 확정(사용자) · 소스 적용(2026-10-15, 커밋 전) · MC 미확인 |
| **R-01 보강 — WT-05 (🔒 결정 3) 숨김이면 올리지도 보이지도 않음** | §3.2.2 `release_overlay_top`(hide 앞), [hook.md](hook.md) §3.11.3 TP1·TP5·TP6, MC-55 | 확정(사용자) · 소스 적용(2026-10-15, 커밋 전) · MC 미확인 |
| **R-01 보강 — WT-06 (🔒 결정 4) 최소화면 복원 후 재적용** | [hook.md](hook.md) §3.11.3 TP4, U25·U26, MC-56 | 확정(사용자) · 소스 적용(2026-10-15, 커밋 전) · MC 미확인 |
| **R-01 보강 — WT-07 (🔒 결정 1·5) 포커스 비탈취·전체 화면에서도 재적용** | §3.2.1, [hook.md](hook.md) §3.11.3, MC-57·MC-58 | 확정(사용자) · 소스 적용(2026-10-15, 커밋 전) · MC 미확인(독점 전체 화면은 관찰) |
| **R-01 보강 — WT-08 무효·재사용 HWND 방어, 종료 시 UnhookWinEvent** | §3.2.2(`Destroyed` 해제), [hook.md](hook.md) §3.11.3 TP2·§3.11.5, U22·U23, MC-61 | 확정(사용자) · 소스 적용(2026-10-15, 커밋 전) · MC 미확인 |
| **R-01 보강 — WT-09 트리거당 1회·debug 횟수만·제목/클래스 미기록** | [hook.md](hook.md) §3.11.2, MC-59·MC-62 | 확정(사용자) · 소스 적용(2026-10-15, 커밋 전) · MC 미확인 |
| **overlay R-40 (CR-062) — "오버레이 위" = 보이는 창 사각형(투명 포함), 누름·뗌 두 점 판정의 재료(🔒 U-1)·숨김이면 없음(AC-4)** | §1, §2 `contains`·`overlay_screen_rect`, §3.1, §6, §8.8 WR1~WR3 | 설계 확정 · 소스 반영(두 점 조합 판정 `should_popup`은 [tray.md](tray.md) §3.7) |

## 11. 설계 결정 노트

| # | 결정 | 대안 | 채택 근거 |
|---|---|---|---|
| D1 | `WindowEvent::Moved` + **500ms 디바운스** | ① `WM_EXITSIZEMOVE`로 이동 종료 감지 ② 훅의 왼쪽 버튼 뗌으로 종료 판단 ③ ui가 드래그 끝에 `set_overlay_position` 호출 | ①은 창 서브클래싱(unsafe) 필요 — hook 밖 금지, 래퍼 추가 비용 큼. ②는 hook→window 결합(의존 방향 위반). ③은 🔒 "Rust(window)가 감지" 결정과 다르고 ui가 드래그 종료를 알 방법도 없다 |
| D2 | 디바운스를 저장 스레드 + `recv_timeout` | 타이머 스레드를 이동마다 spawn / tokio | 스레드 1개, busy loop 없음(스킬 §4). 드래그 도중 메인 스레드는 `send`만 한다 |
| D3 | 저장 판단(`persist`)을 콜백 밖 공개 함수로 | 콜백 안에 직접 작성 | tempdir로 테스트 가능(I1~I4). core가 bridge(emit)를 모르게 emit만 콜백에 남긴다 |
| D4 | 잠금 안에서는 비교·갱신·clone만, 파일 쓰기는 잠금 밖 | 잠근 채 저장(기존 command 방식) | 스킬 §4 "잠근 채 IO 금지". 대가: 동시 저장이 겹치면 드물게 파일에 한 박자 늦은 스냅샷이 남을 수 있다(다음 저장에서 교정). 기존 command들(`set_overlay_position` 등)은 잠근 채 저장하므로 일관성은 bridge 정리 때 맞춘다 |
| D5 | 종료 직전 0.5초 안의 이동은 유실 허용 | `RunEvent::Exit`에서 flush | flush에는 lib.rs 이벤트 루프 훅과 스레드 합류가 필요해 복잡도 대비 이득이 작다. 요구가 생기면 후보로 |
| D6 | 화면 밖 판정: 모든 모니터에서 보이는 부분 < 48×48 | 좌상단 점이 모니터 안인지 | 가장자리에 걸쳐 둔 사용자 배치를 보존하면서, 끌어올 손잡이조차 없으면 되돌린다 |
| D7 | 폴백 위치 = `Settings::default().overlay`(100,100) | 주 모니터 중앙 등 | 기본값 단일 소스(확정사항·스킬 §6의 (100,100)) |
| D8 | 보정 판정은 시작 시 1회 | 실행 중 모니터 변경 이벤트 감시 | 실행 중 모니터가 빠지면 Windows가 창을 옮기고 그 `Moved`가 그대로 저장된다. 요구 범위는 "앱 시작 시 복원" |
| D9 | 모듈 에러를 `WindowError`로 전환(기존 함수 포함) | 신규 함수만 `WindowError` | 한 모듈에 에러 타입 둘은 혼란. 표준 강제 항목(스킬 §5) — 요구 역추적 예외 |
| D10 | 창 = **캔버스 표시 크기에 딱 맞춤(여백 미포함)** | 450×350 상자 × 배율 전체(비율이 다르면 투명 여백 포함) | 확정사항 §6 "창 크기 = 현재 표시 크기"를 문자 그대로 따른다. 투명 여백도 창이라 클릭을 가로채 아래 앱 조작을 막는다 — 결함 보고의 "투명 빈 영역"을 없애는 것이 목적. 권장 9:7 캔버스에서는 두 안의 결과가 같고, 상한 900×700도 유지된다. ui는 이미 좌상단 기준·가운데 정렬 없음이라 식을 바꿀 필요가 없다 |
| D11 | 크기 식을 Rust가 **독립 계산**(ui와 같은 식) | ① ui가 계산해 새 command로 크기 요청 ② core가 계산해 이벤트로 ui에 알림 | 확정사항 §6 "core window 모듈이 리사이즈", §11-1 "계약 추가 없음". 입력(캔버스·배율)이 양쪽에 이미 있고 식이 한 줄이다. 대가: 식이 두 곳 — 같은 예시 표(S1~S9, UI-5)로 묶는다 |
| D12 | `set_size(Size::Logical)` | 물리 px 지정 | ui가 CSS px(= 논리 px)로 그리므로 논리 px여야 125%·150% DPI에서 창과 콘텐츠가 일치한다. DPI가 다른 모니터로 옮기면 tao가 논리 크기를 보존한다(tao 0.35.3 `event_loop.rs` 1966–1973). 위치(R-13)는 물리 px 그대로 — 단위가 다르지만 각 API가 요구하는 단위대로다 |
| D13 | **좌상단 고정** | 가운데 고정 / 커서 기준 확대 | 저장 위치가 좌상단(`overlay.x/y`)이라 위치가 안 변해 R-13 저장이 일어나지 않는다. `set_size`가 `SWP_NOMOVE`로 크기만 바꾸므로 `Moved` 자체가 없다(`event_loop.rs` 1211–1221). ui `transform-origin: top left`와 일치. 가운데 고정은 배율 한 단계마다 `set_position` + `Moved` + 디바운스 저장이 따라오고 요구에도 없다 |
| D14 | 올림 + ε(1e-6) | 반올림 / 내림 | 내림은 마지막 픽셀이 잘리고 반올림은 .5 미만이 잘린다. 올림의 대가(최대 1px 투명 띠)는 무시 가능. ε는 `450×1.1` 같은 부동소수 오차 방어 |
| D15 | 호출 조건: `set_settings`는 scale 변경 시, 에셋은 상태 레이어일 때 | 모든 `set_settings`·에셋 command에서 호출 | 멱등이라 정확성과 무관. 유휴 시간 등 다른 설정 저장 때 매니페스트 IO를 줄인다 |
| D16 | 리사이즈 실패는 command 실패로 올리지 않음(경고 로그) | `?`로 전파(기존 `apply_overlay_settings` 방식) | 설정은 이미 저장·반영됐다. 실패로 돌려주면 ui가 "저장 실패"로 오해한다. 다음 배율 변경·재시작 때 다시 맞춘다 |
| D17 | `set_settings` 입력 `overlay.x/y`를 **무시하고 core 메모리 현재값 유지**(2026-09-23 🔒 "위치 주인 = 창") | ① 입력 x/y로 창 이동(기존) ② 입력 x/y를 저장만, 창은 안 옮김 ③ 창 실제 위치(`outer_position`)를 읽어 저장 ④ ui가 x/y를 최신으로 보냄 | ①이 신고 결함. ②는 창은 안 튀지만 낡은 x/y가 파일에 남아 재시작 때 옛 자리로 뜬다. ③은 위치 쓰기 경로가 하나 더 생겨 R-13 규칙(최소화 좌표 거르기·디바운스)을 중복해야 하고, 창 조회 실패가 설정 저장 실패로 번진다. ④는 ui가 드래그 종료를 알 수 없고(D1) 사본은 언제든 낡는다. 메모리 값은 `persist`·`set_overlay_position`·시작 보정만 쓰므로 원칙과 일치하고 ui 사본 상태와 무관하게 안전하다 |
| D18 | 병합 함수를 window(`placement.rs`)의 공개 순수 함수로 | ① bridge `set_settings` 안에서 직접 대입 ② settings 모듈에 둠 | 위치 정책의 주인이 window이므로 정책도 window에 둔다(의존 window → settings 허용). ①은 단위 테스트가 어렵고 정책이 bridge로 샌다. ②는 settings가 "의미 해석 금지"(스킬 §1)라 부적합 |
| D19 | 병합을 **저장 전·메모리 쓰기 직전 두 번** | 한 번(저장 전)만 / 전체를 잠근 채 저장 | 한 번이면 그 사이 `persist`가 쓴 새 x/y를 옛 값으로 되돌린다(메모리 역행). 잠근 채 저장은 스킬 §4 위반이고, `persist`가 잠금 밖에서 저장하므로 파일 경합은 어차피 남는다(D4). 저장 실패 시 메모리 불변이라는 기존 의미도 지킨다 |
| D20 | `apply_overlay_settings` 유지·재정의(visible만) | 삭제하고 `set_overlay_visible` 직접 호출 | 시그니처 불변이라 호출자(`commands.rs:51`) 수정이 없다. "설정 중 창에 적용할 부분"이라는 이름 뜻에서 위치를 빼는 재정의다 |
| **D21** | (CR-017) 기존 비공개 `monitor_rects`를 **공개 `list_monitors`로 승격**(🔒 이름) | 새 함수 추가 / 모니터 판정을 core가 하고 (u, v)를 이벤트로 보냄 | 이미 같은 계산이 있다(중복 금지). 매핑은 🔒 "ui가 계산" — core는 목록만 준다. 커서 이벤트마다 core가 모니터를 판정하면 hook→window 결합이 생긴다(의존 방향 위반, 스킬 §1) |
| **D22** | 모니터 **전체 사각형**(`position`+`size`) | 작업 영역(`work_area`) | 훅 좌표는 작업 표시줄 위에서도 온다. 작업 영역을 쓰면 작업 표시줄 위 커서가 어느 모니터에도 안 들어 ui 재조회가 반복된다 |
| **D23** | 모니터 0개 → `Ok(vec![])`(core), 오류 변환은 bridge 권장 | core에서 `Err(NoMonitor)` | `restore_overlay_position`이 빈 목록을 "판단 불가 → 저장 위치 유지"로 쓴다(§2.1 규칙 1). core가 오류로 바꾸면 복원 동작이 바뀐다 |
| **D24** | `get_screen_bounds`·`screen_bounds`·`union`은 **이번에 건드리지 않는다** | 즉시 삭제 / 배열로 확장 | 확장은 파괴 변경(§9.4 근거 1). 삭제도 파괴 변경이며 ui 전환 뒤에야 사용처 0이 확인된다. ui가 `get_monitors`로 옮긴 뒤 사용처가 0이면 **제거 후보**(요구 역추적 불가 — 스킬 §10): bridge command 제거 → core `screen_bounds`·`union`·`WindowError::NoMonitor` 사용처 재확인. 결정은 bridge-manager·사용자 |
| **D25** | 모니터 구성 변경 event 없음, ui 재조회 규칙으로 대체 | core event(`WM_DISPLAYCHANGE` 래퍼) / ui 주기 폴링 | §9.4. unsafe 래퍼 비용 대비 요구가 없다. 주기 폴링은 평상시 헛호출이라 조건부 재조회가 낫다 |
| **D32** | (R-40) 점 판정을 기존 `ScreenBounds`의 메서드 `contains`로(반열림, i64) | ① tray 안의 비공개 함수 ② 새 사각형 타입 | 창·모니터 사각형의 주인이 window다(좌표계 정의 §1 [좌표]). 반열림은 `list_monitors` 경계 규칙과 같다. i64는 `x + width`가 `i32` 범위를 넘는 극단값에서 넘침 패닉(디버그)을 막는다. 새 타입은 bridge 재노출 타입과 중복된다 |
| **D33** | (R-40) `overlay_screen_rect`는 숨김만 `None`, 최소화는 판정하지 않는다 | `is_minimized()` 검사 추가 | 오버레이는 최소화 버튼이 없고, 최소화돼도 창이 (−32000, −32000)으로 가 실제 클릭이 그 안에 들 수 없다(WR-e). 요구에 없는 분기를 더하지 않는다(스킬 §10) |
| **D34** | (WT) 재적용은 **Win32 `SetWindowPos(HWND_TOPMOST)` 직접**(hook 래퍼) | ① Tauri `set_always_on_top(false)` → `(true)` 토글 ② tao 패치 | ①은 diff가 생겨 동작할 수 있으나 매번 `HWND_NOTOPMOST`를 거쳐 한순간 아래로 내려가고(깜박임), tao 내부 구현에 기대는 우회다. 비메인 스레드 WinEvent 콜백에서 Tauri setter를 부르면 메인 스레드 왕복도 생긴다. ②는 크레이트 수정이라 금지 범위다 |
| **D35** | (WT) 등록 상태(`TARGET`)를 **hook 정적 원자 변수**에 두고 window가 채운다. 등록 = "사용자가 보이게 둔 오버레이" | ① WinEvent 콜백이 매번 Tauri `is_visible()` 조회 ② 설정 `Mutex`를 hook이 읽음 | ①은 비메인 스레드 getter = 메인 스레드 동기 왕복이라 콜백이 메인 스레드를 기다리고, 그동안 같은 스레드의 저수준 훅 콜백도 밀린다(시스템 입력 지연). ②는 hook → settings 의존이라 방향 위반이다(스킬 §1). 표시/숨김의 모든 경로(`apply_overlay_window`·`set_overlay_visible`)가 window를 지나므로 등록 지점이 둘로 끝난다 |
| **D36** | (WT) `set_overlay_visible`에도 같은 처리 | `apply_overlay_window`만(위임문 문자 그대로) | bridge `set_overlay_visible` command와 트레이 대체 경로(`AppState` 없음)가 이 함수로 표시한다. 여기서 등록하지 않으면 그 경로로 다시 보인 오버레이는 감시 대상이 아니고, 숨길 때 해제하지 않으면 결정 3이 판정의 `IsWindowVisible`에만 기댄다. 같은 요구(R-01)의 같은 "표시" 경로라 범위 확장이 아니라 누락 방지로 판단했다 |
| **D37** | (WT, 🔒 결정 1) 전체 화면 판정 없이 재적용 | R-40처럼 전체 화면이면 건너뜀 | 사용자 결정. `SWP_NOACTIVATE`라 전경·포커스는 바뀌지 않는다(R-40 U-3의 "게임 최소화" 위험은 메뉴가 `SetForegroundWindow`를 부르는 경로였다). **관찰**: 독점 전체 화면 게임에서는 DWM을 거치지 않아 오버레이가 보이지 않거나, 맨 위 창이 생기면서 일부 게임이 독점 모드를 잃고 깜박일 수 있다 — MC-58 기록 |
| **D38** | (WT, 🔒 결정 4) 최소화면 복원 | 최소화는 그대로 둠 | "항상 위 = 항상 보임"이 요구다. 오버레이는 최소화 버튼이 없어 최소화되는 경로가 Win+D·Win+M 같은 일괄 최소화뿐이다. **부작용**: 바탕 화면 보기 직후 전경이 바탕 화면으로 바뀌는 순간 오버레이가 곧바로 되살아나 "바탕 화면만 보기"가 오버레이에는 통하지 않는다. 숨기려면 트레이 「표시/숨김」을 쓴다. Win+D가 최소화 없이 바탕 화면을 앞으로 올리는 방식이면 복원 분기 없이 WT-01만으로 위에 남는다 — MC-56 관찰 |

### 파급 (WT 항상 위 재적용, Grep 2026-10-05)

| 파일·위치 | 현재 | 필요한 수정 | 소관 |
|---|---|---|---|
| `src-tauri/src/window/mod.rs` `set_overlay_visible`(:182)·`apply_overlay_window`(:208) | `show()`/`hide()`만 | §3.2.2 코드대로(도우미 2개 추가). `//!` [방식]·[저수준 호출]에 "Win32는 hook `topmost` 안전 래퍼 경유" 한 줄, [공개 API] 설명에 ④단계 | core-implementer |
| `src-tauri/src/lib.rs` `on_window_event` | 설정 창 `CloseRequested`만 | 라벨 `overlay` + `WindowEvent::Destroyed` → `hook::set_topmost_target(None)` | core-implementer |
| 호출자 `bridge/commands/mod.rs:206`(`set_settings`)·`:696`(data-reset)·`tray/mod.rs:296`(`toggle_overlay`)·`lib.rs:402`(`setup_overlay`) | `apply_overlay_window` | 수정 없음 — 시그니처 불변, 동작만 추가(보일 때 재적용 1회) | — |
| 호출자 `bridge/commands/mod.rs:383`(`set_overlay_visible` command)·`tray/mod.rs:290`(대체 경로)·`window/mod.rs:195`(`apply_overlay_settings`) | `set_overlay_visible` | 수정 없음 — 같은 이유 | — |
| `window/placement.rs:119-121` `restore_overlay_position` | 시작 시 `show()`/`hide()` | 수정 없음 — 바로 뒤 `apply_overlay_window`가 등록을 맞춘다(§3.2.2) | — |
| 테스트 | 이 함수들은 자동 테스트 없음(Tauri 런타임) | 없음 — 순수 판정은 hook TP1~TP8 | — |
| bridge 계약·ui | — | **변경 없음**(새 command·event 없음, §9 결론 그대로) | — |

### 파급 (CR-017 `list_monitors`, Grep 2026-09-23)

| 파일·위치 | 현재 | 필요한 수정 | 소관 |
|---|---|---|---|
| `src-tauri/src/window/mod.rs:108-124` | 비공개 `fn monitor_rects` | `pub fn list_monitors`(본문 동일), 문서주석 갱신, `//!` [공개 API]·[좌표]에 추가 | core-implementer |
| `src-tauri/src/window/mod.rs:163` | `screen_bounds`가 `monitor_rects(app)?` | `list_monitors(app)?` | core-implementer |
| `src-tauri/src/window/placement.rs:106` | `super::monitor_rects(app)?` | `super::list_monitors(app)?` | core-implementer |
| `src-tauri/src/bridge/commands.rs` | `get_screen_bounds`(253–257행)만 | `get_monitors` 추가(§9.4) | bridge-implementer |
| `src-tauri/src/lib.rs:166` 부근 `invoke_handler` | `get_screen_bounds` 등록 | `get_monitors` 등록 | bridge-implementer |
| `doc/200_설계/bridge/contract.md` §3.4·§5 command 표·변경 이력 | `get_screen_bounds`만 | `get_monitors` 행, `ScreenBounds` 주석 | bridge-designer |
| `src/bridge/commands.ts:48` | `getScreenBounds` | `getMonitors` 추가 | bridge-implementer |
| `src/overlay/index.tsx:94`, `src/state/mouseMapping.ts`, overlay 테스트 목 | 합집합 bounds로 매핑 | 모니터 목록 + 커서 모니터 판정 + 쌍선형(settings.md §3.1) | ui |
| 모니터 관련 core 테스트 | `placement.rs` U1~U9, `mod.rs` `union` 테스트 | 변경 없음(회귀 확인만) | — |

### 파급 (set_settings 위치 불간섭, 2026-09-23)

| 파일·위치 | 현재 | 필요한 수정 |
|---|---|---|
| `src-tauri/src/window/mod.rs:63-66` `apply_overlay_settings` | `set_overlay_position(s.x, s.y)` + 표시/숨김 | 표시/숨김만. 모듈 `//!` [공개 API]에 `keep_overlay_position` 추가 |
| `src-tauri/src/window/placement.rs`(R-13 신규 파일) | 없음 | `keep_overlay_position` + §8.6 K1~K5 |
| `src-tauri/src/bridge/commands.rs:43-57` `set_settings` | 입력 그대로 save → apply(위치 포함) → `*lock = settings` | §2.1.1 처리 순서(두 번 병합, 반환·emit = 최종값). bridge-implementer |
| `src-tauri/src/lib.rs:93` | `apply_overlay_settings`로 시작 위치 복원 | `restore_overlay_position`(§4 1단계)로 교체 — 재정의와 **같은 묶음**. 단독 수정이면 `set_overlay_position` 직접 호출 추가 |
| `doc/200_설계/bridge/contract.md` §3.3·§5·변경 이력 | `set_settings`가 x/y 적용 | §9.3 문구(bridge-designer) |
| ui | — | 코드 변경 없음. overlay design.md P-7 한 줄(선택) |
| 테스트 | — | `set_settings`가 입력 x/y를 저장한다고 가정한 기존 테스트가 있는지 확인 필요(구현 시 Grep) — 있으면 기대값을 메모리 x/y로 |

### 파급 (기존 공개 API 변경 — 반환 에러 타입)

Grep `window::` 결과 호출자:

| 파일·위치 | 현재 | 필요한 수정 |
|---|---|---|
| `src-tauri/src/bridge/commands.rs:51,116,132` | `window::…(…)?` in `Result<_, BridgeError>` | 없음(`From<WindowError> for BridgeError`만 있으면 `?`가 변환) |
| `src-tauri/src/bridge/commands.rs:99,105,158` | `window::screen_bounds(&app)` 등을 **그대로 반환** | `Ok(window::…(&app)?)`로 감싸기 |
| `src-tauri/src/tray/mod.rs:45` | 매치 팔 `window::show_settings_window(app)`과 `toggle_overlay(app)`(BridgeError)의 타입이 달라짐 | `.map_err(BridgeError::from)` 또는 `toggle_overlay`도 `WindowError` 반환으로 |
| `src-tauri/src/tray/mod.rs:67` | `window::set_overlay_visible(app, !visible)?` | 없음(`?` 변환) |
| `src-tauri/src/lib.rs:93` | `apply_overlay_settings` 로그 | §4 시작 순서로 교체 |
| `src-tauri/src/error.rs` | — | `impl From<WindowError> for BridgeError` 추가 |
| `src-tauri/src/bridge/types.rs:18` | `pub use crate::window::{Point as WindowPoint, ScreenBounds}` | 없음 |

OV-R-03 추가분(기존 시그니처 변경 없음, 호출 추가만):

| 파일·위치 | 추가 |
|---|---|
| `src-tauri/src/lib.rs` setup 5단계(`setup_overlay`, 설계 당시 4단계) | §4 시작 순서 0단계(매니페스트 로드 → `resize_overlay`) |
| `src-tauri/src/bridge/commands.rs` `set_settings`(43–57행) | 이전 scale 복사, scale 변경 시 `resize_overlay`(§9.1) |
| `src-tauri/src/bridge/commands.rs` `import_asset`·`remove_asset`(71–92행) | 상태 레이어 슬롯이면 `resize_overlay`(§9.1) |
| `src/overlay/overlay.module.css` `.root` | UI-1(ui 소관) |
| `src-tauri/tauri.conf.json` 오버레이 `width/height` 450×350 | 변경 없음 — 시작 직후 0단계 리사이즈 전까지의 초기 크기로 둔다(`resizable: false`여도 `set_size`는 동작) |

### 확인 필요 · 관찰

1. ~~OV-R-03 미구현~~ → **설계 반영(2026-09-23)**: §2.2·§4·§9.1. 시작 순서상 리사이즈가 복원보다 먼저라 R-13 화면 밖 판정이 실제 크기로 이뤄진다.
2. 트레이 「표시/숨김」(`tray::toggle_overlay`)은 설정을 저장하지만 `settings://changed`를 emit하지 않는다(계약 §4는 "트레이 조작으로 설정이 바뀌면" emit). 이 설계 범위 밖이지만 드래그 저장과 같은 성격의 편차라 기록한다.
3. ~~드래그 저장 직후 설정 저장 시 옛 `overlay.x/y`로 창이 되돌아감(수용)~~ → **해소(2026-09-23, 사용자 신고로 승격)**: 실제로는 R-13 없이도 Ctrl+휠마다 나는 결함이었다(드래그 위치가 저장되지 않아 사본 x/y가 늘 기본값). §2.1.1·D17~D20으로 `set_settings`는 창을 옮기지 않고 x/y를 core 값으로 유지한다.
   - 3-1. **(관찰, 범위 밖)** 같은 성격의 낡은 사본 문제가 `overlay.visible`에 남는다: 트레이 「표시/숨김」이 `settings://changed`를 emit하지 않아(항목 2) 설정 창 사본의 `visible`이 낡은 채 `set_settings`로 저장되면 숨긴 오버레이가 다시 보일 수 있다. 대응 후보: ① 트레이 토글 뒤 emit(항목 2 해소) ② `visible`도 같은 원칙(주인 = 트레이·`set_overlay_visible`)으로 `set_settings`에서 무시. 요구·신고 없음 — 사용자 판단.
4. ~~(사용자 확인) D10 여백 미포함~~ → **사용자 확인 완료(2026-09-23): D10 유지.** 사용자 답: "비율 맞추는 게 좋다, 봉고캣 원본(612×354) 케이스는 무시해도 된다." 비 9:7 캔버스(예: 612×354)에서 창이 450×261이 되는 것을 수용하고, 여백 포함안(`w = 450 × scale, h = 350 × scale`)은 채택하지 않는다.
   - 이 절의 나머지 항목(2, 3-1, 5~9)은 **후속 후보·관찰로 유지**한다. 요구·신고가 생기면 별건으로 설계하며, 이 문서의 확정을 막지 않는다.
5. **(후보, 요구 없음)** 배율을 키워 창이 화면 오른쪽·아래 밖으로 넘어가도 위치를 당기지 않는다. 재시작 때만 R-13 규칙(48px)으로 보정된다. 필요하면 "리사이즈 후 모니터 안으로 당기기"를 요구로 승격.
6. **(후보, 요구 없음)** 레이어 이동 모드에서 팔 조각이 회전해 캔버스 밖으로 나간 부분은 창 밖이라 잘린다(현재 100% 창에서도 같다). 회전 여백을 창에 더하는 것은 요구 밖.
7. **(관찰)** Windows "창을 끄는 동안 내용 표시"가 꺼져 있으면 tao가 DPI 변경 시 물리 크기를 유지한다(`event_loop.rs` 1976–1978) → 다른 DPI 모니터로 옮기면 창과 콘텐츠가 어긋날 수 있다. 대응 후보: `WindowEvent::ScaleFactorChanged`에서 재리사이즈(window가 현재 캔버스·배율을 알아야 해 상태 추가 필요). 기본 설정에서는 발생하지 않는다.
8. **(전제)** Tauri 2 setup·동기 command는 메인 스레드에서 실행되어 `set_size`가 즉시 반영되고, 이어지는 `outer_size()`가 새 크기를 준다. 수동 R10으로 확인한다. 어긋나면 `restore_overlay_position`이 `resize_overlay` 반환 크기(× `scale_factor()`)를 받도록 시그니처 보강을 재설계한다.
9. **(관찰)** Ctrl+휠마다 `set_settings`가 settings.json을 쓰고 리사이즈한다(기존 동작 + 리사이즈 1회). 휠을 빠르게 굴리면 쓰기가 연속된다 — 현재 요구 범위에서는 수용.
10. **(확인 필요, CR-017)** R-tmp-4(커서 모니터 기준 매핑) 요구ID 미부여 — overlay 요구 문서(ui-designer)에 추가 필요. 이동 영역 필드는 [settings.md](settings.md) R-tmp-3.
11. **(전제, CR-017)** 훅 마우스 좌표 = 물리 px(Per-Monitor v2 DPI 인식)이라는 전제는 수동 L3·L4로 확인한다. 어긋나면(논리 px로 오면) 변환 책임을 어디에 둘지 재설계한다 — core가 추측으로 보정하지 않는다.
12. **(확인 필요, WT)** 요구ID — 이 보강은 overlay `requirements.md` R-01(🔒)에 새 요구ID를 만들지 않고 설계ID WT-01~WT-09로만 추적한다. R-01 문구에 "풀려도 다시 맨 위로 돌아온다"를 수용 기준으로 덧붙일지는 ui-designer(요구 문서 소유자)·사용자 판단이다.
13. **(관찰, WT)** 풀리는 원인은 여전히 모른다. 이 설계는 전경 변화 때 복구할 뿐이라, 전경 변화 없이 다른 창이 오버레이 위로 올라오는 경우(예: 다른 앱이 비활성 상태에서 스스로 `HWND_TOPMOST`를 거는 알림 창)는 다음 전경 변화까지 가려질 수 있다. 신고가 이어지면 원인 진단(`kuro_diag` 로그에 `EVENT_OBJECT_REORDER` 개수 등)을 별건 요구로 올린다 — 주기 폴링은 결정 2로 배제됐다.
14. **(판정, window-bridge-error — 2026-10-15 doc-sync)** `window`가 `crate::error::BridgeError`를 import한다(`window/mod.rs:43`). `error.rs`는 「bridge 에러 타입」(계약 `BridgeError`)이다. 기존 공개 함수 6개(`overlay_position`·`set_overlay_position`·`set_overlay_visible`·`apply_overlay_settings`·`show_settings_window`·`screen_bounds`)가 이 타입을 반환하고, `impl From<WindowError> for BridgeError`도 `window/mod.rs:92`에 있다. **core → bridge 역참조가 맞다**(스킬 §1·§5, 이 문서 §2 머리말 「core는 bridge 타입을 모른다」). 모듈 `//!` [에러]가 적은 임시 부채다. **지금 고치지 않는다 → 후속 W-2(core·bridge 묶음)**: 6개 반환을 `WindowError`로 바꾸고 `From` impl을 `error.rs`로 옮긴다. 파급은 `bridge/commands/mod.rs:335·354·366·383·447`, `tray/mod.rs:89·293`, `lib.rs:207`이다. `apply_overlay_settings`는 호출자가 0이다(2026-10-15 Grep, `//!` 언급만). 그래서 후속 W-1(삭제)은 W-2를 기다리지 않고 착수할 수 있다.
