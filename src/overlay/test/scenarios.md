# overlay 테스트 시나리오

- 기준: `src/overlay/design.md`(요구 v1.7 기준, CR-017·CR-019 갱신, 분할 `design/components.md`·`design/functions.md`·`design/a11y.md`) / `src/overlay/requirements.md` v1.7 / `doc/200_설계/bridge/contract.md` v0.8(+ CR-019 미확정 계약: `Settings.slam`·`AssetSlot` 값 `'slam'` 삭제 — bridge 인계 필요)(+ CR-017 미확정 계약: `MouseSettings.area: [Point, Point, Point, Point]` 추가·`pad` 삭제, command `get_monitors`·래퍼 `getMonitors(): Promise<ScreenBounds[]>` 신규, 이 화면의 `getScreenBounds` 호출 중단) / `doc/200_설계/core/window.md` §2.2(표시 크기 예시 표, §9.2 UI-5) / `doc/000_프로젝트_확정사항.md` §5(상태 전이표)
- **기준 추가(v0.8 — CR-021)**: `src/overlay/requirements.md` **v1.9** R-22(+추가 결정 ①~③ 🔒 2026-09-24)·§2 S-7 / `src/overlay/design.md` §6 P-2·§10.1 z3 행·§10.3(`bounceAlt`)·**§10.6 규칙표 1~13행**·입력 내용 비보관 / `design/functions.md` §5.1 키보드 핸들러·§5.2(`SpecialKey`·`SPECIAL_KEYS`·`isSpecialKey`·`currentSpecial`·`MachineState.specialHeld`·`bounceSeq`·`BouncePhase`·`bouncePhase`·`MachineInput` key의 `special`)·§5.3(`SPECIAL_KEY_SLOT`·`pickKeyboardEntry`·`Layer` `bounce?: BouncePhase`)·§5.4 바운스 래퍼 5·6(`MouseArm` `bounce: BouncePhase`) / 미확정 계약(bridge 인계 필요): `KeyboardInputEvent.special`, `AssetSlot` `key_space`·`key_z`·`key_question`·`key_exclamation`·`key_enter`·`key_backspace`·`key_undo` / 분류 규칙 참조 `doc/200_설계/core/hook.md` J2·J3·J7·J9(수동 TC-151 기대값 근거)
- **기준 추가(v0.9 — CR-022)**: `src/overlay/requirements.md` **v2.0** R-23(젤리 바운스 🔒 2026-09-24)·§1 용어 주·§2 S-1·S-7 / `src/overlay/design.md` §1·§2 `.jellyWrap`·§6 P-2·§10.3 젤리 행·폐기 행·CSS 블록 / `design/components.md` 컴포넌트 표·렌더 조건 `.jellyWrap`·배경 DOM 구조 1~5 / `design/functions.md` §5.1 `jellyClass`·§5.3 `LayerStack` 렌더·§5.4 `.armWrap` 컨테이너 / CR-022(새 계약 없음)
- **v0.9 상태·수(아래 v0.8·v0.7 상태·TC 수 줄을 대체)**: CR-022 증분 — 바운스 대상이 키보드 img·`.armWrap` 각각에서 `.jellyWrap` 하나로 바뀜. 신규 TC-152~TC-159(자동 7 + 수동 1 — MC-18), 개정·폐기는 「추가 TC (v0.9)」 절 개정표, TC-FLOW-01 Step 재구성. 범위에 R-23 추가. TC 수: 159번까지 = 유효 140건(자동 123 + 수동 17) + 폐기 19건(v0.8의 17 + TC-045·TC-142). TC-FLOW 유효 6건 + 폐기 1건
- **기준 추가(v1.0 — CR-023)**: `src/overlay/requirements.md` **v2.1** R-24(키 꾹 누름 = 부르르 🔒 2026-09-24)·§2 S-8·§3 `KeyboardInputEvent.repeat` 행 / `src/overlay/design.md` §2 ASCII·§4 `machine` 초기값·상수 `REPEAT_TIMEOUT_MS`·§6 P-2·P-3·§10.1·§10.3 부르르 행·CSS 블록·부르르 규칙 1~5·§10.6 9행·`kbFrame` 문단 / `design/functions.md` §5.1 키보드 핸들러·`jellyClass(motion: WrapMotion)`·§5.2 자동 반복 행·tick 끊김 방어 행·`isRepeating`·`wrapMotion`·`WrapMotion`·`MachineState.repeating`·`lastRepeatAt`·`shiverSeq`·`REPEAT_TIMEOUT_MS`·기록 금지 / `design/components.md` 렌더 조건 `.jellyWrap` 행·§3 배경 DOM 구조 5·6 / CR-023 / 미확정 계약(bridge 인계 필요): `KeyboardInputEvent.repeat: boolean`(🔒)
- **v1.0 상태·수(아래 v0.9·v0.8·v0.7 상태·TC 수 줄을 대체)**: CR-023 증분 — 신규 TC-160~TC-175(자동 15 + 수동 1 — MC-19), 개정은 「추가 TC (v1.0)」 절 개정표(TC-001·TC-151·TC-159), TC-FLOW-08(S-8) 신규. 범위에 R-24 추가. TC 수: 175번까지 = 유효 156건(자동 138 + 수동 18) + 폐기 19건(변동 없음). TC-FLOW 유효 7건 + 폐기 1건
- **기준 추가(v1.1 — CR-025)**: `src/overlay/requirements.md` **v2.2** R-25(펜 쥔 손 파츠 🔒 2026-09-24)·§1 용어 주(R-19 펜 모드 예외)·§2 S-9·§3 펜 슬롯·`MouseSettings.penPos` 행 / `src/overlay/design.md` §2 `[pen]`·§4 `config.kbFrames`·§6 P-2·P-4·P-6(CR-025)·§7 펜 슬롯·`penPos` 행·§8·§10.1 pen 행·**§10.7** / `design/functions.md` §5.3 `findByKey`·`isPenMode`·`penDownFrameCount`·`LayerStack` 렌더(kb_up 고정)·§5.4 `armTransformFor` 추출·**§5.5**(`armTransformFor`·`defaultPenPos`·`resolvePenPos`·`penTransform` 예 ⓐ~ⓓ·`penTransformCss`·`pickPenEntry`·`PenHand` 렌더·`PenTransform`·`PEN_REST`) / `design/components.md` §3 `PenHand`·`OverlayApp`·`LayerStack` 행·렌더 조건·배경 DOM 구조 / CR-025 / 미확정 계약(bridge 인계 필요): `AssetSlot` 펜 슬롯(`pen_up`·`pen_down_{n}`·`pen_key_{special}` 7종 — TS 표현 미정, ui는 파일명 키 문자열로만 찾는다), `MouseSettings.penPos: Point | null`
- **v1.1 상태·수(아래 v1.0·v0.9·v0.8·v0.7 상태·TC 수 줄을 대체)**: CR-025 증분 — 신규 TC-176~TC-203(자동 27 + 수동 1 — MC-20), 기존 TC 개정 없음(「추가 TC (v1.1)」 절 개정표), TC-FLOW-09(S-9) 신규. 범위에 R-25 추가. TC 수: 203번까지 = 유효 184건(자동 165 + 수동 19) + 폐기 19건(변동 없음). TC-FLOW 유효 8건 + 폐기 1건
- **기준 추가(v1.2 — CR-027)**: `src/overlay/requirements.md` **v2.3** R-26(펜 모드 마우스 클릭 = 키 누름 🔒 2026-09-24)·§1 용어 주(R-25 「마우스 클릭 아님」 확장)·§2 S-10·§3 `input://mouse-button` 행 / `src/overlay/design.md` §4 `machine`(`clickHeld`)·`config`(`clickPress`)·§6 P-4(CR-027)·§7 `input://mouse-button` 행·§10.1 pen 행·§10.3 젤리 트리거·§10.7 손 그림 선택(개정)·**§10.8 규칙표 1~14**·유지되는 것·젤리 길이·모드 전환·입력 비보관·RTM R-26 / `design/functions.md` §5.2 `reduce` 바운스 ⓐ(`isPressing`)·`mouseButton` 펜 모드 행(`onMouseButton` ①~④·예)·`isPressing`·`isRepeating`(불변)·`wrapMotion` ②·`bouncePhase`·`ClickButton`·`MachineState.clickHeld`·`MachineConfig.clickPress`·`DEFAULT_MACHINE_CONFIG`·기록 금지, §5.5 `pickPenEntry` ②·CR-027 예·`PenHand` Props / `design/components.md` §3 `OverlayApp`·`PenHand` 행(CR-027) / CR-027 — **새 계약 없음**(`input://mouse-button` `{ button, pressed, ts }` 재사용)
- **v1.2 상태·수(아래 v1.1 이하 상태·TC 수 줄을 대체)**: CR-027 증분 — 신규 TC-204~TC-222(자동 18 + 수동 1 — MC-21), 개정 TC-001(초기 `clickHeld: []`)·TC-198(클릭 = 손 그림 교체·젤리)·TC-203/MC-20 ⑥·TC-FLOW-09 종료 상태(「추가 TC (v1.2)」 절 개정표), TC-FLOW-10(S-10) 신규. 범위에 R-26 추가. TC 수: 222번까지 = 유효 203건(자동 183 + 수동 20) + 폐기 19건(변동 없음). TC-FLOW 유효 9건 + 폐기 1건
- **기준 추가(v1.3 — CR-029)**: `src/overlay/requirements.md` **v2.4** R-27(대기·쉬는중 선택 강등 — 없으면 `kb_up` 🔒 2026-09-24)·R-28(위치 잠금 중 클릭 통과·끌기 불가·Ctrl+휠 불가 🔒)·§1 용어 주(CR-029)·§2 S-11·§3 `Settings.positionLock` 행 / `src/overlay/design.md` **§10.9**(10.9.1 L-1~L-7·방어 코드 미채택 근거 1~4·잔여 위험, 10.9.2 그림 선택 표 1~5행·근거 소스·회귀 ①~④ vitest / ⑤~⑨ 수동)·§7 `positionLock` 행·RTM R-27·R-28 / `design/a11y.md` 마우스 조작(CR-029) / contract v0.14 §3.3 `positionLock`(확정 — 오버레이는 읽지 않음) / CR-029 — **오버레이 소스 변경 없음**
- **v1.3 상태·수(아래 v1.2 이하 상태·TC 수 줄을 대체)**: CR-029 증분 — 신규 TC-223~TC-227(자동 5, `OverlayApp.lock.test.tsx`) + TC-228(수동 1 — MC-22), 기존 TC 개정 없음, TC-FLOW-11(S-11) 신규. 범위에 R-27·R-28 추가. **소스 변경이 없으므로 신규 자동 TC는 처음부터 Green이 정상**(§0.3 red 표 대상 아님 — Red면 스펙 또는 기존 소스 회귀 결함). TC 수: 228번까지 = 유효 209건(자동 188 + 수동 21) + 폐기 19건(변동 없음). TC-FLOW 유효 10건 + 폐기 1건
- **기준 추가(v1.4 — CR-033)**: `src/overlay/requirements.md` **v2.5** R-29(펜 손 사용 토글 🔒 2026-09-24)·§1 용어 주(CR-033 — R-25·R-26의 「`pen_up`이 있으면」 대체)·§2 S-12·§3 `MouseSettings.penMode` 행 / `src/overlay/design.md` **§10.10**(판정·`config`·`LayerStack`·`PenHand`·꺼짐 동작 표·전환·계약·§7 추가 행)·RTM R-29 / `design/functions.md` §5.3 CR-033 개정표(`isPenMode(manifest, mouse)`·`LayerStack` 렌더 prop `penMode`·`OverlayApp` `penMode`)·§5.5 `PenHand` 렌더 CR-033 개정 / `design/components.md` §3 `LayerStack`·`PenHand` 행(CR-033) / contract v0.15 §3.3 `MouseSettings.penMode: boolean`(기본 `false`, 확정 — 새 command·event·래퍼 없음)
- **v1.4 상태·수(아래 v1.3 이하 상태·TC 수 줄을 대체)**: CR-033 증분 — 신규 TC-229~TC-236(자동 8 — `penToggle.test.tsx`·`OverlayApp.penToggle.test.tsx`) + TC-237(수동 1 — MC-23), 개정 TC-187·TC-201·TC-225·TC-025(기대·입력) + 펜 전제 스펙 픽스처(`penMode true`)·비펜 스펙 픽스처(`penMode false`) — 「추가 TC (v1.4)」 절 개정표, TC-FLOW-12(S-12) 신규. 범위에 R-29 추가. TC 수: 237번까지 = 유효 218건(자동 196 + 수동 22) + 폐기 19건(변동 없음). TC-FLOW 유효 11건 + 폐기 1건
- **기준 추가(v1.5 — CR-037)**: `src/overlay/requirements.md` **v2.6** R-30(헤어(뒷머리) 파츠 `hair` 🔒 2026-09-25)·§1 용어 주(CR-037 — 펜 쥔 손은 본체 위 유지)·§2 S-13·§3 `AssetSlot 'hair'`·`assets://changed` 행 / `src/overlay/design.md` §1 출력·§2 ASCII `[hair]`·아래 문단·§7 `hair` 행·§8·§9·§10.1 hair 행·표 아래 문단·**§10.11**(자리·그림·좌표·모션·없을 때·갱신·성능·회귀 ①~⑦ + 수동 1)·RTM R-30 / `design/components.md` §3 `.jellyWrap`·`HairLayer`·`MouseArm` 행·DOM 구조·규칙 7 / `design/functions.md` §5.3 `HairLayer` 렌더 / contract v0.17 `AssetSlot` `'hair'`(확정 — `src/bridge/types.ts` 반영, 새 command·event·래퍼 없음)
- **v1.5 상태·수(아래 v1.4 이하 상태·TC 수 줄을 대체)**: CR-037 증분 — 신규 TC-238~TC-246(자동 9 — `OverlayApp.hair.test.tsx`) + TC-247(수동 1 — MC-24), **기존 TC 기대값 개정 없음**(기존 픽스처는 모두 hair 미등록 — 「추가 TC (v1.5)」 절 재확인표), TC-FLOW-13(S-13) 신규. 범위에 R-30 추가. 소스(`HairLayer.tsx`) 미적용이라 신규 자동 TC는 red가 정상(v1.5 절 §0.3 보충). TC 수: 247번까지 = 유효 228건(자동 205 + 수동 23) + 폐기 19건(변동 없음). TC-FLOW 유효 12건 + 폐기 1건
- 작성일: 2026-09-23(v0.6·v0.7·v0.8·v0.9·v1.0·v1.1·v1.2·v1.3·v1.4: 2026-09-24, v1.5: 2026-09-25) · 작성: ui-test-designer · 모드: 증분(v1.5 — CR-037), 작업 모드 보강(maintain)
- **v0.8 상태·수(아래 v0.7 상태·TC 수 줄을 대체)**: CR-021(R-22 특수 키 이미지 7종·바운스 짝 교대·입력 비보관) 증분. 신규 TC-127~TC-151(자동 24 + 수동 1 — MC-17), TC-FLOW-07(S-7) 신규, 기존 TC 개정은 「추가 TC (v0.8)」 절 개정표. 범위에 R-22 추가. TC 수: 151번까지 = 유효 134건(자동 118 + 수동 16) + 폐기 17건(변동 없음). TC-FLOW 유효 6건 + 폐기 1건
- 상태: **v0.7** — v0.6(CR-017) 위에 CR-019(쾅 메커니즘 폐기 🔒 2026-09-24 — R-06 폐기, 쾅 상태·설정 `slam`·이미지 슬롯 `slam` 삭제) 증분. 폐기 TC는 번호를 남기고 「폐기」 표기(스펙 it 삭제). 신규 TC 없음
- 범위(v1.1 기준 — R-22·R-23·R-24·R-25는 각 버전 상태 줄에서 추가): R-01, R-03~R-05, R-07, R-09, R-11~R-13, R-15~R-21(R-02·R-06·R-08·R-10·R-14는 폐기 — 대체 R-19·(없음)·R-18·R-14·R-20/R-21, 폐기 요구는 TC 없음). overlay CR 전부(적용 상태는 `test/change-requests.md` 기준 — CR-017은 요구 확정·미적용, CR-019 반영)
- TC 수: 126번까지 = 유효 109건(자동 94건 + 수동 15건) + 폐기 17건(TC-021·TC-022·TC-023·TC-036·TC-041·TC-042 — CR-015 / TC-018·TC-019·TC-020 — CR-017 / TC-007~TC-011·TC-029·TC-055·TC-091 — CR-019). 자동 = TC-001~TC-082·TC-098~TC-125 중 폐기 16건 제외, 수동 = TC-083~TC-097·TC-126 중 TC-091 제외(`src/overlay/test/manual-checklist.md` MC-01~MC-16, MC-09 폐기). TC-FLOW 유효 5건 + 폐기 1건(TC-FLOW-02 — CR-019)

## 0. 공통 전제

### 0.1 자동 TC 환경

| 항목 | 내용 |
|---|---|
| 실행 | `yarn test --run src/overlay/test` (vitest, jsdom, `src/test-setup.ts`) |
| bridge | `vi.mock('bridge/commands')`·`vi.mock('bridge/events')`. barrel `bridge`의 `export *`도 같은 모듈이라 함께 대체된다. 이벤트 래퍼 mock은 등록된 콜백을 잡아 두고 테스트가 페이로드를 직접 넣는다(`emit`). 실제 `@tauri-apps/api` import 없음 |
| CSS Modules | `vi.mock('../overlay.module.css')` — 클래스명 = 키 이름(`root`·`canvas`·`layer`·`hand`·`bounce`·`armWrap`). CSS 규칙 값 자체는 TC-078~TC-082가 `?raw`로 원문을 읽어 단언 |
| 시계 | 상태기계 = `now`·`ts` 인자 주입. 화면 = `vi.useFakeTimers({ toFake: setInterval·clearInterval·setTimeout·clearTimeout·Date })` + `setSystemTime(T0)` + `advanceTimersByTime`. 실제 sleep 없음. **tick 위상 전제**: tick 효과(design/functions.md §5.1, deps `[]`)의 interval은 마운트 시각 T0에 한 번 만들어져 T0+100·T0+200…에 발화한다. 설정 변경(`settings://changed`)·매니페스트 변경으로 interval을 다시 만들지 않으므로 위상은 끝까지 T0 기준이다(TC-057·TC-058의 경계 시각이 이 전제에 기댄다. TC-055는 CR-019로 폐기). 이벤트 `ts`는 발생 시점의 가짜 `Date.now()` |
| 호출 횟수 | 각 TC의 「n회」·「n번째 호출」은 **그 TC(또는 TC-FLOW Step)가 시작된 시점부터 센다.** 조회 3종·구독의 「각 1회」는 마운트 1회당 값이다 |
| 로케이터 | 오버레이는 접근성 이름이 없다(design.md §8 문구 없음, §9 모든 `<img>` `alt=""` → role 없음). `getByRole`·`getByLabelText` 대상이 없고 design.md에 testid도 없다 → DOM 구조(`.root`·`.canvas`·`.armWrap`) + `<img src>`(매니페스트 url)로 찾는다 |
| 픽스처 | 캔버스 900×700. 항목 url = `u:{slotKey}`(예: `u:body`, `u:kb_down_1`, `u:background`). 설정 `SETTINGS` = scale 1 · idleSeconds 300 · overlay {100,100,true}(CR-019: `slam` 키 없음) · mouse `MOUSE` = {어깨 620,530 · **area `AREA` = (420,430)(620,430)(620,630)(420,630)** · hand null · **partPos 0,0**}(CR-015: `armWidth`·`armColor` 없음, partPos 0,0 + 900×700 파츠 = 「전체 크기 그림 + (0,0)」. CR-017: `pad` 없음, `AREA` = 중심 (520,530)의 200×200 직사각형 — 옛 「패드 200×200 + 기준점 520,530」과 같은 목표점을 내므로 한 모니터 기대의 목표점은 v0.5와 같고 변형 문자열만 바뀐다, §0.2). 모니터 목록 `getMonitors` → `MONITORS` = [{0,0,1920,1080}](CR-017, 옛 `getScreenBounds` → bounds 대체). 기준점 `getHandAnchor` → (520,530) |
| 모니터·영역 픽스처 (CR-017) | 두 모니터 `TWO_MONITORS` = [A {0,0,2560,1440}(위 WQHD), B {320,1440,1920,1080}(아래 1080p)] — design/functions.md §5.4 `pickMonitor` 예와 같은 배치. 기본 이동 영역 `DEF_AREA` = (375,525)(495,525)(495,625)(375,625)(core settings.md 기본값, 중심 435,575 — 관리자 정정 2026-09-24) |
| 옛 command 감시 (CR-017) | `vi.mock('bridge/commands')` 팩토리에 `getScreenBounds: vi.fn()`을 **감시용으로만** 둔다. 래퍼 존폐는 bridge 결정이라 이름으로 import하지 않고 `import * as commands`에서 꺼내 「호출 0회」를 단언한다 |
| 손 그림(작은 그림) 픽스처 (CR-015) | `SMALL` = 마우스 파츠 3장만 **202×154**(설계 예시 `mouse_pen_hand.png` 크기), 나머지 항목은 같은 스펙의 기본 매니페스트와 같음. partPos는 **기본값 (389,492)**과 **기본값과 다른 값 (150,80)·(100,50)·(0,0)**을 TC마다 명시. 어깨 620,530 · partPos 389,492 → `transformOrigin` `231px 38px`(design/functions.md §5.4 예) |
| 스펙별 픽스처 차이 | `OverlayApp.test.tsx`: 위 기본 그대로, 매니페스트 = 배경·몸통·상태 2(대기·쉬는중 — CR-019 `slam` 없음)·kb_up·**kb_down 3장(0~2)**·마우스 파츠 3(900×700). `OverlayApp.mouse.test.tsx`: 같은 매니페스트이되 **kb_down 1장(0만)**, `SMALL_MANIFEST` = 마우스 파츠만 202×154. `OverlayApp.part.test.tsx`(CR-015 신규): `OverlayApp.mouse.test.tsx`와 같은 기본 매니페스트·`SMALL_MANIFEST`, 설정 mouse = `MOUSE` + **partPos 389,492**, 몸통 없는 매니페스트 `NO_BODY` = kb_up·kb_down 1장(0)·마우스 파츠 202×154만(배경·몸통·상태 없음). `OverlayApp.scale.test.tsx`: `SETTINGS`의 **mouse = null**(마우스 파츠 없음 — 배율·표시 크기만 본다), **`getHandAnchor` → null**, 매니페스트 = 몸통·대기·kb_up만(캔버스 W×H는 케이스별), 배경 없음. `MouseArm`·`layers`·`BackgroundLayer` 단위 스펙은 각 절 머리에 적은 props·매니페스트를 쓴다 |
| 배경 슬롯 | `'background'`는 bridge `AssetSlot` 확장(UI-B5) 전이라 스펙에서 캐스팅으로 넣는다 |

### 0.2 변형 참조표 (CR-017 — 어깨 620,530 · 영역 `AREA` · 모니터 [1920×1080])

팔 변형 = `armTransformCss(armTransform(어깨 S, 기준점 A, 목표 T))` = `rotate(θt) scaleX(k) rotate(−θh)`. θh = atan2(A − S), θt = atan2(T − S)(|T − S| < 1e-6이면 θh), k = clamp(|T − S| / |A − S|, 0.5, 1.6), 각도 소수 2자리·k 소수 3자리, `-0`은 `0`. 목표 T = `bilerpQuad(area, u, v)`, (u, v) = 커서가 있는 모니터(`pickMonitor`, 없으면 가장 가까운 모니터) 안 비율(`cursorUv`, [0,1] 고정). 「이름」은 스펙 상수 이름이다.

| 이름 | 기준점 A | 커서 → (u, v) | 목표 T | 변형 문자열 |
|---|---|---|---|---|
| `REST` | 무엇이든(쉬는 위치 `atRest` / 고를 모니터 없음 / \|A − S\| ≈ 0) | — | — | `rotate(0deg) scaleX(1) rotate(0deg)` |
| `CENTER` | (520,530) | (960,540) → (0.5,0.5) | (520,530) | `rotate(180deg) scaleX(1) rotate(-180deg)` |
| `DOWN` | (520,530) | (960,1080) → (0.5,1)(아래 끝은 반열린 구간 밖이지만 거리 0이라 같은 모니터) | (520,630) | `rotate(135deg) scaleX(1.414) rotate(-180deg)` |
| `UP` | (520,530) | (960,0) → (0.5,0) | (520,430) | `rotate(-135deg) scaleX(1.414) rotate(-180deg)` |
| `UP_ALT` | (620,430) | (960,0) → (0.5,0) | (520,430) | `rotate(-135deg) scaleX(1.414) rotate(90deg)` — 끝 `rotate`가 기준점을 구분한다(A = (520,530)이면 `UP`) |
| 하한 | (520,530) | (1920,540) → (1,0.5) | (620,530) = 어깨 | `rotate(180deg) scaleX(0.5) rotate(-180deg)`(방향 유지, k 하한) |
| 상한 | (520,530) | (0,540) → (0,0.5) | (420,530) | `rotate(180deg) scaleX(1.6) rotate(-180deg)`(k = 2 → 1.6) |
| 두 모니터 중앙 | (520,530) | B 중앙 (1280,1980) · A 중앙 (1280,720) → (0.5,0.5) | (520,530) | `CENTER`(가상 화면 전체 비율이었다면 B 중앙 v = 0.786 → 다른 값) |
| 두 모니터 밖 | (520,530) | (100,1980) → 가장 가까운 B, (0,0.5) | (420,530) | `rotate(180deg) scaleX(1.6) rotate(-180deg)` |
| B 왼쪽 위 | (520,530) | (320,1440) → B (0,0) | q0 (420,430) | `rotate(-153.43deg) scaleX(1.6) rotate(-180deg)` |
| 기본 영역 | (520,530) | (960,540) / (0,0), 영역 `DEF_AREA`, **어깨 = 기본 (558,500)**(CR-038) | (435,575) / (375,525) | `rotate(148.63deg) scaleX(1.6) rotate(-141.71deg)` / `rotate(172.22deg) scaleX(1.6) rotate(-141.71deg)`(θh = atan2(30,−38) = 141.71, 배율 2.976 / 3.815 → 1.6) |
| 설계 예 | (520,530) | (960,0), 영역 (420,410)(620,410)(620,610)(420,610) | (520,410) | `rotate(-129.81deg) scaleX(1.562) rotate(-180deg)`(design/functions.md §5.4 6단계 예) |

v0.5까지의 「회전각」 표(`armRotationDeg`·`mapAroundPivot`)는 CR-017로 폐기. 대응: v0.5 `rotate(-45deg)` → `DOWN`, `rotate(45deg)` → `UP`(기준점 520,530) 또는 `UP_ALT`(기준점 620,430 — 커서 (1920,540)은 새 식에서 목표 = 어깨가 되어 구분력이 약하므로 (960,0)으로 바꿈), `rotate(0deg)` → `REST`.

### 0.3 현재 소스 기준 예상 결과 (구현 전 red)

CR이 소스에 들어가기 전이므로 다음 TC는 **실패가 정상**이다(TDD). 구현자는 이 TC를 green으로 만든다.

근거(계약): `get_hand_anchor` command·`assets://hand-anchor-changed` event·`HandAnchorEvent`·`AssetSlot` 값 `"background"`는 contract v0.7(§3.1·§3.6·§4·§5)에 확정돼 있으나, 2026-09-23 현재 `src/bridge/`(`commands.ts`·`events.ts`·`types.ts`)에는 래퍼·타입이 없고 `DEFAULT_MOUSE_SETTINGS.hand`는 `{x:495, y:570}`이다. 그래서 bridge 구현(bridge-implementer, core assets.md §9.4 UI-B5) 전에는 이 스펙들이 `yarn tsc --noEmit`에서 타입 오류를 내고, vitest에서는 아래 TC가 실패한다.

| CR | 실패 예상 TC | 현재 소스 상태(이 문서 작성 시점 확인) |
|---|---|---|
| CR-007·008 | TC-015~TC-019, TC-025, TC-037~TC-039, TC-049~TC-053, TC-060~TC-062 | `src/state/mouseMapping.ts`에 `resolvePivot`·`mapAroundPivot` 없음. `MouseArm`에 `anchor` prop 없고 목표점을 `mapToPad`로 계산. `OverlayApp`에 기준점 효과·`anchor` 상태 없음. `DEFAULT_MOUSE_SETTINGS.hand = {495,570}`. TC-024(삭제 확인)는 현재도 통과 — 회귀 방지용 |
| CR-009 | TC-040, TC-042, TC-054(0° 단언), TC-059, TC-061 | `MouseArm`에 `atRest` prop 없음, `OverlayApp`에 `armAtRest` 상태·쉬는중 진입 효과 없음 → 시작 직후 커서 (0,0) 기준으로 회전 |
| CR-011 | TC-043~TC-046, TC-054, TC-064, TC-066, TC-067, TC-081, TC-098~TC-101 | `MouseArm` 최상위가 `.armWrap` 래퍼가 아니고(레이어 이동 모드 = img 하나, 손바닥 모드 = fragment), `bounce` prop·`.armWrap` 클래스 없음 |
| CR-012 | TC-078 | `overlay.module.css` `.root`가 `width: 450px; height: 350px; overflow: visible` |
| CR-014 | TC-033~TC-035(파일 없음), TC-064, TC-066, TC-067 | `src/overlay/components/BackgroundLayer.tsx` 없음, `.canvas`에 배경 레이어 없음 |
| CR-015 | 타입: `partPos`가 있고 `armWidth`·`armColor`가 없는 픽스처를 쓰는 스펙 전부(`MouseArm`·`mouseMapping`·`OverlayApp*` — `yarn tsc --noEmit` 타입 오류). 실행: TC-025, TC-037, TC-044, TC-046, TC-048(②), TC-064, TC-066, TC-098, TC-099, TC-103~TC-109, TC-111. TC-110·TC-112는 현재도 통과 가능(회귀 방지 — `LayerStack`은 body 없음을 이미 투명 처리, `.hand`는 이미 `position: absolute`) | 2026-09-23 기준 계약 미확정(bridge 인계 필요): `MouseSettings`에 `partPos` 없음·`armWidth`·`armColor` 있음. `MouseArm`에 손바닥 분기·`isMouseLayerMode`·svg 팔 곡선이 있고 레이어 이동 모드 img는 class `layer`(캔버스 전체), `mouseMapping.ts`에 `mapToPad`·`armControlPoint`·`armPath`·`restPosition` 있음, `OverlayApp`에 z4 `MouseArm` 있음. bridge 계약 확정·구현 → ui 적용 순서로 green이 된다 |
| CR-017 | 타입: `MouseSettings.area`·`getMonitors`·`ScreenBounds[]`를 쓰는 스펙 전부(`mouseMapping`·`MouseArm`·`OverlayApp*`·`handPart` — `pad` 없는 `MouseSettings` 픽스처, `yarn tsc --noEmit` 타입 오류). 실행: TC-015~TC-017, TC-025, TC-037~TC-040, TC-044, TC-046~TC-052, TC-054, TC-059~TC-063, TC-067, TC-098, TC-099, TC-101, TC-103~TC-107, TC-109, TC-111, TC-113~TC-125. `OverlayApp.scale`(TC-069~TC-077)은 `getMonitors` 래퍼만 생기면 통과(mouse = null) | 2026-09-24 기준 미확정 계약(bridge 인계 필요): `MouseSettings`에 `pad` 있음·`area` 없음, `getMonitors` 래퍼 없음. `mouseMapping.ts`에 `armRotationDeg`·`mapAroundPivot`·`resolvePivot(anchor, hand, pad)`, `MouseArm` prop `bounds`, `OverlayApp`이 `getScreenBounds()` 호출. 계약 확정·구현 → ui 적용 순서로 green이 된다 |
| CR-019 | 타입: `slam` 없는 `MachineConfig`(`{idleMs, kbFrames}`)를 쓰는 `inputMachine.transitions.test.ts`(`yarn tsc --noEmit` 타입 오류 — 소스 `MachineConfig.slam`이 남아 있는 동안). 실행: TC-001(`slamUntil` 속성 없음), TC-102 ②(6키 누름에서 `idle`·`slamUntil` 속성 없음), TC-067(6키 누름에서 `u:idle` class `layer` — 현 소스는 `slam` 레이어로 바뀌고 픽스처에 `slam` 슬롯이 없어 상태 img가 사라짐) | 2026-09-24 이 문서 작성 시 `src/state/inputMachine.ts`에 `slamUntil`·`slam` 참조가 남아 있음(쾅 판정·만료 로직 존재). `Settings.slam`·`AssetSlot` `'slam'` 삭제는 미확정 계약(bridge 인계 필요). ui·state 적용 → green |

---

## TC 목록

### 상태기계 — `src/state/inputMachine.ts` (확정사항 §5 전이표)

스펙: `src/overlay/test/inputMachine.transitions.test.ts`. 설정 주입 `{ idleMs: 300000, kbFrames 3 }`(CR-019: `MachineConfig`에 `slam` 없음), T0 = 1000000. 확정사항 §5 전이표 행4(동시 6키 → 쾅)는 CR-019로 폐기 — TC-007~TC-011 폐기.

### TC-001 · 전이표 행1 「아무 입력 없음」 — 초기 상태 · 종류: 자동 · 요구: R-05 · 설계: §5.2 `createInitialState`, §4 `machine`
- Given 입력 없음, 시각 T0 주입
- When `createInitialState(T0)` → `reduce(tick(T0+1000))`
- Then ⓐ 화면: 해당 없음(순수 함수 — 화면 결과는 TC-028·TC-059) ⓑ 상태: `{layer:'idle', heldCount:0, kbDown:false, kbFrame:0, mouse:{0,0,'none'}, lastInputAt:T0}`(`slamUntil` 속성 없음), tick 뒤에도 `idle` ⓒ bridge: 호출 없음(순수 함수)
- 개정 내용(v0.7, CR-019): 기대 상태에서 `slamUntil:null` 삭제, 속성 부재 단언 추가
- 개정 내용(v1.2, CR-027): Then ⓑ 초기 상태 객체(`toEqual`)에 `clickHeld: []` 추가(v1.0 개정표의 `repeating`·`lastRepeatAt`·`shiverSeq`, v0.8의 `specialHeld`·`bounceSeq`와 함께). 요구에 R-26, 설계에 design.md §4 `machine` 초기값(CR-027)·design/functions.md §5.2 `MachineState.clickHeld` 추가

### TC-002 · 전이표 행2 「5분 무입력」 → 쉬는중 · 종류: 자동 · 요구: R-05 · 설계: §5.2 `reduce` tick
- Given 초기 상태(T0)
- When `tick(T0+299999)` → `tick(T0+300000)`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 앞 tick `idle`, 뒤 tick `rest`, `kbDown false`, `button 'none'` ⓒ bridge: 호출 없음

### TC-003 · 유휴 시간은 설정값 · 종류: 자동 · 요구: R-05 · 설계: §4 `config.idleMs`, §10.2
- Given `idleMs 60000` 설정과 기본(300000) 설정
- When 각각 `tick(T0+59999)`·`tick(T0+60000)`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 60000 설정은 59999 `idle`·60000 `rest`, 기본 설정은 60000에서 `idle` ⓒ bridge: 호출 없음

### TC-004 · 쉬는중에서 입력 3종 → 대기 · 종류: 자동 · 요구: R-05 · 설계: §5.2 `reduce`(모든 입력 `rest`→`idle`)
- Given `rest` 상태(TC-002 결과)
- When 키 누름 / 마우스 이동 / 마우스 클릭을 각각 ts = T0+300010으로
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 세 경우 모두 `layer 'idle'`, `lastInputAt = T0+300010` ⓒ bridge: 호출 없음

### TC-005 · 전이표 행3 「키 입력」 누름·뗌 · 종류: 자동 · 요구: R-07 · 설계: §5.2 `reduce` key
- Given 초기 상태
- When `key(pressed true, heldCount 1)` → `key(false, 0)`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 누름 후 `kbDown true`·`heldCount 1`·`layer idle`·`mouse {0,0,'none'}`(유지), 뗌 후 `kbDown false`·`heldCount 0`·`idle` ⓒ bridge: 호출 없음

### TC-006 · 누름 프레임 순환 · 종류: 자동 · 요구: R-07 · 설계: §5.2 `kbFrame = (kbFrame+1) % kbFrames`
- Given 초기 상태, `kbFrames 3`
- When 누름·뗌 4회
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 누름 직후 프레임 `[1,2,0,1]`, 뗌은 프레임 불변 ⓒ bridge: 호출 없음

### TC-007 · ~~전이표 행4 동시 6키 → 쾅·유지~~ · **폐기(CR-019)** · 이전 요구: R-06(폐기)
- 폐기 사유: 쾅 메커니즘 삭제(사용자 🔒 2026-09-24, 확정사항 §5 행4 폐기, design/functions.md §5.2 삭제 목록 `layer='slam'` 판정). 6키를 눌러도 대기라는 사실은 TC-102 ②가 확인한다. 스펙에서 it 삭제

### TC-008 · ~~기준 아래 → 300ms 뒤 대기~~ · **폐기(CR-019)** · 이전 요구: R-06(폐기)
- 폐기 사유: `slamUntil` 계산·만료와 tick의 「`now ≥ slamUntil`이면 `idle`」 규칙 삭제(design/functions.md §5.2). tick은 TC-002·TC-003·TC-102가 커버한다. 스펙에서 it 삭제

### TC-009 · ~~쾅 기준·유지 시간은 설정값~~ · **폐기(CR-019)** · 이전 요구: R-06(폐기)
- 폐기 사유: `MachineConfig.slam` 삭제(`MachineConfig = {idleMs, kbFrames}`). 설정값 주입은 TC-003(`idleMs`)·TC-006(`kbFrames`)이 커버한다. 스펙에서 it 삭제

### TC-010 · ~~빠른 연타(동시 1키)는 쾅 아님~~ · **폐기(CR-019)** · 이전 요구: R-06(폐기)
- 폐기 사유: 쾅 상태 자체가 없어 「쾅 아님」을 가를 대상이 없다. 누름·뗌 반복 중 대기 유지·프레임 순환은 TC-005·TC-006이 커버한다. 스펙에서 it 삭제

### TC-011 · ~~쾅 중 누름 순환~~ · **폐기(CR-019)** · 이전 요구: R-06(폐기), R-07
- 폐기 사유: 쾅 상태 삭제. 누름 프레임 순환(R-07)은 TC-006, 여러 키를 누른 채의 프레임 값은 TC-102가 커버한다. 스펙에서 it 삭제

### TC-012 · 전이표 행5 「마우스 이동」 · 종류: 자동 · 요구: R-05, R-18 · 설계: §5.2 mouseMove
- Given 키 1개 누른 상태
- When `mouseMove(120,80, T0+2)`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: `mouse {120,80,'none'}`, `idle`, `kbDown true`(유지), `lastInputAt T0+2` ⓒ bridge: 호출 없음

### TC-013 · 전이표 행6 「마우스 클릭」 · 종류: 자동 · 요구: R-09 · 설계: §5.2 mouseButton
- Given 초기 상태
- When left 누름 → 뗌 → right 누름 → 뗌
- Then ⓐ 화면: 해당 없음 ⓑ 상태: `button` `left` → `none` → `right` → `none`, 누름 중 `idle`·`kbDown false` ⓒ bridge: 호출 없음

### TC-014 · 전이표 행7 「둘 다」 — 레이어 독립 · 종류: 자동 · 요구: R-19 · 설계: §5.2, §10.1
- Given 초기 상태
- When 키 누름 → 이동(300,200) → left 누름 → 키 뗌
- Then ⓐ 화면: 해당 없음 ⓑ 상태: `kbDown true`·`kbFrame 1`·`mouse {300,200,'left'}`·`idle`, 키 뗌 뒤 `kbDown false`이고 `mouse` 불변 ⓒ bridge: 호출 없음

### 좌표 순수 함수 — `src/state/mouseMapping.ts`

스펙: `src/overlay/test/mouseMapping.test.ts`.

### TC-015 · `resolvePivot` anchor 우선 · 종류: 자동 · 요구: R-21 · 설계: §5.4 `resolvePivot(anchor, hand, area)`(CR-008, CR-017 셋째 인자) — **v0.6 개정(CR-017)**
- Given anchor (262.5,1.5), hand (495,570), 영역 `DEF_AREA`(§0.1)
- When `resolvePivot(anchor, hand, DEF_AREA)`
- Then ⓐ 화면: 해당 없음 ⓑ 반환: (262.5,1.5) 그대로(보정 없음) ⓒ bridge: 호출 없음(ui는 기준점을 계산하지 않음)
- 개정 내용: 셋째 인자 패드 → 영역, 요구 R-14(폐기) → R-21

### TC-016 · `resolvePivot` hand 폴백 · 종류: 자동 · 요구: R-21 · 설계: §5.4(CR-007) — **v0.6 개정(CR-017)**
- Given anchor null, hand (495,570), 영역 `DEF_AREA`
- When `resolvePivot(null, hand, DEF_AREA)`
- Then ⓐ 화면: 해당 없음 ⓑ 반환: (495,570) ⓒ bridge: 호출 없음
- 개정 내용: 셋째 인자 패드 → 영역, 요구 R-14 → R-21

### TC-017 · `resolvePivot` 이동 영역 중심 폴백 · 종류: 자동 · 요구: R-21 · 설계: §5.4 `resolvePivot`(`bilerpQuad(area, 0.5, 0.5)` — CR-017, 옛 패드 중심 대체), design.md §10.4 변형 원점 — **v0.6 개정(CR-017)**
- Given anchor·hand null, 영역 ① `DEF_AREA` (375,525)(495,525)(495,625)(375,625) ② 직사각형 (250,560)(410,560)(410,650)(250,650) ③ 자유 사각형 (0,0)(100,20)(120,120)(10,100)
- When `resolvePivot(null, null, area)`
- Then ⓐ 화면: 해당 없음 ⓑ 반환: ① (435,575) ② (330,605) ③ (57.5,60)(네 꼭짓점 평균) ⓒ bridge: 호출 없음
- 개정 내용: 패드 중심 (100,100)·(330,605) → 영역 중심, 요구 R-14 → R-21

### TC-018 · ~~`mapAroundPivot` 식~~ · **폐기(CR-017)** · 이전 요구: R-14(폐기)
- 폐기 사유: 목표점 = 기준점 ± (가상 화면 전체 비율 − 0.5) × 패드 식이 삭제 대상이 됐다(design/functions.md §5.4 삭제 목록 `mapAroundPivot`). 커서가 있는 모니터 기준 쌍선형 목표점은 TC-113(`pickMonitor`)·TC-114(`cursorUv`)·TC-115(`bilerpQuad`)·TC-119·TC-122가 대신한다. 스펙에서 it 삭제. export가 없다는 사실은 TC-120이 확인한다

### TC-019 · ~~`mapAroundPivot` bounds 0~~ · **폐기(CR-017)** · 이전 요구: R-14(폐기)
- 폐기 사유: 같은 함수 삭제. 크기 0 모니터 방어는 TC-113(후보에서 제외)·TC-114(`cursorUv` → (0.5,0.5))·TC-121(모니터 없음 → `REST`)이 대신한다. 스펙에서 it 삭제

### TC-020 · ~~`armRotationDeg`~~ · **폐기(CR-017)** · 이전 요구: R-18
- 폐기 사유: 회전만 하던 `armRotationDeg`가 `armTransform`·`armTransformCss`(회전 + 팔 방향 늘어나기)로 대체됐다(design/functions.md §5.4 삭제 목록). 각도·배율 식은 TC-116, 문자열·기하는 TC-118이 대신한다. 이전 비고(정반대 ±180)는 새 함수가 θh·θt를 따로 내고 각도를 접지 않으므로(`atan2` 범위 그대로) 대상이 없다. 스펙에서 it 삭제. export가 없다는 사실은 TC-120이 확인한다

### TC-021 · ~~`mapToPad`(손바닥 모드)~~ · **폐기(CR-015)** · 이전 요구: R-08(폐기)
- 폐기 사유: 손바닥 모드 폐기로 `mapToPad`가 삭제 대상이 됐다(design/functions.md §5.4 삭제 목록). 스펙에서 it 삭제. 삭제 사실은 TC-108이 확인한다

### TC-022 · ~~`armControlPoint`·`armPath`~~ · **폐기(CR-015)** · 이전 요구: R-08(폐기)
- 폐기 사유: 앱이 그리는 팔 곡선 폐기(R-18 「앱은 팔을 그리지 않는다」, design.md §10.4). 스펙에서 it 삭제. 삭제 사실은 TC-108이 확인한다

### TC-023 · ~~`restPosition`~~ · **폐기(CR-015)** · 이전 요구: R-11
- 폐기 사유: 손바닥 모드 쉬는 위치 경로 삭제(design.md §10.4 「손바닥 모드 `restPosition` 경로는 삭제」). R-11 쉬는 위치(회전 0°)는 TC-040·TC-059·TC-061·TC-105가 계속 커버한다. 스펙에서 it 삭제. 삭제 사실은 TC-108이 확인한다

### TC-024 · ui 알파 무게중심 계산 삭제 · 종류: 자동 · 요구: R-21(v0.6: R-14 폐기 → 기준점 규칙을 이어받은 R-21로 재매핑) · 설계: §3·§5.4 삭제(CR-008)
- Given `state/mouseMapping` 모듈, `src/overlay/components/`
- When export 목록과 `useAlphaCentroid.ts(x)` 파일 존재 확인
- Then ⓐ 화면: 해당 없음 ⓑ 상태: `alphaCentroid` export 없음, `useAlphaCentroid` 파일 0개 ⓒ bridge: 해당 없음(기준점은 core가 계산해 `get_hand_anchor`로 온다)

### TC-025 · 기본 마우스 설정 `hand = null` · `partPos = (389,492)` · `area` 기본 4점 · `pad`·팔 필드 없음 · 종류: 자동 · 요구: R-21, R-20, R-18 · 설계: §10.4 기본 마우스 설정(contract §3.3, CR-007 / CR-015 / CR-017 미확정 계약), §7 타입 행 — **v0.6 개정(CR-017)**
- Given `DEFAULT_MOUSE_SETTINGS`(`src/bridge/types.ts`)
- When 값 전체 비교(`toEqual`), 키 존재 확인
- Then ⓐ 화면: 해당 없음 ⓑ 값: 정확히 `{ shoulder {582,484}, area [(375,525),(495,525),(495,625),(375,625)], hand null, partPos {411,464}, penPos {372,476}, penMode true }`(CR-044 🔒, contract v0.20 — v0.18~v0.19 CR-038: 어깨 558,500·partPos 389,492·penPos 356,504) — `pad`·`armWidth`·`armColor` 키가 없다 ⓒ bridge: TS 기본값이 계약 기본값(core settings.md `area` 기본값 — 관리자 정정 2026-09-24, `partPos` 기본 411,464 🔒 CR-044)과 같음
- 개정 내용: v0.5 「pad {250,560,160,90}」 삭제·`area` 추가(CR-017), 요구 R-14(폐기) → R-21·R-20. 이전 개정(v0.5): 「22 · `#e53935`」 삭제, `partPos` 추가

### 레이어 — `src/overlay/components/LayerStack.tsx`

스펙: `src/overlay/test/layers.test.tsx`. 매니페스트 = body·idle·rest·kb_up·kb_down_0·kb_down_1(CR-019: `slam` 없음).

### TC-026 · `findEntry` · 종류: 자동 · 요구: R-19 · 설계: §5.3 `findEntry`
- Given 위 매니페스트
- When `'body'`, `{kind:'kb_down', index:1}`, `'mouse_base'`
- Then ⓐ 화면: 해당 없음 ⓑ 반환: `u:body`, `u:kb_down_1`, `undefined` ⓒ bridge: 호출 없음

### TC-027 · `kbDownFrameCount` · 종류: 자동 · 요구: R-07 · 설계: §5.3
- Given kb_down 2장 / 0장 / 3장
- When `kbDownFrameCount`
- Then ⓐ 화면: 해당 없음 ⓑ 반환: 2 / 1 / 3 ⓒ bridge: 호출 없음

### TC-028 · 대기·들림 기본 렌더 · 종류: 자동 · 요구: R-19 · 설계: §5.3 `LayerStack` 렌더, §3 `Layer`, §10.1 z1~z3
- Given `machine` 초기값
- When `<LayerStack>` 렌더
- Then ⓐ 화면: img src 순서 `u:body`→`u:idle`→`u:kb_up`, 모두 class `layer`(bounce 없음)·`alt=""`·`draggable=false` ⓑ 상태: 해당 없음(순수 렌더) ⓒ bridge: 호출 없음

### TC-029 · ~~상태 교체 rest·slam~~ · **폐기(CR-019)** · 이전 요구: R-19, R-06(폐기)
- 폐기 사유: `slam` 슬롯과 `bounce={layer==='slam'}` 삭제(design/functions.md §5.3 — 상태 `Layer`에는 `bounce`를 넘기지 않는다). rest 교체(같은 노드, src `u:rest`)는 TC-032, 상태 레이어에 바운스가 없음은 TC-028(대기)·TC-054(키 누름 중 `u:idle` class `layer`)·TC-067(6키 누름 중 `u:idle` class `layer`)이 커버한다. 스펙에서 it 삭제

### TC-030 · 빈 슬롯은 투명 · 종류: 자동 · 요구: R-19 · 설계: §3 `Layer`(entry 없으면 null), §10.1
- Given idle 없는 매니페스트 / body 없는 매니페스트
- When 렌더
- Then ⓐ 화면: `[u:body, u:kb_up]` / `[u:idle, u:kb_up]` ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음

### TC-031 · 누름 프레임·폴백 · 종류: 자동 · 요구: R-07 · 설계: §5.3(`kb_down[kbFrame] ?? kb_down[0]`)
- Given `kbDown true`, `kbFrame 1` → `kbFrame 2`(없는 프레임)
- When 렌더 → 재렌더
- Then ⓐ 화면: 세 번째 img `u:kb_down_1`(class `layer bounce`) → `u:kb_down_0` ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음

### TC-032 · 같은 `<img>`의 src 교체(D-1 수용) · 종류: 자동 · 요구: R-19 · 설계: §11 D-1
- Given 대기 렌더
- When `layer 'rest'`로 재렌더
- Then ⓐ 화면: 상태 img 요소가 같은 DOM 노드이고 src만 `u:rest` ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음

### 배경 — `src/overlay/components/BackgroundLayer.tsx` (CR-014)

스펙: `src/overlay/test/BackgroundLayer.test.tsx`.

### TC-033 · 배경 렌더(변형 없음) · 종류: 자동 · 요구: R-17 · 설계: §5.3 `BackgroundLayer` 렌더, §3 배경 DOM 구조 3, §8
- Given `background` 항목 있는 매니페스트
- When `<BackgroundLayer manifest>` 렌더
- Then ⓐ 화면: img 1개(최상위), src `u:background`, class `layer` 하나, `alt=""`, `draggable=false`, `style` 속성 없음(transform·transformOrigin 없음) ⓑ 상태: 해당 없음(순수 렌더) ⓒ bridge: 호출 없음

### TC-034 · 배경 없음 = 아무것도 안 그림 · 종류: 자동 · 요구: R-17 · 설계: §5.3, §3 렌더 조건
- Given `background` 항목 없음
- When 렌더
- Then ⓐ 화면: 빈 출력(innerHTML `''`) ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음

### TC-035 · `React.memo`·manifest만으로 갱신 · 종류: 자동 · 요구: R-17 · 설계: §3 `BackgroundLayer`(memo, props = manifest 하나), §5.3
- Given 기본 export
- When `$$typeof` 확인, 같은 manifest 재렌더, 배경 url 바뀐 manifest, 배경 없는 manifest
- Then ⓐ 화면: 같은 manifest면 같은 img 노드, 새 url이면 src `u:background2`, 없으면 빈 출력 ⓑ 상태: 기본 export가 `react.memo` 타입 ⓒ bridge: 호출 없음

### 마우스 파츠 — `src/overlay/components/MouseArm.tsx`

스펙: `src/overlay/test/MouseArm.test.tsx`. 기본 props = 전체 크기 매니페스트(파츠 900×700) · 설정 어깨 620,530·**영역 `AREA`**·hand null·**partPos 0,0**(CR-015·CR-017, 팔 굵기·색·패드 없음) · **monitors [{0,0,1920,1080}]**(CR-017, 옛 prop `bounds` 대체) · 커서 (960,540) · button none · anchor (520,530) · atRest false · bounce false. 작은 그림 매니페스트 `SMALL` = 파츠 3장 202×154. 변형 기대값 이름(`REST`·`CENTER`·`DOWN`·`UP`·`UP_ALT`)은 §0.2. 「레이어 이동 모드」 표현은 CR-015 이후 **유일한 마우스 파츠 모드**를 뜻한다(requirements.md §1 용어 주).

### TC-036 · ~~`isMouseLayerMode`~~ · **폐기(CR-015)** · 이전 요구: R-08(폐기)
- 폐기 사유: 모드 판별 삭제(design/functions.md §5.4 삭제 목록 「`isMouseLayerMode`」). 스펙에서 it과 import 삭제. export가 없다는 사실은 TC-108이 확인한다

### TC-037 · 커서 추종(한 모드, 전체 크기 그림) · 종류: 자동 · 요구: R-18, R-20, R-21 · 설계: §5.4 `MouseArm` 렌더 2~6단계, §10.4 — **v0.6 개정(CR-017)**
- Given 기본 props(파츠 900×700, partPos 0,0)
- When 커서 (960,1080) / (960,0)
- Then ⓐ 화면: `.armWrap img` src `u:mouse_base`, class `hand`, `transform-origin 620px 530px`(= 어깨 − (0,0)), `transform` = `DOWN` / `UP` ⓑ 상태: 해당 없음(순수 렌더, 픽셀 안 읽음) ⓒ bridge: 호출 없음
- 개정 내용: `rotate(-45deg)`/`rotate(45deg)` → `DOWN`/`UP`(목표점은 같고 팔 방향 늘어나기 1.414 추가), 요구 R-14 → R-20·R-21. 이전 개정(v0.5): class `layer` → `hand`

### TC-038 · 기준점 폴백 체인(렌더) · 종류: 자동 · 요구: R-21 · 설계: §5.4 2단계 `resolvePivot(anchor, mouse.hand, mouse.area)` — **v0.6 개정(CR-017)**
- Given ① anchor (620,430)·hand (520,530) ② anchor null·hand (520,530) ③ anchor·hand null(영역 `AREA` 중심 520,530)
- When ① 커서 (960,0) ②③ 커서 (960,1080)
- Then ⓐ 화면: ① `UP_ALT`(anchor 사용 — hand였다면 `UP`) ② `DOWN`(hand) ③ `DOWN`(영역 중심) ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음
- 개정 내용: ① 커서 (1920,540) → (960,0), ③ 패드 420,430,200,200 중심 → 영역 중심, 기대 = §0.2 문자열, 요구 R-14 → R-21

### TC-039 · 클릭 이미지·같은 기준점 · 종류: 자동 · 요구: R-09, R-21 · 설계: §5.4 이미지 선택, 2단계(클릭 이미지도 같은 pivot) — **v0.6 개정(CR-017)**
- Given 커서 (960,1080)
- When button `left` / `right` / mouse_left 없는 매니페스트에서 `left`
- Then ⓐ 화면: src `u:mouse_left`·`DOWN` / `u:mouse_right`·`DOWN` / `u:mouse_base` ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음
- 개정 내용: `rotate(-45deg)` → `DOWN`, 요구 R-14 → R-21

### TC-040 · atRest = 변형 없음(`REST_TRANSFORM`) · 종류: 자동 · 요구: R-15, R-11, R-21 · 설계: §5.4 `MouseArm` 렌더 1·6단계(CR-009·CR-017) — **v0.6 개정(CR-017)**
- Given `atRest true`
- When 커서 (960,1080) / anchor null·커서 (0,0)
- Then ⓐ 화면: `REST`(`rotate(0deg) scaleX(1) rotate(0deg)`), `transform-origin 620px 530px` 유지 / `REST` ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음
- 개정 내용: `rotate(0deg)` → `REST` 문자열(쉬는 위치에서도 같은 형식, design/functions.md §5.4 6단계)

### TC-041 · ~~손바닥 모드 렌더~~ · **폐기(CR-015)** · 이전 요구: R-08(폐기)
- 폐기 사유: 손바닥 모드 렌더 분기(`<svg>`·`<path>`·패드 매핑점 중심 손 `<img>`) 삭제(design/functions.md §5.4 삭제 목록). 작은 그림의 배치는 TC-103(partPos 좌상단 배치)이 대신한다. svg·path가 없다는 사실은 TC-108이 확인한다. 스펙에서 it 삭제

### TC-042 · ~~손바닥 모드 atRest = `restPosition`~~ · **폐기(CR-015)** · 이전 요구: R-11
- 폐기 사유: 손바닥 모드 `restPosition` 경로 삭제(design.md §10.4). 작은 그림의 쉬는 위치(회전 0°·partPos 그대로)는 TC-105가 대신한다. 스펙에서 it 삭제

### TC-043 · 파츠 이미지 없음 → 래퍼째 없음 · 종류: 자동 · 요구: R-09 · 설계: §5.4 이미지 선택, 바운스 래퍼 1
- Given 마우스 파츠 없는 매니페스트
- When 렌더(bounce false / left·bounce true)
- Then ⓐ 화면: 빈 출력 ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음

### TC-044 · 바운스 래퍼 — 클래스와 회전 분리 · 종류: 자동 · 요구: R-16 · 설계: §5.4 바운스 래퍼 2·3, §3 `bounce` prop(CR-011)
- Given 커서 (960,1080)
- When `bounce true` / `bounce false`
- Then ⓐ 화면: 최상위 `div` class `armWrap bounce`(자식 1개, 인라인 transform 없음), 안쪽 img transform `DOWN`·class **`hand`** / 래퍼 class `armWrap` ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음
- 개정 내용(v0.5, CR-015): 안쪽 img class `layer` → `hand`. (v0.6, CR-017): 안쪽 `rotate(-45deg)` → `DOWN`(래퍼 무변형은 불변)

### TC-045 · 래퍼는 같은 DOM 요소 유지 · 종류: 자동 · 요구: R-16 · 설계: §5.4 바운스 래퍼 6
- Given `bounce false` 렌더
- When `true` → `false` 재렌더
- Then ⓐ 화면: 세 시점 모두 같은 래퍼 노드, class `armWrap` → `armWrap bounce` → `armWrap` ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음

### TC-046 · 바운스는 atRest·button·그림 크기와 독립 · 종류: 자동 · 요구: R-16, R-18 · 설계: §5.4 바운스 래퍼 2·5 — **v0.5 개정(CR-015)**
- Given `bounce true`
- When ① `atRest true` ② `button right` ③ `SMALL` 매니페스트(202×154)·partPos (389,492)
- Then ⓐ 화면: ① `armWrap bounce` + 안쪽 `REST` ② `armWrap bounce` + src `u:mouse_right` ③ `armWrap bounce`, 자식 태그 `[img]` 하나(svg 없음), 그 img class `hand`·left 389px ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음
- 개정 내용: ③ 손바닥 매니페스트·자식 `[svg, img]` → 작은 그림·자식 `[img]`(v0.5). ① `rotate(0deg)` → `REST`(v0.6, CR-017)

### 화면 — `src/overlay/index.tsx` `OverlayApp`

스펙: `src/overlay/test/OverlayApp.test.tsx`(TC-047~TC-058, TC-100, TC-123), `src/overlay/test/OverlayApp.mouse.test.tsx`(TC-059~TC-068, TC-099, TC-101, TC-122, TC-124), `src/overlay/test/OverlayApp.scale.test.tsx`(TC-069~TC-077). 매니페스트는 스펙마다 다르다(§0.1 「스펙별 픽스처 차이」): `OverlayApp.test.tsx` = 배경·몸통·상태 2(대기·쉬는중 — CR-019 `slam` 없음)·kb_up·kb_down 3장(0~2)·마우스 파츠 3(900×700), `OverlayApp.mouse.test.tsx` = 같은 구성에 kb_down 1장(0만), `OverlayApp.scale.test.tsx` = 몸통·대기·kb_up만이고 설정 mouse = null·기준점 null. 조회 3종 = `getSettings`·`getAssetManifest`·`getMonitors`(CR-017, 옛 `getScreenBounds` 대체). 시각 T0에서 마운트. 변형 기대값 이름은 §0.2.

### TC-047 · P-1 초기 로드 · 종류: 자동 · 요구: R-19, R-03, R-20 · 설계: P-1, §7 `get_settings`·`get_asset_manifest`·`get_monitors`·이벤트 5종, §3 `useBridgeEvent`, §5.1 표시 배율·모니터 목록 로드 — **v0.6 개정(CR-017)**
- Given 조회 3종 성공
- When 마운트
- Then ⓐ 화면: `.canvas` style width 900px·height 700px·`transform scale(0.5)`, `u:body`·`u:idle`·`u:kb_up` 표시, `u:rest` 없음 ⓑ 상태: `settings`·`manifest`·`monitors` 교체 ⓒ bridge: `getSettings()`·`getAssetManifest()`·`getMonitors()` 각 1회 인자 없음, `getScreenBounds` 0회(감시용 mock), `onKeyboard`·`onMouseMove`·`onMouseButton`·`onSettingsChanged`·`onAssetsChanged` 각 1회 구독, `setSettings` 호출 없음
- 개정 내용: `getScreenBounds()` → `getMonitors()`, 상태 `bounds` → `monitors`

### TC-048 · P-1 오류 — 조회 실패 · 종류: 자동 · 요구: R-01, R-19, R-18, R-20 · 설계: P-1 오류, §4 초기값(`DEFAULT_SETTINGS`·`EMPTY_MANIFEST`·`monitors []`), §5.1 모니터 목록 로드 예외 — **v0.6 개정(CR-017)**
- Given ① 조회 4종(`getSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor`) 모두 reject ② `getSettings`만 reject ③ `getMonitors`만 reject
- When 마운트(③은 이어서 이동 (960,1080))
- Then ⓐ 화면: ① `.root`만(`.canvas`·img 0개·문구 없음) ② `scale(0.5)`(기본 scale 1), 손 그림 img 좌상단 = 기본 partPos(left 411·top 464)·크기 900×700(매니페스트 항목)·원점 `171px 20px`(기본 어깨 582,484 − 기본 partPos 411,464, CR-044)·`REST`, 문구 없음(기본 `penMode` true여도 매니페스트에 `pen_up` 없음 → 펜 모드 아님) ③ `.armWrap` 없음·`u:mouse_base` 없음, `u:body` 있음, 이동 뒤에도 `.armWrap` 없음·문구 없음 ⓑ 상태: ① 초기값 유지 ② `settings = DEFAULT_SETTINGS` ③ `monitors = []` ⓒ bridge: 5초 경과 뒤에도 조회 각 1회(재시도 없음), `getScreenBounds` 0회, `setSettings` 0회
- 개정 내용: `getScreenBounds` → `getMonitors`, `bounds null` → `monitors = []`, ② `rotate(0deg)` → `REST`. 이전 개정(v0.5): ② 원점 `620px 530px` → `231px 38px`

### TC-049 · 기준점 — 구독 완료 후 조회 · 종류: 자동 · 요구: R-21 · 설계: §5.1 기준점 효과 ①~④, P-1, §7 `get_hand_anchor`(contract §3.6 순서) — **v0.6 개정(CR-017)**
- Given `onHandAnchorChanged` 구독 Promise 보류
- When 마운트 → 구독 resolve → 마우스 이동 (960,1080)
- Then ⓐ 화면: 팔 `DOWN`(anchor 520,530 사용) ⓑ 상태: `anchor = (520,530)` ⓒ bridge: `onHandAnchorChanged` 1회, resolve 전 `getHandAnchor` 0회, 후 `getHandAnchor()` 1회 인자 없음
- 개정 내용: `rotate(-45deg)` → `DOWN`, 요구 R-14 → R-21

### TC-050 · 기준점 — 이벤트가 조회 응답보다 우선 · 종류: 자동 · 요구: R-21 · 설계: §5.1 기준점 효과 ④(`!eventSeen`) — **v0.6 개정(CR-017)**
- Given `getHandAnchor` 응답 보류
- When 이벤트 `{anchor:(620,430)}` → 조회 응답 (520,530) → 이동 (960,0)
- Then ⓐ 화면: `UP_ALT`(조회값이 쓰였다면 `UP` — 끝 `rotate`가 다름) ⓑ 상태: `anchor = (620,430)` ⓒ bridge: `getHandAnchor` 1회
- 개정 내용: 이동 (1920,540) → (960,0), 기대 `rotate(45deg)`/`rotate(-180deg)` → `UP_ALT`/`UP`, 요구 R-14 → R-21

### TC-051 · 기준점 이벤트 교체·null 폴백 · 종류: 자동 · 요구: R-21 · 설계: P-6 `assets://hand-anchor-changed`, §5.1 ② — **v0.6 개정(CR-017)**
- Given 설정 hand (520,530), 현재 anchor (620,430)(단독 실행 = 마운트 조회값, TC-FLOW-03 = 연결 Step의 기준점 이벤트로 재생성), 버튼 상태 무관
- When 이동 (960,0) → 이벤트 `{anchor:null}` → 이동 (960,1080) → 이벤트 `{anchor:(620,430)}` → 이동 (960,0)
- Then ⓐ 화면: `UP_ALT` → `DOWN`(hand 폴백) → `UP_ALT` ⓑ 상태: `anchor` (620,430) → null → (620,430) ⓒ bridge: 이 TC 시작 이후 `getHandAnchor` 추가 호출 0회(이벤트로 재조회 없음. 단독 실행 스펙은 마운트 조회 포함 누계 1회로 단언)
- 개정 내용: 이동 (1920,540) → (960,0), 기대 §0.2 문자열, 요구 R-14 → R-21

### TC-052 · 기준점 오류 경로 · 종류: 자동 · 요구: R-21 · 설계: §5.1 기준점 효과 예외, P-1 오류 — **v0.6 개정(CR-017)**
- Given ① 구독 reject ② 조회 reject(`STATE_POISONED`), 설정 hand (620,430)
- When ① 마운트 → 이동 (960,1080) ② 마운트 → 이동 (960,0)
- Then ⓐ 화면: ① `DOWN`, 문구 없음 ② `UP_ALT`(hand 폴백), 문구 없음 ⓑ 상태: ① `anchor = (520,530)`(구독 없이 초깃값만) ② `anchor null` 유지 ⓒ bridge: ① `getHandAnchor()` 1회 ② `getHandAnchor` 1회, 재시도 없음
- 개정 내용: ② 이동 (1920,540) → (960,0), 기대 §0.2 문자열, 요구 R-14 → R-21
- 비고: 구독 실패 경로의 `!cancelled` 가드(언마운트 뒤 `setAnchor` 금지)는 React 18에서 관찰 수단이 없어(언마운트 후 상태 갱신 경고 제거) 자동 TC에서 뺐다 — **코드 리뷰 항목**(설계↔TC 표 §5.1 기준점 효과 행)

### TC-053 · 구독 해제·tick 정리 · 종류: 자동 · 요구: R-21, R-19 · 설계: §3 `useBridgeEvent`(ref 보관·재구독 없음), §5.1 기준점 효과 ③⑤, §5.1 tick 효과(언마운트 시 `clearInterval`)
- Given ① 정상 마운트 ② 기준점 구독 보류
- When ① 키 누름·뗌(재렌더) 후 언마운트 ② 언마운트 → 구독 resolve
- Then ⓐ 화면: 해당 없음(언마운트) ⓑ 상태: ① 재렌더 뒤에도 구독 함수 각 1회, 언마운트 전 가짜 타이머 1개 이상(tick interval), 언마운트 뒤 `vi.getTimerCount()` = 0(남은 tick 없음) ② — ⓒ bridge: ① unlisten 6종(키보드·이동·버튼·설정·에셋·기준점) 각 1회 ② resolve된 unlisten 즉시 1회

### TC-054 · P-2 키 입력 + 팔 바운스 동시 · 종류: 자동 · 요구: R-07, R-16 · 설계: P-2, §3 `bounce={machine.kbDown}`, §10.3 바운스·마우스 팔 바운스
- Given 로드 완료, 키 모두 뗀 상태(들림), 마우스 이동 없음(`armAtRest true`). 누름 프레임 위치는 무관(프레임 번호는 TC-056 소관)
- When `input://keyboard {pressed true, heldCount 1}` → `{false, 0}`
- Then ⓐ 화면: 누름 — 누름 프레임 img(`u:kb_down_n`, 마운트 직후 단독 실행이면 `u:kb_down_1`) class `layer bounce`, `u:kb_up` 없음, `.armWrap` class `armWrap bounce`, 상태 `u:idle` class `layer`, 팔 `REST` 유지(v0.6 개정: `rotate(0deg)` → `REST`) / 뗌 — `u:kb_up` class `layer`, `.armWrap` class `armWrap` ⓑ 상태: `kbDown` true → false, `armAtRest` 불변 ⓒ bridge: `setSettings` 0회, `getSettings` 1회(재조회 없음)

### TC-055 · ~~P-2 쾅~~ · **폐기(CR-019)** · 이전 요구: R-06(폐기), R-16, R-19
- 폐기 사유: 쾅 경로(P-2 쾅·§10.3 쾅) 삭제. 팔 바운스 켜짐·해제는 TC-054, 여러 키 누름 중 팔 변형 불변·상태 레이어 무바운스는 TC-067, tick 효과 발화는 TC-057·TC-058이 커버한다. 스펙에서 it 삭제

> **v0.6 일괄 개정(CR-017) — TC-059~TC-063·TC-067·TC-094·TC-095·TC-098·TC-099·TC-101·TC-103~TC-107·TC-109의 변형 기대값 읽는 법**: 이 절 아래 v0.5 문구의 `rotate(-45deg)` = §0.2 `DOWN`, `rotate(45deg)` = `UP`(기준점 520,530) 또는 `UP_ALT`(기준점 620,430 — 이 경우 커서 (1920,540)은 (960,0)으로 바뀐다: TC-109), `rotate(0deg)` = `REST`, 「조회 3종」의 `getScreenBounds` = `getMonitors`(`getScreenBounds`는 0회), 「bounds 실패」 = 「`getMonitors` 실패 또는 빈 목록」(TC-063: ① reject ② `[]`(이동 뒤에도 없음) ③ mouse null ④ 설정 변경으로 mouse null — 누계 = 마운트 4회), 패드 = 영역 `AREA`. 개별 값 차이: TC-098 ①은 영역 (100,200)(300,200)(300,400)(100,400)·커서 (960,540) → 목표 (200,300) → `rotate(135deg) scaleX(1.414) rotate(-180deg)`, TC-099 어깨 (420,530) 뒤 → `rotate(45deg) scaleX(1.414) rotate(0deg)`, TC-104 ③ = 영역 중심(520,530) 폴백. 스펙 파일(`OverlayApp.mouse.test.tsx`·`MouseArm.test.tsx`·`handPart.test.tsx`)이 이 값으로 단언한다. 요구 매핑: R-14(폐기)는 R-21(기준점·변형)·R-20(목표점)으로 읽는다(추적표 참조)

### TC-056 · 누름 프레임 수 = 매니페스트 파생 · 종류: 자동 · 요구: R-07 · 설계: §4 `config.kbFrames = kbDownFrameCount(manifest)`, `configRef`
- Given 로드 완료, kb_down 3장, `kbFrame 0`, 키 모두 뗌(단독·TC-FLOW-01 모두 마운트 직후 = TC-047 종료 상태)
- When 누름·뗌 3회 → `assets://changed`(kb_down 2장, 배경 등 나머지 동일) → 누름·뗌 3회
- Then ⓐ 화면: `u:kb_down_1`→`_2`→`_0`, 바뀐 뒤 `_1`→`_0`→`_1` ⓑ 상태: `config.kbFrames` 3 → 2 ⓒ bridge: 재조회 없음

### TC-057 · P-3 유휴 → 쉬는중 → 대기 · 종류: 자동 · 요구: R-05 · 설계: P-3, §5.1 tick 효과
- Given idleSeconds 300, 마지막 입력 시각 L(단독 = 마운트 T0, TC-FLOW-04 = TC-060 이동 시각 T0+1000). L은 tick 위상(T0 + 100ms 배수) 위에 있다
- When L 기준 299999ms 경과 → 1ms → 키 누름
- Then ⓐ 화면: `u:idle` → `u:rest`(`u:idle` 없음) → `u:idle`(`u:rest` 없음) ⓑ 상태: `layer` idle → rest → idle ⓒ bridge: `setSettings` 0회

### TC-058 · 설정 변경이 상태기계에 반영 · 종류: 자동 · 요구: R-05 · 설계: P-6 `settings://changed`, §4 `config`·`configRef` — **v0.7 개정(CR-019)**
- Given 로드 완료(마운트 T0), 키 모두 뗌, 마지막 입력 시각 L = T0(tick 위상 위)
- When `settings://changed {idleSeconds 60}`(나머지는 `SETTINGS` 그대로) → 60000ms 경과(T0+60000 tick 포함)
- Then ⓐ 화면: `u:rest` 표시, `u:idle` 없음(기본 300초 그대로였다면 아직 `u:idle`) ⓑ 상태: `config.idleMs 60000`, `machine.layer 'rest'` ⓒ bridge: `setSettings` 0회(에코 저장 없음)
- 개정 내용: 페이로드의 `slam {3, 500}`·「3키에 `u:slam`」 단계·요구 R-06 삭제, Given의 TC-FLOW-02 연결 삭제(흐름 폐기)

### TC-059 · 앱 시작 직후 팔 0° · 종류: 자동 · 요구: R-15, R-11 · 설계: §4 `armAtRest` 초기 true, P-1
- Given 마운트, 마우스 이동 없음
- When 1000ms 경과
- Then ⓐ 화면: 팔 `rotate(0deg)`·원점 `620px 530px`(현행처럼 커서 0,0 추종이면 0이 아님) ⓑ 상태: `armAtRest true` ⓒ bridge: 조회 3종 각 1회, `setSettings` 0회

### TC-060 · 마우스 이동 → 추종 재개 · 종류: 자동 · 요구: R-18, R-15 · 설계: §5.1 마우스 이동 핸들러, P-4, §11 D-2
- Given TC-059 상태
- When 이동 (960,1080) → (960,0)
- Then ⓐ 화면: `rotate(-45deg)` → `rotate(45deg)`(이벤트마다 갱신), 키보드는 `u:kb_up`(들림) 그대로(전이표 행5) ⓑ 상태: `armAtRest false`, `machine.mouse` 갱신, `kbDown false` ⓒ bridge: 조회 재호출·`setSettings` 없음

### TC-061 · 쉬는중 진입 → 0°, 키·클릭은 유지, 이동에서 재개 · 종류: 자동 · 요구: R-11, R-15 · 설계: §5.1 쉬는중 진입 효과·`armAtRest` 규칙, P-3·P-4
- Given 이동 (960,1080)으로 `rotate(-45deg)`
- When 300000ms → 키 누름·뗌 → left 누름 → 뗌 → 이동 (960,1080)
- Then ⓐ 화면: `u:rest`·`rotate(0deg)` → `u:idle`·`rotate(0deg)` → src `u:mouse_left`·`rotate(0deg)` → `rotate(-45deg)` ⓑ 상태: `armAtRest` false → true → true(키·클릭) → false ⓒ bridge: `setSettings` 0회

### TC-062 · P-4 마우스 버튼 · 종류: 자동 · 요구: R-09 · 설계: P-4, §5.4 이미지 선택
- Given 이동 (960,1080)
- When left 누름 → 뗌 → right 누름
- Then ⓐ 화면: `u:mouse_left`·`rotate(-45deg)` → `u:mouse_base` → `u:mouse_right` ⓑ 상태: `machine.mouse.button` left → none → right ⓒ bridge: `setSettings` 0회

### TC-063 · 마우스 파츠 표시 조건 · 종류: 자동 · 요구: R-18, R-09 · 설계: §3 렌더 조건(`settings.mouse && bounds && …`), P-4 오류
- Given ① bounds 실패 ② `settings.mouse null` ③ 정상 마운트
- When ①② 마운트 ③ `settings://changed {mouse:null}`
- Then ⓐ 화면: ①② `.armWrap` 없음(②는 `u:body` 있음) ③ 있던 `.armWrap`이 사라짐 ⓑ 상태: `bounds null` / `settings.mouse null` ⓒ bridge: 해당 없음(조회 재시도 없음)

### TC-064 · DOM 순서 = z 순서(한 모드) · 종류: 자동 · 요구: R-19, R-18, R-17 · 설계: §2 ASCII·DOM 순서, §3 렌더 조건(`MouseArm` z0 유일)·배경 DOM 구조 1, §10.1 — **v0.5 개정(CR-015)**
- Given ① 기본 매니페스트(파츠 900×700) ② `SMALL_MANIFEST`(파츠 202×154)
- When 마운트
- Then ⓐ 화면: `.canvas` 자식 ①② 모두 `[u:background, armWrap, u:body, u:idle, u:kb_up]`, `.armWrap` 1개, ② 래퍼 자식 태그 `[img]`·`svg` 없음 ⓑ 상태: 모드 판별 없음(그림 크기와 무관하게 같은 z0 자리) ⓒ bridge: 해당 없음
- 개정 내용: ② 손바닥 순서(팔이 맨 뒤 z4)·래퍼 자식 `[svg, img]`·`isMouseLayerMode` 단언 → z0 순서·`[img]`

### TC-065 · canvas null → 빈 창 · 종류: 자동 · 요구: R-19, R-12 · 설계: §2(`.canvas`는 canvas 있을 때만), §3 렌더 조건
- Given `{canvas:null, entries:[]}`
- When 마운트
- Then ⓐ 화면: `.root`(`data-tauri-drag-region` 있음)만, `.canvas`·img 없음 ⓑ 상태: `manifest.canvas null` ⓒ bridge: 해당 없음

### TC-066 · P-6 `assets://changed` — 배경·손 그림 크기 즉시 반영 · 종류: 자동 · 요구: R-19, R-18, R-17 · 설계: P-6(손 그림 자연 크기 재계산), §5.3 `BackgroundLayer`, §7 `assets://changed` — **v0.5 개정(CR-015)**
- Given 배경 없는 기본 매니페스트(파츠 900×700, partPos 0,0) 표시 중(단독 = 그 매니페스트로 마운트, TC-FLOW-06 = TC-101 종료 상태)
- When 배경 추가 → 배경 url 교체(`u:background2`) → 배경 삭제 → `SMALL_MANIFEST`(배경 포함, 손 그림 202×154)
- Then ⓐ 화면: 첫 자식 `armWrap` → `u:background` → `u:background2` → `armWrap`(배경 img 없음, 손 그림 left 0·top 0·900×700) → 순서 `[u:background, armWrap, u:body, u:idle, u:kb_up]`, 손 그림 left 0·top 0·202×154 ⓑ 상태: `manifest` 교체(손 그림 크기 재계산, 모드 판별 없음) ⓒ bridge: `getAssetManifest` 1회(재조회 없음), `setSettings` 0회
- 개정 내용: 마지막 단계 손바닥 매니페스트(팔이 맨 뒤 z4)·「모드 재판별」 → 작은 그림(z0 유지)·크기 교체

### TC-067 · 배경 무반응 · 종류: 자동 · 요구: R-17 · 설계: §3 배경 DOM 구조 1~3, §10.3 배경 애니메이션 없음, §10.5 같은 scale
- Given 배경 있는 레이어 이동 매니페스트로 마운트
- When 이동 (960,1080) → 6키 누름(heldCount 6) → **누름 유지 중 이동 (960,0)** → left 누름·뗌 → 키 뗌 → 400ms → 300000ms(쉬는중)
- Then ⓐ 화면: 매 단계 `.canvas` 첫 자식이 같은 img 노드, src `u:background`, class `layer`, `style` 속성 없음, 부모 = `.canvas`, `.armWrap` 조상 없음. 6키 누름 시점 상태 img `u:idle` class `layer`(쾅 없음 — 상태 레이어 바운스 없음), 누름 프레임 img class `layer bounce`·`armWrap bounce`(다른 레이어는 반응). 누름 유지 중 이동에서 팔만 `rotate(-45deg)` → `rotate(45deg)`로 바뀌고 `u:idle`(class `layer`)·누름 프레임 img·`armWrap bounce`는 유지(전이표 행7 「둘 다」) ⓑ 상태: `machine`은 idle·rest로 바뀌어도 배경 무관 ⓒ bridge: 조회 각 1회, `setSettings` 0회
- 개정 내용(v0.7, CR-019): 「6키(쾅)」·`u:slam` `layer bounce` → 6키 누름·`u:idle` class `layer`(슬롯 `slam` 삭제로 픽스처에서 빠짐)

### TC-068 · 표시 면 — 문구·포커스·알림 없음 · 종류: 자동 · 요구: R-01 · 설계: §8(labels `{}`, alt=""), §9(`design/a11y.md`)
- Given 로드 완료 후 임의 상태(단독 실행 = 마운트 직후, TC-FLOW-01 = TC-067 종료 상태인 쉬는중)
- When 키 누름 → DOM 검사
- Then ⓐ 화면: `textContent ''`, 모든 img `alt=""`·`draggable=false`, button·input·select·textarea·a[href]·[tabindex] 0개, `[aria-live]` 0개 ⓑ 상태: `labels = {}` ⓒ bridge: 해당 없음

### TC-069 · `settings://changed` 배율 반영 · 종류: 자동 · 요구: R-03 · 설계: P-6, §5.1 표시 배율
- Given 900×700, scale 1(`scale(0.5)`)
- When `settings://changed {scale 2}`
- Then ⓐ 화면: `.canvas` `scale(1)` ⓑ 상태: `settings.scale 2` ⓒ bridge: `setSettings` 0회

### TC-070 · 표시 크기 = core window.md §2.2 표 (UI-5) · 종류: 자동 · 요구: R-03 · 설계: §10.5 표시 크기 식, §5.1 표시 배율 계산, §4 `BASE_BOX`
- Given 캔버스 900×700·612×354·350×700·300×200 × 배율 0.25·0.5·1·1.1·2(20건)
- When 마운트
- Then ⓐ 화면: `.canvas` width·height = 캔버스 px, 인라인 left·top 없음(가운데 정렬 없음), `ceil(W×s − 1e-6)`×`ceil(H×s − 1e-6)`(s = transform scale 값)이 표 값과 같다 — 900×700: 113×88·225×175·450×350·495×385·900×700 / 612×354: 113×66·225×131·450×261·495×287·900×521 / 350×700: 44×88·88×175·175×350·193×385·350×700 / 300×200: 113×75·225×150·450×300·495×330·900×600 ⓑ 상태: `settings.scale` = 조회값 ⓒ bridge: `setSettings` 0회(창 리사이즈는 core 부수 효과, ui 호출 없음)
- 비고: 표의 「캔버스 없음」 행은 ui가 `.canvas`를 그리지 않으므로 TC-065로 대신한다

### TC-071 · Ctrl+휠 한 칸 · 종류: 자동 · 요구: R-04 · 설계: §5.1 `onWheel` ①③④⑤, P-5
- Given scale 1
- When `.root`에 Ctrl+휠 위(deltaY −100) → 아래(+100)
- Then ⓐ 화면: `scale(0.525)` → `scale(0.5)` ⓑ 상태: `settings.scale` 1.05 → 1 ⓒ bridge: `setSettings({...SETTINGS, scale:1.05})` → `setSettings({...SETTINGS, scale:1})`, 총 2회

### TC-072 · 배율 경계·반올림 · 종류: 자동 · 요구: R-04, R-03 · 설계: §5.1 `clampScale`·`toFixed(2)`·④, §4 `SCALE_MIN/MAX`
- Given ① scale 2 ② 0.25 ③ 1.98 ④ 0.3 ⑤ 1
- When ① 위 ② 아래 ③ 위 ④ 아래 ⑤ 위 21회
- Then ⓐ 화면: ① `scale(1)` ② `scale(0.125)` ⑤ 끝에 `scale(1)` ⓑ 상태: ③ 2 ④ 0.25 ⑤ 2 ⓒ bridge: ①② 호출 0회 ③ `scale 2` ④ `scale 0.25` ⑤ 20회, 값 `[1.05, 1.1, …, 2]`(소수 2자리), 21번째 호출 없음

### TC-073 · Ctrl 없는 휠 · 종류: 자동 · 요구: R-04 · 설계: §5.1 `onWheel` ①
- Given scale 1
- When Ctrl 없이 휠 위·아래
- Then ⓐ 화면: `scale(0.5)` 그대로 ⓑ 상태: `settings.scale 1` ⓒ bridge: `setSettings` 0회

### TC-074 · 저장 실패 · 종류: 자동 · 요구: R-04 · 설계: §5.1 `onWheel` 예외, P-5 오류
- Given `setSettings` reject
- When Ctrl+휠 위 → `settings://changed(SETTINGS)`
- Then ⓐ 화면: `scale(0.525)` 유지·문구 없음 → `scale(0.5)` ⓑ 상태: 로컬 1.05 → 저장값 1로 덮임 ⓒ bridge: `setSettings({...SETTINGS, scale:1.05})` 1회, 재시도 없음

### TC-075 · 위치 불간섭 페이로드(CR-013) · 종류: 자동 · 요구: R-04, R-13 · 설계: P-5·P-7(`set_settings`는 창을 옮기지 않는다), §5.1 `onWheel` ⑤
- Given overlay {100,100}
- When Ctrl+휠 위 → `settings://changed {scale 1.05, overlay {500,300}}` → Ctrl+휠 위
- Then ⓐ 화면: 배율만 바뀜 ⓑ 상태: 로컬 `overlay`가 이벤트 값 {500,300}으로 교정 ⓒ bridge: 1번째 `setSettings` 페이로드 `overlay {100,100,true}`(ui가 손대지 않음), 2번째 `{...이벤트값, scale:1.1}`, 조회 4종(`getHandAnchor` 포함) 각 1회 — 위치용 command 없음

### TC-076 · 위치 저장은 ui 무관(CR-010) · 종류: 자동 · 요구: R-13 · 설계: P-7, §7 위치 저장 행
- Given 로드 완료. 현재 로컬 설정 = S(단독 실행 = `SETTINGS`, TC-FLOW-05 = TC-075 종료 값 {scale 1.1, overlay {500,300}})
- When `settings://changed` = S에서 `overlay`만 {800,40}으로 바꾼 값
- Then ⓐ 화면: `.canvas` outerHTML 불변 ⓑ 상태: `settings.overlay` 교체만 ⓒ bridge: `setSettings` 0회, 조회 재호출 없음

### TC-077 · 조작 영역 = 창 전체 `.root` · 종류: 자동 · 요구: R-12, R-04 · 설계: §2(`.root` 최상위·`data-tauri-drag-region`·`onWheel`), P-7, §11 D-4, CR-012
- Given ① 현재 배율 s(단독 실행 = 1, TC-FLOW-05 = TC-076 종료 값 1.1) ② 재마운트, 저장값 scale 2(창 900×700에 해당)
- When ① `u:kb_up` 이미지 위 Ctrl+휠 위 ② `u:body` 위 Ctrl+휠 아래
- Then ⓐ 화면: `.root`가 최상위이고 `data-tauri-drag-region` 속성 보유 ⓑ 상태: ① s + 0.05(단독 1.05, FLOW 1.15) ② 1.95 ⓒ bridge: ① `setSettings({...현재 설정, scale: s+0.05})`(단독 `{...SETTINGS, scale:1.05}`) ② `setSettings({...SETTINGS, scale:1.95})` — 이미지 위 이벤트도 `.root`가 받음

### CSS 규칙 — `src/overlay/overlay.module.css`

스펙: `src/overlay/test/overlayStyles.test.ts`(Node `fs.readFileSync`로 원문 문자열을 읽는다 — `?raw` import는 vitest가 `.module.css`를 CSS Modules 객체로 처리해 collect 실패하므로 쓰지 않는다, v1.5a).

### TC-078 · `.root`·전역 투명 · 종류: 자동 · 요구: R-01, R-03, R-12 · 설계: §2(CR-012), §9 user-select, §8 R-01 해석
- Given CSS 원문
- When `.root`·전역 `#root` 규칙 파싱
- Then ⓐ 화면(규칙): `.root` width 100vw·height 100vh·overflow hidden, background·border·box-shadow·outline 없음, 파일 전체에 box-shadow·border 없음, 전역 background transparent·overflow hidden·user-select none ⓑ 상태: 해당 없음 ⓒ bridge: 해당 없음

### TC-079 · `.canvas` · 종류: 자동 · 요구: R-03, R-12 · 설계: §10.5(좌상단 원점·가운데 정렬 없음), P-7(`pointer-events: none`)
- Given CSS 원문
- When `.canvas` 파싱
- Then ⓐ 화면(규칙): position absolute·left 0·top 0·transform-origin top left·pointer-events none, animation·margin·transform 없음 ⓑ 상태: 해당 없음 ⓒ bridge: 해당 없음

### TC-080 · 바운스 keyframe · 종류: 자동 · 요구: R-07, R-16 · 설계: §10.3
- Given CSS 원문
- When `.bounce`·`@keyframes bounce` 파싱. keyframe은 구간(`N% { … }`)별로 따로 떼어 선언 표로 만든다 — `0% {`가 `100% {`의 부분 문자열로 잡히지 않게 구간 앞 경계(공백·`}`·시작)를 요구
- Then ⓐ 화면(규칙): `animation: bounce 120ms ease-out`, 구간 키가 정확히 `[0, 40, 100]`이고 0% = `{transform: translateY(0)}`, 40% = `{transform: translateY(4px)}`, 100% = `{transform: translateY(0)}`, rotate·scale 없음 ⓑ 상태: 해당 없음 ⓒ bridge: 해당 없음

### TC-081 · `.armWrap` · 종류: 자동 · 요구: R-16 · 설계: §5.4 바운스 래퍼 4(CR-011)
- Given CSS 원문
- When `.armWrap` 파싱
- Then ⓐ 화면(규칙): position absolute·left 0·top 0·width 100%·height 100%·pointer-events none, transform·animation 없음 ⓑ 상태: 해당 없음 ⓒ bridge: 해당 없음

### TC-082 · `.layer` · 종류: 자동 · 요구: R-19, R-17 · 설계: §10.1(캔버스 전체 left:0 top:0 100%), 배경 같은 좌표
- Given CSS 원문
- When `.layer` 파싱
- Then ⓐ 화면(규칙): position absolute·left 0·top 0·width 100%·height 100%, transform·animation 없음 ⓑ 상태: 해당 없음 ⓒ bridge: 해당 없음

### 수동 — `src/overlay/test/manual-checklist.md`

Tauri 런타임(투명 창·항상 위·네이티브 드래그·창 리사이즈·전역 훅·실제 WebView 휠)이 필요한 항목. 절차·기대·확인란은 체크리스트에 있다. 3단 기대의 ⓒ는 「관찰 가능한 core/bridge 결과(settings.json·창 크기)」로 적는다.

### TC-083 · 투명·테두리 없음·항상 위(Alt+Tab 포함) · 종류: 수동(MC-01) · 요구: R-01 · 설계: §2, §8
- Given 앱 실행, 이미지 등록됨
- When 다른 창을 클릭하고 Alt+Tab으로 다른 앱 전환
- Then ⓐ 화면: 사용자 이미지 외 배경·테두리·그림자·스크롤바·포커스 링 없음, 다른 창 위에 계속 보임 ⓑ 상태: 오버레이 창 숨겨지지 않음 ⓒ bridge/core: 해당 없음(창 속성)

### TC-084 · 드래그 이동 — 창 어디서나 · 종류: 수동(MC-02) · 요구: R-12 · 설계: P-7, §2(CR-012)
- Given 배율 100%·200%
- When 이미지 위·빈 투명 영역·오른쪽 아래 1/4 영역을 잡아 끌기
- Then ⓐ 화면: 모든 지점에서 창이 따라 움직임 ⓑ 상태: 해당 없음 ⓒ core: 이동 뒤 창 위치 변경

### TC-085 · 위치 저장·복원 · 종류: 수동(MC-03) · 요구: R-13 · 설계: P-7, §7 위치 저장(CR-010, core window.md M1)
- Given 창을 새 위치로 드래그
- When 1초 대기 → 종료 → 재실행
- Then ⓐ 화면: 같은 자리에 뜸 ⓑ 상태: settings.json `overlay.x/y`가 새 위치 ⓒ core: 이동 종료 500ms 뒤 저장

### TC-086 · 드래그 후 Ctrl+휠 위치 유지 · 종류: 수동(MC-04) · 요구: R-04, R-13 · 설계: P-5·P-7(CR-013)
- Given 창을 새 위치로 드래그(저장 전·후 두 경우)
- When Ctrl+휠 위·아래 여러 칸
- Then ⓐ 화면: 창 좌상단이 그 자리에 고정된 채 크기만 바뀜(기본 자리로 튀지 않음) ⓑ 상태: settings.json `scale` 갱신, `overlay.x/y`는 드래그한 위치 ⓒ core: `set_settings`가 창을 옮기지 않음

### TC-087 · 창 크기 실측 · 종류: 수동(MC-05) · 요구: R-03 · 설계: §10.5(CR-012, window.md §2.2)
- Given 900×700 캔버스 / 612×354 캔버스, 디스플레이 배율 100%
- When 배율 50%·100%·200%(900×700), 100%(612×354)
- Then ⓐ 화면: 창 안쪽 225×175·450×350·900×700 / 450×261, 이미지가 잘리지 않음 ⓑ 상태: settings.json `scale` ⓒ core: `resize_overlay` 결과 크기 = 표

### TC-088 · Ctrl+휠 창 전체·페이지 줌/스크롤 없음 · 종류: 수동(MC-06) · 요구: R-04 · 설계: §5.1 `onWheel` ②(`preventDefault`), P-5
- Given 배율 200%
- When 창 오른쪽 아래 1/4에서 Ctrl+휠, Ctrl 없이 휠
- Then ⓐ 화면: Ctrl+휠 = 배율만 바뀜(WebView 페이지 확대·스크롤 없음), Ctrl 없는 휠 = 변화 없음 ⓑ 상태: settings.json `scale` 변화는 Ctrl+휠 때만 ⓒ core: 창 리사이즈
- 비고: design/functions.md §5.1 `onWheel` ②에 따르면 `preventDefault`는 효력이 보장되지 않는다(React `onWheel`은 passive 리스너). 페이지 확대가 없는 것은 Tauri 기본 `zoomHotkeysEnabled = false` 덕이다. 그래서 ②는 MC-06 ③에서 **관찰만** 한다(합격 판정 대상 아님)

### TC-089 · 배율 변경 직후 잘림/여백 수용·스크롤바 없음 · 종류: 수동(MC-07) · 요구: R-03 · 설계: §2 `overflow: hidden`, P-5(UI-3)
- Given 배율 100%
- When Ctrl+휠을 빠르게 연속
- Then ⓐ 화면: 1~2프레임 잘림·투명 여백은 허용, 스크롤바 없음, 멎으면 창 = 이미지 크기 ⓑ 상태: 마지막 배율 저장 ⓒ core: 마지막 리사이즈가 최종 크기

### TC-090 · 전역 키 입력 반응 + 팔 바운스 · 종류: 수동(MC-08) · 요구: R-07, R-16 · 설계: P-2, §10.3
- Given 오버레이 포커스 없음(메모장에 포커스)
- When 메모장에서 타자
- Then ⓐ 화면: 키마다 키보드 누름 이미지·바운스, 레이어 이동 모드 팔도 같은 순간 같은 모양으로 튐, 팔 회전 유지 ⓑ 상태: 해당 없음 ⓒ core: 전역 훅 → `input://keyboard`

### TC-091 · ~~쾅 실측~~ · **폐기(CR-019)** · 종류: 수동(MC-09, 폐기) · 이전 요구: R-06(폐기)
- 폐기 사유: 쾅 메커니즘 삭제(사용자 🔒 2026-09-24). `manual-checklist.md` MC-09는 번호만 남기고 수행하지 않는다. 전역 키 입력 반응은 TC-090(MC-08)이 계속 확인한다

### TC-092 · 유휴 → 쉬는중·팔 0°·깨어남 · 종류: 수동(MC-10) · 요구: R-05, R-11, R-15 · 설계: P-3·P-4
- Given 설정 창에서 유휴 시간을 짧게(예: 10초) 두거나 5분 대기
- When 무입력 → 키 입력 → 마우스 이동
- Then ⓐ 화면: 쉬는중 이미지·팔 그린 그대로(0°) → 대기 이미지·팔 0° 유지 → 팔 커서 추종 ⓑ 상태: 해당 없음 ⓒ core: 이벤트 흐름

### TC-093 · 앱 시작 직후 팔 0° · 종류: 수동(MC-11) · 요구: R-15 · 설계: P-1
- Given 레이어 이동 모드 파츠 등록
- When 앱 실행 후 마우스를 움직이지 않음 → 움직임
- Then ⓐ 화면: 팔이 그린 그대로 → 커서 추종 시작 ⓑ 상태: 해당 없음 ⓒ core: 해당 없음

### TC-094 · 커서 추종·클릭 이미지·손 끝 기준 · 종류: 수동(MC-12) · 요구: R-18, R-09, R-14 · 설계: §5.4, §10.4
- Given 레이어 이동 모드 파츠 3장
- When 커서를 화면 네 모서리·중앙으로, 왼·오른 클릭
- Then ⓐ 화면: 손 끝이 커서 방향을 향해 어깨 축으로 흔들림, 클릭 중 클릭 이미지(같은 각도) ⓑ 상태: 해당 없음 ⓒ core: 오버레이 창 개발자 도구 콘솔에서 `__TAURI__.core.invoke('get_hand_anchor')` 결과(캔버스 좌표)가 `mouse_base` 그림의 손(또는 펜) 끝 그림 영역 bbox 안(MC-12 ③)

### TC-095 · 기준점 변경 즉시 반영 · 종류: 수동(MC-13) · 요구: R-14 · 설계: P-6 `assets://hand-anchor-changed`
- Given 오버레이 실행 중
- When 설정 창에서 `mouse_base` 교체 또는 어깨축 변경
- Then ⓐ 화면: 재시작 없이 팔 기준 각도가 새 이미지·어깨에 맞게 바뀜 ⓑ 상태: 해당 없음 ⓒ core: 기준점 이벤트 emit

### TC-096 · 배경 표시·무반응 · 종류: 수동(MC-14) · 요구: R-17 · 설계: §10.1 bg, §10.3
- Given 배경 PNG 등록(등록 수단은 체크리스트 참조)
- When 타자·마우스 이동·클릭·유휴·Ctrl+휠(v0.7, CR-019: 쾅 단계 삭제 — MC-14 ② 같음)
- Then ⓐ 화면: 배경이 맨 아래(팔 z0보다 아래)에서 전혀 움직이지 않고, 배율만 다른 레이어와 같이 바뀜 ⓑ 상태: 해당 없음 ⓒ core: 매니페스트에 `background` 항목

### TC-097 · 창 라벨 분기 · 종류: 수동(MC-15) · 요구: R-01 · 설계: §1(`src/main.tsx` 창 라벨 분기)
- Given 앱 실행
- When 오버레이 창 개발자 도구에서 `document.body.dataset.window` 확인
- Then ⓐ 화면: 오버레이 창에 오버레이 화면, 설정 창에 설정 화면 ⓑ 상태: `data-window="overlay"` ⓒ core: 창 라벨 `overlay`
- 비고: 대상 `src/main.tsx`는 화면 폴더 밖 **공용 진입점**(overlay·settings가 함께 쓰는 창 라벨 분기)이고 이번 범위(overlay CR)의 수정 대상이 아니라 수동으로 유지한다. 자동화 후보: 창 라벨 조회(`@tauri-apps/api/window`)를 mock하고 `src/main.tsx`를 불러와 `document.body.dataset.window`와 지연 로딩 대상 화면을 단언하는 스펙 — 공용 진입점을 고치는 작업에서 함께 정한다(변경 대기열 **Q-01**로 추적)

### 추가 TC (v0.2 — 1차 검증 반영, 기존 번호 보존을 위해 뒤 번호)

### TC-098 · 설정값 반영 — 기본값과 다른 어깨·partPos(단위) · 종류: 자동 · 요구: R-18 · 설계: §5.4 `MouseArm` 렌더 5단계(`left/top = partPos`, `transformOrigin = 어깨 − partPos`), design.md §10.4(원점 음수·그림 밖 값 허용) — **v0.5 개정(CR-015)**
- 스펙: `src/overlay/test/MouseArm.test.tsx`
- Given `SMALL`(202×154). ① 어깨 (300,200)·partPos (150,80)(기본 620,530·389,492와 다름), anchor (200,200), 패드 0,0,200,200 ② 어깨 (100,50)·partPos (389,492), `atRest true`
- When ① 커서 (960,1080) ② 렌더
- Then ⓐ 화면: ① img left 150·top 80·202×154(px), `transform-origin 150px 120px`, `rotate(-45deg)`(목표 200,300) ② `transform-origin -289px -442px`(어깨가 그림 왼쪽 위 밖), `rotate(0deg)` ⓑ 상태: 해당 없음(순수 렌더) ⓒ bridge: 호출 없음
- 개정 내용: 팔 굵기·색(armWidth 9·armColor `#123456`)·손바닥 path 단언 삭제 → partPos 배치·음수 원점 단언

### TC-099 · `settings://changed` 어깨 교체·`assets://changed` 손 그림 크기 교체 즉시 반영 · 종류: 자동 · 요구: R-18 · 설계: P-6(「손 그림 자연 크기 재계산」), §3 `MouseArm` `mouse` prop, §10.4 — **v0.5 개정(CR-015)**
- 스펙: `src/overlay/test/OverlayApp.mouse.test.tsx`
- Given 로드 완료(anchor 520,530, partPos 0,0, 파츠 900×700), 이동 (960,1080)으로 팔 원점 `620px 530px`·`rotate(-45deg)`
- When `settings://changed {mouse: 어깨만 (420,530)}`(기준점 이벤트는 아직 안 옴) → `assets://changed`(`SMALL_MANIFEST`, 손 그림 202×154)
- Then ⓐ 화면: 원점 `420px 530px`·`rotate(45deg)`(기준점 520,530이 어깨 오른쪽) → img left 0·top 0·**202×154**, 원점 `420px 530px`·`rotate(45deg)` 유지, `.armWrap svg` 없음 ⓑ 상태: `settings.mouse` 교체, `manifest` 교체, `anchor` 불변 ⓒ bridge: 조회 3종 각 1회, `setSettings` 0회
- 개정 내용: armWidth·armColor 교체와 손바닥 path(stroke·stroke-width·`M 420 530`) 단언 삭제 → 손 그림 크기 교체 단언

### 추가 TC (v0.5 — CR-015: R-18 마우스 파츠 한 모드·R-19 몸통 선택. 번호순으로 읽으려면 TC-100~TC-102(v0.2 추가분)가 이 절 뒤에 있다)

### TC-103 · 작은 손 그림 배치 — 좌상단 = partPos, 크기 = 매니페스트, 원점 = 어깨 − partPos · 종류: 자동 · 요구: R-18 · 설계: design/functions.md §5.4 `MouseArm` 렌더 5단계(예: 어깨 620,530·partPos 389,492·202×154 → `231px 38px`), design.md §10.1 z0 행·§10.4 배치·회전, §8 `alt=""`
- 스펙: `src/overlay/test/MouseArm.test.tsx`
- Given `SMALL`(파츠 202×154), mouse = 어깨 620,530·패드 0,0,200,200·hand null·partPos 389,492, anchor (520,530), bounds 1920×1080, atRest false, bounce false
- When 커서 (960,1080)로 렌더
- Then ⓐ 화면: `.armWrap img` 1개 — src `u:mouse_base`, class `hand`, 인라인 left 389·top 492·width 202·height 154(px), `transform-origin 231px 38px`, `transform rotate(-45deg)`, `alt=""`, `draggable=false` ⓑ 상태: 해당 없음(순수 렌더) ⓒ bridge: 호출 없음

### TC-104 · 기준점은 bridge 값 그대로(partPos를 더하지 않음) · 종류: 자동 · 요구: R-18, R-14 · 설계: §5.4 `MouseArm` 렌더 2단계(「ui에서 `partPos`를 더하지 않는다」), design.md §7 계약 의미 행, §10.4 회전
- 스펙: `src/overlay/test/MouseArm.test.tsx`
- Given TC-103 조건(partPos 389,492). ① anchor (520,530) ② anchor null·hand (520,530) ③ anchor·hand null·패드 420,430,200,200(중심 520,530)
- When ① 커서 (960,0) ②③ 커서 (960,1080)
- Then ⓐ 화면: ① `rotate(45deg)` ② `rotate(-45deg)` ③ `rotate(-45deg)` — 기준점에 partPos를 더했다면(909,1022) 세 경우 모두 다른 각도가 나온다 ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음(기준점 `anchor`는 core가 그림 좌표 + partPos로 계산해 넘기는 캔버스 좌표 — CR-015 미확정 계약)

### TC-105 · 쉬는 위치 0°·바운스 유지(작은 그림) · 종류: 자동 · 요구: R-18, R-11, R-15, R-16 · 설계: §5.4 `MouseArm` 렌더 1단계·바운스 래퍼 2·3·6, design.md §10.4 쉬는 위치
- 스펙: `src/overlay/test/MouseArm.test.tsx`
- Given TC-103 조건 + `atRest true`, 커서 (1920,1080)
- When `bounce false`로 렌더 → `bounce true`로 재렌더
- Then ⓐ 화면: 두 시점 모두 안쪽 img class `hand`·`rotate(0deg)`·left 389·top 492·202×154·`transform-origin 231px 38px`(그린 그대로 partPos에). 래퍼는 같은 DOM 노드로 class `armWrap` → `armWrap bounce`, 래퍼 인라인 transform 없음·자식 1개 ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음

### TC-106 · 전체 크기 그림 + partPos (0,0) = 기존 동작 · 종류: 자동 · 요구: R-18 · 설계: §5.4 5단계 두 번째 예, design.md §10.1 z0 행(「캔버스 전체 크기 그림 + `partPos = (0,0)`이면 이전 레이어 이동 모드와 같은 화면」)
- 스펙: `src/overlay/test/MouseArm.test.tsx`
- Given 기본 props(파츠 900×700, partPos 0,0, anchor 520,530)
- When 커서 (960,1080)
- Then ⓐ 화면: img left 0·top 0·width 900·height 700(px), `transform-origin 620px 530px`, `rotate(-45deg)` — v0.4 레이어 이동 모드 기대(TC-037)와 같은 원점·각도 ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음

### TC-107 · 클릭 이미지 = 같은 자리·같은 크기 · 종류: 자동 · 요구: R-18, R-09 · 설계: §5.4 이미지 선택(선택 결과 = 매니페스트 항목, 크기를 배치에 씀)·5단계, requirements R-18 「기본·왼클릭·오른클릭 파츠는 같은 크기·같은 위치」
- 스펙: `src/overlay/test/MouseArm.test.tsx`
- Given TC-103 조건, 커서 (960,1080)
- When button `left` / `right` / mouse_left 없는 매니페스트(파츠 202×154)에서 `left`
- Then ⓐ 화면: src `u:mouse_left` / `u:mouse_right` / `u:mouse_base`, 세 경우 모두 left 389·top 492·202×154, 앞 둘은 `transform-origin 231px 38px`·`rotate(-45deg)` ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음

### TC-108 · 손바닥 모드·팔 곡선 삭제 확인 · 종류: 자동 · 요구: R-18 · 설계: §5.4 삭제 목록(CR-015 — `isMouseLayerMode`·손바닥 분기·`mapToPad`·`armControlPoint`·`armPath`·`restPosition`), design.md 헤더 모드 범위, §10.4 「앱은 팔을 그리지 않는다」
- 스펙: `src/overlay/test/MouseArm.test.tsx`
- Given `MouseArm` 모듈, `state/mouseMapping` 모듈, 매니페스트 3종(900×700 / 202×154 / 이전 손바닥 크기 200×100), partPos 389,492
- When export 목록 확인, 각 매니페스트로 렌더
- Then ⓐ 화면: 세 매니페스트 모두 `svg`·`path` 0개, img 1개, 래퍼 자식 1개 ⓑ 상태: `isMouseLayerMode`(MouseArm)·`mapToPad`·`armControlPoint`·`armPath`·`restPosition`(mouseMapping) export 없음 ⓒ bridge: 해당 없음

### TC-109 · partPos 설정·변경 즉시 반영(화면 통합) · 종류: 자동 · 요구: R-18, R-14 · 설계: P-1·P-6(「설정 창에서 옮긴 `mouse.partPos`도 이 경로로 와서 손 그림 자리가 바뀐다」), §7 타입·계약 의미 행, §10.3(left/top 정적 배치), §10.4
- 스펙: `src/overlay/test/handPart.test.tsx`
- Given 설정 mouse = 어깨 620,530·패드 0,0,200,200·hand null·partPos 389,492, 매니페스트 `SMALL_MANIFEST`(손 그림 202×154), 기준점 (520,530), 마우스 이동 없음(단독 = 마운트 T0, TC-FLOW-06 = 연결 Step 4a 종료)
- When (확인) → 이동 (960,1080) → `settings://changed`(partPos만 (100,50)) → `assets://hand-anchor-changed {anchor:(620,430)}` → 이동 (1920,540)
- Then ⓐ 화면: 처음 img class `hand`·left 389·top 492·202×154·원점 `231px 38px`·`rotate(0deg)` → `rotate(-45deg)` → left 100·top 50·202×154·원점 `520px 480px`·`rotate(-45deg)`(기준점 이벤트 전 — ui가 partPos 차이를 기준점에 더하지 않음) → `rotate(45deg)`, left 100·top 50 유지 ⓑ 상태: `settings.mouse.partPos` (389,492) → (100,50), `anchor` (520,530) → (620,430) ⓒ bridge: 이 TC 시작 이후 조회 4종(`getSettings`·`getAssetManifest`·`getScreenBounds`·`getHandAnchor`) 추가 호출 없음(단독 실행 = 마운트 누계 각 1회), `setSettings` 0회

### TC-110 · 몸통 없음 — LayerStack 키보드 교체 · 종류: 자동 · 요구: R-19, R-07 · 설계: §5.3 `LayerStack` 렌더(「`body`가 없으면 몸통 `Layer`는 `null` — 투명이며 정상」, 디폴트 = `kb_up`), design/components.md `Layer`
- 스펙: `src/overlay/test/handPart.test.tsx`
- Given 몸통 없는 매니페스트(idle·rest·kb_up·kb_down 0~1 — CR-019: `slam` 없음) / 몸통·상태 없는 매니페스트(kb_up·kb_down 0)
- When 초기 machine 렌더 → 누름(kbDown true·kbFrame 1) → 뗌 / 두 번째 매니페스트로 초기 → 누름(kbFrame 1)
- Then ⓐ 화면: `[u:idle, u:kb_up]` → `[u:idle, u:kb_down_1]`(키보드 class `layer bounce`) → `[u:idle, u:kb_up]`(class `layer`) / `[u:kb_up]` → `[u:kb_down_0]`(없는 프레임 폴백). 어느 단계에도 `u:body` img 없음 ⓑ 상태: 해당 없음(순수 렌더) ⓒ bridge: 호출 없음

### TC-111 · 몸통·상태·배경 없는 매니페스트 — kb_up 디폴트·키 교체(화면 통합) · 종류: 자동 · 요구: R-19, R-18, R-07 · 설계: §2 `[z1] optional`·아래 문단, design/components.md 렌더 조건(`MouseArm` z0 유일·`LayerStack` body 없음), §10.1 z1·z3 행
- 스펙: `src/overlay/test/handPart.test.tsx`
- Given 매니페스트 `NO_BODY` = kb_up·kb_down 1장(0)·손 그림 202×154(배경·몸통·상태 없음) 표시 중, 키 모두 뗌(단독 = 그 매니페스트로 마운트, TC-FLOW-06 = 연결 Step 5a로 `assets://changed(NO_BODY)` 수신)
- When 키 누름(heldCount 1) → 뗌(0)
- Then ⓐ 화면: `.canvas` 자식 `[armWrap, u:kb_up]`(kb_up class `layer`) → `[armWrap, u:kb_down_0]`(class `layer bounce`, 래퍼 `armWrap bounce`) → `[armWrap, u:kb_up]`(class `layer`, 래퍼 `armWrap`). `u:body` img 없음, `.armWrap` 1개, `textContent ''`(안내·오류 문구 없음) ⓑ 상태: `machine.kbDown` true → false, `config.kbFrames` 1 ⓒ bridge: 이 TC 시작 이후 조회 추가 호출 없음(단독 = 누계 각 1회), `setSettings` 0회

### TC-112 · `.hand` CSS · 종류: 자동 · 요구: R-18 · 설계: §5.4 5단계(`styles.hand` = 기존 `.hand { position: absolute }` 재사용, `.layer`의 100% 크기 안 씀), design.md §10.3(움직임은 transform만, left/top 정적)
- 스펙: `src/overlay/test/overlayStyles.test.ts`
- Given CSS 원문
- When `.hand` 파싱
- Then ⓐ 화면(규칙): position absolute, width·height·left·top·transform·transform-origin·animation 선언 없음(배치·크기·회전은 인라인, 바운스는 래퍼) ⓑ 상태: 해당 없음 ⓒ bridge: 해당 없음

### 추가 TC (v0.2 계속 — TC-100~TC-102)

### TC-100 · 누름 유지 중 추가 누름 — 바운스 재생 안 됨 · 종류: 자동 · 요구: R-07, R-16 · 설계: §10.3 「클래스가 새로 붙을 때 1회 재생, 누름 유지 중 추가 누름으로 프레임만 바뀌면 재생 안 됨」, §5.4 바운스 래퍼 6, §11 D-1
- 스펙: `src/overlay/test/OverlayApp.test.tsx`
- Given 로드 완료, 키 1개 누름(`u:kb_down_1`, 키보드 img·`.armWrap` 모두 bounce)
- When 두 번째 키 누름(heldCount 2) — 두 요소의 `class` 속성을 MutationObserver로 감시
- Then ⓐ 화면: 키보드 img가 같은 DOM 노드이고 src만 `u:kb_down_2`, class `layer bounce` 유지, `.armWrap`도 같은 노드·class `armWrap bounce` 유지, 두 요소의 class 속성 변경 기록 0건(클래스가 떨어졌다 다시 붙지 않음 = 재생 없음) ⓑ 상태: `kbDown true` 유지, `kbFrame` 1 → 2 ⓒ bridge: `setSettings` 0회

### TC-101 · 빈 창에서 첫 등록 → 캔버스 처음 표시 · 종류: 자동 · 요구: R-19, R-03 · 설계: §2(`.canvas`는 canvas 있을 때만), §3 렌더 조건, P-6 `assets://changed`
- 스펙: `src/overlay/test/OverlayApp.mouse.test.tsx`
- Given 매니페스트 `{canvas:null, entries:[]}`로 마운트(TC-065 종료 상태: `.canvas` 없음)
- When `assets://changed`(배경 없는 900×700 매니페스트 — 몸통·상태·키보드·마우스 파츠)
- Then ⓐ 화면: `.canvas`가 처음 나타나고 `transform scale(0.5)`, 자식 순서 `[armWrap, u:body, u:idle, u:kb_up]`, 팔 `rotate(0deg)`(쉬는 위치) ⓑ 상태: `manifest` 교체(canvas 900×700) ⓒ bridge: `getAssetManifest` 1회(재조회 없음), `setSettings` 0회

### TC-102 · 몇 키를 누른 채든 유휴 → 쉬는중(as-built) · 종류: 자동 · 요구: R-05 · 설계: design/functions.md §5.2 `reduce`(key: 상태 레이어는 동시 키 수와 무관하게 `idle` / tick: `layer === 'idle'`이고 `now − lastInputAt ≥ idleMs`면 `rest` — 동시 키 수와 무관, `kbDown`은 뗌 이벤트로만 해제), §10.2 — **v0.7 개정(CR-019)**
- 스펙: `src/overlay/test/inputMachine.transitions.test.ts`
- Given 설정 `{idleMs 300000, kbFrames 3}`. ① 키 2개를 누른 채 유지(누름 ts T0+10, T0+20 → `heldCount 2`·`kbDown true`·`kbFrame 2`) ② 키 6개를 누른 채 유지(heldCount 1~6 누름 ts T0+1~T0+6 → `heldCount 6`·`kbDown true`·`kbFrame 0`(1→2→0→1→2→0)). 이후 입력 없음
- When ① `tick(T0+20+299999)` → `tick(T0+20+300000)` ② `tick(T0+6+299999)` → `tick(T0+6+300000)`
- Then ⓐ 화면: 해당 없음(순수 함수 — 화면에서는 쉬는중 이미지와 누름 프레임이 함께 보이는 상태) ⓑ 상태: 누름 뒤 `layer 'idle'`(② 6키의 매 누름 뒤에도 `idle` — 옛 쾅 기준 폐기), 앞 tick `idle`, 뒤 tick `rest`. 눌림 값(① `kbDown true`·`heldCount 2`·`kbFrame 2` ② `kbDown true`·`heldCount 6`·`kbFrame 0`)은 그대로, `slamUntil` 속성 없음 ⓒ bridge: 호출 없음(순수 함수)
- 개정 내용: 「기준 미만 키」 한정 → 동시 키 수 무관(② 6키 추가), 설정의 `slam {6, 300}`·`slamUntil null` 단언 삭제
- 비고: 확정사항 §5 행2 「5분 무입력 → 들림」은 키를 모두 뗀 무입력 기준이다. 키를 누른 채 이벤트가 끊긴 경우의 as-built 규칙(쉬는중으로 바뀌되 눌림 값은 유지)은 design/functions.md §5.2가 정하며 이 TC가 그것을 고정한다

### 추가 TC (v0.6 — CR-017: R-20 커서가 있는 모니터 기준 쌍선형 목표점 · R-21 회전 + 팔 방향 늘어나기 0.5~1.6)

변형 문자열 이름(`REST`·`CENTER`·`DOWN`·`UP`·`UP_ALT`)과 픽스처(`AREA`·`DEF_AREA`·`TWO_MONITORS`)는 §0.1·§0.2.

### TC-113 · `pickMonitor` — 포함·가장 가까운 모니터·동률·무효 제외 · 종류: 자동 · 요구: R-20 · 설계: design/functions.md §5.4 `pickMonitor`, design.md §10.4 커서가 있는 모니터
- 스펙: `src/overlay/test/mouseMapping.test.ts`
- Given A {0,0,2560,1440}·B {320,1440,1920,1080}, 음수 원점 L {−1920,0,1920,1080}, 동률 m1 {0,0,100,100}·m2 {200,0,100,100}, 무효 Z {0,0,0,1080}·{0,0,1920,−5}
- When [A,B]에 커서 (1000,2000)·(1000,500)·(0,0)·(1000,1440)·(100,2000)·(2560,100) / [A,L]에 (−1,500) / [m1,m2]·[m2,m1]에 (150,50) / [Z,B]·[Z,{…,−5}]·[]에 (0,0) / [A,B]에 (NaN,0)·(0,∞)
- Then ⓐ 화면: 해당 없음(순수 함수) ⓑ 반환: B · A · A · B(A의 아래 끝 1440은 반열린 구간 밖) · B(거리² 220² < 560²) · A(오른쪽 끝 밖이지만 거리 0) / L / m1 · m2(동률은 목록에서 앞선 것) / B · null · null(너비·높이 ≤ 0 제외) / null · null(비유한) ⓒ bridge: 호출 없음

### TC-114 · `cursorUv` — 모니터 내 비율 [0,1] 고정 · 종류: 자동 · 요구: R-20 · 설계: §5.4 `cursorUv`, design.md §10.4 모니터 내 비율
- 스펙: `src/overlay/test/mouseMapping.test.ts`
- Given 모니터 B, L, 크기 0·음수 모니터 {0,0,0,1080}·{0,0,1920,0}·{0,0,−100,100}
- When B에 커서 (1280,1980)·(320,1440)·(2240,2520)·(100,1980)·(5000,−50) / L에 (−960,270) / 무효 모니터에 (10,10)
- Then ⓐ 화면: 해당 없음 ⓑ 반환: {0.5,0.5} · {0,0} · {1,1} · {0,0.5} · {1,0} / {0.5,0.25} / {0.5,0.5} 세 번 ⓒ bridge: 호출 없음

### TC-115 · `bilerpQuad` — 네 모서리·중앙·자유 사각형·반올림 없음 · 종류: 자동 · 요구: R-20, R-21 · 설계: §5.4 `bilerpQuad`, design.md §10.4 목표점 T
- 스펙: `src/overlay/test/mouseMapping.test.ts`
- Given 직사각형 (250,560)(410,560)(410,650)(250,650), `DEF_AREA`, 자유 사각형 (0,0)(100,20)(120,120)(10,100), 단위 정사각형
- When 직사각형에 (u,v) = (0,0)·(1,0)·(1,1)·(0,1)·(0.5,0.5) / `DEF_AREA`에 (0.5,0.5) / 자유 사각형에 (0.5,0.5)·(0.25,0.5)·(1,0)·(−1,2)·(3,−2)·(NaN,NaN)·(NaN,0) / 단위 정사각형에 (0.125,0.375)
- Then ⓐ 화면: 해당 없음 ⓑ 반환: (250,560)·(410,560)·(410,650)·(250,650)·(330,605) / (435,575) / (57.5,60)·(31.25,55)·(100,20)·(10,100)·(100,20)(범위 밖 고정)·(57.5,60)·(50,10)(비유한 = 0.5) / (0.125,0.375)(반올림 없음) ⓒ bridge: 호출 없음

### TC-116 · `armTransform` — 각도·배율 식·상하한·목표 = 어깨·길이 0·비유한 · 종류: 자동 · 요구: R-21 · 설계: §5.4 `armTransform` ①~⑥·상수 표, design.md §10.4 팔 변형
- 스펙: `src/overlay/test/mouseMapping.test.ts`
- Given 어깨 S0 (0,0)·기준점 (100,0) / S (620,530)·A (520,530) / S0·(60,80) / S0·(−100,0)
- When 목표 T로 `armTransform(S, A, T)`
- Then ⓐ 화면: 해당 없음 ⓑ 반환: S0·(100,0) — T (0,−120) → {0,−90,1.2}, (300,0) → {0,0,1.6}(상한), (20,0) → {0,0,0.5}(하한), (0,0) → {0,0,0.5}(목표 = 어깨: 방향 유지), (50,0)·(160,0) → stretch 0.5·1.6(경계 그대로) / S·A — (520,410) → {180,−129.81,1.562}(설계 예), (520,630) → {180,135,1.414}, T = S → {180,180,0.5} / S0·(60,80) — (0,−120) → {53.13,−90,1.2} / S0·(−100,0) — (−100,−1) → {180,−179.43,1}(각도를 접지 않음) / A = S, |A − S| = 5e−7, 어깨 NaN, 기준점 ∞, 목표 NaN → `REST_TRANSFORM` ⓒ bridge: 호출 없음

### TC-117 · CR-017 상수 · 종류: 자동 · 요구: R-21, R-15 · 설계: §5.4 상수·타입 표, design.md §4 상수 `STRETCH_MIN`/`STRETCH_MAX`
- 스펙: `src/overlay/test/mouseMapping.test.ts`
- Given `state/mouseMapping` export
- When 값 비교
- Then ⓐ 화면: 해당 없음 ⓑ 값: `STRETCH_MIN` 0.5 · `STRETCH_MAX` 1.6(🔒, 설정값 아님) · `ARM_EPS` 1e−6 · `REST_TRANSFORM` = {baseDeg 0, targetDeg 0, stretch 1} ⓒ bridge: 해당 없음

### TC-118 · `armTransformCss` — 문자열·기하(손끝 = 목표, 두께 불변) · 종류: 자동 · 요구: R-21, R-15 · 설계: §5.4 `armTransformCss`, design.md §10.4 팔 변형(「k가 상·하한에 걸리면 T에 닿지 않음 — 수용」)
- 스펙: `src/overlay/test/mouseMapping.test.ts`
- Given `REST_TRANSFORM`, {0,−90,1.2}, {180,−129.81,1.562}, {−90,135,1.414}. 기하 확인: S (620,530)·A (520,530)·T (520,410) / S0·(60,80)·(0,−120) / S0·(100,0)·(300,0)
- When 문자열 생성 → 그 문자열을 어깨 원점으로 기준점과 팔에 수직인 길이 10 벡터 (−8,6)에 적용(CSS 규칙대로 오른쪽 변환부터)
- Then ⓐ 화면(문자열): `rotate(0deg) scaleX(1) rotate(0deg)` · `rotate(-90deg) scaleX(1.2) rotate(0deg)`(−0 → `0`) · `rotate(-129.81deg) scaleX(1.562) rotate(-180deg)` · `rotate(135deg) scaleX(1.414) rotate(90deg)` ⓑ 기하: 기준점 → T(±0.5px), (60,80) → (0,−120)(±0.5px), 상한이면 (160,0)(T에 닿지 않음), 수직 벡터 길이 10 유지 ⓒ bridge: 호출 없음

### TC-119 · `MouseArm` 두 모니터 목표점 · 종류: 자동 · 요구: R-20, R-21 · 설계: §5.4 `MouseArm` 렌더 3~6단계, design/components.md `MouseArm` prop `monitors`
- 스펙: `src/overlay/test/MouseArm.test.tsx`
- Given 기본 props + `monitors = [A, B]`(위 2560×1440, 아래 1920×1080)
- When 커서 (1280,1980)·(1280,720)·(1280,2520)·(1280,0)·(320,1440)·(100,1980)
- Then ⓐ 화면: `.armWrap img` transform `CENTER` · `CENTER` · `DOWN` · `UP` · `rotate(-153.43deg) scaleX(1.6) rotate(-180deg)` · `rotate(180deg) scaleX(1.6) rotate(-180deg)` ⓑ 상태: 해당 없음(순수 렌더) ⓒ bridge: 호출 없음

### TC-120 · CR-017 대체 확인 — 옛 함수 export 없음 · 종류: 자동 · 요구: R-20, R-21 · 설계: §5.4 삭제 목록(`armRotationDeg`·`mapAroundPivot`)·신규 함수 표
- 스펙: `src/overlay/test/mouseMapping.test.ts`
- Given `state/mouseMapping` 모듈
- When export 목록 확인
- Then ⓐ 화면: 해당 없음 ⓑ 상태: `armRotationDeg`·`mapAroundPivot` 없음, `pickMonitor`·`cursorUv`·`bilerpQuad`·`armTransform`·`armTransformCss`·`resolvePivot`은 함수 ⓒ bridge: 해당 없음

### TC-121 · 고를 모니터 없음 → `REST` · 종류: 자동 · 요구: R-20, R-21 · 설계: §5.4 `MouseArm` 렌더 3단계(`mon === null` → `REST_TRANSFORM`), `pickMonitor` 예외
- 스펙: `src/overlay/test/MouseArm.test.tsx`
- Given 기본 props
- When ① `monitors = []`·커서 (960,1080) ② `monitors = [{0,0,0,0}]` ③ 커서 (NaN,1080)
- Then ⓐ 화면: ① img src `u:mouse_base`·`REST`·원점 `620px 530px` ② `REST` ③ `REST` ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음 (화면에서는 `monitors = []`이면 `MouseArm` 자체를 그리지 않는다 — TC-048③·TC-063)

### TC-122 · 두 모니터 화면 통합(`getMonitors`) · 종류: 자동 · 요구: R-20, R-21 · 설계: design/functions.md §5.1 모니터 목록 로드, P-1·P-4, design.md §4 `monitors`, §10.4
- 스펙: `src/overlay/test/OverlayApp.mouse.test.tsx`
- Given `getMonitors` → `TWO_MONITORS`, 기준점 (520,530), 설정 `MOUSE`(영역 `AREA`)
- When 마운트 → 이동 (1280,1980) → (1280,2520) → (1280,720) → (1280,0) → (100,1980)
- Then ⓐ 화면: `REST` → `CENTER` → `DOWN` → `CENTER` → `UP` → `rotate(180deg) scaleX(1.6) rotate(-180deg)` ⓑ 상태: `monitors` = 두 모니터 ⓒ bridge: `getMonitors()` 1회 인자 없음, `getSettings`·`getAssetManifest` 각 1회, `getScreenBounds` 0회, `setSettings` 0회

### TC-123 · 기본 이동 영역으로 목표점(설정 조회 실패) · 종류: 자동 · 요구: R-20, R-21 · 설계: P-1 오류(설정 실패 = 기본값), design.md §10.4 기본 마우스 설정
- 스펙: `src/overlay/test/OverlayApp.test.tsx`
- Given `getSettings` reject → `DEFAULT_SETTINGS`(area `DEF_AREA`·어깨 582,484(CR-044)·partPos 411,464·`penMode` true — 매니페스트에 `pen_up` 없어 펜 모드 아님), 기준점 (520,530), 모니터 [1920×1080]
- When 이동 (960,540) → (0,0)
- Then ⓐ 화면: `rotate(148.24deg) scaleX(1.6) rotate(-143.43deg)`(목표 435,575) → `rotate(168.8deg) scaleX(1.6) rotate(-143.43deg)`(목표 375,525 — θt 168.7966 → toFixed(2) "168.80" → Number 168.8), 원점 `171px 20px` ⓑ 상태: `settings = DEFAULT_SETTINGS` ⓒ bridge: `setSettings` 0회
- 개정 내용(v1.5b, CR-038): 기본 어깨 620,530 → 558,500으로 θh 180 → 141.71, θt 166.33 → 148.63 / −178.83 → 172.22, 원점 `231px 38px` → `169px 8px`(계산 근거 = §0.2 「기본 영역」 행·스펙 주석)
- 개정 내용(v1.7a, CR-044): 기본 어깨 558,500 → 582,484·partPos 389,492 → 411,464로 h = (−62,46), θh 141.71 → 143.43, θt 148.63 → 148.24 / 172.22 → 168.8, 배율 2.239 / 2.733 → 상한 1.6 유지, 원점 `169px 8px` → `171px 20px`(계산 근거 = `src/state/mouseMapping.ts` `armTransform` 식·스펙 주석, 반올림 경계 여유 ≥0.0016°)

### TC-124 · `settings://changed` 영역 변경 즉시 반영 · 종류: 자동 · 요구: R-20 · 설계: P-6(「설정 창에서 지정한 `mouse.area`도 이 경로로 와서 다음 렌더부터 새 영역으로 목표점」)
- 스펙: `src/overlay/test/OverlayApp.mouse.test.tsx`
- Given 로드 완료, 이동 (960,1080)으로 `DOWN`
- When `settings://changed`(mouse.area만 (320,530)(520,530)(520,730)(320,730)) → 이동 (960,540)
- Then ⓐ 화면: 이동 없이 곧바로 `rotate(135deg) scaleX(1.6) rotate(-180deg)`(목표 420,730) → `rotate(153.43deg) scaleX(1.6) rotate(-180deg)`(목표 420,630), 원점 `620px 530px` 불변 ⓑ 상태: `settings.mouse.area` 교체 ⓒ bridge: 조회 추가 0회(누계 각 1회), `getScreenBounds` 0회, `setSettings` 0회

### TC-125 · 렌더 — 배율 상·하한·목표 = 어깨·|A − S| ≈ 0·설계 예 · 종류: 자동 · 요구: R-21 · 설계: §5.4 `MouseArm` 렌더 5·6단계(설계 예), `armTransform` ①④⑤
- 스펙: `src/overlay/test/MouseArm.test.tsx`
- Given 기본 props
- When ① 커서 (1920,540) ② 커서 (0,540) ③ anchor = 어깨 (620,530)·커서 (960,1080) ④ 영역 (420,410)(620,410)(620,610)(420,610)·커서 (960,0)
- Then ⓐ 화면: ① `rotate(180deg) scaleX(0.5) rotate(-180deg)` ② `rotate(180deg) scaleX(1.6) rotate(-180deg)` ③ `REST` ④ `rotate(-129.81deg) scaleX(1.562) rotate(-180deg)` ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음

### TC-126 · 두 모니터 실측 — 넓은 추종·위로 가면 늘어남 · 종류: 수동(MC-16) · 요구: R-20, R-21 · 설계: design.md §10.4, P-4
- Given 실제 두 모니터(위 WQHD·아래 1080p 또는 가진 구성), 이동 영역 4점 설정(settings CR-018 UI 또는 settings.json `mouse.area` 편집)
- When 각 모니터에서 커서를 네 모서리·중앙으로, 모니터 사이를 오가며, 위쪽으로 크게 옮긴다
- Then ⓐ 화면: 커서가 있는 모니터 기준으로 손끝이 영역 네 꼭짓점 근처까지 넓게 움직인다(아래 모니터에서도 좁아지지 않음). 커서가 위로 가면 팔이 앞으로 뻗듯 늘어나고 두께는 그대로이며 0.5~1.6배를 넘지 않는다 ⓑ 상태: settings.json `mouse.area` 4점·`pad` 없음 ⓒ core: 오버레이 개발자 도구 `await __TAURI__.core.invoke('get_monitors')` 결과가 모니터 수만큼의 사각형

### 추가 TC (v0.8 — CR-021: R-22 특수 키 이미지 7종 · 새 특수 키마다 바운스(짝 교대) · 떼면 이전 특수 키 복귀 · 입력 비보관)

공통 전제 보충(§0.1에 더한다)
- 키보드 이벤트 픽스처 = `{ pressed, heldCount, special, ts }`. 기존 스펙의 `key()` 헬퍼는 `special: null`(일반 키)을 넣고, 새 스펙은 분류값을 넣는다. 상태기계 입력 `MachineInput` key 변형도 `special` 포함.
- CSS Modules mock 클래스에 `bounceAlt`를 더한다(`OverlayApp.test`·`OverlayApp.mouse.test`·`handPart.test`·`specialKey.render.test`·`OverlayApp.special.test`). `.bounceAlt` 규칙 값 자체는 TC-143이 `?raw`로 단언.
- 특수 키 매니페스트 `SPECIAL_MANIFEST`(`OverlayApp.special.test.tsx`) = `OverlayApp.test.tsx` 기본 매니페스트(배경·몸통·대기·쉬는중·kb_up·kb_down 3장·마우스 파츠 900×700) + `key_space`·`key_enter`·`key_undo`(url `u:key_space`·`u:key_enter`·`u:key_undo`). `key_z`·`key_question`·`key_exclamation`·`key_backspace`는 **미등록**(design.md §10.6 규칙표 가정 「`key_space`·`key_enter` 등록, `key_z` 미등록」 + 12행용 `key_undo` 등록). 슬롯 `key_*`는 bridge `AssetSlot` 확장 전이라 캐스팅.
- **바운스 짝 규칙**(새 TC·개정 TC 공통, design/functions.md §5.2): `bouncePhase = kbDown ? (bounceSeq % 2 === 0 ? 0 : 1) : null`, 초기 `bounceSeq 0`. 따라서 마운트 뒤 **모든 키가 떼진 상태의 첫 누름은 `bounceSeq 1` → phase 1 → `.bounceAlt`**, 다음 재생은 `.bounce`, 그다음 `.bounceAlt`… `createInitialState`에 `kbDown: true`만 덮어쓴 단위 픽스처(`bounceSeq 0`)는 phase 0 → `.bounce`.
- 키보드 파츠 img 로케이터 = `.canvas`의 마지막 자식(design.md §2 DOM 순서: 배경 → 마우스 파츠 → 몸통 → 상태 → 키보드).
- 입력 내용 비보관(R-22 🔒, design.md §10.6): 스펙은 입력 순서를 파일·스냅샷·로그로 남기지 않는다(`toMatchSnapshot`·파일 쓰기 없음). ui-tester의 `result.md`·스크린샷 파일명에도 입력 순서를 적지 않는다.
- §0.3 보충 — **CR-021 red**: 실패 예상 = TC-127~TC-150 전부, 개정 TC-001·TC-054·TC-067·TC-100·TC-111·TC-043~TC-046·TC-105(아래 개정표). 근거: design.md RTM R-22 비고 「소스 미적용(CR-021), 계약 확정 전 구현 금지」 — 이 문서 작성 시 소스는 열어 보지 않았다. `KeyboardInputEvent.special`·`AssetSlot` `key_*`가 bridge에 없으면 새 스펙은 `yarn tsc --noEmit` 타입 오류. bridge 계약 확정·구현 → state·ui 적용 순서로 green.

#### v0.8 개정표 — 기존 TC 기대값 변경(이 표가 해당 TC 본문의 Given/When/Then을 아래 내용만큼 대체한다)

| TC | 스펙 | 개정 내용(CR-021) |
|---|---|---|
| TC-001 | `inputMachine.transitions.test.ts` | Then ⓑ 초기 상태 객체에 `specialHeld: []`·`bounceSeq: 0` 추가(그 밖 불변) |
| TC-002~TC-006, TC-012~TC-014, TC-102 | 같은 파일 | When의 키 입력에 `special: null`(기대 불변) |
| TC-054 | `OverlayApp.test.tsx` | Then ⓐ 누름 뒤 누름 프레임 class `layer bounceAlt`·팔 래퍼 `armWrap bounceAlt`(마운트 뒤 첫 누름 = phase 1). 뗌 뒤 `layer`·`armWrap` 불변 |
| TC-100 | 같은 파일 | Then ⓐ 첫 누름 뒤 `layer bounceAlt`·`armWrap bounceAlt`, 일반 키 추가 누름에서 class 속성 변경 0건(불변 — `bounceSeq` 그대로) |
| TC-067 | `OverlayApp.mouse.test.tsx` | Then ⓐ 6키 첫 누름 뒤 누름 프레임 `layer bounceAlt`·팔 래퍼 `armWrap bounceAlt`, 누름 유지 중 이동 뒤에도 `armWrap bounceAlt`. 상태 img `layer`·배경 불변은 그대로 |
| TC-111 | `handPart.test.tsx` | Then ⓐ 누름 뒤 `u:kb_down_0` class `layer bounceAlt`·래퍼 `armWrap bounceAlt` |
| TC-043~TC-046, TC-105 | `MouseArm.test.tsx` | Given의 prop `bounce`: `true` → `0`, `false` → `null`(`BouncePhase`, design/functions.md §5.4 바운스 래퍼 5). 기대 클래스 불변(`0` = `armWrap bounce`, `null` = `armWrap`). phase `1` = `armWrap bounceAlt`는 TC-142 |
| TC-031, TC-110 | `layers.test.tsx`, `handPart.test.tsx` | 기대 불변(`createInitialState` 기반 `bounceSeq 0` + `kbDown true` → phase 0 → `layer bounce`) |
| TC-080 | `overlayStyles.test.ts` | 불변(`.bounce`). `.bounceAlt`는 TC-143 |
| TC-FLOW-01 Step 3 | TC-054 | 종료 상태 「누름 프레임·팔 래퍼 `bounceAlt`(Step 2 TC-056까지 누름 6회 → `bounceSeq` 짝수 → 다음 첫 누름 7 = phase 1)」 |
| TC-FLOW-06 Step 6 | TC-111 | 앞 Step(TC-065·TC-101·TC-066·TC-069·TC-109·연결 4a·5a)의 When에 키 누름이 없어 `bounceSeq 0` → 첫 누름 phase 1(`bounceAlt`) |

#### 상태기계 — `src/state/inputMachine.ts` (design.md §10.6 규칙표)

스펙: `src/overlay/test/inputMachine.special.test.ts`. 설정 주입 `{ idleMs: 300000, kbFrames: 3 }`, T0 = 1000000, 이벤트 `ts`는 10씩 증가하는 주입 값. 「규칙 n」 = design.md §10.6 규칙표 n행.

### TC-127 · `SPECIAL_KEYS`·`isSpecialKey` — 7종만 참 · 종류: 자동 · 요구: R-22 · 설계: design/functions.md §5.2 `SpecialKey`·`SPECIAL_KEYS`·`isSpecialKey`, design.md §10.6 분류
- Given 없음(순수 함수)
- When `SPECIAL_KEYS` 조회, `isSpecialKey`에 7종과 그 밖의 값(`'Space'`·`'Z'`·`'a'`·`'slam'`·`'key_space'`·`'ctrl'`·`''`·`' '`·`undefined`·`null`·`0`·`1`·`true`·`{}`·`['space']`)
- Then ⓐ 화면: 해당 없음(순수 함수 — 화면 결과는 TC-148) ⓑ 상태: `SPECIAL_KEYS` = `['space','z','question','exclamation','enter','backspace','undo']`, 7종 `true`, 나머지 전부 `false` ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/inputMachine.special.test.ts`

### TC-128 · 초기값·`currentSpecial`·`bouncePhase` · 종류: 자동 · 요구: R-22, R-07, R-16 · 설계: §5.2 `MachineState.specialHeld`·`bounceSeq`(초기값)·`currentSpecial`·`bouncePhase`·`BouncePhase`, design.md §4 `machine.specialHeld`
- Given `createInitialState(T0)`
- When 초기 상태, 그리고 `specialHeld`·`kbDown`·`bounceSeq`만 바꾼 상태에 두 함수 적용
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 초기 `specialHeld []`·`bounceSeq 0`·`currentSpecial null`·`bouncePhase null`. `['space','enter']` → `'enter'`, `['undo']` → `'undo'`. `kbDown false`·`bounceSeq 3` → `null`, `kbDown true` + `bounceSeq 0 / 3 / 4` → `0 / 1 / 0` ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-129 · 규칙 1~3 — 스페이스 누름·스페이스 누른 채 일반 키 · 종류: 자동 · 요구: R-22, R-07 · 설계: §5.2 `reduce` 특수 키 추적 ①②·바운스 재생 카운터 ⓐ, design.md §10.6 1~3행
- Given 초기 상태
- When `key(누름, heldCount 1, 'space')` → `key(누름, 2, null)`(a)
- Then ⓐ 화면: 해당 없음(화면은 TC-145) ⓑ 상태: 시작 `[]`·`bounceSeq 0`·phase `null`. 스페이스 뒤 `['space']`·`bounceSeq 1`·phase `1`·`kbDown true`·`kbFrame 1`·`currentSpecial 'space'`. a 뒤 `['space']`·`bounceSeq 1`(재생 없음)·`heldCount 2`·`kbFrame 2`(누름마다 순환)·`currentSpecial 'space'` ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-130 · 규칙 4·5 — 새 특수 키(다른 키 눌린 채) 재생, 뗌 → 이전 특수 키 · 종류: 자동 · 요구: R-22 · 설계: §5.2 ②③·ⓑ(갱신 전 `specialHeld` 기준), design.md §10.6 4·5행
- Given TC-129 종료(`['space']`·`heldCount 2`·`bounceSeq 1`·`kbFrame 2`)
- When `key(누름, 3, 'enter')` → `key(뗌, 2, 'enter')`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: Enter 누름 `['space','enter']`·`bounceSeq 2`·phase `0`·`currentSpecial 'enter'`·`kbFrame 0`. Enter 뗌 `['space']`·`bounceSeq 2`(뗌은 불변)·`currentSpecial 'space'`·`kbFrame 0` ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-131 · 규칙 6·7 — 마지막 특수 키 뗌 → 일반 누름, 모두 뗌 → 들림 · 종류: 자동 · 요구: R-22, R-07 · 설계: §5.2 ③, `bouncePhase`, design.md §10.6 6·7행
- Given TC-130 종료(`['space']`·`heldCount 2`)
- When `key(뗌, 1, 'space')` → `key(뗌, 0, null)`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 스페이스 뗌 `[]`·`kbDown true`·`heldCount 1`·`bounceSeq 2`·phase `0`·`currentSpecial null`. a 뗌 `[]`·`kbDown false`·`heldCount 0`·phase `null`·`bounceSeq 2` ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-132 · 규칙 8·조건 ⓐⓑ — 동시 참이어도 +1 한 번, 일반 키 첫 누름 +1 · 종류: 자동 · 요구: R-22, R-07, R-16 · 설계: §5.2 바운스 재생 카운터(ⓐ 또는 ⓑ, 동시 참 +1 한 번, 뗌 불변), design.md §10.6 8행, §10.3
- Given 초기 상태
- When `key(누름,1,'z')` → `key(뗌,0,'z')` → `key(누름,1,null)` → `key(누름,2,null)` → `key(뗌,1,null)` → `key(뗌,0,null)`
- Then ⓐ 화면: 해당 없음(`key_z` 미등록 화면은 TC-146) ⓑ 상태: Z 누름 `['z']`·`bounceSeq 1`·phase `1`. Z 뗌 `[]`·phase `null`·`bounceSeq 1`. 일반 키 첫 누름 `bounceSeq 2`(ⓐ)·phase `0`. `kbDown` 중 일반 키 누름 `2` 그대로. 뗌 두 번 뒤 `2` 그대로 ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-133 · 규칙 9 — 같은 특수 키 자동 반복 · 종류: 자동 · 요구: R-22 · 설계: §5.2 ②(빼고 맨 뒤 추가, 중복 없음)·ⓑ 불성립·`kbFrame` 순환, design.md §10.6 9행
- Given 초기 상태
- When 스페이스 누름(1) → 스페이스 누름 반복 3회(heldCount 1) → Enter 누름(2) → 스페이스 누름 반복(2)
- Then ⓐ 화면: 해당 없음(화면은 TC-147) ⓑ 상태: 반복마다 `['space']`·`bounceSeq 1`·phase `1`, 프레임 `[1,2,0,1]`. Enter 뒤 `['space','enter']`·`bounceSeq 2`. 스페이스 반복 뒤 `['enter','space']`·`bounceSeq 2`·`currentSpecial 'space'` ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-134 · 규칙 10 — `heldCount 0`이면 비움(뗌 누락 방어) · 종류: 자동 · 요구: R-22 · 설계: §5.2 ③④, design.md §10.6 10행
- Given 스페이스·Enter 누름 상태(`['space','enter']`·`heldCount 2`·`bounceSeq 2`)
- When 각각 독립으로 `key(뗌,1,'backspace')`(목록에 없는 특수 키 뗌) / `key(뗌,0,null)` / `key(뗌,0,'z')` / `key(뗌,-1,null)`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: backspace 뗌 → `['space','enter']` 그대로. `heldCount 0` 두 경우 → `[]`(첫 경우 `kbDown false`·phase `null`·`bounceSeq 2`·`heldCount 0`). `heldCount −1` → `[]`·`kbDown false` ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-135 · 규칙 11 — 일반 키 누른 채 특수 키 · 종류: 자동 · 요구: R-22 · 설계: §5.2 ⓑ, design.md §10.6 11행
- Given 초기 상태
- When `key(누름,1,null)`(a) → `key(누름,2,'space')`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: a 뒤 `[]`·`bounceSeq 1`·phase `1`. 스페이스 뒤 `['space']`·`bounceSeq 2`·phase `0` ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-136 · 규칙 12·13 — Ctrl+Z = undo, Ctrl+그 밖 = 일반 · 종류: 자동 · 요구: R-22 · 설계: §5.2 ①②·ⓑ, `SpecialKey` `undo`, design.md §10.6 12·13행
- Given 초기 상태
- When ① Ctrl `key(누름,1,null)` → Ctrl+Z `key(누름,2,'undo')` → Ctrl+C `key(누름,3,null)` ② (새 초기) Ctrl `key(누름,1,null)` → C `key(누름,2,null)`
- Then ⓐ 화면: 해당 없음(화면은 TC-146) ⓑ 상태: ① Ctrl 뒤 `bounceSeq 1`, undo 뒤 `['undo']`·`bounceSeq 2`·phase `0`·`currentSpecial 'undo'`, Ctrl+C 뒤 `['undo']`·`bounceSeq 2`·`heldCount 3` ② `[]`·`bounceSeq 1`·phase `1`·`heldCount 2`(C는 재생 없음) ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-137 · 다른 입력 불변·특수 키로 깨어남·목록 불변성 · 종류: 자동 · 요구: R-22, R-05 · 설계: §5.2 특수 키 추적(「`mouseMove`·`mouseButton`·`tick`은 바꾸지 않는다」·「새 목록은 매번 새 배열」)·바운스 카운터(마우스·tick 불변)·모든 입력 `rest`→`idle`, design.md §10.6 「유휴·마우스·상태 레이어는 특수 키와 무관, `wake`」
- Given ① 스페이스 누름 상태(`['space']`·`bounceSeq 1`) ② 스페이스 누름 상태 A ③ 초기에서 `tick(T0+300000)` → `rest`
- When ① `mouseMove(10,20)` → left 누름 → left 뗌 → `tick` ② A에 Enter 누름 → B ③ `key(누름,1,'enter', ts T0+300010)`
- Then ⓐ 화면: 해당 없음(화면은 TC-150) ⓑ 상태: ① `['space']`·`bounceSeq 1`·phase `1`·`kbDown true`·`heldCount 1` 그대로 ② A.`specialHeld`는 `['space']` 그대로(변이 없음), B.`specialHeld`는 A와 다른 배열이며 `['space','enter']` ③ `layer 'idle'`·`lastInputAt T0+300010`·`['enter']`·`bounceSeq 1`·phase `1` ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-138 · 입력 비보관 — 상태기계 · 종류: 자동 · 요구: R-22 · 설계: §5.2 기록 금지·`MachineState.specialHeld`(길이 ≤ 7, 분류값만)·`bounceSeq`(어떤 키였는지 담지 않음), design.md §10.6 입력 내용 비보관
- Given 초기 상태, `console.log/info/warn/error/debug` 감시, `Storage.prototype.setItem` 감시
- When 10개 이벤트(스페이스 누름 · Z 누름 · Z 뗌 · ? 누름 · ! 누름 · ! 뗌 · 백스페이스 누름 · undo 누름 · Enter 누름 · Enter 뗌) → `key(뗌,0,null)`
- Then ⓐ 화면: 해당 없음(화면은 TC-149) ⓑ 상태: 도중 상태의 키 집합 = 초기 상태 키 집합(이력·횟수·시각 필드 추가 없음), `specialHeld` = `['space','question','backspace','undo']`(지금 눌린 것만, 길이 ≤ 7). 모두 뗀 뒤 `specialHeld []`, `JSON.stringify(state)`에 7종 분류값 문자열(`"space"` 등) 없음 ⓒ bridge: 호출 없음. console 5종·`setItem` 호출 0회
- 스펙: 같음

#### 레이어·마우스 파츠·CSS — 특수 키 렌더

스펙: `src/overlay/test/specialKey.render.test.tsx`(TC-139~TC-142), `src/overlay/test/overlayStyles.test.ts`(TC-143). 매니페스트 = body·idle·rest·kb_up·kb_down 2장(0·1)·`key_space`·`key_enter`·`key_undo`(`key_z`·`key_question`·`key_exclamation`·`key_backspace` 없음). 상태는 `createInitialState(0)`에 값을 덮어쓴다.

### TC-139 · `SPECIAL_KEY_SLOT` — 분류값 → 슬롯 · 종류: 자동 · 요구: R-22 · 설계: design/functions.md §5.3 `SPECIAL_KEY_SLOT`, design.md §7 `AssetSlot` `key_*` 행(미확정 계약)
- Given 없음
- When 상수 조회
- Then ⓐ 화면: 해당 없음 ⓑ 상태: `{space:'key_space', z:'key_z', question:'key_question', exclamation:'key_exclamation', enter:'key_enter', backspace:'key_backspace', undo:'key_undo'}` ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/specialKey.render.test.tsx`

### TC-140 · `pickKeyboardEntry` — 그림 선택 ①~③ · 종류: 자동 · 요구: R-22, R-07 · 설계: §5.3 `pickKeyboardEntry`(예 포함), design.md §10.1 z3 행, §10.6 1~9·12행 키보드 파츠 결과
- Given 위 매니페스트
- When 상태별 호출
- Then ⓐ 화면: 해당 없음(반환 항목 url — 화면은 TC-141·TC-145·TC-146) ⓑ 반환 url: 들림 `[]` → `u:kb_up` / 들림인데 `['space']` → `u:kb_up` / 누름 `[]`·`kbFrame 1` → `u:kb_down_1` / 누름 `[]`·`kbFrame 2` → `u:kb_down_0`(프레임 없음 → `[0]`) / `['space']` → `u:key_space` / `['space','enter']` → `u:key_enter` / `['enter','space']` → `u:key_space` / `['undo']` → `u:key_undo` / `['z']`·`kbFrame 1` → `u:kb_down_1` / `['space','z']`·`kbFrame 1` → `u:kb_down_1`(가장 최근 z 그림이 없으면 이전 특수 키가 아니라 누름 프레임) / `['question']`·`['exclamation']`·`['backspace']`·`kbFrame 0` → `u:kb_down_0` / kb_up 없는 매니페스트·들림 → `undefined` / kb_down 없는 매니페스트: `['z']` → `undefined`, `['space']` → `u:key_space` ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-141 · `LayerStack` — 같은 키보드 img·짝 클래스 · 종류: 자동 · 요구: R-22, R-07 · 설계: §5.3 `LayerStack` 렌더(`kb = pickKeyboardEntry`, `bounce = bouncePhase(machine)`, 같은 `<img>` 유지, 상태 `Layer`에 bounce 없음), design/components.md `Layer` `bounce?: BouncePhase`, design.md §10.1 z3 행
- Given 위 매니페스트로 렌더(초기 상태)
- When 같은 컴포넌트에 차례로 rerender: `['space']`·`kbFrame 1`·`bounceSeq 1` → `['space','enter']`·`kbFrame 2`·`bounceSeq 2` → `['space']`·`bounceSeq 2` → `[]`·`kbFrame 2`·`bounceSeq 2` → 들림(`bounceSeq 2`)
- Then ⓐ 화면: img src `[u:body, u:idle, 키보드]`, 키보드 src·class = `u:kb_up`/`layer` → `u:key_space`/`layer bounceAlt` → `u:key_enter`/`layer bounce` → `u:key_space`/`layer bounce` → `u:kb_down_0`/`layer bounce` → `u:kb_up`/`layer`. 상태 img class 항상 `layer`, 키보드 img는 처음과 같은 DOM 요소, img 3개 유지 ⓑ 상태: 해당 없음(props만) ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-142 · `MouseArm` `bounce: BouncePhase` — 짝 클래스·같은 래퍼 · 종류: 자동 · 요구: R-22, R-16 · 설계: §5.4 바운스 래퍼 5·6, design.md §10.3 마우스 팔 바운스
- Given 파츠 900×700, 어깨 620,530, 영역 `AREA`, 모니터 1920×1080, 커서 (960,1080), 기준점 (520,530), `atRest false`, `bounce null`
- When rerender `bounce` = `1` → `0` → `1` → `null`
- Then ⓐ 화면: 래퍼 class `armWrap` → `armWrap bounceAlt` → `armWrap bounce` → `armWrap bounceAlt` → `armWrap`, 래퍼는 같은 DOM 요소·인라인 transform 없음, 안쪽 img transform 항상 `DOWN`(§0.2) ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-143 · `.bounceAlt` CSS · 종류: 자동 · 요구: R-22, R-07, R-16 · 설계: design.md §10.3 바운스 행(`bounceAlt` = `bounce`와 같은 단계·값, 120ms ease-out)·`.bounceAlt` 클래스
- Given `src/overlay/overlay.module.css` 원문(`fs.readFileSync`)
- When `.bounceAlt`·`.bounce` 블록과 `@keyframes bounceAlt`·`@keyframes bounce` 파싱
- Then ⓐ 화면(CSS 규칙): `.bounceAlt` animation = `bounceAlt 120ms ease-out`, `.bounce` = `bounce 120ms ease-out` 유지, `bounceAlt` 단계 `0·40·100` = `bounce`와 같은 값(40% `translateY(4px)`) ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/overlayStyles.test.ts`

#### 화면 — `OverlayApp` 특수 키 통합

스펙: `src/overlay/test/OverlayApp.special.test.tsx`. `SPECIAL_MANIFEST`·`SETTINGS`(mouse = `MOUSE`, partPos 0,0)·`MONITORS`·기준점 (520,530), 가짜 시계 T0. 「조회 4종」 = `getSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor`.

### TC-144 · 스페이스 누름 → 전용 그림+바운스, 뗌 → kb_up · 종류: 자동 · 요구: R-22, R-16 · 설계: §5.1 키보드 핸들러, P-2, §5.3 `LayerStack`, §5.4 바운스 래퍼 5, design.md §10.6 1·2행
- Given 조회 성공으로 마운트, 키 모두 뗌(들림)
- When `input://keyboard {pressed true, heldCount 1, special 'space'}` → `{pressed false, heldCount 0, special 'space'}`
- Then ⓐ 화면: 누름 → 키보드 img(같은 요소) `u:key_space`·class `layer bounceAlt`, 누름 프레임 img 없음, 팔 래퍼 `armWrap bounceAlt`, 대기 img `layer`. 뗌 → 같은 img `u:kb_up`·`layer`, 래퍼 `armWrap` ⓑ 상태: machine `specialHeld` `['space']` → `[]`(화면으로 관찰) ⓒ bridge: 조회 4종 각 1회(추가 0), `getScreenBounds` 0회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.special.test.tsx`

### TC-145 · 규칙 2~7 통합 — 이전 특수 키 복귀·짝 교대 · 종류: 자동 · 요구: R-22, R-16, R-07 · 설계: P-2, §5.3 `pickKeyboardEntry`·`LayerStack`, §5.4 바운스 래퍼 5·6, design.md §10.6 2~7행(5행 사용자 확인 🔒)
- Given TC-144와 같음(키 모두 뗌, `bounceSeq` 짝수·`kbFrame 0`)
- When 스페이스(1,`space`) → a(2,`null`) → Enter(3,`enter`) → Enter 뗌(2,`enter`) → 스페이스 뗌(1,`space`) → a 뗌(0,`null`)
- Then ⓐ 화면: 키보드 img(같은 요소) src / 키보드·래퍼 바운스 클래스 = `u:key_space`/`bounceAlt` → `u:key_space`/`bounceAlt` → `u:key_enter`/`bounce` → `u:key_space`/`bounce` → `u:kb_down_0`/`bounce` → `u:kb_up`/없음(`layer`·`armWrap`). 래퍼는 같은 요소 ⓑ 상태: 누름 3회로 `kbFrame 0`(`u:kb_down_0`) ⓒ bridge: `setSettings` 0회
- 스펙: 같음

### TC-146 · 규칙 8·12·13 통합 — 그림 없는 Z·Ctrl+Z·Ctrl+C · 종류: 자동 · 요구: R-22, R-07 · 설계: §5.3 `pickKeyboardEntry` ③, P-2, design.md §10.6 8·12·13행
- Given TC-144와 같음
- When Z(1,`z`) → Z 뗌(0,`z`) → Ctrl(1,`null`) → Ctrl+Z(2,`undo`) → Ctrl+C(3,`null`) → 모두 뗌(0,`null`)
- Then ⓐ 화면: `u:kb_down_1`/`layer bounceAlt`·`armWrap bounceAlt` → `u:kb_up`/`layer` → `u:kb_down_2`/`layer bounce` → `u:key_undo`/`layer bounceAlt`·`armWrap bounceAlt` → Ctrl+C에서 키보드 img의 class·src 속성 변경 0건(`u:key_undo`/`layer bounceAlt` 유지) → `u:kb_up`/`layer` ⓑ 상태: 해당 없음(화면으로 관찰) ⓒ bridge: `setSettings` 0회
- 스펙: 같음

### TC-147 · 규칙 9 통합 — 자동 반복은 재생 없음 · 종류: 자동 · 요구: R-22, R-16 · 설계: §5.2 ⓑ 불성립, §5.4 바운스 래퍼 6(값이 그대로면 재생 안 함), design.md §10.3·§10.6 9행
- Given TC-144와 같음
- When 스페이스(1) → 스페이스 반복 3회(1) → Enter(2) → 스페이스 반복(2)
- Then ⓐ 화면: 반복 3회 동안 키보드 img·래퍼 class 변경 0건, `u:key_space`/`layer bounceAlt`. Enter → `u:key_enter`/`layer bounce`. 스페이스 반복 → class 변경 0건, `u:key_space`/`layer bounce`, 래퍼 `armWrap bounce` ⓑ 상태: 해당 없음 ⓒ bridge: `setSettings` 0회
- 스펙: 같음

### TC-148 · bridge `special` 누락·undefined·7종 밖 값 → `null` · 종류: 자동 · 요구: R-22 · 설계: §5.1 키보드 핸들러(`isSpecialKey(p.special) ? p.special : null`, bridge 개정 전 필드 없음도 `null`), §5.2 `isSpecialKey`
- Given TC-144와 같음
- When `{pressed true, heldCount 1, ts}`(필드 없음) → `{…2, special 'bogus'}` → `{…3, special 'Space'}` → `{…4, special undefined}` → `{pressed false, heldCount 0, special 'bogus'}`
- Then ⓐ 화면: 첫 누름 `u:kb_down_1`/`layer bounceAlt`. 이후 3회 누름 동안 키보드 img·래퍼 class 변경 0건(재생 없음 — 걸러지지 않으면 ⓑ로 짝이 바뀐다), 끝 src `u:kb_down_1`(프레임 1→2→0→1), `img[src^="u:key_"]` 없음. 뗌 → `u:kb_up`/`layer` ⓑ 상태: 해당 없음 ⓒ bridge: 오류 없음, `setSettings` 0회
- 스펙: 같음

### TC-149 · 입력 내용 비보관 — 화면 통합 · 종류: 자동 · 요구: R-22 · 설계: §5.1 키보드 핸들러(보관·누적·`console`·bridge 전송 없음), design.md §10.6 입력 내용 비보관
- Given 마운트 완료 뒤 `console.log/info/warn/error/debug`·`Storage.prototype.setItem` 감시, `document.title` 기록
- When 특수 키 7종·일반 키를 섞은 11개 이벤트 → `key(뗌,0,null)`
- Then ⓐ 화면: `.root` textContent `''`, 모두 뗀 뒤 container.innerHTML에 `key_`·분류값 이름(`space`·`question`·`exclamation`·`enter`·`backspace`·`undo`) 없음, 키보드 `u:kb_up`/`layer`, `document.title` 불변 ⓑ 상태: `localStorage`·`sessionStorage` 길이 0, `setItem` 0회 ⓒ bridge: `setSettings` 0회, 조회 4종 각 1회(추가 0), `getScreenBounds` 0회. console 5종 0회
- 스펙: 같음

### TC-150 · 쉬는중에서 특수 키 → 깨어남·전용 그림, 팔은 쉬는 위치 · 종류: 자동 · 요구: R-22, R-05, R-15 · 설계: design.md §10.6 「특수 키를 누르면 `wake`」, §5.1 `armAtRest` 규칙(키 입력은 바꾸지 않음), P-3
- Given 마운트(T0), 입력 없음
- When `advanceTimersByTime(300000)` → Enter 누름(1,`enter`)
- Then ⓐ 화면: 먼저 `u:rest`(`layer`). 누름 뒤 `u:idle` 표시·`u:rest` 없음, 키보드 `u:key_enter`/`layer bounceAlt`, 래퍼 `armWrap bounceAlt`, 팔 transform `REST` ⓑ 상태: `layer idle`, `armAtRest true` 유지 ⓒ bridge: `setSettings` 0회
- 스펙: 같음

#### 수동 — `src/overlay/test/manual-checklist.md`

### TC-151 · 실제 키 분류·전용 그림·바운스·비보관 실측 · 종류: 수동(MC-17) · 요구: R-22, R-07, R-16 · 설계: design.md §10.6(분류·규칙표·뗌 이벤트 `special` = 누를 때 분류값·입력 내용 비보관), P-2
- Given 실제 앱(메모장 포커스, 오버레이 포커스 없음). 가능하면 `key_space`·`key_z`·`key_question`·`key_exclamation`·`key_enter`·`key_backspace`·`key_undo` 등록(등록 수단 없으면 그림 확인은 「보류」, 바운스·`kb_down` 폴백은 수행)
- When MC-17 절차 ①~⑦(한/영 ㅋ·z·Z, Shift+/·Shift+1(Shift 먼저 떼기), 키패드 Enter, Ctrl+Z·Ctrl+Enter·Ctrl+C, 규칙표 2~7 순서, 스페이스 길게, 앱 데이터·로그 확인)
- Then ⓐ 화면: MC-17 기대 ①~⑥(ㅋ·z·Z = `key_z`, ?·! 전용 그림 — Shift 먼저 떼도 유지, 키패드 Enter = `key_enter`, Ctrl+Z = `key_undo`, Ctrl+Enter·Ctrl+C = 일반 누름, 키보드·팔 동시 튐, 자동 반복 튐 1회) ⓑ 상태: `%APPDATA%\com.kuro.keyviewer\` 파일 목록·`settings.json` 내용 변화 없음 ⓒ core·bridge: `.dev-tauri.log`·오버레이 개발자 도구 콘솔에 분류값·입력 문자 출력 없음

### 추가 TC (v0.9 — CR-022: R-23 젤리 바운스 · 바운스 대상 = `.jellyWrap` 하나 · `.bounce`/`.bounceAlt` 폐기)

공통 전제 보충(§0.1·v0.8 보충에 더한다 — 서로 어긋나면 이 절이 우선)
- 기준: `src/overlay/requirements.md` v2.0 R-23(🔒 2026-09-24, §1 용어 주 「바운스 = R-23의 젤리 한 번」) · `src/overlay/design.md` §1 출력·§2 ASCII와 `.jellyWrap` 문단·§6 P-2·§10.3 젤리 행·폐기 행·CSS 블록·마우스 팔과의 합성 · `design/components.md` 컴포넌트 표(`Layer`·`MouseArm` `bounce` prop 삭제)·렌더 조건 `.jellyWrap` 행·배경 DOM 구조 1~5 · `design/functions.md` §5.1 `jellyClass`(export 없음)·§5.3 `LayerStack` 렌더(바운스 없음)·§5.4 `.armWrap` 컨테이너 2~6 · CR-022. 새 command·event 없음.
- **DOM 구조(CR-022)**: `.canvas` 자식 = `[배경 img(있을 때), div.jellyWrap]`. `.jellyWrap` 자식 = `[div.armWrap(마우스 파츠 있을 때), 몸통 img, 상태 img, 키보드 img]`(없는 슬롯은 빠진다). 기존 문구 「`.canvas` 자식 `[u:background, armWrap, u:body, u:idle, u:kb_up]`」류는 아래 개정표가 TC별로 대체한다.
- **키보드 파츠 img 로케이터**(v0.8 「`.canvas`의 마지막 자식」 대체) = `.jellyWrap`의 마지막 자식.
- **바운스 관찰 대상**: 바운스(젤리) 클래스는 `.jellyWrap` 한 요소에만 붙는다. `jellyClass(phase)`는 export가 없으므로 직접 호출하지 않고 렌더 결과 `.jellyWrap`의 `className`으로 검증한다 — phase `null` → `jellyWrap`, `0` → `jellyWrap jelly`, `1` → `jellyWrap jellyAlt`. v0.8 바운스 짝 규칙(마운트 뒤 모든 키가 떼진 상태의 첫 누름 = `bounceSeq 1` → phase 1)은 그대로다. 키보드 img class는 **항상 `layer`**, `.armWrap` class는 **항상 `armWrap`**.
- **CSS Modules mock 클래스**(`OverlayApp.test`·`OverlayApp.mouse.test`·`OverlayApp.special.test`·`OverlayApp.jelly.test`·`handPart.test`·`layers.test`·`MouseArm.test`·`specialKey.render.test`) = `root`·`canvas`·`layer`·`hand`·`armWrap`·`jellyWrap`·`jelly`·`jellyAlt` + **잔존 감시용** `bounce`·`bounceAlt`(소스가 옛 클래스를 쓰면 `.bounce`·`.bounceAlt` 선택자로 잡히게 남긴다 — 옛 `getScreenBounds` 감시와 같은 방식). 규칙 값 자체는 TC-080·TC-143·TC-158이 `?raw`로 단언.
- `MouseArm`·`LayerStack` 단위 스펙은 `bounce` prop을 넘기지 않는다(prop 삭제).
- §0.3 보충 — **CR-022 red**(design.md 변경이력 CR-022 「소스 미적용」): 실패 예상 = TC-152~TC-158, 개정 TC-031·TC-054·TC-064·TC-066·TC-067·TC-080·TC-100·TC-101·TC-110·TC-111·TC-141·TC-143~TC-148·TC-150(현 소스는 키보드 img·`.armWrap`에 `bounce`/`bounceAlt`를 붙이고 `.jellyWrap`이 없다고 설계 문서가 적고 있다 — 이 문서 작성 시 소스는 열어 보지 않았다). 타입: `bounce`를 넘기지 않는 `MouseArm` 단위 스펙은 `bounce`가 필수 prop인 동안 `yarn tsc --noEmit` 오류. `overlayStyles.test.ts`는 `?raw` import가 현재 환경 문제로 collect 실패 중이다(위임문 2026-09-24) — 기대값만 갱신했고, 환경이 고쳐지기 전까지 TC-078~TC-082·TC-112·TC-143·TC-158은 실행 증거를 낼 수 없다.

#### v0.9 개정표 — 기존 TC 기대값 변경(이 표가 해당 TC 본문과 v0.8 개정표의 같은 항목을 대체한다)

| TC | 스펙 | 개정 내용(CR-022) — 대체되는 Given/When/Then |
|---|---|---|
| TC-031 | `layers.test.tsx` | Then ⓐ 세 번째 img `u:kb_down_1` class **`layer`**(바운스 클래스 없음) → `u:kb_down_0` class `layer` ⓑ 해당 없음 ⓒ 호출 없음. 요구 R-07·R-23, 설계 design/functions.md §5.3 `LayerStack` 렌더(바운스 없음) |
| TC-043 | `MouseArm.test.tsx` | Given·When에서 `bounce` 삭제 — 마우스 파츠 없는 매니페스트로 렌더(button `none` / `left`). Then ⓐ 빈 출력(innerHTML `''`) ⓑ 해당 없음 ⓒ 호출 없음 |
| TC-044 | `MouseArm.test.tsx` | 제목 「`.armWrap` 컨테이너 — 애니메이션 클래스 없음·회전은 안쪽 img」. Given 커서 (960,1080)(`bounce` 없음). When 렌더. Then ⓐ 최상위 `div` class 정확히 **`armWrap`**, 자식 1개, `style` 속성 없음, 안쪽 img class `hand`·transform `DOWN` ⓑ 해당 없음 ⓒ 호출 없음. 요구 R-16·R-21·R-23, 설계 design/functions.md §5.4 `.armWrap` 컨테이너 2·3, design.md §10.3 마우스 팔과의 합성 |
| TC-045 | — | **폐기(CR-022)** · 이전 요구 R-16 — `bounce` prop 토글로 래퍼 노드 유지를 보던 TC. prop 삭제로 대상이 없다. 같은 노드 유지는 `.jellyWrap` 수준에서 TC-154·TC-155가 대신한다. 스펙에서 it 삭제 |
| TC-046 | `MouseArm.test.tsx` | 제목 「래퍼 클래스는 atRest·button·그림 크기와 무관하게 `armWrap`」. Given `bounce` 삭제. When ① `atRest true` ② `button right` ③ `SMALL`·partPos (389,492). Then ⓐ ① `armWrap` + 안쪽 `REST` ② `armWrap` + src `u:mouse_right` ③ `armWrap`, 자식 태그 `[img]`(svg 없음), img class `hand`·left 389px ⓑ 해당 없음 ⓒ 호출 없음 |
| TC-054 | `OverlayApp.test.tsx` | 제목 「P-2 키 입력 → 젤리 래퍼 한 번(키보드·팔·몸통 한 덩어리)」. Then ⓐ 누름 — 누름 프레임 img(`u:kb_down_n`) class **`layer`**, `u:kb_up` 없음, `.jellyWrap` class **`jellyWrap jellyAlt`**(마운트 뒤 첫 누름 = phase 1), `.armWrap` class **`armWrap`**, 상태 `u:idle` class `layer`, 팔 `REST` 유지 / 뗌 — `u:kb_up` class `layer`, `.jellyWrap` class `jellyWrap`(같은 노드), `.armWrap` `armWrap` ⓑ `kbDown` true → false, `armAtRest` 불변 ⓒ `setSettings` 0회, `getSettings` 1회. 요구 R-07·R-16·R-23, 설계 P-2·design/functions.md §5.1 `jellyClass` |
| TC-064 | `OverlayApp.mouse.test.tsx` | Then ⓐ ①② `.canvas` 자식 `[u:background, jellyWrap]`(2개), `.jellyWrap` 자식 `[armWrap, u:body, u:idle, u:kb_up]`, `.armWrap` 1개·`.jellyWrap` 1개, ② 래퍼 자식 태그 `[img]`·`svg` 없음 ⓑ 모드 판별 없음 ⓒ 해당 없음. 요구 R-19·R-18·R-17·R-23, 설계 §2 ASCII·`.jellyWrap` 둘째 자식 |
| TC-066 | `OverlayApp.mouse.test.tsx` | Then ⓐ `.canvas` 첫 자식 `jellyWrap`(배경 없음) → `u:background` → `u:background2` → `jellyWrap`(배경 img 없음, 손 그림 left 0·top 0·900×700) → 마지막 `.canvas` 자식 `[u:background, jellyWrap]`·`.jellyWrap` 자식 `[armWrap, u:body, u:idle, u:kb_up]`, 손 그림 left 0·top 0·202×154. 모든 단계에서 `.jellyWrap`은 같은 DOM 노드, 배경 img가 있을 때 `.jellyWrap` 조상 없음 ⓑ `manifest` 교체 ⓒ `getAssetManifest` 1회, `setSettings` 0회 |
| TC-067 | `OverlayApp.mouse.test.tsx` | Then ⓐ 매 단계 `.canvas` 첫 자식이 같은 배경 img 노드, src `u:background`, class `layer`, `style` 속성 없음, 부모 = `.canvas`, **`.armWrap`·`.jellyWrap` 조상 없음**. 6키 첫 누름 시점: 상태 img `u:idle` class `layer`, 누름 프레임 img class `layer`, `.armWrap` class `armWrap`, `.jellyWrap` class = 단독 실행 `jellyWrap jellyAlt`(마운트 뒤 첫 누름) / TC-FLOW-01 Step 5 `jellyWrap jelly`(Step 4 종료 `bounceSeq 7` → 8). 누름 유지 중 이동: 팔만 `DOWN` → `UP`, `.jellyWrap` class 불변, `u:idle`·누름 프레임 img class `layer` 유지. 키 뗌 뒤 `.jellyWrap` class `jellyWrap` ⓑ `machine`은 idle·rest로 바뀌어도 배경 무관 ⓒ 조회 각 1회, `setSettings` 0회. 요구 R-17·R-23 |
| TC-080 | `overlayStyles.test.ts` | 제목 「젤리 keyframe `jelly`·`.jelly`·옛 `.bounce` 부재」. When `.jelly`·`@keyframes jelly` 파싱(구간 경계 규칙은 기존과 같음), 옛 `.bounce`·`.bounceAlt`·`@keyframes bounce`·`@keyframes bounceAlt` 조회. Then ⓐ(규칙) `.jelly` 선언 = 정확히 `{animation: 'jelly 350ms ease-in-out'}`(fill-mode·반복 선언 없음 — 끝나면 원래 모양), 구간 키가 정확히 `[0, 15, 35, 55, 75, 100]`, 0% `scale(1, 1)`·15% `scale(1.06, 0.92)`·35% `scale(0.97, 1.04)`·55% `scale(1.02, 0.98)`·75% `scale(0.99, 1.01)`·100% `scale(1, 1)`(각 구간 선언은 `transform` 하나), keyframe에 `translate`·`rotate` 없음. 옛 블록 4개 모두 빈 본문, 주석 뺀 원문에 `bounce` 문자열 없음 ⓑ 해당 없음 ⓒ 해당 없음. 요구 R-23·R-07·R-16, 설계 §10.3 젤리 행·폐기 행·CSS 블록 |
| TC-090 | 수동(MC-08) | 제목 「전역 키 입력 반응 + 젤리(배경 뺀 전체)」. Then ⓐ 키마다 키보드 누름 이미지, 배경을 뺀 몸통·상태·키보드·팔이 **한 덩어리로** 같은 순간 출렁임(따로 튀는 부위 없음), 팔 각도 유지, 배경 정지 ⓑ 해당 없음 ⓒ core: 전역 훅 → `input://keyboard`. 요구 R-07·R-16·R-23 |
| TC-100 | `OverlayApp.test.tsx` | Given 키 1개 누름(`u:kb_down_1`, 키보드 img class `layer`, `.jellyWrap` class `jellyWrap jellyAlt`). When 두 번째 키 누름(heldCount 2) — **키보드 img와 `.jellyWrap`**의 `class` 속성을 MutationObserver로 감시. Then ⓐ 키보드 img 같은 노드·src `u:kb_down_2`·class `layer`, `.jellyWrap` 같은 노드·class `jellyWrap jellyAlt` 유지, 두 요소 class 변경 기록 0건(재생 없음) ⓑ `kbDown true`, `kbFrame` 1 → 2 ⓒ `setSettings` 0회. 요구 R-07·R-16·R-23 |
| TC-101 | `OverlayApp.mouse.test.tsx` | Then ⓐ `.canvas`가 처음 나타나고 `transform scale(0.5)`, `.canvas` 자식 `[jellyWrap]`(배경 없음), `.jellyWrap` 자식 `[armWrap, u:body, u:idle, u:kb_up]`·class `jellyWrap`, 팔 `REST` ⓑ `manifest` 교체 ⓒ `getAssetManifest` 1회, `setSettings` 0회 |
| TC-105 | `MouseArm.test.tsx` | 제목 「쉬는 위치 = partPos에 REST(작은 그림), 래퍼는 애니메이션 없음」. Given TC-103 조건 + `atRest true`, 커서 (1920,1080)(`bounce` 없음). When 렌더 → 같은 props로 재렌더. Then ⓐ 두 시점 모두 안쪽 img class `hand`·`REST`·left 389·top 492·202×154·원점 `231px 38px`, 래퍼 같은 노드·class `armWrap`·`style` 속성 없음·자식 1개 ⓑ 해당 없음 ⓒ 호출 없음. 요구 R-18·R-11·R-15(R-16 제외 — 팔 출렁임은 TC-156) |
| TC-110 | `handPart.test.tsx` | Then ⓐ `[u:idle, u:kb_up]` → `[u:idle, u:kb_down_1]`(키보드 class **`layer`**) → `[u:idle, u:kb_up]`(`layer`) / `[u:kb_up]` → `[u:kb_down_0]`(`layer`). 어느 단계에도 `u:body` 없음 ⓑ 해당 없음 ⓒ 호출 없음 |
| TC-111 | `handPart.test.tsx` | Then ⓐ `.canvas` 자식 `[jellyWrap]`, `.jellyWrap` 자식 `[armWrap, u:kb_up]`(kb_up class `layer`, `.jellyWrap` class `jellyWrap`) → `[armWrap, u:kb_down_0]`(class `layer`, `.jellyWrap` `jellyWrap jellyAlt`, `.armWrap` `armWrap`) → `[armWrap, u:kb_up]`(`layer`, `jellyWrap`). `u:body` 없음, `.armWrap` 1개, `textContent ''` ⓑ `kbDown` true → false, `config.kbFrames` 1 ⓒ 조회 추가 0회, `setSettings` 0회 |
| TC-141 | `specialKey.render.test.tsx` | 제목 「`LayerStack` — 같은 키보드 img·클래스 항상 `layer`」. Then ⓐ 키보드 src 순서 그대로(`u:kb_up` → `u:key_space` → `u:key_enter` → `u:key_space` → `u:kb_down_0` → `u:kb_up`), 모든 단계에서 몸통·상태·키보드 img class **`layer`**(`bounceSeq`·`kbDown`과 무관), 키보드 img 같은 DOM 요소, img 3개 ⓑ 해당 없음 ⓒ 호출 없음. 요구 R-22·R-07·R-23, 설계 design/functions.md §5.3 `LayerStack` 렌더(바운스 없음) |
| TC-142 | — | **폐기(CR-022)** · 이전 요구 R-22, R-16 — `MouseArm` `bounce: BouncePhase` prop 삭제. 짝 교대는 `.jellyWrap`에서 TC-154·TC-155, 래퍼 클래스 불변은 TC-046·TC-156이 대신한다. 스펙에서 it 삭제 |
| TC-143 | `overlayStyles.test.ts` | 제목 「`.jellyAlt` CSS」. Then ⓐ(규칙) `.jellyAlt` = 정확히 `{animation: 'jellyAlt 350ms ease-in-out'}`, `@keyframes jellyAlt` 구간·값이 `@keyframes jelly`와 같다(`[0,15,35,55,75,100]`, 15% `scale(1.06, 0.92)`) ⓑ 해당 없음 ⓒ 해당 없음. 요구 R-23·R-22·R-16 |
| TC-144 | `OverlayApp.special.test.tsx` | Then ⓐ 누름 → 키보드 img(같은 요소) `u:key_space`·class `layer`, 누름 프레임 img 없음, `.jellyWrap` `jellyWrap jellyAlt`, `.armWrap` `armWrap`, 대기 img `layer`. 뗌 → 같은 img `u:kb_up`·`layer`, `.jellyWrap` `jellyWrap` ⓑ `specialHeld` `['space']` → `[]`(화면으로 관찰) ⓒ 조회 4종 각 1회, `getScreenBounds` 0회, `setSettings` 0회 |
| TC-145 | 같음 | Then ⓐ 키보드 img(같은 요소) src / `.jellyWrap` class = `u:key_space`/`jellyWrap jellyAlt` → `u:key_space`/`jellyWrap jellyAlt` → `u:key_enter`/`jellyWrap jelly` → `u:key_space`/`jellyWrap jelly` → `u:kb_down_0`/`jellyWrap jelly` → `u:kb_up`/`jellyWrap`. 키보드 img class 항상 `layer`, `.armWrap` 항상 `armWrap`, `.jellyWrap` 같은 요소 ⓑ `kbFrame 0` ⓒ `setSettings` 0회 |
| TC-146 | 같음 | Then ⓐ(키보드 src / `.jellyWrap` class) `u:kb_down_1`/`jellyWrap jellyAlt` → `u:kb_up`/`jellyWrap` → `u:kb_down_2`/`jellyWrap jelly` → `u:key_undo`/`jellyWrap jellyAlt` → Ctrl+C에서 키보드 img의 class·src와 `.jellyWrap` class 변경 0건(`u:key_undo`/`jellyWrap jellyAlt` 유지) → `u:kb_up`/`jellyWrap`. 키보드 img class 항상 `layer` ⓑ 해당 없음 ⓒ `setSettings` 0회 |
| TC-147 | 같음 | Then ⓐ 반복 3회 동안 키보드 img·`.jellyWrap` class 변경 0건, `u:key_space`/`jellyWrap jellyAlt`. Enter → `u:key_enter`/`jellyWrap jelly`. 스페이스 반복 → class 변경 0건, `u:key_space`/`jellyWrap jelly`. 키보드 img class 항상 `layer` ⓑ 해당 없음 ⓒ `setSettings` 0회 |
| TC-148 | 같음 | Then ⓐ 첫 누름 `u:kb_down_1`·`jellyWrap jellyAlt`. 이후 3회 누름 동안 키보드 img·`.jellyWrap` class 변경 0건, 끝 src `u:kb_down_1`, `img[src^="u:key_"]` 없음. 뗌 → `u:kb_up`·`jellyWrap`. 키보드 img class 항상 `layer` ⓑ 해당 없음 ⓒ 오류 없음, `setSettings` 0회 |
| TC-149 | 같음 | 기대 불변. 키보드 img 로케이터만 `.jellyWrap` 마지막 자식 |
| TC-150 | 같음 | Then ⓐ 먼저 `u:rest`(`layer`). 누름 뒤 `u:idle`·`u:rest` 없음, 키보드 `u:key_enter`/`layer`, `.jellyWrap` `jellyWrap jellyAlt`, `.armWrap` `armWrap`, 팔 `REST` ⓑ `layer idle`, `armAtRest true` ⓒ `setSettings` 0회 |
| TC-FLOW-01 | TC-054·TC-067 | Steps에 TC-152(Step 2)·TC-159(Step 9) 추가, Step 4(TC-054)·Step 5(TC-067) 종료 상태를 `.jellyWrap` 기준으로 — 아래 TC-FLOW-01 표가 v0.8 개정표 행을 대체 |
| TC-FLOW-06 Step 6 | TC-111 | 앞 Step에 키 누름이 없어 첫 누름 phase 1 → `.jellyWrap` `jellyWrap jellyAlt`(v0.8의 `bounceAlt` 문구 대체) |
| TC-FLOW-07 | TC-144~TC-148 | Step·짝·프레임 계산 불변. 바운스 관찰 대상만 `.jellyWrap`(위 개정 행) |

TC-028(「모두 class `layer`(bounce 없음)」)·TC-081(`.armWrap` animation·transform 없음)·TC-079(`.canvas` animation 없음)·TC-112(`.hand` animation 없음)는 CR-022 뒤에도 기대가 그대로 성립한다(설계 근거만 「바운스 래퍼」 → 「`.armWrap` 컨테이너」·「젤리는 `.jellyWrap`」으로 읽는다).

#### 젤리 래퍼 — `OverlayApp` 통합

스펙: `src/overlay/test/OverlayApp.jelly.test.tsx`(신규, TC-152~TC-157). 픽스처 = `OverlayApp.special.test.tsx`와 같은 `SPECIAL_MANIFEST`(배경·몸통·대기·쉬는중·kb_up·kb_down 3장·마우스 파츠 900×700·`key_space`·`key_enter`·`key_undo`)·`SETTINGS`(mouse = `MOUSE` — 영역 `AREA`, partPos 0,0)·`MONITORS`·기준점 (520,530), 가짜 시계 T0. 「조회 4종」 = `getSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor`. 변형 기대값 이름은 §0.2.

### TC-152 · `.jellyWrap` 위치·자식 순서 · 종류: 자동 · 요구: R-23, R-16, R-17, R-19 · 설계: design.md §1 출력·§2 ASCII·`.jellyWrap` 둘째 자식 문단, design/components.md 렌더 조건 `.jellyWrap`·`MouseArm`·`LayerStack` 행·배경 DOM 구조 1·5, design/functions.md §5.1 `jellyClass`(JSX 위치)
- Given 조회 성공으로 마운트(T0), 입력 없음
- When DOM 검사
- Then ⓐ 화면: `.canvas` 자식이 정확히 2개 `[img u:background, div.jellyWrap]`, `.jellyWrap`은 문서 전체에 1개·class 정확히 `jellyWrap`(phase `null`)·`style` 속성 없음. `.jellyWrap` 자식 = `[div.armWrap, img u:body, img u:idle, img u:kb_up]`(이 순서), 키보드 img = `.jellyWrap` 마지막 자식 ⓑ 상태: `machine.kbDown false` → `bouncePhase null`(화면으로 관찰) ⓒ bridge: 조회 4종 각 1회, `getScreenBounds` 0회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.jelly.test.tsx`

### TC-153 · `.jellyWrap`은 조건 없이 늘 렌더(마우스 파츠·배경 없음), 캔버스 없으면 없음 · 종류: 자동 · 요구: R-23, R-19, R-17 · 설계: design/components.md 렌더 조건 `.jellyWrap` 행(「항상(`.canvas` 안, 조건 없음)」)·`.canvas` 행, design/functions.md §5.1 `jellyClass`(「이 `<div>`는 조건 없이 늘 렌더」)
- Given ① 설정 `mouse = null` ② 배경 없는 매니페스트(`SPECIAL_MANIFEST`에서 `background` 항목만 뺌) ③ `{canvas:null, entries:[]}`
- When 각각 마운트 → ①② 일반 키 누름(1)
- Then ⓐ 화면: ① `.canvas` 자식 `[u:background, jellyWrap]`, `.jellyWrap` 자식 `[u:body, u:idle, u:kb_up]`(`.armWrap` 없음), 누름 뒤 `.jellyWrap` class `jellyWrap jellyAlt` ② `.canvas` 자식 `[jellyWrap]` 1개, `.jellyWrap` 자식 `[armWrap, u:body, u:idle, u:kb_up]`, 누름 뒤 `jellyWrap jellyAlt` ③ `.canvas`·`.jellyWrap` 0개(`.root`만) ⓑ 상태: ① `settings.mouse null` ② `manifest`에 배경 없음 ③ `manifest.canvas null` ⓒ bridge: 각 마운트마다 조회 4종 각 1회, `setSettings` 0회
- 스펙: 같음

### TC-154 · 클래스 교대·같은 노드 — 일반 키 · 종류: 자동 · 요구: R-23, R-07, R-16 · 설계: design/functions.md §5.1 `jellyClass`(`null` → `jellyWrap`, `0` → `jellyWrap jelly`, `1` → `jellyWrap jellyAlt`), design.md §10.3 트리거·재생 조건(「누름이 유지된 채 일반 키 추가 누름은 재생 안 함」, 「`.jellyWrap`은 늘 같은 DOM 요소」), P-2
- Given 마운트, 키 모두 뗌(`bounceSeq 0`, `kbFrame 0`)
- When 일반 키(`special null`) 누름(1) → 뗌(0) → 누름(1) → 누름(2) → 뗌(1) → 뗌(0). 3번째 이벤트 뒤 `.jellyWrap`의 `class` 속성 MutationObserver 감시 시작, 5번째 이벤트 뒤 기록 확인
- Then ⓐ 화면: `.jellyWrap`은 마운트 때와 같은 DOM 노드. class = `jellyWrap jellyAlt` → `jellyWrap` → `jellyWrap jelly` → `jellyWrap jelly` → `jellyWrap jelly` → `jellyWrap`. 4·5번째 이벤트의 class 변경 기록 0건(재생 없음). 키보드 img src `u:kb_down_1` → `u:kb_up` → `u:kb_down_2` → `u:kb_down_0` → `u:kb_down_0` → `u:kb_up`, class 항상 `layer` ⓑ 상태: `bounceSeq` 1 → 1 → 2 → 2 → 2 → 2(짝홀이 class로 보임), 끝 `kbDown false` ⓒ bridge: `setSettings` 0회, 조회 추가 0회
- 스펙: 같음

### TC-155 · 특수 키 새 누름마다 교대(다른 키 누른 채)·자동 반복·뗌은 불변 · 종류: 자동 · 요구: R-23, R-22, R-16 · 설계: design.md §10.3 트리거(「특수 키 새 누름(다른 키 누른 채여도)」)·특수 키 문단, design/functions.md §5.1 `jellyClass`·§5.2 `bounceSeq` ⓑ
- Given 마운트, 키 모두 뗌
- When a `(true,1,null)` → 스페이스 `(true,2,'space')` → Enter `(true,3,'enter')` → Enter 자동 반복 `(true,3,'enter')` → Enter 뗌 `(false,2,'enter')` → 모두 뗌 `(false,0,null)`. Enter 누름 뒤부터 Enter 뗌 뒤까지 `.jellyWrap` class 속성 감시
- Then ⓐ 화면: `.jellyWrap`(같은 노드) class = `jellyWrap jellyAlt` → `jellyWrap jelly` → `jellyWrap jellyAlt` → (반복) 변경 0건 → (Enter 뗌) 변경 0건·`jellyWrap jellyAlt` → `jellyWrap`. 키보드 img src = `u:kb_down_1` → `u:key_space` → `u:key_enter` → `u:key_enter` → `u:key_space` → `u:kb_up`, class 항상 `layer`, `.armWrap` 항상 `armWrap` ⓑ 상태: `bounceSeq` 1 → 2 → 3 → 3 → 3 → 3 ⓒ bridge: `setSettings` 0회
- 스펙: 같음

### TC-156 · 내부 요소에 애니메이션 클래스 없음(이중 적용 금지)·팔 변형 유지 · 종류: 자동 · 요구: R-23, R-16, R-21 · 설계: design/components.md 배경 DOM 구조 2·5(이중 적용 금지·`.jellyWrap` 한 개)·컴포넌트 표 `LayerStack`·`Layer`·`MouseArm`(바운스 값 받지 않음), design/functions.md §5.4 `.armWrap` 컨테이너 2·3·5, design.md §10.3 폐기 행·마우스 팔과의 합성
- Given 마운트 → 마우스 이동 (960,1080)(팔 `DOWN`, `armAtRest false`)
- When 일반 키 누름(1) [검사 A] → 뗌(0) → 누름(1) [검사 B]
- Then ⓐ 화면: A·B 모두 — `.jelly, .jellyAlt` 선택 결과가 정확히 1개이고 그 요소가 `.jellyWrap`(A `jellyWrap jellyAlt`, B `jellyWrap jelly`), `.bounce, .bounceAlt` 0개, `.armWrap` class `armWrap`, `.jellyWrap` 안 모든 img class ∈ {`layer`, `hand`}, `.canvas` class `canvas`, `.root` class `root`, 손 그림 img `style.transform` = `DOWN`·`transformOrigin` `620px 530px`(누름 전과 같음 — 젤리가 팔 변형을 덮어쓰지 않음) ⓑ 상태: `armAtRest false` 유지 ⓒ bridge: `setSettings` 0회
- 스펙: 같음

### TC-157 · 배경 img는 래퍼 밖(키 누름에도 부모·속성 불변) · 종류: 자동 · 요구: R-17, R-23 · 설계: design/components.md 배경 DOM 구조 1~3(배경 = `.jellyWrap`의 형제·`.canvas` 직계 첫 자식·애니메이션 클래스·인라인 transform 없음), design.md §2 `[bg]`·`.jellyWrap` 문단, §10.3(배경은 젤리 대상 아님), requirements §1 용어 주(R-17 배경은 R-23 대상 아님)
- Given 마운트(배경 포함 `SPECIAL_MANIFEST`)
- When 스페이스 누름(1,`space`) → 뗌(0,`space`) → 일반 누름(1) → 누름 유지 중 이동 (960,0) → 뗌(0). 각 이벤트 뒤 검사
- Then ⓐ 화면: 매 단계 배경 img(`img[src="u:background"]`)가 마운트 때와 같은 노드, `parentElement` = `.canvas`, `closest('.jellyWrap')` null, `.jellyWrap.contains(배경)` false, class `layer`, `style` 속성 없음, `.canvas` 첫 자식 = 배경·둘째 자식 = `.jellyWrap`. 같은 순간 `.jellyWrap` class는 `jellyWrap jellyAlt` → `jellyWrap` → `jellyWrap jelly` → `jellyWrap jelly` → `jellyWrap`(래퍼만 바뀜) ⓑ 상태: `manifest` 불변 ⓒ bridge: `getAssetManifest` 1회, `setSettings` 0회
- 스펙: 같음

#### CSS — `.jellyWrap` 규칙

### TC-158 · `.jellyWrap` CSS — 캔버스와 같은 상자·기준점 아래 가운데·자체 애니메이션 없음 · 종류: 자동 · 요구: R-23, R-17 · 설계: design.md §10.3 CSS 블록 `.jellyWrap`·「기준점 `transform-origin: 50% 100%`(= 캔버스 아래 가운데)」, §2(「캔버스와 같은 크기·원점」), P-7(`pointer-events: none` — 드래그·휠은 `.root`)
- Given `src/overlay/overlay.module.css` 원문(`fs.readFileSync`)
- When `.jellyWrap` 블록 파싱
- Then ⓐ 화면(규칙): position `absolute`·left `0`·top `0`·width `100%`·height `100%`·pointer-events `none`·transform-origin `50% 100%`, `animation`·`transform` 선언 없음(애니메이션은 `.jelly`/`.jellyAlt` 클래스로만 붙는다) ⓑ 상태: 해당 없음 ⓒ bridge: 해당 없음
- 스펙: `src/overlay/test/overlayStyles.test.ts`

#### 수동 — `src/overlay/test/manual-checklist.md`

### TC-159 · 젤리 체감 — 탱글탱글·한 덩어리·배경 정지·가장자리 잘림 수용 · 종류: 수동(MC-18) · 요구: R-23, R-16, R-17, R-07 · 설계: design.md §10.3 젤리 행·값의 뜻(세기 보통 🔒)·마우스 팔과의 합성·재생 조건·「잘림(수용)」 문단
- Given 실제 앱, 배경·몸통·상태·키보드·마우스 파츠 등록, 메모장 포커스(오버레이 포커스 없음)
- When MC-18 절차 ①~⑦
- Then ⓐ 화면: 키 한 번에 배경을 뺀 전체가 아래 가운데를 바닥 삼아 납작 → 솟음 → 작게 2~3회 흔들린 뒤 약 0.35초 안에 원래 모양으로 멈춤(세기 보통 — 찌그러짐이 눈에 띄되 과하지 않음), 팔도 몸과 함께 출렁이고 각도는 유지, 배경은 전혀 움직이지 않음, 누른 채 일반 키 추가는 새 출렁임 없음, 특수 키 새 누름은 처음부터 다시 출렁임. 그림 가장자리까지 캐릭터를 그린 경우 젤리 동안(0.35초 이내)에만 좌우 각 약 3%·위쪽 약 4%가 창 가장자리에서 잘리고, 멈추면 잘림 없음(창 크기·여백 불변) ⓑ 상태: `%APPDATA%\com.kuro.keyviewer\settings.json` 변화 없음 ⓒ core: 전역 훅 → `input://keyboard`(새 command·event 없음), 창 크기 변화 없음(core window 식 불변)
- 비고(v0.9 정정): 가장자리 잘림은 design.md §10.3 「잘림(수용)」 문단(가로 최대 +6%·세로 최대 +4%, 0.35초 이내, 창 크기·여백 불변 — CR-012)에 근거한 **판정 항목**이다(MC-18 ⑥). 판정 기준 = 잘림이 젤리 재생 동안에만 보이고 멈춘 뒤 남지 않으며 창 크기가 바뀌지 않으면 PASS

### 추가 TC (v1.0 — CR-023: R-24 키 꾹 누름 = 부르르 · `.jellyWrap`의 `.shiver` · 반복 누름은 젤리·프레임·특수 키 목록을 바꾸지 않음)

공통 전제 보충(§0.1·v0.8·v0.9 보충에 더한다 — 서로 어긋나면 이 절이 우선)
- 키보드 이벤트 픽스처 = `{ pressed, heldCount, special, repeat?, ts }`. **반복 누름** = `repeat === true && pressed === true`(design/functions.md §5.2). `repeat`를 넣지 않은 픽스처(기존 스펙 전부 — TC-133·TC-147·TC-155의 「자동 반복」 포함)는 필드 없음 = `false` = 옛 규칙(design.md §10.6 9행 「`repeat` 필드가 없는 이벤트」)이므로 **기대 불변**.
- 부르르 관찰 대상 = `.jellyWrap` 한 요소의 `className`. `jellyClass`(export 없음)는 직접 부르지 않는다: `wrapMotion` `null` → `jellyWrap`, `0` → `jellyWrap jelly`, `1` → `jellyWrap jellyAlt`, `'shiver'` → `jellyWrap shiver`. CSS Modules mock 클래스(`OverlayApp.shiver.test`)에 `shiver`를 더한다. 다른 OverlayApp 스펙은 `repeat: true`를 보내지 않으므로 `wrapMotion`이 `'shiver'`를 내지 않아 mock 목록 변경이 필요 없다.
- 시계: 상태기계 = `ts`·`now` 주입(T0 = 1000000). 화면 = §0.1 가짜 시계, tick 위상 = 마운트 T0 기준(T0+100·T0+200…). 반복 이벤트 `ts` = 발생 시점 가짜 `Date.now()`.
- 입력 내용 비보관(R-22)은 CR-023 필드에도 적용된다(`repeating`·`lastRepeatAt`·`shiverSeq`에 키 정보 없음 — TC-168).
- §0.3 보충 — **CR-023 red**(CR 대장 「설계 완료·소스 미적용 — bridge `repeat` 계약 선행」): 실패 예상 = TC-160~TC-174 전부, 개정 TC-001. 새 export(`wrapMotion`·`isRepeating`·`REPEAT_TIMEOUT_MS`·`WrapMotion`)가 없으면 `inputMachine.repeat.test.ts`는 import 값 `undefined`로 실패하고, `MachineInput`의 `repeat` 필드는 `yarn tsc --noEmit` 타입 오류(과잉 속성)다. `OverlayApp.shiver.test.tsx`는 페이로드가 `unknown`이라 타입 오류 없이 실행에서 실패(`.shiver` 없음). `overlayStyles.test.ts`(TC-174)는 `?raw` collect 환경 이슈로 실행 증거를 낼 수 없다 — 기대값만. 이 문서 작성 시 소스는 열어 보지 않았다.

#### v1.0 개정표 — 기존 TC 기대값 변경(이 표가 해당 TC 본문과 앞 개정표의 같은 항목을 대체한다)

| TC | 스펙 | 개정 내용(CR-023) |
|---|---|---|
| TC-001 | `inputMachine.transitions.test.ts` | Then ⓑ 초기 상태 객체(`toEqual`)에 `repeating: false`·`lastRepeatAt: 0`·`shiverSeq: -1` 추가(그 밖 불변 — `specialHeld []`·`bounceSeq 0` 포함). 요구에 R-24, 설계에 design.md §4 `machine` 초기값(CR-023) 추가 |
| TC-151 | 수동(MC-17) | Then ⓐ ⑥ 「튐은 처음 1회뿐, 스페이스 그림 유지」 → 「처음 1회 젤리, OS 반복이 시작되면 떼기 전까지 부르르(R-24), 스페이스 그림 유지, 떼면 즉시 정지」. 요구에 R-24 추가 |
| TC-159 | 수동(MC-18) | Then ⓐ ③ 비고 추가: 키를 OS 재입력 시간(약 0.25~1초)보다 오래 누르고 있으면 부르르(R-24)가 보이는 것은 정상 — ③의 판정 대상은 「누른 채 일반 키 추가에 새 젤리 출렁임이 없음」과 「누른 채 스페이스 새 누름에 젤리 재출렁」뿐이다(부르르 판정은 TC-175·MC-19) |
| TC-133·TC-147·TC-155 | 각 스펙 | 기대 불변. 「자동 반복」 픽스처에 `repeat` 필드가 없어 옛 규칙(맨 뒤로 이동·프레임 순환·재생 없음)을 확인하는 **bridge 개정 전 호환** TC로 읽는다. `repeat: true` 반복은 TC-161·TC-170이 본다 |
| TC-138 | `inputMachine.special.test.ts` | 기대 불변(「도중 상태의 키 집합 = 초기 상태 키 집합」은 CR-023 필드 3개가 초기에도 있으므로 계속 성립) |

#### 상태기계 — `src/state/inputMachine.ts` (design/functions.md §5.2 CR-023 행)

스펙: `src/overlay/test/inputMachine.repeat.test.ts`. 설정 주입 `{ idleMs: 300000, kbFrames: 3 }`, T0 = 1000000. **상태 A** = 초기에서 Z 누름 `key(true,1,'z', T0+10)` → `['z']`·`bounceSeq 1`·`kbFrame 1`·`repeating false`. **상태 B** = A에서 Z 반복 누름 `key(true,1,'z', repeat true, T0+510)`.

### TC-160 · 초기값·`REPEAT_TIMEOUT_MS`·`isRepeating` · 종류: 자동 · 요구: R-24 · 설계: design.md §4 `machine` 초기값·상수표 `REPEAT_TIMEOUT_MS`, design/functions.md §5.2 `MachineState.repeating`·`lastRepeatAt`·`shiverSeq`·`isRepeating`
- Given `createInitialState(T0)`
- When 초기 상태의 새 필드·상수 조회, `isRepeating`에 초기 상태와 `{repeating, kbDown}` = (true,true)·(true,false)·(false,true)만 바꾼 상태
- Then ⓐ 화면: 해당 없음(순수 함수 — 화면은 TC-169) ⓑ 상태: `repeating false`·`lastRepeatAt 0`·`shiverSeq -1`, `REPEAT_TIMEOUT_MS = 500`, `isRepeating` 초기 `false`·(true,true) `true`·(true,false) `false`·(false,true) `false`, 초기 `wrapMotion null` ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/inputMachine.repeat.test.ts`

### TC-161 · 반복 누름 — 바뀌는 필드와 불변 필드 · 종류: 자동 · 요구: R-24, R-07, R-22, R-05 · 설계: design/functions.md §5.2 자동 반복 행(`kbFrame`·`specialHeld`(② 미적용·④ 적용)·`bounceSeq` 불변, `repeating = max(0, heldCount) > 0`, `lastRepeatAt = ts`, `shiverSeq = bounceSeq`, 공통 규칙)·바운스 재생 카운터(반복 누름은 판정 안 함), design.md §10.6 9행(CR-023)·`kbFrame` 문단, §10.3 부르르 규칙 1·2
- Given 상태 A / 스페이스(1)·Enter(2) 누름 상태 `['space','enter']`·`bounceSeq 2`·`kbFrame 2` / A에서 `tick(T0+300010)` → `rest`
- When ① A에 반복(ts T0+510) → B ② B에 반복(T0+543) ③ 두 키 상태에 스페이스 반복(heldCount 2, T0+520) ④ `rest` 상태에 Z 반복(T0+300020) ⑤ A에 `heldCount 0` 반복(T0+510)
- Then ⓐ 화면: 해당 없음(화면은 TC-169·TC-170) ⓑ 상태: ① B = A와 같고 `repeating true`·`lastRepeatAt T0+510`·`shiverSeq 1`·`lastInputAt T0+510`만 다름(`bounceSeq 1`·`kbFrame 1`·`['z']`·`heldCount 1` 불변), `isRepeating true`, `wrapMotion 'shiver'` ② B와 같고 `lastRepeatAt`·`lastInputAt`만 T0+543 ③ `['space','enter']` 순서 그대로(맨 뒤로 옮기지 않음)·`currentSpecial 'enter'`·`bounceSeq 2`·`kbFrame 2`·`shiverSeq 2`·`repeating true` ④ `layer 'idle'`·`lastInputAt T0+300020`·`repeating true` ⑤ `repeating false`·`kbDown false`·`specialHeld []`·`bounceSeq 1`·`kbFrame 1` ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-162 · 반복 아닌 `key` → `repeating false` · 종류: 자동 · 요구: R-24, R-22, R-07 · 설계: design/functions.md §5.2 자동 반복 행(「반복 누름이 아닌 모든 `key` → 기존 규칙 + `repeating = false`, `lastRepeatAt`·`shiverSeq` 그대로」, `pressed false` + `repeat true`는 반복 아님, `repeat?` 없으면 false), `wrapMotion` ③
- Given 상태 B(`repeating true`·`lastRepeatAt T0+510`·`shiverSeq 1`)
- When B에 각각 독립으로(ts T0+600) ① Z 뗌 `(false,0,'z')` ② 일반 키 새 누름 `(true,2,null)` ③ `(false,0,'z', repeat true)` ④ 스페이스 새 누름 `(true,2,'space')` ⑤ Z 누름 `repeat` 필드 없음 `(true,1,'z')` ⑥ Z 누름 `repeat false`
- Then ⓐ 화면: 해당 없음(화면은 TC-171) ⓑ 상태: 여섯 경우 모두 `repeating false`·`lastRepeatAt T0+510`·`shiverSeq 1`·`lastInputAt T0+600`·`isRepeating false`. ① `kbDown false`·`[]`·`bounceSeq 1`·`wrapMotion null` ② `heldCount 2`·`['z']`·`bounceSeq 1`·`kbFrame 2`·`wrapMotion null` ③ ①과 같음 ④ `['z','space']`·`bounceSeq 2`·`kbFrame 2`·`wrapMotion 0` ⑤⑥ 옛 규칙 — `['z']`·`bounceSeq 1`·`kbFrame 2`(순환)·`wrapMotion null` ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-163 · 마우스 입력은 `repeating` 불변, 방어는 `lastRepeatAt` 기준 · 종류: 자동 · 요구: R-24 · 설계: design/functions.md §5.2 자동 반복 행(「`mouseMove`·`mouseButton`은 `repeating`을 바꾸지 않는다」)·`MachineState.lastRepeatAt`(「`lastInputAt`과 따로 둔다」)·tick 행
- Given 상태 B
- When `mouseMove(10,20, T0+600)` → left 누름(T0+650) → left 뗌(T0+700) → `tick(T0+1010)`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 마우스 3건 뒤 `repeating true`·`lastRepeatAt T0+510`·`shiverSeq 1`·`lastInputAt T0+700`·`wrapMotion 'shiver'`. tick(마지막 반복 뒤 500ms, 마지막 입력 뒤 310ms) 뒤 `repeating false`·`lastInputAt T0+700`·`wrapMotion null` ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-164 · tick 반복 끊김 방어 — 499/500 경계·같은 참조 · 종류: 자동 · 요구: R-24 · 설계: design/functions.md §5.2 tick 행(`repeating && now − lastRepeatAt ≥ 500` → `false`, 바뀐 것 없으면 같은 참조), design.md §6 P-3
- Given 상태 B / 상태 A
- When B에 `tick(T0+1009)`(499ms) / B에 `tick(T0+1010)`(500ms) → S2, S2에 `tick(T0+1110)` / A에 `tick(T0+510)`
- Then ⓐ 화면: 해당 없음(화면은 TC-173) ⓑ 상태: 499ms → B와 같은 참조. 500ms → 새 객체 S2 = B에서 `repeating`만 `false`(`lastRepeatAt`·`shiverSeq`·`kbDown true`·`['z']`·`bounceSeq 1` 불변), `isRepeating false`, `bouncePhase 1`·`wrapMotion null`. S2 뒤 tick → S2와 같은 참조. 반복 중 아닌 A → A와 같은 참조 ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-165 · `wrapMotion` ①~④ — 설계 예 5개·우선순위 · 종류: 자동 · 요구: R-24, R-23, R-16 · 설계: design/functions.md §5.2 `wrapMotion`·`WrapMotion`, design.md §10.3 부르르 행 「우선순위: `.shiver`가 `.jelly`/`.jellyAlt`보다 우선」
- Given `createInitialState(T0)`에 `kbDown`·`heldCount`·`bounceSeq`·`shiverSeq`·`repeating`만 덮어쓴 상태
- When 설계 예 ⓐ 첫 누름 (true, bs 1, ss −1, rep false) ⓑ 반복 시작 (true, 1, 1, true) ⓒ 반복 키 누른 채 일반 키 새 누름 (true, 1, 1, false) ⓓ 반복 중 특수 키 새 누름 (true, 2, 1, false) ⓔ 모두 뗌 (false, 2, 1, false), 추가 ⓕ (true, 2, 1, true) ⓖ (false, 2, 1, true) ⓗ (true, 3 / 4, 1, false)
- Then ⓐ 화면: 해당 없음 ⓑ 반환: ⓐ `1` ⓑ `'shiver'` ⓒ `null` ⓓ `0` ⓔ `null` ⓕ `'shiver'`(① 우선 — `bounceSeq ≠ shiverSeq`여도) ⓖ `null`(`isRepeating` 거짓 → ②) ⓗ `bouncePhase`와 같음(`1` / `0`) ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-166 · 반복 중 특수 키 새 누름 → 젤리, 그 키 반복 → 부르르, 그 키 뗌 → 정지, 남은 키 반복 → 재시작 · 종류: 자동 · 요구: R-24, R-22, R-23 · 설계: design.md §10.3 부르르 규칙 3·4, design/functions.md §5.2 자동 반복 행·바운스 재생 카운터 ⓑ·`wrapMotion`
- Given 초기 상태
- When a `(true,1,null)` → a 반복 → 스페이스 `(true,2,'space')` → 스페이스 반복 `(2)` → 스페이스 뗌 `(false,1,'space')` → a 반복 `(1)` → a 뗌 `(false,0,null)`
- Then ⓐ 화면: 해당 없음(화면은 TC-170·TC-172) ⓑ 상태(`wrapMotion` / 주요 필드): `1`(`bounceSeq 1`·`kbFrame 1`·`shiverSeq −1`) → `'shiver'`(`kbFrame 1`·`shiverSeq 1`) → `0`(`bounceSeq 2`·`kbFrame 2`·`repeating false`·`['space']`) → `'shiver'`(`shiverSeq 2`·`kbFrame 2`·`['space']`) → `null`(`kbDown true`·`heldCount 1`·`[]`·`repeating false`) → `'shiver'`(`bounceSeq 2`·`shiverSeq 2`) → `null`(`kbDown false`) ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-167 · `shiverSeq` — 같은 번호 젤리 재재생 방지, 모두 뗀 뒤 첫 누름은 새 젤리 · 종류: 자동 · 요구: R-24, R-23 · 설계: design/functions.md §5.2 `wrapMotion` ③·`MachineState.shiverSeq`, design.md §10.3 부르르 규칙 2
- Given 상태 B(`bounceSeq 1`·`shiverSeq 1`)
- When ① B에 `tick(T0+1010)` ② B에 일반 키 새 누름 `(true,2,null)` → 그 키 뗌 `(false,1,null)` → Z 뗌 `(false,0,'z')` → 일반 키 첫 누름 `(true,1,null)`
- Then ⓐ 화면: 해당 없음(화면은 TC-173) ⓑ 상태: ① `bouncePhase 1`이지만 `wrapMotion null`(젤리가 튀어나오지 않음) ② 새 누름 `bounceSeq 1`·`bouncePhase 1`·`wrapMotion null`, 뗌 `null`, 모두 뗌 `null`, 첫 누름 `bounceSeq 2`·`shiverSeq 1`·`wrapMotion 0`(새 번호 젤리) ⓒ bridge: 호출 없음
- 스펙: 같음

### TC-168 · 입력 비보관 — CR-023 필드 · 종류: 자동 · 요구: R-24, R-22 · 설계: design/functions.md §5.2 기록 금지(「`repeating`·`lastRepeatAt`·`shiverSeq`도 어떤 키였는지 담지 않는다」)
- Given 초기 상태, `console.log/info/warn/error/debug`·`Storage.prototype.setItem` 감시
- When Z 누름 → Z 반복 3회 → Z 뗌 → 스페이스 누름 → 스페이스 반복 → 스페이스 뗌(8건)
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 매 단계 상태 키 집합 = 초기 키 집합(필드 추가 없음), 끝 `repeating false`·`lastRepeatAt` = 마지막 반복 ts(T0+1200)·`shiverSeq 2`·`bounceSeq 2`, `JSON.stringify(state)`에 `"z"`·`"space"` 없음 ⓒ bridge: 호출 없음. console 5종·`setItem` 0회
- 스펙: 같음

#### 화면 — `OverlayApp` 부르르 통합

스펙: `src/overlay/test/OverlayApp.shiver.test.tsx`(신규, TC-169~TC-173). 픽스처 = `OverlayApp.jelly.test.tsx`와 같다(`SPECIAL_MANIFEST` — `key_space`·`key_enter`·`key_undo` 등록, `key_z` 미등록 · `SETTINGS` mouse = `MOUSE` · `MONITORS` · 기준점 (520,530)), 가짜 시계 T0. CSS mock에 `shiver` 추가. 「조회 4종」 = `getSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor`. 키보드 img = `.jellyWrap` 마지막 자식.

### TC-169 · 일반 키 꾹 누름 → 첫 누름 젤리, 반복 → `.jellyWrap shiver`, 뗌 → 해제 · 종류: 자동 · 요구: R-24, R-23, R-07 · 설계: design/functions.md §5.1 키보드 핸들러(`repeat: p.repeat === true`)·`jellyClass` `'shiver'` → `jellyWrap shiver`, design.md §6 P-2(CR-023), §10.3 부르르 규칙 1·5, §10.6 `kbFrame` 문단, design/components.md 렌더 조건 `.jellyWrap` 행
- Given 조회 성공으로 마운트(T0), 키 모두 뗌(`bounceSeq` 짝수·`kbFrame 0`)
- When 일반 키 누름 `repeat false` → 500ms 뒤 반복 `repeat true` → 33ms 간격 반복 4회(`.jellyWrap`·키보드 img의 `class`·`src` MutationObserver 감시) → 뗌 `repeat false`
- Then ⓐ 화면: 누름 `jellyWrap jellyAlt`·`u:kb_down_1` → 반복 `jellyWrap shiver`·`u:kb_down_1`(프레임 불변) → 반복 4회 동안 class·src 변경 기록 0건 → 뗌 `jellyWrap`·`u:kb_up`. `.jellyWrap` 같은 노드, 키보드 img class 항상 `layer`, 뗌 뒤 `.shiver`·`.jelly`·`.jellyAlt` 0개 ⓑ 상태: `repeating` true → false, `kbFrame 1` 유지(화면으로 관찰) ⓒ bridge: 조회 4종 각 1회(추가 0), `getScreenBounds` 0회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.shiver.test.tsx`

### TC-170 · 특수 키 꾹 누름 — 그림 유지+부르르, 반복 중 새 특수 키 → 젤리, 그 키 뗌 → 정지 · 종류: 자동 · 요구: R-24, R-22, R-23 · 설계: design.md §10.3 부르르 규칙 1·3·4·5, §10.6 9행(CR-023), P-2, design/functions.md §5.1 `jellyClass`·§5.2 `wrapMotion` ③
- Given 마운트, 키 모두 뗌(`bounceSeq` 짝수)
- When 스페이스 `(1,'space')` → 스페이스 반복 → 반복 2회 더(class·src 감시) → Enter `(2,'enter')` → Enter 반복 → Enter 뗌 `(false,1,'enter')` → 스페이스 뗌 `(false,0,'space')`
- Then ⓐ 화면(`.jellyWrap` class / 키보드 src): `jellyWrap jellyAlt`/`u:key_space` → `jellyWrap shiver`/`u:key_space` → 변경 0건 → `jellyWrap jelly`/`u:key_enter` → `jellyWrap shiver`/`u:key_enter` → `jellyWrap`/`u:key_space`(부르르 정지, 젤리 재생 없음) → `jellyWrap`/`u:kb_up`. `.jellyWrap` 같은 노드, 키보드 img class `layer`, `.armWrap` class `armWrap` ⓑ 상태: `specialHeld` `['space']` → `['space','enter']` → `['space']` → `[]`(반복은 목록 불변 — 화면으로 관찰) ⓒ bridge: `setSettings` 0회
- 스펙: 같음

### TC-171 · `repeat` 필드 없음·`undefined`·`true` 아닌 값 → 반복 아님 · 종류: 자동 · 요구: R-24, R-07 · 설계: design/functions.md §5.1 키보드 핸들러(「필드가 없거나 `true`가 아니면 `false`」)·§5.2 `MachineInput` `repeat?`, requirements §3 `KeyboardInputEvent.repeat` 행(미확정 계약)
- Given 마운트, 키 모두 뗌
- When 일반 키 누름(필드 없음) → 같은 누름 4회: 필드 없음 / `repeat 'true'` / `repeat 1` / `repeat undefined`(`.jellyWrap` class 감시) → `repeat true` → 뗌
- Then ⓐ 화면: 첫 누름 `jellyWrap jellyAlt`·`u:kb_down_1`. 4회 동안 `.shiver` 0개, `.jellyWrap` class 변경 0건(`jellyWrap jellyAlt` 유지), 키보드 src `u:kb_down_2` → `u:kb_down_0` → `u:kb_down_1` → `u:kb_down_2`(옛 규칙 — 누름마다 순환). `repeat true` → `jellyWrap shiver`·`u:kb_down_2`(불변). 뗌 → `jellyWrap`·`u:kb_up` ⓑ 상태: `repeating`은 `repeat true` 한 건에서만 true ⓒ bridge: 오류 없음, `setSettings` 0회
- 스펙: 같음

### TC-172 · 부르르 중 동시 부착 없음·안쪽 요소 무변화·팔 변형 유지·배경 밖 · 종류: 자동 · 요구: R-24, R-23, R-16, R-17, R-21 · 설계: design/components.md §3 배경 DOM 구조 5(`.shiver`도 안쪽 요소·`.canvas`·`.root`에 없음)·6(많아야 하나), design/functions.md §5.1 `jellyClass`, design.md §2 ASCII·§10.1(z0~z3 함께, 배경 제외)·§10.3 우선순위·마우스 팔과의 합성
- Given 마운트, 키 모두 뗌(`bounceSeq` 짝수) → 마우스 이동 (960,1080)(팔 `DOWN`)
- When 일반 키 누름 [A] → 반복 [B] → 스페이스 새 누름 `(2,'space')` [C] → 스페이스 반복 [D] → 모두 뗌 [E]
- Then ⓐ 화면: `.jellyWrap` class A `jellyWrap jellyAlt` · B `jellyWrap shiver` · C `jellyWrap jelly` · D `jellyWrap shiver` · E `jellyWrap`. 매 검사에서 `.jellyWrap` classList 길이 ≤ 2, `.jelly, .jellyAlt, .shiver` 선택 결과 A~D 정확히 1개(= `.jellyWrap`)·E 0개, `.bounce, .bounceAlt` 0개, `.armWrap` class `armWrap`, `.jellyWrap` 안 모든 img class ∈ {`layer`, `hand`}, `.canvas` class `canvas`, `.root` class `root`, 손 그림 `transform` `DOWN`·`transformOrigin` `620px 530px` 유지, 배경 img 같은 노드·부모 `.canvas`·`closest('.jellyWrap')` null·class `layer`·`style` 없음·`.canvas` 첫 자식 = 배경·둘째 = `.jellyWrap` ⓑ 상태: `armAtRest false` 유지 ⓒ bridge: `setSettings` 0회
- 스펙: 같음

### TC-173 · 뗌 누락 방어 통합 — 499ms 유지·500ms 정지·젤리 재생 없음·이동 무관 · 종류: 자동 · 요구: R-24, R-23 · 설계: design.md §6 P-3(CR-023)·§10.3 부르르 행(꺼짐 = 500ms)·규칙 2·4, design/functions.md §5.2 tick 행·`lastRepeatAt`, §5.1 tick 효과(위상 T0)
- Given 마운트(T0), 키 모두 뗌(`bounceSeq` 짝수), 현재 시각 S가 tick 경계(단독 실행 S = T0)
- When S+1000 일반 키 누름 → S+1500 반복 → +499(S+1999) → +1(tick S+2000) → 반복(S+2000) → +200 → 이동 (960,0)(S+2200) → +299(S+2499) → +1(tick S+2500) → 뗌
- Then ⓐ 화면(`.jellyWrap` class): `jellyWrap jellyAlt` → `jellyWrap shiver` → S+1999 `jellyWrap shiver`(마지막 tick S+1900 = 400ms) → S+2000 `jellyWrap`(`.jelly`·`.jellyAlt`·`.shiver` 0개 — 젤리 재생 없음, 키보드 src = 누름 직후와 같음·class `layer`) → 반복 `jellyWrap shiver`(재시작) → S+2499 `jellyWrap shiver` → S+2500 `jellyWrap`(이동 뒤 300ms여도 정지) → 뗌 `jellyWrap`·`u:kb_up`. `.jellyWrap` 같은 노드 ⓑ 상태: `lastRepeatAt`은 이동으로 바뀌지 않음(화면으로 관찰) ⓒ bridge: 조회 4종 각 1회(추가 0), `getScreenBounds` 0회, `setSettings` 0회
- 스펙: 같음

#### CSS — `.shiver` 규칙

### TC-174 · `.shiver`·`@keyframes shiver` CSS · 종류: 자동 · 요구: R-24 · 설계: design.md §10.3 부르르 행(80ms `ease-in-out` `infinite`, fill-mode 없음, 기준점 = `.jellyWrap` 50% 100%)·CSS 블록 `.shiver`·`@keyframes shiver`, §11 D-3(transform만)
- Given `src/overlay/overlay.module.css` 원문(`fs.readFileSync`)
- When `.shiver`·`@keyframes shiver`·`.jellyWrap`·`.jelly`·`.jellyAlt` 블록 파싱(구간 경계 규칙은 TC-080과 같음)
- Then ⓐ 화면(규칙): `.shiver` 선언 = 정확히 `{animation: 'shiver 80ms ease-in-out infinite'}`, 구간 키 정확히 `[0, 25, 50, 75, 100]`, 0% `scale(1, 1)`·25% `scale(1.02, 0.97)`·50% `scale(1, 1)`·75% `scale(0.99, 1.02)`·100% `scale(1, 1)`(각 구간 선언은 `transform` 하나), keyframe에 `translate`·`rotate` 없음, `.jellyWrap`에 `animation` 없음, `.jelly`·`.jellyAlt`는 1회 선언 그대로 ⓑ 상태: 해당 없음 ⓒ bridge: 해당 없음
- 스펙: `src/overlay/test/overlayStyles.test.ts`(v1.5a부터 `fs.readFileSync`로 읽어 collect 이슈 해소 — 실행 가능)

#### 수동 — `src/overlay/test/manual-checklist.md`

### TC-175 · 꾹 누름 체감 — 부르르·배경 정지·팔 유지·떼면 즉시 정지·느린 반복 설정 · 종류: 수동(MC-19) · 요구: R-24, R-23, R-22, R-16, R-17, R-21 · 설계: design.md §10.3 부르르 행·떨림 폭·부르르 규칙 1~4·마우스 팔과의 합성, design/functions.md §5.2 `REPEAT_TIMEOUT_MS` 결정 근거(Windows 반복 간격 최대 약 400ms), requirements §3 `repeat` 행
- Given 실제 앱(CR-023 core·bridge·ui 적용 빌드), 배경·몸통·상태·키보드·마우스 파츠 등록, 메모장 포커스(오버레이 포커스 없음), Windows 키보드 반복 설정 기본값
- When MC-19 절차 ①~⑨
- Then ⓐ 화면: 꾹 누르면 처음 1회 젤리 → OS 재입력 시간 뒤 반복이 써지는 동안 배경 뺀 전체가 젤리보다 작고 빠르게 계속 떨림(ㅋ·스페이스·백스페이스·일반 문자 모두), 특수 키 그림(등록 시)은 그대로(깜빡임 없음), 배경 정지, 팔은 몸과 함께 떨고 각도 유지·마우스 추종 계속, 떼면 즉시 정지하고 젤리가 다시 튀지 않음, 가장 느린 반복 속도에서도 반복 사이에 떨림이 끊기지 않음, 꾹 누른 채 스페이스 새 누름 → 젤리 1회 → 스페이스 반복 → 다시 떨림 ⓑ 상태: `settings.json` 변화 없음 ⓒ core·bridge: 전역 훅 → `input://keyboard`(`repeat` 필드), 새 command·event 없음, 로그·콘솔에 키·반복 정보 출력 없음

### 추가 TC (v1.1 — CR-025: R-25 펜 쥔 손 파츠 · 펜 모드 = `pen_up` 등록 · 키보드 Layer `kb_up` 고정 · 손은 팔 끝을 따라 이동·같은 각도·크기 불변)

공통 전제 보충(§0.1·v0.8~v1.0 보충에 더한다 — 서로 어긋나면 이 절이 우선)
- **펜 슬롯 픽스처**: 펜 슬롯의 TS 표현은 bridge 결정(미확정 계약)이라 스펙은 **파일명 키 문자열**(`pen_up`·`pen_down_{n}`·`pen_key_{special}`)을 `slot`에 그대로 넣는다(`penSlot(key) = key as unknown as AssetSlot`, 현행 `slotKey(문자열) = 문자열`). url = `u:{slotKey}`. 펜 그림은 **202×154**(TC-194만 `pen_down_1` 180×150). bridge가 객체 표현을 택하면 각 스펙의 `penSlot` 헬퍼만 바꾼다 — 기대값 불변(`findByKey`가 `slotKey` 문자열로 찾으므로).
- **`penPos` 픽스처**: `MouseSettings.penPos`는 미확정 계약이라 `{ …, penPos } as MouseSettings`로 캐스팅한다. 기본 픽스처 `MOUSE_PEN` = 어깨 (620,530) · 영역 `AREA` · hand null · partPos (0,0) · **penPos (389,492)**. `penPos` (389,492) + `pen_up` 202×154 → 붙는 점 P = (490,569), 회전 원점 `101px 77px`.
- **펜 매니페스트**(`OverlayApp.pen.test.tsx`): `PEN_MANIFEST` = 배경·몸통·대기·쉬는중·kb_up·key_space·마우스 파츠 3(900×700)·kb_down 3장(0~2) + `pen_up`·`pen_down_0`·`pen_down_1`·`pen_key_space`(202×154) → `kbFrames` = 펜 누름 2(kb_down 3장이 아님). `NO_PEN` = 펜 슬롯 없음, `PARTIAL_PEN` = `NO_PEN` + `pen_down_0`·`pen_key_space`(**`pen_up` 없음**), `PEN_NO_ARM` = `PEN_MANIFEST` − 마우스 파츠 3장.
- **변형 기대값**: 손 변형 문자열은 스펙에서 `penTransformCss(penTransform(어깨, armTransformFor(같은 입력), penPos, pen_up 크기))`로 만들어 비교하고, 수치는 따로 ±0.05로 단언한다. 참조(어깨 (620,530)·기준점 (520,530)·`AREA`·모니터 1920×1080·penPos (389,492)·202×154): 커서 (960,0) → 팔 `UP` → 손 ≈ `translate(-27.56px, -141.4px) rotate(45deg)` / 커서 (960,1080) → 팔 `DOWN` → 손 ≈ `translate(27.6px, 118.56px) rotate(-45deg)` / 쉬는 자세 → `translate(0px, 0px) rotate(0deg)`(= `PEN_REST_CSS`).
- **펜 손 img 로케이터**: `img[src^="u:pen"]`(펜 손은 하나뿐). 펜 모드에서 `.jellyWrap`의 마지막 자식은 펜 손이므로 **키보드 img = `.jellyWrap` 직계 자식 중 마지막 `.layer`**(v0.9의 「`.jellyWrap` 마지막 자식」 로케이터는 펜 슬롯이 없는 기존 스펙에서만 유효 — 기존 스펙 매니페스트에는 `pen_up`이 없어 `PenHand`가 `null`이므로 그대로 성립).
- CSS Modules mock(`OverlayApp.pen.test`)에 `shiver`를 둔다(TC-199). `bounce`·`bounceAlt`는 잔존 감시용.
- §0.3 보충 — **CR-025 red**(CR 대장 「설계 완료·소스 미적용·계약 미확정」): 실패 예상 = TC-176~TC-202 전부. `src/overlay/components/PenHand.tsx`가 없으면 `PenHand.test.tsx`·`penLayers.test.tsx`는 import 단계에서 실패하고, `mouseMapping.ts`·`LayerStack.tsx`의 새 export(`armTransformFor`·`defaultPenPos`·`resolvePenPos`·`penTransform`·`penTransformCss`·`PEN_REST`·`findByKey`·`isPenMode`·`penDownFrameCount`)가 없으면 `penMapping.test.ts`는 `undefined` 호출로, `OverlayApp.pen.test.tsx`는 펜 손 img 없음으로 실패한다. `yarn tsc --noEmit`도 없는 export import로 오류다. TC-185는 `MouseArm` 기대가 현재 소스와 같아 `armTransformFor` export만 생기면 통과할 수 있다(회귀 방지). 이 문서 작성 시 소스는 새 export 유무만 확인했다.

#### v1.1 개정표 — 기존 TC 기대값 변경

| TC | 스펙 | 개정 내용(CR-025) |
|---|---|---|
| (없음) | — | 기존 TC 기대 불변. 근거: 기존 스펙 매니페스트에는 `pen_up`이 없어 `isPenMode` = false → `PenHand`는 `null`(DOM 변화 없음), `config.kbFrames` = `kbDownFrameCount`(그대로), `LayerStack` 키보드 = `pickKeyboardEntry`(그대로). `MouseArm`의 1~5단계를 `armTransformFor`로 옮기는 것은 「결과·동작 변경 없음」(design/functions.md §5.4 (CR-025)) — TC-185가 같은 값을 확인한다. `.jellyWrap` 자식 구성 단언(TC-152·TC-153·TC-200)은 펜 슬롯이 없을 때만 적용된다 |

#### 순수 함수 — `src/state/mouseMapping.ts` (design/functions.md §5.5)

스펙: `src/overlay/test/penMapping.test.ts`. 수치 객체의 부호 있는 0은 설계가 정하지 않으므로 `+ 0`으로 정규화해 비교한다(문자열의 `-0`은 TC-181).

### TC-176 · `PEN_REST`·쉬는 자세 → `PEN_REST` · 종류: 자동 · 요구: R-25 · 설계: design/functions.md §5.5 `PEN_REST`·`PenTransform`·`penTransform` ①·예 ⓒ, design.md §10.7 위치·변형 수학 4
- Given `PEN_REST`, `REST_TRANSFORM`, 어깨 (0,0)·(620,530)
- When `penTransform`에 팔 변형 `REST_TRANSFORM` / `{45,45,1}` / `{180,180,1}`(항등이지만 다른 객체)과 임의 penPos·크기를 넣음
- Then ⓐ 화면: 해당 없음(순수 함수 — 화면은 TC-192·TC-196) ⓑ 상태: `PEN_REST` = `{dx:0, dy:0, deg:0}`, 키 = `dx`·`dy`·`deg` 셋뿐(스케일 필드 없음), `REST_TRANSFORM` = `{0,0,1}`, 세 호출 모두 `{0,0,0}` ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penMapping.test.ts`

### TC-177 · `penTransform` 예 ⓐ·ⓑ·늘어나기만·어깨 이동 · 종류: 자동 · 요구: R-25 · 설계: design/functions.md §5.5 `penTransform` ③~⑦·예 ⓐ·ⓑ, design.md §10.7 위치·변형 수학 1~3
- Given 어깨 (0,0) 또는 (100,100)
- When ⓐ arm `{0,-90,1.2}`·penPos (125,−5)·50×30 ⓑ arm `{0,90,1}`·penPos (90,−10)·20×20 ⓔ arm `{0,0,1.2}`·penPos (125,−5)·50×30 ⓕ 어깨 (100,100)·arm `{0,90,1}`·penPos (190,90)·20×20
- Then ⓐ 화면: 해당 없음 ⓑ 상태: ⓐ `{dx:-140, dy:-190, deg:-90}` ⓑ `{-100, 100, 90}` ⓔ `{30, 0, 0}`(회전 없음·붙는 점만 k배 이동) ⓕ `{-100, 100, 90}`(어깨 기준 상대 결과가 ⓑ와 같음) ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penMapping.test.ts`

### TC-178 · `penTransform` 예 ⓓ(허용오차 ±0.05) · 종류: 자동 · 요구: R-25 · 설계: design/functions.md §5.5 `penTransform` 예 ⓓ·⑦ 반올림, §5.4 6단계 예(같은 팔)
- Given 어깨 (620,530), arm `{baseDeg:180, targetDeg:-129.81, stretch:1.562}`, penPos (389,492), 크기 202×154
- When `armTransformCss(arm)`·`penTransform(…)`
- Then ⓐ 화면: 해당 없음(팔 문자열 = `rotate(-129.81deg) scaleX(1.562) rotate(-180deg)` — §5.4 예와 같은 팔임을 확인) ⓑ 상태: `|dx − (−29.97)| ≤ 0.05`, `|dy − (−170.02)| ≤ 0.05`, `deg` ≈ 50.19(소수 2자리 일치 — −309.81을 접은 값), 세 값 모두 소수 2자리로 반올림된 값(×100이 정수), 키는 `dx`·`dy`·`deg`뿐 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penMapping.test.ts`

### TC-179 · 각도 접기 (−180, 180] · 종류: 자동 · 요구: R-25 · 설계: design/functions.md §5.5 `penTransform` ⑥, design.md §10.7 위치·변형 수학 3
- Given 어깨 (0,0), penPos (90,−10), 20×20
- When arm (θh, θt, k) = (180, −129.81, 1.562) / (−90, 90, 1) / (90, −90, 1) / (−170, 170, 1) / (170, −170, 1) / (0, −90, 1.2)
- Then ⓐ 화면: 해당 없음 ⓑ 상태: `deg` = 50.19 / 180(그대로) / 180(−180 → +360) / −20(340 → −360) / 20(−340 → +360) / −90, 모두 −180 초과 180 이하 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penMapping.test.ts`

### TC-180 · 비유한 입력 → `PEN_REST`, 음수 크기 = 0, 스케일 없음 · 종류: 자동 · 요구: R-25 · 설계: design/functions.md §5.5 `penTransform` ②③·예외 열, `PenTransform`(스케일 필드 없음)
- Given 정상 입력 어깨 (0,0)·arm `{0,90,1}`·penPos (90,−10)·20×20
- When 한 곳씩 비유한 값으로 바꿈(어깨 x NaN·y ∞, arm θt NaN·θh −∞·k ∞, penPos x NaN·y −∞, 크기 너비 NaN·높이 ∞) / 크기 −20×−20·penPos (100,0)
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 비유한 9건 모두 `{0,0,0}`, 음수 크기 → P = penPos (100,0) → `{-100, 100, 90}`, 결과 키 = `dx`·`dy`·`deg` ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penMapping.test.ts`

### TC-181 · `penTransformCss` 형식 · 종류: 자동 · 요구: R-25 · 설계: design/functions.md §5.5 `penTransformCss`
- Given `PenTransform` 값들
- When `penTransformCss` 호출: `PEN_REST`, `{-0,-0,-0}`, `{-140,-190,-90}`, `{-29.97,-170.02,50.19}`, `{27.6,118.56,-45}`
- Then ⓐ 화면(문자열): `translate(0px, 0px) rotate(0deg)` ×2(−0은 `0`), `translate(-140px, -190px) rotate(-90deg)`, `translate(-29.97px, -170.02px) rotate(50.19deg)`, `translate(27.6px, 118.56px) rotate(-45deg)`, 어느 결과에도 `scale` 없음 ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penMapping.test.ts`

### TC-182 · `defaultPenPos` 기본 위치 규칙 · 종류: 자동 · 요구: R-25 · 설계: design/functions.md §5.5 `defaultPenPos`(예·예외 열), design.md §10.7 기본 위치 규칙
- Given 영역 `DEF_AREA`(중심 435,575) 또는 `AREA`(중심 520,530), hand null 또는 (500,600)
- When `defaultPenPos(mouse, 크기)`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: `DEF_AREA`·hand null·202×154 → (334,498)(설계 예), hand (500,600)·50×30 → (475,585)(hand 우선), `AREA`·201×155 → (420,453)(419.5·452.5 반올림), `AREA`·202×154 → (419,453), hand (500,600)·크기 −10×−10 → (500,600), 크기 NaN×∞ → (500,600)(0으로 봄), `penPos` (1,2)가 있어도 (334,498)(기본 규칙은 penPos를 보지 않음) ⓒ bridge: 호출 없음(`anchor`를 쓰지 않음)
- 스펙: `src/overlay/test/penMapping.test.ts`

### TC-183 · `resolvePenPos` · 종류: 자동 · 요구: R-25 · 설계: design/functions.md §5.5 `resolvePenPos`, requirements §3 `penPos` 행(기본 `null`)
- Given `penPos` = (10,20) / (0,0) / `null`(영역 `DEF_AREA`)
- When `resolvePenPos(mouse, 202×154 또는 1×1)`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: (10,20)은 크기와 무관하게 (10,20), (0,0)은 (0,0)(지정값 — 기본 규칙으로 바꾸지 않음), `null`은 `defaultPenPos`와 같은 (334,498) ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penMapping.test.ts`

### TC-184 · `armTransformFor` ①~⑤ · 종류: 자동 · 요구: R-25, R-15, R-21 · 설계: design/functions.md §5.5 `armTransformFor`, §5.4 `MouseArm` 렌더 1~5단계
- Given 입력 기본값 = mouse(어깨 620,530·`AREA`·hand null)·모니터 [1920×1080]·커서 (960,1080)·anchor (520,530)·atRest false
- When ① atRest true ② 모니터 [] ③ 크기 0 모니터만 ④ anchor = 어깨 ⑤ 기본값 ⑥ anchor null·hand (620,430)·커서 (960,0) ⑦ anchor null·hand null·커서 (960,0) ⑧ 두 모니터 A·B·커서 (100,1980)
- Then ⓐ 화면(문자열, `armTransformCss`): ①~④ `REST`, ⑤ `DOWN`, ⑥ `UP_ALT`, ⑦ `UP`, ⑧ `rotate(180deg) scaleX(1.6) rotate(-180deg)`(§0.2) ⓑ 상태: ①~④ = `REST_TRANSFORM`, ⑤~⑧ = `armTransform(어깨, resolvePivot(anchor, hand, area), bilerpQuad(area, cursorUv(커서, pickMonitor(커서, 모니터))))`와 같은 객체 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penMapping.test.ts`

#### 컴포넌트 — `PenHand`·`MouseArm` (design/functions.md §5.4 (CR-025)·§5.5)

스펙: `src/overlay/test/PenHand.test.tsx`. 매니페스트 `PEN` = 몸통·대기·kb_up·마우스 파츠 3(202×154)·`pen_up`·`pen_down_0`·`pen_down_1`(180×150)·`pen_key_space`. 기본 props = mouse(어깨 620,530·`AREA`·hand null·partPos 389,492·**penPos 389,492**)·모니터 [1920×1080]·커서 (0,0)·anchor (520,530)·atRest true·machine 초기 상태.

### TC-185 · `armTransformFor` 추출 = `MouseArm` 결과 불변 · 종류: 자동 · 요구: R-25, R-15, R-21 · 설계: design/functions.md §5.4 「(CR-025) 1~5단계 → `armTransformFor`, 결과·동작 변경 없음」·§5.5 `armTransformFor`
- Given `MouseArm` props = 위 기본 props + `button 'none'`, atRest false
- When 7경우로 렌더: 쉬는 위치(atRest true) / 커서 (960,1080) / anchor null·hand (620,430)·(960,0) / anchor null·hand null·(960,0) / 두 모니터·(100,1980) / 모니터 [] / anchor = 어깨
- Then ⓐ 화면: `.armWrap img` `style.transform` = `REST` / `DOWN` / `UP_ALT` / `UP` / `rotate(180deg) scaleX(1.6) rotate(-180deg)` / `REST` / `REST`(§0.2 — CR-017 이후 값과 같음) ⓑ 상태: 각 경우 `armTransformCss(armTransformFor({mouse, monitors, cursor, anchor, atRest}))`가 같은 문자열 ⓒ bridge: 호출 없음(bridge 모듈 mock 비어 있음)
- 스펙: `src/overlay/test/PenHand.test.tsx`

### TC-186 · `findByKey` · 종류: 자동 · 요구: R-25 · 설계: design/functions.md §5.3 `findByKey`, design.md §7 펜 슬롯 행
- Given `PEN` 매니페스트(`penLayers` 스펙 — 몸통·대기·쉬는중·kb_up·key_space·key_enter·kb_down 3장 + `pen_up`·`pen_down_0`·`pen_down_1`·`pen_key_space`), 빈 매니페스트
- When `findByKey(manifest, key)` — 있는 키 7개(`pen_up`·`pen_down_0`·`pen_down_1`·`pen_key_space`·`kb_up`·`kb_down_2`·`key_space`), 없는 키 5개(`pen_down_2`·`pen_key_enter`·`pen`·빈 문자열·`mouse_base`)
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 있는 키 → 그 항목과 **같은 참조**(url `u:{key}`), 없는 키·빈 매니페스트 → `undefined` ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penLayers.test.tsx`

### TC-187 · `isPenMode` = `pen_up` 등록 · 종류: 자동 · 요구: R-25 · 설계: design/functions.md §5.3 `isPenMode`(🔒), design.md §10.7 펜 모드
- Given `PEN` / `pen_up`만 / `pen_down_0`·`pen_key_space`만 / `pen_down_0`·`pen_down_1`만 / 펜 슬롯 없음 / 빈 매니페스트
- When `isPenMode`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: true / true / false / false / false / false ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penLayers.test.tsx`

### TC-188 · ~~`penDownFrameCount`~~ **폐기(v1.6, CR-042 — function 삭제, 대체 TC-255 ①③)** · 종류: 자동(폐기 — 스펙 it 삭제, 번호 유지) · 요구: (R-25 → R-31) · 설계: design/functions.md §5.5 CR-042 개정 블록 `penDownFrameCount` 행(삭제)
- 아래 본문은 폐기 전 기록이다(수행하지 않는다). 처리 근거는 「CR-042 펜 손 단순화」 절 v1.6 개정표.
- Given 펜 슬롯 없음 / `pen_up`만 / `pen_up`·`pen_key_space`·`pen_key_enter` / `PEN` / `pen_up`·`pen_down_0~2` / `pen_down_0`·`pen_down_1`(pen_up 없음) / 빈 매니페스트
- When `penDownFrameCount`, 대조로 `kbDownFrameCount(PEN)`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 1 / 1 / 1 / 2 / 3 / 2 / 1, `kbDownFrameCount(PEN)` = 3(kb_down은 세지 않음 — 둘이 다른 값) ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penLayers.test.tsx`

### TC-189 · `pickPenEntry` 설계 예 순서(상태기계 연쇄) · 종류: 자동 · 요구: R-25, R-22, R-24 · 설계: design/functions.md §5.5 `pickPenEntry` ①~④·예(🔒 선택 순서), design.md §10.7 손 그림 선택(자동 반복 누름은 그림 불변)
- Given `PEN`, `createInitialState(T0)`, `reduce` 설정 `{idleMs 300000, kbFrames: penDownFrameCount(PEN) = 2}`
- When 입력 없음 → 일반 키 누름(1) → 같은 키 반복 누름(`repeat true`) → 뗌(0) → 누름(1) → 스페이스 누름(2) → Enter 누름(3) → Enter 뗌(2) → 모두 뗌(0)
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 손 그림 url = `u:pen_up` → `u:pen_down_1` → `u:pen_down_1`(반복은 프레임 불변) → `u:pen_up` → `u:pen_down_0` → `u:pen_key_space` → `u:pen_down_0`(`pen_key_enter` 없음 → `pen_down_{kbFrame}`) → `u:pen_key_space`(이전 특수 키 복귀) → `u:pen_up`, 각 단계 `kbFrame` = 0·1·1·1·0·1·0·0·0 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penLayers.test.tsx`

### TC-190 · `pickPenEntry` 폴백·특수 키 7종·`key_*` 미사용·`pen_up` 없음 · 종류: 자동 · 요구: R-25, R-22 · 설계: design/functions.md §5.5 `pickPenEntry` ①~④(「`pen_down_*`가 하나도 없으면 누름 중에도 `pen_up`」)
- Given 기계 상태를 직접 구성(`createInitialState` + 필드 덮어쓰기)
- When ① `PEN`·누름·`kbFrame 2` / 뗌·`kbFrame 1` / 누름·`specialHeld ['space','enter']` / `['enter','space']` ② `pen_up`·`pen_down_1`만: 누름 `kbFrame 0`·`1` ③ `pen_up`·`pen_key_space`만: 누름·특수 없음 / `['space']` ④ `pen_up`·`pen_down_0`·`pen_key_*` 7종: 7종 각각 누름 ⑤ `pen_up`·`pen_down_0`만(매니페스트에 `key_space`는 있음): `['space']` 누름 ⑥ `pen_up` 없는 매니페스트·빈 매니페스트: 누름 아님·누름·특수 키 누름
- Then ⓐ 화면: 해당 없음 ⓑ 상태: ① `u:pen_down_0`(pen_down_2 없음) / `u:pen_up` / `u:pen_down_1`(가장 최근 `enter`의 그림이 없으면 앞선 `space`가 아니라 누름 프레임) / `u:pen_key_space` ② `u:pen_up`(pen_down_0 없음) / `u:pen_down_1` ③ `u:pen_up` / `u:pen_key_space` ④ `u:pen_key_{s}` — 키 이름 집합 = `pen_key_space`·`pen_key_z`·`pen_key_question`·`pen_key_exclamation`·`pen_key_enter`·`pen_key_backspace`·`pen_key_undo` ⑤ `u:pen_down_0`(`key_space`를 손 그림으로 쓰지 않음) ⑥ 모두 `undefined` ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penLayers.test.tsx`

### TC-191 · `LayerStack` 펜 모드 키보드 = `kb_up` 고정 / 펜 모드 아님 = 기존 · 종류: 자동 · 요구: R-25, R-19, R-07, R-22 · 설계: design/functions.md §5.3 `LayerStack` 렌더(CR-025), design/components.md 렌더 조건 `LayerStack` 행, design.md §10.7 키보드 레이어 고정, requirements §1 용어 주(R-19 펜 모드 예외)
- Given `PEN`(펜 모드) / `PARTIAL`(`pen_down_0`·`pen_key_space`만 — 펜 모드 아님)
- When `LayerStack` 렌더 — `PEN`: 초기·누름 `kbFrame 1`·스페이스 누름·Enter 누름 `kbFrame 2`·반복 중(`repeating true`)·쉬는중(`layer 'rest'`) / `PARTIAL`: 초기·누름 `kbFrame 1`·스페이스 누름
- Then ⓐ 화면: `PEN`은 img src = `[u:body, u:idle(쉬는중이면 u:rest), u:kb_up]`, 키보드 img class `layer`, `u:pen*` img 없음(펜 손은 `LayerStack`이 그리지 않음) / `PARTIAL`은 키보드 = `u:kb_up` / `u:kb_down_1` / `u:key_space`(= `pickKeyboardEntry` 결과), `u:pen*` img 없음 ⓑ 상태: 입력 상태(`kbDown`·`kbFrame`·`specialHeld`)는 그대로 넘겼으나 펜 모드 표시에 쓰이지 않음 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penLayers.test.tsx`

### TC-192 · `PenHand` 쉬는 자세 렌더(설계 예) · 종류: 자동 · 요구: R-25, R-01 · 설계: design/functions.md §5.5 `PenHand` 렌더 ①~⑥·예, design/components.md §3 `PenHand` 행(래퍼 없음), design.md §8 모든 img `alt=""`·§10.1 pen 행
- Given 기본 props, mouse = `DEF_AREA`·hand null·**penPos null** / 기본 penPos (389,492)
- When `PenHand` 렌더(atRest true)
- Then ⓐ 화면: 자식 = `<img>` 하나(래퍼 없음), class 정확히 `hand`, src `u:pen_up`, `alt=""`, `draggable="false"`, penPos null → left 334px·top 498px·width 202px·height 154px·transformOrigin `101px 77px`·transform `translate(0px, 0px) rotate(0deg)` / penPos (389,492) → left 389px·top 492px(나머지 같음) ⓑ 상태: 해당 없음(순수 렌더) ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/PenHand.test.tsx`

### TC-193 · `PenHand` 팔 끝 추종(크기 불변) · 종류: 자동 · 요구: R-25 · 설계: design/functions.md §5.5 `PenHand` 렌더 ③~⑥·`penTransform`, design/components.md 렌더 조건 `PenHand` 행(모니터 없음·팔 그림 없음), design.md §10.7 위치·변형 수학·표시 조건
- Given 기본 props, atRest false
- When 커서 (960,0) / (960,1080) / 팔 그림 없는 매니페스트·(960,0) / 모니터 []·(960,0) / atRest true·(960,0)
- Then ⓐ 화면: transform = `penTransformCss(penTransform((620,530), armTransformFor(같은 입력), (389,492), 202×154))` — (960,0)은 ≈ (−27.56, −141.40, 45°), (960,1080)은 ≈ (27.60, 118.56, −45°)(±0.05), 팔 그림 없어도 (960,0)과 같은 문자열, 모니터 []·atRest는 `translate(0px, 0px) rotate(0deg)`. left/top 389/492·202×154·원점 `101px 77px` 불변, transform에 `scale` 없음 ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/PenHand.test.tsx`

### TC-194 · `PenHand` 그림 교체 = 같은 img의 src만 · 종류: 자동 · 요구: R-25, R-22 · 설계: design/functions.md §5.5 `PenHand` 렌더 ⑥(같은 `<img>` 유지·크기 = 선택 그림)·머리글(붙는 점·회전 기준 = `pen_up` 크기), design.md §10.7 마지막 문단
- Given 기본 props, atRest false·커서 (960,0), `pen_down_1`만 180×150
- When machine을 누름 `kbFrame 1` → 누름 `kbFrame 0` → 스페이스 누름 → 초기 상태로 rerender
- Then ⓐ 화면: 같은 img 노드, src `u:pen_down_1`(width 180px·height 150px) → `u:pen_down_0`(202×154) → `u:pen_key_space` → `u:pen_up`, left 389px·top 492px·transformOrigin `101px 77px`·transform은 교체 전과 같은 문자열, class `hand` ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/PenHand.test.tsx`

### TC-195 · `pen_up` 없으면 `PenHand` = `null` · 종류: 자동 · 요구: R-25 · 설계: design/functions.md §5.5 `PenHand` 렌더 ①, design/components.md §3 `PenHand` 행
- Given 매니페스트에 `pen_down_0`·`pen_key_space`만 / 펜 슬롯 없음
- When 초기·스페이스 누름 상태로 렌더 / 커서 (960,0)·atRest false로 렌더
- Then ⓐ 화면: 컨테이너 `innerHTML` = 빈 문자열 ⓑ 상태: 해당 없음 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/PenHand.test.tsx`

#### 화면 통합 — `OverlayApp` (design/components.md §3·렌더 조건, design.md §6 P-2·P-4·P-6(CR-025))

스펙: `src/overlay/test/OverlayApp.pen.test.tsx`. 마운트 조회 mock = `SETTINGS`(mouse `MOUSE_PEN`)·`PEN_MANIFEST`·모니터 [1920×1080]·기준점 (520,530). 가짜 시계 T0(§0.1). 「조회 1회」 = `getSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor` 각 1회·`getScreenBounds` 0회.

### TC-196 · 펜 손 = `.jellyWrap` 마지막 자식, 쉬는 자세 · 종류: 자동 · 요구: R-25, R-01 · 설계: design/components.md 렌더 조건 `PenHand` 행·배경 DOM 구조(PenHand 줄·(CR-025) 애니메이션 클래스 없음), design.md §2 `[pen]`·§10.7 z 순서, design/functions.md §5.5 `PenHand` 렌더
- Given `PEN_MANIFEST`·penPos (389,492)로 마운트(T0), 입력 없음
- When 마운트 직후 DOM 검사
- Then ⓐ 화면: `.canvas` 자식 = `[u:background, jellyWrap]`, `.jellyWrap` 1개·자식 = `[armWrap, u:body, u:idle, u:kb_up, u:pen_up]`, 펜 손 img = `.jellyWrap` 마지막 자식·부모 `.jellyWrap`·class `hand`·`alt=""`·`draggable="false"`·left 389px·top 492px·202×154·원점 `101px 77px`·transform `translate(0px, 0px) rotate(0deg)`, 팔 img transform `REST`, `u:pen*` img 1개 ⓑ 상태: 키 모두 뗌·`armAtRest true` ⓒ bridge: 조회 1회, `setSettings` 0회, 새 command·event 없음
- 스펙: `src/overlay/test/OverlayApp.pen.test.tsx`

### TC-197 · 펜 모드 키 입력 — 키보드 `kb_up` 고정, 손 그림만 교체 · 종류: 자동 · 요구: R-25, R-19, R-22 · 설계: design.md §6 P-2(CR-025)·§4 `config.kbFrames`·§10.7 키보드 레이어 고정·손 그림 선택·마지막 문단(같은 img src 교체), design/functions.md §5.3 `penDownFrameCount`·§5.5 `pickPenEntry`·입력 비보관
- Given 펜 모드 마운트, 키 모두 뗌, `kbFrame 0`(커서 위치 무관 — 손 자세는 Step 시작 값과 비교)
- When `input://keyboard` 순서: 누름(1) → 뗌(0) → 누름(1) → 뗌(0) → 누름(1) → 스페이스 누름(2) → Enter 누름(3) → Enter 뗌(2) → 모두 뗌(0, special null)
- Then ⓐ 화면: 펜 손 src = `u:pen_down_1` → `u:pen_up` → `u:pen_down_0` → `u:pen_up` → `u:pen_down_1` → `u:pen_key_space` → `u:pen_down_1` → `u:pen_key_space` → `u:pen_up`(kbFrames = 펜 누름 2장으로 순환 — kb_down 3장이었다면 세 번째 누름이 `pen_down_0`), 키보드 img는 매 단계 `u:kb_up`·class `layer`(`key_space`·`kb_down_*` 안 보임), 펜 손은 같은 노드·`.jellyWrap` 마지막 자식·class `hand`, transform·left·top·원점은 Step 시작 값 그대로 ⓑ 상태: 끝에 키 모두 뗌, `kbFrame 1`·`bounceSeq 5`, `console.log/info/debug` 호출 0회(입력 비보관) ⓒ bridge: `setSettings` 0회, 조회 1회
- 스펙: `src/overlay/test/OverlayApp.pen.test.tsx`

### TC-198 · 마우스 이동 = 팔과 같은 변형으로 손 이동·기울기, 클릭 = 손 그림만(위치·각도 불변) — **v1.2 개정(CR-027)** · 종류: 자동 · 요구: R-25, R-09, R-21, R-26 · 설계: design.md §10.8 규칙표 1·3, design.md §6 P-4(CR-025)·§10.7 위치·변형 수학, design/functions.md §5.5 `PenHand` Props(`button` 없음 — 「마우스 클릭이 아니라 키보드 입력」)·`armTransformFor`
- Given 펜 모드 마운트, 키·버튼 모두 뗌(커서 위치 무관)
- When 이동 (960,0) → 왼쪽 누름 → 뗌 → 오른쪽 누름 → 뗌 → 이동 (960,1080)
- Then ⓐ 화면: (960,0) 팔 img `UP`, 펜 손 transform = `penTransformCss(penTransform(어깨, armTransformFor({MOUSE_PEN, 모니터, (960,0), anchor (520,530), atRest false}), (389,492), 202×154))` ≈ (−27.56, −141.40, 45°), `scale` 없음, left/top/크기/원점 불변 / **(v1.2 개정, CR-027)** 왼 누름 → 팔 img `u:mouse_left`·펜 손 `u:pen_down_1`·`.jellyWrap` `jellyWrap jellyAlt`, 뗌 → 팔 `u:mouse_base`·손 `u:pen_up`·`jellyWrap` / 오른 누름 → 팔 `u:mouse_right`·손 `u:pen_down_0`·`jellyWrap jelly`, 뗌 → `u:mouse_base`·`u:pen_up`·`jellyWrap` — 펜 손은 같은 노드, 클릭 동안 transform·left/top/크기/원점 불변 / (960,1080) 팔 `DOWN`, 손 ≈ (27.60, 118.56, −45°) ⓑ 상태: 끝에 커서 (960,1080)·버튼 `none`·`armAtRest false`·키·버튼 모두 뗌·`kbFrame 0`·`bounceSeq 2` ⓒ bridge: 조회 1회, `setSettings` 0회
- 개정 내용(v1.2, CR-027): 제목 「클릭 무반응」 → 「클릭 = 손 그림만(위치·각도 불변)」. 클릭 동안 손 `u:pen_up` 유지 기대를 R-26(design.md §10.8 규칙표 1·3) 기대로 바꿈, 끝 상태에 `bounceSeq 2`. 요구에 R-26, 설계에 design.md §6 P-4(CR-027)·§10.8 추가. 스펙 it 이름·단언 개정
- 스펙: `src/overlay/test/OverlayApp.pen.test.tsx`

### TC-199 · 젤리·부르르와 합성 — 애니메이션은 `.jellyWrap`에만, 반복 중 손 그림 불변 · 종류: 자동 · 요구: R-25, R-23, R-24 · 설계: design.md §10.7 젤리·부르르·손 그림 선택(자동 반복), design/components.md 배경 DOM 구조 (CR-025)·규칙 5·6
- Given 펜 모드 마운트, 키 모두 뗌, 이동 (960,0) 뒤(손 기울어진 상태)
- When 누름(1) → 반복 누름(`repeat true`) ×2 → 뗌(0)
- Then ⓐ 화면: 누름 → `.jellyWrap` class `jellyWrap jellyAlt`(단독 실행 값 — FLOW에서는 `bounceSeq` 짝에 따라 `jellyWrap jelly`일 수 있음), 펜 손 src `u:pen_down_1`(단독 실행 값 — FLOW에서는 `u:pen_down_0`) / 반복 → `jellyWrap shiver`, 펜 손 src는 누름 때와 같음 / 매 단계 `.jelly, .jellyAlt, .shiver, .bounce, .bounceAlt` 요소 = `.jellyWrap` 하나뿐, 펜 손 class `hand`·transform 불변·`.jellyWrap` 마지막 자식 / 뗌 → `jellyWrap`, `u:pen_up`, 키보드 `u:kb_up` ⓑ 상태: 반복 누름은 `kbFrame`·`specialHeld` 불변(손 그림 불변으로 관찰) ⓒ bridge: `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.pen.test.tsx`

### TC-200 · `pen_up` 없으면 기존 동작 불변 · 종류: 자동 · 요구: R-25, R-07, R-19, R-22 · 설계: design/functions.md §5.3 `isPenMode`(`pen_down_*`·`pen_key_*`만 → 펜 모드 아님)·`LayerStack` 렌더, design.md §4 `config.kbFrames`·§10.7 펜 모드
- Given `PARTIAL_PEN`(kb_down 3장·`key_space`·`pen_down_0`·`pen_key_space`, `pen_up` 없음)으로 마운트
- When 누름 → 뗌 → 누름 → 뗌 → 누름 → 스페이스 누름(2) → 모두 뗌 → 이동 (960,0) → 왼쪽 누름
- Then ⓐ 화면: `.jellyWrap` 자식 = `[armWrap, u:body, u:idle, u:kb_up]`, 키보드 img(= `.jellyWrap` 마지막 자식) src = `u:kb_down_1` → `u:kb_up` → `u:kb_down_2` → `u:kb_up` → `u:kb_down_0` → `u:key_space` → `u:kb_up` → `u:kb_up` → `u:kb_up`(kb_down 3장 순환), `u:pen*` img는 끝까지 없음 ⓑ 상태: `kbFrames` = 3(`kbDownFrameCount`) ⓒ bridge: 조회 1회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.pen.test.tsx`

### TC-201 · 표시 조건 — mouse null·모니터 없음·팔 그림 없음 · 종류: 자동 · 요구: R-25 · 설계: design/components.md 렌더 조건 `PenHand` 행, design.md §10.7 표시 조건, design/functions.md §5.3 `LayerStack` 렌더(펜 모드 판별 = 매니페스트)
- Given ① `SETTINGS.mouse = null` + `PEN_MANIFEST` ② 모니터 `[]` + `PEN_MANIFEST` ③ `PEN_NO_ARM`(마우스 파츠 없음) — 각각 새 마운트
- When ① 누름·뗌 ② 이동 (960,0) ③ 이동 (960,0)
- Then ⓐ 화면: ① `.jellyWrap` 자식 = `[u:body, u:idle, u:kb_up]`, 펜 손 없음, 누름 중에도 키보드 `u:kb_up`(펜 모드는 매니페스트 기준) ② `.armWrap` 없음, `.jellyWrap` 자식 = `[u:body, u:idle, u:kb_up, u:pen_up]`, 이동 뒤에도 손 transform `translate(0px, 0px) rotate(0deg)`·left 389·top 492 ③ `.armWrap` 없음, 손 transform = TC-198의 (960,0) 값과 같은 문자열 ⓑ 상태: 해당 없음(각 마운트 독립) ⓒ bridge: 마운트마다 조회 1회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.pen.test.tsx`

### TC-202 · 설정·이미지 변경 반영 — penPos·펜 모드 켜짐/꺼짐·kbFrames 재계산 · 종류: 자동 · 요구: R-25 · 설계: design.md §6 P-6(CR-025)·§4 `config.kbFrames`·§10.7 기본 위치 규칙, design/functions.md §5.5 `resolvePenPos`, requirements §3 `settings://changed`·`assets://changed` 행
- Given 펜 모드 마운트, 키 모두 뗌, penPos (389,492)
- When `settings://changed`(penPos (100,50)) → `settings://changed`(penPos null) → `assets://changed`(`NO_PEN`) → 누름·뗌 ×3 → `assets://changed`(`PEN_MANIFEST`) → 누름·뗌 ×2
- Then ⓐ 화면: 펜 손 같은 노드가 left 100px·top 50px → 419px·453px(기본 규칙: `AREA` 중심 (520,530) − (101,77)), 원점 `101px 77px` 유지 / `NO_PEN` → 펜 손 없음·`.jellyWrap` 마지막 자식 = 키보드 img, 세 번 누름의 키보드 src 집합 = {`u:kb_down_0`, `u:kb_down_1`, `u:kb_down_2`}(kbFrames 3), 뗄 때마다 `u:kb_up` / `PEN_MANIFEST` → 펜 손 다시 `.jellyWrap` 마지막 자식·419/453, 누름 중 키보드 `u:kb_up`, 두 번 누름의 손 src 집합 = {`u:pen_down_0`, `u:pen_down_1`}(kbFrames 2), 뗄 때마다 `u:pen_up` ⓑ 상태: 끝에 펜 모드·penPos null(기본 위치) ⓒ bridge: `getAssetManifest`·`getSettings` 추가 조회 0회(이벤트 페이로드만 사용), `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.pen.test.tsx`

#### 수동 — `src/overlay/test/manual-checklist.md`

### TC-203 · 펜 모드 체감 — 팔 끝 추종·기울기·크기 불변·키보드 입력에 손만 바뀜·kb 고정 · 종류: 수동(MC-20) · 요구: R-25, R-19, R-22, R-23, R-24 · 설계: design.md §10.7 전체(펜 모드·키보드 고정·손 그림 선택·위치·변형 수학·기본 위치·z 순서·젤리·부르르·표시 조건), requirements §3 펜 슬롯·`penPos` 행
- Given 실제 앱(CR-025 core·bridge·ui 적용 빌드 — 펜 슬롯 등록·`penPos` 저장 수단은 settings CR-026 또는 앱 데이터 폴더·settings.json 편집), 몸통·상태·kb_up·kb_down 2장 이상·팔(마우스 파츠 3장)·`pen_up`·`pen_down_0`·`pen_down_1`(같은 크기) 등록, 메모장 포커스
- When MC-20 절차 ①~⑨
- Then ⓐ 화면: 시작 직후 손은 penPos 자리에 똑바로(0°) 몸·키보드 위에 보임, 마우스를 움직이면 손이 팔 끝에 붙어 따라가고 팔과 같은 각도로 기울며 팔이 늘거나 줄어도 손 크기는 그대로, 타자를 치면 손 그림만 `pen_down` 순환(글씨 쓰듯)·키보드 쪽 그림은 `kb_up` 그대로, 특수 키 그림(`pen_key_*` 등록 시)·없으면 누름 그림, 클릭은 팔 그림이 바뀌고 손 그림도 누름 그림으로 바뀌며 손 위치·각도는 그대로(v1.2 개정, CR-027 — 상세 판정은 TC-222·MC-21), 젤리·부르르를 손도 함께 받음, 설정에서 손 위치를 옮기면 재시작 없이 반영, `pen_up`을 지우면 키보드가 기존대로 움직이고 펜 손 사라짐 ⓑ 상태: `settings.json`의 변화는 `mouse.penPos`뿐 ⓒ core·bridge: 기존 `input://*`·`settings://changed`·`assets://changed`만, 새 command·event 없음, 로그·콘솔에 키 정보 없음

### 추가 TC (v1.2 — CR-027: R-26 펜 모드에서 마우스 클릭 = 키 누름 · 손 `pen_down_N`(키와 같은 순환 카운터) + 젤리 · 모두 떼야 `pen_up`)

공통 전제 보충(§0.1·v0.8~v1.1 보충에 더한다 — 서로 어긋나면 이 절이 우선)
- **규칙 스위치**: 상태기계 설정 `clickPress`(선택 필드, 없으면 `false`). 펜 모드 = `clickPress: true`. 순수 스펙의 설정 `PEN` = `{ idleMs: 300000, kbFrames: 2, clickPress: true }`, `PLAIN` = `{ idleMs: 300000, kbFrames: 2 }`(필드 없음), `OFF` = `{ …, clickPress: false }`. T0 = 1000000.
- **짝·프레임 규칙**: 키·버튼이 하나도 안 눌린 상태의 첫 누름(키든 펜 모드 클릭이든)과 특수 키 새 누름만 `bounceSeq` +1. 펜 모드 클릭 새 누름은 키 누름과 같은 `kbFrame` 카운터를 +1. 뗌·중복 누름·반복 누름은 둘 다 불변. 렌더 관찰: `bounceSeq` 홀수 = `jellyWrap jellyAlt`, 짝수 = `jellyWrap jelly`(누름 중일 때만), 손 그림 `pen_down_{kbFrame}`(kbFrames 2).
- **화면 픽스처**: `OverlayApp.penClick.test.tsx`는 v1.1 `OverlayApp.pen.test.tsx`와 같은 픽스처(`PEN_MANIFEST`·`NO_PEN`·`PARTIAL_PEN`·`MOUSE_PEN` penPos (389,492)·모니터 [1920×1080]·기준점 (520,530))와 같은 bridge mock을 쓴다. 이동 없이 클릭하므로 팔·손은 쉬는 자세(`armAtRest true` — 클릭은 바꾸지 않는다): 팔 `REST`, 손 transform `translate(0px, 0px) rotate(0deg)`. 관찰 헬퍼 `penChecker` = 한 단계마다 펜 손 같은 노드·src·class `hand`, `.jellyWrap` 같은 노드·class, 팔 img src, 키보드 img `u:kb_up`·class `layer`, 손 transform·left/top/크기/원점 불변, 애니메이션 클래스(`.jelly, .jellyAlt, .shiver, .bounce, .bounceAlt`)가 붙은 요소는 `.jellyWrap`뿐.
- 「재생 없음」의 관찰 = `.jellyWrap` class 문자열이 앞 단계와 같음(design.md §10.3 — class가 바뀔 때만 재생).
- §0.3 보충 — **CR-027 red**(CR 대장 「설계 완료」, 소스 미적용·선행 조건 없음): 실패 예상 = TC-001(개정 — `clickHeld` 없음), TC-198(개정 — 클릭에 손 `u:pen_up` 유지), TC-204~TC-221 전부. 새 export(`isPressing`·`ClickButton`)가 없으면 `inputMachine.click.test.ts`는 import 값 `undefined`로 실패하고 `MachineConfig.clickPress`는 `yarn tsc --noEmit` 과잉 속성 오류다. `penClick.test.tsx`·`OverlayApp.penClick.test.tsx`는 클릭에 손 그림·젤리가 바뀌지 않아 실패한다. 이 문서 작성 시 소스는 export 이름만 확인했다(`DEFAULT_MACHINE_CONFIG`은 있음, `isPressing` 없음).

#### v1.2 개정표 — 기존 TC 기대값 변경(이 표가 해당 TC 본문과 앞 개정표의 같은 항목을 대체한다)

| TC | 스펙 | 개정 내용(CR-027) |
|---|---|---|
| TC-001 | `inputMachine.transitions.test.ts` | Then ⓑ 초기 상태 `toEqual`에 `clickHeld: []` 추가. 요구 R-26 추가 |
| TC-198 | `OverlayApp.pen.test.tsx` | 클릭 동안 손 `u:pen_up` 유지 → 왼 누름 `u:pen_down_1`·`jellyWrap jellyAlt` / 오른 누름 `u:pen_down_0`·`jellyWrap jelly` / 뗌 `u:pen_up`·`jellyWrap`, transform·위치 불변. 끝 `bounceSeq 2`. 요구 R-26 추가(본문 반영) |
| TC-203 | 수동(MC-20 ⑥) | 「클릭은 팔 그림만, 손 그림 불변」 → 「팔 그림 교체 + 손 누름 그림·젤리, 손 위치·각도 불변」(상세 판정 MC-21). 요구 R-26 추가 |
| TC-FLOW-09 | — | Step 2(TC-198) 종료 `bounceSeq 0` → `2`, Step 3(TC-197) 종료 `bounceSeq 5` → `7`, Step 4(TC-199) 종료 `bounceSeq 6` → `8`(누름 class `jellyWrap jelly`·손 `pen_down_0`은 그대로), Step 6 「클릭 무반응」 → 「클릭 = 손 누름 그림」 |
| TC-013·TC-062·TC-163·TC-200 | 각 스펙 | 기대 불변 — 설정에 `clickPress`가 없거나(순수 스펙) 매니페스트에 `pen_up`이 없어(`PARTIAL_PEN`) `clickHeld`가 늘 `[]`이다(design/functions.md §5.2 「펜 모드가 아니면 결과 동일」) |
| TC-138·TC-168 | 각 스펙 | 기대 불변 — 「도중 상태의 키 집합 = 초기 상태 키 집합」은 `clickHeld`가 초기에도 있으므로 계속 성립 |
| TC-189·TC-190·TC-194 | 각 스펙 | 기대 불변 — `createInitialState` 기반이라 `clickHeld []`, `isPressing` = `kbDown` |

#### 상태기계 — `src/state/inputMachine.ts` (design/functions.md §5.2 CR-027 행)

스펙: `src/overlay/test/inputMachine.click.test.ts`. 관찰값 `view` = `{clickHeld, kbFrame, bounceSeq, mouse.button, isPressing, bouncePhase, wrapMotion}`, `keyFields` = `{heldCount, kbDown, specialHeld, repeating, lastRepeatAt, shiverSeq}`.

### TC-204 · 초기 `clickHeld`·`DEFAULT_MACHINE_CONFIG.clickPress`·`isPressing` · 종류: 자동 · 요구: R-26 · 설계: design.md §4 `machine` 초기값·`config`, design/functions.md §5.2 `ClickButton`·`MachineState.clickHeld`·`MachineConfig.clickPress`·`isPressing`·`bouncePhase`(CR-027 예)
- Given `createInitialState(T0)`
- When 초기 상태와 필드를 덮어쓴 상태(`kbDown true` / `clickHeld ['left']` / `['left','right']` / `mouse.button 'left'`·`clickHeld []`)에 `isPressing`·`bouncePhase`를 부르고 `DEFAULT_MACHINE_CONFIG`를 읽음
- Then ⓐ 화면: 해당 없음(순수 함수) ⓑ 상태: 초기 `clickHeld []`·`isPressing false`·`bouncePhase null`·`wrapMotion null`, `DEFAULT_MACHINE_CONFIG` = `{idleMs 300000, kbFrames 1, clickPress false}`, `isPressing` = true·true·true·**false**(`mouse.button`은 판정에 안 씀), `bouncePhase({clickHeld ['left'], bounceSeq 1})` = 1·`({clickHeld ['right'], bounceSeq 2})` = 0·`({kbDown true, bounceSeq 3})` = 1 ⓒ bridge: 호출 없음(순수 함수)
- 스펙: `src/overlay/test/inputMachine.click.test.ts`

### TC-205 · 규칙 1·2·3 — 첫 클릭 → 프레임+젤리, 뗌 → 해제, 좌우 번갈아 짝 교대 · 종류: 자동 · 요구: R-26, R-23 · 설계: design/functions.md §5.2 `onMouseButton` ①②④, design.md §10.8 규칙표 1·2·3·상태기계 요지, §10.3 젤리 트리거(CR-027)
- Given 초기 상태, 설정 `PEN`
- When 왼 누름(T0+10) → 왼 뗌 → 왼 누름 → 왼 뗌 → 오른 누름 → 오른 뗌
- Then ⓐ 화면: 해당 없음(렌더는 TC-214) ⓑ 상태: `view` = `{['left'], kbFrame 1, bounceSeq 1, 'left', true, 1, 1}` → `{[], 1, 1, 'none', false, null, null}` → `{['left'], 0, 2, 'left', true, 0, 0}` → `{[], 0, 2, 'none', false, null, null}` → `{['right'], 1, 3, 'right', true, 1, 1}` → `{[], 1, 3, 'none', false, null, null}`, 첫 누름 `lastInputAt T0+10`·`layer idle`, 모든 단계 `keyFields` = 초기값(`heldCount 0`·`kbDown false`·`specialHeld []`·`repeating false`·`lastRepeatAt 0`·`shiverSeq -1`) ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/inputMachine.click.test.ts`

### TC-206 · 설계 예 연쇄·좌우 동시 누름 한쪽 뗌(규칙 13)·중복 누름·안 눌린 버튼 뗌 · 종류: 자동 · 요구: R-26, R-09 · 설계: design/functions.md §5.2 `onMouseButton` ②③④·예(「왼 누름 → 오른 누름 → 왼 뗌 → 오른 뗌 → 다시 왼 누름」)·`MachineState.clickHeld`(중복 없음·길이 ≤ 2), design.md §10.8 규칙표 13
- Given 초기 상태, 설정 `PEN`
- When ① 왼 누름 → 오른 누름 → 왼 뗌 → 오른 뗌 → 왼 누름 ② (새 상태) 왼 누름 → 오른 누름 → 오른 뗌 ③ 왼 누름 상태에서 왼 누름 다시(T0+15) ④ 왼 누름 상태에서 오른 뗌
- Then ⓐ 화면: 해당 없음 ⓑ 상태: ① 오른 누름 뒤 `{['left','right'], 0, 1, 'right', true, 1, 1}`(재생 없음) → 왼 뗌 `{['right'], 0, 1, 'none', true, 1, 1}` → 오른 뗌 `{[], 0, 1, 'none', false, null, null}` → 왼 누름 `{['left'], 1, 2, 'left', true, 0, 0}` ② `{['left'], 0, 1, 'none', true, 1, 1}`(누름 유지, `mouse.button`은 as-built `'none'`) ③ `{['left'], 1, 1, 'left', true, 1, 1}`·`lastInputAt T0+15`(목록·카운터 불변) ④ `{['left'], 1, 1, 'none', true, 1, 1}`, 모든 단계 `clickHeld` 길이 ≤ 2·중복 없음 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/inputMachine.click.test.ts`

### TC-207 · 비펜 모드(규칙 14)·뗌은 모드 무관 제거·모드 전환 · 종류: 자동 · 요구: R-26, R-09, R-07 · 설계: design/functions.md §5.2 `onMouseButton` ②③·`MachineConfig.clickPress`(없으면 false), design.md §10.8 적용 조건·규칙표 14·모드 전환(수용)
- Given 초기 상태, 설정 `PLAIN`·`OFF` 각각 / `PEN`↔`PLAIN` 전환
- When ① `PLAIN`·`OFF` 각각: 왼 누름 → (오른 누름 → 오른 뗌 → 왼 뗌) / 왼 누름 상태에서 일반 키 누름(1) ② `PEN`으로 왼 누름 → `PLAIN`으로 왼 뗌 ③ `PLAIN`으로 왼 누름 → `PEN`으로 왼 뗌 → `PEN`으로 왼 누름
- Then ⓐ 화면: 해당 없음 ⓑ 상태: ① 왼 누름 `{[], 0, 0, 'left', false, null, null}`(기존 — 버튼만), 이어진 입력 뒤 `{[], 0, 0, 'none', false, null, null}`, 버튼 누른 채 키 누름 `{[], kbFrame 1, bounceSeq 1, 'left', true, 1, 1}`(첫 누름 젤리) ② `{[], 1, 1, 'none', false, null, null}`(모드가 꺼져도 뗌은 제거, 카운터 불변) ③ 누름 뒤 `isPressing false`, 뗌 뒤 `{[], 0, 0, 'none', false, null, null}`, 다음 누름 `{['left'], 1, 1, 'left', true, 1, 1}` ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/inputMachine.click.test.ts`

### TC-208 · 규칙 4~7 — 일반 키와 겹침(키 누른 채 클릭·키만 뗌·버튼 뗌·클릭 누른 채 키) · 종류: 자동 · 요구: R-26, R-23, R-07 · 설계: design/functions.md §5.2 바운스 재생 카운터 ⓐ(`!isPressing(state)`, CR-027)·`onMouseButton` ④(갱신 전 `isPressing`)·`wrapMotion` ②, design.md §10.8 규칙표 4·5·6·7
- Given 초기 상태, 설정 `PEN`
- When 키 누름(1) → 왼 누름 → 키 뗌(0) → 왼 뗌 → 왼 누름 → 키 누름(1) / 대조: 규칙 6 뒤 상태에서 설정 `PLAIN`으로 왼 누름 → 키 누름(1)
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 키 누름 `kbFrame 1·bounceSeq 1` → 왼 누름 `{['left'], 0, 1, 'left', true, 1, 1}`·`keyFields` = 키 누름 뒤와 같음(재생 없음) → 키 뗌 `kbDown false`·`{['left'], 0, 1, 'left', true, 1, 1}`(누름 유지) → 왼 뗌 `{[], 0, 1, 'none', false, null, null}` → 왼 누름 `kbFrame 1·bounceSeq 2·phase 0` → 키 누름 `kbDown true·heldCount 1`·`{['left'], 0, 2, 'left', true, 0, 0}`(ⓐ 불성립 — 재생 없음) / 대조 `clickHeld []·kbFrame 1·bounceSeq 2`(비펜 모드는 키 누름이 첫 누름) ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/inputMachine.click.test.ts`

### TC-209 · 규칙 8·9·10 — 특수 키와 겹침 양방향 · 종류: 자동 · 요구: R-26, R-22, R-23 · 설계: design/functions.md §5.2 바운스 재생 카운터 ⓑ·`onMouseButton` ④(`specialHeld` 불변)·`currentSpecial`, design.md §10.8 규칙표 8·9·10, §10.6 3·6행
- Given 초기 상태, 설정 `PEN`
- When ① 왼 누름 → 스페이스 누름(1,'space') → 스페이스 뗌(0,'space') → 왼 뗌 ② (새 상태) 스페이스 누름(1,'space') → 왼 누름 → 스페이스 뗌(0,'space') → 왼 뗌
- Then ⓐ 화면: 해당 없음 ⓑ 상태: ① 스페이스 누름 `currentSpecial 'space'`·`{['left'], 0, 2, 'left', true, 0, 0}`(ⓑ 재생) → 뗌 `specialHeld []`·`{['left'], 0, 2, 'left', true, 0, 0}` → 왼 뗌 `clickHeld []·isPressing false·phase null` ② 스페이스 누름 `kbFrame 1·bounceSeq 1` → 왼 누름 `specialHeld ['space']`·`currentSpecial 'space'`·`{['left'], 0, 1, 'left', true, 1, 1}`(재생 없음, 프레임 +1) → 스페이스 뗌 `currentSpecial null`·`{['left'], 0, 1, 'left', true, 1, 1}` → 왼 뗌 `clickHeld []·phase null` ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/inputMachine.click.test.ts`

### TC-210 · 규칙 11·12 — 부르르 중 클릭·키 뗌, 클릭은 부르르 비생성 · 종류: 자동 · 요구: R-26, R-24 · 설계: design/functions.md §5.2 `onMouseButton` ④(`repeating`·`lastRepeatAt`·`shiverSeq` 불변)·`isRepeating`(CR-027 불변 — `kbDown` 기준)·`wrapMotion` ①~③, design.md §10.8 규칙표 11·12
- Given 초기 상태, 설정 `PEN`
- When ① 키 누름(1, T0+10) → 반복 누름(`repeat true`, T0+510) → 왼 누름(T0+600) → 키 뗌(0, T0+700) → 왼 뗌 ② (새 상태) 왼 누름 T0+10·T0+510·T0+1010(같은 버튼 3회) ③ 직접 구성 `{repeating true, kbDown false, clickHeld ['left'], bounceSeq 1}`
- Then ⓐ 화면: 해당 없음 ⓑ 상태: ① 반복 뒤 `wrapMotion 'shiver'` → 왼 누름 `repeating true`·`lastRepeatAt T0+510`·`shiverSeq 1`·`isRepeating true`·`{['left'], 0, 1, 'left', true, 1, 'shiver'}` → 키 뗌 `repeating false`·`isRepeating false`·`{['left'], 0, 1, 'left', true, 1, null}`(`bounceSeq 1 = shiverSeq` — 젤리 되살리지 않음) → 왼 뗌 `clickHeld []`·`motion null` ② `repeating false`·`lastRepeatAt 0`·`shiverSeq -1`·`isRepeating false`·`wrapMotion 1` ③ `isRepeating false`, `wrapMotion 1` ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/inputMachine.click.test.ts`

### TC-211 · 다른 입력 불변·불변성·유휴 깨어남·입력 비보관 · 종류: 자동 · 요구: R-26, R-22, R-05 · 설계: design/functions.md §5.2 `MachineState.clickHeld`(「`mouseMove`·`key`·`tick`은 바꾸지 않는다」)·`onMouseButton`(「모든 경우 새 객체, `clickHeld`는 바뀔 때 새 배열」)·`tick`(바뀐 것 없으면 같은 참조)·기록 금지(CR-027), design.md §10.8 유지되는 것(유휴 판정 = `wake`)·입력 비보관
- Given 설정 `PEN`, 왼 누름(T0+10) 상태 H(`clickHeld ['left']`·`kbFrame 1`·`bounceSeq 1`)
- When ① H에서 이동 / 키 누름·뗌 / `tick(T0+1000)` / `tick(T0+300010)` → 쉬는중에서 오른 누름(T0+400000) ② H에서 왼 뗌 / 오른 누름 ③ 초기 상태에서 왼 누름 → 오른 누름 → 왼 누름 → 오른 뗌 → 왼 뗌
- Then ⓐ 화면: 해당 없음 ⓑ 상태: ① `clickHeld ['left']` 유지 / 유지 / **같은 참조** / `layer 'rest'`·`['left']` 유지 → `layer 'idle'`·`lastInputAt T0+400000`·`clickHeld ['left','right']`·`kbFrame 0`·`bounceSeq 1`(이미 누름 중 — 재생 없음) ② 새 객체·`clickHeld []`·배열이 H의 배열과 다른 참조, H의 `clickHeld`는 `['left']` 그대로(불변) / 새 배열, H 그대로 ③ 매 단계 상태 키 집합 = 초기 상태 키 집합(이력·횟수·시각 필드 없음), `clickHeld` 길이 ≤ 2, 값은 `'left'`·`'right'`뿐, 끝 `[]` ⓒ bridge: 호출 없음(순수 함수 — `console`·저장소 없음)
- 스펙: `src/overlay/test/inputMachine.click.test.ts`

#### 손 그림 선택·렌더 — `src/overlay/components/PenHand.tsx` (design/functions.md §5.5 CR-027)

스펙: `src/overlay/test/penClick.test.tsx`. 매니페스트 `PEN` = 몸통·대기·kb_up·key_space·마우스 파츠 3 + `pen_up`·`pen_down_0`·`pen_down_1`·`pen_key_space`(202×154). `PenHand` props = v1.1 `PenHand.test.tsx` 기본값(어깨 620,530·`AREA`·penPos (389,492)·모니터 1920×1080·기준점 520,530)에 커서 (960,0)·`atRest false`.

### TC-212 · `pickPenEntry` ② `isPressing` — 클릭 예·특수 키 유지·키 뗀 뒤 버튼 유지 · 종류: 자동 · 요구: R-26, R-25, R-22 · 설계: design/functions.md §5.5 `pickPenEntry` ②·CR-027 예, design.md §10.7 손 그림 선택(CR-027 개정)·§10.8 규칙표 1~6·9·10, §10.1 pen 행(누름 판정 = `isPressing`)
- Given `PEN`, 초기 상태, 설정 `{idleMs 300000, kbFrames 2, clickPress true}`
- When `reduce` 연쇄: 왼 누름 → 왼 뗌 → 오른 누름 → 오른 뗌 → 스페이스 누름 → 왼 누름 → 스페이스 뗌 → 왼 뗌 → 키 누름 → 왼 누름 → 키 뗌 → 왼 뗌(각 단계 `pickPenEntry(PEN, 상태)`) / 직접 구성 상태 / 설정 `clickPress` 없음으로 왼 누름
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 손 그림 url = `u:pen_up` → `u:pen_down_1` → `u:pen_up` → `u:pen_down_0` → `u:pen_up` → `u:pen_key_space` → `u:pen_key_space`(클릭은 특수 키 그림을 가리지 않음) → `u:pen_down_0` → `u:pen_up` → `u:pen_down_1` → `u:pen_down_0` → `u:pen_down_0`(키만 뗌 — 버튼 유지) → `u:pen_up`, `kbFrame` = 0·1·1·0·0·1·0·0·0·1·0·0·0 / 직접 구성: `{clickHeld ['right'], kbFrame 0}` → `u:pen_down_0`, `{['left','right'], 1}` → `u:pen_down_1`, `pen_up`만 있는 매니페스트 → `u:pen_up`, `pen_up` 없는 매니페스트 → `undefined`, `{mouse.button 'left', clickHeld []}` → `u:pen_up`, `{mouse.button 'none', clickHeld ['left'], kbFrame 0}` → `u:pen_down_0`(`mouse.button`은 읽지 않음) / `clickPress` 없음 → `u:pen_up` ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penClick.test.tsx`

### TC-213 · `PenHand` — `clickHeld`만으로 누름 그림, 같은 img의 src만 교체 · 종류: 자동 · 요구: R-26, R-25 · 설계: design/functions.md §5.5 `PenHand` 렌더 ②⑥·Props(`machine`만 읽음 — `isPressing`, `mouse.button` 안 읽음), design/components.md §3 `PenHand` 행(CR-027 — props 변경 없음)
- Given 기본 props(`machine` = 초기 상태), 커서 (960,0)·`atRest false`
- When `machine`만 바꿔 rerender: `{clickHeld ['left'], kbFrame 1}` → `{['left','right'], 0}` → `{[], 0, mouse.button 'left'}` → `{['right'], 1, mouse.button 'none'}` → 초기 상태
- Then ⓐ 화면: 자식 = img 하나, 같은 img 노드의 src = `u:pen_down_1` → `u:pen_down_0` → `u:pen_up` → `u:pen_down_1` → `u:pen_up`, class `hand`, transform·left 389px·top 492px·202×154·원점 `101px 77px`는 처음 렌더와 같음, `.jelly, .jellyAlt, .shiver` 요소 0개 ⓑ 상태: 해당 없음(순수 렌더) ⓒ bridge: 호출 없음(bridge mock 빈 모듈)
- 스펙: `src/overlay/test/penClick.test.tsx`

#### 화면 통합 — `OverlayApp` (design.md §4 `config.clickPress`·§6 P-4(CR-027)·§10.8, design/components.md §3 `OverlayApp`)

스펙: `src/overlay/test/OverlayApp.penClick.test.tsx`. 마운트 조회 mock = v1.1과 같음. 「조회 1회」 = `getSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor` 각 1회·`getScreenBounds` 0회. 각 TC의 Given 「키·버튼 모두 뗌·`kbFrame 0`·`bounceSeq` 짝수」는 새 마운트(`kbFrame 0`·`bounceSeq 0`)가 만족한다(FLOW에서는 앞 Step 종료 상태).

### TC-214 · 규칙 1·2·3 통합 — 첫 클릭 pen_down + 젤리, 뗌 pen_up, 좌우 왔다갔다, 클릭 파츠·kb_up·쉬는 자세 유지 · 종류: 자동 · 요구: R-26, R-23, R-25, R-09, R-22 · 설계: design.md §4 `config.clickPress = isPenMode(manifest)`·§6 P-4(CR-027)·§7 `input://mouse-button` 행(새 계약 없음)·§10.1 pen 행·§10.3 젤리 트리거(CR-027)·§10.8 규칙표 1·2·3·유지되는 것·젤리 길이·입력 비보관, design/components.md §3 `OverlayApp`·`PenHand` 행(CR-027)
- Given `PEN_MANIFEST`로 마운트(T0), 키·버튼 모두 뗌·`kbFrame 0`·`bounceSeq` 짝수, 이동 없음(`armAtRest true`)
- When `input://mouse-button` 순서: 왼 누름 → 왼 뗌 → 왼 누름 → 왼 뗌 → 오른 누름 → 오른 뗌
- Then ⓐ 화면: (펜 손 src · `.jellyWrap` class · 팔 img src) = 시작 (`u:pen_up`·`jellyWrap`·`u:mouse_base`) → (`u:pen_down_1`·`jellyWrap jellyAlt`·`u:mouse_left`) → (`u:pen_up`·`jellyWrap`·`u:mouse_base`) → (`u:pen_down_0`·`jellyWrap jelly`·`u:mouse_left`) → (`u:pen_up`·`jellyWrap`·`u:mouse_base`) → (`u:pen_down_1`·`jellyWrap jellyAlt`·`u:mouse_right`) → (`u:pen_up`·`jellyWrap`·`u:mouse_base`), 매 단계 `penChecker`(키보드 `u:kb_up`·손 transform `translate(0px, 0px) rotate(0deg)`·left 389px·top 492px·202×154·원점 `101px 77px`·애니메이션 클래스는 `.jellyWrap`에만), 끝에 팔 transform `REST`, `.jelly, .jellyAlt, .shiver` 요소 0개 ⓑ 상태: 끝에 키·버튼 모두 뗌, `kbFrame 1`·`bounceSeq 3`, `armAtRest true`(클릭은 바꾸지 않음), `console.log/info/debug` 0회 ⓒ bridge: `onMouseButton` 구독 1회(기존 이벤트 — 새 command·event 없음, 페이로드 `{button, pressed, ts}`만), 조회 1회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.penClick.test.tsx`

### TC-215 · 규칙 4~7 통합 — 일반 키와 겹침 · 종류: 자동 · 요구: R-26, R-23 · 설계: design.md §10.8 규칙표 4·5·6·7, §10.3 젤리 트리거(「누름이 유지된 채 추가 누름은 재생 안 함」), design/functions.md §5.2 ⓐ·`wrapMotion` ②·§5.5 `pickPenEntry` ②
- Given 펜 모드 마운트, 키·버튼 모두 뗌·`kbFrame 0`·`bounceSeq` 짝수
- When 키 누름(1) → 왼 누름 → 키 뗌(0) → 왼 뗌 → 왼 누름 → 키 누름(1) → 키 뗌(0) → 왼 뗌
- Then ⓐ 화면: (손·`.jellyWrap`·팔) = (`u:pen_down_1`·`jellyWrap jellyAlt`·`u:mouse_base`) → (`u:pen_down_0`·`jellyWrap jellyAlt`·`u:mouse_left`) → (`u:pen_down_0`·`jellyWrap jellyAlt`·`u:mouse_left`) → (`u:pen_up`·`jellyWrap`·`u:mouse_base`) → (`u:pen_down_1`·`jellyWrap jelly`·`u:mouse_left`) → (`u:pen_down_0`·`jellyWrap jelly`·`u:mouse_left`) → (`u:pen_down_0`·`jellyWrap jelly`·`u:mouse_left`) → (`u:pen_up`·`jellyWrap`·`u:mouse_base`), 매 단계 `penChecker` ⓑ 상태: 끝에 키·버튼 모두 뗌, `kbFrame 0`·`bounceSeq` +2(짝수 유지) ⓒ bridge: `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.penClick.test.tsx`

### TC-216 · 규칙 8·9·10 통합 — 특수 키와 겹침 양방향 · 종류: 자동 · 요구: R-26, R-22, R-23, R-25 · 설계: design.md §10.8 규칙표 8·9·10, §10.7 키보드 레이어 고정·손 그림 선택, design/functions.md §5.2 ⓑ·§5.5 `pickPenEntry` ③
- Given 펜 모드 마운트, 키·버튼 모두 뗌·`kbFrame 0`·`bounceSeq` 짝수
- When 왼 누름 → 스페이스 누름(1,'space') → 스페이스 뗌(0,'space') → 왼 뗌 → 스페이스 누름(1,'space') → 왼 누름 → 스페이스 뗌(0,'space') → 왼 뗌
- Then ⓐ 화면: (손·`.jellyWrap`·팔) = (`u:pen_down_1`·`jellyWrap jellyAlt`·`u:mouse_left`) → (`u:pen_key_space`·`jellyWrap jelly`·`u:mouse_left`) → (`u:pen_down_0`·`jellyWrap jelly`·`u:mouse_left`) → (`u:pen_up`·`jellyWrap`·`u:mouse_base`) → (`u:pen_key_space`·`jellyWrap jellyAlt`·`u:mouse_base`) → (`u:pen_key_space`·`jellyWrap jellyAlt`·`u:mouse_left`) → (`u:pen_down_0`·`jellyWrap jellyAlt`·`u:mouse_left`) → (`u:pen_up`·`jellyWrap`·`u:mouse_base`), 키보드 img는 매 단계 `u:kb_up`(`key_space` 안 보임) ⓑ 상태: 끝에 모두 뗌, `kbFrame 0`·`bounceSeq` +3(홀수) ⓒ bridge: `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.penClick.test.tsx`

### TC-217 · 규칙 11·12 통합 — 부르르 중 클릭은 부르르 유지, 키 뗌은 젤리 되살리지 않음, 클릭은 부르르 비생성 · 종류: 자동 · 요구: R-26, R-24, R-23 · 설계: design.md §10.8 규칙표 11·12, §10.3 부르르 규칙 2, design/functions.md §5.2 `isRepeating`(불변)·`wrapMotion` ①③, `onMouseButton` ③(중복 누름)
- Given 펜 모드 마운트, 키·버튼 모두 뗌·`kbFrame 0`·`bounceSeq` 짝수
- When 키 누름(1) → 반복 누름(`repeat true`) → 왼 누름 → 키 뗌(0) → 왼 뗌 → 왼 누름 → 왼 누름(같은 버튼 다시) → 가짜 시계 1000ms 진행 → 왼 뗌
- Then ⓐ 화면: (손·`.jellyWrap`·팔) = (`u:pen_down_1`·`jellyWrap jellyAlt`·`u:mouse_base`) → (`u:pen_down_1`·`jellyWrap shiver`·`u:mouse_base`) → (`u:pen_down_0`·`jellyWrap shiver`·`u:mouse_left`) → (`u:pen_down_0`·`jellyWrap`·`u:mouse_left`) → (`u:pen_up`·`jellyWrap`·`u:mouse_base`) → (`u:pen_down_1`·`jellyWrap jelly`·`u:mouse_left`) → 같음 → 같음(1000ms 뒤에도 `shiver` 없음) → (`u:pen_up`·`jellyWrap`·`u:mouse_base`), 매 단계 `penChecker` ⓑ 상태: 끝에 모두 뗌, `kbFrame 1`·`bounceSeq` +2 ⓒ bridge: `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.penClick.test.tsx`

### TC-218 · 규칙 13 통합 — 좌·우 동시 누름에서 한쪽 뗌 · 종류: 자동 · 요구: R-26, R-09 · 설계: design.md §10.8 규칙표 13(클릭 파츠는 as-built `mouse.button 'none'` → `mouse_base`), design/functions.md §5.2 `MachineState.clickHeld`(`mouse.button`과 별개)
- Given 펜 모드 마운트, 키·버튼 모두 뗌·`kbFrame 0`·`bounceSeq` 짝수
- When 왼 누름 → 오른 누름 → 오른 뗌 → 왼 뗌 → 오른 누름 → 왼 누름 → 왼 뗌 → 오른 뗌
- Then ⓐ 화면: (손·`.jellyWrap`·팔) = (`u:pen_down_1`·`jellyWrap jellyAlt`·`u:mouse_left`) → (`u:pen_down_0`·`jellyWrap jellyAlt`·`u:mouse_right`) → (`u:pen_down_0`·`jellyWrap jellyAlt`·`u:mouse_base`) → (`u:pen_up`·`jellyWrap`·`u:mouse_base`) → (`u:pen_down_1`·`jellyWrap jelly`·`u:mouse_right`) → (`u:pen_down_0`·`jellyWrap jelly`·`u:mouse_left`) → (`u:pen_down_0`·`jellyWrap jelly`·`u:mouse_base`) → (`u:pen_up`·`jellyWrap`·`u:mouse_base`), 매 단계 `penChecker` ⓑ 상태: 끝에 모두 뗌, `kbFrame 0`·`bounceSeq` +2 ⓒ bridge: `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.penClick.test.tsx`

### TC-219 · 규칙 14 통합 — 펜 모드 아님 = 클릭 파츠만 · 종류: 자동 · 요구: R-26, R-09, R-07, R-23 · 설계: design.md §4 `config.clickPress`(펜 모드 아님 = false)·§10.8 적용 조건·규칙표 14, design/functions.md §5.3 `isPenMode`
- Given ① `NO_PEN`으로 마운트 ② `PARTIAL_PEN`(`pen_up` 없음)으로 새 마운트
- When ① 왼 누름 → 오른 누름 → 키 누름(1) → 키 뗌(0) → 오른 뗌 → 왼 뗌 ② 왼 누름 → 왼 뗌 → 키 누름(1)
- Then ⓐ 화면: ① (`.jellyWrap` class · 키보드 img · 팔 img) = (`jellyWrap`·`u:kb_up`·`u:mouse_left`) → (`jellyWrap`·`u:kb_up`·`u:mouse_right`) → (`jellyWrap jellyAlt`·`u:kb_down_1`·`u:mouse_right`)(버튼을 누른 채 첫 키 누름 = 젤리, 클릭은 프레임을 넘기지 않음) → (`jellyWrap`·`u:kb_up`·`u:mouse_right`) → (`jellyWrap`·`u:kb_up`·`u:mouse_base`), 같은 `.jellyWrap` 노드, 펜 손 img 끝까지 없음 ② 클릭 동안 `jellyWrap`·`u:kb_up`·펜 손 없음, 키 누름 `jellyWrap jellyAlt`·`u:kb_down_1` ⓑ 상태: 해당 없음(각 마운트 독립, `kbFrames 3`) ⓒ bridge: 마운트마다 조회 1회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.penClick.test.tsx`

### TC-220 · 모드 전환 중 누른 버튼 · 종류: 자동 · 요구: R-26, R-25 · 설계: design.md §10.8 모드 전환(수용)·§6 P-6(`assets://changed` → `config` 재계산), design/functions.md §5.2 `onMouseButton` ②(뗌은 모드 무관 제거)
- Given 펜 모드 마운트, 키·버튼 모두 뗌·`kbFrame 0`·`bounceSeq 0`
- When 왼 누름 → `assets://changed`(`NO_PEN`) → 왼 뗌 → 왼 누름 → `assets://changed`(`PEN_MANIFEST`) → 왼 뗌 → 왼 누름 → 왼 뗌
- Then ⓐ 화면: 왼 누름 손 `u:pen_down_1`·`jellyWrap jellyAlt` → `NO_PEN` 펜 손 없음·같은 `.jellyWrap` 노드·class `jellyWrap jellyAlt` 그대로(새 재생 아님)·키보드 `u:kb_up` → 뗌 `jellyWrap` → 비펜 모드 누름 `jellyWrap` → `PEN_MANIFEST` 펜 손 `u:pen_up`(`.jellyWrap` 마지막 자식)·`jellyWrap`(등록 전부터 눌린 버튼은 누름 아님) → 뗌 `u:pen_up`·`jellyWrap` → 누름 `u:pen_down_0`·`jellyWrap jelly` → 뗌 `u:pen_up`·`jellyWrap` ⓑ 상태: 끝에 펜 모드·모두 뗌, `kbFrame 0`·`bounceSeq 2` ⓒ bridge: `getAssetManifest`·`getSettings` 추가 조회 0회(이벤트 페이로드만), `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.penClick.test.tsx`

### TC-221 · 쉬는중에서 펜 모드 클릭 → 깨어남·누름 그림·젤리, 쉬는 자세 유지 · 종류: 자동 · 요구: R-26, R-05, R-15 · 설계: design.md §10.8 유지되는 것(「`armAtRest`는 클릭으로 바뀌지 않는다」·「유휴 판정: 클릭은 기존처럼 `wake`만」)·§6 P-3, design/functions.md §5.1 `armAtRest` 규칙
- Given 펜 모드 마운트(T0), 입력 없음
- When 가짜 시계 300000ms 진행(T0+300000 tick) → 왼 누름 → 왼 뗌
- Then ⓐ 화면: 진행 뒤 `.jellyWrap` 자식 = `[armWrap, u:body, u:rest, u:kb_up, u:pen_up]`·`jellyWrap` → 누름 `[armWrap, u:body, u:idle, u:kb_up, u:pen_down_1]`·`jellyWrap jellyAlt`·손 transform `translate(0px, 0px) rotate(0deg)`·left 389px·top 492px·202×154·원점 `101px 77px`·팔 transform `REST`·팔 src `u:mouse_left` → 뗌 `[…, u:idle, u:kb_up, u:pen_up]`·`jellyWrap` ⓑ 상태: `layer rest → idle`, `armAtRest true` 유지 ⓒ bridge: 조회 1회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.penClick.test.tsx`

#### 수동 — `src/overlay/test/manual-checklist.md`

### TC-222 · 펜 모드 클릭 체감 — 클릭에도 손이 펜을 대며 왔다갔다 출렁임 · 종류: 수동(MC-21) · 요구: R-26, R-09, R-23, R-24, R-25 · 설계: design.md §10.8 전체(적용 조건·규칙표 1·3·4·8·9·11·13·14·유지되는 것·젤리 길이), requirements §2 S-10
- Given 실제 앱(CR-025·CR-027 적용 빌드), MC-20 전제와 같은 이미지(`pen_up`·`pen_down_0`·`pen_down_1`·`pen_key_space`·팔 3장·kb 그림) 등록, 메모장 포커스
- When MC-21 절차 ①~⑦
- Then ⓐ 화면: 왼·오른 클릭을 누를 때마다 손이 `pen_down` 그림으로 번갈아 바뀌고 배경 뺀 전체가 젤리로 한 번 출렁이며, 떼면 `pen_up`. 팔 클릭 그림 교체는 그대로, 키보드 쪽 그림은 `kb_up` 그대로, 손 위치·각도는 클릭으로 바뀌지 않음. 키를 누른 채 클릭하면 손 그림만 바뀌고 새 출렁임 없음, 스페이스를 누른 채 클릭하면 스페이스 손 그림 유지, 키 꾹 누름 부르르 중 클릭해도 부르르 유지, 좌우 동시 누름에서 한쪽만 떼면 누름 그림 유지. `pen_up`을 지우면 클릭은 팔 그림만 바뀜 ⓑ 상태: `settings.json` 변화 없음 ⓒ core·bridge: 기존 `input://mouse-button`만(새 command·event 없음), 로그·콘솔에 입력 정보 없음

---

### 추가 TC (v1.3 — CR-029: R-27 대기·쉬는중 그림 선택(없으면 `kb_up`) · R-28 위치 잠금 중 동작 — 오버레이 소스 변경 없음)

공통 전제 보충(§0.1·v0.8~v1.2 보충에 더한다 — 서로 어긋나면 이 절이 우선)
- **스펙**: `src/overlay/test/OverlayApp.lock.test.tsx` 하나. bridge mock·CSS mock·가짜 시계·`emit`·`advance`는 `OverlayApp.test.tsx`와 같다(CSS mock에 `shiver` 키 추가). 설정 `SETTINGS` = `{...DEFAULT_SETTINGS, scale 1, idleSeconds 300, overlay {100,100,true}, mouse MOUSE, autostart false}`(기존 픽스처 관례 — `positionLock`은 `DEFAULT_SETTINGS`의 `false`를 상속), `LOCKED` = `{...SETTINGS, positionLock: true}`. `MOUSE` = `OverlayApp.test.tsx`와 같음(어깨 620,530·`AREA`·hand null·partPos 0,0·penPos null). 모니터 [1920×1080], 기준점 (520,530), T0 = 1700000000000.
- **매니페스트**(캔버스 900×700, url = `u:{slotKey}`): `MIN` = R-27 필수 3장만(`kb_up`·`kb_down_0`·`mouse_base`, 몸통·대기·쉬는중·배경·클릭·특수 키·펜 없음). `IDLE_ONLY` = `MIN` + `idle`. `MIN_CLICK` = `MIN` + `mouse_left`. `PEN_MIN` = `MIN` + `pen_up`·`pen_down_0`(202×154, `penSlot` 캐스팅). `kbDown` 프레임 수 = 1이라 누름 그림은 늘 `u:kb_down_0`(펜 모드는 `u:pen_down_0`).
- **관찰**: 레이어 목록 `layers` = `.jellyWrap` 직계 `img.layer`의 src(아래 → 위 = 몸통 · 상태 z2 · 키보드 z3). 상태 레이어 img 수 `stateImgs` = `img[src="u:idle"]`·`img[src="u:rest"]` 개수. 펜 손 = `.jellyWrap` 직계 `img.hand`. 팔 = `.armWrap img`(src·`style.transform`, 변형 이름은 §0.2 `REST`·`DOWN`).
- **쉬는중 진입 관찰**: 상태 레이어 그림이 없으면 z2로는 전이를 볼 수 없다 → 팔 쉬는 위치(`armAtRest` → `REST`, design/functions.md §5.1 — 쉬는중 진입 시 true)와 `IDLE_ONLY`의 `idle` 사라짐으로 전이를 관찰한다.
- **소스 기준**: 이 절의 기대는 현행 `src/overlay/index.tsx`·`components/LayerStack.tsx`(design.md §10.9.2 근거 소스) 그대로다. 소스 변경 없는 CR이라 Green이 정상이며, 구현 작업 없이 ui-tester가 실행만 한다.
- **§10.9.2 회귀 번호 대응**: ① = TC-223 · ② = TC-224 · ③ = TC-225 · ④ = TC-226 · ⑤~⑨ = TC-228(MC-22 ②~④·⑤·⑨). TC-227은 R-28 중 ui가 관찰할 수 있는 몫(§7 `positionLock` 미참조·L-2 속성 유지·L-5·L-6·L-7)이다.

#### 화면 통합 — R-27 대기·쉬는중 그림 선택 (design.md §10.9.2)

### TC-223 · ① `idle`·`rest` 없음 · 대기 · 누름 없음 → 상태 레이어 없음, `kb_up` 보임 · 종류: 자동 · 요구: R-27, R-19, R-01 · 설계: design.md §10.9.2 표 1행·근거 소스(`findEntry(manifest, machine.layer)` 미등록 → `Layer` `null`, `kbDown false` → `kb_up`)·「오류·안내를 표시하지 않는다」, §10.1 z2·z3 행, design/functions.md §5.3 `LayerStack` 렌더
- Given `getAssetManifest` → `MIN`, `getSettings` → `SETTINGS`, 마운트(T0), 입력 없음
- When 마운트 완료(조회 3종·기준점 조회 해소)
- Then ⓐ 화면: `stateImgs` 0, `layers` = `['u:kb_up']`(몸통 없음·상태 없음), `.jellyWrap` class `jellyWrap`, 팔 src `u:mouse_base`·transform `REST`, `container.textContent` = `''`(필수 그림 안내·오류 문구 없음) ⓑ 상태: `settings` = `SETTINGS`(`positionLock false`), `manifest` = `MIN`, 상태기계 `layer 'idle'`(초기값 — 그림 유무와 무관), `armAtRest true` ⓒ bridge: `getSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor` 각 1회(인자 없음), `onKeyboard`·`onMouseMove`·`onMouseButton`·`onSettingsChanged`·`onAssetsChanged` 구독 각 1회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.lock.test.tsx`

### TC-224 · ② 같은 매니페스트로 쉬는중 진입(유휴 경과)해도 ① 그대로 — 전이·쉬는 위치는 그대로 일어남 · 종류: 자동 · 요구: R-27, R-05, R-11, R-15 · 설계: design.md §10.9.2 표 2행(「팔은 쉬는 위치 — R-11·R-15 그대로」)·「상태기계는 그림 유무를 모른다」, §6 P-3, design/functions.md §5.1 `armAtRest` 규칙(쉬는중 진입 시 true)
- Given `MIN`으로 마운트(T0), 입력 없음(= TC-223 종료 상태)
- When 마우스 이동 (960,1080)(T0) → 가짜 시계 299999ms 진행 → 1ms 더 진행(T0+300000 tick)
- Then ⓐ 화면: 이동 뒤 팔 transform `DOWN`, 299999ms 뒤에도 `DOWN`·`layers` = `['u:kb_up']` → 300000ms 뒤 팔 transform `REST`(쉬는중 진입의 증거), `stateImgs` 0(`u:rest` 없음), `layers` = `['u:kb_up']`, `textContent` `''` ⓑ 상태: `layer idle → rest`(T0+300000), `armAtRest false → true` ⓒ bridge: 조회 각 1회(재조회 없음), `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.lock.test.tsx`

### TC-225 · ③ `idle`·`rest` 없음 · 누름 중 → `kb_down`만(상태 레이어가 겹쳐 그려지지 않음), 펜 모드는 `kb_up` 고정 · 종류: 자동 · 요구: R-27, R-07, R-05, R-25, R-23 · 설계: design.md §10.9.2 표 4행·5행, §10.6(누름 그림 선택), §10.7 키보드 레이어 고정, §10.3 젤리 트리거, design/functions.md §5.3 `pickKeyboardEntry`·`LayerStack` 렌더(`isPenMode ? kb_up : pickKeyboardEntry`)
- Given ① `MIN`으로 마운트(T0), 키 입력 없음(`bounceSeq 0` — 대기 또는 쉬는중) ② `PEN_MIN`으로 새 마운트(T0)
- When ① 키 누름(1) → 키 뗌(0) → 가짜 시계 300000ms 진행(쉬는중) → 키 누름(1) → 키 뗌(0) ② 키 누름(1) → 키 뗌(0)
- Then ⓐ 화면: ① 누름 `layers` = `['u:kb_down_0']`·`u:kb_up` img 없음·`stateImgs` 0·`.jellyWrap` class `jellyWrap jellyAlt` → 뗌 `['u:kb_up']`·`jellyWrap` → 쉬는중 `['u:kb_up']` → 쉬는중에서 누름(깨어남) `['u:kb_down_0']`·`stateImgs` 0·`jellyWrap jelly` → 뗌 `['u:kb_up']`, `textContent` `''` ② 시작 `layers` `['u:kb_up']`·펜 손 `u:pen_up` → 누름 `layers` `['u:kb_up']`(키보드 고정)·펜 손 `u:pen_down_0`·`stateImgs` 0 → 뗌 `['u:kb_up']`·`u:pen_up`, `textContent` `''` ⓑ 상태: ① `bounceSeq 0 → 1 → 2`, `layer rest → idle`(깨어남 — 그림 없어도 전이) ② 펜 모드(`isPenMode(PEN_MIN)` true), `kbFrames 1` ⓒ bridge: 마운트마다 조회 각 1회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.lock.test.tsx`(it 2개 — ①·②)

### TC-226 · ④ `idle`만 있음 → 쉬는중 진입 시 `idle` img 사라짐(`rest` 미등록), 깨어나면 다시 `idle` · 종류: 자동 · 요구: R-27, R-05, R-19 · 설계: design.md §10.9.2 표 3행(「`idle` 그림이 남지 않음」)·근거 소스, §6 P-3, design/functions.md §5.3 `LayerStack` 렌더(상태 레이어 = `findEntry(manifest, machine.layer)`)
- Given `getAssetManifest` → `IDLE_ONLY`, 마운트(T0), 입력 없음
- When 가짜 시계 299999ms 진행 → 1ms 더 진행 → 키 누름(1) → 키 뗌(0)
- Then ⓐ 화면: 시작·299999ms `layers` = `['u:idle', 'u:kb_up']` → 300000ms `u:idle` img 없음·`u:rest` img 없음·`layers` = `['u:kb_up']` → 누름 `['u:idle', 'u:kb_down_0']` → 뗌 `['u:idle', 'u:kb_up']`, `textContent` `''` ⓑ 상태: `layer idle → rest → idle` ⓒ bridge: 조회 각 1회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.lock.test.tsx`

#### 화면 통합 — R-28 위치 잠금: 오버레이는 `positionLock`을 읽지 않는다 (design.md §10.9.1, §7 `positionLock` 행)

### TC-227 · 잠금 값과 무관한 같은 화면·끌기 속성 유지·잠금 중 입력 반응·설정 창 배율 반영 · 종류: 자동 · 요구: R-28, R-12, R-03, R-07, R-09, R-01 · 설계: design.md §10.9 판정(「`settings.positionLock`을 읽지 않는다」)·§10.9.1 L-2(`data-tauri-drag-region` 속성 그대로)·L-5(잠금 중 그대로인 것)·L-6(잠금 중 배율 = `settings://changed` → P-6)·L-7(오버레이에 해제 수단·안내 없음)·방어 코드 미채택 근거 1·2, §7 `positionLock` 행(어떤 function도 참조하지 않음), requirements §3 `Settings.positionLock` 행
- Given ① `SETTINGS`(`positionLock false`)·`MIN`으로 마운트 → 언마운트 → `LOCKED`·`MIN`으로 새 마운트 ② `LOCKED`·`MIN_CLICK`으로 마운트(T0)
- When ① 두 마운트의 DOM 비교 ② 키 누름(1) → 키 뗌(0) → 이동 (960,1080) → 왼 클릭 누름 → 뗌 → `settings://changed`(`{...LOCKED, scale 0.5}`) → `settings://changed`(`{...LOCKED, scale 0.5, positionLock false}` — 잠금 해제 수신)
- Then ⓐ 화면: ① 잠금 마운트의 `container.innerHTML`이 비잠금 마운트와 **완전히 같음**, 두 마운트 모두 `.root`(class `root`)에 `data-tauri-drag-region` 속성 있음, `textContent` `''`(잠금 표시·안내 없음) ② 시작 `.canvas` transform `scale(0.5)` → 누름 `layers` `['u:kb_down_0']`·`jellyWrap jellyAlt` → 뗌 `['u:kb_up']` → 이동 팔 transform `DOWN` → 클릭 누름 팔 src `u:mouse_left` → 뗌 `u:mouse_base` → 배율 수신 `.canvas` transform `scale(0.25)` → 해제 수신 뒤 `innerHTML`이 직전과 같음, `textContent` `''` ⓑ 상태: ② `settings.scale 1 → 0.5`, `settings.positionLock true → false`(값만 교체 — 어떤 렌더 결과에도 쓰이지 않음) ⓒ bridge: ① `getSettings` 2회(마운트마다 1회) ② 조회 각 1회(설정 이벤트는 페이로드만, 재조회 없음), 두 경우 모두 `setSettings` 0회(오버레이는 잠금을 저장·판정하지 않음)
- 비고: Ctrl+휠·끌기의 실제 차단(L-2·L-3)은 OS 적중 판정에서 창이 빠지는 것이라 jsdom으로 재현할 수 없다 → TC-228(MC-22 ③④). 이 TC는 잠금 중 휠 이벤트를 흘려 넣지 않는다(잠금 중에는 이벤트가 WebView에 오지 않는 것이 설계 전제 — L-3).
- 스펙: `src/overlay/test/OverlayApp.lock.test.tsx`(it 2개 — ①·②)

#### 수동 — `src/overlay/test/manual-checklist.md`

### TC-228 · 위치 잠금 실측 — 클릭 통과·끌기/Ctrl+휠 무반응·입력 반응 유지·재적용 유지·해제 후 복귀, 대기·쉬는중 그림 없이 `kb_up` · 종류: 수동(MC-22) · 요구: R-28, R-27, R-04, R-12, R-03, R-07, R-09, R-01 · 설계: design.md §10.9.1 L-1~L-7·잔여 위험, §10.9.2 표 1·2행·회귀 ⑤~⑨, design/a11y.md 마우스 조작(CR-029), requirements §2 S-11
- Given 실제 앱(CR-029 core window `apply_overlay_window` 잠금 적용 + settings 위치 잠금 토글 적용 빌드), 공통 준비 이미지, 오버레이 아래에 메모장 창을 겹쳐 둠, 시작 전 `settings.json`의 `scale`·`overlay.x/y` 기록
- When MC-22 절차 ①~⑩
- Then ⓐ 화면: 잠금 중 오버레이 위 클릭·끌기·Ctrl+휠이 모두 아래 메모장으로 가고 오버레이는 움직이지도 크기가 바뀌지도 않음, 잠금 표시·안내 문구 없음, 잠금 중에도 타자·이동·클릭에 캐릭터가 그대로 반응, 설정 창 배율 슬라이더로는 크기 바뀜, 숨김→표시·작업표시줄 표시 토글·재시작 뒤에도 잠금 유지, 설정 창에서 풀면 끌기·Ctrl+휠 다시 됨. 대기·쉬는중 그림을 비우면 대기·쉬는중 모두 `kb_up` 모습 ⓑ 상태: 잠금 중 `settings.json` `overlay.x/y`·`scale`은 오버레이 조작으로 바뀌지 않음(설정 창 슬라이더로 바꾼 `scale`만 바뀜), `positionLock`은 토글대로 ⓒ core·bridge: 잠금 적용·해제는 설정 창 `set_settings` → core 창 속성(오버레이는 새 command·event 없음), 오류 줄 없음
- 비고: 잔여 위험(design.md §10.9.1 — 「비활성 창 위에서 스크롤」 꺼짐 + 오버레이가 포커스를 가진 채 잠김)은 MC-22 ④′로 실측한다. 휠이 닿아 배율이 바뀌면 FAIL로 끝내지 않고 「잔여 위험 발현」으로 기록해 관리자에게 넘긴다(방어 코드는 「추가 후보」 — 설계 문서가 정한 처리).

---

### 추가 TC (v1.4 — CR-033: R-29 펜 손 사용 토글 · 펜 모드 = `pen_up` 등록 **그리고** `mouse.penMode`)

공통 전제 보충(§0.1·v0.8~v1.3 보충에 더한다 — 서로 어긋나면 이 절이 우선)
- **펜 모드 정의 교체**: v1.1·v1.2 절의 「펜 모드 = `pen_up` 등록」은 이 절부터 「`pen_up` 등록 && `settings.mouse?.penMode === true`」로 읽는다(design.md §10.10 판정). `OverlayApp`은 렌더에서 `penMode = isPenMode(manifest, settings.mouse)`를 한 번 계산해 `config`(`kbFrames`·`clickPress`)·`<LayerStack penMode>`·`<PenHand penMode>`에 같은 값을 넘긴다.
- **픽스처 규칙**: `MouseSettings` 리터럴은 `penMode`를 가진다(contract v0.15 — 필수 필드, 기본 `false`). 펜 모드를 전제로 한 스펙(`OverlayApp.pen`·`OverlayApp.penClick`·`PenHand`·`penClick`·`penLayers`)은 `penMode: true`, 그 밖의 스펙은 `penMode: false`. `LayerStack`·`PenHand`를 직접 렌더하는 스펙은 prop `penMode`를 넘긴다(펜 전제 = `true`, 비펜 = `false`). 필드 없는 옛 설정은 캐스팅 픽스처 `LEGACY`로만 만든다(TC-229).
- **토글 스펙 픽스처**(`OverlayApp.penToggle.test.tsx`): `OverlayApp.pen.test.tsx`의 `PEN_MANIFEST`(배경·몸통·대기·쉬는중·kb_up·key_space·마우스 파츠 3(900×700)·kb_down 3장 + `pen_up`·`pen_down_0`·`pen_down_1`·`pen_key_space` 202×154)·모니터 [1920×1080]·기준점 (520,530)·penPos (389,492)와 같다. `MOUSE_ON` = 어깨 (620,530)·`AREA`·hand null·partPos (0,0)·penPos (389,492)·**`penMode true`**, `MOUSE_OFF` = 같은 값 + **`penMode false`**. `SETTINGS_OFF`(기본 마운트 설정)·`SETTINGS_ON` = scale 1·idleSeconds 300·overlay {100,100,true}·autostart false. 꺼짐 `kbFrames` = `kbDownFrameCount` 3, 켜짐 = `penDownFrameCount` 2. 「조회 1회」 = `getSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor` 각 1회·`getScreenBounds` 0회. 전환 = `settings://changed` 페이로드 `SETTINGS_OFF`/`SETTINGS_ON`.
- **프레임·짝 규칙**(v1.2 절과 같음): 새 누름마다 `kbFrame = (kbFrame + 1) mod kbFrames`, 아무것도 안 눌린 상태의 첫 누름·특수 키 새 누름만 `bounceSeq` +1, 누름 중 `bounceSeq` 홀수 = `jellyWrap jellyAlt`·짝수 = `jellyWrap jelly`. 꺼짐 클릭은 `clickHeld`에 들어가지 않아 프레임·짝·누름 판정을 바꾸지 않는다(`clickPress false`).
- **관찰**: 펜 손 = `img[src^="u:pen"]`(꺼짐이어도 `pen_up`이 있으면 그려진다), 키보드 img = `.jellyWrap` 직계 마지막 `.layer`, 팔 = `.armWrap img`. 변형 기대값은 v1.1 절 「변형 기대값」과 같다(꺼짐·켜짐이 같은 식).
- §0.3 보충 — **CR-033 red**(CR 대장 「설계 완료」·소스 미적용 시): 실패 예상 = TC-201 ①(현 소스는 `isPenMode(manifest)` 1인자라 mouse null이어도 펜 모드 → `u:kb_up`), TC-229(`pen_up` + `penMode false`/`LEGACY` → 현 소스 true), TC-230(현 `LayerStack`은 prop을 무시하고 매니페스트로 판정), TC-231(현 `PenHand`는 prop을 무시하고 `pickPenEntry`), TC-232~TC-236(현 소스는 `pen_up`만으로 펜 모드). `yarn tsc --noEmit`은 `LayerStack`·`PenHand`에 없는 prop `penMode`·`isPenMode` 2인자 호출로 오류. TC-187·TC-225 ②·v1.1·v1.2 펜 스펙은 `penMode true`라 소스 적용 전후 모두 Green이 정상(회귀 방지). TC-025는 `DEFAULT_MOUSE_SETTINGS.penMode`(contract v0.15)가 bridge에 있으면 Green.

#### v1.4 개정표 — 기존 TC 기대값·입력·픽스처 변경(이 표가 해당 TC 본문과 앞 개정표의 같은 항목을 대체한다)

| TC | 스펙 | 개정 내용(CR-033) |
|---|---|---|
| TC-187 | `penLayers.test.tsx` | 제목 「`isPenMode` = `pen_up` 등록」 → 「`isPenMode(manifest, mouse)` — 토글 켜짐이면 `pen_up` 등록 여부로 갈림」. When = 기존 6 매니페스트에 토글 켜짐 mouse(`PEN_ON`, `penMode true`)를 둘째 인자로 넘김, 기대 true/true/false/false/false/false 불변. 요구 R-29 추가, 설계 design/functions.md §5.3 CR-033 개정 `isPenMode`·design.md §10.10 판정 추가. 꺼짐·null·필드 없음은 TC-229 |
| TC-188 | `penLayers.test.tsx` | 기대·스펙 불변. 설계 참조 「design.md §4 `config.kbFrames`」 → §10.10 `config`(`penMode ? penDownFrameCount : kbDownFrameCount`). 요구 R-29 추가 |
| TC-191 | `penLayers.test.tsx` | `LayerStack`에 prop `penMode` 전달 — `PEN` = `true`(토글 켜짐 전제), `PARTIAL` = `false`(`pen_up`이 없어 `OverlayApp`이 넘기는 값). 기대 불변. 꺼짐 + `PEN`은 TC-230 |
| TC-192~TC-195, TC-185 | `PenHand.test.tsx` | 기본 props에 `penMode: true`. 기대 불변(TC-185의 `MouseArm`은 prop을 쓰지 않음) |
| TC-212, TC-213 | `penClick.test.tsx` | `MOUSE`·`PROPS`에 `penMode: true`. 기대 불변 |
| TC-196~TC-199, TC-202 | `OverlayApp.pen.test.tsx` | `MOUSE_PEN`에 `penMode: true`. 기대 불변. TC-197·TC-202의 설계 참조 `config.kbFrames` → §10.10 `config`. TC-202의 `settings://changed` 페이로드는 `MOUSE_PEN` 전개라 `penMode true` 유지 — 그 TC의 「펜 모드 꺼짐/켜짐」은 `assets://changed`(`pen_up` 유무)로 일어난다. 토글로 인한 전환은 TC-235 |
| TC-200 | `OverlayApp.pen.test.tsx` | Given 보충: 토글 켜짐(`penMode true`)이어도 `pen_up`이 없으면 펜 모드 아님. 기대·스펙 불변. 설계 참조 `isPenMode(manifest, mouse)`(CR-033), 요구 R-29 추가 |
| TC-201 | `OverlayApp.pen.test.tsx` | ① `mouse = null`이면 `isPenMode(manifest, null)` = false → 펜 모드 아님: 누름 중 키보드 `u:kb_up` → **`u:kb_down_1`**(kbFrames 3 — `kbDownFrameCount`), 펜 손 없음은 그대로. 「키보드는 매니페스트 기준 kb_up 고정」 삭제. ②③ 불변. 요구 R-29 추가, 설계 design.md §10.10 판정·design/functions.md §5.3 `isPenMode` 예 3 추가 |
| TC-207 | `inputMachine.click.test.ts` | **재확인 — 기대·스펙 불변.** 상태기계는 펜·토글을 모르고 `clickPress`만 받으므로 토글 전환(§10.10 전환 「기존 모드 전환 규칙 그대로, TC-207」)도 같은 규칙이다. ②(켜짐에 누른 클릭을 꺼짐에서 뗌 → 제거)·③(꺼짐에 누른 클릭은 켜진 뒤 누름 아님)의 화면 통합 = TC-236. 설계 참조 §10.10 전환 추가, 요구 R-29 추가 |
| TC-214~TC-218, TC-220, TC-221 | `OverlayApp.penClick.test.tsx` | `MOUSE_PEN`에 `penMode: true`. 기대 불변. 설계 참조 「§4 `config.clickPress = isPenMode(manifest)`」 → §10.10 `config`(`clickPress: penMode`) |
| TC-219 | `OverlayApp.penClick.test.tsx` | Given 보충: 토글 켜짐이어도 `NO_PEN`·`PARTIAL_PEN`은 `pen_up`이 없어 `clickPress false`. 기대·스펙 불변. 토글 꺼짐 + `pen_up` 있음의 클릭은 TC-233. 요구 R-29 추가 |
| TC-225 | `OverlayApp.lock.test.tsx` | ② `PEN_MIN` 마운트의 설정을 `{...SETTINGS, mouse: {...MOUSE, penMode: true}}`로(꺼짐이면 CR-033 이후 펜 모드가 아니어서 `u:kb_down_0`이 보임). 기대 불변. 설계 참조 `LayerStack` 렌더 → CR-033 개정(`penMode ? kb_up : pickKeyboardEntry`). `MOUSE` 픽스처에 `penMode: false`. 요구 R-29 추가 |
| TC-025 | `mouseMapping.test.ts` | `DEFAULT_MOUSE_SETTINGS` `toEqual` 기대 객체에 `penMode: false` 추가(contract v0.15 기본값). 요구 R-29 추가 |
| 픽스처만(tsc) | `handPart.test.tsx`(`PART_MOUSE`·`LayerStack` 직접 렌더 TC-110), `MouseArm.test.tsx`(`mouse()`), `OverlayApp{,.jelly,.mouse,.shiver,.special}.test.tsx`(`MOUSE`), `layers.test.tsx`(`LayerStack` 렌더), `specialKey.render.test.tsx`(TC-141 `LayerStack` 렌더) | `MouseSettings` 리터럴에 `penMode: false`, `LayerStack` 직접 렌더에 `penMode={false}`. 기대 불변(비펜 매니페스트라 결과 동일). **적용 완료** — `MouseArm.test.tsx`는 v1.4 작성 패스, 나머지 7개 파일은 후속 패스(같은 날)(적용 전에는 `yarn tsc --noEmit` 오류만, vitest 결과는 불변: `penMode` 미지정 = 꺼짐과 같은 렌더) |

#### 판정·레이어·손 컴포넌트 — `LayerStack.tsx`·`PenHand.tsx` (design/functions.md §5.3·§5.5 CR-033)

스펙: `src/overlay/test/penToggle.test.tsx`. 매니페스트 `PEN` = 몸통·대기·쉬는중·kb_up·key_space·마우스 파츠 3(202×154)·kb_down 3장 + `pen_up`·`pen_down_0`·`pen_down_1`(**180×150**)·`pen_key_space`, `PARTIAL` = 같은 기본 + `pen_down_0`·`pen_key_space`(`pen_up` 없음), 빈 매니페스트. `mouse(b)` = 어깨 (620,530)·`AREA`·hand null·partPos (389,492)·penPos (389,492)·`penMode b`.

### TC-229 · `isPenMode(manifest, mouse)` = `pen_up` 등록 && `penMode === true` · 종류: 자동 · 요구: R-29, R-25 · 설계: design/functions.md §5.3 CR-033 개정 `isPenMode`(예 4개), design.md §10.10 판정·계약(「필드가 없는 옛 설정은 꺼짐」), requirements §1 용어 주(CR-033)·§3 `MouseSettings.penMode` 행
- Given `PEN`·`PARTIAL`·빈 매니페스트·`pen_up`만 있는 매니페스트, mouse = `mouse(true)` / `mouse(false)` / `null` / `LEGACY`(`penMode` 필드 없음 — 캐스팅)
- When `isPenMode` 호출: (`PEN`, true) · (`PEN`, false) · (`PEN`, null) · (`PARTIAL`, true) · (빈, true) · (`pen_up`만, true) · (`PEN`, `LEGACY`)
- Then ⓐ 화면: 해당 없음(순수 함수 — 화면은 TC-232~TC-236) ⓑ 상태: true / false / false / false / false / true / false, `'penMode' in LEGACY` = false ⓒ bridge: 호출 없음(bridge mock 빈 모듈 — 설정값은 인자로만 받음)
- 스펙: `src/overlay/test/penToggle.test.tsx`

### TC-230 · `LayerStack` prop `penMode` — 꺼짐이면 `pen_up`이 있어도 키보드 그림, prop만으로 정함 · 종류: 자동 · 요구: R-29, R-07, R-22, R-25 · 설계: design/functions.md §5.3 CR-033 개정 `LayerStack` 렌더(`penMode ? kb_up : pickKeyboardEntry`·「`isPenMode`를 내부에서 부르지 않는다」·같은 `<img>` 유지), design.md §10.10 `LayerStack`·꺼짐 동작 표 키 누름 행, design/components.md §3 `LayerStack` 행(CR-033)
- Given 상태 5가지 = 초기 / 누름 `kbFrame 1` / 누름 `kbFrame 2` / 누름 `specialHeld ['space']` / `layer 'rest'`
- When ① `PEN` + `penMode false`로 각 상태 렌더 ② `PARTIAL` + `penMode true`로 각 상태 렌더 ③ `PEN`·누름 `kbFrame 1` 상태를 `penMode` true → false → true로 rerender
- Then ⓐ 화면: ① img src = `[u:body, u:idle(쉬는중이면 u:rest), 키보드]`, 키보드 = `u:kb_up` / `u:kb_down_1` / `u:kb_down_2` / `u:key_space` / `u:kb_up`(= `pickKeyboardEntry(PEN, 상태).url`), class `layer` ② 키보드 모두 `u:kb_up`(`pen_up`이 없어도 prop이 켜짐이면 고정) ③ 같은 키보드 img 노드의 src `u:kb_up` → `u:kb_down_1` → `u:kb_up`, 모든 경우 `u:pen*` img 없음(펜 손은 `LayerStack`이 그리지 않음) ⓑ 상태: 입력 상태는 그대로 넘기고 렌더만 prop으로 갈림 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penToggle.test.tsx`

### TC-231 · `PenHand` prop `penMode` — 꺼짐 = 손 `pen_up` 고정, 팔 끝 추종 유지 · 종류: 자동 · 요구: R-29, R-25, R-26 · 설계: design/functions.md §5.5 `PenHand` 렌더 CR-033 개정(② `entry = penMode ? pickPenEntry(manifest, machine) : up`, ①·③~⑥ 그대로), design.md §10.10 `PenHand`·꺼짐 동작 표(손 그림 열), design/components.md §3 `PenHand` 행(CR-033)
- Given props = `PEN`·machine 초기·`mouse(false)`·모니터 [1920×1080]·커서 (960,0)·기준점 (520,530)·`atRest false`·**`penMode false`**
- When machine만 바꿔 rerender: 초기 / 누름 `kbFrame 1` / 누름 `kbFrame 0` / 스페이스 누름 / `clickHeld ['left']`·`kbFrame 1` / 반복 중(`repeating true`) → 커서 (960,1080) → `atRest true` → 누름 `kbFrame 1` 상태에서 `penMode` true → false → `manifest PARTIAL`로 `penMode` false·true
- Then ⓐ 화면: 여섯 상태 모두 자식 img 하나·같은 노드·src `u:pen_up`·class `hand`·left 389px·top 492px·202×154(`pen_down_1`의 180×150 아님)·원점 `101px 77px`·transform = `penTransformCss(penTransform(어깨, armTransformFor(같은 입력), (389,492), 202×154))` ≈ (−27.56, −141.40, 45°) / (960,1080) ≈ (27.60, 118.56, −45°)·`scale` 없음·크기 불변 / `atRest` → `translate(0px, 0px) rotate(0deg)`·`u:pen_up` / `penMode true` → 같은 노드 src `u:pen_down_1`·transform은 꺼짐일 때와 같은 문자열 / 다시 false → `u:pen_up`·202×154 / `PARTIAL` → `innerHTML` `''`(두 값 모두) ⓑ 상태: 해당 없음(순수 렌더 — machine은 읽기만) ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penToggle.test.tsx`

#### 화면 통합 — `OverlayApp` (design.md §10.10, design/functions.md §5.3 `OverlayApp` `penMode`)

스펙: `src/overlay/test/OverlayApp.penToggle.test.tsx`(위 공통 전제의 토글 스펙 픽스처). 각 TC의 Given 「모두 뗌·`kbFrame 0`·`bounceSeq` 짝수」는 새 마운트가 만족한다(FLOW에서는 앞 Step 종료 상태).

### TC-232 · 꺼짐 — 키 입력 = `kb_down`·특수 키 그림, 손 `pen_up` 고정 · 종류: 자동 · 요구: R-29, R-07, R-22, R-23, R-25 · 설계: design.md §10.10 판정·`config`(`kbFrames` = `kbDownFrameCount`)·꺼짐 동작 표 키 누름 행, design/functions.md §5.3 `OverlayApp` `penMode`(CR-033)·§5.5 `PenHand` CR-033, requirements §2 S-12
- Given `SETTINGS_OFF`·`PEN_MANIFEST`로 마운트(T0), 키 모두 뗌·`kbFrame 0`·`bounceSeq` 짝수
- When `input://keyboard` 순서: 누름(1) → 뗌(0) → 누름(1) → 뗌(0) → 누름(1) → 스페이스 누름(2,'space') → 스페이스 뗌(1,'space') → 뗌(0)
- Then ⓐ 화면: 시작 `.jellyWrap` 자식 = `[armWrap, u:body, u:idle, u:kb_up, u:pen_up]`, (키보드 src · `.jellyWrap` class) = (`u:kb_down_1`·`jellyWrap jellyAlt`) → (`u:kb_up`·`jellyWrap`) → (`u:kb_down_2`·`jellyWrap jelly`) → (`u:kb_up`·`jellyWrap`) → (`u:kb_down_0`·`jellyWrap jellyAlt`) → (`u:key_space`·`jellyWrap jelly`) → (`u:kb_down_1`·`jellyWrap jelly`) → (`u:kb_up`·`jellyWrap`), 키보드는 같은 노드·class `layer`, 펜 손은 매 단계 같은 노드·src `u:pen_up`·class `hand`·`.jellyWrap` 마지막 자식·transform `translate(0px, 0px) rotate(0deg)`·389/492·202×154·원점 불변, `u:pen_down*`·`u:pen_key*` img 0개, 애니메이션 클래스는 `.jellyWrap`에만 ⓑ 상태: 끝에 키 모두 뗌, `kbFrame 1`·`bounceSeq 4`, `console.log/info/debug` 0회(입력 비보관) ⓒ bridge: 조회 1회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.penToggle.test.tsx`

### TC-233 · 꺼짐 — 클릭 = 클릭 파츠만, 손 `pen_up`·젤리 없음 · 종류: 자동 · 요구: R-29, R-09, R-26, R-23, R-07 · 설계: design.md §10.10 `config`(`clickPress: penMode` = false)·꺼짐 동작 표 클릭 행, §10.8 규칙표 14(펜 모드 아님), design/functions.md §5.2 `onMouseButton`(`clickPress` false → `clickHeld` 불변)
- Given `SETTINGS_OFF` 마운트, 키·버튼 모두 뗌·`kbFrame 0`·`bounceSeq` 짝수, 이동 없음(`armAtRest true`)
- When 왼 누름 → 왼 뗌 → 오른 누름 → 오른 뗌 → 왼 누름 → 키 누름(1) → 키 뗌(0) → 왼 뗌
- Then ⓐ 화면: (팔 src · `.jellyWrap` class · 키보드 src) = (`u:mouse_left`·`jellyWrap`·`u:kb_up`) → (`u:mouse_base`·`jellyWrap`·`u:kb_up`) → (`u:mouse_right`·`jellyWrap`·`u:kb_up`) → (`u:mouse_base`·`jellyWrap`·`u:kb_up`) → (`u:mouse_left`·`jellyWrap`·`u:kb_up`) → (`u:mouse_left`·`jellyWrap jellyAlt`·`u:kb_down_1`)(버튼을 누른 채 첫 키 누름 = 젤리 — 꺼짐 클릭은 누름이 아님) → (`u:mouse_left`·`jellyWrap`·`u:kb_up`) → (`u:mouse_base`·`jellyWrap`·`u:kb_up`), 같은 `.jellyWrap` 노드, 펜 손은 매 단계 같은 노드·`u:pen_up`·transform `translate(0px, 0px) rotate(0deg)`·위치·크기·원점 불변, 끝에 팔 transform `REST` ⓑ 상태: 끝에 모두 뗌, `kbFrame 1`·`bounceSeq 1`, 클릭 동안 `clickHeld []`(젤리 class 불변으로 관찰), `armAtRest true` ⓒ bridge: `onMouseButton` 구독 1회(기존 이벤트, 페이로드 `{button, pressed, ts}`), 조회 1회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.penToggle.test.tsx`

### TC-234 · 꺼짐 — 손은 팔 끝을 따라 이동·기울기, 쉬는 자세 · 종류: 자동 · 요구: R-29, R-25, R-15, R-05 · 설계: design.md §10.10 `PenHand`(「위치·팔 끝 추종·기울기·크기 불변·z 순서·표시 조건은 §10.7 그대로」)·꺼짐 동작 표 이동 행, §10.7 위치·변형 수학, design/functions.md §5.5 `PenHand` 렌더 ③~⑥(CR-033 — 그대로)·§5.1 `armAtRest` 규칙
- Given `SETTINGS_OFF` 마운트, 키·버튼 모두 뗌(프레임·짝 무관), 마지막 입력 시각 = TC 시작 시각
- When 이동 (960,0) → 키 누름(1) → 키 뗌(0) → 이동 (960,1080) → 가짜 시계 300000ms 진행
- Then ⓐ 화면: (960,0) 팔 `UP`, 손 transform = TC-198의 (960,0) 식 ≈ (−27.56, −141.40, 45°)·`scale` 없음·389/492·202×154·원점 불변·src `u:pen_up` / 키 누름: 키보드 `u:kb_down_{0~2}` 중 하나, 손 src·transform 불변 / (960,1080) 팔 `DOWN`, 손 같은 노드 ≈ (27.60, 118.56, −45°)·`u:pen_up` / 300000ms 뒤 `.jellyWrap` 자식 `[armWrap, u:body, u:rest, u:kb_up, u:pen_up]`, 팔 `REST`, 손 `translate(0px, 0px) rotate(0deg)`·위치·크기 불변 ⓑ 상태: `layer idle → rest`, `armAtRest false → true` ⓒ bridge: 조회 1회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.penToggle.test.tsx`

### TC-235 · `settings://changed`로 켜짐 → 꺼짐 → 켜짐 즉시 전환, 상태기계 초기화 없음 · 종류: 자동 · 요구: R-29, R-25, R-26, R-07, R-09, R-23 · 설계: design.md §10.10 전환(「다음 렌더부터 적용」·「`config`가 바뀌어도 상태기계 상태는 초기화하지 않는다」)·`config`(의존성 `penMode` — `kbFrames` 2 ↔ 3·`clickPress`)·§7 추가 행(래퍼 없음·`onSettingsChanged` 페이로드), design/functions.md §5.3 `OverlayApp` `penMode`, requirements §3 `MouseSettings.penMode` 행
- Given `SETTINGS_ON`·`PEN_MANIFEST` 마운트(T0), 키·버튼 모두 뗌·`kbFrame 0`·`bounceSeq 0`, 이동 없음
- When 키 누름·뗌 → `settings://changed`(`SETTINGS_OFF`) → 키 누름·뗌 ×2 → 왼 누름·뗌 → `settings://changed`(`SETTINGS_ON`) → 키 누름·뗌 → 왼 누름·뗌
- Then ⓐ 화면: (손 · 키보드 · `.jellyWrap` class · 팔) 14단계 = (`pen_down_1`·`kb_up`·`jellyAlt`·`mouse_base`) → (`pen_up`·`kb_up`·—·`mouse_base`) → 꺼짐 수신 (`pen_up`·`kb_up`·—·`mouse_base`) → (`pen_up`·**`kb_down_2`**·`jelly`·`mouse_base`) → (`pen_up`·`kb_up`·—) → (`pen_up`·`kb_down_0`·`jellyAlt`) → (`pen_up`·`kb_up`·—) → 왼 누름 (`pen_up`·`kb_up`·—·`mouse_left`) → 뗌 (`pen_up`·`kb_up`·—·`mouse_base`) → 켜짐 수신 (`pen_up`·`kb_up`·—·`mouse_base`) → (`pen_down_1`·`kb_up`·`jelly`·`mouse_base`) → (`pen_up`·`kb_up`·—) → 왼 누름 (`pen_down_0`·`kb_up`·`jellyAlt`·`mouse_left`) → 뗌 (`pen_up`·`kb_up`·—·`mouse_base`)(「—」 = `jellyWrap`만, 누름 class는 `jellyWrap` 뒤에 붙음), 손·키보드·`.jellyWrap`은 끝까지 같은 노드, 손은 `.jellyWrap` 마지막 자식·389/492·202×154·`translate(0px, 0px) rotate(0deg)` ⓑ 상태: 꺼짐 첫 누름 `kb_down_2` = `kbFrame 1`에서 이어짐(초기화했다면 `kb_down_1`)·짝도 이어짐(`jelly`), 꺼짐 클릭은 프레임·짝 불변, 끝에 켜짐·모두 뗌·`kbFrame 0`·`bounceSeq 5` ⓒ bridge: `onSettingsChanged` 구독 1회, 조회 1회(설정 이벤트는 페이로드만 — 재조회 없음), `setSettings` 0회(오버레이는 토글을 저장하지 않음)
- 스펙: `src/overlay/test/OverlayApp.penToggle.test.tsx`

### TC-236 · 전환 중 눌린 클릭 — 켜짐에 누른 클릭은 꺼진 뒤 떼면 빠짐, 꺼짐에 누른 클릭은 켜진 뒤에도 누름 아님 · 종류: 자동 · 요구: R-29, R-26, R-09, R-23 · 설계: design.md §10.10 전환(「켜짐 → 꺼짐 때 이미 눌린 클릭은 `clickHeld`에 남아 있다가 떼면 항상 빠진다」·「꺼짐 → 켜짐 때 이미 눌려 있던 클릭은 누름으로 치지 않는다 — TC-207」), design/functions.md §5.2 `onMouseButton` ②③
- Given `SETTINGS_ON` 마운트, 키·버튼 모두 뗌·`kbFrame 0`·`bounceSeq 0`
- When 왼 누름 → `settings://changed`(`SETTINGS_OFF`) → 왼 뗌 → 왼 누름 → `settings://changed`(`SETTINGS_ON`) → 왼 뗌 → 왼 누름 → 왼 뗌
- Then ⓐ 화면: (손 · 키보드 · `.jellyWrap` class · 팔) = (`u:pen_down_1`·`u:kb_up`·`jellyWrap jellyAlt`·`u:mouse_left`) → 꺼짐 수신 (`u:pen_up`·`u:kb_up`·`jellyWrap jellyAlt`(class 불변 — 새 재생 아님, 눌린 클릭이 남아 있음)·`u:mouse_left`) → (`u:pen_up`·`u:kb_up`·`jellyWrap`·`u:mouse_base`) → (`u:pen_up`·`u:kb_up`·`jellyWrap`·`u:mouse_left`) → 켜짐 수신 (`u:pen_up`·`u:kb_up`·`jellyWrap`·`u:mouse_left`)(켜져도 누름 아님) → (`u:pen_up`·`u:kb_up`·`jellyWrap`·`u:mouse_base`) → (`u:pen_down_0`·`u:kb_up`·`jellyWrap jelly`·`u:mouse_left`) → (`u:pen_up`·`u:kb_up`·`jellyWrap`·`u:mouse_base`), 손·`.jellyWrap` 같은 노드, 손 위치·크기 불변 ⓑ 상태: 켜짐 → 꺼짐 동안 `clickHeld ['left']` 유지 → 뗌에 `[]`, 꺼짐 누름은 `clickHeld []` 그대로, 끝에 켜짐·모두 뗌·`kbFrame 0`·`bounceSeq 2` ⓒ bridge: 조회 1회, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.penToggle.test.tsx`

#### 수동 — `src/overlay/test/manual-checklist.md`

### TC-237 · 펜 손 사용 토글 실측 — 끄면 키보드 그림·클릭 파츠만·손은 팔 끝 추종, 켜면 글씨 쓰듯, 재시작 유지 · 종류: 수동(MC-23) · 요구: R-29, R-25, R-26, R-07, R-09, R-22, R-23 · 설계: design.md §10.10 전체(판정·꺼짐 동작 표·전환·계약), requirements §2 S-12
- Given 실제 앱(CR-033 bridge `MouseSettings.penMode`·core 저장·settings 「펜 손 사용」 토글·overlay 적용 빌드), MC-20 전제와 같은 이미지(`pen_up`·`pen_down_0`·`pen_down_1`·`pen_key_space`·팔 3장·kb_up·kb_down 2장 이상·`key_space`) 등록, 메모장 포커스
- When MC-23 절차 ①~⑥
- Then ⓐ 화면: 토글 켜짐 = 타자·클릭에 손 그림이 `pen_down`으로 바뀌고 키보드 쪽은 `kb_up` 그대로. 설정 창에서 끄면 재시작 없이 곧바로 타자에 키보드 그림(`kb_down`·스페이스 그림)이 바뀌고 손은 `pen_up` 그대로, 클릭에는 팔 클릭 그림만 바뀌고 출렁임 없음, 마우스를 움직이면 손이 팔 끝에 붙어 따라가며 기울고 크기 불변. 다시 켜면 곧바로 손이 글씨 쓰듯 바뀜. 꺼 둔 채 재시작해도 꺼짐 유지 ⓑ 상태: `settings.json`의 `mouse.penMode`가 토글대로 `true`/`false`(필드 없는 옛 파일은 꺼짐으로 동작) ⓒ core·bridge: 설정 창 `set_settings` → `settings://changed`만(오버레이는 새 command·event 없음·저장 호출 없음), 로그·콘솔에 입력 정보 없음

### 추가 TC (v1.5 — CR-037: R-30 헤어(뒷머리) 파츠 `hair`)

공통 전제 보충(§0.1·v0.8~v1.4 보충에 더한다 — 서로 어긋나면 이 절이 우선)
- **스펙**: `src/overlay/test/OverlayApp.hair.test.tsx` 한 파일(TC-238~TC-240 `HairLayer` 단독 렌더 + TC-241~TC-246 `OverlayApp` 통합). bridge mock 형식은 `OverlayApp.penToggle.test.tsx`와 같다(`vi.mock('bridge/commands')`·`vi.mock('bridge/events')` — 구독 핸들러를 잡아 페이로드를 직접 보냄). 실제 Tauri API import 없음, 가짜 시계 T0.
- **픽스처**: `HAIR_MANIFEST` = `OverlayApp.penToggle`의 `PEN_MANIFEST`(배경·몸통·대기·쉬는중·kb_up·key_space·마우스 파츠 3(900×700)·kb_down 3장 + `pen_up`·`pen_down_0`·`pen_down_1`·`pen_key_space` 202×154) + **`hair`(900×700, url `u:hair`, entries 맨 뒤)**. `HAIR2_MANIFEST` = 같음 + hair url `u:hair2`. `NO_HAIR_MANIFEST` = `PEN_MANIFEST`와 같음. `PLAIN_HAIR_MANIFEST` = 펜 없는 기본 + hair, `PLAIN_MANIFEST` = 펜·hair 없는 기본, `EMPTY_MANIFEST` = entries `[]`. 슬롯 `'hair'`는 contract v0.17 `AssetSlot` 값이라 **캐스팅하지 않는다**(`src/bridge/types.ts` 반영 확인). 설정 `SETTINGS_OFF` = 어깨 (620,530)·`AREA`·hand null·partPos (0,0)·penPos (389,492)·`penMode false`·scale 1·idleSeconds 300, `SETTINGS_ON` = 같음 + `penMode true`, `SETTINGS_LOCKED` = `SETTINGS_ON` + `positionLock true`. 모니터 [1920×1080]·기준점 (520,530). 기본 마운트 = `SETTINGS_OFF` + `HAIR_MANIFEST`.
- **관찰(CR-051 개정 — v2.0 절 우선)**: 헤어 = `img[src^="u:hair"]`, 헤어 래퍼 = `.hairWrap`(hair 등록 시에만 `.canvas` 첫 자식, 자식은 헤어 img 1개). 겹침 아래→위 = 헤어 → 배경 → 뽀모도 → `.jellyWrap`[팔 → 본체 → 펜 손]. 키보드 img = `.jellyWrap` 직계 마지막 `.layer`, 상태 img = `.jellyWrap > img[src="u:idle"]`·`[src="u:rest"]`, 팔 = `.armWrap img`, 펜 손 = `img[src^="u:pen"]`. **hair 등록 픽스처에서는 「`.canvas` 첫 자식 = 배경」 로케이터를 쓰지 않는다(첫 자식 = `.hairWrap`).** `.jellyWrap` 첫 자식은 헤어 유무와 무관하게 `.armWrap`(팔 없으면 몸통). CSS Modules mock에 `hairWrap`·`pomodoro`를 넣는다. (v1.5 원문 「헤어 = `.jellyWrap` 첫 자식·첫 `.layer`」는 CR-051로 대체.) 「조회 1회」 = `getSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor` 각 1회·`getScreenBounds` 0회.
- **프레임·짝 규칙**: v1.4 절과 같다(꺼짐 `kbFrames` = `kbDownFrameCount` 3, 켜짐 = `penDownFrameCount` 2, 새 누름마다 `kbFrame` +1 mod `kbFrames`, 아무것도 안 눌린 상태의 첫 누름·특수 키 새 누름만 `bounceSeq` +1, 홀수 = `jellyWrap jellyAlt`·짝수 = `jellyWrap jelly`).
- §0.3 보충 — **CR-037 red**(CR 대장 「설계 완료」·소스 미적용 시): `src/overlay/components/HairLayer.tsx`가 없어 스펙 파일이 import 단계에서 실패 → TC-238~TC-246 전부 red(collect 실패). `HairLayer`만 만들고 `OverlayApp` `.jellyWrap`에 넣지 않은 중간 상태면 TC-238~TC-240 green, TC-241·TC-243~TC-245·TC-246 ①② red, TC-242·TC-246 ③ green(헤어 없음 기대). `yarn tsc --noEmit`은 `HairLayer` 모듈 없음으로 오류.

#### v1.5 개정표 — 기존 TC(CR-037). 기존 TC 기대값 개정 없음

모든 기존 스펙 픽스처는 `hair`를 등록하지 않는다 → `HairLayer`가 `null`이라 `.jellyWrap` 자식 구성이 CR-037 전과 같다(design.md RTM R-30 비고 「hair 미등록 픽스처면 그대로, 등록 픽스처면 개정」). hair 등록 상태의 자식 순서는 신규 TC-241·TC-245·TC-246이 맡는다.

| TC | 스펙 | 처리(CR-037) |
|---|---|---|
| TC-152, TC-153 | `OverlayApp.jelly.test.tsx` | **재확인 — 기대·스펙 불변.** `SPECIAL_MANIFEST`에 hair 없음 → `.jellyWrap` 자식 `[armWrap, u:body, u:idle, u:kb_up]`(TC-153 ① `[u:body, u:idle, u:kb_up]`) 그대로. 설계 참조에 design/components.md §3 `.jellyWrap` 행(CR-037 — `HairLayer` 첫 자리, hair 없으면 `null`) 추가 |
| TC-196 | `OverlayApp.pen.test.tsx` | 재확인 — 불변(`PEN_MANIFEST`에 hair 없음). 「펜 손 = `.jellyWrap` 마지막 자식」은 hair 등록 시에도 성립(TC-241) |
| TC-232, TC-234 | `OverlayApp.penToggle.test.tsx` | 재확인 — 불변(`.jellyWrap` 자식 `[armWrap, u:body, …, u:pen_up]`, hair 없음) |
| TC-064, TC-066, TC-101, TC-111, TC-157 | 각 스펙 | 재확인 — 불변. `.canvas` 자식 `[배경, jellyWrap]`·배경 래퍼 밖 단언은 hair 미등록 픽스처라 그대로(CR-051 뒤 hair 등록 시 `.canvas` 자식은 `[hairWrap, 배경, (pomodoro), jellyWrap]` — TC-241) |
| 로케이터 공통 | 기존 스펙 전부 | 키보드 = `.jellyWrap` 직계 마지막 `.layer`, 펜 손 = `.jellyWrap` 마지막 자식, `.jellyWrap` 첫 자식 = `.armWrap`은 hair 등록 시에도 유효(CR-051). **배경 = `.canvas` 첫 자식은 hair 미등록일 때만**(등록 시 둘째 자식). 앞으로 기존 스펙 픽스처에 hair를 넣는 경우 `.canvas` 자식 단언을 TC-241 순서로 개정한다 |

#### 헤어 컴포넌트 — `HairLayer.tsx` (design/functions.md §5.3 `HairLayer` 렌더)

### TC-238 · `HairLayer` — hair 항목이 있으면 img 1개(src = hair url·class `layer`만·`alt=""`·draggable false·style 없음) · 종류: 자동 · 요구: R-30 · 설계: design/functions.md §5.3 `HairLayer` 렌더(`findEntry(manifest, 'hair')`·`<img className={styles.layer} src alt="" draggable={false} />`·인라인 `style`·`transform`·애니메이션 클래스 없음·새 CSS 클래스 없음), design.md §10.11 그림·좌표·배율, §8·§9 접근성 표(모든 `<img>` `alt=""` — `HairLayer` 포함), §7 `hair` 행, requirements §3 `AssetSlot` `'hair'` 행
- Given `HAIR_MANIFEST`(hair url `u:hair` — entries 맨 뒤, 배경·몸통·펜 등 다른 슬롯 포함)
- When `<HairLayer manifest={HAIR_MANIFEST} />` 단독 렌더
- Then ⓐ 화면: img 정확히 1개 = 컨테이너 첫 자식, src `u:hair`, class 정확히 `layer`, `alt` `""`, `draggable` `"false"`, `style` 속성 없음(다른 슬롯 그림은 그리지 않음) ⓑ 상태: 순수 렌더 — prop `manifest`의 hair 항목만 읽음, `slotKey('hair')` = `'hair'`(캐스팅 없는 `AssetSlot` 값) ⓒ bridge: 호출 없음 — `getSettings`·`setSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor`·`getScreenBounds` 0회, `onAssetsChanged` 구독 0회(매니페스트는 prop으로만 받음)
- 스펙: `src/overlay/test/OverlayApp.hair.test.tsx`

### TC-239 · `HairLayer` — hair 항목이 없으면 `null`(투명, 안내·오류 없음) · 종류: 자동 · 요구: R-30 · 설계: design/functions.md §5.3 `HairLayer` 렌더(「`hair`가 없으면 `null`(투명·정상 — 안내·오류 없음)」), design.md §10.11 없을 때(선택 슬롯·내장 기본 없음), design/components.md §3 `HairLayer` 행(내부에서 `null`)
- Given `NO_HAIR_MANIFEST`(펜 포함) · `PLAIN_MANIFEST` · `EMPTY_MANIFEST`
- When 각각 단독 렌더 → 언마운트
- Then ⓐ 화면: 세 경우 모두 컨테이너 `innerHTML` `''` ⓑ 상태: `console.warn`·`console.error` 0회(오류·경고·안내 없음) ⓒ bridge: 호출 없음(TC-238 ⓒ와 같은 목록 0회)
- 스펙: 같음

### TC-240 · `HairLayer` — `React.memo` 기본 export, 매니페스트 교체 때만 갱신 · 종류: 자동 · 요구: R-30 · 설계: design/functions.md §5.3 `HairLayer` 렌더(`export default memo(HairLayer)`·「`manifest` 참조가 바뀔 때만 다시 그린다」), design.md §10.11 갱신·성능(`<img>` 1개, 리렌더 원인은 `manifest` 변화뿐)
- Given `HAIR_MANIFEST`로 단독 렌더
- When 같은 참조로 rerender → `HAIR2_MANIFEST` → `NO_HAIR_MANIFEST` → `HAIR_MANIFEST`
- Then ⓐ 화면: 기본 export의 `$$typeof` = `Symbol.for('react.memo')`. 같은 참조 → 같은 img 노드·src `u:hair` / `HAIR2` → 같은 img 노드·src `u:hair2` / `NO_HAIR` → `innerHTML` `''` / 재등록 → img 1개·src `u:hair` ⓑ 상태: 내부 상태 없음(prop만) ⓒ bridge: 호출 없음
- 스펙: 같음

#### 화면 통합 — `OverlayApp` (design.md §10.11 회귀 ①~⑦)

### TC-241 · ①② hair 등록 → `.canvas` 첫 자식 = `.hairWrap`(헤어 img 1개), 겹침 헤어 → 배경 → 뽀모도 → 팔 → 본체 → 펜 손 · 종류: 자동 · 요구: R-30, R-17, R-16, R-25, R-33 · 설계: 확정사항 CR-051 줄(🔒 겹침 아래→위 헤어 → 배경 → 뽀모도 인물 → 말풍선 → 시간 글자 → 팔·손 → 본체), CR 대장 CR-051 조치(`.hairWrap` = `.canvas` 첫 자식·hair 있을 때만·펜 손은 CR-025대로 `.jellyWrap` 맨 위), design.md §10.11 자리·좌표·배율(`.canvas` 안 — 배율 공유)·회귀 ①②(**CR-051 개정 대기 — 설계 확인 필요**), §10.14 14.1 DOM(뽀모도 = 배경 다음·`.jellyWrap` 앞), design/components.md §3 `HairLayer` 행·`MouseArm` 행·DOM 구조(`HairLayer <img class="layer">`), requirements §1 용어 주(CR-037 — 펜 쥔 손은 본체 위 유지) · **개정(CR-051)**
- Given ① `SETTINGS_OFF`·`HAIR_MANIFEST`로 마운트(T0), 입력 없음 ② 언마운트 뒤 `SETTINGS_OFF`·`HAIR_POMO_MANIFEST`(v2.0 절 픽스처 — `HAIR_MANIFEST` + `pomo_char`·`pomo_bubble`)로 새 마운트(T0), 이어서 키 누름(1)
- When DOM 검사(②는 누름 전·후)
- Then ⓐ 화면: ① `.canvas` 자식 = `[div.hairWrap, img u:background, div.jellyWrap]`. `.hairWrap` 문서 1개·class 정확히 `hairWrap`·자식 = `[img u:hair]`. `.jellyWrap` 자식 = `[div.armWrap, img u:body, img u:idle, img u:kb_up, img u:pen_up]`(헤어 없음 — entries 순서와 무관). 헤어 img는 문서 전체 1개·부모 = `.hairWrap`·class 정확히 `layer`·`style` 속성 없음·`alt ""`·`draggable "false"`·`closest('.jellyWrap')`·`closest('.armWrap')` null·`.canvas` 자손. 배경 img 부모 = `.canvas`·`closest('.jellyWrap')`·`closest('.hairWrap')` null. 문서 순서 헤어 < 배경 < `.armWrap` < 몸통 < 펜 손, 펜 손 = `.jellyWrap` 마지막 자식 ② 누름 전 `.canvas` 자식 = `[hairWrap, u:background, pomodoro, jellyWrap]`, `.pomodoro` 자식 3개 = `[img u:pomo_char, img u:pomo_bubble, div(시간 글자)]`, 문서 순서 헤어 < 배경 < 인물 < 말풍선 < 글자 < `.armWrap` < 몸통 < 펜 손. 누름 뒤 `.hairWrap` class `hairWrap jellyAlt`·`.jellyWrap` class `jellyWrap jellyAlt`, `.pomodoro`는 같은 노드·class 정확히 `pomodoro`·`closest('.hairWrap, .jellyWrap, .jelly, .jellyAlt, .shiver')` null, 배경 img도 같은 조상 null ⓑ 상태: ① `manifest`에 hair 있음, `layer idle`, 모두 뗌 ② 누름 뒤 `bounceSeq 1`(홀수)·키 1개 눌림 ⓒ bridge: ① 조회 1회(`getSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor` 각 1회·`getScreenBounds` 0회), `onAssetsChanged` 구독 1회, `setSettings` 0회 ② 누계 `getSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor` 각 2회·`getScreenBounds` 0회, `setSettings` 0회(새 command·event 없음)
- 스펙: 같음

### TC-242 · ③ hair 없음 → `.jellyWrap` 첫 자식 = `.armWrap`, 헤어 img 없음, 안내 없음 · 종류: 자동 · 요구: R-30, R-16 · 설계: design.md §10.11 없을 때·회귀 ③, design/components.md §3 `HairLayer` 행(항상 렌더·내부 `null`)·`MouseArm` 행
- Given `SETTINGS_OFF`·`NO_HAIR_MANIFEST`로 마운트(T0), 입력 없음
- When DOM 검사
- Then ⓐ 화면: `.canvas` 자식 `[u:background, jellyWrap]`, `.jellyWrap` 자식 `[armWrap, u:body, u:idle, u:kb_up, u:pen_up]`(TC-232 시작 기대와 같음), 첫 자식 = `.armWrap`, `img[src^="u:hair"]` 0개, 컨테이너 `textContent` `''`(안내·오류 문구 없음) ⓑ 상태: `manifest`에 hair 없음 ⓒ bridge: 조회 1회, `setSettings` 0회
- 스펙: 같음

### TC-243 · ④ 키·특수 키·이동·클릭·쉬는중·펜 모드 켬·위치 잠금에도 헤어 1장 고정 · 종류: 자동 · 요구: R-30, R-05, R-07, R-09, R-22, R-28, R-29 · 설계: design.md §10.11 그림(「상태·키 누름·특수 키·클릭·펜 모드(R-29)·위치 잠금(R-28)과 무관하게 같은 그림」)·모션(인라인 `transform` 없음)·갱신(「입력·tick으로는 재렌더되지 않는다」)·성능·회귀 ④, §10.1 hair 행, design/functions.md §5.3 `HairLayer` 렌더(`memo` — 입력·tick·`machine` 무관)
- Given 기본 마운트(T0), 모두 뗌·`kbFrame 0`·`bounceSeq 0`·대기·펜 모드 꺼짐, 헤어 img에 `MutationObserver`(attributes) 감시 시작
- When ① 키 누름(1) ② 스페이스 누름(2,`space`) ③ 스페이스 뗌(1,`space`) ④ 뗌(0) ⑤ 이동 (960,0) ⑥ 왼 누름 ⑦ 왼 뗌 ⑧ 가짜 시계 300000ms ⑨ 키 누름(1) ⑩ 뗌(0) ⑪ `settings://changed`(`SETTINGS_ON`) ⑫ 키 누름(1) ⑬ 뗌(0) ⑭ `settings://changed`(`SETTINGS_LOCKED`)
- Then ⓐ 화면: 매 단계 헤어 img = 마운트 때와 같은 노드·src `u:hair`·class `layer`·`style` 없음·문서 전체 1개·부모 = 마운트 때와 같은 `.hairWrap` 노드(자식 1개, `.canvas` 첫 자식)·`closest('.jellyWrap')` null, **`.hairWrap` class = `.jellyWrap` class의 `jellyWrap`을 `hairWrap`으로 바꾼 값**(같은 motion — CR-051). 같은 순간 다른 레이어는 바뀐다(단계 효과 확인): ① 키보드 `u:kb_down_1`·`jellyWrap jellyAlt`·`hairWrap jellyAlt` ② `u:key_space`·`jellyWrap jelly` ③ `u:kb_down_2` ④ `u:kb_up`·`jellyWrap` ⑥ 팔 `u:mouse_left` ⑦ `u:mouse_base` ⑧ 상태 img `u:rest` ⑨ 상태 `u:idle`·키보드 `u:kb_down_0`·`jellyWrap jellyAlt` ⑪ 펜 손 `u:pen_up`·키보드 `u:kb_up` ⑫ 펜 손 `u:pen_down_0`(v1.6 CR-042 개정값)·키보드 `u:kb_up`·`jellyWrap jelly` ⑬ 펜 손 `u:pen_up`. 끝에 헤어 img 속성 변경 기록 0건(바뀌는 것은 래퍼 class뿐) ⓑ 상태: `layer idle → rest → idle`, 펜 모드 꺼짐 → 켜짐, `positionLock true` 수신, 끝에 모두 뗌·`kbFrame 1`·`bounceSeq 4`, `manifest` 불변 ⓒ bridge: 조회 1회(설정 이벤트는 페이로드만 — 재조회 없음), `setSettings` 0회
- 스펙: 같음 · **개정(CR-051 — 설계 근거에 확정사항 CR-051 줄 「헤어는 본체와 함께 젤리·부르르」 추가)**

### TC-244 · ⑤ 젤리·부르르 중 헤어는 `.hairWrap` 안에서 `.jellyWrap`과 같은 motion 클래스(함께 움직임), 배경은 두 래퍼 밖(정지) · 종류: 자동 · 요구: R-30, R-23, R-24, R-17 · 설계: 확정사항 CR-051 줄(헤어는 본체와 함께 젤리·부르르, 배경 고정), CR 대장 CR-051 조치(`wrapMotion(machine)` 1회 계산 → 두 래퍼가 같은 커밋에 같은 클래스, `jellyClass(motion, base)`), design.md §10.11 모션·회귀 ⑤(**CR-051 개정 대기 — 설계 확인 필요**), design/functions.md §5.1 `jellyClass`(클래스는 많아야 하나) · **개정(CR-051)**
- Given `HAIR_MANIFEST`로 마운트, 모두 뗌·`bounceSeq` 짝수(펜 모드·잠금 값과 무관 — 스펙은 `SETTINGS_OFF` 새 마운트)
- When A 키 누름(1) → B 같은 키 자동 반복(`repeat: true`, heldCount 1) → C 뗌(0)
- Then ⓐ 화면: A `.jellyWrap` class `jellyWrap jellyAlt`·`.hairWrap` class `hairWrap jellyAlt`, 헤어 img `closest('.jellyAlt')` = `.hairWrap` / B `jellyWrap shiver`·`hairWrap shiver`(`jelly`·`jellyAlt` 없음), 헤어 `closest('.shiver')` = `.hairWrap` / C `jellyWrap`·`hairWrap`. 모든 단계: `.jellyWrap`·`.hairWrap`은 마운트 때와 같은 노드, 헤어 부모 = `.hairWrap`·`closest('.jellyWrap')` null, 배경 img 부모 = `.canvas`·`closest('.jellyWrap')`·`closest('.hairWrap')`·`.jelly`·`.jellyAlt`·`.shiver` 모두 null, 헤어·배경 class `layer`·`style` 없음, `.jelly, .jellyAlt, .shiver, .bounce, .bounceAlt` 요소는 A·B = 정확히 `[.hairWrap, .jellyWrap]`(문서 순서) / C = 0개 ⓑ 상태: A `bounceSeq` 홀수, B `repeating true`, C `repeating false`·모두 뗌 ⓒ bridge: `setSettings` 0회
- 스펙: 같음

### TC-245 · ⑥ `assets://changed`로 헤어 추가·교체·비우기·재등록 즉시 반영 — `.hairWrap` 생김·사라짐, `.jellyWrap` 자식 불변 · 종류: 자동 · 요구: R-30 · 설계: design.md §10.11 갱신(`assets://changed` → `setManifest` → `HairLayer` 재렌더)·회귀 ⑥, §7 `hair` 행(`getAssetManifest`·`onAssetsChanged`로 받음, 새 래퍼 없음), requirements §3 `assets://changed` 행(헤어 등록·교체·비우기), CR 대장 CR-051 조치(hair 등록 시에만 `.hairWrap` 렌더 — `hasHair = useMemo(findEntry(manifest,'hair'))`) · **개정(CR-051)**
- Given `SETTINGS_OFF`·`NO_HAIR_MANIFEST`로 마운트, 입력 없음
- When `assets://changed` 페이로드 `HAIR_MANIFEST` → `HAIR2_MANIFEST` → `NO_HAIR_MANIFEST` → `HAIR_MANIFEST`
- Then ⓐ 화면: 시작 = 헤어 img·`.hairWrap` 없음·`.canvas` 자식 `[u:background, jellyWrap]` / 추가 = `.canvas` 자식 `[hairWrap, u:background, jellyWrap]`·`.hairWrap` 자식 `[u:hair]` / 교체 = 같은 헤어 노드·같은 `.hairWrap` 노드(`.canvas` 첫 자식)·src `u:hair2` / 비우기 = 헤어 img·`.hairWrap` 0개·`.canvas` 자식 `[u:background, jellyWrap]` / 재등록 = 헤어 `u:hair` 1개·`.hairWrap` 1개 = `.canvas` 첫 자식·그 첫 자식 = 헤어. 모든 단계: `.jellyWrap` 자식 `[armWrap, u:body, u:idle, u:kb_up, u:pen_up]`·첫 자식 = 처음과 같은 `.armWrap` 노드, `.canvas`·`.jellyWrap`·`.armWrap`·배경 img는 끝까지 같은 노드 ⓑ 상태: `manifest` = 마지막 페이로드(재조회 없이 교체) ⓒ bridge: `getAssetManifest` 1회(마운트 때만), `onAssetsChanged` 구독 1회, `setSettings` 0회
- 스펙: 같음

### TC-246 · ⑦ `settings.mouse = null`·`monitors = []`여도 헤어 표시(`.hairWrap`), 팔이 없으면 `.jellyWrap` 첫 자식 = 몸통, 헤어도 없으면 `.hairWrap` 없음 · 종류: 자동 · 요구: R-30, R-19, R-16 · 설계: design.md §10.11 회귀 ⑦·회귀 ③ 괄호(「또는 `LayerStack` 첫 `<img>`」), design/components.md §3 `HairLayer` 행(「`settings.mouse`·`monitors`와 무관, 조건 없음」)·`MouseArm` 행(`settings.mouse && monitors.length > 0`), CR 대장 CR-051 조치(`.hairWrap` 조건 = hair 등록뿐) · **개정(CR-051)**
- Given ① `{...SETTINGS_OFF, mouse: null}`·`PLAIN_HAIR_MANIFEST` ② `SETTINGS_OFF`·모니터 `[]`·`PLAIN_HAIR_MANIFEST` ③ `{...SETTINGS_OFF, mouse: null}`·`PLAIN_MANIFEST`
- When 각각 새 마운트(①은 이어서 키 누름(1))
- Then ⓐ 화면: ① `.canvas` 자식 `[hairWrap, u:background, jellyWrap]`, `.hairWrap` 자식 `[u:hair]`, `.jellyWrap` 자식 `[u:body, u:idle, u:kb_up]`, `.armWrap` 0개, 누름 뒤 `jellyWrap jellyAlt`·`hairWrap jellyAlt`·`.hairWrap` 첫 자식 여전히 헤어 ② `.canvas` 자식 `[hairWrap, u:background, jellyWrap]`, `.jellyWrap` 자식 `[u:body, u:idle, u:kb_up]`, `.armWrap` 0개 ③ `.canvas` 자식 `[u:background, jellyWrap]`, `.jellyWrap` 자식 `[u:body, u:idle, u:kb_up]`, 첫 자식 = 몸통 img, 헤어 img·`.hairWrap` 0개 ⓑ 상태: ①③ `settings.mouse null`, ② `monitors []` ⓒ bridge: 마운트마다 `getSettings`·`getAssetManifest` 1회(누계 3회), `setSettings` 0회
- 스펙: 같음

#### 수동 — `src/overlay/test/manual-checklist.md`

### TC-247 · 헤어 실측 — 뒷머리가 맨 뒤(배경 뒤), 팔·손·몸은 앞, 젤리·부르르 때 몸과 함께 출렁임, 배경·뽀모도 정지, 등록·비우기 즉시 반영 · 종류: 수동(MC-24) · 요구: R-30, R-16, R-17, R-23, R-24, R-25, R-33 · 설계: 확정사항 CR-051 줄(🔒 겹침 헤어 → 배경 → 뽀모도 → 팔·손 → 본체, 헤어 젤리·부르르 동행, 배경·뽀모도 고정), CR 대장 CR-051(젤리 도중 신규 등록 시 1회 위상 어긋남 허용), design.md §10.11 전체(수동 1건 — **CR-051 개정 대기**), requirements §2 S-13 · **개정(CR-051)**
- Given 실제 앱(CR-037 + **CR-051 적용 빌드** — bridge `AssetSlot 'hair'`·core 슬롯·오버레이 `HairLayer`·`.hairWrap`), 배경·몸통·대기·`kb_up`·`kb_down` 2장 이상·마우스 파츠 3장 + 뒷머리만 그린 캔버스 크기 PNG를 `hair`로 등록(등록 수단 = 설정 창 헤어 슬롯. 없으면 앱 데이터 폴더에 `hair.png`를 넣는다 — core가 그 경로를 읽는 경우에 한함, 아니면 「보류」). 배경은 뒷머리 자리 일부가 투명한 PNG를 쓴다(전부 불투명하면 뒷머리가 완전히 가려져 ③④ 판정 불가 — 그때 ③④는 「보류」). 펜 쥔 손(`pen_up` 등)·뽀모도 인물·말풍선이 있으면 함께 등록. 시작 전 `settings.json` 내용을 적어 둔다. 메모장 포커스
- When MC-24 절차: ① 앱을 시작해 캐릭터를 본다 ② 마우스를 천천히 크게 움직여 팔(펜 손)이 뒷머리와 겹치는 쪽으로 가게 한다 ③ 메모장에 천천히 타자 ④ a를 2초 꾹 누른다 ⑤ ③④ 동안 배경·뽀모도(인물·말풍선·시간 글자)만 본다 ⑥ 왼·오른 클릭, 유휴 시간(짧게 설정) 대기 뒤 키 누름 ⑦ Ctrl+휠로 배율 50%·200% ⑧ 설정 창에서 헤어를 비운 뒤 다시 등록한다 ⑨ `settings.json`을 시작 전과 비교하고 `.dev-tauri.log`·오버레이 개발자 도구 콘솔을 본다
- Then ⓐ 화면: ① 뒷머리가 **맨 뒤** — 배경 그림이 칠해진 곳에서는 배경에 가려지고 배경의 투명한 곳으로만 보인다. 뽀모도 인물·말풍선·시간 글자는 배경 앞, 몸통·키보드 그림·팔·손은 그 모두의 앞 ② 팔·손이 머리카락 **앞**을 지나가고 머리카락에 가려지는 부분이 없다 ③ 타자 젤리 때 보이는 머리카락이 몸과 같은 순간·같은 모양·같은 기준점(아래 가운데)으로 출렁인다(따로 놀거나 제자리에 남지 않음) ④ 부르르 동안 머리카락도 몸과 함께 떨고, 떼면 함께 멈춘다 ⑤ 배경·뽀모도(인물·말풍선·시간 글자)는 전혀 움직이지 않는다 ⑥ 클릭·쉬는중·깨어남에도 머리카락 그림·위치가 바뀌지 않는다 ⑦ 머리카락이 다른 레이어와 같은 비율로 커지고 작아지며 어긋나지 않는다 ⑧ 비우면 재시작 없이 머리카락만 사라지고 오류·안내가 없다, 다시 등록하면 곧바로 나타난다(젤리 도중에 등록한 그 한 번은 몸과 어긋나도 허용 — CR-051) ⓑ 상태: `settings.json` 동일(헤어는 설정값 없음 — 이미지 파일만) ⓒ core·bridge: 설정 창 등록·비우기 → `assets://changed`만, 오버레이는 새 command·event·저장 호출 없음, 로그·콘솔 오류 없음

---

## TC-FLOW

규칙
- **실행 방식(사실대로)**: 자동 TC 스펙은 TC마다 **독립 마운트**로 돈다(`beforeEach`가 mock·가짜 시계를 초기화). FLOW 전용 스펙은 없다. FLOW의 상태 전달은 각 Step의 Given이 앞 Step의 종료 상태와 같거나 그 부분집합이 되도록 TC Given을 적어 보장한다 — 이어 붙여 실행해도 같은 결과가 나오도록 Given·Then을 맞췄다.
- 앞 Step 종료 상태로 다음 Given을 만들 수 없는 곳은 **연결 Step**(TC 아님, 상태를 다시 만드는 이벤트 목록)이나 **재마운트 Step**(조회 mock 값으로 저장 상태를 재생성)을 명시한다.
- 호출 횟수는 **Step 시작 기준**으로 센다(§0.1 호출 횟수 행). 예: 앞 Step에서 이미 `getHandAnchor` 1회가 있었다면 뒤 Step의 「재조회 없음」은 「추가 0회」다.
- 자동 Step에서 수동 Step으로 넘어갈 때는 **환경 전환**(실제 앱, `manual-checklist.md` 공통 준비)이며 Given은 실제 앱의 앞 수동 Step 종료 상태다.

### TC-FLOW-01 · S-1 타자에 반응하는 캐릭터(배경은 그대로)
Steps: TC-047 → TC-152 → TC-056 → TC-054 → TC-067 → TC-068 → (환경 전환) TC-083 → TC-090 → TC-159 (v0.9 개정, CR-022 — 이 표가 v0.8 개정표의 FLOW-01 행을 대체)

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-047 | 조회 성공으로 마운트(T0), 배경 포함 매니페스트(kb_down 3장) | 대기·들림, `kbFrame 0`, `bounceSeq 0`, `armAtRest true`(팔 0°), `.canvas` 첫 자식 = 배경 |
| 2 | TC-152 | Step 1 종료(입력 없음) | DOM 검사만 — `.canvas` 자식 `[배경, .jellyWrap]`, `.jellyWrap` class `jellyWrap`. 상태는 Step 1과 같음 |
| 3 | TC-056 | Step 2 종료(`kbFrame 0`·kb_down 3장·키 모두 뗌) | 매니페스트 kb_down 2장(배경 유지), `kbFrame 1`, 들림, 누름 6회 → `bounceSeq 6`, 팔 0° |
| 4 | TC-054 | Step 3 종료(들림·`armAtRest true`, 프레임 무관, `bounceSeq` 짝수) | 누름 → 누름 프레임 class `layer`·`.jellyWrap` `jellyWrap jellyAlt`(`bounceSeq 7` = phase 1)·`.armWrap` `armWrap` 확인 뒤 뗌 → `.jellyWrap` `jellyWrap`, 들림, `kbFrame 0`, 팔 0° |
| 5 | TC-067 | Step 4 종료(배경 있는 매니페스트, 대기·들림, `bounceSeq 7`) | 6키 첫 누름에서 `.jellyWrap` `jellyWrap jelly`(`bounceSeq 8` = phase 0 — TC-067 개정 행의 FLOW 값), 배경은 `.jellyWrap` 밖·노드·속성 불변 → 쉬는중. 조회 추가 0회 |
| 6 | TC-068 | Step 5 종료(쉬는중) | 키 누름으로 대기, 문구·포커스 대상 없음 |
| 7 | TC-083(수동) | 환경 전환: 앱 실행·이미지 등록 | 오버레이가 항상 위에 떠 있음 |
| 8 | TC-090(수동) | Step 7 종료 + 메모장 포커스 | 전역 타자에 배경 뺀 전체가 한 덩어리로 젤리 출렁임 |
| 9 | TC-159(수동) | Step 8 종료(메모장 타자 중) | 탱글탱글 체감·배경 정지·누른 채 추가 키 무반응·특수 키 새 누름 재출렁 확인 |

### TC-FLOW-02 · ~~S-2 여러 키 동시 → 쾅 → 복귀~~ · **폐기(CR-019)**
- 폐기 사유: requirements.md v1.7 §2 S-2 폐기(매핑 요구 R-06 폐기, 대체 없음). Step이던 TC-055·TC-091은 폐기, TC-058은 단독 TC(요구 R-05)로 유지, TC-047은 다른 흐름의 Step으로 유지

### TC-FLOW-03 · S-3 커서 방향 팔·클릭 이미지
Steps: TC-049 → TC-062 → [연결 3] → TC-051 → (환경 전환) TC-094 → TC-095

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-049 | 기준점 구독 보류 상태로 마운트(로드 포함) | 구독 완료 → 조회 1회 → anchor (520,530), 이동 (960,1080) 후 팔 −45°, `armAtRest false` |
| 2 | TC-062 | Step 1 종료(이동 (960,1080) 완료) | right 누름 중(src `u:mouse_right`), 팔 −45° |
| 3 | 연결(TC 아님) | Step 2 종료 | ① right 뗌 ② `settings://changed`(mouse.hand = (520,530), 어깨 620,530 불변) — contract §5: `set_settings`는 어깨 변경·mouse 켜짐/꺼짐일 때만 기준점을 다시 계산하므로 여기서는 기준점 이벤트가 없다 ③ `mouse_base` 재등록(`import_asset`, 같은 크기 새 그림): 주 이벤트 `assets://changed`(mouse_base url만 바뀐 매니페스트)가 먼저, 같은 command 안에서 뒤이어 `assets://hand-anchor-changed {anchor:(620,430)}`(contract §4 순서) ⇒ TC-051 Given(어깨 620,530, hand 520,530, anchor 620,430) 재생성. 어깨 변경으로 재계산을 일으키지 않는 이유: TC-051의 각도 기대가 어깨 (620,530)에 묶여 있어 어깨를 바꾸면 Given이 달라지고, 같은 그림에서 어깨를 되돌리면 기준점도 원래 값으로 되돌아와 (620,430)이 나올 수 없다 |
| 4 | TC-051 | Step 3 종료 | anchor (620,430), 팔 45°. 이 Step 시작 이후 `getHandAnchor` 추가 0회 |
| 5 | TC-094(수동) | 환경 전환: 레이어 이동 모드 파츠 3장 앱 | 실측 추종·클릭 이미지 |
| 6 | TC-095(수동) | Step 5 종료(오버레이 실행 중) | 설정 변경이 재시작 없이 반영 |

### TC-FLOW-04 · S-4 쉬었다 깨어남, 시작 직후 그린 그대로
Steps: TC-059 → TC-060 → TC-057 → [연결 3a] → TC-061 → (환경 전환) TC-093 → TC-092

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-059 | 마운트(T0), 이동 없음 | 팔 0°, 현재 T0+1000 |
| 2 | TC-060 | Step 1 종료(`armAtRest true`) | 마지막 이동 (960,0) 시각 L = T0+1000, 팔 45°, `armAtRest false`, 들림 |
| 3 | TC-057 | Step 2 종료(L = T0+1000, tick 위상 위) | L+300000에 쉬는중 → 키 누름으로 대기. **키 1개 눌림**(`heldCount 1`·`kbDown true`, 누름 프레임 표시), `armAtRest true`(쉬는중 진입 때 켜짐) |
| 3a | 연결(TC 아님) | Step 3 종료(키 1개 눌림) | `input://keyboard {pressed false, heldCount 0}` → 키 모두 뗌(들림), 대기 유지, `armAtRest true` 유지, 마지막 입력 = 뗌 시각(T0+301000) |
| 4 | TC-061 | Step 3a 종료(키 모두 뗌·대기). TC-061의 첫 동작이 이동 (960,1080)(→ −45°) | 쉬는중 0° → 키·클릭 0° 유지 → 이동으로 −45° |
| 5 | TC-093(수동) | 환경 전환: 앱 재시작 | 시작 0° → 이동 추종 |
| 6 | TC-092(수동) | Step 5 종료 + 유휴 시간 짧게 설정 | 쉬는중 0° → 키 0° 유지 → 이동 추종 |

### TC-FLOW-05 · S-5 알맞은 자리·크기
Steps: TC-070[900×700·배율 1] → TC-071 → TC-075 → TC-076 → TC-077① → (환경 전환) TC-084 → TC-086 → TC-085 → TC-087

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-070 중 900×700·배율 1 케이스 | 900×700, scale 1로 마운트 | `.canvas` `scale(0.5)` = 표시 450×350, overlay {100,100} |
| 2 | TC-071 | Step 1 종료(scale 1) | 위·아래 한 칸씩 → scale 1, 이 Step에서 `setSettings` 2회 |
| 3 | TC-075 | Step 2 종료(scale 1, overlay {100,100}) | 이 Step의 1번째 `setSettings` overlay {100,100}, 이벤트로 교정 뒤 2번째 `{…{500,300}, scale 1.1}` → scale 1.1, overlay {500,300} |
| 4 | TC-076 | Step 3 종료(S = scale 1.1·overlay {500,300}) | S에서 overlay만 {800,40}인 이벤트 → 화면 불변, 이 Step에서 command 0회 |
| 5 | TC-077 ①만 | Step 4 종료(s = 1.1) | 이미지 위 Ctrl+휠 위 → `scale 1.15` 저장 요청(②의 scale 2 재마운트는 단독 TC에서만 검증) |
| 6 | TC-084(수동) | 환경 전환: 앱 실행 | 창을 새 위치로 드래그함 |
| 7 | TC-086(수동) | Step 6 종료(드래그한 자리) | 제자리에서 배율만 바뀜 |
| 8 | TC-085(수동) | Step 7 종료(드래그한 자리·새 배율) | 재실행 뒤 같은 자리 |
| 9 | TC-087(수동) | Step 8 종료(재실행됨) | 배율별 창 크기 실측 = 표 |

### TC-FLOW-06 · S-6 등록 직후 반영(배경 포함)
Steps: TC-065 → TC-101 → TC-066 → TC-069 → [연결 4a] → TC-109 → [연결 5a] → TC-111 → (환경 전환) TC-096 (v0.5: S-6에 R-18·R-19 — 옮긴 손 위치 반영·몸통 없음 허용 — 반영)

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-065 | `{canvas:null, entries:[]}`로 마운트 | `.root`만, `.canvas` 없음. 기준점 조회값 (520,530), 마우스 이동 없음(`armAtRest true`) |
| 2 | TC-101 | Step 1 종료 | `assets://changed`로 `.canvas`가 처음 나타남(배경 없는 기본 매니페스트, 파츠 900×700, `scale(0.5)`) |
| 3 | TC-066 | Step 2 종료(배경 없는 매니페스트 표시 중) | 배경 추가·교체·삭제 뒤 `SMALL_MANIFEST`(배경 포함, 캔버스 900×700, 손 그림 202×154), scale 1. `getAssetManifest` 추가 0회 |
| 4 | TC-069 | Step 3 종료(900×700, scale 1 = `scale(0.5)`) | `settings://changed {scale 2}` → `scale(1)` |
| 4a | 연결(TC 아님) | Step 4 종료 | `settings://changed`(scale 2 유지, mouse = 어깨 620,530·패드 0,0,200,200·hand null·**partPos 389,492** — 설정 창에서 손 그림을 끌어다 놓은 결과). core가 다시 계산한 기준점이 (520,530)이면 `assets://hand-anchor-changed`는 오지 않고, 온다면 `{anchor:(520,530)}`로 가정 — 어느 쪽이든 ui `anchor` = (520,530) ⇒ TC-109 Given 재생성(`SMALL_MANIFEST`·partPos 389,492·마우스 이동 없음) |
| 5 | TC-109 | Step 4a 종료 | 손 그림 partPos (100,50), anchor (620,430), 마지막 이동 (1920,540), 키 모두 뗌. 이 Step에서 조회 추가 0회 |
| 5a | 연결(TC 아님) | Step 5 종료 | `assets://changed`(`NO_BODY` — kb_up·kb_down 1장·손 그림 202×154, 배경·몸통·상태 없음) ⇒ TC-111 Given |
| 6 | TC-111 | Step 5a 종료(키 모두 뗌) | kb_up 디폴트 → 누름 → 뗌 교체 확인, `u:body` 없음 |
| 7 | TC-096(수동) | 환경 전환: 배경 등록 수단이 있는 앱 | 배경 표시·무반응 실측 |

### TC-FLOW-07 · S-7 특수 키를 칠 때 그 키 모습으로 통통(무엇을 쳤는지 남지 않음)
Steps: TC-144 → [연결 1a] → TC-145 → TC-146 → [연결 3a] → TC-147 → [연결 4a] → TC-148 → TC-149 → (환경 전환) TC-151 (v0.8 신규, CR-021)

바운스 짝과 누름 프레임은 누름 이력에 따라 달라지므로, 연결 Step은 **일반 키 누름·뗌 쌍**(`{pressed true, heldCount 1, special null}` → `{pressed false, heldCount 0, special null}`)을 k회 넣어 「`bounceSeq` 짝수 · `kbFrame 0` · 키 모두 뗌」(= 새 마운트와 같은 짝·프레임)을 만든다. 한 쌍마다 `bounceSeq` +1, `kbFrame` +1(mod 3).

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-144 | `SPECIAL_MANIFEST`로 마운트(T0), 들림 | 스페이스 누름·뗌 확인 → 들림. `bounceSeq 1`·`kbFrame 1` |
| 1a | 연결(TC 아님) | Step 1 종료 | 일반 키 누름·뗌 5쌍 → `bounceSeq 6`·`kbFrame 0`·들림 ⇒ TC-145 Given |
| 2 | TC-145 | Step 1a 종료 | 규칙 2~7 확인 → 들림. `bounceSeq 8`·`kbFrame 0`(그대로 TC-146 Given) |
| 3 | TC-146 | Step 2 종료 | Z·Ctrl+Z·Ctrl+C 확인 → 들림. `bounceSeq 11`·`kbFrame 1` |
| 3a | 연결(TC 아님) | Step 3 종료 | 일반 키 누름·뗌 5쌍 → `bounceSeq 16`·`kbFrame 0`·들림 ⇒ TC-147 Given |
| 4 | TC-147 | Step 3a 종료 | `['enter','space']` 눌린 채(`heldCount 2`)·`bounceSeq 18`·`kbFrame 0` |
| 4a | 연결(TC 아님) | Step 4 종료 | `{pressed false, heldCount 0, special null}` 1회 → 들림(규칙 10), `bounceSeq 18`·`kbFrame 0` ⇒ TC-148 Given |
| 5 | TC-148 | Step 4a 종료 | 걸러진 값 확인 → 들림. `bounceSeq 19`·`kbFrame 1` |
| 6 | TC-149 | Step 5 종료(들림 — TC-149는 짝·프레임 값을 단언하지 않는다) | 모두 뗌·분류값 흔적 없음. 이 Step 시작 이후 조회 추가 0회·`setSettings` 0회 |
| 7 | TC-151(수동) | 환경 전환: 실제 앱·메모장 | 실제 키 분류·그림·튐·비보관 실측 |

### TC-FLOW-08 · S-8 꾹 눌러 연속 입력할 때도 계속 반응(첫 누름 젤리 → 부르르 → 떼면 정지)
Steps: TC-169 → [연결 1a] → TC-170 → TC-172 → [연결 3a] → TC-173 → (환경 전환) TC-175 (v1.0 신규, CR-023)

짝 규칙은 v0.8 전제 그대로다(모든 키가 떼진 상태의 첫 누름·특수 키 새 누름마다 `bounceSeq` +1, 반복 누름은 불변). 각 자동 Step의 Given은 「키 모두 뗌 · `bounceSeq` 짝수」이며 TC-169만 `kbFrame 0`을, TC-173만 「현재 시각 = tick 경계」를 더 요구한다.

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-169 | `SPECIAL_MANIFEST`로 마운트(T0), 들림, `bounceSeq 0`·`kbFrame 0` | 일반 키 첫 누름 젤리 → 반복 부르르 → 뗌 정지. 들림, `bounceSeq 1`·`kbFrame 1`, 현재 T0+632 |
| 1a | 연결(TC 아님) | Step 1 종료 | 일반 키 누름·뗌 1쌍(`repeat` 없음) → `bounceSeq 2`·`kbFrame 2`·들림 ⇒ TC-170 Given(`bounceSeq` 짝수·키 모두 뗌) |
| 2 | TC-170 | Step 1a 종료 | 스페이스 꾹(젤리 → 부르르) → Enter 새 누름 젤리 → Enter 반복 부르르 → Enter 뗌 정지 → 스페이스 뗌. 들림, `bounceSeq 4`, `kbFrame 1` |
| 3 | TC-172 | Step 2 종료(키 모두 뗌·`bounceSeq` 짝수) | 이동 (960,1080)(팔 `DOWN`, `armAtRest false`) 뒤 A~E 검사 → 들림, `bounceSeq 6` |
| 3a | 연결(TC 아님) | Step 3 종료(현재 T0+632) | `advanceTimersByTime(68)` — 입력 없음, 현재 T0+700(tick 경계), 상태 불변 ⇒ TC-173 Given(S = T0+700) |
| 4 | TC-173 | Step 3a 종료 | 뗌 누락 방어 2회(499ms 유지·500ms 정지·이동 무관) → 뗌. 들림, `bounceSeq 7`. 이 Step 시작 이후 조회 추가 0회·`setSettings` 0회 |
| 5 | TC-175(수동) | 환경 전환: 실제 앱·메모장 | 꾹 누름 체감·배경 정지·팔 유지·즉시 정지·느린 반복 설정 실측 |

### TC-FLOW-09 · S-9 펜 쥔 손으로 글씨 쓰듯(마우스 = 팔과 손 이동, 키보드 = 손 그림만, 키보드 손은 가만히)
Steps: TC-196 → TC-198 → TC-197 → TC-199 → TC-202 → (환경 전환) TC-203 (v1.1 신규, CR-025)

같은 마운트를 이어 가는 흐름이다. TC-197·TC-199·TC-202는 손 자세를 Step 시작 값과 비교하거나(커서 무관) 프레임 집합으로 단언하므로 앞 Step의 커서·프레임을 Given으로 그대로 받는다. TC-199의 짝·프레임 값(`jellyAlt`·`pen_down_1`)은 단독 실행 값이며 FLOW에서는 아래 종료 상태의 값으로 읽는다(판정 대상은 「반복 누름 동안 손 그림·변형 유지, 애니메이션 클래스는 `.jellyWrap` 하나」).

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-196 | `PEN_MANIFEST`·penPos (389,492)로 마운트(T0), 입력 없음 | 펜 손 `pen_up`·쉬는 자세(회전 0)·`.jellyWrap` 마지막 자식, 키 모두 뗌, `kbFrame 0`·`bounceSeq 0`, `armAtRest true` |
| 2 | TC-198 | Step 1 종료 | 커서 (960,1080), 팔 `DOWN`·손 ≈ (27.60, 118.56, −45°), 버튼 `none`, 키·버튼 모두 뗌, `kbFrame 0`·`bounceSeq 2`(v1.2 개정, CR-027 — 클릭 누름 2회가 각각 첫 누름) |
| 3 | TC-197 | Step 2 종료(키·버튼 모두 뗌·`kbFrame 0` — 손 자세는 Step 시작 값 = Step 2 종료 값과 비교. TC-197은 `.jellyWrap` class를 단언하지 않으므로 `bounceSeq` 짝만 이어받음) | 손 그림 교체 확인 뒤 키 모두 뗌·`pen_up`, 손 자세 Step 2와 같음, `kbFrame 1`·`bounceSeq 7`(TC-197 단독 값 5 + Step 2의 2 — v1.2) |
| 4 | TC-199 | Step 3 종료(키 모두 뗌). TC-199의 첫 동작 이동 (960,0) | 누름 → `jellyWrap jelly`(`bounceSeq 8` = phase 0)·손 `pen_down_0`(`kbFrame 1→0`) → 반복 `jellyWrap shiver`·손 그대로 → 뗌 `jellyWrap`·`pen_up`. `kbFrame 0`·`bounceSeq 8`(v1.2) |
| 5 | TC-202 | Step 4 종료(키 모두 뗌, penPos (389,492)) | penPos (100,50) → null(419,453), 펜 모드 꺼짐(kb_down 3장 순환) → 켜짐(펜 누름 2장 순환). 이 Step 시작 이후 조회 추가 0회·`setSettings` 0회 |
| 6 | TC-203(수동) | 환경 전환: 실제 앱·메모장, 펜 그림 등록 | 팔 끝 추종·기울기·크기 불변·손 그림만 교체·kb 고정·클릭 = 손 누름 그림(v1.2, CR-027)·설정 반영 실측 |

### TC-FLOW-10 · S-10 펜 쥔 손으로 클릭할 때도 글씨 쓰듯 출렁(클릭 = 펜을 대는 누름, 손 그림 없으면 클릭 파츠만)
Steps: TC-214 → [연결 1a] → TC-215 → TC-216 → [연결 3a] → TC-217 → [연결 4a] → TC-218 → [재마운트] TC-219 → (환경 전환) TC-222 (v1.2 신규, CR-027)

짝·프레임은 v1.2 절 공통 전제 규칙을 따른다. 자동 Step TC-215~TC-218의 Given은 「키·버튼 모두 뗌 · `kbFrame 0` · `bounceSeq` 짝수」(= 새 마운트와 같은 짝·프레임)이다. 펜 모드 클릭 누름·뗌 1쌍은 `kbFrame`·`bounceSeq`를 함께 +1하므로, 둘 중 하나만 맞출 때는 **일반 키 겹쳐 누르기**(`{pressed true, heldCount 1}` → `{pressed true, heldCount 2}` → `{pressed false, heldCount 0}` — `kbFrame` +2 ≡ 0, `bounceSeq` +1)를 쓴다.

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-214 | `PEN_MANIFEST`·penPos (389,492)로 마운트(T0), 키·버튼 모두 뗌, `kbFrame 0`·`bounceSeq 0`, 이동 없음 | 좌우 클릭 왔다갔다 확인 → 모두 뗌·`pen_up`, `kbFrame 1`·`bounceSeq 3`, `armAtRest true` |
| 1a | 연결(TC 아님) | Step 1 종료 | 오른 누름·뗌 1쌍 → `kbFrame 0`·`bounceSeq 4`·모두 뗌 ⇒ TC-215 Given |
| 2 | TC-215 | Step 1a 종료 | 일반 키와 겹침 확인 → 모두 뗌·`pen_up`, `kbFrame 0`·`bounceSeq 6`(그대로 TC-216 Given) |
| 3 | TC-216 | Step 2 종료 | 특수 키와 겹침 확인 → 모두 뗌·`pen_up`, `kbFrame 0`·`bounceSeq 9` |
| 3a | 연결(TC 아님) | Step 3 종료 | 일반 키 겹쳐 누르기 1회 → `kbFrame 0`·`bounceSeq 10`·모두 뗌 ⇒ TC-217 Given |
| 4 | TC-217 | Step 3a 종료 | 부르르 중 클릭·클릭 비부르르 확인 → 모두 뗌·`pen_up`, `kbFrame 1`·`bounceSeq 12`, 현재 T0+1000 이상 |
| 4a | 연결(TC 아님) | Step 4 종료 | 왼 누름·뗌 1쌍(`kbFrame 0`·`bounceSeq 13`) → 일반 키 겹쳐 누르기 1회 → `kbFrame 0`·`bounceSeq 14`·모두 뗌 ⇒ TC-218 Given |
| 5 | TC-218 | Step 4a 종료 | 좌우 동시 누름 한쪽 뗌 확인 → 모두 뗌·`pen_up`, `kbFrame 0`·`bounceSeq 16`. Step 1 시작 이후 조회 추가 0회·`setSettings` 0회 |
| 6 | TC-219 | 재마운트 Step: 사용자가 손 그림을 넣지 않은 경우 = `NO_PEN`(이어서 `PARTIAL_PEN`)으로 새 마운트 — 저장 상태(설정)는 Step 1과 같음 | 클릭은 클릭 파츠만, 젤리·키보드 프레임 변화 없음 |
| 7 | TC-222(수동) | 환경 전환: 실제 앱·메모장, 펜 그림 등록(끝에 `pen_up` 삭제) | 클릭 왔다갔다 출렁·키/특수 키/부르르와 섞기·좌우 동시·손 그림 없을 때 클릭 파츠만 실측 |

### TC-FLOW-11 · S-11 자리를 정해 잠가 두고 뒤 창을 그대로 클릭, 대기·쉬는중 그림 없이 `kb_up`만으로
Steps: TC-223 → TC-224 → TC-225 ① → [재마운트] TC-227 ② → (환경 전환) TC-228 (v1.3 신규, CR-029)

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-223 | 사용자가 필수 3장만 등록(`MIN`), 설정 `SETTINGS`(잠금 꺼짐)로 마운트(T0), 입력 없음 | 대기, `layers` `['u:kb_up']`, 상태 레이어 없음, `bounceSeq 0` |
| 2 | TC-224 | Step 1 종료(같은 마운트) | 이동 뒤 5분 무입력 → 쉬는중, `layers` `['u:kb_up']`, 팔 `REST`, `bounceSeq 0`, 현재 T0+300000 |
| 3 | TC-225 ① | Step 2 종료(쉬는중·키 입력 없음 — TC-225 ① Given 「`bounceSeq 0`, 대기 또는 쉬는중」 충족). 첫 누름이 깨어남을 겸한다 | 누름 `u:kb_down_0`만·뗌 `u:kb_up` 반복 확인 → 모두 뗌, `bounceSeq 2`. Step 1 시작 이후 조회 추가 0회·`setSettings` 0회 |
| 4 | TC-227 ② | 재마운트 Step: 사용자가 설정 창에서 위치 잠금을 켜고(`LOCKED`) 클릭 그림(선택)을 하나 더 등록한 뒤(`MIN_CLICK`) 오버레이가 새로 뜬 상태 — 저장 상태는 Step 1 + `positionLock true` + `mouse_left` | 잠금 중 키·이동·클릭 반응 그대로, 설정 창 배율 0.5 반영(`scale(0.25)`), 잠금 해제 수신에 화면 불변, `setSettings` 0회 |
| 5 | TC-228(수동) | 환경 전환: 실제 앱·메모장을 오버레이 아래에 겹침, 잠금 토글·대기/쉬는중 그림 비우기 | 클릭 통과·끌기/Ctrl+휠 무반응·입력 반응 유지·재적용/재시작 뒤 유지·해제 후 복귀·`kb_up`만으로 대기/쉬는중 실측 |

### TC-FLOW-12 · S-12 펜 손을 넣어 둔 채 「펜 손 사용」을 끄면 타자는 키보드 그림·클릭은 클릭 파츠만·손은 팔 끝을 따라다님, 다시 켜면 글씨 쓰듯
Steps: TC-235 → [재마운트] TC-232 → [연결 2a] → TC-233 → TC-234 → [재마운트] TC-236 → (환경 전환) TC-237 (v1.4 신규, CR-033)

짝·프레임은 v1.4 절 공통 전제 규칙을 따른다(꺼짐 `kbFrames` 3, 켜짐 2). 재마운트 Step은 사용자가 토글 값을 저장한 뒤 오버레이가 새로 뜬 상황을 조회 mock(`getSettings`)으로 재생성한다.

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-235 | 사용자가 펜 손을 켠 채 쓰던 상태: `SETTINGS_ON`·`PEN_MANIFEST`로 마운트(T0), 모두 뗌·`kbFrame 0`·`bounceSeq 0` | 켜짐(손 누름 그림) → 설정 창에서 끔(`settings://changed` — 키보드 그림·클릭 파츠만, 상태 이어짐) → 다시 켬(글씨 쓰듯) 확인. 켜짐·모두 뗌·`kbFrame 0`·`bounceSeq 5`, 조회 추가 0회·`setSettings` 0회 |
| 2 | TC-232 | 재마운트 Step: 사용자가 끈 채 앱을 다시 시작한 날 — 저장 상태 = `SETTINGS_OFF`(`mouse.penMode false`)·같은 이미지. 새 마운트 = 모두 뗌·`kbFrame 0`·`bounceSeq 0` | 타자에 `kb_down`·스페이스 그림, 손 `pen_up` 고정 확인. 모두 뗌·`kbFrame 1`·`bounceSeq 4` |
| 2a | 연결(TC 아님) | Step 2 종료 | 키 누름·뗌 2쌍 → `kbFrame 0`(1 + 2 mod 3)·`bounceSeq 6`·모두 뗌 ⇒ TC-233 Given(`kbFrame 0`·`bounceSeq` 짝수) |
| 3 | TC-233 | Step 2a 종료(이동 없음 — `armAtRest true`) | 클릭 파츠만·젤리 없음·손 `pen_up` 확인. 모두 뗌·`kbFrame 1`·`bounceSeq 7`, `armAtRest true` |
| 4 | TC-234 | Step 3 종료(모두 뗌 — TC-234는 프레임·짝 무관). 가짜 시계 진행 없음 → 마지막 입력 시각 = Step 시작 시각 | 손이 팔 끝을 따라 이동·기울기 → 5분 무입력 뒤 쉬는 자세, `layer rest`. Step 2 시작 이후 조회 추가 0회·`setSettings` 0회 |
| 5 | TC-236 | 재마운트 Step: 설정 창에서 다시 켠 뒤 새로 뜬 오버레이 — 저장 상태 = `SETTINGS_ON`. 새 마운트 = 모두 뗌·`kbFrame 0`·`bounceSeq 0` | 클릭을 누른 채 토글이 바뀌어도 누름 그림·젤리가 남지 않음 확인. 켜짐·모두 뗌·`kbFrame 0`·`bounceSeq 2` |
| 6 | TC-237(수동) | 환경 전환: 실제 앱·메모장, 펜 그림 등록, 설정 창 「펜 손 사용」 토글 | 끄기·켜기 즉시 반영·손 팔 끝 추종·클릭 파츠만·재시작 뒤 유지 실측 |

### TC-FLOW-13 · S-13 장발 캐릭터의 뒷머리를 따로 넣어 팔·손이 머리카락 앞으로 지나가고, 타자 칠 때 머리카락도 몸과 함께 출렁
Steps: TC-242 → TC-245 → TC-241 → TC-243 → TC-244 → (환경 전환) TC-247 (v1.5 신규, CR-037)

짝·프레임은 v1.5 절 공통 전제 규칙을 따른다. 호출 횟수는 Step 시작 기준(마운트 이후 누계로는 조회·`onAssetsChanged` 구독 각 1회 그대로).

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-242 | 헤어 등록 전: `SETTINGS_OFF`·`NO_HAIR_MANIFEST`로 마운트(T0), 입력 없음 | 헤어 없음·`.jellyWrap` 첫 자식 `.armWrap` 확인. 모두 뗌·`kbFrame 0`·`bounceSeq 0`·대기·펜 모드 꺼짐 |
| 2 | TC-245 | Step 1 종료(같은 마운트, 입력 없음) | 설정 창에서 헤어 등록 → 다른 그림으로 교체 → 비우기 → 다시 등록(`assets://changed` 4회) 즉시 반영 확인. `manifest` = `HAIR_MANIFEST`, 입력 없음, 조회 추가 0회 |
| 3 | TC-241 | Step 2 종료: `manifest` = `HAIR_MANIFEST`(이벤트 페이로드 — 같은 매니페스트로 새로 마운트한 것과 같은 DOM), 입력 없음 | 겹침 순서 헤어 → 배경 → 팔 → 본체 → 펜 손 확인(CR-051 — `.canvas` 첫 자식 `.hairWrap`. TC-241 ①만, ② 뽀모도 변형은 새 마운트라 TC 단독). 상태 Step 2와 같음, 조회·구독 추가 0회 |
| 4 | TC-243 | Step 3 종료: 모두 뗌·`kbFrame 0`·`bounceSeq 0`·대기·펜 모드 꺼짐·마지막 입력 시각 T0 = TC-243 Given | 키·특수 키·이동·클릭·쉬는중/깨어남·펜 모드 켬·잠금 수신에도 헤어 불변. 모두 뗌·`kbFrame 1`·`bounceSeq 4`·펜 모드 켜짐·`positionLock true`·대기 |
| 5 | TC-244 | Step 4 종료: 모두 뗌·`bounceSeq 4`(짝수) — TC-244 Given(펜 모드·잠금 값 무관) 충족 | 젤리(A = `bounceSeq 5` → `jellyWrap jellyAlt`)·부르르 동안 헤어는 `.jellyWrap` 안, 배경은 밖. 모두 뗌·`repeating false` |
| 6 | TC-247(수동) | 환경 전환: 실제 앱·메모장, 헤어 등록(펜 손 있으면 함께) | 팔·손이 머리카락 앞·젤리/부르르 함께·배경 정지·등록/비우기 즉시 반영 실측 |

---

## 추적표

### v1.5 추가분 (CR-037) — 아래 v1.4·v1.3·v1.2·v1.1·v1.0·v0.9·v0.8·기존 표에 더한다

요구 ↔ TC(추가)

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-30 | TC-238, TC-239, TC-240, TC-241, TC-242, TC-243, TC-244, TC-245, TC-246 | TC-247(MC-24) |
| R-17(더함 — 배경은 헤어 아래·래퍼 밖, 젤리·부르르 중 정지) | TC-241, TC-244 | TC-247 |
| R-16(더함 — 팔은 헤어 위, 헤어 유무와 무관하게 `.armWrap` 자리) | TC-241, TC-242, TC-246 | TC-247 |
| R-25(더함 — 펜 쥔 손은 헤어 위·`.jellyWrap` 마지막 자식) | TC-241 | TC-247 |
| R-23(더함 — 헤어도 젤리를 본체와 함께) | TC-244 | TC-247 |
| R-24(더함 — 헤어도 부르르를 본체와 함께) | TC-244 | TC-247 |
| R-19(더함 — 팔이 없으면 헤어 다음이 몸통, 헤어도 없으면 몸통이 첫 자식) | TC-246 | — |
| R-05·R-07·R-09·R-22·R-28·R-29(더함 — 상태·키·클릭·특수 키·위치 잠금·펜 모드와 무관하게 헤어 불변) | TC-243 | — |

설계 항목 ↔ TC(CR-037)

| 설계 항목 | TC |
|---|---|
| design.md §10.11 자리(v1.5 `.jellyWrap` 첫 자식 → **CR-051: `.canvas` 첫 자식 `.hairWrap`, 겹침 헤어 → 배경 → 뽀모도 → 팔 → 본체 → 펜 손** — 설계 개정 대기) | TC-241, TC-242, TC-245, TC-246 |
| §10.11 그림(`findEntry(manifest, 'hair')` 1장, 상태·입력·펜 모드·잠금 무관) | TC-238, TC-243 |
| §10.11 좌표·배율(`styles.layer`, 좌표 계산 없음, `.canvas` 배율 공유 — `.hairWrap`도 `.canvas` 안) | TC-238, TC-241, TC-247 ⑦ |
| §10.11 모션(자체 애니메이션·인라인 `transform` 없음, 젤리·부르르는 v1.5 부모 `.jellyWrap` → **CR-051: `.hairWrap`이 `.jellyWrap`과 같은 motion 클래스**) | TC-243, TC-244, TC-314, TC-247 ③④ |
| §10.11 없을 때(`null`, 안내·오류 없음, 선택 슬롯) | TC-239, TC-242, TC-246 ③, TC-247 ⑧ |
| §10.11 갱신(`assets://changed` → `setManifest` → 재렌더, 입력·tick으로 재렌더 없음) | TC-240, TC-243, TC-245 |
| §10.11 성능(`<img>` 1개, 리렌더 원인 `manifest`뿐) | TC-240, TC-243(속성 변경 기록 0건) |
| §10.11 회귀 ① / ② / ③ / ④ / ⑤ / ⑥ / ⑦ / 수동 | TC-238·TC-241 / TC-241 / TC-242·TC-246 ③ / TC-243 / TC-244 / TC-245 / TC-246 / TC-247 |
| design.md §1 출력(`.jellyWrap` 안 `HairLayer`) | TC-241 |
| §2 ASCII `[hair]`·아래 문단 | TC-241, TC-247 ①② |
| §7 `hair` 행(`AssetSlot 'hair'` contract v0.17, `getAssetManifest`·`onAssetsChanged`로 받음, 새 래퍼 없음, 항목 없으면 투명) | TC-238, TC-239, TC-241, TC-245 |
| §8·§9 접근성 표(`HairLayer` `alt=""`) | TC-238, TC-241 |
| §10.1 hair 행·표 아래 문단 | TC-241, TC-243, TC-244 |
| design/components.md §3 `.jellyWrap` 행(자식 순서 `HairLayer` → `MouseArm` → `LayerStack` → `PenHand`) | TC-241, TC-245 |
| design/components.md §3 `HairLayer` 행(항상 렌더·내부 `null`·`settings.mouse`·`monitors` 무관) | TC-239, TC-242, TC-246 |
| design/components.md §3 `MouseArm` 행(둘째 자식) | TC-241, TC-242 |
| design/components.md §3 DOM 구조(`HairLayer <img class="layer">`) | TC-241 |
| design/components.md §3 규칙 7(직계 첫 자식·래퍼 밖 금지·class `layer`만) | TC-241, TC-244 |
| design/functions.md §5.3 `HairLayer` 렌더(시그니처·`memo`·`null`·img 속성·호출 위치) | TC-238, TC-239, TC-240, TC-241 |
| requirements §1 용어 주(CR-037 — 펜 쥔 손은 본체 위 유지) | TC-241 |
| requirements §3 `AssetSlot 'hair'` 행 | TC-238 |
| requirements §3 `assets://changed` 행(헤어 등록·교체·비우기) | TC-245 |

상태 전이표(확정사항 §5) ↔ TC(CR-037): 변경 없음 — 헤어는 상태기계의 입력·출력이 아니다(TC-243이 전이 중 헤어 불변을 확인).

사용자행 ↔ TC-FLOW(추가)

| 사용자행 | TC-FLOW |
|---|---|
| S-13 | TC-FLOW-13 |

CR ↔ TC(추가)

| CR | TC |
|---|---|
| CR-037 | 신규 TC-238~TC-247, 재확인(기대·스펙 불변) TC-152·TC-153·TC-196·TC-232·TC-234·TC-064·TC-066·TC-101·TC-111·TC-157, TC-FLOW-13 |

### v1.4 추가분 (CR-033) — 아래 v1.3·v1.2·v1.1·v1.0·v0.9·v0.8·기존 표에 더한다

요구 ↔ TC(추가)

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-29 | TC-187, TC-201, TC-225, TC-229, TC-230, TC-231, TC-232, TC-233, TC-234, TC-235, TC-236, TC-025 | TC-237(MC-23) |
| R-25(더함 — 펜 모드 = `pen_up` && `penMode`, 꺼짐이어도 손은 팔 끝 추종) | TC-229, TC-230, TC-231, TC-232, TC-234, TC-235 | TC-237 |
| R-26(더함 — 클릭 누름은 토글 켜짐일 때만, 전환 중 눌린 클릭) | TC-231, TC-233, TC-235, TC-236 | TC-237 |
| R-07(더함 — 꺼짐 = 키보드 누름 그림) | TC-230, TC-232, TC-233, TC-235 | TC-237 |
| R-22(더함 — 꺼짐 = 특수 키 그림은 키보드 레이어) | TC-230, TC-232 | TC-237 |
| R-09(더함 — 꺼짐 = 클릭 파츠만) | TC-233, TC-235, TC-236 | TC-237 |
| R-23(더함 — 꺼짐 키 누름 젤리는 기존 규칙, 클릭 젤리 없음) | TC-232, TC-233, TC-235, TC-236 | TC-237 |
| R-05·R-15(더함 — 꺼짐이어도 쉬는중 진입 시 팔·손 쉬는 자세) | TC-234 | — |

설계 항목 ↔ TC(CR-033)

| 설계 항목 | TC |
|---|---|
| design.md §10.10 판정(`isPenMode(manifest, settings.mouse)`, 한 번 계산해 `config`·`LayerStack`·`PenHand`에 같은 값) | TC-229, TC-232, TC-233, TC-235 |
| §10.10 `config`(`kbFrames` = `penMode ? penDownFrameCount : kbDownFrameCount`, `clickPress: penMode`, 의존성 `penMode`) | TC-232(3장), TC-233(`clickPress false`), TC-235(전환 시 재계산), TC-188·TC-197(켜짐 2장) |
| §10.10 `LayerStack` prop `penMode`(내부 `isPenMode` 호출 없음) | TC-230, TC-191 |
| §10.10 `PenHand` prop `penMode`(꺼짐 = `pen_up`, 위치·추종은 §10.7 그대로) | TC-231, TC-234 |
| §10.10 꺼짐 동작 표 — 키 누름 행 | TC-230, TC-232 |
| §10.10 꺼짐 동작 표 — 왼·오른 클릭 누름 행 | TC-231, TC-233 |
| §10.10 꺼짐 동작 표 — 마우스 이동 행 | TC-231, TC-234 |
| §10.10 전환(다음 렌더부터·상태기계 초기화 없음) | TC-235 |
| §10.10 전환(켜짐 → 꺼짐 눌린 클릭은 떼면 빠짐 / 꺼짐 → 켜짐 눌린 클릭은 누름 아님) | TC-236, TC-207 |
| §10.10 계약(`MouseSettings.penMode` 기본 `false`, 필드 없는 옛 설정 = 꺼짐) | TC-229, TC-025 |
| §10.10 §7 계약 사용표 추가 행(래퍼 없음, `getSettings`·`onSettingsChanged`, 실패 표시 없음) | TC-235, TC-237 |
| §10.10이 대체한 §4 `config` 행·§10.7 첫 줄·§10.8 적용 조건 | TC-201, TC-219, TC-225, TC-233 |
| design/functions.md §5.3 CR-033 `isPenMode`(예 4개) | TC-187, TC-229 |
| §5.3 CR-033 `LayerStack` 렌더 | TC-191, TC-230 |
| §5.3 CR-033 `OverlayApp` `penMode` | TC-232, TC-233, TC-234, TC-235, TC-236 |
| §5.5 `PenHand` 렌더 CR-033 개정(②) | TC-231 |
| design/components.md §3 `LayerStack` 행(CR-033) | TC-230 |
| design/components.md §3 `PenHand` 행(CR-033) | TC-231, TC-234 |
| requirements §1 용어 주(CR-033) | TC-201, TC-225, TC-229, TC-233 |
| requirements §3 `MouseSettings.penMode` 행 | TC-229, TC-025, TC-235 |

상태 전이표(확정사항 §5) ↔ TC(CR-033): 변경 없음 — 전이·설정값 주입 규칙은 그대로이고 `clickPress` 값의 출처만 `penMode`로 바뀐다(TC-207 재확인).

사용자행 ↔ TC-FLOW(추가)

| 사용자행 | TC-FLOW |
|---|---|
| S-12 | TC-FLOW-12 |

CR ↔ TC(추가)

| CR | TC |
|---|---|
| CR-033 | 신규 TC-229~TC-237, 개정 TC-187·TC-201·TC-225·TC-025, 재확인·픽스처 TC-188·TC-191·TC-192~TC-199·TC-200·TC-202·TC-207·TC-212~TC-221, TC-FLOW-12 |

### v1.3 추가분 (CR-029) — 아래 v1.2·v1.1·v1.0·v0.9·v0.8·기존 표에 더한다

요구 ↔ TC(추가)

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-27 | TC-223, TC-224, TC-225, TC-226 | TC-228(MC-22 ⑩) |
| R-28 | TC-227 | TC-228(MC-22 ①~⑨) |
| R-19(더함 — 일반 상태 그림은 선택, 없으면 z2 투명) | TC-223, TC-226 | — |
| R-05(더함 — 대기 ↔ 쉬는중 전이는 그림 유무와 무관) | TC-224, TC-225, TC-226 | — |
| R-11·R-15(더함 — 그림이 없어도 쉬는중 진입 시 팔 쉬는 위치) | TC-224 | — |
| R-07(더함 — 그림 없음·잠금 중에도 누름 그림) | TC-225, TC-227 | TC-228 |
| R-25(더함 — 펜 모드 + `idle`·`rest` 없음 = `kb_up` 고정) | TC-225 | — |
| R-23(더함 — 그림 없는 매니페스트에서도 젤리 교대) | TC-225 | — |
| R-03(더함 — 잠금 중 배율 = 설정 창 → `settings://changed`) | TC-227 | TC-228(⑥) |
| R-04(더함 — 잠금 중 Ctrl+휠 비동작, R-28 용어 주) | — | TC-228(④·④′·⑨) |
| R-12(더함 — 잠금 중 끌기 불가, 속성은 유지) | TC-227 | TC-228(③·⑨) |
| R-09(더함 — 잠금 중 클릭 파츠 교체 그대로) | TC-227 | TC-228(⑤) |
| R-01(더함 — 필수 그림 안내·잠금 표시 문구 없음) | TC-223~TC-227 | TC-228(②) |

설계 항목 ↔ TC(CR-029)

| 설계 항목 | TC |
|---|---|
| design.md §10.9 판정(소스 변경 없음·`settings.positionLock` 미참조) | TC-227 |
| §10.9.1 L-1 적용 주체 core(`set_ignore_cursor_events`) | TC-228(②·⑦·⑧) |
| §10.9.1 L-2 끌기 불가(`data-tauri-drag-region` 속성 그대로) | TC-227 ①, TC-228(③·⑨) |
| §10.9.1 L-3 Ctrl+휠 불가(`onWheel` 미호출) | TC-228(④) |
| §10.9.1 L-4 적용 순서·앱 시작 적용 | TC-227 ②(해제 수신에 화면 불변), TC-228(⑧) |
| §10.9.1 L-5 잠금 중 그대로인 것(키·이동·클릭) | TC-227 ②, TC-228(⑤) |
| §10.9.1 L-6 잠금 중 배율(설정 창 → P-6) | TC-227 ②, TC-228(⑥) |
| §10.9.1 L-7 잠금 해제 = 설정 창만, 오버레이에 해제 수단·안내 없음 | TC-227, TC-228(②·⑨) |
| §10.9.1 방어 코드 미채택 근거 1~4 | TC-227 ①(잠금 값에 따른 렌더 분기 없음 — DOM 동일) |
| §10.9.1 잔여 위험(비활성 창 스크롤 + 포커스) | TC-228(④′) |
| §10.9.2 표 1행(`idle` 없음 · 대기 · 누름 없음) | TC-223 |
| §10.9.2 표 2행(`rest` 없음 · 쉬는중, 팔 쉬는 위치) | TC-224 |
| §10.9.2 표 3행(`idle`만 · 쉬는중) | TC-226 |
| §10.9.2 표 4행(`idle`·`rest` 없음 · 키 누름) | TC-225 ① |
| §10.9.2 표 5행(`idle`·`rest` 없음 · 펜 모드) | TC-225 ② |
| §10.9.2 근거 소스(`Layer` `null`·키보드 레이어 선택) | TC-223, TC-225, TC-226 |
| §10.9.2 「상태기계는 그림 유무를 모른다」 | TC-224, TC-225 ①, TC-226 |
| §10.9.2 「필수 그림 안내는 설정 창 몫 — 오버레이는 오류·안내 없음」 | TC-223~TC-226 |
| §10.9.2 회귀 ①~④ / ⑤~⑨ | TC-223~TC-226 / TC-228 |
| design.md §7 `positionLock` 행(오버레이는 읽지 않음) | TC-227 |
| design/a11y.md 마우스 조작(CR-029 — 잠금 중 두 조작 모두 창에 닿지 않음, 대체 수단 설정 창) | TC-228 |
| requirements §1 용어 주(CR-029 — R-19 「각 1장」 대체, R-04·R-12 잠금 꺼짐일 때만) | TC-223~TC-227, TC-228 |
| requirements §3 `Settings.positionLock` 행 | TC-227 |

확정사항 §5 전이표 행 ↔ TC(추가): 행 변동 없음. 행1 「아무 입력 없음」 — TC-223(상태 그림 없음), 행2 「5분 무입력」 — TC-224·TC-226(그림 유무와 무관하게 전이), 행3 「키 입력」 — TC-225 더함.

CR ↔ TC(추가)

| CR | 상태(대장) | TC |
|---|---|---|
| CR-029 | 요구·설계 완료, **오버레이 소스 변경 없음**(core window·settings 몫) | 신규 TC-223~TC-227(자동 — 처음부터 Green 기대), TC-228(수동 MC-22), TC-FLOW-11 / 기존 TC 개정 없음 |

사용자행 ↔ TC-FLOW(추가)

| 사용자행 | TC-FLOW |
|---|---|
| S-11 | TC-FLOW-11 |

변경 대기열: CR-029는 오버레이 소스 변경이 없어 대기열 행을 만들지 않는다(검증은 TC-223~TC-227 실행 결과로 닫는다).

### v1.2 추가분 (CR-027) — 아래 v1.1·v1.0·v0.9·v0.8·기존 표에 더한다(v1.1 표의 「클릭 무반응」·「클릭 이미지는 팔만」·「버튼은 손 그림 불변」 문구는 이 표로 대체)

요구 ↔ TC(추가)

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-26 | TC-001(개정), TC-198(개정), TC-204~TC-221 | TC-203(개정), TC-222 |
| R-23(더함 — 펜 모드 클릭 젤리·짝 교대) | TC-205, TC-208, TC-209, TC-214~TC-217, TC-219 | TC-222 |
| R-25(더함 — 손 그림 선택 = `isPressing`) | TC-212, TC-213, TC-214, TC-216, TC-220 | TC-222 |
| R-09(더함 — 클릭 파츠 교체 그대로, 펜 모드 손 그림은 R-26) | TC-198, TC-206, TC-207, TC-214, TC-218, TC-219 | TC-222 |
| R-24(더함 — 클릭은 부르르를 만들지도 끄지도 않음) | TC-210, TC-217 | TC-222 |
| R-22(더함 — 특수 키 겹침·입력 비보관) | TC-209, TC-211, TC-212, TC-214, TC-216 | — |
| R-07(더함 — 비펜 모드 클릭은 프레임 불변) | TC-207, TC-208, TC-219 | — |
| R-05(더함 — 클릭 = `wake`) | TC-211, TC-221 | — |
| R-15(더함 — 클릭은 `armAtRest` 불변) | TC-221 | — |

설계 항목 ↔ TC(CR-027)

| 설계 항목 | TC |
|---|---|
| design.md §4 `machine` 초기값 `clickHeld: []` | TC-001, TC-204 |
| design.md §4 `config.clickPress = isPenMode(manifest)` | TC-214, TC-219, TC-220 |
| design.md §6 P-4(CR-027 — 펜 모드 누름·뗌 흐름) | TC-198, TC-214, TC-218, TC-219 |
| design.md §7 `input://mouse-button` 행(기존 페이로드 재사용, 새 필드 없음) | TC-214, TC-222 |
| design.md §10.1 pen 행(누름 판정 `isPressing`) | TC-212, TC-213, TC-214 |
| design.md §10.3 젤리 트리거(CR-027 — 펜 모드 첫 클릭 누름, 유지 조건 `isPressing`) | TC-205, TC-214, TC-215 |
| §10.7 손 그림 선택(CR-027 개정 — 클릭도 누름) | TC-198, TC-212 |
| §10.8 적용 조건(펜 모드만) | TC-207, TC-219 |
| §10.8 bridge 계약(새 계약 없음) | TC-214 |
| §10.8 상태기계 변경 요지 | TC-205, TC-206 |
| §10.8 규칙표 1·2·3 | TC-198, TC-205, TC-212, TC-214 |
| §10.8 규칙표 4·5·6·7 | TC-208, TC-212, TC-215 |
| §10.8 규칙표 8·9·10 | TC-209, TC-212, TC-216 |
| §10.8 규칙표 11·12 | TC-210, TC-217 |
| §10.8 규칙표 13 | TC-206, TC-218 |
| §10.8 규칙표 14 | TC-207, TC-219 |
| §10.8 유지되는 것(`kb_up` 고정·클릭 파츠·`armAtRest`·유휴 `wake`) | TC-211, TC-214, TC-218, TC-221 |
| §10.8 젤리 길이(누르는 동안만 클래스) | TC-205, TC-214 |
| §10.8 모드 전환(수용) | TC-207, TC-220 |
| §10.8 입력 비보관 | TC-211, TC-214 |
| design/components.md §3 `OverlayApp` 행(CR-027 `config.clickPress`, 핸들러 그대로) | TC-214, TC-219, TC-220 |
| design/components.md §3 `PenHand` 행(CR-027 `isPressing`, props 변경 없음) | TC-213 |
| design/functions.md §5.2 바운스 재생 카운터 ⓐ(`isPressing`) | TC-208, TC-215 |
| §5.2 `mouseButton` 펜 모드 행(`onMouseButton` ①~④·예) | TC-205, TC-206, TC-207 |
| §5.2 `isPressing` | TC-204 |
| §5.2 `isRepeating`(CR-027 불변) | TC-210, TC-217 |
| §5.2 `wrapMotion` ② | TC-208, TC-210 |
| §5.2 `bouncePhase`(CR-027) | TC-204, TC-205 |
| §5.2 `ClickButton`·`MachineState.clickHeld`·`MachineConfig.clickPress`·`DEFAULT_MACHINE_CONFIG` | TC-204, TC-206, TC-211 |
| §5.2 기록 금지(CR-027 `clickHeld`) | TC-211 |
| §5.5 `pickPenEntry` ②·CR-027 예 | TC-212 |
| §5.5 `PenHand` Props(`machine`만 읽음, `mouse.button` 안 읽음) | TC-213 |
| requirements §1 용어 주(R-25 「마우스 클릭 아님」 확장) | TC-198, TC-203 |
| requirements §3 `input://mouse-button` 행(R-26) | TC-214 |

확정사항 §5 전이표 행 ↔ TC(추가): 전이표 행 변동 없음(CR-027은 확정사항 §3 「펜 쥔 손 파츠」 끝 「마우스 클릭도 키 입력처럼」). 행6 「마우스 클릭」의 펜 모드 확장 — 순수 TC-205·TC-206·TC-207, 화면 TC-214·TC-219 더함. 행7 「둘 다」 — TC-208·TC-215 더함.

사용자 시나리오 행 ↔ TC-FLOW(추가): **S-10**(requirements v2.3 §2, R-09·R-23·R-25·R-26) → **TC-FLOW-10**. S-9 → TC-FLOW-09(v1.2 종료 상태 개정).

CR ↔ TC(추가): **CR-027**(요구 확정 🔒 2026-09-24·설계 완료·소스 미적용, 새 계약 없음) — 신규 TC-204~TC-222(자동 18 + 수동 1 — MC-21) / 개정 TC-001, TC-198, TC-203(MC-20 ⑥), TC-FLOW-09 / TC-FLOW-10 / 새 스펙 `inputMachine.click.test.ts`·`penClick.test.tsx`·`OverlayApp.penClick.test.tsx`, 개정 스펙 `inputMachine.transitions.test.ts`·`OverlayApp.pen.test.tsx`.

### v1.1 추가분 (CR-025) — 아래 v1.0·v0.9·v0.8·기존 표에 더한다

요구 ↔ TC(추가)

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-25 | TC-176~TC-202 | TC-203 |
| R-19(더함 — 펜 모드 예외, requirements §1 용어 주) | TC-191, TC-197, TC-200 | TC-203 |
| R-22(더함 — `pen_key_*` 선택·입력 비보관) | TC-189, TC-190, TC-191, TC-194, TC-197, TC-200 | TC-203 |
| R-07(더함 — 펜 모드 아님 = 기존 키보드 모션) | TC-191, TC-200 | — |
| R-24(더함 — 반복 누름 중 손 그림 불변·부르르 함께) | TC-189, TC-199 | TC-203 |
| R-23(더함 — 손도 젤리를 함께 받음) | TC-199 | TC-203 |
| R-15(더함 — `armTransformFor` 쉬는 위치) | TC-184, TC-185 | — |
| R-21(더함 — `armTransformFor` = 기존 팔 변형) | TC-184, TC-185, TC-198 | — |
| R-09(더함 — 클릭 이미지는 팔만) | TC-198 | — |
| R-01(더함 — 펜 손 img `alt=""`·장식 없음) | TC-192, TC-196 | — |

설계 항목 ↔ TC(CR-025)

| 설계 항목 | TC |
|---|---|
| design.md §2 ASCII `[pen]`·아래 문단(`.jellyWrap` 마지막 자식 = 맨 위) | TC-196 |
| design.md §4 `config.kbFrames` = `isPenMode ? penDownFrameCount : kbDownFrameCount` | TC-188, TC-197, TC-200, TC-202 |
| design.md §6 P-2(CR-025 — 펜 모드 키보드 `kb_up`, 손 그림 `pickPenEntry`, 손 위치·각도 불변) | TC-197, TC-199 |
| design.md §6 P-4(CR-025 — 같은 렌더에서 같은 팔 변형으로 손 이동·기울기, 버튼은 손 그림 불변) | TC-198, TC-201 |
| design.md §6 P-6(CR-025 — `penPos` 변경·펜 슬롯 등록/삭제 → 펜 모드·`kbFrames` 재계산) | TC-202 |
| design.md §7 펜 슬롯 행(미확정 계약 — `slotKey` 문자열로만 찾음) | TC-186, TC-203 |
| design.md §7 `MouseSettings.penPos` 행(기본 `null` = 기본 위치 규칙) | TC-183, TC-202, TC-203 |
| design.md §8 모든 `<img>` `alt=""`(`PenHand` 포함) | TC-192, TC-196 |
| design.md §10.1 pen 행(좌상단 = `resolvePenPos`, 크기 = 선택 그림, 원점 = `pen_up` 중심, translate·rotate) | TC-192, TC-193, TC-194, TC-196 |
| design.md §10.7 펜 모드 정의(`pen_up` 등록 🔒) | TC-187, TC-200 |
| §10.7 키보드 레이어 고정(`kb_up`, 🔒) | TC-191, TC-197, TC-201 |
| §10.7 손 그림 선택(순서·반복 누름 불변·클릭 무반응) | TC-189, TC-190, TC-198, TC-199 |
| §10.7 위치·변형 수학 1~4(P·P′·translate·rotate·스케일 없음·접기·쉬는 자세) | TC-176~TC-180, TC-193 |
| §10.7 기본 위치 규칙(`defaultPenPos`) | TC-182, TC-183, TC-192, TC-202 |
| §10.7 z 순서(`.jellyWrap` 마지막 자식) | TC-196, TC-203 |
| §10.7 젤리·부르르(애니메이션 클래스 없음, 바깥 래퍼와 합성) | TC-199, TC-203 |
| §10.7 표시 조건(`mouse !== null` && `pen_up`, 모니터 없음·팔 그림 없음에도 그림) | TC-195, TC-201 |
| §10.7 transform만·left/top 정적·같은 img src 교체 | TC-194, TC-197 |
| design/components.md §3 `OverlayApp` 행(CR-025 — `PenHand` 위치·props·`kbFrames`) | TC-196, TC-197, TC-198, TC-202 |
| design/components.md §3 `LayerStack` 행(named export `findByKey`·`isPenMode`·`penDownFrameCount`, 펜 모드 kb_up) | TC-186, TC-187, TC-188, TC-191 |
| design/components.md §3 `PenHand` 행(props·`null`·래퍼 없음·named export `pickPenEntry`) | TC-190, TC-192~TC-195 |
| design/components.md 렌더 조건 `LayerStack` 행(펜 모드 kb_up) | TC-191, TC-197 |
| design/components.md 렌더 조건 `PenHand` 행 | TC-196, TC-201 |
| design/components.md 배경 DOM 구조(PenHand 줄·(CR-025) 애니메이션 클래스 없음) | TC-196, TC-199 |
| design/functions.md §5.3 `findByKey` | TC-186 |
| §5.3 `isPenMode` | TC-187, TC-200 |
| §5.3 `penDownFrameCount` | TC-188, TC-197, TC-202 |
| §5.3 `LayerStack` 렌더(CR-025 kb = 펜 모드면 `kb_up`, `pickKeyboardEntry` 자체 불변) | TC-191, TC-200 |
| §5.4 (CR-025) 1~5단계 → `armTransformFor`(결과·동작 변경 없음) | TC-185 |
| §5.5 머리글(붙는 점 = `pen_up` 중심, 다른 크기 그림도 같은 기준) | TC-178, TC-194 |
| §5.5 `armTransformFor` | TC-184, TC-185, TC-193 |
| §5.5 `defaultPenPos` | TC-182 |
| §5.5 `resolvePenPos` | TC-183, TC-192 |
| §5.5 `penTransform` ①~⑦·예 ⓐ~ⓓ | TC-176, TC-177, TC-178, TC-179, TC-180 |
| §5.5 `penTransformCss` | TC-181 |
| §5.5 `pickPenEntry`(🔒 순서·예) | TC-189, TC-190 |
| §5.5 `PenHand` 렌더 ①~⑥·예 | TC-192, TC-193, TC-194, TC-195 |
| §5.5 상수·타입 `PenTransform`·`PEN_REST` | TC-176, TC-180 |
| §5.5 `PenHand` Props(`MouseArm`과 같은 값, `button` 없음) | TC-193, TC-198 |
| §5.5 입력 비보관(R-22 유지) | TC-197 |
| requirements §1 용어 주(R-19 펜 모드 예외) | TC-191, TC-197, TC-203 |
| requirements §3 펜 슬롯·`penPos` 행(미확정 계약) | TC-186, TC-202, TC-203 |

확정사항 §5 전이표 행 ↔ TC(추가): 전이표 행 변동 없음(CR-025는 확정사항 §3 「펜 쥔 손 파츠」 — 상태기계 입력·전이 불변, 펜 모드는 표시 선택만 바꾼다). 행3 「키 입력」의 펜 모드 표시 — 순수 TC-189, 화면 TC-197 더함.

사용자 시나리오 행 ↔ TC-FLOW(추가): **S-9**(requirements v2.2 §2, R-25) → **TC-FLOW-09**.

CR ↔ TC(추가): **CR-025**(요구 확정 🔒 2026-09-24·설계 완료·소스 미적용, 미확정 계약 펜 슬롯·`MouseSettings.penPos`) — 신규 TC-176~TC-203(자동 27 + 수동 1 — MC-20) / 개정 없음 / TC-FLOW-09 / 새 스펙 `penMapping.test.ts`·`penLayers.test.tsx`·`PenHand.test.tsx`·`OverlayApp.pen.test.tsx`.

### v1.0 추가분 (CR-023) — 아래 v0.9·v0.8·기존 표에 더한다

요구 ↔ TC(추가)

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-24 | TC-001(개정), TC-160~TC-174 | TC-151(개정), TC-175 |
| R-23(더함) | TC-165~TC-167, TC-169, TC-170, TC-172, TC-173 | TC-175 |
| R-22(더함) | TC-161, TC-162, TC-166, TC-168, TC-170 | TC-175 |
| R-07(더함) | TC-161, TC-162, TC-169, TC-171 | — |
| R-16(더함) | TC-165, TC-172 | TC-175 |
| R-17(더함) | TC-172 | TC-175 |
| R-21(더함) | TC-172 | TC-175 |
| R-05(더함) | TC-161 | — |

설계 항목 ↔ TC(CR-023). 아래 v0.9 표의 `design/functions.md §5.1 jellyClass(null/0/1)` 행에 `'shiver'`를, `design.md §6 P-2(jellyClass(bouncePhase(machine)))` 행을 `jellyClass(wrapMotion(machine))`로 읽는다(부르르가 아닐 때 `wrapMotion` = `bouncePhase`라 기존 TC 기대 불변).

| 설계 항목 | TC |
|---|---|
| design.md §4 `machine` 초기값 `repeating false`·`lastRepeatAt 0`·`shiverSeq -1` | TC-001(개정), TC-160 |
| design.md §4 상수 `REPEAT_TIMEOUT_MS = 500`(설정값 아님) | TC-160, TC-164, TC-173 |
| design/functions.md §5.1 키보드 핸들러 `repeat: p.repeat === true`(필드 없음·`true` 아닌 값 → `false`) | TC-169, TC-170, TC-171 |
| design/functions.md §5.1 `jellyClass(motion: WrapMotion)` `'shiver'` → `jellyWrap shiver`·많아야 하나·JSX `jellyClass(wrapMotion(machine))`·같은 요소 | TC-169, TC-170, TC-172, TC-173 |
| design/functions.md §5.2 `MachineInput` key `repeat?`(없으면 `false`) | TC-162, TC-171 (호환: TC-133, TC-147, TC-155) |
| §5.2 자동 반복 행 — 반복 누름 정의·`kbFrame`/`specialHeld`(② 미적용·④ 적용)/`bounceSeq` 불변·`repeating = max(0, heldCount) > 0`·`lastRepeatAt = ts`·`shiverSeq = bounceSeq`·공통 규칙 | TC-161, TC-166, TC-169, TC-170 |
| §5.2 자동 반복 행 — 반복 아닌 모든 `key` → `repeating false`(`pressed false` + `repeat true` 포함, `lastRepeatAt`·`shiverSeq` 불변) | TC-162, TC-166, TC-170 |
| §5.2 `mouseMove`·`mouseButton`은 `repeating` 불변, `lastRepeatAt` ≠ `lastInputAt` | TC-163, TC-173 |
| §5.2 `tick` 반복 끊김 방어(500ms 경계·같은 참조) | TC-164, TC-173 |
| §5.2 바운스 재생 카운터 「반복 누름은 판정하지 않음」 | TC-161, TC-166 |
| §5.2 `isRepeating` | TC-160, TC-161, TC-162, TC-164 |
| §5.2 `wrapMotion` ①~④·`WrapMotion`·설계 예 5개 | TC-165, TC-166, TC-167 |
| §5.2 기록 금지(CR-023 필드에 키 정보 없음) | TC-168 |
| design.md §6 P-2(CR-023 — `repeat` dispatch·`.shiver`·반복은 프레임·그림·`bounceSeq` 불변) | TC-169, TC-170, TC-171 |
| design.md §6 P-3(CR-023 — 끊김 방어·같은 번호 젤리 재생 없음) | TC-164, TC-167, TC-173 |
| design.md §2 ASCII `.jellyWrap (jelly\|shiver)`·§10.1(z0~z3가 부르르를 함께 받음, 배경 제외) | TC-172 |
| design.md §10.3 부르르 행 keyframe·80ms·`ease-in-out`·`infinite`·fill 없음, CSS 블록 `.shiver` | TC-174 |
| §10.3 부르르 우선순위·동시 부착 금지 | TC-165, TC-172 |
| §10.3 부르르 규칙 1(흐름·특수 키 그림 유지) | TC-169, TC-170 |
| §10.3 부르르 규칙 2(젤리 재시작 없음·`shiverSeq`) | TC-161, TC-167, TC-173 |
| §10.3 부르르 규칙 3(반복 중 특수 키 새 누름 → 젤리 → 그 키 반복 → 부르르) | TC-166, TC-170, TC-172 |
| §10.3 부르르 규칙 4(하나 떼면 정지·남은 키 반복 재시작) | TC-166, TC-170, TC-173 |
| §10.3 부르르 규칙 5(반복마다 클래스 문자열 같음 → DOM class 변경 없음) | TC-169, TC-170 |
| §10.3 떨림 폭(젤리 절반 이하)·마우스 팔과의 합성·체감 | TC-172, TC-175 |
| design.md §10.6 9행(CR-023 — `repeat: true`는 목록 불변·그림 유지 + 부르르·젤리 없음) | TC-161, TC-170 |
| design.md §10.6 `kbFrame` 문단(자동 반복 누름은 프레임을 넘기지 않음) | TC-161, TC-169, TC-171 |
| design/components.md 렌더 조건 `.jellyWrap` 행(클래스 = `jellyClass(wrapMotion(machine))`, 요소 불변) | TC-169, TC-173 |
| design/components.md §3 배경 DOM 구조 5(`.shiver` 이중 적용 금지·`.canvas`/`.root` 제외)·6(많아야 하나) | TC-172 |
| requirements §3 `KeyboardInputEvent.repeat` 행(미확정 계약) | TC-171, TC-175 |

확정사항 §5 전이표 행 ↔ TC(추가): 전이표 행 변동 없음(CR-023은 확정사항 §4 키보드 파츠 행). 행3 「키 입력」의 자동 반복 분기 — 상태기계 TC-161·TC-162, 화면 TC-169 더함.

사용자 시나리오 행 ↔ TC-FLOW(추가): **S-8**(requirements v2.1 §2, R-22·R-23·R-24) → **TC-FLOW-08**.

CR ↔ TC(추가): **CR-023**(요구 확정 🔒 2026-09-24·설계 완료·소스 미적용, 미확정 계약 `KeyboardInputEvent.repeat`) — 신규 TC-160~TC-175(자동 15 + 수동 1 — MC-19) / 개정 TC-001, TC-151(MC-17 ⑥), TC-159(MC-18 ③ 비고) / TC-FLOW-08 / CSS mock `shiver`(`OverlayApp.shiver.test`).

### v0.9 추가분 (CR-022) — 아래 v0.8·기존 표에 더한다(폐기 TC-045·TC-142는 아래 표들의 해당 칸에서 뺀다)

요구 ↔ TC(추가)

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-23 | TC-031, TC-044, TC-054, TC-064, TC-067, TC-080, TC-100, TC-141, TC-143~TC-148, TC-150, TC-152~TC-158 | TC-090, TC-159 |
| R-07(더함) | TC-154 | TC-159 |
| R-16(더함 — TC-045·TC-142 폐기로 빼고, TC-105는 R-16에서 뺀다) | TC-152, TC-154~TC-156 | TC-159 |
| R-17(더함) | TC-152, TC-153, TC-157, TC-158 | TC-159 |
| R-19(더함) | TC-152, TC-153 | — |
| R-21(더함) | TC-156 | — |
| R-22(더함 — TC-142 폐기로 뺌) | TC-155 | — |

설계 항목 ↔ TC(CR-022). 아래 기존 「설계 항목 ↔ TC」 표의 `§5.4 바운스 래퍼 1~6` 행은 이 표의 `.armWrap` 컨테이너 행이, `§10.3 바운스·마우스 팔 바운스…` 행과 v0.8 `§10.3 bounceAlt keyframe…`·`§5.4 바운스 래퍼 5·6` 행은 이 표의 §10.3 행들이 대체한다. `§3 MouseArm props(anchor·atRest·bounce)` 행은 `bounce`를 뺀다.

| 설계 항목 | TC |
|---|---|
| design.md §1 출력·§2 ASCII `.jellyWrap`·「`.canvas` 둘째 자식, `[z0]`~`[z3]` 감쌈, 캔버스와 같은 크기·원점」 | TC-152, TC-064, TC-066, TC-101, TC-111 |
| design/components.md 렌더 조건 `.jellyWrap` 행(항상·`key` 없음·조건부 금지)·`MouseArm`(`.jellyWrap` 첫 자식)·`LayerStack`(`.jellyWrap` 안) | TC-152, TC-153, TC-154, TC-155 |
| design/components.md 배경 DOM 구조 1~3(배경 = `.jellyWrap` 형제, 조상에 애니메이션 없음) | TC-157, TC-067, TC-066 |
| design/components.md 배경 DOM 구조 5(이중 적용 금지·`.jellyWrap` 한 개) | TC-156, TC-141, TC-044 |
| design/components.md `OverlayApp`(젤리 래퍼 렌더·`MouseArm`·`LayerStack`에 바운스 값 안 넘김) | TC-152, TC-154, TC-156 |
| design/components.md `Layer` `bounce` prop 삭제·`LayerStack` 바운스 값 없음 | TC-031, TC-110, TC-141, TC-156 |
| design/components.md `MouseArm` `bounce` prop 삭제 | TC-043, TC-044, TC-046, TC-105, TC-156 (TC-045·TC-142 폐기) |
| design/functions.md §5.1 `jellyClass`(`null`/`0`/`1`, export 없음 → 렌더 결과로 검증) | TC-152, TC-154, TC-155, TC-054, TC-144~TC-148, TC-150 |
| design/functions.md §5.3 `LayerStack` 렌더(바운스 없음, 클래스 항상 `layer`) | TC-031, TC-110, TC-141 |
| design/functions.md §5.4 `.armWrap` 컨테이너 2~6(클래스 항상 `armWrap`·변환 합성·같은 요소) | TC-044, TC-046, TC-081, TC-105, TC-156 |
| design.md §6 P-2(`.jellyWrap` 클래스 = `jellyClass(bouncePhase(machine))`, 바운스 값 전달 없음) | TC-054, TC-100, TC-154, TC-155 |
| design.md §10.1(배경 뺀 레이어가 래퍼 안, 배경은 밖) | TC-064, TC-152, TC-157 |
| design.md §10.3 젤리 keyframe `jelly`/`jellyAlt` 6구간·값·350ms `ease-in-out`·1회·fill-mode 없음 | TC-080, TC-143 |
| design.md §10.3 CSS 블록 `.jellyWrap`(origin `50% 100%`·같은 상자·pointer-events none) | TC-158 |
| design.md §10.3 폐기 행(`.bounce`·`.bounceAlt`·keyframe `bounce`·`bounceAlt` 삭제, 개별 요소 바운스 금지) | TC-080, TC-156 |
| design.md §10.3 재생 조건(새로 붙거나 짝 교대·일반 키 추가 누름 재생 없음·특수 키 새 누름 재생·자동 반복 재생 없음·같은 요소·`key`/reflow 금지) | TC-100, TC-154, TC-155, TC-147 |
| design.md §10.3 상태 레이어 자체 애니메이션 없음 | TC-054, TC-067, TC-141 |
| design.md §10.3 마우스 팔과의 합성(안쪽 img transform 유지) | TC-156, TC-044 |
| design.md §10.3 값의 뜻(세기 보통 🔒)·체감 | TC-159 |
| design.md §11 D-3(움직임은 `rotate`·젤리 `scale` — transform만) | TC-080, TC-112, TC-158 |

확정사항 §5 전이표 행 ↔ TC(추가): 행3 키 입력(누름 바운스 = 젤리) — 화면 TC에 TC-154 더함.

사용자 시나리오 행 ↔ TC-FLOW(추가): S-1(R-23 추가 — requirements v2.0 §2) → TC-FLOW-01(TC-152·TC-159 Step 추가), S-7(R-23 추가) → TC-FLOW-07(관찰 대상 `.jellyWrap`).

CR ↔ TC(추가): **CR-022**(요구 확정 🔒 2026-09-24·설계 완료·소스 미적용, 새 계약 없음) — 신규 TC-152~TC-159(자동 7 + 수동 1 — MC-18) / 개정 TC-031, TC-043, TC-044, TC-046, TC-054, TC-064, TC-066, TC-067, TC-080, TC-090(MC-08), TC-100, TC-101, TC-105, TC-110, TC-111, TC-141, TC-143~TC-150 / 폐기 TC-045, TC-142 / TC-FLOW-01·06·07 / CSS mock 클래스 목록.

### v0.8 추가분 (CR-021) — 아래 기존 표에 더한다

요구 ↔ TC(추가)

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-22 | TC-127~TC-150 | TC-151 |
| R-07(더함) | TC-128, TC-129, TC-131, TC-132, TC-140, TC-141, TC-143, TC-145, TC-146 | TC-151 |
| R-16(더함) | TC-128, TC-132, TC-142~TC-145, TC-147 | TC-151 |
| R-05(더함) | TC-137, TC-150 | — |
| R-15(더함) | TC-150 | — |

설계 항목 ↔ TC(CR-021)

| 설계 항목 | TC |
|---|---|
| §4 `machine.specialHeld`·`bounceSeq` 초기값 | TC-001(개정), TC-128 |
| §5.1 키보드 핸들러(`special` 분류값만·보관/출력/전송 없음·필드 없음 = `null`) | TC-144, TC-148, TC-149 |
| §5.2 `SpecialKey`·`SPECIAL_KEYS`·`isSpecialKey` | TC-127, TC-148 |
| §5.2 `reduce` 특수 키 추적 ①~④(새 배열·맨 뒤 추가·뗌 제거·`heldCount 0` 비움) | TC-129~TC-137 |
| §5.2 바운스 재생 카운터 ⓐⓑ(갱신 전 기준·동시 참 +1 한 번·뗌/마우스/tick 불변) | TC-129, TC-130, TC-132, TC-133, TC-135~TC-137 |
| §5.2 `bouncePhase`·`BouncePhase` | TC-128, TC-141, TC-142 |
| §5.2 `currentSpecial` | TC-128~TC-131, TC-133, TC-136 |
| §5.2 기록 금지 | TC-138, TC-149, TC-151 |
| §5.3 `SPECIAL_KEY_SLOT` | TC-139 |
| §5.3 `pickKeyboardEntry` ①~③·예 | TC-140, TC-145, TC-146 |
| §5.3 `LayerStack` 렌더(`kb = pickKeyboardEntry`·`bounce = bouncePhase`·같은 img·상태 Layer 바운스 없음) | TC-141, TC-144, TC-145 |
| §5.4 바운스 래퍼 5·6(`bounce: BouncePhase`·같은 래퍼·값 그대로면 재생 없음) | TC-142, TC-147, TC-043~TC-046·TC-105(개정) |
| design/components.md `LayerStack`·`Layer`·`OverlayApp`(R-22) | TC-141, TC-144 |
| §6 P-2(`special` dispatch·특수 키 그림·바운스) | TC-144~TC-148 |
| §7 `input://keyboard` `special`(미확정 계약) | TC-144, TC-148 |
| §7 `AssetSlot` `key_*` 7종(미확정 계약, 선택 슬롯) | TC-139, TC-140, TC-146 |
| §10.1 z3 행(특수 키 그림도 같은 요소·같은 좌표) | TC-140, TC-141 |
| §10.3 `bounceAlt` keyframe·클래스 교대·재생 조건 | TC-143, TC-141, TC-142, TC-145, TC-147 |
| §10.6 분류(7종, ui는 판정 안 함) | TC-127, TC-148, TC-151 |
| §10.6 `kbFrame` 순환·유휴 `wake`·팔 바운스 | TC-133, TC-145, TC-137, TC-150, TC-144 |
| §10.6 입력 내용 비보관 | TC-138, TC-149, TC-151 |
| §10.6 계약 선행(뗌 `special` = 누를 때 분류값, Shift 먼저 떼기) | TC-151 |

design.md §10.6 규칙표 행 ↔ TC

| 행 | 상태기계 TC | 화면 TC |
|---|---|---|
| 1 아무 키도 안 눌림 | TC-129 | TC-144 |
| 2 스페이스 누름 | TC-129 | TC-144, TC-145 |
| 3 스페이스 누른 채 a | TC-129 | TC-145 |
| 4 이어서 Enter | TC-130 | TC-145 |
| 5 Enter 뗌 → 이전 특수 키 | TC-130 | TC-145 |
| 6 스페이스 뗌(a 눌림) | TC-131 | TC-145 |
| 7 a 뗌 | TC-131 | TC-145 |
| 8 Z(그림 없음) | TC-132 | TC-146 |
| 9 자동 반복 | TC-133 | TC-147 |
| 10 `heldCount 0` 비움 | TC-134 | TC-148(마지막 뗌) |
| 11 a 누른 채 스페이스 | TC-135 | — (상태기계로 충분 — 화면 결과는 2행과 같은 경로) |
| 12 Ctrl+Z | TC-136 | TC-146 |
| 13 Ctrl+C | TC-136 | TC-146 |

사용자 시나리오 행 ↔ TC-FLOW(추가): S-7 → TC-FLOW-07

CR ↔ TC(추가): **CR-021**(요구 확정 🔒 2026-09-24·설계 완료·소스 미적용, `KeyboardInputEvent.special`·`AssetSlot` `key_*`는 bridge 인계) — 신규 TC-127~TC-151, TC-FLOW-07 / 개정 TC-001, TC-054, TC-067, TC-100, TC-111, TC-043~TC-046, TC-105, 기존 키보드 픽스처 `special: null`(TC-002~TC-006, TC-012~TC-014, TC-102 및 `OverlayApp*`·`handPart` 스펙) / TC-FLOW-01·06 종료 상태 문구

### 요구 ↔ TC

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-01 | TC-048, TC-068, TC-078 | TC-083, TC-097 |
| R-02 | 폐기(CR-015로 대체 → R-19) — TC 없음 | — |
| R-03 | TC-047, TC-069, TC-070, TC-072, TC-078, TC-079, TC-101 | TC-087, TC-089 |
| R-04 | TC-071~TC-075, TC-077 | TC-086, TC-088 |
| R-05 | TC-001~TC-004, TC-012, TC-057, TC-058, TC-102 | TC-092 |
| R-06 | 폐기(CR-019, 대체 요구 없음 — 쾅 메커니즘 삭제) — TC 없음(TC-007~TC-011·TC-029·TC-055 폐기, TC-058은 R-05만) | — (TC-091 폐기) |
| R-07 | TC-005, TC-006, TC-027, TC-031, TC-054, TC-056, TC-080, TC-100, TC-110, TC-111 | TC-090 |
| R-08 | 폐기(CR-015로 대체 → R-18) — TC 없음(TC-021·TC-022·TC-036·TC-041 폐기) | — |
| R-09 | TC-013, TC-039, TC-043, TC-062, TC-063, TC-107 | TC-094 |
| R-10 | 폐기(CR-008로 대체 → R-14) — TC 없음 | — |
| R-11 | TC-040, TC-059, TC-061, TC-105(TC-023·TC-042는 CR-015로 폐기) | TC-092 |
| R-12 | TC-065, TC-077~TC-079 | TC-084 |
| R-13 | TC-075, TC-076 | TC-085, TC-086 |
| R-14 | 폐기(CR-017로 대체 → R-20·R-21) — TC 없음(TC-018·TC-019 폐기, 나머지 옛 R-14 TC는 R-21로 재매핑) | — |
| R-15 | TC-040, TC-059~TC-061, TC-105, TC-117, TC-118 | TC-092, TC-093 |
| R-16 | TC-044~TC-046, TC-054, TC-080, TC-081, TC-100, TC-105 (TC-055는 CR-019로 폐기) | TC-090 |
| R-17 | TC-033~TC-035, TC-064, TC-066, TC-067, TC-082 | TC-096 |
| R-18 | TC-012, TC-025, TC-037, TC-046, TC-048, TC-060, TC-063, TC-064, TC-066, TC-098, TC-099, TC-103~TC-109, TC-111, TC-112 (TC-020은 CR-017로 폐기) | TC-094 |
| R-19 | TC-014, TC-026, TC-028, TC-030~TC-032, TC-047, TC-048, TC-053, TC-064~TC-066, TC-082, TC-101, TC-110, TC-111 | — (몸통 유무·`kb_up` 디폴트는 렌더 조건뿐이라 자동 TC로 충분) |
| R-20 | TC-025, TC-037, TC-047, TC-048, TC-060, TC-063, TC-113~TC-115, TC-119~TC-124 | TC-126 |
| R-21 | TC-015~TC-017, TC-024, TC-025, TC-037~TC-040, TC-049~TC-053, TC-061, TC-104, TC-109, TC-115~TC-123, TC-125 | TC-094, TC-095, TC-126 |

### 설계 항목 ↔ TC — v0.6 추가·대체분 (CR-017)

아래 「설계 항목 ↔ TC」 표의 `§4 bounds 초기값`·`§5.4 armRotationDeg`·`§5.4 resolvePivot·mapAroundPivot`·`§7 get_screen_bounds` 행은 이 표가 대체한다(TC-018~TC-020은 폐기). 같은 표의 `§6 P-1`·`§6 P-4`·`§10.4` 행에는 이 표의 TC가 더해진다.

| 설계 항목(CR-017) | TC |
|---|---|
| §4 `monitors`(초기값 `[]`, 시작 1회 교체) | TC-047, TC-048③, TC-063, TC-122 |
| §4 상수 `STRETCH_MIN`/`STRETCH_MAX` | TC-116, TC-117 |
| §5.1 모니터 목록 로드(`getMonitors` 1회·실패 → `[]`·재조회 없음) | TC-047, TC-048, TC-063, TC-122 |
| §5.4 `resolvePivot(anchor, hand, area)`(영역 중심 폴백) | TC-015~TC-017, TC-038, TC-104 |
| §5.4 `pickMonitor` | TC-113, TC-119, TC-121, TC-122 |
| §5.4 `cursorUv` | TC-114, TC-119 |
| §5.4 `bilerpQuad`·`Quad` | TC-115, TC-017, TC-123, TC-124 |
| §5.4 `armTransform`·`ArmTransform`·`ARM_EPS`·`REST_TRANSFORM` | TC-116, TC-117, TC-125 |
| §5.4 `armTransformCss` | TC-118, TC-037, TC-040 |
| §5.4 `MouseArm` 렌더 1~6단계(REST·pivot·모니터·목표점·변형·문자열) | TC-037~TC-040, TC-103~TC-107, TC-119, TC-121, TC-125 |
| §5.4 삭제 목록(`armRotationDeg`·`mapAroundPivot`·`pad`·prop `bounds`·`getScreenBounds` 호출) | TC-120, TC-025(`pad` 없음), TC-047·TC-048·TC-122(`getScreenBounds` 0회) |
| design/components.md `MouseArm` prop `monitors`·렌더 조건 `settings.mouse && monitors.length > 0` | TC-119, TC-048③, TC-063 |
| §6 P-1 오류(모니터 목록 실패 → 마우스 파츠 없음)·P-4(모니터 → 비율 → 보간 → 변형)·P-6(`mouse.area` 변경) | TC-048, TC-122, TC-124 |
| §7 `get_monitors`·`MouseSettings.area` 타입 행(미확정 계약) | TC-025, TC-047, TC-122, TC-124 |
| §10.4 모니터·비율·목표점·팔 변형·쉬는 위치 `REST`·기본 `area` | TC-113~TC-119, TC-123, TC-125, TC-126 |

CR ↔ TC 추가: **CR-017**(요구 확정·미적용, 계약 대기) — 개정 TC-015~TC-017, TC-025, TC-037~TC-040, TC-044, TC-046~TC-052, TC-054, TC-055(본문 개정) · TC-059~TC-063, TC-067, TC-094, TC-095, TC-098, TC-099, TC-101, TC-103~TC-107, TC-109(TC-055 아래 「v0.6 일괄 개정」 주석 + 스펙) / 신규 TC-113~TC-126 / 폐기 TC-018~TC-020 / 요구 재매핑 R-14 → R-21·R-20(TC-024, TC-053).

v0.6 변경 요약(2026-09-24, 근거: CR-017 사용자 🔒 · requirements.md v1.6 · design.md·design/functions.md §5.1·§5.4·design/components.md CR-017 갱신 · 관리자 정정 기본 area (375,525)(495,525)(495,625)(375,625)): 픽스처 `pad` → `area`, `getScreenBounds` mock → `getMonitors` mock(옛 이름은 감시용), §0.2 변형 참조표, §0.3 CR-017 red 행, 폐기 3·신규 14(자동 13·수동 1)·개정 위 목록. 자동 91 → 101, 수동 15 → 16, 폐기 6 → 9.

### 확정사항 §5 전이표 행 ↔ TC

| 행 | 상태기계 TC | 화면 TC |
|---|---|---|
| 1 아무 입력 없음(대기·들림·쉬는 위치) | TC-001 | TC-028, TC-059 |
| 2 5분 무입력(쉬는중·들림·쉬는 위치) | TC-002, TC-003 | TC-057, TC-061 |
| 3 키 입력(대기·누름 바운스→들림·마우스 유지, 동시 키 수와 무관 — CR-019) | TC-005, TC-006, TC-102② | TC-054, TC-067 |
| ~~4 동시 6키~~ — **폐기(CR-019, 확정사항 §5 🔒 2026-09-24 쾅 메커니즘 삭제)**. 여러 키를 눌러도 행3과 같다 | — (TC-007~TC-011 폐기) | — (TC-055 폐기) |
| 5 마우스 이동(대기·들림·커서 추종) | TC-012 | TC-060 |
| 6 마우스 클릭(대기·들림·클릭 이미지) | TC-013 | TC-062 |
| 7 둘 다(레이어 독립) | TC-014 | TC-054, TC-067 |

### 설계 항목 ↔ TC

| 설계 항목 | TC |
|---|---|
| §1 창 라벨 분기(`src/main.tsx`) | TC-097(수동 — 화면 폴더 밖 공용 진입점, 이번 범위 수정 대상 아님. 자동화 후보는 TC-097 비고) |
| 헤더 모드 범위(마우스 파츠 모드 하나, CR-015 — 손바닥 모드·팔 곡선·모드 판별 삭제) | TC-108, TC-064, TC-106 |
| §2 DOM 순서 = z 순서, `[bg]` 첫 자식, `[z0]` 마우스 파츠 한 자리(`[z4]` 삭제) | TC-064, TC-066, TC-067, TC-111 |
| §2 `[z1]` 몸통 선택(없으면 투명·정상)·디폴트 상태 그림 = `kb_up` | TC-030, TC-110, TC-111 |
| §2 `.canvas`는 canvas 있을 때만 | TC-065, TC-048, TC-101 |
| §2 `.root` 100vw×100vh·overflow hidden(CR-012) | TC-078, TC-087, TC-089 |
| §2 `.canvas` pointer-events none·`.root` 조작 영역 | TC-079, TC-077, TC-084 |
| §3 `OverlayApp`(로드·구독·기준점 효과·tick·onWheel·쉬는 위치·bounce 전달·배경 배치·`MouseArm` 1개) | TC-047, TC-049, TC-054, TC-057, TC-059, TC-064, TC-071, TC-109, TC-111 |
| §3 `BackgroundLayer`(memo·manifest 하나·없으면 null) | TC-033~TC-035 |
| §3 `LayerStack`·`Layer`(`entry` 없으면 null = 몸통 없음 투명) | TC-028~TC-032, TC-110 |
| §3 `MouseArm` props(anchor·atRest·bounce) | TC-037~TC-040, TC-043~TC-046, TC-103~TC-107 (TC-036·TC-041·TC-042는 CR-015로 폐기) |
| §3 `MouseArm` `mouse` prop(어깨·`partPos` = 설정값, 기본값과 다른 값 — CR-015로 팔 굵기·색 삭제) | TC-098, TC-099, TC-109 |
| §3 `useBridgeEvent`(ref 보관·재구독 없음·해제) | TC-047, TC-053 |
| §3 렌더 조건 표(`.canvas`·`BackgroundLayer`·`MouseArm` z0 유일·`LayerStack`, z4 행 삭제) | TC-063~TC-065, TC-111 |
| §3 배경 DOM 구조 1~4 | TC-033, TC-064, TC-067 |
| §3·§5.4 `useAlphaCentroid`·`alphaCentroid` 삭제 | TC-024 |
| §4 `settings` 초기값 | TC-048 |
| §4 `manifest` 초기값 `EMPTY_MANIFEST` | TC-048, TC-065 |
| §4 `bounds` 초기값 null | TC-048, TC-063 |
| §4 `machine` 초기값 | TC-001, TC-047 |
| §4 `config`·`configRef` 파생 | TC-056, TC-058 |
| §4 `anchor` | TC-049~TC-052 |
| §4 `armAtRest` | TC-059~TC-061 |
| §4 상수 `TICK_MS` | TC-057, TC-058 |
| §4 상수 Ctrl+휠 0.05 | TC-071, TC-072 |
| §4 상수 `BASE_BOX` | TC-070 |
| §4 상수 `SCALE_MIN`/`SCALE_MAX` | TC-072 |
| §5.1 `clampScale` | TC-072 |
| §5.1 `reducer` | TC-054, TC-056~TC-058 |
| §5.1 `onWheel` ①~⑤·예외 | TC-071~TC-075, TC-088(② `preventDefault`는 관찰만 — design/functions.md §5.1 ②: 효력 보장 안 됨, 페이지 확대 방지는 Tauri 기본 `zoomHotkeysEnabled = false`) |
| §5.1 표시 배율 계산(식 변경 금지) | TC-047, TC-069, TC-070 |
| §5.1 tick 효과(100ms 발화·언마운트 시 `clearInterval`) | TC-057, TC-058(발화), TC-053(언마운트 뒤 남은 타이머 0) |
| §5.1 마우스 이동 핸들러 | TC-060, TC-061 |
| §5.1 쉬는중 진입 효과 | TC-061 |
| §5.1 기준점 효과 ①~⑤·구독 실패·조회 실패 | TC-049~TC-053. 단 구독 실패 경로의 `!cancelled` 가드(언마운트 뒤 `setAnchor` 금지)는 React 18에서 관찰할 수 없어 자동 TC 커버가 아니다 → **코드 리뷰 RV-01**(`manual-checklist.md` 「코드 리뷰 항목」, 판정 verify-code-reviewer) |
| §5.2 `createInitialState`(`slamUntil` 없음 — CR-019) | TC-001 |
| §5.2 `reduce` key(상태 레이어는 동시 키 수와 무관하게 `idle` — CR-019) | TC-005, TC-006, TC-102② |
| §5.2 `reduce` mouseMove·mouseButton | TC-012~TC-014 |
| §5.2 `reduce` tick(CR-019: `slamUntil` 만료·쾅 중 유휴 판정 제외 규칙 삭제) | TC-002, TC-003, TC-102(as-built: 몇 키를 누른 채든 유휴 → `rest`, 눌림 값 불변) |
| §5.3 `findEntry`·`kbDownFrameCount` | TC-026, TC-027 |
| §5.3 `BackgroundLayer` 렌더 | TC-033~TC-035 |
| §5.3 `LayerStack` 렌더(body 선택·디폴트 `kb_up`, R-19) | TC-028~TC-031, TC-110, TC-111 |
| §5.4 이미지 선택(선택 결과 = 매니페스트 항목 `url`·`width`·`height`) | TC-039, TC-043, TC-062, TC-107 |
| §5.4 `armRotationDeg` | TC-020 |
| §5.4 `resolvePivot`·`mapAroundPivot` | TC-015~TC-019, TC-038, TC-104 |
| §5.4 `MouseArm` 렌더(한 모드) 1~5단계(쉬는 위치 0°·기준점 그대로·`left/top = partPos`·자연 크기·`transformOrigin = 어깨 − partPos`·class `hand`) | TC-037, TC-038, TC-040, TC-098, TC-103~TC-107 |
| §5.4 `MouseArm` 렌더 — 캔버스 크기 미사용(방어 식 삭제) | TC-103(크기 = 매니페스트 항목), TC-108(svg 없음) |
| §5.4 삭제 목록(CR-015: `isMouseLayerMode`·손바닥 렌더 분기·`mapToPad`·`armControlPoint`·`armPath`·`restPosition`·`armWidth`·`armColor`·z4 `MouseArm`) | TC-108, TC-064(z4 없음), TC-025(팔 필드 없음). TC-021~TC-023·TC-036·TC-041·TC-042는 폐기 |
| §5.4 바운스 래퍼 1~6 | TC-043~TC-046, TC-081, TC-100, TC-105 |
| §6 P-1 정상·오류(시작 시 손 그림 `partPos`에 0°) | TC-047~TC-049, TC-052, TC-109 |
| §6 P-2(CR-019: 쾅 경로 삭제) | TC-054, TC-067, TC-100, TC-111 |
| §6 P-3 | TC-057, TC-061 |
| §6 P-4 | TC-060, TC-062, TC-063 |
| §6 P-5 정상·오류 | TC-071~TC-075, TC-086, TC-088, TC-089 |
| §6 P-6(`partPos` 변경·손 그림 자연 크기 재계산 포함) | TC-051, TC-056, TC-058, TC-066, TC-069, TC-099, TC-101, TC-109 |
| §6 P-7 | TC-075~TC-077, TC-084, TC-085 |
| §7 `get_settings`·`get_asset_manifest`·`get_screen_bounds` | TC-047, TC-048, TC-063 |
| §7 `set_settings` | TC-071~TC-075 |
| §7 `input://keyboard`·`input://mouse-move`·`input://mouse-button` | TC-054, TC-060, TC-062 |
| §7 `settings://changed`·`assets://changed` | TC-058, TC-066, TC-069, TC-076, TC-099, TC-109 |
| §7 `get_hand_anchor`·`assets://hand-anchor-changed` | TC-049~TC-053 |
| §7 타입 행 `MouseSettings.partPos` 추가(기본 389,492)·`armWidth`·`armColor` 삭제(CR-015 미확정 계약) | TC-025, TC-098, TC-109 |
| §7 계약 의미 행 `anchor` = 그림 좌표 + `partPos`(ui는 더하지 않음, CR-015 미확정 계약) | TC-104, TC-109 |
| §7 창 기능(`data-tauri-drag-region`)·위치 저장 | TC-065, TC-077, TC-076, TC-085 |
| §8 문구 없음·`alt=""`·R-01 해석 | TC-068, TC-033, TC-103 |
| §9 접근성(`design/a11y.md`) | TC-068, TC-078 |
| §10.1 z-order(bg · z0 마우스 파츠 한 모드 · z1 몸통 선택 · z2 상태(대기·쉬는중 — CR-019) · z3 키보드 `kb_up` 디폴트, z4 삭제) | TC-064, TC-067, TC-106, TC-110, TC-111 |
| §10.2 상태 전이(행4 동시 6키 폐기 — CR-019) | TC-001~TC-006, TC-012~TC-014, TC-102 |
| §10.3 바운스·마우스 팔 바운스(모드 하나)·상태 레이어 애니메이션 없음(상태 `Layer`에 `bounce` 없음 — CR-019 쾅 삭제)·배경 애니메이션 없음 | TC-080, TC-028, TC-054, TC-067, TC-105 |
| §10.3 「누름 유지 중 추가 누름은 재생 안 됨」 | TC-100 |
| §10.3 손 그림 `left/top` = `partPos` 정적 배치(설정 변경 때만 바뀜, 움직임은 transform만) | TC-109, TC-112 |
| §10.4 좌표 매핑·손 그림 배치(`partPos`·자연 크기·원점 = 어깨 − `partPos`, 음수 허용)·쉬는 위치 0°·기본 `hand = null`·기본 `partPos` 389,492·팔 그리지 않음 | TC-018, TC-019, TC-025, TC-098, TC-099, TC-103~TC-106, TC-108, TC-109 |
| §10.5 배율(식·좌상단·배경 같은 scale) | TC-070, TC-079, TC-067, TC-087 |
| §11 D-1 / D-2 / D-3(CR-015로 해소·종료) / D-4 | TC-032 / TC-060 / TC-103·TC-112(`left/top`은 정적 배치, 움직임은 `rotate`·`bounce`) / TC-077 |
| §12 공용화 후보 | 해당 없음 — 동작이 없는 승격 후보 목록(TC 대상 아님) |
| §13 RTM | 이 문서 「요구 ↔ TC」 표가 TC 열의 근거 |

### CR ↔ TC

| CR | 상태(대장) | TC |
|---|---|---|
| CR-001 | 적용·미검증(쾅 판정은 CR-019로 폐기) | — (TC-007~TC-010·TC-055는 CR-019로 폐기) |
| CR-002 | 적용·미검증(손바닥 모드 부분은 CR-015가 대체) | TC-037, TC-064 (TC-036은 CR-015로 폐기) |
| CR-007 | 미적용 | TC-016~TC-019, TC-025, TC-038, TC-039 |
| CR-008 | 미적용 | TC-015, TC-024, TC-037, TC-049~TC-053, TC-095 |
| CR-009 | 미적용 | TC-040, TC-059~TC-061, TC-092, TC-093 (TC-042는 CR-015로 폐기 — 손바닥 `restPosition` 경로 삭제) |
| CR-010 | core 구현 대기 | TC-076, TC-085 |
| CR-011 | 미적용 | TC-044~TC-046, TC-054, TC-081, TC-090, TC-100 (TC-055는 CR-019로 폐기) |
| CR-012 | 미적용 | TC-070, TC-077~TC-079, TC-084, TC-087~TC-089 |
| CR-013 | core·bridge 미적용 | TC-075, TC-086 |
| CR-014 | 미적용 | TC-033~TC-035, TC-064, TC-066, TC-067, TC-082, TC-096 |
| CR-015 | 요구 확정·설계 완료·미적용(계약 대기) | 개정 TC-025, TC-037, TC-044, TC-046, TC-048, TC-064, TC-066, TC-098, TC-099 / 신규 TC-103~TC-112 / 폐기 TC-021~TC-023, TC-036, TC-041, TC-042 / 요구 재매핑(R-02 → R-19, R-08 → R-18) TC-012, TC-014, TC-020, TC-026, TC-028~TC-030, TC-032, TC-047, TC-053, TC-055, TC-060, TC-063, TC-065, TC-082, TC-094, TC-101 / TC-FLOW-06 개정 |
| CR-019 | 요구 확정(🔒 2026-09-24)·설계 완료·소스 미적용(작성 시 `src/state/inputMachine.ts`에 `slam` 남음, `Settings.slam`·`AssetSlot` `'slam'` 삭제는 bridge 인계) | 폐기 TC-007~TC-011, TC-029, TC-055, TC-091(MC-09), TC-FLOW-02 / 개정 TC-001, TC-058, TC-067, TC-096(MC-14), TC-102 / 요구 R-06 폐기(TC 없음) |

### 사용자 시나리오 행 ↔ TC-FLOW

| 사용자행 | TC-FLOW |
|---|---|
| S-1 | TC-FLOW-01 |
| S-2 | 폐기(CR-019 — requirements.md v1.7 §2 S-2 폐기) — TC-FLOW-02 폐기 |
| S-3 | TC-FLOW-03 |
| S-4 | TC-FLOW-04 |
| S-5 | TC-FLOW-05 |
| S-6 | TC-FLOW-06 |

## 변경 대기열(미검증)

| Q-nn | 일자 | CR-ID | 변경 요약 | 변경 파일 | 영향 TC 후보 | 신규 TC 필요 | 상태 |
|---|---|---|---|---|---|---|---|
| Q-01 | 2026-09-23 | —(자동화 추적, CR 없음) | TC-097(창 라벨 분기) 자동화: 창 라벨 조회(`@tauri-apps/api/window`)를 mock하고 `src/main.tsx`를 불러와 `document.body.dataset.window = 'overlay'`와 지연 로딩 대상(`./overlay`)을 단언하는 스펙 | `src/main.tsx`(공용 진입점 — 이번 overlay 범위에서는 수정 없음) | TC-097 | 예(자동 TC 1건, 추가 뒤 TC-097 수동은 유지 또는 대체를 그때 정함) | 대기(공용 진입점을 다루는 작업에서 전환) |
| Q-02 | 2026-09-24 | CR-017 | 이동 영역·팔 늘어나기 소스 적용: `mouseMapping.ts`에 `pickMonitor`·`cursorUv`·`bilerpQuad`·`armTransform`·`armTransformCss`·상수·타입 신규, `armRotationDeg`·`mapAroundPivot` 삭제, `MouseArm`·`OverlayApp`의 `bounds` → `monitors`·`getScreenBounds()` → `getMonitors()` 전환(실행 중 재조회 없음, design.md §5.1 그대로) | `src/state/mouseMapping.ts` · `src/state/mouseMapping.test.ts` · `src/overlay/components/MouseArm.tsx` · `src/overlay/index.tsx` | TC-015~TC-017, TC-024, TC-025, TC-037~TC-046, TC-098, TC-103~TC-108, TC-113~TC-125 | 아니오(기존 Red TC로 커버 — `yarn test --run src/overlay src/state` 129 passed) | 대기(ui-tester 검증 전) |
| Q-03 | 2026-09-25 | CR-039 | 초기 조회 실패 시 200·500·1000ms 간격 최대 3회 재시도(성공 시 중단·언마운트 시 취소·끝내 실패하면 빈 투명 창) | `src/overlay/index.tsx` · `src/components/utils/fetchWithRetry.ts`(신규) | TC-048(「조회 1회」 단언 3건 → 1+3회로 개정)·TC-063(모니터 실패 시 호출 횟수) | 예 — `OverlayApp.retry.test.tsx` 4건(ui-fixer 초안, TC-ID 부여 필요) | 전환됨(신규 TC-248 ~ TC-251, 개정 TC-048 ①②③·TC-063 ①) |
| Q-04 | 2026-09-26 | CR-051 | 헤어를 `.jellyWrap` 밖 `.canvas` 첫 자식 `.hairWrap`(hair 있을 때만)으로 이동 — 겹침 헤어 → 배경 → 뽀모도 → .jellyWrap(팔 → 본체 → 펜 손). `.hairWrap`은 본체 래퍼와 같은 motion 클래스(.jelly/.jellyAlt/.shiver)를 같은 커밋에 받는다. 검증할 것: 순서·헤어 없을 때 래퍼 없음·젤리/부르르 클래스 두 래퍼 동일·배경/뽀모도에는 애니메이션 없음·`.hairWrap` CSS 기하 = .jellyWrap | `src/overlay/index.tsx` · `src/overlay/overlay.module.css` · `src/overlay/components/HairLayer.tsx`(주석) | TC-241·243·244·245·246(개정 — 옛 「.jellyWrap 첫 자식」 단언), TC-238~240·242·158·288(회귀), MC-24(TC-247) | 예 — `.hairWrap` CSS 기하 TC(TC-158 짝) | 검증됨(2026-09-26 — 전환됨(개정 TC-241·TC-243·TC-244·TC-245·TC-246·TC-247(MC-24), 신규 TC-314, 재확인 TC-238~TC-240·TC-242·TC-158·TC-282·TC-283·TC-288 — v2.0 절); `yarn test --run` 766 PASS) |
| Q-05 | 2026-09-26 | CR-052 | 끝남 알림음 반복 재생: `playSound` 4번째 인자 `loop`(기본 false), `useAlarmOnFinish`는 등록 파일·기본음·실패 대체 기본음 모두 loop true. 정지 경로 불변(finished 이탈·언마운트 halt) | `src/components/utils/alarmSound.ts` · `src/overlay/hooks/useAlarmOnFinish.ts` | TC-300 ①(`loop false` → true), TC-299 ①(기본 loop false 유지), TC-302·TC-303(대체음도 loop true), manual-checklist MC-29·MC-30(한 번 → 10초 동안 반복·정지) | 예(playSound loop true 설정 단언 1건, 대체 기본음 loop 단언) | 검증됨(2026-09-27) |
| Q-06 | 2026-09-27 | CR-053 | DEFAULT_TIMER_SETTINGS textPos (142,458)·rotation 9 (bridge v0.24) — 오버레이 소스 변경 없음 | (없음 — `src/bridge/types.ts` 인용) | OverlayApp.pomodoro.test.tsx TC-286 ② | 아니오 | 검증됨(2026-09-27) |
| Q-07 | 2026-09-27 | CR-055 | 끝남 알림음 1회 재생 복원(CR-052 반복 재생 폐기): `useAlarmOnFinish` `start`가 등록 파일·기본음·실패 대체 기본음 모두 `loop` false로 재생. `finished` 이탈·언마운트 시 정지·깜빡임 10초·미리 듣기는 불변 | `src/overlay/hooks/useAlarmOnFinish.ts` · `src/components/utils/alarmSound.ts`(주석만) | TC-300 ①·TC-302 ①·TC-303 ①②③④·TC-304(`loop` true → false 개정), TC-299 ①(공용 `loop` 인자 — 불변 확인), TC-307 등 타이머 통합 TC의 반복 문구 | 아니오(기존 TC 개정으로 커버) | 검증됨(2026-09-27 — 전환됨(개정 TC-300 ①·TC-302 ①·TC-303 ①②③④·TC-304 ①②·TC-307·TC-311(MC-29)·TC-312(MC-30), 재확인 TC-299 ①·TC-301·TC-302 ②③·TC-305·TC-308·TC-309·TC-313 — v2.3 「CR-055」 절)) |

## CR-039 초기 조회 재시도 — 추가·개정 TC (2026-09-25)

- 기준: CR 대장 CR-039 · `src/components/utils/fetchWithRetry.ts`(`RETRY_DELAYS_MS = [200, 500, 1000]` — 조회마다 따로 재시도, 성공하면 멈춤, 모든 시도 실패 시 마지막 오류로 `onFail` 1회, 취소 함수) · `src/overlay/index.tsx` 초기 로드 효과(`getSettings`·`getAssetManifest`·`getMonitors` 각각 `fetchWithRetry`, `onFail` 없음 = 끝내 실패해도 문구 없음, `getHandAnchor`는 재시도 대상 아님).
- **설계 확인 필요**: design.md §6 P-1 초기 로드·design/functions.md 초기 로드 효과에 재시도 델타가 아직 없다(ui-designer 동기화 대상). 아래 TC의 설계 근거는 CR-039 행과 위 소스 시그니처다.
- 공통 전제: 가짜 시계(`vi.useFakeTimers` — setTimeout·setInterval·Date). 다음 재시도 타이머는 앞 조회의 실패(microtask)가 처리된 뒤에 걸리므로 간격마다 시계 진행 + microtask flush. 실제 sleep 없음.

### TC-248 · 첫 조회 실패 → 200ms 뒤 재시도 성공 · 종류: 자동 · 요구: R-01 · 설계: CR-039, §6 P-1 초기 로드 · 스펙: `test/OverlayApp.retry.test.tsx` · **신규(CR-039)**
- Given `getSettings`·`getAssetManifest` 첫 호출만 reject(`IO`), 나머지 조회 성공
- When 마운트 → 199ms → 1ms → 5000ms
- Then ⓐ 화면: 199ms까지 `.canvas` 없음, 200ms에 `.canvas`·`u:body` img 보임, 문구 없음 ⓑ 상태: `settings`·`manifest`가 재시도 결과로 채워짐 ⓒ bridge: `getAssetManifest` 199ms까지 1회 → 200ms 2회, `getSettings` 2회, 5초 뒤에도 각 2회(성공 뒤 중단), `getMonitors` 1회(인자 없음)

### TC-249 · 세 번째 재시도(1700ms)에서 성공 · 종류: 자동 · 요구: R-01 · 설계: CR-039, §6 P-1 초기 로드 · 스펙: `test/OverlayApp.retry.test.tsx` · **신규(CR-039)**
- Given `getAssetManifest` 앞 3회 reject, 넷째 성공
- When 마운트 → 200ms → 500ms → 1000ms → 5000ms
- Then ⓐ 화면: 700ms 시점 `.canvas` 없음, 1700ms에 `u:body` img 보임 ⓑ 상태: `manifest` 채워짐 ⓒ bridge: `getAssetManifest` 700ms 시점 3회 → 1700ms 4회 → 5초 뒤 4회, `getSettings` 1회

### TC-250 · 계속 실패 → 최초 1회 + 재시도 3회에서 멈춤·빈 투명 창 · 종류: 자동 · 요구: R-01 · 설계: CR-039, §6 P-1 오류 흐름 · 스펙: `test/OverlayApp.retry.test.tsx` · **신규(CR-039)**
- Given `getAssetManifest` 항상 reject
- When 마운트 → 2000ms씩 6회
- Then ⓐ 화면: `.canvas` 없음, 문구 없음(`textContent` 빈 문자열) ⓑ 상태: `manifest` 빈 초기값 유지 ⓒ bridge: `getAssetManifest` 정확히 4회, `getSettings`·`getMonitors` 1회

### TC-251 · 언마운트하면 대기 중 재시도 취소 · 종류: 자동 · 요구: R-01 · 설계: CR-039(취소 함수 — 타이머 해제·이후 결과 버림), §6 P-1 정리 · 스펙: `test/OverlayApp.retry.test.tsx` · **신규(CR-039)**
- Given `getAssetManifest` 항상 reject
- When 마운트 → 첫 실패 처리 → 언마운트 → 10000ms
- Then ⓐ 화면: 언마운트되어 없음 ⓑ 상태: 취소 뒤 반영 없음 ⓒ bridge: `getAssetManifest` 1회(재시도 없음)

### 개정표(CR-039)

| TC | 스펙 | 개정 전 | 개정 후 |
|---|---|---|---|
| TC-048 ① 모두 실패 | `OverlayApp.test.tsx` | ⓒ 5초 뒤에도 조회 1회씩(재시도 없음) | ⓒ 조회 3종 199ms 1회 → 200ms 2회 → 700ms 3회 → 1700ms 4회, 6초 더 지나도 4회. `getHandAnchor` 1회(재시도 대상 아님), `setSettings` 0회. ⓐ 끝까지 `.root`만·img 0·문구 없음 |
| TC-048 ② 설정만 실패 | `OverlayApp.test.tsx` | ⓒ 조회 3종 1회씩 | ⓒ `getSettings` 4회, `getAssetManifest`·`getMonitors` 1회. ⓐ 재시도가 끝난 뒤에도 `scale(0.5)`·원점 `169px 8px`·REST·문구 없음 |
| TC-048 ③ 모니터만 실패 | `OverlayApp.test.tsx` | ⓒ 조회 3종 1회씩 | ⓒ `getMonitors` 4회, 나머지 1회. ⓐ 재시도가 끝난 뒤 이동해도 `.armWrap`·`u:mouse_base` 없음, `u:body` 있음 |
| TC-063 ① 모니터 실패 | `OverlayApp.mouse.test.tsx` | `getMonitors` 1회 reject, 누계 n = 마운트 횟수 | `getMonitors` 4회 연속 reject(재시도까지 실패) — 200·500·1000ms 각 시점과 5초 뒤 `.armWrap` 없음. 누계: 설정·매니페스트 n, 모니터 n + 3(마운트 ①~④, n = 1~4). ②~④ 단언 불변 |

- 추적(CR-039) — 요구 ↔ TC: R-01 → TC-248 ~ TC-251 추가(기존 TC-048·TC-068·TC-078 유지) / 설계 항목 ↔ TC: 「초기 로드 재시도(간격 200·500·1000ms · 조회별 독립 · 성공 시 중단 · 4회 상한 · 끝내 실패하면 빈 투명 창 · 언마운트 취소 · `getHandAnchor` 제외)」 → TC-248(200ms·중단·독립), TC-249(누적 간격), TC-250(상한·빈 창), TC-251(취소), TC-048 ①②③·TC-063 ①(조회별 독립·`getHandAnchor` 제외) / 사용자행 ↔ TC-FLOW: 새 행 없음 — 앱 시작 흐름(TC-FLOW-01)은 성공 경로라 재시도가 일어나지 않아 Step 불변. 수동 항목 없음(전부 가짜 시계로 자동).
- 수: 자동 +4(TC-248 ~ TC-251). 개정 4건(TC-048 3건·TC-063 1건).

## CR-042 펜 손 단순화 — 폐기·개정·추가 TC (v1.6, 2026-09-25)

- **기준(v1.6 — CR-042)**: `src/overlay/requirements.md` **v2.7** R-31(펜 손 단순화 🔒 2026-09-25)·§1 용어 주(CR-042 — R-25의 `pen_down_0…` 순환·`pen_key_{special}`·「키보드 레이어 `kb_up` 고정」, R-26의 `pen_down_N` 순환을 대체)·§2 S-14 / `src/overlay/design.md` **§10.12**(대체 문장 목록·적용 조건·손 그림·키보드 레이어·`LayerStack` 렌더·`config`·바운스·부르르·남은 옛 파일·동작 표 14행·회귀 ①~⑤)·RTM R-31 / `design/functions.md` §5.5 CR-042 개정 블록(`pickPenEntry`·`pickPenKeyboardEntry`·`LayerStack` 렌더·`OverlayApp` `config`·`penDownFrameCount` 삭제) / CR-042 — **새 계약·새 문구 없음**(`AssetSlot` 펜 슬롯은 contract에 그대로, 오버레이는 `pen_up`·`pen_down_0` 두 키만 찾는다). `src/settings/`(두 칸 정리)는 이 문서 범위 밖.
- **v1.6 상태·수(앞 상태·TC 수 줄을 대체)**: CR-042 증분 — 폐기 TC-188, 개정 아래 표, 신규 TC-252~TC-257(자동 6) + TC-258(수동 1 — MC-25), TC-FLOW-14(S-14) 신규. 범위에 R-31 추가. TC 수: 258번까지 = 유효 238건(자동 214 + 수동 24) + 폐기 20건. TC-FLOW 유효 13건 + 폐기 1건. 작성: ui-test-designer · 모드: 증분(v1.6), 작업 모드 보강(maintain).
- **공통 전제 보충**(§0.1·v0.8~v1.5 보충에 더한다 — 서로 어긋나면 이 절이 우선)
  - **펜 모드 규칙 교체**: v1.1·v1.2·v1.4·v1.5 절의 「펜 모드 `kbFrames` = `penDownFrameCount`(펜 누름 2장)」「손 그림 = `pen_key_{special}` → `pen_down_{kbFrame}` → `pen_down_0` → `pen_up`」「펜 모드 키보드 레이어 = `kb_up` 고정」은 이 절부터 다음으로 읽는다 — 펜 모드 `kbFrames` = **1**(`kbFrame`은 늘 0), 손 = 누름(`isPressing` = 키 또는 펜 모드 클릭) 중 `pen_down_0 ?? pen_up`·아니면 `pen_up`, 키보드 = `pickPenKeyboardEntry`(누름(`kbDown`) 아님 → `kb_up` / 특수 키 누름 중이고 `key_{special}` 있으면 그 그림 / 아니면 `kb_up`, `kb_down`은 쓰지 않음). 꺼짐(`penMode false`)·펜 모드 아님은 불변(`kbDownFrameCount`·`pickKeyboardEntry`·손 `pen_up`).
  - **짝 규칙 불변**: 아무것도 안 눌린 상태의 첫 누름(키·펜 모드 클릭)·특수 키 새 누름만 `bounceSeq` +1, 누름 중 홀수 = `jellyWrap jellyAlt`·짝수 = `jellyWrap jelly`, 반복 누름 = `jellyWrap shiver`.
  - **픽스처**: 기존 펜 픽스처(`PEN`·`PEN_MANIFEST`)는 옛 파일 `pen_down_1`·`pen_key_space`를 **그대로 둔다**(§10.12 「남은 옛 파일은 읽지 않음」을 기존 TC도 함께 확인). 새 픽스처 — `penLayers.test.tsx`: `OLD`(기본 + `pen_up`·`pen_down_0`·`pen_down_1`·`pen_key_*` 7종), `TWO`(기본 + `pen_up`·`pen_down_0`), `TABLE`(= `TWO`에서 `key_enter` 제외 — §10.12 동작 표 머리 등록), `PEN_CFG` = `{idleMs 300000, kbFrames 1, clickPress true}`(기본 = 몸통·대기·쉬는중·`kb_up`·`key_space`·`key_enter`·`kb_down` 3장) / `OverlayApp.pen.test.tsx`: `SIMPLE_MANIFEST`(배경·몸통·대기·쉬는중·`kb_up`·`key_space`·팔 3장·`kb_down` 3장 + `pen_up`·`pen_down_0`, `key_enter` 없음), `NO_DOWN0`(같은 기본 + `pen_up`·`pen_down_1`·`pen_key_space`), `OFF` = `{...SETTINGS, mouse: {...MOUSE_PEN, penMode: false}}` / `PenHand.test.tsx` TC-194: `small0`(`pen_down_0`만 180×150).
  - **관찰**: 키보드 img = `.jellyWrap` 직계 마지막 `.layer`(기존), 펜 손 = `img[src^="u:pen"]`, 옛 그림 = `img[src="u:pen_down_1"]`·`img[src="u:pen_key_space"]`. `OverlayApp.penClick.test.tsx`의 `penChecker`는 키보드 기대를 넷째 인자로 받는다(기본 `u:kb_up`)·매 단계 옛 그림 0개.
- §0.3 보충 — **CR-042 red**(CR 대장 「설계 완료」·소스 미적용 시): `pickPenKeyboardEntry` export가 없어 `penLayers.test.tsx` TC-189·TC-191·TC-253·TC-254, `penToggle.test.tsx` TC-230, `OverlayApp.pen.test.tsx` TC-255 ③이 실패(`undefined` 호출·`typeof` 불일치). 현 `pickPenEntry`가 `pen_down_{kbFrame}`·`pen_key_*`를 고르고 현 `LayerStack`이 펜 모드 키보드를 `kb_up`에 고정하므로 TC-190·TC-194·TC-197·TC-198·TC-199·TC-202·TC-212~TC-218·TC-220·TC-221·TC-231·TC-235·TC-236·TC-243·TC-252·TC-256·TC-257 실패, TC-255 ①은 현 `kbFrames` 2라 꺼짐 첫 누름이 `u:kb_down_2`로 실패. `yarn tsc --noEmit`은 `pickPenKeyboardEntry` 없음으로 오류(`penDownFrameCount` import는 스펙에서 제거). 불변 확인 TC(TC-186·TC-187·TC-192·TC-193·TC-195·TC-196·TC-200·TC-201·TC-204~TC-211·TC-219·TC-225·TC-229·TC-232~TC-234)는 적용 전후 모두 Green이 정상.
- **설계 확인 필요**(TC로 우회하지 않음 — 관리자 인계): ① `design/functions.md` §5.5 `PenHand` Props 문단의 「`machine`(`isPressing`·`kbFrame`·`specialHeld`만 읽음)」은 CR-042 이후 `pickPenEntry`가 `kbFrame`·`specialHeld`를 읽지 않으므로 「`isPressing`만」과 어긋난다 ② §5.5 머리글 「`pen_down_*`·`pen_key_*`가 크기가 달라도 같은 기준」, design.md RTM R-19·R-22 비고의 「펜 모드 키보드 `kb_up` 고정」「`pen_key_*`(손 그림)로 반영」은 §10.12로 대체된 옛 문장인데 대체 문장 목록(§10.12 머리)에 없다. 두 건 모두 이 절의 TC 기대값에는 영향이 없다(기대값은 §10.12·CR-042 블록 기준).

### v1.6 개정표 — 폐기·개정·재확인(이 표가 해당 TC 본문과 앞 개정표의 같은 항목을 대체한다)

| TC | 스펙 | 처리(CR-042) |
|---|---|---|
| TC-188 | `penLayers.test.tsx` | **폐기** — `penDownFrameCount` 삭제. it·import 삭제, 번호 유지. 펜 모드 `kbFrames` = 1은 TC-255 ①, export 없음은 TC-255 ③ |
| TC-189 | `penLayers.test.tsx` | 제목 → 「상태기계 연쇄(펜 모드 `kbFrames` 1) — 손·키보드 그림 선택」. Given 설정 `{idleMs 300000, kbFrames 1}`. Then ⓑ 손 url = `u:pen_up` → `u:pen_down_0` → `u:pen_down_0`(반복) → `u:pen_up` → `u:pen_down_0` → `u:pen_down_0`(스페이스 — `pen_key_space` 무시) → `u:pen_down_0`(Enter) → `u:pen_down_0`(Enter 뗌) → `u:pen_up`, 키보드 url(`pickPenKeyboardEntry(PEN, 상태)`) = `u:kb_up` ×5 → `u:key_space` → `u:key_enter` → `u:key_space`(이전 특수 키 복귀) → `u:kb_up`, 각 단계 `kbFrame` 0. ⓐ 해당 없음 ⓒ 호출 없음. 요구 R-31 추가, 설계 §10.12 손 그림·키보드 레이어, functions.md §5.5 CR-042 |
| TC-190 | `penLayers.test.tsx` | 제목 → 「폴백 — `pen_down_0` 없음·`pen_up` 없음·`key_*` 미사용」. When ② `pen_up`·`pen_down_1`만: 키 누름 `kbFrame 0`·`1`·클릭 누름 ③ `pen_up`·`pen_key_space`만: 누름·`['space']` ⑤ `TWO`: `['space']` ⑥ `PARTIAL`·빈 매니페스트: 누름 아님·누름·특수 키·클릭. Then ⓑ ② ③ 모두 `u:pen_up`(옛 `pen_down_1`·`pen_key_space`를 쓰지 않음) ⑤ `u:pen_down_0`(`key_space`를 손 그림으로 쓰지 않음) ⑥ 모두 `undefined`. 옛 ①④(프레임 폴백·`pen_key_*` 7종)는 TC-252로 옮김. 요구 R-31 추가 |
| TC-191 | `penLayers.test.tsx` | 제목 → 「`LayerStack` 펜 모드 키보드 = `pickPenKeyboardEntry` / 펜 모드 아님 = 기존」. `PEN`(penMode true) 키보드: 초기 `u:kb_up` · 누름 `kbFrame 1` `u:kb_up` · 스페이스 `u:key_space` · `['enter']`·`kbFrame 2` `u:key_enter` · 반복 중 `u:kb_up` · 쉬는중 `u:kb_up`(각각 `pickPenKeyboardEntry(PEN, 상태)`와 같음), `u:kb_down*`·`u:pen*` img 없음. `PARTIAL`(false) 불변. 요구 R-31 추가 |
| TC-194 | `PenHand.test.tsx` | 픽스처 `small0`. When 누름 `kbFrame 1` → 누름 `kbFrame 0` → 스페이스 누름 → 클릭만(`clickHeld ['left']`) → 초기. Then ⓐ 같은 img, src `u:pen_down_0`(width 180px·height 150px) ×4 → `u:pen_up`(202×154), left/top 389/492·원점 `101px 77px`·transform 불변, class `hand`. 요구 R-31 추가 |
| TC-197 | `OverlayApp.pen.test.tsx` | 제목 → 「펜 모드 키 입력 — 손 누름 그림 `pen_down_0` 한 장, 특수 키 누름 중 키보드 `key_space`」. Then ⓐ (손 · 키보드) = (`u:pen_down_0`·`u:kb_up`) → (`u:pen_up`·`u:kb_up`) → (`u:pen_down_0`·`u:kb_up`) → (`u:pen_up`·`u:kb_up`) → (`u:pen_down_0`·`u:kb_up`) → 스페이스 (`u:pen_down_0`·`u:key_space`) → Enter (`u:pen_down_0`·`u:kb_up` — `key_enter` 미등록) → Enter 뗌 (`u:pen_down_0`·`u:key_space` — 이전 특수 키 복귀) → 모두 뗌 (`u:pen_up`·`u:kb_up`), 키보드·손 같은 노드, `u:kb_down*` img 0개, 손 자세 불변 ⓑ 끝 `kbFrame 0`·`bounceSeq 5`, 로그 0회 ⓒ 불변. 설계 §10.12 동작 표 2·4·6행 |
| TC-198 | `OverlayApp.pen.test.tsx` | 왼·오른 누름 손 모두 `u:pen_down_0`(키보드 `u:kb_up`). 끝 `kbFrame 0`(`bounceSeq 2` 불변) |
| TC-199 | `OverlayApp.pen.test.tsx` | 누름 손 `u:pen_down_1` → `u:pen_down_0`(단독·FLOW 모두 같은 값) |
| TC-202 | `OverlayApp.pen.test.tsx` | `PEN_MANIFEST` 복귀 뒤 두 번 누름의 손 src 집합 {`u:pen_down_0`, `u:pen_down_1`} → {`u:pen_down_0`}. 제목 「kbFrames 재계산」 = 펜 모드 꺼짐(`NO_PEN`) 3 ↔ 켜짐 1 |
| TC-203 | 수동(MC-20) | ③ 「`pen_down_0`/`pen_down_1`로 번갈아」 → 「`pen_down_0` 한 장(순환 없음)」, ④ 「키보드 쪽 `kb_up` 그대로(`key_space` 그림으로 바뀌지 않음)」 → 「일반 키는 `kb_up`, 특수 키 누름 중에는 본체 `key_*`(등록 시)」, ⑤ 「스페이스 = `pen_key_space`」 → 「스페이스 = 손 `pen_down_0` + 본체 `key_space`」. 전제의 `pen_down_1`·`pen_key_space`는 등록 불요. 요구 R-31 추가 |
| TC-212 | `penClick.test.tsx` | 설정 `CFG`·`PLAIN` `kbFrames 2` → 1. 손 url 13단계 = `pen_up` → `pen_down_0` → `pen_up` → `pen_down_0` → `pen_up` → `pen_down_0`(스페이스 — `pen_key_space` 무시) → `pen_down_0` → `pen_down_0` → `pen_up` → `pen_down_0` → `pen_down_0` → `pen_down_0` → `pen_up`, `kbFrame` 모두 0. 직접 구성 `{['left','right'], kbFrame 1}` → `u:pen_down_0`, `{kbDown, ['space'], clickHeld ['left']}` → `u:pen_down_0` 추가. 나머지 불변. 요구 R-31 추가 |
| TC-213 | `penClick.test.tsx` | src 순서 → `u:pen_down_0` → `u:pen_down_0` → `u:pen_up` → `u:pen_down_0` → `u:pen_up` |
| TC-214 | `OverlayApp.penClick.test.tsx` | 누름 단계 손 `u:pen_down_1`·`u:pen_down_0` → 모두 `u:pen_down_0`. 끝 `kbFrame 1` → 0(`bounceSeq 3` 불변). `penChecker`에 옛 그림 0개 단언 추가 |
| TC-215 | `OverlayApp.penClick.test.tsx` | 누름 단계 손 모두 `u:pen_down_0`(1·5단계 `u:pen_down_1` → `u:pen_down_0`) |
| TC-216 | `OverlayApp.penClick.test.tsx` | 손 `u:pen_key_space`·`u:pen_down_1` → 모두 `u:pen_down_0`, **스페이스 누름 중 키보드 `u:key_space`**(2·5·6단계), 그 밖 `u:kb_up`. 「키보드 img 매 단계 `u:kb_up`」 삭제. 설계 §10.12 동작 표 10·11·12행 추가, 요구 R-31 추가 |
| TC-217 | `OverlayApp.penClick.test.tsx` | 손 `u:pen_down_1` → `u:pen_down_0`(1·2·6~8단계). 끝 `kbFrame 1` → 0 |
| TC-218 | `OverlayApp.penClick.test.tsx` | 손 `u:pen_down_1` → `u:pen_down_0`(1·5단계) |
| TC-220 | `OverlayApp.penClick.test.tsx` | 첫 왼 누름 손 `u:pen_down_1` → `u:pen_down_0` |
| TC-221 | `OverlayApp.penClick.test.tsx` | 누름 뒤 `.jellyWrap` 자식 끝 `u:pen_down_1` → `u:pen_down_0` |
| TC-222 | 수동(MC-21) | ② 「`pen_down` 그림으로 번갈아」 → 「`pen_down_0`으로(순환 없음)」, ④ 「스페이스 = `pen_key_space` + 다시 출렁」 → 「본체 `key_space` + 손 `pen_down_0` + 다시 출렁, 스페이스를 떼면 본체 `kb_up`·손 `pen_down_0`(클릭 유지)」, 「스페이스를 누른 채 클릭하면 `pen_key_space` 유지」 → 「본체 `key_space`·손 `pen_down_0` 유지」. 요구 R-31 추가 |
| TC-230 | `penToggle.test.tsx` | ② `PARTIAL` + `penMode true` 기대 「모두 `u:kb_up`」 → 상태별 `u:kb_up`·`u:kb_up`·`u:kb_up`·**`u:key_space`**(스페이스 누름 — `PARTIAL`에 `key_space` 있음)·`u:kb_up`(= `pickPenKeyboardEntry`). ①③ 불변. 제목 `penMode ? kb_up` → `penMode ? pickPenKeyboardEntry`. 요구 R-31 추가 |
| TC-231 | `penToggle.test.tsx` | 켜짐 rerender 손 src `u:pen_down_1` → `u:pen_down_0`(크기 202×154 = `BOX`) |
| TC-235 | `OverlayApp.penToggle.test.tsx` | `kbFrames` 2 ↔ 3 → **1 ↔ 3**. 1단계 손 `pen_down_1` → `pen_down_0`, 꺼짐 첫 누름 `kb_down_2` → **`kb_down_1`**, 둘째 누름 `kb_down_0` → **`kb_down_2`**, 켜짐 수신 뒤 누름 손 `pen_down_1` → **`pen_down_0`**, 나머지 불변. ⓑ 「초기화 없음」 근거 = 짝(꺼짐 첫 누름 `jellyWrap jelly` = `bounceSeq 2` — 초기화했다면 `jellyWrap jellyAlt`), 끝 `kbFrame 0`·`bounceSeq 5` 불변 |
| TC-236 | `OverlayApp.penToggle.test.tsx` | 첫 왼 누름 손 `u:pen_down_1` → `u:pen_down_0` |
| TC-237 | 수동(MC-23) | ① 「손 그림이 `pen_down`·`pen_key_space`로, 키보드 쪽 `kb_up` 그대로」 → 「손 `pen_down_0`, 스페이스 누름 중 본체 `key_space`, 일반 키·클릭은 본체 `kb_up`」(⑥ 같음). 요구 R-31 추가 |
| TC-243 | `OverlayApp.hair.test.tsx` | 펜 모드 켬 뒤 키 누름 손 `u:pen_down_1` → `u:pen_down_0`. 헤어 기대 불변 |
| TC-006, TC-056, TC-111, TC-232 | 각 스펙 | 설계 참조 문구만: `config.kbFrames` 근거에 「design.md §10.12 `config` — 펜 모드 1 / 그 밖 `kbDownFrameCount(manifest)`」 추가. 기대·스펙 불변(비펜·꺼짐 픽스처) |
| TC-225 | `OverlayApp.lock.test.tsx` | 재확인 — 불변(`PEN_MIN` = `pen_up`·`pen_down_0`만, 특수 키 없음 → 누름 손 `u:pen_down_0`·키보드 `u:kb_up`, `kbFrames 1`). 설계 참조 `LayerStack` 렌더 → §10.12(`penMode ? pickPenKeyboardEntry : pickKeyboardEntry`) |
| TC-186, TC-187, TC-192, TC-193, TC-195, TC-196, TC-200, TC-201, TC-219, TC-229, TC-233, TC-234 | 각 스펙 | 재확인 — 불변(누름 그림·펜 모드 특수 키 키보드를 단언하지 않거나 펜 모드가 아님) |
| TC-204~TC-211 | `inputMachine.click.test.ts` | 재확인 — 불변. 상태기계는 그대로이고 설정 `kbFrames 2`는 순수 스펙의 입력값(오버레이 `config`가 아님), 손 그림을 단언하지 않는다 |
| TC-FLOW-09 | — | 머리 문단의 TC-199 단독 값 `pen_down_1` → `pen_down_0`, Step 3 종료 `kbFrame 1` → 0, Step 4 「`kbFrame 1→0`」 삭제(늘 0), Step 5 「켜짐(펜 누름 2장 순환)」 → 「켜짐(누름 그림 `pen_down_0` 한 장)」 |
| TC-FLOW-10 | — | Step 1·4 종료 `kbFrame 1` → 0(연결 1a·4a는 `bounceSeq` 짝만 맞추면 된다 — 펜 모드 `kbFrame`은 늘 0) |
| TC-FLOW-12 | — | 머리 문단 「켜짐 2」 → 「켜짐 1」. Step 종료 값 불변 |
| TC-FLOW-13 | — | Step 4 종료 `kbFrame 1` → 0 |

### 신규 TC(v1.6)

#### 순수 함수·레이어 — `penLayers.test.tsx` (design/functions.md §5.5 CR-042)

### TC-252 · ① `pickPenEntry` — 누름 없음 `pen_up`, 키·클릭·특수 키 7종·반복 누름 모두 `pen_down_0`(kbFrame·옛 파일 무관) · 종류: 자동 · 요구: R-31, R-25, R-26, R-22 · 설계: design.md §10.12 손 그림·남은 옛 파일·회귀 ①, design/functions.md §5.5 CR-042 `pickPenEntry`(①~③·예)
- Given `OLD`(옛 `pen_down_1`·`pen_key_*` 7종 포함), `TWO`
- When `pickPenEntry` — 누름 아님(`kbFrame 0`·`1`) / 키 누름 `kbFrame 0`·`1`·`2` / 특수 키 7종 각각 누름(`kbFrame 1`) / `['space','enter']` / 클릭만 `['left']`·`['left','right']` / 스페이스 + 오른 클릭 / 반복 중(`repeating true`·`['z']`) / `reduce`(설정 `{kbFrames 2, clickPress true}`)로 만든 키 누름·왼 클릭 누름 / `TWO` + Enter 누름
- Then ⓐ 화면: 해당 없음(순수 함수 — 화면은 TC-257) ⓑ 상태: 누름 아님 → `u:pen_up`, 그 밖 모든 경우 = `findByKey(OLD, 'pen_down_0')`와 **같은 참조**(`u:pen_down_0`), `reduce` 결과는 `kbFrame 1`인데도 `u:pen_down_0`, `TWO` → `u:pen_down_0` ⓒ bridge: 호출 없음(bridge mock 빈 모듈)
- 스펙: `src/overlay/test/penLayers.test.tsx`

### TC-253 · ② `pickPenKeyboardEntry` — 동작 표 1~13행 키보드 열·이전 특수 키 복귀·`kb_down` 미사용 · 종류: 자동 · 요구: R-31, R-22, R-26, R-24 · 설계: design.md §10.12 키보드 레이어·동작 표 1~13(키보드 열)·회귀 ②, §10.6 5행(이전 특수 키 복귀), design/functions.md §5.5 CR-042 `pickPenKeyboardEntry`(①~③·예)
- Given `TABLE`(`key_enter` 없음), `PEN`(`key_enter` 있음), 초기 상태, 설정 `PEN_CFG`
- When `reduce` 연쇄마다 `pickPenKeyboardEntry`: 1~3 a 누름·뗌 / 4·5 스페이스 누름·뗌 / 6 Enter 누름·뗌 / 7·8 a 누른 채 스페이스(2) → 스페이스만 뗌(1) → a 뗌 / 9 왼 클릭 누름·뗌 / 10 스페이스 누른 채 왼 클릭 → 스페이스 뗌 → 클릭 뗌 / 11·12 왼 클릭 누른 채 스페이스 → 스페이스 뗌 → 클릭 뗌 / 13 스페이스 누름 → 반복 ×2 → 뗌 / `PEN`: 스페이스 → Enter → Enter 뗌 → 스페이스 뗌 / `TABLE`: 스페이스 → Enter → Enter 뗌 / 같은 일반 키 누름 상태의 `pickKeyboardEntry` 대조 / 특수 키 7종 직접 구성(`PEN`)
- Then ⓐ 화면: 해당 없음(순수 함수) ⓑ 상태(초기 포함 url 목록): 1~3 `[kb_up, kb_up, kb_up]` / 4·5 `[kb_up, key_space, kb_up]` / 6 `[kb_up, kb_up, kb_up]` / 7·8 `[kb_up, kb_up, key_space, kb_up, kb_up]` / 9 `[kb_up, kb_up, kb_up]` / 10 `[kb_up, key_space, key_space, kb_up, kb_up]` / 11·12 `[kb_up, kb_up, key_space, kb_up, kb_up]` / 13 `[kb_up, key_space, key_space, key_space, kb_up]` / `PEN` `[kb_up, key_space, key_enter, key_space, kb_up]` / `TABLE` `[kb_up, key_space, kb_up, key_space]`(가장 최근 `enter` 그림이 없으면 앞선 `space`로 가지 않음) / 대조: 비펜 `u:kb_down_0`, 펜 `u:kb_up` / 7종: `space` → `u:key_space`, `enter` → `u:key_enter`, 나머지 5종(미등록) → `u:kb_up`(모두 `u:` 접두) ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penLayers.test.tsx`

### TC-254 · ③ `LayerStack` `penMode` 분기 — 켜짐 `pickPenKeyboardEntry` / 꺼짐 `pickKeyboardEntry`, 같은 img · 종류: 자동 · 요구: R-31, R-29, R-22, R-07 · 설계: design.md §10.12 `LayerStack` 렌더·회귀 ③, design/functions.md §5.5 CR-042 `LayerStack` 렌더, design/components.md §3 `LayerStack` 행
- Given `TABLE`, 상태 6가지 = 초기 / 누름 `kbFrame 1` / 누름 `kbFrame 2`·`['space']` / `['space','enter']` / 클릭만 `['left']` / 쉬는중
- When 각 상태를 `penMode` true → false → true로 렌더·rerender
- Then ⓐ 화면: 켜짐 키보드 img src = `u:kb_up` / `u:kb_up` / `u:key_space` / `u:kb_up` / `u:kb_up` / `u:kb_up`(= `pickPenKeyboardEntry(TABLE, 상태)`), `u:kb_down*` img 없음 → 꺼짐 = `pickKeyboardEntry(TABLE, 상태)`(일반 키 누름 `kbFrame 1`은 `u:kb_down_1`) → 다시 켜짐 값, 세 렌더 모두 **같은 키보드 img 노드**·class `layer`, 앞 두 img = `u:body`·`u:idle`(쉬는중 `u:rest`), `u:pen*` img 없음 ⓑ 상태: 입력 상태는 그대로 넘기고 prop으로만 갈림 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/penLayers.test.tsx`

#### 화면 통합 — `OverlayApp.pen.test.tsx` (design.md §10.12, design/functions.md §5.5 CR-042 `OverlayApp` `config`)

### TC-255 · ④ `config.kbFrames` — 펜 모드 1·꺼짐 `kbDownFrameCount`, `penDownFrameCount` export 없음 · 종류: 자동 · 요구: R-31, R-29, R-07 · 설계: design.md §10.12 `config`·회귀 ④, design/functions.md §5.5 CR-042 `OverlayApp` `config`·`penDownFrameCount` 삭제, design.md §10.10 전환(상태기계 초기화 없음)
- Given `PEN_MANIFEST`(옛 파일 포함 — 옛 `penDownFrameCount`였다면 2)·`SETTINGS`(`penMode true`)로 마운트(T0), 모두 뗌·`kbFrame 0`
- When 키 누름·뗌 → `settings://changed`(`OFF`) → 키 누름·뗌 ×3 → `settings://changed`(`SETTINGS`) → 키 누름·뗌 / `LayerStack` 모듈 export 검사
- Then ⓐ 화면: (손 · 키보드) = (`u:pen_down_0`·`u:kb_up`) → (`u:pen_up`·`u:kb_up`) → 꺼짐 수신 (`u:pen_up`·`u:kb_up`) → **(`u:pen_up`·`u:kb_down_1`)**(켜짐 누름 뒤 `kbFrame`이 0 — `kbFrames` 2였다면 `u:kb_down_2`) → (`u:pen_up`·`u:kb_up`) → (`u:pen_up`·`u:kb_down_2`) → (`u:pen_up`·`u:kb_up`) → (`u:pen_up`·`u:kb_down_0`) → (`u:pen_up`·`u:kb_up`) → 켜짐 수신 (`u:pen_up`·`u:kb_up`) → (`u:pen_down_0`·`u:kb_up`) → (`u:pen_up`·`u:kb_up`), 손·키보드는 끝까지 같은 노드 ⓑ 상태: 켜짐 `kbFrame` 늘 0, 꺼짐 1 → 2 → 0(3장 순환), `'penDownFrameCount' in LayerStack 모듈` = false, `typeof pickPenKeyboardEntry` = `'function'` ⓒ bridge: `onSettingsChanged` 구독 1회, 조회 1회(설정 이벤트는 페이로드만), `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.pen.test.tsx`

### TC-256 · ⑤ 옛 파일(`pen_down_1`·`pen_key_space`)은 쓰이지 않음, `pen_down_0` 없으면 누름 중에도 `pen_up` · 종류: 자동 · 요구: R-31, R-25 · 설계: design.md §10.12 남은 옛 파일·계약(`pen_up`·`pen_down_0` 두 키만 찾음)·회귀 ⑤, design/functions.md §5.5 CR-042 `pickPenEntry` 예(`pen_down_0` 미등록)
- Given `PEN_MANIFEST`(`pen_up`·`pen_down_0` + 옛 `pen_down_1`·`pen_key_space`)로 펜 모드 마운트(T0), 모두 뗌
- When 키 누름·뗌 ×2 → 스페이스 누름 → 왼 클릭 누름 → 스페이스 뗌 → 클릭 뗌 → 오른 클릭 누름·뗌 → `assets://changed`(`NO_DOWN0`) → 키 누름 → 스페이스 누름(2) → 왼 클릭 누름 → 스페이스 뗌(1) → 키 뗌(0) → 클릭 뗌
- Then ⓐ 화면: 앞 구간 손 src 집합 = {`u:pen_down_0`, `u:pen_up`}, 키보드 = `kb_up`×4 → `key_space` → `key_space` → `kb_up`×4, 매 단계 옛 그림 img 0개 / `NO_DOWN0` 구간 손 = 매 단계 `u:pen_up`(같은 노드), 키보드 = `kb_up` → `key_space` → `key_space` → `kb_up` → `kb_up` → `kb_up`, 옛 그림 0개, `textContent` `''`(안내·오류 없음) ⓑ 상태: 펜 모드 유지(`pen_up` 있음), 끝에 모두 뗌 ⓒ bridge: 조회 1회(`getAssetManifest` 추가 호출 없음 — 이벤트 페이로드만), `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.pen.test.tsx`

### TC-257 · §10.12 동작 표 1~14행 화면 통합 — 본체 키보드·손·젤리 · 종류: 자동 · 요구: R-31, R-22, R-23, R-24, R-26 · 설계: design.md §10.12 동작 표 1~14·바운스·부르르·입력 비보관, §10.3 젤리 트리거, design/functions.md §5.5 CR-042 `pickPenEntry`·`pickPenKeyboardEntry`·`LayerStack` 렌더, requirements §2 S-14
- Given `SIMPLE_MANIFEST`·`SETTINGS`(`penMode true`)로 마운트(T0), 모두 뗌·`bounceSeq 0`(짝수)
- When 1 없음 → 2·3 a 누름·뗌 → 4·5 스페이스 누름·뗌 → 6 Enter 누름·뗌 → 7·8 a 누름 → 스페이스 누름(2) → 스페이스 뗌(1) → a 뗌 → 9 왼 클릭 누름·뗌 → 10 스페이스 누름 → 왼 클릭 누름 → 스페이스 뗌 → 클릭 뗌 → 11·12 왼 클릭 누름 → 스페이스 누름 → 스페이스 뗌 → 클릭 뗌 → 13 스페이스 누름 → 반복 ×2 → 뗌 → 14 a 누름·뗌 ×3
- Then ⓐ 화면: (키보드 · 손 · `.jellyWrap` class, J = `jellyWrap`·A = `jellyWrap jellyAlt`·B = `jellyWrap jelly`·S = `jellyWrap shiver`) 31단계 = 1 (`kb_up`·`pen_up`·J) → 2 (`kb_up`·`pen_down_0`·A) → 3 (`kb_up`·`pen_up`·J) → 4 (`key_space`·`pen_down_0`·B) → 5 (`kb_up`·`pen_up`·J) → 6 (`kb_up`·`pen_down_0`·A) → 뗌 (`kb_up`·`pen_up`·J) → 7 a (`kb_up`·`pen_down_0`·B) → 스페이스 (`key_space`·`pen_down_0`·A — ⓑ 재생) → 8 스페이스 뗌 (`kb_up`·`pen_down_0`·A — 새 재생 없음) → a 뗌 (`kb_up`·`pen_up`·J) → 9 클릭 (`kb_up`·`pen_down_0`·B) → 뗌 (`kb_up`·`pen_up`·J) → 10 스페이스 (`key_space`·`pen_down_0`·A) → 클릭 (`key_space`·`pen_down_0`·A — 재생 없음) → 스페이스 뗌 (`kb_up`·`pen_down_0`·A) → 클릭 뗌 (`kb_up`·`pen_up`·J) → 11 클릭 (`kb_up`·`pen_down_0`·B) → 스페이스 (`key_space`·`pen_down_0`·A — ⓑ) → 12 스페이스 뗌 (`kb_up`·`pen_down_0`·A) → 클릭 뗌 (`kb_up`·`pen_up`·J) → 13 스페이스 (`key_space`·`pen_down_0`·B) → 반복 ×2 (`key_space`·`pen_down_0`·S) → 뗌 (`kb_up`·`pen_up`·J) → 14 a ×3 (`kb_up`·`pen_down_0`·A / B / A, 뗌마다 `kb_up`·`pen_up`·J)(모두 `u:` 접두), 매 단계 키보드·손·`.jellyWrap` 같은 노드, 손 = `.jellyWrap` 마지막 자식·자세 불변, `u:kb_down*` img 0개 ⓑ 상태: 끝에 모두 뗌·`bounceSeq 13`·`kbFrame 0`, `console.log/info/debug` 0회(입력 비보관) ⓒ bridge: 조회 1회, `setSettings` 0회, 새 command·event 없음
- 스펙: `src/overlay/test/OverlayApp.pen.test.tsx`

#### 수동 — `src/overlay/test/manual-checklist.md`

### TC-258 · 펜 손 단순화 실측 — 손 두 장·특수 키는 본체 `key_*` + 손 `pen_down_0`·일반 키/클릭은 손만·옛 파일 무시 · 종류: 수동(MC-25) · 요구: R-31, R-22, R-25, R-26, R-23, R-24, R-29 · 설계: design.md §10.12 전체(적용 조건·손 그림·키보드 레이어·바운스·부르르·남은 옛 파일·동작 표), requirements §2 S-14
- Given 실제 앱(CR-042 적용 빌드 — 오버레이 소스, 새 계약 없음), 몸통·대기·`kb_up`·`kb_down` 2장 이상·`key_space`·`key_z`·팔 3장·`pen_up`·`pen_down_0` 등록, `key_enter` 미등록, 펜 손 사용 켜짐, 앱 데이터 폴더의 옛 `pen_down_1.png`·`pen_key_space.png`는 있으면 그대로, 메모장 포커스
- When MC-25 절차 ①~⑪
- Then ⓐ 화면: 일반 키·클릭은 손만 `pen_down_0`(순환 없음)·본체 `kb_up`, 스페이스·ㅋ는 누르는 동안 본체 `key_space`/`key_z` + 손 `pen_down_0`이 같은 순간 바뀌고 젤리 1회, Enter는 본체 `kb_up`·손만, 특수 키만 떼면 본체 `kb_up`·손 누름 유지, 꾹 누름 부르르 중 그림 유지, 옛 그림은 한 번도 안 보임, `pen_down_0`을 비우면 누름 중에도 손 `pen_up`·본체는 특수 키 그림, 끄면 기존 키보드 순환 ⓑ 상태: `settings.json` 변화 없음(비우기 단계의 이미지 파일 변화만) ⓒ core·bridge: 기존 `input://*`·`assets://changed`·`settings://changed`만, 새 command·event 없음, 로그·콘솔에 입력 정보 없음

### TC-FLOW-14 · S-14 펜 손 모드로 채팅하며 특수 키를 치면 몸은 그 키 그림·손은 펜 입력 1 한 장, 일반 키·클릭은 손만(TC-FLOW 목록에 더한다)
Steps: TC-257 → [연결 1a] → TC-256 → [연결 2a] → TC-255 → (환경 전환) TC-258 (v1.6 신규, CR-042)

같은 마운트를 이어 가는 흐름이다. TC-256·TC-255는 `.jellyWrap` class·`bounceSeq`를 단언하지 않으므로 앞 Step의 짝을 그대로 받는다. 호출 횟수는 Step 시작 기준(마운트 이후 누계로는 조회 1회·`onSettingsChanged` 구독 1회 그대로).

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-257 | 사용자가 손 그림 두 장(`pen_up`·`pen_down_0`)과 `key_space`만 등록, 펜 손 켜짐: `SIMPLE_MANIFEST`·`SETTINGS`로 마운트(T0), 모두 뗌·`bounceSeq 0` | 동작 표 1~14 확인. 모두 뗌·`kbFrame 0`·`bounceSeq 13`, 조회 1회·`setSettings` 0회 |
| 1a | 연결(TC 아님) | Step 1 종료 | 옛 설정 창에서 넣어 둔 파일이 남은 사용자 재현: `assets://changed`(`PEN_MANIFEST` — 옛 `pen_down_1`·`pen_key_space` 포함) → 손 `u:pen_up`·모두 뗌 ⇒ TC-256 Given(펜 모드·모두 뗌) |
| 2 | TC-256 | Step 1a 종료 | 옛 그림 미사용·`pen_down_0` 없으면 `pen_up` 확인. 매니페스트 `NO_DOWN0`, 모두 뗌, 이 Step 시작 이후 조회 추가 0회 |
| 2a | 연결(TC 아님) | Step 2 종료 | 설정 창에서 「펜 입력 1」을 다시 등록한 상황: `assets://changed`(`PEN_MANIFEST`) → 모두 뗌·`kbFrame 0` ⇒ TC-255 Given |
| 3 | TC-255 | Step 2a 종료 | 켜짐 누름 뒤 끔 → `kb_down_1`부터 3장 순환 → 켬 → `pen_down_0`. 켜짐·모두 뗌·`kbFrame 0`. Step 1 시작 이후 조회 추가 0회·`setSettings` 0회 |
| 4 | TC-258(수동) | 환경 전환: 실제 앱·메모장, 손 두 장·`key_space`·`key_z` 등록, 옛 파일 남김 | 특수 키 본체 교체 + 손 `pen_down_0`·일반 키/클릭 손만·옛 그림 미표시·`pen_down_0` 비움·끄기 실측 |

### 추적표 v1.6 추가분(CR-042) — 「## 추적표」의 v1.5 이하 표에 더한다

요구 ↔ TC(추가)

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-31 | 신규 TC-252, TC-253, TC-254, TC-255, TC-256, TC-257 / 개정 TC-189, TC-190, TC-191, TC-194, TC-197, TC-198, TC-199, TC-202, TC-212~TC-218, TC-220, TC-221, TC-230, TC-231, TC-235, TC-236, TC-243 | TC-258(MC-25) / 개정 TC-203(MC-20), TC-222(MC-21), TC-237(MC-23) |
| R-22(더함 — 펜 모드에서도 특수 키 누름 중 본체 `key_*`, 이전 특수 키 복귀, 미등록이면 `kb_up`) | TC-253, TC-254, TC-257, TC-189, TC-191, TC-197, TC-216, TC-230 | TC-258 |
| R-25(대체 반영 — 손 누름 그림 `pen_down_0` 한 장, 옛 슬롯 미사용) | TC-252, TC-256, TC-190, TC-194 | TC-258 |
| R-26(대체 반영 — 펜 모드 클릭 누름도 `pen_down_0`, 본체 `kb_up`) | TC-252, TC-253(9~12행), TC-257, TC-212~TC-218 | TC-258 |
| R-29(더함 — 꺼짐 분기·`kbFrames` 1 ↔ 3 전환) | TC-254, TC-255, TC-235 | TC-258 ⑩ |
| R-23·R-24(더함 — 젤리·부르르 규칙 불변) | TC-257, TC-253(13행) | TC-258 |
| R-07(더함 — 꺼짐 `kb_down` 순환) | TC-254, TC-255 | — |

설계 항목 ↔ TC(CR-042)

| 설계 항목 | TC |
|---|---|
| design.md §10.12 대체 문장 목록(§10.7 손 그림 선택·키보드 고정, §10.8 순환, §10.9.2·§10.10 `kb_up` 고정·`penDownFrameCount`) | 개정표 전체(TC-189~TC-191, TC-194, TC-197~TC-199, TC-202, TC-212~TC-218, TC-220, TC-221, TC-230, TC-231, TC-235, TC-236, TC-243) |
| §10.12 적용 조건(`penMode === true`만, 꺼짐은 §10.10) | TC-254(꺼짐 = `pickKeyboardEntry`), TC-255(꺼짐 순환), TC-232·TC-233(기존 — 불변) |
| §10.12 손 그림(`pickPenEntry` 개정 — `kbFrame`·`specialHeld` 안 읽음) | TC-252, TC-189, TC-190, TC-212, TC-213, TC-194, TC-257 |
| §10.12 키보드 레이어(`pickPenKeyboardEntry` — `kb_down` 안 씀, 클릭만 = `kb_up`, 이전 특수 키 복귀) | TC-253, TC-189, TC-191, TC-197, TC-216, TC-257 |
| §10.12 `LayerStack` 렌더(`penMode ? pickPenKeyboardEntry : pickKeyboardEntry`, 같은 `<img>`) | TC-254, TC-191, TC-230 |
| §10.12 `config`(`kbFrames: penMode ? 1 : kbDownFrameCount`, 초기화 없음) | TC-255, TC-235, TC-202 |
| §10.12 바운스·부르르(트리거 불변, 특수 키 새 누름 때 본체·손 같은 렌더 + 젤리 1회) | TC-257(4·7·11·13·14행), TC-216, TC-217, TC-199 |
| §10.12 남은 옛 파일(`pen_down_1+`·`pen_key_*` 미사용, `pen_down_0` 없으면 `pen_up`·안내 없음, 위치 기준 `pen_up`) | TC-256, TC-252, TC-190, TC-194 |
| §10.12 동작 표 1~14행 | TC-257(전 행), TC-253(1~13행 키보드 열) |
| §10.12 입력 비보관·계약 변경 없음 | TC-257 ⓑⓒ, TC-256 ⓒ, TC-197 ⓑ |
| §10.12 회귀 ① / ② / ③ / ④ / ⑤ | TC-252 / TC-253 / TC-254 / TC-255 / TC-256 |
| design/functions.md §5.5 CR-042 `pickPenEntry` · `pickPenKeyboardEntry` · `LayerStack` 렌더 · `OverlayApp` `config` · `penDownFrameCount` 삭제 | TC-252 · TC-253 · TC-254 · TC-255 ①② · TC-255 ③(export 없음)·TC-188 폐기 |
| requirements §1 용어 주(CR-042 — R-25·R-26 대체) | TC-252, TC-257 |
| requirements §2 S-14 | TC-FLOW-14, TC-257, TC-258 |

상태 전이표(확정사항 §5) ↔ TC(CR-042): 변경 없음 — 상태기계(`reduce`)는 그대로이고 펜 모드 설정값 `kbFrames`만 1이 된다. TC-189가 `kbFrames 1` 전이 연쇄(`kbFrame` 늘 0)를, TC-204~TC-211이 기존 전이를 그대로 확인한다.

사용자행 ↔ TC-FLOW(추가)

| 사용자행 | TC-FLOW |
|---|---|
| S-14 | TC-FLOW-14 |

CR ↔ TC(추가)

| CR | TC |
|---|---|
| CR-042 | 폐기 TC-188 / 개정 TC-189~TC-191, TC-194, TC-197~TC-199, TC-202, TC-203, TC-212~TC-218, TC-220~TC-222, TC-230, TC-231, TC-235~TC-237, TC-243, TC-FLOW-09·10·12·13, 참조만 TC-006·TC-056·TC-111·TC-225·TC-232 / 신규 TC-252~TC-258, TC-FLOW-14 / 스펙 `penLayers`·`PenHand`·`penClick`·`penToggle`·`OverlayApp.pen`·`OverlayApp.penClick`·`OverlayApp.penToggle`·`OverlayApp.hair` |

- 수: 자동 +6(TC-252~TC-257), 수동 +1(TC-258 — MC-25), 폐기 +1(TC-188). 258번까지 = 유효 238건(자동 214 + 수동 24) + 폐기 20건. TC-FLOW 유효 13건 + 폐기 1건.

## CR-043 타자 입력 1 선택 강등 — 키보드 모드 폴백 TC (v1.7, 2026-09-26)

- **기준(v1.7 — CR-043)**: `src/overlay/requirements.md` **v2.8** R-32(🔒 2026-09-26)·§2 S-15 / `src/overlay/design.md` **§10.13**(판정·개정 — `pickKeyboardEntry` 반환식 끝 `?? findEntry(manifest, 'kb_up')`, 시그니처 불변·규칙 표 1~6행·바운스만·불변·대체 읽기·계약·회귀 ①~④)·RTM R-32·R-27 비고 / `design/functions.md` §5.3 `pickKeyboardEntry`(§10.13이 5·6행을 덧붙임)·`kbDownFrameCount`. **새 계약·새 문구 없음**(contract v0.19 `REQUIRED_SLOTS`는 오버레이가 읽지 않음). `src/settings/`(필수 배지·설명문 — settings R-40)는 이 문서 범위 밖.
- **v1.7 상태·수(앞 상태·TC 수 줄을 대체)**: CR-043 증분 — 개정 TC-140(스펙 기대 1건), 신규 TC-259~TC-262(자동 4) + TC-263(수동 1 — MC-26), TC-FLOW-15(S-15) 신규. 범위에 R-32 추가. TC 수: 263번까지 = 유효 243건(자동 218 + 수동 25) + 폐기 20건. TC-FLOW 유효 14건 + 폐기 1건. 작성: ui-test-designer · 모드: 증분(v1.7), 작업 모드 보강(maintain).
- **공통 전제 보충**: 적용 조건 = 키보드 모드(`penMode` false 또는 `pen_up` 미등록 — `LayerStack` 키보드 = `pickKeyboardEntry`). 짝 규칙(v1.6 보충)은 그대로 — 아무것도 안 눌린 상태의 첫 누름·특수 키 새 누름만 `bounceSeq` +1, 누름 중 홀수 `jellyWrap jellyAlt`·짝수 `jellyWrap jelly`, 반복 `jellyWrap shiver`, 뗌 `jellyWrap`. design.md §10.13 회귀 ③의 「`.jellyWrap`에 `jelly` 클래스」는 이 짝 규칙의 젤리 클래스(첫 누름 = `bounceSeq` 1 → `jellyAlt`)로 읽는다.
- **픽스처**(`keyboardFallback.test.tsx`): `NO_DOWN` = 몸통·대기·쉬는중·`kb_up`·`key_space`·`mouse_base`(`kb_down` 0장, `key_enter` 미등록 — R-32 필수 2장 + 선택 일부), `NO_DOWN_UP` = `NO_DOWN` − `kb_up`, `ONE_DOWN` = `NO_DOWN` + `kb_down_0`, `TWO_DOWN` = `NO_DOWN` + `kb_down_0`·`kb_down_1`, `EMPTY` = `{canvas null, entries []}`. 설정 `SETTINGS`(`mouse.penMode false`, `idleSeconds 300`). 관찰 = `.jellyWrap` 직계 `img.layer`의 src(마지막 = 키보드 img)·`.jellyWrap` className.
- §0.3 보충 — **CR-043 red**(CR 대장 「설계 완료」·소스 미적용 시): 현 `pickKeyboardEntry`가 `kb_down` 없으면 `undefined`를 돌려 키보드 img가 사라지므로 TC-259(5행 단언)·TC-261(누름 중 img 3개·같은 노드)·TC-262(1·3·4·8·11단계)·TC-140(개정 단언)이 실패. TC-260과 아래 재확인 TC는 적용 전후 모두 Green이 정상.

### v1.7 개정표 — 개정·재확인(이 표가 해당 TC 본문의 같은 항목을 대체한다)

| TC | 스펙 | 처리(CR-043) |
|---|---|---|
| TC-140 | `specialKey.render.test.tsx` | Then ⓑ의 「`kb_down` 없는 매니페스트(`noDown`) + `['z']` 누름 → `undefined`」 → **`u:kb_up`**, 「`noDown` + 일반 키 누름(`[]`) → `u:kb_up`」 추가, 「`noDown` + `['space']` → `u:key_space`」·「`kb_up` 없는 매니페스트(`noUp`) + 누름 아님 → `undefined`」 불변. 제목 끝 「`kb_down[kbFrame] ?? kb_down[0]`」 → 「`… ?? kb_down[0] ?? kb_up`」. 요구 R-32 추가, 설계 design.md §10.13 5행 추가 |
| TC-141, TC-144, TC-145, TC-146 | `specialKey.render.test.tsx`·`OverlayApp.special.test.tsx` | 재확인 — 불변(매니페스트에 `kb_down` 2~3장 등록, 5행 조건 미발생) |
| TC-223~TC-226 | `OverlayApp.lock.test.tsx` | 재확인 — 불변(`REQUIRED` = `kb_up`·`kb_down_0`·`mouse_base` — `kb_down_0`이 등록돼 있어 4행). §10.9.2 「필수 그림」은 R-32로 `kb_up`·`mouse_base`로 읽지만 픽스처는 「등록된 한 조합」으로 유효 |
| TC-189~TC-191, TC-230, TC-253, TC-254 | `penLayers.test.tsx`·`penToggle.test.tsx` | 재확인 — 불변(펜 모드 `pickPenKeyboardEntry`는 원래 `kb_down`을 안 씀 / 꺼짐 대조 `PARTIAL`·`TABLE`은 `kb_down` 등록) |
| TC-238~TC-246(헤어) | `OverlayApp.hair.test.tsx` | 재확인 — 불변(`EMPTY_MANIFEST`는 `kb_up`도 없어 6행 `undefined` 그대로, 나머지는 `kb_down` 3장) |
| TC-248~TC-251 | `OverlayApp.retry.test.tsx` | 재확인 — 불변(`MANIFEST`에 `kb_down` 없으나 키 입력을 흘리지 않음) |

### 신규 TC(v1.7)

### TC-259 · ① `pickKeyboardEntry` — `kb_down` 없음: 누름·반복·그림 없는 특수 키 → `kb_up`, `key_*` 있음 → `key_*`, `kb_up`도 없음 → `undefined` · 종류: 자동 · 요구: R-32, R-22, R-07 · 설계: design.md §10.13 개정(시그니처 불변)·규칙 표 1~6행·회귀 ①, design/functions.md §5.3 `pickKeyboardEntry`(5·6행 덧붙여 읽기), §10.6 규칙표 대체 읽기 · **신규(CR-043)**
- Given 픽스처 `NO_DOWN`·`NO_DOWN_UP`·`ONE_DOWN`·`TWO_DOWN`·`EMPTY`, 상태는 `createInitialState(0)`에 누름 필드를 덮어 직접 구성
- When `pickKeyboardEntry` — 1행 `NO_DOWN` 누름 아님 / 2행 `NO_DOWN` `['space']`·`['enter','space']` / 3행 `TWO_DOWN` 일반 누름 `kbFrame 1` / 4행 `ONE_DOWN` 일반 누름 `kbFrame 1`·`['enter']` / 5행 `NO_DOWN` 일반 누름 `kbFrame 0`·`1`·`2`, `['enter']`·`['z']`·`['question']`·`['backspace']`, `['space','enter']`, `['z']` + `repeating true` / 6행 `NO_DOWN_UP` 누름 아님·일반 누름·`['enter']`·`['space']`, `EMPTY` 누름 아님·누름
- Then ⓐ 화면: 해당 없음(순수 함수 — 화면은 TC-261·TC-262) ⓑ 상태(반환값): 1행 `u:kb_up` / 2행 `u:key_space` ×2 / 3행 `u:kb_down_1` / 4행 `u:kb_down_0` ×2 / 5행 9경우 모두 `NO_DOWN`의 `kb_up` 항목과 **같은 참조**(`['space','enter']`도 이전 특수 키 `key_space`가 아니라 `kb_up`) / 6행 `undefined` ×3·`['space']`만 `u:key_space`, `EMPTY` 둘 다 `undefined`(예외 없음) / `pickKeyboardEntry.length` = 2 ⓒ bridge: `getAssetManifest`·`setSettings` 호출 0회
- 스펙: `src/overlay/test/keyboardFallback.test.tsx`

### TC-260 · ② `kbDownFrameCount` — 빈 매니페스트·`kb_down` 없음 → 1 · 종류: 자동 · 요구: R-32, R-07 · 설계: design.md §10.13 판정(「`max(1, 0)` = 1이라 `kbFrame` 0 고정」)·불변(`config.kbFrames`)·회귀 ②, design/functions.md §5.3 `kbDownFrameCount` · **신규(CR-043)**
- Given `EMPTY`·`NO_DOWN`·`ONE_DOWN`·`TWO_DOWN`
- When `kbDownFrameCount` 호출
- Then ⓐ 화면: 해당 없음(순수 함수) ⓑ 상태(반환값): `1`·`1`·`1`·`2` ⓒ bridge: `setSettings` 호출 0회
- 스펙: `src/overlay/test/keyboardFallback.test.tsx`

### TC-261 · `LayerStack`(키보드 모드) — `kb_down` 없음: 같은 키보드 img가 누름 중에도 `kb_up`, 펜 모드 결과 불변 · 종류: 자동 · 요구: R-32, R-22, R-29 · 설계: design.md §10.13 바운스만(「같은 키보드 `<img>` 요소를 유지·src는 preload된 `kb_up` URL」)·불변(펜 모드 `pickPenKeyboardEntry`·DOM 순서·리렌더 원인)·6행, design/functions.md §5.3 `LayerStack` 렌더(CR-042 개정 `penMode ? pickPenKeyboardEntry : pickKeyboardEntry`) · **신규(CR-043)**
- Given `LayerStack` `penMode={false}`·`NO_DOWN`·누름 아님으로 render, 키보드 img(세 번째 img) 노드 참조를 잡아 둠
- When rerender 순서: 일반 누름 → 반복 중(`kbFrame 1`·`repeating true`) → `['space']` → `['enter']` → 누름 아님 → `NO_DOWN_UP`·일반 누름 → `penMode` true·`NO_DOWN`으로 누름 아님·일반 누름·`['space']`·`['enter']`
- Then ⓐ 화면: 처음·앞 5단계 모두 img src = `['u:body','u:idle', 키보드]`, 키보드 = `u:kb_up`·`u:kb_up`·`u:key_space`·`u:kb_up`·`u:kb_up`, class 모두 `layer`, 키보드 img가 **처음과 같은 노드**(img 수 3 유지 — 누름 중 사라지지 않음) → `NO_DOWN_UP` img src = `['u:body','u:idle']`(키보드 img 없음) → 펜 모드 키보드 src = `pickPenKeyboardEntry(NO_DOWN, 상태).url`(`u:kb_up`·`u:kb_up`·`u:key_space`·`u:kb_up`) ⓑ 상태: 입력 상태는 prop 그대로, 렌더만 규칙 표로 갈림 ⓒ bridge: `setSettings` 호출 0회
- 스펙: `src/overlay/test/keyboardFallback.test.tsx`

### TC-262 · ③ `OverlayApp` — `kb_down` 없는 매니페스트에서 타자: 키보드 img `kb_up` + 젤리·부르르, `key_space` 교체, 등록·비움 즉시 반영 · 종류: 자동 · 요구: R-32, R-23, R-24, R-22, R-07, R-27 · 설계: design.md §10.13 규칙 1·2·4·5·6행·바운스만·불변(상태기계·`config.kbFrames`)·회귀 ③, §10.3 젤리 트리거, design/functions.md §5.3 `LayerStack` 렌더, requirements §2 S-15 · **신규(CR-043)**
- Given `getAssetManifest` → `NO_DOWN`, `getSettings` → `SETTINGS`(`penMode false`), 가짜 시계 T0에서 마운트, 입력 없음(`bounceSeq 0`), 키보드 img 노드 참조를 잡아 둠
- When 1 키 누름(1) → 2 뗌(0) → 3 누름(1) → 4 반복 누름(`repeat true`) → 5 뗌 → 6 스페이스 누름(1,`space`) → 7 뗌(0,`space`) → 8 Enter 누름(1,`enter`) → 9 뗌(0,`enter`) → 10 `assets://changed`(`ONE_DOWN`) → 누름 → 뗌 → 11 `assets://changed`(`NO_DOWN`) → 누름 → 뗌 → 12 `assets://changed`(`NO_DOWN_UP`) → 누름 → 뗌
- Then ⓐ 화면: 마운트 `.jellyWrap` 직계 layer img src = `['u:body','u:idle','u:kb_up']`, className `jellyWrap` → 1 `u:kb_up`·`jellyWrap jellyAlt` → 2 `u:kb_up`·`jellyWrap` → 3 `u:kb_up`·`jellyWrap jelly` → 4 `u:kb_up`·`jellyWrap shiver` → 5 `u:kb_up`·`jellyWrap` → 6 `u:key_space`·`jellyWrap jellyAlt` → 7 `u:kb_up`·`jellyWrap` → 8 `u:kb_up`(`key_enter` 미등록)·`jellyWrap jelly` → 9 `u:kb_up`·`jellyWrap` (1~9 키보드 img는 마운트 때와 **같은 노드**, 앞 두 img `u:body`·`u:idle` 불변) → 10 누름 `u:kb_down_0`·`jellyWrap jellyAlt`, 뗌 `u:kb_up`·`jellyWrap` → 11 누름 `u:kb_up`·`jellyWrap jelly`, 뗌 `u:kb_up`·`jellyWrap` → 12 수신 직후·누름·뗌 모두 src `['u:body','u:idle']`(키보드 img 없음), className `jellyWrap` → `jellyWrap jellyAlt` → `jellyWrap`, `textContent` `''`(오류·안내 없음) ⓑ 상태: 상태기계 불변 — `bounceSeq` 1→2→(반복 불변)→3→4→5→6→7(짝 규칙 그대로, 매니페스트 변경으로 초기화 없음), `layer idle` 유지, `config.kbFrames` = `kbDownFrameCount` = 1(전 구간) ⓒ bridge: `getSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor` 각 1회·인자 없음(`assets://changed`는 페이로드로 받음 — 재조회 없음), `onKeyboard`·`onAssetsChanged` 핸들러 등록(keyboard 핸들러가 함수), `setSettings` 0회
- 스펙: `src/overlay/test/keyboardFallback.test.tsx`

### TC-263 · 타자 입력 그림 없이 키보드 모드 실측 — 누를 때 캐릭터가 사라지지 않고 `kb_up` 그대로 출렁 · 종류: 수동(MC-26) · 요구: R-32, R-23, R-24, R-22, R-07 · 설계: design.md §10.13 전체(규칙 표·바운스만·불변), requirements §2 S-15 · **신규(CR-043)**
- Given 실제 앱(CR-043 적용 빌드), `kb_down_*` 0장·`key_space` 등록·`key_enter` 미등록·「펜 손 사용」 꺼짐(MC-26 전제)
- When MC-26 절차 ①~⑥
- Then ⓐ 화면: 누를 때마다 캐릭터가 사라지거나 깜빡이지 않고 `kb_up` 그대로 배경 뺀 전체가 젤리, 꾹 누르면 부르르·떼면 정지, 스페이스는 `key_space`·Enter는 `kb_up`, 「타자 입력 1」 등록 즉시 누름 그림 `kb_down_0`·비우면 즉시 `kb_up` 복귀, 오류·안내 문구 없음 ⓑ 상태: `settings.json` 시작 전과 동일(오버레이 조작으로 바뀌는 값 없음) ⓒ core·bridge: 새 command·event 없음(등록·비움은 설정 창 → `assets://changed`), 로그·콘솔에 오류·입력 정보 출력 없음
- 스펙: 수동 — `src/overlay/test/manual-checklist.md` MC-26

### TC-FLOW-15 · S-15 펜 손을 끈 키보드 모드에서 「타자 입력」 그림 없이 타자 — 사라지지 않고 `kb_up` 그대로 출렁(TC-FLOW 목록에 더한다)
Steps: TC-261 → TC-262 → (환경 전환) TC-263 (v1.7 신규, CR-043)

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-261 | 사용자가 `kb_down` 없이 필수 2장(`kb_up`·`mouse_base`)과 몸통·대기·`key_space`만 등록: `LayerStack`(`penMode false`)·`NO_DOWN` | 누름 중에도 같은 키보드 img가 `kb_up`(레이어 규칙 확인). 렌더 단위 — 다음 Step은 같은 매니페스트를 앱 마운트로 이어 받는다 |
| 2 | TC-262 | Step 1과 같은 등록(`NO_DOWN`)으로 오버레이 앱 시작(T0), 모두 뗌·`bounceSeq 0` | 타자·꾹 누름·특수 키·등록/비움까지 확인. 끝 매니페스트 `NO_DOWN_UP`·모두 뗌·`bounceSeq 7`, 조회 각 1회·`setSettings` 0회 |
| 3 | TC-263(수동) | 환경 전환: 실제 앱·메모장, `kb_down_*` 0장 등록 | 실측으로 사라짐·깜빡임 없음·젤리·부르르·등록 즉시 반영 확인 |

### 추적표 v1.7 추가분(CR-043) — 「## 추적표」의 v1.6 이하 표에 더한다

요구 ↔ TC(추가)

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-32 | 신규 TC-259, TC-260, TC-261, TC-262 / 개정 TC-140 | TC-263(MC-26) |
| R-22(더함 — `kb_down` 없어도 `key_*` 우선, 그림 없는 특수 키는 `kb_up`) | TC-259, TC-261, TC-262, TC-140 | TC-263 |
| R-23·R-24(더함 — 젤리·부르르 불변) | TC-262 | TC-263 |
| R-07(더함 — `kb_down` 1장 이상이면 3·4행 불변, 프레임 수 1) | TC-259, TC-260, TC-262 | TC-263 |
| R-27(더함 — 필수 목록은 R-32가 대체, `kb_down` 없는 등록도 동작) | TC-262 | — |
| R-29(더함 — 펜 모드 분기 불변) | TC-261 | — |

설계 항목 ↔ TC(CR-043)

| 설계 항목 | TC |
|---|---|
| design.md §10.13 판정(현행 미충족 — `undefined` → 투명) | TC-140(개정), TC-259 5행, TC-261, TC-262(현행 red 근거 §0.3 보충) |
| §10.13 개정(반환식 끝 `?? findEntry(manifest,'kb_up')`, 시그니처 불변) | TC-259(`length` 2·같은 참조), TC-140 |
| §10.13 규칙 표 1행 / 2행 / 3행 / 4행 / 5행 / 6행 | TC-259·TC-261 / TC-259·TC-261·TC-262(6단계) / TC-259 / TC-259·TC-262(10단계) / TC-259·TC-261·TC-262(1·3·4·8·11단계)·TC-140 / TC-259·TC-261·TC-262(12단계) |
| §10.13 바운스만(젤리·부르르 불변, 같은 `<img>`·preload된 `kb_up`) | TC-262(1~9단계 클래스·같은 노드), TC-261(같은 노드), TC-263 |
| §10.13 불변(펜 모드·`config.kbFrames`·상태기계·DOM 순서·성능) | TC-261(펜 모드·DOM 순서·같은 노드), TC-260·TC-262 ⓑ(`kbFrames` 1·`bounceSeq` 짝·초기화 없음), 재확인 TC-189~TC-191·TC-253·TC-254 |
| §10.13 대체 읽기(§10.6·functions.md §5.3 5·6행, §10.9.2 필수 목록 → `kb_up`·`mouse_base`) | TC-259, TC-140, TC-262(`kb_down` 없는 등록), 재확인 TC-223~TC-226 |
| §10.13 계약(새 command·event 없음) | TC-262 ⓒ, TC-263 ⓒ |
| §10.13 파일 크기(`LayerStack.tsx` +1줄 — 행위 없음) | TC-259(개정 결과 확인) |
| §10.13 회귀 ① / ② / ③ / ④ | TC-259 / TC-260 / TC-262 / TC-140 개정·v1.7 개정표 재확인 행 |
| RTM R-32 행 · R-27 비고(CR-043) | TC-259~TC-263 · TC-262 |
| requirements §2 S-15 | TC-FLOW-15, TC-262, TC-263 |

상태 전이표(확정사항 §5) ↔ TC(CR-043): 변경 없음 — 상태기계(`reduce`)·설정값 불변. TC-262 ⓑ가 `bounceSeq` 짝·반복(부르르) 전이가 그림 유무와 무관함을 확인한다.

사용자행 ↔ TC-FLOW(추가)

| 사용자행 | TC-FLOW |
|---|---|
| S-15 | TC-FLOW-15 |

CR ↔ TC(추가)

| CR | TC |
|---|---|
| CR-043 | 개정 TC-140 / 재확인 TC-141·TC-144~TC-146·TC-189~TC-191·TC-223~TC-226·TC-230·TC-238~TC-246·TC-248~TC-251·TC-253·TC-254 / 신규 TC-259~TC-263, TC-FLOW-15 / 스펙 `keyboardFallback.test.tsx`(신규)·`specialKey.render.test.tsx`(개정) |

- 수: 자동 +4(TC-259~TC-262), 수동 +1(TC-263 — MC-26). 263번까지 = 유효 243건(자동 218 + 수동 25) + 폐기 20건. TC-FLOW 유효 14건 + 폐기 1건.

## CR-045 뽀모도 타이머 — 고정 레이어·시간 글자·쉬는중 보고 TC (v1.8, 2026-09-26)

- **기준(v1.8 — CR-045)**: `src/overlay/requirements.md` **v2.9** R-33~R-36(🔒 2026-09-26)·§1 용어 주(CR-045)·§2 S-16·S-17·S-18·§3 CR-045 계약 행 / `src/overlay/design.md` **§10.14**(14.1 DOM·`.pomodoro` CSS·격리, 14.2 표시 표 1~5행, 14.3 컴포넌트·`OverlayApp` 변경 ①~④·공용 배치, 14.4 function 11행, 14.5 성능·잔여 위험, 14.6 선행 조건, 14.7 접근성, 14.8 예정 TC ①~⑦)·§2 `[pomo]`·`.jellyWrap` 문단·§4 `timer`·`{snapshot, receivedAt}`·`text`·끝 문단·§6 P-8·§7 CR-045 행·§8·§10.1 pomo 행·RTM R-33~R-36 / `design/functions.md` §5.6 / `design/components.md` §3.x(CR-045 블록) / contract **v0.21**(§3.3 `Settings.timer`·`DEFAULT_TIMER_SETTINGS`, §3.9 `TimerStatus`·`TimerSnapshot`, §5.8 `get_timer`·`set_resting`·`timer://changed` — 래퍼 `getTimer()`·`setResting(resting)`·`onTimerChanged(handler)`, 식 §5.8-2, 구독 순서 §5.8-3, 판정 주체 §5.8-5). **소스 미반영 계약** — 스펙은 계약 래퍼 이름 그대로 mock으로만 쓴다(실제 Tauri API import 없음).
- **v1.8 상태·수(앞 상태·TC 수 줄을 대체)**: CR-045 증분 — 신규 자동 TC-264~TC-289(26), 수동 TC-290(MC-27), TC-FLOW-16(S-16)·TC-FLOW-17(S-17)·TC-FLOW-18(S-18). 기존 TC 기대값 개정 없음(아래 개정표 — mock 보강만). 범위에 R-33~R-36 추가. TC 수: 290번까지 = 유효 270건(자동 244 + 수동 26) + 폐기 20건. TC-FLOW 유효 17건 + 폐기 1건. 작성: ui-test-designer · 모드: 증분(v1.8), 작업 모드 보강(maintain). `src/settings/`(타이머 탭·조정 UI)는 이 문서 범위 밖.
- **공통 전제 보충(v1.8)**
  - 시계: 새 스펙 3개는 `vi.useFakeTimers({ toFake: [setTimeout·clearTimeout·setInterval·clearInterval·Date·**performance**] })` — `nowMs()` = `performance.now()`(design.md 14.4)가 가짜 시계로 움직인다. `receivedAt` 기대값은 그 시점 `performance.now()`를 읽어 비교한다(절대값 가정 없음). 실제 sleep 없음.
  - bridge mock: `bridge/commands`에 `getTimer`·`setResting`, `bridge/events`에 `onTimerChanged`(+ `EVENTS.timerChanged = 'timer://changed'`). core 타이머의 판정(자동 일시정지·재개·사용자 일시정지 유지)은 흉내 내지 않는다 — 테스트가 core가 보냈을 `timer://changed` 페이로드를 직접 넣고, 오버레이 쪽 책임(보고 호출·받은 값 표시)만 단언한다.
  - 렌더 대리 관찰: `findEntry`(`../components/LayerStack`)를 실제 구현을 감싼 spy로 부분 mock — 두 번째 인자가 `'pomo_char'`인 호출 수 = `PomodoroLayer`(와 `isTimerTextVisible`) 실행 횟수. `LayerStack`은 `pomo_*`를 찾지 않으므로 섞이지 않는다.
  - 픽스처: 항목 url = `u:{key}`, 캔버스 900×700, 뽀모도 항목은 매니페스트 **뒤쪽·역순**(`pomo_bubble` → `pomo_char`)에 둔다 — DOM 순서가 설계로 정해지는지 본다. 타이머 설정 `TIMER_OFF` = {enabled false, textPos 268,403, rotation 5, fontSize 36, color `#333333`}(**지역 상수** — CR-045 당시 설계 기본값 리터럴. v2.4(CR-058) 기준으로는 현행 기본값 (268,402)·7°와 다른 「사용자 저장 값 예」일 뿐이며 기대값은 이 픽스처에서 나온다. bridge 상수에 기대지 않음, 상수 자체는 TC-286 ②에서 대조), `TIMER_ON` = 같은 값 + enabled true, `T2` = {true, 100,200, −10, 48, `#ff0000`}. 화면 스펙 `SETTINGS` = `{...DEFAULT_SETTINGS, scale 1, idleSeconds 300, mouse null, timer}`(마우스 파츠 없음 — 레이어·타이머만 본다), 스냅숏 `STOPPED` = {stopped, 0}.
  - jsdom 스타일 표기: `left 268` → `'268px'`, `fontSize 36` → `'36px'`, `color '#333333'` → `'rgb(51, 51, 51)'`, `fontWeight 700` → `'700'`. 전체 필드(`fontFamily`·`fontVariantNumeric`·`userSelect` 등 jsdom이 버릴 수 있는 속성)는 순수 함수 TC-266에서 객체로 단언한다.
- **§0.3 보충 — CR-045 red**: `src/components/utils/timerClock.ts`·`src/components/hooks/useTimerSnapshot.ts`·`useElapsedText.ts`·`src/overlay/components/PomodoroLayer.tsx`·`TimerText.tsx`가 없고 `src/bridge/`에 `TimerSettings`·`TimerSnapshot`·`DEFAULT_TIMER_SETTINGS`·`getTimer`·`setResting`·`onTimerChanged`·`AssetSlot` `pomo_*`가 없으므로 새 스펙 3개는 import 단계에서 전부 red가 정상. 기존 14개 스펙은 mock만 보강했으므로 CR-045 적용 전후 모두 Green이 정상(Red면 mock 누락 또는 회귀).

### v1.8 개정표 — mock 보강·재확인(TC 기대값 불변)

| TC | 스펙 | 처리(CR-045) |
|---|---|---|
| `OverlayApp`을 렌더하는 전 TC | `OverlayApp.test.tsx`·`OverlayApp.{hair,jelly,lock,mouse,pen,penClick,penToggle,retry,scale,shiver,special}.test.tsx`·`handPart.test.tsx`·`keyboardFallback.test.tsx`(14개) | `vi.mock('bridge/commands')`에 `getTimer`·`setResting`(둘 다 `{stopped, 0}`으로 resolve), `vi.mock('bridge/events')`에 `onTimerChanged`(해제 함수로 resolve)를 **일반 함수**로 추가 — `vi.clearAllMocks`·`restoreAllMocks`에 구현이 지워지지 않게. 이 스펙들은 세 래퍼를 관찰하지 않는다. 이유: 구현 뒤 `OverlayApp`이 마운트마다 `setResting(false).catch(…)`를 부르므로 mock에 없으면 `undefined` 호출로 실패 |
| `.canvas` 자식 순서 `[배경, .jellyWrap]` 단언(TC-064·TC-066·TC-101·TC-111·TC-152·TC-157 등) | 위 스펙 | 재확인 — 불변. 기존 픽스처는 `timer` = `DEFAULT_SETTINGS`의 기본(enabled false — contract v0.21 「`DEFAULT_SETTINGS`에 `timer: DEFAULT_TIMER_SETTINGS`」)이고 `pomo_*` 미등록이라 `PomodoroLayer`가 `null`(14.2 1행) |
| `Settings` 픽스처 | 위 스펙 | 재확인 — 모두 `{...DEFAULT_SETTINGS, …}` 상속이라 `timer` 필드가 bridge 기본값으로 채워진다. 리터럴 추가 불필요(design.md 14.6 「빠져 있으면 채운다」 조건 미발생). `mouseMapping.test.ts` TC-025는 `MouseSettings`만 다뤄 무관 |
| 조회 횟수·「bridge 호출 0회」 목록 단언(TC-048·TC-248~TC-251 등) | 위 스펙 | 재확인 — 목록에 새 래퍼가 없어 불변. `getTimer`·`onTimerChanged`는 글자 조건이 거짓이라 호출되지 않는다 |
| `vi.getTimerCount()`·「남은 타이머 0」 단언(TC-053 등) | 위 스펙 | 재확인 — `TimerText`가 마운트되지 않으므로 250ms interval·재시도 타이머가 생기지 않는다 |

### 신규 TC(v1.8)

#### 공용 유틸 — `src/components/utils/timerClock.ts` (스펙 `src/overlay/test/timerClock.test.ts`)

### TC-264 · `formatElapsed` — 설계 예 5개·경계, 비정상 입력 `00:00:00`, 시 자르지 않음 · 종류: 자동 · 요구: R-34, R-36 · 설계: design.md §10.14 14.4 `formatElapsed`·14.8 ①, design/functions.md §5.6 · **신규(CR-045)**
- Given 순수 함수(입력만)
- When `formatElapsed` — 0·999·1 000·59 999·60 000·3 599 999·3 600 000·3 723 000·3 723 999.9·359 999 999·360 000 000, 그리고 −1·−1 000·NaN·+Infinity·−Infinity
- Then ⓐ 화면: 해당 없음(순수 함수 — 표시는 TC-276) ⓑ 반환값: `00:00:00`·`00:00:00`·`00:00:01`·`00:00:59`·`00:01:00`·`00:59:59`·`01:00:00`·`01:02:03`·`01:02:03`·`99:59:59`·`100:00:00`, 비정상 5개 모두 `00:00:00` ⓒ bridge: 호출 없음(bridge는 타입만 import)
- 스펙: `src/overlay/test/timerClock.test.ts`

### TC-265 · `elapsedNow` — running만 경과 더함, 음수 차이 0, 나머지 3상태는 그대로 · 종류: 자동 · 요구: R-34, R-35 · 설계: design.md §10.14 14.4 `elapsedNow`, contract v0.21 §5.8-2 · **신규(CR-045)**
- Given 스냅숏 `{running, 5000}`·`{running, 0}`·`{paused|restPaused|stopped, 61000}`, receivedAt·now 주입
- When `elapsedNow(s, receivedAt, now)` — (running 5000, 1000, 3500) / (running 0, 0, 0) / (running 5000, 1000, 1000) / (running 5000, 1000, 400) / 3상태 × now 999 999·0 / `formatElapsed(elapsedNow({running, 59500}, 0, 500))` / 동결 객체 입력
- Then ⓐ 화면: 해당 없음 ⓑ 반환값: 7 500 / 0 / 5 000 / 5 000(음수 차이 0) / 3상태 모두 61 000(now 무관 — restPaused 멈춤이 R-35의 표시 몫) / `00:01:00` / 동결 입력에 예외 없음·입력 불변 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/timerClock.test.ts`

### TC-266 · `timerTextStyle` — 설계 필드 전부·값 매핑·enabled 무관 · 종류: 자동 · 요구: R-34 · 설계: design.md §10.14 14.4 `timerTextStyle`, requirements R-34(36px·#333333·Segoe UI 굵게·등폭 숫자 — 글자 기본 위치·회전은 CR-058로 (268,402)·7°, 이 TC는 기본값이 아니라 픽스처 값의 매핑만 본다) · **신규(CR-045)**
- Given 동결한 픽스처 `DEF` = {false, 268,403, 5, 36, `#333333`}(스펙 지역 상수 — CR-045 당시 기본값 리터럴, 현행 `DEFAULT_TIMER_SETTINGS`와 무관. v2.4 판정: 유지), `other` = {true, 100,200, −10, 48, `#ff0000`}
- When `timerTextStyle(DEF)`·`timerTextStyle(other)`·`timerTextStyle({...DEF, enabled: true})`
- Then ⓐ 화면: 해당 없음(DOM 적용은 TC-276·TC-279) ⓑ 반환값: `DEF` → 정확히 {position `absolute`, left 268, top 403, transform `translate(-50%, -50%) rotate(5deg)`, transformOrigin `50% 50%`, fontSize 36, color `#333333`, lineHeight 1, whiteSpace `nowrap`, fontFamily `'Segoe UI', 'Malgun Gothic', sans-serif`, fontWeight 700, fontVariantNumeric `tabular-nums`, pointerEvents `none`, userSelect `none`}(14필드) / `other` → left 100·top 200·transform `… rotate(-10deg)`·fontSize 48·color `#ff0000` / enabled만 다른 입력은 같은 결과 / 입력 불변 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/timerClock.test.ts`

### TC-267 · `nowMs` = `performance.now()` 단조 시계 · 종류: 자동 · 요구: R-34 · 설계: design.md §10.14 14.4 `nowMs`(「두 훅은 이 함수로만 시각을 읽는다」) · **신규(CR-045)**
- Given 가짜 시계(`performance` 포함)
- When `nowMs()` → 1 234ms 진행 → `nowMs()`
- Then ⓐ 화면: 해당 없음 ⓑ 반환값: 숫자, 매번 `performance.now()`와 같음, 차이 = 1 234 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/timerClock.test.ts`

#### 공용 훅·컴포넌트 — `useTimerSnapshot`·`useElapsedText`·`TimerText`·`PomodoroLayer` (스펙 `src/overlay/test/pomodoro.test.tsx`)

### TC-268 · `useTimerSnapshot` — 초기값 → 구독 완료 뒤 조회 1회 → 응답 반영(receivedAt = nowMs) · 종류: 자동 · 요구: R-34, R-36 · 설계: design.md §10.14 14.4 `useTimerSnapshot` ①②③④·14.8 ②, §4 `{snapshot, receivedAt}` 초기값, §6 P-8 ①, §7 `get_timer`·`timer://changed` 행, contract v0.21 §5.8-3 · **신규(CR-045)**
- Given `onTimerChanged`가 미완료 promise를 돌려줌, `getTimer`도 미완료 promise
- When `renderHook(useTimerSnapshot)` → 구독 완료 → 1 500ms 진행 → 조회 응답 `{running, 12000}`
- Then ⓐ 화면: 해당 없음(훅 — 표시는 TC-276) ⓑ 상태(v1.9 개정 — CR-050 `fromEvent` 포함 전체 객체 `toEqual`): 첫 값 `{snapshot: {stopped, 0}, receivedAt: 0, fromEvent: false}`, 응답 뒤 `{snapshot: {running, 12000}, receivedAt: 응답 시점 performance.now(), fromEvent: false}`(조회 결과) ⓒ bridge: 구독 완료 전 `getTimer` 0회·`onTimerChanged` 1회(인자 = 함수), 완료 뒤 `getTimer` 1회·인자 없음, 호출 순서 구독 → 조회(`invocationCallOrder`), `setResting` 0회
- 스펙: `src/overlay/test/pomodoro.test.tsx`

### TC-269 · `useTimerSnapshot` — 조회 전에 온 이벤트가 이김, 이후 이벤트는 매번 교체 · 종류: 자동 · 요구: R-34, R-35 · 설계: design.md §10.14 14.4 `useTimerSnapshot` ④(`!eventSeen`), §6 P-8 ③ · **신규(CR-045)**
- Given `getTimer` 미완료, 마운트·구독 완료
- When 500ms 뒤 이벤트 `{paused, 3000}` → 조회 응답 `{running, 1000}` → 700ms 뒤 이벤트 `{running, 3000}`
- Then ⓐ 화면: 해당 없음 ⓑ 상태(v1.9 개정 — CR-050 `fromEvent` 포함 전체 객체 `toEqual`): 이벤트 뒤 `{snapshot: {paused, 3000}, receivedAt: 그 시점, fromEvent: true}`, 늦은 조회 응답 뒤에도 같은 값(버림), 다음 이벤트 뒤 `{snapshot: {running, 3000}, receivedAt: 갱신 시점, fromEvent: true}` ⓒ bridge: `getTimer` 1회·`onTimerChanged` 1회(재조회·재구독 없음)
- 스펙: `src/overlay/test/pomodoro.test.tsx`

### TC-270 · `useTimerSnapshot` — 조회 실패 재시도(200·500·1000ms) 소진 시 초기값 유지 / 재시도 성공 · 종류: 자동 · 요구: R-36, R-34 · 설계: design.md §10.14 14.4 `useTimerSnapshot` 예외, §6 P-8 오류, §7 `get_timer` 행(`fetchWithRetry`) · **신규(CR-045)**
- Given ① `getTimer` 항상 reject(`state.poisoned`) ② 1회 reject 뒤 `{paused, 5000}` resolve
- When ① 마운트 → 199·1·500·1 000·10 000ms 진행 → 이벤트 `{running, 0}` ② 마운트 → 200ms → 5 000ms 진행
- Then ⓐ 화면: 해당 없음(문구 없음 — R-01) ⓑ 상태: ① (v1.9 개정 — CR-050 `fromEvent` 포함 전체 객체 `toEqual`) 재시도 소진 뒤 끝까지 `{snapshot: {stopped, 0}, receivedAt: 0, fromEvent: false}`, 이어진 이벤트는 반영(snapshot `{running, 0}`) ② 200ms 뒤 snapshot `{paused, 5000}`(개정 없음 — snapshot만 단언) ⓒ bridge: ① `getTimer` 누계 1 → 1(199ms) → 2(200ms) → 3(700ms) → 4(1 700ms) → 4(이후 멈춤) ② 2회에서 멈춤
- 스펙: `src/overlay/test/pomodoro.test.tsx`(`TC-270 ①`·`TC-270 ②`)

### TC-271 · `useTimerSnapshot` — 구독 실패여도 조회 1회로 값을 받음 · 종류: 자동 · 요구: R-34, R-36 · 설계: design.md §10.14 14.4 `useTimerSnapshot` ④(「구독 성공·실패 모두」)·예외(「구독 실패 → 조회만」), §6 P-8 오류 · **신규(CR-045)**
- Given `onTimerChanged` reject, `getTimer` → `{running, 42000}`
- When 마운트 → 10 000ms 진행
- Then ⓐ 화면: 해당 없음 ⓑ 상태: `{running, 42000}` ⓒ bridge: `onTimerChanged` 1회·`getTimer` 1회, 10초 뒤에도 각 1회(재구독·주기 조회 없음)
- 스펙: `src/overlay/test/pomodoro.test.tsx`

### TC-272 · `useTimerSnapshot` — 언마운트 정리(해제·재시도 취소·늦은 구독 즉시 해제) · 종류: 자동 · 요구: R-34 · 설계: design.md §10.14 14.4 `useTimerSnapshot` ③⑤(cleanup: `cancelled`·`unlisten`·`cancelFetch`) · **신규(CR-045)**
- Given ① 정상 구독 ② `getTimer` 항상 reject(재시도 대기 중) ③ 구독 promise 미완료
- When ① 언마운트 ② 첫 실패 뒤 언마운트 → 5 000ms 진행 ③ 언마운트 → 구독 완료
- Then ⓐ 화면: 해당 없음 ⓑ 상태: 언마운트 뒤 갱신 없음 ⓒ bridge: ① 해제 함수 1회 ② `getTimer` 1회에서 멈춤(재시도 취소)·해제 1회 ③ 완료 전 해제 0회 → 완료 즉시 1회. (③에서 언마운트 뒤 조회를 시작하는지는 설계가 정하지 않아 단언하지 않는다 — 보고서 「설계 확인 필요」)
- 스펙: `src/overlay/test/pomodoro.test.tsx`(`TC-272 ①②`·`TC-272 ③`)

### TC-273 · `useElapsedText` — running: interval 1개, 초가 바뀔 때만 다시 그림 · 종류: 자동 · 요구: R-34 · 설계: design.md §10.14 14.4 `useElapsedText`(250ms·`lastRef`)·14.5, §4 `text`, §6 P-8 ② · **신규(CR-045)**
- Given 스냅숏 `{running, 0}`, receivedAt = 시작 시점, 렌더 횟수 계수기
- When 999ms → 1ms → 2 000ms 진행
- Then ⓐ 화면(반환 문자열): `00:00:00` → `00:00:00` → `00:00:01` → `00:00:03` ⓑ 상태: 가짜 타이머 1개, 렌더 횟수 = 시작 +0(999ms, interval 3회 발화) → +1 → +3(초당 1회) ⓒ bridge: 없음(훅은 bridge를 부르지 않음)
- 스펙: `src/overlay/test/pomodoro.test.tsx`

### TC-274 · `useElapsedText` — paused·restPaused·stopped는 interval 없음·값 고정 · 종류: 자동 · 요구: R-34, R-35 · 설계: design.md §10.14 14.4 `useElapsedText` ②, §6 P-8 ② · **신규(CR-045)**
- Given `{paused, 3723000}`·`{restPaused, 61000}`·`{stopped, 0}`
- When 각각 마운트 → 10 000ms 진행 → 언마운트
- Then ⓐ 반환 문자열: `01:02:03`·`00:01:01`·`00:00:00`, 10초 뒤에도 같음 ⓑ 상태: 가짜 타이머 0개 ⓒ bridge: 없음
- 스펙: `src/overlay/test/pomodoro.test.tsx`

### TC-275 · `useElapsedText` — 스냅숏 교체 즉시 반영·interval 전환·언마운트 정리 · 종류: 자동 · 요구: R-34, R-35 · 설계: design.md §10.14 14.4 `useElapsedText` 효과 ①~③(deps `[snapshot, receivedAt]`) · **신규(CR-045)**
- Given `{running, 10000}`로 마운트
- When 2 000ms → `{paused, 15000}` → 5 000ms → `{running, 15000}` → 1 000ms → `{stopped, 0}` → `{running, 0}` → 언마운트
- Then ⓐ 반환 문자열: `00:00:12` → 즉시 `00:00:15` → `00:00:15` → `00:00:16` → 즉시 `00:00:00` ⓑ 상태: 타이머 수 1 → 0 → 0 → 1 → 0 → 1 → 언마운트 뒤 0 ⓒ bridge: 없음
- 스펙: `src/overlay/test/pomodoro.test.tsx`

### TC-276 · `TimerText` — div·aria-hidden·스타일·시간 흐름·멈춤 · 종류: 자동 · 요구: R-34, R-36, R-35 · 설계: design.md §10.14 14.3 `TimerText`·14.4 `TimerText` 렌더·14.7, §8 `TimerText` 행 · **신규(CR-045)**
- Given `timer` = `TIMER_ON`, `getTimer` → `{stopped, 0}`
- When 렌더 → 구독·조회 완료 → 이벤트 `{running, 59000}` → 1 000ms → 이벤트 `{restPaused, 61000}` → 5 000ms
- Then ⓐ 화면: 자식 1개 `div`, class 속성 없음, `aria-hidden="true"`, role·`aria-live` 없음, 글자 `00:00:00` → `00:00:59` → `00:01:00` → `00:01:01` → `00:01:01`, style position `absolute`·left `268px`·top `403px`·transform `translate(-50%, -50%) rotate(5deg)`·font-size `36px`·color `rgb(51, 51, 51)`·white-space `nowrap`·font-weight `700` ⓑ 상태: 받은 스냅숏대로(훅 상태는 `TimerText` 안) ⓒ bridge: `onTimerChanged` 1회 → `getTimer` 1회, `setResting` 0회(보고는 `OverlayApp` 몫)
- 스펙: `src/overlay/test/pomodoro.test.tsx`

### TC-277 · `isTimerTextVisible` — U-1 = enabled 또는 뽀모도 그림 ≥1장 · 종류: 자동 · 요구: R-34 · 설계: design.md §10.14 14.2(U-1)·14.4 `isTimerTextVisible`, requirements R-34 결정(🔒) · **신규(CR-045)**
- Given 매니페스트 `M_NONE`(몸통·대기·kb_up)·`M_CHAR`·`M_BUBBLE`·`M_BOTH`·`EMPTY`(canvas null), `TIMER_OFF`·`TIMER_ON`
- When 8조합 호출
- Then ⓐ 화면: 해당 없음 ⓑ 반환값: (OFF, NONE) false · (ON, NONE) true · (OFF, CHAR) true · (OFF, BUBBLE) true · (OFF, BOTH) true · (ON, BOTH) true · (OFF, EMPTY) false · (ON, EMPTY) true — 뽀모도 외 슬롯은 조건에 들지 않음 ⓒ bridge: `getTimer` 0회
- 스펙: `src/overlay/test/pomodoro.test.tsx`

### TC-278 · `PomodoroLayer` — 표시 표 1~5행·순서 인물 → 말풍선 → 글자·img 속성 · 종류: 자동 · 요구: R-33, R-34 · 설계: design.md §10.14 14.2 표 1~5행·14.3 `PomodoroLayer`(`findEntry` 재사용·`<img className=layer alt="" draggable=false>`)·14.1 격리·14.7, §8(alt="") · **신규(CR-045)**
- Given 행별 (timer, manifest): 1 (OFF, NONE) · 2 (ON, NONE) · 3 (OFF, CHAR) · 4 (OFF, BUBBLE) · 5 (ON, BOTH — 매니페스트 역순)
- When 각 행 렌더 → 구독 완료 → 언마운트
- Then ⓐ 화면: 1 → 빈 컨테이너(`null`) / 2~5 → 루트 1개 `div.pomodoro`(className 정확히 `pomodoro`), 자식 = 2 [글자] · 3 [`u:pomo_char`, 글자] · 4 [`u:pomo_bubble`, 글자] · 5 [`u:pomo_char`, `u:pomo_bubble`, 글자], 모든 img class `layer`·alt `""`·draggable `false`·style 없음, 글자 `aria-hidden="true"`·`00:00:00`, 루트 안 `.jelly`·`.jellyAlt`·`.shiver`·`.jellyWrap` 0개 ⓑ 상태: 타이머 상태·입력과 무관(props만) ⓒ bridge: 1행 `onTimerChanged` 0회, 2~5행 각 1회(글자가 있을 때만 구독), `setResting` 0회
- 스펙: `src/overlay/test/pomodoro.test.tsx`

### TC-279 · `PomodoroLayer` — 글자 스타일 = timer, 교체 시 같은 노드에 반영, 그림 있으면 꺼도 글자 유지 · 종류: 자동 · 요구: R-34 · 설계: design.md §10.14 14.4 `timerTextStyle`·`PomodoroLayer` 렌더, §6 P-8 ⑤, §10.1 pomo 행 · **신규(CR-045)**
- Given `M_BOTH`·`TIMER_ON`으로 렌더, 글자 노드 참조
- When `timer` → `T2` → `{...T2, enabled: false}`
- Then ⓐ 화면: 처음 left `268px`·top `403px`·font-size `36px`·color `rgb(51, 51, 51)`·`rotate(5deg)` → T2 left `100px`·top `200px`·`48px`·`rgb(255, 0, 0)`·`rotate(-10deg)`, 끈 뒤에도 글자 있음(`00:00:00`), 글자 노드 내내 같음 ⓑ 상태: 멈춘 값 유지(스냅숏 불변) ⓒ bridge: `onTimerChanged` 1회·`getTimer` 1회(스타일 교체로 재구독 없음)
- 스펙: `src/overlay/test/pomodoro.test.tsx`

### TC-280 · `PomodoroLayer` — `React.memo`, 초 갱신은 `TimerText`만, 새 참조면 다시 그림 · 종류: 자동 · 요구: R-33, R-34 · 설계: design.md §10.14 14.4 `PomodoroLayer` 렌더(memo 기본 비교)·14.5 리렌더 경계, §4 `timer`(참조 안정) · **신규(CR-045)**
- Given `M_BOTH`·`TIMER_ON`으로 렌더, `pomo_char` 조회 수 c1 기록
- When 같은 참조로 rerender → 이벤트 `{running, 0}` → 3 000ms → 값 같은 새 `timer` 객체 → 새 `manifest` 객체
- Then ⓐ 화면: 글자 `00:00:03`, `.pomodoro`·글자 노드 내내 같음 ⓑ 상태: `$$typeof` = `react.memo`, `pomo_char` 조회 수 = c1(같은 참조) → c1(3초 흐름 — `PomodoroLayer` 재실행 없음) → c1 초과(새 timer) → 더 증가(새 manifest) ⓒ bridge: `onTimerChanged` 1회·`getTimer` 1회(재렌더로 재구독 없음)
- 스펙: `src/overlay/test/pomodoro.test.tsx`

### TC-281 · `PomodoroLayer` — 글자 조건 참일 때만 `TimerText` 마운트(구독·조회), 거짓이면 언마운트(해제) · 종류: 자동 · 요구: R-34, R-33 · 설계: design.md §10.14 14.2·14.3(`showText && <TimerText/>`), §6 P-8 ①(「글자 조건 참일 때만」) · **신규(CR-045)**
- Given `M_NONE`·`TIMER_OFF`
- When `TIMER_ON` → `TIMER_OFF` → `M_CHAR`·`TIMER_OFF`
- Then ⓐ 화면: 빈 컨테이너 → [글자] → 빈 컨테이너 → [`u:pomo_char`, 글자] ⓑ 상태: 다시 마운트된 글자는 초기값 `00:00:00`부터 ⓒ bridge: 처음 `onTimerChanged`·`getTimer` 0회 → 각 1회 → 해제 함수 1회 → 각 2회
- 스펙: `src/overlay/test/pomodoro.test.tsx`

#### 화면 통합 — `OverlayApp` (스펙 `src/overlay/test/OverlayApp.pomodoro.test.tsx`)

### TC-282 · `.canvas` 자식 순서 [배경, `.pomodoro`, `.jellyWrap`], 조회·구독·마운트 보고 · 종류: 자동 · 요구: R-33, R-34, R-36, R-35, R-17 · 설계: design.md §10.14 14.1 DOM·14.3 `OverlayApp` 변경 ①②③·14.8 ⑤, §2 `[pomo]`·`.jellyWrap` 문단, §6 P-1·P-8 ①④, §10.1 pomo 행 · **신규(CR-045)**
- Given ① `SETTINGS`(timer ON)·`M_BOTH` ② timer OFF·`M_NONE` ③ timer OFF·배경 없음 + `pomo_char`만
- When 마운트(T0)
- Then ⓐ 화면: ① `.canvas` 자식 `[u:background, pomodoro, jellyWrap]`, `.pomodoro` 자식 `[u:pomo_char, u:pomo_bubble, 글자]`, 글자 `00:00:00`, `.pomodoro`의 `.jellyWrap` 조상 없음·`.jellyWrap` 안에 `pomo` 없음 ② `[u:background, jellyWrap]`, `.pomodoro` 없음, 화면 글자 `''` ③ `[pomodoro, jellyWrap]`, `.pomodoro` 자식 `[u:pomo_char, 글자]`·`00:00:00` ⓑ 상태: 스냅숏 초기 `stopped`·0(R-36) ⓒ bridge: ① `getSettings`·`getAssetManifest`·`getMonitors`·`getHandAnchor` 각 1회, `onTimerChanged` 1회 → `getTimer` 1회(인자 없음, 순서 구독 → 조회), `setResting` 인자 목록 `[false]`, `setSettings` 0회 ② `onTimerChanged`·`getTimer` 0회, `setResting` `[false]`(타이머 on/off 무관)
- 스펙: `src/overlay/test/OverlayApp.pomodoro.test.tsx`(`TC-282 ①②③`)

### TC-283 · 격리 — 젤리·부르르·이동·클릭·쉬는중에도 뽀모도는 같은 노드·같은 속성 · 종류: 자동 · 요구: R-33, R-23, R-24, R-05 · 설계: design.md §10.14 14.1 격리 규칙·14.2 끝 문단, §10.3 · **신규(CR-045)**
- Given ① 조건, `.pomodoro`·자식 노드와 `outerHTML` 기록
- When 키 누름 → 반복 누름 → 뗌 → 이동 → 클릭 누름·뗌 → 301 000ms(쉬는중)
- Then ⓐ 화면: `.jellyWrap` className `jellyWrap jellyAlt` → `jellyWrap shiver` → `jellyWrap`, 상태 img `u:rest`, 매 단계 `.pomodoro` = 처음 노드·className `pomodoro`·자식 노드·`outerHTML` 불변·안에 `.jelly`/`.jellyAlt`/`.shiver` 0개·`.canvas` 둘째 자식 ⓑ 상태: 상태기계 전이는 기존대로(뽀모도는 입력을 받지 않음) ⓒ bridge: `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.pomodoro.test.tsx`

### TC-284 · 쉬는중 보고 — 마운트 false, idle→rest true, rest→idle false, 같은 layer 지속엔 호출 없음 · 종류: 자동 · 요구: R-35, R-05 · 설계: design.md §10.14 14.4 쉬는중 보고 효과(deps `[machine.layer]`)·14.8 ⑤, §6 P-8 ④, contract v0.21 §5.8-5 · **신규(CR-045)**
- Given timer OFF·`M_NONE`(글자 없음 — 타이머와 무관하게 보내는지 확인), T0 마운트
- When 1 000ms → 키 누름·뗌·이동 → 299 000ms → 2 000ms(쉬는중) → 60 000ms → 키 누름(깨어남) → 뗌·1 000ms → 301 000ms(쉬는중) → 이동(깨어남) → 301 000ms(쉬는중) → 클릭 누름(깨어남) → 뗌
- Then ⓐ 화면: 상태 img `u:rest` / `u:idle`이 전이대로 ⓑ 상태: `machine.layer` 전이 idle → rest → idle → rest → idle → rest → idle ⓒ bridge: `setResting` 인자 목록 `[false]`(입력·tick 중 불변) → `[false, true]`(60초 지속에도 불변) → `[…, false]` → 뗌·tick 불변 → `[…, true]` → `[…, false]` → `[…, true, false]`, 합계 7회, `onTimerChanged`·`getTimer`·`setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.pomodoro.test.tsx`

### TC-285 · 쉬는중 보고 실패는 무시 — 문구·재시도 없음, 다음 전이 때 다시 보냄 · 종류: 자동 · 요구: R-35, R-01 · 설계: design.md §10.14 14.4 쉬는중 보고 효과 예외(`.catch(() => undefined)`), §6 P-8 오류 · **신규(CR-045)**
- Given `setResting` 항상 reject, timer OFF·`M_NONE`
- When 마운트 → 5 000ms → 300 000ms(쉬는중) → 5 000ms → 키 누름
- Then ⓐ 화면: `.canvas` 있음, 화면 글자 `''`(오류 문구 없음), 상태 img `u:rest` → `u:idle` ⓑ 상태: 상태기계 전이 정상(보고 실패가 전이를 막지 않음) ⓒ bridge: `setResting` `[false]`(5초 뒤에도 1회 — 재시도 없음) → `[false, true]`(5초 뒤에도 2회) → `[false, true, false]`, 처리되지 않은 rejection 없음
- 스펙: `src/overlay/test/OverlayApp.pomodoro.test.tsx`

### TC-286 · 설정·이미지 변경 즉시 반영, `timer` 없는 설정 = 기본값 · 종류: 자동 · 요구: R-34, R-33, R-39(② `alarmVolume` 기본 44) · 설계: design.md §10.14 14.2·14.3 ②, §4 `timer`(`settings.timer ?? DEFAULT_TIMER_SETTINGS` — 초기값 contract v0.27 §3.3), §6 P-6·P-8 ⑤, §7 `Settings.timer`·`AssetSlot` `pomo_*` 행, §10.15 15.7 TC-286 행 · **신규(CR-045)** · **개정(CR-050·CR-053·CR-058 — ② 기본값 리터럴)**
- Given ① timer OFF·`M_NONE` ② 설정 객체에 `timer` 키 없음·`M_CHAR`
- When ① `settings://changed`(ON) → (T2) → `assets://changed`(`M_BOTH`) → `settings://changed`(T2 + enabled false) → `assets://changed`(`M_NONE`) ② 마운트 → `assets://changed`(`M_NONE`)
- Then ⓐ 화면: ① 없음 → [글자 `00:00:00`] → 같은 글자 노드에 left `100px`·top `200px`·`48px`·`rgb(255, 0, 0)`·`rotate(-10deg)` → [`u:pomo_char`, `u:pomo_bubble`, 같은 글자] → 글자 유지 → `.pomodoro` 없음·`.canvas` `[u:background, jellyWrap]` ② 글자 `00:00:00`·left `268px`·top `402px`·`36px`·`rgb(51, 51, 51)`·transform `translate(-50%, -50%) rotate(7deg)` → 그림 비우면 `.pomodoro` 없음(기본 enabled false) ⓑ 상태: ② (v2.4 개정 — CR-058, contract v0.27 §3.3 8필드) `DEFAULT_TIMER_SETTINGS` = `{ enabled: false, mode: 'stopwatch', countdownSecs: 1500, alarmVolume: 44, textPos: { x: 268, y: 402 }, rotation: 7, fontSize: 36, color: '#333333' }`(전체 객체 `toEqual`. 이력: v1.9 CR-050 80·(268,403)·5 → v2.2 CR-053 80·(142,458)·9 → v2.4 CR-058 44·(268,402)·7) ⓒ bridge: ① `onTimerChanged`·`getTimer` 각 1회, 마지막에 해제 함수 1회, `getSettings`·`getAssetManifest` 각 1회(재조회 없음) ①② `setSettings` 0회(오버레이는 timer를 저장하지 않음)
- 스펙: `src/overlay/test/OverlayApp.pomodoro.test.tsx`(`TC-286 ①②`)

### TC-287 · 시간 표시 통합 — 시작 00:00:00 → 흐름 → 쉬는중 멈춤 → 재개 → 사용자 일시정지 유지 → 끔 · 종류: 자동 · 요구: R-34, R-35, R-36 · 설계: design.md §10.14 14.4 `useElapsedText`·쉬는중 보고 효과, §4 끝 문단(core 소유·저장 안 함), §6 P-8 ①~⑤, requirements §1 용어 주(CR-045) · **신규(CR-045)**
- Given ① 조건(timer ON·`M_BOTH`), `getTimer` → `{stopped, 0}`, T0 마운트, `Storage.prototype.setItem` 감시
- When 5 000ms → 이벤트 `{running, 0}` → 1 000ms → 294 100ms(쉬는중 진입) → 이벤트 `{restPaused, 295100}`(core 응답 흉내) → 60 000ms → 키 누름·뗌 → 이벤트 `{running, 295100}` → 5 000ms → 이벤트 `{paused, 300100}`(사용자 일시정지) → 301 000ms(쉬는중) → 키 누름·뗌(core 무응답) → 10 000ms → 이벤트 `{running, 300100}` → 2 000ms → `settings://changed`(timer OFF) → 이벤트 `{paused, 302100}` → 10 000ms
- Then ⓐ 화면(글자): `00:00:00` → 5초 뒤에도 `00:00:00`(자동 시작 없음) → `00:00:00` → `00:00:01` → `00:04:55`(상태 img `u:rest`) → 60초 뒤 `00:04:55` → `00:05:00` → 입력 뒤 10초에도 `00:05:00` → `00:05:02` → 끈 뒤 10초에도 `00:05:02`(그림이 있어 글자 유지, 같은 노드) ⓑ 상태: 오버레이는 받은 스냅숏만 표시 — 경과를 스스로 멈추거나 저장하지 않음 ⓒ bridge: `setResting` 인자 목록 `[false]` → `[false, true]` → `[false, true, false]` → `[…, true]` → `[…, false]`(5회), `getTimer` 1회·`onTimerChanged` 1회, `setSettings` 0회, `localStorage.setItem` 0회
- 스펙: `src/overlay/test/OverlayApp.pomodoro.test.tsx`

### TC-288 · 성능 경계 — 초 갱신·입력·tick으로 `PomodoroLayer`·`.jellyWrap` 다시 그리지 않음 · 종류: 자동 · 요구: R-33, R-34 · 설계: design.md §10.14 14.5(리렌더 경계)·14.3(`TimerText` 안 훅 상태), §4 `timer` 참조 안정, 전제 TC-164(tick은 바뀐 것이 없으면 같은 참조) · **신규(CR-045)**
- Given ① 조건, 이벤트 `{running, 0}`, `pomo_char` 조회 수 c0·`findEntry` 전체 호출 수·`.jellyWrap` 노드와 `outerHTML` 기록
- When 3 000ms(초 갱신 3회) → 키 누름·뗌·이동·클릭 누름·뗌 → 1 000ms → `settings://changed`(값 같은 새 timer 객체)
- Then ⓐ 화면: 글자 `00:00:03`, 3초 동안 `.jellyWrap` 같은 노드·`outerHTML` 불변, 글자 노드 내내 같음 ⓑ 상태: 3초 동안 `pomo_char` 조회 수 = c0·`findEntry` 전체 호출 수 불변(`OverlayApp` 자식 재렌더 없음), 입력 뒤에도 c0(memo 유지), 새 timer 참조 뒤 c0 초과 ⓒ bridge: `onTimerChanged`·`getTimer` 각 1회(`TimerText` 재마운트 없음), `setResting` `[false]`(깨어 있는 동안 입력으로 추가 호출 없음)
- 스펙: `src/overlay/test/OverlayApp.pomodoro.test.tsx`

### TC-289 · 정적 확인 — `.pomodoro` CSS 6선언, `OverlayApp` 흐름 주석·400줄, 새 파일 경계 규칙 · 종류: 자동 · 요구: R-33, R-34, R-36 · 설계: design.md §10.14 14.1 `.pomodoro` CSS(애니메이션·transform 없음)·14.3 `OverlayApp` 변경 ④·예상 +10줄(400줄 한계)·공용 배치·14.4 `useTimerSnapshot`(「`useBridgeEvent`는 쓰지 않는다」), §4 끝 문단(localStorage 등 저장 안 함), ui-design-strategy §5(Tauri API 직접 import 금지) · **신규(CR-045)**
- Given `fs.readFileSync`로 `overlay.module.css`·`index.tsx`·새 파일 5개 원문(주석 제거 후 CSS 파싱)
- When `.pomodoro { … }` 선언 파싱, 원문 검사
- Then ⓐ 화면: 해당 없음(정적) ⓑ 상태(원문): `.pomodoro` 선언 = 정확히 {position absolute, left 0, top 0, width 100%, height 100%, pointer-events none}, `.pomodoro` 규칙에 `animation`·`transform` 없음, `index.tsx`에 `PomodoroLayer`와 `//!` 주석 속 `PomodoroLayer`, 400줄 이하, 새 파일 5개(`PomodoroLayer.tsx`·`TimerText.tsx`·`useTimerSnapshot.ts`·`useElapsedText.ts`·`timerClock.ts`)에 `@tauri-apps/api`·`localStorage` 없음·각 400줄 이하, `useTimerSnapshot.ts`에 `useBridgeEvent` 없음 ⓒ bridge: 화면·훅 코드가 래퍼 밖 Tauri API를 쓰지 않음(원문으로 확인)
- 스펙: `src/overlay/test/pomodoro.test.tsx`

### TC-290 · 뽀모도 실측 — 고정·흐름·자동 일시정지·재개·사용자 일시정지·끔·배율·재시작 · 종류: 수동(MC-27) · 요구: R-33, R-34, R-35, R-36, R-01, R-03, R-23, R-24 · 설계: design.md §10.14 전체(14.5 잔여 위험 관찰 포함)·14.8 ⑦, requirements §2 S-16·S-17·S-18 · **신규(CR-045)**
- Given 실제 앱(CR-045 적용 빌드 — core·bridge·설정 창 타이머 탭 포함), 뽀모도 그림 없음·타이머 꺼짐으로 시작
- When MC-27 절차 ①~⑪
- Then ⓐ 화면: 그림·글자 없음(S-18) → 등록하면 배경 위·본체 뒤 인물 → 말풍선 + `00:00:00`(꺼져 있어도 보임) → 타자·꾹 누름에도 뽀모도는 고정 → 시작하면 1초마다 증가 → 쉬는중 진입 순간 멈춤·입력하면 이어서 → 사용자 일시정지는 입력해도 멈춤 → 끄면 멈춘 값 유지 → 배율에 맞춰 함께 커지고 작아짐 → 재시작 `00:00:00` 대기, 오류·안내 문구 없음 ⓑ 상태: `settings.json`의 `timer`(위치·회전·크기·색·enabled)는 유지, 경과 시간 키 없음 ⓒ core·bridge: `set_resting`은 쉬는중 진입·해제 때만(판정은 core), 새 권한·로그 오류 없음, 트레이 숨김 중 판정 지연은 관찰만(비고)
- 스펙: 수동 — `src/overlay/test/manual-checklist.md` MC-27

### TC-FLOW-16 · S-16 공부 시간을 재며 방송 — 뽀모도 인물 말풍선 안 시간이 0부터 흐르고, 타자로 본체가 출렁여도 뽀모도는 그대로, 새로 켜면 00:00:00(TC-FLOW 목록에 더한다)
Steps: TC-278 → TC-282 → TC-287 → TC-283 → TC-286 → (환경 전환) TC-290 (v1.8 신규, CR-045)

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-278 | 사용자가 인물·말풍선을 등록하고 타이머를 켬: `PomodoroLayer`(ON, `M_BOTH`) | 인물 → 말풍선 → 글자 `00:00:00`(렌더 단위 — 다음 Step은 같은 등록을 앱 마운트로 받는다) |
| 2 | TC-282 ① | 같은 등록으로 오버레이 시작(T0) | `.canvas` [배경, `.pomodoro`, `.jellyWrap`], 구독 → 조회 1회, `setResting` `[false]` |
| 3 | TC-287 | Step 2 화면(조회 결과 `stopped`·0) | 시작 00:00:00 → 흐름 → (Step 끝) 끈 뒤 멈춘 값 `00:05:02`, 저장 없음 |
| 4 | TC-283 | 연결: 같은 등록으로 새 마운트(TC-287 종료 뒤 타이머 상태는 core가 다시 알려 준다 — 이 Step은 입력 격리만 본다) | 젤리·부르르·쉬는중에도 뽀모도 불변 |
| 5 | TC-286 ① | 연결: 타이머 끔·그림 없음 새 마운트 | 설정·이미지 변경 즉시 반영 → 마지막에 `.pomodoro` 없음 |
| 6 | TC-290(수동) | 환경 전환: 실제 앱 | 실측으로 고정·흐름·재시작 00:00:00 확인 |

### TC-FLOW-17 · S-17 자리를 비우면 시간이 저절로 멈추고 돌아오면 이어서, 직접 일시정지했으면 입력해도 멈춤(TC-FLOW 목록에 더한다)
Steps: TC-268 → TC-284 → TC-287 → TC-285 → (환경 전환) TC-290 (v1.8 신규, CR-045)

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-268 | 글자 표시 중 스냅숏 받기(구독 → 조회) | `{running, 12000}`·receivedAt 기록(훅 단위 — 다음 Step은 앱 마운트) |
| 2 | TC-284 | 오버레이 시작(T0), 입력 없음 | 쉬는중 진입·해제마다 `setResting(true/false)`, 합계 7회, 같은 layer 지속엔 호출 없음 |
| 3 | TC-287 | 연결: 타이머 켬·그림 있음 새 마운트 | core 응답(restPaused → running)으로 멈춤·재개, 사용자 paused는 입력해도 `00:05:00` 유지 |
| 4 | TC-285 | 연결: 보고 실패 환경 새 마운트 | 실패해도 전이·다음 보고 계속, 문구 없음 |
| 5 | TC-290(수동) | 환경 전환: 실제 앱, 유휴 1분 | 자동 일시정지·재개·사용자 일시정지 유지 실측 |

### TC-FLOW-18 · S-18 처음 설치 — 그림도 없고 타이머도 꺼져 있으면 00:00:00이 뜨지 않고, 켜거나 그림을 넣으면 나타남(TC-FLOW 목록에 더한다)
Steps: TC-277 → TC-282 ② → TC-286 ① → TC-281 → (환경 전환) TC-290 (v1.8 신규, CR-045)

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-277 | 조건 함수: (OFF, 그림 없음) | false, 켜거나 그림 1장이면 true |
| 2 | TC-282 ② | 처음 설치 상태(timer OFF·그림 없음)로 오버레이 시작 | `.pomodoro` 없음, 글자 없음, 타이머 조회·구독 없음 |
| 3 | TC-286 ① | Step 2와 같은 시작 | 켜면 글자 등장 → 그림 넣으면 인물·말풍선 추가 → 비우고 끄면 사라짐 |
| 4 | TC-281 | 컴포넌트 단위 재확인: 조건 참/거짓 전환 | 참일 때만 구독·조회, 거짓이면 해제 |
| 5 | TC-290(수동) | 환경 전환: 실제 앱 첫 실행 | ① 글자 없음 → ② 등록하면 나타남 |

### 추적표 v1.8 추가분(CR-045) — 「## 추적표」의 v1.7 이하 표에 더한다

요구 ↔ TC(추가)

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-33 | TC-278, TC-280, TC-281, TC-282, TC-283, TC-286, TC-288, TC-289 | TC-290(MC-27) |
| R-34 | TC-264~TC-282, TC-286~TC-289 | TC-290 |
| R-35 | TC-265, TC-269, TC-274, TC-275, TC-276, TC-282, TC-284, TC-285, TC-287 | TC-290 |
| R-36 | TC-264, TC-268, TC-270, TC-271, TC-276, TC-282, TC-287, TC-289 | TC-290 |
| R-01(더함 — 오류 문구 없음) | TC-270, TC-285 | TC-290 |
| R-05(더함 — 전이 불변, 보고 시점) | TC-283, TC-284 | — |
| R-17·R-23·R-24(더함 — 배경 첫 자식, 젤리·부르르 격리) | TC-282, TC-283 | TC-290 |
| R-03(더함 — 배율에 함께 커짐) | — (`.canvas` `scale` 공유는 DOM 자리 TC-282로 간접) | TC-290 |

설계 항목 ↔ TC(CR-045)

| 설계 항목 | TC |
|---|---|
| design.md §10.14 14.1 DOM 자리(`.canvas` 직계, 배경 다음·`.jellyWrap` 앞, 안 순서) / §2 `[pomo]`·`.jellyWrap` 문단 | TC-282 ①②③, TC-278 |
| 14.1 `.pomodoro` CSS | TC-289 |
| 14.1 격리 규칙(애니메이션 클래스 없음·`.jellyWrap` 밖) | TC-283, TC-278, TC-282 ① |
| 14.2 표시 표 1 / 2 / 3 / 4 / 5행 · 끝 문단(상태·입력 무관) | TC-277·TC-278·TC-282 ② / TC-278·TC-281·TC-286 ① / TC-278·TC-282 ③·TC-286 ② / TC-278 / TC-278·TC-282 ① · TC-283·TC-287 |
| 14.3 `PomodoroLayer`(props 2개·`findEntry` 재사용·img 속성·`null`·memo) | TC-278, TC-280, TC-281 |
| 14.3 `TimerText`(훅 2개·`timerTextStyle`·`aria-hidden`·클래스 없음) | TC-276 |
| 14.3 공용 3파일 배치(`useTimerSnapshot`·`useElapsedText`·`timerClock`) | TC-264~TC-275, TC-289 |
| 14.3 `OverlayApp` 변경 ① import / ② 자리·`settings.timer ?? DEFAULT_TIMER_SETTINGS` / ③ 쉬는중 보고 효과 / ④ 흐름 주석·줄 수 | TC-282 ① / TC-282·TC-286 ② / TC-284·TC-285 / TC-289 |
| 14.4 `nowMs` · `elapsedNow` · `formatElapsed` · `timerTextStyle` | TC-267 · TC-265 · TC-264 · TC-266·TC-276·TC-279 |
| 14.4 `useTimerSnapshot` ①② 초기값·apply / ③ 구독 / ④ 조회·`!eventSeen` / ⑤ cleanup / 예외 | TC-268 / TC-268 / TC-268·TC-269 / TC-272 / TC-270·TC-271 |
| 14.4 `useElapsedText`(즉시 반영·running만 interval·바뀔 때만 setText·정리) | TC-273, TC-274, TC-275 |
| 14.4 `isTimerTextVisible` · `PomodoroLayer` 렌더 · `TimerText` 렌더 · 쉬는중 보고 효과 | TC-277 · TC-278·TC-280 · TC-276 · TC-284·TC-285 |
| 14.5 성능(초 갱신 = `TimerText`만, memo·참조 안정, `OverlayApp`·`.jellyWrap` 불변) / 잔여 위험(트레이 숨김) | TC-280, TC-288 / TC-290 ⑪(관찰) |
| 14.6 계약·선행 조건(mock 보강·픽스처 `timer`) | v1.8 개정표, TC-286 ② |
| 14.7 접근성(`aria-hidden`·`aria-live` 없음·새 문구 없음) / §8 라벨 행 / §9 | TC-276, TC-278 |
| 14.8 ① / ② / ③ / ④ / ⑤ / ⑥ / ⑦ | TC-264~TC-267 / TC-268~TC-272 / TC-273~TC-276 / TC-277~TC-281 / TC-282~TC-288 / v1.8 개정표(기존 14 스펙 mock 보강·재확인) / TC-290 |
| §4 `timer` · `{snapshot, receivedAt}` · `text` 초기값 · 끝 문단(core 소유·저장 안 함) | TC-286 ② · TC-268 · TC-273·TC-276 · TC-287(`setSettings`·`localStorage` 0)·TC-289 |
| §6 P-8 ① / ② / ③ / ④ / ⑤ / 오류 | TC-268·TC-276·TC-281·TC-282 / TC-273·TC-274 / TC-269·TC-287 / TC-284 / TC-286 / TC-270·TC-271·TC-285 |
| §7 `get_timer` · `set_resting` · `timer://changed` · `Settings.timer` · `AssetSlot` `pomo_*` 행 | TC-268·TC-270 · TC-284·TC-285 · TC-269·TC-276 · TC-286 · TC-278·TC-282 |
| §10.1 pomo 행 | TC-278, TC-279, TC-282, TC-283 |
| RTM R-33 · R-34 · R-35 · R-36 행 | 위 요구 ↔ TC 표 |
| requirements §2 S-16 · S-17 · S-18 | TC-FLOW-16 · TC-FLOW-17 · TC-FLOW-18 |

상태 전이표(확정사항 §5) ↔ TC(CR-045): 변경 없음 — `src/state/inputMachine.ts` 불변(design.md 14.4). TC-284가 기존 전이(행2 「5분 무입력」 → 쉬는중, 쉬는중에서 입력 3종 → 대기)가 일어나는 순간마다 `setResting` 보고가 한 번씩 나가는지를 확인한다.

사용자행 ↔ TC-FLOW(추가)

| 사용자행 | TC-FLOW |
|---|---|
| S-16 | TC-FLOW-16 |
| S-17 | TC-FLOW-17 |
| S-18 | TC-FLOW-18 |

CR ↔ TC(추가)

| CR | TC |
|---|---|
| CR-045 | mock 보강(기대 불변) 14개 스펙 — v1.8 개정표 / 신규 TC-264~TC-290, TC-FLOW-16~18 / 스펙 `timerClock.test.ts`·`pomodoro.test.tsx`·`OverlayApp.pomodoro.test.tsx`(신규) / 수동 MC-27 |

- 수: 자동 +26(TC-264~TC-289), 수동 +1(TC-290 — MC-27). 290번까지 = 유효 270건(자동 244 + 수동 26) + 폐기 20건. TC-FLOW 유효 17건 + 폐기 1건.

## CR-050 타이머 모드 — 카운트다운 표시·끝남 깜빡임·알림음 TC (v1.9, 2026-09-26)

- **기준(v1.9 — CR-050)**: `src/overlay/requirements.md` R-37·R-38·R-39(🔒 2026-09-26, 사용자 결정 CR-048)·§1 용어 주(CR-050)·§2 S-19·S-20·§3 CR-050 계약 행 / `src/overlay/design.md` **§10.15**(15.1 표시 규칙 표 1~8행·깜빡임 CSS·JS 타이머 없음, 15.2 알림음 판정표 1~7행·재생 순서·실패 알림 순서·반복 없음, 15.3 배치 결정, 15.3a 접근성, 15.4 성능, 15.5 계약·선행 조건, 15.6 스파이크, 15.7 TC 계획)·§4 `text`(개정)·`fromEvent`·깜빡임 여부·`prevStatusRef`·`stopRef`·`genRef`·`gainRef` 행·§6 P-9·§7 CR-050 행(`TimerSnapshot`·`TimerSettings` 확장, `get_alarm_sound`, `set_resting` 의미 확장)·RTM R-37~R-39 / `design/functions.md` §5.7 ①~⑥ / `design/components.md` §3.y·규칙 9·`TimerText.module.css` 전문 / contract v0.23 §3.3·§3.9·§3.10·§5 / 인계 패킷 `doc/200_설계/architecture/timer-mode-03-packet-ui.md` §0·§5.
- **v1.9 상태·수(앞 상태·TC 수 줄을 대체)**: CR-050 증분 — 신규 자동 TC-291~TC-309(19) + TC-313(1 — v1.9a 검증 반영 추가, 번호가 수동 TC-310~TC-312 뒤), 수동 TC-310~TC-312(3 — MC-28~MC-30), TC-FLOW-19(S-19)·TC-FLOW-20(S-20). 개정 TC-286 ②(기본값 리터럴)·TC-268·TC-269·TC-270 ①(상태 단언에 `fromEvent`). mock 보강 16개 스펙(아래 개정표). 범위에 R-37~R-39 추가. TC 수: 313번까지 = 유효 293건(자동 264 + 수동 29) + 폐기 20건. TC-FLOW 유효 19건 + 폐기 1건. 작성: ui-test-designer · 모드: 증분(v1.9), 작업 모드 보강(maintain). 설정 창(시간 입력·알림음 카드·미리 듣기·미리보기 깜빡임)은 이 문서 범위 밖.
- **공통 전제 보충(v1.9)**
  - Audio: `vi.stubGlobal('Audio', FakeAudio)`(스펙마다 인라인) — 인스턴스별 `src`·`volume`·`loop`·`currentTime` 기록, `play`(모드 resolve / reject(`NotAllowedError`) / pending(나중에 `rejectPlay`) / throw(동기 예외)), `pause`, `addEventListener`·`removeEventListener`(`error`, `once` 준수), `fire('error')`, `new Audio` 예외 플래그. 실제 소리 없음. `afterEach`에서 `vi.unstubAllGlobals()`.
  - 내장 기본음(v2.4 개정 — CR-058): `defaultAlarmUrl()`은 번들 mp3 자산(`src/assets/sounds/default-alarm.mp3`) import URL 문자열을 그대로 돌려준다(design/functions.md §5.7 ④). TC-298은 스펙이 같은 자산(`@/assets/sounds/default-alarm.mp3`)을 import한 값과 비교하고, 모듈 재적재(`vi.resetModules()`)는 쓰지 않는다.
  - `useAlarmOnFinish` 단위(TC-300~TC-305): `renderHook(({ s, g }) => useAlarmOnFinish(s, g))`에 `useTimerSnapshot` 반환 모양 `{ snapshot, receivedAt, fromEvent }`를 직접 넣는다(단계마다 새 스냅숏 객체). `defaultAlarmUrl`은 실제 `alarmSound` 모듈을 감싼 부분 mock(`'blob:default'` 고정, `playSound`는 실제 구현). `'blob:default'`는 기본음 경로를 구분하는 mock 반환 식별 문자열일 뿐이다(실제 반환은 번들 mp3 자산 URL — CR-058). 음량 0.8은 `setup`이 넘기는 `gain` 인자(픽스처 — `alarmGain` 기본값과 무관). microtask는 `act` 안에서 `Promise.resolve` 20회로 비운다.
  - CSS Modules: `vi.mock('../components/TimerText.module.css')` → `{ blink: 'blink' }`. CSS 값은 `fs.readFileSync` 원문으로 단언(TC-289와 같은 방식 — 설계 15.7의 `?raw`와 같은 목적).
  - 픽스처: 카운트다운 스냅숏 `cd(status, elapsedMs)` = `{ status, elapsedMs, mode: 'countdown', durationMs: 1 500 000 }`(contract v0.23 §3.9 — core가 늘 보내는 모양), 등록 알림음 `USER` = `{ format 'mp3', bytes 1 000, url 'u:alarm' }`, 설정 `CD_ON` = {enabled true, mode `countdown`, countdownSecs 1 500, alarmVolume 80, 268,403, 5, 36, `#333333`}. 화면 스펙 매니페스트 `M_NONE`(뽀모도 그림 없음 — U-1 `enabled`로 글자만)·`M_BOTH`.
  - core 흉내 없음: 0 도달 판정·10초 뒤 `stopped` 복귀·쉬는중 무시는 core다. 테스트는 core가 보냈을 `timer://changed`(`finished` → `stopped`)를 직접 넣고, 오버레이 책임(표시·깜빡임 클래스·소리 시작/정지·bridge 호출)만 단언한다.
  - 새 import 경로(설계 이름 그대로 — 구현자가 맞춘다): `src/overlay/hooks/useAlarmOnFinish.ts` named `useAlarmOnFinish`, `src/components/utils/alarmSound.ts` named `DEFAULT_ALARM_VOLUME`·`defaultAlarmUrl`·`alarmGain`·`playSound`(v2.4 — CR-058로 `BEEP_*` 상수 7개·`synthBeepWav` 삭제), `timerClock.ts` named `snapshotMode`·`timerDisplayMs`·`formatRemaining`·`timerText`·`isTimerBlinking`, 타입 `TimerSnapshotState`(`useTimerSnapshot.ts`).
- **§0.3 보충 — CR-050 red**: `alarmSound.ts`·`useAlarmOnFinish.ts`·`TimerText.module.css`가 없고 `timerClock.ts`에 CR-050 함수 5개가 없으며 `useTimerSnapshot`이 `fromEvent`를 채우지 않으므로 다음은 red가 정상 — `timerClock.test.ts`(import 실패로 기존 TC-264~TC-267 포함 파일 전체), `useElapsedText.countdown.test.tsx`, `alarmSound.test.ts`, `useAlarmOnFinish.test.ts`, `TimerText.blink.test.tsx`, `OverlayApp.timerMode.test.tsx`, `pomodoro.test.tsx`의 TC-268·TC-269·TC-270 ①·TC-306. TC-286 ②는 bridge가 이미 v0.23이라 **개정 뒤 곧바로 Green**이 정상(개정 전 기대가 실패하던 것을 바로잡음). mock만 보강한 기존 스펙은 CR-050 적용 전후 모두 Green이 정상(Red면 mock 누락 또는 회귀).

### v1.9 개정표

| TC | 스펙 | 처리(CR-050) |
|---|---|---|
| TC-286 ② | `OverlayApp.pomodoro.test.tsx`(356행) | ⓑ 기대 리터럴 개정: `DEFAULT_TIMER_SETTINGS` = `{ enabled: false, mode: 'stopwatch', countdownSecs: 1500, alarmVolume: 80, textPos: { x: 268, y: 403 }, rotation: 5, fontSize: 36, color: '#333333' }`(contract v0.23, design.md §10.15 15.7). ⓐ(글자 268px·403px·36px·`rgb(51, 51, 51)`·`rotate(5deg)`)·ⓒ 불변 |
| TC-268 · TC-269 · TC-270 ① | `pomodoro.test.tsx` | ⓑ 상태 단언에 `fromEvent` 추가 — TC-268 초기값·조회 응답 뒤 `false`, TC-269 두 이벤트 뒤 `true`, TC-270 ① 재시도 소진 뒤 초기값 `{…, fromEvent: false}`. 훅이 항상 채우므로(design/functions.md §5.7 ③) 전체 객체 `toEqual` 기대가 바뀐다. ⓐ·ⓒ(호출 횟수·순서) 불변 |
| TC-276 · TC-278~TC-281 | `pomodoro.test.tsx` | 재확인 — 불변. `TimerText`가 `useAlarmOnFinish`를 부르지만 이 스펙은 `finished`를 흘리지 않아 `getAlarmSound` 미호출·`class` 속성 없음 유지(§5.7 ⑥) |
| TC-284(쉬는중 보고) | `OverlayApp.pomodoro.test.tsx` | 재확인 — 불변. 카운트다운에서 `set_resting`은 core가 무시하지만 오버레이 보고 규칙은 그대로(design.md §10.15 15.1 셋째 항목, requirements §1 용어 주 CR-050) |
| `OverlayApp`·`TimerText`를 렌더하는 전 TC | `OverlayApp.test.tsx`·`OverlayApp.{hair,jelly,lock,mouse,pen,penClick,penToggle,retry,scale,shiver,special}.test.tsx`·`handPart.test.tsx`·`keyboardFallback.test.tsx`(14) + `OverlayApp.pomodoro.test.tsx`·`pomodoro.test.tsx`(2) | `vi.mock('bridge/commands')`에 `getAlarmSound: () => Promise.resolve(null)`(일반 함수 — CR-045 선례·BRG-006, `clearAllMocks`에 지워지지 않음) 추가. 관찰하지 않는다. 기대 불변 |
| 빈 mock `vi.mock('bridge/commands', () => ({}))` | `BackgroundLayer`·`layers`·`MouseArm`·`penClick`·`PenHand`·`penLayers`·`penToggle`·`specialKey.render`(8) | 추가하지 않음 — `TimerText`를 렌더하지 않고 command를 하나도 선언하지 않는 단위 스펙(CR-045 때도 `getTimer` 미추가). 기대 불변 |

### 신규 TC(v1.9)

#### 공용 유틸 — `src/components/utils/timerClock.ts` 추가 함수 (스펙 `src/overlay/test/timerClock.test.ts`)

### TC-291 · `snapshotMode` — `mode` 없음 = 스톱워치 · 종류: 자동 · 요구: R-37 · 설계: design/functions.md §5.7 ① `snapshotMode`, contract v0.23 §3.9(없으면 `'stopwatch'`) · **신규(CR-050)**
- Given 순수 함수. 스냅숏 `{stopped, 0}`·`{running, 12000}`(mode 없음), `cd(running, 0)`·`cd(finished, 1 500 000)`, `{running, 0, stopwatch, 0}`, 동결한 `cd(paused, 1)`
- When `snapshotMode(s)`
- Then ⓐ 화면: 해당 없음(표시는 TC-295·TC-307) ⓑ 반환값: mode 없음 2개 → `'stopwatch'`, countdown 2개 → `'countdown'`, stopwatch → `'stopwatch'`, 동결 입력에 예외 없음·입력 불변 ⓒ bridge: 호출 없음(타입만 import)
- 스펙: `src/overlay/test/timerClock.test.ts`

### TC-292 · `timerDisplayMs` — 카운트다운 남은 시간(0 미만 0)·스톱워치 = `elapsedNow` · 종류: 자동 · 요구: R-37, R-38 · 설계: §5.7 ① `timerDisplayMs`, design.md §10.15 15.1 표 3~8행 · **신규(CR-050)**
- Given 순수 함수, receivedAt·now 주입
- When 카운트다운 `(running 1 000, 0, 0)` · `(running 1 000, 0, 500)` · `(running 0, 2 000, 2 001)` · `(running 1 499 000, 0, 5 000)` · `(running 0, durationMs 없음, 0, 1 000)` · `(stopped 0)` · `(paused 600 000)` · `(finished 1 500 000)` / 스톱워치·mode 없음 `running 5 000` × (1 000, 3 500)·(1 000, 400)·(0, 0) / mode 없음 `paused 61 000`
- Then ⓐ 화면: 해당 없음 ⓑ 반환값: 1 499 000 / 1 498 500(받은 뒤 흐른 500ms 차감) / 1 499 999 / 0(음수 → 0) / 0(`durationMs` 없음 = 0) / 1 500 000 / 900 000 / 0(finished) / 스톱워치·mode 없음은 같은 인자의 `elapsedNow`와 같음(7 500 등) / 61 000 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/timerClock.test.ts`

### TC-293 · `formatRemaining` — 올림 표기 예 7개·비정상 입력·시 자르지 않음 · 종류: 자동 · 요구: R-37 · 설계: §5.7 ① `formatRemaining`(예 목록), requirements R-37(시작 00:25:00·0 도달 00:00:00·음수·NaN 00:00:00) · **신규(CR-050)**
- Given 순수 함수
- When `formatRemaining` — 1 500 000·1 499 001·1 499 000·1·0·359 999 000·360 000 000, −1·−1 000·NaN·±Infinity, 대조로 `formatElapsed(1 499 001)`·`formatElapsed(1)`
- Then ⓐ 화면: 해당 없음 ⓑ 반환값: `00:25:00`·`00:25:00`·`00:24:59`·`00:00:01`·`00:00:00`·`99:59:59`·`100:00:00`, 비정상 5개 모두 `00:00:00`, `formatElapsed`는 불변(내림 — `00:24:59`·`00:00:00`) ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/timerClock.test.ts`

### TC-294 · `timerText` 모드 분기(15.1 표 1~8행) · `isTimerBlinking` · 종류: 자동 · 요구: R-37, R-38, R-34 · 설계: §5.7 ① `timerText`·`isTimerBlinking`, design.md §10.15 15.1 표 1~8행·1행 주(초기값 = 스톱워치 표기) · **신규(CR-050)**
- Given 순수 함수
- When ① `timerText(s, receivedAt, now)` — receivedAt은 모두 0, now는 인자별(스펙과 같음): 1행 `{stopped,0}`(mode 없음) now 0 / 2행 `sw(running,12000)` now 0 / 스톱워치 내림 `{running,999}`(mode 없음) now 0 · `sw(running,0)` now 1 000 / 3행 `cd(stopped,0)` now 0 / 4행 `cd(running,1000)` now 0 / 5행 `cd(running,0)` now 1 / 6행 `cd(paused,600000)` now 999 999 / 7행 `cd(running,1499000)` now 5 000 / 8행 `cd(finished,1500000)` now 999 999 ② `isTimerBlinking` — 5개 status × (카운트다운·mode 없음)
- Then ⓐ 화면: 해당 없음(DOM은 TC-296·TC-307) ⓑ 반환값: ① `00:00:00` / `00:00:12` / `00:00:00`·`00:00:01` / `00:25:00` / `00:24:59` / `00:25:00` / `00:15:00` / `00:00:00` / `00:00:00` ② `finished`만 `true`(모드 무관), 나머지 4개 `false` ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/timerClock.test.ts`(`TC-294 ①`·`TC-294 ②`)

#### 공용 훅 — `useElapsedText` 카운트다운 (스펙 `src/overlay/test/useElapsedText.countdown.test.tsx`)

### TC-295 · `useElapsedText` 카운트다운 — 초 경계마다 1회, `finished`는 interval 없음, 스톱워치 불변 · 종류: 자동 · 요구: R-37, R-38 · 설계: §5.7 ②(계산식만 `timerText`, 반환 `string` 유지), design.md §10.15 15.1 표 interval 열·15.3(반환형 유지)·15.4(새 interval 없음) · **신규(CR-050)**
- Given 가짜 시계(`performance` 포함), `receivedAt` = 렌더 시점 `performance.now()`
- When ① `cd(running, 0)` → 999ms → 1ms → 2 000ms ② `cd(finished, 1 500 000)` → 10 000ms ③ `cd(stopped, 0)`·`cd(paused, 600 000)` 각각 → 10 000ms ④ `cd(running, 1 499 500)` → 500ms → 3 000ms ⑤ `cd(running, 1 498 000)` → `finished` → `cd(stopped, 0)` → `cd(running, 0)` → 언마운트 ⑥ mode 없음·`stopwatch` `running 0` → 999ms → 1ms, `sw(paused, 12 000)`
- Then ⓐ 화면(반환 글자): ① `typeof` string, `00:25:00` → `00:25:00` → `00:24:59` → `00:24:57` ② `00:00:00` 유지 ③ `00:25:00`·`00:15:00` 고정 ④ `00:00:01` → `00:00:00` → `00:00:00`(0으로 자름) ⑤ `00:00:02` → `00:00:00` → `00:25:00` ⑥ `00:00:00` → `00:00:00` → `00:00:01`(내림 불변), `00:00:12` ⓑ 상태(렌더·타이머): ① interval 1개, 999ms까지 렌더 증가 0, 1초 경계 +1, 3초 +3 ② `vi.getTimerCount()` 0, 10초 동안 렌더 증가 0 ③ 타이머 0 ④ 0에 닿은 뒤 렌더 증가 0·interval 1개(core `finished` 전까지 유지) ⑤ interval 1 → 0 → 0 → 1 → 언마운트 0 ⓒ bridge: 호출 없음(훅은 스냅숏을 인자로 받는다 — bridge 모듈은 빈 mock)
- 스펙: `src/overlay/test/useElapsedText.countdown.test.tsx`(`TC-295 ①`~`⑥`)

#### 오버레이 — `TimerText` 끝남 깜빡임 (스펙 `src/overlay/test/TimerText.blink.test.tsx`)

### TC-296 · `finished` 동안만 글자에 `.blink`, 뽀모도 격리, CSS 원문 · 종류: 자동 · 요구: R-38 · 설계: design.md §10.15 15.1(깜빡임 규칙·JS 타이머 없음·transform 없음)·15.3a, §4 깜빡임 여부, design/functions.md §5.7 ⑥, design/components.md §3.y `TimerText`·`TimerText.module.css` 전문·규칙 9 · **신규(CR-050)**
- Given ①② `<TimerText timer={CD_ON} />`, `getTimer` → ① `cd(stopped, 0)` ② `cd(finished, 1 500 000)`, `getAlarmSound` → `USER`, Audio 스텁(관찰 안 함) ③ `<PomodoroLayer manifest={M_BOTH} timer={CD_ON} />` ④ `src/overlay/components/TimerText.module.css` 원문(주석 제거)
- When ① 이벤트 `cd(running,0)` → `cd(paused,600000)` → `cd(finished,…)` → `cd(stopped,0)` → `{restPaused, 61000}` → `cd(finished,…)` → `cd(running,0)` ② 마운트 → 10 000ms ③ 이벤트 `cd(finished,…)` ④ `.blink` 선언·keyframes 파싱
- Then ⓐ 화면: ① 같은 `<div>`에서 글자 `00:25:00` → `00:25:00` → `00:15:00` → `00:00:00`·class `blink` → `00:25:00`·class 속성 없음 → `00:01:01`·없음 → `00:00:00`·`blink` → `00:25:00`·없음, 매 단계 `aria-hidden="true"`·`transform` `translate(-50%, -50%) rotate(5deg)` 유지, `[aria-live]`·`[role]` 없음 ② `00:00:00`·`blink`, 10초 뒤에도 `blink`(오버레이가 스스로 끄지 않음) ③ `.blink` 요소 1개 = `.pomodoro`의 마지막 자식 `<div>`(글자), `.pomodoro` className `pomodoro`만, 인물·말풍선 img className `layer`만, `.jelly`·`.jellyAlt`·`.shiver`·`.jellyWrap` 0개 ⓑ 상태·원문: ② `vi.getTimerCount()` 0(JS 타이머 없음) ④ `.blink` 선언 = 정확히 [`animation: timerBlink 1s infinite`], `@keyframes timerBlink`에 `0%, 49.9% { opacity: 1 }`·`50%, 100% { opacity: 0 }`, 파일에 `transform` 없음 ⓒ bridge: ① `onTimerChanged`·`getTimer` 각 1회(구독·조회 1개 — 15.3)
- 스펙: `src/overlay/test/TimerText.blink.test.tsx`(`TC-296 ①`~`④`)

#### 공용 유틸 — `src/components/utils/alarmSound.ts` (스펙 `src/overlay/test/alarmSound.test.ts`)

### TC-297 · `DEFAULT_ALARM_VOLUME` — 기본 음량 상수 44 · 종류: 자동 · 요구: R-39(「음량 기본 44%」) · 설계: design/functions.md §5.7 ④ 상수(`DEFAULT_ALARM_VOLUME = DEFAULT_TIMER_SETTINGS.alarmVolume ?? 44` — CR-061 단일 소스), design.md §10.15 15.3 「내장 기본음 = 번들 mp3 자산(CR-058)」 행·15.7 TC-297 행 · **신규(CR-050)** · **개정(CR-058 — 옛 `synthBeepWav` WAV 바이트 검증은 합성음 폐기로 대상 없음 → 기본 음량 상수 확인)**
- Given 순수 상수(Audio 스텁만 설치)
- When `DEFAULT_ALARM_VOLUME` 읽기
- Then ⓐ 화면: 해당 없음 ⓑ 값·부작용: `DEFAULT_ALARM_VOLUME` === `44`(옛 80 — CR-058), `Audio` 생성 0개(상수 — 부작용 없음) ⓒ bridge: 호출 없음(`alarmSound`는 bridge의 상수·타입만 import — 런타임 command·event 없음)
- 참고: 「= `DEFAULT_TIMER_SETTINGS.alarmVolume`」(CR-061 단일 소스) 동일성 자체는 이 스펙이 단언하지 않는다 — 값 44는 TC-286 ② ⓑ(`DEFAULT_TIMER_SETTINGS.alarmVolume` 44)와 이 TC가 각각 확인한다(CR-061 「TC 신규 없음」)
- 스펙: `src/overlay/test/alarmSound.test.ts`(`TC-297`)

### TC-298 · `defaultAlarmUrl` — 번들 mp3 자산 URL 그대로, 반복 호출 같은 값 · 종류: 자동 · 요구: R-39(「내장 기본음 = 번들 mp3」) · 설계: design/functions.md §5.7 ④ `defaultAlarmUrl`(`() => string` — 번들 자산 `defaultAlarmAsset` 반환, Blob·`URL.createObjectURL` 없음), design.md §10.15 15.4(기본음 = 번들 정적 자산 URL, 런타임 생성물 없음)·15.7 TC-298 행 · **신규(CR-050)** · **개정(CR-058 — 창당 Blob URL 캐시 → 번들 mp3 자산 URL)**
- Given 스펙이 `@/assets/sounds/default-alarm.mp3`를 import한 값 `defaultAlarmAsset`(vitest 정적 자산 import — URL 문자열), Audio 스텁
- When `defaultAlarmUrl()` 두 번
- Then ⓐ 화면: 해당 없음 ⓑ 반환값·부작용: 첫 반환 = `defaultAlarmAsset`과 같은 문자열, 두 번째 반환 = 첫 반환과 같은 문자열, `Audio` 생성 0개 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/alarmSound.test.ts`(`TC-298`)

### TC-299 · `playSound` 음량 자르기·정지·실패 알림(최대 1회·항상 비동기·정지 뒤 없음) / `alarmGain` · 종류: 자동 · 요구: R-39, R-01 · 설계: §5.7 ④ `playSound`·`alarmGain`(예: 없음·NaN → 0.44), design.md §10.15 15.2 실패 알림 순서 · **신규(CR-050)** · **개정(CR-058 — ⑤ 폴백 0.8 → 0.44)**
- Given Audio 스텁(모드 지정), `onFail` = `vi.fn()`
- When ① `playSound('u:a', v)` v ∈ {1.5, −0.2, NaN, 0.8}(4번째 인자 `loop` 생략), **CR-052** `playSound('u:loop', 0.8, undefined, true)` → `currentTime` 7.5 → 정지 함수, `playSound('u:once', 0.8, undefined, false)`, `playSound('u:b', 0.5)` → `currentTime` 3.2 → `stop()` 두 번 ② reject 모드 / pending 모드에서 `error` 이벤트 + 거부 / `onFail` 없이 reject ③ pending → `stop()` → 거부·`error` ④ throw 모드 / `new Audio` 예외 / throw 모드 직후 `stop()` ⑤ `alarmGain` — 기준 픽스처 {enabled true, 268,403, 5, 36, `#333333`}(스펙 지역 리터럴 — `alarmVolume` 키 없음)에 `alarmVolume` 없음·80·0·150·−5·NaN
- Then ⓐ 화면: 해당 없음(오버레이 문구 없음 — R-01) ⓑ 반환값·부작용: ① `Audio` 1개씩(`src` `u:a`), `volume` 1·0·0·0.8, `play` 각 1회, `loop` false(인자 생략 = 기본 false — 1회 재생, 설정 창 미리 듣기와 같음), **CR-052** `u:loop` → `loop` true·`play` 1회, 반복 중 정지 함수 → `pause` 1회·`currentTime` 0 / `u:once`(명시 false) → `loop` false / 누계 `Audio` 6개 뒤 `u:b`, `stop()` → `pause` 1회·`currentTime` 0, 두 번째 `stop()` 예외 없음 ② 호출 직후 `onFail` 0회 → microtask 뒤 1회 / 겹쳐도 1회 / 예외 없음 ③ `onFail` 0회, `removeEventListener('error', 함수)` 호출 ④ `playSound`가 던지지 않고 정지 함수를 반환, 반환 시점 `onFail` 0회 → microtask 뒤 1회(두 경우 모두), 예외 직후 `stop()`이면 0회 ⑤ **0.44**·0.8·0·1·0·**0.44**(소수 10자리 근사 — 없음·NaN은 `DEFAULT_ALARM_VOLUME` 44 폴백, v2.4 CR-058 개정. 옛 0.8), `Audio` 생성 0개 ⓒ bridge: 호출 없음
- 스펙: `src/overlay/test/alarmSound.test.ts`(`TC-299 ①`~`⑤`)

#### 오버레이 훅 — `src/overlay/hooks/useAlarmOnFinish.ts` (스펙 `src/overlay/test/useAlarmOnFinish.test.ts`)

### TC-300 · 판정표 3·4행 — `finished` 진입 이벤트에 1회 재생 시작(음량 0.8, CR-055 — CR-052 반복 재생 폐기), 렌더 없음 · 종류: 자동 · 요구: R-39(원문 「1회 재생(반복 없음)」) · 설계: design.md §10.15 15.2 표 3행(「1회 재생 시작(CR-055)」)·4행·1회 재생 규칙(CR-055 — CR-052 「10초 동안 반복」 폐기)·15.3(ref만), §4 ref 4종, §5.7 ⑤ 효과 2 ⓑ·`start()`, §7 `get_alarm_sound` 행 · **신규(CR-050)** · **개정(CR-055 — `loop` true → false)**
- Given `getAlarmSound` → `USER`, Audio 스텁(resolve), gain 0.8, 렌더 카운터
- When ① 마운트 `stopped`(fromEvent false) → `running`(이벤트) → `finished`(이벤트) ② 마운트 `stopped`(이벤트)·`paused`(이벤트) 각각 → `finished`(이벤트), 마운트 자체가 `finished`(이벤트, prev `null`)
- Then ⓐ 화면: 해당 없음(훅 — DOM은 TC-307) ⓑ 상태·부작용: ① `Audio` 1개(`src` `u:alarm`)·`volume` 0.8·`play` 1회·`loop` **false**(CR-055 — 1회 재생, R-39 「반복 없음」 복귀. CR-052의 true 폐기)·`pause` 0회, `finished` 단계 렌더 증가 = rerender 1회분뿐(훅이 state를 바꾸지 않음), `defaultAlarmUrl` 0회 ② 세 경우 모두 `Audio` 1개씩·`play` 1회씩(누계 3) ⓒ bridge: ① `running`까지 `getAlarmSound` 0회, `finished` 뒤 1회·인자 없음 ② 누계 3회
- 스펙: `src/overlay/test/useAlarmOnFinish.test.ts`(`TC-300 ①`·`TC-300 ②`)

### TC-301 · 판정표 1·2·5행 — 첫 조회 결과 `finished`는 울리지 않음, 재수신도 0회 · 종류: 자동 · 요구: R-39 · 설계: design.md §10.15 15.2 표 1·2·5행, §5.7 ⑤ 효과 2 ⓒ, requirements R-39(첫 조회 결과가 이미 `finished`면 울리지 않음) · **신규(CR-050)**
- Given `getAlarmSound` → `USER`, Audio 스텁
- When 마운트 `stopped`(fromEvent false) → `finished`(fromEvent false — 첫 `getTimer` 결과) → `finished`(fromEvent true — 같은 끝남의 이벤트 재수신)
- Then ⓐ 화면: 해당 없음(깜빡임은 TC-296 ②·TC-308 ②) ⓑ 상태·부작용: 세 단계 모두 `Audio` 0개 ⓒ bridge: `getAlarmSound` 0회
- 스펙: `src/overlay/test/useAlarmOnFinish.test.ts`

### TC-302 · 판정표 6·7행 — `finished`를 떠나면·언마운트하면 소리 정지 · 종류: 자동 · 요구: R-39 · 설계: design.md §10.15 15.2 표 6·7행·1회 재생 규칙(CR-055 — 1회 재생이라도 재생 중 `finished`를 떠나면 `halt()`), §5.7 ⑤ `halt()`·효과 2 ⓐ·효과 3, requirements R-39(10초 종료·멈춤·시작·끄기 때 정지) · **신규(CR-050)** · **개정(CR-055 — ① `loop` true → false)**
- Given `getAlarmSound` → `USER`, Audio 스텁
- When ① `running` → `finished` → (`currentTime` 4.5) → `stopped` → `running` → `finished`(다음 회차) ② `running` → `finished` → `running`(끝남 중 시작) ③ `running` → `finished` → 언마운트
- Then ⓐ 화면: 해당 없음 ⓑ 부작용: ① 첫 `Audio`(**`loop` false — CR-055, 1회 재생 중**) `pause` 1회·`currentTime` 0, 새 `Audio` 없음 → 다음 회차에 `Audio` 1개 더(누계 2, `play` 1회·`loop` false), 첫 `Audio` `pause`는 여전히 1회 ② `pause` 1회·`currentTime` 0 ③ `pause` 1회·`currentTime` 0 ⓒ bridge: ① `getAlarmSound` 누계 2회(회차마다 1회)
- 스펙: `src/overlay/test/useAlarmOnFinish.test.ts`(`TC-302 ①`·`TC-302 ②③`)

### TC-303 · 등록 파일 실패 → 기본음 1회 재시도, 기본음 실패는 무시, 떠나면 기본음 정지 · 종류: 자동 · 요구: R-39(「한 번 다시 시도」·「1회 재생(반복 없음)」), R-01 · 설계: design.md §10.15 15.2 재생 순서(모두 `loop` 기본 `false`)·실패 알림 순서 ⓐⓑⓒ·1회 재생 규칙(CR-055)·15.4(Audio 최대 2개), §5.7 ④ `playSound`·⑤ `start()`·`playDefault`·예외 · **신규(CR-050)** · **개정(CR-055 — ①③④ `loop` true → false)**
- Given `getAlarmSound` → `USER`, `defaultAlarmUrl` → `'blob:default'`, Audio 스텁 모드 ① [reject] ② [reject, reject] ③ [throw] ④ [pending]
- When 각각 `running` → `finished`(이벤트) → microtask 비움, ③은 이어서 (`currentTime` 1.2) → `stopped`(이벤트), ④는 등록 `Audio`에 `error` 이벤트
- Then ⓐ 화면: 해당 없음(문구 없음 — R-01) ⓑ 부작용: ① `Audio` src 순서 [`u:alarm`, `blob:default`], 기본음 `volume` 0.8·`play` 1회, **두 `Audio` 모두 `loop` false(CR-055 — 등록 파일·대체 기본음 모두 1회 재생)** ② 같은 2개에서 멈춤(세 번째 없음) ③ [`u:alarm`, `blob:default`], 기본음 `play` 1회·`volume` 0.8·`loop` false → `stopped` 뒤 기본음 `pause` 1회·`currentTime` 0(재생 중 정지), `Audio` 2개 유지 ④ [`u:alarm`, `blob:default`], 기본음 `play` 1회, 두 `Audio` 모두 `loop` false(`error` 뒤 대체음도 1회 재생) ⓒ bridge: `getAlarmSound` 회차당 1회·인자 없음(기본음 재시도는 재조회하지 않음) — ① 1회 → ② 누계 2회(같은 it 안 두 번째 마운트) · ③ 1회 · ④ 1회, `defaultAlarmUrl` ① 1회
- 스펙: `src/overlay/test/useAlarmOnFinish.test.ts`(`TC-303 ①②`·`③`·`④`)

### TC-304 · `getAlarmSound` → `null`·실패면 기본음, 기본음 실패는 재시도 없음 · 종류: 자동 · 요구: R-39(「미등록이면 내장 기본음」·「1회 재생(반복 없음)」), R-01 · 설계: design.md §10.15 15.2 재생 순서(모두 `loop` 기본 `false`)·1회 재생 규칙(CR-055), §7 `get_alarm_sound` 행(실패·`null` = 기본음), §5.7 ⑤ 예외 · **신규(CR-050)** · **개정(CR-055 — ①② `loop` false)**
- Given ① `getAlarmSound` → `null` ② reject `{code 'sound.io'}` ③ `null` + 기본음 reject 모드
- When 각각 `running` → `finished`(이벤트) → microtask 비움
- Then ⓐ 화면: 해당 없음(문구 없음) ⓑ 부작용: ① `Audio` [`blob:default`]·`volume` 0.8·`play` 1회·`loop` false(CR-055 — 등록 없음 기본음도 1회 재생) ② [`blob:default`]·`volume` 0.8·`play` 1회·`loop` false(조회 실패 기본음도 1회 재생) ③ [`blob:default`] 하나뿐(재시도 없음) ⓒ bridge: `getAlarmSound` 경우마다 1회·인자 없음(같은 it 안 누계 ① 1 → ② 2 → ③ 3 — `null`·조회 실패·기본음 실패 어느 것도 재조회 없음)
- 스펙: `src/overlay/test/useAlarmOnFinish.test.ts`

### TC-305 · 회차 폐기·음량 시점 · 종류: 자동 · 요구: R-39 · 설계: §5.7 ⑤ `genRef`·`gainRef`·효과 1(재생 시작 시점 음량, 재생 중 변경 미반영)·`halt()`가 ⓑ보다 먼저 오는 경우, design.md §10.15 15.2 실패 알림 순서 끝 문장 · **신규(CR-050)**
- Given ①② `getAlarmSound` = 미완료 promise ③ Audio 스텁 [pending]
- When ① `running` → `finished`(이벤트) → `stopped`(이벤트) → 조회 응답 `USER` ② `running` → `finished`(이벤트) → 같은 스냅숏에 gain 0.3 → 응답 `USER` → gain 0.1 ③ `running` → `finished`(이벤트) → `stopped`(이벤트) → 등록 `Audio` play 거부
- Then ⓐ 화면: 해당 없음 ⓑ 부작용: ① `Audio` 0개(늦은 결과 버림) ② `Audio` 1개·`volume` 0.3, gain 0.1 뒤에도 0.3·`Audio` 1개 ③ 등록 `Audio` `pause` 1회, 거부 뒤에도 `Audio` 1개(기본음 재시도 없음) ⓒ bridge: ① `getAlarmSound` 1회·인자 없음(`stopped`로 재조회 없음), `defaultAlarmUrl` 0회(늦은 결과를 버렸으므로 기본음도 시도하지 않음) ② `getAlarmSound` 1회(gain 변경으로 재조회 없음), ③ `defaultAlarmUrl` 0회
- 스펙: `src/overlay/test/useAlarmOnFinish.test.ts`(`TC-305 ①`~`③`)

#### 공용 훅 — `useTimerSnapshot` `fromEvent` (스펙 `src/overlay/test/pomodoro.test.tsx`)

### TC-306 · `fromEvent` — 초기·조회 `false`, 이벤트 `true`, 구독·조회 각 1회 · 종류: 자동 · 요구: R-39 · 설계: design/functions.md §5.7 ③, design.md §4 `fromEvent` 행 · **신규(CR-050)**
- Given `getTimer` = 미완료 promise, 구독 즉시 성공
- When `renderHook(useTimerSnapshot)` → 조회 응답 `cd(finished, 1 500 000)` → 이벤트 `cd(stopped, 0)` → 이벤트 `cd(running, 0)`
- Then ⓐ 화면: 해당 없음(훅) ⓑ 상태: 초기 `fromEvent` false → 응답 뒤 snapshot `cd(finished,…)`·`fromEvent` false(finished여도 조회 결과) → snapshot `cd(stopped,0)`·true → `cd(running,0)`·true ⓒ bridge: `onTimerChanged` 1회·`getTimer` 1회, `setResting` 0회
- 스펙: `src/overlay/test/pomodoro.test.tsx`

#### 화면 통합 — `OverlayApp` (스펙 `src/overlay/test/OverlayApp.timerMode.test.tsx`)

### TC-307 · 카운트다운 한 회차 — 대기 → 흐름 → 끝남 깜빡임·알림음(CR-055 1회 재생) → core 복귀에 정지 · 종류: 자동 · 요구: R-37, R-38, R-39(「알림음 1회」) · 설계: design.md §10.15 15.1·15.2(1회 재생 규칙 — CR-055)·15.3(구독·조회 1개, OverlayApp 변경 없음), §6 P-9, §7 CR-050 행 · **신규(CR-050)** · **개정(CR-055 — `loop` true → false)**
- Given `CD_ON`·`M_NONE`, `getTimer` → `cd(stopped, 0)`, `getAlarmSound` → `USER`, Audio 스텁, T0 마운트
- When 이벤트 `cd(running, 0)` → 1 000ms → 이벤트 `cd(finished, 1 500 000)` → 10 000ms → (`currentTime` 2) → 이벤트 `cd(stopped, 0)`
- Then ⓐ 화면(`.pomodoro > div` 같은 노드): `00:25:00`·class 없음 → `00:25:00` → `00:24:59` → `00:00:00`·class `blink` → 10초 뒤에도 `blink` → `00:25:00`·class 없음 ⓑ 상태·부작용: `finished`에서 `Audio` 1개(`src` `u:alarm`, `volume` 0.8, `play` 1회, `loop` false(CR-055 — 1회 재생)), 10초 동안 `pause` 0회·새 `Audio` 없음(깜빡임 10초는 유지, 오버레이가 스스로 소리를 끄거나 다시 틀지 않음), `stopped` 뒤 `pause` 1회·`currentTime` 0 ⓒ bridge: `onTimerChanged`·`getTimer` 각 1회(훅이 `TimerText` 안 — 구독 1개), `getAlarmSound` 1회·인자 없음, `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.timerMode.test.tsx`

### TC-308 · 끝남 중 끄기 → 언마운트 정지 / 시작 때 이미 끝남 → 깜빡임만 · 종류: 자동 · 요구: R-38, R-39 · 설계: design.md §10.15 15.2 표 2·7행·15.3(끝남 중 끄기 → 언마운트 `halt()`), requirements R-39(끄기 때 정지·첫 조회 finished 무음) · **신규(CR-050)**
- Given ① `CD_ON`·`M_NONE`, `getTimer` → `cd(stopped,0)` ② `getTimer` → `cd(finished, 1 500 000)`
- When ① 이벤트 `cd(running, 1 499 000)` → `cd(finished,…)` → `settings://changed`(`CD_ON` + enabled false) ② 마운트 → 이벤트 `cd(stopped, 0)`
- Then ⓐ 화면: ① 끈 뒤 `.pomodoro` 없음(그림 없음 + 꺼짐 = U-1 거짓) ② 글자 `00:00:00`·class `blink` → `00:25:00`·class 없음 ⓑ 부작용: ① `Audio` 1개 → `pause` 1회·`currentTime` 0 ② `Audio` 0개 유지 ⓒ bridge: ① 타이머 구독 해제 함수 1회, `setSettings` 0회 ② `getAlarmSound` 0회
- 스펙: `src/overlay/test/OverlayApp.timerMode.test.tsx`(`TC-308 ①`·`TC-308 ②`)

### TC-309 · 끝남 깜빡임 중 키 젤리 — 격리(규칙 8·9) · 종류: 자동 · 요구: R-38, R-33, R-23 · 설계: design/components.md 규칙 8·9, design.md §10.15 15.1(`transform` 없음) · **신규(CR-050)**
- Given `CD_ON`·`M_BOTH`, 마운트, 이벤트 `cd(finished,…)`
- When 키 누름(`heldCount` 1) → 뗌
- Then ⓐ 화면: 누름 뒤 `.jellyWrap`에 `jelly` 또는 `jellyAlt`·`blink` 없음, 문서 전체 `.blink` 1개 = `.pomodoro`의 마지막 자식 = 글자 div, `.pomodoro` className `pomodoro`만, 뽀모도 img className `layer`만, `.pomodoro` 안 `.jelly`·`.jellyAlt`·`.shiver` 0개, 뗀 뒤에도 글자 `blink` ⓑ 부작용: `Audio` 1개 유지(키 입력으로 재생·정지 없음) ⓒ bridge: 키 입력으로 `getAlarmSound` 추가 호출 없음(`Audio` 수로 확인)
- 스펙: `src/overlay/test/OverlayApp.timerMode.test.tsx`

### TC-313 · 음량 배선 — 설정 `alarmVolume` → `alarmGain` → `Audio.volume`, 마운트 중 설정 변경은 다음 회차에 반영 · 종류: 자동 · 요구: R-39 · 설계: design/components.md §3.y `TimerText` 행(`useAlarmOnFinish(state, alarmGain(timer))`), design/functions.md §5.7 ④ `alarmGain`·⑤ 시그니처(`gain = alarmGain(timer)`)·효과 1(`gainRef` = 재생 시작 시점 음량), design.md §10.15 15.2 재생 순서(음량), §7 CR-050 `TimerSettings` 확장(`alarmVolume`) 행 · **신규(CR-050, v1.9 검증 반영 — 번호는 수동 TC-310~TC-312 뒤)**
- Given `withTimer({ ...CD_ON, alarmVolume: 30 })`·`M_NONE`, `getTimer` → `cd(stopped, 0)`, `getAlarmSound` → `USER`, Audio 스텁(resolve), 마운트
- When ① 이벤트 `cd(running, 0)` → `cd(finished, 1 500 000)` ② 이어서 이벤트 `cd(stopped, 0)` → `settings://changed`(`withTimer({ ...CD_ON, alarmVolume: 50 })`) → 이벤트 `cd(running, 0)` → `cd(finished, 1 500 000)`(다음 회차)
- Then ⓐ 화면: ① 글자 `00:00:00`·class `blink` ② 설정 변경 뒤 같은 글자 노드(재마운트 없음)·`00:25:00` → 다음 회차 `blink` ⓑ 상태·부작용: ① `Audio` 1개(`src` `u:alarm`)·`volume` **0.3**(= `alarmGain` 30 / 100)·`play` 1회 ② `stopped`에 첫 `Audio` `pause` 1회, 다음 회차 `Audio` 2개째(`src` `u:alarm`)·`volume` **0.5**·`play` 1회, 첫 `Audio` `volume` 0.3 그대로 ⓒ bridge: `getAlarmSound` ① 1회 → ② 누계 2회(회차마다 1회, 인자 없음 — 음량 변경으로 재조회 없음), `getSettings` 1회(설정 변경은 이벤트로만 — 재조회 없음), `onTimerChanged`·`getTimer` 각 1회(재구독·재조회 없음), `setSettings` 0회
- 스펙: `src/overlay/test/OverlayApp.timerMode.test.tsx`(`TC-313`)

#### 수동 — `src/overlay/test/manual-checklist.md` MC-28~MC-30

### TC-310 · 자동 재생 스파이크(패킷 §0) — 창을 클릭하지 않고 기본음이 울리는가 · 종류: 수동(MC-28) · 요구: R-39 · 설계: design.md §10.15 15.5(CSP `media-src`·autoplay 인자)·15.6 · **신규(CR-050)** · **개정(CR-058 — ⓐ 기본음 = 번들 mp3)**
- Given 실제 앱(`/dev-start`, `tauri.conf.json`에 CSP `media-src`·두 창 `additionalBrowserArgs` `--autoplay-policy=no-user-gesture-required` 반영 — 메인 세션 D-8·D-9), 알림음 미등록(기본음), 「타이머 사용」 켬·시작 시간 00:00:05. **두 번 실행으로 나눈다(v1.9 검증 반영 — C1-1)**: ① 판정 실행 = 앱을 새로 실행, 어느 창도 클릭하지 않음, 개발자 도구 콘솔을 열지 않음 ② 진단 실행 = 앱을 종료했다가 새로 실행, 오버레이 개발자 도구 콘솔을 연 상태. **콘솔을 연 실행은 판정에서 제외한다**
- When ① 트레이 메뉴 「시작」만 누르고 5초 기다림 ② 같은 조작 뒤 콘솔 출력을 봄(①의 결과와 무관하게 수행 — ①이 FAIL이면 원인 기록용으로 반드시)
- Then ⓐ 화면·소리(① 판정 실행만): 0에 닿는 순간 오버레이 글자 `00:00:00` 깜빡임과 함께 내장 기본음(번들 mp3 — CR-058 사용자 지정 음)이 들림 = PASS, 소리 없음 = FAIL — 판정은 소리로만 ⓑ 기록: ①의 울림 / 무음을 확인란에, ②의 콘솔 `NotAllowedError` 유무·울림 여부는 비고에만 적음(판정 제외 — ②가 어떻든 ①의 판정은 바뀌지 않음). ①이 FAIL이면 **구현을 멈추고 아키텍트 세션으로 되돌린다**(D-8 B 재검토) ⓒ core·bridge: 참고 관찰(판정 외 — 트레이 라벨은 core tray 소관, overlay 요구 밖): 흐르는 동안 트레이 라벨이 「일시정지」로, 끝난 뒤 「시작」으로 바뀌는지 비고에 적음
- 스펙: 수동 — `src/overlay/test/manual-checklist.md` MC-28

### TC-311 · 오버레이를 숨긴 상태에서 0 도달 → 알림음 · 종류: 수동(MC-29) · 요구: R-39(「알림음 1회」) · 설계: design.md §10.15 15.2 1회 재생 규칙(CR-055)·15.7 수동 TC-311(02-design R-5, verify 실측), §10.14 14.5 잔여 위험(숨은 페이지 타이머) · **신규(CR-050)** · **개정(CR-055 — ⓐ 10초 동안 되풀이 → 1회)** · **개정(CR-058 — ⓐ 기본음 = 번들 mp3)**
- Given MC-28 PASS 빌드, 시작 시간 00:00:10, 기본음
- When 「시작」 → 곧바로 트레이에서 오버레이 숨김 → **20초 넘게 기다림**(0 도달까지 10초 + 끝남 표시 10초 — v1.9 검증 반영 C2-1) → 오버레이 다시 표시. (선택 분기) 같은 전제로 한 번 더 — 숨긴 뒤 0 도달 후 끝남 10초 안에(「시작」 뒤 10~20초 사이) 다시 표시
- Then ⓐ 소리: 숨긴 채로 0 도달 시각(「시작」 뒤 약 10초)에 내장 기본음(번들 mp3 — CR-058 사용자 지정 음)이 **한 번** 들리고 되풀이되지 않으면 PASS(CR-055 — 1회 재생. 파일이 끝남 10초보다 길면 끝남 종료 때 멈추는 것도 PASS. 늦게 들리면 지연 초를 비고에, 같은 음이 처음부터 다시 시작되면 FAIL). (선택 분기) 끝남 중에 다시 표시해도 소리가 다시 울리지 않는다(새 `finished` 진입이 아님) ⓑ 화면: **0 도달 뒤 10초가 지난 뒤 표시**하면 `00:00:10`(지정 시간)·깜빡임 없음. (선택 분기) 끝남 10초 안에 표시하면 `00:00:00` 깜빡임 ⓒ 오류·안내 문구 없음, `.dev-tauri.log` 오류 없음
- 스펙: 수동 — `src/overlay/test/manual-checklist.md` MC-29

### TC-312 · 실제 소리·음량·깜빡임 10초 뒤 정지·쉬는중 계속 흐름 · 종류: 수동(MC-30) · 요구: R-37, R-38, R-39(「알림음 1회」·「깜빡임 10초 종료 또는 멈춤·시작·끄기 때 함께 멈춤」), R-35 · 설계: design.md §10.15 15.1·15.2(1회 재생 — CR-055, CR-052 반복 재생 폐기·판정표 6·7행 재생 중 떠나면 정지)·15.7 수동 TC-312, requirements §1 용어 주(카운트다운은 쉬는중 무시) · **신규(CR-050)** · **개정(CR-052 — ⑥~⑧ 정지 절차)** · **개정(CR-055 — 1회 재생 기대, ⑥~⑧은 등록 mp3로)** · **개정(CR-058 — ③ 기본음 = 번들 mp3, ⑥ 근거를 기본음 길이와 무관하게)**
- Given MC-28 PASS 빌드, 1분 넘는 mp3 등록, 유휴 시간 5분(기본)
- When ① 시작 시간 00:00:10 → 「시작」 → 0 도달 → 10초 관찰 ② 음량 80%·0%·100%로 바꿔 ①을 반복 ③ 기본값(등록 해제) 후 ① 반복 ④ 시작 시간 00:08:00 → 「시작」 → 입력 없이 5분 넘게 기다려 쉬는중 → 1분 더 관찰 → 입력 ⑤ 끝남 깜빡임 중 스크린샷 1장(`/run-app`) ⑥ **(CR-052, CR-055, CR-058 개정)** 1분 넘는 mp3를 다시 등록하고(③에서 해제했으므로 — 정지 확인은 재생 길이가 깜빡임 10초보다 확실히 긴 파일로 한다. 내장 기본음(번들 mp3, 34 061바이트)은 재생 길이가 설계 문서에 없어 정지 판정에 쓰지 않는다) 시작 시간 00:00:10 → 「시작」 → 0 도달 → 깜빡이는 중(0 도달 뒤 3초 안) 설정 창 타이머 탭 「멈춤」 ⑦ 같은 조작 뒤 깜빡이는 중 「시작」 → 새 회차가 다시 0에 닿으면 「멈춤」으로 정리 ⑧ 같은 조작 뒤 깜빡이는 중 「타이머 사용」 스위치 끔
- Then ⓐ 화면: ① 글자가 1초마다 줄다 `00:00:00`에서 1초 주기로 깜빡이고 10초 뒤 깜빡임이 멈추며 `00:00:10`으로 돌아가 대기 ④ 쉬는중 이미지로 바뀐 뒤에도 글자가 계속 줄어듦(멈추지 않음), 입력해도 튀지 않음 ⑤ 스크린샷 경로 기록 ⑥ 누른 순간 깜빡임이 멈추고 `00:00:10`으로 대기 ⑦ 누른 순간 깜빡임이 멈추고 `00:00:10`부터 다시 줄어듦 ⑧ 끈 순간 깜빡임이 멈춤(글자 값은 비고) ⓑ 소리: ① 0 도달 순간 등록 mp3가 **1회** 재생을 시작해(CR-055 — 1분 넘는 파일이라 깜빡이는 10초 동안 이어짐) **10초 깜빡임이 끝나는 순간 함께 멈춤**(R-39 — `finished`를 떠나면 재생 중인 소리 정지) ② 80%·0%(무음)·100% 크기 차이가 들림 ③ 내장 기본음(번들 mp3 — CR-058 사용자 지정 음)이 **한 번만** 울림(파일이 10초보다 길면 깜빡임 종료 때 함께 멈춤) — 같은 음이 처음부터 다시 시작되면 FAIL(CR-055, CR-052 반복 재생 폐기) ⑥ ⑦ ⑧ 누른·끈 순간 재생 중이던 mp3가 **바로** 멈춤(10초를 기다리지 않음), ⑦의 새 회차는 0 도달 때 다시 1회 재생 ⓒ core·bridge: 오류·안내 문구 없음, `settings.json` `timer.alarmVolume`은 마지막 값
- 스펙: 수동 — `src/overlay/test/manual-checklist.md` MC-30

### TC-FLOW-19 · S-19 25분 집중 시간을 방송하며 남은 시간을 보여 주고, 자리를 비워도 계속 줄어듦(TC-FLOW 목록에 더한다)
Steps: TC-293 → TC-295 ① → TC-307 → TC-284(재확인) → (환경 전환) TC-312 (v1.9 신규, CR-050)

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-293 | 표기 규칙: 남은 1 500 000ms | `00:25:00`, 1초 줄면 `00:24:59`(올림) |
| 2 | TC-295 ① | 같은 규칙을 훅이 씀: `cd(running, 0)` 받은 직후 | `00:25:00` → 1초 `00:24:59`, 초당 렌더 1회(훅 단위 — 다음 Step은 앱 마운트) |
| 3 | TC-307 | 연결: 카운트다운 켬(`CD_ON`) 새 마운트, 조회 `cd(stopped, 0)` | 대기 `00:25:00` → 흐름 → 끝남 → core 복귀 `00:25:00` |
| 4 | TC-284(재확인) | 연결: 새 마운트, 입력 없음 | 쉬는중 진입·해제 때 `setResting` 보고는 그대로(카운트다운이면 core가 무시 — 오버레이는 받은 스냅숏만 표시) |
| 5 | TC-312(수동) ④ | 환경 전환: 실제 앱, 유휴 5분 | 쉬는중 동안에도 글자가 계속 줄어듦 |

### TC-FLOW-20 · S-20 다른 창 작업 중 0이 되면 소리로 알고, 끝남 표시가 잠깐 보이고, 멈추거나 끝나면 소리도 멈춤, 파일이 깨져도 기본음, 재시작 직후엔 울리지 않음(TC-FLOW 목록에 더한다)
Steps: TC-300 ① → TC-303 ③ → TC-302 ① → TC-296 ① → TC-307 → TC-308 ② → (환경 전환) TC-310 → TC-311 → TC-312 (v1.9 신규, CR-050)

- 표 규약(v1.9 검증 반영): Given 칸이 「연결:」·「컴포넌트 단위:」·「환경 전환:」으로 시작하는 Step은 앞 Step의 마운트·mock·Audio 스텁을 이어 쓰지 않고 **그 TC의 Given으로 Step마다 새로 준비한다**(스펙은 it마다 새 마운트 — 앞 Step에서 이어지는 것은 사용자 흐름상의 의미뿐이고 호출 횟수·`Audio` 수는 Step 시작 기준 0에서 센다). 접두어가 없는 Step은 앞 Step 종료 상태를 이어 쓴다(Step 1은 흐름의 시작, Step 8·9는 Step 7에서 확인한 「MC-28 ① 판정 PASS 빌드」 실제 앱을 이어 쓰고 각 TC의 Given(시작 시간·알림음 등록)만 더 준비한다).

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-300 ① | 흐르는 중(`running`) 끝남 이벤트 | 등록 알림음 1회·음량 0.8(훅 단위) |
| 2 | TC-303 ③ | 연결: 같은 흐름에서 등록 파일이 깨짐(동기 예외) | 기본음 1회 재시도 → `stopped`에 기본음 정지 |
| 3 | TC-302 ① | 연결: 정상 파일, 끝남 재생 중 | `stopped`(10초 종료·멈춤)에 정지, 다음 회차는 다시 1회 |
| 4 | TC-296 ① | 컴포넌트 단위: 같은 스냅숏 흐름을 `TimerText`로 | `finished` 동안만 `.blink`, 떠나면 사라짐 |
| 5 | TC-307 | 연결: 앱 마운트(카운트다운 켬) | 깜빡임·알림음 1회·core 복귀에 정지(화면 통합) |
| 6 | TC-308 ② | 연결: 앱 재시작 직후 조회가 이미 `finished` | 깜빡임만, 소리 없음 |
| 7 | TC-310(수동) ① | 환경 전환: 실제 앱, 창 클릭 없이·콘솔 열지 않고 트레이 「시작」(① 판정 실행 — ② 진단 실행은 판정 제외라 흐름에 넣지 않음) | 기본음이 실제로 울림(자동 재생 허용) |
| 8 | TC-311(수동) | 오버레이 숨김 | 숨긴 채로도 울림 |
| 9 | TC-312(수동) ①~③ | 등록 mp3·음량 변경 | 10초 깜빡임과 함께 소리 정지, 음량 반영, 기본값이면 기본음 |

### 추적표 v1.9 추가분(CR-050) — 「## 추적표」의 v1.8 이하 표에 더한다

요구 ↔ TC(추가)

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-37 | TC-291, TC-292, TC-293, TC-294, TC-295, TC-307 | TC-312(MC-30) |
| R-38 | TC-292, TC-294, TC-295, TC-296, TC-307, TC-308, TC-309 | TC-312 |
| R-39 | TC-297, TC-298, TC-299, TC-300, TC-301, TC-302, TC-303, TC-304, TC-305, TC-306, TC-307, TC-308, TC-313(음량 배선 — 화면 수준 `alarmVolume` → `Audio.volume`, 설정 변경 뒤 다음 회차) | TC-310(MC-28), TC-311(MC-29), TC-312 |
| R-34(더함 — 기본값 개정·스톱워치 표기 불변) | TC-286 ②(개정), TC-294 ①, TC-295 ⑥ | — |
| R-35(더함 — 쉬는중 보고 불변, 카운트다운은 core가 무시) | TC-284(재확인) | TC-312 ④ |
| R-01(더함 — 알림음 실패에 문구 없음) | TC-299, TC-303, TC-304 | TC-311 |
| R-33·R-23(더함 — 깜빡임은 글자에만, 젤리 격리) | TC-309 | — |

설계 항목 ↔ TC(CR-050)

| 설계 항목 | TC |
|---|---|
| design.md §10.15 15.1 표 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8행 | TC-294 ①·TC-295 ⑥ / TC-294 ①·TC-295 ⑥ / TC-294 ①·TC-295 ③⑤·TC-307 / TC-292·TC-294 ①·TC-307 / TC-294 ①·TC-295 ① / TC-292·TC-294 ①·TC-295 ③ / TC-292·TC-294 ①·TC-295 ④ / TC-292·TC-294·TC-295 ②·TC-296·TC-307 |
| 15.1 1행 주(초기 스냅숏 = 스톱워치 `00:00:00`, 설정값으로 미리 채우지 않음) · 「입력은 스냅숏뿐」 | TC-294 ① 1행·TC-295 ⑥ · TC-307(설정 `countdownSecs`가 아니라 스냅숏 `durationMs`로 `00:25:00`) |
| 15.1 깜빡임 CSS(`timerBlink 1s infinite`·keyframes·transform 없음) / 트리거·해제 / JS 타이머 없음 / `restPaused` 없음·쉬는중 보고 그대로 | TC-296 ④ / TC-296 ①·TC-307 / TC-296 ②·TC-295 ②·TC-307(10초 유지) / TC-284(재확인)·TC-312 ④ |
| 15.2 표 1·2·5행 / 3·4행 / 6·7행 | TC-301·TC-308 ② / TC-300 / TC-302·TC-308 ① |
| 15.2 재생 순서(등록 → 실패 시 기본음, 없거나 조회 실패 → 기본음, 음량 = 시작 시점 gain) / 실패 알림 순서 ⓐⓑⓒ / **1회 재생(CR-055 🔒 — CR-052 「10초 동안 반복」 폐기, R-39 「1회 재생(반복 없음)」 복귀: 등록·기본·대체 기본음 모두 `loop` 기본 false, 재생 중 떠나면 정지는 판정표 6·7행)** / 재생은 오버레이 한 곳 | TC-303·TC-304·TC-305 ②·TC-313(화면 수준 음량) / TC-299 ④·TC-303 ③·TC-305 ③ / TC-300 ①(`loop` false)·TC-302 ①(두 회차 `loop` false)·TC-303 ①③④(`loop` false)·TC-304 ①②(`loop` false)·TC-307(`loop` false)·TC-299 ①(공용 `loop` 인자 기본 false·true — 불변)·TC-311 ⓐ(내장 기본음 한 번 — CR-058 번들 mp3)·TC-312 ①③⑥⑦⑧ / TC-307(`getAlarmSound` 1회) |
| 15.3 `useAlarmOnFinish` 위치 = `TimerText`(구독·조회 1개, OverlayApp 불변) / 훅 파일 위치 / `useElapsedText` `string` 유지 / `alarmSound` 공용 / 깜빡임 CSS 로컬 / (v2.4 — CR-058·CR-061) 내장 기본음 = 번들 mp3 자산·기본 음량 `DEFAULT_ALARM_VOLUME` 44(옛 행 `BEEP_AMPLITUDE` 0.5는 합성음 폐기로 대상 없음) | TC-307·TC-296 ①(각 1회)·TC-308 ①(언마운트 정지) / TC-300~TC-305(import 경로) / TC-295 ① / TC-297~TC-299(import 경로) / TC-296 ④ / TC-298(자산 URL)·TC-297(44)·TC-299 ⑤(폴백 0.44)·TC-310~TC-312(실제 소리 — 수동) |
| 15.3 잔여 위험(`TimerText` 미마운트면 무음 — 수용) | TC 대상 아님(설계가 수용한 위험 기록 — 동작 정의 없음) |
| 15.3a 접근성(새 문구·aria-label 없음, `aria-hidden` 유지, `aria-live` 없음) | TC-296 ① |
| 15.4 성능(새 interval·rAF 없음 / Audio 최대 2개 / 기본음 = 번들 정적 자산 URL, 런타임 생성물 없음 — v2.4 CR-058, 옛 「Blob URL 창당 1개」 대체) | TC-295 ②④ / TC-303 ② / TC-298 |
| 15.5 계약·선행 조건(contract v0.23 반영, CSP·autoplay 인자) | v1.9 개정표(mock 보강·TC-286 ②), TC-310 |
| 15.6 자동 재생 스파이크 | TC-310 |
| 15.7 계획 TC-291~TC-312·TC-286 개정·mock 보강 | 이 절 전체(번호 그대로) |
| design/functions.md §5.7 ① `snapshotMode` · `timerDisplayMs` · `formatRemaining` · `timerText` · `isTimerBlinking` | TC-291 · TC-292 · TC-293 · TC-294 ① · TC-294 ② |
| §5.7 ② `useElapsedText` 개정 | TC-295 |
| §5.7 ③ `useTimerSnapshot` `fromEvent` | TC-306, TC-268·TC-269·TC-270 ①(개정) |
| §5.7 ④ 상수 `DEFAULT_ALARM_VOLUME`(v2.4 — CR-058 44·CR-061 단일 소스) · 내장 기본음 자산 import · `defaultAlarmUrl` · `alarmGain` · `playSound` (폐기 — CR-058: `synthBeepWav`·`BEEP_*`·Blob URL 캐시, TC 대상 없음) | TC-297 · TC-298 · TC-298 · TC-299 ⑤·TC-313(`TimerText`의 `alarmGain(timer)` 배선) · TC-299 ①~④ |
| §5.7 ⑤ 시그니처 · 상태(ref만) · `halt()` · `start()` · 효과 1 · 효과 2 ⓐⓑⓒ · 효과 3 · 예외 | TC-300~TC-305 · TC-300 ①(렌더 없음) · TC-302·TC-305 ①③ · TC-300·TC-303·TC-304 · TC-305 ② · TC-302 / TC-300 / TC-301 · TC-302 ③ · TC-303·TC-304 |
| §5.7 ⑥ `TimerText` 렌더(`finished`면 `styles.blink`, 아니면 `className` 없음) | TC-296 ①②, TC-307 |
| design/components.md §3.y 표 6행(`TimerText`·`useAlarmOnFinish`·`alarmSound`·`timerClock`·`useElapsedText`·`useTimerSnapshot`) / `OverlayApp`·`PomodoroLayer` 변경 없음 / 규칙 9 | TC-296·TC-307·TC-313(`useAlarmOnFinish(state, alarmGain(timer))` 인자) / TC-300~TC-305 / TC-297~TC-299 / TC-291~TC-294 / TC-295 / TC-306 // TC-307(구독 1회)·TC-278(재확인) // TC-296 ③·TC-309 |
| design.md §4 `text`(개정) · `fromEvent` · 깜빡임 여부 · `prevStatusRef`·`stopRef`·`genRef`·`gainRef` | TC-295 · TC-306 · TC-296 · TC-300~TC-305 |
| design.md §6 P-9(카운트다운 표시 → 끝남 깜빡임·알림음 → 정지, 오류 분기) | TC-307, TC-308, TC-303, TC-304 |
| design.md §7 CR-050 행: `TimerSnapshot` 확장 · `TimerSettings` 확장(`alarmVolume`만 읽음) · `get_alarm_sound` · `set_resting` 의미 확장 | TC-291·TC-292 · TC-299 ⑤·TC-305 ②·TC-286 ②·TC-313(화면 수준 배선 — `settings.timer.alarmVolume` 30 → 0.3, `settings://changed` 50 → 다음 회차 0.5) · TC-300·TC-304·TC-307·TC-313 · TC-284(재확인) |
| RTM R-37 · R-38 · R-39 행 | 위 요구 ↔ TC 표 |
| requirements §2 S-19 · S-20 | TC-FLOW-19 · TC-FLOW-20 |

상태 전이표(확정사항 §5) ↔ TC(CR-050): 변경 없음 — `src/state/inputMachine.ts` 불변. 타이머 상태(`finished` 포함)는 core 소유이며 오버레이는 받은 스냅숏만 표시한다.

사용자행 ↔ TC-FLOW(추가)

| 사용자행 | TC-FLOW |
|---|---|
| S-19 | TC-FLOW-19 |
| S-20 | TC-FLOW-20 |

CR ↔ TC(추가)

| CR | TC |
|---|---|
| CR-050 | 신규 TC-291~TC-313(TC-313은 v1.9 검증 반영 추가), TC-FLOW-19·20 / 개정 TC-286 ②·TC-268·TC-269·TC-270 ① / mock 보강 16개 스펙(v1.9 개정표) / 스펙 `timerClock.test.ts`(확장)·`useElapsedText.countdown.test.tsx`·`TimerText.blink.test.tsx`·`alarmSound.test.ts`·`useAlarmOnFinish.test.ts`·`OverlayApp.timerMode.test.tsx`(신규)·`pomodoro.test.tsx`(확장) / 수동 MC-28~MC-30 |

- 수: 자동 +20(TC-291~TC-309, TC-313), 수동 +3(TC-310~TC-312 — MC-28~MC-30). 313번까지 = 유효 293건(자동 264 + 수동 29) + 폐기 20건. TC-FLOW 유효 19건 + 폐기 1건.
- v1.9a 검증 반영(2026-09-26, ui-test-checker·ui-test-conflict-checker): TC-313 신규(R-39 음량 배선 — 화면 수준), TC-303·TC-304·TC-305 ① ⓒ `getAlarmSound` 횟수·인자 단언 스펙 추가, TC-297 스펙 `Audio` 0개 단언 추가, TC-310/MC-28 판정·진단 실행 분리, TC-311/MC-29 대기 20초·표시 시점 분기, TC-268·TC-269·TC-270 ①·TC-286 ② 본문 Then ⓑ 개정값으로 고쳐 씀, TC-294 When 인자별 now, TC-FLOW-20 「연결:」 규약. MC-27~MC-30 본표 이동은 다음 증분.
- 완료(2026-09-26 증분 패스): `src/overlay/test/manual-checklist.md` 머리 절 표의 MC-27 뒤에 MC-28~MC-30 행을 추가했다(TC-310~TC-312의 Given → 절차의 「전제」, When → 절차, Then ⓐⓑⓒ → 기대). 「기준 추가(v1.9 — CR-050)」 줄과 「수행 순서」 줄(MC-28 = 패킷 §0 자동 재생 스파이크를 먼저, FAIL이면 구현 중단·아키텍트 세션 회귀)도 넣었다. 같은 패스 정정: TC-311 Then ⓑ의 복귀 값 오기 `00:10:00` → `00:00:10`(Given 시작 시간 00:00:10, TC-312 ⓐ ①과 일치).

## CR-051 겹침 순서 변경 — 헤어를 배경 뒤 `.hairWrap`으로 (v2.0, 2026-09-26)

- **기준**: `doc/000_프로젝트_확정사항.md` CR-051 줄(🔒 2026-09-26 — 아래→위 헤어 → 배경 → 뽀모도 인물 → 말풍선 → 시간 글자 → 팔·손 → 본체, 헤어는 본체와 함께 젤리·부르르, 배경·뽀모도 고정, 설정 창 미리보기도 같은 순서) · `src/overlay/test/change-requests.md` CR-051(적용·미검증 — `.hairWrap` = `.canvas` 첫 자식·hair 있을 때만, `jellyClass(motion, base)` 일반화·`motion` 1회 계산으로 두 래퍼가 같은 커밋에 같은 클래스, `.hairWrap` CSS = `.jellyWrap`과 같은 7선언 별도 블록, 펜 손은 CR-025대로 `.jellyWrap` 맨 위, 젤리 도중 신규 등록 시 1회 위상 어긋남 허용) · 대기열 Q-04 · 현행 소스 `src/overlay/index.tsx`·`src/overlay/overlay.module.css`.
- **설계 확인 필요**(ui-designer 동기화 모드로 닫을 것): design.md §1 출력·§2 ASCII `[hair]`·아래 문단·§10.1 hair 행·표 아래 문단·§10.3 CSS 블록(`.hairWrap` 없음)·§10.11 자리·모션·회귀 ①②⑤, design/components.md §3 `.jellyWrap`·`HairLayer`·`MouseArm`(「둘째 자식」) 행·규칙 7, design/functions.md §5.1 `jellyClass`(인자 `base` 없음)가 옛 구조(헤어 = `.jellyWrap` 첫 자식)다. 이 절의 TC는 확정사항 🔒 결정과 CR 대장을 근거로 먼저 개정했다. 또 확정사항 문구 「… → 팔·손 → 본체」(손이 본체 아래로 읽힘)와 CR 대장 해석(팔은 본체 아래·펜 손은 본체 위 유지, 헤어만 옮김)이 다르다 — TC는 CR 대장 해석(현행 소스)을 따른다.
- **픽스처 추가**(`OverlayApp.hair.test.tsx`): `HAIR_POMO_MANIFEST` = `HAIR_MANIFEST` + `pomo_char`·`pomo_bubble`(900×700, url `u:pomo_char`·`u:pomo_bubble`). 설정 `timer`는 `DEFAULT_SETTINGS` 상속(꺼짐)이라 U-1(뽀모도 그림 ≥1장)로 시간 글자 div가 `.pomodoro` 마지막 자식으로 그려진다. CSS Modules mock에 `hairWrap`·`pomodoro` 추가. 헬퍼 `animatedOnlyJelly` 삭제 → `animatedEls`(애니메이션 클래스 요소 목록)·`hairWrapOf`·`inOrder`·`MOVING`.
- **§0.3 보충(red/green)**: 현행 소스(CR-051 적용)에서 개정 TC-241·TC-243~TC-246·신규 TC-314 모두 green 기대. CR-051 이전 소스면 TC-241·TC-243~TC-246 red(헤어가 `.jellyWrap` 안·`.hairWrap` 없음), TC-314 red(`.hairWrap` 블록 없음 → 선언 `{}`).

#### v2.0 개정표 — 기존 TC(CR-051)

| TC | 스펙 | 처리(CR-051) |
|---|---|---|
| TC-241 | `OverlayApp.hair.test.tsx` | **개정** — ① `.canvas` 자식 `[hairWrap, 배경, jellyWrap]`·`.hairWrap` 자식 `[헤어]`·`.jellyWrap` 자식에서 헤어 제거·문서 순서 헤어 < 배경 < 팔 < 몸통 < 펜 손. ② 뽀모도 변형(`HAIR_POMO_MANIFEST`) 추가 — 헤어 < 배경 < 인물 < 말풍선 < 글자 < 팔, 누름 뒤 뽀모도·배경은 움직이는 조상 없음 |
| TC-243 | 같음 | **개정** — 헤어 부모 = 같은 `.hairWrap`(`.canvas` 첫 자식), 매 단계 `.hairWrap` class = `.jellyWrap` class 대응, ⑫ 펜 손 `u:pen_down_0`(CR-042 개정값을 본문에도 반영) |
| TC-244 | 같음 | **개정** — 헤어 조상 = `.hairWrap`(motion 클래스 동일), 배경은 두 래퍼 밖, 애니메이션 클래스 요소 = 정확히 `[.hairWrap, .jellyWrap]` / 뗌 뒤 0개 |
| TC-245 | 같음 | **개정** — `.hairWrap` 생김·사라짐, `.jellyWrap` 자식·`.armWrap`·배경 노드 불변 |
| TC-246 | 같음 | **개정** — `.canvas` 자식에 `.hairWrap`(①②), 누름 뒤 두 래퍼 `jellyAlt`, ③ `.hairWrap` 0개 |
| TC-247(MC-24) | `manual-checklist.md` | **개정** — ① 뒷머리 맨 뒤(배경 투명 부분으로만 보임), ⑤ 배경·뽀모도 정지, ⑧ 젤리 도중 등록 1회 어긋남 허용, Given 배경 투명 부분·뽀모도 그림 |
| TC-242 | 같음 | 재확인 — 기대·스펙 불변(`.canvas` 자식 `[배경, jellyWrap]` = hair 없으면 `.hairWrap`도 없음) |
| TC-238~TC-240 | 같음 | 재확인 — `HairLayer` 단독 렌더 불변(CR 대장: 주석만 변경) |
| TC-158 | `overlayStyles.test.ts` | 재확인 — `.jellyWrap` 블록 불변(`.hairWrap`은 별도 블록 — TC-314) |
| TC-282·TC-283·TC-288 | `OverlayApp.pomodoro.test.tsx` | 재확인 — hair 미등록 픽스처라 `.canvas` 자식 `[배경, pomodoro, jellyWrap]` 불변. TC-288은 `hasHair`가 `useMemo([manifest])`라 입력·tick 때 `findEntry` 호출이 늘지 않음 |
| TC-FLOW-13 | — | Steps 불변. Step 3 기대 문구 개정(헤어 → 배경 → …). Step 5 기대 「헤어는 `.jellyWrap` 안, 배경은 밖」은 **「헤어는 `.hairWrap` 안(`jellyWrap jellyAlt`와 같은 `hairWrap jellyAlt`), 배경은 두 래퍼 밖」으로 읽는다**(TC-244 개정 기대와 같음) |
| v1.5 추적표 | — | 요구 R-17 행 「배경은 헤어 아래」 → **배경은 헤어 위·두 래퍼 밖**, R-19 행 「팔이 없으면 헤어 다음이 몸통」 → **팔이 없으면 `.jellyWrap` 첫 자식 = 몸통(헤어는 `.hairWrap`)**. 설계 행 §1 출력·§2 ASCII·§10.1·components §3 `.jellyWrap`·`MouseArm`(둘째 자식)·규칙 7의 「`.jellyWrap` 첫 자식」은 **CR-051 `.canvas` 첫 자식 `.hairWrap`** 으로 읽는다 — 아래 CR-051 추적표가 우선 |

#### CSS — `.hairWrap` 규칙

### TC-314 · `.hairWrap` CSS — `.jellyWrap`과 같은 상자·기준점, 자체 애니메이션 없음, 젤리·부르르 클래스 두 래퍼 공용 · 종류: 자동 · 요구: R-30, R-23, R-24 · 설계: 확정사항 CR-051 줄(헤어는 본체와 함께 젤리·부르르), CR 대장 CR-051 조치(`.hairWrap` 신규 — `.jellyWrap`과 같은 7선언, TC-158이 `.jellyWrap` 단독 블록을 단언해 별도 블록), design.md §10.3 CSS 블록(`.jellyWrap`·`.jelly`/`.jellyAlt`/`.shiver` — `.hairWrap` 미기재, 설계 확인 필요) · **신규(CR-051)**
- Given `src/overlay/overlay.module.css` 원문(`fs.readFileSync`, 주석 제거·공백 정규화)
- When `.hairWrap`·`.jellyWrap`·`.jelly`·`.jellyAlt`·`.shiver` 블록 파싱, 정규화 원문에서 복합·자손 선택자 검색
- Then ⓐ 화면(규칙): `.hairWrap` 선언 = 정확히 {position `absolute`, left `0`, top `0`, width `100%`, height `100%`, pointer-events `none`, transform-origin `50% 100%`} = `.jellyWrap` 선언과 같음, `animation`·`transform` 선언 없음. `.jelly`·`.jellyAlt`·`.shiver`는 단독 선택자(`.jellyWrap .jelly`·`.jellyWrap.jelly`·`.hairWrap.shiver`·`.jelly.hairWrap` 같은 복합·자손 선택자 없음 — 같은 클래스가 두 래퍼 어디에 붙어도 같은 애니메이션), 값 = `jelly 350ms ease-in-out`·`jellyAlt 350ms ease-in-out`·`shiver 80ms ease-in-out infinite` ⓑ 상태: 해당 없음(정적 규칙 — 클래스 부착은 TC-243·TC-244) ⓒ bridge: 해당 없음(CSS만 — command·event 호출 없음)
- 스펙: `src/overlay/test/overlayStyles.test.ts`

#### 추적(CR-051)

요구 ↔ TC(CR-051 — v1.5 R-17·R-19 행보다 우선)

| 요구ID | 자동 TC | 수동 |
|---|---|---|
| R-30 | 개정 TC-241, TC-243, TC-244, TC-245, TC-246 / 신규 TC-314 / 재확인 TC-238~TC-240, TC-242 | 개정 TC-247(MC-24) |
| R-23(더함 — 헤어 래퍼도 본체 래퍼와 같은 젤리 클래스) | TC-243, TC-244, TC-246 ①, TC-314 | TC-247 ③ |
| R-24(더함 — 헤어 래퍼도 같은 부르르 클래스) | TC-244, TC-314 | TC-247 ④ |
| R-17(더함 — 배경은 헤어 위·두 래퍼 밖, 젤리·부르르 중 정지) | TC-241, TC-244 | TC-247 ①⑤ |
| R-33(더함 — 뽀모도는 배경 위·`.jellyWrap` 아래·두 래퍼 밖, 헤어 등록 시에도 고정) | TC-241 ② | TC-247 ①⑤ |
| R-16·R-25(더함 — 팔·펜 손 자리 불변: `.jellyWrap` 첫 자식 `.armWrap`·마지막 자식 펜 손) | TC-241, TC-245 | TC-247 ② |
| R-19(더함 — 팔이 없으면 `.jellyWrap` 첫 자식 = 몸통, 헤어는 `.hairWrap`) | TC-246 | — |

설계 항목 ↔ TC(CR-051)

| 설계 항목 | TC |
|---|---|
| 확정사항 CR-051 겹침 순서(헤어 → 배경 → 뽀모도 인물 → 말풍선 → 시간 글자 → 팔 → 본체 → 펜 손 — CR 대장 해석) | TC-241 ①②, TC-247 ① |
| CR-051 헤어 젤리·부르르 본체와 동행(`wrapMotion(machine)` 1회 → `jellyClass(motion, styles.hairWrap)`·`jellyClass(motion)` 같은 커밋) | TC-243, TC-244, TC-246 ①, TC-247 ③④ |
| CR-051 배경·뽀모도 고정(두 래퍼 밖) | TC-241 ②, TC-244, TC-247 ⑤ |
| CR-051 `.hairWrap`은 hair 등록 시에만 렌더(`hasHair = useMemo(findEntry(manifest,'hair'), [manifest])`) | TC-242, TC-245, TC-246 ③ |
| CR-051 `.hairWrap` CSS(`.jellyWrap`과 같은 7선언·자체 애니메이션 없음·motion 클래스 공용) | TC-314 |
| CR-051 펜 손 `.jellyWrap` 맨 위 유지(CR-025) | TC-241 ① |
| CR-051 젤리 도중 신규 등록 시 1회 위상 어긋남 허용 | TC 대상 아님(허용 조항 — 동작 정의 없음, TC-247 ⑧ 비고) |
| CR-051 설정 창 미리보기도 같은 순서 | settings `test/scenarios.md`(소스 불변 — CR-051 인용 갱신, TC-198 재확인) |

상태 전이표(확정사항 §5) ↔ TC(CR-051): 변경 없음 — `src/state/inputMachine.ts` 불변, 헤어 래퍼는 기존 `wrapMotion` 출력을 그대로 받는다.

사용자행 ↔ TC-FLOW(CR-051): S-13 → TC-FLOW-13(Steps 불변, Step 3·5 기대 문구 개정). 새 사용자행 없음.

CR ↔ TC(추가)

| CR | TC |
|---|---|
| CR-051 | 개정 TC-241·TC-243·TC-244·TC-245·TC-246·TC-247(MC-24)·TC-FLOW-13 Step 3·5 / 신규 TC-314 / 재확인 TC-238~TC-240·TC-242·TC-158·TC-282·TC-283·TC-288 / 스펙 `OverlayApp.hair.test.tsx`(개정)·`overlayStyles.test.ts`(TC-314 추가) / 대기열 Q-04 전환 |

- 수: 자동 +1(TC-314), 개정 6건(자동 5 + 수동 1). 314번까지 = 유효 294건(자동 265 + 수동 29) + 폐기 20건. TC-FLOW 유효 19건 + 폐기 1건(변동 없음).
- 실행(보강 모드 — 변경에 걸리는 TC만): `yarn test --run src/overlay/test/OverlayApp.hair.test.tsx src/overlay/test/overlayStyles.test.ts` 또는 `-t "TC-24[1-6]|TC-314|TC-158"`. 회귀 확인: `-t "TC-238|TC-239|TC-240|TC-282|TC-283|TC-288"`.

## CR-052 알림음 반복 재생 — 개정 TC (v2.1, 2026-09-27)

> **CR-055로 반복 재생 부분 폐기(v2.3, 2026-09-27).** 이 절의 `loop` true 기대(TC-300 ①·TC-302 ①·TC-303 ①~④·TC-304 ①·TC-307·TC-311 ⓐ·TC-312 ①③)는 아래 「CR-055 알림음 1회 재생 복원」 절이 대체한다(기록 보존). 이 절에서 유효하게 남는 것: TC-299 ①(공용 `playSound` `loop` 인자 기본 false·true·명시 false), TC-312 ⑥~⑧ 정지 절차(CR-055 절에서 등록 mp3로 조정), 정지 경로(판정표 6·7행) 불변.

- **기준**: `doc/000_프로젝트_확정사항.md` CR-048 블록 「수정 (CR-052)」 🔒(알림음은 깜빡이는 10초 동안 **반복 재생** — 1회 재생 대체, 10초 종료·멈춤·시작·끄기 때 정지) · `src/overlay/design.md` §10.15 15.2(판정표 3행 「반복 재생 시작」·반복 재생 규칙 — 옛 「반복 없음」 대체) · `design/functions.md` §5.7 ④ `playSound(url, volume0to1, onFail?, loop = false)` · CR 대장 CR-052 · 대기열 Q-05 · 소스 `src/components/utils/alarmSound.ts`·`src/overlay/hooks/useAlarmOnFinish.ts`.
- **바뀌는 것은 반복 여부뿐**: 등록 파일·기본음·실패 대체 기본음 모두 `loop` true. 정지 경로(판정표 6·7행 — `finished` 이탈(core의 10초 종료·멈춤·끄기 → `stopped`, 끝남 중 시작 → `running`)·언마운트 → `halt()` pause·`currentTime` 0)는 불변. 설정 창 미리 듣기는 `loop` 생략 = 1회 재생 유지 — settings `test/scenarios.md` 「CR-052 개정」 절 TC-290.
- **신규 TC 번호 없음**: `loop` 인자 단언은 TC-299 ① 안에 두었다(대기열 Q-05 「신규 TC 필요」 두 항목 = TC-299 ① loop true 단언 · TC-303 ①③④ 대체 기본음 loop 단언으로 충족).

#### v2.1 개정표 — 기존 TC(CR-052)

| TC | 종류 | 스펙 | 처리(CR-052) |
|---|---|---|---|
| TC-299 ① | 자동 | `alarmSound.test.ts` | **개정** — `loop` 인자 생략 = `loop` false 유지(1회 재생), `true` → `Audio.loop` true·`play` 1회·반복 중 정지 함수 → `pause` 1회·`currentTime` 0, 명시 `false` → false |
| TC-300 ① | 자동 | `useAlarmOnFinish.test.ts` | **개정** — `loop` false → **true**(제목·설계 칸 「1회 재생·반복 없음」 → 「반복 재생」) |
| TC-302 ① | 자동 | 같음 | **개정** — 반복 중 소리(`loop` true)가 `stopped`에서 `pause` 1회·0, 다음 회차 `Audio`도 `loop` true |
| TC-303 ①②③④ | 자동 | 같음 | **개정** — 등록 `Audio`·대체 기본음 모두 `loop` true, ③ `stopped`에서 반복 멈춤, ④ `error` 뒤 대체음도 `loop` true |
| TC-304 ① | 자동 | 같음 | **개정** — 등록 없음 기본음 `loop` true |
| TC-311 | 수동(MC-29) | `manual-checklist.md` | **개정** — 숨긴 채 0 도달 → 깜빡이는 10초 동안 되풀이 → 끝남 10초 끝에 멈춤 |
| TC-312 | 수동(MC-30) | `manual-checklist.md` | **개정** — ① 등록 mp3 10초 동안 이어지다 종료 때 정지 ③ 기본음 10초 동안 되풀이 ⑥ 「멈춤」 ⑦ 「시작」 ⑧ 「타이머 사용」 끄기 → 바로 정지(절차 추가) |
| TC-301 · TC-305 ~ TC-309 · TC-313 | 자동 | `useAlarmOnFinish.test.ts` · `OverlayApp.timerMode.test.tsx` | 재확인 — 기대 불변(`loop` 단언 없음, 울림 판정·조회·음량·정지 조건 그대로) |

요구 ↔ TC(CR-052)

| 요구ID | 자동 TC | 수동 |
|---|---|---|
| R-39(더함 — 끝남 10초 동안 반복 재생, 10초 종료·멈춤·시작·끄기 때 정지) | TC-299 ①, TC-300 ①, TC-302 ①, TC-303 ①③④, TC-304 ① | TC-311(MC-29), TC-312 ①③⑥⑦⑧(MC-30) |
| R-38(더함 — 소리 반복이 깜빡임 10초와 함께 끝남) | TC-302 ①(`stopped` = 깜빡임 해제와 같은 전이) | TC-312 ① ⓐⓑ |

설계 항목 ↔ TC(CR-052)

| 설계 항목 | TC |
|---|---|
| design.md §10.15 15.2 판정표 3행 「반복 재생 시작」 | TC-300 ① |
| 15.2 반복 재생 규칙(등록 파일·기본음·실패 대체 기본음 모두 `loop` true) | TC-300 ①, TC-303 ①③④, TC-304 ① |
| 15.2 정지 = 판정표 6·7행 불변(`halt()` pause·`currentTime` 0) | TC-302 ①, TC-303 ③, TC-312 ⑥⑦⑧ |
| 15.2 설정 창 미리 듣기는 `loop` 기본값 false 1회 재생 유지 | TC-299 ①(기본 false) · settings TC-290(호출 인자 3개) |
| design/functions.md §5.7 ④ `playSound` 4번째 인자 `loop = false` | TC-299 ① |

사용자행 ↔ TC-FLOW(CR-052): 새 사용자행 없음. TC-FLOW Steps 불변 — 알림음 단계를 가진 TC-FLOW(S-20 → TC-FLOW-20)는 가리키는 TC(TC-300·TC-302)의 개정 기대(`loop` true)로 읽는다.

CR ↔ TC(추가): CR-052 → 개정 TC-299 ①·TC-300 ①·TC-302 ①·TC-303 ①~④·TC-304 ①·TC-311(MC-29)·TC-312(MC-30) / 재확인 TC-301·TC-305~TC-309·TC-313 / 대기열 Q-05 → `TC 전환(검증 대기)`.

- 수: 변동 없음. 314번까지 = 유효 294건(자동 265 + 수동 29) + 폐기 20건. TC-FLOW 유효 19건 + 폐기 1건.
- 실행(보강 모드 — 변경에 걸리는 TC만): `yarn test --run src/overlay/test/alarmSound.test.ts src/overlay/test/useAlarmOnFinish.test.ts`. 회귀: `yarn test --run src/overlay/test/OverlayApp.timerMode.test.tsx`. 수동: MC-29·MC-30(MC-28 PASS 빌드 전제).

## CR-053 배포용 기본 세트 3차 — 개정 TC (v2.2, 2026-09-27)

- **기준**: `doc/000_프로젝트_확정사항.md` CR-053 줄 🔒(타이머 기본값은 글자 위치 (142,458)·회전 9°만 변경 — 크기 36·색 `#333333`·꺼짐·25분·음량 80 유지) · contract v0.24 `DEFAULT_TIMER_SETTINGS`(`src/bridge/types.ts` 인용) · `src/overlay/design.md` 변경이력 CR-053 행(오버레이 설계·소스 변경 없음 — 인용 값만 갱신)·§4 `timer`(`settings.timer ?? DEFAULT_TIMER_SETTINGS`) · CR 대장 CR-053 · 대기열 Q-06.
- **오버레이 소스 변경 없음**: 오버레이는 bridge 상수를 그대로 쓰므로 옛 기본값 (268,403)·5°를 리터럴로 단언하던 TC-286 ②만 기대값을 바꾼다. 기본 그림 7장(hair·pomo_char 추가, `kb_down_0` 제외)은 core 시딩·매니페스트 몫이라 오버레이 TC 기대에 걸리지 않는다(매니페스트는 mock 픽스처로 주입).
- **신규 TC 없음.** 대기열 Q-06 상태는 이 패스에서 바꾸지 않는다(관리자 지시).

#### v2.2 개정표 — 기존 TC(CR-053)

| TC | 종류 | 스펙 | 항목 | 옛 기대(CR-050) | 새 기대(CR-053) |
|---|---|---|---|---|---|
| TC-286 ② | 자동 | `OverlayApp.pomodoro.test.tsx` | ⓑ `DEFAULT_TIMER_SETTINGS` 리터럴 대조 `textPos` | `{ x: 268, y: 403 }` | `{ x: 142, y: 458 }` |
| TC-286 ② | 자동 | 같음 | ⓑ `DEFAULT_TIMER_SETTINGS` 리터럴 대조 `rotation` | `5` | `9` |
| TC-286 ② | 자동 | 같음 | ⓐ 글자 요소 `style.left` / `style.top` | `'268px'` / `'403px'` | `'142px'` / `'458px'` |
| TC-286 ② | 자동 | 같음 | ⓐ 글자 요소 `style.transform` | `'translate(-50%, -50%) rotate(5deg)'` | `'translate(-50%, -50%) rotate(9deg)'` |
| TC-286 ② | 자동 | 같음 | 불변 — `enabled` false·`mode` stopwatch·`countdownSecs` 1500·`alarmVolume` 80·`fontSize` 36(`style.fontSize` `'36px'`)·`color` `#333333`(`style.color` `'rgb(51, 51, 51)'`)·글자 `'00:00:00'`, ⓒ `assetsChanged`(`M_NONE`) 뒤 `.pomodoro` 없음·`setSettings` 0회 | 같음 | 같음 |

- 제목: 「TC-286 ② (CR-053 개정): 설정에 timer 키가 없으면 DEFAULT_TIMER_SETTINGS(꺼짐·스톱워치·1500초·음량 80·142,458·9°·36px·#333333)로 그린다」. 픽스처 `TIMER_OFF`(옛 값 리터럴)는 사용자 저장 값 예라 그대로 둔다.

요구 ↔ TC(CR-053): 원 TC-286 본문의 요구ID 그대로(기본값 인용 변경 — 새 요구 없음). 설계 항목 ↔ TC(CR-053): design.md §4 `timer` 초기값(`DEFAULT_TIMER_SETTINGS` 인용) → TC-286 ②. 사용자행 ↔ TC-FLOW(CR-053): 새 사용자행 없음, TC-FLOW Steps 불변. CR ↔ TC(추가): CR-053 → 개정 TC-286 ② / 대기열 Q-06(상태 불변).

- 수: 변동 없음. 314번까지 = 유효 294건(자동 265 + 수동 29) + 폐기 20건. TC-FLOW 유효 19건 + 폐기 1건.
- 실행(보강 모드): `yarn test --run src/overlay/test/OverlayApp.pomodoro.test.tsx`.

## CR-055 알림음 1회 재생 복원 — 개정 TC (v2.3, 2026-09-27)

- **기준**: `src/overlay/requirements.md` R-39 🔒 원문(「동시에 **알림음 1회** 재생」·「음량 … 1회 재생(반복 없음)」·「스냅숏이 `finished`를 떠나면 … 재생 중인 소리를 멈춘다」·「등록한 파일 재생이 실패하면 내장 기본음으로 **한 번** 다시 시도」) · `src/overlay/design.md` 변경이력 CR-055 행·§10.15 15.2(판정표 3행 「1회 재생 시작(CR-055 — CR-052 반복 재생 폐기)」·재생 순서 「모두 `loop` 기본 `false`」·「1회 재생(CR-055 🔒 2026-09-27)」 규칙) · CR 대장 CR-055(사용자 🔒, 베타 테스터 피드백 — CR-052 반복 재생 부분 폐기) · 대기열 Q-07 · 소스 `src/overlay/hooks/useAlarmOnFinish.ts`(`start`의 `playSound(url, volume[, onFail])` 3곳 — 4번째 인자 없음 = `loop` false).
- **바뀌는 것은 반복 여부뿐(CR-052의 반대 방향)**: 등록 파일·기본음·실패 대체 기본음 모두 `loop` false(1회 재생). 불변: 정지 경로(판정표 6·7행 — 1회 재생이라도 재생 중 `finished` 이탈(`stopped`·`running`)·언마운트 → `halt()` pause·`currentTime` 0), 끝남 깜빡임 10초(R-38, `TimerText` `.blink`), 조회·대체·회차 폐기·음량 시점(TC-301·TC-305·TC-313), 공용 `playSound`의 `loop` 인자(기본 false — TC-299 ①이 계속 검증, 현재 `true` 호출처 없음), 설정 창 미리 듣기 1회.
- **신규 TC 번호 없음**: Q-07 「신규 TC 필요: 아니오」 — 기존 TC 기대값 개정으로 커버. 옛 CR-052 절의 `loop` true 기대는 이 절이 대체한다(그 절 머리 주석).

#### v2.3 개정표 — 기존 TC(CR-055)

| TC | 종류 | 스펙 | 옛 기대(CR-052) | 새 기대(CR-055) |
|---|---|---|---|---|
| TC-300 ① | 자동 | `useAlarmOnFinish.test.ts` | `Audio.loop` true(10초 동안 반복) | `loop` **false**(1회 재생) — 제목·설계 칸 「1회 재생 시작」 |
| TC-302 ① | 자동 | 같음 | 반복 중 소리(`loop` true)가 `stopped`에서 `pause` 1회·0, 다음 회차 `loop` true(단언 없음) | 1회 재생 중 소리(`loop` false)가 `stopped`에서 `pause` 1회·`currentTime` 0(정지 불변), 다음 회차 `Audio` `play` 1회·`loop` false(단언 추가) |
| TC-303 ①② | 자동 | 같음 | 등록·대체 기본음 `loop` [true, true] | [false, false] |
| TC-303 ③ | 자동 | 같음 | 대체 기본음 `loop` true → `stopped`에서 반복 멈춤 | `loop` false → 재생 중 `stopped`면 `pause` 1회·0(정지 불변) |
| TC-303 ④ | 자동 | 같음 | `error` 뒤 대체 기본음 `loop` true | 등록·대체 기본음 `loop` [false, false] |
| TC-304 ①② | 자동 | 같음 | ① 등록 없음 기본음 `loop` true, ② `src`만 단언 | ① `loop` false ② 조회 실패 기본음 `volume` 0.8·`play` 1회·`loop` false(단언 추가) |
| TC-307 | 자동 | `OverlayApp.timerMode.test.tsx` | `a.loop` true(CR-052) | `loop` false — 10초 동안 `pause` 0회·새 `Audio` 없음·`stopped`에 `pause` 1회는 불변 |
| TC-311 | 수동(MC-29) | `manual-checklist.md` | 기본음이 깜빡이는 10초 동안 되풀이 → 종료 때 멈춤 | 기본음(삐 3번) **한 번**, 되풀이되면 FAIL, 끝남 중 다시 표시해도 재울림 없음 |
| TC-312 | 수동(MC-30) | `manual-checklist.md` | ① mp3 10초 동안 반복 재생 ③ 기본음 10초 동안 되풀이 ⑥~⑧ 기본음으로 반복 중 정지 | ① mp3 1회 재생이 10초 깜빡임 종료와 함께 멈춤 ③ 기본음 한 번만(되풀이 FAIL) ⑥~⑧ **등록 mp3**(1분 넘는 파일)로 재생 중 「멈춤」·「시작」·끄기 → 바로 정지, ⑦ 새 회차 다시 1회 |
| TC-299 ① | 자동 | `alarmSound.test.ts` | — | 재확인(불변) — 공용 `loop` 인자 자체 검증 유지. 주석만 「CR-055 뒤 오버레이는 true로 부르지 않음」 |
| TC-301 · TC-302 ②③ · TC-305 · TC-308 · TC-309 · TC-313 | 자동 | `useAlarmOnFinish.test.ts` · `OverlayApp.timerMode.test.tsx` | — | 재확인(불변 — `loop` 단언 없음, 울림 판정·조회·음량·정지 조건 그대로) |

요구 ↔ TC(CR-055)

| 요구ID | 자동 TC | 수동 |
|---|---|---|
| R-39(「알림음 1회」·「1회 재생(반복 없음)」 — CR-055로 원문 복귀) | TC-300 ①, TC-302 ①, TC-303 ①~④, TC-304 ①②, TC-307 | TC-311(MC-29) ⓐ, TC-312(MC-30) ①③ |
| R-39(「`finished`를 떠나면 재생 중인 소리를 멈춘다」 — 1회 재생에서도 유지) | TC-302 ①②③, TC-303 ③, TC-307, TC-308 ① | TC-312 ①⑥⑦⑧ |
| R-38(깜빡임 10초 불변 — 소리 1회와 무관하게 유지) | TC-307(10초 뒤 `.blink` 유지) | TC-312 ① ⓐ |

설계 항목 ↔ TC(CR-055)

| 설계 항목 | TC |
|---|---|
| design.md §10.15 15.2 판정표 3행 「1회 재생 시작(CR-055)」 | TC-300 ①, TC-307 |
| 15.2 재생 순서 「모두 `loop` 기본 `false`」(등록 파일·기본음·`playDefault`) | TC-300 ①, TC-303 ①③④, TC-304 ①② |
| 15.2 「1회 재생(CR-055 🔒)」 규칙 — 소리가 나는 중 `finished`를 떠나면 `halt()` | TC-302 ①, TC-303 ③, TC-312 ⑥⑦⑧ |
| 15.2 「`playSound`의 `loop` 인자(공용 유틸)는 남아 있으나 현재 `true`로 부르는 곳이 없다」 | TC-299 ①(인자 자체), TC-300 ①·TC-303·TC-304(훅 호출이 `loop` false) |
| design.md 변경이력 CR-055 행(깜빡임 10초·설정 창 미리 듣기 불변) | TC-307(`.blink` 10초 유지) · settings 미리 듣기는 settings `test/scenarios.md` 소관(이 패스 변경 없음) |

사용자행 ↔ TC-FLOW(CR-055): 새 사용자행 없음. TC-FLOW Steps 불변 — S-20 → TC-FLOW-20 Step 1 「등록 알림음 1회」·Step 5 「알림음 1회」·Step 9 「10초 깜빡임과 함께 소리 정지 … 기본값이면 기본음」은 CR-055 기대와 이미 일치한다(CR-052 절의 「`loop` true로 읽는다」 규약은 폐기). S-19 → TC-FLOW-19 Step 3(TC-307)도 개정 기대(`loop` false)로 읽는다.

CR ↔ TC(추가): CR-055 → 개정 TC-300 ①·TC-302 ①·TC-303 ①~④·TC-304 ①②·TC-307·TC-311(MC-29)·TC-312(MC-30) / 재확인 TC-299 ①·TC-301·TC-302 ②③·TC-305·TC-308·TC-309·TC-313 / 대기열 Q-07 → `전환됨`. CR-052 → 반복 재생 기대 폐기(TC-299 ① 공용 인자 검증·TC-312 ⑥~⑧ 정지 절차만 유효).

- 수: 변동 없음. 314번까지 = 유효 294건(자동 265 + 수동 29) + 폐기 20건. TC-FLOW 유효 19건 + 폐기 1건.
- 실행(보강 모드 — 변경에 걸리는 TC만): `yarn test --run src/overlay/test/useAlarmOnFinish.test.ts src/overlay/test/OverlayApp.timerMode.test.tsx src/overlay/test/alarmSound.test.ts`. 수동: MC-29·MC-30(MC-28 PASS 빌드 전제).

## CR-058·CR-061 내장 기본음 번들 mp3·0.4.0 기본값 — 개정 TC (v2.4, 2026-09-29)

- **기준**: `src/overlay/requirements.md` **v3.1**(R-34 글자 기본 (268,402)·7°, R-39 「음량 기본 44%」·「내장 기본음 = 사용자가 지정한 mp3를 앱에 번들한 파일(`src/assets/sounds/default-alarm.mp3`)」 — CR-058 🔒 2026-09-28, 요구ID 증감 없음) · `src/overlay/design.md` §4 `timer` 초기값(contract v0.27 §3.3)·§7 `TimerSettings.alarmVolume?` 행(없으면 44)·§10.15 15.3 「내장 기본음 = 번들 mp3 자산(CR-058)」 행·15.4(기본음 = 번들 정적 자산 URL, 런타임 생성물 없음)·15.7 TC-286·TC-297~TC-299 행 · `design/functions.md` §5.7 ②(CR-061 `const initial = calcNow()` 1회 — 동작 불변)·④(`DEFAULT_ALARM_VOLUME = DEFAULT_TIMER_SETTINGS.alarmVolume ?? 44`·`defaultAlarmUrl` = 번들 자산 반환·`alarmGain` 예 「없음·NaN → 0.44」·폐기 목록) · CR 대장 CR-058(적용·미검증)·CR-061(적용·미검증 — 순수 리팩터, 「TC 신규 없음」).
- **스펙은 이미 개정·통과**(관리자 전달 — 전건 801 PASS): `alarmSound.test.ts` TC-297·TC-298·TC-299 ⑤, `OverlayApp.pomodoro.test.tsx` TC-286 ②. 이 패스는 문서를 설계·스펙에 맞추는 동기화이며 스펙 로직은 바꾸지 않는다. `alarmSound.test.ts`는 머리 주석의 「design 문서가 옛 합성음 서술(동기화 대기)」·「ui-test-designer 정리 필요」 문구만 정정했다(코드·단언 불변).
- **신규 TC 없음**(요구 밖 TC 금지 — CR-058은 기존 TC 기대값 개정, CR-061은 동작 불변 리팩터라 기존 TC-297·TC-295가 그대로 커버).

#### v2.4 개정표 — 기존 TC(CR-058·CR-061)

| TC | 종류 | 스펙 | 옛 기대 | 새 기대 |
|---|---|---|---|---|
| TC-297 | 자동 | `alarmSound.test.ts` | `synthBeepWav` — 상수 8개 [22 050, 880, 150, 100, 3, 10, 0.5, 80]·RIFF 머리·길이 28 712·결정적·파형 경계·`Audio` 0개 | `DEFAULT_ALARM_VOLUME` === 44·`Audio` 0개(제목·요구·설계 칸 교체) |
| TC-298 | 자동 | 같음 | `URL.createObjectURL` stub·`vi.resetModules()` → 두 번 `'blob:beep'`·`createObjectURL` 1회·`Blob`(`audio/wav`, 28 712)·`Audio` 0개 | 두 번 모두 `defaultAlarmAsset`(스펙이 import한 번들 mp3 URL)과 같은 문자열·`Audio` 0개 |
| TC-299 ⑤ | 자동 | 같음 | `alarmVolume` 없음·NaN → 0.8 | 없음·NaN → **0.44**(80·0·150·−5 → 0.8·0·1·0 불변), `Audio` 0개 단언을 본문에 명시 |
| TC-286 ② | 자동 | `OverlayApp.pomodoro.test.tsx` | (v2.2 CR-053) `DEFAULT_TIMER_SETTINGS` `alarmVolume` 80·`textPos` (142,458)·`rotation` 9, 글자 `142px`·`458px`·`rotate(9deg)` — 본문 ⓐⓑ에는 v1.9 값(80·268,403·5)이 남아 있었음 | `alarmVolume` 44·`textPos` (268,402)·`rotation` 7, 글자 `268px`·`402px`·`rotate(7deg)` — 본문 ⓐⓑ를 새 값으로 고쳐 씀, 요구 칸에 R-39(기본 음량) 추가 |
| TC-310(MC-28) · TC-311(MC-29) · TC-312(MC-30) | 수동 | `manual-checklist.md` | 「기본음(삐 3번)」 / MC-30 ⑥ 근거 「기본음은 1초 안에 끝나 정지를 들을 수 없다」 | 「내장 기본음(번들 mp3 — 사용자 지정 음)」, 되풀이 FAIL 조건 = 같은 음이 처음부터 다시 시작됨(파일이 10초보다 길면 끝남 종료 때 멈춤도 PASS). MC-30 ⑥ 근거를 기본음 길이와 무관하게 — 정지 확인은 10초보다 확실히 긴 등록 파일로 하고, 기본음(34 061바이트)은 재생 길이가 설계 문서에 없어 정지 판정에 쓰지 않는다 |
| MC-27 ②(TC-290) | 수동 | `manual-checklist.md` | 기본 268,403 중심·5° | 기본 (268,402) 중심·7°(CR-058 — 타이머 설정을 바꾸지 않은 경우) |
| 공통 전제(v1.9) | — | — | `URL.createObjectURL` stub·`vi.resetModules()` / import 「상수 8개·`synthBeepWav`」 | 삭제 → 번들 자산 import 값 비교 / import `DEFAULT_ALARM_VOLUME`·`defaultAlarmUrl`·`alarmGain`·`playSound` / `'blob:default'` = mock 식별 문자열·0.8 = `gain` 인자 픽스처 명시 |
| 추적표 v1.9 설계 행 | — | — | 15.3 `BEEP_AMPLITUDE` → TC-297 · 15.4 「Blob URL 창당 1개」 → TC-298 · §5.7 ④ `synthBeepWav` → TC-297 · 15.2 행 TC-311 「삐 3번」 | 15.3 번들 mp3·44 → TC-298·TC-297·TC-299 ⑤·TC-310~TC-312 · 15.4 번들 자산 URL → TC-298 · §5.7 ④ `DEFAULT_ALARM_VOLUME` → TC-297, 자산 import·`defaultAlarmUrl` → TC-298, 폐기 항목 표기 · TC-311 「내장 기본음 한 번」 |

#### v2.4 유지 판정 — 옛 기본값과 같은 숫자지만 픽스처라 바꾸지 않는 값(스펙 코드로 판정)

| TC | 스펙 | 값 | 판정 | 근거(스펙 코드) |
|---|---|---|---|---|
| TC-266 | `timerClock.test.ts` | `DEF` {268,403, 5} → left 268·top 403·`rotate(5deg)` | 유지 | 39~45행 지역 동결 상수 `DEF` — `DEFAULT_TIMER_SETTINGS`를 import하지 않음. 본문은 Given 「동결한 기본값」 → 「동결한 픽스처」, 설계 칸 R-34 인용만 정정 |
| TC-276 · TC-279 | `pomodoro.test.tsx` | `TIMER_ON`(268,403·5) → `268px`·`403px`·`rotate(5deg)` | 유지 | 75~76행 지역 상수 `TIMER_OFF`·`TIMER_ON` |
| TC-296 | `TimerText.blink.test.tsx` | `CD_ON`(alarmVolume 80·268,403·5) → `rotate(5deg)` | 유지 | 58행~ 지역 상수 `CD_ON` |
| TC-299 ⑤ 기준 픽스처 | `alarmSound.test.ts` | `base` {268,403, 5}(`alarmVolume` 키 없음) | 유지 | 201행 지역 리터럴 — 폴백 경로를 보려고 `alarmVolume`을 뺀 것 |
| TC-300 · TC-302~TC-305 | `useAlarmOnFinish.test.ts` | `volume` 0.8 | 유지 | 87행 `setup(…, gain = 0.8)` — 훅에 gain을 직접 넘김(기본 음량과 무관) |
| TC-307 · TC-313 | `OverlayApp.timerMode.test.tsx` | `volume` 0.8 / 0.3·0.5 | 유지 | 127행~ `CD_ON.alarmVolume: 80` 명시 / `withTimer({ …CD_ON, alarmVolume: 30·50 })` |
| TC-282~TC-285 · TC-287 · TC-288 | `OverlayApp.pomodoro.test.tsx` | `TIMER_OFF`·`TIMER_ON`(268,403·5) | 유지 | 116~117행 지역 상수. 이 스펙에서 글자 `left`·`top`·`rotate` 픽셀을 기본값으로 단언하는 곳은 TC-286 ②(현행 기본값으로 개정됨)뿐 |

- 스펙 잔재(판정 영향 없음): `TimerText.blink.test.tsx`(98~111행)·`OverlayApp.timerMode.test.tsx`(머리 주석 8행·183~198행)에 옛 `URL.createObjectURL` stub(`'blob:default'`)이 남아 있으나 CR-058 뒤 어떤 코드도 부르지 않고 어떤 TC도 관찰·단언하지 않는다 — 기대 불변, 전제에서 뺐다. `timerClock.test.ts` 머리 주석의 「requirements R-34(… 기본 268,403·5° …)」도 옛 인용이다. 둘 다 이 패스 자원 경계 밖(코드·주석 미변경) — 스펙 정리 후보로 보고.

요구 ↔ TC(v2.4)

| 요구ID | 자동 TC | 수동 |
|---|---|---|
| R-39(「음량 기본 44%」 — CR-058) | TC-297, TC-299 ⑤, TC-286 ② ⓑ(`alarmVolume` 44) | — |
| R-39(「내장 기본음 = 번들 mp3」 — CR-058) | TC-298, TC-303·TC-304(기본음 경로 — 재확인, mock URL) | TC-310(MC-28), TC-311(MC-29), TC-312 ③(MC-30) |
| R-34(글자 기본 (268,402)·7° — CR-058) | TC-286 ② | TC-290(MC-27 ②) |

설계 항목 ↔ TC(v2.4)

| 설계 항목 | TC |
|---|---|
| design.md §4 `timer` 초기값(`DEFAULT_TIMER_SETTINGS` — contract v0.27 §3.3) | TC-286 ② |
| design.md §7 `TimerSettings.alarmVolume?`(없으면 44) 행 | TC-299 ⑤, TC-297 |
| design.md §10.15 15.3 「내장 기본음 = 번들 mp3 자산(CR-058)」 행 — 자산 import·`defaultAlarmUrl` 시그니처 불변·호출부 무변경·기본 음량 단일 소스(CR-061) | TC-298 · TC-298 · TC-300~TC-305(재확인 — 호출부 `useAlarmOnFinish` 불변) · TC-297 |
| design.md §10.15 15.4 기본음 = 번들 정적 자산 URL(런타임 생성물 없음) | TC-298 |
| design.md §10.15 15.7 TC-286 · TC-297 · TC-298 · TC-299 행 | TC-286 ② · TC-297 · TC-298 · TC-299 ⑤ |
| design/functions.md §5.7 ④ import(`DEFAULT_TIMER_SETTINGS`·자산) · 상수 `DEFAULT_ALARM_VOLUME` · `defaultAlarmUrl` · `alarmGain` 예 · 폐기 목록 | TC-297·TC-298 · TC-297 · TC-298 · TC-299 ⑤ · TC 대상 없음(폐기 — 옛 TC-297·TC-298 기대를 교체해 반영) |
| design/functions.md §5.7 ② CR-061 초기 동기화 `calcNow()` 1회(반환값·리렌더 시점 불변) | TC-295(재확인), TC-276·TC-287(재확인) |

상태 전이표(확정사항 §5) ↔ TC(v2.4): 변경 없음 — `src/state/inputMachine.ts` 불변.

사용자행 ↔ TC-FLOW(v2.4): 새 사용자행 없음. TC-FLOW Steps 불변 — S-20 → TC-FLOW-20 Step 7~9의 「기본음」은 번들 mp3(사용자 지정 음)로 읽는다. S-16 → TC-FLOW-16도 불변(TC-286 ②는 기본값 리터럴만 바뀜).

CR ↔ TC(추가): CR-058 → 개정 TC-286 ②·TC-297·TC-298·TC-299 ⑤·TC-310(MC-28)·TC-311(MC-29)·TC-312(MC-30)·TC-290(MC-27 ②) / 유지 판정 TC-266·TC-276·TC-279·TC-282~TC-285·TC-287·TC-288·TC-296·TC-300·TC-302~TC-305·TC-307·TC-313. CR-061 → 신규·개정 없음, 재확인 TC-297(값 44 불변)·TC-295(`useElapsedText` 동작 불변) — CR 대장 「TC 신규 없음」과 일치. 대기열: CR-058·CR-061 행이 「변경 대기열」 절에 없다(이 패스에서 만들지 않음).

- 수: 변동 없음. 314번까지 = 유효 294건(자동 265 + 수동 29) + 폐기 20건. TC-FLOW 유효 19건 + 폐기 1건.
- 실행(보강 모드 — 변경에 걸리는 TC만): `yarn test --run src/overlay/test/alarmSound.test.ts src/overlay/test/OverlayApp.pomodoro.test.tsx`. 회귀: `yarn test --run src/overlay/test/useAlarmOnFinish.test.ts src/overlay/test/OverlayApp.timerMode.test.tsx src/overlay/test/useElapsedText.countdown.test.tsx`. 수동: MC-27 ②·MC-28~MC-30(MC-28 PASS 빌드 전제).

## CR-062 오버레이 오른쪽 클릭 메뉴 — 기본 메뉴 억제 TC·회귀 지정·수동 MC-31~MC-45 (v2.5, 2026-09-29)

- **기준**: `src/overlay/requirements.md` **v3.2** R-40(🔒 U-1 누름·뗌 모두 창 사각형 안, 🔒 U-3 전체 화면이면 생략, 🔒 U-5 브라우저 기본 메뉴 없음, U-2 포커스 이동·U-4 잠금 중 아래 창 메뉴 경합 수용)·§1 R-28 용어 주(CR-062)·§2 S-21·§3 창 기능 「오른쪽 클릭 메뉴」 행(계약 없음) / `src/overlay/design.md` §2 ASCII `.root` `onContextMenu` 줄·§6 P-10·§7 창 기능(CR-062) 행·계약 사용표 CR-062 행·§9(`design/a11y.md` 오른쪽 클릭)·§10.9.1 L-7·L-8·**§10.16**(16.1 책임 나눔·「ui가 하지 않는 것」·핸들러 위치, 16.2 상태별 동작 6행·포커스·메뉴 열린 동안 입력 반응, 16.3 불변·잔여 위험, 16.4 검증)·RTM R-28·R-40 / `design/functions.md` §5.1 `preventContextMenu` / `design/components.md` §3 `OverlayApp` 행(CR-062) / 횡단 설계 `doc/200_설계/architecture/overlay-context-menu.md` §7 MC-31~MC-45 원문·§2.10 R1~R7·§2.13 / contract v0.27 유지(새 command·event·래퍼·타입 없음).
- **범위 규칙**: 메뉴 표시·판정(창 사각형·누름/뗌·숨김·전체 화면)·항목 동작·중복 가드는 core(tray·hook) 몫이라 vitest로 흉내 내지 않는다 → 수동 TC-316~TC-330(MC-31~MC-45). 자동 TC는 ui 몫(WebView2 기본 메뉴 억제) 1건(TC-315, it 2개). 회귀는 기존 TC 번호로 참조만 한다(기대 불변).
- §0.3 보충 — **CR-062 red**(소스 미적용 — `index.tsx`에 `onContextMenu` 없음): TC-315 ① 반환값 3건(`true`)·`document` 도달 시 `defaultPrevented`(`[false, false, false]`), TC-315 ② contextmenu 반환값 1건만 실패가 정상. 나머지 단언(DOM·상태·포커스·bridge 호출 불변·export 없음·오른쪽 클릭 파츠)은 적용 전후 모두 Green — 회귀 방지. 새 타입·래퍼가 없어 `yarn tsc --noEmit` 영향 없음.
- **잔여 위험(수용 — design.md §10.16 16.3)**: 앱 시작 직후 `src/main.tsx`의 `./overlay` 지연 로딩 동안(`OverlayApp` 마운트 전)은 `.root`가 없어 WebView2 기본 메뉴가 억제되지 않는다. 동작 정의가 아니라 수용된 위험이라 TC 대상이 아니다. 수동 MC는 오버레이 그림이 보인 뒤에 수행하고, 그 전 구간에서 기본 메뉴를 봤다면 FAIL이 아니라 비고에만 적는다(`manual-checklist.md` CR-062 절 공통 주).
- **대기열**: CR-062 소스가 아직 적용되지 않아 「변경 대기열」에 행을 만들지 않았다. 적용 뒤 CR 대장 절차로 행이 생기면 TC-315·아래 회귀 TC로 전환한다.

#### 화면 통합 — `OverlayApp` (스펙 `src/overlay/test/OverlayApp.contextMenu.test.tsx`)

### TC-315 · WebView2 기본 메뉴 억제 — `.root` `onContextMenu` = `preventDefault` 하나뿐(투명한 자리·그림 위), 전파·DOM·상태·포커스·bridge 불변, 실제 순서에서 오른쪽 클릭 파츠 그대로 · 종류: 자동 · 요구: R-40(「브라우저 기본 오른쪽 클릭 메뉴(뒤로·새로 고침·검사 등)는 뜨지 않는다(🔒)」), R-09, R-01 · 설계: design.md §10.16 16.1 마지막 행(ui `.root` `onContextMenu={preventContextMenu}`)·「ui가 하지 않는 것」(메뉴 그리기·bridge 호출·`e.stopPropagation()` 없음)·핸들러 위치(`.root` 한 곳 — 그림 위 이벤트도 `.root`에 닿음)·16.3 불변(`data-tauri-drag-region`, `input://mouse-button` 영향 없음)·16.4 vitest 행, §2 ASCII `.root` `onContextMenu -> preventDefault only` 줄, §6 P-10 ①③·오류 칸(예외 없음·문구 없음), §7 창 기능(CR-062) 행·계약 사용표 CR-062 행(bridge와 무관), design/functions.md §5.1 `preventContextMenu`(출력 = `preventDefault` 하나·부작용 없음·export 없음·예외 없음), design/components.md §3 `OverlayApp` 행(CR-062 — 메뉴 컴포넌트 렌더 없음), design/a11y.md 오른쪽 클릭(DOM에 메뉴 요소·role·포커스 대상이 생기지 않음) · **신규(CR-062)**
- Given 비잠금 `SETTINGS`(`DEFAULT_SETTINGS` 상속 — `positionLock false`, 타이머 꺼짐, `mouse.penMode false`)·`MANIFEST` = `kb_up`·`kb_down_0`·`mouse_base`·`mouse_left`·`mouse_right`(900×700, 펜·헤어·뽀모도 없음)로 마운트(T0), 조회·구독 완료. 기준값 = 그 시점의 `container.innerHTML`·`document.activeElement`·bridge mock 호출 수(`bridge/commands`·`bridge/events`의 **모든** mock 함수 — `getScreenBounds`·`getTimer`·`setResting`·`getAlarmSound`·`onTimerChanged` 포함). ①은 `document`에 `contextmenu` 버블 리스너(도달 시 `defaultPrevented` 기록)를 단다. ②는 새 마운트
- When ① `fireEvent.contextMenu`를 `.root`(투명한 자리) → 키보드 img(`u:kb_up`) → 팔 img(`.armWrap img`) 순서로 3회 ② `input://mouse-button` 오른쪽 누름 → 오른쪽 뗌 → `.root`에 `fireEvent.contextMenu` → 오른쪽 누름 → 오른쪽 뗌
- Then ⓐ 화면: ① 세 번 모두 반환값 `false`(= `defaultPrevented`), `.root` class `root`·`data-tauri-drag-region` 속성 유지, `container.innerHTML`이 기준값과 같음, `[role="menu"]`·`[role="menuitem"]` 요소 0개, `textContent` `''` ② 팔 img src `u:mouse_right` → `u:mouse_base` → contextmenu 반환값 `false`·`innerHTML` 직전과 같음·src `u:mouse_base` 그대로 → `u:mouse_right` → `u:mouse_base`, 끝에 키보드 `['u:kb_up']`·`.jellyWrap` class `jellyWrap`(펜 모드 아님 — 클릭 바운스 없음)·`textContent` `''` ⓑ 상태: ① `document` 리스너 수신 `[true, true, true]`(전파 유지 = `stopPropagation` 없음, 도달 시 이미 취소됨), dispatch 없음(팔 `u:mouse_base`·키보드 `['u:kb_up']`·`.jellyWrap` `jellyWrap` 그대로), `document.activeElement` 기준값과 같음, `'preventContextMenu' in (index 모듈)` = `false`(모듈 수준 상수 — export 없음) ② `machine.mouse.button` right → none → (contextmenu로 변화 없음) → right → none ⓒ bridge: ①② 모두 모든 command·event 래퍼 호출 수가 기준값과 같음(증가 0 — `setSettings` 0회, `getScreenBounds` 0회, 구독 재등록 없음). ②의 입력은 기존 `input://mouse-button` 페이로드 `{ button: 'right', pressed, ts }`뿐
- 비고: 메뉴가 뜨는지·전체 화면 생략·잠금 중 동작은 core 몫이라 이 TC가 단언하지 않는다(TC-316~TC-330). 잠금 중에는 WebView에 `contextmenu`가 오지 않는 것이 설계 전제(§10.9.1 L-8)라 잠금 픽스처로 흘려 넣지 않는다 — 잠금 값과 무관하게 DOM이 같다는 것은 TC-227 ①(재확인). 모듈 수준 상수·react `MouseEvent` 타입·`.root` 한 곳 부착처럼 실행으로 구별되지 않는 구현 형태는 `manual-checklist.md` 코드 리뷰 RV-02
- 스펙: `src/overlay/test/OverlayApp.contextMenu.test.tsx`(it 2개 — `TC-315 ①`·`TC-315 ②`)

#### 회귀 지정 — 기존 TC 번호로 참조만(design.md §10.16 16.3·16.4 회귀 행, 기대 불변)

| 요구 | 회귀 TC | 확인하는 것 |
|---|---|---|
| R-09 | TC-013 · TC-039 · TC-062 | 상태기계 전이표 행6 마우스 클릭(오른쪽 누름 = `button right`, 뗌 = `none`) · `MouseArm` `button right` → `u:mouse_right` · `OverlayApp` P-4 left → none → right(`u:mouse_right`) |
| R-26 | TC-214 · TC-218 · TC-219 | 펜 모드 오른 클릭 = 손 누름 그림·젤리 + `u:mouse_right`(규칙 1~3) · 좌우 동시 누름에서 한쪽 뗌(규칙 13) · 펜 모드 아님 = 오른 클릭 파츠만(규칙 14). 기대는 각 TC 본문 + v1.6 CR-042 개정표 그대로 |
| R-04 | TC-071 · TC-073 · TC-077 · 수동 TC-088(MC-06) | Ctrl+휠 한 칸 저장 · Ctrl 없는 휠 무시 · 그림 위 휠도 `.root`가 받음 · 실제 WebView 휠 |
| R-12 · R-28(재확인) | TC-077 · TC-227 ① | `.root` `data-tauri-drag-region` 유지 · 잠금 값과 무관한 같은 DOM(`onContextMenu`는 DOM 속성이 아니라 `innerHTML` 비교에 영향 없음) |

#### 수동 — `src/overlay/test/manual-checklist.md` 「CR-062」 절 MC-31~MC-45

공통 Given(TC-316~TC-330): 실제 앱 — dev(`/dev-start`)와 release exe **각각**(횡단 설계 §7), CR-062 적용 빌드(core hook `RightClick` 채널·tray 팝업·전체 화면 판정 + ui `preventContextMenu`), 공통 준비 이미지, 오버레이 그림이 화면에 보인 뒤 시작(그 전 로딩 구간은 수용된 잔여 위험 — 판정 제외). 공통 ⓒ: 새 command·event 없음(contract v0.27) — ui의 bridge 호출 증가 0은 TC-315가 증명하므로 수동에서는 오류 줄(dev `.dev-tauri.log`) 없음만 본다. 결과는 core `tray.md` §8.3에도 같이 적는다(횡단 설계 §4.5).

### TC-316 · 비잠금 메뉴 1개·브라우저 메뉴 없음(그림 위·투명한 모서리) · 종류: 수동(MC-31) · 요구: R-40, R-09 · 설계: design.md §10.16 16.1 2행(창 사각형 — 투명 부분 포함)·6행(ui 억제)·16.2 1행, §6 P-10 ①②③, 횡단 설계 §2.13(지연 목표 < 100ms — 관찰) · **신규(CR-062)**
- Given 공통, 위치 잠금 꺼짐, 오버레이 표시, 타이머 끔
- When MC-31: 오버레이 그림 위와 투명한 모서리 위에서 각각 오른쪽 클릭
- Then ⓐ 화면: 두 곳 모두 트레이와 같은 메뉴가 커서 위치에 **1개**, 브라우저 메뉴(뒤로·새로 고침·검사 등) 없음, 체감 지연 없음. (관찰) 누르는 동안 마우스 파츠가 오른클릭 그림으로 바뀌었다가 떼면 돌아온다(R-09 기존대로) ⓑ 상태: 메뉴를 Esc로 닫으면 `settings.json` 변화 없음(오른쪽 클릭 자체는 아무것도 저장하지 않음) ⓒ core·bridge: 오류 줄 없음, 메뉴가 뜬 화면 스크린샷 경로 기록(횡단 설계 §6.3 수용 기준 — 사용자가 앱 실행을 허락할 때만)

### TC-317 · 메뉴 동일성 — 타이머 3상태의 항목·순서·문구·구분선 · 종류: 수동(MC-32) · 요구: R-40 · 설계: design.md §10.16 16.1 5행(`build_menu`·`current_view` 공유), 횡단 설계 §2.5 · **신규(CR-062)**
- Given 공통, 위치 잠금 꺼짐
- When MC-32: 타이머 ① 끔 ② 켬·정지 ③ 켬·흐르는 중 상태마다 트레이 메뉴와 오버레이 메뉴를 캡처
- Then ⓐ 화면: 세 상태 모두 두 메뉴의 항목·순서·문구·구분선이 같다 — ① 4항목(「설정 열기」·「새로고침」·「오버레이 표시/숨김」·「종료」) ② 「시작」·「멈춤」 + 구분선 + 4 ③ 「일시정지」·「멈춤」 + 구분선 + 4 ⓑ 상태: `settings.json` `timer.enabled`는 준비한 값 그대로(캡처는 아무것도 바꾸지 않음) ⓒ core·bridge: 캡처 6장 경로 기록, 오류 줄 없음

### TC-318 · 항목 동작 = 트레이와 같음, 한 번 고른 동작은 1회 · 종류: 수동(MC-33) · 요구: R-40, R-28(용어 주 — 잠금 중에도 메뉴 「설정 열기」로 설정 창) · 설계: design.md §10.16 16.1 5행(기존 전역 `on_menu_event`), §10.9.1 L-7 · **신규(CR-062)**
- Given 공통, 잠금 여부 무관(TC-FLOW-21 Step 2는 잠금 켬), 타이머 켬·시작 시간 준비
- When MC-33: 오버레이 메뉴에서 차례로 ① 설정 열기 ② 새로고침 ③ 시작/일시정지 ④ 멈춤 ⑤ 표시/숨김 ⑥ (트레이로 다시 표시) ⑦ 종료
- Then ⓐ 화면: 트레이에서 고른 것과 같다 — ① 설정 창이 한 개만 앞으로 온다 ② 오버레이가 다시 불러와진다 ③④ 오버레이 글자와 설정 창 타이머가 함께 바뀐다 ⑤⑥ 숨긴 뒤 트레이로 복귀할 수 있다 ⑦ 앱이 종료된다. **한 번 고른 동작이 두 번 실행되지 않는다**(⑤ 뒤 오버레이가 저절로 다시 보이지 않음) ⓑ 상태: `settings.json` `overlay.visible` ⑤ `false` → ⑥ `true`, `positionLock`은 준비값 그대로(메뉴는 잠금을 바꾸지 않음 — 해제는 설정 창에서만) ⓒ core·bridge: 설정 창 타이머 갱신은 기존 `timer://changed`로(새 계약 없음), 오류 줄 없음

### TC-319 · 🔒 잠금 중 메뉴·아래 창 전달 · 종류: 수동(MC-34) · 요구: R-40(「위치 잠금 중에도 뜬다(🔒)」·「아래 창에도 그대로 전달」), R-28 · 설계: design.md §10.16 16.2 2행, §10.9.1 L-8, §6 P-10 ④, 횡단 설계 §2.10 R3(U-4 수용) · **신규(CR-062)**
- Given 공통, 위치 잠금 켬, 오버레이 아래에 ① 메모장 ② 창 모드 게임 또는 그림판
- When MC-34: ①② 위 오버레이를 각각 오른쪽 클릭
- Then ⓐ 화면: 두 경우 모두 오버레이 메뉴(트레이와 같은 메뉴)가 뜬다, 오른쪽 클릭이 아래 창에도 전달된다(아래 창의 오른쪽 클릭 반응으로 확인), 브라우저 기본 메뉴는 없다(잠금 중 WebView는 클릭을 받지 않음 — L-8). ①에서 메모장 자체 메뉴와 경합하는 결과는 **관찰만** 하고 비고에 적는다(U-4 수용 — 판정 외) ⓑ 상태: 오버레이 위치·배율 불변, `positionLock true` 유지 ⓒ core·bridge: 오류 줄 없음

### TC-320 · 숨김이면 메뉴 없음 · 종류: 수동(MC-35) · 요구: R-40(「오버레이가 숨겨져 있으면 뜨지 않는다」) · 설계: design.md §10.16 16.1 3행(`overlay_screen_rect` → `None`)·16.2 5행 · **신규(CR-062)**
- Given 공통, 트레이로 오버레이를 숨김(잠금 여부 무관)
- When MC-35: 옛 자리를 오른쪽 클릭
- Then ⓐ 화면: 오버레이 메뉴가 뜨지 않는다(아래 창 자체 반응만) ⓑ 상태: `overlay.visible false` 그대로 ⓒ core·bridge: 오류 줄 없음

### TC-321 · 🔒 누름/뗌 경계(U-1)·키 누른 채 반복 · 종류: 수동(MC-36) · 요구: R-40(「누른 곳·뗀 곳 모두」 창 사각형 안) · 설계: design.md §10.16 16.1 1·2행·16.2 4행(ui 핸들러 = 관찰 항목), 횡단 설계 §2.4·§3 AC-5·AC-7 · **신규(CR-062)**
- Given 공통, 위치 잠금 꺼짐(잠금 켬 반복은 선택 — 판정 같음), 오버레이 표시
- When MC-36: 오른쪽 버튼을 ① 오버레이 안에서 누르고 밖에서 떼기 ② 밖에서 누르고 안에서 떼기 ③ 키를 누른 채 오른쪽 클릭 반복(메뉴가 뜨면 바깥 좌클릭으로 닫고 다음 클릭)
- Then ⓐ 화면: ①② 오버레이 메뉴 없음 ③ 오른쪽 클릭마다 메뉴 1개, 엉뚱한 때 뜨는 메뉴 없음. (관찰 — 판정 외) ①②에서 브라우저 기본 메뉴가 보였는지를 비고에 적는다(design.md §10.16 16.2 4행 「불릴 수도 있음 — 관찰 항목」. 보였다면 관리자에게 보고) ⓑ 상태: `settings.json` 변화 없음 ⓒ core·bridge: 오류 줄 없음

### TC-322 · 열린 메뉴 — 두 번째 메뉴 없음·바깥 클릭/Esc로 닫힘(잠금 중 포함) · 종류: 수동(MC-37) · 요구: R-40(「한 번의 클릭에 메뉴가 둘 이상 뜨지 않는다」), R-28 · 설계: design.md §10.16 16.1 5행(중복 팝업 가드 `POPUP_OPEN`)·16.2 6행, design/a11y.md(Esc = OS 메뉴 기본 동작), 횡단 설계 §2.10 R4 · **신규(CR-062)**
- Given 공통, 오버레이 메뉴를 연 상태 — 위치 잠금 꺼짐으로 한 번, 켬으로 한 번
- When MC-37: ① 오버레이 위 오른쪽 클릭 ② 바깥 좌클릭 ③ Esc(②③은 메뉴를 다시 연 뒤 수행)
- Then ⓐ 화면: ① 두 번째 메뉴가 뜨지 않는다 ②③ 메뉴가 닫힌다 — **잠금 중에도 닫힌다**(R4). 잠금 중 닫히지 않으면 FAIL, core 세션으로 되돌린다(횡단 설계 §2.10 R4) ⓑ 상태: `settings.json` 변화 없음 ⓒ core·bridge: 오류 줄 없음

### TC-323 · 트레이 메뉴와 겹침(관찰) · 종류: 수동(MC-38) · 요구: R-40 · 설계: design.md §10.16 16.2 6행, 횡단 설계 §2.9(관찰 MC-38) · **신규(CR-062)**
- Given 공통, 트레이 메뉴를 열어 둠
- When MC-38: 오버레이를 오른쪽 클릭
- Then ⓐ 화면: 동시에 두 메뉴가 남지 않는다 — **관찰만**(결과를 비고에 적는다. 두 메뉴가 남아도 FAIL로 끝내지 않고 관리자에게 보고) ⓑ 상태: `settings.json` 변화 없음 ⓒ core·bridge: 오류 줄 없음

### TC-324 · 창 모드 게임·포커스(🔒 U-2 기록) · 종류: 수동(MC-39) · 요구: R-40(「포커스가 메뉴로 옮겨 가고 닫힌 뒤 자동으로 돌아가지 않는다(수용)」), R-28 · 설계: design.md §10.16 16.2 아래 두 줄(포커스 자동 복귀 없음·메뉴 열린 동안 `input://*` 반응), design/a11y.md 오른쪽 클릭, 횡단 설계 §2.10 R1·R5 · **신규(CR-062)**
- Given 공통, **테두리 있는 창 모드** 게임, 위치 잠금 켬
- When MC-39: 오버레이 메뉴를 열었다 닫은 뒤 키 입력
- Then ⓐ 화면: 메뉴가 뜬다(판정). 메뉴가 열린 동안에도 키 입력에 오버레이가 반응하는지(관찰), 닫은 뒤 게임 입력이 돌아오는 데 클릭이 필요한지는 **기록만**(수용된 동작 — 판정 외) ⓑ 상태: `settings.json` 변화 없음 ⓒ core·bridge: 오류 줄 없음

### TC-325 · 🔒 테두리 없는 전체 화면 — 메뉴 없음 · 종류: 수동(MC-40) · 요구: R-40(「전체 화면이면 띄우지 않는다(🔒)」), R-28 · 설계: design.md §10.16 16.1 4행·16.2 3행, 횡단 설계 §2.14·§3 AC-8 · **신규(CR-062)**
- Given 공통, 테두리 없는 창 모드 전체 화면 게임이 전경, 위치 잠금 켬
- When MC-40: 누름·뗌 모두 오버레이 위에서 오른쪽 클릭
- Then ⓐ 화면: **메뉴가 뜨지 않는다.** 게임 포커스가 유지되고 게임은 오른쪽 클릭을 받는다 ⓑ 상태: `settings.json` 변화 없음 ⓒ core·bridge: 오류 줄 없음

### TC-326 · 🔒 독점 전체 화면 — 메뉴 없음·최소화 없음 · 종류: 수동(MC-41) · 요구: R-40 · 설계: design.md §10.16 16.1 4행·16.2 3행, 횡단 설계 §2.10 R2·§2.14 · **신규(CR-062)**
- Given 공통, 독점 전체 화면 게임이 전경
- When MC-41: 오버레이가 있던 자리를 오른쪽 클릭
- Then ⓐ 화면: **메뉴가 뜨지 않고, 게임이 최소화되거나 화면이 전환되지 않는다** ⓑ 상태: `settings.json` 변화 없음 ⓒ core·bridge: 오류 줄 없음

### TC-327 · 최대화 창(테두리 있음) — 메뉴 뜸 · 종류: 수동(MC-42) · 요구: R-40(「테두리가 있는 창 모드(최대화 포함) … 이 전경이면 뜬다」), R-28 · 설계: design.md §10.16 16.2 2행, 횡단 설계 §2.14 D-11 · **신규(CR-062)**
- Given 공통, 최대화한 브라우저가 전경, 위치 잠금 켬, 작업표시줄 자동 숨김 ① 끔 ② 켬
- When MC-42: ①② 각각 최대화 브라우저 위 오버레이를 오른쪽 클릭
- Then ⓐ 화면: ①② 모두 메뉴가 뜬다(클라이언트 영역이 제목 표시줄만큼 모니터보다 작음) ⓑ 상태: `settings.json` 변화 없음 ⓒ core·bridge: 오류 줄 없음

### TC-328 · 바탕 화면·작업표시줄 전경 — 메뉴 뜸 · 종류: 수동(MC-43) · 요구: R-40(「바탕 화면·작업표시줄이 전경이면 뜬다」), R-28 · 설계: design.md §10.16 16.2 2행, 횡단 설계 §2.14 D-10 ③·§2.10 R7 · **신규(CR-062)**
- Given 공통, 오버레이 표시
- When MC-43: ① 바탕 화면 빈 곳을 좌클릭한 뒤 바탕 화면 위 잠금 오버레이를 오른쪽 클릭 ② 작업표시줄을 클릭해 전경으로 만든 뒤 오버레이를 오른쪽 클릭(잠금·비잠금 각각)
- Then ⓐ 화면: ①② 메뉴가 뜬다. (관찰 — 판정 외) Alt+Tab 전환 화면·작업 보기가 떠 있을 때의 결과는 비고에만(R7) ⓑ 상태: `settings.json` 변화 없음 ⓒ core·bridge: 오류 줄 없음

### TC-329 · 브라우저·동영상 전체 화면 — 메뉴 없음, 나가면 다시 뜸 · 종류: 수동(MC-44) · 요구: R-40(「브라우저·동영상 전체 화면도 포함」), R-28 · 설계: design.md §10.16 16.2 3행, 횡단 설계 §2.14(결과 — F11도 테두리 없는 전체 화면) · **신규(CR-062)**
- Given 공통, 위치 잠금 켬, 브라우저 F11 또는 동영상 전체 화면이 전경
- When MC-44: 전체 화면 위 오버레이를 오른쪽 클릭 → 전체 화면을 나간 뒤 다시 오른쪽 클릭
- Then ⓐ 화면: 전체 화면 중에는 메뉴가 뜨지 않는다, 나가면 다시 뜬다 ⓑ 상태: `settings.json` 변화 없음 ⓒ core·bridge: 오류 줄 없음

### TC-330 · 경합·다중 모니터(①② 관찰, ③ 판정) · 종류: 수동(MC-45) · 요구: R-40 · 설계: design.md §10.16 16.2 1·3행, 횡단 설계 §2.10 R6·§2.14 좌표계 · **신규(CR-062)**
- Given 공통, 모니터 2대(③은 배율이 다른 WQHD + 1080p)
- When MC-45: ① 모니터 A에 테두리 없는 전체 화면 게임(전경), 모니터 B에 잠금 오버레이 → B의 오버레이를 오른쪽 클릭 ② 비잠금 오버레이를 전체 화면 게임 위에서 오른쪽 클릭 ③ 배율이 다른 모니터로 오버레이를 옮겨 MC-31 반복
- Then ⓐ 화면: ① 오른쪽 누름으로 B의 아래 창이 활성화되면 전경이 바뀌어 메뉴가 뜰 수 있다 — 결과만 기록(R6) ② 클릭이 오버레이를 활성화해 전경이 이 앱이면 메뉴가 뜬다(정의대로) — 결과만 기록 ③ 메뉴가 뜨고 창 가장자리 판정이 맞다(판정 — 가장자리 바로 안쪽은 뜨고 바로 바깥은 안 뜸), 브라우저 기본 메뉴 없음 ⓑ 상태: `settings.json` `overlay.x/y`는 ③에서 옮긴 값만 바뀜 ⓒ core·bridge: 오류 줄 없음

### TC-FLOW-21 · S-21 잠가 둔 채 창 모드 게임 중 캐릭터를 오른쪽 클릭해 트레이와 같은 메뉴로 설정·타이머를 다루고, 전체 화면 게임에서는 메뉴가 뜨지 않음(TC-FLOW 목록에 더한다)
Steps: TC-319 → TC-318 → TC-325 (v2.5 신규, CR-062)

- 전제: TC-315(자동) Green 빌드 — 행의 사용 기능 끝 「브라우저 기본 메뉴 없음」은 비잠금 WebView 경로라 TC-315·TC-316이 맡고, 이 흐름(잠금 중)에서는 Step 1 ⓐ의 「브라우저 기본 메뉴 없음」으로 함께 본다.
- 표 규약: TC-FLOW-20과 같다(「환경 전환:」 Step은 그 TC의 Given으로 새로 준비, 접두어 없는 Step은 앞 Step 종료 상태를 이어 쓴다).

| Step | TC | Given(= 앞 Step 종료) | 종료 상태 |
|---|---|---|---|
| 1 | TC-319(MC-34) ② | 환경 전환: 실제 앱(CR-062 빌드), 위치 잠금 켬, 타이머 켬·흐르는 중, 오버레이 아래 테두리 있는 창 모드 게임(또는 그림판) | 오버레이 메뉴 1개(「일시정지」·「멈춤」·구분선·4항목 — TC-317 ③과 같은 구성), 오른쪽 클릭은 게임에도 전달, 브라우저 기본 메뉴 없음. 메뉴 열린 상태 |
| 2 | TC-318(MC-33) ①·④ | Step 1의 열린 메뉴(잠금 유지) | ① 「설정 열기」 → 설정 창 한 개가 앞으로(설정 변경·잠금 해제는 여기서) → 설정 창을 닫고 게임 창 클릭 → 다시 오버레이 오른쪽 클릭 → ④ 「멈춤」 → 오버레이 글자와 설정 창 타이머가 함께 정지 값, 동작 1회. 잠금 켬 유지 |
| 3 | TC-325(MC-40) | 잠금 유지·앱 실행 중, 게임을 테두리 없는 전체 화면으로 전환(전경) | 누름·뗌 모두 오버레이 위 오른쪽 클릭에 메뉴 없음, 게임 포커스 유지·게임이 오른쪽 클릭을 받음 |

### 추적표 v2.5 추가분(CR-062) — 「## 추적표」의 v2.4 이하 표에 더한다

요구 ↔ TC(추가)

| 요구ID | 자동 TC | 수동 TC |
|---|---|---|
| R-40 | TC-315(①·②) / 회귀 TC-013·TC-039·TC-062·TC-214·TC-218·TC-219·TC-071·TC-073·TC-077 | TC-316(MC-31), TC-317(MC-32), TC-318(MC-33), TC-319(MC-34), TC-320(MC-35), TC-321(MC-36), TC-322(MC-37), TC-323(MC-38), TC-324(MC-39), TC-325(MC-40), TC-326(MC-41), TC-327(MC-42), TC-328(MC-43), TC-329(MC-44), TC-330(MC-45) |
| R-28(용어 주 CR-062 — 잠금 중 오른쪽 클릭은 아래 창 전달 + 메뉴, 전체 화면이면 없음, 해제는 설정 창) | TC-227 ①②(재확인 — `positionLock` 미참조·잠금 DOM 동일) | TC-318(잠금 중 「설정 열기」), TC-319, TC-322, TC-324, TC-325, TC-327, TC-328, TC-329 |
| R-09(더함 — 같은 오른쪽 클릭의 파츠 교체 불변) | TC-315 ②, 회귀 TC-013·TC-039·TC-062 | TC-316(관찰) |
| R-26(더함 — 펜 모드 오른 클릭 불변) | 회귀 TC-214·TC-218·TC-219 | — |
| R-04 · R-12(더함 — `onWheel`·끌기 속성 불변) | TC-315 ①(`data-tauri-drag-region`), 회귀 TC-071·TC-073·TC-077·TC-227 ① | 회귀 TC-088(MC-06) |
| R-01(더함 — 메뉴·문구를 DOM에 그리지 않음) | TC-315 ①②(`textContent` `''`) | — |

설계 항목 ↔ TC(CR-062)

| 설계 항목 | TC |
|---|---|
| design.md §2 ASCII `.root` `onContextMenu -> preventDefault only (R-40)` 줄 | TC-315 ① |
| design.md §6 P-10 ① WebView `contextmenu` → `.root` `preventDefault` → 기본 메뉴 없음 / ② core 판정·팝업(ui 관여 없음) / ③ 같은 클릭의 `input://mouse-button` → 클릭 파츠·펜 모드 클릭 / ④ 잠금 중 ①없이 ②③ / 오류 칸(예외 없음·core 실패는 ui에 안 알려짐·문구 없음) | TC-315 ①·TC-316 / TC-316~TC-330 / TC-315 ②·회귀 TC-062·TC-214·TC-218·TC-219 / TC-319·TC-227 ②(재확인 — 잠금 중 입력 반응) / TC-315 ①②(`textContent` `''`, 예외 없이 반환) |
| design.md §7 창 기능(CR-062) 행 · 계약 사용표 CR-062 행(계약 없음, bridge와 무관) | TC-315 ①② ⓒ(모든 래퍼 호출 증가 0) |
| design.md §9 · design/a11y.md 오른쪽 클릭(네이티브 메뉴 — 방향키·Enter·Esc는 OS 기본, DOM에 메뉴 요소·role·포커스 대상 없음, 포커스 자동 복귀 없음) | TC-315 ①(`[role="menu"]` 0개·`activeElement` 불변) · TC-322 ③(Esc) · TC-324(포커스 기록) |
| design.md §10.9.1 L-7(잠금 중 메뉴 「설정 열기」로 설정 창) · L-8(잠금 중 오른쪽 클릭 = 아래 창 전달 + core 메뉴, `preventContextMenu` 불리지 않음·ui 분기 없음) | TC-318·TC-FLOW-21 Step 2 · TC-319·TC-227 ①(재확인 — 잠금 값 무관 DOM) |
| §10.16 16.1 1행(누름·뗌 감지, 잠금 포함) / 2행(창 사각형·투명 포함·누름·뗌 모두 안) / 3행(숨김 생략) / 4행(전체 화면 생략) / 5행(항목·순서·문구·동작·중복 가드) / 6행(ui 기본 메뉴 억제) | TC-319·TC-321 / TC-316·TC-321·TC-330 ③ / TC-320 / TC-325·TC-326·TC-329(생략)·TC-327·TC-328(표시)·TC-330 ①② / TC-317·TC-318·TC-322·TC-323 / TC-315 |
| §10.16 16.1 「ui가 하지 않는 것」(메뉴 그리기 · 새 bridge 호출 · `positionLock` 읽기 · 전체 화면 판정 · `stopPropagation`) · 핸들러 위치(`.root` 한 곳 — 그림 위도 `.root`에 닿음) | TC-315 ①(`[role="menu"]` 0개) · TC-315 ①② ⓒ · TC-227(재확인) · TC-315(판정 입력 없음 — 잠금·전경 픽스처 없이 같은 결과)·TC-325 · TC-315 ①(`document` 수신 `[true, true, true]`) · TC-315 ①(키보드·팔 img에서 쏜 이벤트도 취소)·RV-02 |
| §10.16 16.2 1행 / 2행 / 3행 / 4행(한쪽만 창 안 — ui 핸들러는 관찰) / 5행 / 6행 | TC-316·TC-315 / TC-319·TC-327·TC-328 / TC-325·TC-326·TC-329·TC-330 ② / TC-321(①② 판정 = 메뉴 없음, 기본 메뉴 유무 = 관찰) / TC-320 / TC-322 ①·TC-323 |
| §10.16 16.2 아래 줄: 포커스 이동·자동 복귀 없음(U-2) / 메뉴 열린 동안 `input://*` 반응 그대로 | TC-324 / TC-324(관찰) |
| §10.16 16.3 불변(`onWheel`·`data-tauri-drag-region`·상태기계·레이어 렌더·타이머 흐름) / `contextmenu`는 뗌 뒤·`input://mouse-button` 무영향 / 잔여 위험(지연 로딩 전 구간) | 회귀 TC-071·TC-073·TC-077·TC-227 ①·TC-315 ①(속성) — 상태기계·레이어·타이머는 소스 변경이 `index.tsx` JSX 속성 1개뿐이라 전건 회귀(`/doc-sync`·verify)로 / TC-315 ②·회귀 TC-062·TC-214·TC-218·TC-219 / TC 대상 아님(수용된 위험 — manual-checklist CR-062 절 공통 주: FAIL 기준 아님) |
| §10.16 16.4 검증 표 vitest 행 / 회귀 행 / 수동 행 | TC-315 / 「회귀 지정」 표 / TC-316~TC-330 |
| design/functions.md §5.1 `preventContextMenu` — 시그니처·출력(`preventDefault` 하나) · 붙이는 곳(`.root` 한 곳) · 부작용 없음(상태·dispatch·bridge·`stopPropagation`·`positionLock` 없음) · 다른 동작 영향 없음 · 예외 없음 · export 없음·모듈 수준 상수·react `MouseEvent` 타입 | TC-315 ① · TC-315 ①·RV-02 · TC-315 ①② · TC-315 ②·회귀 표 · TC-315 ①② · TC-315 ①(`in` 검사)·RV-02 |
| design/components.md §3 `OverlayApp` 행(CR-062 — `.root` `onContextMenu`, 메뉴 컴포넌트 렌더 없음) | TC-315 ① |
| RTM R-28 · R-40 행 | 위 요구 ↔ TC 표 |
| requirements §3 창 기능 「오른쪽 클릭 메뉴」 행(core 전용, 계약 없음) | TC-315 ⓒ, TC-316~TC-330 |
| requirements §2 S-21 | TC-FLOW-21 |

상태 전이표(확정사항 §5) ↔ TC(CR-062): 변경 없음 — `src/state/inputMachine.ts` 불변. `contextmenu`는 상태기계 입력이 아니다(TC-315 ①이 dispatch 없음을 관찰).

사용자행 ↔ TC-FLOW(추가)

| 사용자행 | TC-FLOW |
|---|---|
| S-21 | TC-FLOW-21 |

CR ↔ TC(추가): CR-062 → 신규 TC-315(자동, `OverlayApp.contextMenu.test.tsx`), TC-316~TC-330(수동 MC-31~MC-45), TC-FLOW-21, 코드 리뷰 RV-02 / 회귀 참조 TC-013·TC-039·TC-062·TC-214·TC-218·TC-219·TC-071·TC-073·TC-077·TC-088·TC-227(기대 불변).

- 수: 자동 +1(TC-315), 수동 +15(TC-316~TC-330 — MC-31~MC-45). 330번까지 = 유효 310건(자동 266 + 수동 44) + 폐기 20건. TC-FLOW 유효 20건 + 폐기 1건.
- 실행(보강 모드 — 변경에 걸리는 TC만): `yarn test --run src/overlay/test/OverlayApp.contextMenu.test.tsx`. 회귀: `yarn test --run src/overlay/test/OverlayApp.mouse.test.tsx src/overlay/test/OverlayApp.penClick.test.tsx src/overlay/test/OverlayApp.scale.test.tsx src/overlay/test/OverlayApp.lock.test.tsx` + TC-013·TC-039 스펙 `yarn test --run src/overlay/test/inputMachine.transitions.test.ts src/overlay/test/MouseArm.test.tsx`. 수동: MC-31~MC-45(dev·release 각각), 코드 리뷰 RV-02.

## 변경이력

| 일자 | 버전 | 내용 | 근거 |
|---|---|---|---|
| 2026-09-29 | v2.5 | (최신 행) **CR-062 증분(R-40 오버레이 오른쪽 클릭 메뉴의 ui 몫 = WebView2 기본 메뉴 억제, 증분 모드·보강)**. 「CR-062 오버레이 오른쪽 클릭 메뉴」 절 신설(기준·범위 규칙·§0.3 red 보충·잔여 위험·회귀 지정 표·추적 3종·CR). 신규 자동 TC-315(`OverlayApp.contextMenu.test.tsx` — ① `.root`·키보드 img·팔 img의 `contextmenu` 반환 `false`, `document` 도달 `defaultPrevented` true(전파 유지), DOM·상태·포커스·모든 bridge 래퍼 호출 수 불변, `[role="menu"]` 없음, `preventContextMenu` export 없음 ② 오른쪽 누름·뗌 → contextmenu → 오른쪽 누름·뗌에서 클릭 파츠 `mouse_right` ↔ `mouse_base` 그대로). 신규 수동 TC-316~TC-330(MC-31~MC-45 — 횡단 설계 §7 원문, MC-36 「한쪽만 창 안」의 ui 핸들러·기본 메뉴는 관찰 항목, 시작 직후 로딩 전 기본 메뉴는 수용된 잔여 위험이라 판정 제외). TC-FLOW-21(S-21: TC-319 → TC-318 → TC-325). 회귀는 기존 TC 번호 참조만(R-09 TC-013·TC-039·TC-062, R-26 TC-214·TC-218·TC-219, R-04 TC-071·TC-073·TC-077·TC-088, R-12·R-28 TC-077·TC-227). 기존 TC 개정 없음. `manual-checklist.md` 같은 패스(CR-062 절·RV-02). 자동 265 → 266, 수동 29 → 44, TC-FLOW 19 → 20 | CR-062(사용자 결정 🔒 2026-09-29 U-1·U-3·U-5, U-2·U-4 수용) · requirements.md v3.2 R-40·R-28 용어 주·S-21 · design.md §2·§6 P-10·§7·§9·§10.9.1 L-7·L-8·§10.16·RTM · design/functions.md §5.1 · design/components.md §3 · design/a11y.md · 횡단 설계 overlay-context-menu.md v2 §7 |
| 2026-09-29 | v2.4 | **CR-058·CR-061 동기화(증분 모드)** — 설계(요구 v3.1·design.md §10.15 15.3·15.4·15.7·design/functions.md §5.7 ④)에 맞춰 문서만 개정, 스펙 로직 불변(이미 개정·통과). 「CR-058·CR-061 … 개정 TC」 절 신설(개정표·유지 판정표·추적 3종·CR). 본문 개정: TC-297 제목·요구·설계·Given/When/Then(`synthBeepWav` 바이트 검증 → `DEFAULT_ALARM_VOLUME` === 44·`Audio` 0개), TC-298 제목·요구·설계·Given/When/Then(Blob URL 캐시 → 번들 mp3 자산 import URL과 같음·반복 호출 동일·`Audio` 0개), TC-299 머리·When ⑤·Then ⑤(없음·NaN → 0.44, `Audio` 0개), TC-286 머리·Then ⓐ②·ⓑ②(44·(268,402)·7 — 본문에 남아 있던 v1.9 값까지 정리), TC-310·TC-311·TC-312(기본음 = 번들 mp3, TC-312 ⑥ 근거를 기본음 길이와 무관하게), TC-266 Given·설계 칸(`DEF` = 픽스처), v1.8 공통 전제 `TIMER_OFF` 설명, v1.9 공통 전제(`URL.createObjectURL` stub 삭제·import 목록·`'blob:default'`·0.8 픽스처 명시), 추적표 v1.9 설계 행 15.2·15.3·15.4·§5.7 ④. `manual-checklist.md` MC-27 ②·MC-28·MC-29·MC-30 같은 패스 개정. `alarmSound.test.ts` 머리 주석(동기화 대기·정리 필요 문구)만 정정. 신규 TC 없음, 수 불변(자동 265 · 수동 29) | requirements.md v3.1 R-34·R-39 · design.md §4·§7·§10.15 15.3·15.4·15.7 · design/functions.md §5.7 ②④ · CR 대장 CR-058·CR-061 · contract v0.27 §3.3 |
| 2026-09-27 | v2.3 | **CR-055 반영(증분 모드 · 대기열 소진)** — 끝남 알림음 1회 재생 복원(사용자 🔒, CR-052 반복 재생 폐기, R-39 원문 「1회 재생(반복 없음)」 복귀). 「CR-055 알림음 1회 재생 복원 — 개정 TC」 절 신설(개정표·추적 3종·CR), CR-052 절 머리에 폐기 주석(기록 보존). 본문 개정: TC-300 제목·요구·설계 칸·ⓑ(`loop` false), TC-302 설계 칸·ⓑ ①(두 회차 `loop` false), TC-303 요구·설계 칸·ⓑ ①③④(`loop` false), TC-304 요구·설계 칸·ⓑ ①②(`loop` false, ② `volume`·`play` 단언 추가), TC-307 제목·요구·설계 칸·ⓑ(`loop` false), TC-311 요구·설계 칸·Then ⓐ(삐 3번 한 번, 되풀이 FAIL), TC-312 요구·설계 칸·When ⑥(등록 mp3 재등록)·Then ⓑ ①③⑥⑦⑧. 추적표 v1.9 설계 행 15.2 「반복 재생(CR-052)」 → 「1회 재생(CR-055)」. 스펙 개정: `useAlarmOnFinish.test.ts`(TC-300 ①·TC-302 ①·TC-303 ①②·③·④·TC-304 이름 「CR-055 개정」, `loop` 단언 true → false, TC-302 ① 다음 회차·TC-304 ② 단언 추가, 머리 주석), `OverlayApp.timerMode.test.tsx`(TC-307 이름·`loop` false), `alarmSound.test.ts`(TC-299 ① 주석만 — 기대 불변). `TimerText.blink.test.tsx`는 `loop` 단언 없음 — 변경 없음. `manual-checklist.md` MC-29·MC-30 같은 패스 개정. 대기열 Q-07 → `전환됨`. 신규 TC 없음, 수 불변(자동 265 · 수동 29) | requirements.md R-39 🔒 원문 · CR 대장 CR-055 · Q-07 · design.md §10.15 15.2·변경이력 CR-055 행 · `src/overlay/hooks/useAlarmOnFinish.ts` |
| 2026-09-27 | v2.2 | **CR-053 반영(증분 모드)** — 「CR-053 배포용 기본 세트 3차 — 개정 TC」 절 신설. TC-286 ② 기대값 개정: `DEFAULT_TIMER_SETTINGS` `textPos` (268,403) → (142,458)·`rotation` 5 → 9, 글자 `left`/`top` `'142px'`/`'458px'`, `transform` `rotate(9deg)`, 제목 갱신(스펙 `OverlayApp.pomodoro.test.tsx` 개정 완료). 신규 TC 없음, 오버레이 소스 변경 없음. 대기열 Q-06 상태 불변(관리자 지시). 수 변동 없음 | 확정사항 CR-053 줄 🔒 · contract v0.24 · overlay CR 대장 CR-053 · design.md 변경이력 CR-053 행 |
| 2026-09-27 | v2.1 | (최신 행) CR-052 증분(알림음 반복 재생 🔒 — 깜빡이는 10초 동안 `loop` true, 정지 경로 불변). 대기열 Q-05 → `TC 전환(검증 대기)`. 본문 개정: TC-299 When·ⓑ(`loop` 인자 생략 false·true·명시 false), TC-300 제목·설계 칸·ⓑ(`loop` true), TC-302 ⓑ ①, TC-303 ⓑ ①③④, TC-304 ⓑ ①, TC-311 Then ⓐ(10초 동안 되풀이 → 종료 때 정지), TC-312 설계 칸·When ⑥~⑧(깜빡이는 중 「멈춤」·「시작」·타이머 끄기)·Then. 추적표 v1.9 설계 행 「반복 없음 → TC-300 ①(loop false)」 → 반복 재생 행으로 교체. 「CR-052」 절 신설(개정표·추적 3종·CR). `manual-checklist.md` MC-29·MC-30 같은 패스 개정. 신규 TC 없음, 수 불변(자동 265 · 수동 29) | 확정사항 CR-048 블록 「수정 (CR-052)」 🔒 · CR 대장 CR-052 · Q-05 · design.md §10.15 15.2 · design/functions.md §5.7 ④ |
| 2026-09-26 | v2.0 | (최신 행) CR-051 증분(겹침 순서 변경 🔒 — 헤어를 `.jellyWrap` 첫 자식에서 `.canvas` 첫 자식 `.hairWrap`(hair 있을 때만)으로, 아래→위 헤어 → 배경 → 뽀모도 → `.jellyWrap`[팔 → 본체 → 펜 손], `.hairWrap`은 `.jellyWrap`과 같은 motion 클래스). 대기열 Q-04 전환. 개정 TC-241(① 새 DOM·② 뽀모도 변형)·TC-243(래퍼 class 대응·⑫ `pen_down_0` 본문 반영)·TC-244(두 래퍼 같은 motion·배경 밖)·TC-245(래퍼 생김·사라짐)·TC-246(`.canvas` 자식)·TC-247/MC-24(① 맨 뒤·⑤ 뽀모도 정지·⑧ 허용 조항), TC-FLOW-13 Step 3 문구(Step 5는 개정표 읽기 규칙), v1.5 절 관찰·로케이터 문장, 추적표 v1.5 설계 행 §10.11 자리·좌표·모션(나머지 v1.5 행은 「CR-051 추적」이 우선). 신규 TC-314(`.hairWrap` CSS — `overlayStyles.test.ts`). 스펙 `OverlayApp.hair.test.tsx` CSS mock `hairWrap`·`pomodoro`, 픽스처 `HAIR_POMO_MANIFEST`, 헬퍼 `animatedOnlyJelly` → `animatedEls`·`hairWrapOf`·`inOrder`. v1.5 행(2026-09-25)의 「겹침 배경 → 헤어 → 팔 → 본체 → 펜 손」은 이 행으로 대체(기록 보존). 설계 확인 필요 보고(design.md·components·functions 옛 구조, 확정사항 「팔·손 → 본체」 문구 vs CR 해석). 자동 264 → 265 | 확정사항 CR-051(🔒 2026-09-26) · CR 대장 CR-051 · Q-04 · `src/overlay/index.tsx`·`overlay.module.css` |
| 2026-09-26 | v1.9a | (최신 행) CR-050 시나리오 검증 FAIL 반영. [MAJOR-1] 신규 자동 TC-313(`OverlayApp.timerMode.test.tsx` — 설정 `alarmVolume` 30 → `finished`에 `Audio.volume` 0.3, 마운트 중 `settings://changed`로 50 → 다음 회차 0.5·앞 회차 0.3 불변, `getAlarmSound` 회차마다 1회·`getSettings`·`onTimerChanged`·`getTimer` 각 1회·`setSettings` 0회) — 추적표 R-39 행·§7 `TimerSettings` 행·15.2 재생 순서·§5.7 ④ `alarmGain`·§3.y `TimerText` 행·CR-050 행에 연결. [MINOR-1] TC-303 ①②③④·TC-304 스펙에 `getAlarmSound` 횟수(누계)·인자 없음 단언 추가, 본문 ⓒ 정밀화. [MINOR-2] TC-297 스펙 `Audio` 0개 단언 추가, TC-305 ① ⓒ(`getAlarmSound` 1회·`defaultAlarmUrl` 0회) 기재·스펙 단언 추가. [MINOR-3] v1.9 행의 manual-checklist 문구 정정. [C1-1] TC-310/MC-28 ① 판정 실행(콘솔 열지 않음, 소리로만) / ② 진단 실행(콘솔·`NotAllowedError`, 판정 제외) 분리. [C2-1] TC-311/MC-29 ③ 20초 넘게 대기·ⓑ 표시 시점 분기. [C5-1] TC-268·TC-269·TC-270 ①·TC-286 ② 본문 Then ⓑ를 개정값(`fromEvent`·`DEFAULT_TIMER_SETTINGS` 8필드)으로 고쳐 씀(TC-269는 같은 개정표 행이라 함께 맞춤). 후보: TC-FLOW-20 「연결:」 규약 줄, TC-294 When 인자별 now. [MINOR-4] MC-27~MC-30 본표 이동은 다음 증분. 자동 263 → 264 | ui-test-checker(MAJOR-1·MINOR-1~4) · ui-test-conflict-checker(C1-1·C2-1·C5-1·후보 2) · design/components.md §3.y · design/functions.md §5.7 ④⑤ · design.md §10.15 15.2 |
| 2026-09-26 | v1.9 | CR-050 증분(R-37 카운트다운 올림 표기·R-38 끝남 깜빡임·R-39 알림음의 오버레이 몫). 신규 자동 TC-291~TC-294(`timerClock.test.ts` 확장), TC-295(`useElapsedText.countdown.test.tsx`), TC-296(`TimerText.blink.test.tsx`), TC-297~TC-299(`alarmSound.test.ts`), TC-300~TC-305(`useAlarmOnFinish.test.ts`), TC-306(`pomodoro.test.tsx`), TC-307~TC-309(`OverlayApp.timerMode.test.tsx`), 수동 TC-310~TC-312(MC-28~MC-30 — manual-checklist 머리 절 표의 MC-27 뒤에 기재 완료, 같은 날 증분 패스. 본표 끝 이동은 다음 증분), TC-FLOW-19·20(S-19·S-20). 개정 TC-286 ②(`DEFAULT_TIMER_SETTINGS` v0.23 리터럴)·TC-268·TC-269·TC-270 ①(`fromEvent`). 기존 16개 스펙 bridge mock에 `getAlarmSound`(일반 함수) 추가 — 기대 불변. 자동 244 → 263, 수동 26 → 29, TC-FLOW 17 → 19 | CR-050(사용자 결정 CR-048, 🔒 2026-09-26) · requirements.md R-37~R-39·S-19·S-20 · design.md §10.15·§4·§6 P-9·§7·RTM · design/functions.md §5.7 · design/components.md §3.y · contract v0.23 · 패킷 timer-mode-03 §0·§5 |
| 2026-09-26 | v1.8 | CR-045 증분(R-33~R-36 뽀모도 타이머의 오버레이 몫 — `PomodoroLayer`(인물 → 말풍선 → 시간 글자, 배경 다음·`.jellyWrap` 앞 고정), 글자 조건 U-1, `TimerText`(`useTimerSnapshot` 구독 → 조회·`useElapsedText` 250ms·초 바뀔 때만), 쉬는중 보고 `setResting(layer === 'rest')`, 시작 00:00:00). 신규 자동 TC-264~TC-267(`timerClock.test.ts`), TC-268~TC-281·TC-289(`pomodoro.test.tsx`), TC-282~TC-288(`OverlayApp.pomodoro.test.tsx`), 수동 TC-290(MC-27 — 이번 패스는 manual-checklist 머리 절 별도 표에 둠), TC-FLOW-16·17·18(S-16·S-17·S-18). 기존 14개 스펙 bridge mock에 `getTimer`·`setResting`·`onTimerChanged`(일반 함수) 추가 — TC 기대 불변. `Settings` 픽스처는 `DEFAULT_SETTINGS` 상속이라 수정 없음. 자동 218 → 244, 수동 25 → 26, TC-FLOW 14 → 17 | CR-045(사용자 🔒 2026-09-26) · requirements.md v2.9 · design.md §10.14·RTM R-33~R-36 · design/functions.md §5.6 · design/components.md §3.x · contract v0.21 §3.3·§3.9·§5.8 |
| 2026-09-26 | v1.7a | (최신 행) CR-044 기본 마우스 설정 개정(어깨 558,500 → 582,484 · partPos 389,492 → 411,464 · penPos 356,504 → 372,476 · penMode true 유지, contract v0.20 🔒) — 개정 TC-025(기본값 단언), TC-048 ②·TC-123(원점 `169px 8px` → `171px 20px`, TC-123 변형 `rotate(148.24deg)…/rotate(168.8deg)… scaleX(1.6) rotate(-143.43deg)` — `armTransform` 식 재계산). 스펙 `mouseMapping.test.ts`·`OverlayApp.test.tsx` 갱신. TC 수 변화 없음. 잔여: §0.2 「기본 영역」 참조 행(옛 558,500 값)은 미갱신 | CR-044(사용자 🔒) · contract v0.20 · `src/bridge/types.ts` `DEFAULT_MOUSE_SETTINGS` |
| 2026-09-26 | v1.7 | (최신 행) CR-043 증분(R-32 타자 입력 1 선택 강등 — 키보드 모드에서 `kb_down`이 없으면 누름 중에도 `kb_up`, 젤리·부르르 불변). 개정 TC-140(`noDown` 누름 `undefined` → `u:kb_up`). 재확인 TC-141·TC-144~TC-146·TC-189~TC-191·TC-223~TC-226·TC-230·TC-238~TC-246·TC-248~TC-251·TC-253·TC-254(불변). 신규 자동 TC-259~TC-262(`keyboardFallback.test.tsx` — §10.13 회귀 ①②③·`LayerStack` 같은 img), 수동 TC-263(MC-26), TC-FLOW-15(S-15). 자동 214 → 218, 수동 24 → 25, TC-FLOW 13 → 14 | CR-043(사용자 🔒 2026-09-26) · requirements.md v2.8 R-32·S-15 · design.md §10.13·RTM R-32 |
| 2026-09-25 | v1.6 | (최신 행) CR-042 증분(R-31 펜 손 단순화 — 손 = `pen_up`·`pen_down_0` 두 장, 누름 중 `pen_down_0 ?? pen_up`·순환 없음, 펜 모드 특수 키 누름 중 본체 `key_*`(없으면 `kb_up`), `kb_down` 미사용, `config.kbFrames` 펜 모드 1, `penDownFrameCount` 삭제, 옛 슬롯 미사용). 폐기 TC-188. 개정 TC-189~TC-191·TC-194·TC-197~TC-199·TC-202·TC-212~TC-218·TC-220·TC-221·TC-230·TC-231·TC-235·TC-236·TC-243(스펙 기대값), TC-203·TC-222·TC-237(수동 기대 — MC-20·MC-21·MC-23 개정 주), TC-FLOW-09·10·12·13(`kbFrame` 종료 값), 참조만 TC-006·TC-056·TC-111·TC-225·TC-232. 신규 자동 TC-252~TC-254(`penLayers.test.tsx` — §10.12 회귀 ①②③), TC-255~TC-257(`OverlayApp.pen.test.tsx` — 회귀 ④⑤·동작 표 14행), 수동 TC-258(MC-25), TC-FLOW-14(S-14). 설계 확인 필요 2건(`PenHand` Props 문단·옛 문장 잔존) 보고. 자동 209 → 214, 수동 23 → 24, 폐기 19 → 20, TC-FLOW 12 → 13 | CR-042(사용자 🔒 2026-09-25) · requirements.md v2.7 · design.md §10.12·RTM R-31 · design/functions.md §5.5 CR-042 |
| 2026-09-25 | CR-039 증분 | (최신 행 — 표 머리에 추가) 초기 조회 재시도. 대기열 Q-03 전환: 신규 TC-248 ~ TC-251(`OverlayApp.retry.test.tsx` 이름에 TC-ID 부여·ⓒ 단언 보강), 개정 TC-048 ①②③(`toHaveBeenCalledTimes(1)` → 실패 조회 1+3회, 가짜 시계로 간격마다 진행)·TC-063 ①(모니터 4회 연속 실패·누계 n + 3). 「CR-039 초기 조회 재시도」 절 신설. design 델타 미반영은 설계 확인 필요로 보고 | CR 대장 CR-039 · Q-03 · `fetchWithRetry.ts` |
| 2026-09-23 | v0.1 | 최초 작성(신규 모드). 자동 82 · 수동 15 · TC-FLOW 6. 미적용 CR-007·008·009·011·012·013·014 커버, 표시 크기 기대값 = core window.md §2.2 표(UI-5) | design.md(요구 v1.4) · requirements.md v1.4 · contract v0.7 |
| 2026-09-23 | v0.2 | 1차 검증 반영. TC-020 정반대 기대 180 → −180(범위 [−180,180), 메인 세션 결정, 거울 경우는 비고로 보류). TC-052 ③(언마운트 뒤 갱신 없음) 삭제 → 코드 리뷰 항목. TC-054 Given·프레임 무관 단언, TC-055 팔 각도·이미지 불변 단언 추가, TC-080 keyframe 구간별 파싱, TC-088·MC-06 ③ 관찰만, TC-097 수동 유지 비고, TC-051·056·057·058·066·068·076·077 Given을 FLOW 연결 가능하게 일반화. 신규 TC-098(설정값 어깨·굵기·색 단위)·TC-099(settings://changed mouse 교체)·TC-100(누름 유지 중 추가 누름 재생 없음)·TC-101(빈 창 첫 등록). TC-FLOW 01·03·05·06 Step 재구성(연결·재마운트 Step, Step 시작 기준 호출 횟수), 「같은 마운트 연속 재현」 문구 정정. §0.1 tick 위상·호출 횟수 전제, §0.3 근거 인라인·contract v0.7 근거. 자동 82 → 86 | ui-test-checker(MAJOR-1~3·MINOR-1~5) · ui-test-conflict-checker(C2·C4-1~3·C5-1·FLOW-06) · 메인 세션 결정 2026-09-23 |
| 2026-09-23 | v0.3 | 2차 검증 반영. 각도 근거를 design/functions.md §5.4 결과 범위 [−180, 180](이 입력에서는 −180)으로 정정(TC-020·§0.2·TC-050), 「갱신 예정」 삭제, 거울 경우(+180) 단언 안 함 명시. Ctrl+휠 근거 = design/functions.md §5.1 ②(효력 보장 안 됨, Tauri `zoomHotkeysEnabled = false`)(TC-088·설계↔TC 표·MC-06). 코드 리뷰 RV-01(구독 실패 경로 `!cancelled` 가드) 신설. TC-053 언마운트 뒤 남은 타이머 0 단언·tick 효과 추적 행 갱신. TC-060 들림 단언, TC-067 누름 유지 중 이동(회전 변화) 단계 추가. FLOW-04 Step 3 「키 1개 눌림」·연결 Step 3a(키 뗌) 추가. TC-097 수동 사유 재기술. MC-04 settings.json 확인 시점 명시. TC 수 변화 없음 | ui-test-checker 재검증(MAJOR-1·MINOR-1~5) · ui-test-conflict-checker 재검증(C6-1·후보 2·3) · design/functions.md §5.1·§5.4 갱신(ui-designer) |
| 2026-09-23 | v0.4 | 최종 검사 반영. TC-102 신규(기준 미만 키를 누른 채 유휴 → `rest`, 눌림 값 불변 — design/functions.md §5.2 as-built), 설계↔TC 표 §5.2 tick 행·R-05 행 갱신. TC-048·TC-052②·TC-063 스펙에 5초 경과 뒤 호출 횟수 단언(재시도 없음). §0.1·OverlayApp 절 머리에 스펙별 픽스처 차이 명시. TC-094 ⓒ·MC-12 ③ 기준점 확인 절차(`__TAURI__.core.invoke('get_hand_anchor')`, 손/펜 끝 bbox 안). 변경 대기열 Q-01(TC-097 자동화) 등록. TC-FLOW-03 연결 Step 3을 계약상 실제 발생 순서로 조정(hand만 바꾼 settings://changed는 기준점 이벤트 없음 → mouse_base 재등록의 assets://changed 뒤 hand-anchor-changed). 자동 86 → 87 | ui-test-checker 최종(MAJOR-1·MINOR-1~4) · ui-test-conflict-checker 참고 |
| 2026-09-23 | v0.5 | CR-015 증분(R-18 마우스 파츠 한 모드 — 작은 손 그림을 `mouse.partPos`에 자연 크기로 놓고 어깨 축 회전, 손바닥 모드·팔 곡선·`isMouseLayerMode` 폐기 / R-19 몸통 선택·디폴트 `kb_up`). 폐기(번호 유지): TC-021·022·023·036·041·042. 개정: TC-025(기본값 `partPos` 389,492·팔 필드 없음), TC-037·044(img class `hand`), TC-046(작은 그림·래퍼 자식 `[img]`), TC-048②(기본 partPos 배치·원점 `231px 38px`), TC-064(한 모드 DOM 순서·`.armWrap` 1개), TC-066(작은 그림 크기 교체), TC-098(어깨·partPos·음수 원점), TC-099(어깨 교체·손 그림 크기 교체). 신규: TC-103~TC-108(`MouseArm` 배치·기준점 미가산·쉬는 위치·전체 크기 + (0,0)·클릭 이미지·삭제 확인), TC-109(partPos 변경 화면 통합), TC-110·TC-111(몸통 없음·kb_up 디폴트), TC-112(`.hand` CSS). 요구ID 재매핑 R-02 → R-19, R-08 → R-18(폐기 요구 행은 「TC 없음」). 픽스처 MOUSE에서 `armWidth`·`armColor` 삭제·`partPos` 추가(기존 스펙 (0,0), 새 TC 389,492·150,80·100,50), 손바닥 매니페스트 → `SMALL_MANIFEST`(202×154), 새 스펙 `handPart.test.tsx`. §0.1 픽스처·§0.3 red 표(CR-015 행), TC-FLOW-06 Step 재구성(연결 4a·5a, TC-109·TC-111 추가), 추적표 3종·CR↔TC(CR-002·CR-009 정리, CR-015 행) 갱신. 자동 87 → 91(유효), 폐기 6 | CR-015(사용자 🔒 2026-09-23) · requirements.md v1.5 · design.md·design/components.md·design/functions.md CR-015 갱신 |
| 2026-09-24 | v0.7 | CR-019 증분(쾅 메커니즘 폐기 — R-06 폐기, 쾅 상태·설정 `slam`·이미지 슬롯 `slam` 삭제). 폐기(번호 유지, 스펙 it 삭제): TC-007~TC-011, TC-029, TC-055, 수동 TC-091(MC-09), TC-FLOW-02(S-2 폐기). 개정: TC-001(`slamUntil` 속성 없음), TC-058(유휴 설정만, 요구 R-05), TC-067(6키 누름 = 대기·상태 레이어 바운스 없음), TC-096·MC-14(쾅 단계 삭제), TC-102(동시 키 수 무관 — ② 6키 추가). 픽스처·config에서 `slam` 제거(`MachineConfig = {idleMs, kbFrames}`, 슬롯 목록·매니페스트·`SETTINGS`), §0.3 CR-019 red 행, 추적표(요구·전이표·설계·CR·사용자행) 정리. 자동 101 → 94, 수동 16 → 15, 폐기 9 → 17, TC-FLOW 6 → 5 | CR-019(사용자 🔒 2026-09-24) · requirements.md v1.7 · design.md·design/functions.md §5.2·§5.3·design/components.md CR-019 갱신 |
| 2026-09-24 | v0.8 | CR-021 증분(R-22 특수 키 이미지 7종 — 추가 결정 ① 새 특수 키마다 바운스·자동 반복 재생 없음 ② `undo` = Ctrl+Z ③ 떼면 이전 특수 키 그림 복귀). 신규 자동 TC-127~TC-150(상태기계 규칙표 1~13행·`isSpecialKey`·`currentSpecial`·`bouncePhase`·입력 비보관 / `SPECIAL_KEY_SLOT`·`pickKeyboardEntry`·`LayerStack`·`MouseArm` 짝 클래스 / `.bounceAlt` CSS / `OverlayApp` 통합·`special` 누락·미지 값·비보관·쉬는중 깨어남), 수동 TC-151(MC-17 실제 키). TC-FLOW-07(S-7, 연결 Step으로 짝·프레임 재정렬). 개정: TC-001(초기 `specialHeld`·`bounceSeq`), TC-054·TC-067·TC-100·TC-111(마운트 뒤 첫 누름 = `bounceAlt`), TC-043~TC-046·TC-105(`bounce` prop `BouncePhase`), 기존 키보드 픽스처 `special: null`, CSS mock `bounceAlt`, TC-FLOW-01·06 종료 상태. 새 스펙 `inputMachine.special.test.ts`·`specialKey.render.test.tsx`·`OverlayApp.special.test.tsx`, `overlayStyles.test.ts`에 TC-143. 추적표 v0.8 추가분(요구·설계·§10.6 규칙표 행·사용자행·CR). 자동 94 → 118, 수동 15 → 16, TC-FLOW 5 → 6 | CR-021(사용자 🔒 2026-09-24) · requirements.md v1.9 · design.md §6 P-2·§10.1·§10.3·§10.6 · design/functions.md §5.1~§5.4 CR-021 갱신 · core hook.md J2·J3·J7·J9(수동 기대값) |
| 2026-09-24 | v0.9 | CR-022 증분(R-23 젤리 바운스 — 배경 뺀 모든 레이어를 감싼 `.jellyWrap` 하나에 `.jelly`/`.jellyAlt`, 350ms `ease-in-out`, `transform-origin 50% 100%`, `scale` 6구간 감쇠. `.bounce`/`.bounceAlt`·`Layer`/`MouseArm` `bounce` prop 폐기). 신규 자동 TC-152~TC-157(`OverlayApp.jelly.test.tsx` — 위치·자식 순서, 늘 렌더, 일반 키·특수 키 클래스 교대·같은 노드, 이중 적용 금지·팔 변형 유지, 배경 래퍼 밖)·TC-158(`.jellyWrap` CSS), 수동 TC-159(MC-18 체감). 개정: TC-031·TC-110·TC-141(키보드 class 항상 `layer`), TC-043·TC-044·TC-046·TC-105(`bounce` prop 삭제·`.armWrap` 애니메이션 없음), TC-054·TC-100·TC-144~TC-150(바운스 관찰 = `.jellyWrap`), TC-064·TC-066·TC-101·TC-111(`.canvas` 자식 `[배경, jellyWrap]`), TC-067(배경 `.jellyWrap` 조상 없음, FLOW 짝 값 명시), TC-080·TC-143(젤리 keyframe·옛 `.bounce` 부재), TC-090·MC-08(젤리 문구). 폐기: TC-045, TC-142. TC-FLOW-01 Step 재구성(TC-152·TC-159 추가, Step 5 짝 값 = `jelly` — v0.8 개정 후 남아 있던 TC-067 FLOW 짝 불일치도 정리). CSS mock 클래스 목록(`jellyWrap`·`jelly`·`jellyAlt` + 잔존 감시 `bounce`·`bounceAlt`), 키보드 img 로케이터 = `.jellyWrap` 마지막 자식, §0.3 CR-022 red(`overlayStyles.test.ts` `?raw` collect 실패 환경 문제 명시). 추적표 v0.9 추가분. 자동 118 → 123, 수동 16 → 17, 폐기 17 → 19 | CR-022(사용자 🔒 2026-09-24) · requirements.md v2.0 · design.md §1·§2·§6 P-2·§10.3 · design/components.md·design/functions.md §5.1·§5.3·§5.4 CR-022 갱신 |
| 2026-09-24 | v1.0 | CR-023 증분(R-24 키 꾹 누름 = 부르르 — bridge `KeyboardInputEvent.repeat`(미확정 계약) 수신, 반복 누름은 `bounceSeq`·`kbFrame`·`specialHeld` 불변, `repeating`·`lastRepeatAt`·`shiverSeq`, `REPEAT_TIMEOUT_MS` 500 tick 방어, `wrapMotion` 부르르 우선 → `.jellyWrap`의 `.shiver`(80ms `ease-in-out` `infinite`, `scale` 5구간), 동시 부착 금지). 신규 자동 TC-160~TC-168(`inputMachine.repeat.test.ts` — 초기값·`isRepeating`, 반복 누름 불변 필드, 반복 아닌 key → false, 마우스 불변·`lastRepeatAt` 분리, tick 499/500·같은 참조, `wrapMotion` 예 5개·우선순위, 반복 중 특수 키 새 누름 젤리, `shiverSeq` 재재생 방지, 비보관), TC-169~TC-173(`OverlayApp.shiver.test.tsx` — 일반 키·특수 키 꾹 누름, `repeat` 필드 없음/비 true, 동시 부착 없음·배경 밖·팔 유지, 끊김 방어 통합), TC-174(`.shiver` CSS — `overlayStyles.test.ts`, 기대값만), 수동 TC-175(MC-19). 개정: TC-001(초기 상태 새 필드 3개), TC-151·MC-17 ⑥(꾹 누름 = 젤리 1회 뒤 부르르), TC-159·MC-18 ③ 비고. TC-133·TC-147·TC-155는 `repeat` 없는 호환 TC로 기대 불변. TC-FLOW-08(S-8) 신규. 추적표 v1.0 추가분. 자동 123 → 138, 수동 17 → 18, TC-FLOW 6 → 7 | CR-023(사용자 🔒 2026-09-24) · requirements.md v2.1 · design.md §2·§4·§6 P-2·P-3·§10.3·§10.6 · design/functions.md §5.1·§5.2 · design/components.md §3 CR-023 갱신 |
| 2026-09-24 | v1.1 | CR-025 증분(R-25 펜 쥔 손 파츠 — 펜 모드 = `pen_up` 등록, 펜 모드면 키보드 Layer `kb_up` 고정·`kbFrames` = 펜 누름 그림 수, 손 그림 `pickPenEntry`(누름 아님 → `pen_up` / 누름 → `pen_key_{special}` → `pen_down_{kbFrame}` → `pen_down_0` → `pen_up`), 손은 팔과 같은 `armTransformFor` 변형으로 붙는 점 P(= `pen_up` 중심)를 P′로 옮기고 θt−θh 기울임·스케일 없음, `penPos` null = 손 중심을 `hand ?? 영역 중심`에, `PenHand` = `.jellyWrap` 마지막 자식·애니메이션 클래스 없음). 신규 자동 TC-176~TC-184(`penMapping.test.ts` — `PEN_REST`·쉬는 자세, `penTransform` 예 ⓐ·ⓑ·ⓓ(±0.05)·각도 접기·비유한·음수 크기, `penTransformCss`, `defaultPenPos`, `resolvePenPos`, `armTransformFor`), TC-185·TC-192~TC-195(`PenHand.test.tsx` — `armTransformFor` = `MouseArm` 결과, 쉬는 자세 설계 예, 팔 끝 추종, 같은 img src 교체·`pen_up` 기준, `null`), TC-186~TC-191(`penLayers.test.tsx` — `findByKey`·`isPenMode`·`penDownFrameCount`·`pickPenEntry` 순서·폴백·`LayerStack` kb_up 고정), TC-196~TC-202(`OverlayApp.pen.test.tsx` — DOM 위치, 키 입력 손만 교체·kb 고정·펜 수 순환, 이동·클릭 무반응, 젤리·부르르 합성, `pen_up` 없으면 불변, 표시 조건, 설정·이미지 변경 반영), 수동 TC-203(MC-20). 기존 TC 개정 없음. 펜 슬롯 TS 표현·`penPos`는 미확정 계약이라 픽스처 캐스팅(`penSlot` 헬퍼). TC-FLOW-09(S-9) 신규. 추적표 v1.1 추가분. 자동 138 → 165, 수동 18 → 19, TC-FLOW 7 → 8 | CR-025(사용자 🔒 2026-09-24) · requirements.md v2.2 · design.md §2·§4·§6·§7·§8·§10.1·§10.7 · design/functions.md §5.3·§5.4·§5.5 · design/components.md §3 CR-025 갱신 |
| 2026-09-24 | v1.1a | 픽스처 갱신만(기능·TC 기대 불변). bridge 계약 v0.13(CR-024)으로 `MouseSettings.penPos: Point \| null` 필수 필드·`DEFAULT_MOUSE_SETTINGS.penPos = null`이 확정돼, `MouseSettings` 리터럴 픽스처에 `penPos: null`을 넣었다 — `mouseMapping.test.ts` TC-025 `toEqual` 기대 객체, `handPart.test.tsx` `PART_MOUSE`, `MouseArm.test.tsx` `mouse()`, `OverlayApp{,.jelly,.mouse,.shiver,.special}.test.tsx` `MOUSE`. 펜 스펙(`penMapping`·`PenHand`·`OverlayApp.pen`)은 이미 `penPos`를 넣고 있어 변경 없음(캐스팅은 계약 확정 뒤에도 유효). TC 수 변화 없음 | bridge contract v0.13 · `src/bridge/types.ts`(CR-024) |
| 2026-09-24 | v1.2 | CR-027 증분(R-26 펜 모드에서 마우스 클릭 = 키 누름 — 상태기계 `clickHeld`(초기 `[]`)·설정 `clickPress`(`OverlayApp`이 `isPenMode`로 채움)·`isPressing = kbDown \|\| clickHeld.length > 0`, 새 클릭 누름은 키와 같은 `kbFrame` +1·아무것도 안 눌렸으면 `bounceSeq` +1, 뗌은 모드 무관 제거, 클릭은 일반 누름(특수 키 그림을 가리지 않음)·부르르 비대상, `pickPenEntry` ②·`bouncePhase`·`wrapMotion` ②·바운스 ⓐ가 `isPressing` 기준, 새 계약 없음). 신규 자동 TC-204~TC-211(`inputMachine.click.test.ts` — 초기값·`isPressing`, 규칙표 1·2·3, 설계 예·좌우 동시·중복 누름, 비펜 모드·모드 전환, 키 겹침 4~7, 특수 키 겹침 8~10, 부르르 11·12, 다른 입력 불변·불변성·비보관), TC-212·TC-213(`penClick.test.tsx` — `pickPenEntry` 클릭 예, `PenHand` `clickHeld`만으로 누름 그림), TC-214~TC-221(`OverlayApp.penClick.test.tsx` — 규칙표 1~14 화면 통합, 모드 전환, 쉬는중 클릭), 수동 TC-222(MC-21). 개정: TC-001(`clickHeld: []`), TC-198(클릭 = 손 누름 그림·젤리, 위치·각도 불변), TC-203·MC-20 ⑥, TC-FLOW-09 종료 상태(`bounceSeq`). TC-FLOW-10(S-10) 신규. 추적표 v1.2 추가분. 자동 165 → 183, 수동 19 → 20, TC-FLOW 8 → 9 | CR-027(사용자 🔒 2026-09-24) · requirements.md v2.3 · design.md §4·§6 P-4·§7·§10.1·§10.3·§10.7·§10.8 · design/functions.md §5.2·§5.5 · design/components.md §3 CR-027 갱신 |
| 2026-09-24 | v1.3 | CR-029 증분(R-27 대기·쉬는중 그림 선택 강등 — 없으면 상태 레이어 투명·보이는 그림 `kb_up`, R-28 위치 잠금 중 클릭 통과·끌기/Ctrl+휠 불가 — 적용은 core 창 속성, **오버레이 소스 변경 없음**·`positionLock` 미참조). 신규 자동 TC-223~TC-227(`OverlayApp.lock.test.tsx` — design.md §10.9.2 회귀 ①~④: 그림 없는 대기, 그림 없는 쉬는중 진입(팔 쉬는 위치로 전이 관찰), 누름 중 `kb_down`만·펜 모드 `kb_up` 고정, `idle`만 있을 때 쉬는중에서 `idle` 사라짐 / R-28: 잠금 값 무관 DOM 동일·`data-tauri-drag-region` 유지·잠금 중 입력 반응·설정 창 배율 반영·해제 수신 불변·`setSettings` 0회), 수동 TC-228(MC-22 — §10.9.2 ⑤~⑨ + 재적용(숨김→표시·작업표시줄 토글)·재시작 유지·잔여 위험 ④′·R-27 실측). 픽스처는 `{...DEFAULT_SETTINGS}` 상속 관례(`positionLock` 기본 false). 기존 TC 개정 없음. TC-FLOW-11(S-11) 신규. 추적표 v1.3 추가분(요구·설계·전이표·CR·사용자행). 소스 변경이 없어 신규 자동 TC는 처음부터 Green 기대. 자동 183 → 188, 수동 20 → 21, TC-FLOW 9 → 10 | CR-029(사용자 🔒 2026-09-24) · requirements.md v2.4 · design.md §7·§10.9·RTM R-27·R-28 · design/a11y.md(CR-029) · contract v0.14 §3.3 |
| 2026-09-24 | v1.4 | CR-033 증분(R-29 펜 손 사용 토글 — 펜 모드 = `pen_up` 등록 && `mouse.penMode`, `OverlayApp`이 `isPenMode(manifest, settings.mouse)`를 한 번 계산해 `config`(`kbFrames`·`clickPress`)·`LayerStack`·`PenHand` prop `penMode`로 넘김, 꺼짐 = 키보드 `kb_down`·특수 키 그림·클릭 파츠만·젤리는 키만·손 `pen_up` 고정·팔 끝 추종 유지, `settings://changed`로 즉시 전환·상태기계 초기화 없음). 신규 자동 TC-229~TC-231(`penToggle.test.tsx` — `isPenMode` 예 4개·옛 설정, `LayerStack` prop, `PenHand` prop), TC-232~TC-236(`OverlayApp.penToggle.test.tsx` — 꺼짐 키·클릭·팔 끝 추종, 켜짐↔꺼짐 전환, 전환 중 눌린 클릭), 수동 TC-237(MC-23). 개정: TC-187(2인자), TC-201 ①(mouse null = 펜 모드 아님 → `kb_down_1`), TC-225 ②(토글 켜짐 설정), TC-025(`penMode: false`), 재확인 TC-207, 참조·Given 보충 TC-188·TC-191·TC-200·TC-202·TC-214~TC-221. 스펙 픽스처: 펜 전제 스펙 `penMode: true`(`OverlayApp.pen`·`OverlayApp.penClick`·`PenHand`·`penClick`·`penLayers`), `OverlayApp.lock` `MOUSE` `penMode: false`. 비펜 스펙 픽스처(tsc 전용 — `penMode: false`·`LayerStack penMode={false}`): `MouseArm`은 작성 패스, `handPart`·`OverlayApp{,.jelly,.mouse,.shiver,.special}`·`layers`·`specialKey.render`는 후속 패스(같은 날)에 적용. TC-FLOW-12(S-12) 신규. 추적표 v1.4 추가분(요구·설계·사용자행·CR). 자동 188 → 196, 수동 21 → 22, TC-FLOW 10 → 11 | CR-033(사용자 🔒 2026-09-24) · requirements.md v2.5 · design.md §10.10·RTM R-29 · design/functions.md §5.3·§5.5 CR-033 · design/components.md §3 CR-033 · contract v0.15 §3.3 |
| 2026-09-25 | v1.5 | CR-037 증분(R-30 헤어(뒷머리) 파츠 — 슬롯 `hair`(contract v0.17), `HairLayer`(`memo`, hair 없으면 `null`, `<img class="layer" alt="" draggable=false>`, style 없음)를 `.jellyWrap` 첫 자식에 둠 → 겹침 배경 → 헤어 → 팔 → 본체 → 펜 손, 1장 고정, 젤리·부르르는 부모 래퍼에서, `assets://changed`로 갱신). 신규 자동 TC-238~TC-240(`HairLayer` — 렌더·`null`·`memo`), TC-241~TC-246(`OverlayApp` — design.md §10.11 회귀 ① 첫 자식·속성, ② DOM 순서, ③ hair 없음, ④ 입력·쉬는중·펜 모드·잠금에도 불변(속성 변경 0건), ⑤ 젤리·부르르 조상/배경 밖, ⑥ `assets://changed` 추가·교체·비우기·재등록, ⑦ `mouse null`·`monitors []`), 수동 TC-247(MC-24). 새 스펙 `OverlayApp.hair.test.tsx` 1개(bridge mock). 기존 TC 개정 없음 — `.jellyWrap` 첫 자식·자식 구성 단언 TC(TC-152·TC-153·TC-196·TC-232·TC-234 등)는 hair 미등록 픽스처라 재확인만. TC-FLOW-13(S-13) 신규. 추적표 v1.5 추가분(요구·설계·전이표·사용자행·CR). 자동 196 → 205, 수동 22 → 23, TC-FLOW 11 → 12 | CR-037(사용자 🔒 2026-09-25) · requirements.md v2.6 · design.md §1·§2·§7·§8·§10.1·§10.11·RTM R-30 · design/components.md §3 CR-037 · design/functions.md §5.3 `HairLayer` · contract v0.17 |
| 2026-09-25 | v1.5a | 스펙 복구만(TC 기대 불변). `overlayStyles.test.ts`의 CSS 원문 읽기를 `import css from '../overlay.module.css?raw'`(vitest가 `.module.css`를 CSS Modules 객체로 처리 → collect 단계 `css.replace is not a function`) → Node `fs.readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../overlay.module.css'), 'utf8')`로 교체(`/// <reference types="node" />`, 새 의존성 없음 — `@types/node` 기존). 머리 주석 「collect 실패 중·기대값만」 문구 정리, CSS 절 스펙 문장·TC-158·TC-174 Given(`?raw` → `fs.readFileSync`)·TC-174 스펙 비고 갱신. TC-078~TC-082·TC-112·TC-143·TC-158·TC-174 기대값을 design.md §2·§10.3·§10.5·§10.11·design/functions.md §5.4·design/a11y.md와 현행 `overlay.module.css`에 대조 — 설계·CSS·기대값 모두 일치해 기대값 변경 없음. TC 수 변화 없음 | 사용자 승인(복구, 2026-09-25) · design.md §2·§10.3·§10.5·§10.11 |
| 2026-09-25 | v1.5b | CR-038 기본값 반영(기대값만, TC 수 변화 없음). `DEFAULT_MOUSE_SETTINGS` 어깨 620,530 → 558,500 · `penPos` 380,496 → 356,504 · `penMode` false → true. 개정: TC-025(`toEqual` 기대 객체), TC-048②·TC-123(기본 어깨로 원점 `231px 38px` → `169px 8px`, TC-123 변형 `rotate(148.63deg)`/`rotate(172.22deg) scaleX(1.6) rotate(-141.71deg)` — 손 계산 근거 스펙 주석·§0.2 「기본 영역」 행). 기본 `penMode` true 영향 없음 확인: 기본값을 쓰는 TC는 `OverlayApp.test.tsx`의 설정 조회 실패 경로뿐이고 그 매니페스트에 `pen_up`이 없어 `isPenMode` = false, 다른 스펙은 모두 `mouse` 픽스처에 `penMode`를 명시(또는 `mouse: null`) | CR-038(사용자 🔒) · `src/bridge/types.ts` contract v0.18 |
