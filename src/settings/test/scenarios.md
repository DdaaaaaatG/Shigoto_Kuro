# settings 테스트 시나리오

- 기준: `src/settings/design.md`(2026-09-24, 변경이력 마지막 행 CR-026) / `src/settings/requirements.md` v1.6 / `doc/200_설계/bridge/contract.md` v0.8 + CR-018 미확정 계약(`MouseSettings.area: [Point, Point, Point, Point]` 추가·`pad` 삭제. 기본 `area` = `DEFAULT_AREA` [(375,525), (495,525), (495,625), (375,625)] — 관리자 전달 core 기본값, 손 기준점 435,575 중심) + CR-020 미확정 계약(`Settings.slam`·`AssetSlot` `'slam'` 삭제) + **CR-026 미확정 계약**(`MouseSettings.penPos: Point | null` 기본 `null` = `DEFAULT_MOUSE_SETTINGS.penPos`, `AssetSlot` 펜 슬롯 — 이 화면은 `slotKey` `'pen_up'`만) + overlay CR-025 `resolvePenPos`(`src/state/mouseMapping.ts` import — overlay `design/functions.md` `defaultPenPos`: `penPos` null이면 손 그림 중심을 `mouse.hand ?? 이동 영역 중심`에 두고 정수 반올림) / CR 대장 `test/change-requests.md`(CR-003~006, CR-016, CR-018, CR-020, CR-026)
- **CR-028 기준(v8, 이 줄이 위 줄보다 우선)**: `src/settings/design.md`(변경이력 마지막 행 CR-028) + `design/general-tab.md` · `design/images-tab.md` · `design/i18n.md` / `src/settings/requirements.md` **v1.7** / `doc/200_설계/bridge/contract.md` **v0.14**(소스 미적용 — 스펙은 v0.14 이름으로 쓰고 bridge는 mock) / 수용 기준 U-1 ~ U-13(`doc/200_설계/architecture/settings-v2-03-packet-ui.md` §6) / 결정: `idleSeconds` 정본 범위 60 ~ 3600초(1 ~ 60분), 표준 HTML 원소 직접 사용(D-3) 수용
- **CR-031 기준(v9, 이 줄이 위 두 기준 줄보다 우선)**: `src/settings/design.md`(변경이력 마지막 행 CR-031 — §2·§2.1·§3·§4 `tabRefs`·§5.3 `onTabKeyDown`·렌더 골격 개정·§9·§11 D-4·RTM R-27·R-28) + `design/images-tab.md` §1·§6(2′·3′·6′·`AddSlotCard`)·§6.1 + `design/general-tab.md` §2.2 / `src/settings/requirements.md` **v1.8**(R-19 폐기 → R-27·R-28) / contract v0.14(변경 없음) / CR 대장 CR-031
- **CR-031 범위·수(v9)**: 유효 요구 R-01 · R-03 · R-04 · R-10 · R-11 · R-12 · R-15 ~ R-18 · R-20 ~ R-28(R-19 폐기 → R-27). 자동 TC 번호 158개(TC-001 ~ TC-158) 중 **유효 152 · 폐기 6** · TC-FLOW 13개 · 수동 26개(M-01 ~ M-26). CR-031 개정·추적은 TC 목록 끝 「CR-031 개정」 절. 아래 v8 「범위·수」 줄은 기록이다
- 작성일: 2026-09-23(개정 2026-09-24) · 작성: ui-test-designer · 상태: **개정 v9(CR-031 반영 — 증분 모드. 이전: v8 CR-028)**
- **CR-028 범위·수(v8)**: 유효 요구 R-01 · R-03 · R-04 · R-10 · R-11 · R-12 · R-15 ~ R-26 — **보류 없음**. 자동 TC 번호 152개(TC-001 ~ TC-152) 중 **유효 146 · 폐기 6**(TC-008, TC-012, TC-040 ~ TC-043) · TC-FLOW 13개(TC-FLOW-01 ~ TC-FLOW-13) · 수동 24개(M-01 ~ M-24). 아래 「범위」·「수」 두 줄은 v7 기록이다
- **CR-028 스펙 파일(v8)**: 기존 `test/mouseWizard.test.ts` · `test/MousePartsTab.test.tsx`(픽스처·TC-030 개정) · `test/SettingsApp.test.tsx`(개정·신규) · `test/AreaOutline.test.tsx` · `test/labels.test.ts`(**대상 교체** — `labels.ts` → `i18n/ko.ts` 이관 확인) + 신규 `test/i18n.test.ts` · `test/GeneralTab.test.tsx` · `test/generalValues.test.ts` · `test/imageSlots.test.ts` · `test/ImagesTab.test.tsx`
- **CR-028 mock·시간 규약(v8)**: `bridge/commands` mock에 `resetOverlayPosition`·`setSettingsWindowTitle` 추가(`setSettingsWindowTitle`은 매 테스트 `mockResolvedValue(undefined)`), `@tauri-apps/api/window` mock 추가. `bridge/types`(`REQUIRED_SLOTS`·`isRequiredSlot`·`slotKey`·`DEFAULT_MOUSE_SETTINGS`·`SCALE_MIN/MAX`)·`src/state/mouseMapping`(`resolvePenPos`)은 실물. 문구는 Provider 없이 렌더하면 ko(`useMessages()` 기본값), ja·en 단언은 사전(`i18n/ja`·`i18n/en`) 값을 import해 비교한다(ja·en 문구 「검수 필요」라 리터럴 고정은 §4.1만). **시간 의존 = 배율 키보드 저장 지연 300ms뿐** — TC-122·TC-123은 `vi.useFakeTimers({ toFake: ['setTimeout','clearTimeout'] })` + `vi.advanceTimersByTime`, 그 TC 안에서는 `waitFor` 금지(실제 sleep 없음)
- 범위: **1단계** = R-01 · R-10 · R-11 · R-12 · R-15 · R-16 · R-17 · R-18. **보류(다음 단계, 🔒 2026-09-23)** = R-03 · R-04 · R-06, R-14 → 본 요구 TC 없음. 단 design §2·§5.3이 이번 단계에 확정한 **보류 기간 임시 자리표시**(이미지 탭 목록·동작 탭 JSON)는 TC-040~TC-043으로 검증한다. **폐기** = R-02(→R-14) · R-05(CR-020, 대체 없음 — 쾅 메커니즘 삭제 🔒 2026-09-24) · R-07(→R-12) · R-08(→R-10) · R-09(→R-13) · R-13(→R-17) → 폐기 요구를 가리키던 TC는 대체 요구로 이관하거나 폐기했다(아래 「CR-016 개정 요약」·「CR-018 개정 요약」).
- 수: 자동 TC 번호 92개(TC-001~TC-092) 중 **유효 90 · 폐기 2**(TC-008, TC-012) · TC-FLOW 7개(자동 통합 6 + 조합 1) · 수동 15개(`test/manual-checklist.md` M-01~M-15. CR-026 실물 항목 M-16은 **미반영** — 아래 「CR-026 개정 요약」)
- 스펙 파일(초안): `test/mouseWizard.test.ts` · `test/labels.test.ts` · `test/MousePartsTab.test.tsx` · `test/SettingsApp.test.tsx` · `test/AreaOutline.test.tsx`(CR-018 신규)
- bridge mock 규칙: `vi.mock('bridge/commands')`(실물 `toBridgeError`만 유지) · `vi.mock('bridge/events')`(구독 콜백을 붙잡아 emit 흉내) · `@tauri-apps/api/core`·`/event`·`plugin-dialog`도 mock. 실제 Tauri 런타임 의존 없음.
- 비동기 동기화 규약: 저장 완료 대기는 **결정적인 조건**으로 한다 — `onError` 호출 횟수 + 「기본값으로 리셋」 활성(이 버튼은 `saving` 중 비활성). 실제 sleep·가짜 시계 없음(이 화면에 시간 의존 동작 없음).

## 포인터·좌표 규약 (jsdom)

| 항목 | 방식 |
|---|---|
| 좌표 기본 | jsdom의 `getBoundingClientRect()`는 모두 0이므로 `clientX/Y` = 미리보기 오프셋. 캔버스 900×700 → `scale` 0.5 → 오프셋 (150, 100) = 캔버스 (300, 200) |
| rect 반영 검증 | TC-018(클릭)·TC-050(포인터)만 `vi.spyOn(preview(), 'getBoundingClientRect').mockReturnValue({ left:10, top:20, right:460, bottom:370, width:450, height:350, x:10, y:20, toJSON })`. 미리보기 div는 재렌더에도 같은 DOM 노드라 spy가 유지된다 |
| `PointerEvent` | jsdom에 `window.PointerEvent`가 없으면 testing-library `fireEvent.pointerDown/Move/Up/Cancel`이 일반 `Event`로 만들어 `clientX/Y`·`button`·`pointerId`가 빠진다. 스펙 파일 머리에서 **없을 때만** `MouseEvent`를 확장한 stub(`pointerId`·`pointerType`·`isPrimary` 필드, 생성자 init에서 채움)을 `Object.defineProperty(window, 'PointerEvent', …)`로 등록한다. 있으면 그대로 쓴다 |
| 포인터 캡처 | jsdom에 `setPointerCapture`·`releasePointerCapture`·`hasPointerCapture`가 없다. 매 테스트 `beforeEach`(`vi.resetAllMocks()` 뒤)에서 `Element.prototype`에 **상태 있는** `vi.fn` 3개를 설치한다 — 잡은 pointerId 집합에 `set`은 추가, `release`는 삭제, `has`는 포함 여부 반환. TC는 `set`·`release` 호출 횟수·인자(pointerId 7)를 단언한다 |
| 이벤트 대상 | 모든 포인터 이벤트는 미리보기 div(`data-testid="mouse-preview"`)로 보낸다. 손 그림 `<img>`는 바탕 아래 + `pointer-events: none`이라 포인터를 받지 않는다(design §10) — 실제 CSS는 M-12 |
| pointerId·버튼 | pointerId 7 고정. `pointerDown`은 `button: 0`(TC-053만 `button: 2`) |
| 놓은 뒤 click | 브라우저는 pointerup 뒤 click을 보내지만 jsdom `fireEvent`는 보내지 않는다 → 규칙 ③ 검증(TC-049)은 `fireEvent.click`을 명시적으로 보낸다 |
| 끌기 좌표 예 | 캔버스 900×700 · scale 0.5 · `MOUSE.partPos` (100, 200) · 손 그림 200×150 → 잡히는 사각형 = 캔버스 x∈[100, 300)·y∈[200, 350) = 미리보기 오프셋 x∈[50, 150)·y∈[100, 175). 누름 (100, 150) → 캔버스 (200, 300), grab (100, 100). 이동 (150, 175) → 캔버스 (300, 350) → 위치 (200, 250). 제한 범위 x∈[0, 700]·y∈[0, 550] |
| 표시 단언 | 손 그림 = `preview().querySelector('img[src="asset://mouse_base.png"]')`의 인라인 style `left/top/width/height`(캔버스 값 × scale px). 파츠 위치 값 = `dt` 「파츠 위치」 다음 `dd`의 `textContent` 정확히 `({x}, {y})` |

## 공통 픽스처

| 이름 | 값 |
|---|---|
| `AREA` (CR-018) | 저장된 이동 영역 `[(200,500), (300,500), (300,560), (200,560)]`(왼쪽 위 · 오른쪽 위 · 오른쪽 아래 · 왼쪽 아래 — 옛 pad 자리와 같은 사각형) |
| `DEFAULT_AREA` (CR-018) | `[(375,525), (495,525), (495,625), (375,625)]` — core `settings.md` 기본값(관리자 전달) = bridge `DEFAULT_MOUSE_SETTINGS.area` 기대값 |
| `MOUSE` | `shoulder (600,480)` · `area AREA` · `hand (400,560)`(non-null이어도 손 마커가 없음을 보이기 위함) · `partPos (100,200)` · `penPos null`(CR-026). **`pad`·`armWidth`·`armColor` 없음**(CR-016·CR-018) |
| `SETTINGS` | `scale 1.5` · `idleSeconds 120` · `overlay {30,40,true}` · `mouse MOUSE` · `autostart false`. **`slam` 없음**(CR-020 — 스펙의 `Settings` 픽스처에서 삭제) |
| `DEFAULT_MOUSE_EXPECTED` | R-17·R-18: `shoulder (620,530)` · `area DEFAULT_AREA` · `hand null` · `partPos (389,492)` · `penPos null`(CR-026) — 키 5개(`area`·`hand`·`partPos`·`penPos`·`shoulder`), `pad` 없음 |
| `PEN` · `PEN_HAND` (CR-026) | `pen_up` 100×80(`asset://pen_up.png`) · canvas 900×700, entries `body` 900×700 + `mouse_base` 200×150 + `PEN` |
| `PEN_HOME` · `PEN_OVER` · `PEN_DEFAULT_HOME` (CR-026) | (350,520) = `MOUSE`(`penPos` null·`hand` (400,560))의 기본 위치(손 그림 중심 = `hand`) · (150,250) = 팔 파츠 사각형과 겹치는 저장 위치(펜 손 사각형 [150,250)×[250,330) ⊂ 팔 파츠 [100,300)×[200,350)) · (385,535) = `hand` null·`DEFAULT_AREA` 중심 (435,575)의 기본 위치 |
| `withPen(p)` (CR-026) | `{ ...SETTINGS, mouse: { ...MOUSE, penPos: p } }` |
| 펜 손 끌기 좌표 (CR-026) | scale 0.5 · 기본 위치 (350,520) → 잡히는 사각형 = 캔버스 x∈[350,450)·y∈[520,600) = 오프셋 x∈[175,225)·y∈[260,300). 누름 (200,280) → 캔버스 (400,560), grab (50,40). 이동 (250,300) → 캔버스 (500,600) → (450,560). 제한 범위 x∈[0,800]·y∈[0,620](펜 손 크기 기준). 표시 단언 = `img[src="asset://pen_up.png"]` 인라인 style(캔버스 × 0.5 px) + `dt` 「손 위치」 다음 `dd` 정확히 `({x}, {y})` |
| `NEW_AREA` · `AREA_SAVED` (CR-018) | 네 번 클릭으로 찍는 영역 `[(100,400), (800,400), (800,650), (100,650)]` · `{ ...SETTINGS, mouse: { ...MOUSE, area: NEW_AREA } }` |
| 이동 영역 클릭 좌표 (CR-018) | rect 0 · scale 0.5 → 미리보기 오프셋 (50,200) · (400,200) · (400,325) · (50,325) = 캔버스 `NEW_AREA`. 네 점 모두 손 그림 사각형(오프셋 x∈[50,150)·y∈[100,175)) 밖. TC-065만 rect `left 10 · top 20` spy → clientX/Y = 오프셋 + (10, 20). TC-071은 손 그림 안 (150,175) → 캔버스 (300,350)을 첫 꼭짓점으로 |
| `AREA_ERR` (CR-018) | `{ code:'SETTINGS_INVALID', message:'이동 영역 값이 올바르지 않습니다.' }`(core 거부 흉내 — 문구는 픽스처일 뿐 화면 라벨이 아님) |
| 이동 영역 안내 문구 (CR-018) | pickArea 0점 `1/4 이동 영역의 왼쪽 위 꼭짓점을 클릭해주세요.` · 1점 `2/4 이동 영역의 오른쪽 위 꼭짓점을 클릭해주세요.` · 2점 `3/4 이동 영역의 오른쪽 아래 꼭짓점을 클릭해주세요.` · 3점 `4/4 이동 영역의 왼쪽 아래 꼭짓점을 클릭해주세요.` · reviewArea `이동 영역을 확인하고 저장하세요.` |
| 영역 값 문자열 (CR-018) | 「이동 영역」 `dd` — `DD_SAVED` = `왼쪽 위 (200, 500) · 오른쪽 위 (300, 500) · 오른쪽 아래 (300, 560) · 왼쪽 아래 (200, 560)` · `DD_NEW` = `왼쪽 위 (100, 400) · 오른쪽 위 (800, 400) · 오른쪽 아래 (800, 650) · 왼쪽 아래 (100, 650)` · `DD_DEFAULT` = `왼쪽 위 (375, 525) · 오른쪽 위 (495, 525) · 오른쪽 아래 (495, 625) · 왼쪽 아래 (375, 625)` |
| 영역 선 좌표 문자열 (CR-018, scale 0.5) | 미리보기 안 `<polygon>`·`<polyline>`의 `points` 속성 — `SVG_SAVED` = `100,250 150,250 150,280 100,280` · `SVG_NEW` = `50,200 400,200 400,325 50,325` · `SVG_DEFAULT` = `187.5,262.5 247.5,262.5 247.5,312.5 187.5,312.5`. 점 표식 = `<circle>`의 `cx,cy`(`r` 3) |
| 영역 선 종류 판정 (CR-018) | 1px 저장 선 / 2px 편집 선은 CSS Modules 값이라 jsdom 계산 스타일로 보지 않는다 → **클래스 비교**(저장 선 클래스 ≠ 편집 선 클래스, 열린 편집 선 = 닫힌 편집 선, 점 표식 클래스는 별도)로 판정하고 굵기·색 실물은 M-13 |
| `withPart(p)` | `{ ...SETTINGS, mouse: { ...MOUSE, partPos: p } }` |
| `HAND`(기본 manifest) | canvas 900×700, entries `body` 900×700(`asset://body.png`) + `mouse_base` **200×150**(`asset://mouse_base.png`) |
| `FULL` | canvas 900×700, `body` 900×700 + `mouse_base` 900×700(캔버스 전체 크기 그림) |
| `NO_HAND` | canvas 900×700, `body`만 |
| `KB_HAND` · `KB_ONLY` | canvas 900×700, `kb_up` 900×700 + `mouse_base` 200×150 / `kb_up`만 |
| `ALL` | canvas 900×700, `background` · `body` · `kb_up` 각 900×700 + `mouse_base` 200×150 |
| `HAND_NOBASE` | `{ canvas: null, entries: [mouse_base 200×150] }` |
| `EMPTY` | `{ canvas: null, entries: [] }` |
| `KB_DOWN_0` | `slot { kind:'kb_down', index:0 }` · `kb_down_0.png` · 900×700 |
| `SAVED` | `{ ...SETTINGS, mouse: { ...MOUSE, shoulder: (300,200) } }` |
| `M200` · `S200` | `{ ...MOUSE, shoulder: (200,100) }` · `{ ...SETTINGS, mouse: M200 }` (TC-044) |
| `canvasOf(w,h)` | canvas w×h, entries `body` w×h + `mouse_base` w×h (TC-044) |
| 안내 문구 | idle `어깨축을 설정하면 팔 파츠가 그 점을 축으로 회전합니다.` · pickShoulder `축이 될 부분을 마우스로 클릭해주세요.` · review `축 위치를 확인하고 저장하세요.` |
| 빈 상태 문구 | `캐릭터 이미지(kb_up)가 등록되지 않았습니다.`(CR-016. 옛 `몸통 이미지가 등록되지 않았습니다.`는 없어야 함) |

## 기존 스펙 처리 방침 (`src/settings/mouseWizard.test.ts`)

**완료.** 옛 2단계 마법사 스펙은 CR-005 적용 패스에서 삭제됐다(2026-09-23 파일 목록에서 부재 확인). 유효 사례는 `test/mouseWizard.test.ts` TC-001~TC-007로 옮겨져 있다. CR-016으로 `isPreviewLayerMode` 사례(TC-008)는 삭제했다.

## 「선행」 표기

각 TC의 「선행」 줄은 통과에 필요한 선행 적용을 적는다(없음 = 현행 소스로 통과 예상). 선행 미충족 FAIL은 TDD의 예정된 실패다. 2026-09-23 확인 상태:

- **CR-018 화면**(2026-09-24 확인): 소스 미적용(`WizardState.area`·`startArea`·`pickArea`/`reviewArea`·`applyWizard` reviewArea·`onStartArea`·`guideText(w)`·`AreaOutline`·「이동 영역 설정하기」·값 목록 「이동 영역」 행·라벨 11키 없음). 따라서 TC-001~TC-005(상태 모양), TC-009, TC-013, TC-016, TC-019·TC-020·TC-022·TC-049(idle 버튼 3개), TC-024, TC-026(영역 표시 부분), TC-059~TC-077, TC-FLOW-02·TC-FLOW-04·TC-FLOW-06은 적용 전 예정된 FAIL이다.
- **bridge CR-018**: 미확정 계약(bridge 인계). `src/bridge/types.ts` `MouseSettings`에 `area` 없음·`pad` 있음, `DEFAULT_MOUSE_SETTINGS.area` 없음(2026-09-24 확인). 스펙 픽스처는 **목표 계약 모양**(`area` 있음·`pad` 없음)이라 계약 반영 전에는 `yarn tsc --noEmit`이 5개 스펙 파일을 거부한다(vitest 실행은 타입을 지워 영향 없음). TC-025·TC-027·TC-074·TC-FLOW-04의 기본값 전체 비교는 bridge가 `DEFAULT_MOUSE_SETTINGS.area = DEFAULT_AREA`·`pad` 삭제를 반영해야 PASS — 예정된 실패.
- **CR-016 화면·bridge CR-016**: 충족(CR 대장 CR-016 「적용·미검증」 — `yarn test --run src/settings` 77/77, bridge v0.8에 `partPos` 있음·팔 필드 없음).
- **이미 충족**: bridge `DEFAULT_MOUSE_SETTINGS.hand = null`(types.ts), CR-005(대장 「적용·미검증」), hand-anchor 래퍼 `getHandAnchor`(commands.ts)·`onHandAnchorChanged`(events.ts) 존재 → Q-01 재실행 조건 충족.

## CR-016 개정 요약

| 구분 | TC | 처리 |
|---|---|---|
| 폐기 | TC-008 | `isPreviewLayerMode` 삭제(design §5.1). 스펙의 import·사례 삭제. 대체 없음(모드 판별 자체가 없어짐) — 패드 박스 규칙은 TC-011 |
| 폐기 | TC-012 | 「레이어 이동 모드가 아니면 패드 박스 표시」 — R-12 「패드 박스 항상 숨김」과 정면 충돌. 스펙 사례 삭제. 대체 TC-011 |
| 요구 이관만 | TC-007(R-07→R-12), TC-024(R-09→R-13), TC-028(R-09→R-13), TC-039(R-07→R-12), TC-040·TC-041(R-02→R-14 임시 표시), TC-044(R-07→R-12) | 기대 결과 변경 없음(픽스처 모양만 새 계약) |
| 기대 개정 | TC-005, TC-006, TC-009, TC-010, TC-011, TC-013, TC-014, TC-015, TC-025, TC-026, TC-027, TC-030, TC-034, TC-035, TC-036, TC-037, TC-040, TC-FLOW-02, TC-FLOW-04 | 아래 각 TC에 「개정(CR-016)」 표기 |
| 신규 | TC-045~TC-058, TC-FLOW-05, M-11, M-12 | R-11 끌어다 놓기 · R-12 바탕·손 그림 배치 |

## CR-018 개정 요약

| 구분 | TC | 처리 |
|---|---|---|
| 요구 이관만 | TC-028(R-13→R-17) | 기대 결과 변경 없음(픽스처 모양만 새 계약) |
| 기대 개정(상태 모양) | TC-001, TC-002, TC-003, TC-004 | `initialWizard`·`WizardState` 리터럴에 `area: []` 추가, TC-002 키 목록 `['area','shoulder','step']` |
| 기대 개정 | TC-005 | base·기대값의 `pad` → `area`(보존 확인) |
| 기대 개정 | TC-009 | 라벨 18키 → 29키(§8 CR-018 11키) |
| 기대 개정 | TC-013 | 값 목록 두 행 → 세 행(「이동 영역」 `DD_SAVED`) |
| 기대 개정 | TC-016, TC-019(스펙 단언), TC-020, TC-022, TC-049, TC-FLOW-02 | idle 버튼 2개 → 3개 `['어깨축 설정하기', '이동 영역 설정하기', '기본값으로 리셋']` |
| 기대 개정 + 요구 이관(R-13→R-17) | TC-024, TC-025, TC-026, TC-027, TC-FLOW-04 | 리셋 기대값 `pad` 삭제·`area` = `DEFAULT_AREA`, 리셋 저장 중 「이동 영역 설정하기」 비활성, 리셋 실패 시 저장된 영역 선·값 유지, 수신 뒤 기본 영역 선·값 |
| 신규 | TC-059~TC-077, TC-FLOW-06 | R-15 이동 영역 설정 · R-16 영역 상시 표시·값 목록 · R-17(기본 영역 표시) |
| 수동 | M-03, M-07, M-08, M-09 개정 · M-13, M-14, M-15 신설 | 영역 선 존재·리셋 기대값·해제 상태 저장·Tab 순서와 포커스 / 영역 선 모양·저장 반영·상호 배타 실물 |

---

## TC 목록

### TC-001 · start → pickShoulder · 종류: 자동 · 요구: R-10 · 설계: §5.1 `wizardReduce`, §4 `wizard` · CR-005 · **개정(CR-018 — 상태 모양)**
- Given `initialWizard` / `{ step:'pickShoulder', shoulder:null, area:[] }` / `{ step:'review', shoulder:(1,2), area:[] }`
- When `wizardReduce(state, { type:'start' })`
- Then ⓐ 화면: 없음(순수 모듈 — 표시는 TC-017) ⓑ 상태: `initialWizard`는 정확히 `{ step:'idle', shoulder:null, area:[] }`, 세 결과 모두 정확히 `{ step:'pickShoulder', shoulder:null, area:[] }`(`toStrictEqual`) ⓒ bridge: 호출 없음(모듈은 bridge 타입만 import)
- 선행: CR-005 · CR-018 화면(`area` 필드) · 스펙: `test/mouseWizard.test.ts`

### TC-002 · pick 한 번이면 review, 손 위치 단계 없음 · 종류: 자동 · 요구: R-10 · 설계: §5.1 `wizardReduce`·삭제 항목, §4 `WizardStep` · CR-005 · **개정(CR-018 — 상태 모양)**
- Given start 직후 `{ step:'pickShoulder', shoulder:null, area:[] }`
- When `pick` point (620,530)
- Then ⓐ 화면: 없음(표시는 TC-018) ⓑ 상태: 정확히 `{ step:'review', shoulder:(620,530), area:[] }`, 키는 `area`·`shoulder`·`step` 셋뿐(`hand` 필드 없음, 어깨축 pick은 `area`에 점을 쌓지 않음) ⓒ bridge: 호출 없음
- 선행: CR-005 · CR-018 화면 · 스펙: `test/mouseWizard.test.ts`

### TC-003 · idle·review에서 pick 무시 · 종류: 자동 · 요구: R-10 · 설계: §5.1 `wizardReduce` · **개정(CR-018 — 상태 모양)**
- Given `initialWizard` / `{ step:'review', shoulder:(300,200), area:[] }`
- When `pick` (1,1) / (9,9)
- Then ⓐ 화면: 없음(표시는 TC-019) ⓑ 상태: 입력과 같은 값(`{ idle, null, [] }` / `{ review, (300,200), [] }`) ⓒ bridge: 호출 없음. reviewArea의 pick 무시는 TC-061
- 선행: CR-005 · CR-018 화면(상태 모양) · 스펙: `test/mouseWizard.test.ts`

### TC-004 · cancel·saved → initialWizard · 종류: 자동 · 요구: R-10 · 설계: §5.1 `wizardReduce` · **개정(CR-018 — 상태 모양)**
- Given idle / pickShoulder / review (300,200) — 모두 `area:[]`
- When 세 상태 각각에 `cancel`, 그리고 각각에 `saved`
- Then ⓐ 화면: 없음(표시는 TC-020·TC-022) ⓑ 상태: 여섯 결과 모두 정확히 `{ step:'idle', shoulder:null, area:[] }` ⓒ bridge: 호출 없음. 이동 영역 단계의 cancel·saved는 TC-061
- 선행: CR-005 · CR-018 화면(상태 모양) · 스펙: `test/mouseWizard.test.ts`

### TC-005 · applyWizard(review)는 축만 바꾼다 · 종류: 자동 · 요구: R-10 · 설계: §5.1 `applyWizard` ① ③ · **개정(CR-016, CR-018 — `pad` → `area`)**
- Given base = `{ shoulder:(600,480), area:AREA, hand:(400,560), partPos:(100,200) }`
- When `applyWizard(base, { step:'review', shoulder:(300,200), area:[] })`, 그리고 idle / pickShoulder / `{ review, shoulder null, [] }`
- Then ⓐ 화면: 없음(저장 인자는 TC-020) ⓑ 상태: 첫 경우 정확히 `{ shoulder:(300,200), area:AREA, hand:(400,560), partPos:(100,200) }`(`area`·`partPos` 보존, `pad`·팔 필드 없음), base 불변. 나머지 세 경우 `null` ⓒ bridge: 호출 없음. reviewArea 적용은 TC-062
- 선행: CR-005 · CR-018 화면 · bridge CR-018(타입) · 스펙: `test/mouseWizard.test.ts`

### TC-006 · previewToCanvas 변환·반올림·고정·scale≤0 · 종류: 자동 · 요구: R-10, R-11 · 설계: §5.1 `previewToCanvas`, §10 좌표 · **개정(CR-016, 요구 추가)**
- Given canvas 900×700
- When 오프셋 (247.5,285)·(100.3,50.2) @0.5, (-10,9999) @0.5, (950,10) @1, (30.4,40.6) @0·@-2
- Then ⓐ 화면: 없음(클릭 표시는 TC-018·TC-044, 끌기 표시는 TC-049·TC-052) ⓑ 반환: (495,570) · (201,100) · (0,700) · (900,10) · (30,41) · (30,41) ⓒ bridge: 호출 없음
- 선행: 없음 · 스펙: `test/mouseWizard.test.ts`

### TC-007 · fitScale · 종류: 자동 · 요구: R-12 · 설계: §5.1 `fitScale`, §4 `scale` · 요구 이관(R-07→R-12)
- Given 상자 450×350
- When 캔버스 900×700 · 450×350 · 612×354 · 0×700 · 900×0
- Then ⓐ 화면: 없음(미리보기 크기는 TC-010·TC-044) ⓑ 반환: 0.5 · 1 · 450/612(소수 10자리 근사) · 1 · 1 ⓒ bridge: 호출 없음
- 선행: 없음 · 스펙: `test/mouseWizard.test.ts`

### TC-008 · ~~isPreviewLayerMode~~ · 종류: 자동 · 상태: **폐기(CR-016)**
- 폐기 사유: design §5.1 `isPreviewLayerMode` 삭제·§4 `layerMode` 삭제(CR-016) — 패드 박스를 항상 숨기므로 모드 판별이 없다. 옛 요구 R-07도 폐기.
- 대체: 패드 박스 항상 숨김은 TC-011. 스펙: `test/mouseWizard.test.ts`에서 import·사례 삭제(함수가 없으므로 남기면 import 오류)

### TC-009 · 라벨 단일 소스 · 종류: 자동 · 요구: R-01(한국어 UI), R-10, R-11, R-12, R-15, R-16, R-18, **R-20, R-26** · 설계: §8 · CR-005 · **개정(CR-016, CR-018, CR-026, CR-028)**
- **CR-028 개정(이 3줄이 아래 v7 Given/When/Then을 대체)**: 문구 원천이 `labels.ts`(삭제) → `src/settings/i18n/ko.ts`로 이관(design §3 문구 출처 문단, i18n.md §4.5·§5)
  - Given `ko` 사전 · When 옛 30키를 조회 · Then ⓐ 화면(문구 원천): 이관 26키(i18n.md §4.1의 `tabsAria`·`tabImages`·`tabMouse`·`errorPrefix` + §4.5 22키)의 이름·문구가 표와 정확히 같다 — 22키는 v7 문구 그대로, `tabImages` = `이미지 설정`·`tabMouse` = `어깨축·손 위치`(새 문구) ⓑ 상태: 삭제 키 `title`·`tabBehavior`·`placeholderImages`·`placeholderBehavior`와 CR-005 삭제 키 `wizardPickHand`·`wizardBack`·`markerHand`·`handUnset`이 없다, `wizardPickShoulder`에 "2/2" 없음, `previewNoBody`에 「이미지 탭」·옛 문구 없음 ⓒ bridge: 해당 없음(상수 모듈)
  - 선행: CR-028 i18n 전사 · 스펙: `test/labels.test.ts`(import 대상 `../i18n/ko`로 교체)
- (v7 기록) Given `src/settings/labels.ts`
- When `labels`를 읽는다
- Then ⓐ 화면: 문구 원천이 §8 표 **30개** 키·문구와 정확히 같다(CR-026: 아래 29키 + `markerPen` = `손 위치`) — CR-016까지 18키(`previewNoBody` = `캐릭터 이미지(kb_up)가 등록되지 않았습니다.`, `markerPart` = `파츠 위치`, `wizardPickShoulder`에 "2/2 " 없음, `wizardReview` = `축 위치를 확인하고 저장하세요.`) + CR-018 11키(`areaStart` = `이동 영역 설정하기`, `areaPick1`~`areaPick4` = 공통 픽스처 「이동 영역 안내 문구」의 pickArea 네 문구(`1/4 `~`4/4 `로 시작), `areaReview` = `이동 영역을 확인하고 저장하세요.`, `markerArea` = `이동 영역`, `areaCorner1`~`areaCorner4` = `왼쪽 위` · `오른쪽 위` · `오른쪽 아래` · `왼쪽 아래`), `previewNoBody`에 「이미지 탭」 없음·옛 문구 `몸통 이미지가 등록되지 않았습니다.` 아님 ⓑ 상태: `wizardPickHand`·`wizardBack`·`markerHand`·`handUnset` 키 없음, 저장·취소용 새 키 없음(`wizardSave`·`wizardCancel` 재사용) ⓒ bridge: 해당 없음(상수 모듈, 호출 없음)
- 선행: CR-018 labels 전사 · 스펙: `test/labels.test.ts`

### TC-010 · 미리보기 합성 순서·크기·body 우선·배경 미포함 · 종류: 자동 · 요구: R-12 · 설계: §5.2 렌더 3·`findUrl`, §4 `baseUrl`, §10 합성 순서, §11 D-2 · **개정(CR-016)**
- Given `SETTINGS`, manifest `ALL`(background·body·kb_up·mouse_base 200×150)
- When `MousePartsTab` 렌더(idle)
- Then ⓐ 화면: `mouse-preview` 크기 450px×350px, 안의 `<img>` src 순서 정확히 `['asset://mouse_base.png', 'asset://body.png']`(손 그림 → 바탕. `kb_up`은 body가 있어 겹치지 않음, 배경 없음), 축 마커 `축(어깨) (600, 480)`이 미리보기 안에서 바탕 `<img>` 뒤(DOM 순서상 다음) ⓑ 상태: `scale` 0.5, `baseUrl` = body url(파생) ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-016 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-011 · 패드 박스 항상 숨김·손 위치 마커 없음 · 종류: 자동 · 요구: R-12, R-10 · 설계: §5.2 렌더 3(패드 박스 없음), §10 모드, §3 스타일(`.pad` 삭제) · CR-005 · **개정(CR-016 — 옛 「레이어 이동 모드에서만 숨김」을 전체로)**
- Given `SETTINGS`(hand non-null), manifest 5종 각각 `HAND` / `FULL` / `NO_HAND` / `KB_HAND` / `EMPTY`
- When 각 manifest로 렌더(idle) → 「어깨축 설정하기」 → 미리보기 클릭(150,100)(review) → 언마운트
- Then ⓐ 화면: 10개 시점(5 manifest × idle·review) 모두 미리보기 안 `span[aria-hidden="true"]` 없음, 미리보기 안 `span`은 전부 `role="img"`(축 마커뿐), `role=img`는 1개, 이름에 「손 위치」가 든 요소 없음 ⓑ 상태: 모드 판별 없음(`layerMode` 삭제) — manifest와 무관하게 같은 결과 ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-016 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-012 · ~~레이어 이동 모드가 아니면 패드 박스 표시~~ · 종류: 자동 · 상태: **폐기(CR-016)**
- 폐기 사유: R-12 「패드 박스는 항상 숨김(손바닥 모드 폐기)」과 기대가 정반대다. 옛 요구 R-07·CR-006의 모드 경계는 없어졌다.
- 대체: TC-011(모든 manifest에서 숨김). 스펙: `test/MousePartsTab.test.tsx`에서 사례 삭제

### TC-013 · idle 축 마커·값 목록 세 행, 「손 위치」 행 없음 · 종류: 자동 · 요구: R-12, R-11, R-10, R-16 · 설계: §5.2 `mark`·렌더 5 ①②③, §4 `shownShoulder`·`shownPartPos`·`valuesArea`, §8 `markerPart`·`markerArea`·`areaCorner1~4`, §10 좌표 · CR-005 · **개정(CR-016, CR-018)**
- Given `SETTINGS`, `HAND`
- When 렌더(idle)
- Then ⓐ 화면: 마커 `축(어깨) (600, 480)` style `left 300px · top 240px`, `dl`의 `dt` 텍스트 순서 정확히 `['축(어깨)', '파츠 위치', '이동 영역']`, `dd` 텍스트 순서 정확히 `['(600, 480)', '(100, 200)', DD_SAVED]`(꼭짓점 이름 + 좌표 4개를 ` · `로 이은 문자열), 정규식 `/손 위치/`와 일치하는 텍스트 없음 ⓑ 상태: `shownShoulder` = `mouse.shoulder`, `shownPartPos` = `mouse.partPos`(drag null), `valuesArea` = `mouse.area`(idle) ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-018 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-014 · settings.mouse null → 기본 축·기본 파츠 위치 표시 · 종류: 자동 · 요구: R-12, R-11 · 설계: §4 `mouse`(파생)·`shownPartPos` · **개정(CR-016)**
- Given `{ ...SETTINGS, mouse: null }`, `HAND`
- When 렌더
- Then ⓐ 화면: 마커 `축(어깨) (620, 530)` style `left 310px · top 265px`, 축 `dd` = `(620, 530)`, 손 그림 style `left 194.5px · top 246px`, 「파츠 위치」 `dd` = `(389, 492)` ⓑ 상태: `mouse` = `DEFAULT_MOUSE_SETTINGS` ⓒ bridge: `setSettings` 호출 없음(표시만으로 저장하지 않음)
- 선행: CR-016 화면 · bridge CR-016(`DEFAULT_MOUSE_SETTINGS.partPos` (389,492)) · 스펙: `test/MousePartsTab.test.tsx`

### TC-015 · 빈 상태 `previewNoBody`(body·kb_up 둘 다 없음) · 종류: 자동 · 요구: R-12 · 설계: §2 빈 상태, §5.2 렌더 3, §4 `canvas`·`baseUrl`, §8 `previewNoBody` · **개정(CR-016)**
- Given `SETTINGS`, 사례 ① manifest `EMPTY` ② manifest `HAND_NOBASE`(손 그림만)
- When 각각 렌더
- Then ⓐ 화면: ① 미리보기 안에 `캐릭터 이미지(kb_up)가 등록되지 않았습니다.`, 옛 문구 `몸통 이미지가 등록되지 않았습니다.`·「이미지 탭에서」 없음, `<img>` 0개, 크기 450px×350px, 축 마커 `(600, 480)` 그대로 ② 같은 문구가 보이고 `<img>` src는 `['asset://mouse_base.png']`뿐, 손 그림 style `left 50px · top 100px`, 「파츠 위치」 `dd` `(100, 200)` ⓑ 상태: `baseUrl` undefined, `canvas` = 900×700(`canvas: null`의 기본), `scale` 0.5 ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-016 화면(문구·손 그림) · 스펙: `test/MousePartsTab.test.tsx`

### TC-016 · idle 안내·버튼 · 종류: 자동 · 요구: R-10 · 설계: §6 P-2, §5.2 `guideText`, §8
- Given `SETTINGS`, `HAND`
- When 렌더
- Then ⓐ 화면: `role=status` 텍스트 = idle 안내, 버튼 순서 `['어깨축 설정하기', '이동 영역 설정하기', '기본값으로 리셋']`(CR-018) ⓑ 상태: `wizard.step` idle ⓒ bridge: `setSettings` 호출 없음
- 선행: 없음 · 스펙: `test/MousePartsTab.test.tsx`

### TC-017 · 「어깨축 설정하기」 → pickShoulder · 종류: 자동 · 요구: R-10 · 설계: §6 P-2, §5.2 렌더 3(`previewPicking`)·`guideText`, §4 `shownShoulder` · CR-005
- Given idle
- When 「어깨축 설정하기」 클릭
- Then ⓐ 화면: 안내 = `축이 될 부분을 마우스로 클릭해주세요.`, 버튼 `['취소']`만(「뒤로」 없음), 미리보기 className이 idle 때와 달라짐(선택 중 클래스), 축 마커 0개(임시 점 없음. 손 그림·바탕 `<img alt="">`는 role=img가 아님), 축 `dd`는 저장값 `(600, 480)` 유지 ⓑ 상태: `wizard` = `{ pickShoulder, null }` ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-005 · 스펙: `test/MousePartsTab.test.tsx`

### TC-018 · 미리보기 클릭 → review · 종류: 자동 · 요구: R-10 · 설계: §5.2 `onPreviewClick`·`toCanvasPoint`·`mark`·렌더 3(`previewPicking`), §5.1 `previewToCanvas`, §10 좌표 · CR-005
- Given pickShoulder, 미리보기 rect `left 10 · top 20`(spy)
- When 미리보기 클릭 `clientX 160 · clientY 120`
- Then ⓐ 화면: 안내 = `축 위치를 확인하고 저장하세요.`, 미리보기 className이 idle 때와 다르고 pickShoulder 때와 같음(review도 선택 중 클래스 — `step !== 'idle'`), 마커 `축(어깨) (300, 200)` style `left 150px · top 100px`, `role=img` 1개, 버튼 `['저장', '취소']`(「뒤로」 없음), 축 `dd`는 `(600, 480)` ⓑ 상태: `wizard` = `{ review, (300,200) }` ⓒ bridge: `setSettings` 호출 없음(저장 전)
- 선행: CR-005 · 스펙: `test/MousePartsTab.test.tsx`

### TC-019 · idle·review에서 미리보기 클릭 무시 · 종류: 자동 · 요구: R-10 · 설계: §5.2 `onPreviewClick`
- Given idle → (클릭 후) 시작·클릭으로 review (300,200)
- When idle에서 클릭(150,100) / review에서 클릭(50,50)
- Then ⓐ 화면: idle 클릭 뒤 안내·버튼·마커 `(600, 480)`·className 불변. review 클릭 뒤 마커 `(300, 200)` 유지, `(100, 100)` 마커 없음 ⓑ 상태: `wizard` 불변 ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-005 · 스펙: `test/MousePartsTab.test.tsx`

### TC-020 · 저장 성공 · 종류: 자동 · 요구: R-10 · 설계: §5.2 `onSave`·`persist`, §6 P-2
- Given review (300,200), `setSettings` → `SAVED` resolve
- When 「저장」 → (settings://changed 흉내) props `settings = SAVED`로 재렌더
- Then ⓐ 화면: 저장 뒤 안내 idle, 버튼 `['어깨축 설정하기', '이동 영역 설정하기', '기본값으로 리셋']`(CR-018), 재렌더 전 마커는 props 값 `(600, 480)`(§4 `shownShoulder`), 재렌더 후 마커·축 `dd` `(300, 200)`. **순서 전제**: 이 TC는 `setSettings` 응답이 `settings://changed`보다 **먼저** 도착한 경우를 흉내 낸다. 계약 §5.3은 emit 후 반환이라 실제로는 이벤트가 먼저 올 수 있고, 그때는 review 중에 props가 바뀌어(표시는 `wizard.shoulder` (300,200) 그대로) 「재렌더 전 (600, 480)」 단계가 생기지 않는다 — 최종 표시 `(300, 200)`은 두 순서 모두 같다 ⓑ 상태: `wizard` idle, `onError` 정확히 1회 `null` ⓒ bridge: `setSettings` 1회, 인자 `{ ...SETTINGS, mouse: { ...MOUSE, shoulder:(300,200) } }`(hand (400,560)·pad·partPos 보존)
- 선행: CR-005 · 스펙: `test/MousePartsTab.test.tsx`

### TC-021 · 저장 실패 → review 유지·재저장 · 종류: 자동 · 요구: R-10 · 설계: §5.2 `persist` 예외, §6 P-2 오류, §7 `toBridgeError`
- Given review (300,200), `setSettings` 1회차 reject `{ code:'IO_ERROR', message:'설정 파일을 저장하지 못했습니다.' }`, 2회차 resolve / 별도 사례: reject `new Error('boom')`
- When 「저장」 → (활성화 대기) → 「저장」
- Then ⓐ 화면: 실패 뒤 안내 review, 마커 `(300, 200)` 유지, 「저장」 다시 활성 → 재저장 성공 뒤 안내 idle. `Error` 사례도 안내 review 유지 ⓑ 상태: `onError(IO_ERR 객체 그대로)` → 성공 뒤 마지막 호출 `onError(null)`. `Error` 사례는 `onError({ code:'unknown', message:'boom' })` ⓒ bridge: `setSettings` 2회, 2회차 인자 = `SAVED`
- 비고: `code:'unknown'`의 출처는 `src/bridge/commands.ts` `toBridgeError`의 Error 정규화 규칙(`{ code:'unknown', message: e.message }`)이다. contract §3.5는 이 코드 값을 정하지 않는다 — `toBridgeError`가 바뀌면 이 기대도 같이 바꾼다
- 선행: CR-005 · 스펙: `test/MousePartsTab.test.tsx`

### TC-022 · 취소(pickShoulder·review) · 종류: 자동 · 요구: R-10 · 설계: §6 P-2 「취소」, §5.1 `cancel`
- Given pickShoulder / review (300,200)
- When 「취소」
- Then ⓐ 화면: 안내 idle, 버튼 idle 3개 `['어깨축 설정하기', '이동 영역 설정하기', '기본값으로 리셋']`(CR-018), 미리보기 className이 idle 때와 같음, review 취소 뒤 마커 `(600, 480)`이고 `(300, 200)` 마커 없음 ⓑ 상태: `wizard` = `initialWizard` ⓒ bridge: `setSettings` 호출 없음, `onError` 호출 없음
- 선행: CR-005 · 스펙: `test/MousePartsTab.test.tsx`

### TC-023 · saving 중 review 버튼 비활성 · 종류: 자동 · 요구: R-10 · 설계: §4 `saving`, §9 · CR-005(「취소」 비활성 포함)
- Given review (300,200), `setSettings`가 끝나지 않는 promise
- When 「저장」 → 「저장」·「취소」 다시 클릭 → promise resolve(`SAVED`)
- Then ⓐ 화면: 저장 중 「저장」·「취소」 `disabled`, 안내 review 유지. resolve 뒤 「어깨축 설정하기」·「기본값으로 리셋」 활성 ⓑ 상태: 저장 중 `saving` true → 끝나면 false·`wizard` idle ⓒ bridge: `setSettings` 정확히 1회(비활성 클릭은 무시)
- 선행: CR-005 · 스펙: `test/MousePartsTab.test.tsx`

### TC-024 · saving 중 idle 버튼 비활성(리셋) · 종류: 자동 · 요구: R-17(R-13 이관), R-10, R-15 · 설계: §4 `saving`, §6 P-3, §9 · CR-005(「어깨축 설정하기」 비활성) · CR-018(「이동 영역 설정하기」 비활성) · 요구 이관(R-09→R-13→R-17) · **개정(CR-018)**
- Given idle, `setSettings`가 끝나지 않는 promise
- When 「기본값으로 리셋」 → 「어깨축 설정하기」·「이동 영역 설정하기」·「기본값으로 리셋」 클릭 → resolve
- Then ⓐ 화면: 저장 중 세 버튼 `disabled`, 안내 idle 유지(어느 마법사도 시작 안 됨). resolve 뒤 세 버튼 활성 ⓑ 상태: `saving` true → false, `wizard` idle 유지 ⓒ bridge: `setSettings` 정확히 1회
- 선행: CR-005 · CR-018 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-025 · 리셋 기대값·확인 창 없음 · 종류: 자동 · 요구: R-17(R-13 이관) · 설계: §5.2 `onReset`, §6 confirm 표·P-3 · CR-003(리셋 부분) · **개정(CR-016, CR-018)**
- Given `SETTINGS`, `setSettings` resolve, `window.confirm` spy
- When 「기본값으로 리셋」
- Then ⓐ 화면: `dialog`·`alertdialog` 없음, 안내 idle ⓑ 상태: `onError(null)` ⓒ bridge: 클릭 직후 `setSettings` 1회, 인자가 정확히(`toStrictEqual`) `{ ...SETTINGS, mouse: { shoulder:(620,530), area:DEFAULT_AREA, hand:null, partPos:(389,492), penPos:null } }` — `mouse` 키는 정렬 시 `['area','hand','partPos','penPos','shoulder']` 5개뿐(CR-026 개정), `pad` 속성 없음(`armWidth`·`armColor`도 없음). `window.confirm` 호출 없음
- 선행: **bridge CR-018**(`DEFAULT_MOUSE_SETTINGS`에 `area` = `DEFAULT_AREA` 추가·`pad` 삭제 — 현행 types.ts면 FAIL) · 스펙: `test/MousePartsTab.test.tsx`

### TC-026 · 리셋 실패 · 종류: 자동 · 요구: R-17(R-13 이관), R-16 · 설계: §6 P-3 오류, §5.2 `persist` · **개정(CR-016, CR-018)**
- Given `SETTINGS`, `setSettings` reject `IO_ERR`
- When 「기본값으로 리셋」
- Then ⓐ 화면: 마커·축 `dd` `(600, 480)` 유지, 손 그림 style `left 50px · top 100px`·「파츠 위치」 `dd` `(100, 200)` 유지, 영역 선 `<polygon points>` = `SVG_SAVED`·「이동 영역」 `dd` = `DD_SAVED` 유지, 「기본값으로 리셋」·「어깨축 설정하기」 다시 활성 ⓑ 상태: `onError` 정확히 1회 `IO_ERR`, 기존 설정(props) 그대로 ⓒ bridge: 클릭 직후 `setSettings` 정확히 1회, 인자 `{ ...SETTINGS, mouse: 부분일치{ shoulder:(620,530), hand:null, partPos:(389,492) } }`(`area` 값·`pad` 부재의 전체 검사는 TC-025 몫 — 이 TC는 bridge CR-018 반영과 독립)
- 선행: CR-018 화면(영역 선·값 목록 표시 부분) · 스펙: `test/MousePartsTab.test.tsx`

### TC-027 · settings.mouse null 저장 규칙(리셋·마법사) · 종류: 자동 · 요구: R-17(R-13 이관), R-10 · 설계: §5.2 (규칙) `settings.mouse === null`일 때 저장 · **개정(CR-016, CR-018 — 기대값 모양)**
- Given `{ ...SETTINGS, mouse: null }`, `setSettings`는 인자를 그대로 resolve
- When 「기본값으로 리셋」 → (동기화: `onError` 1회 **그리고** 「기본값으로 리셋」 활성) → 시작·클릭(150,100) → 「저장」
- Then ⓐ 화면: 리셋 뒤 「기본값으로 리셋」 활성, 마법사 review 진입 ⓑ 상태: 저장 후 `mouse`는 null이 아닌 객체로 보낸다(null 유지 분기 없음) ⓒ bridge: 1회차 인자 정확히 `{ ...nullMouse, mouse: DEFAULT_MOUSE_EXPECTED }`(area `DEFAULT_AREA`·partPos 389,492 포함, `pad`·팔 필드 없음), 2회차 인자 정확히 `{ ...nullMouse, mouse: { ...DEFAULT_MOUSE_EXPECTED, shoulder:(300,200) } }`. 끌어다 놓기 저장의 같은 규칙은 TC-058, 이동 영역 저장은 TC-074
- 선행: bridge CR-018 · CR-005 · 스펙: `test/MousePartsTab.test.tsx`

### TC-028 · 저장 인자는 mouse 외 필드를 그대로 싣는다(CR-004 영향) · 종류: 자동 · 요구: R-17(R-13 이관), R-10 · 설계: §5.2 `persist`(`{ ...settings, mouse: next }`) · CR-004 · 요구 이관(R-09→R-13→R-17)
- Given `SETTINGS`(`autostart:false`), `setSettings` 성공
- When 「기본값으로 리셋」 → (동기화: `onError` 1회 **그리고** 「기본값으로 리셋」 활성) → 마법사 시작·클릭·「저장」
- Then ⓐ 화면: 두 저장 모두 오류 없이 끝남(`onError`에 오류 객체 없음) ⓑ 상태: `onError` 2회, 모두 `null` ⓒ bridge: 두 `setSettings` 인자에서 `mouse`를 뺀 나머지가 `SETTINGS`와 정확히 같다(`scale 1.5`·`idleSeconds 120`·`overlay`·`autostart:false` — `slam` 없음, CR-020). `setAutostart` 호출 없음
- 비고: 해제 상태 저장이 core에서 실패하지 않는 것(os error 2 멱등)은 core 조치라 M-08에서 실물 확인
- 선행: CR-005(마법사 부분) · 스펙: `test/MousePartsTab.test.tsx`

### TC-029 · 단계 전환 후 포커스 · 종류: 자동 · 요구: R-10 · 설계: §9 단계 전환 후 포커스
- Given 첫 마운트(idle), `setSettings` → `SAVED` resolve
- When 「어깨축 설정하기」 → 「취소」(pickShoulder에서) → 「어깨축 설정하기」 → 미리보기 클릭 → 「취소」(review에서) → 시작·클릭 → 「저장」
- Then ⓐ 화면: 마운트 직후 포커스는 `body`(옮기지 않음) → pickShoulder 진입 「취소」 → pickShoulder 취소로 idle 복귀 「어깨축 설정하기」 → pickShoulder 재진입 「취소」 → review 진입 「저장」 → review 취소로 idle 복귀 「어깨축 설정하기」 → 저장 성공으로 idle 복귀 「어깨축 설정하기」 ⓑ 상태: `wizard.step` idle→pickShoulder→idle→pickShoulder→review→idle→pickShoulder→review→idle ⓒ bridge: 두 취소 경로에서 `setSettings` 호출 없음, 마지막 저장에서 정확히 1회·인자 `SAVED`
- 비고(경합 전제): `persist` 성공 분기가 `dispatch({type:'saved'})`와 `setSaving(false)`를 **await 없이 연속 호출**해 같은 렌더에서 idle·활성이 된다(design §5.2 `persist`·§9). 이 전제가 깨지면 idle 복귀 `focus()`가 아직 비활성인 버튼에 걸려 jsdom에서 포커스가 옮겨지지 않는다
- 선행: §9 포커스 구현 · CR-005 · 스펙: `test/MousePartsTab.test.tsx`

### TC-030 · 접근성 속성(포인터 전용 미리보기·실시간 알림 없음 포함) · 종류: 자동 · 요구: R-12, R-10, R-11 · 설계: §9, §5.2 렌더 1~3, §11 D-1 · **개정(CR-016)**
- Given `SETTINGS`, `HAND`
- When 렌더(idle) → 손 그림 누름(100,150)·끌기(150,175) → pointercancel → 시작·클릭(review)
- Then ⓐ 화면: `region` 이름 `어깨축·손 위치`(**CR-028 개정** — `t.tabMouse`, Provider 없으면 ko. 이름 `마우스 파츠` region 없음), 안내 `role=status`·`aria-live="polite"`, 미리보기 `role="presentation"`·`tabindex` 속성 없음(키보드 대체 수단 없음 — 포인터 전용), 미리보기 `<img>` 2개(손 그림·바탕) 모두 `alt=""`·`draggable="false"`, 패드 박스 없음(`span[aria-hidden="true"]` 0개, 미리보기 `span`은 전부 `role="img"`), 끌기 중에도 컨테이너 안 `[aria-live]` 요소는 안내 줄 1개뿐(값 목록에 실시간 알림 없음). idle·review 두 시점 모든 버튼 `type="button"`, `tabindex` 속성 없음(DOM 순서 = 포커스 순서, 순서 자체는 TC-016·TC-017·TC-018) ⓑ 상태: 해당 없음(속성 검사) — `wizard` idle→review, `drag` null→값→null(cancel) ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-016 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-031 · 창 열기: 로드·세로 메뉴·기본 탭·섹션 제목·창 제목 · 종류: 자동 · 요구: R-01, R-27, R-20 · 설계: §1 탭 3개, §2 창 골격·영역 표 「세로 메뉴 · 섹션 제목 · 오류 줄」, §3 `SettingsApp`·세로 메뉴 항목·섹션 제목·탭 패널, §4 `tab`·`error`·`language`·`t`, §5.3 마운트 효과·이벤트 구독·렌더 골격 개정·언어 반영 효과, §6 P-1, §7 `setSettingsWindowTitle` · **개정(CR-028, CR-031)**
- Given `getSettings` → `SETTINGS`(`language:'ko'`), `getAssetManifest` → `HAND`, `setSettingsWindowTitle` resolve
- When `SettingsApp` 마운트
- Then ⓐ 화면: `navigation` 역할 없음, `tablist`(이름 `설정 탭`, `aria-orientation="vertical"`) 안 `tab` `['기본 설정','이미지 설정','어깨축·손 위치']`(모두 `type="button"`, `aria-pressed` 속성 없음), `aria-selected` `['true','false','false']`, `h1` 정확히 1개 = `기본 설정`, `region` `기본 설정` 표시, `alert` 없음 ⓑ 상태: `tab` 'general', `error` null, `document.documentElement.lang` = `ko` ⓒ bridge: `getSettings()`·`getAssetManifest()` 각 1회 인자 없음, `onSettingsChanged`·`onAssetsChanged` 각 1회 구독, `setSettingsWindowTitle` 정확히 1회 인자 `'kuro_keyviewer 설정'`. `setSettings`·`importAsset`·`removeAsset`·`setAutostart`·`pickPngFile`·`resetOverlayPosition`·`getHandAnchor`·`onHandAnchorChanged` 호출 없음
- (v8 기록 — CR-031로 폐기된 기대: `h1` 없음, `navigation` 이름 `설정 탭` 안 버튼, `aria-pressed` `['true','false','false']`) (v7 기록 — 폐기된 기대: `h1` `kuro_keyviewer 설정`, 탭 `['이미지','동작','마우스 파츠']`, 기본 탭 「이미지」)
- 비고: 창 라벨 분기(`main.tsx`) 자체는 이 TC가 검증하지 않는다(컴포넌트를 직접 마운트) — M-02 몫. hand-anchor 두 래퍼는 bridge에 생성돼 있다(Q-01 조건 충족 — 이제 「호출 없음」 단언은 공허 통과가 아니다)
- 선행: 없음 · 스펙: `test/SettingsApp.test.tsx`

### TC-032 · 탭 전환(세로 메뉴 클릭) · 종류: 자동 · 요구: R-01, R-27, R-26 · 설계: §5.3 탭 전환, §3 세로 메뉴 항목·섹션 제목·탭 패널, §4 `tab`, §9 로빙 tabindex · **개정(CR-028, CR-031)**
- Given TC-031 상태
- When 세로 메뉴 「어깨축·손 위치」 → 「이미지 설정」 → 「기본 설정」 클릭
- Then ⓐ 화면: 누른 항목만 `aria-selected="true"`(어깨축·손 위치 시점 `tabindex` `['-1','-1','0']`), `h1` = 누른 탭 이름(`어깨축·손 위치` → `이미지 설정` → `기본 설정`, 늘 1개), `region` 같은 순서로 바뀌고 이전 region은 사라짐(v8 기록 — 폐기된 기대: 누른 탭만 `aria-pressed="true"`) ⓑ 상태: `tab` mouse → images → general ⓒ bridge: `getSettings`·`getAssetManifest` 여전히 1회(재로드 없음), `setSettings` 호출 없음
- 비고: 이 TC는 region 전환만 본다. 탭 본문은 TC-104 ~ TC-130(기본 설정)·TC-136 ~ TC-151(이미지 설정)·기존 MousePartsTab TC(어깨축·손 위치)가 검증한다. 스펙의 `openMouseTab()` 도우미가 누르는 탭 이름도 `어깨축·손 위치`로 바뀌었다(TC-033 ~ TC-038·TC-076·TC-077·TC-FLOW-02 ~ 06 공통 — 단언 문장 변경 없음)
- 선행: 없음 · 스펙: `test/SettingsApp.test.tsx`

### TC-033 · get_settings 실패 · 종류: 자동 · 요구: R-01 · 설계: §6 P-1 오류, §5.3 마운트 예외, §4 `settings` 초기값, §8 `errorPrefix`
- Given `getSettings` reject `{ code:'IO_ERROR', message:'설정 파일을 읽지 못했습니다.' }`
- When 마운트 → 「마우스 파츠」 탭
- Then ⓐ 화면: `alert` 텍스트 정확히 `오류: 설정 파일을 읽지 못했습니다.`, 마우스 탭 마커 `축(어깨) (620, 530)` ⓑ 상태: `settings` = `DEFAULT_SETTINGS` 유지, `error` = 해당 BridgeError ⓒ bridge: `getSettings` 1회(재시도 없음), `setSettings` 호출 없음
- 선행: 없음 · 스펙: `test/SettingsApp.test.tsx`

### TC-034 · get_asset_manifest 실패 · 종류: 자동 · 요구: R-01, R-12 · 설계: §6 P-1 오류, §4 `manifest` 초기값·`canvas`, §8 `previewNoBody` · **개정(CR-016 — 빈 상태 문구)**
- Given `getAssetManifest` reject `{ code:'IO_ERROR', message:'이미지 목록을 읽지 못했습니다.' }`, `getSettings` 성공
- When 마운트 → 「마우스 파츠」 탭
- Then ⓐ 화면: `alert` = `오류: 이미지 목록을 읽지 못했습니다.`, 미리보기 안 `캐릭터 이미지(kb_up)가 등록되지 않았습니다.`, `<img>` 0개, 450px×350px, 마커 `(600, 480)` ⓑ 상태: `manifest` = `{ canvas:null, entries:[] }` ⓒ bridge: `getAssetManifest` 1회
- 선행: CR-016 labels 전사 · 스펙: `test/SettingsApp.test.tsx`

### TC-035 · 로드 값이 미리보기·값 목록에 반영 · 종류: 자동 · 요구: R-12, R-11 · 설계: §5.3 마운트 효과, §5.2 `findUrl`·렌더 3·5, §4 `part`·`shownPartPos` · **개정(CR-016)**
- Given `SETTINGS`, `HAND`
- When 마운트 → 「마우스 파츠」 탭
- Then ⓐ 화면: 마커·축 `dd` `(600, 480)`, 「파츠 위치」 `dd` `(100, 200)`, `<img>` src `['asset://mouse_base.png','asset://body.png']`, 손 그림 style `left 50px · top 100px · width 100px · height 75px`, 패드 박스 없음 ⓑ 상태: `settings`·`manifest`가 로드 값 ⓒ bridge: 로드 2종 각 1회(TC-031과 같음)
- 선행: CR-016 화면 · 스펙: `test/SettingsApp.test.tsx`

### TC-036 · settings://changed 수신 → 축·손 그림·값 목록 갱신 · 종류: 자동 · 요구: R-12, R-11 · 설계: §5.3 이벤트 구독, §6 P-4·P-5(저장값 표시), §3 `useBridgeEvent` · **개정(CR-016)**
- Given 마우스 탭(마커 (600,480), 손 그림 (100,200))
- When `settings://changed` 페이로드 `{ ...SETTINGS, mouse: { ...MOUSE, shoulder:(320,410), partPos:(250,300) } }`
- Then ⓐ 화면: 마커 `축(어깨) (320, 410)`, 축 `dd` `(320, 410)`, 손 그림 style `left 125px · top 150px`, 「파츠 위치」 `dd` `(250, 300)` ⓑ 상태: `settings` = 페이로드 ⓒ bridge: `setSettings` 호출 없음(되저장 없음)
- 선행: CR-016 화면 · 스펙: `test/SettingsApp.test.tsx`

### TC-037 · assets://changed 수신 → 바탕·손 그림 재계산 · 종류: 자동 · 요구: R-12 · 설계: §5.3 이벤트 구독, §6 P-4, §4 `baseUrl`·`part` · **개정(CR-016 — 옛 「모드 재계산」 대체)**
- Given 로드 manifest `EMPTY`, 마우스 탭(빈 상태 문구, `<img>` 0개)
- When `assets://changed` `KB_HAND` → 다시 `{ canvas 900×700, entries: [body, kb_up, mouse_base 100×80] }`
- Then ⓐ 화면: `KB_HAND` 뒤 빈 상태 문구 사라짐, `<img>` src `['asset://mouse_base.png','asset://kb_up.png']`, 손 그림 `width 100px · height 75px`. 두 번째 뒤 src `['asset://mouse_base.png','asset://body.png']`(body 우선), 손 그림 `left 50px · top 100px · width 50px · height 40px`. 세 시점 모두 패드 박스 없음 ⓑ 상태: `manifest` 교체, `baseUrl` undefined → kb_up → body, `part` 크기 200×150 → 100×80 ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-016 화면 · 스펙: `test/SettingsApp.test.tsx`

### TC-038 · set_settings 오류 표시는 코드 무관 · 종류: 자동 · 요구: R-10 · 설계: §7 `set_settings` 표시 규칙, §2 오류 줄, §8 `errorPrefix`
- Given 마우스 탭 review (300,200), `setSettings` 1회차 reject `{ code:'SETTINGS_INVALID', message:'배율은 25%~200% 사이여야 합니다.' }`, 2회차 reject `{ code:'settings.io', message:'설정 파일을 저장하지 못했습니다.' }`, 3회차 성공
- When 「저장」 ×3(매번 활성 대기)
- Then ⓐ 화면: 1회차 뒤 `alert` = `오류: 배율은 25%~200% 사이여야 합니다.`, 2회차 뒤 `오류: 설정 파일을 저장하지 못했습니다.`(코드 표기와 무관), 3회차 뒤 `alert` 없음·안내 idle ⓑ 상태: `error` 교체 → null ⓒ bridge: `setSettings` 3회
- 선행: CR-005 · 스펙: `test/SettingsApp.test.tsx`

### TC-039 · 언마운트 시 구독 해제 · 종류: 자동 · 요구: R-12 · 설계: §3 `useBridgeEvent`(구독·해제), §5.3 이벤트 구독 · 요구 이관(R-07→R-12)
- Given 마운트 완료(두 구독 등록)
- When 언마운트
- Then ⓐ 화면: 설정 화면 DOM 제거 ⓑ 상태: 관찰 대상 없음(언마운트됨) — 해제 여부는 ⓒ로만 판정 ⓒ bridge: `settings://changed`·`assets://changed` 해제 함수 각 정확히 1회 호출
- 선행: 없음 · 스펙: `test/SettingsApp.test.tsx`

> **TC-040 ~ TC-043 · 상태: 폐기(CR-028).** 폐기 사유: design §5.3 「이미지 탭(임시 자리표시)」·「동작 탭(임시 자리표시)」 행 삭제, §2 `[behavior]` 삭제, 라벨 `placeholderImages`·`placeholderBehavior`·`tabBehavior` 삭제(i18n.md §5), 옛 요구 R-06·R-14 폐기(→ R-23·R-25). 대체: 이미지 설정 탭 TC-136 ~ TC-152, 기본 설정 탭 TC-104 ~ TC-131, 「동작」 탭 부재는 TC-099. 스펙 `test/SettingsApp.test.tsx`에서 네 사례 삭제. 아래 네 절은 기록으로만 남긴다.

### TC-040 · 이미지 탭 임시 자리표시: 문구·등록 목록 · 종류: 자동 · 상태: **폐기(CR-028)** · 요구: R-01(탭 본문), R-14(보류 기간 임시 표시) · 설계: §2 `[images]`, §5.3 이미지 탭(임시 자리표시), §8 `placeholderImages` · **개정(요구 R-02→R-14, 픽스처 손 그림 크기)**
- Given `getAssetManifest` → canvas 900×700, entries `body`(body.png 900×700) · `mouse_base`(mouse_base.png **200×150**) · `KB_DOWN_0`(kb_down_0.png 900×700)
- When 마운트(기본 탭 「이미지」)
- Then ⓐ 화면: `region` `이미지` 안에 `이미지 등록·미리보기는 설계 확정 후 구현됩니다.`, 목록 항목 텍스트 순서 `['body — body.png (900×700)', 'mouse_base — mouse_base.png (200×150)', 'kb_down_0 — kb_down_0.png (900×700)']`(객체 슬롯은 `slotKey` 규칙 `kb_down_{index}`) ⓑ 상태: `manifest` = 로드 값 ⓒ bridge: `setSettings`·`importAsset`·`removeAsset`·`setAutostart`·`pickPngFile`·`getHandAnchor`·`onHandAnchorChanged` 호출 없음(읽기 전용)
- 선행: 없음 · 스펙: `test/SettingsApp.test.tsx`

### TC-041 · 이미지 탭: assets://changed 수신 → 목록 교체 · 종류: 자동 · 상태: **폐기(CR-028)** · 요구: R-01(탭 본문), R-14(보류 기간 임시 표시) · 설계: §5.3 이미지 탭·이벤트 구독, §6 P-4 · 요구 이관(R-02→R-14)
- Given 로드 manifest `HAND`(목록 2항목), 「이미지」 탭
- When `assets://changed` `{ canvas:612×354, entries:[body 612×354 body.png] }` → 다시 `EMPTY`
- Then ⓐ 화면: 첫 수신 뒤 목록 `['body — body.png (612×354)']`, 두 번째 수신 뒤 목록 항목 0개, 자리표시 문구는 그대로 ⓑ 상태: `manifest`가 페이로드로 교체 ⓒ bridge: `getAssetManifest` 여전히 1회(재조회 없음), `setSettings`·`importAsset`·`removeAsset`·`setAutostart`·`pickPngFile`·`getHandAnchor`·`onHandAnchorChanged` 호출 없음
- 선행: 없음 · 스펙: `test/SettingsApp.test.tsx`

### TC-042 · 동작 탭 임시 자리표시: 문구·설정 JSON · 종류: 자동 · 상태: **폐기(CR-028)** · 요구: R-01(탭 본문), R-03 · R-04 · R-06(보류 기간 임시 표시. R-05는 CR-020으로 폐기 — 매핑 제거) · 설계: §2 `[behavior]`, §5.3 동작 탭(임시 자리표시), §8 `placeholderBehavior`
- Given `getSettings` → `SETTINGS`(`slam` 없음, CR-020)
- When 마운트 → 「동작」 탭
- Then ⓐ 화면: `region` `동작` 안에 `배율·유휴 시간·자동 실행 옵션은 설계 확정 후 구현됩니다.`(CR-020 — 「연타 기준·」 삭제. 옛 문구 `배율·유휴 시간·연타 기준·자동 실행 옵션은 설계 확정 후 구현됩니다.`는 없어야 한다 — 정확 일치 `getByText`로 판정), `<pre>` 텍스트 = `JSON.stringify(SETTINGS, null, 2)` ⓑ 상태: `settings` = 로드 값 ⓒ bridge: `setSettings`·`importAsset`·`removeAsset`·`setAutostart`·`pickPngFile`·`getHandAnchor`·`onHandAnchorChanged` 호출 없음(읽기 전용)
- 비고(CR-020): 덤프는 받은 `Settings`를 거르지 않는다(design §5.3). bridge가 `Settings.slam`을 삭제하기 전 실제 앱에서는 `slam` 키가 보일 수 있으나, 이 TC는 픽스처 그대로의 덤프만 단언하므로 `slam` 표시 여부를 판정하지 않는다
- 선행: 없음 · 스펙: `test/SettingsApp.test.tsx`

### TC-043 · 동작 탭: settings://changed 수신 → JSON 갱신 · 종류: 자동 · 상태: **폐기(CR-028)** · 요구: R-01(탭 본문), R-03 · R-04 · R-06(보류 기간 임시 표시. R-05는 CR-020으로 폐기 — 매핑 제거) · 설계: §5.3 동작 탭·이벤트 구독, §6 P-4
- Given 「동작」 탭(`SETTINGS` JSON 표시)
- When `settings://changed` `{ ...SETTINGS, scale: 0.75, autostart: true }`
- Then ⓐ 화면: `<pre>` 텍스트 = `JSON.stringify(페이로드, null, 2)` ⓑ 상태: `settings` = 페이로드 ⓒ bridge: `getSettings` 여전히 1회, `setSettings` 호출 없음(되저장 없음), 나머지 미사용 command·hand-anchor 호출 없음
- 선행: 없음 · 스펙: `test/SettingsApp.test.tsx`

### TC-044 · 비-null 캔버스가 미리보기 크기·좌표에 반영 · 종류: 자동 · 요구: R-12, R-10 · 설계: §4 `canvas`·`scale`(파생), §5.1 `fitScale`·`previewToCanvas`, §5.2 `onPreviewClick`·`mark`·렌더 3, §10 좌표 · 요구 이관(R-07→R-12)
- Given `S200`(`mouse.shoulder (200,100)`), 사례 A = `canvasOf(450,350)`, 사례 B = `canvasOf(900,350)`(B는 `setSettings`가 인자를 그대로 resolve)
- When 렌더 → 「어깨축 설정하기」 → 미리보기 클릭 A `(150,100)` / B `(150,200)` → (B만) 「저장」
- Then ⓐ 화면: A — 미리보기 450px×350px, 저장 축 마커 `축(어깨) (200, 100)` left 200px·top 100px, 클릭 뒤 마커 `축(어깨) (150, 100)` left 150px·top 100px. B — 미리보기 450px×175px, 저장 축 마커 left 100px·top 50px, 클릭 뒤 마커 `축(어깨) (300, 350)` left 150px·top 175px(y가 캔버스 높이 350으로 고정), 저장 뒤 안내 idle ⓑ 상태: A — `canvas` 450×350·`scale` 1·`wizard` review (150,100). B — `canvas` 900×350·`scale` 0.5·저장 전 review (300,350) → idle ⓒ bridge: A — `setSettings` 호출 없음. B — `setSettings` 정확히 1회, 인자 `{ ...S200, mouse: { ...M200, shoulder:(300,350) } }`
- 비고: `manifest.canvas`를 무시하고 기본 900×700을 쓰면 A는 미리보기 크기는 같아도 마커가 100px·50px, 클릭이 (300,200)이 되고, B는 미리보기 450×350·클릭 (300,400)이 되어 FAIL로 가려진다
- 선행: CR-005(클릭·저장 부분) · 스펙: `test/MousePartsTab.test.tsx`

### TC-045 · hitPart: 그림 사각형 판정 · 종류: 자동 · 요구: R-11 · 설계: §5.1 `hitPart`, §10 끌기 판정(좌표 기반) · CR-016 · **신규**
- Given `partPos (100,200)`, size 200×150 / 전체 크기 사례 `partPos (0,0)`, size 900×700 / AssetEntry 모양 size(`mouse_base` 200×150)
- When `hitPart(point, partPos, size)` — 점 (100,200) · (200,275) · (299,349) · (300,200) · (100,350) · (99,250) · (150,199), 전체 크기 (0,0) · (899,699), AssetEntry로 (200,300), 크기 `{0,150}`·`{200,-5}`에 점 (100,200)
- Then ⓐ 화면: 없음(끌기 시작 표시는 TC-049·TC-053) ⓑ 반환: (100,200)·(200,275)·(299,349) `true`(좌상단 포함), (300,200)·(100,350) `false`(우·하단 제외), (99,250)·(150,199) `false`, 전체 크기 두 점 `true`, AssetEntry 사례 `true`, 크기 0 이하 두 사례 `false` ⓒ bridge: 호출 없음
- 선행: CR-016 화면(`hitPart` export) · 스펙: `test/mouseWizard.test.ts`

### TC-046 · clampPartPos: 그림 전체가 캔버스 안 · 종류: 자동 · 요구: R-11 · 설계: §5.1 `clampPartPos`, §10 끌기 범위 · CR-016 · **신규**
- Given canvas 900×700, size 200×150(범위 x∈[0,700]·y∈[0,550])
- When `clampPartPos(p, size, canvas)` — (200,250) · (123.4,56.5) · (-30,-1) · (800,600) · (700,550) · (701.4,551), size 900×700에 (500,300), size 1000×800에 (50,50), size 900×150에 (40,600), 입력 `p = {-5, 900}`
- Then ⓐ 화면: 없음(끌기 중 표시는 TC-051·TC-052) ⓑ 반환: (200,250) · (123,57)(반올림) · (0,0) · (700,550) · (700,550) · (700,550), 전체 크기 (0,0), 캔버스보다 큰 그림 (0,0), 한 변만 같음 (0,550). 입력 `p`는 `{-5, 900}` 그대로(불변) ⓒ bridge: 호출 없음
- 선행: CR-016 화면(`clampPartPos` export) · 스펙: `test/mouseWizard.test.ts`

### TC-047 · 바탕 대체: body가 없으면 kb_up · 종류: 자동 · 요구: R-12 · 설계: §4 `baseUrl`, §5.2 `findUrl`(`'kb_up'`)·렌더 3, §10 합성 순서 · CR-016 · **신규**
- Given `SETTINGS`, 사례 ① `KB_HAND` ② `KB_ONLY`
- When 각각 렌더(idle)
- Then ⓐ 화면: ① `<img>` src 정확히 `['asset://mouse_base.png', 'asset://kb_up.png']`, 빈 상태 문구 없음, 축 마커 `(600, 480)`이 `kb_up` `<img>` 뒤 ② src `['asset://kb_up.png']`, 빈 상태 문구 없음 ⓑ 상태: `baseUrl` = kb_up url ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-016 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-048 · 손 그림 배치: partPos·자연 크기 × scale·회전 없음 · 종류: 자동 · 요구: R-12, R-11 · 설계: §5.2 렌더 3(손 그림 `<img>`), §4 `part`·`shownPartPos`, §10 합성 순서·좌표, §11 D-2 · CR-016 · **신규**
- Given 사례 ① `SETTINGS`+`HAND`(scale 0.5) ② `SETTINGS`+ canvas 450×350(body 450×350 + mouse_base 200×150, scale 1) ③ `withPart(0,0)`+`FULL` ④ `SETTINGS`+`NO_HAND`
- When 각각 렌더(idle)
- Then ⓐ 화면: ① 손 그림 style `left 50px · top 100px · width 100px · height 75px`, `style.transform`이 `''`·`none`·`rotate(0deg)` 중 하나(회전 없음), `alt=""`·`draggable="false"`, 미리보기 첫 `<img>`(바탕보다 아래) ② `left 100px · top 200px · width 200px · height 150px` ③ `left 0px · top 0px · width 450px · height 350px` ④ 손 그림 `<img>` 없음, src `['asset://body.png']`, 「파츠 위치」 `dd` `(100, 200)` ⓑ 상태: `part` = `mouse_base` 항목(④는 undefined), `shownPartPos` = `mouse.partPos` ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-016 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-049 · 끌어다 놓기 정상: 따라 움직임 → 놓으면 저장 1회 → 뒤이은 click 무시 · 종류: 자동 · 요구: R-11 · 설계: §5.2 `onPreviewPointerDown/Move/Up`·`toCanvasPoint`·`persist`·끌기와 마법사 규칙 ②③·렌더 5 ②, §4 `drag`·`shownPartPos`, §6 P-5 · CR-016 · **신규**
- Given `SETTINGS`, `HAND`, `setSettings`는 인자를 그대로 resolve, 포인터 캡처 stub
- When 누름 (100,150) → 이동 (150,175) → 이동 (200,200) → 놓기 (200,200) → click (200,200) → (settings://changed 흉내) props `settings = withPart(300,300)`로 재렌더
- Then ⓐ 화면: 누름 직후 손 그림 `left 50px · top 100px`·「파츠 위치」 `(100, 200)`(누르기만 해서는 안 움직임). 첫 이동 뒤 `left 100px · top 125px`·`(200, 250)`, 크기 `100px × 75px` 유지. 둘째 이동 뒤 `left 150px · top 150px`·`(300, 300)`. 놓고 click한 뒤 안내 idle, 버튼 `['어깨축 설정하기', '이동 영역 설정하기', '기본값으로 리셋']`(CR-018), 축 마커 `(600, 480)` 1개(click이 축 지정으로 처리되지 않음). 재렌더 전 손 그림은 props 값 `left 50px · top 100px`·`(100, 200)`(§4 `shownPartPos` = `drag ? drag.pos : mouse.partPos`, drag는 놓을 때 null), 재렌더 후 `left 150px · top 150px`·`(300, 300)`. **순서 전제**: TC-020과 같다 — 실제로는 `settings://changed`가 응답보다 먼저 올 수 있고 그때는 옛 자리 단계가 짧거나 없다. 최종 표시는 두 순서 모두 같다 ⓑ 상태: `drag` null → `{ grab:(100,100), pos:(100,200) }` → pos (200,250) → (300,300) → null. `wizard` idle 유지, `onError` 정확히 1회 `null`, 저장 뒤 `saving` false(「기본값으로 리셋」 활성) ⓒ bridge: 끌기 중 `setSettings` 0회. 놓은 뒤 정확히 1회, 인자 `toStrictEqual` `{ ...SETTINGS, mouse: { ...MOUSE, partPos:(300,300) } }`. 뒤이은 click·재렌더 뒤에도 1회. `setPointerCapture` 1회 인자 7, `releasePointerCapture` 1회 인자 7
- 선행: CR-016 화면 · bridge CR-016(타입) · 스펙: `test/MousePartsTab.test.tsx`

### TC-050 · 누른 점은 미리보기 박스(rect) 기준 · 종류: 자동 · 요구: R-11 · 설계: §5.2 `toCanvasPoint`(`getBoundingClientRect` 기준)·`onPreviewPointerDown`, §5.1 `hitPart` · CR-016 · **신규**
- Given `SETTINGS`, `HAND`, 미리보기 rect `left 10 · top 20`(spy), `setSettings`는 인자를 그대로 resolve
- When ① 누름 (55,130) → 이동 (105,155) → 놓기 ② 누름 (155,190) → 이동 (205,215) → 놓기
- Then ⓐ 화면: ① 오프셋 (45,110) → 캔버스 (90,220)은 사각형 밖 → 손 그림 `left 50px · top 100px`·`(100, 200)` 그대로(rect를 빼지 않으면 (110,260)으로 안이 되어 FAIL로 드러남) ② 오프셋 (145,170) → 캔버스 (290,340) 안(빼지 않으면 (310,380)으로 밖), 이동 뒤 오프셋 (195,195) → 캔버스 (390,390) → 손 그림 `left 100px · top 125px`·`(200, 250)` ⓑ 상태: ① `drag` null 유지 ② `drag.grab` (190,140) → 놓은 뒤 null ⓒ bridge: ① `setPointerCapture`·`setSettings` 0회 ② `setPointerCapture` 인자 7, `setSettings` 정확히 1회 인자 `withPart(200,250)`
- 선행: CR-016 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-051 · 위치가 그대로면 저장 0회 · 종류: 자동 · 요구: R-11 · 설계: §5.2 `onPreviewPointerUp`(다를 때만 `persist`), §5.1 `clampPartPos`(전체 크기 (0,0)), §10 끌기 범위, §6 P-5 · CR-016 · **신규**
- Given 사례 ① `SETTINGS`+`HAND` ② `withPart(0,0)`+`FULL`
- When ① (a) 누름 (100,150) → 놓기 (100,150)(움직이지 않음) (b) 누름 (100,150) → 이동 (150,175) → 이동 (100,150)(원위치) → 놓기 ② 누름 (100,150) → 이동 (300,300) → 이동 (20,20) → 놓기
- Then ⓐ 화면: ① (a) 손 그림 `left 50px · top 100px`·`(100, 200)` (b) 중간 `(200, 250)` → 원위치 `(100, 200)`·`left 50px · top 100px` ② 손 그림 크기 `450px × 350px`, 두 이동 뒤 모두 `left 0px · top 0px`·`(0, 0)`(끌어도 안 움직임) ⓑ 상태: 놓은 뒤 `drag` null, `final` = `mouse.partPos` ⓒ bridge: 세 경우 모두 `setSettings` 0회. ① `setPointerCapture` 2회, (a)에서 `releasePointerCapture` 인자 7
- 선행: CR-016 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-052 · 범위 밖으로 끌면 제한값으로 표시·저장 · 종류: 자동 · 요구: R-11 · 설계: §5.2 `onPreviewPointerMove`(`clampPartPos`), §5.1 `previewToCanvas`(오프셋 고정)·`clampPartPos`, §10 끌기 범위 · CR-016 · **신규**
- Given `SETTINGS`, `HAND`, `setSettings`는 인자를 그대로 resolve
- When 누름 (100,150)(grab (100,100)) → 이동 (440,345) → 이동 (-50,-50) → 이동 (500,400) → 놓기 (500,400)
- Then ⓐ 화면: 첫 이동(캔버스 (880,690) → (780,590)) 뒤 `(700, 550)`, 손 그림 `left 350px · top 275px · width 100px · height 75px`(오른쪽 끝 450px·아래 끝 350px = 미리보기 끝). 둘째 이동(오프셋 음수 → 캔버스 (0,0) → (-100,-100)) 뒤 `(0, 0)`·`left 0px · top 0px`. 셋째 이동(캔버스 (1000,800)을 (900,700)으로 고정 → (800,600)) 뒤 `(700, 550)` ⓑ 상태: `drag.pos` 항상 x∈[0,700]·y∈[0,550] ⓒ bridge: 놓은 뒤 `setSettings` 정확히 1회, 인자 `withPart(700,550)`
- 선행: CR-016 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-053 · 끌기가 시작되지 않는 누름(사각형 밖·왼쪽 아닌 버튼·손 그림 없음) · 종류: 자동 · 요구: R-11 · 설계: §5.2 `onPreviewPointerDown` 조건(`part !== undefined`·`e.button === 0`·`hitPart`), §6 P-5 오류 · CR-016 · **신규**
- Given 사례 ① `SETTINGS`+`HAND` ② `SETTINGS`+`NO_HAND`
- When ① (a) 누름 (20,20)(캔버스 (40,40), 밖) → 이동 (150,175) → 놓기 (b) 누름 (100,150) `button: 2` → 이동 → 놓기 ② 누름 (100,150) → 이동 (150,175) → 놓기
- Then ⓐ 화면: ① 두 경우 모두 손 그림 `left 50px · top 100px`·`(100, 200)` 그대로 ② 손 그림 `<img>` 없음, 「파츠 위치」 `dd` `(100, 200)`(저장값) ⓑ 상태: `drag` null 유지 ⓒ bridge: `setPointerCapture` 0회, `setSettings` 0회
- 선행: CR-016 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-054 · 마법사 pickShoulder·review 중 끌기 불가, 사각형 안 클릭은 축 지정 · 종류: 자동 · 요구: R-11, R-10 · 설계: §5.2 끌기와 마법사 규칙 ①④·`onPreviewPointerDown`(`wizard.step === 'idle'`)·`onPreviewClick`, §6 P-2·P-5 · CR-016 · **신규**
- Given `SETTINGS`, `HAND`
- When 「어깨축 설정하기」 → 누름 (100,150)(손 그림 사각형 안) → 이동 (150,175) → 놓기 → click (150,175) → (review에서) 누름 (100,150) → 이동 (200,200) → 놓기
- Then ⓐ 화면: pickShoulder 중 이동 뒤 손 그림 `left 50px · top 100px`·`(100, 200)` 그대로. click 뒤 안내 review, 마커 `축(어깨) (300, 350)`(손 그림 위 클릭도 축 지정), 손 그림 그대로. review 중 끌기 뒤에도 손 그림·`(100, 200)`·마커 `(300, 350)`·안내 review 그대로 ⓑ 상태: `drag` null 유지, `wizard` pickShoulder → review (300,350) ⓒ bridge: `setPointerCapture` 0회, `setSettings` 0회
- 선행: CR-016 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-055 · 저장 중(saving) 끌기 불가 · 종류: 자동 · 요구: R-11 · 설계: §4 `saving`(끌기 시작 불가), §5.2 `onPreviewPointerDown`(`!saving`), §9 저장 중 · CR-016 · **신규**
- Given `SETTINGS`, `HAND`, `setSettings`가 끝나지 않는 promise — 사례 ① 리셋 저장 중 ② 끌어다 놓기 저장 중
- When ① 「기본값으로 리셋」 → 누름 (100,150) → 이동 (150,175) → 놓기 → resolve ② 누름 (100,150) → 이동 (150,175) → 놓기(1회차 저장 대기) → 누름 (100,150) → 이동 (200,200) → 놓기 → resolve
- Then ⓐ 화면: ① 손 그림 `left 50px · top 100px`·`(100, 200)` 그대로, resolve 뒤 「기본값으로 리셋」 활성 ② 1회차 놓은 뒤 「기본값으로 리셋」·「어깨축 설정하기」 `disabled`, 둘째 끌기 중 손 그림 `(100, 200)` 그대로(옛 자리 = props), resolve 뒤 「기본값으로 리셋」 활성 ⓑ 상태: 저장 중 `saving` true·`drag` null 유지 ⓒ bridge: ① `setSettings` 정확히 1회(리셋만), `setPointerCapture` 0회 ② `setSettings` 정확히 1회, 인자 `withPart(200,250)`, `setPointerCapture` 1회(1회차만)
- 선행: CR-016 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-056 · pointercancel → 옛 자리·저장 없음 · 종류: 자동 · 요구: R-11 · 설계: §5.2 `onPreviewPointerCancel`·`onPreviewPointerUp`(`drag === null`이면 무시), §6 P-5 오류 · CR-016 · **신규**
- Given `SETTINGS`, `HAND`
- When 누름 (100,150) → 이동 (150,175) → pointercancel → 놓기 (150,175)
- Then ⓐ 화면: 이동 뒤 `(200, 250)`, cancel 뒤 손 그림 `left 50px · top 100px`·`(100, 200)`, 뒤이은 놓기 뒤에도 그대로, 안내 idle ⓑ 상태: `drag` 값 → null(cancel) ⓒ bridge: `setSettings` 0회, `onError` 호출 없음
- 선행: CR-016 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-057 · 놓기 저장 실패 → 오류·옛 자리·다시 끌기 · 종류: 자동 · 요구: R-11 · 설계: §5.2 `onPreviewPointerUp` 예외·`persist` 예외, §6 P-5 오류, §9 오류 줄 · CR-016 · **신규**
- Given `SETTINGS`, `HAND`, `setSettings` 1회차 reject `IO_ERR`, 2회차 인자 그대로 resolve
- When 누름 (100,150) → 이동 (150,175) → 놓기 → (「기본값으로 리셋」 활성 대기) → 같은 끌기 반복
- Then ⓐ 화면: 실패 뒤 손 그림 `left 50px · top 100px`·「파츠 위치」 `(100, 200)`(옛 자리), 「기본값으로 리셋」 다시 활성 ⓑ 상태: `onError` 1회차 정확히 1회 `IO_ERR` → 재저장 뒤 마지막 호출 `null`, `drag` null ⓒ bridge: `setSettings` 2회, 2회차 인자 `withPart(200,250)`
- 선행: CR-016 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-058 · settings.mouse null에서 끌어다 놓기 저장 · 종류: 자동 · 요구: R-11 · 설계: §5.2 (규칙) `settings.mouse === null`일 때 저장(끌어다 놓기 포함), §4 `mouse`(파생) · CR-016 · **신규**
- Given `{ ...SETTINGS, mouse: null }`, `HAND`, `setSettings`는 인자를 그대로 resolve
- When 누름 (250,260)(캔버스 (500,520) — 기본 사각형 [389,589)×[492,642) 안, grab (111,28)) → 이동 (275,275)(캔버스 (550,550)) → 놓기
- Then ⓐ 화면: 처음 손 그림 `left 194.5px · top 246px`·`(389, 492)`, 이동 뒤 `(439, 522)` ⓑ 상태: `mouse` = `DEFAULT_MOUSE_SETTINGS`(파생) ⓒ bridge: `setSettings` 정확히 1회, 인자 `toStrictEqual` `{ ...nullMouse, mouse: { ...DEFAULT_MOUSE_EXPECTED, partPos:(439,522) } }`(객체 `mouse`, null 유지 없음)
- 선행: CR-016 화면 · bridge CR-016(`DEFAULT_MOUSE_SETTINGS.partPos`) · 스펙: `test/MousePartsTab.test.tsx`

### TC-059 · startArea → pickArea, start와 서로 덮어씀 · 종류: 자동 · 요구: R-15 · 설계: §5.1 `wizardReduce`(`startArea`·`start`), §4 `wizard`·`WizardStep` · CR-018 · **신규**
- Given `initialWizard` / `{ pickShoulder, null, [] }` / `{ review, (1,2), [] }` / `{ pickArea, null, [(1,1),(2,2)] }` / `{ reviewArea, null, NEW_AREA }`
- When 다섯 상태 각각에 `wizardReduce(state, { type:'startArea' })`, 그리고 뒤 두 상태(이동 영역 단계)에 `{ type:'start' }`
- Then ⓐ 화면: 없음(순수 모듈 — 표시는 TC-064) ⓑ 상태: `startArea` 결과 다섯 개 모두 정확히 `{ step:'pickArea', shoulder:null, area:[] }`, 이동 영역 단계의 `start` 결과 두 개 모두 정확히 `{ step:'pickShoulder', shoulder:null, area:[] }`(리듀서는 단계를 가리지 않는다 — 화면의 상호 배타는 버튼 노출로 보장, TC-071) ⓒ bridge: 호출 없음
- 선행: CR-018 화면 · 스펙: `test/mouseWizard.test.ts`

### TC-060 · pickArea에서 pick 누적 → 4번째에 reviewArea, 불변 · 종류: 자동 · 요구: R-15 · 설계: §5.1 `wizardReduce`(`pick` ②), §4 `wizard`(`area` pickArea 0~3개 / reviewArea 4개) · CR-018 · **신규**
- Given `s0 = wizardReduce(initialWizard, startArea)`, 점 P1 (100,400) · P2 (800,400) · P3 (800,650) · P4 (100,650)
- When `s1 = pick P1`(s0에), `s2 = pick P2`(s1에), `s3 = pick P3`, `s4 = pick P4`
- Then ⓐ 화면: 없음(표시는 TC-065) ⓑ 상태: s1 = `{ pickArea, null, [P1] }`, s2 = `{ pickArea, null, [P1,P2] }`, s3 = `{ pickArea, null, [P1,P2,P3] }`(단계 유지), s4 = 정확히 `{ reviewArea, null, [P1,P2,P3,P4] }`. 불변: s0.area는 여전히 `[]`, s1.area 길이 1·s2.area 길이 2 그대로, `s1.area !== s2.area`(새 배열), `initialWizard.area`는 `[]` ⓒ bridge: 호출 없음
- 선행: CR-018 화면 · 스펙: `test/mouseWizard.test.ts`

### TC-061 · reviewArea에서 pick 무시, 이동 영역 단계의 cancel·saved → initialWizard · 종류: 자동 · 요구: R-15 · 설계: §5.1 `wizardReduce`(`pick` ③·`cancel`·`saved`) · CR-018 · **신규**
- Given s2 = `{ pickArea, null, [P1,P2] }`, s4 = `{ reviewArea, null, [P1,P2,P3,P4] }`
- When s4에 `pick` (5,5); s2·s4 각각에 `cancel`, `saved`
- Then ⓐ 화면: 없음(표시는 TC-066·TC-069) ⓑ 상태: pick 결과는 정확히 `{ reviewArea, null, [P1,P2,P3,P4] }`(다섯 번째 점 없음), cancel·saved 네 결과 모두 정확히 `{ step:'idle', shoulder:null, area:[] }` ⓒ bridge: 호출 없음
- 선행: CR-018 화면 · 스펙: `test/mouseWizard.test.ts`

### TC-062 · applyWizard(reviewArea)는 area만 바꾼다 · 종류: 자동 · 요구: R-15 · 설계: §5.1 `applyWizard` ② ③ · CR-018 · **신규**
- Given base = `{ shoulder:(600,480), area:AREA, hand:(400,560), partPos:(100,200) }`, s4 = `{ reviewArea, null, [P1,P2,P3,P4] }`
- When `applyWizard(base, s4)` / 자기 교차 순서 `{ reviewArea, null, [P1,P3,P2,P4] }` / `{ pickArea, null, [P1,P2,P3] }` / `{ reviewArea, null, [P1,P2,P3] }` / `{ reviewArea, null, [] }`
- Then ⓐ 화면: 없음(저장 인자는 TC-067) ⓑ 상태: 첫 경우 정확히 `{ shoulder:(600,480), area:[P1,P2,P3,P4], hand:(400,560), partPos:(100,200) }`(순서 = 클릭 순서, 축·손·파츠 위치 보존), 결과 `area`는 `s4.area`와 다른 배열, `base.area`는 `AREA` 그대로(불변). 자기 교차 사례는 `area` = `[P1,P3,P2,P4]` 그대로(모양 검사 없음). 나머지 세 경우 `null` ⓒ bridge: 호출 없음
- 선행: CR-018 화면 · bridge CR-018(타입) · 스펙: `test/mouseWizard.test.ts`

### TC-063 · idle 저장된 영역 선: 닫힌 사각형·편집 표시 없음·바탕 위·축 마커 아래 · 종류: 자동 · 요구: R-16, R-15 · 설계: §4 `shownArea`(그 외), §5.2 렌더 3(`AreaOutline` 위치·props)·`AreaOutline` 렌더 2·3·4, §10 합성 순서·표시 결정 · CR-018 · **신규**
- Given ① `SETTINGS`+`HAND` ② `{ ...SETTINGS, mouse:null }`+`HAND` ③ `SETTINGS`+ canvas 900×350(body 900×350 + mouse_base 200×150)
- When 각각 렌더(idle). ①은 이어서 「어깨축 설정하기」 → 클릭 (150,100)(review)
- Then ⓐ 화면: ① 미리보기 안 `svg`(`width` 450·`height` 350), `<polygon points>` = `SVG_SAVED`, `<polyline>` 없음, `<circle>` 0개, DOM 순서 = 마지막 바탕 `<img>` 뒤·축 마커 `축(어깨) (600, 480)` 앞. pickShoulder·review 뒤에도 `SVG_SAVED`·점 0개 그대로 ② `<polygon points>` = `SVG_DEFAULT` ③ `svg` `width` 450·`height` 175, `points` = `SVG_SAVED` ⓑ 상태: `shownArea` = `{ points: mouse.area, closed: true, editing: false }`(① pickShoulder·review 포함), ② `mouse` = `DEFAULT_MOUSE_SETTINGS`(파생), ③ `scale` 0.5 ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-018 화면 · bridge CR-018(②의 기본 영역) · 스펙: `test/MousePartsTab.test.tsx`

### TC-064 · 「이동 영역 설정하기」 → pickArea · 종류: 자동 · 요구: R-15, R-16 · 설계: §5.2 `onStartArea`·`guideText`·렌더 3(`previewPicking`)·렌더 4(pickArea), §4 `shownArea`(0점)·`shownShoulder`(CR-018 식)·`valuesArea`, `AreaOutline` 렌더 1, §6 P-6, §8 `areaStart`·`areaPick1` · CR-018 · **신규**
- Given `SETTINGS`, `HAND`(idle)
- When 「어깨축 설정하기」 → 「취소」(선택 중 className 기록) → 「이동 영역 설정하기」
- Then ⓐ 화면: 안내 = `1/4 이동 영역의 왼쪽 위 꼭짓점을 클릭해주세요.`, 버튼 `['취소']`만, 미리보기 className이 idle과 다르고 pickShoulder 때와 같음, 미리보기 안 `svg` 없음(저장된 선이 사라짐 — 점 0개), 축 마커 `축(어깨) (600, 480)`(`role=img` 1개), 축 `dd` `(600, 480)`, 「이동 영역」 `dd` = `DD_SAVED` ⓑ 상태: `wizard` = `{ pickArea, null, [] }`, `shownShoulder` = `mouse.shoulder`, `valuesArea` = `mouse.area` ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-018 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-065 · 네 점 차례 클릭 → reviewArea(rect 기준·안내·편집 선·값 목록) · 종류: 자동 · 요구: R-15, R-16 · 설계: §5.2 `onPreviewClick`(pickArea)·`toCanvasPoint`·`guideText`·렌더 4(reviewArea)·렌더 5 ③, §5.1 `wizardReduce` pick ②·`previewToCanvas`, §4 `shownArea`·`valuesArea`, `AreaOutline` 렌더 3·4·5·6, §8 `areaPick2~4`·`areaReview`·`areaCorner1~4`, §6 P-6 · CR-018 · **신규**
- Given `SETTINGS`, `HAND`, idle 저장 선 클래스 기록 → 「이동 영역 설정하기」(pickArea, className 기록), 미리보기 rect `left 10 · top 20`(spy)
- When 클릭 clientX/Y (60,220) → (410,220) → (410,345) → (60,345)(오프셋 (50,200)·(400,200)·(400,325)·(50,325))
- Then ⓐ 화면: 1점 뒤 안내 = `2/4 이동 영역의 오른쪽 위 꼭짓점을 클릭해주세요.`, 점 `['50,200']`, `<polygon>` 없음. 2점 뒤 안내 = `3/4 이동 영역의 오른쪽 아래 꼭짓점을 클릭해주세요.`, `<polyline points>` `50,200 400,200`, 점 2개, 선 클래스 ≠ idle 저장 선 클래스. 3점 뒤 안내 = `4/4 이동 영역의 왼쪽 아래 꼭짓점을 클릭해주세요.`, `<polyline>` `50,200 400,200 400,325`, 점 3개, 버튼 `['취소']`, 「이동 영역」 `dd` = `DD_SAVED`(pickArea 중엔 저장값). 4점 뒤 안내 = `이동 영역을 확인하고 저장하세요.`, `<polygon points>` = `SVG_NEW`, `<polyline>` 없음, 점 `['50,200', '400,200', '400,325', '50,325']`, polygon 클래스 = 2점 때 편집 선 클래스, 미리보기 className = pickArea 때와 같음, 버튼 `['저장', '취소']`, 「이동 영역」 `dd` = `DD_NEW`, 축 마커·축 `dd` `(600, 480)` 그대로. rect를 빼지 않으면 첫 점이 캔버스 (120,440)이 되어 FAIL로 드러남 ⓑ 상태: `wizard.area` 길이 1→2→3→4(= `NEW_AREA`), step pickArea → reviewArea, `shownArea` closed false → true·editing true, `valuesArea` = `wizard.area`(reviewArea) ⓒ bridge: `setSettings` 호출 없음(저장 전)
- 선행: CR-018 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-066 · reviewArea에서 미리보기 클릭 무시 · 종류: 자동 · 요구: R-15 · 설계: §5.2 `onPreviewClick`(pickShoulder·pickArea 외 무시), §5.1 `pick` ③ · CR-018 · **신규**
- Given reviewArea(`NEW_AREA`, rect 0)
- When 미리보기 클릭 (200,100)
- Then ⓐ 화면: 안내 = `이동 영역을 확인하고 저장하세요.` 그대로, `points` = `SVG_NEW`, 점 4개, 「이동 영역」 `dd` = `DD_NEW`, 버튼 `['저장', '취소']` ⓑ 상태: `wizard` 불변(점 4개) ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-018 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-067 · 이동 영역 저장 성공 · 종류: 자동 · 요구: R-15, R-16 · 설계: §5.2 `onSave` 확장·`persist`, §5.1 `applyWizard` ②, §6 P-6, §7 `set_settings`(`area` 포함·`pad` 없음), §4 `shownArea`·`valuesArea` · CR-018 · **신규**
- Given `SETTINGS`, `HAND`, idle 저장 선 클래스 기록 → reviewArea(`NEW_AREA`), `setSettings`는 인자를 그대로 resolve
- When 「저장」 → (settings://changed 흉내) props `settings = AREA_SAVED`로 재렌더
- Then ⓐ 화면: 저장 뒤 안내 idle, 버튼 `['어깨축 설정하기', '이동 영역 설정하기', '기본값으로 리셋']`. 재렌더 전 영역 선 `points` = `SVG_SAVED`·점 0개·「이동 영역」 `dd` = `DD_SAVED`(props 값 — §4 `shownArea` 「그 외」). 재렌더 뒤 `points` = `SVG_NEW`, 선 클래스 = 처음 idle 저장 선 클래스, 점 0개, `dd` = `DD_NEW`, 축 마커 `(600, 480)` 그대로. **순서 전제**: TC-020과 같다(이벤트가 응답보다 먼저 오면 「재렌더 전」 단계가 없고 최종 표시는 같다) ⓑ 상태: `wizard` idle, `onError` 정확히 1회 `null` ⓒ bridge: `setSettings` 정확히 1회(재렌더 뒤에도), 인자 `toStrictEqual` `AREA_SAVED`(축·hand·partPos·penPos 보존), `mouse` 키 정렬 `['area','hand','partPos','penPos','shoulder']`(CR-026 개정)
- 선행: CR-018 화면 · bridge CR-018(타입) · 스펙: `test/MousePartsTab.test.tsx`

### TC-068 · 이동 영역 저장 실패 → reviewArea 유지·재저장 · 종류: 자동 · 요구: R-15 · 설계: §5.2 `onSave` 확장 예외·`persist` 예외, §6 P-6 오류, §7 `set_settings` · CR-018 · **신규**
- Given reviewArea(`NEW_AREA`), `setSettings` 1회차 reject `AREA_ERR`, 2회차 인자 그대로 resolve
- When 「저장」 → (「저장」 활성 대기) → 「저장」
- Then ⓐ 화면: 실패 뒤 안내 = `이동 영역을 확인하고 저장하세요.`, `points` = `SVG_NEW`·점 4개·「이동 영역」 `dd` = `DD_NEW` 유지, 「저장」 다시 활성 → 재저장 뒤 안내 idle ⓑ 상태: `onError` 1회차 정확히 1회 `AREA_ERR`(객체 그대로) → 재저장 뒤 마지막 호출 `null`, 실패 뒤 `wizard` reviewArea 유지 ⓒ bridge: `setSettings` 2회, 2회차 인자 `toStrictEqual` `AREA_SAVED`
- 선행: CR-018 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-069 · 취소(pickArea·reviewArea) → 임시 점 버림·저장된 선 복귀 · 종류: 자동 · 요구: R-15, R-16 · 설계: §5.2 렌더 4 「취소」(`cancel`), §5.1 `cancel`, §6 P-6 오류(취소·한 점 되돌리기 없음), §4 `shownArea` · CR-018 · **신규**
- Given `SETTINGS`, `HAND`(idle className 기록)
- When ① 「이동 영역 설정하기」 → 클릭 2점 → 「취소」 ② 네 점 → 「취소」 ③ 다시 「이동 영역 설정하기」
- Then ⓐ 화면: ①② 뒤 안내 idle, ① 뒤 버튼 idle 3개·미리보기 className = idle, 두 경우 모두 영역 선 `points` = `SVG_SAVED`·`<polyline>` 없음·점 0개, ② 뒤 「이동 영역」 `dd` = `DD_SAVED`. ③ 안내 1/4 문구, `svg` 없음(이전 점이 남지 않음) ⓑ 상태: `wizard` = `initialWizard` → ③ `{ pickArea, null, [] }` ⓒ bridge: `setSettings` 호출 없음, `onError` 호출 없음
- 선행: CR-018 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-070 · 이동 영역 저장 중(saving) 버튼 비활성 · 종류: 자동 · 요구: R-15 · 설계: §4 `saving`(CR-018 목록), §5.2 렌더 4(`disabled={saving}`), §9 저장 중 · CR-018 · **신규**
- Given reviewArea(`NEW_AREA`), `setSettings`가 끝나지 않는 promise
- When 「저장」 → 「저장」·「취소」 다시 클릭 → resolve(`AREA_SAVED`)
- Then ⓐ 화면: 저장 중 「저장」·「취소」 `disabled`, 안내 areaReview 유지. resolve 뒤 안내 idle, 「어깨축 설정하기」·「이동 영역 설정하기」·「기본값으로 리셋」 모두 활성 ⓑ 상태: `saving` true → false, `wizard` reviewArea → idle ⓒ bridge: `setSettings` 정확히 1회(비활성 클릭 무시)
- 선행: CR-018 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-071 · 상호 배타: 어깨축 마법사·이동 영역 설정·손 그림 끌기 · 종류: 자동 · 요구: R-15, R-10, R-11 · 설계: §4 상호 배타 ①②, §5.2 `onPreviewPointerDown`(`step === 'idle'`)·`onPreviewClick`(pickArea — 손 그림 사각형 안도 꼭짓점), §6 P-6 오류 · CR-018 · **신규**
- Given `SETTINGS`, `HAND`, 포인터 캡처 stub
- When 「이동 영역 설정하기」 → 손 그림 사각형 안 누름 (100,150)·이동 (150,175)·놓기 → click (150,175) → 클릭 3점((400,200)·(400,325)·(50,325)) → (reviewArea에서) 누름 (100,150)·이동 (200,200)·놓기 → 「취소」 → 「어깨축 설정하기」 → 클릭 (150,100)
- Then ⓐ 화면: pickArea·reviewArea 동안 「어깨축 설정하기」 버튼 없음. 끌기 뒤 손 그림 `left 50px · top 100px`·「파츠 위치」 `(100, 200)` 그대로. click 뒤 안내 2/4 문구, 점 `['150,175']`(캔버스 (300,350)이 첫 꼭짓점), 축 마커 `(600, 480)` 그대로(축 지정 아님). reviewArea 끌기 뒤에도 손 그림 그대로. pickShoulder·review 동안 「이동 영역 설정하기」 버튼 없음, review 뒤 안내 = `축 위치를 확인하고 저장하세요.`, 점 0개, 영역 선 `SVG_SAVED`(어깨축 pick은 영역에 점을 쌓지 않음) ⓑ 상태: `drag` null 유지, `wizard` pickArea → reviewArea → idle → pickShoulder → review (300,200) ⓒ bridge: `setPointerCapture` 0회, `setSettings` 0회
- 비고: 상호 배타 ③(끌기 중 포인터 캡처로 버튼 불가)은 jsdom이 캡처를 흉내 내지 않으므로 M-15
- 선행: CR-018 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-072 · 이동 영역 단계 포커스 · 종류: 자동 · 요구: R-15 · 설계: §9 이동 영역 단계 포커스·단계 전환 후 포커스, §5.2 렌더 4(`cancelPickRef`·`saveRef` 공유) · CR-018 · **신규**
- Given 첫 마운트(idle), `setSettings`는 인자 그대로 resolve
- When 「이동 영역 설정하기」 → 클릭 3점 → 4번째 클릭 → 「취소」(reviewArea) → 「이동 영역 설정하기」 → 「취소」(pickArea) → 네 점 → 「저장」
- Then ⓐ 화면: 마운트 직후 포커스 `body` → pickArea 진입 「취소」 → 3점 찍는 동안 「취소」 유지 → reviewArea 진입 「저장」 → reviewArea 취소로 idle 「어깨축 설정하기」 → pickArea 「취소」 → pickArea 취소로 idle 「어깨축 설정하기」 → reviewArea 「저장」 → 저장 성공 idle 「어깨축 설정하기」 ⓑ 상태: `wizard.step` idle→pickArea→reviewArea→idle→pickArea→idle→pickArea→reviewArea→idle ⓒ bridge: 두 취소 경로 `setSettings` 0회, 마지막 저장 정확히 1회·인자 `AREA_SAVED`
- 비고: 경합 전제는 TC-029와 같다(`saved` dispatch와 `setSaving(false)`가 같은 렌더)
- 선행: §9 포커스 구현 · CR-018 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-073 · 영역 선 접근성·이동 영역 단계 버튼 · 종류: 자동 · 요구: R-16, R-15 · 설계: §9(영역 선 `aria-hidden`, 꼭짓점 지정 포인터 전용), `AreaOutline` 렌더 2, §5.2 렌더 4(`type="button"`) · CR-018 · **신규**
- Given `SETTINGS`, `HAND`
- When idle → 「이동 영역 설정하기」 → 1점 → 3점 더(reviewArea) — 세 시점에서 검사
- Then ⓐ 화면: 세 시점 모두 `svg` `aria-hidden="true"`·`focusable="false"`·`aria-label` 없음, `role=img` 1개(축 마커뿐 — 영역 선은 역할 트리에 없음), 컨테이너 안 `[aria-live]` 1개(안내 줄), 보이는 버튼 모두 `type="button"`·`tabindex` 없음. 미리보기 `role="presentation"`·`tabindex` 없음(키보드 대체 없음) ⓑ 상태: 해당 없음(속성 검사) — `wizard` idle → pickArea(1점) → reviewArea ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-018 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-074 · settings.mouse null: 기본 영역 표시·영역 저장은 객체 mouse · 종류: 자동 · 요구: R-15, R-16, R-17 · 설계: §5.2 (규칙) `settings.mouse === null`(이동 영역 저장 포함), §4 `mouse`(파생)·`shownArea`·`valuesArea` · CR-018 · **신규**
- Given `{ ...SETTINGS, mouse:null }`(`nullMouse`), `HAND`, `setSettings`는 인자 그대로 resolve
- When 렌더 → 네 점 → 「저장」
- Then ⓐ 화면: 처음 영역 선 `points` = `SVG_DEFAULT`, 「이동 영역」 `dd` = `DD_DEFAULT`, 저장 뒤 「기본값으로 리셋」 활성 ⓑ 상태: `mouse` = `DEFAULT_MOUSE_SETTINGS`(파생) ⓒ bridge: `setSettings` 정확히 1회, 인자 `toStrictEqual` `{ ...nullMouse, mouse: { ...DEFAULT_MOUSE_EXPECTED, area: NEW_AREA } }`(객체 `mouse`, null 유지 없음)
- 선행: CR-018 화면 · bridge CR-018(`DEFAULT_MOUSE_SETTINGS.area`) · 스펙: `test/MousePartsTab.test.tsx`

### TC-075 · AreaOutline 렌더 규칙(단독) · 종류: 자동 · 요구: R-15, R-16 · 설계: §3 `AreaOutline`(props), §5.2 `AreaOutline` 렌더 1~7 · CR-018 · **신규**
- Given `AreaOutline` 단독 렌더, 점 `NEW_AREA`, `width = 900 × scale`·`height = 700 × scale`
- When ① `points []`(closed·editing 네 조합) ② 4점·closed·editing false·scale 0.5 ③ 4점·closed·editing true ④ 3점 closed false / 3점 closed true / 2점 / 1점(모두 editing true) ⑤ 4점·closed·scale 1 ⑥ default export 검사
- Then ⓐ 화면: ① 아무것도 그리지 않음(`container.firstChild` null) ② `svg` `width` 450·`height` 350·`aria-hidden="true"`·`focusable="false"`, `<polygon>` 1개 `points` `50,200 400,200 400,325 50,325`, `<polyline>`·`<circle>` 없음 ③ 같은 polygon + `<circle>` 4개(`cx,cy,r` = `50,200,3` · `400,200,3` · `400,325,3` · `50,325,3`), polygon 클래스 ≠ ②의 클래스, 점 클래스는 넷 모두 같고 두 선 클래스와 다름 ④ 3점: `<polyline points>` `50,200 400,200 400,325`·polygon 없음·점 3개·polyline 클래스 = ③ polygon 클래스, closed true여도 3점이면 polygon 없이 polyline, 2점: polyline `50,200 400,200`·점 2개, 1점: polygon 없음·점 `50,200,3` 1개(`<polyline>` 요소 유무는 단언하지 않음 — 「설계 확인 필요」 C-1) ⑤ `svg` 900×700, `points` `100,400 800,400 800,650 100,650` ⑥ `$$typeof` = `Symbol.for('react.memo')` ⓑ 상태: 없음(순수 렌더, props만) ⓒ bridge: 호출 없음(bridge import 없음)
- 선행: CR-018 화면(`components/AreaOutline.tsx` 신규) · 스펙: `test/AreaOutline.test.tsx`

### TC-076 · SettingsApp: 로드·수신한 이동 영역이 선·값 목록에 반영 · 종류: 자동 · 요구: R-16 · 설계: §5.3 마운트 효과·이벤트 구독, §6 P-4·P-6(수신 표시), §7 `settings://changed` · CR-018 · **신규**
- Given `getSettings` → `SETTINGS`, `getAssetManifest` → `HAND`
- When 마운트 → 「마우스 파츠」 탭 → `settings://changed` `AREA_SAVED`
- Then ⓐ 화면: 처음 `points` = `SVG_SAVED`·점 0개·「이동 영역」 `dd` = `DD_SAVED`, 수신 뒤 `SVG_NEW`·점 0개·`DD_NEW` ⓑ 상태: `settings` = 페이로드 ⓒ bridge: `setSettings` 호출 없음(되저장 없음)
- 선행: CR-018 화면 · 스펙: `test/SettingsApp.test.tsx`

### TC-077 · SettingsApp: 이동 영역 저장 실패 오류 줄(코드 무관) · 종류: 자동 · 요구: R-15 · 설계: §6 P-6 오류, §7 `set_settings` 표시 규칙, §2 오류 줄, §8 `errorPrefix` · CR-018 · **신규**
- Given 마우스 탭, `setSettings` 1회차 reject `{ code:'SETTINGS_INVALID', message:'이동 영역 값이 올바르지 않습니다.' }`, 2회차 인자 그대로 resolve
- When 「이동 영역 설정하기」 → 네 점 → 「저장」 → (「저장」 활성 대기) → 「저장」
- Then ⓐ 화면: 1회차 뒤 `alert` 텍스트 정확히 `오류: 이동 영역 값이 올바르지 않습니다.`, 안내 areaReview, `points` = `SVG_NEW`·점 4개·`dd` = `DD_NEW` 유지. 2회차 뒤 `alert` 없음·안내 idle ⓑ 상태: `error` = 해당 BridgeError → null ⓒ bridge: `setSettings` 2회, 두 인자 모두 `toStrictEqual` `AREA_SAVED`
- 선행: CR-018 화면 · 스펙: `test/SettingsApp.test.tsx`

### TC-078 · pickDragTarget 우선순위(설계 예시) · 종류: 자동 · 요구: R-18, R-11 · 설계: §5.1 `pickDragTarget` ①②③, §4 상호 배타 ④, §10 좌표 판정 · CR-026 · **신규**
- Given `part` = {pos (100,200), size 200×150}(사각형 [100,300)×[200,350)), `penOver` = {pos (150,250), size 100×80}(팔 파츠와 겹침), `penApart` = {pos (350,520), size 100×80}
- When `pickDragTarget(point, pen, part)` — (200,300)·(120,220)·(40,40)은 `penOver`와, (400,560)·(200,300)은 `penApart`와
- Then ⓐ 화면: 해당 없음(순수 함수) ⓑ 상태(반환): (200,300)+penOver → `'pen'`(겹친 점은 위 그림), (120,220) → `'part'`, (40,40) → `null`, (400,560)+penApart → `'pen'`, (200,300)+penApart → `'part'` ⓒ bridge: 해당 없음(호출 없음)
- 선행: CR-026 화면 · 스펙: `test/mouseWizard.test.ts`

### TC-079 · pickDragTarget 경계·없는 대상·크기 0 이하 · 종류: 자동 · 요구: R-18 · 설계: §5.1 `pickDragTarget` 예외(크기 ≤ 0은 `hitPart`가 false)·`hitPart` · CR-026 · **신규**
- Given TC-078과 같은 `part`·`penOver`·`penApart`
- When 경계 점·`null` 대상·폭 0·높이 −1 대상으로 부른다
- Then ⓐ 화면: 해당 없음 ⓑ 상태(반환): (150,250) → `'pen'`, (249,329) → `'pen'`, (250,300) → `'part'`(펜 우단 제외), (200,330) → `'part'`(펜 하단 제외); pen `null`·(200,300) → `'part'`, part `null`·penApart·(400,560) → `'pen'`, part `null`·penOver·(200,300) → `'pen'`, 둘 다 `null` → `null`; 펜 폭 0·(200,300) → `'part'`, 펜 높이 −1·(400,560) → `null` ⓒ bridge: 해당 없음
- 선행: CR-026 화면 · 스펙: `test/mouseWizard.test.ts`
- **CR-040 개정(TC-078·TC-079 공통, v15)**: 설계 근거 → `design/drag-hit.md` §5.2 `pickDragTarget`(CR-040 개정) ①②③ + §2.3. 두 TC의 인자는 `mask` 키가 없는 `DragCandidate`라 사각형 대체 경로로 판정된다 — 「기존 호출(`mask` 없는 객체)은 옛 사각형 결과와 같다」. Given·When·기대 불변. 마스크가 있는 판정은 TC-210 ~ TC-212

### TC-080 · 펜 손 렌더: 합성 순서·회전 없음·기본/저장 위치·값 목록 ④ · 종류: 자동 · 요구: R-18, R-12 · 설계: §4 `pen`·`penHome`·`shownPenPos`, §5.2 (CR-026) 렌더 개정(렌더 3 순서·렌더 5 ④), §8 `markerPen`, §7 `get_asset_manifest`(`pen_up` 크기·url), §2 레이아웃 `dl.values` · CR-026 · **신규**
- Given ① `SETTINGS`(`penPos` null·`hand` (400,560)) + `PEN_HAND` ② `withPen((500,100))` + `PEN_HAND`
- When 마운트
- Then ⓐ 화면: ① 미리보기 `img` src 순서 `[mouse_base, body, pen_up]`, 문서 순서 바탕 `<img>` → 펜 손 `<img>` → 영역 선 `svg` → 축 마커 `(600, 480)`, 펜 손 style `left 175px · top 260px · width 50px · height 40px`, 인라인 `transform` 없음(회전 없음), `alt=""`·`draggable="false"`, 클래스 = 팔 파츠 `<img>` 클래스(`.part`), 값 목록 `dt` 순서 정확히 `['축(어깨)','파츠 위치','이동 영역','손 위치']`, 「손 위치」 `dd` `(350, 520)`, 팔 파츠 `(100, 200)` ② 펜 손 `left 250px · top 50px`, `dd` `(500, 100)` ⓑ 상태: ① `penHome` = `resolvePenPos(MOUSE, 100×80)` = (350,520) ② `penHome` = 저장값 (500,100), 두 경우 `drag` null ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-026 화면 · bridge CR-026 · overlay CR-025 `resolvePenPos` · 스펙: `test/MousePartsTab.test.tsx`

### TC-081 · pen_up 없음: 그림·「손 위치」 행 없음·끌기 없음 · 종류: 자동 · 요구: R-18 · 설계: §4 `pen`(undefined)·`penHome`(null), §5.2 렌더 개정(`pen` 없으면 행 없음)·`onPreviewPointerDown`(CR-026 — 대상 null이면 무시) · CR-026 · **신규**
- Given `withPen((500,100))`(저장값은 있음), `HAND`(`pen_up` 없음)
- When 마운트 → 오프셋 (260,70)(캔버스 (520,140) — 저장된 penPos 사각형 자리) 누름 → (300,100) 이동 → 놓기
- Then ⓐ 화면: `img[src="asset://pen_up.png"]` 없음, src `[mouse_base, body]`, `dt` 정확히 `['축(어깨)','파츠 위치','이동 영역']`(「손 위치」 행 없음), 팔 파츠 `(100, 200)` ⓑ 상태: `drag` null 유지 ⓒ bridge: `setPointerCapture`·`setSettings` 호출 없음
- 선행: CR-026 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-082 · 펜 손 끌기 정상: 따라옴·놓으면 penPos만 저장·수신 반영 · 종류: 자동 · 요구: R-18 · 설계: §4 `drag`(target `'pen'`·grab·from)·`shownPenPos`, §5.2 `onPreviewPointerDown`·`onPreviewPointerMove`·`onPreviewPointerUp`(CR-026)·(규칙) 끌기와 마법사 ③, §5.1 `pickDragTarget`, §6 P-5, §7 `set_settings` · CR-026 · **신규**
- Given `SETTINGS`, `PEN_HAND`, `setSettings`는 인자를 그대로 resolve
- When 누름 (200,280) → 이동 (250,300) → 놓기 (250,300) → 놓은 뒤 click (250,300) → (settings://changed 흉내) props `withPen((450,560))`로 재렌더
- Then ⓐ 화면: 누름 직후 펜 손 `(350, 520)`(안 움직임), 이동 뒤 `left 225px · top 280px`·`50px × 40px`·「손 위치」 `(450, 560)`; 저장 완료 뒤 안내 idle·버튼 `['어깨축 설정하기','이동 영역 설정하기','기본값으로 리셋']`·축 마커 `(600, 480)`; 재렌더 전 펜 손 `(350, 520)`(props = `penHome`), 재렌더 뒤 `(450, 560)`; 팔 파츠 내내 `(100, 200)` ⓑ 상태: `drag` = {target `'pen'`, grab (50,40), from (350,520)} → 놓으면 null, `onError` 정확히 1회 `null` ⓒ bridge: `setPointerCapture(7)`·`releasePointerCapture(7)` 각 1회, `setSettings` 이동 중 0회·놓은 뒤 정확히 1회(click·재렌더 뒤에도), 인자 `toStrictEqual` `withPen((450,560))`(`partPos` (100,200) 보존)
- 선행: CR-026 화면 · bridge CR-026 · overlay CR-025 · 스펙: `test/MousePartsTab.test.tsx`

### TC-083 · 펜 손 끌기 범위 제한(펜 손 크기 기준) · 종류: 자동 · 요구: R-18 · 설계: §5.2 `onPreviewPointerMove`(CR-026 — `size = pen`으로 `clampPartPos`), §5.1 `clampPartPos` · CR-026 · **신규**
- Given TC-082와 같음
- When 누름 (200,280) → 이동 (440,345) → (−50,−50) → (500,400) → 놓기
- Then ⓐ 화면: 펜 손 `(800, 620)`(`left 400px · top 310px` — 오른쪽·아래 끝 = 450·350px) → `(0, 0)` → `(800, 620)`, 「손 위치」 같은 값 ⓑ 상태: 제한 범위 x∈[0,800]·y∈[0,620](팔 파츠 기준 (700,550)이 아님) ⓒ bridge: `setSettings` 정확히 1회, 인자 `withPen((800,620))`
- 선행: CR-026 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-084 · 저장 0회(제자리·원위치·cancel)·penPos null 유지 · 종류: 자동 · 요구: R-18, R-11 · 설계: §5.2 `onPreviewPointerUp`(CR-026 — `final`이 `drag.from`과 같으면 저장 없음, `penPos` null이면 null 유지)·`onPreviewPointerCancel` · CR-026 · **신규**
- Given TC-082와 같음
- When ① 누름 (200,280) → 같은 자리 놓기 ② 누름 → (250,300) → (200,280) → 놓기 ③ 누름 → (250,300) → pointercancel → pointerup ④ 이어서 팔 파츠 누름 (100,150) → (150,175) → 놓기
- Then ⓐ 화면: ①~③ 끝마다 펜 손·「손 위치」 `(350, 520)`(② 중간 `(450, 560)`, ③ cancel 직후·뒤이은 up 뒤 `(350, 520)`) ⓑ 상태: `penPos` null 그대로(표시 = 기본 위치 계산값), ①~③ 동안 `onError` 호출 없음 ⓒ bridge: ①~③ `setPointerCapture` 3회·`releasePointerCapture(7)` 호출 있음·`setSettings` 0회; ④ `setSettings` 정확히 1회 `withPart((200,250))` — `mouse.penPos` `null`
- 선행: CR-026 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-085 · 마스크 없음(사각형 대체)일 때 겹침은 펜 손 우선·펜 손 끌기 중 팔 파츠 불변 · 종류: 자동 · 요구: R-18, R-11, R-37 · 설계: §5.1 `pickDragTarget` ①, §4 상호 배타 ④·`shownPartPos`(CR-026 식)·`shownPenPos`, §5.2 `onPreviewPointerUp`(대상 필드만 저장), **`design/drag-hit.md` §2.3·§5.3 테스트 이음새(CR-040)** · CR-026 · **개정(CR-040 — 전제 명시)**
- Given `withPen(PEN_OVER)`(= (150,250)), `PEN_HAND`, `setSettings`는 인자를 그대로 resolve. **전제(CR-040)**: 이 스펙 파일은 `useAlphaMask`를 mock하지 않는다 → jsdom에서 이미지가 로드되지 않아 두 마스크 `null` → 사각형 대체. 「겹치면 펜 손」은 마스크가 없거나 둘 다 불투명일 때의 규칙이다(둘 다 불투명 = TC-220 ①, 펜 손 투명·팔 칠함 → 팔 = TC-218). 기대 불변
- When 누름 (100,150)(캔버스 (200,300) — 두 사각형 모두 안) → (150,175) → 놓기 → 저장 완료(「기본값으로 리셋」 활성) → 누름 (60,110)(캔버스 (120,220) — 팔 파츠에만) → (110,135) → 놓기
- Then ⓐ 화면: 1차 끌기 중 펜 손 `(250, 300)`·팔 파츠 `(100, 200)` 그대로; 2차 끌기 중 팔 파츠 `(200, 250)`·펜 손 `(150, 250)` 그대로 ⓑ 상태: 1차 `drag.target` `'pen'`(grab (50,50)), 2차 `'part'`(grab (20,20)) ⓒ bridge: `setSettings` 2회 — ① `withPen((250,300))`(partPos (100,200)) ② `{ ...SETTINGS, mouse: { ...MOUSE, penPos:(150,250), partPos:(200,250) } }`
- 선행: CR-026 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-086 · 상호 배타: 어깨축 마법사·이동 영역 설정 중 펜 손 끌기 불가 · 종류: 자동 · 요구: R-18, R-10, R-15 · 설계: §4 상호 배타 ②(대상과 무관하게 `step === 'idle' && !saving`), §5.2 `onPreviewPointerDown`(CR-026 조건)·`onPreviewClick`·(규칙) 끌기와 마법사 ④ · CR-026 · **신규**
- Given `SETTINGS`, `PEN_HAND`
- When pickShoulder에서 펜 손 누름·이동·놓기 → 클릭 (200,280) → review에서 누름·이동·놓기 → 「취소」 → 「이동 영역 설정하기」 → pickArea에서 누름·이동·놓기 → 클릭 (200,280) → 나머지 세 꼭짓점 → reviewArea에서 누름·이동·놓기
- Then ⓐ 화면: 모든 단계에서 펜 손 `(350, 520)` 그대로; pickShoulder 클릭 → 안내 review·축 마커 `(400, 560)`; pickArea 클릭 → 안내 `2/4 …`·점 표식 `['200,280']`; 네 점 뒤 안내 `이동 영역을 확인하고 저장하세요.`; 팔 파츠 `(100, 200)` ⓑ 상태: `drag` 내내 null, 마법사 진행은 클릭으로만 ⓒ bridge: `setPointerCapture`·`setSettings` 호출 없음
- 선행: CR-026 화면 · CR-018 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-087 · 상호 배타: 저장 중(리셋·펜 손 놓기) 끌기 불가 · 종류: 자동 · 요구: R-18, R-17 · 설계: §4 `saving`(끌기 시작 불가)·상호 배타 ②, §5.2 `onPreviewPointerDown`(CR-026) · CR-026 · **신규**
- Given `SETTINGS`, `PEN_HAND`, `setSettings` 1회차·2회차 모두 대기(deferred)
- When 「기본값으로 리셋」 → (대기 중) 펜 손 누름·이동·놓기 → 1회차 resolve → 펜 손 누름 (200,280)·(250,300)·놓기(2회차 대기) → 펜 손 누름·이동·놓기, 팔 파츠 누름 (100,150)·(150,175)·놓기 → 2회차 resolve
- Then ⓐ 화면: 두 대기 구간에서 펜 손 `(350, 520)`·팔 파츠 `(100, 200)` 그대로, 2회차 대기 중 「기본값으로 리셋」 비활성 → resolve 뒤 활성 ⓑ 상태: `saving` 중 `drag` null ⓒ bridge: `setPointerCapture` 총 1회(1회차 resolve 뒤 끌기만), `setSettings` 총 2회 — ① `{ ...SETTINGS, mouse: DEFAULT_MOUSE_EXPECTED }` ② `withPen((450,560))`
- 선행: CR-026 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-088 · 펜 손 놓기 저장 실패 → 저장된 자리 복귀·재시도 · 종류: 자동 · 요구: R-18 · 설계: §5.2 `onPreviewPointerUp` 예외(CR-026 — 그림은 `penHome`으로 복귀)·`persist` 예외, §6 P-5 오류 · CR-026 · **신규**
- Given `SETTINGS`, `PEN_HAND`, `setSettings` 1회차 reject `IO_ERR`, 2회차 인자 그대로 resolve
- When 누름 (200,280) → (250,300) → 놓기 → (「기본값으로 리셋」 활성 대기) → 같은 끌기 반복
- Then ⓐ 화면: 실패 뒤 펜 손·「손 위치」 `(350, 520)`, 팔 파츠 `(100, 200)` ⓑ 상태: `onError` 1회차 `IO_ERR`(정확히 1회) → 재시도 뒤 마지막 호출 `null` ⓒ bridge: `setSettings` 2회, 두 인자 모두 `withPen((450,560))`
- 선행: CR-026 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-089 · 리셋 → penPos null·수신 뒤 기본 위치 · 종류: 자동 · 요구: R-18, R-17 · 설계: §5.2 `onReset`(CR-026 — `DEFAULT_MOUSE_SETTINGS.penPos = null`), §4 `penHome`(기본 위치 규칙) · CR-026 · **신규**
- Given `withPen((500,100))`, `PEN_HAND`, `setSettings`는 인자를 그대로 resolve
- When 「기본값으로 리셋」 → (settings://changed 흉내) props `{ ...SETTINGS, mouse: DEFAULT_MOUSE_EXPECTED }`로 재렌더
- Then ⓐ 화면: 클릭 전·수신 전 펜 손 `(500, 100)`, 수신 뒤 `(385, 535)`(`left 192.5px · top 267.5px` — `hand` null → 기본 이동 영역 중심 (435,575) − (50,40)) ⓑ 상태: `onError(null)` ⓒ bridge: `setSettings` 정확히 1회, 인자 `toStrictEqual` `{ ...SETTINGS, mouse: DEFAULT_MOUSE_EXPECTED }`, `mouse.penPos` `null`, 키 정렬 `['area','hand','partPos','penPos','shoulder']`
- 선행: CR-026 화면 · **bridge CR-026**(`DEFAULT_MOUSE_SETTINGS.penPos = null` — 현행 types.ts면 FAIL) · 스펙: `test/MousePartsTab.test.tsx`

### TC-090 · settings.mouse null: 기본값 기준 기본 위치에서 끌기·객체 mouse 저장 · 종류: 자동 · 요구: R-18 · 설계: §5.2 (규칙) `settings.mouse === null`(끌어다 놓기 저장 포함), §4 `mouse`·`penHome`, §5.1 `pickDragTarget` ① · CR-026 · **신규**
- Given `{ ...SETTINGS, mouse: null }`, `PEN_HAND`, `setSettings`는 인자를 그대로 resolve
- When 누름 (200,280)(캔버스 (400,560) — 펜 손 [385,485)×[535,615)·팔 파츠 [389,589)×[492,642) 둘 다 안) → (250,300) → 놓기
- Then ⓐ 화면: 초기 펜 손 `(385, 535)`, 이동 뒤 `(485, 575)`, 팔 파츠 `(389, 492)` 그대로 ⓑ 상태: 대상 `'pen'`, grab (15,25) ⓒ bridge: `setSettings` 정확히 1회, 인자 `{ ...SETTINGS, mouse: { ...DEFAULT_MOUSE_EXPECTED, penPos:(485,575) } }`
- 선행: CR-026 화면 · bridge CR-026 · 스펙: `test/MousePartsTab.test.tsx`

### TC-091 · 펜 손 접근성 · 종류: 자동 · 요구: R-18 · 설계: §5.2 렌더 개정 접근성(§9 — 펜 손 끌기 포인터 전용, 결과는 값 목록 「손 위치」, `<img alt="">`) · CR-026 · **신규**
- Given `SETTINGS`, `PEN_HAND`
- When 마운트 → 누름 (200,280)·이동 (250,300) → pointercancel
- Then ⓐ 화면: 역할 `img` 1개(축 마커뿐 — 펜 손은 역할 트리에 없음), 펜 손 `alt=""`·`tabindex` 없음, 미리보기 `role="presentation"`·`tabindex` 없음; 끌기 중에도 역할 `img` 1개·`[aria-live]` 1개(안내 줄)·「손 위치」 `(450, 560)` ⓑ 상태: cancel 뒤 `drag` null ⓒ bridge: `setSettings` 호출 없음
- 선행: CR-026 화면 · 스펙: `test/MousePartsTab.test.tsx`

### TC-092 · 라벨 markerPen · 종류: 자동 · 요구: R-18, R-01(한국어 UI) · 설계: §8 `markerPen` · CR-026 · **신규**
- Given `src/settings/labels.ts`
- When `labels`를 읽는다
- Then ⓐ 화면: `markerPen` = `손 위치`, `markerPart`(`파츠 위치`)와 다름 ⓑ 상태: 옛 손 기준점 키 `markerHand` 없음(CR-005 삭제 유지 — requirements §1 용어 주) ⓒ bridge: 해당 없음(상수 모듈)
- 선행: CR-026 labels 전사 · 스펙: `test/labels.test.ts`
- **CR-028 개정**: 원천이 `i18n/ko.ts`로 바뀌었다(`ko.markerPen` = `손 위치`, `markerHand` 키 없음, `markerPart`와 다름). 기대 불변 · 스펙: `test/labels.test.ts`

### CR-028 신규 TC (TC-093 ~ TC-152)

선행(공통): CR-028 화면 적용 + bridge v0.14 소스 반영. 미적용이면 import·타입 오류로 **예정된 FAIL**(TDD Red). 픽스처 `SETTINGS`(CR-028) = 기존 값 + `language:'ko'` · `positionLock:false` · `showInTaskbar:false`(TC-104 ~ TC-130은 `mouse: null`). 오류 픽스처 `SAVE_ERR` = `{ code:'settings.io', message:'설정 파일을 읽거나 쓸 수 없습니다: 거부' }`, `TOO_LARGE` = `{ code:'asset.too_large', message:'이미지가 너무 큽니다. 최대 900×700 (현재 1000×800).' }`, `PATH` = `C:\img\new.png`. 매니페스트 `BASIC` = canvas 900×700, `body`·`kb_up`·`kb_down_0`·`kb_down_1`(900×700)·`mouse_base` 200×150, `WITH_PEN` = `BASIC` + `pen_up` 100×80.

#### i18n (`test/i18n.test.ts`)

### TC-093 · 세 사전 키 집합 동일·빈 문자열 없음·errors = 계약 code 20개 · 종류: 자동 · 요구: R-20 · 설계: i18n.md §1(`: Messages` 선언)·§2 `Messages`·§4.4 `SlotMessageKey`·§4.6 `ERROR_CODES` · U-4 · **개정(CR-054 — 기대 개수·목록은 「CR-054 개정 TC」 표가 대체)**
- Given `ko`·`ja`·`en`·`ERROR_CODES` · When 키를 비교 · Then ⓐ 화면: 해당 없음(문구 원천) — 단순 키·`slots` 24키·`errors` 20키 집합이 세 사전 모두 같고 모든 문자열(슬롯 제목·설명 포함)이 공백 아닌 값 ⓑ 상태: `ERROR_CODES` = §4.6 표 순서 20개(`asset.not_png` … `unknown`) = contract v0.14 §6 정본 ⓒ bridge: 호출 없음(상수)

### TC-094 · ko 새 문구·슬롯·오류 문구 정확 일치, 「(같음)」은 문장으로 · 종류: 자동 · 요구: R-20, R-19, R-25, R-03, R-04, R-21 ~ R-24 · 설계: i18n.md §4.1 ~ §4.4·§4.6 ko 열, §4.4 표 아래 주 · **개정(CR-054 — 기대 개수·목록은 「CR-054 개정 TC」 표가 대체)**
- Given `ko` · When 조회 · Then ⓐ 화면(문구 원천): 새 키 43개가 §4.1 ~ §4.3 ko 열과 정확히 같다(예: `autostartPending` = `Windows 권한 확인을 기다리는 중입니다…`, `confirmClearMessage` = `‘{name}’ 그림을 지울까요? 되돌릴 수 없습니다.`), `slots` 24개 제목/설명·`errors` 20개가 §4.4·§4.6 ko 열과 같다 ⓑ 상태: 단순 키 69개(이관 26 + 새 43), 세 사전 모두 특수 키 설명이 `(같음)`·`(同上)`·`(same)`이 아니라 `key_space`(펜은 `pen_key_space`) 설명과 같은 문장 ⓒ bridge: 호출 없음

### TC-095 · ja·en 공통 문구(§4.1)·언어 목록·이름·사전 선택 · 종류: 자동 · 요구: R-20 · 설계: i18n.md §3 `LANGUAGES`·`LANGUAGE_NAMES`·`MESSAGES`·`messagesFor`, §4.1 ja·en 열
- Given 세 사전 · When `messagesFor('ko'|'ja'|'en'|'fr'|'')` · Then ⓐ 화면(문구 원천): ja §4.1 7키(`kuro_keyviewer 設定`·`PNG画像を選択`·`設定タブ`·`基本設定`·`画像設定`·`肩の軸・手の位置`·`エラー:`), en §4.1 7키(`kuro_keyviewer Settings`·`Select a PNG image`·`Settings tabs`·`General`·`Images`·`Shoulder & Hand`·`Error:`) ⓑ 상태: `LANGUAGES` = `['ko','ja','en']`, `LANGUAGE_NAMES` = `{ko:'한국어', ja:'日本語', en:'English'}`, `MESSAGES.x`·`messagesFor(x)` = 해당 사전(같은 객체), `'fr'`·`''` → `ko` ⓒ bridge: 호출 없음
- 비고: ja·en의 §4.2 ~ §4.6 문구는 「검수 필요(사용자, 미결 U-1)」라 정확 비교하지 않는다 — TC-093(키·빈 값) + UI TC(사전 값 import 비교) + 수동 M-22(사용자 검수)로 커버

### TC-096 · format · 종류: 자동 · 요구: R-20 · 설계: i18n.md §3 `format`, §1 자리표시자 규칙
- Given 템플릿 · When `format` · Then ⓐ 화면(조립 문구): `format('타자 입력 {n}',{n:2})` = `타자 입력 2`, `format(ko.scaleDesc,{min:25,max:200})` = `캐릭터 표시 크기(25%~200%). …`, `format(ko.imagesNote,{w:900,h:700})`의 `900×700`, 없는 자리표시자는 그대로(`{name} 그림 지우기`, `x-{b}`) ⓑ 상태: 반환 문자열만(순수) ⓒ bridge: 호출 없음

### TC-097 · errorText · 종류: 자동 · 요구: R-20 · 설계: i18n.md §3 `errorText` ①②③, design §7 실패 표시 규칙
- Given `TOO_LARGE` · When `errorText(t, lang, e)` · Then ⓐ 화면(오류 문구): ko → `e.message` 그대로, ja·en → `t.errors['asset.too_large']`, ko + 빈 message → `ko.errors['settings.io']`(`설정 파일을 읽거나 쓰지 못했습니다.`), 모르는 code(`foo.bar`)·옛 별칭(`SETTINGS_INVALID`)은 ja·en에서 `t.errors.unknown`, ko 빈 message + 모르는 code → `알 수 없는 오류가 발생했습니다.` ⓑ 상태: 순수 ⓒ bridge: 호출 없음

### TC-098 · MessagesProvider·useMessages·useLanguage · 종류: 자동 · 요구: R-20 · 설계: i18n.md §3 Provider 3행
- Given 탐침 컴포넌트(`${lang}|${t.tabGeneral}`) · When Provider 없이 → `language` `ja` → `en` → `fr` · Then ⓐ 화면: `ko|기본 설정` → `ja|基本設定` → `en|General` → `ko|기본 설정` ⓑ 상태: 목록 밖 언어는 `'ko'` ⓒ bridge: 호출 없음

#### SettingsApp (`test/SettingsApp.test.tsx`)

### TC-099 · 금지 요소 부재 · 종류: 자동 · 요구: R-27(R-19 금지 조건 승계) · 설계: §1 금지 조건, §2 창 골격(검색창·배지·구분 그룹 제목 없음, `h1` = 선택 탭 이름), general-tab.md §1(크기 4단·흔들림·항상 위·안내 줄 없음), images-tab.md §1 · U-1 · **개정(CR-031)** · **개정(CR-054 — 기대 개수·목록은 「CR-054 개정 TC」 표가 대체)**
- Given 마운트 · When 기본 설정 → 이미지 설정 → 어깨축·손 위치 탭을 차례로 연다 · Then ⓐ 화면: 메뉴 `tab` 정확히 3개(「동작」 없음), 사이드바 `aside`에 `searchbox`·`textbox`·`heading` 없음·글자는 탭 이름 3개뿐(배지·구분 그룹 제목 없음), 기본 설정 탭의 `button` 역할은 `['위치 초기화']`뿐(크기 4단 버튼 없음 — 토글은 `switch`), 세 시점의 `h1`은 각각 정확히 1개 = `기본 설정` → `이미지 설정` → `어깨축·손 위치`(제품명 아님 — v8의 「세 시점 모두 `h1` 없음」 폐기), 본문에 `닫기`·`설명서`·`프리셋`·`흔들림`·`항상 위`·`변경한 설정은 바로 적용` 없음, 제품명 `kuro_keyviewer 설정`은 DOM에 없음(창 제목 표시줄에만) ⓑ 상태: `tab` general → images → mouse ⓒ bridge: 탭 전환으로 호출 없음(TC-032와 같음)

### TC-100 · 저장된 언어(ja)로 열기 · 종류: 자동 · 요구: R-20 · 설계: §5.3 렌더 골격·언어 반영 효과, §4 `language`·`t`, i18n.md §3 · U-5
- Given `getSettings` → `{...SETTINGS, language:'ja'}` · When 마운트 · Then ⓐ 화면: 메뉴 `tab` `[ja.tabGeneral, ja.tabImages, ja.tabMouse]`, `tablist` 이름 `ja.tabsAria`(CR-031 — 옛 nav 이름), `h1` = `ja.tabGeneral`, 첫 카드 제목 `ja.cardLanguage` ⓑ 상태: `<html lang>` = `ja` ⓒ bridge: `setSettingsWindowTitle` 호출 순서 정확히 `['kuro_keyviewer 설정', ja.windowTitle]`(첫 렌더는 `DEFAULT_SETTINGS.language` = ko — design §5.3 「첫 마운트와 언어가 바뀔 때마다」), `setSettings` 호출 없음(되저장 없음)

### TC-101 · 언어 이벤트 수신 → 세 탭 즉시 교체·포커스 유지 · 종류: 자동 · 요구: R-20, R-27, R-26 · 설계: §5.3 언어 반영 효과, §9(언어 전환 시 포커스 그대로), i18n.md §3 「재시작 없이」, G-1 · U-5 · **개정(CR-031)** · **개정(CR-054 — 기대 개수·목록은 「CR-054 개정 TC」 표가 대체)**
- Given ko로 마운트, 「기본 설정」 메뉴 항목(`tab`, `tabindex="0"`)에 포커스 · When `settings://changed` `{...SETTINGS, language:'en'}` → 어깨축·손 위치 탭 → 이미지 설정 탭 → 다시 ko 수신 · Then ⓐ 화면: 메뉴 `tab` `['General','Images','Shoulder & Hand']`(`tablist` 이름 `en.tabsAria`), 포커스는 같은 항목(글자만 `General`), `h1` = `en.tabGeneral`, 카드 제목 4개 = en `cardLanguage`·`cardScale`·`cardWindow`·`cardStartup`, 어깨축 탭 안내 = `en.wizardIdle`·버튼 `en.wizardStart`·region `en.tabMouse`, 이미지 탭 첫 그룹 `en.groupBackground`, ko 수신 뒤 한국어 탭 3개 ⓑ 상태: `<html lang>` en → ko ⓒ bridge: `setSettingsWindowTitle` 마지막 인자 `kuro_keyviewer Settings`, `setSettings` 호출 없음

### TC-102 · 오류 줄은 현재 언어 · 종류: 자동 · 요구: R-20 · 설계: §5.3 오류 줄 문구, §7 실패 표시 규칙, i18n.md §3 `errorText`·§4.1 `errorPrefix`
- Given 저장 언어 ja, `getAssetManifest` reject `{ code:'asset.manifest', message:'매니페스트를 읽거나 쓸 수 없습니다: 손상' }` · When 마운트 → en 수신 → ko 수신 · Then ⓐ 화면: `alert` = `${ja.errorPrefix} ${ja.errors['asset.manifest']}` → `${en.errorPrefix} ${en.errors['asset.manifest']}` → `오류: 매니페스트를 읽거나 쓸 수 없습니다: 손상` ⓑ 상태: `error`는 같은 BridgeError 유지(언어만 바뀜) ⓒ bridge: `getAssetManifest` 1회(재시도 없음)

### TC-103 · 창 제목 설정 실패 → 오류 줄 · 종류: 자동 · 요구: R-20 · 설계: §5.3 언어 반영 효과 예외, §7 `setSettingsWindowTitle` 행
- Given `setSettingsWindowTitle` reject `new Error('permission denied')` · When 마운트 · Then ⓐ 화면: `alert` = `오류: permission denied` ⓑ 상태: `error` = `{ code:'unknown', message:'permission denied' }`(`toBridgeError`) ⓒ bridge: `setSettingsWindowTitle('kuro_keyviewer 설정')` 호출됨

#### 기본 설정 탭 (`test/GeneralTab.test.tsx`)

### TC-104 · 레이아웃·카드·초기 표시 · 종류: 자동 · 요구: R-19, R-20 ~ R-24, R-03, R-04 · 설계: general-tab.md §1 레이아웃, §4 렌더 1 ~ 5, §2 컴포넌트 표, i18n.md §4.2 · **개정(CR-049)** · **개정(CR-054 — 기대 개수·목록은 「CR-054 개정 TC」 표가 대체)**
- (CR-049 개정 — 아래 줄보다 우선) ⓐ 자동 실행 스위치 설명 = `켜면 Windows에 로그인할 때 자동으로 실행됩니다. 관리자 권한으로 실행한 게임 안에서도 입력을 인식하려면 이 앱을 직접 관리자 권한으로 실행하세요.`(i18n §4.2 새 `autostartDesc` — 관리자 확인 창 안내 없음) ⓑ 초기값 `autostartPending` false·`resetPending` false(`autostartNotice`는 CR-049로 삭제 — 단언 없음) ⓒ 불변. 나머지 ⓐ 단언 불변
- Given `{...SETTINGS, positionLock:true, autostart:true}` · When `GeneralTab` 렌더 · Then ⓐ 화면: region `기본 설정`, h2 순서 `['언어 / Language','크기 · 반응','창','작업표시줄 · 시작']`, 언어 `combobox` 이름 `표시 언어` 값 `ko`·옵션 `['한국어','日本語','English']`(value·`lang` = ko·ja·en), 배율 150·유휴 2, 「창」 카드 안에 「위치 초기화」(활성)·잠금 스위치, 스위치 3개 `aria-checked` `['true','false','true']`, 각 스위치 설명(`aria-describedby`) = lockDesc·taskbarDesc·autostartDesc(관리자 확인 창 안내 포함), 안내 줄 `p[role=status][aria-live=polite]` 빈 내용 ⓑ 상태: `autostartPending` false·`autostartNotice` null·`resetPending` false(초기값) ⓒ bridge: `setSettings`·`setAutostart`·`resetOverlayPosition` 호출 없음

### TC-105 · ToggleSwitch 단독 · 종류: 자동 · 요구: R-19, R-21 ~ R-23 · 설계: general-tab.md §2 `ToggleSwitch` props, §2.1 렌더 1 ~ 4
- Given `id="t1"`·`label="라벨"`·`description="설명"` · When 클릭·라벨/설명 글자 클릭·`checked`/`disabled`/`busy` 재렌더 · Then ⓐ 화면: `switch` 이름 `라벨`·설명 `설명`·`type=button`·`id=t1`, `aria-checked` false → true, `disabled`면 비활성·`aria-busy` 없음, `busy`면 비활성 + `aria-busy="true"` ⓑ 상태: 없음(제어 컴포넌트) ⓒ bridge: 없음 — `onToggle` 호출 수 = 버튼 클릭 1회만(라벨·설명 클릭·비활성 클릭은 0)

### TC-106 · SettingsCard 단독 · 종류: 자동 · 요구: R-19 · 설계: general-tab.md §2 `SettingsCard`, §2.2 렌더
- Given `title="카드"`, `action` 버튼 `머리`, children `본문` · When 렌더 · Then ⓐ 화면: region 이름 `카드`(`aria-labelledby` = h2 id), h2 머리 줄에 `머리` 버튼, 본문 표시 ⓑ 상태: `headingId` = h2 id ⓒ bridge: 없음

### TC-107 · 언어 변경 저장·무시 조건·낙관 갱신 없음 · 종류: 자동 · 요구: R-20 · 설계: general-tab.md §3.2 `onLanguageChange`·`saveSettings`, §4-2, G-1
- Given `SETTINGS`, `setSettings` 인자 그대로 resolve · When `ja` 선택 → props `language:'ja'` 재렌더 → 다시 `ja` 선택 → 목록 밖 `fr` · Then ⓐ 화면: 저장 직후 선택 상자 값 `ko`(수신 전), 재렌더 뒤 `ja` ⓑ 상태: `onError(null)` ⓒ bridge: `setSettings` 정확히 1회, 인자 `{...SETTINGS, language:'ja'}`(toStrictEqual). 같은 값·목록 밖 값은 호출 없음

### TC-108 · 언어 저장 실패 · 종류: 자동 · 요구: R-20 · 설계: general-tab.md §3.2 `saveSettings` 예외, G-1 오류
- Given `setSettings` 1회차 reject `SAVE_ERR`, 2회차 reject `new Error('boom')` · When `en` 선택 ×2 · Then ⓐ 화면: 선택 상자 `ko` 유지 ⓑ 상태: `onError(SAVE_ERR)` → `onError({code:'unknown', message:'boom'})`, `onError(null)` 없음 ⓒ bridge: `setSettings` 2회(인자 `language:'en'`)

### TC-109 · 위치 잠금 토글 · 종류: 자동 · 요구: R-21 · 설계: general-tab.md §3.2 `onToggleLock`·`saveSettings`, §3.2 주(autostart 그대로), §4-4, G-4
- Given `S0 = {...SETTINGS, autostart:true, showInTaskbar:true}` · When 잠금 클릭 → props `positionLock:true` → 다시 클릭 · Then ⓐ 화면: 저장 직후 `aria-checked="false"`(수신 전), 재렌더 뒤 `true` ⓑ 상태: `onError(null)` ⓒ bridge: 1회차 인자 정확히 `{...S0, positionLock:true}`(autostart·showInTaskbar 그대로), 2회차 `{...S0, positionLock:false}`, `setAutostart` 호출 없음

### TC-110 · 잠금·작업표시줄 저장 실패 · 종류: 자동 · 요구: R-21, R-22 · 설계: general-tab.md §3.2 `saveSettings` 예외, G-4·G-5 오류
- Given `setSettings` reject `SAVE_ERR` · When 잠금 클릭 → 작업표시줄 클릭 · Then ⓐ 화면: 두 스위치 `aria-checked="false"` 유지 ⓑ 상태: `onError(SAVE_ERR)` 2회 ⓒ bridge: `setSettings` 2회

### TC-111 · 작업표시줄 토글 · 종류: 자동 · 요구: R-22 · 설계: general-tab.md §3.2 `onToggleTaskbar`, §4-5, G-5
- Given `SETTINGS` · When 클릭 → props `showInTaskbar:true` → 클릭 · Then ⓐ 화면: 재렌더 뒤 `aria-checked="true"` ⓑ 상태: `onError(null)` ⓒ bridge: 인자 `{...SETTINGS, showInTaskbar:true}` → `{...SETTINGS, showInTaskbar:false}`, 정확히 2회

### TC-112 · 저장 대기 중에도 잠금·작업표시줄은 비활성 안 함 · 종류: 자동 · 요구: R-21, R-22 · 설계: general-tab.md §3.2 주(연속 클릭 = 마지막 settings 기준)
- Given `setSettings` 끝나지 않음 · When 잠금 2회 클릭 · Then ⓐ 화면: 잠금·작업표시줄 스위치 활성, `aria-busy` 없음 ⓑ 상태: `settings` props 불변 ⓒ bridge: `setSettings` 2회, 둘 다 `{...SETTINGS, positionLock:true}`

### TC-113 · 자동 실행 대기 상태 · 종류: 자동 · 요구: R-23 · 설계: general-tab.md §3.1 `autostartPending`, §3.2 `onToggleAutostart`, §2.1(busy), §4-5 안내 줄, G-6, i18n §4.2 `autostartPending` · U-2 · **개정(CR-049 — 대기 문구만)**
- Given `setAutostart` 미결 promise · When 클릭 → 다시 클릭 → resolve(true) → props `autostart:true` · Then ⓐ 화면: 대기 중 자동 실행 스위치 비활성·`aria-busy="true"`·안내 `자동 실행 설정을 바꾸는 중입니다…`(CR-049 — 옛 `Windows 권한 확인을 기다리는 중입니다…` 대체), 잠금 스위치는 활성. 응답 뒤 활성·`aria-busy` 없음·안내 빈 내용·`aria-checked="false"`(수신 전) → 재렌더 뒤 `true` ⓑ 상태: `autostartPending` true → false, 마지막 `onError(null)` ⓒ bridge: `setAutostart` 정확히 1회 인자 `true`, `setSettings` 호출 없음

### TC-114 · 자동 실행 실패 → 오류 줄·안내 줄 빈 내용, 다시 눌러 성공하면 오류 지움 · 종류: 자동 · 요구: R-23 · 설계: general-tab.md §3.2 `onToggleAutostart` 예외(모든 code → `onError`)·성공 `onError(null)`, §3.1 `autostartPending`, §4-5 안내 줄(대기 중에만 문구), §5 G-6 오류, §6 상태 알림, contract v0.22 §5.5·§6 · U-3 · **개정(CR-049 — TC-ID 재사용)**
- 개정 사유: CR-049로 `autostart.cancelled`·취소 안내(`autostartNotice`)가 폐기되어 옛 기대(취소 → 안내 줄, 오류 줄 아님)는 성립하지 않는다. 같은 설계 항목(`onToggleAutostart` 예외 분기·G-6 오류)을 새 동작으로 검증하므로 번호를 재사용한다. TC-115(`autostart.error`·`Error` 정규화 — 대기 문구 전후는 보지 않음)와 달리 이 TC는 **대기 중 안내 → 실패 뒤 빈 내용**, 설계가 「등」으로 든 `io.error`, **실패 뒤 재시도 성공 시 오류 해제**를 본다
- Given `setAutostart` 1회차 deferred → reject `{ code:'io.error', message:'파일을 처리하지 못했습니다: 임시 작업 파일' }`, 2회차 deferred → resolve(true), `SETTINGS`(`autostart:false`)
- When 클릭 → 1회차 reject → 다시 클릭 → 2회차 resolve
- Then ⓐ 화면: 1회차 대기 중 안내 `자동 실행 설정을 바꾸는 중입니다…` → 실패 뒤 안내 줄 빈 내용(취소 안내 없음)·스위치 활성·`aria-busy` 없음·`aria-checked="false"`(토글 원래대로) → 다시 누르면 안내 대기 문구 → 성공 뒤 안내 빈 내용 ⓑ 상태: `autostartPending` true → false → true → false, `onError` 호출 정확히 `[[{code:'io.error', …}], [null]]`(실패 = 오류 줄, 누를 때는 지우지 않고 성공 응답 뒤 `null`) ⓒ bridge: `setAutostart` 호출 `[[true],[true]]`, `setSettings` 호출 없음
- 스펙: `test/GeneralTab.test.tsx` `it('TC-114 (CR-049 개정): …')`
- (옛 기록 — 폐기: UAC 취소 `autostart.cancelled` → 안내 `권한 확인이 취소되어 바뀌지 않았습니다.`·`autostartNotice` 'cancelled' → null·`onError` 마지막 `null`)

### TC-115 · 자동 실행 그 밖의 실패 · 종류: 자동 · 요구: R-23 · 설계: general-tab.md §3.2 `onToggleAutostart` 예외(그 외), G-6 오류
- Given 1회차 reject `{ code:'autostart.error', message:'자동 실행 설정을 바꾸지 못했습니다. (schtasks 종료 코드 1)' }`, 2회차 reject `new Error('boom')` · When 클릭 ×2 · Then ⓐ 화면: 안내 줄 빈 내용, 스위치 활성·`aria-checked="false"` ⓑ 상태: `onError(그 객체)` → `onError({code:'unknown', message:'boom'})` ⓒ bridge: `setAutostart(true)` 2회

### TC-116 · 자동 실행 끄기·setSettings 경로 아님 · 종류: 자동 · 요구: R-23 · 설계: general-tab.md §3.2 `onToggleAutostart`(`!settings.autostart`), §3.2 주(core 소유 필드), contract §5.3
- Given `{...SETTINGS, autostart:true}`, `setAutostart` → false · When 클릭 · Then ⓐ 화면: 처음 `aria-checked="true"`, 응답 뒤 스위치 활성 ⓑ 상태: `autostartPending` false 복귀 ⓒ bridge: `setAutostart(false)`, `setSettings` 호출 없음

### TC-117 · 위치 초기화 성공 · 종류: 자동 · 요구: R-24 · 설계: general-tab.md §3.1 `resetPending`, §3.2 `onResetPosition`, §4-4, G-7, §5 confirm 없음, design §6 confirm 표
- Given `resetOverlayPosition` 미결, `window.confirm` spy · When 클릭 → 다시 클릭 → resolve `{x:100,y:100}` · Then ⓐ 화면: 대기 중 버튼 비활성, `dialog`·`alertdialog` 없음, 응답 뒤 활성 ⓑ 상태: `resetPending` true → false, 마지막 `onError(null)` ⓒ bridge: `resetOverlayPosition()` 정확히 1회 인자 없음, `window.confirm`·`setSettings` 호출 없음

### TC-118 · 위치 초기화 실패 · 종류: 자동 · 요구: R-24 · 설계: general-tab.md §3.2 `onResetPosition` 예외, G-7 오류
- Given reject `{ code:'window.not_found', message:'overlay 창을 찾을 수 없습니다.' }` · When 클릭 · Then ⓐ 화면: 버튼 다시 활성 ⓑ 상태: `onError(그 객체)` ⓒ bridge: `resetOverlayPosition` 1회

### TC-119 · 배율 표시 · 종류: 자동 · 요구: R-03, R-21 · 설계: general-tab.md §3.3 `percentBounds`·`SCALE_STEP_PERCENT`, §3.4 `percent`·`shownPercent`, §3.6 렌더 1·2, i18n.md §4.2 `scaleLabel`·`scaleDesc` · U-13
- Given `scale 1.5` · When `ScaleIdleCard` 렌더 · Then ⓐ 화면: region `크기 · 반응`, `slider` 이름 `배율` 값 `150`·`min 25`·`max 200`·`step 5`·`aria-valuetext 150%`, 설명 = `캐릭터 표시 크기(25%~200%). 오버레이에서 Ctrl+휠로도 바꿀 수 있습니다(위치 잠금 중에는 여기서만).`, `<output>` `150%` ⓑ 상태: `scaleDraft` null ⓒ bridge: 호출 없음

### TC-120 · 끄는 동안 0회·놓을 때 1회 · 종류: 자동 · 요구: R-03 · 설계: general-tab.md §3.5 `onScaleInput`·`commitScale`·`onScalePointerUp`, G-2 · U-13
- Given `SETTINGS` · When 값 155 → 160 → 175 → `pointerup` → props `scale 1.75` · Then ⓐ 화면: 끄는 중 `175%`·`aria-valuetext 175%`, 저장 응답 뒤 `150%`(수신 전 저장값), 재렌더 뒤 `175%`·슬라이더 `175` ⓑ 상태: `scaleDraft` 175 → null, `onError(null)` ⓒ bridge: 끄는 동안 `setSettings` 0회, 놓을 때 정확히 1회 `{...SETTINGS, scale:1.75}`

### TC-121 · 같은 값·변경 없는 놓기 → 저장 없음 · 종류: 자동 · 요구: R-03 · 설계: general-tab.md §3.5 `commitScale`(draft null·draft === percent)
- Given `SETTINGS` · When 변경 없이 `pointerup` → 155 → 150 → `pointerup` · Then ⓐ 화면: `150%` ⓑ 상태: `scaleDraft` null ⓒ bridge: `setSettings` 0회

### TC-122 · 키보드 조작 300ms 뒤 1회 (가짜 시계) · 종류: 자동 · 요구: R-03 · 설계: general-tab.md §3.3 `SCALE_KEY_COMMIT_MS`, §3.5 `onScaleKeyUp`, §6 키보드
- Given 가짜 시계 · When 155 + `ArrowRight` → 299ms → 160 + `ArrowRight` → 299ms → 1ms → 165 + 키 `a` → 1000ms → `Home` → 300ms · Then ⓐ 화면: 해당 없음(저장 시점만 판정) ⓑ 상태: 타이머는 마지막 탐색 키 기준으로 다시 걸린다 ⓒ bridge: 두 번째 키 후 300ms에 1회 `{...SETTINGS, scale:1.6}`, `a`는 예약 없음, `Home` 후 300ms에 2회째 `{...SETTINGS, scale:1.65}` — 총 2회

### TC-123 · blur 즉시 저장·언마운트 시 예약 해제 (가짜 시계) · 종류: 자동 · 요구: R-03 · 설계: general-tab.md §3.5 `onScaleBlur`·(정리)
- Given 가짜 시계 · When 편집 없이 blur → 155 → blur → 170 + `ArrowUp` → 언마운트 → 1000ms · Then ⓐ 화면: 해당 없음 ⓑ 상태: 언마운트 때 예약 해제 ⓒ bridge: `setSettings` 정확히 1회 `{...SETTINGS, scale:1.55}`(편집 없는 blur·언마운트 뒤 예약은 저장 없음)

### TC-124 · 배율 저장 실패 · 종류: 자동 · 요구: R-03 · 설계: general-tab.md §3.5 `commitScale` 예외, G-2 오류
- Given reject `{ code:'settings.invalid', message:'설정값이 올바르지 않습니다: 배율 25%~200%' }` · When 175 → `pointerup` · Then ⓐ 화면: `150%`·`aria-valuetext 150%`(원래 저장값) ⓑ 상태: `onError(그 객체)`, `onError(null)` 없음 ⓒ bridge: `setSettings` 1회

### TC-125 · 외부 변경(Ctrl+휠) 수신·끄는 중 draft 우선 · 종류: 자동 · 요구: R-03 · 설계: general-tab.md §3.5 주(끌기 중 수신·5 배수 아닌 값), §3.4 `shownPercent`, design §6 P-4
- Given `SETTINGS` · When props `scale 1.03` → 175로 끄는 중 props `S08 = {...SETTINGS, scale:0.8, idleSeconds:600}` → `pointerup` · Then ⓐ 화면: `103%`·`aria-valuetext 103%`, 끄는 중 수신에도 `175%`, 저장 뒤 `80%` ⓑ 상태: `scaleDraft` 우선 → null ⓒ bridge: `setSettings` 1회 인자 `{...S08, scale:1.75}`(최신 settings 기준)

### TC-126 · 유휴 시간 표시 · 종류: 자동 · 요구: R-04 · 설계: general-tab.md §3.3 `idleSecondsToMinutes`·`IDLE_MIN/MAX_MINUTES`, §3.4 `shownIdle`·`idleInvalid`, §3.6 렌더 3, i18n.md §4.2 `idleLabel`·`idleUnit`·`idleDesc`
- Given `idleSeconds 120` · When 렌더 → props 90 → 30 → 300 · Then ⓐ 화면: `spinbutton` 이름 `유휴 시간` 값 `2`·`min 1`·`max 60`·`step 1`, 설명 `이 시간 동안 입력이 없으면 쉬는중 그림으로 바뀝니다(1~60분).`, 단위 `분`, `aria-invalid` 없음·`alert` 없음, 90 → `2`·30 → `1`·300 → `5` ⓑ 상태: `idleDraft` null ⓒ bridge: 호출 없음

### TC-127 · 타이핑 중 0회, Enter·blur에 분×60 저장 · 종류: 자동 · 요구: R-04 · 설계: general-tab.md §3.5 `onIdleInput`·`commitIdle`·`onIdleKeyDown`·`onIdleBlur`, G-3 · U-13
- Given `SETTINGS` · When `5` 입력 → Esc → Enter → props `S300` → `60` 입력 → blur → `5` 입력 → Enter → Enter → blur · Then ⓐ 화면: 타이핑 중 `5`, 저장 응답 뒤 `2`(수신 전), 재렌더 뒤 `5` ⓑ 상태: `onError(null)` ⓒ bridge: 1회차 `{...SETTINGS, idleSeconds:300}`, 2회차 `{...S300, idleSeconds:3600}` — 같은 값(5분 = 300)·편집 없는 Enter·blur는 저장 없음, 총 2회

### TC-128 · 범위 밖·빈 값·소수·음수 → 저장 안 함 · 종류: 자동 · 요구: R-04 · 설계: general-tab.md §3.3 `parseIdleMinutes`, §3.5 `commitIdle`(null 분기)·`onIdleInput`(invalid 해제), §3.6 렌더 3(`idleRangeHint` `role=alert`·`aria-invalid`), G-3 오류 · U-13
- Given `SETTINGS` · When `0`+Enter, `61`+blur, `''`+Enter, `1.5`+Enter, `-3`+blur → `3` 입력 · Then ⓐ 화면: 매번 `alert` = `1~60 사이의 정수(분)를 입력하세요. 저장되지 않았습니다.`, `aria-invalid="true"`, 입력 칸 `2`로 복귀. `3` 입력 뒤 안내·`aria-invalid` 사라짐 ⓑ 상태: `idleInvalid` true → false ⓒ bridge: `setSettings` 0회

### TC-129 · 유휴 시간 저장 실패 · 종류: 자동 · 요구: R-04 · 설계: general-tab.md §3.5 `commitIdle` 예외, G-3 오류
- Given reject `SAVE_ERR` · When `10` + Enter · Then ⓐ 화면: 입력 칸 `2`, 범위 안내 없음 ⓑ 상태: `onError(SAVE_ERR)` ⓒ bridge: 인자 `{...SETTINGS, idleSeconds:600}` 1회

### TC-130 · 기본 설정 탭 접근성·포커스 순서 · 종류: 자동 · 요구: R-19, R-20 ~ R-24 · 설계: general-tab.md §6, §3.2 id 목록 · **개정(CR-054 — 기대 개수·목록은 「CR-054 개정 TC」 표가 대체)**
- Given `GeneralTab` · When DOM의 `select, input, button` 순서를 읽는다 · Then ⓐ 화면: 순서 `language-select → scale-slider → idle-input → 「위치 초기화」 → lock-toggle → taskbar-toggle → autostart-toggle`, `tabindex` 없음, 모든 `button` `type="button"`, `switch` 3개, 안내 줄 `role=status` ⓑ 상태: 해당 없음(속성 검사) ⓒ bridge: 호출 없음
- 실제 Tab 이동·Enter/Space 토글·낭독은 수동 M-09·M-22

### TC-131 · generalValues 순수 모듈 · 종류: 자동 · 요구: R-03, R-04 · 설계: general-tab.md §3.3 전 행 · 스펙: `test/generalValues.test.ts`
- Given 모듈 · When 상수·함수 호출 · Then ⓐ 화면: 해당 없음 ⓑ 반환: `SCALE_STEP_PERCENT` 5·`SCALE_KEY_COMMIT_MS` 300·`IDLE_MIN/MAX_MINUTES` 1/60(= 60 ~ 3600초), `scaleToPercent` 1→100·1.5→150·0.25→25·1.03→103·0.8→80, `percentBounds()` = `{25,200}` = `SCALE_MIN/MAX`×100, `idleSecondsToMinutes` 300→5·120→2·90→2·30→1·0→1·3600→60, `parseIdleMinutes` `'5'`→5·`' 60 '`→60·`'1'`→1·`'007'`→7, `''`·`'   '`·`'0'`·`'61'`·`'1.5'`·`'-3'`·`'5분'`·`'1e1'` → null ⓒ bridge: 없음

#### 이미지 설정 탭 (`test/imageSlots.test.ts` · `test/ImagesTab.test.tsx`)

### TC-132 · SPECIAL_KEY_ORDER·findEntry·frameCount · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §3 표 1 ~ 3행 · 스펙: `test/imageSlots.test.ts`
- Given `KB3`(`kb_up`·`kb_down_0`·`kb_down_1`) · When 호출 · Then ⓐ 화면: 해당 없음 ⓑ 반환: 순서 `space, z, question, exclamation, enter, backspace, undo`, `findEntry(kb_down 1)` = `kb_down_1.png`(slotKey 비교), `pen_down 0` ≠ `kb_down_0`, `frameCount` 빈 0·KB3 2·index 0·2만 있으면 3 ⓒ bridge: 없음

### TC-133 · slotCard · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §3 `slotCard`, contract §3.1 `isRequiredSlot` · 스펙: `test/imageSlots.test.ts`
- Given `KB3`·빈 매니페스트 · When 단일·여러 장 카드 생성 · Then ⓐ 화면: 해당 없음 ⓑ 반환: `kb_up` required·canClear·`n` null, `kb_down_0`(frames 2) required·canClear false·lastOnlyBlocked true·`n` 1, `kb_down_1` 선택·canClear·`n` 2, 빈 `idle` canClear false·lastOnlyBlocked false, 빈 `kb_down_0` canClear false·lastOnlyBlocked false, `mouse_base` required, `pen_up` 선택 ⓒ bridge: 없음(필수 판정은 `isRequiredSlot` 실물)

### TC-134 · buildSlotGroups(빈 매니페스트) · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §3 `buildSlotGroups`·예 2 · U-6 · 스펙: `test/imageSlots.test.ts`
- Then ⓐ 화면: 해당 없음 ⓑ 반환: 그룹 `background, keyboard, arm, hand`, 키보드 11장(`kb_up, kb_down_0, idle, rest, key_*` 7), 팔 3장, 손 9장(`pen_up, pen_down_0, pen_key_*` 7), 총 24장 모두 `slot`(추가 카드 없음), `body` 없음, 필수 = `kb_up, kb_down_0, mouse_base`, `kb_down_0`·`pen_down_0`은 `msg` kb_down/pen_down·`n` 1 ⓒ bridge: 없음

### TC-135 · buildSlotGroups(여러 장·추가 카드·body 제외) · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §3 `buildSlotGroups`·예 1, D-8 · 스펙: `test/imageSlots.test.ts`
- Given `body` + `KB3` + `pen_up` + `pen_down_0` · Then ⓐ 화면: 해당 없음 ⓑ 반환: 키보드 13장 `kb_up, kb_down_0, kb_down_1, kb_down_2(add), idle, rest, key_*`, 추가 카드 = `{type:'add', slot:{kind:'kb_down',index:2}, key:'kb_down_2', msg:'addKbDown'}`, 손 그룹 `pen_up, pen_down_0, pen_down_1(add, addPenDown), pen_key_*`, `pen_down_0` canClear(마지막 장), `body` 카드 없음 ⓒ bridge: 없음

### TC-136 · 레이아웃·카드 순서·필수 배지·빈 미리보기 · 종류: 자동 · 요구: R-25, R-19, R-20 · 설계: images-tab.md §1, §6 렌더 `ImagesTab` 1 ~ 3·`ImageSlotCard` 1 ~ 4, i18n.md §4.3·§4.4 · U-6
- Given `EMPTY` · When `ImagesTab` 렌더 · Then ⓐ 화면: 안내 `PNG(32비트 RGBA)만 쓸 수 있습니다. 최대 900×700·1MB. …`, h2 `['배경','키보드 (본체)','팔 (마우스)','손 (펜)']`, 카드 `data-testid` 24개 순서(TC-134와 같음), h3 제목 24개(`배경, 기본, 타자 입력 1, 대기, 쉬는중, 스페이스, ㅋ·Z, ?, !, Enter, Backspace, Ctrl+Z, 팔 기본, 왼클릭, 오른클릭, 손 기본, 펜 입력 1, 손 스페이스 …`), 필수 3장 배지 `필수`·빈 문구 `필수 · 미등록`, 나머지 배지 `선택`·`등록된 그림 없음`, `img` 없음, `kb_up` 설명 표시, `slot-card-body`·추가 카드 없음 ⓑ 상태: `slotBusy` null·`cardError` null·`confirm` null ⓒ bridge: `pickPngFile`·`importAsset`·`removeAsset`·`setSettings` 호출 없음

### TC-137 · 등록된 카드 표시 · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §6 `ImageSlotCard` 4 ~ 5, §3 `canClear`
- Given `BASIC` · Then ⓐ 화면: `kb_up` 미리보기 `img` src `asset://kb_up.png`·`alt=""`·`draggable=false`·빈 문구 없음, 버튼 문구 `이미지 변경`/`기본값`·aria-label `기본 이미지 변경`/`기본 그림 지우기` 모두 활성, 빈 `idle` 「기본값」 비활성, `mouse_base` 미리보기, `body` 카드 없음 ⓑ 상태: `groups` = `buildSlotGroups(BASIC)` ⓒ bridge: 호출 없음

### TC-138 · 이미지 변경 — 대화상자 취소 · 종류: 자동 · 요구: R-25, R-20 · 설계: images-tab.md §5 `onChangeImage`(null 분기), I-1 오류 · U-7
- Given `pickPngFile` → null · When 「기본 이미지 변경」 · Then ⓐ 화면: 모든 「이미지 변경」 활성, `alert` 없음 ⓑ 상태: `slotBusy` null 유지 ⓒ bridge: `pickPngFile('PNG 이미지 선택')` 1회, `importAsset`·`setSettings` 호출 없음

### TC-139 · 이미지 변경 성공 · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §5 `onChangeImage`·주(slotBusy 전 대화상자), §4 `slotBusy`, I-1, contract §3.2 url 버전 · U-7
- Given `EMPTY`, `pickPngFile`·`importAsset` 미결 · When 클릭 → 대화상자 중 → 경로 선택 → 응답 → props `next`(url `…?v=2`) · Then ⓐ 화면: 대화상자 동안 다른 카드 버튼 활성, `importAsset` 진행 중 **모든** 카드 버튼 비활성(그 사이 다른 카드 클릭은 무시), 응답 뒤 활성, props 전 `kb_up` 미리보기 그대로(없음), 재렌더 뒤 `img` src `asset://kb_up.png?v=2` ⓑ 상태: `slotBusy` null → `kb_up` → null, `cardError` null ⓒ bridge: `importAsset('kb_up', PATH)` 1회, `pickPngFile` 1회, `setSettings`·`onError` 호출 없음

### TC-140 · 이미지 변경 실패 → 카드 오류 줄 · 종류: 자동 · 요구: R-25, R-20 · 설계: images-tab.md §5 `onChangeImage` 예외, §4 `cardError`, §6 `ImageSlotCard` 6, I-1 오류 · U-7
- Given `importAsset` 1회차 reject `TOO_LARGE`, 2회차 성공 · When `kb_up` 변경 → `idle` 변경 → `pickPngFile` reject `Error('dialog failed')`로 `rest` 변경 · Then ⓐ 화면: `kb_up` 카드에만 `alert` = `TOO_LARGE.message`(ko), `idle` 성공 뒤 `alert` 없음, `rest` 카드 `alert` = `dialog failed` ⓑ 상태: `cardError` kb_up → null → rest ⓒ bridge: `importAsset` 2회(2회차 `('idle', PATH)`), 대화상자 실패 때는 `importAsset` 없음, `onError`(창 오류 줄) 호출 없음

### TC-141 · 추가 카드 · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §5 주(추가 카드 = 다음 index), §6 `AddSlotCard`, I-2
- Given `BASIC` + `pen_up` + `pen_down_0` · When 「+ 타자 입력 그림 추가」 → 「+ 펜 입력 그림 추가」(reject `TOO_LARGE`) · Then ⓐ 화면: 추가 카드는 마지막 장 바로 뒤, `pen_down_1` 추가 카드 아래 `alert` = `TOO_LARGE.message` ⓑ 상태: `cardError.key` = `pen_down_1` ⓒ bridge: `importAsset({kind:'kb_down',index:2}, PATH)` → `importAsset({kind:'pen_down',index:1}, PATH)`, `setSettings` 없음

### TC-142 · 「기본값」 비활성 규칙 · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §3 `canClear`·`lastOnlyBlocked`, §6 `ImageSlotCard` 5(`title`), §8 · U-8
- Given `BASIC` · Then ⓐ 화면: 빈 `idle` 비활성·`title` 없음, `kb_down_0`(가운데 장) 비활성·`title` `마지막 장부터 지울 수 있습니다.`, `kb_down_1`·`kb_up` 활성·`title` 없음, 비활성 버튼 클릭 → 대화상자 없음 ⓑ 상태: `confirm` null ⓒ bridge: `removeAsset` 호출 없음

### TC-143 · 비우기 확인 → 지우기 · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §5 `onRequestClear`·`onConfirmClear`, §6 `ConfirmDialog` 1 ~ 3, §7 I-3·confirm 표, design §6 confirm 표 · U-8
- Given `BASIC`, `removeAsset` 미결 · When `타자 입력 2 그림 지우기` → 「지우기」 → 응답 · Then ⓐ 화면: `alertdialog`(`aria-modal="true"`, 이름 `그림 지우기`, 설명 `‘타자 입력 2’ 그림을 지울까요? 되돌릴 수 없습니다.`), 포커스 「취소」, 「지우기」 뒤 대화상자 닫힘·진행 중 모든 카드 버튼 비활성·응답 뒤 누른 버튼으로 포커스 ⓑ 상태: `confirm` 설정 → null, `slotBusy` kb_down_1 → null ⓒ bridge: 열 때 `removeAsset` 없음, 「지우기」 뒤 `removeAsset({kind:'kb_down',index:1})` 정확히 1회, `window.confirm` 호출 없음

### TC-144 · 취소·Esc·배경막 · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §5 `onCancelClear`, §6 `ConfirmDialog` 1(배경막 클릭 무반응)·4(Esc), I-3 오류
- Given `BASIC` · When 열기 → 「취소」 / 열기 → Esc / 열기 → 배경막 클릭 · Then ⓐ 화면: 앞 두 경우 닫히고 누른 「기본값」 버튼에 포커스, 배경막 클릭은 열린 채 ⓑ 상태: `confirm` null(앞 두 경우) ⓒ bridge: `removeAsset` 호출 없음

### TC-145 · 포커스 가둠 · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §6 `ConfirmDialog` 4, §8
- When 「취소」에서 Tab → 「지우기」에서 Tab → 「취소」에서 Shift+Tab · Then ⓐ 화면: 포커스 지우기 → 취소 → 지우기 ⓑ 상태: 대화상자 열린 채 ⓒ bridge: 없음

### TC-146 · 비우기 실패 · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §5 `onConfirmClear` 예외, I-3 오류
- Given reject `{ code:'asset.not_found', message:'등록되지 않은 슬롯입니다: kb_down_1' }` · Then ⓐ 화면: `kb_down_1` 카드 `alert` = 그 message, 버튼 다시 활성, 누른 버튼에 포커스 ⓑ 상태: `cardError.key` kb_down_1 ⓒ bridge: `removeAsset` 1회, `onError` 없음

### TC-147 · 필수 슬롯 비우기·카드가 먼저 사라지면 section 포커스 · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §5 주(D-1 필수도 비움)·`onConfirmClear`(isConnected 분기), §6 `ImagesTab` 1(`tabIndex=-1`), §7 I-3
- Given `BASIC` · When `kb_up` 비우기 → props에서 `kb_up` 제거 → `kb_down_1` 비우기(응답 미결) → props에서 `kb_down_1` 제거(이벤트가 응답보다 먼저) → 응답 · Then ⓐ 화면: `kb_up` 카드 `필수 · 미등록`·「기본값」 비활성, `slot-card-kb_down_1` 사라짐, 응답 뒤 포커스 = region `이미지 설정`(`tabindex="-1"`) ⓑ 상태: `slotBusy` null ⓒ bridge: `removeAsset('kb_up')` → `removeAsset({kind:'kb_down',index:1})`

### TC-148 · pen_up 첫 등록 → penPos 저장 · 종류: 자동 · 요구: R-25, R-18 · 설계: images-tab.md §5 `ensurePenPos`, I-4, contract §3.3 `penPos`, design §7 `resolvePenPos`
- Given `SETTINGS`(`penPos` null·`hand` (400,560)), `importAsset` → `WITH_PEN` · When 「손 기본 이미지 변경」 · Then ⓐ 화면: `setSettings`가 끝날 때까지 카드 버튼 비활성, 끝나면 활성 ⓑ 상태: 창 오류 없음 ⓒ bridge: `importAsset('pen_up', PATH)` 다음에 `setSettings` 정확히 1회 `{...SETTINGS, mouse:{...MOUSE, penPos:(350,520)}}`(100×80 중심 = hand). 저장 없음: `penPos` (10,20) 이미 있음 / `pen_down_0` 등록 / 결과에 `pen_up` 없음. `settings.mouse` null이면 `{...noMouse, mouse:{...DEFAULT_MOUSE_SETTINGS, penPos:(385,535)}}`(기본 이동 영역 중심 (435,575))
- 스펙: 두 `it`(정상 / 저장 안 하는 경우·mouse null)

### TC-149 · penPos 저장 실패 · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §5 `ensurePenPos` 예외, I-4 오류
- Given `importAsset` → `WITH_PEN`, `setSettings` reject `SAVE_ERR` · Then ⓐ 화면: 카드 `alert` 없음, 버튼 다시 활성 ⓑ 상태: `onError(SAVE_ERR)`(창 오류 줄) ⓒ bridge: `importAsset` 1회, `removeAsset` 없음(등록 유지)

### TC-150 · 이미지 설정 탭 ja · 종류: 자동 · 요구: R-20, R-25 · 설계: images-tab.md §6(문구 `useMessages`), §5 `pickPngFile(t.pickTitle)`·`cardTitle`, i18n.md §4.3·§4.4·§4.6
- Given `MessagesProvider language="ja"`, `BASIC`, `importAsset` reject `TOO_LARGE` · When 렌더 → `kb_up` 변경 → `kb_down_1` 「기본값」 · Then ⓐ 화면: region `ja.tabImages`, 안내 `format(ja.imagesNote,{w:900,h:700})`, h2 = ja 그룹 4개, h3 `ja.slots.kb_up.title`, 배지 `ja.badgeRequired`/`ja.badgeOptional`, 빈 문구 `ja.emptyOptional`, 버튼 aria-label `format(ja.changeImageAria,…)`·문구 `ja.changeImage`/`ja.clearImage`, 카드 `alert` = `ja.errors['asset.too_large']`(code 문구), 대화상자 이름 `ja.confirmClearTitle`·설명 `format(ja.confirmClearMessage,{name: format(ja.slots.kb_down.title,{n:2})})`·버튼 `ja.confirmCancel`(포커스)/`ja.confirmClearOk` ⓑ 상태: `useLanguage()` = ja ⓒ bridge: `pickPngFile(ja.pickTitle)`

### TC-151 · 이미지 설정 탭 접근성 · 종류: 자동 · 요구: R-25, R-19 · 설계: images-tab.md §8, §6 `ImageSlotCard` 1 ~ 5
- Given `BASIC` · Then ⓐ 화면: section `tabindex="-1"`, 카드 `article`(`aria-labelledby` = h3 id), 카드 안 버튼 순서 `이미지 변경 → 기본값`, 모든 버튼 `type="button"`·`tabindex` 없음, 모든 `img` `alt=""` ⓑ 상태: 해당 없음(속성 검사) ⓒ bridge: 호출 없음 — 진행 중 비활성은 TC-139·TC-143, 대화상자 역할은 TC-143·TC-152, 실제 낭독은 M-22

### TC-152 · ConfirmDialog 단독 · 종류: 자동 · 요구: R-25 · 설계: images-tab.md §2 `ConfirmDialog` props, §6 `ConfirmDialog` 1 ~ 4
- Given `title="제목"`·`message="본문"`·`confirmLabel="확인"`·`cancelLabel="닫기"` · When `open` false → true → 확인·닫기 클릭·Esc·배경막 클릭 · Then ⓐ 화면: `open` false면 DOM 없음, true면 `alertdialog` 이름 `제목`·설명 `본문`·`aria-modal="true"`·포커스 「닫기」, 버튼 `type="button"` ⓑ 상태: 제어 컴포넌트 ⓒ bridge: 없음 — `onConfirm` 1회, `onCancel` 2회(닫기·Esc), 배경막 클릭은 콜백 없음

#### CR-031 세로 메뉴·카드 통일 (증분 v9 — 신규 TC-153 ~ TC-158)

### TC-153 · 세로 메뉴 역할·속성·로빙 tabindex · 종류: 자동 · 요구: R-27 · 설계: §2 창 골격, §3 세로 메뉴 항목·섹션 제목·탭 패널, §4 `tab`, §9 CR-031 줄(역할·로빙 tabindex) · **신규(CR-031)**
- Given TC-031 상태
- When 마운트 → 「이미지 설정」 클릭 → 「어깨축·손 위치」 클릭
- Then ⓐ 화면: `tablist`는 `aside` 안·`aria-orientation="vertical"`, 항목 3개 모두 `button` 원소·`id` = `settings-tab-{general|images|mouse}`·`aria-controls` = `settings-panel-{같은 id}`. `tabpanel`은 늘 1개·`main` 안, `id` = `settings-panel-{선택 id}`, `aria-labelledby` = `settings-tab-{선택 id}`, 접근 이름 = 선택 탭 이름. `tabindex`는 선택 항목만 `0`·나머지 `-1`(세 시점 `['0','-1','-1']` → `['-1','0','-1']` → `['-1','-1','0']`) ⓑ 상태: `tab` general → images → mouse ⓒ bridge: `getSettings` 1회(재로드 없음), `setSettings` 호출 없음
- 선행: CR-031 화면 · 스펙: `test/SettingsApp.test.tsx`

### TC-154 · 메뉴 아이콘 aria-hidden·TabIcon 모양 · 종류: 자동 · 요구: R-27 · 설계: §2.1 `TabIcon` SVG 표, §3 `TabIcon`·세로 메뉴 항목, §9 아이콘 `aria-hidden` · **신규(CR-031)**
- Given TC-031 상태
- When 각 메뉴 항목의 svg를 본다 → `TabIcon`을 `name` 3종·`className="icon-x"`로 단독 렌더
- Then ⓐ 화면: 항목마다 `svg` 정확히 1개(`aria-hidden="true"`·`focusable="false"`), 항목 접근 이름 = 글자뿐(`기본 설정` 등), 사이드바에 `img` 없음(참고 제품 로고 없음). 단독 svg = `viewBox="0 0 24 24"`·`width="18"`·`height="18"`·`fill="none"`·`stroke="currentColor"`·`aria-hidden="true"`·`focusable="false"`·class에 `icon-x`, 자식 태그 general `[path, circle, circle]` · images `[rect, circle, path]` · mouse `[circle, path]` ⓑ 상태: 순수 렌더(상태 없음) ⓒ bridge: `setSettings` 호출 없음
- 스펙: `test/SettingsApp.test.tsx`(`TabIcon`은 `await import('../components/TabIcon')`)

### TC-155 · 섹션 제목 h1·오류 줄 위치 · 종류: 자동 · 요구: R-27, R-01 · 설계: §2 영역 표(오류 줄은 섹션 제목 아래), §3 섹션 제목·탭 패널(`TAB_KEY`), §5.3 렌더 골격 개정·탭 전환 · **신규(CR-031)**
- Given `getSettings` reject `{ code:'settings.io', message:'설정 파일을 읽지 못했습니다.' }`
- When 마운트 → 「이미지 설정」 → 「어깨축·손 위치」
- Then ⓐ 화면: 세 시점 모두 `h1` 1개 = 선택 탭 이름(`기본 설정` → `이미지 설정` → `어깨축·손 위치`, `kuro_keyviewer` 없음), `h1`은 `tabpanel` 첫 자식, `alert`(`오류: 설정 파일을 읽지 못했습니다.`)는 `h1` 바로 다음 형제, 탭 본문 region은 `tabpanel` 안·`alert`보다 뒤 ⓑ 상태: `error` = 그 BridgeError 유지(탭 전환은 `tab`만 교체), `tab` general → images → mouse ⓒ bridge: `getSettings` 1회(재시도 없음), `setSettings` 호출 없음
- 비고: 오류 없는 h1은 TC-031·TC-032·TC-099, ja·en h1은 TC-100·TC-101. h1·오류 줄이 Tab 포커스 대상이 아님은 M-26 · 스펙: `test/SettingsApp.test.tsx`

### TC-156 · 세로 탭 키보드(순환·Home·End·좌우 무반응·포커스 이동) · 종류: 자동 · 요구: R-27 · 설계: §5.3 `onTabKeyDown`, §4 `tabRefs`, §9 CR-031 줄 · **신규(CR-031)**
- Given TC-031 상태, 「기본 설정」 항목에 포커스
- When ArrowDown → ArrowDown → ArrowDown → ArrowUp → ArrowUp → Home → End → ArrowLeft → ArrowRight → `a`
- Then ⓐ 화면: 포커스·선택 항목 = 이미지 설정 → 어깨축·손 위치 → 기본 설정(끝에서 순환) → 어깨축·손 위치(처음에서 순환) → 이미지 설정 → 기본 설정 → 어깨축·손 위치. 매번 포커스 항목이 `aria-selected="true"`·`tabindex="0"`(자동 활성), `h1`·region이 같은 탭. 처리한 7키는 `keydown` 기본 동작 취소(`fireEvent.keyDown` 반환 false). ArrowLeft·ArrowRight·`a`는 반환 true(기본 동작 막지 않음)이고 선택·포커스·`h1`이 어깨축·손 위치 그대로 ⓑ 상태: `tab` images → mouse → general → mouse → images → general → mouse, 이후 불변 ⓒ bridge: `getSettings`·`getAssetManifest` 1회, `setSettings` 호출 없음
- 비고: Enter·Space(네이티브 클릭, 이미 선택된 항목이라 변화 없음)·실제 포커스 링은 M-26 · 스펙: `test/SettingsApp.test.tsx`

### TC-157 · 카드 제목·설명 `title` 속성(ko·ja·en) · 종류: 자동 · 요구: R-28, R-20 · 설계: images-tab.md §6 `ImageSlotCard` 2′·3′, §6.1 3개 국어 검산 · **신규(CR-031)**
- Given `BASIC`
- When Provider 없이(ko) → `language="ja"` → `language="en"`으로 각각 렌더
- Then ⓐ 화면: 모든 슬롯 카드(`article`)의 `h3` `title` = `h3` 글자(빈 문자열 아님), 설명 `p`(article 둘째 자식) `title` = 설명 글자(빈 문자열 아님). `kb_up` 카드는 `title` = `{언어}.slots.kb_up.title` · `{언어}.slots.kb_up.desc`. 추가 카드(`div`)는 대상 아님 ⓑ 상태: 렌더만(`slotBusy`·`cardError`·`confirm` null) ⓒ bridge: `pickPngFile`·`importAsset`·`removeAsset`·`setSettings` 호출 없음
- 비고: 말줄임 자체(1줄·2줄·「…」)는 jsdom이 레이아웃을 계산하지 않아 M-25 · 스펙: `test/ImagesTab.test.tsx` — **미작성**(아래 「CR-031 미완료」)

### TC-158 · 카드 오류 띠 위치·role=alert·title · 종류: 자동 · 요구: R-28, R-25 · 설계: images-tab.md §6 6′·`AddSlotCard`(CR-031), §6.1 `.cardError`·`.addError`, §7 I-1 오류 · **신규(CR-031)**
- Given `BASIC`, `importAsset` 1·2회차 reject `TOO_LARGE`, 세 번째 조작의 `pickPngFile` reject `Error('dialog failed')`
- When `kb_up` 「기본 이미지 변경」 → 활성 대기 → 추가 카드 「+ 타자 입력 그림 추가」(`kb_down_2`) → 활성 대기 → `idle` 「대기 이미지 변경」
- Then ⓐ 화면: ① `kb_up` 카드 `alert`는 `p`, 글자·`title` = `TOO_LARGE.message`, 부모 = 미리보기 `img`의 부모(미리보기 상자)이고 그 상자의 마지막 자식, 카드 직계 자식 수는 오류 전과 같은 4개, 카드 마지막 자식(버튼 줄)이 「기본 이미지 변경」을 포함(버튼 줄 아래 `p` 없음) ② `add-card-kb_down_2` 안 `alert` 글자·`title` = `TOO_LARGE.message` ③ `idle` 카드 `alert` = `dialog failed`, 부모 = 빈 문구 `등록된 그림 없음`의 부모(빈 미리보기 상자) ⓑ 상태: `cardError` kb_up → kb_down_2 → idle(한 번에 하나) ⓒ bridge: `importAsset` 정확히 2회 `('kb_up', PATH)` → `({kind:'kb_down',index:2}, PATH)`, 대화상자 실패 때 `importAsset` 없음, `onError`(창 오류 줄) 호출 없음
- 비고: 카드 높이 불변(280px)·띠 2줄 말줄임은 M-25 · 스펙: `test/ImagesTab.test.tsx` — **미작성**

#### CR-031 개정 — 앞 TC 본문 대체 (증분 v9, 이 절이 앞 TC 본문·문서 머리 줄보다 우선)

- 기준(v9): `src/settings/requirements.md` **v1.8**(R-19 폐기 → R-27·R-28) / `design.md` CR-031(§2·§2.1·§3·§4 `tabRefs`·§5.3 `onTabKeyDown`·렌더 골격 개정·§9·§11 D-4·RTM) / `design/images-tab.md` §1·§6(2′·3′·6′·`AddSlotCard`)·§6.1 / `design/general-tab.md` §2.2 / CR 대장 CR-031. bridge 계약 변경 없음.
- 수(v9): 자동 TC 번호 158개(TC-001 ~ TC-158) 중 유효 152 · 폐기 6, TC-FLOW 13개, 수동 26개(M-01 ~ M-26).
- R-19는 폐기 — 앞 TC의 「요구: R-19」(TC-094·TC-104 ~ TC-106·TC-130·TC-136·TC-151 등)는 R-27로 읽는다(탭 3개·카드형·초록 강조·토글·금지 조건 승계, 단언 불변).

| TC | 개정 내용(앞 본문 대체) | 스펙 |
|---|---|---|
| TC-031 | 요구 R-01·R-27·R-20. ⓐ 「`h1` 없음」·「`navigation` 이름 `설정 탭` 안 버튼」·「`aria-pressed`」 → `navigation` 없음, `tablist`(이름 `설정 탭`, `aria-orientation="vertical"`) 안 `tab` 3개(`type="button"`, `aria-pressed` 속성 없음), `aria-selected` `['true','false','false']`, `h1` 정확히 1개 = `기본 설정` | 반영 |
| TC-032 | 요구 R-01·R-27·R-26. ⓐ 「누른 탭만 `aria-pressed="true"`」 → 누른 항목만 `aria-selected="true"`·`tabindex="0"`, `h1` = 누른 탭 이름(어깨축·손 위치 → 이미지 설정 → 기본 설정). 도우미 `tabBtn()`·`tabTexts()`·`openMouseTab()`·`openImagesTab()`은 `tablist` 안 `tab` 역할 조회(옛 `navigation` 안 `button` 폐기) — TC-033 ~ TC-038·TC-076·TC-077·TC-FLOW-01 ~ 06·TC-FLOW-10 공통, 단언 문장 불변 | 반영 |
| TC-099 | 요구 R-27. ⓐ 「세 시점 모두 `h1` 없음」 → 세 시점 `h1` 정확히 1개 = 선택 탭 이름(제품명 아님), 「탭 버튼 3개」 → 메뉴 `tab` 3개, 추가: 사이드바 `aside`에 `searchbox`·`textbox`·`heading` 없음·글자는 탭 이름 3개뿐(배지·구분 그룹 제목 없음) | 반영 |
| TC-100 | ⓐ 「nav 이름 `ja.tabsAria`」 → `tablist` 이름 `ja.tabsAria`, 추가 `h1` = `ja.tabGeneral` | 반영 |
| TC-101 | 요구 R-20·R-27·R-26. ⓐ 포커스 대상 = 「기본 설정」 메뉴 항목(`tab`, `tabindex="0"`), 추가 en 수신 직후 `h1` = `en.tabGeneral` | 탭 조회는 도우미로 반영, **`h1` 단언 미반영** |
| TC-136 | 요구 R-25·R-27·R-28·R-20. 단언 불변 — 제목·설명 `title`은 TC-157, 오류 띠 위치는 TC-158로 분리 | 불변 |
| TC-140 · TC-141 · TC-146 | 「그 카드 아래 오류 한 줄」 → 「그 카드 안 오류 띠(슬롯 카드 = 미리보기 상자 안 아래, 추가 카드 = 버튼 아래 `p`)」. `within(card).getByRole('alert')` 단언은 그대로 성립 | 불변 |
| TC-151 | 요구 R-25·R-27·R-28. ⓐ 추가: 카드 직계 자식 정확히 4개 = 머리 줄(h3 포함) → 설명 `p`(`kb_up` 설명 글자) → 미리보기(`img` src `asset://kb_up.png`) → 버튼 줄(「이미지 변경」·「기본값」), 오류 없으면 `alert` 없음 | 반영 |
| TC-FLOW-01 (S-1 = R-01·R-27·R-28·R-25) | Steps 덧붙임(기존 Step 불변): TC-032(이미지 설정 부분)는 세로 메뉴 `tab` 클릭, 끝에 → M-25(카드 높이·격자 부분, 수동) | 도우미로 반영 |
| TC-FLOW-03 | `tabBtn(MOUSE_TAB)` 단언 `aria-pressed="true"` → `aria-selected="true"` | **미반영(1줄)** |
| TC-FLOW-10 (S-9 = R-20·R-27·R-28) | Steps 덧붙임: TC-101(수신·탭 문구 부분)은 세로 메뉴 `tab` 이름·클릭, 끝에 → M-25(ja·en 말줄임·툴팁 부분, 수동). 종류 자동+수동 | 도우미로 반영 |

CR-031 추적 — 요구 ↔ TC (「추적표」 절 CR-028 추적과 겹치면 이 표 우선)

| 요구ID | 상태 | 자동 TC | 수동 | TC-FLOW |
|---|---|---|---|---|
| R-19 | 폐기(CR-031 → R-27) | —(R-27로 이관) | — | — |
| R-27 | 유효(R-19 대체) | TC-031, TC-032, TC-094, TC-099, TC-100, TC-101, TC-104, TC-105, TC-106, TC-130, TC-136, TC-151, TC-153, TC-154, TC-155, TC-156 | M-01, M-23, M-26 | TC-FLOW-01, TC-FLOW-10 |
| R-28 | 유효 | TC-136, TC-151, TC-157, TC-158 | M-23, M-25 | TC-FLOW-01, TC-FLOW-10 |
| R-01 | 유효 | CR-028 행 + TC-155 | M-01, M-02 | TC-FLOW-01 |
| R-20 | 유효 | CR-028 행 + TC-157 | M-22, M-25, M-26 | TC-FLOW-10 |
| R-25 | 유효 | CR-028 행(TC-132 ~ TC-152) + TC-158 | M-23, M-24, M-25 | TC-FLOW-01 |
| 그 밖 유효 요구 | 유효 | CR-028 추적 그대로 | 같음 | 같음 |

CR-031 추적 — 설계 항목 ↔ TC

| 설계 항목 | TC |
|---|---|
| design §2 창 골격 ASCII·영역 표 「세로 메뉴 · 섹션 제목 · 오류 줄」 | TC-031, TC-099, TC-153, TC-155 / 시각 M-23, M-26 |
| design §2.1 치수·새 토큰·간격 체계 토큰·최소 창 검산 | M-23, M-25, M-26(jsdom 레이아웃 불가) |
| design §2.1 `TabIcon` SVG 표 / §3 `TabIcon` | TC-154 |
| design §3 세로 메뉴 항목 | TC-031, TC-032, TC-153, TC-154, TC-156 |
| design §3 섹션 제목·탭 패널(`TAB_KEY`) | TC-153, TC-155, TC-099, TC-100, TC-101 |
| design §3 옛 탭 버튼(폐기) | 부재 확인 TC-031(`navigation`·`aria-pressed` 없음) |
| design §4 `tab` / `tabRefs` | TC-031, TC-032, TC-156 / TC-156(포커스 이동) |
| design §5.3 탭 전환 / `onTabKeyDown` / 렌더 골격 개정 | TC-032 / TC-156 / TC-031, TC-153, TC-155 |
| design §9 CR-031 줄 — 역할·로빙 / 화살표·순환·Home·End·자동 활성·좌우 없음 / 아이콘 aria-hidden / Tab 순서 / 언어 전환 포커스 / 선택 굵기·색 | TC-153 / TC-156 / TC-154 / M-26 / TC-101 / M-23 |
| design §11 D-4 추가 토큰(`--st-nav-*`·`--st-gap-*`·`--st-card-*`·`--st-slot-card-h`) | M-23, M-25 |
| images-tab §1 격자(auto-fill·줄 280px·900폭 3칸·720폭 2칸) | M-25 |
| images-tab §6 2′·3′ / 6′ / `AddSlotCard`(CR-031) | TC-157, TC-151 / TC-158, TC-151 / TC-158, M-25 |
| images-tab §6.1 고정 치수·높이 합산·3개 국어 검산 | M-25 |
| general-tab §2.2(CR-031 간격 체계) | M-23 4)(구조 계약은 TC-106 불변) |

CR-031 추적 — 사용자행 ↔ TC-FLOW: S-1(R-01·R-27·R-28·R-25) → TC-FLOW-01(덧붙임 위 표) · S-9(R-20·R-27·R-28) → TC-FLOW-10(덧붙임 위 표) · 그 밖 행은 CR-028 표 그대로.

CR ↔ TC: CR-031 → 개정 TC-031, TC-032, TC-099, TC-100, TC-101, TC-151, TC-FLOW-01, TC-FLOW-03, TC-FLOW-10 / 요구 이관 R-19 → R-27 / 신규 TC-153 ~ TC-158 / 수동 M-23 개정, M-24 2) 문구, M-25·M-26 신설(M-01 h1 문장·M-09 Tab 순서 대체).

설계 확인 필요 (CR-031, 관리자 인계)

- H-1. 카드 오류 표시 위치 변경(버튼 아래 → 미리보기 안 띠)은 CR 대장 충돌 메모대로 **사용자 확인 권고** 상태다. TC-158·M-25가 이 설계를 고정하므로 바뀌면 둘을 같이 고친다.
- H-2. 스펙이 고정한 해석 — ① TC-155: 탭을 바꿔도 창 오류 줄 유지(§5.3 탭 전환은 `tab`만 교체) ② TC-151·TC-158: 카드 직계 자식 4개(버튼 줄 = 감싸는 원소 1개, §6.1 `.actions`) ③ TC-154: `className` prop이 svg 자체에 붙는다(§2.1 공통 svg `className`과 §3 「스타일은 부모가 `className`으로 줌」을 합친 해석) ④ TC-156: 처리 키만 `preventDefault` ⑤ TC-153: `tabpanel`은 선택 탭 1개만 렌더. 다르게 의도했다면 알려 달라.
- H-3. design §9 「Tab 순서: 선택 메뉴 항목 → 탭 본문 첫 조작 요소」는 jsdom이 Tab 이동을 하지 않아 M-26으로만 확인한다.
- H-4. design RTM R-27·R-28 「예정 TC」 → 이 번호(TC-153 ~ TC-158, M-25, M-26)로 동기화 필요 — ui-designer 몫.

CR-031 후속 처리(v9 후속, 2026-09-24) — **해소**

- 스펙: `test/ImagesTab.test.tsx` TC-157·TC-158 사례 작성, 머리 주석 갱신 / `test/SettingsApp.test.tsx` TC-FLOW-03 `aria-selected`·TC-101 `h1` 단언·머리 주석 반영. 위 표·TC 본문의 「미반영」·「**미작성**」 표기는 이것으로 해소(모두 반영됨)
- 문서: 머리 줄(v9 기준·범위·수)·「변경이력」 v9 행 기록. TC-031·TC-032·TC-099·TC-100·TC-101 본문 제자리 개정. TC-151 본문은 제자리 미수정 — 위 표 TC-151 행이 대체(추가 단언만, 모순 없음)

#### CR-033 펜 손 사용 토글·첫 등록 확인창 (증분 v10 — 이 절이 앞 TC 본문·문서 머리 줄·앞 추적표보다 우선)

- **기준(v10)**: `src/settings/requirements.md` **v1.9**(R-29·R-30 신설, S-13) / `design.md` 변경이력 CR-033 행·RTM R-29·R-30 / `design/images-tab.md` §9(9.1 ~ 9.7 — I-5 · I-5′ · I-6(옛 I-4 대체) · I-7, 결정 ① ~ ③, §9.6 리셋 개정) · §2 `ConfirmDialog` `tone` / `design/i18n.md` §4.3 CR-033 표(11행)·`pen_up` 설명 교체 / contract **v0.15** §3.3 `MouseSettings.penMode: boolean`(기본 `false`) / CR 대장 CR-033
- **범위·수(v10)**: 유효 요구 = v9 목록 + **R-29 · R-30**. 자동 TC 번호 **176개**(TC-001 ~ TC-176) 중 **유효 170 · 폐기 6** · TC-FLOW **14개**(TC-FLOW-14 신설) · 수동 **28개**(M-27 · M-28 신설)
- **스펙(v10)**: 신규 `test/PenMode.test.tsx`(TC-159 ~ TC-176 · TC-FLOW-14) / 개정 `test/ImagesTab.test.tsx`(TC-148 · TC-149 · 픽스처) · `test/MousePartsTab.test.tsx`(TC-025 사례 추가 · 키 목록 3곳 · 픽스처) · `test/i18n.test.ts`(TC-094) / 픽스처만 `test/mouseWizard.test.ts` · `test/SettingsApp.test.tsx`
- **공통 픽스처(v10)**: 모든 `MouseSettings` 리터럴에 `penMode: false`(`MOUSE`·`BASE`·`DEFAULT_MOUSE_EXPECTED`). `PenMode.test.tsx` — `ON` = `penMode: true`, `BASIC`(pen_up 없음 — body·kb_up·kb_down_0·mouse_base) · `WITH_PEN`(= BASIC + `pen_up` 100×80), `PEN_HOME` (350,520)(hand (400,560) 기준 `resolvePenPos`) · `PEN_DEFAULT_HOME` (385,535)(mouse null), `SAVE_ERR` = `{ code:'settings.io', message:'설정 파일을 읽거나 쓸 수 없습니다: 거부' }`. `setSettings` 기본 = 인자 그대로 resolve. 수신(`settings://changed`·`assets://changed`)은 props 재렌더로 흉내. 시간 의존 없음(가짜 시계 없음)
- **선행(공통)**: CR-033 화면(`PenModePanel`·`ConfirmDialog` `tone`·`isFirstPenUp`·`savePenMode`·`onTogglePenMode`·`onPenDialogConfirm/Cancel`·`onChangeImage` 개정·문구 11키) + bridge v0.15 소스(`penMode`·`DEFAULT_MOUSE_SETTINGS.penMode = false`). 미적용이면 import·타입 오류·`penMode` 부재로 **예정된 FAIL**(TDD Red) — 픽스처 `penMode`는 bridge 반영 전 tsc가 거부한다

개정 — 앞 TC 본문 대체

| TC | 개정 내용(앞 본문 대체) | 스펙 |
|---|---|---|
| TC-025 | 요구 R-17 + **R-29**(결정 ①). ⓒ 기대 `mouse` 키 **6개** `['area','hand','partPos','penMode','penPos','shoulder']`, `DEFAULT_MOUSE_EXPECTED.penMode = false`(= `MOUSE.penMode`). **사례 추가**: Given `{ ...SETTINGS, mouse: { ...MOUSE, penMode: true, penPos: (500,100) } }` · When 「기본값으로 리셋」 · Then ⓐ 화면: `alertdialog` 없음 ⓑ 상태: `onError(null)` 1회 ⓒ bridge: `setSettings` 1회, 인자 `toStrictEqual` `{ ...그 설정, mouse: { ...DEFAULT_MOUSE_EXPECTED, penMode: true } }`(`penPos` null — 위치류만 기본값) | 반영(`MousePartsTab.test.tsx` 「TC-025 (CR-033 결정 ①)」) |
| TC-027 | ⓒ `DEFAULT_MOUSE_EXPECTED`에 `penMode: false` 포함(mouse null → `DEFAULT_MOUSE_SETTINGS.penMode` 유지). 단언 문장 불변 | 픽스처로 반영 |
| TC-067 · TC-089 | ⓒ `mouse` 키 5개 → **6개**(`penMode` 추가). TC-089 제목 「키 5개」는 「키 6개」로 읽는다 | 반영(키 목록 replace) |
| TC-024 · TC-026 · TC-028 · TC-058 · TC-074 · TC-090 | 단언 불변(`{...MOUSE}`·`DEFAULT_MOUSE_EXPECTED` 펼침에 `penMode: false`가 실려 그대로 성립) | 픽스처로 반영 |
| TC-093 | 코드 불변 — 세 사전 키 집합 동일·빈 문자열 없음 검사가 새 11키를 자동 포함 | 불변 |
| TC-094 | ⓑ ko 단순 키 수 69 → **80**(이관 26 + CR-028 43 + CR-033 11), `pen_up` 설명 = `팔 끝에 붙는 펜 쥔 손. 「펜 손 사용」을 켜면 키 입력 때 바뀜`(제목 `손 기본` 불변). 11키 ko 정확 값은 TC-174 | 반영 |
| TC-148 | 제목 「pen_up **교체** 시 penPos 보충」. 요구 R-25·R-18. 설계 images-tab §9.4 `ensurePenPos`(「첫 등록이 아닌 교체에서만」). Given 호출 전 매니페스트 = `WITH_PEN`(이미 등록) · penPos null · `importAsset` → `WITH_PEN` · When 「손 기본 이미지 변경」 · Then ⓐ 화면: 확인창 없음, `setSettings` 끝날 때까지 카드 버튼 비활성 ⓑ 상태: 창 오류 없음 ⓒ bridge: `importAsset('pen_up', PATH)` 다음 `setSettings` 1회 `{...SETTINGS, mouse:{...MOUSE, penPos:(350,520)}}`(`penMode` false 그대로). 저장 없음·확인창 없음: 교체 + penPos (10,20) 있음 / `pen_down_0` 등록 / 결과에 `pen_up` 없음(호출 전 `BASIC`). mouse null + 교체 → `{...noMouse, mouse:{...DEFAULT_MOUSE_SETTINGS, penPos:(385,535)}}`. **첫 등록 경로는 TC-168 ~ TC-172로 이관**(옛 「BASIC → WITH_PEN이면 즉시 penPos 저장」 기대는 R-30과 충돌하므로 폐기) | 반영 |
| TC-149 | 제목 「(교체) penPos 저장 실패」. Given 호출 전 `WITH_PEN`. 단언 불변(`onError(SAVE_ERR)`·카드 `alert` 없음·`removeAsset` 없음). 첫 등록 저장 실패는 TC-171 | 반영 |
| TC-136 · TC-139 · TC-141 · TC-143 · TC-151 | 단언 불변. 손 그룹에 토글(`role="switch"` — `button` 역할 조회에 잡히지 않음)·안내 상자(`p` 2개)가 추가되지만 `cardButtons()`·h2·h3·`data-testid` 순서·`alert` 단언에 영향 없음. TC-141의 `pen_down_1` 추가는 `pen_up` 첫 등록이 아니라 확인창 없음 | 불변 |

신규 TC

### TC-159 · isFirstPenUp 4예 · 종류: 자동 · 요구: R-30 · 설계: images-tab §9.4 `isFirstPenUp`, 결정 ③ · **신규(CR-033)**
- Given `BASIC`(pen_up 없음) · `WITH_PEN` · `pen_down_0`만 더한 매니페스트 · `WITH_PEN`에서 `pen_up`을 뺀 매니페스트
- When `isFirstPenUp(slot, before, next)`
- Then ⓐ 화면: 해당 없음(순수 함수) ⓑ 반환: (`pen_up`, BASIC, WITH_PEN) true · (`pen_up`, WITH_PEN, WITH_PEN) false · (`pen_down_0`, BASIC, +pen_down_0) false · (`pen_down_0`, BASIC, WITH_PEN) false · (`pen_up`, 뺀 것, WITH_PEN) true(지운 뒤 재등록) · (`pen_up`, BASIC, BASIC) false · (`kb_up`, BASIC, WITH_PEN) false ⓒ bridge: 없음
- 스펙: `test/PenMode.test.tsx`

### TC-160 · pen_up 없음 → 토글 비활성·꺼짐 표시 · 종류: 자동 · 요구: R-29 · 설계: §9.3 `hasPenUp`·`penOn`(결정 ②), §9.4 `onTogglePenMode`(무시 조건), §9.2 `PenModePanel` `disabled` · **신규(CR-033)**
- Given `BASIC` + 저장값 `penMode: true`(`ON`) / `BASIC` + `SETTINGS` / 빈 매니페스트 + `ON`
- When 렌더 → 토글 클릭
- Then ⓐ 화면: 토글(`switch` 이름 `펜 손 사용`) `disabled`·`aria-checked="false"`(저장값 true여도), 설명 `「손 기본」 그림을 등록해야 켤 수 있습니다.`, 클릭 뒤 `alertdialog` 없음 ⓑ 상태: `penDialog` null, `penSaving` false ⓒ bridge: `setSettings` 호출 없음, `onError` 호출 없음

### TC-161 · pen_up 있음 → 활성·표시값·I-7 비우기 · 종류: 자동 · 요구: R-29 · 설계: §9.3 `penOn`, §9.5 I-7, 결정 ②, §9.4 (로컬 선반영 없음) · **신규(CR-033)**
- Given `WITH_PEN` + `SETTINGS`, `removeAsset` → `BASIC`
- When 렌더 → 수신 `ON` → 「손 기본 그림 지우기」 → 「지우기」 → 수신 `BASIC`(저장값 `ON` 그대로) → 수신 `WITH_PEN`·`ON`
- Then ⓐ 화면: 활성·`aria-checked` false → true → (비운 뒤) `disabled`·false → (다시 들어오면) true ⓑ 상태: 저장값 `penMode` true 불변(props 그대로) ⓒ bridge: `removeAsset('pen_up')` 1회, `setSettings` 호출 없음, `onError` 없음

### TC-162 · 안내 상자 항상 표시·위치 · 종류: 자동 · 요구: R-29 · 설계: §9.1 레이아웃, §9.2 `PenModePanel` 렌더(`#pen-mode-note`), images-tab §1 ASCII 손 그룹 두 줄, §9.7(포커스 대상 아님) · **신규(CR-033)**
- Given `BASIC`(비활성) → `WITH_PEN`·꺼짐 → `WITH_PEN`·켜짐
- When 세 상태로 재렌더
- Then ⓐ 화면: 세 상태 모두 `#pen-mode-note` 보임, 안의 `p` 2개 = `penModeNoteOn`·`penModeNoteOff` ko 문구 정확 일치, `tabindex`·버튼 없음. 문서 순서 = `mouse_right` 카드 → h2 `손 (펜)` → 토글 → 안내 상자 → `pen_up` 카드, 탭 전체 `switch` 1개·`#pen-mode-note` 1개 ⓑ 상태: 렌더만 ⓒ bridge: `setSettings` 호출 없음
- 수동: 상자 색·테두리·간격은 M-27

### TC-163 · 토글로 켜기(I-5 정상) · 종류: 자동 · 요구: R-29 · 설계: §9.4 `onTogglePenMode`·`onPenDialogConfirm`·`savePenMode`(size null → `penPos` 그대로), §9.3 `penDialog`('enable')·`penSaving`, §9.2 `ConfirmDialog` `tone="accent"`·렌더 개정(문구 선택), §9.5 I-5, §9.7 · **신규(CR-033)**
- Given `WITH_PEN` + `SETTINGS`(penMode false·penPos null), `setSettings` 미결
- When 토글 → 「켜기」 → (저장 중 토글 다시 클릭) → resolve → 수신 `ON`
- Then ⓐ 화면: `alertdialog`(`aria-modal`, 이름 `펜 손 사용 켜기`, 설명 `penEnableMessage` ko), 포커스 「취소」, 「켜기」 클래스에 `accent`(·`danger` 없음). 「켜기」 뒤 확인창 닫힘, 토글 `aria-busy="true"`·`disabled`·`aria-checked` false(선반영 없음), resolve 뒤 활성·`aria-busy` 없음·**포커스 토글**, 수신 뒤 `aria-checked` true ⓑ 상태: `penDialog` enable → null, `penSaving` true → false, `onError(null)` 1회 ⓒ bridge: 열 때 호출 없음, 「켜기」 뒤 `setSettings` 정확히 1회 `{...SETTINGS, mouse:{...MOUSE, penMode:true}}`(`penPos` null 그대로), 저장 중 클릭은 무시

### TC-164 · 켜기 확인창 취소·Esc·배경막 · 종류: 자동 · 요구: R-29 · 설계: §9.4 `onPenDialogCancel`('enable' → 호출 없음), §9.5 I-5 오류, §6 `ConfirmDialog` 1·4, §9.7 · **신규(CR-033)**
- Given `WITH_PEN` + `SETTINGS`
- When 토글 → 「취소」 / 토글 → Esc / 토글 → 배경막 클릭
- Then ⓐ 화면: 앞 두 경우 닫히고 포커스 토글·`aria-checked` false, 배경막 클릭은 열린 채 ⓑ 상태: `penDialog` null(앞 두 경우) ⓒ bridge: `setSettings`·`onError` 호출 없음

### TC-165 · 토글로 끄기(I-5′) · 종류: 자동 · 요구: R-29 · 설계: §9.4 `onTogglePenMode`(`penOn` → `savePenMode(false, null)`), §9.5 I-5′·confirm 표(끌 때 확인 없음) · **신규(CR-033)**
- Given `WITH_PEN` + `{...MOUSE, penMode:true, penPos:(10,20)}`
- When 토글 → 수신 `penMode:false`
- Then ⓐ 화면: `alertdialog` 없음, 수신 전 `aria-checked` true, 수신 뒤 false ⓑ 상태: `onError(null)` ⓒ bridge: `setSettings` 즉시 1회 `{...그 설정, mouse:{...MOUSE, penMode:false, penPos:(10,20)}}`

### TC-166 · 토글 저장 실패(끄기·켜기) · 종류: 자동 · 요구: R-29 · 설계: §9.4 `savePenMode` 예외, §9.5 I-5·I-5′ 오류 · **신규(CR-033)**
- Given `setSettings` reject `SAVE_ERR`; ① `WITH_PEN`+`ON` ② `WITH_PEN`+`SETTINGS`
- When ① 토글(끄기) ② 토글 → 「켜기」
- Then ⓐ 화면: 토글 다시 활성, `aria-checked` 원래 값(① true ② false), 카드 `alert` 없음 ⓑ 상태: `onError(SAVE_ERR)` 각 1회(창 오류 줄), `onError(null)` 없음 ⓒ bridge: `setSettings` 합계 2회, 재시도 없음

### TC-167 · 카드 등록 진행 중 토글 비활성 · 종류: 자동 · 요구: R-29 · 설계: §9.2 렌더 개정 `disabled={!hasPenUp || slotBusy !== null}`, §9.4 `onTogglePenMode` 무시 조건 · **신규(CR-033)**
- Given `WITH_PEN`, `importAsset` 미결
- When 「기본 이미지 변경」 → (진행 중) 토글 클릭 → resolve
- Then ⓐ 화면: 진행 중 토글 `disabled`·확인창 없음, 끝나면 활성 ⓑ 상태: `slotBusy` kb_up → null ⓒ bridge: `importAsset` 1회, `setSettings` 호출 없음

### TC-168 · pen_up 첫 등록 → 「예」(I-6 정상) · 종류: 자동 · 요구: R-30, R-29 · 설계: §9.4 `onChangeImage` 개정(`before` 비교·`ensurePenPos` 미호출)·`savePenMode`(size → `resolvePenPos`)·`onPenDialogConfirm`, §9.3 `penDialog`('first', size), §9.5 I-6, 순서 문단(대답 뒤 1회) · **신규(CR-033)**
- Given `BASIC` + `SETTINGS`, `importAsset` → `WITH_PEN`, `setSettings` 미결
- When 「손 기본 이미지 변경」 → 확인창 → (수신 `WITH_PEN`) → 「예」 → resolve → 수신 `{penMode:true, penPos:PEN_HOME}`
- Then ⓐ 화면: `alertdialog` 이름 `펜 손 모드`·설명 `penFirstMessage` ko, 포커스 「아니요」, 「예」 클래스 `accent`, 확인창 동안 카드 버튼 활성(slotBusy 해제)·카드 `alert` 없음, 「예」 뒤 닫힘, resolve 뒤 토글 활성·**포커스 토글**, 수신 뒤 `aria-checked` true ⓑ 상태: `penDialog` first(size 100×80) → null, `onError(null)` ⓒ bridge: `importAsset('pen_up', PATH)`, **대답 전 `setSettings` 0회**, 「예」 뒤 정확히 1회 `{...SETTINGS, mouse:{...MOUSE, penMode:true, penPos:(350,520)}}`, 호출 순서 import < set
- 비고: 수신이 대답보다 먼저라는 전제(토글이 비활성이면 포커스 이동 불가 — 설계 확인 필요 J-2)

### TC-169 · 첫 등록 「아니요」·Esc · 종류: 자동 · 요구: R-30 · 설계: §9.4 `onPenDialogCancel`('first' → `savePenMode(false, size)`), §9.5 I-6(아니요·Esc), §9.7 · **신규(CR-033)**
- Given `BASIC` + `SETTINGS`, `importAsset` → `WITH_PEN`
- When 첫 등록 → 「아니요」 / (새로 렌더) 첫 등록 → Esc
- Then ⓐ 화면: 확인창 닫힘, 포커스 토글 ⓑ 상태: `onError(null)` ⓒ bridge: 각각 `setSettings` 1회(합계 2회), 인자 둘 다 `{...SETTINGS, mouse:{...MOUSE, penMode:false, penPos:(350,520)}}`

### TC-170 · 첫 등록 penPos 규칙·재등록 · 종류: 자동 · 요구: R-30, R-29 · 설계: §9.4 `savePenMode`(`m.penPos === null`일 때만 계산)·`isFirstPenUp`, §9.3 `mouse`(파생 — null이면 `DEFAULT_MOUSE_SETTINGS`)·`penOn`, 결정 ②③, contract v0.15 `DEFAULT_MOUSE_SETTINGS.penMode = false` · **신규(CR-033)**
- Given ① `BASIC` + `{...MOUSE, penMode:true, penPos:(10,20)}`(지운 뒤 상태) ② `BASIC` + `mouse: null`
- When 각각 첫 등록 → 「예」
- Then ⓐ 화면: ① 등록 전 토글 `disabled`·`aria-checked` false, 첫 등록 확인창 다시 뜸(이름 `펜 손 모드`) ⓑ 상태: `onError(null)` ⓒ bridge: ① `{...그 설정, mouse:{...MOUSE, penMode:true, penPos:(10,20)}}`(penPos 유지) ② `{...noMouse, mouse:{...DEFAULT_MOUSE_SETTINGS, penMode:true, penPos:(385,535)}}`

### TC-171 · 첫 등록 저장 실패 · 종류: 자동 · 요구: R-30 · 설계: §9.4 `savePenMode` 예외, §9.5 I-6 오류(그림 등록 유지·penPos null 그대로) · **신규(CR-033)**
- Given `BASIC`, `importAsset` → `WITH_PEN`, `setSettings` reject `SAVE_ERR`
- When 첫 등록 → (수신 `WITH_PEN`) → 「예」
- Then ⓐ 화면: 카드 `alert` 없음, 확인창 없음, 토글 활성·`aria-checked` false ⓑ 상태: `onError(SAVE_ERR)` 정확히 1회 ⓒ bridge: `importAsset` 1회, `setSettings` 1회(재시도·`ensurePenPos` 추가 저장 없음), `removeAsset` 없음

### TC-172 · 대답 없이 창 닫기 → 저장 0회·다음은 교체 · 종류: 자동 · 요구: R-30 · 설계: §9.4 순서 문단(창을 닫으면 저장 없음, 다음 판정은 `pen_up`이 있으므로 묻지 않음)·`ensurePenPos` 불변 · **신규(CR-033)**
- Given `BASIC` + `SETTINGS`, `importAsset` → `WITH_PEN`
- When 첫 등록 → 확인창이 뜬 채 언마운트(창 닫기 흉내) → `WITH_PEN`으로 다시 렌더 → 「손 기본 이미지 변경」
- Then ⓐ 화면: 다시 연 뒤 확인창 없음 ⓑ 상태: 닫을 때 `penMode`·`penPos` 저장값 불변 ⓒ bridge: 닫을 때까지 `setSettings` 0회, 다시 연 뒤 교체에서 1회 `{...SETTINGS, mouse:{...MOUSE, penPos:(350,520)}}`(`penMode` false 그대로)
- 수동: 실제 창 닫기(X·트레이)는 M-27

### TC-173 · ConfirmDialog tone · 종류: 자동 · 요구: R-29, R-25 · 설계: images-tab §9.2 `ConfirmDialog` `tone?: 'danger' | 'accent'`(기본 danger), §6 `ConfirmDialog` 2·3·4 · **신규(CR-033)**
- Given `ConfirmDialog open title="제목" …` 을 `tone` 생략 / `'danger'` / `'accent'`로 단독 렌더, 그리고 `ImagesTab`(`WITH_PEN`)의 「손 기본」 비우기 확인창
- When 각각 렌더 → 확인 클릭 → Esc
- Then ⓐ 화면: 생략 = 확인 버튼 클래스에 `danger`(`accent` 없음), `'danger'` = 생략과 두 버튼 클래스 동일, `'accent'` = 확인 버튼 `accent`(`danger` 없음)·취소 버튼 클래스 불변, 셋 다 포커스 「닫기」. 비우기 확인창 「지우기」는 `danger` ⓑ 상태: 제어 컴포넌트 ⓒ bridge: `onConfirm` 3회·`onCancel` 3회, `removeAsset`·`setSettings` 호출 없음
- 수동: 실제 색(`--st-accent`·hover)은 M-27

### TC-174 · 펜 문구 11키·pen_up 설명 교체 · 종류: 자동 · 요구: R-29, R-30, R-20 · 설계: i18n.md §4.3 CR-033 표·주 · **신규(CR-033)**
- Given `i18n/ko`·`ja`·`en`
- When 사전을 읽는다
- Then ⓐ 화면: 해당 없음 ⓑ 값: ko `penModeLabel`·`penModeDesc`·`penModeNoteOn`·`penModeNoteOff`·`penEnableTitle`·`penEnableMessage`·`penEnableOk`·`penFirstTitle`·`penFirstMessage`·`penFirstYes`·`penFirstNo` = §4.3 ko 열 정확 일치, ja·en 같은 11키 문자열·비어 있지 않음(검수 필요라 리터럴 고정 안 함), `confirmCancel` `취소`, ko `slots.pen_up` = `{ title:'손 기본', desc:'팔 끝에 붙는 펜 쥔 손. 「펜 손 사용」을 켜면 키 입력 때 바뀜' }`, ja·en `pen_up` 설명에 옛 문구(「あるとキーボードは基本画像に固定」·「When set, the keyboard stays on the base image」) 없음 ⓒ bridge: 없음

### TC-175 · 펜 문구 3개 국어 UI · 종류: 자동 · 요구: R-29, R-30, R-20 · 설계: §9.2 렌더(`useMessages`), i18n.md §4.3 ja·en 열 · **신규(CR-033)**
- Given ① `language="ja"` + `WITH_PEN` ② `language="en"` + `BASIC`, `importAsset` → `WITH_PEN`
- When ① 렌더 → 토글 → Esc ② 「`format(en.changeImageAria, {name: en.slots.pen_up.title})`」 클릭
- Then ⓐ 화면: ① 토글 이름 `ja.penModeLabel`·설명 `ja.penModeDesc`, 안내 상자 `[ja.penModeNoteOn, ja.penModeNoteOff]`, 확인창 이름 `ja.penEnableTitle`·설명 `ja.penEnableMessage`·버튼 `ja.penEnableOk`/`ja.confirmCancel`(포커스) ② 확인창 이름 `en.penFirstTitle`·설명 `en.penFirstMessage`·버튼 `en.penFirstYes`/`en.penFirstNo`(포커스) ⓑ 상태: `useLanguage()` ja / en ⓒ bridge: ② `pickPngFile(en.pickTitle)`, 대답 전 `setSettings` 없음
- 수동: ja·en 검수·줄바꿈은 M-28

### TC-176 · 펜 토글 접근성·포커스 순서 · 종류: 자동 · 요구: R-29 · 설계: §9.7, §9.2 `ToggleSwitch` `id="pen-mode-toggle"` 재사용 · **신규(CR-033)**
- Given `WITH_PEN` + `ON` → `BASIC` + `ON`
- When 렌더 → 활성 버튼 DOM 순서를 본다 → pen_up 없는 매니페스트로 재렌더
- Then ⓐ 화면: 토글 = `button`·`role="switch"`·`id="pen-mode-toggle"`·`aria-checked="true"`·설명 `penModeDesc`·`aria-busy` 없음·`tabindex` 없음. 활성 버튼 순서에서 토글 바로 앞 = `오른클릭 이미지 변경`, 바로 뒤 = `손 기본 이미지 변경`. 비활성(`BASIC`)이면 순서에서 빠지고 `오른클릭 이미지 변경` 다음이 `손 기본 이미지 변경` ⓑ 상태: 속성 검사 ⓒ bridge: `setSettings` 호출 없음
- 수동: 실제 Tab 이동·낭독(스위치 상태·busy)은 M-27

CR-033 추적 — 요구 ↔ TC (앞 추적표와 겹치면 이 표 우선)

| 요구ID | 상태 | 자동 TC | 수동 | TC-FLOW |
|---|---|---|---|---|
| R-29 | 유효(신설) | TC-025(개정 사례), TC-160, TC-161, TC-162, TC-163, TC-164, TC-165, TC-166, TC-167, TC-168, TC-170, TC-173, TC-174, TC-175, TC-176 | M-27, M-28 | TC-FLOW-14 |
| R-30 | 유효(신설) | TC-159, TC-168, TC-169, TC-170, TC-171, TC-172, TC-174, TC-175 | M-27, M-28 | TC-FLOW-14 |
| R-25 | 유효 | CR-028·CR-031 행 + TC-148·TC-149(교체로 개정), TC-173 | 같음 | TC-FLOW-01 |
| R-17 | 유효 | 앞 행 + TC-025(penMode 유지 사례) | 같음 | TC-FLOW-04 |
| R-20 | 유효 | 앞 행 + TC-094(개정), TC-174, TC-175 | M-22, M-28 | TC-FLOW-10 |
| 그 밖 유효 요구 | 유효 | 앞 추적 그대로 | 같음 | 같음 |

CR-033 추적 — 설계 항목 ↔ TC

| 설계 항목 | TC |
|---|---|
| images-tab §1 ASCII 손 그룹 두 줄 / §9.1 레이아웃 | TC-162, TC-176 / 시각 M-27 |
| §9 결정 ① 리셋 penMode 유지 / ② pen_up 지워도 저장값 불변·토글 비활성 / ③ 재등록 = 첫 등록 | TC-025(개정 사례), TC-027 / TC-160, TC-161, TC-170 / TC-159, TC-170 |
| §9.2 `PenModePanel` props(`checked`·`disabled`·`busy`·`onToggle`) | TC-160, TC-161, TC-163, TC-167 |
| §9.2 `ToggleSwitch` 재사용(`id="pen-mode-toggle"`·label·description) | TC-160, TC-176 |
| §9.2 `ConfirmDialog` `tone`(기본 danger·accent 클래스) | TC-173, TC-163, TC-168 / 색 M-27 |
| §9.2 `PenModePanel` 렌더(`#pen-mode-note` 두 줄·항상 보임·CSS) | TC-162 / CSS 시각 M-27 |
| §9.2 `ImagesTab` 렌더 개정(패널 위치·두 번째 대화상자·`kind`별 문구) | TC-162, TC-163, TC-168, TC-175 |
| §9.3 `penDialog` / `penSaving` / `mouse`(파생) / `hasPenUp` / `penOn` | TC-163, TC-164, TC-168, TC-169 / TC-163, TC-166 / TC-170 / TC-160, TC-161 / TC-160, TC-161, TC-165 |
| §9.4 `isFirstPenUp` | TC-159 |
| §9.4 `onChangeImage` 개정(before 캡처·첫 등록이면 확인창·교체면 `ensurePenPos`) | TC-168, TC-172, TC-148(교체) |
| §9.4 `savePenMode`(1회 저장·`penPos` 규칙·`onError(null)`·예외) | TC-163, TC-165, TC-166, TC-168, TC-169, TC-170, TC-171 |
| §9.4 `onTogglePenMode`(무시 조건·끌 때 즉시·켤 때 확인창) | TC-160, TC-163, TC-165, TC-167 |
| §9.4 `onPenDialogConfirm` / `onPenDialogCancel`(포커스 토글 포함) | TC-163, TC-168 / TC-164, TC-169 |
| §9.4 `ensurePenPos` 불변(교체만) / 순서 문단(창 닫기) | TC-148, TC-149, TC-172 / TC-172 |
| §9.5 I-5 / I-5′ / I-6 / I-7 / confirm 표 | TC-163, TC-164, TC-166 / TC-165, TC-166 / TC-168 ~ TC-171 / TC-161 / TC-163, TC-165, TC-168 |
| §9.6 리셋 개정 식 | TC-025(개정 사례·키 6개), TC-027, TC-089 |
| §9.7 접근성(포커스 순서·switch·aria-checked·aria-describedby·aria-busy·확인창 규칙·포커스 복귀) | TC-176, TC-160, TC-163, TC-164, TC-168, TC-169 / 실물 M-27 |
| i18n §4.3 CR-033 11키 / `pen_up` 설명 교체 | TC-174, TC-175, TC-093, TC-094 / TC-094, TC-174 |
| contract v0.15 §3.3 `penMode`(기본 false) | 전 픽스처, TC-170 ②, TC-027 |

CR-033 추적 — 사용자행 ↔ TC-FLOW: **S-13**(R-29·R-30) → **TC-FLOW-14**(아래 TC-FLOW 절). 그 밖 행은 앞 표 그대로.

CR ↔ TC: CR-033 → 개정 TC-025(사례 추가), TC-027·TC-067·TC-089(키·픽스처), TC-094, TC-148, TC-149 / 픽스처 `mouseWizard.test.ts`·`SettingsApp.test.tsx`·`MousePartsTab.test.tsx`·`ImagesTab.test.tsx` / 신규 TC-159 ~ TC-176, TC-FLOW-14 / 수동 M-27·M-28 신설.

설계 확인 필요 (CR-033, 관리자 인계)

- **J-1. 문구 키 수 불일치.** `design/i18n.md` §4.3 주 「위 10키」·「`Messages` 단순 키 수 +10」, `design.md` 변경이력 CR-033 「문구 10키」 ↔ 표는 **11행**(`penModeLabel`·`penModeDesc`·`penModeNoteOn`·`penModeNoteOff`·`penEnableTitle`·`penEnableMessage`·`penEnableOk`·`penFirstTitle`·`penFirstMessage`·`penFirstYes`·`penFirstNo`). 스펙은 **표(11키, ko 단순 키 80개)**를 따랐다(TC-094·TC-174). 10이 맞다면 어느 키가 빠지는지 알려 달라 — ui-designer 몫.
- **J-2. 포커스 복귀 대상이 비활성일 수 있음.** `onPenDialogConfirm/Cancel`은 `#pen-mode-toggle`에 포커스를 주지만 ① 저장 중에는 `ToggleSwitch`가 `disabled={disabled || busy}`라 포커스된 토글이 곧 비활성이 된다(HTML focus fixup 규칙상 실물 WebView2에서 포커스가 body로 빠질 수 있음 — jsdom은 유지) ② 첫 등록에서 `assets://changed`보다 먼저 대답하면 `hasPenUp` false라 토글이 비활성이어서 `focus()`가 무효다. 스펙은 「수신이 대답보다 먼저」를 전제하고 저장 완료 뒤 포커스를 단언한다(TC-163·TC-168). 실물은 M-27 3)에서 확인. 대체 대상(예: `pen_up` 카드 「이미지 변경」) 규칙이 필요한지 결정 필요.
- **J-3. 스펙이 고정한 해석.** ① TC-163·TC-173: `tone` 판정 = 확인 버튼 클래스 이름에 `accent`/`danger` 포함(CSS Modules 클래스 이름 규약, 색 실물은 M-27) ② TC-161: `pen_up`이 props로만(외부 등록) 다시 들어오면 확인창 없이 저장값대로 켜짐 표시 — 첫 등록 판정은 `onChangeImage`에서만 ③ TC-172: 창 닫기 = 언마운트로 흉내 ④ TC-176: 포커스 순서 = DOM 순서 ⑤ TC-168: 첫 등록 확인창이 떠 있는 동안 `slotBusy`는 해제(카드 버튼 활성 — 배경막이 가림). 다르게 의도했다면 알려 달라.
- **J-4. design RTM R-29·R-30 「예정 TC」 동기화**(이 번호 TC-159 ~ TC-176·TC-FLOW-14·M-27·M-28, 개정 TC-025·TC-094·TC-148·TC-149) — ui-designer 몫. `design/images-tab.md` 머리 계약 줄(v0.14)·§7 I-4 행은 §9가 대체한다고만 적혀 있어 v0.15·I-6 참조로 정리 권고.

---

### CR-035 개정 (v11 — 기본 이미지 세트 R-31 · 「기본값」 = 복원/비우기 R-32 · 기본 이미지 다운로드 R-33, 증분 모드)

- **CR-035 기준(v11, 이 절이 머리의 모든 기준 줄과 앞 CR 절보다 우선)**: `src/settings/requirements.md` **v1.10**(R-31 ~ R-33 신설, R-25 「기본값 = 슬롯 비우기」 문장·D-1 폐기) · `design.md`(RTM R-31 ~ R-33) · `design/images-tab.md` §1 ~ §8·§10 · `design/i18n.md` §4.6(에러 code 22개)·§4.7(단순 키 +12) · `doc/200_설계/bridge/contract.md` **v0.16**(`restoreDefaultAsset(slot)` · `exportDefaultAssets(dir, overwrite)` · `ExportReport { written, conflicts, failed }` · `ExportFailure { fileName, code }` · `pickFolder(title?)` · `DEFAULT_ASSET_SLOTS`(15) · `hasBuiltinDefault(slot)` · 에러 `asset.no_default`·`asset.export_dir` · `DEFAULT_MOUSE_SETTINGS.penPos = {x:380, y:496}`) · 사용자 결정 U-1 = B(복원만, 2단추) · U-2 = B(penPos 기본 (380,496)) · U-5 = A(충돌 시 확인 후 전부 덮어쓰기) · U-7(빈 `pen_up` 복원 → R-30 확인창)
- **범위·수(v11)**: 유효 요구 R-01 · R-03 · R-04 · R-10 · R-11 · R-12 · R-15 ~ R-18 · R-20 ~ R-33(R-19 폐기 → R-27). 자동 TC 번호 191개(TC-001 ~ TC-191) 중 **유효 185 · 폐기 6** · TC-FLOW 17개(TC-FLOW-01 ~ TC-FLOW-17) · 수동 31개(M-01 ~ M-31)
- **mock·시간 규약(v11)**: `bridge/commands` mock에 `restoreDefaultAsset`·`exportDefaultAssets`·`pickFolder` 추가(`ImagesTab.test.tsx`·`SettingsApp.test.tsx`). `bridge/types`의 `DEFAULT_ASSET_SLOTS`·`hasBuiltinDefault`·`DEFAULT_MOUSE_SETTINGS`는 실물. 시간 의존 동작 없음 — 대기는 deferred promise + `waitFor` 조건(실제 sleep·가짜 시계 없음)
- **스펙 파일(v11)**: `test/imageSlots.test.ts`(TC-133·TC-135 개정, TC-177·TC-178) · `test/ImagesTab.test.tsx`(개정 TC-137·TC-142 ~ TC-148·TC-150·TC-151·TC-157(import만), 신규 TC-179 ~ TC-191·TC-FLOW-15 ~ TC-FLOW-17, 도우미 `cardButtons` = 카드 안 버튼만) · `test/PenMode.test.tsx`(TC-161·TC-170·TC-173) · `test/SettingsApp.test.tsx`(`DEFAULT_MOUSE_EXPECTED.penPos`·mock·TC-FLOW-01) · `test/MousePartsTab.test.tsx`(`DEFAULT_MOUSE_EXPECTED.penPos`·TC-025(CR-033 사례)·TC-027·TC-089·TC-090·TC-FLOW-07) · `test/i18n.test.ts`(TC-093 code 22개·TC-094 단순 키 92개) · 화면 밖 1곳 `src/overlay/test/mouseMapping.test.ts` TC-025(`DEFAULT_MOUSE_SETTINGS.penPos` 기대)
- 헬퍼 이름: `restoreBtn(key, name)` = 이름 「{name} 기본 그림으로 되돌리기」(`restoreImageAria`), `clearBtn(key, name)` = 「{name} 그림 지우기」(`clearImageAria`), `downloadBtn()` = 「기본 이미지 다운로드」, `resultLine()` = `p[data-tone]`(결과 줄). 픽스처 `BASIC`(`body`·`kb_up`·`kb_down_0`·`kb_down_1`·`mouse_base`), `DEF_PEN_UP`(`pen_up` 90×154), `DIR` = `D:\trace`, `DONE15` = `{written: 15개, conflicts: [], failed: []}`

#### CR-035 개정 TC (앞 본문을 대체 — 번호·제목 유지)

### TC-133 · slotCard · 종류: 자동 · 요구: R-25, **R-32** · 설계: images-tab §3 `slotCard`(CR-035 개정)·`ResetKind`, contract v0.16 `hasBuiltinDefault`·§3.1 `isRequiredSlot` · 스펙: `test/imageSlots.test.ts` · **개정(CR-035)**
- Given `KB3`(`kb_up`·`kb_down_0`·`kb_down_1`)·빈 매니페스트 · When 단일·여러 장 카드 생성
- Then ⓐ 화면: 해당 없음 ⓑ 반환: `kb_up` required·`resetKind` restore·`canReset` true·`lastOnlyBlocked` false·`n` null·`canClear` 키 없음, `kb_down_0`(frames 2) required·restore·`canReset` **true**·`lastOnlyBlocked` **false**(옛 false/true 대체)·`n` 1, `kb_down_1` 선택·clear·`canReset` true·`n` 2, 빈 `idle` restore·`canReset` **true**, 빈 `kb_down_0`(frames 0) restore·`canReset` true, `mouse_base` required, `pen_up` 선택 ⓒ bridge: 없음(`isRequiredSlot`·`hasBuiltinDefault` 실물)

### TC-135 · buildSlotGroups(여러 장) · 종류: 자동 · 요구: R-25, **R-32** · 설계: images-tab §3 `buildSlotGroups`·예 1(CR-035 주) · 스펙: `test/imageSlots.test.ts` · **개정(CR-035 — 필드 이름만)**
- Given `body` + `KB3` + `pen_up` + `pen_down_0` · Then ⓐ 해당 없음 ⓑ 반환: 카드 수·순서·추가 카드 불변(키보드 13장), `kb_up` restore·canReset, `kb_down_0` restore·canReset true·lastOnlyBlocked false, `kb_down_1` clear·canReset true, `pen_down_0` restore·canReset true ⓒ bridge: 없음

### TC-137 · 등록된 카드 표시·「기본값」 aria-label 분기 · 종류: 자동 · 요구: R-25, **R-32** · 설계: images-tab §6 `ImageSlotCard` 4·5(CR-035 개정 — `resetKind`로 aria-label), §3 `canReset`, §8(CR-035 줄) · **개정(CR-035)**
- Given `BASIC` · When 렌더
- Then ⓐ 화면: `kb_up` 미리보기 `img` src `asset://kb_up.png`·`alt=""`·`draggable=false`·빈 문구 없음, 버튼 문구 `이미지 변경`/`기본값`, `kb_up` 「기본값」 이름 `기본 기본 그림으로 되돌리기`(「기본 그림 지우기」 없음)·활성, 빈 `idle` 「기본값」 이름 `대기 기본 그림으로 되돌리기`·**활성**·글자 `기본값`, `kb_down_1` 이름 `타자 입력 2 그림 지우기`·글자 `기본값`·활성, 빈 `mouse_left` `왼클릭 그림 지우기` 비활성, `mouse_base` 미리보기, `body` 카드 없음 ⓑ 상태: `groups` = `buildSlotGroups(BASIC)` ⓒ bridge: 호출 없음

### TC-142 · 「기본값」 활성 규칙(복원 칸·비우기 칸) · 종류: 자동 · 요구: R-25, **R-32** · 설계: images-tab §3 `slotCard`(CR-035)·`lastOnlyBlocked`, §6 `ImageSlotCard` 5 개정(`title`은 복원 칸 늘 없음), §8, §10.2 표 · U-8 · **개정(CR-035)**
- Given `BASIC` + `kb_down_2` · When 렌더 → 비활성 「기본값」 2개 클릭
- Then ⓐ 화면: 비우기 칸 — `kb_down_1`(가운데 장) 비활성·`title` `마지막 장부터 지울 수 있습니다.`, `kb_down_2`(마지막 장) 활성·`title` 없음, 빈 `mouse_left`·`pen_key_space` 비활성·`title` 없음 / 복원 칸 — `kb_down_0`(가운데여도) 활성·`title` 없음, 빈 `idle` 활성, `kb_up` 활성. 비활성 버튼 클릭 → 대화상자 없음 ⓑ 상태: `confirm` null ⓒ bridge: `removeAsset`·`restoreDefaultAsset` 호출 없음

### TC-143 · 비우기 칸 확인 → 지우기 · 종류: 자동 · 요구: R-25, **R-32** · 설계: images-tab §5 `onRequestReset`·`onConfirmReset`·`onConfirmClear`, §6 4′ 표(`'clear'` 행)·`ConfirmDialog` 1 ~ 3, §7 I-3(내장 기본 없는 칸만)·confirm 표 · U-8 · **개정(CR-035)**
- Given `BASIC`, `removeAsset` 미결 · When `타자 입력 2 그림 지우기` → 「지우기」 → 응답
- Then ⓐ 화면: `alertdialog`(`aria-modal="true"`, 이름 `그림 지우기`, 설명 `‘타자 입력 2’ 그림을 지울까요? 되돌릴 수 없습니다.`), 포커스 「취소」, 「지우기」 뒤 닫힘·진행 중 모든 카드 버튼 비활성·응답 뒤 누른 버튼 포커스 ⓑ 상태: `confirm`(resetKind clear) → null, `slotBusy` kb_down_1 → null ⓒ bridge: 열 때 호출 없음, 「지우기」 뒤 `removeAsset({kind:'kb_down',index:1})` 정확히 1회, `restoreDefaultAsset` 0회, `window.confirm` 0회

### TC-144 · 취소·Esc·배경막(복원·비우기 공용) · 종류: 자동 · 요구: R-25, **R-32** · 설계: images-tab §5 `onCancelReset`, §6 `ConfirmDialog` 1·4, §7 I-3·I-3R 오류 열 · **개정(CR-035)**
- Given `BASIC` · When `kb_up` 복원 확인창 → 「취소」 / 다시 → Esc / `kb_down_1` 비우기 확인창 → Esc / `kb_up` 복원 확인창 → 배경막 클릭
- Then ⓐ 화면: 복원 확인창 이름 `기본 그림으로 되돌리기`, 앞 세 경우 닫히고 누른 「기본값」에 포커스, 배경막 클릭은 열린 채 ⓑ 상태: `confirm` null(앞 세 경우) ⓒ bridge: `removeAsset`·`restoreDefaultAsset` 호출 없음

### TC-145 · 포커스 가둠(대상 칸 교체) · 종류: 자동 · 요구: R-25, R-32 · 설계: images-tab §6 `ConfirmDialog` 4, §8 · **개정(CR-035 — `kb_up`이 복원 칸이 되어 비우기 확인창 대상을 `kb_down_1`로)**
- When 비우기 확인창(`kb_down_1`)에서 Tab·Tab·Shift+Tab → Esc → 복원 확인창(`kb_up`)에서 Tab·Tab · Then ⓐ 화면: 지우기 → 취소 → 지우기 / 기본 그림으로 → 취소 ⓑ 상태: 대화상자 열린 채(Esc 전) ⓒ bridge: 없음

### TC-146 · 비우기 실패 · 종류: 자동 · 요구: R-25 · 설계: images-tab §5 `onConfirmClear` 예외, I-3 오류 · **개정(CR-035 — 단언 추가만)**
- Given reject `{ code:'asset.not_found', message:'등록되지 않은 슬롯입니다: kb_down_1' }` · Then ⓐ 화면: `kb_down_1` 카드 `alert` = 그 message, 버튼 다시 활성, 누른 버튼 포커스 ⓑ 상태: `cardError.key` kb_down_1 ⓒ bridge: `removeAsset` 1회, `restoreDefaultAsset` 0회, `onError` 없음

### TC-147 · 필수 칸은 복원만·비우기 중 카드가 먼저 사라지면 section 포커스 · 종류: 자동 · 요구: R-25, **R-32** · 설계: images-tab §5 주(CR-035 — D-1 폐기)·`onConfirmRestore`·`onConfirmClear`(isConnected 분기), §6 `ImagesTab` 1(`tabIndex=-1`), §7 I-3·I-3R · **개정(CR-035 — 옛 「필수 슬롯도 비울 수 있다」 폐기)**
- Given `kb_up`이 비어 있는 `BASIC`(기존 설치), `restoreDefaultAsset` → `BASIC`, `removeAsset` 미결 · When `kb_up` 「기본값」 → 「기본 그림으로」 → props `BASIC` → `kb_down_1` 비우기 → props에서 `kb_down_1` 제거(이벤트가 응답보다 먼저) → 응답
- Then ⓐ 화면: 처음 `kb_up` `필수 · 미등록`인데 「기본값」(`기본 기본 그림으로 되돌리기`) **활성**·비우기 이름 없음, 복원 뒤 `img` `asset://kb_up.png`·`필수 · 미등록` 없음, `kb_down_0`·`mouse_base` 「기본값」 활성, `slot-card-kb_down_1` 사라짐, 응답 뒤 포커스 = region `이미지 설정`(`tabindex="-1"`) ⓑ 상태: `slotBusy` null ⓒ bridge: `restoreDefaultAsset('kb_up')` 1회, `removeAsset`은 `{kind:'kb_down',index:1}` 1회뿐(`'kb_up'` 없음)

### TC-151 · 이미지 설정 탭 접근성 · 종류: 자동 · 요구: R-25, R-27, R-28, **R-33** · 설계: images-tab §8(CR-035 줄), §10.8, §6 `ImageSlotCard` 1 ~ 5 · **개정(CR-035)**
- Given `BASIC` · Then ⓐ 화면: CR-031 단언 그대로(카드 `article`·자식 4개·버튼 `이미지 변경 → 기본값`) + region 안 첫 버튼 = `기본 이미지 다운로드`(`aria-describedby="download-defaults-desc"`), region 안 **모든** 버튼 `type="button"`·`tabindex` 없음, 모든 `img` `alt=""` ⓑ 상태: 속성 검사 ⓒ bridge: 호출 없음

| 개정 TC | Given / When | Then ⓐ 화면 · ⓑ 상태 · ⓒ bridge | 스펙 |
|---|---|---|---|
| TC-148(둘째 `it`) | `settings.mouse` null + `WITH_PEN`(교체) | ⓐ 확인창 없음·버튼 다시 활성 ⓑ `DEFAULT_MOUSE_SETTINGS.penPos` = (380,496)이 non-null → `ensurePenPos` 끝 ⓒ `importAsset` 1회, **`setSettings` 0회**(옛 기대 `penPos:(385,535)` 저장 대체) | `ImagesTab.test.tsx` |
| TC-150 | ja, `BASIC` | ⓐ `kb_up` 「기본값」 이름 = `format(ja.restoreImageAria,{name})`(옛 `clearImageAria` 대체), 글자 `ja.clearImage`, 나머지 불변 ⓑ `useLanguage()` ja ⓒ `pickPngFile(ja.pickTitle)` | 같음 |
| TC-157 | 불변 | 단언 불변(ko·en 사전 정적 import로 교체) | 같음 |
| TC-161 | `WITH_PEN` + `ON` → props `BASIC`(외부에서 `pen_up` 사라짐) | ⓐ `pen_up` 「기본값」 = `손 기본 기본 그림으로 되돌리기` 활성·비우기 이름 없음, 토글 비활성·`aria-checked="false"` → 다시 들어오면 true ⓑ `penMode` 저장값 true 그대로 ⓒ `removeAsset`·`setSettings` 0회 | `PenMode.test.tsx` |
| TC-170(mouse null 사례) | `settings.mouse` null, 첫 등록 「예」 | ⓐ 확인창 닫힘 ⓑ `penPos` = 기본값 (380,496)(non-null이라 계산 없음) ⓒ `setSettings` 1회 `{...noMouse, mouse:{...DEFAULT_MOUSE_SETTINGS, penMode:true, penPos:(380,496)}}`(옛 (385,535) 대체) | 같음 |
| TC-173 | `pen_up` 「기본값」 | ⓐ 복원 확인창 확인 버튼 `기본 그림으로` 클래스 `danger` ⓑ 확인창 열림 ⓒ `removeAsset`·`setSettings` 0회 | 같음 |
| TC-025(두 사례)·TC-027 | 「기본값으로 리셋」(mouse 있음·penMode true·mouse null) | ⓐ 불변 ⓑ 기대 `DEFAULT_MOUSE_EXPECTED.penPos` = **(380,496)** ⓒ `setSettings` 인자 `mouse.penPos` = (380,496)(CR-033 사례의 `toBeNull` 대체) | `MousePartsTab.test.tsx`·`SettingsApp.test.tsx` 픽스처 |
| TC-089 | `penPos` (500,100) → 리셋 → 수신 | ⓐ 수신 뒤 펜 손·「손 위치」 = (380,496)(옛 기본 위치 규칙 (385,535) 아님) ⓑ 키 6개 ⓒ 인자 `penPos` (380,496)(옛 null 대체) | `MousePartsTab.test.tsx` |
| TC-090 | `settings.mouse` null, 펜 손 (200,280) → (250,300) 끌기 | ⓐ 처음 (380,496), 끌면 (480,536)(grab (20,64)), 팔 파츠 (389,492) 불변 ⓑ — ⓒ `setSettings` 1회 `{...nullMouse, mouse:{...DEFAULT, penPos:(480,536)}}` | 같음 |
| TC-FLOW-07 | 리셋 부분 | ⓐ 수신 뒤 펜 손 (380,496) ⓑ — ⓒ 2번째 `setSettings` 인자 불변(픽스처가 (380,496)) | 같음 |
| TC-093·TC-094 | 사전 | ⓑ `ERROR_CODES` 22개(`asset.manifest` 뒤 `asset.no_default`·`asset.export_dir`), ko 단순 키 92개(80 + 12) ⓐ·ⓒ 해당 없음 | `i18n.test.ts` |
| overlay TC-025 | `DEFAULT_MOUSE_SETTINGS` | ⓑ `penPos` = `{x:380, y:496}`(옛 null) ⓐ·ⓒ 해당 없음 | `src/overlay/test/mouseMapping.test.ts` |

#### CR-035 신규 TC

### TC-177 · slotCard 검증 예 4건 · 종류: 자동 · 요구: R-32 · 설계: images-tab §3 CR-035 검증 예 4건, contract v0.16 `hasBuiltinDefault` · 스펙: `test/imageSlots.test.ts` · **신규(CR-035)**
- Given ① 빈 매니페스트 ② `kb_down_0`·`kb_down_1`만 ③ `kb_down_0 ~ 2` ④ 빈 매니페스트 · When `slotCard`/`buildSlotGroups`
- Then ⓐ 해당 없음 ⓑ ① `background` restore·canReset true·lastOnlyBlocked false, `mouse_left` clear·canReset false ② `kb_down_0` restore·true·false, `kb_down_1` clear·true ③ `kb_down_1` clear·false·**true**, `kb_down_2` clear·true ④ `pen_up`·`pen_down_0`·`key_space`·`mouse_base`·`kb_up` restore·true, `pen_key_space`·`mouse_right` clear·false. 24장 모두 `resetKind` = `hasBuiltinDefault(slot) ? 'restore' : 'clear'`, restore 칸 = R-31 15장 ⓒ bridge: 없음

### TC-178 · exportResult · 종류: 자동 · 요구: R-33 · 설계: images-tab §3 `exportResult`·`DownloadResult`·예, contract v0.16 `ExportReport` · 스펙: `test/imageSlots.test.ts` · **신규(CR-035)**
- Given `{written:15개, conflicts:[], failed:[]}` / `{written:['a.png'], conflicts:[], failed:[{fileName:'kb_up.png', code:'asset.io'}]}` / `{written:[], conflicts:['kb_up.png'], failed:[]}`
- Then ⓐ 해당 없음 ⓑ `{kind:'done', count:15}` / `{kind:'partial', ok:1, failed:['kb_up.png']}` / `{kind:'done', count:0}`(충돌 판정은 호출자 몫 — 함수 정의에서 유도) ⓒ bridge: 없음

### TC-179 · 복원 확인 → 기본 그림으로 · 종류: 자동 · 요구: R-32 · 설계: images-tab §5 `onRequestReset`·`onConfirmReset`·`onConfirmRestore`, §4 `confirm`(resetKind)·`slotBusy`·`cardError`·`pendingFocusRef`, §6 4′ 표(`'restore'` 행), §7 I-3R·confirm 표, contract v0.16 `restoreDefaultAsset` · 스펙: `test/ImagesTab.test.tsx`(두 `it`) · **신규(CR-035)**
- Given `BASIC`, `kb_up` 이미지 변경 실패로 카드 오류가 있는 상태, `restoreDefaultAsset` 미결 · When `기본 기본 그림으로 되돌리기` → 「기본 그림으로」 → 응답(`kb_up` url `?v=2`) → props 갱신 / 둘째: 빈 `idle`·가운데 장 `kb_down_0` 복원
- Then ⓐ 화면: `alertdialog`(`aria-modal`, 이름 `기본 그림으로 되돌리기`, 설명 `‘기본’ 칸을 내장 기본 그림으로 되돌릴까요? 지금 그림은 지워지며 되돌릴 수 없습니다.`, 버튼 `[기본 그림으로, 취소]` — 확인 버튼 클래스 `danger`, 포커스 「취소」), 확정 뒤 닫힘·진행 중 모든 카드 버튼 비활성, 응답 뒤 `kb_up` 카드 `alert` 없음·누른 「기본값」 포커스, props 전 `img`는 옛 url 그대로·props 뒤 `?v=2` ⓑ 상태: `confirm` → null, `slotBusy` kb_up → null, `cardError` → null ⓒ bridge: 열 때 0회, 확정 뒤 `restoreDefaultAsset('kb_up')` 정확히 1회, **`removeAsset` 0회**, `setSettings`·`onError` 0회 / 둘째: `restoreDefaultAsset('idle')` → `restoreDefaultAsset({kind:'kb_down',index:0})`, `removeAsset` 0회

### TC-180 · 복원 실패 · 종류: 자동 · 요구: R-32, R-20 · 설계: images-tab §5 `onConfirmRestore` 예외, §7 I-3R 오류 열, i18n §4.6 `asset.no_default`(CR-035) · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- Given `restoreDefaultAsset` 1회차 reject `{code:'asset.canvas_mismatch', message:'같은 묶음의 그림 크기가 다릅니다: …'}`, 2회차 reject `{code:'asset.no_default', message:''}` · When `kb_up` 복원 확정 → `idle` 복원 확정
- Then ⓐ 화면: `kb_up` 카드 `alert` = 1회차 message(ko), `kb_up` `img` src 그대로(사용자 그림 유지), 버튼 다시 활성·누른 버튼 포커스, 다음 실패 뒤 `idle` 카드 `alert` = `이 칸에는 내장 기본 그림이 없습니다.`(message 비어 ko 사전)·`kb_up` 오류 사라짐 ⓑ 상태: `cardError` kb_up → idle ⓒ bridge: `restoreDefaultAsset` 2회, `removeAsset` 0회, `onError`(창 오류 줄) 0회

### TC-181 · 빈 pen_up 복원 → R-30 확인창 · 종류: 자동 · 요구: R-32, R-30 · 설계: images-tab §5 `onConfirmRestore`(`isFirstPenUp`·`setPenDialog('first')`·`pendingFocusRef = null`·아니면 `ensurePenPos`), §7 I-3R(U-7), §9.4 `savePenMode`·`onPenDialogConfirm` · 스펙: `test/ImagesTab.test.tsx`(두 `it`) · **신규(CR-035)**
- Given ① `BASIC`(pen_up 없음) + `SETTINGS`(penPos null·penMode false), `restoreDefaultAsset` → `BASIC` + `pen_up` 90×154 ② `WITH_PEN` + penPos null / `WITH_PEN` + penPos (10,20) · When ① `손 기본 기본 그림으로 되돌리기` → 확정 → props 갱신 → `ko.penFirstYes` ② 복원 확정
- Then ⓐ 화면: ① 펜 첫 등록 확인창(이름 `ko.penFirstTitle`)이 뜨고 포커스 `ko.penFirstNo`(누른 「기본값」으로 돌아가지 않음) ② 확인창 없음, 버튼 다시 활성 ⓑ 상태: ① `penDialog` first(size 90×154) → null ② — ⓒ bridge: ① `restoreDefaultAsset('pen_up')` 1회, 대답 전 `setSettings` 0회, 「예」 뒤 `setSettings` 1회 `{...SETTINGS, mouse:{...MOUSE, penMode:true, penPos:(355,483)}}`(hand (400,560)에 90×154 중심), `removeAsset`·`importAsset` 0회 ② penPos null이면 `setSettings` 1회 `{...SETTINGS, mouse:{...MOUSE, penPos:(355,483)}}`(penMode 그대로), (10,20)이면 `setSettings` 추가 0회

### TC-182 · 다운로드 패널 표시·위치·접근성 · 종류: 자동 · 요구: R-33, R-20 · 설계: images-tab §1 ASCII 둘째·셋째 줄, §2 `DefaultsDownloadPanel`, §6 1′, §10.3(레이아웃·`.outline` 재사용), §10.7 1 ~ 4, §10.8, contract v0.16 `DEFAULT_ASSET_SLOTS` · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- Given `EMPTY` · When 렌더
- Then ⓐ 화면: 단추 글자 `기본 이미지 다운로드`·`type="button"`·활성·`aria-busy` true 아님·`aria-describedby="download-defaults-desc"`(그 id = `p`), 접근 설명 = `내장 기본 그림 15장을 원본 크기 그대로 폴더에 저장합니다. 따라 그리거나 고쳐 쓸 때 쓰세요.`(`DEFAULT_ASSET_SLOTS.length` = 15), 단추 클래스 = 카드 「기본값」 클래스(`.outline`), 문서 순서 안내 `p.note` → 단추 → 첫 `h2`, region 안 첫 버튼, 결과 줄 없음 ⓑ 상태: `busy` false·`conflict` null·`result` null ⓒ bridge: `pickFolder`·`exportDefaultAssets` 0회

### TC-183 · 폴더 선택 취소·결과 줄 지움 · 종류: 자동 · 요구: R-33 · 설계: images-tab §10.5 `onDownload`(`setResult(null)` 먼저·null이면 끝), §10.6 I-8 오류 열(대화상자 취소) · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- Given `pickFolder` null → `DIR` → null, `exportDefaultAssets` → `DONE15` · When 다운로드 3번
- Then ⓐ 화면: 1번째 뒤 결과 줄 없음·단추 활성, 2번째 뒤 `기본 이미지 15장을 저장했습니다.`, 3번째(취소) 뒤 결과 줄 사라짐 ⓑ 상태: `result` null → done → null ⓒ bridge: `pickFolder('기본 이미지를 저장할 폴더 선택')` 3회, `exportDefaultAssets` 1회뿐, `importAsset`·`restoreDefaultAsset` 0회

### TC-184 · 충돌 없음 → 완료 · 종류: 자동 · 요구: R-33 · 설계: images-tab §10.4 `busy`(slotBusy와 무관), §10.5 `onDownload`·포커스 효과·`resultText`, §10.6 I-8, §10.7 3·4, §10.8 · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- Given `BASIC`, `idle` 등록 미결(`importAsset` deferred), `exportDefaultAssets` deferred · When 카드 등록 진행 중 다운로드 클릭 → 등록 응답 → 다운로드 응답 `DONE15`
- Then ⓐ 화면: 등록 중 카드 버튼 전부 비활성인데 다운로드 단추 활성, 다운로드 중 단추 `disabled`·`aria-busy="true"`, 등록 응답 뒤 카드 버튼 활성(단추는 여전히 비활성), 완료 뒤 결과 줄 `p` `기본 이미지 15장을 저장했습니다.`·`role="status"`·`data-tone="ok"`, 단추 포커스·`aria-busy` true 아님, 확인창 없음 ⓑ 상태: `busy` true → false, `result` done(15) ⓒ bridge: `exportDefaultAssets('D:\trace', false)` 정확히 1회, `pickFolder` 1회, `restoreDefaultAsset`·`removeAsset`·`setSettings` 0회

### TC-185 · 충돌 → 덮어쓰기 · 종류: 자동 · 요구: R-33 · 설계: images-tab §10.4 `conflict`, §10.5 `onDownload`(written 0 && conflicts ≥1)·`onConflictConfirm`, §10.6 I-9, §10.7 5, §7 confirm 표(덮어쓰기), U-5 = A · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- Given 1회차 `{written:[], conflicts:['kb_up.png','idle.png'], failed:[]}`, 2회차 deferred → `DONE15` · When 다운로드 → 「덮어쓰기」 → 응답
- Then ⓐ 화면: `alertdialog`(`aria-modal`, 이름 `같은 이름의 파일이 있습니다`, 설명 `이 폴더에 같은 이름의 파일이 2개 있습니다. 모두 덮어쓸까요? 덮어쓴 파일은 되돌릴 수 없습니다.`, 버튼 `[덮어쓰기, 취소]`·확인 클래스 `danger`·포커스 「취소」), 확인창 동안 결과 줄 없음, 확정 뒤 닫힘·단추 비활성, 응답 뒤 `기본 이미지 15장을 저장했습니다.`·단추 포커스 ⓑ 상태: `conflict` {dir, files 2} → null ⓒ bridge: `exportDefaultAssets(DIR, false)` → `exportDefaultAssets(DIR, true)` 정확히 2회, `pickFolder` 1회

### TC-186 · 덮어쓰기 취소·Esc·배경막 · 종류: 자동 · 요구: R-33 · 설계: images-tab §10.5 `onConflictCancel`·포커스 효과, §10.6 I-9 오류 열, §10.8 · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- Given 매번 `{written:[], conflicts:['kb_up.png'], failed:[]}` · When 다운로드 → 「취소」 / 다운로드 → Esc / 다운로드 → 배경막 클릭
- Then ⓐ 화면: 설명 `…파일이 1개 있습니다. …`, 앞 두 경우 닫히고 다운로드 단추 포커스·결과 줄 없음, 배경막 클릭은 열린 채 ⓑ 상태: `conflict` null(앞 두 경우), `result` null ⓒ bridge: `exportDefaultAssets` 3회 모두 `(DIR, false)` — 덮어쓰기 호출 0회

### TC-187 · 부분 실패 · 종류: 자동 · 요구: R-33, R-20 · 설계: images-tab §3 `exportResult`, §10.5 `resultText`('partial'), §10.6 I-10, §10.7 4(`role`·`data-tone`), i18n §4.7 `exportPartial` · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- Given 1회차 `written` 13·`failed` [background.png, idle.png], 2회차 충돌 1, 3회차 `written` 14·`failed` [kb_up.png] · When 다운로드 → 다시 다운로드 → 「덮어쓰기」
- Then ⓐ 화면: 결과 줄 `13장 저장, 2장 실패: background.png, idle.png`·`role="alert"`·`data-tone="error"`, 다음 `14장 저장, 1장 실패: kb_up.png`·`role="alert"`, 카드 `alert` 없음 ⓑ 상태: `result` partial ⓒ bridge: 3번째 호출 `(DIR, true)`, `onError` 0회

### TC-188 · 다운로드 오류 · 종류: 자동 · 요구: R-33, R-20 · 설계: images-tab §10.5 예외(`toBridgeError` → `{kind:'error'}`), §10.6 I-8 오류 열, i18n §4.6 `asset.export_dir` · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- Given `exportDefaultAssets` reject `{code:'asset.export_dir', message:'저장할 폴더를 찾을 수 없습니다: D:\gone'}` → 다음 `pickFolder` reject `Error('dialog failed')` · When 다운로드 2번
- Then ⓐ 화면: 결과 줄 = 그 message(ko)·`role="alert"`·`data-tone="error"`, 단추 다시 활성·포커스, 다음 결과 줄 `dialog failed`·`role="alert"`, 카드 `alert` 없음 ⓑ 상태: `result` error ⓒ bridge: `exportDefaultAssets` 1회뿐(대화상자 실패 때 0회), `onError` 0회

### TC-189 · CR-035 문구 ja·en · 종류: 자동 · 요구: R-20, R-32, R-33 · 설계: i18n §4.7 전 행·§4.6 새 code 2행, images-tab §6 4′ 표·§10.7, §10.5 `pickFolder(t.pickFolderTitle)` · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- Given 언어 ja → en(각각 `MessagesProvider`), `restoreDefaultAsset` reject `asset.no_default`, 다운로드 4회(충돌 1 → 덮어쓰기 부분 실패 14/1 → 완료 15 → reject `asset.export_dir`) · When 복원 열기·확정 → 다운로드 순서대로
- Then ⓐ 화면(사전 값 비교): 단추 이름 `downloadDefaults`·설명 `format(downloadDefaultsDesc,{n:15})`, `kb_up` 「기본값」 이름 `format(restoreImageAria,{name})`·글자 `clearImage`, 복원 확인창 `confirmRestoreTitle`·`format(confirmRestoreMessage,{name})`·`confirmRestoreOk`·포커스 `confirmCancel`, 카드 오류 = `errors['asset.no_default']`(code 문구), 덮어쓰기 확인창 `exportConflictTitle`·`format(exportConflictMessage,{n:1})`·`exportConflictOk`·포커스 `confirmCancel`, 결과 줄 `format(exportPartial,{ok:14, fail:1, files:'kb_up.png'})` → `format(exportDone,{n:15})` → `errors['asset.export_dir']` ⓑ 상태: 언어 ja/en ⓒ bridge: `pickFolder(dict.pickFolderTitle)`, `removeAsset` 0회

### TC-190 · CR-035 사전 12키·오류 2코드 · 종류: 자동 · 요구: R-20, R-32, R-33 · 설계: i18n §4.7 ko 열 전 행, §4.6 CR-035 두 행 · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- Given `ko`·`ja`·`en` 사전 · Then ⓐ 해당 없음 ⓑ ko 12키 = §4.7 ko 열 그대로(`restoreImageAria` `{name} 기본 그림으로 되돌리기` … `exportPartial` `{ok}장 저장, {fail}장 실패: {files}`), ja·en 12키 비어 있지 않음·자리표시(`{name}`·`{n}`·`{ok}`·`{fail}`·`{files}`) 유지, ko `errors['asset.no_default']` `이 칸에는 내장 기본 그림이 없습니다.`·`errors['asset.export_dir']` `저장할 폴더를 찾을 수 없습니다.`, ja·en 두 code 비어 있지 않음(ja·en 문구 자체는 검수 필요 — M-31) ⓒ bridge: 없음

### TC-191 · 포커스 복귀(다운로드·복원) · 종류: 자동 · 요구: R-33, R-32 · 설계: images-tab §10.5 포커스 효과(`refocusRef`·충돌 창 동안은 창이 포커스), §10.8, §5 `onCancelReset`·`pendingFocusRef`, §8 · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- Given 다운로드 충돌 → 충돌 → deferred 완료, 복원 성공 → 실패(`asset.canvas_mismatch`) · When 다운로드 → Esc → 다운로드 → 「덮어쓰기」 → 응답 → `mouse_base` 복원 취소 → 확정 → `kb_up` 복원 확정(실패)
- Then ⓐ 화면: 충돌 창이 열리면 포커스 = 창 「취소」(단추 아님), Esc 뒤 단추, 덮어쓰기 진행 중 단추 비활성, 끝나면 단추, 복원 취소·성공·실패 뒤 각각 누른 「기본값」 ⓑ 상태: `refocusRef` 소비 ⓒ bridge: `exportDefaultAssets` 3회, `restoreDefaultAsset('mouse_base')`·`('kb_up')`

CR-035 추적 — 요구 ↔ TC (앞 추적표와 겹치면 이 표 우선)

| 요구ID | 상태 | 자동 TC | 수동 | TC-FLOW |
|---|---|---|---|---|
| R-31 | 유효(신설) | TC-177(15칸 = restore), TC-136·TC-137(매니페스트 그대로 그림 — 화면 변경 없음) | M-29 | TC-FLOW-15 |
| R-32 | 유효(신설) | TC-133, TC-135, TC-137, TC-142, TC-143, TC-144, TC-145, TC-147, TC-151, TC-161, TC-173, TC-177, TC-179, TC-180, TC-181, TC-189, TC-190, TC-191 | M-31 | TC-FLOW-16, TC-FLOW-01 |
| R-33 | 유효(신설) | TC-151, TC-178, TC-182, TC-183, TC-184, TC-185, TC-186, TC-187, TC-188, TC-189, TC-190, TC-191 | M-30, M-31 | TC-FLOW-17 |
| R-30 | 유효 | 앞 행 + TC-181 | M-27, M-31 | TC-FLOW-14, TC-FLOW-16 |
| R-25 | 유효(「기본값 = 비우기」 문장 폐기) | 앞 행(TC-143 · TC-146 · TC-147은 개정본) | 같음 | TC-FLOW-01 |
| R-17 · R-18 | 유효(기대값 penPos (380,496)) | TC-025(두 사례), TC-027, TC-089, TC-090, TC-FLOW-07, TC-148(둘째), TC-170 | M-07 | TC-FLOW-04, TC-FLOW-07 |
| R-20 | 유효 | 앞 행 + TC-093, TC-094(수), TC-150(개정), TC-180, TC-187 ~ TC-190 | M-31 | TC-FLOW-10 |
| 그 밖 유효 요구 | 유효 | 앞 추적 그대로 | 같음 | 같음 |

CR-035 추적 — 설계 항목 ↔ TC

| 설계 항목 | TC |
|---|---|
| images-tab §1 ASCII(다운로드 패널·결과 줄 두 줄) / §10.3 레이아웃·CSS | TC-182, TC-184 / 시각·줄바꿈 M-31 |
| §2 `ImageSlotCard` props `canReset`·`resetKind`·`onReset` / `DefaultsDownloadPanel`(props 없음) | TC-137, TC-142, TC-179 / TC-182 |
| §3 `ResetKind`·`SlotCardSpec.resetKind`·`canReset` / `slotCard` 개정 / 검증 예 4건 / `DownloadResult`·`exportResult` | TC-133, TC-177 / TC-133, TC-135 / TC-177 / TC-178 |
| §4 `confirm`(ConfirmTarget.resetKind) / `pendingFocusRef` | TC-143, TC-144, TC-179 / TC-179, TC-181, TC-191 |
| §5 `onRequestReset` / `onConfirmReset` / `onConfirmRestore`(before·isFirstPenUp·ensurePenPos·예외) / `onConfirmClear`(clear 칸만) / `onCancelReset` / 주(D-1 폐기) | TC-142, TC-179 / TC-143, TC-179 / TC-179 ~ TC-181 / TC-143, TC-146, TC-147 / TC-144, TC-191 / TC-147 |
| §6 1′(패널 위치) / 3′(props) / 4′ 문구 선택 표·tone 기본 danger / `ImageSlotCard` 5 개정(aria-label·title) | TC-182 / TC-137 / TC-143, TC-179, TC-189 / TC-137, TC-142, TC-150 |
| §7 I-3(비우기 칸만) / I-3R / confirm 표 3행 | TC-143, TC-144, TC-146 / TC-179 ~ TC-181 / TC-143, TC-179, TC-185 |
| §8 CR-035 줄(다운로드 단추 첫 포커스·aria-label 분기·복원 칸 늘 포커스) | TC-151, TC-137, TC-142 |
| §10.1 첫 실행(화면 변경 없음) | TC-FLOW-15 / 실물 M-29 |
| §10.2 분기 표 | TC-177, TC-137, TC-142, TC-143, TC-179 |
| §10.4 `busy`·`conflict`·`result`·`buttonRef`·`refocusRef`·slotBusy 무관 | TC-184, TC-185, TC-183, TC-191, TC-184 |
| §10.5 `onDownload` / `onConflictConfirm` / `onConflictCancel` / 포커스 효과 / `resultText` / 클라이언트 판정 없음 | TC-183, TC-184, TC-188 / TC-185, TC-187 / TC-186 / TC-184 ~ TC-186, TC-188, TC-191 / TC-184, TC-187, TC-188 / TC-185(ExportReport만 보고 판단) |
| §10.6 I-8 / I-9 / I-10 | TC-183, TC-184, TC-188 / TC-185, TC-186 / TC-187 |
| §10.7 1 ~ 5(렌더) / §10.8 접근성 | TC-182, TC-184, TC-185 / TC-151, TC-182, TC-184, TC-186, TC-191 |
| §9.5 I-7(pen_up 없어짐 → 토글 비활성) | TC-161(외부 수신으로 흉내 — K-1) |
| i18n §4.6 CR-035 두 code / §4.7 12키 | TC-180, TC-188, TC-189, TC-190, TC-093 / TC-189, TC-190, TC-094 |
| contract v0.16 `restoreDefaultAsset` / `exportDefaultAssets(dir, overwrite)` / `ExportReport`·`ExportFailure` / `pickFolder(title?)` / `DEFAULT_ASSET_SLOTS` / `hasBuiltinDefault` / `DEFAULT_MOUSE_SETTINGS.penPos` | TC-179 / TC-184 ~ TC-186 / TC-178, TC-187 / TC-183 / TC-182, TC-FLOW-15 / TC-177 / TC-025, TC-089, TC-090, TC-148, TC-170, overlay TC-025 |

CR-035 추적 — 사용자행 ↔ TC-FLOW: **S-14**(R-31) → TC-FLOW-15 · **S-15**(R-32·R-30) → TC-FLOW-16 · **S-16**(R-33) → TC-FLOW-17 · **S-1**(R-32 추가) → TC-FLOW-01(개정). 그 밖 행은 앞 표 그대로.

CR ↔ TC: CR-035 → 개정 TC-025·TC-027·TC-089·TC-090·TC-093·TC-094·TC-133·TC-135·TC-137·TC-142 ~ TC-148·TC-150·TC-151·TC-161·TC-170·TC-173·TC-FLOW-01·TC-FLOW-07·overlay TC-025 / 신규 TC-177 ~ TC-191·TC-FLOW-15 ~ TC-FLOW-17 / 수동 M-29 ~ M-31 신설.

설계 확인 필요 (CR-035, 관리자 인계)

- **K-1. I-7(`pen_up` 비우기)에 이르는 화면 경로가 없다.** `pen_up`은 복원 칸이라 「기본값」이 비우기를 하지 않는다(§10.2). 그런데 §9.5 I-7 행은 「I-3 → `assets://changed` → 토글 비활성」으로 남아 있다. TC-161은 외부 수신(기존 설치에서 비어 있음·다른 경로)으로 흉내 냈다. I-7 행을 「`pen_up`이 매니페스트에서 없어지면」으로 고칠지 ui-designer 결정 필요.
- **K-2. `settings.mouse` null일 때 `pen_up` 첫 등록·교체의 `penPos`.** `DEFAULT_MOUSE_SETTINGS.penPos`가 (380,496)이 되어 `ensurePenPos`(§5)는 저장하지 않고, `savePenMode`(§9.4)는 계산 없이 (380,496)을 싣는다. (380,496)은 기본 세트 `pen_up`(90×154) 자리라 사용자가 다른 크기 `pen_up`을 넣어도 그 자리다. 스펙은 설계 식대로 고정했다(TC-148 둘째·TC-170). §5·§9.4 설명 문장(「null이면 resolvePenPos」)이 이 경우를 다루는지 확인 필요.
- **K-3. `pickFolder` 실패 뒤 포커스.** §10.8은 「끝나면(성공·실패·충돌 취소) 단추로」인데 §10.5는 `refocusRef`를 `pickFolder` 뒤에 켜서 대화상자 실패 때는 포커스를 옮기지 않는다. TC-188은 그 경우 포커스를 단언하지 않는다. 의도 확인 필요.
- **K-4. 스펙이 고정한 해석.** ① 확인창 버튼 순서 `[확인, 취소]`(§6 `ConfirmDialog` 2) ② `DEFAULT_ASSET_SLOTS`는 `AssetSlot` 배열(TC-FLOW-15가 `entry(slot)`로 매니페스트를 만든다) ③ 결과 줄 = `p[data-tone]`(TC-183 ~ TC-189) ④ `SlotCardSpec`에 옛 `canClear` 키가 없다(TC-133) ⑤ 다운로드 단추 클래스 = 카드 「기본값」 클래스(TC-182, §10.3 `.outline` 재사용) ⑥ `exportResult`는 충돌만 있는 보고를 `done`·0으로 옮긴다(TC-178, 함수 정의에서 유도) ⑦ 빈 `pen_up` 복원 뒤 포커스는 펜 확인창 「아니요」(TC-181, `pendingFocusRef = null`). 다르게 의도했다면 알려 달라.
- **K-5. design RTM R-31 ~ R-33 「예정 TC」 동기화**(이 절 번호) — ui-designer 몫. `design/images-tab.md` §6 1 ~ 4 원문(`canClear`·`onClear`·`onRequestClear`)은 1′·3′·4′가 대체한다는 주만 있어 원문 정리 권고.
- **K-6. 앞 결함 G-1 재확인.** 비우기 칸(예: 단일 `mouse_left`)을 비울 때 `assets://changed`가 응답보다 먼저 오면 누른 「기본값」이 비활성이 되어 포커스가 빠진다 — CR-035로 비우기 칸이 줄었을 뿐 규칙은 그대로 미정.

### CR-037 개정 (v12 — 헤어(뒷머리) 슬롯 R-34, 증분 모드)

비유: 종이 인형의 뒷머리는 몸 뒤에 따로 오려 붙이는 한 장이다. 테스트는 「그 한 장이 카드 목록의 배경 옆에 놓이는가」, 「미리보기에서 팔보다 뒤(맨 아래)에 깔리는가」, 「붙였다 떼는 호출이 정확한가」를 본다.

- **CR-037 기준(v12, 이 절이 머리의 모든 기준 줄과 앞 CR 절보다 우선)**: `src/settings/requirements.md` **v1.12**(R-34·S-17 신설, §3 `'hair'` 행) · `design.md`(§4 `hairUrl`, §5.2 `findUrl` key `'hair'`·렌더 3 헤어 행, §10 합성 순서 헤어 → 팔 → 바탕 → 펜 손, RTM R-34) · `design/images-tab.md` §1 ASCII `[card hair]`·§3 `buildSlotGroups` ①·검증 예(CR-037)·§3.1 · `design/i18n.md` §4.3 `imagesNote`·§4.4 `hair`·§4.6 `asset.canvas_mismatch`(CR-037 새 문구 — CR-036 문구 대체) · `doc/200_설계/bridge/contract.md` **v0.17**(`AssetSlot` `'hair'`, `hasBuiltinDefault('hair') === false`, `isRequiredSlot('hair') === false` — `src/bridge/types.ts` 반영됨)
- **범위·수(v12)**: 유효 요구 R-01 · R-03 · R-04 · R-10 · R-11 · R-12 · R-15 ~ R-18 · R-20 ~ R-34(R-19 폐기 → R-27). 자동 TC 번호 199개(TC-001 ~ TC-199) 중 **유효 193 · 폐기 6** · TC-FLOW 18개(TC-FLOW-01 ~ TC-FLOW-18) · 수동 32개(M-01 ~ M-32)
- **mock·시간 규약(v12)**: 새 command·event 없음 — 기존 `importAsset(slot, path)`·`removeAsset(slot)`·`pickPngFile(title)` mock 재사용, 슬롯 인자는 문자열 `'hair'`. `bridge/types`의 `slotKey`·`isRequiredSlot`·`hasBuiltinDefault`는 실물. 매니페스트 교체(`assets://changed`)는 props 재렌더로 흉내. 시간 의존 없음 — deferred promise + `waitFor` 조건(실제 sleep·가짜 시계 없음)
- **스펙 파일(v12)**: `test/imageSlots.test.ts`(TC-134 개정, TC-192) · `test/i18n.test.ts`(TC-093·TC-094·TC-096 개정, TC-197) · `test/ImagesTab.test.tsx`(TC-136 개정 — `ORDER`·`TITLES` 25장) · **신규** `test/Hair.test.tsx`(TC-193 ~ TC-196, TC-FLOW-18) · `test/MousePartsTab.test.tsx`(TC-198·TC-199 — 포인터 보강 공유)
- 픽스처(Hair.test.tsx): `NO_HAIR` = `kb_up`·`kb_down_0`·`mouse_base`(200×150), `HAIR` = `NO_HAIR` + `hair`(900×700), `PATH` = `C:\img\hair.png`, `HAIR_MISMATCH` = `{code:'asset.canvas_mismatch', message:'배경·뒷머리·키보드 그림은 모두 같은 크기여야 합니다. (현재 800×600, 캔버스 900×700)'}`. (MousePartsTab.test.tsx): `HAIR_HAND` = `hair`·`body`·`mouse_base`, `HAIR_ALL` = `background`·`hair`·`body`·`kb_up`·`mouse_base`·`pen_up`(100×80)

#### CR-037 개정 TC (앞 본문을 대체 — 번호·제목 유지)

### TC-134 · buildSlotGroups(빈 매니페스트) · 종류: 자동 · 요구: R-25, **R-34** · 설계: images-tab §3 `buildSlotGroups` ①(CR-037)·검증 예(CR-037) · 스펙: `test/imageSlots.test.ts` · **개정(CR-037)**
- Given 빈 매니페스트 · When `buildSlotGroups`
- Then ⓐ 화면: 해당 없음 ⓑ 반환: 그룹 id `[background, keyboard, arm, hand]`, 배경 그룹 키 `['background','hair']`(옛 `['background']`), 키보드 11장·팔 3장·손 9장 그대로, 전체 **25장**(옛 24), 전부 `type:'slot'`, `body` 없음, 필수 `[kb_up, kb_down_0, mouse_base]` ⓒ bridge: 없음

### TC-136 · 레이아웃·카드 순서·필수 배지·빈 미리보기 · 종류: 자동 · 요구: R-25, R-19, R-20, **R-34** · 설계: images-tab §1(ASCII `[card hair]`), §6 렌더, i18n §4.3 `imagesNote`(CR-037)·§4.4 `hair` · U-6 · 스펙: `test/ImagesTab.test.tsx` · **개정(CR-037)**
- Given 빈 매니페스트 · When 렌더
- Then ⓐ 화면: 안내 `PNG(32비트 RGBA)만 쓸 수 있습니다. 최대 900×700·1MB. 배경·뒷머리·키보드 그림은 모두 같은 크기로 만드세요.`(옛 「배경·키보드」 대체), 카드 **25장** 순서 = `background` → `hair` → `kb_up` …(나머지 불변), h3 = `배경` → `뒷머리` → `기본` …, 필수 배지 3장 그대로(`hair`는 `선택`·`등록된 그림 없음`) ⓑ 상태: `groups` = `buildSlotGroups(EMPTY)` ⓒ bridge: `pickPngFile`·`importAsset`·`removeAsset`·`setSettings` 0회

| 개정 TC | Given / When | Then ⓐ 화면 · ⓑ 상태 · ⓒ bridge | 스펙 |
|---|---|---|---|
| TC-093 | `ko`·`ja`·`en` 사전 | ⓐ 해당 없음 ⓑ `SLOT_KEYS` **25개**(`hair` 추가 — `background` 다음) = `ko.slots` 키, ja·en `slots` 키 집합 같음·`hair` 제목·설명 비어 있지 않음 ⓒ 없음 | `i18n.test.ts` |
| TC-094 | `ko` 사전 | ⓐ 해당 없음 ⓑ `imagesNote` = `PNG(32비트 RGBA)만 쓸 수 있습니다. 최대 {w}×{h}·1MB. 배경·뒷머리·키보드 그림은 모두 같은 크기로 만드세요.`, `slots.hair` = `{title:'뒷머리', desc:'장발의 뒷머리처럼 팔 뒤에 보일 부분. 본체와 함께 흔들립니다'}`, `errors['asset.canvas_mismatch']` = `배경·뒷머리·키보드 그림은 모두 같은 크기여야 합니다.`(CR-036 문구 `배경·키보드 그림은…` 대체), 단순 키 92개 불변(CR-037은 단순 키를 늘리지 않음) ⓒ 없음 | 같음 |
| TC-096 | `format(ko.imagesNote, {w:900, h:700})` | ⓑ `PNG(32비트 RGBA)만 쓸 수 있습니다. 최대 900×700·1MB. 배경·뒷머리·키보드 그림은 모두 같은 크기로 만드세요.` ⓐ·ⓒ 해당 없음 | 같음 |
| TC-177 | 불변 | 단언 불변 — 반복문이 `hair`(`clear`)를 자동 포함, 복원 칸 15장 그대로. 스펙 주석 「24장」은 25장으로 읽는다(단언 아님) | `imageSlots.test.ts` |
| TC-150 | 불변 | `format(ja.imagesNote, …)` 사전 값 비교라 수정 없음 | `ImagesTab.test.tsx` |

#### CR-037 신규 TC

### TC-192 · buildSlotGroups 배경 그룹 [background, hair]·hair 카드 스펙 · 종류: 자동 · 요구: R-34, R-32, R-25 · 설계: images-tab §3 `buildSlotGroups` ①·`slotCard`·검증 예(CR-037), contract v0.17 `hasBuiltinDefault('hair')`·`isRequiredSlot` · 스펙: `test/imageSlots.test.ts` · **신규(CR-037)**
- Given ① 빈 매니페스트 ② `hair`(900×700)만 등록 · When `buildSlotGroups`·`slotCard(EMPTY,'hair','hair',null)`
- Then ⓐ 화면: 해당 없음 ⓑ 반환: `hasBuiltinDefault('hair')` false. ① 배경 그룹 키 `['background','hair']`, hair 스펙 = `{type:'slot', slot:'hair', key:'hair', msg:'hair', n:null, entry:undefined, required:false, resetKind:'clear', canReset:false, lastOnlyBlocked:false}`이고 `slotCard` 직접 호출 결과와 같다 ② hair `entry` = 등록 항목·`canReset` **true**·`resetKind` clear·`lastOnlyBlocked` false·`n` null, `background`는 restore·canReset true, 키보드 11·팔 3·손 9장 순서 불변, 필수 `[kb_up, kb_down_0, mouse_base]`, hair 카드 1장뿐(추가 카드 없음) ⓒ bridge: 없음

### TC-193 · 「뒷머리」 카드 렌더(빈·등록) · 종류: 자동 · 요구: R-34, R-25, R-28 · 설계: images-tab §1 ASCII `[card hair]`, §3.1 위치·카드 양식·「기본값」(비활성), §6 `ImageSlotCard` 1 ~ 5·2′·3′, i18n §4.4 `hair` · 스펙: `test/Hair.test.tsx` · **신규(CR-037)**
- Given `NO_HAIR` → props `HAIR`(수신 흉내) · When 렌더 → 재렌더
- Then ⓐ 화면: 카드 순서 앞 3장 `slot-card-background` → `slot-card-hair` → `slot-card-kb_up`, h2 `배경` 뒤·h2 `키보드 (본체)` 앞, h3 `뒷머리`·`title="뒷머리"`, 설명(카드 둘째 자식) `장발의 뒷머리처럼 팔 뒤에 보일 부분. 본체와 함께 흔들립니다`·같은 `title`, 배지 `선택`(`필수` 없음), 빈 문구 `등록된 그림 없음`(`필수 · 미등록` 없음)·`img` 없음, `뒷머리 이미지 변경` 활성, `뒷머리 그림 지우기` 글자 `기본값`·**비활성**·`title` 없음, `뒷머리 기본 그림으로 되돌리기` 없음 / 재렌더 뒤 `img` src `asset://hair.png`·`alt=""`·`draggable=false`, 빈 문구 없음, `뒷머리 그림 지우기` **활성**·`title` 없음, 카드 26장(픽스처 `kb_down_0` 등록으로 추가 카드 `kb_down_1` 포함: 배경 2 + 키보드 12 + 팔 3 + 손 9) ⓑ 상태: hair 스펙 `canReset` false → true ⓒ bridge: `pickPngFile`·`importAsset`·`removeAsset`·`restoreDefaultAsset`·`setSettings` 0회

### TC-194 · 뒷머리 이미지 변경 성공 · 종류: 자동 · 요구: R-34, R-25 · 설계: images-tab §3.1 이미지 변경·펜 규칙 무관, §5 `onChangeImage`, §7 I-1, contract v0.17 `'hair'` · 스펙: `test/Hair.test.tsx` · **신규(CR-037)**
- Given `NO_HAIR`, `pickPngFile` → `PATH`, `importAsset` deferred → `HAIR` · When `뒷머리 이미지 변경` → 응답 → props `HAIR`
- Then ⓐ 화면: 응답 전 카드 안 버튼 전부 비활성, 응답 뒤 다시 활성, 재렌더 뒤 hair `img` `asset://hair.png`, 카드 `alert` 없음, **`alertdialog` 없음**(R-30 펜 첫 등록 확인창과 무관) ⓑ 상태: `slotBusy` hair → null ⓒ bridge: `pickPngFile('PNG 이미지 선택')` 1회, `importAsset('hair', PATH)` 정확히 1회, `removeAsset`·`restoreDefaultAsset`·`setSettings` 0회, `onError` 0회

### TC-195 · 뒷머리 이미지 변경 실패(asset.canvas_mismatch) · 종류: 자동 · 요구: R-34, R-20, R-25 · 설계: images-tab §3.1 이미지 변경(크기 다르면 core가 `asset.canvas_mismatch`), §5 `onChangeImage` 예외, §4 `cardError`, §6 6′, i18n §4.6 `asset.canvas_mismatch`(CR-037) · 스펙: `test/Hair.test.tsx` · **신규(CR-037)**
- Given `importAsset` reject `HAIR_MISMATCH` · When ko에서 `뒷머리 이미지 변경` / en(`MessagesProvider`)에서 `format(en.changeImageAria,{name: en.slots.hair.title})`
- Then ⓐ 화면: ko — hair 카드 `alert` = core message 그대로, hair `img` 없음, 버튼 다시 활성, `kb_up` 카드 `alert` 없음 / en — hair 카드 `alert` = `en.errors['asset.canvas_mismatch']`(`back hair` 포함) ⓑ 상태: `cardError.key` hair ⓒ bridge: `importAsset('hair', PATH)` 2회(언어별 1회), `removeAsset`·`restoreDefaultAsset`·`setSettings` 0회, `onError`(창 오류 줄) 0회

### TC-196 · 뒷머리 「기본값」 → 비우기 확인 → removeAsset('hair') · 종류: 자동 · 요구: R-34, R-32, R-25 · 설계: images-tab §3.1 「기본값」(`resetKind` clear → 비우기 확인창 `{name}` = 뒷머리 → `removeAsset('hair')`), §5 `onRequestReset`·`onCancelReset`·`onConfirmReset`·`onConfirmClear`, §6 4′ 표 `'clear'` 행·`ConfirmDialog` 1 ~ 4, §7 I-3·confirm 표 · 스펙: `test/Hair.test.tsx` · **신규(CR-037)**
- Given `HAIR`, `removeAsset` deferred → `NO_HAIR` · When 「기본값」 → 「취소」 / 「기본값」 → Esc / 「기본값」 → 「지우기」 → 응답 → props `NO_HAIR`
- Then ⓐ 화면: `alertdialog`(`aria-modal="true"`, 이름 `그림 지우기`, 설명 `‘뒷머리’ 그림을 지울까요? 되돌릴 수 없습니다.`, 버튼 `[지우기, 취소]`, 포커스 「취소」), 취소·Esc 뒤 닫힘·누른 「기본값」 포커스, 「지우기」 뒤 닫힘·카드 안 버튼 전부 비활성, 응답 뒤 누른 「기본값」 포커스, 재렌더 뒤 `등록된 그림 없음`·`img` 없음·「기본값」 비활성 ⓑ 상태: `confirm`(resetKind clear) → null, `slotBusy` hair → null ⓒ bridge: 취소·Esc 동안 `removeAsset` 0회, 「지우기」 뒤 `removeAsset('hair')` 정확히 1회, `restoreDefaultAsset`·`importAsset`·`setSettings` 0회, `onError`는 null 외 인자 없음, `window.confirm` 미사용

### TC-197 · CR-037 문구 — slots.hair 3개 국어·imagesNote·canvas_mismatch · 종류: 자동 · 요구: R-34, R-20 · 설계: i18n §4.3 `imagesNote`(CR-037)·§4.4 `hair`·§4.6 `asset.canvas_mismatch`(CR-037) · 스펙: `test/i18n.test.ts` · **신규(CR-037)**
- Given `ko`·`ja`·`en` 사전
- Then ⓐ 화면: 해당 없음 ⓑ 값: ko `slots.hair` = `{뒷머리 / 장발의 뒷머리처럼 팔 뒤에 보일 부분. 본체와 함께 흔들립니다}`, ko `imagesNote`·`errors['asset.canvas_mismatch']` = TC-094 값(옛 CR-036 문구와 다름). ja·en(검수 필요 — 핵심어만 고정): 제목 `後ろ髪` / `Back hair`, 설명 비어 있지 않고 `background` 설명과 다름, `imagesNote`에 `{w}`·`{h}` 유지, ja `imagesNote`·`canvas_mismatch`에 `後ろ髪`, en 둘 다 `back hair` 포함 ⓒ bridge: 없음

### TC-198 · 미리보기 헤어: 맨 아래·.layer·없으면 미렌더 · 종류: 자동 · 요구: R-34, R-12 · 설계: design §4 `hairUrl`, §5.2 `findUrl`(`'hair'`)·렌더 3 헤어 행(맨 먼저 = 맨 아래, `.layer`, `alt=""`, `draggable={false}`, 위치·회전 없음, 없으면 아무것도 없음), §10 합성 순서, §9(장식 img) · 스펙: `test/MousePartsTab.test.tsx` · **신규(CR-037)**
- Given `PEN_HAND`(헤어 없음) → props `HAIR_ALL` → props `PEN_HAND` · When 렌더 → 재렌더 2회
- Then ⓐ 화면: 처음 `img` src = `[mouse_base, body, pen_up]`(헤어 없음·안내 없음) / `HAIR_ALL`에서 `[hair, mouse_base, body, pen_up]`(`background`는 여전히 없음, `kb_up` 대신 `body`), 첫 `img` = 헤어, 문서 순서 헤어 → 손 그림 → 바탕 → 펜 손 → 영역 선(`svg`) → 축 마커 `축(어깨) (600, 480)`, 헤어 className = 바탕 className(≠ 손 그림 className), 헤어 `style.left`·`top`·`transform` 빈 값, `alt=""`·`draggable=false`, 역할 img = 축 마커 1개, 손 그림 (100,200)·펜 손 (350,520) 불변 / 마지막 재렌더 뒤 헤어 없음·처음 순서로 복귀 ⓑ 상태: `hairUrl` undefined → `asset://hair.png` → undefined ⓒ bridge: `setSettings` 0회

### TC-199 · 헤어가 있어도 끌기 판정 불변 · 종류: 자동 · 요구: R-34, R-11 · 설계: design §5.2 렌더 3 헤어 행(끌기·클릭 판정 대상 아님 — `.layer` `pointer-events:none`, 판정은 좌표 기반 `pickDragTarget`), §5.1 `pickDragTarget`·`hitPart`·`clampPartPos`, §5.2 `onPreviewPointerDown/Move/Up`, §6 P-5 · 스펙: `test/MousePartsTab.test.tsx` · **신규(CR-037)**
- Given `HAIR_HAND`, scale 0.5, `setSettings` 성공 · When 누름 (400,50)(캔버스 (800,100) — 헤어만 있는 자리)·이동·놓기 → 누름 (60,110)(캔버스 (120,220), 팔 파츠 사각형 안, grab (20,20)) → 이동 (110,160) → 놓기
- Then ⓐ 화면: 첫 조작 뒤 손 그림·「파츠 위치」 (100,200) 그대로, 둘째 조작 중 (200,300)으로 따라옴, 저장 뒤 첫 `img` = 헤어 그대로·`style.left` 빈 값 ⓑ 상태: 첫 조작 `drag` null, 둘째 `drag` target part ⓒ bridge: 첫 조작 `setPointerCapture`·`setSettings` 0회, 둘째 `setPointerCapture(7)`, `setSettings` 정확히 1회 = `{...SETTINGS, mouse:{...MOUSE, partPos:(200,300)}}`

CR-037 추적 — 요구 ↔ TC (앞 추적표와 겹치면 이 표 우선)

| 요구ID | 상태 | 자동 TC | 수동 | TC-FLOW |
|---|---|---|---|---|
| R-34 | 유효(신설) | TC-093, TC-094, TC-096, TC-134, TC-136, TC-192, TC-193, TC-194, TC-195, TC-196, TC-197, TC-198, TC-199 | M-32 | TC-FLOW-18 |
| R-25 | 유효 | 앞 행 + TC-134, TC-136, TC-192 ~ TC-196 | M-32 | TC-FLOW-01, TC-FLOW-18 |
| R-32 | 유효 | 앞 행 + TC-192(hair = clear 칸), TC-196 | 같음 | TC-FLOW-16, TC-FLOW-18 |
| R-20 | 유효 | 앞 행 + TC-195, TC-197 | M-32 | TC-FLOW-10 |
| R-12 | 유효 | 앞 행 + TC-198 | M-32 | TC-FLOW-02, TC-FLOW-18 |
| R-11 | 유효 | 앞 행 + TC-199 | 같음 | TC-FLOW-05 |
| R-28 | 유효 | 앞 행 + TC-193(제목·설명 `title`) | 같음 | 같음 |
| 그 밖 유효 요구 | 유효 | 앞 추적 그대로 | 같음 | 같음 |

CR-037 추적 — 설계 항목 ↔ TC

| 설계 항목 | TC |
|---|---|
| images-tab §1 ASCII `[card background] [card hair]` | TC-136, TC-193 / 시각 M-32 |
| images-tab §3 `buildSlotGroups` ①(`hair`, frames null) / 검증 예(CR-037: 2장·clear·canReset false/true·다른 그룹 불변·필수 3장) | TC-134, TC-136, TC-192 / TC-192 |
| images-tab §3.1 위치(배경 그룹 둘째) / 카드 양식(제목·설명·필수 배지 없음·미리보기·두 단추) | TC-193 / TC-193 |
| images-tab §3.1 이미지 변경(`pickPngFile` → `importAsset('hair', …)`, 실패 = `asset.canvas_mismatch` 카드 오류 띠) | TC-194, TC-195 |
| images-tab §3.1 「기본값」(clear → 비우기 확인창 `{name}` = 뒷머리 → `removeAsset('hair')`, 미등록 비활성) | TC-193, TC-196 |
| images-tab §3.1 펜·첫 등록 규칙과 무관 / 새 컴포넌트·상태·function 없음 | TC-194(확인창 없음·`setSettings` 0회) / TC-193(기존 `ImageSlotCard` testid·양식) |
| design §4 `hairUrl`(파생) / §5.2 `findUrl` key `'hair'` | TC-198 / TC-198 |
| design §5.2 렌더 3 헤어 행(맨 아래·`.layer`·`alt`·`draggable`·위치 없음·없으면 없음) / 판정 대상 아님 | TC-198 / TC-199 |
| design §10 미리보기 합성 순서(헤어 → 팔 → 바탕 → 펜 손 → 영역 선 → 축 마커, 배경 없음) — CR-051(확정사항 🔒 2026-09-26): 오버레이 새 겹침 **헤어 → 배경 → 뽀모도(인물·말풍선·시간 글자) → 팔 → 본체 → 펜 손**에서 미리보기가 그리는 헤어·팔·바탕·펜 손만 뽑은 부분 순서라 모순 없음(배경·뽀모도는 이 미리보기가 그리지 않는다, 타이머 미리보기 TC-260은 헤어를 그리지 않는다) | TC-198(재확인 — 기대·스펙 불변) |
| i18n §4.3 `imagesNote`(CR-037) / §4.4 `hair` 3개 국어 / §4.6 `asset.canvas_mismatch`(CR-037) | TC-094, TC-096, TC-136, TC-197 / TC-093, TC-094, TC-193, TC-195, TC-197 / TC-094, TC-195, TC-197 |
| contract v0.17 `AssetSlot` `'hair'`·`hasBuiltinDefault('hair')` false·`isRequiredSlot('hair')` false / `import_asset`·`remove_asset`·`get_asset_manifest`·`assets://changed` 재사용 | TC-192 / TC-194, TC-196, TC-193·TC-198(props 재렌더로 수신 흉내) |
| 실물 겹침·오버레이와 같은 순서·ja·en 문구 검수 | M-32 |

CR-037 추적 — 사용자행 ↔ TC-FLOW: **S-17**(R-34) → TC-FLOW-18. 그 밖 행은 앞 표 그대로.

CR ↔ TC: CR-037 → 개정 TC-093·TC-094·TC-096·TC-134·TC-136 / 신규 TC-192 ~ TC-199·TC-FLOW-18 / 수동 M-32 신설. (CR-036 → TC-094 `canvas_mismatch` 기대값은 CR-037 문구로 한 번에 대체 — CR-036 단독 개정본은 만들지 않았다.)

설계 확인 필요 (CR-037, 관리자 인계)

- **H-1.** `design/i18n.md` §4.4 제목 「`SlotMessageKey` 24개」 — `hair` 행이 더해져 25개다. 스펙은 25개(TC-093·TC-094).
- **H-2.** `design/images-tab.md` §3.1 「`pickPngFile(t.dialogPickImage)`」 — 사전 키는 `pickTitle`(i18n §4.1, TC-138·TC-150). 스펙은 `pickPngFile('PNG 이미지 선택')`(TC-194).
- **H-3.** images-tab §3.1 「CR-036 문구, 새 코드 없음」 — i18n §4.6은 CR-037 새 문구(「배경·뒷머리·키보드…」)다. 새 code가 없다는 점은 맞고 문구 출처 표기만 낡았다.
- **H-4(닫음 — 관리자 결정 2026-09-25).** 헤어만 있고 바탕(`body`·`kb_up`)이 없을 때 헤어 `img`와 `previewNoBody`가 함께 보이는 조합은 **단언하지 않는다**. TC-198·TC-FLOW-18은 바탕이 있는 매니페스트만 쓴다.
- **H-5.** CR 대장 CR-037 행 「TC 미작성」 → 이 절 번호로 갱신은 기록 주체 몫.
- **H-6. 스펙이 고정한 해석.** ① ja·en `slots.hair` 제목 `後ろ髪`/`Back hair`와 핵심어 포함만 고정(나머지는 검수 필요라 비교 안 함 — TC-197) ② `importAsset`·`removeAsset` 슬롯 인자 = 문자열 `'hair'`(TC-194·TC-196) ③ 헤어 className = 바탕 className(`.layer` 공유 — TC-198) ④ 끌기 좌표는 기존 규약(rect 0·scale 0.5·grab 유지 — TC-199). 다르게 의도했다면 알려 달라.

### CR-038 개정 (v13 — 배포용 기본 세트 교체, 증분 모드)

비유: 가게 진열대의 견본 세트가 15개에서 7개로 바뀌었다(뒷머리 견본은 새로 들어오고 임시 견본 9개는 빠졌다). 테스트는 「견본이 있는 칸만 '견본으로 되돌리기'가 되는가」, 「견본이 빠진 칸은 '치우기'로 바뀌었는가」, 「견본 수를 7로 말하는가」, 「처음 놓이는 팔·손 자리가 새 값인가」를 본다.

- **CR-038 기준(v13, 이 절이 머리의 모든 기준 줄과 앞 CR 절보다 우선)**: `doc/000_프로젝트_확정사항.md` §6 「배포용 기본 세트 교체」(🔒 2026-09-25, CR-035·CR-037 기본 목록 대체) · `src/bridge/types.ts` v0.18 반영분 — `DEFAULT_ASSET_SLOTS` **7개**(순서 `kb_up` · `kb_down_0` · `background` · `hair` · `mouse_base` · `pen_up` · `pen_down_0`), `DEFAULT_MOUSE_SETTINGS` `shoulder` **(558,500)** · `penPos` **(356,504)** · `penMode` **true**(`partPos` (389,492)·`area` 불변). 화면 문서(`requirements.md`·`design.md`·`design/images-tab.md`)에는 CR-038 기록이 아직 없다 → 아래 「설계 확인 필요 L-1」
- **범위·수(v13)**: 새 요구·새 TC 없음 — **개정만**. 자동 TC 번호 199(유효 193 · 폐기 6) · TC-FLOW 18 · 수동 32 그대로
- **mock·시간 규약(v13)**: 변경 없음. `bridge/types`의 `DEFAULT_ASSET_SLOTS`·`hasBuiltinDefault`·`DEFAULT_MOUSE_SETTINGS`는 실물 — 기대값 쪽은 리터럴로 적어 상수와 독립 대조한다
- **새 사실 → 기대값 규칙(모든 개정 TC 공통)**
  1. 복원 칸(`resetKind` `'restore'`) = 위 7칸. **`hair`는 복원 칸**(비어 있어도 「기본값」 활성, aria-label `뒷머리 기본 그림으로 되돌리기`, 확정 → `restoreDefaultAsset('hair')`, `removeAsset` 0회). **`idle`·`rest`·`key_*` 7장은 비우기 칸**(비어 있으면 「기본값」 비활성·`title` 없음, aria-label `{name} 그림 지우기`, 등록돼 있으면 비우기 확인창 → `removeAsset(slot)`).
  2. 「빈 복원 칸」 예시는 `idle` → **`background`(배경)**, 「기본 없는 칸」 예시는 `idle`·`key_*` 중에서 고른다.
  3. `downloadDefaultsDesc`의 `{n}` = **7**, 완료 문구 `기본 이미지 7장을 저장했습니다.`, 기본 파일 전부 충돌 = `7개`.
  4. `settings.mouse` null(= `DEFAULT_MOUSE_SETTINGS`)에서 나오는 표시·저장 기대값: `shoulder` (620,530) → **(558,500)**, `penPos` (380,496) → **(356,504)**, `penMode` false → **true**. 리셋(`onReset`) 저장 인자도 같은 값. 리셋이 현재 `penMode`를 보존하는 사례(CR-033 TC-025 둘째)는 보존 규칙 그대로 — 기본값을 쓰는 필드만 바뀐다.
- **단언 의도는 모두 유지**(칸 종류 판정·활성 규칙·호출 인자·문구 치환). 바뀐 것은 대상 칸과 숫자뿐이다.

#### CR-038 개정 TC (앞 본문을 대체 — 번호 유지, Given/When 불변이면 「불변」)

| 개정 TC | 스펙 | Given / When 변화 | Then ⓐ 화면 · ⓑ 상태/반환 · ⓒ bridge (새 기대) | 스펙 반영 |
|---|---|---|---|---|
| TC-133 | `imageSlots.test.ts` | 불변 + 미등록 `background`·`hair` 예 추가 | ⓐ 해당 없음 ⓑ `slotCard(KB3,'idle',…)` = `{required:false, resetKind:'clear', canReset:false, lastOnlyBlocked:false, n:null}`(옛 restore·true), `background`·`hair` 미등록 = `{resetKind:'restore', canReset:true}`, 나머지 불변 ⓒ 없음 | 반영 |
| TC-177 | 같음 | 예 4 대상 칸 교체 | ⓑ 예 4 복원 칸 `[pen_up, pen_down_0, hair, mouse_base, kb_up]`(옛 `key_space` → `hair`), 비우기 칸 `[pen_key_space, mouse_right, key_space, idle]`(canReset false), 25장 모두 `resetKind` = `hasBuiltinDefault`, 복원 칸 파일명 = 7장(옛 15) ⓐ·ⓒ 없음 | 반영 |
| TC-178 | 같음 | 픽스처 `DEFAULT_FILES` 7장(깨지지 않음 — 연동) | ⓑ `exportResult(done)` = `{kind:'done', count:7}`(옛 15), 나머지 불변 ⓐ·ⓒ 없음 | 반영 |
| TC-192 | 같음 | 불변 | ⓑ `hasBuiltinDefault('hair')` **true**, 빈 hair 스펙 `resetKind:'restore'`·`canReset:true`(옛 clear·false), 등록 hair `restore`·`canReset:true`, 그룹·필수·1장 고정 불변 ⓐ·ⓒ 없음 | 반영 |
| TC-137 | `ImagesTab.test.tsx` | `BASIC` 불변, 빈 복원 칸 예 `idle` → `background` | ⓐ `배경 기본 그림으로 되돌리기` 활성·글자 `기본값`, `대기 그림 지우기` **비활성**·글자 `기본값`, `대기 기본 그림으로 되돌리기` 없음, 나머지 불변 ⓑ idle 스펙 clear·canReset false ⓒ 호출 없음 | 반영 |
| TC-142 | 같음 | 불변 | ⓐ `배경 기본 그림으로 되돌리기` 활성·`title` 없음(옛 idle), `대기 그림 지우기` 비활성·`title` 없음, 비활성 `대기`·`타자 입력 2`·`왼클릭` 눌러도 `alertdialog` 없음 ⓑ 불변 ⓒ `removeAsset`·`restoreDefaultAsset` 0회 | 반영 |
| TC-179(둘째 `it`) | 같음 | 빈 복원 칸 `idle` → `background` | ⓐ 확인창 설명 `‘배경’ 칸을 내장 기본 그림으로 되돌릴까요? 지금 그림은 지워지며 되돌릴 수 없습니다.` ⓑ 불변 ⓒ `restoreDefaultAsset('background')` → `restoreDefaultAsset(kb_down_0)` 순 2회, `removeAsset`·`setSettings` 0회 | 반영 |
| TC-180 | 같음 | 둘째 실패 칸 `idle` → `background` | ⓐ `background` 카드 `alert` = `이 칸에는 내장 기본 그림이 없습니다.`(message 빈 값 → ko code 문구), `kb_up` 카드 `alert` 없음 ⓑ 불변 ⓒ `restoreDefaultAsset` 2회, `removeAsset`·`onError` 0회 | 반영 |
| TC-182 | 같음 | 불변 | ⓐ 설명 `내장 기본 그림 7장을 원본 크기 그대로 폴더에 저장합니다. 따라 그리거나 고쳐 쓸 때 쓰세요.` ⓑ `DEFAULT_ASSET_SLOTS` 길이 **7**, `slotKey` 순서 = 위 7칸 ⓒ `pickFolder`·`exportDefaultAssets` 0회 | 반영 |
| TC-189 | 같음 | 부분 실패 픽스처 = 7장 중 `kb_up.png` 실패 | ⓐ ja·en 설명 `format(downloadDefaultsDesc,{n:7})`, 부분 실패 `format(exportPartial,{ok:6, fail:1, files:'kb_up.png'})`(옛 ok 14), 완료 `format(exportDone,{n:7})` ⓑ 불변 ⓒ 호출 인자 불변 | 반영 |
| TC-183 · TC-184 · TC-191 | 같음 | 완료 보고 픽스처 `DONE7`(깨지지 않음 — 연동) | ⓐ 완료 결과 줄 `기본 이미지 7장을 저장했습니다.`(옛 15) ⓑ·ⓒ 불변 | 반영 |
| TC-185 | 같음 | 충돌 목록 `['kb_up.png','hair.png']`(옛 `idle.png` — 기본 세트 밖) | ⓐ 확인창 개수 `2개` 그대로, 완료 줄 7장 ⓑ·ⓒ 불변 | 반영 |
| TC-187 | 같음 | 첫 보고 = 7장 중 앞 2장 실패 | ⓐ `5장 저장, 2장 실패: kb_up.png, kb_down_0.png`(옛 13장·background·idle), 덮어쓰기 뒤 `6장 저장, 1장 실패: kb_up.png`(옛 14장) ⓑ·ⓒ 불변 | 반영 |
| TC-FLOW-15 | 같음 | 매니페스트 = `DEFAULT_ASSET_SLOTS` 7장 | ⓐ `img` 있는 카드 = 위 7칸(hair 포함), 그 7칸 「기본값」 활성·aria `… 기본 그림으로 되돌리기`, 나머지 빈 칸 18개(idle·rest·key_* 7·mouse_left·mouse_right·pen_key_* 7) 비활성·aria `… 그림 지우기`, 추가 카드 `kb_down_1`·`pen_down_1` ⓑ 불변 ⓒ 호출 0회 | 반영 |
| TC-FLOW-17 | 같음 | 충돌 = 기본 파일 7개 | ⓐ 확인창 `이 폴더에 같은 이름의 파일이 7개 있습니다. …`, 완료 줄 7장 ⓑ 불변 ⓒ `exportDefaultAssets(DIR,false)` → `(DIR,true)` 2회 | 반영 |
| TC-193 | `Hair.test.tsx` | 불변 | ⓐ 빈·등록 모두 「기본값」 = `뒷머리 기본 그림으로 되돌리기` **활성**·`title` 없음(옛 `뒷머리 그림 지우기` 빈 때 비활성), `뒷머리 그림 지우기` 없음 ⓑ hair 스펙 restore·canReset true(재렌더 전후 같음) ⓒ 호출 0회 | 반영(v13 후속) |
| TC-196 | 같음 | 「기본값」 → 복원 확인창 → 「기본 그림으로」, 응답 = hair 기본 그림 항목이 있는 매니페스트 | ⓐ `alertdialog` 이름 `기본 그림으로 되돌리기`·설명 `‘뒷머리’ 칸을 내장 기본 그림으로 되돌릴까요? 지금 그림은 지워지며 되돌릴 수 없습니다.`·버튼 `[기본 그림으로, 취소]`·포커스 「취소」, 취소·Esc 뒤 닫힘·누른 「기본값」 포커스, 확정 뒤 카드 버튼 전부 비활성 → 응답 뒤 누른 「기본값」 포커스, 재렌더 뒤 hair `img` 있음·「기본값」 활성 ⓑ `confirm`(restore) → null, `slotBusy` hair → null ⓒ 취소·Esc 동안 호출 0, 확정 뒤 `restoreDefaultAsset('hair')` 정확히 1회, `removeAsset`·`importAsset`·`setSettings` 0회. 제목 「뒷머리 「기본값」 → 복원 확인 → restoreDefaultAsset('hair')」 | 반영(v13 후속) |
| TC-FLOW-18 | 같음 | Steps 교체: TC-194 → TC-193(등록 뒤) → TC-198(합성 순서) → TC-196(복원 → 기본 뒷머리) → M-32 | ⓐ 마지막 단계 = 기본 뒷머리 `img`(옛 「비워서 미렌더」 — UI로 비울 길이 없어짐, 「헤어 없으면 미렌더」는 TC-198 단독 부분이 계속 덮음) ⓒ `importAsset('hair', PATH)` 1회 → `restoreDefaultAsset('hair')` 1회, `removeAsset` 0회 | 반영(v13 후속) · 사용자행 S-17 문구 확인 필요(L-2) |
| TC-014 | `MousePartsTab.test.tsx` | 불변(`settings.mouse` null) | ⓐ 축 표시 **(558, 500)**(옛 (620,530)), 파츠 위치 (389,492) 불변 ⓑ `mouse` = `DEFAULT_MOUSE_SETTINGS`(새 값) ⓒ `setSettings` 0회 | 반영(v13 후속) |
| TC-025(두 `it`) · TC-026 · TC-027 | 같음 | 불변 | ⓒ 리셋 저장 인자 `mouse`의 `shoulder` (558,500)·`penPos` (356,504)(옛 (380,496))·`partPos`·`area` 불변·`hand` null, `penMode` = 기본값을 쓰는 사례 true / 보존 사례는 현재 값 ⓐ 수신 뒤 축 표시 (558, 500) ⓑ 불변 | 반영(v13 후속) |
| TC-058 · TC-074 · TC-090 | 같음 | `settings.mouse` null에서 끌기·영역 저장 | ⓒ 저장 인자 `mouse` = `{...새 DEFAULT_MOUSE_SETTINGS, 바뀐 필드}` — `shoulder` (558,500)·`penPos` (356,504)·`penMode` true 포함. TC-090은 펜 손 기본 위치가 (356,504)라 누름 좌표·저장 `penPos`를 새 기준으로(이동량 불변 → 저장 = (356+dx, 504+dy)) ⓐ 표시 기본 위치 (356,504) ⓑ 불변 | 반영(v13 후속) |
| TC-089 · TC-FLOW-07 | 같음 | 불변 | ⓒ 리셋 인자 `penPos` **(356,504)**(옛 (380,496)) ⓐ 수신 뒤 펜 손 기본 위치 (356,504) ⓑ 불변 | 반영(v13 후속) |
| TC-170 | `PenMode.test.tsx` | 불변(`settings.mouse` null에서 첫 등록) | ⓒ 첫 등록 「예」 저장 인자 `penPos` = **(356,504)** 그대로(계산 없음, 옛 (380,496)), `shoulder` (558,500) ⓐ 토글 표시는 기본 `penMode` true 반영 ⓑ 불변 | 반영(v13 후속) |
| TC-033 · TC-FLOW-04 | `SettingsApp.test.tsx` | 불변 | ⓐ `get_settings` 실패 뒤 초기값(`DEFAULT_SETTINGS`)의 축 표시 (558, 500) / FLOW-04 리셋 뒤 수신 표시 (558, 500) ⓒ FLOW-04 리셋 인자 `shoulder` (558,500)·`penPos` (356,504) ⓑ 불변 | 반영(v13 후속) |

CR-038 추적 — 요구 ↔ TC: 새 요구 없음. **R-31**(기본 세트) → TC-182, TC-FLOW-15 / **R-32**(복원/비우기) → TC-133, TC-137, TC-142, TC-177, TC-179, TC-180, TC-192, TC-193, TC-196 / **R-33**(다운로드) → TC-178, TC-182 ~ TC-185, TC-187, TC-189, TC-191, TC-FLOW-17 / **R-34**(헤어) → TC-192, TC-193, TC-196, TC-FLOW-18 / **R-17·R-18·R-11·R-15·R-29·R-30·R-01**(기본 마우스 값) → TC-014, TC-025 ~ TC-027, TC-033, TC-058, TC-074, TC-089, TC-090, TC-170, TC-FLOW-04, TC-FLOW-07. 앞 추적표 그대로, 기대값만 이 절이 우선.

CR-038 추적 — 설계 항목 ↔ TC: bridge `DEFAULT_ASSET_SLOTS`(7개) → TC-177, TC-182, TC-FLOW-15 / `hasBuiltinDefault('hair')` true → TC-192, TC-193 / `DEFAULT_MOUSE_SETTINGS`(558,500)·(356,504)·true → TC-014, TC-025, TC-089, TC-170, TC-033. 사용자행 ↔ TC-FLOW: S-14 → TC-FLOW-15, S-16 → TC-FLOW-17, S-17 → TC-FLOW-18(L-2).

CR ↔ TC: CR-038 → 개정 TC-133·TC-137·TC-142·TC-177·TC-178·TC-179·TC-180·TC-182 ~ TC-185·TC-187·TC-189·TC-191·TC-192·TC-FLOW-15·TC-FLOW-17(스펙 반영) / TC-014·TC-025·TC-026·TC-027·TC-033·TC-058·TC-074·TC-089·TC-090·TC-170·TC-193·TC-196·TC-FLOW-04·TC-FLOW-07·TC-FLOW-18(v13 후속 — 스펙 반영) / 수동 M-29·M-30·M-32 개정.

스펙 반영 세부(v13 후속): `MousePartsTab.test.tsx` — `DEFAULT_MOUSE_EXPECTED` = bridge 기본값(penMode **true**, mouse null 저장의 바탕), 새 `RESET_EXPECTED` = `{...DEFAULT_MOUSE_EXPECTED, penMode:false}`(MOUSE에서 리셋 — CR-033 결정 ① 보존, TC-025 첫째·TC-089·TC-FLOW-07). TC-014 마커 (558,500) → `left 279px · top 250px`(scale 0.5). TC-090 펜 손 `[356,456)×[504,584)`, grab (44,56), 이동 뒤·저장 penPos **(456,544)**(옛 (480,536)). `SettingsApp.test.tsx` — 리셋 기대 상수 shoulder·penPos만 교체(penMode false 유지 — MOUSE 보존). `PenMode.test.tsx` TC-170 — penPos 리터럴 (356,504). `Hair.test.tsx` — 도우미 `hairReset`(`뒷머리 기본 그림으로 되돌리기`), 픽스처 `HAIR_DEF`(hair url `?v=d` — 복원 응답), TC-193(빈 칸도 활성·`뒷머리 그림 지우기` 없음)·TC-196(복원 확인창 → `restoreDefaultAsset('hair')`)·TC-FLOW-18(Step 3 복원 → Step 4 미리보기 `[hair?v=d, mouse_base, kb_up]`, `removeAsset` 0회).

설계 확인 필요 (CR-038, 관리자 인계)

- **L-1. 화면 문서 미동기화.** `src/settings/requirements.md`·`design.md`·`design/images-tab.md`(§3 검증 예 CR-035 예 4의 `key_space` 복원·CR-037 `hair` clear, §10 「15장」)·`design/i18n.md`에 CR-038 기록이 없다. 스펙은 확정사항 §6·`src/bridge/types.ts`를 따랐다 — ui-designer 동기화 필요.
- **L-2. S-17 · R-34 「필요 없어져 비운다」.** `hair`가 복원 칸이 되어(확정사항 §6 CR-035 결정 「기본 그림이 있는 칸은 비우기 없음」) 화면에서 뒷머리를 **비울 방법이 없다**. requirements R-34 「내장 기본 그림 없음 → 기본값=비우기」·S-17 행 문구와 TC-FLOW-18 마지막 단계(비우기)가 모순. 「뒷머리를 안 쓰고 싶은 사용자」 경로를 둘지(요구 결정) 확인 필요 — 지금은 TC-FLOW-18을 「복원」으로 개정 제안. **→ 사용자 결정(2026-09-25): 뒷머리 카드에만 별도 「비우기」 단추**(「기본값」 = 복원, 「비우기」 = `removeAsset('hair')` 확인창). 설계는 ui-designer 몫, 「비우기」 단추 TC(와 TC-FLOW-18 비우기 단계 재추가)는 설계 확정 뒤 별도 위임. 이번 개정(TC-193 `뒷머리 그림 지우기` 부재 단언 포함)은 그때 다시 본다.
- **L-3(닫음 — v13 후속).** `test/manual-checklist.md` M-29·M-30·M-32 개정 완료(v8). M-31은 기본 세트 수와 무관해 불변.
- **L-4. K-2 재확인.** `settings.mouse` null에서 `pen_up` 첫 등록·교체 `penPos` = (356,504)(새 기본 `pen_up` 136×196 자리). 사용자가 다른 크기 그림을 넣어도 그 자리 — 설계 식 그대로 고정(TC-148 둘째·TC-170).
- **L-5. `src/overlay/` 쪽 기대값**(예: overlay `mouseMapping.test.ts` 기본값 사용 TC)은 이 문서 범위 밖 — 해당 화면 담당자 몫.

### CR-038 R-35 개정 (v14 — 뒷머리 「비우기」 버튼, 증분 모드)

비유: 뒷머리 칸에만 지우개 단추를 하나 더 달았다. 테스트는 「지우개가 뒷머리 칸에만 있는가」, 「그림이 있을 때만 눌리는가」, 「확인을 거쳐 정확히 뒷머리 한 장만 지우는가」, 「지운 뒤 포커스가 어디로 가는가」를 본다.

- **v14 기준(이 절이 앞 모든 기준 줄·CR 절보다 우선)**: `src/settings/requirements.md` **v1.13**(R-35·R-36·S-18 신설, R-31 폐기 → R-36, R-32·R-34 부분 대체) · `design/images-tab.md` §3 검증 예(CR-038 R-35 줄)·§3.1 개정 줄·§11.1 ~ §11.7 · `design/i18n.md` §4.8 · contract v0.18(새 command·event·에러 코드 없음 — `remove_asset` 재사용). 앞 절 L-1(화면 문서 미동기화)은 v1.13·§11로 해소
- **범위·수(v14)**: 유효 요구 R-01 · R-03 · R-04 · R-10 · R-11 · R-12 · R-15 ~ R-18 · R-20 ~ R-30 · R-32 ~ R-36(R-19 폐기 → R-27, **R-31 폐기 → R-36**). 자동 TC 번호 207개(TC-001 ~ TC-207) 중 **유효 201 · 폐기 6** · TC-FLOW 19개(TC-FLOW-01 ~ TC-FLOW-19) · 수동 33개(M-01 ~ M-33)
- **mock·시간 규약(v14)**: 새 mock 없음 — `removeAsset`·`restoreDefaultAsset`·`importAsset`·`pickPngFile` 재사용, 슬롯 인자 문자열 `'hair'`. `imageSlots`(`EMPTYABLE_SLOT_KEYS`·`slotCard`·`buildSlotGroups`)·`bridge/types`·i18n 사전은 실물. 매니페스트 교체(`assets://changed`)는 props 재렌더. 시간 의존 없음 — deferred promise + `waitFor` 조건(실제 sleep·가짜 시계 없음)
- **스펙 파일(v14)**: `test/Hair.test.tsx` — 신규 TC-200 ~ TC-207·TC-FLOW-19, 개정 TC-193(주석만)·TC-FLOW-18. 순수 모듈(TC-200)·사전(TC-203)도 뒷머리 비우기 한 파일에 모았다. 개정 TC-192(`test/imageSlots.test.ts`)·TC-094(`test/i18n.test.ts`)는 아래 표 — **스펙 전사 대기**(N-6)
- 픽스처(Hair.test.tsx 추가): `CLEAR_DESC` = `‘뒷머리’ 그림을 지울까요? 되돌릴 수 없습니다.`, `IO_FAIL` = `{code:'asset.io', message:'뒷머리 파일을 지우지 못했습니다. (테스트)'}`, `GONE` = `{code:'asset.not_found', message:'hair.png 없음 (테스트)'}`. 기존 `NO_HAIR`·`HAIR`·`HAIR_DEF`(기본 뒷머리 `?v=d`)·`PATH` 재사용. 도우미 `hairEmpty()` = 뒷머리 카드 안 이름 `뒷머리 그림 비우기` 버튼

#### v14 개정 TC (앞 본문을 대체 — 번호 유지)

| 개정 TC | 스펙 | Given / When 변화 | Then ⓐ 화면 · ⓑ 상태/반환 · ⓒ bridge (새 기대) | 스펙 반영 |
|---|---|---|---|---|
| TC-192 | `imageSlots.test.ts` | 불변 | ⓑ 빈 hair 스펙 `toStrictEqual` 기대에 `emptyable: true`·`canEmpty: false` 두 필드 추가(나머지 불변 — 필드가 늘어 옛 기대는 구현 뒤 깨진다), 등록 hair `toMatchObject`에 `emptyable: true`·`canEmpty: true`, `background` = `emptyable: false`·`canEmpty: false` ⓐ·ⓒ 없음 | 반영(후속 전사) |
| TC-094 | `i18n.test.ts` | 불변 | ⓑ `simpleKeys(ko)` 길이 92 → **94**(i18n §4.8 +2 `emptyImage`·`emptyImageAria`, 주석 「CR-038 R-35: +2」), 나머지 불변 ⓐ·ⓒ 없음 | 반영(후속 전사) |
| TC-193 | `Hair.test.tsx` | 불변 | 단언 불변. `뒷머리 그림 지우기` 부재 단언은 새 버튼 이름 `뒷머리 그림 비우기`와 겹치지 않으므로 **유지**(「기본값」이 비우기 칸 이름을 갖지 않음을 계속 고정). 옛 주석 「전용 「비우기」 단추는 L-2 설계 뒤」만 「TC-200 ~ TC-207」로 갱신 | 반영 |
| TC-FLOW-18 | `Hair.test.tsx` | Steps 재추가(L-2 닫음): TC-194 → TC-193(등록 뒤) → TC-198(`[hair, mouse_base, kb_up]`) → TC-196(복원 → `HAIR_DEF`) → TC-198(`[hair?v=d, mouse_base, kb_up]`) → **TC-205(「비우기」 → 「지우기」 → `removeAsset('hair')`·포커스)** → **TC-198(헤어 없으면 미렌더)** → M-32·M-33. 상태 전달: Step 3 응답 `HAIR_DEF`가 Step 4·5 Given, Step 5 응답 `NO_HAIR`가 Step 6 Given | ⓐ Step 5 뒤 뒷머리 카드 `img` 없음·「비우기」 비활성·포커스 뒷머리 「이미지 변경」, Step 6 미리보기 `[mouse_base, kb_up]`(헤어 없음) ⓑ 매니페스트 `NO_HAIR` → `HAIR` → `HAIR_DEF` → `NO_HAIR` ⓒ `importAsset('hair', PATH)` 1회 → `restoreDefaultAsset('hair')` 1회 → `removeAsset('hair')` 1회, `setSettings` 0회. 제목 끝 「… 필요 없어져 「비우기」로 없앤다」 | 반영 |
| TC-136 · TC-151 · TC-FLOW-15 · TC-194 · TC-195 · TC-196 · TC-143 | `ImagesTab.test.tsx`·`Hair.test.tsx` | 불변 | 단언 불변 — 셋째 버튼은 뒷머리 카드에만: TC-151은 `kb_up` 카드만, TC-FLOW-15는 카드마다 `[1]`(=「기본값」)만, TC-194·TC-196의 「카드 버튼 전부 비활성」은 「비우기」도 `slotBusy` 중 비활성이라 그대로. TC-143(기존 비우기 칸 — 포커스 = 누른 「기본값」)은 `focusAfter` 없는 경로의 **회귀 감시** | 불변 |

#### v14 신규 TC

### TC-200 · slotCard emptyable·canEmpty — hair 등록/미등록/다른 칸 · 종류: 자동 · 요구: R-35, R-34 · 설계: images-tab §3 검증 예(CR-038 R-35 줄), §11.3 `imageSlots.ts`(`EMPTYABLE_SLOT_KEYS`·`emptyable`·`canEmpty`·add 카드엔 없음) · 스펙: `test/Hair.test.tsx` · **신규(CR-038 R-35)**
- Given `HAIR`(hair 등록) · `NO_HAIR`(hair 없음) · When `slotCard(…, 'hair', 'hair', null)`, 다른 칸 `slotCard`, `buildSlotGroups`
- Then ⓐ 화면: 해당 없음 ⓑ 반환: `EMPTYABLE_SLOT_KEYS` = `['hair']`. 예 1 hair 등록 = `{emptyable: true, canEmpty: true, resetKind: 'restore', canReset: true}` / 예 2 hair 미등록 = `{emptyable: true, canEmpty: false, resetKind: 'restore', canReset: true}` / 예 3 다른 칸 — `kb_up`(등록·복원)·`background`(미등록·복원)·`kb_down_0`(여러 장)·`mouse_base`(등록)·`idle`·`mouse_left`(비우기 칸) 모두 `{emptyable: false, canEmpty: false}`. `buildSlotGroups(HAIR)` 슬롯 카드 중 `emptyable`·`canEmpty`가 true인 key = `['hair']`뿐, `buildSlotGroups(NO_HAIR)` `emptyable` = `['hair']`·`canEmpty` = 없음, `type:'add'` 카드(`kb_down_1`)에는 `emptyable` 키가 없다 ⓒ bridge: 없음

### TC-201 · 뒷머리 카드만 버튼 3개·두 줄 배치 클래스 · 종류: 자동 · 요구: R-35, R-28, R-34 · 설계: images-tab §11.2 ASCII(윗줄 이미지 변경 / 아랫줄 기본값·비우기), §11.3 `ImageSlotCard` props(`onEmpty` 있을 때만 셋째 버튼)·렌더(`cardEmptyable`·`actions2`·순서·aria-label·`outline`·`title` 없음)·CSS·`ImagesTab` 렌더 3′′, §11.6 포커스 순서(DOM 순서), i18n §4.8 · 스펙: `test/Hair.test.tsx` · **신규(CR-038 R-35)**
- Given `HAIR` · When 렌더
- Then ⓐ 화면: 뒷머리 카드 버튼(DOM 순서) 글자 `[이미지 변경, 기본값, 비우기]`·aria-label `[뒷머리 이미지 변경, 뒷머리 기본 그림으로 되돌리기, 뒷머리 그림 비우기]`·전부 활성·`type="button"`, 「비우기」 `title` 없음·className = 「기본값」 className(`.outline`), 세 버튼이 같은 부모이고 그 className에 `actions2`, 카드 className에 `cardEmptyable`(+ `kb_up` 카드의 기본 카드 클래스 전부). 다른 슬롯 카드 24장은 버튼 `[이미지 변경, 기본값]` 2개·카드 className에 `cardEmptyable` 없음·버튼 줄 className에 `actions2` 없음(`kb_up`은 `actions` 있음). 탭 전체에서 이름이 `… 그림 비우기`로 끝나는 버튼 1개 ⓑ 상태: hair 스펙 `emptyable: true`·`canEmpty: true` ⓒ bridge: `pickPngFile`·`importAsset`·`removeAsset`·`restoreDefaultAsset`·`setSettings` 0회

### TC-202 · 「비우기」 활성 규칙 — 미등록·slotBusy 동안 비활성 · 종류: 자동 · 요구: R-35 · 설계: §11.3 렌더 `disabled={disabled || !canEmpty}`, §11.4 `onRequestEmpty`(slotBusy·`!canEmpty` 무시), §11.5 I-11 전제(등록돼 있고 `slotBusy` 없음)·I-3R(빈 칸이어도 「기본값」 활성), §11.6(비활성은 건너뜀) · 스펙: `test/Hair.test.tsx` · **신규(CR-038 R-35)**
- Given `NO_HAIR` → props `HAIR`, `importAsset` deferred · When 비활성 「비우기」 클릭 → 재렌더 → `기본 이미지 변경`(kb_up) 클릭(진행 중) → 「비우기」 클릭 → 응답
- Then ⓐ 화면: `NO_HAIR`에서 「비우기」 **비활성**·글자 `비우기`·`title` 없음, 「기본값」(복원)·「이미지 변경」 활성, 눌러도 `alertdialog` 없음 / `HAIR` 재렌더 뒤 활성 / kb_up 가져오기 진행 중 「비우기」 비활성·눌러도 `alertdialog` 없음 / 응답 뒤 다시 활성 ⓑ 상태: hair `canEmpty` false → true, `slotBusy` kb_up → null ⓒ bridge: `importAsset('kb_up', PATH)` 1회, `removeAsset`·`restoreDefaultAsset`·`setSettings` 0회

### TC-203 · 사전 emptyImage·emptyImageAria 3개 국어 · 종류: 자동 · 요구: R-35, R-20 · 설계: i18n §4.8 표, images-tab §11.6 aria-label · 스펙: `test/Hair.test.tsx` · **신규(CR-038 R-35)**
- Given `ko`·`ja`·`en` 사전 · When 값 읽기·`format(emptyImageAria, {name: slots.hair.title})`
- Then ⓐ 화면: 해당 없음 ⓑ 값: ko `비우기` / `{name} 그림 비우기` → `뒷머리 그림 비우기`, ja `削除` / `{name}の画像を削除` → `後ろ髪の画像を削除`, en `Clear` / `Clear image: {name}` → `Clear image: Back hair`. 세 언어 모두 `emptyImage` ≠ `clearImage`(「기본값」과 글자 구분), `emptyImageAria` ≠ `restoreImageAria`·`changeImageAria`, ko `emptyImageAria` ≠ `clearImageAria` ⓒ bridge: 없음

### TC-204 · 「비우기」 확인창 — 취소·Esc · 종류: 자동 · 요구: R-35, R-25 · 설계: §11.4 `onRequestEmpty`(resetKind clear, name = 뒷머리)·`onCancelReset`, §11.5 I-11 오류 열(취소·Esc)·confirm 표(필수·danger·2단추·기존 문구), §6 4′ `'clear'` 행 · 스펙: `test/Hair.test.tsx` · **신규(CR-038 R-35)**
- Given `HAIR` · When 「비우기」 → 「취소」 / 「비우기」 → Esc
- Then ⓐ 화면: `alertdialog`(`aria-modal="true"`, 이름 `그림 지우기`, 설명 `CLEAR_DESC`, 버튼 `[지우기, 취소]`, 「지우기」 className에 `danger`, 포커스 「취소」), 취소·Esc 뒤 닫힘·포커스 **「비우기」**(누른 버튼, 아직 활성), 그림 그대로 ⓑ 상태: `confirm`(resetKind clear, focusAfter = 뒷머리 「이미지 변경」) → null ⓒ bridge: `removeAsset`·`restoreDefaultAsset`·`importAsset`·`setSettings` 0회, `window.confirm` 0회

### TC-205 · 「비우기」 확정 → removeAsset('hair') 1회·포커스 「이미지 변경」 · 종류: 자동 · 요구: R-35, R-34 · 설계: §11.3 `changeRef`·`focusAfter`, §11.4 `onConfirmClear` 개정(`focusAfter ?? trigger`, `removeAsset` 1회·`restoreDefaultAsset` 0회)·주(다시 채우지 않음), §11.5 I-11 정상, contract `remove_asset` 재사용 · 스펙: `test/Hair.test.tsx` · **신규(CR-038 R-35)**
- Given `HAIR`, `removeAsset` deferred → `NO_HAIR` · When 「비우기」 → 「지우기」 → 응답 → props `NO_HAIR`
- Then ⓐ 화면: 확정 즉시 확인창 닫힘·카드 버튼 전부 비활성, 응답 뒤 포커스 뒷머리 **「이미지 변경」**(props 전이라 그림 그대로), 재렌더 뒤 `img` 없음·`등록된 그림 없음`·「비우기」 비활성·「기본값」 활성·포커스 유지, 뒷머리 카드 `alert` 없음 ⓑ 상태: `confirm` → null, `slotBusy` hair → null, `cardError` 없음 ⓒ bridge: `removeAsset('hair')` 정확히 1회, `restoreDefaultAsset`·`importAsset`·`pickPngFile`·`setSettings` 0회, `onError` 0회

### TC-206 · 「비우기」 실패 → 뒷머리 카드 오류 띠 · 종류: 자동 · 요구: R-35, R-20 · 설계: §11.4 `onConfirmClear` 예외(reject → 그 카드 오류 띠), §11.5 I-11 오류(`asset.not_found`·`asset.io`·`asset.manifest`), §4 `cardError`, i18n §3 `errorText`·§4.6 · 스펙: `test/Hair.test.tsx` · **신규(CR-038 R-35)**
- Given `HAIR`, `removeAsset` reject `IO_FAIL`(ko) / `GONE`(en) · When 「비우기」 → 「지우기」
- Then ⓐ 화면: ko — 뒷머리 카드 `alert` = `IO_FAIL.message`, 그림 `asset://hair.png` 그대로, 「비우기」·「기본값」 활성, 포커스 뒷머리 「이미지 변경」(N-1), `kb_up` 카드 `alert` 없음 / en — 뒷머리 카드 `alert` = `en.errors['asset.not_found']` ⓑ 상태: `cardError.key` hair, `slotBusy` null ⓒ bridge: `removeAsset('hair')` 언어별 1회(합 2회), `restoreDefaultAsset`·`setSettings` 0회, `onError` 0회

### TC-207 · ja·en 뒷머리 「비우기」 버튼·확인창 문구 · 종류: 자동 · 요구: R-35, R-20 · 설계: i18n §4.8, images-tab §11.3 렌더, §11.5 confirm 표(기존 `confirmClear*`·`confirmCancel`) · 스펙: `test/Hair.test.tsx` · **신규(CR-038 R-35)**
- Given `HAIR`, `MessagesProvider` `ja` / `en` · When 렌더 → 「비우기」 → 취소
- Then ⓐ 화면: 뒷머리 카드 버튼 글자 `[changeImage, clearImage, emptyImage]`(그 언어 사전 값), 셋째 이름 `format(emptyImageAria, {name: slots.hair.title})`, 둘째 이름 `format(restoreImageAria, …)`, 확인창 이름 `confirmClearTitle`·설명 `format(confirmClearMessage, {name})`·버튼 `[confirmClearOk, confirmCancel]`·포커스 취소, 취소 뒤 포커스 셋째 버튼 ⓑ 상태: `confirm` → null ⓒ bridge: `removeAsset`·`restoreDefaultAsset`·`setSettings` 0회

v14 추적 — 요구 ↔ TC (앞 표와 겹치면 이 표 우선)

| 요구ID | 상태 | 자동 TC | 수동 | TC-FLOW |
|---|---|---|---|---|
| R-35 | 유효(신설 🔒) | TC-200, TC-201, TC-202, TC-203, TC-204, TC-205, TC-206, TC-207 | M-33 | TC-FLOW-18, TC-FLOW-19 |
| R-36 | 유효(신설 🔒 — R-31 이관) | TC-177, TC-182, TC-192, TC-193, TC-196(복원 응답 = 기본 뒷머리) — CR-038 개정 절 기대값 | M-29, M-30 | TC-FLOW-15, TC-FLOW-19(Given = 기본 뒷머리) |
| R-31 | **폐기(→ R-36)** | — (앞 R-31 행의 TC는 R-36으로 읽는다) | — | — |
| R-34 | 유효(부분 대체) | 앞 행 + TC-200, TC-201, TC-205 | M-32, M-33 | TC-FLOW-18, TC-FLOW-19 |
| R-32 | 유효(부분 대체) | 앞 행(TC-196 = hair 복원) | 같음 | TC-FLOW-16, TC-FLOW-18, TC-FLOW-19 |
| R-25 | 유효 | 앞 행 + TC-204 | 같음 | 같음 |
| R-28 | 유효 | 앞 행 + TC-201 | M-25, M-33 | 같음 |
| R-20 | 유효 | 앞 행 + TC-203, TC-206, TC-207 | M-33 | 같음 |
| 그 밖 유효 요구 | 유효 | 앞 추적 그대로 | 같음 | 같음 |

v14 추적 — 설계 항목 ↔ TC

| 설계 항목 | TC |
|---|---|
| images-tab §3 검증 예(CR-038 R-35 줄 — hair 빈/등록, 다른 카드 false) | TC-200, TC-192(개정) |
| §3.1 개정 줄(「기본값」 = 복원, 비우기 = 셋째 버튼) | TC-193, TC-196, TC-201 |
| §11.1 기본 세트 교체 영향(화면 코드 변경 없음) | CR-038 개정 절 TC-133·TC-137·TC-177·TC-182·TC-FLOW-15 등 |
| §11.2 레이아웃 ASCII·두 줄·미리보기 106px·높이 합산 280px·3개 국어 폭 검산 | TC-201(구조·클래스), M-33(치수·잘림) |
| §11.3 `imageSlots.ts` `EMPTYABLE_SLOT_KEYS`·`emptyable`·`canEmpty`·add 카드엔 없음 | TC-200 |
| §11.3 `ImageSlotCard` props `canEmpty`·`onEmpty`(있을 때만 셋째 버튼)·`changeRef` | TC-201, TC-202, TC-205 |
| §11.3 `ImageSlotCard` 렌더(`cardEmptyable`·`actions2`·순서·aria-label·disabled·onClick·`title` 없음) | TC-201, TC-202, TC-207 |
| §11.3 `ImageSlotCard.module.css`(`.cardEmptyable .preview` 106 · `.actions2` 격자 · `.primary` 전체 폭 · `.outline` 말줄임) | TC-201(클래스 부착), M-33(실측) |
| §11.3 `ImagesTab` 렌더 3′′(`canEmpty`·`onEmpty` — emptyable일 때만) | TC-201, TC-202 |
| §11.3 `ConfirmTarget.focusAfter` | TC-204(취소 = trigger), TC-205·TC-206(확정 = focusAfter) |
| §11.3 공용화 없음·`ConfirmDialog` 불변 | TC-204(기존 확인창 문구·버튼 구조) |
| §11.4 `onRequestEmpty`(무시 조건·setConfirm) | TC-202, TC-204 |
| §11.4 `onConfirmClear` 개정 / 기존 clear 칸 불변 | TC-205, TC-206 / TC-143(회귀) |
| §11.4 `onCancelReset` | TC-204, TC-207 |
| §11.4 주(다시 채우지 않음·펜 분기 무관) | TC-205(`setSettings`·`restoreDefaultAsset` 0회), M-33 6)(재실행) |
| §11.5 I-11 정상 / 오류 / confirm 표 | TC-205 / TC-204, TC-206 / TC-204 |
| §11.5 I-3R(뒷머리) | TC-196, TC-FLOW-19 |
| §11.6 접근성(포커스 순서·비활성 건너뜀·aria-label·확인창 규칙) | TC-201, TC-202, TC-204, M-33 |
| §11.7 파일 크기 | TC 대상 아님(구현 규칙 — golden-principles 400줄, ui-implementer·reviewer 게이트) |
| i18n §4.8 `emptyImage`·`emptyImageAria` | TC-203, TC-201, TC-207, TC-094(개정 — 키 수) |
| contract v0.18 `remove_asset` 재사용 | TC-205, TC-206 |

v14 추적 — 사용자행 ↔ TC-FLOW: **S-18**(R-35, R-34) → TC-FLOW-19 · **S-17**(R-34, R-36) → TC-FLOW-18(비우기 단계 재추가) · **S-14**(R-36) → TC-FLOW-15. 그 밖 행은 앞 표 그대로.

CR ↔ TC: CR-038(R-35) → 개정 TC-192·TC-094(전사 대기)·TC-193(주석)·TC-FLOW-18 / 신규 TC-200 ~ TC-207·TC-FLOW-19 / 수동 M-33 신설(아래, `manual-checklist.md` 전사 대기).

수동 M-33 (`test/manual-checklist.md` 「항목」 표 끝에 이 행을 그대로 옮긴다)

| # | 항목 | 절차 | 기대 | 관련 TC · 요구ID | 증거 | 확인 |
|---|---|---|---|---|---|---|
| M-33 | 뒷머리 「비우기」 실물 — 두 줄 버튼 3개 국어 × 최소 폭·실제 파일 삭제·키보드·낭독(CR-038, R-35 · R-28 · R-20) | 준비: 기본 세트가 채워진 설치(뒷머리 기본 그림 있음). 1) ko, 창 900×640 → 「이미지 설정」 배경 그룹 캡처 2) 창을 최소 720×480으로 줄여 캡처 3) 日本語·English로 바꿔 1)·2) 4) 개발자 도구로 뒷머리 카드·미리보기·버튼 두 줄 높이와 옆 「배경」 카드 치수를 잰다 5) Tab으로 뒷머리 카드 버튼을 지나간다, 내레이터로 셋째 버튼을 듣는다 6) 「비우기」 → 확인창 → 「지우기」 → `%APPDATA%\com.kuro.keyviewer\` 파일 목록·오버레이·「어깨축·손 위치」 미리보기를 본 뒤 앱을 종료했다 다시 켠다 7) 빈 상태에서 Tab 8) 「기본값」 → 「기본 그림으로」 | 1)~3) 뒷머리 카드만 버튼 두 줄: 윗줄 「이미지 변경/画像を変更/Change image」 전체 폭, 아랫줄 「기본값/リセット/Reset」·「비우기/削除/Clear」 반반 — 세 언어 × 두 폭(900·720) 모두 글자 잘림·말줄임·겹침 없음. 다른 카드는 버튼 한 줄 그대로 4) 뒷머리 카드 바깥 높이 280px = 옆 카드와 같음, 미리보기 106px(다른 카드 140px), 버튼 줄 64px(30 + 4 + 30), 아랫줄 두 버튼 폭 같고 간격 8px 5) 순서 이미지 변경 → 기본값 → 비우기, 낭독 「뒷머리 그림 비우기, 단추」(ja 「後ろ髪の画像を削除」, en 「Clear image: Back hair」) 6) 확인창 제목 「그림 지우기」·본문 「‘뒷머리’ 그림을 지울까요? 되돌릴 수 없습니다.」·「지우기」(위험색)·「취소」(처음 포커스). 확정 뒤 `hair.png` 없음, 오버레이·미리보기에서 뒷머리 사라짐, 포커스 링 = 뒷머리 「이미지 변경」, 다시 켜도 뒷머리가 채워지지 않는다(§11.4 주) 7) 「비우기」 흐림(비활성)·Tab이 건너뜀, 「기본값」은 활성 8) 기본 뒷머리 복원, 「비우기」 다시 활성. 사용자가 i18n §4.8 ja·en 열을 검수해 고칠 곳을 적는다 | TC-200 ~ TC-207 · TC-FLOW-18 · TC-FLOW-19 · R-35 · R-28 · R-20 · R-34 | 캡처(ko·ja·en × 900·720) + 치수 기록 | [ ] |

설계 확인 필요 (v14, 관리자 인계)

- **L-2 닫음(v14).** 사용자 결정대로 뒷머리 전용 「비우기」 버튼이 설계됐다(images-tab §11). TC-FLOW-18에 비우기 단계를 다시 넣었고, TC-193의 `뒷머리 그림 지우기` 부재 단언은 새 이름(`뒷머리 그림 비우기`)과 겹치지 않아 유지했다.
- **N-1. 실패 뒤 포커스.** §11.4 `onConfirmClear`는 호출 **전에** `pendingFocusRef = focusAfter ?? trigger`를 넣으므로 실패해도 포커스가 「이미지 변경」으로 간다. §11.5 I-11 오류 열·§11.6은 실패 때 포커스를 적지 않는다. 실패 때는 「비우기」가 활성으로 남으므로 「비우기」로 돌리는 것이 의도라면 설계 결정 필요. 스펙(TC-206)은 함수 명세대로 「이미지 변경」. **→ 닫음(관리자 결정 2026-09-25): 실패 뒤 포커스도 「이미지 변경」 그대로 — TC-206 단언 유지.**
- **N-2. ja 문구 겹침.** ja `emptyImageAria`(`{name}の画像を削除`) = ja `clearImageAria`, ja `emptyImage`(`削除`) = ja `confirmClearOk`. 뒷머리 카드 안에서는 「기본값」이 `restoreImageAria`라 이름이 겹치지 않아 스펙은 문제 삼지 않는다(TC-203은 ko만 `≠ clearImageAria`). §11.6 「같은 문구 버튼이 다른 카드에 없으므로」는 ko 기준 — ja·en 검수(M-33) 때 확인.
- **N-3. 표현 차이.** §3 검증 예 「`slotKey(slot) === 'hair'`」 vs §11.3 「`EMPTYABLE_SLOT_KEYS.includes(key)`」 — hair는 단일 슬롯이라 결과가 같다. 스펙은 결과와 상수 값만 단언한다.
- **N-4. requirements S-17 행 「사용 기능」 열**에 옛 「「기본값」 = 비우기 확인」이 CR-038 덧붙임과 함께 남아 있다 — 문구 정리 권고(ui-designer 몫, TC 영향 없음).
- **N-5. 스펙이 고정한 해석.** ① 「비우기」 className = 「기본값」 className(`.outline` 재사용) ② 카드 className에 `cardEmptyable`, 버튼 줄 className에 `actions2` 문자열 포함(CSS Modules 이름 유지 — 기존 `/danger/` 단언과 같은 방식) ③ ja·en §4.8 값 정확 비교(TC-203 — 앞 관례 「ja·en은 핵심어만」의 예외: 짧은 버튼 문구 두 개라 전사 오타 검출 우선. 사용자 검수로 바뀌면 i18n.md와 함께 고친다) ④ 실패 포커스 = 「이미지 변경」(N-1) ⑤ 비우기 성공·실패 모두 `onError` 0회(카드 오류 띠만) ⑥ `HAIR` 기준 다른 슬롯 카드 24장(슬롯 카드 25 − 뒷머리). 다르게 의도했다면 알려 달라.
- **N-6(닫음 — 2026-09-25 후속 위임에서 전사 완료: TC-192·TC-094 스펙, `manual-checklist.md` M-33·v9, 끝 변경이력 v14 행). 옛 기록:** 전사 대기(이번 위임 예산 소진). TC-192(`test/imageSlots.test.ts` 248 ~ 273행 기대에 두 필드), TC-094(`test/i18n.test.ts` 233행 92 → 94), `test/manual-checklist.md` M-33 행·변경이력 v9, 이 문서 끝 「변경이력」 v14 행. **구현 전에** 옮겨야 구현 뒤 TC-192·TC-094가 거짓 FAIL을 내지 않는다.

### CR-040 개정 (v15 — 팔·손 끌기 픽셀 판정 R-37 · 영역 상자 R-38, 증분 모드)

비유: 지금까지는 「액자 테두리 안이면 사진을 집었다」고 봤다. 이제는 「잉크가 묻은 자리를 눌렀을 때만 그 종이를 집는다」. 테스트는 「잉크 자리를 정확히 읽는가(마스크)」, 「겹친 곳에서 위 종이가 투명하면 아래 종이를 집는가(판정)」, 「잉크가 없으면 아무것도 안 집는가」, 「종이 범위를 파란·빨간 점선으로 보여 주고 끌 때 따라가는가(상자)」를 본다.

- **v15 기준(이 절이 앞 모든 기준 줄·CR 절보다 우선)**: `src/settings/requirements.md` **v1.14**(R-37·R-38·S-19 신설, 계약 변경 없음 §3.4) · `src/settings/design/drag-hit.md` §1 ~ §10(**관리자 결정: §2.3 마스크 없음·크기 다름 → 옛 사각형 판정 대체 채택**) · `design.md` RTM R-37·R-38 · §11 D-4 토큰 블록(`--st-outline-arm`·`--st-outline-pen`). contract 변경 없음(`AssetEntry.url` 재사용 — 새 command·event·타입 없음)
- **범위·수(v15)**: 유효 요구 R-01 · R-03 · R-04 · R-10 · R-11 · R-12 · R-15 ~ R-18 · R-20 ~ R-30 · R-32 ~ R-38(R-19 폐기 → R-27, R-31 폐기 → R-36). 자동 TC 번호 225개(TC-001 ~ TC-225) 중 **유효 219 · 폐기 6** · TC-FLOW 20개(TC-FLOW-01 ~ TC-FLOW-20) · 수동 34개(M-01 ~ M-33 + **M-40a**)
- **mock·시간 규약(v15)**: `vi.mock('../components/useAlphaMask')`는 `test/DragHit.test.tsx`에만 둔다 — `vi.hoisted` Map(url → 마스크), 없는 url·`undefined` → `null`, named(`useAlphaMask`)·`default` 둘 다 같은 `vi.fn`, 매 테스트 `vi.resetAllMocks()` 뒤 구현 재설치, Map은 렌더 **전**에 채운다. 다른 스펙 파일은 mock 없음 → jsdom이 이미지를 로드하지 않아 마스크 `null` → 사각형 대체(drag-hit §5.3 테스트 이음새 — 기존 끌기 TC 결과 불변). 훅 단위(TC-213 ~ TC-215)는 `vi.stubGlobal('Image', FakeImage)`(속성 설정 순서 기록) + `HTMLCanvasElement.prototype.getContext` spy(가짜 ctx), `onload`·`onerror`를 테스트가 `act` 안에서 직접 부른다. CSS 규칙(TC-217)은 `fs.readFileSync` 원문(`?raw`는 vitest가 `.module.css`를 CSS Modules로 처리해 collect 실패 — overlay `overlayStyles.test.ts` 교훈). **시간 의존 없음**(실제 sleep·가짜 시계 없음 — deferred 없이 `waitFor(onError 호출)` 조건)
- **스펙 파일(v15)**: 신규 `test/alphaMask.test.ts`(TC-208·TC-209·TC-213 ~ TC-215) · `test/DragHit.test.tsx`(TC-216 ~ TC-225·TC-FLOW-20) / 개정 `test/mouseWizard.test.ts`(TC-210 ~ TC-212 추가, import `hitOpaque`·`DragCandidate`·`AlphaMask`) · `test/MousePartsTab.test.tsx`(도우미 `expectNoPadBox`·TC-085 이름) · `test/SettingsApp.test.tsx`(도우미 `padBox`)
- **선행(v15)**: CR-040 소스 미적용(CR 대장 CR-040 「설계 완료·소스 미적용」) — `alphaMask.ts`·`components/useAlphaMask.ts`·`components/PartOutline.tsx`·`PartOutline.module.css`·토큰 2개·`mouseWizard.ts` `hitOpaque`·`MousePartsTab` 개정 없음. 따라서 `alphaMask.test.ts`·`DragHit.test.tsx`는 import 단계에서 파일 전체 FAIL, `mouseWizard.test.ts`는 TC-210 ~ TC-212만 FAIL(`hitOpaque` undefined — `DragCandidate`·`AlphaMask`는 타입이라 실행 영향 없음, `yarn tsc --noEmit`은 거부)이 예정된 실패다. 개정 도우미 2개는 현행 소스에서도 PASS
- **픽스처(`DragHit.test.tsx`)**: 캔버스 900×700 · scale 0.5 · rect 0. `DEF` = `body` 900×700 + `mouse_base` **171×199** + `pen_up` **136×196**(기본 그림 크기). `SETTINGS.mouse` = shoulder (558,500) · area `DEFAULT_AREA` · hand null · **partPos (389,492)** · **penPos (356,504)** · penMode true. 겹친 점 P = 캔버스 (450,600) = 오프셋 (225,300)(팔 기준 (61,108) · 펜 손 기준 (94,96)). 이동 오프셋 (235,290) = 캔버스 (470,580) → 팔 **(409,472)** / 펜 손 **(376,484)**(제한 범위 안). 마스크 = 그림 크기 0 채움 + 지정 픽셀 한 점(`setMasks(팔 알파, 펜 손 알파)`, `null` = 그 그림 마스크 없음). 표시 단언 = 그림 `<img>`·상자(`[data-testid="outline-arm|pen"]`) 인라인 style(캔버스 × 0.5 px) + `dt` 「파츠 위치」/「손 위치」 다음 `dd` 정확히 `({x}, {y})`. 팔 (389,492) = `left 194.5px · top 246px`, 상자 `85.5px × 99.5px` / 팔 (409,472) = `204.5px · 236px` / 펜 손 (356,504) = `178px · 252px`, 상자 `68px × 98px` / 펜 손 (376,484) = `188px · 242px`. `NO_PEN`·`NO_ARM`·`BODY_ONLY`·`BIG_ARM`(`mouse_base` 200×150)·`EMPTY`. `IO_ERR` = `{code:'settings.io', message:'설정 파일을 저장하지 못했습니다.'}`

#### v15 개정 TC (앞 본문을 대체 — 번호 유지)

| 개정 TC | 스펙 | Given / When 변화 | Then ⓐ 화면 · ⓑ 상태/반환 · ⓒ bridge (새 기대) | 스펙 반영 |
|---|---|---|---|---|
| TC-078 · TC-079 | `mouseWizard.test.ts` | 불변 — 인자는 `mask` 키가 없는 `DragCandidate` | 기대 불변(drag-hit §5.2 `pickDragTarget` 「기존 호출(`mask` 없는 객체)은 옛 사각형 결과와 같다」 · §2.3). 설계 근거 줄만 CR-040으로 갱신(본문 아래 **CR-040 개정** 줄) | 주석(새 describe 머리) |
| TC-085 | `MousePartsTab.test.tsx` | 전제 명시 — 이 파일은 `useAlphaMask` mock 없음 → jsdom 마스크 `null` → 사각형 대체 | 제목 「겹침 시 펜 손 우선」 → 「마스크 없음(사각형 대체)일 때 겹침은 펜 손 우선」. 단언 불변. 둘 다 불투명 = TC-220 ①, 펜 손 투명·팔 칠함 = TC-218 | it 이름·주석 |
| TC-082 · TC-090 · TC-199 | `MousePartsTab.test.tsx` | 불변 | 불변(마스크 `null` → 사각형 대체, drag-hit §9) | 불변 |
| TC-011 · TC-030 | `MousePartsTab.test.tsx` | 불변 | 도우미 `expectNoPadBox`가 「미리보기 안 `span[aria-hidden]` = 패드 박스」로 판정하므로 새 영역 상자(`[data-testid^="outline-"]`, aria-hidden span)를 **빼고** 판정. 기대(패드 박스 없음 · 나머지 span = 축 마커 `role=img`) 불변 — 설계 확인 P-1 | 도우미 개정 |
| TC-035 · TC-037 · TC-FLOW-02 | `SettingsApp.test.tsx` | 불변 | 도우미 `padBox`에 같은 제외(`:not([data-testid^="outline-"])`). 기대 불변 — P-1 | 도우미 개정 |
| TC-091 · TC-198 · TC-080 | `MousePartsTab.test.tsx` | 불변 | 불변 — 상자는 aria-hidden이라 역할 `img` 수(축 마커 1)에 들지 않고, 문서 순서 단언은 쌍 비교라 사이에 상자가 끼어도 성립 | 불변 |
| TC-094 | `i18n.test.ts` | 불변 | 불변 — 새 문구 키 없음(drag-hit §8). 단순 키 94 그대로가 회귀 확인 | 불변 |

#### v15 신규 TC

### TC-208 · buildAlphaMask — 알파만 행 우선 복사·입력 불변·null 조건 · 종류: 자동 · 요구: R-37 · 설계: drag-hit §5.1 `AlphaMask`·`buildAlphaMask`·예, §3 `alphaMask`(순수 모듈) · 스펙: `test/alphaMask.test.ts` · **신규(CR-040)**
- Given RGBA 2×1 `[0,0,0,0, 9,9,9,255]` · 2×2 알파 `1·128·0·7` · 2×1에 3픽셀분(길이 12) 배열 / 잘못된 입력 6건: 길이 4 배열 2×1, 폭 0, 높이 0, 폭 −2, 폭 1.5(길이 충분), 높이 NaN
- When `buildAlphaMask(rgba, w, h)` → 호출 뒤 입력 배열 `rgba[7] = 0`
- Then ⓐ 화면: 해당 없음(순수 함수) ⓑ 반환: `{width 2, height 1}`, `alpha`는 `Uint8Array`이고 `[0, 255]`, 2×2 → `[1, 128, 0, 7]`(행 우선), 긴 배열 → 길이 2 `[5, 6]`; 입력 배열 값 불변, 호출 뒤 입력을 바꿔도 `alpha[1]` 255(복사본); 잘못된 입력 6건 모두 `null` ⓒ bridge: 없음

### TC-209 · isOpaqueAt — 내림·행 우선 색인·밖 false · 종류: 자동 · 요구: R-37 · 설계: drag-hit §5.1 `isOpaqueAt`·예 · 스펙: `test/alphaMask.test.ts` · **신규(CR-040)**
- Given `m` = 2×1 알파 `[0, 255]`, `m32` = 3×2 알파 `[0,0,1, 0,0,0]`
- When `isOpaqueAt(mask, x, y)`
- Then ⓐ 화면: 해당 없음 ⓑ 반환: (설계 예) (0,0) false · (1,0) true · (2,0) false · (−1,0) false; (1.9, 0.99) true · (0.99, 0) false · (−0.5, 0) false · (1,1) false · (1,−1) false; `m32` (2,0) true(알파 1도 칠함) · (1,0) false(열 우선 색인이면 true — 행 우선 구분) · (0,1) false ⓒ bridge: 없음

### TC-210 · hitOpaque — 사각형 예비 판정 뒤 픽셀, 마스크 없음·크기 다름 → 사각형 대체 · 종류: 자동 · 요구: R-37 · 설계: drag-hit §5.2 `DragCandidate`·`hitOpaque` ①②③, §2.3 · 스펙: `test/mouseWizard.test.ts` · **신규(CR-040)**
- Given `c` = pos (10,20) · size 3×2(사각형 [10,13)×[20,22)) · mask 3×2(그림 기준 (1,0) 알파 255 · (2,1) 알파 1)
- When `hitOpaque(point, c)` / 같은 사각형에 mask `null`·키 없음·2×2(전부 0)·3×3(전부 0) / 크기 폭 0(mask null)·높이 −1(칠한 마스크)
- Then ⓐ 화면: 해당 없음 ⓑ 반환: (11,20) true · (12,21) true · (10,20) false(사각형 안 투명) · (12,20) false · (13,20) false(우단 제외) · (9,20) false; mask null·없음·폭 다름·높이 다름 → (10,20) true(사각형 대체 — 크기 다른 마스크는 전부 0이어도 쓰지 않음), mask null (13,20) false; 폭 0 → false, 높이 −1 → false(마스크와 무관) ⓒ bridge: 없음

### TC-211 · pickDragTarget — 겹친 점 (450,600) 설계 예 표 6행 · 종류: 자동 · 요구: R-37, R-11, R-18 · 설계: drag-hit §5.2 `pickDragTarget`(CR-040 개정) ①②③·예 표 · 스펙: `test/mouseWizard.test.ts` · **신규(CR-040)**
- Given 팔 `{pos (389,492), size 171×199}`, 펜 손 `{pos (356,504), size 136×196}`(기본 그림), 누른 점 (450,600) — 팔 기준 (61,108) · 펜 손 기준 (94,96). 마스크 = 그림 크기 0 채움 + 그 한 점만 표의 알파
- When `pickDragTarget((450,600), pen, part)`
- Then ⓐ 화면: 해당 없음 ⓑ 반환: 펜 손 0·팔 255 → `'part'` / 255·255 → `'pen'` / 255·0 → `'pen'` / 0·0 → `null` / 펜 손 마스크 `null`·팔 255 → `'pen'`(사각형 대체) / 펜 손 마스크 10×10·팔 255 → `'pen'`(크기 다름 → 사각형 대체) ⓒ bridge: 없음

### TC-212 · pickDragTarget — 펜 손 사각형에만 든 점 (370,520) · 종류: 자동 · 요구: R-37, R-18 · 설계: drag-hit §5.2 예 아래 줄 · 스펙: `test/mouseWizard.test.ts` · **신규(CR-040)**
- Given TC-211 두 후보, 점 (370,520) — 펜 손 기준 (14,16), 팔 사각형 밖(x < 389)
- When 펜 손 (14,16) 알파 0 / 128, 팔 마스크 (61,108)=255 또는 `null`
- Then ⓐ 화면: 해당 없음 ⓑ 반환: 펜 손 0 → `null`(팔 마스크 255여도, 팔 마스크 `null`로 사각형 대체여도 밖이라 `null`), 펜 손 128 → `'pen'` ⓒ bridge: 없음

### TC-213 · useAlphaMask 정상 — 따로 만든 Image·crossOrigin 먼저·화면 밖 캔버스·재렌더 재사용 · 종류: 자동 · 요구: R-37 · 설계: drag-hit §5.3 시그니처·상태·효과 ①②③④⑥·반환·성능, §2.1 결론(마스크용 `Image` 따로, `crossOrigin` 없이 읽으면 오염), §4 `partMask`·`penMask` 초기값 `null`, §7 P-40a 정상 · 스펙: `test/alphaMask.test.ts` · **신규(CR-040)**
- Given 전역 `Image` = FakeImage(속성 설정 순서 기록), `HTMLCanvasElement.prototype.getContext` spy → 가짜 ctx(`drawImage` · `getImageData` → 지정 알파의 RGBA)
- When ① `renderHook(useAlphaMask(URL_A))` → FakeImage `onload`(자연 크기 3×2, 알파 `[0,10,0,255,0,0]`) → 같은 url로 재렌더 ② 따로 `useAlphaMask(undefined)`
- Then ⓐ 화면: 해당 없음 — 만든 캔버스는 DOM에 붙지 않음(`isConnected` false) ⓑ 상태(반환): ① 로드 전 `null` → `{width 3, height 2, alpha: Uint8Array [0,10,0,255,0,0]}`, 재렌더 뒤 **같은 객체**·Image 1개 그대로 ② `null`·Image 0개·`getContext` 0회 ⓒ 호출: Image 속성 순서 정확히 `['crossOrigin=anonymous', 'src=URL_A']`, `decoding` `'async'`, `getContext('2d', { willReadFrequently: true })` 1회, 캔버스 3×2, `drawImage(img, 0, 0)`, `getImageData(0, 0, 3, 2)`; bridge 호출 없음(url만 사용 — 계약 변경 없음)

### TC-214 · useAlphaMask 실패 → null(던지지 않음·콘솔 없음·재시도 없음) · 종류: 자동 · 요구: R-37 · 설계: drag-hit §5.3 효과 ④(ctx 없음·try/catch)·⑤(onerror)·예외 행, §2.3, §7 P-40a 오류 · 스펙: `test/alphaMask.test.ts` · **신규(CR-040)**
- Given TC-213과 같음 + `console.error`·`console.warn` spy
- When ① `onerror` ② `getContext`가 `null`인 상태에서 `onload` ③ `getImageData`가 `DOMException(…, 'SecurityError')`를 던지는 상태에서 `onload`(각각 새 url·새 렌더)
- Then ⓐ 화면: 해당 없음 — 세 경우 모두 예외가 테스트로 새지 않음 ⓑ 반환: 셋 모두 `null`; ②는 `getImageData` 0회; Image 총 3개(재시도 없음) ⓒ 호출: `console.error`·`console.warn` 0회, bridge 호출 없음

### TC-215 · useAlphaMask url 교체·비움 — 즉시 null·옛 콜백 해제·늦은 옛 onload 무시 · 종류: 자동 · 요구: R-37 · 설계: drag-hit §4 둘째 줄(url 바뀜 → `null` 뒤 다시 생성, 비움 → `undefined`), §5.3 효과 ①(`setMask(null)`)·③ `cancelled`·⑦ 정리 함수, §7 P-40a(교체·비움) · 스펙: `test/alphaMask.test.ts` · **신규(CR-040)**
- Given TC-213과 같음, `URL_A` 로드 완료(3×2 마스크)
- When 옛 Image의 `onload`를 잡아 둔 뒤 `URL_B`로 재렌더(교체 — `?v=` 변경) → 잡아 둔 옛 `onload` 호출(늦은 도착 흉내) → 새 Image `onload`(1×1, 알파 `[200]`) → `undefined`로 재렌더(비움) → 언마운트
- Then ⓐ 화면: 해당 없음 ⓑ 반환: 3×2 마스크 → `URL_B` 재렌더 직후 `null` → 늦은 옛 onload 뒤에도 `null` → `{width 1, height 1, alpha [200]}` → 비움 직후 `null`; 언마운트 예외 없음 ⓒ 호출: 옛 Image `onload`·`onerror` = `null`(정리), 늦은 옛 onload로 `drawImage` 호출 수 늘지 않음, 새 Image 속성 순서 `['crossOrigin=anonymous', 'src=URL_B']`, 비움 뒤 새 Image 없음(총 2개)·`URL_B` Image `onload` = `null`

### TC-216 · PartOutline 렌더 — 좌표 × scale·장식 span·tone 클래스·그림 없으면 없음 · 종류: 자동 · 요구: R-38 · 설계: drag-hit §5.4 1·2·4, §3 `PartOutline` props·`<span>` 직접 사용(D-1), §8 장식 · 스펙: `test/DragHit.test.tsx` · **신규(CR-040)**
- Given ① `tone="arm"` pos (389,492) · size 171×199 · scale 0.5 ② 재렌더 `tone="pen"` pos (356,504) · size 136×196 · scale 2 ③ 빈 경우 4건: pos `null` / size `undefined` / 폭 0 / 높이 −1
- When 렌더
- Then ⓐ 화면: ① `span[data-testid="outline-arm"]`, `aria-hidden="true"`, `role`·`tabindex` 없음, 글자 없음, style `left 194.5px · top 246px · width 85.5px · height 99.5px` ② `outline-arm` 없음, `outline-pen` `aria-hidden="true"`·style `712px · 1008px · 272px · 392px`; className 두 토큰 — 첫 토큰(공통 `.outline`) 같음, 둘째 토큰 arm `/arm/` · pen `/pen/`·서로 다름 ③ 네 경우 모두 container 빈 문자열 ⓑ 상태: default export가 `React.memo` 형(`$$typeof` = `Symbol.for('react.memo')`) ⓒ bridge: 없음(순수 렌더)

### TC-217 · 상자 CSS 규칙·색 토큰(정적) · 종류: 자동 · 요구: R-38 · 설계: drag-hit §5.4 3·색 결정 표, §3 색 토큰 행, §6 `pointer-events: none`, `design.md` §11 D-4 토큰 블록 · 스펙: `test/DragHit.test.tsx` · **신규(CR-040)**
- Given `src/settings/components/PartOutline.module.css`·`src/settings/settings.module.css` 원문(`fs.readFileSync`, 주석 제거·공백 정규화)
- When `.outline`·`.arm`·`.pen` 블록과 `:global(body[data-window='settings'])` 토큰 블록을 읽는다
- Then ⓐ 화면(규칙): `.outline` = `position: absolute` · `box-sizing: border-box` · `border-width: 1px` · `border-style: dashed` · `pointer-events: none`; `.arm` = `border-color: var(--st-outline-arm)`; `.pen` = `border-color: var(--st-outline-pen)` ⓑ 토큰: `--st-accent`가 있는 같은 블록에 `--st-outline-arm: #1d4ed8;`·`--st-outline-pen: #e11d48;`(대소문자 무시), 같은 블록의 `--st-danger: #dc2626`·`--st-accent: #BE72AD`와 다른 값 ⓒ bridge: 없음. 실제 색·점선 모양은 M-40a

### TC-218 · 겹친 점 — 펜 손 투명·팔 칠함 → 팔 끌기, 파란 상자만 따라옴, partPos만 저장 · 종류: 자동 · 요구: R-37, R-38, R-11 · 설계: drag-hit §5.5 `onPreviewPointerDown`(마스크 주입)·렌더 3, §5.2 예 표 1행, §6 끌기 중 따라감·움직이지 않는 쪽 제자리, §7 P-40b·P-40c 정상, `design.md` P-5·`onPreviewPointerUp` · 스펙: `test/DragHit.test.tsx` · **신규(CR-040)**
- Given `DEF`·`SETTINGS`, 마스크 팔 (61,108)=255 · 펜 손 (94,96)=0, `setSettings`는 인자를 그대로 resolve
- When 누름 (225,300) → 이동 (235,290) → 놓기 → (settings://changed 흉내) props `withArm((409,472))`로 재렌더
- Then ⓐ 화면: 처음 팔·파란 상자·「파츠 위치」 `(389, 492)`, 펜 손·빨간 상자·「손 위치」 `(356, 504)`; 이동 중 팔 `<img>`·파란 상자 `left 204.5px · top 236px`(상자 `85.5px × 99.5px`)·「파츠 위치」 `(409, 472)`, 펜 손·빨간 상자·「손 위치」 `(356, 504)` 그대로; 놓은 뒤 수신 전 팔·파란 상자 `(389, 492)`(E-1 구조 — 상자도 그림과 같이), 재렌더 뒤 `(409, 472)`·펜 손 그대로 ⓑ 상태: `drag` = {target `'part'`, grab (61,108)} → 놓으면 `null`, `onError(null)` ⓒ bridge: `setPointerCapture(7)` 누름 직후 1회, `setSettings` 이동 중 0회·놓은 뒤 정확히 1회(재렌더 뒤에도), 인자 `toStrictEqual` `{ ...SETTINGS, mouse: { ...MOUSE, partPos: (409,472) } }`(`penPos` (356,504)·`penMode` true 보존)

### TC-219 · 두 그림 모두 투명한 자리 → 끌기 없음 · 종류: 자동 · 요구: R-37, R-38 · 설계: drag-hit §5.2 ③·예 표 4행, §5.5 `onPreviewPointerDown`(`null`이면 아무것도 안 함 → 뒤 `click`은 idle이라 무시), §6 「판정은 상자가 아니라 픽셀」, §7 P-40b 오류 · 스펙: `test/DragHit.test.tsx` · **신규(CR-040)**
- Given `DEF`·`SETTINGS`, 마스크 팔 (61,108)=0 · 펜 손 (94,96)=0(두 상자 안이지만 칠해지지 않은 자리)
- When 누름 (225,300) → 이동 (235,290) → 놓기 → click (235,290)
- Then ⓐ 화면: 팔·파란 상자·「파츠 위치」 `(389, 492)`, 펜 손·빨간 상자·「손 위치」 `(356, 504)` 내내 그대로, 안내 idle 문구, 축 마커 `축(어깨) (558, 500)` ⓑ 상태: `drag` `null` 유지, `onError` 호출 없음 ⓒ bridge: `setPointerCapture` 0회, `setSettings` 0회

### TC-220 · 펜 손이 칠해진 자리 → 손 끌기(① 둘 다 칠함 ② 펜 손만), 빨간 상자만 따라옴 · 종류: 자동 · 요구: R-37, R-38, R-18 · 설계: drag-hit §5.2 예 표 2·3행(둘 다면 위에 그려진 손), §5.5 `onPreviewPointerDown`, §6 끌기 중 따라감, `design.md` `onPreviewPointerMove`(펜 손 크기 기준 제한)·`onPreviewPointerUp`(CR-026) · 스펙: `test/DragHit.test.tsx` · **신규(CR-040)**
- Given `DEF`·`SETTINGS`, ① 마스크 팔 255 · 펜 손 255 ② 팔 0 · 펜 손 255(각각 새 렌더), `setSettings` 인자 그대로 resolve
- When 누름 (225,300) → 이동 (235,290) → 놓기
- Then ⓐ 화면: 이동 중 펜 손 `<img>`·빨간 상자 `left 188px · top 242px`(상자 `68px × 98px`)·「손 위치」 `(376, 484)`, 팔·파란 상자·「파츠 위치」 `(389, 492)` 그대로 ⓑ 상태: `drag` = {target `'pen'`, grab (94,96)} → `null`, `onError(null)` ⓒ bridge: 경우마다 `setPointerCapture` 1회, `setSettings` 정확히 1회 `{ ...SETTINGS, mouse: { ...MOUSE, penPos: (376,484) } }`(`partPos` (389,492) 보존)

### TC-221 · 마스크 없음 → 사각형 대체·훅은 조건 없이 두 번 호출 · 종류: 자동 · 요구: R-37 · 설계: drag-hit §2.3(관리자 결정 채택), §5.5 파생 추가(`useAlphaMask(part?.url)`·`useAlphaMask(pen?.url)` — 조건 없이 항상), §7 P-40a 오류·P-40b 「마스크 준비 전 누름 → 사각형 판정」, §4 `partMask`·`penMask` 소유 · 스펙: `test/DragHit.test.tsx` · **신규(CR-040)**
- Given ① `DEF`, 마스크 없음(두 훅 모두 `null` — 로딩 중·실패 흉내) ② `NO_PEN`(펜 손 없음), 팔 마스크 (61,108)=0
- When ① 누름 (225,300) → 이동 (235,290) → pointercancel ② 누름 (225,300) → 이동 (235,290) → 놓기
- Then ⓐ 화면: ① 이동 중 펜 손·빨간 상자 `(376, 484)`, 팔 그대로, cancel 뒤 펜 손·빨간 상자 `(356, 504)` ② `outline-pen` 없음, 팔 `<img>`·파란 상자 `(389, 492)` 그대로 ⓑ 상태: ① `drag` target `'pen'`(겹치면 위 그림 — 옛 사각형 규칙) → `null` ② `drag` `null` 유지 ⓒ 호출: 훅 인자에 ① `asset://mouse_base.png`·`asset://pen_up.png` ② `asset://mouse_base.png`·`undefined`; bridge ① `setPointerCapture` 1회·`setSettings` 0회 ② `setPointerCapture` 0회·`setSettings` 0회

### TC-222 · 상자 표시 — 합성 순서·장식·선택 버튼 없음·마법사 단계와 무관 · 종류: 자동 · 요구: R-38, R-37 · 설계: drag-hit §5.5 렌더 3·표시 조건, §6 합성 순서·상자 = 그림 사각형 전체, §8 접근성(aria-hidden·포커스 대상 아님·포커스 순서 불변), §3 끝 줄(「팔/손 옮기기」 버튼 없음), §4 상자 위치 = `shownPartPos`·`shownPenPos` · 스펙: `test/DragHit.test.tsx` · **신규(CR-040)**
- Given `DEF`·`SETTINGS`
- When 마운트 → 「어깨축 설정하기」 → 「취소」 → 「이동 영역 설정하기」
- Then ⓐ 화면: 두 상자가 미리보기 안, 파란 `(389,492)` `85.5px × 99.5px`·빨간 `(356,504)` `68px × 98px`(캔버스 × 0.5), 둘 다 `aria-hidden="true"`·`role`·`tabindex` 없음·글자 없음; 문서 순서 펜 손 `<img>` → `outline-arm` → `outline-pen` → 영역 선 `svg` → 축 마커 `축(어깨) (558, 500)`; 역할 `img` 1개(축 마커); 버튼 정확히 `['어깨축 설정하기','이동 영역 설정하기','기본값으로 리셋']`, 이름에 「옮기기」가 든 버튼 없음; pickShoulder·pickArea 단계에서도 두 상자 같은 자리·크기 ⓑ 상태: 상자 위치 = 저장값(`drag` null이라 `shownPartPos` = partPos, `shownPenPos` = penPos) ⓒ bridge: `setSettings` 0회

### TC-223 · 그림 없음 → 그 상자 없음, 매니페스트 교체에 따라 사라지고 생기고 크기 따라감 · 종류: 자동 · 요구: R-38 · 설계: drag-hit §5.4 1, §5.5 표시 조건(펜 손 상자 = 펜 손 `<img>`와 같은 조건), §3 `PartOutline` `size` = 매니페스트 자연 크기, §7 P-40c · 스펙: `test/DragHit.test.tsx` · **신규(CR-040)**
- Given `SETTINGS`, 매니페스트 `NO_PEN` → `NO_ARM` → `BODY_ONLY` → `DEF` → `BIG_ARM`(팔 200×150) → `EMPTY`(props 재렌더 = assets://changed)
- When 차례로 재렌더
- Then ⓐ 화면: `NO_PEN` `outline-pen` 없음·`outline-arm` `(389,492)` `85.5px × 99.5px` / `NO_ARM` `outline-arm` 없음(partPos 저장값이 있어도)·`outline-pen` `(356,504)` `68px × 98px` / `BODY_ONLY` 둘 다 없음 / `DEF` 둘 다 / `BIG_ARM` `outline-arm` `100px × 75px` / `EMPTY` 둘 다 없음 ⓑ 상태: 상자 크기 = 그 시점 매니페스트 `width`·`height` ⓒ bridge: `setSettings` 0회

### TC-224 · 놓기 저장 실패 → 그림·상자 옛 자리 · 종류: 자동 · 요구: R-38, R-37 · 설계: drag-hit §7 P-40c 오류(「그림·상자 모두 옛 자리」), `design.md` P-5 오류·`onPreviewPointerUp` 예외 · 스펙: `test/DragHit.test.tsx` · **신규(CR-040)**
- Given `DEF`·`SETTINGS`, 마스크 팔 255 · 펜 손 0, `setSettings` 1회 reject `IO_ERR`
- When 누름 (225,300) → 이동 (235,290) → 놓기
- Then ⓐ 화면: 이동 중 팔·파란 상자 `(409, 472)` → 실패 뒤 팔 `<img>`·파란 상자·「파츠 위치」 `(389, 492)`, 펜 손·빨간 상자 `(356, 504)` ⓑ 상태: `onError(IO_ERR)` ⓒ bridge: `setSettings` 정확히 1회, 인자 `{ ...SETTINGS, mouse: { ...MOUSE, partPos: (409,472) } }`

### TC-225 · 어깨축·이동 영역 단계 클릭은 픽셀 판정과 무관하게 점 지정 · 종류: 자동 · 요구: R-37, R-10, R-15 · 설계: drag-hit §5.5 「`onPreviewPointerMove`·`Up`·`Cancel`·`onPreviewClick` 불변(마법사 pickShoulder·pickArea 클릭은 판정과 무관하게 점 지정)」, `design.md` §4 상호 배타 ② · 스펙: `test/DragHit.test.tsx` · **신규(CR-040)**
- Given `DEF`·`SETTINGS`, 마스크 팔 0 · 펜 손 0(겹친 점 투명)
- When 「어깨축 설정하기」 → 누름 (225,300)·이동 (235,290)·놓기 → 클릭 (225,300) → 「취소」 → 「이동 영역 설정하기」 → 클릭 (225,300)
- Then ⓐ 화면: pickShoulder 끌기 조작 뒤 팔·펜 손·두 상자 그대로; 클릭 → 안내 `축 위치를 확인하고 저장하세요.`·축 마커 `축(어깨) (450, 600)`; pickArea 클릭 → 안내 `2/4 이동 영역의 오른쪽 위 꼭짓점을 클릭해주세요.`·점 표식 `['225,300']` ⓑ 상태: `drag` 내내 `null`, 투명 자리여도 축·꼭짓점이 지정됨 ⓒ bridge: `setPointerCapture` 0회, `setSettings` 0회

v15 추적 — 요구 ↔ TC (앞 표와 겹치면 이 표 우선)

| 요구ID | 상태 | 자동 TC | 수동 | TC-FLOW |
|---|---|---|---|---|
| R-37 | 유효(신설 🔒) | TC-208, TC-209, TC-210, TC-211, TC-212, TC-213, TC-214, TC-215, TC-218, TC-219, TC-220, TC-221, TC-222(선택 버튼 없음), TC-224, TC-225 + 개정 TC-078·TC-079·TC-085(마스크 없음 경로) | M-40a | TC-FLOW-20 |
| R-38 | 유효(신설 🔒) | TC-216, TC-217, TC-218, TC-219, TC-220, TC-222, TC-223, TC-224 | M-40a | TC-FLOW-20 |
| R-11 | 유효(끌기 대상 판정만 R-37로 좁힘 — 문구 불변) | 앞 행 + TC-211, TC-218 | 같음 + M-40a | TC-FLOW-05, TC-FLOW-20 |
| R-18 | 유효(같음) | 앞 행 + TC-211, TC-212, TC-220 | 같음 + M-40a | TC-FLOW-07 |
| R-10 · R-15 | 유효 | 앞 행 + TC-225 | 같음 | 같음 |
| 그 밖 유효 요구 | 유효 | 앞 추적 그대로 | 같음 | 같음 |

v15 추적 — 설계 항목(`design/drag-hit.md`) ↔ TC

| 설계 항목 | TC |
|---|---|
| §1 결론(프론트에서 마스크 · 순수 함수 분리·마스크 주입 · 마스크 없으면 사각형 대체) | TC-208 ~ TC-212, TC-221 |
| §2.1 tainted canvas 판단(마스크용 `Image` 따로, `crossOrigin = 'anonymous'`를 `src`보다 먼저, 표시용 `<img>` 재사용 금지) | TC-213(새 Image·속성 순서), TC-214 ③(`SecurityError` → null), M-40a(실제 WebView2 개발·배포 두 출처) |
| §2.2 대안 A·B | TC 대상 아님 — 안 A는 §2.3으로 내장(TC-221), 안 B는 채택 안 함(계약 변경 없음). M-40a 실패 시 결정 근거 |
| §2.3 마스크 없음·크기 다름 → 사각형 판정, 사용자 표시 없음 | TC-210, TC-211(5·6행), TC-214, TC-221 |
| §3 `alphaMask` 모듈(순수) | TC-208, TC-209 |
| §3 `mouseWizard` 개정(`DragCandidate`·`hitOpaque`·`pickDragTarget` 확장, `hitPart` 불변) | TC-210, TC-211, TC-212, TC-078·TC-079(개정 — mask 없는 호출), TC-045(`hitPart` 회귀) |
| §3 `useAlphaMask` 훅(화면 밖 캔버스, DOM에 붙이지 않음) | TC-213, TC-214, TC-215 |
| §3 `PartOutline`(props·`React.memo`·`<span>` D-1) | TC-216 |
| §3 `MousePartsTab` 개정(props 불변·훅 2회·판정 인자·상자 2개) | TC-218 ~ TC-225 |
| §3 색 토큰 `--st-outline-arm`·`--st-outline-pen` | TC-217, M-40a |
| §3 끝 줄 — 「팔/손 옮기기」 선택 버튼 없음·버튼 줄 불변 | TC-222 |
| §4 `partMask`·`penMask`(타입·초기 null·소유 = 훅 내부 useState) | TC-213(초기 null), TC-221(팔·펜 손 url로 각각 호출) |
| §4 상자 위치 = `shownPartPos`·`shownPenPos`(새 상태 없음) | TC-218, TC-220, TC-222 |
| §4 url 바뀜·비움 → null 뒤 다시 생성 | TC-215 |
| §5.1 `AlphaMask`·`buildAlphaMask`·`isOpaqueAt`·예 | TC-208, TC-209 |
| §5.2 `DragCandidate`·`hitOpaque` ①②③ | TC-210 |
| §5.2 `pickDragTarget` ①②③·예 표 6행·(370,520) 2건·「기존 호출 = 옛 결과」 | TC-211, TC-212, TC-078·TC-079 |
| §5.3 `useAlphaMask` 시그니처·상태·효과 ①~⑦·반환·예외(콘솔 없음)·성능(로드 1회)·테스트 이음새 | TC-213(①②③④⑥·성능), TC-214(④ ctx 없음·catch·⑤·예외), TC-215(①·③ cancelled·⑦), TC-221·이음새(mock 없는 파일은 null → TC-085 등 불변) |
| §5.4 `PartOutline` 1(없으면 null)·2(span·aria-hidden·testid·style)·4(memo) | TC-216, TC-223 |
| §5.4 3 `PartOutline.module.css` | TC-217 |
| §5.4 색 결정 표(짙은 파랑·장미 빨강 + 점선으로 기존 색과 구분) | TC-217(값), M-40a(시각 구분) |
| §5.5 파생 추가(조건 없이 항상 호출) | TC-221 |
| §5.5 `onPreviewPointerDown`(마스크 주입, `null`이면 아무것도 안 함) | TC-218, TC-219, TC-220, TC-221 |
| §5.5 `Move`·`Up`·`Cancel`·`onPreviewClick` 불변 | TC-218(Move·Up), TC-221(Cancel), TC-224(Up 실패), TC-225(Click) |
| §5.5 렌더 3 순서(펜 손 → 팔 상자 → 펜 손 상자 → `AreaOutline` → 축 마커) | TC-222 |
| §5.5 표시 조건(마법사·saving 무관, 펜 손 상자 = 펜 손 `<img>` 조건) | TC-222, TC-223 |
| §6 합성 순서·상자 = 그림 사각형 전체·판정은 픽셀·`pointer-events: none`·끌기 중 따라감·미리보기 좌표 = 캔버스 × scale | TC-222, TC-216, TC-219, TC-217, TC-218, TC-220, M-40a(실제 포인터 통과) |
| §6 오버레이 화면에는 상자 없음 | M-40a 8)(이 화면 범위 밖 — 실물 확인만) |
| §7 P-40a 정상·오류 | TC-213, TC-215 / TC-214, TC-221 |
| §7 P-40b 정상·오류(둘 다 투명·마스크 준비 전) | TC-218, TC-220 / TC-219, TC-221 |
| §7 P-40c 정상·오류 | TC-218, TC-222, TC-223 / TC-224 |
| §7 파괴 조작 없음 → confirm 없음 | TC-218 ~ TC-225(확인창 없이 저장·무시 — 저장 호출 단언) |
| §8 접근성(장식 aria-hidden·포커스 대상 아님·새 문구 키 없음·새 상태 알림 없음·포커스 순서 불변) | TC-216, TC-222, TC-094(회귀 — 단순 키 수 불변), TC-091(회귀 — 역할 img·aria-live 수 불변), M-40a 9)(낭독) |
| §9 테스트 인계 표 전 행 | 위 각 행 |
| §10 RTM 조각 | 위 요구 ↔ TC 표 |
| `design.md` §11 D-4 토큰 블록 추가 | TC-217 |

v15 추적 — 사용자행 ↔ TC-FLOW: **S-19**(R-37, R-38) → TC-FLOW-20. 그 밖 행은 앞 표 그대로.

CR ↔ TC: CR-040 → 신규 TC-208 ~ TC-225·TC-FLOW-20 / 개정 TC-078·TC-079(근거 줄)·TC-085(제목·전제)·TC-011·TC-030·TC-035·TC-037·TC-FLOW-02(도우미) / 수동 M-40a 신설(`manual-checklist.md` v10 — 전사 완료).

설계 확인 필요 (v15, 관리자 인계)

- **P-1. drag-hit §9 「기존 TC 영향」 누락.** 상자(`PartOutline`)는 미리보기 안의 `aria-hidden` span이라, 「미리보기 안 `span[aria-hidden]` = 패드 박스」로 판정하던 도우미 두 개(`MousePartsTab.test.tsx` `expectNoPadBox` — TC-011·TC-030, `SettingsApp.test.tsx` `padBox` — TC-035·TC-037·TC-FLOW-02)가 구현 뒤 거짓 FAIL을 낸다. 스펙 도우미만 `[data-testid^="outline-"]` 제외로 좁혔다(기대 불변). drag-hit §9·RTM 비고 동기화 권고(ui-designer 몫).
- **P-2. 스펙이 고정한 해석.** ① `useAlphaMask`는 **named export**(`import { useAlphaMask } from '../components/useAlphaMask'` — §3 export 열이 함수 시그니처만 적음). 화면 mock은 named·default 둘 다 주지만 TC-213 ~ TC-215 import는 named ② `useAlphaMask`는 `img.onload`·`img.onerror` **속성**에 할당(§5.3 ④⑤⑦ 문구 — `addEventListener`면 TC-213 ~ TC-215 FAIL) ③ `PartOutline` className = `` `${styles.outline} ${styles.arm|pen}` `` 두 토큰 순서(§5.4 2) ④ 놓은 직후 수신 전에는 그림과 **상자도** 옛 자리(E-1 구조 — §6 「놓은 뒤 저장된 자리」는 수신 뒤로 읽음) ⑤ 「콘솔 출력 없음」 = `console.error`·`console.warn` 0회 ⑥ 토큰 블록 = `settings.module.css`의 `:global(body[data-window='settings'])` 블록(`--st-accent`가 있는 블록). 다르게 의도했다면 알려 달라.
- **P-3. R-37 「둘 다 투명이면 끌기 없음」과 §2.3 대체의 관계.** 마스크가 없을 때(로딩 중·실패)는 투명 자리도 사각형 안이면 잡힌다 — 관리자 결정으로 채택(위임문 2026-09-25). TC-221이 이 동작을 고정한다. 요구 문구와의 차이는 기록만.
- **P-4. 변경 대기열 Q-02(CR-039)는 이번 위임 범위 밖**이라 전환하지 않았다(상태 `대기` 유지).

### CR-042 개정 (v16 — 손(펜) 그룹 두 칸 R-39, 증분 모드)

비유: 손 그룹 서랍에 칸이 아홉 개(손 기본·펜 입력 n장·손 특수 키 7장) 있던 것을 「손 기본」·「펜 입력 1」 두 칸만 남기고 막았다. 테스트는 「옛 물건(파일)이 남아 있어도 두 칸만 보이는가」, 「손 서랍의 '칸 더하기' 단추가 사라졌는가」, 「두 칸의 이름표(설명)가 새 동작을 말하는가」, 「없어진 칸의 이름표가 사전에서도 지워졌는가」, 「펜 모드 안내 세 문장에 특수 키 설명이 들어갔는가」를 본다.

- **v16 기준(이 절이 앞 모든 기준 줄·CR 절보다 우선)**: `src/settings/requirements.md` v1.15(R-39·S-20·용어 주 CR-042 — R-25 손 그룹 괄호·R-32 비우기 칸 목록의 `pen_key_*`·`pen_down_1+`는 이 화면에 카드 없음) · `design/images-tab.md` §3.2(손 그룹 `[pen_up, pen_down_0]` — `slotCard(manifest,'pen_up','pen_up',null)`·`slotCard(manifest,{kind:'pen_down',index:0},'pen_down',1)` → `n` 1 「펜 입력 1」, `AddCardSpec` = `slot: KbDownSlot`·`msg: 'addKbDown'`만, `frameCount` kind `'kb_down'`만, 검증 예 손 2장·빈 매니페스트 총 18장, 남은 옛 파일 무시, `ImagesTab`·`ImageSlotCard`·`AddSlotCard` 코드 불변) · `design/i18n.md` §4.4 CR-042 블록(`SlotMessageKey` 25 → 18, 단순 키 `addPenDown`·상수 `SAME_PEN` 삭제, `pen_up`·`pen_down` 설명 ko 확정·ja·en 초안) · §4.3 `penModeNoteOn`·`penEnableMessage`·`penFirstMessage` 3행(CR-042 개정) · `design.md` RTM R-39. 계약 변경 없음(`AssetSlot` 펜 슬롯은 contract에 그대로)
- **범위·수(v16)**: 유효 요구 R-01 · R-03 · R-04 · R-10 · R-11 · R-12 · R-15 ~ R-18 · R-20 ~ R-30 · R-32 ~ R-39. 자동 TC 번호 228개(TC-001 ~ TC-228) 중 **유효 222 · 폐기 6** · TC-FLOW 21개(TC-FLOW-01 ~ TC-FLOW-21) · 수동 34개 그대로(새 수동 없음 — 아래 T-4)
- **mock·시간 규약(v16)**: 변경 없음. `imageSlots`·`bridge/types`(`hasBuiltinDefault`·`isRequiredSlot`·`slotKey`)·i18n 사전은 실물, bridge command는 mock. 매니페스트 교체(`assets://changed`)는 props 재렌더. **시간 의존 없음** — `waitFor` 조건(버튼 활성·호출 횟수)만, 실제 sleep·가짜 시계 없음
- **선행(v16)**: CR-042 소스 미적용(CR 대장 CR-042 「설계 완료」 — `imageSlots.ts` `buildSlotGroups` ④·`AddCardSpec`·`frameCount`, `i18n/{types,ko,ja,en}.ts` 미개정). 예정 실패: `imageSlots.test.ts` TC-134·TC-135·TC-177·TC-192·TC-226, `ImagesTab.test.tsx` TC-136·TC-141·TC-142·TC-227·TC-FLOW-15·TC-FLOW-21, `i18n.test.ts` TC-093·TC-094·TC-228, (전사 뒤) `PenMode.test.tsx` `KO_PEN` 사용 it·TC-174, `Hair.test.tsx` TC-193·TC-201. TC-132는 현행 소스에서도 PASS
- **픽스처(v16)**: `imageSlots.test.ts` `HAND` = `['pen_up','pen_down_0']`(옛 `PEN_KEYS` 삭제), `OLD` = `kb_up`·`kb_down_0`·`pen_up`·`pen_down_0`·`pen_down_1`·`pen_down_2`·`pen_key_space`(펜 100×80). `ImagesTab.test.tsx` `OLD_PEN` = `WITH_PEN` + `pen_down_0`·`pen_down_1`·`pen_down_2`·`pen_key_space`(100×80), `MINE` = `WITH_PEN` + `pen_down_0`(url `?v=2`). 새 ko 설명 상수 `PEN_UP_DESC_KO` = `팔 끝에 붙는 펜 쥔 손. 「펜 손 사용」을 켜면 아무것도 누르지 않을 때 이 그림`, `PEN_DOWN_DESC_KO` = `키·클릭을 누르는 동안의 손. 특수 키는 키보드의 특수 키 그림도 함께 바뀜`(i18n §4.4 CR-042 표 ko 열)
- **새 사실 → 기대값 규칙(모든 개정 TC 공통)**
  1. 손 그룹 = `[pen_up, pen_down_0]` 두 장, 전부 `type 'slot'`. 매니페스트에 `pen_down_1+`·`pen_key_*` 항목이 있어도 같다(카드 없음·지울 수 없음 — 수용).
  2. 빈 매니페스트 슬롯 카드 **18장**(배경 2 + 키보드 11 + 팔 3 + 손 2, 옛 25). 필수 3장·복원 칸 7장(`kb_up`·`kb_down_0`·`background`·`hair`·`mouse_base`·`pen_up`·`pen_down_0`)은 그대로 → 빈 비우기 칸 11장(옛 18).
  3. 추가 카드는 키보드 `kb_down_{K}`(`addKbDown`, 「+ 타자 입력 그림 추가」)뿐. `add-card-pen_down_*`·「+ 펜 입력 그림 추가」는 어디에도 없다.
  4. `pen_down_0` = `msg 'pen_down'`·`n 1`·`required false`·`resetKind 'restore'`·`canReset true`·`lastOnlyBlocked false`(뒤에 `pen_down_1` 파일이 있어도). 제목 「펜 입력 1」, 「기본값」 aria `펜 입력 1 기본 그림으로 되돌리기`.
  5. 사전: `slots` 18키(`pen_key_*` 7 없음), 단순 키 `addPenDown` 없음 → `simpleKeys(ko)` 94 → **93**. `pen_up`·`pen_down` 설명 = 위 픽스처 ko 문구(제목 불변 — `손 기본`·`펜 입력 {n}`).
  6. 펜 모드 문구 3개 ko(i18n §4.3 CR-042 개정): `penModeNoteOn` = `ON: 팔 끝에 붙은 손 그림이 키보드 입력과 클릭 때마다 바뀌고, 키보드 그림은 기본 그림에 고정되며 특수 키를 누를 때만 특수 키 그림으로 바뀝니다.` · `penEnableMessage` = `켜면 팔 끝에 붙은 손 그림이 키보드 입력과 클릭 때마다 바뀌고, 키보드 그림은 기본 그림에 고정되며 특수 키를 누를 때만 특수 키 그림으로 바뀝니다. 켤까요?` · `penFirstMessage` = `펜 손 모드를 켤까요? 켜면 팔 끝에 붙은 손 그림이 키보드 입력과 클릭 때마다 바뀌고, 키보드 그림은 기본 그림에 고정되며 특수 키를 누를 때만 특수 키 그림으로 바뀝니다.` 나머지 8키(`penModeNoteOff` 포함) 불변.
- **단언 의도는 모두 유지**(카드 순서·추가 카드 위치·활성 규칙·호출 인자·사전 대조). 바뀐 것은 손 그룹 칸 수·추가 카드 종류·문구뿐이다.

#### v16 개정 TC (앞 본문을 대체 — 번호 유지, Given/When 불변이면 「불변」)

| 개정 TC | 스펙 | Given / When 변화 | Then ⓐ 화면 · ⓑ 상태/반환 · ⓒ bridge (새 기대) | 스펙 반영 |
|---|---|---|---|---|
| TC-132 | `imageSlots.test.ts` | 불변 | ⓑ `frameCount(KB3,'pen_down')` 단언 **삭제**(kind가 `'kb_down'`만 — images-tab §3.2 `frameCount` 행). `findEntry(KB3, pen_down_0)` = undefined 등 나머지 불변 ⓐ·ⓒ 해당 없음(순수 함수) | 반영 |
| TC-134 | 같음 | 불변(`EMPTY`) | ⓑ 손 그룹 `[pen_up, pen_down_0]`(옛 + `pen_key_*` 7), 전체 **18장**(옛 25), 그룹 4개·배경 2·키보드 11·팔 3·필수 3·전부 slot·`body` 없음·`pen_down_0` `msg pen_down`·`n 1` 불변. 제목 「카드 18장」 ⓐ·ⓒ 해당 없음 | 반영 |
| TC-135 | 같음 | 불변(`pen_up`·`pen_down_0` 등록) | ⓑ 손 그룹 `[pen_up, pen_down_0]` 전부 slot — 옛 `pen_down_1` 추가 카드(`addPenDown`) 기대 삭제. `pen_down_0` restore·`canReset` true·`lastOnlyBlocked` false, 키보드 13장·`kb_down_2` 추가 카드(`addKbDown`) 불변 ⓐ·ⓒ 해당 없음 | 반영 |
| TC-177 | 같음 | 예 4 비우기 칸 목록 | ⓑ 비우기 칸 `[mouse_right, key_space, idle]` = clear·`canReset` false(옛 목록에서 `pen_key_space` 제거), `emptySpec('pen_key_space')` = **undefined**(카드 없음), 18장 모두 `resetKind` = `hasBuiltinDefault`, 복원 칸 파일명 7장 그대로 ⓐ·ⓒ 해당 없음 | 반영 |
| TC-192 | 같음 | 불변 | ⓑ ② 다른 그룹 불변 단언의 손 그룹 `[pen_up, pen_down_0]`(옛 9장). hair 스펙·필수 3장·1장 고정 불변 ⓐ·ⓒ 해당 없음 | 반영 |
| TC-136 | `ImagesTab.test.tsx` | 불변(`EMPTY`) | ⓐ 카드 **18장** 순서 `background, hair, kb_up, kb_down_0, idle, rest, key_space ~ key_undo 7, mouse_base, mouse_left, mouse_right, pen_up, pen_down_0` · h3 제목 끝 `손 기본, 펜 입력 1`(옛 `손 스페이스` ~ `손 Ctrl+Z` 7개 삭제), h2 4개·필수 배지 3·빈 미리보기 문구·추가 카드 0·`body` 없음 불변 ⓑ `alert` 없음 ⓒ `pickPngFile`·`importAsset`·`removeAsset`·`setSettings` 0회 | 반영 |
| TC-141 | 같음 | `PEN2`(`WITH_PEN` + `pen_down_0`) 그대로. 실패 경로를 **키보드 추가 카드 두 번째 클릭**으로 옮김(손 추가 카드 소멸), 끝에 `update(EMPTY)` | ⓐ `add-card-pen_down_1`·「+ 펜 입력 그림 추가」 없음, 추가 카드 id 목록 = `[add-card-kb_down_2]`(`slot-card-kb_down_1` 바로 뒤), 카드 id 마지막 두 개 = `slot-card-pen_up, slot-card-pen_down_0`, 두 번째 클릭 실패 → `kb_down_2` 추가 카드 안 `alert` = `TOO_LARGE.message`, `EMPTY` 재렌더 → 추가 카드 0 ⓑ `cardError` = `{key:'kb_down_2'}` ⓒ `importAsset(kbDown(2), PATH)` 2회(성공·실패), `penDown(1)` 인자 호출 없음, `setSettings` 0회 | 반영 |
| TC-142 | 같음 | 불변(`KB3P`) | ⓐ 옛 `손 스페이스 그림 지우기` 비활성 단언 → `스페이스 그림 지우기`(`key_space`, 빈 비우기 칸) **비활성** + `slot-card-pen_key_space` 없음. 나머지 불변 ⓑ 불변 ⓒ `removeAsset`·`restoreDefaultAsset` 0회 | 반영 |
| TC-FLOW-15 | 같음 | 불변(`DEFAULT_ASSET_SLOTS` 7장) | ⓐ `article` 18장, `img` 없는 카드 **11장**(idle·rest·key_* 7·mouse_left·mouse_right — 옛 18에서 `pen_key_*` 7 제외) 「기본값」 비활성·aria `… 그림 지우기`, 7칸 복원 활성, 추가 카드 `kb_down_1`만(`add-card-pen_down_1` **없음**) ⓑ 불변 ⓒ `importAsset`·`restoreDefaultAsset`·`removeAsset`·`setSettings` 0회. 제목 「나머지 빈 칸 11개」 | 반영 |
| TC-093 | `i18n.test.ts` | 불변 | ⓑ `SLOT_KEYS` 18개(옛 25 − `pen_key_*` 7) = `ko.slots` 키, 세 사전 키 집합 같음·빈 문자열 없음 불변 ⓐ·ⓒ 해당 없음 | 반영 |
| TC-094 | 같음 | 불변 | ⓑ `EXPECTED_KO_NEW`에서 `addPenDown` 삭제(새 키 43 → 42), `SAME_PEN` 삭제, `EXPECTED_KO_SLOTS` 18항목 — `pen_up`·`pen_down` 설명 = 새 ko, `simpleKeys(ko)` 94 → **93**, `pen_key_z`·`pen_key_undo` 설명 같음 단언 2줄 삭제 ⓐ·ⓒ 해당 없음 | 반영 |
| `KO_PEN` 사용 it(스펙 219·250·354·602행 — 안내 상자·켜기 확인창·첫 등록 확인창·TC-FLOW-14) | `PenMode.test.tsx` | 불변 | ⓐ 안내 상자 첫 줄·켜기 확인창 설명·첫 등록 확인창 설명 = 위 규칙 6의 새 ko 문구(상수 `KO_PEN` 3값 교체만 — 단언 코드 불변) ⓑ·ⓒ 불변 | 반영(v16 후속) |
| TC-174 | 같음 | 불변 | ⓑ `KO_PEN` 11키 ko 정확 값(3값 새 문구), `ko.slots.pen_up` = `{title:'손 기본', desc: PEN_UP_DESC_KO}`(옛 CR-033 설명 대체), ja·en `pen_up.desc` 옛 CR-028 문구 미포함·비어 있지 않음 불변 ⓐ·ⓒ 해당 없음 | 반영(v16 후속) |
| TC-175 | 같음 | 불변 | 불변 — ja·en 기대는 사전 값 참조(`ja.penModeNoteOn` 등)라 문구가 바뀌어도 성립 | 불변 |
| TC-193 | `Hair.test.tsx` | 불변(`HAIR` — `kb_down_0` 있어 추가 카드 `kb_down_1`) | ⓐ `cardIds()` 길이 26 → **19**(배경 2 + 키보드 12 + 팔 3 + 손 2), 나머지 불변 ⓑ·ⓒ 불변 | 반영(v16 후속) — CR 대장 영향 목록 누락분(T-2) |
| TC-201 | 같음 | 불변(`HAIR`) | ⓐ 뒷머리 외 슬롯 카드 24 → **17**(슬롯 18 − 뒷머리), 각 버튼 2개·한 줄 배치 불변 ⓑ·ⓒ 불변 | 반영(v16 후속) — T-2 |
| TC-139 · TC-151 · TC-143 · TC-148 · TC-157 · TC-158 · TC-150 · TC-159 | `ImagesTab.test.tsx`·`PenMode.test.tsx` | 불변 | 불변 — 카드 수와 무관한 단언(TC-139 `cardButtons()` 전부 비활성, TC-151 모든 버튼 `type=button`, TC-157 모든 `article` 반복), `pen_down_0` 제목 「펜 입력 1」 불변(TC-148 교체 경로), TC-143·TC-158은 키보드 추가 카드·`kb_down_1` 대상, TC-159 `isFirstPenUp(penDown(0), …)` 불변. **회귀 감시** | 불변 |

#### v16 신규 TC

### TC-226 · buildSlotGroups 손 그룹 두 장 — 빈·옛 파일 남은 매니페스트, 추가 카드는 키보드뿐 · 종류: 자동 · 요구: R-39, R-25 · 설계: images-tab §3.2 표(`AddCardSpec`·`buildSlotGroups` ④·검증 예)·「남은 옛 파일」 줄 · 스펙: `test/imageSlots.test.ts` · **신규(CR-042)**
- Given `EMPTY`, `OLD`(`kb_up`·`kb_down_0`·`pen_up`·`pen_down_0`·`pen_down_1`·`pen_down_2`·`pen_key_space`)
- When `buildSlotGroups(EMPTY)`·`buildSlotGroups(OLD)`
- Then ⓐ 해당 없음(순수 모듈) ⓑ 두 매니페스트 모두 `groups[3].id` = `hand`, 손 그룹 키 `[pen_up, pen_down_0]` 전부 slot, 전 그룹 키에 `pen_key_*`·`pen_down_1` 없음 / `OLD`: `pen_down_0` = `{msg:'pen_down', n:1, required:false, resetKind:'restore', canReset:true, lastOnlyBlocked:false}`·`entry.fileName` `pen_down_0.png`, `pen_up` = `{msg:'pen_up', n:null, resetKind:'restore', canReset:true, lastOnlyBlocked:false}`, 추가 카드 = 정확히 `[{type:'add', slot:{kind:'kb_down',index:1}, key:'kb_down_1', msg:'addKbDown'}]`, 전체 19장(18 + 추가 1) / `EMPTY`: `pen_down_0` = `msg pen_down`·`n 1`·restore·true·false, 전체 18장 ⓒ bridge 해당 없음(순수 — 호출 대상 없음)

### TC-227 · 화면 — 옛 파일이 남아도 손 그룹은 「손 기본」·「펜 입력 1」 두 카드·새 설명·추가 카드 없음 · 종류: 자동 · 요구: R-39, R-25, R-20 · 설계: images-tab §3.2 대체 범위(ASCII 손 그룹 한 줄·`AddSlotCard` `addKbDown`만·컴포넌트 코드 불변)·남은 옛 파일, i18n §4.4 CR-042 블록 ko · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-042)**
- Given `OLD_PEN`(`BASIC` = `kb_down_0`·`kb_down_1` 포함 + `pen_up` + `pen_down_0 ~ 2` + `pen_key_space`), `SETTINGS`
- When 렌더(조작 없음)
- Then ⓐ 카드 id 20개(슬롯 19 + `add-card-kb_down_2`), `slot-card-pen_up`부터 끝까지 = `[slot-card-pen_up, slot-card-pen_down_0]`, `pen_key_*`·`pen_down_1+` 카드 없음, h3 `손 기본`·`펜 입력 1`, 설명 p = `PEN_UP_DESC_KO`·`PEN_DOWN_DESC_KO`, `pen_down_0` `img` src `asset://pen_down_0.png`, `펜 입력 1 기본 그림으로 되돌리기`·`손 기본 기본 그림으로 되돌리기` 활성·`title` 없음, 「+ 펜 입력 그림 추가」 버튼·`손 스페이스` 글자 없음 ⓑ `slotBusy` null(손 두 카드 「이미지 변경」 활성) ⓒ `pickPngFile`·`importAsset`·`removeAsset`·`restoreDefaultAsset`·`setSettings` 0회

### TC-228 · 사전 — 세 사전 모두 `addPenDown`·`pen_key_*` 없음, `pen_up`·`pen_down` 새 설명 · 종류: 자동 · 요구: R-39, R-20 · 설계: i18n §4.4 CR-042 블록 1(삭제 키)·2(개정 문구) · 스펙: `test/i18n.test.ts` · **신규(CR-042)**
- Given `ko`·`ja`·`en` 사전
- When 키·값 조회
- Then ⓐ 해당 없음(사전) ⓑ 세 사전 모두 단순 키에 `addPenDown` 없음, `slots` 키 18개·`pen_key_` 접두 키 0개, `pen_down.title`에 `{n}` 유지, `pen_up`·`pen_down` 설명 비어 있지 않음 / ko `pen_up` = `{title:'손 기본', desc: PEN_UP_DESC_KO}`, `pen_down` = `{title:'펜 입력 {n}', desc: PEN_DOWN_DESC_KO}`, `format(ko.slots.pen_down.title,{n:1})` = `펜 입력 1` / ja·en `pen_up.desc`는 옛 CR-033 문구(ja `腕の先に付くペンを持った手。「ペンの手を使う」をオンにするとキー入力で切り替わる`, en `The pen-holding hand at the end of the arm. Changes on key input when "Use pen hand" is on`)가 아니고, `pen_down.desc`에 옛 여러 장 표현(ko `여러 장`·ja `複数枚`·en `alternates`)이 없다(ja·en은 검수 필요라 정확 비교하지 않음 — v8 관례) ⓒ bridge 해당 없음

#### v16 신규 TC-FLOW (번호는 TC-FLOW 절 체계 — 변경 델타를 한 곳에 두려고 이 절에 정의)

### TC-FLOW-21 · S-20: 펜 손 그림을 직접 만든 사용자가 손 그룹에서 두 카드만 보고 설명을 읽은 뒤 「펜 입력 1」에 자기 그림을 넣는다 — 넣은 뒤에도 추가 카드 없이 두 카드 그대로 · 종류: 자동 · 요구: R-39 · Steps: TC-227(두 카드·새 설명 부분) → TC-139(「이미지 변경」 → `importAsset` 부분, 대상 `pen_down_0`) → TC-141(첫 장이 생겨도 손 추가 카드 없음 부분) · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-042)**
- 상태 전달: Step 2 응답 `MINE`(`pen_down_0` url `?v=2`)을 props 재렌더(`assets://changed` 흉내)로 Step 3의 Given으로 넘긴다
- Given `WITH_PEN`(`pen_down_0` 없음), `SETTINGS`(`penPos` null·`penMode` false), `importAsset` → `MINE`
- When 설명 확인 → 「펜 입력 1 이미지 변경」 → 파일 선택(`PATH`) → 응답 → 재렌더
- Then ⓐ Step 1 손 두 카드 설명 = `PEN_UP_DESC_KO`·`PEN_DOWN_DESC_KO` / Step 3 `pen_down_0` `img` src `asset://pen_down_0.png?v=2`, `slot-card-pen_up`부터 끝까지 `[slot-card-pen_up, slot-card-pen_down_0]`, `add-card-pen_down_1` 없음, `alertdialog` 없음(첫 등록 확인창은 `pen_up`만) ⓑ 매니페스트 `WITH_PEN` → `MINE`, 끝나면 `slotBusy` null(버튼 활성) ⓒ `pickPngFile('PNG 이미지 선택')` 1회 → `importAsset({kind:'pen_down',index:0}, PATH)` 1회, `setSettings` 0회(`pen_down`은 `penPos` 대상 아님)
- 비고: S-20의 「특수 키를 치면 본체 `key_*`와 손 `pen_down_0`이 함께 바뀐다」는 모션은 overlay R-31 몫 — 이 화면은 카드 설명 문구로만 알린다(TC-227·TC-228)

v16 추적 — 요구 ↔ TC (앞 표와 겹치면 이 표 우선)

| 요구ID | 상태 | 자동 TC | 수동 | TC-FLOW |
|---|---|---|---|---|
| R-39 | 유효(신설, 사용자 확정) | TC-226, TC-227, TC-228 + 개정 TC-132, TC-134, TC-135, TC-136, TC-141, TC-142, TC-177, TC-192, TC-093, TC-094, TC-193·TC-201(반영), 펜 모드 문구 `KO_PEN` 사용 it·TC-174(반영) | M-25·M-28 범위(T-4) | TC-FLOW-21, TC-FLOW-15(개정) |
| R-25 | 유효(손 그룹 괄호만 R-39로 대체 — 문구 불변) | 앞 행 + TC-226, TC-227 | 같음 | 같음 |
| R-29 · R-30 | 유효(안내·확인창 문구만 CR-042 개정) | 앞 추적 그대로 + `KO_PEN` 사용 it·TC-174(새 문구, 반영) | M-27·M-28 | TC-FLOW-14 |
| R-20 | 유효 | 앞 행 + TC-228, TC-094 | 같음 | 같음 |
| R-32 | 유효(비우기 칸 목록에서 `pen_key_*`·`pen_down_1+` 제외 — 용어 주) | 앞 행 + TC-177, TC-142, TC-FLOW-15 | 같음 | 같음 |
| 그 밖 유효 요구 | 유효 | 앞 추적 그대로 | 같음 | 같음 |

v16 추적 — 설계 항목 ↔ TC

| 설계 항목 | TC |
|---|---|
| images-tab §3.2 대체 범위 — §1 ASCII 손 그룹 한 줄 `[card pen_up] [card pen_down_0]`, `AddSlotCard` `addKbDown`만 | TC-136, TC-141, TC-227 |
| §3.2 표 `AddCardSpec`(`KbDownSlot`·`'addKbDown'`만) | TC-226(추가 카드 `toStrictEqual`), TC-135 |
| §3.2 표 `frameCount`(kind `'kb_down'`만) | TC-132 |
| §3.2 표 `buildSlotGroups` ④(`pen_up` null · `pen_down_0` frames 1 → `n` 1, ①~③ 불변) | TC-134, TC-192, TC-226 |
| §3.2 표 검증 예(손 2장·옛 파일 있어도 같음·`pen_down_0` restore·`lastOnlyBlocked` false·총 18장) | TC-226, TC-134, TC-177, TC-FLOW-15 |
| §3.2 「남은 옛 파일」 — 카드 없음(무시)·`isFirstPenUp`·`PenModePanel`·`hasPenUp` 불변 | TC-226, TC-227 / 회귀 TC-159, TC-FLOW-21 ⓐ(확인창 없음) |
| §3.2 「컴포넌트 코드 변경 없음」·`pendingFocusRef` 손 경로 소멸 | TC-141(손 추가 카드 없음), 회귀 TC-139·TC-151·TC-158 |
| §3.2 「계약 변경 없음」 | TC-FLOW-21 ⓒ(기존 `importAsset`), TC-227 ⓒ |
| i18n §4.4 CR-042 블록 1(`pen_key_*` 7·`addPenDown`·`SAME_PEN` 삭제, 25 → 18) | TC-093, TC-094, TC-228 |
| i18n §4.4 CR-042 블록 2(`pen_up`·`pen_down` 설명, 제목 불변) | TC-094, TC-228, TC-227(화면 표시), TC-FLOW-21 |
| i18n §4.3 `penModeNoteOn`·`penEnableMessage`·`penFirstMessage` CR-042 개정 | `PenMode.test.tsx` `KO_PEN` 사용 it·TC-174(반영), TC-175(사전 참조 — 불변) |
| `design.md` RTM R-39 | 위 요구 ↔ TC 표 |

v16 추적 — 사용자행 ↔ TC-FLOW: **S-20**(R-39) → TC-FLOW-21. S-14 → TC-FLOW-15(개정). 그 밖 행은 앞 표 그대로.

CR ↔ TC: CR-042 → 신규 TC-226 ~ TC-228·TC-FLOW-21 / 개정 TC-132·TC-134·TC-135·TC-136·TC-141·TC-142·TC-177·TC-192·TC-093·TC-094·TC-FLOW-15(스펙 반영) · `PenMode.test.tsx` `KO_PEN`·TC-174, `Hair.test.tsx` TC-193·TC-201(스펙 반영) / 수동 신설 없음.

설계 확인 필요 (v16, 관리자 인계 — 문서 수정은 소유자)

- **T-1. `design.md` RTM R-39 「예정 TC」 열 정정.** 「TC-143(`pen_key_space` 비활성 단언 → 다른 clear 칸)」의 단언은 실제로 **TC-142**(스펙 407행)에 있다 — TC-143은 불변. 「TC-139·TC-151(손 그룹 카드 수)」 두 TC에는 카드 수 단언이 없다(수와 무관 — 불변). ui-designer 동기화 권고.
- **T-2. CR 대장 CR-042 영향 TC 누락.** `Hair.test.tsx` TC-193(`cardIds()` 26)·TC-201(뒷머리 외 슬롯 카드 24)은 카드 총수가 줄어 깨진다. 이번 개정 표에 넣었다(기대 19·17).
- **T-3. 스펙이 고정한 해석.** ① 옛 펜 특수 키 파일은 매니페스트에 문자열 슬롯 `'pen_key_space'`로 넣는다(contract `AssetSlot`이 `pen_key_{key}` 문자열이라는 전제 — 객체 모양이면 픽스처만 바꾸고 기대 불변) ② TC-141 실패 경로를 키보드 추가 카드로 옮겼다(손 추가 카드 소멸로 옛 경로가 없어짐) ③ `pen_down_0` 카드 이름은 `n` 1이라 「펜 입력 1」(aria 조립도 같은 이름).
- **T-4. 수동.** 새 ko 설명·ja·en 초안의 카드 2줄 말줄임 실물은 기존 M-25(카드 높이·말줄임 3개 국어), ja·en 검수(§4.4 CR-042 2행·§4.3 3행)는 M-28 범위다. `manual-checklist.md`에 CR-042 대상 문구를 적어 넣는 개정은 반영(예산).
- **T-5.** 펜 모드 특수 키 모션(본체 `key_*` + 손 `pen_down_0`)은 overlay 화면 담당 — 이 문서 범위 밖.

### CR-043 개정 (v17 — 타자 입력 1 선택 강등 R-40 · 「타자 입력 1」 비우기 R-41, 증분 모드)

비유: 키보드 서랍의 「타자 입력 1」 칸에서 「꼭 채워야 하는 칸」 스티커를 떼고, 뒷머리 칸에 달린 「비우기」 손잡이를 똑같이 달았다(뒤 칸이 차 있으면 잠금). 테스트는 「스티커가 두 장(기본·팔 기본)만 남았는가」, 「이름표(설명)가 펜 손 사용이 꺼진 때의 그림이라고 말하는가」, 「손잡이가 이 칸에만 더 생겼고 뒤 칸이 있으면 잠기는가」, 「손잡이로 비우면 정확히 그 칸만 지우는가」, 「뒷머리 손잡이는 그대로인가」를 본다.

- **v17 기준(이 절이 앞 모든 기준 줄·CR 절보다 우선)**: `src/settings/requirements.md` v1.17(R-40·R-41·S-21·S-22 — R-25 「kb_down_N 1장 필수」·CR-028 용어 주 「필수 3장」은 R-40이, R-35 「뒷머리 카드에만」은 R-41이 대체) · `design/images-tab.md` §3.3(필수 판정 = `isRequiredSlot` 그대로, 대체 서술 표, 예정 TC ①~④)·§12(12.1 레이아웃 = §11.2 재사용, 12.2 `EMPTYABLE_SLOT_KEYS` = `['hair','kb_down_0']`·`canEmpty` = `emptyable && entry !== undefined && !laterFrameExists`·검증 예 4행, 12.3 I-12, 12.4 문구·접근성, 12.5 예정 TC ①~⑤) · `design/i18n.md` §4.4 CR-043 블록(`kb_down` 설명 ko 확정·ja·en 초안, R-41 aria 결과) · contract **v0.19** `REQUIRED_SLOTS` = `['kb_up','mouse_base']`(bridge 반영 완료 — `src/bridge/types.ts` 59행) · `design.md` RTM R-40·R-41
- **범위·수(v17)**: 유효 요구 R-01 · R-03 · R-04 · R-10 · R-11 · R-12 · R-15 ~ R-18 · R-20 ~ R-30 · R-32 ~ R-41. 자동 TC 번호 237개(TC-001 ~ TC-237) 중 **유효 231 · 폐기 6** · TC-FLOW 23개(TC-FLOW-01 ~ TC-FLOW-23) · 수동 35개(M-43 신설)
- **mock·시간 규약(v17)**: 변경 없음. `imageSlots`·`bridge/types`(`REQUIRED_SLOTS`·`isRequiredSlot`·`hasBuiltinDefault`·`slotKey`·`DEFAULT_ASSET_SLOTS`)·i18n 사전은 실물, bridge command는 mock. 매니페스트 교체(`assets://changed`)는 props 재렌더. **시간 의존 없음** — deferred promise + `waitFor` 조건만, 실제 sleep·가짜 시계 없음
- **선행(v17)**: bridge v0.19 반영 완료 → 옛 실패 5건(TC-133·TC-134·TC-135·TC-192·TC-136 — 「필수 3장」 기대)은 이번 개정으로 PASS 예정. CR-043 화면 소스 미적용(CR 대장 「설계 완료」 — `imageSlots.ts` `EMPTYABLE_SLOT_KEYS`·`canEmpty` 식, `i18n/{ko,ja,en}.ts` `slots.kb_down.desc`). **예정 Red**: `imageSlots.test.ts` TC-232 · `ImagesTab.test.tsx` TC-230(설명 부분)·TC-233 ~ TC-237·TC-FLOW-22(설명 부분)·TC-FLOW-23 · `i18n.test.ts` TC-094·TC-231 · `Hair.test.tsx` TC-200·TC-201. TC-229는 현행 소스에서 PASS 예정
- **픽스처(v17)**: `imageSlots.test.ts` `REQUIRED_KEYS` = `['kb_up','mouse_base']`, `DEFAULT7`(기본 7장 — 팔 171×199·펜 136×196), 도우미 `slotSpecs`. `ImagesTab.test.tsx` `REQUIRED` = `['kb_up','mouse_base']`, `KB_DOWN_DESC_KO` = `「펜 손 사용」이 꺼져 있을 때(키보드만 쓸 때) 타자를 치면 나오는 그림(여러 장이면 차례로 바뀜)`, `KB1`(kb_up·kb_down_0·mouse_base — 뒤 장 없음), `NO_DOWN`(kb_up·mouse_base), `DOWN_IO` = `{code:'asset.io', message:'타자 입력 1 파일을 지우지 못했습니다. (테스트)'}`, `DOWN_GONE` = `{code:'asset.not_found', message:'kb_down_0.png 없음 (테스트)'}`, 도우미 `emptyBtn(key,name)`(이름 `{name} 그림 비우기`)·`badgeCardIds(text)`·`d7()`(`DEFAULT_ASSET_SLOTS` 실물)·`withoutDown0(m)`. `i18n.test.ts` `KO_KB_DOWN_DESC`(같은 ko 문구)
- **새 사실 → 기대값 규칙(모든 개정 TC 공통)**
  1. 필수 카드 = **`kb_up`·`mouse_base` 2장**(모든 매니페스트). `kb_down_0` = `required` false — 빈 칸이면 배지 「선택」·빈 문구 「등록된 그림 없음」(`emptyRequired` 아님). `resetKind` restore·`canReset` true·「기본값」 = 복원은 불변.
  2. `EMPTYABLE_SLOT_KEYS` = `['hair','kb_down_0']`. `kb_down_0` `emptyable` 늘 true, `canEmpty` = 등록 && `kb_down_1+` 없음(§12.2 검증 예 4행: 없음 false · 0만 true · 0·1 false · 1만 false). `hair`는 `frames` null이라 옛 규칙(등록 여부만) 그대로.
  3. 화면 「비우기」 버튼 = 뒷머리 + 타자 입력 1 **2개**. 「타자 입력 1」 카드 = 버튼 3개(이미지 변경 → 기본값 → 비우기), aria `타자 입력 1 그림 비우기`(ja `押下 1の画像を削除` · en `Clear image: Press 1`), `.cardEmptyable`·`.actions2`, 다른 슬롯 카드는 2개·한 줄 → 뒷머리·타자 입력 1 외 슬롯 카드 **16장**(옛 17).
  4. 확정 → `removeAsset({kind:'kb_down',index:0})` 1회·`restoreDefaultAsset` 0회, 포커스 = 같은 카드 「이미지 변경」(`focusAfter`). 비운 뒤 키보드 그룹 = 빈 매니페스트와 같은 구성(추가 카드 없음).
  5. 사전: `slots.kb_down.desc` ko = 위 문구, 제목·`badgeRequired`·`emptyRequired`·`key_*` 설명 불변.

#### v17 개정 TC (앞 본문을 대체 — 번호 유지, Given/When 불변이면 「불변」)

| 개정 TC | 스펙 | Given / When 변화 | Then ⓐ 화면 · ⓑ 상태/반환 · ⓒ bridge (새 기대) | 스펙 반영 |
|---|---|---|---|---|
| TC-133 | `imageSlots.test.ts` | 불변 | ⓑ `slotCard(KB3, kb_down_0, 'kb_down', 2)`·`slotCard(EMPTY, kb_down_0, 'kb_down', 0)`의 `required` true → **false**, 나머지(`n` 1·restore·`canReset` true·`lastOnlyBlocked` false, kb_up·mouse_base `required` true) 불변 ⓐ·ⓒ 해당 없음(순수) | 반영 |
| TC-134 | 같음 | 불변(`EMPTY`) | ⓑ 필수 카드 키 `[kb_up, mouse_base]`(옛 3장), `kb_down_0` = `msg kb_down`·`n 1`·`required false`. 그룹·카드 18장 불변. 제목 「필수 2장」 ⓐ·ⓒ 해당 없음 | 반영 |
| TC-135 | 같음 | 불변 | ⓑ 키보드 13장 중 `kb_down_0` `required` **false**(restore·true·false 불변) ⓐ·ⓒ 해당 없음 | 반영 |
| TC-192 | 같음 | 불변 | ⓑ ② 필수 카드 `[kb_up, mouse_base]`(옛 3장). hair `toStrictEqual`(`emptyable` true·`canEmpty` false) 불변 ⓐ·ⓒ 해당 없음 | 반영 |
| TC-136 | `ImagesTab.test.tsx` | 불변(`EMPTY`) | ⓐ 카드별 배지 반복의 `REQUIRED` = `[kb_up, mouse_base]` → `kb_down_0` 카드 「선택」·「등록된 그림 없음」, kb_up·mouse_base 「필수」·「필수 · 미등록」. 18장 순서·제목·h2 4개·추가 카드 0 불변. 제목 「필수 배지 2장」 ⓑ `alert` 없음 ⓒ `pickPngFile`·`importAsset`·`removeAsset`·`setSettings` 0회 | 반영 |
| TC-094 | `i18n.test.ts` | 불변 | ⓑ `EXPECTED_KO_SLOTS.kb_down` = `{title:'타자 입력 {n}', desc: KO_KB_DOWN_DESC}`(설명만 개정). 단순 키 93 불변 ⓐ·ⓒ 해당 없음 | 반영 |
| TC-200 | `Hair.test.tsx` | 불변(`HAIR`·`NO_HAIR` — 둘 다 `kb_down_0`만) | ⓑ `EMPTYABLE_SLOT_KEYS` = `['hair','kb_down_0']`, `slotCard(HAIR, kb_down_0, 'kb_down', 1)` = `emptyable` true·`canEmpty` true(옛 false·false), `emptyable` 카드 = `[hair, kb_down_0]`, `canEmpty` 카드 = HAIR `[hair, kb_down_0]` / NO_HAIR `[kb_down_0]`. hair 예 1·2·다른 칸(kb_up·background·mouse_base·idle·mouse_left) false 불변 ⓐ·ⓒ 해당 없음 | 반영 |
| TC-201 | 같음 | 불변(`HAIR`) | ⓐ 뒷머리 카드 버튼 3개·두 줄 불변 + `kb_down_0` 카드 버튼 `[이미지 변경, 기본값, 비우기]`·셋째 이름 `타자 입력 1 그림 비우기`·`.cardEmptyable`, 나머지 슬롯 카드 **16장**(옛 17) 버튼 2개·한 줄, `/그림 비우기$/` 버튼 **2개**(첫째 = 뒷머리) ⓑ `hair` `emptyable`·`canEmpty` true 불변 ⓒ `pickPngFile`·`importAsset`·`removeAsset`·`restoreDefaultAsset`·`setSettings` 0회 | 반영(제목 문구 「뒷머리 카드만 버튼 3개」는 예산으로 미개정 — V-3) |
| TC-137 · TC-139 · TC-143 · TC-144 · TC-151 · TC-157 · TC-179 · TC-FLOW-15 · TC-193 · TC-202 ~ TC-207 · TC-FLOW-18 · TC-FLOW-19 · SettingsApp TC-FLOW-01 | 각 스펙 | 불변 | 불변 — 카드별 버튼을 이름·앞 두 칸으로 찾거나(TC-FLOW-15 `[1]` = 「기본값」), 뒷머리 「비우기」를 이름으로 찾거나(`뒷머리 그림 비우기`), `cardButtons()` 전부 비활성·모든 버튼 `type=button`을 본다. `kb_down_0` 셋째 버튼이 생겨도 성립. `필수 · 미등록`은 kb_up만 단언(TC-137·TC-FLOW-01). **회귀 감시** | 불변 |

#### v17 신규 TC

### TC-229 · 필수 판정 = `REQUIRED_SLOTS` 2개 — `kb_down_0` 선택, 모든 매니페스트 필수 카드 2장 · 종류: 자동 · 요구: R-40, R-25 · 설계: images-tab §3.3 「필수 판정 출처 불변」·렌더 결과·대체 서술 표 1행, 예정 TC ①② · 스펙: `test/imageSlots.test.ts` · **신규(CR-043)**
- Given bridge `REQUIRED_SLOTS`·`isRequiredSlot`(v0.19 실물), `EMPTY`·`{kb_down_0}`·`KB3`·`DEFAULT7`
- When `slotCard(m, kb_down_0, 'kb_down', frames)`(frames 0·1·2), `buildSlotGroups(m)`
- Then ⓐ 해당 없음(순수 모듈) ⓑ `REQUIRED_SLOTS.map(slotKey)` = `[kb_up, mouse_base]`, `isRequiredSlot(kb_down_0)` false, kb_up·mouse_base true / `kb_down_0` 세 경우 모두 `{msg:'kb_down', n:1, required:false, resetKind:'restore', canReset:true, lastOnlyBlocked:false}` / 세 매니페스트 모두 필수 카드 키 `[kb_up, mouse_base]`, 모든 카드 `required === isRequiredSlot(slot)`, `EMPTY` 18장, `DEFAULT7` `kb_down_0` `required` false·`canReset` true ⓒ bridge 해당 없음(호출 대상 없음 — 상수만)

### TC-230 · 화면 — 필수 배지·「필수 · 미등록」은 기본·팔 기본뿐, 「타자 입력 1」은 선택·새 설명 · 종류: 자동 · 요구: R-40, R-25, R-20 · 설계: images-tab §3.3 렌더 결과(배지 없음·`emptyRequired` 대신 빈 미리보기)·예정 TC ③, i18n §4.4 CR-043(ko 설명·`badgeRequired`·`emptyRequired` 불변) · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-043)**
- Given `SETTINGS`, `EMPTY` → `BASIC`(kb_down_0·1 등록) → `NO_DOWN`(kb_up·mouse_base만)
- When 렌더 후 props 재렌더 두 번(조작 없음)
- Then ⓐ `EMPTY`: 「필수」 배지 카드 = `[slot-card-kb_up, slot-card-mouse_base]`, 「필수 · 미등록」 카드 = 같은 2장, `kb_down_0` 카드 h3 `타자 입력 1`·「선택」·「등록된 그림 없음」·「필수」/「필수 · 미등록」 없음·`img` 없음·설명 p = `KB_DOWN_DESC_KO`(`title` 같은 전체 문구) / `BASIC`: `kb_down_0` 「선택」, 「필수」 배지 여전히 2장, 「필수 · 미등록」 0개 / `NO_DOWN`: `kb_down_0` 「등록된 그림 없음」, 「필수 · 미등록」 0개, `alert` 없음 ⓑ 카드 `required`: kb_up·mouse_base만 true(`slotBusy` null) ⓒ `pickPngFile`·`importAsset`·`removeAsset`·`restoreDefaultAsset`·`setSettings` 0회

### TC-231 · 사전 — `slots.kb_down` 설명 개정, 제목·필수 문구 불변 · 종류: 자동 · 요구: R-40, R-20 · 설계: i18n §4.4 CR-043 블록(표·머리 문단 「토글 이름은 `pen_up` 설명과 같은 표기」·필수 문구 불변 줄·`key_*` 불변 줄), images-tab §3.3 예정 TC ④ · 스펙: `test/i18n.test.ts` · **신규(CR-043)**
- Given `ko`·`ja`·`en` 사전
- When 키·값 조회
- Then ⓐ 해당 없음(사전) ⓑ ko `slots.kb_down` = `{title:'타자 입력 {n}', desc: KO_KB_DOWN_DESC}`, `format(title,{n:1})` = `타자 입력 1` / 제목 ja `押下 {n}`·en `Press {n}` 불변 / 세 언어 설명이 옛 CR-028 문구(ko `타자를 칠 때 나오는 그림(여러 장이면 차례로 바뀜)`·ja `キーを押したとき(複数枚なら交互に表示)`·en `While a key is pressed (alternates if several)`)가 아니고 토글 이름 표기(ko `「펜 손 사용」`·ja `「ペンの手を使う」`·en `"Use pen hand"`)를 포함, 비어 있지 않음·제목 `{n}` 유지 / `badgeRequired` `필수`·`emptyRequired` `필수 · 미등록`·`key_space` 설명 = `SAME_KEY` 불변 (ja·en 정확 비교 안 함 — 검수 필요, v8 관례) ⓒ bridge 해당 없음

### TC-232 · `EMPTYABLE_SLOT_KEYS`·`canEmpty` — §12.2 검증 예 4행, hair 회귀, `kb_down_1+`·추가 카드 제외 · 종류: 자동 · 요구: R-41, R-35, R-25 · 설계: images-tab §12.2 표(상수·`canEmpty` 식·`emptyable` 불변·`resetKind`/`canReset`/`required` 불변)·검증 예 4행·「`kb_down_1+` 카드·추가 카드는 `emptyable` false」, §12.3 「비운 뒤 키보드 그룹 = 빈 매니페스트와 같은 구성」, 예정 TC §12.5 ①② · 스펙: `test/imageSlots.test.ts` · **신규(CR-043)**
- Given 매니페스트 4행(kb_up + {없음 · kb_down_0 · kb_down_0·1 · kb_down_1}), `EMPTY`, `three`(kb_down_0·1·2), `hairAndTwo`(three + hair), `hairAndOne`(kb_down_0 + hair), `DEFAULT7`
- When `slotCard(m, kb_down_0, 'kb_down', frameCount(m,'kb_down'))`·`buildSlotGroups(m)`
- Then ⓐ 해당 없음 ⓑ `[...EMPTYABLE_SLOT_KEYS]` = `['hair','kb_down_0']` / 4행 `kb_down_0` = `emptyable` true·`canEmpty` false·**true**·false·false, 네 행 모두 `required` false·restore·`canReset` true·`lastOnlyBlocked` false, `buildSlotGroups` 결과가 직접 호출과 `toStrictEqual` / `EMPTY` `kb_down_0` true·false / `three`: kb_down_1·2 `emptyable`·`canEmpty` false, kb_down_0 true·false / hair: `hairAndTwo` true·true, `EMPTY` true·false / `hairAndTwo` `emptyable` 카드 `[hair, kb_down_0]`·`canEmpty` 카드 `[hair]`, `hairAndOne` `canEmpty` 카드 `[hair, kb_down_0]` / `DEFAULT7`의 그 밖 16장 false·false / `three` 추가 카드 `[kb_down_3]`에 `emptyable` 필드 없음 / kb_up만 있는 매니페스트의 키보드 그룹 키 = `EMPTY`와 같음·전부 slot ⓒ bridge 해당 없음

### TC-233 · 화면 — 「타자 입력 1」 카드만 셋째 버튼 「비우기」, 활성 규칙, ja·en 이름 · 종류: 자동 · 요구: R-41, R-35, R-20 · 설계: images-tab §12.1(키보드 다른 카드 한 줄 그대로)·§12.2(`kb_down_1` 등록 시 비활성)·§12.3(`onEmpty`는 `spec.emptyable`이면 넘김 — 코드 변경 없음, `onRequestEmpty` `!canEmpty` 무시)·§12.4(aria-label·title 없음), §11.3 렌더(`disabled={disabled || !canEmpty}`), i18n §4.4 CR-043 R-41 줄, 예정 TC §12.5 ③ · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-043)**
- Given `KB1` → `BASIC` → `EMPTY` → `KB1`(ko), 이어서 `KB1`(ja)·`KB1`(en)
- When 렌더·props 재렌더, 비활성 「비우기」 클릭
- Then ⓐ `KB1`: `kb_down_0` 버튼 글자 `[이미지 변경, 기본값, 비우기]`·aria `[타자 입력 1 이미지 변경, 타자 입력 1 기본 그림으로 되돌리기, 타자 입력 1 그림 비우기]`·전부 활성·`type=button`·셋째 `title` 없음 / kb_up·idle·rest·key_space·key_undo 버튼 `[이미지 변경, 기본값]`, 추가 카드 `kb_down_1`에 「비우기」 없음, 화면 `/그림 비우기$/` 버튼 = `[slot-card-hair, slot-card-kb_down_0]` / `BASIC`: 「비우기」 **비활성**·「기본값」·「이미지 변경」 활성·클릭해도 `alertdialog` 없음, `kb_down_1` 버튼 2개·`타자 입력 2 그림 지우기` 활성 / `EMPTY`: 「비우기」 비활성·「기본값」 활성·클릭해도 확인창 없음 / `KB1` 재렌더 → 활성 / ja 이름 `押下 1の画像を削除`·en `Clear image: Press 1`, 글자 = 그 사전 `emptyImage`, 카드 셋째 버튼·활성 ⓑ `kb_down_0` `canEmpty` true → false → false → true, `slotBusy` null ⓒ `pickPngFile`·`importAsset`·`removeAsset`·`restoreDefaultAsset`·`setSettings` 0회

### TC-234 · 「타자 입력 1」 카드 고정 치수 양식 — 두 줄 버튼·미리보기 106px 클래스 · 종류: 자동(클래스) + 수동 M-43(px) · 요구: R-41, R-28 · 설계: images-tab §12.1(§11.2 ASCII·높이 합산 280px 재사용), §11.3 `ImageSlotCard` 렌더·CSS(`.cardEmptyable .preview` 106px·`.actions2` 격자·`.outline` 재사용), §12.2 「`emptyable` 등록 여부와 무관」, 예정 TC §12.5 ⑤ · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-043)**
- Given `KB1`·`BASIC`·`EMPTY` 차례로
- When 렌더·props 재렌더
- Then ⓐ 세 매니페스트 모두 `kb_down_0` 카드 버튼 3개, 카드 클래스에 `cardEmptyable` + kb_up 카드의 모든 클래스, 세 버튼 한 부모·부모 클래스 `actions2`, 셋째 버튼 클래스 = 둘째(`.outline`) / kb_up·idle·key_space·(`BASIC`) kb_down_1은 `cardEmptyable` 없음·버튼 부모 `actions2` 아님. 실제 106px·64px·280px는 jsdom이 계산하지 못해 M-43 ⓑ `emptyable` true(등록·빈 칸 무관) ⓒ `pickPngFile`·`removeAsset`·`restoreDefaultAsset` 0회

### TC-235 · I-12 취소·Esc — 기존 비우기 확인창(`{name}` = 타자 입력 1), 호출 없음 · 종류: 자동 · 요구: R-41, R-35 · 설계: images-tab §12.3 I-12(확인 대화상자·포커스 「취소」·취소·Esc → 호출 없음, 포커스 「비우기」), §11.4 `onRequestEmpty`·`onCancelReset`, §11.5 confirm 표(danger·2단추·새 문구 없음), 예정 TC §12.5 ④ · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-043)**
- Given `KB1`, `window.confirm` spy
- When 「타자 입력 1 그림 비우기」 → 「취소」, 다시 「비우기」 → Esc
- Then ⓐ `alertdialog` `aria-modal=true`·이름 `그림 지우기`·설명 `‘타자 입력 1’ 그림을 지울까요? 되돌릴 수 없습니다.`·버튼 `[지우기, 취소]`·「지우기」 `danger`·처음 포커스 「취소」 / 닫힌 뒤 포커스 = 누른 「비우기」(두 번 모두), 「비우기」 활성, `img` src `asset://kb_down_0.png` 그대로 ⓑ `confirm` 대상 null로 복귀, 매니페스트 불변 ⓒ `removeAsset`·`restoreDefaultAsset`·`importAsset`·`setSettings` 0회, `window.confirm` 0회

### TC-236 · I-12 확정 — `removeAsset({kind:'kb_down',index:0})` 1회, 포커스 「이미지 변경」, 빈 선택 칸 · 종류: 자동 · 요구: R-41, R-40, R-32 · 설계: images-tab §12.3 I-12 정상(모든 카드 버튼 비활성·`removeAsset` 1회·`restoreDefaultAsset` 0회·`emptyOptional`·「비우기」 비활성·「기본값」 활성·포커스 `focusAfter`)·「비운 뒤 키보드 그룹 = 빈 매니페스트와 같은 구성」, §11.4 `onConfirmClear`(`c.focusAfter ?? c.trigger`), 계약 기존 `remove_asset`, 예정 TC §12.5 ④ · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-043)**
- Given `KB1`, `removeAsset` → deferred(`NO_DOWN`으로 resolve)
- When 「비우기」 → 「지우기」 → 응답 → props `NO_DOWN` 재렌더(`assets://changed` 흉내)
- Then ⓐ 진행 중 카드 안 모든 버튼 비활성 / 응답 뒤 포커스 `타자 입력 1 이미지 변경`, 재렌더 전 `img` 그대로 / 재렌더 뒤 `img` 없음·「등록된 그림 없음」·「필수 · 미등록」 없음·「비우기」 비활성·「기본값」 활성·포커스 유지·추가 카드 0·카드 `alert` 없음 ⓑ `slotBusy` `kb_down_0` → null, `pendingFocusRef` = 「이미지 변경」 ⓒ `removeAsset({kind:'kb_down',index:0})` 정확히 1회, `restoreDefaultAsset`·`importAsset`·`pickPngFile`·`setSettings` 0회, `onError` 0회

### TC-237 · I-12 실패 — 그 카드 오류 띠(ko core message · en code 문구), 그림 그대로 · 종류: 자동 · 요구: R-41, R-20 · 설계: images-tab §12.3 I-12 오류(`asset.not_found`·`asset.io`·`asset.manifest` → 그 카드 오류 띠, 그림 그대로), §11.4 `onConfirmClear` 예외(reject → 그 카드 오류 띠)·포커스(관리자 결정 N-1과 같은 코드 경로), design `errorText`, 예정 TC §12.5 ④ · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-043)**
- Given `KB1`, `removeAsset` 1회째 reject `DOWN_IO`, 2회째 reject `DOWN_GONE`
- When ko: 「비우기」 → 「지우기」 / en 새 렌더: `Clear image: Press 1` → `en.confirmClearOk`
- Then ⓐ ko: `kb_down_0` 카드 `alert` = `DOWN_IO.message`, `img` 그대로, 「비우기」·「기본값」 다시 활성, 포커스 `타자 입력 1 이미지 변경`, kb_up·hair 카드 `alert` 없음 / en: 카드 `alert` = `en.errors['asset.not_found']` ⓑ `cardError` = `{key:'kb_down_0', …}`, `slotBusy` null ⓒ `removeAsset` 2회 모두 인자 `slotKey` = `kb_down_0`, `restoreDefaultAsset`·`setSettings` 0회, `onError` 0회(창 오류 줄 아님)

#### v17 신규 TC-FLOW (번호는 TC-FLOW 절 체계 — 변경 델타를 한 곳에 두려고 이 절에 정의)

### TC-FLOW-22 · S-21: 펜 손 캐릭터 사용자가 첫 실행 이미지 탭에서 필수 배지 2장과 「타자 입력 1」의 「선택」 배지·설명을 보고 선택 칸임을 안다 — 타자 입력 그림이 없는 설치에서도 경고가 없다 · 종류: 자동 · 요구: R-40 · Steps: TC-230(배지 부분) → TC-231(값 — 화면 설명으로 확인, TC-230 설명 부분) → TC-230(빈 칸 부분) · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-043)**
- 상태 전달: Step 1·2는 첫 실행 매니페스트 `d7()`(`DEFAULT_ASSET_SLOTS` 7장), Step 3은 같은 매니페스트에서 `kb_down_0`만 뺀 `withoutDown0(d7())`를 props 재렌더로 넘긴다
- Given `d7()`, `SETTINGS`
- When 렌더 → 설명 확인 → 재렌더
- Then ⓐ Step 1 「필수」 배지 카드 `[kb_up, mouse_base]`, `kb_down_0` 「선택」·`img` `asset://kb_down_0.png` / Step 2 설명 p = `KB_DOWN_DESC_KO`·`title` 같음 / Step 3 `kb_down_0` 「등록된 그림 없음」, 「필수 · 미등록」 0개, 「필수」 배지 여전히 2장 ⓑ 매니페스트 `d7()` → `withoutDown0`, `slotBusy` null ⓒ `pickPngFile`·`importAsset`·`removeAsset`·`restoreDefaultAsset`·`setSettings` 0회

### TC-FLOW-23 · S-22: 펜 손만 쓰는 사용자가 「타자 입력 1」을 없애려다 잠긴 「비우기」를 보고 타자 입력 2부터 비운 뒤 「타자 입력 1」을 비우고, 다시 필요해져 「기본값」으로 되돌린다 · 종류: 자동 · 요구: R-41, R-40, R-32 · Steps: TC-233(`kb_down_1` 있으면 비활성 부분) → TC-143(뒤 장 「기본값」 = 비우기 부분, 대상 `kb_down_1`) → TC-233(활성 부분) → TC-235(확인창 설명 부분) → TC-236(확정·빈 칸 부분) → TC-179(복원 칸 「기본값」 부분, 대상 `kb_down_0`) · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-043)**
- 상태 전달: Step 2 응답 `d7()` → props 재렌더 → Step 3 Given(`kb_down_1` 없음), Step 5 응답 `NO0`(= `withoutDown0(d7())`) → 재렌더 → Step 6 Given, Step 6 응답 `BACK`(`kb_down_0` url `?v=d`) → 재렌더
- Given `TWO` = `d7()` + `kb_down_1`, `removeAsset` 1회째 → `d7()`·2회째 → `NO0`, `restoreDefaultAsset` → `BACK`
- When 「비우기」 비활성 확인 → `타자 입력 2 그림 지우기` → 「지우기」 → 재렌더 → 「타자 입력 1 그림 비우기」 → 「지우기」 → 재렌더 → `타자 입력 1 기본 그림으로 되돌리기` → 「기본 그림으로」 → 재렌더
- Then ⓐ Step 1 「비우기」 비활성 / Step 3 `slot-card-kb_down_1` 없음·「비우기」 활성 / Step 4 확인창 설명 `‘타자 입력 1’ 그림을 지울까요? 되돌릴 수 없습니다.` / Step 5 포커스 `타자 입력 1 이미지 변경`, 재렌더 뒤 `img` 없음·「등록된 그림 없음」·「비우기」 비활성·추가 카드 0 / Step 6 재렌더 뒤 `img` src `asset://kb_down_0.png?v=d`·「비우기」 활성 ⓑ 매니페스트 `TWO` → `d7()` → `NO0` → `BACK`, 각 단계 끝 `slotBusy` null ⓒ `removeAsset` 1회째 `{kind:'kb_down',index:1}`·2회째 `{kind:'kb_down',index:0}`(총 2회), `restoreDefaultAsset({kind:'kb_down',index:0})` 1회, `importAsset`·`setSettings` 0회, `onError` 0회

v17 추적 — 요구 ↔ TC (앞 표와 겹치면 이 표 우선)

| 요구ID | 상태 | 자동 TC | 수동 | TC-FLOW |
|---|---|---|---|---|
| R-40 | 유효(신설, 사용자 확정 🔒) | TC-229, TC-230, TC-231 + 개정 TC-133, TC-134, TC-135, TC-136, TC-192, TC-094 / TC-236(빈 칸 = 선택 문구) | M-43 1)·4) | TC-FLOW-22, TC-FLOW-23 |
| R-41 | 유효(신설, 사용자 확정 🔒) | TC-232, TC-233, TC-234, TC-235, TC-236, TC-237 + 개정 TC-200, TC-201 | M-43 2) ~ 7) | TC-FLOW-23 |
| R-35 | 유효(「뒷머리 카드에만」을 R-41이 확장 — 문구 불변) | 앞 추적 그대로 + TC-232(hair 회귀), TC-200·TC-201(개정), 회귀 TC-202 ~ TC-207 | M-33 | TC-FLOW-18, TC-FLOW-19 |
| R-25 | 유효(「kb_down_N 1장 필수」를 R-40이 대체 — 문구 불변) | 앞 행 + TC-229, TC-230, TC-232 | 같음 | 같음 |
| R-20 | 유효 | 앞 행 + TC-231, TC-233(ja·en 이름), TC-237(en 오류 문구) | M-43 5) | 같음 |
| R-28 · R-32 | 유효 | 앞 행 + TC-234(R-28), TC-236·TC-FLOW-23(R-32 복원 불변) | M-43 3) | 같음 |
| 그 밖 유효 요구 | 유효 | 앞 추적 그대로 | 같음 | 같음 |

v17 추적 — 설계 항목 ↔ TC

| 설계 항목 | TC |
|---|---|
| images-tab §3.3 필수 판정 출처 불변(`isRequiredSlot` v0.19, 화면 코드 변경 없음) | TC-229 |
| §3.3 렌더 결과(배지 없음·`emptyRequired` 대신 빈 미리보기·restore·`canReset` true·「기본값」 = 복원) | TC-230, TC-229, TC-236, TC-FLOW-22 |
| §3.3 대체 서술 표(§3 검증 예 필수 2장·§5 D-1·§3.1/§11.1 「필수 배지 2」) | TC-134, TC-192, TC-136, TC-229 |
| §3.3 예정 TC ①~④ | ① TC-229·TC-133 ② TC-229·TC-134 ③ TC-230·TC-136 ④ TC-231·TC-094 |
| §12.1 레이아웃(§11.2 재사용 — 두 줄 버튼·미리보기 106px·280px, 다른 키보드 카드 한 줄) | TC-234, TC-233(다른 카드 버튼 2개), 수동 M-43 3) |
| §12.2 `EMPTYABLE_SLOT_KEYS`·`canEmpty` 식·`emptyable` 불변·`resetKind`/`canReset`/`required` 불변·검증 예 4행·`kb_down_1+` 비활성·추가 카드 제외 | TC-232, TC-200, TC-233 |
| §12.3 컴포넌트 코드 변경 없음(`onEmpty` 자동 연결·`onRequestEmpty` 이중 비활성) | TC-233, TC-234 |
| §12.3 I-12 정상·취소·오류·confirm 필수 | TC-236, TC-235, TC-237 |
| §12.3 「비운 뒤 core 재시딩 없음」 | 수동 M-43 6) |
| §12.3 「비운 뒤 키보드 그룹 = 빈 매니페스트 구성」 | TC-232, TC-236, TC-FLOW-23 |
| §12.3 계약(기존 `remove_asset` — 새 command·event·코드 없음) | TC-236 ⓒ, TC-FLOW-23 ⓒ |
| §12.4 문구·aria(`emptyImageAria` `{name}` = 타자 입력 1, 3개 국어)·포커스 순서·비활성 이유 알림 없음 | TC-233, TC-235, TC-201, 수동 M-43 4)·5) |
| §12.5 예정 TC ①~⑤ | ① TC-232·TC-200 ② TC-232 ③ TC-233·TC-201 ④ TC-235·TC-236·TC-237 ⑤ TC-234 + M-43 |
| i18n §4.4 CR-043 `kb_down` 설명·필수 문구 불변·`key_*` 불변 | TC-231, TC-094, TC-230, TC-FLOW-22, 수동 M-43 1)·5) |
| i18n §4.4 CR-043 R-41 줄(aria 결과·`confirmClearMessage` `{name}`) | TC-233, TC-235, TC-237 |
| contract v0.19 `REQUIRED_SLOTS` | TC-229 |
| `design.md` RTM R-40·R-41 | 위 요구 ↔ TC 표 |

v17 추적 — 사용자행 ↔ TC-FLOW: **S-21**(R-40) → TC-FLOW-22 · **S-22**(R-41, R-40) → TC-FLOW-23. 그 밖 행은 앞 표 그대로.

CR ↔ TC: CR-043 → 신규 TC-229 ~ TC-237·TC-FLOW-22·TC-FLOW-23 / 개정 TC-133·TC-134·TC-135·TC-192(`imageSlots.test.ts`)·TC-136(`ImagesTab.test.tsx`)·TC-094(`i18n.test.ts`)·TC-200·TC-201(`Hair.test.tsx`) — 스펙 전부 반영 / 수동 M-43 신설.

설계 확인 필요 (v17, 관리자 인계 — 문서 수정은 소유자)

- **V-1. 영향 TC 목록 정정(CR 대장 CR-043 · `design.md` RTM R-40·R-41 「영향 예상」).** 실제로 기대가 바뀐 TC는 TC-133·TC-134·TC-135·TC-192·TC-136·TC-094·TC-200·TC-201뿐이다. 「TC-132·TC-177·TC-178」·「TC-137 ~ TC-152」·「TC-093·TC-095 ~ TC-098」은 필수 수·`kb_down` 설명을 단언하지 않아 불변(회귀 감시만). R-41 「CR-038 뒷머리 비우기 TC 회귀」는 TC-200(`EMPTYABLE_SLOT_KEYS` 값·`kb_down_0` 기대)·TC-201(카드 수 17 → 16·「비우기」 버튼 1 → 2)이 실제로 바뀐다. ui-designer·CR 대장 동기화 권고.
- **V-2. 스펙이 고정한 해석.** ① 실패 뒤 포커스도 「이미지 변경」(TC-237 — 뒷머리 N-1과 같은 `onConfirmClear` 경로) ② TC-231은 ja·en 초안을 정확 비교하지 않되 토글 이름 표기(`「ペンの手を使う」`·`"Use pen hand"`) 포함을 단언한다(i18n §4.4 CR-043 머리 문단 규칙) — 검수에서 표기를 바꾸면 그 두 줄만 고친다 ③ TC-233은 ja·en aria 결과 리터럴(`押下 1の画像を削除`·`Clear image: Press 1`)을 i18n §4.4 R-41 줄에서 옮겼다 ④ `kb_down_1`만 있는 매니페스트(0 비어 있음)의 `kb_down_0`은 `emptyable` true·`canEmpty` false(§12.2 표 4행).
- **V-3. TC-201 스펙 제목 미개정.** `Hair.test.tsx` TC-201의 it 이름 「뒷머리 카드만 버튼 3개 …, 다른 슬롯 카드는 2개」가 개정된 본문(타자 입력 1 카드도 3개)과 어긋난다. 단언은 반영했고 제목만 예산으로 남았다 — 다음 위임에서 「뒷머리·타자 입력 1 카드 버튼 3개」로 고친다.
- **V-4. ko 설명 길이 경계.** i18n §4.4 CR-043의 ko 55자는 카드 설명 2줄 한도(약 28자 × 2)에 거의 닿는다. 넘치면 말줄임 + `title` 툴팁이 정해져 있어 결함은 아니고, 실물은 M-43 1)에서 본다.

### CR-044 개정 (v18 — 배포용 기본 세트 2차 교체 🔒 · 뒷머리 「비우기」 버튼 삭제, 증분 모드)

비유: 견본 상자가 7개에서 6개로 줄었다 — 뒷머리 견본이 빠졌다. 견본이 없는 칸의 「기본값」 손잡이는 「치우기」로 돌아가므로, 뒷머리 칸에 따로 달았던 지우개 단추는 뗐다. 처음 놓이는 어깨·팔·펜 손 자리도 사용자가 쓰던 자리로 옮겼다. 테스트는 「견본 수를 6으로 말하는가」, 「뒷머리 「기본값」이 치우기로 동작하는가」, 「지우개 단추가 타자 입력 1 칸에만 남았는가」, 「처음 자리가 새 좌표인가」를 본다.

- **v18 기준(이 절이 앞 모든 기준 줄·CR 절보다 우선)**: `doc/000_프로젝트_확정사항.md` §6 「배포용 기본 세트 2차 교체」(🔒 2026-09-26, CR-044 — CR-038 목록 대체) · contract **v0.20** · `src/bridge/types.ts` 반영분 — `DEFAULT_ASSET_SLOTS` **6개**(순서 `kb_up` · `kb_down_0` · `background` · `mouse_base` · `pen_up` · `pen_down_0`, **hair 없음**), `DEFAULT_MOUSE_SETTINGS` `shoulder` **(582,484)** · `partPos` **(411,464)** · `penPos` **(372,476)** · `penMode` true(불변) · `area` 불변. **메인 결정(2026-09-26)**: M-2 `EMPTYABLE_SLOT_KEYS` = **`['kb_down_0']`**(hair 제외 — 뒷머리 카드는 다른 기본 없는 카드처럼 「기본값」 하나로 비우기, 셋째 「비우기」 버튼 없음. 소스는 ui-fixer 몫) · M-3 TC-FLOW-18 복원 단계 삭제, **TC-FLOW-19 폐기**(S-18 전제 소멸) · M-4 기본 그림 기하 픽스처(DragHit·mouseWizard)는 범위 밖(기록만 — W-7). 화면 문서(requirements·design·images-tab·i18n)에는 CR-044 기록이 아직 없다 → W-1
- **범위·수(v18)**: 새 요구·새 TC 없음 — **개정·폐기만**. 자동 TC 번호 237개(TC-001 ~ TC-237) 중 **유효 229 · 폐기 8**(+TC-204 · TC-205) · TC-FLOW 번호 23개 중 **유효 22 · 폐기 1**(TC-FLOW-19) · 수동 35개(개정 필요 — W-4)
- **mock·시간 규약(v18)**: 변경 없음. `bridge/types`(`DEFAULT_ASSET_SLOTS`·`hasBuiltinDefault`·`DEFAULT_MOUSE_SETTINGS`)·`imageSlots`·i18n 사전은 실물, 기대값은 리터럴로 적어 상수와 독립 대조. 시간 의존 없음(deferred promise + `waitFor`)
- **선행(v18)**: bridge v0.20 반영 완료 → 좌표·6장·hair 비우기 칸(`resetKind`) 기대는 현행 소스에서 PASS 예정. **M-2 소스 미적용**(`imageSlots.ts` `EMPTYABLE_SLOT_KEYS` — ui-fixer) → 적용 전 **예정 Red**: `imageSlots.test.ts` TC-192 · TC-232(emptyable 부분) · `Hair.test.tsx` TC-193 · TC-200 · TC-201 · TC-207(「비우기」 없음 부분) · `ImagesTab.test.tsx` TC-233(「비우기」 1개 부분) · TC-FLOW-15(뒷머리 버튼 2개 부분)
- **새 사실 → 기대값 규칙(모든 개정 TC 공통)**
  1. 복원 칸(`resetKind` `'restore'`) = 위 **6칸**. **`hair`는 비우기 칸**(단일 슬롯): 미등록이면 「기본값」 비활성·`title` 없음, aria-label `뒷머리 그림 지우기`(ja·en `format(clearImageAria)`), 등록되면 활성, 확정 → 기존 비우기 확인창(`confirmClear*`, `{name}` = 뒷머리) → `removeAsset('hair')` 1회·`restoreDefaultAsset` 0회, 응답 뒤 포커스 = 누른 「기본값」(`focusAfter` 없음 — §5 `onConfirmClear` `c.focusAfter ?? c.trigger`)
  2. (M-2) `hair` `emptyable`·`canEmpty` 늘 false. 뒷머리 카드 버튼 `[이미지 변경, 기본값]` 2개·한 줄(`cardEmptyable`·`actions2` 없음). 화면 「… 그림 비우기」 버튼 = 「타자 입력 1」 **1개**. 셋째 버튼 없는 슬롯 카드 **17장**(CR-043 16)
  3. `downloadDefaultsDesc` `{n}` = **6**, 완료 `기본 이미지 6장을 저장했습니다.`, 기본 파일 전부 충돌 `6개`, 부분 실패 ok = 6 − 실패 수. 충돌 예시의 `hair.png`는 기본 세트 밖 → `background.png`
  4. `settings.mouse` null(= `DEFAULT_MOUSE_SETTINGS`)의 표시·저장 기대: `shoulder` **(582,484)** · `partPos` **(411,464)** · `penPos` **(372,476)** · `penMode` true. 미리보기(scale 0.5) 축 마커 `left 291px · top 242px`, 손 그림 `left 205.5px · top 232px`. 리셋은 `penMode` 현재 값 보존(CR-033 결정 ①) 그대로
  5. 좌표 재계산이 필요한 끌기 TC(TC-058·TC-090)는 아래 표에 근거를 적는다(이동량은 옛 TC와 같게 유지)
- **단언 의도는 모두 유지**(칸 종류 판정·활성 규칙·호출 인자·문구 치환·끌기 저장 인자). 바뀐 것은 대상 칸·숫자·좌표와, M-2로 사라진 「비우기」 버튼의 단언 대상(→ 「기본값」)뿐이다.

#### v18 개정·폐기 TC (앞 본문을 대체 — 번호 유지, Given/When 불변이면 「불변」)

| 개정 TC | 스펙 | Given / When 변화 | Then ⓐ 화면 · ⓑ 상태/반환 · ⓒ bridge (새 기대) | 스펙 반영 |
|---|---|---|---|---|
| TC-133 | `imageSlots.test.ts` | 불변 | ⓑ 미등록 `hair` = `{required:false, resetKind:'clear', canReset:false, lastOnlyBlocked:false, n:null}`(CR-038 restore·true 대체), 미등록 `background` = restore·`canReset` true 불변, 나머지 불변 ⓐ·ⓒ 해당 없음(순수) | 반영 |
| TC-177 | 같음 | 예 4 대상 칸 교체 | ⓑ 복원 칸 `[pen_up, pen_down_0, mouse_base, kb_up]`(hair 제외), 비우기 칸 `[mouse_right, key_space, idle, hair]` `canReset` false, 18장 모두 `resetKind` = `hasBuiltinDefault`, 복원 칸 파일명 = 6장 ⓐ·ⓒ 해당 없음 | 반영 |
| TC-178 | 같음 | 픽스처 `DEFAULT_FILES` 6장(연동) | ⓑ `exportResult(done)` = `{kind:'done', count:6}`(CR-038 7), 나머지 불변 ⓐ·ⓒ 해당 없음 | 반영 |
| TC-192 | 같음 | 불변 | ⓑ `hasBuiltinDefault('hair')` **false**, 빈 hair `toStrictEqual` = `resetKind:'clear'`·`canReset:false`·`emptyable:false`·`canEmpty:false`(나머지 필드 불변), 등록 hair = clear·`canReset:true`·`emptyable:false`·`canEmpty:false`, `background` 불변, 그룹·필수 2장·1장 고정 불변 ⓐ·ⓒ 해당 없음 | 반영 |
| TC-232 | 같음 | 불변 | ⓑ `EMPTYABLE_SLOT_KEYS` = `['kb_down_0']`, hair(등록·미등록) `emptyable`·`canEmpty` false·등록 hair clear·`canReset` true, `hairAndTwo` `emptyable` 카드 `[kb_down_0]`·`canEmpty` 카드 `[]`, `hairAndOne` `canEmpty` 카드 `[kb_down_0]`, `DEFAULT7`의 `kb_down_0` 외 17장 false. `kb_down_0` 4행·`kb_down_1+`·추가 카드 불변 ⓐ·ⓒ 해당 없음 | 반영(M-2) |
| TC-182 | `ImagesTab.test.tsx` | 불변 | ⓐ 설명 `내장 기본 그림 6장을 원본 크기 그대로 폴더에 저장합니다. 따라 그리거나 고쳐 쓸 때 쓰세요.` ⓑ `DEFAULT_ASSET_SLOTS.map(slotKey)` = 위 6칸 ⓒ `pickFolder`·`exportDefaultAssets` 0회 | 반영 |
| TC-183 · TC-184 · TC-191 | 같음 | 완료 보고 픽스처 `DONE6`(연동) | ⓐ 완료 결과 줄 `기본 이미지 6장을 저장했습니다.` ⓑ·ⓒ 불변 | 반영 |
| TC-185 | 같음 | 충돌 목록 `['kb_up.png','background.png']`(CR-038 `hair.png` — 기본 세트 밖) | ⓐ 확인창 개수 `2개` 그대로, 완료 줄 6장 ⓑ·ⓒ 불변 | 반영 |
| TC-187 | 같음 | 첫 보고 = 6장 중 앞 2장 실패 | ⓐ `4장 저장, 2장 실패: kb_up.png, kb_down_0.png`(CR-038 5장), 덮어쓰기 뒤 `5장 저장, 1장 실패: kb_up.png`(CR-038 6장) ⓑ·ⓒ 불변 | 반영 |
| TC-189 | 같음 | 부분 실패 픽스처 = 6장 중 `kb_up.png` 실패 | ⓐ ja·en 설명 `format(downloadDefaultsDesc,{n:6})`, 부분 실패 `format(exportPartial,{ok:5, fail:1, files:'kb_up.png'})`, 완료 `format(exportDone,{n:6})` ⓑ 불변 ⓒ 호출 인자 불변 | 반영 |
| TC-233 | 같음 | 불변(`KB1`) | ⓐ 화면 `/그림 비우기$/` 버튼 = `[slot-card-kb_down_0]`(CR-043 `[hair, kb_down_0]` 대체), 버튼 2개 확인 목록에 `hair` 추가(`[이미지 변경, 기본값]`), 나머지 불변 ⓑ `kb_down_0` `canEmpty` 흐름 불변 ⓒ 0회 불변 | 반영(M-2) |
| TC-FLOW-15 | 같음 | 매니페스트 = `DEFAULT_ASSET_SLOTS` 6장 | ⓐ `img` 있는 카드 = 위 6칸(hair 없음), 그 6칸 「기본값」 활성·aria `… 기본 그림으로 되돌리기`, 빈 칸 **12개**(hair · idle · rest · key_* 7 · mouse_left · mouse_right) 비활성·aria `… 그림 지우기`, 뒷머리 카드 버튼 `[이미지 변경, 기본값]`·`뒷머리 그림 지우기` 비활성, 추가 카드 `[kb_down_1]` ⓑ 불변 ⓒ `importAsset`·`restoreDefaultAsset` 0회 | 반영 |
| TC-FLOW-17 | 같음 | 충돌 = 기본 파일 6개 | ⓐ 확인창 `이 폴더에 같은 이름의 파일이 6개 있습니다. …`, 완료 줄 6장 ⓑ 불변 ⓒ `exportDefaultAssets(DIR,false)` → `(DIR,true)` 2회 | 반영 |
| TC-193 | `Hair.test.tsx` | 불변(`NO_HAIR` → `HAIR`) | ⓐ 위치·제목·설명·선택 배지·빈 미리보기 불변, 버튼 `[이미지 변경, 기본값]`, 「기본값」 aria `뒷머리 그림 지우기` 빈 칸 **비활성**·`title` 없음 → 등록 뒤 활성·`title` 없음, `뒷머리 기본 그림으로 되돌리기`·`뒷머리 그림 비우기` 없음, 카드 19장 ⓑ `hasBuiltinDefault('hair')` false ⓒ `pickPngFile`·`importAsset`·`removeAsset`·`restoreDefaultAsset`·`setSettings` 0회 | 반영 |
| TC-196 | 같음 | Given `HAIR`, `removeAsset` deferred(`NO_HAIR`) · When 「기본값」 → 취소 / Esc / 「지우기」 → 응답 → props `NO_HAIR` | ⓐ `alertdialog`(`aria-modal`, 이름 `그림 지우기`, 설명 `‘뒷머리’ 그림을 지울까요? 되돌릴 수 없습니다.`, 버튼 `[지우기, 취소]`, 「지우기」 `danger`, 포커스 「취소」), 취소·Esc 뒤 닫힘·포커스 「기본값」, 확정 뒤 카드 버튼 전부 비활성, 응답 뒤(수신 전) 포커스 「기본값」·`img` 그대로, 수신 뒤 `img` 없음·「등록된 그림 없음」·「기본값」 비활성·카드 `alert` 없음(수신 뒤 포커스는 판정 안 함 — W-5) ⓑ `confirm`(clear, `focusAfter` 없음) → null, `slotBusy` hair → null ⓒ 취소·Esc 동안 0회, 확정 뒤 `removeAsset('hair')` 정확히 1회, `restoreDefaultAsset`·`importAsset`·`pickPngFile`·`setSettings`·`onError`·`window.confirm` 0회. 제목 「「기본값」 → 비우기 확인창 → removeAsset('hair')」 | 반영 |
| TC-200 | 같음 | 불변 | ⓑ `EMPTYABLE_SLOT_KEYS` = `['kb_down_0']`, 예 1 hair 등록 = `{emptyable:false, canEmpty:false, resetKind:'clear', canReset:true}`, 예 2 미등록 = `{false, false, 'clear', false}`, 예 3 다른 칸 false 불변, `kb_down_0` true·true, `buildSlotGroups` `emptyable`·`canEmpty` 카드 = `[kb_down_0]`(HAIR·NO_HAIR 모두), add 카드 필드 없음 ⓐ·ⓒ 해당 없음 | 반영 |
| TC-201 | 같음 | 불변(`HAIR`) | ⓐ 뒷머리 버튼 `[이미지 변경, 기본값]`·aria `[뒷머리 이미지 변경, 뒷머리 그림 지우기]`·활성·`type=button`, 카드 `cardEmptyable` 없음·버튼 줄 `actions`(≠ `actions2`)·`kb_up` 카드 클래스 전부 포함, `kb_down_0` 카드 버튼 3개·`타자 입력 1 그림 비우기`·`cardEmptyable` 유지, 나머지 슬롯 카드 **17장** 버튼 2개·한 줄, `/그림 비우기$/` = `[slot-card-kb_down_0]` ⓑ hair `emptyable`·`canEmpty` false ⓒ 0회. 제목 개정(**V-3 닫음**) | 반영 |
| TC-202 | 같음 | 대상 버튼 「비우기」 → **「기본값」**(비우기 칸) — Given·When 순서 불변 | ⓐ `NO_HAIR`에서 「기본값」 비활성·글자 `기본값`·`title` 없음·눌러도 `alertdialog` 없음 / `HAIR` 재렌더 뒤 활성 / kb_up 가져오기 진행 중 비활성·눌러도 확인창 없음 / 응답 뒤 활성 ⓑ hair `canReset` false → true, `slotBusy` kb_up → null ⓒ `importAsset('kb_up', PATH)` 1회, `removeAsset`·`restoreDefaultAsset`·`setSettings` 0회 | 반영 |
| TC-206 | 같음 | 대상 버튼 「비우기」 → **「기본값」** | ⓐ ko 뒷머리 카드 `alert` = `IO_FAIL.message`, `img` 그대로, 「기본값」·「이미지 변경」 다시 활성, 포커스 「기본값」(trigger — 호출 전에 넣음), kb_up `alert` 없음 / en 카드 `alert` = `en.errors['asset.not_found']` ⓑ `cardError` = hair, `slotBusy` null ⓒ `removeAsset` 2회 모두 `'hair'`, `restoreDefaultAsset`·`setSettings`·`onError` 0회 | 반영 |
| TC-207 | 같음 | 불변(`HAIR`, ja·en) | ⓐ 버튼 글자 `[changeImage, clearImage]`, 둘째 이름 `format(clearImageAria,{name})`, `emptyImageAria`·`restoreImageAria` 이름 버튼 없음, 확인창 `confirmClearTitle`·`format(confirmClearMessage,{name})`·`[confirmClearOk, confirmCancel]`·포커스 취소, 취소 뒤 포커스 「기본값」 ⓑ 불변 ⓒ `removeAsset`·`restoreDefaultAsset`·`setSettings` 0회 | 반영 |
| TC-203 | 같음 | 불변 | 사전 값 불변(`emptyImage`·`emptyImageAria`는 「타자 입력 1」 카드가 계속 씀) — 주석만 | 불변 |
| **TC-204 · TC-205** | 같음 | **폐기(CR-044 M-2)** — 「비우기」 버튼 없음. 같은 비우기 확인창·취소·Esc·확정·호출·포커스는 TC-196(「기본값」 경로), 실패는 TC-206이 덮는다 | — | 스펙 삭제 |
| TC-014 | `MousePartsTab.test.tsx` | 불변(`settings.mouse` null) | ⓐ 축 마커 (582,484) `left 291px · top 242px`·값 목록 `(582, 484)`, 손 그림 (411,464) `left 205.5px · top 232px`·`(411, 464)` ⓑ `mouse` = 새 `DEFAULT_MOUSE_SETTINGS` ⓒ `setSettings` 0회 | 반영 |
| TC-025(두 `it`) · TC-026 · TC-027 · TC-074 | 같음 | 불변 | ⓒ 리셋·저장 인자 `mouse`의 `shoulder` (582,484)·`partPos` (411,464)·`penPos` (372,476)·`area` 불변·`hand` null, `penMode` = 기본값을 쓰는 사례 true / 보존 사례는 현재 값(상수 `DEFAULT_MOUSE_EXPECTED`·`RESET_EXPECTED`·새 `DEFAULT_PART_POS`) ⓐ·ⓑ 불변 | 반영 |
| TC-058 | 같음 | 누름·이동 client 좌표 불변 | ⓐ 시작 (411,464), 이동 뒤 **(461,494)**. 근거: 팔 사각형 [411,611)×[464,614)(200×150), 누름 캔버스 (500,520) 안 → grab (89,56), 이동 캔버스 (550,550) → (461,494), 제한 x∈[0,700]·y∈[0,550] 안(이동량 (+50,+30) 불변. CR-038: grab (111,28)·(439,522)) ⓑ 불변 ⓒ `setSettings` 1회 `{...nullMouse, mouse:{...DEFAULT, partPos:(461,494)}}` | 반영 |
| TC-089 · TC-FLOW-07 | 같음 | 불변 | ⓒ 리셋 인자 `penPos` **(372,476)** ⓐ 수신 뒤 펜 손 (372,476) ⓑ 불변 | 반영 |
| TC-090 | 같음 | **Given 변경**: 누름 client (200,280) → **(210,260)**, 이동 (250,300) → **(260,280)**. 근거: 옛 누름 캔버스 (400,560)은 새 펜 손 사각형 [372,472)×[476,556)(100×80)의 아래 경계 밖. 새 누름 캔버스 (420,520) = 펜 손·팔 [411,611)×[464,614) **둘 다 안** → 펜 손 우선(TC-085), grab (48,44) | ⓐ 시작 펜 손 (372,476), 이동 뒤 **(472,516)**(이동량 (+100,+40) 불변, 제한 x∈[0,800]·y∈[0,620] 안), 팔 파츠 (411,464) 불변 ⓑ 불변 ⓒ `setSettings` 1회 `{...nullMouse, mouse:{...DEFAULT, penPos:(472,516)}}`(penMode true 포함) | 반영 |
| TC-170 | `PenMode.test.tsx` | 불변 | ⓒ `settings.mouse` null 첫 등록 「예」 저장 `penPos` = **(372,476)**(계산 없음) ⓐ·ⓑ 불변 | 반영 |
| TC-033 · TC-FLOW-04 | `SettingsApp.test.tsx` | 불변 | ⓐ `get_settings` 실패 뒤 초기값 축 마커 (582,484) / FLOW-04 수신 뒤 축 `(582, 484)`·손 그림 `205.5px · 232px`·`(411, 464)` ⓒ FLOW-04 리셋 인자 `shoulder` (582,484)·`partPos` (411,464)·`penPos` (372,476)·`penMode` false(보존) ⓑ 불변 | 반영 |

#### v18 개정·폐기 TC-FLOW

### TC-FLOW-18 · S-17: 뒷머리 PNG를 넣고 카드로 확인 → 미리보기 맨 아래 → 필요 없어져 「기본값」(비우기)으로 없애면 미리보기에서도 사라진다 · 종류: 자동 · 요구: R-34, R-32 · Steps: TC-194(이미지 변경·인자 부분) → TC-193(등록 뒤 표시 부분) → TC-198(`[hair, mouse_base, kb_up]`) → TC-196(「기본값」 → 비우기 확인 → `removeAsset('hair')`·포커스 부분) → TC-198(헤어 없으면 미렌더 부분) → M-32 · 스펙: `test/Hair.test.tsx` · **개정(CR-044 M-3 — 복원 단계·「비우기」 버튼 단계 삭제)**
- 상태 전달: Step 1 응답 `HAIR`가 Step 2·3 Given, Step 3 응답 `NO_HAIR`가 Step 4 Given
- Given `NO_HAIR`, `importAsset` → `HAIR`, `removeAsset` → `NO_HAIR`
- When 「뒷머리 이미지 변경」 → 재렌더 → 어깨축 탭 렌더 → 「기본값」 → 「지우기」 → 재렌더 → 어깨축 탭 렌더
- Then ⓐ Step 1 뒷머리 `img` `asset://hair.png`·「기본값」 활성 / Step 2 미리보기 `[hair, mouse_base, kb_up]` / Step 3 확인창 설명 `‘뒷머리’ 그림을 지울까요? 되돌릴 수 없습니다.`, 응답 뒤 포커스 「기본값」, 재렌더 뒤 `img` 없음·「기본값」 비활성 / Step 4 미리보기 `[mouse_base, kb_up]` ⓑ 매니페스트 `NO_HAIR` → `HAIR` → `NO_HAIR` ⓒ `importAsset('hair', PATH)` 1회 → `removeAsset('hair')` 1회, `restoreDefaultAsset`·`setSettings` 0회

### TC-FLOW-19 · S-18 · 상태: **폐기(CR-044 M-3)** — 「단발 캐릭터가 기본 뒷머리를 비웠다가 되돌린다」의 전제(내장 기본 뒷머리)가 사라졌다. 뒷머리를 비우는 경로는 TC-FLOW-18 Step 3이 덮는다. 스펙 삭제

v18 추적 — 요구 ↔ TC (앞 표와 겹치면 이 표 우선. 자동 TC만 적는다 — 수동은 W-4 개정 뒤)

| 요구ID | 자동 TC | TC-FLOW |
|---|---|---|
| R-36(기본 세트 — CR-044로 6장) | TC-177, TC-178, TC-182, TC-192 | TC-FLOW-15 |
| R-32(「기본값」 = 복원/비우기) | TC-133, TC-177, TC-192, TC-193, TC-196, TC-202, TC-206, TC-207 | TC-FLOW-15, TC-FLOW-18 |
| R-33(다운로드) | TC-178, TC-182 ~ TC-185, TC-187, TC-189, TC-191 | TC-FLOW-17 |
| R-34(헤어) | TC-192 ~ TC-196, TC-200 ~ TC-202, TC-206, TC-207 | TC-FLOW-18 |
| R-35(뒷머리 비우기 — M-2로 「기본값」이 수행, W-2) | TC-196, TC-200, TC-201, TC-206 | TC-FLOW-18 |
| R-41(타자 입력 1 비우기) | TC-232, TC-233, TC-201 | 앞 표 그대로 |
| R-17 · R-18 · R-11 · R-15 · R-29 · R-30 · R-01(기본 마우스 값) | TC-014, TC-025 ~ TC-027, TC-033, TC-058, TC-074, TC-089, TC-090, TC-170 | TC-FLOW-04, TC-FLOW-07 |
| 그 밖 유효 요구 | 앞 추적 그대로 | 같음 |

v18 추적 — 설계 항목 ↔ TC

| 설계 항목 | TC |
|---|---|
| contract v0.20 `DEFAULT_ASSET_SLOTS`(6개, hair 없음) | TC-177, TC-178, TC-182, TC-FLOW-15 |
| contract v0.20 `hasBuiltinDefault('hair')` false → images-tab §3 `slotCard` clear 단일 규칙 | TC-133, TC-192, TC-193, TC-200, TC-202 |
| contract v0.20 `DEFAULT_MOUSE_SETTINGS`(582,484)·(411,464)·(372,476)·true | TC-014, TC-025, TC-058, TC-089, TC-090, TC-170, TC-033, TC-FLOW-04 |
| (M-2) `EMPTYABLE_SLOT_KEYS` = `['kb_down_0']`·뒷머리 카드 한 줄 양식 | TC-200, TC-201, TC-232, TC-233, TC-FLOW-15 |
| images-tab §5 `onConfirmClear`(`focusAfter ?? trigger` — hair는 trigger)·I-3 정상·오류 | TC-196, TC-206 |
| images-tab §6 4′ `'clear'` 행 확인창·i18n `clearImageAria`·`confirmClear*` 3개 국어 | TC-196, TC-207 |
| images-tab §10.7 `downloadDefaultsDesc` `{n}` = `DEFAULT_ASSET_SLOTS.length` | TC-182, TC-189, TC-FLOW-17 |

v18 추적 — 사용자행 ↔ TC-FLOW: S-14 → TC-FLOW-15 · S-16 → TC-FLOW-17 · S-17 → TC-FLOW-18(개정) · **S-18 → 없음(TC-FLOW-19 폐기 — W-3)** · S-5 → TC-FLOW-04 · S-8 → TC-FLOW-07. 그 밖 행은 앞 표 그대로.

CR ↔ TC: CR-044 → 개정 TC-133 · TC-177 · TC-178 · TC-192 · TC-232(`imageSlots.test.ts`) / TC-182 · TC-183 · TC-184 · TC-185 · TC-187 · TC-189 · TC-191 · TC-233 · TC-FLOW-15 · TC-FLOW-17(`ImagesTab.test.tsx`) / TC-193 · TC-196 · TC-200 · TC-201 · TC-202 · TC-206 · TC-207 · TC-FLOW-18(`Hair.test.tsx`) / TC-014 · TC-025 · TC-026 · TC-027 · TC-058 · TC-074 · TC-089 · TC-090 · TC-FLOW-07(`MousePartsTab.test.tsx`) / TC-170(`PenMode.test.tsx`) / TC-033 · TC-FLOW-04(`SettingsApp.test.tsx`) — 스펙 전부 반영 / **폐기** TC-204 · TC-205 · TC-FLOW-19(스펙 삭제) / 수동 미개정(W-4).

설계 확인 필요 (v18, 관리자 인계 — 문서 수정은 소유자)

- **W-1. 화면 문서 미동기화.** `src/settings/requirements.md`(R-35 · R-36 「7장」 · S-17 · S-18), `design/images-tab.md`(§3 검증 예 CR-038 「hair = restore」·R-35 줄, §3.1 개정 줄, §10.7 `{n}` 7, §11.1 표·§11.2 ~ §11.6 뒷머리 두 줄 양식, §12 대체 범위의 `EMPTYABLE_SLOT_KEYS` `['hair','kb_down_0']`), `design/i18n.md` §4.8(`emptyImageAria` 뒷머리 예)에 CR-044 · M-2 · M-3 기록이 없다. 스펙은 확정사항 §6 · contract v0.20 · 메인 결정을 따랐다 — ui-designer 동기화 필요.
- **W-2. R-35 처리.** 「뒷머리 카드에만 비우기」 요구가 M-2로 「기본값」(비우기 칸)에 흡수됐다. R-35를 폐기할지 문구만 고칠지 requirements 결정 필요. 지금 추적은 R-35 → TC-196 · TC-206(비우기 기능), TC-200 · TC-201(셋째 버튼 없음).
- **W-3. S-18 폐기 표기.** requirements 사용자·이용 시나리오 표의 S-18 행에 폐기(CR-044) 표기가 필요하다 — 사용자행 ↔ TC-FLOW 축에서 제외했다.
- **W-4. `test/manual-checklist.md` 미개정(예산).** M-29(첫 실행 6장·뒷머리 빈 칸·「기본값」 비활성), M-30(다운로드 6장), M-32(뒷머리 「기본값」 = 비우기), M-33(뒷머리 「비우기」 버튼 — 폐기 또는 M-32 흡수), M-43(화면 「비우기」 버튼 1개)을 다음 위임에서 고친다.
- **W-5. G-1 재발(뒷머리).** 「기본값」(비우기) 확정 뒤 그 버튼이 비활성이 되므로 수신 뒤 포커스가 body로 빠질 수 있다. `kb_down_0`처럼 `focusAfter`(「이미지 변경」)를 줄지 결정 필요 — TC-196 · TC-FLOW-18은 수신 **전** 포커스만 단언한다.
- **W-6. core 불일치.** contract §3.1 「core 반영 대기」 — core `DEFAULT_ASSETS`가 아직 `Hair` 포함 7개면 첫 실행에 뒷머리가 시딩되고 `export_default_assets`가 `hair.png`를 쓴다. 화면 자동 TC에는 영향이 없으나(mock) M-29 · M-30 실물 확인 전 core-implementer 반영 필요.
- **W-7. (M-4 기록 — 범위 밖)** `test/DragHit.test.tsx` · `test/mouseWizard.test.ts`(TC-210 ~ TC-212 등)와 `design/drag-hit.md` §5.2 예 표는 CR-038 기본 그림 기하(팔 171×199 @ (389,492) · 펜 손 136×196 @ (356,504))를 명시 픽스처로 쓴다. 깨지지 않지만 「기본 그림」이라는 주석이 낡았다(새 기본: 팔 168×151 @ (411,464) · 펜 손 119×196 @ (372,476)).
- **W-8. 픽스처 이름.** `imageSlots.test.ts` `DEFAULT7`(hair 포함 7장 — 필수·emptyable 판정용으로 유지)·`ImagesTab.test.tsx` `d7()`(실물 6장)은 이름만 옛 개수다. 동작과 무관, 주석으로 표기했다.
- **V-3 닫음**(TC-201 스펙 제목 개정).

### CR-045 개정 (v19 — 뽀모도 타이머: 「타이머」 탭 R-43 ~ R-48 · 배경 그룹 뽀모도 카드 R-42 🔒, 증분 모드)

비유: 설정 창에 벽시계의 리모컨과 거울이 생겼다. 리모컨(카드 1)이 켜고·시작하고·멈추는지, 거울(카드 2 미리보기)이 오버레이와 같은 모습을 비추고 그 위에서 글자를 옮길 수 있는지, 이미지 탭 배경 판 묶음에 판 두 장이 더 끼워졌는지를 본다. 시계 자체(흐름·경과)는 core가 가지므로 화면 테스트는 「받은 사진을 그대로 보이는가」와 「어떤 인자로 부르는가」만 본다.

- **v19 기준(이 절이 앞 모든 기준 줄·CR 절보다 우선)**: `src/settings/requirements.md` **v1.19**(R-42 ~ R-48 · S-23 ~ S-26 · 용어 주 ① ~ ④) · `design/timer-tab.md` §1 ~ §13 · `design/images-tab.md` §14 · `design/i18n.md` §4.9(+ §4.3 `imagesNote` CR-045 행 · §4.6 `asset.canvas_mismatch` CR-045) · contract **v0.21**(TS 소스 미반영 — 스펙은 v0.21 이름으로 쓰고 bridge는 mock) · overlay 설계 U-A 공용 훅 `useTimerSnapshot`·`useElapsedText`·`timerClock.timerTextStyle`(이름·동작 인용: `src/overlay/design/functions.md` §5.6).
- **범위·수(v19)**: 자동 TC 번호 268개(TC-001 ~ TC-268) 중 **유효 260 · 폐기 8** — 신규 31(TC-238 ~ TC-268) · TC-FLOW 번호 27개 중 **유효 26 · 폐기 1** — 신규 4(TC-FLOW-24 ~ TC-FLOW-27) · 수동 41개(M-45a ~ M-45f 신설, `manual-checklist.md` v13).
- **스펙 파일(v19)**: 신규 `test/timerValues.test.ts`(TC-238 ~ TC-240) · `test/PomoCards.test.tsx`(TC-241 ~ TC-245 · TC-FLOW-25) · `test/TimerTab.test.tsx`(TC-248 ~ TC-259 · TC-268 · TC-FLOW-26) · `test/TimerPreview.test.tsx`(TC-260 ~ TC-265) · `test/SettingsApp.timer.test.tsx`(TC-247 · TC-266 · TC-267 · TC-FLOW-24 · TC-FLOW-27). 개정 `test/SettingsApp.test.tsx` · `test/i18n.test.ts`(TC-246 신규 포함) · `test/imageSlots.test.ts` · `test/ImagesTab.test.tsx`.
- **mock·시간 규약(v19)**: bridge는 기존 관례대로 `vi.mock('bridge/commands')`(importOriginal — `toBridgeError` 실물) + `vi.mock('bridge/events')`에 v0.21 래퍼 `getTimer`·`controlTimer`·`onTimerChanged`(`EVENTS.timerChanged`)를 더한다. 기존 `SettingsApp.test.tsx`는 탭 이동만 하므로 세 래퍼를 **일반 함수**(stopped·0 반환, 구독은 빈 해제 함수)로 둔다(`vi.resetAllMocks`에 지워지지 않게). 공용 훅은 `TimerTab`·`TimerPreview` 스펙에서 **mock**(named·default 둘 다 제공), `SettingsApp.timer.test.tsx`에서만 **실물**(bridge만 mock — 구독 순서·표시 문자열을 끝까지 확인). `bridge/types` 상수(`DEFAULT_TIMER_SETTINGS`·`TIMER_*`·`hasBuiltinDefault`·`isRequiredSlot`)는 실물, 기대값은 리터럴로 적어 독립 대조. **시간 의존 = 슬라이더 키보드 300ms(TC-256)뿐** — `vi.useFakeTimers({ toFake: ['setTimeout','clearTimeout'] })` + `advanceTimersByTime`. 표시 시간 단언은 `paused`·`stopped`·`restPaused` 사진과 `running` 수신 직후(1초 미만)만 써서 실제 시간에 기대지 않는다. 포인터는 「포인터·좌표 규약」 절(PointerEvent·캡처 stub, rect 0)을 그대로 쓰고, 미리보기 좌표 예는 캔버스 800×700 · 상자 400×350 → scale 0.5(글자 중심 (268,403) = 오프셋 (134,201.5)).
- **선행(v19)**: ① bridge v0.21 소스(`controlTimer`·`getTimer`·`onTimerChanged`·`TimerSettings`·`Settings.timer`·`AssetSlot` pomo 2·`timer.disabled`) ② overlay U-A 공용 훅·`timerClock`(다른 에이전트) ③ 화면 소스(`TimerTab`·`TimerPreview`·`useSliderDraft`·`timerValues`·`index.tsx` 탭 4개·`TabIcon` 'timer'·`imageSlots.buildSlotGroups` ①·i18n §4.9). 셋 전에는 신규 스펙 5개가 import 단계에서, 개정 스펙은 4항목·카드 20장·사전 키 수 단언에서 **예정 Red**다. `Settings` 리터럴 픽스처에 `timer`가 없는 기존 스펙 7개는 `yarn tsc --noEmit`만 거부한다(vitest 무관 — X-8).

#### v19 신규 TC

### TC-238 · TIMER_PREVIEW_BOX·clampTextPos · 종류: 자동 · 요구: R-46 · 설계: timer-tab §3 `TIMER_PREVIEW_BOX`·`clampTextPos`·검증 예, §1.2 상자 400×350 · 스펙: `test/timerValues.test.ts` · **신규(CR-045)**
- Given 캔버스 900×700(한 사례 800×600), 입력 객체 `{1000.2, 12.7}`
- When `clampTextPos`에 검증 예 2건·경계(900,0)·(901,−1)·비유한수(NaN·±Infinity)·입력 객체
- Then ⓐ 해당 없음(순수) ⓑ `{−3.4,710.6}` → `{0,700}` · `{268.5,403.2}` → `{269,403}` · `{901,−1}` → `{900,0}` · `(1200,50)`@800×600 → `(800,50)` · 비유한수 좌표 → 0 · 입력 불변·새 객체 `{900,13}`, `TIMER_PREVIEW_BOX` = `{400,350}` ⓒ 해당 없음(bridge 무관)

### TC-239 · clampRotation·clampFontSize · 종류: 자동 · 요구: R-46 · 설계: timer-tab §3 두 행·검증 예, contract v0.21 `TIMER_ROTATION_MIN/MAX`·`TIMER_FONT_SIZE_MIN/MAX`·`DEFAULT_TIMER_SETTINGS` · 스펙: `test/timerValues.test.ts` · **신규(CR-045)**
- Given 없음 / When 범위 안·밖·반올림·비유한수 값
- Then ⓐ 해당 없음 ⓑ 회전 181 → 180 · −180.4 → −180 · −181 → −180 · 12.5 → 13 · NaN·Infinity → 5 / 크기 11 → 12 · 201 → 200 · 47.6 → 48 · NaN·−Infinity → 36 ⓒ 해당 없음

### TC-240 · normalizeColor · 종류: 자동 · 요구: R-47 · 설계: timer-tab §3 `normalizeColor`·검증 예 · 스펙: `test/timerValues.test.ts` · **신규(CR-045)**
- Given 없음 / When `#ABCDEF`·`#33AAFF`·`#AbC012`·`#333333`과 형식 밖 7종(`red`·`#abc`·`#abcdeg`·`abcdef`·`#abcdef0`·앞 공백·빈 문자열)
- Then ⓐ 해당 없음 ⓑ 앞 4개 → 소문자 `#rrggbb`, 형식 밖 → `null` ⓒ 해당 없음

### TC-241 · buildSlotGroups 배경 그룹 4장·뽀모도 카드 스펙 · 종류: 자동 · 요구: R-42 · 설계: timer-tab §13 `buildSlotGroups` ①·판정·검증 예, images-tab §14, contract v0.21 `AssetSlot` pomo·`hasBuiltinDefault` · 스펙: `test/PomoCards.test.tsx` · **신규(CR-045)**
- Given `EMPTY` · `CHAR`(kb_up·mouse_base·pomo_char)
- When `buildSlotGroups`·`slotCard(EMPTY, slot, slot, null)`
- Then ⓐ 해당 없음(순수) ⓑ 배경 그룹 키 `[background, hair, pomo_char, pomo_bubble]`, 두 칸 = `{type:'slot', slot, key, msg:slot, n:null, entry:undefined, required:false, resetKind:'clear', canReset:false, lastOnlyBlocked:false, emptyable:false, canEmpty:false}`(toStrictEqual), `slotCard` 결과와 같음, 뒤 그룹 16장 불변, 슬롯 카드 20장·필수 `[kb_up, mouse_base]`, `EMPTYABLE_SLOT_KEYS` = `['kb_down_0']`, `CHAR`에서 pomo_char `canReset` true·pomo_bubble false, `hasBuiltinDefault`·`isRequiredSlot` 두 칸 모두 false ⓒ 해당 없음

### TC-242 · 뽀모도 카드 렌더(빈·등록)·안내 문구 · 종류: 자동 · 요구: R-42, R-20, R-25 · 설계: timer-tab §13 카드 순서·판정(필수 배지 없음·「기본값」 = 비우기·셋째 버튼 없음), images-tab §14 §1 ASCII·`imagesNote`, i18n §4.9 `slots.pomo_*`·§4.3 `imagesNote`(CR-045) · 스펙: `test/PomoCards.test.tsx` · **신규(CR-045)**
- Given `EMPTY` → 재렌더 `BOTH`(두 칸 등록)
- When 렌더 → props 교체
- Then ⓐ 안내 `PNG(32비트 RGBA)만 쓸 수 있습니다. 최대 900×700·1MB. 배경·뒷머리·뽀모도·키보드 그림은 모두 같은 크기로 만드세요.`, 카드 id 앞 5개 `[background, hair, pomo_char, pomo_bubble, kb_up]`·카드 20장, 두 카드 h3 `뽀모도 인물`·`뽀모도 말풍선`·설명(i18n §4.9 ko)·`선택` 배지·`필수` 없음·`등록된 그림 없음`·img 없음·버튼 `[이미지 변경, 기본값]`·「기본값」(aria `… 그림 지우기`) 비활성·`title` 없음·복원/비우기 이름 버튼 없음 → 등록 뒤 img `asset://pomo_*.png`·「기본값」·「이미지 변경」 활성 ⓑ 카드 오류(`alert`) 없음 ⓒ `pickPngFile`·`importAsset`·`removeAsset`·`restoreDefaultAsset`·`setSettings`·`onError` 0회

### TC-243 · 뽀모도 카드 이미지 변경 성공·캔버스 불일치 오류 · 종류: 자동 · 요구: R-42, R-20 · 설계: timer-tab §13 흐름(I-2 `pickPngFile(t.pickTitle)` → `importAsset('pomo_char' \| 'pomo_bubble', path)`, 크기 다름 → `asset.canvas_mismatch` → 카드 오류 띠), i18n §4.6 CR-045 · 스펙: `test/PomoCards.test.tsx` · **신규(CR-045)**
- Given `NO_POMO`, `pickPngFile` → `PATH`, `importAsset` 1회차 resolve `CHAR` · 2회차 reject `MISMATCH`(ko message) / en 재렌더 뒤 reject
- When 「뽀모도 인물 이미지 변경」 → 「뽀모도 말풍선 이미지 변경」 → (en) 말풍선 이미지 변경
- Then ⓐ 말풍선 카드만 `alert` = `MISMATCH.message`(ko) / `en.errors['asset.canvas_mismatch']`(en, `pomodoro` 포함), 말풍선 img 없음, 버튼 다시 활성 ⓑ 오류는 카드 오류(`cardError`) — `onError` 0회 ⓒ `pickPngFile('PNG 이미지 선택')` · (en) `pickPngFile(en.pickTitle)`, `importAsset` 인자 `['pomo_char', PATH]` → `['pomo_bubble', PATH]`, `restoreDefaultAsset`·`setSettings` 0회

### TC-244 · 뽀모도 「기본값」 → 비우기 확인창 → removeAsset · 종류: 자동 · 요구: R-42 · 설계: timer-tab §13 흐름(I-3 비우기 확인창 `{name}` = `slots.pomo_*.title`, 포커스 「취소」, danger, `removeAsset(slot)` 1회·`restoreDefaultAsset` 0회), images-tab §14 §7 · 스펙: `test/PomoCards.test.tsx` · **신규(CR-045)**
- Given `BOTH`, `removeAsset` deferred → `CHAR`
- When 말풍선 「기본값」 → 「취소」 / 다시 → Esc / 다시 → 「지우기」 → 응답 → props `CHAR`
- Then ⓐ `alertdialog`(`aria-modal`, 이름 `그림 지우기`, 설명 `‘뽀모도 말풍선’ 그림을 지울까요? 되돌릴 수 없습니다.`, 버튼 `[지우기, 취소]`, 포커스 「취소」), 취소·Esc 뒤 닫힘·포커스 「기본값」, 수신 뒤 말풍선 img 없음·`등록된 그림 없음`·「기본값」 비활성, 인물 img 그대로 ⓑ `alert` 없음·`onError` 0회 ⓒ 취소·Esc 동안 0회 → 확정 뒤 `removeAsset('pomo_bubble')` 정확히 1회, `restoreDefaultAsset`·`importAsset`·`setSettings` 0회

### TC-245 · 뽀모도 카드 ja·en 문구 · 종류: 자동 · 요구: R-42, R-20 · 설계: i18n §4.9 `slots.pomo_*` ja·en·§4.3 `imagesNote` CR-045 ja·en, images-tab §6(문구 `useMessages`) · 스펙: `test/PomoCards.test.tsx` · **신규(CR-045)**
- Given `BUBBLE_ONLY`, 언어 ja / en
- When 렌더 → 말풍선 「기본값」 → 「취소」(`confirmCancel`)
- Then ⓐ `format(imagesNote,{w:900,h:700})` 표시·`ポモドーロ`/`pomodoro` 포함, 두 카드 h3·설명 = 사전 `slots.pomo_*`, 「기본값」 이름 `format(clearImageAria,{name})`, 확인창 설명 `format(confirmClearMessage,{name})` ⓑ 확인창 닫힘 ⓒ `removeAsset`·`importAsset` 0회

### TC-246 · CR-045 사전 17키·slots 2·timer.disabled·코드 22(CR-049 개정 — 옛 23) · 종류: 자동 · 요구: R-20, R-42 ~ R-47 · 설계: i18n §4.9 표(ko 열)·주(ERROR_CODES 잠정 위치·단위 리터럴), §4.3·§4.6 CR-045 행 · 스펙: `test/i18n.test.ts` · **신규(CR-045)** · **개정(CR-054 — 기대 개수·목록은 「CR-054 개정 TC」 표가 대체)**
- Given ko·ja·en 사전, `ERROR_CODES`
- When 키·값 비교
- Then ⓐ 해당 없음(사전) ⓑ ko 17키 = i18n §4.9 ko 열 정확(`tabTimer` 타이머 ~ `timerColor` 글자 색), `errors['timer.disabled']` = `타이머가 꺼져 있습니다. 먼저 「타이머 사용」을 켜 주세요.`, `imagesNote`·`asset.canvas_mismatch` ko = CR-045 문구, `ERROR_CODES` 22개(CR-049 — `autostart.cancelled` 폐기, 옛 23)·`timer.disabled` 포함·`autostart.cancelled` 없음, ja·en 17키 모두 비어 있지 않음·ko와 다름, slots 20키, `pomo_*` 제목에 `ポモドーロ`/`omodoro`, `timer.disabled` 비어 있지 않음, `imagesNote`·`canvas_mismatch`에 `ポモドーロ`/`pomodoro`·`{w}`·`{h}`, `ja.tabTimer` = `タイマー`·`en.tabTimer` = `Timer`, 단위용 키(`timer*unit/deg/px`) 없음 ⓒ 해당 없음

### TC-247 · 타이머 탭 열기 — 메뉴 4번째·아이콘·h1·구독 먼저 → getTimer → 00:00:00 · 종류: 자동 · 요구: R-44, R-27, R-48, R-43, R-20 · 설계: timer-tab §1.1 메뉴 4항목, §2 `SettingsApp`·`Shell` 개정(`TAB_IDS`·`TAB_KEY.timer`·패널 분기)·`TabIcon` 'timer', §7 T-1, §8 `get_timer`·`timer://changed`, contract v0.21 §5.8-3 · 스펙: `test/SettingsApp.timer.test.tsx`(ko·ja 두 `it`) · **신규(CR-045)**
- Given `SETTINGS`(timer 끔), `onTimerChanged` 구독 기록(`'sub'`), `getTimer` → `{stopped, 0}`(기록 `'get'`) · 공용 훅 실물 / ja 사례는 `language:'ja'`
- When 마운트 → 「타이머」 클릭 → 「기본 설정」 → End 키
- Then ⓐ 메뉴 `[기본 설정, 이미지 설정, 어깨축·손 위치, 타이머]`, 4번째 id `settings-tab-timer`·`aria-controls` `settings-panel-timer`·svg `aria-hidden`·`focusable=false`·이름 `타이머`, 열면 h1 `[타이머]`·패널 id·`aria-labelledby`·`aria-selected` true·카드 h2 `[뽀모도 타이머, 시간 글자]`·글자 `00:00:00`, End 뒤 h1 타이머·4번째 포커스 / ja: 4번째 = `ja.tabTimer`·h1·카드 제목 ja ⓑ 열기 전 조회·구독 0회, 순서 `['sub','get']`, 다른 탭으로 가면 해제 1회, End로 다시 열면 `getTimer` 2회 ⓒ `getTimer()` 인자 없음, `setSettings`·`controlTimer` 0회

### TC-248 · TimerTab 레이아웃·초기 표시·포커스 순서 · 종류: 자동 · 요구: R-43 ~ R-47 · 설계: timer-tab §1.2, §2 `TimerTab`·`ToggleSwitch`·`SettingsCard`, §4 `timer`(파생)·`previewTimer`, §6 렌더 1 ~ 3, §9 포커스 순서·`aria-valuetext`·`<output>`, i18n §4.9 ko · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- Given `SETTINGS.timer` = (268,403)·5°·36·`#333333`·끔, `POMO`(800×700), 공용 훅 mock(stopped)
- When 렌더
- Then ⓐ h2 `[뽀모도 타이머, 시간 글자]`·카드 설명 2개(i18n ko), 스위치 `aria-checked` false·설명 `끄면 시간이 멈춘 채로 보입니다`, 묶음 `타이머 조작` 버튼 `[시작, 일시정지, 멈춤]`·`type=button`·모두 disabled, 안내 `멈춤을 누르면 00:00:00으로 돌아갑니다`, 미리보기 group, 회전 slider min −180·max 180·step 1·값 5·valuetext `5°`·output `5°`, 크기 12 ~ 200·값 36·`36px`, 색 `type=color`·`#333333`·output ⓑ 미리보기 `rotate(5deg)`·`36px`, 활성 조작 DOM 순서 `[스위치, 회전, 크기, 글자 색]`(끔 — 버튼 건너뜀, 글자 포커스 대상 아님) ⓒ `setSettings`·`controlTimer`·`getTimer`·`onError` 0회

### TC-249 · settings.timer 없음 → DEFAULT_TIMER_SETTINGS · 종류: 자동 · 요구: R-44, R-46, R-47 · 설계: timer-tab §4 `timer` 초기값(`settings.timer ?? DEFAULT_TIMER_SETTINGS`), §5.1 `saveTimer`, contract v0.21 호환 · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- Given `timer` 키가 없는 옛 `Settings`
- When 렌더 → 스위치 클릭
- Then ⓐ 스위치 false·회전 5·크기 36·색 `#333333`·글자 (268px, 403px) ⓑ `onError` `[[null]]` ⓒ `setSettings` 1회 `{...OLD, timer: {enabled:true, textPos:(268,403), rotation:5, fontSize:36, color:'#333333'}}`

### TC-250 · 켜기 — busy·버튼 잠금·저장 인자·저장값만 표시 · 종류: 자동 · 요구: R-44 · 설계: timer-tab §4 `enabledPending`, §5.1 `onToggleEnabled`·`saveTimer`·버튼 비활성 식, §7 T-2, §8 `set_settings`, U-2(다시 켜도 자동 재개 없음) · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- Given `SETTINGS`(끔), `setSettings` deferred
- When 스위치 클릭 → (대기 중 다시 클릭) → resolve → props `S_ON`
- Then ⓐ 대기 중 스위치 `aria-busy` true·disabled·`aria-checked` false(낙관 갱신 없음)·버튼 3 disabled, 응답 뒤 busy 없음·여전히 false → props 뒤 true·버튼 3 활성 ⓑ `onError` `[[null]]` ⓒ `setSettings` 정확히 1회 `{...SETTINGS, timer:{...T, enabled:true}}`(다른 필드 불변), `controlTimer` 0회

### TC-251 · 끄기 인자·저장 실패 · 종류: 자동 · 요구: R-44 · 설계: timer-tab §5.1 `onToggleEnabled`(실패 → 저장값 그대로)·`saveTimer` 예외(던지지 않음), §7 T-2 오류 · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- Given `S_ON`, `setSettings` deferred → reject `SAVE_ERR`
- When 스위치 클릭 → reject
- Then ⓐ 대기 중 버튼 3 disabled, 실패 뒤 스위치 true·busy 없음·버튼 3 활성 ⓑ `onError` 1회 `{code:'settings.invalid', message}` ⓒ `setSettings` 1회 `{...S_ON, timer:{...T_ON, enabled:false}}`, 재시도·`controlTimer` 없음

### TC-252 · 버튼 활성 규칙(끔 비활성·켬이면 상태 무관 활성) · 종류: 자동 · 요구: R-45, R-44 · 설계: timer-tab §5.1 버튼 비활성 식(U-8), §7 T-3 오류(끔 → 호출 없음) · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- Given `SETTINGS`(끔) → `S_ON`, 공용 훅 사진 `stopped`·`running`·`paused`·`restPaused` 차례
- When 끔에서 세 버튼 클릭 → 켬·사진별 재렌더
- Then ⓐ 끔 = 셋 disabled / 켬 = 네 상태 모두 `[false,false,false]` ⓑ 비활성 식은 `timer.enabled`·대기 두 개만 본다 ⓒ `controlTimer`·`setSettings` 0회

### TC-253 · 시작·일시정지·멈춤 인자·대기 중 잠금·확인창 없음 · 종류: 자동 · 요구: R-45 · 설계: timer-tab §4 `controlPending`, §5.1 `onControl`(확인창 없음 U-7), §7 T-3·confirm 문단, §8 `control_timer`(반환값 미사용) · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- Given `S_ON`, `controlTimer` 1회차 deferred, `window.confirm` spy
- When 「시작」 → (대기 중 「일시정지」) → resolve → 「일시정지」 → 「멈춤」
- Then ⓐ 대기 중 버튼 3 disabled·스위치 활성, 응답 뒤 활성, `dialog`·`alertdialog` 없음 ⓑ `onError` `[[null],[null],[null]]` ⓒ `controlTimer` 인자 `[['start'],['pause'],['stop']]`(대기 중 누름 무시), `setSettings`·`window.confirm` 0회

### TC-254 · controlTimer 실패 → onError · 종류: 자동 · 요구: R-45 · 설계: timer-tab §5.1 `onControl` 예외(`toBridgeError`), contract v0.21 §6 `timer.disabled` · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- Given `S_ON`, `controlTimer` reject `DISABLED` → reject `new Error('boom')`
- When 「시작」 → 「멈춤」
- Then ⓐ 버튼 3 다시 활성·스위치 true 그대로 ⓑ `onError` `[[{code:'timer.disabled', message}], [{code:'unknown', message:'boom'}]]` ⓒ `controlTimer` `[['start'],['stop']]`, `setSettings` 0회

### TC-255 · 슬라이더 끄는 동안 미리보기만·놓을 때 1회·같은 값 0회 · 종류: 자동 · 요구: R-46 · 설계: timer-tab §4 `rotation`·`size`·`previewTimer`, §5.1 `commitRotation`·`commitSize`, §5.2 `useSliderDraft`(`shown`·`onChange`·`onPointerUp`·`flush`), §7 T-5 · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- Given `SETTINGS`, `setSettings` 인자 그대로 resolve
- When 회전: 초안 없이 pointerup · 5로 change → pointerup · 20 → 30 change → pointerup → props 30 / 크기: 120 change → pointerup
- Then ⓐ 초안 동안 slider 값 30·valuetext `30°`·output `30°`·미리보기 `rotate(30deg)` / 크기 `120px`(output·valuetext·미리보기 fontSize) ⓑ `onError` null, 저장 뒤 초안 비움 ⓒ 같은 값 0회, 회전 1회 `{...SETTINGS, timer:{...T, rotation:30}}`, 크기 1회 `{..., rotation:30, fontSize:120}`

### TC-256 · 키보드 300ms 뒤 1회·비이동 키 무시·blur 즉시·언마운트 해제(가짜 시계) · 종류: 자동 · 요구: R-46 · 설계: timer-tab §5.2 `onKeyUp`(이동 키 8개·`SCALE_KEY_COMMIT_MS` 300)·`onBlur`·언마운트 정리 · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- Given 가짜 시계(setTimeout·clearTimeout만), `SETTINGS`
- When 크기 40 change → keyUp ArrowRight → 299ms → 1ms / 44 change → keyUp `a` → 1000ms → blur / 회전 −90 change → keyUp Home → 언마운트 → 300ms
- Then ⓐ 해당 없음(저장 인자·횟수로 판정) ⓑ `onError` `[[null],[null]]` ⓒ 299ms 0회 → 300ms 1회 `{…fontSize:40}`, `a`는 예약 없음, blur 즉시 `{…fontSize:44}`, 언마운트 뒤 추가 0회(합 2회)

### TC-257 · 슬라이더 저장 실패 → 초안 버림 · 종류: 자동 · 요구: R-46 · 설계: timer-tab §5.2 `flush`(성공·실패 모두 초안 비움), §5.1 `saveTimer` 예외, §7 T-5 오류 · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- Given `setSettings` 1회 reject `SAVE_ERR`
- When 회전 90 change → pointerup
- Then ⓐ slider 5·output `5°`·미리보기 `rotate(5deg)` ⓑ `onError` `[[SAVE_ERR 모양]]` ⓒ `setSettings` 1회 `{…rotation:90}`

### TC-258 · 색 input은 미리보기만·change 때 소문자 1회 저장 · 종류: 자동 · 요구: R-47 · 설계: timer-tab §4 `colorDraft`·`previewTimer`, §5.1 `onColorInput`·`commitColor`·색 change 구독(네이티브 `change`), §7 T-6 · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- Given `SETTINGS`(`#333333`)
- When `input` `#33AAFF` → `change` `#33AAFF` → props `#33aaff`
- (v19 후속 X-2) Given에 `setSettings` deferred 추가 — change 뒤 **저장 응답 전에도** output·미리보기 `#33aaff` 유지(옛 색으로 돌아가지 않음) → resolve
- Then ⓐ input 동안 output(대소문자 무관) `#33aaff`·미리보기 색 `#33aaff`, 저장 대기 중에도 같음, props 뒤 견본 값·output·미리보기 `#33aaff` ⓑ `onError` `[[null]]` ⓒ input 동안 0회, change 뒤 정확히 1회 `{...SETTINGS, timer:{...T, color:'#33aaff'}}`

### TC-259 · 같은 색 0회·색 저장 실패 · 종류: 자동 · 요구: R-47 · 설계: timer-tab §5.1 `commitColor`(`n === timer.color`면 끝, 실패 → 저장값 색), §7 T-6 오류 · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- Given `SETTINGS`, 두 번째 저장만 reject `SAVE_ERR`
- When `#333333` input·change → `#00ff00` input·change
- Then ⓐ 실패 뒤 output·견본·미리보기 `#333333` ⓑ `onError` `[[SAVE_ERR 모양]]` ⓒ 저장 인자 색 목록 `['#00ff00']`(같은 색은 0회)

### TC-260 · 미리보기 합성 5겹 순서·없는 슬롯 생략·상자 크기 · 종류: 자동 · 요구: R-46, R-43, R-42 · 설계: timer-tab §6 `TimerPreview` 렌더(순서 = 배경 → pomo_char → pomo_bubble → 글자 → kb_up, hair·팔·손 없음), §4 `canvas`·`scale`, §1.3 `.stage`·`.canvas` 인라인, §2 `findEntry`·`fitScale` · 스펙: `test/TimerPreview.test.tsx` · **신규(CR-045)**
- Given `ALL`(800×700 — body·hair·kb_down_0·mouse_base 포함) → `BUBBLE_KB` → `NOTHING`
- When 렌더·재렌더
- Then ⓐ 캔버스 자식 `[background, pomo_char, pomo_bubble, timer-text, kb_up]` → `[pomo_bubble, timer-text, kb_up]` → `[timer-text]`, img 모두 `alt=""`·`draggable=false`, `previewNoBody` 없음 ⓑ 상자 400×350px·캔버스 800×700px·`scale(0.5)` ⓒ `onCommitPos` 0회

### TC-261 · 글자 = 공용 훅 시간 + timerTextStyle + 끌기 스타일, U-1 무관 표시 · 종류: 자동 · 요구: R-43, R-46, R-47 · 설계: timer-tab §6 글자 div(`timerTextStyle({...timer, textPos: shownPos})`·`pointerEvents:'auto'`·`cursor`), 미리보기 글자 늘 보임 문단, 머리 공용 훅 인용, overlay `timerTextStyle` 식 · 스펙: `test/TimerPreview.test.tsx` · **신규(CR-045)**
- Given 공용 훅 mock `{paused, 754000}`·receivedAt 1234 → 텍스트 `00:12:34`, `NOTHING`·타이머 끔 / 둘째 렌더 (500,120)·−30°·80·`#ff0000`
- When 렌더
- Then ⓐ 글자 `00:12:34`·보임·left 268px·top 403px·`translate(-50%, -50%) rotate(5deg)`·36px·색 `#333333`·pointer-events auto·cursor grab / 둘째 500px·120px·`rotate(-30deg)`·80px·`#ff0000` ⓑ `useElapsedText` 마지막 인자 `[snapshot, 1234]` ⓒ `onCommitPos` 0회

### TC-262 · 글자 끌기 정상 → onCommitPos 1회·저장 끝까지 자리 유지 · 종류: 자동 · 요구: R-46 · 설계: timer-tab §5.3 `toCanvasPoint`·`onTextPointerDown`(캡처·grab)·`onTextPointerMove`(`clampTextPos`)·`onTextPointerUp`(`pendingPos`), §4 `drag`·`pendingPos`·`shownPos`, §7 T-4 · 스펙: `test/TimerPreview.test.tsx` · **신규(CR-045)**
- Given `ALL`, `onCommitPos` deferred
- When 누름 (134,202) → 이동 (184,232) → 놓기 → resolve → props textPos (368,463)
- Then ⓐ 누름 뒤 cursor grabbing, 이동 뒤 (368px, 463px), 놓은 뒤 저장 대기 중 (368, 463) 유지·cursor grab, resolve 뒤 (268, 403)(props), props 교체 뒤 (368, 463) ⓑ grab (0,1)·`pendingPos` → null ⓒ `setPointerCapture(7)` 1회, `onCommitPos` 정확히 1회 `{x:368, y:463}`

### TC-263 · 저장 0회 — 제자리·cancel·오른쪽 버튼·저장 중 누름 · 종류: 자동 · 요구: R-46 · 설계: timer-tab §5.3 `onTextPointerUp`(같으면 끝)·`onTextPointerCancel`·`onTextPointerDown`(`button !== 0 \|\| pendingPos !== null` 무시), §7 T-4 오류 · 스펙: `test/TimerPreview.test.tsx` · **신규(CR-045)**
- Given `ALL`, ④만 `onCommitPos` deferred
- When ① 누름·같은 자리 놓기 ② 누름·이동·pointercancel·놓기 ③ 오른쪽 버튼 누름·이동·놓기 ④ 끌어 놓기(대기) → 다시 누름·이동·놓기
- Then ⓐ ① (268,403) ② cancel 뒤 (268,403) ③ 그대로 ④ 대기 중 (368,463) 그대로 ⓑ drag null 유지(③·④) ⓒ ①~③ `onCommitPos` 0회·③ 캡처 없음, ④ 1회뿐·두 번째 누름 캡처 없음

### TC-264 · 캔버스 가장자리 고정·캔버스 없음 · 종류: 자동 · 요구: R-46 · 설계: timer-tab §3 `clampTextPos`, §5.3 `onTextPointerMove`, §6 캔버스 없음 문단(`previewNoBody`·기본 900×700·끌기 제한), §4 `canvas` 초기값 · 스펙: `test/TimerPreview.test.tsx` · **신규(CR-045)**
- Given `ALL`(800×700, grab (0,0)) / `NO_CANVAS`
- When (1000,1000)·(−50,−50)으로 끌고 놓기 / 캔버스 없음에서 (119.11,179.11) 누름 → (2000,2000) → 놓기
- Then ⓐ (800px,700px) → (0px,0px) / `캐릭터 이미지(kb_up)가 등록되지 않았습니다.` 표시·글자 `00:12:34`·상자 ≈400×311.11px·캔버스 900×700px·끌면 (900px,700px) ⓑ scale 4/9 ⓒ `onCommitPos` `{0,0}` 1회 / `{900,700}` 1회

### TC-265 · 미리보기 접근성·ja·en 이름 · 종류: 자동 · 요구: R-46, R-20 · 설계: timer-tab §9(상자 group·글자 img·`alt=""`·aria-live 없음·끌기 포인터 전용), §12 키보드 이동 넣지 않음, i18n §4.9 `timerPreviewAria`·`timerTextDragAria` · 스펙: `test/TimerPreview.test.tsx` · **신규(CR-045)**
- Given `ALL`, ko → ja → en
- When 렌더
- Then ⓐ group `시간 글자 위치 미리보기`, img 역할 = 글자 div뿐(이름 `시간 글자 — 끌어서 옮기기`), 글자 tabindex 없음, `aria-live` 없음 / ja·en 이름 = 사전 값 ⓑ 해당 없음(표시 전용) ⓒ `onCommitPos` 0회

### TC-266 · 수신 → 글자·스위치·슬라이더·합성 갱신(T-7) · 종류: 자동 · 요구: R-43, R-44, R-46, R-42 · 설계: timer-tab §7 T-7, §4 끝 문단(표시는 `timer://changed`·첫 `get_timer`로만), §8 이벤트 3행, overlay `formatElapsed` · 스펙: `test/SettingsApp.timer.test.tsx` · **신규(CR-045)**
- Given 마운트 → 타이머 탭(stopped·0), 공용 훅 실물
- When `timer://changed` paused 754 000 → restPaused 3 723 000 → stopped 0 / `settings://changed` 켬·30°·60·`#112233` / `assets://changed` `WITH_POMO`
- Then ⓐ 글자 `00:12:34` → `01:02:03` → `00:00:00`, 스위치 true·버튼 3 활성·output `[30°, 60px, #112233]`, 미리보기 img `[pomo_char, pomo_bubble, kb_up]` ⓑ 화면이 경과를 판정·저장하지 않음 ⓒ `getTimer` 1회 그대로, `setSettings`·`controlTimer` 0회

### TC-267 · 조작 실패 오류 줄 3개 국어·성공 시 지움 · 종류: 자동 · 요구: R-45, R-20 · 설계: timer-tab §5.1 `onControl` 예외(ko = core 메시지, ja·en = `errors['timer.disabled']`), §7 T-3 오류, design §5.3 오류 줄·`errorText`, i18n §4.9 · 스펙: `test/SettingsApp.timer.test.tsx` · **신규(CR-045)**
- Given `S_ON`, `controlTimer` 1회차 reject `DISABLED`
- When 「시작」 → 언어 ja → en → ko 수신 → 「시작」(성공)
- Then ⓐ 오류 줄 `오류: 타이머가 꺼져 있습니다. 먼저 「타이머 사용」을 켜 주세요.` → `${ja.errorPrefix} ${ja.errors['timer.disabled']}` → en 같은 형식 → 성공 뒤 `alert` 없음 ⓑ `error` 상태 → null ⓒ `controlTimer` `[['start'],['start']]`, `setSettings` 0회

### TC-268 · TimerTab 3개 국어 문구 · 종류: 자동 · 요구: R-20, R-44 ~ R-47 · 설계: timer-tab §10, §6 렌더(`useMessages`), i18n §4.9 ja·en 열 · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- Given `SETTINGS`, 언어 ja / en
- When 렌더
- Then ⓐ h2 `[timerCardTitle, timerTextTitle]`·두 설명·스위치 이름 `timerEnabled`·설명 `timerEnabledDesc`·묶음 `timerControlsAria` 버튼 `[timerStart, timerPause, timerStop]`·`timerStopHint`·미리보기 이름 2개·슬라이더 `timerRotation`(`5°`)·`timerSize`(`36px`)·`timerColor`, ko 문구 없음 ⓑ 단위 `°`·`px`는 언어 무관 ⓒ `setSettings`·`controlTimer` 0회

#### v19 신규 TC-FLOW (번호는 TC-FLOW 절 체계 — 변경 델타를 한 곳에 두려고 이 절에 정의)

### TC-FLOW-24 · S-23: 작업 시간을 재려고 「타이머」 탭에서 켜고 시작 → 일시정지 → 멈춤(00:00:00) → 끄면 시간이 멈춘 채로 보인다 · 종류: 자동 · 요구: R-44, R-45, R-43 · Steps: TC-247(열기·00:00:00 부분) → TC-250(켜기·저장 인자 부분) → TC-253(시작·일시정지·멈춤 인자 부분) + TC-266(수신 → 글자 부분) → TC-251·TC-252(끄기 인자·버튼 잠김 부분) → M-45b · 스펙: `test/SettingsApp.timer.test.tsx` · **신규(CR-045)**
- 상태 전달: Step 2 저장 인자 `S_ON`을 `settings://changed`로 되돌려 Step 3 Given(버튼 활성), 각 조작 뒤 `timer://changed` 사진이 다음 표시의 Given, Step 4 저장 인자 `SETTINGS`를 수신해 버튼 잠김
- Then ⓐ `00:00:00` → 켜짐 → running 직후 `00:00:00` → paused `00:00:05` → stopped `00:00:00` → 끈 뒤 `00:00:08` 유지·버튼 3 disabled ⓑ 오류 줄 없음 ⓒ `setSettings` `[S_ON, SETTINGS]`, `controlTimer` `[['start'],['pause'],['stop'],['start']]`

### TC-FLOW-25 · S-24: 두 번째 캐릭터와 말풍선 PNG 두 장을 넣고, 필요 없어진 인물은 비운다 · 종류: 자동 · 요구: R-42 · Steps: TC-243(성공 부분 — 인물) → TC-243(성공 부분 — 말풍선) → TC-242(등록 뒤 부분) → TC-244(확정 부분 — 대상 pomo_char) → M-45f · 스펙: `test/PomoCards.test.tsx` · **신규(CR-045)**
- 상태 전달: 각 응답 매니페스트(`CHAR` → `BOTH` → `BUBBLE_ONLY`)를 props로 되돌려 다음 Step Given
- Then ⓐ 인물·말풍선 img 표시 → 인물 확인창 설명 `‘뽀모도 인물’ 그림을 지울까요? 되돌릴 수 없습니다.` → 인물 빈 칸·말풍선 그대로 ⓑ 카드 오류 없음 ⓒ `importAsset` `[['pomo_char',PATH],['pomo_bubble',PATH]]`, `removeAsset` `[['pomo_char']]`, `restoreDefaultAsset`·`setSettings` 0회

### TC-FLOW-26 · S-25: 말풍선 모양에 맞게 글자를 끌어 놓고 기울기·크기·색을 맞춘다 · 종류: 자동 · 요구: R-46, R-47, R-43 · Steps: TC-262(끌기 부분) → TC-255(회전 부분) → TC-255(크기 부분) → TC-258(색 부분) → M-45e · 스펙: `test/TimerTab.test.tsx` · **신규(CR-045)**
- 상태 전달: 매 저장 인자(S1 → S4)를 props로 되돌려 다음 Step Given(누적)
- Then ⓐ 최종 글자 (368px,463px)·`rotate(-12deg)`·48px·`#aa0000`, output `[-12°, 48px, #aa0000]` ⓑ `onError` null 4회 ⓒ `setSettings` 4회 = S1(textPos (368,463)) → S2(rotation −12) → S3(fontSize 48) → S4(color `#aa0000`), `controlTimer` 0회

### TC-FLOW-27 · S-26: 다음 날 다시 켠 앱 — 00:00:00에서 멈춰 있고 저장한 설정은 그대로, 시작을 눌러야 흐른다 · 종류: 자동+수동 · 요구: R-48 · Steps: TC-247(00:00:00 부분) → TC-248(저장값 표시 부분) → TC-253(시작 인자 부분) → M-45c(실제 재시작) · 스펙: `test/SettingsApp.timer.test.tsx` · **신규(CR-045)**
- Given `getSettings` → timer 켬·(500,300)·−10°·48·`#ff0000`, `getTimer` → stopped·0
- Then ⓐ `00:00:00`·스위치 true·버튼 3 활성·output `[-10°, 48px, #ff0000]`·글자 (500px,300px)·`rotate(-10deg)` ⓑ 자동 시작 없음 ⓒ 누르기 전 `controlTimer` 0회 → 「시작」 뒤 `controlTimer('start')` 1회, `setSettings` 0회

#### v19 개정 TC (앞 본문을 대체 — 번호 유지, Given/When 불변이면 「불변」)

| 개정 TC | 스펙 | Given / When 변화 | Then 새 기대 | 스펙 반영 |
|---|---|---|---|---|
| TC-031 | `SettingsApp.test.tsx` | 불변 | ⓐ 메뉴 4항목 `[기본 설정, 이미지 설정, 어깨축·손 위치, 타이머]`, `aria-selected` `[true,false,false,false]` ⓑ·ⓒ 불변 | 반영 |
| TC-032 | 같음 | 어깨축 뒤 「타이머」 클릭 단계 추가 | ⓐ `aria-selected`·`tabindex` 4칸, 타이머 선택 시 h1 `[타이머]`·어깨축 region 없음 ⓑ·ⓒ 불변(bridge 0회) | 반영 |
| TC-153 | 같음 | 4번째 패널 확인 추가 | ⓐ 항목 4개 id `settings-tab-{general,images,mouse,timer}`·패널 id·`aria-labelledby`·이름·로빙 tabindex 4칸 ⓑ·ⓒ 불변 | 반영 |
| TC-154 | 같음 | `TabIcon` 'timer' 추가 | ⓐ 모양 4종 — timer = `[circle, path, path]`, circle (12,13,r8), path d `M12 9v4l2.5 2.5`·`M10 2h4M12 2v3`, stroke-width 2 ⓑ·ⓒ 불변 | 반영 |
| TC-156 | 같음 | 단계 8개(↓1·↓2·↓3·↓0·↑3·↑2·Home 0·End 3), 무반응 키 뒤 위치 3 | ⓐ 4항목 순환, 각 위치 h1·패널 이름, region 네 탭 모두(X-1 메인 결정 — v19 후속) ⓑ·ⓒ 불변 | 반영 |
| TC-099 | 같음 | 여는 탭 4개 | ⓐ 항목 4개, 네 탭 모두 금지 문구 없음·h1 = 탭 이름 ⓑ·ⓒ 불변 | 반영 |
| TC-100 · TC-FLOW-10 | 같음 | 불변 | ⓐ ja 메뉴 `[…, ja.tabTimer]` ⓑ·ⓒ 불변 | 반영 |
| TC-101 | 같음 | en에서 「Timer」 클릭 추가 | ⓐ en 메뉴 4항목·타이머 h1 `en.tabTimer`·카드 h2 `[timerCardTitle, timerTextTitle]`, ko 복귀 4항목 ⓑ·ⓒ 불변 | 반영 |
| (mock) | 같음 | `bridge/commands`에 `getTimer`·`controlTimer`, `bridge/events`에 `EVENTS.timerChanged`·`onTimerChanged`(일반 함수) | — | 반영 |
| TC-093 | `i18n.test.ts` | 불변 | ⓑ `ERROR_CODES` 23(`timer.disabled` — `autostart.cancelled` 뒤·`unknown` 앞, X-4), slots 20(pomo 2) | 반영 |
| TC-094 | 같음 | 불변 | ⓑ slots·errors 기대 + pomo 2·`timer.disabled` ko, 단순 키 **110**(93 + 17) | 반영 |
| TC-096 · TC-197 | 같음 | 불변 | ⓑ `imagesNote`·`canvas_mismatch` ko 기대 = CR-045 문구(뽀모도 포함). TC-197의 ja `後ろ髪`·en `back hair` 단언 불변 | 반영 |
| TC-228 | 같음 | 불변 | ⓑ slots 20키 | 반영 |
| TC-134 · TC-192 | `imageSlots.test.ts` | 불변 | ⓑ 배경 그룹 `[background, hair, pomo_char, pomo_bubble]`(hair 카드 index 1 스펙 불변), 슬롯 카드 20 | 반영 |
| TC-177 · TC-226 · TC-229 | 같음 | 불변 | ⓑ 슬롯 카드 총수 20(TC-226 옛 파일 21), 20장 모두 `resetKind` = `hasBuiltinDefault`(pomo 둘 clear) | 반영 |
| TC-136 | `ImagesTab.test.tsx` | 불변 | ⓐ 안내 CR-045 문구, `ORDER`·`TITLES` 20장(셋째·넷째 뽀모도 인물·말풍선, `선택`·빈 미리보기) | 반영 |
| TC-227 | 같음 | 불변 | ⓐ 카드 id 22(배경 4) | 반영 |
| TC-FLOW-15 | 같음 | 불변 | ⓐ 슬롯 카드 20·빈 칸 **14**(pomo 2 추가) | 반영 |
| TC-193 | `Hair.test.tsx` | 불변 | ⓐ 카드 **21**(19 + 뽀모도 2) | 반영(v19 후속) |
| TC-201 | 같음 | 불변 | ⓐ 셋째 버튼 없는 슬롯 카드 **19**(17 + 뽀모도 2) | 반영(v19 후속) |

v19 추적 — 요구 ↔ TC (앞 표와 겹치면 이 표 우선)

| 요구ID | 자동 TC | TC-FLOW | 수동 |
|---|---|---|---|
| R-42(뽀모도 카드 2) | TC-241, TC-242, TC-243, TC-244, TC-245, TC-246, TC-260, TC-266, TC-134, TC-136, TC-192 | TC-FLOW-25 | M-45f |
| R-43(00:00:00 스톱워치 글자·꺼져도 보임) | TC-247, TC-248, TC-261, TC-266 | TC-FLOW-24, TC-FLOW-26 | M-45b |
| R-44(타이머 탭·on/off) | TC-247, TC-248, TC-249, TC-250, TC-251, TC-252, TC-266, TC-268, TC-031, TC-153, TC-154 | TC-FLOW-24 | M-45a, M-45b |
| R-45(시작·일시정지·멈춤) | TC-252, TC-253, TC-254, TC-267 | TC-FLOW-24 | M-45b |
| R-46(끌기·회전·크기) | TC-238, TC-239, TC-249, TC-255, TC-256, TC-257, TC-260, TC-261, TC-262, TC-263, TC-264, TC-265, TC-266 | TC-FLOW-26 | M-45e |
| R-47(글자 색) | TC-240, TC-249, TC-258, TC-259, TC-261 | TC-FLOW-26 | M-45d |
| R-48(재시작 00:00:00·설정 저장) | TC-247 | TC-FLOW-27 | M-45c |
| R-20(3개 국어 — 새 문구) | TC-246, TC-268, TC-245, TC-265, TC-267, TC-093, TC-094, TC-100, TC-101 | TC-FLOW-10 | M-45a, M-45f |
| R-27(세로 메뉴 4항목) | TC-031, TC-032, TC-153, TC-154, TC-156, TC-099, TC-247 | — | M-45a |
| R-25(이미지 카드 — 배경 그룹 확장) | TC-134, TC-136, TC-177, TC-226, TC-227, TC-229, TC-242 | TC-FLOW-15 | M-45f |

v19 추적 — 설계 항목 ↔ TC

| 설계 항목 | TC |
|---|---|
| timer-tab §1.1 창 골격(메뉴 4항목·높이 검산) | TC-031, TC-153, TC-247, M-45a |
| §1.2 타이머 탭 본문 레이아웃 · §1.3 CSS(`.stage`·`.canvas` 인라인 크기·`.btn:disabled`·`.colorInput`) | TC-248, TC-260, TC-264, M-45a(시각·포커스 링·간격) |
| §2 `SettingsApp`·`Shell` 개정(`Tab`·`TAB_IDS`·`TAB_KEY.timer`·패널 분기·`onTabKeyDown` 4항목 순환) | TC-032, TC-153, TC-156, TC-247 |
| §2 `TabIcon` 'timer' | TC-154, TC-247 |
| §2 `TimerTab` · `ToggleSwitch`·`SettingsCard` 재사용 | TC-248 ~ TC-259, TC-268 |
| §2 `TimerPreview` · `findEntry`·`fitScale`·`previewToCanvas` 재사용 | TC-260 ~ TC-265 |
| §2·§5.2 `useSliderDraft`(`shown`·`onChange`·`onPointerUp`·`onKeyUp` 8키·300ms·`onBlur`·`flush`·언마운트 정리) | TC-255, TC-256, TC-257 |
| §3 `TIMER_PREVIEW_BOX`·`clampTextPos` / `clampRotation`·`clampFontSize` / `normalizeColor` | TC-238, TC-264 / TC-239 / TC-240, TC-258 |
| §4 `timer`(파생·기본값 호환) | TC-248, TC-249 |
| §4 `enabledPending` · `controlPending` | TC-250, TC-251 · TC-253 |
| §4 `rotation`·`size`·`colorDraft`·`previewTimer` | TC-255, TC-257, TC-258, TC-259 |
| §4 `drag`·`pendingPos`·`shownPos`·`stageRef` · `canvas`·`scale` | TC-262, TC-263 · TC-260, TC-264 |
| §4 `snapshot`·`receivedAt`·`text`(공용 훅) | TC-247, TC-261, TC-266 |
| §5.1 `saveTimer`(성공 null·실패 BridgeError·던지지 않음) | TC-249, TC-250, TC-251, TC-257, TC-259 |
| §5.1 `onToggleEnabled` · `onControl` · 버튼 비활성 식 | TC-250, TC-251 · TC-253, TC-254 · TC-252 |
| §5.1 `commitRotation`·`commitSize` · `onColorInput`·`commitColor`·색 change 구독 · `onCommitPos` | TC-255, TC-256 · TC-258, TC-259 · TC-FLOW-26 |
| §5.3 `toCanvasPoint`·`onTextPointerDown/Move/Up/Cancel` | TC-262, TC-263, TC-264 |
| §6 렌더 `TimerTab` 1 ~ 3 · `TimerPreview`(합성 순서·글자 스타일·캔버스 없음) | TC-248 · TC-260, TC-261, TC-264 |
| §7 T-1 · T-2 · T-3 · T-4 · T-5 · T-6 · T-7 · 멈춤 확인창 없음 | TC-247 · TC-250, TC-251 · TC-252 ~ TC-254, TC-267 · TC-262 ~ TC-264 · TC-255 ~ TC-257 · TC-258, TC-259 · TC-266 · TC-253 |
| §8 `set_settings` · `control_timer` · `get_timer` · `timer://changed` · `settings://changed`·`assets://changed` · 상수 · `AssetSlot` pomo | TC-249 ~ TC-251, TC-255 ~ TC-259 · TC-253, TC-254 · TC-247 · TC-266 · TC-266 · TC-238 ~ TC-240, TC-248 · TC-241, TC-260 |
| §9 접근성(포커스 순서·role·`aria-valuetext`·output·group·img·alt·aria-live 없음·포인터 전용) | TC-248, TC-265, TC-154, M-45a |
| §10 문구 · i18n §4.9 | TC-246, TC-268, TC-245, TC-247(ja) |
| §12 추가 후보(키보드 이동 넣지 않음) | TC-265(글자 tabindex 없음) |
| §13 · images-tab §14(카드 순서·`buildSlotGroups` ①·판정·I-2·I-3·`imagesNote`) | TC-241 ~ TC-245, TC-134, TC-136, TC-192 |
| i18n §4.3 `imagesNote` · §4.6 `asset.canvas_mismatch` · `ERROR_CODES` 23 · `SlotMessageKey` 20 | TC-096, TC-136, TC-242 · TC-243, TC-094 · TC-093, TC-246 · TC-093, TC-228 |

v19 추적 — 사용자행 ↔ TC-FLOW: S-23 → TC-FLOW-24 · S-24 → TC-FLOW-25 · S-25 → TC-FLOW-26 · S-26 → TC-FLOW-27. 그 밖 행은 앞 표 그대로(S-9 → TC-FLOW-10 개정).

CR ↔ TC: CR-045 → 신규 TC-238 ~ TC-268 · TC-FLOW-24 ~ TC-FLOW-27, 개정 TC-031 · TC-032 · TC-099 · TC-100 · TC-101 · TC-153 · TC-154 · TC-156 · TC-FLOW-10(`SettingsApp.test.tsx`) / TC-093 · TC-094 · TC-096 · TC-197 · TC-228(`i18n.test.ts`) / TC-134 · TC-177 · TC-192 · TC-226 · TC-229(`imageSlots.test.ts`) / TC-136 · TC-227 · TC-FLOW-15(`ImagesTab.test.tsx`) / TC-193 · TC-201(`Hair.test.tsx` — 미반영) / 수동 M-45a ~ M-45f.

설계 확인 필요 (v19, 관리자 인계 — 문서 수정은 소유자)

- **v19 후속 (메인 결정 2026-09-26 — 아래 X-1 · X-2 · X-3 · X-8 닫음, 본문은 기록)**: X-1 = 타이머 탭 본문도 다른 탭처럼 region(이름 = `t.tabTimer`) → TC-156 region 단언 네 탭 모두 복원, TC-248에 region 단언 추가. X-2 = 색 초안도 저장 응답까지 유지(슬라이더와 같게) → TC-258 Given `setSettings` deferred·대기 중 초안 색 단언 추가, TC-259(실패 → 저장값 색) 불변. X-3 = 기존 관례(`bridge/commands`·`bridge/events`) 유지 — 변경 없음. X-8 = `Hair.test.tsx` TC-193 카드 21·TC-201 19, 7개 파일(`DragHit`·`GeneralTab`·`Hair`·`ImagesTab`·`MousePartsTab`·`PenMode`·`SettingsApp`) `Settings` 픽스처 `timer: DEFAULT_TIMER_SETTINGS`(bridge v0.21 반영분 import) 반영.
- **X-1. 타이머 탭 본문 landmark.** 다른 세 탭 본문은 `region`(이름 = 탭 이름 — TC-031·TC-155·TC-156이 단언)인데 timer-tab §6 `TimerTab` 루트는 `<div className={styles.tab}>`로 region이 아니다. 일관성을 맞출지(`section aria-label={t.tabTimer}`) 결정 필요. 지금 스펙은 타이머 탭에서만 region 단언을 뺐다(TC-156 `i < 3`).
- **X-2. 색 확정 직후 깜박임.** §5.1 `commitColor`는 저장 **전에** `setColorDraft(null)` 하므로 대화상자를 닫는 순간부터 저장 응답·`settings://changed` 수신 전까지 견본·미리보기가 옛 색으로 돌아간다. 슬라이더(`flush`)는 저장 **뒤** 초안을 지우는데 색만 다르다. TC-258·TC-259는 최종 상태만 단언하고 중간 상태는 판정하지 않는다(M-45d에서 관찰). 의도인지 확인 필요.
- **X-3. mock 대상 표기.** timer-tab §8 끝 「`vi.mock('bridge')`에 추가」와 달리 기존 스펙은 `vi.mock('bridge/commands')`·`vi.mock('bridge/events')`를 쓴다 — 스펙은 기존 관례를 따랐다. 새 래퍼가 `commands.ts`·`events.ts`에 놓이지 않으면(예: `timer.ts`) mock 경로를 바꿔야 한다(bridge 완료 마커 때 대조).
- **X-4. `ERROR_CODES` 위치 잠정.** i18n §4.9 주대로 `autostart.cancelled` 뒤·`unknown` 앞으로 적었다(TC-093은 순서까지 비교). contract v0.21 §6 표 순서와 다르면 `EXPECTED_ERROR_CODES` 한 줄을 옮긴다.
- **X-5. 공용 훅 export 형태.** overlay 설계는 이름만 준다(named/default 미정). mock은 둘 다 제공했고, 화면이 named로 import한다고 가정했다(스펙 import도 named).
- **X-6. jsdom 한계.** `touch-action`·`user-select`·`font-family`·`font-variant-numeric`·`.btn:disabled` 흐림·포커스 링은 jsdom이 계산하지 않아 M-45a·M-45e로 넘겼다.
- **X-7. `timer.enabled` 끔 중 카드 2 조작.** §5.1 끝 「카드 2의 조작은 on/off와 무관하게 늘 쓸 수 있다」 — TC-255 ~ TC-259·TC-FLOW-26은 모두 끔(`SETTINGS`)에서 수행해 이를 함께 확인한다.
- **X-8. 미반영(예산).** `Hair.test.tsx` TC-193(카드 19 → 21)·TC-201(17 → 19) 두 줄, 그리고 `Settings` 리터럴 픽스처에 `timer` 필드 추가(`DragHit`·`GeneralTab`·`Hair`·`ImagesTab`·`MousePartsTab`·`PenMode`·`SettingsApp.test.tsx` — tsc만 영향, contract §9 「파괴 영향」 목록과 함께 처리). 다음 위임에서 반영한다.

---

## TC-FLOW

### TC-FLOW-20 · S-19: 기본 그림에서 팔이 펜 손 그림의 투명 여백 아래에 깔려 있다 — 파란·빨간 상자로 두 그림 범위를 보고, 빈 자리를 눌러 아무것도 안 움직임을 본 뒤, 팔이 칠해진 자리를 눌러 팔을 옮긴다 · 종류: 자동+수동 · 요구: R-37, R-38 · Steps: TC-222(상자 표시 부분) → TC-219(두 그림 모두 투명한 자리 — 끌기 없음 부분) → TC-218(팔 칠해진 자리 → 팔 끌기·저장·수신 부분) → M-40a · 스펙: `test/DragHit.test.tsx` · **신규(CR-040)**
- Given `DEF`·`SETTINGS`, 마스크 팔 (61,108)만 255 · 펜 손 전부 0(겹친 자리가 펜 손의 투명 여백), `setSettings` 인자 그대로 resolve. 투명 자리 = 캔버스 (480,680)(오프셋 (240,340) — 두 사각형 모두 안)
- When Step 1 마운트 → Step 2 누름 (240,340) → 이동 (250,330) → 놓기 → Step 3 누름 (225,300) → 이동 (235,290) → 놓기 → props `withArm((409,472))` 재렌더
- 상태 전달: 한 렌더 안에서 이어진다 — Step 2 뒤 위치·저장 0회가 Step 3의 Given, Step 3 저장 인자가 재렌더 props
- Then ⓐ 화면: Step 1 파란 `(389,492)` `85.5px × 99.5px`·빨간 `(356,504)` `68px × 98px` / Step 2 뒤 팔·펜 손·두 상자·값 목록 그대로 / Step 3 이동 중 팔·파란 상자·「파츠 위치」 `(409, 472)`·펜 손·빨간 상자 그대로, 재렌더 뒤 `(409, 472)` ⓑ 상태: Step 2 `drag` null, Step 3 target `'part'`, `onError(null)` ⓒ bridge: Step 2 `setPointerCapture`·`setSettings` 0회, Step 3 `setSettings` 정확히 1회 `{ ...SETTINGS, mouse: { ...MOUSE, partPos: (409,472) } }`

### TC-FLOW-19 · S-18: 단발 캐릭터라 기본 뒷머리가 필요 없어 「비우기」로 없애고, 나중에 다시 필요해 「기본값」으로 되돌리거나 「이미지 변경」으로 자기 그림을 넣는다 · 종류: 자동+수동 · 요구: R-35, R-34, R-36, R-32 · Steps: TC-201(기본 뒷머리 카드 — 버튼 3개·「비우기」 활성 부분) → TC-204·TC-205(확인창 → `removeAsset('hair')`·포커스 「이미지 변경」 부분) → TC-202(빈 칸 — 「비우기」 비활성·「기본값」 활성 부분) → TC-198(헤어 없으면 미렌더 부분) → TC-196(「기본값」 → `restoreDefaultAsset('hair')` 부분) → TC-194(「이미지 변경」 → `importAsset('hair', PATH)` 부분) → M-33 · 스펙: `test/Hair.test.tsx` · **신규(CR-038 R-35)**
- 상태 전달: Given `HAIR_DEF`(첫 실행 기본 뒷머리, R-36) → Step 2 응답 `NO_HAIR`가 Step 3·4의 Given → Step 5 응답 `HAIR_DEF` → Step 6 응답 `HAIR`. Then ⓐ Step 1 `img` `asset://hair.png?v=d`·「비우기」 활성, Step 2 확인창 설명 `CLEAR_DESC`·응답 뒤 포커스 「이미지 변경」, Step 3 `img` 없음·`등록된 그림 없음`·「비우기」 비활성·「기본값」 활성, Step 4 미리보기 `[mouse_base, kb_up]`, Step 5 `?v=d` 다시·포커스 「기본값」·「비우기」 활성, Step 6 `asset://hair.png`·「비우기」 활성 ⓑ hair `canEmpty` true → false → true → true ⓒ `removeAsset('hair')` 1회 → `restoreDefaultAsset('hair')` 1회 → `pickPngFile('PNG 이미지 선택')`·`importAsset('hair', PATH)` 각 1회, `setSettings` 0회

### TC-FLOW-18 · S-17: 장발 캐릭터의 뒷머리 PNG를 넣어 카드로 확인하고, 어깨축·손 위치 미리보기에서 팔 뒤(맨 아래)에 보이는 것을 본 뒤, 필요 없어져 비운다 · 종류: 자동+수동 · 요구: R-34 · Steps: TC-194(이미지 변경·`importAsset('hair', PATH)` 부분) → TC-193(등록 뒤 카드 미리보기 부분) → TC-198(같은 매니페스트로 합성 순서 `[hair, mouse_base, kb_up]` 부분) → TC-196(「지우기」·`removeAsset('hair')`·포커스 부분) → TC-198(헤어 없으면 미렌더 부분) → M-32(실물 겹침) · 상태 전달: Step 1 응답 매니페스트 `HAIR`가 Step 2·3의 Given, Step 3 응답 `NO_HAIR`가 Step 4의 Given · 스펙: `test/Hair.test.tsx` · **신규(CR-037)**

### TC-FLOW-15 · S-14: 처음 켰더니 캐릭터가 이미 보이고, 이미지 설정 탭에서 기본 그림 15장이 들어 있는 것을 카드로 확인한다 · 종류: 수동+자동 · 요구: R-31 · Steps: M-29(실제 첫 실행 채우기) → TC-136(받기 전 빈 카드 부분) → TC-137(매니페스트 그대로 미리보기 부분) → TC-177(15칸 = 복원 칸 부분) · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- 상태 전달: M-29가 만든 15장 매니페스트 → (자동) props `EMPTY` → `DEFAULT_ASSET_SLOTS`로 만든 매니페스트. Then ⓐ `img` 있는 카드 = R-31 15장, `필수 · 미등록` 0개, 15칸 「기본값」 활성·이름 `… 기본 그림으로 되돌리기`, 나머지 9칸 비활성·`… 그림 지우기`, 추가 카드 `kb_down_1`·`pen_down_1` ⓑ `groups` = `buildSlotGroups(15장)` ⓒ `importAsset`·`restoreDefaultAsset`·`removeAsset`·`setSettings` 0회

### TC-FLOW-16 · S-15: 자기 그림으로 바꿨다가 마음에 들지 않아 기본 그림으로 되돌리고, 기본 그림이 없는 칸은 비우고, 빈 손 그림을 복원하자 펜 손 모드를 묻는다 · 종류: 자동 · 요구: R-32, R-30 · Steps: TC-139(교체 부분) → TC-179(복원·포커스 부분) → TC-143(비우기 칸 부분) → TC-181(빈 pen_up 복원 → 확인창 부분) → TC-169(「아니요」 저장 인자 — 복원 경로) · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- 상태 전달: `BASIC` + `mouse_left` → 교체 `?v=2` → 복원 `?v=3` → `mouse_left` 없음 → `pen_up` 90×154. Then ⓐ `kb_up` `?v=2` → `?v=3`·누른 「기본값」 포커스, `mouse_left` `등록된 그림 없음`·「기본값」 비활성, 펜 확인창 ⓑ `penDialog` first → null ⓒ `importAsset('kb_up', PATH)` → `restoreDefaultAsset('kb_up')` → `removeAsset('mouse_left')`(유일한 비우기) → `restoreDefaultAsset('pen_up')` → 「아니요」 뒤 `setSettings` 1회 `{...SETTINGS, mouse:{...MOUSE, penMode:false, penPos:(355,483)}}`

### TC-FLOW-17 · S-16: 기본 그림을 따라 그리려고 원본 PNG를 폴더에 받는다(이미 받아 둔 파일이 있어 덮어쓸지 묻는다) · 종류: 자동+수동 · 요구: R-33 · Steps: TC-182(설명 부분) → TC-185(충돌 확인창·덮어쓰기 부분) → TC-184(결과 줄·포커스 부분) → M-30(실제 폴더·원본 크기) · 스펙: `test/ImagesTab.test.tsx` · **신규(CR-035)**
- 상태 전달: 1회차 보고 `conflicts` 15개 → 확인창 → 2회차 `DONE15`. Then ⓐ 설명 15장, 확인창 `…파일이 15개 있습니다. …`, 결과 줄 `기본 이미지 15장을 저장했습니다.`(`role="status"`), 단추 포커스 ⓑ `conflict` → null, `result` done ⓒ `pickFolder('기본 이미지를 저장할 폴더 선택')` 1회, `exportDefaultAssets(DIR, false)` → `(DIR, true)` 정확히 2회, 다른 bridge 0회

### TC-FLOW-01 개정(CR-035) · 요구: + R-32 · Steps 끝 「TC-143(비우기 부분) → TC-147(비운 뒤 필수 미등록 부분)」 → **「TC-179(복원 부분)」** · 스펙: `test/SettingsApp.test.tsx`
- Then ⓐ `kb_up` 「기본값」 = `기본 기본 그림으로 되돌리기`(비우기 이름 없음), 확인창 이름 `기본 그림으로 되돌리기`, `assets://changed` 뒤 `img` `asset://kb_up.png?v=2`·`필수 · 미등록` 없음 ⓑ — ⓒ `restoreDefaultAsset('kb_up')` 정확히 1회, `removeAsset`·`setSettings` 0회

### TC-FLOW-14 · S-13: 펜 쥔 손 그림을 처음 넣자 펜 손 모드를 켤지 묻고, 켠 뒤 필요하면 끄고 다시 켠다(안내 상자는 늘 보임) · 종류: 자동 · 요구: R-29, R-30 · Steps: TC-162(비활성 상태 안내 상자 부분) → TC-168(첫 등록·「예」·저장 인자 부분) → TC-161(수신 → 켜짐 표시 부분) → TC-165(확인 없이 끄기·저장 인자 부분) → TC-161(수신 → 꺼짐 표시 부분) → TC-163(켜기 확인창·「켜기」·저장 인자·포커스 부분) · **신규(CR-033)** — 추가 순서로 이 절 맨 앞에 둔다
- 상태 전달: Step 2의 저장 인자 `s1`(`penMode:true, penPos:(350,520)`)이 Step 3의 수신 props, Step 4의 인자 `s2` = `{...s1, mouse:{...s1.mouse, penMode:false}}`가 Step 5의 수신 props, Step 6의 인자 = `{...s2, mouse:{...s2.mouse, penMode:true}}`(`penPos` 유지)
- Then(종합) ⓐ 화면: 안내 상자 두 줄이 처음부터 끝까지 보임, 토글 비활성 → 켜짐 → 꺼짐 → 켜짐, 끝에 포커스 토글 ⓑ 상태: `onError` 3회 모두 `null` ⓒ bridge: `importAsset('pen_up', PATH)` 1회, `setSettings` 정확히 3회(위 인자 순서)
- 스펙: `test/PenMode.test.tsx`

Steps는 **실제 조작 순서**이고, 괄호는 그 TC의 해당 부분만 쓴다는 뜻이다. 괄호 없는 TC는 흐름 스펙이 그 TC의 ⓐ 단언을 모두 다시 확인한다. 흐름의 호출 횟수 기대는 이 Steps에서 일어나는 저장만 센다.

### TC-FLOW-07 · S-8: 펜 쥔 손 그림이 팔 끝과 어긋나 끌어 붙이고 「손 위치」로 확인한 뒤, 잘못 놓아 기본값으로 되돌린다 · 종류: 자동 · 요구: R-18 · Steps: TC-080(기본 위치 표시 부분) → TC-082(누름·끌기·놓기·저장 인자·수신 부분) → TC-089(리셋 인자·수신 뒤 기본 위치 부분) · **신규(CR-026)** — 번호 순서가 아니라 추가 순서로 둔다
- 상태 전달: 마운트(`SETTINGS`·`PEN_HAND`) → 펜 손·「손 위치」 `(350, 520)` → 누름 (200,280)·이동 (250,300) → `(450, 560)` → 놓기 → 저장 인자 `withPen((450,560))` → 저장 완료 → props `withPen((450,560))` 재렌더(수신) → `(450, 560)` 표시가 리셋의 Given → 「기본값으로 리셋」 → 인자 `{ ...SETTINGS, mouse: DEFAULT_MOUSE_EXPECTED }`(`penPos` null) → props 재렌더(수신) → `(385, 535)`.
- 기대(통합): `setSettings` 총 2회, `onError` 호출은 모두 `null`. 실물 반영(settings.json `penPos`·오버레이 손 자리)은 수동 M-16(미반영 — 「CR-026 개정 요약」).
- 선행: CR-026 화면 · bridge CR-026 · overlay CR-025
- 스펙: `test/MousePartsTab.test.tsx` `it('TC-FLOW-07: …')` — 컴포넌트 수준 통합(`settings://changed`는 props 재렌더로 흉내. SettingsApp 경유 수신 경로는 TC-036·TC-076이 이미 검증한 같은 전달 경로)

### TC-FLOW-01 · S-1: 처음 켠 사용자가 별도 설정 창을 열고 「이미지 설정」에서 캐릭터 PNG를 넣고·확인하고·비운다 · 종류: 수동+자동 · 요구: R-01, R-19, R-25 · Steps: M-01 → TC-031(마운트 부분) → TC-032(이미지 설정 부분) → TC-136(필수 미등록 부분) → TC-140(검증 실패 부분) → TC-139(재등록·수신 부분) → TC-143(비우기 부분) → TC-147(비운 뒤 필수 미등록 부분) · **개정(CR-028 — R-14 보류 해소, R-25로 확장)**
- 상태 전달: M-01에서 연 별도 창 = TC-031 마운트 결과(매니페스트 `EMPTY`, 기본 탭 「기본 설정」) → 「이미지 설정」 → `kb_up` 카드 `필수 · 미등록` → 「기본 이미지 변경」 → `pickPngFile('PNG 이미지 선택')` → `importAsset('kb_up', 'C:\img\up.png')` 1회차 `TOO_LARGE` → 그 카드 오류 줄 → 다시 변경 → 2회차 성공 → 카드 오류 지움 → `assets://changed`(url `?v=1`)로 미리보기 → 「기본 그림 지우기」 → 확인 대화상자 「지우기」 → `removeAsset('kb_up')` → `assets://changed`(`EMPTY`)로 다시 `필수 · 미등록`.
- 기대(통합): `importAsset` 2회·`removeAsset` 1회, `setSettings` 호출 없음, 창 오류 줄 없음. 실물(파일 대화상자·오버레이 반영·파일 삭제)은 M-24.
- 스펙: `test/SettingsApp.test.tsx` `it('TC-FLOW-01: …')` + `manual-checklist.md` M-01
- (v7 기록 — 폐기: Steps M-01 → TC-031 → TC-032, 기본 탭 「이미지」, R-14 부분 보류)

### TC-FLOW-08 · S-2: 방송 구성에 맞게 배율·유휴 시간을 바꾼다 · 종류: 자동 · 요구: R-03, R-04 · Steps: TC-031(마운트 부분) → TC-120(끌기·놓기·저장 인자 부분) → TC-125(수신 표시 부분) → TC-127(입력·Enter·저장 인자·수신 부분) · **신규(CR-028)**
- 상태 전달: 마운트(`scale 1.5`·`idleSeconds 120`, 기본 탭) → 슬라이더 110 → 100(저장 0회) → 놓기 → `{...SETTINGS, scale:1}` → 수신 → `100%` → 유휴 `10`(저장 0회) → Enter → `{...scaled, idleSeconds:600}`(앞 저장의 수신값이 Given) → 수신 → 입력 칸 `10`.
- 기대(통합): `setSettings` 총 2회, 오류 줄 없음. 실물(오버레이 크기·쉬는중 전환)은 M-24.
- 스펙: `test/SettingsApp.test.tsx` `it('TC-FLOW-08: …')`

### TC-FLOW-09 · S-3: Windows 시작 시 자동 실행을 켠다(한 번 실패했다가 다시 켜고, 나중에 끈다) · 종류: 자동 · 요구: R-23 · Steps: TC-031(마운트 부분) → TC-114(실패 → 오류 줄 부분) → TC-113(대기·응답·수신 부분) → TC-116(끄기 부분) · 신규(CR-028) · **개정(CR-049 — 일반 권한 흐름)**
- 상태 전달: 마운트(`autostart:false`) → 토글 → reject `{code:'autostart.error', message:'자동 실행 설정을 바꾸지 못했습니다. (schtasks 종료 코드 1)'}` → 창 오류 줄 `오류: 자동 실행 설정을 바꾸지 못했습니다. (schtasks 종료 코드 1)`·안내 줄 빈 내용·토글 꺼짐·활성 → 다시 토글 → 안내 `자동 실행 설정을 바꾸는 중입니다…`·`aria-busy="true"` → 성공(true) → `settings://changed`(`autostart:true`) → 토글 켜짐·안내 빈 내용·오류 줄 없음(성공 응답의 `onError(null)`) → 토글(끄기) → 응답 false → `settings://changed`(`autostart:false`) → 토글 꺼짐·안내 빈 내용.
- 기대(통합): ⓐ 위 상태 전달의 화면 ⓑ 수신 `autostart` false → true → false, `onError` 마지막 `null` ⓒ `setAutostart` 호출 인자 `[true],[true],[false]`, `setSettings` 없음. 실물 작업 스케줄러(일반 권한·UAC 창 없음)는 M-17, 실패 실물은 M-18(개정 대기 — 아래 Y-1).
- 스펙: `test/SettingsApp.test.tsx` `it('TC-FLOW-09 (CR-049 개정): …')`
- (옛 기록 — 폐기: 「한 번 취소했다가 다시」, Steps TC-031 → TC-114(취소 안내) → TC-113, `autostart.cancelled` → 안내 `권한 확인이 취소되어 바뀌지 않았습니다.`, 호출 `[true],[true]`)

### CR-049 개정 (v20 — 자동 실행 일반 권한, 대기열 Q-03 정식 TC 전환)

- **기준(v20, 이 절이 앞 기준 줄·CR 절의 자동 실행 관련 기대보다 우선)**: `test/change-requests.md` CR-049 · requirements R-23 「CR-049 부분 대체」·S-3 · `design.md` 변경이력 CR-049·§7 `set_autostart` 행·RTM R-23 · `design/general-tab.md` §2·§3.1·§3.2·§4-5·§5 G-6·§6 · `design/i18n.md` §4.2(`autostartDesc`·`autostartPending` 새 문구, `autostartCancelled` 삭제)·§4.6(`autostart.cancelled` 삭제, code 22개) · contract v0.22 §5.5·§6
- **범위·수**: 새 TC 없음 — 개정만(TC-114는 같은 설계 항목 `onToggleAutostart` 예외 분기·G-6 오류를 새 동작으로 검증하므로 번호 재사용). 자동 268(유효 260 · 폐기 8)·TC-FLOW 27(유효 26 · 폐기 1)·수동 41 불변

| TC | 스펙 | 바뀐 기대 |
|---|---|---|
| TC-093 | `i18n.test.ts` | ⓑ `ERROR_CODES` 22개 — `autostart.error` 뒤 `timer.disabled`·`unknown`(`autostart.cancelled` 삭제), 세 사전 `errors` 키 = 22 ⓐ·ⓒ 해당 없음 |
| TC-094 | 같음 | ⓑ `autostartDesc` = `켜면 Windows에 로그인할 때 자동으로 실행됩니다. 관리자 권한으로 실행한 게임 안에서도 입력을 인식하려면 이 앱을 직접 관리자 권한으로 실행하세요.`, `autostartPending` = `자동 실행 설정을 바꾸는 중입니다…`, `autostartCancelled`·`errors['autostart.cancelled']` 세 사전 모두 없음, 새 키 41, 단순 키 110 → **109** ⓐ·ⓒ 해당 없음 |
| TC-246 | 같음 | ⓑ `ERROR_CODES` 23 → **22**, `autostart.cancelled` 없음 |
| TC-104 | `GeneralTab.test.tsx` | ⓐ 자동 실행 설명 = 새 `autostartDesc` ⓑ `autostartNotice` 초기값 단언 삭제(상태 삭제) |
| TC-113 | 같음 | ⓐ 대기 문구 `자동 실행 설정을 바꾸는 중입니다…` |
| TC-114 | 같음 | 전면 개정(본문 — 실패 `io.error` → 오류 줄·안내 빈 내용·토글 원래대로 → 재시도 성공 → `onError(null)`) |
| TC-FLOW-09 | `SettingsApp.test.tsx` | 전면 개정(위 본문 — 취소 단계 → 실패 단계, 끄기 단계 추가) |
| TC-115 · TC-116 | `GeneralTab.test.tsx` | 불변 — 새 G-6 오류(모든 code → 오류 줄·안내 빈 내용)와 이미 일치(회귀 감시) |

요구 ↔ TC (CR-049 범위)

| 요구ID | 상태 | TC | 수동 | TC-FLOW |
|---|---|---|---|---|
| R-23 | 유효(CR-049 부분 대체 — 관리자 확인창 안내·취소 처리 폐기) | TC-094, TC-104, TC-105, TC-113, TC-114(개정), TC-115, TC-116 | M-17, M-18(개정 대기 Y-1) | TC-FLOW-09(개정) |
| R-20 | 유효 | 앞 행 + TC-093, TC-094, TC-246(code 수·사전 문구) | M-22 | TC-FLOW-10 |

설계 항목 ↔ TC (CR-049 범위)

| 설계 항목 | TC |
|---|---|
| general-tab §2 자동 실행 `ToggleSwitch`(`description={t.autostartDesc}`·`busy`) | TC-104, TC-105, TC-113 |
| §3.1 `autostartPending` / `autostartNotice`(CR-049 삭제) | TC-113, TC-114 / 삭제 항목 — TC-114 ⓐ 「실패 뒤 안내 빈 내용(취소 안내 없음)」이 부재 확인. 「CR-028 추적」 절 `general §3.1` 행의 `autostartNotice`는 이 행으로 읽는다 |
| §3.2 `onToggleAutostart` 성공(`onError(null)`)·예외(모든 code → `onError`, 토글 원래대로) | TC-113, TC-114, TC-115, TC-116 |
| §4-5 안내 줄(항상 렌더, 대기 중에만 `autostartPending`, 아니면 빈 내용) | TC-104, TC-113, TC-114, TC-115 |
| §5 G-6 정상 / 오류 | TC-113, TC-116 / TC-114, TC-115, TC-FLOW-09 |
| §6 상태 알림(대기 안내 `role=status aria-live=polite` 한 줄, 취소 안내 삭제) | TC-104, TC-113, TC-114 |
| i18n §4.2 `autostartDesc`·`autostartPending`(3개 국어 새 문구) | TC-094(ko 정확), TC-093(ja·en 비어 있지 않음), TC-104, TC-113, TC-FLOW-09 |
| i18n §4.6 `autostart.cancelled` 삭제·22개 | TC-093, TC-094, TC-246 |
| contract v0.22 §5.5·§6 `set_autostart` 오류 code(`autostart.error`·`io.error` 등) | TC-114(`io.error`), TC-115(`autostart.error`), TC-FLOW-09 |

사용자행 ↔ TC-FLOW (CR-049 범위): S-3(R-23) → TC-FLOW-09(개정).

CR ↔ TC: CR-049 → 개정 TC-093 · TC-094 · TC-246(`i18n.test.ts`) / TC-104 · TC-113 · TC-114(`GeneralTab.test.tsx`) / TC-FLOW-09(`SettingsApp.test.tsx`) / 수동 M-17 · M-18 개정 대기(Y-1). 대기열 Q-03 상태는 호출자가 검증 후 마킹한다(이 개정에서 바꾸지 않음).

설계 확인 필요 (v20, 관리자 인계 — 문서 수정은 소유자)

- **Y-1. `manual-checklist.md` M-17 · M-18 미개정(이번 위임 예산 초과 — 다음 위임).** M-17 기대의 옛 전제: 1) 대기 문구 `Windows 권한 확인을 기다리는 중입니다…` → `자동 실행 설정을 바꾸는 중입니다…` 2) 「UAC 창 「예」」 단계 삭제(창이 뜨지 않아야 함) 3) 작업 「가장 높은 수준의 권한으로 실행」 → 해제(일반 권한 `LeastPrivilege`) 6) 「관리자 권한 창 안 입력에도 반응」 → 자동 실행만으로는 보장되지 않음(설명 문구대로 앱을 직접 관리자로 실행해야 함) 7) 해제도 UAC 없이. M-18(UAC 취소)은 전제가 사라졌다 — 폐기하거나 「실패 → 창 오류 줄·토글 원래대로·안내 빈 내용」 실물 확인으로 바꿔야 하는데, **실물에서 `schtasks` 실패를 재현하는 절차가 설계에 없다**. 폐기/재현 절차 결정 필요.
- **Y-2. requirements.md §3.4 에러 행 「에러 code 정본 … (20개, `unknown` 포함)」** 표기가 현재 22개와 어긋난다(i18n §4.9 주 「20개 → 23개로 읽는다」도 CR-049 뒤 22). ui-designer 동기화 몫. TC는 22(i18n §4.6 CR-049 주·소스 `types.ts`·contract v0.22 §6 = Rust 21 + `unknown`)를 따른다.
- **Y-3. X-4 닫음.** `ERROR_CODES` `timer.disabled` 위치 = `autostart.error` 뒤·`unknown` 앞(i18n §4.9 주 CR-049 괄호, 소스 `types.ts` 일치). `EXPECTED_ERROR_CODES`가 순서까지 비교한다.

### CR-050 개정 (v21 — 타이머 모드: 두 토글·시작 시간·알림음 카드·끝남 깜빡임, 사용자 결정 CR-048 🔒)

- **기준(v21, 이 절이 앞 「CR-045」 절의 타이머 탭 기대보다 우선)**: requirements **v1.21** R-49 ~ R-55(R-44 「on/off 토글」 부분은 R-49가 대체)·용어 주(CR-050)·S-27 ~ S-29·S-23 주 · `design.md` RTM · `design/timer-tab.md` §14(14.1 대체 목록 ~ 14.15) · `design/i18n.md` §4.9(삭제·변경 표기)·§4.10 · 패킷 `doc/200_설계/architecture/timer-mode-03-packet-ui.md` §5 · contract v0.23(소스 반영 — `bridge/commands` `getAlarmSound`·`importAlarmSound`·`removeAlarmSound`·`pickAudioFile`, `types.ts` 상수) · 공용 함수 정의 `src/overlay/design/functions.md` §5.7(인용만 — `timerDisplayMs`·`isTimerBlinking`·`useElapsedText`·`defaultAlarmUrl`·`playSound`)
- **선행**: overlay CR-050 공용 3모듈(`timerClock` 추가 함수·`alarmSound`·`useTimerSnapshot`) → settings 구현(`timerValues` 추가분·`CountdownTimeInput`·`AlarmSoundCard`·`TimerTab`·`TimerPreview` 개정·i18n §4.10). 구현 전 새 스펙의 import 오류·기대 불일치는 **예정된 Red**(TC-249는 지금도 깨져 있다 — `DEFAULT_TIMER_SETTINGS` 새 필드 3개)
- **공통 규약(v21)**:
  - 픽스처: `T` = 옛 모양(새 필드 없음 — `{enabled:false, textPos:(268,403), rotation:5, fontSize:36, color:'#333333'}`) · `TF` = `{ ...T, mode:'stopwatch', countdownSecs:1500, alarmVolume:80 }`(= `DEFAULT_TIMER_SETTINGS` v0.23 리터럴, 독립 대조) · `S_ON` = `{...SETTINGS, timer:{...T, enabled:true}}`(옛 설정 켜짐 → 스톱워치) · `S_SW` = `{…, timer:{...TF, enabled:true, mode:'stopwatch'}}` · `S_CD` = `{…, timer:{...TF, enabled:true, mode:'countdown'}}` · `S_CD_OFF` = `{…, timer:{...TF, mode:'countdown'}}`(꺼진 타이머 모드) · `MP3` = `{format:'mp3', bytes:312004, url:'asset://alarm.mp3?v=1'}` · 카운트다운 사진 `cd(status, elapsedMs)` = `{status, elapsedMs, mode:'countdown', durationMs:1500000}`
  - **저장 인자 규칙**: 모든 `setSettings` 인자의 `timer`는 `{ ...TF(=DEFAULT), ...settings.timer, ...변경 }` **전체 8필드**, `countdownSecs`·`alarmVolume`은 정수 — 이 절과 개정 TC의 ⓒ는 이 모양을 `toStrictEqual`로 단언한다
  - 스위치 이름: 「스톱워치 사용」(`timer-stopwatch`) · 「타이머 사용」(`timer-countdown`). CR-045 스펙의 `sw('타이머 사용')`은 이제 **타이머(카운트다운) 스위치**이므로 옛 단언은 「스톱워치 사용」(`swSw`)으로 옮겼다
  - mock: `bridge/commands`에 알림음 래퍼 4개 추가(`getAlarmSound`는 매 테스트 `mockResolvedValue(null)`), `vi.mock('components/utils/alarmSound')`(`defaultAlarmUrl` → `'blob:default'`, `playSound` → 호출마다 새 정지 함수 `vi.fn()` 반환). `timerClock`(`isTimerBlinking`·`timerTextStyle`)은 실물. `SettingsApp.timer.test.tsx`는 공용 훅 실물(카운트다운 표시 = `durationMs − 경과`, 올림 초)
  - 시간: 가짜 시계는 슬라이더 키보드 300ms(TC-256·TC-283)뿐. 시작 시간 저장 대기는 deferred + act. 실제 sleep 없음. 칸 이동은 `fireEvent.focusOut(칸, { relatedTarget })`(React `onBlur` = `focusout` 버블 — 칸 사이 = 다른 칸, 묶음 밖 = `null`)
- **범위·수**: 신규 TC-269 ~ TC-287(19) · TC-FLOW-28 ~ TC-FLOW-30(3). 개정(기대값 갱신) TC-246 · TC-248 · TC-249 · TC-250 · TC-251 · TC-252 · TC-260 ~ TC-265 · TC-268 + 연동(저장 인자 전체 timer·스위치 이름·카드 3장) TC-247 · TC-253 ~ TC-259 · TC-266 · TC-267 · TC-FLOW-24 · TC-FLOW-26 · TC-FLOW-27 · TC-093 · TC-094 · TC-101. 수: 자동 **287(유효 279 · 폐기 8)** · TC-FLOW **30(유효 29 · 폐기 1)** · 수동 **48**(M-50a ~ M-50g 신설 — `manual-checklist.md` v15)

#### CR-050 신규 TC

### TC-269 · timerValues §14.5 검증 예 전부 · 종류: 자동 · 요구: R-49, R-50, R-53, R-54 · 설계: timer-tab §14.5 표 11행·검증 예, §14.4 `timerValues` 행 · 스펙: `test/timerValues.test.ts` · **신규(CR-050)**
- Given 순수 함수 `fullTimer`·`timerToggles`·`togglePatch`·`isDurationLocked`·`splitHms`·`joinHms`·`pad2`·`parseHmsField`·`parseHmsDraft`·`clampVolume`·`soundSizeKb`, 기대는 리터럴(DEFAULT 독립 대조)
- When §14.5 검증 예 + 식에서 나오는 경계 호출
- Then ⓐ 해당 없음(순수 모듈) ⓑ 반환: `fullTimer(undefined)` = DEFAULT 리터럴 · 옛 설정(`enabled:true`) → `mode 'stopwatch'`·1500·80·`enabled true` · 명시 `undefined` 필드도 기본값 · 새 필드 있으면 그대로 · 입력 불변 / `timerToggles` 옛 설정 → `{true,false}`, `{enabled:false, mode:'countdown'}` → `{false,false}`, 켜진 타이머 → `{false,true}` / `togglePatch('countdown',true)` → `{enabled:true, mode:'countdown'}`, `('stopwatch',false)`·`('countdown',false)` → `{enabled:false}`(mode 키 없음) / `isDurationLocked` 켜진 타이머 × `paused`·`running`·`finished` → true, `stopped`·`restPaused` → false, 스톱워치 `running`·꺼진 타이머 `paused` → false / `splitHms` 1500 → {0,25,0}·3723 → {1,2,3}·359999 → {99,59,59}·NaN·Infinity·−5 → {0,0,0}·400000 → {99,59,59}·61.9 → {0,1,1} / `joinHms(1,2,3)` 3723 / `pad2(5)` `'05'` / `parseHmsField` `''` → 0·`' 7 '` → 7·`'60'`(59) → null·`'100'`·`'1a'`·`'-1'`·`'1.5'` → null / `parseHmsDraft` 01:02:03 → 3723(정수)·`{'','0','5'}` → 5·0:0:0·빈칸 셋 → null·분 60·`'1a'`·`'100'` → null·99:59:59 → 359999·0:0:1 → 1 / `clampVolume` 80.4 → 80·79.5 → 80·101 → 100·−3 → 0·NaN·Infinity → 80 / `soundSizeKb` 312004 → 305·1024 → 1·1025 → 2·0 → 0 ⓒ 해당 없음(bridge 호출 없음 — 상수만 import)

### TC-270 · 토글 표시 4가지(+ 꺼진 타이머 모드) · 종류: 자동 · 요구: R-49 · 설계: timer-tab §14.6 `timer`(= `fullTimer`)·`stopwatchOn`·`countdownOn`, §14.4 `ToggleSwitch` ×2 `checked` · 스펙: `test/TimerTab.test.tsx` · **신규(CR-050)**
- Given `SETTINGS`(둘 다 꺼짐) → `S_SW` → `S_CD` → `S_ON`(옛 설정 `mode` 없음·`enabled:true`) → `S_CD_OFF`
- When props 재렌더(settings://changed 흉내)
- Then ⓐ 두 스위치 `aria-checked` = `[false,false]` → `[true,false]` → `[false,true]` → `[true,false]` → `[false,false]` ⓑ 표시값 = `timerToggles(fullTimer(settings.timer))`(한쪽이 켜지면 다른 쪽은 저장값상 꺼짐) ⓒ `setSettings`·`controlTimer` 0회

### TC-271 · 토글 저장 인자 · 종류: 자동 · 요구: R-49 · 설계: §14.7.1 `onToggleMode`·`saveTimer`(식 불변, `timer = fullTimer`), §14.5 `togglePatch`, §14.9 T-8·T-9·confirm 문단, §14.10 `set_settings` · 스펙: `test/TimerTab.test.tsx` · **신규(CR-050)**
- Given 7사례: 끔 → 스톱워치 켜기(옛 모양) · `S_ON` → 「타이머 사용」(전환) · `S_CD` → 「스톱워치 사용」(전환) · `S_CD` → 「타이머 사용」(끄기) · `S_ON` → 「스톱워치 사용」(끄기) · `S_CD_OFF` → 「스톱워치 사용」 · CUSTOM(`countdown`·3723·40·(500,120)·−30·80·`#ff0000` 켜짐) → 「스톱워치 사용」, `window.confirm` spy
- When 사례마다 새로 렌더 → 스위치 클릭
- Then ⓐ 확인창(`dialog`·`alertdialog`) 없음 ⓑ `onError` 사례마다 `[null]` ⓒ `setSettings` 사례마다 정확히 1회: `{…, timer:{...TF, enabled:true, mode:'stopwatch'}}` · `{...S_ON, timer:{...TF, enabled:true, mode:'countdown'}}`(전환 = 한 번) · `{...S_CD, timer:{...TF, enabled:true, mode:'stopwatch'}}` · `{...S_CD, timer:{...TF, enabled:false, mode:'countdown'}}`(모드 유지) · `{...S_ON, timer:{...TF, enabled:false, mode:'stopwatch'}}` · `{...S_CD_OFF, timer:{...TF, enabled:true, mode:'stopwatch'}}` · `{...CUSTOM, timer:{...CUSTOM.timer, mode:'stopwatch'}}`(나머지 7필드 불변), `controlTimer`·`window.confirm` 0회

### TC-272 · 토글 저장 중 잠금·실패 · 종류: 자동 · 요구: R-49 · 설계: §14.6 `enabledPending`(의미 확장 — 두 스위치 `busy`, 세 버튼 비활성), §14.7.1 `onToggleMode`(pending 무시·실패 → 원래 값), §14.11 `aria-busy` · 스펙: `test/TimerTab.test.tsx` · **신규(CR-050)**
- Given `S_ON`, `setSettings` 1회차 deferred → reject `SAVE_ERR`
- When 「타이머 사용」 클릭 → (대기 중 두 스위치 다시 클릭) → reject
- Then ⓐ 대기 중 두 스위치 `aria-busy="true"`·disabled·`aria-checked` `[true,false]`(낙관 갱신 없음)·세 버튼 disabled → 실패 뒤 `[true,false]`·busy 없음·활성·세 버튼 활성 ⓑ `onError` `[[{code:'settings.invalid', message}]]` ⓒ `setSettings` 정확히 1회 `{...S_ON, timer:{...TF, enabled:true, mode:'countdown'}}`, 재시도·`controlTimer` 없음

### TC-273 · 시작 시간 표시 · 종류: 자동 · 요구: R-50, R-55 · 설계: §14.6 `shownHms`·저장값 동기 효과(§14.7.2), §14.8 `CountdownTimeInput` 렌더, §14.11 group·aria-label·inputMode, §14.2(모드·켜짐 무관하게 늘 보임), i18n §4.10 · 스펙: `test/CountdownTimeInput.test.tsx`(컴포넌트) · `test/TimerTab.test.tsx`(탭) · **신규(CR-050)**
- Given 컴포넌트 `secs` 1500 → 3723 → 359999 / ko·ja·en · 탭 `SETTINGS`(옛 모양) → `S_CD`(3723) → `S_SW`(359999)
- When 렌더·props 재렌더
- Then ⓐ 칸 `['00','25','00']` → `['01','02','03']` → `['99','59','59']`, 묶음 `role=group` 이름 `시작 시간`·`aria-describedby="timer-duration-msg"`, 칸 이름 `시`·`분`·`초`·`type=text`·`inputmode=numeric`·`maxlength=2`·`autocomplete=off`·활성·`aria-invalid` 없음, 힌트 `최대 99:59:59`, 안내 `p[aria-live=polite]` 빈 내용 / ja·en 묶음·칸 이름·힌트 = 사전 값 / 스톱워치 켜짐에서도 보임 ⓑ 표시 = `splitHms(secs)` 두 자리(`draft` 없음) ⓒ `onCommit`·`setSettings` 0회

### TC-274 · 시작 시간 저장 · 종류: 자동 · 요구: R-50 · 설계: §14.7.2 `onFieldChange`·`commit`(`saving`·같은 값·성공 시 draft 유지)·저장값 동기 효과·`onGroupBlur`(묶음 안 이동 무시)·`onFieldKeyDown`(Enter), §14.7.1 `commitCountdownSecs`·`saveTimer`, §14.9 T-10, 검증 예(컴포넌트) · 스펙: `test/CountdownTimeInput.test.tsx` · `test/TimerTab.test.tsx` · **신규(CR-050)**
- Given 컴포넌트 `secs` 1500, `onCommit` 1회차·2회차 deferred / 탭 `SETTINGS`
- When `01` → Tab(분) → `02` → Tab(초) → `03` → 묶음 밖 → resolve(true) → props 3723 → 입력 없이 나감·같은 값(`03`) 나감 → `04` → Enter → (대기 중) 묶음 밖 → resolve(true) → props 3724 / 탭: 같은 입력 → 묶음 밖 → props 3723
- Then ⓐ 칸 사이 이동 중 `01:02:03` 표시, 저장 대기 중·성공 뒤(props 1500 그대로)·props 수신 뒤 모두 `01`·`02`·`03`(옛 값으로 튀지 않음), Enter 뒤 `01:02:04` 유지, 안내 빈 내용 ⓑ 칸 사이 Tab 0회, 입력 없음·같은 값 0회, Enter `keyDown` 기본 동작 막힘(`fireEvent` 반환 false), Enter 뒤 대기 중 blur 추가 0회(`saving`), 탭 `onError` `[[null]]` ⓒ `onCommit` `[[3723],[3724]]`(정수 — `Number.isInteger`) / 탭 `setSettings` 정확히 1회 `{...SETTINGS, timer:{...TF, countdownSecs:3723}}`

### TC-275 · 시작 시간 되돌림·저장 실패 · 종류: 자동 · 요구: R-50 · 설계: §14.7.2 `commit`(`parseHmsDraft` null → 되돌림·`invalid`, 실패 `false` → 옛 저장값)·`onFieldChange`(입력하면 안내 지움), §14.8 안내 `p`(`msgError`), §14.3 `.hmsField[aria-invalid]`·`.msgError`, §14.9 T-10 오류, §14.11 `aria-invalid` · 스펙: `test/CountdownTimeInput.test.tsx` · `test/TimerTab.test.tsx` · **신규(CR-050)**
- Given 컴포넌트 `secs` 1500(뒤에 5) / 탭 `SETTINGS`, `setSettings` 1회 reject `SAVE_ERR`
- When `00:00:00` 나감 → 분 `3` 입력 → 분 `60` → 시 `1a` → 시 `100`(maxLength 우회) → `'' : 0 : 5` 나감 → props 5 → `onCommit` false로 분 `07` 나감 / 탭: `00:00:00` 나감 → 분 `10` 나감(실패)
- Then ⓐ 되돌림마다 칸 `00`·`25`·`00`·안내 `00:00:01 ~ 99:59:59 사이로 입력해 주세요`·안내 클래스 `msgError`·세 칸 `aria-invalid="true"`, 다시 입력하면 안내 빈 내용·`aria-invalid` 없음, 빈칸 = 0 → 저장 뒤 `00:00:05`, 실패 뒤 칸 `00`·`00`·`05`·안내 빈 내용(되돌림 안내 아님) / 탭 실패 뒤 `00:25:00`·안내 빈 내용 ⓑ 탭 `onError` `[[{code:'settings.invalid', message}]]` ⓒ `onCommit` 되돌림 사례 0회, `[[5],[425]]` / 탭 되돌림 `setSettings` 0회, 실패 사례 `{...SETTINGS, timer:{...TF, countdownSecs:600}}` 1회

### TC-276 · 시작 시간 잠금(+ 잠금 뒤 blur 가드) · 종류: 자동 · 요구: R-50 · 설계: §14.5 `isDurationLocked`, §14.6 `durationLocked`(`TimerTab` 파생 → `locked`)·잠금 중 draft 버림, §14.7.2 잠금 정리 효과·**`commit` 첫 줄 `locked` 가드**·검증 예 끝 행(focusOut 후 `locked` 재렌더 → 0회), §14.8 안내(`locked` 우선, `msgError` 아님), §14.9 T-11 · 스펙: `test/CountdownTimeInput.test.tsx`(컴포넌트 `TC-276(컴포넌트)` · `TC-276(컴포넌트 가드)`) · `test/TimerTab.test.tsx`(상태 7사례 + 잠긴 뒤 blur) · **신규(CR-050)** · 가드 하위 항목 추가(v21 후속)
- Given 컴포넌트 `locked` false ↔ true / 탭 공용 훅 mock 사진: 타이머 켜짐 × `running`·`paused`·`finished`·`stopped`, 스톱워치 `running`, 둘 다 꺼짐 `running`, 꺼진 타이머 모드 `paused` / **가드**: 컴포넌트 `secs` 1500·`locked` false에서 시작, ② 사례는 잠긴 칸에 합성 `change`로 draft를 남긴다(실제 사용자는 disabled 칸에 입력할 수 없다 — 가드만 격리하는 컴포넌트 계약 테스트)
- When 입력 중(`01`) 잠금 → 풀림 / 되돌림 안내 뒤 잠금 → 풀림 / 탭 사례별 재렌더, `07` 입력 중 `running` 수신 → **묶음 blur(`focusOut`, relatedTarget null)** → `stopped` / **가드** ① 시 `01` 입력 → `locked` true 재렌더 → 묶음 blur ② 잠긴 채 시 `01` → blur → Enter → 분 `60` → blur
- Then ⓐ 잠김 = 세 칸 disabled·안내 `멈춤 상태에서 바꿀 수 있습니다`(`msgError` 아님), 풀림 = 활성·빈 안내 / 탭: 타이머 `running`·`paused`·`finished`만 잠김(잠김 안내), **CR-052 개정: 타이머 켜짐 `stopped`만 입력 가능 — 타이머 모드 아님 4사례(스톱워치 `running`·`stopped`(사례 추가, 모두 8사례), 둘 다 꺼짐 `running`, 꺼진 타이머 모드 `paused`)는 회색 비활성(세 칸 disabled·`aria-disabled="true"`·안내 줄 빈 값, 옛 「나머지 4사례 입력 가능」 대체 — 컴포넌트 수준은 TC-288)**, 잠긴 뒤 blur 뒤에도 칸 `00:25:00`·잠김 안내 / 가드 ① 칸 `00`·`25`·`00`·잠김 안내 ② 세 칸 `aria-invalid` 없음·안내 = 잠김 문구·`msgError` 아님(invalid 불변) ⓑ 잠기면 draft·invalid 버림(칸 = 저장값 `00:25:00`, 풀린 뒤에도 저장값·`aria-invalid` 없음), 잠긴 동안 `commit`은 저장·되돌림 판정을 하지 않는다 ⓒ `onCommit`·`setSettings`·`controlTimer` 0회(잠금은 화면 판정 — core 호출 없음), 가드 ①·② blur·Enter 모두 `onCommit` 0회(가드가 없으면 ②에서 `onCommit(5100)`), 탭 잠긴 뒤 blur `setSettings` 0회

### TC-277 · 알림음 카드 마운트·상태 문구 · 종류: 자동 · 요구: R-53 · 설계: §14.7.3 마운트 조회 효과(`alive`)·`statusText`, §14.6 `sound`(초기 `null` = 기본), 버튼 비활성 규칙, §14.8 렌더, §14.10 `get_alarm_sound`, §14.11 `aria-live` · 스펙: `test/AlarmSoundCard.test.tsx` · **신규(CR-050)**
- Given `getAlarmSound` deferred → `MP3` / `null` / `WAV`(1024B) / reject `sound.io` / 언마운트 뒤 reject
- When 마운트(·응답)
- Then ⓐ h2 `알림음`·설명 `타이머가 0이 되면 한 번 울립니다`·힌트 `wav·mp3·ogg, 1MB 이하`, 응답 전·`null`·실패 = `지금: 기본 알림음`·「기본값」 disabled, `MP3` = `지금: 등록한 알림음 (MP3 · 305 KB)`·「기본값」 활성, `WAV` = `(WAV · 1 KB)`, 「파일 등록」·「미리 듣기」 늘 활성·세 버튼 `type=button`, 상태 문구 `p[aria-live=polite]`·클래스 `soundStatus`(§14.3·§14.8 — CSS Modules 이름 포함 단언, TC-275 `msgError` 관례) ⓑ `onError` = 실패 1회 `{code:'sound.io', message}`, 언마운트 뒤 늦은 실패는 무시 ⓒ `getAlarmSound` 마운트마다 1회·인자 없음, `importAlarmSound`·`removeAlarmSound`·`pickAudioFile`·`playSound`·`onCommitVolume` 0회

### TC-278 · 파일 등록 · 종류: 자동 · 요구: R-53 · 설계: §14.7.3 `onImport`(`soundPending`·취소 null·성공 `onError(null)`), §14.9 T-13, §14.10 `pickAudioFile`·`import_alarm_sound` · 스펙: `test/AlarmSoundCard.test.tsx` · **신규(CR-050)**
- Given `sound` null, `pickAudioFile` 1회차 deferred → `'C:/sounds/bell.mp3'`, `importAlarmSound` → `MP3` / 2회차 `null`(취소)
- When 「파일 등록」 → (대기 중 다시) → resolve → 다시 「파일 등록」(취소)
- Then ⓐ 처리 중 「파일 등록」·「기본값」 disabled → 성공 뒤 `지금: 등록한 알림음 (MP3 · 305 KB)`·둘 다 활성, 취소 뒤 문구 불변 ⓑ `onError` `[[null]]`(취소는 추가 없음) ⓒ `pickAudioFile` `[['소리 파일 선택'],['소리 파일 선택']]`(대기 중 누름 무시), `importAlarmSound` 정확히 1회 `('C:/sounds/bell.mp3')`, `removeAlarmSound` 0회

### TC-279 · 등록 실패 · 종류: 자동 · 요구: R-53, R-55 · 설계: §14.7.3 `onImport` 예외(`toBridgeError`, `sound` 불변), §14.9 T-13 오류, §14.10 에러 행, design §5.3 오류 줄·`errorText`, i18n §4.10 `errors['sound.*']` · 스펙: `test/AlarmSoundCard.test.tsx`(카드) · `test/SettingsApp.timer.test.tsx`(오류 줄) · **신규(CR-050)**
- Given 카드: `sound` = `MP3`, `importAlarmSound` reject `sound.not_audio` → `sound.too_many_bytes`, 셋째는 `pickAudioFile` reject `Error('boom')` / 통합: 저장 언어 ja, 같은 두 실패
- When 「파일 등록」 3회 / 통합: ja 「ファイルを登録」 → en 수신 → en 등록 → ko 수신
- Then ⓐ 카드: 상태 문구 `MP3` 그대로·버튼 활성 / 통합: 오류 줄 `${ja.errorPrefix} ${ja.errors['sound.not_audio']}` → en 같은 code → `${en.errorPrefix} ${en.errors['sound.too_many_bytes']}` → ko `오류: 알림음 파일은 1MB 이하여야 합니다. (현재 2000000바이트)`(core message), 상태 문구 기본 불변 ⓑ 카드 `onError` `[[{sound.not_audio}],[{sound.too_many_bytes}],[{code:'unknown', message:'boom'}]]` ⓒ `importAlarmSound` 인자 `[['C:/sounds/notes.txt'],['C:/sounds/notes.txt']]`, 통합 `pickAudioFile` 인자 `[ja.alarmPickTitle]` → `[en.alarmPickTitle]`, `setSettings` 0회

### TC-280 · 기본값 · 종류: 자동 · 요구: R-53 · 설계: §14.7.3 `onReset`(`sound === null || soundPending` 무시·`stopPreview` 먼저·`setPreviewFailed(false)`·확인창 없음), 버튼 비활성, §14.6 `previewFailed`, §14.9 T-15·confirm 문단, §14.10 `remove_alarm_sound` · 스펙: `test/AlarmSoundCard.test.tsx` · **신규(CR-050)** · 실패 문구 지움 단계 추가(v21 후속)
- Given `sound` = `MP3`, 미리 듣기 재생 중 → 재생 `onFail` 호출로 카드 안 `role=alert` `이 파일을 재생하지 못했습니다` 표시 중, `removeAlarmSound` deferred / 다음 마운트 reject `sound.io`, `window.confirm` spy
- When 「기본값」 → resolve → (비활성) 「기본값」 / 실패 사례 「기본값」
- Then ⓐ 대기 중 「기본값」·「파일 등록」 disabled, 확인창 없음 → `지금: 기본 알림음`·「기본값」 disabled·**`role=alert` 사라짐** / 실패 뒤 `MP3` 문구·활성 ⓑ `previewFailed` false(성공 뒤), `onError` `[[null],[{code:'sound.io', message}]]` ⓒ 재생 정지 함수 1회 → `removeAlarmSound()` 정확히 1회(인자 없음), 파일 없을 때 누름 0회, `window.confirm` 0회

### TC-281 · 미리 듣기 · 종류: 자동 · 요구: R-53, R-54 · 설계: §14.7.3 `onPreview`(`stopPreview` → `sound?.url ?? defaultAlarmUrl()` → `playSound(url, volumeDraft.shown / 100, onFail)`)·`previewFailed`, §14.6 `stopRef`·`volumeDraft`, §14.9 T-14, §14.11 `role=alert` · 스펙: `test/AlarmSoundCard.test.tsx` · **신규(CR-050)**
- Given `sound` null, 음량 80 / 슬라이더 초안 40(놓지 않음) / 등록 뒤 `MP3`. **포커스 이동 없음(합성 이벤트 `fireEvent.change`·`click`) — 컴포넌트 계약 테스트**: 초안 상태에서 `onPreview`가 초안값을 쓰는지만 본다. 실물에서 버튼을 누르면 슬라이더가 먼저 blur되어 저장되는 흐름은 수동 M-50a ④
- When 「미리 듣기」 → 초안 40 → 「미리 듣기」 → 둘째 재생 `onFail` 호출 → 「미리 듣기」 → 셋째 `onFail` → 등록 성공 → 「미리 듣기」
- Then ⓐ 실패 뒤 `role=alert` `이 파일을 재생하지 못했습니다`(오류 줄 아님), 다음 누름·등록 성공 때 사라짐 ⓑ `onError` 0회(등록 성공의 `null` 전까지), `onCommitVolume` 0회(미리 듣기는 저장 안 함) ⓒ `playSound` 인자 `['blob:default', 0.8, fn]` → `['blob:default', 0.4, fn]` → (셋째) → `[MP3.url, 0.4, fn]`, 다시 누를 때마다 이전 정지 함수 1회, 등록 성공 시 재생 정지, 등록 뒤 `defaultAlarmUrl` 0회

### TC-282 · 미리 듣기 정지(① 언마운트·탭 이동 ② 창 숨김 ③ 구독 해제) · 종류: 자동 · 요구: R-53 · 설계: §14.6 미리 듣기 정지 조건 세 가지, §14.7.3 언마운트 정지 효과·**창 숨김 정지 효과**(`document` `visibilitychange` + `visibilityState === 'hidden'` → `stopPreview`, `visible`은 아무것도 안 함, 해제는 언마운트)·`stopPreview`, §14.9 T-17 ①·②, §14.11(창 숨김 정지는 접근성 영향 없음) · 스펙: `test/AlarmSoundCard.test.tsx`(`TC-282` ① · `TC-282(창 숨김)` ②·③) · `test/SettingsApp.timer.test.tsx`(탭 이동) · **신규(CR-050)** · ②·③ 추가(v21 후속)
- Given ① 재생 중 / 재생 없음 · 통합: 타이머 탭에서 재생 중 ② `sound` = `MP3`·음량 80, 미리 듣기 재생 중, `document.visibilityState`를 테스트가 제어(`Object.defineProperty(document, 'visibilityState', { configurable: true, get })` — 테스트 뒤 `Reflect.deleteProperty`로 원래 getter 복원), `document.addEventListener`·`removeEventListener` spy(원래 동작 유지, 테스트 뒤 `mockRestore`) ③ ②에 이어 같은 카드
- When ① 언마운트 · 통합: 메뉴 「기본 설정」 클릭 ② `'hidden'` + `document.dispatchEvent(new Event('visibilitychange'))` → `'visible'` + 이벤트 → (재생 없이) `'hidden'` + 이벤트 → `'visible'` + 이벤트 ③ 「미리 듣기」 → 언마운트 → `'hidden'` + 이벤트
- Then ⓐ 통합: h1 `기본 설정`(타이머 탭 언마운트) / ② 숨김·복귀 뒤에도 카드 그대로 — h2 `알림음`·상태 문구 `지금: 등록한 알림음 (MP3 · 305 KB)`·output `80%`(언마운트 아님 — 다시 열면 같은 화면) ⓑ 재생 없이 언마운트해도 예외 없음, `onError`·`onCommitVolume` 0회, ③ `visibilitychange` 구독은 `document`에 1개이고 언마운트 때 **같은 핸들러**로 해제 ⓒ ① 정지 함수 정확히 1회(재생 없음 → 호출 없음), `setSettings` 0회 ② `hidden` → 첫 정지 함수 정확히 1회, `visible` → 정지 추가 0회·`playSound` 추가 0회(자동 재생 없음), 재생 없이 `hidden` → 호출 없음 ③ 언마운트 정지 1회 뒤 `visibilitychange` → 두 정지 함수 모두 추가 호출 0회, `playSound` 전체 2회

### TC-283 · 음량(저장·실패) · 종류: 자동 · 요구: R-54 · 설계: §14.7.3 `commitVolume`·`volumeDraft`(`useSliderDraft` 재사용), §14.7.1 `commitVolume`(`clampVolume` → `saveTimer`), §14.8 슬라이더 렌더(`TIMER_ALARM_VOLUME_MAX`·`aria-valuetext`·`<output>`), §14.9 T-16 정상·**오류(실패 → 오류 줄, 초안 버림)** · 스펙: `test/AlarmSoundCard.test.tsx`(카드·가짜 시계) · `test/TimerTab.test.tsx`(`TC-283(탭)` 저장 인자 · `TC-283(탭 실패)`) · **신규(CR-050)** · 실패 분기 추가(v21 후속)
- Given 카드 `volume` 80 / 탭 `SETTINGS` / **탭 실패**: `SETTINGS`, `setSettings` 1회 reject `SAVE_ERR`(`settings.invalid`)
- When 초안 없이 pointerup · 80 change → pointerup · 40 change → pointerup → props 40 · 45 change → keyUp ArrowRight → 299ms → 1ms · 50 change → blur / 탭 40 change → pointerup / 탭 실패 40 change → pointerup
- Then ⓐ 슬라이더 `min 0`·`max 100`·`step 1`·값 80·`aria-valuetext 80%`·output `80%`, 끄는 동안 `40%`(valuetext·output) / 탭 실패: 끄는 동안 output `40%` → 실패 뒤 슬라이더 값 `80`·`aria-valuetext 80%`·output `80%`(저장값 복귀) ⓑ 같은 값 0회, 299ms 0회 → 300ms 1회, blur 즉시, 카드 `onError`·`playSound` 0회, 탭 `onError` `[[null]]` / 탭 실패 `onError` `[[{code:'settings.invalid', message}]]`(TC-257 관례 — 오류 줄은 SettingsApp), 초안 버림 ⓒ `onCommitVolume` `[[40],[45],[50]]` / 탭 `setSettings` 정확히 1회 `{...SETTINGS, timer:{...TF, alarmVolume:40}}`(정수), 끄는 동안 0회 / 탭 실패 `setSettings` 정확히 1회 `{...SETTINGS, timer:{...TF, alarmVolume:40}}`(재시도 없음)

### TC-284 · 미리보기 끝남 깜빡임·훅 소유 · 종류: 자동 · 요구: R-52 · 설계: §14.4 `TimerPreview` 개정(props `snapshot`·`receivedAt`, 내부 훅 삭제)·`useTimerSnapshot` 호출 위치 이동·`useElapsedText`·`isTimerBlinking`, §14.6 `blinking`·`snapshot`·`receivedAt`, §14.7.4, §14.3 `.blink`, §14.9 T-12, §14.11(aria-live 없음) · 스펙: `test/TimerPreview.test.tsx` · `test/TimerTab.test.tsx` · `test/SettingsApp.timer.test.tsx`(TC-247 구독 1개) · **신규(CR-050)**
- Given 미리보기 props `FINISHED`(`finished`·1500000·countdown·receivedAt 5678) → `stopped`·`running`·`paused`·`restPaused` → `FINISHED`, `useElapsedText` mock `'00:00:00'` / 탭 공용 훅 mock `cd('finished')` → `stopped`·`running`·`paused`
- When 렌더·재렌더
- Then ⓐ `finished`면 글자 div 클래스 `blink`·텍스트 `00:00:00`·cursor `grab` 유지·`aria-live` 없음, 그 밖 네 상태는 클래스 없음 ⓑ `useElapsedText` 마지막 인자 = `[FINISHED.snapshot, 5678]`(props), 미리보기는 `useTimerSnapshot` 0회 / 탭은 `useTimerSnapshot` 호출·`useElapsedText` 인자 = 탭 훅 반환값 ⓒ `onCommitPos`·`controlTimer`·`playSound` 0회(설정 창은 알람을 울리지 않는다 — R-52)

### TC-285 · 탭 레이아웃·포커스 순서 · 종류: 자동 · 요구: R-49, R-50, R-53 · 설계: §14.2 카드 순서, §14.8 렌더 1 ~ 4, §14.11 포커스 순서 · 스펙: `test/TimerTab.test.tsx` · **신규(CR-050)**
- Given ① `SETTINGS`·`getAlarmSound` null·`stopped` ② `S_CD`·`MP3`·`cd('running')`
- When 렌더
- Then ⓐ h2 `[뽀모도 타이머, 알림음, 시간 글자]` ⓑ 활성 조작 DOM 순서 ① `[스톱워치 사용, 타이머 사용, 시, 분, 초, 파일 등록, 미리 듣기, 음량, 회전, 크기, 글자 색]`(세 버튼·「기본값」 건너뜀) ② `[스톱워치 사용, 타이머 사용, 시작, 일시정지, 멈춤, 파일 등록, 미리 듣기, 기본값, 음량, 회전, 크기, 글자 색]`(잠긴 세 칸 건너뜀) ⓒ `getAlarmSound` 2회(마운트마다), `setSettings`·`controlTimer` 0회

### TC-286 · i18n 사전(CR-050) · 종류: 자동 · 요구: R-55 · 설계: i18n §4.10 표·주(`ERROR_CODES` 배치 확정)·§4.9 삭제·변경 표기, timer-tab §14.12 · 스펙: `test/i18n.test.ts` · **신규(CR-050)** · **개정(CR-054 — 기대 개수·목록은 「CR-054 개정 TC」 표가 대체)**
- Given ko·ja·en 사전, `ERROR_CODES`
- When 키·값 비교
- Then ⓐ 해당 없음(사전) ⓑ ko 새 22키 = §4.10 ko 열 정확(`timerStopwatchEnabled` 스톱워치 사용 ~ `alarmPreviewFailed`), `timerStopHint` = `멈춤을 누르면 처음 시간으로 돌아갑니다`, `errors['timer.disabled']` = `스톱워치나 타이머가 꺼져 있습니다. 먼저 둘 중 하나를 켜 주세요.`(옛 CR-045 문구 아님), `format(alarmCurrentCustom,{format:'MP3',size:305})` = `지금: 등록한 알림음 (MP3 · 305 KB)`, 세 사전 `timerEnabled`·`timerEnabledDesc` 없음·단순 키 집합 동일, `ERROR_CODES` 25·`timer.disabled` 뒤 `[sound.not_audio, sound.too_many_bytes, sound.io, unknown]`, ja·en 22키 비어 있지 않음·ko와 다름·`{format}`·`{size}`·`99:59:59`·`00:00:01` 유지, ja·en `timerStopHint`·`errors['timer.disabled'|'sound.*']` 비어 있지 않음·ko와 다름·옛 ja·en `timer.disabled` 문구 아님, `%`·`:` 키 없음 ⓒ 해당 없음

### TC-287 · ja·en 렌더(두 토글 외 새 문구) · 종류: 자동 · 요구: R-55 · 설계: §14.8 렌더(`useMessages`), §14.12, i18n §4.10 ja·en 열 · 스펙: `test/TimerTab.test.tsx` · **신규(CR-050)**
- Given 언어 ja / en × ① `SETTINGS`·파일 없음 ② `S_CD`·`cd('running')`·`MP3`
- When 렌더 → ①에서 `00:00:00` 입력 후 묶음 밖
- Then ⓐ 묶음 이름 `timerDuration`·칸 이름 `timerHoursAria`·`timerMinutesAria`·`timerSecondsAria`(값 `00`·`25`·`00`)·`timerDurationHint`·되돌림 안내 `timerDurationInvalid`, `alarmCardDesc`·`alarmCurrentDefault`·버튼 `[alarmImport, alarmPreview, alarmReset]`·`alarmFileHint` / ② 잠김 안내 `timerDurationLocked`·`format(alarmCurrentCustom,{format:'MP3',size:305})`, ko 문구(`지금: 기본 알림음`·`멈춤 상태에서…`) 없음 ⓑ 단위 `%`는 언어 무관(TC-268 `80%`) ⓒ `setSettings`·`controlTimer` 0회

#### CR-050 신규 TC-FLOW

### TC-FLOW-28 · S-27: 스톱워치가 켜진 채 「타이머 사용」을 켜면(스톱워치 저절로 꺼짐) 시작 시간을 00:10:00으로 바꿔 시작 → 흐르는 동안 잠김 → 멈춤으로 지정 시간 대기·풀림 → 끈다 · 종류: 자동 · 요구: R-49, R-50, R-51, R-55(M-50g 경유 — 자동 Step은 ko만, ja·en 문구는 수동 M-50g ①·⑤) · Steps: TC-247(열기 부분) → TC-271(전환 부분) + TC-270(표시 부분) → TC-274(저장 부분) → TC-253(시작 부분) + TC-276(잠김 부분) → TC-253(멈춤 부분) + TC-276(풀림 부분) → TC-271(끄기 부분) → M-50g · 스펙: `test/SettingsApp.timer.test.tsx` · **신규(CR-050)**
- 상태 전달: 각 저장 인자(S1 → S2 → S3)를 `settings://changed`로 되돌려 다음 Step의 Given, core 몫 `timer://changed`는 `cd(stopped, 0)`(모드 전환 → 대기) → `stopped` 600000 → `running` → `stopped`로 흉내
- Then ⓐ 스위치 `[true,false]` → `[false,true]`·글자 `00:25:00`·칸 `00:25:00` → 칸·글자 `00:10:00` → 시작 직후 `00:10:00`(올림 초)·세 칸 disabled·`멈춤 상태에서 바꿀 수 있습니다` → 멈춤 뒤 활성·빈 안내·`00:10:00` → 끈 뒤 `[false,false]`·세 버튼 disabled·칸 활성 ⓑ 오류 줄 없음 ⓒ `setSettings` = S1 `{...S_ON, timer:{...TF, enabled:true, mode:'countdown'}}` → S2 `{…countdownSecs:600}` → S3 `{…S2.timer, enabled:false}`(mode `countdown` 유지), `controlTimer` `[['start'],['stop']]`

### TC-FLOW-29 · S-28: 타이머가 0에 닿아 미리보기 글자가 깜빡이고, 바로 다음 회차를 시작했다가 다시 끝나자 멈춤으로 대기한다 · 종류: 자동+수동 · 요구: R-52, R-51 · Steps: TC-247(열기 부분) → TC-284(끝남 부분) + TC-276(finished 잠김 부분) → TC-253(시작 부분 — 새 회차) → TC-284(깜빡임 끝 부분) → TC-253(멈춤 부분) → M-50c · 스펙: `test/SettingsApp.timer.test.tsx` · **신규(CR-050)**
- Given `getSettings` → `S_CD`(1500초) · 상태 전달: `timer://changed` `cd(finished, 1500000)` → 「시작」 → `cd(running, 0)` → `cd(finished)` → 「멈춤」 → `cd(stopped, 0)`
- Then ⓐ `00:00:00`·클래스 `blink`·세 칸 disabled → `00:25:00`·깜빡임 없음 → 다시 `blink` → `00:25:00`·깜빡임 없음·칸 활성 ⓑ 10초 판정·새 회차는 core(화면은 받은 사진만 표시) ⓒ `controlTimer` `[['start'],['stop']]`, `setSettings`·`playSound` 0회(소리는 오버레이만)

### TC-FLOW-30 · S-29: 좋아하는 mp3를 등록해 미리 듣고 음량을 줄이고, 형식이 틀린 파일은 오류를 보고, 결국 기본값으로 되돌린다 · 종류: 자동+수동 · 요구: R-53, R-54, R-55 · Steps: TC-277(마운트 부분) → TC-278(등록 부분) → TC-281(미리 듣기 부분) → TC-283(음량 저장 부분) → TC-281(다시 누름·초안 음량 부분) → TC-279(실패 부분) → TC-280(기본값 부분) → M-50a · M-50e · 스펙: `test/SettingsApp.timer.test.tsx` · **신규(CR-050)**
- 상태 전달: 등록 응답 `MP3`가 미리 듣기 url의 Given, 음량 저장 인자 S1을 `settings://changed`로 되돌려 다음 미리 듣기 음량의 Given, 실패 뒤 상태 문구 `MP3`가 「기본값」 활성의 Given
- Then ⓐ `지금: 기본 알림음` → `지금: 등록한 알림음 (MP3 · 305 KB)` → output `40%` → 오류 줄 `오류: wav·mp3·ogg 소리 파일이 아닙니다.`·문구 `MP3` 그대로 → `지금: 기본 알림음`·오류 줄 없음·「기본값」 disabled ⓑ 재생마다 이전 정지(정지 함수 1·2번째 각 1회) ⓒ `pickAudioFile` `[['소리 파일 선택'],['소리 파일 선택']]`, `importAlarmSound` `[['C:/sounds/bell.mp3'],['C:/sounds/notes.txt']]`, `playSound` `[MP3.url, 0.8, fn]` → `[MP3.url, 0.4, fn]`, `setSettings` 정확히 1회 `{...SETTINGS, timer:{...TF, alarmVolume:40}}`, `removeAlarmSound` 1회, `controlTimer` 0회

#### CR-050 개정 TC (앞 본문을 대체 — 번호 유지)

| 개정 TC | 스펙 | Given / When 변화 | Then 새 기대 |
|---|---|---|---|
| TC-246 | `i18n.test.ts` | 불변 | ⓑ `EXPECTED_KO_TIMER` 17 → **15**(`timerEnabled`·`timerEnabledDesc` 삭제), `timerStopHint` 새 ko, `ERROR_CODES` 22 → **25**(나머지 단언 불변 — 새 문구 값은 TC-286) |
| TC-093 · TC-094 | 같음 | 불변 | ⓑ `EXPECTED_ERROR_CODES`에 `sound.*` 3개(`timer.disabled` 뒤), ko `errors` = 옛 + `timer.disabled` 새 문구 + `sound.*` 3개, 단순 키 109 → **129**(+22 −2) |
| TC-248 | `TimerTab.test.tsx` | `await flush()`(카드 조회) | ⓐ h2 3장 `[뽀모도 타이머, 알림음, 시간 글자]`, 두 스위치·설명(i18n §4.10), 시작 시간 `00:25:00`·힌트, 새 `timerStopHint`(옛 문구 없음), 알림음 카드 기본 문구·「기본값」 disabled·음량 80% ⓒ `getAlarmSound` 1회, 그 밖 0회. 포커스 순서 단언은 TC-285로 옮김 |
| TC-249 | 같음 | 스위치 → 「스톱워치 사용」 | ⓐ 두 스위치 false·`00:25:00`·80% ⓒ `{...OLD, timer:{...TF, enabled:true, mode:'stopwatch'}}`(= `{ ...DEFAULT_TIMER_SETTINGS, enabled:true, mode:'stopwatch' }`) — 216행 깨짐 해소 |
| TC-250 | 같음 | 「스톱워치 사용」 | ⓐ 대기 중 **두** 스위치 `aria-busy` ⓒ `{...SETTINGS, timer:{...TF, enabled:true, mode:'stopwatch'}}`, props `S_SW` 뒤 `[true,false]` |
| TC-251 | 같음 | 「스톱워치 사용」(끄기) | ⓒ `{...S_ON, timer:{...TF, enabled:false, mode:'stopwatch'}}`(mode 유지), 실패 뒤 `[true,false]` |
| TC-252 | 같음 | 스톱워치·타이머 × `stopped`·`running`·`paused`·`restPaused`·**`finished`**, `S_CD_OFF` 추가 | ⓐ 켜짐이면 두 모드·다섯 상태 모두 활성, 둘 다 꺼짐(꺼진 타이머 모드 포함) 비활성(R-51) |
| TC-253 · TC-254 | 같음 | 도우미 `sw()` → `swSw()` | 기대 불변 |
| TC-255 ~ TC-259 · TC-FLOW-26 | 같음 | 불변 | ⓒ 저장 인자 `timer` 바탕 `T` → **`TF`**(새 필드 3개 늘 포함) |
| TC-268 | 같음 | 불변 | ⓐ ja·en h2 3장, 스위치 `timerStopwatchEnabled`/`timerStopwatchDesc`·`timerCountdownEnabled`/`timerCountdownDesc`, 음량 `80%`, ko `스톱워치 사용`·`타이머 사용` 없음 |
| TC-260 ~ TC-265 | `TimerPreview.test.tsx` | 도우미 `view()`가 `snapshot`·`receivedAt` props 전달(기본 `SNAP`) | TC-261 ⓑ `useTimerSnapshot` **0회**(옛 「호출됨」 대체)·`useElapsedText` 인자 = props·paused 깜빡임 없음. 나머지 기대 불변 |
| TC-247 | `SettingsApp.timer.test.tsx` | 불변 | ⓐ h2 3장(ja 포함) ⓑ `onTimerChanged` 1회·`getTimer` 1회 **유지**(구독 = TimerTab 하나) ⓒ 열기 전 `getAlarmSound` 0회 → 연 뒤 1회 |
| TC-266 · TC-FLOW-27 | 같음 | 스위치 → 「스톱워치 사용」(옛 설정 켜짐 = 스톱워치) | 기대 불변 |
| TC-267 | 같음 | `DISABLED.message` = v0.23 새 원문 | 기대 형식 불변 |
| TC-FLOW-24 | 같음 | 「스톱워치 사용」 | ⓒ `setSettings` `[{…timer:{...TF, enabled:true, mode:'stopwatch'}}, {…timer:{...TF, enabled:false, mode:'stopwatch'}}]` |
| TC-101 | `SettingsApp.test.tsx` | mock에 알림음 래퍼 4개(일반 함수 — `getAlarmSound` → null) | ⓐ en 타이머 탭 h2 `[timerCardTitle, alarmCardTitle, timerTextTitle]` |

요구 ↔ TC (CR-050 범위, 앞 표와 겹치면 이 표 우선)

| 요구ID | 상태 | 자동 TC | TC-FLOW | 수동 |
|---|---|---|---|---|
| R-49 두 토글 | 유효 🔒 | TC-269, TC-270, TC-271, TC-272, TC-285, TC-249, TC-250, TC-251 | TC-FLOW-28, TC-FLOW-24(개정) | M-50g |
| R-50 시작 시간 | 유효 🔒 | TC-269, TC-273, TC-274, TC-275, TC-276, TC-285 | TC-FLOW-28 | M-50d, M-50g |
| R-51 두 모드 공통 버튼 | 유효 🔒 | TC-252(개정), TC-253, TC-254, TC-267, TC-286(`timerStopHint`) | TC-FLOW-28, TC-FLOW-29 | M-50g |
| R-52 끝남 깜빡임 | 유효 🔒 | TC-284 | TC-FLOW-29 | M-50c, M-50f |
| R-53 알림음 카드 | 유효 🔒 | TC-269, TC-277, TC-278, TC-279, TC-280, TC-281, TC-282, TC-285 | TC-FLOW-30 | M-50a, M-50b, M-50e, M-50f |
| R-54 음량 | 유효 🔒 | TC-269, TC-281, TC-283 | TC-FLOW-30 | M-50a |
| R-55 3개 국어 | 유효 🔒 | TC-273, TC-279, TC-286, TC-287, TC-268(개정), TC-246(개정) | TC-FLOW-28, TC-FLOW-30 | M-50e, M-50g |
| R-44 | 유효(「on/off 토글」 부분 → R-49) | TC-247, TC-248, TC-266 | TC-FLOW-24 | M-45a |
| R-43 · R-45 · R-48 | 유효(용어 주 CR-050 — 스톱워치 모드 값) | 앞 v19 표 그대로 + TC-252(개정) | TC-FLOW-24, TC-FLOW-27 | M-45b, M-45c |

설계 항목 ↔ TC (CR-050 범위 — timer-tab §14)

| 설계 항목 | TC |
|---|---|
| §14.1 대체 목록(10행) | 각 새 서술 행의 TC — 토글 2개 TC-270 · props·훅 이동 TC-284 · `fullTimer` TC-249 · `onToggleMode` TC-271 · 렌더 TC-248 · 포커스 TC-285 · 문구 삭제 TC-286 |
| §14.2 레이아웃(카드 3장·시작 시간 행 늘 보임·알림음 카드 늘 보임) | TC-248, TC-285, TC-273(스톱워치에서도 보임), M-50g(폭·줄바꿈) |
| §14.3 CSS `.hmsField`(disabled·`aria-invalid`)·`.msg`/`.msgError`·`.soundStatus`·`.blink` | TC-275(`msgError`·`aria-invalid`), TC-276(disabled), TC-277(`soundStatus` 클래스), TC-284(`blink` 클래스), M-50c(1초 주기 실물), M-50g(흐림·테두리·포커스 링) |
| §14.4 `TimerTab` 개정 · `ToggleSwitch` ×2 | TC-270, TC-271, TC-272, TC-285 · TC-270, TC-272 |
| §14.4 `CountdownTimeInput` | TC-273, TC-274, TC-275, TC-276 |
| §14.4 `AlarmSoundCard` | TC-277 ~ TC-283 |
| §14.4 `TimerPreview` 개정 · `useTimerSnapshot` 이동 · `useElapsedText`·`isTimerBlinking` | TC-284, TC-261(개정) · TC-284, TC-247(개정) · TC-284 |
| §14.4 `useSliderDraft`(음량 3번째 사용) · `defaultAlarmUrl`·`playSound` | TC-283 · TC-281, TC-282, TC-280 |
| §14.5 순수 함수 11개 | TC-269(+ 화면 경유 TC-270·TC-271·TC-273·TC-275·TC-276·TC-277·TC-283) |
| §14.6 `timer`·`stopwatchOn`/`countdownOn`·`enabledPending` | TC-249, TC-270 · TC-270 · TC-250, TC-272 |
| §14.6 `snapshot`/`receivedAt`(이동)·`durationLocked`·`blinking` | TC-284, TC-247 · TC-276 · TC-284 |
| §14.6 `draft`·`shownHms`·`invalid`·`saving` | TC-274 · TC-273 · TC-275 · TC-274 |
| §14.6 `sound`·`soundPending`·`previewFailed`·`stopRef`·`volumeDraft` · 미리 듣기 정지 조건 세 가지(탭 이동·언마운트·창 숨김) | TC-277 · TC-278, TC-280 · TC-281, TC-280(「기본값」 성공 때 지움) · TC-281, TC-282 · TC-281, TC-283 · TC-282 ①·② |
| §14.7.1 `saveTimer`(전체 timer·`Promise<boolean>`) · `onToggleMode` · `commitCountdownSecs` · `commitVolume` · `onControl`(버튼 식 불변) | TC-271, TC-274, TC-275, TC-283 · TC-271, TC-272 · TC-274, TC-275 · TC-283(정상·실패) · TC-252, TC-253 |
| §14.7.2 `onFieldChange` · `commit`(첫 줄 `locked` 가드 포함) · 저장값 동기 효과 · `onGroupBlur` · `onFieldKeyDown` · 잠금 정리 효과 · 검증 예(끝 행 focusOut 후 `locked` 재렌더 포함) | TC-274, TC-275 · TC-274, TC-275, TC-276(컴포넌트 가드·탭 잠긴 뒤 blur) · TC-273, TC-274 · TC-274 · TC-274 · TC-276 · TC-273 ~ TC-276 |
| §14.7.3 마운트 조회 · `stopPreview` · 언마운트 정지 · 창 숨김 정지 효과(구독·해제·`visible` 무동작, §14.11 접근성 영향 없음 = 카드 그대로) · `onImport` · `onPreview` · `onReset` · `commitVolume` · `statusText` · 버튼 비활성 | TC-277 · TC-280, TC-281 · TC-282 ① · TC-282 ②·③ · TC-278, TC-279 · TC-281 · TC-280 · TC-283 · TC-277 · TC-277, TC-278, TC-280 |
| §14.7.4 `TimerPreview` 개정분 | TC-284, TC-261 |
| §14.8 렌더(`TimerTab` 1 ~ 4·`CountdownTimeInput`·`AlarmSoundCard`(`.soundStatus` 상태 문구 포함)·`%`·`:` 리터럴) | TC-248, TC-285 · TC-273 · TC-277, TC-283 · TC-283(`80%`) |
| §14.9 T-8 · T-9 · T-10 · T-11 · T-12 · T-13 · T-14 · T-15 · T-16 · T-17 · 확인창 없음 | TC-271, TC-272, TC-FLOW-28 · TC-271, TC-251 · TC-274, TC-275 · TC-276 · TC-284, TC-FLOW-29 · TC-278, TC-279 · TC-281 · TC-280 · **TC-283(정상 = 카드·탭 / 오류 = 탭 실패 사례)** · **TC-282(① 탭 이동·언마운트 ② 창 숨김 ③ 구독 해제)** · TC-271, TC-280 |
| §14.10 `set_settings` · `control_timer` · `get_timer`/`timer://changed` · `get_alarm_sound` · `import_alarm_sound` · `remove_alarm_sound` · `pickAudioFile` · 상수 | TC-271, TC-274, TC-283 · TC-253, TC-FLOW-29 · TC-247, TC-FLOW-28 · TC-277 · TC-278, TC-279 · TC-280 · TC-278, TC-279 · TC-269, TC-283(`max 100`) |
| §14.11 접근성(포커스 순서·switch `aria-busy`·group/`aria-labelledby`·칸 `aria-label`·`inputMode`·`aria-invalid`·`aria-live`·`role=alert`·`aria-valuetext`·깜빡임 글자 aria-live 없음) | TC-285, TC-272, TC-273, TC-275, TC-277, TC-281, TC-283, TC-284, M-50g(낭독·키패드) |
| §14.12 문구 · i18n §4.10 · §4.9 삭제·변경 | TC-286, TC-287, TC-268, TC-246 |
| §14.13 파일 크기 | 해당 없음(정적 규칙 — 리뷰·ui-postprocessor 몫, 동작 TC 아님) |
| §14.14 수동 확인 예정 ① ~ ⑤ | M-50f · M-50a · M-50b · M-50c · M-50d (+ 파일 대화상자 필터 M-50e, 화면 실물 M-50g) |
| §14.15 공용화 후보 · 확인 필요 | 해당 없음(후보 목록 — `timerCardDesc` 현행 유지는 TC-248이 옛 문구 그대로 단언) |

사용자행 ↔ TC-FLOW (CR-050 범위): S-27 → TC-FLOW-28 · S-28 → TC-FLOW-29 · S-29 → TC-FLOW-30 · S-23(주: on/off = 「스톱워치 사용」) → TC-FLOW-24(개정). 그 밖 행은 앞 표 그대로.

CR ↔ TC: CR-050 → 신규 TC-269(`timerValues.test.ts`) · TC-273 ~ TC-276(`CountdownTimeInput.test.tsx` + `TimerTab.test.tsx`) · TC-277 ~ TC-283(`AlarmSoundCard.test.tsx` + 탭·통합 부분) · TC-270 ~ TC-272 · TC-285 · TC-287(`TimerTab.test.tsx`) · TC-284(`TimerPreview.test.tsx` + 탭) · TC-286(`i18n.test.ts`) · TC-FLOW-28 ~ TC-FLOW-30(`SettingsApp.timer.test.tsx`) / 개정 위 표 / 수동 M-50a ~ M-50g.

설계 확인 필요 (v21, 관리자 인계 — 문서 수정은 소유자)

- **Z-1. mock 경로 표기.** timer-tab §14.10 끝 「`vi.mock('bridge')`에 추가」와 달리 스펙은 기존 관례 `vi.mock('bridge/commands')`를 따랐다(X-3과 같은 결정, 래퍼 4개가 실제로 `commands.ts`에 있음 확인). 설계 문구만 맞추면 된다.
- **Z-2. `timerCardDesc` 불일치 유지.** §14.15 「현행 유지」대로 TC-248이 옛 문구(「0부터 올라가는 시간」)를 그대로 단언한다. 문구를 바꾸면 TC-248·TC-246(`EXPECTED_KO_TIMER`) 두 곳만 고친다.
- **Z-3. 스펙이 고정한 해석.** ① TC-274: 저장 성공(`true`) 뒤 props가 아직 옛 값이어도 입력값을 유지한다(§14.7.2 「draft를 건드리지 않는다」) ② TC-275: 저장 실패(`false`) 뒤에는 되돌림 안내(`timerDurationInvalid`)를 띄우지 않는다(설계는 `setDraft(null)`만 — 오류 줄은 `saveTimer`) ③ TC-276: `isDurationLocked`에서 `restPaused`는 잠기지 않는다(식의 세 상태 밖 — 카운트다운은 쉬는중에도 흐르므로 실제로 오지 않는 값) ④ TC-281: 등록 **성공** 때만 재생 정지·실패 문구 지움(취소·실패 때는 재생 유지 — §14.7.3 `onImport` 순서 그대로) ⑤ TC-279(통합): 대화상자 제목은 누른 순간의 언어 사전 값. 다르게 의도했다면 알려 달라.
- **Z-4. 수동 M-17·M-18(Y-1)·CR-044 W-4 미처리.** 이번 위임 범위 밖 — 그대로 남는다.

### CR-052 개정 (v22 — 카드 1 설명문 삭제·스톱워치 설명 새 문장·시작 시간 회색 비활성·미리 듣기 1회 유지, 대기열 Q-04 정식 TC 전환)

- **기준**: 확정사항 CR-048 블록 「수정 (CR-052)」 🔒 · `design/timer-tab.md` §14.16(§14.2·§14.4·§14.6·§14.15 해당 서술 대체)·§14.2 · `design/i18n.md` `timerCardDesc` 삭제 행·`timerStopwatchDesc`·`alarmCardDesc` CR-052 변경 행 · CR 대장 CR-052 · Q-04 · 소스 `CountdownTimeInput.tsx`·`TimerTab.tsx`·`AlarmSoundCard.tsx`. 옛 ja·en 문구 대조 = 패킷 `doc/200_설계/architecture/timer-mode-03-packet-ui.md` §5 표. **Z-2 닫음**(`timerCardDesc` 삭제).
- mock·픽스처: 앞 「CR-050 개정」 공통 규약 그대로(`TimerTab.cr052.test.tsx`는 `TimerTab.test.tsx`의 mock 복사 — `TimerTab.test.tsx`가 400줄을 넘어 새 파일). 시간 의존 없음.

#### CR-052 신규 TC

### TC-288 · 시작 시간 — 타이머 모드 아님 회색 비활성(`inactive`) · 종류: 자동 · 요구: R-50 · 설계: timer-tab §14.16 `CountdownTimeInput.inactive` 행(`off = locked ∥ inactive`·`.durationOff`·안내 줄 빈 값·입력 중 값·되돌림 안내 버림·`commit` 첫 줄 가드 `off`), §14.7.2 잠금 정리 효과 · 스펙: `test/CountdownTimeInput.test.tsx` · **신규(CR-052)**
- Given 컴포넌트 `secs` 1500·`locked` false·`inactive` 생략(대조 기준: `locked` true일 때 행 className)
- When ① 생략 상태 ② 시 `01` 입력 중 `inactive` true → `secs` 3723 ③ `inactive` false ④ 분 `60` → 묶음 blur(되돌림 안내) → `inactive` true → false ⑤ `inactive` true에서 합성 입력 시 `05` → blur → Enter → 분 `60` → blur
- Then ⓐ ① 세 칸 활성·`aria-disabled` 없음·group `aria-disabled` 없음·행 `durationOff` 없음 ② 세 칸 disabled·`aria-disabled="true"`, group `aria-disabled="true"`, 행 className = locked 때와 같음(`durationOff`), 라벨 「시작 시간」·힌트 「최대 99:59:59」 보임, 안내 줄 `''`·`msgError` 아님 ③ 활성 복귀·빈 안내 ④ 비활성 되는 순간 안내 `''`·`aria-invalid` 없음, 다시 활성에도 `''` ⑤ 안내 `''`·`aria-invalid` 없음 ⓑ ② 입력 중 값 버림 → 칸 `00:25:00`(저장값), `secs` 3723 → `01:02:03`(비활성 중에도 저장값을 따라감) ③ `01:02:03` ⓒ `onCommit` 전 과정 0회(가드가 없으면 ⑤에서 `onCommit(18123)`)

### TC-289 · CR-052 문구 — `timerCardDesc` 삭제·스톱워치 설명 한 곳·ja·en 새 문구 · 종류: 자동 · 요구: R-44, R-49, R-53, R-55 · 설계: §14.16 카드 1 설명문·알림음 카드 설명 행, i18n `timerCardDesc` 삭제·`timerStopwatchDesc`·`alarmCardDesc` CR-052 변경 행 · 스펙: `test/TimerTab.cr052.test.tsx` · **신규(CR-052)**
- Given ko·ja·en 사전, 탭 `SETTINGS`(둘 다 꺼짐)·`POMO`, 언어별 `MessagesProvider`, 옛 문구 표(패킷 §5 — 스톱워치 설명·「한 번 울립니다」 알림음 설명)
- When 사전 조회 → ko·ja·en 차례로 탭 렌더
- Then ⓐ 언어마다 `timerStopwatchDesc` 문장이 화면에 정확히 1번, 그 요소가 `#timer-stopwatch-desc` 안, 「스톱워치 사용」(언어별) 스위치의 접근 가능한 설명 = 그 문장, 옛 스위치 설명·옛 알림음 설명 텍스트 없음, `alarmCardDesc` 보임 ⓑ 세 사전 모두 `timerCardDesc` 키 없음, ko `timerStopwatchDesc` = 확정 문장, ja·en `timerStopwatchDesc`·`alarmCardDesc`는 비어 있지 않고 옛 문구·ko와 다름 ⓒ `setSettings`·`controlTimer`·`playSound` 0회, `getAlarmSound` 3회(마운트마다 1회)

### TC-290 · 미리 듣기 1회 재생 유지(`loop` 인자 없음) · 종류: 자동 · 요구: R-53, R-54 · 설계: §14.16 미리 듣기 행(`playSound(url, v, onFail)`, `loop` 생략), §14.7.3 `onPreview`, overlay `design/functions.md` §5.7 ④(`loop = false` 기본 — 인용) · 스펙: `test/TimerTab.cr052.test.tsx` · **신규(CR-052)**
- Given 탭 `S_CD`(`alarmVolume` 80), ① `getAlarmSound` → `null`·`defaultAlarmUrl` → `'blob:default'` ② → `MP3`, `playSound` → 호출마다 새 정지 함수
- When ① 「미리 듣기」 1회 → 언마운트 ② 다시 마운트 → 「미리 듣기」 2회
- Then ⓐ `role=alert`(재생 실패 문구) 없음 ⓑ ② 두 번째 누름 때 앞 정지 함수 1회·새 정지 함수 0회(소리가 쌓이지 않음) ⓒ `playSound` 인자 정확히 3개(4번째 `loop` 없음 = 1회 재생): ① `('blob:default', 0.8, 함수)` ② `(MP3.url, 0.8, 함수)` ×2, `setSettings`·`controlTimer` 0회

#### CR-052 개정 TC (앞 본문을 대체 — 번호 유지, 스펙 개정 완료)

| TC | 스펙 | 처리(CR-052) |
|---|---|---|
| TC-094 | `i18n.test.ts` | 단순 키 수 − 1(옛 129, `timerCardDesc` 삭제) |
| TC-246 | `i18n.test.ts` | CR-045 15키 기대: `timerCardDesc` 부재, 같은 문장 = `timerStopwatchDesc` |
| TC-286 | `i18n.test.ts` | ko `timerStopwatchDesc` 새 문장(옛 「00:00:00부터 올라갑니다…」 대체)·`alarmCardDesc` 반복 재생 문구(옛 「한 번 울립니다」 대체) |
| TC-248 | `TimerTab.test.tsx` | 카드 머리 설명 없음(문장 1번 = 스톱워치 스위치 설명), 둘 다 꺼짐 → 세 칸 disabled·`aria-disabled`·안내 빈 값, 알림음 설명 반복 문구 |
| TC-268 | `TimerTab.test.tsx` | ja·en 카드 설명 단언 → `timerStopwatchDesc` 1번·스위치 설명 |
| TC-274 · TC-275 | `TimerTab.test.tsx` | 픽스처 → `S_CD`(타이머 켜짐·stopped — 입력 가능한 유일한 경우) |
| TC-276 | `TimerTab.test.tsx` | 사례 7 → 8(스톱워치 `stopped` 추가), 타이머 모드 아님 4사례 = 비활성·안내 빈 값 — 본문 Then 개정 |
| TC-277 | `AlarmSoundCard.test.tsx` | `alarmCardDesc` 반복 재생 문구 |
| TC-285 | `TimerTab.test.tsx` | 포커스 순서: 끔·스톱워치 켜짐 → 시·분·초 건너뜀, 타이머 켜짐·stopped만 포함(마운트 사례 +2, 조회 4회) |
| TC-287 | `TimerTab.test.tsx` | ja·en 렌더 픽스처 = 타이머 켜짐(둘 다 꺼짐이면 칸 disabled) |
| TC-FLOW-28 | `SettingsApp.timer.test.tsx` | 끄기 단계: 세 칸 옛 `[false,false,false]` → disabled·안내 빈 값 |

추적(CR-052)

| 요구ID | TC |
|---|---|
| R-50 | 신규 TC-288 · 개정 TC-276(탭)·TC-248·TC-274·TC-275·TC-285·TC-FLOW-28 |
| R-44 · R-49 | 신규 TC-289 · 개정 TC-248·TC-246·TC-268 |
| R-53 | 신규 TC-289(`alarmCardDesc`)·TC-290 · 개정 TC-277·TC-286 |
| R-54 | 신규 TC-290 |
| R-55 | 신규 TC-289 · 개정 TC-268·TC-287·TC-286·TC-094 |

| 설계 항목(§14.16) | TC |
|---|---|
| 카드 1 설명문 삭제(`timerCardDesc`) | TC-289, TC-248, TC-246, TC-094, TC-268 |
| 알림음 카드 설명(`alarmCardDesc` 반복 문구) | TC-289, TC-277, TC-286 |
| `CountdownTimeInput.inactive`(`off`·`.durationOff`·안내 빈 값·버림·가드) | TC-288, TC-276(탭) |
| 파생 상태 `durationInactive`(= `!countdownOn`) | TC-276(탭), TC-248, TC-285, TC-FLOW-28 |
| 미리 듣기 변경 없음(`loop` 생략 1회) | TC-290 |
| 간격(`.group`·카드 간격)·시작 시간 행(`.hms` 상자·`.durationMsg`)·버튼·값(`.btn`·`.value`) — CSS 다듬기 | **미커버(설계 확인 필요 Z-5)** — 시각 규칙이라 이번 패스 자동 단언 없음, settings `manual-checklist.md` 항목 추가 필요(이번 위임 범위 밖) |

사용자행 ↔ TC-FLOW(CR-052): S-27 → TC-FLOW-28(개정 — 끄기 단계 비활성). 새 사용자행 없음. CR ↔ TC: CR-052 → 신규 TC-288 ~ TC-290 · 개정 위 표 · 대기열 Q-04 전환.

- 수: 자동 287 → **290**(유효 282 · 폐기 8) · TC-FLOW 30(유효 29 · 폐기 1) · 수동 48.
- 실행(보강 모드): `yarn test --run src/settings/test/CountdownTimeInput.test.tsx src/settings/test/TimerTab.cr052.test.tsx` · 회귀(개정 스펙): `src/settings/test/{i18n.test.ts,TimerTab.test.tsx,AlarmSoundCard.test.tsx,SettingsApp.timer.test.tsx}`.

### CR-053 개정 (v23 — 배포용 기본 세트 3차: 뒷머리·뽀모도 인물 = 복원 칸 + 「비우기」, 「타자 입력 1」 = 비우기 칸·셋째 버튼 제거, 기본 7장, 타이머 기본 글자 위치 (142,458)·회전 9°, 대기열 Q-05 정식 TC 전환)

- **기준**: 확정사항 CR-053 줄 🔒 · `design/images-tab.md` §15(§15.1 값 표·검증 예, §15.2 렌더·파이프라인·접근성 — §12 전체·§13.1·§13.2·§14 해당 문장을 대체) · `design/timer-tab.md` §3 상수 행 · contract v0.24 `DEFAULT_ASSET_SLOTS` **7개**(순서 `kb_up`·`background`·`hair`·`pomo_char`·`mouse_base`·`pen_up`·`pen_down_0` — `kb_down_0` 제외)·`DEFAULT_TIMER_SETTINGS`(`textPos` (142,458)·`rotation` 9, 나머지 `enabled` false·`fontSize` 36·`color` `#333333`·`mode` stopwatch·`countdownSecs` 1500·`alarmVolume` 80 불변) · CR 대장 CR-053 · Q-05. 새 command·event·에러 코드·문구 키 없음.
- mock·픽스처: 각 스펙의 기존 규약 그대로(bridge mock `importOriginal` — `hasBuiltinDefault`·`isRequiredSlot`·`DEFAULT_ASSET_SLOTS`·`toBridgeError`는 실물). 기대값은 리터럴(bridge 상수와 독립 대조). `TimerTab.test.tsx` 공용 픽스처 `T`·`TF`는 옛 값 그대로 두고 TC-249만 기본값 리터럴로 덮어쓴다. 시간 의존 없음(deferred promise + `act`·`waitFor` 조건).
- 대기열 Q-05·Q-06 상태는 이 패스에서 바꾸지 않는다(관리자 지시 — 검증 뒤 관리자가 마킹).

#### CR-053 신규 TC

### TC-291 · 뽀모도 인물 「비우기」(I-11) · 종류: 자동 · 요구: R-42, R-35 · 설계: images-tab §15.2 뒷머리·뽀모도 인물 카드 행(「비우기」 = 비우기 확인창 `{name}` = 카드 제목 → `removeAsset(slot)` 1회·`restoreDefaultAsset` 0회, 등록돼 있을 때만 활성, 응답 뒤 포커스 = 같은 카드 「이미지 변경」 `focusAfter`)·접근성(`emptyImageAria`), §15.1 `EMPTYABLE_SLOT_KEYS` `['hair','pomo_char']`, §11.2 셋째 버튼 양식 · 스펙: `test/PomoCards.test.tsx` · **신규(CR-053)**
- Given 매니페스트 `BOTH`(`kb_up`·`mouse_base`·`pomo_char`·`pomo_bubble` 등록, 캔버스 900×700), ko. `removeAsset` 1회차 = 지연(deferred, 해소값 `BUBBLE_ONLY`), 2회차 = 거부 `CHAR_IO`(`asset.io`, message 「뽀모도 인물 파일을 지우지 못했습니다. (테스트)」)
- When ① 「뽀모도 인물 그림 비우기」 → 「취소」 ② 다시 → Esc ③ 다시 → 「지우기」 → 응답 해소 → `BUBBLE_ONLY`로 재렌더(`assets://changed` 흉내) ④ 언마운트 뒤 `BOTH` 새로 렌더 → 「비우기」 → 「지우기」(거부)
- Then ⓐ ①② 확인창 `alertdialog`·`aria-modal="true"`·이름 「그림 지우기」·설명 「‘뽀모도 인물’ 그림을 지울까요? 되돌릴 수 없습니다.」·단추 글자 `['지우기','취소']`(「지우기」 className `danger`)·처음 포커스 「취소」, 닫히면 확인창 없음·포커스 = 누른 「비우기」 ③ 확인창 닫힘, 진행 중 카드 버튼 전부 disabled, 응답 뒤 포커스 = 「뽀모도 인물 이미지 변경」, 수신 전 인물 `img` src `asset://pomo_char.png` 그대로 → 수신 뒤 인물 `img` 없음·「등록된 그림 없음」·「비우기」 disabled·「기본값」(「뽀모도 인물 기본 그림으로 되돌리기」) enabled·포커스 「이미지 변경」 유지·말풍선 `img` `asset://pomo_bubble.png` 그대로·`role=alert` 없음 ④ 인물 카드 안 `role=alert` 텍스트 = `CHAR_IO.message`, 인물 `img` 그대로, 「비우기」 다시 enabled, 포커스 「이미지 변경」, 말풍선 카드 alert 없음 ⓑ 상위 `onError` 0회(오류는 카드 오류 띠만), 성공 뒤 인물 카드 = 빈 복원 칸(`canEmpty` false·`canReset` true) ⓒ `removeAsset` ①② 0회 → ③ `[['pomo_char']]` → ④ 누적 `[['pomo_char'],['pomo_char']]`; `restoreDefaultAsset`·`importAsset`·`setSettings` 0회

### TC-292 · 뽀모도 인물 「기본값」 = 내장 기본 복원(I-3R) · 종류: 자동 · 요구: R-42, R-32 · 설계: images-tab §15.2 「기본값」 행(복원 확인창 → `restoreDefaultAsset(slot)` 1회, 빈 칸이어도 활성), §15.1 `resetKind`(`pomo_char`) `restore`(`hasBuiltinDefault` 판정), i18n `restoreImageAria`·`confirmRestoreOk`·`errors['asset.no_default']` · 스펙: `test/PomoCards.test.tsx` · **신규(CR-053)**
- Given 매니페스트 `NO_POMO`(인물·말풍선 미등록), `restoreDefaultAsset` 1회차 = 지연(해소값 `CHAR_DEF` — `pomo_char` url `asset://pomo_char.png?v=d`), 2·3회차 = 거부 `NO_DEFAULT`(`asset.no_default`), ①~③ ko · ④ en
- When ① 「뽀모도 인물 기본 그림으로 되돌리기」 → 「취소」 ② 다시 → 「기본 그림으로」 → 응답 해소 → `CHAR_DEF`로 재렌더 ③ 언마운트 뒤 `NO_POMO`(ko) → 「기본값」 → 「기본 그림으로」(거부) ④ 언마운트 뒤 `NO_POMO`(en) → en `restoreImageAria`(`{name}` = en `slots.pomo_char.title`) 버튼 → en `confirmRestoreOk`(거부)
- Then ⓐ 빈 칸에서도 「기본값」 enabled·글자 「기본값」; 확인창 이름 「기본 그림으로 되돌리기」·설명 「‘뽀모도 인물’ 칸을 내장 기본 그림으로 되돌릴까요? 지금 그림은 지워지며 되돌릴 수 없습니다.」·단추 `['기본 그림으로','취소']`(「기본 그림으로」 `danger`)·처음 포커스 「취소」, 취소 뒤 포커스 = 누른 「기본값」 ② 확인창 닫힘, 진행 중 카드 버튼 전부 disabled, 응답 뒤 포커스 = 누른 「기본값」, 수신 전 인물 `img` 없음 → 수신 뒤 `img` src `asset://pomo_char.png?v=d`·「비우기」 enabled·「기본값」 enabled, 확인창(펜 첫 등록 확인창 포함)·`role=alert` 없음 ③ 인물 카드 `role=alert` = `NO_DEFAULT.message`, 인물 `img` 없음 그대로, 포커스 「기본값」 ④ 인물 카드 `role=alert` = en `errors['asset.no_default']`(code 문구) ⓑ 상위 `onError` 0회(카드 오류 띠만), 성공 뒤 인물 카드 = 등록된 복원 칸(「비우기」 활성) ⓒ `restoreDefaultAsset` ① 0회 → 누적 `[['pomo_char'],['pomo_char'],['pomo_char']]`; `removeAsset`·`importAsset`·`setSettings`(`ensurePenPos` 저장 포함) 0회

#### CR-053 개정 TC (앞 본문을 대체 — 번호 유지, 스펙 개정 완료)

| TC | 스펙 | 처리(CR-053) |
|---|---|---|
| TC-193 | `Hair.test.tsx` | 뒷머리 카드 버튼 3개(이미지 변경·기본값·비우기), 「기본값」 = 복원 칸이라 빈 칸도 활성, 「비우기」는 빈 칸이면 비활성, 등록되면 미리보기·「비우기」 활성 |
| TC-196 | `Hair.test.tsx` | 「비우기」 → 비우기 확인창(`{name}` = 뒷머리)·취소·Esc 호출 없음 → 「지우기」 → `removeAsset('hair')` 1회·`restoreDefaultAsset` 0회, 응답 뒤 포커스 「이미지 변경」, 수신 뒤 빈 칸·「비우기」 비활성·「기본값」(복원) 활성(옛 「기본값」 → 비우기 대체) |
| TC-200 | `Hair.test.tsx` | slotCard — `EMPTYABLE_SLOT_KEYS` = `[hair, pomo_char]`, hair `resetKind` restore·`canReset` 늘 true·`emptyable` true·`canEmpty` = 등록, `kb_down_0` 대상 아님 |
| TC-201 | `Hair.test.tsx` | 뒷머리 카드 버튼 3개(이미지 변경 → 기본값 → 비우기)·두 줄(`cardEmptyable`·`actions2`), 셋째 버튼은 뒷머리·뽀모도 인물 카드뿐 |
| TC-202 | `Hair.test.tsx` | 미등록 → 「기본값」(복원) 활성·「비우기」 비활성(눌러도 확인창 없음), 등록 → 둘 다 활성, 다른 카드 `slotBusy` → 둘 다 비활성·확인창 없음 |
| TC-206 | `Hair.test.tsx` | 「비우기」 실패 → 뒷머리 카드 오류 띠(ko = core message, en = 사전 code 문구), 그림 그대로·「비우기」 다시 활성·포커스 「이미지 변경」 |
| TC-207 | `Hair.test.tsx` | ja·en 버튼 3개 글자·`restoreImageAria`·`emptyImageAria`·복원/비우기 확인창 문구, 취소 뒤 누른 버튼으로 포커스 |
| TC-FLOW-18 | `Hair.test.tsx` | S-17: 넣기 → 카드 확인 → 미리보기 맨 아래 → 「비우기」로 없애면 미리보기에서도 사라짐 |
| TC-133 | `imageSlots.test.ts` | 복원 칸(hair·pomo_char 포함)은 늘 `canReset`, 비우기 칸(`kb_down_0` 포함)만 마지막 장 규칙 |
| TC-135 | `imageSlots.test.ts` | 여러 장 — `kb_down_0`(가운데 장)은 비우기 칸이라 잠김 |
| TC-177 | `imageSlots.test.ts` | slotCard 검증 예 4건(§3·§15.1) — 복원 칸 늘 활성, 비우기 칸(`kb_down_0` 포함) 옛 규칙, `resetKind` = `hasBuiltinDefault` |
| TC-178 | `imageSlots.test.ts` | `exportResult` 픽스처를 7장 목록에 연동(판정 규칙 불변) |
| TC-192 | `imageSlots.test.ts` | 배경 그룹 hair = 복원 칸·「비우기」 칸(`canReset` 늘 true·`emptyable` true·`canEmpty` = 등록) |
| TC-229 | `imageSlots.test.ts` | `kb_down_0` required false(빈·단일·가운데 장), 칸 종류 = 비우기 칸, 필수 카드 2장 |
| TC-232 | `imageSlots.test.ts` | `EMPTYABLE_SLOT_KEYS` = `[hair, pomo_char]`(§15.1 검증 예), `kb_down_0` 대상 아님(검증 예 4행 `canReset`·`lastOnlyBlocked`) |
| TC-142 | `ImagesTab.test.tsx` | 비우기 칸만 옛 규칙(`kb_down_0`·`kb_down_1` 가운데 장 비활성·툴팁), 복원 칸 빈 칸(background·hair) 활성·툴팁 없음 |
| TC-147 | `ImagesTab.test.tsx` | 필수 칸 「기본값」은 복원만, `kb_down_0` 가운데 장은 비우기 칸이라 잠김 |
| TC-179 | `ImagesTab.test.tsx` | 빈 복원 칸 대상 = background·hair(옛 「가운데 장 `kb_down_0`」 대체) — 각 `restoreDefaultAsset` 1회·`removeAsset` 0회 |
| TC-182 | `ImagesTab.test.tsx` | 다운로드 설명 **7장**(`n` = `DEFAULT_ASSET_SLOTS.length`) |
| TC-189 | `ImagesTab.test.tsx` | ja·en 다운로드 설명 7장 |
| TC-233 | `ImagesTab.test.tsx` | 「타자 입력 1」 버튼 2개(셋째 없음), 「기본값」 aria 「타자 입력 1 그림 지우기」, 뒤 장 없으면 활성·`kb_down_1` 등록이면 비활성·툴팁·빈 칸 비활성, 화면의 「그림 비우기」 = 뒷머리·뽀모도 인물 |
| TC-234 | `ImagesTab.test.tsx` | 두 줄 양식 = 뒷머리·뽀모도 인물 카드(등록·빈 칸), 「타자 입력 1」·다른 키보드 카드 한 줄 |
| TC-235 | `ImagesTab.test.tsx` | 「타자 입력 1」 「기본값」 → 비우기 확인창(`{name}` = 타자 입력 1)·취소·Esc 호출 없음·포커스 누른 「기본값」 |
| TC-236 | `ImagesTab.test.tsx` | 「기본값」 → 「지우기」 → `removeAsset({kind:'kb_down',index:0})` 1회·`restoreDefaultAsset` 0회, 응답 뒤 포커스 누른 「기본값」, 수신 뒤 빈 칸·「기본값」 비활성 |
| TC-237 | `ImagesTab.test.tsx` | 「기본값」 비우기 실패 → 카드 오류 띠, 「기본값」 다시 활성·포커스 누른 「기본값」 |
| TC-FLOW-15 | `ImagesTab.test.tsx` | S-14: 첫 실행 7장(hair·pomo_char 포함, `kb_down_0` 없음), 7칸 「기본값」 복원 활성·빈 칸 13개 비활성, 뒷머리·뽀모도 인물 「비우기」 활성 |
| TC-FLOW-17 | `ImagesTab.test.tsx` | S-16: 같은 이름 파일 7개 → 덮어쓰기 확인 → 완료 |
| TC-FLOW-22 | `ImagesTab.test.tsx` | S-21: 첫 실행(타자 그림 없음) 필수 배지 2장·「타자 입력 1」 선택 배지·빈 칸 |
| TC-FLOW-23 | `ImagesTab.test.tsx` | S-22: 「타자 입력 1」 「기본값」(비우기) 잠김 → 타자 입력 2 비움 → 「기본값」으로 비움 → 「이미지 변경」으로 다시 |
| TC-241 | `PomoCards.test.tsx` | `pomo_char` = 복원 칸(`canReset` 늘 true)·「비우기」 칸(`canEmpty` = 등록), `pomo_bubble` 비우기 칸 불변 |
| TC-242 | `PomoCards.test.tsx` | 인물 버튼 3개(「기본값」 복원 활성·「비우기」 비활성·두 줄), 말풍선 버튼 2개(「기본값」 = 지우기 비활성) |
| TC-FLOW-25 | `PomoCards.test.tsx` | S-24: 두 장 넣기 → 인물은 「비우기」로 없앰(Step 4 = TC-291 확정 부분) |
| TC-239 | `timerValues.test.ts` | `clampRotation(NaN)`·`clampRotation(Infinity)` → **9**(옛 5), 제목 「기본값 9·36」 |
| TC-269 | `timerValues.test.ts` | 픽스처 `DEF` `textPos` {142,458}·`rotation` 9 — `fullTimer(undefined)` 기대가 이 값 |
| TC-249 | `TimerTab.test.tsx` | ⓐ 회전 `'9'`, 글자 `left`/`top` `'142px'`/`'458px'` ⓒ 저장 인자 `{ ...OLD, timer: { ...TF, textPos: { x: 142, y: 458 }, rotation: 9, enabled: true, mode: 'stopwatch' } }` |

TC-244(말풍선 「기본값」 = 비우기)·TC-203 ~ TC-205는 본문 불변(회귀).

추적(CR-053)

| 요구ID | TC |
|---|---|
| R-42 | 신규 TC-291·TC-292 · 개정 TC-241·TC-242·TC-FLOW-25 |
| R-35 | 신규 TC-291 · 개정 TC-196·TC-200·TC-201·TC-202·TC-206·TC-207·TC-FLOW-18 · 회귀 TC-203 ~ TC-205 |
| R-32 | 신규 TC-292 · 개정 TC-179 |
| R-41 | 개정 TC-233 ~ TC-237 · TC-FLOW-23 |
| R-36 · R-33 | 개정 TC-182·TC-189·TC-FLOW-15·TC-FLOW-17 |
| R-46 | 개정 TC-239·TC-249·TC-269 |
| 그 밖 | 개정 TC-133·TC-135·TC-177·TC-178·TC-192·TC-229·TC-232·TC-142·TC-147·TC-193·TC-FLOW-22는 원 TC 본문의 요구ID 그대로(판정 규칙만 §15.1로 바뀜) |

| 설계 항목(images-tab §15 · timer-tab §3) | TC |
|---|---|
| §15.1 `EMPTYABLE_SLOT_KEYS` = `['hair','pomo_char']` | TC-232, TC-200, TC-192, TC-241 |
| §15.1 `resetKind` hair·pomo_char = `restore` | TC-133, TC-177, TC-192, TC-241, TC-142, TC-179 |
| §15.1 `resetKind` kb_down_0 = `clear`(마지막 장 규칙·`lastOnlyBlocked`) | TC-133, TC-135, TC-177, TC-229, TC-232, TC-142, TC-147 |
| §15.1 `canEmpty` 식·`buildSlotGroups` 순서 불변 | TC-232, TC-200, TC-241 |
| §15.2 뒷머리·뽀모도 인물 카드 버튼 3개·두 줄 양식 | TC-193, TC-201, TC-234, TC-242 |
| §15.2 「기본값」 = 복원(I-3R, 빈 칸 활성) | TC-202, TC-179, TC-292 |
| §15.2 「비우기」(I-11, 등록 시만 활성, `focusAfter`) | TC-196, TC-202, TC-206, TC-291 |
| §15.2 「타자 입력 1」 버튼 2개·「기본값」 = 비우기(I-3) | TC-233, TC-235, TC-236, TC-237 |
| §15.2 첫 실행 7칸·`kb_down_0` 빈 칸 | TC-FLOW-15, TC-FLOW-22 |
| §15.2 다운로드 설명 n = 7 | TC-182, TC-189, TC-FLOW-17 |
| §15.2 접근성 `emptyImageAria` 사용처 = 뒷머리·뽀모도 인물 | TC-207, TC-233, TC-291 |
| timer-tab §3 상수 `DEFAULT_TIMER_SETTINGS` (142,458)·9 | TC-239, TC-249, TC-269 |

사용자행 ↔ TC-FLOW(CR-053): S-14 → TC-FLOW-15 · S-16 → TC-FLOW-17 · S-17 → TC-FLOW-18 · S-21 → TC-FLOW-22 · S-22 → TC-FLOW-23 · S-24 → TC-FLOW-25(모두 개정). 새 사용자행·새 TC-FLOW 없음. CR ↔ TC: CR-053 → 신규 TC-291·TC-292 · 개정 위 표 · 대기열 Q-05(상태 불변). 수동: `manual-checklist.md` v16 — M-29·M-30·M-33·M-43·M-45f 개정.

- 수: 자동 290 → **292**(유효 284 · 폐기 8) · TC-FLOW 30(유효 29 · 폐기 1) · 수동 48.
- 실행(보강 모드): `yarn test --run src/settings/test/PomoCards.test.tsx src/settings/test/Hair.test.tsx src/settings/test/imageSlots.test.ts src/settings/test/ImagesTab.test.tsx src/settings/test/timerValues.test.ts src/settings/test/TimerTab.test.tsx`.

#### CR-054 개정 (v24 — 「기본 설정」 탭 전체 초기화 카드, R-56 🔒 베타 전용)

- 기준: requirements R-56 · 사용자행 S-30 / design.md §4 컴포넌트 표 `ResetAllCard`·§6 confirm 표·RTM R-56 / `design/general-tab.md` §1(cardReset)·§2·§4-6·§5 G-8·§6·§7(§7.1 ~ §7.8) / `design/i18n.md` §4.11(단순 키 8)·§4.6 CR-054 주(errors 2, `ERROR_CODES` 27) / contract **v0.25** §5.10 `reset_app_data`·§4 순서 비의존 주석·§6 / 수용 기준 `doc/200_설계/architecture/data-reset-03-packet-ui.md` §5(단 에러 code 수는 계약 §6 **26** 우선 — 패킷의 24 아님).
- 스펙: `test/ResetAllCard.test.tsx`(**신규** — TC-293 ~ TC-304(TC-304는 v25 보정), TC-FLOW-31 · TC-FLOW-32). 구현 전(ResetAllCard.tsx·i18n 8키·errors 2개 없음) Red가 정상.
- 스펙 안 픽스처: `CUSTOM`(배율 1.5·유휴 120초·잠금 켬·작업표시줄 켬·자동 실행 켬·언어 ko·mouse null) · `RESET`(= CUSTOM에서 배율 1·유휴 300초·잠금 끔·작업표시줄 끔·overlay (100,100) — 언어·자동 실행 보존. core 스냅숏 흉내, ui는 계산하지 않음) · `CUSTOM_MANIFEST`(background·kb_up·mouse_base·idle·rest, url `?v=c`) · `DEFAULT_MANIFEST`(실물 상수 `DEFAULT_ASSET_SLOTS` 7장, url `asset://{slotKey}.png?v=d`). 표시값 `CUSTOM_VALUES` = 배율 `150`·유휴 `2`·스위치(잠금·작업표시줄·자동 실행) `[true,true,true]`·언어 `ko` / `RESET_VALUES` = `100`·`5`·`[false,false,true]`·`ko`.
- 시간: 가짜 시계 없음(§7.2 타이머·자동 해제 없음 — 지연은 수동 해소 promise로만).
- 수동(앱 실행)은 `manual-checklist.md` M-54a ~ M-54f, **D-7(개발 PC 앱 데이터 백업 확인) 뒤에만**.

### TC-293 · 카드 렌더 — 탭 맨 아래·제목·버튼·설명·상태 줄 · 종류: 자동 · 요구: R-56, R-19 · 설계: general-tab §1 cardReset, §2 `ResetAllCard`, §4-6(section 마지막 자식), §7.2 초기값(`dialogOpen` false·`phase` idle), §7.4 `.dangerButton`(클래스 적용 — 시각은 M-54f), §7.5 렌더 1 ~ 4, §7.8 버튼 이름·네이티브 `<button>`(Enter·Space로 연다), i18n §4.11 ko · 스펙: `test/ResetAllCard.test.tsx` · **신규(CR-054)** · 보정(v25 — `<button>` 원소 단언)
- Given `<GeneralTab settings={CUSTOM} onError/>`(Provider 없음 = ko), bridge mock 미설정
- When 렌더만
- Then ⓐ 탭 h2 = `['언어 / Language','크기 · 반응','창','작업표시줄 · 시작','초기화']`, 「초기화」 region = 탭 section의 마지막 자식, 카드 안 버튼 1개 「전체 초기화」(원소 `BUTTON` — 네이티브 버튼이라 Enter·Space 활성화의 구조적 근거. jsdom `fireEvent`는 키 → click 기본 동작을 재현하지 않고 `@testing-library/user-event`는 미설치라 실제 Enter·Space 열림은 M-54f 수동·접근 이름 = 보이는 글자·`aria-label` 없음·`type=button`·enabled·`aria-busy` 없음·class `dangerButton`), 설명 `<p>` = 「등록한 그림·알림음과 모든 설정을 처음 설치한 상태(기본 그림)로 되돌립니다. 언어와 자동 실행 설정은 그대로 둡니다.」 정확, 상태 줄 `<p role=status aria-live=polite>` 빈 문자열, `alertdialog` 없음, 탭 전체 `p[role=status]` 2개 ⓑ `dialogOpen` false · `phase` idle(상태 줄 빈 문자열로 판정), `onError` 0회 ⓒ `resetAppData`·`setSettings`·`setAutostart`·`resetOverlayPosition`·`importAsset`·`removeAsset`·`restoreDefaultAsset` 0회

### TC-294 · 확인창 열기 — 문구·첫 포커스 취소 · 종류: 자동 · 요구: R-56 · 설계: §7.3 `onOpenDialog`, §7.5 렌더 5(`ConfirmDialog` props·`tone` 생략 = danger), §7.8 확인창, §5 G-8 정상, design.md §6 confirm 표, i18n §4.11 `confirmResetAll*`·기존 `confirmCancel` · 스펙: `test/ResetAllCard.test.tsx` · **신규(CR-054)**
- Given `<ResetAllCard onError/>`(ko), phase idle
- When 「전체 초기화」 클릭 → 확인창에서 Tab 2회
- Then ⓐ `alertdialog` 이름 「전체 초기화」·설명 = 「등록한 그림·알림음과 설정을 지우고 처음 설치한 상태로 되돌릴까요? 언어와 자동 실행 설정은 그대로이고, 오버레이는 기본 위치로 돌아갑니다. 되돌릴 수 없습니다.」 정확·`aria-modal=true`·카드 section 안, 버튼 `['초기화','취소']`, 「초기화」 class `danger`, 첫 포커스 「취소」 → Tab 「초기화」 → Tab 「취소」 ⓑ `dialogOpen` true, `phase` idle(상태 줄 빈 문자열), 「전체 초기화」 enabled ⓒ `resetAppData` 0회, `onError` 0회

### TC-295 · 취소·Esc — 호출 0회 · 종류: 자동 · 요구: R-56 · 설계: §7.3 `onCancel`, §5 G-8 오류열(취소·Esc), `ConfirmDialog` Esc = `onCancel` · 스펙: `test/ResetAllCard.test.tsx` · **신규(CR-054)**
- Given 같은 카드(ko)
- When ① 열기 → 「취소」 ② 열기 → 확인창에서 Esc
- Then ⓐ 두 경우 모두 확인창 사라짐, 상태 줄 빈 문자열, 버튼 enabled·`aria-busy` 없음 ⓑ `dialogOpen` false, `phase` idle 불변, `onError` 0회 ⓒ `resetAppData` 0회

### TC-296 · 확인 → 성공 · 종류: 자동 · 요구: R-56 · 설계: §7.3 `onConfirm` ① ~ ⑤, §7.2 전이 idle → pending → done, §7.5 렌더 2(`disabled`·`aria-busy`)·4(`statusText`), §7.6 첫 문단(재조회·새 구독 없음), §7.7 `reset_app_data` 행, G-8 정상 · 스펙: `test/ResetAllCard.test.tsx` · **신규(CR-054)**
- Given `resetAppData` = 수동 해소 promise
- When 열기 → 「초기화」 → (해결 전 관찰) → resolve
- Then ⓐ 해결 전: 확인창 닫힘, 버튼 disabled + `aria-busy="true"`, 상태 줄 「초기화하는 중입니다…」 / 해결 뒤: 상태 줄 「초기화했습니다.」, 버튼 enabled·`aria-busy` 속성 없음 ⓑ `phase` pending → done, `onError` 해결 전 0회 → 해결 뒤 정확히 1회 `null` ⓒ `resetAppData` 정확히 1회·인자 `[]`(없음); `getSettings`·`getAssetManifest`·`onSettingsChanged`·`onAssetsChanged`·`onHandAnchorChanged`·`onTimerChanged`·쓰기 command 0회(보정 v25 — 구독 함수 두 개 추가. 스펙의 `onTimerChanged` mock은 `vi.fn` + `beforeEach` 구현 재설정 `async () => () => {}`로 바꿔 기존 테스트 동작 불변)

### TC-297 · 확인 → 실패 · 종류: 자동 · 요구: R-56 · 설계: §7.3 `onConfirm` 예외(`toBridgeError`·밖으로 던지지 않음), §7.2 pending → idle, §7.7 발생 code 4종, G-8 오류 · 스펙: `test/ResetAllCard.test.tsx`(`it.each` 4 + `TC-297(Error 객체)`) · **신규(CR-054)**
- Given `resetAppData` 수동 해소. 사례 1 ~ 4 reject `{ code, message: 'x' }`(code = `reset.io`·`reset.seed`·`settings.io`·`state.poisoned`), 사례 5 reject `new Error('boom')`
- When 열기 → 「초기화」 → reject
- Then ⓐ 상태 줄 pending → 빈 문자열, 버튼 enabled·`aria-busy` 없음, 확인창 없음 ⓑ `phase` idle, `onError` 정확히 1회 = `{ code, message: 'x' }`(사례 5 = `{ code: 'unknown', message: 'boom' }`), 거부가 테스트 밖으로 새지 않음 ⓒ `resetAppData` 1회. 오류 줄 표시는 SettingsApp 몫 — TC-303 · TC-FLOW-32

### TC-298 · 중복 클릭·재진입·phase 전이 · 종류: 자동 · 요구: R-56 · 설계: §7.3 `onOpenDialog` 가드, §7.5 `disabled`, §7.2 전이·「열기·취소는 phase 불변, done 문구는 다음 확인까지」, §7 머리 「pending 중 조작 차단 = 초기화 버튼 재진입 차단만」 · 스펙: `test/ResetAllCard.test.tsx` · **신규(CR-054)**
- Given `resetAppData` 1회차 지연 d1, 2회차 지연 d2
- When 열기 → 「초기화」 → pending 중 「전체 초기화」 2회 클릭 → d1 resolve → 열기 → 「취소」 → 열기 → 「초기화」 → d2 reject `{code:'reset.io',message:'x'}`
- Then ⓐ pending 중 클릭: 확인창 안 열림 / done에서 열기: 확인창 열림·상태 줄 「초기화했습니다.」 유지 / 취소 뒤 done 유지 / 재확인: 「초기화하는 중입니다…」 / reject 뒤 빈 문자열 ⓑ `phase` idle → pending → done → (done) → pending → idle, `onError` 호출 목록 `[[null], [{code:'reset.io',message:'x'}]]` ⓒ `resetAppData` pending 중 1회 불변 → 총 2회, 호출 인자 `[[], []]`

### TC-299 · 포커스 복귀 · 종류: 자동 · 요구: R-56 · 설계: §7.3 `onCancel`(`buttonRef.focus`)·(효과) 포커스 복귀·`focusAfterRef`, §7.8 포커스 복귀, general-tab §6 · 스펙: `test/ResetAllCard.test.tsx` · **신규(CR-054)**
- Given 1회차 d1(성공), 2회차 d2(reject `reset.seed`)
- When ① 열기 → 「취소」 ② 열기 → Esc ③ 열기 → 「초기화」 → resolve ④ 열기 → 「초기화」 → reject
- Then ⓐ ①② 즉시 포커스 「전체 초기화」 ③④ pending 동안 포커스는 「전체 초기화」가 아님(비활성) → 해결 뒤 「전체 초기화」 ⓑ `phase` ③ done ④ idle, `focusAfterRef` 소모(해결 1회당 복귀 1회) ⓒ `resetAppData` 총 2회

### TC-300 · ja·en 렌더·언어 교체 뒤 done 문구 · 종류: 자동 · 요구: R-56, R-20 · 설계: §7.5(`useMessages`), §7.6 「언어가 바뀌면 done 문구도 새 언어」, i18n §4.11 ja·en 열(검수 필요 — 사전 값을 import해 비교) · 스펙: `test/ResetAllCard.test.tsx`(`it.each` ja→en · en→ja) · **신규(CR-054)**
- Given `MessagesProvider language=ja`(사례 2: en), `resetAppData` 수동 해소
- When 렌더 → 열기 → 확인 → resolve → Provider 언어를 다른 쪽으로 rerender
- Then ⓐ region 이름 `dict.cardReset`, 버튼 `dict.resetAll` enabled, 설명 `dict.resetAllDesc`, 상태 줄 빈 문자열 → 확인창 이름 `dict.confirmResetAllTitle`·설명 `dict.confirmResetAllMessage`·버튼 `[dict.confirmResetAllOk, dict.confirmCancel]` → 상태 줄 `dict.resetAllPending` → `dict.resetAllDone` → rerender 뒤 `next.resetAllDone`(region 이름 `next.cardReset`) ⓑ `phase` done이 언어 교체 뒤에도 유지, `onError(null)` ⓒ `resetAppData` 1회

### TC-301 · i18n 사전(CR-054) · 종류: 자동 · 요구: R-56, R-20 · 설계: i18n §4.11(8키·`confirmCancel` 재사용), §4.6 CR-054 주(ko 열·`ERROR_CODES` 위치 `sound.io` 뒤·`unknown` 앞), contract v0.25 §6 · 스펙: `test/ResetAllCard.test.tsx` · **신규(CR-054)**
- Given ko·ja·en 사전, `ERROR_CODES`
- When 조회
- Then ⓐ (화면에 보일 문구) ko 8키 = i18n §4.11 ko 열 정확(`cardReset` 초기화 · `resetAll` 전체 초기화 · `resetAllDesc` · `confirmResetAllTitle` · `confirmResetAllMessage` · `confirmResetAllOk` 초기화 · `resetAllPending` · `resetAllDone`), `confirmResetAllMessage`에 ko 「되돌릴 수 없습니다」·ja 「元に戻せません」·en 「cannot be undone」, ja·en 8키 문자열·비어 있지 않음·ko와 다름 ⓑ 세 사전 `confirmResetAll*` 키 3개뿐(취소 새 키 없음, `confirmCancel` = 「취소」), `errors['reset.io']` = 「데이터를 모두 초기화하지 못했습니다(일부만 초기화됐을 수 있습니다). 앱을 다음에 시작할 때 다시 시도합니다.」·`errors['reset.seed']` = 「기본 그림을 다시 채우지 못했습니다. 앱을 다음에 시작할 때 다시 시도합니다.」 정확, ja·en 두 code 비어 있지 않음·ko와 다름, 세 사전 errors 키 집합 = `ERROR_CODES` ⓒ bridge 호출 없음(순수 모듈). 계약 대조: `ERROR_CODES` 27 = `unknown` 뺀 26(계약 §6) + `unknown`, `sound.io` 이후 = `['sound.io','reset.io','reset.seed','unknown']`. 목록 1:1은 개정 TC-093(`EXPECTED_ERROR_CODES` 27)

### TC-302 · SettingsApp — 낙관적 갱신 없음·재조회·새 구독 없음 · 종류: 자동 · 요구: R-56 · 설계: §7.6 전체(구독으로만·`assets://changed`는 설정 값 불변·탭 유지), general-tab 머리 「저장 방식」, §7.7 이벤트 행, contract §4 · 스펙: `test/ResetAllCard.test.tsx` · **신규(CR-054)**
- Given SettingsApp 마운트(`getSettings` = CUSTOM, `getAssetManifest` = CUSTOM_MANIFEST, 구독 콜백 포착), `resetAppData` 수동 해소
- When 「전체 초기화」 → 「초기화」 → resolve → `assets://changed`(DEFAULT_MANIFEST)만 emit
- Then ⓐ pending·done 동안 그리고 assets 이벤트 뒤에도 기본 설정 표시값 = `CUSTOM_VALUES`, 상태 줄 pending → done, h1 `['기본 설정']`·「기본 설정」 탭 `aria-selected=true`, 오류 줄 없음 ⓑ `settings` = CUSTOM(이벤트 전 불변) ⓒ `resetAppData` 1회·인자 `[]`, `getSettings`·`getAssetManifest` 각 1회(마운트만), `onSettingsChanged`·`onAssetsChanged` 호출 수 = 마운트 직후 값(새 구독 없음), 쓰기 command 0회

### TC-303 · SettingsApp — 실패 오류 줄·실패 앞뒤 이벤트 반영(응답·이벤트 순서 비의존) · 종류: 자동 · 요구: R-56, R-20 · 설계: §7.7 실패 시 표시(`errorText` — ko = core message, ja·en = 사전 문구, `settings.io` 알려진 한계), §7.6 둘째 문단(부분 실패 두 번째 `settings://changed`)·「command 응답과 두 이벤트의 도착 순서에도 의존하지 않는다」(계약 §5.10 — 이벤트 2·3·6단계가 반환 전에 나감, pending 중 값이 먼저 바뀌어도 `disabled`·pending 문구는 응답까지 유지), G-8 오류열(실패해도 이벤트), i18n §4.6 CR-054 · 스펙: `test/ResetAllCard.test.tsx`(`TC-303(en · reset.seed)` · `TC-303(ko · settings.io · 응답 → 이벤트 …)` · `TC-303(ko · settings.io · 이벤트 → 응답 — 계약 §5.10 순서)`) · **신규(CR-054)** · 보정(v25 — 사례 ③ 추가, ② 전제 명시)
- Given ① 언어 en 설정으로 마운트, reject `{code:'reset.seed', message: core 원문}` ② ko 마운트, reject `{code:'settings.io', message:'설정 파일을 읽거나 쓸 수 없습니다: 거부'}` — **전제: 응답이 이벤트를 앞지른 경우(응답 → 이벤트)** ③ ②와 같은 마운트·같은 reject — **계약 §5.10 순서(이벤트 → 응답)**. 스냅숏 내용(RESET)은 core 몫이고 ui는 받은 값을 그대로 그리는지만 본다(CUSTOM과 구분되는 스냅숏을 쓴다 — 계약 실패 표의 실제 값 재현이 아님)
- When ①② 확인까지 → reject → (②만) `settings://changed`(RESET) → 두 번째 `settings://changed`(`{...RESET, idleSeconds: 600}`) ③ 확인까지 → (pending 중) `settings://changed`(RESET) → `assets://changed`(DEFAULT_MANIFEST) → reject
- Then ⓐ ① 오류 줄 = `${en.errorPrefix} ${en.errors['reset.seed']}`, 상태 줄 빈 문자열, 「Reset all」 enabled ② 오류 줄 = `${ko.errorPrefix} 설정 파일을 읽거나 쓸 수 없습니다: 거부`(부분 초기화·재시도 안내 없음 — 알려진 한계), 상태 줄 빈 문자열, 표시값 CUSTOM_VALUES → RESET_VALUES → 유휴 `10` ③ pending 중: settings 수신 즉시 표시값 RESET_VALUES, assets 뒤에도 RESET_VALUES, 그 동안 버튼 disabled·`aria-busy="true"`·상태 줄 「초기화하는 중입니다…」 유지·오류 줄 없음 → reject 뒤: 오류 줄 = ②와 같은 문구, 표시값 RESET_VALUES 그대로(실패 응답이 받은 값을 되돌리지 않음), 상태 줄 빈 문자열, 버튼 enabled·`aria-busy` 없음, 포커스 「전체 초기화」 ⓑ `settings` = 마지막 수신 스냅숏(③ = RESET), `phase` ③ pending → idle ⓒ `resetAppData` 1회, `getSettings` 1회(③은 `getAssetManifest`도 1회), 구독 수 불변, `setSettings` 0회(③은 쓰기 command 전부 0회)

### TC-304 · SettingsApp — pending 중 탭 이동(카드 언마운트) → 결과는 창 공통 오류 줄, 돌아오면 카드 초기값 · 종류: 자동 · 요구: R-56 · 설계: general-tab §7.2 **(규범, 판정 대상)** 「탭을 옮기면 `GeneralTab`과 함께 언마운트 → 다시 돌아오면 초기값(`dialogOpen` false·`phase` idle, 보존 안 함)」·「pending 중 언마운트돼도 `onError`는 부모(`SettingsApp`) 것 — 실패는 창 공통 오류 줄에 반드시 표시」, §7.7 실패 시 표시 · 스펙: `test/ResetAllCard.test.tsx`(`it.each` — `TC-304(reject)` · `TC-304(resolve)`) · **신규(CR-054 보정 v25)**
- Given SettingsApp 마운트(CUSTOM, ko), `resetAppData` 수동 해소
- When 「전체 초기화」 → 「초기화」 → (pending) 「이미지 설정」 탭 클릭 → 사례 1 reject `{code:'reset.io', message:'앱 데이터를 초기화하지 못했습니다. 다음에 앱을 시작할 때 다시 시도합니다.'}` / 사례 2 resolve → 「기본 설정」 탭 클릭
- Then ⓐ 탭 이동 직후: 「이미지 설정」 `aria-selected=true`, 「초기화」 region 없음 → 응답 뒤: 사례 1 창 공통 오류 줄 = `${ko.errorPrefix} 앱 데이터를 초기화하지 못했습니다. 다음에 앱을 시작할 때 다시 시도합니다.` / 사례 2 오류 줄 없음, 두 사례 모두 탭은 「이미지 설정」 그대로·h1 `['이미지 설정']` → 복귀 뒤: 「기본 설정」 `aria-selected=true`, 상태 줄 빈 문자열(pending·done 문구 없음), 「전체 초기화」 enabled·`aria-busy` 없음, 확인창 없음 ⓑ SettingsApp `error` = 사례 1 `{code:'reset.io', message: core 원문}` / 사례 2 null, 다시 마운트된 카드 `dialogOpen` false·`phase` idle ⓒ `resetAppData` 정확히 1회(응답·복귀 뒤에도 불변), `getSettings` 1회, 쓰기 command 0회
- 복귀 뒤 오류 줄이 남는지·사라지는지는 판정하지 않는다(설계에 규칙 없음). 언마운트 뒤 포커스 복귀도 대상이 없어 판정하지 않는다.

### TC-FLOW-31 · S-30 정상: 엉킨 설정을 처음 설치한 상태로 한 번에 되돌린다 · 종류: 자동 · 요구: R-56 · Steps(사례별 — 순서는 아래 사례 bullet이 정한다): 사례 A·B = TC-293(렌더 부분) → TC-294(열기·첫 포커스 부분) → TC-296(확인·해결 부분) → TC-299 ③(해결 뒤 포커스 부분) → TC-302(구독으로만 갱신 부분) / 사례 C = TC-293(렌더 부분) → TC-294(열기·첫 포커스 부분) → TC-296(확인·pending 부분) → TC-303 ③(pending 중 이벤트 부분) → TC-296(해결 부분) → TC-299 ③(해결 뒤 포커스 부분) → TC-302(구독으로만 갱신 부분) · **신규(CR-054)** · 보정(v25 — 사례 C 계약 순서 추가, A·B 전제 명시) · 서술 정리(v25 — Steps를 사례별로 분리, 판정 불변)
- 상태 전달(공통 앞부분): CUSTOM 마운트 → 카드가 탭 맨 아래·상태 줄 빈 문자열·값 CUSTOM_VALUES → 열기(포커스 「취소」) → 「초기화」 → 버튼 disabled·`aria-busy="true"`·「초기화하는 중입니다…」.
- 사례 A(응답 → settings → assets — **전제: 응답이 이벤트를 앞지른 경우**): resolve → 「초기화했습니다.」·버튼 enabled·포커스 「전체 초기화」·값 CUSTOM_VALUES 그대로(낙관적 갱신 없음) → settings 수신 즉시 RESET_VALUES → assets 뒤에도 RESET_VALUES.
- 사례 B(응답 → assets → settings — 같은 전제): resolve → (A와 같은 done·포커스·CUSTOM_VALUES) → assets 뒤에도 CUSTOM_VALUES → settings 수신 즉시 RESET_VALUES.
- 사례 C(settings → assets → 응답 — **계약 §5.10 순서**, 이벤트 2·3단계가 반환 전에 나감): pending 중 settings 수신 즉시 RESET_VALUES → assets 뒤에도 RESET_VALUES, 그 동안 버튼 disabled·`aria-busy="true"`·상태 줄 「초기화하는 중입니다…」 유지 → resolve → 「초기화했습니다.」·버튼 enabled·`aria-busy` 없음·포커스 「전체 초기화」.
- 최종 화면(세 사례 동일): RESET_VALUES(배율 100·유휴 5·잠금 끔·작업표시줄 끔·자동 실행 켬 보존·언어 ko 보존), 상태 줄 「초기화했습니다.」, h1 「기본 설정」 → 이미지 설정 탭: region 안 `img` src에 기본 7장 url 전부, 옛 `?v=c` url 0개.
- 기대(통합): ⓐ 위 화면 ⓑ 상태 done 유지, 오류 줄 없음(`role=alert` 0개로 판정 — SettingsApp의 `onError`는 mock이 아님) ⓒ `resetAppData` 1회, 쓰기 command 0회. 실물(오버레이 기본 그림·기본 위치, 재시작 뒤 재초기화 없음)은 M-54c · M-54d.
- 스펙: `test/ResetAllCard.test.tsx` `it.each(FLOW31_CASES)('TC-FLOW-31($label): …')` — `$label` = 위 A·B·C.

### TC-FLOW-32 · S-30 실패: 초기화가 실패하면 오류 줄 안내를 보고, 화면은 실제 남은 상태를 보인다 · 종류: 자동 · 요구: R-56 · Steps(사례별 — 순서는 아래 사례 bullet이 정한다): 사례 1 = TC-293(렌더 부분) → TC-294(본문 부분) → TC-297(확인·`reset.io` reject 부분) → TC-299 ④(실패 뒤 포커스 부분) → TC-303 ②(실패 뒤 이벤트 부분) / 사례 2 = TC-293(렌더 부분) → TC-294(본문 부분) → TC-297(확인·pending 부분) → TC-303 ③(pending 중 이벤트 부분) → TC-297(`reset.io` reject 부분) → TC-299 ④(실패 뒤 포커스 부분) · **신규(CR-054)** · 보정(v25 — 사례 2 계약 순서 추가, 사례 1 전제 명시) · 서술 정리(v25 — Steps를 사례별로 분리, 판정 불변)
- 상태 전달(공통 앞부분): CUSTOM → 열기(본문 「…되돌릴 수 없습니다.」) → 「초기화」 → pending(버튼 disabled·`aria-busy="true"`·「초기화하는 중입니다…」).
- 사례 1(응답 → assets → settings — **전제: 응답이 이벤트를 앞지른 경우**): reject `{code:'reset.io', message:'앱 데이터를 초기화하지 못했습니다. 다음에 앱을 시작할 때 다시 시도합니다.'}`(core 원문) → 오류 줄 `${ko.errorPrefix} 앱 데이터를…`·상태 줄 빈 문자열·버튼 enabled·`aria-busy` 없음·포커스 「전체 초기화」·값 CUSTOM_VALUES 그대로 → assets(DEFAULT_MANIFEST) 뒤에도 CUSTOM_VALUES → settings(RESET) → RESET_VALUES.
- 사례 2(settings → assets → 응답 — **계약 §5.10 순서**, 실패 표 ⑤ 표식 기록 실패와 같은 모양: 초기화 뒤 값이 먼저 오고 `reset.io`): pending 중 settings → RESET_VALUES, assets 뒤에도 RESET_VALUES, pending 유지 → reject → 오류 줄(사례 1과 같은 문구) + RESET_VALUES 그대로, 상태 줄 빈 문자열, 버튼 enabled·`aria-busy` 없음, 포커스 「전체 초기화」.
- 최종(두 사례 동일): RESET_VALUES → 이미지 탭 기본 7장.
- 기대(통합): ⓐ 위 화면 ⓑ `phase` idle, `settings` = RESET ⓒ `resetAppData` 1회, `getSettings`·`getAssetManifest` 각 1회, 쓰기 command 0회.
- 스펙: `test/ResetAllCard.test.tsx` `it.each([...])('TC-FLOW-32($label): …')` — 사례 1·2.

#### CR-054 개정 TC (**앞 본문을 대체** — 아래 TC의 원 본문(TC 목록 앞쪽)과 이 표가 다르면 이 표의 처리가 우선한다. 원 본문 머리에 「개정(CR-054)」 표기. 기존 개수·목록 단언 — 번호 유지, 이 패스에서 스펙 개정 완료)

| TC | 스펙 | 처리(CR-054) |
|---|---|---|
| TC-093 | `i18n.test.ts` | `EXPECTED_ERROR_CODES`에 `'reset.io'`·`'reset.seed'`(`'sound.io'` 뒤·`'unknown'` 앞) → 27개, 제목 「27개 = 계약 26 + unknown」 |
| TC-094 | `i18n.test.ts` | `ko.errors` 정확 비교에 `reset.io`·`reset.seed` ko 추가, 단순 키 **128 → 136**, 제목 「오류 27개」 |
| TC-246 | `i18n.test.ts` | `ERROR_CODES` 길이 **25 → 27**, 제목 |
| TC-286 | `i18n.test.ts` | `ERROR_CODES` 길이 25 → 27, `timer.disabled` 이후 슬라이스 `[…, 'sound.io', 'reset.io', 'reset.seed', 'unknown']`, 제목 |
| TC-104 | `GeneralTab.test.tsx` | 카드 h2 4장 → **5장**(끝 「초기화」), 제목 |
| TC-130 | `GeneralTab.test.tsx` | 포커스 순서 끝에 「전체 초기화」, `p[role=status]` 2개(둘 다 `aria-live=polite`·빈 내용) |
| TC-099 | `SettingsApp.test.tsx` | 기본 설정 탭 버튼 `['위치 초기화']` → `['위치 초기화','전체 초기화']` |
| TC-101 | `SettingsApp.test.tsx` | en h2 목록 끝에 `en.cardReset` |
| (mock) | `GeneralTab.test.tsx` · `SettingsApp.test.tsx` · `ResetAllCard.test.tsx` | `vi.mock('bridge/commands')` 목록에 `resetAppData: vi.fn()` |
| (mock 잔여 — Q-07 닫힘) | `Hair` · `MousePartsTab` · `AlarmSoundCard` · `ImagesTab` · `PenMode` · `PomoCards` · `DragHit` · `TimerTab` · `TimerTab.cr052` · `SettingsApp.retry` · `SettingsApp.timer` (`*.test.tsx`) | **불필요 확정(v25)** — 11개 모두 `vi.mock('bridge/commands', async importOriginal => ({ ...actual, … }))` 형태(명시 목록이 아니라 실물 모듈 전개)라 mock 모듈에 실물 `resetAppData` export가 이미 있다(누락 export 오류 없음). 11개 모두 「전체 초기화」를 누르지 않아 호출이 없고 결과 불변 — 한 줄 추가는 결과·판정을 바꾸지 않으므로 넣지 않는다. `resetAppData: vi.fn()` 명시는 호출 수를 단언하거나 확인 흐름을 도는 스펙(`ResetAllCard`·`GeneralTab`·`SettingsApp`)에만 둔다. `SettingsApp.retry`·`SettingsApp.timer`는 기본 탭을 렌더하지만 기본 탭 h2·버튼 개수 단언이 없다(Grep 확인 — `SettingsApp.timer`의 h2 단언은 타이머 탭). 이후 이 11개 중 하나가 「전체 초기화」를 누르게 되면 그 스펙에 `resetAppData: vi.fn()`을 넣는다 |
| (events mock) | `ResetAllCard.test.tsx` | 보정(v25) — `onTimerChanged`를 일반 함수 → `vi.fn()`, `beforeEach`에서 `mockImplementation(async () => () => {})` 재설정(`resetAllMocks` 뒤에도 이전과 같은 반환). TC-296 0회 단언용 |

새 이벤트 구독·`events` mock 목록 추가는 없다(새 이벤트 없음 — §7.6). v25의 `ResetAllCard.test.tsx` `onTimerChanged` 일반 함수 → `vi.fn()` 전환(위 「events mock」 행)은 TC-296 0회 단언용이며 mock 목록·반환 동작은 그대로다.

추적(CR-054)

| 요구ID | TC |
|---|---|
| R-56 | 신규 TC-293 ~ TC-304 · TC-FLOW-31 · TC-FLOW-32 · 개정 TC-104 · TC-130 · TC-099 · TC-101 · 수동 M-54a ~ M-54f |
| R-20 | 신규 TC-300 · TC-301 · TC-303(en) · 개정 TC-093 · TC-094 · TC-246 · TC-286 · TC-101 · 수동 M-54e |
| R-19 | 신규 TC-293(카드 양식 — `SettingsCard action=`) · 개정 TC-104 · TC-099 |

| 설계 항목(general-tab §1 · §2 · §4-6 · §5 · §6 · §7 / i18n §4.11 · §4.6) | TC |
|---|---|
| §1 cardReset 레이아웃(탭 맨 아래·머리 버튼·설명·상태 줄 항상 렌더) | TC-293, TC-104, TC-FLOW-31 / 시각 M-54b |
| §2 `ResetAllCard` props `onError` · `ConfirmDialog` 재사용 | TC-293, TC-294, TC-296, TC-297 |
| §4-6 `GeneralTab` 마지막 자식 연결 | TC-293, TC-104, TC-130, TC-099 |
| §5 G-8 정상 / 오류(취소·Esc·reject 4 code) | TC-296, TC-FLOW-31 / TC-295, TC-297, TC-303, TC-FLOW-32 |
| §5 파괴 조작 confirm(design.md §6 confirm 표) | TC-294, TC-295, M-54b |
| §6 포커스 순서(마지막 「전체 초기화」)·상태 알림 | TC-130, TC-293 / 실물 M-54f |
| §7 머리 「하지 않는 것」·재진입 차단만 | TC-298, TC-302(새 구독·재조회 없음) |
| §7.1 파일(신규 `ResetAllCard.tsx`·GeneralTab 1줄·css·i18n 4파일) | TC-293(import), TC-104, TC-301 |
| §7.2 상태 `dialogOpen`·`phase`·`buttonRef`·`focusAfterRef`·`statusText`·전이 | TC-293, TC-294, TC-296, TC-297, TC-298, TC-299 |
| §7.2 언마운트 **규범**(탭 이동 → 복귀 시 초기값, pending 중 언마운트돼도 실패는 창 공통 오류 줄) | TC-304(reject · resolve) — 보정 v25(앞 표기 「판정 안 함」 폐기) |
| §7.3 `onOpenDialog` · `onCancel` · `onConfirm` · (효과) 포커스 복귀 | TC-294, TC-298 · TC-295, TC-299 · TC-296, TC-297, TC-298 · TC-299 |
| §7.4 `.dangerButton`(클래스) / 색·disabled·focus-visible | TC-293 / M-54f |
| §7.5 렌더 1 ~ 5 | TC-293, TC-294, TC-296, TC-300 |
| §7.6 낙관적 갱신 없음·이벤트끼리 순서 비의존·두 번째 settings·탭 유지·언어 바뀌면 done 새 언어·알림음 카드·타이머 | TC-302, TC-FLOW-31(A·B), TC-303, TC-300 / 알림음·타이머 실물 M-54c |
| §7.6 응답(resolve/reject)↔이벤트 순서 비의존 — pending 중 값이 먼저 바뀌어도 `disabled`·pending 문구 유지(계약 §5.10 이벤트 2·3·6단계가 반환 전) | 성공: TC-FLOW-31 사례 C / 실패: TC-303 ③, TC-FLOW-32 사례 2 · 응답이 앞선 경우: TC-FLOW-31 A·B, TC-303 ②, TC-FLOW-32 사례 1 — 보정 v25 |
| §7.7 계약 사용표(command 인자·실패 표시·이벤트 구독 불변) | TC-296, TC-297, TC-303, TC-302 |
| §7.8 접근성(이름·`aria-busy`·확인창·포커스 복귀·상태 알림) | TC-293, TC-294, TC-296, TC-299 / 낭독 M-54f |
| §7.8 네이티브 `<button>` — Enter·Space로 연다 | TC-293(원소 `BUTTON` — 구조) / 실제 키 조작 M-54f ④(user-event 미설치·jsdom은 키 → click 기본 동작 미재현) — 보정 v25 |
| i18n §4.11 8키 · §4.6 `reset.io`·`reset.seed` · `ERROR_CODES` 27 | TC-301, TC-300, TC-093, TC-094, TC-246, TC-286 / 검수 M-54e |

사용자행 ↔ TC-FLOW(CR-054): **S-30 → TC-FLOW-31(정상 — 응답·이벤트 순서 3사례 A·B·C) · TC-FLOW-32(실패 분기 — 2사례)**(신규, v25 보정). CR ↔ TC: CR-054 → 신규 TC-293 ~ TC-304 · TC-FLOW-31 · TC-FLOW-32 · 개정 위 표 · 대기열 Q-07(닫힘). 수동: `manual-checklist.md` v17 — M-54a ~ M-54f 신설(D-7 전제), v18 — M-54c ⑥·M-54f ④ 추가·D-7 경로 통일.

- 수: 자동 292 → **303**(유효 295 · 폐기 8) · TC-FLOW 30 → **32**(유효 31 · 폐기 1) · 수동 48 → **54**. v25 보정: 자동 303 → **304**(유효 296 · 폐기 8, 신규 TC-304) · TC-FLOW 32 그대로 · 수동 54 그대로(M-54c·M-54f 절차 보강).
- 실행(보강 모드): `yarn test --run src/settings/test/ResetAllCard.test.tsx src/settings/test/i18n.test.ts src/settings/test/GeneralTab.test.tsx src/settings/test/SettingsApp.test.tsx`.

설계 확인 필요(CR-054 — 문서 수정은 소유자)

- **K-1. 앱 데이터 폴더 경로 표기 불일치 — 닫힘(v25).** 매니저 결정: `%APPDATA%\com.kuro.keyviewer\`(`src-tauri/tauri.conf.json` `identifier` = `com.kuro.keyviewer` 확인)로 통일. `manual-checklist.md` v18 D-7 전제에 반영. CLAUDE.md·기존 수동 표 공통 준비의 `kuro_keyviewer` 표기 정리는 각 소유자 몫(이 패스 범위 밖).
- **K-3 ③ 보충(v25).** 언마운트 규칙은 general-tab §7.2에서 규범으로 확정돼 TC-304가 판정한다(앞 「판정 안 함」 폐기).
- **K-2. design RTM R-56 「예정 TC」 동기화(ui-designer 몫).** 이 절 번호(TC-293 ~ TC-304, TC-FLOW-31 · TC-FLOW-32, M-54a ~ M-54f)로 갱신 필요(v25 서술 정리 — TC-304 신설 반영).
- **K-3. 스펙이 고정한 해석.** ① TC-293: 기본 설정 탭 `p[role=status]`는 2개(자동 실행 안내 + 초기화 상태 줄) ② TC-FLOW-31: 이미지 탭 기본값 판정 = 이미지 설정 region 안 `img` src(기본 7장 url 포함·옛 url 0개). 어떤 칸이 미리보기를 `img`로 그리지 않으면 판정 방식 조정 ③ TC-299: pending 동안 포커스는 「전체 초기화」가 아님(확인창이 닫히며 body로 감 — 설계 「활성으로 돌아온 뒤 옮긴다」) ④ TC-300: Provider 언어만 바꿔 rerender하면 `ResetAllCard` 상태(done)가 유지된다(같은 트리 위치). 다르게 의도했다면 알려 달라.
- **K-4. 계약 §5.10 「소비자」 행 「응답 전까지 다른 조작을 막는다」.** general-tab §7 머리의 해석 결정(초기화 버튼 재진입 차단만)을 따랐다 — TC-298은 다른 카드 조작 차단을 판정하지 않는다(bridge 문서 정리 대상, 설계자 보고 사항 그대로).

### CR-057 개정 (v26 — 이동 영역 설명 줄 `areaDesc` 신설·버튼/단계 안내 🔒 문구 교체, 대기열 Q-08 정식 TC 전환)

- 출처: CR-057(사용자 직접 🔒, 베타 테스터 피드백 2026-09-27) · 요구 R-15·R-16(이동 영역), R-20(3개 국어 사전). 설계 기준: CR 대장 CR-057 행(설계 문서 미반영 — 아래 L-2) · 소스 `src/settings/components/MousePartsTab.tsx`(idle 전용 `<p className={styles.guide}>{t.areaDesc}</p>`, role=status 안내 줄 바로 다음 형제) · `src/settings/i18n/{types,ko,ja,en}.ts`.
- 바뀐 문구(ko 🔒 확정): `areaStart` 「사각형 이동 영역 설정」 · `areaPick1` 「1/4 사각형의 왼쪽 위 꼭짓점을 클릭해주세요.」 · `areaPick2` 「2/4 이제 오른쪽 위 꼭짓점을 클릭해주세요.」 · `areaPick3` 「3/4 이제 오른쪽 아래 꼭짓점을 클릭해주세요.」 · `areaPick4` 「4/4 마지막으로 왼쪽 아래 꼭짓점을 클릭해주세요.」 · `areaReview` 「사각형이 맞는지 확인하고 저장하세요.」 · 새 `areaDesc` 「마우스를 움직이면 손이 이 사각형 안에서 따라 움직입니다. 그림 위에서 네 꼭짓점을 차례로 클릭해 사각형을 만드세요.」. 불변: `markerArea`(「이동 영역」)·`areaCorner1~4`·동작·레이아웃·버튼 수.
- **읽기 규칙:** TC 목록·TC-FLOW 원 본문에 남은 옛 문구 「이동 영역 설정하기」·「n/4 이동 영역의 … 꼭짓점을 클릭해주세요.」·「이동 영역을 확인하고 저장하세요.」는 위 새 문구로 읽는다(판정 불변 — 문구만). 아래 표가 원 본문보다 우선한다.

### TC-305 · 이동 영역 설명 줄 — idle에서만, 안내 줄 바로 아래, 3개 국어 · 종류: 자동 · 요구: R-15, R-16, R-20 · 출처: CR-057 · 설계: CR-057(MousePartsTab idle 전용 설명 `<p>` — 안내 줄(role=status) 다음 형제·같은 `.guide`·role 없음·알림 영역 밖·버튼 위, 다른 단계 미렌더), i18n `areaDesc`·`areaStart`·`areaPick1`·`areaReview` · 스펙: `test/MousePartsTab.test.tsx` `it.each(['ko','ja','en'])('TC-305(%s): …')` · **신규(CR-057)**
- Given: 픽스처 `SETTINGS`·`HAND`로 `MousePartsTab` 렌더(ko = Provider 밖 기본값, ja·en = `MessagesProvider language`), 단계 idle, `setSettings`·`setAutostart` mock 초기화.
- When: ① idle 확인 → ② 언어별 `areaStart` 버튼 클릭(pickArea, 점 0개) → 꼭짓점 1개 클릭(점 1개) → ③ 나머지 3개 클릭(reviewArea) → `wizardCancel`(idle 복귀) → ④ `wizardStart` 클릭(pickShoulder) → ⑤ 미리보기 (150,100) 클릭(review) → `wizardCancel`(idle 복귀).
- Then ⓐ 화면: idle(①·각 복귀 뒤)에서 안내 줄 문구 = `wizardIdle` 그대로(ko 「어깨축을 설정하면 팔 파츠가 그 점을 축으로 회전합니다.」, ja 「肩の軸を設定すると、腕パーツがその点を軸に回転します。」, en 「Set the shoulder pivot and the arm part rotates around that point.」)이고 설명을 포함하지 않는다. 설명 줄은 `<p>` 1개, 텍스트가 정확히 ko 「마우스를 움직이면 손이 이 사각형 안에서 따라 움직입니다. 그림 위에서 네 꼭짓점을 차례로 클릭해 사각형을 만드세요.」 / ja 「マウスを動かすと、手がこの四角形の中でついて動きます。絵の上で4つの角を順番にクリックして四角形を作ってください。」 / en 「As you move the mouse, the hand follows it inside this rectangle. Click the four corners on the picture in order to make the rectangle.」, `role`·`aria-live` 속성 없음, `previousElementSibling` = 안내 줄, `className` = 안내 줄 `className`(같은 `.guide`), 문서 순서상 `areaStart` 버튼보다 앞. 버튼 이름 = [`wizardStart`, `areaStart`(ko 「사각형 이동 영역 설정」 / ja 「四角形の移動範囲を設定」 / en 「Set rectangular movement area」), `resetDefault`] 3개. ②(점 0·1개)·③·④·⑤에서는 설명 줄이 없다(`queryByText` null). 그때 안내 줄 = ② `areaPick1`(ko 「1/4 사각형의 왼쪽 위 꼭짓점을 클릭해주세요.」 / ja 「1/4 四角形の左上の角をクリックしてください。」 / en 「1/4 Click the top-left corner of the rectangle.」) · ③ `areaReview`(ko 「사각형이 맞는지 확인하고 저장하세요.」 / ja 「四角形が合っているか確認して保存してください。」 / en 「Check that the rectangle looks right, then save.」) · ④ `wizardPickShoulder` · ⑤ `wizardReview`. 모든 확인 시점에서 `role=status` 1개·`[aria-live]` 1개. ⓑ 상태: 마법사 단계만 바뀌고 저장값 불변, 설명 줄 표시 ⇔ `wizard.step === 'idle'`. ⓒ bridge: `setSettings` 0회 · `setAutostart` 0회(문구·표시만의 변경).
- 스펙: `test/MousePartsTab.test.tsx` `describe('이동 영역 설명 줄 (R-15·R-16, CR-057)')` — `it.each` 3건(ko·ja·en).

#### CR-057 개정 TC (**앞 본문을 대체** — 번호 유지, 판정 불변·문구/개수만. 이 패스에서 스펙 개정 완료)

| TC | 스펙 | 처리(CR-057) |
|---|---|---|
| TC-009 | `labels.test.ts` | `MIGRATED`의 `areaStart`·`areaPick1~4`·`areaReview` 6키를 새 ko 문구로(`markerArea`·`areaCorner1~4` 불변), 제목 「CR-057 개정」 |
| TC-094 | `i18n.test.ts` | 단순 키 `simpleKeys(ko)` **136 → 137**(`areaDesc` +1), 세 사전 `areaDesc` 존재 단언 추가, 제목. 「새 키 41개」(CR-028 `EXPECTED_KO_NEW` 표)는 **불변** — `areaDesc`는 CR-028 표 밖이라 값 단언은 TC-305 |
| TC-093 | `i18n.test.ts` | 변경 없음(ja·en 키 집합 = ko — `areaDesc` 3개 사전 모두 있어 그대로 PASS 예정) |
| TC-016 외 `IDLE_BUTTONS` 단언 전부(위임문 실패 목록 TC-019 · TC-020 · TC-022 · TC-049 · TC-082 · TC-086 등) | `MousePartsTab.test.tsx` | `IDLE_BUTTONS` = [「어깨축 설정하기」, 「사각형 이동 영역 설정」, 「기본값으로 리셋」] — 버튼 수 3 불변(idle 새 설명 `<p>`는 버튼이 아님) |
| TC-024 · TC-063 ~ TC-074 · TC-086 | `MousePartsTab.test.tsx` | `btn('사각형 이동 영역 설정')`(상수 `AREA_START`), `G_AREA` 1/4 ~ 4/4 · `G_AREA_REVIEW` 새 문구, 제목의 「이동 영역 설정하기」 → 「사각형 이동 영역 설정」. TC-073 `[aria-live]` 1개 단언은 그대로(새 줄은 aria-live 없음) |
| TC-222 · TC-225 | `DragHit.test.tsx` | `IDLE_BUTTONS`·`G_AREA_2`(「2/4 이제 오른쪽 위 꼭짓점을 클릭해주세요.」)·`btn(AREA_START)` |
| TC-FLOW-02 · TC-FLOW-04 · TC-FLOW-06 · TC-077 | `SettingsApp.test.tsx` | 어깨축 탭 버튼 목록 둘째 = 「사각형 이동 영역 설정」(FLOW-02), 리셋 대기 중 비활성 버튼 이름(FLOW-04), `btn(AREA_START)`·`G_AREA`·`G_AREA_REVIEW`(TC-077·FLOW-06), FLOW-06 제목 |

추적(CR-057)

| 요구ID | TC |
|---|---|
| R-15 | 신규 TC-305 · 개정 TC-063 ~ TC-074 · TC-222 · TC-225 · TC-077 · TC-FLOW-06 |
| R-16 | 신규 TC-305 · 개정 TC-064 ~ TC-074 · TC-FLOW-06 |
| R-20 | 신규 TC-305(ja·en 설명·버튼·안내 문구) · 개정 TC-094(단순 키 137) · 변경 없음 TC-093 |

| 설계 항목(CR-057) | TC |
|---|---|
| idle 전용 설명 줄(안내 줄 다음 형제·같은 `.guide`·role/aria-live 없음·버튼 위) | TC-305 |
| 다른 단계(pickArea·reviewArea·pickShoulder·review) 미렌더 · idle 복귀 시 다시 렌더 | TC-305 |
| 안내 줄(role=status `wizardIdle`) 불변·알림 영역 1개 | TC-305, TC-073 |
| i18n 새 키 `areaDesc`(ko 🔒·ja·en, 단순 키 137) | TC-305, TC-094, TC-093 |
| `areaStart`·`areaPick1~4`·`areaReview` 문구 교체 | TC-009, TC-305(ko·ja·en `areaStart`·`areaPick1`·`areaReview`), TC-064 ~ TC-074, TC-222, TC-225, TC-077, TC-FLOW-06 |
| `markerArea`·`areaCorner1~4`·버튼 수·동작 불변 | TC-009, TC-013, TC-065, `IDLE_BUTTONS` 단언 전부 |

사용자행 ↔ TC-FLOW(CR-057): **S-7 → TC-FLOW-06(개정 — 문구만, Steps 불변)**. 새 사용자행 없음. 설명 줄 표시는 컴포넌트 단위 TC-305가 판정한다. CR ↔ TC: CR-057 → 신규 TC-305 · 개정 위 표 · 대기열 Q-08. 수동: 신설 없음(ja·en 문구 검수는 기존 언어 검수 M-22 범위, 설명 줄 줄바꿈 실물은 기존 어깨축 탭 수동 항목 범위).

- 수: 자동 304 → **305**(유효 297 · 폐기 8, 신규 TC-305 — 스펙은 `it.each` 3건) · TC-FLOW 32 그대로 · 수동 54 그대로.
- 실행(보강 모드): `yarn vitest --run src/settings/test/labels.test.ts src/settings/test/i18n.test.ts src/settings/test/MousePartsTab.test.tsx src/settings/test/DragHit.test.tsx src/settings/test/SettingsApp.test.tsx`(또는 `yarn vitest --run src/settings`).

설계 확인 필요(CR-057 — 문서 수정은 소유자)

- **L-1. CR 대장 요구 표기.** CR-057 행의 관련 요구 「R-24(3개 국어)」 — 이 문서·i18n 스펙에서 3개 국어 요구는 R-20이고 R-24는 「위치 초기화」다. TC-305는 R-20으로 추적했다. CR 대장 표기 확인 필요(기록자 몫).
- **L-2. 설계 문서 미동기화.** `src/settings/design.md`·`design/*.md`·`requirements.md`에 `areaDesc`·CR-057이 없다(Grep 0건). 설명 줄 위치·클래스·role 없음·idle 전용 규칙과 i18n 표(새 키·교체 문구, 단순 키 137)를 ui-designer 동기화 모드로 반영하고 RTM R-15·R-16 「예정 TC」에 TC-305를 넣어야 한다. 현재 TC-305는 CR 대장 행을 설계 근거로 삼았다.
- **L-3. 스펙이 고정한 해석.** 설명 줄 `className` = 안내 줄 `className`(CR 대장 「같은 `.guide` 스타일」), 설명 줄에 `role`·`aria-live` 없음(「알림 영역 밖」), 검토 단계(review·reviewArea)에서도 설명 줄 없음(「대기(idle) 상태에서」만). 다르게 의도했다면 알려 달라.
- **L-4. 소스 머리 주석.** `src/settings/components/MousePartsTab.tsx` 6행 주석에 옛 문구 「이동 영역 설정하기」가 남아 있다(판정 무관, 구현자 몫).

### TC-FLOW-10 · S-9: 일본어 사용자가 언어를 바꾸고 모든 문구가 바로 바뀐다 · 종류: 자동 · 요구: R-20, R-19 · Steps: TC-031(마운트 부분) → TC-107(선택·저장 인자 부분) → TC-101(수신·탭 문구·lang·창 제목·어깨축 탭 안내 부분) → TC-110(저장 실패 부분) + TC-102(ja 오류 문구 부분) · **신규(CR-028)**
- 상태 전달: 마운트(ko) → `日本語` 선택 → `{...SETTINGS, language:'ja'}` → 수신 → 탭 ja·`<html lang>` ja·창 제목 `ja.windowTitle` → 어깨축 탭 안내 `ja.wizardIdle` → 기본 설정 탭으로 돌아와 잠금 토글 → `settings.io` 실패 → 오류 줄 `${ja.errorPrefix} ${ja.errors['settings.io']}`.
- 기대(통합): `setSettings` 총 2회. 창 제목 표시줄·파일 대화상자 제목·글꼴 실물과 ja·en 검수는 M-22.
- 스펙: `test/SettingsApp.test.tsx` `it('TC-FLOW-10: …')`

### TC-FLOW-11 · S-10: 방송 중 실수로 옮기지 않게 잠그고, 잠금 중 크기는 슬라이더로 바꾼다 · 종류: 자동 · 요구: R-21, R-03 · Steps: TC-031(마운트 부분) → TC-109(잠금 저장·수신 부분) → TC-120(끌기·놓기 부분) · **신규(CR-028)**
- 상태 전달: 마운트 → 잠금 토글 → `{...SETTINGS, positionLock:true}` → 수신 → 토글 켜짐 → 슬라이더 80 → 놓기 → `{...locked, scale:0.8}`(잠금 유지가 Given) → 수신 → `80%`, 잠금 그대로.
- 기대(통합): `setSettings` 총 2회, 오류 줄 없음. 클릭 통과·끌기·Ctrl+휠 차단 실물은 M-19.
- 스펙: `test/SettingsApp.test.tsx` `it('TC-FLOW-11: …')`

### TC-FLOW-12 · S-11: 작업표시줄에 캐릭터 창을 띄우고(또는 숨기고) 싶다 · 종류: 자동 · 요구: R-22 · Steps: TC-031(마운트 부분) → TC-111(켜기·수신·끄기 부분) · **신규(CR-028)**
- 상태 전달: 마운트 → 토글 → `{...SETTINGS, showInTaskbar:true}` → 수신 → 켜짐 → 토글 → `{...on, showInTaskbar:false}` → 수신 → 꺼짐.
- 기대(통합): `setSettings` 총 2회, 오류 줄 없음. 작업표시줄 버튼 실물은 M-20.
- 스펙: `test/SettingsApp.test.tsx` `it('TC-FLOW-12: …')`

### TC-FLOW-13 · S-12: 화면 밖으로 사라진 캐릭터를 기본 자리로 돌려놓는다 · 종류: 자동 · 요구: R-24 · Steps: TC-031(마운트 부분) → TC-117(클릭·대기·응답 부분) · **신규(CR-028)**
- 상태 전달: 마운트 → 「위치 초기화」 → 버튼 비활성 → (core가 emit) `settings://changed`(`overlay` (100,100)) → 응답 `{x:100,y:100}` → 버튼 활성.
- 기대(통합): `resetOverlayPosition` 1회, 확인 대화상자·오류 줄 없음, `setSettings` 없음. 오버레이 이동 실물은 M-21.
- 스펙: `test/SettingsApp.test.tsx` `it('TC-FLOW-13: …')`

### TC-FLOW-02 · S-4 정상: 팔 축이 엉뚱해서 미리보기로 어깨 위치를 고친다 · 종류: 자동 · 요구: R-10, R-12 · Steps: TC-031(마운트 부분) → TC-032(마우스 파츠 탭 부분) → TC-035 → TC-016 → TC-017(안내 부분) → TC-018(안내·마커 부분) → TC-020(저장 인자·idle 복귀 부분) → TC-036(축 수신 → 표시 부분) · **개정(CR-016 — TC-035 단언에 손 그림·파츠 위치)**
- 상태 전달: 로드 값(축 600,480 · 파츠 위치 100,200) → 마우스 탭 → 로드 값 반영(마커·축/파츠 `dd`·img 순서·손 그림 위치·크기·패드 박스 없음) → idle 안내·버튼 3개(「이동 영역 설정하기」 포함, CR-018) → pickShoulder → 클릭 (300,200) → review → 저장 인자 `{ ...SETTINGS, mouse:{ ...MOUSE, shoulder:(300,200) } }` → 그 값이 `settings://changed`로 돌아와 마커·축 `dd` `(300, 200)`.
- 기대(통합): `setSettings` 총 1회, 오류 줄 없음, 미사용 bridge(`importAsset`·`removeAsset`·`setAutostart`·`pickPngFile`·`getHandAnchor`·`onHandAnchorChanged`) 호출 없음. 실물 반영은 M-05·M-06.
- 스펙: `test/SettingsApp.test.tsx` `it('TC-FLOW-02: …')` — TC-035·TC-016 단언 포함(idle 버튼 3개 — CR-018 개정)

### TC-FLOW-03 · S-4 오류·취소 분기 · 종류: 자동 · 요구: R-10 · Steps: TC-031(마운트 부분) → TC-032(마우스 파츠 탭 부분) → TC-017 → TC-018 → TC-021(1회차 실패 부분) + TC-038(표시 규칙 `오류: {message}` 부분) → TC-021(재저장 성공 부분) → TC-017 → TC-022(pickShoulder 취소 부분)
- 상태 전달: 로드·마우스 탭 → review (300,200)에서 저장 실패 → 오류 줄 `오류: 설정 파일을 저장하지 못했습니다.`·review 유지(Given 재사용) → 재저장 성공 → 오류 줄 사라짐·idle → 다시 시작 → pickShoulder에서 취소 → idle.
- 기대(통합): `setSettings` 총 2회(실패 1 + 재저장 1, 취소는 저장 없음).
- 스펙: `test/SettingsApp.test.tsx` `it('TC-FLOW-03: …')`

### TC-FLOW-04 · S-5: 축·손 위치·이동 영역을 잘못 잡아 기본값으로 되돌린다 · 종류: 자동 · 요구: R-17(R-13 이관) · Steps: TC-031(마운트 부분) → TC-032(마우스 파츠 탭 부분) → TC-035(마커 부분) → TC-024(클릭 직후 비활성 구간) → TC-025(인자·확인 창 없음·완료 부분) → TC-036(수신 → 표시 부분) + TC-063(②의 기본 영역 선 부분) · **개정(CR-016, CR-018)**
- 상태 전달: 로드 값(축 600,480 · 파츠 위치 100,200 · 영역 `AREA`) → 마우스 탭 → 「기본값으로 리셋」 클릭 → 저장 대기 중 「기본값으로 리셋」·「어깨축 설정하기」·「이동 영역 설정하기」 비활성 → 인자 정확히 `{ ...SETTINGS, mouse: DEFAULT_MOUSE_EXPECTED }`(area `DEFAULT_AREA`·파츠 위치 389,492, `pad`·팔 필드 없음)·확인 창 없음 → 저장 완료 후 세 버튼 활성 → 그 값이 `settings://changed`로 돌아와 마커·축 `dd` `(620, 530)`, 손 그림 `left 194.5px · top 246px`, 「파츠 위치」 `dd` `(389, 492)`, 영역 선 `points` = `SVG_DEFAULT`, 「이동 영역」 `dd` = `DD_DEFAULT`.
- 기대(통합): `setSettings` 총 1회, `window.confirm`·`dialog` 없음, 오류 줄 없음. 실물 반영은 M-07.
- 선행: bridge CR-018(`DEFAULT_MOUSE_SETTINGS.area`·`pad` 삭제) · CR-005(「어깨축 설정하기」 비활성) · CR-018 화면(「이동 영역 설정하기」·영역 선·값 목록)
- 스펙: `test/SettingsApp.test.tsx` `it('TC-FLOW-04: …')`

### TC-FLOW-06 · S-7: 손이 좁게 움직여서 미리보기에서 네 꼭짓점을 찍어 이동 영역을 넓히고 선·좌표로 확인한다 · 종류: 자동 · 요구: R-15, R-16 · Steps: TC-031(마운트 부분) → TC-032(마우스 파츠 탭 부분) → TC-076(로드 부분) → TC-064(진입 부분) → TC-065(안내·선·값 부분, rect 0) → TC-067(저장 인자·idle 복귀 부분) → TC-076(수신 부분) · **신규(CR-018)**
- 상태 전달: 로드 값(영역 `AREA`) → 마우스 탭 → 영역 선 `SVG_SAVED`·「이동 영역」 `DD_SAVED` → 「이동 영역 설정하기」 → 안내 1/4·`svg` 없음 → 네 점 클릭마다 안내 2/4 → 3/4 → 4/4 → 검토 문구 → `SVG_NEW`·점 4개·`DD_NEW` → 「저장」 → 인자 `AREA_SAVED` → idle → 그 값이 `settings://changed`로 돌아와 `SVG_NEW`·점 0개·`DD_NEW`, 축 마커 `(600, 480)`·「파츠 위치」 `(100, 200)` 그대로. (TC-FLOW-05는 아래 — 번호 순서가 아니라 추가 순서로 둔다)
- 기대(통합): `setSettings` 총 1회, 오류 줄 없음, 미사용 bridge 호출 없음. 실물 반영(settings.json·오버레이 손 이동 범위)은 M-14, 선 모양은 M-13.
- 선행: CR-018 화면 · bridge CR-018(타입)
- 스펙: `test/SettingsApp.test.tsx` `it('TC-FLOW-06: …')`

### TC-FLOW-05 · S-6: 손 그림이 캐릭터 손 자리와 어긋나 끌어 제자리에 놓고 값 목록으로 확인한다 · 종류: 자동 · 요구: R-11, R-12 · Steps: TC-031(마운트 부분) → TC-032(마우스 파츠 탭 부분) → TC-035(손 그림·파츠 위치 부분) → TC-049(누름·끌기·놓기·저장 인자 부분) → TC-036(수신 → 손 그림·파츠 위치 표시 부분) · **신규(CR-016)**
- 상태 전달: 로드 값(파츠 위치 100,200, 손 그림 200×150) → 마우스 탭 → 손 그림 `left 50px · top 100px · 100px × 75px`·「파츠 위치」 `(100, 200)` → 누름 (100,150)·이동 (150,175) → 손 그림 `left 100px · top 125px`·`(200, 250)`(끌기 중 저장 없음) → 놓기 → 저장 인자 `{ ...SETTINGS, mouse: { ...MOUSE, partPos:(200,250) } }` → 저장 완료(「기본값으로 리셋」 활성) → 그 값이 `settings://changed`로 돌아와 손 그림 `left 100px · top 125px`·「파츠 위치」 `(200, 250)`, 축 마커 `(600, 480)`·안내 idle 그대로.
- 기대(통합): `setSettings` 총 1회, `setPointerCapture` 인자 7, 오류 줄 없음, 미사용 bridge 호출 없음. 실물 반영(settings.json·오버레이)은 M-11, 포인터 캡처 실물은 M-12.
- 선행: CR-016 화면 · bridge CR-016(타입)
- 스펙: `test/SettingsApp.test.tsx` `it('TC-FLOW-05: …')`

---

## 추적표

### 요구 ↔ TC

| 요구ID | 단계 | 자동 TC | 수동 | TC-FLOW |
|---|---|---|---|---|
| R-01 | 1단계 | TC-009, TC-031, TC-032, TC-033, TC-034, TC-040, TC-041, TC-042, TC-043 | M-01, M-02 | TC-FLOW-01 |
| R-02 | **폐기(CR-016 → R-14)** | — (옛 참조 TC-040·TC-041은 R-14 임시 표시로 이관) | — | — |
| R-03 | **보류(다음 단계)** | 본 요구 TC 없음. 보류 기간 임시 자리표시(design §5.3 동작 탭)만 TC-042, TC-043 | — | — |
| R-04 | **보류(다음 단계)** | 같음 — TC-042, TC-043(임시 자리표시만) | — | — |
| R-05 | **폐기(CR-020, 대체 없음 — 쾅 메커니즘 삭제 🔒 2026-09-24)** | — (옛 임시 자리표시 매핑 TC-042·TC-043에서 제거. `placeholderBehavior` 「연타 기준·」 삭제는 TC-042·TC-009가 확인) | — | — |
| R-06 | **보류(다음 단계)** | 같음 — TC-042, TC-043(임시 자리표시만). CR-004의 화면 영향은 저장 경로로 TC-028·M-08에서 확인 | — | — |
| R-07 | **폐기(CR-016 → R-12)** | — (옛 TC는 R-12로 이관, TC-008·TC-012 폐기) | — | — |
| R-08 | **폐기(CR-005로 대체)** | — | — | — |
| R-09 | **폐기(CR-016 → R-13)** | — (옛 TC-024~TC-028은 R-13으로 이관) | — | — |
| R-10 | 1단계 | TC-001, TC-002, TC-003, TC-004, TC-005, TC-006, TC-009, TC-011, TC-013, TC-016, TC-017, TC-018, TC-019, TC-020, TC-021, TC-022, TC-023, TC-024, TC-027, TC-028, TC-029, TC-030, TC-038, TC-044, TC-054, TC-071 | M-04, M-05, M-06, M-08, M-09, M-10, M-12 | TC-FLOW-02, TC-FLOW-03 |
| R-11 | 1단계 | TC-006, TC-009, TC-013, TC-014, TC-030, TC-035, TC-036, TC-045, TC-046, TC-048, TC-049, TC-050, TC-051, TC-052, TC-053, TC-054, TC-055, TC-056, TC-057, TC-058, TC-071 | M-08, M-10, M-11, M-12, M-15 | TC-FLOW-05 |
| R-12 | 1단계 | TC-007, TC-009, TC-010, TC-011, TC-013, TC-014, TC-015, TC-030, TC-034, TC-035, TC-036, TC-037, TC-039, TC-044, TC-047, TC-048 | M-03 | TC-FLOW-02, TC-FLOW-05 |
| R-13 | **폐기(CR-018 → R-17)** | — (옛 TC-024~TC-028은 R-17로 이관) | — (M-07·M-08은 R-17로 이관) | — (TC-FLOW-04는 R-17로 이관) |
| R-14 | **보류(다음 단계)** | 본 요구 TC 없음. 보류 기간 임시 자리표시(design §5.3 이미지 탭)만 TC-040, TC-041 | — | (S-1 해당 부분 보류) |
| R-15 | 1단계 | TC-009, TC-024, TC-059, TC-060, TC-061, TC-062, TC-063, TC-064, TC-065, TC-066, TC-067, TC-068, TC-069, TC-070, TC-071, TC-072, TC-073, TC-074, TC-075, TC-077 | M-08, M-09, M-13, M-14, M-15 | TC-FLOW-06 |
| R-16 | 1단계 | TC-009, TC-013, TC-026, TC-063, TC-064, TC-065, TC-067, TC-069, TC-073, TC-074, TC-075, TC-076 | M-03, M-13, M-14 | TC-FLOW-06 |
| R-17 | 1단계 | TC-024, TC-025, TC-026, TC-027, TC-028, TC-074 | M-07, M-08 | TC-FLOW-04 |

### CR ↔ TC

| CR-ID | 대상 | TC |
|---|---|---|
| CR-003 | 리셋 부분(유지, confirm 없음) — 마법사 부분은 CR-005로 대체. 리셋 기대값은 CR-016이 대체 | TC-024, TC-025, TC-026, TC-FLOW-04, M-07 |
| CR-004 | 자동 실행 해제 멱등(core) — 화면 영향: 저장 경로 | TC-028, M-08 |
| CR-005 | 한 단계 마법사·확정 문구·손 위치 삭제·`saving` 비활성 확장 | TC-001~TC-005, TC-009, TC-011, TC-013, TC-017, TC-018, TC-019, TC-022, TC-023, TC-024, TC-029, TC-FLOW-02, TC-FLOW-03, TC-FLOW-04, M-04 |
| CR-006 | 레이어 이동 모드 패드 박스·손 점 숨김 — **CR-016이 「항상 숨김」으로 대체** | TC-008·TC-012 폐기, TC-011·TC-035·TC-037 개정(CR-016 행 참조) |
| CR-016 | 손 그림 끌어다 놓기(R-11)·미리보기 바탕/손 그림/패드 박스(R-12)·리셋 기대값(R-13)·`previewNoBody`·`markerPart` | 폐기: TC-008, TC-012 / 개정: TC-005, TC-006, TC-009, TC-010, TC-011, TC-013, TC-014, TC-015, TC-025, TC-026, TC-027, TC-030, TC-034, TC-035, TC-036, TC-037, TC-040, TC-FLOW-02, TC-FLOW-04 / 신규: TC-045~TC-058, TC-FLOW-05 / 수동: M-03, M-07, M-11, M-12 |
| CR-018 | 이동 영역 설정(R-15)·영역 상시 표시·값 목록(R-16)·리셋 기대값(R-17, R-13 폐기)·`MouseSettings.area` 추가·`pad` 삭제·라벨 11키 | 개정: TC-001~TC-005, TC-009, TC-013, TC-016, TC-019(스펙), TC-020, TC-022, TC-024~TC-028, TC-049, TC-FLOW-02, TC-FLOW-04 / 신규: TC-059~TC-077, TC-FLOW-06 / 수동: M-03, M-07, M-08, M-09 개정 · M-13, M-14, M-15 신설 |

### 설계 항목 ↔ TC

| design.md 항목 | TC |
|---|---|
| §1 창 라벨 분기(`main.tsx` → `settings`) | M-02 (관련: TC-031은 `SettingsApp`을 직접 마운트할 뿐 분기 자체는 검증하지 않음) |
| §1 탭 3개·기능 탭은 「마우스 파츠」 | TC-031, TC-032 |
| §2 header·탭 바·오류 줄(`error != null`일 때만) | TC-031, TC-033, TC-034, TC-038 |
| §2 `[mouse]` 배치(안내·미리보기·버튼 줄 idle 3개·값 목록 세 행·영역 선 — CR-018) | TC-010, TC-013, TC-016, TC-063, TC-064, TC-065 |
| §2 영역 표: 바탕 body → kb_up, 패드 박스 없음 | TC-010, TC-011, TC-047 |
| §2 빈 상태 `p.empty`(body·kb_up 둘 다 없음) | TC-015, TC-034, TC-037 |
| §2 `[images]` 임시 자리표시(목록) | TC-040, TC-041 |
| §2 `[behavior]` 임시 자리표시(JSON 덤프) | TC-042, TC-043 |
| §3 `SettingsApp` | TC-031~TC-043, TC-FLOW-02~TC-FLOW-05 |
| §3 탭 버튼(`aria-pressed`, `setTab`) | TC-031, TC-032 |
| §3 `MousePartsTab`(props·오류 전달) | TC-010, TC-011, TC-013~TC-030, TC-044, TC-047~TC-058 |
| §3 `mouseWizard` 모듈(export 목록, `isPreviewLayerMode` 삭제) | TC-001~TC-007, TC-045, TC-046 (삭제: TC-008 폐기·스펙 import 제거) |
| §3 스타일(`.markerHand` 삭제, `.part` 신규 `pointer-events:none`, `.pad` 삭제) | TC-011(패드 박스 없음), TC-048(손 그림 인라인 위치·크기), M-03, M-04, M-12(`pointer-events` 실물) |
| §3 `useBridgeEvent` | TC-036, TC-037, TC-039, TC-041, TC-043 |
| §4 `tab` | TC-031, TC-032 |
| §4 `settings` | TC-033, TC-035, TC-036, TC-042, TC-043 |
| §4 `manifest` | TC-034, TC-035, TC-037, TC-040, TC-041 |
| §4 `error` | TC-031, TC-033, TC-034, TC-038 |
| §4 `wizard` | TC-001~TC-004, TC-016~TC-022, TC-054 |
| §4 `drag`(초기 null, `grab`·`pos`) | TC-049, TC-050, TC-051, TC-052, TC-056 |
| §4 `saving`(비활성 버튼 4종·끌기 시작 불가) | TC-023, TC-024, TC-055, TC-FLOW-04 |
| §4 `canvas`(파생 — `null`이면 900×700, 아니면 `manifest.canvas`) | TC-015, TC-034(`null` 기본), TC-044(비-null 450×350·900×350), TC-048(450×350) |
| §4 `scale`(파생) | TC-007, TC-010, TC-013(0.5), TC-044·TC-048(1·0.5, 비-null 캔버스) |
| §4 `mouse`(파생) | TC-014, TC-027, TC-058 |
| §4 `shownShoulder`(파생) | TC-013, TC-017, TC-018, TC-020, TC-022 |
| §4 `baseUrl`(파생) | TC-010, TC-015, TC-037, TC-047 |
| §4 `part`(파생) | TC-048, TC-053(없음), TC-037(크기 재계산) |
| §4 `shownPartPos`(파생) | TC-013, TC-049, TC-051, TC-052, TC-056, TC-057 |
| §4 `layerMode` 삭제 | TC-008 폐기, TC-011(manifest와 무관하게 같은 결과) |
| §4 `WizardStep`(pickHand 없음) | TC-002, TC-017 |
| §5.1 `wizardReduce` | TC-001, TC-002, TC-003, TC-004 |
| §5.1 `applyWizard` | TC-005 |
| §5.1 `previewToCanvas` | TC-006, TC-018, TC-044, TC-052(음수·초과 오프셋 고정) |
| §5.1 `fitScale` | TC-007, TC-044 |
| §5.1 `hitPart` | TC-045, TC-050, TC-053 |
| §5.1 `clampPartPos` | TC-046, TC-051, TC-052 |
| §5.1 `isPreviewLayerMode` 삭제 | TC-008 폐기(스펙에서 import·사례 삭제) |
| §5.1 삭제(`pickHand`·`hand`·`back`) | TC-002, TC-017, TC-018 |
| §5.2 `findUrl`(`body`·`kb_up`·`mouse_base`) | TC-010, TC-047, TC-048 |
| §5.2 `persist` | TC-020, TC-021, TC-023, TC-026, TC-028, TC-049, TC-057 |
| §5.2 `toCanvasPoint` | TC-018(클릭), TC-050(포인터) |
| §5.2 `onPreviewPointerDown` | TC-049, TC-050, TC-053, TC-054, TC-055 |
| §5.2 `onPreviewPointerMove` | TC-049, TC-051, TC-052 |
| §5.2 `onPreviewPointerUp` | TC-049, TC-051, TC-056(drag null 무시), TC-057 |
| §5.2 `onPreviewPointerCancel` | TC-056 |
| §5.2 (규칙) 끌기와 어깨축 마법사 ①~④ | ① TC-054 · ② TC-049(캡처 호출), M-12(실물) · ③ TC-049 · ④ TC-054, M-12 |
| §5.2 (규칙) `settings.mouse === null` 저장 | TC-027, TC-058 |
| §5.2 `onPreviewClick` | TC-018, TC-019, TC-044, TC-049(놓은 뒤 click 무시), TC-054 |
| §5.2 `onSave` | TC-020, TC-044 |
| §5.2 `onReset`(기대값) | TC-025, TC-026(부분) |
| §5.2 `guideText` | TC-016, TC-017, TC-018 |
| §5.2 `mark` | TC-013, TC-018, TC-044 |
| §5.2 렌더 1(section)·2(안내) | TC-030 |
| §5.2 렌더 3(미리보기 div·핸들러·손 그림·바탕/빈 상태·패드 박스 없음·마커) | TC-010, TC-011, TC-015, TC-017, TC-018, TC-044, TC-047, TC-048 |
| §5.2 렌더 4(버튼 줄) | TC-016, TC-017, TC-018 |
| §5.2 렌더 5(값 목록 ① 축 ② 파츠 위치, 「손 위치」 없음) | TC-013, TC-049 |
| §5.3 마운트 효과 | TC-031, TC-033, TC-034 |
| §5.3 이벤트 구독(hand-anchor 미구독) | TC-031, TC-036, TC-037, TC-039, TC-041, TC-043 |
| §5.3 탭 전환 | TC-032 |
| §5.3 이미지 탭(임시 자리표시) | TC-040, TC-041 |
| §5.3 동작 탭(임시 자리표시) | TC-042, TC-043 |
| §6 P-1 창 열기 | TC-031, TC-033, TC-034 |
| §6 P-2 어깨축 마법사 | TC-016~TC-022, TC-054, TC-FLOW-02, TC-FLOW-03 |
| §6 P-3 기본값 리셋 | TC-024, TC-025, TC-026, TC-FLOW-04 |
| §6 P-4 외부 변경 | TC-036, TC-037, TC-041, TC-043 |
| §6 P-5 손 그림 끌어다 놓기(정상·오류) | TC-049~TC-058, TC-FLOW-05, M-11 |
| §6 confirm 표: 리셋 confirm 없음 | TC-025, TC-FLOW-04 |
| §6 confirm 표: 이미지 슬롯 비우기 | 보류(R-14) — TC 없음 |
| §7 `get_settings` | TC-031, TC-033 |
| §7 `get_asset_manifest`(항목 `width`·`height` 사용) | TC-031, TC-034, TC-048, TC-037 |
| §7 `set_settings`(코드 무관 message 표시, `partPos` 포함) | TC-020, TC-021, TC-025, TC-038, TC-049, TC-057 |
| §7 `settings://changed` | TC-036, TC-043, TC-FLOW-05 |
| §7 `assets://changed` | TC-037, TC-041 |
| §7 `toBridgeError` | TC-021 |
| §7 미사용(`import_asset`·`remove_asset`·`set_autostart`·`pickPngFile`) | TC-031, TC-028, TC-040, TC-042, TC-FLOW-02, TC-FLOW-05 |
| §7 미구독(`get_hand_anchor`·`assets://hand-anchor-changed`) | TC-031, TC-040~TC-043, TC-FLOW-02, TC-FLOW-05 |
| §8 확정 문구·라벨 표(29키 — CR-016까지 18 + CR-018 11) | TC-009 (화면 사용: TC-013 `markerPart`·`markerArea`·`areaCorner1~4`, TC-015·TC-034 `previewNoBody`, TC-016~TC-018, TC-031, TC-033, TC-038, TC-040, TC-042, TC-064 `areaStart`·`areaPick1`, TC-065 `areaPick2~4`·`areaReview`) |
| §8 삭제 라벨(CR-005) | TC-009 |
| §9 포커스 순서 | TC-016, TC-017, TC-018(DOM 순서), TC-030(tabindex 없음), M-09 |
| §9 단계 전환 후 포커스 | TC-029, M-09 |
| §9 키보드(Enter·Space, 네이티브 버튼) | TC-030, M-09 |
| §9 미리보기 클릭·끌기 포인터 전용(`role=presentation`, 키보드 대체 없음) | TC-030, M-09 |
| §9 끌기 결과는 값 목록 숫자·실시간 알림 없음 | TC-030(aria-live 1개), TC-049(값 목록), M-10 |
| §9 상태 알림(status·alert·마커 aria-label·장식 숨김) | TC-030, TC-033, TC-013, TC-057, M-10 |
| §9 저장 중 비활성·끌기 불가 | TC-023, TC-024, TC-055 |
| §10 합성 순서(손 그림 → 바탕 → 축 마커) | TC-010, TC-047, TC-048, M-03 |
| §10 모드 하나·패드 박스 항상 숨김 | TC-011, M-03 |
| §10 끌기 판정 좌표 기반 | TC-045, TC-050, TC-053 |
| §10 끌기 범위(그림 전체가 캔버스 안, 전체 크기 (0,0)) | TC-046, TC-051, TC-052, M-11 |
| §10 배경 미포함 | TC-010, M-03 |
| §10 좌표(미리보기 = 캔버스 × scale) | TC-013, TC-014, TC-018, TC-044, TC-048 |
| §10 축 마커 스타일(색·크기) | M-03 |
| §11 D-1(네이티브 원소 수용) | TC-030 |
| §11 D-2(자체 합성 수용, 회전 0°) | TC-010, TC-048 |
| §12 공용화 후보 | 해당 없음 — 후작업 후보 목록(동작 명세 아님) |
| §13 RTM | 본 문서 「요구 ↔ TC」 |
| **CR-018 추가 항목** | |
| 헤더 미확정 계약(`MouseSettings.area` 추가·`pad` 삭제, 기본값 = core) | TC-025(키 목록·`pad` 없음·기본 영역), TC-027, TC-067(저장 인자 키 목록), TC-074, TC-FLOW-04 |
| §2 ASCII `[area]` 버튼 · pickArea `[cancel]` · reviewArea `[save] [cancel]` | TC-016, TC-064, TC-065 |
| §2 ASCII `svg AreaOutline`(저장 선 / 편집 중) | TC-063, TC-065, TC-069 |
| §2 `dl.values` 세 행(축·파츠 위치·이동 영역 4점) | TC-013, TC-065, TC-067 |
| §3 `MousePartsTab` CR-018 부작용(이동 영역 저장 `setSettings`·오류 전달) | TC-067, TC-068, TC-070, TC-074, TC-077 |
| §3 `mouseWizard` CR-018 확장(`WizardStep`·`WizardState`·`WizardAction`·`initialWizard`·`wizardReduce`·`applyWizard`) | TC-001~TC-005, TC-059~TC-062 |
| §3 `AreaOutline`(props `points`·`closed`·`editing`·`scale`·`width`·`height`, 0점이면 null) | TC-075, TC-063(화면 안 props: 900×700·900×350) |
| §3 스타일 `AreaOutline.module.css`(`.area`·`.lineSaved`·`.lineEditing`·`.point`) | TC-065·TC-067·TC-075(클래스 구분), M-13(굵기·색·`pointer-events`·`position` 실물) |
| §4 `wizard` CR-018(`area` 필드·초기값 `area: []`·pickArea 0~3개·reviewArea 4개) | TC-001, TC-002, TC-004, TC-059, TC-060, TC-061 |
| §4 `WizardStep` 5단계(`pickArea`·`reviewArea`) | TC-059, TC-060, TC-064, TC-065 |
| §4 상호 배타 ① 마법사 버튼 idle 전용 ② 끌기 idle 전용 ③ 끌기 중 버튼 불가 | ① TC-071 · ② TC-071 · ③ M-15(포인터 캡처 실물) |
| §4 `saving` CR-018(「이동 영역 설정하기」·reviewArea 「저장」·「취소」 비활성) | TC-024, TC-070 |
| §4 `shownShoulder` CR-018 식(이동 영역 단계에서 저장된 축 표시) | TC-064, TC-065, TC-071 |
| §4 `shownArea`(pickArea 열린 편집 · reviewArea 닫힌 편집 · 그 외 저장값) | TC-063, TC-064, TC-065, TC-067, TC-069 |
| §4 `valuesArea`(reviewArea 임시값 · 그 외 저장값) | TC-013, TC-064, TC-065, TC-067, TC-068, TC-069 |
| §5.1 `wizardReduce` `startArea`(·이동 영역 단계의 `start`) | TC-059 |
| §5.1 `wizardReduce` `pick` 누적(4번째 reviewArea, 새 배열) | TC-060 |
| §5.1 `wizardReduce` reviewArea `pick` 무시·이동 영역 단계 `cancel`·`saved` | TC-061 |
| §5.1 `applyWizard` reviewArea(클릭 순서 = 꼭짓점 순서, 모양 검사 없음) | TC-062 |
| §5.2 `persist`(이동 영역 저장·실패) | TC-067, TC-068, TC-070 |
| §5.2 (규칙) `settings.mouse === null` — 이동 영역 저장 | TC-074 |
| §5.2 `onPreviewClick` pickArea(손 그림 위 클릭도 꼭짓점, rect 기준, reviewArea 무시) | TC-065, TC-066, TC-071 |
| §5.2 `onReset` 기대값(area = core 기본값, pad 없음) | TC-025, TC-026(부분), TC-027 |
| §5.2 `guideText(w)`(areaPick1~4·areaReview) | TC-064, TC-065, TC-068 |
| §5.2 `onStartArea` | TC-064, TC-069 |
| §5.2 `onSave` 확장(reviewArea) | TC-067, TC-068 |
| §5.2 렌더 2(안내 `guideText(wizard)` — 1/4→4/4) | TC-065, TC-FLOW-06 |
| §5.2 렌더 3 `AreaOutline`(바탕 위·축 마커 아래, props) | TC-063 |
| §5.2 렌더 4 CR-018(idle 3개·pickArea·reviewArea·`cancelPickRef`·`saveRef` 공유·`disabled={saving}`) | TC-016, TC-064, TC-065, TC-070, TC-072 |
| §5.2 렌더 5 ③(「이동 영역」 `dd` 형식) | TC-013, TC-065, TC-067 |
| §5.2 `AreaOutline` 렌더 1(0점 null) | TC-075, TC-064 |
| §5.2 `AreaOutline` 렌더 2(`svg` width·height·aria-hidden·focusable) | TC-075, TC-063, TC-073 |
| §5.2 `AreaOutline` 렌더 3(좌표 × scale 문자열) | TC-075, TC-063, TC-065 |
| §5.2 `AreaOutline` 렌더 4(닫힌 4점 polygon / 그 외 polyline) | TC-075, TC-065 |
| §5.2 `AreaOutline` 렌더 5(편집 시 점 r=3) | TC-075, TC-065 |
| §5.2 `AreaOutline` 렌더 6(1px/2px·`#3b82f6`·흰 테두리) | TC-075(클래스 구분), M-13 |
| §5.2 `AreaOutline` 렌더 7(`React.memo`) | TC-075 |
| §5.2 파일 분리(400줄 초과 시 `WizardActions`·`MouseValues`) | 새 동작 없음 — 분리 뒤에도 TC-016·TC-013·TC-064·TC-065가 같은 DOM을 확인 |
| §6 P-3 CR-018(기본 영역 포함·수신 뒤 영역 선이 기본 영역으로) | TC-025, TC-FLOW-04 |
| §6 P-6 정상 | TC-063, TC-064, TC-065, TC-067, TC-FLOW-06, M-14 |
| §6 P-6 오류(취소·저장 실패·상호 배타·한 점 되돌리기 없음) | TC-068, TC-069, TC-071, TC-077 |
| §7 `set_settings` CR-018(`mouse.area` 포함·`pad` 없음, 코드 무관 message 표시) | TC-025, TC-067, TC-077 |
| §7 `settings://changed`(영역 반영) | TC-076, TC-FLOW-04, TC-FLOW-06 |
| §8 저장·취소 재사용(새 키 없음)·영역 선 aria-label 없음 | TC-009, TC-073 |
| §9 포커스 순서 CR-018(idle 3버튼 DOM 순서) | TC-016, M-09 |
| §9 이동 영역 단계 포커스(pickArea 「취소」·점 추가 중 유지·reviewArea 「저장」·idle 복귀 「어깨축 설정하기」) | TC-072, M-09 |
| §9 꼭짓점 지정 포인터 전용·영역 선 `aria-hidden` | TC-073, M-15 |
| §9 저장 중 「이동 영역 설정하기」 비활성 | TC-024 |
| §10 합성 순서(영역 선 추가 — 바탕 위·축 마커 아래, `pointer-events: none`) | TC-063, M-13 |
| §10 영역 선 표시 결정(평소 1px 표시·편집 중 편집 선) | TC-063, TC-064, TC-065, TC-067, M-13 |
| §12 `AreaOutline` 공용화 후보 | 해당 없음 — 후작업 후보 목록 |
| §13 RTM R-15·R-16·R-17 | 본 문서 「요구 ↔ TC」 |

### 사용자·이용 시나리오 ↔ TC-FLOW

| 행 | 요구ID | TC-FLOW | 비고 |
|---|---|---|---|
| S-1 | R-01, R-14 | TC-FLOW-01 | R-01 부분만. R-14 부분 보류 |
| S-2 | R-03, R-04 | — | **보류(다음 단계)**. R-05는 폐기(CR-020 — requirements v1.5 §2 S-2에서 삭제) |
| S-3 | R-06 | — | **보류(다음 단계)** |
| S-4 | R-10, R-12 | TC-FLOW-02, TC-FLOW-03 | |
| S-5 | R-17 | TC-FLOW-04 | 선행: bridge CR-018 · CR-018 화면 |
| S-6 | R-11, R-12 | TC-FLOW-05 | 선행: 충족(CR-016) |
| S-7 | R-15, R-16 | TC-FLOW-06 | 선행: CR-018 화면 · bridge CR-018 |
| S-8 | R-18 | TC-FLOW-07 | 선행: CR-026 화면 · bridge CR-026 · overlay CR-025 (CR-026) |

### CR-026 추적(증분 — 위 표와 겹치는 행은 이 절이 우선)

요구 ↔ TC

| 요구ID | TC | TC-FLOW | 비고 |
|---|---|---|---|
| R-18 | TC-078, TC-079, TC-080, TC-081, TC-082, TC-083, TC-084, TC-085, TC-086, TC-087, TC-088, TC-089, TC-090, TC-091, TC-092, TC-009(30키) | TC-FLOW-07 | 선행: CR-026 화면 · bridge CR-026 · overlay CR-025 `resolvePenPos` |
| R-11(추가 행) | TC-078, TC-084 ④, TC-085 | — | 펜 손이 생겨도 팔 파츠 끌기 결과가 같다 |
| R-17(추가 행) | TC-025(`penPos` null·키 5개), TC-087, TC-089 | — | 리셋 기대값에 `penPos: null` |

설계 항목 ↔ TC

| 설계 항목 | TC |
|---|---|
| §2 레이아웃 `img pen_up at penPos`·`dl.values … pen pos(if pen_up)` | TC-080, TC-081 |
| §3 `MousePartsTab` 끌어다 놓기 저장(`penPos`) · `mouseWizard` `pickDragTarget` | TC-082, TC-078 |
| §4 `drag`(CR-026 확장 — `target`·`from`) | TC-082, TC-084, TC-085 |
| §4 `pen`(파생) | TC-080, TC-081 |
| §4 `penHome`(파생, `resolvePenPos`) | TC-080, TC-089, TC-090 |
| §4 `shownPenPos`(파생) | TC-082, TC-083, TC-085 |
| §4 `shownPartPos`(CR-026 식 `drag?.target === 'part'`) | TC-085, TC-090 |
| §4 상호 배타(펜 손 ②④) | TC-085, TC-086, TC-087 |
| §5.1 `pickDragTarget` | TC-078, TC-079 (화면 경유: TC-085, TC-090) |
| §5.2 `onPreviewPointerDown`(CR-026) | TC-081, TC-082, TC-085, TC-086, TC-087 |
| §5.2 `onPreviewPointerMove`(CR-026) | TC-082, TC-083 |
| §5.2 `onPreviewPointerUp`(CR-026) | TC-082, TC-084, TC-085, TC-088 |
| §5.2 `onPreviewPointerCancel`(펜 손) | TC-084, TC-091 |
| §5.2 (CR-026) 렌더 개정 — 합성 순서·회전 없음·`.part` 클래스·값 목록 ④ | TC-080, TC-081 |
| §5.2 `onReset`(`penPos` null) | TC-089, TC-025 |
| §5.2 (규칙) `settings.mouse === null`(펜 손 저장) | TC-090 |
| §6 P-5(펜 손) 정상·오류 | TC-082, TC-088 |
| §7 `set_settings`(`penPos`) · `get_asset_manifest`(`pen_up` 크기·url) | TC-082, TC-080 |
| §8 `markerPen`(라벨 30키 — 위 설계 표 §8 행의 「29키」는 30키로 읽는다) | TC-092, TC-009, TC-080 |
| §9 접근성(펜 손) | TC-091 |
| §10 좌표 판정(펜 손 — 투명 픽셀도 사각형 안이면 잡힘) | TC-078, TC-079, TC-085 |

### CR-026 개정 요약 (증분 모드 v7)

| 구분 | TC | 처리 |
|---|---|---|
| 신규 | TC-078, TC-079 | `pickDragTarget` — `test/mouseWizard.test.ts` |
| 신규 | TC-080~TC-091, TC-FLOW-07 | 펜 손 렌더·pen_up 없음·끌기 정상·범위 제한·저장 0회·겹침 우선·마법사/저장 중 상호 배타·저장 실패·리셋·mouse null·접근성, S-8 흐름 — `test/MousePartsTab.test.tsx` |
| 신규 | TC-092 | 라벨 `markerPen` — `test/labels.test.ts` |
| 기대 개정 | TC-009 | 라벨 29키 → 30키(+`markerPen` = `손 위치`) |
| 기대 개정 | TC-025, TC-067 | `mouse` 키 정렬 `['area','hand','partPos','penPos','shoulder']`(5개), TC-025 리셋 인자 `penPos: null` |
| 픽스처만 | `MOUSE`·`DEFAULT_MOUSE_EXPECTED`를 쓰는 모든 TC(TC-027·TC-058·TC-074 등 기본값 전체 비교 포함), TC-005·TC-062(`mouseWizard.test.ts` `BASE`·기대 리터럴) | 픽스처에 `penPos: null` 추가. 단언 문장 변경 없음 |
| 영향 없음(확인) | TC-010, TC-013, TC-030, TC-049~TC-058 | 이들의 manifest(`HAND`·`ALL` 등)에 `pen_up`이 없어 img 수·값 목록 세 행·`/손 위치/` 부재 단언이 그대로 성립(R-10 용어 주: R-18 「손 위치」는 `pen_up`이 있을 때만). 팔 파츠 끌기 결과는 개정 핸들러에서도 같다(design §5.2 CR-026 개정 행) |
| **미반영(예산 초과)** | 수동 M-16 | 펜 손 끌기 실물 — 포인터 캡처·`pointer-events: none`, 놓은 뒤 settings.json `mouse.penPos`, 오버레이 쉬는 자세 손 자리 반영, 리셋 뒤 기본 위치. `manual-checklist.md`에 아직 쓰지 않았다 |
| **미확인(예산 초과)** | `test/SettingsApp.test.tsx` 픽스처 | 자체 `MouseSettings` 픽스처·기본값 기대가 있으면 `penPos: null`을 넣어야 bridge CR-026 반영 뒤 TC-FLOW-04 전체 비교·tsc가 통과한다 |

선행(CR-026, 2026-09-24 확인): 화면 소스 미적용(`pickDragTarget`·`drag.target/from`·`pen`·`penHome`·`shownPenPos`·펜 손 `<img>`·값 목록 ④·`markerPen` 없음), bridge CR-026 미확정(`MouseSettings.penPos`·`pen_up` 슬롯 없음), overlay CR-025 `resolvePenPos` 미구현(`src/` grep 결과 없음). 따라서 TC-078~TC-092·TC-FLOW-07·TC-009(30키)는 적용 전 예정된 FAIL. `penPos: null` 픽스처 때문에 bridge 반영 전에는 `yarn tsc --noEmit`이 스펙 파일을 거부하고, 현행 `DEFAULT_MOUSE_SETTINGS`(`penPos` 없음)와 전체 비교하는 TC-025·TC-027·TC-058·TC-074도 예정된 FAIL이다(TC-067·TC-049 등 props `mouse`를 펼쳐 저장하는 TC는 인자에 `penPos: null`이 실려 현행으로도 통과 예상).

### CR-028 추적(증분 v8 — 위 표와 겹치는 행은 이 절이 우선)

요구 ↔ TC

| 요구ID | 상태 | 자동 TC | 수동 | TC-FLOW |
|---|---|---|---|---|
| R-01 | 유효 | TC-009, TC-031, TC-032, TC-033, TC-034 (TC-040 ~ TC-043 폐기로 제외) | M-01, M-02 | TC-FLOW-01 |
| R-03 | 유효(보류 해제) | TC-094, TC-104, TC-119, TC-120, TC-121, TC-122, TC-123, TC-124, TC-125, TC-131 | M-19, M-24 | TC-FLOW-08, TC-FLOW-11 |
| R-04 | 유효(보류 해제) | TC-094, TC-104, TC-126, TC-127, TC-128, TC-129, TC-131 | M-24 | TC-FLOW-08 |
| R-06 | 폐기(CR-028 → R-23) | — (TC-042·TC-043 폐기) | — | — |
| R-14 | 폐기(CR-028 → R-25) | — (TC-040·TC-041 폐기) | — | — |
| R-10 · R-11 · R-12 · R-15 · R-16 · R-17 · R-18 | 유효 | 위 「요구 ↔ TC」·「CR-026 추적」 행 그대로(문구 출처만 바뀜 — R-26) | 같음 | 같음 |
| R-19 | 유효 | TC-031, TC-032, TC-094, TC-099, TC-101, TC-104, TC-105, TC-106, TC-130, TC-136, TC-151 | M-01, M-23 | TC-FLOW-01, TC-FLOW-10 |
| R-20 | 유효 | TC-009, TC-031, TC-093, TC-094, TC-095, TC-096, TC-097, TC-098, TC-100, TC-101, TC-102, TC-103, TC-107, TC-108, TC-136, TC-138, TC-140, TC-150 | M-22 | TC-FLOW-10 |
| R-21 | 유효 | TC-094, TC-104, TC-105, TC-109, TC-110, TC-112, TC-119 | M-19 | TC-FLOW-11 |
| R-22 | 유효 | TC-094, TC-104, TC-110, TC-111, TC-112 | M-20 | TC-FLOW-12 |
| R-23 | 유효(R-06 대체) | TC-094, TC-104, TC-105, TC-113, TC-114, TC-115, TC-116 | M-17, M-18 | TC-FLOW-09 |
| R-24 | 유효 | TC-094, TC-104, TC-117, TC-118 | M-21 | TC-FLOW-13 |
| R-25 | 유효(R-14 대체) | TC-094, TC-132 ~ TC-152, TC-148(R-18 연동) | M-23, M-24 | TC-FLOW-01 |
| R-26 | 유효 | TC-030, TC-032, TC-101 + 기존 `MousePartsTab.test.tsx`·`mouseWizard.test.ts`·`AreaOutline.test.tsx` 전 TC(U-9) | M-09 | TC-FLOW-02 ~ TC-FLOW-07 |

설계 항목 ↔ TC

| 설계 항목 | TC |
|---|---|
| design §1 탭 3개·금지 조건 / §2 탭 바·오류 줄(머리글 없음) | TC-031, TC-099, TC-102 / 시각(알약·검정 채움·초록) M-23 |
| design §3 `SettingsApp`(Provider·`Shell`)·탭 버튼 `TABS` | TC-031, TC-032, TC-098, TC-100, TC-101 |
| design §3 `MousePartsTab` 문구 출처(`useMessages`)·`labels.ts` 삭제 | TC-009, TC-030, TC-101 |
| design §3 파일 분할 계획(400줄) | 해당 없음(구현 규칙 — U-11 실행 로그) |
| design §4 `tab`(초기 general)·`language`·`t`·탭별 로컬 상태 | TC-031, TC-098, TC-100, TC-101 / 로컬 상태는 아래 general·images 행 |
| design §5.3 탭 전환·렌더 골격·언어 반영 효과·오류 줄 문구 | TC-032 · TC-031 · TC-031, TC-100, TC-101, TC-103 · TC-033, TC-102 |
| design §6 P-1·P-7·P-8, confirm 표(이미지 비우기 필수·위치 초기화 없음) | TC-031, TC-033, TC-034 · general G 행 · images I 행 · TC-143, TC-117 |
| design §7 v0.14 사용표 — `set_settings` / `set_autostart` / `reset_overlay_position` / `import_asset` / `remove_asset` / `pickPngFile(t.pickTitle)` / `setSettingsWindowTitle` / 상수(`isRequiredSlot`·`SCALE_MIN/MAX`·`CANVAS_MAX_*`) / `resolvePenPos` / 실패 표시 규칙 | TC-107, TC-109, TC-111, TC-120, TC-127, TC-148 / TC-113 ~ TC-116 / TC-117, TC-118 / TC-139 ~ TC-141 / TC-143, TC-146, TC-147 / TC-138, TC-150 / TC-031, TC-100, TC-103 / TC-133, TC-131, TC-136 / TC-148 / TC-097, TC-102 |
| design §8(→ i18n.md 이관) | TC-009, TC-094 |
| design §9 포커스 순서·언어 전환 시 포커스 유지·`<html lang>` | TC-031, TC-101, TC-130, TC-151, M-09, M-22 |
| design §11 D-3(표준 원소 직접 — 수용)·D-4(초록 토큰) | 편차 기록(역할·키보드는 TC-104, TC-130) · M-23 |
| design §12 공용화 후보(`ToggleSwitch`·`SettingsCard`·`ConfirmDialog`) | 해당 없음(후작업 목록). 부품 계약은 TC-105, TC-106, TC-152 |
| general §1 레이아웃 / §4 렌더 1 ~ 5 | TC-104, M-23 |
| general §2 컴포넌트 표 / §2.1 `ToggleSwitch` / §2.2 `SettingsCard` | TC-104, TC-119, TC-131 / TC-105 / TC-106 |
| general §3.1 `autostartPending`·`autostartNotice`·`resetPending` | TC-113 · TC-114 · TC-117 |
| general §3.2 `saveSettings`·`onLanguageChange`·`onToggleLock`·`onToggleTaskbar`·`onToggleAutostart`·`onResetPosition`·id 목록·연속 클릭 주·core 소유 `autostart` 주 | TC-107 ~ TC-112 · TC-107, TC-108 · TC-109, TC-110 · TC-111 · TC-113 ~ TC-116 · TC-117, TC-118 · TC-130 · TC-112 · TC-109, TC-116 |
| general §3.3 `generalValues` | TC-131, TC-119 |
| general §3.4 `scaleDraft`·`scaleTimer`·`idleDraft`·`idleInvalid`·파생 3개 | TC-120, TC-125 · TC-122, TC-123 · TC-127 · TC-128 · TC-119, TC-126 |
| general §3.5 `onScaleInput`·`commitScale`·`onScalePointerUp`·`onScaleKeyUp`·`onScaleBlur`·정리·`onIdleInput`·`commitIdle`·`onIdleKeyDown`·`onIdleBlur`·주(끌기 중 수신) | TC-120 · TC-120, TC-121, TC-124, TC-125 · TC-120 · TC-122 · TC-123 · TC-123 · TC-127, TC-128 · TC-127 ~ TC-129 · TC-127 · TC-127, TC-128 · TC-125 |
| general §3.6 렌더 1 ~ 4 | TC-119, TC-126, TC-128 / 색 M-23 |
| general §5 G-1 ~ G-7 | G-1 TC-107, TC-108, TC-101 · G-2 TC-120, TC-124 · G-3 TC-127 ~ TC-129 · G-4 TC-109, TC-110 · G-5 TC-111, TC-110 · G-6 TC-113 ~ TC-115 · G-7 TC-117, TC-118 |
| general §6 접근성 | TC-130, TC-105, TC-113, TC-119, TC-128 / 실제 Tab·낭독 M-09, M-22 |
| images §1 레이아웃 / §6 렌더(`ImagesTab`·`ImageSlotCard`·`AddSlotCard`·`ConfirmDialog`) | TC-136, M-23 / TC-136, TC-137, TC-141, TC-142, TC-143 ~ TC-145, TC-151, TC-152 |
| images §2 컴포넌트 표 / §3 `imageSlots` 전 행·예 2건 | TC-136, TC-137, TC-141, TC-152 / TC-132 ~ TC-135 |
| images §4 `slotBusy`·`cardError`·`confirm`·`groups` | TC-139, TC-143 · TC-140, TC-146 · TC-143, TC-144 · TC-136 |
| images §5 `cardTitle`·`onChangeImage`·`ensurePenPos`·`onRequestClear`·`onConfirmClear`·`onCancelClear`·주 3개 | TC-136, TC-143, TC-150 · TC-138 ~ TC-141 · TC-148, TC-149 · TC-142, TC-143 · TC-143, TC-146, TC-147 · TC-144 · TC-147, TC-141, TC-139 |
| images §7 I-1 ~ I-4·confirm 표 / §8 접근성 | I-1 TC-138 ~ TC-140 · I-2 TC-141 · I-3 TC-142 ~ TC-147 · I-4 TC-148, TC-149 · TC-143 / TC-151, TC-142, TC-143, TC-145 |
| i18n §1 구조(`labels.ts` 삭제·파일 표) / §2 `Messages` / §3 함수·Provider / §4.1 ~ §4.6 / §5 삭제 키 / §6 글꼴 | TC-009, TC-093 / TC-093 / TC-095 ~ TC-098 / TC-093, TC-094, TC-095(+ UI TC-100, TC-101, TC-150 · 검수 M-22) / TC-009 / M-22 |

사용자·이용 시나리오 ↔ TC-FLOW (v8 전체)

| 행 | 요구ID | TC-FLOW | 비고 |
|---|---|---|---|
| S-1 | R-01, R-19, R-25 | TC-FLOW-01 | CR-028 개정(보류 해소) |
| S-2 | R-03, R-04 | TC-FLOW-08 | CR-028 신규 |
| S-3 | R-23 | TC-FLOW-09 | CR-028 신규(R-06 대체) |
| S-4 | R-10, R-12, R-26 | TC-FLOW-02, TC-FLOW-03 | 탭 이름만 개정 |
| S-5 | R-17 | TC-FLOW-04 | |
| S-6 | R-11, R-12 | TC-FLOW-05 | |
| S-7 | R-15, R-16 | TC-FLOW-06 | |
| S-8 | R-18 | TC-FLOW-07 | |
| S-9 | R-20, R-19 | TC-FLOW-10 | CR-028 신규 |
| S-10 | R-21, R-03 | TC-FLOW-11 | CR-028 신규 |
| S-11 | R-22 | TC-FLOW-12 | CR-028 신규 |
| S-12 | R-24 | TC-FLOW-13 | CR-028 신규 |

CR ↔ TC: CR-028 → 폐기 TC-040 ~ TC-043 / 개정 TC-009, TC-030, TC-031, TC-032, TC-092(원천), TC-FLOW-01 / 도우미·픽스처 TC-033 ~ TC-039, TC-076, TC-077, TC-FLOW-02 ~ TC-FLOW-06 / 신규 TC-093 ~ TC-152, TC-FLOW-08 ~ TC-FLOW-13 / 수동 M-01·M-09 개정, M-17 ~ M-24 신설.

### CR-028 개정 요약 (증분 모드 v8) — 기존 스펙 개정 목록

| 구분 | TC · 파일 | 처리 |
|---|---|---|
| 폐기 | TC-040, TC-041, TC-042, TC-043 (`SettingsApp.test.tsx`) | 임시 자리표시 탭 삭제(design §5.3). 사례 삭제 |
| 원천 교체 | TC-009, TC-092 (`labels.test.ts` 전면 개정) | `import { labels } from '../labels'`(삭제 대상) → `import { ko } from '../i18n/ko'`. 옛 30키 = 이관 26키 확인 + 삭제 4키 부재. `tabImages`·`tabMouse` 기대 문구 변경 |
| 기대 개정 | TC-031, TC-032 (`SettingsApp.test.tsx`) | `h1` 없음, 탭 `['기본 설정','이미지 설정','어깨축·손 위치']`, 기본 탭 general, `<html lang>`·`setSettingsWindowTitle` 단언 추가 |
| 기대 개정 | TC-030 (`MousePartsTab.test.tsx`) | region 이름 `마우스 파츠` → `어깨축·손 위치` |
| 도우미·픽스처만 | TC-033 ~ TC-039, TC-076, TC-077, TC-FLOW-02 ~ TC-FLOW-06 (`SettingsApp.test.tsx`) | `openMouseTab()`이 누르는 탭 이름, `SETTINGS`에 v0.14 필드 3개, mock에 `resetOverlayPosition`·`setSettingsWindowTitle`·`@tauri-apps/api/window`, 오류 픽스처 code를 정본 표기(`settings.io`·`asset.manifest`·`settings.invalid` — ko 단언은 message라 결과 불변), `expectNoUnusedBridge`에 `resetOverlayPosition` |
| 픽스처만 | `MousePartsTab.test.tsx` `SETTINGS` | v0.14 필드 3개 추가(저장 인자는 `{...SETTINGS, mouse}`라 단언 불변 — tsc 통과용) |
| 영향 없음(확인) | `mouseWizard.test.ts`, `AreaOutline.test.tsx` | `labels` import·Settings 픽스처 없음 |
| 신규 스펙 | `i18n.test.ts`(TC-093 ~ TC-098), `GeneralTab.test.tsx`(TC-104 ~ TC-130), `generalValues.test.ts`(TC-131), `imageSlots.test.ts`(TC-132 ~ TC-135), `ImagesTab.test.tsx`(TC-136 ~ TC-152), `SettingsApp.test.tsx`(TC-099 ~ TC-103, TC-FLOW-01·08 ~ 13) | |

## 설계 확인 필요 (관리자 인계, 문서 수정은 소유자)

### CR-028 (2026-09-24)

- **G-1. 비우기 뒤 포커스 복귀가 비활성 버튼에 걸리는 경우 미정의(images §5 `onConfirmClear`, §7 I-3).** 단일 슬롯(또는 마지막 장)을 비울 때 `assets://changed`가 `remove_asset` 응답보다 먼저 오면 카드는 남지만 누른 「기본값」이 `canClear=false`로 **비활성**이 되어 `c.trigger.focus()`가 무효 — 포커스가 body로 빠진다. `isConnected === false` 분기는 카드가 사라진 경우만 다룬다. 대체 대상(예: 같은 카드 「이미지 변경」) 결정 필요. 현재 TC-143은 응답이 먼저인 경우, TC-147은 카드가 사라진 경우만 단언한다.
- **G-2. 범위 밖 저장값 표시·core 검증(cross-layer).** 결정(정본 60 ~ 3600초)과 달리 contract §6 `settings.invalid` 규칙에 `idleSeconds` 범위가 없다(배율·이동 영역만). 손으로 고친 settings.json(예: 7200초)은 `idleSecondsToMinutes` → 120으로 `max=60` 밖 값이 입력 칸에 보인다. core 검증에 넣을지·ui 표시를 고정할지 결정 필요 — TC 없음.
- **G-3. `<output>`의 암묵 역할 `status`.** 배율을 끄는 동안 값마다 낭독될 수 있고, 같은 탭의 자동 실행 안내 줄도 `role=status`라 역할 조회가 겹친다(스펙은 `output`·`p[role=status]` 셀렉터로 피했다). 중복 낭독 의도 확인 필요(§6은 `aria-valuetext`만 언급).
- **G-4. 스펙이 고정한 해석.** ① TC-100: 저장 언어가 ja여도 첫 렌더에 ko 제목을 한 번 설정한 뒤 ja로 바꾼다(§5.3 「첫 마운트(ko)와 언어가 바뀔 때마다」 그대로) ② TC-139: 파일 대화상자 대기 중에는 카드 버튼이 활성 ③ TC-148: `ensurePenPos`가 끝날 때까지 `slotBusy` 유지(finally 순서) ④ TC-125: 끄는 중 수신 뒤 놓으면 최신 props 기준으로 저장 ⑤ TC-122: 300ms 예약 콜백이 마지막 draft를 저장(state 클로저로 구현하면 FAIL — ref 필요) ⑥ TC-130: 포커스 순서를 DOM 순서로 판정. 다르게 의도했다면 알려 달라.
- **G-5. `pickPngFile` 취소 때 기존 카드 오류 유지 여부 미정(images §5 `onChangeImage` — 성공 때만 `setCardError(null)`).** 스펙은 판정하지 않는다.
- **G-6. design RTM 동기화(ui-designer 몫).** R-03 · R-04 · R-19 ~ R-26 「미작성」, R-01 「개정 인계」, R-05·R-06·R-14 비고의 TC-040 ~ TC-043 → 이 문서 「CR-028 추적」 번호로 갱신. R-26 비고 「기존 TC 전부 통과(문구 출처만)」는 정확히는 TC-030 region 이름 단언 1건이 바뀐다(`tabMouse` 새 문구).
- **G-7. ja·en 검수(미결 U-1).** 사용자가 §4.1 문구를 고치면 TC-095 리터럴만 같이 고친다(나머지 ja·en 단언은 사전 값을 import해 비교).

### CR-026 (2026-09-24)

- **E-1. 놓은 직후 옛 자리 순간(펜 손).** CR-016 1번과 같은 구조다 — 놓을 때 `setDrag(null)` 뒤 `persist`라 `settings://changed` 전까지 펜 손이 `penHome`(옛 자리)으로 돌아간다. TC-082는 설계대로 이 중간 상태를 단언한다. 바꾸면 TC-082·TC-085·TC-FLOW-07을 같이 고친다.
- **E-2. 끌기 중 `pen_up`이 사라지는 경우 미정의.** `assets://changed`로 `pen`이 undefined가 되면 `onPreviewPointerMove`의 `size = pen`이 없다(CR-016 3번과 같은 공백). 규칙이 없어 TC를 만들지 않았다.
- **E-3. 기본 위치가 캔버스 밖일 수 있음.** `penHome`(`defaultPenPos`)은 제한이 없어 큰 그림·가장자리 `hand`면 그림 일부가 캔버스 밖에 놓인다. 첫 끌기에서 `clampPartPos`로 들어오면서 `from`과 달라 저장된다. 의도 확인 필요 — TC 없음.
- **E-4. 스펙이 고정한 해석 2건.** ① 값 목록 「손 위치」는 `dt` 네 번째(§2 `dl.values` 순서·§5.2 「④」) ② 펜 손 `<img>` 클래스 = 팔 파츠와 같은 `.part`(렌더 개정 `className=part`). 구현이 다르면 TC-080 FAIL — 설계가 다르게 의도했다면 알려 달라.
- **E-5. design RTM R-18 「예정 TC」 동기화.** 이 문서 번호(TC-078~TC-092, TC-FLOW-07)로 갱신 필요 — ui-designer 몫.

### CR-018 (2026-09-24)

- **C-1. `AreaOutline` 점 1개 렌더(§5.2 렌더 4).** 「아니면(편집 중 1~3점) `<polyline>`」과 「점 1개면 선 없이 5단계 점만 보인다」가 함께 있어, 1점일 때 `<polyline>` 요소를 그리는지(보이지 않을 뿐) 안 그리는지 정해지지 않았다. TC-075·TC-065는 1점에서 polygon 없음·점 1개만 단언한다. ui-designer 결정 필요.
- **C-2. 기본 이동 영역 값의 출처.** design §5.2 `onReset`·requirements §3은 「core `settings.md` 기본값(ui 하드코딩 없음)」이라 값을 적지 않는다. 스펙은 관리자 전달 정정값 `DEFAULT_AREA` = [(375,525), (495,525), (495,625), (375,625)](처음 전달된 [(430,515), …]은 폐기)을 기대값으로 고정했다. core `settings.md`·bridge contract가 다른 값을 확정하면 TC-025·TC-027·TC-063②·TC-074·TC-FLOW-04·M-07 기대값을 같이 바꿔야 한다 — core·bridge 확정값 대조 필요.
- **C-3. design RTM·표 동기화.** §13 RTM 「예정 TC」 열이 R-15·R-16 「미작성」, R-17 「기존 R-09/R-13 TC 개정 필요」로 남아 있다 → 이 문서 요구 ↔ TC 표 번호로 갱신 필요. §5.2 `onPreviewClick` 행의 요구ID가 R-10뿐이다(pickArea 처리 = R-15). ui-designer 몫.
- **C-4. 값 목록 축 행과 영역 행의 비대칭(§5.2 렌더 5).** 축 `dd`는 review 중에도 저장값(`mouse.shoulder`), 영역 `dd`는 reviewArea 중 임시값(`valuesArea`)이다. 설계 문구대로 단언했다(TC-018 축 `dd` 저장값, TC-065 영역 `dd` 임시값). 의도가 아니면 ui-designer 결정 필요.

### CR-016 (이전)

1. **놓은 직후 옛 자리로 되돌아가는 순간(§4 `shownPartPos` · §5.2 `onPreviewPointerUp`).** 설계는 놓을 때 `setDrag(null)` 뒤 `persist`를 부르고, 표시는 `drag ? drag.pos : mouse.partPos`다. 그래서 저장이 **성공해도** `settings://changed`가 도착할 때까지 손 그림이 옛 자리로 돌아갔다가 새 자리로 튄다(한 IPC 왕복 동안의 깜빡임). TC-049는 현재 설계대로 이 중간 상태(옛 자리)를 단언한다. 저장 중에는 놓은 자리를 유지하도록 설계를 바꾸면 TC-049 ⓐ의 「재렌더 전」 단언과 TC-055 ②의 「옛 자리 = props」 단언을 같이 바꿔야 한다. ui-designer 결정 필요.
2. **design.md RTM 「예정 TC」 열 동기화.** R-11 「미작성」, R-12·R-13 「개정 필요」로 남아 있다. 이 문서의 요구 ↔ TC 표 번호(R-11: TC-045~TC-058 등, R-12: TC-010·TC-011·TC-047·TC-048 등, R-13: TC-024~TC-028)로 갱신 필요 — ui-designer 몫.
3. **끌기 중 `mouse_base`가 사라지는 경우 미정의(§5.2 `onPreviewPointerMove`).** 끌기 도중 `assets://changed`로 `part`가 undefined가 되면 `clampPartPos(…, part, canvas)`의 size가 없다. 설계에 처리 규칙이 없어 TC를 만들지 않았다(요구 밖 TC 금지). 드문 경우지만 규칙(예: `part` 없으면 무시 또는 drag 취소)을 정해 주면 TC를 추가한다.

## 변경 대기열(미검증)

| Q-nn | 일자 | CR-ID | 변경 요약 | 변경 파일 | 영향 TC 후보 | 신규 TC 필요 | 상태 |
|---|---|---|---|---|---|---|---|
| Q-01 | 2026-09-23 | — (bridge 구현 대기, contract v0.3 §3.6 · CR-007 계열) | hand-anchor 「호출 없음」 검사 재실행 고리. 조건: bridge 래퍼 `getHandAnchor`(commands)·`onHandAnchorChanged`(events) 생성 후, 설정 화면이 이를 호출·구독하지 않음을 재확인한다 | `src/bridge/commands.ts` · `src/bridge/events.ts`(bridge-implementer 소관) | TC-031, TC-040, TC-041, TC-042, TC-043, TC-FLOW-02, TC-FLOW-05 | 없음(기존 TC 재실행. 스펙은 실물 export 위에 mock을 덮어쓴다 — `bridge/events` mock의 `EVENTS`에 `handAnchorChanged` 추가) | 전환됨(TC-031, TC-040~TC-043, TC-FLOW-02) · 재실행 대기(**조건 충족 2026-09-23** — 두 래퍼 존재 확인, 다음 `/test ui`에서 재실행) |
| Q-02 | 2026-09-25 | CR-039 | 초기 조회 실패 시 200·500·1000ms 간격 최대 3회 재시도, 끝내 실패할 때만 오류 줄 | `src/settings/index.tsx` · `src/components/utils/fetchWithRetry.ts`(신규) | TC-033·TC-034(조회 1회·즉시 오류 → 4회 뒤 오류)·TC-155·TC-102(오류 줄 대기 시간) | 예 — `SettingsApp.retry.test.tsx` 2건(ui-fixer 초안, TC-ID 부여 필요) | 대기 |
| Q-03 | 2026-09-26 | CR-049 | 자동 실행 취소(`autostart.cancelled`) 분기·안내·사전 키 삭제, 오류 code 23 → 22, `autostartDesc`·`autostartPending` 일반 권한 기준 문구로 | `src/settings/components/GeneralTab.tsx` · `src/settings/i18n/{types,ko,ja,en}.ts` | TC-093·TC-094·TC-246(code 수·사전), TC-104·TC-113(설명·대기 문구), TC-114(취소 → 폐기 또는 「모든 실패 = 오류 줄」로 대체), TC-FLOW-09(취소 단계 제거), SettingsApp·GeneralTab·i18n 스펙 | TC-114 대체 필요(모든 `setAutostart` 실패가 오류 줄로 가고 안내 줄은 비는지) | 검증됨(2026-09-26, 328 PASS) |
| Q-04 | 2026-09-26 | CR-052 | 카드 1 설명문(timerCardDesc) 삭제·스톱워치 토글 설명 새 문장(3개 국어), alarmCardDesc 반복 재생 문구, 스톱워치 모드·둘 다 꺼짐일 때 시작 시간 입력 회색 비활성(disabled + aria-disabled, 안내 줄 비움, 잠김과 같은 `.durationOff`), 탭 UI 다듬기(구분선 `.group`·카드 간격 12px·시·분·초 한 상자·슬라이더 값 `.value`) | `src/settings/components/{TimerTab,CountdownTimeInput,AlarmSoundCard}.tsx` · `TimerTab.module.css` · `src/settings/i18n/{types,ko,ja,en}.ts` | TC-094·TC-246·TC-286(i18n 사전), TC-248·TC-268·TC-285·TC-287·TC-274·TC-275·TC-276(TimerTab), TC-277(AlarmSoundCard 문구), TC-FLOW-28, CountdownTimeInput 컴포넌트 스펙(TC-276 컴포넌트) | 예(inactive 비활성 TC — 스톱워치·둘 다 꺼짐·타이머 켜짐 stopped 3경우, aria-disabled·안내 줄 빈 값·입력 중 값 버림) | 검증됨(2026-09-27) |
| Q-05 | 2026-09-27 | CR-053 | hair·pomo_char = 복원 칸(「기본값」 = restoreDefaultAsset 늘 활성) + 셋째 버튼 「비우기」(removeAsset, 등록 시만 활성, 비운 뒤 포커스 「이미지 변경」). kb_down_0 = 비우기 칸(「기본값」 = removeAsset, 마지막 장 규칙), 셋째 버튼 제거. 기본 그림 7장(다운로드 설명·덮어쓰기 개수 7). DEFAULT_TIMER_SETTINGS textPos (142,458)·rotation 9 | `src/settings/imageSlots.ts` · (bridge v0.24 `src/bridge/types.ts` 인용) | Hair.test.tsx TC-193·196·200·201·202·206·207·TC-FLOW-18 · imageSlots.test.ts TC-133·135·177·192·229·232 · ImagesTab.test.tsx TC-142·147·179·182·189·233·236·237·TC-FLOW-15·17·22·23 · PomoCards.test.tsx TC-241·242·TC-FLOW-25 · TimerTab.test.tsx TC-249 · timerValues.test.ts TC-239·269 | 예 — pomo_char 「비우기」·복원 TC | 검증됨(2026-09-27) |
| Q-07 | 2026-09-27 | CR-054 | 「기본 설정」 탭 맨 아래 「초기화」 카드(`ResetAllCard` — 위험 버튼·확인창·`resetAppData()`·상태 줄 `role=status`), 화면 값은 기존 `settings://changed`·`assets://changed` 구독으로만(낙관적 갱신 없음), i18n 단순 키 +8(128 → 136)·errors +2(`ERROR_CODES` 25 → 27) | `src/settings/components/ResetAllCard.tsx`(신규) · `GeneralTab.tsx` · `GeneralTab.module.css` · `src/settings/i18n/{types,ko,ja,en}.ts` | 개정 TC-093 · TC-094 · TC-246 · TC-286(`i18n.test.ts`), TC-104 · TC-130(`GeneralTab.test.tsx`), TC-099 · TC-101(`SettingsApp.test.tsx`) — 스펙 개정 완료. mock 목록 정합 11개 스펙 — **불필요 확정(v25)**: 11개 모두 `...actual` 전개라 실물 `resetAppData` export 포함·「전체 초기화」 미조작으로 결과 불변(「CR-054 개정 TC」 표 사유) | 예 — 신규 TC-293 ~ TC-304, TC-FLOW-31 · TC-FLOW-32(TDD 선행 — 구현 전 Red) | 전환됨(TC-293 ~ TC-304, TC-FLOW-31, TC-FLOW-32) · 잔여 없음(v25 닫힘) |
| Q-08 | 2026-09-27 | CR-057 | 이동 영역 문구 개선 — 새 키 `areaDesc`(idle에서 안내 줄 아래 `.guide` 줄로 표시, 다른 단계에서는 없음), `areaStart`·`areaPick1~4`·`areaReview` 문구 교체(ko 🔒·ja·en) | `src/settings/i18n/{types,ko,ja,en}.ts` · `src/settings/components/MousePartsTab.tsx` | TC-009(labels 이관 문구)·TC-094(ko 새 키 개수·문구)·i18n 키 수(simpleKeys)·TC-016·TC-024·TC-064~TC-074·TC-077·TC-049·TC-082·TC-086·TC-222·TC-225·TC-FLOW-02·04·06 및 ja·en 문구 단언 | 예 — areaDesc 표시(idle만·3개 국어) 1건 | 검증됨(2026-09-27) — 신규 TC-305, 개정 TC-009 · TC-094 · `IDLE_BUTTONS` 단언 전부 · TC-024 · TC-063 ~ TC-074 · TC-086 · TC-222 · TC-225 · TC-077 · TC-FLOW-02 · TC-FLOW-04 · TC-FLOW-06(「CR-057 개정」 절) |

## 변경이력

| 일자 | 내용 |
|---|---|
| 2026-09-27 | (최신 행) v26 — **CR-057 대기열 Q-08 정식 TC 전환(이동 영역 설명 줄·🔒 문구 교체).** ① 신규 TC-305(`MousePartsTab.test.tsx` `it.each` ko·ja·en — `areaDesc` 설명 줄은 idle에서만, 안내 줄 바로 아래 형제·같은 `.guide`·role/aria-live 없음·버튼 위, pickArea·reviewArea·pickShoulder·review에서는 없음, 안내 줄 role=status 1개 불변, bridge 쓰기 0회) ② 개정(번호 유지, 판정 불변 — 문구·개수만): TC-009(`labels.test.ts` area* 6키 새 ko 문구) · TC-094(`i18n.test.ts` 단순 키 136 → 137·세 사전 `areaDesc` 존재, 「새 키 41개」 불변) · `MousePartsTab.test.tsx`(`AREA_START`·`IDLE_BUTTONS`·`G_AREA`·`G_AREA_REVIEW`·제목) · `DragHit.test.tsx`(TC-222·TC-225) · `SettingsApp.test.tsx`(TC-077·TC-FLOW-02·04·06) ③ 「CR-057 개정」 절(읽기 규칙·개정 표·추적 3종·설계 확인 필요 L-1 ~ L-4) 신설 ④ 대기열 Q-08 → 「TC 전환됨(검증 대기)」. 수: 자동 304 → 305 · TC-FLOW 32 · 수동 54 그대로 |
| 2026-09-27 | v25 서술 정리 — **CR-054 서술만 정리(구현 완료·자동 PASS 뒤, 판정·TC 수 불변)**. ① 「설계 확인 필요」 K-2 TC 범위 TC-293 ~ TC-303 → TC-293 ~ TC-304(TC-304 반영) ② TC-FLOW-31·32 머리 Steps를 사례별로 분리(사례 C·사례 2 = 확인 → pending 중 이벤트(TC-303 ③) → 해결/reject 순서, 「순서는 사례 bullet이 정한다」 명시, FLOW-32 사례 1의 실패 뒤 이벤트 참조를 TC-303 ②로 특정) ③ 「CR-054 개정 TC」 표 아래 「`events` mock은 바뀌지 않는다」 → 새 이벤트 구독·events mock 목록 추가 없음(v25 `onTimerChanged` `vi.fn` 전환은 TC-296 단언용)으로 바로잡음 ④ `ResetAllCard.test.tsx` TC-301의 항상-참 단언 `expect(Object.keys(KO_NEW)).toHaveLength(8)`(로컬 기대값 표를 세는 것) 삭제 — 주석으로 기대값 표임을 표기, 사전 대조 단언은 그대로 |
| 2026-09-27 | v25 — **CR-054 보정(ui-test-checker MAJOR 1·MINOR 4, ui-test-conflict-checker C2-1 반영, 지적 항목만)**. 기준 general-tab §7.2 언마운트 **규범**(매니저 결정)·§7.6 「응답과 이벤트 도착 순서에도 의존하지 않는다」·contract v0.25 §5.10 처리 순서(이벤트 2·3·6단계가 반환 전). ① 신규 TC-304(SettingsApp — pending 중 탭 이동으로 카드 언마운트 → reject는 창 공통 오류 줄·resolve는 오류 줄 없음, 복귀 시 카드 초기값, `resetAppData` 1회) — 추적표 §7.2 「언마운트 판정 안 함」 폐기 ② TC-FLOW-31 사례 C(settings → assets → 응답: pending 중 값 RESET_VALUES여도 disabled·pending 유지, 응답 뒤 done·포커스 복귀, 최종 화면 동일)·A·B 전제(응답이 이벤트를 앞지른 경우) 명시, TC-FLOW-32 사례 2·TC-303 ③(이벤트 → reject: 오류 줄 + RESET_VALUES·상태 줄 빈 문자열·버튼 활성·포커스 복귀), 추적표 §7.6 응답↔이벤트 행 신설 ③ TC-FLOW-31 스펙의 공허 단언 `expect(onError).not.toHaveBeenCalled()` 삭제(오류 줄 0개로 판정) ④ TC-296 ⓒ `onHandAnchorChanged`·`onTimerChanged` 0회(`onTimerChanged` mock `vi.fn` + beforeEach 구현 재설정) ⑤ TC-293 원소 `BUTTON` 단언 + M-54f ④ Enter·Space 관찰(user-event 미설치로 자동 키 TC 불가) ⑥ 「CR-054 개정 TC」 절 머리 「앞 본문을 대체」·원 본문 TC-093·094·099·101·104·130·246·286 머리 「개정(CR-054)」 ⑦ Q-07 닫힘(11개 스펙 `...actual` 전개 — 추가 불필요 확정) ⑧ manual-checklist v18(M-54c ⑥ 타이머 진행 상태 관찰, D-7 경로 `%APPDATA%\com.kuro.keyviewer\` 통일 — K-1 닫힘). 수: 자동 303 → 304(유효 296 · 폐기 8)·TC-FLOW 32·수동 54 |
| 2026-09-27 | v24 — **CR-054 반영(전체 초기화 R-56 🔒 베타 전용, 증분 모드, TDD 선행)**. 기준 requirements R-56·S-30, general-tab §1·§2·§4-6·§5 G-8·§6·§7, i18n §4.11·§4.6 CR-054 주, contract v0.25 §5.10·§4·§6, 수용 기준 `data-reset-03-packet-ui.md` §5(에러 code 수는 계약 26 우선). CR-053 절 뒤 「CR-054 개정」 절 신설(신규 TC 본문·개정 표·추적 3종·설계 확인 필요 K-1 ~ K-4). 신규 TC-293 ~ TC-303, TC-FLOW-31(S-30 정상 — 두 이벤트 순서)·TC-FLOW-32(S-30 실패) — 스펙 `test/ResetAllCard.test.tsx` 신규. 개정 TC-093·TC-094(단순 키 128 → 136, errors 27)·TC-246·TC-286(`ERROR_CODES` 25 → 27, 슬라이스), TC-104(카드 5장)·TC-130(포커스 끝 「전체 초기화」·상태 줄 2개), TC-099(버튼 2개)·TC-101(en h2 5장), mock `resetAppData` 추가(GeneralTab·SettingsApp 스펙). 대기열 Q-07 등록·전환됨(번호 Q-06은 v23 행에 언급되나 표에 행이 없어 충돌 방지로 건너뜀). manual-checklist v17(M-54a ~ M-54f, D-7 전제). 수: 자동 292 → 303(유효 295 · 폐기 8)·TC-FLOW 30 → 32·수동 48 → 54 |
| 2026-09-27 | (최신 행 — 표 머리에 추가) v23 — **CR-053 반영(배포용 기본 세트 3차 🔒, 대기열 Q-05 정식 TC 전환, 증분 모드)**. 기준 확정사항 CR-053 줄·images-tab §15·timer-tab §3 상수 행·contract v0.24(`DEFAULT_ASSET_SLOTS` 7개, `DEFAULT_TIMER_SETTINGS` (142,458)·9). CR-052 절 뒤 「CR-053 개정」 절 신설(신규 TC 본문·개정 표·추적 3종). 신규 TC-291(뽀모도 인물 「비우기」)·TC-292(뽀모도 인물 「기본값」 복원) — `PomoCards.test.tsx`. 개정: Hair TC-193·196·200·201·202·206·207·TC-FLOW-18, imageSlots TC-133·135·177·178·192·229·232, ImagesTab TC-142·147·179·182·189·233 ~ 237·TC-FLOW-15·17·22·23, PomoCards TC-241·242·TC-FLOW-25(앞 패스 스펙 개정 완료), timerValues TC-239·TC-269, TimerTab TC-249(이 패스 스펙 개정). manual-checklist v16(M-29·M-30·M-33·M-43·M-45f). Q-05·Q-06 상태 불변(관리자 지시). 수: 자동 290 → 292(유효 284 · 폐기 8)·TC-FLOW 30·수동 48 |
| 2026-09-27 | v22 — **CR-052 반영(대기열 Q-04 정식 TC 전환, 증분 모드)**. 기준 확정사항 CR-048 블록 「수정 (CR-052)」 🔒·timer-tab §14.16·§14.2·i18n CR-052 행. CR-050 절 뒤 「CR-052 개정」 절 신설(신규 TC 본문·개정 표·추적·Z-5). 신규 TC-288(`CountdownTimeInput.test.tsx` — `inactive` 회색 비활성), TC-289·TC-290(`TimerTab.cr052.test.tsx` 신규 — 문구·미리 듣기 `loop` 없음). TC-276 본문 Then 「나머지 4사례 입력 가능」 → 타이머 모드 아님 4사례 비활성. 개정 TC 12건 스펙은 앞 패스에서 완료. Z-2 닫음, Z-5(CSS 다듬기 미커버) 신설. 수: 자동 287 → 290(유효 282 · 폐기 8)·TC-FLOW 30·수동 48 |
| 2026-09-23 | 최초 작성(신규 모드, 보강 화면). 1단계 범위 TC-001~TC-039 · TC-FLOW-01~04 · 수동 M-01~M-10. CR-003(리셋)·CR-004·CR-005·CR-006 커버. 기존 `src/settings/mouseWizard.test.ts`는 `test/mouseWizard.test.ts`로 대체 방침 |
| 2026-09-23 | v2 — 독립 검증 FAIL 반영(ui-test-checker·ui-test-conflict-checker). 신규 TC-040~TC-043(이미지·동작 탭 임시 자리표시, BLOCKER-1). TC-001·TC-004 전이 사례 추가, TC-012(NO_ARM 몸통 1장)·TC-018(review 선택 중 클래스)·TC-029(pickShoulder 취소 포커스, 저장 호출 단언, 경합 전제) 보강, TC-026 호출 횟수·인자 단언, TC-039 ⓑ 정정, TC-021 `code:'unknown'` 출처, TC-031 hand-anchor 공허 통과 조건, TC-027·028 동기화 지점을 현행·목표 공통 결정 조건으로 교체, TC-032 비고, TC-FLOW-02~04 Steps를 실제 조작 순서·부분 참조로 정정(FLOW-04 비활성 구간을 TC-025 앞으로, 스펙에 비활성 단언). 옛 스펙 대체 방침 유지 |
| 2026-09-23 | v3 — 재검증 반영(conflict PASS · checker FAIL MAJOR 1/MINOR 5). 신규 TC-044(비-null 캔버스 450×350·900×350의 미리보기 크기·마커 위치·클릭 변환·고정·저장 인자, MAJOR-1), 추적표 §4 `canvas`·`scale` 등 갱신. §1 창 라벨 분기 행을 M-02로 한정(MINOR-1). TC-FLOW-02 Steps 부분 표기 + 스펙에 TC-035·TC-016 단언 추가(MINOR-2). M-05 허용 오차 ±2 캔버스 px(MINOR-3). 변경 대기열 Q-01 등록(MINOR-4). TC-013 「손 위치」 부재를 정규식 `/손 위치/`로(MINOR-5). TC-020 응답·이벤트 순서 전제, TC-FLOW-03 TC-038 참조를 표시 규칙 부분으로(conflict 선택) |
| 2026-09-23 | v4 — **CR-016 반영(증분 모드)**. 기준 requirements v1.3·design CR-016. 폐기 TC-008(`isPreviewLayerMode`)·TC-012(모드별 패드 박스). 요구 이관 R-07→R-12, R-09→R-13, R-02→R-14(TC-007·TC-024·TC-028·TC-039·TC-040·TC-041·TC-044). 기대 개정 TC-005·006·009·010·011·013·014·015·025·026·027·030·034·035·036·037·040·FLOW-02·FLOW-04(`partPos`, 팔 필드 삭제, 바탕 body→kb_up, 새 `previewNoBody`, `markerPart`, 패드 박스 항상 숨김). 신규 TC-045~TC-058(hitPart·clampPartPos·바탕 대체·손 그림 배치·끌어다 놓기 정상/rect/저장 0회/제한/시작 안 됨/마법사 충돌/saving/cancel/저장 실패/mouse null)·TC-FLOW-05(S-6). 「포인터·좌표 규약」 절 신설(PointerEvent stub·포인터 캡처 stub·rect spy). 공통 픽스처 교체(LAYER·PALM → HAND·FULL·KB_HAND 등). 「선행」 절 갱신(bridge hand null·hand-anchor 래퍼 충족, bridge CR-016 대기·tsc 영향). Q-01 조건 충족 표기. 설계 확인 필요 3건. 수동 M-03·M-07 개정, M-11·M-12 신설 |
| 2026-09-24 | v5 — **CR-018 반영(증분 모드)**. 기준 requirements v1.4·design CR-018·contract v0.8 + CR-018 미확정 계약(`area` 추가·`pad` 삭제, 기본 `area` [(375,525), (495,525), (495,625), (375,625)] — 관리자 정정값). R-13 폐기 → R-17 이관(TC-024~TC-028, TC-FLOW-04, M-07, M-08). 개정: TC-001~TC-005(`initialWizard`·상태 리터럴 `area: []`, TC-005 `pad` → `area`), TC-009(29키), TC-013(값 목록 세 행), TC-016·TC-019(스펙)·TC-020·TC-022·TC-049·TC-FLOW-02(idle 버튼 3개), TC-024(「이동 영역 설정하기」 비활성), TC-025·TC-026·TC-027(리셋 기대값 `pad` → `area`·영역 표시 유지), TC-FLOW-04(기본 영역 선·값). 신규 TC-059~TC-077(startArea·점 누적·reviewArea pick 무시·applyWizard reviewArea·영역 선 상시 표시·pickArea 진입·4점 클릭·reviewArea 클릭 무시·저장 성공/실패·취소·saving·상호 배타·포커스·접근성·mouse null·AreaOutline 단독·SettingsApp 로드/수신·오류 줄), TC-FLOW-06(S-7). 픽스처 `pad` 제거·`area` 추가, 스펙 `test/AreaOutline.test.tsx` 신설. 수동 M-03·M-07·M-08·M-09 개정, M-13~M-15 신설. 설계 확인 필요 C-1~C-4 |
| 2026-09-24 | v6 — **CR-020 반영(증분 모드, 쾅 메커니즘 삭제 — R-05 폐기)**. 기준 requirements v1.5·design CR-020. 헤더 범위: 보류 R-03~R-06 → R-03·R-04·R-06, 폐기 목록에 R-05 추가. TC-042·TC-043 요구 매핑 R-03~R-06 → R-03·R-04·R-06. TC-042 ⓐ 기대 문구 `배율·유휴 시간·자동 실행 옵션은 설계 확정 후 구현됩니다.`(「연타 기준·」 삭제) + 비고(덤프 무필터 — `slam` 표시 여부 미판정). 공통 픽스처 `SETTINGS`에서 `slam` 삭제, TC-028 ⓒ 필드 나열(`slam` 제거 — 스펙에 `slam` 참조가 픽스처 외에 없어 단언 코드 변경 없음). 추적표 R-05 행 폐기, 사용자행 S-2 요구 R-03·R-04. 스펙: `SettingsApp.test.tsx`·`MousePartsTab.test.tsx` 픽스처 `slam` 삭제, `SettingsApp.test.tsx` TC-042 문구 단언 교체, `labels.test.ts` `placeholderBehavior` 기대값 교체. TC 수·번호 변경 없음. `manual-checklist.md`는 쾅·연타·`slam`·R-05 항목이 없어 변경 없음 |
| 2026-09-24 | v7 — **CR-026 반영(증분 모드, R-18 펜 쥔 손 위치 끌기)**. 기준 requirements v1.6·design CR-026 + CR-026 미확정 계약(`penPos`·`pen_up`) + overlay CR-025 `resolvePenPos`. 신규 TC-078~TC-092(`pickDragTarget` 우선순위·경계, 펜 손 렌더·pen_up 없음·끌기 정상·범위 제한·저장 0회와 null 유지·겹침 우선과 팔 파츠 불변·마법사/저장 중 상호 배타·저장 실패·리셋 penPos null·mouse null·접근성·라벨 `markerPen`), TC-FLOW-07(S-8). 개정: TC-009(30키), TC-025·TC-067(키 5개). 픽스처 `MOUSE`·`DEFAULT_MOUSE_EXPECTED`·`BASE`에 `penPos: null`, 펜 픽스처 신설. 추적표 S-8 행·「CR-026 추적」 절·「CR-026 개정 요약」 절, 설계 확인 필요 E-1~E-5. 스펙: `mouseWizard.test.ts`(import·BASE·TC-005/062 리터럴·TC-078/079), `MousePartsTab.test.tsx`(픽스처·키 목록 2곳·TC-080~091·TC-FLOW-07), `labels.test.ts`(30키·TC-092). **미반영**: `manual-checklist.md` M-16, `SettingsApp.test.tsx` 픽스처 점검(예산 초과) |
| 2026-09-24 | v8 — **CR-028 반영(설정 창 개편 v2, 증분 모드)**. 기준 requirements v1.7·design CR-028(+ general-tab·images-tab·i18n)·contract v0.14·수용 기준 U-1 ~ U-13, 결정 idleSeconds 60 ~ 3600·D-3 수용. 폐기 TC-040 ~ TC-043. 개정 TC-009·TC-092(원천 `i18n/ko`), TC-030(region 이름), TC-031·TC-032(탭 3개 새 이름·기본 general·머리글 없음·창 제목·lang), TC-FLOW-01(S-1 이미지 등록 흐름). 신규 TC-093 ~ TC-098(i18n), TC-099 ~ TC-103(금지 요소·저장 언어·언어 수신·오류 줄 언어·창 제목 실패), TC-104 ~ TC-130(기본 설정 탭 — 토글 3개·자동 실행 대기/취소/실패·위치 초기화·배율 놓을 때 1회·키보드 300ms·유휴 검증·접근성), TC-131(generalValues), TC-132 ~ TC-135(imageSlots), TC-136 ~ TC-152(이미지 설정 탭 — 카드 그룹·필수 배지·변경·추가·비우기 확인·포커스·pen_up 첫 등록·ja·접근성·ConfirmDialog), TC-FLOW-08 ~ TC-FLOW-13(S-2·S-3·S-9 ~ S-12). 추적 「CR-028 추적」 절, 개정 요약, 설계 확인 필요 G-1 ~ G-7. 스펙: 신규 5개 파일, `labels.test.ts` 전면 개정, `SettingsApp.test.tsx` 전면 개정, `MousePartsTab.test.tsx` 픽스처·TC-030. 수동 M-01·M-09 개정, M-17 ~ M-24 신설. 이전 v7 「미반영」 2건 해소 확인(M-16 존재, `SettingsApp.test.tsx` 픽스처 `penPos: null` 존재) |
| 2026-09-24 | v9 — **CR-031 반영(세로 메뉴 R-27 · 이미지 카드 높이·여백 통일 R-28, 증분 모드)**. 기준 requirements v1.8(R-19 폐기 → R-27·R-28)·design CR-031(+ images-tab §6·§6.1, general-tab §2.2). 개정 TC-031·TC-032(`tablist`·`aria-selected`·`tabindex`·`h1` = 선택 탭 이름), TC-099(`h1` = 선택 탭 이름뿐·사이드바 검색창/배지/그룹 제목 없음), TC-100·TC-101(`tablist` 이름·`h1` 언어 교체), TC-151(카드 자식 4개 순서), TC-FLOW-03(`aria-selected`), TC-FLOW-01·TC-FLOW-10 Steps 덧붙임(세로 메뉴·M-25), TC-136·TC-140·TC-141·TC-146 요구·문구만(단언 불변). 요구 이관 R-19 → R-27. 신규 TC-153 ~ TC-156(`SettingsApp.test.tsx` — 역할·로빙 tabindex, 아이콘 aria-hidden·`TabIcon` 모양, h1·오류 줄 위치, 세로 탭 키보드), TC-157·TC-158(`ImagesTab.test.tsx` — 제목·설명 `title` 3개 국어, 카드 오류 띠 위치·`title`). 스펙 도우미 `tablist` 안 `tab` 역할 조회로 교체. 수동 M-01·M-09·M-23·M-24 개정, M-25(카드 높이·말줄임·칸 수 3개 국어 × 900/720)·M-26(세로 메뉴 실물 키보드·포커스 링·낭독) 신설. 설계 확인 필요 H-1 ~ H-4 |
| 2026-09-24 | v10 — **CR-033 반영(펜 손 사용 토글 R-29 · pen_up 첫 등록 확인창 R-30, 증분 모드)**. 기준 requirements v1.9·design CR-033(images-tab §9, i18n §4.3)·contract v0.15. 개정 TC-025(리셋 penMode 유지 사례·키 6개), TC-027·TC-067·TC-089(키 6개·픽스처), TC-094(단순 키 80·pen_up 설명), TC-148·TC-149(첫 등록 → 교체 경로로 한정 — 첫 등록은 I-6). 신규 TC-159 ~ TC-176(`test/PenMode.test.tsx` — isFirstPenUp, 토글 비활성·표시·I-7, 안내 상자 항상 표시, 켜기 확인창 accent·취소·끄기 즉시·저장 실패·slotBusy, 첫 등록 예/아니요/Esc·penPos 규칙·재등록·저장 실패·창 닫기, ConfirmDialog tone, 문구 11키·3개 국어, 접근성), TC-FLOW-14(S-13). 픽스처 `penMode: false`(`ImagesTab`·`MousePartsTab`·`mouseWizard`·`SettingsApp`). 머리 줄은 TC 목록 끝 「CR-033」 절이 대체. 수동 M-27(펜 토글·확인창 실물·포커스 복귀·창 닫기)·M-28(ja·en 검수) 신설. 설계 확인 필요 J-1 ~ J-4 |
| 2026-09-25 | v11 — **CR-035 반영(기본 이미지 세트 R-31 · 「기본값」 = 복원/비우기 R-32 · 기본 이미지 다운로드 R-33, 증분 모드)**. 기준 requirements v1.10·design(RTM R-31 ~ R-33)·images-tab §1 ~ §8·§10·i18n §4.6·§4.7·contract v0.16. 개정 TC-133·TC-135(`canReset`·`resetKind`), TC-137·TC-142 ~ TC-147·TC-151(복원 칸 aria-label·항상 활성·복원 확인창·필수 칸 비우기 폐기·다운로드 단추 첫 포커스), TC-148 둘째·TC-170(mouse null → penPos (380,496) 그대로), TC-150(ja 복원 aria-label), TC-161·TC-173(pen_up 「기본값」 = 복원), TC-025·TC-027·TC-089·TC-090·TC-FLOW-07(리셋 기대 penPos (380,496) — 옛 null 대체), TC-093·TC-094(code 22·단순 키 92), TC-FLOW-01(비우기 → 복원), 화면 밖 overlay `mouseMapping.test.ts` TC-025 기대 1곳. 신규 TC-177(slotCard 4예)·TC-178(exportResult), TC-179 ~ TC-181(복원 정상·실패·빈 pen_up → R-30 확인창), TC-182 ~ TC-188(다운로드 패널·폴더 취소·충돌 없음·충돌 덮어쓰기·취소·부분 실패·오류), TC-189·TC-190(3개 국어·사전), TC-191(포커스 복귀), TC-FLOW-15 ~ TC-FLOW-17(S-14 ~ S-16). 스펙 도우미 `cardButtons` = 카드 안 버튼만. 수동 M-29(첫 실행 기본 세트)·M-30(실제 폴더 저장·원본 크기·덮어쓰기)·M-31(복원 실물·CR-035 문구 ja·en 검수·좁은 창) 신설. 머리 줄은 TC 목록 끝 「CR-035 개정」 절이 대체. 설계 확인 필요 K-1 ~ K-6 |
| 2026-09-25 | v12 — **CR-037 반영(헤어(뒷머리) 슬롯 R-34, 증분 모드)**. 기준 requirements v1.12(R-34·S-17)·design(§4 `hairUrl`·§5.2 `findUrl`·렌더 3·§10·RTM R-34)·images-tab §1·§3·§3.1·i18n §4.3·§4.4·§4.6(CR-037 새 문구 — CR-036 문구 대체)·contract v0.17(`'hair'`). 개정 TC-093(슬롯 키 25)·TC-094(`imagesNote`·`slots.hair`·`asset.canvas_mismatch` ko 기대값)·TC-096(`imagesNote` 치환)·TC-134(배경 그룹 2장·전체 25장)·TC-136(카드 25장 순서·제목·안내 문구). 신규 TC-192(`buildSlotGroups` 배경 그룹·hair 스펙)·TC-193(「뒷머리」 카드 렌더)·TC-194(이미지 변경 `importAsset('hair')`)·TC-195(`asset.canvas_mismatch` 카드 오류 ko·en)·TC-196(비우기 확인창 → `removeAsset('hair')`)·TC-197(3개 국어 문구)·TC-198(미리보기 헤어 맨 아래·미렌더)·TC-199(끌기 판정 불변)·TC-FLOW-18(S-17). 신규 스펙 `test/Hair.test.tsx`. 수동 M-32 신설. 설계 확인 필요 H-1 ~ H-6(H-4는 관리자 결정으로 닫음 — 단언하지 않음) |
| 2026-09-25 | v13 — **CR-038 반영(배포용 기본 세트 교체 🔒, 증분 모드 — 개정만, 새 TC 없음)**. 기준 확정사항 §6 CR-038·`src/bridge/types.ts` v0.18(`DEFAULT_ASSET_SLOTS` 7개 — hair 복원 칸, idle·rest·key_* 비우기 칸 / `DEFAULT_MOUSE_SETTINGS` shoulder (558,500)·penPos (356,504)·penMode true). TC 목록 끝 「CR-038 개정」 절 신설(개정 표·추적·설계 확인 필요 L-1 ~ L-5). **스펙 반영**: `imageSlots.test.ts`(TC-133·TC-177·TC-178·TC-192, 픽스처 `DEFAULT_FILES` 7장), `ImagesTab.test.tsx`(TC-137·TC-142·TC-179 둘째·TC-180·TC-182·TC-189·TC-FLOW-15·TC-FLOW-17 + 픽스처 연동 TC-183·TC-184·TC-185·TC-187·TC-191, 픽스처 `DEFAULT_KEYS` 7칸·`DONE7`·`DESC7_KO`). **스펙 미반영(예산 초과)**: `Hair.test.tsx`(TC-193·TC-196·TC-FLOW-18), `MousePartsTab.test.tsx`(TC-014·TC-025·TC-026·TC-027·TC-058·TC-074·TC-089·TC-090·TC-FLOW-07), `PenMode.test.tsx`(TC-170), `SettingsApp.test.tsx`(TC-033·TC-FLOW-04) — 새 기대는 「CR-038 개정」 표. `manual-checklist.md` 미개정(L-3) |
| 2026-09-25 | v13 후속 — **CR-038 미반영분 처리**. 스펙: `MousePartsTab.test.tsx`(상수 `DEFAULT_MOUSE_EXPECTED` 새 기본값·`RESET_EXPECTED` 신설, TC-014·TC-025·TC-026·TC-089·TC-090·TC-FLOW-07 — TC-027·TC-058·TC-074는 상수 교체로 해소), `PenMode.test.tsx`(TC-170), `SettingsApp.test.tsx`(리셋 기대 상수·TC-033·TC-FLOW-04), `Hair.test.tsx`(TC-193·TC-196·TC-FLOW-18 — 「기본값」 = 복원). 수동 `manual-checklist.md` v8(M-29·M-30·M-32). 「CR-038 개정」 표 스펙 반영 열 갱신, L-2에 사용자 결정(뒷머리 전용 「비우기」 단추 — 설계 뒤 별도 TC) 기록, L-3 닫음 |
| 2026-09-25 | v14 — **CR-038 R-35 반영(뒷머리 전용 「비우기」 버튼 🔒, 증분 모드)**. 기준 requirements v1.13(R-35·R-36·S-18, R-31 폐기 → R-36)·images-tab §3 검증 예 R-35 줄·§11.2 ~ §11.7·i18n §4.8. 신규 TC-200 ~ TC-207·TC-FLOW-19(S-18), 개정 TC-192(`emptyable`·`canEmpty`)·TC-094(단순 키 94)·TC-193(주석)·TC-FLOW-18(비우기 단계 재추가 — L-2 닫음), 수동 M-33 신설(`manual-checklist.md` v9). 스펙: `Hair.test.tsx`·`imageSlots.test.ts`·`i18n.test.ts`. 관리자 결정 N-1: 실패 뒤 포커스도 「이미지 변경」(TC-206 유지). 수: 자동 207(유효 201)·TC-FLOW 19·수동 33 |
| 2026-09-25 | v15 — **CR-040 반영(팔·손 끌기 픽셀 판정 R-37 · 팔 파란·펜 손 빨간 영역 상자 R-38 🔒, 증분 모드)**. 기준 requirements v1.14(R-37·R-38·S-19)·`design/drag-hit.md` §1 ~ §10(관리자 결정 §2.3 마스크 없음 → 사각형 대체 채택)·design §11 D-4 토큰. 계약 변경 없음. 신규 TC-208·TC-209(`buildAlphaMask`·`isOpaqueAt`), TC-210 ~ TC-212(`hitOpaque`·`pickDragTarget` 설계 예 표 6행 + (370,520) 2건 — 기본 그림 팔 171×199 @ (389,492)·펜 손 136×196 @ (356,504)), TC-213 ~ TC-215(`useAlphaMask` 정상·실패·교체 — FakeImage·getContext spy), TC-216·TC-217(`PartOutline` 렌더·CSS·토큰 정적), TC-218 ~ TC-225(화면 — `vi.mock('../components/useAlphaMask')`: 겹친 점 펜 손 투명·팔 칠함 → 팔 끌기·partPos만 저장 / 둘 다 투명 → 저장 0회 / 펜 손 칠함 → 손 끌기 / 마스크 없음 → 사각형 대체·훅 호출 인자 / 상자 위치·aria-hidden·순서·선택 버튼 없음·마법사 무관 / 그림 없음 → 상자 없음·교체 크기 / 저장 실패 → 옛 자리 / 마법사 클릭 픽셀 무관), TC-FLOW-20(S-19). 개정 TC-078·TC-079(근거 줄)·TC-085(제목·전제 — 마스크 없음일 때), 도우미 `expectNoPadBox`(TC-011·TC-030)·`padBox`(TC-035·TC-037·TC-FLOW-02) 상자 제외. 스펙: 신규 `alphaMask.test.ts`·`DragHit.test.tsx`, 개정 `mouseWizard.test.ts`·`MousePartsTab.test.tsx`·`SettingsApp.test.tsx`. 수동 M-40a 신설(`manual-checklist.md` v10 — 개발 서버·빌드 exe 두 출처 실제 알파 판정·상자 색·점선). 설계 확인 필요 P-1 ~ P-4. 수: 자동 225(유효 219)·TC-FLOW 20·수동 34 |
| 2026-09-25 | v16 — **CR-042 반영(펜 손 단순화 — 손(펜) 그룹 두 칸 R-39, 사용자 확정, 증분 모드)**. 기준 requirements v1.15(R-39·S-20·용어 주)·images-tab §3.2·i18n §4.4 CR-042 블록·§4.3 펜 모드 문구 3행(CR-042 개정)·design RTM R-39. 계약 변경 없음. TC 목록 끝 「CR-042 개정」 절 신설. 신규 TC-226(`buildSlotGroups` 손 그룹 2장·옛 파일 무시·추가 카드 `addKbDown`만)·TC-227(화면 — 두 카드·새 설명·추가 카드 없음)·TC-228(사전 — `addPenDown`·`pen_key_*` 없음·새 설명)·TC-FLOW-21(S-20). 개정 TC-132·TC-134·TC-135·TC-177·TC-192(`imageSlots.test.ts`), TC-136·TC-141·TC-142·TC-FLOW-15(`ImagesTab.test.tsx`), TC-093·TC-094(`i18n.test.ts` — 슬롯 18·단순 키 93), `KO_PEN` 사용 it·TC-174(`PenMode.test.tsx` — 펜 모드 문구 3개·`pen_up` 설명), TC-193·TC-201(`Hair.test.tsx` — 카드 19·17). 스펙은 전부 반영(1차 위임에서 imageSlots·ImagesTab, 후속 위임에서 i18n·PenMode·Hair). 수동: 새 항목 없음 — `manual-checklist.md` v11 「CR-042 적용 범위」 문단(M-25·M-28·M-29 읽는 법 대체)으로 T-4 닫음(T-4 본문 「반영(예산)」은 이 문단을 가리킨다). 설계 확인 필요 T-1 ~ T-5. 수: 자동 228(유효 222)·TC-FLOW 21·수동 34 |
| 2026-09-26 | v17 — **CR-043 반영(타자 입력 1 선택 강등 R-40 · 「타자 입력 1」 비우기 R-41, 사용자 확정 🔒, 증분 모드)**. 기준 requirements v1.17(R-40·R-41·S-21·S-22)·images-tab §3.3·§12·i18n §4.4 CR-043 블록·contract v0.19 `REQUIRED_SLOTS`(bridge 반영 완료)·design RTM R-40·R-41. TC 목록 끝 「CR-043 개정」 절 신설. 개정 TC-133·TC-134·TC-135·TC-192(`imageSlots.test.ts` — 필수 3장 → 2장, 옛 실패 5건 중 4건), TC-136(`ImagesTab.test.tsx` — `REQUIRED` 2장, 옛 실패 1건), TC-094(`i18n.test.ts` — `kb_down` 설명), TC-200·TC-201(`Hair.test.tsx` — `EMPTYABLE_SLOT_KEYS`·카드 16·「비우기」 2개). 신규 TC-229(필수 판정 2개)·TC-230(화면 배지·새 설명)·TC-231(사전)·TC-232(`emptyable`·`canEmpty` 검증 예 4행·hair 회귀)·TC-233(「비우기」 버튼·활성 규칙·ja·en)·TC-234(두 줄 양식 클래스)·TC-235(I-12 취소·Esc)·TC-236(I-12 확정 `removeAsset({kind:'kb_down',index:0})`)·TC-237(I-12 실패)·TC-FLOW-22(S-21)·TC-FLOW-23(S-22). 스펙 전부 반영. 수동 M-43 신설(`manual-checklist.md` v12). 설계 확인 필요 V-1 ~ V-4. 수: 자동 237(유효 231)·TC-FLOW 23·수동 35 |
| 2026-09-26 | v18 — **CR-044 반영(배포용 기본 세트 2차 교체 🔒 + 메인 결정 M-2 · M-3, 증분 모드 — 개정·폐기만, 새 TC 없음)**. 기준 확정사항 §6 CR-044·contract v0.20(`DEFAULT_ASSET_SLOTS` 6개 — hair 기본 없음, `DEFAULT_MOUSE_SETTINGS` shoulder (582,484)·partPos (411,464)·penPos (372,476)·penMode true)·메인 결정(M-2 `EMPTYABLE_SLOT_KEYS` = `['kb_down_0']` — 뒷머리 「비우기」 버튼 삭제, 「기본값」 = 비우기 / M-3 TC-FLOW-18 복원 단계 삭제·TC-FLOW-19 폐기 / M-4 범위 밖). TC 목록 끝 「CR-044 개정」 절 신설(개정·폐기 표·추적 3종·설계 확인 필요 W-1 ~ W-8, V-3 닫음). 스펙: `imageSlots.test.ts`(TC-133·TC-177·TC-178·TC-192·TC-232, `DEFAULT_FILES` 6장), `ImagesTab.test.tsx`(TC-182·TC-183·TC-184·TC-185·TC-187·TC-189·TC-191·TC-233·TC-FLOW-15·TC-FLOW-17, 픽스처 `DEFAULT_KEYS` 6칸·`DONE6`·`DESC6_KO`), `Hair.test.tsx`(전면 개정 — TC-193·TC-196·TC-200·TC-201·TC-202·TC-206·TC-207·TC-FLOW-18, 도우미 `hairClear`, 픽스처 `HAIR_DEF`·`RESTORE_DESC` 삭제, TC-204·TC-205·TC-FLOW-19 삭제), `MousePartsTab.test.tsx`(상수 `DEFAULT_MOUSE_EXPECTED`·`DEFAULT_PEN_POS`·신규 `DEFAULT_PART_POS`, TC-014·TC-026 리터럴, TC-058 결과 (461,494), **TC-090 누름점 교체** (420,520)·결과 (472,516), TC-025·TC-027·TC-074·TC-089·TC-FLOW-07 상수 연동), `PenMode.test.tsx`(TC-170), `SettingsApp.test.tsx`(기대 상수·TC-033·TC-FLOW-04). M-2 소스(ui-fixer) 적용 전 예정 Red는 절 머리 「선행」. `manual-checklist.md` 미개정(W-4). 수: 자동 237(유효 229 · 폐기 8)·TC-FLOW 23(유효 22 · 폐기 1)·수동 35 |
| 2026-09-26 | v19 — **CR-045 반영(뽀모도 타이머 🔒 — 「타이머」 탭 R-43 ~ R-48 · 배경 그룹 뽀모도 카드 R-42, 증분 모드)**. 기준 requirements v1.19(R-42 ~ R-48·S-23 ~ S-26)·`design/timer-tab.md` §1 ~ §13·`design/images-tab.md` §14·`design/i18n.md` §4.9(+ §4.3·§4.6 CR-045)·contract v0.21(소스 미반영 — mock)·overlay U-A 공용 훅 이름 인용. TC 목록 끝 「CR-045 개정」 절 신설(신규 TC·TC-FLOW·개정 표·추적 4종·설계 확인 필요 X-1 ~ X-8). 신규 TC-238 ~ TC-240(`timerValues.test.ts`), TC-241 ~ TC-245·TC-FLOW-25(`PomoCards.test.tsx`), TC-246(`i18n.test.ts`), TC-247·TC-266·TC-267·TC-FLOW-24·TC-FLOW-27(`SettingsApp.timer.test.tsx` — 공용 훅 실물), TC-248 ~ TC-259·TC-268·TC-FLOW-26(`TimerTab.test.tsx`), TC-260 ~ TC-265(`TimerPreview.test.tsx`). 개정: `SettingsApp.test.tsx`(mock 새 래퍼·메뉴 4항목 — TC-031·TC-032·TC-099·TC-100·TC-101·TC-153·TC-154·TC-156·TC-FLOW-10), `i18n.test.ts`(TC-093 코드 23·슬롯 20, TC-094 단순 키 110, TC-096·TC-197 CR-045 문구, TC-228), `imageSlots.test.ts`(TC-134·TC-177·TC-192·TC-226·TC-229 배경 그룹 4장·카드 20), `ImagesTab.test.tsx`(TC-136·TC-227·TC-FLOW-15). 미반영(X-8): `Hair.test.tsx` TC-193·TC-201 카드 수, 기존 `Settings` 픽스처 `timer` 필드. 수동 M-45a ~ M-45f 신설(`manual-checklist.md` v13). 수: 자동 268(유효 260 · 폐기 8)·TC-FLOW 27(유효 26 · 폐기 1)·수동 41 |
| 2026-09-26 | v19 후속 — **CR-051 인용 갱신(소스 변경 없음)**. 확정사항 🔒 겹침 순서 변경(오버레이 아래→위 헤어 → 배경 → 뽀모도 → 팔 → 본체 → 펜 손, 설정 창 미리보기도 같은 순서)을 CR-037 절 설계↔TC 표 「design §10 미리보기 합성 순서」 행에 인용하고 「미리보기가 그리는 레이어만의 부분 순서라 모순 없음」을 적음. CR 대장 CR-051 점검대로 `MousePartsTab` 미리보기(헤어 → 팔 → 바탕 → 펜 손)·`TimerPreview`(배경 → 인물 → 말풍선 → 글자 → kb_up)는 새 순서와 이미 일치 — TC-198·TC-199·TC-260 재확인만, 기대·스펙·TC 수 변경 없음. CR-037 기준 줄(§10 합성 순서)은 미리보기 자체 순서를 적은 문장이라 불변 |
| 2026-09-26 | v19 후속 — **메인 결정 반영(X-1 · X-2 · X-3 · X-8 닫음)**. X-1 타이머 탭 본문 region → `SettingsApp.test.tsx` TC-156 region 단언 네 탭 복원·도우미 주석 정정, `TimerTab.test.tsx` TC-248 region 단언 추가. X-2 색 초안 저장 응답까지 유지 → TC-258 deferred·대기 중 초안 단언. X-3 기존 mock 관례 유지. X-8 `Hair.test.tsx` TC-193(21)·TC-201(19), 7개 파일 `Settings` 픽스처 `timer: DEFAULT_TIMER_SETTINGS`. TC·수 변경 없음 |
| 2026-09-26 | v20 — **CR-049 반영(자동 실행 일반 권한 — `autostart.cancelled`·취소 안내 폐기, 대기열 Q-03 정식 TC 전환, 증분 모드 — 개정만)**. 기준 CR 대장 CR-049·requirements R-23(CR-049 부분 대체)·general-tab §2·§3.1·§3.2·§4-5·§5 G-6·§6·i18n §4.2·§4.6·contract v0.22 §5.5·§6. TC-FLOW 절 TC-FLOW-09 뒤 「CR-049 개정」 절 신설(개정 표·추적 3종·설계 확인 필요 Y-1 ~ Y-3, X-4 닫음). 개정: TC-093·TC-094·TC-246(`i18n.test.ts` — code 22·`autostartDesc`/`autostartPending` 새 ko·`autostartCancelled`/`errors['autostart.cancelled']` 부재·단순 키 109), TC-104·TC-113(`GeneralTab.test.tsx` — 설명·대기 문구, `L.cancelled` 삭제), TC-114(번호 재사용 — 실패 `io.error` → 오류 줄·안내 빈 내용·재시도 성공 시 `onError(null)`), TC-FLOW-09(`SettingsApp.test.tsx` — 취소 단계 → `autostart.error` 실패 단계, 끄기 단계 추가, 호출 `[true],[true],[false]`). TC-115·TC-116 불변(회귀). **미반영**: `manual-checklist.md` M-17·M-18(Y-1, 예산 초과). Q-03 상태 미변경(호출자 마킹). 수 불변: 자동 268(유효 260 · 폐기 8)·TC-FLOW 27(유효 26 · 폐기 1)·수동 41 |
| 2026-09-26 | v21 — **CR-050 반영(타이머 모드 🔒 사용자 결정 CR-048 — 두 토글 R-49 · 시작 시간 R-50 · 공통 버튼 R-51 · 끝남 깜빡임 R-52 · 알림음 카드 R-53 · 음량 R-54 · 3개 국어 R-55, 증분 모드)**. 기준 requirements v1.21·`design/timer-tab.md` §14·`design/i18n.md` §4.9·§4.10·패킷 timer-mode-03 §5·contract v0.23·overlay functions §5.7(인용). TC-FLOW 절 CR-049 절 뒤 「CR-050 개정」 절 신설(공통 규약·신규 TC·TC-FLOW·개정 표·추적 3종·설계 확인 필요 Z-1 ~ Z-4). 신규 TC-269(`timerValues.test.ts`), TC-270 ~ TC-272·TC-285·TC-287(`TimerTab.test.tsx`), TC-273 ~ TC-276(`CountdownTimeInput.test.tsx` 신규 + 탭 부분), TC-277 ~ TC-283(`AlarmSoundCard.test.tsx` 신규 + 탭·통합 부분), TC-284(`TimerPreview.test.tsx` + 탭), TC-286(`i18n.test.ts`), TC-FLOW-28 ~ TC-FLOW-30(`SettingsApp.timer.test.tsx`). 개정: `TimerTab.test.tsx` 전면(TC-248 ~ TC-252·TC-268 기대 갱신, TC-249 216행 깨짐 해소, TC-253 ~ TC-259·TC-FLOW-26 저장 인자 `TF`·스위치 `swSw`, 알림음 mock), `TimerPreview.test.tsx`(`snapshot`·`receivedAt` props·TC-261 훅 0회), `SettingsApp.timer.test.tsx` 전면(TC-247 카드 3장·getTimer 1회 유지·알림음 조회, TC-266·TC-267·TC-FLOW-24·TC-FLOW-27 스위치·전체 timer·v0.23 문구), `i18n.test.ts`(TC-093·TC-094 code 25·단순 키 129, TC-246 15키·25), `SettingsApp.test.tsx`(mock 알림음 래퍼 4개·TC-101 h2 3장). 수동 M-50a ~ M-50g 신설(`manual-checklist.md` v15). 새 스펙은 구현 전 Red가 정상. 수: 자동 287(유효 279 · 폐기 8)·TC-FLOW 30(유효 29 · 폐기 1)·수동 48 |
| 2026-09-26 | v21 후속 — **CR-050 시나리오 검증 FAIL 지적 반영(ui-test-checker MAJOR-1 · MINOR-1 ~ 4, ui-test-conflict-checker C6-1 · C1-1 · 후보1 · 후보2 · 참고)**. 기준 `design/timer-tab.md` §14 보강분(§14.7.2 `commit` 첫 줄 `locked` 가드·검증 예 끝 행, §14.7.3 창 숨김 정지 효과, §14.6 정지 조건 세 가지, §14.9 T-17, §14.11 창 숨김 접근성 영향 없음, §14.14 TC-276·TC-282 하위 항목). TC-283 실패 분기(탭 실패 사례 — `onError` `[[{settings.invalid}]]`·슬라이더/`aria-valuetext`/output `80%` 복귀·`setSettings` 1회) + `TimerTab.test.tsx` `TC-283(탭 실패)` 신설, §14.9 T-16 칸 정정(MAJOR-1). TC-280 재생 실패 문구 표시 중 「기본값」 → `role=alert` 사라짐(MINOR-1). `SettingsApp.test.tsx`에 `vi.mock('components/utils/alarmSound')` 추가(MINOR-2). TC-277 ⓐ 상태 문구 클래스 `soundStatus` 단언 + §14.3 추적(MINOR-3). TC-FLOW-28 요구 칸 R-55 「M-50g 경유」(MINOR-4). TC-282 ②(창 숨김 `hidden` → 정지 1회·`visible` → 0회·카드 그대로)·③(언마운트 뒤 이벤트 → 0회·같은 핸들러 해제) + `AlarmSoundCard.test.tsx` `TC-282(창 숨김)` 신설, §14.7.3 창 숨김 정지 효과 추적(C6-1). TC-276 가드 하위 항목(입력 → `locked` 재렌더 → 묶음 blur 0회 / 잠긴 채 합성 입력 → blur·Enter 0회·invalid 불변) + `CountdownTimeInput.test.tsx` `TC-276(컴포넌트 가드)` 신설·`TimerTab.test.tsx` TC-276(탭) 잠긴 뒤 blur 단계(후보1). TC-281 Given에 「포커스 이동 없음(합성 이벤트) — 컴포넌트 계약 테스트」 명시(후보2 — 실물 흐름은 M-50a ④). `i18n.test.ts` TC-093·TC-094·TC-246 it 제목 code 22 → 25(참고). 수동 `manual-checklist.md` v15 후속(M-50a ④·M-50b ③·M-50d ①). TC 번호·수 불변: 자동 287(유효 279 · 폐기 8)·TC-FLOW 30(유효 29 · 폐기 1)·수동 48 |
