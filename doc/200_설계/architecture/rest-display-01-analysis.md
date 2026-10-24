# rest-display 구조 분석

- 작성: 2026-10-24 · system-architect (읽기 전용 분석)
- 대상: 횡단 기능 「쉬는중 단독 표시 + 카운트다운 쉬는중 자동 일시정지」
- 사용자 결정(🔒 2026-10-24, 메인 세션 AskUserQuestion): ① 쉬는중이면 카운트다운도 자동 일시정지, 입력으로 풀리면 자동 재개(사용자 일시정지 `paused`는 지금처럼 자동 재개 없음) — 2026-09-26 결정 「쉬는중에도 계속 줄어듦」을 뒤집는다 ② 쉬는중이면 배경(`background`)과 쉬는중 그림(`rest`)만 보인다.
- 작업 모드: 보강(대상 전부 구현됨).
- 참조 리포트: 없음 — 이 세션은 서브에이전트로 실행돼 core-analyst·bridge-analyst 위임이 동작하지 않는다(위임문 지시). 사실은 Read·Grep으로 직접 확인했다.

**결론.** 바꿀 곳은 네 군데다 — core `Timer::set_resting`의 카운트다운 조기 반환 1줄, bridge 계약 문서·주석·테스트 1건, overlay `.canvas` 클래스 토글(CSS 숨김), settings 문구 1개와 시작 시간 잠금 식 1개. 입력 상태기계·`TimerStatus`·`TimerSnapshot` 모양·트레이 메뉴·`timerClock` 계산식은 바꾸지 않는다. 비유: 극장에서 배우가 잠깐 자리를 비우면 무대 조명(배경)과 「휴식 중」 팻말(rest)만 켜 두고 나머지 소품은 막 뒤로 가린다 — 소품을 창고로 치우지는 않는다(언마운트 안 함). 무대 위 시계도 같이 멈춘다.

## 0. 횡단 판별

| 신호 | 판정 근거 |
|---|---|
| 계층 수 | core(`timer`) · bridge(`set_resting` 의미, contract §3.9·§5·§5.8) · ui(overlay 표시, settings 문구·잠금) — **3개** |
| 계약 | `set_resting`의 카운트다운 의미가 「no-op」에서 「`running`↔`restPaused`」로 바뀐다(타입·시그니처 불변) |
| 입력 상태기계 | **불변** — `layer: 'idle' \| 'rest'`·`wake`·`onTick` 그대로 |
| 설정 JSON | 변경 없음 |

→ **횡단.** 단일 매니저로 보낼 수 없다.

## 1. 데이터 흐름 (현재)

```
hook(keyboard·mouse) ─ input://keyboard · input://mouse-move · input://mouse-button ─▶ OverlayApp.dispatch
                                                                                  └▶ state/inputMachine.reduce
OverlayApp tick 100ms ─▶ reduce({type:'tick'}) ─ idleMs(=idleSeconds×1000, 60~3600초) 무입력 ─▶ layer 'rest'
입력 1건 ─▶ wake() ─▶ layer 'idle'

OverlayApp effects (src/overlay/index.tsx:199-207)
 ├ [machine.layer] rest 진입 → setArmAtRest(true)
 └ [machine.layer] setResting(layer === 'rest') ─invoke set_resting─▶ bridge::commands::set_resting
        └ do_set_resting → core Timer::set_resting(resting, now) → changed?
             └ true → crate::publish_timer_change(app, &snap)
                    ① timer://changed emit ② tray::sync_timer_menu ③ timer_waker.wake(마감 재계산)

OverlayApp render (src/overlay/index.tsx:234-276) — 실제 자식 순서
 .canvas
  ├ .hairWrap{HairLayer}            (hair 등록 시에만, jellyClass(motion, hairWrap))
  ├ BackgroundLayer                  (memo)
  ├ PomodoroLayer                    (memo; char → bubble → TimerText{useTimerSnapshot·useElapsedText·useAlarmOnFinish})
  └ .jellyWrap(jellyClass(motion))
      ├ MouseArm                     (settings.mouse && monitors.length > 0)
      ├ LayerStack                   (body · state = findEntry(manifest, machine.layer) · kb)
      └ PenHand                      (settings.mouse)

timer://changed ─▶ useTimerSnapshot ─▶ overlay TimerText / settings TimerTab·TimerPreview
                                       └ timerText(snapshot, receivedAt, now) (src/components/utils/timerClock.ts)
트레이·오버레이 오른쪽 클릭 메뉴 ─ tray_timer_view(enabled, status) (src-tauri/src/tray/timer_menu.rs)
```

## 2. 계약 목록 (관련분 — contract.md v1.0)

| 종류 | 이름 | 페이로드 | 현재 의미 | 소비자 |
|---|---|---|---|---|
| command | `set_resting` | `resting: boolean` → `TimerSnapshot` | 스톱워치 `running→restPaused`·`restPaused→running`, **카운트다운이면 항상 변화 없음**(§5 1044행, §5.8 규칙 5 1240행) | overlay `OverlayApp` 쉬는중 보고 효과(반환값 안 씀) |
| command | `get_timer` | → `TimerSnapshot` | 부수 효과 없음 | `useTimerSnapshot`(두 창) |
| command | `control_timer` | `action` → `TimerSnapshot` | 전이표 §5.8 — `restPaused`에서 start/pause/stop은 이미 모드 무관 | settings `TimerTab`, 트레이(core 직접) |
| event | `timer://changed` | `TimerSnapshot` | 상태 변화 때만 | `useTimerSnapshot` |
| 타입 | `TimerStatus` | `'stopped'\|'running'\|'paused'\|'restPaused'\|'finished'` | 주석 「restPaused … 스톱워치 전용」(790행), 상태×모드 표 「카운트다운: 생기지 않음」(843행) | 위 전부 |
| 타입 | `TimerSnapshot` | `{status, elapsedMs, mode?, durationMs?}` | 불변 | 위 전부 |
| 테스트 목록 | §5.8 (1246행) | — | `set_resting_countdown_noop` | bridge-implementer |

## 3. 상태 기계 (현재)

### 3.1 입력 상태기계 `src/state/inputMachine.ts` — 이번 변경에서 **불변**

| 상태(`layer`) | 진입 | 전이 | 타이머 |
|---|---|---|---|
| `idle` | 시작·입력(`wake`) | `tick`에서 `now − lastInputAt ≥ idleMs` → `rest` | tick 100ms |
| `rest` | 위 | 키·마우스 이동·클릭 1건 → `wake` → `idle` | — |

### 3.2 core `Timer` (`src-tauri/src/timer/mod.rs`)

- 스톱워치: `Running` +`set_resting(true)` → `RestPaused`(freeze), `RestPaused` +`set_resting(false)` → `Running`(run). 그 밖 `false`.
- 카운트다운: `set_resting` 첫 줄 `if self.mode == TimerMode::Countdown { return false; }`(203~208행). 그래서 `RestPaused`는 카운트다운에서 생기지 않는다.
- 나머지 경로는 **이미 모드 무관**이라 카운트다운 `RestPaused`를 그대로 받는다(확인):
  - `apply`: `(RestPaused, Start)` → run, `(RestPaused, Pause)` → `Paused`, `(RestPaused, Stop)` → reset(170~199행).
  - `disable`: `RestPaused` → `Paused`(224~236행).
  - `tick`·`next_wake`·`deadline`: `Running` 카운트다운일 때만 마감을 본다 → `RestPaused`면 `false`·`None`(259~287·342~348행). 마감 스레드는 깔때기 ③(`timer_waker.wake`)으로 다시 계산하므로, 쉬는중 동안은 잠들고 재개하면 `since + (active − accumulated)`로 새 마감을 잡는다.
  - `freeze`: 카운트다운이면 경과를 `active`로 상한(301~305·326~338행) → 마감 직후·`tick` 전 몇 ms 사이 쉬는중이 와도 남은 시간이 음수가 되지 않는다(T-D9와 같은 성질).
  - `configure`: 같은 모드에서 시작 시간만 바뀌면 `Stopped`일 때만 `active` 갱신(247~252행) → `RestPaused`에서도 안전(다음 대기부터).

## 4. 설정 스키마 (현재) — 이번 변경 없음

`idleSeconds`(60~3600, 쉬는중 진입 기준 — ui만 읽음), `timer.enabled`·`timer.mode`·`timer.countdownSecs`(core `TimerConfig`). 새 키 없음, 버전·마이그레이션 없음.

## 5. 브리프 확인 요청 항목 — 확인 결과

| # | 항목 | 결과 |
|---|---|---|
| F-1 | 카운트다운 `restPaused` 표시 | **고정 표시로 이미 동작한다.** `elapsedNow`는 `running`만 흐름을 더하고(`timerClock.ts:13-14`), `timerDisplayMs`는 카운트다운이면 `max(0, durationMs − elapsedNow)`(35~38행), `timerText`는 카운트다운이면 올림(51~54행). `useElapsedText`는 `status !== 'running'`이면 interval을 만들지 않는다(27행). → 남은 시간 = `durationMs − elapsedMs` 올림, 고정. **코드 변경 불필요, 테스트만 추가**(카운트다운 `restPaused` 케이스가 지금 없다 — 기존 TC-265·TC-274는 스톱워치 픽스처). |
| F-2 | 트레이 타이머 메뉴 | `tray_timer_view(enabled, status)`는 `running = enabled && status == Running`(`timer_menu.rs:21-26`) — **모드를 보지 않는다.** 카운트다운 `RestPaused`도 스톱워치 `RestPaused`와 같이 「시작」 표시. 오버레이 오른쪽 클릭 메뉴(R-40)도 같은 보기. **코드·테스트 변경 없음**(TV2가 `RestPaused` → `false`를 이미 단언). |
| F-3 | settings 시작 시간 잠금 | **발견 — 구멍 1개.** `isDurationLocked`(`src/settings/timerValues.ts:83-86`)는 `running`·`paused`·`finished`만 잠근다. `timerValues.test.ts:142`가 `restPaused`는 안 잠김을 단언하고 시나리오 Z-3 ③이 「카운트다운은 쉬는중에도 흐르므로 실제로 오지 않는 값」이라 근거를 적었다. 이번 변경으로 그 전제가 사라진다 → 🔒 D-5 A(「대기·꺼짐일 때만 입력」) 규칙상 `restPaused`도 잠가야 한다(설계 A-1). |
| F-4 | 숨김 대상 실제 DOM | `.hairWrap`(`.canvas` 첫 자식) · `PomodoroLayer`의 `.pomodoro` · `.jellyWrap` 안 `MouseArm`(`.armWrap`)·`LayerStack` 3장·`PenHand`. `rest` 그림은 `.jellyWrap` 안 `LayerStack` 둘째 `<img>`다 → 래퍼를 통째로 숨기면 rest도 사라진다. 오버레이 소스에 `visibility`·`display` 선언은 없다(grep 0). |
| F-5 | 기존 테스트 제약 | `layers.test.tsx` TC-028이 대기 상태의 모든 `<img>` `className === 'layer'`를 **정확히** 단언(77행), TC-031도 같다(95·98행), TC-032는 상태 `<img>`가 같은 요소로 남아 src만 바뀜을 단언(101~107행). → 표시 마커 클래스는 **`rest`일 때만** 붙여야 기존 TC가 깨지지 않는다. |
| F-6 | 언마운트 부작용 | `TimerText`가 `useTimerSnapshot`(구독·첫 조회)·`useAlarmOnFinish`(알림음 정지 함수)를 가진다. 조건부 렌더로 `PomodoroLayer`를 빼면 쉬는중 진입마다 구독 해제·알림음 정지, 복귀마다 `getTimer` 재조회가 일어난다. 이미지 `<img>` 재생성은 첫 프레임 디코드 깜빡임 위험(ui-design-strategy §6.3 「미리 로드된 이미지의 표시/숨김」 위반). |
| F-7 | 문서·주석 충돌 | `HairLayer.tsx:3`·design §10.11 「상태(idle/rest)와 무관하게 항상 같은 그림」, design §10.1 hair 행·§10.14 「쉬는중은 표시 여부에 영향이 없다」(584행), requirements R-30·R-33(「항상 보임」)·R-37·S-19, manual 107행, 확정사항 §4 1·3행·§6 127·131·132행이 결정 ②·①과 어긋난다. |
| F-8 | 계층 간 과도 실패 | core만 바꾸면 bridge 소유 테스트 `src-tauri/src/bridge/commands/tests.rs` `set_resting_countdown_noop`(238~250행, `assert!(!changed)`)이 **실패**한다. core-implementer는 bridge 파일을 고치지 않는다 → core 완료~bridge 완료 사이 1건 과도 실패(timer-mode §3.7 선례와 같은 처리). |
| F-9 | 작업 트리 | settings 쪽 `src/settings/i18n/ko.ts`·`test/i18n.test.ts`·`test/TimerTab.test.tsx`·`design.md`·`test/change-requests.md` 등이 **미커밋 수정 상태**(CR-068 「뽀모도로」 표기 정정으로 보임). 같은 파일을 이번 ui 패킷이 고친다. |
| F-10 | 파일 크기 | `src-tauri/src/timer/tests.rs` 685줄(한계 800), `src/overlay/index.tsx` 283줄(400), `LayerStack.tsx` 약 120줄. 추가 여유 있음(timer 테스트는 115줄 넘으면 분리). |

## 6. 영향 범위

| 계층 | 코드 | 문서 |
|---|---|---|
| core | `src-tauri/src/timer/mod.rs`(`set_resting` 본문·`RestPaused`·`//!` 주석), `src-tauri/src/timer/tests.rs`(C4 개정 + 신규) | `doc/200_설계/core/timer.md` |
| bridge | `src-tauri/src/bridge/commands/mod.rs`(`set_resting` 문서주석), `src-tauri/src/bridge/commands/tests.rs`(테스트 교체), `src/bridge/types.ts`·`src/bridge/commands.ts`(JSDoc) | `doc/200_설계/bridge/contract.md` v1.1 |
| ui overlay | `src/overlay/index.tsx`, `components/LayerStack.tsx`, `overlay.module.css`, `components/HairLayer.tsx`(머리 주석) | `requirements.md`·`design.md`·`design/functions.md`·`design/components.md`·`manual.md`·`test/scenarios.md`·`test/manual-checklist.md`·CR 대장 |
| ui settings | `src/settings/i18n/{ko,ja,en}.ts`, `src/settings/timerValues.ts` | `requirements.md`(R-50·R-51)·`design/i18n.md` §4.9·`design/timer-tab.md`·`manual.md`·`test/scenarios.md`·CR 대장 |
| 공용 ui | 없음(`timerClock.ts`·`useElapsedText.ts` 불변, 테스트만) | — |
| 메인 세션 | — | `doc/000_프로젝트_확정사항.md` §4·§5·§6 |

## 7. 문제점·제약

1. 판정 중복 없음 — 쉬는중 판정은 오버레이 상태기계 한 곳, 일시정지 판정은 core 한 곳(현행 원칙 유지). 이번 변경은 core의 모드 분기 1개를 지워 오히려 규칙이 단순해진다(두 모드 공통).
2. `bridge-design-strategy` §5 표는 「기존 command의 의미가 바뀜 → 파괴 변경」이라 적고, 같은 문서 §6과 계약 v0.23 선례(`set_resting` 카운트다운 no-op 추가 = 「확장·비파괴」)는 ui 영향으로 분류한다 — 분류는 전반 설계 D-5에서 다룬다.
3. 숨김은 언마운트 없이 해야 한다(F-6). CSS 중 **자식이 다시 보이게 덮을 수 있는 숨김 속성은 `visibility`뿐**이다(`display:none`·`opacity`는 자식이 되살릴 수 없다).
4. 겹쳐 보이는 위험 없음 — `rest` 진입 순간 `wrapMotion`이 바뀔 이유가 없다(쉬는중은 무입력 뒤에만 오고, 입력 1건이면 곧바로 `idle`).

## 8. 종단간 RTM (요약 — 상세는 02-design §6)

| 요구ID | 요구 | ui | bridge | core | 설정 키 |
|---|---|---|---|---|---|
| RD-01 | 쉬는중 진입 → 카운트다운 자동 일시정지 | overlay `setResting(true)`(불변) | `set_resting` 의미 v1.1 | `Timer::set_resting` 분기 삭제 | `timer.mode` |
| RD-02 | 입력으로 해제 → 카운트다운 자동 재개 | overlay `setResting(false)`(불변) | 같음 | 같음 + 깔때기 ③ 마감 재계산(불변) | 같음 |
| RD-03 | 사용자 일시정지·멈춤·끝남은 쉬는중이 바꾸지 않음 | — | §5.8 전이표 | `_ => false` | — |
| RD-04 | 쉬는중 동안 남은 시간 고정 표시 | `timerClock`(불변, 테스트 추가) | `timer://changed`(불변) | `freeze` | — |
| RD-05 | 「타이머 사용」 설명 문구 개정 | settings `timerCountdownDesc` | — | — | — |
| RD-06 | 카운트다운 `restPaused`에서도 시작 시간 입력 잠김 | settings `isDurationLocked` | — | `configure` 안전망(불변) | `timer.countdownSecs` |
| RD-07 | 쉬는중(rest 등록) = 배경 + rest만 | overlay `.canvas.restOnly` | — | — | `idleSeconds`(진입 기준) |
| RD-08 | rest 미등록이면 현행 표시 | overlay `hasRest` | `assets://changed`(불변) | — | — |
| RD-09 | 복귀 시 젤리·부르르·팔 규칙 불변 | overlay(불변) | — | — | — |
