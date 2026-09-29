# overlay-context-menu 횡단 설계 (오버레이 오른쪽 클릭 메뉴)

| 판 | 일자 | 내용 |
|---|---|---|
| v1 | 2026-09-29 | 초안. 분석·전반 설계·RTM·계층별 패킷, 사용자 확인 U-1~U-6 제기 |
| v2 | 2026-09-29 | **사용자 결정 U-1~U-6 반영**(AskUserQuestion 응답). U-1 🔒 누름·뗌 모두 창 안. U-2 포커스 이탈 수용. **U-3 🔒 전체 화면이면 안 띄움**(§2.14 신설, `hook/foreground.rs` 안전 래퍼). U-4 경합 수용. U-5 브라우저 메뉴 제거 동의. U-6 확정사항 갱신은 메인 세션 몫. 갱신한 절: §0, §2.1, §2.9, §2.10, §2.13, §2.14(신설), §3, §4, §6, §7, §8, §9 |
| v3 | 2026-09-29 | **core 7차 설계 동기화**(`doc/200_설계/core/tray.md` 변경이력 7차·§3.7.3·§3.7.5·§3.7.6·§11 T16~T19, 리뷰 CORE-301·SEC-301·CORE-304). 네 가지가 바뀌었다. ① 가드를 2단계 `POPUP_OPEN`에서 3단계 `PopupGate`(Idle→Pending→Open→Idle, **post 전 예약**)로 바꿨다. tao가 모달 동안 사용자 이벤트를 버퍼링했다가 메뉴가 닫힌 뒤 실행하므로, v2 D-6 ③의 전제("재진입을 가드가 막는다")가 틀렸기 때문이다(F12). ② 판정 순서를 상태 → 오버레이 사각형 → 전경 창으로 바꾸고 모두 `overlay-menu`에서 한다. 데이터 최소화(SEC-301)가 이유다. `popup_now`는 사각형을 다시 판정하지 않는다(T18). ③ `lib.rs` 4단계를 `start_input_pipeline`으로 추출했다(T19). ④ T-f·T-j는 사용자에게 수용으로 보고됐고 관찰을 유지한다(R8·R9). 갱신한 절: §0, §1.3, §1.5(F12·F13), §1.6, §2.1, §2.6, §2.9, §2.10, §2.13, §2.14 D-12, §3, §4.1~§4.6, §7(MC-36·MC-37·MC-38), §8 |

- 근거: 사용자 피드백·결정(2026-09-29). 원문은 "그냥 키뷰어에 오른쪽클릭하면 트레이에 뜨는 옵션 같이뜨게하는게 좋을거같아요". 🔒 결정은 네 가지다.
  - 위치 잠금(클릭 통과) 중에도 메뉴가 뜬다. 그 오른쪽 클릭은 아래 창(게임)에도 전달되며, 막지 않는다.
  - U-1: 누른 곳과 뗀 곳이 모두 오버레이 위일 때만 뜬다.
  - U-3: 전체 화면이면 띄우지 않는다.
  - U-5: 브라우저 기본 메뉴를 없앤다.
- 트레이 메뉴 규격은 `doc/000_프로젝트_확정사항.md` §6(100행 트레이 메뉴, 129행 타이머 메뉴, 133행 새로고침)과 `doc/200_설계/core/tray.md` §3.4·§3.6을 따른다.
- 작업 모드: **보강**. 트레이 메뉴·오버레이·전역 훅은 이미 구현돼 있고, 여기에 기능을 더한다.
- 판별: **횡단**이다. 두 계층을 건드리기 때문이다.
  - core: 훅 오른쪽 클릭 신호, 전경 창 조회 래퍼, 창 사각형 판정, 트레이 메뉴 팝업, `lib.rs` 배선.
  - ui: 오버레이 WebView2 기본 메뉴 억제, 요구·설계·TC 문서.
  - bridge: 계약 변경은 없다. 확인만 한다.
- 산출물 형식: 호출자가 [자원 경계]로 **파일 1개**를 지정했다. 그래서 스킬 §3의 01/02/03 다섯 파일 대신 이 문서 하나에 담는다.
  - 구조 분석 = §1
  - 전반 설계 = §2
  - RTM = §3
  - 인계 패킷 = §4(core) · §5(bridge) · §6(ui)
- **core 상세 정본(v3부터):** core 세부(코드 골격·상태 전이표·테스트 표)의 정본은 core-designer가 쓴 `doc/200_설계/core/tray.md` §3.7(7차), `hook.md` §3.9·§3.10, `window.md` §3.1이다. 이 문서 §4와 어긋나면 core 문서가 맞다. 어긋남을 발견하면 이 문서를 다시 동기화한다.
- 분석가 위임은 생략했다. 이 세션에서는 하위 위임이 동작하지 않는다는 호출자 지시에 따라 아키텍트가 직접 읽었다.
  - 읽은 파일: `tray/{mod.rs,timer_menu.rs}`, `hook/mod.rs`, `window/mod.rs`, `lib.rs`(발췌), `bridge/events.rs`(발췌), `capabilities/overlay.json`, `tauri.conf.json`·`Cargo.toml`(발췌), `src/overlay/{index.tsx,requirements.md}`, `src/overlay/design.md`(목차), `src/overlay/test/{change-requests.md,manual-checklist.md}`(번호), v3는 `doc/200_설계/core/tray.md` §3.7.3~§3.7.6·§11
  - 레지스트리 원본: tauri 2.12.0 `tray/mod.rs`·`app.rs`·`window/mod.rs`·`menu/{mod.rs,menu.rs}`, muda 0.20.0 `platform_impl/windows/mod.rs`, wry 0.57.0 `lib.rs`·`webview2/mod.rs`, windows 0.58.0 `Win32/UI/WindowsAndMessaging`·`Win32/Graphics/Gdi`(함수 위치 확인)
  - tao 0.37.1·tauri-runtime-wry 2.12.0의 줄 번호는 tray.md §3.7.3 인용이고, 아키텍트가 직접 열지 않았다.
- 인계 순서: **core(§4) → bridge(§5, 작업 없음 — 세션 생략 권고) → ui(§6)**.

---

## 0. 결론

비유: 트레이 아이콘은 계산대에 달린 호출 벨이다. 이번 일은 진열장(오버레이)에도 같은 벨을 하나 더 다는 것이다. 새 배선을 깔지 않고, 기존 벨의 전선(메뉴 id·핸들러)에 스위치만 병렬로 붙인다. 진열장 유리가 잠겨 손이 닿지 않을 때(클릭 통과)도 누를 수 있어야 한다. 그래서 스위치는 가게 입구 CCTV(전역 훅)에 연결한다. 다만 무대 조명이 꺼진 공연 중(전체 화면 게임)에는 벨이 울리지 않게 한다.

1. **경로 (a)를 확정한다.** 잠금 여부와 관계없이 전역 훅이 **실제 오른쪽 누름→뗌 한 쌍**의 두 좌표를 core에 넘긴다.
   - 두 점이 모두 **보이는 오버레이 창 사각형** 안이면(🔒 U-1), core가 트레이와 같은 `build_menu`로 메뉴를 만들어 `WebviewWindow::popup_menu`로 띄운다.
   - 입구가 하나다. 게다가 post **전에** 예약하는 3단계 게이트(`PopupGate`, v3)를 둔다. 그래서 한 번의 클릭에 메뉴가 두 번 뜨지 않고, 메뉴가 닫힌 뒤 밀린 메뉴가 튀어나오지도 않는다.
2. **메뉴 동작은 새 핸들러 없이 기존 트레이 `on_menu_event`가 처리한다.** Tauri 2.12.0은 `TrayIconBuilder::on_menu_event`를 **전역 메뉴 리스너**로 등록한다(§1.5 F2). 같은 id로 만든 팝업 메뉴의 클릭도 그 핸들러로 간다. 이렇게 해서 항목·동작·타이머 동기화가 구조적으로 트레이와 같아진다.
3. **"오버레이 위" = 창 사각형**이다(투명 부분 포함). 알파 판정은 기각한다(§2.3).
4. **🔒 전체 화면이면 안 띄운다(U-3, §2.14).**
   - 조건: 전경 창이 이 앱 프로세스의 창이 아니고, 바탕 화면·작업표시줄도 아니며, 그 창의 **클라이언트 영역**이 자기 모니터 전체를 덮는다.
   - 판정은 뗌을 처리하는 `overlay-menu` 스레드가 **상태 → 오버레이 사각형 → 전경 창** 순서로 한다(v3, SEC-301). 사각형 밖 클릭에는 다른 앱 창을 조회하지 않는다.
   - Win32 조회는 `hook/foreground.rs` 안전 래퍼에만 두고, `tray/popup.rs`는 안전 함수와 순수 판정만 쓴다.
5. **bridge 계약 변경 0, capabilities 변경 0, 새 크레이트·feature 0.** 새 unsafe는 `hook/foreground.rs` 안에만 생긴다(격리 규칙 준수). ui는 WebView2 기본 오른쪽 클릭 메뉴를 막는 `onContextMenu` preventDefault 1줄과 문서만 고친다.
6. **수용한 한계:**
   - 메뉴가 뜨면 포커스가 옮겨 가고, 자동으로 돌아오지 않는다(🔒 U-2, 트레이와 같은 동작).
   - 잠금 중에는 아래 창의 자체 메뉴와 경합한다(🔒 U-4).
   - 메뉴 바깥의 오버레이를 다시 오른쪽 클릭하면 메뉴가 다시 뜰 수 있다(T-f). 늦게 뜨는 메뉴는 많아야 1개다(T-j). 둘 다 사용자에게 수용으로 보고됐다.
   - 남은 관찰 항목은 R4·R6~R9다(§2.10).

---

## 1. 구조 분석 (현재)

### 1.1 데이터 흐름

```
[win32-input-hook 스레드] mouse_proc(WM_RBUTTONDOWN/UP — info.pt 좌표 있음)
   └─ send(InputEvent::MouseButton{button, pressed, ts})   ← 좌표 없음
        ─mpsc─▶ [input-forwarder 스레드] log_input_diag → bridge::events::emit_input
                  ─▶ "input://mouse-button" {button, pressed, ts} ─▶ overlay inputMachine(클릭 파츠·펜 모드 젤리)

[tray::init] TrayIconBuilder::with_id("main").menu(build_menu(hidden)).on_menu_event(handler)
   Tauri 내부: handler → manager.menu.global_event_listeners.push   (tauri 2.12.0 tray/mod.rs:427-434)
   아무 메뉴 클릭 → EventLoopMessage::MenuEvent → 전역 리스너 전부 호출 (app.rs:2755-2769)
   handler: open_settings | refresh | toggle_overlay | timer_toggle | timer_stop | quit

[설정·타이머 변화] tray::sync_timer_menu → run_on_main_thread → sync_timer_menu_now
   (settings 잠금→해제 → timer 잠금→해제 → tray_timer_view → LAST_VIEW 비교 → build_menu → tray.set_menu)

[위치 잠금] window::apply_overlay_window → set_ignore_cursor_events(position_lock)
   = WS_EX_TRANSPARENT|WS_EX_LAYERED → 오버레이는 OS 적중 판정에서 빠지고 모든 마우스 입력이 아래 창으로 간다
   (overlay design.md §10.9 L-1)

[overlay WebView] .root(100vw×100vh, data-tauri-drag-region, onWheel) — contextmenu 처리 없음
```

### 1.2 계약 목록 (이 기능과 닿는 것)

| 종류 | 이름 | 페이로드 | 소비자 | 이 기능에서 |
|---|---|---|---|---|
| event | `input://mouse-button` | `{ button, pressed, ts }` | overlay inputMachine | 바뀌지 않음 |
| event | `settings://changed` | `Settings` | overlay·settings | 바뀌지 않음(「표시/숨김」 항목은 기존 핸들러가 emit) |
| event | `timer://changed` | `TimerSnapshot` | overlay·settings | 바뀌지 않음(「시작/일시정지/멈춤」은 기존 `publish_timer_change`) |
| 창 기능 | `data-tauri-drag-region` | — | overlay `.root` | 바뀌지 않음 |
| capabilities | `overlay.json` | `core:default`, `core:window:allow-start-dragging` | — | 바뀌지 않음(팝업은 Rust API라 JS 권한이 필요 없다) |
| 메뉴 id | `open_settings`·`refresh`·`toggle_overlay`·`quit`·`timer_toggle`·`timer_stop` | Rust 내부(IPC 아님) | tray 핸들러 | **팝업 메뉴가 같은 id를 다시 쓴다** |

### 1.3 상태 기계

- 입력 상태 기계(`src/state/inputMachine.ts`)는 **바뀌지 않는다.** 오른쪽 클릭은 지금처럼 `mouseButton` 입력으로 들어간다.
- 트레이 메뉴 보기 `TrayTimerView { visible, running }`는 `tray_timer_view(enabled, status)`로 구하고, 마지막 값은 `LAST_VIEW`에 둔다. 이 기능에서 바뀌지 않는다. 팝업은 `LAST_VIEW`를 읽지도 쓰지도 않는다.
- 새로 생기는 상태는 팝업 상태 기계 하나다. `PopupGate`(`AtomicU8` 1개)로 **Idle → Pending → Open → Idle** 세 단계를 돈다(v3). 좌표·시각·횟수는 기억하지 않는다. §2.6에서 다룬다.

### 1.4 설정 스키마

**변경 없음.** 팝업이 읽는 값은 다음과 같다.

| 값 | 쓰는 곳 |
|---|---|
| 창 `is_visible()` | `overlay.visible`의 창 반영값 |
| `timer.enabled` + 타이머 `status` | 메뉴 보기 계산 |

쓰기는 기존 메뉴 핸들러만 한다. 「표시/숨김」이 `overlay.visible`을 쓴다. 전체 화면 판정(U-3)은 설정값이 아니다. 켜고 끄는 설정 없이 항상 적용한다.

### 1.5 확인한 사실 (판단 근거)

| # | 사실 | 근거 |
|---|---|---|
| F1 | tauri 2.12.0, tauri-runtime-wry 2.12.0, muda 0.20.0, wry 0.57.0, webview2-com 0.39.1, windows 0.58 | `src-tauri/Cargo.lock`·`Cargo.toml` |
| F2 | 트레이 빌더의 `on_menu_event`는 **트레이 전용이 아니다.** 문서 주석은 "called for any menu event, whether it is coming from this window, another window or from the tray icon menu". 등록 위치는 `manager.menu.global_event_listeners`이고, 메뉴 이벤트마다 전역 리스너를 모두 호출한 뒤 창별 리스너를 호출한다 | tauri `tray/mod.rs:324-334`·`427-434`, `app.rs:2755-2769` |
| F3 | `Window::popup_menu(&menu)`(커서 위치)와 `popup_menu_at(&menu, pos)`(창 왼쪽 위 기준)가 있다. `WebviewWindow`에도 같은 이름이 있다. 내부 `popup_inner`는 `run_item_main_thread!`로 **메인 스레드에 넘기고 채널로 결과를 기다린다.** 메인 스레드에서 부르면 그 자리에서 바로 실행된다 | tauri `window/mod.rs:1555-1569`, `webview_window.rs:1805-1812`, `menu/menu.rs:29-81`, `menu/mod.rs:26-40` |
| F4 | muda의 Windows 팝업 순서: `GetCursorPos` → **`SetForegroundWindow(hwnd)`** → `TrackPopupMenu(TPM_LEFTALIGN \| TPM_RETURNCMD)`. 메뉴가 닫힐 때까지 반환하지 않는 **모달**이다. `TPM_RIGHTBUTTON`이 없어서 오른쪽 뗌으로는 항목이 선택되지 않는다 | muda `platform_impl/windows/mod.rs:906-930` |
| F5 | WebView2 기본 컨텍스트 메뉴는 **켜져 있다.** wry 기본값이 `default_context_menus: true`이고, 그대로 `SetAreDefaultContextMenusEnabled(true)`가 된다. Tauri 2.12·runtime-wry 2.12는 `with_default_context_menus`를 부르지 않고, `WebviewWindowBuilder`에도 이 옵션이 없다(grep 0건). 프로젝트 `src/`·`src-tauri/src/`에도 `contextmenu`·`onContextMenu` 처리가 0건이다. 따라서 **지금 비잠금 오버레이를 오른쪽 클릭하면 브라우저 메뉴(뒤로·새로 고침·다른 이름으로 저장·인쇄, dev에서는 검사)가 뜬다고 판단한다.** 실물 확인은 MC-31에서 한다 | wry `lib.rs:1769`, `webview2/mod.rs:638` |
| F6 | 알파 기준 끌기(CR-040, 수동 M-40a)는 **설정 창 미리보기**의 TS 판정이다(`src/settings/design/drag-hit.md`, `alphaMask`). 오버레이 창에는 알파 판정이 없다. 오버레이의 끌기·Ctrl+휠은 창 전체가 대상이다(`.root` 100vw×100vh, CR-012) | grep, overlay requirements v1.3 |
| F7 | 훅 좌표(`MSLLHOOKSTRUCT.pt`)와 창 `outer_position`·`outer_size`는 둘 다 **물리 px 가상 화면 좌표**다 | `window/mod.rs` `//! [좌표]` |
| F8 | `hook/mod.rs`는 693줄로 800줄 한계에 가깝다. `tray/mod.rs`는 282줄이다. `bridge/events.rs::emit_input`은 `InputEvent`를 `match *ev`로 세 갈래 모두 분해한다. 그래서 `InputEvent` 모양을 바꾸면 bridge 파일까지 파급된다 | 파일 열람 |
| F9 | `lib.rs` setup은 트레이 init → 훅 start → `input-forwarder` 스레드 순서다. setup 클로저는 이미 50줄을 넘었다(core-designer 실측 84줄) | `lib.rs:146-165`, tray.md §3.7.6 |
| F10 | R-28 원문은 "위치 잠금 중에는 오버레이를 클릭할 수 없어 설정 창(트레이 → 설정 열기)에서만 푼다"이다. 이번 메뉴에는 잠금 항목이 없으므로, 잠금 해제는 여전히 설정 창에서만 한다. 다만 잠금 중에도 **「설정 열기」에 오버레이에서 바로 닿는 길**이 생긴다 | overlay requirements R-28 |
| F11 | 전경 창 판정에 필요한 Win32 함수가 **현재 `windows` feature로 모두 쓸 수 있다.** `Cargo.toml` 변경은 필요 없다. `GetForegroundWindow`·`GetWindowThreadProcessId`·`GetShellWindow`·`GetClassNameW`·`GetClientRect`는 `Win32_UI_WindowsAndMessaging`, `ClientToScreen`·`MonitorFromWindow`·`GetMonitorInfoW`는 `Win32_Graphics_Gdi` 소속이며, 두 feature 모두 이미 켜져 있다 | windows 0.58.0 `WindowsAndMessaging/mod.rs:1076·1092·1172·1464·1631`, `Gdi/mod.rs:157·1530·2115`, `Cargo.toml:27-33` |
| F12 | **(v3, CORE-301)** tao 0.37.1은 이벤트 핸들러가 실행 중이면(= `popup_now` 안의 `TrackPopupMenu` 모달) `run_on_main_thread`로 온 사용자 이벤트를 **버퍼에 쌓았다가 핸들러가 끝난 뒤 실행**한다. 그래서 모달 중 `popup_now` 재진입은 일어나지 않는다. 대신 모달 동안 post된 요청은 **메뉴가 닫힌 뒤** 실행된다. v2 D-6 ③의 전제("재진입을 가드가 막는다")는 틀렸다 | tao `platform_impl/windows/event_loop/runner.rs:143-148`(`should_buffer`)·`:208-226`(`send_event`) — tray.md §3.7.3 인용 |
| F13 | **(v3)** 창 getter(`is_visible`·`outer_position`·`outer_size`)를 메인이 아닌 스레드에서 부르면, 메인 스레드로 넘기고 답을 기다리는 **스레드 안전한 동기 왕복**이 된다(타임아웃 없음). 메인 스레드가 tao 핸들러 안에 머무는 동안은 기다린다. 앱이 종료되면 `recv`가 `Err`로 풀린다 | tauri-runtime-wry 2.12.0 `src/lib.rs:196-210·263-278·1886·1894·1939` — tray.md §3.7.3 PU-h 인용 |

### 1.6 문제점·제약

- **잠금 중에는 WebView가 클릭을 받지 못한다.** 따라서 훅 경로가 필수다. 사용자 결정에 따라 오른쪽 클릭은 아래 창에도 그대로 전달된다. `CallNextHookEx`는 그대로 두고 삼키지 않는다.
- **비잠금 중에는 WebView2 기본 메뉴가 뜬다(F5).** 어느 경로를 택하든 이 메뉴는 억제해야 한다.
- **훅 콜백은 최소 작업만 한다.** 채널 send만 하고, 콜백 안에서 UI·Tauri·로그·전경 창 조회를 부르지 않는다. 느리면 `LowLevelHooksTimeout`으로 훅이 강제 해제된다.
- **팝업은 메인 스레드 모달이다(F3·F4).** 다른 스레드가 `popup_menu`를 동기로 부르면, 그 스레드는 **메뉴가 닫힐 때까지 멈춘다.** `input-forwarder`가 부르면 그동안 입력 이벤트 전달이 멈추므로 금지한다.
- **모달 동안 post된 요청은 버퍼에 쌓였다가 닫힌 뒤 실행된다(F12, v3).** 그래서 중복 방지 가드는 "실행 시점"이 아니라 **"post 전"**에 잡아야 한다.
- **다른 스레드에서 부르는 창 getter는 메인 스레드와 동기 왕복이다(F13, v3).** 우리 모달이 열려 있을 때 부르면 메뉴가 닫힐 때까지 막힌다. 그래서 창 getter는 상태가 Idle일 때만 부른다.
- `unsafe`는 `hook/` 안에서만 쓸 수 있고 새 크레이트는 금지다. 그래서 WebView2 COM 설정(`with_webview` + `ICoreWebView2Settings`)을 직접 부를 수 없다(§2.7). 전경 창 조회 Win32는 `hook/` 안의 안전 래퍼로 둔다(§2.14).

---

## 2. 전반 설계

### 2.1 목표 구조

```
[win32-input-hook] mouse_proc
   ├─ (기존) send(InputEvent)  ─mpsc─▶ [input-forwarder] → emit input://mouse-button   (변경 없음)
   └─ (신규) track_right_click(msg, pt)
         WM_RBUTTONDOWN → RIGHT_CLICK.on_down(pt)                 (Mutex 1회, 할당 없음)
         WM_RBUTTONUP   → RIGHT_CLICK.on_up(pt) → Some(RightClick{down, up})
                          → send_click ─mpsc─▶ [overlay-menu 스레드, 신규]  request_popup(click)   (v3 — 판정·예약 모두 여기)
                                                 ① POPUP.is_idle()? 아니면 버림(Pending·Open — 창 getter·전경 조회 안 함)
                                                 ② window::overlay_screen_rect(app)   (창 getter — 메인 동기 왕복, Idle일 때만 F13)
                                                    should_popup(rect, click): 숨김 또는 down·up 중 하나라도 밖 → 버림  ← 🔒 U-1·AC-4
                                                 ③ hook::foreground_snapshot()   (Win32, hook/ 안전 래퍼 — ②를 통과한 클릭만, SEC-301)
                                                    suppress_for_fullscreen(snap) → true면 버림   ← 🔒 U-3
                                                 ④ POPUP.try_reserve()  (Idle→Pending) 실패면 버림
                                                 ⑤ app.run_on_main_thread(popup_now)  ← 비동기 post. 실패면 POPUP.cancel() (Pending→Idle)
                                                 (①②③은 should_request(idle, click, rect, foreground) 한 줄 — && 단락 평가)
[메인 스레드] popup_now()
   ① POPUP.begin_open()  (Pending→Open, OpenGuard. 실패 = 도달 불가 → return, 상태 불변)
   ② current_view(app) → build_menu(app, view)          ← 트레이와 같은 함수·같은 id
   ③ overlay.popup_menu(&menu)  — TrackPopupMenu 모달, 닫힐 때까지 대기
   ④ OpenGuard drop → Idle  (모든 반환 경로)
   ※ 사각형 재판정 없음 — 클릭 시각에 가까운 ②가 🔒 U-1 정의에 맞다(T18)
   항목 클릭 → MenuEvent → (기존) tray on_menu_event 전역 리스너 → 트레이와 같은 동작
[overlay WebView] .root onContextMenu = preventDefault   ← WebView2 기본 메뉴 억제(비잠금 때만 의미 있음, 🔒 U-5)
```

### 2.2 판정 경로 (D-1) — (a) 채택

| 기준 | (a) 잠금·비잠금 모두 훅 → core 팝업 | (b) 비잠금은 WebView `contextmenu` → bridge command, 잠금은 훅 |
|---|---|---|
| 경로 수 | **1** | 2(잠금 상태로 갈라짐) |
| 한 클릭에 두 번 표시될 위험 | 구조적으로 없음. 입구가 하나다 | 있음. 비잠금 중에는 훅도 같은 클릭을 본다. 막으려면 훅 경로에서 `position_lock`을 읽어 꺼야 하고, 잠금을 바꾸는 순간의 경합(설정 반영과 `set_ignore_cursor_events` 사이)이 남는다 |
| 계약 변경 | 없음 | 새 command(예: `show_overlay_menu`) + TS 래퍼 + 계약 버전 올림 + ui 호출 |
| 필요한 계층 | core + ui(억제 1줄) | core + bridge + ui |
| 훅 경로 | 필요 | **어차피 필요**(잠금 중) |
| WebView2 기본 메뉴 억제 | 필요(ui) | 필요(ui) — 같음 |
| 판정 로직 위치 | core 한 곳(창 사각형·전체 화면) | 두 곳(WebView 이벤트 영역 + core 창 사각형·전체 화면) |
| 트리거 규칙 일관성 | 잠금·비잠금이 같은 규칙(누름·뗌 좌표) | WebView는 뗌에서 `contextmenu`, 훅은 별도 규칙이라 두 모드의 체감이 갈릴 수 있음 |

- **기각 이유 (b):** 잠금 때문에 훅 경로를 어차피 만들어야 한다. 그 위에 두 번째 입구를 더하면 중복 표시를 막는 조건 분기와 새 계약만 늘어난다. 얻는 것이 없다.
- **(a)의 약점:** 비잠금 중에도 WebView가 아니라 훅 신호로 판정하므로 WebView의 판정 기준과 어긋날 수 있다. 하지만 오버레이 WebView는 창 전체를 받는다(F6). 그래서 창 사각형 판정과 적중 영역이 같다.

### 2.3 "오버레이 위"의 정의 (D-2) — 창 사각형

- **채택: 보이는 오버레이 창의 바깥 사각형**(`outer_position` + `outer_size`, 물리 px)이다. 반열림 구간 `[x, x+w) × [y, y+h)`으로 본다.
- 근거
  1. 비잠금 오버레이에서 끌기·Ctrl+휠이 이미 창 전체에서 동작한다(투명 부분 포함, CR-012). 오른쪽 클릭도 같은 영역이어야 사용자가 헷갈리지 않는다.
  2. 창 크기는 표시 크기에 맞춰 자동으로 조절된다(R-03). 그래서 사각형이 그림 상자와 거의 같다.
  3. 좌표계가 훅과 같다(F7).
- **알파(>0) 픽셀 판정은 기각한다.**
  1. 재사용할 로직이 없다. 기존 알파 판정(CR-040·M-40a)은 설정 창 미리보기의 TS 코드이고, 한 장의 그림을 캔버스 좌표로 판정한다(F6).
  2. 오버레이에 실제로 보이는 모양은 WebView만 안다. 레이어 합성, 젤리·부르르 변형, 팔 회전·늘어남, 펜 손, 배율이 모두 반영된 결과이기 때문이다. core가 이를 판정하려면 렌더링을 Rust에 복제해야 하고, "판정 로직 한 곳" 원칙(스킬 §2.2)에 어긋난다.
  3. 비잠금 중에 투명 부분을 오른쪽 클릭해도 WebView가 클릭을 받는다. 알파 판정을 쓰면 "클릭은 먹혔는데 메뉴는 없음"이라는 어긋남이 생긴다.

### 2.4 트리거 규칙 (D-3, 🔒 U-1) — 실제 누름·뗌 좌표가 둘 다 창 안

- 메뉴는 오른쪽 버튼 **뗌**에서 띄운다. Windows 관례상 `WM_CONTEXTMENU`도 뗌에서 생긴다. 누름에서 띄우면, 메뉴가 떠 있는 동안 뗌이 들어온다.
- 조건은 **훅이 실제로 본 누름 좌표와 뗌 좌표가 모두 창 사각형 안**인 것이다(🔒 사용자 결정 2026-09-29). 게임에서 오른쪽 끌기(시점 회전 등)가 오버레이 밖에서 시작해 안에서 끝나거나, 그 반대인 경우에는 메뉴를 띄우지 않는다.
- 사각형은 뗌 직후 `overlay-menu`에서 한 번만 읽는다(v3, T18).
- `recover_missed_mouse_releases`가 만든 **합성 뗌**(CR-046 뗌 유실 정리)으로는 메뉴를 띄우지 않는다. 합성 뗌은 다른 키를 누를 때 생기므로 메뉴와 무관하다. 그래서 합성 뗌이 생기면 기록해 둔 누름 좌표도 버린다.
- 좌클릭·가운데 버튼·휠은 해당하지 않는다. 좌클릭은 지금처럼 끌기다.

### 2.5 메뉴 공유·동기화 (D-4, D-5)

- **D-4 이벤트:** 팝업 메뉴는 트레이와 **같은 id**의 항목으로 만든다. 클릭은 `tray::init`의 기존 `on_menu_event`(전역 리스너, F2)가 처리한다.
  - **새 `on_menu_event`를 등록하면 안 된다.** 앱·창·트레이 어디에 등록하든 같은 이벤트를 받으므로, 한 번의 클릭이 두 번 실행된다. 예를 들어 「표시/숨김」이 두 번 토글되어 원래대로 돌아간다.
- **D-5 메뉴 인스턴스:** 팝업할 때마다 `build_menu(app, current_view(app))`로 **새로** 만든다.
  - `current_view`는 `sync_timer_menu_now`의 보기 계산부를 뽑아낸 함수다. 트레이와 팝업이 이 함수를 같이 쓴다.
  - 따라서 뜨는 순간의 설정·타이머 상태가 트레이 메뉴와 같다. 타이머가 꺼져 있으면 4항목이다. 켜져 있고 흐르는 중이면 「일시정지」, 그 밖이면 「시작」이 붙는다.
  - `LAST_VIEW`와 트레이 메뉴 객체는 건드리지 않는다.
- 메뉴가 열려 있는 동안 상태가 바뀌어도(예: 카운트다운 끝남) 라벨은 새로 고쳐지지 않는다. 트레이 메뉴와 같은 한계다.
  - 동작은 안전하다. `control_timer_from_tray`는 라벨이 아니라 **클릭 순간의 상태**로 Start/Pause를 정한다(`tray/mod.rs:220-228`).
- 같은 id의 항목이 트레이 메뉴와 팝업 메뉴에 동시에 있어도 된다. `sync_timer_menu`가 이미 같은 id로 메뉴를 다시 만들어 교체하고 있다. 이벤트는 id 문자열만 싣고, 같은 id의 의미는 같다.

### 2.6 중복 표시 방지 (D-6) — 3중 (v3 개정)

1. **경로 단일화(D-1):** 메뉴를 띄우는 곳은 훅 → `overlay-menu` → 메인 스레드 하나뿐이다.
2. **WebView2 기본 메뉴 억제(D-7):** 비잠금 중에 브라우저 메뉴가 같이 뜨는 것을 막는다.
3. **3단계 상태 기계 `PopupGate`(Idle → Pending → Open → Idle):**
   - `overlay-menu`가 post **전에** `Idle → Pending`으로 예약한다(`try_reserve`, compare_exchange).
   - Pending(보냈지만 아직 실행 전)이나 Open(메뉴 열림) 동안 온 클릭은 ①에서 버리고 post하지 않는다.
   - 그래서 post된 `popup_now`는 언제나 많아야 하나다. 모달 동안 쌓였다가 메뉴가 닫힌 뒤 실행될 **밀린 `popup_now`가 생기지 않는다**(F12).
   - 메뉴가 오버레이 사각형 위에 겹쳐 그려지면 메뉴 위 오른쪽 클릭도 사각형 판정을 통과한다. 그래서 이 단계가 필요하다.

| 현재 | 사건 | 누가 | 다음 |
|---|---|---|---|
| Idle | 판정 ①~③ 통과 → `try_reserve` 성공 | overlay-menu | **Pending**(그다음 post) |
| Idle | 판정에서 걸림(사각형 밖·숨김·전체 화면·창 조회 실패) | overlay-menu | Idle |
| Pending | post 실패 | overlay-menu | **Idle**(`cancel`) |
| Pending·Open | 새 클릭 | overlay-menu | 불변(①에서 버림 — 창 getter·전경 조회 안 함) |
| Pending | `popup_now` 시작 → `begin_open` | 메인 | **Open** |
| Open | `popup_now`가 어떤 경로로든 반환 | 메인 | **Idle**(`OpenGuard` Drop) |

- **v2의 2단계 `POPUP_OPEN`을 폐기한 이유(CORE-301):**
  - 이 플래그는 메인 스레드가 `popup_now`를 시작할 때에야 참이 됐다. 그래서 post와 실행 사이에 온 클릭을 거르지 못했다.
  - 모달 중 post된 요청은 tao 버퍼에 쌓였다가, 메뉴가 닫혀 플래그가 풀린 **뒤** 실행돼 통과했다(F12).
  - 결과적으로 빠른 오른쪽 두 번 클릭에 메뉴가 닫히자마자 다시 떴다. 상세는 tray.md §3.7.3·§11 T16.
- **남는 관찰(R8·R9):**
  - 메뉴 **바깥의 오버레이 위**를 오른쪽 클릭하면, 누름이 메뉴를 닫아 Idle로 돌아간 뒤 뗌이 도착한다. 그래서 새 메뉴가 그 자리에 다시 뜰 수 있다(동시에 둘은 아님, T-f).
  - 메인 스레드가 다른 이유로 오래 막히면 늦은 메뉴가 뜰 수 있는데, 많아야 1개다(T-j).
  - 둘 다 수용으로 보고됐다.

### 2.7 WebView2 기본 메뉴 억제 (D-7, 🔒 U-5 동의) — ui `onContextMenu` preventDefault

- **채택:** 오버레이 `.root`(창 전체, 100vw×100vh)에 `onContextMenu={e => e.preventDefault()}`를 단다.
  - React `onContextMenu`는 passive가 아니다. 그래서 `onWheel`과 달리 `preventDefault`가 실제로 효력이 있다. Chromium은 `contextmenu` 기본 동작이 취소되면 기본 메뉴를 띄우지 않는다.
- **core 대안은 기각한다.**
  1. Tauri 2.12 `WebviewWindowBuilder`에 기본 메뉴를 끄는 옵션이 없다(F5).
  2. `with_webview` + `ICoreWebView2Settings::SetAreDefaultContextMenusEnabled(false)`에는 COM 호출(`unsafe`)이 필요한데, 그 자리가 `window/` 즉 hook 밖이다. 또 `webview2-com`을 직접 의존성으로 더해야 해서 설치 금지 규칙에 걸린다.
  3. 초기화 스크립트 주입(`initialization_script`)도 결국 같은 JS다. 게다가 ui 파일이 아닌 곳에 화면 동작을 숨기게 된다.
- 설정 창 WebView2 기본 메뉴는 **범위 밖**이다. 잠금 중 설정 창 위에서 생기는 경합은 U-4 결정에 따라 수용한다.

### 2.8 좌표 전달 (D-8) — 훅의 별도 채널 `RightClick`

| 대안 | 판정 |
|---|---|
| **별도 신호 `RightClick { down, up }` + 두 번째 채널** | **채택.** 정확한 좌표(`info.pt`)를 쓴다. 합성 뗌과 구분된다(실제 `WM_RBUTTONUP`에서만 만든다). `InputEvent`·`bridge/events.rs`는 무변경이다. 콜백 추가 작업은 Mutex 1회와 뗌 때 send 1회다 |
| `InputEvent::MouseButton`에 `x, y` 추가 | 기각. `bridge/events.rs`의 `match *ev` 분해가 컴파일 오류가 나서 core 세션이 bridge 파일을 고쳐야 한다(자원 경계 위반). 합성 뗌과 구분도 안 된다 |
| forwarder가 마지막 `MouseMove` 좌표를 기억 | 기각. 이동이 16ms 스로틀이라 좌표가 늦을 수 있다. 합성 뗌과 구분도 안 된다 |
| 메인 스레드에서 `GetCursorPos`/`cursor_position()`으로 확인 | 기각. 누름 좌표를 알 수 없어 D-3을 할 수 없다. 합성 뗌에도 반응한다 |

- 참고(R8·R9): T-f·T-j를 없애려면 `RightClick`에 누름 시각 같은 시점 정보를 실어야 한다. 그러면 "게이트가 열려 있던 동안 시작된 클릭"이나 "늦게 도착한 클릭"을 버릴 수 있다. 이 타입 변경은 관찰 결과를 보고 이 세션에서 판단한다(현재 미반영).

### 2.9 상태별 동작표

| 오버레이 | 위치 잠금 | 전경 창 | 오른쪽 클릭 위치 | 결과 |
|---|---|---|---|---|
| 표시 | 꺼짐 | 무관(보통 클릭으로 오버레이가 활성화돼 이 앱 창) | 누름·뗌 모두 창 안 | 트레이와 같은 메뉴 1개. WebView2 기본 메뉴 없음(D-7). 클릭은 WebView가 받는다(아래 창에는 가지 않음). 오버레이 클릭 파츠·펜 모드 젤리는 지금처럼 |
| 표시 | **켜짐** | 전체 화면 아님(창 모드 게임·최대화 창·바탕 화면·작업표시줄 포함) | 누름·뗌 모두 창 안 | 트레이와 같은 메뉴 1개. **클릭은 아래 창에도 전달된다**(🔒, 삼키지 않음). 아래 창이 자체 메뉴를 띄우면 경합한다(🔒 U-4 수용) |
| 표시 | 무관 | **다른 앱의 전체 화면**(독점·테두리 없는 전체 화면, 브라우저 F11·동영상 전체 화면 포함) | 누름·뗌 모두 창 안 | **메뉴 없음(🔒 U-3).** 클릭은 지금처럼 전달된다(잠금 중이면 아래 창으로, 비잠금이면 WebView로) |
| 표시 | 무관 | 무관 | 한쪽만 창 안 | 메뉴 없음(🔒 U-1). 전경 창은 조회하지 않는다(v3) |
| **숨김** | 무관 | 무관 | 옛 자리 | 메뉴 없음. `overlay_screen_rect`가 `None`이다. 숨긴 창의 사각형은 판정에 쓰지 않는다. 전경 창은 조회하지 않는다 |
| 표시 | 무관 | 무관 | 메뉴가 열려 있고 그 **메뉴 위** | 두 번째 메뉴 없음(Open → ①에서 버림, D-6 ③) |
| 표시 | 무관 | 무관 | 메뉴가 열려 있고 **메뉴 바깥의 오버레이 위** | 누름이 메뉴를 닫아 Idle로 돌아간 뒤 뗌이 도착한다. 그래서 새 메뉴가 그 자리에 다시 뜰 수 있다. 동시에 둘은 없다(R8·T-f, 수용 — MC-37 ①-b에 기록) |
| 표시 | 무관 | 무관 | 트레이 메뉴가 열려 있는 중 | 보통은 첫 바깥 클릭이 트레이 메뉴를 닫는다. 그 뒤 팝업이 뜨는지는 관찰 대상이다. 늦게 뜨는 메뉴는 많아야 1개(R9·T-j, MC-38) |

- **설정 창이 열려 있을 때**
  - 팝업은 설정 창과 무관하게 뜬다. 설정 창이 전경이어도 이 앱 창이라 전체 화면 판정에서 빠진다.
  - 「설정 열기」는 기존 `show_settings_window`를 따르므로 이미 있는 창을 보이고 앞으로 가져온다. 두 번째 창은 생기지 않는다(CR-041).
  - 오버레이는 항상 위이므로 비잠금 중에는 설정 창과 겹쳐도 오버레이가 클릭을 받는다.
  - 잠금 중에 오버레이 바로 아래가 설정 창이면, 클릭이 설정 창 WebView2로 가서 설정 창의 기본 메뉴가 같이 뜰 수 있다. U-4에 따라 수용한다.
- **타이머:** 메뉴 항목은 뜨는 순간의 `timer.enabled`·`status`로 정한다(D-5). 트레이와 같다.
- **「오버레이 표시/숨김」을 고르면:** 기존 `toggle_overlay`가 숨기고 저장하고 `settings://changed`를 보낸다. 숨긴 뒤 다시 보이는 길은 트레이뿐이다. 트레이에서 같은 항목을 골랐을 때와 같다.
- **메뉴를 띄운 뒤 포커스(🔒 U-2 수용):** muda가 `SetForegroundWindow(overlay)`를 부르므로 게임·작업 창은 키보드 포커스를 잃는다. 메뉴를 닫아도 자동으로 돌아가지 않는다. 트레이 메뉴와 같은 동작이며, 복귀 기능은 만들지 않는다.

### 2.10 위험 (결정 반영 후)

| # | 위험 | 원인 | 처리 |
|---|---|---|---|
| R1 | 메뉴가 뜨면 게임이 키보드 포커스를 잃는다. 메뉴를 닫은 뒤 게임을 한 번 클릭해야 입력이 돌아갈 수 있다 | muda `SetForegroundWindow(overlay)`(F4), 트레이 메뉴와 같은 방식 | **🔒 U-2 수용.** 복귀 기능 없음. MC-39에서 기록만 한다 |
| R2 | 독점 전체 화면 게임에서 오버레이가 보이지 않는 자리의 오른쪽 클릭에 팝업이 떠, 게임이 최소화되거나 화면이 전환된다 | 사각형 판정은 기하만 본다 | **🔒 U-3으로 해소.** 전경이 전체 화면이면 팝업하지 않는다(§2.14). 확인은 MC-40·MC-41 |
| R3 | 잠금 중 아래 창의 자체 오른쪽 클릭 메뉴(바탕 화면·탐색기·브라우저·설정 창)와 경합한다 | "클릭을 막지 않음" 결정의 직접적인 결과 | **🔒 U-4 수용.** MC-34에서 관찰만 한다 |
| R4 | `SetForegroundWindow`가 거부될 수 있다(전경 잠금 규칙). 이때 메뉴는 뜨지만 **바깥을 클릭해도 닫히지 않거나** 키보드로 조작이 안 될 수 있다 | 잠금 중에는 마지막 입력을 받은 프로세스가 아래 창이다 | 문서로 확정할 수 없다. MC-37에서 확인하고, 실패하면 core 세션이 이 세션으로 되돌린다 |
| R5 | 메뉴가 열린 동안 메인 스레드는 `TrackPopupMenu` 모달 루프에 있고, 그동안 post된 사용자 이벤트는 버퍼에 쌓인다(F12) | F4·F12 | 트레이 메뉴와 같은 조건이다. 훅·`input-forwarder`는 따로 돌아서 멈추지 않는다. `overlay-menu`는 Pending·Open 동안 ①에서 버리므로 창 getter를 부르지 않고, 우리 모달에 막히지 않는다(v3). 애니메이션이 계속되는지는 관찰만 한다(MC-39) |
| R6 | 전체 화면 판정과 창 활성화의 순서 경합 | 판정 시점(뗌 처리 직후)에 전경 창이 이미 바뀌었을 수 있다. (가) 다중 모니터에서 전체 화면 게임은 A 모니터, 잠금 오버레이는 B 모니터에 있으면, 오른쪽 누름이 B의 아래 창을 활성화해 전경이 바뀐다. (나) 비잠금 오버레이 클릭은 오버레이 자신을 활성화한다 | 정의(🔒 "전경 창이 우리 창이 아니고 …")대로 판정 순간의 전경만 본다. (가)는 뜰 수 있다. (나)는 전경이 이 앱이라 뜬다(그 클릭이 이미 게임 포커스를 가져간 뒤다). MC-45에서 관찰한다 |
| R7 | 셸의 다른 전체 화면 창(Alt+Tab 전환 화면, 작업 보기, 잠금 화면 등)이 전경이면 전체 화면으로 판정돼 메뉴가 생략될 수 있다 | 예외 목록은 바탕 화면·작업표시줄뿐이다(§2.14 D-10 ③) | 그 화면이 떠 있는 동안에는 오버레이를 조작할 일이 드물어 수용한다. 관찰만 한다(MC-43 비고) |
| **R8** (v3, T-f) | 메뉴가 열린 채 **메뉴 바깥의 오버레이 위**를 오른쪽 클릭하면, 메뉴가 닫히고 그 자리에 새 메뉴가 다시 뜰 수 있다. 동시에 두 개는 아니고, 바탕 화면 메뉴의 "닫고 다시 열기"와 같은 모양이다 | 누름이 `TrackPopupMenu` 바깥 클릭으로 메뉴를 닫아 Idle이 된 뒤 뗌이 도착해, 새 요청으로 정상 통과한다. 3단계 게이트로도 남는다(게이트는 "post됐지만 실행 전" 요청만 막는다) | **사용자에게 수용으로 보고됨(2026-09-29) — 관찰 유지.** MC-37 ①을 "메뉴 위"와 "메뉴 바깥의 오버레이 위"로 나눠 기록한다. 없애려면 D-8 타입 변경(`RightClick`에 누름 시점 정보)이 필요하다. 관찰 결과로 이 세션이 판단한다 |
| **R9** (v3, T-j) | 메인 스레드가 우리 메뉴가 아닌 이유로 tao 핸들러 안에 오래 머물면 `overlay-menu`가 창 getter에서 그만큼 기다리고, 그 사이 온 클릭은 채널에 쌓인다 | F13 동기 왕복. 현재 코드에서 그런 경로는 알려져 있지 않다. 트레이 메뉴 모달이 해당되는지는 미확인이다 | **수용으로 보고됨 — 관찰 유지.** 풀린 뒤 첫 클릭만 Pending이 되고 나머지는 ①에서 버려져, 늦게 뜨는 메뉴는 **많아야 1개**다. MC-38에서 관찰한다. 늦은 클릭까지 버리려면 `RightClick`에 시각이 필요하다(D-8 변경) |

### 2.11 계약 변경 목록

| 종류 | 이름 | 변경 | 하위 호환 | 소비자 |
|---|---|---|---|---|
| — | — | **없음.** command·event·페이로드·에러 코드·capabilities 모두 그대로다. contract v0.27 유지 | 해당 없음 | — |

core 내부의 공개 API는 바뀐다. 모두 계약 밖의 Rust 크레이트 내부 API이고, 호출자는 `lib.rs`와 `tray` 모듈뿐이다.
- `hook::start` 시그니처
- `hook::RightClick`
- `hook::foreground_snapshot`·`ForegroundSnapshot`·`ScreenRect`
- `window::overlay_screen_rect`
- `tray::spawn_popup_listener`

### 2.12 설정 스키마 변경

**없음.** 버전 승격도 마이그레이션도 없다.

### 2.13 비기능 목표

| 항목 | 목표 | 측정 |
|---|---|---|
| 훅 콜백 추가 비용 | 오른쪽 버튼 메시지에만 Mutex 1회, 뗌 때 send 1회. 이동·키보드 메시지에는 0. 할당 없음. **전경 창 조회는 콜백에서 하지 않는다** | 코드 검토(verify-core-reviewer Phase 4) |
| 창 사각형 판정 비용(v3) | 상태가 Idle일 때 실제 오른쪽 클릭 1회마다 `overlay-menu`에서 창 getter 3회(메인 스레드 동기 왕복, 쉬는 메인 기준 마이크로초 단위). Pending·Open이면 0 | 코드 검토 |
| 전체 화면 판정 비용(v3) | **Idle이면서 오버레이 사각형 안인 오른쪽 클릭에만** user32/gdi32 조회 약 8회(마이크로초 단위). 화면 다른 곳의 오른쪽 클릭에는 다른 프로세스 창 조회가 없다(SEC-301 데이터 최소화) | 코드 검토, 단위 테스트 PM11~PM15(단락 평가) |
| 오른쪽 뗌 → 메뉴 표시 | 체감 지연 없음(목표 < 100ms) | 수동 MC-31 관찰 |
| 유휴 CPU | `overlay-menu` 스레드는 `recv` 대기라 0 | 작업 관리자 관찰(선택) |
| 입력 전달 | 메뉴가 열린 동안에도 `input-forwarder`가 막히지 않는다 | MC-39 |

### 2.14 전체 화면이면 안 띄움 (D-10~D-12, 🔒 U-3)

비유: 극장 안내원(팝업)은 객석 불이 켜져 있을 때만 들어온다. 불이 꺼진 상영 중(다른 앱이 화면 하나를 통째로 쓰는 중)이면, 누가 손을 들어도 들어가지 않는다. 다만 극장 로비(바탕 화면·작업표시줄)나 우리 매표소(이 앱 창)는 상영관이 아니다.

**D-10 판정 정의.** 아래 네 조건이 **모두** 참이면 "전체 화면"으로 보고 팝업을 생략한다. 사용자 정의(🔒)를 실행할 수 있는 형태로 옮긴 것이다.

| # | 조건 | Win32(모두 `hook/foreground.rs` 안) |
|---|---|---|
| ① | 전경 창 F가 있다 | `GetForegroundWindow()` ≠ NULL |
| ② | F가 **이 앱 프로세스의 창이 아니다**. 오버레이·설정 창·트레이 숨은 창·우리 메뉴 모두 이 앱 창이다 | `GetWindowThreadProcessId(F)`의 pid ≠ `std::process::id()` |
| ③ | F가 **바탕 화면·작업표시줄이 아니다** | F ≠ `GetShellWindow()`이고, `GetClassNameW(F)`가 `Progman`·`WorkerW`·`Shell_TrayWnd`·`Shell_SecondaryTrayWnd`가 아니다 |
| ④ | F의 **클라이언트 영역**(화면 좌표)이 **F가 있는 모니터 전체**를 덮는다 | `GetClientRect(F)` + `ClientToScreen`(왼쪽 위·오른쪽 아래 두 점)과 `MonitorFromWindow(F, MONITOR_DEFAULTTONEAREST)` → `GetMonitorInfoW().rcMonitor`(작업 영역이 아니라 모니터 전체)를 비교해 `client.left ≤ mon.left && client.top ≤ mon.top && client.right ≥ mon.right && client.bottom ≥ mon.bottom` |

- ③ 바탕 화면 예외의 근거: 바탕 화면을 클릭하면 전경이 `Progman` 또는 배경 창 `WorkerW`가 된다. 이 창들은 모니터(가상 화면) 전체를 덮으므로 ④만 보면 전체 화면으로 오판한다. 잠금 오버레이를 바탕 화면 위에 두고 쓰는 흔한 경우에 메뉴가 사라지는 결함이 되므로 명시적으로 뺀다.
  - `GetShellWindow()` 비교는 클래스명 비교를 보강한다.
  - 작업표시줄은 원래 ④를 만족하지 않지만 의도를 분명히 하려고 목록에 넣는다(해롭지 않음).
- ② "우리 창"은 창 라벨이 아니라 **프로세스**로 판정한다. 오버레이·설정 창·트레이 메뉴 창이 전경일 때 한꺼번에 빠지고, 창 목록이 늘어도 규칙이 바뀌지 않는다.

**D-11 "창 사각형 = 클라이언트 영역" 해석 — "창 모드 게임(테두리 있음)에서는 뜬다"의 보장.**
- 채택은 클라이언트 영역이다(제목 표시줄·테두리 제외).
  - 테두리 없는 전체 화면·독점 전체 화면은 클라이언트 영역 = 모니터라서 생략된다.
  - 테두리가 있는 창은 최대화해도 제목 표시줄만큼 클라이언트 위쪽이 모니터 위쪽보다 아래라서 **항상 뜬다.** 작업표시줄 자동 숨김이어도 같다.
- 기각한 대안은 다음과 같다.

| 대안 | 기각 이유 |
|---|---|
| `GetWindowRect`(바깥 사각형) | 최대화 창은 보이지 않는 크기 조절 테두리(약 8px)만큼 모니터 밖으로 나간다. 작업표시줄 자동 숨김이면 모니터 전체를 덮어 **최대화한 브라우저를 전체 화면으로 오판**한다. "테두리 있으면 뜬다"가 깨진다 |
| DWM 확장 프레임 경계(`DWMWA_EXTENDED_FRAME_BOUNDS`) | `Win32_Graphics_Dwm` feature를 더해야 한다(의존성 설정 변경 = 승인 대상). 최대화 + 자동 숨김 오판도 그대로 남는다 |
| `SHQueryUserNotificationState` | `Win32_UI_Shell` feature를 더해야 한다. 판정 기준이 Windows 내부 정책이라 테두리 없는 전체 화면 인식을 문서로 보장할 수 없다 |
| `WS_CAPTION` 스타일 검사 | 전체 화면에서도 창 스타일을 그대로 두는 게임이 있을 수 있다. 기하 기준보다 불확실하다 |

- **결과(정의대로):** 브라우저 F11 전체 화면·동영상 전체 화면도 "테두리 없는 전체 화면"이라 메뉴가 생략된다(MC-44). 사용자 정의 "독점·테두리 없는 전체 화면 둘 다"에 포함되므로 별도 결정은 필요 없다.
- **좌표계:** Tauri 앱은 모니터별 DPI 인식(PMv2) 프로세스다. 다른 프로세스 창의 `ClientToScreen`·`rcMonitor`도 물리 px로 받는다. ④는 같은 조회에서 얻은 두 사각형끼리만 비교하므로 훅·Tauri 좌표와 섞이지 않는다. 배율이 다른 다중 모니터는 MC-45에서 확인한다.

**D-12 판정 위치·시점·실패 처리 (v3 개정 — SEC-301, tray.md §3.7.5·T17).**
- **위치:** `overlay-menu` 스레드 `request_popup`의 `should_request` ③단계다. 상태(①)가 Idle이고, 누름·뗌 두 점이 보이는 오버레이 사각형(②) 안인 클릭에만 조회한다.
  - 그 뒤 예약·post가 이어지므로 🔒 지시 "post 직전"은 그대로 지켜진다.
  - 훅 콜백에서는 하지 않는다. 콜백 최소 작업 원칙 때문이다.
  - 메인 스레드에서도 하지 않는다. Win32 조회는 스레드 제약이 없다.
- **순서:** ① `is_idle` → ② `overlay_screen_rect` + `should_popup` → ③ `foreground_snapshot` + `suppress_for_fullscreen` → ④ `try_reserve`(Idle→Pending) → ⑤ `run_on_main_thread(popup_now)`(실패하면 `cancel`).
  - ①~③은 `should_request(idle, click, rect, foreground)` 한 식이고, `&&` 단락 평가라 앞에서 걸리면 뒤 조회를 부르지 않는다.
  - 그래서 다른 프로세스 창 조회가 **오버레이 위 클릭으로만** 줄어든다. 게임 중 화면 곳곳의 오른쪽 클릭에는 Win32 전경 조회가 붙지 않는다(데이터 최소화).
  - v2의 "창 사각형 판정은 `popup_now`(메인 스레드)에서 한다"는 **폐기**한다. `popup_now`는 사각형을 다시 판정하지 않는다(T18 — 🔒 U-1은 클릭 시각 기준이다. 판정과 팝업 사이 밀리초 동안 창을 숨기거나 옮기려면 별도 좌클릭 조작이 필요해 같은 클릭과 겹칠 수 없다).
- **실패 처리:**
  - 전경 창 조회는 띄우는 쪽(fail-open)이다. 전경 창이 없거나(NULL — 활성화가 바뀌는 순간 잠깐 생김) 조회가 실패하면(창이 막 닫힘 등) `foreground_snapshot()`이 `None`을 돌려주고, 이때는 생략하지 않는다. 위험(게임 최소화)은 "실제 전체 화면 창을 조회하는 데 성공했을 때"만 생기고, 조회 실패로 기본 기능이 사라지는 쪽이 더 흔하고 더 나쁘다.
  - 오버레이 창 조회(②)가 실패하면 경고를 남기고 버린다(= 메뉴 없음). 우리 창을 못 읽으면 사각형 판정 자체가 불가능하기 때문이다.
- **개인정보:** 전경 창 조회는 오버레이 사각형 안의 클릭에만 한다(v3).
  - 클래스명은 hook 안에서 고정 목록과 비교만 하고 버린다. pid도 hook 안에서 비교만 한다. 밖으로는 `own_process`·`shell` 불리언과 사각형 두 개만 나간다.
  - `GetWindowTextW`(창 제목)는 부르지 않는다.
  - 창 정보는 저장·로그·전달하지 않는다.
- **unsafe:** 조회 함수마다 `hook/foreground.rs` 안의 `unsafe` 블록 하나와 `// SAFETY:`를 둔다. 번호는 hook.md §5 표에 이어 붙인다(hook.md §3.10.3 U12~U19). 공통 근거는 다음과 같다.
  - 인자 HWND는 `GetForegroundWindow`가 준 값이다. 언제든 무효가 될 수 있지만, 무효 핸들이면 함수가 실패를 돌려줄 뿐 메모리 안전 전제가 없다.
  - 출력 포인터는 이 스택 프레임의 지역 변수를 가리킨다.
  - `GetClassNameW` 버퍼는 슬라이스 길이를 windows 크레이트가 넘긴다.
  - `MONITORINFO.cbSize`는 호출 전에 설정한다.
  - `tray/popup.rs`는 안전 함수 `hook::foreground_snapshot()`만 부르고, `windows` 크레이트를 import하지 않는다.

---

## 3. 종단간 RTM

| 요구ID | 요구(수용 기준) | ui | bridge | core | 설정 키 | 테스트 | 상태 |
|---|---|---|---|---|---|---|---|
| R-40 / AC-1 | 비잠금 오버레이 위 오른쪽 클릭 → 트레이와 같은 메뉴가 커서 위치에 1개 | `.root` `onContextMenu` preventDefault(기본 메뉴 억제) | - (계약 없음) | hook `RightClick` → tray `request_popup`(`overlay-menu`: 판정·예약·post) → `popup_now`(메인) → `WebviewWindow::popup_menu` | 읽음 `timer.enabled` | core RC1·PM1 / ui TC(신규) / MC-31 | 설계 확정(core 7차) |
| R-40 / AC-2 | 항목·순서·문구·동작이 트레이와 같다(타이머 켜짐이면 시작\|일시정지·멈춤·구분선 포함) | - | - | `build_menu` 공유 + `current_view` 공유 + 기존 전역 `on_menu_event` | 읽음 `timer.enabled`, 쓰기는 기존 핸들러(`overlay.visible`) | MC-32·MC-33 | 설계 확정 |
| R-40 / AC-3 | 🔒 위치 잠금 중에도 뜬다. 그 클릭은 아래 창에도 전달된다 | - (WebView는 클릭을 받지 못함) | - | 훅 경로는 잠금과 무관. `CallNextHookEx` 유지 | 읽지 않음(`position_lock` 분기 없음) | MC-34 | 설계 확정 |
| R-40 / AC-4 | 오버레이가 숨겨져 있으면 뜨지 않는다 | - | - | `overlay_screen_rect` → `None`(`overlay-menu` ②에서 버림) | 창 `is_visible` | MC-35 | 설계 확정 |
| R-40 / AC-5 | 🔒 "위" = 창 사각형(투명 부분 포함), 누름·뗌 모두 안일 때만(U-1) | - | - | `should_request` ② = `should_popup` + `ScreenBounds::contains`(`overlay-menu`, 전경 조회보다 먼저. `popup_now` 재판정 없음) | - | WR1~WR3·PM1~PM4·PM12·PM13·MC-36 | 설계 확정(core 7차) |
| R-40 / AC-6 | 한 번의 클릭에 메뉴가 둘 이상 뜨지 않고, 닫힌 뒤 밀린 메뉴가 저절로 뜨지 않는다(브라우저 기본 메뉴 없음, 🔒 U-5) | preventDefault | - | 단일 경로 + `PopupGate`(Idle→Pending→Open, post 전 예약 — F12) | - | ui TC·PM5~PM10·MC-31·MC-36 ④·MC-37 ①-a | 설계 확정(core 7차). T-f·T-j는 수용(R8·R9) |
| R-40 / AC-7 | 합성 뗌(CR-046 정리)이나 드래그로는 뜨지 않는다 | - | - | `RightClickTracker`는 실제 `WM_RBUTTONUP`에서만 동작, 합성 뗌이면 `clear` | - | RC2·RC4·RC6·MC-36 | 설계 확정 |
| R-40 / AC-8 | 🔒 전경 창이 이 앱 창이 아니고 그 클라이언트 영역이 자기 모니터 전체를 덮으면(독점·테두리 없는 전체 화면) 뜨지 않는다. 테두리 있는 창 모드(최대화 포함)·바탕 화면·작업표시줄 전경이면 뜬다(U-3) | - | - | `hook::foreground_snapshot`(Win32 안전 래퍼) → `tray::popup::suppress_for_fullscreen`(순수). `should_request` ③(상태·사각형 통과 뒤, post 직전) | - | FG1~FG6·FS1~FS7·PM11~PM15·MC-40~MC-45 | 설계 확정(core 7차) |
| R-40 / AC-9 | 🔒 메뉴가 뜨면 포커스가 옮겨 가고 자동 복귀하지 않는다(트레이와 같음, U-2 수용) | - | - | 추가 구현 없음(muda 기본 동작) | - | MC-39(기록) | 수용 |
| R-28(용어 주) | 잠금 중 좌클릭·끌기·휠은 여전히 통과한다. 잠금 해제는 설정 창에서만 | - | - | 변경 없음 | `positionLock` | 기존 MC | 문서만 |

- 끊긴 곳 0이다. bridge 열의 `-`는 "계약 없음"이 설계 결론이라는 뜻이다(§2.11).
- core 테스트 ID의 정본 표는 tray.md §3.7.8(PM1~PM15·FS1~FS7), hook.md(RC·FG), window.md §3.1(WR)이다.

---

## 4. 인계 패킷 — core (`claude --agent core-manager`)

- **선행 조건:** 없음(첫 계층). 사용자 결정 U-1~U-6은 완료됐다(§8).
- **진행 상태(v3):** core-designer가 7차 설계를 반영했다(`tray.md` §3.7, `hook.md` §3.9·§3.10, `window.md` §3.1). 소스는 아직 반영하지 않았다. **세부 정본은 core 문서다.** 이 패킷은 요약·경계·수용 기준을 맡는다.
- **요구ID:** overlay R-40(AC-1~AC-9). CR 번호는 CR-062(ui 대장에 기록)를 core 문서에도 인용한다.
- **작업 모드:** 보강. 문서(`doc/200_설계/core/{hook,window,tray}.md`)를 먼저 갱신한 뒤 구현한다(core-designer → core-implementer).

### 4.1 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src-tauri/src/hook/right_click.rs` | **신규**(unsafe 없음). `ScreenPoint`, `RightClick`, `RightClickTracker` + 단위 테스트 |
| `src-tauri/src/hook/foreground.rs` | **신규**(🔒 U-3). `ScreenRect`(+순수 `covers`), `ForegroundSnapshot`, `pub fn foreground_snapshot()`, 순수 `is_shell_class`. Win32 조회 unsafe 블록(각각 `// SAFETY:`, U12~U19 — hook.md §3.10.3) + 단위 테스트(순수 부분) |
| `src-tauri/src/hook/mod.rs` | `mod right_click; mod foreground;`, `pub use right_click::{RightClick, ScreenPoint}; pub use foreground::{foreground_snapshot, ForegroundSnapshot, ScreenRect};`, 정적 `CLICK_SENDER`·`RIGHT_CLICK`, `start` 시그니처, `track_right_click`, `mouse_proc`에 1줄, `reset_keys`·`recover_missed_mouse_releases`·`shutdown` 보강, `//!` 갱신(목적·공개 API·unsafe 목록·개인정보). **이 파일에는 새 unsafe 블록이 없고, 기존 SAFETY 주석은 그대로다** |
| `src-tauri/src/window/mod.rs` | `impl ScreenBounds { contains }`, `overlay_screen_rect`(문서 주석: 메인이 아닌 스레드에서 부르면 동기 왕복 — F13, 7차), 테스트, `//! [공개 API]` 갱신 |
| `src-tauri/src/tray/mod.rs` | `mod popup; pub use popup::spawn_popup_listener;`, `sync_timer_menu_now`에서 `current_view` 추출(동작 불변), `//!` 갱신 |
| `src-tauri/src/tray/popup.rs` | **신규**(7차 개정, 약 420줄 — 테스트 포함). `overlay-menu` 스레드(① 상태 → ② 창 사각형 → ③ 전체 화면 판정 → ④ 예약 → ⑤ post), 메인 스레드 `popup_now`(사각형 재판정 없음), 3단계 상태 기계 `PopupGate`/`OpenGuard`, 순수 판정 3종(`should_request`·`should_popup`·`suppress_for_fullscreen`) + PM1~PM15·FS1~FS7. unsafe 없음 |
| `src-tauri/src/lib.rs` | 4단계를 **비공개 `fn start_input_pipeline(handle: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>>`로 추출**(7차 T19, CORE-304 — 채널 2개·`hook::start(tx, click_tx)`·`HookGuard` 등록·`input-forwarder`·`spawn_popup_listener`. 순서·스레드 이름·실패 처리 불변). setup 클로저가 여전히 50줄을 넘으면 같은 커밋에서 `initial_hand_anchor`, 그다음 `build_app_state`를 차례로 추출한다(동작 불변, tray.md §3.7.6). `//! [스레드]`에 `overlay-menu` 한 줄 |
| `doc/200_설계/core/hook.md` | §3.9(오른쪽 클릭 신호), §3.10(전경 창 조회 래퍼 — U12~U19 SAFETY 근거, 개인정보), §2·§4·§5 unsafe 표·§8·§10·§11 — **core-designer 반영됨(7차 포함)** |
| `doc/200_설계/core/window.md` | 새 함수 2개 + 테스트 표 + `overlay_screen_rect` 스레드 문장 — **반영됨(7차)** |
| `doc/200_설계/core/tray.md` | §3.7(오버레이 오른쪽 클릭 메뉴 — §3.7.3 `PopupGate`·판정 순서, §3.7.5 전체 화면, §3.7.6 `start_input_pipeline`), §4·§7·§8·§10·§11 T11~T19·T-f~T-j — **반영됨(7차), 구현 완료 표기는 core-implementer 뒤** |

### 4.2 시그니처·타입

```rust
// hook/right_click.rs — 순수, unsafe 없음
/// 화면 좌표(물리 px, 가상 화면). InputEvent::MouseMove 와 같은 좌표계.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScreenPoint { pub x: i32, pub y: i32 }

/// 훅이 실제로 본 오른쪽 버튼 누름→뗌 한 쌍. 합성 뗌(CR-046 정리)에서는 만들지 않는다.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RightClick { pub down: ScreenPoint, pub up: ScreenPoint }

pub(super) struct RightClickTracker { down: Option<ScreenPoint> }
impl RightClickTracker {
    pub(super) const fn new() -> Self;
    pub(super) fn on_down(&mut self, p: ScreenPoint);                     // 덮어씀
    pub(super) fn on_up(&mut self, p: ScreenPoint) -> Option<RightClick>; // down.take()
    pub(super) fn clear(&mut self);
}

// hook/foreground.rs — Win32 조회(unsafe는 이 파일 안에서만) + 순수 부분
/// 화면 사각형(물리 px). right·bottom 은 끝(exclusive) 좌표 — Win32 RECT 와 같다.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScreenRect { pub left: i32, pub top: i32, pub right: i32, pub bottom: i32 }
impl ScreenRect {
    /// self 가 other 를 완전히 덮는가(가장자리 포함): left≤, top≤, right≥, bottom≥.
    pub fn covers(&self, other: &ScreenRect) -> bool;
}

/// 전경 창 요약. 클래스명·pid·창 제목은 밖으로 내보내지 않는다(비교 결과만).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ForegroundSnapshot {
    pub own_process: bool,   // 전경 창 pid == std::process::id()
    pub shell: bool,         // 바탕 화면·작업표시줄(GetShellWindow 또는 is_shell_class)
    pub client: ScreenRect,  // GetClientRect + ClientToScreen
    pub monitor: ScreenRect, // MonitorFromWindow(NEAREST) → GetMonitorInfoW().rcMonitor
}

/// 전경 창이 없거나 조회가 하나라도 실패하면 None. 어느 스레드에서나 부를 수 있다(Tauri 호출 없음).
/// 훅 콜백 안에서는 부르지 않는다.
pub fn foreground_snapshot() -> Option<ForegroundSnapshot>;

/// 순수: UTF-16 클래스명이 "Progman" | "WorkerW" | "Shell_TrayWnd" | "Shell_SecondaryTrayWnd" 인가.
fn is_shell_class(name: &[u16]) -> bool;

// hook/mod.rs
static CLICK_SENDER: OnceLock<Mutex<Option<Sender<RightClick>>>>;
static RIGHT_CLICK: Mutex<RightClickTracker> = Mutex::new(RightClickTracker::new());
pub fn start(tx: Sender<InputEvent>, clicks: Sender<RightClick>) -> Result<HookHandle, HookError>;
fn track_right_click(msg: u32, x: i32, y: i32) -> Option<RightClick>; // WM_RBUTTONDOWN→on_down/None, WM_RBUTTONUP→on_up, 그 밖 None
fn send_click(c: RightClick);                                          // send()와 같은 모양, 실패 무시

// window/mod.rs
impl ScreenBounds { pub fn contains(&self, x: i32, y: i32) -> bool } // [x, x+w) × [y, y+h), i64로 계산, w·h 0이면 false
/// 숨김 → Ok(None). 메인이 아닌 스레드에서 부르면 창 getter 3종이 메인 스레드와 동기 왕복한다(F13).
pub fn overlay_screen_rect(app: &AppHandle) -> Result<Option<ScreenBounds>, WindowError>;

// tray/mod.rs (비공개, 자식 모듈 popup이 super::로 사용)
fn current_view(app: &AppHandle) -> Option<TrayTimerView>; // settings 잠금→해제 → timer 잠금→해제(두 잠금 동시 보유 금지, 기존 순서)
fn build_menu(app: &AppHandle, view: TrayTimerView) -> tauri::Result<Menu<tauri::Wry>>; // 기존 그대로

// tray/popup.rs — unsafe 없음 (7차 — 정본 tray.md §3.7.3)
static POPUP: PopupGate = PopupGate::new();   // Idle → Pending → Open → Idle, 앱 전체에 하나
pub fn spawn_popup_listener(app: AppHandle, rx: Receiver<hook::RightClick>) -> std::io::Result<()>; // 스레드 "overlay-menu"
fn request_popup(app: &AppHandle, click: RightClick);   // should_request → try_reserve → post(실패 시 cancel). 메인의 "실행"은 기다리지 않는다
fn overlay_rect_or_none(app: &AppHandle) -> Option<ScreenBounds>; // overlay_screen_rect, Err → 경고 + None(버림)
fn popup_now(app: &AppHandle);                          // 메인 전용: begin_open → current_view → build_menu → popup_menu. 사각형 재판정 없음(T18)
/// 순수 판정 순서(SEC-301): idle && should_popup(rect(), click) && !suppress_for_fullscreen(foreground()).
/// && 단락 평가 — 앞에서 걸리면 뒤 조회를 부르지 않는다. 상태는 바꾸지 않는다(예약은 호출자).
pub(super) fn should_request(
    idle: bool,
    click: RightClick,
    rect: impl FnOnce() -> Option<ScreenBounds>,
    foreground: impl FnOnce() -> Option<ForegroundSnapshot>,
) -> bool;
/// 순수(🔒 U-3): None → false(띄움, fail-open). Some(s) → !s.own_process && !s.shell && s.client.covers(&s.monitor).
pub(super) fn suppress_for_fullscreen(snap: Option<ForegroundSnapshot>) -> bool;
/// 순수(🔒 U-1): rect Some && contains(down) && contains(up).
pub(super) fn should_popup(rect: Option<ScreenBounds>, click: RightClick) -> bool;

struct PopupGate { state: AtomicU8 }  // IDLE=0 · PENDING=1 · OPEN=2, 전이는 compare_exchange(AcqRel)
impl PopupGate {
    const fn new() -> Self;
    fn is_idle(&self) -> bool;                              // overlay-menu 빠른 거름
    fn try_reserve(&self) -> bool;                          // Idle → Pending (성공한 호출만 post)
    fn cancel(&self);                                       // Pending → Idle (post 실패)
    fn begin_open(&self) -> Option<OpenGuard<'_>>;          // 메인: Pending → Open (성공 시에만 가드 생성)
}
struct OpenGuard<'a> { gate: &'a PopupGate }                // Drop → Idle (모든 반환 경로)
```

- `begin_open`에서 `bool::then_some(OpenGuard { .. })`를 쓰면 안 된다. 실패해도 가드가 만들어졌다가 Drop되어, 열린 메뉴의 Open을 Idle로 덮어쓴다(tray.md PM9가 잡는다).
- `begin_open` 실패(Pending이 아님)는 불변식상 도달할 수 없다. 이때는 상태를 건드리지 않는다.
- 테스트는 **지역 `PopupGate::new()`**만 쓴다. 정적 `POPUP`을 거치는 테스트는 두지 않는다(병렬 `cargo test` 간섭 방지, T13 원칙 유지).
- `foreground_snapshot()` 본문이 50줄을 넘으면 조회 단계별 비공개 함수로 나눈다. 예: `foreground_hwnd`, `is_own_process`, `is_shell`, `client_rect_on_screen`, `monitor_rect`. 각 함수에 unsafe 블록 하나씩 둔다.

### 4.3 동작 명세

1. **훅 콜백(`mouse_proc`)**: 기존 `send(ev)` 뒤에 한 줄을 더한다: `if let Some(c) = track_right_click(msg, info.pt.x, info.pt.y) { send_click(c) }`.
   - 콜백 안에서는 로그·Tauri 호출·할당·**전경 창 조회**를 하지 않는다.
   - `CallNextHookEx`는 그대로 둔다. **입력을 삼키지 않는다**(🔒 잠금 중에도 아래 창에 전달).
2. **합성 뗌:** `recover_missed_mouse_releases`가 Right를 정리하면 `RIGHT_CLICK.clear()`를 부른다. `RightClick`은 만들지 않는다.
3. **수명:** `reset_keys`(start·stop·refresh)가 `RIGHT_CLICK`도 비운다. `shutdown`은 `CLICK_SENDER`도 `None`으로 만든다.
4. **개인정보:** 기록하는 것은 오른쪽 누름 좌표 1개와 팝업 상태 값 1개(Idle·Pending·Open)뿐이다. 누름 좌표는 뗌·정리 때 비운다.
   - 좌표·전경 창 정보(클래스명·pid·사각형)는 파일·로그·전달에 남기지 않는다. `popup`·`foreground` 쪽 로그에도 싣지 않는다.
   - `GetWindowTextW`는 쓰지 않는다. 다른 프로세스 창 조회는 오버레이 사각형 안의 클릭에만 한다.
   - 키 정보와는 무관하다.
5. **`overlay-menu` 스레드(v3):** `for click in rx { request_popup(&app, click) }` 형태이고, 수신자가 끊기면 종료한다. `request_popup`은 다음 순서로 진행한다.
   1. `wanted = should_request(POPUP.is_idle(), click, || overlay_rect_or_none(app), hook::foreground_snapshot)`: ① 상태 → ② 창 사각형(🔒 U-1·AC-4) → ③ 전체 화면(🔒 U-3) 순서이고, 단락 평가라 앞에서 걸리면 뒤를 부르지 않는다.
   2. `!wanted || !POPUP.try_reserve()`이면 반환한다(로그 없음, 창 조회 실패만 `overlay_rect_or_none`이 경고).
   3. `app.run_on_main_thread(move || popup_now(&handle))`. 실패하면 `POPUP.cancel()`(Pending→Idle) 후 `log::warn!`.
6. **`popup_now`(메인 스레드):** 다음 순서로 진행한다.
   1. `POPUP.begin_open()`이 `None`이면 반환한다(도달 불가, 상태 불변).
   2. `current_view(app)`: `None`이면 warn 후 반환한다.
   3. `build_menu(app, view)`: `Err`이면 warn 후 반환한다.
   4. `app.get_webview_window(window::OVERLAY_LABEL)`: 없으면 반환한다.
   5. `popup_menu(&menu)`를 부른다. **커서 위치에 뜨고, 닫힐 때까지 여기서 반환하지 않는다.** `Err`이면 warn한다.
   6. 모든 반환 경로에서 `OpenGuard` Drop으로 Idle이 된다.
   - **사각형·가시성은 다시 판정하지 않는다**(T18).
7. **메뉴 이벤트:** 아무것도 등록하지 않는다. 클릭은 `tray::init`의 전역 `on_menu_event`가 처리한다(§2.5 D-4). 이 사실을 `popup.rs` `//!`에 적는다.
8. **포커스(🔒 U-2):** 팝업 뒤 이전 전경 창으로 되돌리는 코드를 넣지 않는다.
9. **`lib.rs` 4단계(v3, T19):** setup 클로저의 4단계 자리를 `start_input_pipeline(&handle)?;` 한 줄로 바꾼다.
   - 함수 본문 순서: `mpsc::channel::<hook::InputEvent>()`·`mpsc::channel::<hook::RightClick>()` → `hook::start(tx, click_tx)?` → `handle.manage(HookGuard(…))` → `input-forwarder` spawn(`?`) → `tray::spawn_popup_listener(handle.clone(), click_rx)`(실패하면 `log::warn!` 후 계속) → `Ok(())`.
   - 훅·전달 스레드 실패는 setup 실패로 전파된다(기존과 같다). 메뉴 스레드 실패만 경고로 끝난다(T14).

### 4.4 스레드 모델

```
win32-input-hook ──(InputEvent)──▶ input-forwarder ──emit──▶ overlay        (기존, 불변)
       └────────(RightClick)────▶ overlay-menu (v3):
                                     ① POPUP.is_idle()                       ─ 아니면 버림
                                     ② overlay_screen_rect (창 getter ⇄ main 동기 왕복, Idle일 때만)
                                     ③ foreground_snapshot (Win32, 스레드 무관, ②를 통과한 클릭만)
                                     ④ try_reserve (Idle→Pending) → run_on_main_thread(post, 비동기)──▶ main: popup_now
                                                                                                     Pending→Open
                                                                                                     └ TrackPopupMenu 모달
                                                                                                     OpenGuard drop → Idle
main: MenuEvent ──▶ 전역 리스너(tray on_menu_event) ──▶ 기존 동작(설정 열기/새로고침/표시·숨김/타이머/종료)
```

- 다른 스레드에서 `popup_menu`를 **직접 부르지 않는다**(F3: 채널 대기로 그 스레드가 메뉴가 닫힐 때까지 멈춤).
- `overlay-menu`가 부르는 Tauri API는 둘뿐이다. 창 getter 3종(`overlay_screen_rect`, **Idle일 때만**)과 `run_on_main_thread`(post)다.
  - 창 getter는 메인 스레드와 동기 왕복이다(F13).
  - `Idle → Pending`을 만드는 주체가 `overlay-menu` 하나뿐이다. 그래서 ①에서 Idle을 본 순간에는 post된 `popup_now`도, 열린 우리 메뉴도 없고, ②가 우리 모달에 막히는 일이 구조적으로 없다.
  - 잠금을 쥐지 않고 기다리며, 메인 스레드는 `overlay-menu`를 기다리지 않는다. 따라서 교착이 없다(tray.md PU-h).
  - 메인 스레드가 **다른 이유로** tao 핸들러 안에 오래 머무는 경우만 R9(T-j)가 남는다.
- 잠금 순서: `current_view`는 settings → 해제 → timer → 해제 순서다. 게이트는 잠금이 아니라 원자 변수 1개다.

### 4.5 수용 기준

- `cargo fmt --check` 통과, `cargo clippy -- -D warnings` 경고 0, `cargo test`에서 기존 테스트 전부와 신규 테스트가 PASS(출력 캡처).
- 신규 단위 테스트(각 표의 정본은 core 문서):

| ID | 대상 | 내용 |
|---|---|---|
| RC1 | `RightClickTracker` | down(1,2) → up(3,4) = `Some(RightClick{down:(1,2), up:(3,4)})` |
| RC2 | 〃 | 누름 없이 up → `None` |
| RC3 | 〃 | down(1,1) → down(5,5) → up → down = (5,5)(덮어씀) |
| RC4 | 〃 | down → `clear` → up → `None` |
| RC5 | 〃 | down → up → up → 두 번째 `None`(take) |
| RC6 | `track_right_click` | `WM_RBUTTONDOWN`/`WM_RBUTTONUP` 매핑, `WM_LBUTTONUP`·`WM_MOUSEMOVE` → `None`. 정적 변수를 쓰면 테스트 직렬화 또는 순수 함수 분리 — core-designer 결정 |
| WR1 | `ScreenBounds::contains` | 왼쪽·위 가장자리는 안, 오른쪽·아래 가장자리(x+w, y+h)는 밖 |
| WR2 | 〃 | 음수 원점(왼쪽 보조 모니터 x=-1920) 판정 |
| WR3 | 〃 | 너비 또는 높이 0 → 항상 false |
| PM1~PM4 | `should_popup` | 둘 다 안 → true / `None` → false / down만 안 → false / up만 안 → false |
| PM5~PM10 | `PopupGate`(지역 인스턴스, 7차) | 전체 순환(`is_idle` → `try_reserve` → `begin_open` 가드 → drop → Idle), Pending·Open 중 `try_reserve` 거절, `cancel`(Pending→Idle), `begin_open` 실패 시 상태 불변(`then_some` 함정), 조기 반환·정상 반환 모두 Idle 복귀 — 세부는 tray.md §3.7.8 |
| PM11~PM15 | `should_request`(7차) | 판정 순서·단락 평가: 상태가 Idle이 아니면 `rect`·`foreground` 클로저 미호출, 사각형 밖이면 `foreground` 미호출, 전체 화면이면 false, 모두 통과하면 true — 세부는 tray.md §3.7.8 |
| FG1 | `ScreenRect::covers` | 같은 사각형(0,0,1920,1080) ⊇ 모니터 → true(가장자리 포함) |
| FG2 | 〃 | 모니터보다 사방으로 큰 사각형(-8,-8,1928,1088) → true |
| FG3 | 〃 | 한 변이 모자람: 아래 1040(작업 영역) 대 모니터 1080 → false. 위 23(제목 표시줄 아래 클라이언트) → false |
| FG4 | 〃 | 음수 좌표 보조 모니터(-1920,0,0,1080)를 그 모니터 크기의 클라이언트가 덮음 → true. 주 모니터 크기 클라이언트는 보조 모니터를 못 덮음 → false |
| FG5 | `is_shell_class` | `Progman`·`WorkerW`·`Shell_TrayWnd`·`Shell_SecondaryTrayWnd` → true |
| FG6 | 〃 | `UnityWndClass`·`Chrome_WidgetWin_1`·빈 이름·`Progman` 접두만 같은 이름(`ProgmanX`) → false(완전 일치만) |
| FS1 | `suppress_for_fullscreen` | `None`(전경 없음·조회 실패) → false(띄움) |
| FS2 | 〃 | 다른 앱·셸 아님·클라이언트 = 모니터 → **true**(생략) — 테두리 없는·독점 전체 화면 |
| FS3 | 〃 | `own_process` = true, 모니터를 덮음 → false(이 앱 창) |
| FS4 | 〃 | `shell` = true, 모니터를 덮음 → false(바탕 화면 `Progman`/`WorkerW`) |
| FS5 | 〃 | 다른 앱, 창 모드(클라이언트 1280×720 안쪽) → false |
| FS6 | 〃 | 다른 앱, 최대화 + 제목 표시줄(클라이언트 top = 모니터 top + 23, 작업표시줄 자동 숨김으로 bottom = 모니터 bottom) → false |
| FS7 | 〃 | 다른 앱, 다른 모니터 기준: 클라이언트가 자기 모니터(보조)를 덮음 → true |

- 증거 요구:
  - `grep -rn "unsafe" src-tauri/src/tray src-tauri/src/window`가 0건이다.
  - `hook/mod.rs`의 unsafe 블록 수는 이전과 같다(U1~U11).
  - 새 unsafe는 `hook/foreground.rs`에만 있고 블록마다 `// SAFETY:`가 있다(hook.md §5 표에 U12~U19 등록).
- **`lib.rs` setup 클로저 50줄 이하**(v3, T19). `wc`나 줄 번호 증거로 보인다.
- `git diff --stat`에 `Cargo.toml`·`Cargo.lock`·`src-tauri/src/bridge/`·`capabilities/`·`tauri.conf.json`·`src/`가 **없다**. 필요한 `windows` feature는 이미 켜져 있다(F11).
- 기존 트레이 동작 회귀가 없다. `sync_timer_menu_now`는 `current_view`를 뽑아낸 뒤에도 동작이 같다(기존 TV1·TV2 PASS).
- GUI 확인은 §7 MC-31~MC-45로 한다. 7차의 핵심 확인은 **MC-36 ④**(빠른 두 번 클릭 → 메뉴 1개, 닫은 뒤 저절로 다시 뜨지 않음)와 **MC-37 ①-a**다. core 세션은 앱을 실행하지 않는다(사용자 요청 시에만 `/run-app`). 수동 항목은 tray.md §8.3에 옮겨 적는다.

### 4.6 하지 말 것

- `InputEvent`의 모양·변형·필드를 바꾸지 않는다(bridge 파급, D-8). T-f·T-j 해소를 위한 `RightClick` 시점 필드 추가도 이 세션 판단 전에는 하지 않는다.
- `src-tauri/src/bridge/**`, `capabilities/**`, `tauri.conf.json`, `Cargo.toml`(feature 추가 포함), `src/**`(ui)를 수정하지 않는다.
- 새 `on_menu_event`를 등록하지 않는다. 앱·창·트레이 어디에도 안 된다(한 번의 클릭이 두 번 실행됨).
- 팝업 메뉴에 항목을 추가하거나 문구·순서를 바꾸지 않는다(요구: 트레이와 같게). 「위치 잠금 해제」 같은 새 항목은 요구가 없다.
- `position_lock`으로 분기하지 않는다(🔒 잠금 중에도 뜬다).
- 오른쪽 클릭을 삼키지 않는다(`CallNextHookEx` 생략이나 1 반환 금지).
- 훅 콜백 안에서 로그·Tauri·할당·전경 창 조회를 하지 않는다. `input-forwarder`나 `overlay-menu`에서 `popup_menu`를 동기로 부르지 않는다.
- **(v3) 게이트 규칙:**
  - 가드를 "실행 시점"에만 잡는 2단계 방식(옛 `POPUP_OPEN`)으로 되돌리지 않는다. 예약은 반드시 post 전에 한다.
  - `should_request`의 순서를 바꿔 전경 조회를 사각형 판정 앞에 두지 않는다.
  - `popup_now`에서 사각형을 다시 판정하지 않는다.
  - Pending·Open일 때 창 getter를 부르지 않는다.
- `hook/` 밖에서 unsafe를 쓰지 않는다. `tray/popup.rs`는 `hook::foreground_snapshot()`만 부른다.
- 전경 창 복귀 기능을 만들지 않는다(🔒 U-2 수용). 전체 화면 판정에 설정 토글을 두지 않는다(요구 없음).
- 창 제목(`GetWindowTextW`)을 읽지 않는다. 전경 창 정보를 로그·저장하지 않는다.

### 4.7 완료 마커

- `doc/200_설계/core/tray.md` §3.7 머리에 「구현 완료(날짜)」를 적고, hook.md §3.9·§3.10·§5와 window.md 표를 갱신한다.
- `cargo test` 결과 요약(총 수, 신규 RC/WR/PM1~PM15/FG/FS PASS), clippy 0, setup 클로저 줄 수를 core-manager 완료 보고에 싣는다.
- 경로 전환 보고: core 완료 뒤 bridge를 생략하고(§5) ui 세션으로 넘어간다.
- **주의:** core만 반영된 상태에서는 비잠금 오른쪽 클릭에 브라우저 메뉴와 새 메뉴가 **둘 다** 뜬다. ui 패킷 완료 전에는 배포(`/deploy`)하지 않는다.

---

## 5. 인계 패킷 — bridge (`claude --agent bridge-manager`) — 작업 없음, 세션 생략 권고

- **선행 조건:** core §4.7 완료 마커.
- **요구ID:** overlay R-40.
- **판정:** 계약 변경은 **없다.** 근거는 다음과 같다.
  1. 메뉴 id·메뉴 이벤트는 Rust 내부(muda → tao 이벤트 루프)이고 IPC가 아니다.
  2. `InputEvent`와 `input://mouse-button` 페이로드는 바뀌지 않는다(D-8에서 별도 채널을 택한 이유).
  3. 팝업은 Rust `WebviewWindow::popup_menu`로 띄운다. JS `menu` API를 쓰지 않으므로 `core:menu:*` 권한이 필요 없고 capabilities도 그대로다.
  4. 전체 화면 판정(U-3)과 팝업 게이트(v3)는 core 내부이며 ui가 알 필요가 없다.
  5. ui는 새 래퍼를 호출하지 않는다(`onContextMenu` preventDefault는 bridge와 무관).
- **호환성 분류:** 해당 없음. contract v0.27을 유지한다.
- **변경 대상 파일:** 없음.
- **선택 확인(세션을 연다면):** `git diff --stat src-tauri/src/bridge src/bridge doc/200_설계/bridge`가 비어 있는지 확인한다. contract.md에 "overlay-context-menu 영향 없음" 이력 한 줄을 남길지는 bridge-designer가 판단한다. 권고는 **남기지 않음**이다. 버전을 올릴 이유가 없다.
- **하지 말 것:** 이 기능 때문에 command·event를 새로 만들지 않는다(D-1 (b) 기각).
- **완료 마커:** 없음. ui 세션이 core 마커만 보고 착수한다.

---

## 6. 인계 패킷 — ui (`claude --agent ui-manager`, 보강)

- **선행 조건:** core §4.7 완료 마커. bridge는 생략한다.
- **요구ID:** overlay **R-40**(신설, §9 문구), R-28 용어 주. CR 번호는 **CR-062**다. 두 화면 공통 번호이며 현재 최대가 CR-061이다.
- **작업 모드:** 보강. 문서 소유자 규칙에 따라 요구·설계는 ui-designer, 시나리오·체크리스트는 ui-test-designer, 소스는 ui-implementer, 매뉴얼은 ui-manual-writer가 맡는다.

### 6.1 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src/overlay/requirements.md` | v3.1 → **v3.2**. §1에 **R-40** 행(§9 문구 그대로 — U-1·U-3·U-5 🔒, U-2 수용 포함). R-28 아래 용어 주 1개(§9). §2에 S-21 시나리오(§9). §3 표에 행 추가: `창 기능 \| 오른쪽 클릭 메뉴(전체 화면 생략 포함) \| — \| — \| core 전용(tray·hook), 계약 없음 \| R-40` |
| `src/overlay/design.md` | 변경이력, **§10.16 신설**("오른쪽 클릭 메뉴 — ui 몫 = WebView2 기본 메뉴 억제뿐. 메뉴 표시·판정(창 사각형·누름/뗌·전체 화면)·중복 방지·동작은 core. 이 문서 §2.9 상태별 동작표 요약 인용"), §10.9 L-표에 "잠금 중 오른쪽 클릭 = 아래 창 전달 + core 메뉴(전체 화면이면 생략)" 행, §13 RTM R-40 행 |
| `src/overlay/design/functions.md` | §5.1 `OverlayApp`에 `onContextMenu` 핸들러 명세(입력 `MouseEvent`, 동작 `preventDefault()`만, 예외 없음, R-40) |
| `src/overlay/index.tsx` | 모듈 수준 `const preventContextMenu = (e: MouseEvent<HTMLDivElement>) => e.preventDefault()`(react에서 `type MouseEvent` import) + `.root`에 `onContextMenu={preventContextMenu}`. 그 밖은 바꾸지 않는다 |
| `src/overlay/test/scenarios.md` + 기존 오버레이 vitest 파일 | TC 신설(번호는 ui-test-designer): `.root`에 `fireEvent.contextMenu` → 반환값 `false`(=`defaultPrevented`). 회귀: 오른쪽 `mouseButton` 입력 처리(클릭 파츠)는 불변 |
| `src/overlay/test/manual-checklist.md` | **MC-31~MC-45**(이 문서 §7을 옮김, v3 MC-36 ④·MC-37 ①-a/①-b 포함) |
| `src/overlay/test/change-requests.md` | **CR-062** 엔트리(요구 R-40, 원인 = 사용자 요청, 사용자 결정 U-1~U-5 요약, core 선행 반영, ui 몫, 검증 = TC + MC, 수용 관찰 R8·R9) |
| `src/overlay/manual.md` | "오버레이 오른쪽 클릭 메뉴" 절: 잠금 중에도 뜬다, 전체 화면 게임·동영상 중에는 뜨지 않는다, 뜨면 게임 포커스가 옮겨 간다. ui-manual-writer 작성, 스크린샷 필요 — 앱 실행이 가능할 때 |

### 6.2 동작 명세

- 입력은 오버레이 창 어디서든(`.root` = 100vw×100vh) 일어나는 `contextmenu` 이벤트다. 출력은 `preventDefault()` 하나뿐이다.
- 결과: WebView2 기본 메뉴(뒤로·새로 고침·다른 이름으로 저장·인쇄·검사)가 뜨지 않는다(🔒 U-5).
- 트레이와 같은 메뉴, 전체 화면 생략, 중복 방지는 core가 한다. ui는 그 메뉴를 **모르고, 그리지 않는다.**
- 잠금 중에는 WebView가 이벤트를 받지 못해 이 핸들러가 불리지 않는다. 설계상 정상이다.
- `onWheel`·`data-tauri-drag-region`·좌클릭 끌기·상태 기계는 바뀌지 않는다.

### 6.3 수용 기준

- `yarn test --run` 전체 PASS(신규 TC 포함), `yarn tsc --noEmit` exit 0, `yarn build` exit 0.
- `index.tsx`에서 `invoke`·`listen`을 직접 쓰지 않는다(경계 규칙).
- 수동 MC-31(비잠금 메뉴 1개)의 스크린샷 경로(`doc/300_검증/screenshots/…`)가 있어야 한다. 다만 **사용자가 앱 실행을 허락할 때만** 실행한다.

### 6.4 하지 말 것

- React로 커스텀 메뉴(HTML 팝업)를 만들지 않는다. 표시 주체는 core다(D-1).
- 새 bridge 래퍼나 command 호출을 만들지 않는다. `positionLock`을 읽지 않는다. 전체 화면 여부를 ui에서 판정하지 않는다.
- 설정 창(`src/settings/`)은 바꾸지 않는다. 설정 창 기본 메뉴 경합은 U-4에 따라 수용한다.
- `src-tauri/**`, `doc/200_설계/**`는 수정하지 않는다.

### 6.5 완료 마커

- `src/overlay/test/change-requests.md` CR-062 상태를 「적용·검증」으로 바꾸고, design.md RTM R-40에 TC를 연결한다.
- ui-manager 완료 보고에 vitest·tsc·build 결과를 싣는다.
- 그 뒤 `claude --agent verify-manager`로 배포 전 통합 검증을 한다.

---

## 7. 수동 확인 항목 (dev·release 각각, 결과는 overlay manual-checklist와 core tray.md §8.3)

| MC | 조건 | 절차 | 기대 |
|---|---|---|---|
| MC-31 | 비잠금·표시 | 오버레이 그림 위와 투명한 모서리 위에서 각각 오른쪽 클릭 | 두 곳 모두 트레이와 같은 메뉴가 커서 위치에 **1개** 뜬다. 브라우저 메뉴(뒤로·새로 고침·검사 등)는 없다. 체감 지연 없음 |
| MC-32 | 메뉴 동일성 | 타이머 ① 끔 ② 켬·정지 ③ 켬·흐르는 중 상태마다 트레이 메뉴와 오버레이 메뉴를 캡처 | 세 상태 모두 항목·순서·문구·구분선이 같다(① 4항목, ② 「시작」·「멈춤」+구분선+4, ③ 「일시정지」·「멈춤」+구분선+4) |
| MC-33 | 항목 동작 | 오버레이 메뉴에서 차례로 고른다: 설정 열기 → 새로고침 → 시작/일시정지 → 멈춤 → 표시/숨김 → (트레이로 다시 표시) → 종료 | 트레이에서 고른 것과 같다. 설정 창은 한 개만 앞으로 온다. 오버레이가 다시 불러와진다. 오버레이 글자와 설정 창 타이머가 함께 바뀐다. 숨긴 뒤 트레이로 복귀할 수 있다. 앱이 종료된다. **한 번 고른 동작이 두 번 실행되지 않는다**(표시/숨김이 원래대로 돌아오지 않음) |
| MC-34 | 🔒 잠금·표시 | 잠금을 켜고 ① 메모장(자체 메뉴 있음) 위 ② 창 모드 게임 또는 그림판 위 오버레이를 오른쪽 클릭 | 두 경우 모두 오버레이 메뉴가 뜬다. 오른쪽 클릭은 아래 창에도 전달된다. ①에서 두 메뉴가 경합하는 결과는 **관찰만** 하고 비고에 적는다(U-4 수용) |
| MC-35 | 숨김 | 트레이로 오버레이를 숨기고 옛 자리를 오른쪽 클릭 | 오버레이 메뉴가 뜨지 않는다 |
| MC-36 | 드래그·연타(🔒 U-1, v3) | 오른쪽 버튼을 ① 오버레이 안에서 누르고 밖에서 떼기 ② 밖에서 누르고 안에서 떼기 ③ 키를 누른 채 오른쪽 클릭 반복 ④ **오버레이 위를 아주 빠르게 두 번 오른쪽 클릭**한 뒤 메뉴를 Esc로 닫기 | ①② 메뉴 없음 ③ 오른쪽 클릭마다 메뉴 1개, 엉뚱한 때 뜨는 메뉴 없음 ④ 메뉴는 1개이고, **닫은 뒤 저절로 다시 뜨지 않는다**(CORE-301 — 옛 2단계 가드에서는 다시 떴다) |
| MC-37 | 열린 메뉴(v3) | 메뉴가 열린 상태에서 ①-a **메뉴 위** 오른쪽 클릭 ①-b **메뉴 바깥의 오버레이 위** 오른쪽 클릭 ② 바깥 좌클릭 ③ Esc | ①-a 두 번째 메뉴가 뜨지 않는다 ①-b 메뉴가 닫히고 그 자리에 새 메뉴가 다시 뜰 수 있다. 동시에 둘은 없어야 한다 — **결과를 기록만 한다**(R8·T-f, 수용) ②③ 메뉴가 닫힌다. **잠금 중에도 닫히는지** 확인(R4) |
| MC-38 | 트레이 메뉴와 겹침 | 트레이 메뉴를 연 채 오버레이를 오른쪽 클릭(여러 번 포함) | 동시에 두 메뉴가 남지 않는다. 트레이 메뉴를 닫은 뒤 늦게 뜨는 오버레이 메뉴가 있다면 **많아야 1개**다(R9·T-j) — **관찰만** |
| MC-39 | 창 모드 게임·포커스(🔒 U-2) | **테두리 있는 창 모드** 게임에서 잠금을 켜고 오버레이 메뉴를 열었다 닫은 뒤 키 입력 | 메뉴가 뜬다. 메뉴가 열린 동안에도 키 입력에 오버레이가 반응한다(관찰). 닫은 뒤 게임 입력이 돌아오는 데 클릭이 필요한지 **기록만** 한다(수용된 동작) |
| MC-40 | 🔒 테두리 없는 전체 화면 | 테두리 없는 창 모드 전체 화면 게임에서 잠금 오버레이를 오른쪽 클릭(누름·뗌 모두 오버레이 위) | **메뉴가 뜨지 않는다.** 게임 포커스가 유지되고, 게임은 오른쪽 클릭을 받는다 |
| MC-41 | 🔒 독점 전체 화면 | 독점 전체 화면 게임에서 오버레이가 있던 자리를 오른쪽 클릭 | **메뉴가 뜨지 않고, 게임이 최소화되거나 화면이 전환되지 않는다** |
| MC-42 | 최대화 창(테두리 있음) | 작업표시줄 자동 숨김을 ① 끈 채 ② 켠 채, 최대화한 브라우저 위 잠금 오버레이를 오른쪽 클릭 | ①② 모두 메뉴가 뜬다(D-11 — 클라이언트 영역이 제목 표시줄만큼 모니터보다 작음) |
| MC-43 | 바탕 화면·작업표시줄 전경 | ① 바탕 화면 빈 곳을 좌클릭한 뒤, 바탕 화면 위 잠금 오버레이를 오른쪽 클릭 ② 작업표시줄을 클릭해 전경으로 만든 뒤 오버레이를 오른쪽 클릭(잠금·비잠금) | ①② 메뉴가 뜬다(`Progman`·`WorkerW`·`Shell_TrayWnd` 예외). 비고: Alt+Tab 전환 화면·작업 보기가 떠 있을 때의 결과는 관찰만 한다(R7) |
| MC-44 | 브라우저·동영상 전체 화면 | 브라우저 F11 또는 동영상 전체 화면 위 잠금 오버레이를 오른쪽 클릭 | 메뉴가 뜨지 않는다(테두리 없는 전체 화면 — 정의대로). 전체 화면을 나가면 다시 뜬다 |
| MC-45 | 경합·다중 모니터(관찰) | ① 모니터 A에 테두리 없는 전체 화면 게임(전경), 모니터 B에 잠금 오버레이 → B의 오버레이를 오른쪽 클릭 ② 비잠금 오버레이를 전체 화면 게임 위에서 오른쪽 클릭 ③ 배율이 다른 모니터(WQHD + 1080p)로 오버레이를 옮겨 MC-31 반복 | ① 오른쪽 누름으로 B의 아래 창이 활성화되면 전경이 바뀌어 메뉴가 뜰 수 있다 — 결과만 기록(R6) ② 클릭이 오버레이를 활성화해 전경이 이 앱이면 메뉴가 뜬다(정의대로) — 결과만 기록 ③ 메뉴가 뜨고 창 가장자리 판정이 맞다 |

- 사용자가 게임 중일 때는 실행하지 않는다. 검증 세션에서 사용자에게 허락받아 진행한다.

---

## 8. 사용자 결정 (결정 완료 — 2026-09-29, AskUserQuestion 응답)

| # | 질문 | 결정 | 반영 위치 |
|---|---|---|---|
| U-1 | 메뉴를 띄우는 오른쪽 클릭의 기준 | 🔒 **누른 곳·뗀 곳 둘 다 오버레이 창 사각형 안일 때만**(권고안) | §2.4, §3 AC-5, §4.3-5, MC-36, R-40 문구 |
| U-2 | 메뉴가 뜨면 게임이 포커스를 잃음 | **수용**(트레이와 같은 동작). 복귀 기능 없음 | §2.9, §2.10 R1, §3 AC-9, §4.3-8·§4.6, MC-39 |
| U-3 | 독점 전체 화면 게임 최소화 위험 | 🔒 **전체 화면이면 안 띄움**(새 요구, R-40 문구에 포함). 정의: 전경 창이 우리 창(오버레이·설정)이 아니고 그 창이 자기 모니터 전체를 덮으면(독점·테두리 없는 전체 화면 둘 다) 팝업 생략. Win32는 `hook/foreground.rs` 안전 래퍼, `tray/popup.rs`는 안전 함수만 | §2.14(D-10~D-12), §2.10 R2·R6·R7, §3 AC-8, §4 전반, MC-40~MC-45 |
| U-4 | 잠금 중 아래 창 자체 메뉴와 경합 | **수용** | §2.9, §2.10 R3, MC-34 |
| U-5 | 비잠금 오버레이의 브라우저 기본 메뉴 제거 | **동의** | §2.7, §6, MC-31 |
| U-6 | `doc/000_프로젝트_확정사항.md` §6 트레이 행 갱신 | **메인 세션 몫.** 이 문서는 확정사항을 고치지 않는다. 메인 세션이 할 일은 두 가지다: "오버레이 오른쪽 클릭 = 트레이와 같은 메뉴(잠금 중 포함·클릭은 아래 창에도 전달·전체 화면이면 생략, 🔒 2026-09-29)" 추가, 100행 옛 메뉴 서술(새로고침·타이머 누락) 정리 여부 결정 | — |
| T-f·T-j (v3) | 메뉴 바깥의 오버레이를 다시 오른쪽 클릭하면 메뉴가 다시 뜸(R8). 메인 스레드 지연 뒤 늦은 메뉴가 최대 1개 뜸(R9) | **사용자에게 수용으로 보고됨(코디네이터 2026-09-29) — 관찰 유지** | §2.6, §2.9, §2.10 R8·R9, MC-37 ①-b·MC-38 |

- 아키텍트 해석 D-11("창 사각형" = 클라이언트 영역)은 사용자 문장 "창 모드 게임(테두리 있음)에서는 뜬다"를 보장하려는 운용 정의다. 추가 결정은 필요 없다고 판단한다. 다른 해석을 원하면 이 세션으로 되돌린다.
- 결과로 브라우저·동영상 전체 화면(F11)에서도 메뉴가 생략된다(MC-44). "테두리 없는 전체 화면"에 포함되기 때문이다.
- 남은 미결은 없다.
  - 관찰 항목(R4·R6~R9)은 수동 확인 결과에 따라 필요하면 이 세션으로 되돌린다.
  - R8·R9를 없애야 한다고 판단되면 D-8(`RightClick`에 누름 시점·시각 정보)을 이 세션에서 재설계한다. 이때는 core 문서와 이 문서를 함께 고친다.

---

## 9. 새 요구ID 제안 문구 (overlay `requirements.md` §1, v3.2)

현재 오버레이 요구의 마지막 번호는 R-39다. 설정 창의 R-40은 화면별 번호라 겹치지 않는다.

| 요구ID | 요구 (원문 전사) | 출처 | 확정 |
|---|---|---|---|
| R-40 | 그냥 키뷰어에 오른쪽클릭하면 트레이에 뜨는 옵션 같이뜨게하는게 좋을거같아요. — 오버레이 창 위에서 마우스 오른쪽 버튼을 누르고 떼면, 커서 위치에 **트레이 아이콘 메뉴와 같은 메뉴**가 뜬다. 조건은 **누른 곳·뗀 곳 모두** 오버레이 창 사각형 안(투명한 부분 포함, 🔒)이다. 항목·순서·문구·동작은 트레이와 같다. 스톱워치·타이머가 켜져 있으면 「시작」(흐르는 중이면 「일시정지」)·「멈춤」·구분선이 앞에 붙고, 이어서 「설정 열기」·「새로고침」·「오버레이 표시/숨김」·「종료」가 온다. 항목은 메뉴가 뜨는 순간의 설정·타이머 상태로 정한다. **위치 잠금 중에도 뜬다**(🔒). 이때 그 오른쪽 클릭은 아래 창에도 그대로 전달된다(막지 않음). 오버레이가 숨겨져 있으면 뜨지 않는다. **전체 화면이면 띄우지 않는다**(🔒). 전경 창이 이 앱의 창(오버레이·설정 창)이 아니고 그 창이 자기 모니터 전체를 덮으면 메뉴를 생략한다. 독점 전체 화면과 테두리 없는 전체 화면이 모두 해당하고, 브라우저·동영상 전체 화면도 포함된다. 테두리가 있는 창 모드(최대화 포함)나 바탕 화면·작업표시줄이 전경이면 뜬다. 브라우저 기본 오른쪽 클릭 메뉴(뒤로·새로 고침·검사 등)는 뜨지 않는다(🔒). 한 번의 클릭에 메뉴가 둘 이상 뜨지 않는다. 메뉴가 뜨면 키보드 포커스가 메뉴로 옮겨 가고, 닫힌 뒤 원래 창으로 자동으로 돌아가지 않는다(트레이 메뉴와 같음, 수용) | 사용자 피드백·결정 2026-09-29(U-1~U-5), CR-062, `doc/200_설계/architecture/overlay-context-menu.md` §2.4·§2.14·§8 | 🔒 |

- R-28 용어 주(CR-062, 🔒 2026-09-29)
  - R-28의 "위치 잠금 중에는 오버레이를 클릭할 수 없어"는 좌클릭·끌기·Ctrl+휠에 대한 말이다.
  - 잠금 중 오른쪽 클릭도 아래 창으로 통과한다. 다만 R-40에 따라 트레이와 같은 메뉴가 함께 뜬다. 전체 화면이면 뜨지 않는다.
  - 잠금 해제는 여전히 설정 창에서만 한다. 메뉴의 「설정 열기」로 설정 창에 갈 수 있다.
  - 요구 문구는 바꾸지 않는다.
- S-21(§2) 제안: "방송·게임 중인 사용자 | 오버레이를 잠가 둔 채 창 모드 게임을 하다가 설정을 바꾸거나 타이머를 멈추고 싶다. 트레이 아이콘을 찾지 않고 캐릭터를 오른쪽 클릭해 트레이와 같은 메뉴를 쓴다. 전체 화면 게임 중에는 캐릭터 자리를 오른쪽 클릭해도 메뉴가 뜨지 않아 게임이 방해받지 않는다 | 오버레이 오른쪽 클릭 메뉴(잠금 중 포함, 전체 화면 생략) | R-40".
