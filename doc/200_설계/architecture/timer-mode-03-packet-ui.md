# timer-mode 인계 패킷 — ui

- 선행 조건: ① bridge 패킷 완료 마커(contract v0.23, `src/bridge/types.ts`·`commands.ts`에 새 타입·래퍼, `yarn tsc --noEmit` exit 0) ② **메인 세션이 `tauri.conf.json`에 CSP `media-src`와 `additionalBrowserArgs`를 반영**(D-8·D-9 승인).
- 요구ID: TM-01·03·04·05·06·07·08·09·10·12·13. 화면 요구ID(`R-xx`)는 ui-designer가 두 `requirements.md`의 마지막 번호 다음으로 정한다.
- 작업 모드: 보강. 진입: `claude --agent ui-manager`(기존 화면 기능 추가). CR 번호는 **CR-048**이다. 두 화면 `test/change-requests.md`에 모두 적는다.
- 전반 설계: `timer-mode-02-design.md` §3.6(표시)·§6(알림음)·§8(결정).

## 0. 첫 작업 — 자동 재생 스파이크 (다른 작업보다 먼저)

`/dev-start`로 앱을 띄운다. 타이머를 켜고 시작 시간을 00:00:05로 둔다. **트레이 메뉴 「시작」**으로 시작한 뒤(어느 창도 클릭하지 않는다) 0에 닿으면 기본음이 오버레이에서 울리는지 확인한다. 임시 코드로 확인하고 결과(울림/`NotAllowedError`)를 기록한다. 울리지 않으면 **멈추고 아키텍트 세션으로 되돌린다**(D-8 B 재검토). 스파이크 코드는 남기지 않는다.

## 1. 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src/components/utils/timerClock.ts` | `timerDisplayMs(s, receivedAt, now)`, 카운트다운 올림 표기 `formatRemaining(ms)`(또는 `formatClock(ms, 'floor'\|'ceil')`), `snapshotMode(s)`(없으면 `'stopwatch'`) |
| `src/components/hooks/useElapsedText.ts` | 모드 분기(표시 ms·반올림). 이름을 유지하거나 `useTimerText`로 바꾸고 `{ text, blinking }`을 반환 |
| `src/components/utils/alarmSound.ts` **신규** | `synthBeepWav()`, `defaultAlarmUrl()`, `playSound(url, volume)`(→ 정지 함수 반환) |
| `src/overlay/components/TimerText.tsx` (+ `TimerText.module.css` 신규) | `finished`면 깜빡임 클래스 |
| `src/overlay/hooks/useAlarmOnFinish.ts` **신규**(또는 `components/hooks`) | `finished` 진입 전이에서 1회 재생, 떠나면 정지, 사용자 파일 실패 시 기본음 1회 |
| `src/overlay/index.tsx` | `useAlarmOnFinish(settings.timer)` 연결(+5줄 안팎) |
| `src/settings/components/TimerTab.tsx` | 토글 2개, 시간 입력 배치, 버튼 규칙, 알림음 카드 배치. 400줄 한계를 지키도록 하위 컴포넌트로 분리 |
| `src/settings/components/CountdownTimeInput.tsx` **신규** | 시·분·초 입력 |
| `src/settings/components/AlarmSoundCard.tsx` **신규** | 등록·미리 듣기·기본값·음량 |
| `src/settings/components/TimerPreview.tsx` | 모드 표시·깜빡임(같은 유틸) |
| `src/settings/timerValues.ts` | `splitHms(secs)`·`joinHms(h,m,s)`·`clampVolume` 등 순수 함수 |
| `src/settings/i18n/{types,ko,ja,en}.ts` | §6 문구, `ErrorCode` +3, `ERROR_CODES` +3 |
| 테스트 | 아래 §5 + 기존 overlay 테스트 bridge mock에 `getAlarmSound` 추가(BRG-006 선례) |
| 문서 | 두 화면 `requirements.md`·`design.md`(RTM)·`design/*`·`test/scenarios.md`·`test/change-requests.md`(CR-048)·`manual.md` |

## 2. 설정 모델 → 토글 (TM-01)

```ts
const t = { ...DEFAULT_TIMER_SETTINGS, ...settings.timer }         // 선택 필드 기본값
const stopwatchOn = t.enabled && t.mode === 'stopwatch'
const countdownOn = t.enabled && t.mode === 'countdown'
// 스톱워치 토글: 켜기 → { enabled: true, mode: 'stopwatch' } / 끄기 → { enabled: false }
// 타이머 토글:   켜기 → { enabled: true, mode: 'countdown' } / 끄기 → { enabled: false }
```

- 한쪽을 켜면 다른 쪽이 꺼진다(상호배타는 값 하나라 저절로 지켜진다). 둘 다 꺼짐도 허용된다. 모드가 바뀌면 core가 대기로 초기화한다(D-4). 확인창은 없다.
- 끄기는 `mode`를 그대로 두고 `enabled: false`만 보낸다(core 끔 규칙 = 일시정지·값 유지).
- 토글 저장 중(pending)에는 두 토글과 세 버튼을 모두 막는다. 실패하면 저장값이 그대로라 스위치가 원래 값으로 보인다(기존 규칙).

## 3. 설정 창 화면 명세

```
┌ 뽀모도 타이머 ───────────────────────────────────────┐
│ (설명)                                                 │
│ [●] 스톱워치 사용   00:00:00부터 올라갑니다. 쉬는중에는 자동으로 멈춥니다
│ [ ] 타이머 사용     정한 시간부터 0까지 내려갑니다. 쉬는중에도 계속 줄어듭니다
│     시작 시간 [00]:[25]:[00]   최대 99:59:59            │
│ [시작] [일시정지] [멈춤]                                │
│ 멈춤을 누르면 처음 시간으로 돌아갑니다                   │
└────────────────────────────────────────────────────────┘
┌ 알림음 ────────────────────────────────────────────────┐
│ 지금: 기본 알림음  |  등록한 알림음 (MP3 · 305 KB)        │
│ [파일 등록] [미리 듣기] [기본값]   wav·mp3·ogg, 1MB 이하  │
│ 음량 ────────●──── 80%                                  │
└────────────────────────────────────────────────────────┘
┌ 시간 글자 (기존 카드 2, 미리보기·회전·크기·색) ─────────┐
```

- **시작 시간 입력(TM-04, D-3·D-5)**: `<input type="text" inputMode="numeric">` 3개(시 0~99·분 0~59·초 0~59, 두 자리로 표시)와 `:` 구분 문자. 각 칸에 `aria-label`(시/분/초)을 둔다. 저장은 blur나 Enter(`change`)에서 한다. 합계가 1~359999초이고 저장값과 다를 때만 `setSettings({ …, timer: { …, countdownSecs } })`를 보낸다. 숫자가 아니거나 범위 밖이면 칸을 저장값으로 되돌리고 힌트를 보인다. **합계 0도 되돌린다.** 입력 가능 조건: `!(t.mode === 'countdown' && t.enabled && status ∈ {running, paused, finished})`. 잠겨 있으면 `disabled`로 두고 잠금 힌트를 보인다. 입력 행은 타이머 토글 바로 아래에 늘 보인다(꺼져 있어도 미리 정할 수 있다).
- **버튼(TM-03·05)**: 기존 규칙 그대로다. 켜짐(`t.enabled`)이면 세 버튼 모두 활성이다(U-8). 멈춤 힌트 문구는 「처음 시간으로」로 두 모드를 함께 설명한다.
- **알림음 카드(TM-08·10)**: 마운트 때 `getAlarmSound()`를 부른다. 상태 문구는 `null`이면 기본, 있으면 형식 대문자와 `ceil(bytes/1024)` KB다.
  - 「파일 등록」: `pickAudioFile(t.alarmPickTitle)` → 경로가 있으면 `importAlarmSound(path)` → 결과로 상태를 갱신한다. 에러는 `onError(toBridgeError(e))`(`sound.*` 문구).
  - 「미리 듣기」: 지금 소리(`sound?.url ?? defaultAlarmUrl()`)를 음량 **초안값**으로 재생한다. 재생 중에 다시 누르면 처음부터 재생한다. `play()`가 거부되거나 `error` 이벤트가 나면 카드 안에 `alarmPreviewFailed` 문구를 보인다. 탭을 떠나거나 언마운트되면 소리를 멈춘다.
  - 「기본값」: `removeAlarmSound()` → 상태를 `null`로 한다. 사용자 파일이 없으면 비활성이다. 확인창은 없다.
  - 음량 슬라이더: 0~100, 1 단위. 저장은 놓을 때 한다(`useSliderDraft` 재사용). `<output>`은 `80%`다.
- 알림음 카드는 모드와 상관없이 늘 보인다(미리 준비할 수 있게).
- **미리보기**(`TimerPreview`): 오버레이와 같은 표시 규칙(§4)이다. `finished`면 깜빡인다(A-5).

## 4. 오버레이·공용 표시 명세

- `timerDisplayMs(s, receivedAt, now)`: `mode === 'countdown'`이면 `max(0, (s.durationMs ?? 0) − elapsedNow(...))`, 아니면 `elapsedNow(...)`.
- 표기: 스톱워치는 `formatElapsed`(내림, 기존)다. 카운트다운은 올림 초로 `HH:MM:SS`를 만든다(시작 순간 `00:25:00`, 0에 닿으면 `00:00:00`). 음수·NaN은 `00:00:00`이다.
- `finished`: 글자 `00:00:00`에 클래스 `.blink`를 붙인다. `@keyframes timerBlink { 0%,49.9% { opacity: 1 } 50%,100% { opacity: 0 } }`, `animation: timerBlink 1s infinite`. JS 타이머는 쓰지 않는다. `running`이 아니므로 250ms 계산 타이머도 돌지 않는다.
- 글자 표시 조건 `isTimerTextVisible`(U-1)은 **바꾸지 않는다**(`enabled` 의미가 넓어졌을 뿐이다).
- **알림음 재생(`useAlarmOnFinish`, TM-07)**:
  - 입력: `onTimerChanged` 이벤트 흐름(첫 `getTimer` 결과는 기준값으로만 쓰고 울리지 않는다), `alarmVolume`.
  - 이전 status ≠ `finished`이고 새 status = `finished`면 `getAlarmSound()` → url(없거나 조회 실패면 `defaultAlarmUrl()`) → `playSound(url, volume/100)`. 1회만 재생하고 반복하지 않는다.
  - 사용자 파일 재생이 거부되거나 `error`가 나면 기본음으로 한 번 다시 시도한다. 그것도 실패하면 무시한다(오버레이 문구 없음, A-4).
  - status가 `finished`를 떠나면(→ `stopped`·`running`) 재생 중인 소리를 멈춘다(D-6). 언마운트 때도 멈춘다.
  - 구독 경로는 기존 `useTimerSnapshot`을 재사용하거나 같은 구독 규칙(구독 먼저 → `getTimer`)을 따른다. `OverlayApp`의 60Hz 재렌더를 받지 않는 위치에 둔다(효과·ref만, state 없음).
- `alarmSound.ts`:
  - `synthBeepWav(): Uint8Array`: 880Hz, 150ms 삐 3번, 사이 100ms, 앞뒤 10ms 선형 페이드, 22,050Hz·16bit·모노 PCM. RIFF/WAVE 헤더 44바이트. 결정적 출력이다.
  - `defaultAlarmUrl(): string`: 위 바이트로 `Blob({type:'audio/wav'})` → `URL.createObjectURL`. 모듈 수준에서 한 번만 만든다.
  - `playSound(url, volume): () => void`: `new Audio(url)`, `volume` 0~1로 자르기, `play()` 거부는 호출자에게 알린다(Promise 또는 콜백). 반환값은 정지 함수(`pause()` + `currentTime = 0`)다.

## 5. 수용 기준 (vitest, `yarn test --run`)

| 파일 | 확인 |
|---|---|
| `src/overlay/test/timerClock.test.ts`(확장) | 카운트다운 올림(1500000 → `00:25:00`, 1499001 → `00:25:00`, 1499000 → `00:24:59`, 0·음수 → `00:00:00`), `timerDisplayMs` 모드 분기, `mode` 없음 → 스톱워치 |
| `useElapsedText`/`useTimerText` 테스트 | 카운트다운 running에서 초 경계마다 1회 렌더, `finished`면 interval 없음·`blinking=true` |
| `TimerText.blink.test.tsx` | `finished` → `.blink` 클래스, 그 밖 → 없음 |
| `useAlarmOnFinish.test.ts` | running → finished 이벤트에 `Audio.play` 1회(음량 0.8), 첫 `getTimer`가 finished면 0회, finished → stopped면 `pause` 호출, 사용자 url 재생 거부 → 기본 url로 1회 재시도, `getAlarmSound` null → 기본 url |
| `alarmSound.test.ts` | `synthBeepWav` 헤더(`RIFF`·`WAVE`·`fmt `·채널 1·22050·16bit·`data` 길이 = 전체 − 44), 길이 결정적, `playSound` 음량 자르기 |
| `CountdownTimeInput.test.tsx` | 표시 `00:25:00`, 01:02:03 입력 → `countdownSecs 3723` 저장, 0:0:0 → 되돌림·저장 없음, 분 60 → 되돌림, 카운트다운 running이면 disabled |
| `AlarmSoundCard.test.tsx` | 기본/등록 상태 문구, 등록 성공 → 문구 갱신, `sound.not_audio` → 에러 문구, 기본값 → `removeAlarmSound`·비활성 규칙, 미리 듣기 → 초안 음량으로 재생, 음량 슬라이더 놓을 때 저장 |
| `TimerTab.test.tsx`(확장) | 토글 조합 4가지(둘 다 꺼짐·스톱워치·타이머·전환 시 보낸 값), 버튼 비활성 규칙, 옛 설정(`mode` 없음, `enabled:true`) → 스톱워치 켜짐으로 보임 |
| `i18n.test` | 키 집합 3개 국어 일치, `ERROR_CODES` 길이 +3, `timer.disabled` 문구 갱신 |
| overlay 기존 테스트 | bridge mock에 `getAlarmSound` 추가 후 전부 PASS |
| 빌드 | `yarn tsc --noEmit` exit 0, `yarn build` exit 0, eslint·prettier 통과 |
| 화면 | `/run-app` 스크린샷: 설정 타이머 탭(스톱워치 켜짐·타이머 켜짐 각 1장, 알림음 카드), 오버레이 카운트다운 표시·끝남 깜빡임 1장 → `doc/300_검증/screenshots/{YYYYMMDD-HHMM}/` |
| 수동(manual-checklist) | §0 스파이크 결과, 오버레이 숨김 상태 알림음(R-5), 트레이 라벨 전환, 쉬는중 5분 동안 카운트다운이 계속 흐름 |

## 6. 문구 초안 (ko / ja / en) — ui-designer가 확정

| 키(안) | ko | ja | en |
|---|---|---|---|
| `timerStopwatchEnabled` | 스톱워치 사용 | ストップウォッチを使う | Use stopwatch |
| `timerStopwatchDesc` | 00:00:00부터 올라갑니다. 쉬는중에는 자동으로 멈춥니다 | 00:00:00から数えます。休憩中は自動で止まります | Counts up from 00:00:00. Pauses automatically while resting |
| `timerCountdownEnabled` | 타이머 사용 | タイマーを使う | Use timer |
| `timerCountdownDesc` | 정한 시간부터 0까지 내려갑니다. 쉬는중에도 계속 줄어듭니다 | 決めた時間から0まで減ります。休憩中も止まりません | Counts down to zero. Keeps running while resting |
| `timerDuration` | 시작 시간 | 開始時間 | Start time |
| `timerDurationHint` | 최대 99:59:59 | 最大 99:59:59 | Up to 99:59:59 |
| `timerDurationInvalid` | 00:00:01 ~ 99:59:59 사이로 입력해 주세요 | 00:00:01〜99:59:59の範囲で入力してください | Enter a time between 00:00:01 and 99:59:59 |
| `timerDurationLocked` | 멈춤 상태에서 바꿀 수 있습니다 | 停止中に変更できます | You can change this while stopped |
| `timerHoursAria` / `timerMinutesAria` / `timerSecondsAria` | 시 / 분 / 초 | 時 / 分 / 秒 | Hours / Minutes / Seconds |
| `timerStopHint`(변경) | 멈춤을 누르면 처음 시간으로 돌아갑니다 | ストップを押すと最初の時間に戻ります | Stop returns to the starting time |
| `alarmCardTitle` | 알림음 | 通知音 | Alarm sound |
| `alarmCardDesc` | 타이머가 0이 되면 한 번 울립니다 | タイマーが0になると一度鳴ります | Plays once when the timer reaches zero |
| `alarmCurrentDefault` | 지금: 기본 알림음 | 現在: 標準の通知音 | Current: default sound |
| `alarmCurrentCustom` | 지금: 등록한 알림음 ({format} · {size} KB) | 現在: 登録した通知音（{format}・{size} KB） | Current: custom sound ({format} · {size} KB) |
| `alarmImport` | 파일 등록 | ファイルを登録 | Choose file |
| `alarmPreview` | 미리 듣기 | 試聴 | Preview |
| `alarmReset` | 기본값 | 標準に戻す | Use default |
| `alarmFileHint` | wav·mp3·ogg, 1MB 이하 | wav・mp3・ogg、1MB以下 | wav, mp3, or ogg, up to 1 MB |
| `alarmVolume` | 음량 | 音量 | Volume |
| `alarmPickTitle` | 소리 파일 선택 | 音声ファイルを選択 | Choose a sound file |
| `alarmPreviewFailed` | 이 파일을 재생하지 못했습니다 | このファイルを再生できませんでした | Could not play this file |
| `errors['sound.not_audio']` | wav·mp3·ogg 소리 파일이 아닙니다. | wav・mp3・ogg の音声ファイルではありません。 | This is not a wav, mp3, or ogg sound file. |
| `errors['sound.too_many_bytes']` | 알림음 파일은 1MB 이하여야 합니다. | 通知音ファイルは1MB以下にしてください。 | The sound file must be 1 MB or smaller. |
| `errors['sound.io']` | 알림음 파일을 읽거나 쓰지 못했습니다. | 通知音ファイルを読み書きできませんでした。 | Could not read or write the sound file. |
| `errors['timer.disabled']`(변경) | 스톱워치나 타이머가 꺼져 있습니다. 먼저 둘 중 하나를 켜 주세요. | ストップウォッチもタイマーもオフです。先にどちらかをオンにしてください。 | The stopwatch and timer are both off. Turn one of them on first. |

- 기존 `timerEnabled`·`timerEnabledDesc` 키는 새 키로 바꾸고 3개 국어에서 함께 지운다(키 집합 테스트).
- 트레이 문구(「시작」·「일시정지」·「멈춤」)는 core 소관이고 한국어로 고정한다. ui i18n 대상이 아니다.

## 7. 하지 말 것

- `invoke`·`listen`을 화면에서 직접 쓰지 않는다(`bridge` 래퍼만 쓴다).
- 0 도달·끝남 10초를 ui에서 판정하지 않는다(core 판정. ui는 `finished` 표시와 소리만 한다). 깜빡임을 JS 타이머로 만들지 않는다.
- 알림음을 설정 창에서 알람으로 울리지 않는다(미리 듣기만). 알람 재생은 오버레이 한 곳에서만 한다.
- `src/state/inputMachine.ts`를 고치지 않는다.
- `src/bridge/**`·`src-tauri/**`·`contract.md`·`tauri.conf.json`을 고치지 않는다. 계약이 모자라면 아키텍트 세션으로 되돌린다.
- 새 의존성(오디오 라이브러리 등)을 추가하지 않는다.

## 8. 완료 마커

- §5 테스트 PASS(개수), `yarn tsc --noEmit`·`yarn build` exit 0, 스크린샷 경로.
- 두 화면 `design.md` RTM에 새 `R-xx` ↔ TM-xx ↔ TC, CR-048 엔트리(두 화면).
- 이후 `claude --agent verify-manager`로 통합 검증한다(트레이·절전·숨김 재생 실측 포함).
