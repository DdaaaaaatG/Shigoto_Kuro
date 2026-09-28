# core 현황 조사: 뽀모도로 타이머 확장 지점 (2026-09-26 15:13, core-analyst, 읽기 전용)

## 0. 요약 (결론 먼저)

- 판정: **새 의존성 없이 확장할 수 있다.** 슬롯 2개는 hair(CR-037)와 같은 방식으로 추가하면 된다. 이 경우 core 코드는 `slot.rs` 한 파일만 바뀐다(enum 변형과 `file_key` 팔). 캔버스 그룹 분류는 "마우스·펜이 아니면 캔버스"라는 부정형이라 자동으로 캔버스에 들어간다.
- `Settings`에는 `version` 필드가 **없다**. 대신 컨테이너 `#[serde(default)]`로 누락 키를 채우고 모르는 키는 무시한다. 그래서 `timer` 하위 객체를 추가해도 버전을 올리지 않고 하위 호환이 된다. 주의할 점이 3가지 있다(§2.5).
- 설정 전파는 `set_settings` → `settings://changed`(전체 `Settings` 페이로드, 모든 창) 경로다. 오버레이는 이 이벤트로 새 값을 받는다.
- 휘발 런타임 상태의 전례는 `AppState.hand_anchor: Mutex<Option<Point>>`(저장 안 하는 캐시)다. 타이머 스레드의 전례는 `overlay-move-saver`(std::thread + `recv_timeout` + `Instant`)다. tokio를 직접 쓰는 곳은 없다.
- 유휴(쉬는중) 판정은 **TS에만 있다**(`src/state/inputMachine.ts`, 100ms tick). core에는 유휴 타이머가 없다.
- 심각도 집계: 이번 작업은 감사가 아니라 현황 조사다. 새로 적발한 위반은 없다. 기존 기록 사항(`version` 필드 부재)은 §2에 참고로 적었다.

## 1. assets 슬롯 (질문 1)

### 1.1 정의 위치
| 항목 | 위치 |
|---|---|
| 슬롯 enum `SimpleSlot` | `src-tauri/src/assets/slot.rs:22-56` |
| 순번 슬롯 `AssetSlot::{Simple, KbDown, PenDown}` (serde untagged) | `slot.rs:73-86` |
| 파일 키 `file_key()` | `slot.rs:105-137` |
| 마우스 파츠 그룹 `is_mouse_part` | `slot.rs:140-145` |
| 펜 그룹 `is_pen_part` | `slot.rs:148-163` |
| **캔버스 레이어 그룹 `is_canvas_layer` = `!mouse && !pen`** | `slot.rs:166-168` |
| 캔버스 재계산(첫 캔버스 레이어가 기준) | `assets/mod.rs:107-116` |
| 그룹 크기 규칙 `group_size` | `assets/mod.rs:244-255` |
| 재노출 | `assets/mod.rs:64` `pub use slot::{AssetSlot, KbDownKind, PenDownKind, SimpleSlot};` |

전체 슬롯(직렬화 이름)은 다음과 같다.
- 캔버스: background, hair, body, idle, rest, kb_up, kb_down_N, key_space, key_z, key_question, key_exclamation, key_enter, key_backspace, key_undo
- 마우스: mouse_base, mouse_left, mouse_right
- 펜: pen_up, pen_down_N, pen_key_space, pen_key_z, pen_key_question, pen_key_exclamation, pen_key_enter, pen_key_backspace, pen_key_undo

### 1.2 필수 여부와 내장 기본
- core는 필수 여부를 판정하지 않는다. `assets/mod.rs:24-26`: "필수 판정은 ui가 한다". 필수 3장(kb_up, kb_down_0, mouse_base)은 ui에서만 판정한다.
- 내장 기본 표는 `assets/defaults.rs:58-77` `DEFAULT_ASSETS: [DefaultAsset; 6]`(kb_up, kb_down_0, background, mouse_base, pen_up, pen_down_0)다. hair는 여기에 **포함되지 않아서** `has_default` 값이 거짓이다(`defaults.rs:80-91`). `restore_default`는 `NoDefault`를 반환한다(`defaults.rs:145-148`).
- 다운로드(내보내기) 목록은 `assets/export.rs:48,61`이다. `DEFAULT_ASSETS`를 그대로 순회하므로 슬롯을 추가해도 바뀌지 않는다.
- 시딩은 `defaults.rs:116-142`이고 역시 `DEFAULT_ASSETS` 기준이다.

### 1.3 hair(CR-037) 추가 때 실제로 건드린 지점
설계 `doc/200_설계/core/assets.md:1037-1130` §3.12의 결정 D34는 "분류·검증·캔버스 코드 0줄 변경"이다(`assets.md:1118`). 실제로 바뀐 곳은 아래와 같다.

| # | 지점 | 파일:줄 | 내용 |
|---|---|---|---|
| 1 | 슬롯 enum | `slot.rs:27-29` | `Hair` 변형과 문서주석 |
| 2 | file_key | `slot.rs:109` | `SimpleSlot::Hair => "hair"` |
| 3 | 모듈 `//!` | `slot.rs:15,17-18` | [헤어 슬롯] 줄, H1~H4 테스트 항목 |
| 4 | 단위 테스트 | `slot.rs:413-517` | H1~H4(직렬화, 분류, 매니페스트 왕복, import·remove 수명주기) |
| 5 | 통합 테스트 | `src-tauri/tests/default_assets.rs:81-86,356-387` | D3에 hair 단언, D-H1(기본 없음), 시딩이 hair를 만들지 않음 |
| 6 | 개발용 예제 | `src-tauri/examples/import_sample.rs:3,16` | `"hair" => simple(SimpleSlot::Hair)` |
| 7 | bridge 재수출 문서주석 | `src-tauri/src/bridge/types.rs:6-7` | 재수출만이라 코드 변경 없음 |
| - | 캔버스 그룹, 매니페스트(`manifest_load.rs`), 삭제·복원·비우기(`mod.rs:320-338`, `defaults.rs:145`), 내보내기, 시딩 | 변경 없음 | 부정형 분류와 관대한 매니페스트 로드(`manifest_load.rs:38-50`) 덕분 |
| (ui/bridge) | `src/bridge/types.ts:22-23`(유니언 `'hair'`), `src/settings/imageSlots.ts:216-221`(카드), `HairLayer.tsx`, i18n 3종, 테스트 여러 개 | 계층 밖 | 파급 참고 |

### 1.4 새 선택 캔버스 슬롯 2개를 추가할 때 건드릴 지점 (hair와 동일)
1. `slot.rs:22-56`: `SimpleSlot`에 변형 2개를 추가한다. serde `rename_all = "snake_case"`이므로 이름을 정하면 JSON 이름도 정해진다.
2. `slot.rs:105-133`: `file_key()` match에 팔 2개를 추가한다. match가 전수 검사라 빠뜨리면 컴파일 오류가 난다.
3. `slot.rs:1-18`: `//!`에 [..슬롯] 줄과 테스트 ID를 추가한다.
4. `slot.rs` tests: H1~H4에 대응하는 테스트를 추가한다(직렬화·file_key, `is_canvas_layer`, 매니페스트 왕복, import/remove). slot.rs가 지금 518줄이라 약 210줄을 추가하면 약 730줄이 된다. 800줄 한계에 가까우므로 `*_slot_tests.rs` 자식 파일로 분리하는 것을 권고한다(전례: `pen_part_tests.rs`, `mouse_part_tests.rs`).
5. `tests/default_assets.rs`: 두 슬롯 모두 `has_default` 값이 거짓이고, `restore_default`가 `NoDefault`를 반환하며, 시딩이 만들지 않는다는 단언을 추가한다(D-H1, D-H2와 같은 모양).
6. `examples/import_sample.rs:3,12-16`: `parse_slot` 팔과 3행 목록을 추가한다(빠뜨려도 컴파일은 되지만 개발용 등록이 안 된다).
7. `bridge/types.rs:1-19`: 문서주석의 버전과 슬롯 목록을 고친다(코드 없음).
8. **바꾸지 않을 곳**: `is_canvas_layer`(자동 포함), `group_size`, `validate`, `recompute_canvas`, `manifest_load.rs`, `defaults.rs`의 `DEFAULT_ASSETS`(내장 기본이 없으면 불변), `export.rs`, `remove`.
9. 계층 밖(파급): TS `src/bridge/types.ts` `AssetSlot` 유니언, `contract.md` §3.1 슬롯 표, 설정 화면 카드, 오버레이 레이어 컴포넌트.
- 주의: 선택 캔버스 슬롯은 **캔버스 크기 결정에 참여한다.** 캔버스가 비어 있을 때 먼저 등록한 뽀모도 그림의 크기가 캔버스가 되고, 이후 다른 캔버스 레이어는 그 크기를 따라야 한다(`mod.rs:107-116`). 캔버스 레이어를 등록하면 오버레이 리사이즈도 일어난다(`bridge/commands.rs:87-102`). "배경과 같은 크기" 규칙이 요구와 맞는지 확인이 필요하다.

## 2. settings 모듈 (질문 2)

### 2.1 Settings 전체 필드 (`src-tauri/src/settings/mod.rs:136-155`)
컨테이너 속성은 `#[serde(rename_all = "camelCase", default)]`다(`:137`).

| 필드 | JSON | 타입 | 기본값(`impl Default`, `:183-200`) |
|---|---|---|---|
| scale | scale | f64 | 1.0 |
| idle_seconds | idleSeconds | u32 | 300 |
| overlay | overlay | OverlaySettings{x,y,visible}(`:39-45`) | (100,100,true) |
| mouse | mouse | Option<MouseSettings>(`:47-78`) | Some(`default_mouse()`) |
| autostart | autostart | bool | false (core 소유) |
| language | language | Language(관용 역직렬화, `:108-134`) | Ko |
| position_lock | positionLock | bool | false |
| show_in_taskbar | showInTaskbar | bool | false |

MouseSettings 필드는 shoulder, area(`#[serde(default = "default_area")]` `:55`), part_pos(`default = "default_part_pos"` `:59`), hand(`#[serde(default)]` Option `:64`), pen_pos(`#[serde(default)]` `:70`), pen_mode(`#[serde(default)]` `:76`)다.

### 2.2 스키마 버전
**`version` 필드는 없다.** 설계 `doc/200_설계/core/settings.md:182,749(D19),771(D15),819`에 "version 필드 없음, 추가형 변경은 serde default로 충분"이 결정과 확인 필요 1로 기록되어 있다. 스킬 §6 표준 강제 항목과 어긋나지만 기존에 기록된 사항이다(이번 조사에서 새로 적발한 것이 아니다).

### 2.3 기본값 채움
- 최상위 누락 키는 컨테이너 `default`가 `Settings::default()`의 해당 필드로 채운다(`:137`).
- 하위 구조체는 필드 단위 `#[serde(default...)]`를 쓴다(MouseSettings `:55,59,64,70,76`).
- 기본값 함수 위치: `default_part_pos` `:85-87`, `default_area` `:96-103`, `pub fn default_mouse` `:159-181`, `impl Default for Settings` `:183-200`.

### 2.4 검증
- `Settings::validate` `:222-238`는 범위 밖이면 `SettingsError::Invalid(한국어 메시지)`를 반환하고 clamp하지 않는다. 대상은 scale(0.25~2), idle_seconds(60~3600), mouse.area 유한성이다.
- 읽기 쪽 보정은 `load` `:256-277`에 있다. idle_seconds만 clamp하고 경고 로그를 남긴 뒤 `validate()`를 호출한다(D24: "필드 하나 때문에 설정 전체가 기본값으로 대체되지 않게").
- 저장 `save` `:280-292`는 validate 후 `.json.tmp`에 쓰고 rename하는 원자적 쓰기다.
- 범위 상수는 `:26-30`에 있다.

### 2.5 `timer` 하위 객체 추가 시 하위 호환 판정
**버전을 올리지 않아도 하위 호환이 된다.** 옛 파일에 `timer` 키가 없으면 컨테이너 default가 채우고, 옛 앱이 새 파일을 읽으면 모르는 키라서 무시한다(`deny_unknown_fields` 없음, 회귀 테스트 C5 `:572-584`). 다만 다음 3가지에 주의해야 한다.
1. **하위 구조체 자체에도 `#[serde(default)]`가 필요하다.** 없으면 `"timer": {}`처럼 필드 일부만 있는 객체에서 Format 오류가 나고, `load_or_default`가 **설정 전체를 기본값으로 대체한다**(`:241-253`).
2. **범위 검증을 `validate`에만 두면 같은 위험이 생긴다.** 파일에 범위 밖 값이 있으면 `load` → `validate` Err → 전체 기본값으로 대체된다. idle_seconds처럼 `load`에서 clamp하는 방식(`:262-274`, D24)을 권고한다.
3. **`set_settings`는 Settings 전체를 받는다**(`bridge/commands.rs:150-208`). 한 창이 `timer` 없는 옛 객체를 보내면 컨테이너 default 때문에 timer가 기본값으로 덮어써진다. `keep_core_owned`(`window/placement.rs:259-264`)는 overlay.x/y와 autostart만 보존한다. ui 쪽이 항상 전체 객체를 펼쳐 보내는지 확인이 필요하다.
- 파일 줄 수: `settings/mod.rs`가 736줄이다. 구조체, 기본값, clamp, 테스트를 넣으면 800줄을 넘을 가능성이 높다. 전례(`pen_mode_tests.rs`, `pen_pos_tests.rs` `:733-736`)처럼 자식 파일로 분리하는 것을 권고한다.

## 3. 설정 변경 전파 (질문 3)

- 이벤트 이름: `settings://changed`(`bridge/events.rs:18`)
- 페이로드: `Settings` 전체(camelCase). emit 함수는 `emit_settings_changed` `events.rs:104-106`이다. `app.emit`이므로 **모든 창**에 보낸다(`events.rs:5`).
- 발신 지점은 3곳이다.
  1. `set_settings`(`commands.rs:201`): 검증 → core 소유 필드 병합 → 저장 → 창 속성 적용 → 조건부 리사이즈 → 재병합과 메모리 반영(`:193-198`) → emit
  2. 오버레이 이동 저장(`lib.rs:274-284`)
  3. 자동 실행 보정(`lib.rs:306-309`)
- 오버레이가 새 값을 받는 경로: 설정 창에서 `set_settings`를 invoke → core가 `AppState.settings`를 갱신하고 `settings://changed`를 emit → 오버레이의 listen 래퍼가 전체 Settings를 받아 교체한다(`src/overlay/design.md:102` 로컬 `useState`). 설정 전용 별도 이벤트는 없고 이 하나를 모두 공유한다.

## 4. 런타임 공유 상태 (질문 4)

| State | 위치 | 내용 |
|---|---|---|
| `AppState` | `lib.rs:46-51`, manage `lib.rs:105-109` | `settings: Mutex<Settings>`, **`hand_anchor: Mutex<Option<Point>>`(저장하지 않는 휘발 캐시)**, `paths: AppPaths` |
| `HookGuard` | `lib.rs:54`, manage `lib.rs:123` | `Mutex<Option<HookHandle>>` |

- 휘발 상태의 전례는 `hand_anchor`다. 계산은 잠금 없이 하고 비교·갱신만 짧게 잠근 뒤 잠금 밖에서 emit한다(`commands.rs:56-84`). 타이머 상태(단계·남은 시간·실행 여부)를 `AppState`에 `Mutex<TimerState>`로 두거나 별도 `app.manage(TimerState(..))`로 두는 방식과 잘 맞는다. 잠금 헬퍼 패턴은 `lock_settings`, `lock_hand_anchor`(`commands.rs:22-42`)다.
- 백그라운드 스레드는 모두 `std::thread::Builder`로 만든다.
  - `hook` 메시지 루프: `hook/mod.rs:423-425`
  - `input-forwarder`: `lib.rs:126-134`
  - `overlay-move-saver`: `window/placement.rs:202-205`. **`recv_timeout` + `Instant` 디바운스, 시각을 인자로 받는 순수 구조체 `MoveDebounce`**(`:124-191`, 테스트 가능). 타이머 틱 스레드의 가장 가까운 전례다.
  - `autostart-sync`: `lib.rs:293-317`
  - `settings-hide-defer`: `lib.rs:198-214`
- tokio는 직접 쓰지 않는다. 유일한 async는 `set_autostart`의 `tauri::async_runtime::spawn_blocking`(`commands.rs:389-395`)이다. 주기 타이머나 tokio interval은 없다.

## 5. hook → event 경로 (질문 5)

- 흐름: 훅 스레드 → `mpsc::Sender<InputEvent>`(`lib.rs:121-122`) → `input-forwarder` → `bridge::events::emit_input`(`events.rs:68-102`)
- 이벤트는 3종이다(`events.rs:15-17`).
  - `input://keyboard` {pressed, heldCount, special, repeat, ts}
  - `input://mouse-move` {x, y, ts}
  - `input://mouse-button` {button, pressed, ts}
- 마우스 스로틀: `MOUSE_MOVE_MIN_INTERVAL_MS = 16`(`hook/mod.rs:84`), `static LAST_MOVE_MS: AtomicU64`(`:151`), `should_emit_move`(`:290-296`), 호출 지점 `mouse_event` `:328`
- **유휴(쉬는중) 판정은 core에 없다.** hook은 유휴를 판정하지 않는다(스킬 §1 금지 사항과 일치). `idle_seconds`는 settings에 저장만 한다. 판정은 TS `src/state/inputMachine.ts`(`idleMs = idleSeconds × 1000`, 테스트 `inputMachine.test.ts:27-64`)가 하고, 오버레이 100ms tick(`src/overlay/design/functions.md:15`)이 구동한다.
- 참고: 타이머를 TS에만 두면 **창마다 독립된 시계**가 생긴다(오버레이와 설정 창 각각). 이번 요구의 "창 간 공유"를 만족하려면 core에 단일 상태를 두고 이벤트로 알려야 한다. 이 방식은 기존 유휴 판정 위치(ui)와 다른 선택이므로 설계 결정 사항이다.

## 6. 의존성 (질문 6)

`src-tauri/Cargo.toml:16-36`
- tauri 2(protocol-asset, tray-icon, image-png), tauri-plugin-dialog 2, serde 1(derive), serde_json 1, thiserror 2, log 0.4, env_logger 0.11, windows 0.58(8개 기능)
- dev: tempfile 3(`:38-39`)
- **tokio 직접 의존 없음, chrono 없음.**
- 판정: `std::time::Instant` 또는 `Duration`과 `std::thread` + `mpsc::recv_timeout` 조합으로 **새 의존성 없이 구현할 수 있다.** 전례는 `window/placement.rs:169-191`이다. 벽시계 시각(epoch ms)이 필요하면 hook이 쓰는 `SystemTime` 방식(`hook/mod.rs:273` `now_ms`)을 쓸 수 있다.

## 7. 요구 추적 / 파급

- 요구 추적: 수행하지 않았다(요구ID 목록을 받지 않았다. 뽀모도로 요구에 아직 ID가 없다).
- 파급 목록(식별만):
  - 슬롯 추가: `slot.rs`, `tests/default_assets.rs`, `examples/import_sample.rs`, `bridge/types.rs`(문서주석), TS `src/bridge/types.ts`, `contract.md` §3.1
  - 설정 추가: `settings/mod.rs`(+자식 테스트 파일), `bridge/types.rs` 문서주석, TS `Settings` 타입(`src/bridge/types.ts:184,305` 부근), `contract.md` §3.3, `window/placement.rs:259`(`keep_core_owned`, timer를 core 소유로 둘 경우에만)
  - 타이머 상태: `lib.rs`(manage와 스레드 spawn, `invoke_handler` 목록 `:144-161`), `bridge/commands.rs`, `bridge/events.rs`(새 이벤트 상수)

## 8. 확인 필요
- C-1: 뽀모도 그림 2장을 "캔버스 레이어"(캔버스 크기 결정에 참여하고 리사이즈를 유발)로 둘지, 크기가 자유로운 별도 그룹으로 둘지 정해야 한다. hair와 같은 방식이라면 앞의 것이다.
- C-2: 타이머 상태의 단일 소유자를 core(Rust 스레드 + 이벤트)로 둘지, ui(오버레이만)로 둘지 정해야 한다. 기존 유휴 판정은 ui 소유다.
- C-3: `timer` 설정을 ui 소유 필드로 둘지 정해야 한다(`keep_core_owned`를 바꾸지 않는 경우). 모든 `set_settings` 호출자가 전체 Settings를 보내는지도 확인해야 한다.
