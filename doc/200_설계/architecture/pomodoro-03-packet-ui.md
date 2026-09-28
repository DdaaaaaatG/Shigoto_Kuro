# pomodoro 인계 패킷 — ui

- 받는 세션: `claude --agent ui-manager` (작업 모드: **보강** — 기존 두 화면에 기능 추가, 새 화면 없음)
- 전반 설계: `doc/200_설계/architecture/pomodoro-02-design.md`(이 패킷과 어긋나면 02-design이 맞다).
- 전략: `ui-design-strategy`, `.claude/skills/tsx-rules.md`·`ts-rules.md`·`ui_design_concept.md`, `change-request-tracking`(두 화면 모두 **CR-045** 엔트리). TSX 400줄·함수 50줄.
- **세션 분할 권고(컨텍스트 50% 규칙)**: **U-A** = 공용 훅·유틸 + 오버레이(§1·§2) → **U-B** = 설정 창(§3·§4). U-B는 U-A의 공용 훅(§1)을 쓴다.

## 선행 조건

- **bridge 패킷 완료 마커**: `src/bridge/types.ts`에 `'pomo_char'`·`'pomo_bubble'`, `TimerSettings`·`DEFAULT_TIMER_SETTINGS`·`TIMER_ROTATION_MIN/MAX`·`TIMER_FONT_SIZE_MIN/MAX`, `Settings.timer`, `TimerStatus`·`TimerSnapshot`·`TimerAction`가 있다. `commands.ts`에 `getTimer`·`controlTimer`·`setResting`, `events.ts`에 `onTimerChanged`가 있다. contract v0.21이 반영돼 있다.
- bridge 완료 보고의 「픽스처 `timer` 누락 목록」이 있으면 **U-A 첫 작업**으로 해소한다(`{...DEFAULT_SETTINGS, …}` 또는 `timer: DEFAULT_TIMER_SETTINGS` 추가).
- **새 의존성 없음**. 폰트 파일·색 선택 라이브러리·드래그 라이브러리를 추가하지 않는다.
- 사용자 결정 U-1·U-5·U-7·U-8과 아키텍트 결정 A-1~A-5(02-design §5a)는 **권고안으로 작성**했다. 메인 세션이 다른 답을 받아 오면 해당 절만 바꾼다.

## 요구ID (화면 R-ID는 ui-designer가 확정)

| PT | 화면 | 예정 화면 요구 |
|---|---|---|
| PT-01 | overlay·settings | overlay: 뽀모도 인물·말풍선 레이어 / settings: 배경 그룹 카드 2 |
| PT-02 | overlay | 겹침 순서·고정·항상 표시 |
| PT-03 | overlay·settings | `00:00:00` 스톱워치 글자(React/CSS), 꺼져도 보임(U-1) |
| PT-04·PT-05 | settings | 「타이머」 탭, on/off 토글, 시작·일시정지·멈춤 |
| PT-06 | overlay | 쉬는중 진입·해제를 core에 알림(`setResting`) |
| PT-07·PT-08 | settings | 미리보기 끌기·회전·크기·색 |
| PT-09 | overlay·settings | 시작 시 `get_timer`(stopped·0) |
| PT-10 | settings | 3개 국어 문구(기존 R-20 규칙) |

현재 마지막 번호는 overlay **R-32**, settings **R-41**이다. 새 번호는 그 다음부터 쓰고, 두 화면 `requirements.md`의 근거 열에 「확정사항 §6 뽀모도 타이머 (🔒 2026-09-26, CR-045)」를 적는다.

## 1. 공용 (U-A) — `src/components/`

비유: 두 창이 같은 벽시계를 보는 방법을 한 번만 적어 둔다. 벽시계가 「지금 12분, 가는 중」이라고 한 번 알려 주면, 각 창은 그때부터 스스로 초를 센다.

| 파일(신규) | 내용 |
|---|---|
| `src/components/utils/timerClock.ts` | 순수 함수. `elapsedNow(s: TimerSnapshot, receivedAt: number, now: number): number` = `s.elapsedMs + (s.status === 'running' ? Math.max(0, now - receivedAt) : 0)` · `formatElapsed(ms: number): string` = `floor(ms/1000)` → `HH:MM:SS`(시는 최소 2자리, 99를 넘으면 자릿수가 늘어나고 자르지 않음, 음수·NaN·Infinity는 `00:00:00`) · `timerTextStyle(t: TimerSettings): CSSProperties`(아래) |
| `src/components/hooks/useTimerSnapshot.ts` | `useTimerSnapshot(): { snapshot: TimerSnapshot; receivedAt: number }`. 초기값 `{ status: 'stopped', elapsedMs: 0 }`. **구독 먼저 → 조회**: `onTimerChanged` 구독이 끝난 뒤 `fetchWithRetry(getTimer, …)`를 한다(CR-039 재시도). 조회 전에 이벤트가 오면 조회 결과는 버린다(오버레이 손 기준점 효과와 같은 `eventSeen` 패턴). 받을 때마다 `receivedAt = performance.now()`. 실패하면 초기값을 유지하고 문구는 없다 |
| `src/components/hooks/useElapsedText.ts` | `useElapsedText(snapshot, receivedAt): string`. `running`일 때만 `setInterval` 250ms를 켜고, `formatElapsed(elapsedNow(…))`가 바뀔 때만 setState한다. `running`이 아니면 interval을 끄고 스냅숏 값 그대로 보인다. 언마운트할 때 정리한다 |

`timerTextStyle(t)` — 오버레이와 설정 창 미리보기가 **같은 함수**를 쓴다(보이는 모습이 1:1로 같다, A-1):

```ts
{
  position: 'absolute', left: t.textPos.x, top: t.textPos.y,          // 캔버스 좌표(.canvas scale을 같이 받음)
  transform: `translate(-50%, -50%) rotate(${t.rotation}deg)`, transformOrigin: '50% 50%',
  fontSize: t.fontSize, color: t.color, lineHeight: 1, whiteSpace: 'nowrap',
  fontFamily: "'Segoe UI', 'Malgun Gothic', sans-serif", fontWeight: 700, fontVariantNumeric: 'tabular-nums',
  pointerEvents: 'none', userSelect: 'none',
}
```
(설정 창 미리보기는 끌기를 받아야 하므로 `pointerEvents`만 덮어쓴다.)

## 2. 오버레이 (U-A) — `src/overlay/`

### 2.1 DOM (PT-02)

```
.canvas
  <BackgroundLayer/>                         (기존)
  <PomodoroLayer manifest timer/>            ← 신규. .jellyWrap 밖, 배경 바로 다음 형제
     <img pomo_char  class=layer alt="">     (등록돼 있을 때만)
     <img pomo_bubble class=layer alt="">    (등록돼 있을 때만)
     <TimerText timer/>                      (U-1 조건일 때만)
  <div .jellyWrap> … (기존 그대로)
```

| 파일 | 변경 |
|---|---|
| `src/overlay/components/PomodoroLayer.tsx` (**신규**) | `React.memo`. props `{ manifest: AssetManifest; timer: TimerSettings }`. `findEntry(manifest, 'pomo_char'/'pomo_bubble')`로 `<img className={styles.layer} alt="" draggable={false}>`(`BackgroundLayer`와 같은 캔버스 전체 배치). 글자 표시 조건 `isTimerTextVisible(timer, manifest)` = **`timer.enabled \|\| pomo_char 등록 \|\| pomo_bubble 등록`**(U-1 = B). 애니메이션·교체·커서 반응 없음 |
| `src/overlay/components/TimerText.tsx` (**신규**) | `useTimerSnapshot()` + `useElapsedText()` → `<div style={timerTextStyle(timer)} aria-hidden="true">{text}</div>`. 오버레이에는 문구·aria-label이 없다(design.md §8 규칙). 글자 자체가 장식 표시라 `aria-hidden`이다 |
| `src/overlay/index.tsx` (253줄) | ① `<BackgroundLayer/>` 다음에 `<PomodoroLayer manifest={manifest} timer={settings.timer ?? DEFAULT_TIMER_SETTINGS} />` ② 쉬는중 보고 효과(§2.2) ③ 파일 머리 `//!` 흐름 주석에 뽀모도 추가 |
| `src/overlay/overlay.module.css` | 새 클래스 없음(인라인 스타일 + 기존 `.layer`). 필요하면 `.pomodoro` 래퍼만 추가 |

- `PomodoroLayer`는 `settings.timer`·`manifest`가 바뀔 때만 다시 그린다. 마우스 이동(60Hz)이나 `machine` 변화로는 다시 그리지 않는다(`React.memo`, props 참조 안정).
- `TimerText`의 초 갱신은 `TimerText`만 다시 그린다. `OverlayApp`·`.jellyWrap`은 영향이 없다.

### 2.2 쉬는중 보고 (PT-06)

```ts
// OverlayApp — 기존 「쉬는중 진입 시 armAtRest」 효과 옆
useEffect(() => {
  setResting(machine.layer === 'rest').catch(() => undefined)   // 실패는 조용히(문구 없음, P-1 규칙)
}, [machine.layer])
```
- 마운트 때 한 번 `false`가 가고, 그 뒤로는 `idle ↔ rest` 전이 때만 간다. 상태기계(`src/state/inputMachine.ts`)는 **고치지 않는다**.
- 사용자 일시정지와 자동 일시정지의 구분은 core가 한다. 오버레이는 알리기만 한다.

### 2.3 문서 (오버레이)

- `requirements.md`: 새 R 3~4건(PT-01·02·03·06·09).
- `design.md`: §1 개요·§2 ASCII(`[pomo]` 줄: bg와 `.jellyWrap` 사이)·§4 상태(없음 — 훅 내부)·§6 파이프라인 P-8 「타이머」(초기 `get_timer`, `timer://changed`, `set_resting`)·§7 계약 사용표 5행(`getTimer`·`onTimerChanged`·`setResting`·슬롯 2·`Settings.timer`)·§10.1 z-order 표 `pomo` 행·**§10.14 뽀모도 타이머(CR-045)** 신설·§13 RTM.
- `design/components.md`·`design/functions.md`: `PomodoroLayer`·`TimerText`·`isTimerTextVisible`, 공용 훅·유틸 인용.
- `test/scenarios.md`, `test/change-requests.md` **CR-045**, (구현 뒤) `manual.md`.

## 3. 설정 창 (U-B) — `src/settings/`

### 3.1 구조

```
세로 메뉴: 기본 설정 · 이미지 설정 · 어깨축·손 위치 · [타이머]  ← 4번째(A-4), TabIcon 'timer'(코드로 그린 스톱워치)

「타이머」 탭
┌ 카드 1: 뽀모도 타이머 ───────────────────────────────┐
│ 설명(timerCardDesc)                                    │
│ [토글] 타이머 사용            (timerEnabledDesc)        │
│ [시작] [일시정지] [멈춤]     ← 켜짐일 때만 활성(U-8 = A) │
│ 안내: 멈춤을 누르면 00:00:00으로 돌아갑니다             │
└────────────────────────────────────────────────────────┘
┌ 카드 2: 시간 글자 ────────────────────────────────────┐
│ 설명(timerTextDesc)                                    │
│ ┌ 미리보기 (canvas × previewScale) ─────────────────┐  │
│ │ background → pomo_char → pomo_bubble → [시간 글자] → kb_up │ ← U-5 = A
│ └──────────────────────────────────────────────────┘  │
│ 회전  [────●────]  5°      (−180 ~ 180, 1°)            │ ← A-2
│ 크기  [──●──────]  36px    (12 ~ 200, 1)               │
│ 글자 색 [■ #333333]        (<input type="color">)      │ ← A-3
└────────────────────────────────────────────────────────┘
```

| 파일 | 변경 |
|---|---|
| `src/settings/index.tsx` | `Tab` 유니온에 `'timer'`, `TAB_IDS` 끝에 `'timer'`, `TAB_KEY.timer = 'tabTimer'`, 패널 분기 `{tab === 'timer' && <TimerTab settings={settings} manifest={manifest} onError={onError} />}` |
| `src/settings/components/TabIcon.tsx` | `name: 'timer'` 아이콘(스톱워치, 기존 아이콘과 같은 선 굵기·단색) |
| `src/settings/components/TimerTab.tsx` (**신규**, ≤400줄) | 카드 2개 조립. 카드 1: `ToggleSwitch` + 버튼 3 + 안내. 카드 2: `TimerPreview` + 슬라이더 2 + 색 입력 |
| `src/settings/components/TimerPreview.tsx` (**신규**) | 합성 미리보기 + 글자 끌기(§3.3) |
| `src/settings/timerValues.ts` (**신규**, 순수) | `clampTextPos(p, canvas)`(중심을 캔버스 안으로, 정수로 반올림), `clampRotation`, `clampFontSize`, `normalizeColor`(소문자 `#rrggbb`) |
| `src/settings/imageSlots.ts` | 배경 그룹: `background`, `hair`, **`pomo_char`, `pomo_bubble`** 순서(A-5). 둘 다 `hasBuiltinDefault` false → `resetKind: 'clear'`(「기본값」 = 비우기, 확인 후), `EMPTYABLE_SLOT_KEYS`에는 넣지 않는다(별도 「비우기」 버튼 없음 — 「기본값」이 곧 비우기) |
| `src/settings/i18n/types.ts` | `Messages` 새 키(§4), `SlotMessageKey`에 `'pomo_char' \| 'pomo_bubble'`, `ErrorCode`에 `'timer.disabled'`, `ERROR_CODES`에 계약 §6 표 순서대로 추가(22 → 23, `unknown` 포함) |
| `src/settings/i18n/{ko,ja,en}.ts` | §4 문구 |

### 3.2 동작 (PT-04·05)

- **토글**: `setSettings({ ...settings, timer: { ...settings.timer, enabled } })`. 저장하는 동안 잠그고, 실패하면 원래 값으로 되돌리고 오류 줄을 띄운다(`GeneralTab.saveSettings`와 같은 방식). 끄면 core가 흐르던 타이머를 일시정지한다(`timer://changed`로 미리보기 글자가 멈춘다).
- **시작·일시정지·멈춤**: `controlTimer('start' | 'pause' | 'stop')`. 성공하면 `onError(null)`, 실패하면 `onError(toBridgeError(e))`(`timer.disabled`는 §4 문구). **표시는 반환값이 아니라 `timer://changed`로만 바꾼다**(02-design §3.3). `settings.timer.enabled === false`이면 세 버튼은 `disabled`다. 켜짐이면 상태와 무관하게 셋 다 활성이다(U-8 = A — 맞지 않는 누름은 core가 무시한다).
- 멈춤에 확인창은 없다(U-7 = A).
- 글자 조작(카드 2)은 on/off와 **무관하게** 늘 쓸 수 있다.

### 3.3 미리보기·끌기 (PT-07·08, U-5 = A)

- 배율: `MousePartsTab` 미리보기와 **같은 계산**을 재사용한다(캔버스 → 미리보기 배율, `previewToCanvas` 등 현행 함수 — 위치는 소스에서 확인). 캔버스가 `null`이면 미리보기 자리에 기존 「이미지 없음」 안내 패턴을 쓴다.
- 합성(아래→위): `background` → `pomo_char` → `pomo_bubble` → **시간 글자**(`timerTextStyle` + 살아 있는 값 `useTimerSnapshot`·`useElapsedText`) → `kb_up`(포인터 통과 `pointer-events: none`). 없는 슬롯은 건너뛴다. 미리보기의 글자는 U-1 조건과 **무관하게 늘 보인다**(위치를 잡아야 하므로).
- 끌기: 글자 요소에서 `pointerdown`(왼쪽 버튼, 저장 중이 아닐 때) → `setPointerCapture` → `grab = point − textPos` → `pointermove`마다 `clampTextPos(point − grab, canvas)`로 로컬 draft를 갱신 → `pointerup`에서 값이 바뀌었으면 `setSettings({...settings, timer: {...timer, textPos}})` → `pointercancel`이면 draft를 버린다(`MousePartsTab` 팔·손 끌기와 같은 흐름). 회전된 글자도 요소 자체가 포인터를 받으므로 따로 계산하지 않는다.
- 슬라이더 2개: `<input type="range">` + `<output>`. 끄는 동안에는 로컬 draft로 미리보기만 바꾸고, 놓을 때(`pointerup`·`keyup`·`blur`) 저장한다. 기존 `ScaleIdleCard.commitScale`과 같은 방식이다.
- 색: `<input type="color">`. `input` 이벤트는 draft(미리보기)에만 반영하고, `change`에서 `normalizeColor` 후 저장한다.
- 저장 실패: draft를 버리고 오류 줄을 띄운다. 값은 `settings://changed`로 온 저장값이 기준이다.
- 접근성: 글자 끌기의 키보드 대안이 필요한지는 ui-design-strategy 접근성 기준으로 **ui-designer가 판단**한다. 필요해 보이면 요구 밖 기능이므로 「확인 필요」로 올린다(임의로 추가하지 않는다). 슬라이더와 색 입력은 네이티브 원소라 키보드로 조작할 수 있다.

### 3.4 문서 (설정 창)

- `requirements.md`: 새 R(PT-01·03·04·05·07·08·09·10).
- `design.md`: §2 레이아웃(세로 메뉴 4개)·§3 컴포넌트 표·§6 파이프라인·§7 계약 사용표(`controlTimer`·`getTimer`·`onTimerChanged`·`setSettings(timer)`·슬롯 2)·§13 RTM. **`design/timer-tab.md` 신설**(§3.1~§3.3 상세). `design/images-tab.md` 배경 그룹 표, `design/i18n.md` §4 문구 표·§4.6 code 표(23개).
- `test/scenarios.md`(TC-093 기대값: `ERROR_CODES` 23·`slots` 키 +2 갱신), `test/change-requests.md` **CR-045**, (구현 뒤) `manual.md` 타이머 탭 절 + 스크린샷.

## 4. 문구 3개 국어 (PT-10 — ja·en은 **검수 필요** 표시)

| 키 | ko | ja | en |
|---|---|---|---|
| `tabTimer` | 타이머 | タイマー | Timer |
| `timerCardTitle` | 뽀모도 타이머 | ポモドーロタイマー | Pomodoro timer |
| `timerCardDesc` | 말풍선 안에 0부터 올라가는 시간을 보여 줍니다. 쉬는중이 되면 저절로 멈추고, 다시 입력하면 이어서 흐릅니다. | 吹き出しの中に0から増える時間を表示します。休憩中になると自動で止まり、入力を再開すると続きから進みます。 | Shows a count-up time inside the speech bubble. It pauses by itself while resting and continues when you type or move the mouse again. |
| `timerEnabled` | 타이머 사용 | タイマーを使う | Use timer |
| `timerEnabledDesc` | 끄면 시간이 멈춘 채로 보입니다 | オフにすると時間が止まったまま表示されます | When off, the time stays frozen |
| `timerStart` | 시작 | スタート | Start |
| `timerPause` | 일시정지 | 一時停止 | Pause |
| `timerStop` | 멈춤 | ストップ | Stop |
| `timerStopHint` | 멈춤을 누르면 00:00:00으로 돌아갑니다 | ストップを押すと00:00:00に戻ります | Stop resets the time to 00:00:00 |
| `timerControlsAria` | 타이머 조작 | タイマー操作 | Timer controls |
| `timerTextTitle` | 시간 글자 | 時間の文字 | Time text |
| `timerTextDesc` | 미리보기에서 글자를 끌어 자리를 옮기고, 아래에서 회전·크기·색을 고릅니다. 뽀모도 인물·말풍선 그림은 「이미지 설정」 탭의 배경 그룹에서 넣습니다. | プレビューで文字をドラッグして位置を移動し、下で回転・サイズ・色を選びます。ポモドーロのキャラと吹き出しの画像は「画像設定」タブの背景グループで登録します。 | Drag the text in the preview to move it, then pick rotation, size and color below. Add the pomodoro character and bubble images in the Background group of the Images tab. |
| `timerPreviewAria` | 시간 글자 위치 미리보기 | 時間の文字の位置プレビュー | Time text position preview |
| `timerTextDragAria` | 시간 글자 — 끌어서 옮기기 | 時間の文字 — ドラッグで移動 | Time text — drag to move |
| `timerRotation` | 회전 | 回転 | Rotation |
| `timerSize` | 크기 | サイズ | Size |
| `timerColor` | 글자 색 | 文字の色 | Text color |
| `slots.pomo_char` | 제목 「뽀모도 인물」 / 설명 「타이머 옆에 서 있는 두 번째 캐릭터. 배경처럼 고정되어 흔들리지 않습니다」 | 「ポモドーロのキャラ」 / 「タイマーのそばに立つ2人目のキャラクター。背景のように固定され、揺れません」 | "Pomodoro character" / "A second character standing by the timer. Fixed like the background; it doesn't bounce" |
| `slots.pomo_bubble` | 제목 「뽀모도 말풍선」 / 설명 「시간이 들어갈 말풍선. 배경처럼 고정됩니다」 | 「ポモドーロの吹き出し」 / 「時間が入る吹き出し。背景のように固定されます」 | "Pomodoro bubble" / "The speech bubble that holds the time. Fixed like the background" |
| `errors['timer.disabled']` | 타이머가 꺼져 있습니다. 먼저 「타이머 사용」을 켜 주세요. | タイマーがオフです。先に「タイマーを使う」をオンにしてください。 | The timer is off. Turn on "Use timer" first. |

단위 표기 `°`·`px`는 세 언어 공통 리터럴이다(번역 키 없음). 기존 `format` 도우미가 있으면 그것을 따른다.

## 5. 수용 기준 (vitest `yarn test --run`, 이름은 권고)

U-A:
- `src/components/utils/timerClock.test.ts` — `formatElapsed`: 0 → `00:00:00`, 999 → `00:00:00`, 3 723 000 → `01:02:03`, 360 000 000 → `100:00:00`, −1·NaN → `00:00:00`. `elapsedNow`: running은 더하고, paused·restPaused·stopped는 더하지 않고, 음수 차이는 0.
- `src/components/hooks/useTimerSnapshot.test.tsx` — 구독이 조회보다 먼저, 조회 전 이벤트가 오면 조회 결과 무시, 조회 실패하면 stopped·0 유지.
- `src/overlay/test/TimerText.test.tsx` — 가짜 타이머: running이면 1 000ms 뒤 글자가 1초 늘어남, paused면 interval 없음, 초당 렌더 1회.
- `src/overlay/test/PomodoroLayer.test.tsx` — 슬롯별 `<img>` 유무, 순서(인물 → 말풍선 → 글자), 글자 조건 U-1 4경우(끔·그림 없음 → 없음 / 켬 → 있음 / 끔 + 인물 → 있음 / 끔 + 말풍선 → 있음), 스타일(left·top·fontSize·color·`rotate(5deg)`).
- `src/overlay/test/OverlayApp.pomodoro.test.tsx` — DOM 순서 `.canvas` 자식 = [배경, 뽀모도, .jellyWrap], 키 누름 젤리 클래스가 뽀모도 요소에 붙지 않음, 마운트 때 `setResting(false)` 1회, 유휴 경과 tick 뒤 `setResting(true)` 1회, 입력 뒤 `setResting(false)` 1회, 같은 layer가 이어지면 추가 호출 없음.
- 기존 오버레이 테스트의 bridge mock(BRG-006 — `OverlayApp*.test.tsx` 등)에 `getTimer`·`setResting`·`onTimerChanged`를 추가해 **기존 테스트 전부 Green**.

U-B:
- `src/settings/test/imageSlots.test.ts` — 배경 그룹 카드 순서 `background, hair, pomo_char, pomo_bubble`, 새 두 칸 `resetKind 'clear'`·`required false`·`emptyable false`.
- `src/settings/test/TimerTab.test.tsx` — 탭이 4번째, 토글이 `enabled`를 저장(실패하면 되돌림 + 오류 줄), 끔이면 버튼 3개 disabled·켬이면 enabled, 클릭 → `controlTimer('start'|'pause'|'stop')`, `timer.disabled` 거부 → 오류 줄 문구, 슬라이더 놓을 때 `rotation`·`fontSize` 저장, 색 `change` → 소문자 저장.
- `src/settings/test/TimerPreview.test.tsx` — 합성 순서 5겹, 글자는 U-1 조건과 무관하게 보임, 끌기 → pointerup 때 1회 저장(캔버스 안으로 제한·정수), 안 움직이면 저장 없음, cancel이면 저장 없음.
- `src/settings/test/timerValues.test.ts` — clamp 경계값.
- `src/settings/test/i18n.test.ts`(TC-093 갱신) — 세 사전 키 집합 동일, `ERROR_CODES` 23개(계약 순서), `slots` +2.
- 기존 설정 창 테스트의 bridge mock에 새 래퍼를 추가해 **기존 테스트 전부 Green**.

공통: `yarn tsc --noEmit` exit 0, `yarn build` exit 0, eslint 통과. `/run-app` 스크린샷(`doc/300_검증/screenshots/{YYYYMMDD-HHMM}/`): ① 오버레이 — 뽀모도 인물·말풍선·시간 글자가 본체 뒤·배경 위에 있고 흐르는 모습 ② 설정 창 타이머 탭 ③ 이미지 설정 배경 그룹 카드 4개. 수동 확인(`manual-checklist`): 유휴 시간을 1분으로 두고 자동 일시정지·재개, 사용자 일시정지 뒤 입력해도 재개되지 않음, 색 대화상자, 앱을 다시 켜면 00:00:00.

## 하지 말 것

- `src/bridge/**`(래퍼·타입·이벤트 상수)와 `src-tauri/**` 수정 금지. 계약이 부족하면 멈추고 아키텍트 세션으로 되돌린다(왕복 금지).
- `src/state/inputMachine.ts` 상태·전이 변경 금지(쉬는중 보고는 화면 효과에서).
- 화면에서 `invoke`·`listen` 직접 사용 금지. 이벤트 이름 문자열을 화면 코드에 적지 않는다(테스트 mock은 기존 방식 유지).
- 타이머 경과를 화면에서 따로 판정하거나(예: 오버레이가 쉬는 동안 스스로 멈추기) localStorage 등에 저장하지 않는다. 상태 소유자는 core 하나다.
- 요구 밖 UI(상태 문구 줄, 「기본값으로」 버튼, 알림음, 뽀모도 25분 알람, 글꼴 선택 등)를 넣지 않는다. 필요해 보이면 보고만 한다.
- 새 의존성·폰트 파일 추가 금지.

## 완료 마커

- U-A: 공용 3파일 + `PomodoroLayer`·`TimerText` + `OverlayApp` 반영, 오버레이 vitest 전부 PASS, 오버레이 문서·CR-045 기록.
- U-B: `TimerTab`·`TimerPreview`·`timerValues`·`imageSlots`·i18n·탭 등록, 설정 창 vitest 전부 PASS, 설정 창 문서·CR-045 기록.
- `yarn tsc --noEmit`·`yarn build` exit 0, 스크린샷 3장 경로, 두 화면 `manual.md` 갱신(ui-manual-writer).
- 다음: `claude --agent verify-manager`(배포 전 통합 검증 — 02-design §7 숨김 오버레이 스로틀 실측 포함).
