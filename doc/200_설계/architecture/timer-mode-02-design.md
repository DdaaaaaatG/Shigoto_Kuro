# timer-mode 전반 설계 (CR-048 타이머 모드 추가)

- 근거: `doc/000_프로젝트_확정사항.md` §6 103~107행 「타이머 모드 추가 (🔒 2026-09-26 사용자 지정, CR-048)」(단일 소스). 102행 CR-045 결정(끄면 일시정지·재시작 시 대기 등)의 모드별 적용은 §3.4.
- 작업 모드: **보강**. CR-045 뽀모도 스톱워치가 core·bridge·ui 모두 구현돼 있고 거기에 카운트다운·알림음·트레이 메뉴를 더한다.
- 판별: **횡단**. core(타이머 상태기계에 새 상태 `finished`와 모드, 마감 시각 스레드, 설정 필드 3개, 알림음 저장소, 트레이 동적 메뉴) + bridge(타입 확장, command 3개 신규, 에러 code 3개, `timer://changed` 발신 지점 추가, CSP) + ui(설정 창 토글 2개·시간 입력·알림음 카드, 오버레이 깜빡임·알림음 재생)를 모두 바꾼다. 상태기계의 상태·전이 자체가 바뀐다.
- 구조 분석서(01)는 따로 만들지 않았다. pomodoro 선례처럼 현황은 §1에 요약했다. core·bridge 분석가 위임은 생략했고 아키텍트가 직접 읽었다(예산 50회·20분). 읽은 파일: `timer/mod.rs`, `settings/timer.rs`, `tray/mod.rs`, `assets/mod.rs`, `bridge/commands.rs`(타이머 부분), `lib.rs`(발췌), `tauri.conf.json`, `contract.md` §3.9·§4·§5·§5.8·§7, `TimerTab.tsx`, `TimerText.tsx`, `timerClock.ts`, `useElapsedText.ts`, i18n 키.
- 인계 순서: `timer-mode-03-packet-core.md` → `-03-packet-bridge.md` → `-03-packet-ui.md`.

## 0. 결론

비유: 지금 타이머는 벽시계 하나다(pomodoro 02 §0). 이번에는 그 벽시계에 **부엌 타이머 다이얼**을 단다. 다이얼은 0이 되는 순간을 벽시계가 직접 알아야 한다. 방(창)마다 따로 세면 방이 잠든 사이(오버레이 숨김) 늦게 울리기 때문이다. 그래서 벽시계 뒤에 **알람 시계 하나**(마감 시각 스레드)를 둔다. 이 시계는 매초 울리지 않는다. 다음 마감 시각까지 자다가 한 번 깬다.

1. **설정 모델 = `enabled` 유지 + `mode: 'stopwatch' | 'countdown'` 추가**(권고 D-1). 토글 두 개는 이 두 값에서 계산한다. 상호배타가 타입 수준에서 보장되고, 옛 파일 `{"enabled":true}`는 `mode` 기본값 `stopwatch`로 읽혀 **이행 코드 없이** 「스톱워치 켜짐」이 된다. `enabled`의 의미(「타이머 기능 사용 중」)는 그대로라 글자 표시 조건(U-1)과 끔 부수 효과가 바뀌지 않는다. 계약은 **비파괴**(필드 추가)다.
2. **0 도달 판정 주체 = core.** `Timer`에 `configure`·`tick`·`next_wake`를 더하고, 새 `timer/driver.rs`가 다음 마감 시각까지 잠드는 스레드 1개를 둔다(주기 emit 없음, 할 일이 없으면 무기한 대기). 트레이와 오버레이가 같은 판정을 본다.
3. **새 상태 `finished`**(끝남, 10초): 0에 닿으면 `finished` → 10초 뒤 core가 `stopped`(지정 시간 대기)로 되돌린다. 오버레이는 `finished`에 들어가는 **이벤트 전이**를 보고 알림음을 1회 재생하고, 글자를 CSS로 깜빡인다.
4. **알림음 = 오버레이 webview의 `HTMLAudioElement`.** 사용자 파일은 `assets/alarm.{wav|mp3|ogg}`(고정 이름, `AssetSlot`과 분리한 `assets/sound.rs`)에 둔다. 내장 기본음은 **TS 순수 함수로 합성한 짧은 WAV**(Blob URL)다. 새 의존성은 없다. 대신 `tauri.conf.json`에 **CSP `media-src`와 WebView2 자동 재생 인자**를 더해야 한다(메인 세션 반영, 사용자 승인 D-8·D-9).
5. **트레이**: 타이머가 켜져 있을 때만 메뉴 맨 위에 「시작」(흐르는 중이면 「일시정지」)·「멈춤」을 둔다. 상태가 바뀔 때만 메뉴를 다시 만든다.
6. 계약 v0.22 → **v0.23. 파괴 변경은 없다.** 새 의존성도 없다. capabilities 파일은 바뀌지 않는다(`dialog:allow-open` 재사용). `tauri.conf.json`만 바뀐다.

## 1. 현황 요약 (구조 분석)

```
설정 창 TimerTab ─ setSettings({timer:{enabled}}) ─▶ set_settings ─▶ settings::update ─▶ settings://changed
                 │                                   └─ enabled true→false ⇒ Timer::disable ─▶ timer://changed
                 └─ controlTimer(action) ─▶ control_timer ─▶ (settings 잠금: enabled 복사) → Timer::apply ─▶ timer://changed
오버레이 OverlayApp ─ useEffect([machine.layer]) ─ setResting(bool) ─▶ set_resting ─▶ Timer::set_resting ─▶ timer://changed
두 창 useTimerSnapshot(구독 먼저 → getTimer) → useElapsedText(running이면 250ms 계산, 초 바뀔 때만 렌더)
트레이 tray::init — 고정 메뉴 4개(설정 열기/새로고침/오버레이 표시·숨김/종료), 메뉴 핸들 보관 안 함
AppState.timer: Mutex<Timer>  (lib.rs:56·115)   창 생성: WebviewWindowBuilder::from_config(lib.rs:263)
```

| 항목 | 현황 | 이번 설계에 주는 제약 |
|---|---|---|
| core `Timer` | 상태 4개(stopped/running/paused/restPaused), `accumulated + (now − since)`, 시각 주입, 스레드 없음. `apply(action, enabled, now)`·`set_resting`·`disable`·`snapshot` | 시그니처를 유지하고 **추가만** 한다. 그래야 core 패킷 중에도 `bridge/commands.rs`가 그대로 컴파일된다 |
| 계약 §5.8-1 | 「bridge·core에 타이머 스레드를 만들지 않는다」 | 카운트다운 0 판정에 스레드가 필요하다. **규칙을 바꾼다**: 「마감 시각 스레드 1개, 주기 emit 금지」(§4) |
| `TimerSettings` | `enabled`·`textPos`·`rotation`·`fontSize`·`color`, `#[serde(default)]`, `validate`(거부)·`normalize`(load 보정) | 새 필드도 같은 규칙을 따른다. 타입이 틀린 값 하나로 설정 **전체**가 기본값으로 돌아가면 안 된다 |
| 트레이 | 고정 메뉴. 토글 경로는 `settings::update` → `emit_settings_changed`(core가 bridge events를 직접 부르는 선례) | 동적 메뉴는 `TrayIcon::set_menu`로 **다시 만든다**(Tauri `MenuItem`에는 숨김 API가 없다). 메뉴 id는 고정이라 핸들러는 그대로다 |
| 에셋 보안(CR-047) | 저장 경로는 `stored_file_name(slot)`에서만 만든다. `metadata` 크기 선검사 → `read_capped`. 매니페스트는 `write_atomic` | 알림음도 같은 규칙: 고정 이름, 크기 선검사, `read_capped`, `write_atomic` |
| CSP | `default-src 'self'; img-src 'self' asset: http://asset.localhost data:; …` — **`media-src` 없음** | `<audio src="http://asset.localhost/…">`와 `blob:`가 `default-src 'self'`에 막힌다. **CSP 수정이 필수다** |
| asset scope | `$APPDATA/assets/**` | `assets/alarm.*`가 이미 범위 안이다. 바꿀 것 없음 |
| 자동 재생 | 오버레이는 사용자 제스처를 거의 받지 않는다(클릭 통과·드래그만). 트레이에서 시작하면 어느 창에도 제스처가 없다 | Chromium 자동 재생 정책 때문에 `play()`가 `NotAllowedError`로 막힐 수 있다. WebView2 인자로 푼다(D-8) |
| ui 픽스처 | `TimerSnapshot` 리터럴(`elapsedMs:`)이 테스트 25개 파일 이상에 있다. `Settings.timer`는 TS에서 선택 필드(`settings.timer ?? DEFAULT_TIMER_SETTINGS`) | 새 TS 필드를 **필수**로 두면 bridge 패킷 끝에서 `tsc`가 ui 테스트에서 깨진다. 그래서 **선택 필드 + 기본값**으로 둔다(Rust는 항상 보낸다, §3) |
| 파일 크기 | `TimerTab.tsx` 212줄 | 토글 2·시간 입력·알림음 카드를 더하면 400줄을 넘는다. 하위 컴포넌트로 뺀다 |

## 2. 목표 구조

```
[설정 창 TimerTab]
  ├ 토글 「스톱워치 사용」·「타이머 사용」 ─ setSettings({timer:{enabled, mode}})
  ├ 시작 시간 H:M:S ─ setSettings({timer:{countdownSecs}})
  │      set_settings ─▶ settings::update ─▶ settings://changed
  │                   └▶ (타이머 부수 효과) disable?(끔) → Timer::configure(mode, D) → 바뀌면 publish_timer_change
  │                   └▶ tray::sync_timer_menu (항상 부르고, 보기가 같으면 아무것도 안 함)
  ├ 시작/일시정지/멈춤 ─ controlTimer ─▶ control_timer ─▶ Timer::apply ─▶ 바뀌면 publish_timer_change
  └ 알림음 카드 ─ pickAudioFile → importAlarmSound(path) / removeAlarmSound / getAlarmSound, 미리 듣기 = 로컬 재생

[트레이] 「시작|일시정지」·「멈춤」 ─▶ tray 핸들러 ─▶ Timer::apply ─▶ 바뀌면 publish_timer_change

[core 마감 시각 스레드 timer/driver.rs]  next_wake()까지 recv_timeout → Timer::tick(now) ─▶ 바뀌면 publish_timer_change
      running(카운트다운) ──마감──▶ finished ──10초──▶ stopped(D)

publish_timer_change(app, snap)  (lib.rs, 조립 지점 — 모든 타이머 변경이 지나가는 깔때기)
      ① bridge::events::emit_timer_changed  ② tray::sync_timer_menu  ③ timer_waker.wake()

[오버레이]  onTimerChanged: status가 finished로 **들어가는 이벤트**면 → getAlarmSound() → 재생(음량 = timer.alarmVolume)
            TimerText: snapshot.mode에 따라 올라가는/내려가는 시간, finished면 CSS 깜빡임
```

- 깔때기가 하나라서 「emit은 했는데 트레이가 안 바뀜」이나 「상태는 바뀌었는데 마감 스레드가 모름」이 생기지 않는다. 타이머를 바꾸는 모든 경로(`control_timer`·`set_resting`·`set_settings` 부수 효과·트레이·마감 스레드)는 바뀌었을 때 **반드시** 이 함수를 부른다.
- 알림음 정보는 이벤트로 보내지 않는다. 오버레이가 울릴 때 `get_alarm_sound`를 한 번 부른다. 창 간 동기화가 필요 없고, 바꾸는 쪽은 설정 창 하나뿐이다.

## 3. 상태 기계 확정본

### 3.1 core 타이머 — 모드·상태

`Timer`에 `mode`(설정에서 받은 값), `configured`(설정의 시작 시간), `active`(이번 회차 시작 시간 — 대기로 돌아갈 때 `configured`로 바뀜), `finished_until: Option<Instant>`을 더한다.

| 상태 | 스톱워치 | 타이머(카운트다운) | 경과(`elapsedMs`) |
|---|---|---|---|
| `stopped` | 00:00:00 대기 | 지정 시간 대기(남은 = D) | 0 |
| `running` | 올라감 | 내려감 | `min(acc + (now − since), D)`(스톱워치는 상한 없음) |
| `paused` | 사용자 일시정지·끔 | 같음 | `acc` |
| `restPaused` | 쉬는중 자동 일시정지 | **없음**(쉬는중에도 계속) | `acc` |
| `finished` **(신규)** | **없음** | 0 도달 후 10초. 글자 00:00:00 깜빡임 | D |

- 스냅숏 = `{ status, elapsedMs, mode, durationMs }`. `durationMs` = 카운트다운이면 `active`, 스톱워치면 0. ui는 `mode`와 `durationMs`만 보고 그린다. 설정 이벤트와 타이머 이벤트가 도착하는 순서에 흔들리지 않는다.
- 마감 시각 `deadline = since + (active − acc)`(카운트다운 `running`일 때만). `next_wake()` = `running`(카운트다운)이면 `deadline`, `finished`면 `finished_until`, 그 밖은 `None`.

### 3.2 카운트다운 전이표 (`mode == countdown`)

| 현재 \ 입력 | `start` | `pause` | `stop` | `resting=±` | `disable`(끔) | `tick` 마감 도달 | `tick` 끝남 10초 경과 |
|---|---|---|---|---|---|---|---|
| stopped | running(남은 D) | — | — | — | — | — | — |
| running | — | paused | stopped(D) | — | paused(남은 유지) | **finished**(`finished_until = now + 10초`) | — |
| paused | running | — | stopped(D) | — | — | — | — |
| finished | **running**(새 회차, D = `configured`) | — | stopped(D) | — | **stopped**(D) | — | **stopped**(D) |

- `—` = 변화 없음(에러 아님, emit 없음). `start`·`pause`·`stop`은 기존대로 `enabled == false`면 `timer.disabled`다.
- `stopped`로 들어갈 때마다 `active = configured`, `acc = 0`, `finished_until = None`.
- 끝남 10초는 **감지 시각부터** 잰다(`now + 10초`). 스레드가 조금 늦게 깨도 깜빡임은 온전히 10초다. PC가 절전에서 깨어나 마감을 한참 지나서 감지해도 `finished`를 거친다(알림음이 울린다).
- `finished`에서 `start` = 곧바로 새 회차를 시작한다(D-7). `stop` = 깜빡임을 멈추고 대기한다.

### 3.3 스톱워치 전이표 — 기존과 같다

pomodoro-02 §3.1 표 그대로다. `finished`로 가지 않는다. `tick`은 아무것도 하지 않는다(`next_wake` = `None`).

### 3.4 설정 변경(`configure`)과 102행 결정의 모드별 적용

`Timer::configure(cfg: TimerConfig{mode, countdown}, now) -> bool`(스냅숏이 바뀌었으면 true). 판정 순서:

1. **모드가 바뀜** → 새 모드의 `stopped`로 초기화한다(스톱워치는 0, 카운트다운은 D). 이전 모드의 값은 버린다(D-4).
2. 시작 시간이 바뀜 → `configured = 새 값`. 지금 `stopped`면 `active`도 바꾸고 표시를 갱신한다(카운트다운일 때만 스냅숏이 바뀐다). `running`·`paused`·`finished`면 **다음 대기부터** 반영한다(ui는 이때 입력을 잠근다, D-5. core 규칙은 안전망이다).
3. `enabled` 변화는 `configure`가 다루지 않는다. 끔(true→false)은 기존 `disable`이 먼저 처리한다(bridge 부수 효과 순서: `disable` → `configure`).

| CR-045 결정(102행) | 스톱워치 | 타이머(카운트다운) |
|---|---|---|
| 흐르는 중 끄면 일시정지(값 유지), 다시 켜도 자동 재개 없음 | 그대로 | 그대로(남은 시간 유지). **`finished` 중에 끄면 `stopped`(D)**. 깜빡임과 소리가 멈춘다 |
| 켜진 채 앱 재시작 → 대기(자동 시작 없음) | 00:00:00 | **지정 시간** 대기(예: 00:25:00) |
| 쉬는중 자동 일시정지·입력 시 자동 재개 | 그대로(`restPaused`) | **적용 안 함**(🔒 103행 「쉬는중에도 계속 줄어듦」). `set_resting`은 no-op |
| 쉬는중 진입 전 무입력 시간을 빼지 않음 | 그대로 | 해당 없음 |
| 글자 표시 조건 U-1(켜짐 또는 뽀모도 그림 ≥1장) | `enabled`의 의미가 「둘 중 하나 켜짐」이 되어 식이 **그대로**다 | 같음 |
| 멈춤 확인창 없음, 켜짐이면 세 버튼 모두 활성 | 그대로 | 그대로 |
| 경과 비저장 | 그대로 | 남은 시간도 저장하지 않는다(시작 시간 `countdownSecs`는 저장) |

### 3.5 오버레이 입력 상태기계 (`src/state/inputMachine.ts`) — 변경 없음

쉬는중 보고(`setResting`)도 그대로다. 카운트다운일 때 무시하는 것은 core가 한다(판정 한 곳).

### 3.6 ui 표시 규칙 (순수 함수, 두 창 공통)

- `elapsedNow`는 그대로다(`running`만 받은 뒤 흐른 시간을 더한다).
- 표시 ms: 스톱워치 = `elapsedNow`, 카운트다운 = `max(0, durationMs − elapsedNow)`.
- 반올림: 스톱워치는 **내림**(기존), 카운트다운은 **올림**(`ceil`). 올림이라야 시작 순간에 `00:25:00`이 보이고, 0에 닿는 순간에 `00:00:00`이 된다.
- `finished`: `00:00:00` + 깜빡임(1초 주기, `opacity` 1↔0, `steps`). `running`이 아니므로 250ms 계산 타이머는 돌지 않는다.
- `snapshot.mode`·`durationMs`가 없으면(옛 픽스처) `'stopwatch'`·0으로 본다.

## 4. 계약 변경 목록 (contract v0.22 → v0.23)

| 종류 | 이름 | 변경 | 하위 호환 | 소비자 |
|---|---|---|---|---|
| 타입 | `TimerMode` = `'stopwatch' \| 'countdown'` | 신규 | — | overlay, settings |
| 타입 | `TimerSettings` + `mode`·`countdownSecs`·`alarmVolume` | 추가. Rust는 항상 직렬화한다. TS는 **선택 필드**이고, 없으면 `DEFAULT_TIMER_SETTINGS` 값을 쓴다 | 비파괴(serde default, 옛 파일은 이행 코드 없이 읽힘) | overlay, settings |
| 타입 | `TimerStatus` + `'finished'` | 유니온 멤버 추가 | 비파괴(소비자 분기 보강 필요 — ui 패킷) | overlay, settings |
| 타입 | `TimerSnapshot` + `mode`·`durationMs` | 추가. Rust는 항상 보낸다. TS는 선택 필드(옛 픽스처 호환) | 비파괴 | overlay, settings |
| 타입 | `AlarmFormat` = `'wav' \| 'mp3' \| 'ogg'`, `AlarmSound` = `{ format, bytes, url }` | 신규 | — | overlay, settings |
| command | `get_alarm_sound()` → `AlarmSound \| null` | 신규. 부수 효과 없음 | — | overlay(울릴 때), settings |
| command | `import_alarm_sound(path: string)` → `AlarmSound` | 신규. 검증 후 `assets/alarm.{ext}`로 저장하고, 다른 형식 파일은 지운다. **이벤트 없음** | — | settings |
| command | `remove_alarm_sound()` → `void` | 신규. 멱등(없어도 성공). 이벤트 없음 | — | settings |
| command | `control_timer` | 의미 확장: 카운트다운 전이(§3.2). `finished`에서 `start`·`stop` | 비파괴(시그니처 불변) | settings |
| command | `set_resting` | 의미 확장: 카운트다운이면 항상 변화 없음 | 비파괴 | overlay |
| 부수 효과 | `set_settings` 7단계 | 「끔 → `disable`」에 더해 `configure(mode, D)`와 `tray::sync_timer_menu`. 바뀌었으면 `timer://changed`(기존 순서 규칙: `settings://changed`·손 기준점 이벤트 **뒤**) | 비파괴 | 두 창 |
| event | `timer://changed` | **발신 지점 추가**: 마감 스레드(`finished` 진입·10초 뒤 복귀), 트레이 메뉴, `configure`. 페이로드는 확장된 `TimerSnapshot`. 빈도: 상태가 바뀔 때만(카운트다운 1회당 +2건) | 비파괴 | overlay, settings |
| 규칙 | §5.8-1 | 「타이머 스레드를 만들지 않는다」 → 「core 마감 시각 스레드 1개만 둔다. 다음 마감까지 잔다. 주기 emit 금지」 | 문서 규칙 변경(소비자 영향 없음) | — |
| 에러 | `sound.not_audio`, `sound.too_many_bytes`, `sound.io` | 신규 | 추가 | settings(문구 3개 국어) |
| 에러 문구 | `timer.disabled` | code는 그대로다. 문구만 「스톱워치나 타이머를 먼저 켜 주세요」로 바꾼다 | 비파괴 | settings |
| TS 래퍼 | `pickAudioFile(title?)` | 신규 TS 전용(plugin-dialog `open`, 필터 `wav·mp3·ogg`) | — | settings |
| 권한 | capabilities | **변경 없음**. 새 command는 앱 command라 등록만으로 허용된다. 파일 선택은 기존 `dialog:allow-open`(settings 창)으로 된다 | — | — |
| 설정 파일 | `tauri.conf.json` | ① CSP에 `media-src 'self' asset: http://asset.localhost blob:` 추가 ② 두 창에 **같은** `additionalBrowserArgs` = `--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required`(Tauri 기본 인자를 함께 적어야 한다. 두 창이 한 WebView2 환경을 쓰므로 인자가 달라서는 안 된다). **메인 세션이 반영한다**(사용자 승인 D-8·D-9) | — | — |

- 호환성 결론: **파괴 변경 없음.** 옛 settings.json은 이행 코드 없이 읽힌다. `enabled:true` → 스톱워치 켜짐, `enabled:false`/없음 → 둘 다 꺼짐.
- 저장할 때는 새 필드를 모두 쓴다. `enabled`는 계속 쓴다. 버전 필드는 없다(D19 유지).

## 5. 설정 스키마 변경 (`timer.*`)

| 키(JSON) | 타입 | 기본값 | 검증(`set_settings` — 범위 밖이면 `settings.invalid`) | 읽을 때 보정(`load`) | 이행 |
|---|---|---|---|---|---|
| `timer.enabled` | bool | `false` | — | — | 의미가 「스톱워치 또는 타이머 켜짐」으로 넓어진다. 값은 그대로다 |
| `timer.mode` **신규** | `'stopwatch' \| 'countdown'` | `'stopwatch'` | 두 값 중 하나(serde가 거부) | 알 수 없는 문자열·타입 오류 → `stopwatch` + 경고 로그(설정 전체를 무너뜨리지 않는다) | 없으면 `stopwatch` ⇒ 옛 `enabled:true`는 스톱워치 켜짐 |
| `timer.countdownSecs` **신규** | 정수(초) | `1500`(00:25:00, D-2) | `1 ≤ n ≤ 359999`(99:59:59). **0 금지**(D-3) | 0·음수 → 기본값, 상한 초과 → 359999, 소수 → 내림, 타입 오류 → 기본값 | 없으면 1500 |
| `timer.alarmVolume` **신규** | 정수 % | `80`(D-10) | `0 ≤ n ≤ 100` | 범위로 자르기, 타입 오류 → 기본값 | 없으면 80 |
| `textPos`·`rotation`·`fontSize`·`color` | (불변) | | | | |

- 「읽을 때 보정」은 기존 `normalize` 규칙(보정만 하고 경고 로그 1줄)을 따른다. 필드 하나의 타입 오류가 `Format` 오류로 번져 설정 **전체**가 기본값으로 돌아가지 않게 한다. 구현 방식(관대한 역직렬화 함수 등)은 core가 정하고, 테스트로 확인한다.
- 알림음 파일 자체는 settings.json에 적지 않는다. 디스크의 `assets/alarm.*`가 진실이다(매니페스트와 같은 방식, §6.3).

## 6. 알림음 설계

### 6.1 저장 — `AssetSlot`을 재사용하지 않는다

- 결론: 슬롯 개념은 재사용하지 않는다. **보안 규칙만 재사용한다.** 새 파일은 `src-tauri/src/assets/sound.rs`(assets 하위 모듈이라 `read_capped`·`write_atomic`을 그대로 쓴다)이고, 저장 이름은 `assets/alarm.wav` · `alarm.mp3` · `alarm.ogg` 중 하나다.
- 이유: `AssetSlot`은 PNG 전용 경로에 깊게 묶여 있다. `import_bytes`가 PNG 헤더를 파싱하고, `AssetEntry`에 `width/height`가 있고, 캔버스를 계산하고, `stored_file_name`이 `.png`로 끝나고, ui 이미지 카드 목록(`AssetSlot` 유니온)도 그 위에 서 있다. 소리를 넣으면 모든 분기에 예외가 생긴다.
- 보안 규칙(CR-047과 같다): 저장 경로는 `alarm_file_name(format)`에서만 만든다(사용자 파일명·경로 불사용). `metadata().len() > 1MiB`면 읽기 전에 거부한다. `read_capped(src, 1MiB)`로 읽고, `settings::write_atomic`으로 쓴다. 쓴 뒤 **다른 두 형식 파일은 지운다**(없으면 무시). 읽을 때 여러 개가 남아 있으면(드문 중단) 수정 시각이 가장 늦은 것을 쓴다.

### 6.2 형식 검사 (매직 바이트, 확장자는 보지 않는다)

| 형식 | 조건 |
|---|---|
| wav | 길이 ≥ 12, `[0..4] == "RIFF"`, `[8..12] == "WAVE"` |
| ogg | 길이 ≥ 4, `[0..4] == "OggS"` |
| mp3 | `[0..3] == "ID3"`, 또는 프레임 동기: `b0 == 0xFF && (b1 & 0xE0) == 0xE0 && (b1 & 0x06) == 0x02`(Layer III — AAC ADTS `FFF1`을 걸러낸다) `&& (b1 & 0x18) != 0x08`(예약 버전 아님) |
| 그 밖·빈 파일 | `sound.not_audio` |

- 크기: 1MiB(= `ASSET_MAX_BYTES`, 1,048,576바이트) 이하. 넘으면 `sound.too_many_bytes`가 형식 검사보다 **먼저** 나온다(PNG와 같다).
- 디코딩 가능 여부는 검사하지 않는다. 헤더만 맞고 재생이 안 되는 파일은 ui가 처리한다. 미리 듣기 실패 문구를 보이고, 알람 때는 기본음으로 대신 울린다(§6.4).

### 6.3 내장 기본음 — TS 합성 WAV, 새 의존성 없음

- `src/components/utils/alarmSound.ts`의 순수 함수 `synthBeepWav(): Uint8Array`가 만든다. 880Hz 사인파 삐 소리 3번(150ms씩, 사이 100ms), 앞뒤 10ms 페이드, 22,050Hz·16bit·모노 PCM. 약 0.65초, 약 29KB다.
- `defaultAlarmUrl()` = 위 바이트로 만든 `Blob('audio/wav')`의 `URL.createObjectURL`. 창마다 한 번 만들어 캐시한다.
- 대안과 기각 이유: (a) Rust가 WAV를 합성해 `assets/`에 시딩 — 디스크 쓰기와 첫 실행 규칙이 늘어난다. (b) 저장소에 wav 바이너리 커밋 — 생성 스크립트와 파일 관리가 필요하다. (c) Web Audio `OscillatorNode` — 재생 경로가 둘이 되고 음량 처리도 달라진다. TS 합성은 결정적이라 단위 테스트(헤더 필드·길이)가 쉽다.

### 6.4 재생 주체 — 오버레이 webview `HTMLAudioElement`

- 알람: 오버레이가 `timer://changed`에서 `prev.status !== 'finished' && next.status === 'finished'`를 보면 `getAlarmSound()`를 부른다. 결과가 있으면 그 `url`, 없으면 `defaultAlarmUrl()`을 쓴다. `new Audio(url)`, `volume = alarmVolume / 100`, `play()`. **1회 재생**(반복 없음). 첫 `getTimer` 결과가 이미 `finished`여도 울리지 않는다(재로드·새로고침 때 이중으로 울리지 않게).
- 멈춤: 상태가 `finished`를 떠나면(10초 경과·멈춤·시작·끔) 재생 중인 소리를 멈춘다(D-6).
- 실패 대비: 사용자 파일의 `play()`가 거부되거나 `error` 이벤트가 나면 기본음으로 한 번 다시 시도한다. 그것도 실패하면 조용히 무시한다(오버레이에는 문구가 없다).
- 설정 창 미리 듣기: 같은 유틸로 재생한다(사용자 클릭이라 자동 재생 정책에 걸리지 않는다). 음량은 슬라이더 초안값이다. 다시 누르면 처음부터 재생한다.
- 트레이에서 오버레이를 숨긴 상태에서도 재생되는지는 **verify 실측 항목**이다(R-5).
- 대안(기각, D-8 B): Rust 재생. WAV만이면 `PlaySoundW`로 되지만 FFI `unsafe`가 `hook/` 밖으로 나간다. mp3·ogg까지 하려면 `rodio`+`symphonia` **새 의존성**이 필요하다.

### 6.5 CSP·asset protocol 영향

- 사용자 파일 URL은 `AssetEntry.url`과 같은 `versioned_asset_url` 결과(`http://asset.localhost/…?v=mtime`)다. scope `$APPDATA/assets/**` 안에 있다. 형식별 MIME은 asset protocol이 확장자로 정한다(`.wav`·`.mp3`·`.ogg` 고정 이름이라 확실하다).
- CSP: `media-src 'self' asset: http://asset.localhost blob:`를 더한다. `blob:`은 기본음 때문에 필요하다. `connect-src`·`img-src`는 바꾸지 않는다.

## 7. 트레이 메뉴

| 조건 | 메뉴(위→아래) |
|---|---|
| `timer.enabled == false` | 설정 열기 / 새로고침 / 오버레이 표시/숨김 / 종료 (지금과 같음) |
| `timer.enabled == true` | **시작**(status가 `running`이면 **일시정지**) / **멈춤** / ─ 구분선 ─ / 설정 열기 / 새로고침 / 오버레이 표시/숨김 / 종료 |

- 라벨은 한국어 고정이다(기존 트레이 문구와 같다. 트레이 다국어는 요구에 없다). id는 `timer_toggle`·`timer_stop`.
- 「시작|일시정지」: status가 `running`이면 `pause`, 아니면 `start`(`restPaused`·`paused`·`stopped`·`finished` → `start`). 「멈춤」: `stop`.
- 갱신: `tray::sync_timer_menu(app)`가 (설정 잠금으로 `enabled` 복사 → 해제) → (타이머 잠금으로 status 복사 → 해제) → 보기 `{visible, running}`를 계산한다. 마지막 보기와 다를 때만 메뉴를 다시 만들어 `set_menu`한다. 호출 지점은 깔때기 `publish_timer_change`, `set_settings` 부수 효과(항상), 앱 시작 1회다.

## 8. 사용자 결정 사항 (권고안으로 패킷을 썼다. 결정이 다르면 해당 절만 바꾼다)

| # | 질문 | 대안 | 권고 | 근거 | 영향 |
|---|---|---|---|---|---|
| **D-1** | 설정 모델 | **A `enabled` 유지 + `mode: stopwatch\|countdown`** · B `mode: off\|stopwatch\|countdown`(`enabled` 폐기) | **A** | A는 비파괴·이행 코드 0이고, 둘 다 켜진 잘못된 상태를 만들 수 없다. `enabled`를 쓰는 기존 코드(글자 표시 U-1·끔 부수 효과·버튼 비활성)가 그대로 맞다. B는 TS 필드를 제거하는 파괴 변경이라 ui 25개+ 파일의 픽스처와 이행 코드가 필요하다 | 세 계층 |
| **D-2** | 시작 시간 기본값 | **00:25:00** · 00:05:00 · 00:00:00(입력 전 시작 불가) | **00:25:00** | 뽀모도로 기법의 표준 작업 단위다. 0은 D-3과 충돌한다 | core·bridge(TS 상수)·ui |
| **D-3** | 0초 허용 | **A 금지(1초~99:59:59)** · B 허용(시작 즉시 끝남) | **A** | 0에서 시작하면 곧바로 알림이 울린다. 의미 없는 조작이다. ui는 0 입력을 저장하지 않고 원래 값으로 되돌린다 | core·ui |
| **D-4** | 모드를 바꿀 때 이전 모드의 값 | **A 버린다(새 모드 대기)** · B 모드마다 따로 보존 | **A** | 타이머 상태는 하나다. B는 상태가 둘이 되고 전이표가 두 배가 된다. 🔒 「한쪽을 켜면 다른 쪽은 꺼짐」은 사실상 전환이다 | core |
| **D-5** | 흐르는 중에 시작 시간 바꾸기 | **A 입력 잠금(대기·꺼짐일 때만 입력)** · B 언제나 입력, 다음 대기부터 반영 | **A** | 입력한 값과 흐르는 시간이 따로 노는 혼란을 막는다. core는 B 규칙을 안전망으로 가진다 | ui |
| **D-6** | 알림음 길이 | **A 끝남(10초)이 끝나거나 멈춤·시작·끔이면 소리도 멈춤** · B 파일 끝까지 | **A** | 1MB mp3는 1분이 넘을 수 있다. 깜빡임이 끝난 뒤에도 울리면 어색하다. 반복하지 않으니 「1회 재생」에는 맞다 | ui |
| **D-7** | 끝남 중 「시작」 | **A 곧바로 새 회차 시작** · B 무시(10초 기다림) | **A** | 켜짐이면 버튼이 늘 활성이다(U-8). 누르면 반응해야 한다 | core |
| **D-8** | 자동 재생 허용 방법 | **A `tauri.conf.json` `additionalBrowserArgs`에 `--autoplay-policy=no-user-gesture-required`**(두 창 같은 값, Tauri 기본 인자 포함) · B Rust 재생(`rodio`·`symphonia` 새 의존성) | **A** | 의존성 없이 설정 한 줄이다. 오버레이는 제스처를 거의 받지 않고, 트레이 시작은 제스처가 전혀 없다. ui 패킷 첫 작업으로 실측한다(실패하면 아키텍트로 되돌림) | 메인 세션(설정 파일) |
| **D-9** | CSP 완화 | **`media-src 'self' asset: http://asset.localhost blob:` 추가** | 승인 요청 | 없으면 사용자 소리·기본음 모두 막힌다. 범위는 미디어 로드에 한정된다 | 메인 세션 |
| **D-10** | 음량 기본값·단위 | **80%, 0~100 정수, 1 단위** | 권고 | 기본 합성음이 사인파라 100%는 날카롭다. 슬라이더는 기존 배율 슬라이더와 같이 놓을 때 저장한다 | core·ui |
| **D-11** | 트레이 메뉴 배치 | **A 맨 위 2개 + 구분선** · B 「설정 열기」 다음 | **A** | 자주 누를 항목이 맨 위에 있다. 켜고 끌 때 아래 항목의 위치가 흔들리지 않는다 | core |

아키텍트 결정(확인 불요, 이견이 있으면 알려 주면 된다):
- **A-1** 알림음은 `AssetSlot`이 아니라 `assets/sound.rs`(§6.1)에 둔다. 알림음 변경 이벤트는 만들지 않는다(오버레이가 울릴 때 조회한다).
- **A-2** 끝남 10초는 감지 시각부터 잰다. 절전 복귀 뒤에도 `finished`를 거친다(§3.2).
- **A-3** 트레이 라벨은 한국어 고정이고, 메뉴는 보기가 바뀔 때만 다시 만든다(§7).
- **A-4** 사용자 소리 재생에 실패하면 기본음으로 한 번 대신 울린다(§6.4).
- **A-5** 타이머 탭 미리보기에도 끝남 깜빡임을 똑같이 적용한다(같은 표시 유틸을 쓴다).

## 9. 종단간 RTM

아키텍처 요구ID `TM-xx`(이 설계서 전용). 화면 요구ID(`R-xx`)는 ui-designer가 각 `requirements.md` 마지막 번호 다음으로 정한다.

| 요구ID | 요구(확정사항 103~107행) | ui | bridge | core | 설정 키 | 테스트 | 상태 |
|---|---|---|---|---|---|---|---|
| TM-01 | 「스톱워치 사용」·「타이머 사용」 두 토글, 상호배타, 둘 다 꺼짐 허용 | settings `TimerTab` 토글 2(`enabled`·`mode`에서 계산) | `TimerSettings.mode`, `set_settings` | `settings::timer::TimerMode`, `Timer::configure` | `timer.enabled`·`timer.mode` | ui `TimerTab.test`(토글 조합 4가지), core `configure_mode_switch_*` | 설계 |
| TM-02 | 옛 설정(`enabled:true`)은 스톱워치 켜짐으로 이행 | — | §3.3 호환 문단 | serde default `mode=stopwatch` | `timer.mode` | core `old_timer_enabled_true_reads_as_stopwatch` | 설계 |
| TM-03 | 스톱워치: 올라감, 시작·일시정지·멈춤, 쉬는중 자동 일시정지(기존) | 기존 + 표시 함수 모드 분기 | `control_timer`·`set_resting` 불변 | 기존 전이표(§3.3) | — | core 기존 T1~T17 유지 | 설계 |
| TM-04 | 시·분·초 입력(최대 99:59:59)으로 시작 시간 지정 | settings `CountdownTimeInput` | `TimerSettings.countdownSecs`, `settings.invalid` | `settings::timer::validate/normalize` | `timer.countdownSecs` | core `countdown_secs_*`, ui `CountdownTimeInput.test` | 설계(D-2·D-3·D-5) |
| TM-05 | 시작하면 0까지 내려감, 일시정지·멈춤(멈춤=지정 시간), 쉬는중에도 계속 | 두 창 표시 `timerDisplayMs`·올림 표기 | `TimerSnapshot.mode/durationMs`, `control_timer` | `Timer` 카운트다운 전이(§3.2), `set_resting` no-op | `timer.countdownSecs` | core `countdown_*`, ui `timerClock.test` | 설계 |
| TM-06 | 0 도달 → 00:00:00 깜빡임 10초 → 자동 종료 → 지정 시간 대기 | overlay `TimerText` 깜빡임, settings 미리보기 같음 | `TimerStatus 'finished'`, `timer://changed` 발신 지점 추가 | `Timer::tick`·`next_wake`, `timer/driver.rs`, `publish_timer_change` | — | core `tick_*`·`driver_*`, ui `TimerText.blink.test` | 설계(A-2·D-7) |
| TM-07 | 0 도달 시 알림음 1회 재생 | overlay `useAlarmOnFinish` | `get_alarm_sound` | `assets::sound::current` | `timer.alarmVolume` | ui `useAlarmOnFinish.test`(전이 1회·초기 finished 무시·떠나면 정지) | 설계(D-6·D-8·D-9) |
| TM-08 | 알림음 파일 등록(wav·mp3·ogg, 1MB 이하), 미리 듣기, 기본값 | settings `AlarmSoundCard` | `import_alarm_sound`·`remove_alarm_sound`·`get_alarm_sound`·`pickAudioFile`, `sound.*` 에러 | `assets::sound::{import, remove, detect_format}` | — | core `sound_*`(매직·크기·고정 이름·다른 형식 삭제), bridge 래퍼 테스트, ui `AlarmSoundCard.test` | 설계 |
| TM-09 | 미등록이면 짧은 내장 기본음 | `alarmSound.ts` `synthBeepWav`·`defaultAlarmUrl` | CSP `media-src … blob:` | — | — | ui `alarmSound.test`(RIFF 헤더·길이) | 설계 |
| TM-10 | 음량 설정 | `AlarmSoundCard` 슬라이더 | `TimerSettings.alarmVolume` | `validate/normalize` | `timer.alarmVolume` | core `alarm_volume_*`, ui 카드 테스트 | 설계(D-10) |
| TM-11 | 트레이: 켜져 있을 때만 시작(흐르면 일시정지)·멈춤 | — | `timer://changed`(트레이 조작도 두 창에 반영) | `tray::sync_timer_menu`, 트레이 핸들러 | `timer.enabled` | core `tray_view_*`(순수), 수동 확인 | 설계(D-11·A-3) |
| TM-12 | 102행 결정의 모드별 적용(끄면 일시정지, 재시작 시 대기, 끝남 중 끔) | 버튼·토글 규칙 | `set_settings` 부수 효과 | `disable`(finished→stopped), `with_config` | `timer.*` | core `disable_finished_*`, `restart_waits_*` | 설계 |
| TM-13 | 문구 ko/ja/en | i18n 키(§ui 패킷 §6) | 에러 code 3 + `timer.disabled` 문구 | `SoundError` 메시지(ko) | `language` | ui `i18n.test`(키 집합·`ERROR_CODES` +3) | 설계 |

끊긴 열 없음(해당 없음은 `—`).

## 10. 비기능 목표와 측정

| 항목 | 목표 | 측정 |
|---|---|---|
| 마감 판정 지연 | 마감 뒤 `finished` emit까지 < 50ms(Windows 타이머 해상도 약 15.6ms) | core `driver` 테스트(가짜 콜백, 실제 스레드 100ms 마감 → 콜백 도착 시각), 수동 스톱워치 비교 |
| 알림음 지연 | `finished` 이벤트 → 소리 < 300ms | verify 수동 |
| IPC 빈도 | 주기 이벤트 0건. 카운트다운 1회당 `timer://changed` = 조작 수 + 2 | bridge·core 테스트(멱등은 emit 없음) |
| 유휴 CPU | 타이머가 멈췄거나 스톱워치면 마감 스레드는 깨지 않는다(`recv` 무기한) | 코드 리뷰, verify 작업 관리자 관찰 |
| 렌더 | 초당 `TimerText` 1회. 깜빡임은 CSS 애니메이션(`opacity`)만, JS 타이머 없음 | vitest 렌더 카운트 |

## 11. 리스크

| # | 리스크 | 대응 |
|---|---|---|
| R-1 | WebView2 자동 재생 정책 때문에 오버레이 알림음이 막힘 | D-8 인자. ui 패킷 **첫 작업 = 스파이크**: 트레이로 시작 → 0 도달 → 소리 확인. 실패하면 아키텍트 세션으로 되돌려 D-8 B를 재검토한다 |
| R-2 | `additionalBrowserArgs`를 두 창에 다르게 주면 WebView2 환경 생성이 실패함 | 두 창에 같은 문자열을 준다. 메인 세션 반영 뒤 `/run-app`으로 두 창 표시를 확인한다 |
| R-3 | 트레이 메뉴 핸들러(메인 스레드) 안에서 `set_menu` 재구성 | Tauri 메뉴 API는 메인 스레드에서 바로 실행된다. 수동 확인 항목(tray.md §8.3)에 「트레이에서 시작 → 라벨이 일시정지로 바뀜」을 추가한다 |
| R-4 | 깔때기(`publish_timer_change`)를 빠뜨린 변경 경로가 생기면 마감 스레드가 모름 | 모든 경로를 bridge 패킷 표에 열거했다. 리뷰 체크 항목에 넣는다. core 패킷 완료부터 bridge 패킷 완료까지는 설정 창 조작이 스레드를 깨우지 않는 **과도 상태**다. 배포 전에는 두 패킷이 모두 끝나야 한다 |
| R-5 | 오버레이 숨김(트레이) 중 소리·깜빡임 | 경과·판정은 core라 정확하다. 소리 재생은 verify에서 실측한다 |
| R-6 | 절전 중 `Instant` 진행 여부(Windows QPC) | 요구 밖이다. 깨어난 뒤 마감이 지났으면 곧바로 `finished`를 거친다(A-2). verify 관찰 항목이다 |
| R-7 | 헤더만 맞는 깨진 소리 파일 | 미리 듣기 실패 문구, 알람 때 기본음 대체(A-4) |
| R-8 | ui 테스트 mock에 새 래퍼 누락(BRG-006 선례) | ui 패킷에서 overlay 테스트 bridge mock에 `getAlarmSound`를 추가하는 작업을 명시했다 |

## 12. 문서 동기화 대상 (각 패킷에 배정)

- core: `doc/200_설계/core/timer.md`(모드·`finished`·`configure`·`tick`·driver), `settings.md`(`timer` 새 필드·보정), `tray.md`(동적 메뉴), `assets.md`(§ 알림음 `sound.rs`).
- bridge: `doc/200_설계/bridge/contract.md` v0.23(§3.3·§3.9·§3.10 신설·§4·§5·§5.3 7단계·§5.8·§5.9 신설·§6·§6.2·§7·§8·§9).
- ui: 두 화면 `requirements.md`·`design.md`·`design/*`(settings `design/timer-tab.md`·`design/i18n.md`, overlay `design/functions.md`·`components.md`)·`test/scenarios.md`·`test/change-requests.md`(CR-048)·`manual.md`.
- 메인 세션: `tauri.conf.json`(CSP·browser args, D-8·D-9 승인 뒤), 확정사항 103행 아래에 결정(D-1~D-11) 줄 추가.
