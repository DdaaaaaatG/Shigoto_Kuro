# overlay 화면 상세 설계

| 항목 | 값 |
|---|---|
| 화면 | 오버레이 — `src/overlay/` · Tauri 창 라벨 `overlay` |
| 요구 | `src/overlay/requirements.md` **v3.2** (확정, R-01~R-40 — v3.2 = R-40 오버레이 오른쪽 클릭 메뉴 CR-062(§10.16, ui 몫 = WebView2 기본 메뉴 억제뿐, 계약 변경 없음)·R-28 용어 주. v3.1 = R-34 글자 기본값·R-39 기본 음량·내장 기본음 문구 갱신(CR-058 🔒, 요구ID 증감 없음). R-37~R-39 타이머 모드 CR-050(§10.15, contract v0.23 확정·TS 반영됨 — `get_alarm_sound`·`TimerSnapshot.mode/durationMs`·`'finished'`·`TimerSettings.alarmVolume`), R-33~R-36 뽀모도 타이머 CR-045(§10.14, timer 타입·`get_timer`·`set_resting`·`timer://changed`·슬롯 `pomo_char`·`pomo_bubble` — contract v0.21 확정·반영됨), R-32 타자 입력 1 선택 강등 CR-043, R-31 펜 손 단순화 CR-042, R-30 헤어(뒷머리) 파츠 CR-037, R-29 펜 모드 = `pen_up` && `mouse.penMode` CR-033, R-27 필수 이미지 강등(`idle`·`rest` 선택)·R-28 위치 잠금 중 동작 CR-029(소스 변경 없음), R-26 펜 모드 마우스 클릭 = 키 누름 CR-027, R-25 펜 쥔 손 파츠 CR-025, R-24 키 꾹 누름 부르르 CR-023, R-23 젤리 바운스 CR-022, R-22 특수 키 이미지 CR-021, R-10 폐기 → R-14, R-08 폐기 → R-18, R-02 폐기 → R-19, R-14 폐기 → R-20·R-21, R-06 폐기(CR-019, 대체 없음 — 쾅 메커니즘 삭제)) |
| 구성안 | ui-layout-designer 구성안 없음. **현행 소스 배치(as-built)를 수용**해 확정 표기한다 — 오버레이는 사용자 이미지만 겹치는 단일 캔버스라 선택할 레이아웃 패턴이 없다 |
| 계약 | `doc/200_설계/bridge/contract.md` 현행 **v0.27** (v0.27 = CR-058/059 0.4.0 기본 세트: `DEFAULT_TIMER_SETTINGS` textPos (268, 402)·rotation 7·alarmVolume 44 — §3.3. 인용만, 재정의 금지. 본문의 「v0.6」 등 옛 버전 표기는 그 행이 처음 인용된 시점의 버전이다) |
| 분할 문서 | §3 → `src/overlay/design/components.md` · §5 → `src/overlay/design/functions.md` · §9 → `src/overlay/design/a11y.md`(40KB 기준 분할, 절 번호 유지). RTM은 이 문서 §13 |
| 상태기계 | `src/state/inputMachine.ts`(순수 TS, §5 전이의 단일 구현) · `src/state/mouseMapping.ts`(좌표 순수 함수) |
| 레이아웃 확정 상태 | **확정(as-built 수용)** |
| 라이브러리 | 새 설치 없음 — react ^18.3.1·@tauri-apps/api ^2.2.0(bridge 래퍼 안에서만)·vitest ^2.1.8·@testing-library/react ^16.1.0 모두 `package.json`에 있음(`requirements.md` §4) |
| 모드 범위 | 마우스 파츠 모드는 **하나**다(CR-015, R-18 🔒 2026-09-23): 작은 손 그림을 `mouse.partPos`에 자연 크기로 놓고 어깨 축 회전. 손바닥 모드·팔 곡선(svg path)·모드 판별(`isMouseLayerMode`)은 **삭제**. 이 문서의 「레이어 이동 모드」 표현은 이 한 모드를 뜻한다 |
| 미확정 계약 | **없음(doc-sync 2026-09-30)** — 아래 CR-015·017·019·021·023·025·045의 계약은 contract v0.8~v0.21에서 모두 확정되어 `src/bridge/types.ts`·`commands.ts`·`events.ts`에 반영됐고 이 화면 소스가 사용한다(§7 표의 각 행에 확정 판 표기). 아래 원문은 설계 당시 기록으로 남긴다. / (당시 기록) **CR-025**: `AssetSlot` 펜 슬롯 `pen_up`·`pen_down_{n}`·`pen_key_{special}` 7종(🔒 이름, 선택, 캔버스 레이어 아님)·`MouseSettings.penPos: Point \| null`(🔒 이름, 기본 `null`) 추가 — **bridge 인계 필요**(`requirements.md` §3). 계약 확정 전 R-25 구현 금지(§10.7). / **CR-023**: `KeyboardInputEvent.repeat: boolean`(🔒 이름·의미 — 자동 반복 누름이면 `true`, 그때 `pressed = true`·`heldCount` 불변·`special`은 처음 값) 추가 — **bridge 인계 필요(core·bridge 설계 중)**(`requirements.md` §3). `src/bridge/types.ts`에 필드가 들어온 뒤 R-24 구현(§10.3). / **CR-021**: `KeyboardInputEvent.special`(🔒 이름·값 7종 — `undo` = Ctrl+Z 포함 — + `null`, 뗌 이벤트도 분류값) 추가·`AssetSlot` `'key_space'`·`'key_z'`·`'key_question'`·`'key_exclamation'`·`'key_enter'`·`'key_backspace'`·`'key_undo'`(🔒, 캔버스 레이어·선택) 추가(contract v0.10에 없음) — **bridge 인계 필요**(`requirements.md` §3). 계약 확정 전 R-22 구현 금지(§10.6). / **CR-019**: `Settings.slam`(`SlamSettings`) 삭제·`AssetSlot` `'slam'` 삭제(contract v0.9에 아직 있음) — **bridge 인계 필요**(`requirements.md` §3). 계약 개정 전에도 이 화면은 `slam` 필드·슬롯을 읽지 않는다(§4·§5.2·§5.3). / **CR-017**: `MouseSettings.area: [Point, Point, Point, Point]`(🔒 이름, 기본값 = core `settings.md` 기본값) 추가·`MouseSettings.pad` 삭제, 새 command `get_monitors` / 래퍼 `getMonitors(): Promise<ScreenBounds[]>`(🔒 이름) — **bridge 인계 필요**(`requirements.md` §3). 계약 확정 전 R-20·R-21 구현 금지. / CR-015(bridge v0.8에서 해소 — CR 대장 기준): `MouseSettings.partPos`(🔒 이름·기본 (389, 492)) 추가·`armWidth`·`armColor` 삭제, 기준점 `anchor` = 그림 좌표 + `partPos` — **bridge 인계 필요**(`requirements.md` §3). 계약 확정 전 이 부분 구현 금지 |
| 문서 상태 | **(doc-sync 2026-09-30) 설계 완료 R-01~R-40(폐기 R-02·R-06·R-08·R-10·R-14 제외) — 전부 소스 적용됨.** 근거: `src/overlay/index.tsx`·`components/*.tsx`·`src/state/*.ts`에 CR-008~CR-062 설계 요소(`getMonitors`·`jellyClass`·`.hairWrap`·`PomodoroLayer`·`setResting`·`special`·`repeat`·`pickPenKeyboardEntry`·`pickKeyboardEntry`의 `kb_up` 폴백·`preventContextMenu` 등)가 존재한다. 이 행 아래 「소스 미적용」·「계약 선행」 표기와 변경이력 각 행의 **소스 미적용** 표기는 그 행이 쓰인 시점의 기록이다. 동작 검증(「적용·미검증」 CR의 수동 확인)은 CR 대장이 기준이다. / (당시 기록) (CR-029 갱신) 설계 완료 R-27·R-28 — **오버레이 소스 변경 없음**(§10.9), 선행 조건 = core·bridge의 `positionLock` 창 속성 적용(contract v0.14). / (CR-027 갱신) 설계 완료 R-26(펜 모드 마우스 클릭 = 키 누름 — 새 계약 없음, 소스 미적용, 선행 조건 없음). / (CR-025 갱신) 설계 완료 R-25(펜 쥔 손 — 소스 미적용, bridge 펜 슬롯·`penPos` 계약 선행). / (CR-023 갱신) 설계 완료 R-24(키 꾹 누름 부르르 — 소스 미적용, bridge `repeat` 필드 선행). / (CR-022 갱신) 설계 완료 R-23(젤리 바운스, 새 계약 없음 — 소스 미적용, bridge 선행 조건 없음). / (CR-021 갱신) 설계 완료 R-22. 소스 미적용: R-22(bridge `special`·`key_*` 계약 선행). / (CR-017 갱신) 설계 완료 R-20·R-21(R-14 폐기). 소스 미적용: R-20·R-21(CR-017 — bridge `area`·`get_monitors` 계약 선행). / (CR-015 갱신) 설계 완료 R-01·R-03~R-07·R-09·R-11~R-19(R-02·R-08·R-10 폐기). 소스 미적용: R-18·R-19(CR-015 — bridge `partPos` 계약 선행). CR별 적용 여부의 최신 값은 RTM 비고·CR 대장이 기준이다. 아래는 CR-014 시점 기록: 설계 완료 R-01~R-09·R-11~R-17(R-10 폐기). 소스 미적용: R-11·R-14·R-15·R-16·R-17(CR-008·009·011·014 — R-17은 bridge `AssetSlot`에 `'background'` 추가(UI-B5)가 선행), R-03 창 자동 크기·조작 영역(CR-012, core·bridge·ui 모두 미적용) / core 구현 대기: R-13(CR-010, ui 변경 없음) / 계약 확정: `get_hand_anchor`·`assets://hand-anchor-changed`(contract v0.3 §3.6·§4·§5) |

## 변경이력

| 일자 | CR-ID | 내용 |
|---|---|---|
| 2026-09-23 | — | 최초 작성(보강 모드 문서화). 소스 기준 as-built 설계 + 확정 CR 반영 |
| 2026-09-23 | CR-001 | 쾅 = 동시 눌림 기준(§5.2 `reduce`, §10.2) — 소스 적용됨 |
| 2026-09-23 | CR-002 | 마우스 파츠 레이어 이동 모드·어깨 축 회전·z=0(§3, §10.1) — 소스 적용됨 |
| 2026-09-23 | CR-007 | 회전 기준 자동(알파 무게중심) — §5.4 신규 function 설계. **소스 미적용** |
| 2026-09-23 | CR-008 | 기준점 = 끝부분 무게중심, **Rust 계산**. ui의 `alphaCentroid`·`useAlphaCentroid`(Canvas 2D) 설계 삭제. `anchor` 상태·`get_hand_anchor`·`assets://hand-anchor-changed` 사용(§3, §4, §5.4, P-1, P-6, §7). `resolvePivot` 첫 인자 = bridge 기준점. **소스 미적용 · 계약 확정 대기** |
| 2026-09-23 | CR-009 | R-11/R-15 쉬는 위치: `armAtRest` 상태, 레이어 이동 모드 회전 0°, 손바닥 모드 `restPosition`(§4, §5.1, §5.4, P-3, P-4). 편차 → 설계 확정. **소스 미적용** |
| 2026-09-23 | CR-010 | R-13 위치 저장·복원은 core window 담당(500ms 디바운스). ui 변경 없음. 미확정 계약 → 확정(P-7, §7) |
| 2026-09-23 | — | 계약 동기화(contract v0.3): 손 기준점 command·event 「계약 확정 대기」→「확정」. 페이로드 타입 `HandAnchorChangedEvent`→`HandAnchorEvent`, 초기 로드 순서 = `onHandAnchorChanged` 구독 완료 후 `getHandAnchor()`(§3, §5.1, P-1, P-6 발생 조건, §7, §10.4 기본 `hand = null`, RTM R-14). **소스 미적용** |
| 2026-09-23 | CR-011 | R-16 마우스 팔 파츠 바운스: `MouseArm`에 `bounce` prop(= `machine.kbDown`), 바깥 래퍼 `<div className=armWrap>`에 `.bounce`(translateY), 안쪽 요소에 기존 회전·좌표(§3, §5.4, P-2, §10.1, §10.3). 두 모드 모두 적용. **소스 미적용** |
| 2026-09-23 | — | 설계 검증 반영: §4 상수 위치 정정(`TICK_MS`=`index.tsx`, 휠 0.05=`onWheel` 리터럴), §5.1 `onHandAnchorChanged` = 기존 `Subscriber<T>` 형태 명시, §5.4 손바닥 모드 도달 불가 대체 경로(4단계) 삭제, §5.4 손바닥 모드 `restPosition` = 설계 적용(손바닥 모드 보류 범위), §11 D-1~D-4 편차 수용 확정(사용자 승인 2026-09-23, D-1~D-3 후작업 정리), 헤더에 라이브러리 확인·모드 범위 행. R-03·조작 영역(이전 MAJOR-1)은 CR-012 설계로 해소 확인. 비 9:7 캔버스 여백 미포함(window D10) 유지 |
| 2026-09-23 | CR-012 | R-03 창 자동 크기 + 조작 영역: `.root` 450×350 고정·`overflow: visible` → `100vw×100vh`·`overflow: hidden`(창 전체가 드래그 R-12·Ctrl+휠 R-04 영역). 표시 배율 식·`transform-origin: top left`·가운데 정렬 없음은 core `window.md` §2.2와 같은 식이라 유지. 배율 변경 직후 1~2프레임 잘림/여백 수용(§2, §5.1, P-5, §10.5, RTM R-03). 근거 `doc/200_설계/core/window.md` §2.2·§9.2 UI-1~UI-3. **소스 미적용(core·bridge·ui)** |
| 2026-09-23 | CR-013 | 신고: 드래그 후 Ctrl+휠 시 창이 기본 자리로 이동. 원인 core `set_settings`의 창 위치 적용 → core·bridge가 제거하고 받은 `overlay.x/y` 무시(window.md §2.1.1, D17~D20). ui 변경 없음. P-5·P-7에 "`set_settings`는 창을 옮기지 않는다" 명시, RTM R-04·R-13 비고. **core·bridge 미적용** |
| 2026-09-23 | CR-014 | R-17 배경 레이어: 로컬 컴포넌트 `BackgroundLayer`(`background` 슬롯, 변형 없음, `React.memo`)를 `.canvas` 첫 자식으로 — 레이어 이동 모드 `MouseArm`(z0)보다 아래. 바운스 대상 요소(키보드·상태 `Layer`의 `<img>`, `MouseArm` `.armWrap`) 밖의 형제라 어떤 바운스도 걸리지 않음. 없으면 렌더 안 함. 같은 `.canvas` `scale`을 받아 좌표·맞춤·배율 동일(§1, §2, §3, §5.3, P-6, §8, §10.1, §10.3, §10.5, RTM). 근거 core `assets.md` §3.4·§9.4 UI-B1~B3. **소스 미적용 · bridge `AssetSlot` 확장(UI-B5) 선행** |
| 2026-09-23 | — | 재검증 MINOR 반영: 계약 인용 v0.6(§7 `background` 항목 가능, RTM R-03·R-04·R-17에 contract §5.2·§5.3·§3.1), 40KB 초과로 §3·§5·§9를 `design/components.md`·`design/functions.md`·`design/a11y.md`로 분할, `OverlayApp` 요구ID에 R-16·R-17, R-01 「배경 없음」 해석(§8), §5.1 기준점 효과 구독 실패 경로 `!cancelled` 조건 |
| 2026-09-23 | — | 문서 동기화(소스 변경 없음, 메인 세션 결정): §5.4 `armRotationDeg` 결과 범위 [−180, 180](정반대는 ±180, 화면상 동일, 예시 추가), §5.1 `onWheel` ② `preventDefault` = 시도(passive라 효력 보장 안 됨, 판정은 MC-06), §5.2 `tick`에 `slam`·기준 이상 유지 및 키 누른 채 무입력 → `rest`·누름 유지 as-built 규칙 명시, RTM 「예정 TC」 열 채움(scenarios.md 추적표 기준) |
| 2026-09-23 | CR-015 | 마우스 파츠 한 모드(R-18)·몸통 선택(R-19). 손바닥 모드 분기·팔 곡선·`restPosition` 손바닥 경로·`isMouseLayerMode` 삭제. `MouseArm`은 1개(z0), 안쪽 `<img className=hand>`를 `left/top = mouse.partPos`·크기 = `mouse_base` 항목 `width×height`(자연 크기)로 두고 `transformOrigin = 어깨 − partPos`로 어깨 축 회전. 바운스 래퍼·쉬는 위치 0°·기준점(bridge 캔버스 좌표) 유지. `mouseMapping.ts`의 `mapToPad`·`armControlPoint`·`armPath`·`restPosition` 삭제. body 없음 = 투명 정상, `kb_up` = 디폴트 상태 명시(§1, §2, §4, P-1·P-3·P-6, §7, §10.1, §10.3, §10.4, §11 D-3, §12, RTM — 분할 문서 `design/components.md` §3, `design/functions.md` §5.4). RTM에 「비고」 열 분리. **소스 미적용 · 계약 미확정(bridge 인계)** |
| 2026-09-23 | CR-017 | 이동 영역·팔 늘어나기(R-20·R-21 신설, R-14 폐기). 목표점 = 커서가 있는 모니터(없으면 가장 가까운 모니터) 내 비율 (u, v)를 `mouse.area` 네 꼭짓점에 쌍선형 보간. 팔 = 어깨 원점 `rotate(θt) scaleX(k) rotate(−θh)`, k = clamp(\|T−S\|/\|A−S\|, 0.5, 1.6). 순수 함수 `pickMonitor`·`cursorUv`·`bilerpQuad`·`armTransform`·`armTransformCss` 신설, `resolvePivot` 셋째 인자 `pad` → `area`(폴백 = 영역 중심), `armRotationDeg`·`mapAroundPivot` 삭제. 상태 `bounds` → `monitors`(`getMonitors()` 시작 1회, `getScreenBounds` 사용 중단), `MouseArm` prop `bounds` → `monitors`, 렌더 조건 `monitors.length > 0`. 바운스 래퍼·쉬는 위치(변형 없음)·배경 유지(헤더, §4, P-1·P-4·P-6, §7, §10.1, §10.3, §10.4, RTM — 분할 문서 `design/components.md` §3, `design/functions.md` §5.1·§5.4). **소스 미적용 · 계약 미확정(bridge 인계: `area`·`pad` 삭제·`get_monitors`)** |
| 2026-09-24 | CR-019 | 쾅(slam) 메커니즘 삭제(R-06 폐기, 대체 없음 — 사용자 결정 🔒 2026-09-24, 확정사항 §4·§5·§6). 상태기계: `LayerState`에서 `'slam'`, `MachineState.slamUntil`, `MachineConfig.slam` 삭제, `reduce` `key`의 쾅 판정·`tick`의 쾅 유지/만료 규칙 삭제 — 키 입력은 몇 개를 동시에 누르든 대기, 유휴 판정은 `now − lastInputAt ≥ idleMs` 하나. 키보드 누름 프레임 순환·바운스·유휴 판정은 유지. 레이어: `[z2]` = `idle`/`rest`만, 상태 레이어 `bounce` 삭제(`<Layer state/>`에 bounce 없음), §10.3 「쾅」 행 삭제. 상태 `settings` 기본값·`machine` 초기값·`config` 파생식에서 `slam` 삭제(§2 ASCII, §4, P-2, P-3, §10.1, §10.2, §10.3, RTM R-06 — 분할 문서 `design/functions.md` §5.1·§5.2·§5.3·§5.4 바운스 래퍼 5, `design/components.md` §3). **소스 미적용 · 계약 미확정(bridge 인계: `Settings.slam`·`AssetSlot` `'slam'` 삭제)** |
| 2026-09-24 | CR-021 | 특수 키 이미지(R-22 신설 — 사용자 결정 🔒 2026-09-24, 확정사항 §5). 상태기계: `MachineInput` `key`에 `special: SpecialKey \| null`, `MachineState.specialHeld: readonly SpecialKey[]`(초기 `[]`, 눌린 특수 키를 누른 순서로 — 누름 = 빼고 맨 뒤에 추가, 뗌 = 빼기, 모든 키 뗌 = 비우기), 순수 함수 `currentSpecial`·`isSpecialKey`, 타입 `SpecialKey`·상수 `SPECIAL_KEYS`. 레이어: `LayerStack.tsx`에 `SPECIAL_KEY_SLOT`·`pickKeyboardEntry`(kbDown이고 가장 최근 눌린 특수 키의 슬롯이 있으면 그 그림, 없으면 `kb_down` 프레임 순환 그대로). 특수 키 그림은 같은 키보드 `Layer` 요소 — 키보드·팔 바운스 트리거(`kbDown` `false→true`) 변경 없음. 입력 내용 비보관(분류값만, 이력·로그 없음)(§2 ASCII, §4, P-2, §7, §10.1, §10.3, §10.6 신규, RTM R-07·R-22 — 분할 문서 `design/functions.md` §5.1·§5.2·§5.3·§5.4 바운스 래퍼 5, `design/components.md` §3). **소스 미적용 · 계약 미확정(bridge 인계: `KeyboardInputEvent.special`·`AssetSlot` `key_*` 6종)** |
| 2026-09-24 | CR-021 (추가 결정) | 사용자 결정 🔒 2026-09-24(새 CR 없음, requirements v1.9). ① 특수 키 새 누름마다 바운스(다른 키 누른 채여도, 키보드·팔), 같은 특수 키 자동 반복은 재생 안 함 — `MachineState.bounceSeq`·`bouncePhase`·`BouncePhase`, keyframe `bounceAlt`·클래스 `.bounceAlt` 교대 재생, `Layer`·`MouseArm` `bounce` prop `boolean` → `BouncePhase` ② 7종째 `undo`(Ctrl+Z, 슬롯 `key_undo`, 「뒤로가기」) — `SpecialKey`·`SPECIAL_KEYS`·`SPECIAL_KEY_SLOT`에 추가, `specialHeld` 길이 ≤ 7 ③ 이전 특수 키 복귀 = 사용자 확인 완료(§4, §10.3, §10.6 규칙표 1~13행 — 분할 문서 `design/functions.md` §5.2·§5.3·§5.4 바운스 래퍼 5·6, `design/components.md` §3). 이 행이 위 CR-021 행의 「6종」·「바운스 트리거 변경 없음」을 대체한다 |
| 2026-09-24 | CR-022 | 바운스 = 젤리(R-23 신설 — 사용자 결정 🔒 2026-09-24, 확정사항 §4 키보드 파츠 행). 바운스 대상을 **키보드 `Layer`·`MouseArm` `.armWrap` 각각 → `.canvas` 안 래퍼 하나 `.jellyWrap`**(BackgroundLayer 다음 형제, 안에 `MouseArm`(z0)·`LayerStack` 전부)로 바꾼다. 클래스 `.jelly`/`.jellyAlt`(트리거 = 기존 `bouncePhase(machine)` 그대로, 짝 교대 규칙 그대로), keyframe `jelly`/`jellyAlt`(동일 값): 350ms `ease-in-out`, `transform-origin: 50% 100%`, `scale` 6단계 감쇠(1,1 → 1.06,0.92 → 0.97,1.04 → 1.02,0.98 → 0.99,1.01 → 1,1). 새 function `jellyClass`(`index.tsx`). 삭제: `Layer`·`MouseArm`의 `bounce` prop, `.bounce`/`.bounceAlt` 클래스와 keyframe `bounce`/`bounceAlt`(translateY 4px). `.armWrap`은 애니메이션 없는 컨테이너로 유지. 배경은 래퍼 밖이라 움직이지 않음(§1, §2 ASCII, §3·§5.1·§5.3·§5.4 — 분할 문서 `design/components.md`·`design/functions.md`, P-2, §10.1, §10.3, §11 D-3, RTM R-07·R-16·R-17·R-19·R-22·R-23). 새 계약 없음. **소스 미적용** |
| 2026-09-24 | CR-023 | 키 꾹 누름 = 부르르(R-24 신설 — 사용자 결정 🔒 2026-09-24, 확정사항 §4 키보드 파츠 행). 상태기계: `MachineInput` `key`에 `repeat?: boolean`, `MachineState.repeating`(초기 `false`)·`lastRepeatAt`(`0`)·`shiverSeq`(`-1`), 상수 `REPEAT_TIMEOUT_MS = 500`, 타입 `WrapMotion`, 순수 함수 `isRepeating`·`wrapMotion`. 반복 누름(`repeat && pressed`)은 `bounceSeq`·`kbFrame`·`specialHeld`를 바꾸지 않고 `repeating = true`, 반복 아닌 `key`는 `repeating = false`, `tick`은 마지막 반복 뒤 500ms면 `repeating = false`(뗌 누락 방어). 렌더: `.jellyWrap` 클래스 = `jellyClass(wrapMotion(machine))`(인자 `BouncePhase` → `WrapMotion`), 부르르 우선 — `.shiver`와 `.jelly`/`.jellyAlt` 동시 부착 금지, 부르르가 끝나도 같은 번호의 젤리를 다시 재생하지 않음(`shiverSeq`). keyframe `shiver`: 80ms `ease-in-out` `infinite`, 0% (1,1) → 25% (1.02,0.97) → 50% (1,1) → 75% (0.99,1.02) → 100% (1,1), 원점 = `.jellyWrap`의 `50% 100%`. 배경 제외·팔 변형 유지·입력 비보관 유지(헤더, §2 ASCII, §4, P-2, P-3, §7, §10.1, §10.3, §10.6 9행, RTM R-07·R-22·R-24 — 분할 문서 `design/functions.md` §5.1·§5.2·§5.4, `design/components.md` §3). **소스 미적용 · 계약 미확정(bridge 인계: `KeyboardInputEvent.repeat`)** |
| 2026-09-24 | CR-025 | 펜 쥔 손 파츠(R-25 신설 — 사용자 요청 CR-024 🔒 2026-09-24, 확정사항 §3 「펜 쥔 손 파츠」). 펜 모드 = `pen_up` 등록. 로컬 컴포넌트 `PenHand`(`.jellyWrap` 마지막 자식 = 맨 위, 팔(z0)·몸통·키보드 위). 손 그림 선택 `pickPenEntry`(누름 중 특수 키 `pen_key_*` → `pen_down[kbFrame]` → `pen_up`, 뗌 `pen_up`). 펜 모드에서 키보드 `Layer` = `kb_up` 고정, `config.kbFrames` = 펜 누름 그림 수. 위치·변형: 붙는 점 P = 쉬는 자세 `pen_up` 중심, P' = 팔 변형(어깨 원점 `rotate(θt) scaleX(k) rotate(−θh)`)으로 옮긴 점, 손 = `translate(P'−P) rotate(θt−θh)`(원점 P, 스케일 없음). 순수 함수 `armTransformFor`(MouseArm 1~5단계 추출)·`defaultPenPos`·`resolvePenPos`·`penTransform`·`penTransformCss`, 타입 `PenTransform`·상수 `PEN_REST`(`mouseMapping.ts`), `findByKey`·`isPenMode`·`penDownFrameCount`(`LayerStack.tsx`). `penPos === null` = 손 그림 중심을 `mouse.hand ?? 이동 영역 중심`에(§2, §4, P-2·P-4·P-6, §7, §8, §10.1, §10.7 신규, RTM R-19·R-22·R-25 — 분할 문서 `design/functions.md` §5.3·§5.4·§5.5 신규, `design/components.md` §3). **소스 미적용 · 계약 미확정(bridge 인계: 펜 슬롯·`penPos`)** |
| 2026-09-24 | CR-027 | 펜 모드 마우스 클릭 = 키 누름(R-26 신설 — 사용자 결정 🔒 2026-09-24, 확정사항 §3 「펜 쥔 손 파츠」 끝). 새 계약 없음(`input://mouse-button` `{ button, pressed, ts }` 재사용). 상태기계: `MachineState.clickHeld: readonly ClickButton[]`(초기 `[]`), 타입 `ClickButton`, `MachineConfig.clickPress?: boolean`(`OverlayApp`이 `isPenMode(manifest)`로 채움), 순수 함수 `isPressing`(= `kbDown \|\| clickHeld.length > 0`), `reduce` `mouseButton` 분기를 `onMouseButton`으로 추출 — 펜 모드 새 클릭 누름은 `kbFrame` +1(키와 같은 카운터)·아무것도 안 눌린 상태면 `bounceSeq` +1·`clickHeld`에 추가, 뗌은 항상 제거, `specialHeld`·`repeating`·`kbDown` 불변. `startsBounce` ⓐ·`bouncePhase`·`wrapMotion` ②·`pickPenEntry` ②의 `kbDown` → `isPressing`. `isRepeating`·`pickKeyboardEntry`·`mouse.button`(클릭 파츠)·키보드 레이어 `kb_up` 고정은 불변. 특수 키를 누른 채 클릭 = 일반 키 누름과 같음(`pen_key_*` 유지, 재생 없음)(헤더, §4, P-4, §7, §10.1, §10.3, §10.7, §10.8 신규, RTM R-09·R-25·R-26 — 분할 문서 `design/functions.md` §5.2·§5.5, `design/components.md` §3). **소스 미적용** |
| 2026-09-24 | CR-027 (TC 반영) | RTM만 갱신(`test/scenarios.md` v1.2 추적표 기준): R-26 「예정 TC」 = TC-001(개정)·TC-198(개정)·TC-204~TC-221 / 수동 TC-222·TC-203(개정) / TC-FLOW-10, R-09 +TC-206·207·214·218·219 / 수동 TC-222, R-23 +TC-205·208·209·214~217·219, R-24 +TC-210·217, R-25 +TC-212~214·216·220. 본문·소스 변경 없음 |
| 2026-09-24 | CR-029 | 설정 창 개편 SV2의 overlay 몫(사용자 결정 🔒 2026-09-24, 확정사항 §6 「설정 창 개편」 1·2·D-7). R-27(필수 = `kb_up`·`kb_down_0`·`mouse_base`, `idle`·`rest` 선택 — 없으면 `kb_up`), R-28(위치 잠금 중 클릭 통과·끌기 불가·Ctrl+휠 불가, 해제·잠금 중 배율은 설정 창). **판정: 오버레이 소스 변경 없음, `settings.positionLock` 참조 없음** — 잠금은 core가 `set_ignore_cursor_events`로 창 적중 판정에서 빼므로 드래그·휠이 WebView에 오지 않고(적용 후 emit), `LayerStack`은 미등록 상태 그림을 그리지 않고 `kb_up`을 그린다. 방어 코드 미채택 근거·잔여 위험(포커스 창 휠)·회귀 TC ①~⑨ 명시(헤더, P-5, P-7, §7 `positionLock` 행, §9 `design/a11y.md`, §10.9 신규, RTM R-04·R-12·R-19·R-27·R-28). 새 컴포넌트·상태·function·문구 없음 |
| 2026-09-24 | CR-033 | **펜 모드 판정 개정**(requirements v2.5 R-29, contract v0.15 `MouseSettings.penMode`). `isPenMode(manifest)` → `isPenMode(manifest, mouse)` = `pen_up` 등록 && `mouse?.penMode === true`. `OverlayApp`이 `penMode`를 한 번 계산해 `config`(`kbFrames`·`clickPress`)·`LayerStack`·`PenHand`에 넘긴다. `LayerStack`·`PenHand`에 prop `penMode: boolean` 추가 — 꺼짐이면 키보드 레이어는 `pickKeyboardEntry`(일반 동작), 손은 `pen_up` 고정(팔 끝 추종 유지), 클릭 누름 없음. `pickPenEntry` 불변. §10.10 신설(§4 `config` 식·§10.7 「펜 모드」 줄·§10.8 적용 조건을 대체), `design/functions.md` §5.3·§5.5, `design/components.md` §3, RTM R-29. **소스 미적용** |
| 2026-09-25 | CR-037 | **헤어(뒷머리) 파츠**(requirements v2.6 R-30, 확정사항 §6 「헤어(뒷머리) 파츠」 🔒 2026-09-25, contract v0.17 `AssetSlot` `'hair'`). 로컬 컴포넌트 `HairLayer`(`hair` 슬롯, `React.memo`, `BackgroundLayer`와 같은 순수 렌더 — `findEntry` 재사용, `styles.layer`, 없으면 `null`)를 **`.jellyWrap` 첫 자식**(`MouseArm` 앞)으로. 겹침(아래→위) = 배경 → 헤어 → 팔 → 본체(몸통·상태·키보드) → 펜 쥔 손. 젤리·부르르는 `.jellyWrap` 안이라 본체와 함께 받고, 배경만 밖. 1장 고정·위치 조정 없음(캔버스 레이어). 새 상태·function(렌더 외)·문구·CSS 클래스 없음(헤더, §1, §2 ASCII `[hair]`·아래 문단, §7 `hair` 행, §8, §10.1 hair 행·표 아래 문단, §10.11 신규, RTM R-30 — 분할 문서 `design/components.md` §3 표·렌더 조건·DOM 구조·규칙 7, `design/functions.md` §5.3 `HairLayer` 렌더). **소스 미적용 · 계약 v0.17(`AssetSlot` `'hair'`) `src/bridge/types.ts` 반영 선행** |
| 2026-09-25 | CR-039 | **초기 조회 재시도(델타, ui-fixer)** — P-1 초기 로드: `getSettings`·`getAssetManifest`·`getMonitors`가 실패하면 200·500·1000ms 간격으로 최대 3회 다시 조회(공용 `components/utils/fetchWithRetry`), 성공 시 중단·언마운트 시 취소, 끝내 실패하면 기존과 같이 문구 없는 빈 투명 창. 「실행 중 재조회 없음」(CR-017)은 유지 — 재시도는 시작 시 실패에만. 본문 §6 P-1·design/functions.md §5.1 반영은 ui-designer 동기화 몫 |
| 2026-09-25 | CR-042 | **펜 손 단순화**(requirements **v2.7** R-31, 확정사항 §6 「펜 손 단순화」 🔒 2026-09-25 — 이 행이 헤더 「요구」 칸의 v2.6을 v2.7로 갱신한다). 펜 모드(R-29) 손 그림 = 누름 중 `pen_down_0` 한 장(순환·`pen_key_*` 없음) — `pickPenEntry` 개정. 키보드 레이어 = 새 function `pickPenKeyboardEntry`(특수 키 누름 중 `key_{special}` 있으면 그것, 아니면 `kb_up`) — `LayerStack` 펜 모드 분기 개정. `config.kbFrames` = `penMode ? 1 : kbDownFrameCount(manifest)`, `penDownFrameCount` **삭제**. 젤리·부르르·클릭(CR-027)·꺼짐(CR-033)·위치·z 순서 불변. 새 계약·상태·문구·CSS 없음(§10.12 신규 — §10.7 손 그림 선택·키보드 레이어 고정 줄, §10.8 표 손 그림 열, §10.9.2 펜 모드 행, §10.10 `config` 식을 대체 / `design/functions.md` §5.5 끝 CR-042 개정 블록(§5.3 `penDownFrameCount`·`LayerStack` 렌더·`OverlayApp` `config` 포함), RTM R-22·R-25·R-26·R-31). **소스 미적용** |
| 2026-09-26 | CR-043 | 타자 입력 1 선택 강등(R-32 신설, requirements v2.8). 현행 `pickKeyboardEntry`는 `kb_down`이 하나도 없으면 누르는 동안 `undefined`(키보드 레이어 투명) — 미충족 판정. §10.13 신설: 반환식 끝 `?? findEntry(manifest, 'kb_up')`(시그니처 불변), 규칙 6행, 바운스만(젤리·부르르 불변), §10.6·functions.md §5.3·§10.9.2 필수 목록 대체 읽기. RTM R-32 추가·R-27 비고. 새 계약 없음. **소스 미적용**(`LayerStack.tsx` +1줄) |
| 2026-09-26 | CR-045 | **뽀모도 타이머 — 오버레이 몫**(requirements **v2.9** R-33~R-36, 확정사항 §6 뽀모도 타이머 🔒 2026-09-26, 결정 U-1 = 글자는 타이머 on 또는 뽀모도 그림 ≥1장일 때만). `.canvas` 자식 순서 = `BackgroundLayer` → **`PomodoroLayer`**(신규 로컬, `React.memo`, props `manifest`·`timer` — `pomo_char`·`pomo_bubble` `<img>` + `TimerText`, 래퍼 `.pomodoro`) → `.jellyWrap`(불변). 젤리·부르르 밖이라 배경처럼 고정. 신규 로컬: `PomodoroLayer`·`TimerText`·`isTimerTextVisible`. 신규 공용(화면 폴더 밖, 아키텍트 패킷 지정 — 설정 창 미리보기와 같은 계산을 한 곳에): `src/components/utils/timerClock.ts`(`elapsedNow`·`formatElapsed`·`timerTextStyle`·`nowMs`), `src/components/hooks/useTimerSnapshot.ts`(구독 먼저 → `fetchWithRetry(getTimer)`, 이벤트가 먼저면 조회 결과 버림), `src/components/hooks/useElapsedText.ts`(`running`일 때만 250ms interval, 글자가 바뀔 때만 setState). `OverlayApp`에 쉬는중 보고 효과 `useEffect([machine.layer])` → `setResting(layer === 'rest')`(실패 무시). 상태기계 불변. 오버레이 문구 없음(글자는 `aria-hidden`). CSS 클래스 `.pomodoro` 1개 추가(§1, §2 ASCII `[pomo]`, §4, P-8, §7, §8·§9, §10.1 pomo 행, §10.14 신규, RTM R-33~R-36 — 분할 문서 `design/components.md` §3 CR-045 블록, `design/functions.md` §5.6 신규). **소스 미적용 · bridge 패킷(contract v0.21) 선행** |
| 2026-09-26 | CR-050 | **타이머 모드 — 오버레이 몫**(requirements **v3.0** R-37~R-39, 사용자 결정 CR-048 🔒 2026-09-26 D-1~D-11, contract v0.23). ① 카운트다운 표시: `timerClock.ts`에 `snapshotMode`·`timerDisplayMs`·`formatRemaining`(올림)·`timerText`·`isTimerBlinking`, `useElapsedText`는 이름·반환(`string`) 불변·계산식만 `timerText` ② 끝남 깜빡임: `TimerText`에 `finished`면 `.blink`(신규 `TimerText.module.css`, keyframe `timerBlink` 1s, JS 타이머 없음) ③ 알림음: 신규 공용 `src/components/utils/alarmSound.ts`(`synthBeepWav`·`defaultAlarmUrl`·`alarmGain`·`playSound`), 신규 화면 로컬 훅 `src/overlay/hooks/useAlarmOnFinish.ts`(state 없음·ref만, `TimerText`에서 호출 — 구독 1개 유지), `useTimerSnapshot` 상태에 `fromEvent?` 1필드. `OverlayApp`·`PomodoroLayer`·`isTimerTextVisible`(U-1)·상태기계 불변. 새 문구 없음(§4, P-9, §7, §10.15 신규, RTM R-37~R-39 — 분할 문서 `design/components.md` §3.y·규칙 9, `design/functions.md` §5.7). **소스 미적용**. **설계 검증 MINOR 반영**(ui-design-checker PASS·MINOR 5건): `playSound` `new Audio`~`play()` 전부 try·`onFail` 항상 비동기(`queueMicrotask`)·정지 뒤 미호출 → `stopRef` 대입 후 `playDefault`가 기본음 정지 함수로 교체(§5.7 ④⑤, P-9, 15.2, TC-299·TC-303 단언 추가), P-9 ③ 음량 = `gainRef` 표현 통일, 15.1 1행 초기 `00:00:00` 수용 주, 15.3 표 배치 근거·잔여 위험(TimerText 미마운트 시 무음) 행, 깜빡임 CSS 값 유지·settings 동일 값 한 줄, 헤더 계약 버전 v0.23 |
| 2026-09-26 | CR-050 | **CR-050 구현 동기화**(동작 변경 없음 — 설계가 소스를 따라가는 정정). §10.15 15.7: 범위 TC-291~TC-313, TC-313(음량 배선 — `alarmVolume` 30 → 0.3, `settings://changed` 50 → 다음 회차 0.5) 행 추가, mock 보강 행 `getAlarmSound: () => Promise.resolve(null)`(스펙 관례). RTM R-39 예정 TC에 TC-313. `design/functions.md` §5.7: `synthBeepWav` 반환 `Uint8Array<ArrayBuffer>`(TS 5.9 제네릭 기본값), `alarmGain` `typeof` 가드 표기, `formatRemaining` 공유 함수 `hms` 미사용(as-built). `timerClock`·`useElapsedText`·`useTimerSnapshot`·`useAlarmOnFinish`·`TimerText` 시그니처는 §5.7과 일치 확인 |
| 2026-09-26 | CR-051 | **겹침 순서 변경 — 헤어를 배경 뒤로**(확정사항 §6 CR-051 🔒, CR-037의 헤어 자리 대체). 아래→위 = 헤어 → 배경 → 뽀모도(인물·말풍선·시간 글자) → `.jellyWrap`(팔 → 본체 → 펜 손 — 펜 손은 R-25대로 맨 위 유지). 헤어는 `.canvas` 첫 자식 `.hairWrap`(신규 CSS 클래스, `.jellyWrap`과 같은 7선언)으로 이동, hair 등록 시에만 렌더. `jellyClass(motion, base = styles.jellyWrap)`로 일반화, 렌더에서 `motion = wrapMotion(machine)` 1회 계산해 두 래퍼에 같은 클래스 → 같은 커밋에서 젤리·부르르 동기 시작(젤리 도중 신규 등록 시 1회 위상 어긋남 허용). `hasHair = useMemo(findEntry(manifest,'hair'), [manifest])`. 배경·뽀모도 고정 불변, 계약 변경 없음(§1, §2 ASCII·`[hair]` 문단, §10.1 hair 행, §10.11 자리·모션, §10.14 14.1 DOM — 분할 문서 `design/components.md` §3 표·DOM 트리·규칙 7, `design/functions.md` HairLayer·`jellyClass` 행). **소스 적용**(ui-debug) |
| 2026-09-26 | CR-052 | **알림음 반복 재생**(확정사항 CR-048 블록 「수정 (CR-052)」 🔒): §10.15 15.2 판정표 3행·재생 순서·반복 규칙 절 갱신(1회 → 끝남 10초 동안 loop, 정지 경로 불변). `design/functions.md` §5.7 ④ `playSound` 시그니처에 `loop = false` 추가. 관련 R-37·R-38·R-39 |
| 2026-09-27 | CR-053 | **배포용 기본 세트 3차**(확정사항 CR-053 🔒, contract v0.24): `DEFAULT_TIMER_SETTINGS` 글자 위치 (142,458)·회전 9°, 기본 그림 7장(hair·pomo_char 추가, kb_down_0 제외). 오버레이는 bridge 상수·매니페스트를 그대로 쓰므로 설계·소스 변경 없음(인용 값만 갱신) |
| 2026-09-27 | CR-055 | **알림음 1회 재생 복원**(사용자 🔒 2026-09-27, 베타 테스터 피드백 — CR-052 반복 재생 부분 폐기): §10.15 15.2 판정표 3행·재생 순서·반복 규칙 절을 1회 재생으로 갱신(`playSound` 4번째 인자 `true` 제거). 정지 경로(판정표 6·7행)·깜빡임 10초·설정 창 미리 듣기 불변. `design/functions.md` §5.7 ④ `playSound` 시그니처 설명 갱신. requirements R-39 원문(「1회 재생(반복 없음)」)과 일치 |
| 2026-09-29 | CR-058, CR-061 | **문서 동기화 — 0.4.0 기본 세트(소스가 정답, 동작 설계 변경 없음)**. CR-058(사용자 🔒 2026-09-28, contract v0.27): 내장 기본음 = 번들 mp3 `src/assets/sounds/default-alarm.mp3`(`defaultAlarmUrl()`이 Vite 정적 자산 URL 반환, 시그니처 불변), 옛 합성 비프음(`synthBeepWav`·`BEEP_*` 7상수·Blob URL 캐시) 서술 삭제, 기본 음량 80 → **44**, `DEFAULT_TIMER_SETTINGS` 인용값 textPos (268,402)·rotation 7(이전 인용 (268,403)·5 — CR-053의 (142,458)·9 행은 이력으로 유지). CR-061(순수 리팩터): `DEFAULT_ALARM_VOLUME` = `DEFAULT_TIMER_SETTINGS.alarmVolume ?? 44` 단일 소스, `useElapsedText` 효과의 즉시 반영 `calcNow()` 1회(`initial`). 반영 위치: 헤더(요구 v3.1·계약 v0.27), §4 `timer` 행, P-9 ③, §7 `TimerSettings.alarmVolume` 행, §10.14 14.8 ④, §10.15 15.2·15.3(`BEEP_AMPLITUDE` 행 → 번들 mp3 결정 행)·15.4·15.7(TC-286·297·298·299·300·307·mock 행), RTM R-34·R-39 비고 — 분할 문서 `design/functions.md` §5.7 ②④, `design/components.md` §3.y `alarmSound` 행. requirements v3.1(R-34·R-39 🔒 문구 갱신, 출처 CR-058) |
| 2026-09-29 | CR-062 | **오버레이 오른쪽 클릭 메뉴 — ui 몫**(requirements **v3.2** R-40 신설 🔒 2026-09-29 사용자 피드백·결정 U-1·U-3·U-5, U-2·U-4 수용 / R-28 용어 주, 횡단 설계 `doc/200_설계/architecture/overlay-context-menu.md` v2 §2.7·§6). 트레이와 같은 메뉴의 판정(창 사각형·누름/뗌·숨김·전체 화면)·팝업·항목 동작은 **core(tray·hook)** 소관이고 ui는 메뉴를 그리지 않는다. ui 몫 = `.root`에 `onContextMenu={preventContextMenu}`(모듈 수준 `const preventContextMenu = (e: MouseEvent<HTMLDivElement>) => e.preventDefault()`, react `type MouseEvent` import) 1개 — WebView2 기본 메뉴 억제, 부작용 없음, 끌기·Ctrl+휠·입력 이벤트 불변. 전체 화면 판정·`positionLock` 읽기 없음, 새 bridge 래퍼·command·event 없음(contract v0.27 유지). 새 상태·문구·CSS 없음(헤더, §2 ASCII `.root` 줄, P-10 신규, §7 창 기능 행, §9·`design/a11y.md` 오른쪽 클릭, §10.9.1 L-8, §10.16 신규, RTM R-28 비고·R-40 — 분할 문서 `design/functions.md` §5.1 `preventContextMenu`, `design/components.md` §3 `OverlayApp` 행). **소스 미적용**(`index.tsx` import 1곳 + 상수 1줄 + JSX 속성 1개) |
| 2026-09-30 | — (doc-sync, 99fe564..2be41ce) | **문서 동기화 — 소스가 정답, 동작 설계 변경 없음.** ① §10.16 16.1 중복 팝업 가드 이름 `POPUP_OPEN` → core `PopupGate`(Idle → Pending → Open → Idle, 횡단 설계 v3 §2.6 — v2 `POPUP_OPEN` 폐기) ② 「미확정 계약」·「소스 미적용」 표기 정리: 헤더 「미확정 계약」·「문서 상태」 행에 현행 판정(미확정 계약 없음·R-01~R-40 전부 소스 적용) 머리말 추가(옛 문장은 당시 기록으로 보존), §7 표 `get_monitors`(v0.9)·`special`(v0.11)·`repeat`(v0.12)·`key_*`(v0.11)·`hair`(v0.17)·`get_timer`·`set_resting`·`timer://changed`·`Settings.timer`·`pomo_*`(v0.21)·`partPos`·기준점 의미(v0.8)·`area`(v0.9)·펜 슬롯·`penPos`(v0.13)를 **확정·반영됨**으로, §7 끝 문단(래퍼 반영됨), P-2 펜 모드 설명(CR-042 반영), P-6 `partPos` 재계산(v0.8 확정), §10.4 기본 마우스 설정 현행값(어깨 (582,484)·`partPos` (411,464)·`penPos` (372,476)·`penMode` true — CR-044), §10.6·§10.7 「계약 선행」 줄, RTM R-03·R-15·R-18·R-20~R-26·R-29~R-36 비고·계약 열(소스 적용됨·확정 판), 분할 문서 `design/components.md` `MouseArm`·`PenHand` 행·렌더 조건 `MouseArm`·`LayerStack`, `design/functions.md` `SpecialKey`·`SPECIAL_KEY_SLOT`·`Quad`·`partPos`·삭제 목록 두 행. 변경이력 각 행의 **소스 미적용** 표기는 그 날짜의 기록으로 둔다(현행 = 적용) ③ `PenHand` Props as-built 8개(`penMode` 포함, `machine`은 `isPressing`만): `design/functions.md` §5.5 Props 표·머리글(`pen_down_0`), 입력 비보관 문단, `design/components.md` `PenHand` 행, 주 문서 §10.12 Props 줄·대체 문장 추가 ④ RTM R-16 예정 TC = scenarios 추적표 R-16 행(TC-044~TC-046·TC-054·TC-080·TC-081·TC-100·TC-105, TC-055 폐기 주)으로 정리, R-19·R-22 비고의 CR-025 옛 펜 서술을 CR-042로 정정 ⑤ 0.4.0 기본값(textPos (268,402)·rotation 7·음량 44·`DEFAULT_ALARM_VOLUME` 단일 소스)은 CR-058·CR-061 행에서 이미 반영 — 본문 확인만. CR 상태(「적용·미검증」)는 바꾸지 않음 |

---

## 1. 개요

오버레이는 방송 화면 위에 떠 있는 투명한 「스티커 판」이다. 판 위에 사용자 PNG를 순서대로 겹쳐 두고, 입력이 오면 어느 장을 보일지와 팔을 얼마나 돌리고 늘릴지(CR-017)만 바꾼다.

- 입력: bridge 이벤트(키보드·마우스 이동·마우스 버튼) + 100ms tick + 설정·매니페스트.
- 처리: `src/state/inputMachine.ts`의 `reduce`가 레이어 상태를 계산(순수). 마우스 좌표는 `src/state/mouseMapping.ts`가 계산(순수).
- 출력: `BackgroundLayer`(배경, 맨 아래·고정 — 판 자체에 붙인 뒤판 그림이라 입력이 와도 절대 바뀌지 않는다), 그 위 젤리 래퍼 `.jellyWrap`(CR-022 — 키 누름마다 안의 그림 전부가 한 덩어리로 출렁인다) 안에 `HairLayer`(뒷머리, CR-037 — 팔 뒤에 보이도록 래퍼 안 맨 아래), `MouseArm`(마우스 파츠)과 `LayerStack`(몸통·상태·키보드), `PenHand`(펜 쥔 손) 렌더. (CR-045) 배경과 `.jellyWrap` 사이에 `PomodoroLayer`(뽀모도 인물·말풍선·시간 글자 — 배경처럼 고정, §10.14).
- 창 라벨 분기: `src/main.tsx`가 창 라벨이 `settings`가 아니면 `./overlay`를 지연 로딩하고 `document.body.dataset.window = 'overlay'`를 넣는다(등록 완료, 신규 창 아님).

## 2. 레이아웃 (확정 — as-built 수용)

```
+-- overlay window (transparent, no border, always on top) --+
| .root  100vw x 100vh  data-tauri-drag-region  onWheel      |
|        onContextMenu -> preventDefault only (R-40)         |
|  +-- .canvas  (canvas W x H, transform: scale(s)) ------+  |
|  |  [hair] .hairWrap > HairLayer (same jelly, bottom)   |  |
|  |  [bg] background      (BackgroundLayer, static)      |  |
|  |  [pomo] char, bubble, time (PomodoroLayer, static)   |  |
|  |  +-- .jellyWrap (jelly|shiver, origin 50% 100%) --+  |  |
|  |  | [z0] MouseArm   (hand img at partPos, rotate)  |  |  |
|  |  | [z1] body       (LayerStack, optional)         |  |  |
|  |  | [z2] idle|rest  (LayerStack)                   |  |  |
|  |  | [z3] kb_up|kb_down n|key_* (LayerStack)        |  |  |
|  |  | [pen] pen hand (PenHand, top, follows arm end) |  |  |
|  |  +------------------------------------------------+  |  |
|  +------------------------------------------------------+  |
+------------------------------------------------------------+
```

- z 순서는 `z-index`가 아니라 **DOM 순서**로 만든다(뒤에 오는 형제가 위). `[bg]` 배경(CR-014, R-17)은 `.canvas`의 **첫 자식**이라 모든 레이어 아래다(레이어 이동 모드 `[z0]` `MouseArm`보다도 아래).
- `[pomo]` 뽀모도(CR-045, R-33·R-34)는 `.canvas`의 직계 자식 `PomodoroLayer`이며 형제 순서는 **`BackgroundLayer` 다음, `.jellyWrap` 앞**이다 — 배경 위, 본체 덩어리(헤어·팔·몸통·키보드·펜 손) 아래. 안의 순서(아래→위)는 뽀모도 인물(`pomo_char`) → 말풍선(`pomo_bubble`) → 시간 글자(`TimerText`). `.jellyWrap` 밖이라 젤리·부르르를 받지 않는다(배경처럼 고정). 그릴 것이 하나도 없으면(그림 두 장 없음 + 글자 조건 거짓) `null`이라 DOM에 없다(§10.14).
- `.jellyWrap`(CR-022, R-23)은 `.canvas`의 **둘째 자식**(배경 다음 — CR-045 이후에는 `PomodoroLayer`가 있으면 그 다음, 즉 `.canvas`의 마지막 자식)이며 `[z0]`~`[z3]`을 모두 감싼다. 키 누름 젤리 출렁임과 키 꾹 누름 부르르(CR-023, R-24)는 이 요소 하나에만 걸린다(둘 중 하나씩만) — 안의 레이어는 한 덩어리로 출렁이거나 떨고, 밖의 배경은 움직이지 않는다(§10.3). 캔버스와 같은 크기·원점이라 안쪽 레이어의 좌표는 바뀌지 않는다.
- `[hair]` 헤어(뒷머리, CR-037, R-30)는 `.jellyWrap`의 **첫 자식**이다 — 배경보다 위, 팔(`[z0]`)보다 아래. 장발 캐릭터의 뒷머리를 본체 그림에서 떼어 따로 그린 한 장이라, 팔·손이 뒷머리 **앞**으로 지나가게 보인다. 래퍼 안이라 젤리·부르르를 본체와 함께 받는다(§10.11). 등록돼 있을 때만 그린다(선택). (CR-051 🔒 2026-09-26, 이 문단의 헤어 자리 서술을 대체) 헤어는 `.jellyWrap` 밖 `.canvas` **첫 자식** `.hairWrap` 안에 있다(hair 등록 시에만 렌더). 겹침 아래→위 = 헤어 → 배경 → 뽀모도 → `.jellyWrap`(팔 → 본체 → 펜 손). `.hairWrap`은 `.jellyWrap`과 같은 기하·기준점(50% 100%)이고 같은 `wrapMotion(machine)` 값에서 나온 `.jelly`/`.jellyAlt`/`.shiver`를 같은 커밋에 받아 본체와 동기로 출렁인다(§10.11).
- 마우스 파츠는 `[z0]` 한 자리뿐이다(CR-015, R-18). 이전 `[z4]` 손바닥 모드 자리는 삭제됐다. `[z0]`의 손 그림은 캔버스 전체가 아니라 `mouse.partPos`에 자연 크기로 놓인다(§10.1, §10.4).
- `[pen]` 펜 쥔 손(CR-025, R-25)은 `.jellyWrap`의 **마지막 자식**이라 모든 레이어 위다. `pen_up`이 등록돼 있을 때만 그린다(§10.7). 팔(`[z0]`)은 몸통 아래, 손은 몸통·키보드 위 — 레퍼런스처럼 팔은 몸 뒤로 들어가고 펜 쥔 손은 몸 앞(책상 위)에 보인다.
- `[z1]` 몸통은 **선택**이다(R-19). 없으면 그 자리는 투명이며 정상 상태다(오류·안내 없음). 디폴트 상태 그림은 `[z3]` `kb_up`이다 — 캐릭터 전체를 `kb_up` 한 장에 그려도 된다.
- `.canvas`는 매니페스트 `canvas`가 있을 때만 렌더한다. `canvas === null`이면 빈 투명 창.
- `.root` = **창 전체**(`src/overlay/overlay.module.css` `.root`: `width: 100vw; height: 100vh; overflow: hidden`, CR-012). 창 크기는 core window 모듈이 표시 크기로 맞춘다(`doc/200_설계/core/window.md` §2.2 `resize_overlay` — 시작·배율 변경·캔버스 변경 시, 좌상단 고정, 논리 px. 호출 시점은 contract v0.6 §5.2 창 리사이즈 부수 효과). ui는 창 크기를 받지 않고 같은 식(§10.5)으로 스스로 그린다.
- 이전 450×350 고정·`overflow: visible`은 폐기한다. 고정 크기이면 배율 > 100%(예: 200% = 900×700 창)에서 450×350 밖 영역이 `.root`에 속하지 않아 드래그(R-12)·Ctrl+휠(R-04)이 먹지 않는다. `100vw×100vh`이면 창 어디를 잡아도 `.root`가 받는다(`.canvas`는 `pointer-events: none`, P-7).
- `overflow: hidden`: 배율 변경 직후 core 리사이즈가 끝나기 전 1~2프레임 동안 콘텐츠가 창보다 크면 잘리고, 작으면 투명 여백이 보인다. **수용**(추가 동기화 없음, window.md §9.2 UI-3). 스크롤바는 생기지 않는다.

## 3. 컴포넌트 설계

**분할 문서: [`design/components.md`](design/components.md)** — 컴포넌트 표(`OverlayApp`·`BackgroundLayer`·`LayerStack`·`Layer`·`MouseArm`·`useBridgeEvent`, 출처·props·이벤트·요구ID), 렌더 조건 표(`.jellyWrap` 포함, CR-022), 배경·젤리 DOM 구조(격리 규칙 1~5)가 있다.

## 4. 상태

| 상태 | 용도 | 타입 | 초기값 | 소유 |
|---|---|---|---|---|
| `settings` | 배율·유휴·마우스 설정 | `Settings` | `DEFAULT_SETTINGS`(`src/bridge/types.ts`: scale 1, idleSeconds 300, mouse `DEFAULT_MOUSE_SETTINGS`). `slam` 필드는 없다(CR-019 — bridge 개정 전까지 타입에 남아 있어도 이 화면은 읽지 않는다) | 로컬 `useState` (`OverlayApp`) |
| `manifest` | 등록 이미지 목록·캔버스 크기 | `AssetManifest` | `EMPTY_MANIFEST = { canvas: null, entries: [] }` | 로컬 `useState` |
| `monitors` (CR-017, 옛 `bounds` 대체) | 모니터 사각형 목록(커서가 있는 모니터 찾기·모니터 내 비율 계산, R-20). 물리 px, 입력 훅과 같은 좌표계 | `ScreenBounds[]` | `[]` | 로컬 `useState` (`OverlayApp`). 시작 시 `getMonitors()` 1회로 교체(`design/functions.md` §5.1 모니터 목록 로드) |
| `machine` | 레이어·키보드 프레임·마우스 좌표/버튼 | `MachineState` | `createInitialState(Date.now())` = `{ layer:'idle', heldCount:0, kbDown:false, kbFrame:0, mouse:{x:0,y:0,button:'none'}, lastInputAt: now, specialHeld: [], bounceSeq: 0, repeating: false, lastRepeatAt: 0, shiverSeq: -1, clickHeld: [] }`. CR-027: `clickHeld: readonly ClickButton[]`(펜 모드에서 지금 눌린 클릭 버튼 — 누름 판정 `isPressing`, `design/functions.md` §5.2). CR-023: `repeating: boolean`(자동 반복 누름이 이어지는 중), `lastRepeatAt: number`(마지막 반복 누름 `ts`, 끊김 방어용), `shiverSeq: number`(부르르가 시작될 때의 `bounceSeq` — 부르르 뒤 젤리 재재생 방지). 렌더는 `wrapMotion(machine)`(`design/functions.md` §5.2). `bounceSeq: number`(CR-021 추가 결정 — 바운스 재생 신호, 렌더는 `bouncePhase(machine)`, `design/functions.md` §5.2). `layer: LayerState = 'idle' \| 'rest'`(CR-019: `'slam'`·`slamUntil` 삭제). `specialHeld: readonly SpecialKey[]`(CR-021 — 지금 눌려 있는 특수 키 분류값, 누른 순서, 길이 ≤ 7, 이력 아님. 규칙 §10.6) | `useReducer` — 로직은 `src/state/inputMachine.ts` |
| `config` | 상태기계 설정 | `MachineConfig = { idleMs: number; kbFrames: number; clickPress?: boolean }`(CR-019: `slam` 삭제. CR-027: `clickPress` 추가 — 없으면 `false`) | `useMemo`: `{ idleMs: settings.idleSeconds*1000, kbFrames: isPenMode(manifest) ? penDownFrameCount(manifest) : kbDownFrameCount(manifest), clickPress: isPenMode(manifest) }`(CR-025 — 펜 모드에서는 보이는 누름 그림이 `pen_down_*`이므로 그 수로 순환, `design/functions.md` §5.3. CR-027 — 펜 모드면 클릭 누름도 키 누름처럼 센다, `design/functions.md` §5.2 `onMouseButton`. 의존성 배열은 기존 `[settings.idleSeconds, manifest]` 그대로) | 파생 |
| `configRef` | reducer가 최신 config를 읽는 통로(reducer 재생성 방지) | `MutableRefObject<MachineConfig>` | `config` | 로컬 ref |
| `anchor` (CR-008) | 손 기준점(Rust가 계산한 `mouse_base` 끝부분 무게중심, 캔버스 좌표) | `Point \| null` | `null` | 로컬 `useState` (`OverlayApp`). `getHandAnchor()`·`assets://hand-anchor-changed`로 교체 |
| `armAtRest` (CR-009) | 마우스 파츠를 쉬는 위치에 둘지(첫 마우스 이동 전·쉬는중 진입 후 다음 이동 전) | `boolean` | `true` | 로컬 `useState` (`OverlayApp`). 규칙 §5.1 |
| `timer` (CR-045, 파생) | 시간 글자 설정(위치·회전·크기·색·on/off) | `TimerSettings` | `settings.timer ?? DEFAULT_TIMER_SETTINGS`(`src/bridge/types.ts` — 기본 enabled `false`, mode `'stopwatch'`, countdownSecs `1500`, alarmVolume `44`, textPos `{x:268,y:402}`, rotation `7`, fontSize `36`, color `'#333333'` — contract v0.27 §3.3, CR-058) | 파생(`OverlayApp` 렌더 지역값 — `useMemo` 불필요: `settings.timer`는 `settings`가 바뀔 때만 새 참조, `DEFAULT_TIMER_SETTINGS`는 모듈 상수라 `PomodoroLayer` memo가 유지된다) |
| `{ snapshot, receivedAt }` (CR-045) | core 타이머의 마지막 스냅숏과 받은 시각 | `{ snapshot: TimerSnapshot; receivedAt: number }` | `{ snapshot: { status: 'stopped', elapsedMs: 0 }, receivedAt: 0 }` | 공용 훅 `useTimerSnapshot` 내부 `useState`(호출자 = `TimerText`). `OverlayApp`에는 없다(초 갱신이 `OverlayApp`을 다시 그리지 않게) — `design/functions.md` §5.6 |
| `text` (CR-045) | 화면에 보이는 `HH:MM:SS` | `string` | `formatElapsed(elapsedNow(snapshot, receivedAt, nowMs()))` — 초기 스냅숏이면 `'00:00:00'` | 공용 훅 `useElapsedText` 내부 `useState` + 마지막 값 ref(호출자 = `TimerText`) — `design/functions.md` §5.6 |
| `text` (CR-050 개정) | 위 행의 계산식 개정 — 카운트다운 남은 시간 올림 표기 | `string` | `timerText(snapshot, receivedAt, nowMs())` — 초기 스냅숏(`mode` 없음 = 스톱워치)이면 `'00:00:00'` | 같음(`useElapsedText`) — `design/functions.md` §5.7 ② |
| `fromEvent` (CR-050) | 스냅숏을 이벤트로 받았는지(첫 조회 `finished` 무음 판정, R-39) | `boolean \| undefined`(`TimerSnapshotState.fromEvent?`) | `false`(초기), 조회 결과 `false`, 이벤트 `true` | 공용 훅 `useTimerSnapshot` 내부 `useState`(스냅숏과 한 객체) — `design/functions.md` §5.7 ③ |
| 깜빡임 여부 (CR-050, 파생) | `finished`면 글자 깜빡임 | `boolean` | `isTimerBlinking(snapshot)` — 초기 `false` | 파생(`TimerText` 렌더 지역값, 상태 아님) |
| `prevStatusRef`·`stopRef`·`genRef`·`gainRef` (CR-050) | 알림음 전이 판정·정지 함수·비동기 결과 폐기 회차·최신 음량 | `TimerStatus \| null` · `(() => void) \| null` · `number` · `number` | `null` · `null` · `0` · `alarmGain(timer)` | 화면 로컬 훅 `useAlarmOnFinish`의 ref(React state 없음 — 리렌더를 일으키지 않는다, 호출자 `TimerText`) — `design/functions.md` §5.7 ⑤ |

(CR-045) 타이머 경과·상태의 소유자는 core `timer` 하나다. 오버레이는 경과를 저장하거나(localStorage 등) 쉬는 동안 스스로 멈추지 않는다 — 받은 스냅숏만 표시한다.

상수(위치는 현행 소스 그대로):

| 상수 | 값 | 위치 |
|---|---|---|
| `TICK_MS` | `100` | `src/overlay/index.tsx` 모듈 상수 |
| Ctrl+휠 한 칸 | `0.05` | `onWheel` 내부 리터럴(`e.deltaY < 0 ? 0.05 : -0.05`, 이름 붙은 상수 없음) |
| `BASE_BOX` | `{ width: 450, height: 350 }` | `src/bridge/types.ts` |
| `SCALE_MIN` / `SCALE_MAX` | `0.25` / `2` | `src/bridge/types.ts` |
| `REPEAT_TIMEOUT_MS` (CR-023) | `500` | `src/state/inputMachine.ts` export(설정값 아님) — 마지막 반복 누름 뒤 이만큼 반복이 없으면 `tick`이 부르르를 끈다(근거 `design/functions.md` §5.2) |
| `STRETCH_MIN` / `STRETCH_MAX` (CR-017) | `0.5` / `1.6` | `src/state/mouseMapping.ts` export(설정값 아님, 🔒) — 나머지 CR-017 상수·타입(`Quad`·`ArmTransform`·`ARM_EPS`·`REST_TRANSFORM`)은 `design/functions.md` §5.4 |

## 5. 기능 명세

**분할 문서: [`design/functions.md`](design/functions.md)** — §5.1 화면(`clampScale`·`reducer`·`onWheel`·표시 배율 계산·tick 효과·마우스 이동 핸들러·쉬는중 진입 효과·기준점 효과), §5.2 상태기계(`src/state/inputMachine.ts` 인용), §5.3 레이어(`findEntry`·`kbDownFrameCount`·`BackgroundLayer` 렌더·`LayerStack` 렌더), §5.4 마우스 파츠(이미지 선택·`resolvePivot`·`pickMonitor`·`cursorUv`·`bilerpQuad`·`armTransform`·`armTransformCss`와 CR-017 상수·타입, `MouseArm` 렌더(한 모드, CR-015·CR-017)·`.armWrap` 컨테이너 1~6(CR-022 — 옛 바운스 래퍼), 삭제 목록 — `armRotationDeg`·`mapAroundPivot` 포함). §5.1에 모니터 목록 로드(CR-017)가 있다. §5.5 펜 쥔 손(CR-025), §5.6 뽀모도 타이머(CR-045), §5.7 타이머 모드 — `timerClock` 추가 함수·`useElapsedText` 개정·`useTimerSnapshot` `fromEvent`·`alarmSound.ts`·`useAlarmOnFinish`·`TimerText` 렌더 개정(CR-050). 이 문서의 「§5.x」 참조는 그 파일의 같은 절을 가리킨다.

## 6. 파이프라인

| # | 흐름 | 정상 | 오류 |
|---|---|---|---|
| P-1 | 초기 로드 | 마운트 시 `getSettings`·`getAssetManifest`·`getMonitors`(CR-017, 옛 `getScreenBounds` 대체 — 앱 시작 1회, 실행 중 재조회 없음)를 동시에 호출 → 각각 상태 교체 → 렌더. 손 기준점(CR-008)은 별도 기준점 효과(§5.1)가 계약 §3.6 순서대로 `onHandAnchorChanged` 구독 완료 **후** `getHandAnchor()`를 호출해 `anchor`를 채운다(앱 시작 계산값은 이벤트로 오지 않고 조회로만 받는다 — contract §4). 이 시점 `armAtRest = true`라 손 그림은 `partPos`에 회전 0°(CR-009, CR-015) | 각 호출 실패는 무시하고 초기값 유지: 설정 실패 = 기본값으로 동작, 매니페스트 실패 = 빈 창(`.canvas` 없음), 모니터 목록 실패 = `monitors = []` → 마우스 파츠 미표시, 기준점 실패 = `anchor = null` → 폴백(`mouse.hand` → 이동 영역 중심, CR-017). 오버레이는 문구를 표시하지 않는다(R-01) |
| P-2 | 키 입력 | `input://keyboard` → `dispatch({type:'key', pressed, heldCount, special, repeat, ts})`(CR-021: `special` = 7종 분류값 또는 `null`, 보관·로그 없음. CR-023: `repeat` = 자동 반복 누름 여부) → `LayerStack` 재렌더(누름 프레임 또는 특수 키 그림(`pickKeyboardEntry`, §10.6). 상태 레이어는 `idle` — 동시 키 수와 무관, CR-019) + `.jellyWrap` 클래스 = `jellyClass(wrapMotion(machine))`(CR-022 — 첫 누름·특수 키 새 누름마다 `bounceSeq` +1로 `.jelly`/`.jellyAlt` 교대 재생, 배경 뺀 모든 레이어가 한 덩어리로 출렁임. CR-023 — 자동 반복 누름이 오면 `.shiver`(부르르)로 바뀌어 반복이 이어지는 동안 계속 떨고, 뗌·다른 키 새 누름이면 멈춤. 반복 누름은 프레임·특수 키 그림·`bounceSeq`를 바꾸지 않음, §10.3). `LayerStack`·`MouseArm`에는 바운스 값을 넘기지 않는다. `armAtRest`는 바뀌지 않음. (CR-025 → CR-042 개정, §10.12) 펜 모드면 키보드 `Layer`는 `pickPenKeyboardEntry`(특수 키 누름 중 `key_*`, 아니면 `kb_up`)이고 `PenHand` 그림이 `pickPenEntry`로 바뀐다(누름 중 `pen_down_0` → 없으면 `pen_up`, 모두 뗌 `pen_up`), 손 위치·각도는 그대로 | 없음 |
| P-3 | 시간 경과 | 100ms tick → 유휴 판정(`rest`)(쾅 만료 규칙은 CR-019로 삭제) + 반복 끊김 방어(CR-023: `repeating`이고 마지막 반복 누름 뒤 `REPEAT_TIMEOUT_MS` 500ms 경과면 `repeating = false` → 부르르 정지, 같은 번호 젤리 재생 없음). `rest` 진입 순간 쉬는중 진입 효과가 `armAtRest = true`(CR-009) → 손 그림 회전 0° | 없음 |
| P-4 | 마우스 | `input://mouse-move` → 좌표 갱신 + `armAtRest = false`(커서 추종 재개) / `input://mouse-button` → 버튼 상태(`armAtRest` 유지) → `MouseArm` 재렌더: 커서가 있는 모니터(`pickMonitor`) → 모니터 내 (u, v)(`cursorUv`) → 영역 쌍선형 보간 목표점(`bilerpQuad`) → 회전 + 늘어나기(`armTransform`, k 0.5~1.6)(CR-017, `design/functions.md` §5.4). (CR-025) 같은 렌더에서 `PenHand`가 같은 팔 변형(`armTransformFor`)으로 손을 팔 끝 붙은 점 P'에 옮기고 θt−θh만큼 기울인다(크기 불변, §10.7). (CR-027) 펜 모드가 아니면 마우스 버튼은 손 그림·젤리에 영향이 없다(클릭 파츠 교체만). 펜 모드면 `input://mouse-button` 누름 → `onMouseButton`이 `kbFrame` +1·(아무것도 안 눌렸으면) `bounceSeq` +1·`clickHeld` 추가 → `PenHand` = `pen_down_{kbFrame}`(`pickPenEntry`), `.jellyWrap` 젤리 재생(`wrapMotion`), 클릭 파츠도 기존대로 교체 / 뗌 → `clickHeld`에서 제거 → 키·버튼이 남지 않으면 `pen_up`·젤리 클래스 없음(§10.8) | `monitors`가 비었으면 마우스 파츠를 그리지 않음. 커서가 모든 모니터 밖(모니터 사이 빈 곳·구성 변경 후)이면 가장 가까운 모니터 기준으로 계속 계산 |
| P-5 | Ctrl+휠 배율 | §5.1 `onWheel` → 로컬 즉시 반영 → `setSettings` → core가 저장·창 리사이즈(`resize_overlay`, 좌상단 고정, window.md §2.2) → `settings://changed`로 같은 값 재수신. **`set_settings`는 창을 옮기지 않는다**(CR-013, window.md §2.1.1, contract v0.6 §5.3 위치 불간섭): 사본의 `overlay.x/y`가 드래그 전 값으로 낡아도 무해하며 반환값·`settings://changed`로 교정된다. 로컬 반영과 리사이즈 사이 1~2프레임은 `.root` `overflow: hidden`으로 잘리거나 투명 여백이 보일 수 있다 — 수용(CR-012, §2). 휠 이벤트는 `.root`(= 창 전체)가 받으므로 배율 > 100%에서도 창 어디서나 동작. **위치 잠금 중(R-28)에는 휠이 창에 오지 않아 이 흐름이 시작되지 않는다** — 코드 분기 없음, 잠금 중 배율은 설정 창 슬라이더 → P-6(§10.9.1 L-3·L-6) | `setSettings` 실패 시 로컬 배율만 바뀐 채 유지(저장 안 됨), 문구 없음. 다음 `settings://changed` 수신 시 저장된 값으로 덮임 |
| P-6 | 설정·이미지 변경 | `settings://changed` → `settings` 교체(config 재계산. 설정 창에서 옮긴 `mouse.partPos`도 이 경로로 와서 손 그림 자리가 바뀐다 — CR-015. 설정 창에서 지정한 `mouse.area`도 이 경로로 와서 다음 렌더부터 새 영역으로 목표점을 계산한다 — CR-017. 설정 창에서 옮긴 `mouse.penPos`도 이 경로로 와서 펜 쥔 손 자리가 바뀐다 — CR-025) / `assets://changed` → `manifest` 교체(프레임 수·손 그림 자연 크기 재계산. 배경 등록·교체·삭제도 이 이벤트로 오며, `BackgroundLayer`는 이때만 다시 그린다 — CR-014, R-17. 펜 슬롯 등록·삭제도 이 이벤트로 와서 펜 모드 켜짐·꺼짐(`isPenMode`)과 `kbFrames`가 다시 계산된다 — CR-025) / `assets://hand-anchor-changed` → `anchor` 교체(CR-008. contract §4·§5·§5.1: `import_asset`·`remove_asset`의 슬롯이 `mouse_base`일 때, `set_settings`에서 `mouse.shoulder`가 바뀌었거나 `mouse`가 켜짐·꺼짐일 때 재계산해 이전 캐시와 값이 다를 때만 보냄. CR-015 이후 `mouse.partPos` 변경도 재계산 조건이다 — contract v0.8 확정. 같은 command 안에서 주 이벤트 `assets://changed`/`settings://changed`가 먼저 오고 이 이벤트가 뒤에 온다) | 없음. `anchor`가 `null`로 오면 폴백 |
| P-7 | 드래그 이동·위치 저장 | `.root`의 `data-tauri-drag-region`으로 Tauri가 창 이동. `.canvas`는 `pointer-events: none`이라 이미지 위를 잡아도 `.root`가 받는다. **위치 저장·복원은 core window 담당**(CR-010): 이동이 500ms 멎으면 core가 `overlay.x/y`를 저장하고 `settings://changed`를 보낼 수 있다 → P-6대로 `settings` 교체(화면 변화 없음). 시작 시 위치 복원도 core. `set_settings`(P-5 Ctrl+휠 등)는 창 위치를 적용하지 않으므로 드래그한 자리가 유지된다(CR-013). ui 코드 변경 없음. **위치 잠금 중(R-28)에는 core가 창을 클릭 통과로 바꿔 마우스 누름이 창에 오지 않으므로 끌기가 시작되지 않는다** — `data-tauri-drag-region`은 그대로 두며 잠금 해제 즉시 다시 동작(§10.9.1 L-2) | 저장 실패는 core 로그만(ui 표시 없음) |
| P-8 | 타이머 (CR-045) | ① 시작: `TimerText`가 마운트되면(글자 조건 참일 때만, §10.14) `useTimerSnapshot`이 `onTimerChanged` 구독 완료 **후** `fetchWithRetry(getTimer, …)` — 앱 시작 직후 값은 `stopped`·0 → `'00:00:00'`(R-36) ② 표시: `running`이면 `useElapsedText`가 250ms마다 `elapsedMs + (now − receivedAt)`을 계산해 글자가 바뀔 때만(= 초가 바뀔 때) 다시 그린다. `paused`·`restPaused`·`stopped`는 interval 없이 받은 `elapsedMs` 그대로 ③ 변경: 설정 창 조작(시작·일시정지·멈춤·on/off)·쉬는중 전이로 core 상태가 바뀌면 `timer://changed` → 스냅숏 교체·`receivedAt = nowMs()` → 글자 즉시 갱신 ④ 쉬는중 보고: `OverlayApp`이 `machine.layer`가 바뀔 때마다(마운트 포함) `setResting(machine.layer === 'rest')` — core가 `running → restPaused`(쉬는중 진입)·`restPaused → running`(입력으로 `idle` 복귀)을 판정해 ③으로 돌아온다. 사용자 일시정지(`paused`)는 core가 재개하지 않는다(R-35) ⑤ 설정 변경: `settings://changed`의 `timer`(위치·회전·크기·색·on/off)는 P-6 경로로 `settings` 교체 → `PomodoroLayer` 다시 그림(글자 조건 재판정·스타일 교체). 매니페스트의 `pomo_char`·`pomo_bubble` 등록·비우기도 P-6 `assets://changed`로 반영 | 구독 실패 → 조회만 1회 흐름(이후 변경 못 받음). `getTimer` 끝내 실패(재시도 3회) → 초기값 `stopped`·0 유지(`'00:00:00'`). `setResting` 실패 → 무시(`.catch(() => undefined)`, 재시도 없음 — 다음 전이 때 다시 보냄). 모두 문구 없음(R-01) |
| P-9 | 타이머 모드 (CR-050) | ① 표시: 스냅숏 `mode === 'countdown'`이면 `useElapsedText` → `timerText` = 남은 시간 올림(`stopped`(D) = `00:25:00`, `running` = 초마다 줄어듦 — 쉬는중에도 core가 멈추지 않으므로 계속 줄어듦, `paused` = 멈춘 값) ② 0 도달: core가 `timer://changed`로 `finished`(`elapsedMs = durationMs`) → 글자 `00:00:00` + `.blink`(1s CSS, interval 없음) ③ 알림음: 같은 이벤트로 `useAlarmOnFinish`가 `prev ≠ finished`·`fromEvent`를 확인 → `getAlarmSound()` → `v = gainRef.current`(재생 **시작 시점**의 최신 `alarmGain(timer)`, 기본 0.44 = 44% — CR-058) → `url` 있으면 `stopRef.current = playSound(url, v, playDefault)`, 없거나 조회 실패면 `stopRef.current = playSound(defaultAlarmUrl(), v)` 1회. 실패 시 `playDefault`(`design/functions.md` §5.7 ⑤) ④ 끝: 10초 뒤 core가 `stopped`(D)를 보냄(또는 사용자 멈춤·시작·끄기 → `stopped`·`running`) → `.blink` 제거·`halt()`로 소리 정지 → 글자 `00:25:00`(또는 흐름) ⑤ 앱 시작·새로고침: 첫 `getTimer`가 `finished`면 깜빡임만 보이고 소리는 없음 | `getAlarmSound` 실패 → 기본음. 등록 파일 `new Audio`·`play()` 동기 예외·`play()` 거부·`error` → `onFail`이 **항상 비동기(`queueMicrotask`)**로 불리므로 `stopRef.current = playSound(...)` 대입이 먼저 끝나고, 그 뒤 `playDefault`가 기본음 1회 재시도하며 `stopRef.current`를 기본음 정지 함수로 바꾼다(→ `finished`를 떠나면 `halt()`가 기본음을 pause) → 그것도 실패하면 무시. 정지 뒤에는 `onFail`을 부르지 않는다. `finished`를 떠난 뒤 늦게 온 조회 결과는 회차 번호(`genRef`)로 버림. 자동 재생 차단(`NotAllowedError`)도 같은 경로(무음) — 차단 여부는 수동 확인(§10.15 15.6). 모두 문구 없음(R-01) |
| P-10 | 오른쪽 클릭 (CR-062) | ① 비잠금·표시 중 오버레이 위 오른쪽 클릭 → WebView가 오른쪽 뗌 뒤 DOM `contextmenu`를 `.root`로 보냄 → `preventContextMenu`가 `preventDefault()` → WebView2 기본 메뉴 없음 ② 같은 클릭을 core 전역 훅이 누름·뗌 좌표로 받아 판정 → 조건이 맞으면 core가 트레이와 같은 네이티브 메뉴를 커서 위치에 1개 띄움(§10.16 — ui 관여 없음) ③ 같은 클릭의 `input://mouse-button`(오른쪽 누름·뗌)은 기존 P-4대로 클릭 파츠 `mouse_right` 교체(R-09)·펜 모드 클릭(R-26) ④ 위치 잠금 중에는 창이 클릭 통과라 ①이 일어나지 않고 ②③만 일어난다(§10.9.1 L-8) | 없음 — `preventContextMenu`는 예외를 던지지 않고, core 쪽 판정·팝업 실패는 ui에 알려지지 않는다(문구 없음, R-01) |

파괴 조작: 없음(confirm 대상 없음). 오버레이 메뉴의 「종료」는 트레이와 같은 core 항목이며 confirm 불필요(ui-design-strategy §11 — 앱 종료).

## 7. bridge 계약 사용표

계약 원문은 `doc/200_설계/bridge/contract.md` v0.6 §4·§5(부수 효과: §5.2 창 리사이즈, §5.3 `set_settings` 위치 불간섭). 래퍼는 `src/bridge/commands.ts`·`src/bridge/events.ts`(barrel `bridge`로 import).

| 종류 | 계약 이름 | 래퍼 | 페이로드 타입(`src/bridge/types.ts`) | 호출 위치 | 실패 시 표시 |
|---|---|---|---|---|---|
| command | `get_settings` | `getSettings()` | → `Settings` | `OverlayApp` 마운트 효과 | 없음(기본값 유지, P-1) |
| command | `get_asset_manifest` | `getAssetManifest()` | → `AssetManifest` (`entries`에 `background` 항목이 올 수 있음 — contract v0.6 §3.1, 선택 슬롯) | 같은 곳 | 없음(빈 창) |
| ~~command~~ | ~~`get_screen_bounds`~~ | ~~`getScreenBounds()`~~ | — | **호출 삭제(CR-017)** — `get_monitors`로 교체. command·래퍼 존폐는 bridge 결정 | — |
| command | `get_monitors` — **확정**(contract v0.9 §5, CR-017 — `src/bridge/commands.ts` 반영됨) | `getMonitors(): Promise<ScreenBounds[]>`(🔒 이름) | 인자 없음 → `ScreenBounds[]`(기존 `ScreenBounds` 타입 재사용, 모니터마다 1개, 물리 px, `input://mouse-move`와 같은 가상 화면 좌표계). 에러는 `BridgeError`로 정규화(contract §5 원문 인용) | `OverlayApp` 마운트 효과(앱 시작 1회, `design/functions.md` §5.1 모니터 목록 로드) | 없음(`monitors = []` → 마우스 파츠 미표시, P-1). 모니터 구성 변경 알림 event는 현재 없음 — core 권고에 따라 추가되면 CR로 반영 |
| command | `set_settings` | `setSettings(settings)` | `Settings` → `Settings` | `onWheel` | 없음(P-5) |
| event | `input://keyboard` | `onKeyboard` | `KeyboardInputEvent`(CR-021: `special` 필드 — **확정**(contract v0.11, `src/bridge/types.ts` 반영됨), 값 `'space' \| 'z' \| 'question' \| 'exclamation' \| 'enter' \| 'backspace' \| 'undo' \| null`(`undo` = Ctrl+Z, Ctrl을 누른 채 누른 그 밖의 키는 `null`), 뗌 이벤트도 뗀 키의 분류값. CR-023: `repeat: boolean` 필드 — **확정**(contract v0.12, 반영됨), 🔒 자동 반복 누름이면 `true`(`pressed = true`, `heldCount` 불변, `special`은 처음 값), 처음 누름·뗌은 `false`) | `useBridgeEvent` → 키보드 핸들러(`design/functions.md` §5.1) | — (계약 개정 전 `special` 없음 = `null`로 동작, 특수 키 그림 안 보임. `repeat` 없음 = `false`로 동작, 부르르 없음 — 자동 반복 누름은 CR-021 규칙대로 일반 누름처럼 처리) |
| 타입 | `AssetSlot` `'key_space'`·`'key_z'`·`'key_question'`·`'key_exclamation'`·`'key_enter'`·`'key_backspace'`·`'key_undo'` 추가(캔버스 레이어, 선택) — **확정**(contract v0.11 §3.1, 반영됨), CR-021 | `getAssetManifest`·`onAssetsChanged`로 받음(새 래퍼 없음) | `AssetManifest.entries`의 `slot` | `pickKeyboardEntry`(§5.3) | 없음. 항목이 없으면 `kb_down`으로 그린다(R-22) |
| event | `input://mouse-move` | `onMouseMove` | `MouseMoveEvent` | `useBridgeEvent` | — |
| event | `input://mouse-button` | `onMouseButton` | `MouseButtonEvent`(`{ button: 'left' \| 'right'; pressed: boolean; ts: number }`, contract §4 — CR-027도 이 페이로드 그대로, 새 필드 없음) | `useBridgeEvent` → `dispatch({ type: 'mouseButton', button, pressed, ts })`(변경 없음). 펜 모드 클릭 누름 규칙은 상태기계 안(`design/functions.md` §5.2 `onMouseButton`) | — |
| event | `settings://changed` | `onSettingsChanged` | `Settings` | `useBridgeEvent` → `setLocalSettings` | — |
| event | `assets://changed` | `onAssetsChanged` | `AssetManifest` (`entries`에 `background` 항목이 올 수 있음 — contract v0.6 §3.1·§4. 배경 등록·삭제도 이 이벤트) | `useBridgeEvent` → `setManifest` | — |
| command | `get_hand_anchor` (**확정**, contract v0.6 §3.6·§5 — v0.3 도입, CR-008) | `getHandAnchor(): Promise<Point \| null>` | 인자 없음 → `Point \| null`(캔버스 좌표. `null` = 오류 아님, 폴백). 에러 `STATE_POISONED` | `OverlayApp` 기준점 효과(§5.1) — `onHandAnchorChanged` 구독 완료 후 | 없음(`anchor` 유지 → 폴백) |
| event | `assets://hand-anchor-changed` (**확정**, contract v0.6 §3.6·§4 — v0.3 도입, CR-008) | `onHandAnchorChanged: Subscriber<HandAnchorEvent>` = `(cb: (e: HandAnchorEvent) => void) => Promise<UnlistenFn>`(기존 `Subscriber<T>`, `src/bridge/events.ts`) | `HandAnchorEvent = { anchor: Point \| null }` (이벤트 이름 상수 `EVENTS.handAnchorChanged`) | `OverlayApp` 기준점 효과(§5.1) → `setAnchor` | — |
| 타입 | `AssetSlot` `'hair'` 추가(캔버스 레이어 — 배경·키보드와 같은 크기 규칙, 1장, 선택, 내장 기본 없음) — **확정**(contract v0.17, CR-037 — `src/bridge/types.ts` 반영됨) | `getAssetManifest`·`onAssetsChanged`로 받음(새 래퍼·command·event 없음) | `AssetManifest.entries`의 `slot === 'hair'` 항목(`url`) | `HairLayer`(`design/functions.md` §5.3) | 없음. 항목이 없으면 그리지 않음(투명) |
| command | `get_timer` — **확정**(contract v0.21 §5.8, 반영됨), CR-045 | `getTimer(): Promise<TimerSnapshot>` | 인자 없음 → `TimerSnapshot = { status: 'stopped' \| 'running' \| 'paused' \| 'restPaused'; elapsedMs: number }`. 부수 효과 없음 | `useTimerSnapshot`(`src/components/hooks/`, 호출자 `TimerText`) — `onTimerChanged` 구독 완료 후, `fetchWithRetry`(200·500·1000ms) | 없음(초기값 `stopped`·0 유지, P-8) |
| command | `set_resting` — **확정**(contract v0.21 §5.8, 반영됨), CR-045 | `setResting(resting: boolean): Promise<TimerSnapshot>` | `boolean` → `TimerSnapshot`(반환값 사용 안 함 — 표시는 `timer://changed`로만). core에서 멱등 | `OverlayApp` 쉬는중 보고 효과(`design/functions.md` §5.6) | 없음(무시, P-8) |
| event | `timer://changed` — **확정**(contract v0.21 §4, 반영됨), CR-045 | `onTimerChanged: Subscriber<TimerSnapshot>`(기존 `Subscriber<T>` 형태) | `TimerSnapshot`. 상태 변화 때만 emit(초마다 오지 않음) | `useTimerSnapshot` — `useBridgeEvent`를 쓰지 않는다(구독 완료 시점을 알아야 하므로, 기준점 효과와 같은 이유) | — |
| 타입 | `Settings.timer: TimerSettings`·`DEFAULT_TIMER_SETTINGS` — **확정**(contract v0.21 §3.3 신설, 현행 기본값 v0.27 — textPos (268, 402)·rotation 7·alarmVolume 44, 반영됨), CR-045 | `getSettings`·`onSettingsChanged`로 받음(새 래퍼 없음) | `TimerSettings = { enabled; textPos: Point(글자 중심, 캔버스 좌표); rotation(도); fontSize(캔버스 px); color('#rrggbb') }` | `OverlayApp` → `PomodoroLayer`(`timer` prop) → `isTimerTextVisible`·`timerTextStyle` | 없음. 필드가 없으면 `DEFAULT_TIMER_SETTINGS` |
| 타입 | `AssetSlot` `'pomo_char'`·`'pomo_bubble'` 추가(캔버스 레이어, 선택. `pomo_char`는 v0.23(CR-053)부터 내장 기본 있음, `pomo_bubble`은 없음) — **확정**(contract v0.21 §3.1, 반영됨), CR-045 | `getAssetManifest`·`onAssetsChanged`로 받음(새 래퍼 없음) | `AssetManifest.entries`의 `slot` | `PomodoroLayer`·`isTimerTextVisible`(`findEntry`) | 없음. 항목이 없으면 그 그림을 그리지 않음 |
| command | `get_alarm_sound` — **확정**(contract v0.23 §3.10·§5, CR-048 → CR-050) | `getAlarmSound(): Promise<AlarmSound \| null>`(`src/bridge/commands.ts` 반영됨) | 인자 없음 → `AlarmSound = { format: 'wav' \| 'mp3' \| 'ogg'; bytes: number; url: string }` 또는 `null`(미등록). 부수 효과 없음, 에러 `sound.io` | `useAlarmOnFinish` `start()`(`finished` 진입 이벤트 때 1회, `design/functions.md` §5.7 ⑤) | 없음 — 실패·`null` = 내장 기본음(`defaultAlarmUrl()`) |
| 타입 | `TimerStatus` + `'finished'`, `TimerSnapshot.mode?: TimerMode`·`durationMs?: number` — **확정**(contract v0.23 §3.9, 반영됨) | `getTimer`·`onTimerChanged`(기존 래퍼) | 없으면 `'stopwatch'`·0(`snapshotMode`) | `timerText`·`isTimerBlinking`·`useAlarmOnFinish` | — |
| 타입 | `TimerSettings.alarmVolume?`(0~100, 없으면 44 — contract v0.27 §3.3, CR-058. v0.23~v0.26: 80)·`mode?`·`countdownSecs?` — **확정**(contract v0.23 §3.3 신설, 반영됨) | `getSettings`·`onSettingsChanged`(기존) | 오버레이는 `alarmVolume`만 읽는다(`alarmGain`). `mode`·`countdownSecs`는 표시에 쓰지 않는다(표시는 스냅숏 `mode`·`durationMs`) | `TimerText` → `alarmGain(timer)` | 없음 |
| command | `set_resting` 의미 확장 — **확정**(contract v0.23: 카운트다운이면 core no-op) | `setResting`(기존) | 불변 | 쉬는중 보고 효과(불변) | 없음 |
| 창 기능 | (계약 없음) | `data-tauri-drag-region` 속성 | — | `.root` | — |
| 창 기능 (CR-062) | (계약 없음 — 오른쪽 클릭 메뉴는 core 전용(tray·hook), contract v0.27 유지) | 없음 — DOM `contextmenu` 기본 동작 취소(`preventContextMenu`)는 bridge와 무관 | — | `.root` `onContextMenu` | — (메뉴 판정·팝업 실패는 core 로그만, ui 표시 없음) |
| 타입·창 속성 | `Settings.positionLock: boolean`(기본 `false`) — **확정**(contract v0.14 §3.3·§5.3 4단계, CR-029) | 없음(오버레이는 읽지 않음) | `Settings.positionLock` — `getSettings`·`onSettingsChanged`로 `settings`에 함께 들어오지만 어떤 function도 참조하지 않는다 | 없음 — 적용은 core window `set_ignore_cursor_events`(§10.9.1 L-1) | 없음(적용 실패는 `set_settings` 실패 → 설정 창 오류 줄) |
| 위치 저장(R-13) | **확정 — core window 담당, 새 계약 없음**(CR-010) | 없음(ui 호출 없음) | 저장 후 기존 `settings://changed` 재사용 | — | 없음 |
| 타입 | `MouseSettings.partPos: Point` 추가, `armWidth`·`armColor` 삭제 — **확정**(contract v0.8 §3.3, 반영됨. 현행 기본 `{x:411, y:464}` — v0.20·CR-044), CR-015 | `getSettings`·`onSettingsChanged`로 받음(새 래퍼 없음) | `Settings.mouse.partPos` | `MouseArm`(§5.4 렌더) | 없음 |
| 타입 | `MouseSettings.area: [Point, Point, Point, Point]` 추가(순서 왼쪽 위 · 오른쪽 위 · 오른쪽 아래 · 왼쪽 아래, 캔버스 좌표. 기본값 = `DEFAULT_MOUSE_SETTINGS.area`, Rust `default_area()`와 1:1), `MouseSettings.pad` 삭제 — **확정**(contract v0.9 §3.3, 반영됨), CR-017 | `getSettings`·`onSettingsChanged`로 받음(새 래퍼 없음) | `Settings.mouse.area` | `MouseArm`(§5.4 렌더 2·4단계) | 없음 |
| 타입 | `AssetSlot` 펜 슬롯 `pen_up`·`pen_down_{n}`·`pen_key_space`·`pen_key_z`·`pen_key_question`·`pen_key_exclamation`·`pen_key_enter`·`pen_key_backspace`·`pen_key_undo`(선택, 캔버스 레이어 아님) — **확정**(contract v0.13 §3.1, 반영됨), CR-025. CR-042 이후 이 화면은 `pen_up`·`pen_down_0`만 읽는다(§10.12) | `getAssetManifest`·`onAssetsChanged`로 받음(새 래퍼 없음) | `AssetManifest.entries`의 `slot` — ui는 `slotKey(slot)` 문자열로만 찾는다(`findByKey`) | `isPenMode`(§5.3), `pickPenEntry`·`PenHand`(§5.5). (`penDownFrameCount`는 CR-042로 삭제) | 없음. `pen_up`이 없으면 펜 모드 아님(기존 키보드 모션) |
| 타입 | `MouseSettings.penPos: Point \| null` 추가 — **확정**(contract v0.13 §3.3, 반영됨. 현행 기본 `{x:372, y:476}` — v0.20·CR-044, v0.15까지 `null`), CR-025 | `getSettings`·`onSettingsChanged`로 받음(새 래퍼 없음) | `Settings.mouse.penPos` | `resolvePenPos`(§5.5) | 없음. `null`(옛 settings.json 호환) = 기본 위치 규칙(§10.7) |
| 계약 의미 | `anchor` = 그림 좌표 + `partPos`(캔버스 좌표), `partPos` 변경 시 재계산 — **확정**(contract v0.8), CR-015 | `getHandAnchor`·`onHandAnchorChanged`(기존) | `Point \| null`(기존) | 기준점 효과(§5.1) | 없음. ui는 받은 값을 그대로 캔버스 좌표로 쓰며 `partPos`를 더하지 않는다 |

손 기준점 2건은 contract v0.3에서 확정됐다(command·event 이름, 래퍼 `getHandAnchor`·`onHandAnchorChanged`, 타입 `HandAnchorEvent`, 사용 순서 「구독 먼저 → 조회」 모두 §3.6 원문). (doc-sync 2026-09-30) 래퍼 `getHandAnchor`·`onHandAnchorChanged`와 타입은 `src/bridge/`에 반영됐고 이 화면 소스가 사용한다. 위 표의 모든 계약은 현행 contract v0.27 기준 확정·반영 상태다(표 안 「vN」은 처음 확정된 판).

화면 코드는 `@tauri-apps/api`를 import하지 않는다(`src/main.tsx`의 창 라벨 조회만 예외).

## 8. 확정 문구·라벨 표

오버레이에는 사용자에게 보이는 문구·aria-label이 **없다**(R-01: 사용자 이미지만 보인다). `src/overlay/labels.ts`는 `export const labels = {} as const`로 유지한다.

| 키 | 문구 | 위치 |
|---|---|---|
| (없음) | 모든 `<img>`는 `alt=""`(장식 이미지) | `BackgroundLayer`(CR-014), `HairLayer`(CR-037), `Layer`, `MouseArm`, `PenHand`(CR-025), `PomodoroLayer`(CR-045) |
| (없음) | 시간 글자 `HH:MM:SS`는 번역 대상 문구가 아니라 숫자 표시다. `aria-hidden="true"`, aria-label 없음(CR-045) | `TimerText` |

R-01 「배경 없음」과 R-17 배경의 관계(해석): R-01의 「배경 없음」은 **앱이 스스로 붙이는 시각 장식**(창 배경색·테두리·그림자 등, ui-design-strategy §10)이 없다는 뜻이다. R-17 배경은 **사용자가 등록한 PNG**(`background` 슬롯, contract v0.6 §3.1)이며 R-01의 「사용자 이미지만 보인다」에 포함된다 — 두 요구는 충돌하지 않는다.

## 9. 접근성

**분할 문서: [`design/a11y.md`](design/a11y.md)** — 역할(표시 면, 모든 `<img>` `alt=""`)·포커스 순서(없음)·키보드 조작(없음)·마우스 조작(드래그 R-12, Ctrl+휠 R-04, 오른쪽 클릭 = core 네이티브 메뉴·ui는 기본 메뉴 억제만 R-40)·상태 알림(없음)이 있다.

## 10. 레이어·모션 명세

### 10.1 레이어 z-order와 표시 조건

| z | 레이어 | 슬롯 | 표시 조건 | 크기·좌표 |
|---|---|---|---|---|
| bg (맨 아래, CR-014) | 배경 | `background`(선택, contract v0.6 §3.1 — 캔버스 레이어) | 등록돼 있으면 항상(없으면 그리지 않음 = 투명). 입력·상태기계·모드와 무관, 바운스·교체·회전·커서 추종 없음(R-17) | 캔버스 전체 `left:0 top:0 100%` — 다른 캔버스 레이어와 같은 좌표·맞춤·배율(`.canvas` `scale` 공유) |
| pomo (배경 위·`.jellyWrap` 아래, CR-045) | 뽀모도 인물 → 말풍선 → 시간 글자(R-33·R-34) | `pomo_char`·`pomo_bubble`(선택, contract v0.21 예정 — 캔버스 레이어) + 글자(React/CSS) | 그림: 등록돼 있으면 항상(타이머 on/off·입력·상태와 무관). 글자: `isTimerTextVisible(timer, manifest)` = `timer.enabled` 또는 두 그림 중 1장 이상 등록(U-1). 젤리·부르르·교체·커서 추종 없음 | 그림 = 캔버스 전체 `left:0 top:0 100%`(`.layer`). 글자 = `timerTextStyle(timer)` — 중심 `textPos`, `translate(-50%,-50%) rotate(rotation)`, `fontSize` 캔버스 px(`.canvas` `scale`을 같이 받음) |
| hair (`.canvas` 맨 아래 `.hairWrap`, CR-037 → CR-051) | 헤어(뒷머리, R-30) | `hair`(선택, contract v0.17 — 캔버스 레이어, 1장) | 등록돼 있으면 항상(없으면 그리지 않음 = 투명, 안내 없음). 상태·키·클릭·펜 모드·위치 잠금과 무관하게 같은 그림(1장 고정). 교체·회전·커서 추종 없음. 젤리·부르르는 `.jellyWrap`에서 받음 | 캔버스 전체 `left:0 top:0 100%`(위치 조정 없음) |
| 0 | 마우스 파츠(한 모드, CR-015·R-18) | `mouse_base`/`mouse_left`/`mouse_right` | `settings.mouse && monitors.length > 0`(CR-017. 선택 이미지가 없으면 그리지 않음, R-09) | 좌상단 `left/top = mouse.partPos`, 크기 = 선택 이미지 항목의 `width×height`(자연 크기, 캔버스 좌표 단위 — `.canvas` `scale`을 같이 받음), 어깨축 회전 + 팔 방향 늘어나기(§10.4, CR-017). 캔버스 전체 크기 그림 + `partPos = (0,0)`이면 이전 레이어 이동 모드와 같은 화면 |
| 1 | 몸통(**선택**, R-19) | `body` | 등록돼 있으면 항상. 없으면 그리지 않음 = 투명(정상, 안내 없음) | 캔버스 전체 `left:0 top:0 100%` |
| 2 | 일반 상태 | `machine.layer` → `idle`/`rest`(CR-019: `slam` 슬롯 삭제) | 해당 슬롯이 등록돼 있으면(없으면 그리지 않음 = 투명). 바운스 없음(교체만) | 캔버스 전체 |
| 3 | 키보드 파츠(`kb_up` = 디폴트 상태, R-19) | `kb_up` / 특수 키 그림 `key_*`(선택, CR-021·R-22) / `kb_down[kbFrame]`(없으면 `kb_down[0]`) | `kbDown`에 따라. `kbDown`이고 가장 최근에 눌린(아직 눌려 있는) 특수 키의 슬롯이 등록돼 있으면 그 그림, 아니면 `kb_down` 프레임(`pickKeyboardEntry`, §10.6) | 캔버스 전체(특수 키 그림도 같은 요소·같은 좌표) |
| ~~4~~ | ~~마우스 파츠(손바닥 모드)~~ | — | **삭제(CR-015)** | — |
| pen (맨 위, CR-025) | 펜 쥔 손(R-25) — 옛 z4 손바닥 모드와 무관한 새 레이어 | `pen_up` / `pen_key_*`(선택) / `pen_down_{kbFrame}`(없으면 `pen_down_0`, 그것도 없으면 `pen_up`) | `settings.mouse !== null`이고 `pen_up`이 등록돼 있으면 항상(`pickPenEntry`, §10.7). 누름 판정 = `isPressing`(키 또는 펜 모드 클릭 버튼, CR-027 §10.8). 펜 모드면 z3은 `kb_up` 고정 | 좌상단 `left/top = resolvePenPos(mouse, pen_up 크기)`, 크기 = 선택 그림 자연 크기, `transform-origin` = `pen_up` 중심, `transform = translate(dx, dy) rotate(deg)`(스케일 없음, §10.7) |

z0~z3과 pen은 모두 `.jellyWrap` 안에, hair는 같은 motion 클래스를 받는 `.hairWrap` 안에 있어(CR-051) 키 누름 젤리(R-23)와 키 꾹 누름 부르르(R-24, CR-023)(§10.3)를 **함께** 받는다(개별 레이어에는 애니메이션 없음). 위 표의 「바운스 없음(교체만)」(z2)은 레이어 자체에 따로 걸리는 애니메이션이 없다는 뜻이며, 래퍼의 젤리는 z1(몸통)·z2(상태)에도 걸린다. bg만 래퍼 밖이라 어떤 움직임도 없다(R-17).

### 10.2 상태 전이

확정사항 §5 표를 그대로 따른다(재정의하지 않음). 구현은 `src/state/inputMachine.ts`(§5.2). 설정값: `idleMs = idleSeconds × 1000`, `kbFrames`. 쾅(동시 6키) 행은 확정사항 §5에서 폐기됐다(🔒 2026-09-24, CR-019) — 키 입력은 동시 키 수와 무관하게 대기, 설정 `slam`(keys·durationMs)은 없다. 특수 키 이미지(확정사항 §5 「특수 키 이미지」, CR-021)는 상태 레이어가 아니라 키보드 파츠 규칙이다 — §10.6.

### 10.3 CSS 애니메이션 (`src/overlay/overlay.module.css`)

| 이름 | keyframe | 지속·곡선 | 트리거 |
|---|---|---|---|
| 젤리 바운스 (CR-022, R-23 — R-07·R-16·R-22의 「바운스」) | `jelly`: 0% `scale(1, 1)` → 15% `scale(1.06, 0.92)` → 35% `scale(0.97, 1.04)` → 55% `scale(1.02, 0.98)` → 75% `scale(0.99, 1.01)` → 100% `scale(1, 1)` · **`jellyAlt`**: `jelly`와 **완전히 같은** 구간·값(이름만 다름) | 350ms `ease-in-out`(구간마다 적용 — 꺾이는 점마다 속도가 0이 되어 출렁임이 부드럽다), 1회, `fill-mode` 없음(끝나면 `transform` 없음 = 원래 모양). 기준점 `transform-origin: 50% 100%`(= 캔버스 아래 가운데) | `.jellyWrap` 하나에만. 클래스 = `jellyClass(wrapMotion(machine))`(`design/functions.md` §5.1·§5.2, CR-023 — 부르르가 아닐 때 `wrapMotion`은 `bouncePhase` 값을 준다): `0` → `.jelly`, `1` → `.jellyAlt`, `null` → 없음. 재생 = 클래스가 새로 붙거나 `.jelly ↔ .jellyAlt`로 바뀔 때(`animation-name` 변경 → 처음부터 재생). `bounceSeq`가 +1 될 때마다 짝홀이 바뀐다: 모든 키가 떼진 상태의 첫 누름, **특수 키 새 누름**(다른 키 누른 채여도), (CR-027) **펜 모드에서 키·버튼이 하나도 안 눌린 상태의 클릭 누름**(§10.8). 클래스 유지 조건은 `isPressing`(키 또는 펜 모드 클릭 버튼이 눌려 있는 동안) |
| 부르르 (CR-023, R-24 — 키 꾹 누름) | `shiver`: 0% `scale(1, 1)` → 25% `scale(1.02, 0.97)` → 50% `scale(1, 1)` → 75% `scale(0.99, 1.02)` → 100% `scale(1, 1)` | **80ms** `ease-in-out`(구간마다), **`infinite`**, `fill-mode` 없음(클래스가 빠지면 즉시 원래 모양). 기준점은 `.jellyWrap`의 `transform-origin: 50% 100%` 그대로(캔버스 아래 가운데) | `.jellyWrap` 하나에만. 클래스 = `jellyClass(wrapMotion(machine))`가 `'shiver'`일 때 `.shiver`. 켜짐 = 자동 반복 누름(`repeat: true`) 수신. 꺼짐 = 뗌, 반복 아닌 새 누름, 마지막 반복 뒤 500ms(`tick` 방어). **우선순위**: `.shiver`가 `.jelly`/`.jellyAlt`보다 우선이며 세 클래스는 동시에 붙지 않는다 — 젤리 재생 중 반복이 시작되면 젤리를 끊고 부르르(Windows 반복 지연 최소 약 250ms라 350ms 젤리 끝부분이 잘릴 수 있음 — 수용) |
| ~~바운스~~ · ~~마우스 팔 바운스~~ | ~~`bounce`/`bounceAlt`: `translateY(0 → 4px → 0)`, 120ms `ease-out`~~ | — | **폐기(CR-022)** — 키보드 `Layer`·`MouseArm` `.armWrap`에 각각 걸던 방식. 클래스 `.bounce`·`.bounceAlt`와 keyframe `bounce`·`bounceAlt`를 `overlay.module.css`에서 삭제한다. 개별 요소에 바운스 클래스를 남기면 래퍼와 **이중 적용**되므로 금지 |

값의 뜻(🔒 세기 「보통」 — 확정사항 §4): 15%가 첫 눌림(가로 +6%·세로 −8%), 35%가 되튀어 늘어남(가로 −3%·세로 +4%), 55%·75%가 감쇠 출렁임 2회(±2%, ±1%). 비유: 책상에 젤리를 톡 내려놓으면 아래가 바닥에 붙은 채 납작해졌다가 위로 솟고, 점점 작게 두어 번 흔들리다 멈춘다 — 그래서 기준점이 바닥(아래 가운데)이다.

`src/overlay/overlay.module.css`에 적을 규칙(값 그대로):

```css
.jellyWrap { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; transform-origin: 50% 100%; }
/* CR-051: 뒷머리 래퍼 — .canvas 첫 자식, .jellyWrap과 같은 선언(별도 블록), 같은 motion 클래스를 받는다 */
.hairWrap { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; transform-origin: 50% 100%; }
.jelly { animation: jelly 350ms ease-in-out; }
.jellyAlt { animation: jellyAlt 350ms ease-in-out; }
@keyframes jelly {
  0% { transform: scale(1, 1); }
  15% { transform: scale(1.06, 0.92); }
  35% { transform: scale(0.97, 1.04); }
  55% { transform: scale(1.02, 0.98); }
  75% { transform: scale(0.99, 1.01); }
  100% { transform: scale(1, 1); }
}
/* @keyframes jellyAlt — 위와 같은 6구간·같은 값 */
.shiver { animation: shiver 80ms ease-in-out infinite; }
@keyframes shiver {
  0% { transform: scale(1, 1); }
  25% { transform: scale(1.02, 0.97); }
  50% { transform: scale(1, 1); }
  75% { transform: scale(0.99, 1.02); }
  100% { transform: scale(1, 1); }
}
```

(실제 파일은 기존 파일처럼 선언마다 줄을 나눠도 된다 — 값·구간·순서만 같으면 된다.)

- 옛 「쾅」 애니메이션(상태 레이어 `.bounce`, `layer === 'slam'`)은 삭제(CR-019). 상태 레이어(`[z2]`) **자체**에는 애니메이션 클래스가 없다 — 젤리는 감싼 래퍼에서 받는다(CR-022).
- 애니메이션은 클래스가 **새로 붙거나 짝(`.jelly ↔ .jellyAlt`)이 바뀔 때** 1회 재생된다. 누름이 유지된 채 **일반 키** 추가 누름으로 프레임만 바뀌면 재생되지 않는다(as-built 유지 — `bounceSeq` 불변). 재생 도중 새 트리거가 오면 짝이 바뀌어 처음(0%)부터 다시 재생한다(이어 붙이지 않음).
- 특수 키(CR-021 추가 결정 🔒 2026-09-24): 특수 키가 **새로** 눌릴 때마다 재생한다 — 다른 키를 누르고 있어도. 이미 눌린 같은 특수 키의 자동 반복 누름은 재생하지 않는다. 신호는 상태기계 `bounceSeq`(+1) → `bouncePhase` 짝홀 → `wrapMotion`(CR-023) → `jellyClass` 클래스 교대(`design/functions.md` §5.2). 요소 `key` 교체·reflow 강제(`offsetWidth` 읽기)는 쓰지 않는다. `.jellyWrap`은 늘 같은 DOM 요소다.
- 부르르(CR-023, R-24) 규칙. 비유: 젤리를 톡 치면 한 번 출렁이고(젤리), 손가락으로 계속 두드리면 잘게 부르르 떤다(부르르). 떨림 폭은 젤리 첫 눌림(세로 −8%)의 절반 이하(세로 −3%·+2%, 가로 +2%·−1%)다.
  1. 흐름(ㅋ 꾹 누름 예): 첫 누름 → 젤리 1회(`bounceSeq` +1) → OS 반복 지연(약 250~1000ms, 사용자 OS 설정) 뒤 반복 누름 → `.shiver` → 반복이 이어지는 동안 계속 → 떼면 클래스 없음(정지). ㅋ는 특수 키 `z`라 떨리는 동안 `key_z` 그림(등록 시)이 그대로 보인다(반복 누름은 `specialHeld`·`kbFrame`을 바꾸지 않음 — 그림이 30Hz로 바뀌지 않는다).
  2. 반복 누름은 젤리를 **다시 시작하지 않는다**(`bounceSeq` 불변). 부르르가 끝난 뒤에도 같은 재생 번호의 젤리를 되살리지 않는다(`wrapMotion` ③, `shiverSeq`) — 반복 키를 누른 채 일반 키를 새로 눌러도, 500ms 방어로 꺼져도 젤리가 튀어나오지 않는다.
  3. 반복 중 **특수 키를 새로** 누르면 `bounceSeq` +1이라 젤리가 재생된다(R-22 ① 유지). 그 키가 다시 반복되면 부르르로 바뀐다.
  4. 두 키를 누른 채 하나를 떼면 `repeating = false`로 잠깐 정지했다가 남은 키의 반복 누름이 오면 다시 떤다(재시작 — 수용).
  5. Shift·Ctrl·Alt·Win 단독 꾹 누름은 hook이 반복 이벤트를 내지 않아 떨지 않는다(🔒 2026-09-24).
  6. 반복 누름 이벤트마다(최대 초당 약 30회) 상태가 새 객체가 되어 `OverlayApp`이 다시 렌더되지만 `.jellyWrap`의 클래스 문자열은 같아 DOM 클래스가 바뀌지 않고 떨림이 끊기지 않는다(리렌더 빈도는 §11 D-2와 같은 수용 범주).
- 마우스 팔과의 합성(R-16·R-21): 팔 회전·늘어나기(`rotate(θt) scaleX(k) rotate(−θh)`)는 **안쪽** 손 그림 `<img>`의 인라인 `transform`, 젤리 `scale`은 **바깥** `.jellyWrap`의 `animation`이다. 서로 다른 요소라 animation이 회전을 덮어쓰지 않는다. 화면상 결과 = 커서를 향해 돌고 늘어난 팔이 몸과 함께 아래 가운데 기준으로 출렁인다. 팔 각도·늘어난 길이는 젤리 도중에도 유지된다.
- 배율과의 합성(§10.5): `.jellyWrap`은 `.canvas`(`transform: scale(s)`, 원점 왼쪽 위) 안에 있다. 젤리 원점 `50% 100%`는 `.jellyWrap` 상자 = 캔버스 원본 좌표 기준 아래 가운데이므로 배율과 무관하게 캔버스 아래 가운데다.
- 잘림(수용): 창 = 표시 크기(§10.5)이고 `.root`가 `overflow: hidden`이라, 젤리 동안 가로 최대 +6%(좌우 각 3%)·세로 최대 +4%(위쪽) 넘친 부분은 창 밖으로 잘린다(0.35초 이내). 그림 가장자리까지 캐릭터를 그린 경우에만 보인다. 창 크기·여백은 바꾸지 않는다(core window 식 불변, CR-012).
- 움직임은 `transform`만 쓴다(젤리 `scale`, 캔버스 `scale`, 손 그림 `rotate(θt) scaleX(k) rotate(−θh)` — CR-017). `width/height/top/left`·`will-change` 애니메이션은 쓰지 않는다. 커서 추종에는 보간·transition이 없다(목표가 바뀌면 다음 렌더에서 즉시 그 변형). 손 그림의 `left/top`(= `partPos`)은 설정값으로 정한 **정적 배치**이며 애니메이션하지 않는다 — 설정 변경(`settings://changed`) 때만 바뀐다(CR-015).
- 배경(`BackgroundLayer`, CR-014, R-17)에는 **어떤 애니메이션도 없다** — keyframe·`.jelly`·`rotate` 모두 해당 없음. `.jellyWrap` 밖의 형제(`.canvas` 첫 자식)라 젤리가 걸리지 않는다(§3 배경 DOM 구조).

### 10.4 마우스 좌표 매핑·손 그림 배치 (CR-015 — 팔 곡선 폐기, CR-017 — 이동 영역·팔 늘어나기)

비유: 손 그림은 판 위에 핀으로 꽂은 고무 조각이다. 조각을 붙인 자리(`partPos`)는 설정 창에서 끌어다 놓아 정하고, 핀(어깨)은 조각 밖에 있어도 된다 — 조각은 핀을 중심으로 돌고, 손끝이 목표에 닿도록 팔 방향으로만 늘었다 줄었다 한다(0.5~1.6배).

- 커서가 있는 모니터(CR-017, R-20): `monitors`(시작 시 `get_monitors` 1회, 물리 px)에서 `pickMonitor`로 커서를 포함하는 첫 모니터, 없으면 가장 가까운 모니터를 고른다. 옛 「가상 화면 전체(`get_screen_bounds`) 비율」은 폐기 — 여러 모니터를 합친 사각형 기준이라 한 모니터 안에서 손이 좁게만 움직였다.
- 모니터 내 비율: `u = (x − mon.x) / mon.width`, `v = (y − mon.y) / mon.height`, 각각 [0, 1]로 고정(`cursorUv`).
- 목표점 T: `mouse.area`(왼쪽 위 q0 · 오른쪽 위 q1 · 오른쪽 아래 q2 · 왼쪽 아래 q3, 캔버스 좌표)를 (u, v)로 쌍선형 보간 — `T = (1−u)(1−v)q0 + u(1−v)q1 + u·v·q2 + (1−u)v·q3`(`bilerpQuad`). 커서가 모니터 왼쪽 위 구석이면 T = q0, 가운데면 네 점 평균. 영역은 자유 사각형이라 직사각형일 필요가 없다.
- 팔 변형(R-21): 어깨 S, 기준점 A, 목표 T에서 θh = atan2(A − S), θt = atan2(T − S), k = clamp(\|T − S\| / \|A − S\|, 0.5, 1.6). 손 그림 `<img>`의 `transform = rotate(θt) scaleX(k) rotate(−θh)`, `transform-origin = S − partPos`(그림 요소 좌표) — 팔을 눕혀(−θh) 팔 방향으로만 k배 늘린 뒤 목표 방향으로 세운다(θt). 팔에 수직인 두께는 그대로다. k가 상·하한에 걸리면 손끝은 T 방향 위에 있되 T에 닿지 않는다(수용). \|A − S\| ≈ 0(< 1e-6)이면 변형 없음(k = 1, 0°). 함수 `armTransform`·`armTransformCss`(`design/functions.md` §5.4).
- 배치: 손 그림 `<img>`의 좌상단 = `mouse.partPos`(캔버스 좌표, CSS `left/top` px), 크기 = 선택 이미지 매니페스트 항목의 `width`·`height`(자연 크기, CSS `width/height` px). `.canvas`의 `transform: scale`을 같이 받으므로 배율과 무관하게 캔버스 좌표로 적는다. 그림이 캔버스 밖으로 나간 부분은 창(`.root` `overflow: hidden`)에서 잘린다(수용).
- 변형 원점: 어깨 고정점. 그림 요소 기준 좌표로 `transformOrigin = '${shoulder.x − partPos.x}px ${shoulder.y − partPos.y}px'`(음수·그림 밖 값 허용). 기준점 A = bridge `anchor`(캔버스 좌표 — 그림 좌표 + `partPos`를 core가 계산) → `mouse.hand` → **이동 영역 중심**(`bilerpQuad(area, 0.5, 0.5)`, CR-017 — 옛 패드 중심 대체)(`resolvePivot`). `atRest`이면 `REST_TRANSFORM`(CR-009·CR-017).
- 쉬는 위치(R-11·R-15·R-21): 회전 0°·배율 1(변형 없음) — 손 그림이 `partPos`에 그린 그대로 놓인다. 조건은 `armAtRest`(§5.1). 전환은 즉시(보간·애니메이션 없음). 손바닥 모드 `restPosition` 경로는 삭제.
- 앱은 팔을 그리지 않는다: SVG·`armPath`·`armWidth`·`armColor` 없음(R-18).
- 기본 마우스 설정(`DEFAULT_MOUSE_SETTINGS`, `src/bridge/types.ts` — ui는 값을 하드코딩하지 않고 그대로 쓴다): 현행(contract v0.20, CR-044 🔒 2026-09-26 — 확정사항 「배포용 기본 세트 2차」, CR-053·CR-058에서도 불변) 어깨 **(582, 484)** · `partPos` **(411, 464)** · `penPos` **(372, 476)** · `penMode` `true` · `area` = Rust `default_area()`와 1:1(CR-017 이후 불변) · `hand` = **`null`(폴백 전용)**. 패드(`pad`)·`armWidth`·`armColor`는 없다. `hand = null`·`partPos`는 contract v0.8, `area` 추가·`pad` 삭제는 v0.9에서 확정·반영됨. (옛 값 어깨 620,530·`partPos` 389,492는 CR-015·CR-017 당시 기본값 — 본문 수식 예시와 scenarios 픽스처에 남은 것은 계산 예시로 유효.)

### 10.5 배율

- `.canvas`를 캔버스 원본 크기로 두고 `transform: scale(fit × settings.scale)`, `transform-origin: top left`, `left: 0; top: 0`. **가운데 정렬 없음**(유지, CR-012). core 창 리사이즈가 좌상단 고정이라 콘텐츠 원점과 창 원점이 같다.
- 배경(`BackgroundLayer`, CR-014)도 `.canvas` 안에 있으므로 같은 `scale`을 받는다 — 다른 캔버스 레이어와 좌표·맞춤·배율이 같다(R-17, UI-B3). 배경만을 위한 별도 크기 계산은 없다.
- `fit = min(450/W, 350/H)`(캔버스 없으면 `fit = 1`, 450×350 상자). 900×700 캔버스는 `fit = 0.5`, 배율 200%에서 원본 크기.
- **표시 크기 식 — core `doc/200_설계/core/window.md` §2.2 `overlay_display_size`와 같은 식**(두 계층이 각자 계산, window.md §11 D11). ui는 이 식을 바꾸지 않는다(CR-012, window.md §9.2 UI-2):
  - `fit = min(450 / W, 350 / H)` (캔버스 `null`·가로/세로 0이면 W×H = 450×350, `fit = 1`)
  - 표시 가로 = `W × fit × scale`, 표시 세로 = `H × fit × scale` (`scale` = `settings.scale`, 0.25~2)
  - 창 크기(core) = 위 값을 `max(1, ceil(v − 1e-6))`로 올림한 논리 px. ui는 `transform: scale`로 소수 크기 그대로 그리며, 올림으로 생긴 1px 미만 차이는 창 안 투명 영역이다.
  - 예시(window.md §2.2 표에서 인용): 900×700 → 배율 0.5 = 225×175, 1 = 450×350, 2 = 900×700 / 612×354 → 배율 1 = 450×261 / 350×700 → 배율 1 = 175×350.
- 창 = 표시 크기에 딱 맞춤(여백 미포함, window.md §11 D10). 캔버스 비율이 9:7이 아니어도 `.root`(100vw×100vh)는 창 = 표시 크기와 같다.
- 배율 변경 직후 core 리사이즈 전 1~2프레임 잘림/여백은 수용한다(§2, P-5).

### 10.6 특수 키 이미지 (CR-021, R-22)

비유: 키보드 파츠 자리는 「그림 카드 꽂이」다. 평소엔 들림 카드, 키를 누르면 누름 카드를 꽂는데, 특수 키 7종은 그 키 전용 카드가 있으면 그것을 꽂는다. 여러 특수 키를 누르고 있으면 **가장 나중에 누른 것**의 카드가 앞에 온다. 누가 무엇을 쳤는지 적는 수첩은 없다 — 지금 누르고 있는 특수 키 표시만 있고 떼면 지운다.

분류(훅 = core 몫, 계약 인용): `space` = 스페이스바 · `z` = Z 키(한글 입력 ㅋ, 영문 z·Z 모두, Ctrl 없이) · `question` = Shift+`/` · `exclamation` = Shift+`1` · `enter` = Enter · `backspace` = Backspace · `undo` = Ctrl+Z(그림 「뒤로가기」, 추가 결정 🔒 2026-09-24). Ctrl을 누른 채 누른 그 밖의 키와 나머지 키는 `null`(무슨 키인지 모름, 일반 누름). 7종이다. 분류 판정은 ui가 하지 않는다 — ui는 받은 값만 쓴다.

상태 규칙(`src/state/inputMachine.ts` `reduce` `key`, 상세 `design/functions.md` §5.2):

| # | 입력 | `specialHeld` 변화 | 키보드 파츠 결과(`key_space`·`key_enter` 등록, `key_z` 미등록 가정) |
|---|---|---|---|
| 1 | 아무 키도 안 눌림 | `[]` | `kb_up` |
| 2 | 스페이스 누름 | `[] → ['space']` | `key_space` + 바운스(`bounceSeq` +1) |
| 3 | 스페이스를 누른 채 `a` 누름(`special = null`) | 그대로 `['space']` | `key_space` 유지(일반 키는 특수 키 그림을 가리지 않는다), 바운스 재생 없음 |
| 4 | 이어서 Enter 누름 | `['space', 'enter']` | `key_enter`(가장 최근) + **바운스 재생**(새 특수 키 — 다른 키를 누르고 있어도) |
| 5 | Enter 뗌 | `['space']` | `key_space`(아직 눌린 이전 특수 키로 돌아감 — **사용자 확인 완료 🔒 2026-09-24**), 바운스 없음 |
| 6 | 스페이스 뗌(`a` 아직 눌림, `heldCount = 1`) | `[]` | `kb_down[kbFrame]`(일반 누름), 바운스 없음 |
| 7 | `a` 뗌(`heldCount = 0`) | `[]` | `kb_up` |
| 8 | Z 누름(`key_z` 미등록) | `['z']` | `kb_down[kbFrame]`(그림 없으면 일반 누름 프레임 순환 그대로) + 바운스 |
| 9 | 스페이스 자동 반복 누름(떼지 않고 누름 이벤트 반복) | CR-023(`repeat: true`): **그대로**(반복 누름은 목록을 바꾸지 않는다). `repeat` 필드가 없는 이벤트(bridge 개정 전): 빼고 맨 뒤에 추가 — 중복 없음 | CR-023: 보이던 그림 유지 + **부르르**(§10.3). `repeat` 없는 이벤트: 목록 맨 뒤가 스페이스로 바뀐다(4번 상태에서 스페이스 반복이 오면 `key_space`). 두 경우 모두 **젤리 재생 없음** |
| 10 | 어떤 뗌이든 `heldCount = 0` | 무조건 `[]` | `kb_up`(뗌 이벤트 누락 방어) |
| 11 | `a`를 누른 채 스페이스 누름 | `['space']` | `key_space` + 바운스 재생(새 특수 키) |
| 12 | Ctrl을 누른 채 Z 누름(`special = 'undo'`) | `['undo']` | `key_undo`(「뒤로가기」 그림, 미등록이면 `kb_down[kbFrame]`) + 바운스 재생 |
| 13 | Ctrl을 누른 채 C 누름(`special = null`) | 그대로 | 일반 누름(`kb_down` 또는 눌린 특수 키 그림 유지), Ctrl 누름으로 이미 `kbDown`이면 바운스 재생 없음 |

- `kbFrame` 순환: 특수 키 누름도 일반 누름처럼 프레임을 하나 넘긴다(기존 규칙 변경 없음). 단 **자동 반복 누름(`repeat: true`, CR-023)은 어떤 키든 프레임을 넘기지 않는다** — R-07 「연타 시 순환」의 연타는 따로따로 누르는 것이고, 꾹 누름 동안의 반응은 R-24 부르르가 맡는다(반복 속도 최대 초당 약 30회로 그림이 번쩍이는 것도 막는다). 특수 키 그림이 있으면 그 동안 프레임은 보이지 않을 뿐이다.
- 유휴(`rest`)·마우스·상태 레이어는 특수 키와 무관하다. 특수 키를 누르면 다른 키와 똑같이 `wake`(`lastInputAt` 갱신, `rest` → `idle`).
- 팔(`MouseArm`) 바운스는 키보드와 같은 `bouncePhase(machine)`(§10.3) — 특수 키 새 누름 때 키보드와 함께 튄다. 그 밖의 특수 키 전용 팔 동작은 없다.
- 전용 그림 규격: 캔버스 전체 크기, `kb_down`과 같은 규격(확정사항 §3). 검증은 core(ui 재검증 없음). 슬롯 등록 UI는 settings R-14 보류 범위.
- **입력 내용 비보관(R-22 🔒)**: ui에서 키 정보는 `KeyboardInputEvent.special`(분류값)뿐이며 `specialHeld`에만 잠시 있다(지금 눌린 것만, 떼면 삭제). `bounceSeq`는 바운스 재생 신호(짝홀)일 뿐 어떤 키였는지 담지 않는다. 이력 배열·횟수·시각 기록·`console` 출력·`localStorage`·bridge 전송·설정 저장을 하지 않는다. 테스트 결과물·스크린샷 파일명에도 입력 순서를 남기지 않는다.
- 계약: `KeyboardInputEvent.special`·`AssetSlot` `key_*` 7종은 contract v0.11에서 **확정·반영됨**(§7, doc-sync 2026-09-30). 뗌 이벤트의 `special`은 **뗀 물리 키가 눌릴 때 보고된 분류값**이어야 한다(Shift를 먼저 떼도 `?`의 뗌은 `question`) — 이것이 지켜지지 않으면 5·6번 규칙이 어긋나며, 10번(모두 뗌 = 비움)이 최후 방어다.

### 10.7 펜 쥔 손 (CR-025, R-25)

비유: 팔은 어깨 핀에 꽂힌 고무 막대, 손은 막대 끝에 압정 하나로 꽂은 딱딱한 카드다. 막대가 돌고 늘어나면 압정이 따라 옮겨 가고 카드는 같은 각도로 기울지만 늘어나지 않는다. 키를 치면 카드 그림만 바뀐다(펜으로 글씨 쓰듯).

- **펜 모드** = 매니페스트에 `pen_up`이 있을 때(`isPenMode`, 🔒). 펜 모드가 아니면 이 절 전체가 적용되지 않고 기존 키보드 모션(R-07·R-22) 그대로.
- **키보드 레이어 고정**: 펜 모드면 z3 키보드 `Layer`는 **항상 `kb_up`**(`kb_down`·`key_*` 무시 — 두 손이 동시에 움직이지 않게, 🔒). 상태기계(`kbDown`·`kbFrame`·`specialHeld`·`bounceSeq`·`repeating`)는 그대로 돌며 그 값을 `PenHand`가 쓴다. `config.kbFrames` = 펜 누름 그림 수(§4).
- **손 그림 선택**(`pickPenEntry`, `design/functions.md` §5.5): 누름 중(`kbDown`)이면 가장 최근 눌린 특수 키의 `pen_key_{special}` → 없으면 `pen_down_{kbFrame}` → 없으면 `pen_down_0` → 없으면 `pen_up`. 누름 아니면 `pen_up`. 자동 반복 누름(R-24)은 `kbFrame`·`specialHeld`를 바꾸지 않으므로 꾹 누르는 동안 손 그림은 그대로이고 덩어리가 부르르 떤다. (CR-027 개정) 「누름 중」은 `isPressing` = 키 **또는 펜 모드 클릭 버튼**이 눌려 있음이다 — 마우스 클릭 누름도 손 그림을 `pen_down_{kbFrame}`으로 바꾼다(§10.8). 옛 문구 「마우스 클릭은 손 그림을 바꾸지 않는다」는 폐기.
- **위치·변형 수학**(`penTransform`): 어깨 S, 팔 변형 θh·θt·k(§10.4 `armTransform`, 같은 입력의 `armTransformFor`).
  1. 붙는 점 **P = 쉬는 자세 `pen_up` 그림의 중심** = `penPos + (w/2, h/2)`(w×h = `pen_up` 크기). 결정 근거는 `design/functions.md` §5.5 머리글(손은 크기가 안 변하므로 대표점 하나의 이동만 따라가면 되고, 중심이 손 본체라 기울 때 손이 팔 끝에서 벗어나지 않는다. 좌상단은 모서리 축 회전으로 손이 크게 튄다).
  2. **P' = S + R(θt)·diag(k, 1)·R(−θh)·(P − S)** — 팔 그림에 거는 `rotate(θt) scaleX(k) rotate(−θh)`(원점 S)와 같은 사상이라 P는 팔 그림 위의 같은 자리를 따라간다.
  3. 손 = `translate(P' − P) rotate(θt − θh)`, `transform-origin` = P(요소 좌표 `w/2 h/2`). **스케일 없음.** 각도는 (−180, 180]으로 접는다.
  4. 쉬는 자세(팔 변형 항등 — `atRest`, 모니터 없음, `stretch 1`·`θt = θh`)면 `PEN_REST` = `penPos` 그대로·회전 0.
- **`penPos === null` 기본 위치 규칙**(`defaultPenPos`): 손 그림 중심을 `mouse.hand ?? 이동 영역 중심(bilerpQuad(area, 0.5, 0.5))`에 둔다(정수 반올림). settings 미리보기도 같은 함수로 같은 자리를 보인다.
- **z 순서**: `.jellyWrap`의 마지막 자식(모든 레이어 위). 레퍼런스처럼 펜 쥔 손이 몸 앞·책상 위에 보여야 하고, `kb_up`이 캐릭터 전체를 그린 그림이어도(R-19) 손이 가려지지 않아야 하기 때문이다. 팔(z0)은 몸통 아래 그대로.
- **젤리·부르르**: `.jellyWrap` 안이라 몸·팔과 한 덩어리로 받는다(§10.3). `PenHand`에는 애니메이션 클래스가 없고, 안쪽 인라인 `transform`(translate·rotate)과 바깥 래퍼 `animation`(scale)이 서로 다른 요소라 겹쳐도 덮어쓰지 않는다.
- **표시 조건**: `settings.mouse !== null` && `pen_up` 등록. 모니터 목록이 비었거나 팔 그림(`mouse_base`)이 없어도 손은 그린다(팔 변형 계산 결과를 따름 — 모니터 없음이면 쉬는 자세).
- 움직임은 `transform`만(§6.3). `left/top` = `penPos`(정적 배치, 설정 변경 때만 바뀜). 그림 교체는 같은 `<img>`의 `src` 교체(§11 D-1 수용 범주).
- 계약: 펜 슬롯·`MouseSettings.penPos`는 contract v0.13에서 **확정·반영됨**(§7, doc-sync 2026-09-30). 펜 모드 판정은 §10.10(`isPenMode(manifest, mouse)`), 손 그림·키보드 레이어는 §10.12가 이 절의 해당 줄을 대체한다.

### 10.8 펜 모드 마우스 클릭 = 키 누름 (CR-027, R-26)

비유: 펜을 쥔 손에게는 키보드를 치는 것과 마우스를 딸깍 누르는 것이 똑같이 「펜을 종이에 대는 동작」이다. 그래서 손이 올려진 상태(`pen_up`)에서 어느 쪽이든 누르면 펜을 대고(`pen_down_N`) 몸이 한 번 출렁이며, 모든 누름을 떼야 펜을 든다.

- **적용 조건**: 펜 모드(`isPenMode(manifest)` = `pen_up` 등록)일 때만. `OverlayApp`이 `config.clickPress = isPenMode(manifest)`로 상태기계에 알린다. 펜 모드가 아니면 클릭은 `clickHeld`에 들어가지 않아 기존과 완전히 같다(클릭 파츠 교체 R-09만, 젤리 없음).
- **bridge 계약**: 기존 `input://mouse-button` `{ button, pressed, ts }`로 충분하다 — 버튼마다 누름·뗌이 따로 와서 눌린 버튼 목록을 ui가 만들 수 있다. 새 command·event·필드 없음(확인 완료, contract §4).
- **상태기계 변경 요지**(상세 `design/functions.md` §5.2): 새 상태 `clickHeld`(초기 `[]`), 새 판정 `isPressing(state) = kbDown || clickHeld.length > 0`. 새 클릭 누름 → `kbFrame` +1(키와 같은 카운터 — 키와 클릭을 섞어 눌러도 `pen_down_0 → 1 → 0 …`으로 이어서 순환), 누르기 전 `isPressing`이 거짓이었으면 `bounceSeq` +1(젤리 1회), `clickHeld`에 추가. 뗌 → `clickHeld`에서 제거(그 밖 불변).
- **결정한 규칙** — 클릭은 **특수 키가 아닌 일반 키 누름과 똑같이** 취급한다(기존 §10.6 3행 「일반 키는 특수 키 그림을 가리지 않는다」·13행 「이미 누름 중이면 재생 없음」과 일관):

| # | 입력(펜 모드, `pen_up`·`pen_down_0`·`pen_down_1`·`pen_key_space` 등록, `kbFrames` 2) | 손 그림 | 젤리 | 비고 |
|---|---|---|---|---|
| 1 | 아무것도 안 눌림 → 왼 클릭 누름 | `pen_down_1` | 재생(`bounceSeq` +1) | 클릭 파츠 `mouse_left`도 기존대로 |
| 2 | 1에서 왼 뗌 | `pen_up` | 클래스 없음 | `clickHeld []`, 키 없음 |
| 3 | 다시 왼 누름 → 뗌 → 오른 누름 → 뗌 | `pen_down_0` → `pen_up` → `pen_down_1` → `pen_up` | 누름마다 재생(짝 교대 `.jelly ↔ .jellyAlt`) | 「왔다갔다 바운스」 |
| 4 | 키 `a`를 누른 채 왼 클릭 누름 | `pen_down_{다음 kbFrame}` | 재생 없음(이미 누름 중 — 두 번째 누름) | 일반 키 두 개를 겹쳐 누를 때와 같음 |
| 5 | 4에서 `a`만 뗌(버튼 유지) | `pen_down_{kbFrame}` 유지 | 클래스 유지(새 재생 없음) | 「눌린 키·버튼이 남아 있으면 유지」 |
| 6 | 5에서 왼 뗌 | `pen_up` | 클래스 없음 | |
| 7 | 왼 클릭을 누른 채 키 `a` 누름 | `pen_down_{다음 kbFrame}` | 재생 없음 | `startsBounce` ⓐ가 `isPressing` 기준 |
| 8 | 왼 클릭을 누른 채 스페이스 누름 | `pen_key_space` | **재생**(특수 키 새 누름 ⓑ — 기존 규칙) | 가장 최근 특수 키가 이김(§10.6) |
| 9 | 스페이스를 누른 채 왼 클릭 누름 | `pen_key_space` **유지** | 재생 없음 | 클릭 = 일반 누름 → 특수 키 그림을 가리지 않음(§10.6 3행과 같음). `kbFrame`은 +1(보이지 않을 뿐) |
| 10 | 9에서 스페이스만 뗌(버튼 유지) | `pen_down_{kbFrame}` | 클래스 유지 | §10.6 6행과 같음 |
| 11 | 키 `a` 꾹 누름(부르르 중)에 왼 클릭 | 손 그림 `pen_down_{다음 kbFrame}` | **부르르 유지**(클릭은 `repeating`을 끄지 않음 — OS 키 반복은 클릭으로 멈추지 않는다) | 클릭 자체는 부르르를 만들지 않는다(마우스 버튼엔 OS 반복 없음, `isRepeating`은 `kbDown` 기준) |
| 12 | 11에서 `a` 뗌(버튼 유지) | `pen_down_{kbFrame}` | 클래스 없음(`bounceSeq === shiverSeq` — 부르르로 대체된 젤리를 되살리지 않음, §10.3 부르르 규칙 2) | |
| 13 | 왼·오른 동시에 누른 뒤 오른만 뗌 | `pen_down_{kbFrame}` 유지 | 두 번째 누름 재생 없음, 클래스 유지 | `mouse.button`은 as-built대로 `'none'`이 되어 클릭 파츠는 `mouse_base`로 돌아간다(R-09 기존 규칙, 변경 없음) |
| 14 | 펜 모드 아님(`pen_up` 없음)에서 클릭 | (펜 손 없음) | 없음 | 기존 그대로 |

- **유지되는 것**: 키보드 레이어(z3)는 펜 모드에서 계속 `kb_up`(`LayerStack` 변경 없음, `pickKeyboardEntry`는 `kbDown` 기준 그대로). 클릭 파츠(`MouseArm`의 `mouse_left`/`mouse_right`)는 `mouse.button`으로 기존대로 교체. `armAtRest`는 클릭으로 바뀌지 않는다(§5.1 규칙 그대로 — 쉬는 자세에서 클릭하면 손은 `penPos` 쉬는 자리에서 그림만 바뀐다). 유휴 판정: 클릭은 기존처럼 `wake`만 한다.
- **젤리 길이(기존과 같음)**: 젤리 클래스는 누르고 있는 동안만 붙어 있다(`isPressing`이 거짓이면 `null`). 350ms 전에 버튼을 떼면 젤리가 그 순간 끊긴다 — 키 누름과 같은 as-built 동작이며 이 CR에서 바꾸지 않는다.
- **모드 전환 중(수용)**: 버튼을 누른 채 `pen_up`이 등록·삭제되면 — 등록 순간 이미 눌린 버튼은 목록에 없으므로 떼기 전까지 누름으로 보지 않는다. 삭제 순간 목록에 남은 버튼은 뗌 이벤트 때 빠진다(뗌은 모드와 무관하게 항상 제거). 그 사이 펜 손은 그리지 않으며(`pen_up` 없음) 젤리 클래스가 남아 있어도 새로 재생되지는 않는다.
- **입력 비보관**: `clickHeld`는 지금 눌린 버튼(`left`/`right`)뿐, 떼면 빠진다. 키보드 정보가 아니며 이력·횟수·시각을 남기지 않는다(R-22 원칙 유지).

### 10.9 위치 잠금 중 동작·선택 상태 그림 (CR-029, R-27·R-28)

**판정: 오버레이 소스 변경 없음. `settings.positionLock`을 읽지 않는다.** R-27·R-28은 현행 소스(`src/overlay/index.tsx`·`components/LayerStack.tsx`)와 core 창 속성으로 이미 성립하며, 이 CR은 그 사실을 요구·설계·회귀 TC로 고정한다.

#### 10.9.1 위치 잠금(R-28)

비유: 잠금은 스티커 판에 「만지지 마세요」 팻말을 붙이는 것이 아니라 판을 유리 진열장 안에 넣는 것이다. 손이 판에 닿지 않으니 판 쪽에서 따로 막을 일이 없다.

| # | 항목 | 내용 |
|---|---|---|
| L-1 | 적용 주체 | core window `apply_overlay_window` → `set_ignore_cursor_events(position_lock)`(contract v0.14 §3.3 `positionLock` 주석 「core가 적용(§5.3 4단계·앱 시작)」, `doc/200_설계/core/window.md` §2.4). tao가 창에 `WS_EX_TRANSPARENT \| WS_EX_LAYERED`를 걸어 OS 적중 판정에서 오버레이 창이 빠진다 → 클릭·끌기·휠이 **아래 창으로 간다** |
| L-2 | 끌기 불가 | 창에 마우스 누름이 오지 않으므로 `.root`의 `data-tauri-drag-region`(P-7)이 시작되지 않는다. 속성은 그대로 둔다(잠금 해제 즉시 다시 동작) |
| L-3 | Ctrl+휠 불가 | 휠 이벤트가 WebView에 오지 않으므로 `onWheel`(`design/functions.md` §5.1)이 호출되지 않는다 → `setSettings` 호출 0회. 함수 본문 변경 없음 |
| L-4 | 적용 순서 | `set_settings`는 창 속성 적용(4단계) **뒤에** `settings://changed`를 보낸다(contract v0.14 §5.3). 오버레이가 `positionLock: true`를 받는 시점에는 이미 통과 상태이고, 풀 때도 core가 먼저 해제한다. 앱 시작 시에도 core가 적용한다 → ui가 개입할 틈이 없다 |
| L-5 | 잠금 중 그대로인 것 | 키보드·마우스 반응 전부(P-2·P-4 — 전역 훅 `input://*`는 창 적중과 무관): 커서 추종·팔 늘어나기, 클릭 파츠 교체(R-09), 펜 모드 클릭(R-26), 젤리·부르르, 유휴 전이. 뒤 창을 클릭해도 `input://mouse-button`은 그대로 온다 |
| L-6 | 잠금 중 배율 | 설정 창 배율 슬라이더(settings R-03) → `set_settings` → `settings://changed` → P-6 경로로 `settings` 교체·표시 배율 재계산(§10.5). 기존 경로, 변경 없음 |
| L-7 | 잠금 해제 | 설정 창 토글만(트레이 → 설정 열기). 오버레이에는 해제 수단·안내 문구가 없다(R-01 문구 없음, §8). (CR-062) R-40에 따라 잠금 중 오버레이 오른쪽 클릭 메뉴의 「설정 열기」로도 설정 창에 갈 수 있다(메뉴는 core) |
| L-8 (CR-062) | 잠금 중 오른쪽 클릭 | 아래 창으로 **전달**(막지 않음) + core 전역 훅이 감지해 트레이와 같은 메뉴를 띄움(**전체 화면이면 생략**, R-40 🔒 U-3). WebView에는 `contextmenu`가 오지 않으므로 `preventContextMenu`는 불리지 않는다 — 정상. ui 코드 분기 없음(§10.16) |

방어 코드(`onWheel` 첫 줄 `if (settings.positionLock) return`, 잠금 중 `data-tauri-drag-region` 제거)를 **두지 않는 이유**:

1. **단일 판정.** 잠금의 적용 주체는 core 한 곳이다(L-1). ui가 같은 값으로 다시 판정하면 판정이 둘이 되고 어긋날 여지가 생긴다(ui-design-strategy §7 「단일 판정」과 같은 취지).
2. **도달 불가.** 잠금 중에는 해당 이벤트가 오지 않으므로(L-2·L-3·L-4) 방어 분기는 실행될 경로가 없는 코드다.
3. **실패 시 반쪽 상태.** core의 창 속성 적용이 실패하면 `set_settings`가 실패해 설정 창에 오류 줄이 뜬다(contract v0.14 §5.3, settings design). 이때 ui가 휠만 막으면 「끌기는 되는데 휠만 안 되는」 상태가 되어 더 혼란스럽다.
4. **수용 기준.** 아키텍처 인계 패킷(`settings-v2-03-packet-ui.md` §5·§6 U-10)이 오버레이 소스 diff 0을 요구한다.

잔여 위험(수동 확인 대상): Windows 「비활성 창 위에서 스크롤」이 꺼져 있고 오버레이가 키보드 포커스를 가진 채 잠기면 휠이 포커스 창으로 갈 수 있다. 잠금 토글을 누르는 순간 설정 창이 포그라운드이므로 실사용 발생 조건은 없다고 판단한다. `test/manual-checklist.md`의 위치 잠금 항목(ui-test-designer)으로 판정하며, 실측에서 휠이 닿으면 방어 코드는 「추가 후보」로 관리자 판단을 받는다(이 문서에서는 설계하지 않음).

#### 10.9.2 대기·쉬는중 그림 선택(R-27)

| 조건 | 상태 레이어 z2 | 키보드 레이어 z3 | 보이는 캐릭터 |
|---|---|---|---|
| `idle` 없음 · 대기 · 누름 없음 | 없음(투명) | `kb_up` | `kb_up` |
| `rest` 없음 · 쉬는중 | 없음(투명) | `kb_up` | `kb_up`(팔은 쉬는 위치 — R-11·R-15 그대로) |
| `idle`만 있음 · 쉬는중 | 없음(`rest` 미등록 — `idle` 그림이 남지 않음) | `kb_up` | `kb_up` |
| `idle`·`rest` 없음 · 키 누름 | 없음 | `kb_down[kbFrame]` 또는 특수 키 그림(§10.6) | 누름 그림 |
| `idle`·`rest` 없음 · 펜 모드 | 없음 | `kb_up` 고정(§10.7) | `kb_up` + 펜 쥔 손 |

- 근거 소스(현행, 변경 없음): `LayerStack` 상태 레이어 = `findEntry(manifest, machine.layer)` → 미등록이면 `Layer`가 `null`(렌더 안 함). 키보드 레이어 = `isPenMode ? findEntry('kb_up') : pickKeyboardEntry`이고 `kbDown`이 `false`면 `kb_up`(`design/functions.md` §5.3).
- 상태기계는 그림 유무를 모른다 — 대기 ↔ 쉬는중 전이(R-05)·`armAtRest`(R-15)는 그대로 일어난다.
- 필수 그림(`kb_up`·`kb_down_0`·`mouse_base`)이 비어 있는 경우의 안내는 설정 창 몫이다. 오버레이는 없는 그림을 그리지 않을 뿐 오류·안내를 표시하지 않는다(R-01, R-09).
- 회귀 TC(예정, ui-test-designer): ① `idle`·`rest` 없는 매니페스트에서 상태 레이어 `<img>` 없음 + `kb_up` `<img>` 보임 ② 같은 매니페스트로 `rest` 진입(tick 유휴 경과)해도 ① 그대로 ③ 누름 중 `kb_down` 표시·`kb_up` 없음(상태 레이어가 겹쳐 그려지지 않음) ④ `idle`만 있는 매니페스트에서 `rest` 진입 시 `idle` `<img>` 사라짐. R-28: vitest 대상 없음(창 속성은 core) — 수동 확인표 ⑤ 잠금 켬 → 오버레이 위 클릭이 뒤 창으로 감 ⑥ 끌기 안 됨 ⑦ Ctrl+휠 배율 불변 ⑧ 잠금 중에도 키·마우스 반응 ⑨ 해제 후 끌기·Ctrl+휠 다시 됨.

### 10.10 펜 손 사용 토글 (CR-033, R-29)

비유: 펜 쥔 손은 전원 스위치가 달린 도장이다. 스위치가 켜져 있으면 타자·클릭 때마다 도장을 찍듯 그림이 바뀌고, 꺼져 있으면 도장은 팔 끝에 매달려 따라다니기만 한다. 그림(`pen_up`)을 넣는 것만으로는 스위치가 켜지지 않는다.

- **판정**: `penMode = isPenMode(manifest, settings.mouse)` = `findByKey(manifest, 'pen_up') !== undefined && settings.mouse?.penMode === true`. `OverlayApp` 렌더에서 한 번 계산해 아래 셋에 같은 값을 넘긴다. **이 식이 §4 `config` 행의 `isPenMode(manifest)`, §10.7 첫 줄 「펜 모드 = `pen_up`이 있을 때」, §10.8 「적용 조건」을 대체한다.**
- **`config`**(§4 대체): `useMemo(() => ({ idleMs: settings.idleSeconds * 1000, kbFrames: penMode ? penDownFrameCount(manifest) : kbDownFrameCount(manifest), clickPress: penMode }), [settings.idleSeconds, manifest, penMode])`.
- **`LayerStack`**: 새 prop `penMode: boolean`. 키보드 `Layer` = `penMode ? findEntry(manifest, 'kb_up') : pickKeyboardEntry(manifest, machine)`. 내부에서 `isPenMode`를 부르지 않는다.
- **`PenHand`**: 새 prop `penMode: boolean`. `pen_up`이 없으면 `null`(기존). 있으면 `entry = penMode ? pickPenEntry(manifest, machine) : up`. 위치·팔 끝 추종·기울기·크기 불변·z 순서·표시 조건(`settings.mouse !== null`)은 §10.7 그대로. `pickPenEntry`는 바꾸지 않는다(펜 모드 여부는 호출하는 쪽이 정한다).
- **꺼짐 동작 표**(`pen_up` 등록, `penMode false`):

| 입력 | 키보드 레이어 | 손 그림 | 젤리 | 클릭 파츠 |
|---|---|---|---|---|
| 키 누름 | `kb_down[kbFrame]`·특수 키 그림(R-07·R-22) | `pen_up` | 기존 규칙(R-23) | — |
| 왼·오른 클릭 누름 | 그대로 | `pen_up` | 없음(`clickPress false`) | `mouse_left`/`right`(R-09) |
| 마우스 이동 | 그대로 | 팔 끝을 따라 이동·기울기 | — | — |

- **전환**: `settings://changed`로 `penMode`가 바뀌면 다음 렌더부터 적용된다. `config`가 바뀌어도 상태기계 상태는 초기화하지 않는다. 켜짐 → 꺼짐 때 이미 눌린 클릭은 `clickHeld`에 남아 있다가 떼면 항상 빠진다(기존 `onMouseButton` 규칙). 꺼짐 → 켜짐 때 이미 눌려 있던 클릭은 누름으로 치지 않는다(기존 「모드 전환」 규칙 그대로, TC-207).
- **계약**: `MouseSettings.penMode: boolean`(기본 `false`), contract v0.15 §3.3. `getSettings`·`onSettingsChanged`로 받고 새 래퍼는 없다. 필드가 없는 옛 설정은 `penMode !== true`라 꺼짐으로 동작한다. 구현 선행 조건 = `src/bridge/types.ts`에 필드가 있을 것.
- **§7 계약 사용표 추가 행**(표 대신 여기 적음): 종류 = 타입 · 계약 = `MouseSettings.penMode`(v0.15, 확정) · 래퍼 = 없음(`getSettings`·`onSettingsChanged`) · 페이로드 = `Settings.mouse.penMode` · 호출 위치 = `OverlayApp` 렌더 `isPenMode` · 실패 시 표시 = 없음(필드가 없으면 꺼짐).

### 10.12 펜 손 단순화 (CR-042, R-31)

(절 번호 주: 이 절은 문서 위치상 §10.11 앞에 있다 — 번호는 작성 순서이며 내용상 §10.7~§10.10의 개정이라 그 뒤에 둔다. §10.11 헤어는 이 절과 무관하다.)

비유: 펜 쥔 손은 이제 「종이에 대기 / 떼기」 두 동작만 하는 도장이다. 어떤 키든 누르면 도장을 찍고(`pen_down_0`), 특수 키일 때만 몸(본체)이 그 키 표정으로 함께 바뀐다.

**이 절이 대체하는 옛 문장**: §10.7 「손 그림 선택」 줄 전체와 「키보드 레이어 고정」 줄(「항상 `kb_up`(`kb_down`·`key_*` 무시)」·「`config.kbFrames` = 펜 누름 그림 수」), §10.8 「상태기계 변경 요지」의 「`pen_down_0 → 1 → 0 …`으로 이어서 순환」·표의 「손 그림」 열·「유지되는 것」의 「키보드 레이어(z3)는 펜 모드에서 계속 `kb_up`」, §10.9.2 표 「펜 모드」 행의 「`kb_up` 고정」, §10.10 `config` 식의 `penDownFrameCount(manifest)`·`LayerStack` 줄의 `findEntry(manifest, 'kb_up')`. 그 밖의 §10.7~§10.10 규칙(판정 `isPenMode(manifest, mouse)`·위치·변형 수학·z 순서·표시 조건·클릭 = 일반 누름·젤리·부르르·전환·꺼짐 동작)은 그대로다.

- **적용 조건**: `penMode === true`(§10.10 판정, 불변). 꺼짐이면 이 절은 적용되지 않는다(키보드 = `pickKeyboardEntry`, 손 = `pen_up`, §10.10 꺼짐 표 그대로).
- **손 그림**(`pickPenEntry` 개정, `design/functions.md` §5.5 CR-042 블록): `up = pen_up`(없으면 `undefined`) → `!isPressing(machine)`이면 `up` → 아니면 `pen_down_0 ?? up`. **`kbFrame`·`specialHeld`를 읽지 않는다.** 키·클릭·특수 키 모두 같은 `pen_down_0`.
- **키보드 레이어**(새 function `pickPenKeyboardEntry`, `LayerStack.tsx` named export): `!machine.kbDown` → `kb_up` / `s = currentSpecial(machine)`가 `null`이 아니고 `findEntry(manifest, SPECIAL_KEY_SLOT[s])`가 있으면 그 그림 / 아니면 `kb_up`. `kb_down`은 펜 모드에서 절대 쓰지 않는다. 클릭만 눌린 상태(`clickHeld` 비지 않음, `kbDown` false)는 `kb_up`. 특수 키를 떼면 아직 눌린 이전 특수 키 그림으로 돌아가고(§10.6 5행 규칙), 없으면 `kb_up`(§10.6 6행의 `kb_down[kbFrame]` 자리가 펜 모드에서는 `kb_up`).
- **`LayerStack` 렌더**: kb = `penMode ? pickPenKeyboardEntry(manifest, machine) : pickKeyboardEntry(manifest, machine)`. 같은 키보드 `<Layer>` 요소·같은 `<img>` 유지(src만 바뀜), 순서·바운스 없음 규칙 불변.
- **`PenHand` Props**(as-built, `PenHand.tsx` `interface Props` — doc-sync 2026-09-30): `manifest`·`machine`·`mouse`·`monitors`·`cursor`·`anchor`·`atRest`·`penMode` 8개(CR-042로 props 증감 없음). `machine`은 `isPressing`만 읽는다(`kbFrame`·`specialHeld` 안 읽음). 렌더 = `up = findByKey(manifest, 'pen_up')` 없으면 `null` → `entry = penMode ? pickPenEntry(manifest, machine) : up` → 위치·변형은 §10.7 그대로. 타입·의미 표는 `design/functions.md` §5.5 「`PenHand` Props」.
- **대체 문장 추가(doc-sync 2026-09-30)**: `design/functions.md` §5.5 머리글의 「`pen_down_*`·`pen_key_*`가 크기가 달라도」(→ `pen_down_0`으로 정정됨), RTM R-19·R-22 비고의 「펜 모드 키보드 `kb_up` 고정」「`pen_key_*`(손 그림)」 서술도 이 절이 대체한다(RTM 비고는 이 날짜에 정정).
- **`config`**(§4·§10.10 대체): `useMemo(() => ({ idleMs: settings.idleSeconds * 1000, kbFrames: penMode ? 1 : kbDownFrameCount(manifest), clickPress: penMode }), [settings.idleSeconds, manifest, penMode])`. 펜 모드에서는 보이는 순환 그림이 없으므로 `kbFrames = 1`(→ `kbFrame`은 항상 0). 꺼짐 ↔ 켜짐 전환 때 상태기계는 초기화하지 않는다(§10.10 그대로 — 켜짐으로 바뀐 직후 남은 `kbFrame` 값은 어떤 그림 선택에도 쓰이지 않는다). `penDownFrameCount`는 **삭제**(`LayerStack.tsx` export·`index.tsx` import 제거).
- **바운스·부르르**: 트리거 불변(`startsBounce` ⓐ 아무것도 안 눌린 상태의 첫 누름(키·펜 모드 클릭) ⓑ 특수 키 새 누름, `wrapMotion`·`shiverSeq` 규칙). 특수 키 새 누름 때 본체 `key_*` 교체와 손 `pen_down_0`가 같은 렌더에서 바뀌고 젤리가 한 번 재생된다.
- **남은 옛 파일**: 매니페스트에 `pen_down_1+`·`pen_key_*`가 남아 있어도(옛 설정 창에서 등록) 오버레이는 읽지 않는다. `pen_down_0`이 없으면 누름 중에도 손은 `pen_up`(오류·안내 없음). 손 위치·회전 기준은 계속 `pen_up` 크기(§10.7 불변).
- **동작 표**(펜 모드, 등록 `pen_up`·`pen_down_0`·`key_space`, `key_enter` 미등록, `kbFrames` 1):

| # | 입력 | 키보드 레이어(z3) | 손 그림 | 젤리 |
|---|---|---|---|---|
| 1 | 아무것도 안 눌림 | `kb_up` | `pen_up` | 클래스 없음 |
| 2 | 일반 키 `a` 누름 | `kb_up` | `pen_down_0` | 재생 |
| 3 | 2에서 `a` 뗌 | `kb_up` | `pen_up` | 클래스 없음 |
| 4 | 스페이스 누름 | `key_space` | `pen_down_0` | 재생 |
| 5 | 4에서 스페이스 뗌 | `kb_up` | `pen_up` | 클래스 없음 |
| 6 | Enter 누름(`key_enter` 없음) | `kb_up` | `pen_down_0` | 재생 |
| 7 | `a`를 누른 채 스페이스 누름 | `key_space` | `pen_down_0` | 재생(특수 키 새 누름 ⓑ) |
| 8 | 7에서 스페이스만 뗌(`a` 눌림) | `kb_up` | `pen_down_0` | 새 재생 없음 |
| 9 | 왼 클릭 누름(아무것도 안 눌린 상태) | `kb_up` | `pen_down_0` | 재생 |
| 10 | 스페이스를 누른 채 왼 클릭 누름 | `key_space` 유지 | `pen_down_0` | 재생 없음 |
| 11 | 왼 클릭을 누른 채 스페이스 누름 | `key_space` | `pen_down_0` | 재생(ⓑ) |
| 12 | 11에서 스페이스만 뗌(클릭 유지) | `kb_up` | `pen_down_0` | 새 재생 없음 |
| 13 | 스페이스 꾹 누름(자동 반복) | `key_space` 유지 | `pen_down_0` 유지 | 부르르 |
| 14 | 연타 `a` `a` `a`(각각 누름·뗌) | `kb_up` | `pen_down_0` ↔ `pen_up`(순환 없음) | 누름마다 재생(`.jelly ↔ .jellyAlt`) |

- **입력 비보관**: 변경 없음(특수 키 분류값은 `specialHeld`에만, R-22).
- **계약**: 변경 없음. `AssetSlot` 펜 슬롯(`pen_down_{n}`·`pen_key_*`)은 contract에 그대로 있고 이 화면이 `pen_up`·`pen_down_0` 두 키만 찾는다(`findByKey`).
- **회귀 TC(예정, ui-test-designer)**: ① `pickPenEntry` — 누름 없음 `pen_up` / 키 누름·클릭 누름·특수 키 누름 모두 `pen_down_0`(`kbFrame` 1·`pen_down_1`·`pen_key_space` 등록 픽스처에서도) / `pen_down_0` 없음 → `pen_up` / `pen_up` 없음 → `undefined` ② `pickPenKeyboardEntry` — 위 표 1~13행의 키보드 열 ③ `LayerStack` `penMode` true/false 분기 ④ `OverlayApp` 펜 모드 `config.kbFrames` = 1, 꺼짐 = `kbDownFrameCount` ⑤ 옛 파일(`pen_down_1`·`pen_key_space`) 등록 매니페스트에서 쓰이지 않음.

### 10.11 헤어(뒷머리) 파츠 (CR-037, R-30)

비유: 장발 캐릭터를 종이 인형으로 만들면 뒷머리는 몸 뒤에 따로 오려 붙인다. 그래야 팔을 앞으로 뻗을 때 팔이 머리카락 **앞**을 지나간다. `hair`는 그 뒷머리 한 장이고, 인형(젤리 판)에 같이 붙어 있어 인형이 출렁이면 함께 출렁인다.

- **자리(CR-051 개정)**: `.canvas` **첫 자식** `.hairWrap` 안의 `HairLayer`(hair 등록 시에만 래퍼 렌더) — 겹침 아래→위 = 헤어 → `BackgroundLayer` → `PomodoroLayer` → `.jellyWrap`(`MouseArm` → `LayerStack` → `PenHand`). 투명 창이라 헤어 뒤에는 아무것도 없다. 아래는 CR-037 원문(헤어 자리 부분은 대체됨): `.jellyWrap`의 첫 자식 `HairLayer`(`design/components.md` §3 규칙 7). 겹침(아래→위, 확정사항 §6 🔒) = `BackgroundLayer`(래퍼 밖) → `HairLayer` → `MouseArm`(팔·클릭 파츠) → `LayerStack`(몸통·상태·키보드 = 본체) → `PenHand`(펜 쥔 손). 확정사항의 「팔·손 → 본체」 중 펜 쥔 손은 R-25(§10.7)로 이미 본체 위에 있으므로 바꾸지 않는다 — 헤어는 팔과 펜 쥔 손 **모두**의 아래라 「팔·손이 헤어에 가려지지 않는다」는 목적을 그대로 만족한다.
- **그림**: `findEntry(manifest, 'hair')` 한 장. 상태(`idle`/`rest`)·키 누름·특수 키·클릭·펜 모드(R-29)·위치 잠금(R-28)과 무관하게 같은 그림이다. 여러 장·순환 없음.
- **좌표·배율**: 캔버스 레이어 — `styles.layer`(캔버스 전체 `left:0 top:0 100%`). 위치 조정·좌표 계산 없음. `.canvas` `scale`을 공유해 배경·키보드와 같은 맞춤·배율(§10.5).
- **모션**: 자체 애니메이션·인라인 `transform` 없음. (CR-051) 부모 `.hairWrap`이 `jellyClass(motion, styles.hairWrap)`로 `.jellyWrap`과 같은 `motion` 값의 클래스를 같은 커밋에 받는다 — 기하·`transform-origin: 50% 100%`가 같아 본체와 같은 모양으로 출렁인다. 젤리 도중 hair가 새로 등록되면 그 1회만 위상이 어긋난다(허용). 이하 CR-037 원문: 젤리(R-23)·부르르(R-24)는 부모 `.jellyWrap`에서 본체와 같은 순간·같은 모양으로 받는다(§10.3). 팔 회전·늘어나기의 영향은 받지 않는다(팔은 형제 요소).
- **없을 때**: `hair` 항목이 없으면 `HairLayer`가 `null` — 투명, 정상, 오류·안내 없음(선택 슬롯, 내장 기본 그림 없음). 필수 판정은 core·settings 소관이며 `hair`는 필수가 아니다.
- **갱신**: `assets://changed`(등록·교체·비우기) → `setManifest` → `HairLayer`(`memo`) 재렌더. 입력·tick으로는 재렌더되지 않는다.
- **성능**: `<img>` 1개 추가. 리렌더 원인은 `manifest` 변화뿐이라 §6.3 규칙 위반 없음(D-1 preload 편차는 기존 수용 범위 그대로).
- **회귀 TC(예정, ui-test-designer)**: ① `hair` 등록 매니페스트 → `.jellyWrap`의 첫 자식 `<img>` `src` = hair `url`, 클래스 `layer`만, `style` 속성 없음 ② DOM 순서: `.canvas` 첫 자식 = 배경 `<img>`, `.jellyWrap` 자식 순서 = hair `<img>` → `.armWrap` → `LayerStack` `<img>`들 → 펜 손 `<img>` ③ `hair` 없음 → `.jellyWrap` 첫 자식이 `.armWrap`(또는 `LayerStack` 첫 `<img>`), hair `<img>` 없음 ④ 키 누름·`rest` 진입·클릭·펜 모드 켬 후에도 hair `<img>` `src` 불변 ⑤ 젤리 재생 중 hair `<img>`의 조상에 `.jellyWrap`(`.jelly`/`.jellyAlt`/`.shiver`)이 있고 배경 `<img>`의 조상에는 없음 ⑥ `assets://changed`로 hair 추가·삭제 즉시 반영 ⑦ `settings.mouse === null`·`monitors = []`여도 hair 표시. 수동: 팔을 뒷머리 쪽으로 움직일 때 팔이 머리카락 앞에 보임, 젤리 때 머리카락이 몸과 함께 출렁이고 배경은 정지.

### 10.13 타자 입력 그림이 없을 때 — 키보드 모드 폴백 (CR-043, R-32)

비유: 「타자 칠 때 꺼내 드는 사진」이 앨범에 한 장도 없으면, 빈 액자를 내미는 대신 평소 사진(기본)을 그대로 들고 몸만 들썩인다.

- **판정(현행 소스)**: **미충족.** `pickKeyboardEntry`(`src/overlay/components/LayerStack.tsx`)는 `kbDown`이고 특수 키 그림이 없으면 `kb_down[kbFrame] ?? kb_down[0]`만 찾는다. `kb_down`이 하나도 없으면 `undefined` → 키보드 `Layer`가 렌더하지 않아, 누르는 동안 키보드 레이어가 **투명**해진다(본체를 `kb_up`에 그린 캐릭터는 누를 때마다 사라짐). `kbDownFrameCount`는 `max(1, 0)` = 1이라 `kbFrame`은 0 고정(문제 없음). 젤리·부르르는 상태기계 `kbDown`·`wrapMotion` 기준이라 그림 유무와 무관하게 이미 재생된다.
- **개정(`pickKeyboardEntry`, 시그니처 불변 `(manifest: AssetManifest, machine: MachineState) => AssetEntry | undefined`)**: 마지막 반환식 끝에 `?? findEntry(manifest, 'kb_up')`를 덧붙인다. 규칙(키보드 모드 = `penMode` false):

| # | 조건 | 키보드 레이어 그림 | 비고 |
|---|---|---|---|
| 1 | `kbDown` false | `kb_up` | 불변 |
| 2 | `kbDown`, 가장 최근 특수 키의 `key_*` 등록 | `key_*` | 불변 |
| 3 | `kbDown`, `kb_down[kbFrame]` 등록 | `kb_down[kbFrame]` | 불변 |
| 4 | `kbDown`, 3 없음, `kb_down[0]` 등록 | `kb_down[0]` | 불변 |
| 5 | `kbDown`, 2·3·4 모두 없음(일반 키, 또는 그림 없는 특수 키) | **`kb_up`** | **신규(CR-043)** |
| 6 | 5에서 `kb_up`도 없음 | 없음(`undefined`, 투명) | 불변 — 오류·안내 없음 |

- **바운스만**: 5행에서 그림은 `kb_up` 그대로이고 `.jellyWrap`의 젤리(§10.3)·부르르 규칙은 불변이라 캐릭터가 출렁이기만 한다. 같은 키보드 `<img>` 요소를 유지하고 src는 이미 preload된 `kb_up` URL이라 깜빡임·빈 그림이 없다.
- **불변**: 펜 모드(`pickPenKeyboardEntry`, §10.12 — 원래 `kb_down`을 쓰지 않음), `OverlayApp` `config.kbFrames`(§10.12 식), 상태기계, DOM 순서, 성능(리렌더 원인 불변).
- **대체 읽기**: `design/functions.md` §5.3 `pickKeyboardEntry` 행·§10.6 규칙표의 「없으면 `kb_down[0]`」 뒤에 위 5·6행을 덧붙여 읽는다. §10.9.2의 「필수 그림(`kb_up`·`kb_down_0`·`mouse_base`)」은 **`kb_up`·`mouse_base`**(contract v0.19 `REQUIRED_SLOTS`)로 읽는다 — 오버레이는 필수 판정을 하지 않으므로 코드 영향 없음.
- **계약**: 새 command·event 없음. v0.19 `REQUIRED_SLOTS` 변경은 오버레이가 읽지 않는다.
- **파일 크기**: `LayerStack.tsx` +1줄.
- **회귀 TC(예정, ui-test-designer)**: ① `pickKeyboardEntry` — `kb_down` 없음·`kbDown` true·일반 키 → `kb_up` / 그림 없는 특수 키 → `kb_up` / `key_*` 있음 → `key_*` / `kb_up`도 없음 → `undefined` ② `kbDownFrameCount` 빈 매니페스트 → 1 ③ `OverlayApp` — `kb_down` 없는 매니페스트에서 키 누름 → 키보드 `<img>` src = `kb_up` URL, `.jellyWrap`에 `jelly` 클래스 ④ 기존 `pickKeyboardEntry`·특수 키 렌더 TC(§10.6 계열) 회귀.

### 10.14 뽀모도 타이머 (CR-045, R-33~R-36)

비유: 두 창이 같은 벽시계를 본다. 벽시계(core)가 「지금 12분, 가는 중」이라고 한 번 알려 주면 창은 그때부터 스스로 초를 센다. 벽시계가 「멈춤」이라고 알려 오면 세기를 멈춘다. 오버레이는 벽시계 옆 액자(뽀모도 그림)에 숫자를 적어 둘 뿐이다.

> 분할 문서: 아래 14.3(컴포넌트)·14.4(function)는 `design/components.md` §3.x(CR-045 블록, 규칙 8)·`design/functions.md` §5.6에 같은 내용으로 옮겨 적었다.

**14.1 자리(DOM, R-33).** `.canvas` 직계 자식 순서(아래→위):

```
.canvas  (transform: scale(s))
├─ <div class="hairWrap [jelly|jellyAlt|shiver]">              CR-051, hair 있을 때만
│    └─ HairLayer <img class="layer">
├─ BackgroundLayer   <img class="layer">                       배경
├─ PomodoroLayer     <div class="pomodoro">                    CR-045, 고정
│    ├─ <img class="layer"> pomo_char     (등록돼 있을 때만)
│    ├─ <img class="layer"> pomo_bubble   (등록돼 있을 때만)
│    └─ TimerText <div style=timerTextStyle(timer)>           (U-1 참일 때만)
└─ <div class="jellyWrap [jelly|jellyAlt|shiver]">  (arm·body·kb·pen — hair는 CR-051로 .hairWrap)
```

- `.pomodoro` CSS(`src/overlay/overlay.module.css`, 새 클래스 1개): `.pomodoro { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; }` — 애니메이션·`transform` 없음. 글자의 `left/top`(캔버스 좌표)이 이 상자 기준이 된다.
- 격리 규칙: `.pomodoro`와 그 자손에는 `.jelly`·`.jellyAlt`·`.shiver`·인라인 애니메이션을 붙이지 않는다. `PomodoroLayer`를 `.jellyWrap` 안에 두지 않는다(두면 본체와 함께 출렁여 「배경처럼 고정」 위반). `.jellyWrap`의 JSX·클래스는 바꾸지 않는다.

**14.2 표시 조건(R-33·R-34, U-1).**

| # | `timer.enabled` | `pomo_char` | `pomo_bubble` | 인물 `<img>` | 말풍선 `<img>` | 글자 | `PomodoroLayer` 결과 |
|---|---|---|---|---|---|---|---|
| 1 | false | 없음 | 없음 | — | — | 없음 | `null` |
| 2 | true | 없음 | 없음 | — | — | 있음 | `.pomodoro` + 글자 |
| 3 | false | 있음 | 없음 | 있음 | — | 있음(멈춘 값) | `.pomodoro` + 인물 + 글자 |
| 4 | false | 없음 | 있음 | — | 있음 | 있음(멈춘 값) | `.pomodoro` + 말풍선 + 글자 |
| 5 | true | 있음 | 있음 | 있음 | 있음 | 있음 | 셋 다(순서 인물 → 말풍선 → 글자) |

타이머 상태(흐름·일시정지·멈춤)·입력·쉬는중·펜 모드·위치 잠금은 표시 여부에 영향이 없다.

**14.3 컴포넌트.**

| 컴포넌트 | 파일 | 분류 | props | 이벤트/부작용 | 요구ID |
|---|---|---|---|---|---|
| `PomodoroLayer` (default export, `React.memo`) — 신규 | `src/overlay/components/PomodoroLayer.tsx` | 화면 로컬 | `manifest: AssetManifest`, `timer: TimerSettings`(둘뿐 — `machine`·`cursor` 등 입력 prop 없음) | 없음(순수 렌더). `char = findEntry(manifest, 'pomo_char')`, `bubble = findEntry(manifest, 'pomo_bubble')`(`./LayerStack` named export 재사용), `showText = isTimerTextVisible(timer, manifest)`. `!char && !bubble && !showText`면 `null`, 아니면 `<div className={styles.pomodoro}>{char && <img className={styles.layer} src={char.url} alt="" draggable={false} />}{bubble && <img … bubble.url …/>}{showText && <TimerText timer={timer} />}</div>`. named export `isTimerTextVisible` | R-33, R-34 |
| `TimerText` (default export) — 신규 | `src/overlay/components/TimerText.tsx` | 화면 로컬(설정 창은 같은 훅·스타일 함수를 쓰되 끌기 때문에 자기 컴포넌트를 둔다 — 공용 승격 대상 아님) | `timer: TimerSettings` | `const { snapshot, receivedAt } = useTimerSnapshot()`, `const text = useElapsedText(snapshot, receivedAt)` → `<div style={timerTextStyle(timer)} aria-hidden="true">{text}</div>`. 클래스 없음 | R-34, R-36 |
| `useTimerSnapshot` — 신규 공용 훅 | `src/components/hooks/useTimerSnapshot.ts` | 공용(`src/components/hooks` — overlay `TimerText`·settings 미리보기 공용) | 없음 → `{ snapshot: TimerSnapshot; receivedAt: number }` | bridge `onTimerChanged` 구독·`getTimer` 조회(14.4) | R-34, R-35, R-36 |
| `useElapsedText` — 신규 공용 훅 | `src/components/hooks/useElapsedText.ts` | 공용 | `(snapshot: TimerSnapshot, receivedAt: number) => string` | `running`일 때만 interval(14.4) | R-34 |
| `timerClock` — 신규 공용 유틸 | `src/components/utils/timerClock.ts` | 공용(순수) | — | 없음 | R-34 |

`OverlayApp` 변경: ① import `PomodoroLayer`, `setResting`(barrel `bridge`), `DEFAULT_TIMER_SETTINGS`(`bridge`) ② `.canvas` 안 `<BackgroundLayer manifest={manifest} />` 바로 뒤에 `<PomodoroLayer manifest={manifest} timer={settings.timer ?? DEFAULT_TIMER_SETTINGS} />` ③ 쉬는중 보고 효과(14.4) — 기존 「쉬는중 진입 효과」(`armAtRest`) 바로 뒤 ④ 파일 머리 `//!` 흐름 주석에 「BackgroundLayer → PomodoroLayer(고정) → .jellyWrap」 추가. 예상 +10줄(현행 253줄, 400줄 한계 안).

공용 배치 근거: 화면 폴더 밖 신규 파일 3개는 아키텍트 인계 패킷(`doc/200_설계/architecture/pomodoro-03-packet-ui.md` §1, 사용자 확정 CR-045 설계)이 지정했다 — 오버레이와 설정 창 미리보기가 같은 계산·같은 모양(A-1)을 써야 하므로 공용이 단일 소스다. 공용화 후보(§12)가 아니라 확정 배치다.

**14.4 function.**

| function | 위치·시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `nowMs` | `timerClock.ts` · `() => number` | `performance.now()`(단조 시계). 두 훅은 이 함수로만 시각을 읽는다 — 테스트는 `vi.spyOn(timerClock, 'nowMs')` 또는 `vi.useFakeTimers({ toFake: [...기본, 'performance'] })`로 시계를 움직인다 | 없음 | R-34 |
| `elapsedNow` | `timerClock.ts` · `(s: TimerSnapshot, receivedAt: number, now: number) => number` | `s.elapsedMs + (s.status === 'running' ? Math.max(0, now - receivedAt) : 0)` | 없음(음수 차이는 0) | R-34, R-35 |
| `formatElapsed` | `timerClock.ts` · `(ms: number) => string` | `ms`가 유한수가 아니거나 음수면 `'00:00:00'`. 아니면 `t = Math.floor(ms / 1000)`, `h = Math.floor(t / 3600)`, `m = Math.floor(t % 3600 / 60)`, `sec = t % 60` → `${pad2(h)}:${pad2(m)}:${pad2(sec)}`(`pad2` = 최소 2자리 앞 0, 시는 99를 넘으면 자릿수가 늘고 자르지 않음). 예: 0 → `00:00:00`, 999 → `00:00:00`, 3 723 000 → `01:02:03`, 360 000 000 → `100:00:00`, −1·NaN·Infinity → `00:00:00` | 없음 | R-34, R-36 |
| `timerTextStyle` | `timerClock.ts` · `(t: TimerSettings) => CSSProperties` | `{ position: 'absolute', left: t.textPos.x, top: t.textPos.y, transform: \`translate(-50%, -50%) rotate(${t.rotation}deg)\`, transformOrigin: '50% 50%', fontSize: t.fontSize, color: t.color, lineHeight: 1, whiteSpace: 'nowrap', fontFamily: "'Segoe UI', 'Malgun Gothic', sans-serif", fontWeight: 700, fontVariantNumeric: 'tabular-nums', pointerEvents: 'none', userSelect: 'none' }`. `textPos` = 글자 상자 **중심**. 오버레이·설정 창 미리보기가 같은 함수(설정 창은 `pointerEvents`만 덮어씀) | 없음 | R-34 |
| `useTimerSnapshot` | `hooks/useTimerSnapshot.ts` · `() => { snapshot: TimerSnapshot; receivedAt: number }` | 상태 `useState({ snapshot: { status: 'stopped', elapsedMs: 0 }, receivedAt: 0 })`. 마운트 효과(`[]`): ① 지역 `cancelled = false`, `eventSeen = false`, `unlisten?`, `cancelFetch?` ② `apply = (s) => setState({ snapshot: s, receivedAt: nowMs() })` ③ `onTimerChanged(s => { if (cancelled) return; eventSeen = true; apply(s) })`를 await — 성공하면 `cancelled`면 즉시 해제, 아니면 `unlisten` 보관 ④ (구독 성공·실패 모두) `cancelFetch = fetchWithRetry(getTimer, s => { if (!cancelled && !eventSeen) apply(s) })` — **구독 먼저 → 조회**, 조회 전에 이벤트가 왔으면 조회 결과는 버린다(이벤트가 새 값) ⑤ cleanup: `cancelled = true`, `unlisten?.()`, `cancelFetch?.()`. `useBridgeEvent`는 쓰지 않는다(구독 완료 시점이 필요) | 구독 실패 → 조회만(이후 변경 못 받음). 조회가 재시도 3회 뒤에도 실패 → 초기값 유지. 문구 없음 | R-34, R-35, R-36 |
| `useElapsedText` | `hooks/useElapsedText.ts` · `(snapshot: TimerSnapshot, receivedAt: number) => string` | `calc = () => formatElapsed(elapsedNow(snapshot, receivedAt, nowMs()))`. `const [text, setText] = useState(calc)`, `lastRef = useRef(text)`, `push = (v) => { if (v !== lastRef.current) { lastRef.current = v; setText(v) } }`. 효과(`[snapshot, receivedAt]`): ① `push(calc())`(스냅숏이 바뀌면 즉시 반영) ② `snapshot.status !== 'running'`이면 끝(interval 없음) ③ `id = setInterval(() => push(calc()), 250)`, cleanup `clearInterval(id)`. 결과: 흐르는 동안 **초가 바뀔 때만** 다시 그림(초당 1회), 멈춘 상태면 타이머 없음, 언마운트 시 정리 | 없음 | R-34 |
| `isTimerTextVisible` | `PomodoroLayer.tsx` named export · `(timer: TimerSettings, manifest: AssetManifest) => boolean` | `timer.enabled \|\| findEntry(manifest, 'pomo_char') !== undefined \|\| findEntry(manifest, 'pomo_bubble') !== undefined`(U-1, 14.2 표) | 없음 | R-34 |
| `PomodoroLayer` 렌더 | 14.3 표 | 14.2 표 그대로. `React.memo` 기본 비교 — `manifest`·`timer` 참조가 같으면 다시 그리지 않는다 | 없음 | R-33, R-34 |
| `TimerText` 렌더 | 14.3 표 | `<div style={timerTextStyle(timer)} aria-hidden="true">{text}</div>` | 없음 | R-34 |
| 쉬는중 보고 효과 | `OverlayApp`(`index.tsx`) · `useEffect(() => { setResting(machine.layer === 'rest').catch(() => undefined) }, [machine.layer])` | 마운트 때 1회 `false`(오버레이가 다시 로드돼도 core에 남은 `restPaused`가 풀림 — core 멱등), 이후 `idle → rest`면 `true`, `rest → idle`이면 `false`. 같은 `layer`가 이어지면(tick·입력) 호출 없음. 상태기계(`src/state/inputMachine.ts`)는 고치지 않는다. 타이머 on/off와 무관하게 보낸다(판정은 core) | 실패 → 무시(문구·재시도 없음) | R-35 |

**14.5 성능.** 리렌더 경계: 초 갱신은 `TimerText`만 다시 그린다(훅 상태가 `TimerText` 안). `PomodoroLayer`는 `settings.timer`·`manifest`가 바뀔 때만, 마우스 이동(≤60Hz)·`machine` 변화로는 다시 그리지 않는다(memo + 참조 안정 — §4 `timer`). `OverlayApp`·`.jellyWrap`은 타이머 때문에 다시 그려지지 않는다(`setResting`은 상태를 바꾸지 않음). 글자 움직임 없음(정적 `transform`), `top/left`는 설정 변경 때만 바뀌는 정적 배치라 §6.3 위반 아님(§11 D-3과 같은 판단). 잔여 위험: 트레이로 오버레이를 숨기면 WebView2가 숨은 페이지 타이머를 늦출 수 있다 — 글자는 보이지 않으니 무해, 쉬는중 판정·`setResting`이 늦을 수 있음(02-design §7, verify에서 실측).

**14.6 계약·선행 조건.** 모두 §7 CR-045 행 인용(contract v0.21 예정). `src/bridge/types.ts`에 `'pomo_char'`·`'pomo_bubble'`·`TimerSettings`·`DEFAULT_TIMER_SETTINGS`·`Settings.timer`·`TimerStatus`·`TimerSnapshot`, `commands.ts`에 `getTimer`·`setResting`, `events.ts`에 `onTimerChanged`가 들어온 뒤 구현한다. 기존 오버레이 테스트의 bridge mock에 `getTimer`·`setResting`·`onTimerChanged`를 추가하고, `Settings` 픽스처에 `timer`가 빠져 있으면 `DEFAULT_TIMER_SETTINGS`로 채운다.

**14.7 접근성.** 오버레이 전체와 같다(`design/a11y.md` — 표시 면, 포커스·키보드 조작 없음). 시간 글자는 장식 표시라 `aria-hidden="true"`, 상태 알림(`aria-live`) 없음. 새 문구·aria-label 없음(§8).

**14.8 회귀·신규 TC(예정, ui-test-designer).** ① `timerClock.test.ts` — `formatElapsed` 예 5개, `elapsedNow` running 더함·paused·restPaused·stopped 안 더함·음수 차이 0, `timerTextStyle` 필드 전부 ② `useTimerSnapshot.test.tsx` — 구독이 조회보다 먼저, 조회 전 이벤트면 조회 결과 무시, 조회 실패(재시도 소진) → `stopped`·0, 언마운트 시 해제 ③ `TimerText.test.tsx`(가짜 타이머·`nowMs` 조작) — running이면 1 000ms 뒤 1초 증가, paused면 interval 없음, 초당 렌더 1회, `aria-hidden`·스타일 ④ `PomodoroLayer.test.tsx` — 14.2 표 5행, `<img>` 순서 인물 → 말풍선 → 글자, 스타일 left 268·top 402·fontSize 36·color·`rotate(7deg)`(현행 기본값 — contract v0.27, CR-058. CR-045 작성 당시 268·403·5°), `alt=""` ⑤ `OverlayApp.pomodoro.test.tsx` — `.canvas` 자식 순서 [배경, `.pomodoro`, `.jellyWrap`], 키 누름 뒤 `.jelly` 클래스가 `.pomodoro`·그 자손에 없음, 마운트 때 `setResting(false)` 1회, 유휴 경과 tick 뒤 `setResting(true)` 1회, 입력 뒤 `setResting(false)` 1회, 같은 layer 지속 시 추가 호출 없음 ⑥ 기존 오버레이 스펙 전부 Green(mock 보강) ⑦ 수동: 뽀모도 그림·글자가 본체 뒤·배경 위에서 흐름, 유휴 1분 설정 → 자동 일시정지·재개, 사용자 일시정지 뒤 입력해도 멈춤, 앱 재시작 → 00:00:00.

### 10.15 타이머 모드 — 카운트다운 표시·끝남 깜빡임·알림음 (CR-050, R-37~R-39)

비유: 벽시계(core)에 「거꾸로 세기」 모드가 생겼다. 액자(오버레이)는 벽시계가 「거꾸로, 25분짜리, 지금 3분 지남」이라고 알려 주면 남은 22분을 적는다. 벽시계가 「다 됐다」고 외치면 숫자를 깜빡이고 초인종을 한 번 누른다. 벽시계가 「다시 대기」라고 하면 깜빡임과 초인종을 멈춘다. 10초를 재는 것도, 0이 됐다고 판정하는 것도 벽시계다.

> 분할 문서: 컴포넌트 = `design/components.md` §3.y(+규칙 9, `TimerText.module.css` 전문), function = `design/functions.md` §5.7(①~⑥). 이 절은 규칙·흐름·결정·TC를 담는다.

**15.1 표시 규칙(R-37·R-38).** 입력은 스냅숏뿐이다(설정 `timer.mode`·`countdownSecs`는 표시에 쓰지 않는다 — 설정 이벤트와 타이머 이벤트의 도착 순서에 흔들리지 않게, contract v0.23 §3.9).

| # | 스냅숏(`mode`, `status`, `elapsedMs`, `durationMs`) | 글자 | `.blink` | interval |
|---|---|---|---|---|
| 1 | (없음, `stopped`, 0, 없음) — 초기값·옛 픽스처 | `00:00:00`(스톱워치) | 없음 | 없음 |
| 2 | (`stopwatch`, `running`, 12 000, 0) | 경과 내림(기존) | 없음 | 250ms |
| 3 | (`countdown`, `stopped`, 0, 1 500 000) | `00:25:00` | 없음 | 없음 |
| 4 | (`countdown`, `running`, 1 000, 1 500 000) 받은 직후 | `00:24:59`(남은 1 499 000 → 올림 1 499초) | 없음 | 250ms |
| 5 | (`countdown`, `running`, 0, 1 500 000) 받은 뒤 1ms | `00:25:00`(남은 1 499 999 → 올림) | 없음 | 250ms |
| 6 | (`countdown`, `paused`, 600 000, 1 500 000) | `00:15:00` | 없음 | 없음 |
| 7 | (`countdown`, `running`, …) 계산 남은 시간 ≤ 0(core `finished` 도착 전) | `00:00:00`(0으로 자름) | 없음 | 250ms(글자 불변이라 렌더 없음) |
| 8 | (`countdown`, `finished`, 1 500 000, 1 500 000) | `00:00:00` | **있음** | 없음 |

- 1행 주(수용): 카운트다운이 켜진 상태로 마운트되면 첫 `getTimer` 결과가 오기 전까지 초기 스냅숏(`mode` 없음 = 스톱워치)의 `00:00:00`이 잠깐 보인다. 조회 결과가 오면 곧바로 카운트다운 글자로 바뀐다 — 수용(설정값으로 미리 채우지 않는다, 위 「입력은 스냅숏뿐」 규칙).

- 깜빡임 = `TimerText.module.css` `.blink`: keyframe `timerBlink`, `1s`, `infinite`, 0%~49.9% `opacity: 1` / 50%~100% `opacity: 0`(계단식 — 켜짐 0.5초·꺼짐 0.5초). `transform`을 쓰지 않아 `timerTextStyle`의 `translate·rotate`와 충돌하지 않는다. 트리거 = 클래스 부착(스냅숏 `finished`), 해제 = 클래스 제거. **JS 타이머 없음**, 10초 판정은 core(`finished` → `stopped` 이벤트).
- 깜빡임 CSS 값은 현재대로 `animation: timerBlink 1s infinite`, keyframes `0%, 49.9% { opacity: 1 }` / `50%, 100% { opacity: 0 }`(패킷 §4 원문)로 유지한다 — 설정 창 미리보기 깜빡임(A-5)도 이 값으로 맞춘다(CSS 위치는 settings 설계 소관, 값은 이 줄이 기준).
- `restPaused`는 카운트다운에 없다(core). 오버레이의 쉬는중 보고(`setResting`, §10.14 14.4)는 그대로 보내고 core가 무시한다.

**15.2 알림음 규칙(R-39).** `useAlarmOnFinish`(§5.7 ⑤) 효과 2의 판정표:

| # | 이전 `prevStatusRef` | 새 스냅숏 | `fromEvent` | 동작 |
|---|---|---|---|---|
| 1 | `null`(마운트) | `stopped` 초기값 | `false` | 없음 |
| 2 | `stopped` | `finished`(첫 `getTimer` 결과) | `false` | **없음(울리지 않음)** — 깜빡임만 |
| 3 | `running` | `finished` | `true` | `start()` — 1회 재생 시작(CR-055 — CR-052 반복 재생 폐기) |
| 4 | `null`·`stopped`·`paused` | `finished` | `true` | `start()`(이벤트 = 방금 일어난 전이) |
| 5 | `finished` | `finished` | `true` | 없음(중복 방지) |
| 6 | `finished` | `stopped`(10초 종료·멈춤·끄기) / `running`(끝남 중 시작, D-7) | 무관 | `halt()` — 소리 정지·늦게 온 조회 결과 폐기 |
| 7 | (재생 중) | (언마운트) | — | `halt()` |

- 재생 순서: `getAlarmSound()` → `url` 있으면 `stopRef.current = playSound(url, v, playDefault)`, 없거나 조회 실패면 `stopRef.current = playSound(defaultAlarmUrl(), v)`(`playDefault`도 같은 호출 — 모두 `loop` 기본 `false`). 등록 파일 실패(`new Audio`·`play()` 동기 예외·`play()` 거부·`error`) → `playDefault` 1회(회차가 같을 때만). 기본음 실패 → 무시. `v` = `gainRef.current` = 재생 시작 시점의 `alarmGain(timer)`(기본 0.44 — `alarmVolume` 없음·비유한수면 `DEFAULT_ALARM_VOLUME` 44, CR-058·CR-061). 내장 기본음 = `defaultAlarmUrl()` = 번들 mp3 자산 `src/assets/sounds/default-alarm.mp3`의 URL(CR-058 🔒 — 사용자가 지정한 mp3. 옛 TS 합성 비프음 폐기).
- 실패 알림 순서(확정): `playSound`의 `onFail`은 **항상 비동기(`queueMicrotask`)**이고 정지된 뒤에는 불리지 않는다. 그래서 ⓐ `stopRef.current = playSound(...)` 바깥 대입이 먼저 끝나고 ⓑ 그 뒤 `playDefault`가 `stopRef.current`를 기본음 정지 함수로 바꾼다 ⓒ `finished`를 떠나면 `halt()`가 기본음을 pause한다(`design/functions.md` §5.7 ④⑤).
- **1회 재생(CR-055 🔒 2026-09-27 — CR-052 「10초 동안 반복」 폐기, R-39 원문 「1회 재생(반복 없음)」 복귀).** 등록 파일·기본음·실패 대체 기본음 모두 `loop` 기본값(`false`)으로 한 번만 재생한다. 끝남 깜빡임 10초(15.1)는 그대로다. 소리가 아직 나는 중에 `finished`를 떠나면(10초 종료·멈춤·시작·끄기) 판정표 6·7행대로 `halt()`가 pause·`currentTime = 0`. 설정 창 미리 듣기도 1회(변경 없음). `playSound`의 `loop` 인자(공용 유틸)는 남아 있으나 현재 `true`로 부르는 곳이 없다.
- 재생은 **오버레이 한 곳**이다. 설정 창은 같은 `playSound`·`defaultAlarmUrl`로 미리 듣기만 한다(settings 요구 소관). 오버레이 문구·aria-live 없음.

**15.3 배치 결정(확정).**

| 결정 | 내용 | 근거 |
|---|---|---|
| `useAlarmOnFinish` 호출 위치 = `TimerText` (인계 패킷 §1의 「`index.tsx`에 `useAlarmOnFinish(settings.timer)`」 대신) | `TimerText`가 이미 가진 `useTimerSnapshot` 결과를 그대로 넘긴다 — **구독·조회는 1개 그대로**. `OverlayApp`(`index.tsx` 264줄)은 바꾸지 않는다 | ① `OverlayApp`에 두면 `onTimerChanged` 구독·`getTimer` 조회가 2개가 되어 기존 TC(`OverlayApp.pomodoro.test.tsx` 202·203·333·334·352·415·416·443·444행 「1회」 단언)가 깨진다 ② `OverlayApp`의 60Hz 재렌더와 무관(`TimerText`는 초당 1회만 다시 그려지고, 훅은 ref만 써서 렌더를 일으키지 않는다) ③ 불변식: `finished`는 카운트다운이 **켜져 있을 때만**(core 전이표 — 끄면 `finished` → `stopped`) 생기고, 켜짐이면 U-1 `isTimerTextVisible`이 참이라 `TimerText`가 마운트돼 있다. 끝남 중 끄기로 `TimerText`가 사라지면(뽀모도 그림 없음) 언마운트 `halt()`가 소리를 멈춘다 — D-6과 같은 결과 |
| 훅 파일 = `src/overlay/hooks/useAlarmOnFinish.ts`(새 폴더) | 화면 로컬 훅. `src/components/hooks`(공용)가 아니다 | 알람 재생은 오버레이만 한다(설정 창은 미리 듣기만) — 여러 화면 재발이 아니므로 공용 조건 불충족. `src/overlay/hooks/`는 ui-design-strategy §1.1 표준 폴더 밖이지만 아키텍트 패킷 §1이 지정한 위치라 따른다 |
| `useElapsedText` 반환 = `string` 유지 | 깜빡임은 `isTimerBlinking(snapshot)`으로 따로 구한다 | 설정 창 설계·스펙이 `string` 반환을 인용·mock한다(§5.7 ②) |
| `alarmSound.ts` = 공용 utils | 설정 창 미리 듣기가 같은 `playSound`·`defaultAlarmUrl`을 쓴다 | 아키텍트 패킷 §1 지정 |
| 깜빡임 CSS = 오버레이 로컬 `TimerText.module.css` | 설정 창 미리보기 깜빡임(A-5)의 CSS 위치는 settings 설계가 정한다 | 패킷 §1 지정. 화면 간 CSS import는 하지 않는다. `components/TimerText.module.css`(컴포넌트 옆 배치)는 ui-design-strategy §1.1의 `styles/` 표준 밖이지만 패킷 §1이 지정한 위치라 따른다 |
| 잔여 위험(수용) | `getSettings` 실패·매니페스트 실패로 `TimerText`가 마운트되지 않으면 `finished`여도 무음(문구 없음) | 오버레이 기존 오류 경로(표시 없음)와 같다. 알람만 따로 살리려고 `OverlayApp`에 구독을 더하지 않는다(위 1행 근거 ①) |
| 내장 기본음 = 번들 mp3 자산(CR-058) | `src/assets/sounds/default-alarm.mp3`(사용자 지정 원본, 34 061바이트)를 Vite 정적 자산 import로 번들하고 `defaultAlarmUrl()`이 그 URL 문자열을 돌려준다(시그니처 `() => string` 불변 — 호출부 `useAlarmOnFinish`·설정 창 미리 듣기 무변경). 기본 음량 `DEFAULT_ALARM_VOLUME` = `DEFAULT_TIMER_SETTINGS.alarmVolume`(44) 단일 소스(CR-061) | 사용자 결정 🔒 2026-09-28(0.4.0 기본 세트 — 「지금 내가 설정한 이미지와 음성파일을 기본으로」). 옛 행 「`BEEP_AMPLITUDE = 0.5`(합성음 진폭)」은 합성음 폐기로 대상 없음 |

**15.3a 접근성·문구.** 새 문구·aria-label 없음(§8 불변 — `labels.ts` 변경 없음). 시간 글자는 계속 `aria-hidden="true"`, `aria-live` 없음. 포커스·키보드 조작 없음(`design/a11y.md` 불변). `prefers-reduced-motion`으로 깜빡임을 끄는 분기는 두지 않는다 — 깜빡임은 확정 요구(R-38)이고 줄임 모드 요구가 없다(필요하면 추가 후보로 보고).

**15.4 성능.** 새 interval·rAF 없음. 카운트다운 `running`은 기존 250ms interval 하나(글자가 바뀔 때만 렌더). `finished` 깜빡임은 합성 레이어의 opacity 애니메이션뿐. `Audio` 객체는 끝남 1회당 최대 2개(등록 파일 + 기본음 재시도). 기본음은 번들 정적 자산 URL이라 런타임 생성물(Blob URL 등)이 없다(CR-058).

**15.5 계약·선행 조건.** §7 CR-050 행 인용(contract v0.23 확정, `src/bridge/types.ts`·`commands.ts` 반영됨 — 선행 조건 충족). `tauri.conf.json`의 `media-src`(CSP)·`--autoplay-policy=no-user-gesture-required`(두 창 `additionalBrowserArgs`)는 메인 세션 소관(D-8·D-9) — 없으면 소리가 막힌다(오류 경로와 같은 무음, 문구 없음).

**15.6 자동 재생 스파이크(패킷 §0) — 수동 확인으로 전환.** 이 설계 작업은 앱을 실행하지 않는다. 패킷 §0의 스파이크(트레이 「시작」만으로 00:00:05 카운트다운 → 0 도달 시 오버레이에서 기본음이 울리는지, 울림/`NotAllowedError` 기록)는 **`test/manual-checklist.md` 수동 항목(예정 TC-310)**으로 돌린다. 판정 기준: 어느 창도 클릭하지 않은 상태에서 소리가 난다 = PASS. 울리지 않으면 구현을 멈추고 아키텍트 세션으로 되돌린다(D-8 B 재검토). 자동 테스트(jsdom)는 `Audio`를 mock하므로 자동 재생 정책을 증명하지 못한다.

**15.7 회귀·신규 TC(예정, ui-test-designer — TC-291~TC-313).**

| 예정 TC | 파일(안) | 확인 | 요구ID |
|---|---|---|---|
| TC-291 | `test/timerClock.test.ts`(확장) | `snapshotMode`: `mode` 없음 → `'stopwatch'`, `'countdown'` → `'countdown'` | R-37 |
| TC-292 | 같은 곳 | `timerDisplayMs`: 카운트다운 running(받은 뒤 흐른 시간 차감)·0 미만 → 0·`durationMs` 없음 → 0, 스톱워치·`mode` 없음 = `elapsedNow`와 같음, `finished`(elapsed = duration) → 0 | R-37, R-38 |
| TC-293 | 같은 곳 | `formatRemaining` 예 7개(§5.7 ①: 1 500 000·1 499 001 → `00:25:00`, 1 499 000 → `00:24:59`, 1 → `00:00:01`, 0, 359 999 000 → `99:59:59`, −1·NaN·Infinity) | R-37 |
| TC-294 | 같은 곳 | `timerText` 모드 분기(스톱워치 내림 999 → `00:00:00` / 카운트다운 올림), `isTimerBlinking` 5개 status 중 `finished`만 `true` | R-37, R-38 |
| TC-295 | `test/useElapsedText.countdown.test.tsx` | 가짜 시계: 카운트다운 `running` 시작 `00:25:00` → 1 000ms 뒤 `00:24:59`, 초 경계마다 렌더 1회, `finished` → `00:00:00`·interval 없음(`vi.getTimerCount()` 0), 스톱워치 기존 결과 불변 | R-37, R-38 |
| TC-296 | `test/TimerText.blink.test.tsx` | `finished` → 글자 `<div>`에 `styles.blink`, `running`·`paused`·`stopped`·`restPaused` → `class` 속성 없음, `aria-hidden` 유지, `.pomodoro`·`<img>`에 `.blink` 없음 / CSS `?raw`: `timerBlink`·`1s`·`infinite`·`0%, 49.9%` opacity 1·`50%, 100%` opacity 0·`transform` 없음 | R-38 |
| TC-297 (CR-058 개정) | `test/alarmSound.test.ts` | `DEFAULT_ALARM_VOLUME` = 44(= `DEFAULT_TIMER_SETTINGS.alarmVolume`, CR-061). 옛 `synthBeepWav` 바이트 검증은 합성음 폐기로 대상 없음 | R-39 |
| TC-298 (CR-058 개정) | 같은 곳 | `defaultAlarmUrl`: 번들 자산 `@/assets/sounds/default-alarm.mp3` import 값과 같은 문자열, 두 번 불러도 같음, `Audio`를 만들지 않음. 옛 `URL.createObjectURL`·Blob `audio/wav` 단언은 대상 없음 | R-39 |
| TC-299 | 같은 곳 | `playSound`(`Audio` stub): 음량 자르기(1.5 → 1, −0.2 → 0, NaN → 0, 0.8 → 0.8), `play` 1회, `stop()` → `pause`·`currentTime = 0`, `play()` 거부 → `onFail` 1회, `error` 이벤트 + 거부 → 합쳐 1회, `stop()` 뒤 거부 → 0회, `play()`·`new Audio` 동기 예외 → 던지지 않음·`playSound` 반환 시점엔 `onFail` 0회·microtask 뒤 1회(항상 비동기), 동기 예외 직후 `stop()` → 0회 / `alarmGain` 예 6개(§5.7 ④ — 없음·NaN → 0.44, CR-058) | R-39 |
| TC-300 | `test/useAlarmOnFinish.test.ts`(renderHook, bridge·`Audio` mock) | 15.2 표 3행: `running` → `finished`(`fromEvent: true`) → `getAlarmSound` 1회, 등록 url로 `Audio` 1개·`volume` 0.8(픽스처 `gain` 0.8 — 기본값 아님)·`play` 1회 | R-39 |
| TC-301 | 같은 곳 | 15.2 표 1·2·5행: 첫 조회 `finished`(`fromEvent: false`) → `getAlarmSound`·`Audio` 0회, 이어서 `finished` 이벤트 재수신 → 0회 | R-39 |
| TC-302 | 같은 곳 | 15.2 표 6·7행: `finished` → `stopped`면 `pause`·`currentTime 0`, `finished` → `running`도 정지, 언마운트도 정지 | R-39 |
| TC-303 | 같은 곳 | 등록 url `play()` 거부 → 기본 url(`defaultAlarmUrl` stub)로 `Audio` 1개 더·`play` 1회, 기본음도 거부 → 세 번째 `Audio` 없음 / **등록 url `play()` 동기 예외 → 기본음 `Audio` 1개·`play` 1회(1회만) → `finished`를 떠나면(`stopped` 이벤트) 기본음 `pause` 1회·`currentTime 0`**(15.2 실패 알림 순서) | R-39 |
| TC-304 | 같은 곳 | `getAlarmSound` → `null`이면 기본 url, reject면 기본 url | R-39 |
| TC-305 | 같은 곳 | 회차 폐기: `getAlarmSound`가 풀리기 전에 `stopped` 도착 → `Audio` 0개, 재생 시작 시 음량 = 그 시점 `gain`(중간에 0.3으로 바뀌면 0.3) | R-39 |
| TC-306 | `test/pomodoro.test.tsx`(확장) | `useTimerSnapshot` `fromEvent`: 초기 `false`, 조회 결과 `false`, 이벤트 `true` / 구독 1회·조회 1회(기존 단언 유지) | R-39 |
| TC-307 | `test/OverlayApp.timerMode.test.tsx` | 통합(카운트다운 켜짐 설정, 뽀모도 그림 없음): `stopped`(D) → `00:25:00` → `running` 이벤트·시계 1s → `00:24:59` → `finished` 이벤트 → `00:00:00`·`.blink`·`Audio.play` 1회(음량 0.8 — 픽스처 `alarmVolume: 80` 명시, 기본값 아님) → `stopped`(D) 이벤트 → `.blink` 없음·`pause`·`00:25:00` / `onTimerChanged`·`getTimer` 각 1회 | R-37, R-38, R-39 |
| TC-308 | 같은 곳 | 통합: 끝남 중 끄기(`settings://changed` enabled false, 그림 없음) → `TimerText` 언마운트 → `pause` 1회 / 첫 `getTimer`가 `finished` → 깜빡임 있음·`Audio` 0회 | R-38, R-39 |
| TC-309 | 같은 곳 | `.jellyWrap` 키 누름 젤리 중에도 `.blink`는 글자에만, `.pomodoro`에 `.jelly`·`.shiver` 없음(격리 규칙 8·9) | R-38 |
| TC-286 (개정) | `test/OverlayApp.pomodoro.test.tsx` ② | 기대 리터럴 = 현행 contract v0.27 `DEFAULT_TIMER_SETTINGS`: `{ enabled: false, mode: 'stopwatch', countdownSecs: 1500, alarmVolume: 44, textPos: { x: 268, y: 402 }, rotation: 7, fontSize: 36, color: '#333333' }`(CR-058. 이력: v0.23 80·(268,403)·5 → CR-053 80·(142,458)·9 → CR-058) | R-34 |
| mock 보강 | `OverlayApp.*.test.tsx`·`pomodoro.test.tsx` 등 `bridge/commands` mock | `getAlarmSound: () => Promise.resolve(null)` 추가(기존 스펙의 mock 관례 — 미등록 = 기본음 경로. BRG-006 선례 — `finished`를 흘리지 않는 스펙도 mock 모양을 맞춘다). `Audio`를 쓰는 스펙은 `vi.stubGlobal('Audio', …)`. (CR-058) 기본음이 정적 자산 URL이라 `URL.createObjectURL` stub은 더 필요 없다 | — |
| 수동 TC-310 | `test/manual-checklist.md` | **자동 재생 스파이크(15.6)**: 트레이 「시작」만으로 00:00:05 → 0 도달 시 오버레이 기본음 울림(어느 창도 클릭 안 함), 결과(울림/`NotAllowedError`) 기록 | R-39 |
| 수동 TC-311 | 같은 곳 | 트레이로 오버레이를 숨긴 상태에서 0 도달 → 소리 울림 여부(02-design R-5, verify 실측) | R-39 |
| 수동 TC-312 | 같은 곳 | 1분 넘는 mp3 등록 → 0 도달 → 10초 깜빡임 뒤 소리도 멈춤 → 글자 `00:25:00` 복귀 / 쉬는중(5분 무입력) 동안 카운트다운 계속 줄어듦 / 스크린샷 1장(끝남 깜빡임) | R-37, R-38, R-39 |
| TC-313 | `test/OverlayApp.timerMode.test.tsx` | 음량 배선(`TimerSettings.alarmVolume` → `alarmGain` → `Audio.volume`, `design/functions.md` §5.7 ⑤ 효과 1·⑥): 설정 `alarmVolume` 30 → `finished` 이벤트 → `Audio.volume` 0.3 / 마운트 중 `settings://changed`로 50 → 다음 회차 `finished`에 `Audio.volume` 0.5(앞 회차 0.3 불변), `getTimer`·`onTimerChanged` 재조회·재구독 없음 | R-39 |

- TC-FLOW: requirements §2 S-19·S-20 → 신규 TC-FLOW 각 1개(번호는 ui-test-designer가 기존 마지막 다음으로), 기대 = TC-307·TC-308 흐름.

### 10.16 오른쪽 클릭 메뉴 (CR-062, R-40)

**결론: ui 몫은 WebView2 기본 오른쪽 클릭 메뉴 억제 하나뿐이다.** 메뉴를 띄우는 판정(창 사각형·누름/뗌·숨김·전체 화면)·팝업·항목 동작은 모두 core(tray·hook)가 한다. 오버레이는 그 메뉴를 모르고, 그리지 않으며, 전체 화면 여부도 판정하지 않는다.

비유: 식당 입구의 안내판(트레이와 같은 메뉴)은 건물 관리인(core)이 세운다. 오버레이는 그 자리에 브라우저가 자기 전단지(기본 메뉴)를 붙이지 못하게 막기만 한다.

#### 16.1 책임 나눔

| 항목 | 주체 | 근거 |
|---|---|---|
| 오른쪽 누름·뗌 좌표 감지(잠금 중 포함) | core hook(전역 훅 `RightClick` 채널) | 횡단 설계 §2.4·§2.8 |
| 「오버레이 위」 판정 = 창 사각형(투명 부분 포함), 누름·뗌 모두 안(🔒 U-1) | core tray | 횡단 설계 §2.3·§2.4 |
| 숨김이면 생략 | core(`overlay_screen_rect` → `None`) | 횡단 설계 §2.9 |
| 전체 화면이면 생략(🔒 U-3) — 전경 창이 이 앱 창이 아니고 그 클라이언트 영역이 자기 모니터 전체를 덮음 | core(`hook::foreground_snapshot` → `tray::popup::suppress_for_fullscreen`) | 횡단 설계 §2.14 |
| 메뉴 항목·순서·문구·동작(트레이와 같음), 중복 팝업 가드 | core tray(`build_menu`·`current_view` 공유, 기존 `on_menu_event`, 3단계 상태 기계 `PopupGate` Idle → Pending → Open → Idle — post 전 예약. v2의 2단계 `POPUP_OPEN`은 폐기) | 횡단 설계 §2.5·§2.6 |
| **WebView2 기본 메뉴 억제(🔒 U-5)** | **ui — `.root` `onContextMenu={preventContextMenu}`** | 횡단 설계 §2.7, `design/functions.md` §5.1 |

- ui가 **하지 않는 것**: React·HTML로 메뉴 그리기, 새 bridge 래퍼·command·event 호출, `settings.positionLock` 읽기, 전체 화면·전경 창 판정, `e.stopPropagation()`. 새 상태·문구·CSS 클래스·컴포넌트 없음(§4·§8 불변, 메뉴 문구는 core 트레이 문구 — 한국어 고정).
- 핸들러를 `.root` 한 곳에만 다는 이유: `.root`가 창 전체(100vw×100vh, §2)이고 `.canvas`가 `pointer-events: none`이라 그림 위·투명한 모서리 어디서 오른쪽 클릭해도 `contextmenu`가 `.root`에 닿는다.

#### 16.2 상태별 동작 (횡단 설계 §2.9 요약 인용)

| 오버레이 | 위치 잠금 | 전경 창 | 오른쪽 클릭 위치 | 결과 | ui 핸들러 |
|---|---|---|---|---|---|
| 표시 | 꺼짐 | 무관(보통 이 앱 창) | 누름·뗌 모두 창 안 | 트레이와 같은 메뉴 1개, 브라우저 기본 메뉴 없음. 클릭은 WebView가 받음. 클릭 파츠·펜 모드 젤리는 기존대로 | 불림 → `preventDefault` |
| 표시 | 켜짐 | 전체 화면 아님(창 모드·최대화·바탕 화면·작업표시줄) | 누름·뗌 모두 창 안 | 트레이와 같은 메뉴 1개. 클릭은 아래 창에도 전달(🔒). 아래 창 자체 메뉴와 경합 수용(U-4) | 불리지 않음(클릭 통과) |
| 표시 | 무관 | 다른 앱의 전체 화면(독점·테두리 없음·브라우저 F11·동영상) | 누름·뗌 모두 창 안 | 메뉴 없음(🔒 U-3). 클릭은 기존대로 전달 | 비잠금이면 불림(기본 메뉴도 없음) |
| 표시 | 무관 | 무관 | 한쪽만 창 안 | 메뉴 없음(🔒 U-1) | 불릴 수도 있음(비잠금일 때 WebView의 마우스 캡처에 따라 다름 — 관찰 항목, MC-36). 불려도 무조건 억제뿐이라 결과 무관 |
| 숨김 | 무관 | 무관 | 옛 자리 | 메뉴 없음 | 불리지 않음 |
| 표시 | 무관 | 무관 | 메뉴가 이미 열려 있음 | 두 번째 메뉴 없음 | 무관 |

- 메뉴가 뜨면 키보드 포커스가 메뉴로 옮겨 가고 닫힌 뒤 자동 복귀하지 않는다(R-40 수용, U-2) — ui 구현 없음.
- 메뉴가 열린 동안에도 `input://*` 이벤트는 계속 오므로 오버레이 반응(P-2·P-4)은 그대로다(core 스레드 모델, 관찰 MC-39).

#### 16.3 불변 확인(회귀)

- `onWheel`(P-5)·`data-tauri-drag-region`(P-7)·상태기계·레이어 렌더·타이머 흐름은 바뀌지 않는다.
- `contextmenu`는 오른쪽 **뗌 뒤**에 오는 DOM 이벤트다. 좌클릭 끌기에는 생기지 않고, 전역 훅 `input://mouse-button`(창 이벤트와 무관)에도 영향이 없다 → 오른쪽 클릭 파츠 교체(R-09)·펜 모드 클릭(R-26)은 기존 TC 그대로.
- 잔여 위험 — **수용(관리자 판단 2026-09-29, 사용자 보고 예정)**: 앱 시작 직후 `src/main.tsx`가 `./overlay`를 지연 로딩(Suspense)하는 동안, 즉 `OverlayApp`이 마운트되기 전의 짧은 구간에는 `.root`가 없어 WebView2 기본 메뉴가 억제되지 않는다. core 메뉴 판정은 이 구간에도 동작한다(`design/functions.md` §5.1 `preventContextMenu`).

#### 16.4 검증

| 구분 | 내용 | 요구 |
|---|---|---|
| vitest TC-315 | `OverlayApp` 렌더 후 `.root`에 `fireEvent.contextMenu` → 반환값 `false`(= `defaultPrevented`). 같은 스펙에서 bridge mock 호출 수 증가 없음(`setSettings`·기타 command 0회 추가) | R-40 |
| vitest(회귀) | 오른쪽 `mouseButton` 입력 처리(클릭 파츠 `mouse_right`, 펜 모드 클릭)·Ctrl+휠 기존 TC 불변 | R-09, R-26, R-04 |
| 수동 TC-316~TC-330 · TC-FLOW-21 | 횡단 설계 §7 **MC-31~MC-45**를 `test/manual-checklist.md`로 옮김(TC-316 = MC-31 … TC-330 = MC-45, 흐름 TC-FLOW-21 = S-21) — 핵심: MC-31 비잠금 메뉴 1개·브라우저 메뉴 없음, MC-34 잠금 중 메뉴·아래 창 전달, MC-35 숨김, MC-36 누름/뗌 경계, MC-37 중복 없음, MC-40·MC-41·MC-44 전체 화면 생략, MC-42·MC-43 창 모드·바탕 화면 표시, MC-39 포커스 기록 | R-40, R-28 |

## 11. 전략 편차 (요구 편차 아님 — 수용 확정)

**결정: D-1~D-4 모두 편차 수용(사용자 승인 🔒 2026-09-23).** 이 설계는 아래 현행 방식대로 구현·검증한다. D-1~D-3(ui-design-strategy §6.3 성능 규칙)은 **후작업(ui-postprocessor, 사용자 요청 시)으로 정리 예정**이며, 그 전까지 설계 결함으로 보지 않는다. 근거: 현재 기능(레이어 교체·커서 추종·바운스)이 동작하고, 성능 개선은 기능 요구(R-xx)가 아니라 전략 규칙이므로 기능 CR(CR-008·009·011·012) 적용을 먼저 하고 구조 정리는 한 번에 묶는다. D-4는 후작업 대상도 아니며 영구 수용이다.

| # | 전략 조항 | 현행(수용) | 영향 | 처리 |
|---|---|---|---|---|
| D-1 | ui-design-strategy §6.3 미리 로드 + 표시/숨김 | `Layer`는 슬롯이 바뀌면 같은 `<img>`의 `src`를 교체, 첫 렌더 전 preload 없음 | 첫 교체 시 깜빡임 가능 | 수용 · 후작업 정리 예정 |
| D-2 | §6.3 rAF 루프 1개, 이벤트마다 React 상태 갱신 금지 | 마우스 이동마다 `dispatch`(≤60Hz 스로틀은 core) | 리렌더 빈도 = 이벤트 빈도 | 수용 · 후작업 정리 예정 |
| D-3 | §6.3 `top/left` 대신 `transform` | **해소(CR-015)** — 손바닥 모드 삭제로 커서 따라 `left/top`을 바꾸는 요소가 없어졌다. 손 그림의 `left/top = partPos`는 정적 배치(설정 변경 때만 바뀜, 애니메이션 아님)이고 움직임은 `rotate`·젤리 `scale`(transform, CR-022)만이라 §6.3 위반이 아니다 | 없음 | 종료 |
| D-4 | §6.4 `startDragging()` bridge 호출 | `data-tauri-drag-region` 속성 사용(계약 command 없음) | 없음(동작함) | **수용 확정(영구)** — Tauri 내장 속성이라 화면 코드가 `invoke`를 쓰지 않아 bridge 경계 규칙(§5)도 지킨다. 새 command 불필요 |

## 12. 공용화 후보

| 후보 | 이유 | 비고 |
|---|---|---|
| `findEntry` → `src/components/utils` | settings `findUrl`과 같은 역할 | 같음 |

## 13. RTM (요구 추적 매트릭스)

상태 열은 표준값(✅/부분/❌/—)만 쓰고 사연은 「비고」 열에 둔다(CR-015 동기화 때 열 분리). 「예정 TC」의 기존 번호는 `test/scenarios.md` 추적표 기준이며, CR-015로 기대값이 바뀌는 TC(손바닥 모드·팔 곡선·`isMouseLayerMode` 관련)의 개정·폐기는 ui-test-designer 몫이다.

| 요구ID | 설계 섹션 | bridge 계약 | 예정 TC | 상태 | 비고 |
|---|---|---|---|---|---|
| R-01 | §2, §8(문구 없음·「배경 없음」 해석), §9(`design/a11y.md`), §10.3(transform만) | — (창 속성은 core `tauri.conf.json`) | TC-048, TC-068, TC-078 / 수동 TC-083, TC-097 | ✅ | |
| R-02 | — | — | — | — | 폐기(CR-015로 대체 → R-19) |
| R-03 | §2(`.root` = 창 전체 100vw×100vh·`overflow: hidden`), §5.1 표시 배율(`design/functions.md`), P-5, §10.5(표시 크기 식 = core window.md §2.2) | `get_settings`, `settings://changed`(창 리사이즈는 core `resize_overlay` — 새 계약 없음, contract v0.6 §5.2 부수 효과, window.md §9.1) | TC-047, TC-069, TC-070, TC-072, TC-078, TC-079, TC-101 / 수동 TC-087, TC-089 | ✅ | CR-012 적용(ui `.root` + core `window/sizing.rs` 리사이즈 — doc-sync 2026-09-30 확인) |
| R-04 | §5.1 `onWheel`(`design/functions.md`), P-5 | `set_settings`(contract v0.6 §5.3 위치 불간섭) | TC-071~TC-075, TC-077 / 수동 TC-086, TC-088 | ✅ | CR-013: `set_settings`는 창 위치 미적용 — core·bridge 조치, ui 변경 없음. CR-029: 위치 잠금 중에는 동작하지 않음(R-28, §10.9.1 L-3) — ui 변경 없음 |
| R-05 | §5.2, P-3, §10.2 | `input://*` | TC-001~TC-004, TC-012, TC-057, TC-058 / 수동 TC-092 | ✅ | |
| R-06 | — | — | — | — | 폐기(CR-019, 대체 없음 — 쾅 메커니즘 삭제 🔒 2026-09-24). 옛 TC(TC-007~TC-011, TC-029, TC-055, TC-058 / 수동 TC-091)의 폐기·개정은 ui-test-designer 몫 |
| R-07 | §5.2, §5.3, §5.1 `jellyClass`(`design/functions.md`), §10.3 젤리 바운스 | `input://keyboard` | TC-005, TC-006, TC-011, TC-027, TC-031, TC-054, TC-056, TC-080, TC-100 / 수동 TC-090 | ✅ | CR-023: 자동 반복 누름(`repeat: true`)은 `kbFrame`을 넘기지 않음(§10.6 `kbFrame` 순환) — `repeat` 없는 기존 TC 기대값은 그대로. CR-022: 바운스 = `.jellyWrap` 젤리(키보드 `Layer` 자체의 `.bounce` 삭제) — TC-031·TC-054·TC-080·TC-100 기대값 개정 필요(ui-test-designer). CR-021: 키보드 그림 선택을 `pickKeyboardEntry`로 옮김(특수 키 없으면 기존 식과 같은 결과). 「어떤 키인지 모름」의 예외 = R-22 분류값 7종(requirements §1 용어 주, `undo` 포함 v1.9) |
| R-08 | — | — | — | — | 폐기(CR-015로 대체 → R-18) |
| R-09 | §5.4 이미지 선택, P-4 | `input://mouse-button` | TC-013, TC-039, TC-043, TC-062, TC-063, TC-206, TC-207, TC-214, TC-218, TC-219 / 수동 TC-094, TC-222 | ✅ | 클릭 이미지도 같은 `partPos`·같은 크기(R-18). CR-027: 클릭 파츠 교체(`mouse.button`)는 펜 모드에서도 그대로 — 펜 모드 클릭의 손 그림·젤리는 R-26(§10.8) |
| R-10 | — | — | — | — | 폐기(CR-008로 대체 → R-14) |
| R-11 | §4 `armAtRest`, §5.1 마우스 이동 핸들러·쉬는중 진입 효과, §5.4 `MouseArm` 렌더 1단계, P-1·P-3·P-4, §10.4 쉬는 위치 | `input://mouse-move` | TC-023, TC-040, TC-042, TC-059, TC-061 / 수동 TC-092 | ✅ | 쉬는 위치 = `partPos`에 회전 0°. 손바닥 모드 `restPosition` 경로 삭제(CR-015) |
| R-12 | P-7, §9 | — (`data-tauri-drag-region`) | TC-065, TC-077~TC-079 / 수동 TC-084 | ✅ | CR-029: 위치 잠금 중에는 끌기 불가(R-28, §10.9.1 L-2) — ui 변경 없음 |
| R-13 | P-7, §7 위치 저장 행 | 새 계약 없음(core window 담당), 기존 `settings://changed` | TC-075, TC-076 / 수동 TC-085, TC-086 | ✅ | ui 변경 없음. core 구현 대기(CR-010), CR-013 core·bridge 미적용 |
| R-14 | — | — | — | — | 폐기(CR-017로 대체 → R-20, R-21). 기준점 자동 규칙은 R-21이 이어받음 |
| R-15 | §4 `armAtRest`, §5.1 마우스 이동 핸들러·쉬는중 진입 효과, §5.4 `MouseArm` 렌더 1단계, P-1·P-3·P-4, §10.4 | `input://mouse-move` | TC-040, TC-059~TC-061 / 수동 TC-092, TC-093 | ✅ | CR-009 적용. CR-017: 쉬는 위치 = `REST_TRANSFORM`(회전 0°·배율 1) — 소스 적용됨 |
| R-16 | §2 `.jellyWrap`, §3 렌더 조건 아래 문단·DOM 구조(`design/components.md`), §5.4 `.armWrap` 컨테이너(`design/functions.md`), P-2, §10.3 젤리 바운스·마우스 팔과의 합성 | `input://keyboard` | TC-044~TC-046, TC-054, TC-080, TC-081, TC-100, TC-105 / 수동 TC-090 (`test/scenarios.md` 추적표 R-16 행 기준. TC-055는 CR-019로 폐기) | ✅ | 소스 적용됨(CR-011·CR-022 — `MouseArm` Props에 `bounce` 없음, 젤리는 `.jellyWrap`). **scenarios 쪽 정리 필요**: TC-044~TC-046·TC-054·TC-105 본문이 아직 옛 `bounce` prop·`armWrap bounce` 클래스를 기대값으로 적고 있음(CR-022 이후 대상 없음 — 개정·폐기는 ui-test-designer 몫). CR-022: 팔은 `.jellyWrap` 안에서 몸과 한 덩어리로 출렁임(같은 타이밍·같은 모양 = 같은 요소). 원문 「손바닥 모드 z=4」는 모드 삭제로 대상 없음(requirements §1 용어 주) |
| R-17 | §2 ASCII `[bg]`·DOM 순서, §3 `BackgroundLayer`·렌더 조건·배경 DOM 구조 1~4(`design/components.md`), §5.3 `BackgroundLayer` 렌더(`design/functions.md`), §8 R-01 해석, §10.1 bg 행 | `get_asset_manifest`, `assets://changed`(새 계약 없음 — contract v0.6 §3.1 `AssetSlot` `"background"`) | TC-033~TC-035, TC-064, TC-066, TC-067, TC-082 / 수동 TC-096 | ✅ | CR-014 적용. CR-022: 배경은 `.jellyWrap` 밖(§3 배경 DOM 구조 1~3) — TC-064·TC-066·TC-067의 「`.armWrap` 조상 없음」에 「`.jellyWrap` 조상 없음」 추가 필요(ui-test-designer) |
| R-18 | 헤더 모드 범위·미확정 계약 행, §2 ASCII `[z0]`, §3 `MouseArm` props·렌더 조건(`design/components.md`), §5.4 `MouseArm` 렌더(한 모드)·바운스 래퍼·삭제 목록(`design/functions.md`), P-6, §7 타입·계약 의미 행, §10.1 z0 행, §10.3, §10.4, §11 D-3 | `get_settings`·`settings://changed`(`mouse.partPos`), `get_asset_manifest`(항목 `width`·`height`), `get_hand_anchor`·`assets://hand-anchor-changed` — `partPos` 추가·팔 필드 삭제·기준점 의미 모두 contract v0.8 확정 | 미작성(ui-test-designer 인계) | ✅ | 설계 완료. 소스 적용됨(CR-015 — `MouseArm` 한 모드, doc-sync 2026-09-30) |
| R-19 | §2 ASCII `[z1] optional`·아래 문단, §3 렌더 조건(`design/components.md`), §5.3 `LayerStack` 렌더(`design/functions.md`), §10.1 z1·z3 행 | `get_asset_manifest`, `assets://changed`(새 계약 없음 — `body`는 이미 선택적 항목으로 처리) | 미작성(ui-test-designer 인계) | ✅ | 현행 `LayerStack`은 `body` 없으면 `Layer`가 `null`이라 동작 변경 없음 — 문서 명시만(CR-015). 필수 판정(`kb_up` 필수·`body` 선택)은 core·settings R-02 계열 소관. CR-022: 몸통 「고정」 = 교체·이동 없음, 젤리는 받음(requirements §1 용어 주). CR-025: 펜 모드에서는 키보드 손이 움직이지 않음 — 「동시에 각자 움직인다」의 예외(requirements §1 용어 주, §10.7). (CR-042 정정) 펜 모드 키보드 레이어는 `kb_up` 고정이 아니라 `pickPenKeyboardEntry`(특수 키 누름 중 `key_*`, 아니면 `kb_up`) — §10.12. CR-029: 일반 상태 `idle`·`rest`는 필수가 아니다(R-27 — 없으면 `kb_up`, §10.9.2) |
| R-23 | 헤더, §2 ASCII `.jellyWrap`·아래 문단, §3 `OverlayApp` 행·렌더 조건·DOM 구조 1~5(`design/components.md`), §5.1 `jellyClass`·§5.3 `LayerStack` 렌더(바운스 없음)·§5.4 `.armWrap` 컨테이너(`design/functions.md`), P-2, §10.1 표 아래 문단, §10.3 젤리 바운스(keyframe 값·CSS 규칙·합성·잘림 수용), §11 D-3 | `input://keyboard`(새 계약 없음) | 미작성(ui-test-designer 인계) — 예정: `jellyClass` 3값, `.jellyWrap` 위치·자식 구성·같은 노드 유지·클래스 교대, 개별 레이어·`.armWrap`에 애니메이션 클래스 없음, CSS `?raw` keyframe 6구간·350ms·`ease-in-out`·`transform-origin: 50% 100%`·`.bounce` 부재, 수동 젤리 체감·배경 정지. CR-027 작성분: TC-205, TC-208, TC-209, TC-214~TC-217, TC-219 | ✅ | 설계 완료. 소스 적용됨(CR-022). 트리거는 `bouncePhase`(CR-021) 그대로 |
| R-24 | 헤더 미확정 계약 행, §2 ASCII `.jellyWrap (jelly\|shiver)`·아래 문단, §3 `OverlayApp`·렌더 조건·DOM 구조 5·6(`design/components.md`), §4 `machine`(`repeating`·`lastRepeatAt`·`shiverSeq`)·`REPEAT_TIMEOUT_MS`, §5.1 키보드 핸들러(`repeat`)·`jellyClass(motion: WrapMotion)`·§5.2 `reduce` 자동 반복·`tick` 끊김 방어·`isRepeating`·`wrapMotion`·`WrapMotion`·상수·기록 금지·§5.4 `.armWrap` 5(`design/functions.md`), P-2, P-3, §7 `input://keyboard` 행, §10.1 표 아래 문단, §10.3 부르르 행·CSS·부르르 규칙 1~5, §10.6 9행·`kbFrame` 순환 | `input://keyboard`(`KeyboardInputEvent.repeat` — contract v0.12 확정) | 미작성(ui-test-designer 인계) — 예정: `reduce` 반복 누름(`repeating` true·`bounceSeq`/`kbFrame`/`specialHeld` 불변·`lastRepeatAt`·`shiverSeq`), 반복 아닌 누름·뗌 → false, `tick` 499/500ms 경계·같은 참조, `wrapMotion` 5예시, `isRepeating`, `jellyClass('shiver')`·세 클래스 배타, CSS `?raw` `shiver` 5구간·80ms·`infinite`, 핸들러 `repeat` 전달(없음 = false), 수동 부르르 체감·배경 정지·팔 변형 유지. CR-027 작성분: TC-210, TC-217 | ✅ | 설계 완료. 소스 적용됨(CR-023 — `src/bridge/types.ts` `repeat` 반영, `index.tsx` 키보드 핸들러 전달). Shift·Ctrl·Alt·Win 단독 꾹 누름은 hook이 반복 이벤트를 내지 않아 떨지 않음(🔒 2026-09-24) |
| R-25 | (CR-042: 손 그림 선택(`pen_down_{kbFrame}`·`pen_key_*`)·펜 모드 키보드 레이어 `kb_up` 고정은 §10.12·R-31이 대체 — `pickPenEntry`·`LayerStack`·`config`는 `design/functions.md` §5.5 CR-042 블록) 헤더 미확정 계약 행, §2 ASCII `[pen]`·아래 문단, §3 `PenHand`·`OverlayApp`·`LayerStack`·렌더 조건·DOM 구조(`design/components.md`), §4 `config.kbFrames`, §5.3 `findByKey`·`isPenMode`·`penDownFrameCount`·`LayerStack` 렌더(kb_up 고정)·§5.4 `armTransformFor` 추출·§5.5 `armTransformFor`·`defaultPenPos`·`resolvePenPos`·`penTransform`·`penTransformCss`·`pickPenEntry`·`PenHand` 렌더·`PenTransform`·`PEN_REST`(`design/functions.md`), P-2·P-4·P-6, §7 펜 슬롯·`penPos` 행, §8, §10.1 pen 행, §10.7 | `get_asset_manifest`·`assets://changed`(펜 슬롯 — contract v0.13 확정), `get_settings`·`settings://changed`(`mouse.penPos` — contract v0.13 확정), `input://keyboard`·`input://mouse-move`(기존) | 미작성(ui-test-designer 인계) — 예정: `penTransform` 예 ⓐ~ⓓ·비유한·각도 접기, `penTransformCss`, `defaultPenPos`·`resolvePenPos`, `armTransformFor` = 옛 MouseArm 결과 동일, `isPenMode`·`penDownFrameCount`·`findByKey`, `pickPenEntry` 순서 예, 펜 모드 키보드 `Layer` = `kb_up`(누름·특수 키 중에도), `PenHand` 위치·origin·transform·DOM 위치(`.jellyWrap` 마지막 자식)·애니메이션 클래스 없음·클릭 무반응, `kbFrames` 펜 수 순환, 수동 체감(팔 끝 추종·기울기·크기 불변·글씨 쓰기). CR-027 작성분: TC-212~TC-214, TC-216, TC-220 | ✅ | 설계 완료. 소스 적용(CR-025 — CR 대장 기준). CR-027: 「마우스 클릭 아님」은 R-26으로 확장 — 펜 모드 클릭 누름도 손 그림 교체(`pickPenEntry` ② `isPressing`, §10.7·§10.8) |
| R-20 | 헤더 미확정 계약 행, §4 `monitors`, §5.1 모니터 목록 로드(`design/functions.md`), §5.4 `pickMonitor`·`cursorUv`·`bilerpQuad`·`Quad`·`MouseArm` 렌더 3~4단계(`design/functions.md`), §3 `MouseArm` prop `monitors`·렌더 조건(`design/components.md`), P-1·P-4·P-6, §7 `get_monitors`·`area` 타입 행, §10.1 z0 행, §10.4 모니터·비율·목표점 | `get_monitors`(contract v0.9 확정), `get_settings`·`settings://changed`(`mouse.area` — contract v0.9 확정), `input://mouse-move` | 미작성(ui-test-designer 인계) | ✅ | 설계 완료. 소스 적용됨(CR-017 — `getMonitors` 시작 1회 + `fetchWithRetry`). 모니터 구성 변경 알림 event 없음(시작 1회 조회) |
| R-21 | §3 `MouseArm` `anchor`(`design/components.md`), §4 `anchor`·`STRETCH_MIN/MAX`, §5.1 기준점 효과, §5.4 `resolvePivot`(폴백 영역 중심)·`armTransform`·`armTransformCss`·상수 표·`MouseArm` 렌더 1·2·5·6단계(`design/functions.md`), P-1·P-6, §7 계약 의미 행, §10.3, §10.4 팔 변형·변형 원점·쉬는 위치 | `get_hand_anchor`, `assets://hand-anchor-changed`(contract §3.6·§4·§5), 기본 `hand = null`(§3.3), `mouse.area`(contract v0.9 확정) | 기존 R-14 TC(TC-015~TC-019, TC-024, TC-025, TC-037~TC-039, TC-049~TC-053 / 수동 TC-094, TC-095) 중 기준점 폴백·목표점·회전각 기대값 개정 필요 — ui-test-designer 인계 | ✅ | 설계 완료. 소스 적용됨(CR-017). 기준점 규칙(CR-007·008)은 R-14에서 이어받아 변경 없음, 셋째 폴백만 패드 중심 → 영역 중심 |
| R-22 | 헤더 미확정 계약 행, §2 ASCII `[z3] key_*`, §3 `LayerStack`·`Layer`·`OverlayApp`(`design/components.md`), §4 `machine.specialHeld`, §5.1 키보드 핸들러·§5.2 `reduce` 특수 키 추적·`bounceSeq`·`bouncePhase`·`BouncePhase`·`currentSpecial`·`isSpecialKey`·`SpecialKey`·`SPECIAL_KEYS`·기록 금지·§5.3 `SPECIAL_KEY_SLOT`·`pickKeyboardEntry`·`LayerStack` 렌더·§5.1 `jellyClass`(`.jelly`/`.jellyAlt` 교대, CR-022)·§5.4 `.armWrap` 컨테이너 5·6(`design/functions.md`), P-2, §7 `input://keyboard`·`AssetSlot` `key_*` 행, §10.1 z3 행, §10.3 `jellyAlt`·특수 키 바운스(CR-022로 `bounceAlt` → `jellyAlt`, 대상 = `.jellyWrap`), §10.6 | `input://keyboard`(`KeyboardInputEvent.special` 7종 — contract v0.11 확정), `get_asset_manifest`·`assets://changed`(`AssetSlot` `key_*` 7종 — contract v0.11 확정) | TC-127~TC-151, TC-FLOW-07 | ✅ | CR-023: `repeat: true` 반복 누름은 `specialHeld`를 바꾸지 않음(§10.6 9행 개정 — `repeat` 없는 이벤트는 옛 규칙 유지라 기존 TC 그대로). 설계 완료. 소스 적용됨(CR-021). 분류(ㅋ·z·Z = Z 키, ?·! = Shift 조합)·훅 밖 비유출·로그 금지는 core·bridge 몫. 슬롯 등록 UI는 settings R-14 보류. (CR-042 정정 — 옛 CR-025 서술 「펜 모드는 `pen_key_*`(손 그림)로 반영, 키보드 `kb_up` 고정」 대체) 펜 모드에서도 특수 키 그림은 키보드 레이어 `key_*`로 반영(`pickPenKeyboardEntry`, §10.12), 손은 `pen_down_0`, `pen_key_*`는 읽지 않음 — 바운스 트리거·기록 금지 그대로 |
| R-26 | (CR-042: 클릭 누름 손 그림 = `pen_down_0` 고정(순환 없음), 특수 키를 누른 채 클릭 = 키보드 `key_*` 유지 — §10.12 동작 표 9~12행이 §10.8 표 손 그림 열을 대체) 헤더, §4 `machine`(`clickHeld`)·`config`(`clickPress`), P-4, §7 `input://mouse-button` 행, §10.1 pen 행, §10.3 젤리 트리거, §10.7 손 그림 선택(개정), §10.8(적용 조건·계약 확인·상태기계 요지·규칙표 1~14·유지되는 것·젤리 길이·모드 전환·입력 비보관), §3 `OverlayApp`·`PenHand`(`design/components.md`), §5.2 `reduce` 바운스 ⓐ(`isPressing`)·`mouseButton` 펜 모드 행(`onMouseButton` ①~④)·`isPressing`·`isRepeating`(불변 명시)·`wrapMotion` ②·`bouncePhase`·`ClickButton`·`clickHeld`·`clickPress`·기록 금지, §5.5 `pickPenEntry` ②·CR-027 예·`PenHand` Props(`design/functions.md`) | `input://mouse-button`(기존 `MouseButtonEvent` 재사용 — **새 계약 없음**) | TC-001(개정), TC-198(개정), TC-204~TC-221 / 수동 TC-222, TC-203(개정) / TC-FLOW-10 | ✅ | 설계 완료. 소스 적용됨(CR-027). 선행 조건 없음(계약 변경 없음). TC-001(초기 상태 `toEqual`)은 `clickHeld: []` 추가로 개정 완료(scenarios v1.2) |
| R-27 | §10.9.2(그림 선택 표·근거 소스·회귀 TC ①~④), §10.1 z2·z3 행, §5.3 `LayerStack` 렌더(`design/functions.md`) | `get_asset_manifest`, `assets://changed`(새 계약 없음) | TC-223~TC-226, TC-228 | ✅ | 설계 완료. **소스 변경 없음**(현행 `LayerStack`이 이미 충족, CR-029). 필수 판정·안내는 core·settings 소관. (CR-043) 필수 목록은 R-32가 대체(`kb_up`·`mouse_base`), `kb_down` 없음 폴백은 §10.13 |
| R-28 | §10.9.1(L-1~L-8·방어 코드 미채택 근거 1~4·잔여 위험 — L-8 잠금 중 오른쪽 클릭, CR-062), §10.16(16.1·16.2 잠금 행), P-5·P-7(잠금 중 비동작), §7 `positionLock` 행, §9(`design/a11y.md` 마우스 조작) | `Settings.positionLock`(contract v0.14 §3.3·§5.3 — 확정, 오버레이는 읽지 않음, 적용은 core window) | TC-227, TC-228 | ✅ | 설계 완료. **소스 변경 없음**(CR-029). 동작 증거는 core 적용 후 수동 확인·스크린샷(패킷 U-12). (CR-062) 용어 주 — 「클릭할 수 없어」 = 좌클릭·끌기·Ctrl+휠, 잠금 중 오른쪽 클릭은 아래 창 전달 + core 메뉴(전체 화면이면 생략, §10.9.1 L-8·§10.16). ui 변경은 R-40 몫뿐, R-28 판정 불변. 수동 MC-34·MC-39 |
| R-29 | §10.10(판정·`config`·`LayerStack`·`PenHand`·꺼짐 동작 표·전환·계약), `design/functions.md` §5.3 `isPenMode`·`LayerStack` 렌더 CR-033 개정, §5.5 `PenHand` 렌더 CR-033 개정, `design/components.md` §3 `LayerStack`·`PenHand` 행 | `MouseSettings.penMode`(contract v0.15 §3.3, 확정), `settings://changed` | 개정 필요: TC-187(시그니처 `isPenMode(manifest, mouse)`), TC-200, TC-214, TC-219, TC-225, TC-188·TC-197·TC-202(`config.kbFrames`), `OverlayApp.pen`·`OverlayApp.penClick`·`penLayers` 스펙 픽스처에 `mouse.penMode: true` / 신규 예정: `isPenMode` 4예(pen_up+true / pen_up+false / pen_up+mouse null / true인데 pen_up 없음), 꺼짐이면 키 누름 → `kb_down`·특수 키 그림이고 손은 `pen_up` 유지, 꺼짐 클릭 → 손 `pen_up`·젤리 없음·클릭 파츠 교체, 꺼짐에도 손이 팔 끝 추종(transform 같음), `settings://changed`로 켜짐↔꺼짐 즉시 전환 — ui-test-designer 인계 | ✅ | 설계 완료. 소스 적용됨(CR-033 — `index.tsx` `isPenMode(manifest, settings.mouse)` 1회 계산) |
| R-32 | §10.13(판정·그림 선택 규칙 6행·회귀 TC ①~④), §10.6·`design/functions.md` §5.3 `pickKeyboardEntry`(§10.13이 5·6행 덧붙임) | `get_asset_manifest`, `assets://changed`(새 계약 없음 — contract v0.19 `REQUIRED_SLOTS`는 읽지 않음) | 신규 예정(ui-test-designer): §10.13 ①~④ | ✅ | 설계 완료, 소스 적용됨(`LayerStack.tsx` `pickKeyboardEntry` 끝 `?? findEntry(manifest, 'kb_up')`, CR-043). 설명 문구·필수 배지는 settings 몫(settings R-40) |
| R-31 | §10.12(대체 문장 목록·적용 조건·손 그림·키보드 레이어·`LayerStack` 렌더·`config`·바운스·남은 옛 파일·동작 표 14행·회귀 TC ①~⑤) / `design/functions.md` §5.5 CR-042 개정 블록(`pickPenEntry`·`pickPenKeyboardEntry`·`LayerStack` 렌더·`OverlayApp` `config`·`penDownFrameCount` 삭제) | 변경 없음 — `getAssetManifest`·`onAssetsChanged`(`AssetSlot` 기존 펜 슬롯 중 `pen_up`·`pen_down_0`만 읽음), `input://keyboard`(`special`)·`input://mouse-button`(기존) | 개정(ui-test-designer): TC-188(`penDownFrameCount` → 폐기, `config.kbFrames` 펜 모드 = 1로 대체), `pickPenEntry` 단위 TC(`pen_down_1`·`pen_key_space` 기대 → `pen_down_0`), TC-196~TC-202(펜 모드 키 입력 — 특수 키 누름 중 키보드 `key_space`), TC-198·TC-204~TC-221 중 손 그림 `pen_down_1`·`pen_key_space` 단언(→ `pen_down_0`, 특수 키 누름 중 키보드 `key_*`), TC-235(`kbFrames` 재계산), TC-006·TC-056·TC-111·TC-232의 `kbFrames` 설계 참조 문구 / 신규: §10.12 회귀 TC ①~⑤ | ✅ | 설계 완료. 소스 적용됨(CR-042 — `pickPenEntry`·`pickPenKeyboardEntry`, `penDownFrameCount` 없음). 새 계약·문구 없음 |
| R-30 | §10.11(자리·그림·좌표·모션·없을 때·갱신·성능·회귀 TC ①~⑦), §2 ASCII `[hair]`·아래 문단, §1, §7 `hair` 행, §8, §10.1 hair 행·표 아래 문단, `design/components.md` §3 `HairLayer`·`OverlayApp` 행·렌더 조건·DOM 구조·규칙 7, `design/functions.md` §5.3 `HairLayer` 렌더 | `get_asset_manifest`·`assets://changed`(`AssetSlot` `'hair'` — contract v0.17, 새 command·event 없음) | 미작성(ui-test-designer 인계) — 예정: §10.11 회귀 TC ①~⑦ + 수동 1건(팔이 머리카락 앞·함께 출렁임·배경 정지). 영향 기존 TC: `.jellyWrap` 자식 구성·첫 자식을 `.armWrap`으로 단언하는 TC(R-23 「`.jellyWrap` 위치·자식 구성」, R-25 `PenHand` DOM 위치)는 hair 미등록 픽스처면 그대로, 등록 픽스처면 개정 | ✅ | 설계 완료. 소스 적용됨(CR-037, 자리는 CR-051 `.hairWrap`) |
| R-33 | §1, §2 ASCII `[pomo]`·`[pomo]` 문단, §7 `pomo_*` 행, §8, §10.1 pomo 행, §10.14 14.1(DOM·`.pomodoro`·격리)·14.2(표시 표)·14.3 `PomodoroLayer`·`OverlayApp` 변경·14.4 `PomodoroLayer` 렌더·14.5 | `get_asset_manifest`·`assets://changed`(`AssetSlot` `pomo_char`·`pomo_bubble` — contract v0.21 확정) | 신규 예정(ui-test-designer): §10.14 14.8 ④⑤⑦ | ✅ | 설계 완료. 소스 적용됨(CR-045 — `PomodoroLayer`) |
| R-34 | §2 `[pomo]` 문단, §4 `timer`·`{snapshot, receivedAt}`·`text`, P-8 ①②③⑤, §7 `get_timer`·`timer://changed`·`Settings.timer` 행, §8 `TimerText` 행, §10.1 pomo 행, §10.14 14.2(U-1)·14.3 `TimerText`·공용 3파일·14.4 `nowMs`·`elapsedNow`·`formatElapsed`·`timerTextStyle`·`useTimerSnapshot`·`useElapsedText`·`isTimerTextVisible`·14.5·14.7 | `get_timer`, `timer://changed`, `Settings.timer`(contract v0.21 확정) | 신규 예정: §10.14 14.8 ①~④⑦. (CR-050) TC-286 ② 기대 리터럴 개정(`DEFAULT_TIMER_SETTINGS` v0.23 새 필드 3개, §10.15 15.7) | ✅ | 설계 완료. 소스 적용됨(CR-045). 조정 UI(끌기·슬라이더·색)는 settings 요구. (CR-050) U-1 `isTimerTextVisible` 불변 — `enabled` 의미만 「스톱워치 또는 타이머 켜짐」(requirements 용어 주). (CR-058) 글자 기본값 (268,402)·7°는 bridge `DEFAULT_TIMER_SETTINGS`(contract v0.27)에서 오고 오버레이 소스에 리터럴 없음 — TC-286 ② 기대값만 현행 |
| R-35 | §4 끝 문단(상태 소유 core), P-8 ③④, §7 `set_resting`·`timer://changed` 행, §10.14 14.4 쉬는중 보고 효과·`elapsedNow`(restPaused 멈춤)·14.5 잔여 위험 | `set_resting`, `timer://changed`(contract v0.21 확정) | 신규 예정: §10.14 14.8 ⑤⑦ | ✅ | 설계 완료. 소스 적용됨(CR-045 — `OverlayApp` 쉬는중 보고 효과). 사용자/자동 일시정지 구분·「쉬는중 전 무입력 시간 빼지 않음」은 core |
| R-36 | P-8 ①, §7 `get_timer` 행, §10.14 14.4 `useTimerSnapshot`(구독 먼저 → 조회, 초기값 `stopped`·0)·`formatElapsed` | `get_timer`(contract v0.21 확정) | 신규 예정: §10.14 14.8 ②⑦ | ✅ | 설계 완료. 소스 적용됨(CR-045 — `useTimerSnapshot`). 경과 휘발·자동 시작 없음은 core `Timer::new` |
| R-37 | §4 `text`(CR-050 개정), P-9 ①, §7 `TimerSnapshot` v0.23·`set_resting` 의미 확장 행, §10.15 15.1(표 1~7)·15.3·15.4, `design/functions.md` §5.7 ①(`snapshotMode`·`timerDisplayMs`·`formatRemaining`·`timerText`)·②(`useElapsedText` 계산식), `design/components.md` §3.y | `get_timer`·`timer://changed`(`TimerSnapshot.mode`·`durationMs` — contract v0.23 §3.9 확정), `set_resting`(카운트다운 no-op) | TC-291~TC-295, TC-307 / 수동 TC-312 / TC-FLOW(S-19, 신규) | ✅ | TM-05·TM-03(스톱워치 표기 불변)·TM-12. 설계 완료, 소스 적용(CR-050 구현 동기화). 시간 입력·버튼은 settings 요구 |
| R-38 | §4 깜빡임 여부, P-9 ②④, §10.15 15.1(표 8·깜빡임 규칙)·15.3, `design/components.md` §3.y `TimerText`·`TimerText.module.css` 전문·규칙 9, `design/functions.md` §5.7 ①`isTimerBlinking`·⑥ | `timer://changed`(`'finished'` — contract v0.23 §3.9 확정) | TC-292, TC-294~TC-296, TC-307~TC-309 / 수동 TC-312 / TC-FLOW(S-20, 신규) | ✅ | TM-06. 10초 판정·대기 복귀는 core. JS 타이머 없음. 설계 완료, 소스 적용(CR-050 구현 동기화) |
| R-39 | §4 `fromEvent`·알림음 ref, P-9 ③④⑤·오류, §7 `get_alarm_sound`·`TimerSettings.alarmVolume` 행, §10.15 15.2(판정표 1~7)·15.3(배치 결정)·15.5·15.6(스파이크 → 수동), `design/functions.md` §5.7 ③④⑤⑥, `design/components.md` §3.y `useAlarmOnFinish`·`alarmSound` | `get_alarm_sound`(contract v0.23 §3.10·§5 확정), `timer://changed`, `Settings.timer.alarmVolume` | TC-297~TC-306, TC-307, TC-308, TC-313(음량 배선) / 수동 TC-310(자동 재생 스파이크), TC-311, TC-312 / TC-FLOW(S-20, 신규) | ✅ | TM-07·TM-09·TM-10(오버레이 몫). 재생은 오버레이 한 곳뿐(설정 창은 미리 듣기 — settings 요구). 자동 재생 허용은 수동 TC-310으로만 증명(jsdom 불가). 설계 완료, 소스 적용(CR-050 구현 동기화). (CR-058·CR-061) 내장 기본음 = 번들 mp3 `src/assets/sounds/default-alarm.mp3`, 기본 음량 44(`DEFAULT_ALARM_VOLUME` = `DEFAULT_TIMER_SETTINGS.alarmVolume`) — §10.15 15.2·15.3·15.4, `design/functions.md` §5.7 ④ 반영, TC-297·TC-298·TC-299 ⑤ 개정 |
| R-40 | §10.16(책임 나눔·상태별 동작·불변·검증), §2 ASCII `.root` `onContextMenu` 줄, P-10, §7 창 기능(CR-062) 행, §10.9.1 L-7·L-8, `design/functions.md` §5.1 `preventContextMenu`, `design/components.md` §3 `OverlayApp` 행, `design/a11y.md` 오른쪽 클릭 | 없음 — 메뉴는 core 전용(tray·hook), 새 command·event·래퍼·타입 없음(contract v0.27 유지). DOM `contextmenu`는 bridge와 무관 | TC-315(자동 — `.root` `fireEvent.contextMenu` → `false`·bridge 추가 호출 0) + 회귀(오른쪽 클릭 파츠·펜 모드 클릭·Ctrl+휠 기존 TC) / 수동 TC-316~TC-330(= MC-31~MC-45) / TC-FLOW-21(S-21) | ✅ | 설계 완료. 소스 적용(CR-062 — `index.tsx` 상수 1줄·JSX 속성 1개·react `type MouseEvent` import). 판정·팝업·전체 화면 생략·중복 가드는 core 선행(횡단 설계 §4). 사용자 결정 U-1·U-3·U-5 🔒, U-2·U-4 수용 |
