# overlay 상세 설계 — §5 기능 명세

> `src/overlay/design.md`에서 분할(40KB 기준, ui-design-strategy §1.2). 절 번호는 주 문서와 같다. 상태(§4)·파이프라인(P-n, §6)·계약(§7)·레이어/모션(§10)·RTM은 주 문서 `src/overlay/design.md`, 컴포넌트(§3)는 `design/components.md`, 접근성(§9)은 `design/a11y.md`. 계약 인용 기준은 `doc/200_설계/bridge/contract.md` 현행 v0.27(본문의 옛 버전 표기는 처음 인용된 시점의 버전). CR-062(R-40)는 계약 변경이 없다.

## 5. 기능 명세

### 5.1 화면 (`src/overlay/index.tsx`)

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `clampScale` | `(v: number) => number` | `min(SCALE_MAX, max(SCALE_MIN, v))` | 없음 | R-03, R-04 |
| `reducer` | `(state: MachineState, input: MachineInput) => MachineState` | `reduce(state, input, configRef.current)` | 없음 | R-05, R-07 |
| `onWheel` | `(e: WheelEvent<HTMLDivElement>) => void` | ① `e.ctrlKey` 아니면 즉시 반환(기본 스크롤 유지) ② `e.preventDefault()` **시도(효력 보장 안 됨)** — React `onWheel`은 passive 리스너로 등록돼 무시될 수 있다. 페이지 확대가 일어나지 않는 것은 Tauri 기본 `zoomHotkeysEnabled = false` 덕이며, 결과 판정은 수동 MC-06(TC-088) ③ `next = clampScale(Number((settings.scale + (e.deltaY < 0 ? 0.05 : -0.05)).toFixed(2)))` ④ `next === settings.scale`면 반환 ⑤ `updated = {...settings, scale: next}` → `setLocalSettings(updated)` → `setSettings(updated)` 호출. `set_settings`는 창 위치를 적용하지 않는다(contract v0.6 §5.3 위치 불간섭) — `updated.overlay.x/y`가 낡아도 창은 움직이지 않는다 | `setSettings` 실패는 무시(`.catch(() => undefined)`), 로컬 값은 유지 | R-04 |
| `preventContextMenu` (CR-062 신규, `index.tsx` **모듈 수준** 상수 — export 없음, 컴포넌트 밖이라 렌더마다 새로 만들지 않는다) | `const preventContextMenu = (e: MouseEvent<HTMLDivElement>) => e.preventDefault()` — 반환 `void`. `MouseEvent`는 react의 타입(`import { …, type MouseEvent, type WheelEvent } from 'react'` — 기존 `type WheelEvent` import 줄에 추가, DOM 전역 `MouseEvent`가 아님) | **붙이는 곳: 오버레이 루트 `.root` 한 곳뿐**(= 창 전체 100vw×100vh, 주 문서 §2) — JSX `<div className={styles.root} data-tauri-drag-region onWheel={onWheel} onContextMenu={preventContextMenu}>`. `.canvas`·레이어·`<img>`에는 붙이지 않는다(`.canvas`는 `pointer-events: none`이라 이미지 위 오른쪽 클릭도 `.root`가 받는다). 입력 = 창 안 어디서든 일어나는 DOM `contextmenu` 이벤트, 출력 = `e.preventDefault()` **하나뿐** → WebView2 기본 메뉴(뒤로·새로 고침·다른 이름으로 저장·인쇄·검사)가 뜨지 않는다(R-40 🔒 U-5). React `onContextMenu`는 passive가 아니라 `onWheel` ②와 달리 효력이 보장된다. **부작용 없음**: 상태·ref 변경 없음, `dispatch`·bridge 호출 없음, `e.stopPropagation()` 호출 없음, `positionLock`·전체 화면 여부를 읽지 않음. **다른 동작에 영향 없음**: `contextmenu`는 오른쪽 뗌 뒤에 오는 별도 이벤트라 좌클릭 끌기(`data-tauri-drag-region`, P-7)·`onWheel`(Ctrl+휠, P-5)·전역 훅 입력(`input://mouse-button` 오른쪽 누름·뗌 → 클릭 파츠 `mouse_right` 교체 R-09, 펜 모드 클릭 R-26 — 창 이벤트와 무관, P-4)은 그대로다. 트레이와 같은 메뉴의 표시·판정(창 사각형·누름/뗌·숨김·전체 화면)은 core가 하며 ui는 그 메뉴를 모르고 그리지 않는다(주 문서 §10.16). 위치 잠금 중에는 창이 클릭 통과라 이 핸들러가 불리지 않는다 — 정상(주 문서 §10.9.1 L-8). **잔여 위험 — 수용(관리자 판단 2026-09-29, 사용자 보고 예정)**: 앱 시작 직후 `src/main.tsx`가 `./overlay`를 Suspense로 지연 로딩하는 동안(`OverlayApp` 마운트 전 짧은 구간)에는 `.root`가 없어 WebView2 기본 메뉴가 억제되지 않는다(주 문서 §10.16 16.3) | 없음(예외를 던지지 않음) | R-40 |
| 표시 배율 계산 | JSX 안 식 | `fit = canvas ? min(450/canvas.width, 350/canvas.height) : 1`, `scale = fit × settings.scale` → `.canvas` style `{ width: canvas.width, height: canvas.height, transform: scale(scale) }`. **식 변경 금지**(CR-012): core `overlay_display_size`와 같은 식이라 바꾸면 창 크기와 어긋난다(주 문서 §10.5). 창 리사이즈 자체는 contract v0.6 §5.2 부수 효과(core)이며 ui는 호출하지 않는다 | 없음 | R-03 |
| tick 효과 | `useEffect(() => setInterval(..., TICK_MS), [])` | 100ms마다 `dispatch({type:'tick', now: Date.now()})`, 언마운트 시 `clearInterval` | 없음 | R-05 |
| 마우스 이동 핸들러 (CR-009) | `useBridgeEvent(onMouseMove, (p: MouseMoveEvent) => void)` | ① 기존대로 `dispatch({type:'mouseMove', ...})` ② `setArmAtRest(false)`(이미 `false`면 React가 무시) | 없음 | R-11, R-15, R-18 |
| 쉬는중 진입 효과 (CR-009) | `useEffect(() => { if (machine.layer === 'rest') setArmAtRest(true) }, [machine.layer])` | 상태 레이어가 `rest`로 바뀐 순간 `armAtRest = true`. 키 입력·클릭으로 `idle`에 돌아와도 `armAtRest`는 그대로(**다음 마우스 이동 때만** `false`) | 없음 | R-11, R-15 |
| 기준점 효과 (CR-008, contract v0.6 §3.6) | `useEffect(() => { ... }, [])` — `useBridgeEvent`를 쓰지 않는다(구독 완료 시점을 알아야 하므로) | 래퍼 형태: `onHandAnchorChanged`는 기존 이벤트 래퍼와 같은 `Subscriber<T>`(`src/bridge/events.ts`: `type Subscriber<T> = (cb: (payload: T) => void) => Promise<UnlistenFn>`)를 따른다 — `onHandAnchorChanged: Subscriber<HandAnchorEvent>`. 순서는 계약 §3.6 「구독 먼저 → 조회」: ① 지역 변수 `eventSeen = false`, `cancelled = false`, `unlisten?: UnlistenFn` ② `onHandAnchorChanged((e: HandAnchorEvent) => { eventSeen = true; setAnchor(e.anchor) })`(받은 값으로 교체, `null` 포함) ③ 그 Promise가 resolve되면 `unlisten` 보관(이미 `cancelled`면 즉시 `unlisten()`) 후 `getHandAnchor()` 호출 ④ 결과 `p: Point \| null`은 `!cancelled && !eventSeen`일 때만 `setAnchor(p)`(조회 응답보다 이벤트가 새 값이다) ⑤ cleanup: `cancelled = true`, `unlisten?.()` | 구독 실패(reject) → 그래도 `getHandAnchor()`를 1회 호출해 초깃값만 받는다(이후 변경은 못 받음). 이 경로에서도 결과 `p`는 **`!cancelled`일 때만** `setAnchor(p)`(언마운트 뒤 상태 갱신 금지. 구독이 없으므로 `eventSeen`은 항상 `false`). 조회 실패(`STATE_POISONED` 등) → 무시, `anchor` 유지. 문구 없음 | R-21 |
| 키보드 핸들러 (CR-021 갱신, CR-023 갱신) | `useBridgeEvent(onKeyboard, (p: KeyboardInputEvent) => void)` | `dispatch({ type: 'key', pressed: p.pressed, heldCount: p.heldCount, special: isSpecialKey(p.special) ? p.special : null, repeat: p.repeat === true, ts: p.ts })`. `repeat`(CR-023, R-24)은 bridge 값을 그대로 넘긴다 — 필드가 없거나 `true`가 아니면 `false`. `repeat`도 보관·누적·출력하지 않는다. `special`은 **분류값만** 넘긴다 — 핸들러·`OverlayApp`은 이 값을 따로 보관·누적·`console` 출력·bridge 전송하지 않는다(R-22 기록 금지, 주 문서 §10.6). bridge 개정 전(`special` 필드 없음 = `undefined`)에도 `isSpecialKey`가 `false`라 `null`로 동작한다 | 없음 | R-05, R-07, R-22 |
| `jellyClass` (CR-022 신규, **CR-023 인자 변경**, `index.tsx` 모듈 함수 — export 없음) | `(motion: WrapMotion) => string` (CR-022의 `(phase: BouncePhase)`를 대체 — `WrapMotion`은 `BouncePhase`에 `'shiver'`를 더한 타입, §5.2) | 젤리 래퍼 `<div>`의 `className`. `null` → `styles.jellyWrap`, `0` → `` `${styles.jellyWrap} ${styles.jelly}` ``, `1` → `` `${styles.jellyWrap} ${styles.jellyAlt}` ``, `'shiver'` → `` `${styles.jellyWrap} ${styles.shiver}` ``(`styles` = `./overlay.module.css`). 반환값에는 `.jelly`·`.jellyAlt`·`.shiver` 중 **많아야 하나**만 들어간다(동시 부착 금지 — 주 문서 §10.3). JSX: `.canvas` 안 `<BackgroundLayer/>` 바로 뒤에 `<div className={jellyClass(wrapMotion(machine))}>{MouseArm 조건부 렌더}<LayerStack .../></div>`(CR-023: `bouncePhase(machine)` → `wrapMotion(machine)`). 이 `<div>`는 조건 없이 늘 렌더하고 `key`를 주지 않는다 — 클래스만 바뀌어야 `animation-name` 변경으로 재생된다(주 문서 §10.3). 예: `kbDown` false → `'jellyWrap'` / 마운트 뒤 첫 누름(`bounceSeq` 1) → `'jellyWrap jellyAlt'` / 다음 재생 → `'jellyWrap jelly'` / 자동 반복 중 → `'jellyWrap shiver'` | 없음 | R-07, R-16, R-22, R-23, R-24 |
| `jellyClass` (**CR-051 인자 추가** — 위 행의 시그니처·JSX를 대체) | `(motion: WrapMotion, base: string = styles.jellyWrap) => string` | 위 행과 같은 규칙에서 `styles.jellyWrap` 자리를 `base`로. 렌더에서 `const motion = wrapMotion(machine)`을 1회 계산해 `.canvas` 첫 자식 `<div className={jellyClass(motion, styles.hairWrap)}><HairLayer/></div>`(`hasHair = useMemo(() => findEntry(manifest,'hair') !== undefined, [manifest])`일 때만)와 본체 `<div className={jellyClass(motion)}>`에 같이 넘긴다 → 같은 커밋에서 두 래퍼 클래스가 함께 바뀌어 젤리·부르르가 동기로 시작. 예: 첫 누름 → `'hairWrap jellyAlt'`·`'jellyWrap jellyAlt'` | 없음 | R-23, R-24, R-30 |
| 모니터 목록 로드 (CR-017) | 기존 마운트 효과(`useEffect(() => { ... }, [])`, `getSettings`·`getAssetManifest`와 같은 자리) 안의 `getMonitors().then(setMonitors).catch(() => undefined)` | 앱 시작 때 **1회** 호출해 `monitors`(주 문서 §4)를 교체한다. 옛 `getScreenBounds().then(setBounds)`를 이 호출로 바꾼다. 실행 중 재조회 없음 — 모니터 구성 변경 알림 event는 현재 계약에 없다(미확정, core 권고에 따름). 구성이 바뀌어도 `pickMonitor`의 「가장 가까운 모니터」 규칙으로 목표점은 계속 계산된다(재시작하면 새 목록) | 실패 → `monitors = []` 유지 → 마우스 파츠 미표시(P-1). 문구 없음 | R-20 |

`armAtRest` 규칙 요약: 시작 `true` → 마우스 이동 `false` → `machine.layer`가 `rest`가 되면 `true` → 다음 마우스 이동 `false`. 마우스 버튼·키 입력은 바꾸지 않는다(버튼 누름 시 클릭 이미지는 쉬는 위치 그대로 교체된다).

### 5.2 상태기계 (`src/state/inputMachine.ts` — 인용)

| function | 시그니처 | 동작 요약 | 요구ID |
|---|---|---|---|
| `createInitialState` | `(now: number) => MachineState` | 주 문서 §4 초기값 | R-05 |
| `reduce` | `(state, input: MachineInput, config?: MachineConfig) => MachineState` | `key`: `heldCount` 갱신, `kbDown = heldCount > 0`, 누름마다 `kbFrame = (kbFrame+1) % kbFrames`. 상태 레이어는 동시 키 수와 무관하게 `idle`(`rest`였으면 `idle`로, 아래 공통 규칙). `mouseMove`: 좌표 갱신. `mouseButton`: 누르는 동안 `button`, 떼면 `'none'`(CR-027 이후에도 이 `mouse.button` 규칙은 그대로 — 펜 모드 클릭 누름 규칙은 아래 `mouseButton` 펜 모드 행이 **더한다**). 모든 입력은 `lastInputAt = ts`, `rest`면 `idle`로. `tick`(`onTick`): `layer === 'idle'`이고 `now − lastInputAt ≥ idleMs`이면 `rest`, 아니면 상태 그대로(같은 참조 반환). 키를 누른 채 5분 무입력이면(동시 키 수와 무관) 상태는 `rest`, 키보드 파츠는 누름 유지(`kbDown`은 뗌 이벤트로만 해제) — as-built 규칙 유지. **삭제(CR-019)**: `layer='slam'` 판정(`heldCount ≥ slam.keys`), `slamUntil` 계산·만료, `tick`의 「쾅 유지 중 유휴 판정 안 함」·「`now ≥ slamUntil`이면 `idle`」 규칙, `MachineConfig.slam`·`DEFAULT_CONFIG.slam` | R-05, R-07, R-09 |
| `reduce` — `key`의 특수 키 추적 (CR-021 추가) | 입력 `{ type: 'key'; pressed: boolean; heldCount: number; special: SpecialKey \| null; ts: number }`(`MachineInput` `key` 변형에 `special` 필드 추가) | 위 `key` 규칙에 더해 `specialHeld`(눌려 있는 특수 키, 누른 순서 — 마지막 = 가장 최근)를 갱신한다. 새 목록은 매번 새 배열(불변). ① `special === null` → `specialHeld` 그대로 ② `special !== null && pressed` → `special`을 목록에서 빼고 **맨 뒤에 추가**(자동 반복 누름이 와도 중복 없음, 이미 맨 뒤였어도 결과 동일) ③ `special !== null && !pressed` → 목록에서 `special`만 뺀다(없으면 그대로) ④ ①~③ 뒤 `max(0, heldCount) === 0`이면 `specialHeld = []`(모든 키가 떼졌으면 비움 — 뗌 이벤트 누락 방어). `kbFrame` 순환은 특수 키 여부와 무관하게 누름마다 기존대로. `mouseMove`·`mouseButton`·`tick`은 `specialHeld`를 바꾸지 않는다 | R-22 |
| `reduce` — `key`의 바운스 재생 카운터 (CR-021 추가 결정 🔒 2026-09-24) | 같은 입력. 상태 `MachineState.bounceSeq: number`(초기 `0`) | `pressed`이고 **반복 누름이 아닐 때**(CR-023 — 반복 누름은 판정하지 않음) **바운스 시작 조건**이면 `bounceSeq + 1`, 아니면 그대로. 시작 조건 = ⓐ `!isPressing(state) && max(0, heldCount) > 0`(모든 키**와 펜 모드 클릭 버튼**이 떼진 상태에서 첫 누름 — 기존 R-07·R-16 트리거. **CR-027**: 옛 식 `!state.kbDown`을 `!isPressing(state)`로 바꾼다 — 펜 모드에서 클릭 버튼을 누른 채 일반 키를 누르면 「두 번째 누름」이라 재생하지 않는다. 펜 모드가 아니면 `clickHeld`가 늘 `[]`라 옛 식과 같은 결과) **또는** ⓑ `special !== null && !state.specialHeld.includes(special)`(특수 키가 **새로** 눌림 — 다른 키를 누르고 있어도). 이미 `specialHeld`에 있는 같은 특수 키의 누름(자동 반복)·`kbDown` 중 일반 키 누름·뗌·`mouseMove`·`mouseButton`·`tick`은 바꾸지 않는다. ⓐⓑ가 동시에 참이어도 +1 한 번. 판정은 **갱신 전** `state.kbDown`·`state.specialHeld` 기준 | R-07, R-16, R-22 |
| `reduce` — `key`의 자동 반복 (CR-023, R-24) | 입력 `MachineInput` `key` 변형에 `repeat?: boolean` 추가(없으면 `false` — 기존 테스트·bridge 개정 전 호환) | **반복 누름** = `repeat === true && pressed === true`. 반복 누름이면 위 규칙 대신 아래만 적용한다: `heldCount`·`kbDown`은 받은 값대로 갱신(보통 불변), **`kbFrame` 그대로**(순환 안 함), **`specialHeld` 그대로**(위 ②의 「맨 뒤로 이동」 적용 안 함, ④ `heldCount = 0` 비움은 적용), **`bounceSeq` 그대로**(위 ⓐⓑ 판정 안 함 — 젤리 재시작 없음), `repeating = max(0, heldCount) > 0`, `lastRepeatAt = ts`, `shiverSeq = bounceSeq`(이 재생 번호의 젤리는 부르르로 대체됐다는 표시), 공통 규칙(`lastInputAt = ts`, `rest`면 `idle`)은 적용. **반복 누름이 아닌 모든 `key`**(처음 누름·뗌, `repeat`가 `pressed: false`와 함께 와도 반복 아님으로 취급) → 기존 규칙 그대로 + `repeating = false`(`lastRepeatAt`·`shiverSeq`는 그대로). 근거: Windows는 새 키를 누르면 이전 키의 반복을 멈추고, 반복하던 키를 떼면 반복이 끝난다 — 새 키의 반복은 다음 반복 누름이 다시 켠다. `mouseMove`·`mouseButton`은 `repeating`을 바꾸지 않는다. `tick`은 아래 행 | R-24, R-07, R-22 |
| `reduce` — `tick`의 반복 끊김 방어 (CR-023, R-24) | `tick` 입력 `{ type: 'tick'; now }`(기존) | 기존 유휴 판정에 더해 `repeating && now − lastRepeatAt ≥ REPEAT_TIMEOUT_MS`(500)이면 `repeating = false`. 두 판정 모두 바뀐 것이 없으면 **같은 참조 반환**(기존 규칙 유지). 뗌 이벤트가 오지 않고 반복만 멎은 경우(훅 누락·포커스 전환 등)의 방어다. 결정 근거: Windows 반복 속도 설정 범위가 초당 약 2.5~30회(간격 약 33~400ms)라 150ms로 자르면 느린 설정에서 반복 사이마다 떨림이 끊겼다 켜진다 — 가장 느린 간격 400ms보다 긴 500ms를 쓴다. tick이 100ms라 실제 정지는 마지막 반복 뒤 500~600ms. 정상 경로(키 뗌)는 즉시 정지 | R-24 |
| `reduce` — `mouseButton`의 펜 모드 클릭 누름 (CR-027 신규, R-26) | 입력 `{ type: 'mouseButton'; button: 'left' \| 'right'; pressed: boolean; ts: number }`(기존 그대로). 설정 `config.clickPress`(아래 표, 없으면 `false`). 상태 `MachineState.clickHeld` | `reduce`의 `mouseButton` 분기를 모듈 함수 **`onMouseButton(state, button, pressed, ts, config): MachineState`**(export 없음, `onKey`와 같은 자리)로 옮긴다. 순서: ① `woke = wake(state, ts)`, `mouse = { ...state.mouse, button: pressed ? button : 'none' }`(기존 규칙 그대로 — 클릭 파츠 R-09) ② **뗌**(`!pressed`): `clickHeld = state.clickHeld`에서 `button`만 뺀 새 배열(없으면 같은 내용, `config.clickPress`와 무관하게 항상 뺀다 — 모드가 바뀌는 중에 눌린 버튼이 남지 않게). `kbFrame`·`bounceSeq`·`specialHeld`·`repeating`·`lastRepeatAt`·`shiverSeq` 그대로 ③ **누름이지만 새 클릭 누름이 아님**(`pressed && (config.clickPress !== true \|\| state.clickHeld.includes(button))`): ① 결과만 반환(`clickHeld` 그대로 — 펜 모드가 아니면 클릭은 누름 목록에 들어가지 않는다 = 기존 동작, 이미 들어 있는 같은 버튼의 중복 누름은 뗌 누락 방어로 무시) ④ **새 클릭 누름**(`pressed && config.clickPress === true && !state.clickHeld.includes(button)`): `frames = max(1, config.kbFrames)`, `kbFrame = (state.kbFrame + 1) % frames`(**키 누름과 같은 카운터**), `bounceSeq = isPressing(state) ? state.bounceSeq : state.bounceSeq + 1`(키 ⓐ와 같은 규칙 — 키·버튼이 하나도 안 눌린 상태의 첫 누름만 재생. **갱신 전** `state` 기준), `clickHeld = [...state.clickHeld, button]`. `specialHeld`·`heldCount`·`kbDown`·`repeating`·`lastRepeatAt`·`shiverSeq`는 **바꾸지 않는다** — 클릭은 특수 키가 아닌 일반 누름이고(키 ⓑ 해당 없음), 부르르 대상이 아니며(OS가 키 반복을 멈추지 않으므로 키 반복 중 클릭해도 부르르 유지), 키보드 눌림 수와 무관하다. 모든 경우 새 객체(불변), `clickHeld`는 바뀔 때 새 배열. 예(`clickPress: true`, `kbFrames` 2, 초기 상태): 왼 누름 → `clickHeld ['left']`·`kbFrame 1`·`bounceSeq 1` / 오른 누름(왼 유지) → `['left','right']`·`kbFrame 0`·`bounceSeq 1`(재생 없음) / 왼 뗌 → `['right']` / 오른 뗌 → `[]` / 다시 왼 누름 → `kbFrame 1`·`bounceSeq 2`. 예(`clickPress` 없음): 왼 누름 → `clickHeld []`·`kbFrame`·`bounceSeq` 불변, `mouse.button 'left'`(기존과 같음) | R-26, R-09, R-23, R-25 |
| `isPressing` (CR-027 신규, export) | `(state: MachineState) => boolean` | `state.kbDown \|\| state.clickHeld.length > 0`. 「지금 무언가 누르고 있는가」(키, 또는 펜 모드에서 누른 클릭 버튼). 펜 모드가 아니면 `clickHeld`가 늘 `[]`라 `kbDown`과 같다. 쓰는 곳: `startsBounce` ⓐ·`onMouseButton` ④(갱신 전 판정), `bouncePhase`·`wrapMotion` ②·`pickPenEntry` ②(렌더). **쓰지 않는 곳**: `isRepeating`(부르르는 키만 — `kbDown` 그대로), `pickKeyboardEntry`(키보드 레이어는 키만 — `kbDown` 그대로, 펜 모드에서는 어차피 `kb_up` 고정). 예: 초기 → `false` / 키 1개 → `true` / 키 없음·`clickHeld ['left']` → `true` | R-26 |
| `isRepeating` (CR-023 신규) | `(state: MachineState) => boolean` | `state.repeating && state.kbDown`. 예: 반복 누름 직후 → `true` / 뗌 뒤 → `false`. CR-027: **바꾸지 않는다**(`isPressing`이 아니라 `kbDown`) — 클릭 버튼만 눌린 동안에는 부르르가 없다 | R-24 |
| `wrapMotion` (CR-023 신규) | `(state: MachineState) => WrapMotion` | 젤리 래퍼에 걸 움직임 하나를 고른다(부르르 우선). ① `isRepeating(state)` → `'shiver'` ② `!isPressing(state)` → `null`(CR-027: 옛 `!state.kbDown`을 바꿈 — 펜 모드 클릭 버튼만 눌려 있어도 젤리 클래스를 유지한다) ③ `state.bounceSeq === state.shiverSeq` → `null`(이 번호의 젤리는 이미 부르르로 대체됨 — 부르르가 끝났을 때 같은 젤리가 **다시 재생되지 않게**) ④ 그 밖 → `bouncePhase(state)`(`0`/`1`). 예: 첫 누름(`bounceSeq` 1, `shiverSeq` −1) → `1` / 반복 시작 → `'shiver'`(`shiverSeq` 1) / 반복 키를 누른 채 일반 키 새 누름(`repeating` false, `bounceSeq` 1 = `shiverSeq`) → `null`(젤리 재생 없음) / 반복 중 특수 키 새 누름(`bounceSeq` 2) → `0`(젤리) / 모두 뗌 → `null` | R-07, R-16, R-22, R-23, R-24 |
| `bouncePhase` (CR-021 신규) | `(state: MachineState) => BouncePhase` | `isPressing(state) ? (state.bounceSeq % 2 === 0 ? 0 : 1) : null`(CR-027: 옛 조건 `state.kbDown`을 `isPressing(state)`로 바꿈 — 펜 모드가 아니면 결과 동일). 렌더가 쓰는 바운스 값 — `null` = 바운스 클래스 없음, `0`/`1` = 번갈아 쓰는 두 클래스(주 문서 §10.3). 예: `kbDown` false·`clickHeld []` → `null` / `kbDown` true, `bounceSeq` 3 → `1` / `kbDown` false·`clickHeld ['left']`·`bounceSeq` 1 → `1` | R-07, R-16, R-22, R-26 |
| `currentSpecial` (CR-021 신규) | `(state: MachineState) => SpecialKey \| null` | `specialHeld`의 마지막 원소, 비었으면 `null`. 예: `['space', 'enter']` → `'enter'`, `[]` → `null` | R-22 |
| `isSpecialKey` (CR-021 신규) | `(v: unknown) => v is SpecialKey` | `SPECIAL_KEYS.includes(v)`. 7종 외 문자열·`undefined`·`null` → `false` | R-22 |

특수 키 타입·상수(CR-021, `src/state/inputMachine.ts` export — 순수 TS, React·Tauri·DOM 의존 없음):

| 이름 | 정의 | 비고 |
|---|---|---|
| `SpecialKey` | `NonNullable<KeyboardInputEvent['special']>` = `'space' \| 'z' \| 'question' \| 'exclamation' \| 'enter' \| 'backspace' \| 'undo'`(`undo` = Ctrl+Z, 추가 결정 🔒 2026-09-24) | `import type { KeyboardInputEvent } from 'bridge/types'`(`mouseMapping.ts`와 같은 type-only import). 🔒 값 이름. 필드는 미확정 계약(bridge 인계) |
| `SPECIAL_KEYS` | `readonly SpecialKey[] = ['space', 'z', 'question', 'exclamation', 'enter', 'backspace', 'undo']` | `isSpecialKey` 판정용 |
| `MachineState.specialHeld` | `readonly SpecialKey[]`, 초기값 `[]`(`createInitialState`) | 길이 ≤ 7(중복 없음). 분류값만 — 키 코드·문자·시각·횟수 없음 |
| `MachineState.bounceSeq` | `number`, 초기값 `0` | 바운스 시작 횟수(렌더용 짝홀 신호). 어떤 키였는지 담지 않는다 — 기록 금지 위반 아님. `Number.MAX_SAFE_INTEGER`까지 증가만(짝홀만 쓰므로 넘침 무의미, 방어 없음) |
| `BouncePhase` | `0 \| 1 \| null` | `bouncePhase` 반환 타입 |
| `WrapMotion` (CR-023) | `BouncePhase \| 'shiver'` | `wrapMotion` 반환 타입, `jellyClass` 인자 |
| `MachineState.repeating` (CR-023) | `boolean`, 초기값 `false` | 지금 자동 반복 누름이 이어지는 중인가. 규칙은 위 `reduce` 자동 반복·`tick` 행 |
| `MachineState.lastRepeatAt` (CR-023) | `number`, 초기값 `0` | 마지막 반복 누름의 `ts`. `tick` 끊김 방어에만 쓴다. `lastInputAt`과 따로 둔다 — 마우스 이동이 `lastInputAt`을 계속 갱신해 방어가 영영 안 걸리는 것을 막는다. 어떤 키였는지 담지 않는다 |
| `MachineState.shiverSeq` (CR-023) | `number`, 초기값 `-1` | 부르르가 시작될 때의 `bounceSeq`. `wrapMotion` ③에만 쓴다. 키 정보 없음 |
| `REPEAT_TIMEOUT_MS` (CR-023) | `500` (export 상수, 설정값 아님) | `tick` 반복 끊김 방어 기준. 사용자 설정이 아니라 OS 반복 간격 상한에서 정한 상수라 `MachineConfig`에 넣지 않는다(`STRETCH_MIN/MAX`와 같은 취급) |
| `ClickButton` (CR-027, export 타입) | `Exclude<MouseButtonState, 'none'>` = `'left' \| 'right'` | `clickHeld` 원소 타입. `MachineInput` `mouseButton`의 `button`과 같은 값 |
| `MachineState.clickHeld` (CR-027) | `readonly ClickButton[]`, 초기값 `[]`(`createInitialState`) | 펜 모드(`config.clickPress`)에서 **지금 눌려 있는** 클릭 버튼(누른 순서, 중복 없음, 길이 ≤ 2). 누름은 펜 모드일 때만 추가, 뗌은 항상 제거(`onMouseButton` ②④). `mouseMove`·`key`·`tick`은 바꾸지 않는다. 기존 `mouse.button`(클릭 파츠용, 마지막 이벤트 기준)과 별개 — `mouse.button`은 왼을 누른 채 오른을 눌렀다 떼면 `'none'`이 되는 as-built 규칙이라 「아직 눌린 버튼이 있는가」 판정에 쓸 수 없다 |
| `MachineConfig.clickPress` (CR-027) | `clickPress?: boolean`(선택 필드 — 없으면 `false`). `DEFAULT_MACHINE_CONFIG` = `{ idleMs: 300_000, kbFrames: 1, clickPress: false }` | `true`면 클릭 누름을 키 누름처럼 센다(`onMouseButton` ④). `OverlayApp`이 `isPenMode(manifest)`로 채운다(주 문서 §4 `config`). 상태기계는 「펜」을 모른다 — 규칙 스위치 하나만 받는다(설정값 주입 원칙, ui-design-strategy §6.2). 선택 필드라 기존 스펙의 `{ idleMs, kbFrames }` 픽스처가 그대로 컴파일된다 |

기록 금지(R-22): `specialHeld`는 **지금 눌려 있는** 특수 키의 분류값만 담고, 떼면 빠지며, 모든 키가 떼지면 비워진다. 누른 순서의 이력·횟수·시각을 따로 남기지 않는다. 상태기계는 `console`·저장소·bridge를 부르지 않는다(순수 함수). 테스트도 입력 순서를 파일로 남기지 않는다. CR-023의 `repeating`·`lastRepeatAt`·`shiverSeq`도 어떤 키였는지 담지 않는다(반복 여부·마지막 반복 시각·재생 번호뿐, 새 반복·뗌마다 덮어씀). CR-027의 `clickHeld`는 지금 눌린 마우스 버튼(`left`/`right`)뿐이며 떼면 빠진다 — 키보드 정보가 아니고 이력·횟수·시각을 남기지 않는다.

### 5.3 레이어 (`src/overlay/components/LayerStack.tsx`)

| function | 시그니처 | 동작 | 요구ID |
|---|---|---|---|
| `findEntry` | `(manifest: AssetManifest, slot: AssetSlot) => AssetEntry \| undefined` | `slotKey` 일치 항목 | R-17, R-19 |
| `kbDownFrameCount` | `(manifest: AssetManifest) => number` | `max(1, kb_down 항목 수)` | R-07 |
| `BackgroundLayer` 렌더 (CR-014, `src/overlay/components/BackgroundLayer.tsx`) | `({ manifest }: { manifest: AssetManifest }) => JSX.Element \| null`, `export default memo(BackgroundLayer)` | `bg = findEntry(manifest, 'background')`(`LayerStack.tsx`의 기존 named export `findEntry` import). `bg`가 없으면 `null`. 있으면 `<img className={styles.layer} src={bg.url} alt="" draggable={false} />`(`styles` = `../overlay.module.css`, 기존 `.layer` = 캔버스 전체 `left:0 top:0 100%`). `.bounce`·인라인 `transform` 없음. `memo`라 `manifest` 참조가 바뀔 때(P-1, P-6 `assets://changed`)만 다시 그린다 — 입력·tick·`machine` 변화로는 재렌더되지 않는다. 슬롯 `'background'`는 contract v0.6 §3.1(캔버스 레이어·선택 슬롯). 선행: `src/bridge/types.ts` `AssetSlot`에 `'background'`(bridge-implementer, core `assets.md` §9.4 UI-B5) — 없으면 타입 오류 | R-17 |
| `HairLayer` 렌더 (CR-037 신규, `src/overlay/components/HairLayer.tsx`) | `({ manifest }: { manifest: AssetManifest }) => JSX.Element \| null`, `export default memo(HairLayer)` | `hair = findEntry(manifest, 'hair')`(`LayerStack.tsx` named export `findEntry` import). `hair`가 없으면 `null`(투명·정상 — 안내·오류 없음). 있으면 `<img className={styles.layer} src={hair.url} alt="" draggable={false} />`(`styles` = `../overlay.module.css` 기존 `.layer` — 새 CSS 클래스 없음). 인라인 `style`·`transform`·애니메이션 클래스 없음. 호출 위치 = `OverlayApp` JSX `.jellyWrap`의 첫 자식(`MouseArm` 앞, `design/components.md` §3 규칙 7). `memo`라 `manifest` 참조가 바뀔 때(P-1 초기 로드, P-6 `assets://changed`)만 다시 그린다 — 입력·tick·`machine` 변화로는 재렌더되지 않는다(젤리·부르르는 부모 `.jellyWrap` 클래스 교체라 이 컴포넌트 재렌더와 무관). 1장 고정: 상태·키 입력·펜 모드·위치 잠금과 무관하게 같은 그림. 선행: `src/bridge/types.ts` `AssetSlot`에 `'hair'`(contract v0.17, bridge-implementer) — 없으면 타입 오류(구현 금지) | R-30 |
| `HairLayer` 자리 (CR-051) | — | 컴포넌트 자체는 불변(`img` 또는 `null`). 부르는 자리만 `.jellyWrap` 첫 자식 → `.canvas` 첫 자식 `.hairWrap` 안으로(위 `jellyClass` CR-051 행). 겹침 아래→위 = 헤어 → 배경 → 뽀모도 → `.jellyWrap`(팔 → 본체 → 펜 손) | R-30 |
| `SPECIAL_KEY_SLOT` (CR-021 신규, `LayerStack.tsx` named export 상수) | `Readonly<Record<SpecialKey, AssetSlot>>` = `{ space: 'key_space', z: 'key_z', question: 'key_question', exclamation: 'key_exclamation', enter: 'key_enter', backspace: 'key_backspace', undo: 'key_undo' }` | 분류값 → 선택 슬롯(🔒 슬롯 이름, `key_undo` = 「뒤로가기」 그림). `AssetSlot`에 7값이 추가돼야 타입이 맞는다(미확정 계약, bridge 인계) | R-22 |
| `pickKeyboardEntry` (CR-021 신규, `LayerStack.tsx` named export) | `(manifest: AssetManifest, machine: MachineState) => AssetEntry \| undefined` | ① `!machine.kbDown` → `findEntry(manifest, 'kb_up')` ② `s = currentSpecial(machine)`. `s !== null`이고 `e = findEntry(manifest, SPECIAL_KEY_SLOT[s])`가 있으면 `e` ③ 아니면 기존 누름 식 `kb_down[kbFrame] ?? kb_down[0]`(특수 키 그림이 없으면 일반 누름 프레임 순환 그대로). 예(`key_space`만 등록): 스페이스 누름 → `key_space` / 스페이스를 누른 채 `a` 누름 → `key_space` 유지 / 스페이스 뗌(`a` 눌림) → `kb_down[kbFrame]` / `a`도 뗌 → `kb_up` / `z` 누름 → `key_z` 없음 → `kb_down[kbFrame]` | R-07, R-22 |
| `findByKey` (CR-025 신규, `LayerStack.tsx` named export) | `(manifest: AssetManifest, key: string) => AssetEntry \| undefined` | `manifest.entries.find(e => slotKey(e.slot) === key)`. 펜 슬롯은 TS 표현이 bridge 결정이라(`requirements.md` §3) **파일명 키 문자열**로 찾는다 — `slotKey`가 `pen_up`·`pen_down_{n}`·`pen_key_{special}`을 돌려주기만 하면 표현과 무관하게 동작 | R-25 |
| `isPenMode` (CR-025 신규, `LayerStack.tsx` named export) | `(manifest: AssetManifest) => boolean` | `findByKey(manifest, 'pen_up') !== undefined`. **펜 모드 = `pen_up` 등록**(🔒). `pen_down_*`·`pen_key_*`만 있고 `pen_up`이 없으면 펜 모드가 아니다(그 그림들은 쓰지 않는다) | R-25 |
| `penDownFrameCount` (CR-025 신규, `LayerStack.tsx` named export) | `(manifest: AssetManifest) => number` | `max(1, slotKey가 /^pen_down_\d+$/인 항목 수)`. `OverlayApp`의 `config.kbFrames` = `isPenMode(manifest) ? penDownFrameCount(manifest) : kbDownFrameCount(manifest)`(주 문서 §4 `config`) — 펜 모드에서는 `kbFrame`이 펜 누름 그림 수로 순환한다(`kb_down`은 보이지 않으므로) | R-25 |
| `LayerStack` 렌더 | — | body = `findEntry('body')`; state = `findEntry(machine.layer)`; kb = **`isPenMode(manifest) ? findEntry(manifest, 'kb_up') : pickKeyboardEntry(manifest, machine)`**(CR-025 — 펜 모드에서는 키보드 레이어를 `kb_up`에 고정, `kbDown`·특수 키와 무관. `pickKeyboardEntry` 자체는 바꾸지 않는다); 펜 모드가 아닐 때 kb = `pickKeyboardEntry(manifest, machine)`(CR-021 — 옛 인라인 식 `machine.kbDown ? (kb_down[kbFrame] ?? kb_down[0]) : kb_up`을 이 함수로 옮김, 특수 키 분기 추가). 특수 키 그림도 **같은 키보드 `<Layer>` 요소**에 그린다(별도 요소·별도 z 없음). 같은 `<img>` 요소를 유지한다(`key` 변경·조건부 요소 금지). 순서 `<Layer body/>` `<Layer state/>` `<Layer kb/>`. **바운스 없음(CR-022)**: 어느 `Layer`에도 `bounce`를 넘기지 않고 `Layer`의 클래스는 항상 `styles.layer`다 — 바운스(젤리)는 `LayerStack`을 감싼 `.jellyWrap`이 받는다(§5.1 `jellyClass`). 옛 `bounce={bouncePhase(machine)}`(CR-021)·`bounce={kbDown}`·`bounce={layer==='slam'}`(CR-019) 모두 삭제. `body`가 없으면 몸통 `Layer`는 `null` — 투명이며 정상(R-19, 안내·오류 없음). 디폴트 상태 그림은 `kb_up` | R-07, R-19, R-22 |

**CR-033 개정(R-29, 주 문서 §10.10) — 위 표의 `isPenMode`·`penDownFrameCount` 비고·`LayerStack` 렌더 행을 다음으로 대체한다:**

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `isPenMode` (CR-033 개정, `LayerStack.tsx` named export) | `(manifest: AssetManifest, mouse: MouseSettings \| null) => boolean` | `findByKey(manifest, 'pen_up') !== undefined && mouse?.penMode === true`. 예: `pen_up` 있음 + `penMode true` → true / `pen_up` 있음 + `false` → false / `pen_up` 있음 + `mouse null` → false / `penMode true`인데 `pen_up` 없음 → false | 없음 | R-25, R-29 |
| `LayerStack` 렌더 (CR-033 개정) | `({ manifest, machine, penMode }: { manifest: AssetManifest; machine: MachineState; penMode: boolean }) => JSX.Element` | kb = `penMode ? findEntry(manifest, 'kb_up') : pickKeyboardEntry(manifest, machine)`. 나머지(body·state·순서·같은 `<img>` 유지·바운스 없음)는 위 행 그대로. `isPenMode`를 내부에서 부르지 않는다 | 없음 | R-07, R-22, R-25, R-29 |
| `OverlayApp` `penMode` (CR-033 신규, `index.tsx` 렌더 지역값) | `const penMode = isPenMode(manifest, settings.mouse)` | `config`(`kbFrames`·`clickPress`, 의존성에 `penMode` 추가)·`<LayerStack penMode>`·`<PenHand penMode>`에 같은 값을 넘긴다 | 없음 | R-29 |

### 5.4 마우스 파츠 (`src/overlay/components/MouseArm.tsx`, `src/state/mouseMapping.ts`)

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| 이미지 선택 | `MouseArm` 안 | `button==='left'` → `mouse_left`, `'right'` → `mouse_right`, 그 외 `mouse_base`. 선택 이미지가 없으면 `mouse_base`. 그것도 없으면 `null` 반환(그리지 않음). 선택 결과는 매니페스트 **항목**(`AssetEntry` — `url`·`width`·`height`)이다(CR-015: 크기를 배치에 쓴다) | 없음 | R-09, R-18 |
| `resolvePivot` (CR-007 신규, CR-008 인자 변경, **CR-017 셋째 인자 변경**, `mouseMapping.ts`) | `(anchor: Point \| null, hand: Point \| null, area: Quad) => Point` | `anchor ?? hand ?? bilerpQuad(area, 0.5, 0.5)`(이동 영역 중심 = 네 꼭짓점 평균. 옛 패드 중심 대체 — R-21). `anchor`는 bridge가 준 기준점을 그대로 받는다(ui에서 재계산·보정 없음) | 없음 | R-21 |
| `pickMonitor` (CR-017 신규, `mouseMapping.ts`) | `(cursor: Point, monitors: readonly ScreenBounds[]) => ScreenBounds \| null` | ① 유효 모니터 = `width > 0 && height > 0`인 것만(목록 순서 유지). 없으면 `null` ② 포함 판정(반열린 구간): `m.x ≤ cursor.x < m.x + m.width && m.y ≤ cursor.y < m.y + m.height`인 **첫** 모니터 반환 ③ 어느 것도 포함하지 않으면 **가장 가까운** 모니터: `dx = max(m.x − x, 0, x − (m.x + m.width))`, `dy` 같은 식, 거리² `dx² + dy²`가 가장 작은 것(같으면 목록에서 앞선 것). 예: A = (0, 0, 2560, 1440) WQHD, B = (320, 1440, 1920, 1080) 아래 1080p → 커서 (1000, 2000) = B, (1000, 500) = A, (100, 2000)(두 모니터 밖) = B(거리² 220² < A 560²), (2560, 100) = A(오른쪽 끝 경계는 밖이지만 거리 0) | 비유한 좌표면 `null` | R-20 |
| `cursorUv` (CR-017 신규, `mouseMapping.ts`) | `(cursor: Point, monitor: ScreenBounds) => { u: number; v: number }` | `u = clamp01((cursor.x − monitor.x) / monitor.width)`, `v = clamp01((cursor.y − monitor.y) / monitor.height)`(`clamp01` = 기존 모듈 내부 함수). 예: B = (320, 1440, 1920, 1080), 커서 (1280, 1980) → (0.5, 0.5) | `monitor.width` 또는 `height ≤ 0`이면 `{ u: 0.5, v: 0.5 }`(`pickMonitor`가 걸러 주므로 방어용) | R-20 |
| `bilerpQuad` (CR-017 신규, `mouseMapping.ts`) | `(quad: Quad, u: number, v: number) => Point` | `u`·`v`를 [0, 1]로 고정(비유한 값은 0.5) 후 `P = (1−u)(1−v)·q[0] + u(1−v)·q[1] + u·v·q[2] + (1−u)·v·q[3]`(x·y 각각). `q` 순서 = 왼쪽 위 · 오른쪽 위 · 오른쪽 아래 · 왼쪽 아래. 반올림 없음. 예: quad = (250,560)(410,560)(410,650)(250,650) → (0,0) = (250,560), (1,1) = (410,650), (0.5,0.5) = (330,605). 자유 사각형 (0,0)(100,20)(120,120)(10,100), (0.5,0.5) → (57.5, 60) | 없음 | R-20, R-21 |
| `armTransform` (CR-017 신규, `armRotationDeg` 대체, `mouseMapping.ts`) | `(shoulder: Point, hand: Point, target: Point) => ArmTransform` | 어깨 S, 손 기준점 A, 목표 T. ① `h = A − S`, `L = hypot(h)`. 값이 비유한이거나 `L < ARM_EPS`(1e-6)면 `REST_TRANSFORM` 반환(k = 1) ② `t = T − S`, `D = hypot(t)` ③ `baseDeg = atan2(h.y, h.x)`(도, θh) ④ `targetDeg = D < ARM_EPS ? baseDeg : atan2(t.y, t.x)`(도, θt — 목표가 어깨와 겹치면 방향 유지) ⑤ `stretch = clamp(D / L, STRETCH_MIN, STRETCH_MAX)` ⑥ 각도는 소수 2자리, `stretch`는 소수 3자리로 반올림. 각도는 접지 않는다(`atan2` 범위 (−180, 180] 그대로 — CSS가 해석). 예: S (0,0)·A (100,0) → T (0,−120) = `{ baseDeg: 0, targetDeg: -90, stretch: 1.2 }`, T (300,0) = stretch 1.6(상한), T (20,0) = stretch 0.5(하한), T (0,0) = `{ 0, 0, 0.5 }` | 비유한 입력 → `REST_TRANSFORM` | R-21 |
| `armTransformCss` (CR-017 신규, `mouseMapping.ts`) | `(t: ArmTransform) => string` | `` `rotate(${t.targetDeg}deg) scaleX(${t.stretch}) rotate(${-t.baseDeg}deg)` ``. 원점(`transform-origin`)이 어깨일 때 CSS는 오른쪽 변환부터 적용하므로 ① 팔을 수평으로 눕히고(−θh) ② 팔 방향(수평)으로만 k배 늘린 뒤 ③ 목표 방향(θt)으로 세운다 → 기준점 A가 S + k·|A−S|·(cosθt, sinθt)로 가고, 팔에 수직인 두께는 그대로. `REST_TRANSFORM` → `'rotate(0deg) scaleX(1) rotate(0deg)'`(JS 템플릿에서 `-0`은 `"0"`) | 없음 | R-15, R-21 |

상수·타입(CR-017, `src/state/mouseMapping.ts` export):

| 이름 | 값/정의 | 비고 |
|---|---|---|
| `Quad` | `MouseSettings['area']` = `[Point, Point, Point, Point]`(`src/bridge/types.ts`, 미확정 계약) | 이동 영역 네 꼭짓점 |
| `ArmTransform` | `interface { baseDeg: number; targetDeg: number; stretch: number }` | θh · θt · k |
| `STRETCH_MIN` / `STRETCH_MAX` | `0.5` / `1.6` | 🔒 사용자 지정. 설정값 아님(settings에 필드 없음) |
| `ARM_EPS` | `1e-6` | 길이 0 판정 |
| `REST_TRANSFORM` | `{ baseDeg: 0, targetDeg: 0, stretch: 1 }` | 쉬는 위치(R-15·R-21) = 변형 없음 |

삭제(CR-008): `alphaCentroid`(`mouseMapping.ts`)·`useAlphaCentroid`(훅). 기준점 계산(알파>0 픽셀 중 어깨와의 거리 상위 25%의 알파 가중 평균)은 core `assets::compute_hand_anchor`가 한다(`doc/200_설계/core/assets.md` §3.2). ui는 이미지 픽셀을 읽지 않는다.

**`MouseArm` 렌더 — 한 모드**(CR-015, R-18. 모드 판별 없음)

`entry` = 이미지 선택 결과(`AssetEntry`), `part = mouse.partPos`(캔버스 좌표, 미확정 계약 — bridge가 `MouseSettings.partPos`를 추가한 뒤 구현).

(CR-025) 아래 1~5단계는 순수 함수 **`armTransformFor`**(§5.5)로 옮긴다 — `MouseArm`은 `t = armTransformFor({ mouse, monitors, cursor, anchor, atRest })`를 한 번 부르고 6단계만 렌더한다(결과·동작 변경 없음). 펜 쥔 손(`PenHand`)이 같은 함수로 같은 `t`를 얻는다.

1. `atRest === true`이면 `t = REST_TRANSFORM`(회전 0°·배율 1, 그린 그대로, R-11·R-15·R-21) — 2~5단계를 건너뛴다.
2. 아니면 `pivot = resolvePivot(anchor, mouse.hand, mouse.area)` — 클릭 이미지일 때도 같은 `pivot`. `anchor`는 bridge가 캔버스 좌표(그림 좌표 + `partPos`)로 준 값을 그대로 쓴다(ui에서 `partPos`를 더하지 않는다).
3. `mon = pickMonitor(cursor, monitors)`(CR-017). `mon === null`이면 `t = REST_TRANSFORM`, 4~5단계를 건너뛴다.
4. `{ u, v } = cursorUv(cursor, mon)` → `target = bilerpQuad(mouse.area, u, v)`(R-20).
5. `t = armTransform(mouse.shoulder, pivot, target)`(R-21).
6. `<img className={styles.hand} src={entry.url} alt="" draggable={false} style={{ left: part.x, top: part.y, width: entry.width, height: entry.height, transformOrigin: '${mouse.shoulder.x − part.x}px ${mouse.shoulder.y − part.y}px', transform: armTransformCss(t) }} />`(수치는 px). `styles.hand` = 기존 `.hand { position: absolute }`(`src/overlay/overlay.module.css`, 재사용 — `.layer`의 `width/height: 100%`를 쓰지 않는다). 쉬는 위치에서도 같은 형식의 문자열(`rotate(0deg) scaleX(1) rotate(0deg)`)을 쓴다.
   - 예(CR-017): 어깨 (620,530), 기준점 (520,530)(수평 왼쪽, L = 100), 목표 (520,410) → θh = 180, θt = atan2(−120, −100) = −129.81, k = hypot(−100,−120)/100 = 1.562 → `transform: rotate(-129.81deg) scaleX(1.562) rotate(-180deg)`.
   - 예: 어깨 (620,530), `partPos` (389,492), 그림 202×154 → `left: 389; top: 492; width: 202; height: 154; transformOrigin: '231px 38px'`.
   - 캔버스 전체 크기 그림(900×700) + `partPos` (0,0) → `left: 0; top: 0; width: 900; height: 700; transformOrigin: '620px 530px'` — 이전 레이어 이동 모드와 같은 화면.

캔버스 없음 대체 경로는 두지 않는다: `MouseArm`은 `.canvas` 안에서만 렌더되고 `.canvas`는 `manifest.canvas !== null`일 때만 렌더된다(§3 렌더 조건, `design/components.md`). CR-015 이후 `MouseArm`은 캔버스 크기를 쓰지 않는다(SVG 삭제) — 현행 소스의 `manifest.canvas ?? { width: 450, height: 350 }` 방어 식도 함께 삭제한다.

삭제(CR-015, R-18 — 손바닥 모드·팔 곡선 폐기):

| 삭제 대상 | 위치 | 비고 |
|---|---|---|
| `isMouseLayerMode` | `src/overlay/components/MouseArm.tsx`(export) | 모드 판별 없음. `OverlayApp` 렌더 조건에서도 제거(`design/components.md` §3) |
| 손바닥 모드 렌더 분기(`<svg>`·`<path>`·패드 매핑점 중심 손 `<img>`) | `MouseArm.tsx` | |
| `mapToPad`, `armControlPoint`, `armPath`, `restPosition` | `src/state/mouseMapping.ts` | 손바닥 모드 전용. 해당 vitest도 삭제 대상(ui-test-designer 판단) |
| `armWidth`·`armColor` 사용 | `MouseArm.tsx` | 계약에서 필드 삭제(미확정 계약, bridge 인계) |
| `armRotationDeg` (CR-017) | `src/state/mouseMapping.ts` | `armTransform`·`armTransformCss`로 대체(회전만 → 회전 + 늘어나기). 해당 vitest는 개정·폐기 대상(ui-test-designer 판단) |
| `mapAroundPivot` (CR-017) | `src/state/mouseMapping.ts` | 기준점 ± (가상 화면 전체 비율 − 0.5) × 패드 → `pickMonitor`·`cursorUv`·`bilerpQuad`로 대체 |
| `mouse.pad` 사용·`Rect` import (CR-017) | `mouseMapping.ts`, `MouseArm.tsx` | 계약에서 `pad` 삭제(미확정 계약, bridge 인계). `Rect` 타입 자체의 존폐는 bridge 결정 |
| `MouseArm` prop `bounds: ScreenBounds` · `OverlayApp` 상태 `bounds` · `getScreenBounds()` 호출 (CR-017) | `MouseArm.tsx`, `src/overlay/index.tsx` | prop `monitors: ScreenBounds[]`·상태 `monitors`·`getMonitors()`로 교체(`design/components.md` §3, 주 문서 §4·P-1) |
| `OverlayApp`의 두 번째 `MouseArm`(LayerStack 뒤, z4) | `src/overlay/index.tsx` | `MouseArm`은 `BackgroundLayer`와 `LayerStack` 사이 1개만 |

**`MouseArm` `.armWrap` 컨테이너**(CR-011 바운스 래퍼 → **CR-022로 애니메이션 없는 컨테이너**. CR-015 이후 모드 하나)

CR-022 이후 팔 바운스는 `MouseArm` 밖 `.jellyWrap`이 맡는다(몸과 한 덩어리 — 주 문서 §10.3). `.armWrap`은 남기되 애니메이션 클래스를 받지 않는다(DOM·좌표 변화 최소화).

1. 이미지 선택 결과가 `null`이면 래퍼도 그리지 않는다(기존대로 `null` 반환).
2. `MouseArm`의 최상위 요소는 래퍼 `<div className={styles.armWrap}>` 하나다 — 클래스는 **항상 `styles.armWrap` 하나**(CR-022: `.bounce`/`.bounceAlt` 분기 삭제). 그 안에 6단계의 손 그림 `<img>` 하나를 둔다(CR-015 — 손바닥 모드 `<svg>` 삭제).
3. 변환 합성: 젤리 `scale`은 **바깥** `.jellyWrap`의 CSS `animation`, 배치·커서 추종은 **안쪽 `<img>`**(`left/top = partPos`, 인라인 `transform: rotate(...) scaleX(...) rotate(...)`·`transformOrigin`)에 그대로 둔다. 같은 요소에 두 `transform`을 걸지 않으므로 animation이 회전·늘어나기를 덮어쓰지 않는다. 화면상 결과 = 회전·늘어난 팔이 몸과 함께 캔버스 아래 가운데 기준으로 출렁였다 복귀.
4. `.armWrap` 스타일(`src/overlay/overlay.module.css` 기존 클래스, 변경 없음): `position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none`. `.jellyWrap`(= 캔버스와 같은 크기·원점) 안에서도 같은 상자라 안쪽 `<img>`의 캔버스 좌표(`left/top = partPos`, 어깨 기준 `transform-origin`)가 바뀌지 않는다. `animation`·`transform` 선언 없음.
5. ~~prop `bounce: BouncePhase`~~ **삭제(CR-022)**. 트리거는 `OverlayApp`의 `jellyClass(wrapMotion(machine))`(§5.1, CR-023 — 자동 반복 중 부르르도 같은 래퍼라 팔이 함께 떤다)이며 재생 조건(모든 키가 떼진 상태의 첫 누름, 특수 키 새 누름 — §5.2 `bounceSeq`)은 그대로다. `atRest`·`button`과 무관하다(쉬는 위치에서도 키를 누르면 팔이 몸과 함께 출렁인다).
6. 래퍼 요소는 같은 DOM 요소로 유지한다(`key` 변경·조건부 래퍼 금지 — 기존 규칙 유지). 재생 원리(`animation-name` 교대)는 `.jellyWrap`에 옮겨졌다(주 문서 §10.3).

### 5.5 펜 쥔 손 (CR-025, R-25 — `src/overlay/components/PenHand.tsx`, `src/state/mouseMapping.ts`)

비유: 팔은 어깨 핀에 꽂힌 고무 막대이고, 손은 그 막대 끝에 **압정 하나로 꽂은 딱딱한 카드**다. 막대가 돌고 늘어나면 압정이 막대 끝을 따라 옮겨 가고 카드도 막대와 같은 각도로 기울지만, 카드 자체는 늘어나지 않는다. 키를 치면 카드 그림만 바뀐다.

**붙는 점 P 결정 = 쉬는 자세에서 `pen_up` 그림의 중심**(`penPos + (pen_up 너비/2, 높이/2)`). 근거 ① 손은 크기가 변하지 않으므로 팔 늘어남(scaleX k)이 손에 주는 영향은 「붙는 점이 얼마나 옮겨 가는가」 하나뿐이며, 이를 손 전체의 대표점으로 재야 손 전체가 고르게 따라간다 — 좌상단으로 재면 손이 모서리를 축으로 돌아 회전할 때 손 본체가 팔 끝에서 크게 벗어난다 ② 중심은 사용자가 따로 지정할 값이 없어(설정 필드 추가 없음 — 요구 밖) `penPos`와 그림 크기만으로 정해진다 ③ 손 그림은 손만 딱 맞게 그린 작은 그림이라 중심 ≈ 손 본체다. 붙는 점·회전 기준은 **`pen_up`의 크기**로 정하고, `pen_down_*`·`pen_key_*`가 크기가 달라도 같은 기준(좌상단 = 같은 `penPos`, 회전 원점 = `pen_up` 중심)을 쓴다 — 그림 교체로 손이 튀지 않게. 펜 그림끼리 같은 크기로 그리는 것을 권장(검증은 core 몫, 미확정 계약).

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `armTransformFor` (CR-025 신규, `mouseMapping.ts` export — §5.4 `MouseArm` 1~5단계를 그대로 옮김) | `(input: { mouse: MouseSettings; monitors: readonly ScreenBounds[]; cursor: Point; anchor: Point \| null; atRest: boolean }) => ArmTransform` | ① `atRest` → `REST_TRANSFORM` ② `pivot = resolvePivot(anchor, mouse.hand, mouse.area)` ③ `mon = pickMonitor(cursor, monitors)`, `null`이면 `REST_TRANSFORM` ④ `{u, v} = cursorUv(cursor, mon)`, `target = bilerpQuad(mouse.area, u, v)` ⑤ `armTransform(mouse.shoulder, pivot, target)`. `MouseArm`·`PenHand`가 같은 입력으로 부르므로 팔과 손이 같은 렌더에서 같은 변형을 쓴다 | 없음(하위 함수 규칙 그대로) | R-15, R-21, R-25 |
| `defaultPenPos` (CR-025 신규, `mouseMapping.ts` export — settings도 import) | `(mouse: MouseSettings, size: { width: number; height: number }) => Point` | **기본 위치 규칙(`penPos === null`)**: 손 그림 중심을 `c = mouse.hand ?? bilerpQuad(mouse.area, 0.5, 0.5)`(손 폴백점, 없으면 이동 영역 중심)에 둔다 → `{ x: Math.round(c.x − size.width / 2), y: Math.round(c.y − size.height / 2) }`. 근거: 이동 영역은 손끝이 가는 자리라 쉬는 자세의 팔 끝이 보통 그 안에 있고(기본 영역 (375,525)~(495,625) 안에 옛 기본 손 그림 202×154 @ (389,492)의 중심 (490,569)이 들어 있다), settings·overlay가 **같은 입력(설정 + 그림 크기)**으로 같은 값을 얻는다(bridge 손 기준점 `anchor`는 settings가 구독하지 않으므로 쓰지 않는다). 예: 기본 영역 중심 (435,575), 그림 202×154 → (334, 498) | 크기가 음수·비유한이면 0으로 본다 | R-25 |
| `resolvePenPos` (CR-025 신규, `mouseMapping.ts` export — settings도 import) | `(mouse: MouseSettings, size: { width: number; height: number }) => Point` | `mouse.penPos ?? defaultPenPos(mouse, size)` | 없음 | R-25 |
| `penTransform` (CR-025 신규, `mouseMapping.ts` export) | `(shoulder: Point, arm: ArmTransform, penPos: Point, size: { width: number; height: number }) => PenTransform` | 어깨 S, 팔 변형 (θh = `arm.baseDeg`, θt = `arm.targetDeg`, k = `arm.stretch`). ① **쉬는 자세**: `arm.stretch === 1 && arm.targetDeg === arm.baseDeg`(= 팔 변형이 항등, `REST_TRANSFORM` 포함)이면 `PEN_REST` 반환 — 손은 `penPos` 그대로·회전 0 ② 입력에 비유한 값이 있으면 `PEN_REST` ③ 붙는 점 `P = { x: penPos.x + w/2, y: penPos.y + h/2 }`(`w`,`h` = `size`, 음수는 0) ④ 팔 변형으로 옮긴 점 `P' = S + R(θt) · diag(k, 1) · R(−θh) · (P − S)`, 여기서 `R(θ)(x, y) = (x·cosθ − y·sinθ, x·sinθ + y·cosθ)`(화면 좌표 y 아래, CSS `rotate`와 같은 방향) — `armTransformCss`가 어깨 원점으로 그림에 거는 변환과 **같은 사상**이다 ⑤ `dx = P'.x − P.x`, `dy = P'.y − P.y` ⑥ `deg = θt − θh`를 (−180, 180]으로 접는다(≤ −180이면 +360, > 180이면 −360) ⑦ `dx`·`dy`·`deg` 모두 소수 2자리 반올림. **스케일 없음**(k는 P의 이동에만 쓰이고 손 그림에는 걸지 않는다). 예 ⓐ S (0,0), arm `{ baseDeg: 0, targetDeg: -90, stretch: 1.2 }`, penPos (125,−5), size 50×30 → P (150,10) → P' (10,−180) → `{ dx: -140, dy: -190, deg: -90 }` ⓑ 같은 S, arm `{ 0, 90, 1 }`, penPos (90,−10), size 20×20 → P (100,0) → P' (0,100) → `{ dx: -100, dy: 100, deg: 90 }` ⓒ arm = `REST_TRANSFORM` → `{ dx: 0, dy: 0, deg: 0 }` ⓓ S (620,530), arm `{ baseDeg: 180, targetDeg: -129.81, stretch: 1.562 }`(§5.4 렌더 예와 같은 팔), penPos (389,492), size 202×154 → P (490,569) → P' ≈ (460.03, 398.98) → `dx ≈ -29.97`, `dy ≈ -170.02`(부동소수 허용오차 ±0.05), `deg = 50.19`(−309.81을 접은 값) | 비유한 입력 → `PEN_REST` | R-25 |
| `penTransformCss` (CR-025 신규, `mouseMapping.ts` export) | `(p: PenTransform) => string` | `` `translate(${p.dx}px, ${p.dy}px) rotate(${p.deg}deg)` ``. 손 그림 `<img>`의 `transform-origin`을 **`pen_up` 중심**(`${w/2}px ${h/2}px`, 요소 좌표)으로 두면 CSS는 원점 기준으로 ① 붙는 점 P를 축으로 `deg`만큼 돌리고 ② (dx, dy)만큼 옮겨 → P가 P'에 놓이고 손은 팔과 같은 각도로 기운다. `PEN_REST` → `'translate(0px, 0px) rotate(0deg)'`(JS 템플릿에서 `-0`은 `"0"`) | 없음 | R-25 |
| `pickPenEntry` (CR-025 신규, `PenHand.tsx` named export) | `(manifest: AssetManifest, machine: MachineState) => AssetEntry \| undefined` | 손 그림 선택(🔒 순서). ① `up = findByKey(manifest, 'pen_up')`, 없으면 `undefined`(펜 모드 아님) ② `!isPressing(machine)` → `up`(**CR-027**: 옛 `!machine.kbDown`을 바꿈 — 펜 모드 클릭 버튼만 눌려 있어도 누름 그림. `isPressing`은 `state/inputMachine`에서 import) ③ `s = currentSpecial(machine)`. `s !== null`이고 `findByKey(manifest, 'pen_key_' + s)`가 있으면 그것(`pen_key_space`·`pen_key_z`·`pen_key_question`·`pen_key_exclamation`·`pen_key_enter`·`pen_key_backspace`·`pen_key_undo`) ④ 아니면 `findByKey(manifest, 'pen_down_' + machine.kbFrame) ?? findByKey(manifest, 'pen_down_0') ?? up`. 예(`pen_up`·`pen_down_0`·`pen_down_1`·`pen_key_space` 등록): 입력 없음 → `pen_up` / 첫 누름(`kbFrame` 1) → `pen_down_1` / 다음 누름(`kbFrame` 0) → `pen_down_0` / 스페이스 누름 → `pen_key_space` / Enter 누름(`pen_key_enter` 없음) → `pen_down_{kbFrame}` / 모두 뗌 → `pen_up`. `pen_down_*`가 하나도 없으면 누름 중에도 `pen_up`(특수 키 그림은 있으면 보임). CR-027 예(같은 등록, 클릭 = `config.clickPress` true): 왼 클릭 누름(`kbFrame` 1) → `pen_down_1` / 뗌 → `pen_up` / 스페이스를 누른 채 왼 클릭 → `pen_key_space` 유지(클릭은 일반 누름 — 특수 키 그림을 가리지 않는다, 주 문서 §10.8) / 키를 누른 채 왼 클릭 뒤 키만 뗌 → `pen_down_{kbFrame}` 유지 | 없음 | R-22, R-25, R-26 |
| `PenHand` 렌더 (CR-025 신규, `PenHand.tsx` default export) | `({ manifest, machine, mouse, monitors, cursor, anchor, atRest }: Props) => JSX.Element \| null` | ① `up = findByKey(manifest, 'pen_up')`, 없으면 `null` ② `entry = pickPenEntry(manifest, machine)`(①이 있으면 항상 있음) ③ `size = { width: up.width, height: up.height }`, `pos = resolvePenPos(mouse, size)` ④ `arm = armTransformFor({ mouse, monitors, cursor, anchor, atRest })` ⑤ `p = penTransform(mouse.shoulder, arm, pos, size)` ⑥ `<img className={styles.hand} src={entry.url} alt="" draggable={false} style={{ left: pos.x, top: pos.y, width: entry.width, height: entry.height, transformOrigin: '${up.width/2}px ${up.height/2}px', transform: penTransformCss(p) }} />`(수치 px, `styles.hand` = 기존 `.hand { position: absolute }` 재사용). 래퍼 없음·애니메이션 클래스 없음(젤리·부르르는 감싼 `.jellyWrap`이 준다). 같은 `<img>` 요소를 유지한다(`key` 변경·조건부 요소 금지 — 그림 교체는 `src`만 바뀜, 주 문서 §11 D-1 수용 범주). 예: 쉬는 자세, penPos (334,498), `pen_up` 202×154 → `left: 334; top: 498; width: 202; height: 154; transformOrigin: '101px 77px'; transform: 'translate(0px, 0px) rotate(0deg)'` | 없음 | R-25 |

**CR-033 개정(R-29) — `PenHand` 렌더 행 대체:** 시그니처 `({ manifest, machine, mouse, monitors, cursor, anchor, atRest, penMode }: Props) => JSX.Element | null`(`Props`에 `penMode: boolean` 추가). ②를 `entry = penMode ? pickPenEntry(manifest, machine) : up`으로 바꾼다. ①·③~⑥(위치·팔 변형·`transformOrigin`·같은 `<img>` 유지)은 그대로다. 꺼짐이면 손은 항상 `pen_up`이고 팔 끝 추종은 켜짐과 같다. `pickPenEntry`는 바뀌지 않는다.

**CR-042 개정(R-31, 주 문서 §10.12) — §5.3의 `penDownFrameCount` 행·`LayerStack` 렌더(CR-033) 행, §5.3 `OverlayApp` `penMode` 행의 `config` 식, 위 §5.5 `pickPenEntry` 행을 다음으로 대체한다(`PenHand` 렌더 ①·③~⑥·CR-033 ②는 불변):**

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `pickPenEntry` (CR-042 개정, `PenHand.tsx` named export) | `(manifest: AssetManifest, machine: MachineState) => AssetEntry \| undefined`(불변) | ① `up = findByKey(manifest, 'pen_up')`, 없으면 `undefined` ② `!isPressing(machine)` → `up` ③ `findByKey(manifest, 'pen_down_0') ?? up`. `machine.kbFrame`·`currentSpecial`을 읽지 않는다(`currentSpecial` import 제거). 예(`pen_up`·`pen_down_0`·`pen_down_1`·`pen_key_space` 등록 — 옛 파일 포함): 입력 없음 → `pen_up` / 키 누름(`kbFrame` 무관) → `pen_down_0` / 스페이스 누름 → `pen_down_0`(`pen_key_space` 무시) / 클릭만 누름 → `pen_down_0` / 모두 뗌 → `pen_up`. `pen_down_0` 미등록 → 누름 중에도 `pen_up` | 없음 | R-25, R-26, R-31 |
| `pickPenKeyboardEntry` (CR-042 신규, `LayerStack.tsx` named export) | `(manifest: AssetManifest, machine: MachineState) => AssetEntry \| undefined` | ① `!machine.kbDown` → `findEntry(manifest, 'kb_up')` ② `s = currentSpecial(machine)`(`state/inputMachine` import, `pickKeyboardEntry`와 같음). `s !== null`이고 `e = findEntry(manifest, SPECIAL_KEY_SLOT[s])`가 있으면 `e` ③ 아니면 `findEntry(manifest, 'kb_up')`. `kb_down`을 읽지 않는다. 예(`key_space`만 등록): 스페이스 누름 → `key_space` / 스페이스를 누른 채 `a` → `key_space` / 스페이스 뗌(`a` 눌림) → `kb_up` / Enter 누름 → `kb_up` / 클릭만 누름(`kbDown` false) → `kb_up` | 없음 | R-22, R-31 |
| `LayerStack` 렌더 (CR-042 개정) | `({ manifest, machine, penMode })`(불변) | kb = `penMode ? pickPenKeyboardEntry(manifest, machine) : pickKeyboardEntry(manifest, machine)`. 나머지(body·state·순서·같은 `<img>` 유지·바운스 없음·`isPenMode` 내부 호출 없음) 불변 | 없음 | R-07, R-22, R-25, R-29, R-31 |
| `OverlayApp` `config` (CR-042 개정, `index.tsx`) | `useMemo(() => ({ idleMs: settings.idleSeconds * 1000, kbFrames: penMode ? 1 : kbDownFrameCount(manifest), clickPress: penMode }), [settings.idleSeconds, manifest, penMode])` | 펜 모드에서 순환 그림이 없으므로 `kbFrames = 1`. `LayerStack.tsx` import에서 `penDownFrameCount` 제거 | 없음 | R-29, R-31 |
| `penDownFrameCount` | — | **삭제**(CR-042). `LayerStack.tsx` export와 이를 단언하는 스펙(TC-188) 제거·개정은 ui-test-designer 몫 | — | (R-25 → R-31) |

상수·타입(CR-025, `src/state/mouseMapping.ts` export):

| 이름 | 값/정의 | 비고 |
|---|---|---|
| `PenTransform` | `interface { dx: number; dy: number; deg: number }` | 붙는 점 이동량(캔버스 px)·손 회전(도). 스케일 필드 없음 |
| `PEN_REST` | `{ dx: 0, dy: 0, deg: 0 }` | 쉬는 자세 = `penPos` 그대로·회전 0 |

`PenHand` Props(`src/overlay/components/PenHand.tsx`): `manifest: AssetManifest`, `machine: MachineState`(`isPressing`(= `kbDown`·`clickHeld`, CR-027)·`kbFrame`·`specialHeld`만 읽음), `mouse: MouseSettings`(`penPos` 포함 — 미확정 계약), `monitors: ScreenBounds[]`, `cursor: { x: number; y: number }`, `anchor: Point \| null`, `atRest: boolean` — `OverlayApp`이 `MouseArm`에 넘기는 값과 **같은 값**(같은 렌더의 같은 상태)을 넘긴다. `button`은 받지 않는다 — CR-027(R-26) 이후 펜 모드 클릭은 손 그림을 바꾸지만, 그 판정은 상태기계가 `clickHeld`·`kbFrame`·`bounceSeq`로 이미 반영하므로 `PenHand`는 `machine`만 읽는다(`mouse.button`을 읽지 않는다 — 클릭 파츠 R-09 전용).

입력 비보관(R-22 유지): `PenHand`는 `currentSpecial`의 분류값으로 슬롯 이름만 만들고 저장·출력하지 않는다.

### 5.6 뽀모도 타이머 (CR-045, R-33~R-36 — 주 문서 §10.14 14.4와 같은 내용)

(CR-045) §5.1 `jellyClass`의 JSX 설명 「`.canvas` 안 `<BackgroundLayer/>` 바로 뒤에 젤리 래퍼」는 「`<BackgroundLayer/>`·`<PomodoroLayer/>` 뒤에」로 읽는다.

| function | 위치·시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `nowMs` | `src/components/utils/timerClock.ts` · `() => number` | `performance.now()`. 두 훅은 이 함수로만 시각을 읽는다(테스트는 spy 또는 `performance`를 포함한 가짜 타이머) | 없음 | R-34 |
| `elapsedNow` | `timerClock.ts` · `(s: TimerSnapshot, receivedAt: number, now: number) => number` | `s.elapsedMs + (s.status === 'running' ? Math.max(0, now - receivedAt) : 0)` | 없음 | R-34, R-35 |
| `formatElapsed` | `timerClock.ts` · `(ms: number) => string` | 유한수가 아니거나 음수면 `'00:00:00'`. 아니면 `t = floor(ms/1000)` → `h = floor(t/3600)`, `m = floor(t%3600/60)`, `s = t%60`, 각 최소 2자리(시는 99 초과 시 자릿수 늘어남, 자르지 않음). 예: 0·999 → `00:00:00`, 3 723 000 → `01:02:03`, 360 000 000 → `100:00:00`, −1·NaN·Infinity → `00:00:00` | 없음 | R-34, R-36 |
| `timerTextStyle` | `timerClock.ts` · `(t: TimerSettings) => CSSProperties` | `{ position:'absolute', left:t.textPos.x, top:t.textPos.y, transform:\`translate(-50%, -50%) rotate(${t.rotation}deg)\`, transformOrigin:'50% 50%', fontSize:t.fontSize, color:t.color, lineHeight:1, whiteSpace:'nowrap', fontFamily:"'Segoe UI', 'Malgun Gothic', sans-serif", fontWeight:700, fontVariantNumeric:'tabular-nums', pointerEvents:'none', userSelect:'none' }` — `textPos` = 글자 중심. 설정 창 미리보기와 같은 함수 | 없음 | R-34 |
| `useTimerSnapshot` | `src/components/hooks/useTimerSnapshot.ts` · `() => { snapshot; receivedAt }` | 초기 `{ snapshot:{status:'stopped', elapsedMs:0}, receivedAt:0 }`. 마운트 효과: `cancelled`·`eventSeen` 지역 변수, `apply = s => setState({ snapshot:s, receivedAt:nowMs() })` → `await onTimerChanged(s => { if (cancelled) return; eventSeen = true; apply(s) })`(성공 시 `cancelled`면 즉시 해제, 아니면 `unlisten` 보관) → 구독 성공·실패 모두 `cancelFetch = fetchWithRetry(getTimer, s => { if (!cancelled && !eventSeen) apply(s) })`. cleanup: `cancelled = true`, `unlisten?.()`, `cancelFetch?.()`. `useBridgeEvent` 미사용 | 구독 실패 → 조회만. 조회 재시도 소진 → 초기값 유지. 문구 없음 | R-34, R-35, R-36 |
| `useElapsedText` | `src/components/hooks/useElapsedText.ts` · `(snapshot, receivedAt) => string` | `calc = () => formatElapsed(elapsedNow(snapshot, receivedAt, nowMs()))`, `useState(calc)` + `lastRef`, `push(v)` = 값이 다를 때만 setState. 효과 `[snapshot, receivedAt]`: `push(calc())` → `running`이 아니면 끝 → `setInterval(() => push(calc()), 250)`, cleanup `clearInterval` | 없음 | R-34 |
| `isTimerTextVisible` | `PomodoroLayer.tsx` named export · `(timer: TimerSettings, manifest: AssetManifest) => boolean` | `timer.enabled \|\| findEntry(manifest,'pomo_char') !== undefined \|\| findEntry(manifest,'pomo_bubble') !== undefined` | 없음 | R-34 |
| `PomodoroLayer` 렌더 | `design/components.md` §3.x | 주 문서 §10.14 14.2 표. `React.memo` 기본 비교 | 없음 | R-33, R-34 |
| `TimerText` 렌더 | 같은 곳 | `<div style={timerTextStyle(timer)} aria-hidden="true">{text}</div>` | 없음 | R-34 |
| 쉬는중 보고 효과 | `OverlayApp`(`index.tsx`, 쉬는중 진입 효과 바로 뒤) · `useEffect(() => { setResting(machine.layer === 'rest').catch(() => undefined) }, [machine.layer])` | 마운트 때 `false` 1회, 이후 `idle ↔ rest` 전이 때만. 상태기계 불변, 타이머 on/off와 무관(판정은 core) | 실패 → 무시(문구·재시도 없음) | R-35 |

### 5.7 타이머 모드 — 카운트다운 표시·끝남 깜빡임·알림음 (CR-050, R-37~R-39 — 주 문서 §10.15)

이 절이 5.6 표의 `useElapsedText`·`useTimerSnapshot`·`TimerText 렌더` 행을 **개정**한다(나머지 5.6 행은 불변). 타입은 `src/bridge/types.ts`(contract v0.23) 그대로: `TimerMode`, `TimerStatus`(+`'finished'`), `TimerSnapshot`(`mode?`·`durationMs?`), `TimerSettings`(`alarmVolume?`), `AlarmSound`.

**① `src/components/utils/timerClock.ts` 추가(순수, 기존 함수 불변)**

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `snapshotMode` | `(s: TimerSnapshot) => TimerMode` | `s.mode ?? 'stopwatch'` | 없음 | R-37 |
| `timerDisplayMs` | `(s: TimerSnapshot, receivedAt: number, now: number) => number` | `snapshotMode(s) === 'countdown'`이면 `Math.max(0, (s.durationMs ?? 0) - elapsedNow(s, receivedAt, now))`, 아니면 `elapsedNow(s, receivedAt, now)`. `finished` 스냅숏은 core가 `elapsedMs = durationMs`로 보내므로 0 | 없음 | R-37, R-38 |
| `formatRemaining` | `(ms: number) => string` | 유한수가 아니거나 음수면 `'00:00:00'`. 아니면 `t = Math.ceil(ms / 1000)`(**올림**) → `h = floor(t/3600)`, `m = floor(t%3600/60)`, `s = t%60`, 각 `pad2`(시는 99 초과 시 자릿수 늘어남). 예: 1 500 000 → `00:25:00`, 1 499 001 → `00:25:00`, 1 499 000 → `00:24:59`, 1 → `00:00:01`, 0 → `00:00:00`, 359 999 000 → `99:59:59`, −1·NaN·Infinity → `00:00:00`. 시·분·초 조립은 `formatElapsed`와 같은 식을 이 함수 안에 따로 둔다(구현은 공유 함수 `hms`를 두지 않았다 — `formatElapsed` 결과 불변) | 없음 | R-37 |
| `timerText` | `(s: TimerSnapshot, receivedAt: number, now: number) => string` | `ms = timerDisplayMs(s, receivedAt, now)` → 카운트다운이면 `formatRemaining(ms)`, 아니면 `formatElapsed(ms)`. 두 창(오버레이 `TimerText`·설정 창 미리보기)은 `useElapsedText`를 거쳐 이 함수 하나로 글자를 만든다 | 없음 | R-37, R-38 |
| `isTimerBlinking` | `(s: TimerSnapshot) => boolean` | `s.status === 'finished'` | 없음 | R-38 |

**② `src/components/hooks/useElapsedText.ts` 개정 — 이름·시그니처·반환 불변(`(snapshot, receivedAt) => string`)**

- 계산식만 바꾼다: `calc`·`calcNow` = `timerText(snapshot, receivedAt, nowMs())`(옛 `formatElapsed(elapsedNow(…))`). 효과 구조(`[snapshot, receivedAt]`, 즉시 반영, `running`일 때만 250ms interval + `flushSync`, 값이 바뀔 때만 setState)는 그대로다.
- (CR-061, 순수 리팩터 — 동작 불변) 효과 첫 단계의 즉시 반영은 `const initial = calcNow()`로 **1회만 계산**하고, `initial !== lastRef.current`면 `lastRef.current = initial; setText(initial)`(일반 setState — 효과 커밋 안이라 `flushSync` 아님). 이후 interval 콜백은 `value = calcNow()` → 같으면 끝, 다르면 `lastRef` 갱신 후 `flushSync(() => setText(value))`. 반환값·리렌더 시점은 CR-050과 같다.
- 결과: 카운트다운 `running`도 글자가 바뀔 때(= 남은 초가 바뀔 때)만 초당 1회 렌더. `finished`·`paused`·`stopped`는 interval 없음.
- **`{ text, blinking }` 반환으로 바꾸지 않는다(확정).** 이유: 설정 창 설계(`src/settings/design/timer-tab.md`)와 스펙(`TimerPreview.test.tsx`·`TimerTab.test.tsx`)이 `useElapsedText(...): string`을 mock·인용한다 — 반환형을 바꾸면 다른 화면이 깨진다. 깜빡임 여부는 스냅숏만으로 정해지므로 호출자가 `isTimerBlinking(snapshot)`을 직접 부른다.

**③ `src/components/hooks/useTimerSnapshot.ts` 개정 — 받은 경로 표시 1필드**

- `TimerSnapshotState`에 `fromEvent?: boolean`을 더한다(선택 표기 — 다른 화면 스펙의 mock 반환값 `{ snapshot, receivedAt }`이 타입 오류가 나지 않게). 훅은 항상 채운다: 초기값 `false`, `getTimer` 조회 결과 `false`, `onTimerChanged` 이벤트 `true`. `apply(s, fromEvent)` = `setState({ snapshot: s, receivedAt: nowMs(), fromEvent })`. 구독 순서·재시도·조회 결과 버림 규칙은 5.6 그대로.
- 쓰임: `useAlarmOnFinish`가 「첫 조회 결과가 `finished`면 울리지 않는다」(R-39)를 판정한다.

**④ `src/components/utils/alarmSound.ts` 신규(공용 — 설정 창 미리 듣기도 `playSound`·`defaultAlarmUrl`을 쓴다) — CR-058·CR-061 동기화**

import: `import { DEFAULT_TIMER_SETTINGS, type TimerSettings } from 'bridge'`(런타임 bridge 호출 없음 — 상수·타입만) · `import defaultAlarmAsset from '@/assets/sounds/default-alarm.mp3'`(Vite 정적 자산 import — 빌드 시 해시가 붙은 URL 문자열, vitest에서도 같은 import로 문자열).

내장 기본음 자산(CR-058 🔒 2026-09-28, 0.4.0 기본 세트): `src/assets/sounds/default-alarm.mp3` — 사용자가 지정한 원본 mp3를 그대로 번들(34 061바이트). 새 라이브러리 없음.

상수(export, 설정값 아님): `DEFAULT_ALARM_VOLUME: number = DEFAULT_TIMER_SETTINGS.alarmVolume ?? 44`(CR-061 — 기본 음량의 단일 소스는 `src/bridge/types.ts` `DEFAULT_TIMER_SETTINGS.alarmVolume` = **44**, contract v0.27 §3.3. `?? 44`는 그 필드가 선택 타입이라 붙인 타입 안전용 폴백이고 실제 값은 항상 상수에서 온다). 모듈 내부(비export): `clamp01 = (v) => Math.min(1, Math.max(0, v))`.

> 폐기(CR-058): 옛 합성 비프음 — `synthBeepWav`·`BEEP_SAMPLE_RATE`·`BEEP_FREQ_HZ`·`BEEP_MS`·`BEEP_GAP_MS`·`BEEP_COUNT`·`BEEP_FADE_MS`·`BEEP_AMPLITUDE`·`defaultAlarmUrl`의 Blob URL 캐시(`URL.createObjectURL`)·`DEFAULT_ALARM_VOLUME = 80`. 소스에서 삭제됐다(이력 서술은 주 문서 변경이력 CR-050·CR-058 행).

| function | 시그니처 | 동작 | 예외·부작용 | 요구ID |
|---|---|---|---|---|
| `defaultAlarmUrl` | `() => string` | 번들 자산 URL `defaultAlarmAsset`을 그대로 반환한다. 몇 번을 불러도 같은 문자열. `Audio`를 만들지 않는다 | 없음(순수 — Blob·`URL.createObjectURL` 없음) | R-39 |
| `alarmGain` | `(t: TimerSettings) => number` | `v = typeof t.alarmVolume === 'number' && Number.isFinite(t.alarmVolume) ? t.alarmVolume : DEFAULT_ALARM_VOLUME`(`typeof` 가드는 `alarmVolume?` 선택 필드의 타입 좁힘용 — 판정 결과는 `Number.isFinite`만 쓸 때와 같다) → `Math.min(100, Math.max(0, v)) / 100`. 예: 없음 → 0.44, 80 → 0.8, 0 → 0, 150 → 1, −5 → 0, NaN → 0.44 | 없음(순수) | R-39 |
| `playSound` | `(url: string, volume: number, onFail?: () => void, loop = false) => () => void` — CR-052: `audio.loop = loop`(생략 = false. CR-055로 오버레이 끝남 알림도 생략 = 1회 재생 — 현재 `true` 호출처 없음) | ① 지역 `audio: HTMLAudioElement \| null = null`, `settled = false`, `fail = () => { if (settled) return; settled = true; queueMicrotask(() => { if (stopped) return; onFail?.() }) }`(지역 `stopped = false`) — **`onFail`은 항상 비동기(`queueMicrotask`)로 부르고, `stop()` 뒤에는 부르지 않는다** ② `try { audio = new Audio(url)`(반복 없음 — `loop` 기본 `false`)`; audio.volume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0; audio.addEventListener('error', fail, { once: true }); const p = audio.play(); if (p && typeof p.catch === 'function') p.catch(fail) } catch { fail() }` — **`new Audio`부터 `play()`까지 전부 try 안**(생성자·음량 대입·`play()` 동기 예외 모두 `fail`) ③ 반환 = 정지 함수 `stop()`: `stopped = true; settled = true`(이후 `onFail` 호출 없음 — 이미 예약된 microtask도 `stopped` 확인으로 버린다), `audio?.removeEventListener('error', fail)`, `try { audio?.pause(); if (audio) audio.currentTime = 0 } catch { /* 무시 */ }`. 두 번 불러도 안전 | **던지지 않는다.** `new Audio`·`play()` 동기 예외·`play()` 거부·`error` 이벤트는 모두 `onFail` **최대 1회, 항상 비동기**로 알린다(정지 뒤에는 알리지 않음). 비동기 보장 때문에 호출자의 `stopRef.current = playSound(...)` 대입이 `onFail`보다 **먼저** 끝난다(⑤ 순서 근거) | R-39 |

**⑤ `src/overlay/hooks/useAlarmOnFinish.ts` 신규(화면 로컬 훅 — 알람은 오버레이 한 곳에서만)**

| 항목 | 내용 |
|---|---|
| 시그니처 | `useAlarmOnFinish(state: TimerSnapshotState, gain: number): void` — `state` = `useTimerSnapshot()` 반환값 그대로, `gain` = `alarmGain(timer)`(0~1) |
| 상태 | **React state 없음 — ref만**: `prevStatusRef: MutableRefObject<TimerStatus \| null>`(초기 `null`), `stopRef: MutableRefObject<(() => void) \| null>`(초기 `null`), `genRef: MutableRefObject<number>`(초기 `0` — 재생 회차 번호, 비동기 결과 폐기용), `gainRef: MutableRefObject<number>`(초기 `gain`) |
| 내부 함수 | `halt()` = `genRef.current += 1; stopRef.current?.(); stopRef.current = null`. `start()` = `const gen = ++genRef.current` → `getAlarmSound().then(s => s?.url ?? null, () => null)` → `.then(url => { if (gen !== genRef.current) return; const v = gainRef.current; const playDefault = () => { if (gen !== genRef.current) return; stopRef.current = playSound(defaultAlarmUrl(), v) }; stopRef.current = url ? playSound(url, v, playDefault) : playSound(defaultAlarmUrl(), v) })` — 기본음 재생의 실패는 `onFail`을 넘기지 않아 조용히 끝난다(재시도 1회뿐). **순서(확정):** ⓐ `stopRef.current = playSound(url, v, playDefault)` 바깥 대입이 동기로 먼저 끝난다(④ `onFail`은 항상 `queueMicrotask` 비동기 — `new Audio`·`play()` 동기 예외여도 같다) ⓑ 그 뒤 microtask에서 `playDefault`가 불리면 회차 확인 후 `stopRef.current`를 **기본음 정지 함수로 바꾼다**(등록 파일 정지 함수는 이미 실패 확정이라 버려도 된다) ⓒ 따라서 `finished`를 떠날 때 `halt()`의 `stopRef.current?.()`는 기본음을 멈춘다. `halt()`가 ⓑ보다 먼저 오면 `genRef` 증가로 `playDefault`가 아무것도 안 하고, 등록 파일 `stop()`이 이미 `stopped = true`로 예약 microtask도 버린다 |
| 효과 1 `[gain]` | `gainRef.current = gain`(재생 **시작 시점**의 최신 음량을 쓴다. 재생 중 음량 변경은 반영하지 않는다 — 요구 없음) |
| 효과 2 `[state.snapshot, state.fromEvent]` | `status = state.snapshot.status`, `prev = prevStatusRef.current`, `prevStatusRef.current = status`. ⓐ `status !== 'finished'` → `halt()` 후 끝(떠나면 정지 — 10초 종료·멈춤·끄기 = `stopped`, 시작 = `running`) ⓑ `status === 'finished'`이고 `state.fromEvent === true`이고 `prev !== 'finished'` → `start()` ⓒ 그 밖(`fromEvent`가 `false`/없음 = 초기값·첫 조회 결과, 또는 이미 `finished`) → 아무것도 안 함 |
| 효과 3 `[]` | cleanup = `halt()`(언마운트 때 정지·진행 중 조회 결과 폐기) |
| 예외 | `getAlarmSound` 실패 → 기본음. 등록 파일 재생 실패 → 기본음 1회. 기본음 실패 → 무시. 모두 문구 없음(R-01). 던지지 않는다 |
| 호출 위치 | `TimerText`(아래 ⑥) — `OverlayApp`이 아니다(주 문서 §10.15 15.3 근거) |
| 요구ID | R-39 |

**⑥ `TimerText` 렌더 개정(`src/overlay/components/TimerText.tsx`)**

```
const state = useTimerSnapshot()
const text = useElapsedText(state.snapshot, state.receivedAt)
useAlarmOnFinish(state, alarmGain(timer))
return <div className={isTimerBlinking(state.snapshot) ? styles.blink : undefined}
            style={timerTextStyle(timer)} aria-hidden="true">{text}</div>
```

- `styles` = `./TimerText.module.css`(신규). `finished`가 아니면 `className` 속성 자체가 없다(5.6 「클래스 없음」 유지).
- 요구ID R-37·R-38·R-39.
