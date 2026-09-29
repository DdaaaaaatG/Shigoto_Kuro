# overlay 상세 설계 — §3 컴포넌트 설계

> `src/overlay/design.md`에서 분할(40KB 기준, ui-design-strategy §1.2). 절 번호는 주 문서와 같다. 개요·레이아웃·상태·파이프라인·계약·라벨·레이어/모션·RTM은 주 문서 `src/overlay/design.md`, 기능 명세(§5)는 `design/functions.md`, 접근성(§9)은 `design/a11y.md`.

## 3. 컴포넌트 설계

`src/components/ui`는 현재 비어 있다(`.gitkeep`만). 오버레이는 표준 입력 요소가 없고 이미지·SVG만 그리므로 공용 컴포넌트 대상이 없다.

| 컴포넌트 | 파일 | 분류 | props | 이벤트/부작용 | 요구ID |
|---|---|---|---|---|---|
| `OverlayApp` (default export) | `src/overlay/index.tsx` | 화면 진입 | 없음 | 초기 로드 3회 호출(`getSettings`·`getAssetManifest`·`getMonitors` — CR-017로 `getScreenBounds` 대체), 이벤트 5종 `useBridgeEvent` 구독, 기준점 효과 1개(CR-008: `onHandAnchorChanged` 구독 완료 후 `getHandAnchor()` — contract §3.6 순서, §5.1), tick 타이머, `onWheel`, 쉬는 위치 효과(CR-009), `.canvas` 첫 자식으로 `BackgroundLayer` 렌더(CR-014), 둘째 자식으로 젤리 래퍼 `<div className={jellyClass(wrapMotion(machine))}>`(CR-022 — 안에 `MouseArm`·`LayerStack`, `design/functions.md` §5.1 `jellyClass`. CR-023: 인자가 `bouncePhase` → `wrapMotion`, 자동 반복 중 `.shiver`), 키보드 이벤트의 `special` 분류값·`repeat`(CR-023)을 `dispatch`로만 넘김(CR-021, 보관·로그 없음). `MouseArm`·`LayerStack`에는 바운스 값을 넘기지 않는다(CR-022 — 옛 `MouseArm` `bounce` prop 삭제). (CR-025) `.jellyWrap` 안 `LayerStack` 뒤에 `PenHand`(`settings.mouse !== null`일 때, props = `MouseArm`과 같은 값 + `machine`), `config.kbFrames` = `isPenMode(manifest) ? penDownFrameCount(manifest) : kbDownFrameCount(manifest)`. (CR-027) `config.clickPress` = `isPenMode(manifest)` — 펜 모드 클릭 누름을 키 누름처럼 세는 스위치(주 문서 §4). 마우스 버튼 핸들러는 그대로(`dispatch({type:'mouseButton', button, pressed, ts})`). (CR-037) `.jellyWrap`의 **첫 자식**으로 `<HairLayer manifest={manifest} />`(조건 없음) — `MouseArm` 앞. (CR-042 — 위 CR-025·CR-027·CR-033의 `config` 식 대체) `penMode = isPenMode(manifest, settings.mouse)`, `config.kbFrames` = `penMode ? 1 : kbDownFrameCount(manifest)`, `config.clickPress` = `penMode`. `penDownFrameCount` import 없음(주 문서 §10.12). (CR-062) `.root`에 `onContextMenu={preventContextMenu}`(모듈 수준 상수, `design/functions.md` §5.1) — WebView2 기본 오른쪽 클릭 메뉴 억제만. 메뉴 컴포넌트를 렌더하지 않는다(트레이와 같은 메뉴는 core가 띄움, 주 문서 §10.16) | R-01, R-03~R-05, R-07, R-11, R-12, R-15~R-26, R-29~R-31, R-40 |
| `BackgroundLayer` (default export, `React.memo`로 감싼다) — **신규**(CR-014) | `src/overlay/components/BackgroundLayer.tsx` | 화면 로컬 | `manifest: AssetManifest` (이것 하나뿐 — `machine`·`cursor`·`bounce` 등 입력 관련 prop을 받지 않는다) | 없음(순수 렌더). `background` 항목이 없으면 `null` | R-17 |
| `HairLayer` (default export, `React.memo`로 감싼다) — **신규**(CR-037) | `src/overlay/components/HairLayer.tsx` | 화면 로컬 | `manifest: AssetManifest` (이것 하나뿐 — `machine`·`cursor`·`mouse` 등 입력 관련 prop을 받지 않는다) | 없음(순수 렌더). `findEntry(manifest, 'hair')`(`LayerStack.tsx` named export 재사용)로 항목을 찾아 있으면 `<img className={styles.layer} src={entry.url} alt="" draggable={false} />` 하나, 없으면 `null`. 인라인 `style`·`transform`·애니메이션 클래스 없음(젤리·부르르는 감싼 `.jellyWrap`이 준다). `BackgroundLayer`와 같은 모양이지만 슬롯·자리(`.jellyWrap` 첫 자식)가 달라 파일을 따로 둔다 | R-30 |
| `LayerStack` (default export) | `src/overlay/components/LayerStack.tsx` | 화면 로컬 | `manifest: AssetManifest`, `machine: MachineState`(`layer`는 `'idle' \| 'rest'` — CR-019, `specialHeld` 포함 — CR-021) | 없음(순수 렌더). 어느 `Layer`에도 바운스 값을 넘기지 않는다(CR-019 상태, CR-022 키보드 — 바운스는 감싼 `.jellyWrap`이 받는다). `bouncePhase` import 불필요. 키보드 `Layer`의 그림은 `pickKeyboardEntry`(named export, CR-021)로 고른다 — 특수 키 그림 포함(`design/functions.md` §5.3). named export 추가: `pickKeyboardEntry`, `SPECIAL_KEY_SLOT`. (CR-025) named export 추가: `findByKey`, `isPenMode`, `penDownFrameCount` — 펜 모드면 키보드 `Layer` = `kb_up` 고정(`design/functions.md` §5.3). **(CR-042 대체)** prop `penMode: boolean`(CR-033). `penDownFrameCount` **삭제**, named export `pickPenKeyboardEntry` **추가** — 펜 모드 키보드 `Layer` = 특수 키 누름 중 `key_{special}`(있으면), 아니면 `kb_up`(`kb_down` 안 씀, 주 문서 §10.12·`design/functions.md` §5.5 CR-042 블록) | R-07, R-19, R-22, R-25, R-29, R-31 |
| `Layer` (파일 내부) | 같은 파일 | 화면 로컬 | `entry?: AssetEntry` 하나뿐(CR-022: `bounce` prop **삭제** — 클래스는 항상 `styles.layer`) | 없음. `entry` 없으면 `null`(몸통 없음 = 투명, R-19). 키보드 `Layer`는 `kb_up`·`kb_down`·특수 키 그림(CR-021)을 모두 **같은 요소**로 그린다(`key` 변경 금지 — 교체 깜빡임 방지) | R-07, R-19, R-22 |
| `MouseArm` (default export) | `src/overlay/components/MouseArm.tsx` | 화면 로컬 | `manifest: AssetManifest`, `mouse: MouseSettings`(CR-017: `area` 포함·`pad` 없음, 미확정 계약), **`monitors: ScreenBounds[]`**(CR-017, 옛 `bounds: ScreenBounds` 대체 — `OverlayApp` 상태 `monitors` 그대로), `cursor: {x:number;y:number}`, `button: MouseButtonState`, **`anchor: Point \| null`**(CR-008, bridge 기준점), **`atRest: boolean`**(CR-009). ~~`bounce: BouncePhase`~~ **삭제(CR-022)** — 팔은 `.jellyWrap` 안에서 몸과 함께 출렁인다 | 없음(순수 렌더, 이미지 픽셀을 읽지 않음). 좌표·변형은 `src/state/mouseMapping.ts` 순수 함수(`resolvePivot`·`pickMonitor`·`cursorUv`·`bilerpQuad`·`armTransform`·`armTransformCss`)만 부른다 | R-09, R-11, R-15, R-16, R-18, R-20, R-21 |
| `PenHand` (default export) — **신규**(CR-025) | `src/overlay/components/PenHand.tsx` | 화면 로컬 | `manifest: AssetManifest`, `machine: MachineState`, `mouse: MouseSettings`(`penPos` 포함 — 미확정 계약), `monitors: ScreenBounds[]`, `cursor: {x:number;y:number}`, `anchor: Point \| null`, `atRest: boolean`(`MouseArm`과 같은 값. `button`·바운스 값 없음) | 없음(순수 렌더). `pen_up`이 없으면 `null`. 손 그림 선택 `pickPenEntry`(named export), 위치·변형은 `mouseMapping.ts`의 `armTransformFor`·`resolvePenPos`·`penTransform`·`penTransformCss`만 부른다(`design/functions.md` §5.5). named export: `pickPenEntry`. (CR-027) 누름 판정은 `isPressing(machine)` — 펜 모드 클릭 버튼만 눌려 있어도 누름 그림(props 변경 없음). **(CR-042)** `pickPenEntry` = 누름 중 `pen_down_0 ?? pen_up`(순환·`pen_key_*` 없음), 펜 모드일 때만 호출(CR-033 prop `penMode`) — 주 문서 §10.12 | R-22, R-25, R-26, R-29, R-31 |
| `useBridgeEvent` | `src/components/hooks/useBridgeEvent.ts` | 공용 훅(기존) | `(subscribe: Subscriber<T>, handler: (p: T) => void)` | 구독·해제. 핸들러는 ref 보관(재구독 없음) | R-03~R-05, R-07, R-09, R-14, R-15, R-18, R-19 |

삭제(CR-008): `useAlphaCentroid` 훅(`src/overlay/components/useAlphaCentroid.ts`)은 만들지 않는다. 이미 만들어졌다면 제거한다.

렌더 조건(`OverlayApp` JSX):

| 위치 | 조건 |
|---|---|
| `.canvas` | `manifest.canvas !== null` |
| `BackgroundLayer` (`.canvas` 첫 자식, 맨 아래) | 항상 렌더(`.canvas` 안). 내부에서 `background` 항목이 없으면 `null` — 배경 없음 = 아무것도 그리지 않음(투명) |
| `.jellyWrap` `<div>` (CR-022, `.canvas` 마지막 자식 — `BackgroundLayer`·`PomodoroLayer` 뒤) | 항상(`.canvas` 안, 조건 없음). 안에 `MouseArm`·`LayerStack`·`PenHand`를 이 순서로 둔다(헤어는 CR-051로 `.hairWrap`). 클래스만 `jellyClass(motion)`(CR-023, `motion = wrapMotion(machine)` 1회 계산 — CR-051)로 바뀌고 요소는 늘 같다(`key`·조건부 렌더 금지) |
| `HairLayer` (CR-051: `.canvas` 첫 자식 `.hairWrap` 안 — 옛 CR-037 자리 「`.jellyWrap` 첫 자식」 대체) | `findEntry(manifest,'hair')`가 있을 때만 `.hairWrap`째 렌더(`hasHair` — `useMemo([manifest])`). 없으면 래퍼도 없음(투명, 정상, 안내 없음) |
| `MouseArm` (`.jellyWrap` 둘째 자식(CR-037 전에는 첫 자식)·LayerStack 앞, z0 — **유일한 `MouseArm`**, CR-015) | `settings.mouse && monitors.length > 0`(CR-017, 옛 `settings.mouse && bounds` 대체. 모드 판별 없음. `isMouseLayerMode` 삭제). 손 그림은 `mouse.partPos`에 자연 크기(`design/functions.md` §5.4) — `mouse`는 `MouseSettings`(CR-015 이후 `partPos` 포함·`armWidth`·`armColor` 없음, 미확정 계약) |
| `LayerStack` | 항상(`.jellyWrap` 안, `MouseArm` 뒤 — CR-022). `body` 없음 = 몸통 `Layer`가 `null`(투명, 정상 — R-19). 디폴트 상태 그림은 `kb_up`. 펜 모드면 키보드 `Layer`는 항상 `kb_up`(CR-025). (CR-033) 펜 모드는 `OverlayApp`이 `isPenMode(manifest, settings.mouse)`로 계산해 prop `penMode: boolean`으로 넘긴다(`pen_up` && `mouse.penMode`) |
| `PenHand` (CR-025, `.jellyWrap` **마지막 자식** — `LayerStack` 뒤 = 맨 위) | `settings.mouse !== null`(어깨·이동 영역·`penPos`가 `MouseSettings`에 있으므로). `monitors`가 비어도 렌더한다(팔 변형이 `REST_TRANSFORM` → 손은 `penPos`에 회전 0). 내부에서 `pen_up`이 없으면 `null`. `mouse_base`(팔 그림)가 없어도 계산상 팔 변형을 따른다(팔 그림 표시 여부와 무관). (CR-033) prop `penMode: boolean` 추가 — 꺼짐이면 `pen_up`만 그리고(교체 없음) 팔 끝 추종은 유지(`design/functions.md` §5.5 CR-033 개정) |
| ~~`MouseArm` (LayerStack 뒤, z4)~~ | **삭제(CR-015)** — 손바닥 모드 폐기 |

바운스(젤리, CR-022 · R-23)는 `.jellyWrap` 한 요소에만 걸린다. `MouseArm`·`LayerStack`은 바운스 값을 받지 않고, 감싼 래퍼가 출렁이면 안의 팔·몸통·상태·키보드가 같은 렌더·같은 순간·같은 모양으로 함께 출렁인다(R-16 「같은 타이밍·같은 모양」 충족). 옛 방식(CR-011·CR-021 — 키보드 `Layer`와 `MouseArm` `.armWrap`에 각각 `.bounce`/`.bounceAlt`)은 폐기. 키 꾹 누름 부르르(CR-023 · R-24)도 같은 `.jellyWrap`에 `.shiver`로 걸린다 — `.jelly`/`.jellyAlt`와 동시에 붙지 않는다(부르르 우선, 주 문서 §10.3).

**배경 DOM 구조(CR-014, R-17 · CR-022 갱신) — 바운스가 배경에 걸리지 않게.** 비유: 배경은 액자 뒤판이고, 캐릭터 그림들은 뒤판 위에 올린 젤리 판 하나에 붙어 있다. 젤리 판을 톡 치면 판째 출렁이지만 뒤판은 움직이지 않는다.

```
.canvas  (transform: scale(s) 만 — 애니메이션 클래스 없음)
├─ <div class="hairWrap [jelly|jellyAlt|shiver]">      ← CR-051 뒷머리 래퍼(hair 있을 때만, 맨 아래, 본체와 같은 motion)
│  └─ HairLayer     <img class="layer"> 헤어(hair)       ← 애니메이션 없음(부모가 줌)
├─ BackgroundLayer  <img class="layer">                 ← 바운스·회전·교체 없음
├─ PomodoroLayer    <div class="pomodoro">               ← CR-045 고정
└─ <div class="jellyWrap [jelly|jellyAlt|shiver]">      ← R-23 젤리·R-24 부르르 대상(본체)
   ├─ MouseArm(z0)  <div class="armWrap">              ← 애니메이션 없음(컨테이너)
   │                  └ <img class="hand" transform=rotate·scaleX>
   ├─ LayerStack    <img class="layer"> 몸통
   │                <img class="layer"> 상태(idle/rest)
   │                <img class="layer"> 키보드(kb_up/kb_down/key_*, 펜 모드면 kb_up 고정)
   └─ PenHand       <img class="hand" transform=translate·rotate>  ← CR-025 펜 쥔 손(맨 위)
```

(CR-025) `PenHand`의 `<img>`에도 애니메이션 클래스를 붙이지 않는다(규칙 5 그대로) — 젤리·부르르는 `.jellyWrap`에서 팔·몸과 한 덩어리로 받는다.

(CR-015: 이전 `MouseArm(z4)`(손바닥 모드) 자리는 삭제됐다. `MouseArm(z0)`의 안쪽 `<img>`는 `class="hand"`, `left/top = partPos`, 자연 크기, `rotate(...) scaleX(...) rotate(...)` — `design/functions.md` §5.4.)

1. `BackgroundLayer`의 `<img>`는 `.canvas`의 **직계 첫 자식**이며, `.jellyWrap`의 **형제**다. `.jellyWrap` 안에 넣지 않는다.
2. `.jelly`·`.jellyAlt` 클래스·`animation`·`transform`은 `.canvas`와 `.root`에 붙이지 않는다(`.canvas`의 `transform: scale`만 예외 — 배율이며 배경도 같이 받아야 한다, 주 문서 §10.5). 그래서 젤리는 배경의 조상에도 걸리지 않는다.
3. `BackgroundLayer`의 `<img>`에는 애니메이션 클래스·인라인 `transform`·`transformOrigin`을 절대 붙이지 않는다. 클래스는 `styles.layer` 하나뿐.
4. `background` 슬롯 값·매니페스트 항목은 contract v0.6 §3.1(`AssetSlot` `'background'`, 캔버스 레이어, 선택 슬롯)을 따른다. 배경은 사용자가 등록한 PNG다 — 앱이 붙이는 장식이 아니다(주 문서 §8 R-01 해석).
5. (CR-022) 이중 적용 금지: `.jellyWrap` 안의 요소(`.armWrap`, `LayerStack`의 모든 `<img>`)에는 애니메이션 클래스(`.jelly`·`.jellyAlt`·`.shiver`(CR-023), 옛 `.bounce`·`.bounceAlt`)를 붙이지 않는다. `.jellyWrap`은 한 개뿐이다. 규칙 2도 `.shiver`에 똑같이 적용한다(`.canvas`·`.root`에 붙이지 않음 — 배경은 떨지 않는다).
6. (CR-023) `.jellyWrap`에는 `.jelly`·`.jellyAlt`·`.shiver` 중 **많아야 하나**가 붙는다(`jellyClass`가 보장, `design/functions.md` §5.1).
7. (CR-051 🔒 2026-09-26, 아래 CR-037 원문의 자리 규칙을 대체) `HairLayer`는 `.canvas` **첫 자식** `<div className={jellyClass(motion, styles.hairWrap)}>` 안에 둔다(hair 등록 시에만 래퍼 렌더) — `BackgroundLayer`보다 아래, 겹침 아래→위 = 헤어 → 배경 → 뽀모도 → `.jellyWrap`(팔 → 본체 → 펜 손). `.hairWrap`은 `.jellyWrap`과 같은 기하(absolute·0/0·100%·pointer-events none·transform-origin 50% 100%)이고 `motion`은 렌더에서 1회 계산해 두 래퍼에 같이 넘긴다. 기본 클래스로 `.jellyWrap`을 재사용하지 않는다(본체 래퍼는 한 개). 규칙 5·6의 「애니메이션 클래스 대상」에 `.hairWrap`을 더한다. — CR-037 원문: (CR-037, R-30) `HairLayer`의 `<img>`는 `.jellyWrap`의 **직계 첫 자식**이다 — `BackgroundLayer`(`.canvas` 첫 자식)보다 위, `MouseArm`의 `.armWrap`보다 아래. 그래서 겹침(아래→위)은 배경 → 헤어 → 팔(`MouseArm`) → 본체(`LayerStack` 몸통·상태·키보드) → 펜 쥔 손(`PenHand`)이다. `.jellyWrap` 밖(`.canvas` 직계)에 두지 않는다 — 두면 젤리·부르르에서 헤어만 제자리에 남아 본체와 어긋난다. 클래스는 `styles.layer` 하나뿐(규칙 3·5와 같음 — 인라인 `transform`·애니메이션 클래스 금지). 캔버스 레이어라 좌표 계산이 없다(`.layer` = 캔버스 전체 크기, 왼쪽 위 0,0).

### 3.x 뽀모도 타이머 (CR-045, R-33~R-36 — 주 문서 §10.14와 같은 내용)

| 컴포넌트 | 파일 | 분류 | props | 이벤트/부작용 | 요구ID |
|---|---|---|---|---|---|
| `PomodoroLayer` (default export, `React.memo`) — 신규 | `src/overlay/components/PomodoroLayer.tsx` | 화면 로컬 | `manifest: AssetManifest`, `timer: TimerSettings`(둘뿐 — 입력 prop 없음) | 없음(순수 렌더). `char = findEntry(manifest, 'pomo_char')`, `bubble = findEntry(manifest, 'pomo_bubble')`(`./LayerStack` named export 재사용), `showText = isTimerTextVisible(timer, manifest)`. 셋 다 없으면 `null`, 아니면 `<div className={styles.pomodoro}>` 안에 인물 `<img className={styles.layer} alt="" draggable={false}>` → 말풍선 `<img …>` → `<TimerText timer={timer} />`(각각 있을 때만). named export `isTimerTextVisible` | R-33, R-34 |
| `TimerText` (default export) — 신규 | `src/overlay/components/TimerText.tsx` | 화면 로컬(설정 창은 끌기 때문에 자기 컴포넌트를 둔다 — 승격 대상 아님) | `timer: TimerSettings` | `useTimerSnapshot()` + `useElapsedText(snapshot, receivedAt)` → `<div style={timerTextStyle(timer)} aria-hidden="true">{text}</div>`, 클래스 없음 | R-34, R-36 |
| `useTimerSnapshot` — 신규 | `src/components/hooks/useTimerSnapshot.ts` | 공용 훅(아키텍트 패킷 지정, settings 미리보기와 공용) | 없음 → `{ snapshot: TimerSnapshot; receivedAt: number }` | `onTimerChanged` 구독 → `getTimer` 조회(`design/functions.md` §5.6) | R-34, R-35, R-36 |
| `useElapsedText` — 신규 | `src/components/hooks/useElapsedText.ts` | 공용 훅 | `(snapshot, receivedAt) => string` | `running`일 때만 250ms interval | R-34 |
| `timerClock` — 신규 | `src/components/utils/timerClock.ts` | 공용 유틸(순수) | — | 없음 | R-34 |

`OverlayApp`(CR-045): `.canvas` 안 `<BackgroundLayer/>` 바로 뒤에 `<PomodoroLayer manifest={manifest} timer={settings.timer ?? DEFAULT_TIMER_SETTINGS} />`, 쉬는중 보고 효과 `setResting(machine.layer === 'rest')`(`design/functions.md` §5.6), `//!` 흐름 주석 갱신.

렌더 조건(CR-045 — 위 렌더 조건 표의 「`.jellyWrap` = `.canvas` 둘째 자식」을 대체): `.canvas` 직계 자식 순서 = `BackgroundLayer` → `PomodoroLayer`(그릴 것이 없으면 `null`) → `.jellyWrap`. `PomodoroLayer` 표시 조건은 주 문서 §10.14 14.2 표(U-1: 글자 = `timer.enabled` 또는 뽀모도 그림 ≥1장).

```
.canvas
├─ BackgroundLayer  <img class="layer">
├─ PomodoroLayer    <div class="pomodoro">          ← CR-045, 애니메이션 없음(고정)
│    ├─ <img class="layer"> pomo_char
│    ├─ <img class="layer"> pomo_bubble
│    └─ TimerText <div style=timerTextStyle>
└─ <div class="jellyWrap …">  (불변)
```

8. (CR-045, R-33) `PomodoroLayer`는 `.canvas` 직계이며 `.jellyWrap` 밖이다. `.pomodoro`와 그 자손에는 `.jelly`·`.jellyAlt`·`.shiver`·인라인 애니메이션을 붙이지 않는다(배경처럼 고정). `.pomodoro` = `position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none;`.

### 3.y 타이머 모드 (CR-050, R-37~R-39 — 주 문서 §10.15와 같은 내용)

| 컴포넌트·모듈 | 파일 | 분류 | props·시그니처 | 이벤트/부작용 | 요구ID |
|---|---|---|---|---|---|
| `TimerText` — **개정** | `src/overlay/components/TimerText.tsx` + **신규** `src/overlay/components/TimerText.module.css` | 화면 로컬 | `timer: TimerSettings`(불변) | `useTimerSnapshot()` → `useElapsedText`(카운트다운 올림 포함) · `useAlarmOnFinish(state, alarmGain(timer))` · `finished`면 `className={styles.blink}`(`design/functions.md` §5.7 ⑥) | R-37, R-38, R-39 |
| `useAlarmOnFinish` — 신규 | `src/overlay/hooks/useAlarmOnFinish.ts`(새 폴더 `src/overlay/hooks/` — 화면 로컬 훅) | 화면 로컬 훅(알람 재생은 오버레이 한 곳뿐이라 공용 아님) | `(state: TimerSnapshotState, gain: number) => void` | `getAlarmSound`·`playSound`·`defaultAlarmUrl`, state 없음·ref만(§5.7 ⑤) | R-39 |
| `alarmSound` — 신규 | `src/components/utils/alarmSound.ts` | 공용 유틸(설정 창 미리 듣기와 공용 — 아키텍트 패킷 지정 배치) | `defaultAlarmUrl`·`alarmGain`·`playSound`·상수 `DEFAULT_ALARM_VOLUME`(= `DEFAULT_TIMER_SETTINGS.alarmVolume`, 44 — CR-061)(§5.7 ④). 내장 기본음 = 번들 자산 `src/assets/sounds/default-alarm.mp3`(CR-058 — 옛 `synthBeepWav`·`BEEP_*` 합성음 폐기) | `new Audio`(`playSound`만). `defaultAlarmUrl`은 부작용 없음 | R-39 |
| `timerClock` — 개정 | `src/components/utils/timerClock.ts` | 공용 유틸(순수) | + `snapshotMode`·`timerDisplayMs`·`formatRemaining`·`timerText`·`isTimerBlinking`(§5.7 ①) | 없음 | R-37, R-38 |
| `useElapsedText` — 개정 | `src/components/hooks/useElapsedText.ts` | 공용 훅 | 불변 `(snapshot, receivedAt) => string` | 계산식만 `timerText`(§5.7 ②) | R-37 |
| `useTimerSnapshot` — 개정 | `src/components/hooks/useTimerSnapshot.ts` | 공용 훅 | `() => TimerSnapshotState`, 타입에 `fromEvent?: boolean` 추가 | 이벤트 = `true`, 초기·조회 = `false`(§5.7 ③) | R-39 |

`OverlayApp`(`src/overlay/index.tsx`, 현행 264줄): **변경 없음**(CR-050). `PomodoroLayer`: 변경 없음(`isTimerTextVisible`(U-1) 불변).

`TimerText.module.css`(신규, 전문):

```
.blink {
  animation: timerBlink 1s infinite;
}

@keyframes timerBlink {
  0%, 49.9% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
```

- 위 값(`timerBlink 1s infinite`, `0%, 49.9%` opacity 1 / `50%, 100%` opacity 0)은 패킷 §4 원문 그대로 유지한다. 설정 창 미리보기 깜빡임도 이 값으로 맞춘다(주 문서 §10.15 15.1).
- 배치 근거: `src/overlay/hooks/`·`components/TimerText.module.css`는 ui-design-strategy §1.1 표준(`styles/`) 밖이지만 아키텍트 패킷 §1 지정 위치다(주 문서 §10.15 15.3).

9. (CR-050, R-38) 규칙 8의 「`.pomodoro` 자손에 인라인 애니메이션을 붙이지 않는다」의 **유일한 예외**는 `TimerText`의 `.blink`(opacity만, `transform` 없음)다 — 젤리·부르르 클래스(`.jelly`·`.jellyAlt`·`.shiver`)는 여전히 금지이고, `.blink`는 `finished`인 동안 글자 `<div>` 하나에만 붙는다. `.pomodoro`·뽀모도 `<img>`에는 붙이지 않는다.
