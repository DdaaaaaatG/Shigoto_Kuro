---
name: bridge-design-strategy
description: bridge(Tauri command·event 계약) 계층의 설계·구현·검토 표준. ui→bridge→core 단방향 위상, command/event/타입 명명, camelCase·epoch ms·절대 좌표 페이로드 규약, BridgeError 에러 규약과 코드 표, 유사 기존 command 확장 우선, 호환성 분류(추가/비파괴/파괴)와 파괴 변경 시 ui 인계, 이벤트 스로틀(마우스 60Hz), 계약→Rust→TS 동기화 순서와 셋 대조표, capabilities 최소 권한, 테스트(핸들러 순수 함수 분리·invoke mock vitest), 화면의 직접 invoke 금지, 요구 기반 최소 노출을 정의한다. bridge 계약을 설계·확장·구현하거나 계약↔TS↔Rust 일치를 검토할 때 반드시 참조한다.
---

# bridge 설계 전략 (표준)

- bridge 패키지 전 에이전트(bridge-manager / bridge-designer / bridge-implementer / bridge-analyst)가 이 규칙으로 판단한다.
- 계약 실물의 단일 소스는 `doc/200_설계/bridge/contract.md`. 이 스킬은 **규칙**, contract.md는 **현재 계약값**이다.
- 제품 확정값(이미지 규격·레이어·상태 전이·창)은 `doc/000_프로젝트_확정사항.md`를 따른다.

---

## 1. bridge의 정의와 위상

```
ui (React, src/)  →  bridge (계약)  →  core (Rust 모듈, src-tauri/src/{hook,window,tray,assets,settings})
```

| 방향 | 수단 | 소유 파일 |
|---|---|---|
| ui → Rust | **command** (`invoke`) | Rust `src-tauri/src/bridge/commands.rs` · TS `src/bridge/commands.ts` |
| Rust → ui | **event** (`emit`) | Rust `src-tauri/src/bridge/events.rs` · TS `src/bridge/events.ts` |
| 공용 | **타입** | Rust `src-tauri/src/bridge/types.rs` · TS `src/bridge/types.ts` |

- **단방향.** ui는 `src/bridge/` 래퍼만 호출한다. core는 ui를 모르고 `src-tauri/src/bridge/`를 통해서만 밖으로 낸다.
- bridge는 **얇다.** 검증·파일 처리·창 제어 로직은 core 모듈이 갖고, command 핸들러는 인자 변환 → core 호출 → 결과/에러 변환만 한다. 핸들러가 30줄을 넘으면 로직이 core로 가야 할 신호다.
- bridge가 core 변경을 필요로 하면 **core 변경 요구 명세**(필요한 함수 시그니처·입출력·에러)를 만들어 매니저에 보고한다. core 내부를 직접 고치지 않는다.

## 2. 명명

| 대상 | 규칙 | 예 |
|---|---|---|
| command | `snake_case` **동사_명사**. 조회 `get_`, 설정 `set_`, 추가 `import_`/`add_`, 제거 `remove_`, 동작은 동사 그대로 | `get_settings`, `import_asset`, `open_settings_window` |
| event | `도메인://동작` (kebab-case) | `input://mouse-move`, `settings://changed` |
| 타입 | PascalCase. 컬렉션은 `Manifest`/`List`, 오류는 `BridgeError` | `AssetManifest`, `ScreenBounds` |
| 필드 | camelCase (JSON·TS). Rust는 snake_case + `#[serde(rename_all = "camelCase")]` | `idleSeconds` ↔ `idle_seconds` |
| 에러 코드 | `대문자_스네이크`, `도메인_원인` | `ASSET_TOO_LARGE` |

- 이벤트 도메인은 `input`, `settings`, `assets`, `window` 넷으로 시작한다. 새 도메인은 요구에서 역추적될 때만.
- command 이름에 창 이름·구현 세부(`_impl`, `_v2`)를 넣지 않는다.

## 3. 페이로드 규약

| 항목 | 규칙 |
|---|---|
| 필드 | camelCase. TS `interface`와 Rust `struct`가 1:1 |
| 시각 | `ts: number` = Unix epoch **밀리초** (`u64`) |
| 좌표 | 가상 화면 절대 좌표(물리 픽셀). 캔버스 좌표는 필드 이름·주석으로 구분(`shoulder`, `pad`는 캔버스 좌표) |
| 열거 | 문자열 리터럴 유니온 ↔ Rust `enum` + `rename_all = "snake_case"`. 숫자 열거 금지 |
| 없음 | `null` ↔ `Option<T>`. `undefined`·빈 문자열로 "없음"을 표현하지 않는다 |
| 크기 | `width`/`height`, 위치 `x`/`y`, 영역 `{x,y,width,height}` — 이름을 통일한다 |
| 바이너리 | 페이로드에 이미지 바이트를 넣지 않는다. 파일은 경로로, 표시는 asset protocol URL로 |
| 한국어 | 페이로드 안의 사용자 표시 문구(`message`)만 한국어. 코드·키는 영문 |

## 4. 에러 규약

- 모든 command는 `Result<T, BridgeError>`. UI에서는 `Promise<T>`가 `BridgeError { code, message }`로 reject된다.
- `message`는 **사용자에게 그대로 보여도 되는 한국어 한 문장**. 내부 경로·스택은 넣지 않는다(로그로만).
- 에러 코드는 contract.md §6 표가 정본이다. 새 코드는 표에 추가하고 발생 조건을 적는다.

| 코드 | 발생 |
|---|---|
| `ASSET_INVALID_FORMAT` | PNG 아님 · RGBA 아님 · 디코딩 실패 |
| `ASSET_TOO_LARGE` | 크기·용량 한도 초과 (확정사항 §3) |
| `ASSET_CANVAS_MISMATCH` | 캔버스 레이어(배경·뒷머리·뽀모도·키보드 그림)가 캔버스와 크기 다름. 마우스 파츠·펜 그림은 크기 자유라 해당 없음(CR-036) |
| `ASSET_SLOT_INVALID` | 없는 슬롯 · `kb_down` index 불연속 |
| `SETTINGS_INVALID` | 설정 검증 규칙 위반 |
| `IO_ERROR` | 파일 읽기·쓰기·복사 실패 |
| `WINDOW_ERROR` | 창 조회·이동·표시 실패 |
| `AUTOSTART_ERROR` | 자동 실행 등록·해제 실패 |

- core 모듈의 에러 타입(`thiserror`)을 bridge에서 `From<CoreError> for BridgeError`로 **한 곳에서** 변환한다. 핸들러마다 `map_err` 문자열을 만들지 않는다.
- panic은 계약 위반이다. 핸들러 안에서 `unwrap`/`expect` 금지.

## 5. 확장 vs 신규 판정

새 요구가 오면 **먼저 contract.md에서 유사 command/event를 찾는다.**

| 상황 | 판정 |
|---|---|
| 같은 자원(설정·에셋·창)의 같은 동작에 인자·필드만 더 필요 | **확장** — 선택 필드 추가(호환성 「추가」) |
| 같은 자원의 새 동작 | **신규 command**, 같은 도메인 접두어 |
| 새 자원 | 신규 타입 + 신규 command. 도메인 이름을 새로 정한다 |
| 기존 command의 의미가 바뀜 | 파괴 변경 — §6 절차. 새 이름으로 만들고 옛것을 폐기하는 쪽을 우선 검토 |

- "나중에 쓸 것 같아서" 필드·command를 미리 만들지 않는다(§12).
- 하나의 command가 두 가지 일을 하면(예: `set_settings`가 창도 옮김) 분리한다. 단 `set_overlay_position`처럼 "창 이동 + 그 위치 저장"은 한 동작의 부수 효과로 허용한다 — 계약 표 「설명」에 부수 효과를 명시한다.

## 6. 호환성 분류와 파괴 변경 인계

| 분류 | 정의 | ui 영향 |
|---|---|---|
| **추가** | 새 command/event, 기존 타입에 **선택** 필드 추가 | 없음(ui는 몰라도 동작) |
| **비파괴 변경** | message 문구, 검증 완화, 스로틀 간격, 에러 코드 추가 | 없음 |
| **파괴 변경** | 필드 삭제·이름·타입 변경, **필수** 필드 추가, 이벤트/command 이름 변경, 반환 형태 변경, 검증 강화 | ui 수정 필요 |

파괴 변경 절차:
1. bridge-designer가 contract.md 「변경 이력」에 분류=파괴, 영향 받는 ui 호출 지점(`grep`으로 `src/bridge` 래퍼 사용처)을 적는다.
2. bridge-manager가 **ui 변경 요구 명세**(바뀐 계약, 옛→새 매핑, 영향 화면)를 사용자에게 보고한다. bridge는 화면을 고치지 않는다.
3. 사용자 허락 후 ui-manager 세션으로 인계한다. 인계는 **단방향** — ui 작업 중 새 bridge 요구가 나오면 별도 요구로 사용자 확인 후 bridge부터 다시 시작한다(왕복 금지).
4. 구축(build) 모드에서는 task-manager가 core→bridge→ui를 한 흐름으로 다루므로 인계 없이 다음 계층 설계 입력으로 넘긴다.

## 7. 이벤트 빈도·스로틀

| 이벤트 | 규칙 | 이유 |
|---|---|---|
| `input://keyboard` | 즉시. 스로틀·병합 없음 | 바운스 반응 지연이 체감되면 안 된다 |
| `input://mouse-button` | 즉시 | 클릭 이미지 교체 |
| `input://mouse-move` | **≤60Hz** 스로틀(마지막 좌표 유지, 중간 좌표 버림). 좌표 변화 없으면 emit 안 함 | WebView 이벤트 큐 포화 방지 |
| `settings://changed` · `assets://changed` | 변경 확정 후 1회. 연속 변경은 마지막 것만 | 창 간 동기화 |

- 스로틀은 **core 또는 bridge의 Rust 쪽**에서 한다. ui에서 버리게 두지 않는다.
- 입력 이벤트는 오버레이·설정 두 창 모두에 emit한다(`app.emit`). 특정 창에만 보낼 이유가 있으면 계약 표에 적는다.
- 이벤트 페이로드는 **자기 완결**이어야 한다. ui가 이벤트를 받고 다시 command로 상태를 물어야 한다면 페이로드가 부족한 것이다.

## 8. TS ↔ Rust 동기화

순서는 항상 **계약(contract.md) → Rust 타입·핸들러 → TS 타입·래퍼**. 코드를 먼저 고치고 문서를 맞추지 않는다.

구현·감사 시 **셋 대조표**를 남긴다(bridge-implementer 완료 보고 필수, bridge-analyst 감사 출력 필수):

| 계약 항목 | contract.md | Rust (`types.rs`/`commands.rs`/`events.rs`) | TS (`types.ts`/`commands.ts`/`events.ts`) | 판정 |
|---|---|---|---|---|
| `Settings.idleSeconds: number` | §3.3 | `idle_seconds: u32` + camelCase | `idleSeconds: number` | ✅ |
| `input://mouse-move` | §4 | `EVENT_MOUSE_MOVE` 상수 | `EVENT_MOUSE_MOVE` 상수 | ✅ |

- 대조 기준: 이름·필드·타입·optional 여부·직렬화 형태(특히 `AssetSlot` tagged 형태)·에러 코드 목록.
- 이벤트 이름 상수는 양쪽 **한 파일씩**에만 둔다. 문자열 리터럴이 다른 파일에 나타나면 결함(BRG 감사 항목).
- TS 타입 자동 생성 도구(ts-rs 등)는 **사용자 승인 후**에만 도입한다. 도입 전까지는 수동 대조표가 증거다.

## 9. capabilities 최소 권한

- `src-tauri/capabilities/*.json`은 **필요한 command·플러그인 권한만** 연다. 화면별(`overlay`, `settings`)로 필요한 것이 다르면 창 라벨로 나눈다.
- `fs` 플러그인 권한은 주지 않는다. 파일 접근은 전부 Rust command 안에서 한다(사용자 이미지 외 경로 접근 차단).
- asset protocol scope는 앱 데이터 폴더의 `assets/**`로 한정한다.
- 권한 추가는 bridge-implementer가 직접 하지 않는다 — 필요 권한과 이유를 보고하고, 메인 세션이 사용자 승인 아래 반영한다.
- 현재 허용 목록은 contract.md §7이 정본이다.

## 10. 테스트

| 대상 | 방법 | 위치 |
|---|---|---|
| Rust command 핸들러 | 핸들러 본문을 **tauri 의존 없는 순수 함수**(`fn do_import_asset(state, slot, path) -> Result<..>`)로 분리하고 그 함수를 `#[cfg(test)]`로 테스트 | `src-tauri/src/bridge/commands.rs` 하단 · `src-tauri/tests/` |
| Rust 타입 직렬화 | `serde_json::to_string`/`from_str` 왕복. `AssetSlot` tagged 형태·camelCase·Option=null 고정 | `src-tauri/src/bridge/types.rs` 하단 |
| TS 래퍼 | `@tauri-apps/api/core`의 `invoke`를 `vi.mock`으로 대체해 이름·인자·에러 reject 형태 검증 | `src/bridge/__tests__/*.test.ts` |
| TS 이벤트 래퍼 | `listen`을 mock하여 구독·해제(unlisten) 호출 검증 | 같은 폴더 |
| 실물 E2E | ui-tester 소관(앱 실행). bridge는 하지 않는다 | — |

- 구현 완료 보고에는 `cargo test` 결과(테스트 수·PASS), `yarn test`(vitest) 결과, `cargo clippy` 경고 0을 **실행 출력으로** 싣는다.
- 에러 경로(각 에러 코드가 실제로 나오는 입력) 테스트를 정상 경로와 같은 수로 둔다.

## 11. 화면의 bridge 사용 규칙 (ui 계층 경계)

- 화면·컴포넌트·훅은 `import { getSettings, onKeyboard } from 'bridge'`처럼 **래퍼만** 쓴다. `@tauri-apps/api`를 `src/bridge/` 밖에서 import하면 경계 위반이다.
- 래퍼는 command 하나에 함수 하나, 이벤트 하나에 `onXxx(handler): () => void`(구독 해제 반환) 하나. 래퍼 안에 화면 로직(상태 기계·타이머)을 넣지 않는다.
- 래퍼는 에러를 삼키지 않는다. `BridgeError`를 그대로 throw하고 표시는 화면이 결정한다.
- bridge-analyst는 `grep -rn "@tauri-apps/api" src --include=*.ts --include=*.tsx`로 `src/bridge/` 밖 사용을 감사한다.

## 12. 요구 기반 최소 노출

- command·event·필드는 **요구ID(R-xx)로 역추적**될 때만 만든다. contract.md 표의 요구ID 열이 비어 있으면(`미정`) 요구 확정 후 채우고, 어떤 요구에도 닿지 않으면 제거 후보다.
- 디버그·진단용 command(`dump_state` 등)는 사용자가 요구했을 때만, `#[cfg(debug_assertions)]`로 릴리스에서 제외한다.
- core 내부 상태를 통째로 넘기는 command를 만들지 않는다. ui가 필요한 형태로 잘라서 준다.

## 13. 산출물·문서 규약

- contract.md 절 구성: 개요·위상 / 직렬화 규약 / 타입(TS·Rust·JSON 예시) / 이벤트 표 / 명령 표 / 에러 코드 / capabilities / 변경 이력. 절 번호를 바꾸지 않는다(에이전트가 §번호로 인용).
- 각 command 핸들러 위 자기문서화 주석: `/// [계약] contract.md §5 · [요구] R-xx · [에러] CODE1, CODE2 · [부수효과] ...`
- 변경 이력에는 버전·일자·변경·호환성 분류를 한 줄로 남긴다.
