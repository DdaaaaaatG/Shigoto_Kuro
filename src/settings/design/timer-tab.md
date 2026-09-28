# settings 상세 설계 — 「타이머」 탭 · 뽀모도 카드 (CR-045)

- 상위 문서: `src/settings/design.md`(RTM·공통 상태·오류 줄). 문구는 `design/i18n.md` §4.9(키 이름으로만 인용).
- 요구: `src/settings/requirements.md` v1.19 — **R-42**(배경 그룹 카드 2) · **R-43**(`00:00:00` 스톱워치 글자, 꺼져도 보임) · **R-44**(「타이머」 탭·on/off 토글) · **R-45**(시작·일시정지·멈춤) · **R-46**(미리보기 끌기·회전·크기) · **R-47**(글자 색) · **R-48**(다시 켜면 00:00:00, 설정은 저장) · R-20(3개 국어) · R-27(세로 메뉴 — 항목 4개로 확장, requirements 용어 주).
- 근거: 확정사항 §6 「뽀모도 타이머 (🔒 2026-09-26, CR-045)」·결정 줄, `doc/200_설계/architecture/pomodoro-02-design.md`(U-1~U-8·A-1~A-5), `pomodoro-03-packet-ui.md` §3·§4.
- 계약: contract **v0.21 예정**(bridge 패킷 — 아직 `doc/200_설계/bridge/contract.md`·`src/bridge`에 없음). 이름은 패킷 선행 조건 그대로 인용한다(재정의 금지): `AssetSlot` `'pomo_char'`·`'pomo_bubble'`, `TimerSettings`·`Settings.timer`·`DEFAULT_TIMER_SETTINGS`·`TIMER_ROTATION_MIN/MAX`·`TIMER_FONT_SIZE_MIN/MAX`, `TimerStatus`·`TimerSnapshot`·`TimerAction`, 래퍼 `getTimer()`·`controlTimer(action)`·`onTimerChanged(handler)`, 에러 `timer.disabled`. **구현 선행 조건 = bridge 완료 마커**(위 이름을 `bridge`에서 import 가능, `yarn tsc --noEmit` 0).
- 공용 훅·유틸(오버레이 설계 U-A가 정의 — 이 문서는 **이름 그대로 인용만**): `components/hooks/useTimerSnapshot`의 `useTimerSnapshot(): { snapshot: TimerSnapshot; receivedAt: number }`(초기 `stopped`·0, 구독 먼저 → `getTimer` 조회, 실패 시 초기값 유지·문구 없음) · `components/hooks/useElapsedText`의 `useElapsedText(snapshot, receivedAt): string`(`running`일 때만 250ms 갱신) · `components/utils/timerClock`의 `timerTextStyle(t: TimerSettings): CSSProperties`(오버레이와 같은 함수 — 보이는 모습 1:1).
- **CR-050 개정(타이머 모드, 사용자 결정 CR-048)**: §14가 R-49~R-55를 설계하고 §1.2 ASCII·§2 `ToggleSwitch` 행·§4 `timer`·§5.1 `saveTimer`·`onToggleEnabled`·§6 렌더 2·§9 포커스 순서·§10 문구의 해당 부분을 **대체**한다(대체 목록 §14.1). 대체되지 않은 절(카드 2 글자 조정·§3 기존 함수·§5.2·§5.3·§13)은 그대로 유효하다.
- 레이아웃 확정 상태: **확정**. ui-layout-designer 구성안 없음 — 패킷 §3.1 구조와 확정사항 결정(메뉴 4번째·카드 2개·슬라이더·색 입력)을 수용했다.

비유: 타이머 탭은 벽시계의 리모컨과 거울이다. 리모컨(카드 1)은 시계를 켜고 끄고 돌리며, 거울(카드 2)은 오버레이와 똑같은 모습을 비춰 주고 그 거울 위에서 글자를 옮긴다. 시계 자체는 core 하나가 가진다.

## 1. 레이아웃 (확정)

### 1.1 창 골격 — `design.md` §2 첫 ASCII 대체

세로 메뉴가 4항목이 된다(4번째 = 타이머, A-4). 나머지 줄은 그대로다.

```
+-- settings window (min 720x480, default 900x640) -------------+
| aside.sidebar 200px | main (flex 1, scroll-y, pad 24/32)      |
| tablist vertical    |                                         |
| +-----------------+ | h1 = selected tab name (22px bold)      |
| |[i] general   SEL| | p[role=alert] error (only on error)     |
| +-----------------+ | div[role=tabpanel] -> tab body          |
|  [i] images         |   general -> design/general-tab.md      |
|  [i] mouse          |   images  -> design/images-tab.md       |
|  [i] timer          |   timer   -> design/timer-tab.md        |
|  no search, badge,  |                                         |
|  group heading      |                                         |
+---------------------+-----------------------------------------+
```

- 높이 검산(최소 480): 메뉴 4항목 = 40×4 + 4×3 + 32 = **204px** — 항상 보인다. 폭 검산(`design.md` §2.1)은 불변(`.tabLabel` 최장 ja 「肩の軸・手の位置」 그대로, 「タイマー」는 더 짧다).

### 1.2 타이머 탭 본문

```
+--------------------------------------------------------------+
| tabpanel timer -> TimerTab (h1 = tabTimer)                   |
| SettingsCard h2 timerCardTitle                               |
|   p timerCardDesc                                            |
|   ToggleSwitch timerEnabled / timerEnabledDesc               |
|   div[role=group aria-label=timerControlsAria]               |
|     [timerStart] [timerPause] [timerStop]  (off: disabled)   |
|   p.hint timerStopHint                                       |
| SettingsCard h2 timerTextTitle                               |
|   p timerTextDesc                                            |
|   TimerPreview div.stage (canvas x scale, box 400x350)       |
|     img background -> img pomo_char -> img pomo_bubble       |
|     div time text (drag) -> img kb_up (pointer none)         |
|     p.empty previewNoBody (only when canvas is null)         |
|   timerRotation [range -180..180 step 1] output {n}deg       |
|   timerSize [range 12..200 step 1] output {n}px              |
|   timerColor [input type=color] saved lowercase #rrggbb      |
+--------------------------------------------------------------+
```

- 카드 사이 간격 `var(--st-gap-lg)`(16px), 카드 모양은 기존 `SettingsCard`(`design/general-tab.md` §2.2 간격 체계 그대로).
- 미리보기 상자 **400×350**(`TIMER_PREVIEW_BOX`): 최소 창에서 카드 안 폭 = 456 − 16×2 = 424px ≥ 400. (「어깨축·손 위치」의 450×350은 카드 밖이라 다르다.) 기본 캔버스 900×700이면 배율 = min(400/900, 350/700) = 0.444 → 400×311.
- 화면에 `{n}deg`로 적은 단위는 실제로 `°`(U+00B0)이고 `px`와 함께 세 언어 공통 리터럴이다(번역 키 없음, 패킷 §4).

### 1.3 CSS (`src/settings/components/TimerTab.module.css` 신규)

| 클래스 | 값 |
|---|---|
| `.tab` | `display: flex; flex-direction: column; gap: var(--st-gap-lg)` |
| `.desc` | `margin: 0 0 var(--st-gap-md); color: var(--st-muted); font-size: 13px; line-height: 1.5` |
| `.controls` | `display: flex; gap: var(--st-gap-sm); margin: var(--st-gap-md) 0 var(--st-gap-xs)` |
| `.btn` | `height: 36px; padding: 0 16px; border: 1px solid var(--st-border); border-radius: 8px; background: var(--st-card); color: var(--st-ink); font: inherit; font-weight: 600; cursor: pointer` |
| `.primary` (시작) | `background: var(--st-accent); border-color: var(--st-accent); color: #fff` / `:hover:not(:disabled)` `background: var(--st-accent-hover)` |
| `.btn:disabled` | `opacity: 0.45; cursor: not-allowed` |
| `.btn:focus-visible` | `outline: 2px solid var(--st-accent); outline-offset: 2px` |
| `.hint` | `margin: 0; color: var(--st-muted); font-size: 12px` |
| `.stage` | `position: relative; overflow: hidden; box-sizing: content-box; border: 1px solid var(--st-border); border-radius: 8px; background: var(--st-page); margin: 0 0 var(--st-gap-md)` — 크기는 인라인 `width: canvas.width × scale`·`height: canvas.height × scale` |
| `.canvas` | `position: absolute; left: 0; top: 0; transform-origin: 0 0` — 인라인 `width: canvas.width; height: canvas.height; transform: scale(${scale})` |
| `.layer` | `position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; user-select: none` |
| `.empty` | `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; margin: 0; color: var(--st-muted); font-size: 13px; pointer-events: none` |
| `.colorInput` | `width: 44px; height: 28px; padding: 0; border: 1px solid var(--st-border); border-radius: 6px; background: none; cursor: pointer` |

슬라이더 줄은 기존 `GeneralTab.module.css`의 `.field`·`.slider`·`.fieldDesc`를 import해 쓴다(`ScaleIdleCard`와 같은 방식 — 새 클래스 없음).

## 2. 컴포넌트

| 컴포넌트/모듈 | 파일 | 분류 | props / export | 이벤트·부작용 | 요구ID |
|---|---|---|---|---|---|
| `SettingsApp`·`Shell` 개정 | `src/settings/index.tsx` | 화면 진입 | `type Tab = 'general' \| 'images' \| 'mouse' \| 'timer'`, `TAB_IDS = ['general', 'images', 'mouse', 'timer']`, `TAB_KEY.timer = 'tabTimer'`(`TAB_KEY` 값 타입에 `'tabTimer'` 추가), 패널 분기 `{tab === 'timer' && <TimerTab settings={settings} manifest={manifest} onError={onError} />}` | 기존 `onTabKeyDown`이 `TABS.length`로 순환하므로 코드 변경 없이 4항목 순환 | R-44, R-27 |
| `TabIcon` 개정 | `src/settings/components/TabIcon.tsx` | 화면 로컬 | `name`에 `'timer'` 추가. 자식 원소(스톱워치): `<circle cx="12" cy="13" r="8"/>` `<path d="M12 9v4l2.5 2.5"/>` `<path d="M10 2h4M12 2v3"/>` — 공통 `<svg>` 속성(`design.md` §2.1: `stroke="currentColor" strokeWidth={2}`·`aria-hidden="true"`·`focusable="false"`) 그대로 | 없음 | R-44, R-27 |
| `TimerTab` (default, **신규**) | `src/settings/components/TimerTab.tsx`(목표 ≤230줄) + `TimerTab.module.css` | 화면 로컬 | `settings: Settings`, `manifest: AssetManifest`, `onError: (e: BridgeError \| null) => void` | 카드 1(토글·버튼 3·안내) + 카드 2(`TimerPreview` + 슬라이더 2 + 색 입력). `setSettings`(timer)·`controlTimer` | R-43~R-47 |
| `TimerPreview` (default, **신규**) | `src/settings/components/TimerPreview.tsx`(목표 ≤150줄), CSS는 `TimerTab.module.css` 공유 | 화면 로컬 | `manifest: AssetManifest`, `timer: TimerSettings`(초안이 반영된 표시값), `onCommitPos: (pos: Point) => Promise<void>` | 합성 5겹, 살아 있는 시간(`useTimerSnapshot`·`useElapsedText`), 글자 끌기 → 놓을 때 `onCommitPos` | R-43, R-46, R-48 |
| `useSliderDraft` (**신규** 로컬 훅) | `src/settings/components/useSliderDraft.ts`(≤60줄) | 화면 로컬 | §5.2 | 슬라이더 초안·놓을 때 저장 | R-46 |
| `timerValues` (**신규** 순수 모듈) | `src/settings/timerValues.ts`(≤60줄) | 화면 로컬 순수 | §3 | 없음 | R-46, R-47 |
| `ToggleSwitch` | 기존 `components/ToggleSwitch.tsx` | 화면 로컬(재사용) | `id="timer-enabled"`, `label={t.timerEnabled}`, `description={t.timerEnabledDesc}`, `checked`, `busy`, `onToggle` | — | R-44 |
| `SettingsCard` | 기존 `components/SettingsCard.tsx` | 화면 로컬(재사용) | `title`, `children` | — | R-44, R-46 |
| `findEntry` | 기존 `src/settings/imageSlots.ts` | 재사용 | `(manifest, slot) => AssetEntry \| undefined` | — | R-46 |
| `fitScale`·`previewToCanvas` | 기존 `src/settings/mouseWizard.ts` | 재사용(재구현 금지) | `fitScale(canvas, box)`, `previewToCanvas(offset, scale, canvas)`(정수 반올림·캔버스 안 고정) | — | R-46 |

표준 원소 직접 사용(`<button>`·`<input type="range">`·`<input type="color">`·`<output>`·`<label>`)은 기존 전략 편차 D-1·D-3과 같은 근거로 둔다(`design.md` §11 — 공용 `Button`·`Slider`가 없음). 새 편차 행 없음.

## 3. 순수 모듈 (`src/settings/timerValues.ts`)

| 이름 | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `TIMER_PREVIEW_BOX` | `{ readonly width: 400; readonly height: 350 }` | 미리보기 상자(§1.2) | — | R-46 |
| `clampTextPos` | `(p: Point, canvas: { width: number; height: number }) => Point` | 글자 **중심**을 캔버스 안으로: `x = min(canvas.width, max(0, round(p.x)))`, `y`도 같게. 비유한수 좌표는 0 | 없음 | R-46 |
| `clampRotation` | `(v: number) => number` | `round(v)`를 `TIMER_ROTATION_MIN`~`TIMER_ROTATION_MAX`(−180~180)로 자름. 비유한수 → `DEFAULT_TIMER_SETTINGS.rotation` | 없음 | R-46 |
| `clampFontSize` | `(v: number) => number` | `round(v)`를 `TIMER_FONT_SIZE_MIN`~`TIMER_FONT_SIZE_MAX`(12~200)로 자름. 비유한수 → `DEFAULT_TIMER_SETTINGS.fontSize` | 없음 | R-46 |
| `normalizeColor` | `(v: string) => string \| null` | `/^#[0-9a-fA-F]{6}$/`이면 소문자로(`'#33AAFF'` → `'#33aaff'`), 아니면 `null` | 없음 | R-47 |

검증 예: `clampTextPos({x: -3.4, y: 710.6}, {width: 900, height: 700})` → `{x: 0, y: 700}` · `clampTextPos({x: 268.5, y: 403.2}, …)` → `{x: 269, y: 403}` · `clampRotation(181)` → 180 · `clampRotation(-180.4)` → −180 · `clampFontSize(11)` → 12 · `clampFontSize(NaN)` → 36 · `normalizeColor('#ABCDEF')` → `'#abcdef'` · `normalizeColor('red')` → `null`.

## 4. 상태

| 상태 | 용도 | 타입 | 초기값 | 소유 |
|---|---|---|---|---|
| `timer` (파생) | 저장된 글자·토글 값 | `TimerSettings` | `settings.timer ?? DEFAULT_TIMER_SETTINGS`(픽스처·옛 값 호환) | `TimerTab` 파생 |
| `enabledPending` | 토글 저장 중(스위치 `busy`, 세 버튼 비활성) | `boolean` | `false` | `TimerTab` `useState` |
| `controlPending` | `controlTimer` 응답 대기(세 버튼 비활성 — 두 번 누름 방지) | `boolean` | `false` | `TimerTab` `useState` |
| `rotation` | 회전 슬라이더 초안(`useSliderDraft`) | `{ shown: number; … }` | `draft = null` → `shown = timer.rotation` | `TimerTab` (훅 내부 `useState<number \| null>(null)`) |
| `size` | 크기 슬라이더 초안 | 같음 | `shown = timer.fontSize` | 같음 |
| `colorDraft` | 색 대화상자에서 고르는 중인 값(미리보기만) | `string \| null` | `null` | `TimerTab` `useState` |
| `previewTimer` (파생) | 미리보기에 넘길 표시값 | `TimerSettings` | `{ ...timer, rotation: rotation.shown, fontSize: size.shown, color: colorDraft ?? timer.color }` | `TimerTab` 파생 |
| `drag` | 글자 끌기 진행 | `{ grab: Point; pos: Point; from: Point } \| null` | `null` | `TimerPreview` `useState` |
| `pendingPos` | 놓은 뒤 저장이 끝날 때까지 보일 자리(튀어 돌아가지 않게) | `Point \| null` | `null` | `TimerPreview` `useState` |
| `shownPos` (파생) | 글자 중심 표시 자리 | `Point` | `drag?.pos ?? pendingPos ?? timer.textPos` | `TimerPreview` 파생 |
| `canvas`·`scale` (파생) | 미리보기 캔버스·배율 | `CanvasSize`·`number` | `manifest.canvas ?? { width: 900, height: 700 }` · `fitScale(canvas, TIMER_PREVIEW_BOX)` | `TimerPreview` 파생 |
| `stageRef` | 좌표 변환 기준 상자 | `useRef<HTMLDivElement>(null)` | `null` | `TimerPreview` |
| `snapshot`·`receivedAt`·`text` | 살아 있는 시간 | 공용 훅 반환 | 훅 초기값(`stopped`·0 → `'00:00:00'`) | `TimerPreview`(`useTimerSnapshot`·`useElapsedText`) |

타이머 상태(흐름·경과)는 화면이 판정·저장하지 않는다. 표시는 `timer://changed`와 첫 `get_timer`(공용 훅)로만 바뀐다(02-design §3.3). `controlTimer`의 반환값은 쓰지 않는다.

## 5. 기능 명세

### 5.1 `TimerTab`

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `saveTimer` | `(patch: Partial<TimerSettings>) => Promise<void>` | `await setSettings({ ...settings, timer: { ...timer, ...patch } })` → `onError(null)` | reject → `onError(toBridgeError(e))`. **던지지 않는다**(호출자가 초안을 정리할 수 있게) | R-44, R-46, R-47 |
| `onToggleEnabled` | `() => Promise<void>` | `enabledPending`이면 무시. `setEnabledPending(true)` → `await saveTimer({ enabled: !timer.enabled })` → `setEnabledPending(false)`. 스위치 표시는 저장값(`timer.enabled`)만 따른다 — 실패하면 저장값이 그대로라 원래 값으로 보인다. 끄면 core가 흐르던 타이머를 일시정지하고 `timer://changed`로 미리보기 글자가 멈춘다(U-2) | 실패 → 오류 줄(`saveTimer`) | R-44 |
| `onControl` | `(action: TimerAction) => Promise<void>` | `!timer.enabled \|\| controlPending`이면 무시. `setControlPending(true)` → `await controlTimer(action)` → `onError(null)` → finally `setControlPending(false)`. 확인창 없음(U-7) | reject → `onError(toBridgeError(e))` — `timer.disabled`는 `errors['timer.disabled']`(ja·en) / ko는 core 메시지 | R-45 |
| `commitRotation` | `(v: number) => Promise<void>` | `saveTimer({ rotation: clampRotation(v) })` — `useSliderDraft`의 `commit` | 같음 | R-46 |
| `commitSize` | `(v: number) => Promise<void>` | `saveTimer({ fontSize: clampFontSize(v) })` | 같음 | R-46 |
| `onColorInput` | `(e: ChangeEvent<HTMLInputElement>) => void` — React `onChange`(= 네이티브 `input` 이벤트) | `setColorDraft(e.currentTarget.value)` — 미리보기만 바뀐다 | 없음 | R-47 |
| `commitColor` | `(value: string) => Promise<void>` | `n = normalizeColor(value)` → `n === null \|\| n === timer.color`이면 `setColorDraft(null)` 후 끝 → 아니면 `await saveTimer({ color: n })` → `setColorDraft(null)`(**저장 응답이 끝날 때까지 초안 유지** — 슬라이더 초안과 같은 규칙, 메인 세션 결정 X-2(settings CR 대장). 옛 서술 「먼저 `setColorDraft(null)`」을 대체) | 저장 실패 → 오류 줄, 응답 뒤 초안을 버려 저장값 색으로 돌아감 | R-47 |
| 색 `change` 구독 | `useEffect(() => void, [])` | React `onChange`는 `input` 이벤트에도 불리므로 **네이티브 `change`**(대화상자 닫힘)는 `colorRef.current.addEventListener('change', h)`로 받는다. `h = e => void commitColorRef.current((e.target as HTMLInputElement).value)` — `commitColorRef.current = commitColor`를 렌더마다 갱신(옛 클로저 방지, `ScaleIdleCard.commitScaleRef`와 같은 방식). 언마운트 때 `removeEventListener` | 없음 | R-47 |
| `onCommitPos` | `(pos: Point) => Promise<void>` | `async (pos) => { await saveTimer({ textPos: pos }) }` — `TimerPreview`에 넘김(CR-050 이후 `saveTimer`가 `Promise<boolean>`이라 반환값을 버리는 `await` 형태 — §14.7.1) | 같음 | R-46 |

버튼 비활성 식(세 버튼 공통): `disabled = !timer.enabled || enabledPending || controlPending`. 켜짐이면 타이머 상태와 무관하게 셋 다 활성이다(U-8 — 맞지 않는 누름은 core가 무시). 카드 2의 조작은 on/off와 **무관하게** 늘 쓸 수 있다.

### 5.2 `useSliderDraft` (`components/useSliderDraft.ts`)

```ts
export const useSliderDraft = (saved: number, commit: (v: number) => Promise<void>) => ({
  shown,        // draft ?? saved
  onChange,     // (e: ChangeEvent<HTMLInputElement>) => setDraft(Number(e.currentTarget.value))
  onPointerUp,  // () => void flush()
  onKeyUp,      // (e: KeyboardEvent<HTMLInputElement>) => 이동 키면 SCALE_KEY_COMMIT_MS(300ms) 뒤 flush
  onBlur,       // () => draft !== null 이면 void flush()
})
```

- `flush`: 예약 타이머를 지우고 → `draft === null`이면 끝 → `draft === saved`이면 `setDraft(null)`만 → 아니면 `await commit(draft)` 후 `setDraft(null)`(성공·실패 모두 — `commit`은 던지지 않는다).
- 이동 키 = `ScaleIdleCard`의 `SCALE_NAV_KEYS`와 같은 8개(`ArrowLeft`·`ArrowRight`·`ArrowUp`·`ArrowDown`·`Home`·`End`·`PageUp`·`PageDown`). 지연 값은 `generalValues.SCALE_KEY_COMMIT_MS`(300)를 import한다(새 상수 없음).
- 지연 콜백은 `flushRef.current`(렌더마다 갱신)로 부른다. 언마운트 때 예약 타이머를 지운다.
- `ScaleIdleCard`는 고치지 않는다(같은 패턴 2번째 사용 — 3번째가 생기면 추출 후보, §12).

### 5.3 `TimerPreview`

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `toCanvasPoint` | `(e: PointerEvent<HTMLDivElement>) => Point` | `rect = stageRef.current.getBoundingClientRect()` → `previewToCanvas({ x: e.clientX − rect.left, y: e.clientY − rect.top }, scale, canvas)` | `stageRef.current === null` → `timer.textPos` 반환 | R-46 |
| `onTextPointerDown` | `(e: PointerEvent<HTMLDivElement>) => void` | `e.button !== 0 \|\| pendingPos !== null`이면 무시(저장 중이 아닐 때만). `point = toCanvasPoint(e)` → `e.currentTarget.setPointerCapture(e.pointerId)` → `e.preventDefault()` → `setDrag({ grab: point − shownPos, pos: shownPos, from: shownPos })` | 없음 | R-46 |
| `onTextPointerMove` | 같은 형 | `drag === null`이면 무시. `pos = clampTextPos(toCanvasPoint(e) − drag.grab, canvas)` → `setDrag({ ...drag, pos })` | 없음 | R-46 |
| `onTextPointerUp` | `(e) => Promise<void>` | `drag === null`이면 무시. `{ pos, from } = drag` → `setDrag(null)` → `pos`가 `from`과 같으면 끝(저장 없음) → `setPendingPos(pos)` → `await onCommitPos(pos)` → `setPendingPos(null)`(성공이면 `settings://changed` 저장값, 실패면 옛 저장값 자리) | 없음(`onCommitPos`가 오류 줄) | R-46 |
| `onTextPointerCancel` | `() => void` | `setDrag(null)` — 저장 없음, 옛 자리 | 없음 | R-46 |

회전된 글자도 요소 자체가 포인터를 받으므로 회전 역변환은 하지 않는다. `kb_up`은 글자 위에 그려지지만 `pointer-events: none`이라 글자를 가리지 않는다.

## 6. 렌더

`TimerTab` 반환(아래 순서):

1. `<div className={styles.tab}>`
2. `<SettingsCard title={t.timerCardTitle}>` → `<p className={styles.desc}>{t.timerCardDesc}</p>` → `<ToggleSwitch id="timer-enabled" label={t.timerEnabled} description={t.timerEnabledDesc} checked={timer.enabled} busy={enabledPending} onToggle={() => void onToggleEnabled()} />` → `<div role="group" aria-label={t.timerControlsAria} className={styles.controls}>` 안에 `<button type="button" className={`${styles.btn} ${styles.primary}`} disabled={…} onClick={() => void onControl('start')}>{t.timerStart}</button>`, 같은 모양 `.btn`의 `pause`(`t.timerPause`)·`stop`(`t.timerStop`) → `<p className={styles.hint}>{t.timerStopHint}</p>`
3. `<SettingsCard title={t.timerTextTitle}>` → `<p className={styles.desc}>{t.timerTextDesc}</p>` → `<TimerPreview manifest={manifest} timer={previewTimer} onCommitPos={onCommitPos} />` → 회전 줄 `<div className={gStyles.field}><label htmlFor="timer-rotation">{t.timerRotation}</label><input id="timer-rotation" type="range" min={TIMER_ROTATION_MIN} max={TIMER_ROTATION_MAX} step={1} value={rotation.shown} aria-valuetext={`${rotation.shown}°`} onChange onPointerUp onKeyUp onBlur className={gStyles.slider}/><output htmlFor="timer-rotation">{rotation.shown}°</output></div>` → 크기 줄(같은 모양, `id="timer-size"`, `TIMER_FONT_SIZE_MIN`~`MAX`, `aria-valuetext`·`output` = `{size.shown}px`) → 색 줄 `<label htmlFor="timer-color">{t.timerColor}</label><input id="timer-color" ref={colorRef} type="color" value={colorDraft ?? timer.color} onChange={onColorInput} className={styles.colorInput}/><output htmlFor="timer-color">{colorDraft ?? timer.color}</output>` (`gStyles` = `GeneralTab.module.css`)

`TimerPreview` 반환:

```tsx
<div ref={stageRef} role="group" aria-label={t.timerPreviewAria} className={styles.stage}
     style={{ width: canvas.width * scale, height: canvas.height * scale }}>
  <div className={styles.canvas} style={{ width: canvas.width, height: canvas.height, transform: `scale(${scale})` }}>
    {bg && <img className={styles.layer} src={bg} alt="" draggable={false} />}          // background
    {char && <img className={styles.layer} src={char} alt="" draggable={false} />}      // pomo_char
    {bubble && <img className={styles.layer} src={bubble} alt="" draggable={false} />}  // pomo_bubble
    <div data-testid="timer-text" role="img" aria-label={t.timerTextDragAria}
         style={{ ...timerTextStyle({ ...timer, textPos: shownPos }), pointerEvents: 'auto',
                  cursor: drag ? 'grabbing' : 'grab', touchAction: 'none' }}
         onPointerDown onPointerMove onPointerUp onPointerCancel>{text}</div>
    {kbUp && <img className={styles.layer} src={kbUp} alt="" draggable={false} />}       // kb_up
  </div>
  {manifest.canvas === null && <p className={styles.empty}>{t.previewNoBody}</p>}
</div>
```

- `bg`·`char`·`bubble`·`kbUp` = `findEntry(manifest, slot)?.url`(`'background'`·`'pomo_char'`·`'pomo_bubble'`·`'kb_up'`). 없는 슬롯은 건너뛴다. 합성 순서 = 오버레이 최종 모습(U-5 = A). `hair`·팔·손은 넣지 않는다(요구 없음).
- 미리보기의 글자는 오버레이 표시 조건(U-1)과 **무관하게 늘 보인다**(위치를 잡아야 하므로).
- 캔버스가 없으면(`manifest.canvas === null`) 기본 900×700 상자에 글자만 보이고 기존 문구 `previewNoBody`를 겹쳐 보인다(새 문구 없음). 끌기는 900×700 안으로 제한된다.

## 7. 파이프라인

| # | 흐름 | 정상 | 오류 |
|---|---|---|---|
| T-1 | 탭 열기 | 메뉴 「타이머」(또는 ↓·End) → `h1` = `t.tabTimer` → `TimerPreview` 마운트 → 공용 훅이 `timer://changed` 구독 뒤 `getTimer` → 글자 `00:00:00`(앱 시작 후 처음이면 `stopped`·0, R-48) | 조회 실패 → 훅 초기값 `00:00:00` 유지, 문구 없음(공용 훅 규칙) |
| T-2 | 켜기/끄기 | 스위치 → `busy` → `setSettings({…, timer: {…, enabled}})` → 오류 줄 지움 → `settings://changed`로 스위치·버튼 활성 갱신. 끄면 core 일시정지 → `timer://changed` → 글자 멈춤(값 유지). 다시 켜도 자동 재개 없음 | 실패 → 오류 줄, 스위치는 저장값 그대로 |
| T-3 | 시작·일시정지·멈춤 | 켜짐에서 버튼 → `controlTimer('start' \| 'pause' \| 'stop')` → 오류 줄 지움 → core가 바뀌었으면 `timer://changed` → 글자 흐름/멈춤/`00:00:00`. 상태에 맞지 않는 누름은 core가 무시(이벤트 없음, 화면 변화 없음). 확인창 없음 | 끔 → 버튼 `disabled`라 호출 없음. reject(`timer.disabled` 등) → 오류 줄 `errorText` |
| T-4 | 글자 끌기 | 글자 누름(왼쪽 버튼) → 끌기 중 `clampTextPos`로 캔버스 안, 글자가 따라감 → 놓음 → 바뀌었으면 `setSettings(textPos)` 1회 → 저장 끝까지 놓은 자리 유지 → `settings://changed`(오버레이도 같은 이벤트로 이동) | 안 움직임 → 저장 없음. `pointercancel` → 옛 자리·저장 없음. 저장 중 누름 → 무시. 저장 실패 → 오류 줄, 옛 저장 자리 |
| T-5 | 회전·크기 | 슬라이더 끄는 동안 미리보기만 → 놓음(`pointerup`)·키 이동 뒤 300ms·`blur` → 값이 바뀌었으면 `setSettings(rotation \| fontSize)` 1회 | 실패 → 오류 줄, 초안 버림(저장값으로) |
| T-6 | 색 | 색 대화상자에서 고르는 동안(`input`) 미리보기만 → 닫힘(`change`) → `normalizeColor` → 바뀌었으면 소문자로 `setSettings(color)` 1회 | 형식 이상·같은 값 → 저장 없음. 실패 → 오류 줄, 저장값 색 |
| T-7 | 외부 변경 | 오버레이·다른 경로 저장 → `settings://changed` → 스위치·슬라이더·색·글자 자리 갱신(초안이 없을 때) / 이미지 변경 → `assets://changed` → 합성·캔버스·배율 재계산 / `timer://changed` → 글자 | 없음 |

파괴 조작 confirm: 「멈춤」(00:00:00 초기화)은 **확인창 없음**(U-7 = A, 확정사항 결정 줄 — 스톱워치 초기화라 되돌릴 비용이 작고 ui-design-strategy §11 필수 대상 아님). 뽀모도 카드 「기본값」(= 비우기)은 기존 비우기 확인창(§13).

## 8. bridge 계약 사용 (contract v0.21 예정 — 인용)

| 종류 | 계약 이름 | 래퍼 | 페이로드 타입(`src/bridge/types.ts` 예정) | 호출 위치 | 실패 시 표시 |
|---|---|---|---|---|---|
| command | `set_settings` | `setSettings(settings)` | `Settings`(`timer: TimerSettings` 포함) → `Settings`. 이전 `enabled` true → false면 core가 `Timer::disable` 뒤 `timer://changed` | `TimerTab.saveTimer`(토글·`textPos`·`rotation`·`fontSize`·`color`) | 오류 줄(`settings.invalid` 등 `errorText`) |
| command | `control_timer` | `controlTimer(action: TimerAction)` | `'start' \| 'pause' \| 'stop'` → `TimerSnapshot`(반환값 미사용) | `TimerTab.onControl` | 오류 줄. `timer.disabled` = §4.9 문구 |
| command | `get_timer` | `getTimer()` | → `TimerSnapshot` | 공용 `useTimerSnapshot`(`TimerPreview` 마운트) | 없음(초기값 유지) |
| event | `timer://changed` | `onTimerChanged(handler)` | `TimerSnapshot { status: TimerStatus; elapsedMs: number }` | 공용 `useTimerSnapshot` | — |
| event | `settings://changed` · `assets://changed` | 기존 | `Settings` · `AssetManifest` | `SettingsApp`(기존) | — |
| 상수 | v0.21 | `DEFAULT_TIMER_SETTINGS`(`enabled` false · `textPos` (142, 458) · `rotation` 9(CR-053, v0.24 — 옛 (268, 403)·5) · `fontSize` 36 · `color` `'#333333'`) · `TIMER_ROTATION_MIN/MAX`(−180/180) · `TIMER_FONT_SIZE_MIN/MAX`(12/200) | — | `timerValues`, `TimerTab` 슬라이더 범위 | — |
| 타입 | v0.21 | `AssetSlot` `'pomo_char'`·`'pomo_bubble'`(캔버스 레이어·선택·`hasBuiltinDefault` false) | — | `TimerPreview`(url), `imageSlots.buildSlotGroups`(§13) | — |

화면 코드는 `invoke`·`listen`·이벤트 이름 문자열을 쓰지 않는다. 테스트는 `vi.mock('bridge/commands')`에 `getTimer`·`controlTimer`·`onTimerChanged`를 추가한다(기존 설정 창 테스트 mock 포함 — 기존 테스트 전부 Green).

## 9. 접근성

- 포커스 순서(Tab): 선택된 메뉴 항목 → 「타이머 사용」 스위치 → 「시작」 → 「일시정지」 → 「멈춤」(끔이면 세 버튼 `disabled`라 건너뜀) → 회전 슬라이더 → 크기 슬라이더 → 글자 색. 미리보기 글자는 포커스 대상이 아니다.
- 스위치 = 기존 `ToggleSwitch`(`role="switch"`·`aria-checked`·`aria-busy`). 버튼 묶음 = `role="group"` + `aria-label={t.timerControlsAria}`. 모든 버튼·슬라이더·색 입력은 네이티브라 Enter·Space·화살표로 조작된다. 슬라이더 값은 `aria-valuetext`(`5°`·`36px`)와 `<output>`으로 알린다.
- 미리보기 상자 `role="group"` + `aria-label={t.timerPreviewAria}`, 글자 `role="img"` + `aria-label={t.timerTextDragAria}`, 그림 `<img>`는 모두 `alt=""`(장식). 흐르는 시간은 `aria-live`로 읽지 않는다(초마다 낭독 방지).
- **글자 끌기는 포인터 전용**이다. 「어깨축·손 위치」 끌기와 같은 기존 결정(메인 세션 2026-09-23, `design.md` §9 — 키보드 대체 수단은 요구 없음)을 따른다. 키보드로 자리를 옮기는 수단(예: 화살표 1px 이동)은 요구 밖이라 넣지 않고 **추가 후보(확인 필요)**로 올린다(§12).
- 상태 알림: 저장·조작 실패는 기존 오류 줄 `role="alert"`. 성공은 스위치 `aria-checked`와 보이는 시간으로 드러난다(별도 알림 없음).

## 10. 문구

모든 문구·aria-label = `design/i18n.md` §4.9(단순 키 17 + `slots.pomo_char`·`slots.pomo_bubble` + `errors['timer.disabled']`). 재사용 키: `previewNoBody`(캔버스 없음), `confirmClear*`·`confirmCancel`·`clearImage`·`clearImageAria`·`changeImage`(§13 카드). 화면 코드에 문자열 리터럴 없음(`°`·`px` 단위 기호만 예외).

## 11. 파일 크기 · 예정 TC

- 예상: `TimerTab.tsx` ~220 · `TimerPreview.tsx` ~130 · `useSliderDraft.ts` ~55 · `timerValues.ts` ~45 · `TabIcon.tsx` +3 · `index.tsx` +4 · `imageSlots.ts` +2 · `i18n/types.ts` +22 · `ko/ja/en.ts` 각 +22. 400줄 초과 없음.
- 예정 TC(ui-test-designer, 패킷 §5 U-B): ① `timerValues.test.ts` — §3 검증 예 ② `TimerTab.test.tsx` — 메뉴 4번째·아이콘 `aria-hidden`·`h1` = 타이머(3개 국어), 토글 → `setSettings` 1회 `timer.enabled` 반전·다른 필드 불변 / 실패 → 오류 줄·스위치 원래 값, 끔 → 버튼 3 `disabled`·켬 → 활성(상태 무관), 클릭 → `controlTimer('start'|'pause'|'stop')` 인자, `timer.disabled` reject → 오류 줄 문구(ja·en), 확인창 없음, 회전·크기 `pointerup` 때 1회 저장(범위 자르기)·같은 값이면 0회·키 이동 300ms 뒤 1회, 색 `input` → 미리보기 색만·`change` → 소문자 1회 저장 ③ `TimerPreview.test.tsx` — 합성 5겹 DOM 순서(배경 → 인물 → 말풍선 → 글자 → kb_up, 없는 슬롯 생략), 글자 스타일(left·top·fontSize·color·`rotate(5deg)`)·U-1 조건 무관 표시, 끌기 → `pointerup` 1회 `textPos` 저장(캔버스 안·정수)·안 움직이면 0회·cancel 0회·저장 중 누름 무시, 캔버스 없음 → `previewNoBody`, 공용 훅 mock으로 `'00:12:34'` 표시 ④ `imageSlots.test.ts` — §13 ⑤ `i18n.test.ts`(TC-093 갱신) — 세 사전 키 집합 동일, `ERROR_CODES` 23, `slots` 20 ⑥ 수동: 탭 스크린샷, 색 대화상자, 앱 재시작 00:00:00(R-48).

## 12. 추가 후보 · 확인 필요 (요구 밖 — 넣지 않음)

| 항목 | 이유 | 상태 |
|---|---|---|
| 글자 자리 키보드 이동(화살표 1px) | 끌기의 키보드 대체 | **넣지 않음**(메인 세션 결정 2026-09-26) |
| `imagesNote`·`asset.canvas_mismatch` 문구에 뽀모도 추가 | 뽀모도 두 칸도 캔버스 레이어 | **반영**(메인 세션 결정 2026-09-26 — `design/i18n.md` §4.3·§4.6 CR-045 개정, ja·en 검수 필요) |
| 「어깨축·손 위치」 미리보기에 뽀모도 겹침 | 요구 없음(R-34 헤어만) | 넣지 않음 |

## 13. 이미지 설정 탭 — 배경 그룹 뽀모도 카드 2 (R-42) · `design/images-tab.md` 대체분

비유: 배경 판 묶음에 판 두 장(두 번째 캐릭터, 말풍선)을 더 끼운다. 견본이 없으니 「기본값」은 곧 비우기다.

- **카드 순서**(A-5, 확정사항 결정 줄): 배경 그룹 = `background` → `hair` → **`pomo_char`** → **`pomo_bubble`**(4장). `images-tab.md` §1 ASCII의 `| [card background] [card hair] …|` 줄은 `[card background] [card hair] [card pomo_char] [card pomo_bubble]`로 읽는다(격자는 순서대로 흐르므로 기본 창 3칸이면 둘째 줄로 넘어간다).
- **`imageSlots.buildSlotGroups` ①** 개정: `background` → `hair` → `pomo_char`(msg `'pomo_char'`, `frames` `null`) → `pomo_bubble`(msg `'pomo_bubble'`, `frames` `null`). 다른 그룹·함수 불변.
- **판정**(모두 bridge 상수 — 목록을 화면에 다시 적지 않는다): `required = isRequiredSlot(slot)` = false(필수 배지 없음), `resetKind = hasBuiltinDefault(slot) ? … ` = **`clear`**, `canReset = entry !== undefined`, `lastOnlyBlocked` false. `EMPTYABLE_SLOT_KEYS`에는 넣지 않는다(「비우기」 셋째 버튼 없음 — 「기본값」이 곧 비우기, 카드 양식은 한 줄 버튼·미리보기 140px).
- **검증 예**: 빈 매니페스트 → `pomo_char`·`pomo_bubble` = `required` false·`clear`·`canReset` false·`emptyable` false. `pomo_char`만 등록 → `pomo_char` `canReset` true. 배경 그룹 카드 수 4, 필수 배지 총 2(불변), 전체 카드 수 +2.
- **흐름**: 이미지 변경 = 기존 I-2(`pickPngFile(t.pickTitle)` → `importAsset('pomo_char' | 'pomo_bubble', path)`). 캔버스 크기 다름 → core `asset.canvas_mismatch` → 카드 오류 띠. 「기본값」 = 기존 I-3 비우기 확인창(`confirmClearTitle`·`confirmClearMessage` `{name}` = `slots.pomo_char.title` 등·`confirmClearOk`·`confirmCancel`, 포커스 「취소」, danger) → `removeAsset(slot)` 1회·`restoreDefaultAsset` 0회. R-30 첫 등록 분기와 무관.
- **새 컴포넌트·상태·function 없음** — 목록 2줄과 문구(§4.9 `slots`)만 늘어난다. 오버레이 표시(항상 보임·고정)는 overlay 몫.
- 예정 TC: 배경 그룹 순서 `[background, hair, pomo_char, pomo_bubble]`, 두 칸 `resetKind 'clear'`·`required false`·`emptyable false`, 카드 제목 3개 국어, 「기본값」 → `removeAsset('pomo_bubble')` 1회.

## 14. 타이머 모드 — 두 토글·시작 시간·알림음 카드·끝남 깜빡임 (CR-050)

비유: 벽시계 리모컨에 「올라가는 시계」와 「내려가는 모래시계」 스위치 두 개가 생겼다. 스위치는 한 번에 하나만 켜진다. 모래시계 옆에는 채울 시간을 적는 칸이 있고, 모래가 흐르는 동안은 칸이 잠긴다. 그리고 모래가 다 떨어졌을 때 울릴 종을 고르는 카드가 하나 붙는다. 종은 무대(오버레이)에서만 울리고, 리모컨에서는 들어 보기만 한다.

- 요구: `requirements.md` **v1.21** — R-49(두 토글, TM-01·02·12) · R-50(시작 시간, TM-04·05) · R-51(두 모드 공통 버튼, TM-03·05·12) · R-52(끝남 깜빡임, TM-06, A-5) · R-53(알림음 카드, TM-08·09) · R-54(음량, TM-10) · R-55(3개 국어, TM-13). R-44의 「on/off 토글」 부분은 R-49가 대체한다.
- 근거: 확정사항 §6 「타이머 모드 추가 (🔒 2026-09-26, CR-048)」·결정 줄(D-1~D-11 권고안 확정), `doc/200_설계/architecture/timer-mode-02-design.md` §3.6·§6·§8, `timer-mode-03-packet-ui.md` §2·§3·§5·§6·§7.
- 계약: contract **v0.23** — `src/bridge`에 반영됨(확정, 인용만). 이름: `TimerMode`, `TimerSettings.mode?`·`countdownSecs?`·`alarmVolume?`, `DEFAULT_TIMER_SETTINGS`(`mode` `'stopwatch'`·`countdownSecs` 1500·`alarmVolume` 80), `TIMER_COUNTDOWN_SECS_MIN`(1)·`TIMER_COUNTDOWN_SECS_MAX`(359999)·`TIMER_ALARM_VOLUME_MAX`(100), `TimerStatus` `'finished'`, `TimerSnapshot.mode?`·`durationMs?`, `AlarmFormat`·`AlarmSound { format, bytes, url }`, 래퍼 `getAlarmSound()`·`importAlarmSound(path)`·`removeAlarmSound()`·`pickAudioFile(title?)`, 에러 `sound.not_audio`·`sound.too_many_bytes`·`sound.io`.
- 공용 코드(overlay 설계 CR-050이 정의를 소유 — 여기서는 **이름과 쓰는 방식만 인용**): `components/utils/timerClock`(표시 ms 모드 분기 `timerDisplayMs`, 카운트다운 올림 표기, `mode` 없음 → 스톱워치), `components/utils/timerClock`의 `isTimerBlinking(snapshot: TimerSnapshot): boolean`(순수 — `snapshot.status === 'finished'`), `components/hooks/useElapsedText`(**이름·시그니처·반환 불변** `useElapsedText(snapshot, receivedAt): string` — 모드 분기 반영: 카운트다운 `running`은 올림 초, `finished`는 `'00:00:00'`, `finished`면 interval 없음. 깜빡임 여부는 반환하지 않는다 — 호출자가 `isTimerBlinking`을 부른다), `components/hooks/useTimerSnapshot`(반환 상태에 선택 필드 `fromEvent?: boolean` 추가 — 오버레이 알람 판정용. 이 화면은 읽지 않으며 기존 mock 반환값 `{ snapshot, receivedAt }`은 그대로 유효), `components/utils/alarmSound`(`defaultAlarmUrl(): string` — 첫 호출에 내장 기본음(삐 3번) Blob URL을 만들어 창마다 캐시·재사용; `playSound(url: string, volume: number, onFail?: () => void): () => void` — `volume`은 **0~1 배율**(범위 밖은 0~1로 자름, 비유한수 0), **예외를 던지지 않고** 재생 실패(`play()` 거부·`error` 이벤트·동기 예외)는 `onFail` **최대 1회**로 알림, 반환 = 정지 함수(정지 뒤에는 `onFail` 없음, 두 번 불러도 안전)). 같은 모듈의 `alarmGain(t: TimerSettings)`(저장값 0~100 → 0~1)은 오버레이 알람용이며 이 화면은 쓰지 않는다 — 미리 듣기는 **초안값**(`volumeDraft.shown`)을 `/ 100`으로 직접 바꾼다(슬라이더를 놓기 전 값이라 저장된 `TimerSettings`가 아니다). 정의 출처: `src/overlay/design/functions.md` §5.7 ①②④.
- 레이아웃 확정 상태: **확정**(패킷 §3 화면 명세 수용, ui-layout-designer 구성안 없음).
- **구현 선행 조건(공용 3모듈).** `src/components/utils/timerClock.ts`의 추가 함수(`timerDisplayMs`·`isTimerBlinking` 등), `src/components/utils/alarmSound.ts`(`defaultAlarmUrl`·`playSound`·`alarmGain`), `src/components/hooks/useTimerSnapshot`의 `fromEvent?` 필드는 **overlay CR-050 구현이 만든다.** settings 구현은 그 뒤에 한다. settings 구현은 이 파일들을 새로 만들거나 시그니처를 바꾸지 않는다(import만).

### 14.1 대체 목록 (§1~§12 중 CR-050이 바꾸는 서술)

| 옛 서술 | 새 서술 |
|---|---|
| §1.2 ASCII 카드 1 `ToggleSwitch timerEnabled / timerEnabledDesc` 한 줄, 카드 2개 | §14.2 ASCII — 토글 2줄 + `CountdownTimeInput` + 카드 3개(타이머 → 알림음 → 시간 글자) |
| §2 `ToggleSwitch` 행(`id="timer-enabled"`, `timerEnabled`) | §14.4 토글 2개(`timer-stopwatch`·`timer-countdown`) |
| §2 `TimerPreview` props(`manifest`·`timer`·`onCommitPos`)·「살아 있는 시간(`useTimerSnapshot`·`useElapsedText`)」 | §14.4 — `snapshot`·`receivedAt` props 추가, `useTimerSnapshot`은 `TimerTab`으로 올림(구독 1개 유지), 끝남 깜빡임 |
| §4 `timer`(파생) 초기값 `settings.timer ?? DEFAULT_TIMER_SETTINGS` | §14.6 `timer = fullTimer(settings.timer)`(기본값 스프레드) |
| §4 `snapshot`·`receivedAt` 소유 `TimerPreview` | §14.6 소유 `TimerTab` |
| §5.1 `saveTimer` 식 `{ ...timer, ...patch }` | 식은 그대로, 단 `timer`가 `fullTimer` 결과라 새 필드 3개가 늘 실린다(§14.7) |
| §5.1 `onToggleEnabled` | §14.7 `onToggleMode(mode)` |
| §6 렌더 2 | §14.8 렌더 |
| §9 포커스 순서 | §14.11 |
| §10 문구 `timerEnabled`·`timerEnabledDesc` | 삭제 — `design/i18n.md` §4.10 |
| §11 파일 크기 `TimerTab.tsx` ~220 | §14.13 |

### 14.2 레이아웃 (확정)

```
+--------------------------------------------------------------+
| tabpanel timer -> TimerTab (h1 = tabTimer)                   |
| SettingsCard h2 timerCardTitle                               |
|   ToggleSwitch timerStopwatchEnabled / timerStopwatchDesc    |
|   ToggleSwitch timerCountdownEnabled / timerCountdownDesc    |
|   ---- div.group (divider) --------------------------------  |
|   CountdownTimeInput (row always visible, gray if off)       |
|     label timerDuration [hh]:[mm]:[ss] timerDurationHint     |
|     p timerDurationLocked or timerDurationInvalid            |
|   div[role=group aria-label=timerControlsAria]               |
|     [timerStart] [timerPause] [timerStop]  (off: disabled)   |
|   p.hint timerStopHint                                       |
| AlarmSoundCard -> SettingsCard h2 alarmCardTitle             |
|   p alarmCardDesc                                            |
|   p[aria-live] alarmCurrentDefault or alarmCurrentCustom     |
|   [alarmImport] [alarmPreview] [alarmReset] alarmFileHint    |
|   p[role=alert] alarmPreviewFailed (on failure only)         |
|   ---- div.group (divider) --------------------------------  |
|   alarmVolume [range 0..100 step 1] output {n}%              |
| SettingsCard h2 timerTextTitle (unchanged, 1.2)              |
|   TimerPreview: time text + .blink when finished             |
+--------------------------------------------------------------+
```

- 카드 순서: 뽀모도 타이머 → 알림음 → 시간 글자(패킷 §3). 카드 간격·모양은 §1.2 그대로.
- 시작 시간 행은 **타이머 토글 바로 아래**에 모드·켜짐과 상관없이 늘 보인다(R-50 — 미리 정할 수 있게). 알림음 카드도 늘 보인다(R-53).
- 시간 칸 폭 검산: 칸 3개 × 44px + `:` 2개 × 12px + 간격 = 약 170px + 라벨·힌트 ≤ 424px(카드 안 최소 폭). 좁으면 힌트가 다음 줄로 흐른다(`flex-wrap: wrap`).

### 14.3 CSS (`TimerTab.module.css`에 추가 — 알림음 카드·시간 입력도 이 파일을 쓴다)

| 클래스 | 값 |
|---|---|
| `.durationRow` | `display: flex; flex-wrap: wrap; align-items: center; gap: var(--st-gap-sm); margin: var(--st-gap-md) 0 var(--st-gap-xs)` |
| `.hms` | `display: inline-flex; align-items: center; gap: 4px` (`role="group"` 상자) |
| `.hmsField` | `width: 44px; height: 32px; box-sizing: border-box; border: 1px solid var(--st-border); border-radius: 6px; text-align: center; font: inherit; font-variant-numeric: tabular-nums` / `:disabled` `opacity: 0.45; cursor: not-allowed` / `:focus-visible` `outline: 2px solid var(--st-accent); outline-offset: 1px` / `[aria-invalid="true"]` `border-color: var(--st-danger)` |
| `.hmsSep` | `color: var(--st-muted); font-weight: 600` |
| `.msg` | `margin: 0 0 var(--st-gap-xs); font-size: 12px; color: var(--st-muted)` / `.msgError` `color: var(--st-danger)` |
| `.soundStatus` | `margin: 0 0 var(--st-gap-sm); font-size: 13px; color: var(--st-ink)` |
| `.blink` | `animation: timerBlink 1s infinite` + `@keyframes timerBlink { 0%, 49.9% { opacity: 1 } 50%, 100% { opacity: 0 } }` — overlay `TimerText.module.css`와 **같은 값**(CSS Modules라 파일마다 선언, 공용화 후보 §14.15) |

버튼은 기존 `.controls`·`.btn`(알림음 세 버튼, 강조 없음), 음량 줄은 `GeneralTab.module.css`의 `.field`·`.slider`를 쓴다(새 클래스 없음).

### 14.4 컴포넌트

| 컴포넌트/모듈 | 파일 | 분류 | props / export | 이벤트·부작용 | 요구ID |
|---|---|---|---|---|---|
| `TimerTab` 개정 | `src/settings/components/TimerTab.tsx`(목표 ≤280줄) | 화면 로컬 | 불변(`settings`·`manifest`·`onError`) | 토글 2개·`CountdownTimeInput`·`AlarmSoundCard` 배치, `useTimerSnapshot()` 1회 호출(자식에 전달) | R-49~R-54 |
| `ToggleSwitch` ×2 | 기존 `components/ToggleSwitch.tsx` | 화면 로컬(재사용) | ① `id="timer-stopwatch"`, `label={t.timerStopwatchEnabled}`, `description={t.timerStopwatchDesc}`, `checked={stopwatchOn}`, `busy={enabledPending}`, `onToggle={() => void onToggleMode('stopwatch')}` ② `id="timer-countdown"`, `timerCountdownEnabled`·`timerCountdownDesc`, `checked={countdownOn}`, `busy={enabledPending}`, `onToggle={() => void onToggleMode('countdown')}` | `busy`면 기존 컴포넌트가 `disabled` | R-49 |
| `CountdownTimeInput` (default, **신규**) | `src/settings/components/CountdownTimeInput.tsx`(목표 ≤150줄) | 화면 로컬 | `secs: number`(저장값 `timer.countdownSecs`), `locked: boolean`, `onCommit: (secs: number) => Promise<boolean>`(성공 `true`·실패 `false`, 던지지 않음) | 시·분·초 3칸 입력, 그룹을 벗어날 때·Enter 때 검증 후 `onCommit` 1회(저장 중 `saving`이면 다시 부르지 않음 — Enter 뒤 blur도 1회) | R-50, R-55 |
| `AlarmSoundCard` (default, **신규**) | `src/settings/components/AlarmSoundCard.tsx`(목표 ≤200줄) | 화면 로컬 | `volume: number`(저장값 `timer.alarmVolume`), `onCommitVolume: (v: number) => Promise<void>`, `onError: (e: BridgeError \| null) => void` | 마운트 때 `getAlarmSound`, 등록·미리 듣기·기본값·음량(`const volumeDraft = useSliderDraft(volume, commitVolume)` 재사용 — prop `volume`과 이름이 겹치지 않게 훅 반환은 `volumeDraft`), 언마운트 때·창 숨김(`visibilitychange` → `hidden`) 때 미리 듣기 정지 | R-53, R-54, R-55 |
| `TimerPreview` 개정 | 기존 `TimerPreview.tsx` | 화면 로컬 | props **추가** `snapshot: TimerSnapshot`, `receivedAt: number`. 내부 `useTimerSnapshot()` 호출 **삭제** | 글자 `text` = 공용 훅, `finished`면 글자 div에 `styles.blink` | R-52, R-43 |
| `useSliderDraft` | 기존 `components/useSliderDraft.ts` | 화면 로컬(재사용, 변경 없음) | §5.2 | 3번째 사용(회전·크기·음량) — §14.15 | R-54 |
| `useTimerSnapshot` | 공용 `components/hooks/useTimerSnapshot` | 공용(인용) | `(): { snapshot; receivedAt; fromEvent? }` — 이 화면은 `snapshot`·`receivedAt`만 읽는다 | 호출 위치가 `TimerPreview` → `TimerTab`으로 옮겨질 뿐(구독·`getTimer` 1회 — TC-247 불변) | R-50, R-52 |
| `defaultAlarmUrl`·`playSound` | 공용 `components/utils/alarmSound` | 공용(인용, overlay 설계 소유) | 위 머리 인용(`playSound(url, volume0to1, onFail?) => stop`) | `AlarmSoundCard.onPreview`만 호출(알람 재생은 overlay). `alarmGain`은 쓰지 않음 | R-53 |
| `useElapsedText`·`isTimerBlinking` | 공용 `components/hooks/useElapsedText`·`components/utils/timerClock` | 공용(인용, overlay 설계 소유) | `useElapsedText(snapshot, receivedAt): string`, `isTimerBlinking(snapshot): boolean` | `TimerPreview`만 호출(§14.7.4) | R-43, R-52 |
| `timerValues` 추가 | `src/settings/timerValues.ts`(합계 목표 ≤130줄) | 화면 로컬 순수 | §14.5 | 없음 | R-49, R-50, R-54 |

표준 원소(`<input type="text">`·`<button>`·`<input type="range">`·`<output>`·`<label>`) 직접 사용은 §2 끝 문단과 같은 근거(`design.md` §11 D-1·D-3 — 공용 `Button`·`Slider`·`TextField` 없음). 새 편차 행 없음.

### 14.5 순수 함수 (`src/settings/timerValues.ts` 추가분)

| 이름 | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `FullTimerSettings` | `type = Required<TimerSettings>` | 새 필드 3개가 채워진 타이머 설정 | — | R-49 |
| `fullTimer` | `(t: TimerSettings \| undefined) => FullTimerSettings` | `{ ...DEFAULT_TIMER_SETTINGS, ...t, mode: t?.mode ?? DEFAULT_TIMER_SETTINGS.mode ?? 'stopwatch', countdownSecs: t?.countdownSecs ?? DEFAULT_TIMER_SETTINGS.countdownSecs ?? 1500, alarmVolume: t?.alarmVolume ?? DEFAULT_TIMER_SETTINGS.alarmVolume ?? 80 }` — `t`가 `undefined`면 기본값 전체. 명시 `undefined` 필드도 기본값으로 메운다 | 없음 | R-49, R-50, R-54 |
| `timerToggles` | `(t: FullTimerSettings) => { stopwatchOn: boolean; countdownOn: boolean }` | `stopwatchOn = t.enabled && t.mode === 'stopwatch'`, `countdownOn = t.enabled && t.mode === 'countdown'` | 없음 | R-49 |
| `togglePatch` | `(mode: TimerMode, on: boolean) => Partial<TimerSettings>` | `on` → `{ enabled: true, mode }`, 아니면 `{ enabled: false }`(모드 유지) | 없음 | R-49 |
| `isDurationLocked` | `(t: FullTimerSettings, status: TimerStatus) => boolean` | `t.enabled && t.mode === 'countdown' && (status === 'running' \|\| status === 'paused' \|\| status === 'finished')` | 없음 | R-50 |
| `splitHms` | `(secs: number) => { h: number; m: number; s: number }` | `n = 비유한수면 0, 아니면 min(TIMER_COUNTDOWN_SECS_MAX, max(0, floor(secs)))` → `h = floor(n/3600)`, `m = floor(n%3600/60)`, `s = n%60` | 없음 | R-50 |
| `joinHms` | `(h: number, m: number, s: number) => number` | `h*3600 + m*60 + s`(정수 입력 전제 — 호출자는 `parseHmsDraft`) | 없음 | R-50 |
| `pad2` | `(n: number) => string` | `String(n).padStart(2, '0')` | 없음 | R-50 |
| `HmsDraft` | `type = { h: string; m: string; s: string }` | 세 칸의 입력 문자열 | — | R-50 |
| `parseHmsField` | `(raw: string, max: number) => number \| null` | `v = raw.trim()` → `''`이면 0 → `/^\d{1,2}$/`가 아니면 `null` → `n = Number(v)`, `n > max`면 `null`, 아니면 `n` | 없음 | R-50 |
| `parseHmsDraft` | `(d: HmsDraft) => number \| null` | `h = parseHmsField(d.h, 99)`, `m = parseHmsField(d.m, 59)`, `s = parseHmsField(d.s, 59)` 중 하나라도 `null`이면 `null` → `total = joinHms(h, m, s)` → `total < TIMER_COUNTDOWN_SECS_MIN`(1 — 곧 합계 0)이면 `null`(상한은 칸 범위로 이미 359999 이하), 아니면 `total`(정수) | 없음 | R-50 |
| `clampVolume` | `(v: number) => number` | 비유한수 → `DEFAULT_TIMER_SETTINGS.alarmVolume ?? 80`, 아니면 `round(v)`를 0~`TIMER_ALARM_VOLUME_MAX`로 자름 | 없음 | R-54 |
| `soundSizeKb` | `(bytes: number) => number` | `Math.ceil(bytes / 1024)`(패킷 §3) | 없음 | R-53 |

검증 예: `fullTimer(undefined)` → `DEFAULT_TIMER_SETTINGS`와 같은 값 · `fullTimer({ enabled: true, textPos: {x:1,y:2}, rotation: 0, fontSize: 36, color: '#333333' })` → `mode 'stopwatch'`·`countdownSecs 1500`·`alarmVolume 80`·`enabled true`(옛 설정) · `timerToggles` 그 값 → `{ stopwatchOn: true, countdownOn: false }` · `{ enabled: false, mode: 'countdown' }` → 둘 다 false · `togglePatch('countdown', true)` → `{ enabled: true, mode: 'countdown' }` · `togglePatch('stopwatch', false)` → `{ enabled: false }` · `isDurationLocked({…countdown, enabled: true}, 'paused')` → true · 같은 설정 `'stopped'` → false · `{…stopwatch, enabled: true}` `'running'` → false · `{…countdown, enabled: false}` `'paused'` → false · `splitHms(1500)` → `{0,25,0}` · `splitHms(3723)` → `{1,2,3}` · `splitHms(359999)` → `{99,59,59}` · `splitHms(NaN)` → `{0,0,0}` · `parseHmsDraft({h:'01',m:'02',s:'03'})` → 3723 · `{h:'',m:'0',s:'5'}` → 5 · `{h:'0',m:'0',s:'0'}` → `null` · `{h:'0',m:'60',s:'0'}` → `null` · `{h:'1a',m:'0',s:'0'}` → `null` · `{h:'100',…}` → `null`(세 자리) · `{h:'99',m:'59',s:'59'}` → 359999 · `clampVolume(80.4)` → 80 · `clampVolume(101)` → 100 · `clampVolume(-3)` → 0 · `clampVolume(NaN)` → 80 · `soundSizeKb(312004)` → 305 · `soundSizeKb(1024)` → 1 · `pad2(5)` → `'05'`.

### 14.6 상태

| 상태 | 용도 | 타입 | 초기값 | 소유 |
|---|---|---|---|---|
| `timer` (파생, **개정**) | 저장된 타이머 설정(새 필드 포함) | `FullTimerSettings` | `fullTimer(settings.timer)` | `TimerTab` 파생 |
| `stopwatchOn`·`countdownOn` (파생) | 두 스위치 표시값 | `boolean` | `timerToggles(timer)` | `TimerTab` 파생 |
| `enabledPending` (의미 확장) | 토글 저장 중 — **두 스위치 `busy`**, 세 버튼 비활성 | `boolean` | `false` | `TimerTab` `useState` |
| `snapshot`·`receivedAt` (**이동**) | 살아 있는 타이머 상태 | 공용 훅 반환 | 훅 초기값(`stopped`·0) | `TimerTab`(`useTimerSnapshot`) → `TimerPreview`·잠금 판정에 전달 |
| `durationLocked` (파생) | 시작 시간 입력 잠금 | `boolean` | `isDurationLocked(timer, snapshot.status)` | `TimerTab` 파생 → `CountdownTimeInput.locked` |
| `draft` | 시·분·초 칸 입력 중 문자열 | `HmsDraft \| null` | `null`(= 저장값 표시) | `CountdownTimeInput` `useState` |
| `shownHms` (파생) | 세 칸에 보이는 값 | `HmsDraft` | `draft ?? { h: pad2(sp.h), m: pad2(sp.m), s: pad2(sp.s) }`, `sp = splitHms(secs)` → 기본 `00`·`25`·`00` | `CountdownTimeInput` 파생 |
| `invalid` | 방금 되돌림(잘못된 값) 안내 표시 | `boolean` | `false` | `CountdownTimeInput` `useState` |
| `sound` | 지금 등록된 알림음 | `AlarmSound \| null` | `null`(기본 알림음으로 표시 — 조회 응답 전에도 같다) | `AlarmSoundCard` `useState` |
| `soundPending` | 등록·기본값 처리 중(두 번 누름 방지) | `boolean` | `false` | `AlarmSoundCard` `useState` |
| `previewFailed` | 미리 듣기 실패 문구 | `boolean` | `false` | `AlarmSoundCard` `useState` |
| `stopRef` | 재생 중인 미리 듣기의 정지 함수 | `useRef<(() => void) \| null>` | `null` | `AlarmSoundCard` |
| `volumeDraft` | 음량 슬라이더 초안(`const volumeDraft = useSliderDraft(volume, commitVolume)` — `volume`은 prop 저장값) | 훅 반환(`volumeDraft.shown`·`volumeDraft.onChange`·`onPointerUp`·`onKeyUp`·`onBlur`) | `volumeDraft.shown = volume`(저장값, 기본 80) | `AlarmSoundCard` |
| `saving` | 시작 시간 저장 중(이중 저장 방지) | `boolean` | `false` | `CountdownTimeInput` `useState` |
| `blinking` (파생) | 미리보기 글자 깜빡임 | `boolean` | `isTimerBlinking(snapshot)`(공용 순수 함수 — 값은 `snapshot.status === 'finished'`, 화면에서 재구현 금지) → 훅 초기값(`stopped`)이면 `false` | `TimerPreview` 파생 |

- 잠금 중 `draft`가 있으면 버린다: `CountdownTimeInput`의 효과 `[locked]` — `locked`가 true가 되면 `setDraft(null)`·`setInvalid(false)`. 잠긴 동안 `commit`은 첫 줄 가드로 저장하지 않는다(§14.7.2).
- 미리 듣기 정지 조건(`stopRef` 비움)은 세 가지다: 탭 이동(`TimerTab` 언마운트)·카드 언마운트·**창 숨김**(`document.visibilityState === 'hidden'`). 설정 창 X는 파괴가 아니라 숨기기라(CR-041, `src-tauri/src/lib.rs` prevent_close → hide) 언마운트 정지가 돌지 않으므로 `AlarmSoundCard`가 `document`의 `visibilitychange`를 구독한다(§14.7.3). 새 상태는 없다.
- 타이머 흐름·끝남 10초·0 도달은 화면이 판정하지 않는다(core). 화면은 `snapshot.status`로 잠금·깜빡임만 정한다.

### 14.7 기능 명세

#### 14.7.1 `TimerTab`

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `saveTimer` (**식 불변, 입력·반환 변경**) | `(patch: Partial<TimerSettings>) => Promise<boolean>` | `await setSettings({ ...settings, timer: { ...timer, ...patch } })` → `onError(null)` → `true`. `timer = fullTimer(settings.timer)`이므로 보내는 `timer`는 늘 `{ ...DEFAULT_TIMER_SETTINGS, ...settings.timer, ...patch }`와 같고 `mode`·`countdownSecs`·`alarmVolume`이 빠지지 않는다. 반환값은 `commitCountdownSecs`만 쓴다 — `Promise<void>`로 선언된 기존 호출자(`commitRotation`·`commitSize`·`commitColor`·`onToggleMode`·`commitVolume`·`onCommitPos`)는 `async (…) => { await saveTimer(…) }` 형태로 반환값을 버린다(동작 불변) | reject → `onError(toBridgeError(e))` → `false`. 던지지 않음 | R-49, R-50, R-54 |
| `onToggleMode` (**`onToggleEnabled` 대체**) | `(mode: TimerMode) => Promise<void>` | `enabledPending`이면 무시. `on = !(mode === 'stopwatch' ? stopwatchOn : countdownOn)` → `setEnabledPending(true)` → `await saveTimer(togglePatch(mode, on))` → `setEnabledPending(false)`. 스위치는 저장값만 따른다(실패 → 원래 값). 확인창 없음. 켜진 쪽의 반대 스위치를 켜면 `{ enabled: true, mode }` 한 번으로 전환(상호배타는 값 하나라 저절로). 모드 전환 시 대기 초기화는 core(`timer://changed`) | 실패 → 오류 줄 | R-49 |
| `commitCountdownSecs` | `(secs: number) => Promise<boolean>`(소스 인자 이름 `secsValue`) | `saveTimer({ countdownSecs: secs })`를 그대로 반환(`async` 없는 화살표 함수)(성공 `true`·실패 `false`) — `CountdownTimeInput.onCommit`에 넘김. `secs`는 `parseHmsDraft` 결과(정수 1~359999) | 같음 | R-50 |
| `commitVolume` | `(v: number) => Promise<void>` | `saveTimer({ alarmVolume: clampVolume(v) })` — `AlarmSoundCard.onCommitVolume` | 같음 | R-54 |
| `onControl` | 불변(§5.1) | 버튼 비활성 식 불변: `!timer.enabled \|\| enabledPending \|\| controlPending`(두 모드 공통, 켜짐이면 상태 무관 활성 — R-51). 끝남 중 「시작」 = core가 새 회차(D-7) | 불변 | R-51 |

#### 14.7.2 `CountdownTimeInput`

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `onFieldChange` | `(key: 'h' \| 'm' \| 's') => (e: ChangeEvent<HTMLInputElement>) => void` | `setDraft({ ...shownHms, [key]: e.currentTarget.value })` → `setInvalid(false)`(입력하면 안내 지움). 칸은 `maxLength={2}`라 세 자리 이상은 들어오지 않는다 | 없음 | R-50 |
| `commit` | `() => Promise<void>` | **첫 줄 가드: `locked`(prop)이면 즉시 끝**(저장 없음·`invalid` 불변 — 남은 `draft`는 「잠금 정리 효과」가 버린다. 근거: 포커스가 있던 칸이 `disabled`가 되는 순간 WebView2가 `blur`를 쏠 수 있어 `onGroupBlur` → `commit`이 잠금 뒤에 불릴 수 있다) → `saving`이면 즉시 끝(이중 저장 방지 — Enter 뒤 곧바로 blur 등) → `draft === null`이면 끝 → `secs = parseHmsDraft(draft)` → `null`이면 `setDraft(null)`·`setInvalid(true)`(저장값으로 되돌림, 저장 없음) → `secs === props.secs`이면 `setDraft(null)`(저장 없음) → 아니면 `setInvalid(false)` → `setSaving(true)` → `ok = await onCommit(secs)`(**저장 중에는 `draft`를 그대로 둬 입력한 값이 계속 보인다**) → `setSaving(false)` → `ok === true`면 `draft`를 건드리지 않는다(입력값 = 새 저장값이라 그대로 보이고, `props.secs`가 새 값으로 바뀔 때 아래 「저장값 동기 효과」가 비운다 — 옛 값으로 튀어 돌아가지 않음. 이미 바뀌었으면 효과가 먼저 비웠다) / `ok === false`(저장 실패)면 `setDraft(null)`로 옛 저장값으로 되돌린다(오류 줄은 `saveTimer`) | 없음(`onCommit`은 던지지 않음 — `Promise<boolean>`, 실패는 `false`) | R-50 |
| 저장값 동기 효과 | `useEffect(() => { setDraft(null) }, [secs])` | 저장값(`props.secs`)이 바뀌면(자기 저장 성공 또는 다른 경로의 `settings://changed`) 입력 중 값을 버리고 새 저장값을 보인다. 저장 성공 시 `draft`와 새 저장값이 같은 숫자라 화면 변화 없음 | 없음 | R-50 |
| `onGroupBlur` | `(e: FocusEvent<HTMLDivElement>) => void` — 세 칸을 감싼 `div[role=group]`의 `onBlur` | `e.currentTarget.contains(e.relatedTarget as Node \| null)`이면(세 칸 안 이동) 무시 → 아니면 `void commit()`. 칸 사이 Tab 이동으로는 저장하지 않는다(01:02:03 입력이 한 번에 저장) | 없음 | R-50 |
| `onFieldKeyDown` | `(e: KeyboardEvent<HTMLInputElement>) => void` | `e.key === 'Enter'`면 `e.preventDefault()` → `void commit()`(포커스 유지) | 없음 | R-50 |
| 잠금 정리 효과 | `useEffect(() => { if (locked) { setDraft(null); setInvalid(false) } }, [locked])` | 흐르기 시작하면 입력 중 값을 버린다 | 없음 | R-50 |

검증 예(컴포넌트): 저장값 1500 → 칸 `00`·`25`·`00` · 칸에 `01`·`02`·`03` 입력 후 그룹 밖으로 포커스 → `onCommit(3723)` 1회 · `00`·`00`·`00` → `onCommit` 0회, 칸 `00`·`25`·`00`, 문구 `timerDurationInvalid` · 분 `60` → 같음 · 입력 없이 blur → 0회 · `locked` true → 세 칸 `disabled`, 문구 `timerDurationLocked` · `01`·`02`·`03` 입력 후 Enter → 저장 대기 중 그룹 밖 blur → `onCommit` **1회**(`saving`) · 저장 중 칸 = `01`·`02`·`03` 유지 → 성공(`true`) 후 `secs` 3723 수신 → 칸 `01`·`02`·`03`(튐 없음) · 실패(`false`) → 칸 = 옛 저장값 `00`·`25`·`00` · 칸에 `01` 입력 → `locked` true로 재렌더 뒤 focusOut(`locked` true 상태에서 그룹 blur 발생) → `onCommit` **0회**, 칸 = 저장값.

#### 14.7.3 `AlarmSoundCard`

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| 마운트 조회 효과 | `useEffect(() => …, [])` | `alive = true` → `getAlarmSound()` → `alive`면 `setSound(result)` / cleanup `alive = false` | reject → `alive`면 `onError(toBridgeError(e))`, `sound`는 `null` 유지(기본으로 보임) | R-53 |
| `stopPreview` | `() => void` | `stopRef.current?.()` → `stopRef.current = null` | 없음 | R-53 |
| 언마운트 정지 효과 | `useEffect(() => () => stopPreview(), [])` | 탭을 떠나면(`TimerTab` 언마운트 — `SettingsApp`은 선택 탭만 렌더) 소리를 멈춘다 | 없음 | R-53 |
| 창 숨김 정지 효과 | `useEffect(() => { const h = () => { if (document.visibilityState === 'hidden') stopPreview() }; document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h) }, [])` | 구독은 마운트 시, 해제는 언마운트 시. 설정 창 X는 창을 숨길 뿐(CR-041 — `src-tauri/src/lib.rs` prevent_close → hide) 컴포넌트가 언마운트되지 않으므로, 창이 숨겨지면(`visibilityState === 'hidden'`) 미리 듣기를 멈춘다. `visible`로 돌아올 때는 아무것도 하지 않는다(자동 재생 없음). `stopPreview`는 ref만 만지므로 옛 클로저 문제가 없다. 미리 듣기 정지 규칙(R-53)의 일부 | 없음 | R-53 |
| `onImport` | `() => Promise<void>` | `soundPending`이면 무시 → `setSoundPending(true)` → `path = await pickAudioFile(t.alarmPickTitle)` → `null`(취소)이면 끝(문구·오류 없음) → `next = await importAlarmSound(path)` → `stopPreview()` → `setSound(next)` → `setPreviewFailed(false)` → `onError(null)` → finally `setSoundPending(false)` | 어느 단계든 reject → `onError(toBridgeError(e))`(`sound.not_audio`·`sound.too_many_bytes`·`sound.io` → 오류 줄 `errorText`), `sound` 불변(core가 기존 알림음 유지) | R-53 |
| `onPreview` | `() => void` | `stopPreview()`(재생 중이면 처음부터 다시) → `setPreviewFailed(false)` → `url = sound?.url ?? defaultAlarmUrl()` → `stopRef.current = playSound(url, volumeDraft.shown / 100, () => setPreviewFailed(true))` — 음량은 **초안값**을 0~1 배율로(`alarmGain` 쓰지 않음). 반환값(정지 함수)을 그대로 `stopRef`에 둔다(`try`/`catch`·`.catch` 없음 — `playSound`는 던지지 않고 Promise를 반환하지 않는다). 재생 거부(`NotAllowedError` 등)·`error` 이벤트는 셋째 인자 `onFail`로 최대 1회 → `alarmPreviewFailed` 표시. `stopPreview()` 뒤에는 `onFail`이 오지 않으므로 이전 재생의 늦은 실패가 새 표시를 덮지 않는다 | 예외를 밖으로 던지지 않음. 오류 줄은 쓰지 않는다(카드 안 `role=alert` 문구만) | R-53 |
| `onReset` | `() => Promise<void>` | `sound === null \|\| soundPending`이면 무시 → `setSoundPending(true)` → `stopPreview()` → `await removeAlarmSound()` → `setSound(null)` → `setPreviewFailed(false)` → `onError(null)` → finally `setSoundPending(false)`. 확인창 없음(R-53 확정 해석) | reject(`sound.io`) → `onError(toBridgeError(e))`, `sound` 불변 | R-53 |
| `commitVolume` | `(v: number) => Promise<void>` | `onCommitVolume(v)`(TimerTab이 `clampVolume` 후 저장) — `const volumeDraft = useSliderDraft(volume, commitVolume)`의 `commit`(`volume` = prop 저장값) | 던지지 않음 | R-54 |
| `statusText` (파생) | `string` | `sound === null` → `t.alarmCurrentDefault`, 아니면 `format(t.alarmCurrentCustom, { format: sound.format.toUpperCase(), size: soundSizeKb(sound.bytes) })` → 예 「지금: 등록한 알림음 (MP3 · 305 KB)」 | 없음 | R-53 |

버튼 비활성: 「파일 등록」 `soundPending`, 「미리 듣기」 없음(늘 활성), 「기본값」 `sound === null || soundPending`. 음량 슬라이더는 늘 활성.

#### 14.7.4 `TimerPreview` (개정분)

- `const text = useElapsedText(snapshot, receivedAt)` — props로 받은 스냅숏. 카운트다운 올림·`finished` `'00:00:00'`·옛 스냅숏(`mode` 없음) 처리는 공용 훅·`timerClock`이 한다(재구현 금지).
- `const blinking = isTimerBlinking(snapshot)` — 공용 `components/utils/timerClock`에서 import. 훅은 `string`만 반환하므로 깜빡임은 이 한 줄로 구한다(`{ text, blinking }` 형태 없음).
- 글자 div에 `className={blinking ? styles.blink : undefined}` 추가. `.blink`·`@keyframes timerBlink`는 settings 로컬 `TimerTab.module.css`(§14.3)의 것 — overlay CSS를 import하지 않는다(화면 간 import 금지). 깜빡임은 CSS만(JS 타이머 금지 — 패킷 §7). 끌기·스타일·합성 순서는 §5.3·§6 그대로.

### 14.8 렌더

`TimerTab` 반환(§6 대체분, 순서대로):

1. `<section aria-label={t.tabTimer} className={styles.tab}>`
2. 카드 1 `<SettingsCard title={t.timerCardTitle}>` → 스톱워치 `ToggleSwitch`(§14.4 ①) → 타이머 `ToggleSwitch`(②) → `<div className={styles.group}>` 안에 `<CountdownTimeInput secs={timer.countdownSecs} locked={durationLocked} inactive={!countdownOn} onCommit={commitCountdownSecs} />` → 버튼 묶음(§6 그대로) → `<p className={styles.hint}>{t.timerStopHint}</p>` (CR-052: 설명문 `timerCardDesc` 삭제, 묶음 `.group` 추가 — §14.16)
3. 카드 2 `<AlarmSoundCard volume={timer.alarmVolume} onCommitVolume={commitVolume} onError={onError} />`(카드 자신이 `SettingsCard`를 렌더)
4. 카드 3 시간 글자 — §6 3 그대로, 단 `<TimerPreview manifest={manifest} timer={previewTimer} snapshot={snapshot} receivedAt={receivedAt} onCommitPos={onCommitPos} />`

`CountdownTimeInput` 반환:

```tsx
<div className={styles.durationRow}>
  <span id="timer-duration-label">{t.timerDuration}</span>
  <div role="group" aria-labelledby="timer-duration-label" aria-describedby="timer-duration-msg"
       className={styles.hms} onBlur={onGroupBlur}>
    <input type="text" inputMode="numeric" maxLength={2} autoComplete="off" aria-label={t.timerHoursAria}
           value={shownHms.h} disabled={locked} aria-invalid={invalid || undefined}
           onChange={onFieldChange('h')} onKeyDown={onFieldKeyDown} className={styles.hmsField} />
    <span className={styles.hmsSep} aria-hidden="true">:</span>
    {/* 분(timerMinutesAria, shownHms.m)·초(timerSecondsAria, shownHms.s) — 같은 모양 */}
  </div>
  <span className={styles.hint}>{t.timerDurationHint}</span>
</div>
<p id="timer-duration-msg" aria-live="polite"
   className={invalid && !locked ? `${styles.msg} ${styles.msgError}` : styles.msg}>
  {locked ? t.timerDurationLocked : invalid ? t.timerDurationInvalid : ''}
</p>
```

`AlarmSoundCard` 반환:

```tsx
<SettingsCard title={t.alarmCardTitle}>
  <p className={styles.desc}>{t.alarmCardDesc}</p>
  <p className={styles.soundStatus} aria-live="polite">{statusText}</p>
  <div className={styles.controls}>
    <button type="button" className={styles.btn} disabled={soundPending} onClick={() => void onImport()}>{t.alarmImport}</button>
    <button type="button" className={styles.btn} onClick={onPreview}>{t.alarmPreview}</button>
    <button type="button" className={styles.btn} disabled={sound === null || soundPending} onClick={() => void onReset()}>{t.alarmReset}</button>
  </div>
  <p className={styles.hint}>{t.alarmFileHint}</p>
  {previewFailed && <p role="alert" className={`${styles.msg} ${styles.msgError}`}>{t.alarmPreviewFailed}</p>}
  <div className={gStyles.field}>
    <label htmlFor="alarm-volume">{t.alarmVolume}</label>
    <input id="alarm-volume" type="range" min={0} max={TIMER_ALARM_VOLUME_MAX} step={1} value={volumeDraft.shown}
           aria-valuetext={`${volumeDraft.shown}%`} onChange={volumeDraft.onChange} onPointerUp={volumeDraft.onPointerUp}
           onKeyUp={volumeDraft.onKeyUp} onBlur={volumeDraft.onBlur} className={gStyles.slider} />
    <output htmlFor="alarm-volume">{volumeDraft.shown}%</output>
  </div>
</SettingsCard>
```

- `%`는 `°`·`px`와 같은 세 언어 공통 단위 리터럴(키 없음). `:` 구분 문자도 리터럴(`aria-hidden`).
- `alarmFileHint`는 ASCII(§14.2)에서 버튼 줄 오른쪽이지만 좁은 창에서 흐름이 깨지지 않도록 버튼 줄 아래 `p.hint`로 둔다(같은 카드 안, 내용 불변).

### 14.9 파이프라인

| # | 흐름 | 정상 | 오류 |
|---|---|---|---|
| T-8 | 스톱워치/타이머 켜기·전환 | 스위치 → 두 스위치 `busy`·세 버튼 잠금 → `setSettings({…, timer: {…full, enabled: true, mode}})` → 오류 줄 지움 → `settings://changed`로 한쪽 켜짐·다른 쪽 꺼짐 → 모드가 바뀌었으면 core가 대기로 초기화 → `timer://changed` → 미리보기 `00:00:00`(스톱워치) 또는 지정 시간(타이머) | 실패 → 오류 줄, 두 스위치 저장값 그대로 |
| T-9 | 끄기 | 켜진 스위치 → `{…full, enabled: false}`(모드 유지) → core 끔 규칙(흐르면 일시정지, 끝남이면 대기) → 버튼 3 비활성 | 같음 |
| T-10 | 시작 시간 저장 | 칸 입력 → 그룹 밖 포커스 또는 Enter → `parseHmsDraft` → 저장값과 다르면 `setSettings({…, timer: {…full, countdownSecs}})` 1회 → `settings://changed` → 칸 = 저장값(두 자리) → core가 대기면 표시 갱신(`timer://changed`) | 형식 이상·범위 밖·합계 0 → 칸 되돌림 + `timerDurationInvalid`, 저장 없음. 같은 값 → 저장 없음. 저장 실패(`settings.invalid` 등) → 오류 줄, 칸 = 옛 저장값 |
| T-11 | 잠김 | 타이머 켜짐 + `timer://changed` `running`·`paused`·`finished` → 세 칸 `disabled` + `timerDurationLocked`, 입력 중 값 버림 → 멈춤·끝남 10초 뒤 `stopped` → 풀림 | 없음 |
| T-12 | 끝남 표시 | `timer://changed` `finished` → 미리보기 글자 `00:00:00` + `.blink`(1초 주기) → 10초 뒤 core `stopped`(지정 시간) → 깜빡임 끝. 소리는 오버레이만 | 없음 |
| T-13 | 알림음 등록 | 「파일 등록」 → `pickAudioFile(t.alarmPickTitle)` → 경로 → `importAlarmSound(path)` → 상태 문구 「등록한 알림음 (형식 · KB)」 | 취소 → 아무 일 없음. reject → 오류 줄(`errors['sound.*']`, ko는 core 메시지), 상태 문구 불변 |
| T-14 | 미리 듣기 | 「미리 듣기」 → 이전 재생 정지 → 지금 소리(사용자 url 또는 내장 기본음) 초안 음량으로 1회 재생 | 재생 거부·`error` → 카드 안 `alarmPreviewFailed`(오류 줄 아님). 다음 누름·등록·기본값 때 지움 |
| T-15 | 기본값 | 「기본값」(사용자 파일 있을 때만 활성) → 재생 정지 → `removeAlarmSound()` → 상태 문구 「기본 알림음」 → 버튼 비활성 | reject(`sound.io`) → 오류 줄, 상태 불변 |
| T-16 | 음량 | 슬라이더 끄는 동안 `%`만 → 놓음·키 이동 300ms·blur → 바뀌었으면 `setSettings({…, timer: {…full, alarmVolume}})` 1회 | 실패 → 오류 줄, 초안 버림 |
| T-17 | 탭 이탈·창 숨김 | 미리 듣기 정지 조건 = **탭 이동·언마운트·창 숨김**. ① 다른 메뉴 선택 → `TimerTab` 언마운트 → 미리 듣기 정지(`stopPreview`), 슬라이더 예약 해제(기존) ② 설정 창 X(숨기기, CR-041) 등으로 `visibilitychange` + `document.visibilityState === 'hidden'` → `stopPreview()`(컴포넌트·초안·상태는 그대로 — 다시 열면 같은 화면, 소리는 다시 울리지 않음) | 없음 |

파괴 조작 confirm: 두 토글 전환(모드 바뀌면 흐르던 시간 초기화)·알림음 「기본값」(등록 파일 삭제)은 **확인창 없음** — 확정 결정(패킷 §2 「확인창은 없다」·§3 「확인창은 없다」, R-49·R-53 확정 해석). ui-design-strategy §11 필수 대상(이미지 슬롯 비우기·전체 초기화)이 아니다.

### 14.10 bridge 계약 사용 (contract v0.23 — 인용)

| 종류 | 계약 이름 | 래퍼 | 페이로드 타입(`src/bridge/types.ts`) | 호출 위치 | 실패 시 표시 |
|---|---|---|---|---|---|
| command | `set_settings` | `setSettings(settings)` | `Settings`(`timer: TimerSettings` — 늘 `fullTimer` 스프레드) → `Settings` | `TimerTab.saveTimer`(`onToggleMode`·`commitCountdownSecs`·`commitVolume` + 기존) | 오류 줄(`settings.invalid` 등) |
| command | `control_timer` | `controlTimer(action)` | 불변 | `TimerTab.onControl` | 오류 줄. `timer.disabled` 새 문구 |
| command | `get_timer` · event `timer://changed` | `getTimer()`·`onTimerChanged` | `TimerSnapshot { status (+'finished'), elapsedMs, mode?, durationMs? }` | 공용 `useTimerSnapshot`(이제 `TimerTab`에서 1회) | 없음(초기값 유지) |
| command | `get_alarm_sound` | `getAlarmSound()` | → `AlarmSound \| null` | `AlarmSoundCard` 마운트 | 오류 줄(`sound.io`) |
| command | `import_alarm_sound` | `importAlarmSound(path)` | `path: string` → `AlarmSound` | `AlarmSoundCard.onImport` | 오류 줄(`sound.too_many_bytes`·`sound.not_audio`·`sound.io`) |
| command | `remove_alarm_sound` | `removeAlarmSound()` | → `void` | `AlarmSoundCard.onReset` | 오류 줄(`sound.io`) |
| 래퍼(TS) | — | `pickAudioFile(title?)` | → `string \| null`(취소 `null`) | `AlarmSoundCard.onImport`(`t.alarmPickTitle`) | reject → 오류 줄 |
| 상수 | v0.23 | `DEFAULT_TIMER_SETTINGS`·`TIMER_COUNTDOWN_SECS_MIN/MAX`·`TIMER_ALARM_VOLUME_MAX` | — | `timerValues`, 음량 슬라이더 `max` | — |

화면 코드는 `invoke`·`listen`·`new Audio`를 직접 쓰지 않는다(소리는 공용 `playSound`만). 테스트는 `vi.mock('bridge/commands')`에 `getAlarmSound`·`importAlarmSound`·`removeAlarmSound`·`pickAudioFile`을 추가하고 `vi.mock('components/utils/alarmSound')`로 `defaultAlarmUrl`·`playSound`를 대체한다(jsdom에 `URL.createObjectURL`·오디오 재생 없음). 알림음 변경 이벤트는 없다(A-1) — 카드는 자기 조작 결과로만 갱신한다.

### 14.11 접근성

- 포커스 순서(Tab, §9 대체): 선택된 메뉴 항목 → 「스톱워치 사용」 → 「타이머 사용」 → 시 → 분 → 초(잠기면 건너뜀) → 「시작」 → 「일시정지」 → 「멈춤」(꺼짐이면 건너뜀) → 「파일 등록」 → 「미리 듣기」 → 「기본값」(사용자 파일 없으면 건너뜀) → 음량 → 회전 → 크기 → 글자 색.
- 두 스위치 = 기존 `ToggleSwitch`(`role="switch"`·`aria-checked`·`aria-busy`). 한쪽을 켜면 다른 쪽 `aria-checked`가 `false`로 바뀐다(저장값).
- 시작 시간: 묶음 `role="group"` + `aria-labelledby`(「시작 시간」), 칸마다 `aria-label` = `timerHoursAria`·`timerMinutesAria`·`timerSecondsAria`, `inputMode="numeric"`(숫자 키패드). 잘못된 값이면 `aria-invalid="true"`, 안내·잠김 문구는 `aria-describedby` 대상 `p[aria-live=polite]`로 알린다. Enter = 저장, Tab = 칸 이동(저장 안 함), 묶음 밖으로 나가면 저장.
- 알림음: 상태 문구 `aria-live="polite"`(등록·기본값 뒤 새 문구를 읽음), 미리 듣기 실패 `role="alert"`, 음량 `aria-valuetext` = `{n}%` + `<output>`. 세 버튼은 네이티브 `<button>`(Enter·Space).
- 창 숨김 시 미리 듣기 정지(`visibilitychange`, §14.7.3)는 **접근성 영향 없음** — 포커스·역할·알림 문구를 바꾸지 않고, 숨겨진 창이라 알릴 대상도 없다.
- 깜빡이는 미리보기 글자는 `aria-live`로 읽지 않는다(§9 그대로). 깜빡임 주기 1Hz(초당 3회 미만 — 광과민 기준 안).

### 14.12 문구

모든 새 문구·aria-label = `design/i18n.md` §4.10(키 이름으로만 인용). 삭제 `timerEnabled`·`timerEnabledDesc`, 변경 `timerStopHint`·`errors['timer.disabled']`, 추가 에러 `sound.*` 3개. 화면 리터럴은 `°`·`px`·`%`·`:`뿐.

### 14.13 파일 크기 (TSX 400줄 한계)

| 파일 | 지금 | 예상 | 근거 |
|---|---|---|---|
| `TimerTab.tsx` | 212 | ~255(**실측 260**, CR-050 구현 후) | 토글 1개 추가(+9)·`onToggleMode`(+3)·`useTimerSnapshot`·잠금 파생(+4)·`commitCountdownSecs`·`commitVolume`(+2)·자식 2개 배치(+6)·import(+6), `onToggleEnabled` 삭제(−6). 시간 입력·알림음 카드 본문은 **하위 컴포넌트로 분리**해 넣지 않는다 |
| `CountdownTimeInput.tsx` | 신규 | ~130(**실측 133**) | 상태 3(`draft`·`invalid`·`saving`)·함수 4·효과 2·렌더 3칸 |
| `AlarmSoundCard.tsx` | 신규 | ~160(**실측 177**) | 상태 3·ref 1·효과 3(마운트 조회·언마운트 정지·창 숨김 정지)·함수 5·렌더 |
| `TimerPreview.tsx` | 118 | ~120(**실측 122**) | props 2개 추가, 훅 호출 1줄 삭제, 클래스 1줄 |
| `timerValues.ts` | ~45 | ~120(**실측 121**) | §14.5 함수 11개 |
| `TimerTab.module.css` | — | +30 | §14.3 |

모두 400줄 미만이다. 함수는 50줄 한계 안(가장 긴 `onImport` ~15줄).

### 14.14 예정 TC (ui-test-designer — settings `test/scenarios.md` 마지막 TC-268 · TC-FLOW-27 다음)

| TC | 대상 | 요구 |
|---|---|---|
| TC-269 | `timerValues` §14.5 검증 예 전부(`fullTimer`·`timerToggles`·`togglePatch`·`isDurationLocked`·`splitHms`·`joinHms`·`pad2`·`parseHmsField`·`parseHmsDraft`·`clampVolume`·`soundSizeKb`) | R-49, R-50, R-53, R-54 |
| TC-270 | 토글 표시 4가지 — 둘 다 꺼짐·스톱워치 켜짐·타이머 켜짐·옛 설정(`mode` 없음, `enabled: true`) → 스톱워치 켜짐 | R-49 |
| TC-271 | 토글 저장 인자 — 스톱워치 켜기 `{enabled:true, mode:'stopwatch'}`·타이머로 전환 `{enabled:true, mode:'countdown'}`·끄기 `{enabled:false}`(모드 유지), 나머지 필드(`countdownSecs`·`alarmVolume`·글자 4필드) 불변·늘 포함, 확인창 없음 | R-49 |
| TC-272 | 토글 pending — 두 스위치 `aria-busy`·`disabled`, 세 버튼 `disabled`, 실패 → 오류 줄·스위치 원래 값 | R-49 |
| TC-273 | 시작 시간 표시 — 기본 `00`·`25`·`00`, 저장값 3723 → `01`·`02`·`03`, 수신(`settings://changed`) 반영, 세 칸 `aria-label` | R-50, R-55 |
| TC-274 | 시작 시간 저장 — 01:02:03 입력 후 묶음 밖 포커스 → `countdownSecs` 3723 1회(정수), Enter도 1회, **Enter 후 저장 대기 중 blur → 저장 1회**(`saving`), 저장 중·성공 뒤 칸 `01`·`02`·`03` 유지(옛 값으로 튀지 않음), 칸 사이 Tab은 0회, 같은 값 0회 | R-50 |
| TC-275 | 되돌림 — 00:00:00·분 60·문자 → 저장 0회·칸 저장값·`timerDurationInvalid`·`aria-invalid`, 다시 입력하면 문구 지움, 저장 실패 → 오류 줄·옛 값 | R-50 |
| TC-276 | 잠금 — 타이머 켜짐 + `running`·`paused`·`finished` → 세 칸 `disabled`·`timerDurationLocked`·입력 중 값 버림 / `stopped`·스톱워치 `running`·둘 다 꺼짐 → 입력 가능 / **`locked` 재렌더 뒤 focusOut → 저장 0회**(칸 입력 → `locked` true로 재렌더 → 그룹 blur 발생 → `onCommit`·`setSettings` 0회, 칸 = 저장값) | R-50 |
| TC-277 | 알림음 카드 마운트 — `getAlarmSound` 1회, `null` → 「지금: 기본 알림음」·「기본값」 비활성, `{mp3, 312004}` → 「지금: 등록한 알림음 (MP3 · 305 KB)」, 조회 실패 → 오류 줄 | R-53 |
| TC-278 | 파일 등록 — `pickAudioFile(t.alarmPickTitle)` → `importAlarmSound(path)` 1회 → 문구 갱신·오류 줄 지움, 취소(`null`) → import 0회, 처리 중 「파일 등록」 비활성 | R-53 |
| TC-279 | 등록 실패 — `sound.not_audio`·`sound.too_many_bytes` → 오류 줄(ja·en 문구), 상태 문구 불변 | R-53, R-55 |
| TC-280 | 기본값 — 확인창 없이 `removeAlarmSound` 1회 → 기본 문구·버튼 비활성, 재생 중이면 정지, 실패(`sound.io`) → 오류 줄 | R-53 |
| TC-281 | 미리 듣기 — 사용자 url / 없으면 `defaultAlarmUrl()`, 음량 = 초안/100(슬라이더를 놓기 전 값), 다시 누르면 이전 정지 후 재생, 실패 → `alarmPreviewFailed`(`role=alert`, 오류 줄 아님), 다음 누름에 지움 | R-53, R-54 |
| TC-282 | 미리 듣기 정지 — ① 다른 탭으로 이동(언마운트) → 정지 함수 호출 ② (창 숨김) 미리 듣기 중 `document.visibilityState`를 `'hidden'`으로 두고 `visibilitychange` 발생 → 정지 함수 1회, 카드는 그대로 렌더 / `'visible'`로 `visibilitychange` → 정지·재생 0회 ③ 언마운트 뒤 `visibilitychange` → 정지 함수 추가 호출 없음(구독 해제) | R-53 |
| TC-283 | 음량 — 끄는 동안 `{n}%`만, 놓을 때 `alarmVolume` 정수 1회, 같은 값 0회, 키 300ms 1회, 기본 80% | R-54 |
| TC-284 | 미리보기 끝남 — `finished` → 글자 `.blink`·`00:00:00`(공용 훅 mock), 그 밖 상태 → 클래스 없음, `useTimerSnapshot` 구독 1개(TimerTab) | R-52 |
| TC-285 | 탭 레이아웃·포커스 순서 — 카드 3개 순서, §14.11 Tab 순서 | R-49, R-50, R-53 |
| TC-286 | i18n — 세 사전 키 집합 동일(새 22키 포함, `timerEnabled`·`timerEnabledDesc` 없음), `ERROR_CODES` 25(`sound.*` 3개 `timer.disabled` 뒤), `timerStopHint`·`errors['timer.disabled']` 새 문구 | R-55 |
| TC-287 | ja·en 렌더 — 두 토글·시작 시간·알림음 카드 문구 | R-55 |
| TC-FLOW-28 | S-27: 타이머 켜기(스톱워치 꺼짐) → 시간 바꾸기 → 시작 → 잠김 → 멈춤 → 풀림 → 끄기 | R-49, R-50, R-51 |
| TC-FLOW-29 | S-28: `finished` 수신 → 깜빡임 → 시작(새 회차 인자) / 멈춤 | R-52, R-51 |
| TC-FLOW-30 | S-29: 등록 → 미리 듣기 → 음량 → 잘못된 파일 오류 → 기본값 | R-53, R-54 |

**기존 TC 개정(기대값 갱신)**: TC-249(`src/settings/test/TimerTab.test.tsx:216` — `DEFAULT_TIMER_SETTINGS` 새 필드 3개 때문에 지금 깨져 있다. 기대 `timer` = `{ ...DEFAULT_TIMER_SETTINGS, enabled: true, mode: 'stopwatch' }` — 스위치 대상도 「스톱워치 사용」) · TC-248(토글 1 → 2·카드 3개) · TC-250·TC-251(스위치 이름·저장 인자에 `mode`) · TC-260~TC-265(`TimerPreview`에 `snapshot`·`receivedAt` props, TC-261은 훅 mock 대신 props) · TC-246(`ERROR_CODES` 22 → 25, 단순 키 증감) · TC-268(3개 국어 문구 새 키). TC-247의 `getTimer` 1회는 유지된다(구독이 `TimerTab` 하나).

**수동 확인 예정(`test/manual-checklist.md`, ui-test-designer)**: ① 패킷 §0 자동 재생 스파이크 — 트레이 「시작」만으로 00:00:05 타이머가 0에 닿을 때 오버레이에서 기본음이 울리는가(울림/`NotAllowedError` 기록, 실패 시 아키텍트로 되돌림) ② 실제 소리 청취 — 미리 듣기 기본음(삐 3번)·사용자 wav·mp3·ogg, 음량 0·80·100 차이 ③ 미리 듣기 중 다른 탭으로 옮기거나 설정 창 X(숨기기)를 누르면 소리가 멈추는가 ④ 끝남 깜빡임을 설정 미리보기와 오버레이에서 함께 눈으로 확인(스크린샷) ⑤ 시간 칸 IME(한글 입력 상태)에서 숫자 입력.

### 14.15 공용화 후보 · 확인 필요

| 항목 | 이유 | 상태 |
|---|---|---|
| `.blink`·`@keyframes timerBlink` | overlay `TimerText.module.css`와 같은 선언이 두 화면에 생김(지금은 화면마다 로컬 선언 — 화면 간 import 금지) | 공용 승격 후보(전역 CSS 또는 공용 모듈) — ui-postprocessor 옵트인 때 |
| `useSliderDraft` | 3번째 사용(회전·크기·음량) + `ScaleIdleCard` 같은 패턴 | 공용 훅 승격 후보(`components/hooks`) — §5.2 「3번째면 추출 후보」 조건 충족, 옵트인 때 |
| `timerCardDesc` 문구 | 지금 문구가 「0부터 올라가는 시간·쉬는중 멈춤」만 설명해 타이머 모드와 어긋난다. 패킷 §6에 개정안이 없다 | **현행 유지(CR-050 범위 밖)** — 문구 변경은 관리자 보고로 처리. 두 토글 설명이 모드별 동작을 설명한다 |
| 공용 훅 이름·`playSound` 실패 알림 형태 | overlay 설계 CR-050 확정본(`src/overlay/design/functions.md` §5.7)과 대조 완료 | **확정** — `useElapsedText(...): string` + `isTimerBlinking(snapshot)`, `playSound(url, volume0to1, onFail?) => stop`(던지지 않음, `onFail` 최대 1회). 사용법은 §14 머리·§14.7.3·§14.7.4 한 형태 |
| 꺼진 타이머 모드가 `paused`일 때 시작 시간 입력 | 잠금 식(패킷 §3, `isDurationLocked`)은 **타이머 켜짐**일 때만 잠그므로, 타이머를 끈 상태(일시정지 유지)에서는 시간 칸을 바꿀 수 있다 — 설계 변경 없음(관리자 결정). 다시 켜서 재개할 때 남은 시간이 옛 회차 값인지 새 `countdownSecs`인지는 **core 소관** | 확인 필요(core) — 화면은 `timer://changed` 표시만 따른다 |
| 잔여 M-50a ④ — 미리 듣기 음량 경합 | 미리 듣기 누름이 음량 슬라이더 blur 저장 응답과 `settings://changed` 도착 사이 짧은 창에 들어가면 옛 음량으로 재생될 수 있다(`volumeDraft.shown`이 그 사이 저장값으로 돌아가 있을 수 있음) | **수용** — 설계 변경 없음, 수동 관찰 메모 |

### 14.16 CR-052 델타 — 설명문 삭제·시작 시간 비활성·탭 다듬기 (확정 2026-09-26)

근거: 확정사항 CR-048 블록 「수정 (CR-052)」 🔒. 이 절이 §14.2·§14.4·§14.6·§14.15의 해당 서술을 대체한다.

| 항목 | 결정 | 소스 |
|---|---|---|
| 카드 1 설명문 | `timerCardDesc` 키 삭제(ko·ja·en·types). 같은 문장은 스톱워치 토글 설명 `timerStopwatchDesc` 한 곳뿐 — §14.15 「timerCardDesc 문구 확인 필요」 해소 | `TimerTab.tsx`, `i18n/*.ts` |
| 알림음 카드 설명 | `alarmCardDesc` = 반복 재생 기준 문구(overlay CR-052와 일치) | `i18n/*.ts` |
| `CountdownTimeInput.inactive` | `inactive?: boolean`(기본 false). TimerTab이 `!countdownOn`(스톱워치 모드·둘 다 꺼짐) 전달. `off = locked ∥ inactive` → 세 칸 `disabled`·`aria-disabled`, `role=group`에 `aria-disabled`, 행 `.durationOff`(라벨·콜론 muted, 상자 `--st-page` 배경·opacity 0.6). 안내 줄: locked → `timerDurationLocked`, inactive → 빈 값. `off`가 참이 되면 입력 중 값·되돌림 안내 버림, `commit` 첫 줄 가드도 `off` | `CountdownTimeInput.tsx` |
| 파생 상태 | `durationInactive`(= `!countdownOn`, 저장값 기준, 초기값 = 저장된 설정에서 계산) — TimerTab 렌더 파생, 소유 TimerTab | `TimerTab.tsx` |
| 간격 | 탭 카드 간격 `--st-gap-md`(12px — 일반·마우스 탭과 같음). 카드 안 묶음 구분 `.group` = 위 여백 8px + 위 패딩 12px + 1px `--st-border` 구분선: 카드 1(모드 토글 ∣ 시작 시간·조작), 카드 2(등록·미리 듣기·기본값 ∣ 음량) | `TimerTab.module.css` |
| 시작 시간 행 | 라벨 `.durationLabel` 72px·600(일반 탭 `.field label`과 같음) + 시·분·초 한 상자 `.hms`(높이 36px·radius 8px, 칸 30px 테두리 없음, 콜론 구분, 15px 600 `tabular-nums`, `:focus-within` 포인트 테두리, `aria-invalid` 칸이 있으면 상자 `--st-danger` 테두리) + 힌트. 안내 줄 `.durationMsg` = 84px 들여쓰기·최소 높이 18px(빈 줄에도 흔들림 없음) | `TimerTab.module.css`, `CountdownTimeInput.tsx` |
| 버튼·값 | `.btn` min-width 88px·hover `--st-nav-hover`, 버튼 줄 wrap. 슬라이더 값 `<output>`에 `.value`(56px·오른쪽 정렬·`tabular-nums`) — 회전·크기·색·음량 | `TimerTab.tsx`, `AlarmSoundCard.tsx` |
| 미리 듣기 | 변경 없음 — `playSound(url, v, onFail)` 1회 재생(`loop` 생략) | `AlarmSoundCard.tsx` |

새 필드·버튼·기능 없음(요구 범위 준수). 관련 R-43·R-44·R-50·R-53·R-55.
