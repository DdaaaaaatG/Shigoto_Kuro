# default-assets 전반 설계 (CR-035 — 내장 기본 이미지 세트 · 기본값 복원 · 기본 이미지 다운로드)

- 작성: system-architect, 2026-09-24. 작업 모드: **보강**(이미 구현된 에셋 등록·비우기·설정 창 이미지 탭을 확장).
- 근거: `doc/000_프로젝트_확정사항.md` §6 「기본 이미지 세트 (🔒 2026-09-24, CR-035)」.
- 현황 근거: `.claude/reports/core-survey-20260924-2330.md`, `.claude/reports/bridge-survey-20260924-2330.md`. ui는 직접 읽음(`src/settings/imageSlots.ts`, `components/ImagesTab.tsx`·`ImageSlotCard.tsx`, `design/images-tab.md`, `src/bridge/types.ts`, `src/state/mouseMapping.ts`).
- 인계 패킷: `default-assets-03-packet-core.md` → `-03-packet-bridge.md` → `-03-packet-ui.md`(이 순서로만 진행한다).

**결론.** 기본 그림 15장은 `include_bytes!`로 exe 안에 넣는다. 그러면 포터블 exe 하나만 있어도 기본 그림이 따라간다. 새 의존성도, `tauri.conf.json`·capability 변경도 없다.
- **시딩:** 매니페스트가 비어 있고 같은 이름의 파일이 폴더에 하나도 없을 때만 15장 전부를 채운다. 조건이 하나라도 어긋나면 한 장도 쓰지 않는다.
- **새 command 2개:** `restore_default_asset`(카드 「기본값」 복원), `export_default_assets`(기본 이미지 다운로드).
- **폴더 선택:** 지금 있는 `dialog:allow-open`으로 된다. 같은 `open` command에 `directory` 옵션만 바꾸면 되고, 권한은 옵션별로 나뉘지 않는다.
- **사용자 결정 확정 (🔒 2026-09-24, 확정사항 §6 CR-035 결정 줄, §5):**
  - U-1 = **B**. 기본 그림이 있는 칸의 「기본값」은 **복원만** 하고 비우기는 없다. 기본 그림이 없는 칸만 기존대로 비운다. 따라서 이 버전에서는 캔버스 크기를 바꾸는 길(다른 크기 스킨으로 옮기기)이 없다. 사용자가 이를 받아들였다.
  - U-2 = **B**. `penPos` 기본값을 (380,496)으로 한다.
  - U-5 = **A**. 확인 후 전부 덮어쓴다.
  - U-3(false 유지)·U-4(S1)·U-6(include_bytes!)·U-7(R-30 확인창 띄움)은 권고안을 채택했다.
  - 남은 결정 대기는 없다.

## 0. 구조 분석 요약 (현황)

비유: 지금 앱은 빈 앨범을 주고 「사진은 직접 끼우세요」라고 하는 셈이다. CR-035는 앨범에 견본 사진을 미리 끼워 두고, 「기본값」 단추를 「비우기」에서 「견본 사진으로 되돌리기」로 바꾸고, 견본 원판을 사용자가 복사해 갈 수 있게 한다.

### 0.1 데이터 흐름 (현재)

```
[설정 창 ImagesTab] 「이미지 변경」 → pickPngFile() ─open(dialog)─▶ 경로
      └ importAsset(slot, path) ─invoke import_asset─▶ commands.rs:211 ─▶ assets::import(dir, slot, src)   (mod.rs:303)
             fs::read(src) → parse_png_header → load_manifest → validate(그룹 크기) → fs::write(assets/{key}.png) → save_manifest
      ◀ AssetManifest ── resize_for_canvas_slot → emit assets://changed(매니페스트 전체) → (mouse_base면) 손 기준점 재계산 → assets://hand-anchor-changed
[설정 창 ImagesTab] 「기본값」 → ConfirmDialog → removeAsset(slot) ─invoke remove_asset─▶ assets::remove(dir, slot)  (mod.rs:333)
[앱 시작 lib.rs] :60 dialog 플러그인 → :65 AppPaths → :66 create_dir_all(assets) → :67 settings 로드 → :68 매니페스트 로드
                 → :72 손 기준점 → :85 manage(AppState) → :92 tray → :95 hook → :111 setup_overlay(캔버스로 창 크기) → :114 autostart 보정
```

### 0.2 관련 계약 (contract v0.15)

| 종류 | 이름 | 인자 → 반환 | 에러 | 소비자 |
|---|---|---|---|---|
| command | `get_asset_manifest` | `()` → `AssetManifest` | `asset.io`, `asset.manifest` | overlay·settings 시작 |
| command | `import_asset` | `(slot, path)` → `AssetManifest` | `asset.not_png`·`bad_header`·`not_rgba`·`too_large`·`too_many_bytes`·`canvas_mismatch`·`io`·`manifest`, `tauri.error`, `state.poisoned` | settings |
| command | `remove_asset` | `(slot)` → `AssetManifest` | `asset.not_found`·`io`·`manifest`, `tauri.error`, `state.poisoned` | settings |
| event | `assets://changed` | `AssetManifest`(전체) | — | overlay·settings |
| TS 래퍼 | `pickPngFile(title?)` | `open({ multiple:false, directory:false, filters:PNG })` → `string \| null` | — | settings |
| 상수 | `REQUIRED_SLOTS`·`isRequiredSlot` | `kb_up`, `kb_down_0`, `mouse_base` | — | settings |

### 0.3 제약·사실

1. **등록은 경로로만 받는다.** `import(dir, slot, src: &Path)`만 있고, 바이트를 받는 저장 함수는 없다. 다만 검증 함수 `parse_png_header(&[u8])`·`validate(&PngInfo, u64, …)`는 이미 바이트를 받는다.
2. **내장 수단이 전혀 없다.** `include_bytes!` 0건, `bundle.resources` 없음, `tauri-plugin-fs`는 직접 의존하지 않는다(dialog 플러그인이 끌어온 전이 의존만 있음). 사용자 폴더에 파일을 쓰는 수단은 Rust command뿐이다(contract §7이 fs 권한을 금지).
3. **첫 실행을 감지하는 로직이 없고 설정에 `version`도 없다.** 매니페스트 파일이 없으면 빈 매니페스트를 돌려주되 파일은 만들지 않는다. 최상위 구조가 손상됐을 때의 처리는 호출 지점마다 다르다. 시작 시에는 경고 후 빈 매니페스트로 넘어가고, `get_asset_manifest`는 에러를 낸다.
4. **캔버스 규칙.** 캔버스는 entries에서 처음 나오는 캔버스 레이어의 크기다. 마우스 그룹과 펜 그룹은 각 그룹의 첫 항목 크기가 기준이 된다. 크기가 다르면 `asset.canvas_mismatch`다. 캔버스 레이어가 하나뿐이면 다른 크기로 바꿔 넣을 수 있다.
5. **여러 장 슬롯의 「마지막 장만 비우기」는 ui 규칙이다**(`imageSlots.ts` `slotCard`). core `remove`는 키 하나만 지운다.
6. **폴더 선택.** `dialog:allow-open`은 `open` command 전체를 허용한다. `open({ directory: true, multiple: false })`의 반환은 `string | null`이다(plugin-dialog 2.7.3).
7. **handler 등록 위치.** `invoke_handler`(`generate_handler!`)는 `lib.rs:118-133`에 있다. `lib.rs`는 core 소관이라 v0.9 때 bridge-implementer가 가드에 막힌 전례가 있다(contract.md:853).
8. **실제 데이터 경로는 `%APPDATA%\com.kuro.keyviewer\`다.** CLAUDE.md의 `%APPDATA%\kuro_keyviewer\`와 다르다. 이 설계의 범위 밖이며 메인 세션이 문서를 정정할 사항이다.

### 0.4 내장 세트 원본 (`doc/assets/defaults/`)

| 슬롯 | 파일 | 크기 | 바이트 | 그룹 |
|---|---|---|---|---|
| `background` | background.png | 900×700 | 22,696 | 캔버스 |
| `idle` · `rest` | idle.png · rest.png | 900×700 | 2,522 · 4,143 | 캔버스 |
| `kb_up` · `kb_down_0` | kb_up.png · kb_down_0.png | 900×700 | 63,472 · 62,013 | 캔버스 |
| `key_space`·`key_z`·`key_question`·`key_exclamation`·`key_enter`·`key_backspace`·`key_undo` | key_*.png | 900×700 | 60,451 ~ 67,767 | 캔버스 |
| `mouse_base` | mouse_base.png | 202×154 | 8,375 | 마우스 |
| `pen_up` · `pen_down_0` | pen_up.png · pen_down_0.png | 90×154 | 11,262 · 11,494 | 펜 |

합계 약 649 KB이고, 모두 규격 안이다(캔버스 900×700 이하, 1 MB 이하). 내장 기본이 **없는** 슬롯은 `body`, `mouse_left`, `mouse_right`, `pen_key_*` 7종, `kb_down_1+`, `pen_down_1+`다.
- `manifest.snapshot.json`은 참고용이다(url에 사용자 실경로가 들어 있다). 내장하지 않는다.

## 1. 목표 구조

```
[빌드 시] doc/assets/defaults/*.png ──include_bytes!──▶ src-tauri/src/assets/defaults.rs  DEFAULT_ASSETS[15] (slot, &'static [u8])

[앱 시작 lib.rs]  :66 create_dir_all ─▶ ★ assets::defaults::seed_if_empty(assets_dir) ─▶ :68 load_manifest ─▶ 손 기준점 ─▶ setup_overlay
                    (조건 충족 시 import_bytes × 15 · 실패해도 앱은 계속 뜸 · 로그만)

[설정 창 카드 「기본값」]
   hasBuiltinDefault(slot) ? ─ 예 ─▶ restoreDefaultAsset(slot) ─invoke restore_default_asset─▶ assets::restore_default(dir, slot)
                           │                                          = import_bytes(dir, slot, 내장 바이트) — 검증 먼저, 통과하면 덮어쓰기
                           └ 아니요 ─▶ removeAsset(slot)  (기존 그대로, 여러 장 슬롯은 마지막 장만)
   ◀ AssetManifest ── resize_for_canvas_slot → emit assets://changed → (mouse_base면) 기준점 재계산   ← import_asset과 같은 후처리

[설정 창 「기본 이미지 다운로드」]
   pickFolder(title) ─open({directory:true})─▶ dir | null
   exportDefaultAssets(dir, false) ─invoke export_default_assets─▶ assets::export::export_defaults(dir, overwrite=false)
        ├ 충돌 없음 → 15장 씀 → ExportReport{written:15, conflicts:[], failed:[]}
        └ 충돌 있음 → 아무것도 안 씀 → ExportReport{written:[], conflicts:[…]} ─▶ ui 확인창 「덮어쓸까요?」 ─▶ exportDefaultAssets(dir, true)
   (매니페스트·이벤트와 무관 — 앱 데이터 폴더를 건드리지 않는다)
```

판정 로직을 어디에 둘지(원칙: 한 곳):

| 판정 | 위치 | 근거 |
|---|---|---|
| 어느 슬롯에 내장 기본이 있는가 | **core `DEFAULT_ASSETS` 표가 원본**, 계약 §3.1 `DEFAULT_ASSET_SLOTS`가 TS 사본 | `REQUIRED_SLOTS`와 같은 방식이다. ui는 버튼 모드·문구 때문에 이 목록을 알아야 한다 |
| 복원이냐 비우기냐 | **ui**가 `hasBuiltinDefault`로 command를 고른다 | `remove_asset`의 의미를 바꾸지 않는다(비파괴). core `restore_default`는 기본이 없으면 `asset.no_default`로 거부한다 |
| 여러 장 슬롯에서 어느 장을 지울 수 있는가 | ui `imageSlots.ts`(기존) | 기존 규칙 유지 |
| 시딩 조건 | core `seed_if_empty` | 파일시스템 사실(매니페스트·파일 존재)만 본다 |
| 내보내기 충돌·부분 실패 | core가 사실을 모아 보고하고, ui가 확인창·결과 문구를 낸다 | 이벤트 없음. command 반환값으로만 전달한다 |

## 2. 상태 기계

**변경 없음.** 입력 상태 기계(`src/state/`)와 overlay 렌더 규칙은 그대로다.
- 첫 실행 시딩이 끝난 뒤의 overlay는 「사용자가 15장을 등록한 상태」와 똑같다. 펜 모드는 `mouse.penMode`가 따로 정한다(U-3).

## 3. 계약 변경 목록 (contract v0.15 → v0.16, 모두 추가 또는 비파괴)

| 종류 | 이름 | 변경 | 하위 호환 | 소비자 |
|---|---|---|---|---|
| command | `restore_default_asset(slot: AssetSlot) -> AssetManifest` | **추가.** 에러: `asset.no_default`(내장 기본 없는 슬롯), `asset.canvas_mismatch`(다른 캔버스 레이어와 크기 다름), `asset.io`, `asset.manifest`, `tauri.error`, `state.poisoned`. 부수 효과는 `import_asset`과 같다(리사이즈 → `assets://changed` → mouse_base면 기준점) | 추가 | settings |
| command | `export_default_assets(dir: string, overwrite: boolean) -> ExportReport` | **추가.** 에러(Err): `asset.export_dir`(절대 경로가 아니거나, 없거나, 폴더가 아님). 파일별 실패는 Err가 아니라 `ExportReport.failed`에 담는다. 이벤트 없음 | 추가 | settings |
| 타입 | `ExportReport { written: string[]; conflicts: string[]; failed: ExportFailure[] }` | **추가.** 모두 파일명(`kb_up.png` 등)이고 경로는 없다 | 추가 | settings |
| 타입 | `ExportFailure { fileName: string; code: string }` | **추가.** `code`는 `영역.사유` 형식(`asset.io`) | 추가 | settings |
| 상수 | `DEFAULT_ASSET_SLOTS: readonly AssetSlot[]`(15) · `hasBuiltinDefault(slot): boolean` | **추가**(§3.1, `REQUIRED_SLOTS` 옆) | 추가 | settings |
| TS 래퍼 | `pickFolder(title?: string): Promise<string \| null>` | **추가**(§5.4, `pickPngFile` 옆). `open({ directory: true, multiple: false, title })` | 추가 | settings |
| 에러 코드 | `asset.no_default` · `asset.export_dir` | **추가**(§6·§6.2). message에 경로를 넣지 않는다 | 추가 | settings(ja·en 문구) |
| 동작 주석 | `get_asset_manifest` | **비파괴 주석.** 첫 실행(매니페스트 비어 있음)이면 앱 시작 때 core가 기본 세트 15장을 채워 두므로, 첫 호출부터 15개 항목이 올 수 있다 | 비파괴 | overlay·settings |
| 기본값 | `MouseSettings.penPos` 기본값 | **U-2 = B 확정.** `null` → `{x:380, y:496}`. 모양은 그대로(`Point \| null`)이고 기본값만 바뀐다 | 비파괴(기존 settings.json의 `null`은 그대로 읽힘) | overlay·settings |
| capability | — | **변경 없음.** `dialog:allow-open`이 폴더 선택을 포함한다(§0.3-6). `dialog:allow-save`·fs 권한은 추가하지 않는다 | — | — |
| tauri.conf | — | **변경 없음.** `bundle.resources`를 쓰지 않는다 | — | — |

- **파괴 변경은 없다.** `remove_asset`·`import_asset`·`assets://changed`의 의미는 그대로다.
- 「기본값」 버튼의 의미가 바뀌는 것은 ui 동작(어느 command를 부르는지)의 변경이지 계약 변경이 아니다.

## 4. 설정 스키마 변경

| 키 | 타입 | 기본값 | 검증 범위 | 마이그레이션 |
|---|---|---|---|---|
| `mouse.penPos` | `Point \| null` | **`{x:380, y:496}`**(U-2 = B 확정, 이전 `null`) | 없음(기존대로) | 없음. 기존 settings.json에 `"penPos": null`이 있으면 그대로 null이다(serde default는 키가 없을 때만 적용) |
| (그 밖) | — | 변경 없음 | — | 스키마 `version` 없음, 승격 없음 |

**기본 좌표 점검.** 이 PC의 실제 `%APPDATA%\com.kuro.keyviewer\settings.json`(기본 세트 15장이 등록된 상태)과 코드 기본값을 대조했다.

| 키 | 코드 기본값 (Rust `default_mouse` = TS `DEFAULT_MOUSE_SETTINGS`) | 실사용값 | 판정 |
|---|---|---|---|
| `shoulder` | (620, 530) | (620, 530) | 일치 |
| `area` | (375,525)·(495,525)·(495,625)·(375,625) | 같음 | 일치 |
| `partPos` | (389, 492) | (389, 492) | 일치. 기본 `mouse_base` 202×154 |
| `hand` | null | null | 일치 |
| `penPos` | null → 기본 위치 규칙 `defaultPenPos`에 따라 **(390, 498)**(area 중심 (435,575) − 90×154/2) | **(380, 496)** | 불일치(가로 10px, 세로 2px). **U-2 = B → 코드 기본값을 (380, 496)으로 변경** |
| `penMode` | false | **true** | 불일치. **U-3 = A → false 유지**(CR-033 🔒) |

- **근거 주석이 옛 그림을 가리킨다.** `area`·`partPos`의 주석은 「예시 `mouse_pen_hand.png`(202×154)」를 근거로 들지만, 기본 세트 `mouse_base.png`(8,375 B)는 `samples/mouse_base_v2.png`(8,375 B)와 같은 크기의 다른 파일이다(`mouse_pen_hand.png`는 11,378 B). 값은 실사용과 일치하므로 **값은 그대로 두고 주석 근거만 「기본 세트 mouse_base.png(CR-035)」로 고친다.**
- core 완료 보고에는 기본 `mouse_base`의 손 기준점 측정값(partPos (389,492) 기준)을 한 줄 싣는다. 이 값은 참고용이며 테스트 단언은 하지 않는다.

## 5. 사용자 결정 사항 (🔒 2026-09-24 확정)

| ID | 확정 | 권고와의 관계 | 설계 반영 |
|---|---|---|---|
| U-1 | **B — 비우기 없음.** 기본 그림이 있는 칸의 「기본값」은 복원만 한다. 3단추 확인창은 없다. 기본 그림이 없는 칸만 기존 비우기 | **권고(A)와 다름** | ui 패킷 §1~§3. 결과: 기본 그림이 있는 12칸 + mouse_base·pen_up·pen_down_0(필수 3칸 포함)은 비울 수 없다. 캔버스 크기 변경(D-1의 「필수 칸도 비울 수 있다」 근거)은 이 버전에서 불가하며 사용자가 받아들였다. 계약 변경은 없다(`remove_asset` 불변, ui가 복원 칸에서 부르지 않을 뿐) |
| U-2 | **B — `penPos` 기본값 (380, 496)** | 권고 채택 | core §5-2, bridge §4, ui(리셋 TC 기대값) |
| U-3 | A — `penMode` 기본 false 유지 | 권고 채택 | 변경 없음 |
| U-4 | S1 — 매니페스트 0개일 때마다 15장 시딩 | 권고 채택 | core §2 |
| U-5 | **A — 충돌을 미리 검사하고 확인 후 전부 덮어쓰기** | 권고 채택 | core §4, ui §4 |
| U-6 | include_bytes!, 원본 `doc/assets/defaults/` | 권고 채택 | core §1 |
| U-7 | 빈 `pen_up` 복원 시 R-30 확인창 | 권고 채택 | ui §3 |

아래 표는 결정 전 검토 기록이다(근거 보존용).

| ID | 질문 | 대안 · 근거 | 권고 | 막는 범위 |
|---|---|---|---|---|
| **U-1** | 「기본값」이 복원이 되면 **기본 그림이 있는 칸(배경·대기·쉬는중·특수 키 7·펜 손 등)을 비울 방법이 없다.** 같은 이유로 캔버스 크기를 바꾸는 방법(D-1: 캔버스 그림을 모두 비운 뒤 새 크기로 등록)도 막힌다. 확정사항 §3이 허용한 봉고캣 612×354 스킨으로 옮길 수 없다 | **A.** 기본 그림이 있는 칸의 「기본값」 확인창을 3단추로 한다(「기본 그림으로」·「비우기」·「취소」). 비우기는 기존 `remove_asset`을 쓰므로 계약은 변하지 않고 ui만 바뀐다. **B.** 비우기 없음을 받아들인다. 612×354로 옮기는 길이 막히고, 임시 글자 그림(특수 키)도 지울 수 없다. **C.** 탭 위에 「모든 그림 비우기」 단추를 새로 둔다. 새 기능이라 요구 승격이 필요하고 파괴 범위가 크다 | **A** (요구 추가 승인 필요) | ui 패킷 전체 |
| **U-2** | `penPos` 기본값 | **A.** `null`을 유지하고 10px 차이를 받아들인다. **B.** 코드 기본값을 (380,496)으로 옮긴다. 확정사항 §3 「개발자가 끌어다 놓아 정한 좌표를 코드 기본값으로 옮긴다」와 같은 방식이다. 이 경우 어깨축 탭 「기본값으로 리셋」도 (380,496)이 되고, 사용자가 다른 크기의 펜 손을 처음 등록할 때 가운데 맞춤 대신 (380,496)이 기준이 된다(끌어서 조정 가능). **C.** 시딩할 때만 settings에 써 넣는다. 시딩이 설정까지 건드리게 돼 책임이 섞인다 | **B** | core §5·bridge §4·ui §6의 조건부 항목만 |
| **U-3** | 첫 실행 `penMode` 기본값 | **A.** false 유지(CR-033 🔒 「기본 false」). 기본 세트의 특수 키 7장은 펜 모드가 꺼져 있어야 보인다. **B.** true(이 PC의 실사용값). 특수 키 그림이 가려지고, CR-033 확정 문구를 바꿔야 한다 | **A** | 없음(A면 변경 없음) |
| **U-4** | 시딩 시점 | **S1.** 시작할 때마다 「매니페스트 0개 + 같은 이름 파일 없음」이면 15장 전부를 채운다(전부 비우고 재시작하면 다시 채워짐 — 확정 문구 「또는 슬롯이 비어 있을 때」와 맞음). **S2.** 슬롯마다 빈칸을 매번 채운다. 사용자 그림과 기본 그림이 섞이고, 캔버스 크기가 다른 사용자는 `canvas_mismatch`가 난다. 기각. **S3.** 첫 실행 1회만(마커 필요). 매니페스트 파일이 있는지로 구분할 수 있지만, 전부 비운 뒤에는 다시 채워지지 않는다 | **S1** | core §2 |
| **U-5** | 다운로드 충돌 처리 | **A.** 미리 검사해서 충돌이 있으면 아무것도 쓰지 않고 목록을 돌려준 뒤 확인창(「N개 덮어쓸까요?」)을 띄우고, 확인하면 전부 덮어쓴다. **B.** 항상 하위 폴더를 새로 만든다(`kuro_keyviewer_defaults`, 이미 있으면 `_2`). 확정 문구 「폴더를 고르면 … 저장」과 어긋난다. **C.** 충돌 파일은 건너뛴다. 어느 것이 새 파일인지 알기 어렵다 | **A** | core §4·ui §5 |
| **U-6** | 내장 방식 | **include_bytes!**: 포터블 exe에도 따라가고, conf·capability 변경이 없고, 경로 해석 실패가 없고, 테스트가 같은 표를 쓴다. exe가 약 0.65 MB 커지고 그림을 바꾸려면 다시 빌드해야 한다. **Tauri resources**: 설치본에만 파일이 깔리고 포터블 exe에는 빠진다(CLAUDE.md 배포 = NSIS + **포터블 exe**). `bundle.resources` 추가, `resource_dir()` 해석, dev와 설치본의 경로 차이를 모두 처리해야 한다 | **include_bytes!** · 원본 위치는 `doc/assets/defaults/` 그대로(확정사항이 지정한 원본 자리. 빌드가 `doc/`를 참조하지만 `tests/sample_assets.rs`에 전례가 있음) | core §1 |
| **U-7** | 비어 있는 `pen_up`에서 「기본값」으로 복원했을 때 R-30 확인창(「펜 손 모드를 켤까요?」)을 띄울지 | 띄운다: 「`pen_up`이 없던 상태에서 생김 = 첫 등록」(CR-033 결정 ③)과 같은 규칙. 첫 실행 시딩 때는 창이 없으므로 묻지 않고 `penMode` 기본값(U-3)을 따른다 | **띄운다** | ui §4 |

- (이전 기록) U-1은 요구 추가가 필요한 안건이었다. 사용자가 B를 택해 요구 추가는 없다.

## 6. 종단간 RTM

요구ID `DA-xx`는 이 설계의 횡단 ID다. 화면 요구 번호(settings `R-31~R-33` 제안)는 ui-designer가 확정한다.

| 요구ID | 요구 | ui | bridge | core | 설정 키 | 테스트 | 상태 |
|---|---|---|---|---|---|---|---|
| DA-01 | 기본 세트 15장을 앱에 내장 | - | `DEFAULT_ASSET_SLOTS`·`hasBuiltinDefault`(목록 사본) | `assets/defaults.rs` `DEFAULT_ASSETS`(include_bytes!) | - | core `default_assets_pass_validation`·`default_assets_slot_set` / bridge vitest `hasBuiltinDefault` | 설계 |
| DA-02 | 첫 실행(매니페스트 비어 있음)에 기본 세트를 채우고 기존 데이터는 덮어쓰지 않음 | (변경 없음 — 시작 시 `getAssetManifest`로 15장을 받음) | `get_asset_manifest` 동작 주석 | `seed_if_empty` + `lib.rs` :66~:68 사이 호출 | - | core `seed_*` 5종 | 설계 |
| DA-03 | 카드 「기본값」 = 내장 기본 그림으로 복원(확인창 유지) | `imageSlots.ts` `resetKind`, `ImagesTab` 분기, 확인 문구 | `restore_default_asset`, `restoreDefaultAsset` | `restore_default` = `import_bytes`(검증 먼저) | - | core `restore_*` / ui TC | 설계 |
| DA-04 | 내장 기본이 없는 칸은 비우기(여러 장이면 마지막 장만). kb_down_0·pen_down_0은 가운데 장이어도 제자리 복원 가능 | `slotCard` 규칙 개정 | `remove_asset`(불변) | `remove`(불변) | - | ui `slotCard` 단위 | 설계 |
| DA-05 | 기본 이미지 다운로드(폴더 선택 → 원본 바이트를 슬롯 파일명으로, 충돌 확인, 부분 실패 보고) | `DefaultsDownloadPanel`(신규) | `pickFolder`, `export_default_assets`, `ExportReport` | `assets/export.rs` `export_defaults` | - | core `export_*` 6종 / ui TC | 설계 |
| DA-06 | 에러 코드 `asset.no_default`·`asset.export_dir`(`영역.사유`) + 3개 국어 문구 | `i18n` errorText ja·en | contract §6·§6.2 | `AssetError::{NoDefault, ExportDir}` `code()` | - | core `error_codes` / ui i18n 키 검사 | 설계 |
| DA-07 | 기본 좌표 점검(§4). penPos 기본값 (380,496)(U-2 = B) | 어깨축 탭 리셋 TC 기대값에 penPos (380,496) | `DEFAULT_MOUSE_SETTINGS.penPos` | `default_mouse` 주석 정정 + `pen_pos` 기본값 | `mouse.penPos` | core settings 기본값·null 호환 테스트 / bridge vitest | 설계 |
| DA-08 | 비어 있는 `pen_up`을 복원하면 첫 등록 확인창(R-30, U-7) | `ImagesTab` 복원 후 `isFirstPenUp` | (기존 `set_settings`) | - | `mouse.penMode`·`mouse.penPos` | ui TC | 설계 |
| DA-09 | 기본 그림이 있는 칸은 비우지 않는다(U-1 = B) | `slotCard`: restore 칸은 비우기 경로 없음(확인창 2단추 그대로) | - | - | - | ui TC(복원 칸에서 `removeAsset` 0회) | 설계 |

끊긴 곳은 없다(`-`는 해당 없음). 결정 대기 항목도 없다.

## 7. 비기능 목표와 측정

| 항목 | 목표 | 측정 |
|---|---|---|
| exe 크기 증가 | ≤ 0.7 MB | release 빌드 전후 exe 크기(`/deploy` 때 verify가 확인) |
| 시딩 시간(첫 실행 1회) | ≤ 150 ms(15장 헤더 검증 + 쓰기) | core가 `Instant`로 재서 로그 1줄, 완료 보고에 실측값 |
| 평소 시작 시간 | 변화 없음(조건 검사 = 매니페스트 1회 + 파일 15개 존재 확인) | 위 로그의 skip 경로 |
| 복원 1회 | 기존 `import_asset`과 같은 수준 | — |
| 내보내기 | ≤ 300 ms(15장 쓰기) | core 테스트 실측을 완료 보고에 |
| 메모리 | 내장 바이트는 정적 영역(힙 복사 없음) | 코드 리뷰 |

## 8. 보안 메모 (verify-security-reviewer 대상)

- `export_default_assets`는 **의도적으로 앱 데이터 폴더 밖에 쓴다.** 쓸 수 있는 범위는 다음으로 제한한다.
  - 파일명은 내장 표의 15개 고정 이름뿐이다. 사용자 입력 파일명을 받지 않으므로 경로 이탈이 없다.
  - 폴더는 절대 경로이면서 이미 있는 폴더여야 한다.
  - 임시 파일에 쓴 뒤 rename한다.
- 에러 message에 사용자 경로를 넣지 않는다. 기존 `asset.io`의 `{0}` 원문 포함은 계약 §6 현황 메모 ①의 기존 과제이며 이번 범위 밖이다. 다만 **새 코드**는 고정 문구만 쓴다.
