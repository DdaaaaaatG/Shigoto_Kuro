# settings 상세 설계 — 「이미지 설정」 탭 (CR-028)

- 상위 문서: `src/settings/design.md`(RTM·전체 구조·공통 상태). 문구는 `design/i18n.md` §4.3·§4.4·§4.6(키 이름으로만 인용).
- 요구: R-25(이미지 설정 — 그룹 4개, 필수 배지, 이미지 변경, 몸통 카드 없음. ~~「기본값」 = 슬롯 비우기~~ 문장은 CR-035로 R-32가 대체), R-19(카드 양식), R-20(문구·파일 대화상자 제목·에러 code 문구), **R-31**(첫 실행 기본 15장 — 화면 변경 없음, §10.1), **R-32**(「기본값」 = 기본 그림 있는 칸은 복원·없는 칸은 비우기 — §3·§4·§5·§6·§7 I-3·I-3R, §10), **R-33**(기본 이미지 다운로드 — §10.3~§10.8).
- 계약(CR-035): contract **v0.16** — `restore_default_asset`(`restoreDefaultAsset`)·`export_default_assets`(`exportDefaultAssets`)·`pickFolder(title?)`·`ExportReport`·`ExportFailure`·`hasBuiltinDefault`·`DEFAULT_ASSET_SLOTS`·에러 `asset.no_default`·`asset.export_dir`. 이름은 `doc/200_설계/architecture/default-assets-03-packet-ui.md` 선행 조건 그대로(bridge-designer 작성 중 — 화면 구현은 bridge 완료 마커 뒤).
- 계약: `doc/200_설계/bridge/contract.md` v0.14 — §3.1 `AssetSlot`·`REQUIRED_SLOTS`·`isRequiredSlot`, §3.2 `AssetEntry.url` 버전 규칙, §5 `import_asset`·`remove_asset`, §5.4 `pickPngFile(title?)`, §4 `assets://changed`, §3.3 `MouseSettings.penPos`(`null` = 아직 놓지 않음, `pen_up` 첫 등록 때 ui가 기본 위치를 정해 `set_settings`로 저장), §6 에러 코드.
- 검증은 core가 한다(PNG·크기·용량·캔버스 일치). 이 탭은 결과 메시지만 보인다(ui 재검증 금지 — ui-design-strategy §7).

## 1. 레이아웃 (확정)

(CR-031, R-28) **모든 카드의 칸·높이·여백이 같다.** 그룹 제목 아래 카드 격자 = `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))` · `grid-auto-rows: var(--st-slot-card-h)`(280px) · `gap: var(--st-gap-md)`(12px). 칸 수는 내용 영역 폭이 정한다 — 기본 창 900px에서 3칸, 최소 창 720px에서 2칸(검산 `design.md` §2.1). 모든 칸의 폭은 같고(`1fr`), 모든 줄의 높이는 280px로 고정이다. 카드 안 치수는 §6.1. 오류가 나도 카드 높이는 바뀌지 않는다(오류는 미리보기 안 아래 띠). 아래 옛 문장 「3열(`repeat(3, 1fr)`)」은 이것으로 대체.

(이전 기록 CR-028) 사용자 참고 스크린샷(이미지 설정)과 패킷 §3을 수용해 확정한다. 그룹 제목 아래 카드 격자 3열(`grid-template-columns: repeat(3, 1fr)`, 간격 12px).

```
+-- section[aria-label=tabImages] --------------------------------+
| p.note imagesNote                                               |
| DefaultsDownloadPanel: downloadDefaultsDesc [downloadDefaults]  |
| p.downloadResult (only after a download)                        |
| h2 groupBackground                                              |
| [card background] [card hair]                                   |
| h2 groupKeyboard                                                |
| [card kb_up] [card kb_down_0] [card kb_down_1..] [add kb_down]  |
| [card idle] [card rest] [card key_space] ... [card key_undo]    |
| h2 groupArm                                                     |
| [card mouse_base] [card mouse_left] [card mouse_right]          |
| h2 groupHand                                                    |
| ToggleSwitch penModeLabel (disabled: no pen_up)                 |
| div.penNote: penModeNoteOn / penModeNoteOff (always)            |
| [card pen_up] [card pen_down_0..] [add pen_down]                |
| [card pen_key_space] ... [card pen_key_undo]                    |
+-----------------------------------------------------------------+

+-- ImageSlotCard (fixed 280px high) --------+
| h3 title (1 line, ...)          [badge]    |
| p desc (2 lines fixed, ..., title=full)    |
| +-- preview 140px (checkerboard) -------+  |
| |  img  or  emptyOptional/emptyRequired |  |
| |  [card error strip, only on error]   |  |
| +---------------------------------------+  |
| [changeImage (filled)] [clearImage (line)] |
+--------------------------------------------+

+-- AddSlotCard (dashed, same 280px cell) ---+
|            [ addKbDown / addPenDown ]      |
+--------------------------------------------+
```

- 확정 상태: **확정**. **몸통(`body`) 카드 없음**(🔒 D-8 A). 참고 화면의 「+ 패턴 추가」 카드·설명서·닫기·프리셋은 없다.
- 카드 순서는 §3 `buildSlotGroups`가 정한다(격자는 순서대로 흐른다).

## 2. 컴포넌트

| 컴포넌트/모듈 | 파일 | 분류 | props / export | 요구ID |
|---|---|---|---|---|
| `ImagesTab` (default) | `src/settings/components/ImagesTab.tsx` (+`ImagesTab.module.css`) | 화면 로컬 | `settings: Settings`, `manifest: AssetManifest`, `onError: (e: BridgeError \| null) => void` | R-25, R-19 |
| `ImageSlotCard` (default) | `src/settings/components/ImageSlotCard.tsx` (+`ImageSlotCard.module.css`) | 화면 로컬 | `cardKey: string`(= `slotKey`, `data-testid={`slot-card-${cardKey}`}`), `title: string`, `description: string`, `required: boolean`, `url: string \| undefined`, `disabled: boolean`, ~~`canClear: boolean`~~ → (CR-035) **`canReset: boolean`**, (CR-035 신규) **`resetKind: ResetKind`**(aria-label 선택용), `clearBlockedHint: string \| undefined`, `error: string \| undefined`, `onChange: () => void`, ~~`onClear`~~ → (CR-035) **`onReset: (trigger: HTMLButtonElement) => void`** | R-25, R-32 |
| `DefaultsDownloadPanel` (default, **신규 CR-035**) | `src/settings/components/DefaultsDownloadPanel.tsx`(목표 ≤130줄) — CSS는 `ImagesTab.module.css`(`.download`·`.downloadDesc`·`.downloadResult`) + 버튼 모양은 `ImageSlotCard.module.css` `.outline` 재사용(`AddSlotCard`와 같은 방식) | 화면 로컬(ImagesTab 400줄 분리) | props 없음(`{}`) — 자기 상태만. `useMessages()`·`useLanguage()`로 문구 | R-33 |
| `AddSlotCard` (default) | `src/settings/components/AddSlotCard.tsx` (+`ImageSlotCard.module.css` 공유) | 화면 로컬 | `cardKey: string`(추가될 슬롯 키, `data-testid={`add-card-${cardKey}`}`), `label: string`, `disabled: boolean`, `error: string \| undefined`, `onAdd: () => void` | R-25 |
| `ConfirmDialog` (default) | `src/settings/components/ConfirmDialog.tsx` (+`ConfirmDialog.module.css`) | 화면 로컬 · **공용 승격 후보**(ui-design-strategy §11이 공용 `ConfirmDialog`를 지정 — 공용이 비어 있어 로컬로 만들고 승격은 후작업) | `open: boolean`, `title: string`, `message: string`, `confirmLabel: string`, `cancelLabel: string`, `onConfirm: () => void`, `onCancel: () => void` | R-25 |
| `imageSlots` | `src/settings/imageSlots.ts` | 화면 로컬 순수 모듈 | §3 | R-25 |

## 3. 슬롯 카탈로그 순수 모듈 (`src/settings/imageSlots.ts`)

```ts
export type SlotGroupId = 'background' | 'keyboard' | 'arm' | 'hand'
export type SlotCardSpec = {
  type: 'slot'; slot: AssetSlot; key: string            // key = slotKey(slot)
  msg: SlotMessageKey; n: number | null                 // n = index + 1 (여러 장 슬롯만), 그 외 null
  entry: AssetEntry | undefined; required: boolean
  resetKind: ResetKind                                  // (CR-035) hasBuiltinDefault(slot) ? 'restore' : 'clear'
  canReset: boolean                                     // (CR-035, 옛 canClear) 「기본값」 단추 활성
  lastOnlyBlocked: boolean
}
export type ResetKind = 'restore' | 'clear'             // (CR-035)
export type DownloadResult =                            // (CR-035) DefaultsDownloadPanel 결과 줄
  | { kind: 'done'; count: number }
  | { kind: 'partial'; ok: number; failed: string[] }   // failed = 실패 파일명
  | { kind: 'error'; error: BridgeError }
export type AddCardSpec = { type: 'add'; slot: KbDownSlot | PenDownSlot; key: string; msg: 'addKbDown' | 'addPenDown' }
export type CardSpec = SlotCardSpec | AddCardSpec
export interface SlotGroup { id: SlotGroupId; cards: CardSpec[] }
```

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `SPECIAL_KEY_ORDER` | `readonly SpecialKey[]` = `['space', 'z', 'question', 'exclamation', 'enter', 'backspace', 'undo']` | 특수 키 카드 순서 | — | R-25 |
| `findEntry` | `(manifest: AssetManifest, slot: AssetSlot) => AssetEntry \| undefined` | `slotKey(e.slot) === slotKey(slot)`인 항목 | 없음 | R-25 |
| `frameCount` | `(manifest: AssetManifest, kind: 'kb_down' \| 'pen_down') => number` | 그 `kind` 항목들의 `index` 최댓값 + 1. 없으면 0 | 없음 | R-25 |
| `slotCard` | `(manifest: AssetManifest, slot: AssetSlot, msg: SlotMessageKey, frames: number \| null) => SlotCardSpec` | `entry = findEntry(...)`, `required = isRequiredSlot(slot)`(bridge — 필수 목록을 화면에 다시 적지 않는다), `n = 여러 장 슬롯이면 index + 1 아니면 null`. **(CR-035 개정)** `resetKind = hasBuiltinDefault(slot) ? 'restore' : 'clear'`(bridge 상수 — 기본 목록을 화면에 다시 적지 않는다). `resetKind === 'restore'`: `canReset = true`(**항상** — 그림이 없어도, 이미 기본 그림이어도, 여러 장 슬롯 index 0 뒤에 장이 있어도), `lastOnlyBlocked = false`. `resetKind === 'clear'`: 옛 규칙 그대로 — `frames === null`(단일 슬롯)이면 `canReset = entry !== undefined`, `lastOnlyBlocked = false` / 여러 장 슬롯이면 `isLast = index === frames − 1` → `canReset = entry !== undefined && isLast`, `lastOnlyBlocked = entry !== undefined && !isLast` | 없음 | R-25, R-32 |
| `exportResult` (신규 CR-035) | `(r: ExportReport) => DownloadResult` | `r.failed.length > 0` → `{ kind: 'partial', ok: r.written.length, failed: r.failed.map(f => f.fileName) }`, 아니면 `{ kind: 'done', count: r.written.length }`. 충돌 판정은 하지 않는다(호출자 몫 — §10.5) | 없음 | R-33 |
| `buildSlotGroups` | `(manifest: AssetManifest) => SlotGroup[]` | 아래 순서로 만든다. ① `background`: `background` → (CR-037) `hair`(msg `hair`, `frames` = `null` — 단일 슬롯) ② `keyboard`: `kb_up` → `kb_down` index 0 … `max(1, K) − 1`(K = `frameCount(…, 'kb_down')`, 0장이어도 index 0 카드는 늘 있음) → `kb_down` index 0 항목이 있으면 추가 카드 `{ kind: 'kb_down', index: K }`(`addKbDown`) → `idle` → `rest` → `key_{SPECIAL_KEY_ORDER}` 7장 ③ `arm`: `mouse_base` → `mouse_left` → `mouse_right` ④ `hand`: `pen_up` → `pen_down` index 0 … `max(1, P) − 1` → `pen_down` index 0이 있으면 추가 카드 `{ kind: 'pen_down', index: P }`(`addPenDown`) → `pen_key_{SPECIAL_KEY_ORDER}` 7장. `body` 카드는 만들지 않는다 | 없음 | R-25 |

예(검증용): 매니페스트에 `kb_up`, `kb_down_0`, `kb_down_1`만 있으면 키보드 그룹 = `kb_up`(필수, `canClear` true) · `kb_down_0`(필수, `canClear` false, `lastOnlyBlocked` true) · `kb_down_1`(선택, `canClear` true) · 추가 카드 `kb_down_2` · `idle` · `rest` · 특수 키 7장 = 13장. 빈 매니페스트면 키보드 그룹 = `kb_up` · `kb_down_0` · `idle` · `rest` · 특수 키 7 = 11장(추가 카드 없음), 필수 배지 3장(`kb_up`·`kb_down_0`·`mouse_base`).

(CR-035 — 위 예의 `canClear`는 `canReset`으로 읽고 아래가 대체한다. 카드 수·순서는 그대로.) 검증 예(단위 테스트로 고정):
- 빈 매니페스트: `background` = `restore`·`canReset` true·`lastOnlyBlocked` false. `mouse_left` = `clear`·`canReset` false.
- `kb_down_0`, `kb_down_1`만 있음: `kb_down_0` = `restore`·`canReset` true·`lastOnlyBlocked` false(옛 기대 false/true를 대체). `kb_down_1` = `clear`·`canReset` true.
- `kb_down_0`, `kb_down_1`, `kb_down_2`: `kb_down_1` = `clear`·`canReset` false·`lastOnlyBlocked` true. `kb_down_2` = `clear`·`canReset` true.
- 빈 매니페스트의 `pen_up`·`pen_down_0`·`mouse_base`·`kb_up`·`hair` = `restore`·`canReset` true. `pen_key_space`·`mouse_right`·`key_space`·`idle`·`rest` = `clear`·`canReset` false. (CR-038, contract v0.18 — 옛 기대 「`key_space` = restore」는 폐기. 내장 기본 칸 = `DEFAULT_ASSET_SLOTS` 7개) **(CR-044, contract v0.20 — 이 줄의 `hair`를 뺀다: 내장 기본 칸 = 6개, 빈 매니페스트 `hair` = `clear`·`canReset` false. §13)**
- (CR-037, R-34) 배경 그룹 = `background` · `hair` **2장**(옛 1장). 키보드·팔·손 그룹의 카드 수·순서는 그대로다. 필수 배지 수 3장 그대로. ~~빈 매니페스트의 `hair` = `resetKind` `clear`·`canReset` false~~ **(CR-038로 대체)**: `hair` = `required` false·`resetKind` `restore`(`hasBuiltinDefault('hair') === true`, v0.18)·`canReset` true(빈 칸이어도)·`lastOnlyBlocked` false. **(CR-044로 다시 대체 — §13)**: `hair` = `required` false·`resetKind` **`clear`**(`hasBuiltinDefault('hair') === false`, v0.20)·`canReset` = `entry !== undefined`(빈 매니페스트 false, 등록됨 true)·`lastOnlyBlocked` false. 필수 배지 수는 §3.3에 따라 2장.
- (CR-038, R-35) 새 필드: `emptyable` = `slotKey(slot) === 'hair'`인 카드만 true(§11.2). `canEmpty` = `emptyable && entry !== undefined`. 빈 매니페스트: `hair` = `emptyable` true·`canEmpty` false. `hair` 등록됨: `canEmpty` true. `background`·`kb_up` 등 다른 모든 카드 = `emptyable` false·`canEmpty` false. **(CR-044로 대체 — §13)**: `EMPTYABLE_SLOT_KEYS = ['kb_down_0']` — `hair` = `emptyable` false·`canEmpty` false(빈 칸·등록됨 모두). `emptyable` true는 `kb_down_0` 카드뿐(§12.2 검증 예).

### 3.1 헤어(뒷머리) 카드 (CR-037, R-34)

비유: 종이 인형의 뒷머리는 몸 뒤에 따로 오려 붙이는 한 장이다. 그래서 배경과 같은 「판 크기」 그림 묶음에 넣는다.

- **위치**: 배경 그룹(`groupBackground`)의 둘째 카드(배경 카드 바로 뒤). 캔버스 레이어(배경·키보드와 같은 크기)라 배경 그룹이 가장 가깝고, 새 그룹 제목을 만들지 않는다(새 문구 최소화).
- **카드 양식**: 기존 `ImageSlotCard` 그대로 — 제목 `slots.hair.title`, 설명 `slots.hair.desc`(`design/i18n.md` §4.4), 필수 배지 없음, 미리보기, 「이미지 변경」·「기본값」.
- **이미지 변경**: 기존 I-2 흐름 그대로(`pickPngFile(t.dialogPickImage)` → `importAsset({ slot: 'hair' }… )` — 슬롯 값은 문자열 `'hair'`). 크기가 캔버스와 다르면 core가 `asset.canvas_mismatch`를 돌려주고 카드 오류 띠에 보인다(CR-036 문구, 새 코드 없음). 캔버스가 아직 없으면(첫 캔버스 레이어) core 규칙대로 이 그림이 캔버스 기준이 될 수 있다 — ui 판정 없음.
- ~~**「기본값」**: `resetKind = 'clear'` → 기존 비우기 확인창(`confirmClearTitle`·`confirmClearMessage`(`{name}` = `뒷머리`)) → `removeAsset('hair')`(I-3). 등록 안 됐으면 비활성. 새 function·새 분기 없음.~~ **(CR-038로 대체 — §11)** 「기본값」 = `resetKind` `'restore'`(기본 뒷머리로 복원, I-3R, 항상 활성). 비우기는 이 카드에만 있는 셋째 버튼 「비우기」(R-35, §11.2 — 기존 비우기 확인창 → `removeAsset('hair')`, 등록돼 있을 때만 활성). 아래 「새 컴포넌트·상태·function 없음」도 §11.2가 대체한다. **(CR-044로 원래대로 — §13)** 「기본값」 = 다시 `resetKind` `'clear'` → 기존 비우기 확인창(`{name}` = 뒷머리) → `removeAsset('hair')`(I-3), 등록 안 됐으면 비활성. 셋째 버튼 「비우기」 없음(R-35 폐기) — 한 줄 버튼·미리보기 140px, 다른 기본 없는 카드와 같다.
- **펜·첫 등록 규칙과 무관**: `isFirstPenUp` 등 R-30 분기에 걸리지 않는다.
- **새 컴포넌트·상태·function 없음** — `buildSlotGroups` 목록과 문구 2개(제목·설명, 3개 국어)만 늘어난다.
- `exportResult`: `{written: 15개, conflicts: [], failed: []}` → `{kind:'done', count: 15}` / `{written: ['a.png'], conflicts: [], failed: [{fileName:'kb_up.png', code:'asset.io'}]}` → `{kind:'partial', ok: 1, failed: ['kb_up.png']}`.

### 3.2 손(펜) 그룹 단순화 (CR-042, R-39)

비유: 손 그룹 서랍에 칸이 아홉 개(기본·펜 입력 n장·손 특수 키 7장) 있던 것을 두 칸(「손 기본」·「펜 입력 1」)만 남기고 막는다. 특수 키 표정은 이제 키보드 서랍(본체의 `key_*`)이 맡는다.

**대체 범위**: §1 ASCII의 손 그룹 두 줄 `[card pen_up] [card pen_down_0..] [add pen_down]`·`[card pen_key_space] ... [card pen_key_undo]`는 **`[card pen_up] [card pen_down_0]` 한 줄**로 읽는다(토글·안내 상자 두 줄은 그대로). `AddSlotCard` 상자의 `addPenDown`은 없어지고 `addKbDown`만 남는다. §3 코드 블록·표·검증 예의 아래 항목을 대체한다.

| 대상 | 옛 | 새(CR-042) |
|---|---|---|
| `AddCardSpec` 타입 | `slot: KbDownSlot \| PenDownSlot`, `msg: 'addKbDown' \| 'addPenDown'` | `slot: KbDownSlot`, `msg: 'addKbDown'`(`PenDownSlot` import 제거) |
| `frameCount` | `kind: 'kb_down' \| 'pen_down'` | `kind: 'kb_down'`(호출처가 키보드뿐 — 동작 불변) |
| `buildSlotGroups` ④ `hand` | `pen_up` → `pen_down` index 0…`max(1,P)−1` → 추가 카드 → `pen_key_{SPECIAL_KEY_ORDER}` 7장 | **`pen_up` → `pen_down` index 0 한 장**: `slotCard(manifest, 'pen_up', 'pen_up', null)`, `slotCard(manifest, { kind: 'pen_down', index: 0 }, 'pen_down', 1)`(`frames` = 1 → `n` = 1, 제목 「펜 입력 1」). 추가 카드·`pen_key_*` 카드 없음. ①~③ 불변 |
| 검증 예 | 손 그룹 `['pen_up', 'pen_down_0', ...PEN_KEYS]`(9장), `pen_down_0`·`pen_down_1` 있으면 `[..., 'pen_down_1'(추가), ...PEN_KEYS]` | 손 그룹 = **`['pen_up', 'pen_down_0']` 2장**(빈 매니페스트·전체 등록·`pen_down_1`·`pen_down_2`·`pen_key_space` 파일이 남은 매니페스트 모두 같음). `pen_down_0` = `msg 'pen_down'`·`n 1`·`resetKind 'restore'`·`canReset` true·`lastOnlyBlocked` false(뒤에 `pen_down_1` 파일이 있어도 — `frames` = 1이라 `isLast` 판정 대상 아님, `restore` 칸은 늘 활성). `pen_up` = `restore`·`canReset` true. 카드 수 총합(빈 매니페스트) = 배경 2 + 키보드 11 + 팔 3 + 손 2 = **18장**(옛 25장) |

- **남은 옛 파일**: 매니페스트의 `pen_down_1+`·`pen_key_*` 항목은 어떤 카드로도 만들지 않는다(무시). 이 화면에서 지울 수 없고 오버레이도 쓰지 않는다(requirements R-39 용어 주 — 수용). `isFirstPenUp`(§9.4)·`PenModePanel`·`hasPenUp`은 `pen_up`만 보므로 불변. 「어깨축·손 위치」 탭 미리보기는 `pen_up`만 그리므로 불변.
- **`ImagesTab`·`ImageSlotCard`·`AddSlotCard` 컴포넌트 코드 변경 없음** — 카드 목록(`groups`)만 짧아진다. 포커스 규칙(`pendingFocusRef` — 추가 카드로 `pen_down_{n}`을 등록한 뒤 포커스 이동)은 손 그룹에 추가 카드가 없어 그 경로만 사라진다.
- **문구**: `design/i18n.md` §4.4 CR-042 블록(`SlotMessageKey` 25 → 18, 단순 키 `addPenDown` 삭제, `pen_up`·`pen_down` 설명 개정).
- **계약**: 변경 없음(`AssetSlot` 펜 슬롯은 contract에 그대로 — 화면이 쓰지 않을 뿐).

### 3.3 타자 입력 1 선택 강등 (CR-043, R-40)

비유: 「꼭 채워야 하는 칸」 스티커를 키보드 서랍의 「타자 입력 1」 칸에서 떼어 낸다. 칸과 그 안의 기본 그림, 「기본값」 단추는 그대로 있다.

- **필수 판정 출처 불변**: `slotCard`의 `required = isRequiredSlot(slot)`(bridge 상수). contract **v0.19** `REQUIRED_SLOTS` = `['kb_up', 'mouse_base']` 2개(옛 v0.14 3개에서 `{ kind: 'kb_down', index: 0 }` 삭제). **`imageSlots.ts`·`ImageSlotCard`·`ImagesTab` 코드 변경 없음** — 필수 목록을 화면에서 다시 적지 않는다. 구현 선행 조건 = `src/bridge/types.ts`에 v0.19가 반영되고 `yarn tsc --noEmit` 0(bridge 동시 진행). 반영 전에는 화면 쪽 조치가 없다.
- **렌더 결과**: `kb_down_0` 카드 = 필수 배지 없음. 비어 있어도 `emptyRequired`(경고색) 대신 선택 칸과 같은 빈 미리보기(§6). `resetKind` = `restore`(`hasBuiltinDefault` 7칸에 `kb_down_0` 포함 — 불변), `canReset` true, 「기본값」 = 복원(R-32). 비우기 버튼 없음(R-35는 `hair`만) — 이 화면에서 `kb_down_0`을 비우는 길은 여전히 없다.
- **대체 서술**(이 절이 우선):

| 위치 | 옛 | 새(CR-043) |
|---|---|---|
| §3 검증 예(키보드 그룹 문장) | `kb_down_0`(필수, …) · 빈 매니페스트 「필수 배지 3장(`kb_up`·`kb_down_0`·`mouse_base`)」 | `kb_down_0` = `required` **false** · 빈 매니페스트 필수 배지 **2장(`kb_up`·`mouse_base`)**. 카드 수·순서(키보드 11장, 총 18장)는 불변 |
| §5 D-1 폐기 문단 | 「필수 3칸(`kb_up`·`kb_down_0`·`mouse_base`)」 | 「필수 2칸(`kb_up`·`mouse_base`)」 — 둘 다 내장 기본이 있어 「기본값」은 복원만 한다는 결론 불변 |
| §3.1 CR-037 문단 「필수 배지 수 3장 그대로」 · §11.1 표 「필수 배지 3칸은 모두 채워짐」 | 3 | **2** |

- **문구**: `design/i18n.md` §4.4 CR-043 블록(`kb_down` 설명만 개정, 제목 불변).
- **파일 크기**: 변경 없음(코드 변경 없음, 사전 `ko`·`ja`·`en` 각 1줄 값 교체).
- **예정 TC(ui-test-designer)**: ① `slotCard(…, { kind: 'kb_down', index: 0 }, …)` → `required` false ② 빈 매니페스트 `buildSlotGroups` 필수 카드 2장(`kb_up`·`mouse_base`) ③ `ImagesTab` 빈 매니페스트 렌더 — 배지 「필수」 2개, `kb_down_0` 빈 미리보기에 `emptyRequired` 없음 ④ i18n `ko.slots.kb_down.desc` 새 값.

## 4. `ImagesTab` 상태

| 상태 | 용도 | 타입 | 초기값 | 소유 |
|---|---|---|---|---|
| `slotBusy` | 등록·비우기 진행 중 슬롯 키. `null`이 아니면 **모든 카드 버튼 비활성**(한 번에 하나 — 캔버스 크기 결정 순서 보호) | `string \| null` | `null` | `useState` |
| `cardError` | 카드 오류 한 줄(마지막 실패 1건) | `{ key: string; error: BridgeError } \| null` | `null` | `useState` |
| `confirm` | 「기본값」 확인 대화상자 대상(CR-035: 복원·비우기 공용) | (CR-035) `ConfirmTarget \| null`, `ConfirmTarget = { slot: AssetSlot; key: string; name: string; trigger: HTMLButtonElement; resetKind: ResetKind }` | `null` | `useState` |
| `pendingFocusRef` (현행 소스 기록) | 비우기·복원 완료 뒤 포커스를 돌려줄 버튼. `slotBusy`가 `null`로 바뀐 뒤 효과에서 `trigger.isConnected ? trigger.focus() : sectionRef.current?.focus()`(비활성 버튼은 포커스를 받지 못하므로 지연) | `useRef<HTMLButtonElement \| null>` | `null` | `useRef` |
| (파생) `groups` | 카드 목록 | `SlotGroup[]` | `useMemo(() => buildSlotGroups(manifest), [manifest])` | 파생 |

## 5. `ImagesTab` 기능

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `cardTitle` | `(spec: SlotCardSpec) => string` | `spec.n === null ? t.slots[spec.msg].title : format(t.slots[spec.msg].title, { n: spec.n })` | 없음 | R-25, R-20 |
| `onChangeImage` | `(slot: AssetSlot, key: string) => Promise<void>` | `slotBusy`가 있으면 무시 → `path = await pickPngFile(t.pickTitle)` → `null`(취소)이면 끝(bridge 호출 없음) → `setSlotBusy(key)` → `next = await importAsset(slot, path)` → `setCardError(null)` → `await ensurePenPos(slot, next)` → `finally` `setSlotBusy(null)`. 미리보기 교체는 `assets://changed`(url이 바뀜 — 계약 §3.2)로만 | `pickPngFile` reject·`importAsset` reject → `setCardError({ key, error: toBridgeError(e) })` | R-25 |
| `ensurePenPos` | `(slot: AssetSlot, next: AssetManifest) => Promise<void>` | `slotKey(slot) !== 'pen_up'`이면 끝. `mouse = settings.mouse ?? DEFAULT_MOUSE_SETTINGS` → `mouse.penPos !== null`이면 끝 → `entry = findEntry(next, 'pen_up')`가 없으면 끝 → `setSettings({ ...settings, mouse: { ...mouse, penPos: resolvePenPos(mouse, { width: entry.width, height: entry.height }) } })`(`src/state/mouseMapping.ts` 기존 함수 — 새 계산 금지. 계약 §3.3 「`pen_up` 첫 등록 때 ui가 기본 위치를 정해 저장」) | reject → `onError(toBridgeError(e))`(창 오류 줄). 그림 등록은 유지 | R-25 |
| `onRequestReset` (CR-035, 옛 `onRequestClear`) | `(spec: SlotCardSpec, trigger: HTMLButtonElement) => void` | `slotBusy`가 있거나 `!spec.canReset`면 무시 → `setConfirm({ slot: spec.slot, key: spec.key, name: cardTitle(spec), trigger, resetKind: spec.resetKind })` | 없음 | R-25, R-32 |
| `onConfirmReset` (신규 CR-035) | `() => void` | `ConfirmDialog` `onConfirm`. `confirm?.resetKind === 'restore'`이면 `void onConfirmRestore()`, 아니면 `void onConfirmClear()` | 없음 | R-32 |
| `onConfirmClear` | `() => Promise<void>` | (CR-035: `resetKind === 'clear'`인 칸 — 내장 기본이 없는 칸 — 에서만 불린다) `c = confirm` → `setConfirm(null)` → `setSlotBusy(c.key)` → `pendingFocusRef.current = c.trigger` → `await removeAsset(c.slot)` → `setCardError(null)` → `finally` `setSlotBusy(null)`(포커스 복귀는 `pendingFocusRef` 효과) | reject → `setCardError({ key: c.key, error: toBridgeError(e) })` | R-25, R-32 |
| `onConfirmRestore` (신규 CR-035) | `() => Promise<void>` | `c = confirm`(없으면 끝) → `setConfirm(null)` → `before = manifest`(호출 시점 prop) → `setSlotBusy(c.key)` → `pendingFocusRef.current = c.trigger` → `try` `next = await restoreDefaultAsset(c.slot)` → `setCardError(null)` → `isFirstPenUp(c.slot, before, next)`이면 `pendingFocusRef.current = null`(포커스는 펜 확인창이 가져가고 닫힐 때 토글로 — §9.7) → `e = findEntry(next, 'pen_up')` → `e`가 있으면 `setPenDialog({ kind: 'first', size: { width: e.width, height: e.height } })`(R-30 재사용, U-7) / 아니면 `await ensurePenPos(c.slot, next)` → `finally` `setSlotBusy(null)`. 미리보기 교체는 `assets://changed`로만(로컬 선반영 없음). `removeAsset`은 **부르지 않는다**(U-1 = B) | `restoreDefaultAsset` reject(`asset.canvas_mismatch`·`asset.no_default`·`asset.io` 등) → `setCardError({ key: c.key, error: toBridgeError(e) })` — 사용자 그림은 그대로(core가 검증 먼저) | R-32, R-30 |
| `onCancelReset` (CR-035, 옛 `onCancelClear`) | `() => void` | `c = confirm` → `setConfirm(null)` → `c?.trigger.focus()`(복원·비우기 공용, 호출 없음) | 없음 | R-25, R-32 |

- ~~필수 슬롯도 비울 수 있다(🔒 D-1 — 캔버스 크기를 바꾸려면 캔버스 그림을 모두 비워야 한다).~~ **(CR-035로 폐기)** 필수 3칸(`kb_up`·`kb_down_0`·`mouse_base`)은 모두 내장 기본 그림이 있는 칸이라 「기본값」이 복원만 한다(U-1 = B). 캔버스 크기는 그림 교체로 바꾼다(core 검증 규칙 그대로 — 다른 크기로 옮기는 길은 이 버전에 없음, 사용자 수용). `emptyRequired`(경고색)는 기존 설치에서 비어 있던 필수 칸이나 복원 실패 뒤에만 보인다.
- 추가 카드는 `onChangeImage(spec.slot, spec.key)`를 그대로 쓴다(슬롯 = 다음 index).
- `pickPngFile`은 `slotBusy`를 걸기 전에 부른다(대화상자는 OS 모달). 대화상자가 떠 있는 동안 같은 카드를 다시 누를 수 없다(OS 모달).

## 6. 렌더

**`ImagesTab`** — 문구 `t = useMessages()`, 언어 `language = useLanguage()`(`design/i18n.md` §3). `ImageSlotCard`·`AddSlotCard`·`ConfirmDialog`도 배지·버튼 문구를 `useMessages()`로 읽는다.

1. `<section aria-label={t.tabImages} tabIndex={-1} ref={sectionRef}>` → `<p className=note>{format(t.imagesNote, { w: CANVAS_MAX_WIDTH, h: CANVAS_MAX_HEIGHT })}</p>`.
2. `groups.map(g => <div key={g.id}><h2>{t[GROUP_TITLE[g.id]]}</h2><div className=grid>{카드들}</div></div>)`. `GROUP_TITLE = { background: 'groupBackground', keyboard: 'groupKeyboard', arm: 'groupArm', hand: 'groupHand' }`.
3. 카드: `type === 'slot'` → `<ImageSlotCard key cardKey={spec.key} title={cardTitle(spec)} description={t.slots[spec.msg].desc} required={spec.required} url={spec.entry?.url} disabled={slotBusy !== null} canClear={spec.canClear} clearBlockedHint={spec.lastOnlyBlocked ? t.clearLastOnly : undefined} error={cardError?.key === spec.key ? errorText(t, language, cardError.error) : undefined} onChange={() => onChangeImage(spec.slot, spec.key)} onClear={tr => onRequestClear(spec, tr)}/>` / `type === 'add'` → `<AddSlotCard cardKey={spec.key} label={t[spec.msg]} disabled={slotBusy !== null} error={…같은 규칙} onAdd={() => onChangeImage(spec.slot, spec.key)}/>`.
4. `<ConfirmDialog open={confirm !== null} title={t.confirmClearTitle} message={format(t.confirmClearMessage, { name: confirm?.name ?? '' })} confirmLabel={t.confirmClearOk} cancelLabel={t.confirmCancel} onConfirm={onConfirmClear} onCancel={onCancelClear}/>`.

(CR-035 개정 — 위 1·3·4 대체·추가)
- 1′. `<p className=note>` 바로 뒤에 `<DefaultsDownloadPanel/>`(§10.3). 그 뒤 그룹들.
- 3′. `ImageSlotCard` props: `canClear={spec.canClear}` → `canReset={spec.canReset}`, 추가 `resetKind={spec.resetKind}`, `onClear={tr => onRequestClear(spec, tr)}` → `onReset={tr => onRequestReset(spec, tr)}`. 나머지 그대로.
- 4′. 확인창은 **한 개**(기존 `ConfirmDialog`, 2단추 — 3단추·「비우기」 선택지 없음). 문구는 `confirm?.resetKind`로 고른다(`confirm === null`이면 `'clear'` 문구 — 닫혀 있어 보이지 않음). `tone`은 넘기지 않는다(기본 `'danger'` — 복원도 사용자 그림을 지우는 파괴 조작). `onCancel={onCancelReset}`, `onConfirm={onConfirmReset}`.

| `resetKind` | `title` | `message` | `confirmLabel` | `cancelLabel` | 확정 시 |
|---|---|---|---|---|---|
| `'restore'` | `t.confirmRestoreTitle` | `format(t.confirmRestoreMessage, { name: confirm.name })` | `t.confirmRestoreOk` | `t.confirmCancel` | `onConfirmRestore` |
| `'clear'` | `t.confirmClearTitle` | `format(t.confirmClearMessage, { name })` | `t.confirmClearOk` | `t.confirmCancel` | `onConfirmClear` |

**`ImageSlotCard`** — `React.memo`.

1. `<article className=card aria-labelledby={titleId} data-testid={`slot-card-${cardKey}`}>`(`titleId = useId()`).
2. 머리 줄: `<h3 id={titleId}>{title}</h3>` + 배지 `<span className={required ? badgeRequired : badgeOptional}>{required ? t.badgeRequired : t.badgeOptional}</span>`.
3. `<p className=desc>{description}</p>`.
4. 미리보기 `<div className=preview>`(체크무늬 바탕 — `background: repeating-conic-gradient(#e5e7eb 0 25%, #ffffff 0 50%) 0 0 / 16px 16px`, 높이 140px, 둥근 10px): `url`이 있으면 `<img src={url} alt="" draggable={false} className=previewImg/>`(`object-fit: contain`, 100%×100%), 없으면 `<p className={required ? emptyRequired : empty}>{required ? t.emptyRequired : t.emptyOptional}</p>`.
5. 버튼 줄: `<button type="button" className=primary aria-label={format(t.changeImageAria, { name: title })} disabled={disabled} onClick={onChange}>{t.changeImage}</button>` + `<button type="button" className=outline aria-label={format(t.clearImageAria, { name: title })} disabled={disabled \|\| !canClear} title={clearBlockedHint} onClick={e => onClear(e.currentTarget)}>{t.clearImage}</button>`.
6. `error`가 있으면 `<p role="alert" className=cardError>{error}</p>`.

(CR-035 개정 — 위 5의 둘째 버튼 대체) `<button type="button" className=outline aria-label={format(resetKind === 'restore' ? t.restoreImageAria : t.clearImageAria, { name: title })} disabled={disabled \|\| !canReset} title={clearBlockedHint} onClick={e => onReset(e.currentTarget)}>{t.clearImage}</button>`. 보이는 글자는 두 경우 모두 `t.clearImage`(「기본값」). `resetKind === 'restore'`면 `clearBlockedHint`는 늘 `undefined`(§3 `lastOnlyBlocked` false).

(CR-031, R-28 개정 — 위 2·3·6 대체)
- 2′. 머리 줄 `<div className=head>`: `<h3 id={titleId} className=title title={title}>{title}</h3>`(한 줄, 넘치면 말줄임 — 전체 문구는 `title` 툴팁) + 배지(그대로).
- 3′. `<p className=desc title={description}>{description}</p>`(두 줄 고정, 넘치면 둘째 줄 끝 말줄임 — 전체 문구는 `title` 툴팁. 한 줄짜리 설명도 두 줄 높이를 차지한다).
- 6′. 카드 오류는 **미리보기 상자 안** 아래 띠로 그린다: 4의 `<div className=preview>` 안 마지막 자식으로 `error`가 있으면 `<p role="alert" className=cardError title={error}>{error}</p>`. 카드 높이는 바뀌지 않는다. 버튼 줄 아래 `p`는 없다.

**`AddSlotCard`**: `<div className={card + addCard} data-testid={`add-card-${cardKey}`}>`(점선 테두리) 가운데 `<button type="button" className=outline disabled={disabled} onClick={onAdd}>{label}</button>`, `error`가 있으면 `<p role="alert">`. (CR-031) 격자 칸을 그대로 채운다(`height: 100%` — 슬롯 카드와 같은 280px). 오류 `p`는 `className=addError title={error}` — 두 줄 말줄임.

### 6.1 카드 고정 치수 (CR-031, R-28)

비유: 같은 규격의 액자를 벽에 줄 맞춰 거는 것이다. 제목·설명 글이 길어도 액자 크기는 그대로이고, 넘친 글은 끝을 「…」로 접고 마우스를 올리면 전체가 보인다.

| 부분 | CSS (`ImageSlotCard.module.css`) | 높이 |
|---|---|---|
| `.card` | `box-sizing: border-box; height: 100%; display: flex; flex-direction: column; gap: var(--st-gap-sm); padding: var(--st-card-pad); border: 1px solid var(--st-border); border-radius: var(--st-card-radius); background: var(--st-card); overflow: hidden` | 격자 줄 280px(테두리 1+1, 안쪽 여백 16+16) |
| `.head` | `display: flex; align-items: center; gap: var(--st-gap-sm); height: 20px; flex: 0 0 20px` | 20 |
| `.title` | `flex: 1; min-width: 0; margin: 0; font-size: 13px; line-height: 20px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis` | (20 안) |
| 배지 | 그대로 + `flex: 0 0 auto; line-height: 16px; white-space: nowrap` | (20 안) |
| `.desc` | `margin: 0; font-size: 12px; line-height: 16px; height: 32px; flex: 0 0 32px; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; color: var(--st-muted)` | 32 |
| `.preview` | `position: relative; height: 140px; flex: 0 0 140px`(나머지 그대로) | 140 |
| `.cardError` | `position: absolute; left: 0; right: 0; bottom: 0; margin: 0; padding: 4px 8px; background: #fde8e8; color: var(--st-danger); font-size: 12px; line-height: 16px; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden` | (140 안, 최대 40) |
| `.actions` | `display: flex; gap: var(--st-gap-sm); height: 30px; flex: 0 0 30px; margin-top: auto` | 30 |
| `.primary` | `flex: 1 1 auto; min-width: 0; height: 30px; padding: 0 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`(색 그대로) | — |
| `.outline` | `flex: 0 0 auto; height: 30px; padding: 0 10px; white-space: nowrap`(색 그대로) | — |
| `.addCard` | `height: 100%; min-height: 0; align-items: center; justify-content: center; border: 1px dashed var(--st-border); background: transparent`(옛 `min-height: 140px` 삭제) | 280 |
| `.addError` | `margin: 0; max-width: 100%; font-size: 12px; line-height: 16px; color: var(--st-danger); text-align: center; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden` | — |

높이 합산: 1 + 16 + 20 + 8 + 32 + 8 + 140 + 8 + 30 + 16 + 1 = **280px** = `--st-slot-card-h`. `ImagesTab.module.css` `.grid`는 §1 값, `.groupTitle` = `margin: var(--st-gap-xl) 0 var(--st-gap-md); font-size: 14px; line-height: 20px; font-weight: 700`(첫 그룹은 `.note` 바로 아래라 같은 값), `.note` = `margin: 0; font-size: 12px; line-height: 16px`, `.root` `gap: 0`.

3개 국어 검산(가장 좁은 칸 = 200px, 안쪽 폭 168px — WebView2는 `-webkit-line-clamp`를 지원한다):
- 버튼 줄: 가장 긴 조합 en 「Change image」(12px ≈ 72px + 여백 20 = 92) + 「Reset」(≈ 30 + 20 = 50) + 간격 8 = 150 ≤ 168 → 한 줄에 들어간다. ja 「画像を変更」+「リセット」, ko 「이미지 변경」+「기본값」도 더 짧다. 그래도 넘치면 `.primary`만 말줄임(이름은 `aria-label`이 전체를 가진다).
- 제목: 배지(en 「Required」·「Optional」 ≈ 60px) 뒤 남는 폭 ≈ 100px(13px 굵게, 영문 약 13자). 이보다 긴 제목(예: en 「Hand Backspace」, 「Hand press 2」)은 말줄임되고 `title` 툴팁·`aria-labelledby`(h3 전체 글자)로 전체 이름이 남는다.
- 설명: 12px 두 줄 = en 약 50자·ja 약 26자·ko 약 28자. 가장 긴 설명(en `pen_down` 「While a key or click is pressed (alternates if several)」, ja `pen_down`)은 둘째 줄 끝이 말줄임되고 `title` 툴팁으로 전체가 보인다.
- 문구 키·문구는 바꾸지 않는다(`design/i18n.md` 변경 없음).

**`ConfirmDialog`**: `open`이 false면 `null`.

1. 배경막 `<div className=backdrop>`(화면 전체, `rgba(17,24,39,0.45)`, 클릭해도 닫히지 않음) 안에 `<div role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={msgId} className=dialog onKeyDown={onKeyDown}>`.
2. `<h2 id={titleId}>{title}</h2>` · `<p id={msgId}>{message}</p>` · 버튼 줄 `<button type="button" className=danger ref={confirmRef} onClick={onConfirm}>{confirmLabel}</button>` `<button type="button" className=outline ref={cancelRef} onClick={onCancel}>{cancelLabel}</button>`.
3. 열릴 때 `useEffect(() => { if (open) cancelRef.current?.focus() }, [open])` — 기본 포커스 = 「취소」.
4. `onKeyDown`: `Escape` → `onCancel()`. `Tab`/`Shift+Tab` → 두 버튼 사이에서만 순환(`preventDefault` 후 다른 버튼에 `focus()`).
5. 스타일: 흰 상자, 둥근 14px, 너비 360px, 가운데. `.danger` = `var(--st-danger)` 채움 흰 글자.

## 7. 파이프라인

| # | 흐름 | 정상 | 오류 |
|---|---|---|---|
| I-1 | 이미지 변경 | 「이미지 변경」 → 파일 대화상자(제목 `t.pickTitle`, PNG 필터) → 파일 선택 → 모든 카드 버튼 비활성 → `importAsset(slot, path)` → 카드 오류 지움 → `assets://changed`로 미리보기 새 그림(오버레이도 같은 이벤트) → 버튼 다시 활성 | 대화상자 취소 → 아무 호출 없음. 검증 실패(`asset.too_large`·`asset.canvas_mismatch` 등) → 그 카드 아래 오류 한 줄(`errorText` — ko는 Rust message, ja·en은 code 문구) |
| I-2 | 타자 입력 그림 추가 | 추가 카드 → I-1과 같고 슬롯 = 다음 index → 성공 시 새 카드가 생기고 추가 카드는 한 칸 뒤로 | I-1과 같음(추가 카드 아래 오류) |
| I-3 | 기본값(비우기) — **(CR-035) 내장 기본이 없는 칸(`resetKind === 'clear'`)만** | 「기본값」(등록돼 있고, 여러 장이면 마지막 장) → 확인 대화상자(포커스 「취소」) → 「지우기」 → 모든 카드 버튼 비활성 → `removeAsset(slot)` → `assets://changed`로 빈 미리보기(필수면 `emptyRequired`) → 포커스는 누른 「기본값」 버튼으로 | 「취소」·Esc → 호출 없음, 포커스 복귀. 실패(`asset.not_found`·`asset.io`) → 카드 오류 줄 |
| I-4 | `pen_up` 첫 등록 | I-1 성공 후 `penPos === null`이면 `resolvePenPos`로 기본 위치를 계산해 `setSettings` 1회 → `settings://changed`로 「어깨축·손 위치」 탭 손 위치 반영 | 저장 실패 → 창 오류 줄(그림 등록은 유지) |

파괴 조작 confirm:

| 조작 | confirm | 문구 |
|---|---|---|
| 「기본값」(슬롯 비우기 — CR-035부터 내장 기본이 없는 칸만) | **필수** | `confirmClearTitle`·`confirmClearMessage`(「되돌릴 수 없습니다」 명시)·`confirmClearOk`·`confirmCancel` |
| 「기본값」(내장 기본 그림으로 복원, CR-035) | **필수**(사용자 그림을 지움, `tone` 기본 danger, 2단추) | `confirmRestoreTitle`·`confirmRestoreMessage`(「되돌릴 수 없습니다」 명시)·`confirmRestoreOk`·`confirmCancel` |
| 기본 이미지 다운로드 덮어쓰기(CR-035, 충돌이 있을 때만) | **필수**(폴더의 같은 이름 파일을 덮어씀, danger) | `exportConflictTitle`·`exportConflictMessage`(「되돌릴 수 없습니다」 명시)·`exportConflictOk`·`confirmCancel` |

(CR-035 추가 흐름)

| # | 흐름 | 정상 | 오류 |
|---|---|---|---|
| I-3R | 기본값(복원) — 내장 기본이 있는 15칸(`resetKind === 'restore'`) | 「기본값」(**항상 활성** — 빈 칸·이미 기본 그림·가운데 `kb_down_0` 포함) → 확인창 2단추(`confirmRestore*`, 포커스 「취소」) → 「기본 그림으로」 → 모든 카드 버튼 비활성 → `restoreDefaultAsset(slot)` 1회(`removeAsset` 0회) → 카드 오류 지움 → `assets://changed`로 미리보기가 기본 그림 → 포커스는 누른 「기본값」 버튼으로. 빈 `pen_up`을 복원했으면(`isFirstPenUp` true) R-30 확인창(`penFirst*`) → 이후 I-6과 같음 | 「취소」·Esc → 호출 없음, 포커스 복귀. 실패(`asset.canvas_mismatch` — 다른 크기 캔버스 세트를 쓰는 사용자, `asset.no_default`·`asset.io` 등) → 그 카드 오류 띠(`errorText`), 사용자 그림 그대로 |
| I-8~I-10 | 기본 이미지 다운로드 | §10.6 | §10.6 |

## 8. 접근성

- 포커스 순서: 그룹 순서대로 카드마다 「이미지 변경」 → 「기본값」(비활성이면 건너뜀) → 추가 카드 버튼.
- 같은 문구 버튼이 많으므로 aria-label에 카드 제목을 넣는다(`changeImageAria`·`clearImageAria`).
- 가운데 장 「기본값」은 `disabled` + `title`(툴팁 `clearLastOnly`).
- 배지는 보이는 글자라 따로 aria 없음. 미리보기 그림은 장식 `alt=""`(카드 제목이 이름).
- 카드 오류 = `role="alert"`. 확인 대화상자 = `role="alertdialog"` + `aria-modal`, 포커스 가둠, Esc 닫기, 닫힌 뒤 누른 버튼으로 포커스 복귀.
- 진행 중(`slotBusy`)에는 모든 카드 버튼 `disabled`(포커스 순서에서 빠짐).
- (CR-035) 포커스 순서 맨 앞에 「기본 이미지 다운로드」 버튼(`p.note` 아래)이 온다. 「기본값」 aria-label은 `resetKind`로 고른다(`restoreImageAria` 「{name} 기본 그림으로 되돌리기」 / `clearImageAria`). 내장 기본이 있는 칸의 「기본값」은 `slotBusy` 중이 아니면 늘 포커스를 받는다. 다운로드 접근성은 §10.8.

## 9. 펜 손 사용 (CR-033, R-29 · R-30)

비유: 펜 손은 「글씨 쓰는 손」 스위치다. 켜면 타자·클릭 때 팔 끝의 손이 펜을 대고 떼는 그림으로 바뀌고 키보드 쪽 손은 가만히 있는다. 끄면 손은 팔 끝에 붙어 따라다니기만 하고 타자 반응은 키보드 그림이 맡는다.

- 계약: contract **v0.15** §3.3 `MouseSettings.penMode: boolean`(기본 `false`), 기존 `set_settings`·`settings://changed`·`import_asset`·`assets://changed`. 펜 모드 판정(overlay) = `pen_up` 등록 **그리고** `mouse.penMode === true`.
- 메인 세션 결정(2026-09-24): ① 「어깨축·손 위치」 탭 「기본값으로 리셋」은 `penMode`를 **건드리지 않는다**(위치류만 리셋 — §9.6) ② `pen_up`을 지워도 `penMode` 저장값은 그대로 두고 토글만 비활성 ③ `pen_up`이 없던 상태에서 다시 등록하면 「첫 등록」으로 보고 확인창을 다시 띄운다.

### 9.1 레이아웃 (확정 — §1 ASCII 「h2 groupHand」 아래 두 줄)

손(펜) 그룹 제목(`h2 groupHand`)과 카드 격자 사이에 `PenModePanel` 1개. 격자 밖이라 R-28 카드 고정 높이와 무관하다. 다른 그룹에는 없다.

```
+-- PenModePanel (div.penPanel) -----------------------------+
| (o ) penModeLabel                                          |
|      penModeDesc                                           |
| +-- div.penNote -----------------------------------------+ |
| | penModeNoteOn                                          | |
| | penModeNoteOff                                         | |
| +--------------------------------------------------------+ |
+------------------------------------------------------------+
```

### 9.2 컴포넌트

| 컴포넌트 | 파일 | 분류 | props | 요구ID |
|---|---|---|---|---|
| `PenModePanel` (default, 신규) | `src/settings/components/PenModePanel.tsx` (+`ImagesTab.module.css` 공유 — `.penPanel`·`.penNote`) | 화면 로컬(ImagesTab 400줄 분리) | `checked: boolean`, `disabled: boolean`, `busy: boolean`, `onToggle: () => void` | R-29 |
| `ToggleSwitch` | 기존(`design/general-tab.md` §2·§2.1) — 재사용, 변경 없음 | 화면 로컬 | `id="pen-mode-toggle"`, `label={t.penModeLabel}`, `description={t.penModeDesc}`, `checked`·`disabled`·`busy`·`onToggle` = `PenModePanel` props 그대로 | R-29 |
| `ConfirmDialog` | 기존(§2·§6) — **prop 1개 추가** `tone?: 'danger' \| 'accent'`(기본 `'danger'` — 기존 호출 불변). `'accent'`면 확인 버튼 `className=accent`(`background: var(--st-accent)`, 흰 글자, hover `var(--st-accent-hover)`), `'danger'`면 기존 `.danger` | 화면 로컬 · 공용 승격 후보(그대로) | 기존 + `tone` | R-25, R-29, R-30 |

`PenModePanel` 렌더(`t = useMessages()`): `<div className=penPanel>` → `<ToggleSwitch id="pen-mode-toggle" …/>` → `<div className=penNote id="pen-mode-note"><p>{t.penModeNoteOn}</p><p>{t.penModeNoteOff}</p></div>`. 안내 상자는 `checked`·`disabled`와 무관하게 **항상** 보인다. CSS: `.penPanel { display: flex; flex-direction: column; gap: var(--st-gap-sm); margin-bottom: var(--st-gap-md) }`, `.penNote { padding: var(--st-gap-md); border: 1px solid var(--st-border); border-radius: var(--st-card-radius); background: var(--st-nav-active); font-size: 12px; line-height: 16px }`, `.penNote p { margin: 0 }`, `.penNote p + p { margin-top: var(--st-gap-xs) }`. 말줄임 없음(줄 수 자유 — 카드가 아님).

`ImagesTab` 렌더 개정(§6 2): `g.id === 'hand'`이면 `h2` 바로 뒤, 격자 앞에 `<PenModePanel checked={penOn} disabled={!hasPenUp \|\| slotBusy !== null} busy={penSaving} onToggle={onTogglePenMode}/>`. §6 4 뒤에 두 번째 대화상자: `<ConfirmDialog open={penDialog !== null} tone="accent" title={…} message={…} confirmLabel={…} cancelLabel={…} onConfirm={onPenDialogConfirm} onCancel={onPenDialogCancel}/>` — 문구는 `penDialog.kind`로 고른다: `'enable'` → `penEnableTitle`·`penEnableMessage`·`penEnableOk`·`confirmCancel` / `'first'` → `penFirstTitle`·`penFirstMessage`·`penFirstYes`·`penFirstNo`(`penDialog === null`일 때는 `'enable'` 문구 — 닫혀 있어 보이지 않음).

### 9.3 상태 (`ImagesTab`, §4에 추가)

| 상태 | 용도 | 타입 | 초기값 | 소유 |
|---|---|---|---|---|
| `penDialog` | 펜 확인창 종류. `'enable'` = 토글로 켤 때(R-29), `'first'` = `pen_up` 첫 등록 직후(R-30, `size` = 새 `pen_up` 크기 — `penPos` 첫 저장용) | `{ kind: 'enable' } \| { kind: 'first'; size: { width: number; height: number } } \| null` | `null` | `useState` |
| `penSaving` | `penMode` 저장 응답 대기. true 동안 토글 `busy`(비활성·`aria-busy`) | `boolean` | `false` | `useState` |
| (파생) `mouse` | 현재 마우스 설정 | `MouseSettings` | `settings.mouse ?? DEFAULT_MOUSE_SETTINGS` | 파생 |
| (파생) `hasPenUp` | 토글 활성 조건 | `boolean` | `findEntry(manifest, 'pen_up') !== undefined` | 파생 |
| (파생) `penOn` | 토글 표시값 = 실제 펜 모드 | `boolean` | `hasPenUp && mouse.penMode === true`(결정 ②: `pen_up`이 없으면 저장값이 true여도 꺼짐으로 보이고 비활성 — 저장값은 바꾸지 않음) | 파생 |

### 9.4 기능 (§5에 추가·개정)

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `isFirstPenUp` (신규, `src/settings/imageSlots.ts` 순수) | `(slot: AssetSlot, before: AssetManifest, next: AssetManifest) => boolean` | `slotKey(slot) === 'pen_up' && findEntry(before, 'pen_up') === undefined && findEntry(next, 'pen_up') !== undefined`. 예: 빈 → 등록 = true / 교체(이미 있음) = false / `pen_down_0` 등록 = false / 지운 뒤 다시 등록 = true(결정 ③) | 없음 | R-30 |
| `onChangeImage` (개정) | 시그니처 불변 | 기존 순서에서 `importAsset` **전에** `before = manifest`(호출 시점 prop)를 잡는다. `next` 수신 → `setCardError(null)` → `isFirstPenUp(slot, before, next)`이면 `e = findEntry(next, 'pen_up')` → `setPenDialog({ kind: 'first', size: { width: e.width, height: e.height } })`(**`ensurePenPos`를 부르지 않는다** — 저장은 대답 때 한 번), 아니면 기존대로 `await ensurePenPos(slot, next)` → `finally` `setSlotBusy(null)` | 기존과 같음 | R-25, R-30 |
| `savePenMode` (신규) | `(on: boolean, size: { width: number; height: number } \| null) => Promise<void>` | `m = settings.mouse ?? DEFAULT_MOUSE_SETTINGS` → `penPos = size !== null && m.penPos === null ? resolvePenPos(m, size) : m.penPos` → `setPenSaving(true)` → `await setSettings({ ...settings, mouse: { ...m, penMode: on, penPos } })` → `onError(null)` → `finally` `setPenSaving(false)`. **`set_settings` 1회**에 `penMode`와(첫 등록이면) `penPos`를 함께 싣는다. 토글 표시는 `settings://changed`로 바뀐다(로컬 선반영 없음 — `design/general-tab.md` `saveSettings`와 같은 규칙) | reject → `onError(toBridgeError(e))`(창 오류 줄), 토글은 원래 값 그대로 | R-29, R-30 |
| `onTogglePenMode` (신규) | `() => void` | `!hasPenUp \|\| penSaving \|\| slotBusy !== null`이면 무시 → `penOn`이면 `savePenMode(false, null)`(**끌 때 확인 없음**) → 아니면 `setPenDialog({ kind: 'enable' })` | 없음 | R-29 |
| `onPenDialogConfirm` (신규) | `() => void` | `d = penDialog` → `setPenDialog(null)` → `savePenMode(true, d.kind === 'first' ? d.size : null)` → 포커스 `document.getElementById('pen-mode-toggle')?.focus()` | 없음(저장 실패는 `savePenMode`) | R-29, R-30 |
| `onPenDialogCancel` (신규 — 「취소」·「아니요」·Esc) | `() => void` | `d = penDialog` → `setPenDialog(null)` → `d.kind === 'first'`이면 `savePenMode(false, d.size)`(**아니요 = 꺼짐 저장** + `penPos` 첫 저장), `'enable'`이면 호출 없음 → 포커스 토글(위와 같음) | 없음 | R-29, R-30 |
| `ensurePenPos` | 불변 | 첫 등록이 아닌 `pen_up` 교체에서만 불린다(첫 등록은 `savePenMode`가 `penPos`를 함께 저장) | 불변 | R-25 |

순서(R-30 「한 번의 set_settings」): 옛 I-4(등록 직후 `penPos`만 저장)는 첫 등록에서 **대답 뒤 저장 1회**(`penMode` + `penPos`)로 바뀐다. 확인창이 떠 있는 동안 창을 닫으면 아무것도 저장되지 않는다 — `penPos = null`(overlay는 같은 기본 위치 규칙 `resolvePenPos`로 그림)·`penMode` 기존 값(기본 `false`)이라 화면이 깨지지 않고, 다음 첫 등록 판정은 `pen_up`이 이미 있으므로 다시 묻지 않는다(토글로 켠다).

### 9.5 파이프라인 (§7에 추가 — I-4는 I-6이 대체)

| # | 흐름 | 정상 | 오류 |
|---|---|---|---|
| I-5 | 토글로 켜기 | 토글 → 확인창(`penEnable*`, 포커스 「취소」) → 「켜기」 → `set_settings`(`penMode: true`) → `settings://changed`로 토글 켜짐 → 포커스 토글 | 「취소」·Esc → 호출 없음, 포커스 토글. 저장 실패 → 창 오류 줄, 토글 꺼짐 그대로 |
| I-5′ | 토글로 끄기 | 토글 → 확인 없이 `set_settings`(`penMode: false`) → 토글 꺼짐 | 저장 실패 → 창 오류 줄, 토글 켜짐 그대로 |
| I-6 | `pen_up` 첫 등록 | I-1 성공(`isFirstPenUp` true) → 확인창(`penFirst*`, 포커스 「아니요」) → 「예」 → `set_settings`(`penMode: true`, `penPos` = 비어 있으면 `resolvePenPos`) / 「아니요」·Esc → `set_settings`(`penMode: false`, `penPos` 같은 규칙) → 토글 표시 반영 | 저장 실패 → 창 오류 줄(그림 등록은 유지, `penPos`는 `null` 그대로 — overlay 기본 위치) |
| I-7 | `pen_up` 비우기 | I-3 → `assets://changed` → 토글 비활성·꺼짐 표시(`penMode` 저장값 불변, 결정 ②) | I-3과 같음 |

confirm 표 추가: 펜 손 켜기(토글) = 확인 필수(R-29, 파괴 조작 아님 — 요구가 정한 확인이라 `tone="accent"`), 펜 손 끄기 = 확인 없음(R-29), 첫 등록 = 확인(예/아니요, R-30).

### 9.6 「기본값으로 리셋」 개정 (결정 ①, `design.md` §5.2 `onReset`)

`onReset`이 보내는 값 = `{ ...DEFAULT_MOUSE_SETTINGS, penMode: (settings.mouse ?? DEFAULT_MOUSE_SETTINGS).penMode }` — 위치류(어깨·이동 영역·`hand`·`partPos`·`penPos`)만 기본값, `penMode`는 현재 값 유지. 이 식이 `design.md` §5.2 `onReset`의 「`DEFAULT_MOUSE_SETTINGS` 그대로」를 대체한다.

### 9.7 접근성

- 포커스 순서: 손 그룹 제목 → 「펜 손 사용」 토글(비활성이면 건너뜀) → 손 그룹 카드들. 안내 상자는 포커스 대상이 아니다(보이는 글).
- 토글 = `role="switch"`·`aria-checked={penOn}`·`aria-describedby` = `penModeDesc`(비활성 이유). 저장 중 `aria-busy`.
- 확인창 2종 = 기존 `ConfirmDialog` 규칙(`role="alertdialog"`, 기본 포커스 = 취소·아니요, Esc = 취소·아니요, Tab 가둠). 닫히면 포커스는 토글로.

## 10. 기본 이미지 세트 (CR-035, R-31 · R-32 · R-33)

비유: 견본이 있는 칸의 「기본값」은 「견본으로 되돌리기」 단추고, 견본이 없는 칸에서는 예전처럼 「지우개」다. 견본이 있는 칸은 비워 둘 수 없다 — 늘 사용자 그림이나 견본 중 하나가 들어 있다. 「기본 이미지 다운로드」는 견본 15장을 원본 그대로 복사해 가는 단추다.

- 계약: contract **v0.16**(머리 「계약」 줄). 사용자 결정(🔒 2026-09-24): U-1 = B(비우기 없음 — 복원만, 2단추 확인창 그대로, 3단추·「비우기」 선택지 없음), U-5 = A(충돌이면 확인 후 전부 덮어쓰기), U-7(빈 `pen_up` 복원 → R-30 확인창).
- `ConfirmDialog.tsx`는 **변경하지 않는다**. overlay는 코드 변경 없음.

### 10.1 첫 실행 (R-31)

화면 변경 없음. core가 첫 실행(매니페스트가 비어 있고 슬롯 파일이 없음)에 15장을 채우고, 이 탭은 기존 `get_asset_manifest`(마운트)·`assets://changed`로 받은 매니페스트를 그대로 카드에 그린다(§3 `buildSlotGroups` 불변). 확인은 수동(스크린샷 — 앱 데이터 폴더를 지우지 않는 방법으로, 패킷 §6).

### 10.2 「기본값」 분기 (R-32) — 요약

| 칸 | `resetKind` | 「기본값」 활성(`canReset`) | 확인창 | 호출 |
|---|---|---|---|---|
| `hasBuiltinDefault(slot)` true(15칸) | `'restore'` | **항상**(`slotBusy` 중만 비활성) | 복원(`confirmRestore*`, 2단추) | `restoreDefaultAsset(slot)` — `removeAsset` 경로 없음 |
| 그 외(`mouse_left/right`·`pen_key_*` 7·`kb_down_1+`·`pen_down_1+`) | `'clear'` | 옛 규칙: 그림 있음 && (단일 또는 마지막 장) | 비우기(`confirmClear*`) | `removeAsset(slot)` |

정의: §3 `slotCard`·예, §4 `confirm`, §5 `onRequestReset`·`onConfirmReset`·`onConfirmRestore`·`onConfirmClear`·`onCancelReset`, §6 4′·`ImageSlotCard` 5 개정, §7 I-3·I-3R·confirm 표, §8.

### 10.3 `DefaultsDownloadPanel` 레이아웃 (확정)

탭 맨 위 `p.note` 바로 아래, 카드 격자 밖(R-28 카드 고정 높이와 무관). 설명 글과 단추가 한 줄, 결과 줄은 다운로드 뒤에만 그 아래 줄에 생긴다. 좁은 폭(최소 창 720px)에서는 단추가 설명 아래로 줄바꿈된다(`flex-wrap`).

```
+-- DefaultsDownloadPanel (div.download) --------------------+
| p.downloadDesc: downloadDefaultsDesc  [downloadDefaults]   |
| p.downloadResult: exportDone | exportPartial | error text  |
| (result line shown only after a download; cleared on next) |
+------------------------------------------------------------+
```

CSS(`ImagesTab.module.css`에 추가):

| 선택자 | 규칙 |
|---|---|
| `.download` | `display: flex; flex-wrap: wrap; align-items: center; gap: var(--st-gap-sm) var(--st-gap-md); margin-top: var(--st-gap-md); padding: var(--st-gap-md); border: 1px solid var(--st-border); border-radius: var(--st-card-radius); background: var(--st-card)` |
| `.downloadDesc` | `flex: 1 1 240px; min-width: 0; margin: 0; font-size: 12px; line-height: 16px; color: var(--st-muted)`(말줄임 없음 — 카드가 아님) |
| 단추 | `ImageSlotCard.module.css`의 `.outline` 그대로(`import cardStyles from './ImageSlotCard.module.css'` — `AddSlotCard`와 같은 방식). 새 색 없음 |
| `.downloadResult` | `flex: 1 0 100%; margin: 0; font-size: 12px; line-height: 16px` |
| `.downloadResult[data-tone='error']` | `color: var(--st-danger)` |

### 10.4 상태 (`DefaultsDownloadPanel` 로컬)

| 상태 | 용도 | 타입 | 초기값 | 소유 |
|---|---|---|---|---|
| `busy` | `exportDefaultAssets` 응답 대기. true 동안 단추 `disabled`·`aria-busy` | `boolean` | `false` | `useState` |
| `conflict` | 덮어쓰기 확인창 대상(충돌 파일명) | `{ dir: string; files: string[] } \| null` | `null` | `useState` |
| `result` | 결과 줄 | `DownloadResult \| null`(§3) | `null` | `useState` |
| `buttonRef` | 다운로드 단추 | `useRef<HTMLButtonElement \| null>` | `null` | `useRef` |
| `refocusRef` | 다운로드가 끝나면 단추로 포커스를 돌릴지 | `useRef<boolean>` | `false` | `useRef` |

`slotBusy`와 무관하다(매니페스트를 바꾸지 않음) — 카드 등록 중에도 다운로드할 수 있고, 다운로드 중에도 카드 버튼은 그대로다.

### 10.5 기능

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `onDownload` | `() => Promise<void>` | `busy \|\| conflict !== null`이면 무시 → `setResult(null)`(결과 줄은 다음 다운로드 시작 때 지움) → `try` `dir = await pickFolder(t.pickFolderTitle)` → `null`(취소)이면 끝(`exportDefaultAssets` 호출 없음, 결과 줄 없음) → `setBusy(true)` → `refocusRef.current = true` → `r = await exportDefaultAssets(dir, false)` → `r.written.length === 0 && r.conflicts.length > 0`이면 `setConflict({ dir, files: r.conflicts })`(아무것도 쓰이지 않음 — 계약) / 아니면 `setResult(exportResult(r))` → `finally` `setBusy(false)` | `pickFolder`·`exportDefaultAssets` reject → `setResult({ kind: 'error', error: toBridgeError(e) })`(`asset.export_dir` 등) | R-33 |
| `onConflictConfirm` | `() => Promise<void>` | `c = conflict`(없으면 끝) → `setConflict(null)` → `setBusy(true)` → `refocusRef.current = true` → `try` `r = await exportDefaultAssets(c.dir, true)`(**전부 덮어쓰기**, 1회) → `setResult(exportResult(r))` → `finally` `setBusy(false)` | reject → `setResult({ kind: 'error', error: toBridgeError(e) })` | R-33 |
| `onConflictCancel` | `() => void` | `setConflict(null)` → `refocusRef.current = true`. 2차 호출 없음, 결과 줄 없음 | 없음 | R-33 |
| (효과) 포커스 복귀 | `useEffect(…, [busy, conflict])` | `busy \|\| conflict !== null \|\| !refocusRef.current`이면 끝 → `refocusRef.current = false` → `buttonRef.current?.focus()`. 충돌 확인창이 열려 있는 동안은 확인창이 포커스를 가진다(기본 「취소」) | 없음 | R-33 |
| `resultText` (컴포넌트 안) | `(r: DownloadResult) => string` | `'done'` → `format(t.exportDone, { n: r.count })` / `'partial'` → `format(t.exportPartial, { ok: r.ok, fail: r.failed.length, files: r.failed.join(', ') })` / `'error'` → `errorText(t, language, r.error)` | 없음 | R-33, R-20 |

- 클라이언트는 폴더·파일 존재나 PNG를 판정하지 않는다. 충돌·실패는 `ExportReport`만 보고 판단한다.
- 폴더 선택 대화상자가 떠 있는 동안은 OS 모달이라 단추를 다시 누를 수 없다(`pickPngFile`과 같음).

### 10.6 파이프라인 (U-5 = A)

| # | 흐름 | 정상 | 오류 |
|---|---|---|---|
| I-8 | 다운로드(충돌 없음) | 「기본 이미지 다운로드」 → 폴더 대화상자(제목 `t.pickFolderTitle`) → 폴더 선택 → 단추 비활성·`aria-busy` → `exportDefaultAssets(dir, false)` → `conflicts` 비어 있음·`failed` 비어 있음 → 결과 줄 `exportDone`({n: `written` 수}), `role="status"` → 단추로 포커스 | 대화상자 취소 → 호출 없음·결과 줄 없음. reject(`asset.export_dir` 등) → 결과 줄 `errorText`, `role="alert"`, 오류색 |
| I-9 | 다운로드(충돌) | I-8에서 `written` 0개 && `conflicts` ≥1 → 확인창(`exportConflictTitle`, `exportConflictMessage`({n: 충돌 수}), `exportConflictOk`, `confirmCancel`, danger, 기본 포커스 「취소」) → 「덮어쓰기」 → `exportDefaultAssets(dir, true)` 1회 → I-8·I-10의 결과 규칙 | 「취소」·Esc → 아무것도 쓰지 않음(2차 호출 0회), 결과 줄 없음, 포커스는 다운로드 단추 |
| I-10 | 부분 실패 | 어느 호출이든 `failed` ≥1 → 결과 줄 `exportPartial`({ok: `written` 수, fail: `failed` 수, files: 실패 파일명을 `, `로 이음}), `role="alert"`, 오류색 | — |

### 10.7 렌더

`t = useMessages()`, `language = useLanguage()`.

1. `<div className=download>`.
2. `<p className=downloadDesc id="download-defaults-desc">{format(t.downloadDefaultsDesc, { n: DEFAULT_ASSET_SLOTS.length })}</p>` — 장 수는 bridge 상수에서(목록·개수를 화면에 다시 적지 않는다).
3. `<button type="button" ref={buttonRef} className={cardStyles.outline} aria-describedby="download-defaults-desc" aria-busy={busy} disabled={busy} onClick={() => void onDownload()}>{t.downloadDefaults}</button>`.
4. `result !== null`이면 `<p className=downloadResult role={result.kind === 'done' ? 'status' : 'alert'} data-tone={result.kind === 'done' ? 'ok' : 'error'}>{resultText(result)}</p>`.
5. `<ConfirmDialog open={conflict !== null} title={t.exportConflictTitle} message={format(t.exportConflictMessage, { n: conflict?.files.length ?? 0 })} confirmLabel={t.exportConflictOk} cancelLabel={t.confirmCancel} onConfirm={() => void onConflictConfirm()} onCancel={onConflictCancel}/>`(`tone` 기본 danger).

### 10.8 접근성

- 포커스 순서: 다운로드 단추 → (그룹·카드). 설명 글은 `aria-describedby`로 단추에 묶인다.
- 진행 중: 단추 `disabled` + `aria-busy="true"`. 끝나면(성공·실패·충돌 취소) 포커스는 다운로드 단추로(§10.5 효과).
- 결과 줄: 완료 = `role="status"`(조용한 알림), 부분 실패·오류 = `role="alert"`.
- 덮어쓰기 확인창 = 기존 `ConfirmDialog` 규칙(`role="alertdialog"`, `aria-modal`, 기본 포커스 「취소」, Esc = 취소, Tab 가둠, 배경막 클릭 무반응).

### 10.9 파일 크기

`ImagesTab.tsx`(현 268줄)는 복원 분기(`onConfirmRestore`·`onConfirmReset`·문구 선택 표 ≈ +35줄)만 늘어 400줄 이하를 유지한다. 다운로드는 별도 파일 `DefaultsDownloadPanel.tsx`(≤130줄). `exportResult`·`ResetKind`·`DownloadResult`는 `imageSlots.ts`(순수).

## 11. 배포용 기본 세트 교체·뒷머리 비우기 (CR-038, R-36 · R-35)

비유: 견본 상자에서 임시 견본(대기·쉬는중·특수 키)을 빼고, 대신 뒷머리 견본을 넣었다. 뒷머리 칸에는 「견본으로 되돌리기」 단추 옆에 「지우개」 단추를 하나 더 달아, 단발 캐릭터는 뒷머리를 아예 비울 수 있다.

- 계약: contract **v0.18**(`src/bridge/types.ts` 반영됨) — `DEFAULT_ASSET_SLOTS` 7개(`kb_up`·`kb_down_0`·`background`·`hair`·`mouse_base`·`pen_up`·`pen_down_0`), `hasBuiltinDefault`는 이 배열로 판정, `DEFAULT_MOUSE_SETTINGS` shoulder (558,500)·penPos (356,504)·penMode true. 새 command·event·에러 코드 없음.
- 요구: R-36(기본 세트 7장, R-31 대체), R-35(뒷머리 「비우기」), R-32·R-34(부분 대체 — `requirements.md` 요구 표).
- **(CR-044) 이 절의 `hair` 서술은 §13이 대체한다** — 기본 세트 6장(hair 없음, contract v0.20), R-35 폐기로 뒷머리 카드의 「비우기」 버튼·I-11 흐름·「뒷머리 그림 비우기」 aria-label이 없어진다. §11.2 두 줄 버튼 레이아웃·§11.3 props·§11.4 `onRequestEmpty`·`onConfirmClear` `focusAfter`·§11.5 confirm 규칙은 **`kb_down_0` 카드(§12)가 그대로 쓴다**(ASCII·검산의 제목만 「타자 입력 1」로 읽는다).

### 11.1 기본 세트 교체 영향 (R-36) — 화면 코드 변경 없음

화면은 목록을 다시 적지 않고 `hasBuiltinDefault(slot)`·`DEFAULT_ASSET_SLOTS.length`만 읽으므로(§3 `slotCard`, §10.7) 코드 변경 없이 따른다. 이 문서의 옛 서술은 아래처럼 읽는다.

| 위치 | 옛 서술 | CR-038 기준 |
|---|---|---|
| §3 `exportResult` 예 | `{written: 15개}` → `{kind:'done', count: 15}` | `{written: 7개}` → `{kind:'done', count: 7}`(개수는 임의 — 함수는 `written.length`를 그대로 씀) |
| §10 비유·§10.1 | 견본 15장·첫 실행 15장 | 견본 **7장**. 첫 실행 이미지 탭 = 7칸(`background`·`hair`·`kb_up`·`kb_down_0`·`mouse_base`·`pen_up`·`pen_down_0`)에 그림, 나머지는 빈 미리보기(필수 배지 3칸은 모두 채워짐 → `emptyRequired` 없음) |
| §10.2 표 1행 | `hasBuiltinDefault(slot)` true(15칸) → `'restore'` | true(**7칸**) → `'restore'`. `hair` 포함 |
| §10.2 표 2행 | 그 외(`mouse_left/right`·`pen_key_*` 7·`kb_down_1+`·`pen_down_1+`) → `'clear'` | 그 외 = **`idle`·`rest`·`key_*` 7**·`mouse_left/right`·`pen_key_*` 7·`kb_down_1+`·`pen_down_1+` → `'clear'`(옛 규칙: 그림 있음 && 단일 또는 마지막 장). 기존 설치에서 `idle` 등에 그림이 있으면 「기본값」은 비우기 확인창 → `removeAsset` |
| §3.1 「기본값」 | `hair` = 비우기 | `hair` = 복원(§3.1 개정 줄) + 「비우기」 버튼(§11.2) |
| §10.7 `downloadDefaultsDesc` `{n}` | 15 | 7(`DEFAULT_ASSET_SLOTS.length`) |

- 펜 손(§9): 기본값 `penMode` = true(v0.18). 첫 실행은 `pen_up`이 기본으로 채워져 토글이 켜짐으로 보인다. 토글·R-30 첫 등록 판정(`isFirstPenUp` — 매니페스트 전후 비교) 코드 변경 없음. 「기본값으로 리셋」은 `penMode` 현재값 유지(§9.6) 그대로.

### 11.2 뒷머리 「비우기」 버튼 (R-35) — 레이아웃 (확정)

뒷머리 카드만 버튼이 3개라 한 줄(30px)에 들어가지 않는다(검산 아래). 이 카드만 버튼 줄을 **두 줄**(위: 「이미지 변경」 전체 폭 / 아래: 「기본값」·「비우기」 반반)로 하고, 늘어난 34px만큼 **미리보기를 140 → 106px**로 줄인다. 카드 바깥 높이 280px·안쪽 여백·제목 1줄·설명 2줄은 다른 카드와 같다(R-28 유지). 다른 카드는 그대로다.

```
+-- ImageSlotCard hair (fixed 280px high) --+
| h3 title (1 line, ...)          [badge]   |
| p desc (2 lines fixed, ..., title=full)   |
| +-- preview 106px (checkerboard) -----+   |
| |  img  or  emptyOptional             |   |
| |  [card error strip, only on error]  |   |
| +-------------------------------------+   |
| [changeImage (filled, full row)]          |
| [clearImage (line)] [emptyImage (line)]   |
+-------------------------------------------+
```

높이 합산: 1 + 16 + 20 + 8 + 32 + 8 + **106** + 8 + **64**(30 + 4 + 30) + 16 + 1 = **280px**.

3개 국어 폭 검산(가장 좁은 칸 = 안쪽 폭 168px, 버튼 글자 12px, 좌우 여백 10+10):

| 조합 | 한 줄 3개(참고 — 채택 안 함) | 채택: 아래 줄 2개(칸당 (168 − 8) / 2 = 80px) |
|---|---|---|
| ko 「이미지 변경」(≈83)·「기본값」(≈56)·「비우기」(≈56) | 83 + 56 + 56 + 간격 16 = 211 > 168 — 넘침 | 「기본값」 56 ≤ 80 · 「비우기」 56 ≤ 80 |
| ja 「画像を変更」(≈80)·「リセット」(≈68)·「削除」(≈44) | 80 + 68 + 44 + 16 = 208 > 168 — 넘침 | 68 ≤ 80 · 44 ≤ 80 |
| en 「Change image」(≈92)·「Reset」(≈52)·「Clear」(≈50) | 92 + 52 + 50 + 16 = 210 > 168 — 넘침 | 52 ≤ 80 · 50 ≤ 80 |

윗줄 「이미지 변경」은 168px 전체라 세 언어 모두 들어간다. 그래도 넘치면 기존처럼 말줄임(`aria-label`이 전체 이름을 가짐).

### 11.3 컴포넌트·순수 모듈 변경 (R-35)

| 대상 | 변경 |
|---|---|
| `imageSlots.ts` | 상수 `export const EMPTYABLE_SLOT_KEYS: readonly string[] = ['hair']`(R-35 — 「뒷머리 카드에만」). `SlotCardSpec`에 필드 2개 추가: `emptyable: boolean`(= `EMPTYABLE_SLOT_KEYS.includes(key)`), `canEmpty: boolean`(= `emptyable && entry !== undefined`). `slotCard`가 채운다. `type: 'add'` 카드에는 없음. 다른 필드·`buildSlotGroups` 순서 불변. 검증 예 §3(CR-038 줄) |
| `ImageSlotCard` props | 선택 props 2개 추가: `canEmpty?: boolean`(기본 `false`), `onEmpty?: (trigger: HTMLButtonElement, changeButton: HTMLButtonElement \| null) => void`. **`onEmpty`가 있을 때만** 셋째 버튼을 그린다(= 뒷머리 카드). 새 ref `changeRef = useRef<HTMLButtonElement \| null>(null)`을 「이미지 변경」 버튼에 단다 |
| `ImageSlotCard` 렌더 | `emptyable = onEmpty !== undefined`. `<article className={emptyable ? `${card} ${cardEmptyable}` : card} …>`. 버튼 줄 `<div className={emptyable ? actions2 : actions}>` 안 순서 = 「이미지 변경」(`ref={changeRef}`, 기존 그대로) → 「기본값」(기존 그대로 — `hair`는 `resetKind` restore라 aria-label `restoreImageAria`) → (emptyable일 때) `<button type="button" className=outline aria-label={format(t.emptyImageAria, { name: title })} disabled={disabled \|\| !canEmpty} onClick={e => onEmpty(e.currentTarget, changeRef.current)}>{t.emptyImage}</button>`. `title` 툴팁 없음 |
| `ImageSlotCard.module.css` | `.cardEmptyable .preview { height: 106px; flex: 0 0 106px }` · `.actions2 { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 30px 30px; gap: 4px var(--st-gap-sm); height: 64px; flex: 0 0 64px; margin-top: auto }` · `.actions2 .primary { grid-column: 1 / -1 }` · `.actions2 .outline { min-width: 0; overflow: hidden; text-overflow: ellipsis }`(격자 칸을 채움 — 기본 `justify-items: stretch`). 새 색 없음 |
| `ImagesTab` 렌더 3′′ | `ImageSlotCard`에 `canEmpty={spec.canEmpty}`, `onEmpty={spec.emptyable ? (tr, back) => onRequestEmpty(spec, tr, back) : undefined}` 추가. 나머지 props 그대로 |
| `ImagesTab` 상태 `confirm` | `ConfirmTarget`에 선택 필드 `focusAfter?: HTMLButtonElement \| null` 추가(초기값 없음 = `undefined`). 기존 `setConfirm` 호출은 그대로 |
| 공용화 | 없음(뒷머리 전용). `ConfirmDialog.tsx` 변경 없음 |

### 11.4 기능 (R-35)

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `onRequestEmpty` (신규, `ImagesTab`) | `(spec: SlotCardSpec, trigger: HTMLButtonElement, changeButton: HTMLButtonElement \| null) => void` | `slotBusy !== null \|\| !spec.canEmpty`이면 무시 → `setConfirm({ slot: spec.slot, key: spec.key, name: cardTitle(spec), trigger, resetKind: 'clear', focusAfter: changeButton })`. 확인창 문구는 §6 4′ 표의 `'clear'` 행(`confirmClearTitle`·`confirmClearMessage`(`{name}` = 뒷머리)·`confirmClearOk`·`confirmCancel`), 확정은 기존 `onConfirmReset` → `onConfirmClear` | 없음 | R-35 |
| `onConfirmClear` (개정 1곳) | 그대로 | `pendingFocusRef.current = c.trigger` → **`pendingFocusRef.current = c.focusAfter ?? c.trigger`**. 비운 뒤 「비우기」는 비활성(포커스 불가)이 되므로 같은 카드 「이미지 변경」으로 돌린다. `focusAfter`가 없는 기존 비우기(`resetKind` clear 칸)는 동작 불변. 호출은 `removeAsset(c.slot)` 1회(`restoreDefaultAsset` 0회) | 기존 그대로(reject → 그 카드 오류 띠) | R-35, R-25, R-32 |
| `onCancelReset` | 그대로 | 취소·Esc → `c.trigger.focus()` = 「비우기」 버튼(아직 활성)으로 복귀. 호출 없음 | 없음 | R-35 |

- 비운 뒤 core는 다시 채우지 않는다 — 시딩은 매니페스트가 비어 있고 슬롯 파일이 없을 때만(확정사항 §6 CR-035 결정 줄). ui 판정 없음.
- 펜 손·R-30 분기와 무관(`isFirstPenUp`은 `pen_up`만 봄).

### 11.5 파이프라인·confirm (R-35)

| # | 흐름 | 정상 | 오류 |
|---|---|---|---|
| I-11 | 뒷머리 비우기 | 「비우기」(뒷머리 등록돼 있고 `slotBusy` 없음) → 확인 대화상자(`confirmClear*`, `{name}` = `slots.hair.title`, 포커스 「취소」) → 「지우기」 → 모든 카드 버튼 비활성 → `removeAsset('hair')` 1회 → 카드 오류 지움 → `assets://changed`로 빈 미리보기(`emptyOptional`), 「비우기」 비활성·「기본값」 활성 → 포커스는 뒷머리 카드 「이미지 변경」 | 「취소」·Esc → 호출 없음, 포커스 「비우기」. 실패(`asset.not_found`·`asset.io`·`asset.manifest`) → 뒷머리 카드 오류 띠(`errorText`), 그림 그대로 |
| I-3R(뒷머리) | 뒷머리 「기본값」 | I-3R 그대로(`restoreDefaultAsset('hair')`) — 빈 칸이어도 활성 | I-3R 그대로 |

| 조작 | confirm | 문구 |
|---|---|---|
| 뒷머리 「비우기」(CR-038) | **필수**(사용자 그림 또는 기본 뒷머리를 지움, danger, 2단추) | 기존 `confirmClearTitle`·`confirmClearMessage`(「되돌릴 수 없습니다」 명시)·`confirmClearOk`·`confirmCancel` — 새 확인창 문구 없음 |

### 11.6 접근성 (R-35)

- 포커스 순서(뒷머리 카드 안): 「이미지 변경」 → 「기본값」 → 「비우기」(DOM 순서 = 시각 순서: 윗줄 → 아랫줄 왼쪽 → 오른쪽). 비활성 「비우기」는 건너뜀.
- 「비우기」 aria-label = `emptyImageAria`(ko 「뒷머리 그림 비우기」). 보이는 글자 = `emptyImage`. 같은 문구 버튼이 다른 카드에 없으므로 추가 구분 불필요.
- 확인창·오류 띠·`slotBusy` 비활성 규칙은 §8 그대로.

### 11.7 파일 크기

`ImageSlotCard.tsx` +약 10줄, `ImagesTab.tsx` +약 10줄(`onRequestEmpty`·props 2개·`focusAfter` 한 줄), `imageSlots.ts` +약 5줄. `ImagesTab.tsx`가 400줄을 넘으면 ui-implementer는 멈추고 보고한다(분리 설계는 ui-designer 몫).

## 12. 「타자 입력 1」 비우기 (CR-043, R-41)

비유: 뒷머리 칸에 달린 「비우기」 손잡이를 「타자 입력 1」 칸에도 똑같이 단다. 다만 뒤 칸(타자 입력 2 이상)이 차 있으면 앞 칸 손잡이는 잠가 둔다 — 여러 장 칸은 늘 뒤에서부터 비우는 규칙과 같다.

**대체 범위**: §3.3의 「비우기 버튼 없음 … `kb_down_0`을 비우는 길은 여전히 없다」 문장, §3 CR-038 줄(102행)의 「`emptyable` = `hair`인 카드만 true」, §11.3 `EMPTYABLE_SLOT_KEYS = ['hair']`·「뒷머리 전용」, §11.6 「같은 문구 버튼이 다른 카드에 없으므로」를 이 절이 대체한다. 그 밖의 §11 규칙(레이아웃·props·렌더·CSS·`onRequestEmpty`·`onConfirmClear` `focusAfter`·confirm)은 **그대로 재사용**한다.

### 12.1 레이아웃 (확정 — §11.2 재사용)

`kb_down_0` 카드는 뒷머리 카드와 같은 양식이다: 버튼 두 줄(위 「이미지 변경」 전체 폭 / 아래 「기본값」·「비우기」 반반), 미리보기 **106px**, 카드 바깥 280px 불변. §11.2 ASCII·높이 합산(280px)·3개 국어 폭 검산을 그대로 따른다(제목만 `slots.kb_down.title` 「타자 입력 1」). 키보드 그룹의 다른 카드(`kb_up`·`kb_down_1+`·추가 카드·`idle`·`rest`·`key_*`)는 한 줄 버튼·미리보기 140px 그대로.

### 12.2 순수 모듈 (`imageSlots.ts`)

| 대상 | 변경 |
|---|---|
| `EMPTYABLE_SLOT_KEYS` | `['hair']` → **`['hair', 'kb_down_0']`**(`slotKey({ kind: 'kb_down', index: 0 })` = `'kb_down_0'`). **(CR-044 확정값) `['kb_down_0']`** — `hair` 제외(§13) |
| `canEmpty` 식 | `emptyable && entry !== undefined` → **`emptyable && entry !== undefined && !laterFrameExists`**. `laterFrameExists` = `frames !== null && typeof slot === 'object' && slot.index + 1 < frames`(`frames` = `slotCard`의 넷째 인자, 키보드 누름 카드에는 `frameCount(manifest, 'kb_down')` = 등록된 가장 큰 index + 1). `hair`는 `frames === null`이라 식이 옛 값과 같다 |
| `emptyable` | 식 불변(`EMPTYABLE_SLOT_KEYS.includes(key)`) — `kb_down_0` 카드는 등록 여부와 무관하게 `true`(버튼은 항상 보이고 활성만 바뀜) |
| `resetKind`·`canReset`·`required` | 불변(`kb_down_0` = `restore`·`canReset` true·`required` false(§3.3)) |

**`kb_down_1` 이상이 등록돼 있을 때(확정 — 비활성)**: `kb_down_0`의 「비우기」는 **비활성**이다(`canEmpty` false). 이유: 여러 장 슬롯은 등록된 마지막 장만 비울 수 있다(§3 `clear` 칸 규칙 `lastOnlyBlocked`와 같은 방향). 사용자는 뒤 장(`kb_down_1+`, `resetKind` clear)을 「기본값」(= 비우기)으로 마지막 장부터 비운 뒤 `kb_down_0`을 비운다. 가운데가 빈 번호(예: 0 없음·1 있음)를 만들지 않는다.

검증 예:

| 매니페스트의 `kb_down` | `kb_down_0` `emptyable` / `canEmpty` | 비고 |
|---|---|---|
| 없음 | true / **false** | 빈 칸 — 비울 것 없음 |
| `kb_down_0`만 | true / **true** | |
| `kb_down_0`·`kb_down_1` | true / **false** | 뒤 장 있음 → 비활성 |
| `kb_down_1`만(옛 설치 등, 0 없음) | true / false | 0이 비어 있음 |
| `hair` 카드(참고) | ~~§11 그대로~~ **(CR-044)** false / false | 목록에 없음(§13) |

`kb_down_1+` 카드·추가 카드는 `emptyable` false(목록에 없음) — 기존 「기본값」(clear·마지막 장만) 그대로.

### 12.3 컴포넌트·기능·파이프라인

- `ImageSlotCard`·`ImagesTab`·`ConfirmDialog` **코드 변경 없음** — `onEmpty`는 `spec.emptyable`이면 넘기므로(§11.3 렌더 3′′) `kb_down_0` 카드에 자동으로 셋째 버튼·`.cardEmptyable`·`.actions2`가 붙는다. `onRequestEmpty`는 `!spec.canEmpty`면 무시(§11.4) — 비활성 규칙이 두 번 걸린다.
- 파이프라인 I-12(타자 입력 1 비우기): 「비우기」(`kb_down_0` 등록·뒤 장 없음·`slotBusy` 없음) → 확인 대화상자(기존 `confirmClear*`, `{name}` = 「타자 입력 1」, 포커스 「취소」) → 「지우기」 → 모든 카드 버튼 비활성 → `removeAsset({ kind: 'kb_down', index: 0 })` 1회(`restoreDefaultAsset` 0회) → `assets://changed`로 빈 미리보기(`emptyOptional` — 필수 아님 §3.3), 「비우기」 비활성·「기본값」(복원) 활성 → 포커스는 같은 카드 「이미지 변경」(`focusAfter`). 취소·Esc → 호출 없음, 포커스 「비우기」. 실패(`asset.not_found`·`asset.io`·`asset.manifest`) → 그 카드 오류 띠, 그림 그대로. confirm 필수(파괴 조작, danger) — 새 확인창 문구 없음.
- 비운 뒤 core는 다시 채우지 않는다(§11.4와 같음). 오버레이는 `kb_down`이 없으면 키보드 모드에서도 `kb_up` 그대로(overlay `design.md` §10.13, R-32).
- 비운 뒤 키보드 그룹 = 빈 매니페스트와 같은 구성(`kb_down_0` 빈 카드, 추가 카드 없음 — §3 알고리즘 불변). 다시 넣으려면 「이미지 변경」 또는 「기본값」(복원).
- 계약: 기존 `remove_asset`(`removeAsset(slot)`) — 새 command·event·에러 코드 없음.

### 12.4 문구·접근성

- 새 문구 키 없음. 「비우기」 aria-label = 기존 `emptyImageAria`에 `{name}` = `slots.kb_down.title`(`{n}` = 1) → ko 「타자 입력 1 그림 비우기」 / ja 「押下 1の画像を削除」 / en 「Clear image: Press 1」(`design/i18n.md` §4.8·§4.4 CR-043). 뒷머리 「비우기」와 이름이 달라 구분된다. (CR-044) 뒷머리 「비우기」가 없어져 이 버튼이 화면의 유일한 「비우기」다.
- 포커스 순서(카드 안): 「이미지 변경」 → 「기본값」 → 「비우기」(비활성이면 건너뜀). 비활성 이유는 따로 알리지 않는다(뒤 장 카드가 같은 그룹에 보임 — `lastOnlyBlocked` 카드와 같은 처리).

### 12.5 파일 크기·예정 TC

- `imageSlots.ts` 약 +3줄(상수 값 1, `canEmpty` 식). TSX 변경 없음.
- 예정 TC(ui-test-designer): ① `slotCard` — §12.2 검증 예 4행(`kb_down_0` `emptyable`/`canEmpty`), `hair` 회귀 ② `EMPTYABLE_SLOT_KEYS` 값 ③ `ImagesTab` 렌더 — `kb_down_0` 카드에 「비우기」 버튼·aria-label 「타자 입력 1 그림 비우기」, `kb_down_1` 등록 시 비활성, 다른 키보드 카드엔 없음 ④ I-12 흐름 — 확인 → `removeAsset({kind:'kb_down',index:0})` 1회·`restoreDefaultAsset` 0회·포커스 「이미지 변경」 / 취소·실패 분기 ⑤ 카드 고정 치수(미리보기 106px·두 줄 버튼) — `kb_down_0` 카드.

## 13. 배포용 기본 세트 2차 교체 (CR-044, R-36 · R-34 · R-35 폐기)

비유: 견본 상자에서 뒷머리 견본을 다시 뺐다. 견본이 없는 칸은 「견본으로 되돌리기」가 곧 「비우기」이므로, 뒷머리 칸에 따로 달았던 지우개 단추도 뗀다. 지우개는 「타자 입력 1」 칸에만 남는다.

- 계약: contract **v0.20**(`src/bridge/types.ts` 반영됨, core 반영 대기) — `DEFAULT_ASSET_SLOTS` **6개**(`kb_up`·`kb_down_0`·`background`·`mouse_base`·`pen_up`·`pen_down_0`), `hasBuiltinDefault('hair') === false`, `DEFAULT_MOUSE_SETTINGS` shoulder (582,484)·partPos (411,464)·penPos (372,476)·penMode true·area 불변. 새 command·event·에러 코드·문구 키 없음.
- 요구: R-36(CR-044 부분 대체 — 6장), R-34(원문 「내장 기본 없음 → 기본값=비우기」 다시 유효), R-35 **폐기**, R-41(버튼은 `kb_down_0`만), R-32(기본 없는 칸에 `hair` 포함).

### 13.1 순수 모듈 (`imageSlots.ts`) — 코드 변경 1곳

| 대상 | CR-043 설계 | CR-044 |
|---|---|---|
| `EMPTYABLE_SLOT_KEYS` | `['hair', 'kb_down_0']` | **`['kb_down_0']`** |
| `resetKind`(`hair`) | `restore` | **`clear`** — `hasBuiltinDefault`(bridge)가 판정하므로 코드 변경 없음 |
| `canEmpty` 식·`SlotCardSpec` 필드·`buildSlotGroups` 순서 | §12.2 | 불변 |

검증 예(§3·§12.2 대체분):

| 매니페스트 | `hair` `resetKind` / `canReset` / `emptyable` / `canEmpty` | 그 밖 |
|---|---|---|
| 빈 매니페스트 | `clear` / **false** / false / false | 복원 칸 = `background`·`kb_up`·`kb_down_0`·`mouse_base`·`pen_up`·`pen_down_0` 6개(`restore`·`canReset` true) |
| `hair`만 등록 | `clear` / **true** / false / false | — |
| `kb_down_0`만 등록 | (빈 칸과 같음) | `kb_down_0` `emptyable` true·`canEmpty` true(§12.2 그대로) |

### 13.2 렌더·파이프라인·접근성

- **뒷머리 카드** = §3.1 CR-037 원래 양식: 한 줄 버튼 「이미지 변경」·「기본값」, 미리보기 140px, `.cardEmptyable`·`.actions2` 없음(`onEmpty`는 `spec.emptyable`일 때만 넘기므로 자동). 「기본값」 = 비우기 확인창(`confirmClearTitle`·`confirmClearMessage` `{name}` = 뒷머리·`confirmClearOk`·`confirmCancel`, 포커스 「취소」, danger) → `removeAsset('hair')` 1회·`restoreDefaultAsset` 0회(I-3). 비어 있으면 「기본값」 비활성. 포커스는 누른 「기본값」으로 돌아간다(`focusAfter` 없음 — 기존 clear 칸 규칙).
- **폐기되는 흐름**: I-11(뒷머리 「비우기」), I-3R(뒷머리 복원). `restoreDefaultAsset('hair')`는 화면에서 부르지 않는다(core가 아직 성공을 돌려줘도 무관 — 화면은 `hasBuiltinDefault`만 본다).
- **첫 실행**(§10.1·§11.1 표 대체): 6칸(`background`·`kb_up`·`kb_down_0`·`mouse_base`·`pen_up`·`pen_down_0`)에 그림, `hair`와 나머지는 빈 미리보기(`emptyOptional`). 필수 배지 2칸(`kb_up`·`mouse_base`)은 채워져 `emptyRequired` 없음.
- **§10.7 다운로드 설명**: `format(t.downloadDefaultsDesc, { n: DEFAULT_ASSET_SLOTS.length })` → n = **6**(코드 불변). 결과 줄 `exportDone`의 수는 core `written` 수 그대로(core 반영 전에는 `hair.png` 포함 7이 올 수 있다 — 화면은 받은 값 표시, 판정 없음).
- **「어깨축·손 위치」 탭**: 리셋 기대값은 `DEFAULT_MOUSE_SETTINGS`(v0.20) 그대로 전송 — 코드 불변(`design.md` §5.2 `onReset`, 이 문서 §9.6). `hair` 미리보기 겹침(R-34)은 등록돼 있을 때만 그대로.
- **접근성**: 「뒷머리 그림 비우기」 aria-label 사용처 없음. `emptyImage`·`emptyImageAria` 키는 `kb_down_0` 카드가 계속 쓰므로 유지(`design/i18n.md` §4.8 사용처만 줄어듦).

### 13.3 파일 크기·예정 TC

- `imageSlots.ts` 값 1곳(`'hair', ` 삭제). TSX·CSS·문구·계약 호출 변경 없음.
- 예정 TC(ui-test-designer): ① `EMPTYABLE_SLOT_KEYS` = `['kb_down_0']` ② `slotCard` — §13.1 검증 예 3행, `DEFAULT_ASSET_SLOTS.length` 6 ③ 뒷머리 카드 렌더 — 「비우기」 버튼 없음·버튼 2개·미리보기 140px, 빈 칸 「기본값」 비활성 ④ 뒷머리 「기본값」 → 비우기 확인창 → `removeAsset('hair')` 1회·`restoreDefaultAsset` 0회 ⑤ 회귀: `kb_down_0` 「비우기」(§12.5) 불변. 폐기 대상: R-35 전용 TC(뒷머리 「비우기」 렌더·I-11·복원) · S-18 · TC-FLOW-19.

## 14. 뽀모도 인물·말풍선 카드 (CR-045, R-42)

설계 실체는 `design/timer-tab.md` §13이다(여기에 다시 적지 않는다). 이 문서에서 대체되는 곳:

| 대상 | 대체 |
|---|---|
| §1 ASCII `[card background] [card hair]` 줄 | `[card background] [card hair] [card pomo_char] [card pomo_bubble]` — 배경 그룹 4장(기본 창 3칸이면 둘째 줄로 넘어감) |
| §3 `buildSlotGroups` ① | `background` → `hair` → `pomo_char`(msg `'pomo_char'`, `frames` `null`) → `pomo_bubble`(msg `'pomo_bubble'`, `frames` `null`) |
| §3 검증 예 「배경 그룹 = 2장」 | 4장. 새 두 칸 = `required` false · `resetKind` `clear`(`hasBuiltinDefault` false) · `canReset = entry !== undefined` · `emptyable` false. 필수 배지 총 2(불변) |
| §7 I-2·I-3 | 그대로 적용 — 이미지 변경 `importAsset('pomo_char' \| 'pomo_bubble', path)`, 「기본값」 = 비우기 확인창(`{name}` = `slots.pomo_*.title`) → `removeAsset(slot)` |
| 탭 맨 위 안내 `imagesNote` | 문구에 뽀모도 추가(`design/i18n.md` §4.3 CR-045 개정) |

새 컴포넌트·상태·function 없음. `EMPTYABLE_SLOT_KEYS`는 `['kb_down_0']` 그대로.

## 15. 배포용 기본 세트 3차 (CR-053, R-36 · R-34 · R-35 · R-41 · R-42)

비유: 견본 상자에 뒷머리·뽀모도 인물 견본이 새로 들어오고, 「타자 입력 1」 견본은 빠졌다. 견본이 생긴 두 칸은 「견본으로 되돌리기」와 「지우개」가 다른 일이 되므로 지우개를 단다. 견본이 없어진 「타자 입력 1」은 「되돌리기」가 곧 지우개라 따로 단 지우개를 뗀다.

- 계약: contract **v0.24** — `DEFAULT_ASSET_SLOTS` **7개**(`kb_up`·`background`·`hair`·`pomo_char`·`mouse_base`·`pen_up`·`pen_down_0` — `kb_down_0` 제외), `DEFAULT_TIMER_SETTINGS` `textPos` (142,458)·`rotation` 9(`design/timer-tab.md` §3 상수 행 — **CR-058·CR-059(2026-09-28, contract v0.27)로 (268,402)·7·음량 44로 다시 바뀜**, 현재값은 그 상수 행이 정본). 새 command·event·에러 코드·문구 키 없음.
- 이 절이 대체하는 곳: §12(「타자 입력 1」 셋째 버튼) 전체, §13.1 `EMPTYABLE_SLOT_KEYS = ['kb_down_0']`·`hair` `clear`, §13.2 뒷머리 카드 버튼 2개·첫 실행 6칸·다운로드 n = 6, §14 「`pomo_char` `resetKind` `clear`·`emptyable` false」. `pomo_bubble`은 §14 그대로(기본 없음, 「기본값」 = 비우기).

### 15.1 순수 모듈 (`imageSlots.ts`) — 값 1곳

| 대상 | CR-044/045 | CR-053 |
|---|---|---|
| `EMPTYABLE_SLOT_KEYS` | `['kb_down_0']` | **`['hair', 'pomo_char']`** |
| `resetKind`(`hair`·`pomo_char`) | `clear` | **`restore`** — `hasBuiltinDefault`(bridge)가 판정, 코드 변경 없음 |
| `resetKind`(`kb_down_0`) | `restore` | **`clear`** — 옛 비우기 칸 규칙(등록된 마지막 장만 `canReset`, 가운데 장 `lastOnlyBlocked`) |
| `canEmpty` 식·`SlotCardSpec` 필드·`buildSlotGroups` 순서 | §12.2 | 불변(`laterFrameExists` 조건은 현재 비우기 칸이 모두 단일 슬롯이라 걸리지 않음 — 방어 규칙) |

검증 예:

| 매니페스트 | `hair`·`pomo_char` `resetKind` / `canReset` / `emptyable` / `canEmpty` | `kb_down_0` |
|---|---|---|
| 빈 매니페스트 | `restore` / true / true / false | `clear` / `canReset` false / `emptyable` false |
| 두 칸 등록 | `restore` / true / true / **true** | — |
| `kb_down_0`만 등록 | (빈 칸과 같음) | `canReset` true(마지막 장) |
| `kb_down_0`·`kb_down_1` 등록 | — | `kb_down_0` `canReset` false·`lastOnlyBlocked` true, `kb_down_1` `canReset` true |

### 15.2 렌더·파이프라인·접근성

- **뒷머리·뽀모도 인물 카드** = §11.2 셋째 버튼 양식(`.cardEmptyable`·`.actions2`, `onEmpty`는 `spec.emptyable`일 때만 넘김): 「이미지 변경」·「기본값」·「비우기」. 「기본값」 = 복원 확인창 → `restoreDefaultAsset(slot)` 1회(I-3R, 빈 칸이어도 활성). 「비우기」 = 비우기 확인창(`{name}` = 카드 제목) → `removeAsset(slot)` 1회·`restoreDefaultAsset` 0회(I-11), 등록돼 있을 때만 활성, 응답 뒤 포커스 = 같은 카드 「이미지 변경」(`focusAfter`).
- **「타자 입력 1」 카드**: 버튼 2개(「이미지 변경」·「기본값」). 「기본값」 = 비우기 확인창 → `removeAsset({kind:'kb_down',index:0})`(I-3). 셋째 버튼 없음 — 같은 `removeAsset`·같은 확인창·같은 활성 조건이 두 버튼에 겹쳐 하나로 정리했다(판단 근거: CR 대장 CR-053).
- **첫 실행**: 7칸(`background`·`hair`·`pomo_char`·`kb_up`·`mouse_base`·`pen_up`·`pen_down_0`)에 그림. `kb_down_0`은 빈 미리보기(`emptyOptional`) — 추가 카드 없음.
- **다운로드 설명**: `format(t.downloadDefaultsDesc, { n: DEFAULT_ASSET_SLOTS.length })` → n = **7**(코드·문구 불변, ko/ja/en 사전 `{n}` 그대로).
- **접근성**: `emptyImageAria`(「{name} 그림 비우기」) 사용처 = 뒷머리·뽀모도 인물 카드. 「타자 입력 1 그림 비우기」 aria-label 사용처 없음.

### 15.3 파일 크기·TC

- `imageSlots.ts` 값 1곳 + 주석. TSX·CSS·문구·계약 호출 변경 없음.
- TC: settings `test/scenarios.md` 「CR-053 개정」 절(변경 대기열 Q-05).
