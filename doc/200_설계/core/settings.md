# settings 모듈 설계

- 상태: 확정(사용자) — §3.9(CR-047)는 초안(범위는 사용자 확정, 설계 세부는 위임 범위 안에서 작성) · §3.10(CR-048)은 인계 패킷 기준 확정 · 최종 갱신 2026-09-29(소스 동기화)
- 변경이력:
  - 2026-09-29 (소스 동기화 — **설계 변경 아님, 소스가 정본**: 0.4.0 + 2026-09-29 보강, 근거 `doc/300_검증/verify-20260929-1928.md`) ① **SEC-205 텍스트 크기 상한**: `settings/atomic.rs`에 `pub fn read_capped_string(path: &Path, max_bytes: u64) -> std::io::Result<String>`·`pub const MAX_TEXT_FILE_BYTES: u64 = 1024 * 1024`(1MiB), `mod.rs`가 `pub use atomic::{read_capped_string, write_atomic, MAX_TEXT_FILE_BYTES};`로 재노출. `load`는 이 함수로 읽는다 — `fs::metadata` 길이가 상한을 넘으면 읽지 않고 `ErrorKind::InvalidData` → `SettingsError::Io` → `load_or_default`가 기존 손상 파일 경로(기본값 대체 + 경고, 로그에는 파일 이름만)를 그대로 탄다. 같은 상한을 assets `load_manifest`·data_reset `read_marker`·`read_attempts`가 공유한다. 테스트: atomic.rs AW7(`aw7_read_capped_string_rejects_oversized_file`), `mod.rs` 1MiB 초과 settings.json → 기본값. §2 표 반영. ② **0.4.0 기본값**(`settings/timer.rs:80-96`, 계약 v0.27 §3.3과 일치): `timer.textPos` (142, 458) → **(268, 402)**, `timer.rotation` 9 → **7**, `timer.alarmVolume` 80 → **44**(`DEFAULT_ALARM_VOLUME`), `fontSize` 36·`countdownSecs` 1500(`DEFAULT_COUNTDOWN_SECS`)·`color` `"#333333"`·`enabled` false·`mode` Stopwatch 불변. `default_mouse()` 좌표(CR-044, §11 확인 필요 14): `shoulder` (582, 484)·`partPos` (411, 464)(키 없음 serde 기본은 여전히 (389, 492))·`penPos` (372, 476)·`penMode` **true**. §2·§3.1 표 반영. §3.7·§3.8·§3.10의 코드 조각과 테스트 기대값(S-T1·S-T10·S-T12·S-T13·S-T14·S-T17·S-T18의 (142, 458)·9·80, N1′의 (380, 496))은 **옛 기록** — 현재 값은 §3.1·소스. ③ **표기 정리**: 아래 변경이력·§3.x·§10의 「소스 미적용」(CR-017·019·024·033·035·045·047·048, SV2, data-reset, CR-053)은 모두 소스에 반영됨(`settings/{mod,timer,atomic,store,pen_mode_tests,pen_pos_tests}.rs`). CR-053 값은 0.4.0에서 다시 바뀌었다(②). `save`는 CR-047 ③단계대로 **비공개**(§2 행 정정). `idleSeconds` 검증은 60~3600(`IDLE_SECONDS_MIN/MAX`, 읽기는 보정 — §3.1 행 정정).
  - 2026-09-27 (data-reset, 🔒 사용자 결정 R-A·R-B·D-2(언어 유지)·D-3, 새 모듈 문서 [data_reset.md](data_reset.md)) **앱 시작 순서 변경**: settings `load_or_default`가 시딩보다 **앞으로** 오고, 그 값을 담은 `Mutex<Settings>`로 `data_reset::run_startup`이 돈다. 세대가 다르거나 없으면 `settings::update` 한 번으로 설정 전체를 `Settings::default()`로 바꾸되 `autostart`·`language`만 유지한다. 세대 표식은 settings 스키마 밖의 별도 파일 `data-generation.json`(`version` 필드 추가 없음 — D19 유지). **settings 공개 API·스키마·검증 불변**(호출자만 늘어남). 증분 **§3.11**. **소스 미적용.**
  - 2026-09-27 (CR-053 배포용 기본 세트 3차 — CR-044 대체, 🔒 사용자 지정, 확정사항 §6 CR-053 줄) **타이머 기본값 `timer.textPos` (268, 403) → (142, 458), `timer.rotation` 5 → 9.** 나머지 타이머 기본값(`enabled` 꺼짐·`fontSize` 36·`color` `"#333333"`·`countdownSecs` 1500(25분)·`alarmVolume` 80 등)과 범위·보정 규칙, 좌표 기본값(`shoulder`·`partPos`·`penPos`·`penMode`, CR-044 그대로)은 불변. 공개 API 시그니처·JSON 키 불변. 이미 저장된 `settings.json`의 값은 그대로 읽힌다(기본값은 키가 없을 때만 쓰인다). 갱신 위치: §2 `TimerSettings` 행, §3 필드 표 `timer.textPos`·`timer.rotation`, §3.8.1 `impl Default`, 테스트 S-T1·S-T10·S-T12(§3.8·§3.10 갱신본). 짝 문서 [assets.md](assets.md) §3.16(기본 그림 7장). **소스 미적용**(`settings/timer.rs:88·90`, 단위 테스트 `:241`·`:465`).
  - 2026-09-26 (CR-048 타이머 모드, 🔒 사용자 결정 D-1~D-11 권고안 확정 — 확정사항 CR-048 결정 줄, 정본 패킷 `doc/200_설계/architecture/timer-mode-03-packet-core.md` §2.1, 근거 `timer-mode-02-design.md` §5) **`TimerSettings`에 `mode: TimerMode`(`"stopwatch"|"countdown"`, 기본 Stopwatch)·`countdown_secs: u32`(`countdownSecs`, 1~359999, 기본 1500)·`alarm_volume: u32`(`alarmVolume`, 0~100, 기본 80) 추가, 상수 5개, `validate`·`normalize` 확장, 새 3필드 관대한 역직렬화(타입 오류가 설정 전체 `Format`으로 번지지 않음).** `enabled`는 유지하고 의미만 「스톱워치 또는 타이머 켜짐」(D-1 A) → 옛 `{"enabled":true}`는 이행 코드 없이 스톱워치 켜짐(TM-02). `version`·마이그레이션 없음(D19 유지), `keep_core_owned` 불변. 증분 전체 **§3.10**(§8·§9·§11 증분 포함), §10에 TM 행. **소스 미적용.**
  - 2026-09-26 (CR-047 점검 후 정리, 🔒 확정사항 §6 「점검 후 정리」 줄, 근거 `.claude/reports/verify-20260926-1821.md` CORE-001·002) **저장 단일 창구 `update`(+`SaveOutcome`)·공용 원자적 쓰기 `write_atomic` 신설, `save` 비공개화(3단계), `SettingsError::StatePoisoned`(code `state.poisoned` 재사용 — 계약 새 code 없음).** `update`는 설정 잠금을 쥔 채 「사본 변경 → 검증 → 원자 교체 → 메모리 대입」(스킬 §4 예외, D47-1). `write_atomic` = 같은 폴더 고유 임시 파일(`{이름}.{pid}-{seq}.tmp`, `create_new`) → `sync_all` → `fs::rename` 교체(`remove_file` 없음). 저장 경로 7곳(core 4 + bridge 3, 위임문 5곳 + bridge `set_overlay_position`·`set_overlay_visible` 추가 발견) 이전 계획·반영 순서. 새 자식 파일 `atomic.rs`·`store.rs`. 스키마·검증 규칙·`version` 불변. assets 매니페스트도 `write_atomic` 사용([assets.md](assets.md) §3.14). 증분 전체 **§3.9**. **소스 미적용.**
  - 2026-09-26 (CR-045 뽀모도 타이머, 🔒 사용자 결정 U-1~U-8 권고안 채택 — 확정사항 §6 CR-045 「결정」 줄, 패킷 `doc/200_설계/architecture/pomodoro-03-packet-core.md` §3) **`Settings.timer: TimerSettings` 추가**(JSON `timer: { enabled, textPos, rotation, fontSize, color }`, 기본 `false`·(268, 403)·5·36·`"#333333"`). 새 자식 파일 **`settings/timer.rs`**(`TimerSettings`·`Default`·`validate`·`normalize`·범위 상수·테스트), `mod.rs`는 20줄 이내 연결(`pub mod timer;`·`pub use`·필드·기본값·`validate` 호출·`load` 보정). `TimerSettings`에도 컨테이너 `#[serde(default)]` — `timer`가 없거나 일부만 있는 옛 파일은 기본값으로 채운다. 범위 밖 값은 `set_settings`에서 `settings.invalid`로 거부, 파일 읽기에서는 보정(자르기·색 기본값·소문자화). **`version`·마이그레이션 없음(D19 유지)**, `keep_core_owned` 불변(`timer`는 ui 소유). 경과·실행 상태는 여기 없다([timer.md](timer.md), 휘발). 증분 전체 **§3.8**(§8·§9·§10·§11 증분 포함). §1·§2·§3.1에 행 추가. **소스 미적용.**
  - 2026-09-25 (CR-035 증분, DA-07, 🔒 사용자 결정 U-2 = B·U-3 = A, 패킷 `doc/200_설계/architecture/default-assets-03-packet-core.md` §5) **`default_mouse().pen_pos` 기본값 `None` → `Some(Point { x: 380.0, y: 496.0 })`**(기본 세트 pen_up 90×154를 사용자가 끌어다 놓은 자리). 필드 타입·serde 속성·검증·함수 시그니처 불변. 키가 없거나 `"penPos": null`인 기존 파일은 그대로 `None`. `area`·`part_pos`는 **값 불변, 근거 주석만** 「기본 세트 `doc/assets/defaults/mouse_base.png`(202×154, CR-035)」로 정정. `settings/mod.rs`(783줄)의 penPos 테스트 N1~N5를 새 자식 파일 `pen_pos_tests.rs`로 옮기고 N1 기대값 갱신·N6 추가. `penMode` 기본 false 유지(U-3). 증분 전체는 **§3.7**. 짝 문서 [assets.md](assets.md) §3.10. **소스 미적용.**
  - 2026-09-24 (8차, CR-033, 🔒 사용자 지정, 확정사항 §3 「펜 손 사용 토글」) **`MouseSettings.pen_mode: bool` 추가**(JSON `penMode`, 필드 `#[serde(default)]`, 기본 false). 펜 모드를 `pen_up` 등록 여부 대신 이 값으로 켜고 끈다(해석은 ui). 검증 규칙·함수 시그니처·`version`·마이그레이션 없음. 옛 settings.json(키 없음)은 false. **ui 소유 필드**(`set_settings`로 저장) — `keep_core_owned` 불변. 증분은 §3.6에 모았고 §3.1·§10·§11(D25~D29) 갱신. 새 테스트는 자식 파일 `settings/pen_mode_tests.rs`(mod.rs 770줄 — 800줄 한계). 사용자 결정 완료로 바로 확정. **소스 미적용.**
  - 2026-09-24 (7차, R-set-v2 SV2-02·03·04·05, 🔒 사용자 결정 D-1~D-10, 확정사항 §6 「설정 창 개편」) **`Settings`에 `language: Language`(JSON `language`, `"ko"|"ja"|"en"`, 기본 `Ko`)·`position_lock: bool`(`positionLock`, 기본 false)·`show_in_taskbar: bool`(`showInTaskbar`, 기본 false) 추가.** 알 수 없는 언어 값(다른 문자열·`null`·숫자)은 `Ko`로 읽는다 — 파일 읽기와 `set_settings` 입력 모두(`Language` 관용 `Deserialize`). `validate` 규칙·`version`·마이그레이션 없음. `autostart`는 필드 그대로이고 **쓰기 주체가 core(`set_autostart`·시작 보정)로 좁아진다** — 병합 함수는 [window.md](window.md) §2.4 `keep_core_owned`(settings는 의미 해석 금지라 여기 두지 않음, §11 D22). D-7(배율·유휴 시간을 설정 창에) = settings 변경 없음 — 기존 검증(`scale` 0.25~2 유한수, `idle_seconds` ≥ 1, `mod.rs:149-165`) 그대로. **이번 변경의 §1·§2·§3.1·§8·§9 증분은 §3.5에 모아 적었다.** 사용자 결정 완료로 바로 확정. **소스 미적용.**
  - 2026-09-24 (6차, CR-024, 🔒 사용자 결정, 확정사항 §3 「펜 쥔 손 파츠」) **`MouseSettings.pen_pos: Option<Point>` 추가**(JSON `penPos`, 쉬는 자세 기준 펜 쥔 손 그림 왼쪽 위 모서리의 캔버스 좌표, `#[serde(default)]`, 기본 `None` — 손 그림을 처음 등록하면 ui가 기본 위치를 정해 저장). 검증 규칙 추가 없음, 함수 시그니처 변경 없음, 옛 settings.json은 `None`으로 읽음. §1·§3.1·§3.1.1(신규)·§8.4(신규)·§9.4(신규)·§10·§11 갱신. 짝 문서 [assets.md](assets.md) 6차(펜 슬롯). 사용자 결정 완료로 바로 확정. **소스 미적용.**
  - 2026-09-24 (5차, CR-019, 🔒 사용자 결정, 확정사항 §4·§5·§6) **쾅(키연타) 메커니즘 폐기 → `Settings.slam`·`SlamSettings` 삭제, `validate`의 쾅 규칙 삭제.** 사유(사용자): 빠른 타자와 쾅쾅쾅 연타를 입력으로 구분할 수 없다. 옛 settings.json의 `slam` 키는 값과 형식에 관계없이 무시하고 읽는다(serde 모르는 키 무시). §1·§2·§3.1·§3.4(신규)·§6·§8.3(신규)·§9.0(신규)·§10·§11(CR-019 결정·파급) 갱신. 사용자 결정 완료로 바로 확정.
  - 2026-09-23 (4차, 정정, CR-017) **기본 `area` [(430,515),(550,515),(550,615),(430,615)] → [(375,525),(495,525),(495,625),(375,625)]**. 근거: core-implementer 통합 테스트 I1 실측 손 기준점 (435.06, 575.27)(추정 (490,565) 대체), 어깨 (620,530), L0 = 190.4 → 옛 값은 오른쪽 위 k = 0.376으로 하한 0.5 위반. 새 값은 실측 기준점 중심 120×100, k = 1.287 / 0.657 / 0.825 / 1.38. §3.1·§3.2·§8 U2·U11·I1·§9.1·§10·§11 D8·확인 필요 5(해소)·6 갱신. 상태 확정 유지.
  - 2026-09-23 (3차, CR-017, 🔒 사용자 결정, 확정사항 §3 「이동 영역·팔 늘어나기」) **직사각형 `pad` 폐기 → 자유 사각형 이동 영역 `MouseSettings.area: [Point; 4]`**(JSON `area`, 꼭짓점 순서 [왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래], 캔버스 좌표, 기본 120×100 직사각형 (430,515)~(550,615) — 4차에서 정정). `pad` 필드·`Rect` 타입 삭제, 검증 `pad 크기 > 0` → `area 네 점 유한수`. 옛 settings.json의 `pad`는 무시, `area`가 없으면 기본값. 사용자 결정 완료로 바로 확정.
  - 2026-09-23 (2차, 🔒 사용자 결정, 확정사항 §3·§4) **마우스 파츠 단일 모드**: `MouseSettings.part_pos: Point`(JSON `partPos`, 기본 (389, 492)) 추가, `arm_width`·`arm_color` 폐기(손바닥 모드 전용). 옛 settings.json 호환(모르는 키 무시·누락 키 기본값) 명시.
  - 2026-09-23 확정 전환(CR-007 `hand` 기본값 `None` + 이전 값 주석 보존). 요구ID OV-R-10 → OV-R-14.
- 요구ID 표기: `OV-R-xx` = `src/overlay/requirements.md`, `ST-R-xx` = `src/settings/requirements.md`. `R-tmp-n` = 요구ID 미부여(확인 필요). `CR-019` = 쾅 폐기 변경 요청(확정사항 §4·§5·§6 🔒 2026-09-24).
- 상대 문서: [window.md](window.md)(위치 저장·복원, CR-017 `list_monitors`) · [assets.md](assets.md)(손 기준점 — `shoulder`·`part_pos` 입력, CR-019 `slam` 슬롯 삭제) · 계약 `doc/200_설계/bridge/contract.md` §3.3

## 1. 목적

결론: settings는 설정 JSON의 스키마·기본값·검증·원자적 저장을 맡는다. 이번 변경(CR-019)은 **쾅 설정 `slam`(동시 키 수·유지 시간)을 스키마·기본값·검증에서 지우는 것**이다. 옛 파일에 남은 `slam`은 읽을 때 건너뛰고, 다음 저장 때 파일에서 사라진다.

비유: 장부에서 "쾅 규칙" 칸을 없앤다. 예전 장부에 그 칸이 적혀 있어도(값이 이상해도) 읽는 사람은 모르는 칸이라 그냥 넘어가고, 장부를 새로 옮겨 적을 때 그 칸을 베끼지 않는다.

직전 변경(CR-017)은 손이 움직이는 구역을 직사각형 `pad`에서 꼭짓점 4개짜리 자유 사각형 `area`로 바꾼 것이다(§3.2·§3.3). settings는 네 점을 저장·검증만 하고, 커서 → 목표점 매핑(쌍선형 보간)과 팔 늘어나기 계산은 ui가 한다.

| 요구ID | 내용 | 이 모듈의 몫 |
|---|---|---|
| ST-R-03 / OV-R-03 | 배율 25%~200% | `scale`(기존) |
| ST-R-04 / OV-R-05 | 유휴 시간(기본 300초) | `idleSeconds`(기존) |
| ~~ST-R-05 / OV-R-06~~ | ~~쾅 기준 동시 키 6·유지 300ms~~ — **폐기(CR-019, 🔒 2026-09-24)**. 요구 문서 폐기 표기는 ui-designer 소관(§11 확인 필요 7) | **`slam`·`SlamSettings` 삭제, 쾅 검증 규칙 삭제, 옛 `slam` 키 무시(§3.4)** |
| ST-R-06 | 자동 실행(기본 꺼짐) | `autostart`(기존) |
| ST-R-09 / ST-R-10 | 마우스 파츠 기본값·어깨축 저장 | `default_mouse`, `mouse.shoulder` — 기본값에 `area` 포함, `pad` 삭제 |
| R-tmp-3 (확인 필요 — CR-017, 확정사항 §3 「이동 영역·팔 늘어나기」, 요구ID 미부여) | 자유 사각형 이동 영역, 네 점을 차례로 클릭해 지정·저장 | `MouseSettings.area: [Point; 4]`, `default_area`, 검증(유한수) |
| R-tmp-2 (확인 필요 — 확정사항 §3 「위치 지정」) | 마우스 파츠 위치 (x, y), 기본 (389, 492) | `MouseSettings.part_pos`(기존) |
| **R-tmp-4 (CR-024, 🔒 2026-09-24, 확정사항 §3 「펜 쥔 손 파츠」 — 요구ID 미부여)** | 펜 쥔 손 그림의 위치를 설정 창에서 끌어다 놓아 조정·저장. 쉬는 자세 기준 캔버스 좌표 | **`MouseSettings.pen_pos: Option<Point>`**(JSON `penPos`, 기본 `None`, §3.1.1). 기본 위치 결정·드래그는 ui, 펜 그림 슬롯은 [assets.md](assets.md) §3.8 |
| OV-R-08 (🔒 재정의) | 마우스 파츠 단일 모드, 팔 곡선 폐기 | `arm_width`·`arm_color` 삭제(기존) |
| OV-R-14 (CR-007) | 기본 `hand` 없음(폴백 전용) | `default_mouse().hand = None`(기존). 폴백 ③이 「패드 중심」 → 「영역 중심」(§9.1-6) |
| OV-R-13 | 창 위치 저장 | `overlay.x/y`, `save`(기존. 호출자 window) |
| **PT-04·07·08·09 (CR-045, 🔒 2026-09-26, 확정사항 §6 「뽀모도 타이머」 — 아키텍처 ID, 화면 ID는 ui-designer 확정 예정)** | 타이머 on/off, 시간 글자 위치(끌기)·회전·크기·색 조정, 재시작 후에도 이 값들은 유지(경과는 저장 안 함) | **`Settings.timer: TimerSettings`**(§3.8) — 기본값·검증·읽기 보정. on/off의 상태 효과(끄면 일시정지)는 [timer.md](timer.md) `Timer::disable`, 연결은 bridge |

## 2. 공개 API

함수 시그니처 변경 없음. **CR-019: 공개 구조체 `SlamSettings` 삭제, `Settings`에서 필드 `slam` 삭제**(공개 항목이라 호출자 영향 — §11 CR-019 파급). CR-017의 `MouseSettings` 필드 변경(`pad` → `area`)·`Rect` 삭제는 적용 완료.

| 이름 | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `pub const SCALE_MIN: f64 = 0.25` / `SCALE_MAX: f64 = 2.0` | — | — | — | ST-R-03 |
| `Settings`(**필드 `slam` 삭제**), `OverlaySettings`, `MouseSettings`, `Point` | — | — | — | §3 스키마 |
| ~~`SlamSettings`~~ | — | — | — | **삭제(CR-019)** — 유일한 사용처가 `Settings.slam`(§11 D13) |
| ~~`Rect`~~ | — | — | — | 삭제(CR-017, 적용 완료) |
| `impl Default for Settings` | — | 기본 설정(**`slam` 없음**) | 없음 | 전체 |
| `pub fn default_mouse() -> MouseSettings` | — | 마우스 기본값(`area` = `default_area()` 포함) | 없음 | ST-R-09, R-tmp-3, R-tmp-2, OV-R-14 |
| `impl Settings { pub fn validate(&self) -> Result<(), SettingsError> }` | — | () | `Invalid`(**쾅 규칙 삭제** — 남은 규칙: 배율·유휴·`area` 유한수) | ST-R-03·04, R-tmp-3 |
| `pub fn load_or_default(path: &Path) -> Settings` | 경로 | 설정(없음·손상·**1MiB 초과**(SEC-205) → 기본값 + 경고, 로그에는 파일 이름만) | 없음 | 전체 |
| `pub fn load(path: &Path) -> Result<Option<Settings>, SettingsError>` | 경로 | 파일 없으면 `None`. 본문은 `read_capped_string(path, MAX_TEXT_FILE_BYTES)`로 읽는다 | `Io`(**1MiB 초과 = `InvalidData`**, SEC-205), `Format`, `Invalid` | 전체 |
| `fn save(path: &Path, settings: &Settings) -> Result<(), SettingsError>` — **비공개**(CR-047 ③단계, 소스 반영) | 경로·설정 | () | `Invalid`, `Io`, `Format` | 전체, OV-R-13. 밖에서는 `update` |
| `impl SettingsError { pub fn code(&self) -> &'static str }` | — | `settings.invalid` 등 | 없음 | — |
| `update` · `SaveOutcome` (`store.rs`, `pub use store::{update, SaveOutcome};`) | §3.9.2 | §3.9.2 | §3.9.2 | CORE-001 (CR-047) |
| `pub fn write_atomic(path: &Path, bytes: &[u8]) -> std::io::Result<()>` (`atomic.rs`, 재노출) | 대상 경로, 전체 내용 | () | 폴더·임시 파일 생성·쓰기·`sync_all`·rename 실패(대상은 이전 내용 유지, 임시 파일 정리) | CORE-002 (CR-047) |
| **`pub fn read_capped_string(path: &Path, max_bytes: u64) -> std::io::Result<String>`** (`atomic.rs`, 재노출) | 경로, 상한 바이트 | 파일 전체 텍스트 | 파일 없음 → `NotFound`. `fs::metadata` 길이 > `max_bytes` → 읽지 않고 `ErrorKind::InvalidData`(「파일 크기가 상한({max_bytes}바이트)을 넘습니다: {len}바이트」). 그 밖 IO 오류 | **SEC-205** |
| **`pub const MAX_TEXT_FILE_BYTES: u64 = 1024 * 1024`** (`atomic.rs`, 재노출) | — | 1MiB — settings.json·manifest.json·data-generation.json·data-reset-attempts.json 공용 텍스트 상한 | — | **SEC-205** |
| **`pub struct TimerSettings { pub enabled: bool, pub mode: TimerMode, pub countdown_secs: u32, pub alarm_volume: u32, pub text_pos: Point, pub rotation: f64, pub font_size: f64, pub color: String }`** (`settings::timer`, `mod.rs`에서 `pub use timer::TimerSettings;`) + `impl Default` | — | 기본 `false`·`Stopwatch`·1500·**44**·**(268, 402)**·**7**·36·`"#333333"`(0.4.0, `timer.rs:80-96`) | 없음 | **PT-04·07·08·09**, TM-01·04·10 (§3.8·§3.10) |
| **`Settings.timer: TimerSettings`** | — | 키 없음 → `TimerSettings::default()` | — | **PT-04·07·08·09** |
| **`pub fn timer::validate(t: &TimerSettings) -> Result<(), SettingsError>`** | 타이머 설정 | () — `Settings::validate` 끝에서 호출 | `Invalid`(범위 밖·비유한수·색 형식) | **PT-07·08** |
| **`pub fn timer::normalize(t: TimerSettings) -> TimerSettings`** | 타이머 설정 | 범위로 자르고 비유한수·색 형식 오류는 기본값, 색 소문자 — `load`에서만 호출 | 없음 | **PT-07·08·09** |
| **`pub const timer::{TEXT_POS_MAX_X, TEXT_POS_MAX_Y, ROTATION_MIN, ROTATION_MAX, FONT_SIZE_MIN, FONT_SIZE_MAX}: f64`, `pub const timer::DEFAULT_COLOR: &str`** | — | 900·700·−180·180·12·200, `"#333333"` | — | **PT-07·08** |

- 비공개: `fn default_part_pos() -> Point`, `fn default_area() -> [Point; 4]` — 둘 다 serde `default` 속성과 `default_mouse`가 함께 쓴다(값 한 곳). **CR-045 `timer.rs` 비공개: `fn clamp_or(v: f64, min: f64, max: f64, fallback: f64) -> f64`, `fn in_range(v: f64, min: f64, max: f64) -> bool`, `fn is_hex_color(s: &str) -> bool`**(§3.8.1).
- **CR-045 `Settings::validate`의 남은 규칙**: 배율·유휴·`area` 유한수 + **`timer` 4규칙**(위치·회전·크기·색).

## 3. 내부 구조

- 파일: `src-tauri/src/settings/mod.rs` 1개(현재 471줄, CR-019 적용 후 약 460줄 예상 — 삭제 약 15줄, 테스트 추가 약 25줄). 분리 불필요.

### 3.1 스키마 (camelCase, TS `Settings`와 1:1)

| 필드 | 타입 | 기본값 | 검증 |
|---|---|---|---|
| `scale` | `f64` | 1.0 | 0.25 ≤ x ≤ 2, 유한 |
| `idleSeconds` | `u32` | 300 | 60 ≤ x ≤ 3600(`IDLE_SECONDS_MIN/MAX`, 읽기는 보정 — SV2-12) |
| ~~`slam.keys`~~ | — | — | **삭제(CR-019)** |
| ~~`slam.durationMs`~~ | — | — | **삭제(CR-019)** |
| `overlay.x`, `overlay.y` | `i32` | 100, 100 | 없음 |
| `overlay.visible` | `bool` | true | — |
| `mouse` | `Option<MouseSettings>` | `Some(default_mouse())` | 있으면 아래 |
| `mouse.shoulder` | `Point` | (582, 484)(`default_mouse`, CR-044 — 옛 (620, 530)) | — |
| ~~`mouse.pad`~~ | — | — | 삭제(CR-017) |
| `mouse.area` | `[Point; 4]`, `#[serde(default = "default_area")]` | [(375,525), (495,525), (495,625), (375,625)](2026-09-23 실측 정정, §11 D8) | 네 점의 x·y 모두 유한수. 볼록성·순서·캔버스 안 여부는 검사하지 않음(§11 D9) |
| `mouse.partPos` | `Point`, `#[serde(default = "default_part_pos")]` | `default_mouse` (411, 464)(CR-044). 키 없음 → `default_part_pos()` (389, 492) | 없음 |
| `mouse.hand` | `Option<Point>`, `#[serde(default)]` | `None` | — |
| **`mouse.penPos`** (CR-024, 기본값 CR-035 → CR-044) | **`Option<Point>`, `#[serde(default)]`** | **`Some((372, 476))`**(CR-044, 옛 (380, 496)). 키 없음·`null`은 `None`(필드 default) | **없음(§11 D17)** |
| **`mouse.penMode`** (CR-033) | **`bool`, `#[serde(default)]`** | `default_mouse` **true**(CR-044 배포 기본). 키 없음 → false(필드 default) | **없음(§11 D26)** — §3.6 |
| `autostart` | `bool` | false | — |
| **`timer.enabled`** (CR-045) | **`bool`** | **false** | — |
| **`timer.mode`** (CR-048) | **`TimerMode`** `"stopwatch"`·`"countdown"` | **Stopwatch** | 타입 오류 → 그 필드만 기본값(관대한 역직렬화, §3.10.2) |
| **`timer.countdownSecs`** (CR-048) | **`u32`** | **1500**(`DEFAULT_COUNTDOWN_SECS`) | 1 ≤ x ≤ 359999(읽기는 보정, §3.10.3) |
| **`timer.alarmVolume`** (CR-048) | **`u32`**(%) | **44**(`DEFAULT_ALARM_VOLUME`, 0.4.0 — 옛 80) | 0 ≤ x ≤ 100(읽기는 보정, §3.10.3) |
| **`timer.textPos`** (CR-045) | **`Point`**(글자 상자 **중심**, 캔버스 좌표) | **(268, 402)** (0.4.0, 🔒 사용자 지정 2026-09-28 — 옛 (268, 403) → CR-053 (142, 458)) | 유한수, `0 ≤ x ≤ 900`, `0 ≤ y ≤ 700`(읽기는 자르기) |
| **`timer.rotation`** (CR-045) | **`f64`**(도, 시계 방향 +) | **7** (0.4.0 — 옛 5 → CR-053 9) | 유한수, `−180 ≤ r ≤ 180`(읽기는 자르기) |
| **`timer.fontSize`** (CR-045) | **`f64`**(캔버스 px) | **36** | 유한수, `12 ≤ s ≤ 200`(읽기는 자르기) |
| **`timer.color`** (CR-045) | **`String`** `#rrggbb` | **`"#333333"`** | `#` + 16진수 6자리(대소문자 허용). 읽기는 형식 오류면 기본값·소문자화 |

- `area` JSON 모양: `"area": [{"x":375.0,"y":525.0},{"x":495.0,"y":525.0},{"x":495.0,"y":625.0},{"x":375.0,"y":625.0}]` — 길이 4 배열. serde는 고정 길이 배열 `[T; 4]`를 JSON 배열로 직렬화하고, 길이가 4가 아니면 역직렬화 오류(`Format`)를 낸다.
- 꼭짓점 인덱스 의미(🔒 확정사항 §3): `area[0]` 왼쪽 위, `area[1]` 오른쪽 위, `area[2]` 오른쪽 아래, `area[3]` 왼쪽 아래. ui는 커서가 있는 모니터 안의 비율 (u, v)(0~1)로 `(1−u)(1−v)·P0 + u(1−v)·P1 + u·v·P2 + (1−u)·v·P3`를 구한다(ui 소관 — 인덱스 의미를 계약에 고정하기 위해 적는다).

### 3.1.1 CR-024 — `penPos` (🔒 이름·타입, 구현자가 그대로 옮길 것)

결론: `MouseSettings` 끝에 선택 필드 하나를 더한다. `hand`와 같은 모양(`Option<Point>` + `#[serde(default)]`)이라 옛 파일은 `None`으로 읽히고 검증 규칙은 늘지 않는다.

비유: 장부의 "팔" 칸 아래에 "펜 쥔 손 자리" 칸을 새로 만든다. 처음엔 비어 있고(None), 손 그림을 처음 붙일 때 ui가 자리를 적어 넣는다.

```rust
pub struct MouseSettings {
    // shoulder · area · part_pos · hand — 기존 그대로
    #[serde(default)]
    pub hand: Option<Point>,
    /// 펜 쥔 손 그림(pen_up·pen_down_N·pen_key_*)의 왼쪽 위 모서리 캔버스 좌표 — 쉬는 자세(회전 0°·배율 1)
    /// 기준(CR-024). None = 아직 놓지 않음: 손 그림을 처음 등록하면 ui 가 기본 위치를 정해 저장한다.
    /// 팔이 회전·늘어날 때의 위치·각도 변환은 ui 몫. 키가 없는 옛 settings.json 은 None.
    #[serde(default)]
    pub pen_pos: Option<Point>,
}

// default_mouse(): `hand: None,` 다음 줄
        // CR-024: 펜 쥔 손 위치는 손 그림을 처음 등록할 때 ui 가 정한다(기본값 없음).
        pen_pos: None,
```

- JSON: 기본은 `"penPos": null`(`hand`처럼 `None`도 키를 쓴다 — `skip_serializing_if` 없음), 값이 있으면 `"penPos": {"x": 410.0, "y": 505.0}`.
- 옛 파일 호환(§3.3에 한 행 추가로 읽는다): `mouse`에 `penPos`가 없음 → `None`. 새 파일을 옛 앱이 읽으면 `penPos`는 모르는 키라 무시(다음 저장 때 사라짐 — 새 앱으로 돌아오면 ui가 다시 기본 위치를 정한다).
- 검증 없음(§11 D17). `mouse`가 `None`이면 `penPos`도 없다 — 펜 손은 팔 끝에 붙으므로 마우스 파츠를 끄면 표시 대상이 아니다(ui 판단, 확인 필요 9).
- 손 기준점과 무관: `compute_hand_anchor` 인자는 `(shoulder, part_pos)`뿐이라 `penPos` 변경은 재계산 트리거가 아니다([assets.md](assets.md) §3.8).
- 구조체 리터럴 파급: `settings/mod.rs:233`(테스트), `examples/import_sample.rs:69` — `pen_pos: None,` 한 줄씩(§11 CR-024 파급).
- `//!` [호환] 누락 키 목록에 `penPos` 추가, [테스트]에 "penPos 기본·옛 파일·왕복(CR-024)". 줄 수 약 487 → 530.

### 3.2 CR-017 변경 텍스트 (적용 완료 — 기록용)

```rust
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MouseSettings {
    /// 마우스 파츠가 회전하는 축인 어깨 고정점(캔버스 좌표)
    pub shoulder: Point,
    /// 손이 움직이는 자유 사각형 이동 영역(캔버스 좌표). 순서 [왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래].
    /// ui 가 커서가 있는 모니터 안의 비율 (u, v)를 네 점에 쌍선형 보간해 손 목표점을 구한다(CR-017).
    /// 키가 없는 옛 settings.json 은 기본값으로 채운다(옛 `pad` 키는 모르는 키라 무시된다).
    #[serde(default = "default_area")]
    pub area: [Point; 4],
    /// 마우스 파츠 그림(기본·왼클릭·오른클릭 공통)의 왼쪽 위 모서리를 놓을 캔버스 좌표.
    /// 캔버스 전체 크기 그림이면 (0, 0). 키가 없는 옛 settings.json 은 기본값으로 채운다.
    #[serde(default = "default_part_pos")]
    pub part_pos: Point,
    /// 회전 기준점의 폴백(캔버스 좌표). 1순위는 mouse_base 에서 자동 계산한 끝부분 무게중심
    /// (assets::compute_hand_anchor), 이것이 없을 때 이 값, 이것도 None 이면 ui 가 이동 영역 중심
    /// (네 꼭짓점 평균)을 쓴다.
    #[serde(default)]
    pub hand: Option<Point>,
}

/// 이동 영역 기본값 — 예시 mouse_pen_hand.png(202×154)를 part_pos (389, 492)에 둘 때의 손 기준점
/// (compute_hand_anchor 실측 (435.06, 575.27))을 중심으로 한 120×100 직사각형. 어깨 (620, 530)에서
/// 네 꼭짓점까지의 늘어나기 배율 0.66~1.38(허용 0.5~1.6) — 영역 전체가 닿는다
/// (확정사항 §3, CR-017, 2026-09-23 실측 정정). TS DEFAULT_MOUSE_SETTINGS.area 와 1:1.
fn default_area() -> [Point; 4] {
    [
        Point { x: 375.0, y: 525.0 }, // 왼쪽 위
        Point { x: 495.0, y: 525.0 }, // 오른쪽 위
        Point { x: 495.0, y: 625.0 }, // 오른쪽 아래
        Point { x: 375.0, y: 625.0 }, // 왼쪽 아래
    ]
}

/// 기본 마우스 파츠 설정 — 예시 몸통 기준(2026-09-23 사용자 확정). TS DEFAULT_MOUSE_SETTINGS 와 1:1.
pub fn default_mouse() -> MouseSettings {
    MouseSettings {
        shoulder: Point { x: 620.0, y: 530.0 },
        area: default_area(),
        part_pos: default_part_pos(),
        // CR-007(2026-09-23): 손 기준점은 mouse_base 이미지에서 자동 계산한다(assets::compute_hand_anchor).
        // hand 는 자동 계산이 실패할 때만 쓰는 폴백이라 기본값이 없다.
        // 이전 기본값(예시 몸통 기준) — 사용자 지정으로 삭제하지 않고 보존:
        // hand: Some(Point { x: 495.0, y: 570.0 }),
        hand: None,
    }
}
```

- `pub struct Rect { … }` 정의 삭제(§11 D12), `validate`의 마우스 블록은 `area` 유한수 검사(적용 완료).

### 3.3 옛 settings.json 호환 (🔒 요구: 읽기 실패 금지)

| 옛 파일 상태 | 동작 | 근거 |
|---|---|---|
| **`slam`이 있음(CR-019 이전 파일 전부) — 값이 정상이든, 옛 규칙 위반(`keys: 1`, `durationMs: 0`)이든, 형식이 다르든(문자열·숫자·`null`)** | **무시하고 읽는다.** 이전엔 쾅 규칙 위반 파일이 `Invalid` → 파일 전체 기본값이었지만 이제 성공한다 | `Settings`에 `deny_unknown_fields`가 없다(Grep 2026-09-24: `src-tauri/src` 어디에도 없음). serde derive는 모르는 키의 값을 형식과 무관하게 건너뛴다(`IgnoredAny`). 구현자는 이 속성을 붙이지 않는다 |
| `mouse`에 `pad`가 있음(CR-017 이전 파일 전부) | 무시하고 읽는다. 값 변환 없음(🔒 사용자 결정) | 같음 |
| `mouse`에 `area`가 없음 | `area = default_area()` | 필드 속성 `#[serde(default = "default_area")]` |
| `mouse`에 `armWidth`·`armColor`가 남아 있음 | 무시(기존) | 같음 |
| `mouse`에 `partPos`·`hand`가 없음 | (389, 492) / `None`(기존) | 같음 |
| `area`가 배열이 아니거나 길이 ≠ 4, 원소에 `x`/`y` 누락 | `Format` 오류 → `load_or_default`가 파일 전체를 기본값으로 대체(경고 로그) | 다른 필드의 형식 오류와 같은 기존 동작(§11 D11) |
| 다음 `save` | 파일에서 **`slam`**·`pad`·`armWidth`·`armColor` 키가 사라지고 `area`가 생긴다 | 직렬화는 구조체 필드만 쓴다. 마이그레이션 코드 불필요 |

- `version` 필드는 여전히 없다(§11 확인 필요 1). CR-019도 serde 기본 동작(모르는 키 무시)만으로 호환된다.

### 3.4 CR-019 변경 텍스트 (구현자가 그대로 옮길 것)

**삭제**(주석 보존 안 함 — §11 D13):

1. `pub struct SlamSettings { … }` 정의 전체(`#[derive]`·`#[serde]`·문서주석 포함, 현재 29~36행).
2. `Settings`의 `pub slam: SlamSettings,` 필드.
3. `impl Default for Settings`의 `slam: SlamSettings { keys: 6, duration_ms: 300 },`.
4. `validate`의 쾅 규칙 3줄(`if self.slam.keys < 2 || self.slam.duration_ms == 0 { return bad("쾅 기준은 …"); }`).

결과 형태:

```rust
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// 표시 배율 0.25 ~ 2
    pub scale: f64,
    /// 무입력 후 쉬는중 전환까지의 초
    pub idle_seconds: u32,
    pub overlay: OverlaySettings,
    /// 마우스 파츠를 쓰지 않으면 None
    pub mouse: Option<MouseSettings>,
    pub autostart: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            scale: 1.0,
            idle_seconds: 300,
            overlay: OverlaySettings {
                x: 100,
                y: 100,
                visible: true,
            },
            mouse: Some(default_mouse()),
            autostart: false,
        }
    }
}

impl Settings {
    pub fn validate(&self) -> Result<(), SettingsError> {
        let bad = |msg: &str| Err(SettingsError::Invalid(msg.to_string()));
        if !(SCALE_MIN..=SCALE_MAX).contains(&self.scale) || !self.scale.is_finite() {
            return bad("배율은 0.25 ~ 2 사이여야 합니다.");
        }
        if self.idle_seconds == 0 {
            return bad("유휴 시간은 1초 이상이어야 합니다.");
        }
        if let Some(m) = &self.mouse {
            if m.area.iter().any(|p| !p.x.is_finite() || !p.y.is_finite()) {
                return bad("이동 영역의 네 꼭짓점 좌표는 유한한 수여야 합니다.");
            }
        }
        Ok(())
    }
}
```

모듈 `//!` 갱신:

- [규칙] `scale 0.25~2 / idleSeconds ≥ 1 / mouse 가 있으면 area 네 점이 유한수(볼록성·순서는 검사 안 함).` (`slam.keys ≥ 2, durationMs ≥ 1` 삭제)
- [호환] `모르는 키(옛 slam·armWidth·armColor·pad)는 값·형식과 무관하게 무시, 누락 키(area·partPos·hand)는 기본값으로 채운다.`
- [테스트] 끝에 `옛 slam 키 무시(쾅 폐기, CR-019)` 추가.

### 3.5 settings-v2 — 새 필드 3개·관용 언어 읽기 (SV2-02·03·04·05, 🔒 구현자가 그대로 옮길 것)

결론: `Settings` 끝에 필드 3개를 더한다. 셋 다 컨테이너 `#[serde(default)]`로 옛 파일에서 기본값이 되고, 언어는 **어떤 값이 와도 읽기에 실패하지 않는다**(모르는 값 → `Ko`).

비유: 장부에 "말(언어)·자물쇠(위치 잠금)·작업표시줄 이름표" 칸 3개를 새로 만든다. 옛 장부엔 칸이 없으니 기본값(한국어·안 잠금·이름표 없음)으로 읽는다. 언어 칸에 "프랑스어"처럼 모르는 말이 적혀 있어도 장부 전체를 버리지 않고 그 칸만 한국어로 읽는다.

**§1 증분 (요구 → 이 모듈의 몫)**

| 요구ID | 내용 | 이 모듈의 몫 |
|---|---|---|
| SV2-02 (제안 설정 R-20, R-01 「UI 언어 한국어」 수정) | 언어 선택 한국어/일본어/영어 | `Language`, `Settings.language` 저장·관용 읽기. 번역은 ui |
| SV2-03 (제안 설정 R-21·오버레이 R-28) | 위치 잠금 | `Settings.position_lock` 저장. 적용은 [window.md](window.md) §2.4 |
| SV2-04 (제안 설정 R-22) | 작업표시줄 표시 | `Settings.show_in_taskbar` 저장. 적용은 window |
| SV2-05 (제안 설정 R-23, ST-R-06 대체) | 자동 실행(작업 스케줄러) | `autostart` 필드 불변. 쓰기 주체 변경은 [tray.md](tray.md) §7·window `keep_core_owned` |

**§2 증분 (공개 API)**

| 이름 | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `pub enum Language { Ko, Ja, En }` (`Default` = `Ko`, `Serialize` 소문자, **수동 `Deserialize`**) | — | — | 역직렬화 실패 없음(모르는 값 → `Ko`) | SV2-02 |
| `Settings.language: Language` / `.position_lock: bool` / `.show_in_taskbar: bool` | — | — | — | SV2-02·03·04 |

- 함수 시그니처 변경 없음. `validate`에 새 규칙 없음(bool 2개와 enum — 02-design §4).

**코드 (§3.1 스키마에 3행 추가: `language` `Language` 기본 `"ko"` 관용 읽기 / `positionLock` `bool` false / `showInTaskbar` `bool` false)**

```rust
use serde::{Deserialize, Deserializer, Serialize};

/// 설정 창 표시 언어(SV2-02). core 는 값을 저장만 하고 문구 번역은 ui 가 한다.
/// JSON "ko" | "ja" | "en". 그 밖의 값(다른 문자열·대소문자 다름·null·숫자·객체)은 Ko 로 읽는다 —
/// settings.json 전체 읽기 실패·set_settings 인자 오류가 나지 않게(§11 D20).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    #[default]
    Ko,
    Ja,
    En,
}

impl Language {
    /// "ja"·"en" 과 정확히 같을 때만 해당 값, 그 밖은 Ko.
    fn from_code(code: &str) -> Self {
        match code {
            "ja" => Self::Ja,
            "en" => Self::En,
            _ => Self::Ko,
        }
    }
}

impl<'de> Deserialize<'de> for Language {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        // 어떤 JSON 값이든 먼저 받아 두고(형식 오류 없음) 문자열일 때만 해석한다.
        let value = serde_json::Value::deserialize(deserializer)?;
        Ok(Self::from_code(value.as_str().unwrap_or_default()))
    }
}

// Settings — 기존 필드 뒤에 추가 (컨테이너 #[serde(rename_all = "camelCase", default)] 그대로)
    /// 자동 실행 작업 등록 여부(SV2-05). 쓰기 주체는 core 뿐 — set_autostart(tray::autostart 성공 뒤)와
    /// 시작 시 조회 보정. set_settings 입력값은 무시된다(window::keep_core_owned).
    pub autostart: bool,
    /// 설정 창 언어(SV2-02). 키가 없는 옛 settings.json 은 Ko.
    pub language: Language,
    /// 위치 잠금(SV2-03). true 면 오버레이가 마우스 클릭을 통과시킨다(window::apply_overlay_window).
    pub position_lock: bool,
    /// 오버레이를 작업표시줄에 보일지(SV2-04). 기본 false = 현행(tauri.conf.json skipTaskbar: true)과 같다.
    pub show_in_taskbar: bool,

// impl Default for Settings — autostart: false, 다음 줄
            language: Language::Ko,
            position_lock: false,
            show_in_taskbar: false,
```

- 직렬화: `"language":"ko"`, `"positionLock":false`, `"showInTaskbar":false`(camelCase). 기본값도 키를 쓴다.
- 옛 파일 호환(§3.3에 한 행 추가로 읽는다): 세 키가 없음 → 기본값. `"language": "fr"`·`null`·`5` → `Ko`(다른 필드는 그대로 읽힘). 새 파일을 옛 앱이 읽으면 세 키는 모르는 키라 무시(다음 저장 때 사라짐).
- 구조체 리터럴 파급: `Settings { … }` 전체 리터럴은 `impl Default`뿐(`keep_overlay_position`은 `..incoming` 펼침). 구현 시 Grep `Settings {`로 재확인(테스트·examples 포함).
- `//!` 갱신: [공개 API]에 `Language`, [호환] 누락 키 목록에 `language·positionLock·showInTaskbar`, "모르는 language 값은 ko", [테스트]에 "새 필드 3개 기본·관용 언어·직렬화 키(SV2)".
- 줄 수: 563 → 약 650(코드 ~35 + 테스트 ~55). 800 이하.

**§8 증분 — 단위·tempdir (`settings/mod.rs` `#[cfg(test)]`)**

| # | 이름 | 준비·호출 | 기대 |
|---|---|---|---|
| V1 | `settings_old_file_defaults_new_fields` (C-1) | 새 키 없는 옛 JSON(`scale: 1.5`, `idleSeconds: 60`, `overlay {x:300,y:400,visible:false}`, `mouse` 기본, `autostart: true`)을 tempdir 파일로 → `load` | `Ok(Some(s))`, `language == Ko`, `!position_lock`, `!show_in_taskbar`, `scale == 1.5`, `idle_seconds == 60`, `overlay == (300,400,false)`, `autostart` |
| V2 | `settings_unknown_language_is_ko` (C-2) | ① tempdir 파일 `{"language":"fr","idleSeconds":60}` → `load` ② `serde_json::from_str::<Settings>`에 `"language"` = `"KO"` / `null` / `5` / `{}` / `"ja"` / `"en"` | ① `Ok`, `Ko`, `idle_seconds == 60`(파일 전체 기본값 대체 아님) ② `Ko`/`Ko`/`Ko`/`Ko`/`Ja`/`En`, 모두 `Ok` |
| V3 | `settings_serialize_new_keys` (C-3) | `Settings { language: Ja, position_lock: true, show_in_taskbar: true, ..Default::default() }` 직렬화 / 기본값 직렬화 | `"language":"ja"`, `"positionLock":true`, `"showInTaskbar":true` 포함, `position_lock`·`show_in_taskbar`·`"Ja"` 미포함 / 기본값에 `"language":"ko"`, `"positionLock":false`, `"showInTaskbar":false` |
| V4 | `settings_new_fields_round_trip` | tempdir `save` → `load`, `En`/false/true | 같은 값 |
| V5 | `validate_has_no_rule_for_new_fields` | 세 필드의 모든 조합(언어 3 × bool 2 × bool 2) | 모두 `validate` = `Ok` |

- C-4(`keep_core_owned`)는 [window.md](window.md) §2.4 K6·K7. 기존 U1~U12·C1~C5·N1~N5 전건 PASS.

**§9 증분 — bridge 요구 (계약 §3.3) — 호환성: 추가(저장 데이터 비파괴)**

| # | 계약 위치 | 요구 | 호환성 |
|---|---|---|---|
| 1 | TS `Settings` | 추가 `language: 'ko' \| 'ja' \| 'en'`(기본 `'ko'`), `positionLock: boolean`(false), `showInTaskbar: boolean`(false). `DEFAULT_SETTINGS`에 같은 기본값 | 추가 — TS 필수 필드면 픽스처 갱신(ui) |
| 2 | Rust 계약 블록 | `Language` enum(§3.5 코드) + 필드 3개 | 추가 |
| 3 | 검증 규칙 | 없음. 계약 문구: "`language`에 세 값 밖의 값이 오면 core는 `'ko'`로 저장한다(거부하지 않음)" | 설명 |
| 4 | `autostart` 설명 | "쓰기는 `set_autostart`와 앱 시작 보정뿐. `set_settings` 입력값은 무시(core 현재값 유지)" — `overlay.x/y`와 같은 core 소유 필드([window.md](window.md) §9.5) | 의미 변경(02-design §3 파괴 가능 변경 명시) |
| 5 | 런타임 호환 | ① 옛 settings.json → 기본값 ② 새 ui + 옛 Rust: 모르는 키 무시(값 저장 안 됨) ③ 옛 ui + 새 Rust: ui 사본이 `get_settings`·`settings://changed`에서 왔으면 JS 객체가 모르는 키를 그대로 실어 보내 보존된다. 사본이 TS `DEFAULT_SETTINGS`(로드 전)이면 세 값이 기본값으로 저장된다 → **core·bridge·ui 한 반영 묶음** | 비파괴(순서 의존) |
| 6 | 변경 이력 | "Settings: `language`·`positionLock`·`showInTaskbar` 추가(SV2 — 추가). `autostart`는 core 소유 필드" | — |

**유휴 시간 범위 60~3600초 (🔒 메인 세션 결정 2026-09-24, SV2-12 — 설정 창 입력 1~60분)**

결론: `validate`의 유휴 규칙을 `≥ 1` → **`60 ≤ idle_seconds ≤ 3600`**으로 바꾼다. 에러는 기존 `SettingsError::Invalid`(`settings.invalid`). **위 7차 변경이력의 "D-7 = settings 변경 없음"과 §10 "SV2-11·12 — 배율·유휴 검증 그대로" 행, §3.4 코드의 `if self.idle_seconds == 0` 규칙은 이 항목으로 대체된다**(배율 규칙은 그대로).

```rust
/// 유휴 시간 범위(초) — 설정 창 1~60분(SV2-12). TS·계약 §3.3과 같은 값.
pub const IDLE_SECONDS_MIN: u32 = 60;
pub const IDLE_SECONDS_MAX: u32 = 3600;

// validate() — 기존 `if self.idle_seconds == 0 { … }` 을 교체
        if !(IDLE_SECONDS_MIN..=IDLE_SECONDS_MAX).contains(&self.idle_seconds) {
            return bad("유휴 시간은 60 ~ 3600초(1 ~ 60분) 사이여야 합니다.");
        }

// load() — 역직렬화 직후, validate 전에 (옛 파일 보호, §11 D24)
    let mut settings: Settings = serde_json::from_str(&text)?;
    let clamped = settings.idle_seconds.clamp(IDLE_SECONDS_MIN, IDLE_SECONDS_MAX);
    if clamped != settings.idle_seconds {
        log::warn!("유휴 시간 {}초가 범위 밖이라 {}초로 읽습니다", settings.idle_seconds, clamped);
        settings.idle_seconds = clamped;
    }
    settings.validate()?;
```

- 적용 범위: `save`·bridge `set_settings`(둘 다 `validate` 경유)는 **범위 밖이면 거부**, 파일 읽기(`load`)는 **범위 안으로 보정**해 파일 전체가 기본값으로 초기화되지 않게 한다. 기본값 300은 범위 안.
- 테스트 추가: **V6** `idle_seconds_range` — 0·59·3601 → `Err(Invalid)`, 60·300·3600 → `Ok`. **V7** `load_clamps_out_of_range_idle_seconds` — tempdir 파일 `{"idleSeconds": 30, "scale": 1.5}` → `load` = `Ok`, `idle_seconds == 60`, `scale == 1.5` / `99999` → 3600. 기존 C2(`idle_seconds = 0` → `Err`) 그대로 PASS.
- 파급: 기존 테스트·픽스처·examples에서 `idle_seconds`/`idleSeconds`를 60 미만·3600 초과로 두고 `validate`·`save`·`load`를 거치는 곳이 있으면 60 이상으로 바꾼다(단언 의도 유지) — 구현 시 Grep `idle_seconds\|idleSeconds` in `src-tauri/`. `//!` [규칙] `idleSeconds ≥ 1` → `idleSeconds 60~3600(읽기는 보정)`.
- bridge 요구: 계약 §3.3 검증 문구 `idleSeconds ≥ 10` → **`60 ≤ idleSeconds ≤ 3600`**(§11 확인 필요 2 해소), TS 상수 `IDLE_SECONDS_MIN/MAX` 권장. 호환성: 규칙 강화 — ui는 이 범위만 보내야 한다(설정 창 1~60분 입력).
- 결정 **D24**: 읽기 보정(clamp) — 대안 ① 읽기에서도 거부(범위 밖 옛 파일 → `load_or_default`가 설정 전체를 기본값으로 대체, D9와 같은 대가) ② 보정 없이 규칙만 완화. 옛 UI에는 유휴 입력이 없었고(R-04 보류) 기본 300이라 범위 밖 파일은 손 편집뿐이지만, 한 필드 때문에 위치·마우스 설정까지 잃지 않게 한다.

### 3.6 CR-033 — `penMode` 펜 손 사용 토글 (🔒 이름·타입, 구현자가 그대로 옮길 것)

결론: `MouseSettings` 끝(`pen_pos` 뒤)에 `pen_mode: bool`(JSON `penMode`, 필드 `#[serde(default)]`, 기본 false)을 더한다. settings는 값을 **저장만** 한다 — 검증 규칙·함수 시그니처·`version`·마이그레이션 없음. 쓰는 주체는 ui(`set_settings`)이고 core 소유 필드가 아니다.

비유: 펜 손 서랍에 "사용 중" 스위치를 하나 단다. 장부는 스위치가 켜졌는지만 적고, 켜졌을 때 손 그림을 바꿀지 키보드 그림을 바꿀지는 무대(ui)가 정한다. 옛 장부엔 스위치 칸이 없으니 "꺼짐"으로 읽는다.

**§1 증분**

| 요구ID | 내용 | 이 모듈의 몫 |
|---|---|---|
| **R-tmp-5 (CR-033, 🔒 2026-09-24, 확정사항 §3 「펜 손 사용 토글」 — 요구ID 미부여, 확인 필요 11)** | 펜 모드를 `pen_up` 등록 여부가 아니라 설정 `mouse.penMode`(bool)로 켜고 끈다. 토글·안내 상자·켤 때 확인창·`pen_up` 첫 등록 확인창·모드 해석(손 교체 / 키보드 그림 / 클릭 바운스)은 ui | `MouseSettings.pen_mode` 저장, 기본 false, 옛 파일 false |

**§2 증분** — 함수 시그니처 변경 없음. 공개 구조체 `MouseSettings`에 공개 필드 `pen_mode` 추가 → 구조체 리터럴 호출자 파급(아래 「파급」).

**코드**

```rust
pub struct MouseSettings {
    // shoulder · area · part_pos · hand — 기존 그대로
    #[serde(default)]
    pub pen_pos: Option<Point>,
    /// 펜 손 사용 토글(CR-033). true 면 ui 가 키보드 입력(과 CR-027 클릭) 때 펜 손 그림을 바꾸고
    /// 키보드 레이어를 kb_up 에 고정한다. false 면 pen_up 을 팔 끝에 붙인 채 바꾸지 않는다.
    /// pen_up 등록 여부와 무관하게 저장만 한다(해석은 ui). 키가 없는 옛 settings.json 은 false.
    #[serde(default)]
    pub pen_mode: bool,
}

// default_mouse(): `pen_pos: None,` 다음 줄
        // CR-033: 펜 손 모드는 기본 꺼짐 — pen_up 첫 등록 때 ui 확인창으로 켠다.
        pen_mode: false,
```

- 필드 단위 `#[serde(default)]`가 **필수**다 — `MouseSettings`에는 컨테이너 `default`가 없다(D4). `Settings`의 컨테이너 `default`는 `mouse` 안쪽 필드에 미치지 않는다.
- JSON: 항상 키를 쓴다 — `"penMode": false` / `true`(`skip_serializing_if` 없음).
- `mouse = None`(마우스 파츠 끔)이면 `penMode`도 없다 — 펜 손이 팔 끝에 붙는 부품이라 수명이 같다(D18과 같은 근거, 확인 필요 9).
- 손 기준점 재계산 트리거 아님(`bridge/commands.rs` 비교 키 `(shoulder, part_pos)` 불변).
- `//!` 갱신: [규칙] 끝에 `penMode 검증 없음(CR-033)`, [호환] 누락 키 목록에 `penMode`, [테스트]에 `penMode 기본·옛 파일·왕복(CR-033, pen_mode_tests.rs)`.
- 파일 줄 수: `mod.rs` 현재 **770줄** → 약 781(필드·주석 5, 기본값 2, 테스트 리터럴 1, 자식 모듈 선언 2). **새 테스트는 자식 파일 `src-tauri/src/settings/pen_mode_tests.rs`**(`#[cfg(test)] mod pen_mode_tests;`, `use super::*;` — 부모 비공개 항목 접근 가능). §11 D29.

**옛 settings.json 호환 (§3.3에 행 추가로 읽는다)**

| 파일 상태 | 동작 |
|---|---|
| `mouse`에 `penMode` 없음(CR-033 이전 파일 전부) | false. 다른 필드(`penPos` 포함) 그대로 — 파일 전체 기본값 대체 아님 |
| `penMode`가 bool이 아님(`null`·문자열·숫자) | `Format` → `load_or_default`가 파일 전체 기본값(경고 로그). `positionLock`·`showInTaskbar`와 같은 기존 bool 취급(D27). Rust·TS 모두 bool만 쓰므로 손 편집에서만 생긴다 |
| 새 파일을 옛 앱이 읽음 | 모르는 키로 무시(다음 저장 때 사라짐) |

**파급 (Grep 2026-09-24)**

| 파일·위치 | 변경 | 소관 | 컴파일 |
|---|---|---|---|
| `src-tauri/src/settings/mod.rs:46-68`(구조체)·`:143-156`(`default_mouse`)·`//!` | 위 코드 | core-implementer | — |
| `src-tauri/src/settings/mod.rs:302-313`(테스트 `MouseSettings` 리터럴) | `pen_mode: false,` 한 줄 | core-implementer | **깨짐**(필드 누락) |
| `src-tauri/examples/import_sample.rs:84-90` | `pen_mode: false,` 한 줄 | core-implementer | **깨짐**(예제) |
| `src-tauri/src/window/placement.rs` `keep_core_owned`·`bridge/commands.rs` | 없음 — `pen_mode`는 incoming 값이 그대로 저장된다(ui 소유) | — | — |
| `src-tauri/src/bridge/types.rs:10` 문서주석 표 | `MouseSettings(v?: penMode 추가, CR-033)` | bridge-implementer | 없음(주석) |
| `doc/200_설계/bridge/contract.md` §3.3·§5.1·변경 이력 | §9 아래 CR-033 요구 | bridge-designer | — |
| `src/bridge/types.ts` `MouseSettings`·`DEFAULT_MOUSE_SETTINGS` | `penMode` 추가 | bridge-implementer | TS(필수 필드면 픽스처) |
| `src/settings/`(토글·안내·확인창)·`src/overlay/`(모드 해석) | 요구만 | ui | — |

**§8 증분 — `settings/pen_mode_tests.rs` (단위·tempdir)**

| # | 이름(안) | 준비·호출 | 기대 |
|---|---|---|---|
| P1 | `default_pen_mode_is_false_and_serialized` | `default_mouse()`, `serde_json::to_string(&Settings::default())` | `pen_mode == false`, 직렬화에 `"penMode":false` 포함·`"pen_mode"` 없음 |
| P2 | `old_file_without_pen_mode_reads_false` | ① `MouseSettings` JSON(`shoulder`·`partPos`·`penPos {x:410,y:505}`, `penMode` 없음) → `from_str` ② tempdir 파일(`scale: 1.5`, 같은 `mouse`) → `load` | ① `Ok`, `pen_mode == false`, `pen_pos == Some(410,505)` ② `Ok(Some(s))`, `s.mouse.pen_mode == false`, `s.scale == 1.5`(기본값 대체 아님) |
| P3 | `pen_mode_round_trips` (tempdir) | `pen_mode = true` → `save` → `load` | `true`, 파일 텍스트에 `"penMode"` 있음 |
| P4 | `pen_mode_has_no_validation_rule` | ① `pen_mode = true`, `pen_pos = None` ② `pen_mode = false`, `pen_pos = Some(..)` | 둘 다 `validate` = `Ok`(`pen_up` 등록·`penPos`와의 관계를 검사하지 않음 — D26) |
| P5 | `pen_mode_non_bool_is_format_error` | `MouseSettings` JSON의 `"penMode"` = `null` / `"true"` / `1` | 모두 `Err`(D27 고정 — 관용 읽기 아님) |

- 교차 확인(선택, window 소관 — [window.md](window.md) §2.4): `keep_core_owned(incoming{pen_mode: true}, current{pen_mode: false})` → `true`(ui 소유 필드가 core 값으로 덮이지 않음). 기존 K6·K7 옆에 K8로 둘지는 window 설계·구현자 판단.
- 기존 U1~U12·C1~C5·N1~N5·V1~V7 전건 PASS(리터럴 한 줄 추가 외 수정 없음). `cargo check --examples` 통과(`import_sample.rs` 수리 증명).

**§9 증분 — bridge 요구 (계약 §3.3·§5.1) — 호환성: 추가, 저장 데이터 비파괴**

| # | 계약 위치 | 요구 | 호환성 |
|---|---|---|---|
| 1 | TS `Settings.mouse` | 추가 `penMode: boolean  // 펜 손 사용(CR-033). true = 키보드 입력·클릭 때 펜 손 그림 교체, 키보드 레이어 kb_up 고정. false = pen_up 고정 표시. 기본 false`. `DEFAULT_MOUSE_SETTINGS.penMode = false`. Rust는 항상 키를 보낸다 | 추가 — TS 필수 필드면 픽스처 갱신(ui) |
| 2 | Rust 계약 블록 `MouseSettings` | `#[serde(default)] pub pen_mode: bool` | 추가 |
| 3 | 마우스 기본값 표·JSON 예시 | `penMode` 행 / `"penMode": false` | 설명 |
| 4 | 검증 규칙 | 없음. 문구: "`pen_up`이 없어도 `true`를 거부하지 않는다 — 토글 비활성·표시 판단은 ui" | — |
| 5 | 필드 소유 | **ui 소유**(`set_settings`로 저장). core 소유 필드(`autostart`·`overlay.x/y`) 목록에 넣지 않는다 | 설명 |
| 6 | 런타임 호환 | ① 옛 settings.json → false ② 새 ui + 옛 Rust: 모르는 키 무시, 저장 안 됨(재시작하면 꺼짐) ③ 옛 ui + 새 Rust: ui 사본이 `get_settings`·`settings://changed`에서 왔으면 JS 객체가 키를 실어 보내 보존, `DEFAULT_MOUSE_SETTINGS`에서 왔으면 false로 저장 → **core·bridge·ui 한 반영 묶음** | 비파괴(순서 의존) |
| 7 | §5.1 손 기준점 「재계산 안 함」 목록 | `mouse.penMode` 추가(비교 키 불변 — 코드 변경 없음) | 설명만 |
| 8 | 새 command·event | 없음 — 기존 `get_settings`·`set_settings`·`settings://changed` 페이로드에 실려 간다 | — |
| 9 | 변경 이력 | "MouseSettings: `penMode` 추가(CR-033 — 추가)" | — |

### 3.7 CR-035 — `penPos` 기본값 (380, 496)·마우스 기본값 근거 주석 정정 (DA-07, 🔒 U-2 = B, 구현자가 그대로 옮길 것)

결론: `default_mouse()`의 `pen_pos`만 `None` → `Some(Point { x: 380.0, y: 496.0 })`으로 바꾼다. 필드 타입(`Option<Point>`)·필드 속성(`#[serde(default)]`)·검증·함수 시그니처·`version`은 그대로다. `area`·`part_pos`는 값을 바꾸지 않고 근거 주석만 기본 세트 `mouse_base.png`로 고친다. §3.1.1의 「기본 `None`」·「JSON 기본은 `"penPos": null`」 서술은 이 절로 대체된다.

비유: 새 앨범의 「펜 손 스티커 붙일 자리」에 연필로 점을 찍어 두는 것이다. 이미 쓰던 앨범에 「아직 안 붙임」(null)이라고 적혀 있으면 그 메모는 지우지 않는다.

```rust
// MouseSettings.pen_pos 문서주석(settings/mod.rs:65-67) 교체
    /// 펜 쥔 손 그림(pen_up·pen_down_N·pen_key_*)의 왼쪽 위 모서리 캔버스 좌표 — 쉬는 자세(회전 0°·배율 1)
    /// 기준(CR-024). 기본값(default_mouse) (380, 496) = 기본 세트 pen_up(90×154)을 사용자가 끌어다 놓은 자리
    /// (2026-09-24 settings.json, CR-035 U-2 = B). None = 아직 놓지 않음 — 손 그림을 처음 등록하면 ui 가 정한다.
    /// 키가 없는 옛 settings.json 과 `"penPos": null` 은 None(필드 default — default_mouse 값을 쓰지 않는다).
    #[serde(default)]
    pub pen_pos: Option<Point>,

// default_part_pos 문서주석(:77-78) 교체 — 값 불변
/// 마우스 파츠 위치 기본값 — 기본 세트 `doc/assets/defaults/mouse_base.png`(202×154, CR-035) 기준.
/// 2026-09-24 실사용 settings.json 과 일치. TS DEFAULT_MOUSE_SETTINGS.partPos 와 1:1.
/// (이력: 처음 근거는 예시 mouse_pen_hand.png(202×154)가 900×700 그림에 놓여 있던 자리, 2026-09-23.)

// default_area 문서주석(:83-87) 교체 — 값 불변
/// 이동 영역 기본값 — 기본 세트 `doc/assets/defaults/mouse_base.png`(202×154, CR-035) 기준.
/// 2026-09-24 실사용 settings.json 과 일치. 손 기준점 둘레의 120×100 직사각형, 어깨 (620, 530)에서 네 꼭짓점까지의
/// 늘어나기 배율 허용 0.5~1.6(확정사항 §3, CR-017). TS DEFAULT_MOUSE_SETTINGS.area 와 1:1.
/// (이력: 2026-09-23 재조정 근거는 예시 mouse_pen_hand.png 를 part_pos (389, 492)에 둘 때의 기준점
/// (435.06, 575.27)과 배율 1.287 / 0.657 / 0.825 / 1.38 — I1 실측.)

// default_mouse() 의 pen_pos 두 줄(:160-161) 교체
        // CR-035(U-2 = B): 기본 세트 pen_up(90×154)을 사용자가 끌어다 놓은 자리(2026-09-24 settings.json).
        // 이전 기본값(CR-024): None — 첫 등록 때 ui 가 정함.
        pen_pos: Some(Point { x: 380.0, y: 496.0 }),
```

동작 표:

| 입력 | `mouse.pen_pos` |
|---|---|
| settings.json 없음(첫 실행) | `Some(380, 496)` — `Settings::default()` |
| `mouse` 키 없음 | `Some(380, 496)` — 컨테이너 default가 `default_mouse()` |
| `mouse`에 `penPos` 키 없음(CR-024 이전 파일) | `None` — 필드 `#[serde(default)]`는 `Option` 기본값이다(D-S35-1) |
| `"penPos": null` | `None`(N4·N6) |
| `"penPos": {"x":…, "y":…}` | 그 값 |
| 어깨축 탭 「기본값으로 리셋」 | ui가 TS `DEFAULT_MOUSE_SETTINGS.penPos`(380, 496)를 `set_settings`로 저장(bridge 몫) |

**테스트 (§8 증분).** `settings/mod.rs`가 783줄이라 penPos 테스트(현 `mod.rs:568-636`, N1~N5)를 새 자식 파일 `src-tauri/src/settings/pen_pos_tests.rs`로 **옮긴다**(`pen_mode_tests.rs`와 같은 머리 — `use super::*;`, `mod.rs` 끝에 `#[cfg(test)] mod pen_pos_tests;`). N2~N5는 글자 그대로 옮긴다. 적용 후 `mod.rs`는 약 720줄이다.

| # | 이름 | 준비·호출 | 기대 |
|---|---|---|---|
| N1′ (N1 대체) | `default_pen_pos_is_380_496` | `default_mouse()`, `serde_json::to_string(&Settings::default())` | `pen_pos == Some(Point { x: 380.0, y: 496.0 })`, 직렬화에 `"penPos":{"x":380.0,"y":496.0}` 포함·`"pen_pos"` 없음 |
| N6 | `existing_file_pen_pos_null_stays_null` (tempdir) | 파일 `{"mouse":{"shoulder":{"x":620.0,"y":530.0},"penPos":null}}` → `load` | `Ok(Some(s))`, `s.mouse.unwrap().pen_pos == None`(기본값 (380,496)으로 바뀌지 않음) |

- 회귀: 기존 테스트 전건 PASS. `pen_mode_tests.rs` P4는 `pen_pos`를 명시해 영향이 없다. `tests/mouse_area_defaults.rs`는 `shoulder`·`part_pos`·`area`만 쓰고, `examples/import_sample.rs`의 리터럴은 `pen_pos: None`을 명시해 영향이 없다. 구현자는 `pen_pos`·`penPos`를 Grep해 `None` 기본을 가정한 단언이 더 없는지 확인한다.
- `//!` [테스트]에 "penPos 기본·null 유지(pen_pos_tests.rs N1′~N6)".

**bridge 요구 (§9 증분, 계약 §3.3 — 호환성: 비파괴, 기본값만 바뀜)**

| # | 위치 | 요구 |
|---|---|---|
| 1 | TS `DEFAULT_MOUSE_SETTINGS.penPos` | `null` → `{ x: 380, y: 496 }`(Rust `default_mouse`와 1:1). 타입 `Point \| null` 그대로 |
| 2 | 계약 마우스 기본값 표·JSON 예시 | `penPos` 기본 `{x:380, y:496}`. 「키 없음·`null`은 `null`로 읽힘」 한 줄 |
| 3 | 런타임 호환 | 기존 파일의 `null`은 그대로다. 새 ui + 옛 Rust, 옛 ui + 새 Rust 모두 모양이 같아 오류가 없다 |
| 4 | 변경 이력 | "MouseSettings.penPos 기본값 null → {x:380, y:496}(CR-035 U-2 = B — 기본값만)" |

**요구 추적 (§10 증분)**

| 요구ID | 반영 | 상태 |
|---|---|---|
| DA-07 — `penPos` 기본값 (380, 496) | §3.1, §3.7, N1′ | ✅ 설계 · 소스 미적용 |
| DA-07 — 기존 파일 `"penPos": null` 유지 | §3.7 동작 표, N4·N6 | ✅ 설계 · 소스 미적용 |
| DA-07 — `area`·`partPos` 근거 주석 정정(값 불변) | §3.7 | ✅ 설계 · 소스 미적용 |
| DA-07 — 기본 `mouse_base` 손 기준점 실측 | [assets.md](assets.md) §3.10.5 M1 | 설계(assets 몫) |
| U-3 — `penMode` 기본 false 유지 | 변경 없음(§3.6) | ✅ |

**결정 (§11 증분)**

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| **D-S35-1** | 필드 속성 `#[serde(default)]` 유지 → **키 없음 = `None`** | `#[serde(default = "default_pen_pos")]`로 키 없음 = (380, 496) | 패킷 §5-2·02-design §4는 기본값과 `null` 유지만 정했다. 키가 없는 파일은 CR-024 이전 파일뿐이고, 그 사용자는 펜 손을 놓은 적이 없다(`null`과 같은 뜻). 속성을 바꾸면 N2 의미가 바뀌고, null과 키 없음이 다르게 읽히는 규칙이 생긴다. 확인 필요 1 |
| **D-S35-2** | N1~N5를 **`pen_pos_tests.rs`로 이동** | `mod.rs`에 N6만 추가 | `mod.rs` 783 + 주석 +3 + N6 약 15줄 → 800줄 초과(골든 원칙 §1). CR-033 `pen_mode_tests.rs`와 같은 배치 |
| **D-S35-3** | 근거 주석은 새 근거 + 옛 근거 이력 1줄 | 옛 근거 삭제 | 패킷 §5-1. 옛 실측값(435.06, 575.27)이 영역 설계의 근거로 남아야 한다 |

파급: `settings/mod.rs`(주석 3곳·기본값·테스트 이동·`mod pen_pos_tests;`), `settings/pen_pos_tests.rs`(신규) — core-implementer. 계약 §3.3, `src/bridge/types.ts` `DEFAULT_MOUSE_SETTINGS` — bridge. 리셋 TC 기대값 — ui.

확인 필요:

1. **키 없음의 해석(D-S35-1).** 02-design §4의 「serde default는 키가 없을 때만 적용」을 「키 없음 = (380, 496)」으로 읽을 수도 있다. 이 설계는 `None`으로 두었다. 바꾸려면 `fn default_pen_pos() -> Option<Point>`와 필드 속성 1줄, N2 기대값만 바꾸면 된다.

### 3.8 CR-045 — 뽀모도 타이머 표시 설정 `timer` (PT-04·07·08·09, 🔒 이름·타입·기본값, 구현자가 그대로 옮길 것)

결론: 설정에 `timer` 묶음 하나를 더한다 — 켜짐 여부와 시간 글자의 위치·회전·크기·색. 코드는 새 자식 파일 `settings/timer.rs`에 두고 `mod.rs`는 연결만 한다(`mod.rs` 736줄 → 약 750줄). 경과 시간과 실행 상태는 **저장하지 않는다**([timer.md](timer.md), 휘발).

비유: 장부에 "시계 글씨" 칸을 새로 만든다. 예전 장부에 그 칸이 없으면 견본 값을 적어 넣고, 칸 일부만 적혀 있으면 빈 곳만 견본으로 채운다. 칸에 터무니없는 숫자가 적혀 있으면 장부 전체를 버리지 않고 그 숫자만 허용 범위 끝으로 고쳐 읽는다. 새로 적어 넣을 때(설정 창 저장)는 고쳐 주지 않고 되돌려 보낸다.

#### 3.8.1 `settings/timer.rs` (신규)

```rust
//! 뽀모도 타이머 시간 글자 표시 설정(영속, CR-045 PT-04·07·08·09).
//!
//! [목적] 켜짐 여부·글자 위치(중심, 캔버스 좌표)·회전·크기·색. 경과·실행 상태는 여기 없다
//!        (`crate::timer`, 휘발 — 저장 안 함).
//! [공개 API] `TimerSettings`, `validate`, `normalize`, 범위 상수, `DEFAULT_COLOR`.
//! [규칙] 위치 0~900·0~700, 회전 −180~180, 크기 12~200, 모두 유한수. 색 `#` + 16진수 6자리.
//!        `validate`(set_settings)는 거부만, `normalize`(load)는 보정만 한다.
//! [호환] 컨테이너 `#[serde(default)]` — `timer`가 없거나 일부만 있으면 빠진 값은 기본값.
//! [unsafe] 없음.
//! [테스트] 기본값·옛 파일·부분 객체·읽기 보정·색·검증 경계(§3.8.4).
use serde::{Deserialize, Serialize};

use super::{Point, SettingsError};

/// 글자 위치 상한 = 캔버스 최대 크기(확정사항 §3). `assets::CANVAS_MAX_WIDTH/HEIGHT`(u32)와 같은
/// 값이지만 의존 방향(assets → settings)상 여기서 참조하지 않는다 — 일치는 통합 테스트 S-T11이 지킨다.
pub const TEXT_POS_MAX_X: f64 = 900.0;
pub const TEXT_POS_MAX_Y: f64 = 700.0;
pub const ROTATION_MIN: f64 = -180.0;
pub const ROTATION_MAX: f64 = 180.0;
pub const FONT_SIZE_MIN: f64 = 12.0;
pub const FONT_SIZE_MAX: f64 = 200.0;
pub const DEFAULT_COLOR: &str = "#333333";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)] // default 필수: 일부 필드만 있는 옛 파일이 Format 오류가 되지 않게
pub struct TimerSettings {
    /// 타이머 사용(PT-04). 끄면 bridge가 `Timer::disable`을 부른다(일시정지, U-2).
    pub enabled: bool,
    /// 글자 상자 중심, 캔버스 좌표(PT-07).
    pub text_pos: Point,
    /// 도, 시계 방향 +(PT-07).
    pub rotation: f64,
    /// 캔버스 px(PT-07).
    pub font_size: f64,
    /// "#rrggbb"(PT-08). 읽을 때 소문자로 맞춘다.
    pub color: String,
}

impl Default for TimerSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            // CR-045 U-6: 참고 그림(뽀도모셉찬.png, 900×700) 말풍선 흰 몸통 x≈148~388, y≈338~468의 중심.
            text_pos: Point { x: 142.0, y: 458.0 },
            // 말풍선 오른쪽이 약 5° 내려가 있다(시계 방향 +).
            rotation: 9.0,
            // 안쪽 폭 약 225px에 "00:00:00"(굵은 표 숫자 약 4.8em)이 들어가는 크기.
            font_size: 36.0,
            // 흰 말풍선 위 진회색.
            color: DEFAULT_COLOR.to_string(),
        }
    }
}

/// set_settings 검증 — 범위 밖·비유한수·색 형식 오류면 `SettingsError::Invalid`. 값을 고치지 않는다.
pub fn validate(t: &TimerSettings) -> Result<(), SettingsError> {
    let bad = |msg: &str| Err(SettingsError::Invalid(msg.to_string()));
    if !in_range(t.text_pos.x, 0.0, TEXT_POS_MAX_X) || !in_range(t.text_pos.y, 0.0, TEXT_POS_MAX_Y) {
        return bad("타이머 글자 위치는 캔버스 안(x 0~900, y 0~700)의 유한한 수여야 합니다.");
    }
    if !in_range(t.rotation, ROTATION_MIN, ROTATION_MAX) {
        return bad("타이머 글자 회전은 -180 ~ 180도 사이의 유한한 수여야 합니다.");
    }
    if !in_range(t.font_size, FONT_SIZE_MIN, FONT_SIZE_MAX) {
        return bad("타이머 글자 크기는 12 ~ 200px 사이의 유한한 수여야 합니다.");
    }
    if !is_hex_color(&t.color) {
        return bad("타이머 글자 색은 #rrggbb 형식(16진수 6자리)이어야 합니다.");
    }
    Ok(())
}

/// load 보정 — 범위로 자르고, 비유한 좌표·값은 그 값의 기본값, 색 형식 오류는 DEFAULT_COLOR,
/// 색은 소문자로. 바뀐 것이 있으면 경고 로그 1줄. 설정 전체를 기본값으로 되돌리지 않기 위해서다.
pub fn normalize(t: TimerSettings) -> TimerSettings {
    let d = TimerSettings::default();
    let fixed = TimerSettings {
        enabled: t.enabled,
        text_pos: Point {
            x: clamp_or(t.text_pos.x, 0.0, TEXT_POS_MAX_X, d.text_pos.x),
            y: clamp_or(t.text_pos.y, 0.0, TEXT_POS_MAX_Y, d.text_pos.y),
        },
        rotation: clamp_or(t.rotation, ROTATION_MIN, ROTATION_MAX, d.rotation),
        font_size: clamp_or(t.font_size, FONT_SIZE_MIN, FONT_SIZE_MAX, d.font_size),
        color: if is_hex_color(&t.color) { t.color.to_ascii_lowercase() } else { d.color },
    };
    if fixed != t {
        log::warn!("타이머 글자 설정을 보정해 읽습니다: {t:?} → {fixed:?}");
    }
    fixed
}

fn in_range(v: f64, min: f64, max: f64) -> bool {
    v.is_finite() && (min..=max).contains(&v)
}

fn clamp_or(v: f64, min: f64, max: f64, fallback: f64) -> f64 {
    if v.is_finite() { v.clamp(min, max) } else { fallback }
}

/// 정규식 크레이트 없이 `^#[0-9a-fA-F]{6}$`.
fn is_hex_color(s: &str) -> bool {
    s.strip_prefix('#')
        .is_some_and(|h| h.len() == 6 && h.bytes().all(|b| b.is_ascii_hexdigit()))
}
```

- `f64::clamp`는 NaN을 그대로 돌려주므로 `clamp_or`가 유한성을 먼저 본다(순서 중요). `min > max`면 패닉하지만 상수라 해당 없음.
- 위 코드 글자는 `cargo fmt`가 줄바꿈을 바꿀 수 있다 — 동작만 같으면 된다.

#### 3.8.2 `settings/mod.rs` 변경 (20줄 이내 — 800줄 한계, 현재 736줄)

| 위치 | 변경 |
|---|---|
| `use` 아래 | `pub mod timer;` · `pub use timer::TimerSettings;` |
| `Settings`(`:136-155`) 끝 필드 | `/// 뽀모도 타이머 시간 글자 표시 설정(CR-045). ui 소유 — set_settings가 그대로 바꾼다. 경과·실행 상태는 crate::timer(휘발).` + `pub timer: TimerSettings,` |
| `impl Default for Settings`(`:183-200`) | `timer: TimerSettings::default(),` |
| `Settings::validate`(`:222-238`) `Ok(())` 앞 | `timer::validate(&self.timer)?;` |
| `load`(`:256-277`) idle 보정 블록 뒤, **`settings.validate()?` 앞** | `// 타이머 글자 설정도 거부 대신 보정한다(CR-045, D24와 같은 이유).` + `settings.timer = timer::normalize(settings.timer);` |
| `//!` | [공개 API]에 `TimerSettings`(timer.rs), [규칙]에 「timer 위치·회전·크기·색(읽기는 보정)」, [호환] 누락 키 목록에 `timer`, [테스트]에 「타이머 설정(timer.rs)」 |

- 순서 주의: `load`는 보정 뒤 `validate()`를 부른다 — `normalize`가 `validate`보다 먼저여야 범위 밖 값이 파일 전체 거부(→ 전체 기본값)로 번지지 않는다.
- `Settings { … }` 리터럴은 모두 `..Default::default()`/`..incoming` 채움을 쓴다(Grep 2026-09-26: `settings/mod.rs` 7곳·`pen_pos_tests.rs`·`window/placement.rs`·`examples/import_sample.rs`) → 필드 추가로 깨지는 호출자 없음.

#### 3.8.3 규칙·호환

| 입력 | 동작 |
|---|---|
| `timer` 키 없음(옛 파일) | `TimerSettings::default()`(`Settings` 컨테이너 default). 다른 필드 보존 |
| `timer` 일부 키만(`{"enabled":true}`) | 빠진 필드만 기본값(`TimerSettings` 컨테이너 default) |
| 범위 밖 수(파일) | `normalize`가 자르고 경고 로그. 다른 필드는 기본값으로 돌아가지 않음 |
| 비유한수 | JSON에는 NaN·무한대가 없고 serde_json이 넘치는 수를 거부하므로 실제로는 오지 않는다. 방어로 `normalize`는 그 좌표·값만 기본값, `validate`는 `Invalid` |
| 색 형식 오류(파일) | `DEFAULT_COLOR`. 대문자(`"#AABBCC"`)는 형식 통과 → 소문자로 읽음 |
| 타입 오류(`"rotation":"5"`, `"timer":null`) | `Format` 오류 → `load_or_default`가 설정 전체 기본값(관용 읽기 아님 — `penMode` D27과 같음, §3.8.6 S-D3) |
| 모르는 하위 키 | 무시(serde 기본) |
| `set_settings` 범위 밖·형식 오류 | `Invalid`(`settings.invalid`), 저장·상태 불변. **보정하지 않는다** |
| `set_settings` 대문자 색 | 형식 통과, 보낸 그대로 저장 → 다음 읽기에서 소문자. ui는 `<input type="color">` 값(항상 소문자)을 보낸다 |
| 옛 앱이 새 파일을 읽음 | `timer` 키를 모르는 키로 무시 → 옛 앱이 저장하면 `timer`가 빠짐 → 새 앱에서 기본값(타이머 설정만 잃음, 되돌리기 안전) |
| `version`·마이그레이션 | 없음(D19 유지) |
| `keep_core_owned`(`window/placement.rs:259-264`) | **불변** — `timer`는 ui 소유라 `set_settings` 입력값이 그대로 들어간다 |

#### 3.8.4 테스트 (§8 증분)

`settings/timer.rs` `#[cfg(test)] mod tests`(단위·tempdir). JSON 읽기 테스트는 tempdir에 `settings.json`을 쓰고 `crate::settings::load`를 부른다. 검증 테스트는 `Settings { timer: …, ..Default::default() }.validate()`로 불러 `mod.rs` 연결까지 확인한다.

| # | 테스트 이름(권고) | 조건 | 기대 |
|---|---|---|---|
| S-T1 | `timer_settings_default_values` | `TimerSettings::default()`, `Settings::default().timer` | `false`·(142, 458)·9·36·`"#333333"`(CR-053), 둘 같음, `Settings::default().validate()` Ok |
| S-T2 | `old_settings_without_timer_load_with_defaults` | `timer` 키 없는 JSON(`scale` 1.5·`idleSeconds` 120 등 포함) | 다른 필드 보존 + `timer == TimerSettings::default()` |
| S-T3 | `partial_timer_object_fills_defaults` | `{"timer":{"enabled":true}}` | `enabled` true, 나머지 기본값 |
| S-T4 | `out_of_range_timer_clamped_on_load` | rotation 999, fontSize 1, textPos (−5, 9999), `scale` 1.5 | 180·12·(0, 700), `scale` 1.5 유지(전체 기본값으로 돌아가지 않음), `Ok(Some)` |
| S-T5 | `invalid_color_falls_back_on_load` | color `"red"`·`"#12345"`·`"#GGGGGG"`·`""` 각각 | `"#333333"` |
| S-T6 | `color_lowercased_on_load` | color `"#AbCdEf"` | `"#abcdef"` |
| S-T7 | `validate_rejects_out_of_range_timer` | 경계 밖(x −0.01·900.01, y 700.01, rotation ±180.01, fontSize 11.99·200.01) / 경계값(x 0·900, y 0·700, rotation ±180, fontSize 12·200) | 밖은 `Invalid` / 경계값은 Ok |
| S-T8 | `validate_rejects_bad_color` | `"#12345"`·`"123456"`·`"#12345g"`·`"#1234567"` / `"#ABCDEF"`·`"#abcdef"` | `Invalid` / Ok |
| S-T9 | `validate_rejects_non_finite` | 위치·회전·크기에 NaN·∞ 각각 | `Invalid` |
| S-T10 | `normalize_non_finite_uses_field_default` | `normalize`에 x NaN, rotation ∞, fontSize −∞ | x 142(y는 원값 유지), rotation 9, fontSize 36(CR-053 기본값) |
| S-T11 | `timer_text_pos_max_matches_canvas_max` (`src-tauri/tests/default_assets.rs` 통합 — assets·settings 조합) | 상수 비교 | `TEXT_POS_MAX_X == assets::CANVAS_MAX_WIDTH as f64`, `…_Y == CANVAS_MAX_HEIGHT as f64` |
| S-T12 | `timer_serializes_camel_case` | `serde_json::to_string(&Settings::default())` | `"timer":{"enabled":false,"textPos":{"x":142.0,"y":458.0},"rotation":9.0,"fontSize":36.0,"color":"#333333"}` 키 포함 |

- `timer.rs` 줄 수: 코드 ~100 + 테스트 ~170 ≈ 270. `mod.rs` 약 750줄(800 미만 유지).
- 완료 기준: `cargo fmt --check`·`cargo clippy -- -D warnings` 0·`cargo test` 전건 PASS.

#### 3.8.5 bridge 요구 명세 (§9 증분 — 계약 확정은 bridge-designer)

- 호환성: **추가**(TS 타입 필드 추가, 저장 데이터 비파괴, IPC 런타임 비파괴).
- TS `Settings`에 `timer: TimerSettings`, `TimerSettings = { enabled: boolean; textPos: Point; rotation: number; fontSize: number; color: string }`. TS 기본값 상수(`DEFAULT_TIMER_SETTINGS` 등)는 §3.8.1 `Default`와 1:1, 범위 상수도 같은 값.
- `set_settings`는 시그니처 불변. **부수 효과 추가**: 저장 성공 후 이전 `timer.enabled == true` && 새 값 `false`이면 `Timer::disable` → 바뀌었으면 `settings://changed`(와 손 기준점 이벤트) **뒤에** `timer://changed`(상세 [timer.md](timer.md) §9). `settings`와 `timer` 잠금을 동시에 쥐지 않는다.
- 에러: 새 코드 없음 — 범위·형식 위반은 기존 `settings.invalid`.
- ui(요구만): 모든 호출자가 `{...settings, timer: {...settings.timer, …}}`로 보낸다(전체 교체 규칙). 색은 소문자로 보낸다. 끌기는 실제 캔버스 안으로 제한(02-design §5).

#### 3.8.6 결정·파급·확인 필요 (§11 증분)

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| S-D1 | 새 자식 파일 `settings/timer.rs` | `mod.rs`에 직접 | `mod.rs` 736줄 — 800 한계. 패킷 §3 「20줄 이내」 |
| S-D2 | `validate`는 거부만, `load`의 `normalize`만 보정 | `validate`가 고쳐서 통과 | 설정 창 입력 오류를 몰래 바꾸면 사용자가 모른다. 파일 한 값 때문에 설정 전체가 기본값이 되는 것은 막는다(D24 선례) |
| S-D3 | 타입 오류(`"timer":null`, 문자열 수)는 관용 읽기 안 함(`Format`) | 필드마다 관용 `Deserialize` | 손으로 고치지 않는 한 생기지 않는다. `penMode` D27과 같은 기준, 코드 최소 |
| S-D4 | 비유한수 보정은 **좌표 단위**(x만 NaN이면 x만 기본값) | `textPos` 전체를 기본값 | 살릴 수 있는 값은 살린다. 결과가 범위 안이면 동작 차이 없음 |
| S-D5 | 위치 상한 900·700을 settings 자체 상수로 | `assets::CANVAS_MAX_*` 참조 | 의존 방향 `assets → settings`(스킬 §1). 일치는 S-T11이 지킨다 |
| S-D6 | 대문자 색은 `set_settings`에서 통과, 소문자화는 `load`에서만 | `validate`에서 대문자 거부 | 정규식 `^#[0-9a-fA-F]{6}$`(02-design §5) 그대로. ui 입력은 원래 소문자 |
| S-D7 | `version` 없음, 마이그레이션 없음 | 버전 승격 | serde default로 옛 파일 호환 충분(D19 유지) |

파급(Grep 2026-09-26):

| 파일 | 변경 | 담당 | 깨짐 여부 |
|---|---|---|---|
| `src-tauri/src/settings/timer.rs` | 신규 | core-implementer | — |
| `src-tauri/src/settings/mod.rs` | §3.8.2 | core-implementer | — |
| `src-tauri/tests/default_assets.rs` | S-T11 1개 | core-implementer | — |
| `Settings { … }` 리터럴(모두 `..` 채움) | 없음 | — | 안 깨짐 |
| `src-tauri/src/bridge/types.rs` `//!` 대응표, `src/bridge/types.ts`, `contract.md` | §3.8.5 | bridge-designer·bridge-implementer | TS 누락 시 ui가 `timer`를 못 씀(런타임은 serde default로 무해) |

확인 필요:

- **S-C1** 화면 요구ID(settings R-42~)가 확정되면 §1·§3.8.7에 병기.
- **S-C2** 캔버스가 900×700보다 작으면 범위 안 값이어도 글자가 캔버스 밖에 놓일 수 있다 — core는 최대 캔버스 기준으로만 검사하고(실제 캔버스 크기는 assets 소관이라 모름) 오버레이는 그대로 그린다(02-design §5). 이의 있으면 사용자 판단.

#### 3.8.7 요구 추적 (§10 증분)

| 요구 | 반영 절 | 상태 |
|---|---|---|
| PT-04 타이머 on/off 저장 | §3.1 `timer.enabled`, §3.8.1 | ✅ 설계 (끔 부수 효과는 [timer.md](timer.md)·bridge) |
| PT-07 글자 위치·회전·크기 저장·검증 | §3.8.1 `validate`·`normalize`, §3.8.3 | ✅ 설계 |
| PT-08 글자 색 저장·형식 검증·소문자 | §3.8.1 `is_hex_color`, §3.8.3 | ✅ 설계 |
| PT-09 위치·회전·크기·색·on/off는 재시작 후 유지, 경과는 저장 안 함 | §3.8(스키마에 경과 필드 없음), §3.8.3 옛 파일 호환 | ✅ 설계 |

### 3.9 CR-047 — 저장 단일 창구 `update`·공용 원자적 쓰기 `write_atomic` (CORE-001·002, 🔒 확정사항 §6 「점검 후 정리」 2026-09-26, 구현자가 그대로 옮길 것)

결론: 설정을 바꾸는 모든 경로는 `settings::update` 하나로 저장한다. `update`는 **설정 잠금을 쥔 채** 「사본 변경 → 검증 → 파일 원자 교체 → 메모리 대입」을 한 번에 해서, 어느 스레드가 끼어들어도 메모리와 파일이 같은 값으로 남는다. 파일 쓰기는 공용 `write_atomic`(고유 임시 파일 → `sync_all` → `fs::rename` 한 번으로 교체, `remove_file` 없음)이 맡고, assets 매니페스트도 같은 함수를 쓴다.

비유: 지금은 장부(메모리)와 금고 사본(파일)을 여러 직원이 각자 순서로 고친다 — A가 금고에 넣고, B가 금고에 넣고 장부를 고친 뒤, A가 뒤늦게 장부를 고치면 장부와 금고가 어긋난다. 바꾸면 창구가 하나다: 창구 직원이 문을 잠근 채 새 장부를 쓰고, 금고 사본을 통째로 바꿔 끼운 다음 장부를 교체하고 문을 연다. 금고 사본은 「옛 봉투를 버린 뒤 새 봉투를 넣기」가 아니라 「새 봉투로 한 번에 바꿔 끼우기」라 금고가 비는 순간이 없다.

#### 3.9.1 근거 (verify-20260926-1821)

| 결함 | 현재 코드 | 결과 |
|---|---|---|
| CORE-001 저장 경로 7곳·스레드 4종 | `window/placement.rs:221`·`tray/autostart.rs:268`(잠금 밖 저장), `tray/mod.rs:93`(메모리 → 창 → 저장, 실패 무시), `bridge/commands.rs:167 set_settings`(파일 먼저, 메모리는 나중에 재병합), `commands.rs:360·377`(잠금 쥔 채 저장·emit) | 두 스레드가 겹치면 파일 = 나중에 저장한 쪽, 메모리 = 나중에 대입한 쪽 — 서로 다른 값으로 남을 수 있다 |
| CORE-001 고정 임시 파일명 | `path.with_extension("json.tmp")` | 두 스레드가 같은 임시 파일에 동시에 쓰면 섞인 내용이 교체될 수 있다 |
| CORE-002 비원자 교체 | `remove_file(path)` → `rename(tmp, path)`(settings `mod.rs:299-302`, assets `mod.rs:272-275`) | 둘 사이에 앱이 죽으면 settings.json이 없다 → 다음 실행이 기본값(사용자 설정 전부 유실) |

설정 잠금을 잡는 스레드: 메인(sync command·트레이 메뉴), `overlay-move-saver`(드래그 저장), `autostart-sync`(시작 보정), tokio 블로킹 풀(`set_autostart` → `persist_autostart`). 훅 스레드는 설정을 모른다(hook → settings 의존 없음, 불변).

#### 3.9.2 공개 API (신규 굵게, 🔒 이름·시그니처)

| 이름 | 인자 | 반환 | 실패 조건 | 요구 |
|---|---|---|---|---|
| **`pub struct SaveOutcome { pub settings: Settings, pub changed: bool }`**(`#[derive(Debug, Clone, PartialEq)]`) | — | `settings` = 호출 뒤 메모리 값(= 파일 값), `changed` = 파일을 썼는가 | — | CORE-001 |
| **`pub fn update<F>(state: &Mutex<Settings>, path: &Path, f: F) -> Result<SaveOutcome, SettingsError> where F: FnOnce(&mut Settings)`** | 설정 상태, settings.json 경로, 사본을 고치는 클로저 | `SaveOutcome` | `StatePoisoned`(잠금 오염), `Invalid`(검증), `Format`(직렬화), `Io`(쓰기) — 실패하면 **메모리·파일 모두 이전 값** | CORE-001 |
| **`pub fn write_atomic(path: &Path, bytes: &[u8]) -> std::io::Result<()>`** | 대상 경로, 전체 내용 | () | 폴더 생성·임시 파일 생성·쓰기·`sync_all`·rename 실패 — 실패하면 대상 파일은 이전 내용 그대로, 임시 파일은 지운다(최선) | CORE-002 |
| `fn save(path: &Path, settings: &Settings) -> Result<(), SettingsError>` | (불변) | (불변) | (불변) | **`pub` → 비공개(3단계, §3.9.6)**. 본문 = `validate` → `to_string_pretty` → `write_atomic` |
| `SettingsError` | | | | **변형 `StatePoisoned` 추가**(§3.9.5) |

- `load`·`load_or_default`·`Settings::validate` 불변.
- `f`는 **사본**을 고친다. 잠금 안에서 불리므로 `f` 안에서 설정 잠금(std `Mutex`는 재진입 불가 → 교착)·IO·emit·창 호출 금지. 클로저는 필드 대입·순수 병합(`window::keep_core_owned` 등)·이전 값 복사만 한다.

#### 3.9.3 `update` 절차 (🔒 순서)

```rust
pub fn update<F>(state: &Mutex<Settings>, path: &Path, f: F) -> Result<SaveOutcome, SettingsError>
where
    F: FnOnce(&mut Settings),
{
    let mut guard = state.lock().map_err(|_| SettingsError::StatePoisoned)?;
    let mut next = guard.clone();
    f(&mut next);
    if next == *guard {
        return Ok(SaveOutcome { settings: next, changed: false }); // 파일 안 씀
    }
    save(path, &next)?; // validate → 직렬화 → write_atomic. 실패면 guard 그대로
    *guard = next.clone();
    Ok(SaveOutcome { settings: next, changed: true })
}
```

- 파일 쓰기가 성공한 뒤에만 메모리에 대입한다 → 잠금이 풀리는 순간마다 「파일 = 메모리」. 쓰기 실패 = 둘 다 이전 값.
- `changed == false`면 파일을 쓰지 않는다(기존 `persist_*`의 「같으면 저장 안 함」과 같다). 호출자는 `changed`로 emit 여부를 정한다.
- 스킬 §4 「잠근 채 IO 금지」의 예외 — 근거 §3.9.7.

#### 3.9.4 `write_atomic` 절차 (🔒)

1. `dir = path.parent()`(비었으면 `"."`) → `fs::create_dir_all(dir)`.
2. 임시 파일 = **같은 폴더**의 `{파일이름}.{pid}-{seq}.tmp`(`pid` = `std::process::id()`, `seq` = `static TMP_SEQ: AtomicU32`의 `fetch_add(1, Ordering::Relaxed)`). `OpenOptions::new().write(true).create_new(true)`로 연다 — `AlreadyExists`면 다음 `seq`로 최대 16회 재시도, 그래도 실패면 그 오류. 같은 폴더 = 같은 볼륨이라 rename이 복사가 아닌 이름 교체다.
3. `write_all(bytes)` → `sync_all()` → 파일 핸들을 닫는다(`drop`) — 열린 핸들이 rename을 막지 않게.
4. `fs::rename(tmp, path)` — **대상을 먼저 지우지 않는다.**
5. 2~4 중 실패하면 `let _ = fs::remove_file(tmp)` 후 원래 오류를 돌려준다.

비공개 순수 도우미 `fn temp_name(file_name: &OsStr, pid: u32, seq: u32) -> OsString`(테스트 AW3).

**Windows에서 rename이 기존 대상을 교체하는 근거:**
- Rust 표준 문서 `std::fs::rename`: 「`to`가 이미 있으면 교체한다」. Windows 구현은 `MoveFileExW(.., MOVEFILE_REPLACE_EXISTING)`(최신 std는 `SetFileInformationByHandle`의 `FileRenameInfoEx` + `FILE_RENAME_FLAG_REPLACE_IF_EXISTS`, 미지원 파일 시스템이면 `MoveFileExW`로 대체) — 어느 쪽이든 같은 볼륨 안에서 이름 교체 한 번이라 「대상 파일이 없는 순간」이 없다.
- 저장소 안 실증: `assets/export.rs:80`이 이미 `fs::write(tmp)` → `fs::rename(tmp, 대상)`으로 기존 파일을 덮어쓰고, 그 경로의 통합 테스트 `tests/default_assets.rs` D14 `export_conflict_overwrite`가 이 PC(Windows)에서 PASS했다(verify-20260926-1821 `cargo test` 303 PASS).
- 이 PC에 rust-src 구성 요소가 없어 std 소스 줄은 인용하지 못했다 — 새 테스트 AW2(기존 파일 교체)가 실행 증거가 된다.
- 한계: 대상 파일을 다른 프로세스(백신·편집기)가 삭제 공유 없이 열고 있으면 rename이 `PermissionDenied`로 실패한다. 기존 `remove_file`도 같은 조건에서 실패했다(퇴행 아님). 이때 대상은 이전 내용, 임시 파일은 지워진다.

#### 3.9.5 에러 추가

| 변형 | 한국어 메시지 | `code()` | 원인 |
|---|---|---|---|
| **`StatePoisoned`** | `설정 상태가 손상되었습니다. 앱을 다시 시작하세요.` | `"state.poisoned"` — **기존 code 재사용**(window·tray·bridge가 같은 문자열을 이미 씀 → 계약 새 code 없음) | `update`가 오염된 `Mutex`를 만남 |

`write_atomic` 실패(`std::io::Error`)는 기존 `#[from]`으로 `SettingsError::Io`(`settings.io`)·`AssetError::Io`(`asset.io`)가 감싼다.

#### 3.9.6 저장 경로 이전 계획 (7곳 + 매니페스트)

| # | 위치(현재 줄) | 지금 | 바뀐 뒤 | 담당 | 공개 시그니처 |
|---|---|---|---|---|---|
| S1 | `settings/mod.rs:292 save` | 고정 `json.tmp`, `remove_file` → `rename` | 비공개. `validate` → `to_string_pretty` → `write_atomic` | core | `pub` → 비공개(3단계) |
| S2 | `window/placement.rs:221 persist_overlay_position` | 잠금 안 비교·대입·clone → 잠금 밖 `save` | `update`(클로저: `overlay.x/y` 대입) → `changed`면 `Some(settings)`, 아니면 `None` | core | 불변 |
| S2′ | `window/placement.rs:268 reset_overlay_position` | `persist_overlay_position` + 같으면 잠금을 다시 잡아 clone | `update` 결과 `settings`를 그대로 반환(두 번째 잠금 삭제) | core | 불변 |
| S3 | `tray/autostart.rs:268 persist_autostart` | S2와 같은 모양 | `update`(클로저: `autostart` 대입) → `changed`면 `Some` | core | 불변 |
| S4 | `tray/mod.rs:93 toggle_overlay` | 메모리 대입 → 창 적용 → `save`(실패 무시) → emit | `update`(클로저: `overlay.visible` 대입)`?` → `apply_overlay_window(&out.settings)` → `changed`면 emit. 저장 실패 = 창을 바꾸지 않고 `Err`(메뉴 핸들러가 경고 로그) | core | 비공개 함수 |
| S5 | `bridge/commands.rs:167 set_settings` | 검증 → 잠금 안 병합 → **잠금 밖 저장** → 창 → 재병합·메모리 대입 | `update` 클로저 안에서 이전 값 복사 + `keep_core_owned` 병합(§3.9.10 B2) | **bridge** | 불변 |
| S6 | `bridge/commands.rs:360 set_overlay_position` | 잠금 쥔 채 `save`·emit | `update` → 잠금 밖 emit | **bridge** | 불변 |
| S7 | `bridge/commands.rs:377 set_overlay_visible` | 잠금 쥔 채 `save`·emit | `update` → 잠금 밖 emit | **bridge** | 불변 |
| — | `lib.rs` setup 화면 밖 보정·`autostart-sync` | S2·S3 경유 | 변경 없음(내부가 `update`) | core | — |
| A1 | `assets/mod.rs:267 save_manifest` | 고정 `manifest.json.tmp`, `remove_file` → `rename` | `crate::settings::write_atomic`([assets.md](assets.md) §3.14.4) | core | 불변 |

**반영 순서(컴파일 깨짐 방지):** ① core — `write_atomic`·`update`·`SaveOutcome`·`StatePoisoned` 추가, S1 본문 교체(아직 `pub`), S2~S4·A1 이전 → ② bridge — S5~S7 이전 → ③ core — `save`를 비공개로 낮춤(`Grep "settings::save"`로 외부 호출 0 확인). task-manager가 한 흐름으로 돌리면 ①~③을 한 번에 해도 된다. window 공개 시그니처는 불변이라 [window.md](window.md)는 §2 설명 한 줄(「저장은 `settings::update`」)만 다음 동기화 때 맞춘다.

#### 3.9.7 잠금 안 파일 쓰기 (스킬 §4 예외, D47-1)

- 위임 요구 「잠금 안에서 변경·저장 순서를 일관되게」와 스킬 §4 「잠근 채 IO 금지」가 부딪힌다. **`update` 한 곳에서만** 예외를 둔다.
- 허용 근거: ① 훅 스레드는 설정 잠금을 잡지 않는다 — 입력 경로 지연 0. ② 잠금 안 작업은 JSON 직렬화(수 KB) + 작은 파일 쓰기 + `sync_all` 한 번 — 보통 수 ms. ③ 잠금 안에서 emit·창 호출·Tauri API·다른 잠금 없음 — `update`는 설정 잠금 하나만 잡아 교착이 없다. ④ 저장 빈도는 드래그 500ms 디바운스·사용자 조작 단위.
- 대가: 저장 중 메인 스레드의 `get_settings` 등이 그 수 ms만큼 기다릴 수 있다.
- 대안(채택 안 함): 메모리 먼저 대입 + 버전 번호로 늦은 쓰기 버림 — 쓰기가 실패하면 메모리가 파일보다 앞선 불일치가 남는다(CORE-001 재발).

#### 3.9.8 파일 구성

| 파일 | 내용 | 줄 수(예상) |
|---|---|---|
| `settings/mod.rs`(748줄) | `mod atomic; mod store; pub use atomic::write_atomic; pub use store::{update, SaveOutcome};`, `StatePoisoned` 변형·`code()` 1줄, `save` 본문 교체(`remove_file` 삭제) | +10 이내 |
| **`settings/atomic.rs`**(신규) | `write_atomic`·`temp_name`·`TMP_SEQ`·테스트 AW1~AW6 | ~130 |
| **`settings/store.rs`**(신규) | `SaveOutcome`·`update`(부모의 비공개 `save` 호출 — 자식 모듈은 부모 비공개 항목 접근 가능)·테스트 SU1~SU7 | ~170 |

`//!` 문서주석: [공개 API]에 `update`·`SaveOutcome`·`write_atomic` 추가, `save` 삭제. [저장]을 「`update`가 잠금 안에서 검증·원자적 교체·메모리 대입(유일한 창구). 교체 = 고유 임시 파일 → `sync_all` → rename」으로.

#### 3.9.9 테스트 (= §8 증분)

| ID | 대상 | 조건 | 기대 |
|---|---|---|---|
| AW1 | `write_atomic` | tempdir 새 경로 | 내용 일치, 폴더에 `*.tmp` 없음 |
| AW2 | `write_atomic` | 대상이 이미 있음(옛 내용) | 새 내용으로 교체, `*.tmp` 없음 — **Windows rename 교체 실행 증거** |
| AW3 | `temp_name` | 같은 이름·pid, seq 0·1 | 서로 다름, 원래 파일 이름으로 시작, `.tmp`로 끝남 |
| AW4 | `write_atomic` | 대상 경로가 폴더 | `Err`, 폴더 그대로, `*.tmp` 없음(실패 정리) |
| AW5 | `write_atomic` | 부모 폴더 없음(2단 중첩) | 폴더 생성 후 성공 |
| AW6 | `write_atomic` | 8스레드 × 20회, 같은 대상에 서로 다른 내용 | 끝난 뒤 대상 내용이 쓴 값 중 하나와 정확히 같다(섞임 없음), `*.tmp` 없음. 개별 호출 성공은 단언하지 않는다(동시 교체 중 `PermissionDenied` 허용) |
| SU1 | `update` | 기본값 → `scale = 1.5` | `changed == true`, 메모리·`load(path)` 모두 1.5 |
| SU2 | `update` | 클로저가 같은 값 대입 | `changed == false`, 파일 생성 안 됨 |
| SU3 | `update` | `scale = 5.0`(범위 밖), 기존 파일 있음 | `Err(Invalid)`, 메모리·파일 내용 불변 |
| SU4 | `update` | `path`가 폴더 | `Err(Io)`, 메모리 불변 |
| SU5 | `update` | 오염된 `Mutex` | `Err(StatePoisoned)`, `code() == "state.poisoned"` |
| SU6 | `update` | 2스레드 × 50회(A: `overlay.x = i`, B: `idle_seconds`를 60~3600에서 순환) | 끝난 뒤 `load(path) == *mutex.lock()` — **CORE-001 회귀 테스트** |
| SU7 | `save`(비공개) | 기존 왕복 테스트 | 불변 PASS(`remove_file` 삭제 뒤에도) |

기존 `save` 호출 테스트(`mod.rs`·`timer.rs`·`pen_mode_tests.rs`·`pen_pos_tests.rs`)는 settings 자식 모듈이라 비공개 `save`를 그대로 부른다. 다른 모듈 테스트(`placement.rs` I1~I4·`autostart.rs` P1~P3)는 공개 `persist_*` 경유라 수정 없음 — `autostart.rs` P3의 기대만 `AutostartError::Settings(SettingsError::StatePoisoned)`로 바뀐다([tray.md](tray.md) §3.5.6).

#### 3.9.10 bridge 요구 (= §9 증분, 계약 확정은 bridge-designer)

- **B2 `set_settings`**: 저장을 `settings::update`로. 권장 절차 — ① `settings.validate()`(입력 오류는 잠금 전에) ② `update` 클로저 안에서 이전 값(`scale`·어깨/`partPos` 키·`timer.enabled`)을 바깥 변수로 복사하고 `*cur = window::keep_core_owned(incoming, cur)` ③ `apply_overlay_window(&out.settings)` ④ (scale 변경 시) 리사이즈 ⑤ `settings://changed`(`out.settings`) ⑥ 손 기준점 ⑦ 타이머 부수 효과. **기존 5단계(재병합·메모리 대입) 삭제** — 병합·저장·대입이 이미 한 잠금 안이다. 창 적용 실패 시 설정은 이미 저장·반영됐다 — emit을 ③보다 먼저 둘지는 bridge 결정(권고: 먼저, ui가 저장된 값을 알게).
- **B3 `set_overlay_position`·`set_overlay_visible`**: 「잠금 → `save` → 잠금 쥔 채 emit」 → `update` → 잠금 밖 emit(`changed`와 무관하게 기존처럼 emit할지는 bridge 결정).
- **B4** `settings::save` 비공개화(③단계) — 계약 §5.3 3행·§5.5 3행·추적표의 `settings::save` 언급을 `settings::update`로.
- 새 command·event·code 없음. `state.poisoned`는 기존 code.

#### 3.9.11 결정·확인 필요 (= §10·§11 증분)

- **D47-1** 잠금 안 저장(§3.9.7). **D47-2** 창구를 settings에 둔다 — `window → settings`·`assets → settings`·`tray → settings` 의존 방향을 지키는 위치, 새 모듈 없음. **D47-3** `sync_all` 포함 — 없으면 정전 때 rename만 반영되고 내용이 비어 settings.json 전체가 기본값으로 대체될 수 있다(잠금 시간 수 ms 증가 수용). **D47-4** 반환은 위임문의 `Result<Settings, _>` 대신 `SaveOutcome { settings, changed }` — 드래그 저장·자동 실행 보정이 「바뀐 경우만 emit」을 유지하려면 변경 여부가 필요하다.
- 후보(만들지 않음): C47-1 비정상 종료로 남은 `*.tmp` 청소 · C47-2 rename `PermissionDenied` 재시도(50ms × 3).
- 추적: CORE-001 → §3.9.2·§3.9.3·§3.9.6 ✅(설계) · CORE-002 → §3.9.4 ✅(설계). 소스 미적용. bridge 3곳(S5~S7)은 bridge-manager 인계.

### 3.10 CR-048 — 타이머 모드 설정 `timer.mode`·`countdownSecs`·`alarmVolume` (TM-01·02·04·10·13, 🔒 패킷 §2.1, 사용자 결정 D-1·D-2·D-3·D-10, 구현자가 그대로 옮길 것)

결론: `TimerSettings`에 3필드를 더한다. `enabled`는 그대로 두고 의미만 「스톱워치 또는 타이머 켜짐」으로 넓힌다(D-1 A) — 둘 다 켜진 잘못된 상태를 만들 수 없고, 옛 파일은 이행 코드 없이 읽힌다. 새 3필드는 값의 타입이 틀려도 설정 전체를 무너뜨리지 않는다(관대한 역직렬화 — §3.8.6 S-D3 「타입 오류는 `Format`」을 **새 3필드에 한해** 뒤집는다).

비유: 타이머 서랍에 칸 셋(모드 스위치·시작 시간 다이얼·음량 손잡이)을 새로 붙인다. 옛 서랍(옛 파일)에는 칸이 없으니 공장 기본값으로 채우고, 칸에 엉뚱한 물건(문자열 등)이 들어 있으면 그 칸만 기본값으로 바꾼다 — 서랍 전체를 비우지 않는다.

#### 3.10.1 타입·상수 (`settings/timer.rs`)

```rust
/// 타이머 모드(CR-048 TM-01). JSON "stopwatch" | "countdown".
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimerMode {
    #[default]
    Stopwatch,
    Countdown,
}

pub const COUNTDOWN_SECS_MIN: u32 = 1;
pub const COUNTDOWN_SECS_MAX: u32 = 359_999; // 99:59:59
pub const DEFAULT_COUNTDOWN_SECS: u32 = 1_500; // 00:25:00 (D-2)
pub const ALARM_VOLUME_MAX: u32 = 100;
pub const DEFAULT_ALARM_VOLUME: u32 = 80; // (D-10)

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)] // 유지
pub struct TimerSettings {
    /// 스톱워치 또는 타이머 켜짐(CR-048부터 의미 확장, 값 불변). 끄면 bridge가 `Timer::disable`.
    pub enabled: bool,
    /// 신규. 알 수 없는 문자열·다른 타입 → Stopwatch(§3.10.2).
    pub mode: TimerMode,
    /// 신규, JSON "countdownSecs". 1~359999(§3.10.3).
    pub countdown_secs: u32,
    /// 신규, JSON "alarmVolume". 0~100 %.
    pub alarm_volume: u32,
    pub text_pos: Point, // 이하 불변
    pub rotation: f64,
    pub font_size: f64,
    pub color: String,
}
// Default: enabled false, mode Stopwatch, countdown_secs DEFAULT_COUNTDOWN_SECS,
//          alarm_volume DEFAULT_ALARM_VOLUME, 나머지 불변.
```

- **필드 순서 = 직렬화 순서**(S-T12 문자열이 이 순서를 단언한다).
- `TimerMode` 자체의 `Deserialize`는 엄격(두 값만)이다. 관대함은 **필드**의 `deserialize_with`가 맡는다.
- `//!` [목적]·[공개 API]·[규칙]에 모드·시작 시간·음량·`TimerMode`·새 상수를 더한다.

#### 3.10.2 관대한 역직렬화 (🔒 필수 — 구현 방식은 재량)

| 필드 | 입력 JSON | 읽은 값 |
|---|---|---|
| `mode` | `"stopwatch"` / `"countdown"` | 그 값 |
| `mode` | 다른 문자열·수·`null`·객체·배열 | `Stopwatch`(경고 로그 권장) |
| `countdownSecs`·`alarmVolume` | 0 이상 정수 | 그 값(u32를 넘으면 `u32::MAX`로 포화) → 뒤이어 `normalize` |
| 〃 | 0 이상 소수(`12.7`) | 내림(`12`) → `normalize` |
| 〃 | 음수·문자열·`null`·bool·객체 | 기본값(`1500` / `80`) |
| 세 키 없음 | — | 컨테이너 default(`Stopwatch` / `1500` / `80`) — `deserialize_with`는 키가 있을 때만 불린다 |

- 권장 방식: 필드별 `#[serde(deserialize_with = "…")]`에서 `serde_json::Value`로 받아 판정(§3.5 `Language` 관용 읽기와 같은 계열). 두 수 필드는 판정 함수 하나(`fn lenient_u32(v: &Value) -> Option<u32>`)를 같이 쓴다.
- 파일 읽기와 `set_settings` 입력이 같은 타입이라 **IPC에도 같은 규칙**이 걸린다 — 알 수 없는 `mode`는 `settings.invalid`가 아니라 `Stopwatch`로 읽힌다(ui는 두 값만 보낸다, §3.10.7 S-D10).

#### 3.10.3 `validate`·`normalize`

| 함수 | 조건 | 결과 |
|---|---|---|
| `validate` | `countdown_secs ∉ COUNTDOWN_SECS_MIN..=COUNTDOWN_SECS_MAX` | `Invalid("타이머 시작 시간은 00:00:01 ~ 99:59:59 사이여야 합니다.")` |
| `validate` | `alarm_volume > ALARM_VOLUME_MAX` | `Invalid("알림음 음량은 0 ~ 100 사이여야 합니다.")` |
| `normalize` | `countdown_secs == 0` | `DEFAULT_COUNTDOWN_SECS`(1500) |
| `normalize` | `countdown_secs > COUNTDOWN_SECS_MAX` | `COUNTDOWN_SECS_MAX` |
| `normalize` | `alarm_volume > ALARM_VOLUME_MAX` | `ALARM_VOLUME_MAX` |

- 새 검사는 기존 검사(위치·회전·크기·색) 뒤에 둔다. `validate`는 거부만, `normalize`는 보정만(S-D2 유지).
- `normalize`의 경고 로그는 기존 1줄(`{t:?} → {fixed:?}`)에 새 필드가 자연히 들어간다. `enabled`·`mode`는 `normalize`가 바꾸지 않는다.
- 사용자에게 보이는 전체 문구는 기존 `Invalid` Display 「설정값이 올바르지 않습니다: {문구}」.

#### 3.10.4 호환 (TM-02)

| 입력 | 동작 |
|---|---|
| `{"timer":{"enabled":true}}`(CR-045 파일) | `enabled` true, `Stopwatch`, 1500, 80 → **스톱워치 켜짐** |
| `timer` 없음 | 전체 기본값(둘 다 꺼짐) |
| 새 필드 타입 오류 | 그 필드만 기본값, 설정 나머지 보존(§3.10.2) |
| 기존 필드 타입 오류(`"rotation":"5"`) | 여전히 `Format` → 전체 기본값(S-D3 유지) |
| 옛 앱이 새 파일을 읽음 | 새 키를 모르는 키로 무시 → 옛 앱이 저장하면 새 키 빠짐 → 새 앱에서 기본값(되돌리기 안전) |
| `version`·마이그레이션 | 없음(D19 유지) |
| `keep_core_owned` | 불변 — `timer`는 ui 소유 |

- 알림음 파일은 settings.json에 적지 않는다. 디스크 `assets/alarm.*`가 진실이다([assets.md](assets.md) §3.15).

#### 3.10.5 테스트 (§8 증분 — `settings/timer.rs` `#[cfg(test)]`, 패킷 §4 이름 그대로)

| # | 이름 | 조건 | 기대 |
|---|---|---|---|
| S-T13 | `timer_mode_default_is_stopwatch` | `TimerSettings::default()`, `Settings::default().timer` | `Stopwatch`, 1500, 80, `Settings::default().validate()` Ok |
| S-T14 | `old_timer_enabled_true_reads_as_stopwatch` (TM-02) | tempdir `{"timer":{"enabled":true}}` → `load` | `enabled` true, `Stopwatch`, 1500, 80 |
| S-T15 | `unknown_mode_falls_back_to_stopwatch` | `{"scale":1.5,"timer":{"enabled":true,"mode":"pomodoro","countdownSecs":60}}` / `"mode":5` | `Stopwatch`, `enabled` true, `countdownSecs` 60, `scale` 1.5(나머지 보존) |
| S-T16 | `countdown_secs_validate_bounds` | 0·1·359999·360000 | 0·360000 → `Invalid`(§3.10.3 문구), 1·359999 → Ok |
| S-T17 | `countdown_secs_normalize_on_load` | 파일 값 0 / 999999 / -5 / `"abc"` / 12.7 | 1500 / 359999 / 1500 / 1500 / 12. 다른 필드(`scale`·`timer.color`) 보존 |
| S-T18 | `alarm_volume_validate_and_normalize` | `validate` 101 / 100 / 0, 파일 101 / `"loud"` | `Invalid` / Ok / Ok, 100 / 80 |
| S-T19 | `timer_settings_new_fields_round_trip` | `Countdown`·3661·0으로 `save` → `load` | 같음 |
| S-T12 갱신 | `timer_serializes_camel_case` | `Settings::default()` 직렬화 | `"timer":{"enabled":false,"mode":"stopwatch","countdownSecs":1500,"alarmVolume":80,"textPos":{"x":142.0,"y":458.0},"rotation":9.0,"fontSize":36.0,"color":"#333333"}` 포함 |
| S-T12b 갱신 | `timer_round_trips_through_save_load` | `TimerSettings { … }` 리터럴(`..` 없음, `timer.rs:358`)에 새 3필드 추가 | 컴파일·왕복 통과 |

- 기존 S-T1~S-T12b 유지·통과. `timer.rs` 370줄 → 약 600줄(800 미만). 넘으면 새 테스트를 `settings/timer_tests.rs`로 뺀다.

#### 3.10.6 bridge 요구 (§9 증분 — 계약 확정은 bridge-designer)

- 호환성: **추가**(저장 데이터 비파괴). TS `TimerMode = 'stopwatch' | 'countdown'`, `TimerSettings` + `mode`·`countdownSecs`·`alarmVolume` — Rust는 항상 직렬화, TS는 선택 필드이고 없으면 기본값(02-design §4). TS 기본값·범위 상수는 §3.10.1과 1:1.
- `set_settings` 부수 효과 확장(bridge 패킷): 저장 성공 뒤 끔이면 `disable` → `configure(TimerConfig::from_settings(&new.timer), now)` → 바뀌었으면 `publish_timer_change`, 아니면 `tray::sync_timer_menu`([timer.md](timer.md) §3.9).
- 에러: 새 code 없음(`settings.invalid` 문구 2개 추가, 원문 ko — TM-13).
- `bridge/types.rs` 재노출에 `TimerMode` 추가 여부는 bridge 판단.

#### 3.10.7 결정·파급 (§11 증분)

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| S-D8 | 새 3필드만 관대한 역직렬화, 기존 필드는 S-D3 유지 | 모든 필드 관대 | 패킷 필수 범위. 새 필드는 옛 앱·수동 편집과 섞일 가능성이 가장 크다 |
| S-D9 | 음수는 기본값(0으로 자르지 않음) | `alarmVolume` 음수 → 0 | 패킷 §2.1 「음수·타입 오류 → 기본값」. 02-design §5 표의 `alarmVolume` 「범위로 자르기」와 음수에서만 다르다(패킷 우선) |
| S-D10 | `set_settings`의 알 수 없는 `mode`는 거부 대신 `Stopwatch` | `settings.invalid` | 파일·IPC가 같은 타입. 02-design §5 「serde가 거부」와 다르다(패킷 우선) — ui는 두 값만 보낸다 |

파급(Grep 2026-09-26): 새 필드로 깨지는 `TimerSettings { … }` 리터럴(`..` 채움 없음)은 `settings/timer.rs` S-T12b 1곳(갱신). 다른 리터럴은 `..base`·`..d` 채움. `bridge/types.rs:125`는 `TimerSettings::default()`만 → 안 깨짐. `Settings { … }` 리터럴은 §3.8.2대로 모두 `..` 채움.

### 3.11 data-reset — 앱 시작 순서·전체 초기화의 설정 교체 (🔒 2026-09-27 사용자 결정 R-A·R-B·D-2·D-3·D-5, 정본 [data_reset.md](data_reset.md))

비유: 장부(settings)는 그대로이고, 장부를 새 양식으로 바꿔 쓰는 관리인(`data_reset`)이 생긴다. 관리인은 기존 「장부 고치기 창구」(`update`)만 쓴다. 장부 맨 위에 적힌 두 칸(자동 실행·언어)만 옮겨 적는다.

**앱 시작 순서(`lib.rs` setup, 🔒 — [data_reset.md](data_reset.md) §3.7과 같다)**

```
1. AppPaths::new
2. create_dir_all(assets_dir)
3. let state = Mutex::new(settings::load_or_default(settings_file))   ← 시딩 뒤(lib.rs:98)에서 앞으로 옮김
4. data_reset::run_startup(&paths, &state)                            ← 신규. 세대 불일치·없음이면 전체 초기화
5. let settings = state.into_inner() (poison이면 PoisonError::into_inner)
6. seed_default_assets → load_manifest → 손 기준점 → 타이머 from_settings → AppState { settings: Mutex::new(settings.clone()), … }
   … 창·훅·트레이 → spawn_autostart_sync(autostart를 실제 작업 등록 상태로 보정 — 기존)
```

- 3~5는 lib.rs 비공개 도우미 `startup_settings(&AppPaths) -> Settings`에 모은다. 이후 코드는 초기화 뒤의 설정 값을 쓴다.
- **전체 초기화에서 설정에 일어나는 일**(`data_reset::reset_data` ④): `settings::update(state, settings_file, |cur| *cur = data_reset::reset_settings(cur))` 한 번 — CR-047 단일 저장 창구(§3.9). 결과 = `Settings { autostart: cur.autostart, language: cur.language, ..Settings::default() }`. 오버레이 위치도 기본 (100, 100)으로 돌아간다(D-5).
- **초기화 전에 설정 파일을 못 읽었으면**(없음·손상 → `load_or_default`가 기본값) 메모리 값이 기본이므로 **언어도 기본값(`Ko`)이 된다.** `autostart`는 5 이후의 보정 스레드가 실제 등록 상태로 되돌린다.
- `settings.json` 본체는 지우지 않는다(`*.tmp` 잔재만 지움). `update`가 값이 같으면 저장을 생략하므로(store.rs:35), 본체를 지우면 보존한 언어가 디스크에서 사라질 수 있기 때문이다([data_reset.md](data_reset.md) §11.1 Δ2).
- **settings 쪽 변경 없음.** 공개 API·스키마·검증·`version` 부재(D19)·`keep_core_owned` 불변. 세대 표식은 settings 스키마 밖의 `data-generation.json`이다(02-design §4).
- 잠금: `update`가 설정 잠금을 잡으므로 `reset_data` 호출자는 잠금을 쥔 채 부르면 안 된다(bridge 요구 — [data_reset.md](data_reset.md) §9).
- 테스트: [data_reset.md](data_reset.md) §8(`reset_settings_keeps_autostart_and_language`·`language_defaults_when_settings_unreadable`·`reset_twice_keeps_language_on_disk` 등). store.rs SU1~SU7 영향 없음.

## 4. 스레드·채널

없음. 호출자 스레드에서 동기 실행.

## 5. unsafe

없음.

## 6. 에러 타입

변형 변경 없음. CR-019로 `Invalid` 메시지 **"쾅 기준은 동시 키 2개 이상, 유지 시간 1ms 이상이어야 합니다."가 사라진다.** `code()` 값 변경 없음(bridge 파급 0 — ui는 메시지 문자열을 표시만 한다).

| 변형 | 한국어 메시지 | 원인 | `code()` |
|---|---|---|---|
| `Invalid(String)` | 설정값이 올바르지 않습니다: {0} | 검증 규칙 위반(배율·유휴·`area` 유한수) | `settings.invalid` |
| `Io(#[from] std::io::Error)` | 설정 파일을 읽거나 쓸 수 없습니다: {0} | 파일 IO | `settings.io` |
| `Format(#[from] serde_json::Error)` | 설정 파일 형식이 올바르지 않습니다: {0} | JSON 형식(`area` 길이 ≠ 4 포함. 옛 `slam` 형식은 원인이 되지 않음) | `settings.format` |

## 7. 설정 의존

- 자기 자신. 다른 모듈 의존 없음.
- 쓰는 쪽: window(`overlay.*`·`save`), assets(`Point` 타입만), bridge(`get_settings`·`set_settings`), tray(`overlay.visible`). `area`를 읽는 core 코드는 없다(ui 전용 값 — bridge가 그대로 전달). **`slam`을 읽던 core 코드는 없었다**(ui 상태 기계 전용 값 — CR-019 삭제로 core 동작 변화 없음).

## 8. 테스트 계획

### 8.1 단위 — `settings/mod.rs` `#[cfg(test)]` (CR-017, 적용 완료)

| # | 종류 | 대상 | 기대 |
|---|---|---|---|
| U1 | 기존 | `default_mouse().hand` | `None` |
| U2 | 기존, **CR-019 단언 수정** | `default_is_valid_and_camel_case` | 직렬화에 `area`(기본 4점) 포함, `"pad"` 미포함, `partPos` 포함·`armWidth` 미포함(기존). **`"keys":6` 단언 삭제 → `assert!(!json.contains("slam"))`**(§8.3 C1) |
| U3 | 기존 | `save_and_load_round_trip` | 직사각형 아닌 `area` 왕복 후 같은 값 |
| U4 | 기존 | `old_mouse_json_is_read_with_defaults` | 성공, `area == default_area()`, `part_pos` (389,492), `hand == None` |
| U5 | 기존 | `default_mouse().part_pos` | (389, 492) |
| U6 | 기존 | `area_rejects_non_finite_points` | NaN·±무한대 각각 `Err(Invalid)` |
| U7 | 기존, **CR-019 단언 추가** | `old_settings_file_round_trips_to_new_schema`(옛 파일: `slam`·`pad` 있음, `area`·`partPos` 없음) | `load` 성공, `area == default_area()`, `part_pos` 기본. 저장 후 텍스트에 `"pad"` 없음·`"area"` 있음, `armWidth` 없음(기존). **`"slam"` 없음 추가**(§8.3 C3) |
| U8 | 기존 | `corrupted_file_falls_back_to_default` | PASS |
| U9 | 기존 | `area_accepts_any_quad_shape` | 모두 `validate` = `Ok` |
| U10 | 기존 | `default_mouse_area_is_default_rectangle` | 인덱스 = 왼위·오위·오아래·왼아래 |
| U11 | 기존 | `default_area_within_stretch_range_of_estimated_anchor` | 네 꼭짓점 `0.5 ≤ k ≤ 1.6` |
| U12 | 기존 | `area_with_wrong_length_is_format_error` | `Err` |

### 8.2 통합 — `src-tauri/tests/`(tempdir, settings + assets 조합)

| # | 준비 | 호출 | 기대 |
|---|---|---|---|
| I1 | tempdir에 `doc/assets/samples/mouse_pen_hand.png`를 `mouse_base`로 등록 | `compute_hand_anchor(.., default_mouse().shoulder, default_mouse().part_pos)` → `Some(a)` | `default_area()`의 네 꼭짓점 모두 `0.5 ≤ |c − S| / |a − S| ≤ 1.6`(적용 완료, `tests/mouse_area_defaults.rs`). CR-019 영향 없음 |

- window의 `persist_overlay_position` tempdir 테스트는 영향 없음.

### 8.3 CR-019 — 쾅 삭제 (단위·tempdir, `settings/mod.rs` `#[cfg(test)]`)

| # | 종류 | 대상 | 기대 |
|---|---|---|---|
| C1 | 기존 수정(U2) | `default_is_valid_and_camel_case` | 기본 설정 직렬화에 `"slam"`·`"keys"`·`"durationMs"` 문자열이 없다 |
| C2 | 기존 수정 | `rejects_out_of_range_values` — `s.slam.keys = 1` 두 줄 삭제 → **`s.idle_seconds = 0;` 후 `validate` = `Err(Invalid)`** | 배율 5.0 거부(기존) + 유휴 0 거부(쾅 대신 남은 규칙으로 커버리지 유지) |
| C3 | 기존 수정(U7) | `old_settings_file_round_trips_to_new_schema` — 옛 JSON에 이미 `"slam": { "keys": 6, "durationMs": 300 }` 있음 | `load` 성공(기존) + 저장 후 텍스트에 **`"slam"` 없음** |
| C4 | 신규 tempdir | `old_invalid_slam_is_ignored_on_load`: 파일 `{"idleSeconds": 60, "slam": {"keys": 1, "durationMs": 0}}` | `load` = `Ok(Some(s))`, `s.idle_seconds == 60`(옛 규칙 위반값 때문에 기본값으로 초기화되지 않음 — 이전 동작과 달라진 점의 증명). `load_or_default(&path).idle_seconds == 60` |
| C5 | 신규 단위 | `old_slam_of_any_shape_is_ignored`: `serde_json::from_str::<Settings>` 에 ① `{"slam": "x"}` ② `{"slam": 42}` ③ `{"slam": null}` ④ `{"slam": [1,2]}` | 네 경우 모두 `Ok(s)`, `s == Settings::default()` (형식 무관 무시 — `deny_unknown_fields` 부재의 회귀 방지) |

- window `placement.rs` K4(`k4_keep_overlay_position_leaves_other_fields_from_incoming`): `incoming.slam.keys = 3;`·`assert_eq!(merged.slam.keys, …)` **두 줄 삭제**(다른 필드 단언으로 의도 유지 — 컴파일 깨짐 수리, §11 CR-019 파급).
- 완료 기준(스킬 §9): `cargo fmt --check`·`cargo clippy -- -D warnings` 0·`cargo test` 전건 PASS 출력. `cargo build --examples`(또는 `cargo check --examples`) 통과 — `examples/import_sample.rs` 수리 증명.

### 8.4 CR-024 — `penPos` (단위·tempdir, `settings/mod.rs` `#[cfg(test)]`)

| # | 이름(안) | 준비·호출 | 기대 |
|---|---|---|---|
| ~~N1~~ | ~~`default_pen_pos_is_none`~~ | — | **CR-035로 대체 → §3.7 N1′ `default_pen_pos_is_380_496`.** N1~N5는 `settings/pen_pos_tests.rs`로 이동(§3.7) |
| N2 | `old_mouse_json_without_pen_pos_reads_none` | `mouse`에 `shoulder`·`partPos`만 있는 JSON | `Ok`, `pen_pos == None`, 다른 필드 기존 기대 그대로(U4와 같은 픽스처에 단언 추가해도 됨) |
| N3 | `pen_pos_round_trips` (tempdir) | `pen_pos = Some(Point { x: 410.5, y: 505.25 })` → `save` → `load` | 같은 값, 파일 텍스트에 `"penPos"` 있음 |
| N4 | `pen_pos_null_reads_none` | `"penPos": null` | `Ok`, `None`, `validate` = `Ok` |
| N5 | `pen_pos_is_not_range_checked` | `Some(Point { x: -50.0, y: 5000.0 })` | `validate` = `Ok`(캔버스 밖이어도 거부 안 함 — D17) |

- 기존 U1~U12·C1~C5 전건 PASS(구조체 리터럴 `:233`에 `pen_pos: None,` 추가 외 수정 없음). `cargo check --examples` 통과(`import_sample.rs:69` 수리 증명).

## 9. bridge 요구 명세

### 9.4 CR-024 — `Settings.mouse.penPos` 추가 (계약 §3.3·§5.1) — **호환성: 추가, 저장 데이터 비파괴**

| # | 계약 위치 | 요구 | 호환성 분류 |
|---|---|---|---|
| 1 | TS `Settings.mouse` | 추가 `penPos: Point \| null  // 펜 쥔 손 그림 왼쪽 위 캔버스 좌표(쉬는 자세 기준). null = 아직 놓지 않음 — pen_up 첫 등록 때 ui가 정해 저장`. `DEFAULT_MOUSE_SETTINGS.penPos = null`. Rust는 항상 키를 보낸다(`null` 포함) — 선택 필드(`penPos?:`)로 둘지는 bridge-designer 결정 | 추가 — TS 필수 필드면 픽스처 갱신(ui) |
| 2 | Rust 계약 블록 `MouseSettings` | `#[serde(default)] pub pen_pos: Option<Point>` (§3.1.1) | 추가 |
| 3 | 마우스 기본값 표·JSON 예시 | `penPos` 행 / `"penPos": null` | 설명 |
| 4 | 검증 규칙 | 추가 없음 | — |
| 5 | 런타임 호환 | ① 옛 settings.json → `None` ② 새 ui + 옛 Rust: 모르는 키로 무시(오류 없음, 값은 저장 안 됨) ③ 옛 ui + 새 Rust: `set_settings`에 키가 없으면 `None`으로 저장 → 저장된 `penPos`가 지워짐 → **core·bridge·ui 한 반영 묶음**([assets.md](assets.md) §9.7-10과 같은 묶음) | 비파괴(순서 의존) |
| 6 | §5.1 손 기준점 「재계산 안 함」 목록 | `mouse.penPos` 변경 추가(`bridge/commands.rs:146` 비교 키 `(shoulder, part_pos)` — 코드 불변) | 설명만 |
| 7 | 변경 이력 | "MouseSettings: `penPos` 추가(CR-024 — 추가)" | — |

### 9.0 CR-019 — `Settings.slam` 삭제 (계약 §3.3) — **호환성: TS 파괴, 저장 데이터·IPC 런타임 비파괴**

| # | 계약 위치 | 요구 | 호환성 분류 |
|---|---|---|---|
| 1 | TS `Settings` | **삭제** `slam: { keys: number; durationMs: number }` 필드, `SlamSettings` 인터페이스, `DEFAULT_SETTINGS.slam`(`src/bridge/types.ts:60,101,180`) | **TS 파괴** — 사용처 컴파일 오류로 드러남: `src/overlay/index.tsx:72,75`, `src/state/inputMachine.ts`(`MachineConfig.slam`), 테스트 픽스처(`src/overlay/test/*` 5개, `src/settings/test/*` 2개, `src/state/inputMachine.test.ts`) — ui 갱신 동반 |
| 2 | Rust 계약 블록 | `pub slam: SlamSettings,` 필드와 `pub struct SlamSettings { … }` 삭제. `src-tauri/src/bridge/types.rs:17` 재노출 `pub use crate::settings::{…, SlamSettings}`에서 `SlamSettings` 삭제(**컴파일 깨짐**), `:10` 문서주석 표에서 `SlamSettings` 삭제 | — |
| 3 | 기본값 표·JSON 예시 | `slam` 행·키 삭제 | — |
| 4 | 검증 규칙(§3.3 본문) | `slam.keys ≥ 2`, `slam.durationMs ≥ 50` 삭제. 남는 규칙: `0.25 ≤ scale ≤ 2`, `idleSeconds ≥ 10`(계약 문구 — 코드 `≥ 1`, 확인 필요 2), `area` 유한수 | 완화(비파괴) |
| 5 | 런타임 호환(IPC·저장) | ① 옛 ui가 `set_settings`에 `slam`을 실어 보내도 새 Rust는 모르는 키로 무시 ② 새 ui가 `slam` 없이 보내도 옛 Rust는 `Settings` 컨테이너 `#[serde(default)]`로 기본값 채움 ③ 옛 settings.json의 `slam`은 무시(§3.3) → **반영 순서 무관, 데이터 손실 없음**. 단 TS 타입 삭제는 ui 코드와 같은 묶음이어야 `yarn tsc`가 통과 | 비파괴 |
| 6 | §5.1 손 기준점 「재계산 안 함」 목록 | "배율·유휴·**쾅**·표시·…"에서 **"쾅" 삭제** | 설명만 |
| 7 | `input://keyboard` 설명(§4) | `heldCount` 설명 "(쾅 판정용)" → **"(키보드 누름 표시용 — 0이면 모든 키가 떼어져 들림, 1 이상이면 누름 유지)"**. 페이로드 모양·이름 **불변**. Rust `src-tauri/src/bridge/events.rs:27` 문서주석도 같은 문구로 | 비파괴(설명만) — 유지 근거 §11 D14 |
| 8 | 변경 이력 | "Settings: `slam`·`SlamSettings` 삭제(쾅 폐기, CR-019 — TS 파괴, 저장·IPC 비파괴). `heldCount` 설명 정정" | — |

- 에셋 슬롯 `'slam'` 삭제는 [assets.md](assets.md) §9.5 — **같은 반영 묶음**(ui 상태 기계에서 `'slam'` 상태·레이어를 걷어내는 작업과 함께).

### 9.1 `Settings.mouse` 필드 변경 (계약 §3.3, CR-017) — 호환성: 파괴(TS), 저장 데이터 비파괴

| # | 계약 위치 | 요구 | 호환성 분류 |
|---|---|---|---|
| 1 | TS `Settings.mouse` | 추가 `area: [Point, Point, Point, Point]  // 캔버스 좌표, [왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래]. 커서가 있는 모니터 비율 (u,v)를 쌍선형 보간해 손 목표점. 기본 [(375,525),(495,525),(495,625),(375,625)]`(2026-09-23 실측 정정) | 저장 데이터 비파괴(누락 시 기본값). TS 타입은 필수 필드 추가 → ui 갱신 필요 |
| 2 | TS `Settings.mouse` | 삭제 `pad: { x; y; width; height }` | 파괴 — TS 사용처 제거 필요. 저장 데이터는 호환(옛 키 무시) |
| 3 | Rust `MouseSettings` 블록 | §3.2 구조체로 교체(`area` + `#[serde(default = "default_area")]`, `pad` 삭제). Rust `Rect` 구조체 삭제 | — |
| 4 | 마우스 기본값 표·JSON 예시 | `pad` 행 → `area` 행 | — |
| 5 | 검증 규칙 | `pad.width/height > 0` 삭제 → `area` 네 점 x·y 유한수 | 사실상 완화(비파괴) |
| 6 | `hand` 의미·폴백 체인 | 기준점 폴백 ③ "패드 중심" → "이동 영역 중심(네 꼭짓점 평균 = 쌍선형 (0.5, 0.5))" | 설명·ui 로직 |
| 7 | §5.1 손 기준점 재계산 트리거 표 3 | "`mouse.area`·`mouse.hand` 변경 → 재계산 안 함". 기준점은 그림(`mouse_base`)·`shoulder`·`partPos`에만 의존 | 설명만 |
| 8 | 변경 이력 | "MouseSettings: area 추가, pad·Rect 삭제. CR-017" | — |
| 9 | 기본 `area` 값 정정(2026-09-23) | 계약 §3.3 기본값 표·JSON 예시와 TS `DEFAULT_MOUSE_SETTINGS.area`를 새 값으로 | 비파괴 |

### 9.2 전환 위험 (CR-017, 기록)

- Rust만 먼저: ui가 `area` 없이 `pad`를 보내면 `pad`는 무시되고 `area`는 기본값으로 저장된다.
- TS만 먼저: 옛 Rust `MouseSettings.pad`는 필수 → `set_settings` 인자 오류.
- 따라서 core `settings`, bridge Rust·TS, ui를 한 반영 묶음으로 넣는다(적용 완료).

### 9.3 새 command·event

- 없음(CR-017·CR-019 모두). CR-019는 삭제만 있다.

## 10. 요구 추적표

| 요구ID | 반영 절 | 상태 |
|---|---|---|
| **CR-019 / ST-R-05·OV-R-06 폐기 — `slam`·`SlamSettings` 삭제, 쾅 검증 삭제** | §2, §3.1, §3.4, §6 | ✅ 설계 · 소스 미적용 |
| **CR-019 — 옛 settings.json `slam` 무시(읽기 실패 금지)** | §3.3, §8.3 C3·C4·C5 | ✅ 설계 · 소스 미적용(serde 기본 동작이라 코드 변경 없음, 테스트로 증명) |
| **CR-019 — 파급 수리(window K4, examples, bridge 재노출)** | §8.3, §11 CR-019 파급 | ✅ 설계 · 소스 미적용 |
| R-tmp-3 — 자유 사각형 이동 영역 `area`, 네 점 저장 | §3.1, §3.2, §8 U2·U3·U9·U10·U12 | ✅(구현 완료, 요구ID 확인 필요) |
| R-tmp-3 — 기본 영역(실측 손 기준점 중심, 늘어나기 0.5~1.6 안) | §3.2 `default_area`, §11 D8, §8 U11·I1 | ✅(구현 완료) |
| R-tmp-3 — `pad` 폐기, 옛 파일 호환 | §3.3, §8 U4·U7 | ✅(구현 완료) |
| OV-R-14 — 폴백 ③ 영역 중심 | §3.2 `hand` 문서주석, §9.1-6 | 부분(ui 구현) |
| R-tmp-2 — 위치 (x, y) 저장, 기본 (389, 492) | §3.1 | ✅(구현 완료) |
| OV-R-08 — 팔 굵기·색 폐기 | §3.1 | ✅(구현 완료) |
| OV-R-14 / ST-R-09 — 기본 `hand` 없음 | §3.2 | ✅(구현 완료) |
| OV-R-13 — 위치 필드·저장 | §3.1, §2 `save` | ✅(기존) |
| ST-R-03·04·06, ST-R-10 | §3.1 | ✅(기존) |
| **R-tmp-4 (CR-024) — `MouseSettings.pen_pos: Option<Point>`(JSON `penPos`, 🔒 이름·타입)** | §3.1, §3.1.1, §8.4 N1·N3 | ✅ 설계 · 소스 미적용 |
| **R-tmp-4 — 기본 `None`, 옛 파일 호환(serde default)** | §3.1.1, §8.4 N1·N2·N4 | ✅ 설계 · 소스 미적용 |
| **R-tmp-4 — 첫 등록 시 기본 위치 결정·드래그 조정** | [assets.md](assets.md) §9.7 UI-M8(요구만) | 부분(ui 몫) |
| **SV2-02 — `language` 저장, 기본 ko, 알 수 없는 값 → ko(읽기 실패 금지)** | §3.5 코드·§8 V1·V2·V3 | ✅ 설계 · 소스 미적용 |
| **SV2-03·04 — `positionLock`·`showInTaskbar` 저장(기본 false)** | §3.5, §8 V1·V3·V4·V5 | ✅ 설계 · 소스 미적용(적용은 window) |
| **SV2-05 — `autostart` core 소유(쓰기 주체 제한)** | §3.5 문서주석·§9-4, [window.md](window.md) §2.4, [tray.md](tray.md) §7 | ✅ 설계 · 소스 미적용 |
| **SV2 — 옛 settings.json 호환(새 키 없음 → 기본값, 나머지 보존)** | §3.5, §8 V1 | ✅ 설계 · 소스 미적용 |
| **SV2-11·12(D-7) — 배율·유휴 검증 그대로** | §3.4 `validate`(불변) | ✅(기존, 변경 없음) |
| **R-tmp-5 (CR-033) — `MouseSettings.pen_mode: bool`(JSON `penMode`, 🔒 이름·타입)** | §3.1, §3.6, §8 P1·P3 | ✅ 설계 · 소스 미적용 |
| **R-tmp-5 — 기본 false, 옛 파일 false(serde default), 검증 없음** | §3.6 호환, §8 P2·P4·P5 | ✅ 설계 · 소스 미적용 |
| **R-tmp-5 — ui 소유 필드(`set_settings` 저장, `keep_core_owned` 불변)** | §3.6 파급·§9-5 | ✅ 설계 · 소스 미적용 |
| **R-tmp-5 — 토글·안내 상자·확인창·`pen_up` 첫 등록 확인창·모드 해석** | §3.6 §9(요구만) | 부분(ui 몫) |
| **TM-01 (CR-048) — `timer.mode`(stopwatch·countdown), `enabled` 의미 확장(D-1 A)** | §3.10.1, §3.10.5 S-T13·S-T15 | ✅ 설계 · 소스 미적용 |
| **TM-02 — 옛 `enabled:true` → 스톱워치 켜짐(이행 코드 없음)** | §3.10.4, §3.10.5 S-T14 | ✅ 설계 · 소스 미적용 |
| **TM-04 — `countdownSecs` 1~359999, 기본 1500(D-2·D-3), 읽기 보정·관대한 역직렬화** | §3.10.1~§3.10.3, S-T16·S-T17 | ✅ 설계 · 소스 미적용 |
| **TM-10 — `alarmVolume` 0~100, 기본 80(D-10)** | §3.10.1~§3.10.3, S-T18 | ✅ 설계 · 소스 미적용 |
| **TM-13 — core 검증 문구 2개(원문 ko)** | §3.10.3 | ✅ 설계 (3개 국어는 ui) |
| **CR-048 — 새 필드 직렬화·왕복** | §3.10.5 S-T12 갱신·S-T12b 갱신·S-T19 | ✅ 설계 · 소스 미적용 |

## 11. 설계 결정 노트

### CR-033 결정 (2026-09-24)

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| **D25** | `pen_mode: bool` + **필드** `#[serde(default)]`, 기본 false, 위치 `MouseSettings` 끝 | ① `Option<bool>`(None = 미결정) ② 최상위 `Settings.pen_mode` | 🔒 확정사항 `mouse.penMode`(bool). 필드 단위 default는 D4와 같은 이유(컨테이너 default 없음). ①은 계약·ui에 3값이 퍼진다 — 업그레이드 문제(확인 필요 12)만을 위한 것이라 사용자 판단 전엔 도입 안 함 |
| **D26** | 검증 없음 — `pen_up` 등록·`penPos`와의 관계도 검사 안 함 | `true`인데 `pen_up` 없음 거부 | settings는 에셋을 모른다(의존 방향 `assets → settings`, 역방향 금지·스킬 §1 의미 해석 금지). 🔒 "`pen_up` 없으면 토글 비활성"·"손 이미지가 없으면 기존 키보드 모션"은 ui 표시 규칙 — `pen_up` 삭제 뒤 `true`가 남아도 ui가 기존 모션으로 해석한다. 규칙이 늘면 `load_or_default` 초기화 대가(D9) |
| **D27** | bool 형식은 엄격(`null`·문자열·숫자 → `Format`) | `Language`(D20)처럼 관용 `Deserialize` | Rust·TS 모두 bool만 쓴다. `positionLock`·`showInTaskbar`와 같은 취급. 관용 읽기는 사용자 결정이 있던 `language`만 |
| **D28** | **ui 소유 필드** — `keep_core_owned` 불변 | core 소유(병합 때 현재값 유지) | 바꾸는 주체는 설정 창 토글·확인창뿐. core에 쓰는 경로가 없다 |
| **D29** | 새 테스트는 자식 파일 `settings/pen_mode_tests.rs` | 기존 `mod tests`에 추가 | `mod.rs` 770줄 + 테스트 ~50줄이면 800줄 초과(golden-principles §1). 기존 `mod tests`를 통째로 `tests.rs`로 옮기는 정리는 별건 권고(hook `tests.rs` 선례) |

- 확인 필요 11 **(CR-033)**: R-tmp-5 요구ID를 화면 요구 문서에 부여 — ui-designer 소관(확인 필요 10과 같은 성격).
- 확인 필요 12 **(CR-033, 사용자 판단)**: **업그레이드 동작 변화** — CR-024·027 구현본에서 `pen_up`을 이미 등록한 사용자는 펜 모드가 암묵적으로 켜져 있었는데, 새 앱은 `penMode` 키가 없어 false로 읽는다 → 펜 손이 멈추고 키보드 그림이 다시 바뀐다. "`pen_up` 첫 등록 확인창"은 이미 등록된 그림엔 뜨지 않는다. 대안: (a) 확정사항 문언대로 false, 사용자가 토글을 한 번 켠다(권고 — 1인 사용, 추가 코드 없음) (b) `Option<bool>`로 "키 없음"을 구분해 ui가 첫 로드에 `pen_up` 있으면 확인창(D25 ①, 계약·ui 3값). (b)를 고르면 이 절 재설계.

### settings-v2 결정 (2026-09-24)

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| **D20** | `Language`에 **수동 `Deserialize`** — `serde_json::Value`로 받아 문자열이면 해석, 그 밖 전부 `Ko` | ① `#[serde(other)]` 변형 ② 필드 속성 `deserialize_with` ③ `String` 필드 + 검증 | 🔒 "알 수 없는 값 → ko, 파일 읽기·`set_settings` 모두 관용". ①은 문자열 입력만 받아 `null`·숫자에서 여전히 실패하고, serde 문서상 `other`는 내부·인접 태그 enum용이다. ②는 `Settings.language` 한 곳만 관용이라 다른 곳에서 `Language`를 받으면 규칙이 달라진다. ③은 ui·bridge에 세 값 외 문자열이 흘러 다닌다. `serde_json`은 이미 의존성이고 Tauri IPC 인자도 JSON 값이라 같은 경로로 읽힌다 |
| **D21** | `validate` 규칙·`version`·마이그레이션 없음 | `language` 세 값 검사 | 관용 읽기가 이미 세 값으로 정규화한다. 기본값 있는 키 추가라 serde `default`로 충분(02-design §4, D19와 같은 근거) |
| **D22** | core 소유 필드 병합 함수를 settings에 두지 않는다 → window `keep_core_owned` | 패킷 §1 제안 위치 `settings::keep_core_owned` | 어떤 필드를 core가 소유하는지는 의미 해석(스킬 §1 settings 금지)이고, 위치 병합 `keep_overlay_position`이 이미 window에 있다(window.md D18). settings가 window를 부르면 의존 방향(window → settings)이 거꾸로 된다 |
| **D23** | 필드 순서 = `autostart` 뒤 `language, position_lock, show_in_taskbar` | 앞쪽 배치 | serde는 이름 기반이라 호환 무관. 02-design §4 표 순서 |

### CR-024 결정 (2026-09-24)

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| **D16** | `pen_pos: Option<Point>` + `#[serde(default)]`, 기본 **`None`** | `part_pos`처럼 `Point` + `default_pen_pos()` 고정 좌표 | 🔒 사용자 지정(첫 등록 때 ui가 정해 저장). 좋은 기본 자리는 그림 크기·팔 위치에 따라 달라 settings가 고정 좌표를 줄 근거가 없다. `None`이 "아직 놓지 않음"을 그대로 표현한다 |
| **D17** | `pen_pos` **검증 없음** | 유한수·캔버스 안 검사 | `part_pos`(D5)와 같은 근거 — settings는 캔버스·그림 크기를 모르고, JSON은 NaN·무한대를 실을 수 없다(파일은 `Format`, IPC는 인자 오류로 먼저 걸림). 규칙이 늘면 `load_or_default`가 설정 전체를 초기화하는 대가가 크다(D9) |
| **D18** | 필드 위치 = **`MouseSettings` 끝** | 최상위 `Settings.pen` 구조체 | 🔒 이름 고정(`MouseSettings.pen_pos`). 펜 손은 팔 끝에 붙는 부품이라 `mouse`와 수명이 같다(`mouse = None`이면 의미 없음). serde는 이름 기반이라 순서는 호환에 무관 |
| **D19** | `version` 필드·마이그레이션 없음 | `version` 올림 | 추가만 있는 변경이라 serde `default`로 충분(D15와 같음) |

### 파급 — CR-024 (Grep 2026-09-24)

| 파일·위치 | 변경 | 소관 | 컴파일 |
|---|---|---|---|
| `src-tauri/src/settings/mod.rs:39-56`(구조체)·`:92-100`(`default_mouse`)·`:233`(테스트 리터럴)·`//!` | §3.1.1, 테스트 N1~N5 | core-implementer | `:233` **깨짐**(필드 누락) |
| `src-tauri/examples/import_sample.rs:69-74` | `MouseSettings` 리터럴에 `pen_pos: None,` | core-implementer | **깨짐**(예제) |
| `src-tauri/src/bridge/commands.rs:146`·`window/placement.rs`·`tests/*.rs` | 없음(`MouseSettings` 리터럴 없음, 기준점 비교 키 불변) | — | — |
| `doc/200_설계/bridge/contract.md` §3.3·§5.1·변경 이력 | §9.4 | bridge-designer | — |
| `src/bridge/types.ts` `Settings.mouse`·`DEFAULT_MOUSE_SETTINGS` | `penPos` 추가 | bridge-implementer | TS(필수 필드면 픽스처) |
| `src/settings/`·`src/overlay/` | [assets.md](assets.md) §9.7 UI-M8·UI-M9 | ui | — |

- 확인 필요 9 **(CR-024)**: `mouse = None`(마우스 파츠 끔)일 때 펜 손을 숨길지 — ui 판단(펜 손은 팔 끝에 붙으므로 숨김이 자연스럽다).
- 확인 필요 10 **(CR-024)**: R-tmp-4 요구ID를 화면 요구 문서에 부여 — ui-designer 소관([assets.md](assets.md) §11 확인 필요 B와 같은 항목).

### CR-019 결정 (2026-09-24)

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| **D13** | `SlamSettings`·`Settings.slam`·쾅 검증을 **삭제하고 주석 보존 안 함** | ① `hand`처럼 주석 보존 ② `#[serde(skip)]`로 필드만 숨김 ③ `Option<SlamSettings>`로 남김 | 🔒 "상태·설정·이미지 슬롯 모두 삭제". 요구 역추적이 끊긴 필드는 두지 않는다(스킬 §10). 주석 보존은 사용자가 명시할 때만(CR-007 선례) — 이번엔 지시 없음. ②·③은 죽은 필드가 계약·TS에 남는다 |
| **D14** | **hook의 동시 눌린 키 수(`InputEvent::Keyboard.held` → `heldCount`)는 유지. 제거 후보도 아님** | ① 제거(누름/뗌만) ② 불리언 `anyHeld`로 교체 | 쾅 외 사용처가 있다: `src/state/inputMachine.ts:95` `kbDown: held > 0` — 키보드 누름 이미지를 **여러 키 중 하나라도 눌려 있는 동안** 유지하는 판정이다(A 누름 → B 누름 → A 뗌이면 `pressed=false`지만 B가 눌려 있어 누름 유지). `pressed`만으로는 표현 못 한다. 누름 프레임 순환(`kbFrame`, 같은 파일 77행)은 `pressed`만 쓴다. ①은 누름 표시 결함을 만든다. ②는 계약 필드 이름·타입 변경(파괴)인데 얻는 것이 없다. 조치는 설명 문구 정정뿐(§9.0-7). hook 코드·hook 설계 변경 없음(hook.md 미작성 상태 유지) |
| **D15** | 옛 `slam` 호환은 **serde 기본 동작(모르는 키 무시)만으로** — 마이그레이션 코드·`version` 필드 도입 없음 | `version` 올리고 명시 마이그레이션 | 삭제만 있는 변경이라 옮길 값이 없다. `pad`·`armWidth` 삭제(CR-017·2차)와 같은 방식. §8.3 C5가 `deny_unknown_fields` 추가 회귀를 막는다 |

### CR-017 이전 결정

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| D1 | 기본 `hand = None`, 이전 값은 주석으로만 | — | 🔒 사용자 지정(기존) |
| D2 | 기존 `hand` 값 마이그레이션 안 함 | — | 기존 결정 유지 |
| D3 | settings API 함수 변경 없음 | 전용 갱신 함수 | 최소 설계(기존) |
| D4 | 누락 필드는 필드 단위 기본값(`part_pos`·`area` 모두 `#[serde(default = "…")]`) | `MouseSettings` 컨테이너 `#[serde(default)]` | 컨테이너 기본값은 `shoulder` 누락 동작까지 바뀐다(범위 밖, 확인 필요 3) |
| D5 | `part_pos` 검증 없음 | 캔버스 안인지 검사 | settings는 캔버스 크기를 모른다(기존) |
| D6 | `arm_width`·`arm_color` 삭제, 주석 보존 안 함 | `hand`처럼 주석 보존 | 🔒 "폐기"(기존) |
| D7 | 필드 순서 `shoulder, area, part_pos, hand` | 끝에 추가 | `area`가 `pad` 자리를 잇는다. serde는 이름 기반이라 호환 영향 없음 |
| D8 | 기본 `area` = I1 실측 손 기준점 A (435.06, 575.27) 중심 120×100 직사각형 [(375,525), (495,525), (495,625), (375,625)](2026-09-23 정정) | ① 옛 값 유지 ② 가로 확대(≈170×100) ③ 360×200 | 어깨 S (620,530) → L0 ≈ 190.4, 닿는 거리 95.2 ~ 304.6. 네 꼭짓점 k = 1.287 / 0.657 / 0.825 / 1.380 → 영역 전체가 닿는다. ① 옛 값은 k = 0.376으로 하한 위반 → 기각. ② 범위 밖 → 확인 필요 6. ③ 팔 뒤집힘 → 기각 |
| D9 | `validate`는 네 점 유한수만 검사 | 볼록·순서·범위 검사 | 쌍선형 정방향 계산은 어떤 모양에서도 유한. 의미 해석은 settings 금지. 규칙이 늘면 `load_or_default`가 설정 전체를 초기화하는 대가가 크다 |
| D10 | 옛 `pad` → `area` 변환 없이 무시 | 변환 | 🔒 사용자 결정. 변환에 기준점(assets)이 필요 |
| D11 | `area: [Point; 4]`(🔒 이름·타입 고정) | `Vec<Point>` + 길이 검증 | 길이 4를 타입이 보장. 길이 ≠ 4는 `Format` → 파일 전체 기본값(기존 동작) |
| D12 | 공개 타입 `Rect` 삭제 | 남겨 둠 | 유일한 사용처가 `pad`. 요구 역추적 불가 항목은 두지 않는다(스킬 §10) |

### 파급 — CR-019 (Grep 2026-09-24)

| 파일·위치 | 변경 | 소관 | 컴파일 |
|---|---|---|---|
| `src-tauri/src/settings/mod.rs:5,9,11,29-36,94,120-123,164-166,227,276-277,463-469` | §3.4 삭제·`//!` 갱신, 테스트 C1~C5 | core-implementer | — |
| `src-tauri/src/window/placement.rs:561,567` | K4 테스트의 `slam` 두 줄 삭제 | core-implementer | **깨짐**(테스트) |
| `src-tauri/examples/import_sample.rs:70-72,76` | `let mut s = s; s.slam.duration_ms = 2000; s.slam.keys = 3;` 삭제(`let s` 그대로 저장), 출력 문구에서 `slam 3키·2000ms, ` 삭제 | core-implementer | **깨짐**(예제) |
| `src-tauri/examples/import_sample.rs:3,16` | 슬롯 파서의 `"slam"` 팔·문서주석 — [assets.md](assets.md) §11 CR-019 파급 | core-implementer | **깨짐** |
| `src-tauri/src/bridge/types.rs:10,17` | 재노출·문서주석에서 `SlamSettings` 삭제 | bridge-implementer | **깨짐** |
| `src-tauri/src/bridge/events.rs:27` | `held_count` 문서주석 "(쾅 판정용)" → §9.0-7 문구 | bridge-implementer | 없음(주석) |
| `doc/200_설계/bridge/contract.md` §3.3·§4·§5.1·변경 이력 | §9.0 | bridge-designer | — |
| `src/bridge/types.ts:60,101,180` | `SlamSettings`·`slam`·기본값 삭제 | bridge-implementer | TS 컴파일 오류로 사용처 드러남 |
| `src/state/inputMachine.ts`, `src/overlay/index.tsx:72,75`, `src/overlay/components/LayerStack.tsx:42`, 테스트(`src/state/inputMachine.test.ts`, `src/overlay/test/*`, `src/settings/test/*`) | 쾅 상태(`'slam'` 레이어·`slamUntil`·`config.slam`) 제거, `heldCount`는 `kbDown` 판정용으로 유지 | ui | 같음 |

- core만 먼저 넣으면 `bridge/types.rs` 재노출 때문에 `cargo check`가 깨진다 → **core·bridge Rust는 한 묶음**. TS·ui는 런타임 호환(§9.0-5)이라 순서 무관하나 `yarn tsc`를 위해 bridge TS·ui를 한 묶음으로.

### 파급 — CR-017 (Grep 2026-09-23, 적용 완료 — 기록)

| 파일·위치 | 변경 | 소관 |
|---|---|---|
| `src-tauri/src/settings/mod.rs` | §3.2, `Rect` 삭제, `validate`, `//!`, 테스트 U2~U12 | core-implementer |
| `src-tauri/examples/import_sample.rs` | `Rect` import 삭제, `area: settings::default_mouse().area` | core-implementer |
| `src-tauri/tests/mouse_area_defaults.rs` | §8.2 I1 | core-implementer |
| `src-tauri/src/bridge/types.rs:10` | 문서주석 표에서 `Rect` 삭제 | bridge-implementer |
| `doc/200_설계/bridge/contract.md` §3.3·§5.1 | §9.1 | bridge-designer |
| `src/bridge/types.ts`, `src/state/mouseMapping.ts`, `src/overlay/components/MouseArm.tsx`, 테스트 픽스처 | `area` 도입·`pad` 제거 | bridge-implementer · ui |

### 확인 필요 · 관찰

1. **`version: u32` 필드 없음**(스킬 §6 표준 강제 항목). CR-019도 serde 기본값으로 호환되어 불필요하지만 별건으로 사용자 판단(기존 기록 유지).
2. **검증 규칙 불일치**: 계약 §3.3 `idleSeconds ≥ 10` 대 코드 `≥ 1`(기존 기록 유지). ~~`slam.durationMs ≥ 50` 대 `≥ 1`~~ — **CR-019로 해소**(규칙 자체 삭제).
3. `MouseSettings`에 컨테이너 `#[serde(default)]`가 없어 `shoulder`가 빠진 파일은 전체가 기본값으로 대체된다(기존 기록).
4. **R-tmp-2·R-tmp-3 요구ID** 미부여 — settings·overlay 화면 요구 문서(ui-designer)에 위치 지정·이동 영역 요구 추가 필요.
5. 해소(2026-09-23) — 기본 영역 기준점 실측 정정(§11 D8).
6. (관찰) 실측 L0 ≈ 190.4 → 세로 100 유지 시 가로 ≈170까지 영역 전체가 닿는다. 영역 확대는 사용자 판단 사항.
7. **(CR-019) 요구 문서 폐기 표기**: `src/settings/requirements.md` ST-R-05, `src/overlay/requirements.md` OV-R-06(쾅)과 OV-R-02 슬롯 목록의 키연타가 폐기 전 문구일 수 있다 — ui-designer 소관. 이 문서는 확정사항 §4·§5·§6(🔒 2026-09-24)을 근거로 했다.
8. **(CR-019) 스킬 문서 옛 기본값**: `.claude/skills/core-design-strategy/SKILL.md` §6이 파일명 `state_slam.png`와 기본값 "쾅 기준 동시 6키, 쾅 표시 300ms"를 아직 적고 있다 — 스킬 소유자(메인 세션) 갱신 필요. 확정사항이 이긴다.
9. **확인 필요 13 (CR-038, 🔒 사용자 결정 — 「현재 사용값을 기본값으로」)**: `default_mouse().shoulder`가 (620,530)→(558,500)으로 바뀌면서 기존 `default_area()`(§3.2 D8, 미변경)의 오른쪽 위 꼭짓점 늘어나기 배율 k 가 약 0.464로 하한 0.5(확정사항 §3)를 벗어난다. area 좌표는 사용자가 실제로 쓰는 값이라 CR-038 범위에서 바꾸지 않았고, 이 하한 이탈은 사용자가 이미 보고 쓰는 동작으로 허용했다(`tests/mouse_area_defaults.rs` 실측 리터럴로 고정). area 재조정 여부는 별도 판단 사항.
10. **확인 필요 14 (CR-044, 🔒 사용자 확정, 2026-09-26, 구현 참고)**: 배포용 기본 세트 2차 교체로 `default_mouse()`의 `shoulder`(582,484)·`part_pos`(411,464)·`pen_pos`(372,476)가 바뀌었다(`area`는 CR-038과 마찬가지로 그대로). 새 값 기준 재측정 결과 이번엔 **왼쪽 아래** 꼭짓점의 k 가 약 1.777로 상한 1.6을 넘는다(CR-038 때는 오른쪽 위가 하한 밖이었다). 같은 방침으로 이 이탈도 허용했다(`tests/mouse_area_defaults.rs` 실측 리터럴 갱신).
