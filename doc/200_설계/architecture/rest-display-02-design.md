# rest-display 전반 설계

- 작성: 2026-10-24 · system-architect · 입력: `rest-display-01-analysis.md`
- 사용자 결정(🔒 2026-10-24): ① 카운트다운도 쉬는중 자동 일시정지·입력 시 자동 재개(사용자 `paused`는 자동 재개 없음) ② 쉬는중이면 배경 + 쉬는중 그림만 보임.
- 뒤집는 결정: 2026-09-26 CR-048 「타이머: … 쉬는중에도 계속 줄어듦(자동 일시정지 없음)」(확정사항 §6 132행), 그 파생 — core TM-05 「쉬는중에도 계속」·contract v0.23 「`set_resting` 카운트다운 no-op」·overlay R-37·S-19·settings R-50·`timerCountdownDesc`. 기록 문서(`timer-mode-02-design.md` 119·260행, `timer-mode-03-packet-*.md`)는 그때의 기록이라 고치지 않는다.

**결론.** 카운트다운의 쉬는중 처리를 스톱워치와 **같은 규칙 하나**로 합친다(core에서 모드 분기 1개 삭제). 화면은 상태기계를 건드리지 않고 `.canvas`에 클래스 하나(`restOnly`)를 토글해 CSS `visibility`로 숨긴다 — 아무것도 언마운트하지 않는다. 계약은 타입·시그니처 불변의 의미 변경이라 **v1.1(비파괴)** 를 권고한다. 사용자 결정이 더 필요한 것은 D-1~D-5 다섯 건이며 모두 권고안이 있다.

## 1. 목표 구조

```
입력 없음 idleMs ─▶ inputMachine layer 'rest' (불변)
        │
        ├─ OverlayApp effect: setResting(true) (불변) ─▶ bridge set_resting ─▶ core Timer::set_resting
        │        (변경) 모드 무관: Running → RestPaused(freeze) ─ changed → publish_timer_change
        │                                 ① timer://changed  ② 트레이 「시작」 표시  ③ 마감 스레드 → next_wake None(잠듦)
        │
        └─ OverlayApp render (변경): restOnly = layer==='rest' && hasRest
                 .canvas.restOnly ─CSS─▶ .hairWrap · .pomodoro · .jellyWrap  visibility:hidden
                                         .jellyWrap 안 .restLayer(=rest <img>)  visibility:visible
                 → 화면 = 배경 + rest (DOM·구독·알림음 그대로)

입력 1건 ─▶ wake → layer 'idle' (불변)
        ├─ 같은 커밋: restOnly=false → 전부 다시 보임 + (키면) 젤리 재생 (불변 규칙)
        └─ setResting(false) ─▶ core RestPaused → Running(run) ─▶ ③ 마감 = since + (active − accumulated)
```

## 2. 상태 기계 확정본

### 2.1 입력 상태기계 — 불변

`src/state/inputMachine.ts` 수정 없음. `layer: 'idle' | 'rest'`, `wake`, `tick` 판정·`idleMs` 주입 그대로(확정사항 §5 표 불변).

### 2.2 core 카운트다운 전이표 개정안 (정본 = core timer.md §3.5.1, 이 표로 교체)

| 현재 \ 입력 | `apply(Start)` | `apply(Pause)` | `apply(Stop)` | `set_resting(true)` | `set_resting(false)` | `disable()` | `tick` 마감 도달 | `tick` 끝남 만료 |
|---|---|---|---|---|---|---|---|---|
| Stopped | **Running**(남은 = `active`) | — | — | — | — | — | — | — |
| Running | — | **Paused** | **Stopped** | **RestPaused**(남은 고정) 🆕 | — | **Paused**(남은 유지) | **Finished** | — |
| Paused | **Running**(이어서) | — | **Stopped** | — | — | — | — | — |
| RestPaused 🆕 | **Running**(이어서) | **Paused**(사용자 일시정지로 바뀜) | **Stopped** | — | **Running**(이어서) | **Paused**(남은 유지) | — | — |
| Finished | **Running**(새 회차, D-7) | — | **Stopped** | — (D-3) | — | **Stopped** | — | **Stopped** |

- `—` = 불변·`false`. 스톱워치 전이표(timer.md §3.2)와 `set_resting` 두 열이 **같아진다** — 두 모드 공통 규칙: 「`Running`만 자동 일시정지, `RestPaused`만 자동 재개」.
- `RestPaused` 행의 `apply`·`disable` 칸은 **이미 구현돼 있다**(모드 무관 match) — 새 코드 아님, 테스트로 고정만 한다.
- `RestPaused`에서 `next_wake() = None`, `tick() = false`(마감 스레드는 잠든다). 재개 순간 깔때기 ③이 마감을 다시 계산한다.
- 쉬는중 진입 전 무입력 시간(기본 5분)은 카운트다운에서도 **빼지 않는다**(스톱워치 U-4와 같음 — 그 5분 동안은 정상적으로 줄어든 것).
- 경계(A-3): 마감 시각을 지나고 `tick` 전(수 ms)에 쉬는중이 오면 `freeze`가 경과를 `active`로 상한해 `RestPaused`(남은 0)가 된다. 재개하면 마감 = 재개 시각이라 마감 스레드가 곧바로 `Finished`로 보낸다(일시정지 T-D9와 같은 처리, 새 분기 없음).

### 2.3 오버레이 표시 상태 (신규 — design §10.9.2 표 개정안)

| 조건 | 배경 | 뒷머리 | 뽀모도로(인물·말풍선·글자) | 팔 | 몸통 | 상태 z2 | 키보드 z3 | 펜 손 |
|---|---|---|---|---|---|---|---|---|
| 대기(`idle`) | 보임 | 보임 | 보임 | 보임 | 보임 | `idle`(있으면) | 규칙대로 | 보임 |
| 쉬는중 · `rest` **있음** 🆕 | **보임** | 숨김 | 숨김 | 숨김 | 숨김 | **`rest`** | 숨김 | 숨김 |
| 쉬는중 · `rest` **없음**(D-1) | 보임 | 보임 | 보임 | 보임(쉬는 자세) | 보임 | 없음(투명) | `kb_up` | 보임 |

- 「숨김」 = DOM에 남은 채 `visibility: hidden`. 등록 안 된 그림은 원래대로 그리지 않는다(배경이 없으면 rest만 보인다).
- 판정 `restOnly = machine.layer === 'rest' && hasRest`, `hasRest = findEntry(manifest, 'rest') !== undefined`(`useMemo([manifest])`, 기존 `hasHair`와 같은 모양).
- 전환은 즉시(페이드·전환 애니메이션 없음 — 요구 밖).

## 3. 계약 변경 목록

| 종류 | 이름 | 변경 | 하위 호환 | 소비자 |
|---|---|---|---|---|
| command | `set_resting` | 의미: 카운트다운도 `running→restPaused`·`restPaused→running`(두 모드 공통). 시그니처·반환·에러·래퍼 **불변** | 비파괴(D-5) | overlay 쉬는중 보고 효과 — 코드 변경 없음(모드를 보지 않고 부르는 현행 그대로) |
| 타입 | `TimerStatus` `'restPaused'` | 주석만: 「스톱워치 전용」 삭제 → 「두 모드 공통」. 유니온 멤버 불변 | 비파괴 | 두 창 — `restPaused`는 이미 모드 무관하게 처리됨(01 §5 F-1·F-2) |
| 표 | §3.9 상태×모드 표 `restPaused` 행 | 카운트다운 칸 「생기지 않음」 → 「쉬는중 자동 일시정지(남은 시간 고정)」 | 비파괴 | 문서 |
| 예시 | §3.9 JSON 예시 | `{ "status": "restPaused", "elapsedMs": 83250, "mode": "countdown", "durationMs": 1500000 }` 추가 | 추가 | 문서 |
| 규칙 | §5.8 카운트다운 전이표·규칙 5·`configure` 줄·U-4 문장 | 2.2 표로 교체, 규칙 5의 「(v0.23) 카운트다운이면 … 변화 없음」 취소선 + v1.1 문장, `configure` 「`running`·`paused`·`finished`」 → `restPaused` 추가, U-4 「(스톱워치)」 → 「(두 모드)」 | 비파괴 | 문서 |
| 테스트 | §5.8 목록 | `set_resting_countdown_noop` → `set_resting_countdown_pauses_and_resumes`·`set_resting_countdown_finished_noop` | — | bridge-implementer |
| 이벤트·새 command·에러 code·권한 | — | **없음** | — | — |

- `TimerSnapshot` 모양·`timer://changed` 발신 조건(바뀔 때만, 깔때기 하나) 불변. 빈도: 쉬는중 진입·해제 각 1회(분당 수 회 이하, 현행과 같음).

## 4. 설정 스키마 변경

없음. `settings.json` 키·기본값·검증 범위·버전·마이그레이션 모두 그대로. `idleSeconds`(60~3600)가 계속 쉬는중 진입 기준이다.

## 5. 사용자 결정 사항

### 5a. 사용자 결정이 필요한 항목 (권고안 있음)

| # | 질문 | 권고 | 대안 | 근거 |
|---|---|---|---|---|
| **D-1** | `rest` 그림이 **미등록**일 때 쉬는중 표시 | **A. 숨기지 않는다** — 현행(§10.9.2 둘째 행) 그대로 전부 보임, 상태 레이어만 투명 | B. 그래도 숨김 → 배경만 남음(배경도 없으면 **완전히 빈 투명 창** — 앱이 꺼진 줄 안다). C. `rest` 대신 `kb_up`(또는 `idle`)을 배경 위에 단독 표시 — 새 폴백 규칙(요구 밖) | `rest`는 선택 슬롯(R-27)이고 내장 기본도 없다(`DEFAULT_ASSET_SLOTS` 6장에 없음). 새 설치·초기화 직후 사용자는 전부 rest 미등록 상태라 B는 기본 사용자 전원에게 「5분 뒤 캐릭터 실종」을 만든다. A는 결정 ②의 문장 「쉬는중 그림만 보인다」가 성립할 그림이 있을 때만 적용하는 해석 |
| **D-2** | 쉬는중 → 입력 복귀 시 젤리·부르르·팔 규칙 | **불변** — 깨운 입력이 키면 그 누름의 젤리(CR-066 규칙)가 숨김 해제와 같은 커밋에 재생, 팔은 다음 마우스 이동 전까지 쉬는 자세(`armAtRest`, R-11·R-15), 마우스 이동으로 깨면 곧바로 커서 추종 | 복귀 전용 연출(페이드 인·특수 젤리) 추가 | 요구에 복귀 연출이 없다(요구 범위). 숨김은 CSS만 바꾸므로 기존 모션 경로를 건드리지 않는다 |
| **D-3** | 카운트다운 `finished`(깜빡임 10초) 중 쉬는중 진입 | **no-op** — 깜빡임 10초·알림음 그대로 진행(글자는 쉬는중 단독 표시로 가려지지만 소리는 끝까지). `paused`·`stopped`도 no-op | `finished`를 즉시 `stopped`로 끝내기 / `RestPaused`처럼 깜빡임을 멈췄다 재개 | `finished`는 이미 0에 닿은 「알림」 상태라 멈출 시간이 없다. 현행 `_ => false` 그대로라 코드 0줄. 실제로는 0 도달 뒤 10초 안에 무입력 기준(최소 60초)을 넘길 때만 생긴다 |
| **D-4** | `timerCountdownDesc` 문안 | ko 「정한 시간부터 0까지 내려갑니다. 쉬는중이 되면 저절로 멈추고, 다시 입력하면 이어서 내려갑니다」 · ja 「決めた時間から0まで減ります。休憩中になると自動で止まり、入力を再開すると続きから減ります」 · en 「Counts down to zero. It stops by itself while resting and continues when you use the keyboard or mouse again」 | 두 문장 대신 짧게(ko 「정한 시간부터 0까지 내려갑니다. 쉬는중에는 멈춥니다」) | 스톱워치 설명(`timerStopwatchDesc`, 🔒 CR-052)과 같은 구조라 두 토글이 나란히 읽힌다. 끝 마침표 없음은 이 키의 현행 3개 국어 표기를 따른다 |
| **D-5** | contract 판·호환성 분류 | **v1.1 · 비파괴** | v2.0 · 파괴(새 command 이름 + 옛것 폐기) | 타입·이름·시그니처·반환 모양·에러가 모두 그대로고, 유일한 호출자(overlay)는 모드를 보지 않고 부르므로 코드가 바뀌지 않는다. `restPaused`를 받는 소비자(두 창 표시·트레이)는 이미 모드 무관(01 §5 F-1·F-2). 같은 command의 v0.23 의미 변경(카운트다운 no-op 추가)도 「확장·비파괴」로 분류한 선례가 있다. ui와 core가 한 exe로 함께 배포돼 판 어긋남이 없다. **단, `bridge-design-strategy` §5 표 문구(「기존 command의 의미가 바뀜 → 파괴 변경」)를 글자대로 읽으면 파괴다** — 권고는 같은 문서 §6의 ui 영향 기준(「비파괴 = ui 영향 없음」)을 따른 해석이며, 이 차이를 계약 §8 v1.1 행에 적어 남긴다. settings 시작 시간 잠금(A-1)은 계약 요구가 아니라 기존 화면 규칙(D-5 A)의 적용이라 분류에 넣지 않는다 |

### 5b. 아키텍트 결정 (기존 규칙에서 바로 나옴 — 사용자 결정 불필요, 이의 있으면 되돌린다)

| # | 결정 | 근거 |
|---|---|---|
| A-1 | settings `isDurationLocked`에 `status === 'restPaused'` 추가(카운트다운 `restPaused`에서도 시작 시간 입력 잠김) | 🔒 2026-09-26 D-5 A 「대기·꺼짐일 때만 입력」. 지금 `restPaused`를 안 잠그는 이유는 「카운트다운에선 오지 않는 값」(시나리오 Z-3 ③)뿐이었고 그 전제가 사라진다. 실사용에선 설정 창을 만지는 입력이 곧 쉬는중을 풀어 거의 보이지 않는 상태지만, 잠금 식은 상태 값만 보고 정해야 일관된다. core `configure` 안전망(다음 대기부터)은 그대로 |
| A-2 | 숨김 = `.canvas`에 `styles.restOnly` 클래스 토글 + CSS `visibility`. `rest` `<img>`에는 `layer === 'rest'`일 때만 `styles.restLayer`를 붙여 `visible`로 되살린다. 조건부 렌더(`null`)·`display: none`·`opacity` 쓰지 않음 | ① `visibility`만 자식이 되살릴 수 있다(rest가 `.jellyWrap` 안에 있음) ② 언마운트가 없어 `TimerText` 구독·알림음(D-3)·이미지 디코드가 유지된다(ui-design-strategy §6.3 「미리 로드된 이미지의 표시/숨김」) ③ `BackgroundLayer`·`HairLayer`·`PomodoroLayer`의 props가 안 바뀌어 memo가 그대로다(design §10.14 14.5 — `machine` 비의존 유지) ④ `OverlayApp`은 `machine.layer`가 바뀔 때 이미 다시 그리므로 새 상태·효과·리렌더가 없다 ⑤ 마커를 rest일 때만 붙여 TC-028·TC-031의 `className === 'layer'` 단언이 깨지지 않는다(01 §5 F-5) |
| A-3 | 마감 직후·`tick` 전 쉬는중 진입 = `RestPaused`(남은 0) → 재개 즉시 `Finished` | 2.2 경계. 일시정지(T-D9)와 같은 성질, 새 분기 없음 |
| A-4 | 트레이·오버레이 오른쪽 클릭 메뉴 변경 없음 — 카운트다운 `RestPaused`도 「시작」 | `tray_timer_view`가 모드 무관(01 §5 F-2). 메뉴를 열려면 마우스를 움직여야 하므로 그 순간 쉬는중이 풀려 「일시정지」로 바뀐다 |
| A-5 | core 완료~bridge 완료 사이 bridge 테스트 `set_resting_countdown_noop` 1건 과도 실패를 허용(문서화) | core-implementer는 bridge 파일을 고치지 않는다(계층 경계). timer-mode §3.7 「알려진 과도 상태」 선례. 배포 전 두 패킷이 모두 끝나야 한다 |
| A-6 | 설정 창 미리보기(타이머 탭·프리셋 카드 합성 미리보기)는 쉬는중을 흉내 내지 않는다 — 변경 없음 | 결정 ②는 오버레이 표시에 대한 것. 미리보기는 편집 도구라 늘 전체를 보여야 위치를 맞출 수 있다 |

## 6. 종단간 RTM

| 요구ID | 요구 | ui | bridge | core | 설정 키 | 테스트 | 상태 |
|---|---|---|---|---|---|---|---|
| RD-01 | 쉬는중 진입 → 카운트다운 자동 일시정지(🔒 결정 ①) | overlay 쉬는중 보고 효과(불변), overlay R-37 개정·R-35 | contract v1.1 `set_resting`·§5.8 | `Timer::set_resting` 모드 분기 삭제 | `timer.mode` | core C4(개정)·C21 / bridge `set_resting_countdown_pauses_and_resumes` | 설계 |
| RD-02 | 입력으로 해제 → 자동 재개, 남은 시간 이어서 | 같음 | 같음 | 같음 + 깔때기 ③ 마감 재계산(불변) | `timer.mode` | core C4·C19·C22 | 설계 |
| RD-03 | 사용자 일시정지는 자동 재개 없음, 멈춤·끝남·대기는 쉬는중 영향 없음(D-3) | — | §5.8 전이표 | `_ => false`(불변), `RestPaused`의 apply·disable(불변) | — | core C20·C21 / bridge `set_resting_countdown_finished_noop` | 설계 |
| RD-04 | 쉬는중 동안 카운트다운 남은 시간 고정 표시(두 창) | 공용 `timerClock`·`useElapsedText`(불변) | `timer://changed`(불변) | `freeze` | — | ui `timerClock.test.ts`·`useElapsedText.countdown.test.tsx` 케이스 추가 / core C23 | 설계 |
| RD-05 | 「타이머 사용」 설명 문구 개정(D-4) | settings `timerCountdownDesc` ko·ja·en, R-50 | — | — | — | settings `i18n.test.ts`·`TimerTab.test.tsx` 문구 단언 개정 | 설계 |
| RD-06 | 카운트다운 `restPaused`에서도 시작 시간 입력 잠김(A-1) | settings `isDurationLocked`, R-50 해석 | — | `configure` 안전망(불변) | `timer.countdownSecs` | settings `timerValues.test.ts`(TC-269)·`TimerTab.test.tsx`(TC-276) | 설계 |
| RD-07 | 쉬는중(rest 등록) = 배경 + rest만(🔒 결정 ②) | overlay `.canvas.restOnly`·`.restLayer`·CSS, R-41 신설 | — | — | `idleSeconds` | overlay 신규 `OverlayApp.restOnly.test.tsx`·`layers.test.tsx`·`overlayStyles.test.ts` / 수동 스크린샷 | 설계 |
| RD-08 | rest 미등록이면 현행 표시(D-1) | overlay `hasRest` | `assets://changed`(불변) | — | — | overlay `OverlayApp.restOnly.test.tsx` | 설계 |
| RD-09 | 복귀 시 젤리·부르르·팔 규칙 불변(D-2) | overlay(불변) | — | — | — | overlay `OverlayApp.restOnly.test.tsx` 복귀 케이스 + 기존 젤리·팔 TC 회귀 | 설계 |

끊긴 곳 0 — 모든 행이 ui·bridge·core 중 해당 열을 갖거나 `-`(해당 없음)다.

## 7. 비기능 목표

| 항목 | 목표 | 측정 |
|---|---|---|
| 리렌더 | 쉬는중 진입·해제 때 `PomodoroLayer`·`BackgroundLayer`·`HairLayer` 렌더 0회 추가(memo 유지), `OverlayApp`은 `machine.layer` 변화 1회분(현행과 같음) | vitest — 렌더 횟수 spy 또는 `getTimer` 재호출 0회(언마운트 없음 증거) |
| 전환 지연 | 숨김·복귀 = 상태 전이와 같은 커밋(추가 프레임 0) | vitest — 같은 `act` 안에서 클래스 단언 |
| CPU | 쉬는중 동안 오버레이 interval 추가 0개. 두 모드 모두 `restPaused`라 `useElapsedText` interval도 꺼진다(현행 카운트다운은 쉬는중에도 250ms interval이 돌았다 → 오히려 감소) | 코드 검토(`useElapsedText` 27행) |
| core | 쉬는중 동안 마감 스레드 무기한 대기(`next_wake = None`), 재개 시 1회 재계산 | core C19 |
| 화면 | 쉬는중 화면에 배경·rest 외 픽셀 0 | `/run-app` 스크린샷(수동, verify) |

## 8. 확정사항 갱신 문안 (메인 세션 몫 — `doc/000_프로젝트_확정사항.md`)

표기 방식: 기존 관례(§5 89행 「~~옛 문장~~ **🔒 날짜 …**」, §6 137행 「재수정 (🔒 날짜, CR) … 대체」)를 따른다. 뒤집힌 문장은 지우지 않고 취소선으로 남기고 바로 뒤에 대체 표시를 붙인다. CR 번호는 화면 쪽 기록 때 확정(예상 overlay CR-069·settings CR-070 — 현재 대장 최대 CR-068).

1. **§4 겹침 순서 요약(51행) 끝에 한 문장 추가**:
   > **쉬는중 단독 표시 (🔒 2026-10-24 사용자 지정, rest-display):** 쉬는중이고 쉬는중 그림(`rest`)이 등록돼 있으면 **배경과 쉬는중 그림만** 보이고 나머지(뒷머리·뽀모도로 인물·말풍선·시간 글자·팔·몸통·키보드 그림·펜 손)는 숨는다. `rest`가 없으면 지금처럼 전부 보인다. 입력으로 대기로 돌아오면 즉시 원래대로.
2. **§4 표 1행(뒷머리) 「동작」 칸** 끝에 「쉬는중 단독 표시 때 숨김(🔒 2026-10-24)」, **3행(뽀모도)** 끝에 같은 문구.
3. **§5 표 「5분(설정값, 60~3600초) 무입력」 행 아래 각주 한 줄**:
   > - 쉬는중 화면 (🔒 2026-10-24): `rest` 그림이 있으면 배경 + 쉬는중 그림만 보인다(§4 「쉬는중 단독 표시」). 키보드·마우스 파츠 열은 숨김 동안 그려지지 않을 뿐 상태 전이는 위 표 그대로.
4. **§6 뽀모도 「자리 비움」(127행)** 끝에 「**(🔒 2026-10-24) 스톱워치·타이머 두 모드 모두.**」
5. **§6 「타이머 모드 추가」 스톱워치 줄(131행)**: 「쉬는중 자동 일시정지 적용(기존 동작)」 뒤에 「— 2026-10-24부터 타이머도 같음」.
6. **§6 타이머 줄(132행)**: 「~~쉬는중에도 계속 줄어듦(자동 일시정지 없음)~~ **(🔒 2026-10-24 대체) 쉬는중이 되면 자동 일시정지, 입력하면 이어서 내려감(스톱워치와 같음, 직접 일시정지한 경우는 자동 재개 없음).**」
7. **§6 137행(CR-055) 다음에 새 줄**:
   > - **쉬는중 정리 (🔒 2026-10-24 사용자 지정, rest-display):** ① 타이머(카운트다운)도 쉬는중 자동 일시정지·입력 시 자동 재개 — 2026-09-26 「쉬는중에도 계속 줄어듦」 대체. 직접 일시정지는 자동 재개 없음, 끝남(깜빡임 10초) 중 쉬는중은 영향 없음. 쉬는중 동안 시작 시간 입력은 잠김. 「타이머 사용」 설명 = 「정한 시간부터 0까지 내려갑니다. 쉬는중이 되면 저절로 멈추고, 다시 입력하면 이어서 내려갑니다」(ja·en 동일 뜻). ② 쉬는중이면 배경 + 쉬는중 그림만 보임(§4), 쉬는중 그림이 없으면 전부 보임. 계약 v1.1(비파괴). 설계: `doc/200_설계/architecture/rest-display-*.md`.
8. **CLAUDE.md §9 요약**(메인 세션 판단): 「5분(설정값) 무입력 → 쉬는중」 뒤에 「(쉬는중 그림이 있으면 배경 + 쉬는중 그림만 보임, 타이머 두 모드 모두 자동 일시정지)」.

## 9. 문서 갱신 지도

| 문서 | 소유(갱신자) | 패킷 |
|---|---|---|
| `doc/200_설계/core/timer.md` | core-designer | core §4 |
| `doc/200_설계/bridge/contract.md` | bridge-designer | bridge §2 |
| overlay `requirements.md`·`design.md`·`design/functions.md`·`design/components.md`·CR 대장 | ui-designer(CR 기록은 ui-manager 지시) | ui §A.4 |
| overlay `manual.md` | ui-manual-writer | ui §A.4 |
| overlay `test/scenarios.md`·`test/manual-checklist.md` | ui-test-designer | ui §A.5 |
| settings `requirements.md`·`design/i18n.md`·`design/timer-tab.md`·CR 대장 | ui-designer | ui §B.3 |
| settings `manual.md` | ui-manual-writer | ui §B.3 |
| settings `test/scenarios.md` | ui-test-designer | ui §B.4 |
| `doc/000_프로젝트_확정사항.md`·`CLAUDE.md` | 메인 세션 | 이 문서 §8 |
| `timer-mode-*.md`(기록) | 고치지 않음 | — |

## 10. 위험·확인 필요

| # | 내용 | 처리 |
|---|---|---|
| K-1 | settings 작업 트리에 미커밋 수정(CR-068 「뽀모도로」 정정)이 ui 패킷 대상 파일(`ko.ts`·`i18n.test.ts`·`TimerTab.test.tsx`·CR 대장)과 겹친다 | ui 패킷 §B 선행 조건 — CR-068을 먼저 커밋(또는 확정)한 뒤 착수 |
| K-2 | 오버레이 숨김의 실제 화면은 jsdom이 CSS 모듈 규칙을 적용하지 않아 vitest로 증명할 수 없다 | 클래스·CSS 원문 단언(vitest) + `/run-app` 스크린샷 2장(쉬는중·복귀)으로 증거 |
| K-3 | 트레이로 오버레이를 숨긴 동안 WebView2가 tick을 늦추면 쉬는중 진입·`setResting`이 늦을 수 있다(현행 잔여 위험, design §10.14 14.5) — 이제 카운트다운에도 해당 | 현행 수용 범주 그대로, verify 실측 항목에 카운트다운 추가 |
| K-4 | 사용자 시나리오 S-19(「자리를 비워도 계속 줄어야」)가 결정 ①로 반대가 된다 | overlay requirements S-19 문장 개정(ui 패킷 §A.4) — 결정 ① 자체라 추가 확인 불필요 |
