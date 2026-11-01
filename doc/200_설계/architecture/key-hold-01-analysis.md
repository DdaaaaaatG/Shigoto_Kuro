# key-hold 구조 분석

- 작성: 2026-11-01 · system-architect (읽기 전용 분석)
- 대상: 횡단 기능 「키 그림 최소 유지 시간」 — 키를 눌러 키보드 그림이 바뀌면(일반 `kb_down_N`·특수 `key_*`) 키를 빨리 떼도 **누른 시점부터 최소 N ms**는 그 그림을 보인 뒤 돌아간다. N은 설정 창에서 조절한다.
- 사용자 요구 원문(🔒 2026-11-01): 「백스페이스 혹은 엔터키 와 같은 특수키를 누를때 이미지 변경되어서 보이는거 있잖아 그거 너무 순식간에 변해버려서 속도조절같은거 있음 좋지않을까? 일반 타자도 그렇고」
- 사용자 결정(🔒 2026-11-01, 메인 세션 인터뷰): ① 방식 = 최소 유지 시간(꾹 누르면 뗄 때까지 유지 — 기존), 페이드 없음 ② 설정 창에서 N 조절.
- 작업 모드: 보강(대상 전부 구현됨 — overlay 키보드 레이어·설정 창 기본 탭·core settings·contract v1.1).
- 참조 리포트: 없음 — 이 세션은 서브에이전트로 실행돼 core-analyst·bridge-analyst 위임이 동작하지 않는다. 사실은 Read·Grep으로 직접 확인했다(줄 번호는 2026-11-01 HEAD `89ea931` 기준).

**결론.** 바꿀 곳은 세 계층 모두다 — core는 설정 필드 1개(`key_hold_ms`)와 프리셋 분류 가드, bridge는 `Settings` 타입 필드·상수·기본값(계약 추가, 비파괴), ui는 오버레이 「보이는 키 상태」 파생과 설정 창 슬라이더 1개. **입력 상태기계(`src/state/inputMachine.ts`)는 바꾸지 않는다.** 오버레이의 그림 선택 함수(`pickKeyboardEntry`·`pickPenKeyboardEntry`·`isSpecialShown`·`pickPenEntry`·`wrapMotion`)는 전부 `MachineState`의 키 필드 4개(`kbDown`·`kbFrame`·`specialHeld`·`clickHeld`)만 읽으므로, 그 4개를 유지 시간 동안 덮어쓴 「보이는 상태」를 넘기기만 하면 함수 본문은 그대로다. 비유: 무대 감독(상태기계)은 배우가 퇴장하는 순간을 정확히 적고, 조명 담당(보이는 상태)은 「최소 0.15초는 조명을 비춘다」는 규칙으로만 끈다 — 감독의 대본은 고치지 않는다.

## 0. 횡단 판별

| 신호 | 판정 근거 |
|---|---|
| 계층 수 | core(`settings` 필드·검증·보정, `presets` PS-02 분류) · bridge(`Settings` 타입·상수·`DEFAULT_SETTINGS`, contract §3.3·§5.3·§5.11) · ui(overlay 표시 파생, settings 기본 탭 슬라이더·문구 3개 국어·프리셋 설명 문구) — **3개** |
| 계약 | `Settings`에 필드 추가(`keyHoldMs`) — 기존 필드 제거·의미 변경 없음 |
| 입력 상태기계 | **불변** — 표시 파생을 상태기계 밖(새 순수 모듈)에 둔다(§7-1) |
| 설정 JSON | 키 1개 추가. 컨테이너 `#[serde(default)]`라 버전·마이그레이션 코드 없음 |

→ **횡단.** 단일 매니저로 보낼 수 없다.

## 1. 데이터 흐름 (현재)

```
hook(WH_KEYBOARD_LL) ─ input://keyboard {pressed, heldCount, special, repeat, ts(epoch ms — hook/mod.rs:511 now_ms)} ─┐
hook(WH_MOUSE_LL)    ─ input://mouse-button {button, pressed, ts} ──────────────────────────────────────────────┤
                                                                                                                ▼
OverlayApp (src/overlay/index.tsx)
  useReducer(reducer = reduce(state, input, configRef.current), Date.now(), createInitialState)   (124~129행)
  tick 100ms ─▶ reduce({type:'tick'}) — 바뀐 게 없으면 같은 객체를 돌려준다(onTick 274행) → 리렌더 없음
  렌더(219~234행):
   motion       = wrapMotion(machine)                  → .hairWrap / .jellyWrap 클래스(젤리·부르르)
   specialShown = isSpecialShown(manifest, machine)    → .canvas.specialShown (CR-071 팔·펜 손 숨김)
   restOnly     = machine.layer==='rest' && hasRest     → .canvas.restOnly (R-41)
   <LayerStack machine={machine}>  body · state(machine.layer) · kb = penMode ? pickPenKeyboardEntry : pickKeyboardEntry
   <PenHand machine={machine}>     pickPenEntry = isPressing(machine) ? pen_down_0 : pen_up
   <MouseArm cursor={machine.mouse} button={machine.mouse.button} atRest={armAtRest}>   (클릭 파츠 R-09)

키 뗌(heldCount 0) ─▶ onKey: kbDown=false, specialHeld=[] ─▶ 같은 커밋에서 kb_up · 팔 다시 보임 · 젤리 클래스 빠짐(애니메이션 끊김)
```

설정 경로(`idleSeconds` 선례, 새 키가 그대로 따른다):

```
settings 창 ScaleIdleCard.commitIdle ─ setSettings({...settings, idleSeconds}) ─invoke set_settings─▶ bridge
  ─▶ settings::update(잠금 안: keep_core_owned 병합 → validate → write_atomic → 메모리 대입) ─▶ settings://changed
  ─▶ overlay useBridgeEvent(onSettingsChanged, setLocalSettings) ─▶ config.idleMs 재계산
앱 시작 settings::load → 범위 밖 idle_seconds clamp(경고 로그) → validate
프리셋 save/apply ─ PresetSettings{scale, idle_seconds, mouse, timer}(PS-02) ─ merge_into(cur)
전체 초기화 data_reset::reset_settings ─ Settings{autostart, language, ..Default}
```

## 2. 계약 목록 (관련분 — contract.md v1.1)

| 종류 | 이름 | 페이로드 | 현재 의미 | 소비자 |
|---|---|---|---|---|
| 타입 | `Settings` (§3.3, 269행~) | `scale`·`idleSeconds`·`overlay`·`mouse`·`autostart`·`language`·`positionLock`·`showInTaskbar`·`timer` | 전부 필수 필드, Rust는 컨테이너 `#[serde(default)]`(키 없음 = `Settings::default()` 값) | 두 창 |
| command | `get_settings` / `set_settings` | → `Settings` / `Settings` → `Settings` | §5.3 처리 순서 1단계 `settings.validate()` 실패 = `settings.invalid`(아무것도 안 바뀜) | overlay(읽기·Ctrl+휠 저장), settings 창 |
| event | `settings://changed` | `Settings` | 저장 성공 때 1회 | 두 창 |
| event | `input://keyboard` | `KeyboardInputEvent` `{pressed, heldCount, special, repeat, ts}` | `ts` = Unix epoch ms(§2 56행, 669행) — `Date.now()`와 같은 시계 | overlay `dispatch` |
| event | `input://mouse-button` | `{button, pressed, ts}` | 즉시 | overlay(펜 모드 클릭 = 키 누름 CR-027) |
| command | `save_preset`·`apply_preset`·`export_preset`·`import_preset` | §3.11·§5.11 | PS-02 「설정 4필드」(`scale`·`idleSeconds`·`mouse`·`timer`) | settings 창 프리셋 탭 |
| TS 상수 | `SCALE_MIN`·`SCALE_MAX`·`TIMER_*_MIN/MAX` (`src/bridge/types.ts` 213~220·400행) | — | 범위 상수는 bridge가 소유하고 화면이 import(화면에 숫자 직접 금지 — general-tab.md §3.3 `percentBounds`) | settings 창 |

## 3. 상태 기계 (현재)

### 3.1 입력 상태기계 `src/state/inputMachine.ts` — 이번 변경에서 **불변**

| 필드 | 바뀌는 때 | 그림·모션 소비자 |
|---|---|---|
| `kbDown` | 키 누름/뗌(`heldCount > 0`) | `pickKeyboardEntry`·`pickPenKeyboardEntry`·`pickSpecialEntry`(→ `isSpecialShown`), `isPressing` |
| `kbFrame` | 새 누름(키·펜 모드 클릭)마다 +1 순환, 자동 반복은 불변 | `pickKeyboardEntry` |
| `specialHeld` | 특수 키 누름 추가·뗌 제거·`heldCount 0`이면 비움 | `currentSpecial` → `pickSpecialEntry` |
| `clickHeld` | 펜 모드 클릭 누름 추가·뗌 제거 | `isPressing` → `pickPenEntry`·`wrapMotion` |
| `bounceSeq` | **새 누름마다 +1**(키 새 누름, 펜 모드 새 클릭 누름). 뗌·자동 반복·같은 버튼 중복은 불변 | `bouncePhase`·`wrapMotion` — 이번 설계에서 「새 누름 신호」로 재사용 |
| `repeating`·`lastRepeatAt`·`shiverSeq` | 자동 반복(CR-023) | `isRepeating`·`wrapMotion`(부르르) |
| `layer`·`lastInputAt` | 유휴·입력 | `LayerStack` 상태 그림, `restOnly`, `setResting` |
| `mouse` | 이동·버튼 | `MouseArm`(커서·클릭 파츠), `PenHand`(커서) |

- 「뗌 = 즉시 복귀」는 상태기계가 아니라 **그림 선택 함수가 `kbDown`·`specialHeld`를 그대로 읽기 때문**에 생긴다. 그래서 키 필드 4개만 덮어쓴 「보이는 상태」로 해결할 수 있다(§7-1).
- `bounceSeq`는 이미 「새 누름」을 정확히 가려낸다(자동 반복·뗌 제외, 키·펜 클릭 공통). 유지 시작 판정에 그대로 쓴다.

### 3.2 모션 (design.md §10.3)

- 렌더 루프 없음: `requestAnimationFrame` 사용 0건(`src/` 비테스트 grep). 모든 움직임은 CSS 애니메이션(`.jelly`·`.jellyAlt` 350ms 1회, `.shiver` 80ms 무한)이고 클래스 부착으로 켠다.
- 젤리는 「누르고 있는 동안만」 클래스가 붙어 있고 **떼면 그 순간 끊긴다** — design.md §10.8 「젤리 길이(기존과 같음)」에 as-built로 명시. `wrapMotion` ②(`!isPressing → null`).
- tick 100ms는 유휴·반복 방어용이며, 바뀐 게 없으면 같은 객체를 돌려줘 리렌더를 만들지 않는다. 100ms 해상도라 「150ms 유지」의 만료 신호로는 부정확하다.

## 4. 설정 스키마 (현재)

| 키 | Rust | 범위·검증 | 읽기 보정 | 프리셋 | 초기화 |
|---|---|---|---|---|---|
| `idleSeconds` | `idle_seconds: u32` (`settings/mod.rs:159`) | `validate` 60~3600 → `settings.invalid`(252행) | `load`에서 clamp + 경고 로그(292~303행, D24) | PS-02(`presets/format.rs:63`) | `..Settings::default()` |
| `scale` | `f64` | 0.25~2 | 없음(거부) | PS-02 | 기본값 |

- 컨테이너 `#[serde(rename_all = "camelCase", default)]`(156행) — 키가 없는 옛 파일은 `Settings::default()`의 그 필드 값.
- `u32` 필드에 음수·소수가 들어간 파일은 serde 형식 오류 → `load_or_default`가 **파일 전체를 기본값으로 대체**한다. `idleSeconds`도 같은 기존 위험이다(새 위험 아님).

## 5. 확인 결과 (브리프 가정 대조)

| # | 항목 | 결과 |
|---|---|---|
| F-1 | `ts` 시계 | `input://keyboard`·`mouse-button`의 `ts`는 hook의 `SystemTime` epoch ms(`hook/mod.rs:511~514`), 계약 §2 「Unix epoch 밀리초」. `Date.now()`와 비교 가능 → 「눌린 시점 = 이벤트 `ts`」 가정 성립. 시스템 시계가 바뀌면 차이가 튈 수 있다 → 지연을 0~500ms로 상한(02 §5b A-3). |
| F-2 | 렌더 루프 | rAF 없음, 모션은 CSS. **setTimeout 1개**(새 누름마다 교체)가 기존 구조와 맞다. tick은 해상도 100ms·무변화 시 리렌더 없음이라 부적합. |
| F-3 | 그림 선택 함수 입력 | `pickKeyboardEntry`·`pickPenKeyboardEntry`·`pickSpecialEntry`·`isSpecialShown`(`LayerStack.tsx:73~118`), `pickPenEntry`(`PenHand.tsx:45~51`), `wrapMotion`·`isPressing`·`isRepeating`(`inputMachine.ts:155~183`)이 읽는 키 필드는 `kbDown`·`kbFrame`·`specialHeld`·`clickHeld`뿐. `heldCount`는 렌더에서 안 쓴다. |
| F-4 | `settings/mod.rs` 크기 | **777줄(한계 800).** 필드·기본값·검증·보정을 여기 다 넣고 테스트까지 넣으면 넘는다 → 상수·검증·보정·테스트는 새 파일 `settings/key_hold.rs`(timer.rs 선례), `mod.rs`는 10여 줄만. |
| F-5 | `Settings` 구조체 리터럴 | core·tests의 생성부는 전부 `..Settings::default()`/`..incoming` 확장을 쓴다 → 필드 추가로 깨지지 않는다. **유일한 예외는 의도된 가드** `PresetSettings::from_settings`의 구조 분해(`presets/format.rs:78~88`) — 필드가 늘면 컴파일이 깨져 PS-02/PS-03 분류를 강제한다. core 패킷이 반드시 분류해야 한다. |
| F-6 | 프리셋 키 단언 | `presets/format.rs:312` `assert_eq!(keys, ["idleSeconds", "mouse", "scale", "timer"])` — PS-02에 넣으면 이 단언을 고친다. 내장 프리셋 2개는 `doc/assets/presets/{1,2}/preset.json` 원문을 `include_bytes!`(builtin.rs:50~62) — 키가 없으면 컨테이너 default로 읽힌다. |
| F-7 | 계약 범위 상수 관례 | `SCALE_MIN/MAX`·`TIMER_*_MIN/MAX`가 `src/bridge/types.ts`에 있고 화면은 import만 한다. 새 범위도 bridge 상수로 둔다. |
| F-8 | **TS 테스트 픽스처** | ① overlay 테스트 19개 파일이 `{ ...DEFAULT_SETTINGS, … }`로 픽스처를 만든다 → `DEFAULT_SETTINGS.keyHoldMs = 150`이 그대로 들어가 **ui 구현 뒤 기존 「뗌 즉시 kb_up·젤리 끊김·펜 손 pen_up」 단언이 실패**한다(예: `OverlayApp.jelly.test.tsx:248` `key(false,0)` → `'jellyWrap'`·`'u:kb_up'`). ② settings 테스트 약 47곳 + overlay 5곳이 `Settings` **전체 리터럴**(spread 없음)이다(예: `GeneralTab.test.tsx:44`, `SettingsApp.test.tsx:173`) → TS 필수 필드를 더하면 `yarn tsc --noEmit`이 그곳마다 TS2741. tsconfig `include: ["src"]`라 테스트도 타입 검사 대상. v0.21 `timer` 필수 필드 추가 때도 같은 갱신을 했다(픽스처 주석 「contract v0.21(CR-045) 필수 필드」). |
| F-9 | R-22 개인정보 문구 | overlay R-22(🔒) 「누르고 있는 동안, 떼면 기본 … 입력 내용은 절대 기록하면 안 된다」, design §10.6 「`specialHeld`에만 잠시 있다(지금 눌린 것만, 떼면 삭제)」. 유지 시간 동안 특수 키 그림을 보이려면 **뗀 뒤에도 분류값 1개를 최대 N ms 들고 있어야 한다** → 문구 개정이 필요하다(02 D-6). |
| F-10 | R-07·R-22 「떼면 들림/기본」(🔒) | 이번 요구가 이 두 문장의 시점을 바꾼다(「떼면」 → 「떼고, 누른 시점부터 N ms가 지나면」). 요구 개정 표기 필요. |
| F-11 | §10.6 5행 타이밍 | 「스페이스를 누른 채 Enter 누름 → Enter 뗌 → `key_space`로 즉시 복귀」가 유지 시간 동안 `key_enter`로 남았다가 `key_space`로 바뀐다(결과 그림은 같고 시점만 늦어짐). 문서 표 갱신 대상. |
| F-12 | 설정 창 슬라이더 패턴 | `useSliderDraft(saved, commit)` → `{shown, onChange, onPointerUp, onKeyUp, onBlur}`(`components/useSliderDraft.ts`) — 끄는 동안 초안, 놓을 때 1회 저장, 키보드는 300ms 뒤 1회. TimerTab·AlarmSoundCard가 쓴다. 새 슬라이더가 세 번째 사용처. `ScaleIdleCard.tsx` 175줄(한계 400). |
| F-13 | 작업 트리 | 미추적 파일 `추후 넣을거.txt` 1개뿐 — 패킷 대상과 겹치지 않는다. 최신 CR: overlay CR-071, settings CR-070(번호는 두 화면 공용 일련) → 예상 overlay **CR-072**, settings **CR-073**. 최신 요구: overlay R-41, settings R-68. |

## 6. 영향 범위

| 계층 | 코드 | 문서 |
|---|---|---|
| core | `src-tauri/src/settings/key_hold.rs`(신규), `settings/mod.rs`(필드·기본값·검증·보정 호출·`//!`), `presets/format.rs`(PS-02 필드·가드·보정·키 단언), `presets/mod.rs`(`//!` 1줄) | `doc/200_설계/core/settings.md`, `doc/200_설계/core/presets.md` |
| bridge | `src/bridge/types.ts`(필드·상수·`DEFAULT_SETTINGS`), `src/bridge/__tests__/types.test.ts`. Rust 코드 변경 없음(`bridge/types.rs`는 core `Settings` 재노출) | `doc/200_설계/bridge/contract.md` v1.2 |
| ui overlay | `src/state/keyHold.ts`(신규 순수 모듈), `src/overlay/index.tsx`(합성 리듀서·만료 효과·보이는 상태 전달), 테스트 픽스처 19개 파일 `keyHoldMs: 0` | `requirements.md`(R-42 신설·R-07/R-22/R-23 주석)·`design.md`(§10.18 신설·§10.3·§10.6·§10.8·§4·§7·§13)·`design/functions.md`·`design/components.md`·`manual.md`·`test/scenarios.md`·CR 대장 |
| ui settings | `components/ScaleIdleCard.tsx`(슬라이더 1개), `generalValues.ts`(단계 상수), `i18n/{types,ko,ja,en}.ts`(새 키 3개 + `presetSaveDesc` 개정), 테스트 픽스처 약 47곳 `keyHoldMs` | `requirements.md`(R-69 신설·R-59 개정)·`design/general-tab.md`·`design/i18n.md`·`design/presets-tab.md`·`manual.md`·`test/scenarios.md`·CR 대장 |
| 공용 ui | 없음(`useSliderDraft` 재사용, 변경 없음) | — |
| 메인 세션 | — | `doc/000_프로젝트_확정사항.md` §4·§5·§6, `CLAUDE.md` §9 |

## 7. 문제점·제약

1. **입력 상태와 표시 상태를 섞지 않는다.** `inputMachine`에 유지 필드를 넣으면 `kbDown`의 뜻(「지금 눌려 있다」)이 흐려지고, `isPressing`·`wrapMotion`·쉬는중 판정 테스트(inputMachine.*.test.ts 4개 파일)를 모두 다시 봐야 한다. 상태기계는 사실(눌림·뗌)만, 표시 파생은 별도 순수 모듈이 맡는다.
2. **새 누름 판정은 하나로.** 「새 누름」을 따로 다시 판정하면(예: `pressed && !repeat`) 펜 모드 클릭·같은 버튼 중복·자동 반복 규칙을 두 군데서 유지해야 한다. 상태기계가 이미 계산한 `bounceSeq` 증가를 신호로 쓴다.
3. **리렌더 증가 없음.** 키 입력마다 렌더가 한 번 더 생기면 안 된다(design §10.3 6번 — 반복 누름 30Hz 렌더 수용 범주). 유지 스냅숏은 리듀서 안에서 같은 커밋에 만들고, 만료 때 1회만 렌더한다.
4. **0 = 현행 동작.** 유지 시간 0이면 보이는 상태가 입력 상태와 같은 객체여야 한다 — 기존 테스트 전부를 회귀 기준으로 쓸 수 있다(F-8 픽스처 `keyHoldMs: 0`).
5. **타이머 누수 금지.** 만료 타이머는 언제나 최대 1개, 언마운트·새 누름 때 해제. 쉬는중 진입(무입력 ≥ 60초)과 유지(≤ 500ms)는 시간상 겹치지 않는다.
6. **계층 간 과도 실패.** bridge가 TS 필수 필드를 더한 순간부터 ui 테스트 픽스처가 `yarn tsc --noEmit`에서 실패한다(F-8 ②). bridge-implementer는 ui 테스트를 고치지 않으므로 bridge 완료~ui 0단계 사이 과도 실패를 문서화한다(rest-display A-5 선례). vitest 실행은 영향 없음(ui가 아직 필드를 읽지 않는다).

## 8. 종단간 RTM (요약 — 상세는 02-design §6)

| 요구ID | 요구 | ui | bridge | core | 설정 키 |
|---|---|---|---|---|---|
| KH-01 | 바뀐 키 그림을 누른 시점부터 최소 N ms 유지(일반·특수), 꾹 누름은 뗄 때까지 | overlay `keyHold`·`visibleMachine` → `LayerStack` | `Settings.keyHoldMs` | `key_hold_ms` | `keyHoldMs` |
| KH-02 | 유지 중 새 누름 = 즉시 교체, 유지는 새 누름 기준 재시작 | `nextKeyHold`(`bounceSeq`) | — | — | — |
| KH-03 | N = 0이면 현행과 같음 | `nextKeyHold` 0 → `null` | 범위 0 포함 | 범위 0 포함 | `keyHoldMs` |
| KH-04 | 보이는 그림 기준 일관 — 특수 키 중 팔·펜 손 숨김(CR-071)·펜 손(CR-027/042)·젤리(CR-066) | `isSpecialShown`·`PenHand`·`wrapMotion`에 보이는 상태 | — | — | — |
| KH-05 | 상태기계 불변, 쉬는중·언마운트·설정 변경 때 타이머 누수·잔상 없음 | 만료 효과 | — | — | — |
| KH-06 | 저장·기본 150·범위 0~500·검증·옛 파일 호환·초기화 | `DEFAULT_SETTINGS` | contract §3.3·§5.3 | `settings::key_hold` | `keyHoldMs` |
| KH-07 | 설정 창 「크기 · 반응」 카드 슬라이더, 3개 국어 | settings `ScaleIdleCard` | `setSettings` | `update` | `keyHoldMs` |
| KH-08 | 프리셋에 포함(PS-02) | settings `presetSaveDesc` | contract §5.11 | `PresetSettings` | `keyHoldMs` |
| KH-09 | 개인정보 — 유지 스냅숏은 마지막 누름 1건·≤500ms·이력 없음 | `keyHold` 스냅숏 최소화 | — | — | — |
