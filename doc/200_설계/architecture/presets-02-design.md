# presets 전반 설계 (프리셋 — PS-01~PS-10)

- 근거: `doc/000_프로젝트_확정사항.md` §6 「프리셋 (🔒 2026-09-30 사용자 지정, PS-01~PS-10)」, §3(이미지 규격)·§4(레이어)·§6(기본 세트 4차·데이터 초기화)·§7(폴더).
- 작업 모드: **보강**(core·bridge·설정 창이 모두 구현돼 있고 기능을 더한다).
- 판별: **횡단** — core(새 모듈 `presets`, `assets` 가시성 소폭 확대, `AppPaths` 메서드 1개) + bridge(새 command 7·타입 4·에러 code 13) + ui(설정 창 새 「프리셋」 탭·아이콘·문구 3개 국어). 세 계층이 모두 바뀐다.
- 현황 근거: 이번 세션은 서브에이전트라 분석가 위임 없이 소스를 직접 읽었다(`src-tauri/src/{lib.rs, assets/*, settings/{mod,store,timer}.rs, data_reset/{mod,wipe}.rs, bridge/commands/mod.rs}`, `doc/200_설계/bridge/contract.md` v0.29, `src/settings/{index.tsx, components/*, design.md}`). 구조 분석서(01)는 따로 만들지 않고 §1에 요약한다(pomodoro 선례).
- 인계 순서: `presets-03-packet-core.md` → `presets-03-packet-bridge.md` → `presets-03-packet-ui.md`.

## 0. 결론

비유: 프리셋은 **옷장 속 옷 한 벌 세트**다. 「저장」은 지금 입은 옷을 통째로 복사해 옷걸이에 거는 것, 「적용」은 걸린 세트를 꺼내 지금 옷을 **전부 갈아입는 것**(없는 품목은 벗는다), 「내보내기·가져오기」는 옷걸이째 다른 집으로 옮기는 것이다. 옷걸이의 옷은 갈아입은 뒤 입은 옷을 더럽혀도 바뀌지 않는다(PS-10). 신발장(창 위치·언어·자동 실행 등 PC별 설정)은 세트에 들어가지 않는다(PS-03).

1. **새 core 모듈 `presets`**(`src-tauri/src/presets/`)가 프리셋의 단일 소유자다. 폴더 = `%APPDATA%\com.kuro.keyviewer\presets\{id}\`, 안에 `preset.json` 1개 + `{file_key}.png` + (있으면) `alarm.{wav|mp3|ogg}`. 파일명 규칙은 기존 `assets`의 `{file_key}.png`와 `sound`의 `alarm_file_name`을 그대로 쓴다.
2. **목록은 폴더 스캔**(인덱스 파일 없음). 폴더가 곧 진실이라 인덱스와 어긋날 일이 없다. 프리셋은 수십 개 이하라 스캔 비용이 작다.
3. **적용(PS-04)은 「검증 먼저, 메모리에 다 읽고, 교체, 실패하면 되돌리기」**. 적용 전에 프리셋 폴더 전체를 가져오기와 같은 검증기로 다시 검사하고(손상 → 아무것도 안 바뀜), 교체 대상 현재 파일(PNG·알림음·manifest.json)의 옛 바이트를 메모리에 잡아 둔 뒤 새 파일을 쓴다. 파일 교체나 설정 저장이 실패하면 옛 바이트로 되돌린다. 설정 병합은 **PS-02 필드 4개(`scale`·`idleSeconds`·`mouse`·`timer`)만 덮는다** — 나머지 5개(`overlay`·`autostart`·`language`·`positionLock`·`showInTaskbar`)는 그대로(PS-03).
4. **화면 반영은 data_reset 선례**: 적용 뒤 `settings://changed` → `assets://changed` 재방출, 오버레이 리사이즈(캔버스·배율), 손 기준점 **항상** 재계산, 타이머 설정 부수 효과(`set_settings` 6단계와 같은 판정). **새 이벤트 없음**, 오버레이 새로고침 없음(U-6).
5. **가져오기(PS-06)는 「임시 폴더에 검증된 바이트만 써서 한 번에 rename」**. `preset.json`이 적은 파일 이름만 읽고(화이트리스트), 파일 이름은 JSON 문자열이 아니라 슬롯 enum에서 다시 만든다(경로 탈출 원천 차단). 링크·재분석 지점은 거부. 파일별 문제는 **거부가 아니라 보고서**(`problems[]` = 파일명 + 기존 에러 code)로 돌려줘 ui가 3개 국어로 「어느 파일이 왜」를 보여 준다. 문제가 하나라도 있으면 등록하지 않는다.
6. **내보내기(PS-05)**: 사용자가 고른 폴더 아래 `{이름}`(파일 이름에 쓸 수 없는 글자를 `_`로 바꾼 것) 새 폴더에 프리셋 파일을 복사한다. 이미 있으면 `preset.export_exists`. **zip 없음, 새 의존성 없음**(`std::fs`만).
7. **계약 v0.30: 새 command 7개 + 타입 4개 + 에러 code 13개, 전부 「추가」**. 기존 command·event·타입은 한 글자도 바뀌지 않는다. capabilities 변경 없음(`dialog:allow-open`·`pickFolder` 재사용, asset scope 불변).
8. **저장 조건(PS-08)은 ui가 매니페스트로 먼저 판정**(버튼 비활성 + 이유), core도 같은 조건을 다시 검사해 거부한다(방어).

## 1. 현황 요약 (구조 분석)

```
설정 창 ─ importAsset/removeAsset/restoreDefaultAsset ─▶ core assets (assets/{file_key}.png + manifest.json)
        ─ importAlarmSound/removeAlarmSound            ─▶ core assets::sound (assets/alarm.{wav|mp3|ogg}) — 이벤트 없음
        ─ setSettings(Settings 전체)                    ─▶ core settings::update(잠금 안 병합·검증·원자 저장) ─▶ settings://changed
        ─ resetAppData()                               ─▶ core data_reset::reset_data ─▶ bridge 뒤처리(emit 2종·리사이즈·손 기준점·타이머·새로고침)
오버레이 ─ settings://changed · assets://changed · assets://hand-anchor-changed · timer://changed 구독
        ─ 알림음은 울릴 때 getAlarmSound()로 조회(useAlarmOnFinish)
```

| 항목 | 현황(파일) | 이번 설계에 주는 제약 |
|---|---|---|
| 앱 데이터 경로 | `AppPaths { data_dir, assets_dir, settings_file }`(`lib.rs:40`). 통합 테스트 `tests/data_reset.rs`가 구조체 리터럴로 만든다(3곳) | 필드를 늘리면 테스트가 깨진다 → **메서드 `presets_dir()`** 로 추가 |
| 그림 저장 | `assets/{file_key}.png`, 경로는 항상 `stored_file_name(slot)`(비공개)으로 만든다(SEC-002). 크기 선검사 `metadata` + `read_capped`(비공개, SEC-003). 규격 검사 `parse_png_header`·`validate`(공개), 캔버스 기준 `group_size`(비공개), `recompute_canvas`(비공개) | 재사용하려면 `pub(crate)`로 넓힌다. 규격 규칙을 새로 쓰지 않는다 |
| 알림음 | `assets::sound` — 매직 바이트 판별 `detect_format`(공개), 고정 이름 `alarm_file_name`(공개), 1MiB. **이벤트 없음**(A-1: 쓰는 쪽이 조회) | 적용 뒤 알림음 변경도 이벤트가 필요 없다. 설정 창 알림음 카드는 타이머 탭을 열 때(마운트) 다시 조회한다 |
| 설정 저장 | `settings::update`가 유일한 창구(CR-047). 클로저 안에서는 필드 대입·순수 병합만 | 적용의 설정 병합도 `update` 한 번. 새 저장 경로 금지 |
| Settings 필드 | `scale, idle_seconds, overlay, mouse, autostart, language, position_lock, show_in_taskbar, timer`(9개, `settings/mod.rs:155`) | PS-02 = 4개, PS-03 = 5개. 필드가 늘면 분류를 강제할 장치가 필요(§5 가드) |
| 원자적 쓰기 | `settings::write_atomic`(고유 임시 → sync → rename), `read_capped_string`(1MiB) | preset.json 쓰기·읽기에 그대로 |
| 링크 방어 | `data_reset::wipe` — `symlink_metadata` + `FILE_ATTRIBUTE_REPARSE_POINT`(0x400) 검사(`is_link_like`, 비공개) | 같은 판정을 presets에도 쓴다(작은 순수 함수라 presets 안에 둔다 — 모듈 간 비공개 공유보다 단순) |
| 전체 교체 선례 | `reset_app_data` 뒤처리(`bridge/commands/mod.rs:670` `reapply_after_reset`) | 적용 뒤처리가 같은 헬퍼(`refresh_hand_anchor`·`apply_timer_config_side_effect`·`load_manifest_or_warn`)를 쓴다 |
| 데이터 초기화 | `wipe`는 `assets/` 바로 아래 파일과 데이터 폴더 `.tmp`만 지운다. **하위 폴더에 들어가지 않는다** | `presets/`는 전체 초기화·세대 초기화에서 **자동으로 살아남는다**(U-1) |
| command 직렬화 | 앱 데이터를 쓰는 command는 전부 **동기**(계약 §5.10 C-4 불변식) | 프리셋 command 7개도 전부 동기 |
| 호출 창 제한 | `reset_app_data`만 `ensure_reset_caller`(SEC-002) | 되돌릴 수 없는 프리셋 조작도 같은 방식(A-5) |
| 파일 크기 | `bridge/commands/mod.rs` **709줄**(한계 800) | 프리셋 핸들러는 새 파일 `bridge/commands/presets.rs` |
| `lib.rs` 등록 | `generate_handler!`는 core 소유 파일 — bridge-implementer 가드가 막는다(v0.21·v0.25 선례) | 등록 7줄은 bridge 단계에서 core-implementer가 한다(bridge 패킷 §6) |
| 계약 | v0.29, command 23·event 7, 에러 code 27(+TS `unknown`) | 이번 개정 = **v0.30** |
| asset scope | `$APPDATA/assets/**`(tauri.conf.json) | 프리셋 폴더 그림을 화면에 띄우지 않으므로(PS-09에 썸네일 없음) scope 변경 없음 |
| 설정 창 탭 | `TAB_IDS = ['general','images','mouse','timer']`, `TabIcon` 인라인 SVG | 다섯째 `presets` 추가 |

## 2. 목표 구조

```
[설정 창 PresetsTab] (사이드바 다섯째)
  ├─ PresetSaveCard  이름 입력 + 「저장」  ─ savePreset(name)   ─▶ save_preset   ─▶ presets::save
  │                  「폴더에서 가져오기」 ─ pickFolder → importPreset(dir) ─▶ import_preset ─▶ presets::import_from
  │                                        (problems[]가 있으면 파일별 문제 목록 표시)
  └─ PresetCard × N  이름·저장 날짜·그림 N장·알림음 있음/없음
        ├─ 적용      ─ 확인창 ─ applyPreset(id)  ─▶ apply_preset ─▶ presets::apply ─▶ (뒤처리) settings://changed · assets://changed
        │                                                           · 리사이즈 · 손 기준점 · 타이머 부수 효과
        ├─ 내보내기  ─ pickFolder → exportPreset(id, dir) ─▶ export_preset ─▶ presets::export_to
        ├─ 이름 바꾸기(인라인 입력) ─ renamePreset(id, name) ─▶ rename_preset ─▶ presets::rename
        └─ 삭제      ─ 확인창 ─ deletePreset(id) ─▶ delete_preset ─▶ presets::delete
  목록 갱신 = 마운트 때 + 변경 command 성공 뒤 listPresets() 재조회 (이벤트 없음)

core presets (신규)
  mod.rs     공개 API · PresetError · PresetSummary · 보고서 타입
  format.rs  preset.json 구조체(PresetFile·PresetSettings) · 이름 규칙 · id 규칙 · 내보내기 폴더 이름
  scan.rs    list · 남은 임시 폴더 정리 · rename · delete
  load.rs    폴더 검증기(가져오기·적용 공용) → ValidatedPreset(메모리) 또는 problems
  write.rs   save · import 커밋(스테이징 → rename) · export 복사
  apply.rs   백업(옛 바이트) → 교체 → 설정 병합 → 실패 시 되돌림
      의존: assets(규격 검사·파일 이름·매니페스트), assets::sound(형식 판별), settings(update·write_atomic·read_capped_string)
      core는 ui·bridge를 모른다. 이벤트는 bridge 뒤처리만.
```

### 2.1 프리셋 폴더 형식 (파일 형식 = 저장 폴더 = 내보낸 폴더)

```
presets/
  1790000000000/            ← id (폴더 이름)
    preset.json
    kb_up.png  mouse_base.png  background.png  kb_down_0.png  pen_down_0.png ...   ← {file_key}.png
    alarm.mp3               ← 있을 때만, alarm_file_name(format)
  .staging-1790000000123/   ← 저장·가져오기 도중 임시(점으로 시작 — 목록에서 무시, 다음 변경 때 정리)
  .trash-1790000000000/     ← 삭제 도중 임시(같음)
```

`preset.json` (camelCase, UTF-8, `to_string_pretty`, 1MiB 이하):

```json
{
  "formatVersion": 1,
  "name": "고양이 A",
  "savedAt": 1790000000000,
  "images": ["kb_up", "background", "mouse_base", {"kind": "kb_down", "index": 0}, {"kind": "pen_down", "index": 0}],
  "alarm": "mp3",
  "settings": {
    "scale": 1.0,
    "idleSeconds": 300,
    "mouse": { "shoulder": {"x": 582, "y": 484}, "area": [...], "partPos": {...}, "hand": null, "penPos": {...}, "penMode": true },
    "timer": { "enabled": false, "mode": "stopwatch", "countdownSecs": 1500, "alarmVolume": 44, "textPos": {...}, "rotation": 7, "fontSize": 36, "color": "#333333" }
  }
}
```

| 필드 | 타입 | 규칙 |
|---|---|---|
| `formatVersion` | u32 | 이번 = `1`. 다르면 `preset.format`(미래 형식은 읽지 않는다) |
| `name` | string | 앞뒤 공백 제거 후 1~50자(`chars().count()`), 제어 문자 없음(A-8) |
| `savedAt` | u64 (Unix ms) | 저장 시각 `SystemTime::now()`. 가져오기는 원본 값 유지(U-5). 화면은 로컬 날짜로 표시 |
| `images` | `AssetSlot[]` | 기존 `AssetSlot` serde 그대로(모르는 슬롯 → `preset.format`). 중복 슬롯(`file_key` 같음) 금지, 최대 64개. **파일 이름은 이 목록에서 `{file_key}.png`로 다시 만든다 — JSON에 파일 이름 문자열을 두지 않는다**(경로 탈출 원천 차단) |
| `alarm` | `"wav"\|"mp3"\|"ogg"\|null` | 기존 `AlarmFormat`. 있으면 `alarm_file_name(format)` 파일이 있어야 하고 매직 바이트가 같은 형식이어야 한다 |
| `settings` | `PresetSettings` | PS-02 필드만 — `scale`·`idleSeconds`·`mouse`(`MouseSettings \| null`, 기존 구조체 그대로)·`timer`(`TimerSettings` 그대로). 컨테이너 `#[serde(default)]`(빠진 키는 `Settings::default()` 값), 읽을 때 `settings::load`와 같은 보정(유휴 시간 clamp, `timer::normalize`) 후 `Settings::validate`로 검사 |
| id(폴더 이름) | string | `^[0-9a-z][0-9a-z-]{0,39}$`. 생성 = `{Unix ms}`, 이미 있으면 `{Unix ms}-{n}`(n=1..). `fs::create_dir`(없을 때만 성공)로 **자리 선점**. `preset.json`에 id를 넣지 않는다 — 다른 PC에서 가져오면 새 id를 받는다 |

- `images` 목록 순서 = 저장 때 매니페스트 순서. 가져오기·적용의 캔버스 판정은 이 순서의 **첫 캔버스 레이어**가 기준(기존 `recompute_canvas`와 같은 규칙).
- 폴더 안 다른 파일·하위 폴더는 무시한다(읽지도 복사하지도 않는다).

## 3. 동작 확정본

### 3.1 저장 (PS-01·PS-02·PS-08)

1. 이름 검사(A-8) → 실패 `preset.invalid_name`.
2. 매니페스트 읽기. `kb_up`·`mouse_base` 중 없는 것이 있으면 `preset.missing_required`(ui가 먼저 막지만 core도 막는다).
3. 설정 잠금 → `PresetSettings::from(&Settings)` 복사 → 잠금 해제(짧게).
4. 알림음 `sound::current` → 형식(있으면).
5. 남은 임시 폴더 정리(최선, 실패는 경고) → id 선점(`presets/.staging-{id}` 생성).
6. 매니페스트의 각 항목: `assets/{file_key}.png`를 `symlink_metadata`로 일반 파일 확인 → 1MiB 상한 읽기 → 스테이징에 같은 이름으로 쓰기. 알림음 같음. `preset.json`은 마지막에 `write_atomic`.
7. `rename(.staging-{id} → {id})`. 어느 단계든 실패하면 스테이징을 `remove_dir_all`(최선)하고 `preset.io`. **실패하면 목록에 아무것도 생기지 않는다.**
8. `PresetSummary` 반환.

### 3.2 적용 (PS-04·PS-03·PS-10)

비유: 이사 짐 바꾸기. 새 짐을 전부 검사해 트럭에 싣고(검증·메모리), 옛 짐 사진을 찍어 둔 다음(백업), 방을 바꾼다. 도중에 문이 안 열리면 사진대로 되돌린다.

| # | 단계 | 실패 시 | 디스크 |
|---|---|---|---|
| 1 | id 규칙 검사 → `presets/{id}` 가 링크 아닌 폴더인지 | `preset.not_found` | 불변 |
| 2 | **검증기(§3.4)로 폴더 전체 읽기** — 모든 PNG·알림음 바이트를 메모리에, 문제가 하나라도 있으면 거부 | `preset.format`·`preset.invalid_settings`·`preset.damaged`(첫 문제 파일명을 message에) | 불변 |
| 3 | 백업: 옛 매니페스트의 모든 `{file_key}.png` + 새로 쓸 이름 + `alarm.{wav,mp3,ogg}` + `manifest.json` — 각 파일의 옛 바이트(없으면 「없음」)를 메모리에 | `preset.io` | 불변 |
| 4 | 교체: 새 PNG 전부 `write_atomic` → 옛 매니페스트에만 있던 PNG 삭제 → 알림음(있으면 `write_atomic` + 다른 두 형식 삭제, 없으면 세 이름 삭제) → 새 매니페스트 `save_manifest`(엔트리는 새 파일로 만든 `AssetEntry` — `url`은 `versioned_asset_url`, 캔버스는 `recompute_canvas`) | **되돌림**(백업 바이트 쓰기·없던 파일 삭제) → `preset.io` | 되돌림 성공 = 불변 |
| 5 | 설정 병합 `settings::update(|cur| preset.settings.merge_into(cur))` — `scale`·`idle_seconds`·`mouse`·`timer` 4개만 대입 | **되돌림**(4의 파일) → `SettingsError` code 그대로(`settings.io`·`state.poisoned`) | 되돌림 성공 = 불변 |
| 6 | 반환 `AppliedPreset { manifest }` | — | 새 상태 |

- **되돌림 실패**(4·5 실패 뒤 옛 바이트 쓰기마저 실패 — 디스크 고장급)는 경고 로그만 남긴다. 이때 core 에러에 「상태가 바뀌었을 수 있음」 표시(`PresetError::may_have_changed()`)가 켜지고, bridge는 data_reset처럼 **디스크를 다시 읽어 두 창에 재방출**한다(§3.6). 두 창은 언제나 디스크에 실제로 남은 것을 본다.
- 메모리 상한: 새 그림 ≤ 64장 × 1MiB + 같은 수의 백업. 보통 프리셋은 6~15장·수 MB라 일시 사용량은 수 MB다(A-9).
- 캔버스 규칙: 교체는 **전체 교체**라 현재 매니페스트의 캔버스와 비교하지 않는다. 프리셋 안에서만 캔버스 레이어끼리 같은 크기인지 본다(§3.4).
- 「프리셋에 없는 슬롯은 비워짐」 = 4단계의 「옛 매니페스트에만 있던 PNG 삭제」 + 새 매니페스트에 없음.
- 적용 뒤 현재 상태와 프리셋 폴더는 완전히 별개다 — 적용은 **복사**라 이후 `import_asset`·`set_settings`는 `assets/`·`settings.json`만 바꾼다(PS-10). 「사용 중」 표시는 없다.
- 타이머 진행 상태는 앱 데이터가 아니라 적용 대상이 아니다. 설정이 바뀐 결과만 `set_settings` 6단계와 같은 판정으로 반영된다(모드가 바뀌면 새 모드 대기, 끄면 일시정지 등 — 기존 `Timer::configure`·`disable` 규칙).

### 3.3 가져오기 (PS-06)

1. `dir`: 절대 경로 + 있는 폴더 + 그 폴더 자체가 링크·재분석 지점이 아님 → 아니면 `preset.bad_dir`.
2. `dir/preset.json`: 없음 → `preset.not_preset`. 링크·일반 파일 아님 → `preset.not_preset`. 1MiB 초과·JSON 오류·`formatVersion ≠ 1`·모르는 슬롯·중복 슬롯·64개 초과 → `preset.format`. 이름 규칙 위반 → `preset.invalid_name`. 설정 검증 실패 → `preset.invalid_settings`.
3. 검증기(§3.4)로 파일별 검사 → 문제 목록이 비어 있지 않으면 **등록하지 않고** `Ok(PresetImportReport { preset: null, problems })`.
4. 남은 임시 폴더 정리 → id 선점(`.staging-{id}`) → **검증에 쓴 바로 그 바이트**를 스테이징에 쓴다(원본을 다시 열지 않는다 — 검사와 복사 사이에 파일이 바뀌는 경쟁 차단) → `preset.json`은 파싱·보정한 구조체를 다시 직렬화해 쓴다(원문 복사 아님 — 정규화) → `rename` → `Ok(PresetImportReport { preset: Some(summary), problems: [] })`. 실패 → 스테이징 삭제(최선) → `preset.io`.

- 이름 중복 허용, 원본 폴더는 건드리지 않는다. 같은 폴더를 두 번 가져오면 프리셋 2개(id 다름).

### 3.4 폴더 검증기 (가져오기·적용 공용, `presets::load`)

입력: 폴더 경로. 출력: `Ok(ValidatedPreset { file: PresetFile, images: Vec<(AssetSlot, Vec<u8>, PngInfo)>, alarm: Option<(AlarmFormat, Vec<u8>)> })` 또는 폴더 수준 에러(§3.3-2) 또는 `problems: Vec<PresetProblem>`.

| 검사(파일마다, 순서대로 — 처음 걸린 것 하나만 그 파일의 문제로) | problem code (기존 code 재사용 우선) |
|---|---|
| `images`에 `kb_up`·`mouse_base`가 없음 | `preset.missing_required` (fileName = `kb_up.png`/`mouse_base.png`) |
| 파일 없음 | `preset.file_missing` |
| `symlink_metadata`가 일반 파일 아님(링크·재분석 지점·폴더) | `preset.file_link` |
| 크기 선검사 > 1MiB(`metadata` — 읽기 전) | `asset.too_many_bytes` / 알림음 `sound.too_many_bytes` |
| 읽기 실패 | `preset.io` |
| PNG: `parse_png_header` → `validate(info, len, slot, group)` | `asset.not_png`·`asset.bad_header`·`asset.not_rgba`·`asset.too_large`·`asset.too_many_bytes`·`asset.canvas_mismatch` |
| 알림음: `detect_format(bytes) == Some(선언 형식)` | `sound.not_audio` |

- `group`(캔버스 기준) = `images` 순서의 첫 캔버스 레이어 크기. 그 뒤 캔버스 레이어가 다르면 `asset.canvas_mismatch`(기존 `validate`의 `group_size` 인자 그대로). 마우스 파츠·펜 그림은 상한만(CR-036).
- 파일마다 문제는 최대 1개, 모든 파일을 끝까지 본다(U-2 — 한 번에 다 보여 준다).
- 경로는 항상 `폴더.join(stored_file_name(slot))` / `폴더.join(alarm_file_name(fmt))` / `폴더.join("preset.json")` 뿐이다. 사용자 문자열이 경로 조각이 되는 곳이 없다.

### 3.5 내보내기·이름 바꾸기·삭제·목록

| 동작 | 알고리즘 | 에러 |
|---|---|---|
| 내보내기 (PS-05) | `dir` 절대·있는 폴더 확인 → 대상 = `dir/{export_folder_name(name)}` → `fs::create_dir`(이미 있으면 `AlreadyExists` → `preset.export_exists`) → `preset.json` + `images`의 `{file_key}.png` + 알림음만 복사(목록 기반, 폴더 나열 아님) → 실패 시 대상 폴더 `remove_dir_all`(최선) → `PresetExportResult { folderName }` | `preset.not_found`·`preset.bad_dir`·`preset.export_exists`·`preset.io` |
| `export_folder_name` | 이름에서 `< > : " / \ | ? *`·제어 문자 → `_`, 끝의 점·공백 제거, 예약 이름(`CON`·`PRN`·`AUX`·`NUL`·`COM1`~`COM9`·`LPT1`~`LPT9`, 대소문자 무시, 확장자 앞부분 기준)이면 뒤에 `_`, 결과가 비면 `preset` | — |
| 이름 바꾸기 (PS-07) | id 확인 → `preset.json` 읽기(검증기의 폴더 수준 단계만) → `name` 교체 → `write_atomic` → 새 요약 반환. 폴더 이름(id)은 바뀌지 않는다 | `preset.not_found`·`preset.invalid_name`·`preset.format`·`preset.io` |
| 삭제 (PS-07) | id 확인(링크 아닌 폴더) → `rename({id} → .trash-{id})`(목록에서 즉시 사라짐) → `remove_dir_all`(실패는 경고 — 다음 변경 때 정리) | `preset.not_found`·`preset.io` |
| 목록 (PS-01·PS-09) | `presets/` 없으면 빈 목록. 바로 아래 항목 중 링크 아닌 폴더 + id 규칙 통과만 → `preset.json` 폴더 수준 파싱(파일 검사는 안 함 — 빠르게) → 실패한 폴더는 경고 로그 후 건너뜀 → `savedAt` 내림차순, 같으면 id 내림차순 | `preset.io`(`presets/` 읽기 자체 실패만) |
| 남은 임시 정리 | 저장·가져오기·삭제 시작 때 `.staging-*`·`.trash-*` 폴더를 `remove_dir_all`(최선, 경고만). 목록은 부수 효과 없음 | — |

- Rust `std::fs::remove_dir_all`은 Windows에서 링크·정션을 따라가지 않는다(Rust 1.58.1 CVE-2022-21658 수정 이후). 그래도 삭제 전에 대상 자체가 링크가 아닌지 먼저 본다.

### 3.6 bridge 뒤처리 (적용)

`reset_app_data` 선례(계약 §5.10)를 따른다. 핸들러 순서:

| # | 단계 | 실패 시 |
|---|---|---|
| 0 | 호출 창 확인 `ensure_settings_caller(label, "preset.forbidden")` | 즉시 반환, 아무것도 안 함 |
| 가 | 설정 잠금으로 `old_timer` 복사(문장 끝에서 해제 — 나의 `update`와 교착 방지) | `state.poisoned` 즉시 반환 |
| 나 | core `presets::apply(&paths, &id, &state.settings)` | `Err(e)`이고 `!e.may_have_changed()` → 그대로 반환(이벤트 없음). `may_have_changed()` → 1~5 수행 뒤 에러 반환 |
| 1 | `fin` = 메모리 설정 복제, `manifest` = 나의 반환값(실패 경로는 `load_manifest_or_warn`) | 잠금 오염 → `state.poisoned` |
| 2 | `settings://changed`(fin) | 경고 로그 |
| 3 | `assets://changed`(manifest) — 2 뒤 | 경고 로그 |
| 4 | `window::resize_overlay(manifest.canvas, fin.scale)` — 항상 | 경고 로그 |
| 5 | `refresh_hand_anchor(manifest, fin.mouse)` — 항상 | 경고 로그 |
| 6 | `apply_timer_config_side_effect(old_timer, fin.timer)` | 헬퍼가 처리 |
| 다 | 나의 결과 반환 | — |

- `window::apply_overlay_window`·위치 초기화·오버레이 새로고침은 **하지 않는다** — PS-03 필드(표시·위치 잠금·작업표시줄·위치)가 바뀌지 않기 때문이다(U-6).

## 4. 계약 변경 목록 (contract v0.30)

| 종류 | 이름 | 변경 | 하위 호환 | 소비자 |
|---|---|---|---|---|
| 타입 | `PresetSummary = { id: string, name: string, savedAt: number, imageCount: number, hasAlarm: boolean }` | 신규 | 추가 | settings |
| 타입 | `PresetProblem = { fileName: string, code: string }` | 신규 | 추가 | settings |
| 타입 | `PresetImportReport = { preset: PresetSummary \| null, problems: PresetProblem[] }` (불변식: `preset !== null` ⇔ `problems.length === 0`) | 신규 | 추가 | settings |
| 타입 | `PresetExportResult = { folderName: string }` | 신규 | 추가 | settings |
| 상수(TS) | `PRESET_NAME_MAX = 50` (Rust `presets::NAME_MAX_CHARS`와 1:1) | 신규 | 추가 | settings |
| command | `list_presets()` → `PresetSummary[]` | 신규, 부수 효과 없음 | 추가 | settings |
| command | `save_preset(name: string)` → `PresetSummary` | 신규, 이벤트 없음 | 추가 | settings |
| command | `apply_preset(id: string)` → `void` | 신규, 뒤처리 §3.6(기존 이벤트 재방출) | 추가 | settings |
| command | `export_preset(id: string, dir: string)` → `PresetExportResult` | 신규, 사용자 폴더에만 씀 | 추가 | settings |
| command | `import_preset(dir: string)` → `PresetImportReport` | 신규, 파일별 문제는 reject가 아니라 보고서 | 추가 | settings |
| command | `rename_preset(id: string, name: string)` → `PresetSummary` | 신규 | 추가 | settings |
| command | `delete_preset(id: string)` → `void` | 신규 | 추가 | settings |
| event | — | **새 이벤트 없음.** 프리셋 목록의 소비자는 설정 창 하나뿐이고, 목록을 바꾸는 주체도 그 창의 command뿐이라 응답·재조회로 충분하다(알림음 A-1 선례). 적용의 화면 반영은 기존 `settings://changed`·`assets://changed`·`assets://hand-anchor-changed`·`timer://changed` | — | overlay, settings |
| 에러 | `preset.forbidden`·`preset.not_found`·`preset.invalid_name`·`preset.missing_required`·`preset.not_preset`·`preset.format`·`preset.invalid_settings`·`preset.damaged`·`preset.bad_dir`·`preset.export_exists`·`preset.io`·`preset.file_missing`·`preset.file_link` (13개, 27 → 40) | 신규 | 추가 | settings(문구 3개 국어 — `preset.forbidden`은 `reset.forbidden`처럼 사전 제외) |
| 권한 | capabilities·`tauri.conf.json` | **변경 없음** — 앱 command는 `generate_handler!` 등록만(§7), 폴더 선택은 기존 `pickFolder`(`dialog:allow-open`), asset scope 불변 | — | — |

- 기존 command·event·타입·에러 code는 **바뀌지 않는다**(파괴 0). `BridgeError` 모양도 그대로 — 파일별 사유는 새 보고서 타입에 담는다.
- 모든 프리셋 command는 **동기**(`#[tauri::command]`, async 아님) — 계약 §5.10 C-4 불변식(앱 데이터를 쓰는 command는 동기)을 지킨다. `list_presets`도 가벼워서 동기.

## 5. 설정 스키마 변경

`settings.json`은 **변경 없음**. 새 영속 데이터는 프리셋 폴더(`preset.json`)이고 형식은 §2.1이다.

PS-02/PS-03 필드 분류(정본 = core `presets::format::PresetSettings::merge_into`):

| `Settings` 필드 | 분류 | 적용 때 |
|---|---|---|
| `scale` | PS-02 | 프리셋 값 |
| `idle_seconds` | PS-02 | 프리셋 값 |
| `mouse`(shoulder·area·partPos·hand·penPos·penMode) | PS-02 | 프리셋 값(`null` 포함 통째로) |
| `timer`(enabled·mode·countdownSecs·alarmVolume·textPos·rotation·fontSize·color) | PS-02 | 프리셋 값(통째로) |
| `overlay`(x·y·visible) | PS-03 | 유지 |
| `autostart` | PS-03 | 유지 |
| `language` | PS-03 | 유지 |
| `position_lock` | PS-03 | 유지 |
| `show_in_taskbar` | PS-03 | 유지 |

- **분류 가드**: core는 `Settings`를 구조 분해(`let Settings { scale, idle_seconds, overlay: _, mouse, autostart: _, language: _, position_lock: _, show_in_taskbar: _, timer } = …`)로 `PresetSettings`를 만든다. 나중에 `Settings`에 필드가 생기면 **컴파일이 깨져** 그 필드를 PS-02/PS-03 중 어디에 넣을지 결정하게 강제한다.

## 5a. 사용자 결정 사항 (미결 — 권고안으로 패킷 작성, 결정이 다르면 해당 패킷 절만 바꾼다)

| # | 질문 | 대안 | 권고 | 근거 | 영향 계층 |
|---|---|---|---|---|---|
| **U-1** | 「전체 초기화」(R-56)와 베타 세대 초기화 때 프리셋 | **A 유지** · B 함께 삭제 | **A** | 프리셋은 사용자가 일부러 남긴 「보관함」이고, 초기화의 목적은 **지금 상태**를 처음으로 되돌리는 것이다. 현재 `wipe`가 하위 폴더를 건드리지 않아 **코드 변경 0**. B는 data_reset 화이트리스트·확인창 문구·계약 §5.10 보존 표를 모두 고친다 | core(B만)·ui(B만) |
| **U-2** | 가져오기 실패 알림 | **A 문제 파일 전부를 목록으로(파일명 + 사유)** · B 첫 문제 하나만 | **A** | 요구 「어느 파일이 왜 안 되는지」. 여러 파일이 틀렸을 때 고치고 다시 가져오기를 반복하지 않게 한다. 사유는 기존 `asset.*`·`sound.*` 문구(3개 국어)를 재사용 | bridge·ui |
| **U-3** | 내보낼 위치에 같은 이름 폴더가 이미 있으면 | **A 오류(`preset.export_exists`) — 사용자가 다른 폴더를 고르거나 이름을 바꾼다** · B 자동으로 `이름 (2)` | **A** | 사용자 폴더를 덮거나 이름을 몰래 바꾸지 않는다(기본 이미지 다운로드의 「충돌 미리 검사」 성격과 같음). 요청 위임문 권고 | core·ui |
| **U-4** | 목록 순서 | **A 최근 저장이 위** · B 이름순 · C 오래된 것이 위 | **A** | 방금 저장·가져온 프리셋이 바로 보인다. 정렬 UI는 요구에 없다 | core |
| **U-5** | 가져온 프리셋의 「저장 날짜」 | **A 원본 `savedAt` 유지** · B 가져온 시각 | **A** | 날짜는 그 옷 한 벌이 만들어진 날이다. 내보내기→가져오기로 날짜가 바뀌면 같은 프리셋을 구분하기 어렵다. (A면 가져온 프리셋이 목록 중간에 들어갈 수 있다 — U-4와 함께 판단) | core |
| **U-6** | 적용 뒤 오버레이 WebView 새로고침 | **A 안 함(이벤트로 갱신)** · B 함(전체 초기화처럼) | **A** | 적용은 그림·설정만 바꾸고 창 위치·입력 상태는 그대로다. 오버레이는 이미 `import_asset`(캔버스 교체 포함)을 이벤트만으로 반영한다. B는 적용마다 깜빡임이 생긴다. verify에서 잔상이 보이면 B로 한 줄 전환(`tray::refresh_overlay`) | bridge |
| **U-7** | 이름 최대 길이 | **50자** · 제한 없음 · 다른 값 | **50자** | 요구는 「빈 이름 불가」만. 무제한이면 카드·폴더 이름이 깨진다. Windows 폴더 이름 한도(255)보다 충분히 작다 | core·bridge(상수)·ui |

아키텍트 결정(사용자 확인 불요, 이견 있으면 알려 주면 된다):
- **A-1 인덱스 파일 없음** — 목록은 매번 폴더 스캔. 인덱스를 두면 폴더와 어긋나는 경우(사용자가 탐색기에서 폴더 삭제)를 따로 처리해야 한다.
- **A-2 `preset.json` 하나** — 메타와 설정을 한 파일에. 두 파일이면 한쪽만 있는 상태가 생긴다. 파일 이름 목록을 JSON 문자열로 두지 않고 슬롯에서 다시 만든다(§2.1).
- **A-3 id = Unix ms(+ `-n`)** — 새 크레이트(uuid·rand) 없이 충돌을 `create_dir` 선점으로 막는다. 사람이 읽을 수 있고 정렬도 된다.
- **A-4 새 이벤트 없음** — §4 event 행.
- **A-5 호출 창 제한** — `list_presets`를 뺀 6개 command는 설정 창에서만(`preset.forbidden`, `reset_app_data` SEC-002 선례). 적용·삭제는 되돌릴 수 없고, 확인 절차는 설정 창에만 있다. 판정 함수는 `ensure_reset_caller`를 일반화한 `ensure_settings_caller(label, code)` 하나(기존 `reset.forbidden` 동작 불변).
- **A-6 적용 = 백업 후 교체, 실패 시 되돌림** — 폴더 통째 교체(`assets` ↔ `assets.next` rename)는 WebView가 파일을 여는 중이면 Windows에서 폴더 rename이 실패할 수 있어(data_reset 「남는 위험」과 같은 미검증 영역) 택하지 않았다. 파일 단위 `write_atomic`은 이미 검증된 경로다.
- **A-7 파일별 문제 = 보고서** — `BridgeError`에 필드를 더하지 않고(모든 command에 파급), `ExportReport.failed[]` 선례처럼 반환값에 담는다.
- **A-8 이름 규칙** — 앞뒤 공백 제거, 1~`NAME_MAX_CHARS`(50)자, 제어 문자(`char::is_control`) 금지. 그 밖의 글자(한글·일본어·이모지·파일 금지 글자)는 허용 — 폴더 이름은 id라 영향 없고, 내보내기만 `export_folder_name`이 바꾼다.
- **A-9 상한** — `preset.json` 1MiB(`MAX_TEXT_FILE_BYTES`), 파일마다 1MiB(기존), 그림 64장. 적용·가져오기 일시 메모리는 최악 약 128MB, 보통 수 MB.
- **A-10 탭 위치·아이콘** — 사이드바 **다섯째(맨 아래)** `presets`(🔒 PS-09). 아이콘은 겹친 카드 두 장(인라인 SVG, `TabIcon`).
- **A-11 이름 바꾸기 UI** — 확인창이 아니라 카드 안 인라인 입력(저장·취소). `ConfirmDialog`에 입력칸이 없어 새 대화상자를 만들지 않는다. 확인창은 적용·삭제에만(🔒 PS-04·PS-07).

## 6. 종단간 RTM

아키텍처 요구ID `PS-xx`(🔒 확정사항). 화면 요구ID는 ui-designer가 `src/settings/requirements.md` 마지막 번호(R-57) 다음으로 부여한다. 테스트 이름은 권고.

| 요구ID | 요구 | ui | bridge | core | 파일·설정 키 | 테스트 | 상태 |
|---|---|---|---|---|---|---|---|
| PS-01 | 이름 붙여 저장 → 목록 | `PresetSaveCard` 이름 입력·「저장」, 성공 뒤 `listPresets` 재조회 | `save_preset`·`list_presets`·`PresetSummary` | `presets::save`·`presets::list` | `presets/{id}/preset.json` | core `save_creates_folder_with_all_files`·`list_sorted_newest_first`; bridge `save_preset_*`(순수 함수); ui `PresetsTab.test` 저장 흐름 | 설계 |
| PS-02 | 그림 전부·알림음·배율·휴식 시간·mouse 전체·timer 전체 | (표시: 그림 N장·알림음 유무) | `PresetSummary.imageCount`·`hasAlarm` | `PresetSettings`(4필드)·`images`·`alarm` | `preset.json` `settings`·`images`·`alarm` | core `preset_settings_has_exactly_ps02_fields`·`save_copies_every_manifest_slot_and_alarm` | 설계 |
| PS-03 | PC별 설정 5개는 적용해도 그대로 | — | — | `merge_into`(4필드만 대입)·구조 분해 가드 | `overlay`·`autostart`·`language`·`positionLock`·`showInTaskbar` | core `apply_keeps_pc_local_fields` | 설계 |
| PS-04 | 적용 → 확인창 → 통째 교체(없는 슬롯 비움) → 즉시 반영, 자동 백업 없음 | `PresetCard` 「적용」·`ConfirmDialog`(문구에 「먼저 저장」 안내) | `apply_preset`, 뒤처리 §3.6(`settings://changed`·`assets://changed`·리사이즈·손 기준점·타이머) | `presets::apply`(검증 → 백업 → 교체 → 병합 → 되돌림) | `assets/*`·`settings.json` | core `apply_replaces_all_and_clears_missing_slots`·`apply_rolls_back_on_settings_failure`·`apply_damaged_changes_nothing`; ui 확인창·호출 1회 | 설계 (U-6) |
| PS-05 | 폴더째 내보내기, 새 의존성 없음 | 「내보내기」 → `pickFolder` → `exportPreset` → 결과 폴더 이름 안내 | `export_preset`·`PresetExportResult` | `presets::export_to`·`export_folder_name` | 사용자 폴더 `{이름}/` | core `export_copies_listed_files_only`·`export_existing_folder_rejected`·`export_folder_name_table` | 설계 (U-3) |
| PS-06 | 폴더 가져오기, 규격 검사, 파일별 사유, 부분 등록 없음, 경로 탈출 금지 | 「폴더에서 가져오기」 → `pickFolder` → `importPreset` → 문제 목록(파일명 + `errors[code]`) | `import_preset`·`PresetImportReport`·`PresetProblem` | `presets::load`(검증기)·`presets::import_from`(스테이징 → rename) | `presets/{새 id}/` | core `import_rejects_*`(링크·없는 파일·캔버스 불일치·RGBA 아님·1MiB·알림음 형식·모르는 슬롯)·`import_writes_nothing_on_problem`·`import_round_trip_equals_export` | 설계 (U-2) |
| PS-07 | 이름 바꾸기·삭제(확인창), 이름 중복 허용, 빈 이름 불가 | 인라인 이름 편집·「삭제」 `ConfirmDialog` | `rename_preset`·`delete_preset` | `presets::rename`·`presets::delete`·이름 규칙 | `preset.json` `name` | core `rename_keeps_id`·`duplicate_names_allowed`·`blank_name_rejected`·`delete_removes_folder` | 설계 (U-7) |
| PS-08 | `kb_up`·`mouse_base` 없으면 저장 비활성 + 이유 | `presetValues.missingRequired(manifest)` → 버튼 `disabled` + 이유 줄 | `REQUIRED_SLOTS`(기존), 방어 code `preset.missing_required` | `presets::save` 2단계 | — | ui `presetValues.test`·`PresetsTab.test`; core `save_without_required_rejected` | 설계 |
| PS-09 | 설정 창 다섯째 「프리셋」 탭, 위 = 저장·가져오기, 아래 = 카드 목록(이름·날짜·장수·알림음, 버튼 4), 3개 국어 | `TAB_IDS` +`presets`, `TabIcon`, `PresetsTab`·`PresetSaveCard`·`PresetCard`, i18n 키 | `list_presets` | `presets::list` | `language`(기존) | ui `SettingsApp.test`(탭 5개)·`i18n.test`(키 집합·ErrorCode 27 → 39) | 설계 (A-10) |
| PS-10 | 적용은 복사 — 이후 변경이 프리셋에 안 번짐, 「사용 중」 표시 없음 | 사용 중 표시 없음 | — | `apply`는 프리셋 폴더를 읽기만 | — | core `apply_then_edit_does_not_touch_preset` | 설계 |

끊긴 열 없음(해당 없음은 `—`).

## 7. 비기능 목표와 측정

| 항목 | 목표 | 측정 |
|---|---|---|
| 적용 지연 | 그림 15장·3MB 기준 ≤ 300 ms(메인 스레드 점유 — 전체 초기화 목표와 같음) | core 통합 테스트에서 `Instant` 측정 로그, verify 수동 실측 |
| 저장·가져오기 지연 | 같은 크기 ≤ 300 ms | 같음 |
| 목록 지연 | 프리셋 30개 ≤ 50 ms(`preset.json`만 읽음) | core 테스트 |
| 메모리 | 적용 중 일시 사용 = 새 그림 + 백업(보통 수 MB, 최악 ≈ 128MB — A-9) | 코드 리뷰 |
| IPC | 적용 1회 = 이벤트 2개(+조건부 손 기준점·타이머). 저장·가져오기·이름·삭제는 이벤트 0 | bridge 코드 리뷰 |
| 보안 | 사용자 문자열이 경로 조각이 되는 곳 0, 링크·재분석 지점 거부, 크기 선검사 | core 테스트 + verify-security-reviewer |

**위험(확인 필요):** ① WebView2가 적용 순간 기존 PNG를 읽는 중이면 `write_atomic`의 rename이 공유 위반으로 실패할 수 있다(기존 `import_asset`도 같은 조건 — 지금까지 보고 없음). 실패하면 되돌림 후 `preset.io`로 끝나므로 데이터는 안전하다. ② 최악 크기 프리셋(64장 × 1MiB)에서 메인 스레드가 1초 가까이 막힐 수 있다 — 입력 훅은 별도 스레드라 영향 없음. 실측이 목표를 넘으면 async 전환 전에 계약 §5.10 C-4 불변식(공용 잠금)부터 풀어야 한다.

## 8. 새 의존성

**없음.** zip(🔒 사용 안 함)·uuid·rand·chrono 모두 쓰지 않는다. 폴더 복사 = `std::fs`, id = `SystemTime` + `create_dir` 선점, 날짜 표시 = 브라우저 `Intl.DateTimeFormat`, 폴더 선택 = 기존 `tauri-plugin-dialog`(`pickFolder`). 라이브러리가 필요하다는 판단은 나오지 않았다.

## 9. 문서 동기화 대상 (각 계층 패킷에 배정)

- core: `doc/200_설계/core/presets.md`(신규), `assets.md`(`pub(crate)` 확대·검증기 공용 지점), `settings.md`(PS-02/PS-03 분류 가드 한 줄), `data_reset.md`(U-1 — 프리셋 폴더는 초기화 대상 아님 한 줄).
- bridge: `doc/200_설계/bridge/contract.md` v0.30(§3.11 신설·§5 표 7행·§5.11 신설·§6·§6.1·§6.2·§7 메모·§8·§9).
- ui: `src/settings/{requirements,design}.md`·(신규) `design/presets-tab.md`·`design/i18n.md` §4.12·`test/scenarios.md`·`test/change-requests.md`(CR-064)·`manual.md`.
- 메인 세션: 확정사항 §7 폴더 구조에 `presets/`(core 모듈)와 앱 데이터 `presets\` 폴더 추가, §6 프리셋 항목에 결정(U-1~U-7) 한 줄.
