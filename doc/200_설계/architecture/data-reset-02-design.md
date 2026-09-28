# data-reset 전반 설계 (R-A 베타 세대 초기화 · R-B 전체 초기화 버튼 · R-C 버전 0.1.1)

- 작성: system-architect, 2026-09-27. 작업 모드: **보강**. 분석서: `data-reset-01-analysis.md`.
- 사용자 결정 (🔒 2026-09-27): R-A·R-B·R-C(아래 §0). 인계 순서: `-03-packet-core.md` → `-03-packet-bridge.md` → `-03-packet-ui.md`.

**결론.**
- 데이터 폴더 루트에 **세대 표식 파일** `data-generation.json`을 둔다. exe에 내장된 상수 `DATA_GENERATION = 4`와 이 파일의 값을 비교한다. 파일이 없거나 값이 다르면 시작할 때 앱 데이터를 전부 새 기본으로 초기화한다.
- 설정 창 「전체 초기화」 버튼은 **같은 core 함수**를 부른다.
- 표식은 **맨 마지막에** 쓴다. 도중에 실패하면 표식이 없는 상태로 남으므로 다음 시작 때 자동으로 다시 시도한다. 실패해도 앱 시작은 막지 않는다.
- 비유: 진열대에 「4번째 견본」 딱지를 붙인다. 딱지가 없거나 번호가 다르면 진열대를 비우고 새 견본을 채운 뒤, 맨 마지막에 딱지를 붙인다. 중간에 정전이 나면 딱지가 없으니 다음에 다시 한다.
- 새 의존성 없음. `tauri.conf.json`의 capability·CSP 변경 없음. 버전 필드만 바꾼다(R-C).

## 0. 요구 (사용자 결정 원문 요약, 🔒 2026-09-27)

| ID | 요구 |
|---|---|
| R-A | 앱 시작 시 저장된 「데이터 세대(기본 세트 버전)」가 exe 내장값과 다르거나 없으면 앱 데이터(그림 전부 + manifest + settings.json)를 새 기본으로 **전부** 초기화한다. 사용자 커스텀도 지운다(베타 한정). 정식 배포 전에 「옛 기본 그대로인 칸·좌표만 교체」로 바꿀 예정이다. 따라서 **정책 분기는 한 곳에** 두고, 전환안은 메모로만 남긴다(구현 범위 아님) |
| R-B | 설정 창에 「전체 초기화」 버튼과 확인 창을 둔다. 확인하면 R-A와 같은 초기화를 즉시 수행하고, 오버레이와 설정 창이 새 상태를 반영한다 |
| R-C | 버전을 0.1.1로 올린다(`tauri.conf.json`·`package.json`·`Cargo.toml` 일치). 배포 exe 파일명에 버전을 넣는 문제는 현황 확인 후 **제안만** 한다 |

세부 요구ID(이 설계의 횡단 ID):

| ID | 세부 |
|---|---|
| R-A1 | 세대 표식 저장·읽기(없음·손상 = 「없음」) |
| R-A2 | 시작 시 비교. 불일치·없음이면 전체 초기화(그림·manifest·알림음·settings, D-3 보존 항목 제외) |
| R-A3 | 원자성: 표식 무효화 → 삭제 → 시딩 → 설정 → 표식 기록 순서. 실패 시 표식 없음, 앱 계속, 다음 시작 때 재시도 |
| R-A4 | 삭제 범위는 앱 데이터 폴더 안 **화이트리스트**만. 하위 폴더에 들어가지 않고 링크를 따라가지 않는다 |
| R-A5 | 로그: 판정·결과·소요 시간·에러 code. 경로는 쓰지 않는다 |
| R-A6 | 정책 분기 한 곳(`decide`). 정식 배포 전환안 메모(§8) |
| R-B1 | 기본 설정 탭 「초기화」 카드 + 버튼 + 확인창(ko/ja/en) |
| R-B2 | `reset_app_data` command. 성공하든 실패하든 디스크 사실로 두 창을 맞춘다 |
| R-B3 | 새 에러 코드 `reset.io`·`reset.seed`와 3개 국어 문구 |
| R-C1 | 버전 0.1.1(세 파일 + Cargo.lock) |
| R-C2 | 배포 파일명·README 제안(문서만, §9) |

## 1. 목표 구조

```
[빌드 시] data_reset::DATA_GENERATION = 4 (= doc/assets/defaults/ = 내장 DEFAULT_ASSETS 7장, CR-053)
          가드 테스트: DEFAULT_ASSETS 지문(장수·바이트 합·FNV-1a 64) == 고정값 → 그림만 바꾸고 세대를 안 올리면 cargo test 실패

[앱 시작 lib.rs setup]
 :95 AppPaths ─▶ :96 create_dir_all
 ─▶ ★ settings_state = Mutex::new(settings::load_or_default(..))      (기존 :98을 앞으로 당김)
 ─▶ ★ data_reset::run_startup(&paths, &settings_state)                  (절대 실패를 전파하지 않음, 로그만)
        read_marker(data_dir) ─▶ decide(stored, DATA_GENERATION, POLICY)
          ├ Keep ─▶ 로그 1줄
          └ WipeAll ─▶ reset_data(&paths, &settings_state)
 ─▶ :97 seed_if_empty (유지 — 사용자가 전부 비운 경우 CR-035 S1. 초기화 직후라면 FilesPresent/NotEmpty로 건너뜀)
 ─▶ :99 manifest 로드 … 이후 기존 순서 그대로(AppState.settings = settings_state)
 ─▶ :165 자동 실행 보정(reconcile)이 autostart를 실제 등록 상태로 맞춤(기존)

[reset_data 한 번의 순서 — 시작·버튼 공통, core]
 ① remove_marker (없으면 통과)       ← 이후 어디서 끊겨도 「표식 없음」 = 다음 시작 재시도
 ② wipe: assets/ 바로 아래 일반 파일 중 화이트리스트(*.png, manifest.json, alarm.{wav,mp3,ogg}, *.tmp)
         + 루트의 settings.json·settings.json*.tmp·data-generation.json*.tmp 삭제
 ③ assets::defaults::seed_if_empty(assets_dir) == Seeded(7) 이어야 함, 아니면 reset.seed
 ④ settings::update(settings_mutex, settings_file, |cur| *cur = reset_settings(cur))   ← CR-047 단일 저장 경로
 ⑤ write_marker(data_dir, DATA_GENERATION)  (원자적 쓰기)
 → ResetOutcome { removed, seeded, elapsed_ms }

[설정 창 「전체 초기화」]  ConfirmDialog(danger) ─확인─▶ resetAppData() ─invoke reset_app_data─▶ bridge
   old_timer 복사 ─▶ data_reset::reset_data(&paths, &state.settings) ─▶ (성공·실패 무관) reapply_after_reset:
     emit settings://changed(메모리 Settings) ─▶ emit assets://changed(디스크 manifest)
     ─▶ window::apply_overlay_window ─▶ window::resize_overlay(canvas, scale) ─▶ 기본 위치로 이동(reset_overlay_position과 같은 core 함수)
     ─▶ refresh_hand_anchor(항상 재계산, 바뀌면 이벤트) ─▶ apply_timer_config_side_effect(old_timer, new_timer)
     ─▶ tray::refresh_overlay (hook::refresh + overlay WebView reload)
   ◀ Ok(()) 또는 Err(reset.io | reset.seed | settings.io | state.poisoned)
   설정 창: settings://changed·assets://changed로 화면 갱신(기존 구독) → 상태 줄 「초기화했습니다.」
```

판정 로직을 둘 곳(원칙: 한 곳):

| 판정 | 위치 | 근거 |
|---|---|---|
| 초기화할지 | core `data_reset::decide` **한 곳** | R-A6. 정책 전환은 이 함수와 `POLICY` 상수만 바꾼다 |
| 무엇을 지울지 | core `data_reset::wipe` 화이트리스트 | R-A4. ui·bridge는 범위를 모른다 |
| 무엇을 보존할지 | core `data_reset::reset_settings(&Settings) -> Settings` | core 소유 필드 규칙(`keep_core_owned`)과 같은 층 |
| 확인창을 띄울지 | ui | 파괴 조작 확인은 ui 규칙(ui-design-strategy §11) |
| 두 창 동기화 | 기존 이벤트 2개(전체 스냅숏) + overlay 새로고침 | 새 이벤트를 만들지 않는다 |

## 2. 상태 기계 확정본

**입력 상태 기계(`src/state/`)는 변경하지 않는다.**
- 초기화 뒤 overlay는 WebView를 새로고침해서 앱 재시작과 같은 초기 상태에서 다시 시작한다. 트레이 「새로고침」(CR-046)과 같은 경로다.
- 설정 창 쪽 새 로컬 상태는 `GeneralTab`에 둔다.

| 상태 | 값 | 전이 |
|---|---|---|
| `resetDialogOpen` | boolean | 버튼 → true, 취소·Esc·확인 → false |
| `resetPhase` | `'idle' \| 'pending' \| 'done'` | 확인 → pending, 성공 → done, 실패 → idle(오류 줄), 다른 조작 없음. 타이머 없음 |

## 3. 계약 변경 목록 (contract v0.24 → v0.25, 모두 추가)

| 종류 | 이름 | 변경 | 하위 호환 | 소비자 |
|---|---|---|---|---|
| command | `reset_app_data() -> void` | **추가.** 앱 데이터 전체 초기화(§1 순서). 에러: `reset.io`·`reset.seed`·`settings.io`·`state.poisoned`. 부수 효과: `settings://changed`, `assets://changed`, (값이 바뀌면) `assets://hand-anchor-changed`, (타이머 설정이 바뀌면) `timer://changed`·트레이 메뉴 동기화, 오버레이 창 적용·리사이즈·기본 위치 이동, 오버레이 WebView 새로고침. **실패해도 이벤트는 보낸다**(디스크 사실 기준) | 추가 | settings |
| TS 래퍼 | `resetAppData(): Promise<void>` | **추가**(`src/bridge/commands.ts`) | 추가 | settings |
| 에러 코드 | `reset.io` | **추가.** 파일 삭제·표식 기록 실패. 일부만 초기화됐을 수 있고, 다음 시작 때 자동으로 다시 시도한다. message에 경로를 넣지 않는다 | 추가 | settings(3개 국어 문구) |
| 에러 코드 | `reset.seed` | **추가.** 비운 뒤 내장 기본 그림 등록 실패. 다음 시작 때 자동 재시도 | 추가 | settings |
| 순서 규칙 | `settings://changed` ↔ `assets://changed` | **비파괴 주석.** 한 조작이 둘을 함께 보낼 수 있다(v0.25 `reset_app_data`). 두 페이로드는 전체 스냅숏이므로 **소비자는 도착 순서에 의존하지 않는다**. 보내는 쪽 순서는 settings → assets로 고정한다 | 비파괴 | overlay·settings |
| event | — | **추가 없음.** 알림음은 이벤트 없이 조회 시점에 맞는 값을 받는다(분석서 §5-6) | — | — |
| capability | — | **변경 없음**(앱 command는 등록만 하면 허용) | — | — |

- 파괴 변경은 없다. 기존 command·event의 의미는 그대로다.
- 앱 버전·세대를 ui에 노출하는 command는 만들지 않는다(요구 없음 → §10 「확인 필요」).

## 4. 설정 스키마 변경

| 키 | 타입 | 기본값 | 검증 범위 | 마이그레이션 |
|---|---|---|---|---|
| (settings.json) | — | **변경 없음** | — | `version` 필드를 **추가하지 않는다.** 세대는 별도 파일에 둔다(§5 D-1) |
| **신규 파일** `data-generation.json` (데이터 폴더 루트, settings 스키마 밖) | `{ "generation": u32, "appVersion": string }` | 없음(초기화 완료 때 core가 씀) | `generation`만 판정에 쓴다. `appVersion`(`CARGO_PKG_VERSION`)은 진단용이다 | 없음·파싱 실패·필드 없음 = 「없음」 → 초기화 |

세대 표식을 settings.json이 아닌 별도 파일에 두는 근거:
1. settings.json은 초기화 대상이다. 표식을 그 안에 두면 「지운다」와 「완료를 기록한다」가 한 파일에 섞여서 ⑤를 마지막에 쓰는 규칙을 지킬 수 없다.
2. settings.json이 손상돼 `load_or_default`로 읽히는 경우에도 판정은 멀쩡해야 한다.
3. `Settings`는 계약 타입이다. 필드를 추가하면 TS 타입·set_settings 병합까지 번진다. 표식은 core 내부 사실이라 계약 밖에 둔다.

`reset_settings(current)` 결과 = `Settings::default()`에 다음을 덮는다.
- `autostart = current.autostart`: 보존. D-3.
- `language`: D-2 결정 전 기본값은 **초기화**다. R-A 문언을 따른 것이고, 결정이 나면 이 한 줄만 바꾼다.
- `overlay`는 기본값(기본 위치)으로 돌린다. `keep_core_owned`를 쓰지 않는다.

## 5. 사용자 결정 사항

### 확정 (🔒 2026-09-27, 사용자)

R-A(베타 한정 전부 초기화, 커스텀 삭제), R-B(버튼 + 확인창, 즉시 반영), R-C(0.1.1, 파일명은 제안만).

### 설계 판단 (근거 첨부, 이견 없으면 그대로 진행 — 보고서 「결정 필요」에 올림)

| ID | 쟁점 | 대안 · 근거 | 설계 채택 |
|---|---|---|---|
| D-1 | 세대 값을 무엇으로 정하나 | **A. 수동 상수 `DATA_GENERATION: u32 = 4` + 지문 가드 테스트.** 뜻이 분명하고 보관 폴더 번호(v1~v3)와 이어진다. 기본 그림을 바꾸고 번호를 안 올리면 가드 테스트가 실패하므로 올리는 걸 잊을 수 없다. **B. 내장 바이트·기본 설정의 해시를 자동 세대로.** 잊을 일이 없다. 하지만 기본 그림과 무관한 설정 키 하나만 추가해도 해시가 바뀌어 베타 사용자 데이터가 모두 지워진다. **C. 앱 버전을 세대로.** 버그 수정 배포(0.1.2)만으로도 전부 지워진다 | **A** |
| D-2 | 언어(`language`)도 초기화하나 | 초기화: R-A 문언(「settings.json 전부」)과 일치한다. 일본어·영어 베타 사용자는 업데이트 직후 한국어 화면을 보게 된다. 유지: 언어는 기본 그림 세트와 관계가 없다 | **초기화(문언 우선), 유지 권고** — 사용자 결정 |
| D-3 | 자동 실행 등록과 `autostart` | 유지: `autostart`는 OS 등록을 따라가는 core 소유 값이다. 해제하려면 앱 데이터 폴더 밖(작업 스케줄러)을 건드려야 해서 사용자 제약과 충돌한다. 버튼 초기화 뒤 설정 창과 실제 등록이 어긋나지 않는다. 해제: 「전부」에 더 가깝지만 제약 위반이고 schtasks 실패 경로가 늘어난다 | **유지**(등록·`autostart` 값 모두 그대로) |
| D-4 | 알림음 파일 `assets/alarm.*` | 삭제: `assets/` 안의 사용자 파일이고 「전체 초기화」라는 이름에 맞는다. 타이머 설정(음량 등)도 기본으로 돌아가므로 짝이 맞는다. 유지: 기본 그림 세트와 무관하다 | **삭제** |
| D-5 | 오버레이 위치 | 기본 위치로 이동: 「전부 초기화」와 일치하고 기존 「위치 초기화」와 같은 결과다. 유지: 사용자가 옮겨 둔 자리를 지킨다 | **기본 위치로** |
| D-6 | 표식 값이 exe보다 **큰** 경우(새 exe를 쓰다가 옛 exe를 실행) | R-A 문언 「다르면」 그대로 초기화한다. 베타 동안 옛 exe로 돌아갈 일은 드물다 | **문언대로 초기화** |
| D-7 | **개발 PC 데이터 보호.** dev(`yarn tauri dev`)와 release가 같은 데이터 폴더(`%APPDATA%\com.kuro.keyviewer\`)를 쓴다. 개발 PC에는 표식이 없으므로 새 코드로 **처음 실행하는 순간 개발자 그림·좌표·알림음이 초기화된다**(기본 그림 7장은 같은 원본이라 다시 채워지지만, 좌표·언어·타이머 설정·알림음은 사라진다) | **A.** 메인 세션이 사용자 승인을 받아, 처음 실행하기 전에 데이터 폴더를 백업한다(코드 변경 없음). **B.** debug 빌드에서는 시작 초기화를 건너뛰고 로그만 남긴다. 시작 경로를 dev에서 확인할 수 없게 되고, 요구 밖 분기가 생긴다. **C.** 처음 실행하기 전에 메인 세션이 표식 파일(`{"generation":4}`)을 손으로 만든다. 초기화가 일어나지 않아 현재 데이터를 그대로 유지하지만, 시작 경로를 실제로 볼 수는 없다 | **A**(필요하면 C 병행) — 사용자 결정 |

## 6. 종단간 RTM

| 요구ID | 요구 | ui | bridge | core | 설정 키·파일 | 테스트 | 상태 |
|---|---|---|---|---|---|---|---|
| R-A1 | 세대 표식 읽기·쓰기 | - | - | `data_reset::generation` `read_marker`·`write_marker`·`remove_marker` | `data-generation.json` | core `marker_roundtrip`·`marker_missing_is_none`·`marker_corrupt_is_none` | 설계 |
| R-A2 | 불일치·없음 → 전체 초기화 | - | - | `run_startup` → `decide` → `reset_data`, lib.rs 호출 위치 | settings 전체, `assets/*` | core `reset_from_v3_with_custom_settings`·`fresh_empty_dir_is_seeded`·`startup_skips_when_generation_matches` | 설계 |
| R-A3 | 원자성·실패 시 계속·재시도 | - | - | `reset_data` 순서 ①~⑤, `run_startup` 무전파 | `data-generation.json` | core `failure_leaves_no_marker_and_retries`·`startup_never_panics_on_failure` | 설계 |
| R-A4 | 삭제 범위 한정 | - | - | `data_reset::wipe` 화이트리스트 | - | core `wipe_keeps_unknown_files_and_subdirs`·`wipe_never_touches_outside_data_dir` | 설계 |
| R-A5 | 로그 | - | - | `run_startup`·`reset_data` `log::info!/warn!` | - | 코드 리뷰(경로 미포함) | 설계 |
| R-A6 | 정책 분기 한 곳 + 전환 메모 | - | - | `decide`·`ResetPolicy`·`POLICY` | - | core `decide_table` | 설계 |
| R-A2' | 세대 올림 누락 방지 | - | - | `DEFAULT_ASSETS_FINGERPRINT` 가드 | - | core `generation_fingerprint_guard` | 설계 |
| R-B1 | 버튼 + 확인창 3개 국어 | `GeneralTab` 「초기화」 카드, `ConfirmDialog`, i18n 키 8개 | - | - | - | ui TC(버튼·확인·취소·pending·done·오류), i18n 키 검사 | 설계 |
| R-B2 | 즉시 초기화 + 두 창 반영 | `resetAppData()` 호출, 기존 `onSettingsChanged`·`onAssetsChanged` | `reset_app_data`, `resetAppData`, `reapply_after_reset` | `reset_data`, `tray::refresh_overlay`(pub(crate)) | - | bridge Rust `reset_app_data_*`·vitest `resetAppData` / ui TC / 수동 M(앱 실행 캡처) | 설계 |
| R-B3 | 에러 코드·문구 | i18n `errors['reset.io']`·`errors['reset.seed']` | contract §6 `reset.io`·`reset.seed`, TS `ErrorCode` | `ResetError::code()` | - | core `reset_error_codes` / ui i18n 검사 | 설계 |
| R-C1 | 버전 0.1.1 | `package.json` | - | `Cargo.toml`, `tauri.conf.json`, `Cargo.lock` | - | 세 파일 대조 + `cargo check` exit 0 | 설계 |
| R-C2 | 배포 파일명 제안 | - | - | - | - | 해당 없음(제안, §9) | 제안 |

끊긴 곳은 없다(`-`는 해당 없음). 요구 3건 → 세부 12행(R-C2는 제안). 계층별로는 ui 4건(R-B1·R-B2·R-B3·R-C1), bridge 2건(R-B2·R-B3), core 10건(R-A1~A6·R-A2'·R-B2·R-B3·R-C1)이다.

## 7. 비기능 목표와 측정

| 항목 | 목표 | 측정 |
|---|---|---|
| 평소 시작 추가 비용 | ≤ 5 ms(작은 파일 1개 읽기 + 비교) | `run_startup` Keep 경로 로그의 elapsed |
| 초기화 1회(시작·버튼) | ≤ 300 ms(삭제 + 7장 시딩 + 설정·표식 원자 쓰기) | `ResetOutcome.elapsed_ms` 로그, core 테스트 실측을 완료 보고에 |
| 버튼 초기화 중 UI 정지 | ≤ 300 ms(동기 command, `set_settings`와 같은 방식) | 수동 확인 |
| 메모리 | 추가 힙 없음(내장 바이트는 정적) | 코드 리뷰 |

## 8. 정식 배포 전환안 (메모 — 구현 범위 아님)

정식 배포 전에는 `POLICY`를 `ResetPolicy::ReplaceUntouchedDefaults`로 바꾸고 `decide`의 분기 하나만 추가한다. 바뀌는 곳은 `data_reset` 모듈 안뿐이다.
- **그림.** 칸마다 현재 파일 지문(크기 + FNV-1a 64)이 **옛 세대 기본 그림 지문표**(v1~v3, 그리고 이후 세대가 `defaults-v4`로 옮겨지면 그것까지)의 같은 슬롯 값과 같을 때만 새 기본으로 교체한다. 옛 기본에는 있었지만 새 기본에 없는 칸(예: v3 `kb_down_0`)도 지문이 같으면 비운다.
  - 지문표는 exe에 **바이트가 아니라 지문만** 넣는다(수십 바이트). 새 의존성 없이 FNV를 직접 구현한다(20줄 안팎).
  - 원본은 `doc/assets/defaults-v{N}/`이고, 지문은 `build.rs` 또는 테스트가 생성·검증하는 상수로 둔다.
- **좌표.** `shoulder`·`part_pos`·`pen_pos`·`pen_mode`·`area`·`timer.text_pos`·`timer.rotation`이 옛 세대 기본값 표(CR-035·038·044 값)와 **정확히 같을 때만** 새 기본으로 바꾼다. 사용자가 끌어 옮긴 값은 유지한다.
- **표식**은 같은 파일과 같은 규칙을 쓴다(⑤ 마지막 기록).
- 전환 시 `decide_table` 테스트에 행을 추가하고, `reset_from_v3_*` 테스트의 기대값을 「옛 기본 칸만 교체, 커스텀 칸 유지」로 나눈다.

## 9. R-C2 배포 파일명 현황과 제안 (제안만)

- 현황(`.claude/commands/deploy.md` §2): 인스톨러 `kuro_keyviewer_{version}_x64-setup.exe`(Tauri 기본), 포터블 `kuro_keyviewer-{version}-portable.exe`(복사 때 이름 변경). **이미 버전이 들어간다.** 0.1.1로 올리면 파일명과 exe 파일 속성(제품 버전)이 자동으로 구분된다.
- 제안:
  1. 베타 전달은 `src-tauri/target/release/kuro_keyviewer.exe`를 그대로 보내지 말고 `/deploy` 산출물(버전이 붙은 이름)만 보낸다.
  2. `/deploy` README 양식의 데이터 위치를 `%APPDATA%\com.kuro.keyviewer\`로 고친다.
  3. 「이미지 6장 등록」 문구를 「기본 그림이 들어 있음」으로 고친다.
  4. 0.1.1 README에 「처음 실행하면 이전 버전의 그림·설정이 새 기본으로 초기화됩니다(베타)」 한 줄을 넣는다.
- 위 제안은 명령 문서 수정이다. 사용자가 승인하면 메인 세션이 처리하며, 이 설계의 인계 패킷에는 넣지 않는다.

## 10. 확인 필요 (요구 밖 — 만들지 않음)

- 설정 창에 앱 버전 표시(베타 사용자가 새 exe인지 확인하는 용도). 요구 승격이 필요하다.
- 초기화 전 옛 데이터 백업 폴더. R-A가 「커스텀도 지워짐」을 받아들였으므로 넣지 않는다.
- CORE-001(PNG 본체 비원자 쓰기) 수정. 이번 설계는 표식 규칙으로 흡수하며, 별도 core 보강 건으로 남긴다.
