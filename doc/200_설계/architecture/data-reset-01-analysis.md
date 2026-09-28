# data-reset 구조 분석 (베타 데이터 세대 초기화 · 전체 초기화 버튼 · 버전 0.1.1)

- 작성: system-architect, 2026-09-27. 작업 모드: **보강**(기본 그림 시딩 CR-035/053, 설정 저장 단일화 CR-047이 이미 구현됨).
- 판별: **횡단**(core 시작 경로·파일 삭제 + bridge 새 command·에러 코드 + settings 화면 버튼·확인창 → 3계층).
- 현황 근거: `.claude/reports/core-survey-20260927-1400.md`, `.claude/reports/bridge-survey-20260927-1400.md`. ui는 직접 읽음(`src/settings/index.tsx`, `components/GeneralTab.tsx`·`ConfirmDialog.tsx`, `design/general-tab.md`, `design/i18n.md`, `src/overlay/design.md` §계약 사용표).

**결론.** 새 exe가 옛 그림·옛 좌표를 그대로 보여 주는 이유는 세 가지다. 앱에 "지금 폴더의 데이터가 몇 번째 기본 세트로 만들어졌는지" 적어 두는 표식이 없다. 시딩은 폴더가 비었을 때만 돈다. 버전 번호도 0.1.0에서 한 번도 바뀌지 않았다.
- 비유하면 이렇다. 가게가 진열대 견본을 네 번 바꿨는데, 진열대에 "몇 번째 견본"이라는 딱지가 없다. 그래서 점원(새 exe)은 진열대가 비어 있지 않으면 옛 견본을 그대로 둔다.
- 초기화에 필요한 부품은 대부분 이미 있다. 경로(`AppPaths`), 시딩(`seed_if_empty`), 원자적 설정 저장(`settings::update`), 설정 변경 뒤처리(`set_settings` 본문), 오버레이 새로고침(`tray::refresh_overlay`)이 그것이다.
- 없는 부품은 셋이다. 세대 표식, 폴더를 비우는 함수, 전체 교체 뒤 한꺼번에 다시 적용하는 묶음.

## 1. 데이터 흐름 (현재)

```
[앱 시작 lib.rs setup]
 :95 AppPaths::new ─▶ :96 create_dir_all(assets) ─▶ :97 assets::defaults::seed_if_empty(assets_dir)
     (manifest 비어 있음 AND 기본 파일명 7개 중 하나도 없음 → 7장 등록, 아니면 건너뜀 — settings 안 건드림)
 ─▶ :98 settings::load_or_default(settings_file)   (실패 = 기본값 + 경고, 손상 파일은 덮어쓰지 않음)
 ─▶ :99 manifest 로드 ─▶ :103 손 기준점 ─▶ :119 타이머 마감 스레드 ─▶ :124 manage(AppState)
 ─▶ :138 창 생성 ─▶ :141 tray ─▶ :146 hook·전달 스레드 ─▶ :162 setup_overlay ─▶ :165 자동 실행 보정 스레드(reconcile)

[설정 창 저장]  setSettings ─invoke set_settings─▶ settings::update(잠금 안: keep_core_owned 병합→검증→원자 저장→메모리)
   ─▶ emit settings://changed ─▶ window::apply_overlay_window ─▶ (scale) resize_overlay ─▶ (어깨·partPos) refresh_hand_anchor
   ─▶ apply_timer_config_side_effect(publish_timer_change·tray::sync_timer_menu)
[그림 변경]  import/remove/restore_default_asset ─▶ after_asset_change: resize_for_canvas_slot → emit assets://changed → (mouse_base) 기준점
[트레이 새로고침] tray::refresh_overlay(private) = hook::refresh() + overlay WebviewWindow::reload()
[소비] overlay index.tsx:185-186, settings index.tsx:140-141 ── useBridgeEvent(onSettingsChanged / onAssetsChanged) → 상태 통째 교체
```

- **데이터 폴더(실제)**: `%APPDATA%\com.kuro.keyviewer\`(identifier 기준 `app_data_dir()`). 안에 들어 있는 것:
  - `settings.json`
  - `assets/manifest.json`
  - `assets/{file_key}.png`
  - `assets/alarm.{wav|mp3|ogg}`
  - 비정상 종료 때 남는 `*.{pid}-{seq}.tmp`
  - 로그 파일은 없다. 로그는 `env_logger`로 stderr에만 나간다.
- 훅 스레드는 settings·assets를 읽지 않는다. 5분 무입력 판정은 ui 상태 기계(`src/state/inputMachine.ts`)가 한다. 그래서 초기화할 때 훅을 다시 시작할 필요가 없다.
- manifest는 메모리에 캐시하지 않는다. 요청마다 디스크에서 읽는다. `AssetEntry.url`에 `?v={수정시각 ms}`가 붙어 있어서 파일을 다시 쓰면 WebView 캐시가 저절로 무효가 된다.
- ui는 `localStorage`·`sessionStorage`를 쓰지 않는다(overlay 테스트가 0건을 단언한다). 따라서 WebView2 저장소는 초기화 대상이 아니다.

## 2. 계약 목록 (contract.md v0.24, 이번 기능과 관련된 것)

| 종류 | 이름 | 인자 → 반환 | 에러 | 소비자 |
|---|---|---|---|---|
| command | `get_settings` | `()` → `Settings` | `state.poisoned` | overlay·settings |
| command | `set_settings` | `(settings)` → `Settings` | `settings.invalid`·`settings.io`·`window.not_found`·`tauri.error`·`state.poisoned` | settings |
| command | `reset_overlay_position` | `()` → `void` | (v0.14 §5.6) | settings(R-24) |
| command | `set_autostart` | `(enabled)` → `…` | (v0.22 §5.5) | settings(R-23) |
| command | `get_asset_manifest` · `import_asset` · `remove_asset` · `restore_default_asset` · `export_default_assets` | §5.7 | `asset.*` | settings·overlay |
| command | `get_alarm_sound` · `import_alarm_sound` · `remove_alarm_sound` | §5 | — | settings `AlarmSoundCard`(마운트 때 조회) · overlay `useAlarmOnFinish`(끝날 때마다 조회) |
| event | `settings://changed` | `Settings`(전체) | — | overlay·settings |
| event | `assets://changed` | `AssetManifest`(전체, url만) | — | overlay·settings |
| event | `assets://hand-anchor-changed` | `{ anchor: Point \| null }` | — | overlay |
| event | `timer://changed` | `TimerSnapshot` | — | overlay·settings |
| (없음) | 앱 버전·데이터 세대 조회 | — | — | 검색 0건 |

- 에러 형태: `BridgeError { code, message }`, code는 `영역.사유` 문자열이다(§6).
- 명명 규칙: command는 `snake_case 동사_명사`, event는 `도메인://동작`.
- 새 command에는 capability 추가가 필요 없다(등록만 하면 허용, contract.md:1213).
- 핸들러 등록 위치는 `lib.rs:169-192` `generate_handler!`다. bridge 패킷은 관례대로 이 목록 줄만 고친다.

## 3. 상태 기계 (현재)

- **입력 상태 기계(`src/state/`)는 이번 변경과 관계없다.** 이 기능은 상태·전이·타이머 의미를 바꾸지 않는다.
- 초기화 뒤 overlay는 WebView 새로고침으로 앱 재시작과 같은 초기 상태(대기)에서 다시 시작한다. 트레이 「새로고침」과 같은 경로다.
- core 쪽 휘발 상태:

| 상태 | 위치 | 초기화 때 처리 |
|---|---|---|
| `AppState.settings: Mutex<Settings>` | lib.rs:53 | `settings::update`로 기본값 교체 |
| `AppState.hand_anchor` | lib.rs:55 | 다시 계산하고, 바뀌었으면 이벤트 |
| `AppState.timer` (`from_settings`) | lib.rs:127 | `apply_timer_config_side_effect`로 새 타이머 설정 반영 |
| 오버레이 창 크기·위치·클릭 통과·작업표시줄 | window/sizing.rs:70, window/mod.rs:169, placement.rs:265 | 다시 적용하고 기본 위치로 이동 |
| 위치 저장 스레드 | placement.rs:198 | **다시 등록 금지**(앱 수명 동안 1회) |
| 자동 실행 등록(작업 스케줄러 `kuro_keyviewer`) | autostart.rs:37 | 앱 데이터 폴더 밖 OS 등록. 아래 §5-4 참조 |

## 4. 설정 스키마 (현재)

`Settings`(settings/mod.rs:151-173) 필드는 `scale`, `idle_seconds`, `overlay{x,y,visible}`, `mouse: Option<MouseSettings{shoulder, area, part_pos, hand, pen_pos, pen_mode}>`, `autostart`, `language`, `position_lock`, `show_in_taskbar`, `timer{enabled, mode, countdown_secs, alarm_volume, text_pos, rotation, font_size, color}`이다.
- **`version` 필드가 없다**(settings 설계 D19가 일부러 뺐다).
- 기본 그림에 묶인 기본값: shoulder (582,484), part_pos (411,464), pen_pos (372,476), pen_mode true, area, timer text_pos (142,458)·rotation 9. 좌표는 CR-044 값이고 CR-053도 이 값을 그대로 쓴다. 확정사항 §6에 따라 좌표는 현행 유지이고, 타이머 글자만 바뀌었다.
- **core 소유 필드**: `overlay.x/y`, `autostart`. `keep_core_owned`(placement.rs:256)가 ui 저장 때 이 두 값을 보존한다.
- 기본 세트 이력과 세대 번호. 번호는 **보관 폴더 이름과 같게** 매긴다.

| 세대 | CR | 보관 위치 | 장수 |
|---|---|---|---|
| 1 | CR-035 | `doc/assets/defaults-v1/` | 15장 + snapshot json |
| 2 | CR-038 | `doc/assets/defaults-v2/` | 7장(kb_down_0 있음, pomo_char 없음) |
| 3 | CR-044 | `doc/assets/defaults-v3/` | 6장(hair·pomo_char 없음) |
| **4** | CR-053 (「기본 세트 3차」) | `doc/assets/defaults/` = exe 내장 `DEFAULT_ASSETS: [DefaultAsset; 7]` | background·hair·kb_up·mouse_base·pen_up·pen_down_0·pomo_char |

- 사용자는 CR-053을 「3차」라고 부른다. CR-038이 1차 교체, CR-044가 2차 교체였기 때문이다. 세대 번호는 최초 세트를 1로 센다. 두 호칭이 한 칸씩 어긋나므로 문서에는 번호와 CR을 함께 적는다.

## 5. 문제점·제약·중복

1. **세대 판별 수단이 없다.** 세대 상수, 해시, settings `version`, `CARGO_PKG_VERSION` 사용처가 모두 0건이다.
2. **시딩 함정.** manifest가 비어 있어도 기본 파일명 7개 중 하나라도 폴더에 있으면 `FilesPresent`로 건너뛴다(defaults.rs:116-121). 파일을 남기고 manifest만 지우면 다시 시딩되지 않는다. 초기화는 파일까지 지운 뒤 시딩해야 한다.
3. **PNG 본체 쓰기가 원자적이지 않다**(CORE-001 HIGH, assets/mod.rs:310 `fs::write`). manifest와 settings는 원자적으로 쓴다.
   - 이번 설계는 이 결함을 고치지 않는다. 대신 **세대 표식을 맨 마지막에 쓰는 규칙**으로 흡수한다. 도중에 끊기면 표식이 없으므로 다음 시작 때 처음부터 다시 한다.
4. **자동 실행.** `settings.autostart`는 실제 작업 스케줄러 등록 상태를 따라가는 core 소유 값이다.
   - settings.json만 false로 덮으면 이렇게 된다. 시작 시 초기화에서는 같은 실행의 보정 스레드가 곧 되돌린다. 버튼 초기화에서는 다음 재시작 전까지 설정 창과 실제 등록이 어긋난다.
   - 등록을 해제하려면 앱 데이터 폴더 밖(OS)을 건드려야 한다. 이는 사용자 제약(삭제 범위는 앱 데이터 폴더 안)과 충돌한다. → **유지**가 근거에 맞다(02-design §5 D-3).
5. **런타임 재적용 묶음이 흩어져 있다.** 설정 쪽은 `set_settings` 본문(commands/mod.rs:172-230), 그림 쪽은 `after_asset_change`(:138-148)에 있다. `tray::refresh_overlay`는 private이다. 초기화에는 둘을 합친 묶음이 필요하다.
6. **알림음에는 변경 이벤트가 없다.** 다만 설정 창 `AlarmSoundCard`는 타이머 탭이 마운트될 때 조회하고, overlay는 타이머가 끝날 때마다 조회한다. 따라서 기본 설정 탭에서 초기화한 뒤 새 이벤트 없이도 맞는 값을 본다.
7. **두 이벤트의 순서 규칙이 없다.** 설정과 그림이 한 조작으로 함께 바뀌는 첫 사례다. 두 페이로드가 모두 전체 스냅숏이므로 소비자는 순서에 의존하지 않는다(02-design §3에 명시).
8. **버전이 0.1.0에 고정돼 있다.** `tauri.conf.json:4`, `Cargo.toml:3`, `package.json`이 그렇다. `/deploy`는 이미 파일명에 버전을 넣는다(`kuro_keyviewer_{version}_x64-setup.exe`, `kuro_keyviewer-{version}-portable.exe`). 문제는 번호가 안 바뀌었다는 것뿐이다.
9. 문서 불일치(이번 범위 밖, 보고만):
   - 데이터 경로: CLAUDE.md, `/deploy` README 양식, 스킬 §6이 `%APPDATA%\kuro_keyviewer\`라고 적는다(CORE-005).
   - `doc/200_설계/core/assets.md`와 `slot.rs` 주석이 hair·pomo_char를 「내장 기본 없음」으로 적는다(CORE-003/004).
   - 기본 그림 장수가 계약·주석에서 「15장」「6장」으로 제각각이다(BRG-003, CORE-007/008).
   - `/deploy` README 양식에 「이미지 6장 등록」이라는 옛 안내가 남아 있다.

## 6. 참조 리포트

- `.claude/reports/core-survey-20260927-1400.md` (CRITICAL 0 / HIGH 1 / MEDIUM 5 / LOW 3)
- `.claude/reports/bridge-survey-20260927-1400.md` (CRITICAL 0 / HIGH 0 / MEDIUM 3 / LOW 2)
