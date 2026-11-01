# key-hold 인계 패킷 — bridge

- 선행 조건: core 패킷 완료 마커 — `crate::settings::Settings`에 `key_hold_ms: u32`(직렬화 `keyHoldMs`, 기본 150, 범위 0~500 검증·읽기 보정), `PresetSettings`에 같은 필드, `cargo test` 실패 0.
- 요구ID: KH-01·KH-03·KH-06·KH-08(계약 몫). 사용자 결정 D-7 = **v1.2 · 추가(비파괴) · TS 필수 필드**(02-design §5a 권고). 사용자가 선택 필드(`keyHoldMs?`)로 정하면 이 패킷 §3.1·§5를 아키텍트 세션에서 먼저 고친다.
- 작업 모드: 보강. 진입: `claude --agent bridge-manager`(bridge-designer 계약 → bridge-implementer 코드).
- 한 줄 요약: `Settings` 타입에 필드 `keyHoldMs` 하나, TS 상수 `KEY_HOLD_MS_MIN`·`KEY_HOLD_MS_MAX`, `DEFAULT_SETTINGS.keyHoldMs = 150`을 더한다. **command·event·에러 code·래퍼 함수·capabilities는 하나도 바뀌지 않는다.** Rust 코드 변경 없음(`bridge/types.rs`는 core `Settings` 재노출).

## 1. 변경 대상 파일

| 파일 | 소유 | 변경 |
|---|---|---|
| `doc/200_설계/bridge/contract.md` | bridge-designer | §2 표 전부 |
| `src/bridge/types.ts` | bridge-implementer | `Settings` 필드(227행 `idleSeconds` 다음)·상수 2개(400행 `SCALE_MIN` 근처)·`DEFAULT_SETTINGS`(452행 `idleSeconds` 다음) |
| `src/bridge/__tests__/types.test.ts` | bridge-implementer | 테스트 2건(§3.2) |
| 변경 없음 | — | `src/bridge/commands.ts`·`events.ts`·`index.ts`(`export *`라 상수 자동 재노출), `src-tauri/src/bridge/**`(Rust — `Settings`는 core 정의 재노출, 핸들러 불변), `src-tauri/capabilities/*`, `tauri.conf.json`, `src-tauri/src/lib.rs` |

## 2. 계약 (`contract.md` → v1.2)

| 위치 | 변경 |
|---|---|
| 머리말 3행 「버전」 | **v1.2** — 「(2026-11-01 — key-hold `Settings.keyHoldMs` 추가, **추가·비파괴** — 아래 (v1.2) 줄 · §8 v1.2 행). 이하 v1.1 기록: …」 형식으로 앞에 붙인다. 4행 판 규칙 그대로 |
| 머리말 (v1.1) 줄 앞에 새 줄 | 「(v1.2) key-hold(🔒 2026-11-01 사용자 지정, 확정사항 §6 「키 그림 최소 유지」, 설계 `doc/200_설계/architecture/key-hold-02-design.md` §3·§4·§5a D-1·D-3·D-7, 인계 패킷 `key-hold-03-packet-bridge.md` §2): `Settings`에 필수 필드 `keyHoldMs`(키 그림 최소 유지 시간 ms, 0~500 정수, 기본 150) 추가, TS 상수 `KEY_HOLD_MS_MIN`·`KEY_HOLD_MS_MAX`. 요구 `KH-01`·`KH-03`·`KH-06`·`KH-08`(아키텍처 ID — §9 v1.2). command·event·에러 code·래퍼·권한 불변」 |
| §3.3 TS `Settings` 블록(274행~) `idleSeconds` 다음 줄 | `keyHoldMs: number                   // (v1.2, key-hold KH-06) 키 그림 최소 유지 시간(ms 정수) 0 ~ 500, 기본 150. 키를 눌러 바뀐 키보드 그림·펜 손 누름 그림을 누른 시점부터 최소 이만큼 보인다. 0 = 떼는 즉시 복귀(v1.1까지 동작). 의미(표시 파생)는 ui 몫 — core는 저장·검증만. 필수 필드(keyHoldMs? 아님) — Rust가 항상 키를 보낸다` |
| §3.3 TS 블록 끝(`Language` 타입 다음) | `export const KEY_HOLD_MS_MIN = 0     // (v1.2) Rust settings::KEY_HOLD_MS_MIN과 1:1` · `export const KEY_HOLD_MS_MAX = 500   // (v1.2) Rust settings::KEY_HOLD_MS_MAX와 1:1. 기본값은 DEFAULT_SETTINGS.keyHoldMs = 150(Rust KEY_HOLD_MS_DEFAULT)` |
| §3.3 Rust `Settings` 블록(302행~) `idle_seconds` 다음 줄 | `pub key_hold_ms: u32,             // (v1.2) JSON keyHoldMs, 키 없음 = 150(컨테이너 default). 범위 0~500 — set_settings 범위 밖 = settings.invalid, 파일 읽기는 clamp(core settings.md §3.13). 항상 직렬화` |
| §3.3 규칙 문단(검증 규칙이 적힌 곳) | 「(v1.2) `keyHoldMs` 0~500 정수 — 쓰기 거부·읽기 보정. 음수·소수·문자열은 형식 오류(`idleSeconds`와 같은 기존 경로)」 |
| §5 표 `set_settings` 행(1029행) | 비고 끝에 「(v1.2) 입력 `keyHoldMs` 그대로 저장(ui 소유 필드 — core 소유 병합 대상 아님)」. 에러 code 열 불변 |
| §5.3 1단계(1114행) | 「검증 `settings.validate()`(§3.3 규칙 — … (v1.2) `keyHoldMs` 0~500 추가)」. 4~6단계 부수 효과에 해당 없음을 한 줄로 |
| `rg -n "4필드" contract.md` 전부 (예: 1052행 `save_preset`, 1477행 `preset.invalid_settings`, §5.11) | 「PS-02 4필드」 → 「PS-02 5필드((v1.2) `keyHoldMs` 추가)」. 기록 단락(「(v0.30)」 줄)은 판 기록이라 그대로 두고, 현행 규칙 문장만 고친다 |
| §5.11 프리셋 규칙 | 「(v1.2) 키 없는 옛·내장 프리셋의 `keyHoldMs` = 150(컨테이너 default), 범위 밖 = clamp」 한 줄 |
| §8 변경 이력 | v1.2 행: 일자 2026-11-01 · 변경(위 목록 요약) · **호환성 「추가(비파괴) — 새 필드만, 기존 필드·이름·의미 불변. 저장 데이터·IPC 런타임 비파괴(옛 파일·옛 프리셋 = 150). TS 전체 리터럴 생성부는 필드를 채워야 함 — 제품 코드 0곳, 테스트 픽스처만」** · 각주 「필수 필드 추가 = 추가 분류는 v0.13 `penPos`·v0.21 `timer` 선례(사용자 결정 D-7, 02-design §5a)」 |
| §9 RTM | 「v1.2 (KH-01 · KH-03 · KH-06 · KH-08 — key-hold)」 블록: KH-06 → `Settings.keyHoldMs`·§5.3 · 추가 · 비파괴 · `settings::key_hold` / KH-01·KH-03 → 같은 필드(표시 의미는 ui) / KH-08 → §5.11 PS-02 5필드 · `PresetSettings.key_hold_ms` |
| ui 인계 메모(§9 v1.2 끝) | 「ui 영향: overlay는 `settings.keyHoldMs`를 읽어 보이는 키 상태를 만든다(`src/state/keyHold.ts`), settings 창은 「크기 · 반응」 카드 슬라이더로 쓴다. 범위는 `KEY_HOLD_MS_MIN/MAX`를 import(화면에 숫자 직접 금지). TS 필수 필드라 ui 테스트의 `Settings` 전체 리터럴은 필드를 채워야 한다 — ui 패킷 `key-hold-03-packet-ui.md` §A.0·§B.0」 |

## 3. 코드 (bridge-implementer)

### 3.1 `src/bridge/types.ts`

```ts
export interface Settings {
  /** 표시 배율 0.25 ~ 2 */
  scale: number
  /** 무입력 후 쉬는중 전환까지의 초 */
  idleSeconds: number
  /**
   * (v1.2, key-hold KH-06) 키 그림 최소 유지 시간(ms 정수) KEY_HOLD_MS_MIN ~ KEY_HOLD_MS_MAX, 기본 150.
   * 0 = 떼는 즉시 복귀. 의미(보이는 키 상태)는 overlay `state/keyHold.ts`가 만든다
   */
  keyHoldMs: number
  // … 나머지 필드·순서 불변
}

/** (v1.2, key-hold) 키 그림 최소 유지 시간 범위(ms). Rust settings::KEY_HOLD_MS_MIN/MAX와 1:1 */
export const KEY_HOLD_MS_MIN = 0
export const KEY_HOLD_MS_MAX = 500

export const DEFAULT_SETTINGS: Settings = {
  scale: 1,
  idleSeconds: 300,
  // (v1.2, key-hold) Rust KEY_HOLD_MS_DEFAULT와 1:1
  keyHoldMs: 150,
  // … 나머지 그대로
}
```

- 상수는 `SCALE_MIN`·`SCALE_MAX`(400행) 바로 아래에 둔다. `src/state/keyHold.ts`가 `bridge/types`에서 `KEY_HOLD_MS_MAX`를 import한다(런타임 의존 없는 순수 상수 — `bridge` index를 거치지 않아 tauri API를 끌어오지 않는다).
- 래퍼(`getSettings`·`setSettings`)·`toBridgeError` 변경 없음 — 래퍼에 범위 검사·보정을 넣지 않는다(bridge-design-strategy §11, 검증 주체는 core).

### 3.2 `src/bridge/__tests__/types.test.ts` (기존 `DEFAULT_SETTINGS` describe 안, 253행 근처)

| # | 이름 | 기대 |
|---|---|---|
| TB1 | `DEFAULT_SETTINGS.keyHoldMs는 150이고 KEY_HOLD_MS_MIN~MAX 안이다(v1.2, key-hold)` | `DEFAULT_SETTINGS.keyHoldMs === 150`, `Number.isInteger`, `KEY_HOLD_MS_MIN === 0`, `KEY_HOLD_MS_MAX === 500`, `MIN ≤ 150 ≤ MAX` |
| TB2 | `keyHoldMs는 필수 필드다(v1.2)` | `'keyHoldMs' in DEFAULT_SETTINGS === true`, `Object.keys(DEFAULT_SETTINGS)`에 `keyHoldMs` 포함 |

### 3.3 Rust — 변경 없음

`src-tauri/src/bridge/types.rs`의 `Settings` 재노출로 `get_settings`·`set_settings`·`settings://changed`가 자동으로 `keyHoldMs`를 싣는다. 핸들러·문서주석·테스트 변경 없음. 검증은 core 테스트(KC3·KC7)가 맡는다.

## 4. 셋 대조표 (완료 보고에 그대로 채운다)

| 항목 | contract v1.2 | Rust (core 정의) | TS | 일치 |
|---|---|---|---|---|
| 필드 이름·타입 | `keyHoldMs: number` | `key_hold_ms: u32` → JSON `keyHoldMs` | `keyHoldMs: number` | |
| 필수 여부 | 필수(항상 직렬화) | skip 없음, 키 없음 = 150 | 필수(`?` 없음) | |
| 기본값 | 150 | `KEY_HOLD_MS_DEFAULT = 150` | `DEFAULT_SETTINGS.keyHoldMs = 150` | |
| 범위 | 0~500 | `KEY_HOLD_MS_MIN/MAX` | `KEY_HOLD_MS_MIN/MAX` | |
| 쓰기 범위 밖 | `settings.invalid` | `SettingsError::Invalid` | 래퍼는 `toBridgeError` 그대로 | |
| 프리셋 | PS-02 5필드 | `PresetSettings.key_hold_ms` | (해당 없음 — 프리셋 설정은 TS로 오지 않음) | |
| command·event·에러 code | 변화 없음 | 변화 없음 | 변화 없음 | 불변 |

## 5. 수용 기준

- `cd src-tauri && cargo fmt --check` exit 0 · `cargo clippy -- -D warnings` 경고 0 · `cargo test` 실패 0(Rust 변경 없음 — 회귀만).
- `yarn test --run src/bridge` PASS(TB1·TB2 포함). `yarn test --run` **전체 PASS** — ui는 아직 `keyHoldMs`를 읽지 않으므로 런타임 영향 없음.
- **알려진 과도 실패(D-7, 02-design K-2)**: `yarn tsc --noEmit`이 ui 테스트 파일의 `Settings` **전체 리터럴**(spread 없음)에서 TS2741 「Property 'keyHoldMs' is missing」만 낸다. 예상 대상(실측 tsc 결과가 정본):
  - overlay: `src/overlay/test/OverlayApp.lock.test.tsx`·`OverlayApp.pen.test.tsx`·`OverlayApp.penToggle.test.tsx`·`OverlayApp.retry.test.tsx`·`OverlayApp.specialHide.test.tsx`
  - settings: `src/settings/test/DragHit.test.tsx`·`GeneralTab.test.tsx`·`Hair.test.tsx`·`ImagesTab.test.tsx`·`MousePartsTab.test.tsx`·`PenMode.test.tsx`·`PomoCards.test.tsx`·`ResetAllCard.test.tsx`·`SettingsApp.test.tsx`·`SettingsApp.timer.test.tsx`·`TimerTab.cr052.test.tsx`·`TimerTab.test.tsx`(약 47곳)
  - **ui 테스트 파일은 고치지 않는다**(ui 소유 — ui 패킷 §A.0·§B.0이 해소). 완료 보고에 「tsc 오류 = TS2741 `keyHoldMs` N건, 전부 `src/{overlay,settings}/test/**`」를 적는다. **`src/**` 제품 코드(테스트 아님)나 `src/bridge/**`에서 오류가 하나라도 나면 미완료.**
- grep: `rg -n "keyHoldMs" src/bridge` → `types.ts`(필드·기본값)·`__tests__/types.test.ts`. `rg -n "KEY_HOLD_MS_" src/bridge/types.ts` → 상수 2개.
- 테스트 수: TS 2 추가, Rust 0.

## 6. 하지 말 것

- `src-tauri/src/**`(core·bridge Rust), `src/overlay/**`·`src/settings/**`·`src/components/**`·`src/state/**`(ui) 수정 금지 — 과도 실패 테스트 픽스처 포함.
- 필드 선택성(`keyHoldMs?`)·이름·단위 변경 금지(D-7). 새 command·event·에러 code·래퍼 금지. capabilities·`tauri.conf.json` 변경 금지.
- 래퍼에 범위 검사·clamp·기본값 채우기 추가 금지(bridge-design-strategy §11 — 판정은 core).
- `DEFAULT_SETTINGS`의 다른 필드 값 변경 금지.

## 7. 완료 마커

- `contract.md` 머리말 v1.2, §3.3·§5·§5.3·§5.11·§6(`preset.invalid_settings` 「5필드」)·§8·§9 반영.
- `cargo test` 실패 0, `yarn test --run` 전체 PASS 로그, `yarn tsc --noEmit` 오류가 위 목록의 TS2741뿐임을 보이는 출력, §4 대조표.
- 완료 보고 → 메인 세션이 `key-hold-03-packet-ui.md`를 ui-manager 세션에 인계(overlay §A, settings §B — 별도 세션 권장. 두 세션 모두 0단계를 먼저 끝내야 tsc가 깨끗해진다).
