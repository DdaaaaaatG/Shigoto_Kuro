# data-reset 인계 패킷 — bridge

- 받는 세션: `claude --agent bridge-manager` (작업 모드: **보강**)
- 전반 설계: `doc/200_설계/architecture/data-reset-02-design.md`(§1 목표 구조, §3 계약 변경). 현황 근거: `.claude/reports/bridge-survey-20260927-1400.md`.
- 전략: `bridge-design-strategy`(명명·에러 형태·핸들러는 얇게), `.claude/skills/rust-rules.md`, `ts-rules.md`.
- 순서: bridge-designer가 `contract.md`를 v0.24에서 v0.25로 올리고 → bridge-implementer가 Rust 핸들러, 등록, TS 래퍼를 만든다.

## 선행 조건

- **core 패킷 완료 마커**(`data-reset-03-packet-core.md` 「완료 마커」)가 있어야 착수한다.
  - `data_reset::reset_data(&AppPaths, &Mutex<Settings>) -> Result<ResetOutcome, ResetError>`
  - `ResetError::code() -> &'static str`(`reset.io`·`reset.seed`·`settings.*`)
  - `tray::refresh_overlay(&AppHandle) -> Result<(), BridgeError>`가 `pub(crate)`
  - `cargo test` PASS
- 새 의존성 없음. capability 변경 없음(앱 command는 등록만 하면 허용, contract.md:1213).

## 요구ID

R-B2(즉시 초기화 command + 두 창 반영), R-B3(에러 코드), R-A2(계약 주석: 시작 시 초기화는 ui에 이벤트를 보내지 않는다. 창이 생기기 전이라 첫 조회가 곧 새 상태다).

## 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `doc/200_설계/bridge/contract.md` | v0.25. §5 command 표에 `reset_app_data` 행 추가, §5.x 상세 절 신설, §6 에러 코드 `reset.io`·`reset.seed` 추가, §4 이벤트 절에 순서 규칙 주석 추가, 변경이력 |
| `src-tauri/src/bridge/commands/mod.rs` | `#[tauri::command] pub fn reset_app_data` + 뒤처리 헬퍼 `reapply_after_reset` |
| `src-tauri/src/bridge/commands/tests.rs` | tauri 없이 도는 단위 테스트(§5) |
| `ResetError` → `BridgeError` 변환 | **기존 `AssetError`·`SettingsError` 변환이 있는 파일에 같은 방식으로** 추가한다(현재 `bridge/types.rs:58-80` 또는 `error.rs` — BRG-002). 새 위치를 만들지 않는다 |
| `src-tauri/src/lib.rs` | **`generate_handler!` 목록에 1줄(`reset_app_data`)만 추가**한다. 다른 부분은 수정 금지 |
| `src/bridge/commands.ts` | `resetAppData(): Promise<void>` |
| `src/bridge/types.ts` | `ErrorCode`(있으면)에 `'reset.io' \| 'reset.seed'` 추가 |
| `src/bridge/__tests__/commands.test.ts` | `resetAppData` 래퍼 테스트 |

## 1. 계약 (contract v0.25)

| 종류 | 이름 | 인자 → 반환 | 에러 | 부수 효과 | 소비자 |
|---|---|---|---|---|---|
| command | `reset_app_data` | `()` → `void`(`null`) | `reset.io`, `reset.seed`, `settings.io`, `state.poisoned` | 아래 §2 순서. **초기화가 실패해도 부수 효과(이벤트·창 적용)는 수행한다**(디스크에 실제로 남은 상태로 두 창을 맞춤) | settings |

에러 코드(§6에 추가, message에 **경로 금지**):

| code | 뜻 | ui 안내 요지 |
|---|---|---|
| `reset.io` | 파일을 지우거나 세대 표식을 쓰지 못함. 일부만 초기화됐을 수 있음 | 앱을 다시 켜면 자동으로 다시 시도함 |
| `reset.seed` | 비운 뒤 내장 기본 그림 등록 실패 | 앱을 다시 켜면 자동으로 다시 시도함 |

이벤트 순서 규칙(§4 비파괴 주석): 한 조작(`reset_app_data`)이 `settings://changed`와 `assets://changed`를 함께 보낼 수 있다.
- 보내는 순서는 settings → assets로 고정한다.
- 두 페이로드는 전체 스냅숏이므로 소비자는 **도착 순서에 의존하지 않는다**.
- 새 이벤트는 추가하지 않는다.

`get_settings`·`get_asset_manifest` 동작 주석(비파괴):
- 앱 시작 때 데이터 세대가 다르거나 없으면 core가 창을 만들기 **전에** 앱 데이터를 초기화한다.
- 그래서 첫 조회가 곧 초기화 뒤의 값이고, 시작 경로에서는 이벤트를 보내지 않는다.

## 2. Rust 핸들러

비유: 창고 정리(core)가 끝나면 매장 두 곳(오버레이·설정 창)에 「진열 바뀜」 방송을 하고, 오버레이 간판(창 크기·위치)을 다시 다는 안내원이다.

```rust
/// [계약] contract.md §5·§5.x reset_app_data (v0.25) [요구] R-B2, R-B3 (data-reset-02-design)
/// 순서: old_timer 복사 → data_reset::reset_data → (결과와 무관) reapply_after_reset → 결과 반환.
/// [에러] reset.io, reset.seed, settings.io, state.poisoned
/// [부수효과] settings://changed, assets://changed, (조건부) assets://hand-anchor-changed,
///            (조건부) timer://changed·트레이 메뉴, 오버레이 창 적용·리사이즈·기본 위치, 오버레이 WebView 새로고침
#[tauri::command]
pub fn reset_app_data(app: AppHandle, state: State<'_, AppState>) -> Result<(), BridgeError> {
    let old_timer = lock_settings(&state)?.timer.clone();
    let result = data_reset::reset_data(&state.paths, &state.settings);
    if let Err(e) = &result { log::warn!("reset_app_data 실패 code={}", e.code()); }
    reapply_after_reset(&app, &state, &old_timer)?;      // state.poisoned만 전파
    result.map(|_| ()).map_err(BridgeError::from)
}
```

`reapply_after_reset(app, state, old_timer) -> Result<(), BridgeError>` 순서. 각 단계는 **기존 함수를 재사용**한다. 이벤트 두 개를 보낸 뒤의 단계는 실패해도 경고 로그만 남기고 계속한다. `set_settings`의 「settings://changed 먼저, 이후 실패는 경고」 규칙과 같다.

| 순서 | 동작 | 재사용 대상 |
|---|---|---|
| 1 | `fin = lock_settings(state)?.clone()`, `manifest = load_manifest_or_warn(&state.paths.assets_dir)` | 기존 헬퍼 |
| 2 | `events::emit_settings_changed(app, &fin)` | `set_settings` :199와 같음 |
| 3 | `events::emit_assets_changed(app, &manifest)` | `after_asset_change` :145와 같음 |
| 4 | `window::apply_overlay_window(app, &fin)` | `set_settings` :203 |
| 5 | `window::resize_overlay(app, manifest.canvas.map(\|c\| (c.width, c.height)), fin.scale)`: 캔버스가 바뀌었을 수 있으므로 **항상** 실행 | `set_settings` :216 |
| 6 | 오버레이를 기본 위치로 이동하고 저장(D-5): **`reset_overlay_position` command(mod.rs:395)가 부르는 core 함수를 그대로 호출**한다. 필요하면 그 본문을 `do_`/헬퍼로 추출해 두 command가 공유한다 | 기존 command 본문 |
| 7 | `refresh_hand_anchor(app, state, &manifest, fin.mouse.as_ref())`: 항상 재계산하고, 값이 바뀌면 기존대로 `assets://hand-anchor-changed` | `set_settings` :222 |
| 8 | `apply_timer_config_side_effect(app, state, old_timer, &fin.timer)` | `set_settings` :227 |
| 9 | `tray::refresh_overlay(app)`: 훅 눌림 표를 비우고 오버레이 WebView를 새로고침(앱 재시작과 같은 초기 상태) | tray.rs:246(core 패킷에서 pub(crate)) |

- 함수는 50줄 이하로 유지한다. 넘으면 4~6과 7~9를 헬퍼로 나눈다.
- 설정 창은 새로고침하지 않는다. 설정 창은 2·3의 이벤트로 갱신된다.
- 위치 저장 스레드(placement.rs:198)를 다시 등록하지 않는다.
- command는 **동기**(`set_settings`와 같음)로 둔다. 창 적용이 메인 스레드를 전제로 하기 때문이다.

## 3. TS 래퍼

```ts
/** [계약] contract.md §5.x reset_app_data (v0.25) — 앱 데이터 전체 초기화(R-B2). 결과는 settings://changed·assets://changed로 받는다 */
export const resetAppData = (): Promise<void> => call<void>('reset_app_data')
```

- 위치는 `src/bridge/commands.ts`(기존 `call<T>` 패턴)다. `src/bridge/index.ts`가 re-export하는지 확인한다.
- `ErrorCode` 유니온이나 목록 상수가 있으면 `'reset.io'`·`'reset.seed'`를 추가한다. 코드 수는 22에서 24가 된다. ui i18n 사전 키 검사(TC-246 류)가 이 수를 본다는 것을 ui 패킷에 넘긴다.

## 4. 하위 호환

- 전부 **추가**라 파괴 변경은 없다. 기존 command·event의 의미와 페이로드는 그대로다.
- BRG-001 주의: 화면 테스트 16개 파일이 `vi.mock('bridge/events')`로 events 모듈을 통째로 교체한다. 이번에는 **새 이벤트 래퍼가 없으므로 영향이 없다**. commands mock에 `resetAppData`가 없어서 생기는 문제는 ui 패킷이 처리한다.

## 5. 수용 기준

- 계약·Rust·TS **3자 대조표**(이름, 인자 없음, 반환 `void`/`()`, 에러 코드 4종, 부수 효과)를 완료 보고에 싣는다.
- Rust 테스트(`commands/tests.rs`, tauri 없이 테스트할 수 있는 부분만):
  - `reset_error_maps_to_bridge_codes`: `ResetError::{Io, Seed, Settings(io)}` → `BridgeError.code`가 각각 `reset.io`·`reset.seed`·`settings.io`이고, message에 tempdir 경로 문자열이 없다.
- vitest `src/bridge/__tests__/commands.test.ts`:
  - `resetAppData`가 `invoke('reset_app_data')`를 인자 없이 1회 부르고 `undefined`로 resolve한다.
  - reject `{code:'reset.io'}` → `toBridgeError` 결과 code가 `reset.io`다.
- `cd src-tauri && cargo fmt --check` · `cargo clippy --all-targets -- -D warnings` 0 · `cargo test` PASS · `yarn tsc --noEmit` exit 0 · `yarn test --run src/bridge` PASS.
- 수동 확인(bridge-manager가 dev 앱으로 하거나, ui 패킷 검증 때 함께 한다): `resetAppData` 호출 뒤 오버레이가 기본 그림 7장·기본 위치로 새로고침되고, 설정 창 이미지 탭이 기본 그림으로 바뀐다. 스크린샷 경로를 남긴다.

## 하지 말 것

- `src-tauri/src/data_reset/**`·`assets/**`·`settings/**`·`window/**`·`tray/**`(core) 본문을 수정하지 않는다. 단, §2-6에서 `reset_overlay_position` 본문을 bridge `commands/mod.rs` 안의 헬퍼로 추출하는 것은 bridge 파일 안의 일이라 허용한다.
- `lib.rs`는 `generate_handler!` 1줄만 고친다. 가드에 막히면 우회하지 말고 보고한다.
- 화면 코드(`src/settings/**`·`src/overlay/**`)와 i18n 문구를 수정하지 않는다. ui 패킷 소관이다.
- 새 이벤트, 앱 버전 조회 command, 세대 조회 command를 만들지 않는다(요구 없음).
- 실행 중인 앱·dev 프로세스를 종료하지 않는다. 실제 `%APPDATA%` 데이터에 `reset_app_data`를 실행하지 않는다. 수동 확인이 필요하면 사용자 승인을 받는다(개발자 PC 데이터가 지워진다).

## 완료 마커

- `contract.md` 머리 버전이 v0.25이고 변경이력에 `reset_app_data` 행이 있다.
- `generate_handler!`에 `reset_app_data`가 있다.
- `src/bridge/commands.ts`에 `resetAppData`가 export돼 있다.
- 위 테스트 PASS 증거가 있다.
- bridge-manager 완료 보고에 「ui 착수 가능: `resetAppData(): Promise<void>`, 에러 code `reset.io`·`reset.seed`(총 24개)」를 싣는다.
