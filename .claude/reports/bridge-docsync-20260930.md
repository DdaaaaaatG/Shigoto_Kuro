# bridge 감사 — doc-sync 배치: contract.md v0.27 ↔ Rust ↔ TS (2026-09-30 11:41)

## 0. 요약 (결론 먼저)

| 항목 | 결론 |
|---|---|
| 3자 런타임 일치 | **CRITICAL 0건.** command 23 = Rust 핸들러 23 = `lib.rs` 등록 23 = TS 래퍼 23. event 7 = `events.rs` 상수 7 = `events.ts` `EVENTS` 7. 기본값(`DEFAULT_MOUSE_SETTINGS`·`DEFAULT_ASSET_SLOTS`)도 Rust core와 TS가 같다 |
| 계약 문서 뒤처짐 | **HIGH 6건 · MEDIUM 2건 · LOW 3건.** 「core 미반영」「소스 미적용」「소스 미반영」「core 반영 대기」 표기 22곳 중 **21곳이 이미 구현됨**, 1곳(L1508)은 실행 측정이 필요해 판정 보류 |
| 코드 주석 뒤처짐 | **MEDIUM 7건 · LOW 3건.** 옛 기본값(380,496 / 389,492 / penMode false), 「15장」, 폐기된 「같은 크기」·「패드 중심」, resetAppData JSDoc(CR-003·SEC-002 미반영) |
| 가장 중요한 결함 | ① 레이어 겹침 순서 서술(L113·L143·L144)이 CR-051 이전 순서 — 확정사항 §4·코드와 다름 ② KeyUndo·repeat·펜 슬롯이 「core 미반영/소스 미적용」으로 남음(모두 구현됨) ③ `resetAppData` JSDoc이 v0.26 계약(재진입만 막음·settings 창 전용)과 다름 |
| 확장 판정 | 요청 없음 |

## 1. 현황

- 계약: `doc/200_설계/bridge/contract.md` **v0.27**(머리말 「초안」), 1648줄. command 23 · event 7.
- Rust: `src-tauri/src/bridge/{mod.rs, types.rs(202), events.rs(241), commands/mod.rs, commands/tests.rs}`. 핸들러 등록 `src-tauri/src/lib.rs:152-174`.
- TS: `src/bridge/{types.ts(410), commands.ts(202), events.ts(51), index.ts}`.
- capabilities: `src-tauri/capabilities/overlay.json`·`settings.json`(창별 분리 완료).
- 이번 배치 범위 밖(미점검): `input://mouse-move` 스로틀 구현 위치, 경계(`@tauri-apps/api` 외부 import) 전수 grep, §6.2 code 목록 세부, L1508의 테스트 실패 건수(실행 금지).

## 2. 셋 대조표

### 2.1 command (23)

| 계약 항목 | contract.md | Rust | TS | 판정 |
|---|---|---|---|---|
| get_settings · set_settings | §5 L906-907 | lib.rs:152-153 | commands.ts:45-46 | ✅ |
| get_asset_manifest · import_asset · remove_asset | L908-910 | lib.rs:154-156 | commands.ts:49-52 | ✅ |
| restore_default_asset · export_default_assets | L911-912 | lib.rs:166-167 | commands.ts:58-67 | ✅ |
| get_hand_anchor · get_screen_bounds · get_monitors | L913-915 | lib.rs:157-159 | commands.ts:73,76,82 | ✅ |
| get_overlay_position · set_overlay_position · reset_overlay_position · set_overlay_visible | L916-919 | lib.rs:160-162,165 | commands.ts:83-92 | ✅ |
| set_autostart · open_settings_window | L920-921 | lib.rs:163-164 | commands.ts:98-99 | ✅ |
| get_timer · control_timer · set_resting | L922-924 | lib.rs:168-170 | commands.ts:103-109 | ✅ |
| get_alarm_sound · import_alarm_sound · remove_alarm_sound | L925-927 | lib.rs:171-173 | commands.ts:114-121 | ✅ |
| reset_app_data (+ `ensure_reset_caller`, `reset.forbidden`) | L928, §5.10 | lib.rs:174 · commands/mod.rs:620,625,643-645 · tests.rs:461 | commands.ts:130 | ✅ (JSDoc만 뒤처짐 — BRG-C10) |

### 2.2 event (7)

| 계약 | contract.md | Rust events.rs | TS events.ts | 판정 |
|---|---|---|---|---|
| input://keyboard | L886 | :16 | :19 | ✅ |
| input://mouse-move | L887 | :17 | :20 | ✅ |
| input://mouse-button | L888 | :18 | :21 | ✅ |
| settings://changed | L889 | :19 | :22 | ✅ |
| assets://changed | L890 | :20 | :23 | ✅ |
| assets://hand-anchor-changed | L891 | :22 | :25 | ✅ |
| timer://changed | L885 | :25 | :27 | ✅ |

- 이벤트 리터럴은 `src/` 제품 코드에서 `events.ts` 밖에 없음(grep, `test/` 제외). Rust는 `bridge/` 안 `events.rs`에만.

### 2.3 타입·필드·직렬화 (이번 배치에서 확인한 것)

| 계약 항목 | contract.md | Rust | TS | 판정 |
|---|---|---|---|---|
| `KeyboardPayload.repeat: bool` 항상 포함 | §3.7 | events.rs:38 (`rename_all = "camelCase"` :28) | (KeyboardInputEvent) | ✅ |
| `SpecialKey::Undo` → `"undo"` | §3.7 L680 | hook/mod.rs:134 · 분류 :194 · 테스트 hook/tests.rs:122 | types.ts `SpecialKey` | ✅ |
| `SimpleSlot::KeyUndo`·`PenUp`·`PenKey*` 7 | §3.1 L112-117 | assets/slot.rs:50,63,130,141,163-170 | types.ts:15,18-21 | ✅ |
| `DEFAULT_MOUSE_SETTINGS` shoulder (582,484)·partPos (411,464)·penPos (372,476)·penMode true | §3.3 | settings/mod.rs:184,190,198,200 | types.ts:360,370,377,379 | ✅ |
| `DEFAULT_ASSET_SLOTS` 7개·순서 | §3.1 L185 | assets/defaults.rs (L186이 확인 기록) | types.ts:75-83 | ✅ |
| `ScreenBounds`·창 `Point` camelCase | §3.4 | window/mod.rs:96-97,119-120 | types.ts | ✅ |
| capabilities 창별 분리 | §7 L1354 | overlay.json(`core:default`, `allow-start-dragging`) · settings.json(`core:default`, `dialog:allow-open`, `allow-set-title`) | — | ✅ (L1358 「반영 전」 표기만 뒤처짐) |

## 3. 위반 목록

### 3.1 계약 문서 (bridge-designer용)

[BRG-001][HIGH] v0.20 「core 미반영 / core 반영 대기」 — 이미 반영됨
  위치: contract.md:14, :15(「core 동기화 전까지 임시 불일치」), :358, §8 :1397(「core 반영 대기」)
  근거: L358 「Rust `settings::default_mouse()`는 아직 v0.18~v0.19 값…」 ↔ `src-tauri/src/settings/mod.rs:184` `shoulder: Point { x: 582.0, y: 484.0 }`, :190 `part_pos: Point { x: 411.0, y: 464.0 }`, :198 `pen_pos: Some(Point { x: 372.0, y: 476.0 })`. `DEFAULT_ASSETS`는 L186이 스스로 「core 반영 완료(2026-09-27)」라고 적음.
  기준: 스킬 §8(셋 대조) · 조치 방향: 반영 상태 표기가 코드보다 뒤처짐.

[BRG-002][HIGH] `undo`/`KeyUndo` 「core 미반영 · core 선행 필요」 — 이미 구현됨
  위치: contract.md:26, :114, :651, :680, :719, §8 :1387(「core 선행 필요 … 소스 미적용」), §9 :1577
  근거: L680 `Undo → "undo"(core 미반영 …)` ↔ `src-tauri/src/hook/mod.rs:134` `Undo,`, :194 `(vk == K_Z && !shift_down).then_some(SpecialKey::Undo)`, `src-tauri/src/assets/slot.rs:50` `KeyUndo,`, :130 `"key_undo"`.
  기준: 스킬 §8 · 조치 방향: 표기가 코드보다 뒤처짐. (core hook.md·assets.md 문서 자체의 반영 여부는 이번 범위 밖)

[BRG-003][HIGH] v0.12 `repeat` 「core 선행 필요 · 소스 미적용」 — 이미 구현됨
  위치: contract.md §8 :1388, §9 :1561(「core-designer 설계 완료, 소스 미적용」)
  근거: `src-tauri/src/hook/mod.rs:151` `repeat: bool,`(InputEvent::Keyboard), :222, `src-tauri/src/bridge/events.rs:38` `pub repeat: bool,`.
  기준: 스킬 §8.

[BRG-004][HIGH] v0.13 펜 슬롯 「소스 미적용」 — 이미 구현됨
  위치: contract.md §8 :1389, §9 :1547(「core assets.md §3.8 — 설계 완료, 소스 미적용」)
  근거: `src-tauri/src/assets/slot.rs:63` `PenKeyUndo,`, :163-170 `SimpleSlot::PenUp | … | SimpleSlot::PenKeyUndo`, TS `src/bridge/types.ts:18-21,35-38`.
  기준: 스킬 §8.

[BRG-005][HIGH] v0.15·v0.16 「소스 미적용」과 L1505 「lib.rs 등록 미해결」 — 이미 해소됨
  위치: contract.md §8 :1391, :1392, §9 :1505
  근거: L1505 「`generate_handler!`에 `restore_default_asset`·`export_default_assets` 2줄 등록이 아직 없다」 ↔ `src-tauri/src/lib.rs:166` `bridge::commands::restore_default_asset`, :167 `bridge::commands::export_default_assets`. penMode: `settings/mod.rs:200` `pen_mode: true`.
  기준: 스킬 §8.

[BRG-006][HIGH] 레이어 겹침 순서 서술이 CR-051 이전 순서
  위치: contract.md:113(「Hair … 겹침 순서(배경 바로 위)」), :143(`background` 「가장 맨 아래」), :144(「배경 → 헤어 → 팔·손(마우스 파츠·펜 쥔 손) → 본체」), :145(pomo 행 — 헤어 위치 누락)
  근거: 확정사항 `doc/000_프로젝트_확정사항.md:51` 「**뒷머리 → 배경 → 뽀모도 인물 → 말풍선 → 시간 글자 → 팔(마우스 파츠) → 본체 묶음 → 펜 손**」, :112(CR-051, 「위 순서 대체」). 코드 `src/overlay/index.tsx:245` `<HairLayer>` → :248 `<BackgroundLayer>` → :249 `<PomodoroLayer>` → :252 `<MouseArm>` → :262 `<LayerStack>` → :264 `<PenHand>`.
  차이: ① 헤어가 배경 **아래**(맨 뒤) ② 펜 쥔 손이 본체 **위**(계약은 팔·손을 묶어 본체 아래로 적음).
  기준: 확정사항이 단일 소스(CLAUDE.md) · 조치 방향: 표시 순서는 계약상 「ui 몫」이지만 서술이 확정사항·코드와 모순.

[BRG-007][MEDIUM] §7 L1358 「확인 필요(메인 세션, 반영 전)」 — 분리 반영 완료
  위치: contract.md:1358
  근거: `src-tauri/capabilities/overlay.json:5` `"windows": ["overlay"]`, :8 `core:window:allow-start-dragging` / `settings.json:5` `"windows": ["settings"]`, :8-9 `dialog:allow-open`·`core:window:allow-set-title` — L1354 계약 예시와 일치. 「반대 창 사용 0」 grep 확인 결과는 이번 배치에서 미측정(§5 확인 필요).

[BRG-008][MEDIUM] §8 v0.23·v0.25·v0.26 행 「소스 미반영(bridge-implementer 대기)」 — 구현됨
  위치: contract.md:1401, :1402, :1403
  근거: `lib.rs:171-174`(알림음 3종·`reset_app_data` 등록), `commands/mod.rs:620` `fn ensure_reset_caller`, :645 `caller: tauri::WebviewWindow`, `tests.rs:461`.
  비고: L1403·L1390 ⑬이 「이력 행의 미반영은 당시 기록이라 그대로 둔다」 관례를 명시 → 머리말(L3)은 이미 반영 완료로 적혀 있음. 이력 행 정정 여부는 관례 판단(§5).

[BRG-009][LOW] 머리말 줄 번호·인자 이름 불일치
  위치: contract.md:3(「`src-tauri/src/lib.rs:193`」 두 번), :5·:1403(주입 인자 `window: tauri::WebviewWindow`)
  근거: 실제 등록 `lib.rs:174`; 실제 인자명 `commands/mod.rs:645` `caller`. L3 자체는 `caller`로 적어 L5·L1403과 계약 안에서도 엇갈림. (JS 인자 아님 — 런타임 영향 없음)

[BRG-010][LOW] 머리말 「초안」 표기
  위치: contract.md:3 「(초안 — 사용자 확정 후 매니저가 v1로 올린다)」
  근거: 0.4.0 배포 값에 계약을 맞췄다는 L4 서술과 병존. 확정(v1) 여부는 사용자 판단(§5).

[BRG-011][LOW] §6.2 command별 에러 표에 일부 command 행 없음
  위치: contract.md:1290-1306(17행) vs §5 23개
  근거: `get_monitors`·`reset_overlay_position`·`set_overlay_visible`·`open_settings_window`·`set_resting`·`remove_alarm_sound` 행이 grep에 나오지 않음(표 행 형식 `| \`name\`` 기준). 의도적 생략(다른 행에 묶음)인지 미확인 → §5.

### 3.2 코드 주석 (bridge-implementer용)

[BRG-C1][LOW] 파일 머리 버전 표기 뒤처짐
  `src-tauri/src/bridge/types.rs:1` 「(v0.17 — contract.md §3)」, `src/bridge/types.ts:2` 「bridge 계약 타입 (v0.21)」 — 계약 v0.27.

[BRG-C2][MEDIUM] types.rs 문서주석 표의 옛 `penPos` 기본값
  `src-tauri/src/bridge/types.rs:19` 「v0.16: `penPos` 기본값 `None`→`Some(380,496)`」 — 현재 `settings/mod.rs:198` `Some(Point { x: 372.0, y: 476.0 })`(v0.20), `penMode` 기본 `true`(:200, v0.18) 언급 없음.

[BRG-C3][LOW] types.rs:21 `Point` 명칭
  `src-tauri/src/bridge/types.rs:21` 「ScreenBounds / Point(i32, = 계약 Position) | window::*」 ↔ 실제 재수출 :54 `pub use crate::window::{Point as WindowPoint, ScreenBounds};`. 표의 이름(`Point`)과 공개 이름(`WindowPoint`)이 다르고, :19의 `settings::Point`(캔버스 좌표)와 같은 이름으로 적혀 구분이 안 됨.
  참고: 위임문의 「types.rs의 『같은 크기』 주석」은 `src-tauri/src/bridge/` 전체 grep 0건 — 해당 없음.

[BRG-C4][MEDIUM] types.ts `partPos` 주석 — 폐기 규칙·옛 기본값
  `src/bridge/types.ts:157-158` 「마우스 파츠 그림(mouse_base·mouse_left·mouse_right 공통, **같은 크기**·같은 위치) … 기본 {x:389, y:492}」 ↔ 확정사항:110(CR-036 팔·손 파츠 크기 자유, 캔버스 레이어만 같은 크기), contract L151·L154, 실제 기본값 types.ts:370 `partPos: { x: 411, y: 464 }`.

[BRG-C5][MEDIUM] types.ts `hand` 주석 — 「패드 중심」
  `src/bridge/types.ts:164` 「이것도 null이면 패드 중심을 쓴다」 ↔ v0.9(CR-017) 이동 영역 중심. 같은 파일 :152, commands.ts:71은 이미 「이동 영역 중심」.

[BRG-C6][MEDIUM] types.ts `penPos` 주석 — 옛 기본값
  `src/bridge/types.ts:171` 「기본 {x:380, y:496}」 ↔ :377 `penPos: { x: 372, y: 476 }`.

[BRG-C7][MEDIUM] types.ts `penMode` 주석 — 옛 기본값
  `src/bridge/types.ts:178` 「기본 false」 ↔ :379 `penMode: true`, `settings/mod.rs:200`.

[BRG-C8][LOW] types.ts CR-053 버전 표기
  `src/bridge/types.ts:22-23,26,69` 「v0.23(CR-053)」 ↔ contract §8 L1400: CR-053은 **v0.24**(v0.23은 CR-048).

[BRG-C9][MEDIUM] commands.ts `exportDefaultAssets` 「15장」
  `src/bridge/commands.ts:62` 「내장 기본 그림 15장을 dir에 … 쓴다」 ↔ `DEFAULT_ASSET_SLOTS` 7개(types.ts:75-83, contract L185).

[BRG-C10][MEDIUM] commands.ts `resetAppData` JSDoc — v0.26 미반영
  `src/bridge/commands.ts:127-128` 「설정 창은 확인 창(ui 몫) 뒤에 호출하고, **응답 전까지 다른 조작을 막는다**」 ↔ contract L5 ② CR-003: 「pending 동안 다른 조작을 막는다」 → 「**초기화 버튼 재진입만 막는다**」. 또한 v0.26 SEC-002 호출 창 제한(settings 창 외 `reset.forbidden`, commands/mod.rs:620-625)이 JSDoc에 없음. (리뷰 CR-206 지적과 같은 지점)

## 3.3 「미반영」 계열 표기 판정표 (줄 → 판정)

| 줄 | 표기 | 대상 | 판정 | 근거(코드) |
|---|---|---|---|---|
| L3 | 「미반영」은 옛 기록(취소 설명) | reset_app_data 등록 | 구현됨(서술 정확, 줄 번호만 :193→:174) | lib.rs:174 |
| L6 | ~~미반영~~ 취소선 | 같음 | 구현됨(이미 정정) | lib.rs:174 |
| L14 | core 미반영 | default_mouse·DEFAULT_ASSETS | **구현됨** | settings/mod.rs:184-200, L186 |
| L15 | core 반영 대기·임시 불일치 | 같음 | **구현됨** | 같음 |
| L26 | core 선행 필요(undo·Ctrl) | hook·assets | **구현됨** | hook/mod.rs:134,194; slot.rs:50 |
| L114 | KeyUndo core 미반영 | SimpleSlot::KeyUndo | **구현됨** | slot.rs:50,130 |
| L358 | core 반영 대기(v0.20) | default_mouse | **구현됨** | settings/mod.rs:184,190,198 |
| L651 | undo·Ctrl core 미반영 | hook 분류 | **구현됨** | hook/mod.rs:194, hook/tests.rs:136 |
| L680 | Undo core 미반영 | SpecialKey::Undo | **구현됨** | hook/mod.rs:134 |
| L719 | core 선행 필요 | Undo·KeyUndo | **구현됨** | hook/mod.rs:134; slot.rs:50 |
| L1358 | 확인 필요(반영 전) | capabilities 분리 | **구현됨**(반대 창 사용 0 grep은 미측정) | overlay.json:5-8; settings.json:5-9 |
| L1387 | core 선행 필요·소스 미적용(v0.11) | undo·key_* | **구현됨** | 위와 같음 |
| L1388 | core 선행 필요·소스 미적용(v0.12) | repeat | **구현됨** | hook/mod.rs:151; events.rs:38 |
| L1389 | 소스 미적용(v0.13) | 펜 슬롯·penPos | **구현됨** | slot.rs:63,163-170; settings/mod.rs:198 |
| L1390 | (⑬ 당시 기록 설명) | — | 서술 정확 | — |
| L1391 | 소스 미적용(v0.15) | penMode | **구현됨** | settings/mod.rs:200 |
| L1392 | 소스 미적용(v0.16) | restore/export | **구현됨** | lib.rs:166-167 |
| L1397 | core 반영 대기(v0.20) | default_mouse | **구현됨** | settings/mod.rs:184-200 |
| L1401 | 소스 미반영(v0.23) | 알림음 command 3 | **구현됨** | lib.rs:171-173; commands.ts:114-121 |
| L1402 | 소스 미반영(v0.25) | reset_app_data | **구현됨** | lib.rs:174; commands.ts:130 |
| L1403 | 소스 미반영(v0.26) | ensure_reset_caller | **구현됨** | commands/mod.rs:620,645; tests.rs:461 |
| L1505 | lib.rs 등록 미해결 | restore/export 등록 | **구현됨** | lib.rs:166-167 |
| L1508 | 「ui 소스 미구현」·실패 34건 | ui 픽스처(2026-09-25 실측) | **판정 보류** — ui 소관, 테스트 실행 금지 범위 | — |
| L1547 | 설계 완료, 소스 미적용 | 펜 SimpleSlot | **구현됨** | slot.rs:63,163-170 |
| L1561 | 설계 완료, 소스 미적용 | hook repeat | **구현됨** | hook/mod.rs:151,222 |
| L1577 | core 선행 필요 | KeyUndo | **구현됨** | slot.rs:50 |

## 4. 확장 지점

요청 없음.

## 5. 확인 필요 (사용자 판단)

1. **이력 행(§8) 보존 관례**: L1390 ⑬·L1403이 「이력 행의 소스 미적용/미반영은 당시 기록이라 그대로 둔다」고 명시. §8 행(L1387-1392, L1397, L1401-1403)을 고칠지, 머리말·본문(§3·§9 L14/15/26/114/358/651/680/719/1505/1547/1561/1577)만 고칠지 결정 필요.
2. **머리말 「초안」**: 0.4.0 배포 기준 계약을 v1로 확정할지(L3).
3. **L1358 반대 창 사용 0 확인**: 분리는 반영됐으나 `startDragging`·`pickPngFile`·`data-tauri-drag-region`의 반대 창 사용 여부는 이번 배치에서 미측정.
4. **§6.2 표 누락 6개 command**: 의도적 생략인지(에러가 다른 행과 같음 등) 설계자 확인.
5. **L1508**: 2026-09-25 테스트 실패 34건 기록이 현재도 유효한지는 `yarn test --run` 실측이 필요(이번 배치 금지 범위).
