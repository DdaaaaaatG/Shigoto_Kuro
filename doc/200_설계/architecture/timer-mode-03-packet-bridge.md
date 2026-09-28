# timer-mode 인계 패킷 — bridge

- 선행 조건: core 패킷(`timer-mode-03-packet-core.md`) 완료 마커. `cargo test` PASS와 core 완료 보고의 「실물 시그니처 차이 목록」이 있어야 한다. 차이 목록이 있으면 이 패킷보다 그것을 따른다.
- 요구ID: TM-01·04·05·06·07·08·09(CSP)·10·11·13.
- 작업 모드: 보강. 진입: `claude --agent bridge-manager`(bridge-designer → bridge-implementer).
- 계약 버전: **v0.22 → v0.23. 파괴 변경은 없다.** 전반 설계: `timer-mode-02-design.md` §4.

## 1. 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `doc/200_설계/bridge/contract.md` | v0.23: §3.3(`TimerSettings` 새 필드), §3.9(`TimerMode`·`'finished'`·스냅숏 필드·전이표 교체), §3.10 신설(`AlarmFormat`·`AlarmSound`), §4(`timer://changed` 발신 지점), §5(새 command 3개, `control_timer`·`set_resting` 설명 보강), §5.3 7단계, §5.4(`pickAudioFile`), §5.8(규칙 1·5·8 갱신), §5.9 신설(알림음 규칙), §6·§6.2(`sound.*`), §7(capabilities 불변 + `tauri.conf.json` 변경 요청), §8 이력, §9 추적표 |
| `src-tauri/src/bridge/commands.rs` | 새 command 3개, `control_timer`·`set_resting`·`set_settings` 7단계를 깔때기로 교체 |
| `src-tauri/src/bridge/types.rs` | 재노출: `TimerMode`, `AlarmFormat`, `AlarmSound` |
| `src-tauri/src/error.rs` | `SoundError` → `BridgeError` 변환(한 곳) |
| `src-tauri/src/lib.rs` | **`generate_handler!` 목록에 3줄 추가만**(다른 부분 수정 금지) |
| `src/bridge/types.ts` | `TimerMode`, `TimerStatus` +`'finished'`, `TimerSnapshot` +선택 필드, `TimerSettings` +선택 필드, 상수, `DEFAULT_TIMER_SETTINGS`, `AlarmFormat`, `AlarmSound` |
| `src/bridge/commands.ts` | `getAlarmSound`, `importAlarmSound`, `removeAlarmSound`, `pickAudioFile` |
| `src/bridge/__tests__/*` | 래퍼·타입 테스트 |

## 2. 타입 (contract §3.3·§3.9·§3.10)

**TS** (`src/bridge/types.ts`)
```ts
export type TimerMode = 'stopwatch' | 'countdown'
/** finished = 카운트다운 0 도달 뒤 10초(깜빡임). core가 10초 뒤 stopped로 되돌린다 */
export type TimerStatus = 'stopped' | 'running' | 'paused' | 'restPaused' | 'finished'
export interface TimerSnapshot {
  status: TimerStatus
  elapsedMs: number
  /** v0.23. Rust는 항상 보낸다. 없으면 'stopwatch'(옛 픽스처 호환) */
  mode?: TimerMode
  /** v0.23. 카운트다운 이번 회차 시작 시간(ms), 스톱워치는 0. 없으면 0 */
  durationMs?: number
}
export interface TimerSettings {
  /** 스톱워치 또는 타이머 켜짐(v0.23에서 의미 확장, 값 불변) */
  enabled: boolean
  /** v0.23. 없으면 'stopwatch' */
  mode?: TimerMode
  /** v0.23. 카운트다운 시작 시간(초) 1 ~ 359999. 없으면 1500 */
  countdownSecs?: number
  /** v0.23. 알림음 음량 % 0 ~ 100. 없으면 80 */
  alarmVolume?: number
  textPos: Point; rotation: number; fontSize: number; color: string
}
export const TIMER_COUNTDOWN_SECS_MIN = 1
export const TIMER_COUNTDOWN_SECS_MAX = 359_999
export const TIMER_ALARM_VOLUME_MAX = 100
// DEFAULT_TIMER_SETTINGS 에 mode: 'stopwatch', countdownSecs: 1500, alarmVolume: 80 추가

export type AlarmFormat = 'wav' | 'mp3' | 'ogg'
/** 등록한 알림음. url = asset 프로토콜(?v=수정 시각). 미등록이면 command가 null을 돌려준다 */
export interface AlarmSound { format: AlarmFormat; bytes: number; url: string }
```

- 새 필드를 **선택 필드**로 두는 이유: ui 테스트 25개 이상 파일이 `TimerSnapshot`·`TimerSettings` 리터럴을 직접 만든다. 필수로 두면 이 패킷 끝에서 `yarn tsc --noEmit`이 ui 파일에서 깨진다. `Settings.timer?` 선례와 같은 처리다. 계약 본문에는 「Rust는 항상 보낸다. 선택 표기는 TS 호환용이다」라고 적는다.
- Rust는 core 타입을 재노출만 한다(`crate::settings::timer::TimerMode`, `crate::assets::sound::{AlarmFormat, AlarmSound}`).

**JSON 예시(고정)**
```json
{ "status": "finished", "elapsedMs": 1500000, "mode": "countdown", "durationMs": 1500000 }
{ "status": "running", "elapsedMs": 83250, "mode": "stopwatch", "durationMs": 0 }
{ "enabled": true, "mode": "countdown", "countdownSecs": 1500, "alarmVolume": 80, "textPos": {"x":268,"y":403}, "rotation": 5, "fontSize": 36, "color": "#333333" }
{ "format": "mp3", "bytes": 312004, "url": "http://asset.localhost/…/assets/alarm.mp3?v=1758870000000" }
```

## 3. 명령 (contract §5)

| command | 인자 | 반환 | 에러 code | 처리 |
|---|---|---|---|---|
| `get_alarm_sound` | 없음 | `AlarmSound \| null` | `sound.io` | core `assets::sound::current(assets_dir)`. 부수 효과 없음 |
| `import_alarm_sound` | `path: string` | `AlarmSound` | `sound.too_many_bytes`, `sound.not_audio`, `sound.io` | core `assets::sound::import(assets_dir, path)`. **이벤트 없음**(A-1). 크기 초과가 형식 검사보다 먼저 나온다 |
| `remove_alarm_sound` | 없음 | `void` | `sound.io` | core `assets::sound::remove`. 멱등 |
| `control_timer` | (불변) | (불변) | (불변) | 카운트다운 전이(02-design §3.2). 바뀌었으면 `events::emit_timer_changed` 대신 **`crate::publish_timer_change(&app, &snap)`** |
| `set_resting` | (불변) | (불변) | (불변) | 카운트다운이면 core가 항상 변화 없음. 바뀌었으면 `publish_timer_change` |
| `set_settings` 7단계 | — | — | (불변) | 아래 §3.1 |

- 래퍼: `getAlarmSound(): Promise<AlarmSound | null>`, `importAlarmSound(path: string): Promise<AlarmSound>`(`invoke('import_alarm_sound', { path })`), `removeAlarmSound(): Promise<void>`.
- `pickAudioFile(title?: string): Promise<string | null>`: TS 전용. `pickPngFile`과 같은 모양이고 필터는 `[{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg'] }]`, 기본 제목은 `'소리 파일 선택'`. 권한은 기존 `dialog:allow-open`(settings 창)이다.
- 래퍼에는 계산을 넣지 않는다. 에러는 삼키지 않는다(bridge-design-strategy).

### 3.1 `set_settings` 7단계 (정본 §5.3 교체)

```
(클로저 안) old_timer = current.timer.clone()
... 1~6 기존 그대로 ...
7 타이머 부수 효과 (실패해도 명령은 성공, 경고 로그):
  a. 타이머 잠금
  b. old.enabled && !new.enabled 이면 Timer::disable(now)          → changed |=
  c. Timer::configure(TimerConfig::from_settings(&new.timer), now)  → changed |=
  d. changed 면 snapshot 복사
  e. 잠금 해제
  f. changed 면 publish_timer_change(app, &snap)   // emit → 트레이 → 깨움 (순서 규칙: settings://changed·손 기준점 이벤트 뒤)
  g. tray::sync_timer_menu(app)                   // enabled만 바뀐 경우를 위해 항상(보기가 같으면 no-op)
```

- 설정 잠금과 타이머 잠금을 동시에 쥐지 않는다(§5.8-6 유지).
- 기존 테스트 이름(`set_settings_disable_pauses_running_timer_and_emits_after_settings_changed`·`set_settings_enable_does_not_change_timer`·`set_settings_disable_is_noop_when_already_stopped`)의 판정 함수는 새 `do_timer_config_side_effect(timer, before: &TimerSettings, after: &TimerSettings, now) -> Option<TimerSnapshot>`로 옮긴다.

### 3.2 깔때기 규칙 (계약 §5.8 규칙 1 교체)

- 「타이머를 바꾸는 모든 경로는 core가 바뀜(`true`)을 돌려줬을 때 `publish_timer_change`를 부른다」: `control_timer`, `set_resting`, `set_settings` 7단계, 트레이 메뉴(core), 마감 스레드(core). bridge에는 `events::emit_timer_changed`를 직접 부르는 곳이 남으면 안 된다(grep 0).
- 「core 마감 시각 스레드 1개가 카운트다운 0 도달과 끝남 10초 만료를 판정한다. 다음 마감까지 자고, 주기 emit은 없다」.

## 4. 이벤트 (contract §4)

- `timer://changed`: 이름·페이로드 타입은 그대로다(스냅숏에 필드 추가). 발신 지점 목록을 교체한다: 사용자 조작(설정 창·**트레이**), 타이머 끔·**모드 전환·대기 중 시작 시간 변경**, 쉬는중 진입·해제(스톱워치만), **카운트다운 0 도달(`finished`)·끝남 10초 만료(`stopped`)**. 빈도: 상태가 바뀔 때만, 분당 수 회 이하. 새 이벤트는 없다.

## 5. 에러 코드 (contract §6·§6.2)

| code | 뜻(ko 기본 메시지 = core) | 발생 command |
|---|---|---|
| `sound.not_audio` | wav·mp3·ogg 소리 파일이 아닙니다. | `import_alarm_sound` |
| `sound.too_many_bytes` | 알림음 파일은 1MB 이하여야 합니다. | `import_alarm_sound` |
| `sound.io` | 알림음 파일을 읽거나 쓰지 못했습니다. | 알림음 command 3개 |
| `timer.disabled` | (code 불변, 문구 변경) 스톱워치나 타이머가 꺼져 있습니다. 먼저 둘 중 하나를 켜 주세요. | `control_timer` |

- 설정 창 `ErrorCode` 유니온·`ERROR_CODES`·3개 국어 사전은 ui 소유다(ui 패킷). 이 패킷은 계약 표만 바꾼다.

## 6. capabilities·설정 파일 (contract §7)

- **capabilities 변경 없음.** 새 command 3개는 앱 command(등록만으로 허용). 파일 선택은 기존 `dialog:allow-open`(settings 창). 사용자 소리는 기존 asset scope `$APPDATA/assets/**`(`assets/alarm.*`).
- **`tauri.conf.json` 변경 요청(메인 세션 반영, 사용자 승인 D-8·D-9)**. 계약 §7에 아래 두 가지를 「요청」으로 적는다. bridge-implementer는 파일을 고치지 않는다.
  1. CSP에 `media-src 'self' asset: http://asset.localhost blob:` 추가(사용자 소리 = asset URL, 기본음 = Blob URL).
  2. `app.windows`의 overlay·settings 두 항목에 **같은** `"additionalBrowserArgs": "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required"`. 창은 `WebviewWindowBuilder::from_config`로 만들어지므로 설정값이 적용된다. Tauri 기본 인자(앞부분)를 함께 적어야 한다. 두 창이 한 WebView2 환경을 공유하므로 인자가 달라서는 안 된다.

## 7. 수용 기준

| 영역 | 테스트 |
|---|---|
| cargo | `get_alarm_sound_none_when_empty`, `import_alarm_sound_error_codes`(`sound.too_many_bytes`·`sound.not_audio`), `import_alarm_sound_returns_versioned_url`, `remove_alarm_sound_idempotent`, `control_timer_countdown_start_changes`, `set_resting_countdown_noop`, `set_settings_mode_switch_resets_timer`, `set_settings_duration_change_updates_stopped_countdown`, `set_settings_duration_change_running_no_snapshot_change`, 기존 `set_settings_*` 3개(새 판정 함수로 이전), `timer_snapshot_json_shape`(4필드), `timer_settings_json_roundtrip`(새 필드), `alarm_sound_json_shape`, `sound_error_to_bridge_error` |
| grep | `src-tauri/src/bridge`에서 `emit_timer_changed(` 직접 호출 0건(깔때기로 모두 교체) |
| vitest | `getAlarmSound`·`importAlarmSound`·`removeAlarmSound` invoke 이름·인자, reject → `BridgeError` 그대로, `pickAudioFile` 필터·기본 제목·취소 null·배열 첫 요소, `DEFAULT_TIMER_SETTINGS` 새 필드 값, 상수 값 |
| 대조표 | contract ↔ Rust ↔ TS 셋 대조표(타입 6·command 3·에러 3) |
| 빌드 | `cargo clippy -- -D warnings` 0, `cargo test` PASS, `yarn tsc --noEmit` exit 0, `yarn test --run` PASS(기존 ui 테스트 포함 — 선택 필드라 깨지지 않아야 한다) |

## 8. 하지 말 것

- 화면 코드(`src/overlay/**`·`src/settings/**`·`src/components/**`)와 i18n을 수정하지 않는다.
- core 모듈 내부(`timer/`·`assets/sound.rs`·`tray/`·`settings/`)를 수정하지 않는다. 시그니처가 모자라면 멈추고 보고한다.
- `lib.rs`는 `generate_handler!` 목록 3줄만 고친다.
- `tauri.conf.json`·`capabilities/`를 고치지 않는다(메인 세션).
- 알림음 변경 이벤트(`alarm://…`)를 만들지 않는다(A-1).
- `TimerSnapshot`·`TimerSettings`의 새 TS 필드를 필수로 바꾸지 않는다(ui 픽스처 호환).

## 9. 완료 마커

- `contract.md` 머리말 v0.23, §8 이력 행, §9 추적표에 TM-xx.
- 위 테스트·빌드 증거, 셋 대조표.
- 완료 보고에 메인 세션 요청 2건(CSP·browser args)을 따로 적는다. ui 패킷의 자동 재생 스파이크는 그 반영이 끝나야 시작할 수 있다.
