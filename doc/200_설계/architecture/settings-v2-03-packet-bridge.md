# settings-v2 인계 패킷 — bridge

- 받는 세션: `claude --agent bridge-manager` (작업 모드: **보강**)
- 전반 설계: `doc/200_설계/architecture/settings-v2-02-design.md` §3(계약 변경 목록)·§4(설정 스키마). 현황 근거: `.claude/reports/bridge-survey-20260924-settingsv2.md`.
- 전략: `bridge-design-strategy`(명명·페이로드·에러 응답·TS↔Rust 동기화·capabilities). 계약 단일 소스: `doc/200_설계/bridge/contract.md`(v0.13 → **v0.14**).

## 선행 조건

- **core 패킷 완료 마커**: core-manager 완료 보고의 「bridge가 부를 core API 목록」과 `cargo test` PASS. 이름이 이 패킷과 다르면 core 보고의 실제 이름을 따른다(의미는 같아야 한다 — 다르면 아키텍트 세션으로 되돌린다).
- 사용자 결정 확정(🔒 2026-09-24, 02-design §5):
  - **D-3 = A**: 계약 에러 코드 정본 = 실물 `영역.사유`(`asset.too_large` 등). 신규 취소 코드 `autostart.cancelled`.
  - **D-6 = A**: `setSettingsWindowTitle` 래퍼 + capability `core:window:allow-set-title`(settings 창 한정).
  - **D-4 승인 범위**: plugin-autostart 제거 승인. bridge 몫 = `commands.rs`의 플러그인 호출 삭제(core `lib.rs` 초기화 삭제와 시점을 맞춘다 — core 완료 보고 확인). **capabilities 파일·`Cargo.toml`·`package.json` 수정은 메인 세션 몫**(아래 §6).
  - **D-7 = C**: 배율(`scale`)·유휴 시간(`idleSeconds`)을 설정 창이 새로 쓴다. 기존 필드·기존 `set_settings` 경로 그대로 → **계약 변경 없음**. 계약 §9 추적표에만 설정 R-03·R-04(SV2-11·12)를 `set_settings`·`settings://changed` 행에 연결한다.

## 요구ID

SV2-02·03·04·05·06·07·08 (02-design §6 RTM의 bridge 열).

## 변경 대상 파일

| 파일 | 변경 | 담당 |
|---|---|---|
| `doc/200_설계/bridge/contract.md` | v0.14 — 아래 §1~§7 | bridge-designer |
| `src-tauri/src/bridge/commands.rs` | `set_settings` 처리 순서 변경, `set_autostart` 재구현(async), `reset_overlay_position` 신규 | bridge-implementer |
| `src-tauri/src/bridge/types.rs` (재노출 있으면) | `Language` 재노출 | bridge-implementer |
| `src-tauri/src/error.rs` | `From<AutostartError> for BridgeError` | bridge-implementer |
| `src-tauri/src/lib.rs` | `invoke_handler`에 `reset_overlay_position` 등록 | bridge-implementer |
| `src/bridge/types.ts` | `Language`, `Settings` 필드 3개, `DEFAULT_SETTINGS`, `REQUIRED_SLOTS`·`isRequiredSlot`, `Position` | bridge-implementer |
| `src/bridge/commands.ts` | `resetOverlayPosition`, `pickPngFile(title?)`, `setSettingsWindowTitle`(D-6) | bridge-implementer |
| `src/bridge/index.ts` | 배럴 export | bridge-implementer |
| `src/bridge/__tests__/*` | 래퍼·타입 테스트 | bridge-implementer |
| `src-tauri/capabilities/default.json`, `Cargo.toml`, `package.json` | **변경안만 보고** — 사용자 승인 후 반영(bridge-implementer 금지 영역) | bridge-manager → 사용자 |

## 1. 타입 (계약 §3.3·§3.1·§3.2·§3.4)

```ts
export type Language = 'ko' | 'ja' | 'en'

export interface Settings {
  scale: number
  idleSeconds: number
  overlay: OverlaySettings
  mouse: MouseSettings | null
  autostart: boolean            // (v0.14) 쓰기 경로 = set_autostart·시작 시 보정뿐. set_settings 입력값은 무시
  language: Language            // (v0.14) 기본 'ko'. 알 수 없는 값은 core가 'ko'로 읽는다
  positionLock: boolean         // (v0.14) 기본 false. true = 오버레이 클릭 통과(끌기·Ctrl+휠 불가)
  showInTaskbar: boolean        // (v0.14) 기본 false. true = 오버레이 창이 작업표시줄에 보임
}

export const DEFAULT_SETTINGS: Settings = { /* 기존 값 */, language: 'ko', positionLock: false, showInTaskbar: false }

/** (v0.14, SV2-08) 필수 이미지 3장. idle·rest는 선택(없으면 오버레이는 kb_up만 보인다). 판정은 ui만 한다 — core는 검사하지 않는다 */
export const REQUIRED_SLOTS: readonly AssetSlot[] = ['kb_up', { kind: 'kb_down', index: 0 }, 'mouse_base']
export const isRequiredSlot = (slot: AssetSlot): boolean   // slotKey 비교

/** 창 위치(가상 화면 물리 px, 정수). 계약 §3.4 Position의 TS 쪽(BRG-012 해소) */
export interface Position { x: number; y: number }
```

- Rust 쪽 `Settings`·`Language`는 core `settings` 모듈 정의를 그대로 쓴다(core 패킷 §1). 계약 §3.3의 Rust 블록을 core 실물과 맞춘다.
- 계약 §3.1 필수 문구(contract.md:124 부근)를 「필수 = `kb_up` + `kb_down_0` + `mouse_base`, `idle`·`rest` 선택」으로 교체. `types.ts:12` 주석 「필수 4장」도 교체.
- 계약 §3.2 `AssetEntry.url`: 「끝에 `?v={수정 시각}` 버전 쿼리가 붙을 수 있다. 같은 슬롯을 교체하면 url이 바뀐다. ui는 url을 해석하지 않고 그대로 `src`에 넣는다」(core 실측 결과가 파일명 리비전 방식이면 그 문구로).
- 정리(같은 패스, 값 변경 없음): `types.ts:194` `MOUSE_PART_MAX_SIZE` 옛 규칙 주석, `:104` 「패드 중심」 주석(BRG-014).

## 2. command 변경 (계약 §5·§5.3)

| command | 인자 | 반환 | 에러 코드 | 변경 |
|---|---|---|---|---|
| `set_settings` | `settings: Settings` | `Settings` | 기존 | **의미 변경(v0.14)** — 아래 처리 순서 |
| `set_autostart` | `enabled: boolean` | `boolean`(실제 상태) | 자동 실행 실패, **자동 실행 취소(신규)**, IO | 시그니처 불변. **`async fn`** + 블로킹 작업은 `tauri::async_runtime::spawn_blocking`(또는 동등)으로 core `tray::autostart::set_enabled` 호출. 성공 → 설정 잠금 안에서 `autostart = 반환값` → 잠금 밖 저장 → `settings://changed` emit → 반환. 취소·실패 → 설정 불변, emit 없음, 에러 반환. UAC 창 때문에 **수 초~수십 초 걸릴 수 있음**을 계약에 적는다 |
| `reset_overlay_position` | 없음 | `Position` | 창 오류, IO | **신규(v0.14, SV2-06)**. core `window::reset_overlay_position` → `settings://changed` emit → 새 위치 반환. 창이 숨김이어도 옮김, 표시 상태 불변. 위치 잠금 중에도 동작. 손 기준점·리사이즈 재계산 없음 |

`set_settings` 처리 순서 (계약 §5.3 표 교체):

| # | 단계 | 변경점 |
|---|---|---|
| 1 | 검증 `settings.validate()` | 불변 |
| 2 | 설정 잠금: 이전 `scale`·`(shoulder, partPos)` 복사, `merged = core 소유 필드 병합(입력, &현재)` | **`autostart`도 core 현재값 유지**(core 패킷 §1) |
| 3 | 저장 | 불변 |
| 4 | `window::apply_overlay_settings` — 표시/숨김 + **위치 잠금(클릭 통과) + 작업표시줄** 적용 → 이전 `scale` ≠ 새 `scale`이면 리사이즈 | **자동 실행 반영 삭제**(plugin 호출 제거). 창 속성 적용 실패는 현행 표시/숨김 실패와 같은 처리(명령 실패 — 계약 §5.3 「확인 필요」 문구 유지) |
| 5 | 설정 잠금: `fin = core 소유 필드 병합(merged, &현재)`, 메모리 ← `fin` | 병합 대상에 `autostart` 포함 |
| 6 | emit → 손 기준점 재계산(조건 불변) → `Ok(fin)` | 불변 |

- 손 기준점 재계산 조건(§5.1-2 ④)·리사이즈 조건(§5.2-2)에 새 필드를 넣지 않는다(§5.1-3·§5.2-3 「재계산 안 함」 목록에 `language`·`positionLock`·`showInTaskbar`·`reset_overlay_position` 추가).
- 핸들러는 얇게(인자 변환 → core 호출 → 에러 변환). 현행 `set_settings` 본문 58줄(BRG-007)은 이번에 손대는 김에 50줄 이하로 쪼갠다(동작 불변).

## 3. 이벤트

새 이벤트 없음. `settings://changed` 발신 지점 목록(§4)에 `set_autostart`(기존)·`reset_overlay_position`(신규)·시작 시 자동 실행 보정(core 백그라운드 스레드, 콜백 주입 — 드래그 저장과 같은 방식, lib.rs 조립)을 적는다.

## 4. TS 래퍼 (`src/bridge/commands.ts`)

```ts
export const setAutostart = (enabled: boolean) => call<boolean>('set_autostart', { enabled })        // 불변(구현만 바뀜)
export const resetOverlayPosition = () => call<Position>('reset_overlay_position')                   // 신규
export const pickPngFile = async (title?: string): Promise<string | null>                            // title 없으면 현행 'PNG 이미지 선택'
/** (D-6) 설정 창 제목 표시줄. @tauri-apps/api/window getCurrentWindow().setTitle — 화면 코드가 직접 import하지 않도록 여기서 감싼다 */
export const setSettingsWindowTitle = (title: string) => Promise<void>
```

- 화면 코드는 `@tauri-apps/api/*`·`@tauri-apps/plugin-*`을 직접 import하지 않는다(현행 예외 `src/main.tsx`는 이번 범위 밖, BRG-004).
- `setSettingsWindowTitle` 실패는 `BridgeError`로 정규화(`call`과 같은 규칙).

## 5. 에러 코드 (계약 §6·§6.1)

- **🔒 D-3 = A.** §6 표의 코드 열을 실물 값(`asset.not_png`·`asset.bad_header`·`asset.not_rgba`·`asset.too_large`·`asset.too_many_bytes`·`asset.canvas_mismatch`·`asset.not_found`·`asset.io`·`asset.manifest`·`settings.invalid`·`settings.io`·`settings.format`·`io.error`·`window.not_found`·`window.no_monitor`·`window.thread`·`tauri.error`·`state.poisoned`·`autostart.error` — 최종 목록은 코드 grep으로 확정)으로 바꾸고, 옛 대문자 이름은 별칭 열로만 남긴다. §6.1 「현황 불일치(확인 필요)」 문구는 해소로 바꾼다. Rust `code()` 값은 바꾸지 않는다.
- 신규: `autostart.cancelled` — message "권한 확인이 취소되어 자동 실행 설정을 바꾸지 않았습니다."
- **ui가 이 code로 3개 국어 문구를 고른다**(ui 패킷). 그래서 code 목록은 계약에 **빠짐없이** 적는다 — `set_settings`·`get_settings`의 실제 에러 열(BRG-006)도 실물대로 고친다.

## 6. capabilities·의존성 (🔒 승인됨 2026-09-24 — 파일 수정은 메인 세션)

bridge 세션은 아래 변경안을 완료 보고에 정확한 JSON 조각으로 적고, 메인 세션이 `capabilities/`·`Cargo.toml`·`package.json`을 고친다. bridge-implementer는 이 파일들을 만지지 않는다.

| 항목 | 변경 | 근거 |
|---|---|---|
| `capabilities/default.json` `autostart:default` | 삭제(승인) | plugin-autostart 미사용 |
| `core:window:allow-set-title` | 추가(승인) — **settings 창 한정**(창별 capability 파일 분리 또는 동등 방식 — 조각 형태는 bridge-designer가 정해 보고) | D-6 |
| 계약 §7 표 | 실물 기준으로 정리: `core:default`, `core:window:allow-start-dragging`(overlay 끌기), `dialog:allow-open`, (+ set-title) | BRG-002 |
| 위치 잠금·작업표시줄 | **JS 권한 추가 없음** — Rust가 `set_ignore_cursor_events`·`set_skip_taskbar`를 직접 부른다(v0.4 리사이즈와 같은 근거) | 02-design §1 |
| `Cargo.toml` `tauri-plugin-autostart`, `package.json` `@tauri-apps/plugin-autostart` | 제거(승인, 메인 세션) — bridge는 `commands.rs` 사용처만 지운다 | 02-design §8 |

## 7. 변경 이력·RTM

- 계약 §8에 v0.14 행: 추가(필드 3개, `reset_overlay_position`, `REQUIRED_SLOTS`, `Position` TS, 취소 에러 코드, `pickPngFile(title?)`, `setSettingsWindowTitle`) / **파괴 가능 변경**: `set_settings`가 `autostart` 입력을 무시(하위 호환 전략: 현행 ui는 `autostart`를 바꾼 적이 없어 동시 지원 기간 불필요. 자동 실행을 바꾸는 유일한 경로는 `set_autostart`로 고정) / 구현 교체: `set_autostart`(레지스트리 Run → 작업 스케줄러) / url 버전 규칙.
- 계약 §9 요구 추적표: 위 command·필드마다 SV2-xx(화면 ID가 정해지면 ST-R-xx로 교체).
- 헤더 버전 표기(BRG-003 — 「v0.13 초안·소스 미적용」)를 실물 상태로 고친다.

## 8. 수용 기준

| # | 기준 | 증거 |
|---|---|---|
| B-1 | 계약 §3.3 ↔ `types.ts` ↔ Rust `Settings` 필드·타입·기본값 대조표 일치(새 3필드 포함) | 대조표(완료 보고) |
| B-2 | `set_settings`에 `autostart: true`(현재 false)를 넣어도 저장·반환·emit 값은 false, 자동 실행 함수 호출 없음 | `cargo test`(핸들러 로직을 core 함수 단위로 검증) |
| B-3 | `set_settings`가 `positionLock`·`showInTaskbar`를 `apply_overlay_settings`로 넘김 | 테스트 또는 코드 대조 |
| B-4 | `set_autostart`가 async이고 블로킹 호출이 별도 스레드에서 실행됨. 취소 → 취소 코드, 설정 불변 | 코드 대조 + 수동(UAC 띄운 채 오버레이가 계속 반응) |
| B-5 | `resetOverlayPosition()` → `invoke('reset_overlay_position')`, 반환 `Position` | vitest(`@tauri-apps/api/core` mock) |
| B-6 | `pickPngFile('X')` → dialog `open`에 `title: 'X'`, 인자 없으면 현행 제목 | vitest |
| B-7 | `isRequiredSlot`: `kb_up`·`{kb_down,0}`·`mouse_base`만 true, `idle`·`rest`·`{kb_down,1}`·`pen_up` false | vitest |
| B-8 | `yarn tsc --noEmit` 0, `yarn test --run` 전체 PASS, `cargo clippy -D warnings` 0, `cargo test` PASS | 실행 로그 |
| B-9 | 이벤트 이름 상수가 `events.ts`·`events.rs` 한 곳씩(추가 없음 확인) | grep |

## 9. 하지 말 것

- core 모듈 내부(`settings/`·`window/`·`tray/`·`hook/`·`assets/`) 로직을 고치지 않는다 — 부족하면 core-manager 세션으로 요구 명세를 돌린다.
- 화면 코드(`src/settings/`·`src/overlay/`)를 고치지 않는다.
- capabilities·`tauri.conf.json`·`Cargo.toml`·`package.json`을 서브에이전트가 직접 바꾸지 않는다(변경안만 보고).
- 새 이벤트·요구 밖 command(예: 개별 `set_position_lock`, 언어 전용 command, 내장 기본 그림 복원)를 만들지 않는다. 창 속성은 `set_settings` 한 경로.

## 10. 완료 마커

- `doc/200_설계/bridge/contract.md` 헤더 v0.14, §8 v0.14 행, §9 추적표 갱신.
- 계약↔Rust↔TS 대조표 + `cargo test`·`yarn test --run`·`yarn tsc --noEmit` 실행 증거.
- capabilities·의존성 변경 조각을 완료 보고에 명시하고, 메인 세션 반영 여부를 적는다 — ui 세션은 D-6 권한(`allow-set-title`)이 반영됐는지 여기서 확인한다.
