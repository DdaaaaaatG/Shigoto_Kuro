# default-assets 인계 패킷 — bridge

- 받는 세션: `claude --agent bridge-manager` (작업 모드: **보강**)
- 전반 설계: `doc/200_설계/architecture/default-assets-02-design.md`. 이 패킷과 어긋나면 02-design이 맞다. 현황 근거: `.claude/reports/bridge-survey-20260924-2330.md`.
- 전략: `bridge-design-strategy`(명명·에러 응답·capability 최소 권한), `.claude/skills/rust-rules.md`, `.claude/skills/ts-rules.md`.

## 선행 조건

- **core 완료 마커**: core 패킷의 완료 보고가 있고, 다음 공개 API가 존재하며 `cargo test`가 PASS다.
  - `assets::defaults::{restore_default, has_default, DEFAULT_ASSETS}`
  - `assets::export::{export_defaults, ExportReport, ExportFailure}`
  - `AssetError`의 `asset.no_default`·`asset.export_dir`
- 새 의존성이 없다. **capability 변경도 없다.** `dialog:allow-open`이 `open({ directory: true })`까지 허용한다(plugin-dialog 2.7.3 acl `commands.allow ["open"]`, bridge-survey Q5).
- 사용자 결정 확정 (🔒 2026-09-24, 02-design §5)
  - **U-2 = B**: §4를 반드시 적용한다. core가 `default_mouse().pen_pos = Some(380,496)`으로 바꾼 상태다.
  - U-5 = A: `overwrite` 인자로 2단계 호출한다. 1차는 검사, 2차는 전부 덮어쓰기다.
  - U-1 = B: ui가 기본 그림이 있는 칸에서 `remove_asset`을 부르지 않는다. **계약 변경은 없다.**

## 요구ID

DA-01(목록 사본), DA-02(시딩 동작 주석), DA-03(복원 command), DA-05(내보내기 command·폴더 선택 래퍼), DA-06(에러 코드), DA-07(penPos 기본값 (380,496), U-2 = B).

## 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `doc/200_설계/bridge/contract.md` | v0.15 → **v0.16**. 머리말 버전 요약, §3.1(상수), §3.x(새 타입), §5 표(command 2개), §5.4(`pickFolder`), §6·§6.2(에러), §7(capability 변경 없음 명시), §8 변경 이력, §9 요구 추적 |
| `src-tauri/src/bridge/commands.rs` (현 366줄) | 핸들러 2개 |
| `src-tauri/src/bridge/types.rs` | 필요하면 `ExportReport` 재수출(core 타입이 이미 camelCase Serialize라 사본은 불필요할 수 있다. 판단은 bridge) |
| `src-tauri/src/lib.rs` `generate_handler!`(`:118-133`) | 새 command 2개 등록(2줄). **아래 「lib.rs 등록 주의」 참고** |
| `src/bridge/types.ts` (현 264줄) | `ExportReport`, `ExportFailure`, `DEFAULT_ASSET_SLOTS`, `hasBuiltinDefault`, `DEFAULT_MOUSE_SETTINGS.penPos = { x: 380, y: 496 }`(U-2 = B) |
| `src/bridge/commands.ts` (현 101줄) | `restoreDefaultAsset`, `exportDefaultAssets`, `pickFolder` |
| `src/bridge/index.ts` | 새 export가 배럴에 나오게(기존 방식대로) |
| bridge 테스트(vitest·cargo) | §5 |

## 1. 계약 추가 — command

| command | 인자 | 반환 | 에러 | 부수 효과 | 요구 |
|---|---|---|---|---|---|
| `restore_default_asset` | `slot: AssetSlot` | `AssetManifest` | `asset.no_default`, `asset.not_png`·`asset.bad_header`·`asset.not_rgba`·`asset.too_large`·`asset.too_many_bytes`(내장 그림이라 실제로는 나지 않지만 같은 경로라 표기), `asset.canvas_mismatch`, `asset.io`, `asset.manifest`, `tauri.error`, `state.poisoned` | **`import_asset`과 같다**: `resize_for_canvas_slot` → `emit_assets_changed` → 슬롯이 `mouse_base`면 손 기준점 재계산 → 값이 바뀌었으면 `assets://hand-anchor-changed` | DA-03 |
| `export_default_assets` | `dir: string`(절대 경로 — `pickFolder` 결과), `overwrite: boolean` | `ExportReport` | `asset.export_dir`(폴더 아님·없음·상대 경로), `state.poisoned`(상태를 쓰는 경우만) | **없음**(이벤트·매니페스트 무관). 파일별 실패는 반환값 `failed`에 담는다 | DA-05 |

Rust 핸들러(패턴은 `remove_asset` `commands.rs:225-241`을 따른다. 동기 `pub fn`, 얇게):

```rust
/// [계약] contract.md v0.16 §5 restore_default_asset  [요구] DA-03 (CR-035)
/// [에러] asset.no_default · asset.canvas_mismatch · asset.io · asset.manifest · tauri.error · state.poisoned (+ 검증 코드)
#[tauri::command]
pub fn restore_default_asset(app: AppHandle, state: State<'_, AppState>, slot: AssetSlot) -> Result<AssetManifest, BridgeError>;
//   assets::defaults::restore_default(&state.paths.assets_dir, slot)? → import_asset 과 같은 후처리 → Ok(manifest)
//   후처리가 import_asset 과 중복되면 private fn after_asset_change(app, state, &slot, &manifest) 로 묶는다(3곳 공유)

/// [계약] contract.md v0.16 §5 export_default_assets  [요구] DA-05 (CR-035)
/// [에러] asset.export_dir
#[tauri::command]
pub fn export_default_assets(dir: String, overwrite: bool) -> Result<ExportReport, BridgeError>;
//   assets::export::export_defaults(Path::new(&dir), overwrite).map_err(Into::into)
```

- 에러 변환은 기존 `From<AssetError>`(error.rs:39-43) 한 곳이다. 새 변형은 core의 `code()`로 자동 반영된다.

**lib.rs 등록 주의.** `lib.rs`는 core 소관이다. v0.9 때 bridge-implementer가 가드에 막힌 전례가 있다(contract.md:853).
- 막히면 우회하지 말고 멈춘다. 메인 세션에 「core 변경 요구: `generate_handler!`에 `bridge::commands::restore_default_asset`, `bridge::commands::export_default_assets` 2줄 추가」로 보고한다.
- 메인 세션은 사용자 승인 뒤 core-implementer 1회 위임 등으로 처리한다.

## 2. 계약 추가 — 타입·상수 (§3.1, §3.x)

```ts
// §3.x (새 절 또는 §3.2 AssetManifest 뒤)
export interface ExportFailure {
  /** 쓰지 못한 파일명(예: 'kb_up.png'). 경로 아님 */
  fileName: string
  /** '영역.사유' — 현재 'asset.io' */
  code: string
}
export interface ExportReport {
  /** 쓴 파일명(내장 표 순서) */
  written: string[]
  /** 호출 전에 이미 있던 파일명. overwrite=false 이고 비어 있지 않으면 written 은 [] (아무것도 쓰지 않음) */
  conflicts: string[]
  /** 파일별 실패. 일부만 실패해도 나머지는 written 에 있다 */
  failed: ExportFailure[]
}

// §3.1 REQUIRED_SLOTS 옆 — Rust assets::defaults::DEFAULT_ASSETS 의 사본(순서 동일, 15개)
export const DEFAULT_ASSET_SLOTS: readonly AssetSlot[] = [
  'kb_up', { kind: 'kb_down', index: 0 }, 'idle', 'rest', 'background',
  'key_space', 'key_z', 'key_question', 'key_exclamation', 'key_enter', 'key_backspace', 'key_undo',
  'mouse_base', 'pen_up', { kind: 'pen_down', index: 0 },
]
export const hasBuiltinDefault = (slot: AssetSlot): boolean =>
  DEFAULT_ASSET_SLOTS.some(d => slotKey(d) === slotKey(slot))
```

- Rust 표의 순서가 core 완료 보고와 다르면 core 쪽을 따라 맞춘다.
- 계약 §3.1에 「목록의 원본은 core `DEFAULT_ASSETS`. TS는 사본이며, 불일치는 bridge 결함」을 적는다.

## 3. 계약 추가 — TS 래퍼 (§5, §5.4)

```ts
/** [계약] v0.16 §5 restore_default_asset (DA-03) */
export const restoreDefaultAsset = (slot: AssetSlot): Promise<AssetManifest> =>
  invoke<AssetManifest>('restore_default_asset', { slot })

/** [계약] v0.16 §5 export_default_assets (DA-05) — dir 은 pickFolder 결과 그대로 */
export const exportDefaultAssets = (dir: string, overwrite: boolean): Promise<ExportReport> =>
  invoke<ExportReport>('export_default_assets', { dir, overwrite })

/** [계약] v0.16 §5.4 폴더 선택(DA-05). 취소 = null. capability 추가 없음(dialog:allow-open) */
export const pickFolder = async (title?: string): Promise<string | null> => { /* open({ directory: true, multiple: false, title }) */ }
```

- `pickFolder`는 `pickPngFile`(commands.ts:73-89)과 같은 모양으로 만든다. 반환이 배열이면 첫 요소를 쓰는 방어 처리도 그대로 둔다.
- 인자 키의 camelCase 변환(Tauri 기본: `overwrite`·`dir`·`slot`)을 Rust 인자 이름과 대조한다.

## 4. penPos 기본값 변경 — U-2 = B 확정 (DA-07)

- 수용 기준 추가: vitest `DEFAULT_MOUSE_SETTINGS.penPos`가 `{x:380, y:496}`이고, cargo `default_mouse().pen_pos`와 값이 같다(대조표에 1행).

- contract §3.3 `MouseSettings.penPos` 설명: 「기본 `null`」 → 「기본 `{x:380, y:496}`(기본 세트 pen_up 자리, CR-035). `null` = 아직 놓지 않음(기존 파일 호환)」.
- `src/bridge/types.ts` `DEFAULT_MOUSE_SETTINGS.penPos = { x: 380, y: 496 }`, 주석은 「Rust default_mouse()의 pen_pos와 1:1」.
- 호환성 분류는 **비파괴**(모양 불변, 기본값만 변경)다. §8 이력에 적는다.

## 5. 수용 기준

| 테스트 | 기대 |
|---|---|
| vitest `hasBuiltinDefault` | `kb_up`·`{kb_down,0}`·`idle`·`rest`·`background`·`key_*` 7·`mouse_base`·`pen_up`·`{pen_down,0}` true(15). `{kb_down,1}`·`{pen_down,1}`·`mouse_left`·`mouse_right`·`pen_key_space`·`body` false |
| vitest `DEFAULT_ASSET_SLOTS` | 길이 15, 중복 없음 |
| vitest 래퍼 3종(invoke·dialog mock) | `restoreDefaultAsset` → `invoke('restore_default_asset', { slot })` / `exportDefaultAssets('C:\\x', true)` → `invoke('export_default_assets', { dir: 'C:\\x', overwrite: true })` / `pickFolder('t')` → `open({ directory: true, multiple: false, title: 't' })`, 취소 시 `null` |
| cargo 직렬화 | `ExportReport` JSON 키 = `written`·`conflicts`·`failed`, `ExportFailure` = `fileName`·`code` |
| cargo 목록 대조 | Rust `DEFAULT_ASSETS`의 file_key 15개 = 계약 §3.1 목록(문자열 배열로 테스트에 고정) |
| 셋 대조표 | 계약 ↔ Rust ↔ TS: 이름·인자·반환·에러·optional 여부 표를 완료 보고에 싣는다 |
| 빌드 | `cargo test`·`cargo clippy -- -D warnings`·`yarn tsc --noEmit`·`yarn test --run` 전부 통과 |

## 6. 하지 말 것

- core 모듈 내부(`src-tauri/src/assets/**`, `settings/**`)를 고치지 않는다. 시그니처가 부족하면 멈추고 아키텍트 세션으로 되돌린다.
- 화면 코드(`src/settings/**`, `src/overlay/**`)를 고치지 않는다.
- `capabilities/*.json`·`tauri.conf.json`을 바꾸지 않는다. 폴더 선택에 권한 추가가 **필요 없다**. 만약 실측에서 거부되면 멈추고 메인 세션에 보고한다(설치·권한 추가는 메인 세션 몫).
- `remove_asset`·`import_asset`의 의미와 에러 목록을 바꾸지 않는다.
- 범위 밖 참고: bridge-survey Q8의 주석 불일치 6건(commands.rs 주석 에러 목록 누락 등)은 이 작업 요구가 아니다. 고칠지는 bridge-manager가 판단하고, 고치면 완료 보고에 따로 적는다.

## 완료 마커

- `contract.md` 머리말이 v0.16이고 §8에 CR-035 행이 있다.
- `src/bridge`에서 `restoreDefaultAsset`·`exportDefaultAssets`·`pickFolder`·`hasBuiltinDefault`·`DEFAULT_ASSET_SLOTS`·`ExportReport`·`ExportFailure`를 import할 수 있다.
- 위 테스트 PASS 증거와 셋 대조표가 있다. `lib.rs` 등록이 끝났거나(또는 core 변경 요구로 처리됐다는 기록이 있다).
- 완료 보고 끝에 한 줄: 「ui 착수 가능 — 래퍼·타입 이름 위와 동일」.
