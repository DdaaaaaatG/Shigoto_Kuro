# key-hold 인계 패킷 — core

- 선행 조건: 없음(첫 패킷). 사용자 결정 D-1~D-8은 `key-hold-02-design.md` §5a 권고안 기준 — core에 걸리는 것은 **D-1**(이름·범위·기본값), **D-2**(옛 파일 = 150), **D-3**(프리셋 PS-02 포함, 키 없으면 150)이다. 결정이 다르면 아키텍트 세션에서 이 패킷을 먼저 고친다.
- 요구ID: KH-01·KH-03·KH-06·KH-08(core 몫) — 아키텍처 ID(02-design §6).
- 작업 모드: 보강. 진입: `claude --agent core-manager`(core-designer 문서 → core-implementer 코드).
- 한 줄 요약: `Settings`에 `key_hold_ms: u32`(0~500, 기본 150)를 더하고 `idle_seconds`와 같은 규칙(쓰기 거부·읽기 보정)을 새 파일 `settings/key_hold.rs`에 둔다. 프리셋 PS-02에 포함한다. **값의 의미(표시 파생)는 ui 몫 — core는 저장·검증만 한다.** 새 command·event·스레드 없음.

## 1. 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src-tauri/src/settings/key_hold.rs` | **신규** — 상수 3개·`validate`·`normalize`·`#[cfg(test)] mod tests`(§5 KC1~KC7) |
| `src-tauri/src/settings/mod.rs` | `pub mod key_hold;`·상수 재노출·필드·기본값·`validate` 1줄·`load` 보정 1줄·`//!` 머리 4줄. **추가는 15줄 이하**(현재 777줄, 한계 800 — 01-analysis §5 F-4) |
| `src-tauri/src/presets/format.rs` | `PresetSettings`에 `key_hold_ms` — 필드·`from_settings` 구조 분해 가드·`merge_into`·`normalized`·`validate`·문서주석 「4필드」→「5필드」, 기존 키 단언(312행) 갱신, 신규 테스트 KP2~KP4 |
| `src-tauri/src/presets/mod.rs` | `//! [설정]` 줄(19행)에 `key_hold_ms` 추가 |
| `src-tauri/src/data_reset/mod.rs` | 테스트 `reset_settings_keeps_autostart_and_language`(269행~)의 `current`에 `key_hold_ms: 400,` 1줄 — 기대값 `..Settings::default()`가 150을 단언하게 된다(KC8). 본문 변경 없음 |
| `doc/200_설계/core/settings.md`·`doc/200_설계/core/presets.md` | §4 참조 |
| 변경 없음(확인만) | `src-tauri/src/window/placement.rs`(`keep_core_owned` — `..incoming`이라 `key_hold_ms`는 ui 입력값 그대로 저장), `src-tauri/src/settings/store.rs`, `src-tauri/src/presets/builtin.rs`·`doc/assets/presets/*/preset.json`(내장 프리셋 원문 — 키 없음 = 150), `src-tauri/src/lib.rs`, `src-tauri/src/bridge/**` |

## 2. 시그니처·타입 (정본 — 이름 그대로 옮긴다)

`src-tauri/src/settings/key_hold.rs`:

```rust
//! 키 그림 최소 유지 시간 `keyHoldMs`(🔒 2026-11-01 사용자 지정, key-hold KH-01·03·06·08).
//!
//! [목적] 오버레이가 키 그림(누름·특수 키·펜 손 누름)을 누른 시점부터 최소 이만큼 보이게 하는 ms 값의
//!        범위·기본값·쓰기 검증·읽기 보정. 표시 파생은 ui(`src/state/keyHold.ts`) 몫 — core는 저장·검증만.
//! [규칙] 0 ~ 500 정수 ms, 기본 150. 0 = 떼는 즉시 복귀(v1.1까지 동작). 쓰기(set_settings·프리셋 검증)는 범위 밖
//!        거부(`settings.invalid`), 파일·프리셋 읽기는 clamp(옛 파일이 이 한 필드 때문에 통째로 기본값이 되지
//!        않게 — idle_seconds D24와 같은 이유). 음수·소수는 u32 형식 오류(기존 경로, 관용 읽기 없음 — A-8).
//! [unsafe] 없음.
//! [테스트] 이 파일 `tests` — KC1~KC7(key-hold-03-packet-core §5).

use super::SettingsError;

pub const KEY_HOLD_MS_MIN: u32 = 0;
pub const KEY_HOLD_MS_MAX: u32 = 500;
/// TS `DEFAULT_SETTINGS.keyHoldMs`와 1:1.
pub const KEY_HOLD_MS_DEFAULT: u32 = 150;

/// 쓰기 검증 — `Settings::validate`가 부른다.
pub(super) fn validate(ms: u32) -> Result<(), SettingsError> {
    if !(KEY_HOLD_MS_MIN..=KEY_HOLD_MS_MAX).contains(&ms) {
        return Err(SettingsError::Invalid(
            "키 그림 유지 시간은 0 ~ 500ms 사이여야 합니다.".to_string(),
        ));
    }
    Ok(())
}

/// 읽기 보정 — `settings::load`·`PresetSettings::normalized`가 부른다. 범위 밖이면 clamp + 경고 로그(값만).
pub(crate) fn normalize(ms: u32) -> u32 {
    let clamped = ms.clamp(KEY_HOLD_MS_MIN, KEY_HOLD_MS_MAX);
    if clamped != ms {
        log::warn!("키 그림 유지 시간 {ms}ms가 범위 밖이라 {clamped}ms로 읽습니다");
    }
    clamped
}
```

- 하한 비교는 `contains`로 쓴다 — `ms >= 0`처럼 쓰면 `u32`라 rustc `unused_comparisons` 경고가 나 `clippy -D warnings`가 실패한다. `KEY_HOLD_MS_MIN`이 쓰이므로 dead_code 경고도 없다.

`src-tauri/src/settings/mod.rs` 변경(정본):

```rust
pub mod key_hold;                                                    // pub mod timer; 아래
pub use key_hold::{KEY_HOLD_MS_DEFAULT, KEY_HOLD_MS_MAX, KEY_HOLD_MS_MIN};

pub struct Settings {
    pub scale: f64,
    pub idle_seconds: u32,
    /// 키 그림 최소 유지 시간 ms(0~500, 기본 150 — key-hold KH-06). ui 소유 — set_settings가 그대로 바꾼다.
    pub key_hold_ms: u32,
    // … 나머지 필드·순서 불변
}
// Default: idle_seconds: 300, 다음 줄
            key_hold_ms: KEY_HOLD_MS_DEFAULT,
// Settings::validate — idle_seconds 검사 바로 다음 줄
        key_hold::validate(self.key_hold_ms)?;
// load — idle_seconds 보정 블록과 timer::normalize 사이
    // 키 그림 유지 시간도 거부 대신 보정한다(key-hold, 유휴 시간 보정과 같은 이유).
    settings.key_hold_ms = key_hold::normalize(settings.key_hold_ms);
```

`//!` 머리(1~29행) 갱신 — 줄 수를 늘리지 말고 기존 줄 끝에 덧붙인다:

| 줄 | 덧붙임 |
|---|---|
| [공개 API] | `KEY_HOLD_MS_MIN`·`KEY_HOLD_MS_MAX`·`KEY_HOLD_MS_DEFAULT`(key_hold.rs) |
| [규칙] | ` / keyHoldMs 0~500(읽기는 보정, key_hold.rs)` |
| [호환] 누락 키 목록 | `keyHoldMs`(→ 150) |
| [테스트] | `키 그림 유지 시간(key_hold.rs, key-hold)` |

`src-tauri/src/presets/format.rs` 변경(정본):

```rust
pub(super) struct PresetSettings {
    pub scale: f64,
    pub idle_seconds: u32,
    pub key_hold_ms: u32,            // (key-hold D-3) PS-02. 키 없는 옛·내장 프리셋 = 150(컨테이너 default)
    pub mouse: Option<MouseSettings>,
    pub timer: TimerSettings,
}
// from_settings — 구조 분해 가드에 `key_hold_ms,` 추가(PS-02로 분류), Self { …, key_hold_ms: *key_hold_ms, … }
// merge_into   — cur.key_hold_ms = self.key_hold_ms;
// normalized   — key_hold_ms: crate::settings::key_hold::normalize(self.key_hold_ms),
// validate     — Settings { …, key_hold_ms: self.key_hold_ms, ..Settings::default() }
// 문서주석 「PS-02 4필드」(97·114행 등) → 「PS-02 5필드」, 파일 머리 `//! [설정]`(10행)에 `key_hold_ms` 추가
```

## 3. 동작 명세

1. 새 설치·키 없는 옛 `settings.json` → `key_hold_ms = 150`(컨테이너 `#[serde(default)]`). 직렬화는 항상 `"keyHoldMs": <n>`(skip 없음).
2. `set_settings`(→ `settings::update`) 입력 `keyHoldMs` 0~500 → 그대로 저장·반환·`settings://changed`. 501 이상 → `SettingsError::Invalid` → `settings.invalid`, 파일·메모리 불변. 부수 효과 없음(창 적용·손 기준점·타이머와 무관 — contract §5.3 4~6단계 해당 없음).
3. 파일 읽기 `load`: 범위 밖(501 이상) → 500으로 보정 + 경고 로그, 다른 필드는 그대로. 음수·소수·문자열 → 기존 serde 형식 오류 → `load_or_default`가 파일 전체를 기본값으로 대체(`idle_seconds`와 같은 기존 경로, 바꾸지 않는다).
4. 프리셋: 저장·내보내기는 현재 `key_hold_ms`를 쓴다(`from_settings`). 적용은 `merge_into`로 덮어쓴다(PS-03 5필드 유지). 키 없는 프리셋(옛 내보내기·내장 ①②) = 150. 범위 밖 값 = `normalized`에서 clamp.
5. 전체 초기화 `reset_settings` → 150(`..Settings::default()`, 코드 변경 없음).
6. 새 command·event·에러 code·스레드·채널 없음.

## 4. 문서 (core-designer)

`doc/200_설계/core/settings.md`:

| 절 | 변경 |
|---|---|
| 머리 변경 이력 | 「2026-11-01 key-hold — `keyHoldMs` 추가(KH-06·KH-08, 🔒)」 행 |
| §1 요구 표 | `KH-06`(저장·범위·기본·검증·보정)·`KH-03`(0 허용)·`KH-08`(프리셋) 행 |
| §2 공개 API | `KEY_HOLD_MS_MIN/MAX/DEFAULT`, `key_hold::normalize`(crate 공개) |
| §3.1 스키마 | `keyHoldMs: u32` 행 — 0~500, 기본 150, ui 소유 |
| §3.3 옛 파일 호환 | 누락 키 목록에 `keyHoldMs` → 150 |
| **§3.13 신설** 「key-hold — `keyHoldMs` (🔒 이름·타입·기본값, 구현자가 그대로 옮길 것)」 | 이 패킷 §2·§3 그대로 |
| §3.12 presets 분류 | PS-02 「4필드」 → 「5필드(`key_hold_ms` 추가, D-3)」 |
| §6 에러 타입 | `Invalid` 문구 목록에 「키 그림 유지 시간은 0 ~ 500ms 사이여야 합니다.」 |
| §8 테스트 계획 | §8.x 「key-hold」 — §5 표 KC1~KC8 |
| §9 bridge 요구 명세 | §9.5 「key-hold — `Settings.keyHoldMs` 추가(계약 §3.3·§5.3·§5.11) — **호환성: 추가, 저장 데이터 비파괴**. TS 필수 필드 + 상수 `KEY_HOLD_MS_MIN/MAX` + `DEFAULT_SETTINGS.keyHoldMs = 150`」 |
| §10 RTM | KH-01·03·06·08 행 |
| §11 결정 노트 | 「key-hold 결정 (2026-11-01)」 — D-1·D-2·D-3, A-7(파일 배치)·A-8(거부/보정, 관용 읽기 없음) |

`doc/200_설계/core/presets.md` §3.2(PS-02 필드 표)·§7(테스트): `key_hold_ms` 행, KP1~KP4.

## 5. 수용 기준 (테스트 — `cargo test`, tempdir, `sleep` 금지)

| # | 위치 · 이름 | 조건 | 기대 |
|---|---|---|---|
| KC1 | `key_hold.rs` `default_is_150_and_serialized` | `Settings::default()` | `key_hold_ms == 150`, `validate()` Ok, JSON에 `"keyHoldMs":150` |
| KC2 | `old_file_without_key_reads_default` | 파일 `{"idleSeconds":60}` → `load` | `Some`, `key_hold_ms == 150`, `idle_seconds == 60` |
| KC3 | `validate_range` | `key_hold_ms` = 0·150·500 / 501·`u32::MAX` | 앞 셋 Ok / 뒤 둘 `Err(Invalid)`, `code() == "settings.invalid"`, 문구에 「0 ~ 500ms」 |
| KC4 | `load_clamps_out_of_range` | 파일 `{"keyHoldMs": 9999, "scale": 1.5}` | `key_hold_ms == 500`, `scale == 1.5`(다른 필드 보존) |
| KC5 | `round_trip` | `update`로 0 저장 → `load`, 320 저장 → `load` | 0 / 320 그대로 |
| KC6 | `bad_type_is_format_error` | 파일 `{"keyHoldMs": -1}` | `load` → `Err(Format)`, `load_or_default` → `Settings::default()`(기존 경로 고정) |
| KC7 | `update_rejects_out_of_range` | 메모리·파일 150 상태에서 `update(|s| s.key_hold_ms = 501)` | `Err(Invalid)`, 메모리·파일 모두 150 그대로 |
| KC8 | `data_reset` `reset_settings_keeps_autostart_and_language`(개정) | `current.key_hold_ms = 400` | 결과 == 기대(`..Settings::default()` → 150) |
| KP1 | `presets/format.rs` 기존 키 단언(312행, 개정) | 직렬화 키 | `["idleSeconds", "keyHoldMs", "mouse", "scale", "timer"]` |
| KP2 | `preset_without_key_hold_reads_default` | `settings`에 `keyHoldMs` 없는 preset JSON 파싱 | `key_hold_ms == 150` |
| KP3 | `preset_key_hold_normalized` | `keyHoldMs: 9999` → `normalized()` | 500 |
| KP4 | `merge_into_sets_key_hold_keeps_pc_fields` | `cur`(언어 ja·위치 999·key_hold 0)에 `key_hold_ms 320` 프리셋 `merge_into` | `cur.key_hold_ms == 320`, 언어·위치·autostart·positionLock·showInTaskbar 그대로 |
| 회귀 | 기존 settings·presets·data_reset·window·bridge 테스트, `src-tauri/tests/*`, 내장 프리셋 파싱 테스트 | 변경 없음 | 전부 PASS |

- 명령: `cd src-tauri && cargo fmt --check` exit 0 · `cargo clippy -- -D warnings` 경고 0 · `cargo test` **실패 0**(이 패킷은 과도 실패를 만들지 않는다 — bridge Rust는 core `Settings`를 재노출만 하고, TS는 새 필드를 아직 모르는 채 무시한다).
- 줄 수: `src-tauri/src/settings/mod.rs` ≤ 800줄(`wc -l`), `key_hold.rs`·`format.rs` 800 이하.

## 6. 하지 말 것

- `src-tauri/src/bridge/**`·`src/**`(TS)·`doc/200_설계/bridge/contract.md` 수정 금지(bridge·ui 패킷 몫).
- `idle_seconds`·`scale`·`timer` 등 기존 필드의 규칙·순서·직렬화 변경 금지. 새 command·event·에러 code 금지.
- 관용 읽기(음수·소수·문자열을 값으로 살리기) 추가 금지(A-8). 단계(10ms) 검증 추가 금지(화면 몫).
- 내장 프리셋 원문(`doc/assets/presets/*/preset.json`) 수정 금지 — 키 없음 = 150으로 충분(D-3).
- 키 입력·특수 키·타이밍 정보를 core가 다루지 않는다(hook·window 변경 없음). 새 크레이트 금지.
- `settings/mod.rs`에 테스트를 넣지 않는다(줄 수 한계) — `key_hold.rs`의 `tests` 모듈에 둔다.

## 7. 완료 마커

- `rg -n "key_hold_ms" src-tauri/src` → `settings/mod.rs`(필드·기본값·validate·load)·`settings/key_hold.rs`·`presets/format.rs`·`data_reset/mod.rs`(테스트)에만.
- `cargo test` 로그: KC1~KC8·KP1~KP4 PASS, 실패 0. fmt·clippy 통과. `wc -l src-tauri/src/settings/mod.rs` ≤ 800.
- `doc/200_설계/core/settings.md` §1·§2·§3.1·§3.3·§3.12·§3.13·§6·§8·§9.5·§10·§11, `presets.md` §3.2·§7 갱신.
- 완료 보고 → 메인 세션이 `key-hold-03-packet-bridge.md`를 bridge-manager 세션에 인계.
