# settings 상세 설계 — 「프리셋」 탭 (CR-064 · CR-065)

> **CR-065 개정(2026-09-30, requirements v1.29 — R-66 개정·R-68 신설, 출처 확정사항 §6 「PS-09 개정」 🔒):** 목록이 가로 줄 → **세로형 카드 격자**(위 = 그림 미리보기, 아래 = 이름·날짜·장수·알림음·버튼 4)로 바뀐다. 바뀐 부분의 정본은 **§11**이다. §1.2 ASCII는 §11 기준으로 고쳤고, §2·§2.2·§2.3·§3·§4·§5.3·§8·§10의 옛 서술 중 §11과 겹치는 것은 §11이 우선한다(각 절에 지시 줄). 계약: `PresetSummary.preview`는 contract **v0.31 확정·`src/bridge/types.ts` 반영** — 이름 대조 완료(설계와 같음, §11.9).

- 상위 문서: `src/settings/design.md`(탭 목록·bridge 사용표 §7·RTM §13). 문구는 `design/i18n.md` §4.12(키 이름으로만 인용), 에러 문구는 §4.6.
- 요구: `src/settings/requirements.md` **v1.28** — **R-58**(저장, PS-01) · **R-59**(들어가는 것, PS-02) · **R-60**(안 들어가는 것, PS-03) · **R-61**(적용, PS-04) · **R-62**(내보내기, PS-05) · **R-63**(가져오기, PS-06) · **R-64**(이름 바꾸기·삭제, PS-07) · **R-65**(저장 조건, PS-08) · **R-66**(화면, PS-09) · **R-67**(적용 후 상태, PS-10) · R-20(3개 국어) · R-27(세로 메뉴 — 항목 5개로 확장, requirements 용어 주).
- 근거: 확정사항 §6 「프리셋 (🔒 2026-09-30, PS-01~PS-10)」·결정 줄(U-1~U-7), `doc/200_설계/architecture/presets-02-design.md`(A-10·A-11), 인계 패킷 `presets-03-packet-ui.md` §1~§6.
- 계약: contract **v0.30 확정**(§3.11 타입 4·`PRESET_NAME_MAX`, §5 표 7행, §5.11 command 규칙·`apply_preset` 뒤처리, §6 code 13). 이름은 계약 그대로 인용한다(재정의 금지). **`src/bridge` 반영 완료(2026-09-30, contract v0.30)** — `src/bridge/commands.ts` 래퍼 7개·`types.ts` 타입 4·`PRESET_NAME_MAX`, `yarn tsc --noEmit` 0, vitest `src/bridge` 94 통과(커밋 e8850c7). 구현 선행 조건 충족.
- 레이아웃 확정 상태: **확정**. ui-layout-designer 구성안 없음 — 패킷 §1 구조와 확정사항 PS-09(위 = 저장·가져오기, 아래 = 카드 목록)를 수용했다.

비유: 프리셋 탭은 옷장이다. 위 칸(저장 카드)에서 지금 입은 옷을 통째로 걸어 두거나 다른 집에서 가져온 옷걸이를 들여놓고, 아래 칸(목록)에서 옷걸이 하나를 골라 갈아입거나(적용)·밖으로 복사하거나(내보내기)·이름표를 바꾸거나·버린다. 지금 입은 옷과 걸린 옷은 따로다(PS-10).

## 1. 레이아웃 (확정)

### 1.1 창 골격 — `design/timer-tab.md` §1.1 대체

세로 메뉴가 5항목이 된다(다섯째 = 프리셋, 맨 아래 — A-10). 나머지 줄은 그대로다.

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
|  [i] presets        |   presets -> design/presets-tab.md      |
|  no search, badge,  |                                         |
|  group heading      |                                         |
+---------------------+-----------------------------------------+
```

- 높이 검산(최소 480): 메뉴 5항목 = 40×5 + 4×4 + 32 = **248px** — 항상 보인다. 폭 검산(`design.md` §2.1) 불변 — 「プリセット」(6자)·「Presets」·「프리셋」은 최장 ja 「肩の軸・手の位置」보다 짧다.
- `TabIcon` `presets` = 겹친 카드 두 장(§2.4).

### 1.2 프리셋 탭 본문

```
+-- tabpanel presets (PresetsTab) -----------------------------+
| h1 = t.tabPresets (Shell)                                    |
| p[role=alert] error line (Shell, errorText)                  |
| [card 1] PresetSaveCard  (SettingsCard title=cardPresetSave) |
|   p presetSaveDesc                                           |
|   label presetNameLabel                                      |
|   [input name maxLength=50 placeholder]  [presetSave]        |
|   p.hint presetSaveNeedsRequired (only if required missing)  |
|   ---- divider ----                                          |
|   [presetImport]  p presetImportDesc                         |
|   p presetImportFailed + ul problems (preset null)           |
|     li: kb_up.png - reason (errorText by code)               |
|   p[role=status] status (presetSaved / Imported / ...)       |
|                                                              |
| [card 2] SettingsCard title=cardPresetList                   |
|   ul.list = grid auto-fill minmax(220px,1fr) (CR-065, 11.1)  |
|   li PresetCard x N (core order, newest first, U-4)          |
|   +-- li ---------------+  +-- li ---------------+           |
|   | PresetPreviewBox    |  | PresetPreviewBox    |           |
|   | (canvas ratio 9:7)  |  |                     |           |
|   | h3 name (2 lines)   |  | h3 name             |           |
|   | p savedAt           |  | p savedAt           |           |
|   | p count . alarm     |  | p count . alarm     |           |
|   | [apply]  [export]   |  | [apply]  [export]   |           |
|   | [rename] [delete]   |  | [rename] [delete]   |           |
|   +---------------------+  +---------------------+           |
|   p presetListEmpty (only if list is [])                     |
|   (presets === null: nothing, first load)                    |
| ConfirmDialog (apply | delete), shared, cancel first focus   |
+--------------------------------------------------------------+
```

- 목록 순서 = `listPresets()` 반환 순서 그대로(`savedAt` 내림차순 — 계약 §5 `list_presets`). ui는 다시 정렬하지 않는다. 격자는 왼쪽→오른쪽, 위→아래로 채운다(DOM 순서 = 목록 순서 = 탭 순서).
- 카드 한 장의 안쪽 배치·폭 검산·편집 중 모양은 §11.1.
- 「사용 중」 표시·선택 강조·정렬 전환·검색·복제·덮어쓰기 저장 **없음**(R-67, 패킷 §6). (CR-065) 옛 「썸네일 없음」은 PS-09 개정으로 **폐기** — 미리보기는 R-68(§11).
- 상태 줄(`role=status`)은 저장 카드 안 한 곳뿐이다. 목록 카드 조작(적용·내보내기·삭제)의 성공 안내도 이 줄에 쓴다 — 탭 안 안내 위치를 하나로 모은다.
- 날짜 줄 구분자 ` · `, 문제 줄 구분자 ` — `는 세 언어 공통 리터럴(키 없음 — 타이머 `:` 선례).

## 2. 컴포넌트

| 컴포넌트/모듈 | 파일 | 분류 | props / export | 책임 | 요구ID |
|---|---|---|---|---|---|
| `PresetsTab` (default·named) | `src/settings/components/PresetsTab.tsx` (**신규**, 304줄 실측 — 커밋 125871d) | 화면 로컬 | `{ manifest: AssetManifest; onError: (e: BridgeError \| null) => void }` | §4 상태 전부, 래퍼 호출(§5.1), 확인창 1개, 포커스 요청(§8.2). `settings`는 받지 않는다(적용 결과는 다른 탭이 이벤트로 받는다) | R-58, R-61~R-67 |
| `PresetSaveCard` (default·named) | `src/settings/components/PresetSaveCard.tsx` (**신규**, 130줄 실측) | 화면 로컬 | §2.1 | 이름 입력(로컬 `name`), 저장 버튼 활성·이유 줄, 가져오기 버튼, 문제 목록, 상태 줄 | R-58~R-60, R-63, R-65, R-66 |
| `PresetCard` (default·named) | `src/settings/components/PresetCard.tsx` (**신규**, 177줄 실측) | 화면 로컬 | §2.2 | 프리셋 한 장 표시·버튼 4·인라인 이름 편집(A-11) | R-59, R-61, R-62, R-64, R-66, R-67 |
| `presetValues` | `src/settings/presetValues.ts` (**신규**, 45줄 실측, 순수) | 화면 로컬 순수 모듈 | §3 | 판정·날짜 표시·표시용 에러 변환 | R-58, R-65, R-66, R-62 |
| `SettingsCard` | `components/SettingsCard.tsx` (기존) | 화면 로컬(재사용) | `{ title; action?; children }` | 카드 2장의 틀 | R-66 |
| `ConfirmDialog` | `components/ConfirmDialog.tsx` (기존) | 화면 로컬(재사용, 입력칸 없음) | `{ open; title; message; confirmLabel; cancelLabel; tone?; onConfirm; onCancel }` | 적용·삭제 확인창(`tone` 기본 `'danger'` — 둘 다 되돌릴 수 없는 조작). 첫 포커스 = 취소, Esc = 취소 | R-61, R-64 |
| `TabIcon` | `components/TabIcon.tsx` (기존, 개정) | 화면 로컬 | `name`에 `'presets'` 추가 | §2.4 | R-66 |
| `Shell`·`SettingsApp` | `src/settings/index.tsx` (기존, 개정) | 화면 진입 | `Tab`에 `'presets'`, `TAB_IDS` 다섯째(맨 끝), `TAB_KEY.presets = 'tabPresets'`, 패널 `{tab === 'presets' && <PresetsTab manifest={manifest} onError={onError} />}`. 머리 주석 「탭 4개」 → 「탭 5개」 | R-66, R-27 |

- (CR-065) 컴포넌트 1개 추가(`PresetPreviewBox`, 신규 파일)와 `PresetCard`·`presetValues` 개정은 **§11.2**. 위 표의 `PresetCard` 「책임」에 「위 미리보기」가 더해진다.
- 공용 `src/components/ui`는 비어 있다(`design.md` §3·§11 D-1) — 입력칸·버튼·목록은 표준 원소를 화면 로컬 컴포넌트 안에서 쓴다(기존 편차 D-1 그대로, 새 편차 없음).
- 새 이벤트 구독 없음. `useBridgeEvent`를 이 탭에서 쓰지 않는다(계약 §5.11 — 새 이벤트 없음).

### 2.1 `PresetSaveCard` props

| prop | 타입 | 뜻 |
|---|---|---|
| `manifest` | `AssetManifest` | 필수 그림 판정(§3 `missingRequiredSlots`) |
| `pending` | `boolean` | 프리셋 command 진행 중 — 저장·가져오기 비활성, 이름 입력 `readOnly` |
| `status` | `string` | 상태 줄 문구(이미 치환된 문자열) |
| `problems` | `readonly PresetProblem[]` | 마지막 가져오기 문제 목록(비면 블록 없음) |
| `focusTarget` | `'name' \| 'save' \| 'import' \| null` | 포커스 요청(§8.2) |
| `onFocused` | `() => void` | 포커스를 옮긴 뒤 요청 비우기 |
| `onSave` | `(name: string) => Promise<boolean>` | `true` = 저장 성공(카드가 입력을 비운다) |
| `onImport` | `() => Promise<void>` | 가져오기 흐름 시작 |

### 2.2 `PresetCard` props

| prop | 타입 | 뜻 |
|---|---|---|
| `preset` | `PresetSummary` | 표시 대상 |
| `pending` | `boolean` | 모든 버튼 비활성, 편집 입력 `readOnly` |
| `renaming` | `boolean` | 이 카드가 인라인 편집 중인지 |
| `renameDraft` | `string` | 편집 중 입력값(부모 소유) |
| `focusTarget` | `'apply' \| 'export' \| 'rename' \| 'delete' \| 'renameInput' \| null` | 포커스 요청(§8.2). `'renameInput'` = 편집 입력칸(편집 저장 실패 복귀용) |
| `onFocused` | `() => void` | 요청 비우기 |
| `onApply` · `onExport` · `onStartRename` · `onDelete` | `() => void` | 버튼 4 |
| `onRenameDraft` | `(value: string) => void` | 입력 변경 |
| `onRenameSave` · `onRenameCancel` | `() => void` | 편집 저장·취소 |

- (CR-065) props는 **바뀌지 않는다** — 미리보기 데이터는 `preset.preview`(`PresetSummary`의 새 필드, §11.9)로 이미 들어온다. 별도 `preview` prop을 두지 않는다(같은 값을 두 길로 받지 않음). 카드 안 배치는 §11.1, 렌더 규칙은 §11.5.
- 카드 안 id: `useId()`로 이름 요소 id를 만들어 `<li aria-labelledby={nameId}>`로 건다.
- 편집 중에도 `<h3 id={nameId}>`(현재 저장된 이름)는 **DOM에 남기고 시각적으로만 숨긴다**(`className={renaming ? styles.visuallyHidden : styles.itemName}`) — `li`의 접근 이름 참조가 끊기지 않는다. 입력칸은 h3 바로 뒤에 렌더한다.

### 2.3 스타일 (`src/settings/components/PresetsTab.module.css` 신규, 119줄 실측 — 세 컴포넌트가 공유, 새 CSS 모듈은 이것 하나)

(CR-065) 아래 표의 `.list`·`.item`·`.itemName`·`.itemMeta`·`.itemActions` 행은 **§11.6이 대체**하고, 새 클래스(`.preview`·`.previewLayer`·`.previewNote`·`.cardNameRow`·`.actionGrid`)도 §11.6에 있다. 나머지 행은 그대로다.

기존 재사용: 버튼 = `GeneralTab.module.css` `.outlineButton`(적용·내보내기·이름 바꾸기·가져오기·편집 취소)·`.dangerButton`(삭제), 설명 = `.fieldDesc`, 상태 줄 = `.notice`, 이유 줄 = `.hint`, 카드 사이 간격 = `.stack`(`ResetAllCard`의 `GeneralTab.module.css` 공유 선례). 색은 기존 `--st-*` 토큰만 쓴다(새 색 없음).

| 클래스 | 값 |
|---|---|
| `.nameRow` | `display: flex; flex-wrap: wrap; align-items: center; gap: var(--st-gap-sm); padding: 8px 0` |
| `.nameInput` | `flex: 1 1 200px; min-width: 0; padding: 6px 10px; border: 1px solid var(--st-border); border-radius: 8px; font: inherit` / `:focus-visible { outline: 2px solid var(--st-accent); outline-offset: 1px }` |
| `.primaryButton` (저장·이름 저장) | `padding: 6px 14px; border: 0; border-radius: 999px; background: var(--st-accent); color: #fff; font: inherit; font-weight: 600; cursor: pointer` / `:hover:not(:disabled) { background: var(--st-accent-hover) }` / `:disabled { opacity: 0.5; cursor: not-allowed }` / `:focus-visible { outline: 2px solid var(--st-ink); outline-offset: 2px }` |
| `.divider` | `border: 0; border-top: 1px solid var(--st-border); margin: var(--st-gap-md) 0` (`<hr>`) |
| `.problems` | `margin: 8px 0 0; padding: 8px 12px; background: #fde8e8; color: var(--st-danger); border-radius: 8px; font-size: 13px`(창 오류 줄 `.error`와 같은 값) / `.problems ul { margin: 4px 0 0; padding-left: 18px }` |
| `.list` | `list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--st-gap-sm)` |
| `.item` | `padding: var(--st-gap-md); border: 1px solid var(--st-border); border-radius: 8px` |
| `.itemName` (`h3`) | `margin: 0; font-size: 14px; font-weight: 700; color: var(--st-ink); overflow-wrap: anywhere` |
| `.visuallyHidden` (편집 중 h3) | `position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0` |
| `.itemMeta` | `margin: 4px 0 0; color: var(--st-muted); font-size: 12px` |
| `.itemActions` | `display: flex; flex-wrap: wrap; gap: var(--st-gap-sm); margin-top: var(--st-gap-sm)` |

폭 검산(최소 창 — 카드 안 폭 424px, ui-designer 메모): 버튼 4개 ko 「적용」「내보내기」「이름 바꾸기」「삭제」 ≈ 56 + 84 + 98 + 56 + 간격 24 = **318px ≤ 424** 한 줄. ja·en이 넘치면 `flex-wrap`으로 줄바꿈(깨지지 않음). 이름 입력은 `flex: 1 1 200px`이라 저장 버튼과 한 줄(200 + 8 + 60 ≤ 424).

### 2.4 `TabIcon` `presets` — 겹친 카드 두 장

`TabIconProps['name']`에 `'presets'`를 더하고 `SHAPES.presets`(공통 `<svg>` 속성 불변 — 24×24 stroke, `aria-hidden`):

| `name` | 뜻 | 자식 원소 |
|---|---|---|
| `presets` | 겹친 카드 두 장(앞 카드 + 뒤 카드 테두리) | `<rect x="8" y="3" width="13" height="13" rx="2" />` `<path d="M16 21H5a2 2 0 0 1-2-2V8" />` |

패킷 §1 모양 그대로 확정(다듬지 않음). 파일 머리 주석에 `CR-064` 한 줄.

## 3. 순수 모듈 (`src/settings/presetValues.ts`)

React·bridge 호출 없음(타입·상수 import만). 모든 함수 50줄 이하, 테스트 100%(상태 없는 판정 로직). (CR-065) 미리보기 배치 함수 `previewLayout`·상수 `PREVIEW_ORDER`·타입 2개 추가는 **§11.3**.

| 이름 | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `LOCALE_BY_LANGUAGE` | `Readonly<Record<Language, string>>` = `{ ko: 'ko-KR', ja: 'ja-JP', en: 'en-US' }` | 날짜 표시 로캘 | — | R-66 |
| `missingRequiredSlots` | `(manifest: AssetManifest) => AssetSlot[]` | `REQUIRED_SLOTS`(bridge 정본 — 새 필수 목록을 만들지 않는다) 중 `manifest.entries`의 어느 `slotKey(entry.slot)`와도 `slotKey(slot)`가 같지 않은 것을 `REQUIRED_SLOTS` 순서로 반환. 예: 둘 다 있음 → `[]`, `kb_up`만 없음 → `['kb_up']`, 빈 매니페스트 → `['kb_up', 'mouse_base']` | 없음 | R-65 |
| `isPresetNameFilled` | `(name: string) => boolean` | `name.trim().length > 0`. 상한은 입력칸 `maxLength={PRESET_NAME_MAX}`가 막고 최종 판정(유니코드 스칼라 수·제어 문자)은 core(`preset.invalid_name` — 계약 §3.11 `name` 행) | 없음 | R-58, R-64 |
| `canSavePreset` | `(name: string, manifest: AssetManifest) => boolean` | `isPresetNameFilled(name) && missingRequiredSlots(manifest).length === 0`. `pending`은 호출하는 컴포넌트가 따로 AND 한다(순수 함수에 UI 상태를 넣지 않음) | 없음 | R-58, R-65 |
| `formatSavedAt` | `(ms: number, language: Language) => string` | `new Intl.DateTimeFormat(LOCALE_BY_LANGUAGE[language], { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms))`. 표시 시간대 = 사용자 PC 로컬 | `ms`가 유한수가 아니거나 `Date`가 무효면 `''`(던지지 않음 — `format`의 `RangeError` 방지) | R-66 |
| `presetErrorForDisplay` | `(e: BridgeError) => BridgeError` | `e.code === 'preset.export_exists'`이면 `{ code: e.code, message: '' }`, 그 밖은 `e` 그대로. 이유: `errorText`는 ko에서 core `message`(「같은 이름의 폴더가 이미 있습니다.」)를 먼저 쓰는데, 사용자가 할 일(다른 위치·이름 바꾸기)은 사전 문구에만 있다 — 빈 message로 넘겨 ko도 사전 문구(§4.6)를 쓰게 한다 | 없음 | R-62 |

- 자리표시자 치환은 기존 `format()`(`i18n/index.ts`, `design/i18n.md` §3)을 쓴다. 이 모듈에 `fill`을 새로 만들지 않는다(패킷 §4의 「또는 기존 방식」 채택).
- 가져오기 문제 사유 문구는 새 함수 없이 기존 `errorText(t, language, { code: p.code, message: '' })`로 만든다 — message가 비어 `t.errors[code]`, 사전에 없으면 `t.errors.unknown`(§4.6 규칙 그대로).

## 4. 상태

| 상태 | 용도 | 타입 | 초기값 | 소유 |
|---|---|---|---|---|
| `presets` | 목록 | `PresetSummary[] \| null` | `null`(첫 조회 전 — 목록·빈 문구 모두 안 그림) | `PresetsTab` |
| `pending` | 프리셋 command(폴더 선택 대기 포함) 진행 중 — **탭 안 모든 프리셋 버튼 비활성**, 탭 루트 `aria-busy` | `boolean` | `false` | `PresetsTab` |
| `status` | 마지막 성공 안내(치환된 문자열) | `string` | `''` | `PresetsTab` |
| `problems` | 마지막 가져오기의 파일별 문제 | `PresetProblem[]` | `[]` | `PresetsTab` |
| `confirm` | 열린 확인창 | `{ kind: 'apply' \| 'delete'; preset: PresetSummary } \| null` | `null` | `PresetsTab` |
| `renamingId` | 인라인 편집 중인 카드 id(한 번에 한 장) | `string \| null` | `null` | `PresetsTab` |
| `renameDraft` | 편집 입력값 | `string` | `''` | `PresetsTab` |
| `focusRequest` | 다음 렌더 뒤 옮길 포커스(§8.2) | `{ area: 'save'; target: 'name' \| 'save' \| 'import' } \| { area: 'card'; id: string; target: 'apply' \| 'export' \| 'rename' \| 'delete' \| 'renameInput' } \| null` | `null` | `PresetsTab` |
| `name` | 저장 이름 입력값 | `string` | `''` | `PresetSaveCard`(로컬) |
| `failedUrl` (CR-065) | 로드에 실패한 미리보기 그림 url | `string \| null` | `null` | `PresetPreviewBox`(로컬, §11.4) |

- 탭을 떠나면(`Shell`이 선택 탭 하나만 렌더) 모든 상태가 버려지고, 다시 들어오면 초기값에서 `listPresets()`부터 한다. 진행 중 command가 언마운트 뒤 끝나면 `setState`를 하지 않되(`aliveRef`), 실패는 `onError`로 창 공통 오류 줄에 보낸다(`ResetAllCard` §7.2 규범과 같음). 뜻을 한 문장으로: 흐름은 언마운트와 무관하게 끝까지 진행하고(성공 경로의 `reload()`·`listPresets()` 호출도 그대로 한다), 각 `setPresets`·`setStatus`·`setProblems`·`setPending`·`setFocusRequest` 등 로컬 상태 쓰기만 `aliveRef.current`가 false면 건너뛴다 — `onError` 호출은 건너뛰지 않는다.
- 설정·매니페스트는 이 탭이 소유하지 않는다. `manifest`는 `SettingsApp` 상태(기존 `assets://changed` 구독)를 props로 받는다.

## 5. 기능 명세

### 5.1 `PresetsTab`

공통 규칙 — **작업 시작 `begin()`**: `pending = true`, `status = ''`, `problems = []`, `renamingId = null`(다른 조작이 시작되면 인라인 편집은 버린다 — 이름 바꾸기 저장 자신은 예외, 아래). **작업 끝 `end()`**: `pending = false`. 모든 reject는 `onError(toBridgeError(e))`, 성공은 `onError(null)`. `pending`이면 모든 핸들러는 즉시 반환(재진입 방지).

| function | 시그니처 | 입력 | 출력(상태 변경) | 동작 | 예외 | 요구ID |
|---|---|---|---|---|---|---|
| `reload` | `() => Promise<PresetSummary[] \| null>` | 없음 | `presets` | `listPresets()` → `setPresets(list)` → `list` 반환 | reject → `onError`, `presets` 그대로(첫 조회 실패면 `null` 유지 — 목록 자리 비어 있음), `null` 반환 | R-66 |
| 마운트 효과 | `useEffect(() => { void reload() }, [])` | — | — | 마운트 1회. 이벤트 구독 없음 | — | R-66 |
| `onSave` | `(name: string) => Promise<boolean>` | 입력 원문 | `status`·`presets`·`focusRequest` | `canSavePreset(name, manifest)`가 false면 `false` 반환(방어). `begin()` → `savePreset(name.trim())` → `status = format(t.presetSaved, { name: summary.name })` → `onError(null)` → `await reload()` → `end()` → `focusRequest = { area: 'save', target: 'name' }` → `true` | reject(`preset.invalid_name`·`preset.missing_required`·`preset.io`·`state.poisoned`) → `onError`, `end()`, `focusRequest = save/'save'`, `false`(입력 유지) | R-58, R-65 |
| `onImport` | `() => Promise<void>` | 없음 | `problems`·`status`·`presets` | `begin()` → `dir = await pickFolder(t.pickPresetFolderTitle)` → `null`이면 `end()`·`focusRequest = save/'import'`·끝(오류 줄 불변) → `report = await importPreset(dir)` → `report.preset === null`이면 `problems = report.problems`, `onError(null)`, 재조회 **없음** → 아니면 `status = format(t.presetImported, { name: report.preset.name })`, `onError(null)`, `await reload()` → `end()` → `focusRequest = save/'import'` | `pickFolder`·`importPreset` reject(`preset.bad_dir`·`not_preset`·`format`·`invalid_name`·`invalid_settings`·`io`) → `onError`, `end()`, 포커스 가져오기 버튼 | R-63 |
| `onApplyRequest` | `(p: PresetSummary) => void` | 카드 | `confirm` | `pending`이면 무시. `renamingId = null` → `confirm = { kind: 'apply', preset: p }` | 없음 | R-61 |
| `onDeleteRequest` | `(p: PresetSummary) => void` | 카드 | `confirm` | 위와 같이 `kind: 'delete'` | 없음 | R-64 |
| `onConfirmCancel` | `() => void` | — | `confirm`·`focusRequest` | `confirm = null`, `focusRequest = { area: 'card', id, target: kind === 'apply' ? 'apply' : 'delete' }`(누른 버튼으로 복귀) | 없음 | R-61, R-64 |
| `onConfirmOk` | `() => Promise<void>` | — | — | `confirm` 복사 후 `confirm = null` → kind별 `applyConfirmed(p)`·`deleteConfirmed(p, index)`(`index` = 현재 `presets`에서의 위치) | — | R-61, R-64 |
| `applyConfirmed` | `(p: PresetSummary) => Promise<void>` | — | `status` | `begin()` → `applyPreset(p.id)` → `status = format(t.presetApplied, { name: p.name })`, `onError(null)`. **목록 재조회 없음**(적용은 목록을 바꾸지 않는다). 화면 값은 기존 `settings://changed`·`assets://changed` 구독으로만 바뀐다(낙관적 갱신 없음 — §6.2) → `end()` → `focusRequest = card/p.id/'apply'` | reject(`preset.not_found`·`format`·`invalid_settings`·`damaged`·`io`·`settings.io`·`state.poisoned`) → `onError`, 같은 포커스. `preset.damaged`·되돌림 성공 경우 디스크·설정 불변(계약 §5.11 나), 되돌림 실패 경우에도 core가 이벤트를 보내 화면이 디스크 상태로 맞춰진다 | R-61, R-67 |
| `onExport` | `(p: PresetSummary) => Promise<void>` | 카드 | `status` | `begin()` → `dir = await pickFolder(t.pickExportFolderTitle)` → `null`이면 `end()`·포커스 복귀·끝 → `result = await exportPreset(p.id, dir)` → `status = format(t.presetExported, { folder: result.folderName })`, `onError(null)`. 재조회 없음 → `end()` → `focusRequest = card/p.id/'export'` | reject → `onError(presetErrorForDisplay(toBridgeError(e)))`(§3 — `preset.export_exists`는 사전 문구로), 같은 포커스 | R-62 |
| `onStartRename` | `(p: PresetSummary) => void` | 카드 | `renamingId`·`renameDraft` | `pending`이면 무시. `status = ''`, `renamingId = p.id`, `renameDraft = p.name`(다른 카드 편집 중이면 그 초안은 버림) | 없음 | R-64 |
| `onRenameSave` | `() => Promise<void>` | — | `renamingId`·`presets` | `isPresetNameFilled(renameDraft)`가 false거나 `pending`이면 무시. `pending = true`, `status = ''`(편집은 유지) → `renamePreset(id, renameDraft.trim())` → `onError(null)` → `renamingId = null` → `await reload()` → `pending = false` → `focusRequest = card/id/'rename'`. 안내 문구 없음(바뀐 이름이 목록에 바로 보임 — 패킷 §2) | reject(`preset.not_found`·`invalid_name`·`format`·`io`) → `onError`, `pending = false`, **편집 유지**(초안 그대로), `focusRequest = card/id/'renameInput'` — Enter 경로(포커스가 입력칸에 있음)와 「저장」 클릭 경로(pending 동안 버튼이 비활성이라 포커스가 사라짐) 모두 입력칸으로 돌아온다 | R-64 |
| `onRenameCancel` | `() => void` | — | `renamingId` | `renamingId = null`, `focusRequest = card/id/'rename'` | 없음 | R-64 |
| `deleteConfirmed` | `(p: PresetSummary, index: number) => Promise<void>` | — | `presets`·`status` | `begin()` → `deletePreset(p.id)` → `status = format(t.presetDeleted, { name: p.name })`, `onError(null)` → `rest = (presets ?? []).filter(x => x.id !== p.id)`, `setPresets(rest)`(계약 §5.11 — 성공 = 목록에서 사라짐, 재조회 실패에도 삭제된 카드가 남지 않게) → `list = (await reload()) ?? rest`(재조회 실패면 `rest`로 판정) → `end()` → 포커스 대상 = `list[index] ?? list[index − 1]`의 `'apply'`(`focusRequest = card/그 id/'apply'`), 둘 다 없으면(목록 빔) `save/'name'`(§8.2) | reject(`preset.not_found`·`io`) → `onError`, `focusRequest = card/p.id/'delete'` | R-64 |

- 이름 중복은 막지 않는다(PS-07). 같은 폴더를 두 번 가져오면 카드가 2장 생긴다(계약 §5.11) — 정상.

### 5.2 `PresetSaveCard`

| function | 시그니처 | 동작 | 요구ID |
|---|---|---|---|
| 파생 `missing` | `missingRequiredSlots(manifest)` | 비어 있지 않으면 이유 줄 `t.presetSaveNeedsRequired`(`p.hint`, id `needsId`)를 **입력 여부와 무관하게 항상** 보인다 | R-65 |
| 파생 `saveEnabled` | `canSavePreset(name, manifest) && !pending` | 저장 버튼 `disabled={!saveEnabled}`, 필수 누락이면 저장 버튼 `aria-describedby={needsId}` | R-58, R-65 |
| `onNameChange` | `(e: ChangeEvent<HTMLInputElement>) => void` | `setName(e.target.value)` | R-58 |
| `submit` | `() => Promise<void>` | `saveEnabled`가 false면 무시 → `ok = await onSave(name)` → `ok`면 `setName('')` | R-58 |
| `onNameKeyDown` | `(e: KeyboardEvent<HTMLInputElement>) => void` | `Enter`이고 `!e.nativeEvent.isComposing`(한국어·일본어 IME 조합 중 Enter 무시)이면 `preventDefault()` → `void submit()` | R-58 |
| 포커스 효과 | `useEffect(…, [focusTarget, pending])` | `focusTarget`이 있고 `!pending`이면 해당 ref(`nameRef`·`saveRef`·`importRef`)에 `focus()` → `onFocused()`. 대상이 비활성(예: 저장 성공 뒤 저장 버튼)이면 요청이 `'name'`이라 문제없다 | R-66 |

### 5.3 `PresetCard`

| function | 시그니처 | 동작 | 요구ID |
|---|---|---|---|
| 파생 `meta` | `[format(t.presetSavedAt, { date: formatSavedAt(preset.savedAt, language) }), format(t.presetImageCount, { count: preset.imageCount }), preset.hasAlarm ? t.presetHasAlarm : t.presetNoAlarm].join(' · ')` | 한 줄 요약. **(CR-065) §11.5 `metaDate`·`metaInfo` 두 줄로 대체** | R-59, R-66 |
| 파생 `aria(action)` | `format(t.presetActionAria, { action, name: preset.name })` | 버튼 4개 `aria-label`(보이는 글자는 동사만) | R-66 |
| `onDraftKeyDown` | `(e: KeyboardEvent<HTMLInputElement>) => void` | 먼저 `e.nativeEvent.isComposing`이면 **아무것도 하지 않고 반환**(Enter·Escape 모두 — 조합 중 Esc는 IME가 조합을 취소하는 키라 편집 취소로 쓰지 않는다. 조합이 끝난 뒤 다시 누른 Esc가 편집 취소). 그 밖: `Enter`·저장 가능 → `preventDefault()`·`onRenameSave()`. `Escape` → `preventDefault()`·`onRenameCancel()` | R-64 |
| 편집 저장·취소 버튼 | 보이는 글자 = `t.presetRenameSave`·`t.confirmCancel`, `aria-label` = `format(t.presetActionAria, { action: t.presetRenameSave, name: preset.name })`·`format(t.presetActionAria, { action: t.confirmCancel, name: preset.name })`(예 「저장: 고양이 A」·「취소: 고양이 A」) — 저장 카드의 「저장」(접근 이름 「저장」)과 구분된다. 새 키 없음(기존 `presetActionAria` 재사용) | R-64, R-66 |
| 편집 입력 | `<input autoFocus value={renameDraft} maxLength={PRESET_NAME_MAX} readOnly={pending} aria-label={format(t.presetRenameInputAria, { name: preset.name })} onFocus={e => e.currentTarget.select()} …>` | 편집 시작 때 현재 이름 전체 선택 | R-64 |
| 포커스 효과 | `useEffect(…, [focusTarget, pending, renaming])` | `focusTarget`이 있고 `!pending`이면 해당 ref(버튼 4개 또는 `'renameInput'` = 편집 입력 ref)에 `focus()` → `onFocused()` | R-66 |

## 6. 파이프라인

### 6.1 정상·오류 흐름

| # | 흐름 | 정상 | 오류 |
|---|---|---|---|
| PR-1 | 탭 진입 | 마운트 → `listPresets()` → 카드 N장 또는 `presetListEmpty` | `preset.io` → 오류 줄, 목록 자리 비어 있음. 다시 들어오면 재시도 |
| PR-2 | 저장 | 이름 입력 → 저장(또는 Enter) → `savePreset(trim)` → 상태 줄 `presetSaved` → 입력 비움 → 재조회(새 카드 맨 위) → 포커스 이름 입력 | 오류 줄, 입력 유지, 포커스 저장 버튼 |
| PR-3 | 가져오기 | 가져오기 → 폴더 선택 → `importPreset(dir)` → 등록되면 `presetImported` + 재조회 / 문제 보고서면 `presetImportFailed` + 문제 목록(재조회 없음, 목록 불변) | 폴더 선택 취소 = 아무 일 없음. reject = 오류 줄 |
| PR-4 | 적용 | 적용 → 확인창 → 확인 → `applyPreset(id)` → `presetApplied`. 오버레이·다른 탭 값은 core가 보내는 `settings://changed`·`assets://changed`로 바뀐다(이 탭의 저장 버튼 활성도 새 `manifest`로 다시 계산) | 확인창 취소 = 호출 0회. reject = 오류 줄(`preset.damaged` = 지금 상태 그대로) |
| PR-5 | 내보내기 | 내보내기 → 폴더 선택 → `exportPreset(id, dir)` → `presetExported`(폴더 이름) | 선택 취소 = 아무 일 없음. `preset.export_exists` = 오류 줄 사전 문구(다른 위치·이름 바꾸기 안내) |
| PR-6 | 이름 바꾸기 | 이름 바꾸기 → 입력칸(현재 이름 선택) → 저장/Enter → `renamePreset(id, trim)` → 편집 종료 → 재조회 → 포커스 「이름 바꾸기」 | 취소/Esc = 원래 이름. reject = 오류 줄, 편집 유지 |
| PR-7 | 삭제 | 삭제 → 확인창 → 확인 → `deletePreset(id)` → `presetDeleted` → 재조회 → 포커스 이웃 카드 「적용」 또는 이름 입력 | 확인창 취소 = 호출 0회. reject = 오류 줄 |

### 6.2 적용 성공 뒤 갱신 규칙 (계약 §5.11 · §9 v0.30 ui 인계 메모)

| 대상 | 갱신 방법 | 이 탭이 하는 일 |
|---|---|---|
| 프리셋 목록 | 바뀌지 않는다(PS-10 — 적용은 복사) | **재조회 안 함** |
| 설정(배율·휴식·어깨축·타이머 등) | core가 `settings://changed` 방출 → `SettingsApp` 기존 구독이 `settings` 교체 → 다른 탭이 다음 렌더에 새 값 | 없음(낙관적 갱신 금지) |
| 그림 매니페스트 | core가 `assets://changed` 방출 → `SettingsApp` `manifest` 교체 → 이 탭의 `missingRequiredSlots`도 새 매니페스트로 | 없음 |
| 알림음 카드(타이머 탭 `AlarmSoundCard`) | 알림음은 이벤트가 없다(A-1). `AlarmSoundCard`는 **마운트 때 `getAlarmSound()`를 1회** 다시 읽는다(`design/timer-tab.md` §14.7.3). `Shell`은 선택 탭 하나만 렌더하므로(`index.tsx` 탭 패널 조건부 렌더) 프리셋 탭에서 적용하는 동안 `AlarmSoundCard`는 **언마운트 상태**이고, 사용자가 타이머 탭으로 옮기면 새로 마운트되며 적용된 알림음을 읽는다 — 옛 표시가 남는 경로가 없다 | **`getAlarmSound`를 부르지 않는다**(부를 곳·받을 상태가 이 탭에 없음). 전제: 탭 패널 조건부 렌더 유지. 탭을 숨김 유지(keep-alive) 방식으로 바꾸면 이 규칙이 깨진다 — 그때는 `AlarmSoundCard`에 재조회 신호가 필요(§10 확인 필요) |
| 오버레이 알림음 | 울릴 때 `get_alarm_sound`로 조회(overlay 몫) | 없음 |

### 6.3 확인창 문구 (파괴 조작 — 전략 §11)

| 조작 | 제목 | 본문 | 확인 | 취소 | `tone` |
|---|---|---|---|---|---|
| 적용 | `confirmPresetApplyTitle` | `format(confirmPresetApplyMessage, { name })` — 통째 교체·빈 칸 비워짐·자동 백업 없음(먼저 저장 안내)·PC별 설정 유지(R-60·R-61) | `confirmPresetApplyOk` | `confirmCancel`(기존) | `'danger'`(기본) |
| 삭제 | `confirmPresetDeleteTitle` | `format(confirmPresetDeleteMessage, { name })` — 되돌릴 수 없음 | `confirmPresetDeleteOk` | `confirmCancel` | `'danger'` |

## 7. 버튼 활성 표 · 에러 매핑

### 7.1 버튼 활성/비활성

| 컨트롤 | 활성 조건 | 비활성일 때 |
|---|---|---|
| 이름 입력(저장) | 항상 편집 가능, `pending`이면 `readOnly` | — |
| 저장 | `canSavePreset(name, manifest) && !pending` — 이름 trim 비어 있지 않음 **그리고** 필수 2장(`REQUIRED_SLOTS` = `kb_up`·`mouse_base`) 등록 **그리고** 진행 중 아님 | 필수 누락이면 이유 줄 `presetSaveNeedsRequired` 항상 표시(PS-08). core `preset.missing_required`는 방어(오류 줄) |
| 폴더에서 가져오기 | `!pending` | — |
| 카드 적용·내보내기·삭제 | `!pending` | — |
| 카드 이름 바꾸기 | `!pending && !renaming` | 편집 중인 그 카드만 비활성 |
| 편집 입력 | `pending`이면 `readOnly` | — |
| 편집 저장 | `isPresetNameFilled(renameDraft) && !pending` | 빈 이름 저장 불가(PS-07) |
| 편집 취소 | `!pending` | — |

- `pending`은 탭 안 프리셋 버튼만 막는다. 다른 탭 이동·조작은 막지 않는다(직렬화는 core 동기 command가 보장 — 계약 §5.11 C-4).

### 7.2 에러 code → 문구 (`design/i18n.md` §4.6 · 표시 = 창 공통 오류 줄 `errorText`)

| code | 오는 곳 | 표시 |
|---|---|---|
| `preset.not_found` | apply·export·rename·delete | 오류 줄 |
| `preset.invalid_name` | save·rename·import | 오류 줄(rename이면 편집 유지) |
| `preset.missing_required` | save(방어) · 가져오기 문제 목록 code | 오류 줄 / 문제 줄 |
| `preset.not_preset` | import | 오류 줄 |
| `preset.format` | import·apply·export·rename | 오류 줄(ko = core message, 사유 포함) |
| `preset.invalid_settings` | import·apply | 오류 줄 |
| `preset.damaged` | apply | 오류 줄(ko = core message, 파일 이름 포함) |
| `preset.bad_dir` | import·export | 오류 줄 |
| `preset.export_exists` | export | 오류 줄 — **사전 문구 우선**(`presetErrorForDisplay`, §3) |
| `preset.io` | 전부 · 가져오기 문제 목록 code | 오류 줄 / 문제 줄 |
| `preset.file_missing` | 가져오기 문제 목록 전용 | 문제 줄 |
| `preset.file_link` | 가져오기 문제 목록 전용 | 문제 줄 |
| `preset.forbidden` | (설정 창에서는 나지 않음) | 사전 없음 — ko = core message, ja·en = `unknown`(계약 §6 `reset.forbidden` 선례) |
| 기존 `asset.*`·`sound.*` 8개 | 가져오기 문제 목록 code | 문제 줄 — 기존 사전 문구 재사용 |
| `settings.io`·`state.poisoned` | apply·save | 오류 줄(기존 문구) |

- 문제 줄 = `{p.fileName} — {errorText(t, language, { code: p.code, message: '' })}`. `fileName`은 경로 없는 파일 이름(계약 §3.11)이라 그대로 보인다.

## 8. 접근성

### 8.1 역할·이름

| 요소 | role·속성 |
|---|---|
| 탭 루트 | `<section aria-label={t.tabPresets} aria-busy={pending \|\| undefined} className=stack>` — 다른 탭 본문과 같은 방식(`GeneralTab`·`ImagesTab`·`MousePartsTab`·`TimerTab` 모두 `<section aria-label={t.tab…}>`)으로 암묵 `role="region"`, 접근 이름 = 탭 이름(`tabPresets`) |
| 카드 2장 | `SettingsCard`(`section aria-labelledby` 제목) |
| 이름 입력 | `<label htmlFor>` = `presetNameLabel`, `placeholder` = `presetNamePlaceholder`, `maxLength={PRESET_NAME_MAX}` |
| 이유 줄 | `p id={needsId}` — 저장 버튼 `aria-describedby`(필수 누락일 때만) |
| 상태 줄 | `p role="status" aria-live="polite"`(`.notice`) — 비어 있어도 원소는 늘 있다(알림 누락 방지) |
| 문제 목록 | `<div role="alert" className=problems>` 안 `p id={problemsId}` = `presetImportFailed` + `<ul aria-labelledby={problemsId}>` |
| 목록 | `<ul className=list>` / 카드 `<li aria-labelledby={nameId}>` / 이름 `<h3 id={nameId}>` — (CR-065) 격자여도 `ul`/`li` 그대로(목록 의미·항목 수 안내 유지). `h3`에 `title={preset.name}`(2줄 말줄임 대비) |
| 미리보기 (CR-065) | 장식 — `<div className=preview>`(role 없음) 안 `<img alt="">` 전부(빈 alt = 보조기술이 건너뜀). 카드 이름은 `h3`가 맡는다. 안내 `p`(`presetPreviewUnavailable`)는 일반 텍스트로 읽힌다(§11.7) |
| 카드 버튼 4 | `type="button"`, 보이는 글자 = `presetApply`… , `aria-label` = `presetActionAria`(예: 「적용: 고양이 A」) |
| 편집 입력 | `aria-label` = `presetRenameInputAria`(「고양이 A」 새 이름) |
| 확인창 | 기존 `ConfirmDialog`(`alertdialog`, 첫 포커스 취소, Tab 순환, Esc 취소) |

### 8.2 포커스 순서·이동

- 탭 순서: 이름 입력 → 저장 → 가져오기 → (카드마다) 적용 → 내보내기 → 이름 바꾸기 → 삭제. 편집 중 카드는 이름 자리 입력 → 편집 저장 → 편집 취소 → 적용 → 내보내기 → (이름 바꾸기 비활성) → 삭제.
- 포커스 요청은 `focusRequest` 한 곳으로만 한다 — 자식은 요청을 받아 `!pending`일 때 자기 ref에 `focus()` 후 `onFocused()`로 비운다(비활성 버튼은 포커스를 못 받으므로 `pending`이 풀린 렌더에서 옮긴다 — `ResetAllCard` 선례). 편집 입력은 `autoFocus`.

| 사건 | 포커스 |
|---|---|
| 확인창 열림 | 취소(기존 `ConfirmDialog`) |
| 확인창 취소·Esc | 확인창을 연 카드 버튼(적용 또는 삭제) |
| 적용 끝(성공·실패) | 그 카드 「적용」 |
| 삭제 성공 | 판정 목록 = 재조회 결과(실패면 옛 목록에서 삭제 항목을 뺀 목록) — 그 목록의 `index`번(같은 위치) 카드 「적용」 → 없으면 `index − 1`번 카드 「적용」 → 목록이 비면 이름 입력(§5.1 `deleteConfirmed`) |
| 삭제 실패 | 그 카드 「삭제」 |
| 내보내기 끝·선택 취소 | 그 카드 「내보내기」 |
| 이름 바꾸기 시작 | 편집 입력(`autoFocus`, 전체 선택) |
| 편집 저장 성공·취소·Esc | 그 카드 「이름 바꾸기」 |
| 편집 저장 실패 | 편집 입력(`focusRequest` `'renameInput'` — Enter·클릭 두 경로 모두) |
| 저장 성공 | 이름 입력(비워짐) |
| 저장 실패 | 저장 버튼 |
| 가져오기 끝·선택 취소 | 「폴더에서 가져오기」 |

- `ImagesTab` 포커스 함정(확인창과 부모 효과의 경쟁 — ui-designer 메모 CR-035)은 이 탭에 없다: 확인창을 여는 핸들러는 `focusRequest`를 만들지 않고, 요청은 확인창이 닫힌 뒤에만 만든다.

## 9. 문구

모든 키·ko/ja/en 원문은 `design/i18n.md` §4.12(36키)와 §4.6(에러 12개)가 정본이다. 이 문서는 키 이름으로만 인용한다. 새 한국어 리터럴을 화면 코드에 쓰지 않는다(구분자 ` · `·` — `·`: ` 제외).

## 10. 파일 크기 · 예정 TC · 추가 후보 · 확인 필요

- 파일 크기(TSX·TS 400줄, 함수 50줄): `PresetsTab.tsx` ~260(핸들러 11개 — 50줄 넘는 것 없음. 넘으면 `usePresetActions` 훅으로 빼되 동작 불변), `PresetSaveCard.tsx` ~140, `PresetCard.tsx` ~130, `presetValues.ts` ~60, `PresetsTab.module.css` ~80.
- 예정 TC: 번호는 **ui-test-designer가 부여**한다(`test/scenarios.md` 마지막 번호 다음). 수용 기준 = 패킷 §5 표 그대로 + 이 문서가 더한 것: ① `presetErrorForDisplay`(`preset.export_exists` → message 빈 문자열, 다른 code 불변) ② `formatSavedAt` 무효 입력 → `''` ③ IME 조합 중 Enter 무시(저장·편집) ④ 포커스 표 §8.2(확인창 취소 복귀·삭제 뒤 이웃 카드·편집 저장 뒤 「이름 바꾸기」) ⑤ 적용 뒤 `listPresets` 추가 호출 0회·`getAlarmSound` 호출 0회 ⑥ 다른 조작 시작 시 편집 버림 ⑦ 탭 5개·End 키 = 프리셋.
- (CR-065) 파일 크기·예정 TC·확인 필요 추가분은 §11.8·§11.9.
- 추가 후보(요구 밖 — 넣지 않음): ~~썸네일~~(CR-065로 요구 R-68 승격), 「사용 중」 표시, 정렬·검색, 복제, 덮어쓰기 저장, 자동 백업, 가져오기 진행률. 필요하면 관리자 판단.
- 확인 필요:
  1. `presetErrorForDisplay`로 `preset.export_exists`만 ko에서도 사전 문구를 쓴다 — 계약 §6 core message(「같은 이름의 폴더가 이미 있습니다.」)에 안내를 넣는 대안(core 문구 변경)도 있다. 이 설계는 ui 안에서 닫는 쪽을 택했다.
  2. 알림음 카드 갱신은 「탭 조건부 렌더」 전제로 추가 호출 없이 성립한다(§6.2). 계약 §9 인계 메모의 「적용 뒤 `getAlarmSound` 재조회」 권고를 이 탭이 직접 하지 않는 근거다.
  3. `design/i18n.md` §4.12의 패킷 밖 키 2개(`presetActionAria`·`presetRenameInputAria`)는 버튼·입력 접근 이름을 위한 것이다(패킷 §3 「aria-label에 프리셋 이름 — 문구 조합 규칙은 ui-designer」).

## 11. CR-065 — 세로형 카드 격자 · 그림 미리보기 (R-66 개정 · R-68)

비유: 옷장 칸마다 옷걸이 이름표만 붙어 있던 것을, 옷을 입힌 마네킹 사진을 위에 붙인 카드로 바꾼다. 사진은 그 옷걸이에 걸린 옷(프리셋 폴더의 PNG)을 오버레이와 같은 순서로 겹쳐 찍은 것이고, 카드 아래 버튼은 전과 같다.

- 요구: requirements **v1.29** R-66(개정 — 세로형 카드 격자, 위 미리보기·아래 정보·버튼 4) · **R-68**(신설 — 미리보기 합성 규칙). 출처 확정사항 §6 「PS-09 개정 (🔒 2026-09-30, CR-065)」.
- 바뀌지 않는 것: 상태·핸들러(§4·§5.1), 파이프라인 PR-1~PR-7(§6), 확인창(§6.3), 버튼 활성 표(§7.1), 에러 매핑(§7.2), 포커스 요청 표(§8.2), 인라인 이름 편집 규칙(A-11, §5.3), 저장 카드(§2.1·§5.2).
- 여전히 없음(요구 밖): 정렬·검색·「사용 중」 표시·선택 강조·시간 글자(R-68 원문 「시간 글자 없음」)·미리보기 확대·애니메이션.

### 11.1 레이아웃 (확정)

**격자.** 목록 카드(`SettingsCard` `cardPresetList`) 안의 `ul.list` = `display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--st-gap-md)`(12px). 칸 폭은 모두 같고(`1fr`), 같은 줄의 카드는 높이가 같다(격자 기본 `align-items: stretch`). 카드 높이는 고정하지 않는다 — 미리보기 높이가 캔버스 비율을 따르기 때문이다.

폭 검산(`design.md` §2.1 내용 영역 폭, 목록 카드 테두리 1+1·안쪽 여백 16+16 = 34 차감):

| 창 폭 | 내용 영역 | 목록 카드 안 | 열 수 | 카드 폭 | 미리보기(900×700 기준) |
|---|---|---|---|---|---|
| 720(최소) | 456 | 422 | **1**(220×2 + 12 = 452 > 422) | 422 | 396 × 308 |
| 900(기본) | 636 | 602 | **2**(452 ≤ 602 < 684) | (602 − 12) / 2 = 295 | 269 × 209 |
| 982 이상 | ≥ 718 | ≥ 684 | **3**(220×3 + 24 = 684) | ≥ 220 | ≥ 194 × 151 |

- **결정: 기본 창 2열**(위임문 권고 3열 대신). 3열(900에서 카드 폭 ≈ 193 → 안쪽 167 → 버튼 칸 ≈ 79px)이면 2×2 버튼 칸에 ko 「이름 바꾸기」(글자 ≈ 74 + 좌우 여백 16 + 테두리 2 = 92)가 들어가지 않는다. `minmax(220px, 1fr)`는 버튼 칸이 가장 좁을 때(카드 220 → 안쪽 194 → 칸 (194 − 8) / 2 = 93)도 ko·ja·en 네 버튼 글자가 다 들어가는 최소 폭이다(아래 버튼 검산). 창을 넓히면 3열이 된다.
- **이미지 카드 280px 선례**: `--st-slot-card-h`(280px)는 이미지 카드의 **높이** 규격이지 폭이 아니다(`design/images-tab.md` §1). 프리셋 카드는 미리보기 높이가 캔버스 비율을 따라야 하므로 높이 고정을 **재사용하지 않는다**. 격자 규칙(`auto-fill` + `minmax` + `1fr` + 간격 12px)과 체크무늬 미리보기 바탕만 이어받는다.

**카드 한 장(평소):**

```
+-- li.item PresetCard (1fr, >= 220px) ----+
| div.preview  aspect-ratio = canvas w / h |
| +--------------------------------------+ |
| | checker bg, overflow hidden          | |
| | hair > background > pomo_char        | |
| | > pomo_bubble > mouse_base(partPos)  | |
| | > body > idle > kb_up                | |
| | > pen_up(penPos, rot 0)              | |
| | (no time text)                       | |
| +--------------------------------------+ |
| h3 name (max 2 lines, ellipsis, title)   |
| p savedAt                                |
| p imageCount . hasAlarm/noAlarm          |
| +-----------------+  +-----------------+ |
| | apply           |  | export          | |
| +-----------------+  +-----------------+ |
| | rename          |  | delete (danger) | |
| +-----------------+  +-----------------+ |
+------------------------------------------+
```

**카드 한 장(이름 편집 중 — A-11 규칙 그대로, 모양만 세로형):**

```
+-- li.item PresetCard (renaming) ---------+
| div.preview (same as above)              |
| h3 name (visually hidden, stays in DOM)  |
| input (full width, autoFocus, select)    |
| [presetRenameSave] [confirmCancel]       |
| p savedAt                                |
| p imageCount . hasAlarm/noAlarm          |
| [apply]           [export]               |
| [rename disabled] [delete]               |
+------------------------------------------+
```

- 세로 배치(위→아래) = DOM 순서 = 탭 순서: 미리보기(포커스 없음) → 이름(또는 편집 입력·저장·취소) → 날짜 줄 → 요약 줄 → 적용 → 내보내기 → 이름 바꾸기 → 삭제. §8.2 탭 순서와 같다.
- **버튼 배치 결정: 2×2**(1행 적용·내보내기, 2행 이름 바꾸기·삭제). 한 줄 4개는 카드 안 최소 194px에 들어가지 않는다(ko 합계 ≈ 318, §2.3 검산). 칸 폭은 반반(`1fr 1fr`), 버튼은 칸을 채운다.
- 버튼 글자 검산(칸 최소 93px − 테두리 2 − 좌우 여백 8+8 = 글자 자리 75px, 본문 14px 기준): ko 「이름 바꾸기」 ≈ 74 · 「내보내기」 ≈ 56 · 「적용」·「삭제」 ≈ 28 / ja 「名前を変更」 ≈ 70 · 「書き出し」 ≈ 56 / en 「Rename」 ≈ 52 · 「Export」 ≈ 48 · 「Delete」 ≈ 46 · 「Apply」 ≈ 38 → **모두 한 줄**. 글꼴 차이로 넘치면 말줄임(`text-overflow: ellipsis`) + `title` = 보이는 글자(§11.6). 접근 이름은 `aria-label`(`presetActionAria`) 그대로라 잘려도 읽기는 온전하다.
- 이름은 최대 2줄, 넘치면 말줄임 + `title={preset.name}`(이름 최대 50자 — U-7).
- 요약 줄은 둘로 나눈다(좁은 카드에서 날짜가 줄 중간에서 끊기지 않게): ① 날짜 `presetSavedAt` ② `presetImageCount` · `presetHasAlarm`/`presetNoAlarm`(구분자 ` · ` 그대로).
- 미리보기 박스 폭 = 카드 안쪽 폭 100%, 높이 = `aspect-ratio`(`previewLayout`이 주는 `"{canvas.width} / {canvas.height}"` — 기본 캔버스 900×700 → 9:7). 캔버스를 알 수 없으면 `BASE_BOX` 비율 `"450 / 350"`(9:7)로 박스만 그리고 안내 문구(§11.5).

### 11.2 컴포넌트 (CR-065 추가·개정)

| 컴포넌트/모듈 | 파일 | 분류 | props / export | 책임 | 요구ID |
|---|---|---|---|---|---|
| `PresetPreviewBox` (default·named) | `src/settings/components/PresetPreviewBox.tsx` (**신규**, ~60줄 예상) | 화면 로컬 | `{ preview: PresetPreview }` | 합성 미리보기 박스 1개 — `previewLayout` 결과대로 `<img>`를 겹친다. 그림 불러오기 실패·그림 없음 안내. bridge 호출 없음 | R-68, R-66 |
| `PresetCard` (개정) | `src/settings/components/PresetCard.tsx` (177 → ~195줄 예상) | 화면 로컬 | props 불변(§2.2) | 맨 위에 `<PresetPreviewBox preview={preset.preview} />`, 요약 두 줄, 버튼 `div.actionGrid`(2×2), 버튼 `title`, `h3` `title`, 편집 줄 `.cardNameRow` | R-66, R-68 |
| `presetValues` (개정) | `src/settings/presetValues.ts` (45 → ~95줄 예상) | 화면 로컬 순수 모듈 | §11.3 | 미리보기 배치 계산(순수) | R-68 |
| `PresetsTab` | 불변 | — | — | 목록 `ul`의 `className=list`는 그대로(격자는 CSS만 바뀐다) | R-66 |

- 공용화 후보 아님: 합성 미리보기는 `MousePartsTab`(끌기·영역 선)·`TimerTab`(글자 끌기)에도 있지만 각자 조작과 결합돼 있어 「비중복」 조건을 못 채운다. `PresetPreviewBox`는 조작 없는 읽기 전용이라 화면 로컬에 둔다.
- 오버레이 컴포넌트(`LayerStack`·`MouseArm`·`PenHand`)는 가져다 쓰지 않는다 — 상태기계·모니터·손 기준점을 요구하고 오버레이 CSS 모듈에 묶여 있다. 겹침 순서와 쉬는 자세 배치 규칙만 옮긴다(§11.3 근거표).

### 11.3 순수 모듈 추가 (`src/settings/presetValues.ts`)

`PresetPreview`·`PresetPreviewLayer`·`CanvasSize`·`Point`·`AssetSlot`은 `bridge/types` 타입, `slotKey`·`BASE_BOX`는 bridge 정본을 import한다(새 슬롯 이름 문자열 규칙을 만들지 않음).

| 이름 | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `PreviewKey` (타입) | `'hair' \| 'background' \| 'pomo_char' \| 'pomo_bubble' \| 'mouse_base' \| 'body' \| 'idle' \| 'kb_up' \| 'pen_up'` | 미리보기에 쓰는 슬롯 키(= `slotKey` 반환 문자열) | — | R-68 |
| `PreviewItem` (타입) | `{ key: PreviewKey; url: string; left: number; top: number; width: number; height: number }` | 한 장의 표시 위치·크기. **단위 = 캔버스 대비 %**(0~100, 범위 밖 허용 — 박스가 잘라 낸다) | — | R-68 |
| `PreviewLayout` (타입) | `{ aspectRatio: string; items: PreviewItem[] }` | 박스 비율(CSS `aspect-ratio` 값)과 아래→위 순서의 그림 목록 | — | R-68 |
| `PREVIEW_ORDER` | `readonly PreviewKey[]` = `['hair', 'background', 'pomo_char', 'pomo_bubble', 'mouse_base', 'body', 'idle', 'kb_up', 'pen_up']` | 겹침 순서(아래 → 위). 근거표 아래. `body`·`idle`은 관리자 결정(2026-09-30, 「오버레이 전체 그대로」 글자 그대로) | — | R-68 |
| `DEFAULT_PREVIEW_RATIO` | `string` = `` `${BASE_BOX.width} / ${BASE_BOX.height}` `` (`"450 / 350"`) | 캔버스를 모를 때 박스 비율 | — | R-68 |
| `previewLayout` | `(preview: PresetPreview) => PreviewLayout \| null` | ① `canvas`가 `null`이거나 `width`·`height`가 유한한 양수가 아니면 `null`. ② `PREVIEW_ORDER` 순서로 키마다 `preview.layers.find(l => slotKey(l.slot) === key)`(같은 키가 여럿이면 첫째) — 없으면 건너뜀. ③ 배치: `mouse_base` → `preview.partPos`에 자연 크기, `pen_up` → `preview.penPos`에 자연 크기(**`penPos`가 `null`이면 건너뜀**), 그 밖(캔버스 레이어 7종 — `hair`·`background`·`pomo_char`·`pomo_bubble`·`body`·`idle`·`kb_up`) → `{ left: 0, top: 0, width: 100, height: 100 }`. 자연 크기 배치 = `left = pos.x / cw × 100`, `top = pos.y / ch × 100`, `width = layer.width / cw × 100`, `height = layer.height / ch × 100`(반올림 없음). 회전·늘어남 없음(쉬는 자세). ④ `aspectRatio = `${cw} / ${ch}``. `PREVIEW_ORDER`에 없는 슬롯(`rest`·`key_*`·`kb_down`·`mouse_left`·`mouse_right`·`pen_down`·`pen_key_*` 등 — 쉬는 자세(대기)에서 오버레이에 보이지 않는 그림)은 무시. 입력을 바꾸지 않는다 | 던지지 않음 | R-68 |

예(검증용): 캔버스 900×700, 층 `kb_up`·`mouse_base`(200×150)·`pen_up`(120×90), `partPos` (411, 464), `penPos` (372, 476) → `aspectRatio` `"900 / 700"`, items 순서 `mouse_base`(left 45.666…, top 66.285…, width 22.222…, height 21.428…) → `kb_up`(0, 0, 100, 100) → `pen_up`(left 41.333…, top 68, width 13.333…, height 12.857…). 같은 입력에 `penPos: null` → `pen_up` 없음. `canvas: null` → `null`. `layers: []` → `{ aspectRatio: "900 / 700", items: [] }`.

**% 배치를 고른 이유**: `MousePartsTab` 선례는 `fitScale(canvas, BOX)`로 px을 계산하지만(박스 크기 고정), 프리셋 카드는 격자 `1fr`이라 폭이 창 크기에 따라 변한다. 캔버스 대비 %는 `캔버스 좌표 × fitScale ÷ 박스 폭`과 같은 값이어서 박스 폭을 재지 않아도(ResizeObserver·측정 없음) 어떤 폭에서도 오버레이와 같은 비율로 그려진다. 그래서 위임문 예시의 `previewLayout(preview, boxWidth)`에서 `boxWidth` 인자를 **뺐다**.

**겹침 순서 근거표 (정본 = `src/overlay/index.tsx` 렌더 순서, CR-051):**

| 오버레이 순서(아래 → 위) | 오버레이 요소 | 미리보기 키 | 쉬는 자세 배치 |
|---|---|---|---|
| 1 | `.hairWrap` → `HairLayer` | `hair` | 캔버스 전체 |
| 2 | `BackgroundLayer` | `background` | 캔버스 전체 |
| 3 | `PomodoroLayer` 인물 → 말풍선 → 시간 글자 | `pomo_char` → `pomo_bubble`(시간 글자 **제외**) | 캔버스 전체 |
| 4 | `.jellyWrap` 안 `MouseArm` | `mouse_base` | `partPos`에 자연 크기, `REST_TRANSFORM`(회전 0°·배율 1) |
| 5 | `.jellyWrap` 안 `LayerStack` 몸통 → 상태 → 키보드 | `body` → `idle`(상태기계 초기·대기 = `machine.layer` `'idle'`) → `kb_up`(들림) | 캔버스 전체(없는 슬롯은 건너뜀) |
| 6 | `.jellyWrap` 안 `PenHand`(맨 위) | `pen_up` | `penPos`에 자연 크기, 회전 0° |

- 오버레이는 펜 손을 **본체 묶음 위**에 그린다(`PenHand`가 `LayerStack` 뒤). 위임문의 「팔·펜 손 → 본체 묶음」 순서와 다르며, 정본(오버레이)을 따랐다(§11.9 확인 필요 1). `requirements.md` v1.12 용어 주(「헤어 → 팔 → 바탕 → 펜 손」)와도 같다.
- 펜 손은 펜 모드(`mouse.penMode`)와 무관하게 `pen_up`이 있으면 그린다 — 오버레이 `PenHand`도 `pen_up`만 있으면 그린다(펜 모드는 누름 그림 교체만 바꾼다).
- 뽀모도 인물·말풍선도 타이머 켜짐과 무관하게 등록돼 있으면 그린다 — 오버레이 `PomodoroLayer`와 같다(시간 글자만 뺀다).
- 젤리·부르르·팔 곡선 회전은 입력 반응이라 쉬는 자세에는 없다.

### 11.4 상태 (CR-065 추가)

| 상태 | 용도 | 타입 | 초기값 | 소유 |
|---|---|---|---|---|
| `failedUrl` | 마지막으로 불러오기에 실패한 미리보기 그림 url | `string \| null` | `null` | `PresetPreviewBox`(로컬) |

- 파생 `failed = failedUrl !== null && layout !== null && layout.items.some(i => i.url === failedUrl)` — 재조회로 url 목록이 바뀌면 효과 없이 저절로 풀린다(되살림 `useEffect` 없음).
- 이 상태는 부모로 올리지 않는다(`onError` 호출 없음 — 창 오류 줄은 command 실패 전용).

### 11.5 기능 명세 (CR-065)

**`PresetPreviewBox`**

| function / 파생 | 시그니처 | 동작 | 요구ID |
|---|---|---|---|
| 파생 `layout` | `useMemo(() => previewLayout(preview), [preview])` | §11.3 | R-68 |
| 파생 `showNote` | `layout === null \|\| layout.items.length === 0 \|\| failed` | 안내 문구를 보일지 | R-68 |
| 렌더 | — | `<div className={styles.preview} style={{ aspectRatio: layout?.aspectRatio ?? DEFAULT_PREVIEW_RATIO }}>` 안에 — `showNote`면 `<p className={styles.previewNote}>{t.presetPreviewUnavailable}</p>` **하나만**(그림 없음), 아니면 `layout.items`를 순서대로 `<img key={item.key} className={styles.previewLayer} src={item.url} alt="" draggable={false} loading="lazy" decoding="async" style={{ left: `${item.left}%`, top: `${item.top}%`, width: `${item.width}%`, height: `${item.height}%` }} onError={() => setFailedUrl(item.url)} />`. `transform` 없음 | R-68 |
| `onError` (img) | `() => void` | `setFailedUrl(item.url)` → 다음 렌더에서 박스 전체가 안내 문구로 바뀐다. **한 장이라도 실패하면 전체를 안내로 바꾼다** — 일부만 빠진 합성은 프리셋의 실제 모습과 달라 오해를 부른다 | R-68 |

`t`는 `useMessages()`(기존 `../i18n/MessagesContext`). 이 컴포넌트는 버튼·입력이 없어 포커스를 받지 않는다.

**`PresetCard` 개정분**

| function / 파생 | 시그니처 | 동작 | 요구ID |
|---|---|---|---|
| 파생 `metaDate` | `format(t.presetSavedAt, { date: formatSavedAt(preset.savedAt, language) })` | 요약 첫 줄(§5.3 `meta` 대체) | R-66 |
| 파생 `metaInfo` | `[format(t.presetImageCount, { count: preset.imageCount }), preset.hasAlarm ? t.presetHasAlarm : t.presetNoAlarm].join(' · ')` | 요약 둘째 줄 | R-59, R-66 |
| 렌더 순서 | — | `<li className=item aria-labelledby={nameId}>` → `<PresetPreviewBox preview={preset.preview} />` → `<h3 id={nameId} title={preset.name} className={renaming ? visuallyHidden : itemName}>` → (편집 중) `<div className={`${styles.nameRow} ${styles.cardNameRow}`}>` 입력·저장·취소(§5.3 그대로) → `<p className=itemMeta>{metaDate}</p>` → `<p className=itemMeta>{metaInfo}</p>` → `<div className=actionGrid>` 적용·내보내기·이름 바꾸기·삭제 | R-66 |
| 버튼 4 | — | 클래스(`gen.outlineButton` ×3·`gen.dangerButton`)·`aria-label`·`disabled`·ref·핸들러는 §5.3·§7.1 그대로. **추가**: `title` = 보이는 글자(`t.presetApply`·`t.presetExport`·`t.presetRename`·`t.presetDelete`) — 말줄임 대비 | R-66 |

### 11.6 스타일 (`PresetsTab.module.css` 개정 — 새 CSS 모듈 없음, 새 색 없음)

| 클래스 | 값 | 비고 |
|---|---|---|
| `.list` (대체) | `list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--st-gap-md)` | §11.1 |
| `.item` (대체) | `box-sizing: border-box; min-width: 0; display: flex; flex-direction: column; gap: var(--st-gap-sm); padding: var(--st-gap-md); border: 1px solid var(--st-border); border-radius: 8px; background: var(--st-card)` | 카드 안쪽 = 폭 − 2 − 24 |
| `.preview` (신규) | `position: relative; width: 100%; overflow: hidden; border-radius: 8px; background: repeating-conic-gradient(#e5e7eb 0 25%, #ffffff 0 50%) 0 0 / 16px 16px` | 체크무늬 = 이미지 카드 `.preview`와 같은 값(`design/images-tab.md` §6). 높이는 인라인 `aspect-ratio` |
| `.previewLayer` (신규) | `position: absolute; display: block; max-width: none; pointer-events: none; user-select: none` | 위치·크기는 인라인 % |
| `.previewNote` (신규) | `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; margin: 0; padding: var(--st-gap-sm); background: var(--st-card); color: var(--st-muted); font-size: 12px; text-align: center` | 체크무늬를 덮어 글자 대비 확보 |
| `.itemName` (대체) | `margin: 0; font-size: 14px; font-weight: 700; line-height: 20px; color: var(--st-ink); overflow-wrap: anywhere; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden` | 최대 2줄 |
| `.itemMeta` (대체) | `margin: 0; color: var(--st-muted); font-size: 12px; line-height: 16px` | 두 줄 각각 |
| `.cardNameRow` (신규) | `padding: 0` / `.cardNameRow .nameInput { flex-basis: 100% }` | 편집 입력은 한 줄 전체, 저장·취소는 다음 줄 |
| `.actionGrid` (신규, `.itemActions` 대체) | `display: grid; grid-template-columns: 1fr 1fr; gap: var(--st-gap-sm); margin-top: auto` / `.actionGrid > button { min-width: 0; padding: 6px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }` | `margin-top: auto` = 같은 줄 카드끼리 버튼 줄 바닥 정렬. `.actionGrid > button`(명시도 0,1,1)이 `.outlineButton`·`.dangerButton`(0,1,0)의 좌우 여백 14px를 8px로 덮는다 |

- `.itemActions` 클래스는 쓰지 않게 되므로 CSS에서 지운다(사용처 = `PresetCard`뿐).

### 11.7 접근성 (CR-065)

- 미리보기 그림은 장식이다: 모든 `<img alt="">`(보조기술이 건너뜀), 박스는 role·이름 없음. 프리셋의 접근 이름은 지금처럼 `li aria-labelledby` → `h3`. 미리보기를 설명하는 대체 문구를 따로 두지 않는다 — 그림 내용은 사용자가 그린 캐릭터라 자동으로 서술할 수 없고, 카드 요약(`imageCount`·알림음)이 이미 읽힌다.
- 안내 문구 `presetPreviewUnavailable`는 일반 `p` — 카드를 훑을 때 읽힌다. 라이브 영역이 아니다(불러오기 실패는 사용자 조작의 결과가 아니어서 알리지 않는다).
- 포커스: 미리보기에 포커스 가능한 요소 없음. 탭 순서·포커스 요청 규칙(§8.2) 불변. 2×2 배치의 읽기 순서(행 우선)가 DOM 순서와 같다.
- 버튼 `title`은 보이는 글자와 같다(접근 이름은 `aria-label`이 우선 — 중복 낭독 없음).

### 11.8 파이프라인·성능·파일 크기 (CR-065)

| # | 흐름 | 정상 | 오류 |
|---|---|---|---|
| PR-1 (보강) | 탭 진입 | `listPresets()` → 카드마다 `preset.preview` → `previewLayout` → 그림 ≤ 7장을 `url`로 표시(`loading="lazy"` — 스크롤해 보일 때 읽음) | 그림 한 장이라도 로드 실패 → 그 카드 미리보기 = `presetPreviewUnavailable`. 창 오류 줄·상태 줄 불변, 버튼 동작 불변 |
| PR-6 (보강) | 이름 바꾸기 성공 뒤 재조회 | 같은 폴더라 `url`이 같으면 미리보기 그대로 | — |

- 새 command·event·재조회 없음. 미리보기 데이터는 `list_presets` 반환에 실려 온다(§11.9).
- `url`은 core가 준 값을 그대로 `src`에 넣는다(ui가 경로를 조립하지 않음 — 화면 코드에 `convertFileSrc` 호출 없음). 표시 가능 조건 = Tauri asset protocol scope `$APPDATA/presets/*/*.png` 읽기(PNG만) — **반영됨**(사용자 승인 2026-09-30, 확정사항 §6 PS-09 개정). scope가 빠지면 모든 미리보기가 안내 문구로 보인다(§11.9 결정 4).
- 성능: 카드 N장 × ≤ 7장 `<img>`. 브라우저 이미지 디코딩만 쓰고 캔버스 합성·JS 픽셀 처리는 하지 않는다. `previewLayout`은 카드당 `useMemo` 1회.
- 파일 크기(400줄·함수 50줄): `PresetCard.tsx` ~195 · `PresetPreviewBox.tsx` ~60 · `presetValues.ts` ~95 · `PresetsTab.module.css` ~150. 넘는 것 없음.
- 예정 TC(번호는 ui-test-designer 부여) 수용 기준: ① `previewLayout` — 순서 = `PREVIEW_ORDER`, 캔버스 레이어 (0,0,100,100), `partPos`·`penPos` % 계산(§11.3 예), `penPos: null` → `pen_up` 없음, 목록 밖 슬롯 무시, 같은 키 여럿 → 첫째, `canvas: null`·0 크기 → `null`, `layers: []` → items 빈 배열 ② 박스 `aspect-ratio` 인라인 값(`"900 / 700"`, 캔버스 없음 → `"450 / 350"`) ③ 모든 미리보기 `img`의 `alt === ""`, `h3` `title` = 이름 ④ `img` `error` 이벤트 → 안내 문구만 보이고 `img` 0개, 다른 `url` 목록으로 다시 렌더 → 안내 해제 ⑤ 버튼 4개 DOM 순서(적용·내보내기·이름 바꾸기·삭제)·`title`, §8.2 포커스 표 회귀 ⑥ 요약 두 줄(`metaDate`·`metaInfo`) ⑦ 시간 글자 요소 없음 ⑧ 열 수·버튼 줄바꿈 없음은 jsdom이 레이아웃을 하지 않으므로 **`/run-app` 스크린샷**(창 900·720, ko·ja·en)으로 확인.

### 11.9 계약 사용 · 확인 필요 (CR-065)

**계약(contract v0.31 확정 — `src/bridge/types.ts` 반영, 2026-09-30 이름 대조 완료: 설계와 같음):**

| 종류 | 이름 | 페이로드 타입 | 사용 위치 | 실패 시 |
|---|---|---|---|---|
| 타입 (v0.31) | `PresetSummary.preview`(필수) | `PresetPreview` | `PresetCard` → `PresetPreviewBox` → `previewLayout` | 필드는 `list_presets` 반환에 포함 — 별도 실패 없음 |
| 타입 (v0.31) | `PresetPreview` | `{ canvas: CanvasSize \| null; layers: PresetPreviewLayer[]; partPos: Point; penPos: Point \| null }` | `previewLayout` | `canvas: null` → 안내 문구 |
| 타입 (v0.31) | `PresetPreviewLayer` | `{ slot: AssetSlot; url: string; width: number; height: number }` | `previewLayout`(`slotKey(slot)`로 찾음) | `url` 로드 실패 → 안내 문구 |

- `layers`는 프리셋의 모든 그림(헤더를 읽지 못한 그림은 빠짐, 순서 무의미)이다. 슬롯 선택은 ui(`PREVIEW_ORDER`)가 `slot`으로 한다. `canvas`는 첫 캔버스 레이어 크기(없으면 `null`), `partPos`는 mouse가 없으면 core 기본값.
- 구현 선행 조건(v0.31 `src/bridge` 반영) 충족.

**결정 (관리자 2026-09-30 — 이전 「확인 필요」 1~5 해소):**

1. **펜 손 맨 위** — 오버레이 소스 순서(`MouseArm` → `LayerStack` → `PenHand`) 그대로.
2. **`body`·`idle` 포함** — 「오버레이 전체 그대로」를 글자 그대로 적용. `LayerStack` 순서(몸통 → 상태 → 키보드)대로 `mouse_base` 다음·`kb_up` 앞(§11.3). `rest`·`key_*`·`kb_down`·`mouse_left`/`mouse_right`·`pen_down`·`pen_key_*`는 쉬는 자세에 보이지 않으므로 제외.
3. **`penPos: null`이면 펜 손 생략 유지** — 실제로 저장된 프리셋은 `penPos` 값이 거의 항상 있어(`pen_up` 첫 등록 때 `resolvePenPos`로 채워 저장 — `ImagesTab.ensurePenPos`) 오버레이의 기본 위치 계산을 옮겨 올 이득이 작다.
4. **asset protocol scope** — `$APPDATA/presets/*/*.png` 읽기로 **이미 반영됨(PNG만)**. 미리보기에 쓰는 것은 PNG뿐이라 충분하다. 반영이 빠진 환경에서는 모든 카드가 안내 문구를 보인다.
5. **기본 창 2열** 확정(§11.1).

**남은 확인:** 새 문구 `presetPreviewUnavailable` ja·en 검수(사용자).
