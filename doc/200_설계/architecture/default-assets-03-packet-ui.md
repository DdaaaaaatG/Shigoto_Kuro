# default-assets 인계 패킷 — ui

- 받는 세션: `claude --agent ui-manager` (작업 모드: **보강**, 화면 = `src/settings/`)
- 전반 설계: `doc/200_설계/architecture/default-assets-02-design.md`. 이 패킷과 어긋나면 02-design이 맞다.
- 전략: `ui-design-strategy`, `.claude/skills/tsx-rules.md`·`ts-rules.md`, `change-request-tracking`(CR 대장).
- 화면 문서 4종은 소유 에이전트가 고친다(requirements·design = ui-designer, scenarios = ui-test-designer, manual = ui-manual-writer).

## 선행 조건

- **bridge 완료 마커**: contract v0.16이고, `yarn tsc --noEmit`·`yarn test --run`이 통과한다. `src/bridge`에서 다음을 import할 수 있다.
  - 래퍼: `restoreDefaultAsset`·`exportDefaultAssets`·`pickFolder`
  - 상수: `hasBuiltinDefault`·`DEFAULT_ASSET_SLOTS`
  - 타입: `ExportReport`·`ExportFailure`
  - 에러 코드: `asset.no_default`·`asset.export_dir`
  - 기본값: `DEFAULT_MOUSE_SETTINGS.penPos = {x:380, y:496}`
- **사용자 결정 확정 (🔒 2026-09-24, 확정사항 §6 CR-035 결정 줄, 02-design §5)**
  - **U-1 = B — 비우기 없음.** 기본 그림이 있는 칸의 「기본값」은 **복원만** 한다.
    - 확인창은 기존과 같은 2단추(확인·취소)다. 「비우기」 선택지나 3단추 확인창은 **만들지 않는다**.
    - 기본 그림이 없는 칸만 기존 비우기다.
  - **U-2 = B**: `penPos` 기본값이 (380,496)이다. 어깨축 탭 「기본값으로 리셋」(R-17, `onReset` = `{ ...DEFAULT_MOUSE_SETTINGS, penMode: 현재값 }`)의 기대값에 **penPos (380,496)**이 들어간다.
    - 화면 코드는 상수를 그대로 쓰므로 변경이 없다.
    - ui-test-designer가 R-17 관련 TC 기대값을 갱신한다.
  - U-5 = A: 충돌이 있으면 확인 후 전부 덮어쓴다.
  - U-7: 비어 있는 `pen_up`을 복원하면 R-30 확인창을 띄운다.
  - U-3: `penMode` 기본 false이므로 변경 없음.

## 요구ID

- 화면 요구(ui-designer가 번호를 확정한다. 제안은 **R-31~R-33**)
  - **R-31 (DA-02)**: 첫 실행이면 기본 세트 15장이 이미 등록돼 있다. 화면 동작 변경은 없고, 요구와 매뉴얼에 기록만 한다.
  - **R-32 (DA-03·DA-04·DA-08·DA-09)**: 카드 「기본값」의 새 의미.
    - 기본 그림이 있는 칸은 내장 기본 그림으로 **복원**하고, 그 칸은 비울 수 없다.
    - 기본 그림이 없는 칸은 기존대로 비운다(여러 장이면 마지막 장만).
    - R-25의 「기본값 = 슬롯 비우기」 문장을 이것으로 **대체**한다.
    - R-25·design의 **D-1 「필수 칸도 비울 수 있다(캔버스 크기 변경용)」은 폐기**한다. 필수 3칸이 모두 기본 그림이 있는 칸이기 때문이다. 다른 크기 캔버스로 옮기는 길이 이 버전에는 없고, 사용자가 이를 받아들였다(U-1 = B).
  - **R-33 (DA-05·DA-06)**: 「기본 이미지 다운로드」.
- 근거: 확정사항 §6 「기본 이미지 세트 (🔒 2026-09-24, CR-035)」와 결정 줄. CR 번호는 **CR-035**다(`src/settings/test/change-requests.md`에 엔트리를 만든다).

## 변경 대상 파일

| 파일 | 변경 | 소유 |
|---|---|---|
| `src/settings/requirements.md` | v1.10: R-31~R-33 신설, R-25 「기본값」 문장 대체 표기, D-1 폐기 주, §3 계약 행(v0.16) | ui-designer |
| `src/settings/design/images-tab.md` | §1 ASCII(다운로드 줄), §3 `slotCard` 규칙, §4·§5 상태·기능, §6 렌더, §7 I-3 개정·I-8~I-10 신설, confirm 표, §8 접근성, §5 끝의 「필수 슬롯도 비울 수 있다(D-1)」 문장 폐기 | ui-designer |
| `src/settings/design/i18n.md` | 새 문구 키(§5) 3개 국어 | ui-designer |
| `src/settings/design.md` | RTM 행 R-31~R-33, 변경 이력 CR-035, R-17 기대값(penPos) 주 | ui-designer |
| `src/settings/imageSlots.ts` | `slotCard` 규칙(§2) | ui-implementer |
| `src/settings/components/ImagesTab.tsx` (현 268줄) | 「기본값」 분기·복원 후처리(§3), 다운로드 패널 배치 | ui-implementer |
| `src/settings/components/ImageSlotCard.tsx` | `resetKind` prop(aria 문구 선택) | ui-implementer |
| `src/settings/components/DefaultsDownloadPanel.tsx` (**신규**, CSS는 `ImagesTab.module.css` 공유 가능) | 다운로드 흐름(§4) | ui-implementer |
| `src/settings/i18n/{types,ko,ja,en}.ts` | 새 키 + 에러 코드 문구 | ui-implementer |
| `src/settings/test/scenarios.md`·`*.test.tsx` | TC(§6) + R-17 리셋 기대값 갱신 | ui-test-designer |
| `src/settings/test/change-requests.md` | CR-035 엔트리 | (CR 규칙에 따른 작성자) |
| `src/settings/manual.md` | 첫 실행 기본 그림, 「기본값」의 새 의미(복원, 기본 그림이 있는 칸은 비울 수 없음), 다운로드 사용법 + 스크린샷 | ui-manual-writer |

- `ConfirmDialog.tsx`는 **변경하지 않는다**(3단추 없음).
- overlay(`src/overlay/**`)는 코드 변경이 없다. 첫 실행 기본 캐릭터는 기존 `getAssetManifest`/`assets://changed` 경로로 보인다.

## 1. 동작 요약

비유: 견본이 있는 칸의 「기본값」은 「견본으로 되돌리기」 단추고, 견본이 없는 칸에서는 예전처럼 「지우개」다. 견본이 있는 칸은 비워 둘 수 없다. 늘 사용자 그림이나 견본 중 하나가 들어 있다.

| 칸 | 「기본값」 활성 조건 | 확인창 | 호출 |
|---|---|---|---|
| 내장 기본 있음(15칸: `background`·`idle`·`rest`·`kb_up`·`kb_down_0`·`key_*` 7·`mouse_base`·`pen_up`·`pen_down_0`) | **항상**(그림이 있든 없든, 이미 기본 그림이어도. 여러 장 슬롯의 index 0은 뒤에 장이 있어도 제자리 교체라 활성) | 복원 확인(2단추: `confirmRestoreOk` · `confirmCancel`) | `restoreDefaultAsset(slot)` |
| 내장 기본 없음(`mouse_left/right`·`pen_key_*` 7·`kb_down_1+`·`pen_down_1+`) | 기존: 그림 있음 && (단일 또는 마지막 장) | 기존 비우기 확인(`confirmClear*`) | `removeAsset(slot)`(기존) |

- 복원이 `asset.canvas_mismatch`로 실패하면 기존 I-1과 같이 그 카드에 오류 줄이 뜨고 사용자 그림은 그대로 남는다. 다른 크기 캔버스 세트를 쓰는 사용자에게 해당한다.

## 2. `imageSlots.ts` — `slotCard` 규칙 (R-32)

```ts
export type ResetKind = 'restore' | 'clear'
export type SlotCardSpec = {
  // 기존 필드 유지: type, slot, key, msg, n, entry, required
  resetKind: ResetKind      // hasBuiltinDefault(slot) ? 'restore' : 'clear'
  canClear: boolean         // 「기본값」 단추 활성. restore → 항상 true / clear → 기존 규칙(entry && (단일 || 마지막 장))
  lastOnlyBlocked: boolean  // clear 이고 entry 있고 마지막 장이 아님(툴팁 clearLastOnly). restore 면 항상 false
}
```

- 필드 이름을 `canReset`으로 바꿀지는 ui-designer 재량이다. 의미는 「기본값 단추 활성」 하나다.
- `hasBuiltinDefault`는 bridge 상수를 그대로 쓴다. 목록을 화면에 다시 적지 않는다(`isRequiredSlot`과 같은 원칙).
- 검증 예(단위 테스트로 고정)
  - 빈 매니페스트: `background`는 restore·canClear true. `mouse_left`는 clear·canClear false.
  - `kb_down_0`, `kb_down_1`만 있음: `kb_down_0`은 restore·canClear true·lastOnlyBlocked false. `kb_down_1`은 clear·canClear true.
  - `kb_down_0`, `kb_down_1`, `kb_down_2`: `kb_down_1`은 clear·canClear false·lastOnlyBlocked true.
  - 기존 `buildSlotGroups` 예(빈 매니페스트 키보드 11장, `kb_up`·`kb_down_0`·`kb_down_1`이면 13장)는 카드 수·순서가 그대로다.

## 3. `ImagesTab` — 「기본값」 흐름 (R-32)

- `ConfirmTarget`에 `resetKind`를 더한다.
- `onRequestClear`(이름은 `onRequestReset`으로 바꿔도 된다)는 `slotBusy !== null || !spec.canClear`이면 무시한다.
- 확인창은 기존 `ConfirmDialog` 1개를 문구만 바꿔 쓴다.

| resetKind | title | message | confirm | cancel | 확정 시 |
|---|---|---|---|---|---|
| `restore` | `confirmRestoreTitle` | `confirmRestoreMessage`({name}) | `confirmRestoreOk` | `confirmCancel` | `onConfirmRestore` |
| `clear` | 기존 `confirmClearTitle` | 기존 `confirmClearMessage` | 기존 `confirmClearOk` | `confirmCancel` | 기존 `onConfirmClear` |

`onConfirmRestore`(신규, `onChangeImage`의 등록 뒤 처리와 같은 모양):

```
c = confirm → setConfirm(null) → before = manifest → setSlotBusy(c.key) → pendingFocusRef = c.trigger
try   next = await restoreDefaultAsset(c.slot) → setCardError(null)
      isFirstPenUp(c.slot, before, next) ? setPenDialog({ kind:'first', size: pen_up 크기 })   // U-7, R-30 재사용
                                         : await ensurePenPos(c.slot, next)
catch setCardError({ key: c.key, error: toBridgeError(e) })
finally setSlotBusy(null)
```

- 미리보기 교체는 `assets://changed`로만 한다(기존 규칙). 로컬에서 먼저 반영하지 않는다.
- `ImageSlotCard`: 새 prop `resetKind: ResetKind`.
  - `aria-label`은 `resetKind === 'restore' ? restoreImageAria : clearImageAria`로 고른다.
  - 보이는 글자는 두 경우 모두 `t.clearImage`(「기본값」)다.
- 복원도 사용자 그림을 지우는 파괴 조작이므로, 확인 단추는 기존 `tone='danger'`(기본값)를 그대로 쓴다.

## 4. `DefaultsDownloadPanel` — 기본 이미지 다운로드 (R-33)

- 위치: 이미지 설정 탭 맨 위, `p.note` 바로 아래 한 줄. 카드 격자 밖이라 R-28 카드 고정 높이와 무관하다.
- 모양: 설명 글(`downloadDefaultsDesc`) + 단추 `downloadDefaults`(outline) + 결과 줄. 세부 레이아웃은 ui-designer가 정한다.
- props: `{}`. 자기 상태만 쓴다. `slotBusy`와 무관하다(매니페스트를 바꾸지 않음).
- 상태

| 상태 | 타입 | 초기값 |
|---|---|---|
| `busy` | `boolean` | `false` |
| `conflict` | `{ dir: string; files: string[] } \| null` | `null` |
| `result` | `{ kind: 'done'; count: number } \| { kind: 'partial'; ok: number; failed: string[] } \| { kind: 'error'; error: BridgeError } \| null` | `null` |

- 흐름(U-5 = A)

| # | 흐름 | 정상 | 오류 |
|---|---|---|---|
| I-8 | 다운로드(충돌 없음) | 단추 → `dir = await pickFolder(t.pickFolderTitle)` → `null`(취소)이면 끝(호출 없음) → `busy` → `r = await exportDefaultAssets(dir, false)` → `r.conflicts.length === 0`이면 결과 줄 `exportDone`({n: r.written.length}), `role="status"` | reject → 결과 줄 `errorText(t, language, e)`(`asset.export_dir` 등), `role="alert"` |
| I-9 | 다운로드(충돌) | I-8에서 `r.written.length === 0 && r.conflicts.length > 0` → `conflict = { dir, files: r.conflicts }` → 확인창(`exportConflictTitle`, `exportConflictMessage`({n}), `exportConflictOk`, `confirmCancel`, danger, 기본 포커스 「취소」) → 확인 → `exportDefaultAssets(dir, true)`(**전부 덮어쓰기**) → I-8의 결과 규칙 | 취소·Esc → 아무것도 쓰지 않음, 결과 줄 없음, 포커스는 다운로드 단추로 |
| I-10 | 부분 실패 | 어느 호출이든 `r.failed.length > 0` → 결과 줄 `exportPartial`({ok: written 수, fail: failed 수, files: failed 파일명을 `, `로 이음}), `role="alert"` | — |

- `busy` 동안 다운로드 단추는 `disabled`와 `aria-busy`다. 확인창은 기존 `ConfirmDialog`(2단추)를 그대로 쓴다.
- 결과 줄은 다음 다운로드를 시작할 때 지운다.

## 5. 문구 키 (`design/i18n.md`에 3개 국어로. ko 제안, ja·en은 ui-designer가 작성)

| 키 | ko 제안 |
|---|---|
| `restoreImageAria` | `{name} 기본 그림으로 되돌리기` |
| `confirmRestoreTitle` | `기본 그림으로 되돌리기` |
| `confirmRestoreMessage` | `‘{name}’ 칸을 내장 기본 그림으로 되돌릴까요? 지금 그림은 지워지며 되돌릴 수 없습니다.` |
| `confirmRestoreOk` | `기본 그림으로` |
| `downloadDefaults` | `기본 이미지 다운로드` |
| `downloadDefaultsDesc` | `내장 기본 그림 15장을 원본 크기 그대로 폴더에 저장합니다. 따라 그리거나 고쳐 쓸 때 쓰세요.` |
| `pickFolderTitle` | `기본 이미지를 저장할 폴더 선택` |
| `exportConflictTitle` | `같은 이름의 파일이 있습니다` |
| `exportConflictMessage` | `이 폴더에 같은 이름의 파일이 {n}개 있습니다. 모두 덮어쓸까요? 덮어쓴 파일은 되돌릴 수 없습니다.` |
| `exportConflictOk` | `덮어쓰기` |
| `exportDone` | `기본 이미지 {n}장을 저장했습니다.` |
| `exportPartial` | `{ok}장 저장, {fail}장 실패: {files}` |
| 에러 `asset.no_default` | `이 칸에는 내장 기본 그림이 없습니다.` |
| 에러 `asset.export_dir` | `저장할 폴더를 찾을 수 없습니다.` |

- 기존 `clearImage`(「기본값」)·`confirmClear*`·`clearLastOnly`는 그대로 쓴다.
- 새 키는 `i18n/types.ts`에 먼저 추가해 3개 국어 누락을 타입으로 막는다.

## 6. 수용 기준

| 구분 | 기대 |
|---|---|
| 단위 `imageSlots` | §2 검증 예 4건 + 기존 `buildSlotGroups` 예 불변 |
| 복원 | `background` 카드(그림 있음)에서 「기본값」 → 확인창 title `confirmRestoreTitle`, **단추 2개** → 확인 → `restoreDefaultAsset('background')` 1회, `removeAsset` **0회** |
| 비우기 없음 (U-1 = B) | 기본 그림이 있는 15칸 중 어느 칸에서도 `removeAsset`이 불리는 경로가 없다(대표로 `kb_up`·`key_space`·`pen_up` 3칸 검증) |
| 가운데 kb_down_0 | `kb_down_0`, `kb_down_1`이 있을 때 kb_down_0 「기본값」이 활성이고, 확인하면 `restoreDefaultAsset({kind:'kb_down',index:0})` |
| 기본 없는 칸 | `mouse_left`(그림 있음) 「기본값」 → 기존 `confirmClear*` 확인창 → `removeAsset` |
| 빈 칸 복원 | 빈 `idle` 카드의 「기본값」 활성 → 복원 호출 |
| pen_up 복원 (U-7) | 빈 `pen_up` → 복원 성공(next에 pen_up 있음) → R-30 확인창(`penFirstTitle`) |
| 복원 실패 | `restoreDefaultAsset` reject(`asset.canvas_mismatch`) → 그 카드 오류 줄 |
| 리셋 기대값 (U-2 = B) | 어깨축 탭 「기본값으로 리셋」 → `setSettings` 인자 `mouse.penPos = {x:380, y:496}`, `penMode`는 현재값 유지 |
| 다운로드 취소 | `pickFolder` → null → `exportDefaultAssets` 0회 |
| 다운로드 정상 | `exportDefaultAssets(dir,false)` → `{written:15개, conflicts:[], failed:[]}` → `role=status`에 `exportDone`(15) |
| 다운로드 충돌 | 1차 `{written:[], conflicts:['kb_up.png']}` → 확인창 → 확인 → `exportDefaultAssets(dir,true)` 1회 / 취소 → 2차 호출 0회 |
| 부분 실패 | `failed:[{fileName:'kb_up.png',code:'asset.io'}]` → `role=alert`에 `exportPartial` |
| 에러 코드 문구 | ja·en에서 `asset.no_default`·`asset.export_dir`가 code 문구로 표시 |
| 접근성 | 확인창의 Tab 순환·Esc·포커스 복귀(기존 규칙), 다운로드 단추의 `aria-busy`, 결과 줄 role |
| 빌드 | `yarn test --run` PASS, `yarn tsc --noEmit`·`yarn build` exit 0, TSX 400줄 이하(ImagesTab 포함) |
| 화면 증거 | `/run-app` 스크린샷: ① 첫 실행(빈 앱 데이터)의 이미지 탭에 기본 그림 15장 ② 복원 확인창 ③ 다운로드 결과 줄. 경로는 `doc/300_검증/screenshots/{YYYYMMDD-HHMM}/` |

- ①의 첫 실행 확인은 **앱 데이터 폴더를 지우지 않고** 한다(파괴 명령 금지 훅). 실제 경로는 `%APPDATA%\com.kuro.keyviewer\`다. 방법은 두 가지다.
  - 임시 사용자 데이터 경로를 쓸 수 있는지 검토한다.
  - 기존 `assets/` 폴더를 사용자가 직접 옮긴 뒤 확인한다. 이 방법은 사용자 확인을 받은 경우에만 쓴다.

## 7. 하지 말 것

- 기본 그림이 있는 칸에 「비우기」 선택지·3단추 확인창·별도 비우기 단추를 만들지 않는다(U-1 = B).
- `invoke`·`listen`·`@tauri-apps/plugin-dialog`를 화면 코드에서 직접 부르지 않는다. `src/bridge` 래퍼만 쓴다.
- 내장 기본 목록을 화면에 다시 적지 않는다(`hasBuiltinDefault` 사용).
- 클라이언트에서 PNG를 검증하거나 파일 존재를 판정하지 않는다. core 결과만 표시한다.
- `src/bridge/**`, `src-tauri/**`, `capabilities`를 수정하지 않는다. 계약이 부족하면 멈추고 아키텍트 세션으로 되돌린다.
- 요구 밖 기능(「모든 그림 비우기」, 다운로드 폴더 기억, 진행률 표시 등)을 넣지 않는다.

## 완료 마커

- `src/settings/requirements.md` v1.10(R-31~R-33, D-1 폐기 주)이 있다.
- `design/images-tab.md`·`design/i18n.md`·`design.md` RTM에 CR-035가 반영돼 있다.
- CR 대장 CR-035가 「적용·검증」 상태다.
- 위 수용 기준의 실행 증거(테스트 출력·빌드 exit code·스크린샷 경로)가 있다.
- `manual.md`가 갱신됐다.
