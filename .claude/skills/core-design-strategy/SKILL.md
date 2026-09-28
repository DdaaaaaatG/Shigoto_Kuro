---
name: core-design-strategy
description: kuro_keyviewer의 core 계층(Rust, src-tauri/src) 설계·구현·검토 표준. 모듈 경계 5종(hook/window/tray/assets/settings)과 책임, unsafe 격리(hook/ 전용·SAFETY 주석), windows 크레이트 직접 호출 전역 후킹 표준(SetWindowsHookExW + GetMessageW 루프), 스레드·채널 모델, 에러 처리(모듈별 Error enum·한국어 메시지·panic 금지), 설정·에셋 파일 위치와 원자적 쓰기, PNG 검증 규칙(RGBA·900×700·1MB·캔버스 일치), 명명 규칙, 테스트 표준, 요구 기반 최소 구현, 문서↔코드 일치, bridge 인계 규약을 정의한다. "Rust 모듈 설계", "후킹 구현", "core 감사", "unsafe 검토", "설정 저장", "PNG 검증" 작업 시 반드시 참조한다.
---

# core 계층 설계 전략 (표준)

- core = `src-tauri/src/` 아래 Rust 네이티브 계층. 전역 입력 후킹·창 제어·트레이·에셋·설정을 맡는다.
- 상위 기준은 `doc/000_프로젝트_확정사항.md`(§2 스택, §3 이미지 규격, §6 창, §7 폴더, §8 계층 위상). 충돌하면 확정사항이 이긴다.
- core는 **ui를 모른다.** 밖으로 나가는 통로는 bridge 계층(command·event)뿐이다.

---

## 1. 모듈 경계 5종

| 모듈 | 책임 | 금지 |
|---|---|---|
| `hook/` | 전역 키보드·마우스 후킹 스레드. 이벤트를 채널로 내보낸다 | 창·설정·파일 접근. UI 상태 판단(연타·유휴 판정은 ui의 상태 기계) |
| `window/` | 오버레이 창 속성(투명·테두리 없음·항상 위·클릭 통과), 드래그 이동, 위치 저장 요청 | 후킹 호출, 설정 파일 직접 IO(settings 모듈 경유) |
| `tray/` | 트레이 아이콘·메뉴(설정 열기/오버레이 표시·숨김/종료), 시작 시 자동 실행 등록·해제 | 창 속성 조작(window 모듈 호출로만) |
| `assets/` | PNG 검증·저장·로드·삭제, 캔버스 기준 크기 관리 | 이미지 해독 이상의 처리(리사이즈·합성 금지 — 표시는 ui) |
| `settings/` | 설정 JSON 스키마·기본값·읽기·원자적 쓰기·마이그레이션(버전 필드) | 비즈니스 판단(값 검증은 하되 의미 해석은 하지 않음) |

- 모듈 = 폴더 + `mod.rs`. 공개 API는 `mod.rs`에서 `pub use`로 재노출한다. 다른 모듈은 `pub` 항목만 쓴다.
- 모듈 간 의존 방향: `tray → window`, `window → settings`, `assets → settings`(캔버스 기준값). `hook`은 아무 모듈도 의존하지 않는다.
- 새 모듈 추가는 요구ID로 역추적될 때만. "나중에 쓸 것 같아서"는 금지(§10).

## 2. unsafe 격리 규칙

- `unsafe`는 **`src-tauri/src/hook/` 안에서만** 쓴다. 훅(`validate-unsafe-scope.py`)이 다른 경로를 차단한다.
- 모든 `unsafe` 블록 바로 위에 `// SAFETY:` 주석으로 **왜 안전한지**(포인터 출처·수명·스레드 조건)를 적는다. 주석 없는 unsafe는 리뷰 FAIL.
- FFI 구조체·상수·핸들은 `windows` 크레이트 타입(`KBDLLHOOKSTRUCT`, `MSLLHOOKSTRUCT`, `HHOOK`, `WPARAM`, `LPARAM`)을 그대로 쓴다. 직접 `#[repr(C)]` 재정의 금지.
- hook 모듈은 안전한 공개 API만 노출한다: `start(sender) -> Result<HookHandle>`, `HookHandle::stop()`. 호출자는 unsafe를 모른다.
- rdev·device_query 등 포장 크레이트 사용 금지(확정사항 §2).

## 3. 전역 후킹 표준

1. **전용 스레드**에서 `SetWindowsHookExW(WH_KEYBOARD_LL, Some(kbd_proc), None, 0)`와 `WH_MOUSE_LL`을 등록한다.
2. 같은 스레드에서 `GetMessageW` 루프를 돈다(루프가 없으면 콜백이 불리지 않는다). 종료는 `PostThreadMessageW(WM_QUIT)`로 루프를 깨우고 `UnhookWindowsHookEx`로 해제한다.
3. 콜백은 **최소 작업**만 한다: `code >= 0` 확인 → 구조체 읽기 → 채널 `send`(또는 원자 플래그) → 즉시 `CallNextHookEx`. 콜백 안에서 잠금 대기·파일 IO·로그 포맷·Tauri API 호출 금지(지연 시 Windows가 훅을 제거한다).
4. 키보드는 `WM_KEYDOWN/WM_SYSKEYDOWN`=누름, `WM_KEYUP/WM_SYSKEYUP`=뗌만 구분한다. 키 코드(`vkCode`)는 **전달하지 않는다**(확정사항 §5: 어떤 키인지 구분 없음). 키 반복(오토리피트) 누름은 첫 누름 후 무시한다(눌린 상태 집합 관리).
5. 마우스는 `WM_MOUSEMOVE`(좌표), `WM_LBUTTONDOWN/UP`, `WM_RBUTTONDOWN/UP`만 다룬다. 이동은 **약 60Hz로 스로틀**(마지막 전송 시각 비교)해 채널을 넘치게 하지 않는다.
6. 좌표는 화면 절대 좌표(`pt.x, pt.y`)를 그대로 보낸다. 패드 구역 매핑은 ui가 한다.
7. 콜백 정적 상태(채널 sender, 눌린 키 집합, 마지막 이동 시각)는 `OnceLock`/`static AtomicX` 로 두고, `SAFETY:` 주석에 초기화 순서를 적는다.
8. 앱 종료·설정 변경으로 후킹을 재시작할 때는 반드시 `stop()` 후 `start()`. 이중 등록 금지.

## 4. 스레드·채널 모델

- 후킹 스레드 → `std::sync::mpsc::Sender<InputEvent>` → **전달 스레드**가 받아 Tauri `AppHandle::emit`으로 내보낸다. 콜백에서 직접 emit 금지.
- `InputEvent`는 core 내부 타입이다. 밖으로 나가는 페이로드 모양은 bridge가 정한다(§12).
- 전달 스레드는 `recv()` 블로킹으로 대기한다(busy loop 금지). 채널 닫힘 = 후킹 종료 신호.
- 공유 상태는 최소화한다. `Arc<Mutex<T>>`가 필요하면 잠금 범위를 한 줄로 줄이고 잠근 채 emit·IO 금지.
- tokio는 Tauri 런타임이 이미 갖고 있을 때만 쓴다. 후킹 스레드는 항상 `std::thread`(Win32 메시지 루프는 OS 스레드 고정이 필요).

## 5. 에러 처리

- 모듈마다 `Error` enum(`thiserror` 스타일: `#[derive(Debug, thiserror::Error)]`). 변형은 원인이 구분되는 단위로만.
- 공개 함수는 `Result<T, Error>`. `unwrap()`·`expect()`는 테스트 코드 밖에서 금지. `panic!` 금지.
- 사용자에게 보일 메시지는 **한국어**, 개발자용 원인은 `#[source]`로 보존. 예: `"이미지 크기가 제한(900×700)을 넘습니다: {w}×{h}"`.
- bridge로 넘길 때는 `impl From<core::Error> for bridge::CommandError`가 bridge 쪽에 있다. core는 bridge 타입을 모른다.
- Win32 호출 실패는 `windows::core::Error`를 감싸고 `GetLastError` 값을 잃지 않는다.

## 6. 설정·에셋 파일 위치와 쓰기

- 루트: Tauri `app.path().app_data_dir()` (Windows: `%APPDATA%\com.kuro.keyviewer\` — tauri.conf.json identifier 기준). 하드코딩 금지.
- `settings.json` — 설정 전체. `assets/` — 사용자 PNG·알림음·`manifest.json`. PNG 파일명은 슬롯 이름(`file_key`) 고정 — `{file_key}.png`: `background`, `hair`, `pomo_char`, `pomo_bubble`, `body`, `idle`, `rest`, `kb_up`, `kb_down_{n}`, `key_{space|z|question|exclamation|enter|backspace|undo}`, `mouse_base`, `mouse_left`, `mouse_right`, `pen_up`, `pen_down_{n}`, `pen_key_*`(호환용). 알림음은 `alarm.{wav|mp3|ogg}` 하나. 전체 목록의 단일 소스는 `src-tauri/src/assets/slot.rs`와 `doc/100_요구조건/parts-spec.md` §2.1. (옛 `state_*`·`slam` 파일명은 폐기)
- **원자적 쓰기**: 임시 파일(`*.tmp`)에 쓰고 `fs::rename`으로 교체. 쓰기 도중 종료돼도 이전 파일이 남는다.
- 설정 JSON에는 `version: u32` 필드를 두고, 읽을 때 누락 필드는 기본값으로 채운다(serde `#[serde(default)]`). 알 수 없는 필드는 무시.
- 기본값(확정사항 §3·§4·§6): 배율 100%, 유휴 300초(60~3600), 오버레이 위치 (100,100), 자동 실행 꺼짐, 마우스 파츠 값(`shoulder`·`area`·`partPos`·`penPos`·`penMode`)은 확정사항 §4 설정값 표. 단일 소스는 Rust `settings/mod.rs`(`Settings` 기본값·`default_mouse`)와 TS `DEFAULT_SETTINGS`·`DEFAULT_MOUSE_SETTINGS`. (쾅 기준·쾅 표시·팔 굵기·색은 폐기)

## 7. PNG 검증 규칙 (assets 모듈, 확정사항 §3)

| 순서 | 검사 | 실패 메시지(한국어) |
|---|---|---|
| 1 | 파일 시그니처 8바이트 `89 50 4E 47 0D 0A 1A 0A` | PNG 파일이 아닙니다. |
| 2 | IHDR 색상 타입 = 6 (RGBA), 비트 깊이 8 | 32bit RGBA PNG 만 지원합니다 (투명 배경 필요). |
| 3 | 용량 ≤ 1 MB (모든 슬롯, 읽기 전에 크기 선검사 — CR-047) | 파일 용량이 1 MB 를 넘습니다 (N 바이트). |
| 4 | 모든 슬롯 가로 ≤ 900, 세로 ≤ 700 | 이미지가 너무 큽니다. 최대 900×700 (현재 W×H). |
| 5 | 캔버스 일치: **캔버스 레이어**(`is_canvas_layer` — 배경·뒷머리·뽀모도·몸통·대기·쉬는중·키보드·특수 키)끼리만 픽셀 크기 동일. 팔(`mouse_*`)·펜 손(`pen_*`) 파츠는 크기 자유(CR-036) | 배경·몸통 등 캔버스 그림은 모두 같은 크기여야 합니다. 캔버스 CW×CH, 이 이미지 W×H. |

- 문구의 단일 소스는 `src-tauri/src/assets/mod.rs`의 `#[error]`. (옛 손바닥 모드 ≤256·마우스 파츠끼리 같은 크기 규칙은 폐기)

- IHDR는 16~24바이트에서 폭·높이(빅엔디안 u32), 24·25바이트에서 비트 깊이·색상 타입을 읽는다. 전체 디코딩은 하지 않는다(`png` 크레이트가 이미 의존성에 있으면 헤더 읽기만 사용).
- 캔버스 기준은 그룹의 **첫 이미지**가 정한다. 그룹이 비면 기준도 지운다.
- 검증 통과 후에만 `assets/`에 복사한다. 실패 시 원본을 건드리지 않는다.

## 8. 명명 규칙

- 파일·모듈·함수·변수: `snake_case`. 타입·트레이트·enum 변형: `PascalCase`. 상수: `SCREAMING_SNAKE_CASE`.
- 모듈 공개 함수는 동사로 시작: `start`, `stop`, `load`, `save`, `validate_png`, `apply_overlay_style`.
- 이벤트·설정 구조체는 `#[serde(rename_all = "camelCase")]`(bridge에서 TS와 맞추기 위함).
- 슬롯 이름은 §6 파일명과 동일한 enum `AssetSlot`으로 표현한다. 문자열 리터럴 산재 금지.

## 9. 테스트 표준

- **순수 로직**(PNG 헤더 파싱, 설정 기본값·병합, 스로틀 판단, 눌린 키 집합)은 같은 파일 `#[cfg(test)] mod tests`의 단위 테스트.
- **파일 IO**(settings save/load, assets 복사)는 `tempfile::tempdir()`로 격리. 실제 `app_data_dir` 접근 금지.
- **후킹**은 자동 테스트 불가 → `doc/200_설계/core/hook.md`의 수동 검증 체크리스트(등록 성공·키 누름/뗌 수신·마우스 이동 스로틀·다른 앱 입력 통과·stop 후 수신 없음·재시작)로 대체하고, 실행 증거(로그 캡처)를 보고에 싣는다.
- 통합 테스트(`src-tauri/tests/`)는 모듈 조합(설정 로드 → 에셋 검증 → 캔버스 기준)만. Tauri 런타임 의존 테스트는 두지 않는다.
- 완료 기준: `cargo fmt --check` 통과, `cargo clippy -- -D warnings` 경고 0, `cargo test` 전건 PASS. 결과 출력이 보고에 있어야 완료다.

## 10. 요구 기반 최소 구현

- 모든 모듈·함수·설정 필드·이벤트는 요구ID(R-xx)로 역추적된다. 역추적 안 되면 만들지 않는다.
- "나중에 필요할 수 있어서", "봉고캣에 있어서"는 사유가 아니다. 필요해 보이면 산출물에 **후보·사유**로 적고 사용자 판단에 넘긴다.
- 표준 강제 항목(에러 타입, 원자적 쓰기, version 필드, SAFETY 주석)은 예외다.

## 11. 문서↔코드 양방향 일치

- 설계 문서 `doc/200_설계/core/{module}.md`와 모듈 상단 `//!` 문서주석은 같은 항목([목적][공개 API][스레드][unsafe][에러][설정][테스트])을 가진다.
- 구현 중 설계와 달라지면 코드를 맞추거나, 불가하면 **보고**한다. implementer가 설계 문서를 직접 고치지 않는다(designer 소관).
- 설계 문서의 공개 API 시그니처와 코드의 `pub fn` 시그니처가 다르면 core-analyst가 HIGH로 잡는다.

## 12. bridge 인계 규약

- core는 **emit 페이로드·command 이름을 정의하지 않는다.** 대신 설계 문서에 「bridge 요구 명세」 절을 둔다: 내보낼 사건(이름 후보·필드·타입·빈도), 받을 명령(동작·인자·반환·실패 사유).
- bridge-designer가 그 명세로 `doc/200_설계/bridge/contract.md`를 확정하고, bridge-implementer가 `src-tauri/src/bridge/`에서 core 공개 API를 호출한다.
- core 작업 중 bridge 변경이 필요하면 core는 멈추지 않고 요구 명세만 갱신해 보고한다. 계약 확정은 bridge-manager 세션.

## 13. 검토 체크리스트 (core-analyst · verify-core-reviewer 공용)

| # | 항목 | 심각도 |
|---|---|---|
| 1 | `unsafe`가 hook/ 밖에 있음 | CRITICAL |
| 2 | `unsafe` 블록에 `SAFETY:` 주석 없음 | HIGH |
| 3 | 훅 콜백에서 잠금 대기·IO·emit·로그 포맷 | CRITICAL |
| 4 | `CallNextHookEx` 미호출 경로 존재 | CRITICAL |
| 5 | 메시지 루프 없이 훅 등록 / stop 없이 재등록 | HIGH |
| 6 | `unwrap`/`expect`/`panic!` 비테스트 코드 | HIGH |
| 7 | 설정·에셋 경로 하드코딩, 비원자적 쓰기 | HIGH |
| 8 | PNG 검증 5단계 중 누락 | HIGH |
| 9 | 모듈 의존 방향 위반(§1), hook이 다른 모듈 참조 | HIGH |
| 10 | 요구ID로 역추적되지 않는 함수·필드 | MEDIUM |
| 11 | 문서주석 항목 누락, 설계 문서와 시그니처 불일치 | MEDIUM |
| 12 | 파일 800줄·함수 50줄 초과, clippy 경고 | LOW |
