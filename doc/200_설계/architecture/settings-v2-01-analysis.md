# settings-v2 구조 분석 (R-set-v2 설정 창 개편)

- 작성: system-architect, 2026-09-24. 작업 모드: **보강(maintain)** — 설정 창·core·bridge 모두 구현돼 있다.
- 단일 소스: `doc/000_프로젝트_확정사항.md` §6 「설정 창 개편 (🔒 2026-09-24)」·자동 실행 줄, §4 필수 이미지 줄(§6이 대체).
- 횡단 판별: **횡단.** 근거: ① 세 계층을 동시에 건드린다(core 창 속성·자동 실행·설정 필드 / bridge 새 command·설정 필드·에러 코드·capabilities / ui 설정 창 전면 개편) ② `set_settings`의 기존 의미가 바뀐다(`autostart` 입력 무시) ③ `set_autostart`의 구현 방식이 바뀐다(레지스트리 Run 키 → 작업 스케줄러 + UAC).
- 참조 리포트: `.claude/reports/core-survey-20260924-settingsv2.md`, `.claude/reports/bridge-survey-20260924-settingsv2.md`(파일:줄 근거는 리포트에 있다).

---

## 1. 데이터 흐름 (현재)

비유: 설정 창은 「조종실」, core는 「기관실」이다. 조종실은 레버(command)만 당기고, 기관실이 실제로 창을 움직이고 파일을 쓴 뒤 방송(event)으로 모든 창에 결과를 알린다.

```
[설정 창 ui]                        [bridge]                          [core]
SettingsApp ─ getSettings ────────▶ get_settings ───────────────────▶ AppState.settings(메모리 복제)
            ─ setSettings(전체) ──▶ set_settings ─ validate ────────▶ settings::save(tmp→삭제→rename)
                                                 ─ keep_overlay_position(x/y는 core 값 유지)
                                                 ─ apply_overlay_settings(visible만)
                                                 ─ 자동 실행 반영(plugin-autostart, HKCU Run)
                                                 ─ scale 바뀌면 resize_overlay
                                                 ─ emit settings://changed ─────▶ overlay·설정 창
            ─ importAsset(slot, path) ▶ import_asset ─────────────────▶ assets::import(검증→덮어쓰기)
            ─ removeAsset(slot) ──────▶ remove_asset ─────────────────▶ assets::remove(캔버스 재계산)
                                                 ─ emit assets://changed ──────▶ overlay·설정 창
            ─ pickPngFile() ─ plugin-dialog open(PNG 필터) → 경로 문자열
[오버레이 ui] data-tauri-drag-region 끌기 → core placement가 이동 멎음(500ms) 감지 → 저장 → settings://changed
```

- 설정 창 현재 탭: 이미지(목록 텍스트 임시 표시) / 동작(설정 JSON 덤프 임시 표시) / 마우스 파츠(`MousePartsTab`, 실기능). `src/settings/index.tsx:22-26`.
- 설정 창 문구는 `src/settings/labels.ts` 한 곳(한국어만). 오버레이 `labels.ts`는 비어 있다(오버레이에 보이는 문구 없음).
- 이미지 표시: `AssetEntry.url` = `http://asset.localhost/` + 인코딩 경로(`assets/mod.rs:351-354`). **버전 쿼리 없음** → 같은 슬롯을 다른 그림으로 바꿔도 URL이 같다.

## 2. 계약 목록 (contract v0.13, 계약·Rust·TS 이름 13/13·6/6 일치)

| 종류 | 이름 | 이번 개편 관련 | 소비자 |
|---|---|---|---|
| command | `get_settings` / `set_settings`(전체 교체, `overlay.x/y` 입력 무시) | 새 필드 3개 실어 나름. `set_settings`가 자동 실행도 반영함(§5.3 4단계) | 설정 창·오버레이 |
| command | `get_asset_manifest` / `import_asset(slot, path)` / `remove_asset(slot)` | 이미지 설정 탭이 그대로 씀. `kb_down` index 불연속이면 `ASSET_SLOT_INVALID` | 설정 창(현재 목록만) |
| command | `set_overlay_position(x, y)` / `set_overlay_visible` / `get_overlay_position` | 위치 초기화 후보 | 트레이·(ui 미사용) |
| command | `set_autostart(enabled) -> boolean` | 구현이 **tauri-plugin-autostart(HKCU Run)** — 확정사항(작업 스케줄러)과 불일치 | ui 미사용(R-06 보류) |
| command | `get_hand_anchor`, `get_screen_bounds`, `get_monitors`, `open_settings_window` | 무관 | overlay·tray |
| 래퍼 | `pickPngFile()` — plugin-dialog `open`, 제목 `'PNG 이미지 선택'` 고정 | 언어별 제목 필요 | 설정 창(미사용) |
| event | `settings://changed`(Settings) · `assets://changed`(AssetManifest) | 두 창이 이미 구독 | 설정 창·오버레이 |
| event | `input://*` 3종, `assets://hand-anchor-changed` | 무관 | overlay |
| capabilities | `core:default`, `core:window:allow-start-dragging`, `dialog:allow-open`, `autostart:default` (두 창 공용) | 계약 §7 표와 실물 불일치(BRG-002) | — |

## 3. 상태 기계 (현재)

- **입력 상태 기계(`src/state/inputMachine.ts`)는 이번 개편과 무관하다.** 상태 `idle`/`rest`, 유휴 타이머 `idleSeconds`, 키·클릭·반복 입력 전이는 그대로다.
- 오버레이 레이어 선택(`src/overlay/components/LayerStack.tsx`): 일반 상태 레이어 = `findEntry(manifest, machine.layer)` → `idle`·`rest` 그림이 **없으면 그리지 않는다(투명)**. 키보드 레이어는 늘 그린다(들림 = `kb_up`). 즉 **idle·rest가 없으면 화면은 이미 `kb_up`만 보인다** — 요구의 「없으면 kb_up으로 폴백」은 현행 렌더 규칙으로 충족된다(`src/overlay/design.md:186`).
- 설정 창 마법사 상태(`mouseWizard.ts`, `idle`/`pickShoulder`/`review`/`pickArea`/`reviewArea`)는 「어깨축·손 위치」 탭으로 그대로 옮긴다.

## 4. 설정 스키마 (현재, `src-tauri/src/settings/mod.rs:84-127`)

| 키 | 타입 | 기본값 | 검증 |
|---|---|---|---|
| `scale` | f64 | 1.0 | 0.25~2, 유한수(거부) |
| `idleSeconds` | u32 | 300 | ≥1 |
| `overlay` | `{x:i32, y:i32, visible:bool}` | `{100,100,true}` | — (x/y는 set_settings 입력 무시) |
| `mouse` | `MouseSettings \| null` | `default_mouse()` | area 네 점 유한수 |
| `autostart` | bool | false | — |

- `#[serde(rename_all="camelCase", default)]`, `deny_unknown_fields` 없음 → **키 추가는 기본값만 있으면 옛 파일과 호환**. `version` 필드·마이그레이션 로직 없음.
- 저장 폴더 실물 = `app_data_dir()` = `%APPDATA%\com.kuro.keyviewer\`(CLAUDE.md 표기 `kuro_keyviewer`와 다름 — 문서 표기 문제).
- **없는 필드: `language`, `positionLock`, `showInTaskbar`.**

## 5. 문제점·제약·중복

| # | 항목 | 근거 | 이번 설계 영향 |
|---|---|---|---|
| P-1 | 자동 실행이 plugin-autostart(HKCU Run). 작업 스케줄러·관리자 코드 없음. 단일 인스턴스 없음 | core-survey Q3·Q5, BRG-005 | core 자동 실행 교체. 수동 실행 + 자동 실행 겹침 위험은 미결로 |
| P-2 | `set_settings`가 자동 실행을 반영(§5.3 4단계). UAC가 끼면 다른 설정을 바꿀 때마다 권한 창이 뜰 수 있다 | contract.md:507·573 | `set_settings`는 `autostart` 입력을 무시하도록 의미 변경 |
| P-3 | Tauri 동기 command는 메인 스레드에서 돈다(contract §5.1-7). UAC 대기 중 모든 창이 멈춘다 | contract.md:534 | `set_autostart`는 async + 블로킹 작업 분리 |
| P-4 | `set_ignore_cursor_events`·`set_skip_taskbar` 호출 없음. 오버레이는 `skipTaskbar: true` 정적 | core-survey Q2 | core window에 적용 함수 추가 |
| P-5 | 기본 위치 전용 함수 없음. 폴백은 `Settings::default().overlay` = (100,100) | placement.rs:91 | 위치 초기화 command 신설 |
| P-6 | 필수 이미지 판정이 **어디에도 코드로 없다** — core는 검사 안 함(assets.md:137 「필수 판정은 ui」), ui도 없음. 주석·문서에만 「필수 4장」 | core-survey Q4, grep | 필수 규칙은 계약 상수(TS) 1곳 + 문서 갱신. core 로직 변경 없음 |
| P-7 | `AssetEntry.url`에 버전 없음 + PNG 본문 제자리 덮어쓰기(CORE-002) | assets/mod.rs:311·351 | 「이미지 변경」 후 미리보기·오버레이가 옛 그림을 계속 보일 위험 → url 버전 필요 |
| P-8 | 에러 코드 표기 불일치: 계약 `ASSET_TOO_LARGE` 등 vs 실물 `asset.too_large` 등 | BRG-001, contract.md:609 | 3개 국어 오류 문구를 code로 고르려면 정본 결정 필요(미결) |
| P-9 | capabilities 실물 ≠ 계약 §7 | BRG-002 | 이번 v0.14에서 §7을 실물 기준으로 정리 |
| P-10 | 설정 저장이 「tmp 쓰기 → 원본 삭제 → rename」(CORE-001) | settings/mod.rs:199-204 | 범위 밖 결함. 미결(권고)로 |
| P-11 | 문구가 한국어 고정(`labels.ts`, Rust 에러 message, 파일 대화상자 제목, 창 제목 `tauri.conf.json` "kuro_keyviewer 설정") | 소스 | i18n 설계 필요 |
| P-12 | 계약 §3.1(contract.md:124)·assets.md 여러 곳이 idle·rest를 「필수」로 적음 | bridge-survey §4 | 문서 갱신 |
| P-13 | 설정 창 요구 R-03(배율 슬라이더)·R-04(유휴 시간)·R-06(자동 실행)·R-14(이미지 등록)가 「보류」 상태. 새 3탭 구성에는 배율·유휴 시간이 없다 | settings/requirements.md | R-06·R-14는 이번에 대체 구현. R-03·R-04 처리는 미결 |
