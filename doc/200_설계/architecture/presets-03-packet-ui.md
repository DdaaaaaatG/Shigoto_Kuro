# presets 인계 패킷 — ui

- 받는 세션: `claude --agent ui-manager` (작업 모드: **보강** — 설정 창에 새 탭 추가)
- 전반 설계: `doc/200_설계/architecture/presets-02-design.md`. 이 패킷과 어긋나면 02-design이 맞다.
- 전략: `ui-design-strategy`, `.claude/skills/{tsx-rules,ts-rules,ui_design_concept}.md`, golden-principles(TSX·TS 400줄·함수 50줄). 화면은 `src/bridge` 래퍼만 호출한다(`invoke`·`listen` 직접 사용 금지).
- 파이프라인(권고): ui-designer(requirements·design·`design/presets-tab.md`·i18n 문구) → ui-design-checker → ui-test-designer → ui-test-checker·ui-test-conflict-checker → ui-implementer → ui-tester → ui-manual-writer. CR 대장 기록(`change-request-tracking`).

## 선행 조건

- **bridge 패킷 완료 마커**: 계약 v0.30, `src/bridge`에 래퍼 7개(`listPresets`·`savePreset`·`applyPreset`·`exportPreset`·`importPreset`·`renamePreset`·`deletePreset`)·타입 `PresetSummary`·`PresetProblem`·`PresetImportReport`·`PresetExportResult`·상수 `PRESET_NAME_MAX`, `lib.rs` 등록 완료(앱에서 호출 가능).
- 새 의존성 없음(날짜 표시는 브라우저 `Intl.DateTimeFormat`, 폴더 선택은 기존 `pickFolder`).

## 요구ID

PS-01·PS-02(표시)·PS-04·PS-05·PS-06·PS-07·PS-08·PS-09·PS-10(🔒 확정사항 §6). 화면 요구ID는 ui-designer가 `src/settings/requirements.md` R-57 다음부터 부여한다(권고: PS-01~PS-10 → R-58~R-67, 출처 열에 PS-xx). CR은 대장 마지막(CR-063) 다음 **CR-064**.

## 변경 대상 파일

| 파일 | 변경 |
|---|---|
| `src/settings/index.tsx` | `Tab`에 `'presets'`, `TAB_IDS` 다섯째(맨 끝), `TAB_KEY.presets = 'tabPresets'`, 패널 `<PresetsTab manifest={manifest} onError={onError} />`. 머리 주석의 「탭 4개」 갱신 |
| `src/settings/components/TabIcon.tsx` | `name`에 `'presets'`, 모양 = 겹친 카드 두 장(아래 §1) |
| `src/settings/components/PresetsTab.tsx` (**신규**) | 컨테이너 — 목록 상태·조회·확인창·상태 문구 |
| `src/settings/components/PresetSaveCard.tsx` (**신규**) | 위 카드 — 이름 입력·저장·가져오기·가져오기 문제 목록 |
| `src/settings/components/PresetCard.tsx` (**신규**) | 프리셋 한 장 — 이름·날짜·장수·알림음, 버튼 4, 인라인 이름 편집 |
| `src/settings/presetValues.ts` (**신규**, 순수) | `missingRequiredSlots`·`canSavePreset`·`formatSavedAt`·(필요하면) 문구 자리표시자 채우기 |
| `src/settings/i18n/{types,ko,ja,en}.ts` | 문구 키(§4)·`ErrorCode`·`ERROR_CODES` 12개 추가(27 → 39) |
| 스타일 | 기존 `SettingsCard`·`GeneralTab.module.css` 토큰 재사용 우선. 새 CSS 모듈이 필요하면 `PresetsTab.module.css` 하나 |
| 문서 | `src/settings/requirements.md`(R-58~), `design.md`(탭 목록·§7 bridge 사용표·RTM), **신규** `design/presets-tab.md`, `design/i18n.md`(§4.12 신설·§4.6 에러 12), `test/scenarios.md`, `test/change-requests.md`(CR-064), `manual.md`(ui-manual-writer) |
| 테스트 | `test/presetValues.test.ts`·`test/PresetsTab.test.tsx`·`test/PresetCard.test.tsx`(신규), `test/SettingsApp.test.tsx`(탭 5개)·`test/i18n.test.ts`(키 집합·ErrorCode 39) 갱신, bridge mock에 새 래퍼 추가 |

## 1. 화면 구성 (PS-09)

```
[사이드바]                 [내용]  h1 「프리셋」
  기본 설정                 (오류 줄 — 기존 Shell)
  이미지 설정               ┌ PresetSaveCard ─ 「현재 상태를 프리셋으로 저장」 ─────────────┐
  어깨축·손 위치            │ 설명 1~2줄(들어가는 것 / 안 들어가는 것)                        │
  타이머                    │ [이름 입력 (maxLength 50)] [저장]                               │
  프리셋  ← 다섯째(A-10)    │ (필수 그림 없으면) 이유 줄                                      │
                            │ ─────                                                           │
                            │ [폴더에서 가져오기]  설명 1줄                                   │
                            │ (가져오기 실패 시) 문제 목록: kb_up.png — 32bit RGBA PNG만 …    │
                            │ 상태 줄(role=status): 「고양이 A」 프리셋을 저장했습니다.       │
                            └─────────────────────────────────────────────────────────────────┘
                            ┌ 「저장한 프리셋」 ──────────────────────────────────────────────┐
                            │ PresetCard: 고양이 A                                            │
                            │   저장 2026. 9. 30. 오후 3:12 · 그림 8장 · 알림음 있음          │
                            │   [적용] [내보내기] [이름 바꾸기] [삭제]                        │
                            │ PresetCard: …                                                   │
                            │ (없으면) 저장한 프리셋이 없습니다.                              │
                            └─────────────────────────────────────────────────────────────────┘
```

- 목록 순서 = core 반환 순서 그대로(최근 저장이 위, U-4). ui는 다시 정렬하지 않는다.
- 「사용 중」 표시·선택 강조 없음(PS-10). 썸네일 없음(요구에 없음 — asset scope도 `assets/**`만).
- `TabIcon` `presets` 모양(24×24, stroke — 기존 규칙): `<rect x="8" y="3" width="13" height="13" rx="2" />` + `<path d="M16 21H5a2 2 0 0 1-2-2V8" />`(뒤 카드 테두리). ui-designer가 다듬어도 된다(코드로 그림, 라이브러리 없음).

## 2. 상태·흐름 (`PresetsTab`)

| 상태 | 타입 | 뜻 |
|---|---|---|
| `presets` | `PresetSummary[] \| null` | `null` = 첫 조회 전 |
| `pending` | `boolean` | 프리셋 command 하나가 진행 중 — **모든 프리셋 버튼 비활성**(재진입·겹침 방지, `aria-busy`). 다른 탭 조작은 막지 않는다(직렬화는 core 동기 command가 보장) |
| `status` | `string` | 마지막 성공 안내(role=status, aria-live polite) |
| `problems` | `PresetProblem[]` | 마지막 가져오기의 파일별 문제(성공·다른 조작 시작 시 비움) |
| `confirm` | `{ kind: 'apply' \| 'delete', preset: PresetSummary } \| null` | 확인창 |
| `renamingId`·`renameDraft` | `string \| null`·`string` | 인라인 이름 편집(A-11) — 한 번에 한 카드 |

- **조회**: 마운트 때 `listPresets()` 1회. 변경 command(저장·가져오기 성공·이름 바꾸기·삭제) 성공 뒤 다시 `listPresets()`. 적용·내보내기는 목록이 안 바뀌어 재조회하지 않는다. 이벤트 구독 없음(계약 — 새 이벤트 없음).
- **실패**: 모든 reject는 `onError(toBridgeError(e))`(기존 Shell 오류 줄). 성공하면 `onError(null)`.

| 동작 | 흐름 | 성공 안내(§4 키) |
|---|---|---|
| 저장 (PS-01·PS-08) | 버튼 활성 조건 `canSavePreset(name, manifest)` = 이름 trim 비어 있지 않음 **그리고** `missingRequiredSlots(manifest)`가 빔 **그리고** `!pending`. 필수 그림이 없으면 버튼 비활성 + 이유 줄 `presetSaveNeedsRequired`(항상 보임, 입력 여부와 무관). → `savePreset(name.trim())` → 입력 비우기 → 재조회 | `presetSaved` |
| 가져오기 (PS-06) | `pickFolder(t.pickPresetFolderTitle)` → `null`이면 끝 → `importPreset(dir)` → `report.preset === null`이면 `problems = report.problems`, 안내 `presetImportFailed` + 목록 **`{fileName} — {errors[code]}`**(errorText 규칙 재사용) → 아니면 재조회 | `presetImported` |
| 적용 (PS-04) | 카드 「적용」 → 확인창(`confirmPresetApply*`) → `applyPreset(id)`. 화면 값은 **기존 `settings://changed`·`assets://changed` 구독으로만** 바뀐다(낙관적 갱신 없음 — 전체 초기화와 같음) | `presetApplied` |
| 내보내기 (PS-05) | 카드 「내보내기」 → `pickFolder(t.pickExportFolderTitle)` → `null`이면 끝 → `exportPreset(id, dir)` → `result.folderName` 안내. `preset.export_exists`는 오류 줄(다른 폴더를 고르거나 이름을 바꾸라는 문구) | `presetExported` |
| 이름 바꾸기 (PS-07) | 카드 「이름 바꾸기」 → 이름 자리가 입력칸(현재 이름, maxLength 50, 자동 포커스) + 「저장」「취소」. Enter = 저장, Esc = 취소. 저장 비활성 = trim 빔 또는 pending → `renamePreset(id, draft.trim())` → 편집 종료 → 재조회 | (안내 없음 — 목록에 바로 보임) |
| 삭제 (PS-07) | 카드 「삭제」 → 확인창(`confirmPresetDelete*`) → `deletePreset(id)` → 재조회 | `presetDeleted` |

- 확인창은 기존 `ConfirmDialog` 재사용(적용·삭제만 — 🔒 PS-04·PS-07). 취소하면 포커스를 누른 버튼으로 되돌린다(`ResetAllCard` 방식).
- 이름 중복은 막지 않는다(PS-07). 빈 이름·50자 초과는 입력 단계에서 막고, core `preset.invalid_name`은 오류 줄로.
- `formatSavedAt(ms, language)` = `new Intl.DateTimeFormat(ko→'ko-KR' | ja→'ja-JP' | en→'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms))`. 테스트는 타임존에 기대지 않게 형식 존재·언어별 차이만 본다.
- `missingRequiredSlots(manifest)` = 기존 `REQUIRED_SLOTS`(`src/bridge/types.ts`) 중 `manifest.entries`에 `slotKey`가 없는 것. 새 필수 목록을 만들지 않는다.

## 3. 컴포넌트 경계

| 컴포넌트 | props | 책임 |
|---|---|---|
| `PresetsTab` | `{ manifest: AssetManifest; onError: (e: BridgeError \| null) => void }` | §2 상태 전부, 래퍼 호출, 확인창 |
| `PresetSaveCard` | `{ manifest; pending; status; problems; onSave(name); onImport() }` | 이름 입력(로컬 상태), 버튼 활성·이유 줄, 문제 목록 표시 |
| `PresetCard` | `{ preset; pending; renaming; renameDraft; onApply; onExport; onStartRename; onRenameDraft; onRenameSave; onRenameCancel; onDelete }` | 한 장 표시·버튼 4·인라인 편집 |

- 각 파일 400줄·함수 50줄 이하. 목록은 `<ul>`/`<li>`, 카드 버튼 `aria-label`에 프리셋 이름을 넣어 스크린리더가 어느 카드인지 알게 한다(예: 「적용: 고양이 A」 — 문구 조합 규칙은 ui-designer).
- `settings`는 받지 않는다(적용 결과는 다른 탭이 이벤트로 받는다). 언어는 `useLanguage()`.

## 4. 문구 (3개 국어 — ja·en은 **검수 필요** 초안)

자리표시자 `{name}`·`{date}`·`{count}`·`{folder}`. 현재 `Messages`에 함수형 키가 없으므로 문자열 + 치환(`presetValues.ts`의 작은 `fill(template, vars)` 또는 i18n.md가 정하는 기존 방식)으로 한다.

| 키 | ko | ja (검수 필요) | en (검수 필요) |
|---|---|---|---|
| `tabPresets` | 프리셋 | プリセット | Presets |
| `cardPresetSave` | 현재 상태를 프리셋으로 저장 | 現在の状態をプリセットとして保存 | Save current setup as a preset |
| `presetSaveDesc` | 지금 그림·알림음·배율·휴식 시간·어깨축·손 위치·타이머 설정을 한 벌로 저장합니다. 창 위치·언어·자동 실행·작업표시줄·위치 잠금은 들어가지 않습니다. | 現在の画像・通知音・倍率・休憩時間・肩軸・手の位置・タイマー設定をまとめて保存します。ウィンドウ位置・言語・自動起動・タスクバー・位置ロックは含まれません。 | Saves the current images, alarm sound, scale, rest time, shoulder/hand positions and timer settings as one set. Window position, language, autostart, taskbar and position lock are not included. |
| `presetNameLabel` | 프리셋 이름 | プリセット名 | Preset name |
| `presetNamePlaceholder` | 예: 고양이 A | 例: ねこ A | e.g. Cat A |
| `presetSave` | 저장 | 保存 | Save |
| `presetSaveNeedsRequired` | 키보드 기본 그림과 팔 그림이 있어야 저장할 수 있습니다. 「이미지 설정」에서 먼저 등록하세요. | キーボード基本画像と腕の画像がないと保存できません。先に「画像設定」で登録してください。 | A keyboard base image and an arm image are required. Add them in "Images" first. |
| `presetSaved` | 「{name}」 프리셋을 저장했습니다. | 「{name}」を保存しました。 | Saved preset "{name}". |
| `presetImport` | 폴더에서 가져오기 | フォルダーから読み込む | Import from folder |
| `presetImportDesc` | 내보낸 프리셋 폴더(preset.json이 들어 있는 폴더)를 고르세요. | 書き出したプリセットのフォルダー(preset.json があるフォルダー)を選んでください。 | Choose an exported preset folder (the one containing preset.json). |
| `presetImported` | 「{name}」 프리셋을 가져왔습니다. | 「{name}」を読み込みました。 | Imported preset "{name}". |
| `presetImportFailed` | 가져오지 못했습니다. 아래 파일을 고친 뒤 다시 가져오세요. | 読み込めませんでした。次のファイルを直してからもう一度読み込んでください。 | Import failed. Fix the files below and try again. |
| `pickPresetFolderTitle` | 가져올 프리셋 폴더 선택 | 読み込むプリセットフォルダーを選択 | Choose a preset folder to import |
| `pickExportFolderTitle` | 내보낼 위치 선택 | 書き出し先を選択 | Choose where to export |
| `cardPresetList` | 저장한 프리셋 | 保存したプリセット | Saved presets |
| `presetListEmpty` | 저장한 프리셋이 없습니다. | 保存したプリセットはありません。 | No saved presets. |
| `presetSavedAt` | 저장 {date} | 保存 {date} | Saved {date} |
| `presetImageCount` | 그림 {count}장 | 画像 {count}枚 | {count} images |
| `presetHasAlarm` | 알림음 있음 | 通知音あり | Alarm sound |
| `presetNoAlarm` | 알림음 없음 | 通知音なし | No alarm sound |
| `presetApply` | 적용 | 適用 | Apply |
| `presetExport` | 내보내기 | 書き出し | Export |
| `presetRename` | 이름 바꾸기 | 名前を変更 | Rename |
| `presetDelete` | 삭제 | 削除 | Delete |
| `presetRenameSave` | 저장 | 保存 | Save |
| `presetApplied` | 「{name}」 프리셋을 적용했습니다. | 「{name}」を適用しました。 | Applied preset "{name}". |
| `presetExported` | 「{folder}」 폴더로 내보냈습니다. | 「{folder}」フォルダーに書き出しました。 | Exported to folder "{folder}". |
| `presetDeleted` | 「{name}」 프리셋을 삭제했습니다. | 「{name}」を削除しました。 | Deleted preset "{name}". |
| `confirmPresetApplyTitle` | 프리셋 적용 | プリセットの適用 | Apply preset |
| `confirmPresetApplyMessage` | 지금 그림·알림음·설정이 「{name}」 프리셋의 것으로 모두 바뀝니다. 프리셋에 없는 그림 칸은 비워집니다. 지금 상태는 따로 남지 않으니, 남기려면 먼저 「현재 상태를 프리셋으로 저장」하세요. 창 위치·언어·자동 실행·작업표시줄·위치 잠금은 그대로입니다. | 現在の画像・通知音・設定がすべて「{name}」のものに置き換わります。プリセットにない画像の枠は空になります。現在の状態は自動では残りません。残すには先に「現在の状態をプリセットとして保存」してください。ウィンドウ位置・言語・自動起動・タスクバー・位置ロックはそのままです。 | Your current images, alarm sound and settings will all be replaced by "{name}". Image slots not in the preset will be cleared. The current setup is not backed up automatically — save it as a preset first if you want to keep it. Window position, language, autostart, taskbar and position lock stay as they are. |
| `confirmPresetApplyOk` | 적용 | 適用 | Apply |
| `confirmPresetDeleteTitle` | 프리셋 삭제 | プリセットの削除 | Delete preset |
| `confirmPresetDeleteMessage` | 「{name}」 프리셋을 삭제할까요? 되돌릴 수 없습니다. | 「{name}」を削除しますか?元に戻せません。 | Delete preset "{name}"? This cannot be undone. |
| `confirmPresetDeleteOk` | 삭제 | 削除 | Delete |

- 취소 버튼은 기존 `confirmCancel` 재사용.

**에러 문구 12개**(`errors` — `ErrorCode`·`ERROR_CODES`에 추가, `preset.forbidden`은 제외 — 계약 §6 `reset.forbidden` 선례):

| code | ko | ja (검수 필요) | en (검수 필요) |
|---|---|---|---|
| `preset.not_found` | 프리셋을 찾을 수 없습니다. 목록을 다시 확인하세요. | プリセットが見つかりません。 | Preset not found. |
| `preset.invalid_name` | 프리셋 이름은 1~50자로 입력하세요. | プリセット名は1〜50文字で入力してください。 | Enter a preset name of 1–50 characters. |
| `preset.missing_required` | 필수 그림(키보드 기본·팔)이 없습니다. | 必須画像(キーボード基本・腕)がありません。 | Required image (keyboard base / arm) is missing. |
| `preset.not_preset` | 프리셋 폴더가 아닙니다. preset.json이 있는 폴더를 고르세요. | プリセットのフォルダーではありません。preset.json があるフォルダーを選んでください。 | Not a preset folder. Choose the folder containing preset.json. |
| `preset.format` | 프리셋 파일 형식이 올바르지 않습니다. | プリセットファイルの形式が正しくありません。 | The preset file format is invalid. |
| `preset.invalid_settings` | 프리셋에 들어 있는 설정값이 올바르지 않습니다. | プリセットの設定値が正しくありません。 | The preset contains invalid settings. |
| `preset.damaged` | 저장된 프리셋이 손상되어 적용하지 않았습니다. 지금 상태는 그대로입니다. | 保存されたプリセットが壊れているため適用しませんでした。現在の状態はそのままです。 | The saved preset is damaged and was not applied. Nothing changed. |
| `preset.bad_dir` | 폴더를 찾을 수 없습니다. | フォルダーが見つかりません。 | Folder not found. |
| `preset.export_exists` | 고른 위치에 같은 이름의 폴더가 이미 있습니다. 다른 위치를 고르거나 프리셋 이름을 바꾸세요. | 選んだ場所に同じ名前のフォルダーがあります。別の場所を選ぶか名前を変えてください。 | A folder with the same name already exists there. Choose another location or rename the preset. |
| `preset.io` | 프리셋 파일을 읽거나 쓰지 못했습니다. | プリセットファイルを読み書きできませんでした。 | Could not read or write the preset files. |
| `preset.file_missing` | 파일이 없습니다. | ファイルがありません。 | File is missing. |
| `preset.file_link` | 바로 가기·링크 파일은 쓸 수 없습니다. | ショートカット・リンクは使えません。 | Shortcuts or links are not allowed. |

- 가져오기 문제 목록의 나머지 사유(`asset.not_png`·`asset.bad_header`·`asset.not_rgba`·`asset.too_large`·`asset.too_many_bytes`·`asset.canvas_mismatch`·`sound.not_audio`·`sound.too_many_bytes`)는 **기존 사전 문구 재사용**.
- ko의 `{규칙}`·`{사유}` 등 core message 원문은 쓰지 않는다(code로 문구 선택 — 기존 규칙).

## 5. 수용 기준 (테스트 이름 권고 — bridge는 mock)

| 파일 | 테스트 |
|---|---|
| `presetValues.test.ts` | `missingRequiredSlots` — 둘 다 있음 → []·`kb_up`만 없음·둘 다 없음. `canSavePreset` — 빈 이름·공백만·필수 없음 → false. `formatSavedAt` — ko/ja/en 결과가 서로 다르고 비지 않음. `fill` 자리표시자 치환 |
| `PresetsTab.test.tsx` | 마운트 시 `listPresets` 1회·카드 N장 렌더(이름·「그림 N장」·알림음 문구)·빈 목록 문구 / 필수 그림 없는 매니페스트 → 저장 비활성 + 이유 줄 / 저장 → `savePreset('고양이 A')`(trim) → 재조회·안내 / 가져오기 취소(`pickFolder` null) → `importPreset` 미호출 / 가져오기 문제 보고서 → 문제 목록 `kb_up.png` + `asset.not_rgba` 문구, 재조회 없음 / 가져오기 성공 → 재조회 / 적용 → 확인창 → 확인 → `applyPreset(id)` 1회, 취소 → 미호출 / 내보내기 → `exportPreset(id, dir)` → 폴더 이름 안내, `preset.export_exists` reject → 오류 줄(`onError`) / 삭제 → 확인창 → `deletePreset` → 재조회 / pending 중 모든 프리셋 버튼 비활성 |
| `PresetCard.test.tsx` | 날짜·장수·알림음 표시, 버튼 4개 콜백, 인라인 편집(Enter 저장·Esc 취소·빈 이름이면 저장 비활성), `aria-label`에 이름 포함 |
| `SettingsApp.test.tsx` | 탭 5개, 다섯째 = 「프리셋」, 위·아래·Home·End 순환에 포함 |
| `i18n.test.ts` | 세 사전 키 집합 동일(새 키 포함), `ERROR_CODES` 27 → 39, `preset.forbidden` 미포함 |

- 증거: `yarn test --run src/settings`(PASS 수), `yarn tsc --noEmit`(exit 0), `yarn build`(exit 0), `/run-app` 스크린샷 `doc/300_검증/screenshots/{YYYYMMDD-HHMM}/`(프리셋 탭 빈 목록·카드 2장·적용 확인창·가져오기 문제 목록 — 3개 국어 중 최소 ko).
- 수동(manual-checklist): 저장 → 다른 그림으로 바꿈 → 적용 → 오버레이·다른 탭 값이 저장 당시로 돌아옴, 창 위치·언어 그대로(PS-03) / 적용 뒤 이미지 바꿔도 프리셋 카드 그림 수 불변(PS-10) / 내보낸 폴더를 가져오면 카드가 하나 더 생김(PS-05·06) / 그림 하나를 RGB PNG로 바꾼 폴더를 가져오면 파일명과 사유가 보이고 목록 불변(PS-06).

## 6. 하지 말 것

- `invoke`·`listen`·`@tauri-apps/*` 직접 import 금지 — `src/bridge` 래퍼만.
- 새 이벤트 구독·폴링 금지(목록은 마운트·변경 뒤 재조회만).
- 적용 결과를 낙관적으로 화면 상태에 쓰지 않는다(이벤트로만).
- 요구 밖 기능 금지: 썸네일·「사용 중」 표시·정렬 전환·검색·복제·덮어쓰기 저장·자동 백업. 필요해 보이면 「확인 필요」로 보고만.
- `src/bridge/**`·`src-tauri/**`·`contract.md`·오버레이 화면 수정 금지. 새 라이브러리 금지(아이콘 포함).
- 이미지·기본 설정·타이머 탭 코드 수정 금지(이번 범위는 새 탭과 셸 등록뿐). 단, 전체 초기화 카드 문구는 U-1 = A라 **바꾸지 않는다**.

## 7. 완료 마커

- 파일: `PresetsTab.tsx`·`PresetSaveCard.tsx`·`PresetCard.tsx`·`presetValues.ts`, `index.tsx`·`TabIcon.tsx`·i18n 4파일 갱신.
- 문서: `requirements.md` R-58~(PS 매핑)·`design.md` RTM·`design/presets-tab.md`·`design/i18n.md` §4.12·`test/scenarios.md`·CR-064 「적용·검증」·`manual.md`.
- 증거: vitest·tsc·build 결과 수치, 스크린샷 경로.
- 메인 세션에 넘길 한 줄: 「프리셋 탭 완료 — verify-manager 통합 검증 권고(보안 리뷰 대상: 가져오기 경로·링크 거부)」.
