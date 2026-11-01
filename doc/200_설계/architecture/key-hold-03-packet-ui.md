# key-hold 인계 패킷 — ui

- 선행 조건: bridge 패킷 완료 마커 — contract.md **v1.2**, `src/bridge/types.ts`에 `Settings.keyHoldMs`(필수)·`KEY_HOLD_MS_MIN`/`KEY_HOLD_MS_MAX`·`DEFAULT_SETTINGS.keyHoldMs = 150`, `cargo test` 실패 0, `yarn test --run` 전체 PASS, `yarn tsc --noEmit` 오류는 ui 테스트 픽스처의 TS2741 `keyHoldMs`뿐(bridge 패킷 §5 과도 실패 — 이 패킷의 §A.0·§B.0이 해소).
- 요구ID: KH-01~KH-05·KH-09(overlay), KH-07·KH-08(settings) — 아키텍처 ID(02-design §6). 화면 요구: overlay **R-42 신설**, R-07·R-22·R-23 끝 주석 / settings **R-69 신설**, R-59 개정.
- 사용자 결정: D-1(0~500·기본 150·10ms 단위)·D-3(프리셋 포함 → 설명 문구)·D-4(젤리도 보이는 상태)·D-5(펜 손 포함·클릭 파츠 제외)·D-6(R-22 문구 개정)·D-8(문구) — `key-hold-02-design.md` §5a 권고안 기준. 다르면 아키텍트 세션에서 이 패킷을 먼저 고친다. 아키텍트 결정 A-1~A-6·A-9~A-11.
- 작업 모드: 보강. 진입: `claude --agent ui-manager`. **overlay(§A)와 settings(§B)는 별도 세션 권장**(화면 1개 = 1세션). 두 절은 서로 의존하지 않는다 — 순서 무관. 단 `yarn tsc --noEmit`이 깨끗해지는 것은 **두 절의 0단계가 모두 끝난 뒤**다.
- CR: 보강이라 각 화면 `test/change-requests.md`에 엔트리 필수(`change-request-tracking` 스킬). 현재 최대 overlay CR-071·settings CR-070(두 화면 공용 일련) → 예상 overlay **CR-072**, settings **CR-073**(기록 시점 재확인).

---

## A. overlay — 키 그림 최소 유지(보이는 키 상태)

### A.0 0단계 — 기존 테스트 픽스처 고정 (구현보다 먼저)

`DEFAULT_SETTINGS.keyHoldMs = 150`이 spread로 픽스처에 들어가 구현 직후 기존 「뗌 즉시」 단언이 대량 실패한다(01-analysis §5 F-8 ①). **구현 전에** 아래 19개 파일의 `Settings` 픽스처 전부에 `keyHoldMs: 0,`을 넣는다(주석 `// key-hold(R-42): 기존 TC는 유지 0 = 현행 동작 기준`). 전체 리터럴(spread 없음)인 5개(`OverlayApp.lock`·`pen`·`penToggle`·`retry`·`specialHide`)는 이것으로 TS2741도 해소된다.

```
src/overlay/test/ handPart · keyboardFallback · OverlayApp.contextMenu · OverlayApp.hair · OverlayApp.jelly · OverlayApp.lock ·
                   OverlayApp.mouse · OverlayApp.pen · OverlayApp.penClick · OverlayApp.penToggle · OverlayApp.pomodoro ·
                   OverlayApp.restOnly · OverlayApp.retry · OverlayApp.scale · OverlayApp.shiver · OverlayApp.special ·
                   OverlayApp.specialHide · OverlayApp (test.tsx) · OverlayApp.timerMode        (각 .test.tsx)
```

- 확인: `rg -l "DEFAULT_SETTINGS|: Settings\b" src/overlay/test` = 위 19개. 0단계 직후 `yarn test --run src/overlay` 전부 PASS, `yarn tsc --noEmit`의 overlay 오류 0.
- 픽스처가 로드되기 전(`getSettings` 응답 전)에 키를 보내는 테스트가 있으면 초기값 `DEFAULT_SETTINGS`(150)로 유지가 걸린다 — 그런 테스트는 기존처럼 flush 뒤에 입력하게 맞춘다(테스트 의도 불변).

### A.1 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src/state/keyHold.ts` | **신규** 순수 모듈(약 80줄) — A.2 정본 |
| `src/overlay/index.tsx` | 합성 리듀서(`reduceOverlay`)·만료 효과·`view` 파생·`LayerStack`/`PenHand`/`wrapMotion`/`isSpecialShown`에 `view` 전달, 머리 `//!` 1줄. 현재 302줄 → 약 325줄(한계 400) |
| `src/overlay/test/keyHold.test.ts` | **신규** 순수 테스트 K1~K11 |
| `src/overlay/test/OverlayApp.keyHold.test.tsx` | **신규** 통합 테스트 O1~O11(fake timers) |
| 19개 테스트 파일 | A.0 픽스처 `keyHoldMs: 0` |
| 변경 없음(확인만) | `src/state/inputMachine.ts`(**한 줄도 고치지 않는다**), `components/LayerStack.tsx`·`PenHand.tsx`·`MouseArm.tsx`·`HairLayer.tsx`, `overlay.module.css`, 쉬는중 보고·`armAtRest` 효과, tick |

### A.2 코드 명세 (정본 — 이름 그대로)

`src/state/keyHold.ts` — `key-hold-02-design.md` §2.2 의사 코드를 **그대로** 옮긴다(타입 `HeldKeys`·`KeyHold`·`OverlayState`·`OverlayInput`, 함수 `createOverlayState`·`nextKeyHold`·`visibleMachine`·`holdDelay`·`reduceOverlay`, 비공개 `inputTs`·`snapshotKeys`). 머리 주석:

```ts
/**
 * 보이는 키 상태(표시 전용, 순수 TS — R-42 키 그림 최소 유지, 🔒 2026-11-01 key-hold).
 *
 * 입력 상태기계(inputMachine)는 「지금 눌려 있는가」라는 사실만 다룬다. 이 모듈은 그 위에 「최소 N ms는
 * 보인다」는 표시 규칙을 얹는다 — 새 누름(bounceSeq 증가)마다 그 순간의 키 필드 4개(kbDown·kbFrame·
 * specialHeld·clickHeld)를 찍어 두고(유지 스냅숏), 누른 ts + keyHoldMs까지 그림 선택 함수에 그 값을 넘긴다.
 * - keyHoldMs ≤ 0이면 스냅숏을 만들지 않는다 → visibleMachine이 machine 그 객체를 돌려준다(현행과 같음).
 * - 만료는 OverlayApp의 setTimeout이 { type: 'holdEnd', seq }로 알린다(seq가 다르면 무시).
 * - 개인정보(R-22 개정): 스냅숏은 마지막 누름 1건, 특수 키 분류값은 가장 최근 1개만, 최대 500ms.
 *   이력·횟수·console·storage·bridge 전송 없음. 결과(보이는 상태)는 렌더 전용 — reduce에 다시 넣지 않는다.
 */
```

- import는 `KEY_HOLD_MS_MAX`를 `'bridge/types'`에서(순수 상수 — `bridge` index를 거치면 tauri API를 끌어온다), 상태기계는 `'./inputMachine'`에서.

`src/overlay/index.tsx` 변경(정본):

```tsx
//! CR-072(R-42): 새 누름마다 유지 스냅숏(state/keyHold) — view(보이는 키 상태)를 키 그림·특수 키 숨김·펜 손·젤리에 쓴다
import { createOverlayState, holdDelay, reduceOverlay, visibleMachine,
         type OverlayInput, type OverlayState } from 'state/keyHold'
// state/inputMachine import에서 createInitialState·MachineInput·MachineState가 더 안 쓰이면 뺀다(noUnusedLocals)

const holdMsRef = useRef(settings.keyHoldMs)            // configRef 바로 아래
holdMsRef.current = settings.keyHoldMs

const reducer = useCallback(
  (state: OverlayState, input: OverlayInput) =>
    reduceOverlay(state, input, configRef.current, holdMsRef.current),
  [],
)
const [{ machine, hold }, dispatch] = useReducer(reducer, Date.now(), createOverlayState)

// 키 그림 최소 유지 만료(R-42) — 유지 스냅숏마다 타이머 1개. 새 누름(hold 교체)·언마운트 때 해제(누수 없음)
useEffect(() => {
  if (hold === null) return
  const id = window.setTimeout(() => dispatch({ type: 'holdEnd', seq: hold.seq }), holdDelay(hold, Date.now()))
  return () => window.clearTimeout(id)
}, [hold])

// 렌더부 — motion·specialShown 계산 자리
/** 보이는 키 상태(R-42) — 키 그림·특수 키 숨김·펜 손·젤리 전용. layer·mouse·쉬는중 보고는 machine(입력 상태) */
const view = useMemo(() => visibleMachine(machine, hold), [machine, hold])
const motion = wrapMotion(view)
const specialShown = isSpecialShown(manifest, view)
// …
<LayerStack manifest={manifest} machine={view} penMode={penMode} />
<PenHand manifest={manifest} machine={view} /* 나머지 props 불변 — cursor={machine.mouse} 그대로 */ />
```

- **그대로 `machine`을 쓰는 곳**(바꾸지 않는다): `useEffect([machine.layer])` 두 개(쉬는중 팔 자세·`setResting`), `restOnly`, `MouseArm`의 `cursor`·`button`, `PenHand`의 `cursor`.
- `useBridgeEvent`의 `dispatch` 호출은 그대로(`MachineInput`은 `OverlayInput`의 부분 집합).
- 오버레이 성능 규칙: 키 입력당 추가 렌더 0(스냅숏은 같은 리듀서 커밋), 만료당 1회, setTimeout 최대 1개(02-design §7).

### A.3 테스트

`src/overlay/test/keyHold.test.ts` — 순수(React 없음, 시각은 숫자 주입):

| # | 조건 | 기대 |
|---|---|---|
| K1 | `holdMs 0`으로 키 누름 | `hold === null`, `visibleMachine(m, null) === m`(같은 객체) |
| K2 | `holdMs 150`, ts 1000 누름 → ts 1080 뗌 | 누름 후 `hold = {seq, until 1150}`, 뗌 후 `hold` **같은 객체**, `visibleMachine`의 `kbDown true`·`kbFrame` = 누름 때 값, 입력 상태는 `kbDown false` |
| K3 | K2에서 `holdEnd(seq)` / `holdEnd(seq − 1)` | `hold null` → 보이는 상태 = 입력 상태 / 상태 객체 그대로 |
| K4 | 유지 중 ts 1100 새 누름 | 새 `seq`, `until 1250`, `keys.kbFrame` = 새 프레임 |
| K5 | 스페이스 누른 채 Enter 누름(입력 `specialHeld ['space','enter']`) | `keys.specialHeld` = `['enter']`(최근 1개만 — R-22 최소 보관) |
| K6 | 누른 채 자동 반복(`repeat: true`) 여러 번 | `hold` 같은 객체(새 스냅숏 없음) |
| K7 | `clickPress true` 왼 클릭 누름 → 뗌 | `keys.clickHeld ['left']`, `kbDown false`, 뗌 후 보이는 상태 `isPressing true` |
| K8 | 무변화 `tick` / 마우스 이동 | `reduceOverlay` 결과 === 이전 상태(tick) / `next.hold === prev.hold`(이동) |
| K9 | `holdDelay` — `until − now` = −30 / 120 / 99999(시계 튐) | 0 / 120 / 500 |
| K10 | 400ms 꾹 누름(holdMs 150) → `holdEnd` → 뗌 | `holdEnd` 뒤 보이는 상태 = 입력 상태(아직 눌림, 같은 그림) → 뗌 즉시 `kbDown false` |
| K11 | `holdMs` = `NaN`·`-5` | `hold === null` |

`src/overlay/test/OverlayApp.keyHold.test.tsx` — 통합. `vi.useFakeTimers({ toFake: ['setInterval','clearInterval','setTimeout','clearTimeout','Date','performance'] })`(OverlayApp.restOnly 선례), bridge mock·`emit` 도우미·`ts: Date.now()`는 기존 OverlayApp 테스트 관례 그대로. 픽스처는 `keyHoldMs: 150`(O4·O9는 명시값):

| # | 조건 | 기대 |
|---|---|---|
| O1 | `kb_down_0` 등록. t0 누름 → +80ms 뗌 → t0+149 → t0+150 | 80ms: `kb_down_0` 보임 · 149: 그대로 · 150: `kb_up` (**브리프 필수 TC**: 「80ms 누름 → 150ms까지 유지 → 복귀」) |
| O2 | `key_enter` 등록, 마우스 파츠·펜 손 있음. Enter 누름 → +30ms 뗌 | t0+149까지 `key_enter`·`.canvas`에 `specialShown`(팔·펜 손 숨김) → t0+150 `kb_up`·`specialShown` 없음 |
| O3 | `kb_down_0`·`kb_down_1`. `a` 누름 → +40 뗌 → +100 `b` 누름 → +120 뗌 | +100에서 **즉시** 다음 프레임 · +150 여전히 그 프레임(유지가 `b` 기준) · +250 `kb_up` |
| O4 | `keyHoldMs: 0` | 뗌과 같은 커밋에 `kb_up`(현행) |
| O5 | 400ms 꾹 누름 | 400까지 누름 그림, 뗌 즉시 `kb_up` |
| O6 | 누름 → +80 뗌 | `.jellyWrap`에 `jelly`(또는 `jellyAlt`) 클래스가 +149까지 유지 → +150 기본 클래스만(D-4). `.hairWrap`(있으면) 같은 클래스 |
| O7 | 펜 모드(`pen_up`·`pen_down_0`, `penMode true`). 키 누름 → +50 뗌 / 왼 클릭 누름 → +50 뗌 | 두 경우 모두 +149까지 `pen_down_0` → +150 `pen_up`. 클릭 파츠(`mouse_left`)는 뗌 즉시 `mouse_base`(D-5) |
| O8 | 누름 → 뗌 직후 언마운트 | 남은 타이머 0(`vi.getTimerCount() === 0`), 이후 `advanceTimersByTime(500)`에서 React 경고(`console.error`) 0회 |
| O9 | 유지 중 `settings://changed`로 `keyHoldMs 0` | 진행 중 유지는 원래 시각(t0+150)까지 → 다음 누름·뗌은 즉시 `kb_up`(A-4) |
| O10 | `a` 누름 → 반복(`repeat: true`) 3회 → 뗌 | 반복 중 `shiver` → 뗌 뒤 `jelly`/`jellyAlt` 없음(부르르로 대체된 젤리 되살리지 않음, R-24 불변) |
| O11 | `rest` 등록, `idleSeconds 60`. 누름 → 뗌 → 61초 진행 | 150ms 뒤 `kb_up`, 61초에 `.restOnly`(R-41 불변), 대기 타이머에 유지 타이머 없음 |

- jsdom은 CSS를 적용하지 않으므로 「보임」은 기존 관례대로 `<img src>`·클래스 문자열로 단언한다.

### A.4 문서 (소유자에게 위임)

**ui-designer — `src/overlay/requirements.md`**

| 위치 | 변경 |
|---|---|
| 머리 버전 | v3.7 (CR-072 — 사용자 지정 🔒 2026-11-01 key-hold: **R-42 신설** 키 그림 최소 유지, R-07·R-22·R-23 끝 주석, R-22 입력 내용 비보관 문구 개정(D-6). 계약 v1.2(추가)) |
| **R-42 신설** | 원문 「백스페이스 혹은 엔터키 와 같은 특수키를 누를때 이미지 변경되어서 보이는거 있잖아 그거 너무 순식간에 변해버려서 속도조절같은거 있음 좋지않을까? 일반 타자도 그렇고」 — 키를 눌러 키보드 그림이 바뀌면(일반 `kb_down_N`·특수 `key_*`, 펜 모드에서는 펜 손 `pen_down_0`·특수 그림) 빨리 떼도 **누른 시점부터 최소 `keyHoldMs` ms**(설정, 0~500, 기본 150) 그 그림을 보인 뒤 들림으로. 꾹 누르면 뗄 때까지. 유지 중 새 누름은 즉시 새 그림(유지는 새 누름 기준). 0이면 떼는 즉시. 특수 키 그림 중 팔·펜 손 숨김과 젤리도 보이는 그림을 따른다. 클릭 파츠·부르르·쉬는중은 해당 없음. 페이드 없음 · 출처 확정사항 §4 7행·§5(🔒 2026-11-01) · 🔒 |
| R-07 끝 | 「(R-42, 🔒 2026-11-01) 「떼면 들림」은 누른 시점부터 키 그림 유지 시간이 지난 뒤」 |
| R-22 끝 | 「(R-42) 「떼면 기본」도 같다. 입력 내용 비보관 — 유지 시간(최대 500ms) 동안 화면 표시용으로 마지막 누름의 분류값 1개만 메모리에 둔다(이력·횟수·저장·전송 없음, D-6)」 |
| R-23 끝 | 「(R-42) 젤리는 키 그림이 보이는 동안 이어진다 — 떼는 순간 끊기지 않는다(D-4)」 |
| §2 사용자 시나리오 | S-23 신설: 「엔터를 톡 치면 엔터 그림이 0.15초쯤 또렷하게 보였다가 돌아온다. 설정 창에서 더 길게·0으로 바꿀 수 있다」 |
| §3 계약 표 | `Settings.keyHoldMs`(v1.2) 행 — 읽기 |

**ui-designer — `src/overlay/design.md` · `design/functions.md` · `design/components.md`**

| 위치 | 변경 |
|---|---|
| 변경이력 | CR-072 행 |
| §4 상태 표 | `hold: KeyHold \| null`(리듀서 합성 상태, `state/keyHold.ts`), 파생 `view = visibleMachine(machine, hold)`(useMemo), `holdMsRef` |
| §6 파이프라인 | 02-design §1 그림의 overlay 부분 |
| §7 bridge 계약 사용표 | `get_settings`·`settings://changed` 행 비고에 `keyHoldMs`(v1.2) |
| §10.3 젤리 트리거 열 | 「클래스 = `jellyClass(wrapMotion(view))`(R-42 — 보이는 상태)」. 「젤리 길이」 관련 문장에 「(CR-072 대체) 떼도 키 그림이 보이는 동안(누른 시점 + `keyHoldMs`) 이어진다. N ≥ 350이면 끝까지 재생」 |
| §10.6 | 숨김 조건 1번 「`machine` → `view`(보이는 상태)」, 상태 규칙 표 5행 비고 「(R-42) `key_enter`가 Enter 누른 시점 + N까지 남았다가 `key_space`」, 「입력 내용 비보관」 단락에 D-6 문장 |
| §10.8 | 「젤리 길이(기존과 같음)」 → 취소선 + 「(CR-072) 보이는 상태 기준 — 떼도 유지 시간 동안 이어짐」, 표 2·6행 「`pen_up`」 → 「유지 시간 뒤 `pen_up`」 |
| **§10.18 신설** 「키 그림 최소 유지 (CR-072, R-42)」 | 비유(조명 담당) · 규칙(02-design §2.2 상태 표) · 시간선(§2.3) · 상호작용 표(§2.4) · 소비자 분리(A-6) · 만료 = setTimeout 1개(A-2) · 기준 시각 = 이벤트 `ts`, 지연 상한 500(A-3) · 설정 변경은 다음 누름부터(A-4) · 개인정보(D-6) · 코드 위치 |
| §13 RTM | R-42 → §10.18·§10.3·§10.6·§10.8 → O1~O11·K1~K11 |
| `design/functions.md` | §5.1 `OverlayApp`(리듀서·만료 효과·`view`), **§5.x 신설 `state/keyHold.ts`** 함수 표(시그니처·동작·예외·요구ID), §5.2 `wrapMotion` 비고 「입력은 `view`」 |
| `design/components.md` | 렌더 조건 표 — `LayerStack`·`PenHand`의 `machine` prop = `view`, `MouseArm`은 `machine` 그대로 |
| CR 대장 `test/change-requests.md` | **CR-072**(ui-manager 지시로 기록) — 요구 R-42, 원문, 결정 D-1·D-4·D-5·D-6, 변경 파일, 계약 v1.2, 테스트 |

**ui-manual-writer — `src/overlay/manual.md`**: 「키를 짧게 눌러도 바뀐 그림이 잠깐(기본 0.15초) 남는다. 길이는 설정 창 기본 탭 「키 그림 유지 시간」에서 바꾼다(0 = 바로 돌아감)」 한 단락 + FAQ 1개(「그림이 늦게 돌아와요」 → 0으로).

### A.5 시나리오 (ui-test-designer)

`src/overlay/test/scenarios.md` — R-42 묶음 신설: A.3의 K1~K11(상태기계 층)·O1~O11(통합 층)을 TC로 등록(TC 번호는 대장 최대값 다음). 기존 TC 중 「뗌 → 즉시 `kb_up`/`pen_up`/젤리 끊김/팔 다시 보임」을 단언하는 것은 「픽스처 `keyHoldMs: 0` 기준(A.0)」 주석을 단다. `test/manual-checklist.md`에 M 항목 1개: 「실제 앱에서 엔터·백스페이스를 톡 쳐서 그림이 약 0.15초 보이는지, 설정 0이면 즉시 돌아오는지(`/run-app` 캡처 2장)」.

### A.6 수용 기준

- `yarn test --run src/overlay` 전부 PASS(기존 + K1~K11 + O1~O11). `yarn test --run` 전체 PASS.
- `yarn tsc --noEmit`: overlay 오류 0(§B.0 전이면 settings 테스트 TS2741만 남는 것은 허용).
- `yarn eslint src/overlay src/state` 경고 0, prettier 통과.
- grep: `git diff --stat src/state/inputMachine.ts` = 변경 없음. `rg -n "console\.|localStorage|sessionStorage" src/state/keyHold.ts` = 0건.
- 줄 수: `src/overlay/index.tsx` ≤ 400, `src/state/keyHold.ts` ≤ 400.
- 문서: R-42·§10.18·CR-072·scenarios 갱신. 증거 없는 완료 보고 금지 — 테스트 로그 첨부.

### A.7 하지 말 것

- `src/state/inputMachine.ts` 수정 금지(유지 필드 추가·`kbDown` 의미 변경 금지 — A-1).
- `LayerStack.tsx`·`PenHand.tsx`·`MouseArm.tsx`의 그림 선택 함수 본문 변경 금지 — 넘기는 객체(`view`)만 바꾼다.
- rAF 루프·tick 기반 만료·CSS transition/페이드 추가 금지(A-2, 결정 ①). 클릭 파츠(`mouse_left/right`)에 유지 적용 금지(D-5).
- 유지 스냅숏에 키 이력·횟수·누적 시각 저장, `console` 출력, storage·bridge 전송 금지(D-6).
- `src/bridge/**`·`src-tauri/**` 수정 금지. 화면 코드에서 `invoke`·`listen` 직접 사용 금지.

---

## B. settings — 「키 그림 유지 시간」 슬라이더 + 프리셋 설명 문구

### B.0 0단계 — 테스트 픽스처 필수 필드 (구현보다 먼저)

bridge 패킷 §5 목록의 settings 테스트 파일(약 47곳)의 `Settings` 전체 리터럴에 `keyHoldMs: 150, // contract v1.2(key-hold) 필수 필드`를 넣는다(v0.21 `timer` 선례 주석과 같은 형식). 위치는 `idleSeconds` 바로 다음 줄.

```
src/settings/test/ DragHit · GeneralTab · Hair · ImagesTab · MousePartsTab · PenMode · PomoCards · ResetAllCard ·
                    SettingsApp · SettingsApp.timer · TimerTab.cr052 · TimerTab        (각 .test.tsx)
```

- 확인: 0단계 직후 `yarn tsc --noEmit`의 settings 오류 0, `yarn test --run src/settings` 전부 PASS(값만 추가 — 단언 불변).

### B.1 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src/settings/components/ScaleIdleCard.tsx` | 유휴 시간 필드 아래에 슬라이더 필드 1개(약 +30줄 → 약 205줄), 머리 주석에 R-69 |
| `src/settings/generalValues.ts` | `export const KEY_HOLD_STEP_MS = 10` (R-69) |
| `src/settings/i18n/types.ts`·`ko.ts`·`ja.ts`·`en.ts` | 새 키 `keyHoldLabel`·`keyHoldDesc`·`keyHoldValue`, `presetSaveDesc` 개정(02-design §5a D-8 표 문구 그대로) |
| `src/settings/test/ScaleIdleCard.keyHold.test.tsx` | **신규** S1~S6 |
| `src/settings/test/i18n.test.ts`(있는 단언 갱신) | S7 — `presetSaveDesc` 3개 국어 포함 단언, 새 키 3개 존재 |
| B.0 대상 12개 파일 | 픽스처 `keyHoldMs: 150` |
| 변경 없음(확인만) | `useSliderDraft.ts`(재사용만 — A-11), `GeneralTab.tsx`, 프리셋 탭 컴포넌트(문구만 i18n에서 바뀜), 미리보기 컴포넌트(A-10) |

### B.2 코드 명세 (정본)

```tsx
// src/settings/components/ScaleIdleCard.tsx
import { KEY_HOLD_MS_MAX, KEY_HOLD_MS_MIN, setSettings, toBridgeError, type BridgeError, type Settings } from 'bridge'
import { KEY_HOLD_STEP_MS, /* 기존 import */ } from '../generalValues'
import { useSliderDraft } from './useSliderDraft'

// 컴포넌트 안 — commitIdle 아래
/** 키 그림 유지 시간 저장(R-69) — 실패는 탭 오류 줄, 성공은 오류 지움. 예외를 밖으로 던지지 않는다
 *  (useSliderDraft.flush가 끝까지 돌아 초안을 지우게 — 실패 시 슬라이더는 저장값으로 돌아간다) */
const commitKeyHold = async (v: number) => {
  try {
    await setSettings({ ...settings, keyHoldMs: v })
    onError(null)
  } catch (e) {
    onError(toBridgeError(e))
  }
}
const keyHold = useSliderDraft(settings.keyHoldMs, commitKeyHold)
const keyHoldText = format(t.keyHoldValue, { ms: keyHold.shown })

// 렌더 — 유휴 시간 필드 <div> 바로 뒤, 같은 카드 안
<div className={styles.field}>
  <label htmlFor="key-hold-slider">{t.keyHoldLabel}</label>
  <input
    id="key-hold-slider"
    type="range"
    min={KEY_HOLD_MS_MIN}
    max={KEY_HOLD_MS_MAX}
    step={KEY_HOLD_STEP_MS}
    value={keyHold.shown}
    aria-describedby="key-hold-desc"
    aria-valuetext={keyHoldText}
    onChange={keyHold.onChange}
    onPointerUp={keyHold.onPointerUp}
    onKeyUp={keyHold.onKeyUp}
    onBlur={keyHold.onBlur}
    className={styles.slider}
  />
  <output htmlFor="key-hold-slider">{keyHoldText}</output>
  <p id="key-hold-desc" className={styles.fieldDesc}>
    {format(t.keyHoldDesc, { min: KEY_HOLD_MS_MIN, max: KEY_HOLD_MS_MAX })}
  </p>
</div>
```

- 화면에 0·500·150 숫자를 직접 적지 않는다 — 상수·`settings` 값만(general-tab.md §3.3 `percentBounds` 관례).
- 스타일은 기존 `.field`·`.slider`·`.fieldDesc` 재사용, 새 CSS 없음.
- 저장 규칙은 배율 슬라이더(R-03)와 같다: 끄는 동안 초안만, 놓을 때 1회, 키보드 이동 키는 300ms 뒤 1회, blur 즉시, 같은 값이면 저장 없음.

### B.3 테스트

`src/settings/test/ScaleIdleCard.keyHold.test.tsx`(bridge mock, `settings.keyHoldMs 150`):

| # | 조건 | 기대 |
|---|---|---|
| S1 | 렌더 | 라벨 「키 그림 유지 시간」 슬라이더(`min 0`·`max 500`·`step 10`·`value 150`), `output` 「150ms」, `aria-valuetext` 「150ms」, 설명 「…(0~500ms).」 |
| S2 | change 200 → pointerUp | change 직후 `output` 「200ms」·`setSettings` 0회 → pointerUp 뒤 `setSettings({ ...settings, keyHoldMs: 200 })` 1회 |
| S3 | ArrowRight keyUp(fake timers) | 299ms까지 0회 → 300ms 1회 |
| S4 | change 150(같은 값) → pointerUp | `setSettings` 0회 |
| S5 | `setSettings` reject(`settings.invalid`) | `onError`에 BridgeError 1회, 슬라이더 `value`가 저장값(150)으로 돌아감 |
| S6 | 언어 ja / en | 라벨 「キー画像の表示時間」/「Key image hold」, 값 「150ms」/「150 ms」, 설명 범위 치환 |
| S7 | i18n | ko·ja·en 모두 새 키 3개 존재, `presetSaveDesc`에 「키 그림 유지 시간」/「キー画像の表示時間」/「key image hold」 포함 |

### B.4 문서 (소유자에게 위임)

**ui-designer**

| 문서 | 변경 |
|---|---|
| `src/settings/requirements.md` | 버전 행(CR-073). **R-69 신설**: 기본 탭 「크기 · 반응」 카드에 「키 그림 유지 시간」 슬라이더(0~500ms, 10ms 단위, 기본 150, 값 표시 「150ms」), 저장 규칙 = R-03 배율 슬라이더와 같음, 실패는 탭 오류 줄, 3개 국어 — 출처 overlay R-42·확정사항 §6 · 🔒. **R-59 개정**: 들어가는 것에 「키 그림 유지 시간(keyHoldMs)」 추가(D-3). §3 계약 표 `set_settings` 행에 `keyHoldMs` |
| `design/general-tab.md` | §1 레이아웃 — `idleRangeHint` 줄 아래 `keyHoldLabel [====o====] {keyHoldValue}` · `keyHoldDesc` 두 줄 · §3.3 `KEY_HOLD_STEP_MS` 행 · §3.4 `keyHold = useSliderDraft(…)`·파생 `keyHoldText` · §3.5 `commitKeyHold` · §3.6 렌더 · §5 파이프라인 G-x 행 · §6 접근성(`aria-valuetext`, `aria-describedby`) · 계약 인용 v1.2 |
| `design/i18n.md` | §4.2 새 키 3개(ko·ja·en 문구 = 02-design §5a D-8) · `presetSaveDesc` 행 개정 |
| `design/presets-tab.md` | 저장 카드 설명이 R-59 개정을 따름(문구는 i18n) |
| `design.md` | 계약 사용표 `set_settings` 사용처에 `ScaleIdleCard.commitKeyHold`(`keyHoldMs`), RTM R-69·R-59 행 |
| CR 대장 `test/change-requests.md` | **CR-073**(ui-manager 지시로 기록) |

**ui-manual-writer — `src/settings/manual.md`**: 기본 탭 「크기 · 반응」 절에 「키 그림 유지 시간」 설명(뜻·범위·0의 의미) + 스크린샷 갱신(manual/img), 프리셋 절 「저장되는 것」 목록에 추가.

### B.5 시나리오 (ui-test-designer)

`src/settings/test/scenarios.md` — R-69 묶음 신설(S1~S6 → TC), R-59 개정 TC(S7). 기존 G-3(유휴 시간) 옆에 G-x(키 그림 유지 시간) 흐름 1개: 슬라이더 조절 → 오버레이에 반영(수동 체크리스트 1항목, `/run-app`).

### B.6 수용 기준

- `yarn test --run src/settings` 전부 PASS(기존 + S1~S7). `yarn test --run` 전체 PASS.
- `yarn tsc --noEmit` exit 0(§A.0까지 끝났을 때) — 둘 중 먼저 끝난 세션은 상대 화면의 TS2741만 남는 것을 허용.
- `yarn eslint src/settings` 경고 0, prettier 통과. `ScaleIdleCard.tsx` ≤ 400줄.
- i18n 3개 국어 키 대칭(기존 i18n 테스트 PASS).

### B.7 하지 말 것

- 범위 숫자(0·500)·기본값(150) 하드코딩 금지 — bridge 상수·`settings` 값만.
- `useSliderDraft`를 `src/components`로 옮기거나 고치지 않는다(후작업 후보로만 보고 — A-11).
- 숫자 입력 칸·「기본값으로」 버튼·미리보기 등 요구에 없는 요소 추가 금지(요구 범위).
- 오버레이 화면·`src/state/**`·`src/bridge/**`·`src-tauri/**` 수정 금지.

## 공통 완료 마커

- §A·§B 모두 끝난 뒤: `yarn tsc --noEmit` exit 0, `yarn test --run` 전체 PASS, `cd src-tauri && cargo test` PASS(회귀).
- `/run-app` 스크린샷 2장(엔터 톡 친 직후 유지 중·0으로 바꾼 뒤) → `doc/300_검증/screenshots/{YYYYMMDD-HHMM}/`.
- 완료 보고 → 메인 세션이 확정사항 §4·§5·§6·CLAUDE.md §9 갱신(02-design §8 문안) 후 `verify-manager`로 배포 전 검증.
