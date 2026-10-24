# rest-display 인계 패킷 — ui

- 선행 조건: bridge 패킷 완료 마커 — contract.md **v1.1**, `cargo test` 실패 0. (§A의 숨김 코드 자체는 core·bridge와 독립이지만, 카운트다운 표시 테스트·문서가 v1.1 의미를 인용하므로 순서를 지킨다.)
- 요구ID: RD-04~RD-09(ui 몫) + RD-01·RD-02의 화면 문서 반영. 화면 요구: overlay **R-41 신설**·R-37 개정·R-35/R-30/R-33/S-19 주석, settings R-50·R-51 개정.
- 사용자 결정: D-1(rest 미등록 = 숨기지 않음)·D-2(복귀 규칙 불변)·D-3(끝남 중 쉬는중 영향 없음)·D-4(문구) — `rest-display-02-design.md` §5a 권고안 기준. 다르면 아키텍트 세션에서 이 패킷을 먼저 고친다. 아키텍트 결정 A-1(잠금)·A-2(CSS 숨김)·A-6(미리보기 불변).
- 작업 모드: 보강. 진입: `claude --agent ui-manager`. **overlay(§A)와 settings(§B)는 별도 세션 권장**(화면 1개 = 1세션, golden-principles §4). 두 절은 서로 의존하지 않는다 — 순서 무관.
- CR: 보강이라 각 화면 `test/change-requests.md`에 엔트리 필수(`change-request-tracking` 스킬). 현재 대장 최대 CR-068 → 예상 overlay **CR-069**, settings **CR-070**(기록 시점 재확인).

---

## A. overlay — 쉬는중 단독 표시 + 카운트다운 쉬는중 표시

### A.1 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src/overlay/index.tsx` | `hasRest`(useMemo)·`restOnly` 파생값, `.canvas` className 토글, 머리 흐름 주석 1줄 |
| `src/overlay/components/LayerStack.tsx` | `Layer`에 선택 `className` prop, 상태 레이어에 `rest`일 때만 `styles.restLayer` |
| `src/overlay/overlay.module.css` | `.restOnly` 규칙 2개 |
| `src/overlay/components/HairLayer.tsx`·`PomodoroLayer.tsx` | 머리 주석 한 줄(「쉬는중 단독 표시 때는 부모가 CSS로 가린다 — R-41」). 코드 변경 없음 |
| 변경 없음(확인만) | `src/state/inputMachine.ts`, `BackgroundLayer.tsx`, `MouseArm.tsx`, `PenHand.tsx`, `TimerText.tsx`, `src/components/utils/timerClock.ts`, `src/components/hooks/useElapsedText.ts`·`useTimerSnapshot.ts`, 쉬는중 보고 효과·`armAtRest` 효과(`index.tsx:198-207`) |

### A.2 코드 명세 (정본 — 이름·클래스 그대로)

`src/overlay/index.tsx` — `hasHair` 바로 아래, 렌더의 `.canvas`:

```tsx
const hasRest = useMemo(() => findEntry(manifest, 'rest') !== undefined, [manifest])
/** 쉬는중 단독 표시(R-41, 🔒 2026-10-24) — rest 그림이 있을 때만(D-1). 배경과 rest만 보이고 나머지는
 *  CSS visibility로 가린다(언마운트 없음 — 구독·알림음·이미지 디코드 유지, design §10.17) */
const restOnly = machine.layer === 'rest' && hasRest
// …
<div
  className={restOnly ? `${styles.canvas} ${styles.restOnly}` : styles.canvas}
  style={{ width: canvas.width, height: canvas.height, transform: `scale(${scale})` }}
>
```

`src/overlay/components/LayerStack.tsx`:

```tsx
const Layer = ({ entry, className }: { entry?: AssetEntry; className?: string }) => {
  if (!entry) return null
  return (
    <img
      className={className ? `${styles.layer} ${className}` : styles.layer}
      src={entry.url}
      alt=""
      draggable={false}
    />
  )
}
// LayerStack 안 — 상태 레이어만. body·kb는 className 없음(그대로 'layer')
<Layer entry={state} className={machine.layer === 'rest' ? styles.restLayer : undefined} />
```

`src/overlay/overlay.module.css`(파일 끝, `.hairWrap` 블록 뒤 권장):

```css
/* 쉬는중 단독 표시(R-41, 🔒 2026-10-24) — .canvas에 .restOnly가 붙으면 배경과 쉬는중 그림만 보인다.
   visibility는 자식이 다시 visible로 덮을 수 있는 유일한 숨김 속성이라, .jellyWrap 안의 rest 그림(.restLayer)만
   되살린다. 언마운트하지 않으므로 이미지 재디코드·타이머 구독 해제·알림음 정지가 없다. 전환 애니메이션 없음(즉시). */
.restOnly .hairWrap,
.restOnly .pomodoro,
.restOnly .jellyWrap {
  visibility: hidden;
}

.restOnly .restLayer {
  visibility: visible;
}
```

- `display: none`·`opacity`·조건부 렌더(`null`) 금지 — 셋 다 `.jellyWrap` 안의 rest를 되살릴 수 없거나 언마운트한다(02-design A-2).
- `BackgroundLayer`·`HairLayer`·`PomodoroLayer`에 prop을 더하지 않는다 → memo 경계 유지(design §10.14 14.5 「`machine` 비의존」 그대로). `OverlayApp`은 `machine.layer`가 바뀔 때 이미 다시 그리므로 새 상태·효과·리렌더 0.
- 마커 `restLayer`는 `machine.layer === 'rest'`일 때만 붙인다 → 대기 상태 `className === 'layer'` 단언(TC-028·TC-031)과 같은 `<img>` 유지(TC-032)가 그대로 통과한다.

### A.3 동작 명세

| 조건 | 화면 | DOM |
|---|---|---|
| `layer === 'rest'` && `rest` 등록 | 배경 + rest만 | `.canvas.restOnly`, 모든 레이어 요소 그대로 존재, rest `<img>` `class="layer restLayer"` |
| `layer === 'rest'` && `rest` 미등록(D-1) | 현행 그대로(§10.9.2 둘째·셋째 행 — `kb_up`·팔 쉬는 자세 등 보임) | `.canvas`에 `restOnly` 없음 |
| `layer === 'idle'` | 현행 그대로 | `restOnly` 없음, 상태 `<img>` `class="layer"` |
| 쉬는중 중 `assets://changed`로 rest 삭제·등록 | 다음 렌더부터 위 규칙(`hasRest` 재계산) | — |
| 깨움(키·마우스 이동·클릭) | 같은 커밋에 전부 다시 보임. 키면 그 누름의 젤리(CR-066), 팔은 다음 마우스 이동까지 쉬는 자세(`armAtRest`), 마우스 이동이면 곧바로 커서 추종(D-2 — 기존 규칙, 코드 변경 없음) | `restOnly` 제거 |
| 타이머 | 쉬는중 진입 → `setResting(true)`(불변) → core가 두 모드 모두 `restPaused` → 글자는 가려져 있고(interval 없음), 복귀 → `running`으로 이어서 흐름. 끝남(`finished`) 중 쉬는중이면 core 변화 없음 → 글자는 가려지지만 **알림음은 계속**(`TimerText` 언마운트 없음, D-3) | — |
| 문구·안내 | 없음(R-01) | — |

### A.4 문서 (ui-designer · ui-manual-writer)

**`src/overlay/requirements.md`**
- **R-41 신설**(🔒 2026-10-24 사용자 지정): 「쉬는중 단독 표시 — 쉬는중이고 쉬는중 그림(`rest`)이 등록돼 있으면 배경(`background`)과 쉬는중 그림만 보이고 뒷머리·뽀모도로 인물·말풍선·시간 글자·팔·몸통·키보드 그림(특수 키 포함)·펜 손은 숨는다. `rest`가 없으면 지금처럼 전부 보인다(D-1). 입력으로 대기로 돌아오면 즉시 원래대로(복귀 모션 규칙 불변, D-2). 숨김은 표시만 — 상태 전이·타이머 보고는 그대로」. 출처: 확정사항 §4 「쉬는중 단독 표시」, `rest-display-02-design.md` §2.3.
- **R-37 개정**: 「쉬는중에도 계속 줄어듦(자동 일시정지 없음)」 취소선 + 「(🔒 2026-10-24 대체) 쉬는중이면 자동 일시정지, 입력하면 이어서 내려감(R-35와 같음) — 판정은 core, 오버레이는 받은 스냅숏(`restPaused`, 남은 시간 고정)만 표시」. 「쉬는중에도 계속 줄어드는 판정은 core」 문장도 같은 방식으로 대체.
- **R-35** 끝에 「(🔒 2026-10-24) 스톱워치·타이머 두 모드 모두」. **R-30**(뒷머리 「상태·키 입력으로 바뀌지 않음」)·**R-33**(뽀모도 「항상 보임」) 끝에 「단, 쉬는중 단독 표시(R-41) 동안 숨김」.
- **S-19**: 「자리를 잠깐 비워도(쉬는중) 시간은 계속 줄어야 한다」 → 「자리를 비우면(쉬는중) 시간이 멈추고, 돌아오면 이어서 줄어든다」, 관련 열 「쉬는중에도 core 스냅숏대로 계속 줄어듦」 → 「쉬는중 동안 멈춘 남은 시간, 복귀 뒤 이어서」.

**`src/overlay/design.md`** (변경 이력 행 + 아래 절)
- 새 **§10.17 쉬는중 단독 표시 (CR-069, R-41)**: 02-design §2.3 표, A.2 코드 명세·CSS, A.3 동작 표, 「숨김 방식 결정(언마운트 없음·`visibility`만 자식 되살림·memo 경계)」, 잔여 위험(jsdom은 CSS 모듈 규칙을 적용하지 않음 → 화면 증거는 스크린샷).
- §2 레이아웃 그림 아래 bullet 1개(「`.canvas.restOnly` — §10.17」). §4 표에 파생값 `hasRest`·`restOnly` 2행.
- §6 P-3 끝 「`rest` 진입 순간 `rest` 등록 시 `.canvas.restOnly`(§10.17)」, P-8 ② 「`restPaused`(두 모드)」·④ 「`running → restPaused`(두 모드)」, P-9 ① 「쉬는중에도 core가 멈추지 않으므로 계속 줄어듦」 취소선 → 「쉬는중이면 `restPaused` — 남은 시간 고정(v1.1)」.
- §7 196행 `set_resting` 「의미 확장 — v0.23 카운트다운 no-op」 취소선 → 「(contract v1.1) 두 모드 공통 — 래퍼·호출 불변」.
- §10.1 표: hair·pomo·0·1·3·pen 행 표시 조건 끝에 「쉬는중 단독 표시 중 숨김(§10.17)」, 2행(상태)에 「`rest`일 때 `.restLayer`」.
- §10.9.2 표: 첫 행 앞에 「`rest` 있음 · 쉬는중 | `rest` | (숨김) | 배경 + `rest`만」 행, 둘째·셋째 행은 그대로(= D-1 근거), 회귀 TC 목록에 ⑩ rest 있음 → `restOnly`.
- §10.11 「상태(`idle`/`rest`)…와 무관하게 같은 그림」 뒤에 「(그림은 그대로, 쉬는중 단독 표시 때 부모 `.hairWrap`이 가려진다 — §10.17)」. §10.14 584행 「…쉬는중…은 표시 여부에 영향이 없다」 → 「…(쉬는중 단독 표시 동안은 §10.17로 가려짐 — DOM·구독 유지)」. §10.15 646행 「`restPaused`는 카운트다운에 없다(core)」 취소선 → 「(v1.1) 카운트다운도 `restPaused` — 표시는 `timerText`가 남은 시간 고정」. TC-312 수동 기대 「쉬는중 동안 카운트다운 계속 줄어듦」 → 「쉬는중 동안 멈춤, 복귀 뒤 이어서」.
- §13 RTM: R-41 행 신설(§10.17 · 계약 없음 · 새 TC · CR-069), R-37·R-35 행 비고 갱신.
- `design/functions.md` §5.1(렌더 — `restOnly`·`.canvas` className), §5.3(`Layer` `className` prop, 상태 레이어 마커). `design/components.md` 렌더 조건 표에 `.canvas.restOnly` 행.

**`src/overlay/manual.md`**(ui-manual-writer): 107행 「타이머는 쉬는 중에도 계속 줄어듭니다」 → 「타이머도 쉬는 중이 되면 저절로 멈추고, 돌아와서 마우스나 키를 쓰면 이어서 줄어듭니다」. 쉬는중 설명 위치에 「쉬는중 그림을 넣어 두면 쉬는 동안 배경과 쉬는중 그림만 보입니다. 쉬는중 그림이 없으면 캐릭터가 그대로 보입니다」 + 스크린샷 1장(쉬는중 화면).

### A.5 수용 기준 (vitest `yarn test --run src/overlay` — TC 번호는 ui-test-designer가 부여, 시나리오 `test/scenarios.md`에 등록)

| # | 파일 | Given / When / Then |
|---|---|---|
| O-1 | 신규 `test/OverlayApp.restOnly.test.tsx` | rest·hair·pomo_char·kb_up·mouse_base·pen_up 등록 매니페스트, `idleSeconds` 60 / 가짜 타이머로 60초+ tick / `.canvas` `classList`에 `restOnly`, rest `<img>` `class="layer restLayer"`, hair `<img>`·`.pomodoro`·`.jellyWrap`·`kb_up` `<img>`·팔·펜 손 **DOM에 그대로 존재**, `setResting` 호출 `[[false],[true]]` |
| O-2 | 같음 | O-1 상태 / `input://keyboard` 누름 1건(같은 `act`) / `restOnly` 없음, 상태 `<img>` `class="layer"`, `.jellyWrap`에 `jelly` 또는 `jellyAlt`(D-2), `setResting` 마지막 `[false]` |
| O-3 | 같음 | O-1 상태 / `input://mouse-move` 1건 / `restOnly` 없음, 팔 변형이 쉬는 자세가 아님(`armAtRest` false — 기존 MouseArm 단언 방식) |
| O-4 | 같음 | **rest 미등록** 매니페스트 / 60초+ tick / `.canvas` `className === 'canvas'`(D-1), `kb_up` `<img>` 존재, 상태 `<img>` 없음, `setResting(true)`는 그대로 호출 |
| O-5 | 같음 | O-1 상태 / `assets://changed`로 rest 없는 매니페스트 → 다시 rest 있는 매니페스트 / `restOnly` 해제 → 다시 부착(`hasRest` 재계산) |
| O-6 | 같음 | 타이머 글자 조건 참 / 쉬는중 진입·해제 한 바퀴 / `getTimer` 호출 수 변화 0(= `TimerText` 언마운트 없음), `onTimerChanged` 해제 0회 |
| O-7 | `test/layers.test.tsx` | `LayerStack` `machine.layer` `'idle'` → `'rest'` → `'idle'` / 같은 상태 `<img>` 요소(TC-032 연장)이고 class `layer` → `layer restLayer` → `layer`, body·kb `<img>`는 늘 `layer`. 기존 TC-028·TC-031 **수정 없이** 통과 |
| O-8 | `test/overlayStyles.test.ts`(원문 읽기 방식 그대로) | `.restOnly .hairWrap`·`.restOnly .pomodoro`·`.restOnly .jellyWrap` 선언 = `visibility: hidden` 하나, `.restOnly .restLayer` = `visibility: visible` 하나. 이 규칙들에 `display`·`opacity`·`animation`·`transition`·`transform` 없음 |
| O-9 | `test/timerClock.test.ts` | 카운트다운 `restPaused` `{elapsedMs 3_000, durationMs 1_500_000}` / `now` 0·10초·1시간 / `timerDisplayMs` 늘 1_497_000, `timerText` 늘 `'00:24:57'`; `elapsedMs 2_500` → `'00:24:58'`(올림) — RD-04 |
| O-10 | `test/useElapsedText.countdown.test.tsx` | 카운트다운 `restPaused` 스냅숏 / 가짜 타이머 5초 진행 / 텍스트 불변·interval 0(렌더 횟수 불변) |
| 회귀 | 전체 `src/overlay` | 기존 TC 전부 PASS(특히 TC-028·031·032, §10.9.2 회귀, 젤리·부르르·팔·펜·뒷머리·뽀모도·TC-287) |

수동(`test/manual-checklist.md`, `/run-app` 스크린샷 → `doc/300_검증/screenshots/{YYYYMMDD-HHMM}/`):
- M-R1 rest·배경·뒷머리·뽀모도로 등록, 유휴 1분 → 1분 뒤 화면에 배경 + rest만(스크린샷), 키 1번 → 전부 복귀·젤리(스크린샷).
- M-R2 rest 비우기 → 1분 뒤 캐릭터 그대로 보임(D-1).
- M-R3 카운트다운 1분 시작 → 무입력 1분 → 쉬는중(글자 숨김) → 2분 더 대기 → 입력 → 글자가 쉬는중 진입 때 값에서 이어 내려감(설정 창 미리보기로 쉬는중 동안 멈춘 값 확인). 기존 TC-312 ④ 「계속 줄어듦」 기대를 이것으로 교체, TC-FLOW-19 5단계도 같은 기대로.

명령: `yarn test --run src/overlay` · `yarn tsc --noEmit` exit 0 · `yarn build` exit 0 · eslint·prettier 기존 설정 통과.

---

## B. settings — 문구·시작 시간 잠금

### B.0 선행 조건 (추가)

- **작업 트리 확인**: `git status`에 settings 미커밋 수정(CR-068 「뽀모도로」 정정 — `src/settings/i18n/ko.ts`·`test/i18n.test.ts`·`test/TimerTab.test.tsx`·`design.md`·`test/change-requests.md` 등)이 있으면 그 작업을 먼저 커밋(또는 사용자 확정)한 뒤 착수한다. 같은 파일을 고치므로 섞이면 CR 추적이 깨진다.

### B.1 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src/settings/i18n/ko.ts`·`ja.ts`·`en.ts` | `timerCountdownDesc` 값만(D-4) |
| `src/settings/timerValues.ts` | `isDurationLocked` 식에 `restPaused` 추가 + 주석 |
| 변경 없음(확인만) | `src/settings/components/TimerTab.tsx`(세 버튼은 상태 무관 활성 — R-45·TC-252 그대로), `TimerPreview`(쉬는중 흉내 없음 — A-6), `i18n/types.ts`(키 불변), 나머지 탭 |

### B.2 코드 명세

```ts
// src/settings/i18n/ko.ts
timerCountdownDesc: '정한 시간부터 0까지 내려갑니다. 쉬는중이 되면 저절로 멈추고, 다시 입력하면 이어서 내려갑니다',
// src/settings/i18n/ja.ts
timerCountdownDesc: '決めた時間から0まで減ります。休憩中になると自動で止まり、入力を再開すると続きから減ります',
// src/settings/i18n/en.ts
timerCountdownDesc: 'Counts down to zero. It stops by itself while resting and continues when you use the keyboard or mouse again',
```

```ts
// src/settings/timerValues.ts
/** 시작 시간 입력 잠금 — 타이머(카운트다운)가 켜져 있고 대기(stopped)가 아닐 때: 흐르는 중·일시정지·
 *  쉬는중 일시정지(🔒 2026-10-24 — 카운트다운도 restPaused가 생긴다, A-1)·끝남 */
export const isDurationLocked = (t: FullTimerSettings, status: TimerStatus): boolean =>
  t.enabled &&
  t.mode === 'countdown' &&
  (status === 'running' || status === 'paused' || status === 'restPaused' || status === 'finished')
```

- 식을 `status !== 'stopped'`로 줄이지 않는다 — 상태가 새로 생겨도 자동으로 잠기지 않게 열거형 그대로 둔다(현행 표기 유지, 설계 §14.5 표와 1:1).

### B.3 문서 (ui-designer · ui-manual-writer)

- `src/settings/requirements.md` **R-50**: 「쉬는중에도 계속 줄어듦」 취소선 + 「(🔒 2026-10-24 대체) 쉬는중이면 자동 일시정지, 입력하면 이어서」. 해석 열 「잠김 = … `running`·`paused`·`finished`」 → 「`running`·`paused`·`restPaused`·`finished`(A-1)」, 「내려가는 계산·쉬는중 계속은 core」 → 「…·쉬는중 일시정지는 core」. **R-51**: 「쉬는중 자동 일시정지 적용(기존 동작)」 뒤에 「— 2026-10-24부터 타이머도 같음」. 용어 주(128행) ④ 「쉬는중 자동 일시정지·재개 … 카드 설명 문구에만 적는다」는 그대로(두 토글 설명이 모두 적게 됨).
- `src/settings/design/i18n.md` §4.9 `timerCountdownDesc` 행(339행): 3개 국어 값을 B.2로, 변경 이력·요구 열에 `CR-070`.
- `src/settings/design/timer-tab.md`: `isDurationLocked` 함수 표(372행) 식 갱신, `durationLocked` 상태 행(392행) 설명, 잠금 관련 결정 표에 「restPaused 잠금(A-1, rest-display)」 행, TC 표(TC-269·TC-276) 갱신 표시.
- `src/settings/manual.md` 203행: 「쉬는중에도 계속 줄어듭니다」 → 「쉬는중이 되면 저절로 멈추고, 다시 입력하면 이어서 내려갑니다」. 화면 설명 문구가 바뀌면 해당 스크린샷 1장 재촬영(타이머 탭 토글 영역).
- `src/settings/test/change-requests.md`: CR-070(요구 출처 🔒 2026-10-24, 대상 파일, R-50·R-51, TC-269·TC-276·TC-268 계열).

### B.4 수용 기준 (vitest `yarn test --run src/settings`)

| # | 파일 | 변경 |
|---|---|---|
| S-1 | `test/timerValues.test.ts` TC-269 | 142행 `isDurationLocked(CD_ON, 'restPaused')` → **`true`**(주석 「식의 세 상태 밖」 삭제), 추가 `isDurationLocked(SW_ON, 'restPaused')` → `false`, `isDurationLocked(CD_OFF, 'restPaused')` → `false` |
| S-2 | `test/TimerTab.test.tsx` TC-276 | 상태 사례에 카운트다운 켜짐 + `restPaused` → 시작 시간 입력 `locked`(입력 잠김 표시·`setSettings` 0회) |
| S-3 | `test/TimerTab.test.tsx` 225행 | 「타이머 사용」 스위치 `toHaveAccessibleDescription` 기대 문자열 → B.2 ko 값 |
| S-4 | `test/i18n.test.ts` 558행 | ko `timerCountdownDesc` 리터럴 → B.2 ko 값. ja·en을 리터럴로 단언하는 곳이 있으면 같이(사전 키 비교만 하는 TC-268은 자동 추종) |
| S-5 | `test/scenarios.md` | Z-3 ③(「`restPaused`는 잠기지 않는다 — 실제로 오지 않는 값」) 취소선 + 「(CR-070) 카운트다운 `restPaused`는 잠긴다(A-1)」, TC-276 상태 목록·TC-269 기대 갱신, M-45b ⑦에 「타이머 모드도 같음」 |
| 회귀 | 전체 `src/settings` | 기존 TC 전부 PASS(TC-252 세 버튼 활성·TC-284 미리보기 `restPaused` 등) |

명령: `yarn test --run src/settings` · `yarn tsc --noEmit` exit 0 · `yarn build` exit 0.

---

## C. 하지 말 것 (두 화면 공통)

- `src/state/inputMachine.ts` 수정 금지(상태·전이·`wake`·`tick` 불변). 쉬는중 보고 효과·`armAtRest` 효과 변경 금지.
- 숨김을 조건부 렌더(`null`)·`display: none`·`opacity`·`key` 교체로 하지 않는다. 페이드·전환 애니메이션 추가 금지(요구 밖).
- `BackgroundLayer`·`HairLayer`·`PomodoroLayer`·`MouseArm`·`PenHand`에 `resting` 같은 새 prop 금지(memo 경계·A-2).
- 오버레이에 문구·안내·aria 추가 금지(R-01). 쉬는중 화면에 시간 글자를 남기지 않는다(결정 ②).
- `src/bridge/**`·`src-tauri/**`·`doc/200_설계/bridge/contract.md` 수정 금지. 래퍼 대신 `invoke`·`listen` 직접 호출 금지.
- 설정 창 미리보기(타이머 탭·프리셋 카드)에 쉬는중 흉내 추가 금지(A-6). 트레이 메뉴 관련 화면 변경 없음(A-4).
- `src/components/utils/timerClock.ts`·`useElapsedText.ts` 로직 변경 금지(카운트다운 `restPaused` 고정 표시는 이미 성립 — 테스트만 추가).
- 새 의존성 설치 금지.

## D. 완료 마커

- **overlay(§A)**: `yarn test --run src/overlay` PASS(O-1~O-10 포함, 수치 첨부) · `yarn tsc --noEmit`·`yarn build` exit 0 · 스크린샷 경로(M-R1 2장) · CR-069 기록 · requirements R-41·design §10.17 반영 · manual 갱신.
- **settings(§B)**: `yarn test --run src/settings` PASS(S-1~S-4) · `yarn tsc --noEmit`·`yarn build` exit 0 · CR-070 기록 · R-50·R-51·i18n §4.9·timer-tab 갱신 · manual 갱신.
- 두 화면 완료 뒤 → 메인 세션: 확정사항 갱신(02-design §8 문안), `claude --agent verify-manager`로 배포 전 통합 검증(카운트다운 쉬는중 실측 K-3 포함).
