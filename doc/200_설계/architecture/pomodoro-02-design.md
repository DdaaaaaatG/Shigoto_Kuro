# pomodoro 전반 설계 (CR-045 뽀모도 타이머)

- 근거: `doc/000_프로젝트_확정사항.md` §6 「뽀모도 타이머 (🔒 2026-09-26 사용자 지정, CR-045)」. 참고 그림 (사용자 로컬 그림, 저장소 밖)(900×700, 왼쪽 두 번째 캐릭터 + 가운데 아래 말풍선).
- 작업 모드: **보강**(오버레이·설정 창·core·계약 모두 구현돼 있고, 거기에 기능을 더한다).
- 판별: **횡단** — core(슬롯 2개·설정 필드·새 휘발 상태) + bridge(새 command 3·event 1·에러 code 1·타입) + ui(오버레이 새 레이어·설정 창 새 탭·이미지 카드 2). 세 계층이 모두 바뀐다.
- 현황 근거: `.claude/reports/core-survey-20260926-pomodoro.md`, `.claude/reports/bridge-survey-20260926-pomodoro.md`. 구조 분석서(01)는 따로 만들지 않았다 — 필요한 부분은 §1에 요약했다.
- 인계 순서: `-03-packet-core.md` → `-03-packet-bridge.md` → `-03-packet-ui.md`.

## 0. 결론

비유: 타이머는 **역 대합실 벽시계 하나**다. 설정 창과 오버레이는 각자 손목시계를 차지 않고, 벽시계(core)의 「지금 몇 분이고 가고 있는가」를 한 번 받아 적은 뒤 눈으로 초를 센다. 벽시계는 매초 방송하지 않는다. 멈추거나 다시 갈 때만 방송한다.

1. **타이머 상태의 단일 소유자 = core** 새 모듈 `timer`(휘발, 저장 안 함). 설정 창과 오버레이가 같은 값을 봐야 하고, 두 창을 잇는 길은 「command → Rust 상태 → 모든 창 emit」 하나뿐이기 때문이다(bridge-survey Q5). 오버레이가 가지면 설정 창이 값을 읽을 길이 없다.
2. **조작 경로**: 설정 창 버튼 → `control_timer(action)` → core `Timer::apply` → `timer://changed`(모든 창) → 두 창이 받아서 표시.
3. **표시 갱신**: core는 **상태가 바뀔 때만** 이벤트를 보낸다. 매초 이벤트는 보내지 않는다. 각 창은 받은 `elapsedMs`와 받은 시각을 기억하고, `running`이면 250ms 간격으로 경과를 더해 계산한다. 초가 바뀔 때만 다시 그린다.
4. **자동 일시정지·재개**: 「쉬는중」 판정은 지금처럼 **오버레이 상태기계(TS)** 한 곳에만 둔다(판정 로직 한 곳 원칙). 오버레이는 `layer`가 `rest`로 들어가거나 나오는 **순간에만** `set_resting(bool)`을 보낸다. 사용자가 누른 일시정지인지 자동 일시정지인지 구분하는 것은 core 타이머 상태기계(`paused` vs `restPaused`)가 한다.
5. **슬롯** `pomo_char`(뽀모도 인물)·`pomo_bubble`(뽀모도 말풍선): 캔버스 레이어, 선택, 내장 기본 없음, 배경 그룹. **설정** `timer: { enabled, textPos, rotation, fontSize, color }`: 버전 승격 없음(serde default, 옛 파일은 기본값으로 채움).
6. **파괴 변경 없음.** 새 의존성 없음(Rust `std::time::Instant`, 브라우저 `<input type="color">`·`performance.now()`, 폰트는 시스템 글꼴).

## 1. 현황 요약 (구조 분석)

```
hook 스레드 ─mpsc─▶ input-forwarder ─app.emit─▶ input://keyboard · mouse-move(≤60Hz) · mouse-button  (두 창 모두)
                                                   │
오버레이 OverlayApp ─ useReducer(reduce) ◀──────────┘   + 100ms tick → layer 'idle' ↔ 'rest'(idleSeconds)
설정 창 SettingsApp  ─ 설정·매니페스트만 구독(상태기계 없음)

set_settings(Settings 전체) ─▶ core settings 검증·저장 ─▶ settings://changed(Settings 전체, 모든 창)
import/remove/restore_asset ─▶ assets://changed(AssetManifest, 모든 창)
AppState(lib.rs:46-51) = { settings: Mutex<Settings>, hand_anchor: Mutex<Option<Point>>(휘발 캐시), paths }
```

| 항목 | 현황 | 이번 설계에 주는 제약 |
|---|---|---|
| 유휴(쉬는중) 판정 | TS `src/state/inputMachine.ts` `onTick`에만 있다. Rust에 없다 | core가 다시 판정하지 않는다. 오버레이가 전이를 알린다 |
| 창 간 통신 | ui→ui 직접 경로 없음. `emit_to` 없음, 전부 `app.emit` | 새 이벤트도 `app.emit` 브로드캐스트 |
| 주기 이벤트 | 선례 없음. 모든 비입력 이벤트는 「변경 시」 | `timer://changed`도 변경 시에만 |
| 휘발 상태 | `hand_anchor` 캐시(잠금은 짧게, emit은 잠금 밖) | `AppState.timer: Mutex<Timer>` 같은 패턴 |
| 설정 스키마 | `version` 필드 없음. 컨테이너 `#[serde(default)]`. `validate`는 범위 밖이면 거부만 하고, 읽을 때 보정하는 필드는 `idle_seconds` 하나 | `TimerSettings`에도 `#[serde(default)]`. 범위 보정은 `load`에서 한다(안 하면 파일 하나의 잘못된 값이 설정 **전체**를 기본값으로 되돌린다) |
| `set_settings` | 전체 교체. core 소유 필드(`overlay.x/y`, `autostart`)만 입력 무시 | `timer`는 ui 소유 필드. 모든 호출자가 `{...settings, …}`로 보낸다 |
| 슬롯 분류 | `is_canvas_layer = !mouse && !pen`(부정형) — 새 슬롯은 자동으로 캔버스 레이어 | 분류·검증·매니페스트·삭제 코드는 안 바뀐다(hair 선례 D34) |
| 설정 창 수명 | 앱 시작 때 숨긴 채 생성, X는 숨김(CR-039·window.md) | 설정 창은 늘 살아 있어 이벤트를 받는다 |
| 파일 크기 | `settings/mod.rs` 736줄, `assets/slot.rs` 518줄, `overlay/index.tsx` 253줄 | 타이머 설정은 `settings/timer.rs`로 분리 |
| 계약 | 최신 v0.20(머리말). §8 이력 마지막 행 v0.19(BRG-002 공백) | 이번 개정 = **v0.21** |
| 에러 code | `영역.사유` 소문자. 설정 창 `ErrorCode` 유니온·`ERROR_CODES`·3개 사전은 **ui 소유**(`src/settings/i18n/types.ts`) | 새 code 추가는 bridge, 문구 3개 국어는 ui |

기존 결함(이번 범위 밖, 참고): BRG-001 계약서 「core 미반영」 문구가 낡음, BRG-003 `set_autostart` emit 조건 불일치, BRG-006 화면 테스트 mock에 이벤트 이름이 다시 적혀 있음 — **새 이벤트를 넣으면 이 mock들도 ui 패킷에서 함께 맞춰야 한다.**

## 2. 목표 구조

```
[설정 창 TimerTab]
   ├─ 토글 on/off ─ setSettings({...settings, timer:{...,enabled}}) ─▶ set_settings ─▶ core settings 저장
   │                                                     └─ enabled true→false 이면 Timer::disable ─▶ timer://changed
   ├─ 시작/일시정지/멈춤 ─ controlTimer(action) ─▶ control_timer ─▶ core Timer::apply ─▶ timer://changed
   └─ 미리보기 끌기·회전·크기·색 ─ setSettings(timer.*) ─▶ settings://changed

[오버레이 OverlayApp]
   └─ useEffect([machine.layer]) ─ setResting(layer==='rest') ─▶ set_resting ─▶ core Timer::set_resting ─▶ timer://changed

core AppState.timer: Mutex<Timer>  { status, accumulated: Duration, since: Option<Instant> }
      └─ bridge events.rs emit "timer://changed" (TimerSnapshot) ─▶ 모든 창

두 창 공통(src/components/hooks·utils):
   useTimerSnapshot() = 구독 먼저 → getTimer() (이벤트가 먼저 오면 조회 결과 버림 — 손 기준점 §3.6과 같은 순서 규칙)
   useElapsedText(snapshot) = 받은 시각 기록 → running이면 250ms마다 계산 → 초가 바뀔 때만 setState
   formatElapsed(ms) = "HH:MM:SS"
```

오버레이 DOM(아래→위, DOM 순서가 곧 z 순서):

```
.canvas (scale)
  BackgroundLayer            background               고정
  PomodoroLayer (React.memo) pomo_char <img>          고정   ← 신규
                             pomo_bubble <img>        고정   ← 신규
                             TimerText <div>          고정   ← 신규 (글자 표시 조건 U-1)
  .jellyWrap                 hair · MouseArm · LayerStack · PenHand   (젤리·부르르, 기존)
```

- `PomodoroLayer`는 `.jellyWrap` **밖**, `BackgroundLayer` 바로 다음 형제다. 젤리·부르르를 받지 않는다.
- `pointer-events: none`(`.canvas`가 이미 none) — 드래그 영역(`.root`)을 가리지 않는다.
- `TimerText`는 자기 state(초 단위)만 갖는다. 초가 바뀌어도 `OverlayApp`·`.jellyWrap`은 다시 그려지지 않는다. `PomodoroLayer`는 `React.memo`로 감싸 마우스 이동(60Hz) 재렌더를 받지 않는다.

**`timer` 모듈을 새로 두는 이유:** 타이머 상태는 저장하지 않는 런타임 상태라 `settings`(JSON 영속)에 속하지 않는다. 창·트레이·에셋·훅과도 무관하다. `Instant`를 인자로 받는 순수 구조체라 `window/placement.rs`(디바운스) 선례처럼 시각을 주입해 단위 테스트한다. 확정사항 §7 폴더 구조의 `src-tauri/src/` 목록에 `timer/`를 더해야 한다(메인 세션 갱신 몫).

## 3. 상태 기계 확정본

### 3.1 core 타이머 (`src-tauri/src/timer/`)

| 상태 | 뜻 | 경과 |
|---|---|---|
| `stopped` | 멈춤. 앱 시작 직후와 「멈춤」 뒤 | 0 |
| `running` | 흐르는 중 | `accumulated + (now − since)` |
| `paused` | 사용자 일시정지 또는 타이머 끔. **자동 재개 없음** | `accumulated` |
| `restPaused` | 쉬는중이라 자동 일시정지. 입력이 오면 자동 재개 | `accumulated` |

| 현재 \ 입력 | `start` | `pause` | `stop` | `resting=true` | `resting=false` | `disable`(설정 끔) |
|---|---|---|---|---|---|---|
| stopped | running(0부터) | — | — | — | — | — |
| running | — | paused | stopped(0) | **restPaused** | — | paused |
| paused | running | — | stopped(0) | — | — | — |
| restPaused | running | paused | stopped(0) | — | **running** | paused |

- `—` = 변화 없음(에러 아님, 이벤트 없음).
- `start`·`pause`·`stop`은 `timer.enabled == false`이면 **거부**(`timer.disabled`), 상태 불변.
- 불변식: `enabled == false` ⇒ 상태는 `stopped` 또는 `paused`. 그래서 끈 동안 `resting`은 효과가 없다.
- `enable`(false→true)은 상태를 바꾸지 않는다. 다시 흐르게 하려면 「시작」(U-2).
- 앱 시작 = `stopped`·0. 경과는 저장하지 않는다(🔒 CR-045). `enabled`가 true로 저장돼 있어도 자동 시작하지 않는다(U-3).
- 경과는 `Instant`(단조 시계) 기준이다. 시스템 시각 변경과 무관하다.
- 쉬는중 진입 전 무입력 대기 시간(기본 5분)은 경과에 **포함**된다 — 요구 문구 「쉬는중이 **되면** 자동 일시정지」 그대로(U-4).

### 3.2 오버레이 입력 상태기계 (`src/state/inputMachine.ts`) — **변경 없음**

상태(`idle`/`rest`)·전이·tick은 그대로다. 오버레이 화면이 `machine.layer` 값의 변화를 보고 `setResting`을 부를 뿐이다. 마운트 때도 한 번 `false`를 보낸다. 그래서 오버레이가 다시 로드돼도 core에 남은 `restPaused`가 풀린다(core에서는 멱등).

### 3.3 표시 규칙 (두 창 공통, 순수 함수)

- `elapsedNow(snapshot, receivedAt, now) = snapshot.elapsedMs + (snapshot.status === 'running' ? max(0, now − receivedAt) : 0)`. `now`는 `performance.now()`다.
- `formatElapsed(ms)`: `floor(ms/1000)`초 → `HH:MM:SS`. 시는 최소 2자리이고 99시간을 넘으면 자릿수가 늘어난다(잘라내거나 되돌리지 않는다). 음수·NaN은 `00:00:00`.
- 갱신: `running`일 때만 250ms 간격 타이머를 켠다. 표시 초가 바뀔 때만 state를 바꾼다. `running`이 아니면 타이머를 끈다.
- 화면 상태는 `timer://changed`와 첫 `get_timer`로만 바꾼다. `control_timer`·`set_resting`의 반환값은 이벤트와 같은 값이라 쓰지 않는다(갱신 경로를 하나로 둔다).

## 4. 계약 변경 목록 (contract v0.21)

| 종류 | 이름 | 변경 | 하위 호환 | 소비자 |
|---|---|---|---|---|
| 타입 | `AssetSlot` `'pomo_char'`·`'pomo_bubble'` (Rust `SimpleSlot::PomoChar`·`PomoBubble`, 파일 `pomo_char.png`·`pomo_bubble.png`) | 추가 — 캔버스 레이어, 선택, 내장 기본 없음(`hasBuiltinDefault` false, `DEFAULT_ASSET_SLOTS`·`REQUIRED_SLOTS` 불변) | 비파괴(유니온 멤버 추가) | overlay, settings |
| 타입 | `TimerSettings`, `Settings.timer` | 추가 | 비파괴(serde default — 옛 파일은 기본값) | overlay, settings |
| 타입 | `TimerStatus` = `'stopped' \| 'running' \| 'paused' \| 'restPaused'`, `TimerSnapshot` = `{ status, elapsedMs }`, `TimerAction` = `'start' \| 'pause' \| 'stop'` | 신규 | — | overlay, settings |
| command | `get_timer()` → `TimerSnapshot` | 신규. 부수 효과 없음 | — | overlay, settings |
| command | `control_timer(action: TimerAction)` → `TimerSnapshot` | 신규. 바뀌었으면 `timer://changed` | — | settings |
| command | `set_resting(resting: boolean)` → `TimerSnapshot` | 신규. 바뀌었으면 `timer://changed`. 에러 없음(잠금 오염 제외) | — | overlay |
| event | `timer://changed` — `TimerSnapshot` | 신규 도메인 `timer`(PT-03·05·06으로 역추적). 빈도 = 상태 변화 시만(사용자 조작·쉬는중 전이, 분당 수 회 이하) | — | overlay, settings |
| 부수 효과 | `set_settings`: 이전 `timer.enabled == true` → 새 값 `false`이면 `Timer::disable`. 바뀌었으면 `settings://changed`(와 손 기준점 이벤트) **뒤에** `timer://changed` | 추가 | 비파괴 | 두 창 |
| 에러 | `timer.disabled` | 신규(`control_timer`만) | 추가 | settings(문구 3개 국어) |
| 권한 | capabilities | **변경 없음** — app manifest가 없어 `generate_handler!` 등록만으로 허용(contract §7). 이벤트 구독은 `core:default` | — | — |

- `import_asset`·`remove_asset`·`restore_default_asset`·`assets://changed`는 시그니처 불변. 새 슬롯도 캔버스 레이어라 캔버스 크기 결정·리사이즈 부수 효과를 그대로 받는다(hair와 같다).
- 이미지 바이트는 이벤트에 싣지 않는다(기존 원칙). 타이머 이벤트에 창별 정보는 없다.

## 5. 설정 스키마 변경

| 키(JSON) | 타입 | 기본값 | 검증 범위(`set_settings` — 밖이면 `settings.invalid`) | 읽을 때 보정(`load`) |
|---|---|---|---|---|
| `timer.enabled` | bool | `false` | — | — |
| `timer.textPos` | `Point {x,y}`(기존 `Point`, 캔버스 좌표, **글자 상자 중심**) | `{x: 268, y: 403}` | 유한수, `0 ≤ x ≤ 900`, `0 ≤ y ≤ 700`(캔버스 최대 크기) | 범위로 자르기, 비유한수는 기본값 |
| `timer.rotation` | number(도, 시계 방향 +) | `5` | 유한수, `−180 ≤ r ≤ 180` | 자르기 |
| `timer.fontSize` | number(캔버스 px) | `36` | 유한수, `12 ≤ s ≤ 200` | 자르기 |
| `timer.color` | string `#rrggbb` | `"#333333"` | 정규식 `^#[0-9a-fA-F]{6}$` | 형식이 틀리면 기본값. 저장은 소문자 |

- 마이그레이션 없음. 버전 필드도 없다(D19 유지). `timer`가 없거나 일부만 있는 옛 파일은 빠진 값을 기본값으로 채운다(`TimerSettings`에도 `#[serde(default)]`).
- 기본값의 근거: 참고 그림 말풍선의 흰 몸통을 눈대중으로 잰 값이다. 몸통은 x ≈ 148~388, y ≈ 338~468이라 중심은 ≈ (268, 403)이다. 오른쪽이 약 5° 내려가 있다. 안쪽 폭 약 225px에 `00:00:00`(굵은 표 숫자 약 4.8em)이 들어가도록 글자 크기는 36px로 잡았다. 글자 색은 흰 말풍선 위의 진회색이다. 사용자가 미리보기로 맞춘 값을 코드 기본값으로 옮기는 선례(`penPos`, CR-035)대로 나중에 확정할 수 있다(U-6).
- 캔버스가 900×700보다 작으면 core 범위 안이어도 글자가 캔버스 밖으로 나갈 수 있다. 오버레이는 그대로 그린다. 설정 창 끌기는 실제 캔버스 안으로 제한한다.

## 5a. 사용자 결정 사항 (미결 — 권고안으로 패킷 작성, 결정이 다르면 해당 패킷 절만 바꾼다)

| # | 질문 | 대안 | 권고 | 근거 | 영향 계층 |
|---|---|---|---|---|---|
| **U-1** | 시간 글자를 언제 보이나 | A 항상(요구 문구 그대로) · **B 타이머 켜짐이거나 뽀모도 그림(인물·말풍선)이 1장 이상 등록돼 있을 때** · C 말풍선이 있을 때만 | **B** | A를 따르면 뽀모도 그림을 넣지 않은 사용자(기본 설치 포함)의 캐릭터 위에 `00:00:00`이 떠 버린다. B는 요구 「꺼져 있어도 글자는 보인다」를 뽀모도를 쓰는 사용자에게 그대로 지키면서 그 부작용만 없앤다. 설정 창 미리보기는 조건과 무관하게 늘 글자를 보인다 | ui |
| **U-2** | 타이머를 끄면 | **A 일시정지(값 유지, 다시 켜도 자동 재개 없음)** · B 멈춤(00:00:00 초기화) | **A** | 요구 「꺼져 있어도 글자는 보인다(**시간만 멈춤**)」 | core·ui |
| **U-3** | 켜짐으로 저장된 채 앱을 다시 켜면 | **A 멈춤 00:00:00에서 대기(시작 버튼 필요)** · B 자동 시작 | **A** | 요구는 「시간 0」만 정한다. 자동 시작은 요구에 없는 동작이다 | core |
| **U-4** | 쉬는중 진입 전 무입력 대기(기본 5분)를 경과에서 뺄까 | **A 빼지 않음** · B 진입 순간 대기 시간만큼 되돌림 | **A** | 요구 문구 「쉬는중이 **되면** 자동 일시정지」. B는 판정·되돌림 규칙이 늘어나는 요구 확장이다 | core |
| **U-5** | 타이머 탭 미리보기 합성 | **A 배경 → 뽀모도 인물 → 말풍선 → 시간 글자 → 본체(`kb_up`, 포인터 통과)** · B 본체 없이 앞의 네 가지만 | **A** | 오버레이 최종 모습과 같다. 글자가 본체에 가려지는지 바로 보인다. `kb_up`은 필수 슬롯이라 항상 있다 | ui |
| **U-6** | 글자 기본값 | 권고값 (268, 403) · 5° · 36px · `#333333` | 권고값 | §5 근거(참고 그림 눈대중). 사용자가 맞춘 값으로 바꿔도 된다 | core·bridge(TS 상수)·ui |
| **U-7** | 「멈춤」(초기화)에 확인창 | **A 없음** · B 확인창 | **A** | 요구에 없다. 스톱워치 초기화라 되돌릴 비용이 작다 | ui |
| **U-8** | 버튼 활성 규칙 | **A 켜짐이면 세 버튼 모두 활성, 상태에 맞지 않는 누름은 core가 무시(—)** · B 상태별로 비활성(흐르는 중엔 시작 비활성 등) | **A** | 요구 「on이면 시작·일시정지·멈춤 버튼 활성」 그대로. 지금 흐르는지는 미리보기의 살아 있는 시간으로 보인다 | ui |

아키텍트 결정(사용자 확인 불요, 이견 있으면 알려 주면 된다):
- **A-1 글꼴**: `font-family: 'Segoe UI', 'Malgun Gothic', sans-serif; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1; white-space: nowrap`. 새 폰트 파일은 없다. Segoe UI 숫자는 표 숫자(폭이 같다)라서 초가 바뀌어도 글자 폭이 떨리지 않는다. 등폭 느낌을 더 원하면 `Consolas`를 맨 앞에 두면 된다(한 줄 변경).
- **A-2 회전·크기 조작 UI**: 미리보기 위 핸들이 아니라 **슬라이더 2개**(회전 −180~180°·1° 단위, 크기 12~200px·1 단위, 값 표시 `<output>`)다. 기존 배율 슬라이더(`ScaleIdleCard`)와 같은 저장 방식(놓을 때 저장)을 쓴다. 키보드로 조작할 수 있고, 새 컴포넌트 없이 로컬 원소만 쓰기 때문이다(settings D-3 선례). 위치는 미리보기에서 끌기(🔒 요구)다.
- **A-3 색 선택**: 네이티브 `<input type="color">`다(WebView2 → Windows 색 대화상자, 새 의존성 없음). `input` 이벤트는 미리보기에만 반영하고, `change`(대화상자 닫힘)에서 저장한다.
- **A-4 탭 위치**: 세로 메뉴 **4번째(맨 아래)** `timer`, 아이콘은 코드로 그린 스톱워치(`TabIcon`, CR-031 방식).
- **A-5 이미지 카드**: 이미지 설정 탭 **배경 그룹**에 `background`·`hair` 다음으로 `pomo_char`·`pomo_bubble`을 둔다(🔒 「배경 그룹에 선택 슬롯 2개」). 내장 기본이 없으므로 「기본값」은 비우기다(현 hair와 같은 `resetKind: 'clear'`).

## 6. 종단간 RTM

아키텍처 요구ID `PT-xx`(이 설계서 전용). 화면 요구ID는 ui-designer가 각 `requirements.md` 마지막 번호 다음으로 확정한다(현재 overlay R-32, settings R-41까지 쓰였다).

| 요구ID | 요구(확정사항 §6 CR-045) | ui | bridge | core | 설정 키 | 테스트 | 상태 |
|---|---|---|---|---|---|---|---|
| PT-01 | 배경 그룹 선택 슬롯 2개(뽀모도 인물·말풍선), 캔버스 레이어, 내장 기본 없음 | settings `imageSlots.ts` 배경 그룹 카드 2·i18n `slots`; overlay `PomodoroLayer` | `AssetSlot` +2(§3.1), 기존 `import/remove_asset`·`assets://changed` | `assets::slot` `SimpleSlot::PomoChar·PomoBubble`, `file_key` | — | core `pomo_slot_*`; ui `imageSlots.test`·`PomodoroLayer.test` | 설계 |
| PT-02 | 겹침 배경→인물→말풍선→시간 글자→(본체 덩어리), 고정(젤리·부르르 없음), on/off와 무관하게 항상 | overlay `OverlayApp` DOM 순서, `PomodoroLayer`는 `.jellyWrap` 밖 | — | — | — | ui `OverlayApp.pomodoro.test`(DOM 순서·젤리 클래스 미부착) | 설계 |
| PT-03 | 0부터 올라가는 스톱워치 `00:00:00`, React/CSS 글자, 꺼져도 글자 보임(시간만 멈춤) | `components/utils/timerClock.ts`·`hooks/useTimerSnapshot`·`useElapsedText`, overlay `TimerText` | `TimerSnapshot`, `get_timer`, `timer://changed` | `timer::Timer::snapshot` | `timer.*`(스타일) | core `timer_*`; ui `timerClock.test`·`TimerText.test` | 설계 (표시 조건 U-1) |
| PT-04 | 설정 창 새 「타이머」 탭, on/off 토글 | settings `TimerTab`(`ToggleSwitch`), `TAB_IDS` +`timer`, `TabIcon` | `Settings.timer.enabled`, `set_settings` + 끔 부수 효과 | `settings::timer::TimerSettings`, `Timer::disable` | `timer.enabled` | core `set_settings_disable_*`(bridge 테스트); ui `TimerTab.test` | 설계 (U-2) |
| PT-05 | on이면 시작·일시정지·멈춤 활성. 시작=흐름, 일시정지=그 자리, 멈춤=00:00:00 | `TimerTab` 버튼 3 | `control_timer`, `TimerAction`, `timer.disabled` | `Timer::apply` | `timer.enabled` | core 전이표 전부; ui `TimerTab.test` | 설계 (U-7·U-8) |
| PT-06 | 쉬는중 자동 일시정지, 입력 시 자동 재개, 사용자 일시정지는 재개 안 함 | overlay `useEffect([machine.layer])` → `setResting` | `set_resting` | `Timer::set_resting`(`restPaused` 구분) | (기존 `idleSeconds`) | core `rest_*`; ui `OverlayApp.pomodoro.test`(rest 진입·해제 시 호출) | 설계 (U-4) |
| PT-07 | 미리보기에서 글자 위치(끌기)·회전·크기 | `TimerTab` 미리보기(`TimerPreview`)·슬라이더 2 | `set_settings` | `settings::timer::validate/normalize` | `timer.textPos`·`rotation`·`fontSize` | core `timer_settings_*`; ui `TimerPreview.test` | 설계 (U-5, A-2) |
| PT-08 | 글자 색 선택 | `TimerTab` 색 입력 | `set_settings` | 색 형식 검증·소문자화 | `timer.color` | core `timer_color_*`; ui `TimerTab.test` | 설계 (A-3) |
| PT-09 | 재시작 시 항상 00:00:00(경과 비저장), 위치·회전·크기·색·on/off 저장 | 초기 `getTimer` → `stopped`·0 | `get_timer` | `Timer::new`(휘발), settings 영속 | `timer.*` | core `timer_new_is_stopped_zero`·`old_settings_without_timer_*` | 설계 (U-3) |
| PT-10 | 설정 창 문구 3개 국어(기존 R-20 규칙 연장) | i18n `ko/ja/en`·`types.ts`(`tabTimer` 등, `slots.pomo_*`, `errors['timer.disabled']`) | 에러 code `timer.disabled` | `TimerError::Disabled` | `language`(기존) | ui `i18n.test`(키 집합·ERROR_CODES 22→23) | 설계 |

끊긴 열 없음(해당 없음은 `—`).

## 7. 비기능 목표와 측정

| 항목 | 목표 | 측정 |
|---|---|---|
| IPC 빈도 | 타이머 이벤트는 상태 변화 때만(매초 이벤트 0건) | core 테스트: 멱등 입력은 `changed=false`, bridge 테스트: 변화 없으면 emit 없음 |
| 표시 오차 | 실제 경과와 표시 차이 < 1초(250ms 간격 + 이벤트 지연 수 ms) | vitest 가짜 타이머(`timerClock.test`), 수동: 스톱워치와 5분 비교(verify) |
| 렌더 비용 | 초당 `TimerText` 1회만 다시 그림. `OverlayApp`·`.jellyWrap` 재렌더 0 | vitest: 렌더 카운트(Profiler 또는 mock) |
| CPU | 오버레이 유휴 CPU 증가 < 0.5%p | verify 단계 작업 관리자 관찰(수동) |
| 메모리 | core `Timer` 크기는 수십 바이트, 할당 없음 | 코드 리뷰 |

**위험(확인 필요):** 트레이에서 오버레이를 숨기면 WebView2가 숨은 페이지의 타이머를 늦출 수 있다(Chromium 절전 규칙). 그러면 쉬는중 판정과 `set_resting` 호출이 최대 약 1분 늦을 수 있다. 경과 계산은 core `Instant` 기준이라 정확도에는 영향이 없다. verify 단계에서 「오버레이 숨김 + 5분 무입력」으로 실측하고, 문제가 되면 따로 CR로 다룬다.

## 8. 문서 동기화 대상 (각 계층 패킷에 배정)

- core: `doc/200_설계/core/timer.md`(신규), `assets.md`(슬롯 표), `settings.md`(`timer` 필드·보정 규칙).
- bridge: `doc/200_설계/bridge/contract.md` v0.21(§3.1·§3.3·§3.9 신설·§4·§5·§5.8 신설·§6·§6.2·§7 메모·§8·§9).
- ui: `src/overlay/{requirements,design}.md`·`design/components.md`·`design/functions.md`·`test/scenarios.md`·`test/change-requests.md`(CR-045), `src/settings/{requirements,design}.md`·`design/i18n.md`·`design/images-tab.md`·(신규) `design/timer-tab.md`·`test/scenarios.md`·`test/change-requests.md`(CR-045), 두 화면 `manual.md`.
- 메인 세션: 확정사항 §7 폴더 구조에 `timer/` 추가, §6 CR-045에 결정(U-1~U-8) 줄 추가.
