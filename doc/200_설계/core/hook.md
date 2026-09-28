# hook 모듈 설계

- 상태: 확정(사용자) — §3.7(CR-046) 키보드 부분은 **소스 반영 완료**(사용자 승인 2026-09-26,
  `cargo fmt --check`·`cargo clippy --all-targets -D warnings`·`cargo test` 273건 PASS). §3.7.10
  (마우스 버튼 보강)은 **core-implementer가 같은 원리로 추가 구현·소스 반영 완료**, 단 설계
  자체는 core-designer·사용자 재확인 대기(아래 8차 항목). §3.8(CR-047)은 초안(실측 게이트
  G1·G2 통과 조건부) · 최종 갱신: 2026-09-26
- 변경이력:
  - 2026-09-26 (9차, CR-047 점검 후 정리, 🔒 확정사항 §6 자동 실행 줄 「일반 권한(LeastPrivilege)」, 근거 `.claude/reports/verify-20260926-1821.md` SEC-001) **UAC 승격 래퍼 `hook/elevate.rs` 삭제**(`run_elevated`·`ElevateError`·unsafe E1~E4·테스트 4건). 유일한 호출자 `tray::autostart`가 비승격 `schtasks`로 바뀐다([tray.md](tray.md) §3.5). 훅 콜백·스레드·`KeyTable`·unsafe U1~U11·`start`/`HookHandle`/`InputEvent` **불변**. **6차 항목과 §3.6 전체는 옛 기록**(이 절이 대체). 전제: tray.md §3.5.2 G1·G2 통과 — 실패하면 적용하지 않는다. 상세 **§3.8**. **소스 미적용.**
  - 2026-09-26 (8차, CR-046 보강, core-implementer — task-manager 지시 "마우스 버튼 뗌 유실도
    같은 원리로 보강하라") **마우스 좌·우 버튼 뗌 유실도 정리한다.** 7차 설계(§3.7)는 키보드
    `KeyTable`만 정리했고, 마우스 버튼은 눌림 상태를 전혀 추적하지 않아 뗌 유실(보안 데스크톱
    전환·UIPI 등, 원인은 §3.7.1과 동일)이 있으면 펜 모드 클릭 유지가 고착돼도 복구 경로가
    없었다 — 신고 증상("클릭 유지" 고착)의 절반이 미해결로 남는 gap이었다. **키보드와 같은
    트리거(누름 계열 입력)·같은 판정(`GetAsyncKeyState` 최상위 비트)·같은 except 규칙(지금
    이벤트를 일으킨 버튼 자신은 조회하지 않음)으로 좌·우 버튼도 정리한다.** 신설: `MouseButtonState`
    (좌·우 `bool` 2개 — `KeyTable`과 같은 성격의 순수 구조체, 기록 없음)·`recover_missed_mouse_releases`.
    `async_key_down`(기존 U11)을 마우스 버튼 가상 키(`VK_LBUTTON`·`VK_RBUTTON`)에도 그대로
    재사용한다(새 unsafe 없음). `mouse_event`가 버튼 메시지마다 `MouseButtonState`를 갱신한다.
    콜백 두 곳(`keyboard_proc`은 `except=None`으로 둘 다, `mouse_proc`은 지금 누른 버튼만
    `except`)에서 정리 이벤트를 트리거 자신의 이벤트보다 먼저 보낸다(L5와 같은 순서 원칙).
    `reset_keys`(→ `start`·`stop`)가 `MOUSE_BUTTONS`도 함께 비운다. **공개
    API·`InputEvent`·`MouseButton` 모양 불변**, 새 unsafe·스레드·설정 없음. 상세는 §3.7.10.
    이 항목은 core-implementer가 CR-046 승인 범위("같은 원리로 보강") 안에서 직접 작성했다 —
    §3.7 본문과 달리 core-designer·사용자의 별도 확인을 아직 거치지 않았으니 재확인 필요.
  - 2026-09-26 (7.5차, CR-046 보강, 사용자 승인 2026-09-26) **트레이 「새로고침」 메뉴** —
    `tray.md` §2에 항목 추가, 눌린 키 표·마우스 버튼 상태를 비우는 `pub(crate) fn refresh()`를
    hook에 신설(내부는 `reset_keys("refresh")` 재사용, 새 정적 상태 없음). 상세는 `tray.md`.
  - 2026-09-26 (7차, CR-046, 🔒 확정사항 §6 「키 뗌 유실 복구」 — 사용자 신고) **키 뗌 유실 복구 신설 — D2·D18의 「한계로 수용」 결정을 대체한다.** 방식 = **누름 계열 입력(키보드 누름 메시지·마우스 좌/우 버튼 누름)이 들어올 때, 표에서 `Down`인 다른 칸만(보통 0~2개) `GetAsyncKeyState`로 대조해 실제로 떼진 칸을 `Up`으로 돌리고, 정리한 칸마다 뗌 이벤트를 그 입력의 이벤트보다 먼저 보낸다.** 후보 (a)~(d) 비교 후 (a)를 채택하고 트리거에 마우스 버튼 누름을 더했다(§3.7.2). 비공개 추가: `KeyTable::release_stale`(조회 함수 주입 — 순수 로직), `recover_missed_releases`, `async_key_down`(unsafe **U11** 1개), `mouse_button_down`. **공개 API·`InputEvent` 모양·계약 페이로드 불변**, `apply`·`keyboard_event`·`classify` 불변(T1~T17·C1~C10 그대로, T7 전제와 정합). 새 정적 상태·스레드·로그 없음. 이번 변경의 §2·§3·§4·§5·§6·§8·§9·§10·§11 증분은 **§3.7에 모았다**(§1·§3 파일 표·§4 그림·§5 U11·§10·§11 D2·D18은 제자리 갱신). 요구ID는 overlay 요구 문서에 아직 없어 임시 **`R-tmp-2`**(확인 필요 9). 근거 분석: `.claude/reports/error-overlay-20260926-1720.md`. core-implementer 반론(콜백 최소 작업·T7 정합)은 §3.7.2 「반론 반영」에 답했다. **소스 반영 완료(8차 항목 참조).**
  - 2026-09-24 (6차, R-set-v2 SV2-05, 🔒 사용자 결정 D-4 A안·확정사항 §6) **UAC 승격 실행 안전 래퍼 `hook/elevate.rs` 신설** — `pub fn run_elevated(program: &Path, args: &str) -> Result<u32, ElevateError>`(`ShellExecuteExW` "runas" + `SW_HIDE` → `WaitForSingleObject` → `GetExitCodeProcess` → `CloseHandle`, 취소 = `ERROR_CANCELLED` → `ElevateError::Cancelled`). 훅 콜백·훅 스레드·메시지 루프·`KeyTable`과 **무관** — hook 모듈이 앱의 유일한 unsafe 구역이라 여기 둔다(golden-principles §6). 호출자 = [tray.md](tray.md) `autostart`. `windows` 기능 `Win32_UI_Shell`·`Win32_System_Registry`(`SHELLEXECUTEINFOW`가 `hkeyClass: HKEY` 필드 때문에 이 기능을 요구 — windows 0.58 `UI/Shell/mod.rs:36195`) 사용, 새 크레이트 없음. 이번 변경의 §1·§2·§3·§4·§5·§6·§8·§10·§11 증분은 **§3.6에 모아 적었다**(§5 unsafe 표 U1~U10은 훅 전용 그대로, 승격 래퍼는 §3.6.3 E1~E4). 사용자 결정 완료로 바로 확정. **소스 미적용.**
  - 2026-09-24 (4차, CR-023 보강, 🔒 사용자 결정 — 확정사항 §4 3행 「키 꾹 누름 = 부르르」) **자동 반복 누름도 이벤트로 내보낸다.** `InputEvent::Keyboard`에 **`repeat: bool`** 추가(🔒 필드 순서 `{ pressed, held, special, repeat, ts }`). 반복 이벤트 = `pressed: true, repeat: true`, `held` 불변, `special`은 그 키를 처음 누를 때 정한 값(재판정 없음). **스로틀 없음**(§3.5 A5, §11 D14). 비공개 `KeyTable::apply` 반환 `Option<KeyChange>` → **`KeyChange`**(항상 이벤트). unsafe·Win32 호출·정적 상태 추가 없음. §1·§1.1·§2·§3.2·§3.4·§3.5(신설)·§4·§5·§8·§9.2(신설)·§10·§11 갱신. 코드 동기화 델타: §2·§3 파일 구성을 실제(`mod.rs` 456줄 + `tests.rs` 401줄)에 맞춤, §10 CR-021 행 상태를 「소스 반영(코드 대조)」으로 갱신.
  - 2026-09-24 (5차, 🔒 사용자 결정 — core-implementer 반영) **수식 키(Shift·Ctrl·Alt·Win, 좌우 모두) 자신의 자동 반복은 이벤트를 내지 않는다**(A8 신설). `KeyTable::apply`가 `is_modifier_vk(vk)`이면 반복 칸에서 `None`을 돌려준다(칸은 그대로, 개수·상태 불변). §3.5 A6·§9.2 RB3·§8.1 T17·§8.3 R5·확인 필요 7을 이 규칙에 맞춰 정정(이전 4차 문서에는 "수식 키도 repeat: true"로 잘못 적혀 있었다). 계약 v0.12(§3.7.1)와 일치. **소스 반영 완료**(`cargo fmt --check`·`cargo clippy --all-targets -D warnings`·`cargo test` 163건 PASS).
  - 2026-09-24 (3차, 🔒 메인 세션 결정 — 계약 `contract.md` v0.11 §3.7 확정값) **`Undo`는 Shift 없는 Ctrl+Z만. Ctrl+Shift+Z는 `None`.** §3.1 J10·코드, §8.1 C6(전수 11개)·C8·C9·T12, §8.3 M10·M11, §9 B4, §11 D11 갱신, 확인 필요 4 해소.
  - 2026-09-24 (2차, CR-021 보강, 🔒 사용자 결정) **Ctrl 추적 + 되돌리기(`Undo`) 분류.** 좌·우 Ctrl(`VK_LCONTROL`·`VK_RCONTROL`)을 Shift처럼 콜백의 `KeyTable`에서 추적한다. Ctrl이 눌려 있으면 특수 키 분류를 하지 않되(`None`), **Ctrl + Z(0x5A)만 새 분류값 `SpecialKey::Undo`(JSON `"undo"`)**. `classify` 시그니처 `(vk, shift_down)` → **`(vk, shift_down, ctrl_down)`**. Alt·Win은 보지 않는다(범위 밖). 분류값 6 → **7개**. §1·§1.1·§2·§3.1·§3.2·§3.4·§8·§9·§10·§11 갱신(1차 확인 필요 1 해소). 짝 슬롯 `SimpleSlot::KeyUndo`([assets.md](assets.md) §3.7).
  - 2026-09-24 (1차, 신규 문서, CR-021, 🔒 사용자 결정 — 확정사항 §5 「특수 키 이미지」) 기존 구현(`src-tauri/src/hook/mod.rs` 390줄)을 문서로 옮기고, **특수 키 6종 분류(`SpecialKey`)**를 설계한다. 키보드 이벤트에 `special: Option<SpecialKey>`를 싣는다 — 누름은 누른 순간의 분류값, **뗌은 그 키를 누를 때 정한 분류값 그대로**. 눌린 키 표를 `KeyTable`(칸마다 `Up | Down(분류)`)로 바꾸고, 좌·우 Shift를 이 표에서 판정한다. 개인정보 규칙(§1.1) 신설.
- 요구ID 표기: `OV-R-xx` = `src/overlay/requirements.md`(v1.8 기준). `CR-021` = 특수 키 이미지 변경 요청. 키보드 누름·뗌 자체(OV-R-07)는 기존 요구. **Ctrl·Undo 규칙(2차)은 사용자 결정 🔒 2026-09-24 — overlay 요구 문서 R-22 문구 반영은 ui-designer 소관(§11 확인 필요 1).** **`R-tmp-1` = CR-023 키 꾹 누름 부르르(🔒 확정사항 §4 3행) — overlay 요구 문서에 아직 요구ID가 없다(확인 필요 6).**
- 상대 문서: [assets.md](assets.md)(특수 키 슬롯 7개 — §3.7) · 계약 `doc/200_설계/bridge/contract.md` §3.7·§4 `input://keyboard` · 수동 체크리스트 원본 `src-tauri/tests/README.md`(이 문서 §8.3으로 대체)

## 1. 목적

결론: hook은 전역 키보드·마우스 입력을 받아 **누름·뗌·동시 키 수·마우스 좌표·좌우 클릭**을 채널로 내보낸다. CR-021로 여기에 **"이 키가 특수 키 분류 7개(스페이스·ㅋ·?·!·Enter·Backspace·Ctrl+Z 되돌리기) 중 무엇인가"(분류값 하나)**가 더해지고, CR-023으로 **"이 누름이 이미 눌린 키의 자동 반복인가"(`repeat` 한 비트)**가 더해진다. 그 밖의 키는 여전히 무슨 키인지 밖으로 나가지 않는다.

비유: 훅은 우체국 앞에서 모든 편지를 먼저 보는 검사원이다. 지금까지는 "편지가 왔다/나갔다"만 적어 보냈다. 이제는 봉투 겉면에 정해진 도장 일곱 가지 중 하나가 찍혀 있으면 그 도장 이름만 함께 보내고, 편지 내용(어떤 글자인지)은 절대 옮겨 적지 않는다. "빨간 Ctrl 띠"가 둘러진 봉투는 도장을 보지 않고 넘기되, 그 띠 안에 Z 도장이 있을 때만 "되돌리기"라고 적는다. 같은 손님이 창구 앞에 서서 초인종을 계속 누르면(자동 반복) 이전에는 무시했지만, 이제는 "아까 그 손님이 또 눌렀다"(`repeat`)고만 적어 보낸다 — 손님 이름은 여전히 적지 않는다. 편지는 반드시 다음 사람에게 넘긴다(`CallNextHookEx`).

| 요구ID | 내용 | 이 모듈의 몫 |
|---|---|---|
| OV-R-07 | 키 누르면 누름, 떼면 들림. 감지는 누름·뗌 + 동시에 눌린 키 수(어떤 키인지 모름) | `InputEvent::Keyboard { pressed, held, .. }`. **자동 반복은 CR-023부터 `repeat: true`로 구분해 내보낸다**(첫 누름·뗌의 의미는 불변) |
| **OV-R-22 (CR-021, 🔒 2026-09-24)** | 6종(스페이스 / ㅋ·z·Z = 물리 키 Z / ?(Shift+`/`) / !(Shift+`1`) / Enter / Backspace)을 누르고 있는 동안 전용 그림, 떼면 기본. 훅은 분류값만 밖으로, 그 밖의 키는 알 수 없음. 입력 내용 기록 금지 | `SpecialKey`, `classify`, `special` 필드(누름·뗌 대칭), §1.1 개인정보 규칙 |
| **OV-R-22 보강 (🔒 2026-09-24, 2·3차)** | 좌·우 Ctrl이 눌려 있으면 특수 키 분류 안 함. 단 **Shift 없는** Ctrl + Z는 되돌리기(`Undo`) 분류(Ctrl+Shift+Z는 분류 안 함). Alt·Win은 보지 않음 | `classify(.., ctrl_down)`, `SpecialKey::Undo`, `KeyTable::ctrl_down` |
| **R-tmp-1 (CR-023, 🔒 2026-09-24, 확정사항 §4 3행)** | 어떤 키든 누른 채 OS 자동 반복 입력이 들어오는 동안 오버레이가 계속 부르르 떨리고, 떼면(또는 반복이 멈추면) 멈춘다. 처음 누름은 기존 젤리 | 자동 반복 누름을 **`repeat: true`** 이벤트로 내보냄(§3.5). 떨림 표시·"반복 멈춤" 판단은 ui 몫(§9.2 RB4) |
| **R-tmp-2 (CR-046, 🔒 2026-09-26, 확정사항 §6 「키 뗌 유실 복구」)** | 뗌 신호를 놓친 키(한/영·한자 키, 보안 데스크톱 전환, 관리자 창 포커스 등)도 결국 「눌림 없음」으로 복구. 입력 내용은 기록하지 않음. D2·D18의 한계 수용을 대체 | 누름 계열 입력 직전 남은 `Down` 칸 대조·정리 + 칸마다 뗌 이벤트(§3.7). 이벤트 모양 불변 |
| OV-R-04·OV-R-20 등(마우스 추종) | 마우스 이동·좌우 클릭 | `MouseMove`(≈60Hz 스로틀), `MouseButton`(기존, CR-021·CR-023 영향 없음. **CR-046: 버튼 누름이 뗌 유실 정리를 부른다 — 마우스 이벤트 자체는 불변**) |

### 1.1 개인정보 규칙 — 입력 내용 기록 금지 (🔒 확정사항 §5, CR-021 · CR-023 유지)

결론: **가상 키 코드(`vkCode`)·스캔 코드·문자는 hook 모듈 밖으로 나가지 않고, 어디에도 남지 않는다.** 밖으로 나가는 키보드 정보는 `pressed`·`held`(개수)·`special`(분류값 7개 중 하나 또는 없음)·**`repeat`(자동 반복 여부 한 비트)**·`ts`뿐이다.

| # | 규칙 | 검사 방법 |
|---|---|---|
| P1 | `InputEvent`·`SpecialKey`에 키 코드·스캔 코드·문자 필드를 두지 않는다. `special`은 7개 분류값 외 값을 가질 수 없다(enum). Ctrl·Shift 눌림 여부도 따로 내보내지 않는다(분류에만 쓰임). **`repeat`는 `bool` 하나 — 어떤 키가 반복되는지는 담지 않는다(CR-023)** | 코드 리뷰(§2 시그니처와 대조) |
| P2 | hook 모듈에 **로그 호출이 하나도 없다**(`log::`·`println!`·`eprintln!`·`dbg!` 0건). 콜백 밖 함수(`start`·`stop`)도 같다 — 키 정보가 로그로 샐 경로 자체를 두지 않는다 | Grep `log::\|println!\|eprintln!\|dbg!` in `src-tauri/src/hook/` = 0 |
| P3 | **기록(이력) 금지**: 키별 누름 횟수·순서·시각·마지막 누른 키 등 시간에 따라 쌓이는 값을 두지 않는다. 허용되는 상태는 `KeyTable` 하나뿐 — **지금 눌려 있는지 + 누를 때 정한 분류값**, 키를 떼면 그 칸은 `Up`으로 돌아가 아무것도 남지 않는다. **CR-023은 정적 상태를 늘리지 않는다** — 반복 판정은 기존 칸(`Down`)만 보고, 반복 횟수·마지막 반복 시각·키별 스로틀 시각을 두지 않는다(§11 D14) | 코드 리뷰: 정적 상태 목록(§3.2)과 대조 |
| P4 | 훅이 멈추면(`stop`·Drop) 표를 비운다. 훅이 시작될 때(`start`)도 비운다 — 이전 실행의 눌림 상태가 남지 않는다 | 단위 테스트 T9(`clear`) + 코드 리뷰 |
| P5 | 파일·레지스트리·클립보드 쓰기 없음(hook은 IO를 하지 않는다 — 스킬 §1) | Grep `std::fs\|File` in hook = 0 |
| P6 | `InputEvent`의 `Debug` 출력은 테스트 단언용이다. **bridge 전달 스레드·`emit_input`·ui는 키보드 이벤트나 그 페이로드를 로그·콘솔·파일로 남기지 않는다**(§9 요구 명세 B5·RB7). 반복 이벤트도 같다 | bridge·ui 리뷰 |

- 비유: 검사원 책상에는 "지금 창구에 서 있는 손님" 명단만 있다. 손님이 나가면 이름을 지운다. 누가 몇 번 왔는지 적는 장부는 없다. 초인종을 계속 누르는 손님이 있어도 "또 눌렀다"만 알리고, 몇 번 눌렀는지는 세지 않는다.
- `KeyTable`의 칸 256개는 키보드의 "지금 눌림" 불빛과 같다. 불빛을 모아도 입력한 글자 순서는 되살릴 수 없다(순서·시간 정보가 없음). 기존 `HELD: [bool; 256]`과 같은 성격이며 칸마다 분류값 1바이트만 늘어난다. Ctrl 칸도 다른 키 칸과 똑같은 불빛 하나다.
- `repeat`가 새로 드러내는 정보는 "무언가를 OS 반복 지연(기본 약 0.5초)보다 오래 누르고 있다"뿐이다. 누른 시간 자체는 기존 누름·뗌의 `ts`로도 알 수 있던 정보라 새 노출이 아니다.

## 2. 공개 API

`mod.rs`가 모듈 본체다. 단위 테스트는 자식 파일 `tests.rs`(`#[cfg(test)] mod tests;`, 800줄 한계로 분리)에 있다. 변경은 **굵게**.

| 이름 | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `pub fn start(tx: Sender<InputEvent>) -> Result<HookHandle, HookError>` | 이벤트 송신자 | 훅 핸들(두 훅 설치 완료 후 반환) | `Thread`(스레드 생성), `Install { which }`(훅 설치), `Ready`(준비 신호 없음). 시작 전에 `KeyTable`을 비운다(P4) | OV-R-07 |
| `pub fn stop(self)` (`impl HookHandle`) | — | () | 없음(실패는 무시 — 이미 끝난 스레드). 스레드 join 뒤 `KeyTable`을 비운다(P4). Drop도 같은 경로 | OV-R-07 |
| `pub enum InputEvent` | — | — | — | OV-R-07, OV-R-22, **R-tmp-1(`Keyboard.repeat`)** |
| `pub enum MouseButton { Left, Right }` | — | — | — | 마우스(기존) |
| `pub enum HookError` | — | — | §6 | — |
| `pub const MOUSE_MOVE_MIN_INTERVAL_MS: u64 = 16` | — | — | — | 마우스(기존) |
| `pub enum SpecialKey` | — | — | — | OV-R-22 |
| **`pub(crate) fn refresh()`** | — | () | 없음(내부는 `reset_keys("refresh")`) | CR-046 보강(§3.7.10) — 트레이 「새로고침」 전용, crate 밖에서는 호출할 수 없다 |

- CR-023은 공개 함수(`start`·`stop`) 시그니처를 바꾸지 않는다. 바뀌는 공개 항목은 `InputEvent::Keyboard`의 필드 하나뿐이다. CR-046도 `start`·`stop`·`InputEvent`·`MouseButton` 시그니처를 바꾸지 않는다 — 늘어난 것은 crate 내부 전용 `refresh()` 하나뿐이다.

```rust
/// 특수 키 분류(CR-021). 그 밖의 키는 분류값이 없다(`Option::None` = 알 수 없음).
/// 직렬화: "space" | "z" | "question" | "exclamation" | "enter" | "backspace" | "undo" (🔒 이름 고정)
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SpecialKey {
    Space,
    Z,
    Question,
    Exclamation,
    Enter,
    Backspace,
    /// Ctrl + Z (되돌리기, 🔒 2026-09-24 2차).
    Undo,
}

/// 훅이 내보내는 이벤트. bridge::events 가 contract 페이로드로 바꾼다.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InputEvent {
    Keyboard {
        pressed: bool,
        /// 이 이벤트 직후 동시에 눌려 있는 키 수. 어떤 키인지는 모듈 밖으로 나가지 않는다.
        held: u32,
        /// 특수 키 분류(CR-021). 누름 = 누른 순간 판정, 뗌·자동 반복 = 그 키를 누를 때 판정한 값.
        /// 그 밖의 키·누름을 보지 못한 뗌은 None. 키 코드는 모듈 밖으로 나가지 않는다.
        special: Option<SpecialKey>,
        /// 이미 눌린 키의 재누름(OS 자동 반복)이면 true(CR-023). 이때 pressed = true,
        /// held 는 늘지 않고, special 은 그 키를 처음 누를 때 정한 값이다. 첫 누름·뗌은 false.
        repeat: bool,
        ts: u64,
    },
    MouseMove { x: i32, y: i32, ts: u64 },
    MouseButton { button: MouseButton, pressed: bool, ts: u64 },
}
```

- 🔒 필드 이름·순서: `Keyboard { pressed, held, special, repeat, ts }`(사용자 결정 2026-09-24).
- 불변식(CR-023): `repeat == true` ⇒ `pressed == true`. `repeat: true`인 뗌은 존재하지 않는다.
- `SpecialKey`는 `Serialize`만 derive한다(bridge 페이로드 `special: Option<SpecialKey>`가 그대로 `"space"`…`"undo"`·`null`로 직렬화되도록). `Deserialize`·`Hash`·`Default`는 요구가 없어 두지 않는다.
- `classify`는 **비공개**다(§3.1). 호출자는 hook 안뿐이다.

## 3. 내부 구조

| 파일 | 책임 | 변경 |
|---|---|---|
| `src-tauri/src/hook/mod.rs` (현재 456줄 → CR-023 적용 후 약 465줄) | 훅 설치·메시지 루프·콜백·이벤트 변환·스로틀·눌린 키 표·특수 키 분류·**자동 반복 구분** | CR-023: `InputEvent::Keyboard.repeat`, `KeyChange.repeat`, `KeyTable::apply` 본문·반환 타입, `keyboard_event`, `//!` 갱신(§3.4) |
| `src-tauri/src/hook/tests.rs` (현재 401줄 → 약 470줄) | 단위 테스트(`classify` C1~C10, `KeyTable` T1~T17, `keyboard_event` W1, 마우스 2건) | CR-023: `apply(..)` 호출의 `.expect(..)` 제거(반환이 `Option` 아님), T5·T6·T9·T10·T14·W1 기대값 갱신, T15~T17 추가(§8.1) |
| (CR-046 소스 반영, 2026-09-26 실측) `mod.rs` 498줄 → **696줄** · `tests.rs` 515줄 → **772줄** | 뗌 유실 정리(`KeyTable::release_stale`·`recover_missed_releases`·`async_key_down`·`mouse_button_down`) + 마우스 보강(`MouseButtonState`·`recover_missed_mouse_releases`, §3.7.10), 콜백 두 곳의 호출, `refresh()` | §3.7.4·§3.7.10 코드 반영. 테스트 S1~S7·MB1~MB4·W1 ⑤~⑦ 추가(§3.7.7·§3.7.10). 둘 다 800줄 한계 안(`tests.rs`는 772줄로 여유가 적다 — 다음 증분은 분리 검토) |

### 3.1 특수 키 분류 — `classify` (🔒 판정 규칙, CR-023 변경 없음)

```rust
use windows::Win32::UI::Input::KeyboardAndMouse::{
    VK_1, VK_BACK, VK_LCONTROL, VK_LSHIFT, VK_OEM_2, VK_RCONTROL, VK_RETURN, VK_RSHIFT, VK_SPACE,
    VK_Z,
};

// windows 크레이트의 VIRTUAL_KEY(u16) 상수를 match 패턴용 정수로 옮긴다(값을 새로 정의하지 않음).
const K_SPACE: u32 = VK_SPACE.0 as u32;
const K_Z: u32 = VK_Z.0 as u32;
const K_SLASH: u32 = VK_OEM_2.0 as u32; // 메인 키 `/?` — 키패드 `/`(VK_DIVIDE)와 다른 코드
const K_1: u32 = VK_1.0 as u32; // 메인 숫자 `1!` — 키패드 1(VK_NUMPAD1)과 다른 코드
const K_RETURN: u32 = VK_RETURN.0 as u32; // 메인 Enter·숫자패드 Enter 공통
const K_BACK: u32 = VK_BACK.0 as u32;
const K_LSHIFT: usize = VK_LSHIFT.0 as usize;
const K_RSHIFT: usize = VK_RSHIFT.0 as usize;
const K_LCONTROL: usize = VK_LCONTROL.0 as usize;
const K_RCONTROL: usize = VK_RCONTROL.0 as usize;

/// 가상 키 + 누른 순간의 Shift·Ctrl 상태 → 특수 키 분류. 그 밖의 키는 None(알 수 없음).
/// Ctrl 이 눌려 있으면 Shift 없는 Z(되돌리기)만 분류하고 나머지(Ctrl+Shift+Z 포함)는 None.
/// 물리 키(가상 키 코드) 기준 — 한/영 IME·Caps Lock·Alt·Win 상태는 보지 않는다.
fn classify(vk: u32, shift_down: bool, ctrl_down: bool) -> Option<SpecialKey> {
    if ctrl_down {
        return (vk == K_Z && !shift_down).then_some(SpecialKey::Undo);
    }
    match vk {
        K_SPACE => Some(SpecialKey::Space),
        K_Z => Some(SpecialKey::Z),
        K_RETURN => Some(SpecialKey::Enter),
        K_BACK => Some(SpecialKey::Backspace),
        K_SLASH if shift_down => Some(SpecialKey::Question),
        K_1 if shift_down => Some(SpecialKey::Exclamation),
        _ => None,
    }
}
```

| # | 규칙 (🔒 사용자 확인 2026-09-24) | 설계 |
|---|---|---|
| J1 | Shift = **좌·우 Shift 중 하나라도 눌려 있음**. 저수준 훅은 Shift를 `VK_SHIFT`(0x10)가 아니라 `VK_LSHIFT`(0xA0)·`VK_RSHIFT`(0xA1)로 준다 | 콜백이 `KeyTable`에 두 키의 누름·뗌을 다른 키와 똑같이 기록하고, `shift_down() = keys[0xA0] 눌림 \|\| keys[0xA1] 눌림`. `GetKeyState`·`GetAsyncKeyState` 호출 없음(§11 D2) |
| J2 | `?` = 메인 키 `VK_OEM_2`(0xBF) + Shift만. 키패드 `/`(`VK_DIVIDE` 0x6F)는 Shift 여부와 무관하게 제외. `/` 단독은 일반 키 | `K_SLASH if shift_down`. `VK_DIVIDE`는 `_ => None` |
| J3 | `!` = 메인 숫자 `1`(0x31) + Shift만. 키패드 1(`VK_NUMPAD1` 0x61, NumLock 꺼짐이면 `VK_END`)은 제외. `1` 단독은 일반 키 | `K_1 if shift_down` |
| J4 | 판정은 **그 키가 눌리는 순간**의 Shift·Ctrl 상태로 한 번만. 누른 뒤 Shift·Ctrl을 누르거나 떼도 다시 판정하지 않는다 | `KeyTable::apply`가 첫 누름에서만 `classify`를 부르고 결과를 그 칸에 둔다. **자동 반복 누름은 CR-023부터 이벤트를 내지만 칸의 값을 그대로 싣는다(재판정 없음, §3.5 A2)** |
| J5 | 한/영 IME 상태·Caps Lock과 무관(물리 키 기준). ㅋ·z·Z는 모두 `Z`(Ctrl이 없을 때) | `classify`는 IME·Caps 상태를 입력으로 받지 않는다. 저수준 훅은 IME가 가공하기 전(`VK_PROCESSKEY`로 바뀌기 전)의 가상 키를 받는다 — §8.3 M2로 실측 확인 |
| J6 | Ctrl이 없을 때 스페이스·Z·Enter·Backspace는 Shift와 무관(Shift+Z = 대문자 Z도 `Z`, Shift+Enter도 `Enter`) | 가드 없는 팔 |
| J7 | 숫자패드 Enter도 `Enter` | 숫자패드 Enter는 가상 키가 `VK_RETURN`(확장 플래그만 다름)이라 그대로 포함. 플래그 인자를 늘리지 않는다(§11 D4) |
| J8 | 기준 배열 = **한국어·영어(미국) 표준 배열**. 다른 배열(JIS·독일 QWERTZ·프랑스 AZERTY 등)은 **범위 밖** — 그 배열에서 `?`·`!`·Z 위치가 달라도 대응하지 않는다. AltGr(= 왼쪽 Ctrl + 오른쪽 Alt로 들어옴)가 있는 배열도 범위 밖 | 가상 키 코드는 배열이 정한다. 예: QWERTZ에서는 `VK_Z`가 다른 물리 위치에 있다 — 결과가 맞든 틀리든 보장하지 않는다(§11 D5) |
| J9 | **Ctrl = 좌·우 Ctrl 중 하나라도 눌려 있음**(`VK_LCONTROL` 0xA2·`VK_RCONTROL` 0xA3 — 저수준 훅은 `VK_CONTROL` 0x11이 아니라 좌우로 준다). **Ctrl이 눌려 있으면 특수 키 분류를 하지 않는다(`None`)** — Ctrl+Space·Ctrl+Enter·Ctrl+Backspace·Ctrl+Shift+`/`·Ctrl+Shift+`1`은 모두 일반 키 | `ctrl_down() = keys[0xA2] 눌림 \|\| keys[0xA3] 눌림`(J1과 같은 방식, Win32 호출 없음). `classify` 첫 줄에서 Ctrl 분기 |
| J10 | **Shift 없는 Ctrl + Z(0x5A) = `Undo`**(되돌리기). **Ctrl+Shift+Z는 `None`**(🔒 3차, 계약 v0.11 §3.7). IME·Caps 무관 | `if ctrl_down { return (vk == K_Z && !shift_down).then_some(SpecialKey::Undo) }` |
| J11 | **Alt·Win은 보지 않는다(범위 밖 — 사용자 미언급).** Alt+Z는 `Z`, Win+Enter는 `Enter`, Alt+Shift+`1`은 `Exclamation` 그대로 | `classify`에 Alt·Win 입력 없음. 좌우 Alt(`VK_LMENU`·`VK_RMENU`)·Win 키 자체는 일반 키(분류 `None`) |

- Ctrl·Shift 키 자체의 누름은 일반 키다(`classify(0xA0..=0xA3, ..) = None`) — 기존처럼 누름 그림을 띄우고 `held`를 센다.

### 3.2 정적 상태 (콜백은 전역 함수라 상태를 전역에 둔다)

| 이름 | 타입 | 쓰는 곳 | 변경 |
|---|---|---|---|
| `SENDER` | `OnceLock<Mutex<Option<Sender<InputEvent>>>>` | `start` 채움, `shutdown` 비움, 콜백 `send` | 없음 |
| `LAST_MOVE_MS` | `AtomicU64` | 마우스 이동 스로틀 | 없음 |
| `KEYS` | `Mutex<KeyTable>` | 콜백(`keyboard_event`), `start`·`shutdown`(비우기) | 없음(CR-023은 새 정적 상태를 두지 않는다 — P3) |

```rust
/// 눌린 키 표의 한 칸. 떼면 Up 으로 돌아가 아무것도 남지 않는다(§1.1 P3).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum KeyState {
    Up,
    /// 눌림 + 누른 순간 정한 특수 키 분류(없으면 None).
    Down(Option<SpecialKey>),
}

/// 현재 눌려 있는 키 표(vkCode 0..255). 키 식별자는 이 모듈 안에서만 쓰고,
/// 밖으로는 개수·분류값·반복 여부만 나간다(확정사항 §5).
struct KeyTable {
    keys: [KeyState; 256],
}

/// 표 갱신 결과 — 이벤트에 실을 값.
#[derive(Debug, PartialEq, Eq)]
struct KeyChange {
    held: u32,
    special: Option<SpecialKey>,
    /// 이미 눌린 키의 재누름(OS 자동 반복)이면 true(CR-023).
    repeat: bool,
}

impl KeyTable {
    const fn new() -> Self {
        Self { keys: [KeyState::Up; 256] }
    }

    /// 누름·뗌을 표에 반영한다. 모든 누름·뗌이 이벤트가 된다 —
    /// 이미 눌린 키의 재누름(자동 반복)은 repeat = true, 칸은 그대로(CR-023).
    fn apply(&mut self, vk: u32, pressed: bool) -> KeyChange {
        let idx = (vk & 0xFF) as usize;
        let (special, repeat) = match (pressed, self.keys[idx]) {
            (true, KeyState::Down(s)) => (s, true), // 자동 반복 — 칸 값 그대로, 재판정 없음(J4·A2)
            (true, KeyState::Up) => (classify(vk, self.shift_down(), self.ctrl_down()), false), // 첫 누름에서만
            (false, KeyState::Down(s)) => (s, false), // 뗌 = 누를 때 판정값 그대로
            (false, KeyState::Up) => (None, false),   // 누름을 못 본 뗌
        };
        // 자동 반복이면 Down(s) 를 같은 값으로 다시 쓰는 셈이라 표는 바뀌지 않는다(held 불변, A3).
        self.keys[idx] = if pressed { KeyState::Down(special) } else { KeyState::Up };
        KeyChange { held: self.held_count(), special, repeat }
    }

    fn is_down(&self, idx: usize) -> bool {
        self.keys[idx] != KeyState::Up
    }

    fn shift_down(&self) -> bool {
        self.is_down(K_LSHIFT) || self.is_down(K_RSHIFT)
    }

    fn ctrl_down(&self) -> bool {
        self.is_down(K_LCONTROL) || self.is_down(K_RCONTROL)
    }

    fn held_count(&self) -> u32 {
        self.keys.iter().filter(|k| **k != KeyState::Up).count() as u32
    }

    fn clear(&mut self) {
        self.keys = [KeyState::Up; 256];
    }
}

static KEYS: Mutex<KeyTable> = Mutex::new(KeyTable::new());

/// 키보드 메시지 + vkCode → 이벤트. 키보드 메시지가 아니면 None.
fn keyboard_event(msg: u32, vk: u32, ts: u64) -> Option<InputEvent> {
    let pressed = keyboard_pressed(msg)?;
    let change = KEYS.lock().unwrap_or_else(PoisonError::into_inner).apply(vk, pressed);
    Some(InputEvent::Keyboard {
        pressed,
        held: change.held,
        special: change.special,
        repeat: change.repeat,
        ts,
    })
}

/// 표 비우기(§1.1 P4). 훅 스레드가 없을 때만 부른다 — 콜백과 잠금을 다투지 않는다.
fn reset_keys() {
    KEYS.lock().unwrap_or_else(PoisonError::into_inner).clear();
}
```

- `apply` 반환이 `Option<KeyChange>` → **`KeyChange`**로 바뀐다(CR-023). 이제 `None`(이벤트 없음)이 되는 경로가 없다(§11 D15). `keyboard_event`의 `None`은 "키보드 메시지 아님"뿐이다.
- `start`: `SENDER`를 채우기 **전에** `reset_keys()`. `shutdown`: `join` **뒤에** `reset_keys()`. 두 시점 모두 훅 스레드가 없으므로 콜백과 잠금이 겹치지 않는다(§4).
- 잠금 오염(`PoisonError`)은 안에 든 표를 그대로 꺼내 쓴다(§11 D6). 표에는 깨질 불변식이 없다(칸 하나 대입).
- 동작 보존(CR-023 전후 같음): 첫 누름·뗌 이벤트의 `pressed`·`held`·`special`, 누름을 못 본 뗌도 이벤트를 냄(`held`는 줄지 않음), `held`는 이벤트 직후 눌린 키 수. **바뀌는 것은 하나 — 자동 반복 누름이 이벤트 없음 → `repeat: true` 이벤트.** 기존 이벤트에는 `repeat: false`가 붙는다.

### 3.3 콜백 (본문 불변)

```rust
unsafe extern "system" fn keyboard_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        // SAFETY: (기존 문구 유지)
        let info: &KBDLLHOOKSTRUCT = unsafe { &*(lparam.0 as *const KBDLLHOOKSTRUCT) };
        // vkCode 는 눌린 키 표 갱신과 특수 키 분류에만 쓴다. 표 밖에 저장하지 않고,
        // 전달·로그하지 않는다(확정사항 §5, 설계 §1.1). 밖으로는 개수·분류값·반복 여부만 나간다.
        if let Some(ev) = keyboard_event(wparam.0 as u32, info.vkCode, now_ms()) {
            send(ev);
        }
    }
    // SAFETY: (기존 문구 유지)
    unsafe { CallNextHookEx(HHOOK::default(), code, wparam, lparam) }
}
```

- 콜백 작업량(CR-023): 자동 반복 누름 1건당 기존 "잠금 + `match` + 반환" 대신 "잠금 + `match` + 칸 대입 + 256칸 개수 세기 + `send`"를 한다 — 첫 누름·뗌 경로와 **같은 양**이다. Win32 호출·잠금 대기·IO 추가 없음(스킬 §3-3 유지). 일반 주석 한 줄("개수·분류값·반복 여부")만 바뀐다.

### 3.4 `//!` 문서주석 갱신 (스킬 §11)

- [목적] (CR-021 문구 유지) + "누른 채 OS 자동 반복이 들어오면 `repeat: true` 누름 이벤트를 낸다(CR-023). 반복 누름은 표·분류를 바꾸지 않는다."
- [공개 API] 불변(`InputEvent`에 필드만 추가).
- [개인정보] "밖으로는 개수·분류값·**반복 여부**만 나간다. 반복 횟수·시각은 세지 않는다."
- [설정] "키보드 자동 반복은 스로틀하지 않는다 — 빈도는 OS 반복 속도(최대 약 30Hz)가 정한다(hook.md §3.5 A5)."
- [테스트] "눌린 키 표(`KeyTable` **T1~T17**)" — 자동 반복 T5·T6·T14~T17.

### 3.5 자동 반복 (CR-023, 🔒 사용자 결정 2026-09-24)

비유: 초인종을 누른 채로 있으면 벨이 "딩-딩-딩" 계속 울린다(OS 자동 반복). 검사원은 첫 "딩"은 "손님 왔다"로, 이어지는 "딩"은 "같은 손님이 아직 누르고 있다"로 구분해 적는다. 손님을 새로 세지는 않는다.

| # | 규칙 | 설계 |
|---|---|---|
| A1 | **반복 판정 = 표에서 이미 `Down`인 칸의 누름 메시지**(`WM_KEYDOWN`·`WM_SYSKEYDOWN`) | `apply`의 `(true, KeyState::Down(s))` 팔. 저수준 훅 구조체(`KBDLLHOOKSTRUCT.flags`)에는 반복 표시 비트가 없다(일반 `WM_KEYDOWN` lParam의 30번 비트 "이전 상태"에 해당하는 값이 없음) → 표가 유일한 근거. Win32 호출 추가 없음 |
| A2 | 반복 이벤트 = `pressed: true, repeat: true`, **`special`은 그 칸에 둔 값**(누를 때 판정값). Shift·Ctrl을 그사이에 누르거나 떼도 재판정하지 않는다 | J4와 같은 원칙. 반복 동안 `special`이 바뀌지 않으므로 ui의 "누르고 있는 특수 키" 집합이 흔들리지 않는다 |
| A3 | **`held` 불변** — 반복은 새 키가 아니다 | 칸을 같은 값으로 다시 쓰므로 `held_count()`가 직전 이벤트와 같다 |
| A4 | 첫 누름·뗌은 `repeat: false`. **뗀 뒤 다시 누르면 첫 누름**(`repeat: false`). `clear()` 뒤(훅 재시작) 처음 보는 누름도 첫 누름 | 칸이 `Up`이면 `(true, Up)` 팔 |
| A5 | **스로틀 없음** — 반복 이벤트를 모두 내보낸다 | 근거는 아래 목록과 §11 D14 |
| A6 | "어떤 키든"(🔒) — 일반 키·특수 키는 자동 반복되면 `repeat: true`. **예외는 A8**(수식 키 자신의 반복) | 키 종류로 거르지 않는다(거르려면 키 식별이 필요 — 이 모듈 밖으로는 못 낸다). 수식 키만은 A8이 별도로 막는다 |
| A7 | "반복이 멈춤" 사건은 내보내지 않는다 | 훅에는 타이머가 없다(메시지 루프만). 멈춤은 뗌 이벤트 또는 ui의 타임아웃으로 판단한다(§9.2 RB4, §11 D17) |
| **A8** | **Shift·Ctrl·Alt·Win(좌우 모두 — `VK_LSHIFT` 0xA0·`VK_RSHIFT` 0xA1·`VK_LCONTROL` 0xA2·`VK_RCONTROL` 0xA3·`VK_LMENU` 0xA4·`VK_RMENU` 0xA5·`VK_LWIN` 0x5B·`VK_RWIN` 0x5C) 자신의 자동 반복은 이벤트 자체를 내지 않는다**(🔒 사용자 결정 2026-09-24, 확정사항 §4 3행. 이미 눌린 수식 키의 재누름은 기존처럼 무시). 그 키의 첫 누름·뗌은 다른 키와 같다 | `apply`가 `(true, KeyState::Down(s))`에서 `is_modifier_vk(vk)`이면 칸을 바꾸지 않고 `None`(이벤트 없음)을 돌려준다. Ctrl+Shift+Z처럼 수식 키를 누른 채 다른 키를 반복하는 경우는 그 다른 키 기준으로 A6이 적용된다(수식 키 자신만 예외) |

**스로틀 판단 근거(A5):**

1. **빈도가 OS에서 이미 묶여 있다.** 자동 반복 속도는 Windows 키보드 설정(`SPI_GETKEYBOARDSPEED` 0~31)이 정하며 최대 약 30회/초(기본값 31 = 최대), 최소 약 2.5회/초다. 첫 반복까지의 지연은 250ms~1s(기본 약 500ms). 이미 허용한 마우스 이동(≈60Hz)의 절반 이하다.
2. **한 번에 한 키만 반복된다.** Windows는 마지막에 누른 키만 자동 반복하고, 다른 키를 누르면 앞 키의 반복을 멈춘다. 여러 키를 눌러도 반복 빈도가 곱해지지 않는다 → 키보드 반복 부하 상한 ≈ 30건/초.
3. **스로틀을 두면 기록 금지(P3)와 충돌한다.** "키당 50ms에 1회"는 키별 마지막 반복 시각을 저장해야 한다(P3가 금지하는 키별 시각). 키 구분 없는 전역 시각 하나로 하면 P3는 지키지만 1·2번 때문에 막을 부하가 없다 — 상태만 는다(요구 기반 최소 설계, 스킬 §10).
4. **ui의 "반복 멈춤" 판단에 규칙적인 신호가 낫다.** ui는 반복이 끊기면 떨림을 멈춰야 한다(A7). 반복 간격을 그대로 받아야 타임아웃을 OS 반복 간격에 맞출 수 있다. 스로틀이 간격을 바꾸면 ui 타임아웃 계산에 core 내부 상수가 끼어든다.
5. **콜백 작업은 늘지 않는다.** 반복 1건의 처리량은 첫 누름과 같다(§3.3). 전달 스레드의 `emit`도 초당 ≤30건 추가로, 마우스 이동 emit과 같은 경로다.

- 한계(스로틀 없음의 대가): 매크로·자동 입력 프로그램이 `SendInput`으로 같은 키의 누름을 아주 빠르게 주입하면(OS 반복 속도 제한을 받지 않음) 반복 이벤트도 그 빈도로 나간다. 첫 누름·뗌도 지금까지 스로틀이 없었던 것과 같은 성격이다 — 실제 키보드 입력에는 해당하지 않는다. 문제가 실측되면 §11 후보 C1(전역 하한)로 대응한다.

### 3.6 UAC 승격 실행 래퍼 `elevate.rs` (SV2-05, 🔒 D-4 A안 — 구현자가 그대로 옮길 것)

결론: `run_elevated`는 프로그램 하나를 **관리자 권한("runas")으로 숨김 실행하고 끝날 때까지 기다려 종료 코드를 돌려주는** 안전 함수다. 호출자는 unsafe를 모른다. 사용자가 UAC에서 「아니요」를 누르면 `Cancelled`로 구분된다.

비유: 관리실(관리자 권한)에 심부름을 보내는 창구다. 창구 직원(hook)만 관리실 출입증(unsafe)을 다룰 수 있어서, 트레이는 "이 서류(schtasks 명령)를 관리실에 넣어 주고 결과 번호만 알려 달라"고 부탁한다. 경비원(UAC)이 거절하면 "거절됨"이라고만 전한다. 이 창구는 입력 검사원(훅 콜백)의 책상과 떨어져 있어 서로 방해하지 않는다.

#### 3.6.1 공개 API (§2 증분 — `hook/mod.rs`에 `mod elevate; pub use elevate::{run_elevated, ElevateError};`)

| 이름 | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `pub fn run_elevated(program: &Path, args: &str) -> Result<u32, ElevateError>` | 실행 파일 절대 경로, 명령줄 인자 문자열 | 자식 프로세스 종료 코드 | `Cancelled`(UAC 거절), `Failed`(실행·대기·종료 코드 조회 실패) | SV2-05 |
| `pub enum ElevateError` | — | §3.6.4 | — | SV2-05 |

- **블로킹**: UAC 응답 + 자식 종료까지 돌아오지 않는다. 메인 스레드·훅 스레드에서 부르지 않는다(호출자 tray는 bridge의 `spawn_blocking` 스레드에서 부른다). 이미 관리자로 실행 중이면 UAC 창 없이 실행된다.
- `hook::start`·`stop`·`InputEvent` 등 기존 공개 항목 변경 없음. 개인정보 규칙 §1.1 P2(로그 0건)·P5(파일·레지스트리 쓰기 없음)는 `elevate.rs`에도 적용된다 — 로그·파일 IO를 하지 않는다(파일은 호출자 tray가 쓴다).

#### 3.6.2 구조와 코드 (`src-tauri/src/hook/elevate.rs` 신규, 예상 130줄 — 테스트 포함. `mod.rs` 494 → 약 500줄)

```rust
//! UAC 승격 실행 안전 래퍼(SV2-05, 🔒 D-4 A안).
//! [목적] tray::autostart 가 작업 스케줄러 등록·해제(schtasks.exe)를 관리자 권한으로 실행한다.
//! [위치] hook 모듈 = 앱의 유일한 unsafe 구역(golden-principles §6). 훅 콜백·훅 스레드·메시지 루프와 무관.
//! [공개 API] `run_elevated`, `ElevateError`.
//! [스레드] 호출자 스레드에서 블로킹(UAC 응답 + 자식 종료까지). 메인 스레드 호출 금지.
//! [unsafe] E1 ShellExecuteExW, E2 WaitForSingleObject, E3 GetExitCodeProcess, E4 CloseHandle — 모두 SAFETY 주석.
//! [로그] 없음(§1.1 P2). [테스트] to_wide·오류 분류 단위, 실행은 수동(tray.md §8.3).

use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::path::Path;

use windows::core::{w, HRESULT, PCWSTR};
use windows::Win32::Foundation::{CloseHandle, ERROR_CANCELLED, HANDLE, WAIT_OBJECT_0};
use windows::Win32::System::Threading::{GetExitCodeProcess, WaitForSingleObject, INFINITE};
use windows::Win32::UI::Shell::{
    ShellExecuteExW, SEE_MASK_NOASYNC, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOW,
};
use windows::Win32::UI::WindowsAndMessaging::SW_HIDE;

pub fn run_elevated(program: &Path, args: &str) -> Result<u32, ElevateError> {
    // 두 버퍼는 이 함수 끝까지 살아 있다(아래 info 가 가리킨다).
    let file = to_wide(program.as_os_str());
    let params = to_wide(OsStr::new(args));
    let mut info = SHELLEXECUTEINFOW {
        cbSize: std::mem::size_of::<SHELLEXECUTEINFOW>() as u32,
        fMask: SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC,
        lpVerb: w!("runas"),
        lpFile: PCWSTR(file.as_ptr()),
        lpParameters: PCWSTR(params.as_ptr()),
        nShow: SW_HIDE.0,
        ..Default::default()
    };
    // SAFETY: (E1) 아래 §3.6.3
    unsafe { ShellExecuteExW(&mut info) }.map_err(classify_launch_error)?;
    let process = OwnedProcess(info.hProcess);
    if process.0.is_invalid() {
        return Err(ElevateError::Failed(std::io::Error::other(
            "실행한 프로세스 핸들을 받지 못했습니다",
        )));
    }
    process.wait_exit_code()
}

/// ShellExecuteExW 실패 분류. GetLastError == ERROR_CANCELLED(1223) → 사용자가 UAC 거절.
fn classify_launch_error(e: windows::core::Error) -> ElevateError {
    if e.code() == HRESULT::from_win32(ERROR_CANCELLED.0) {
        ElevateError::Cancelled
    } else {
        ElevateError::Failed(std::io::Error::other(e)) // HRESULT(= GetLastError)를 source 로 보존
    }
}

/// NUL 로 끝나는 UTF-16 버퍼.
fn to_wide(s: &OsStr) -> Vec<u16> {
    s.encode_wide().chain(std::iter::once(0)).collect()
}

/// 자식 프로세스 핸들 소유자 — Drop 에서 정확히 한 번 닫는다(모든 반환 경로).
struct OwnedProcess(HANDLE);

impl OwnedProcess {
    fn wait_exit_code(&self) -> Result<u32, ElevateError> {
        // SAFETY: (E2)
        let waited = unsafe { WaitForSingleObject(self.0, INFINITE) };
        if waited != WAIT_OBJECT_0 {
            return Err(ElevateError::Failed(std::io::Error::last_os_error()));
        }
        let mut code = 0u32;
        // SAFETY: (E3)
        unsafe { GetExitCodeProcess(self.0, &mut code) }
            .map_err(|e| ElevateError::Failed(std::io::Error::other(e)))?;
        Ok(code)
    }
}

impl Drop for OwnedProcess {
    fn drop(&mut self) {
        if !self.0.is_invalid() {
            // SAFETY: (E4)
            let _ = unsafe { CloseHandle(self.0) };
        }
    }
}
```

- `hwnd`는 null(기본값)이다. UAC 창은 보안 데스크톱에 뜨므로 소유 창이 없어도 된다. 설정 창 핸들을 넘기려면 hook이 window를 알아야 해서(의존 방향 위반) 넘기지 않는다.
- COM 초기화(`CoInitializeEx`)는 하지 않는다 — exe를 `runas`로 실행하는 데 셸 확장이 필요 없다. 실패가 관찰되면 [tray.md](tray.md) §11 T-b(기능 추가 승인 필요).

#### 3.6.3 unsafe (§5 증분 — 블록별 SAFETY 근거, 각 블록 바로 위 `// SAFETY:` 주석에 이 문장을 적는다)

| # | 호출 | SAFETY 근거 |
|---|---|---|
| E1 | `ShellExecuteExW(&mut info)` | `info`는 스택의 완전히 초기화된 구조체이고 `cbSize`가 구조체 크기다. `lpFile`·`lpParameters`는 이 함수 끝까지 살아 있는 NUL 종료 `Vec<u16>`(`file`·`params`)을, `lpVerb`는 정적 문자열(`w!`)을 가리킨다. 나머지 포인터·핸들 필드는 0(null)으로 문서상 허용값이다. `SEE_MASK_NOASYNC`로 호출이 동기로 끝나 반환 뒤 포인터가 쓰이지 않는다. 성공 시 `SEE_MASK_NOCLOSEPROCESS`로 받은 `hProcess`의 소유권은 우리에게 있다(`OwnedProcess`) |
| E2 | `WaitForSingleObject(self.0, INFINITE)` | `self.0`은 `ShellExecuteExW`가 돌려준 유효 프로세스 핸들(무효 핸들은 앞에서 걸렀다)이며 `Drop` 전까지 닫히지 않는다. 호출 스레드는 메인·훅 스레드가 아니다(블로킹 허용) |
| E3 | `GetExitCodeProcess(self.0, &mut code)` | 같은 유효 핸들, `code`는 스택의 `u32`에 대한 유효한 가변 참조. 대기가 `WAIT_OBJECT_0`으로 끝난 뒤라 종료 코드가 확정돼 있다(`STILL_ACTIVE` 아님) |
| E4 | `CloseHandle(self.0)` | 핸들은 `OwnedProcess`가 단독 소유하고 `Drop`은 한 번만 불린다 → 이중 닫기 없음. 무효 핸들은 닫지 않는다 |

- `SHELLEXECUTEINFOW::default()`의 0 초기화는 windows 크레이트 안의 unsafe이다(우리 블록 아님).
- 기존 `#![deny(unsafe_op_in_unsafe_fn)]`가 `elevate.rs`에도 적용되도록 모듈 루트(`mod.rs`) 속성을 유지한다. unsafe 블록 수: 훅 U1~U10 + 승격 E1~E4.

#### 3.6.4 에러 (§6 증분)

```rust
#[derive(Debug, thiserror::Error)]
pub enum ElevateError {
    #[error("사용자가 관리자 권한 확인을 취소했습니다.")]
    Cancelled,
    #[error("관리자 권한으로 실행하지 못했습니다: {0}")]
    Failed(#[source] std::io::Error),
}
```

| 변형 | 한국어 메시지 | 원인 |
|---|---|---|
| `Cancelled` | 사용자가 관리자 권한 확인을 취소했습니다. | `ShellExecuteExW` 실패 + `ERROR_CANCELLED`(1223) |
| `Failed(#[source] std::io::Error)` | 관리자 권한으로 실행하지 못했습니다: {0} | 그 밖의 `ShellExecuteExW` 실패(파일 없음 등 — `windows::core::Error`를 `io::Error::other`로 감싸 HRESULT 보존), 대기 실패(`last_os_error`), 종료 코드 조회 실패, 핸들 없음 |

- `code()`는 두지 않는다 — 호출자 tray가 `AutostartError`로 바꾼다(`Cancelled`→`autostart.cancelled`, `Failed`→`autostart.error`). bridge로 직접 나가지 않는다.
- `HookError`와 합치지 않는다 — 원인 영역(훅 설치 vs 승격 실행)이 다르다(스킬 §5 "원인이 구분되는 단위").

#### 3.6.5 스레드 (§4 증분)

- 새 스레드·채널 없음. 호출자 스레드(bridge `spawn_blocking` 풀)에서 `ShellExecuteExW` → UAC 대기 → `WaitForSingleObject` 블로킹. 훅 스레드(`win32-input-hook`)·`KEYS` 잠금·`SENDER`를 건드리지 않는다 → UAC 창이 떠 있는 동안에도 훅 콜백은 평소처럼 돈다(tray.md M-T10).

#### 3.6.6 테스트 (§8 증분 — `elevate.rs` `#[cfg(test)] mod tests`)

| # | 이름 | 입력 | 기대 |
|---|---|---|---|
| E-U1 | `to_wide_is_nul_terminated` | `"schtasks.exe"`, `r"C:\사용자\a b.exe"` | 마지막 원소 0, 앞부분 = `encode_wide` 결과, 중간에 0 없음 |
| E-U2 | `cancelled_is_classified` | `windows::core::Error::from(HRESULT::from_win32(ERROR_CANCELLED.0))` | `ElevateError::Cancelled` |
| E-U3 | `other_errors_are_failed_with_source` | `ERROR_FILE_NOT_FOUND`로 만든 오류 | `Failed(e)`, `e.get_ref()`가 `Some` |
| E-U4 | `messages_are_korean` | 두 변형 `to_string()` | §3.6.4 문구로 시작 |

- `run_elevated` 자체는 UAC가 필요해 자동 테스트하지 않는다 → 수동 E-M1~E-M4(실행 증거: 명령 출력·스크린샷).

| # | 절차 | 기대 |
|---|---|---|
| E-M1 | (tray M-T2와 함께) `run_elevated(schtasks, "/Query /TN kuro_keyviewer")` 수준의 호출 → UAC 「예」 | 종료 코드 반환(0 또는 1), 콘솔 창 번쩍임 없음 |
| E-M2 | UAC 「아니요」 | `Err(Cancelled)` |
| E-M3 | 없는 프로그램 경로 | UAC 없이 또는 뒤에 `Err(Failed(..))`, 앱 멈춤 없음 |
| E-M4 | 관리자로 실행한 앱에서 호출 | UAC 창 없이 실행·종료 코드 반환 |

- 기존 P2 검사(Grep `log::\|println!\|eprintln!\|dbg!` in `src-tauri/src/hook/` = 0)·P5 검사(Grep `std::fs\|File` = 0)가 `elevate.rs`까지 덮는다.

#### 3.6.7 요구 추적·결정 (§10·§11 증분)

| 요구ID | 반영 | 상태 |
|---|---|---|
| SV2-05 — 관리자 권한 등록·해제 수단(UAC 승격) | §3.6.1~§3.6.4, E-U1~E-U4, E-M1~E-M4 | ✅ 설계 · 소스 미적용 |
| SV2-05 — UAC 취소를 구분 | §3.6.2 `classify_launch_error`, E-U2, E-M2 | ✅ 설계 · 소스 미적용 |

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| **D15** | 승격 래퍼를 hook에 둔다(`elevate.rs`), 훅 코드와 분리된 파일 | ① tray에 unsafe ② PowerShell `Start-Process -Verb RunAs`(D-4 B) ③ COM `ITaskService`(D-4 C) | 🔒 D-4 A. ①은 hook 밖 unsafe 금지(훅이 차단). ②는 취소·종료 코드 구분이 부정확. ③은 COM 기능·복잡도. 파일 분리로 훅 콜백 검토 범위(§13 체크리스트 3·4)와 섞이지 않는다 |
| **D16** | `ElevateError`는 `thiserror` + 한국어 메시지, `Failed(std::io::Error)` | 패킷의 `#[derive(Debug)]`만 / `windows::core::Error` 직접 보관 | 스킬 §5 표준 강제 항목. `io::Error::other`로 원래 `windows::core::Error`(HRESULT)를 source로 보존해 `GetLastError` 값을 잃지 않는다 |
| **D17** | 핸들을 RAII(`OwnedProcess`)로 닫는다 | 경로마다 `CloseHandle` | 대기·조회 실패 경로에서도 누수 없음(E4 근거가 한 곳) |

### 3.7 키 뗌 유실 복구 (CR-046, 🔒 확정사항 §6 2026-09-26 — 초안: 설계자 확정 · 사용자 확인 대기 · 소스 미적용)

결론: **누름 계열 입력(키보드 누름 메시지, 마우스 좌·우 버튼 누름)이 들어올 때마다, 표에서 `Down`인 다른 칸만(보통 0~2개) `GetAsyncKeyState`로 대조한다. 실제로는 떼진 칸은 `Up`으로 돌리고, 정리한 칸마다 뗌 이벤트를 그 입력의 이벤트보다 먼저 보낸다.** 저빈도 루프·시간 기준·IME 키 특례는 두지 않는다. 공개 API·`InputEvent` 모양·계약 페이로드·`apply`·`classify`·`keyboard_event`는 바뀌지 않는다.

비유: 검사원 명단에는 "지금 창구에 서 있는 손님"만 적힌다. 그런데 뒷문(보안 화면·관리자 창)으로 나간 손님은 이름이 지워지지 않고 남았다. 이제는 새 손님이 오거나 초인종(클릭)이 울릴 때 명단에 남은 사람만(보통 0~2명) 창구를 한 번 둘러본다. 없는 사람은 "나갔다"고 먼저 적어 보낸 뒤 새 손님을 받는다. 창구를 계속 순찰하지 않고, 명단에 없는 사람을 찾아보지도 않는다.

#### 3.7.1 원인과 요구 (R-tmp-2 = CR-046)

- 증상 원인(분석 `.claude/reports/error-overlay-20260926-1720.md`): 뗌을 받지 못한 키 칸이 `Down`으로 남아 `held ≥ 1`로 고정된다. 그러면 ui `kbDown`이 늘 참이 되어 ⓐ 첫 누름 바운스와 펜 클릭 바운스가 멈추고, ⓑ 새 특수 키 바운스만 남는다. D2·D18은 이 현상을 한계로 받아들이면서 영향을 "부르르 1회"로 적었는데, 이는 과소평가였다. 실제로는 **그 키를 다시 누르고 뗄 때까지 일반 바운스가 전부 멈춘다.**
- 뗌을 놓치는 경로(모두 "훅 콜백이 그 뗌에 불리지 않음"):
  1. **보안 데스크톱 전환**(Ctrl+Alt+Del·Win+L·UAC): 전환 뒤 입력은 Winlogon 데스크톱으로 가므로 기본 데스크톱의 저수준 훅이 불리지 않는다.
  2. **UIPI**: 관리자 권한 창이 포그라운드일 때, 일반 권한 프로세스의 저수준 훅은 그 창으로 가는 입력을 받지 못한다.
  3. **한/영(`VK_HANGUL` 0x15)·한자(`VK_HANJA` 0x19)**: 뗌 코드가 없는 키라는 추정이 있다(미실측 → K1).
  4. **다른 앱의 훅이 뗌을 삼킴**: 그 훅이 우리보다 먼저 불리고 `CallNextHookEx`를 부르지 않는 경우다.
- 요구(🔒): 경로와 상관없이 결국 "눌림 없음"으로 복구하고, 입력 내용은 기록하지 않는다(§1.1 유지).

#### 3.7.2 방식 비교와 확정

| 후보 | 방식 | 콜백 비용 | 정확도·복구 시점 | 판정 |
|---|---|---|---|---|
| **(a) 누름 때 대조** | 누름 이벤트마다 **지금 키를 뺀 `Down` 칸만** `GetAsyncKeyState` 조회 | 누름 1건당 Win32 호출 수 = 다른 `Down` 칸 수(평상 타자 0, Shift+글자 1, Ctrl+Shift+Z 2). 조회 1회는 포인터 없는 가벼운 시스템 호출이다. 뗌·마우스 이동에서는 0회 | 원인 ①~④ 모두 복구한다(OS 비동기 상태가 뗌을 알고 있으면). **다음 누름 직전**에 정리되므로 그 누름부터 바운스·분류가 정상이다. 약점: 키도 클릭도 없이 마우스 이동만 하는 동안에는 칸이 남는다 | **채택 + 트리거에 마우스 좌·우 버튼 누름 추가** |
| (b) 저빈도 정리 루프(1초) | 별도 스레드 또는 훅 스레드 타이머가 주기적으로 대조 | 별도 스레드 방식은 `KEYS` 잠금을 다른 스레드와 나눠 쓰게 되어 **콜백 안 잠금 대기**가 생긴다(스킬 §3-3, §13-3 CRITICAL). 훅 스레드 `SetTimer` 방식은 unsafe 2~3개 추가, `WM_TIMER` 처리, 설치·해제 수명 관리가 필요하다 | 최대 1초 늦게 복구하고, 입력이 없어도 매초 깨어난다. 마우스 이동만 할 때도 복구된다는 점이 유일한 이점이다 | 기각 |
| (c) 오래 `Down`인 칸만 | 칸마다 누른 시각을 저장하고, T초를 넘은 칸만 대조 | (a)와 비슷 | **키별 시각 저장은 §1.1 P3 위반**이다. 오래 누르는 키(게임 WASD)도 결국 조회하므로 호출 수가 줄지 않는다 | 기각 |
| (d) IME 토글 키 특례 | `VK_HANGUL`·`VK_HANJA`를 표에 넣지 않거나, 누름 즉시 뗌으로 처리 | 0 | 원인 ③만 막고 ①②④는 그대로 남는다. 뗌이 실제로 오는 환경(T7의 전제)에서는 "누름 못 본 뗌"이 생기고, `pressed: true`인데 `held: 0`인 이벤트가 나와 불변식이 깨진다 | 기각 — **조건부 후보 C2**(K1이 실패할 때만) |

**채택 근거(D20):**
1. **원인을 가리지 않는다.** 한 경로로 네 원인을 모두 막는다. 원인마다 고치는 방식(세션 잠금 알림·IME 특례 등)은 경로가 늘 때마다 새 코드가 필요하다. 세션 잠금 알림(`WTSRegisterSessionNotification`)은 창 핸들까지 필요한데, hook에는 창이 없다.
2. **바운스를 판단하는 순간에 맞춰 복구한다.** ui는 누름(키·버튼)에서만 바운스를 정한다. 정리 뗌이 그 누름보다 먼저 가므로 ui의 "갱신 전 state"가 `kbDown: false`가 되고, **복구 직후 첫 누름부터 바운스가 산다**(표만 조용히 고치면 첫 누름 1회를 잃는다 — D21).
3. **분류 오염도 함께 없앤다.** 정리는 `classify` 전에 끝난다. 따라서 Ctrl+Alt+Del 뒤 남은 Ctrl 때문에 분류가 꺼지거나 Z가 `Undo`로 보이던 D2 한계가 사라진다(S4).
4. **마우스 버튼 누름을 트리거에 넣은 이유**: 신고 증상에 펜 클릭 바운스 정지가 있다. Win+L을 푼 뒤 마우스만 쓰는 사용자도 첫 클릭에서 복구된다. 평소 클릭할 때는 `Down` 칸이 0개라 Win32 호출도 0회다.
5. **(b)를 기각한 결정적 이유**: 잠금 공유(콜백 대기) 또는 타이머 수명 관리 비용을 치르고 얻는 것이 "이동만 할 때 키보드 그림 복구" 하나뿐이다. 요구 증상(바운스)은 (a)로 해소된다(스킬 §10).

**core-implementer 반론 반영:**
- *"D2는 키마다 Win32 호출을 기각했다"*: D2가 기각한 것은 **표에 이미 있는 정보(Shift·Ctrl 눌림)를 다시 묻는 호출**이다. CR-046에 필요한 정보, 곧 "훅이 보지 못한 뗌"은 표가 가질 수 없어서 외부 사실(OS 비동기 상태)이 유일한 근거다. 호출 수도 "키마다"가 아니라 **"누름마다 × 다른 Down 칸 수"**로 묶인다. 평상 타자에서는 0이고, 뗌·이동에서는 한 번도 부르지 않는다. 분류 판정은 여전히 표에서 한다(D2 본문 유지, D22).
- *"T7은 HANGUL 누름·뗌이 모두 들어온다고 전제한다"*: `apply`를 바꾸지 않으므로 T7은 그대로 참이다. 뗌이 실제로 오는 환경에서는 CR-046이 아무 일도 하지 않는다(표가 이미 맞음). 뗌이 오지 않는 환경이면 `release_stale`이 다음 누름에서 정리한다(S-테스트). 어느 쪽이 실제인지는 K1로 확인한다. (d)를 기각한 이유 중 하나가 바로 T7 전제와의 충돌이다.

#### 3.7.3 규칙

| # | 규칙 | 설계 |
|---|---|---|
| L1 | **트리거** = 키보드 누름 메시지(`WM_KEYDOWN`·`WM_SYSKEYDOWN` — 첫 누름·자동 반복·A8 수식 키 반복 모두) + 마우스 `WM_LBUTTONDOWN`·`WM_RBUTTONDOWN`. 뗌·마우스 이동·버튼 뗌은 트리거가 아니다 | `keyboard_pressed(msg) == Some(true)` / `mouse_button_down(msg)` |
| L2 | **대조 대상** = 표의 `Down` 칸 중 **지금 이벤트의 키 칸을 뺀 것**. 지금 키는 조회하지 않는다 — LowLevelKeyboardProc 문서상 콜백은 그 키의 비동기 상태가 갱신되기 **전에** 불리므로 판정할 수 없다. 다른 키는 자기 콜백이 끝난 뒤 이미 갱신되어 있다 | `release_stale(except: Some(vk), ..)`, 마우스는 `None` |
| L3 | **판정**: `GetAsyncKeyState(vk)`의 최상위 비트가 켜져 있으면(`< 0`) 눌림 유지, 아니면 떼짐. 하위 비트("마지막 조회 뒤 눌림")는 보지 않는다. 우리 프로세스에 다른 사용처가 없어 하위 비트 소비도 영향이 없다(Grep 2026-09-26: `src-tauri/src`에 `GetAsyncKeyState`·`GetKeyState` 0건) | `async_key_down` |
| L4 | **정리 결과**: 떼진 칸은 `Up`으로 바꾸고, 칸마다 뗌 이벤트 `Keyboard { pressed: false, held: 그 칸 정리 직후 개수, special: 그 칸의 분류값(누를 때 값), repeat: false, ts: 트리거 입력의 ts }`를 만든다. 순서는 vk 오름차순 | `release_stale` → `recover_missed_releases` |
| L5 | **이벤트 순서**: 정리 뗌 전부를 먼저 보내고, 그다음 트리거 입력 자신의 이벤트를 보낸다. 같은 훅 스레드·같은 채널이라 순서가 보존된다. 정리가 `apply`(곧 `classify`)보다 먼저 끝난다 | 콜백 본문 순서(§3.7.4) |
| L6 | **평상시 비용**: 정리할 칸이 없으면 이벤트도 힙 할당도 없다(`Vec::new()`·빈 `collect()`는 할당하지 않음). 표 256칸 훑기는 기존 `held_count`와 같은 양이다 | — |
| L7 | **같은 키 재누름 한계(D18 개정)**: 뗌을 놓친 바로 그 키를 다른 입력보다 먼저 다시 누르면(L2 때문에 지금 키는 조회하지 않음) 그 누름은 `repeat: true`로 보고되고, 그 키를 뗄 때 칸이 풀린다. 같은 누름에서 **다른** 남은 칸은 정리된다 | S7 |
| L8 | **개인정보**: 조회 대상은 이미 표에 있는 칸뿐이다. **256키 전체 훑기·주기 폴링 금지**(키로거 패턴 배제). 조회 결과·정리 횟수·시각을 저장하지 않고(P3) 새 정적 상태도 없다. 정리 뗌 이벤트의 필드는 기존 뗌과 같다(P1). 로그 0건 유지(P2) | 코드 리뷰, P2 Grep |

**한계(수용):**
- H-a L7(같은 키 재누름 1건은 부르르로 보고).
- H-b 키도 클릭도 없이 마우스 **이동만** 하는 동안에는 남은 칸이 유지된다. 이때 키보드 그림이 "눌림"으로 보일 수 있다(`kb_up`≠`kb_down`일 때). 다음 누름·클릭에서 복구된다. 바운스·분류는 누름·클릭에서만 판단하므로 요구 증상은 해소된다.
- H-c OS 비동기 상태 자체가 뗌을 모르는 경우(원인 ③이 드라이버 수준에서도 뗌을 만들지 않는 경우)에는 복구할 수 없다. K1로 실측하고, 실패하면 C2로 간다.
- H-d 다른 앱의 훅(키 재배치 도구)이 키를 가로채 비동기 상태가 갱신되지 않은 키는, 물리적으로 눌린 채여도 정리될 수 있다. 뒤에 오는 실제 뗌은 "누름 못 본 뗌"(`held` 불변, `special: None`)이 된다. 영향은 뗌이 1회 먼저 보이는 정도이고, `held`는 오히려 논리 상태에 가까워진다.
- H-e 복구 뗌의 `ts`는 실제로 뗀 시각이 아니라 발견한 시각이다(실제 시각은 알 수 없음).

#### 3.7.4 코드 (구현자가 그대로 옮길 것 — `mod.rs`)

```rust
// use 목록: windows::Win32::UI::Input::KeyboardAndMouse::{.., GetAsyncKeyState, ..} 추가
// (기능 Win32_UI_Input_KeyboardAndMouse 이미 켜짐 — windows 0.58 `pub unsafe fn GetAsyncKeyState(vkey: i32) -> i16`)

impl KeyTable {
    /// 뗌을 놓친 칸 정리(CR-046). `except`(지금 이벤트의 키) 칸을 뺀 `Down` 칸 중 `is_down(vk)`가
    /// false 인 칸을 `Up`으로 돌리고, 정리한 칸마다 뗌 변화를 vk 오름차순으로 돌려준다.
    /// `is_down`은 `Down` 칸에만 부른다. 정리할 칸이 없으면 빈 Vec(할당 없음). 분류값은 칸의 값 그대로.
    fn release_stale(&mut self, except: Option<u32>, is_down: impl Fn(u32) -> bool) -> Vec<KeyChange> {
        let skip = except.map(|vk| (vk & 0xFF) as usize);
        let mut held = self.held_count();
        let mut released = Vec::new();
        for (idx, cell) in self.keys.iter_mut().enumerate() {
            let KeyState::Down(special) = *cell else { continue };
            if Some(idx) == skip || is_down(idx as u32) {
                continue;
            }
            *cell = KeyState::Up;
            held -= 1; // Down 칸이었으므로 held >= 1 — 넘침 없음
            released.push(KeyChange { held, special, repeat: false });
        }
        released
    }
}

/// 전역 표의 뗌 유실을 정리해 뗌 이벤트로 바꾼다(CR-046). 누름 계열 입력의 이벤트보다 먼저 보낸다.
/// 훅 스레드 콜백에서만 부른다(잠금 경합 없음). 평상시 빈 Vec.
fn recover_missed_releases(
    except: Option<u32>,
    ts: u64,
    is_down: impl Fn(u32) -> bool,
) -> Vec<InputEvent> {
    let released = KEYS
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .release_stale(except, is_down);
    released
        .into_iter()
        .map(|c| InputEvent::Keyboard {
            pressed: false,
            held: c.held,
            special: c.special,
            repeat: false,
            ts,
        })
        .collect()
}

/// 운영용 물리 눌림 조회 — 비동기 키 상태의 최상위 비트(CR-046 L3). 지금 콜백을 일으킨 키에는
/// 쓰지 않는다(그 키의 상태는 콜백 뒤에 갱신된다 — L2).
fn async_key_down(vk: u32) -> bool {
    // SAFETY: (U11) §3.7.5 문장을 그대로 적는다.
    unsafe { GetAsyncKeyState(vk as i32) } < 0
}

/// 뗌 유실 정리를 부르는 마우스 메시지인지 — 좌·우 버튼 누름만(CR-046 L1).
fn mouse_button_down(msg: u32) -> bool {
    matches!(msg, WM_LBUTTONDOWN | WM_RBUTTONDOWN)
}

unsafe extern "system" fn keyboard_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        // SAFETY: (U1 기존 문구 유지)
        let info: &KBDLLHOOKSTRUCT = unsafe { &*(lparam.0 as *const KBDLLHOOKSTRUCT) };
        let (msg, ts) = (wparam.0 as u32, now_ms());
        // (기존 일반 주석 유지) + 누름이면 먼저 뗌 유실을 정리한다 — 지금 키는 조회하지 않는다(§3.7 L1·L2).
        if keyboard_pressed(msg) == Some(true) {
            for ev in recover_missed_releases(Some(info.vkCode), ts, async_key_down) {
                send(ev);
            }
        }
        if let Some(ev) = keyboard_event(msg, info.vkCode, ts) {
            send(ev);
        }
    }
    // SAFETY: (U2 기존 문구 유지)
    unsafe { CallNextHookEx(HHOOK::default(), code, wparam, lparam) }
}

unsafe extern "system" fn mouse_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code >= 0 {
        // SAFETY: (U3 기존 문구 유지)
        let info: &MSLLHOOKSTRUCT = unsafe { &*(lparam.0 as *const MSLLHOOKSTRUCT) };
        let (msg, ts) = (wparam.0 as u32, now_ms());
        if mouse_button_down(msg) {
            // 클릭 바운스 판단 전에 남은 키 칸을 정리한다(§3.7 L1, 펜 클릭 바운스 복구).
            for ev in recover_missed_releases(None, ts, async_key_down) {
                send(ev);
            }
        }
        if let Some(ev) = mouse_event(msg, info.pt.x, info.pt.y, ts) {
            send(ev);
        }
    }
    // SAFETY: (U2 기존 문구 유지)
    unsafe { CallNextHookEx(HHOOK::default(), code, wparam, lparam) }
}
```

- `CallNextHookEx`는 지금처럼 분기 밖에 있어 모든 경로에서 불린다(§13-4).
- `release_stale`가 `iter_mut().enumerate()`를 쓰는 이유: 인덱스 루프는 clippy `needless_range_loop` 경고가 난다.
- `//!` 갱신(스킬 §11): [목적]에 "누름·클릭 때 뗌을 놓친 칸을 OS 비동기 상태로 대조해 뗌 이벤트로 정리(CR-046)" 추가. [unsafe]에 "CR-046: U11 `GetAsyncKeyState` 1개" 추가. [개인정보]에 "조회는 표에 이미 있는 칸만, 결과 저장 없음" 추가. [테스트]에 "뗌 유실 정리 S1~S7·MB1" 추가.

#### 3.7.5 unsafe (§5 증분 — U11)

| # | 위치 | 호출 | SAFETY 근거 |
|---|---|---|---|
| U11 | `async_key_down` | `GetAsyncKeyState(vk as i32)` | 포인터·핸들·버퍼 인자가 없는 조회 함수이고 반환값 `i16`만 읽는다. 어떤 정수 vk에도 동작이 정의되어 있어(지원하지 않는 키·비활성 데스크톱이면 0) 메모리 안전 전제가 없다. 인자는 표 칸 번호(0..=255)라 `i32` 변환에서 값이 바뀌지 않는다. 호출 스레드 조건이 없다(훅 스레드 콜백에서 부름). "지금 콜백의 키는 조회하지 않는다"는 정확성 규칙(L2)이지 안전 조건이 아니다 |

#### 3.7.6 스레드·에러·설정 (§4·§6·§7 증분)

- 새 스레드·채널·정적 상태는 없다. `KEYS` 잠금은 이제 `keyboard_proc`(누름 때 2회 — 정리, 반영)와 `mouse_proc`(버튼 누름 때 1회)가 잡는다. 두 콜백 모두 **같은 훅 스레드**에서 차례로 불리므로 경합이 없다. `start`·`shutdown`의 `reset_keys`는 여전히 훅 스레드가 없을 때만 돈다(§4 불변식 유지).
- 빈도: `GetAsyncKeyState` 호출 수 = (키 누름 메시지 + 버튼 누름) × 다른 `Down` 칸 수. 자동 반복 중이면 최대 약 30Hz × 다른 `Down` 칸 수(보통 0~1). 정리 뗌 이벤트는 뗌 유실이 있었을 때만 나가며, 그때도 남은 칸 수(보통 1~3)만큼이다.
- 에러: 없음. `GetAsyncKeyState`는 실패를 돌려주지 않으며 0이면 떼짐으로 본다. `HookError`는 바뀌지 않는다.
- 설정: 없음(읽는 필드·쓰는 필드 없음).

#### 3.7.7 테스트 (§8 증분)

단위(`tests.rs`, **지역 `KeyTable` + 조회 함수 주입(클로저)** — 전역 상태·Win32 호출 없음). 표기 `(held, special, repeat)`.

| # | 이름(안) | 순서 | 기대 |
|---|---|---|---|
| S1 | `release_stale_clears_only_released_cells` | LSHIFT↓ → SPACE↓ → `'A'`↓ → `release_stale(Some(VK_Z), \|vk\| vk == VK_LSHIFT)` → 같은 호출 한 번 더 | ① 반환 2건, vk 오름차순: `(2, Some(Space), false)`(0x20) → `(1, None, false)`(0x41). 뒤이어 `held_count() == 1`, `shift_down() == true` ② 두 번째 호출은 빈 Vec(다시 정리하지 않음) |
| S2 | `release_stale_never_queries_current_key` | Z↓ → LSHIFT↓ → `release_stale(Some(VK_Z), 기록하고 false 반환)` | 조회 기록 = `[VK_LSHIFT]`만(Z는 조회하지 않음, L2). 반환 `(1, None, false)` 1건. Z 칸은 여전히 `Down` |
| S3 | `release_stale_queries_down_cells_only` | ① 빈 표에서 `release_stale(None, 세기)` ② 0xE0..=0xE3 ↓ 4칸 → `release_stale(None, 세고 true 반환)` | ① 조회 0회, 빈 Vec ② 조회 **정확히 4회**, 빈 Vec, `held_count() == 4`(표 불변) — "최소 작업" 증명 |
| S4 | `stale_ctrl_cleared_before_classify` | LCONTROL↓ → (뗌 유실) → `release_stale(Some(VK_Z), \|_\| false)` → Z↓ | 정리 `(0, None, false)` → Z↓ `(1, Some(Z), false)`. **`Undo`가 아님**(D2 한계 해소, L5) |
| S5 | `stale_special_release_carries_press_class` | LSHIFT↓ → `1`↓ → `release_stale(None, \|_\| false)` | `[(1, Some(Exclamation), false), (0, None, false)]`. 0x31 다음 0xA0 순서이고, 분류값은 누를 때 값이라 ui `specialHeld` 짝이 유지된다(B4) |
| S6 | `after_recovery_other_key_press_is_first_press` | `'A'`↓ → `release_stale(Some('B'), \|_\| false)` → `'B'`↓ → `'A'`↓ | 정리 `(0, None, false)` → B↓ `(1, None, false)` → A↓ **`(2, None, false)`**(자동 반복으로 오판하지 않음 — D18 해소) |
| S7 | `same_key_repress_is_reported_as_repeat_limitation` | `'A'`↓ → (뗌 유실) → `release_stale(Some('A'), \|_\| false)` → `'A'`↓ → `'A'`↑ | 정리 없음(빈 Vec, L2) → A↓ `(1, None, true)`(L7 한계를 문서로 고정) → A↑ `(0, None, false)`(스스로 풀림) |
| MB1 | `mouse_button_down_only_left_right_press` | `mouse_button_down(msg)` | `WM_LBUTTONDOWN`·`WM_RBUTTONDOWN` → true. `WM_LBUTTONUP`·`WM_RBUTTONUP`·`WM_MOUSEMOVE`·`WM_MBUTTONDOWN`(0x0207)·0 → false |
| **W1 증분** | (기존 이름 유지) 기존 ①~④ 뒤에 이어서 | ⑤ `keyboard_event(WM_KEYDOWN, VK_RETURN, 5)` ⑥ `recover_missed_releases(Some(VK_SPACE), 6, \|_\| false)` ⑦ `recover_missed_releases(None, 7, \|_\| false)` | ⑤ `held 1, Enter, repeat false` ⑥ `vec![Keyboard { pressed: false, held: 0, special: Some(Enter), repeat: false, ts: 6 }]` ⑦ `vec![]`. 전역 `KEYS`를 쓰는 테스트는 여전히 W1 하나다(D8). 끝에 표가 비어 있다 |

- 기존 T1~T17·C1~C10·마우스 2건은 **변경 없음**(`apply`·`classify`·`mouse_event` 불변). 특히 T7(HANGUL↓↑)은 그대로 참이다(§3.7.2 반론 반영).
- `async_key_down`(U11)은 실제 키보드 상태에 따라 값이 달라져 단위 테스트를 두지 않는다. 수동 K1~K8로 확인한다.
- **MB2~MB4(§3.7.10 마우스 보강, 지역 `MouseButtonState` + 조회 함수 주입 — 전역 상태 없음)**: MB2 `except` 버튼은 조회하지 않고 남은 버튼만 정리, MB3 정상 상태(둘 다 안 눌림)는 조회 0회, MB4 `clear`가 좌·우 모두 되돌림.
- 완료 기준(스킬 §9): `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings` 경고 0, `cargo test` 전건 PASS(2026-09-26 실측: 273건 PASS, S1~S7·MB1~MB4·W1 증분 포함 46건이 `hook::` 모듈). bridge Rust 파급이 없으므로 hook 단독으로 반영한다.

수동(`yarn tauri dev`, **시험용 `kb_up`과 `kb_down`을 서로 구분되는 그림으로** 등록해 "눌림 고정"이 눈에 보이게 한다. 증거는 스크린샷·화면 녹화만 — 키 로그 금지 §8.3 원칙):

| # | 절차 | 기대 |
|---|---|---|
| K1 | 메모장에서 **한/영 키를 10회 연타**(각각 톡) → 손을 뗀 상태로 확인 → `a` 톡 → (펜 모드) 클릭 | 한/영 연타 뒤 키보드 그림이 `kb_up`, `a` 누름에 **젤리 바운스**, 클릭에 바운스. **실패하면**(한/영 뒤 계속 `kb_down`이고 `a`·클릭 뒤에도 안 풀림) H-c에 해당하므로 C2 승격을 보고 |
| K2 | (한자 키가 있는 키보드) 한자 키 5회 → `a` 톡 | K1과 같음 |
| K3 | **Win+L** → 잠금 해제(비밀번호 입력) → 키를 누르지 말고 **클릭 1회**(펜 모드) → `a` 톡 | 해제 직후 그림이 `kb_down`으로 남아 있을 수 있음(H-b). **첫 클릭에서** `kb_up`으로 돌아오고 클릭 바운스가 나옴. `a`에서도 젤리 바운스 |
| K4 | **Ctrl+Alt+Del** → 취소(Esc) → `z` 톡 → 스페이스 톡 | `z` = **Z 전용 그림**(`Undo` 아님 — S4), 스페이스 = 스페이스 그림(Ctrl 분류 차단 풀림), 둘 다 바운스 |
| K5 | 관리자 권한 창(관리자 메모장·작업 관리자)을 띄워 두고, 일반 창에서 `a`를 누른 채(또는 Alt+Tab으로) 관리자 창으로 포커스 이동 → 거기서 키 떼기 → 일반 창 클릭 → `a` 톡 | 일반 창 클릭 또는 `a` 누름에서 복구되고 바운스가 나옴 |
| K6 | 스페이스를 누른 채 Win+L → 해제 → 클릭 1회 | 해제 직후 스페이스 그림이 남아 있을 수 있음. **첫 클릭에서 사라짐**(정리 뗌이 `special: space`를 실어 ui 특수 키 목록에서 빠짐 — S5) |
| K7 | 회귀: M3(좌·우 Shift+`/`), M4(Shift+`1`), M10(Ctrl+Z), M12, R2(`a` 2초 꾹), R5(Shift 2초 꾹)를 다시 수행. 추가로 **Shift를 누른 채 `/`를 5회 톡** | 전부 기존 기대와 같음. Shift를 누른 채 반복 톡해도 매번 `?`(누른 Shift가 잘못 정리되지 않음 — L3 정확성) |
| K8 | 부하: W·A·S·D를 동시에 누른 채 다른 키 연타 + 좌클릭 연타 10초 | 입력 지연·누락 없음(H4), CPU 급증 없음 |
| P-1 | (기존) 로그·앱 데이터 확인 | 키·분류·반복·**정리 발생** 정보가 로그에 없음 |

#### 3.7.8 bridge 요구 명세 (§9 증분) — **계약 모양 불변, 의미 보강(비파괴)**

| # | 항목 | 요구 |
|---|---|---|
| RC1 | 이벤트·페이로드 | 바뀌지 않는다. `input://keyboard` `{ pressed: false, heldCount, special, repeat: false, ts }` 모양 그대로이고, 새 필드·이벤트·command·에러 코드가 없다. Rust `bridge/events.rs`·TS 타입 변경도 없다 |
| RC2 | 의미 보강(계약 문구) | 뗌 이벤트는 실제로 뗀 순간이 아니라 **다음 누름 계열 입력(키 누름·마우스 좌/우 버튼 누름) 직전에 늦게** 올 수 있다(`ts` = 발견 시각). 여러 개가 같은 `ts`로 연달아 올 수 있고 `heldCount`는 하나씩 준다. `special`은 누를 때 값이다(B4 짝 유지). 빈도는 뗌 유실이 있었을 때만, 남은 칸 수만큼(보통 1~3) |
| RC3 | 순서 | 정리 뗌은 트리거 입력의 이벤트(`input://keyboard` 누름 또는 마우스 버튼 누름 이벤트)보다 **먼저** 같은 채널로 나가고, input-forwarder는 받은 순서대로 emit한다. **이벤트 이름이 다를 때(키보드 뗌 다음 마우스 버튼) WebView 도착 순서가 보존되는지는 bridge 확인 필요**(확인 필요 11). 순서가 뒤집히면 K3·K6의 첫 클릭 바운스를 1회 잃는다 |
| RC4 | ui 영향 | 코드 변경은 필요 없을 것으로 본다. 근거: `src/state/inputMachine.ts`의 `nextSpecialHeld`는 뗌에서 그 값을 빼고(③) `held === 0`이면 목록을 비운다(④). `startsBounce`·`onMouseButton`은 갱신 전 state의 `isPressing`을 본다. ui-designer가 TC 추가(뗌 직후 같은 `ts` 누름 → 바운스) 여부를 판단한다 |
| RC5 | 개인정보 | B5·RB7과 같다. 정리 뗌도 로그·저장하지 않는다 |
| RC6 | 반영 순서 | core hook 단독으로 반영할 수 있다(모양 불변). 계약 `contract.md` §4 `input://keyboard` 의미 문구(RC2·RC3)는 bridge-designer가 따로 갱신한다 |

#### 3.7.9 요구 추적·결정 (§10·§11 증분)

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| **D20** | 복구 방식 = **(a) 누름 때 대조 + 마우스 좌·우 버튼 누름 트리거** | (b) 1초 루프 (c) 오래 Down 칸만 (d) IME 키 특례 · 세션 잠금 알림 | §3.7.2 비교표와 근거 1~5 |
| **D21** | 정리한 칸마다 **뗌 이벤트를 내보낸다**(분류값 포함) | ① 표만 조용히 정리 ② 개수만 담은 뗌 1건으로 합치기 | ①이면 ui가 `held`를 모르므로, 복구 후 첫 누름이 "누르는 중"으로 보여 바운스를 1회 잃는다. 남은 특수 키 칸(`special: space`)도 ui 목록에서 빠지지 않아 그림이 남는다. ②는 특수 키 칸 여러 개가 남았을 때 어떤 분류를 뺄지 담을 수 없다. 칸마다 보내면 B4 짝이 그대로 유지된다 |
| **D22** | `GetAsyncKeyState`는 **표 정리에만** 쓰고, 분류(Shift·Ctrl)는 여전히 표에서 판정한다 | 분류 때 Shift·Ctrl을 직접 조회 | 정리가 `classify`보다 먼저 끝나므로 표가 이미 맞다(L5). 조회를 분류 입력으로 쓰면 누름마다 호출이 2~4회 고정으로 붙는다(D2 기각 이유 그대로) |
| **D23** | 트리거에 **자동 반복 누름도 포함**(L1) | 첫 누름에서만 | 첫 누름만 트리거로 하면 L7 상황(같은 키 반복)에서 다른 남은 칸이 풀리지 않는다. 비용은 반복 ≤30Hz × 다른 Down 칸(보통 0~1)이라 무시할 만하다. 판정 분기도 하나 줄어든다(`keyboard_pressed == Some(true)` 하나) |
| **D24** | 순수 로직(`release_stale`)과 조회(`async_key_down`)를 나누고, 조회를 **함수 주입**(`impl Fn(u32) -> bool`)으로 받는다 | `release_stale` 안에서 `GetAsyncKeyState` 직접 호출 | 단위 테스트가 Win32 없이 돈다(S1~S7). unsafe가 한 줄짜리 함수 하나에 모여 SAFETY 근거가 한 곳에 있다 |

| 요구ID | 반영 | 상태 |
|---|---|---|
| R-tmp-2 (CR-046) — 뗌을 놓친 키도 결국 눌림 없음으로 복구(보안 데스크톱·UIPI·IME 키·타 훅) | §3.7.2~§3.7.4, S1~S7·W1 증분, K1~K6 | 소스 반영(`cargo test` S1~S7·W1 증분 PASS) · 수동 K1~K6 대기 |
| R-tmp-2 — 복구 직후 첫 누름·클릭 바운스 정상(신고 증상) | L4·L5, D21, S6·MB1, K1·K3·K5 | 소스 반영 · 수동 대기 |
| R-tmp-2 — 남은 Ctrl·Shift가 분류를 오염시키지 않음(D2 한계 해소) | L5, D22, S4, K4 | 소스 반영 · 수동 대기 |
| R-tmp-2 — 입력 내용 비기록 유지 | L8, U11 근거, P-1 | 소스 반영 · 수동 대기 |
| R-tmp-2 — 한/영·한자 키 | L1~L4(일반 경로), K1·K2, 조건부 C2 | 부분(OS 동작 실측 전 — H-c) |
| R-tmp-2 보강 — 마우스 좌·우 버튼 뗌 유실도 복구(클릭 유지 고착) | §3.7.10, MB2~MB4 | 소스 반영(`cargo test` MB2~MB4 PASS) · **설계 재확인 대기**(core-implementer 작성) · 수동 K1·K3(펜 모드) 대기 |

#### 3.7.10 마우스 버튼 뗌 유실 보강 (core-implementer 작성, 🔒 task-manager 지시 "같은 원리로 보강" — 설계 재확인 대기)

결론: §3.7의 원리(누름 계열 입력 때 남은 `Down` 상태를 `GetAsyncKeyState`로 대조해 먼저 정리)를
**마우스 좌·우 버튼에도 그대로 적용**한다. §3.7은 키보드 `KeyTable`만 정리했는데, 마우스 버튼은
core에 눌림 상태 자체가 없어(패스스루) 뗌 유실이 나면 복구 경로가 아예 없었다 — 펜 모드
"클릭 유지" 고착(신고 증상의 마우스 쪽 절반)이 미해결로 남는 gap이었다.

비유: §3.7의 검사원 명단(키 칸)에 이제 "지금 누가 마우스 버튼을 붙잡고 있는지" 칸 2개(좌·우)를
추가한다. 초인종(새 누름·클릭)이 울릴 때마다 이 칸도 함께 훑어본다.

| # | 규칙 | 설계 |
|---|---|---|
| M1 | 정적 상태 신설 — `MouseButtonState { left: bool, right: bool }`. `KeyTable`과 같은 성격(지금 눌림만, 기록 없음, P3와 동급). 좌·우 버튼 메시지가 올 때마다 `mouse_event`가 반영한다 | `struct MouseButtonState`, `set(button, down)`, 전역 `static MOUSE_BUTTONS: Mutex<MouseButtonState>` |
| M2 | 트리거·except 규칙은 L1·L2와 동일 — 키보드 누름은 `except = None`(좌·우 둘 다 조회), 마우스 버튼 누름은 **자기 버튼만** `except`(그 버튼의 비동기 상태는 콜백 시점에 아직 갱신 전) | `recover_missed_mouse_releases(except, ts, is_down)` |
| M3 | 판정 = `async_key_down(VK_LBUTTON.0)` / `async_key_down(VK_RBUTTON.0)` — §3.7 L3와 같은 함수 재사용(새 unsafe 없음, U11 그대로) | `MouseButtonState::release_stale` |
| M4 | 정리 결과 = 뗌 이벤트(`InputEvent::MouseButton { pressed: false, .. }`), 트리거 자신의 이벤트보다 먼저(L5와 같은 순서). 키보드 정리(§3.7)와 마우스 정리 사이의 순서는 규정하지 않는다(둘 다 트리거 이벤트보다는 앞) | `keyboard_proc`은 키보드 정리 다음에 마우스 정리, `mouse_proc`은 키보드 정리 다음에 마우스 정리 — 둘 다 `mouse_event`/`keyboard_event` 호출보다 앞 |
| M5 | 표 비우기 범위 확장 — `reset_keys`(`start`·`stop`·트레이 「새로고침」)가 `MOUSE_BUTTONS`도 함께 비운다 | `reset_keys` 본문에 `MOUSE_BUTTONS.lock()....clear()` 추가 |

**한계(§3.7 한계와 같은 성격)**: 키·클릭 없이 마우스 **이동만** 하는 동안에는 버튼 칸도 유지된다(H-b와 동급) — 다음 누름·클릭에서 복구.

**bridge 영향**: 없음. `InputEvent::MouseButton` 모양 불변, `input://mouseButton` 계약 페이로드도 그대로 — 정리 이벤트는 기존 뗌 이벤트와 구분되지 않는다(§3.7.8 RC1과 같은 이유).

**core-implementer의 보고**: 이 절은 "확인하고, 안 되면 같은 원리로 보강하라"는 위임 지시에 따라
구현자가 직접 작성했다. §3.7 본문(D20·D21 등)은 이미 사용자 승인을 받았지만, 이 마우스 확장은
아직 core-designer·사용자의 별도 확인을 거치지 않았다 — 다음 core-manager 세션에서 재확인
받기를 권고한다(내용 자체는 §3.7과 같은 원리의 기계적 적용이라 설계 편차는 낮다고 판단한다).

### 3.8 CR-047 — UAC 승격 래퍼 `elevate.rs` 삭제 (SEC-001, 🔒 확정사항 §6 자동 실행 줄 2026-09-26 — tray.md §3.5.2 G1·G2 통과 조건부)

결론: 자동 실행 작업이 일반 권한(`LeastPrivilege`)으로 바뀌어 승격 실행이 필요 없어진다([tray.md](tray.md) §3.5). 유일한 호출자가 사라지므로 `hook/elevate.rs` 전체(§3.6의 `run_elevated`·`ElevateError`·unsafe E1~E4·테스트 4건)를 삭제한다. 훅 콜백·스레드·`KeyTable`·U1~U11은 **불변**.

비유: 관리실 열쇠를 대신 받아 오던 심부름꾼(승격 래퍼)은 「관리자 일정표」 때문에 둔 자리였다. 일정표를 평소 권한으로 바꿨으니 심부름꾼 자리를 없앤다.

| 항목 | 변경 |
|---|---|
| `hook/elevate.rs` | **파일 삭제** |
| `hook/mod.rs` | `mod elevate;`·`pub use elevate::{run_elevated, ElevateError};`(74-75행) 삭제, `//!` [공개 API](17행)에서 두 이름 삭제, [unsafe]의 승격 래퍼(E1~E4) 언급 삭제 |
| §2 공개 API | `run_elevated`·`ElevateError` 행 폐기(§3.6 표는 옛 기록) |
| §5 unsafe | 훅 전용 U1~U11만 남는다. E1~E4 폐기 |
| §6 에러 | `ElevateError` 폐기. `HookError` 불변 |
| 테스트 | `elevate.rs` 안 4건(`to_wide_is_nul_terminated`·`cancelled_is_classified`·`other_errors_are_failed_with_source`·`messages_are_korean`) 함께 삭제 → `cargo test` 총수 −4(tray 증감은 tray.md §3.5.6) |
| `Cargo.toml` | `windows` 기능 `Win32_UI_Shell`·`Win32_System_Registry`는 이 파일 때문에 추가됐다(6차). 구현자가 `src-tauri/src`에서 `UI::Shell`·`System::Registry` 사용 0건을 Grep으로 확인하면 제거 후보 — **Cargo.toml 수정이라 사용자 승인 후**(tray.md Q47-2). 남겨도 동작 영향 없음 |

- 전제: tray.md §3.5.2 G1·G2 통과. 실패하면 이 절은 적용하지 않는다(tray.md D47-3 — `elevate.rs` 유지 + XML만 `LeastPrivilege`).
- 순서: tray의 호출 제거(`run_schtasks_elevated`·`From<ElevateError>` 삭제)와 **같은 변경**에서 지운다 — 한쪽만 지우면 컴파일 오류가 난다.
- bridge 요구: 없음(bridge가 쓰는 `start`·`HookHandle`·`InputEvent` 불변).
- **D25** 죽은 unsafe 삭제(검토 표면 축소, golden-principles §6 「unsafe는 필요한 곳에만」). 추적: SEC-001(hook 몫) → §3.8 설계 완료, 실측 게이트 대기, 소스 미적용.

## 4. 스레드·채널

```
[win32-input-hook 스레드]                        [input-forwarder 스레드 (lib.rs)]       [WebView]
 SetWindowsHookExW(KEYBOARD_LL, MOUSE_LL)
 GetMessageW 루프 ─ Windows 가 콜백 호출
   keyboard_proc ─ (누름이면) 뗌 유실 정리: KEYS 잠금 → 다른 Down 칸만 GetAsyncKeyState → 정리 뗌 send (CR-046 §3.7)
                 ─ KEYS 잠금(경합 없음) → apply(첫 누름·뗌·자동 반복 모두 이벤트)
                 ─ send(InputEvent) ──mpsc::Sender<InputEvent>──▶ for ev in rx
   mouse_proc    ─ (좌·우 버튼 누름이면) 뗌 유실 정리 → 정리 뗌 send (CR-046 §3.7)
                 ─ 스로틀 → send ─────────────────────────────────▶   bridge::events::emit_input ──▶ input://keyboard
                                                                                                    input://mouse-*
 WM_QUIT → UnhookWindowsHookEx ×2 → 스레드 끝
```

- 채널: `std::sync::mpsc::Sender<InputEvent>`(hook → 전달 스레드), 단방향. 타입 불변(필드만 추가). 크기 제한 없는(unbounded) 채널이지만 전달 스레드가 `recv` 블로킹으로 바로 비운다.
- 빈도(CR-023): 키보드 = 누름·뗌마다 + **자동 반복 최대 약 30건/초(한 번에 한 키)**. 마우스 이동 ≤ 약 60건/초. 합계 상한 ≈ 90건/초 + 클릭·누름·뗌.
- `KEYS` 잠금은 **훅 스레드(콜백)만** 잡는다. `start`의 `reset_keys`는 훅 스레드를 만들기 전, `shutdown`의 `reset_keys`는 `join` 뒤에 돈다 → 콜백 안 잠금 대기가 생기지 않는다(스킬 §3-3).
- 종료 순서(불변): `SENDER` 비움 → `PostThreadMessageW(WM_QUIT)` → `join` → `reset_keys()`.
- 재시작: 반드시 `stop()` 후 `start()`(이중 등록 금지 — 기존).

## 5. unsafe

사용함(프로젝트에서 유일). **CR-021(1·2차)·CR-023은 unsafe 블록을 추가·변경하지 않는다** — `classify`·`KeyTable`·반복 판정은 안전한 Rust다. `keyboard_proc`의 일반 주석(SAFETY 아님)만 §3.3처럼 바뀐다.

| # | 위치 | 호출 | SAFETY 근거(현행 유지) |
|---|---|---|---|
| U1 | `keyboard_proc` | `&*(lparam.0 as *const KBDLLHOOKSTRUCT)` | `code >= 0`이면 lparam은 Windows가 채운 `KBDLLHOOKSTRUCT` 포인터(문서 보장). 콜백 반환 전까지만 유효 — 값만 읽는다 |
| U2 | `keyboard_proc`·`mouse_proc` | `CallNextHookEx(HHOOK::default(), ..)` | 훅 체인 표준 호출. 저수준 훅에서 hhk는 무시되므로 null. **모든 경로에서 호출**(분기 밖) |
| U3 | `mouse_proc` | `&*(lparam.0 as *const MSLLHOOKSTRUCT)` | U1과 같음 |
| U4 | `shutdown` | `PostThreadMessageW(thread_id, WM_QUIT, ..)` | 대상 id는 훅 스레드가 직접 알려준 값. 이미 종료됐으면 실패 무시 |
| U5 | `run_message_loop` | `SetWindowsHookExW(WH_KEYBOARD_LL / WH_MOUSE_LL, Some(proc), None, 0)` | 저수준 훅은 hmod null 허용, dwThreadId 0 = 전역. 콜백은 `extern "system"` 함수 |
| U6 | 같음(마우스 설치 실패 경로) | `UnhookWindowsHookEx(keyboard)` | 방금 설치한 유효 핸들 |
| U7 | 같음 | `GetCurrentThreadId()` | 단순 시스템 호출 |
| U8 | 같음 | `GetMessageW(&mut msg, None, 0, 0)` | msg는 스택의 유효한 `MSG`. 0·−1이면 루프 종료 |
| U9 | 같음 | `TranslateMessage`·`DispatchMessageW` | `GetMessageW`가 채운 msg의 표준 처리 |
| U10 | 같음(루프 뒤) | `UnhookWindowsHookEx` ×2 | 이 스레드가 설치한 핸들. 실패해도 스레드 종료로 훅이 사라진다 |
| **U11** | `async_key_down` (CR-046) | `GetAsyncKeyState(vk as i32)` | 포인터·핸들·버퍼 인자가 없는 조회 함수이고 반환 `i16`만 읽는다. 어떤 정수 vk에도 동작이 정의되어 있어(지원하지 않는 키·비활성 데스크톱이면 0) 메모리 안전 전제가 없다. 인자는 표 칸 번호(0..=255). 호출 스레드 조건 없음. "지금 콜백의 키는 조회하지 않는다"는 정확성 규칙(§3.7 L2)이다 |

- `#![deny(unsafe_op_in_unsafe_fn)]` 유지.
- **CR-046은 unsafe 블록을 U11 하나만 추가한다**(§3.7.5). 정리 로직 `release_stale`·`recover_missed_releases`는 안전한 Rust다. U1~U3의 SAFETY 문구는 바뀌지 않는다. unsafe 블록 수: 훅 U1~U11 + 승격 E1~E4.

## 6. 에러 타입

`HookError`(`#[derive(Debug, thiserror::Error)]`) — **CR-021·CR-023 변경 없음.** 분류·반복 판정은 실패하지 않는다(분류 불가 = `None`, 반복 판정은 칸 비교).

| 변형 | 한국어 메시지 | 원인 |
|---|---|---|
| `Install { which: &'static str, source: windows::core::Error }` | 전역 훅 설치에 실패했습니다 ({which}): {source} | `SetWindowsHookExW` 실패(`GetLastError`는 `source`에 보존) |
| `Thread(#[from] std::io::Error)` | 훅 스레드를 만들지 못했습니다: {0} | 스레드 생성 실패 |
| `Ready` | 훅 스레드가 준비 신호를 보내지 않았습니다 | 훅 스레드가 신호 전에 끝남 |

## 7. 설정 의존

- 없음(읽는 필드·쓰는 필드 모두 없음). hook은 어떤 모듈도 의존하지 않는다(스킬 §1).
- 특수 키 기능·부르르(CR-023)에 켜기/끄기 설정은 없다 — 요구 없음. 전용 그림이 없으면 ui가 일반 누름 그림을 쓴다(OV-R-22).
- 자동 반복 빈도·지연은 앱 설정이 아니라 **Windows 키보드 설정**(제어판 → 키보드 → 재입력 시간·반복 속도)을 따른다. hook은 이 값을 읽지 않는다(`SystemParametersInfo` 호출 없음).

## 8. 테스트 계획

### 8.1 단위 — `hook/tests.rs` (`#[cfg(test)] mod tests;`)

**전역 상태 원칙:** `cargo test`는 테스트를 여러 스레드에서 동시에 돌린다. 전역 `KEYS`를 쓰는 테스트가 둘 이상이면 서로의 눌림 개수가 섞인다. 따라서 **표 동작은 지역 `KeyTable::new()`로 검증**하고, 전역 `KEYS`를 거치는 테스트는 **W1 하나만** 둔다.

**CR-023 공통 변경:** `apply`가 `KeyChange`를 바로 돌려주므로 테스트의 `t.apply(..).expect("down")`·`.expect("up")`는 `t.apply(..)`로 바뀐다(기계적). 이전에 `assert_eq!(t.apply(..), None)`으로 "자동 반복 = 이벤트 없음"을 단언하던 자리(T5·T6·T14)는 `repeat: true` 단언으로 바뀐다.

#### 분류 — `classify(vk, shift, ctrl)` (C1~C10, CR-023 변경 없음)

| # | 이름(안) | 입력 | 기대 |
|---|---|---|---|
| C1 | `classify_shift_independent_four` | `VK_SPACE`·`VK_Z`·`VK_RETURN`·`VK_BACK` 각각 × shift false/true, ctrl false | 각각 `Space`·`Z`·`Enter`·`Backspace`(Shift 무관, J6) |
| C2 | `classify_question_needs_shift` | `VK_OEM_2` × shift true / false, ctrl false | `Some(Question)` / `None`(`/` 단독은 일반 키, J2) |
| C3 | `classify_exclamation_needs_shift` | `VK_1`(0x31) × shift true / false, ctrl false | `Some(Exclamation)` / `None`(J3) |
| C4 | `classify_keypad_excluded` | `VK_DIVIDE`(0x6F)·`VK_NUMPAD1`(0x61)·`VK_END`(0x23) × shift true/false × ctrl true/false | 모두 `None`(J2·J3) |
| C5 | `classify_other_keys_unknown` | `'A'`(0x41)·`'2'`(0x32)·`VK_LSHIFT`·`VK_RSHIFT`·`VK_SHIFT`·`VK_LCONTROL`·`VK_RCONTROL`·`VK_CONTROL`·`VK_LMENU`·`VK_RMENU`·`VK_LWIN`(0x5B)·`VK_HANGUL`(0x15)·`VK_CAPITAL`(0x14)·`VK_PROCESSKEY`(0xE5)·`0x00`·`0xFF` × shift true/false × ctrl true/false | 모두 `None`(수식 키 자체는 일반 키) |
| C6 | `classify_exactly_eleven_combinations` | vk 0..=255 × shift {false, true} × ctrl {false, true} 전수(**1024조합**) | `Some`인 조합이 **정확히 11개** — Ctrl 없음 10개(4종×Shift 2 + `?` 1 + `!` 1) + Ctrl 있음 1개(`Z`·Shift 없음 → `Undo`). 그 목록이 C1~C3·C8과 일치 — "분류값 외에는 알 수 없음"의 전수 증명 |
| C7 | `special_key_serializes_snake_case` | `serde_json::to_string` 각 변형(7개), `Option::<SpecialKey>::None` | `"space"`·`"z"`·`"question"`·`"exclamation"`·`"enter"`·`"backspace"`·`"undo"`, `null`(🔒 이름) |
| C8 | `classify_ctrl_z_is_undo_only_without_shift` | `VK_Z` × ctrl true: shift false / shift true | `Some(Undo)` / `None`(Ctrl+Shift+Z, J10 🔒 3차) |
| C9 | `classify_ctrl_blocks_other_specials` | ctrl true로: `VK_SPACE`, `VK_RETURN`(Ctrl+Enter), `VK_BACK`, `VK_OEM_2`+shift true(Ctrl+Shift+`/`), `VK_1`+shift true(Ctrl+Shift+`1`), `VK_OEM_2`+shift false, `VK_1`+shift false, `VK_Z`+shift true(Ctrl+Shift+Z) | 모두 `None`(J9·J10) |
| C10 | `classify_ignores_alt_and_win` | 문서화 테스트: `classify`에 Alt·Win 인자가 없음을 주석으로 밝히고, `VK_Z`·`VK_RETURN`을 ctrl false로 분류 | `Z`·`Enter`(Alt·Win은 분류에 영향 없음, J11 — 표 경로는 T14) |

- 숫자패드 Enter(J7)는 가상 키가 `VK_RETURN`과 같아 C1이 곧 증명이다(테스트 이름·주석에 명시).
- IME·Caps Lock 무관(J5)은 `classify`의 인자에 없다는 것 자체가 구조적 증명이고, T7이 표 경로에서 보강한다. 실제 IME의 가상 키 전달은 §8.3 M2(수동).

#### 눌린 키 표 — `KeyTable` (T1~T17, 모두 지역 인스턴스)

표기: `(held, special, repeat)`. `repeat`를 적지 않은 칸은 `false`.

| # | 이름(안) | 순서(`apply(vk, pressed)`) | 기대 |
|---|---|---|---|
| T1 | `left_shift_slash_is_question` | LSHIFT↓ → OEM_2↓ | ① `(1, None)`(Shift 자체는 일반 키) ② `(2, Question)` |
| T2 | `right_shift_one_is_exclamation` | RSHIFT↓ → `1`↓ | ② `(2, Exclamation)`(J1 오른쪽) |
| T3 | `no_shift_slash_and_one_are_plain` | OEM_2↓ → `1`↓ | 둘 다 `special None` |
| T4 | `release_keeps_press_time_class` | LSHIFT↓ → `1`↓ → **LSHIFT↑** → `1`↑ | ② `Exclamation` ③ `(1, None)` ④ **`(0, Exclamation)`**(Shift를 먼저 떼도 뗌 분류 유지, OV-R-22 계약 행) |
| **T5** | `shift_after_press_no_reclassify` | `1`↓ → LSHIFT↓ → `1`↓(자동 반복) → `1`↑ | ① `(1, None)` ③ **`(2, None, true)`**(반복도 재판정 없음 — `Exclamation`으로 바뀌지 않음, J4·A2) ④ `(1, None)` |
| **T6** | `auto_repeat_reports_repeat_for_special` (이름 변경: `auto_repeat_suppressed_for_special` → ) | SPACE↓ → SPACE↓ → SPACE↓ → SPACE↑ | ① `(1, Space, false)` ②③ **`(1, Space, true)`**(held 불변 A3, 분류 유지 A2) ④ `(0, Space, false)` |
| T7 | `ime_and_caps_do_not_affect_z` | HANGUL↓↑ → CAPITAL↓↑ → Z↓ → LSHIFT↓ → Z↑ → Z↓ | Z↓ 두 번 모두 `Z`(IME 토글·Caps·Shift 무관, J5·J6) |
| T8 | `either_shift_counts` | LSHIFT↓ → RSHIFT↓ → LSHIFT↑ → OEM_2↓ | ④ `Question`(오른쪽이 아직 눌림) |
| **T9** | `clear_forgets_everything` | SPACE↓ → LSHIFT↓ → LCONTROL↓ → `clear()` → `held_count()` → OEM_2↓ → Z↓ → SPACE↓ | `held_count() == 0`, OEM_2↓ = `None`(Shift 잊음), Z↓ = `Z`(Ctrl 잊음 — `Undo` 아님), SPACE↓ = **`(3, Space, false)`**(자동 반복으로 취급 안 함 — A4, §1.1 P4) |
| **T10** | `release_without_press_and_held_count` | Z↑(누름 못 봄) → 0xE0..=0xE6 ↓ 7개 → 0xE0↑ | ① `(0, None, false)` ② 7번째 `(7, None, false)` ③ `(6, None, false)` — 서로 다른 키의 누름은 모두 `repeat false` |
| T11 | `left_and_right_ctrl_z_is_undo` | LCONTROL↓ → Z↓ → Z↑ → LCONTROL↑ → RCONTROL↓ → Z↓ | ② `(2, Undo)` ③ `(1, Undo)` ⑥ `Undo`(J9 좌우 모두, J10) |
| T12 | `ctrl_blocks_enter_shift_slash_and_ctrl_shift_z` | RCONTROL↓ → RETURN↓ → LSHIFT↓ → OEM_2↓ → `1`↓ → Z↓ | ② `None`(Ctrl+Enter) ④ `None`(Ctrl+Shift+`/`) ⑤ `None`(Ctrl+Shift+`1`) ⑥ `None`(Ctrl+Shift+Z, J10) |
| T13 | `ctrl_released_first_keeps_undo` | LCONTROL↓ → Z↓ → **LCONTROL↑** → Z↑ | ② `Undo` ④ **`(0, Undo)`**(Ctrl을 먼저 떼도 뗌 분류 유지, J4) |
| **T14** | `ctrl_after_press_no_reclassify_and_alt_ignored` | Z↓ → LCONTROL↓ → Z↓(자동 반복) → Z↑ → LCONTROL↑ → LMENU↓ → Z↓ | ① `(1, Z)` ③ **`(2, Z, true)`**(`Undo`로 바뀌지 않음, J4·A2) ④ `(1, Z)` ⑦ `Z`(Alt+Z, J11) |
| **T15** | `repeat_keeps_held_and_press_time_class` | LSHIFT↓ → `1`↓ → LSHIFT↑ → `1`↓(반복) → `1`↓(반복) → `held_count()` → `1`↑ | ② `(2, Exclamation)` ③ `(1, None)` ④⑤ **`(1, Exclamation, true)`**(Shift를 뗐어도 누를 때 값, A2·A3) ⑥ `1`(표 불변) ⑦ `(0, Exclamation, false)`(뗌은 항상 `repeat false`) |
| **T16** | `press_after_release_is_not_repeat` | Z↓ → Z↓(반복) → Z↑ → Z↓ → `'A'`(0x41)↓ → `'A'`↓(반복) | ① `(1, Z, false)` ② `(1, Z, true)` ③ `(0, Z, false)` ④ **`(1, Z, false)`**(뗀 뒤 다시 누름 = 첫 누름, A4) ⑤ `(2, None, false)` ⑥ **`(2, None, true)`**(일반 키도 반복 표시, A6) |
| **T17** | `modifier_auto_repeat_suppressed_but_state_kept` | LSHIFT↓ → LSHIFT↓(반복) → LCONTROL↓ → LCONTROL↓(반복) → Z↓ | ① `(1, None, false)` ② **이벤트 없음**(`None`, 수식 키 자신의 반복은 내보내지 않음, A8) ③ `(2, None, false)` ④ **이벤트 없음**(`None`, A8) ⑤ `(3, None, false)`(Ctrl+Shift+Z — 반복 억제가 Shift·Ctrl 눌림 상태를 풀지 않음, J10) |

#### 전역 경로 — `keyboard_event` (W1 하나만)

| # | 이름(안) | 순서 | 기대 |
|---|---|---|---|
| **W1** | `keyboard_event_wires_message_table_and_class` | `keyboard_event(WM_KEYDOWN, VK_SPACE, 1)` → `(WM_KEYDOWN, VK_SPACE, 2)` → `(WM_SYSKEYUP, VK_SPACE, 3)` → `(0x9999, VK_SPACE, 4)` | ① `Keyboard { pressed: true, held: 1, special: Some(Space), repeat: false, ts: 1 }` ② **`Keyboard { pressed: true, held: 1, special: Some(Space), repeat: true, ts: 2 }`**(자동 반복) ③ `Keyboard { pressed: false, held: 0, special: Some(Space), repeat: false, ts: 3 }` ④ `None`(키보드 메시지 아님) |

- W1은 전역 `KEYS`를 쓴다. 다른 테스트가 전역 표를 쓰지 않으므로 `held` 정확값 단언이 유지된다(D8).
- 마우스 테스트(`mouse_buttons_map_left_right_only`, `mouse_move_is_throttled`)는 불변.
- 완료 기준(스킬 §9): `cargo fmt --check`, `cargo clippy -- -D warnings` 경고 0, `cargo test` 전건 PASS. **bridge `events.rs` 테스트(페이로드 리터럴)도 같은 묶음에서 컴파일돼야 한다(§9.2 RB6).**

### 8.2 통합

- 없음. 훅은 사용자 세션이 필요하고, 분류·표·반복 판정은 §8.1에서 끝난다.

### 8.3 수동 체크리스트 (`yarn tauri dev`, 결과·스크린샷은 `doc/300_검증/`에)

증거 수집 원칙(§1.1): **키 정보를 로그·콘솔로 찍어 확인하지 않는다.** 전용 그림 7개(서로 구분되는 시험용 PNG)와 `kb_down`을 등록한 오버레이 화면으로만 확인한다(ui 반영 후). 개발 중 임시 로그 추가도 금지. 부르르(CR-023)는 화면 녹화 또는 연속 스크린샷으로 확인한다.

| # | 확인 | 기대 |
|---|---|---|
| H1 | 앱 시작 | 훅 설치 성공(`HookError` 없음) |
| H2 | 메모장에 포커스, 일반 키 누름·뗌 | 오버레이 누름 → 들림 |
| H3 | 마우스를 빠르게 이동 | 손이 따라오고 CPU 급증 없음(≈60Hz) |
| H4 | 앱 실행 중 다른 앱 타자·단축키 | 입력 지연·누락 없음(`CallNextHookEx`) |
| H5 | 트레이 종료 후 타자 | 시스템 입력 정상(훅 해제) |
| M1 | 스페이스·Enter·Backspace 각각 누르고 있기 → 떼기 | 누르는 동안 각 전용 그림, 떼면 `kb_up` |
| M2 | **한글 모드**에서 ㅋ(Z 키) / 영문 모드 z / Shift+z / Caps Lock 켜고 z | 네 경우 모두 Z 전용 그림(J5) |
| M3 | 왼쪽 Shift+`/`, 오른쪽 Shift+`/` / `/` 단독 / 키패드 `/`(Shift 포함) | `?` 그림 / `?` 그림 / 일반 누름 / 일반 누름(J1·J2) |
| M4 | 왼쪽·오른쪽 Shift+`1` / `1` 단독 / 키패드 1(NumLock 켬·끔, Shift 포함) | `!` 그림 / 일반 누름 / 일반 누름(J3) |
| M5 | Shift+`1` 누른 채 **Shift를 먼저 떼고** 그다음 `1` 떼기 | `1`을 뗄 때 `kb_up`으로 돌아온다(그림이 남지 않음, T4) |
| M6 | `1`을 누른 채 Shift 누르기(반복이 계속 들어오게 1초 이상) | 그림이 `!`로 바뀌지 않는다(J4·A2, T5) |
| M7 | 숫자패드 Enter | Enter 그림(J7) |
| **M8** | Backspace를 2초 누르고 있기(글자가 연속 삭제됨) | 그림은 누르는 내내 Backspace 전용 그림 유지, 젤리는 누른 순간 1회, **반복이 시작되면(약 0.5초 뒤) 부르르, 떼면 즉시 정지**(CR-023) |
| M9 | 전용 그림 7개를 모두 지운 상태에서 M1~M4·M10 | 일반 누름 그림(`kb_down`)으로 동작 |
| M10 | 메모장에서 왼쪽 Ctrl+Z, 오른쪽 Ctrl+Z, **한글 모드** Ctrl+Z | 세 경우 모두 되돌리기(`Undo`) 그림(J9·J10) |
| M11 | Ctrl+Space / Ctrl+Enter / Ctrl+Backspace / Ctrl+Shift+`/` / Ctrl+Shift+`1` / Ctrl+Shift+Z | 모두 일반 누름 그림(J9·J10) |
| M12 | Ctrl+Z 누른 채 **Ctrl을 먼저 떼고** Z 떼기 / Z를 누른 채 Ctrl 누르기 | 앞: Z를 뗄 때 `kb_up`으로 복귀(T13) / 뒤: Z 그림 유지, 되돌리기로 바뀌지 않음(J4, T14) |
| M13 | Alt+Z, Win 키와 함께 Enter(시작 메뉴가 열려도 무방) | Z 그림 / Enter 그림(Alt·Win 무시, J11) |
| **R1** | 메모장에서 `a`를 짧게 톡 누르기(반복 지연보다 짧게) | 젤리만, 부르르 없음(`repeat` 이벤트 없음) |
| **R2** | `a`를 2초 누르고 있기 → 떼기 | 첫 누름 젤리 → 반복 시작부터 부르르 계속 → 떼면 정지·`kb_up`. **누름 프레임이 반복마다 바뀌지 않는다**(반복은 연타가 아님 — ui 요구 RB5) |
| **R3** | `a`를 누른 채 `b`를 눌러 누르고 있기 → `b`만 떼기(`a`는 계속 누름) | `b` 반복 중 부르르 → `b`를 떼면 OS가 `a`를 다시 반복하지 않으므로 **부르르가 멈춘다**(ui 타임아웃, RB4). 그림은 `a` 눌림(일반 누름) 유지 |
| **R4** | 제어판 → 키보드 → 반복 속도 **가장 느리게** / **가장 빠르게** 각각 R2 | 느림: 부르르가 끊기지 않고 이어짐(ui 타임아웃이 최소 반복 속도 ≈2.5Hz보다 김) / 빠름: CPU·메모리 급증 없음, 다른 앱 입력 지연 없음(H4) |
| **R5** | Shift 단독 / Ctrl 단독 2초 누르고 있기 | **부르르 없음**(🔒 사용자 결정, A8 — 수식 키 자신의 자동 반복은 이벤트가 없다. 첫 누름의 젤리만 뜬다) |
| **R6** | 스페이스를 2초 누르고 있기 → 떼기 | 스페이스 전용 그림 유지 + 부르르, 떼면 `kb_up`(반복 중 특수 키 그림이 깜박이지 않음, A2) |
| P-1 | 위 확인 후 `.dev-tauri.log`·앱 데이터 폴더 확인 | 로그에 키·분류·반복 정보(`space`·`question`·`undo`·`repeat`·vk 숫자 등) 없음, 앱 데이터에 settings.json·assets/ 외 새 파일 없음(§1.1) |

- `src-tauri/tests/README.md`의 기존 체크리스트(2번 쾅, 3·4번 손바닥)는 폐기된 기능을 가리킨다 → 이 절로 대체하고 README는 이 문서를 가리키도록 갱신(core-implementer, §11 파급).

## 9. bridge 요구 명세 (계약 확정은 bridge-designer)

### 9.1 CR-021 — `input://keyboard` 페이로드에 `special` 추가 — **런타임 추가·비파괴**

| # | 항목 | 요구 |
|---|---|---|
| B1 | 이벤트 | 이름 불변 `input://keyboard`. 빈도: 키 누름·뗌마다 즉시(CR-023으로 자동 반복 누름이 더해짐 — §9.2) |
| B2 | 페이로드 | `{ pressed: boolean; heldCount: number; special: SpecialKey \| null; ts: number }`. `special`은 **항상 포함**(값이 없으면 `null` — Rust에 `skip_serializing_if` 두지 않음). CR-023으로 `repeat` 추가(§9.2 RB2) |
| B3 | 타입 | TS `type SpecialKey = 'space' \| 'z' \| 'question' \| 'exclamation' \| 'enter' \| 'backspace' \| 'undo'`(🔒 7개). Rust는 `crate::hook::SpecialKey`를 그대로 필드 타입으로 쓴다(`KeyboardPayload { pressed, held_count, special: Option<SpecialKey>, ts }`), `bridge/types.rs`에서 재노출 |
| B4 | 의미 (🔒) | 누름 = 누른 순간의 분류. **뗌 = 그 물리 키를 누를 때 보고한 분류와 같은 값**(Shift·Ctrl을 먼저 떼도 `question`·`exclamation`·`undo`). 누름을 보지 못한 뗌(앱 시작 전에 누르고 있던 키)은 `null`. 분류 밖 키는 누름·뗌 모두 `null`. **Ctrl(좌·우)이 눌린 동안 누른 키는 Shift 없는 Z만 `undo`, 나머지(Ctrl+Shift+Z 포함)는 `null`**(계약 v0.11 §3.7 확정값과 같음). Alt·Win은 판정에 쓰지 않음. 판정 규칙은 §3.1 J1~J11 |
| B5 | 개인정보 (🔒) | 전달 스레드(`lib.rs` input-forwarder)·`emit_input`·ui는 키보드 이벤트·페이로드·`special` 값을 로그·콘솔·파일·저장소에 남기지 않는다. `emit` 실패 로그는 오류 값만(현행 `"입력 이벤트 emit 실패: {e}"` 유지 — 페이로드 미포함) |
| B6 | ui가 얻는 것 | 누름·뗌이 같은 분류값으로 짝지어 오므로, ui는 "지금 눌려 있는 특수 키" 집합을 정확히 유지할 수 있다. 여러 키가 겹칠 때 어떤 그림을 보일지는 ui 설계 몫(§11 확인 필요 2) |
| B7 | 슬롯 대응 | `special` 값 → 에셋 슬롯은 `key_{special}` 규칙과 일치한다(`space` → `key_space` … `backspace` → `key_backspace`, `undo` → `key_undo`, [assets.md](assets.md) §3.7). 대응은 ui/bridge TS 쪽 표로 둔다 — core에는 대응 함수가 없다(hook은 assets를 모른다, 스킬 §1) |
| B8 | 호환성 분류 | IPC 런타임: 추가·비파괴(옛 ui는 모르는 필드를 무시). TS: `KeyboardInputEvent`에 필드 추가 |
| B9 | Rust 컴파일 파급 | `bridge/events.rs` 패턴 `InputEvent::Keyboard { .. }`가 새 필드 누락으로 컴파일 오류 → core hook과 bridge Rust를 한 반영 묶음으로 넣는다 |

- CR-021은 계약 v0.11 §3.7에 반영됐다(`src-tauri/src/bridge/events.rs` 주석·테스트 기준). 새 command 없음, 새 이벤트 없음, 에러 코드 추가 없음.

### 9.2 CR-023 — `input://keyboard` 페이로드에 `repeat` 추가 — **IPC 모양은 추가, 의미는 파괴(동시 반영 필요)**

결론: 필드 하나(`repeat: boolean`, 항상 포함)가 늘고, **`pressed: true` 이벤트가 키를 누르고 있는 동안에도 반복해서 온다.** 모양만 보면 추가지만, `pressed: true`를 "새 누름"으로 세는 현재 ui는 잘못 동작하므로 core·bridge·ui를 한 묶음으로 반영해야 한다.

| # | 항목 | 요구 |
|---|---|---|
| RB1 | 이벤트 | 이름 불변 `input://keyboard`. 새 이벤트 이름 없음(🔒 필드 추가 방식) |
| RB2 | 페이로드 | `{ pressed: boolean; heldCount: number; special: SpecialKey \| null; repeat: boolean; ts: number }`. **`repeat`는 항상 포함**(`false`도 직렬화 — `skip_serializing_if` 없음). Rust `KeyboardPayload { pressed, held_count, special, repeat: bool, ts }` — 필드 순서를 `InputEvent::Keyboard`와 맞춘다. 직렬화 예: 첫 누름 `{"pressed":true,"heldCount":1,"special":"space","repeat":false,"ts":…}`, 반복 `{"pressed":true,"heldCount":1,"special":"space","repeat":true,"ts":…}`, 뗌 `{"pressed":false,"heldCount":0,"special":"space","repeat":false,"ts":…}` |
| RB3 | 의미 (🔒) | `repeat: true` = 이미 눌린 키의 OS 자동 반복 누름. 이때 **항상 `pressed: true`**, `heldCount`는 직전 이벤트와 같음(늘지 않음), `special`은 그 키를 처음 누를 때 보고한 값(재판정 없음 — Shift·Ctrl 변화 무시). **뗌은 항상 `repeat: false`.** 뗀 뒤 다시 누르면 `repeat: false`(첫 누름). **수식 키(Shift·Ctrl·Alt·Win, 좌우 모두) 자신의 자동 반복은 이벤트 자체가 오지 않는다**(🔒 사용자 결정, §3.5 A8 — 그 키를 처음 누를 때·뗄 때는 다른 키와 같다). 어떤 키가 반복되는지는 담지 않는다(§1.1 P1) |
| RB4 | 빈도·멈춤 | 스로틀 없음(§3.5 A5). 빈도는 Windows 키보드 설정을 따른다 — 반복 간격 약 33ms(≈30Hz, 기본·최대)~400ms(≈2.5Hz), 첫 반복까지 250ms~1s(기본 약 500ms). **한 번에 한 키만 반복**(Windows는 마지막에 누른 키만 반복) → 추가 부하 ≤ 약 30건/초. **"반복 멈춤" 사건은 없다** — ui는 뗌(`pressed: false`) 또는 **마지막 `repeat` 이후 일정 시간 무수신**으로 멈춤을 판단한다(예: 다른 키를 눌렀다 떼면 앞 키는 눌려 있어도 반복이 다시 오지 않는다 — §8.3 R3). 타임아웃 값은 ui 결정이며 최소 반복 속도(≈400ms 간격)보다 길어야 끊김이 없다(R4) |
| RB5 | 의미 파괴 — ui 요구 | 현재 `src/state/inputMachine.ts` `onKey`는 `pressed: true`마다 `kbFrame`을 다음 프레임으로 넘기고(137행), `wake`로 `lastInputAt`을 갱신하며, `nextSpecialHeld`가 `special`을 맨 뒤로 다시 넣는다. 그대로 두면 **키를 누르고 있는 동안 누름 프레임이 약 30Hz로 순환**한다(연타 순환 오동작). ui는 `repeat: true`일 때 **누름 프레임 순환·젤리 시작·특수 키 목록 갱신을 하지 않고** 부르르 상태만 갱신해야 한다(ui-designer 결정). 바운스 시작 조건(`startsBounce`)은 반복에서 이미 거짓(`kbDown` 참·특수 키 이미 포함)이지만 명시적으로 걸러내는 편이 안전하다. `wake`(쉬는중 해제·유휴 타이머 갱신)는 "입력이 들어오는 중"이므로 유지가 자연스럽다 — ui 결정 |
| RB6 | Rust 컴파일 파급 | `src-tauri/src/bridge/events.rs:67-71` 패턴 `InputEvent::Keyboard { pressed, held, special, ts }`가 `repeat` 누락으로 **컴파일 오류**. 같은 파일 테스트의 `KeyboardPayload` 리터럴 3곳(147·162·179행 근처)도 `repeat` 누락으로 컴파일 오류 → **core hook + bridge Rust를 한 반영 묶음**으로. 직렬화 예시 테스트는 `"repeat":false`·`"repeat":true`를 포함하도록 갱신 |
| RB7 | 개인정보 (🔒) | B5와 같다 — 반복 이벤트도 전달 스레드·`emit_input`·ui가 로그·콘솔·파일·저장소에 남기지 않는다. ui는 반복 횟수·지속 시간을 누적 저장하지 않는다(부르르 표시에 필요한 "지금 반복 중" 상태만) |
| RB8 | TS 파급 | `src/bridge/types.ts` `KeyboardInputEvent`에 `repeat: boolean`(필수 권장 — 의미 파괴 변경이라 선택 필드로 두면 누락이 조용히 `undefined`로 새어 첫 누름으로 오인된다). 페이로드를 손으로 만드는 테스트 픽스처(`src/state/inputMachine.test.ts`의 `key()` 도우미 등)에 `repeat: false` 필요. 필수/선택 최종 표기는 bridge-designer 결정 |
| RB9 | 반영 순서 | ① bridge-designer: 계약 `contract.md` §3.7·§4 개정(필드·의미·예시·버전) → ② core hook + bridge Rust + TS 타입 + ui 상태 기계를 **한 묶음**. 부득이 나눠야 하면 **ui가 `repeat === true`를 무시하도록 먼저** 반영한 뒤 core·bridge를 넣는다(역순이면 R2의 프레임 순환 오동작이 노출됨) |

- 새 command 없음, 새 이벤트 이름 없음, 에러 코드 추가 없음. `lib.rs` input-forwarder 코드는 바뀌지 않는다(채널 타입·emit 경로 불변, 초당 ≤30건 추가).

## 10. 요구 추적표

| 요구ID | 반영 절 | 상태 |
|---|---|---|
| OV-R-07 — 누름·뗌·동시 키 수 | §2 `InputEvent`, §3.2 `KeyTable`, §8.1 T6·T10·W1 | ✅(구현 완료). **자동 반복의 처리만 CR-023으로 "무시" → "`repeat: true`로 구분"**(첫 누름·뗌 의미 불변) |
| OV-R-22 — 6종 분류(`SpecialKey`), 그 밖의 키 알 수 없음 | §2, §3.1 `classify` J1~J8, §8.1 C1~C7 | ✅ 설계 · 소스 반영(코드 대조 2026-09-24) |
| OV-R-22 — ?·! 판정: 좌우 Shift, 메인 키만, 누른 순간 판정, IME·Caps 무관, 한/영 표준 배열 | §3.1 J1~J5·J8, §8.1 C2~C5·T1~T5·T7·T8, §8.3 M2~M6 | ✅ 설계 · 소스 반영(코드 대조) |
| OV-R-22 보강(🔒 2차) — 좌우 Ctrl 추적, Ctrl 눌림 시 분류 안 함 | §3.1 J9, §3.2 `ctrl_down`, §8.1 C5·C9·T12·T14, §8.3 M11·M12 | ✅ 설계 · 소스 반영(코드 대조) |
| OV-R-22 보강(🔒 2·3차) — Shift 없는 Ctrl + Z = `Undo` | §2 `SpecialKey::Undo`, §3.1 J10, §8.1 C6~C8·T11·T13, §8.3 M10, §9 B3·B4·B7 | ✅ 설계 · 소스 반영(코드 대조) |
| OV-R-22 보강(🔒 2차) — Alt·Win 무시(범위 밖) | §3.1 J11, §8.1 C10·T14, §8.3 M13 | ✅ 설계 · 소스 반영(코드 대조) |
| OV-R-22 — 누르고 있는 동안(뗌에도 분류값) | §2 `special` 주석, §3.2 `apply`, §8.1 T4·T6·T13·W1, §9 B4 | ✅ 설계 · 소스 반영(코드 대조) |
| OV-R-22 — 입력 내용 기록 금지 | §1.1 P1~P6, §3.3, §8.3 P-1, §9 B5 | ✅ 설계 · 소스 반영(코드 대조) |
| OV-R-22 — 전용 그림 표시·바운스·없으면 `kb_down` | §9 B6·B7(요구만) | 부분(ui 몫 — core 해당 없음) |
| **R-tmp-1 (CR-023) — 자동 반복 누름을 `repeat: true`로 구분해 내보냄** | §2 `InputEvent::Keyboard.repeat`, §3.2 `apply`·`keyboard_event`, §3.5 A1·A2·A3·A4, §8.1 T5·T6·T9·T10·T14~T17·W1, §9.2 RB2·RB3 | ✅ 설계 · 소스 반영(코드 대조 2026-09-24) |
| **R-tmp-1 (CR-023) — 어떤 키든(수식 키는 A8 예외)** | §3.5 A6·A8, §8.1 T16·T17, §8.3 R5 | ✅ 설계 · 소스 반영(`is_modifier_vk`, 확인 필요 7 해소) |
| **R-tmp-1 (CR-023) — 반복 빈도·채널 부하(스로틀 판단)** | §3.5 A5·근거 1~5, §4 빈도, §9.2 RB4, §11 D14 | ✅ 설계(스로틀 없음) · 소스 반영(스로틀 코드 없음 — 설계와 일치) |
| **R-tmp-1 (CR-023) — 떼면·반복이 멈추면 정지** | §3.5 A7, §9.2 RB4(뗌 이벤트 + ui 타임아웃), §8.3 R2·R3 | 부분(core는 뗌 이벤트·규칙적 반복 신호까지 소스 반영. 멈춤 판단·떨림 표시는 ui 몫) |
| **R-tmp-1 (CR-023) — 개인정보 P1~P6 유지** | §1.1 P1·P3·P6, §3.3, §8.3 P-1, §9.2 RB7 | ✅ 설계 · 소스 반영(정적 상태 `KEYS`만 유지, 로그 호출 0건) |
| **R-tmp-2 (CR-046) — 키 뗌 유실 복구(누름·클릭 때 남은 칸 대조·정리 + 칸마다 뗌 이벤트)** | §1, §3.7(세부 추적 §3.7.9), §4 그림, §5 U11, §11 D2·D18 개정·D20~D24 | 설계 · 소스 미적용(한/영·한자 키는 K1 실측 전 부분) |
| 마우스 이동·좌우 클릭 | §2, §4 | ✅(기존, 영향 없음. CR-046: 버튼 누름이 정리 트리거 — 마우스 이벤트 자체는 불변) |

## 11. 설계 결정 노트

### CR-021 결정 (2026-09-24)

| # | 결정 | 대안 | 채택 근거 |
|---|---|---|---|
| D1 | **뗌 이벤트에도 `special`을 싣고, 값은 누를 때 정한 분류 그대로** | ① 누름에만 싣기 ② 뗌 때 다시 `classify` | ①이면 ui는 여러 키가 겹칠 때(스페이스를 누른 채 `a`를 뗌 등) 어떤 키가 떨어졌는지 몰라 "누르고 있는 동안"을 지킬 수 없다(`heldCount`만으로는 특수 키가 떨어진 순간을 알 수 없음). ②는 Shift·Ctrl을 먼저 떼면 `1`·Z의 뗌 분류가 바뀌어 `!`·되돌리기 그림이 남는다. 누를 때 값을 칸에 두면 누름·뗌이 항상 짝을 이룬다. overlay 요구 §3 계약 행(「뗌 이벤트 = 뗀 물리 키가 눌릴 때 보고된 분류값」)과 일치 |
| D2 | Shift·Ctrl은 **콜백이 기록하는 `KeyTable`에서 판정**(좌·우 칸) | ① `GetKeyState` ② `GetAsyncKeyState` | ①은 호출 스레드의 입력 상태라 포커스가 없는 훅 스레드에서는 맞지 않는다. ②는 동작하지만 키마다 Win32 호출·unsafe 블록이 늘고, 이미 잡고 있는 표를 두고 같은 정보를 다시 묻는 셈이다(콜백 최소 작업, 스킬 §3-3). 표는 기존 잠금 안에서 칸 4개만 읽는다. ~~한계: 보안 데스크톱에서 Ctrl·Shift를 떼면 눌린 채 남아 분류가 꺼지거나 Z가 `Undo`로 보일 수 있다 — 한계로 수용~~ → **CR-046 개정(2026-09-26, 🔒 확정사항 §6): 이 한계 수용은 폐기한다.** 누름·클릭 때마다 다른 `Down` 칸을 `GetAsyncKeyState`로 대조해 뗌을 놓친 칸을 정리하고, 그 뒤에 `classify`를 한다(§3.7 L5·S4). 그래서 Ctrl+Alt+Del 뒤 남은 Ctrl은 다음 누름 직전에 풀린다. **분류 판정 자체는 여전히 표에서 한다** — 조회는 표 정리에만 쓰고(D22), 호출 수는 "누름마다 × 다른 Down 칸 수"로 묶인다(평상 타자 0회). 이 결정이 기각한 "Shift·Ctrl을 키마다 직접 조회"는 계속 기각이다 |
| D3 | 분류 입력은 `(vk, shift_down, ctrl_down)` 셋 — 🔒 2차 시그니처 `classify(vk, shift_down, ctrl_down) -> Option<SpecialKey>` | 스캔 코드·확장 플래그·Alt/Win 상태까지 전달 | 사용자 규칙(J1~J11)을 모두 이 세 값으로 판정할 수 있다. 입력이 적을수록 "키 정보가 새는 면"도 좁다. (1차 `(vk, shift_down)`에서 사용자 결정으로 확장) |
| D4 | **숫자패드 Enter 포함** | `LLKHF_EXTENDED`로 제외 | 사용자에게 두 키는 같은 "Enter"(같은 줄바꿈)다. 키패드 `/`·`1`을 뺀 이유는 Shift를 눌러도 `?`·`!`가 나오지 않기 때문인데 Enter에는 해당하지 않는다. 가상 키가 같아 플래그 인자를 늘리지 않는다(D3) |
| D5 | 배열은 한국어·영어 표준만(J8), 가상 키 코드 기준 | 스캔 코드(물리 위치) 기준 | 🔒 사용자 규칙. 가상 키 기준이면 `?`·`!`가 "그 배열에서 Shift+`/`·Shift+`1`" 판정과 일치한다. 다른 배열 대응은 요구 없음 |
| D6 | 잠금 오염 시 `PoisonError::into_inner`로 표를 계속 쓴다 | 현행처럼 개수·분류 없이 누름/뗌만 보내기 | 표에는 깨질 불변식이 없다(칸 대입 1회). `extern "system"` 콜백 안의 패닉은 프로세스 중단이라 오염은 사실상 생기지 않는다 — 별도 퇴화 분기를 두지 않아 코드가 짧다. `unwrap`·`expect` 아님(스킬 §5) |
| D7 | `start`·`stop` 때 표 비우기(P4) | 비우지 않기(현행) | 개인정보 규칙 "메모리 보관 금지"를 훅 수명 밖까지 지킨다. 재시작 뒤 이전 실행에서 눌려 있던 키가 자동 반복으로 오판되는 문제도 없어진다. 두 시점 모두 훅 스레드가 없어 잠금 경합 없음 |
| D8 | 표를 `KeyTable` 구조체로 감싸고, 테스트는 지역 인스턴스로 | 전역 `HELD`에 함수만 추가 | 전역 표를 여러 테스트가 동시에 쓰면 `held` 정확값 단언이 흔들린다(cargo test 병렬). 지역 인스턴스는 순수 로직 단위 테스트(스킬 §9)가 된다. 전역 경로는 W1 하나 |
| D9 | `SpecialKey`에 `serde::Serialize`(snake_case)를 hook에서 derive | bridge가 `special_name(SpecialKey) -> &'static str`로 변환(`MouseButton`처럼) | 🔒 페이로드 필드 타입이 `Option<SpecialKey>`로 고정됐다. serde는 기존 크레이트 의존성(모듈 의존 아님)이라 hook의 "다른 모듈 의존 금지"(스킬 §1)에 걸리지 않는다. 직렬화 문자열은 C7이 고정 |
| D10 | 윈도 상수는 `windows` 크레이트 `VK_*`를 `const K_*: u32 = VK_*.0 as u32`로 옮겨 쓴다 | 숫자 리터럴(0x20 …) | 스킬 §2 "FFI 상수는 windows 크레이트 것을 그대로". `VIRTUAL_KEY`는 튜플 구조체라 `match` 패턴에 바로 못 써서 정수 상수로 옮긴다(값 재정의 아님). `Win32_UI_Input_KeyboardAndMouse` 기능은 Cargo.toml에 이미 켜져 있다 — 의존성 변경 없음 |
| D11 | Ctrl 분기를 `classify` **첫 줄**에 두고, 그 안에서는 **Shift 없는 Z만** `Undo` | ① Shift 분기 뒤에 Ctrl 검사 ② Ctrl+Shift+Z도 `Undo`(2차 초안) | 🔒 사용자 규칙 "ctrl이면 Z일 때만 Undo, 그 외 None; ctrl이 아니면 기존 규칙" + 🔒 3차 메인 세션 결정 "Ctrl+Shift+Z는 None"(많은 앱에서 다시 실행, 계약 v0.11 §3.7). 두 갈래가 겹치지 않아 C6 전수 개수(11)로 증명된다 |
| D12 | `Undo`는 `SpecialKey`의 **7번째 변형**(Z와 별개 분류) | `Z` 분류 + 별도 `ctrl` 플래그 전달 | 🔒 사용자 결정(`SpecialKey::Undo`, JSON `"undo"`). 플래그를 내보내면 Ctrl 상태라는 키 정보가 하나 더 밖으로 나간다(§1.1 P1). 분류값 하나로 끝나면 ui도 슬롯 하나(`key_undo`)로 대응한다 |

### CR-023 결정 (2026-09-24)

| # | 결정 | 대안 | 채택 근거 |
|---|---|---|---|
| D13 | 반복 판정 = **`KeyTable` 칸이 이미 `Down`인 누름**(A1) | ① `KBDLLHOOKSTRUCT` 플래그 ② `GetAsyncKeyState`로 직전 상태 확인 | ①에는 반복 비트가 없다(`LLKHF_EXTENDED`·`INJECTED`·`ALTDOWN`·`UP`뿐). ②는 Win32 호출·unsafe 추가이고 표와 같은 정보를 다시 묻는다(D2와 같은 이유). 표는 기존 동작(반복 무시)의 근거와 같은 판정이라 동작 변화가 "무시 → 표시" 하나로 좁다 |
| D14 | **스로틀 없음**(A5) | ① 키당 50ms에 1회 ② 전역 하한 1개(`LAST_REPEAT_MS`) | §3.5 근거 1~5. ①은 키별 시각 저장이라 §1.1 P3(키별 시각 금지)에 걸린다. ②는 P3를 지키지만 OS가 이미 ≤30Hz·한 키로 묶어 막을 부하가 없고, ui 타임아웃 계산에 core 상수를 끼워 넣는다. 요구 기반 최소 설계(스킬 §10) |
| D15 | 비공개 `KeyTable::apply` 반환 `Option<KeyChange>` → **`KeyChange`** | `Option` 유지(항상 `Some`) | `None` 경로가 사라졌는데 `Option`을 두면 "이벤트 없음이 있을 수 있다"는 거짓 문서가 된다. 비공개 함수라 파급은 `keyboard_event` 1곳과 `tests.rs`의 `.expect(..)` 기계적 제거뿐. clippy 영향 없음 |
| D16 | 반복 이벤트에서도 `held_count()`(256칸 세기)를 다시 계산 | 반복이면 직전 값 재사용(캐시 필드) | 칸이 바뀌지 않아 결과가 같다(A3). 캐시는 정적 상태를 늘린다(P3 검사 대상 증가). 초당 ≤30회 × 256바이트 비교는 무시할 양 |
| D17 | "반복 멈춤" 사건을 core가 만들지 않는다(A7) | 훅 스레드에 타이머(`SetTimer`)·별도 감시 스레드로 "N ms 무반복 → 멈춤" emit | 타이머는 Win32 호출·메시지 처리·상태(마지막 반복 시각)를 늘린다. ui는 이미 이벤트 `ts`와 자체 타이머(유휴 판정 등)를 가진다 — 멈춤 판단은 상태 기계(ui) 몫(스킬 §1 hook 금지 "UI 상태 판단") |
| D18 | ~~보안 데스크톱 뒤 "남은 눌림"의 첫 누름은 `repeat: true`로 보고된다(한계 수용)~~ → **CR-046 개정(2026-09-26): 남은 칸은 다음 누름·클릭 직전에 정리되므로, 다른 키를 누르면 자동 반복으로 오판하지 않는다(S6). `repeat: true` 오보는 "뗌을 놓친 바로 그 키를 다른 입력보다 먼저 다시 누른" 첫 누름 1건으로 좁혀지고, 그 키를 떼면 풀린다(§3.7 L7·S7)** | ① 시간 기준 강제 해제 ② 지금 키의 비동기 상태로 반복과 새 누름 구분 | ①은 키별 시각이 필요해 P3 위반이다. ②는 콜백이 그 키의 비동기 상태가 갱신되기 전에 불려 **문서상 판정할 수 없다**(LowLevelKeyboardProc). 문서화되지 않은 동작에는 기대지 않는다. 이전 평가("부르르 1회 정도")는 다른 키 바운스가 전부 멈추는 영향을 빠뜨린 과소평가였다(분석 `.claude/reports/error-overlay-20260926-1720.md`) |
| D19 | 새 이벤트·새 변형이 아니라 **`Keyboard`에 `repeat` 필드 추가** | ① `InputEvent::KeyRepeat` 변형 / `input://keyboard-repeat` 이벤트 | 🔒 사용자 결정(`InputEvent::Keyboard { pressed, held, special, repeat, ts }`). 대안 ①은 옛 ui에 비파괴라는 장점이 있지만 결정과 다르다 — 대신 §9.2 RB5·RB9로 동시 반영을 요구한다 |

### 후보 (요구 없음 — 사용자 판단)

| # | 후보 | 사유 | 넣지 않은 이유 |
|---|---|---|---|
| C1 | 반복 이벤트 전역 하한(예: 16ms, 키 구분 없는 `AtomicU64` 하나) | 매크로 프로그램의 초고속 주입(§3.5 한계) 방어 | 실제 키보드 입력에는 발생하지 않고 실측 사례 없음. §8.3 R4에서 CPU·지연 문제가 보이면 요구로 올린다(P3 위반 없음) |

### 파급 (Grep 2026-09-24)

| 파일·위치 | 변경 | 소관 | 컴파일 |
|---|---|---|---|
| `src-tauri/src/hook/mod.rs` | CR-023: `InputEvent::Keyboard.repeat`, `KeyChange.repeat`, `KeyTable::apply` 본문·반환, `keyboard_event`, 콜백 일반 주석 1줄, `//!`(§3.4) | core-implementer | — |
| `src-tauri/src/hook/tests.rs` | `.expect(..)` 제거, T5·T6(이름 변경)·T9·T10·T14·W1 갱신, T15~T17 추가 | core-implementer | 같은 묶음 |
| `src-tauri/src/bridge/events.rs:25-33` `KeyboardPayload`, `:65-80` `emit_input`, 테스트 147·162·179행 근처 | `repeat: bool` 필드·패턴·리터럴·직렬화 예시 | bridge-implementer | **깨짐**(패턴·리터럴 필드 누락) — hook과 한 묶음 |
| `src-tauri/src/lib.rs` input-forwarder | 코드 변경 없음(채널 타입·emit 경로 불변). RB7 로그 규칙 확인만 | — | — |
| `src/bridge/types.ts` `KeyboardInputEvent`, `src/bridge/events.ts` | `repeat: boolean` | bridge-implementer | TS |
| `src/state/inputMachine.ts:45·126-148`, `src/overlay/index.tsx:144-151`, `src/state/inputMachine.test.ts:9-13` 픽스처 | `repeat` 전달·반복 시 프레임 순환·젤리·특수 키 목록 갱신 제외·부르르 상태(RB5) | ui-designer → ui-implementer | TS |
| `doc/200_설계/bridge/contract.md` §3.7·§4·변경 이력 | §9.2 RB1~RB9 | bridge-designer | — |
| `src/overlay/requirements.md`·`design.md` | CR-023 요구ID 부여(확인 필요 6)·부르르 설계 | ui-designer | — |
| `src-tauri/tests/README.md` | 수동 체크리스트를 §8.3(R1~R6 포함)으로 대체 | core-implementer | — |

### 확인 필요

1. **요구 문서 반영(2차)**: overlay `requirements.md` R-22와 §3 계약 행(`special` 6값, `key_*` 6종)에 Ctrl 규칙·`undo`·`key_undo`가 아직 없다. 확정사항 §5 「특수 키 이미지」 문구도 6종 기준 — 메인 세션(확정사항)·ui-designer(요구) 갱신 필요.
2. **여러 특수 키·일반 키가 겹칠 때 표시 우선순위**(예: 스페이스를 누른 채 Enter, 특수 키를 누른 채 일반 키, Ctrl을 누른 채 Z — Ctrl 누름 자체는 일반 키 그림): core는 누름·뗌 짝(B4)만 보장한다. 어떤 그림을 보일지는 ui-designer 결정(overlay design.md).
3. **`VK_SHIFT`(0x10)·`VK_CONTROL`(0x11) 미포함**: 사용자 규칙대로 좌·우 키만 본다. 일부 프로그램이 `SendInput`으로 넣는 합성 수식 키가 좌우 없는 코드로 올 수 있는지는 실측하지 않았다 — 실제 키보드 입력에는 영향 없음.
4. ~~Ctrl+Shift+Z 분류~~ — **해소(3차, 🔒 메인 세션 결정)**: Ctrl+Shift+Z는 `None`(J10, C8·C9·T12).
5. **Alt·Win 범위 밖(J11)**: Alt+Z는 Z 그림, Alt+Shift+`1`은 `!` 그림이 뜬다. 사용자 미언급으로 범위 밖에 둔다 — 제외를 원하면 요구로 올린다(Ctrl과 같은 방식으로 표에서 판정, Win32 호출 추가 없음).
6. **CR-023 요구ID 미부여**: overlay `requirements.md`·`test/change-requests.md`에 CR-023·부르르 항목이 없다(Grep 2026-09-24). 이 문서는 임시 `R-tmp-1`로 추적한다 — ui-designer가 요구ID를 부여하면 §1·§10을 바꾼다.
7. ~~수식 키 단독 꾹 누름의 떨림~~ — **해소(🔒 사용자 결정 2026-09-24)**: Shift·Ctrl·Alt·Win(좌우 모두) 자신의 자동 반복은 이벤트를 내지 않는다(A8). §8.3 R5로 실측(부르르 없음).
8. **ui 타임아웃 값(RB4)**: "반복이 멈추면 정지"는 ui 타임아웃이다. 최소 반복 속도(≈400ms 간격)와 최대 첫 반복 지연(1s — 이 동안은 아직 `repeat`가 오지 않으므로 부르르 전)을 고려해 ui-designer가 정한다.
9. **CR-046 요구ID 미부여**: overlay `requirements.md`에 뗌 유실 복구 요구ID가 없다. 이 문서는 임시 `R-tmp-2`로 추적한다. ui-designer가 요구ID를 부여하면 §1·§3.7.9·§10을 바꾼다.
10. **CR-046 방식 사용자 확인**: §3.7(D20 (a)+클릭 트리거, D21 칸마다 뗌 이벤트)은 설계자가 확정한 초안이다. 사용자 확인 뒤 상태를 「확정(사용자)」로 올리고 core-implementer에 넘긴다.
11. **CR-046 이벤트 순서(RC3)**: 정리 뗌(`input://keyboard`) 다음에 마우스 버튼 이벤트가 올 때 서로 다른 이벤트 이름 사이의 WebView 도착 순서가 보존되는지 bridge-designer가 확인해야 한다. 같은 이름(`input://keyboard` 뗌 다음 누름)은 한 채널·한 forwarder의 순서를 따른다.

### CR-046 후보 (요구 없음 — 조건부)

| # | 후보 | 사유 | 넣지 않은 이유 · 승격 조건 |
|---|---|---|---|
| C2 | IME 토글 키(`VK_HANGUL` 0x15·`VK_HANJA` 0x19) 특례: 누름을 "누름 + 즉시 뗌" 두 이벤트로 내보내고 표에 남기지 않음 | OS 비동기 상태조차 그 키의 뗌을 모르면(§3.7 H-c) (a)로는 풀리지 않는다 | 뗌이 실제로 오는 환경(T7 전제)에서는 "누름 못 본 뗌"이 추가로 생기고, 원인 ③ 하나만 막는다. **§3.7.7 K1이 실패할 때만** 요구로 올린다. 그때 T7 기대값·ui 영향(짧은 누름-뗌 쌍)을 함께 설계한다 |
| C3 | 마우스 이동에서도 정리(저빈도, 예: 이동 이벤트 1초에 1회) | §3.7 H-b — 이동만 할 때 키보드 그림이 "눌림"으로 남음 | 요구 증상(바운스·분류)은 누름·클릭에서만 판단되므로 해당 없음. 이동 콜백에 시각 비교·잠금이 붙는다. 사용자가 그림 고정을 문제로 보면 요구로 올린다 |
