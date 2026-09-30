# assets 모듈 설계

- 상태: 확정(사용자) — §3.14(CR-047)는 초안(범위는 사용자 확정, 설계 세부는 위임 범위 안에서 작성) · §3.15(CR-048)는 인계 패킷 기준 확정 · §3.16(CR-053)은 사용자 지정 확정 · §3.18(presets 가시성)은 인계 패킷 기준 초안 · 최종 갱신 2026-09-30(presets)
- 변경이력:
  - 2026-09-30 (17차, PS-11 내장 프리셋 — [presets.md](presets.md) §3.10) **assets 변경 없음.** `DEFAULT_ASSETS` 바이트를 builtin 프리셋 ①「세바시에-기본」(6장 전부)과 ②「게님드림」(`background.png`)이 재사용한다(`presets::builtin`이 `&'static [u8]`을 빌림 — exe 중복 내장 없음). 기본 세트 4차(6장)·`DATA_GENERATION` 5 불변. 기본 세트를 바꾸면 presets 단위 테스트 `builtin_bytes_match_source_folder`가 깨진다(presets.md §11.4 C-8).
  - 2026-09-30 (16차, presets — 🔒 확정사항 §6 「프리셋」 PS-01~PS-10, 새 모듈 문서 [presets.md](presets.md), 패킷 `doc/200_설계/architecture/presets-03-packet-core.md` §6) **가시성만 4곳 확대, 동작 불변**: `stored_file_name`·`read_capped` → `pub(crate)`, `AssetManifest::recompute_canvas` → `pub(crate)`, `versioned_asset_url` 재노출(`mod.rs` `pub(crate) use url::versioned_asset_url;` + `url.rs:24` `pub(super)` → `pub(crate)`). 사용처는 새 모듈 `presets`(검증기·적용). 공개 API·시그니처·에러 변형·code·규격 규칙 불변. 증분 **§3.18**. **소스 미적용.**
  - 2026-09-30 (doc-sync — **설계 변경 아님, 소스가 정본**, 커밋 2be41ce 기준) ① §1 DA-01·DA-02와 §10 DA-01 행의 「현재 7장(CR-053)」을 **현재 6장**(0.4.0, 데이터 세대 5, hair 제외 — `defaults.rs:3·56-57`, 시딩 순서 kb_up → background → pomo_char → mouse_base → pen_up → pen_down_0)으로 고쳤다. §3.16.1~§3.16.3의 7장 표는 §3.16.0 머리말대로 CR-053 당시 기록으로 둔다. ② §3.12 `SimpleSlot::Hair` 조각의 겹침 순서를 현재 ui 순서(CR-051: 헤어 → 배경 → 뽀모도(인물 → 말풍선 → 시간 글자) → 팔 → 본체 → 펜 손, overlay `design/functions.md` HairLayer 행·`OverlayApp.hair.test.tsx` TC-241)로 고쳤다. 겹침 순서는 여전히 ui 몫이다(D36·D39 불변). ③ §10 표의 「✅ 설계 · 소스 미적용」을 「소스 반영」으로 바꿨다. 근거는 2026-09-29 행 ③의 확인과 `assets/{sound,manifest_load,defaults,anchor,slot}.rs`가 있다는 점이다. §3.14 추적 줄도 같이 바꿨다(SEC-002·SEC-003·CORE-002 확인). **코드 주석 정정 필요(수정 안 함)**: `slot.rs:30`의 겹침 순서가 CR-037 옛 순서다. `slot.rs:16-17`·`:33`은 `pomo_char`를 「내장 기본 없음(DEFAULT_ASSETS 비포함)」이라고 적었지만 실제로는 `DEFAULT_ASSETS`에 들어 있다(`defaults.rs:8`).
  - 2026-09-29 (15차, 소스 동기화 — **설계 변경 아님, 소스가 정본**: 0.4.0 + 2026-09-29 보강, 근거 `doc/300_검증/verify-20260929-1928.md`) ① **0.4.0 내장 기본 6장**(🔒 사용자 확정 배포 세트, hair 제외): `DEFAULT_ASSETS: [DefaultAsset; 6]` = kb_up → background → pomo_char → mouse_base → pen_up → pen_down_0(`defaults.rs:55-70`). 크기 캔버스 3장 900×700, `mouse_base` 168×151, `pen_up`·`pen_down_0` 119×196(`tests/default_assets.rs` D2 단언). `has_default(hair)`는 다시 거짓, `pomo_char` 참, `kb_down_0` 거짓. 현재 표는 **§3.16.0**, §3.16.1~§3.16.3의 7장·143×189·168×150·hair 뒤집기 테스트와 §1 DA-01 「현재 7장」은 옛 기록. 데이터 세대 5([data_reset.md](data_reset.md)). ② **SEC-205**: `load_manifest`가 `crate::settings::read_capped_string(&path, crate::settings::MAX_TEXT_FILE_BYTES)`(1MiB)로 읽는다 — 길이를 먼저 보고 상한을 넘으면 파싱 전에 `AssetError::Io`(`asset.io`)로 실패, 호출자는 기존 오류 경로 그대로. 공개 시그니처·에러 변형·code 불변. 테스트 `assets/mod.rs` `#[cfg(test)]`(1MiB 초과 manifest.json 거부). ③ **SEC-201 로그 최소화**: 로그에 절대 경로·원본 값을 남기지 않는다 — `sound.rs remove_other_formats` 삭제 실패 경고는 `file={파일 이름}, kind={ErrorKind}`만, `manifest_load.rs parse_entry` 형식 오류 경고는 serde 오류 메시지를 빼고 `slot=` 문자열만(SEC-002의 `fileName` 미기록과 같은 원칙). 동작·API 불변. ④ **표기 정리**: 1~14차 항목과 §10의 「소스 미적용」은 모두 소스에 반영됨(`assets/{mod,slot,url,anchor,defaults,export,manifest_load,sound,security_tests,mouse_part_tests,pen_part_tests}.rs`). 단 CR-053의 7장 표는 0.4.0에서 6장으로 다시 바뀌었다(①).
  - 2026-09-27 (14차, data-reset, 🔒 사용자 결정 R-A·R-B, 새 모듈 문서 [data_reset.md](data_reset.md)) **앱 시작 순서 변경**: AppPaths → `create_dir_all` → settings `load_or_default` → **`data_reset::run_startup`** → `seed_if_empty`(유지) → manifest 로드 …. 세대가 다르거나 없으면 `data_reset`이 assets 폴더의 화이트리스트 파일(`*.png`·`*.tmp`·`*.wav`·`*.mp3`·`*.ogg`·`manifest.json`)을 지우고 `seed_if_empty`로 7장을 다시 채운다. **assets 공개 API·시그니처·시딩 규칙 불변**(호출자만 늘어남). 증분 **§3.17**, §3.10.2 `lib.rs` 조각에 대체 표시, §4 갱신. **소스 미적용.**
  - 2026-09-27 (13차, CR-053 배포용 기본 세트 3차 — **CR-044 대체**, 🔒 사용자 지정, 확정사항 §6 CR-053 줄) **`DEFAULT_ASSETS` 6장 → 7장**: `kb_up`·`background`·`hair`·`pomo_char`·`mouse_base`·`pen_up`·`pen_down_0`(원본 `doc/assets/defaults/`, 옛 6장은 `doc/assets/defaults-v3/`). **`hair`·`pomo_char` 추가, `kb_down_0` 제거.** 크기(IHDR 실측): 캔버스 레이어 4장 900×700, `mouse_base` 168×150, `pen_up`·`pen_down_0` 143×189(7장 모두 8bit RGBA·≤1MB). 시딩 규칙(매니페스트가 비었을 때만 + 같은 이름 파일 없음)·`restore_default`·`export_defaults` 동작과 공개 API 시그니처 불변 — 표만 바뀐다(배열 길이 `N`만 7). 결과로 `has_default(hair|pomo_char)` 참(§3.12.2·§3.13.2의 「내장 기본 없음」 대체), `has_default(kb_down_0)` 거짓(`restore_default` → `NoDefault`), `pomo_bubble`은 여전히 없음. 증분 전체 **§3.16**, §1·§2·§10 갱신. 짝 문서 [settings.md](settings.md)(타이머 기본값 (142,458)·9°). **소스 미적용.**
  - 2026-09-26 (CR-048 타이머 모드 — 알림음 저장소, 🔒 사용자 결정 D-1~D-11 권고안 확정·아키텍트 결정 A-1, 정본 패킷 `doc/200_설계/architecture/timer-mode-03-packet-core.md` §2.4, 근거 `timer-mode-02-design.md` §6.1·§6.2) **신규 자식 모듈 `assets/sound.rs`**(`AlarmFormat`·`AlarmSound`·`ALARM_MAX_BYTES`·`detect_format`·`alarm_file_name`·`current`·`import`·`remove`·`SoundError`+`code`). 저장 이름 `assets/alarm.{wav|mp3|ogg}` 고정, 형식은 매직 바이트로 판별(확장자·사용자 파일명 불사용 — CR-047 SEC-002 원칙), 1MiB 선검사·`read_capped` 재사용(SEC-003), `settings::write_atomic`(CORE-002). **`AssetSlot`·매니페스트·PNG 경로와 분리**(A-1). `assets/mod.rs`는 `pub mod sound;`와 `//!` 한 줄만. 증분 전체 **§3.15**, §10에 TM 행. **소스 미적용.**
  - 2026-09-26 (12차, CR-047 점검 후 정리, 🔒 확정사항 §6 「점검 후 정리」 줄, 근거 `.claude/reports/verify-20260926-1821.md` SEC-002·SEC-003·CORE-002) **① 저장 파일 경로는 항상 슬롯에서 다시 만든다**(비공개 `stored_file_name(slot) = "{file_key}.png"`) — `remove`·`compute_hand_anchor`의 `join(entry.file_name)` 교체, 매니페스트 로드(`manifest_load::parse_entry`)는 `fileName`이 정규 이름과 다르면 항목을 건너뛴다(두 겹). **② `import`는 `metadata` 크기 선검사 + `take(1MB + 1)` 상한 읽기**(비공개 `read_capped`). 1MB 초과 파일은 PNG 여부보다 `TooManyBytes`가 먼저. **③ `save_manifest`는 `settings::write_atomic`**(고정 임시 파일명·`remove_file` 삭제). 공개 시그니처·에러 변형·code·계약 모양 불변. 새 테스트 자식 파일 `security_tests.rs`. 증분 전체 **§3.14**. **소스 미적용.**
  - 2026-09-26 (11차, CR-045 뽀모도 타이머, 🔒 사용자 결정 U-1~U-8 권고안 채택 — 확정사항 §6 CR-045 「결정」 줄, 패킷 `doc/200_설계/architecture/pomodoro-03-packet-core.md` §1) **뽀모도 슬롯 2개 `SimpleSlot::PomoChar`(`"pomo_char"` → `assets/pomo_char.png`, 뽀모도 인물)·`SimpleSlot::PomoBubble`(`"pomo_bubble"` → `assets/pomo_bubble.png`, 뽀모도 말풍선) 추가.** hair(CR-037)와 똑같이 캔버스 레이어(`is_canvas_layer()` 본문 불변으로 참), 선택, 각 1장 고정, **내장 기본 없음**(`DEFAULT_ASSETS` 6장(CR-044) 불변 → `has_default` 거짓·시딩·내보내기 대상 아님, `restore_default`는 `NoDefault`). 검증·캔버스·매니페스트 로드·`defaults.rs`·`export.rs`·bridge Rust 코드 변경 없음. 겹침(배경 → 인물 → 말풍선 → 시간 글자 → 본체 덩어리)·고정 표시는 ui 몫. 증분 전체 **§3.13**(§8·§9·§10·§11 증분 포함). §1·§2에 행 추가. 짝 문서 [timer.md](timer.md)·[settings.md](settings.md) §3.8. **소스 미적용.**
  - 2026-09-25 (10차, CR-037, 🔒 사용자 결정, 확정사항 §6 「헤어(뒷머리) 파츠」) **헤어 슬롯 `SimpleSlot::Hair`(직렬화·`file_key` `"hair"`, 저장 `assets/hair.png`) 추가.** 캔버스 레이어(배경·키보드와 같은 크기 규칙 — `is_canvas_layer()`가 본문 변경 없이 참), 선택, 1장 고정, **내장 기본 없음**(`DEFAULT_ASSETS` 15장 불변 → `has_default` 거짓·시딩·내보내기 대상 아님, `restore_default`는 `NoDefault`). 검증·캔버스·매니페스트 로드·`defaults.rs`·`export.rs` 코드 변경 없음. 겹침 순서(배경 → 헤어 → 팔·손 → 본체)는 ui 몫. 증분 전체 **§3.12**(슬롯 코드 §3.12.1, 호환 §3.12.2, import_sample §3.12.4, 테스트 §3.12.5 = §8 증분, bridge 요구 §3.12.6 = §9 증분, 결정·파급·확인 필요 §3.12.7 = §11 증분, 추적 §3.12.8 = §10 증분). §1·§2에 행 추가. 사용자 결정 완료로 바로 확정. **소스 미적용.**
  - 2026-09-25 (9차, CR-036, 🔒 사용자 결정, 확정사항 §6 「팔·손 파츠 크기 자유」) **팔 파츠(`mouse_base`·`mouse_left`·`mouse_right`)끼리, 손 파츠(`pen_up`·`pen_down_N`·`pen_key_*`)끼리 같은 크기 규칙 폐기.** 파츠는 상한(PNG 32bit RGBA·≤1MB·≤900×700)만 검사한다. 캔버스 레이어 같은 크기 규칙(`CanvasMismatch`)은 불변. `AssetError::{MousePartMismatch, PenPartMismatch}` **삭제**, 비공개 `mismatch_error` 삭제, `group_size`는 파츠에 `None`, `validate`는 캔버스 레이어일 때만 기준 크기 비교. 공개 함수 시그니처 불변. 증분 전체 **§3.11**, 테스트 **§8.11**, 추적 §10, 결정 §11 D31~D33. **이 문서의 파츠 「같은 크기」 서술(§1 ST-R-02·R-tmp-4 행, §2 `validate`·`import_bytes` 실패 조건의 두 변형, §3.5 5행 마우스 열·D18 줄, §3.8 결론·5행·`mismatch_error`·`group_size` 코드, §6 두 변형 행, §8.2 M1~M8 중 불일치 단언, §8.10 P3④·P5·P7, §9.3·§9.7의 파츠 문구, 2차·6차 이력)은 §3.11로 대체**한다 — 옛 결정 기록으로만 남는다. 사용자 결정 완료로 바로 확정. **소스 미적용.**
  - 2026-09-25 (8차, CR-035 default-assets, 🔒 사용자 결정 U-1~U-7·확정사항 §6 CR-035, 패킷 `doc/200_설계/architecture/default-assets-03-packet-core.md`) **내장 기본 이미지 세트 15장·첫 실행 시딩·기본값 복원·기본 이미지 내보내기.** 새 공개 하위 모듈 `assets::defaults`(`DefaultAsset`·`DEFAULT_ASSETS`(include_bytes!)·`default_bytes`·`has_default`·`SeedSkip`·`SeedOutcome`·`seed_if_empty`·`restore_default`)와 `assets::export`(`ExportReport`·`ExportFailure`·`export_defaults`), `mod.rs`에서 **`import_bytes` 추출**(`import` 시그니처·동작 불변), `AssetError::{NoDefault, ExportDir}`(`asset.no_default`·`asset.export_dir`), `lib.rs` setup 시딩 1줄(비공개 도우미 `seed_default_assets`). 새 의존성 없음. 전체 증분은 **§3.10**, 에러는 §6, 추적은 §10. 같은 패스에서 core-survey Q11 불일치 5건 정정(변경이력 「소스 미적용」 → 적용 완료, §3 파일 표 줄 수·누락 행, §3.5 펜 열, §3.7 개수, §2 `validate` 실패 조건). 짝 문서 [settings.md](settings.md) CR-035 증분 §3.7(`penPos` 기본값 (380,496)). **소스 미적용.**
  - 2026-09-24 (7차, R-set-v2 SV2-07·08, 🔒 사용자 결정 D-1~D-10·확정사항 §6 「설정 창 개편」) **`import`의 `AssetEntry.url`에 `?v={저장 파일 수정 시각 ms}` 추가**(같은 슬롯 교체 시 url이 바뀜 — WebView 캐시 결함). url 코드는 자식 파일 `assets/url.rs`로 이동(`asset_url` 공개 시그니처 불변, 신규 비공개 `versioned_asset_url`·`with_version`). asset 프로토콜은 쿼리를 무시함을 정적 확인(tauri 2.11.6 `protocol/asset.rs:35` `uri().path()`), 실행 실측 A-M1 대기. **필수 규칙 = 3장(`kb_up`·`kb_down_0`·`mouse_base`), `idle`·`rest` 선택** — core 로직 변경 없음, 문서주석(`mod.rs:21-23`, `slot.rs:8`)만. 이 문서의 「필수 4장」 서술은 모두 SV2-08로 대체(옛 기록으로 유지). 증분 전체는 **§3.9**. 사용자 결정 완료로 바로 확정. **소스 적용 완료**(2026-09-24 core-survey Q11-1 확인).
  - 2026-09-24 (6차, CR-024, 🔒 사용자 결정, 확정사항 §3 「펜 쥔 손 파츠」) **펜 쥔 손 파츠 그룹 신설** — 단순 슬롯 8개 `SimpleSlot::{PenUp, PenKeySpace, PenKeyZ, PenKeyQuestion, PenKeyExclamation, PenKeyEnter, PenKeyBackspace, PenKeyUndo}`(`pen_up`·`pen_key_*`) + 순번 슬롯 `AssetSlot::PenDown { kind: PenDownKind, index }`(`{"kind":"pen_down","index":N}`, 파일 키 `pen_down_{n}`, **새 단일 변형 enum `PenDownKind`** — `KbDownKind` 재사용 안 함, §11 D28). 규격 = 마우스 파츠와 같은 ≤900×700·≤1MB, **펜 그림끼리 같은 크기**(마우스 파츠·캔버스와 무관), `is_canvas_layer() == false`. 분류 `is_pen_part()` 신설, `is_canvas_layer = !is_mouse_part && !is_pen_part`, `group_size`·`validate` 그룹 분기 확장, 에러 `PenPartMismatch` 신설(`code()` 기존 `asset.canvas_mismatch`). 손 기준점(`compute_hand_anchor`)은 **펜 그림을 읽지 않는다**(불변). §1·§2·§3.8(신규)·§6·§8.10(신규)·§9.7(신규)·§10·§11 갱신. 짝 문서 [settings.md](settings.md) 6차(`mouse.penPos`). 사용자 결정 완료로 바로 확정. **소스 적용 완료**(2026-09-24 core-survey Q11-1 확인).
  - 2026-09-24 (5차, CR-021 보강, 🔒 사용자 결정) **되돌리기(Ctrl+Z) 슬롯 `SimpleSlot::KeyUndo`(`key_undo`) 추가 → 특수 키 슬롯 7개.** 캔버스 레이어·선택(4차 6개와 같은 규칙). 짝 분류 `SpecialKey::Undo`([hook.md](hook.md) 2차 — Ctrl이 눌려 있으면 Z만 `Undo`로 분류, 나머지 분류 안 함). §1·§2·§3.7·§8.9·§9.6·§10 갱신. **§3 `slot.rs` 행("변형 6개·6팔")과 §11 D24~D27·CR-021 파급 표의 "6개"는 7개로 읽는다**(규칙·결정 근거 동일, 문구만 미갱신). **소스 적용 완료**(2026-09-24 core-survey Q11-1 확인).
  - 2026-09-24 (4차, CR-021, 🔒 사용자 결정, 확정사항 §5 「특수 키 이미지」) **특수 키 이미지 슬롯 6개 추가** — `SimpleSlot::{KeySpace, KeyZ, KeyQuestion, KeyExclamation, KeyEnter, KeyBackspace}`, 파일 키 `key_space`·`key_z`·`key_question`·`key_exclamation`·`key_enter`·`key_backspace`. 모두 **캔버스 레이어**(규격 §3 그대로: ≤900×700·≤1MB·캔버스 일치), **선택**(core는 필수 판정 안 함 — 불변). 검증·캔버스 규칙·함수 시그니처 변경 없음. `mod.rs`가 800줄 한계 직전(783줄)이라 **슬롯 정의를 새 파일 `slot.rs`로 옮기고**(`pub use`로 경로 불변) 그 파일에 6개를 더한다. §1·§2·§3·§3.7(신규)·§8.9(신규)·§9.6(신규)·§10·§11 갱신. 짝 문서 [hook.md](hook.md)(`SpecialKey` 분류). 사용자 결정 완료로 바로 확정. **소스 적용 완료**(2026-09-24 core-survey Q11-1 확인).
  - 2026-09-24 (3차, CR-019, 🔒 사용자 결정, 확정사항 §4·§5·§6) **쾅(키연타) 폐기 → `SimpleSlot::Slam` 삭제.** 필수 이미지 4장(`kb_up`, `kb_down_0`+, `idle`, `rest`) — 필수 판정은 ui(core는 필수 슬롯을 검사하지 않음, 불변). **옛 manifest.json에 `"slot": "slam"` 항목이 있어도 매니페스트 전체를 읽는다**: 항목 단위로 해석해 해석되지 않는 항목은 건너뛰고(경고 로그), 건너뛴 항목이 있으면 캔버스를 다시 계산한다(신규 비공개 파일 `manifest_load.rs`). `slam.png` 파일은 **남겨 둔다**(§11 D21). §1·§2·§3·§3.6(신규)·§6·§8.8(신규)·§9.5(신규)·§10·§11 갱신. 사용자 결정 완료로 바로 확정.
  - 2026-09-23 (2차, 🔒 사용자 결정, 확정사항 §3·§4) **마우스 파츠 단일 모드 재정의**: 손바닥 모드·256 규칙·`is_mouse_layer_mode`·`MOUSE_PART_MAX_SIZE` 폐기. 마우스 파츠 = ≤900×700·≤1MB·**셋이 서로 같은 크기**(캔버스 일치 강제 없음, 캔버스를 정하지 않음). `compute_hand_anchor`에 `part_pos` 인자 추가 → **캔버스 좌표** 반환. `AssetError::MousePartMismatch` 신설(`code()`는 기존 `asset.canvas_mismatch`). 사용자 결정 완료로 바로 확정.
  - 2026-09-23 확정 전환(직전 초안: CR-007 반영 · 배경 슬롯 반영). 요구ID R-tmp-1 → OV-R-17, OV-R-10 → OV-R-14, `CanvasMismatch` 문구 확정(계약 v0.7 §6).
- 요구ID 표기: `OV-R-xx` = `src/overlay/requirements.md`, `ST-R-xx` = `src/settings/requirements.md`. `doc/100_요구조건/`에는 아직 R-xx 목록이 없다. `CR-019` = 쾅 폐기 변경 요청(확정사항 §4·§5·§6 🔒 2026-09-24).
- 상대 문서: [settings.md](settings.md)(`Point`, `mouse.shoulder`·`mouse.partPos`·`hand`, CR-019 `slam` 설정 삭제) · [window.md](window.md) · 계약 `doc/200_설계/bridge/contract.md`

## 1. 목적

결론: assets는 사용자 PNG를 검증·보관하고, `mouse_base`의 **손 기준점(끝부분 무게중심)을 캔버스 좌표로** 계산해 돌려준다. CR-019로 **키연타(`slam`) 슬롯이 사라지고, 그 슬롯이 남아 있는 옛 매니페스트도 나머지 항목을 모두 읽는다.** CR-021로 **특수 키 이미지 슬롯 7개(`key_*` — 6종 + Ctrl+Z 되돌리기, 캔버스 레이어·선택)가 생긴다.**

비유(CR-019): 보관함 목록표에서 "쾅" 칸을 없앴다. 예전 목록표에 "쾅" 줄이 적혀 있으면, 그 줄만 연필로 건너뛰고 나머지 줄은 그대로 읽는다. 그 줄이 가리키던 그림 파일은 서랍에 그대로 두고(버리지 않음), 목록표를 다음에 새로 쓸 때 그 줄이 빠진다.

비유(마우스 파츠): 마우스 파츠는 "종이 인형의 손"이다. 작은 종이에 손만 오려 그리고(작은 PNG), 큰 도화지(캔버스)의 정해진 자리(`part_pos`)에 핀으로 꽂는다. 기준점을 찾을 때는 종이 안에서 손끝을 찾은 뒤, 핀 위치만큼 옮겨 도화지 좌표로 알려 준다.

| 요구ID | 내용 | 이 모듈의 몫 |
|---|---|---|
| ST-R-02 | 이미지 등록: PNG 32bit RGBA만, 캔버스 레이어 ≤900×700·≤1MB·같은 크기, 마우스 파츠 ≤900×700·≤1MB·셋이 같은 크기(🔒 2026-09-23 재정의) | 검증 5단계·저장·매니페스트 |
| OV-R-02 | 레이어 모델 슬롯(배경·몸통·상태·키보드·마우스). **일반 상태 = 대기·쉬는중 2종(키연타 폐기, CR-019)** | `AssetSlot`(**`Slam` 삭제**) |
| **CR-019 (🔒 2026-09-24, 확정사항 §4·§5·§6)** | 쾅 메커니즘 폐기 — 상태·설정·이미지 슬롯 모두 삭제. 필수 이미지 4장(`kb_up`, `kb_down_0`+, `idle`, `rest`) | `SimpleSlot::Slam` 삭제(§2), 옛 매니페스트 관대한 로드(§3.6). 필수 4장 판정은 ui(core 불변) |
| OV-R-08 (🔒 2026-09-23 재정의 — 요구 문서 문구 갱신 전, §11 확인 필요 1) | 마우스 파츠 단일 모드: 작은 그림 + 위치 (x, y), 어깨 축 회전. 손바닥 모드·팔 곡선 폐기 | 모드 판별 삭제, 마우스 파츠 그룹 크기 규칙(§3.5) |
| OV-R-14 (CR-007) | 회전 기준점 자동(끝부분 무게중심). 클릭 이미지도 같은 기준점. 폴백 `mouse.hand` → 영역 중심. 기준점 = 그림 좌표 + 위치 (x, y) → 캔버스 좌표 | `compute_hand_anchor(.., shoulder, part_pos)`. 폴백은 ui 몫 |
| R-tmp-2 (확인 필요 — 확정사항 §3 「위치 지정」, 요구ID 미부여) | 마우스 파츠 위치 (x, y) 설정·저장 | 인자 `part_pos`로만 받는다(저장은 settings, [settings.md](settings.md)) |
| OV-R-17 | 배경: 선택 1장, 전체 캔버스, 맨 아래, 무반응, 비면 투명 | `SimpleSlot::Background`(캔버스 레이어, §3.4) |
| **OV-R-22 (CR-021, 🔒 2026-09-24)** | 특수 키 6종(스페이스 / ㅋ·z·Z / ? / ! / Enter / Backspace) 전용 그림 — 선택, 캔버스 전체 크기, 규격 §3 그대로. 없으면 ui가 `kb_down`을 쓴다 | `SimpleSlot::Key*` 6개(캔버스 레이어, §3.7). 키 분류는 hook([hook.md](hook.md)), 그림 선택은 ui |
| **OV-R-22 보강 (🔒 2026-09-24, 5차)** | Ctrl + Z(되돌리기) 전용 그림 — 선택, 규격 같음 | `SimpleSlot::KeyUndo`(캔버스 레이어, §3.7) |
| **R-tmp-4 (CR-024, 🔒 2026-09-24, 확정사항 §3 「펜 쥔 손 파츠」 — 요구ID 미부여, 확인 필요 8)** | 팔 파츠와 별개의 작은 펜 쥔 손 이미지(선택). 평소 `pen_up`, 키 누름 `pen_down_0…`(순환), 특수 키 `pen_key_{special}`(없으면 `pen_down`). 펜 그림끼리 같은 크기. 위치는 설정(`mouse.penPos`) | 슬롯 8 + 순번 슬롯(§3.8), 펜 그룹 크기 규칙·`PenPartMismatch`(§3.8·§6). 그림 선택·손 위치 변환은 ui, 위치 저장은 settings |
| **CR-037 (🔒 2026-09-25, 확정사항 §6 「헤어(뒷머리) 파츠」 — 요구ID 미부여, 확인 필요 C37-1)** | 장발 뒷머리만 따로 그린 1장. 캔버스 레이어(배경·키보드와 같은 크기, 위치 조정 없음), 1장 고정, 선택, 내장 기본 없음(「기본값」=비우기). 겹침 배경 → 헤어 → 팔·손 → 본체 | `SimpleSlot::Hair`(캔버스 레이어, §3.12). 기본 없음은 `DEFAULT_ASSETS` 불변으로 성립. 겹침·젤리·부르르는 ui |
| **PT-01 (CR-045, 🔒 2026-09-26, 확정사항 §6 「뽀모도 타이머」 — 아키텍처 ID, 화면 ID는 ui-designer 확정 예정)** | 배경 그룹에 선택 슬롯 2개 — 뽀모도 인물(두 번째 캐릭터)·뽀모도 말풍선. 캔버스 레이어(배경과 같은 크기), 내장 기본 없음, 배경처럼 고정, 타이머 on/off와 무관하게 항상 보임 | `SimpleSlot::PomoChar`·`PomoBubble`(캔버스 레이어, §3.13). 기본 없음은 `DEFAULT_ASSETS` 불변으로 성립. 겹침·고정 표시·시간 글자는 ui, 타이머 상태는 [timer.md](timer.md) |

비유(CR-024): 팔 인형 옆에 "펜 쥔 손 카드" 서랍을 하나 더 만든다. 카드(평소·누름 여러 장·특수 키)는 서로 같은 크기이기만 하면 되고, 큰 도화지(캔버스)나 팔 카드(마우스 파츠)와 크기를 맞출 필요가 없다. 손끝 위치를 재는 자(손 기준점)는 여전히 팔 카드만 잰다 — 펜 손은 그 팔 끝에 붙어 따라다닐 뿐이다.

비유(CR-021): 키보드 파츠 서랍에 "특수 키 카드" 칸 일곱 개(6종 + 되돌리기)를 새로 만든다. 카드 규격은 다른 캔버스 필름과 똑같고, 칸이 비어 있어도 된다. 어떤 키가 눌렸는지 알아보는 일은 검사원(hook)이, 어느 카드를 꺼내 보일지는 무대(ui)가 한다 — 서랍(assets)은 카드를 규격대로 보관만 한다.

비유(CR-035): 빈 앨범만 주던 것을, 견본 사진 15장을 앨범 뒤표지 안쪽에 풀로 붙여(exe 내장) 파는 것으로 바꾼다. 앨범이 비어 있으면 처음 펼칠 때 견본을 끼워 두고, 칸마다 「견본으로 되돌리기」를 할 수 있고, 견본 원판을 사용자가 고른 서랍에 복사해 갈 수도 있다.

| 요구ID (CR-035, 🔒 2026-09-24, 02-design §6 횡단 ID) | 내용 | 이 모듈의 몫 |
|---|---|---|
| DA-01 | 기본 세트를 앱에 내장 — **현재 6장(0.4.0, 데이터 세대 5, §3.16.0)**: `kb_up`·`background`·`pomo_char`·`mouse_base`·`pen_up`·`pen_down_0`(`defaults.rs:56-57` `DEFAULT_ASSETS: [DefaultAsset; 6]`). 이력: 15장(CR-035) → 6장(CR-044) → 7장(CR-053, hair 포함) → 6장(0.4.0, hair 제외) | `assets::defaults::DEFAULT_ASSETS`(include_bytes!, 방식 §3.10.1, **현재 표 §3.16.0**) |
| DA-02 | 첫 실행(매니페스트 비어 있음 + 같은 이름 파일 없음)에 기본 세트(**현재 6장**, `DEFAULT_ASSETS` 순서대로) 시딩, 기존 데이터 덮어쓰기 금지 | `seed_if_empty`(§3.10.2) + `lib.rs` 호출 |
| DA-03 | 카드 「기본값」 = 내장 기본 그림으로 복원(검증 먼저, 실패 시 사용자 그림 보존) | `restore_default` = `import_bytes`(§3.10.3) |
| DA-04 | 기본 없는 칸은 기존 비우기 | `remove` 불변(core 변경 없음) |
| DA-05 | 기본 이미지 내보내기(폴더 선택 → 15장, 충돌 확인, 부분 실패 보고) | `assets::export::export_defaults`(§3.10.4) |
| DA-06 | 에러 코드 `asset.no_default`·`asset.export_dir` | `AssetError::{NoDefault, ExportDir}`(§6) |
| DA-07 | 기본 좌표 점검·주석 정정, `penPos` 기본값 (380,496) | [settings.md](settings.md) §3.7. assets는 손 기준점 실측만(§3.10.5 M1) |

## 2. 공개 API

**CR-035(§3.10): 기존 함수 시그니처 변경 없음. 새 공개 함수 `import_bytes`(mod.rs), 새 공개 하위 모듈 `defaults`·`export`(`pub mod`), `AssetError` 변형 2개 추가.** 변경은 굵게. 삭제는 ~~취소선~~. **CR-019: 함수 시그니처 변경 없음. 공개 enum `SimpleSlot`에서 변형 `Slam` 삭제, `load_manifest`의 실패 조건이 좁아짐(동작 완화).** **CR-021: 함수 시그니처 변경 없음. `SimpleSlot`에 변형 6개 추가. 슬롯 타입(`SimpleSlot`·`KbDownKind`·`AssetSlot`)의 정의 위치만 `slot.rs`로 옮기고 `mod.rs`가 `pub use slot::{AssetSlot, KbDownKind, SimpleSlot};`로 재노출 — 외부 경로 `crate::assets::SimpleSlot` 등 불변.**

**CR-024: 기존 함수 시그니처 변경 없음(`validate`는 실패 조건에 `PenPartMismatch` 추가, 4번째 인자 `group_size`의 "같은 그룹"에 펜 그림 그룹 추가 — §3.8. `load_manifest`·`import`·`remove`·`compute_hand_anchor` 동작 불변). 공개 enum `SimpleSlot`에 변형 8개, `AssetSlot`에 변형 `PenDown` 추가(untagged 해석 분기 +1), 새 공개 타입 `PenDownKind`, 새 공개 함수 `AssetSlot::pen_down`·`AssetSlot::is_pen_part`, `is_canvas_layer` 본문 변경(펜 제외), `AssetError`에 변형 `PenPartMismatch` 추가. `mod.rs` 재노출: `pub use slot::{AssetSlot, KbDownKind, PenDownKind, SimpleSlot};`.**

| 이름 | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `AssetSlot::kb_down(index: u32) -> AssetSlot` | 누름 프레임 번호 | 슬롯 | 없음 | OV-R-02 |
| **`pub fn pen_down(index: u32) -> AssetSlot`** (`impl AssetSlot`) | 펜 누름 프레임 번호 | `AssetSlot::PenDown { kind: PenDownKind::PenDown, index }` | 없음 | **R-tmp-4** |
| **`AssetSlot::PenDown { kind: PenDownKind, index: u32 }`** (🔒 파일 키) | — | 직렬화 **`{"kind":"pen_down","index":N}`** (kb_down과 같은 모양) | 없음 | **R-tmp-4** |
| **`pub enum PenDownKind { #[serde(rename = "pen_down")] PenDown }`** | — | `kind` 값을 정확히 `"pen_down"`으로 강제하는 단일 변형 enum(`KbDownKind`와 같은 구조, 같은 derive) | 없음 | **R-tmp-4** |
| **`SimpleSlot::{PenUp, PenKeySpace, PenKeyZ, PenKeyQuestion, PenKeyExclamation, PenKeyEnter, PenKeyBackspace, PenKeyUndo}`** (🔒 이름) | — | 직렬화 **`"pen_up"`·`"pen_key_space"`·`"pen_key_z"`·`"pen_key_question"`·`"pen_key_exclamation"`·`"pen_key_enter"`·`"pen_key_backspace"`·`"pen_key_undo"`** | 없음 | **R-tmp-4** |
| `SimpleSlot::Background` | — | 직렬화 `"background"` | 없음 | OV-R-17 |
| **`SimpleSlot::Hair`** (🔒 이름, CR-037) | — | 직렬화·`file_key()` **`"hair"`** → `assets/hair.png`. `is_canvas_layer() == true`(본문 불변), `is_mouse_part()`·`is_pen_part()` 거짓. `defaults::has_default(&Hair) == false`, `restore_default(.., Hair)` → `Err(NoDefault)`. 함수 시그니처 변경 없음 | 없음 | **CR-037** |
| **`SimpleSlot::{PomoChar, PomoBubble}`** (🔒 이름, CR-045) | — | 직렬화·`file_key()` **`"pomo_char"`·`"pomo_bubble"`** → `assets/pomo_char.png`·`assets/pomo_bubble.png`. `is_canvas_layer() == true`(본문 불변), `is_mouse_part()`·`is_pen_part()` 거짓. `defaults::has_default(..) == false`, `restore_default(.., PomoChar\|PomoBubble)` → `Err(NoDefault)`. 함수 시그니처 변경 없음 | 없음 | **PT-01** |
| ~~`SimpleSlot::Slam`~~ | — | ~~`"slam"`~~ | — | **삭제(CR-019)** |
| **`SimpleSlot::{KeySpace, KeyZ, KeyQuestion, KeyExclamation, KeyEnter, KeyBackspace, KeyUndo}`** (🔒 이름) | — | 직렬화 **`"key_space"`·`"key_z"`·`"key_question"`·`"key_exclamation"`·`"key_enter"`·`"key_backspace"`·`"key_undo"`** | 없음 | **OV-R-22**(`KeyUndo`는 5차 보강) |
| — | — | **CR-024 후** 변형 전체(선언 순서): `Background, Body, Idle, Rest, KbUp, KeySpace, KeyZ, KeyQuestion, KeyExclamation, KeyEnter, KeyBackspace, KeyUndo, MouseBase, MouseLeft, MouseRight, PenUp, PenKeySpace, PenKeyZ, PenKeyQuestion, PenKeyExclamation, PenKeyEnter, PenKeyBackspace, PenKeyUndo` | — | — |
| `AssetSlot::file_key(&self) -> String` | — | `"background"`, `"body"`, `"kb_down_0"` … (**`"slam"` 팔 삭제**, **`"key_space"`…`"key_undo"` 7팔 추가**, **CR-024: `"pen_up"`·`"pen_key_*"` 8팔 + `PenDown { index, .. } => format!("pen_down_{index}")`**) | 없음 | OV-R-02, **OV-R-22**, **R-tmp-4** |
| `AssetSlot::is_mouse_part(&self) -> bool` | — | 마우스 파츠 3개만 참(본문 불변 — 펜 그림은 거짓) | 없음 | OV-R-02, OV-R-08 |
| **`pub fn is_pen_part(&self) -> bool`** (`impl AssetSlot`) | — | `PenUp`·`PenKey*` 7개·`PenDown { .. }`이면 참 | 없음 | **R-tmp-4** |
| `AssetSlot::is_canvas_layer(&self) -> bool` | — | **본문 변경: `!self.is_mouse_part() && !self.is_pen_part()`**. 마우스 파츠·펜 그림은 캔버스를 정하지 않는다 | 없음 | OV-R-02, OV-R-08, **R-tmp-4** |
| `AssetManifest::find(&self, slot: &AssetSlot) -> Option<&AssetEntry>` | 슬롯 | 항목 | 없음 | ST-R-02 |
| `pub fn parse_png_header(bytes: &[u8]) -> Result<PngInfo, AssetError>` | 파일 바이트 | 폭·높이·깊이·색상 타입 | `NotPng`, `BadHeader` | ST-R-02 |
| `pub fn validate(info: &PngInfo, bytes: u64, slot: &AssetSlot, group_size: Option<CanvasSize>) -> Result<(), AssetError>` | 헤더·용량·슬롯·같은 그룹 기준 크기 | () | `NotRgba`, `TooManyBytes`, `TooLarge`, `CanvasMismatch`(캔버스 레이어), `MousePartMismatch`(마우스 파츠), `PenPartMismatch`(펜 그림, CR-024 — core-survey Q11-4 정정) | ST-R-02, OV-R-08, R-tmp-4 |
| **`pub fn import_bytes(assets_dir: &Path, slot: AssetSlot, bytes: &[u8]) -> Result<AssetManifest, AssetError>`** (CR-035 추출) | 폴더·슬롯·PNG 바이트 | 갱신된 매니페스트 | `import`와 같음: 검증 실패 전부(`NotPng`·`BadHeader`·`NotRgba`·`TooManyBytes`·`TooLarge`·`CanvasMismatch`·`MousePartMismatch`·`PenPartMismatch`), `Io`, `Manifest` | ST-R-02, DA-02, DA-03 |
| (`import` — 시그니처 불변) | — | 본문 = `fs::read(src)?` → `import_bytes(assets_dir, slot, &bytes)` | 불변 | ST-R-02 |
| **`pub struct DefaultAsset { pub slot: AssetSlot, pub bytes: &'static [u8] }`** (`assets::defaults`, `#[derive(Debug, Clone, Copy)]`) | — | 내장 1장(바이트 = exe 정적 영역) | — | DA-01 |
| **`pub static DEFAULT_ASSETS: [DefaultAsset; 7]`** (`assets::defaults`) | — | 순서 고정 표(**§3.16.1**, CR-053 — 길이 이력 15 → 6 → 7) | — | DA-01, **CR-053** |
| **`pub fn default_bytes(slot: &AssetSlot) -> Option<&'static [u8]>`** (`assets::defaults`) | 슬롯 | 내장 바이트 / `None`. `file_key` 기준 비교(순번 슬롯은 **`pen_down_0`만** 있음 — CR-053에서 `kb_down_0` 제외) | 없음 | DA-01, DA-03, **CR-053** |
| **`pub fn has_default(slot: &AssetSlot) -> bool`** (`assets::defaults`) | 슬롯 | `default_bytes(slot).is_some()` | 없음 | DA-01 |
| **`pub enum SeedSkip { NotEmpty, ManifestUnreadable, FilesPresent }`** (`assets::defaults`, `#[derive(Debug, Clone, Copy, PartialEq, Eq)]`) | — | 시딩 건너뜀 사유 | — | DA-02 |
| **`pub enum SeedOutcome { Seeded { count: usize, failed: Vec<(String, &'static str)> }, Skipped(SeedSkip) }`** (`assets::defaults`, `#[derive(Debug, Clone, PartialEq, Eq)]`) | — | `failed` = (file_key, `AssetError::code()`) | — | DA-02 |
| **`pub fn seed_if_empty(assets_dir: &Path) -> SeedOutcome`** (`assets::defaults`) | 에셋 폴더 | 결과(§3.10.2) | **Err 없음**(앱 시작을 막지 않음 — 장별 실패는 `failed`) | DA-02 |
| **`pub fn restore_default(assets_dir: &Path, slot: AssetSlot) -> Result<AssetManifest, AssetError>`** (`assets::defaults`) | 폴더·슬롯 | 갱신된 매니페스트 | `NoDefault`(내장 기본 없는 슬롯), `import_bytes` 실패 전부(실사용은 `CanvasMismatch`·`Io`·`Manifest`) | DA-03 |
| **`pub struct ExportFailure { pub file_name: String, pub code: &'static str }`** (`assets::export`, `#[derive(Serialize, Debug, Clone, PartialEq, Eq)]`, `#[serde(rename_all = "camelCase")]`) | — | JSON `{ fileName, code }` | — | DA-05 |
| **`pub struct ExportReport { pub written: Vec<String>, pub conflicts: Vec<String>, pub failed: Vec<ExportFailure> }`** (`assets::export`, 위 derive + `Default`, camelCase) | — | 모두 파일명(`kb_up.png` 등), 경로 없음 | — | DA-05 |
| **`pub fn export_defaults(dest_dir: &Path, overwrite: bool) -> Result<ExportReport, AssetError>`** (`assets::export`) | 대상 폴더·덮어쓰기 여부 | 보고(§3.10.4) | `ExportDir`(절대 경로 아님·없음·폴더 아님). 파일별 실패는 Err 아님 → `failed` | DA-05 |
| (기존 공개 항목 — 불변, core-survey Q11-6 보완) `pub struct CanvasSize`·`AssetEntry`·`AssetManifest`·`PngInfo`, `pub fn AssetError::code(&self) -> &'static str`, `pub const CANVAS_MAX_WIDTH: u32 = 900`·`CANVAS_MAX_HEIGHT: u32 = 700`·`ASSET_MAX_BYTES: u64 = 1024 * 1024`·`MANIFEST_FILE: &str = "manifest.json"` | — | — | — | ST-R-02 |
| **`pub fn load_manifest(assets_dir: &Path) -> Result<AssetManifest, AssetError>`** | 에셋 폴더 | 매니페스트(없으면 기본). **해석되지 않는 항목(알 수 없는 슬롯 `"slam"` 등)은 건너뛴 결과. 건너뛴 항목이 있으면 `canvas`를 남은 항목으로 다시 계산** | `Io`, **`Manifest`(최상위 구조 손상만 — JSON 문법 오류, `canvas`·`entries` 모양 오류)** | ST-R-02, CR-019 |
| `pub fn save_manifest(assets_dir: &Path, manifest: &AssetManifest) -> Result<(), AssetError>` | 폴더·매니페스트 | () | `Io`, `Manifest` | ST-R-02 |
| `pub fn import(assets_dir: &Path, slot: AssetSlot, src: &Path) -> Result<AssetManifest, AssetError>` | 폴더·슬롯·원본 경로 | 갱신된 매니페스트(**옛 `slam` 항목이 있었다면 저장 시 빠짐**) | 검증 실패 전부, `Io`, `Manifest` | ST-R-02 |
| `pub fn remove(assets_dir: &Path, slot: AssetSlot) -> Result<AssetManifest, AssetError>` | 폴더·슬롯 | 갱신된 매니페스트(같음) | `NotFound`, `Io`, `Manifest` | ST-R-02 |
| `pub fn asset_url(path: &Path) -> String` | 저장 파일 경로 | asset 프로토콜 URL | 없음 | ST-R-02 |
| `pub fn compute_hand_anchor(assets_dir: &Path, manifest: &AssetManifest, shoulder: Point, part_pos: Point) -> Result<Option<Point>, AssetError>` | 에셋 폴더, 매니페스트, 어깨 고정점(캔버스 좌표), 파츠 위치(그림 왼쪽 위 모서리의 캔버스 좌표) — 둘 다 `crate::settings::Point` | 손 기준점(캔버스 좌표 = 그림 좌표 + `part_pos`, 소수 2자리) 또는 `None` | `Io`, `Decode` | OV-R-14, R-tmp-2 |
| ~~`pub const MOUSE_PART_MAX_SIZE: u32 = 256`~~ | — | — | — | 삭제(2차) |
| ~~`pub(crate) fn is_mouse_layer_mode(width, height) -> bool`~~ | — | — | — | 삭제(2차) |

`compute_hand_anchor`가 `Ok(None)`을 돌려주는 경우(오류 아님, ui가 폴백을 쓴다):

1. 매니페스트에 `mouse_base`가 없다.
2. 알파 > 0 픽셀이 하나도 없다(전부 투명).
3. `shoulder` 또는 `part_pos`의 x·y 중 하나라도 유한수가 아니다.
4. 해독 결과 RGBA 길이가 `width × height × 4`와 다르다(방어).

- 크기와 무관하게 `mouse_base`가 있으면 해독·계산한다. `mouse_left`·`mouse_right`는 계산하지 않는다(OV-R-14).
- 이벤트 발생 시점에만 부른다(§4, §9). 매 프레임 호출 금지.

## 3. 내부 구조

| 파일 | 책임 | 변경 |
|---|---|---|
| `src-tauri/src/assets/mod.rs` (CR-019 적용 후 **783줄**, 2026-09-24 실측) | 매니페스트·에러·PNG 헤더·검증·저장·URL (**CR-021: 슬롯 정의 제외 → `slot.rs`**) | **CR-021: 48~117행(`// ─── 슬롯 ───` 구획 전체 — `SimpleSlot`·`KbDownKind`·`AssetSlot`·`impl AssetSlot`)을 잘라 `slot.rs`로 옮기고 그 자리에 `mod slot;` + `pub use slot::{AssetSlot, KbDownKind, SimpleSlot};`. 이동은 글자 그대로(동작 변경 금지). `//!` [슬롯]에 특수 키 6종 한 줄, [테스트]에 "슬롯(slot.rs K1~K6)" 추가. 적용 후 약 716줄.** (이력) **CR-019: `SimpleSlot::Slam` 변형·`file_key`의 `"slam"` 팔 삭제(−2줄), `mod manifest_load;` 추가(+1줄), `load_manifest` 본문의 `Ok(serde_json::from_str(&text)?)` → `manifest_load::parse_manifest(&text)`, `//!` 갱신. 새 코드·테스트는 이 파일에 넣지 않는다(800줄 한계 — 적용 후 약 781줄)** |
| **`src-tauri/src/assets/manifest_load.rs` (신규, CR-019)** | manifest.json 텍스트 → `AssetManifest` 관대한 해석(항목 단위, 건너뜀·경고·캔버스 재계산) + 그 테스트(§8.8) | 비공개 모듈. 공개 항목 없음(`pub(super) fn parse_manifest`) |
| **`src-tauri/src/assets/slot.rs` (신규, CR-021)** | 슬롯 타입 정의(`SimpleSlot`·`KbDownKind`·`AssetSlot`)·`kb_down`·`file_key`·`is_mouse_part`·`is_canvas_layer` + 특수 키 슬롯 테스트(§8.9 K1~K6) | `mod.rs`에서 옮긴 코드 + 변형 6개·`file_key` 6팔. 공개 항목은 `mod.rs`의 `pub use`로만 밖에 보인다. 약 200줄(테스트 포함) |
| `src-tauri/src/assets/anchor.rs` | 손 기준점 계산(해독 → 끝부분 무게중심, 캔버스 좌표) | CR-019·CR-021 영향 없음 |
| `src-tauri/src/assets/mouse_part_tests.rs` (테스트 전용) | 마우스 파츠 검증·그룹 크기 테스트(§8.2 M1~M8) | CR-019 영향 없음 |
| `src-tauri/src/assets/pen_part_tests.rs` (테스트 전용, CR-024) | 펜 그룹 검증 테스트(§8.10 P3~P9) | CR-035 영향 없음 |
| `src-tauri/src/assets/url.rs` (SV2-07) | `asset_url`(재노출)·`versioned_asset_url`·`with_version` + V1~V5(§3.9) | CR-035 영향 없음(`import_bytes`가 그대로 호출) |
| **`src-tauri/src/assets/defaults.rs` (신규, CR-035, `pub mod`)** | 내장 표·`default_bytes`·`has_default`·시딩·복원(§3.10.1~3). 약 150줄, 테스트는 통합 파일 | 신규 |
| **`src-tauri/src/assets/export.rs` (신규, CR-035, `pub mod`)** | `ExportReport`·`ExportFailure`·`export_defaults`·비공개 `write_via_temp`(§3.10.4). 약 90줄 | 신규 |
| **`src-tauri/tests/default_assets.rs` (신규, CR-035)** | 통합 테스트 17종 + 실측 M1(§3.10.5) | 신규 |

**줄 수·표 정정 (core-survey Q11-2·3·5, 2026-09-24 실측).** 위 표의 `mod.rs` 「783줄」은 CR-021 이전 값이다. 현재 줄 수는 `mod.rs` 718, `slot.rs` 406, `anchor.rs` 587, `manifest_load.rs` 226, `url.rs` 114, `mouse_part_tests.rs` 209, `pen_part_tests.rs` 240이다. CR-035 적용 후 `mod.rs`는 약 745줄(800 한계 안 — `import_bytes` +8, 변형 2 +6, `pub mod` 2 +2, `//!` +6). §3.5 표는 펜 그룹 열이 없으므로 §3.8 「검증 — 그룹별」 표를 세 번째 열로 읽는다(1~4 같음, 5 기준 = 다른 펜 그림, 실패 `PenPartMismatch`). §3.7의 제목·결론 문장의 「6개」는 **7개**(`key_undo` 포함, `slot.rs:30-37`)다.

### 3.1 anchor.rs 비공개 함수

| 함수 | 시그니처 | 책임 |
|---|---|---|
| `tip_centroid` | `fn tip_centroid(rgba: &[u8], width: u32, height: u32, shoulder: Point, part_pos: Point) -> Option<Point>` | 순수 계산(§3.2). 픽셀 좌표를 `part_pos`만큼 옮긴 캔버스 좌표에서 거리·무게중심을 구한다 |
| `tip_threshold` | `fn tip_threshold(dist_sq: &mut [f64]) -> Option<f64>` | 상위 k번째 거리²(불변) |
| `round2` | `fn round2(v: f64) -> f64` | `(v * 100.0).round() / 100.0`(불변) |

상수(불변): `const TIP_DIVISOR: usize = 4;` — 끝부분 = 어깨에서 먼 상위 25%(CR-007, 사용자 확정).

### 3.2 알고리즘 — 끝부분 무게중심, 캔버스 좌표 (🔒 CR-007 + 2026-09-23 위치)

입력: RGBA8 행 우선 버퍼(`rgba[4·(y·w + x) + 3]` = 알파), 폭 `w`, 높이 `h`, 어깨 `(sx, sy)`, 파츠 위치 `(px, py)`.

1. 방어: `rgba.len() != w·h·4` 또는 `sx`·`sy`·`px`·`py` 중 비유한 → `None`.
2. 픽셀 중심의 캔버스 좌표: `cx = px + x + 0.5`, `cy = py + y + 0.5`. 이후 모든 계산은 이 값으로 한다.
3. 1차 순회: 알파 `a > 0`인 픽셀마다 `d² = (cx − sx)² + (cy − sy)²`를 `Vec<f64>`에 모은다. 개수 `n == 0` → `None`.
4. `k = ⌈n/4⌉`(≥ 1), 문턱 `t` = 거리² 내림차순 k번째(`tip_threshold`).
5. 2차 순회: 알파 > 0이고 `d² ≥ t`인 픽셀 전부(문턱 동점 전부 포함).
6. `Σa`, `Σa·cx`, `Σa·cy`(f64). 결과 `(round2(Σa·cx/Σa), round2(Σa·cy/Σa))` — 반올림은 오프셋을 더한 뒤 한 번만.

- 캔버스 전체 크기 그림은 `part_pos = (0, 0)`이라 이전 결과와 같다. 거리는 캔버스 좌표 기준이라 `part_pos` 변경은 재계산 트리거다(§9.1).
- 메모리: 거리²만 일시 보관(최대 900×700 × 8바이트 ≈ 5MB).

### 3.3 compute_hand_anchor 흐름

```
manifest.find(MouseBase) ─ 없음 → Ok(None)
  └ bytes = fs::read(assets_dir.join(&entry.file_name))?      (Io)
      └ img = tauri::image::Image::from_bytes(&bytes)?         (Decode)
          └ Ok(tip_centroid(img.rgba(), img.width(), img.height(), shoulder, part_pos))
```

- 해독: `tauri::image::Image::from_bytes`(tauri feature `image-png` 이미 켜짐). 새 의존성 없음.

### 3.4 배경 슬롯 `background` (🔒 2026-09-23, OV-R-17)

비유: 배경은 액자 뒤판이다. 앞의 그림이 어떻게 움직이든 뒤판은 그대로 있고, 뒤판도 액자와 같은 크기다.

| 항목 | 값 (🔒 이름 고정) |
|---|---|
| Rust | `SimpleSlot::Background` — `SimpleSlot`의 첫 변형 |
| 직렬화 | `"background"` |
| `file_key()` | `"background"` → `assets/background.png` |
| 분류 | `is_mouse_part() == false` → `is_canvas_layer() == true` |
| 필수 여부 | 선택. core는 필수 슬롯을 검사하지 않는다(필수 판정은 ui — CR-019 필수 4장도 같음) |

캔버스 규칙(`recompute_canvas`, `group_size`의 캔버스 레이어 분기 — 동작 불변):

1. 캔버스 = 매니페스트 `entries`에서 처음 나오는 캔버스 레이어의 크기. 마우스 파츠는 캔버스와 무관하다.
2. 배경과 몸통이 함께 있으면 둘은 이미 같은 크기다.
3. 배경이 유일한 캔버스 레이어일 때 다른 크기로 다시 등록하면 허용되고 캔버스가 바뀐다. 다른 캔버스 레이어가 있으면 `CanvasMismatch`.
4. 배경을 지워도 다른 캔버스 레이어가 남으면 캔버스는 그대로. 마지막이면 `canvas = None`.
5. 창 리사이즈([window.md](window.md)): 배경 등록·삭제도 리사이즈 대상.

### 3.5 검증 규칙 — 그룹별 (🔒 2026-09-23 재정의)

비유: 캔버스 레이어는 "같은 규격의 투명 필름 묶음", 마우스 파츠는 "같은 규격의 손 카드 세 장"이다. 두 묶음은 각자 안에서만 크기를 맞춘다.

| 순서 | 검사 | 캔버스 레이어(배경·몸통·상태·키보드) | 마우스 파츠(`mouse_base`·`mouse_left`·`mouse_right`) | 실패 |
|---|---|---|---|---|
| 1 | PNG 시그니처(`parse_png_header`) | 같음 | 같음 | `NotPng`·`BadHeader` |
| 2 | 비트 깊이 8 · 색상 타입 6 | 같음 | 같음 | `NotRgba` |
| 3 | ≤ 1 MB(`ASSET_MAX_BYTES`) | 같음 | 같음 | `TooManyBytes` |
| 4 | 1 ≤ 가로 ≤ 900, 1 ≤ 세로 ≤ 700 | 같음 | 같음 | `TooLarge { max_w: 900, max_h: 700, .. }` |
| 5 | 같은 그룹 기준 크기(`group_size`)가 있으면 일치 | 기준 = 캔버스 | 기준 = 다른 마우스 파츠의 크기 | `CanvasMismatch` / `MousePartMismatch` |

- `validate`·`group_size` 본문은 적용 완료(2차). CR-019 영향 없음 — 상태 레이어가 대기·쉬는중 2종으로 줄어도 캔버스 레이어 분류(`!is_mouse_part()`)는 그대로다.
- 옛 매니페스트에 서로 다른 크기의 마우스 파츠가 남아 있을 수 있다. 마이그레이션하지 않는다(§11 D18).

### 3.6 옛 매니페스트의 `slam` 항목 — 관대한 로드 (🔒 CR-019)

결론: `load_manifest`는 manifest.json을 **최상위 → 항목 순서로 두 번 나눠 해석**한다. 최상위(`canvas`, `entries` 배열)가 깨졌으면 지금처럼 `Manifest` 오류, 항목 하나가 해석되지 않으면 그 항목만 버리고 경고 로그를 남긴다.

왜 필요한가: `AssetSlot`은 `#[serde(untagged)]`라 `"slam"`은 `Simple(SimpleSlot)`에도 `KbDown{..}`에도 맞지 않아 "data did not match any variant of untagged enum AssetSlot" 오류가 난다. `entries: Vec<AssetEntry>`를 한 번에 해석하면 이 한 항목 때문에 **매니페스트 전체가 `Manifest` 오류**가 되고, 결과는 다음과 같다(Grep 2026-09-24 호출자):

| 호출자 | 전체 실패 시 결과 |
|---|---|
| `lib.rs:70` setup | `unwrap_or_else` → 빈 매니페스트 → **모든 그림이 사라진 것처럼 보임** |
| `bridge/commands.rs:200` `get_manifest` | `ASSET_MANIFEST` 오류 → 화면이 매니페스트를 못 받음 |
| `import`·`remove`(`mod.rs:332,360`) | 첫 줄 `load_manifest(..)?`에서 실패 → **새 그림 등록·삭제가 전부 막힘**(사용자가 스스로 고칠 방법이 없음) |
| `bridge/commands.rs:49` `load_manifest_or_warn` | 빈 매니페스트 → 손 기준점 `None` |

신규 파일 `src-tauri/src/assets/manifest_load.rs`(구현자가 그대로 옮길 것):

```rust
//! manifest.json 관대한 해석(CR-019).
//!
//! [목적] 폐기된 슬롯(예: "slam")처럼 해석되지 않는 항목이 있어도 그 항목만 건너뛰고 나머지를 읽는다.
//!        최상위 구조(JSON 문법, `canvas`, `entries` 배열)가 깨졌으면 기존처럼 `AssetError::Manifest`.
//! [캔버스] 하나라도 건너뛰었으면 남은 항목으로 캔버스를 다시 계산한다(건너뛴 항목이 유일한 캔버스
//!        레이어였을 수 있다).
//! [파일] 건너뛴 항목의 PNG 파일은 지우지 않는다(읽기 경로에 부수 효과 없음).
//! [unsafe] 없음.
//! [테스트] L1~L8(이 파일 `#[cfg(test)]`).

use serde::Deserialize;

use super::{AssetEntry, AssetError, AssetManifest, CanvasSize};

/// manifest.json 원문 모양 — `AssetManifest` 와 같되 항목은 해석 전 JSON 값.
#[derive(Deserialize)]
struct RawManifest {
    canvas: Option<CanvasSize>,
    entries: Vec<serde_json::Value>,
}

/// manifest.json 텍스트 → 매니페스트. 해석되지 않는 항목은 경고 로그 후 건너뛴다.
pub(super) fn parse_manifest(text: &str) -> Result<AssetManifest, AssetError> {
    let raw: RawManifest = serde_json::from_str(text)?;
    let total = raw.entries.len();
    let entries: Vec<AssetEntry> = raw.entries.into_iter().filter_map(parse_entry).collect();
    let mut manifest = AssetManifest {
        canvas: raw.canvas,
        entries,
    };
    if manifest.entries.len() != total {
        manifest.recompute_canvas();
    }
    Ok(manifest)
}

/// 항목 하나 해석. 실패하면 슬롯 값과 원인을 경고 로그로 남기고 None.
fn parse_entry(value: serde_json::Value) -> Option<AssetEntry> {
    let slot = value.get("slot").map(ToString::to_string).unwrap_or_default();
    match serde_json::from_value::<AssetEntry>(value) {
        Ok(entry) => Some(entry),
        Err(e) => {
            log::warn!("manifest.json 항목을 건너뜁니다(알 수 없는 슬롯이거나 형식 오류, slot={slot}): {e}");
            None
        }
    }
}
```

`mod.rs` 변경:

```rust
mod anchor;
mod manifest_load;
#[cfg(test)]
mod mouse_part_tests;

pub fn load_manifest(assets_dir: &Path) -> Result<AssetManifest, AssetError> {
    let path = assets_dir.join(MANIFEST_FILE);
    if !path.exists() {
        return Ok(AssetManifest::default());
    }
    manifest_load::parse_manifest(&fs::read_to_string(path)?)
}
```

- `recompute_canvas`는 `impl AssetManifest`의 비공개 메서드지만 자식 모듈(`manifest_load`)에서 호출할 수 있다(Rust 가시성: 비공개 항목은 정의 모듈과 그 하위 모듈에 보인다). 공개 범위 변경 없음.
- `RawManifest`의 필드 이름(`canvas`, `entries`)은 camelCase 변환과 같은 철자라 `rename_all`이 필요 없다. `entries`는 지금처럼 **필수**(누락 시 `Manifest` — 기존 동작 유지), `canvas`는 `Option`이라 누락 허용(기존과 같음).
- `log` 크레이트는 이미 의존성(settings `log::warn!` 사용). 새 의존성 없음.
- `mod.rs` `//!` 갱신: [공개 API] 불변, [슬롯]에 "`slam`은 CR-019로 폐기 — 옛 매니페스트의 `slam` 항목은 로드 시 건너뛴다(manifest_load.rs)" 추가, [테스트]에 "관대한 매니페스트 로드(manifest_load.rs L1~L8)" 추가.

동작 표:

| manifest.json 상태 | 결과 |
|---|---|
| 옛 `{"slot":"slam", …}` 항목 + 다른 캔버스 레이어 있음 | `slam` 항목만 빠짐. `canvas` 재계산 = 같은 값(캔버스 레이어는 모두 같은 크기이므로) |
| `slam`이 유일한 캔버스 레이어(나머지는 마우스 파츠뿐이거나 없음) | `slam` 빠짐, `canvas = None`. 다음 캔버스 레이어 등록은 크기 자유(기존 규칙) |
| 항목에 `width` 누락 등 다른 형식 오류(손으로 고친 파일) | 같은 방식으로 그 항목만 건너뜀(§11 D20) |
| JSON 문법 오류, `entries`가 배열 아님, `canvas` 모양 오류 | `Err(Manifest)`(기존과 같음) |
| 정상 파일(건너뛴 항목 0) | 파일에 적힌 `canvas`를 그대로 씀 — 재계산 안 함(기존 동작과 바이트 단위로 같은 결과) |
| 다음 `import`·`remove` 성공 | `save_manifest`가 메모리의 항목만 쓰므로 **`slam` 항목이 파일에서 사라짐**(별도 정리 코드 불필요) |
| `assets/slam.png` 파일 | **그대로 남음**(§11 D21). 매니페스트에 없으므로 읽히거나 표시되지 않는다 |

- 경고 로그 빈도: 옛 `slam` 항목이 파일에 남아 있는 동안 `load_manifest` 호출마다 1줄(시작·`get_manifest`·등록·삭제·기준점 재계산 시점 — 사용자 동작 단위라 드묾). 다음 등록·삭제 뒤에는 없어진다.

### 3.7 특수 키 이미지 슬롯 6개 (🔒 CR-021, OV-R-22)

결론: 6개 모두 **캔버스 레이어**다. `is_mouse_part()`가 마우스 파츠 3개만 참이므로 새 변형은 자동으로 `is_canvas_layer() == true` — `validate`·`group_size`·`recompute_canvas`·`import`·`remove` 본문을 **한 줄도 바꾸지 않고** §3 규격(≤900×700·≤1MB·캔버스 일치)이 적용된다.

| Rust 변형 (🔒) | 직렬화·`file_key()` (🔒) | 저장 파일 | 대응 hook 분류([hook.md](hook.md) `SpecialKey`) | 사용자 키 |
|---|---|---|---|---|
| `SimpleSlot::KeySpace` | `"key_space"` | `assets/key_space.png` | `Space` → `"space"` | 스페이스바 |
| `SimpleSlot::KeyZ` | `"key_z"` | `assets/key_z.png` | `Z` → `"z"` | ㅋ·z·Z(물리 키 Z) |
| `SimpleSlot::KeyQuestion` | `"key_question"` | `assets/key_question.png` | `Question` → `"question"` | ?(Shift+`/`) |
| `SimpleSlot::KeyExclamation` | `"key_exclamation"` | `assets/key_exclamation.png` | `Exclamation` → `"exclamation"` | !(Shift+`1`) |
| `SimpleSlot::KeyEnter` | `"key_enter"` | `assets/key_enter.png` | `Enter` → `"enter"` | Enter(숫자패드 포함) |
| `SimpleSlot::KeyBackspace` | `"key_backspace"` | `assets/key_backspace.png` | `Backspace` → `"backspace"` | Backspace |
| **`SimpleSlot::KeyUndo`** (5차) | **`"key_undo"`** | `assets/key_undo.png` | `Undo` → `"undo"` | **Shift 없는 Ctrl+Z**(되돌리기, 좌·우 Ctrl) |

- 결론 문장의 "6개"는 5차부터 **7개**로 읽는다(`KeyUndo` 포함 — 규칙 동일).
- 이름 규칙: 슬롯 직렬화 = `"key_" + hook 분류 직렬화`. 7개 모두 성립한다(K1이 고정). 단 core에는 분류 → 슬롯 대응 함수를 두지 **않는다** — hook과 assets는 서로 의존하지 않고(스킬 §1), 그림 선택은 ui 몫이다. 대응 표는 bridge TS/ui에 둔다(§9.6-5).
- `slot.rs` 정의(구현자가 그대로 옮길 것 — 기존 변형·`file_key` 팔은 글자 그대로 유지하고 굵은 부분만 추가):

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SimpleSlot {
    /// 배경(OV-R-17, CR-014) — 맨 아래 캔버스 레이어, 선택. `is_canvas_layer() == true`.
    Background,
    Body,
    Idle,
    Rest,
    KbUp,
    /// 특수 키 이미지(OV-R-22, CR-021) — 캔버스 레이어, 선택. 직렬화 "key_space" … "key_backspace".
    KeySpace,
    KeyZ,
    KeyQuestion,
    KeyExclamation,
    KeyEnter,
    KeyBackspace,
    /// 되돌리기(Shift 없는 Ctrl+Z, 5차) — 캔버스 레이어, 선택. 직렬화 "key_undo".
    KeyUndo,
    MouseBase,
    MouseLeft,
    MouseRight,
}

// file_key() 의 Self::Simple(s) 분기에 7팔 추가(아래 6팔 + SimpleSlot::KeyUndo => "key_undo"):
//     SimpleSlot::KeySpace => "key_space",
//     SimpleSlot::KeyZ => "key_z",
//     SimpleSlot::KeyQuestion => "key_question",
//     SimpleSlot::KeyExclamation => "key_exclamation",
//     SimpleSlot::KeyEnter => "key_enter",
//     SimpleSlot::KeyBackspace => "key_backspace",
```

- serde `rename_all = "snake_case"`는 `KeyZ` → `"key_z"`(대문자 앞에 `_`)로 바꾼다 — K1이 직렬화 문자열 6개를 모두 고정해 증명한다.
- 선택 슬롯: core는 필수 슬롯을 검사하지 않는다(불변). 필수 4장(`kb_up`, `kb_down_0`+, `idle`, `rest`)에 들지 않는다.
- 캔버스를 정할 수 있다: 캔버스 레이어가 하나도 없을 때 특수 키 그림을 먼저 넣으면 그 크기가 캔버스가 된다(배경과 같은 규칙 §3.4-1·3). 마지막 캔버스 레이어로 지워지면 `canvas = None`.
- 옛 매니페스트: `key_*` 항목이 없으므로 그대로 읽힌다. 반대로 이 매니페스트를 옛 앱(CR-019 관대한 로드 포함)이 읽으면 `key_*` 항목만 건너뛰고 나머지를 읽는다(§3.6) — 되돌리기에도 안전.
- 손 기준점(`compute_hand_anchor`)·창 리사이즈 판정에는 영향 없음 — 리사이즈는 `is_canvas_layer()`로 판정하므로 특수 키 등록·삭제도 기존 규칙대로 트리거다(bridge 코드 변경 없음).

### 3.8 펜 쥔 손 파츠 그룹 (🔒 CR-024, R-tmp-4)

결론: 펜 그림(`pen_up`, `pen_down_{n}`, `pen_key_*` 7개)은 **캔버스 레이어도 마우스 파츠도 아닌 세 번째 그룹**이다. 규격은 마우스 파츠와 같고(≤900×700·≤1MB, 캔버스 일치 없음), **펜 그림끼리만 같은 크기**를 강제한다. 캔버스를 정하지 않으므로 창 크기 재계산 대상도 아니다.

| Rust (🔒) | 직렬화 / `file_key()` (🔒) | 저장 파일 | ui가 쓰는 때(참고 — 선택은 ui) |
|---|---|---|---|
| `SimpleSlot::PenUp` | `"pen_up"` | `assets/pen_up.png` | 평소(키가 하나도 안 눌림) |
| `AssetSlot::PenDown { kind: PenDownKind::PenDown, index }` | `{"kind":"pen_down","index":N}` / `"pen_down_N"` | `assets/pen_down_N.png` | 키 누름(여러 장이면 순환 — kb_down과 같은 순번 구조) |
| `SimpleSlot::PenKeySpace` · `PenKeyZ` · `PenKeyQuestion` · `PenKeyExclamation` · `PenKeyEnter` · `PenKeyBackspace` · `PenKeyUndo` | `"pen_key_space"` · `"pen_key_z"` · `"pen_key_question"` · `"pen_key_exclamation"` · `"pen_key_enter"` · `"pen_key_backspace"` · `"pen_key_undo"` | `assets/pen_key_*.png` | hook 분류 `special` = `space`·`z`·`question`·`exclamation`·`enter`·`backspace`·`undo`(없으면 `pen_down`) |

- 이름 규칙: `"pen_key_" + hook 분류 직렬화`(= `"pen_" + 특수 키 캔버스 슬롯 file_key`). core에 분류 → 슬롯 대응 함수를 두지 않는다(D27과 같은 근거).
- serde `rename_all = "snake_case"`: `PenKeyZ` → `"pen_key_z"`(P1이 8개 문자열을 모두 고정).

검증 — 그룹별(§3.5 표에 세 번째 열 추가):

| 순서 | 검사 | 펜 그림 | 실패 |
|---|---|---|---|
| 1~4 | 시그니처·RGBA·≤1MB·1 ≤ 가로 ≤ 900, 1 ≤ 세로 ≤ 700 | 캔버스 레이어·마우스 파츠와 같음 | 기존 변형 |
| 5 | 같은 그룹 기준 크기(`group_size`) | 기준 = **이 슬롯을 뺀 첫 번째 다른 펜 그림**의 크기(마우스 파츠 D17과 대칭). 마우스 파츠·캔버스는 보지 않는다 | **`PenPartMismatch`** |

`slot.rs` 변경(구현자가 그대로 옮길 것 — 기존 변형·팔은 글자 그대로 두고 아래만 추가·교체):

```rust
pub enum SimpleSlot {
    // … Background … MouseRight 기존 그대로 …
    MouseRight,
    /// 펜 쥔 손 — 평소(CR-024). 팔 끝에 붙는 작은 그림, 선택. 펜 그룹(캔버스·마우스 파츠와 무관).
    PenUp,
    /// 펜 쥔 손 — 특수 키 전용(CR-024). 직렬화 "pen_key_space" … "pen_key_undo". 펜 그룹, 선택.
    PenKeySpace,
    PenKeyZ,
    PenKeyQuestion,
    PenKeyExclamation,
    PenKeyEnter,
    PenKeyBackspace,
    PenKeyUndo,
}

/// `kind` 필드가 정확히 "pen_down" 인지 강제하기 위한 단일 변형 enum(CR-024, `KbDownKind`와 같은 구조).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PenDownKind {
    #[serde(rename = "pen_down")]
    PenDown,
}

/// 직렬화 예: `"body"` / `"kb_up"` / `{"kind":"kb_down","index":0}` / `{"kind":"pen_down","index":0}`
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum AssetSlot {
    Simple(SimpleSlot),
    KbDown { kind: KbDownKind, index: u32 },
    /// 펜 쥔 손 — 키 누름 프레임(CR-024). 파일 키 "pen_down_{index}".
    PenDown { kind: PenDownKind, index: u32 },
}

impl AssetSlot {
    pub fn pen_down(index: u32) -> Self {
        Self::PenDown {
            kind: PenDownKind::PenDown,
            index,
        }
    }

    // file_key(): Simple 분기에 8팔(SimpleSlot::PenUp => "pen_up", SimpleSlot::PenKeySpace => "pen_key_space",
    //   … SimpleSlot::PenKeyUndo => "pen_key_undo"), 바깥 match 에 1팔:
    //   Self::PenDown { index, .. } => format!("pen_down_{index}"),

    /// 펜 쥔 손 그림(CR-024) — ≤900×700·≤1MB, 펜 그림끼리 같은 크기, 캔버스·마우스 파츠와 무관
    pub fn is_pen_part(&self) -> bool {
        matches!(
            self,
            Self::PenDown { .. }
                | Self::Simple(
                    SimpleSlot::PenUp
                        | SimpleSlot::PenKeySpace
                        | SimpleSlot::PenKeyZ
                        | SimpleSlot::PenKeyQuestion
                        | SimpleSlot::PenKeyExclamation
                        | SimpleSlot::PenKeyEnter
                        | SimpleSlot::PenKeyBackspace
                        | SimpleSlot::PenKeyUndo
                )
        )
    }

    /// 캔버스 레이어(배경·몸통·상태·키보드 파츠·특수 키) — 마우스 파츠·펜 그림 제외
    pub fn is_canvas_layer(&self) -> bool {
        !self.is_mouse_part() && !self.is_pen_part()
    }
}
```

- untagged 해석 순서 Simple → KbDown → PenDown. `{"kind":"pen_down",…}`은 `KbDownKind`가 거부해 `PenDown`으로, `{"kind":"kb_down",…}`은 지금처럼 `KbDown`으로 간다 — 모호함 없음(P1·P2가 증명).
- `slot.rs` `//!`: [목적]에 "CR-024 펜 쥔 손 슬롯", [펜 슬롯] 항 신설(위 이름 규칙·그룹), [테스트]에 P1·P2. 약 281 → 390줄.

`mod.rs` 변경(약 719 → 745줄, 800 한계 안):

```rust
#[cfg(test)]
mod pen_part_tests;
pub use slot::{AssetSlot, KbDownKind, PenDownKind, SimpleSlot};

// AssetError — MousePartMismatch 바로 아래
    #[error("펜 쥔 손 그림(평소·누름·특수 키)은 모두 같은 크기여야 합니다. 기존 {pw}×{ph}, 이 이미지 {w}×{h}.")]
    PenPartMismatch { w: u32, h: u32, pw: u32, ph: u32 },

// code()
            Self::CanvasMismatch { .. }
            | Self::MousePartMismatch { .. }
            | Self::PenPartMismatch { .. } => "asset.canvas_mismatch",

// validate() 마지막 match — 오류 생성을 헬퍼로(함수 50줄 한계 대비)
    match group_size {
        Some(g) if g.width != w || g.height != h => Err(mismatch_error(slot, w, h, g)),
        _ => Ok(()),
    }

/// 같은 그룹 기준 크기와 다를 때의 오류 — 그룹마다 문구가 다르다(code 는 모두 asset.canvas_mismatch).
fn mismatch_error(slot: &AssetSlot, w: u32, h: u32, g: CanvasSize) -> AssetError {
    let (gw, gh) = (g.width, g.height);
    if slot.is_mouse_part() {
        AssetError::MousePartMismatch { w, h, mw: gw, mh: gh }
    } else if slot.is_pen_part() {
        AssetError::PenPartMismatch { w, h, pw: gw, ph: gh }
    } else {
        AssetError::CanvasMismatch { w, h, cw: gw, ch: gh }
    }
}

// group_size() else 분기 — 마우스 파츠는 마우스 파츠끼리, 펜 그림은 펜 그림끼리(CR-024)
    } else {
        let pen = slot.is_pen_part();
        others
            .find(|e| if pen { e.slot.is_pen_part() } else { e.slot.is_mouse_part() })
            .map(|e| CanvasSize {
                width: e.width,
                height: e.height,
            })
    }
```

- `validate` 문서주석의 `group_size` 설명에 "펜 그림끼리" 추가. `recompute_canvas`·`import`·`remove`·`load_manifest`·`manifest_load.rs` 본문 **불변** — `is_canvas_layer()`가 펜을 빼므로 펜 그림은 캔버스를 정하지 않고, 캔버스가 비어 있어도 등록된다.
- `mod.rs` `//!`: [목적]에 "CR-024 펜 쥔 손 그룹(slot.rs)", [공개 API]에 `PenDownKind`, [슬롯]에 `{"kind":"pen_down","index":N}`, [캔버스 규칙]에 "펜 그림도 캔버스에 참여하지 않고 서로 같은 크기(`PenPartMismatch`)", [테스트]에 "펜 그룹(pen_part_tests.rs P3~P8)".

손 기준점과의 관계(확인 완료): `compute_hand_anchor`는 `manifest.find(MouseBase)`만 읽는다(`anchor.rs:35`). 펜 그림은 **기준점 계산에 쓰지 않는다** — 펜 손은 팔 끝(기준점)에 붙어 따라갈 뿐 팔이 닿을 목표를 바꾸지 않는다. 펜 그림 등록·삭제와 `mouse.penPos` 변경은 재계산 트리거가 아니다(bridge 재계산 조건은 `slot == MouseBase`·`(shoulder, part_pos)` 비교라 코드 변경 없음, `bridge/commands.rs:113,146`).

옛 manifest 호환:

| 경우 | 결과 |
|---|---|
| 새 앱 + 옛 manifest(펜 항목 없음) | 그대로 읽힘 |
| 옛 앱(CR-019 관대한 로드 포함) + 새 manifest | `"pen_*"`·`{"kind":"pen_down"}` 항목만 건너뜀(§3.6). 펜은 캔버스 레이어가 아니라 재계산된 `canvas`도 같은 값. 옛 앱이 다음 등록·삭제를 하면 펜 항목이 manifest에서 빠지고 PNG는 남는다(D21과 같음) — 새 앱으로 돌아오면 펜 그림을 다시 등록해야 한다 |
| CR-019 이전 앱(엄격 로드) + 새 manifest | 전체 `Manifest` 오류(CR-021 `key_*`와 같은 기존 한계, 되돌리기 비권장) |

### 3.9 settings-v2 — url 버전 쿼리·필수 규칙 문서주석 (SV2-07·08, 🔒 구현자가 그대로 옮길 것)

결론: `import`가 만드는 `AssetEntry.url` 끝에 **`?v={파일 수정 시각 ms}`**를 붙여, 같은 슬롯을 다른 그림으로 바꾸면 url이 달라지게 한다(WebView가 옛 그림을 캐시로 보이던 결함). 필수 규칙은 **core 로직 변경 없이 문서주석만** 「필수 3장(`kb_up`·`kb_down_0`·`mouse_base`), `idle`·`rest` 선택」으로 고친다. 이 문서의 「필수 4장」 서술(변경이력 3차, §1 CR-019 행, §3.4 표, §3.7, §9.4 UI-M4, §9.5-3, §10 CR-019 행)은 **SV2-08로 대체**됐다 — 옛 결정 기록으로만 남는다.

비유: 같은 액자 자리에 새 그림을 걸어도 주소표(url)가 같으면 관람객(WebView)은 "아까 본 그림"이라며 기억 속 그림을 보여 준다. 주소표 끝에 "걸어 둔 시각"을 붙이면 새 그림마다 주소표가 달라져 다시 본다. 창고(asset 프로토콜)는 주소표의 시각 부분을 무시하고 자리(경로)만 보고 그림을 꺼낸다.

**API·구조 (§2·§3 증분)** — 공개 API 시그니처 변경 없음(`asset_url`은 그대로 공개·순수). `mod.rs`가 753줄이라 url 코드를 자식 파일로 옮긴다.

| 항목 | 위치 | 시그니처 | 책임 |
|---|---|---|---|
| `asset_url` (기존, 이동) | `assets/url.rs` 신규, `mod.rs`에서 `pub use url::asset_url;` | `pub fn asset_url(path: &Path) -> String` | 불변(`http://asset.localhost/` + encodeURIComponent) |
| `encode_uri_component` (기존, 이동) | `url.rs` | `fn encode_uri_component(s: &str) -> String` | 불변 |
| **`versioned_asset_url`** | `url.rs` | `pub(super) fn versioned_asset_url(path: &Path) -> String` | `with_version(asset_url(path), fs::metadata(path).and_then(\|m\| m.modified()).ok())` |
| **`with_version`** | `url.rs` | `fn with_version(base: String, modified: Option<SystemTime>) -> String` | `modified`가 `UNIX_EPOCH` 이후면 `format!("{base}?v={ms}")`(`as_millis()`), `None`·이전이면 `base` 그대로(순수) |

- `import`(`mod.rs:319`): `url: asset_url(&dest)` → **`url: url::versioned_asset_url(&dest)`**. `fs::write`(`mod.rs:311`)가 쓰는 순간의 시각이 수정 시각이 되므로 원본 파일의 시각과 무관하게 교체마다 값이 바뀐다.
- `load_manifest`·`manifest_load.rs`는 저장된 url을 그대로 읽는다(재계산 없음). 옛 매니페스트의 쿼리 없는 url은 다음 교체 때 버전이 붙는다.
- `mod.rs` 줄 수 753 → 약 735(url 코드 이동), `url.rs` 약 90줄(테스트 포함).

**asset 프로토콜 쿼리 확인 (C-10)**: 정적 확인 — tauri 2.11.6 `src/protocol/asset.rs:35`가 `request.uri().path()`로 파일 경로를 만든다 → **쿼리 문자열은 경로에 들어가지 않는다**(404 없음). 실행 실측 A-M1(아래)로 확정하고 결과를 이 절에 기록 요청. 404가 나면 대안(파일명에 리비전 + 교체 시 옛 파일 삭제)을 다시 설계한다(계약 §3.2 문구가 달라짐).

**필수 규칙 문서주석 (SV2-08, 로직 변경 없음 — core는 필수 판정을 하지 않는다)**

- `assets/mod.rs:21-23` → `` `background`(OV-R-17)는 캔버스 레이어이지만 필수 3장(kb_up·kb_down_0·mouse_base, SV2-08)에 포함되지 않는다. `idle`·`rest`(SV2-08부터 선택 — 없으면 ui가 kb_up만 보인다), 특수 키 슬롯 7개(OV-R-22)·펜 쥔 손 슬롯 전체(CR-024)도 선택이다. 필수 판정은 ui가 한다. ``
- `assets/slot.rs:8` → "필수 4장에 포함되지 않음" 부분을 "필수 3장(kb_up·kb_down_0·mouse_base, SV2-08)에 포함되지 않음"으로.
- `//!` [URL]에 "`import`는 `?v={수정 시각 ms}`를 붙인다(SV2-07). asset 프로토콜은 쿼리를 무시한다", [테스트]에 "url 버전(url.rs V1~V5)".

**테스트 (§8 증분 — `url.rs` `#[cfg(test)] mod tests`)**

| # | 이름 | 입력 | 기대 |
|---|---|---|---|
| V1 | `with_version_appends_millis` | `with_version("u".into(), Some(UNIX_EPOCH + 1234ms))` | `"u?v=1234"` |
| V2 | `with_version_none_keeps_base` | `None` / `UNIX_EPOCH - 1s` | `"u"` / `"u"` |
| V3 | `import_url_has_version` (C-7, tempdir) | `import(dir, kb_up, 유효 PNG)` | `url`이 `asset_url(&dir.join("kb_up.png")) + "?v="`로 시작, 뒤가 숫자 |
| V4 | `reimport_same_slot_changes_url` (C-7, tempdir) | 같은 슬롯에 PNG A import → `sleep(20ms)` → 다른 PNG B import | 두 url이 다르고, `?` 앞부분(경로)은 같다 |
| V5 | `encode_uri_component_unchanged` | 기존 `mod.rs` 인코딩 테스트를 `url.rs`로 이동 | 기존 기대 그대로(`mod.rs:494` `starts_with("http://asset.localhost/")` 단언도 PASS) |

수동 A-M1 (`yarn tauri dev`, 실행 증거: 스크린샷 + 개발자 도구 네트워크 캡처): 슬롯 등록 → 설정 창·오버레이에 그림 표시(404 없음) → 같은 슬롯을 다른 PNG로 「이미지 변경」 → 재시작 없이 설정 카드·오버레이 모두 새 그림.

**bridge 요구 (§9 증분 — 계약 §3.2·§3.1)**

| # | 위치 | 요구 | 호환성 |
|---|---|---|---|
| 1 | §3.2 `AssetEntry.url` 규칙 | "`http://asset.localhost/{encodeURIComponent(경로)}?v={파일 수정 시각 ms}`. 같은 슬롯을 다른 그림으로 바꾸면 url이 달라진다. 옛 매니페스트 항목은 쿼리가 없을 수 있다. ui는 url을 그대로 `<img src>`에 쓰고 직접 만들거나 비교하지 않는다" | 호환(값 규칙) |
| 2 | §3.1 필수 문구·`REQUIRED_SLOTS` | 필수 = `kb_up`, `kb_down` index 0, `mouse_base`. `idle`·`rest` 선택(없으면 `kb_up`) — core 판정 없음 | 문서·TS 상수(bridge) |

**요구 추적 (§10 증분)**

| 요구ID | 반영 | 상태 |
|---|---|---|
| SV2-07 — 이미지 교체 즉시 반영(url 버전) | §3.9 API·V1~V5·A-M1·bridge 1 | ✅ 설계 · 소스 반영(A-M1 실측 대기) |
| SV2-08 — 필수 3장·idle/rest 선택(문서주석) | §3.9 필수 규칙·bridge 2 | ✅ 설계(core 로직 해당 없음 — ui 판정) |

**결정 (§11 증분)**

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| **D-SV1** | 버전 = 저장 파일의 수정 시각 ms(`fs::write` 직후) | ① 원본 파일 시각 ② 내용 해시 ③ 교체 횟수 카운터 ④ 파일명 리비전 | 🔒 패킷 §4. ①은 같은 시각의 다른 파일(압축 해제 묶음)에서 url이 같아질 수 있다. ②는 1MB 추가 해시 코드. ③은 상태 저장 필요. ④는 옛 파일 삭제·매니페스트 재번호가 겹친다(asset 프로토콜이 쿼리를 무시하므로 불필요) |
| **D-SV2** | url 코드를 `url.rs`로 분리 | `mod.rs`에 추가 | `mod.rs` 753줄 — 800줄 한계(golden-principles §1) |
| **D-SV3** | CORE-002(제자리 덮어쓰기)는 고치지 않음 | 원자적 교체 | 요구 밖, 사용자 미결 권고(02-design §5.1 R-5) |

### 3.10 CR-035 — 내장 기본 세트·시딩·복원·내보내기 (DA-01~07, 🔒 구현자가 그대로 옮길 것)

결론: 기본 그림 15장을 `include_bytes!`로 exe에 넣는다(`assets/defaults.rs`). 저장 경로는 새로 만들지 않고, 기존 `import`의 본문을 바이트 입력판 **`import_bytes`**로 떼어 시딩·복원이 그대로 쓴다. 그래서 검증·캔버스 규칙·매니페스트 갱신이 사용자 등록과 한 벌이다. 내보내기(`assets/export.rs`)는 매니페스트·앱 데이터 폴더와 무관하게 사용자 폴더에 원본 바이트를 쓴다. 새 의존성·`unsafe`·`Cargo.toml`·`tauri.conf.json`·capability 변경은 없다.

#### 3.10.1 `mod.rs` 변경 · 내장 표 (DA-01)

```rust
// mod.rs — 모듈 선언부(mod anchor; 위)
pub mod defaults;
pub mod export;

// AssetError — PenPartMismatch 바로 아래(경로를 message 에 넣지 않는다)
    #[error("이 칸에는 내장 기본 그림이 없습니다: {0}")]
    NoDefault(String),
    #[error("저장할 폴더를 찾을 수 없습니다.")]
    ExportDir,

// code() — Decode 팔 아래
            Self::NoDefault(_) => "asset.no_default",
            Self::ExportDir => "asset.export_dir",

/// 검증 → `assets/{key}.png` 로 쓰기 → manifest 갱신. 같은 슬롯은 덮어쓴다.
/// CR-035: 바이트 입력판 — 파일 등록(`import`)과 내장 기본 시딩·복원(defaults.rs)이 함께 쓴다.
pub fn import_bytes(
    assets_dir: &Path,
    slot: AssetSlot,
    bytes: &[u8],
) -> Result<AssetManifest, AssetError> {
    let info = parse_png_header(bytes)?;
    let mut manifest = load_manifest(assets_dir)?;
    // … 이하 기존 import 본문(group_size → validate → create_dir_all → fs::write(&dest, bytes) → AssetEntry
    //    { bytes: bytes.len() as u64, url: url::versioned_asset_url(&dest), .. } → retain → push →
    //    recompute_canvas → save_manifest)을 글자 그대로. `&bytes` → `bytes` 만 바뀐다.
}

/// 원본 파일을 읽어 `import_bytes` 로 넘긴다(CR-035 추출 — 시그니처·순서·동작 불변).
pub fn import(assets_dir: &Path, slot: AssetSlot, src: &Path) -> Result<AssetManifest, AssetError> {
    let bytes = fs::read(src)?;
    import_bytes(assets_dir, slot, &bytes)
}
```

- `mod.rs` `//!`: [목적]에 "CR-035 내장 기본 세트(defaults.rs)·내보내기(export.rs)", [공개 API]에 `import_bytes`·`defaults`·`export`, [테스트]에 "내장 기본(tests/default_assets.rs)".

```rust
//! 내장 기본 이미지 세트(CR-035).
//!
//! [목적] DA-01 기본 그림 15장을 exe 에 내장한다(원본 `doc/assets/defaults/*.png`, manifest.snapshot.json 제외).
//!        DA-02 첫 실행 시딩(매니페스트 비어 있음 + 같은 이름 파일 없음), DA-03 슬롯 하나를 내장 기본으로 복원.
//! [내장 방식] include_bytes! — 포터블 exe 에도 따라가야 해서 Tauri resources(설치본에만 깔림) 대신 쓴다
//!        (02-design U-6). 바이트는 exe 정적 영역(힙 복사 없음). 그림을 바꾸려면 다시 빌드한다.
//! [순서] DEFAULT_ASSETS 순서 = 시딩 등록 순서: 캔버스 레이어(kb_up 먼저) → mouse_base → pen_up → pen_down_0.
//! [에러] seed_if_empty 는 Err 를 내지 않는다(앱 시작을 막지 않음). restore_default 는 NoDefault·import_bytes 오류.
//! [설정] settings.json 을 읽지도 쓰지도 않는다.
//! [unsafe] 없음.
//! [테스트] tests/default_assets.rs(통합, tempdir).

use std::path::Path;

use super::{
    import_bytes, load_manifest, AssetError, AssetManifest, AssetSlot, KbDownKind, PenDownKind, SimpleSlot,
};

/// 내장 기본 그림 1장. 바이트는 exe 정적 영역(힙 복사 없음).
#[derive(Debug, Clone, Copy)]
pub struct DefaultAsset {
    pub slot: AssetSlot,
    pub bytes: &'static [u8],
}

impl DefaultAsset {
    /// 저장·내보내기 파일명 `{file_key}.png`(export.rs 와 공유).
    pub(super) fn file_name(&self) -> String {
        format!("{}.png", self.slot.file_key())
    }
}

macro_rules! default_png {
    ($name:literal) => {
        include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/../doc/assets/defaults/", $name))
    };
}

const fn simple(slot: SimpleSlot, bytes: &'static [u8]) -> DefaultAsset {
    DefaultAsset { slot: AssetSlot::Simple(slot), bytes }
}

/// 순서 고정: 캔버스 레이어(kb_up 먼저) → mouse_base → pen_up → pen_down_0. 시딩이 이 순서로 등록한다.
pub static DEFAULT_ASSETS: [DefaultAsset; 15] = [
    simple(SimpleSlot::KbUp, default_png!("kb_up.png")),
    DefaultAsset {
        slot: AssetSlot::KbDown { kind: KbDownKind::KbDown, index: 0 },
        bytes: default_png!("kb_down_0.png"),
    },
    simple(SimpleSlot::Idle, default_png!("idle.png")),
    simple(SimpleSlot::Rest, default_png!("rest.png")),
    simple(SimpleSlot::Background, default_png!("background.png")),
    simple(SimpleSlot::KeySpace, default_png!("key_space.png")),
    simple(SimpleSlot::KeyZ, default_png!("key_z.png")),
    simple(SimpleSlot::KeyQuestion, default_png!("key_question.png")),
    simple(SimpleSlot::KeyExclamation, default_png!("key_exclamation.png")),
    simple(SimpleSlot::KeyEnter, default_png!("key_enter.png")),
    simple(SimpleSlot::KeyBackspace, default_png!("key_backspace.png")),
    simple(SimpleSlot::KeyUndo, default_png!("key_undo.png")),
    simple(SimpleSlot::MouseBase, default_png!("mouse_base.png")),
    simple(SimpleSlot::PenUp, default_png!("pen_up.png")),
    DefaultAsset {
        slot: AssetSlot::PenDown { kind: PenDownKind::PenDown, index: 0 },
        bytes: default_png!("pen_down_0.png"),
    },
];

/// 내장 기본 바이트. file_key 기준 비교 — kb_down_0·pen_down_0 만 있고 index 1 이상은 None.
pub fn default_bytes(slot: &AssetSlot) -> Option<&'static [u8]> {
    let key = slot.file_key();
    DEFAULT_ASSETS.iter().find(|d| d.slot.file_key() == key).map(|d| d.bytes)
}

pub fn has_default(slot: &AssetSlot) -> bool {
    default_bytes(slot).is_some()
}
```

- `AssetSlot`은 모든 변형이 상수식으로 만들어지므로(`Simple(..)`·`KbDown { .. }`·`PenDown { .. }`, 필드 전부 `Copy`) 패킷의 대안 `OnceLock`은 쓰지 않는다. `include_bytes!`의 `&'static [u8; N]`은 필드·`const fn` 인자에서 `&'static [u8]`로 강제 변환된다.
- 내장 기본이 **없는** 슬롯: `body`, `mouse_left`, `mouse_right`, `pen_key_*` 7종, `kb_down_1+`, `pen_down_1+`.

#### 3.10.2 시딩 `seed_if_empty` (DA-02, U-4 = S1)

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SeedSkip {
    /// manifest.json 에 항목이 1개 이상 있다
    NotEmpty,
    /// manifest.json 최상위 구조 손상·읽기 실패(load_manifest Err) — 손상 파일을 덮어쓰지 않는다
    ManifestUnreadable,
    /// 매니페스트는 비었지만 15개 파일명 중 하나 이상이 폴더에 있다 — 매니페스트만 사라진 사용자 파일 보호
    FilesPresent,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SeedOutcome {
    /// count = 성공 장수, failed = (file_key, AssetError::code())
    Seeded { count: usize, failed: Vec<(String, &'static str)> },
    Skipped(SeedSkip),
}

/// Err 를 내지 않는다(앱 시작을 막지 않기 위해). 결과는 호출자(lib.rs)가 로그로 남긴다.
pub fn seed_if_empty(assets_dir: &Path) -> SeedOutcome {
    match load_manifest(assets_dir) {
        Err(_) => return SeedOutcome::Skipped(SeedSkip::ManifestUnreadable),
        Ok(m) if !m.entries.is_empty() => return SeedOutcome::Skipped(SeedSkip::NotEmpty),
        Ok(_) => {}
    }
    if DEFAULT_ASSETS.iter().any(|d| assets_dir.join(d.file_name()).exists()) {
        return SeedOutcome::Skipped(SeedSkip::FilesPresent);
    }
    seed_all(assets_dir)
}

/// DEFAULT_ASSETS 순서대로 import_bytes. 한 장 실패는 기록하고 다음 장을 계속한다.
fn seed_all(assets_dir: &Path) -> SeedOutcome {
    let mut count = 0;
    let mut failed = Vec::new();
    for d in DEFAULT_ASSETS.iter() {
        match import_bytes(assets_dir, d.slot, d.bytes) {
            Ok(_) => count += 1,
            Err(e) => failed.push((d.slot.file_key(), e.code())),
        }
    }
    SeedOutcome::Seeded { count, failed }
}
```

| 폴더 상태 | 결과 |
|---|---|
| manifest.json 없음, 15개 파일명 없음(첫 실행) | `Seeded { count: 15, failed: [] }`, 캔버스 900×700(첫 항목 `kb_up`) |
| manifest.json 있음, `entries` 0개(전부 비운 뒤, U-4 = S1), 15개 파일명 없음 | 같음(다시 채움) |
| 항목 1개 이상 | `Skipped(NotEmpty)` — 파일·매니페스트 불변 |
| 최상위 손상(JSON 문법 등) | `Skipped(ManifestUnreadable)` — 파일 바이트 불변 |
| 매니페스트 비었고 `kb_up.png` 등 하나라도 있음 | `Skipped(FilesPresent)` |
| 옛 매니페스트에 `slam` 항목만(CR-019 관대한 로드로 0개) | 시딩. `slam.png`는 15개 이름이 아니라 막지 않고, 남는다(D21) |
| 매니페스트 비었고 `mouse_left.png` 같은 기본 없는 슬롯 파일만 있음 | 시딩(15개 이름만 검사 — 패킷 §2-2) |

- `lib.rs` 변경(core 소관 — **`generate_handler!` 목록은 건드리지 않는다**):

```rust
// setup 안 — :66 create_dir_all 바로 다음 줄, :67 settings 로드·:68 load_manifest 앞
            std::fs::create_dir_all(&paths.assets_dir)?;
            seed_default_assets(&paths.assets_dir); // CR-035 DA-02 — 뒤의 기준점(:72)·창 크기(:111)가 결과를 쓴다

// run() 밖, setup_overlay 옆의 비공개 도우미
/// 첫 실행 기본 이미지 시딩(CR-035 DA-02). 실패해도 앱은 계속 뜬다 — 결과·소요 시간만 로그(경로 없음).
fn seed_default_assets(assets_dir: &std::path::Path) {
    let started = std::time::Instant::now();
    let outcome = assets::defaults::seed_if_empty(assets_dir);
    let ms = started.elapsed().as_millis();
    match &outcome {
        assets::defaults::SeedOutcome::Seeded { failed, .. } if !failed.is_empty() => {
            log::warn!("기본 이미지 시딩 일부 실패: {outcome:?} ({ms} ms)")
        }
        _ => log::info!("기본 이미지 시딩: {outcome:?} ({ms} ms)"),
    }
}
```

- `SeedOutcome`의 `Debug` 출력에는 file_key와 코드만 있고 경로가 없다. settings.json은 건드리지 않는다.
- **⚠ 위 호출 위치는 data-reset(2026-09-27)으로 대체된다 — §3.17.** 새 순서는 `create_dir_all` → settings 로드·`data_reset::run_startup` → `seed_default_assets` → `load_manifest`다(settings 로드가 시딩보다 앞으로 온다). `seed_default_assets` 도우미 본문은 그대로다.

#### 3.10.3 복원 `restore_default` (DA-03)

```rust
/// 내장 기본이 없으면 NoDefault. 검증을 쓰기 전에 하므로(import_bytes 순서) 실패하면 사용자 그림이 그대로 남는다.
pub fn restore_default(assets_dir: &Path, slot: AssetSlot) -> Result<AssetManifest, AssetError> {
    let bytes = default_bytes(&slot).ok_or_else(|| AssetError::NoDefault(slot.file_key()))?;
    import_bytes(assets_dir, slot, bytes)
}
```

- 결과: 같은 파일명(`{key}.png`)에서 사용자 그림이 기본 그림으로 교체된다(확정 문구 「삭제 후 기본 복원」과 결과가 같다).
- 다른 캔버스 레이어가 기본(900×700)과 다른 크기면 `CanvasMismatch`(`asset.canvas_mismatch`)다. 새 예외는 없다. 그 슬롯이 유일한 캔버스 레이어면 기존 규칙대로 허용되고 캔버스가 900×700으로 바뀐다.
- `mouse_base` 복원 뒤 손 기준점 재계산·창 리사이즈·`assets://changed`는 bridge 후처리(§3.10.6).

#### 3.10.4 내보내기 `export_defaults` (DA-05, U-5 = A)

```rust
//! 내장 기본 이미지 내보내기(CR-035 DA-05).
//!
//! [목적] 사용자가 고른 폴더에 내장 기본 그림 15장을 원본 바이트 그대로 `{file_key}.png` 로 쓴다.
//! [충돌] 미리 검사한다(U-5 = A). overwrite=false 이고 같은 이름(파일·폴더)이 하나라도 있으면 아무것도 쓰지 않고
//!        conflicts 만 돌려준다. overwrite=true 면 전부 쓴다(conflicts 는 덮어쓴 목록 — 정보용).
//! [쓰기] 파일마다 `.{name}.kuro-tmp` 에 쓰고 rename(Windows std::fs::rename 은 기존 파일을 교체).
//!        한 장 실패는 failed 에 담고 계속한다.
//! [보안] 파일명은 내장 표에서만 만든다(사용자 입력 파일명 없음). 폴더는 절대 경로이면서 이미 있는 폴더만.
//!        에러 message·로그에 경로를 넣지 않는다.
//! [범위] 매니페스트·앱 데이터 폴더·이벤트와 무관.
//! [unsafe] 없음.
//! [테스트] tests/default_assets.rs export_*.

use std::fs;
use std::io;
use std::path::Path;

use serde::Serialize;

use super::defaults::DEFAULT_ASSETS;
use super::AssetError;

#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExportFailure {
    pub file_name: String,
    pub code: &'static str,
}

#[derive(Serialize, Debug, Clone, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExportReport {
    /// 쓴 파일명(DEFAULT_ASSETS 순서)
    pub written: Vec<String>,
    /// 쓰기 전에 이미 있던 이름
    pub conflicts: Vec<String>,
    /// 쓰지 못한 파일명 + 코드
    pub failed: Vec<ExportFailure>,
}

pub fn export_defaults(dest_dir: &Path, overwrite: bool) -> Result<ExportReport, AssetError> {
    if !dest_dir.is_absolute() || !dest_dir.is_dir() {
        return Err(AssetError::ExportDir);
    }
    let names: Vec<String> = DEFAULT_ASSETS.iter().map(|d| d.file_name()).collect();
    let conflicts: Vec<String> = names.iter().filter(|n| dest_dir.join(n).exists()).cloned().collect();
    let mut report = ExportReport { conflicts, ..ExportReport::default() };
    if !overwrite && !report.conflicts.is_empty() {
        return Ok(report);
    }
    for (d, name) in DEFAULT_ASSETS.iter().zip(names) {
        match write_via_temp(dest_dir, &name, d.bytes) {
            Ok(()) => report.written.push(name),
            Err(e) => {
                log::warn!("기본 이미지 내보내기 실패: {name} ({:?})", e.kind());
                let code = AssetError::from(e).code(); // "asset.io" — 코드 문자열의 원본은 code() 하나
                report.failed.push(ExportFailure { file_name: name, code });
            }
        }
    }
    Ok(report)
}

/// 임시 파일에 쓰고 rename. 실패하면 임시 파일을 지운다(best-effort — 남아도 다음 내보내기가 덮어쓴다).
fn write_via_temp(dir: &Path, name: &str, bytes: &[u8]) -> io::Result<()> {
    let tmp = dir.join(format!(".{name}.kuro-tmp"));
    let result = fs::write(&tmp, bytes).and_then(|()| fs::rename(&tmp, dir.join(name)));
    if result.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    result
}
```

- 같은 이름의 **폴더**(예: `kb_up.png/`)도 `exists()`라 `conflicts`에 든다. 그래서 `overwrite=false`면 아무것도 쓰지 않고, `overwrite=true`면 그 1건만 rename이 실패해 `failed`로 간다(E-5 테스트는 `overwrite=true`로 부른다).
- 로그에는 파일명과 `io::ErrorKind`만 남기고 경로는 넣지 않는다.

#### 3.10.5 테스트 (§8 증분 — `src-tauri/tests/default_assets.rs`, tempdir)

크레이트 경로는 기존 `tests/sample_assets.rs`와 같게 쓴다. 가짜 PNG 도우미 `fn fake_png(w: u32, h: u32, tag: u8) -> Vec<u8>`(시그니처 + IHDR(길이 13, "IHDR", BE 폭·높이, 깊이 8, 색상 6, 나머지 0) + CRC 0 + 끝에 `tag` 1바이트 — `parse_png_header`는 CRC를 보지 않는다)를 이 파일에 둔다. 내장 바이트와 달라야 할 때 `tag`를 쓴다.

| # | 이름 | 준비·호출 | 기대 |
|---|---|---|---|
| D1 | `default_assets_slot_set` | `DEFAULT_ASSETS` file_key 집합 | 정확히 15개: `background, idle, rest, kb_up, kb_down_0, key_space, key_z, key_question, key_exclamation, key_enter, key_backspace, key_undo, mouse_base, pen_up, pen_down_0`(중복 없음). 첫 항목 `kb_up`, 끝 세 항목 `mouse_base, pen_up, pen_down_0`(순서 고정) |
| D2 | `default_assets_pass_validation` | 각 장 `parse_png_header` → `validate(&info, len, &slot, None)` | 전부 `Ok`. 캔버스 12장 900×700, `mouse_base` 202×154, 펜 2장 90×154, 각 `len ≤ ASSET_MAX_BYTES` |
| D3 | `has_default_rules` | `has_default` | `kb_down(0)`·`pen_down(0)` 참. `kb_down(1)`·`pen_down(1)`·`MouseLeft`·`MouseRight`·`PenKeySpace`·`Body` 거짓 |
| D4 | `seed_fresh_dir` | 빈 tempdir → `seed_if_empty`(소요 ms `eprintln!`) | `Seeded { count: 15, failed: [] }`, `load_manifest` 15항목, `canvas == Some(900×700)` |
| D5 | `seed_skips_when_not_empty` | `import_bytes(body, fake_png(900,700,1))` → `seed_if_empty` | `Skipped(NotEmpty)`, manifest.json·`body.png` 바이트 불변, `kb_up.png` 없음 |
| D6 | `seed_skips_corrupt_manifest` | manifest.json = `"{ not json"` | `Skipped(ManifestUnreadable)`, manifest.json 바이트 불변, `kb_up.png` 없음 |
| D7 | `seed_skips_orphan_files` | 매니페스트 없이 `kb_up.png`(가짜 바이트)만 | `Skipped(FilesPresent)`, 그 파일 불변, manifest.json 없음 |
| D8 | `seed_twice_is_noop` | D4 뒤 한 번 더 | `Skipped(NotEmpty)` |
| D9 | `restore_replaces_user_image` | `import_bytes(kb_up, fake_png(900,700,7))` → `restore_default(kb_up)` | `Ok`, `kb_up.png` 바이트 == `default_bytes(kb_up)`, 매니페스트 `kb_up` 항목 `bytes` = 내장 길이 |
| D10 | `restore_no_default` | 사용자 항목 1개 있는 폴더 → `restore_default(MouseLeft)` | `Err`, `code() == "asset.no_default"`, manifest.json 텍스트 불변 |
| D11 | `restore_canvas_mismatch_keeps_user` | `kb_up`·`body` 각 `fake_png(450,350,..)` → `restore_default(kb_up)` | `Err`, `code() == "asset.canvas_mismatch"`, `kb_up.png` 바이트·매니페스트 불변 |
| D12 | `export_fresh_dir` | 빈 tempdir(절대 경로) → `export_defaults(dir, false)`(소요 ms `eprintln!`) | `written` 15개(표 순서), `conflicts`·`failed` 비어 있음, 각 파일 바이트 == 내장 바이트, `*.kuro-tmp` 없음 |
| D13 | `export_conflict_no_overwrite` | `kb_up.png`(가짜) 미리 둠 → `(dir, false)` | `written: []`, `conflicts: ["kb_up.png"]`, `failed: []`, 기존 파일 불변, 다른 14개 파일 없음 |
| D14 | `export_conflict_overwrite` | 같은 조건 → `(dir, true)` | `written` 15개, `conflicts: ["kb_up.png"]`, `kb_up.png` == 내장 바이트 |
| D15 | `export_partial_failure` | `dir/kb_up.png/` **폴더** 생성 → `(dir, true)` | `failed == [ExportFailure { file_name: "kb_up.png", code: "asset.io" }]`, `written` 14개, `.kb_up.png.kuro-tmp` 없음 |
| D16 | `export_bad_dir` | ① `dir.join("nope")` ② `Path::new("relative_dir")` ③ tempdir 안의 파일 경로 | 셋 다 `Err`, `code() == "asset.export_dir"`, `to_string()`에 경로 없음 |
| D17 | `error_codes` | `NoDefault("kb_up".into())`, `ExportDir` | `code()` = `asset.no_default` / `asset.export_dir` |
| M1 | `measure_default_hand_anchor`(실측, 좌표 단언 없음) | D4처럼 시딩 → `compute_hand_anchor(dir, &m, default_mouse().shoulder, default_mouse().part_pos)` → `eprintln!` | `Ok(Some(_))`만 단언. 좌표는 `cargo test --test default_assets -- --nocapture`로 완료 보고에 싣는다(패킷 §5-1) |

- 회귀: 기존 `import` 테스트(mod.rs·slot.rs K4~K6·pen_part_tests·mouse_part_tests·url.rs V3·V4·manifest_load L7·L8) 전건 PASS = `import_bytes` 추출의 동작 불변 증명.
- 완료 기준(스킬 §9): `cargo fmt --check`, `cargo clippy -- -D warnings` 0, `cargo test` 전건 PASS. 완료 보고 실측 4가지: 시딩 ms(D4), 내보내기 ms(D12), M1 좌표, `assets/mod.rs` 줄 수.

#### 3.10.6 bridge 요구 명세 (§9 증분 — 계약 v0.15 → v0.16 후보, 확정은 bridge-designer)

| # | 종류 | 이름 후보 | 인자 → 반환 | 실패 사유(코드) | 빈도 | core 호출·지킬 것 |
|---|---|---|---|---|---|---|
| 1 | command | `restore_default_asset` | `(slot: AssetSlot)` → `AssetManifest` | `asset.no_default`, `asset.canvas_mismatch`, `asset.io`, `asset.manifest`(+ `tauri.error`·`state.poisoned`는 bridge) | 사용자 클릭 | `assets::defaults::restore_default(&paths.assets_dir, slot)`. 성공 후처리는 `import_asset`과 같다: 캔버스 레이어면 창 리사이즈 → `assets://changed`(매니페스트 전체) → `slot == MouseBase`면 손 기준점 재계산·`assets://hand-anchor-changed` |
| 2 | command | `export_default_assets` | `(dir: string, overwrite: boolean)` → `ExportReport` | `asset.export_dir`만 Err. 파일별 실패는 `failed[].code`(`asset.io`) | 클릭 1~2회(충돌 시 확인 후 `overwrite=true` 재호출) | `assets::export::export_defaults(Path::new(&dir), overwrite)`. 이벤트 없음, `AppState` 잠금 불필요. 15장 ≤ 300 ms 목표 |
| 3 | 타입 | `ExportReport { written: string[]; conflicts: string[]; failed: ExportFailure[] }`, `ExportFailure { fileName: string; code: string }` | core 구조체가 이미 `Serialize`·camelCase. 그대로 반환할지 bridge 사본을 둘지는 bridge 결정 | — | — | 필드는 모두 파일명, 경로 없음 |
| 4 | 상수 | `DEFAULT_ASSET_SLOTS`(15, `DEFAULT_ASSETS` 순서)·`hasBuiltinDefault(slot)` | TS 사본. 원본은 core `DEFAULT_ASSETS`·`has_default` | — | — | D1·D3과 같은 집합 |
| 5 | 에러 | `asset.no_default` "이 칸에는 내장 기본 그림이 없습니다: {key}", `asset.export_dir` "저장할 폴더를 찾을 수 없습니다." | `error.rs` `From<AssetError> for BridgeError`가 `code()`·`to_string()`을 옮기므로 bridge Rust 코드 변경 없음 | — | — | ja·en 문구는 ui i18n |
| 6 | 동작 주석 | `get_asset_manifest` | 첫 실행이면 앱 시작 때 시딩돼 첫 호출부터 15항목이 올 수 있다 | — | — | 비파괴 |
| 7 | 등록 | `lib.rs` `generate_handler!` | 새 command 2개 등록. `lib.rs`는 core 소관이라 bridge-implementer가 가드에 막힌 전례(contract.md:853)가 있다 — §3.10.7 확인 필요 1 | — | — | — |

- 반영 순서: core(추가만 — bridge 컴파일 영향 없음) → bridge → ui. 파괴 변경 없음(`import_asset`·`remove_asset`·`assets://changed` 불변).

#### 3.10.7 결정·파급·확인 필요 (§11 증분)

| # | 결정 | 대안 | 채택 근거 |
|---|---|---|---|
| **D33** | 저장 경로를 새로 만들지 않고 `import`에서 **`import_bytes`를 추출**해 시딩·복원이 공유 | 시딩 전용 일괄 쓰기(매니페스트 1회 저장) | 검증·캔버스·url 버전 규칙이 사용자 등록과 한 벌이다. 15회 매니페스트 저장은 첫 실행 1회뿐이고 목표(≤150 ms) 안에 든다(실측으로 확인) |
| **D34** | `DEFAULT_ASSETS`는 **`pub static` 배열 + `const fn simple`** | `OnceLock` 지연 초기화(패킷 허용 대안) | `AssetSlot`의 모든 변형이 상수식이다. 지연 초기화가 필요 없고 표가 컴파일 시 고정된다 |
| **D35** | `default_bytes`는 **`file_key` 기준** 비교 | `AssetSlot ==` 비교 | 패킷 지정. `AssetManifest::find`와 같은 기준이라 「같은 슬롯」의 정의가 한 곳이다 |
| **D36** | 시딩은 조건이 하나라도 어긋나면 **한 장도 쓰지 않고**, 시딩 중 한 장 실패는 기록 후 계속 | 실패 시 롤백 / 다음 시작에 재시도 | 롤백은 삭제 코드가 필요하다(앱 데이터 삭제 정책과 충돌). 재시도는 S2(슬롯마다 채움, 기각)와 같아진다. 부분 시딩 후 다음 시작은 `NotEmpty`로 건너뛴다 — 로그로 드러난다 |
| **D37** | `lib.rs` 호출은 **비공개 도우미 `seed_default_assets`** 한 줄 | setup 안에 로그 코드 인라인 | `run()`이 이미 50줄을 넘는다(기존 부채). 늘리지 않는다 |
| **D38** | 내보내기 실패 코드는 **`AssetError::from(io).code()`** | 문자열 리터럴 `"asset.io"` | 코드 문자열 원본을 `code()` 하나로 둔다. 값은 같다 |
| **D39** | 충돌 검사는 `exists()`(폴더 포함) | 파일만 검사 | 같은 이름 폴더는 rename이 실패하므로 미리 알리는 편이 맞다. 패킷 E-partial 테스트는 `overwrite=true`로 부른다(§3.10.4) |
| **D40** | 새 테스트는 **통합 파일 `tests/default_assets.rs`** | `defaults.rs`·`export.rs` 안 `#[cfg(test)]` | 패킷 지정. 공개 API만으로 검증되고 `mod.rs`(약 745줄)에 부담이 없다 |

파급(Grep 2026-09-24):

| 파일 | 변경 | 소관 |
|---|---|---|
| `src-tauri/src/assets/mod.rs` | `pub mod defaults; pub mod export;`, `import_bytes` 추출, 변형 2·`code()` 2팔, `//!` | core-implementer |
| `src-tauri/src/assets/{defaults,export}.rs` | 신규 | core-implementer |
| `src-tauri/src/lib.rs:66-67` 사이 + 도우미 | 시딩 1줄 | core-implementer |
| `src-tauri/tests/default_assets.rs` | 신규 | core-implementer |
| `src-tauri/src/bridge/**`, `error.rs` | 없음(이번 패킷). 새 command는 bridge 패킷 | bridge |
| `import` 호출자 `bridge/commands.rs:211`, `examples/import_sample.rs` | 없음(시그니처 불변) | — |

확인 필요:

1. **새 command의 `generate_handler!` 등록 주체.** `lib.rs`는 core 소관이다. bridge 패킷이 command를 만든 뒤 등록 2줄을 core-implementer가 넣을지, bridge-implementer에게 그 2줄만 허락할지 관리자가 정해야 한다.
2. **시딩 도중 강제 종료.** 첫 실행 약 100 ms 안에 앱이 죽으면 일부 PNG만 있고 매니페스트가 없을 수 있다. 다음 시작은 `FilesPresent`로 건너뛴다. 설계는 사용자 파일 보호를 우선했고, 이 경우 사용자가 카드에서 복원하면 된다. 더 강한 처리가 필요하면 요구로 올린다.
3. `import`의 제자리 쓰기(`fs::write`, 비원자적 — D-SV3·CORE-002)는 `import_bytes`로 그대로 넘어간다. 이번 범위 밖이다.

### 3.11 CR-036 — 팔·손 파츠 크기 자유 (🔒 2026-09-25, 확정사항 §6, 구현자가 그대로 옮길 것)

결론: 파츠 두 그룹(팔 = `is_mouse_part()`, 손 = `is_pen_part()`)은 **그룹 안 크기 비교를 하지 않는다.** 검사는 1~4단계(시그니처·RGBA·≤1MB·≤900×700)뿐이다. 5단계(같은 크기)는 **캔버스 레이어에만** 남는다. 공개 함수 시그니처는 그대로이고, 오류 변형 2개가 사라진다.

비유: 팔 카드·손 카드 서랍에서 "카드끼리 크기를 맞추라"는 스티커를 떼어 낸다. 카드마다 서랍 입구(≤900×700·1MB)만 통과하면 되고, 붙일 자리는 어깨축·손 위치 탭에서 맞춘다. 큰 투명 필름 묶음(캔버스 레이어)의 "같은 크기" 스티커는 그대로다.

#### 3.11.1 검증 규칙 (§3.5 표·§3.8 5행 대체)

| 순서 | 검사 | 캔버스 레이어 | 팔 파츠 | 손 파츠 | 실패 |
|---|---|---|---|---|---|
| 1 | PNG 시그니처(`parse_png_header`) | 같음 | 같음 | 같음 | `NotPng`·`BadHeader` |
| 2 | 비트 깊이 8 · 색상 타입 6 | 같음 | 같음 | 같음 | `NotRgba` |
| 3 | ≤ 1 MB(`ASSET_MAX_BYTES`) | 같음 | 같음 | 같음 | `TooManyBytes` |
| 4 | 1 ≤ 가로 ≤ 900, 1 ≤ 세로 ≤ 700 | 같음 | 같음 | 같음 | `TooLarge` |
| 5 | 기준 크기 일치 | 기준 = 캔버스(불변) | **검사 없음** | **검사 없음** | `CanvasMismatch`(캔버스 레이어만) |

- 파츠는 여전히 캔버스를 정하지 않는다(`is_canvas_layer()` 불변 → `recompute_canvas`·창 리사이즈 판정 불변).
- 손 기준점(`compute_hand_anchor`)은 `mouse_base`만 읽는다(불변). §11 확인 필요 C36-1.
- 옛 매니페스트: 규칙 완화라 기존 매니페스트는 모두 유효하다. 마이그레이션 없음(D33).

#### 3.11.2 `mod.rs` 변경

```rust
// AssetError — 두 변형 삭제(#[error] 줄 포함)
//   MousePartMismatch { w, h, mw, mh }   ← 삭제
//   PenPartMismatch { w, h, pw, ph }     ← 삭제

// code() — 팔 정리
            Self::CanvasMismatch { .. } => "asset.canvas_mismatch",

// validate() 마지막 match — 기준 크기 비교는 캔버스 레이어만(CR-036). 파츠는 group_size 가 Some 이어도 무시.
    match group_size {
        Some(g) if slot.is_canvas_layer() && (g.width != w || g.height != h) => {
            Err(AssetError::CanvasMismatch { w, h, cw: g.width, ch: g.height })
        }
        _ => Ok(()),
    }

// fn mismatch_error(..) — 삭제(변형이 하나뿐)

/// 같은 크기 규칙의 기준 크기. 캔버스 레이어만 — 다른 캔버스 레이어가 있을 때 캔버스.
/// 팔·손 파츠는 크기 자유(CR-036)라 항상 None.
fn group_size(manifest: &AssetManifest, slot: &AssetSlot) -> Option<CanvasSize> {
    if !slot.is_canvas_layer() {
        return None;
    }
    let key = slot.file_key();
    manifest
        .entries
        .iter()
        .any(|e| e.slot.file_key() != key && e.slot.is_canvas_layer())
        .then_some(manifest.canvas)
        .flatten()
}
```

- 문서주석: `validate`의 `group_size` 설명 → "캔버스 레이어의 기준 크기(캔버스). 파츠 슬롯이면 무시(CR-036)". `mod.rs` `//!` [캔버스 규칙](32행 부근) → "팔·손 파츠는 상한만 검사(크기 자유, CR-036)". 454행 부근 테스트 주석의 `MousePartMismatch` 언급 삭제.
- `mouse_part_tests.rs`·`pen_part_tests.rs` `//!` [목적]에서 두 변형 이름을 빼고 "크기 자유(CR-036)"를 적는다.
- `slot.rs`: 코드 불변. `is_pen_part`·`SimpleSlot::PenUp` 등 문서주석의 "펜 그림끼리 같은 크기" → "크기 자유(CR-036)".
- 줄 수: `mod.rs` 약 −30줄.

#### 3.11.3 에러 (§6 대체분)

| 변형 | 상태 |
|---|---|
| `MousePartMismatch { w, h, mw, mh }` | **삭제(CR-036)** |
| `PenPartMismatch { w, h, pw, ph }` | **삭제(CR-036)** |
| `CanvasMismatch { w, h, cw, ch }` | 불변 — `asset.canvas_mismatch`의 유일한 발생원 |

에러 코드 목록 불변(`asset.canvas_mismatch` 유지). bridge `error.rs`는 `code()`·`to_string()`만 쓰므로 코드 변경 없음.

#### 3.11.4 bridge·ui 요구 (§9 증분 — 계약 확정은 bridge-designer)

- 호환성: **완화**(TS 타입·IPC·저장 데이터 불변).
- 계약 §6 `ASSET_CANVAS_MISMATCH` 발생 조건: "마우스 파츠끼리"·"펜 그림끼리"를 지우고 "캔버스 레이어가 캔버스와 크기 다름"만 남긴다.
- 계약 §3.1 슬롯 표: 마우스 파츠·펜 행의 "셋이 같은 크기"/"펜 그림끼리 같은 크기" → "≤900×700·≤1MB, 크기 자유(CR-036)".
- 계약 변경 이력: "팔·손 파츠 크기 규칙 폐기(CR-036 — 완화)".
- ui(요구만, ui-manager 인계): 설정 창 카드·안내 문구에 파츠 "같은 크기" 안내가 있으면 삭제. `src/`(TS)는 이번에 Grep하지 않았다.

#### 3.11.5 파급 (Grep 2026-09-25)

| 파일 | 변경 | 담당 |
|---|---|---|
| `src-tauri/src/assets/mod.rs` | 변형 2개·`code()` 팔·`mismatch_error` 삭제, `validate`·`group_size` 교체, 주석 | core-implementer |
| `src-tauri/src/assets/mouse_part_tests.rs` | `MousePartMismatch` 단언 3곳 반전(§8.11) | core-implementer |
| `src-tauri/src/assets/pen_part_tests.rs` | `PenPartMismatch` 단언 3곳 반전·신규 테스트(§8.11) | core-implementer |
| `src-tauri/src/assets/slot.rs` | 문서주석만 | core-implementer |
| `src-tauri/src/bridge/**` | 두 변형 참조 없음 — 변경 없음 | — |
| `doc/200_설계/bridge/contract.md` §3.1·§6·변경 이력 | §3.11.4 | bridge-designer |

### 3.12 CR-037 — 헤어(뒷머리) 슬롯 `hair` (🔒 2026-09-25, 확정사항 §6, 구현자가 그대로 옮길 것)

결론: `SimpleSlot`에 변형 **`Hair` 하나**와 `file_key` 팔 하나만 더한다. 분류 함수가 "마우스 파츠·펜 그림이 아니면 캔버스 레이어"이므로 헤어는 **코드 변경 없이** 배경·키보드와 같은 크기 규칙(≤900×700·≤1MB·캔버스 일치)을 받는다. 내장 기본 표(`DEFAULT_ASSETS`)에 넣지 않으므로 `has_default`는 자동으로 거짓, 시딩·내보내기 대상도 아니다.

비유: 투명 필름 묶음에 "뒷머리 필름" 한 장 칸을 새로 만든다. 규격은 배경 필름과 똑같고, 칸이 비어 있어도 되며, 견본 필름(내장 기본)은 없다. 필름을 몇 번째로 겹칠지(배경 바로 위, 팔 아래)는 무대(ui)가 정한다 — 서랍(assets)은 규격대로 보관만 한다.

#### 3.12.1 `slot.rs` 변경

```rust
pub enum SimpleSlot {
    /// 배경(OV-R-17, CR-014) — 맨 아래 캔버스 레이어, 선택. `is_canvas_layer() == true`.
    Background,
    /// 헤어(뒷머리, CR-037) — 캔버스 레이어(배경·키보드와 같은 크기), 1장 고정, 선택,
    /// 내장 기본 없음. 직렬화 "hair". 겹침 순서(아래→위)는 ui 몫 — 현재(CR-051) 헤어 → 배경 →
    /// 뽀모도(인물 → 말풍선 → 시간 글자) → 팔 → 본체 → 펜 손(overlay design/functions.md, HairLayer 행).
    Hair,
    Body,
    // (2026-09-30 doc-sync) 현재 소스 slot.rs:30 주석은 아직 CR-037 순서 「배경 → 헤어 → 팔·손 → 본체」 — 코드 주석 정정 필요.
    // … 나머지 변형 글자 그대로 …
}

// file_key() 의 Self::Simple(s) 분기, Background 팔 바로 아래 1팔 추가:
//     SimpleSlot::Hair => "hair",
```

- `is_mouse_part`·`is_pen_part`·`is_canvas_layer` 본문 **불변**(Hair는 앞의 둘에 없으므로 캔버스 레이어).
- 선언 위치(Background 다음)는 겹침 순서를 읽기 쉽게 하려는 것뿐이다. `SimpleSlot`은 `Ord`를 derive하지 않고 serde는 이름으로 직렬화하므로 위치는 동작·저장 형식에 영향 없다.
- `//!` 문서주석에 한 줄 추가: `//! [헤어 슬롯] CR-037 — "hair" 1장, 캔버스 레이어·선택·내장 기본 없음(DEFAULT_ASSETS 비포함).` [테스트] 줄에 "H1~H4(§3.12.5)".
- `mod.rs`·`manifest_load.rs`·`defaults.rs`·`export.rs`·`anchor.rs`·`url.rs`: **코드 변경 없음**. `mod.rs` `//!` [슬롯] 목록에 `hair`가 나열돼 있으면 한 단어 추가(없으면 생략).

#### 3.12.2 규칙·호환

| 항목 | 동작 |
|---|---|
| 검증 1~5단계 | 캔버스 레이어 열 그대로(§3.11.1). 다른 캔버스 레이어와 크기 다르면 `CanvasMismatch`(`asset.canvas_mismatch`) |
| 캔버스 결정 | 캔버스 레이어가 하나도 없을 때 헤어를 먼저 넣으면 그 크기가 캔버스(§3.4-1·3과 같음). 헤어가 마지막 캔버스 레이어로 지워지면 `canvas = None` |
| 창 리사이즈 | bridge가 `is_canvas_layer()`로 판정 → 헤어 등록·삭제도 트리거(bridge 코드 변경 없음) |
| 손 기준점 | `compute_hand_anchor`는 `mouse_base`만 읽는다 — 헤어 무관 |
| 옛 manifest.json(헤어 없음) | 그대로 읽힘. 마이그레이션 없음 |
| 새 manifest(헤어 있음)를 옛 앱이 읽음 | CR-019 관대한 로드(§3.6)로 `hair` 항목만 건너뜀(경고 로그), 캔버스 재계산. 옛 앱이 다음 등록·삭제 시 항목이 빠지고 `hair.png`는 남음 → 되돌리기 안전 |
| untagged 해석 | `"hair"`는 문자열이라 `Simple`로만 맞는다(`KbDown`·`PenDown`은 객체) — 해석 순서 충돌 없음 |
| 기본값·시딩·내보내기 | `DEFAULT_ASSETS`(15장) 불변 → `default_bytes(&Hair) == None`, `has_default` 거짓, `seed_if_empty`는 헤어를 만들지 않음(시딩 조건 「같은 이름 파일 없음」도 15장 기준 불변), `export_defaults`는 15장 그대로. `restore_default(dir, Hair)` → `Err(NoDefault("hair"))`, 파일·매니페스트 무변경. 「기본값」 = `remove`(DA-04 규칙, ui 몫) |
| 필수 판정 | core는 필수 슬롯을 검사하지 않는다(불변). 필수 3장(SV2-08)에 들지 않음 |

#### 3.12.3 설정 의존

없음. 위치 조정 없음(캔버스 레이어)이라 settings 필드를 새로 두지 않는다. [settings.md](settings.md) 변경 없음.

#### 3.12.4 `src-tauri/examples/import_sample.rs`

- `parse_slot`의 `"background"` 팔 아래에 `"hair" => simple(SimpleSlot::Hair),` 1팔 추가.
- 3행 문서주석 slot 목록에 `hair` 추가: `//! slot: background hair body idle rest kb_up kb_down_N mouse_base mouse_left mouse_right`.
- 추가하지 않으면 컴파일은 되지만 `hair=path` 인자가 파서의 기타 분기에서 `None` → 개발용 등록 불가.

#### 3.12.5 테스트 (§8 증분)

| ID | 위치 | 조건 | 기대 |
|---|---|---|---|
| H1 | `slot.rs` `#[cfg(test)]` 단위 | `AssetSlot::Simple(SimpleSlot::Hair)` 직렬화·역직렬화 왕복 | JSON `"hair"`, 왕복 동일, `file_key() == "hair"` |
| H2 | 같음, 단위 | 분류 | `is_canvas_layer()` 참, `is_mouse_part()`·`is_pen_part()` 거짓 |
| H3 | 같음, 단위 | `load_manifest` 대상 JSON(`{"canvas":{"width":900,"height":700},"entries":[{"slot":"hair",…},{"slot":{"kind":"kb_down","index":0},…}]}`)을 tempdir에 쓰고 로드 | 두 항목 모두 해석, `find(&Simple(Hair))` 있음, 경고로 건너뛴 항목 0(canvas 원값 유지). 헤어 없는 옛 매니페스트는 `find` → `None` |
| H4 | 같음, tempdir | ① 빈 폴더에 헤어 600×400 `import` ② 같은 폴더에 `kb_up` 600×400 ③ 헤어를 500×400으로 재등록(다른 캔버스 레이어 있음) ④ `remove(Hair)` ⑤ `kb_up`도 제거 | ① canvas = 600×400, `hair.png` 생성 ② Ok ③ `Err(CanvasMismatch)`, 기존 `hair.png`·매니페스트 불변 ④ 항목 빠짐, canvas 유지 ⑤ canvas = `None` |
| D-H1 | `src-tauri/tests/default_assets.rs` 통합 | `has_default(&Simple(Hair))`, `default_bytes`, `restore_default(tempdir, Hair)` | 거짓 / `None` / `Err(e)` 이고 `e.code() == "asset.no_default"`, 폴더에 `hair.png`·manifest.json 생기지 않음 |
| D-H2 | 같음 | 빈 tempdir `seed_if_empty` | `Seeded { count: 15, .. }`, 매니페스트에 `hair` 항목 없음, `hair.png` 없음 |

- 합성 PNG는 기존 테스트 도우미(RGBA 헤더 바이트 생성)를 재사용한다 — 새 도우미 불필요.
- `slot.rs` 줄 수: 406 + 약 70 ≈ 480(800 한계 안).
- 완료 기준(스킬 §9): `cargo fmt --check`·`cargo clippy -- -D warnings` 0·`cargo test` 전건 PASS·`cargo check --examples` 통과.
- 수동: 없음(검증·저장 로직만, 표시는 ui 검증).

#### 3.12.6 bridge 요구 명세 (§9 증분 — 계약 확정은 bridge-designer)

- 호환성: **추가**(IPC·저장 데이터 비파괴, 새 command·event·에러 코드 없음).
- TS `src/bridge/types.ts` `AssetSlot` 유니언에 **`'hair'`** 추가(Rust 직렬화 `"hair"`와 일치). `slotKey`(`file_key`와 같은 규칙)가 문자열 슬롯을 그대로 돌려주면 변경 없음, 슬롯별 분기면 `'hair' → 'hair'` 추가. `src/bridge/__tests__/types.test.ts` 슬롯 목록 단언이 있으면 갱신.
- 계약 §3.1 슬롯 표에 행: `"hair"` — 캔버스 레이어, 선택, 1장, 내장 기본 없음, 크기 규칙 = 배경과 같음(`ASSET_CANVAS_MISMATCH`). §5.1(슬롯 목록이 있는 절)도 같은 행.
- 기존 command(`import_asset`·`remove_asset`·`get_manifest`·기본값 복원) 인자 모양 불변 — 슬롯 값 하나가 늘 뿐. 기본값 복원 command에 `'hair'`가 오면 `ASSET_NO_DEFAULT`(ui는 부르지 않고 `remove_asset`을 쓴다). 계약/TS에 "기본 있는 슬롯" 목록(`hasDefault` 대응)이 있으면 `'hair'`는 **넣지 않는다**.
- 창 리사이즈 판정(`is_canvas_layer`) 자동 포함 — bridge Rust 코드 변경 없음(Grep `SimpleSlot::` bridge 4건은 개별 변형 참조로 보임, 전수 `match`가 있으면 `cargo check`에서 드러남).
- ui(요구만, ui-manager 인계): 이미지 설정 탭 헤어 카드(선택, 「기본값」=비우기 확인), 오버레이 겹침 배경 → 헤어 → 팔·손 → 본체, 젤리·부르르는 본체와 함께(배경만 고정) — 확정사항 §6.

#### 3.12.7 결정·파급·확인 필요 (§11 증분)

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| D34 | 헤어 = `SimpleSlot` 변형(캔버스 레이어) | 새 그룹(`is_hair_part`) | 확정사항 「배경·키보드와 같은 크기」 = 캔버스 레이어 규칙 그대로 → 분류·검증·캔버스 코드 0줄 변경 |
| D35 | `DEFAULT_ASSETS` 불변(15장), `defaults.rs` 코드 변경 없음 | `Hair`를 명시 제외하는 분기 | `default_bytes`가 `file_key`로 표를 찾으므로 표에 없으면 자동으로 기본 없음 — 분기 추가는 요구 없는 코드 |
| D36 | 겹침 순서·젤리 소속을 core에 두지 않음(순서 필드·상수 없음) | 매니페스트에 z-order | assets는 합성 금지(스킬 §1), 표시 순서는 ui 상수 |

파급(Grep 2026-09-25):

| 파일 | 변경 | 담당 | 깨짐 여부 |
|---|---|---|---|
| `src-tauri/src/assets/slot.rs` | 변형 1·`file_key` 1팔·`//!`·H1~H4 | core-implementer | — |
| `src-tauri/examples/import_sample.rs` | 파서 1팔·주석(§3.12.4) | core-implementer | 안 깨짐(누락 시 기능만 빠짐) |
| `src-tauri/tests/default_assets.rs` | D-H1·D-H2 추가 | core-implementer | — |
| `src-tauri/src/bridge/commands.rs`(4건) | 없음(예상) — `cargo check`로 확인 | — | 전수 match 있으면 깨짐 |
| `src/bridge/types.ts`·`__tests__/types.test.ts`, `contract.md` | §3.12.6 | bridge-designer·bridge-implementer | TS 유니언 누락 시 ui가 `'hair'` 못 씀 |
| `tests/sample_assets.rs`·`tests/mouse_area_defaults.rs` | 없음(특정 변형 참조) | — | — |

확인 필요:

- **C37-1** 요구ID 미부여 — 추적은 `CR-037`로 했다. 화면 요구 문서(`src/settings/requirements.md`·`src/overlay/requirements.md`)에 ID가 붙으면 §1·§3.12.8을 갱신.
- **C37-2** 헤어 그림만 있고 다른 캔버스 레이어가 없을 때 헤어가 캔버스를 정한다(배경과 같은 규칙). 확정사항 문구와 모순 없음으로 판단 — 이의 있으면 사용자 판단.

#### 3.12.8 요구 추적 (§10 증분)

| 요구 | 반영 절 | 상태 |
|---|---|---|
| CR-037 슬롯 `hair` 추가 | §2·§3.12.1 | ✅ 설계 |
| CR-037 캔버스 레이어(같은 크기, 위치 조정 없음) | §3.12.2·§3.12.3 | ✅ 설계 |
| CR-037 선택·내장 기본 없음(「기본값」=비우기) | §3.12.2(`DEFAULT_ASSETS` 불변) | ✅ 설계 |
| CR-037 1장 고정 | §3.12.1(단일 변형, 순번 없음) | ✅ 설계 |
| CR-037 겹침 순서·젤리 | §3.12.6 ui 요구 | 범위 밖(ui) |
| 매니페스트 호환 | §3.12.2 | ✅ 설계 |

### 3.13 CR-045 — 뽀모도 슬롯 `pomo_char`·`pomo_bubble` (🔒 2026-09-26, 확정사항 §6 「뽀모도 타이머」, PT-01, 구현자가 그대로 옮길 것)

결론: `SimpleSlot`에 변형 **`PomoChar`·`PomoBubble` 둘**과 `file_key` 팔 둘만 더한다. hair(§3.12)와 완전히 같은 방식이다 — 분류 함수가 부정형(`!is_mouse_part && !is_pen_part`)이라 두 슬롯은 **코드 변경 없이** 캔버스 레이어 규칙(≤900×700·≤1MB·캔버스 일치)을 받고, `DEFAULT_ASSETS`에 넣지 않으므로 내장 기본이 없다.

비유: 투명 필름 묶음에 "두 번째 캐릭터 필름"과 "말풍선 필름" 칸 두 개를 새로 만든다. 규격은 배경 필름과 똑같고, 비어 있어도 되며, 견본 필름은 없다. 몇 번째로 겹칠지(배경 바로 위)와 말풍선 위에 시간을 쓰는 일은 무대(ui)와 타이머([timer.md](timer.md))가 한다 — 서랍(assets)은 규격대로 보관만 한다.

#### 3.13.1 `slot.rs` 변경

```rust
pub enum SimpleSlot {
    /// 배경(OV-R-17, CR-014) — 맨 아래 캔버스 레이어, 선택. `is_canvas_layer() == true`.
    Background,
    /// 헤어(뒷머리, CR-037) — … (기존 글자 그대로)
    Hair,
    /// 뽀모도 인물(두 번째 캐릭터, CR-045 PT-01) — 캔버스 레이어(배경과 같은 크기), 1장 고정, 선택,
    /// 내장 기본 없음. 직렬화 "pomo_char". 겹침(배경 → 인물 → 말풍선 → 시간 글자 → 본체)·고정 표시는 ui 몫.
    PomoChar,
    /// 뽀모도 말풍선(CR-045 PT-01) — 캔버스 레이어, 1장 고정, 선택, 내장 기본 없음. 직렬화 "pomo_bubble".
    PomoBubble,
    Body,
    // … 나머지 변형 글자 그대로 …
}

// file_key() 의 Self::Simple(s) 분기, Hair 팔 바로 아래 2팔 추가:
//     SimpleSlot::PomoChar => "pomo_char",
//     SimpleSlot::PomoBubble => "pomo_bubble",
```

- `#[serde(rename_all = "snake_case")]`(기존)라 직렬화 이름은 `"pomo_char"`·`"pomo_bubble"`로 자동이다 — 변형별 `#[serde(rename)]` 불필요.
- `is_mouse_part`·`is_pen_part`·`is_canvas_layer` 본문 **불변**.
- 선언 위치(Hair 다음)는 읽기 순서일 뿐이다(`Ord` derive 없음, serde는 이름 기준) — 동작·저장 형식 영향 없음.
- `//!` 문서주석: [헤어 슬롯] 줄 아래에 `//! [뽀모도 슬롯] CR-045(PT-01) — "pomo_char"·"pomo_bubble" 각 1장, 캔버스 레이어·선택·내장 기본 없음(DEFAULT_ASSETS 비포함).` 추가, [테스트] 줄에 "PM1~PM3(§3.13.5)" 추가. 1행 [목적]의 CR 나열에 `CR-045 뽀모도 2개`를 더해도 된다.
- 줄 수: 518 + 약 55(코드 6·테스트 ~50) ≈ 575 — 800 한계 안이라 **`slot/tests.rs` 분리는 하지 않는다**(패킷 §1 선택 조항 미사용).
- `mod.rs`·`manifest_load.rs`·`defaults.rs`·`export.rs`·`anchor.rs`·`url.rs`: **코드 변경 없음**. `mod.rs` `//!`에 슬롯 이름 나열이 있으면 두 단어 추가(없으면 생략).

#### 3.13.2 규칙·호환 (hair §3.12.2와 같다)

| 항목 | 동작 |
|---|---|
| 검증 1~5단계 | 캔버스 레이어 열 그대로(§3.11.1). 다른 캔버스 레이어와 크기가 다르면 `CanvasMismatch`(`asset.canvas_mismatch`) |
| 캔버스 결정 | 캔버스 레이어가 하나도 없을 때 먼저 넣으면 그 크기가 캔버스. 마지막 캔버스 레이어로 지워지면 `canvas = None` |
| 창 리사이즈 | bridge가 `is_canvas_layer()`로 판정 → 등록·삭제도 트리거(bridge 코드 변경 없음, hair와 같음 — 패킷 §1 주의) |
| 손 기준점 | `compute_hand_anchor`는 `mouse_base`만 읽는다 — 무관 |
| 옛 manifest.json(뽀모도 없음) | 그대로 읽힘. 마이그레이션 없음 |
| 새 manifest를 옛 앱이 읽음 | CR-019 관대한 로드(§3.6)로 `pomo_*` 항목만 건너뜀(경고 로그), 캔버스 재계산. 파일은 남음 → 되돌리기 안전 |
| untagged 해석 | 두 이름은 문자열이라 `Simple`로만 맞는다 — 해석 순서 충돌 없음 |
| 기본값·시딩·내보내기 | `DEFAULT_ASSETS`(6장, CR-044) 불변 → `default_bytes == None`, `has_default` 거짓, `seed_if_empty`는 만들지 않음, `export_defaults`는 6장 그대로. `restore_default(dir, PomoChar)` → `Err(NoDefault("pomo_char"))`, 파일·매니페스트 무변경. 「기본값」 = `remove`(ui `resetKind: 'clear'`) |
| 필수 판정 | core는 필수 슬롯을 검사하지 않는다(불변). 필수 2장(`kb_up`·`mouse_base`, CR-043)에 들지 않음 |

#### 3.13.3 설정 의존

없음. 두 슬롯은 위치 조정이 없다(캔버스 레이어). 시간 글자 위치·회전·크기·색은 슬롯이 아니라 [settings.md](settings.md) §3.8 `timer.*`이다.

#### 3.13.4 `src-tauri/examples/import_sample.rs`

- `parse_slot`의 `"hair"` 팔(`:16`) 아래에 2팔 추가: `"pomo_char" => simple(SimpleSlot::PomoChar),` · `"pomo_bubble" => simple(SimpleSlot::PomoBubble),`.
- 3행 문서주석 slot 목록에 `pomo_char pomo_bubble` 추가(`hair` 다음).

#### 3.13.5 테스트 (§8 증분)

| ID | 위치 | 테스트 이름(권고) | 조건 | 기대 |
|---|---|---|---|---|
| PM1 | `slot.rs` `#[cfg(test)]` 단위 | `pomo_slots_serde_round_trip` | `AssetSlot::Simple(PomoChar)`·`Simple(PomoBubble)` 직렬화·역직렬화 | JSON `"pomo_char"`·`"pomo_bubble"`, 왕복 동일 |
| PM2 | 같음 | `pomo_slots_file_key` | `file_key()` | `"pomo_char"`·`"pomo_bubble"` |
| PM3 | 같음 | `pomo_slots_are_canvas_layers` | 분류 | `is_canvas_layer()` 참, `is_mouse_part()`·`is_pen_part()` 거짓 |
| D-PM1 | `src-tauri/tests/default_assets.rs` 통합 | `pomo_slots_have_no_builtin_default` | 두 슬롯 각각 `has_default`, `default_bytes`, `DEFAULT_ASSETS`에 같은 `file_key` 항목 유무, 빈 tempdir `restore_default` | 거짓 / `None` / 없음 / `Err(e)`·`e.code() == "asset.no_default"`, 폴더에 `pomo_*.png`·manifest.json 생기지 않음(D-H1 선례 `:356-372`) |

- 캔버스 일치·import/remove 동작은 hair H4가 같은 분류 경로를 이미 덮는다 — 슬롯별 중복 tempdir 테스트는 두지 않는다(분류 PM3이 그 경로로 들어감을 보증).
- 합성 PNG 도우미 추가 불필요. 수동: 없음(표시는 ui 검증).
- 완료 기준: `cargo fmt --check`·`cargo clippy -- -D warnings` 0·`cargo test` 전건 PASS·`cargo check --examples` 통과.

#### 3.13.6 bridge 요구 명세 (§9 증분 — 계약 확정은 bridge-designer)

- 호환성: **추가**(IPC·저장 데이터 비파괴, 새 command·event·에러 코드 없음 — 슬롯 쪽 한정. 타이머 command·event는 [timer.md](timer.md) §9).
- TS `AssetSlot` 유니언에 `'pomo_char'`·`'pomo_bubble'` 추가(Rust 직렬화와 일치). `slotKey`가 문자열 슬롯을 그대로 돌려주면 변경 없음. 슬롯 목록 단언 테스트가 있으면 갱신.
- 계약 §3.1·§5.1 슬롯 표에 2행: 캔버스 레이어, 선택, 1장, 내장 기본 없음, 크기 규칙 = 배경과 같음(`asset.canvas_mismatch`). "기본 있는 슬롯" 목록(`hasBuiltinDefault`·`DEFAULT_ASSET_SLOTS` 대응)과 `REQUIRED_SLOTS`에는 **넣지 않는다**.
- 기존 command(`import_asset`·`remove_asset`·`get_manifest`·기본값 복원) 인자 모양 불변. 기본값 복원에 두 슬롯이 오면 `asset.no_default`(ui는 부르지 않고 `remove_asset`).
- ui(요구만): 이미지 설정 탭 배경 그룹 카드 순서 background·hair·pomo_char·pomo_bubble(A-5), 오버레이 `PomodoroLayer`는 `.jellyWrap` 밖(고정) — 02-design §2.

#### 3.13.7 결정·파급·확인 필요 (§11 증분)

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| D37 | 두 슬롯 = `SimpleSlot` 변형(캔버스 레이어), hair와 같은 방식 | 뽀모도 전용 그룹(`is_pomo_part`) | 확정사항 「캔버스 레이어(배경과 같은 크기)」 = 기존 규칙 그대로 → 분류·검증·캔버스 코드 0줄 변경(D34 선례) |
| D38 | `DEFAULT_ASSETS` 불변, `defaults.rs` 변경 없음 | 명시 제외 분기 | `file_key`로 표를 찾으므로 표에 없으면 자동으로 기본 없음(D35 선례) |
| D39 | 겹침 순서·고정 여부를 core에 두지 않음 | 매니페스트 z-order·고정 플래그 | assets는 합성 금지(스킬 §1), 표시 순서는 ui 상수(D36 선례) |

파급(Grep 2026-09-26 — `SimpleSlot::Hair` 참조 파일 = `slot.rs`·`examples/import_sample.rs`·`tests/default_assets.rs` 3개뿐, bridge Rust에 `SimpleSlot` 전수 `match` 없음):

| 파일 | 변경 | 담당 | 깨짐 여부 |
|---|---|---|---|
| `src-tauri/src/assets/slot.rs` | 변형 2·`file_key` 2팔·`//!`·PM1~PM3 | core-implementer | — (`file_key`의 `match`는 전수라 팔 누락 시 컴파일 오류로 드러남) |
| `src-tauri/examples/import_sample.rs` | 파서 2팔·주석(§3.13.4) | core-implementer | 안 깨짐(누락 시 개발용 등록만 불가) |
| `src-tauri/tests/default_assets.rs` | D-PM1 추가 | core-implementer | — |
| `src/bridge/types.ts`·`contract.md` | §3.13.6 | bridge-designer·bridge-implementer | TS 유니언 누락 시 ui가 두 슬롯을 못 씀 |

확인 필요:

- **C45-1** 화면 요구ID는 ui-designer가 확정한다(현재 추적은 아키텍처 ID PT-01). 확정되면 §1·§3.13.8 갱신.

#### 3.13.8 요구 추적 (§10 증분)

| 요구 | 반영 절 | 상태 |
|---|---|---|
| PT-01 슬롯 `pomo_char`·`pomo_bubble` 추가 | §2·§3.13.1 | ✅ 설계 |
| PT-01 캔버스 레이어(배경과 같은 크기) | §3.13.2 | ✅ 설계 |
| PT-01 선택·내장 기본 없음 | §3.13.2(`DEFAULT_ASSETS` 불변) | ✅ 설계 |
| PT-02 겹침 순서·고정·항상 보임 | §3.13.6 ui 요구 | 범위 밖(ui) |
| 매니페스트 호환 | §3.13.2 | ✅ 설계 |

### 3.14 CR-047 — manifest `fileName` 불신·가져오기 크기 선검사·매니페스트 원자적 쓰기 (SEC-002·SEC-003·CORE-002, 🔒 확정사항 §6 「점검 후 정리」 2026-09-26, 구현자가 그대로 옮길 것)

결론: ① 파일 경로는 **항상 슬롯에서 다시 만든다**(`{slot.file_key()}.png`). manifest.json의 `fileName`은 읽을 때 그 값과 같은지 대조만 하고, 다르면 그 항목을 건너뛴다(경고 로그). ② `import`는 원본 크기를 `metadata`로 먼저 보고 1MB를 넘으면 읽지 않으며, 읽을 때도 `take(1MB + 1)`로 상한까지만 읽는다. ③ `save_manifest`는 `settings::write_atomic`을 쓴다.

비유: 보관함 목록표(manifest)에 「이 칸 그림은 옆 건물 서류함에 있음」이라고 적혀 있어도 믿지 않는다. 칸 이름표(슬롯)로 서랍 번호를 직접 계산하고, 목록표의 서랍 번호가 계산과 다르면 그 줄은 위조로 보고 건너뛴다. 택배(원본 파일)는 송장 무게(metadata)를 먼저 보고 1kg이 넘으면 받지 않고, 받더라도 1kg + 한 줌까지만 꺼내 본다.

#### 3.14.1 근거 (verify-20260926-1821)

| ID | 위치 | 결함 |
|---|---|---|
| SEC-002 | `mod.rs:331`(`remove` — `assets_dir.join(entry.file_name)` 삭제), `anchor.rs:38`(`join(&entry.file_name)` 읽기), `manifest_load.rs:43`(`fileName`을 검사 없이 수용) | `"fileName": "..\\..\\x"`나 절대 경로가 든 manifest.json이면 앱 데이터 밖 파일을 지우거나 읽는다(`Path::join`은 절대 경로를 받으면 기준 경로를 버린다) |
| SEC-003 | `mod.rs:316`(`import` — `fs::read(src)`로 전체를 읽은 뒤 1MB 검사) | 수 GB 파일을 고르면 메모리 폭증·할당 실패 abort |
| CORE-002 | `mod.rs:267-276`(`save_manifest` — 고정 `manifest.json.tmp`, `remove_file` → `rename`) | 둘 사이에 죽으면 manifest.json이 없다 → 등록 그림 목록 전체 유실 |

`join` 전수(비테스트 코드, 2026-09-26 Grep): `mod.rs` 260·269·270(`MANIFEST_FILE` 상수)·294(`slot.file_key()` — 안전)·**331**, `anchor.rs` **38**, `defaults.rs:124`·`export.rs:51·79·80`(내장 상수 이름 — 안전). 신뢰할 수 없는 값을 쓰는 곳은 굵은 2곳뿐이다.

#### 3.14.2 SEC-002 — 파일 이름 재구성 + 불일치 항목 건너뛰기 (두 겹)

| 겹 | 위치 | 변경 |
|---|---|---|
| 1 (읽기 관문) | `manifest_load.rs parse_entry` | `serde_json::from_value::<AssetEntry>` 성공 뒤 `entry.file_name != super::stored_file_name(&entry.slot)`이면 `log::warn!("manifest.json 항목을 건너뜁니다(파일 이름이 슬롯과 다름, slot={key})")` 후 `None`. **로그에 `fileName` 값은 넣지 않는다**(위조 경로·사용자명 노출 방지). 건너뛴 항목이 있으면 기존 규칙대로 캔버스 재계산(`parse_manifest` 불변) |
| 2 (사용 지점) | `mod.rs remove`, `anchor.rs compute_hand_anchor` | `assets_dir.join(entry.file_name)` → `assets_dir.join(stored_file_name(&entry.slot))`. 메모리에서 만든 매니페스트(테스트·향후 코드)가 관문 1을 거치지 않아도 앱 데이터 밖으로 못 나간다 |

신규 비공개 도우미(`mod.rs`, 자식 모듈은 `super::stored_file_name`으로 호출):

```rust
/// 슬롯의 저장 파일 이름 — 경로는 항상 이것으로 만든다(manifest `fileName` 불신, SEC-002).
fn stored_file_name(slot: &AssetSlot) -> String {
    format!("{}.png", slot.file_key())
}
```

- `import_bytes`의 `format!("{}.png", slot.file_key())`(mod.rs:293)도 이 도우미로 바꾼다(한 규칙 한 곳).
- `file_key()`는 고정 문자열·`kb_down_{u32}`·`pen_down_{u32}`뿐이라 경로 구분자·`..`가 들어갈 수 없다(slot.rs:113-147).
- `AssetEntry.file_name` 필드·계약 `fileName`은 **그대로 둔다**(쓰기는 여전히 정규 이름, 읽기는 대조용).
- 호환: `import`/`import_bytes`는 처음부터 `{file_key}.png`로만 썼다 → 정상 매니페스트 항목은 건너뛰지 않는다(확인 필요 Q47-1).
- 건너뛴 항목의 파일은 지우지 않는다(§3.6 D21과 같은 원칙 — 읽기 경로에 부수 효과 없음). 다음 `import`/`remove`가 매니페스트를 다시 쓸 때 그 줄이 사라진다.
- (2026-09-30 presets) `stored_file_name`은 `pub(crate)`로 넓어진다 — 프리셋 폴더의 파일 경로도 같은 규칙 하나로 만든다(§3.18, 동작 불변).

#### 3.14.3 SEC-003 — 크기 선검사 + 상한 읽기

```rust
/// 원본 크기를 먼저 보고, 상한까지만 읽어 `import_bytes`로 넘긴다(SEC-003).
pub fn import(assets_dir: &Path, slot: AssetSlot, src: &Path) -> Result<AssetManifest, AssetError> {
    let len = fs::metadata(src)?.len();
    if len > ASSET_MAX_BYTES {
        return Err(AssetError::TooManyBytes { bytes: len });
    }
    let bytes = read_capped(src, ASSET_MAX_BYTES)?;
    import_bytes(assets_dir, slot, &bytes)
}

/// 최대 `max + 1`바이트만 읽는다. 넘으면 `TooManyBytes`(검사 뒤 파일이 커진 경우).
fn read_capped(src: &Path, max: u64) -> Result<Vec<u8>, AssetError> {
    let file = fs::File::open(src)?;
    let mut buf = Vec::new();
    file.take(max + 1).read_to_end(&mut buf)?;
    let n = buf.len() as u64;
    if n > max {
        return Err(AssetError::TooManyBytes { bytes: n });
    }
    Ok(buf)
}
```

- `use std::io::Read;` 추가. 공개 시그니처 `import` 불변, 에러 변형·code 불변(`asset.too_many_bytes`).
- **검사 순서 변화(수용, D47-2):** 1MB를 넘는 파일은 PNG가 아니어도 `TooManyBytes`가 먼저 나온다(이전: `NotPng`). 1MB 이하는 순서 불변(시그니처 → IHDR → RGBA → 용량 → 크기 → 캔버스). 스킬 §7 순서는 「읽은 바이트」의 검증 순서이고, 크기 선검사는 읽기 전 안전장치라 앞에 둔다.
- `metadata`가 거짓이거나 검사 뒤 파일이 커져도 `take`가 메모리를 `max + 1`로 묶는다. 이때 메시지 바이트 수는 `1048577`(실제보다 작을 수 있음) — 드문 경쟁 조건이라 수용.
- `import_bytes`(내장 기본 시딩·복원)는 입력이 exe 안 상수라 변경 없음.
- (2026-09-30 presets) `read_capped`는 `pub(crate)`로 넓어진다 — 프리셋 저장·검증기가 같은 상한 읽기를 쓴다(§3.18, 동작 불변). `recompute_canvas`·`versioned_asset_url`도 같은 절.

#### 3.14.4 CORE-002 — 매니페스트 원자적 쓰기

```rust
pub fn save_manifest(assets_dir: &Path, manifest: &AssetManifest) -> Result<(), AssetError> {
    let json = serde_json::to_string_pretty(manifest)?;
    crate::settings::write_atomic(&assets_dir.join(MANIFEST_FILE), json.as_bytes())?;
    Ok(())
}
```

- `write_atomic`이 폴더 생성·고유 임시 파일·`sync_all`·교체 rename·실패 정리를 맡는다([settings.md](settings.md) §3.9.4). `fs::create_dir_all`·`remove_file`·고정 `.tmp` 삭제. 의존 방향 `assets → settings`(스킬 §1 허용, 기존 `settings::Point` 사용과 같은 방향).
- 오류는 `std::io::Error` → `AssetError::Io`(`asset.io`, 기존).
- 후보(범위 밖, 만들지 않음): C47-1 PNG 본문 쓰기(`import_bytes`의 `fs::write(&dest, bytes)`)도 `write_atomic`으로 바꾸면 쓰기 도중 종료 시 반쪽 PNG가 남지 않는다. C47-2 로드 때 `url`도 정규 경로로 다시 만들기(`fileName`처럼 위조 가능하나 asset 프로토콜 범위 `$APPDATA/assets/**`가 막는다).

#### 3.14.5 파일·줄 수

`mod.rs`(704줄): `stored_file_name` 4줄, `read_capped` 12줄, `import` +4줄, `save_manifest` −5줄, `use std::io::Read`, `#[cfg(test)] mod security_tests;` → 약 725줄(800 한계 안). 새 테스트는 **신규 자식 파일 `assets/security_tests.rs`**. `manifest_load.rs`(226줄) +6줄, `anchor.rs` 1줄. `//!` 문서주석 [테스트]에 `security_tests.rs FN1~FN7·RC1~RC6` 추가.

#### 3.14.6 테스트 (= §8 증분, `security_tests.rs`)

| ID | 대상 | 조건 | 기대 |
|---|---|---|---|
| FN1 | `parse_manifest` | `body` 항목 `"fileName": "..\\..\\evil.png"` + 정상 `kb_up` | `body` 건너뜀, `kb_up`만 남음, 캔버스 = `kb_up` 크기 |
| FN2 | `parse_manifest` | `"fileName": "C:\\Windows\\win.ini"`(절대 경로) | 건너뜀 |
| FN3 | `parse_manifest` | `{"kind":"kb_down","index":3}` + `"kb_down_3.png"` | 유지(정상 항목 불변) |
| FN4 | `parse_manifest` | `body` + `"Body.png"`(대소문자 다름) | 건너뜀(엄격 비교) |
| FN5 | `remove` | tempdir `assets/manifest.json`에 `body` → `"../outside.png"`, `outside.png` 실제 존재 | `Err(NotFound("body"))`, `outside.png` **그대로 존재** |
| FN6 | `compute_hand_anchor` | 메모리 매니페스트 `mouse_base` 항목 `file_name: "../x.png"`, `assets/mouse_base.png`(불투명 픽셀) 존재, `../x.png` 없음 | `Ok(Some(_))` — 정규 파일을 읽음(바깥 경로 미접근) |
| FN7 | `import` → `remove` 왕복 | 정상 | 기존과 같음(파일 생성·삭제), `manifest.json.*.tmp` 없음 |
| RC1 | `import` | 원본 1MB + 1바이트(앞 29바이트 정상 RGBA 헤더) | `Err(TooManyBytes { bytes: 1048577 })`, `assets/` 안에 파일·manifest 없음 |
| RC2 | `import` | 정확히 1MB, 정상 헤더 900×700 | `Ok`, 항목 `bytes == 1048576` |
| RC3 | `read_capped` | 3MB 파일, `max = 1MB` | `Err(TooManyBytes { bytes: 1048577 })` — 상한까지만 읽음 |
| RC4 | `import` | 100바이트 비 PNG | `Err(NotPng)`(1MB 이하 순서 불변) |
| RC5 | `import` | 2MB 비 PNG | `Err(TooManyBytes { bytes: 2097152 })`(순서 변화 고정 — D47-2) |
| RC6 | `import` | 없는 경로 | `Err(Io)` |

기존 테스트 영향: `anchor.rs` I-계열·B14는 `manifest_with(.., file_name)`에 정규 이름(`mouse_base.png`·`background.png`)을 넘기면 불변. 비정규 이름을 넘기는 픽스처가 있으면 정규 이름으로 고친다(구현자 확인). 1MB 초과 비 PNG에 `NotPng`를 기대하는 기존 테스트가 있으면 RC5 규칙으로 고친다.

#### 3.14.7 bridge 요구 (= §9 증분, 계약 확정은 bridge-designer)

- 계약 모양·command·event·code 변경 없음.
- 동작 변화 2건(계약 §5 설명 보강 권고): `get_asset_manifest`·`assets://changed`의 `entries`에서 `fileName`이 `{슬롯 키}.png`와 다른 항목은 빠진다. `import_asset`은 1MB를 넘는 파일이면 PNG 여부보다 `asset.too_many_bytes`를 먼저 돌려준다.

#### 3.14.8 결정·확인 필요·추적 (= §10·§11 증분)

- **D47-1** 재구성 + 건너뛰기 두 겹(위임문의 「또는」 둘 다) — 관문 하나만 두면 메모리 매니페스트 경로가 열려 있다. 「재구성만」(불일치여도 항목 유지)은 항목의 크기·용량 값이 다른 파일 기준일 수 있어 채택 안 함.
- **D47-2** 크기 선검사를 PNG 검사보다 앞에(위 §3.14.3).
- **D47-3** 매니페스트 쓰기는 settings의 `write_atomic` 재사용(사본 금지).
- Q47-1 옛 배포본 매니페스트에 `{file_key}.png`가 아닌 `fileName`이 있었는지 — 설계 문서 이력(1차~11차)에는 다른 규칙이 없다. 있으면 그 항목은 빈 칸으로 보이고 다시 등록하면 복구된다.
- 추적: SEC-002 → §3.14.2 ✅(설계) · SEC-003 → §3.14.3 ✅(설계) · CORE-002(매니페스트) → §3.14.4 ✅(설계). 소스 반영(SEC-002 `manifest_load.rs`·`anchor.rs:38`, SEC-003 `read_capped`, CORE-002 `mod.rs:290-294` `settings::write_atomic`).

### 3.15 CR-048 — 알림음 저장소 `assets/sound.rs` (TM-08 저장소·TM-13, 🔒 패킷 §2.4, 아키텍트 결정 A-1, 구현자가 그대로 옮길 것)

결론: 알림음은 `AssetSlot`·매니페스트·PNG 경로와 **섞지 않고** 자식 모듈 `assets/sound.rs`에 둔다. 저장 이름은 `alarm.wav`·`alarm.mp3`·`alarm.ogg` 중 하나로 고정이고, 형식은 확장자가 아니라 **앞 바이트(매직)**로 판별한다. 보안 규칙(CR-047 SEC-002·SEC-003)과 원자적 쓰기(CORE-002)는 PNG와 같은 함수를 쓴다.

비유: 사진첩(매니페스트) 옆에 벨소리 칸 하나를 따로 둔다. 칸 이름표는 미리 붙어 있고(`alarm.*`), 사용자가 가져온 봉투의 이름은 보지 않는다. 봉투를 열어 첫 몇 글자를 보고 wav·mp3·ogg인지 가린다. 너무 두꺼운 봉투(1MB 초과)는 열어 보지도 않고 돌려보낸다.

#### 3.15.1 공개 API (`assets::sound`, `assets/mod.rs`에 `pub mod sound;`)

```rust
use std::path::Path;

use serde::{Deserialize, Serialize};

/// 알림음 형식. JSON "wav" | "mp3" | "ogg".
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AlarmFormat {
    Wav,
    Mp3,
    Ogg,
}

/// 저장된 알림음. JSON { "format", "bytes", "url" }.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlarmSound {
    pub format: AlarmFormat,
    pub bytes: u64,
    /// asset 프로토콜 URL + `?v={수정 시각 ms}`(`url::versioned_asset_url`, SV2-07과 같음).
    pub url: String,
}

pub const ALARM_MAX_BYTES: u64 = super::ASSET_MAX_BYTES; // 1 MiB

pub fn detect_format(bytes: &[u8]) -> Option<AlarmFormat>;
pub fn alarm_file_name(f: AlarmFormat) -> &'static str; // "alarm.wav" | "alarm.mp3" | "alarm.ogg"
pub fn current(assets_dir: &Path) -> Result<Option<AlarmSound>, SoundError>;
pub fn import(assets_dir: &Path, src: &Path) -> Result<AlarmSound, SoundError>;
pub fn remove(assets_dir: &Path) -> Result<(), SoundError>; // 멱등

#[derive(Debug, thiserror::Error)]
pub enum SoundError {
    #[error("wav·mp3·ogg 소리 파일이 아닙니다.")]
    NotAudio,
    #[error("알림음 파일은 1MB 이하여야 합니다. (현재 {bytes}바이트)")]
    TooManyBytes { bytes: u64 },
    #[error("알림음 파일을 읽거나 쓰지 못했습니다: {0}")]
    Io(#[from] std::io::Error),
}

impl SoundError {
    /// "sound.not_audio" | "sound.too_many_bytes" | "sound.io"
    pub fn code(&self) -> &'static str;
}
```

| 이름 | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `detect_format` | 파일 바이트 | 형식 또는 `None`(순수, §3.15.2) | 없음 | TM-08 |
| `alarm_file_name` | 형식 | 고정 파일 이름(순수) | 없음 | TM-08 |
| `current` | `assets/` 경로 | 있는 알림음 1개(여럿이면 수정 시각 최신), 없으면 `None` | `Io`(`NotFound` 외) | TM-08(조회 — 오버레이 재생 TM-07의 원천) |
| `import` | `assets/` 경로, 원본 파일 경로 | 저장된 `AlarmSound` | `TooManyBytes`·`NotAudio`·`Io` | TM-08 |
| `remove` | `assets/` 경로 | `()` — 없어도 성공 | `Io`(`NotFound` 외) | TM-08 |
| `SoundError::code` | — | code 문자열 3종 | 없음 | TM-13 |

#### 3.15.2 형식 판별 (02-design §6.2 그대로, 확장자는 보지 않는다)

| 형식 | 조건 |
|---|---|
| wav | 길이 ≥ 12, `[0..4] == b"RIFF"`, `[8..12] == b"WAVE"` |
| ogg | 길이 ≥ 4, `[0..4] == b"OggS"` |
| mp3 | 길이 ≥ 3이고 `[0..3] == b"ID3"`, 또는 길이 ≥ 2이고 프레임 동기 `b0 == 0xFF && (b1 & 0xE0) == 0xE0 && (b1 & 0x06) == 0x02`(Layer III — AAC ADTS `FF F1` 거름) `&& (b1 & 0x18) != 0x08`(예약 버전 아님) |
| 그 밖·빈 바이트 | `None` → `NotAudio` |

- 검사 순서: wav → ogg → mp3(ID3) → mp3(프레임 동기). 디코딩 가능 여부는 보지 않는다(재생 실패 대체는 ui, 02-design §6.4 A-4).

#### 3.15.3 절차 (🔒 순서)

**`import(assets_dir, src)`** — 크기 오류가 형식 오류보다 먼저(PNG `import`와 같다):

1. `let len = fs::metadata(src)?.len();` → `len > ALARM_MAX_BYTES`면 `TooManyBytes { bytes: len }`(**읽지 않음**, SEC-003).
2. `let bytes = super::read_capped(src, ALARM_MAX_BYTES)` — 부모의 비공개 fn 재사용(자식 모듈이라 호출 가능). 변환: `AssetError::TooManyBytes { bytes }` → `SoundError::TooManyBytes { bytes }`, `AssetError::Io(e)` → `SoundError::Io(e)`. 그 밖 변형은 `read_capped`가 내지 않는다 — 방어로 `Io(std::io::Error::other(e.to_string()))`.
3. `detect_format(&bytes)` → `None`이면 `NotAudio`.
4. `fs::create_dir_all(assets_dir)?`.
5. `let dest = assets_dir.join(alarm_file_name(f)); crate::settings::write_atomic(&dest, &bytes)?;`(임시 파일 → `sync_all` → `rename`, CORE-002).
6. 다른 두 이름 삭제: `NotFound`는 무시. 그 밖 오류는 `log::warn!` 후 계속 — 새 파일은 이미 저장됐고 `current`가 최신 수정 시각을 고르므로 결과가 맞다(D48-3).
7. `Ok(AlarmSound { format: f, bytes: bytes.len() as u64, url: url::versioned_asset_url(&dest) })`(`url::versioned_asset_url`은 `pub(super)` — `assets` 하위라 호출 가능).

**`current(assets_dir)`**: 세 이름(`Wav`·`Mp3`·`Ogg` 순서)을 `fs::metadata`로 본다. `NotFound`·파일 아님 → 건너뜀, 그 밖 오류 → `Err(Io)`. 여럿이면 `modified()`가 가장 늦은 것(읽기 실패는 `UNIX_EPOCH`로 간주, 같으면 앞 순서). `bytes` = 메타데이터 크기, `url` = `versioned_asset_url(path)`. **내용은 읽지 않는다** — 형식은 이름에서 나온다(이름은 `import`만 만든다). 폴더가 없으면 `Ok(None)`.

**`remove(assets_dir)`**: 세 이름을 모두 `fs::remove_file` — `NotFound` 무시, 그 밖 오류는 `Err(Io)`. 두 번 불러도 성공(멱등).

#### 3.15.4 경로·경계 규칙

- 경로는 항상 `assets_dir.join(alarm_file_name(f))`로만 만든다. **사용자 경로의 이름·확장자는 쓰지 않는다**(CR-047 SEC-002와 같은 원칙). `src`는 읽기에만 쓴다.
- `AssetSlot`·`AssetManifest`·`manifest.json`·`load_manifest`·캔버스 계산·`defaults`(내장 기본 세트)·`export`에 소리를 넣지 않는다(패킷 §5, A-1). 내장 기본음은 ui 합성(02-design §6.3) — core에 기본 소리 없음.
- asset protocol scope `$APPDATA/assets/**` 안이라 `url`을 webview가 바로 읽는다. CSP `media-src`는 메인 세션(D-9). 형식별 MIME은 고정 확장자로 정해진다.
- 알림음 변경 이벤트 없음(A-1 — 오버레이가 울릴 때 조회).
- 파일 구성: `assets/sound.rs` 신규(코드 ~120 + 테스트 ~200). `assets/mod.rs`(733줄)는 `pub mod sound;` 1줄과 `//!` [공개 API]·[테스트] 한 줄씩만 — 800줄 미만 유지. `unsafe` 없음, 새 크레이트 없음.
- `//!`(sound.rs): [목적] CR-048 TM-08 알림음 저장소 / [공개 API] 위 목록 / [보안] 고정 이름·1MiB 선검사·`read_capped`·`write_atomic` / [unsafe] 없음 / [테스트] §3.15.5.

#### 3.15.5 테스트 (§8 증분 — `assets/sound.rs` `#[cfg(test)] mod tests`, 단위·tempdir, 패킷 §4 이름 그대로)

| # | 이름 | 조건 | 기대 |
|---|---|---|---|
| A1 | `detect_wav` | `RIFF` + 4바이트 + `WAVE` | `Some(Wav)`. 11바이트로 자르면 `None` |
| A2 | `detect_ogg` | `OggS…` | `Some(Ogg)` |
| A3 | `detect_mp3_id3` | `ID3\x04\x00…` | `Some(Mp3)` |
| A4 | `detect_mp3_frame_sync` | `FF FB 90 00`(MPEG-1 Layer III) | `Some(Mp3)` |
| A5 | `reject_adts_aac` | `FF F1 50 80` | `None` |
| A6 | `reject_png_and_empty` | PNG 시그니처 8바이트 / 빈 바이트 | `None` / `None` |
| A7 | `import_too_large_rejected_before_read` | 1MiB+1바이트 파일(형식은 아무것도 아님) | `TooManyBytes { bytes: 1048577 }`(`NotAudio`가 아님 = 읽기 전 거부), `assets/`에 `alarm.*` 없음 |
| A8 | `import_exact_limit_ok` | 정확히 1MiB(wav 헤더 + 0 채움) | `Ok`, `bytes` 1048576, `alarm.wav` 존재 |
| A9 | `import_writes_fixed_name_and_removes_others` | wav 등록 → mp3 등록 | `alarm.mp3`만 존재, `alarm.wav` 없음, `current()`의 형식 `Mp3` |
| A10 | `import_ignores_source_file_name` | 원본 `…/evil../x.mp3`(mp3 내용) / `…/y.mp3`(wav 내용) | `alarm.mp3` / `alarm.wav` — 원본 이름·확장자 무관, `assets/`에 다른 이름 없음 |
| A11 | `current_none_when_empty` | 빈 폴더 / 없는 폴더 | `Ok(None)` 둘 다 |
| A12 | `current_picks_latest_when_multiple` | `alarm.wav`·`alarm.ogg`를 직접 쓰고 `File::set_modified`로 ogg를 나중 시각으로 | `Ogg`, `bytes` = ogg 크기, `url`에 `alarm.ogg`·`?v=` |
| A13 | `remove_is_idempotent` | 파일 있을 때 / 없을 때 연달아 | 둘 다 `Ok`, 세 이름 모두 없음 |
| A14 | `sound_error_codes` | 세 변형 | `sound.not_audio`·`sound.too_many_bytes`·`sound.io`, 메시지 원문(§3.15.1) |

- `sleep`으로 수정 시각을 벌리지 않는다(`File::set_modified`, Rust 1.75+).

#### 3.15.6 bridge 요구 명세 (§9 증분 — 계약 확정은 bridge-designer, bridge 패킷)

| 종류 | 이름 후보 | 인자 | 반환 | 빈도 | 실패 사유 |
|---|---|---|---|---|---|
| command | `get_alarm_sound` | 없음 | `AlarmSound \| null`(`current(&paths.assets_dir)`) — 부수 효과 없음 | 오버레이 `finished` 진입 때 1회, 설정 창 마운트 | `sound.io` |
| command | `import_alarm_sound` | `path: string` | `AlarmSound` | 사용자 파일 선택 | `sound.not_audio`·`sound.too_many_bytes`·`sound.io` |
| command | `remove_alarm_sound` | 없음 | `void`(멱등) | 사용자 클릭 | `sound.io` |

- 이벤트 없음(A-1). 에러 변환 `From<SoundError> for BridgeError`(`code()`·`to_string()`, `error.rs` — bridge 소관). TS `AlarmFormat = 'wav' | 'mp3' | 'ogg'`, `AlarmSound = { format; bytes: number; url: string }`.
- `generate_handler!` 등록은 `lib.rs`(core 소관 파일) — 등록 주체는 bridge 패킷에서 정한다([timer.md](timer.md) §11 T-C3).

#### 3.15.7 결정·확인 필요 (§11 증분)

- **D48-1** `AssetSlot` 비재사용(A-1) — PNG 헤더·캔버스·`.png` 이름·ui 이미지 카드 목록에 소리 예외가 생기지 않게. 보안 규칙만 재사용.
- **D48-2** 크기 선검사 + `read_capped` 재사용 — 보안 규칙을 한 곳(부모)에 둔다.
- **D48-3** 다른 형식 파일 삭제 실패는 오류가 아니라 경고(패킷은 「`NotFound` 무시」만 명시 — 그 밖 오류 처리는 이 문서가 정함). 사용자가 고른 소리는 이미 저장됐고 `current`가 최신을 고른다.
- **D48-4** `current`는 내용을 읽지 않고 이름으로 형식을 정한다(이름은 `import`만 만든다).
- **Q48-1** `assets/` 폴더를 통째로 훑는 코드가 있다면(내보내기·시딩·정리) `alarm.*`를 PNG로 오인하지 않는지 구현자가 Grep으로 확인한다(설계자 확인 범위: `manifest_load`·`import`·`remove`는 매니페스트 항목·슬롯 이름으로만 접근).

### 3.16 CR-053 — 배포용 기본 세트 3차: `DEFAULT_ASSETS` 7장 → **0.4.0에서 6장**(§3.16.0) (🔒 2026-09-27 사용자 지정, 확정사항 §6 CR-053 줄, CR-044 대체)

#### 3.16.0 현재 표 — 0.4.0 (소스 정본, 2026-09-29 동기화)

결론: 지금 exe에 든 기본 그림은 **6장**이다(🔒 사용자 확정 배포 세트, 뒷머리 `hair` 제외 — CR-053의 7장에서 뺐다). 아래 §3.16.1~§3.16.3의 7장 표·크기·테스트 표는 CR-053 당시 기록이다.

| # | 슬롯 (`file_key`) | 원본 `doc/assets/defaults/` | 크기 | 그룹 | 용량 |
|---|---|---|---|---|---|
| 1 | `Simple(KbUp)` (`kb_up`) | `kb_up.png` | 900×700 | 캔버스 레이어 | 128,174 B |
| 2 | `Simple(Background)` (`background`) | `background.png` | 900×700 | 캔버스 레이어 | 34,202 B |
| 3 | `Simple(PomoChar)` (`pomo_char`) | `pomo_char.png` | 900×700 | 캔버스 레이어 | 135,486 B |
| 4 | `Simple(MouseBase)` (`mouse_base`) | `mouse_base.png` | 168×151 | 팔 파츠 | 11,079 B |
| 5 | `Simple(PenUp)` (`pen_up`) | `pen_up.png` | 119×196 | 손(펜) 파츠 | 12,701 B |
| 6 | `PenDown { kind: PenDown, index: 0 }` (`pen_down_0`) | `pen_down_0.png` | 119×196 | 손(펜) 파츠 | 14,575 B |

- 근거: 순서·장수 `assets/defaults.rs:55-70`(`[DefaultAsset; 6]`)·`//!` [목적]·[순서], 크기 `tests/default_assets.rs` D2(`:64-81`, IHDR 파싱 단언), 용량 `doc/assets/defaults/` 파일 크기(합 336,217 B = [data_reset.md](data_reset.md) `DEFAULT_ASSETS_FINGERPRINT` 바이트 합).
- 결과 동작: `hair` — `has_default` 거짓, `restore_default` → `NoDefault`, 시딩·내보내기 제외(테스트 `hair_slot_has_no_default`·`seed_does_not_create_hair`는 **뒤집지 않은 채** 유지). `pomo_char` — 참(`pomo_char_has_builtin_default`). `kb_down_0`·`pomo_bubble` — 거짓(`kb_down_0_has_no_default`·`pomo_bubble_has_no_builtin_default`).
- 테스트 장수: D1 `keys.len() == 6`(hair·kb_down_0 없음), D4·`seed_does_not_create_hair` `Seeded { count: 6 }`, D14 `written.len() == 6`, D15 부분 실패 5. 시딩 순서(C53-1)는 kb_up → background → pomo_char → mouse_base → pen_up → pen_down_0로 코드 확정.

결론: 내장 기본 표 `DEFAULT_ASSETS`만 7장으로 바꾼다 — **`hair`·`pomo_char` 추가, `kb_down_0` 제거.** `default_bytes`가 `file_key`로 표를 찾으므로(D35·D38 선례) `has_default`·`seed_if_empty`·`restore_default`·`export_defaults` 코드는 한 줄도 바뀌지 않고 결과만 따라온다. 공개 함수 시그니처·에러 변형·`code()`·계약 모양 불변(배열 길이 `[DefaultAsset; N]`의 `N`만 6 → 7).

비유: 앨범 뒤표지에 붙인 견본 사진만 갈아 끼운다. 빈 앨범에 끼워 주는 방식(시딩), 「견본으로 되돌리기」, 「원판 복사」 방법은 그대로이고 붙어 있는 사진 목록만 바뀐다.

#### 3.16.1 표 (순서 = 시딩 등록 순서)

| # | 슬롯 (`file_key`) | 원본 `doc/assets/defaults/` | 크기 (IHDR 실측) | 그룹 | 용량 |
|---|---|---|---|---|---|
| 1 | `Simple(KbUp)` (`kb_up`) | `kb_up.png` | 900×700 | 캔버스 레이어 | 145,979 B |
| 2 | `Simple(Background)` (`background`) | `background.png` | 900×700 | 캔버스 레이어 | 34,202 B |
| 3 | `Simple(Hair)` (`hair`) | `hair.png` | 900×700 | 캔버스 레이어 | 22,179 B |
| 4 | `Simple(PomoChar)` (`pomo_char`) | `pomo_char.png` | 900×700 | 캔버스 레이어 | 120,990 B |
| 5 | `Simple(MouseBase)` (`mouse_base`) | `mouse_base.png` | **168×150** | 팔 파츠 | 11,971 B |
| 6 | `Simple(PenUp)` (`pen_up`) | `pen_up.png` | **143×189** | 손(펜) 파츠 | 19,500 B |
| 7 | `PenDown { kind: PenDown, index: 0 }` (`pen_down_0`) | `pen_down_0.png` | **143×189** | 손(펜) 파츠 | 21,887 B |

- 실측(2026-09-27): 각 파일 16~23바이트(폭·높이, 빅엔디안 u32)와 24·25바이트(비트 깊이 8·색상 타입 6)를 직접 읽었다. 7장 모두 8bit RGBA·≤1MB → 검증 5단계 통과 전제. 캔버스 레이어 4장이 같은 크기라 `CanvasMismatch`가 없고, 파츠는 CR-036으로 같은 크기 규칙이 없다.
- 순서(결정 D53-1): 첫 항목 `kb_up`, 끝 세 항목 `mouse_base, pen_up, pen_down_0`을 유지해 기존 D1 순서 단언을 보존한다. 가운데 캔버스 레이어는 ui 배경 그룹 카드 순서(background·hair·pomo_char, §3.13 A-5)를 따른다. 캔버스 4장이 같은 크기라 순서는 검증 결과에 영향이 없다. 확정사항 줄의 나열(background·hair·kb_up …)은 목록이지 순서 지정이 아니라고 보았다 — **확인 필요 C53-1**(권고: 위 순서).

`defaults.rs` 표 교체(그대로 옮길 것):

```rust
/// 순서 고정: 캔버스 레이어(kb_up → background → hair → pomo_char) → mouse_base → pen_up →
/// pen_down_0. 시딩이 이 순서로 등록한다(CR-053, 7장 — kb_down_0 제외).
pub static DEFAULT_ASSETS: [DefaultAsset; 7] = [
    simple(SimpleSlot::KbUp, default_png!("kb_up.png")),
    simple(SimpleSlot::Background, default_png!("background.png")),
    simple(SimpleSlot::Hair, default_png!("hair.png")),
    simple(SimpleSlot::PomoChar, default_png!("pomo_char.png")),
    simple(SimpleSlot::MouseBase, default_png!("mouse_base.png")),
    simple(SimpleSlot::PenUp, default_png!("pen_up.png")),
    DefaultAsset {
        slot: AssetSlot::PenDown {
            kind: PenDownKind::PenDown,
            index: 0,
        },
        bytes: default_png!("pen_down_0.png"),
    },
];
```

- `KbDownKind`가 더 쓰이지 않으면 `use super::{…}`에서 뺀다(미사용 import 경고 → `clippy -D warnings` 실패).
- 문서주석: `//!` [목적] "기본 그림 7장(CR-053, 배포용 기본 세트 3차)", [순서] 줄을 위 순서로, "kb_down_N·pomo_bubble·idle·rest·특수 키·펜 특수 키·클릭 파츠는 내장 기본이 없다"로. hair 설명(CR-044에서 빠짐)은 "CR-053에서 다시 내장" 한 줄로 줄인다. `default_bytes` 주석은 "pen_down_0 만 있고 kb_down_N·index 1 이상은 None". `SeedSkip::FilesPresent` 주석의 "15개 파일명"은 "DEFAULT_ASSETS 파일명(7개)"로.

#### 3.16.2 결과로 바뀌는 동작 (코드 변경 없음)

| 슬롯 | `has_default` | `restore_default` | 시딩 | 내보내기 |
|---|---|---|---|---|
| `hair`·`pomo_char` | 거짓 → **참** | `Err(NoDefault)` → **내장 900×700 등록**(다른 캔버스 레이어와 크기가 다르면 `CanvasMismatch`, 사용자 그림 보존 — DA-03 불변) | 새로 만든다 | 포함 |
| `kb_down_0` | 참 → **거짓** | → **`Err(NoDefault("kb_down_0"))`**, 파일·매니페스트 무변경 | 만들지 않는다 | 제외 |
| `pomo_bubble`, `idle`, `rest`, `key_*`, `pen_key_*`, `mouse_left`·`mouse_right`, `kb_down_N`(N≥1), `pen_down_N`(N≥1) | 거짓(불변) | `NoDefault`(불변) | — | — |

- 시딩 조건 「같은 이름 파일 없음」은 새 7개 파일명 기준이 된다. 매니페스트가 비었는데 `hair.png`·`pomo_char.png`가 폴더에 있으면 이제 `FilesPresent`로 건너뛴다(사용자 파일 보호 방향). 폴더에 옛 `kb_down_0.png`만 있으면 이제 시딩된다. 시딩은 그 파일을 쓰지 않으므로 덮지 않고, 매니페스트 밖 파일로 남는다(`slam.png` D21 선례와 같은 처리).
- 매니페스트가 비어 있지 않은 기존 사용자는 영향이 없다(시딩은 빈 매니페스트에서만, 기존 `kb_down_0` 등록분 유지).
- 필수 판정 충돌 없음: `kb_down_0`은 CR-043(R-32)에서 이미 선택으로 바뀌었다(판정은 ui, core 불변).
- 카드 버튼(확정사항 CR-053 — hair·pomo_char 카드에 「비우기」, 「기본값」 = 기본 그림 복원)은 ui 몫이다. core는 기존 `restore_default`·`remove`로 충분하다.
- **이 절로 대체되는 서술(옛 결정 기록으로만 남는다):** §1 DA-05 「15장」, §3.10.1 표·`//!` [순서]·D1 행, §3.10 테스트 D2~D4·D13~D15의 장수, §3.12 도입·§3.12.2 「기본값·시딩·내보내기」 행·D35, §3.12.5 D-H1·D-H2, §3.13 도입·§3.13.2 같은 행·D38, §3.13.5 D-PM1의 `pomo_char` 부분, §11 CR-044 구현 참고 노트(6장·168×151·119×196).

#### 3.16.3 테스트 계획 (`src-tauri/tests/default_assets.rs` 갱신)

| ID | 테스트(기존 이름) | 바뀌는 단언 |
|---|---|---|
| D1 | `default_assets_slot_set` | `keys.len() == 7`, 중복 없음, 순서 = §3.16.1(`expected_file_keys()` 갱신), `kb_down_0` 없음. 첫 `kb_up`·끝 세 항목 단언은 그대로 |
| D2 | `default_assets_pass_validation` | 7장 모두 `validate` Ok·≤1MB. 크기: `mouse_base` (168, 150), `pen_up`·`pen_down_0` (143, 189), 나머지 4장(kb_up·background·hair·pomo_char) (900, 700). 파일 머리 주석의 크기(`:2-3`, `:62`)도 갱신 |
| D3 | `has_default_rules` | 참: 7슬롯 전부. 거짓: **`kb_down_0`(새 단언)**, `kb_down_1`, `pen_down_1`, `pomo_bubble`, `idle` 등. `hair`·`pomo_char`를 거짓으로 단언하던 줄은 참으로 |
| D4 | `seed_fresh_dir` | `Seeded { count: 7, failed: [] }`, `entries.len() == 7`, canvas 900×700, 폴더에 `hair.png`·`pomo_char.png` 있음, `kb_down_0.png` 없음 |
| D7·D9 | `seed_skips_orphan_files`·`restore_no_default` | 고아 파일명·대상 슬롯이 7장 밖(`kb_down_0` 등)이거나 `hair`·`pomo_char`면 의미가 바뀐다 → 고아 파일은 7장 안 이름, 기본 없는 슬롯은 `kb_down_0`(또는 `pomo_bubble`)으로 맞춘다(구현자 확인) |
| D13~D15 | `export_fresh_dir`·`export_conflict_overwrite`·`export_partial_failure` | 쓴 파일 7개(`written.len() == 7`), 부분 실패 1건이면 6 |
| D-H1 | `hair_slot_has_no_default` → **뒤집기**(`hair_slot_has_default`) | `has_default` 참, `default_bytes` = `hair.png` 바이트, 빈 tempdir `restore_default(Hair)` Ok·항목 900×700 |
| D-H2 | `seed_does_not_create_hair` → **뒤집기**(`seed_creates_hair`) | `count: 7`, `hair.png` 있음, 매니페스트에 `hair` 항목 있음 |
| D-PM1 | `pomo_slots_have_no_builtin_default` → **나눔** | `pomo_char`: 참·시딩·복원 Ok / `pomo_bubble`: 기존 단언(거짓·`NoDefault`·파일 안 생김) 유지 |
| D53-2 | (D3에 합쳐도 됨) `kb_down_0_has_no_default` | `has_default` 거짓, `default_bytes` `None`, 빈 tempdir `restore_default(kb_down_0)` → `e.code() == "asset.no_default"`, `kb_down_0.png`·manifest.json 생기지 않음 |
| M1 | `measure_default_hand_anchor` | `mouse_base`가 168×151 → 168×150 **다른 그림**으로 바뀌어 실측 손 기준점이 달라질 수 있다. 리터럴을 단언하면 재측정 후 갱신(좌표 기본값은 CR-044 그대로 — 확정사항). `tests/mouse_area_defaults.rs`의 k 실측 리터럴도 같은 방식 — **확인 필요 C53-2** |

#### 3.16.4 bridge 요구 명세 증분 (계약 확정은 bridge-designer)

- TS 사본 `src/bridge/types.ts` `DEFAULT_ASSET_SLOTS`(`:72`)를 §3.16.1 순서 7개로. `hasBuiltinDefault('hair')`·`('pomo_char')` 참, `('kb_down_0')` 거짓. 주석(`:22`, `:69`)의 「hair 제외」 서술 갱신.
- `src/bridge/__tests__/types.test.ts` 길이 6 → 7(`:140`, `:211`), 순서 배열(`:146-148`), `hair`(`:192`)·`pomo_char`(`:209`) 단언 반전.
- 계약 §3.1 「기본 있는 슬롯」 목록 7개. command 인자·반환 모양 불변(내보내기 결과 개수만 7).

#### 3.16.5 결정·확인 필요

| # | 결정 | 대안 | 근거 |
|---|---|---|---|
| D53-1 | 순서 kb_up → background → hair → pomo_char → mouse_base → pen_up → pen_down_0 | 확정사항 나열 순(알파벳) | 기존 D1 순서 단언(첫 kb_up·끝 세 항목) 보존, ui 카드 순서와 일치, 검증 결과 무관 |
| D53-2 | 표만 교체, 분기 추가 없음 | `kb_down_0` 명시 제외 분기 | `file_key`로 표를 찾으므로 표에 없으면 자동으로 기본 없음(D35·D38 선례) |

- **C53-1** 시딩 순서가 D53-1로 괜찮은지(사용자 영향 없음 — 매니페스트 항목 순서만 달라진다).
- **C53-2** `mouse_base` 교체에 따른 M1·`mouse_area_defaults.rs` 실측 리터럴 재측정 — 구현 단계 실측 게이트. k 범위(0.5~1.6) 이탈 시 CR-044 확인 필요 14와 같은 방침(허용·기록)으로 볼지 사용자 확인.

### 3.17 data-reset — 앱 시작 순서·전체 초기화와 시딩 (🔒 2026-09-27 사용자 결정 R-A·R-B, 정본 [data_reset.md](data_reset.md))

비유: 앨범(assets)은 그대로이고, 앨범을 통째로 비우고 견본을 다시 끼우는 관리인(`data_reset`)이 새로 생긴다. 관리인은 앨범의 기존 「견본 끼우기」(`seed_if_empty`)를 그대로 빌려 쓴다.

**앱 시작 순서(`lib.rs` setup, 🔒 — [data_reset.md](data_reset.md) §3.7과 같다)**

```
1. AppPaths::new
2. create_dir_all(assets_dir)
3. settings::load_or_default(settings_file)            ← §3.10.2의 시딩 뒤에서 앞으로 옮김
4. data_reset::run_startup(&paths, &settings_state)    ← 신규. 세대 불일치·없음이면 전체 초기화(실패해도 계속)
5. seed_default_assets(assets_dir) → seed_if_empty     ← 유지(CR-035 S1: 사용자가 전부 비운 경우). 4에서 초기화했으면 Skipped(NotEmpty)
6. load_manifest → 손 기준점 초기 계산 → … (이후 기존 순서 그대로, 모두 4 이후의 파일·설정을 읽는다)
```

- 3·4는 lib.rs 비공개 도우미 `startup_settings(&AppPaths) -> Settings` 한 줄로 부른다(setup 클로저 줄 수 불변).
- **전체 초기화에서 assets 폴더에 일어나는 일**(`data_reset::reset_data` ②·③): 폴더 **바로 아래의 일반 파일** 중 확장자 `png`·`tmp`·`wav`·`mp3`·`ogg`와 `manifest.json`을 지운다(하위 폴더·링크·그 밖의 파일은 그대로). 그 뒤 `seed_if_empty`를 부르고 결과가 `Seeded { count: 7, failed: [] }`여야 성공이다. manifest와 7개 이름의 파일이 모두 사라진 상태라 시딩 조건(§3.10.2)을 만족한다.
- 알림음(`assets/alarm.{wav,mp3,ogg}`, §3.15)도 지운다(D-4). 이벤트는 없다 — ui는 조회 시점에 없음을 받는다.
- **assets 쪽 변경 없음.** 공개 API·시그니처·시딩 규칙·에러 코드가 그대로다. `seed_all`(비공개)은 공개하지 않는다 — `seed_if_empty`로 충분하다.
- 비원자 PNG 쓰기(CORE-001, mod.rs:310)는 고치지 않는다. 초기화 도중 끊기면 세대 표식이 없으므로 다음 시작 때 처음부터 다시 한다([data_reset.md](data_reset.md) §3.3).
- 테스트: [data_reset.md](data_reset.md) §8.2(`tests/data_reset.rs`). `tests/default_assets.rs`는 영향이 없다.

### 3.18 presets — 가시성 확대 4곳 (🔒 2026-09-30 확정사항 §6 「프리셋」 PS-01~PS-10, 정본 [presets.md](presets.md) §3.8)

비유: 앨범(assets)의 규칙은 그대로이고, 옷장 관리인(`presets`)이 앨범의 도구 네 개(이름표 만들기·크기 제한 읽기·캔버스 다시 재기·주소 붙이기)를 빌려 쓴다.

| 항목 | 위치 | 변경 | 사용처(presets) |
|---|---|---|---|
| `stored_file_name(slot) -> String` | `mod.rs:275` | `fn` → `pub(crate) fn` | 검증기·저장·적용·내보내기의 파일 경로(SEC-002 — 경로는 슬롯에서만) |
| `read_capped(src, max) -> Result<Vec<u8>, AssetError>` | `mod.rs:345` | `fn` → `pub(crate) fn` | 검증기·저장의 상한 읽기(SEC-003) |
| `AssetManifest::recompute_canvas(&mut self)` | `mod.rs:121` | `fn` → `pub(crate) fn` | 적용 때 새 매니페스트의 캔버스 |
| `versioned_asset_url(path) -> String` | `url.rs:24`, `mod.rs` 재노출 | `url.rs`: `pub(super) fn` → `pub(crate) fn`, `mod.rs`: `pub(crate) use url::versioned_asset_url;` 추가 | 적용 때 새 `AssetEntry.url` |

- **동작 불변.** 함수 본문·시그니처·에러 변형·code·검증 규칙(§3.5·§3.11)·캔버스 규칙은 그대로다. `pub(crate)`라 계약·bridge 공개면도 바뀌지 않는다.
- `url.rs`도 한 단어 바꾸는 이유: `pub(super)` 항목은 그보다 넓게 재노출할 수 없다(rustc E0364). 패킷은 재노출만 적었다([presets.md](presets.md) §11.1 Δ2).
- 규격 규칙을 presets에 다시 쓰지 않는다 — presets는 `parse_png_header`·`validate`(공개)·`is_canvas_layer`를 그대로 부른다. `group_size`(비공개)는 넓히지 않는다(프리셋 검증기는 목록 순서의 첫 캔버스 레이어를 기준으로 자기가 정한다).
- 테스트: assets 기존 테스트 영향 없음. 사용 쪽 테스트는 [presets.md](presets.md) §8.

## 4. 스레드·채널

- 없음. 모든 함수는 동기이며 호출자 스레드(Tauri command 스레드·setup)에서 돈다. CR-035 시딩은 setup 스레드에서 1회 돈다(창 표시 전, 목표 ≤150 ms). **data-reset 뒤 순서: settings 로드 → `data_reset::run_startup` → 시딩(§3.17).** 전체 초기화 때는 `data_reset::reset_data`가 같은 스레드에서 `seed_if_empty`를 한 번 더 부른다. 내보내기는 command 스레드에서 돈다.
- `compute_hand_anchor` 비용: 해독 + 2회 순회(최대 900×700). 이벤트 시점 1회라 허용. 호출자는 설정 `Mutex` 잠금을 쥔 채 부르지 않는다.
- `parse_manifest` 비용: 항목 최대 수십 개의 JSON 값 변환 — 무시할 수준.

## 5. unsafe

없음.

## 6. 에러 타입

`AssetError` (`#[derive(Debug, thiserror::Error)]`). **CR-024: 변형 `PenPartMismatch` 추가(`code()`는 기존 `asset.canvas_mismatch` — `error.rs:39-41`이 `code()`·`to_string()`으로 옮기므로 bridge 코드 변경 없음, §11 D30).** **CR-019: `Manifest`의 발생 범위가 최상위 구조 손상으로 좁아진다**(항목 단위 해석 실패는 오류가 아니라 건너뜀).

| `PenPartMismatch { w, h, pw, ph }` (**CR-024**) | 펜 쥔 손 그림(평소·누름·특수 키)은 모두 같은 크기여야 합니다. 기존 {pw}×{ph}, 이 이미지 {w}×{h}. | 펜 그림끼리 크기 다름 | `asset.canvas_mismatch`(§11 D30) |

아래 표는 기존 변형(위 행이 추가분 — 구현 시 `MousePartMismatch` 바로 아래에 둔다).

| 변형 | 한국어 메시지 | 원인 | `code()` |
|---|---|---|---|
| `NotPng` | PNG 파일이 아닙니다. | 시그니처 불일치 | `asset.not_png` |
| `BadHeader` | PNG 헤더가 손상되었습니다. | IHDR 없음·길이 이상 | `asset.bad_header` |
| `NotRgba` | 32bit RGBA PNG 만 지원합니다 (투명 배경 필요). | 비트 깊이 ≠ 8 또는 색상 타입 ≠ 6 | `asset.not_rgba` |
| `TooLarge { w, h, max_w, max_h }` | 이미지가 너무 큽니다. 최대 {max_w}×{max_h} (현재 {w}×{h}). | 모든 슬롯 900×700 초과·0 크기 | `asset.too_large` |
| `TooManyBytes { bytes }` | 파일 용량이 1 MB 를 넘습니다 ({bytes} 바이트). | 1MB 초과 | `asset.too_many_bytes` |
| `CanvasMismatch { w, h, cw, ch }` | 배경·몸통 등 캔버스 그림은 모두 같은 크기여야 합니다. 캔버스 {cw}×{ch}, 이 이미지 {w}×{h}. | 캔버스 레이어가 캔버스와 크기 다름 | `asset.canvas_mismatch` |
| `MousePartMismatch { w, h, mw, mh }` | 마우스 파츠(기본·왼클릭·오른클릭)는 모두 같은 크기여야 합니다. 기존 {mw}×{mh}, 이 이미지 {w}×{h}. | 마우스 파츠끼리 크기 다름 | `asset.canvas_mismatch`(§11 D15) |
| `NotFound(String)` | 등록되지 않은 슬롯입니다: {0} | 없는 슬롯 삭제 | `asset.not_found` |
| `Io(#[from] std::io::Error)` | 파일 처리 중 오류가 발생했습니다: {0} | 파일 IO | `asset.io` |
| `Manifest(#[from] serde_json::Error)` | 매니페스트를 읽거나 쓸 수 없습니다: {0} | manifest.json **최상위** 형식(JSON 문법·`canvas`·`entries` 모양), 직렬화 실패. **항목 하나의 해석 실패(알 수 없는 슬롯 등)는 제외 — 건너뜀(§3.6)** | `asset.manifest` |
| `Decode(#[from] tauri::Error)` | 이미지 픽셀을 읽을 수 없습니다: {0} | `mouse_base` 픽셀 해독 실패 | `asset.decode` |
| **`NoDefault(String)`** (CR-035, DA-06) | 이 칸에는 내장 기본 그림이 없습니다: {0} | `restore_default`에 내장 기본이 없는 슬롯(`{0}` = file_key, 경로 아님) | **`asset.no_default`** |
| **`ExportDir`** (CR-035, DA-06) | 저장할 폴더를 찾을 수 없습니다. | `export_defaults`의 대상이 절대 경로가 아니거나, 없거나, 폴더가 아님(message에 경로 없음) | **`asset.export_dir`** |

- CR-035: 새 변형 2개는 `PenPartMismatch` 바로 아래에 둔다. 새 코드 2개는 계약 추가(§3.10.6-5). 기존 `Io`의 `{0}` 원문 포함은 이번에 고치지 않는다(계약 §6 기존 과제).

- `error.rs`의 `impl From<AssetError> for BridgeError`는 수정 불필요.

## 7. 설정 의존

| 방향 | 필드 | 기본값 | 비고 |
|---|---|---|---|
| 읽음(인자) | `settings.mouse.shoulder: Point` | `(620, 530)` | 호출자가 값을 넘긴다 |
| 읽음(인자) | `settings.mouse.part_pos: Point`(JSON `partPos`) | `(389, 492)` | 기준점을 캔버스 좌표로 옮기는 오프셋 |
| 참조 안 함 | `settings.mouse.hand` | `None` | 폴백은 ui |
| 참조 안 함(폐기) | ~~`armWidth`·`armColor`~~, **~~`slam`~~(CR-019 — assets는 원래 참조하지 않았음)** | — | — |
| 씀 | 없음 | — | — |

- 타입 의존: `crate::settings::Point`(assets → settings, 스킬 §1 허용 방향). `MouseSettings` 구조체에는 의존하지 않는다(§11 D13).

## 8. 테스트 계획

### 8.1 단위 — `anchor.rs` (`tip_centroid`, 합성 RGBA 버퍼) — 적용 완료, CR-019 영향 없음

| # | 입력 | 기대 | 확인 |
|---|---|---|---|
| U1~U10 | 기존 입력·기대값, `part_pos = (0, 0)` | 기존 | — |
| U12 | 8×1 모두 255, 어깨 (100, 50.5), `part_pos` (100, 50) | `Some(107.0, 50.5)` | 오프셋 반영 |
| U13 | 8×1 모두 255, 어깨 (10, 0.5): `part_pos` (0, 0) / (10, 0) | `Some(1.0, 0.5)` / `Some(17.0, 0.5)` | 거리는 캔버스 좌표 기준 |
| U14 | 1×1 알파 255, 어깨 (0, 0), `part_pos` (389.123, 492.456) | `Some(389.62, 492.96)` | 반올림 한 번 |
| U15 | `part_pos.x = NaN` / `part_pos.y = ∞` | `None` / `None` | 비유한 방어 |
| U16 | 전체 캔버스 그림 = 잘라낸 작은 그림 + 위치 | 둘 다 `Some(9.0, 1.5)` | 확정사항 §3 |

### 8.2 단위·tempdir — `mouse_part_tests.rs` — 적용 완료, CR-019 영향 없음

M1~M8(마우스 파츠 크기·그룹 규칙, 캔버스 무관). 상세는 2차 이력 참조 — 기대값 불변.

### 8.3 통합 — tempdir (`anchor.rs` 테스트) — 적용 완료

I1~I7, B14 — 기대값 불변.

### 8.4 통합 — 실제 PNG 스모크 (`src-tauri/tests/sample_assets.rs`)

- 기존 스모크·S1·S2 — CR-019 영향 없음(`slam` 슬롯 미사용 확인, Grep 2026-09-24).

### 8.5 기존 `mod.rs` 테스트 — CR-019 수정 없음

- `mod.rs` 테스트에 `SimpleSlot::Slam`·`"slam"` 사용처 없음(Grep 2026-09-24). 변형 삭제로 깨지는 테스트 없음.

### 8.6 배경 슬롯 (OV-R-17) — B1~B15

기존 그대로(구현 완료).

### 8.7 수동

없음(순수 계산).

### 8.8 CR-019 — `manifest_load.rs` `#[cfg(test)] mod tests` (단위·tempdir)

JSON 픽스처는 문자열 리터럴로 쓴다. 항목 JSON 모양: `{"slot":"body","fileName":"body.png","width":450,"height":350,"bytes":10,"url":"u"}`, 누름 프레임 `{"slot":{"kind":"kb_down","index":0}, …}`.

| # | 이름(안) | 준비·호출 | 기대 |
|---|---|---|---|
| L1 | `old_slam_entry_is_skipped` | `parse_manifest`: `canvas` 450×350, 항목 [`body` 450×350, **`"slam"` 450×350**, `kb_up` 450×350, `kb_down` 0 450×350] | `Ok(m)`, `m.entries.len() == 3`, 어떤 항목도 `file_key() == "slam"` 아님, 남은 순서 = body·kb_up·kb_down_0, `m.canvas == Some(450×350)` |
| L2 | `slam_as_only_canvas_layer_clears_canvas` | 항목 [**`"slam"` 450×350**, `mouse_base` 202×154], `canvas` 450×350 | `entries == [mouse_base]`, `canvas == None`(재계산 — 마우스 파츠는 캔버스를 정하지 않음) |
| L3 | `malformed_entry_is_skipped` | 항목 [`body`(정상), `idle`에서 `width` 누락] | `entries.len() == 1`(body), `canvas` 450×350 |
| L4 | `broken_top_level_is_manifest_error` | ① `"{ not json"` ② `{"canvas":null,"entries":{}}` ③ `{"canvas":"x","entries":[]}` | 셋 다 `Err(AssetError::Manifest(_))`, `code() == "asset.manifest"` |
| L5 | `well_formed_manifest_keeps_stored_canvas` | 정상 항목 2개, 파일의 `canvas` 값을 항목과 **다른** 값(예 100×100)으로 둠 | `canvas == Some(100×100)` — 건너뛴 항목이 없으면 재계산하지 않음(기존 동작 보존 증명) |
| L6 | `slam_string_is_not_a_slot` | `serde_json::from_str::<AssetSlot>("\"slam\"")` | `Err` (변형 삭제 증명). `"\"idle\""`·`"\"rest\""`는 `Ok` |
| L7 | `import_after_old_slam_drops_entry_keeps_file` (tempdir) | `assets/`에 옛 manifest.json(`body`·`slam` 450×350) + `slam.png`·`body.png` 파일 작성 → `load_manifest` → `import(kb_up 450×350)` | `load_manifest` = `Ok`(항목 1), `import` = `Ok`, 저장된 manifest.json 텍스트에 `"slam"` 없음, **`assets/slam.png` 파일은 존재**(§11 D21 증명) |
| L8 | `remove_works_with_old_slam_entry` (tempdir) | L7과 같은 옛 폴더 → `remove(body)` | `Ok(m)`, `m.entries` 비어 있음, `canvas == None`, manifest.json에 `"slam"` 없음 |

- png 바이트가 필요한 L7은 `mod.rs` 테스트의 `png_header` 도우미(`pub(super)`, 2차에서 올림)를 재사용한다(중복 금지).
- 경고 로그 내용은 단언하지 않는다(로거 미설정 — 동작만 검증).
- 완료 기준(스킬 §9): `cargo fmt --check`·`cargo clippy -- -D warnings` 0·`cargo test` 전건 PASS, `cargo check --examples` 통과(import_sample 수리).

### 8.9 CR-021 — `slot.rs` `#[cfg(test)] mod tests` (단위·tempdir)

PNG 헤더 바이트는 `mod.rs` 테스트의 `png_header` 도우미(`pub(super)`)를 `super::super::tests::png_header`로 재사용한다(중복 금지 — `slot`은 `assets`의 자식이라 보인다). 기존 `mod.rs` 테스트는 `use super::*`가 `pub use` 재노출을 가져오므로 수정 없이 컴파일된다.

| # | 이름(안) | 준비·호출 | 기대 |
|---|---|---|---|
| K1 | `key_slots_serialize_and_file_key` | **7개** 각각 `serde_json::to_string(&AssetSlot::Simple(v))`, `serde_json::from_str::<AssetSlot>(..)`, `file_key()` | 직렬화 = `"\"key_space\""`·`"\"key_z\""`·`"\"key_question\""`·`"\"key_exclamation\""`·`"\"key_enter\""`·`"\"key_backspace\""`·**`"\"key_undo\""`**, 역직렬화 왕복 동일, `file_key()` = 따옴표 뺀 같은 문자열(🔒 이름) |
| K2 | `key_slots_are_canvas_layers` | **7개** 각각 | `is_canvas_layer() == true`, `is_mouse_part() == false` |
| K3 | `key_slot_validate_uses_canvas_rules` | `validate`: ① 900×700·10바이트·canvas `None` ② 901×700 ③ 900×700·`ASSET_MAX_BYTES + 1` ④ 450×350, canvas 900×700 | ① `Ok` ② `TooLarge` ③ `TooManyBytes` ④ `CanvasMismatch`(`MousePartMismatch` 아님) |
| K4 | `import_key_slot_matches_existing_canvas` (tempdir) | `body` 450×350 등록 → `key_space` 450×350 등록 → `key_enter` 300×200 등록 | ② `Ok`, `assets/key_space.png` 존재, 매니페스트에 `key_space`, `canvas` 450×350 불변 ③ `Err(CanvasMismatch)`, `key_enter.png` 없음 |
| K5 | `key_slot_alone_defines_and_clears_canvas` (tempdir) | 빈 폴더에 `key_z` 900×700 등록 → `remove(key_z)` | ① `canvas == Some(900×700)` ② `canvas == None`, 항목 0 |
| K6 | `manifest_with_key_slots_round_trips` (tempdir) | K4 뒤 `load_manifest` | `Ok`, 항목 2개(`body`·`key_space`) 순서 유지, 건너뛴 항목 없음(관대한 로드가 새 슬롯을 정상 해석 — `canvas`는 파일 값 그대로) |

- 완료 기준 같음(스킬 §9). `slot.rs` 이동은 기존 테스트 전건 PASS로 무변경을 증명한다.

### 8.10 CR-024 — 펜 쥔 손 그룹 (단위 `slot.rs` P1·P2 / 단위·tempdir 신규 `pen_part_tests.rs` P3~P9)

`pen_part_tests.rs`는 `mouse_part_tests.rs`와 같은 형식(`mod.rs`에 `#[cfg(test)] mod pen_part_tests;`, PNG 헤더는 `png_header` 도우미 재사용 — 중복 금지).

| # | 이름(안) | 준비·호출 | 기대 |
|---|---|---|---|
| P1 | `pen_slots_serialize_and_file_key` | 단순 8개 + `AssetSlot::pen_down(0)`·`pen_down(3)` 각각 `to_string`·`from_str`·`file_key()` | `"\"pen_up\""`·`"\"pen_key_space\""`·`"\"pen_key_z\""`·`"\"pen_key_question\""`·`"\"pen_key_exclamation\""`·`"\"pen_key_enter\""`·`"\"pen_key_backspace\""`·`"\"pen_key_undo\""`, `{"kind":"pen_down","index":0}`·`…3}`. 왕복 동일. `file_key()` = `"pen_up"` … `"pen_down_0"`·`"pen_down_3"`(🔒 이름) |
| P2 | `pen_slots_classification_and_untagged_order` | 위 10개 / `kb_down(0)` / `MouseBase` / JSON `{"kind":"kb_down","index":1}`·`{"kind":"pen_down","index":1}`·`{"kind":"other","index":0}` | 펜 10개: `is_pen_part` 참, `is_mouse_part`·`is_canvas_layer` 거짓. `kb_down(0)`·`MouseBase`: `is_pen_part` 거짓. JSON → `kb_down(1)` / `pen_down(1)` / `Err` |
| P3 | `pen_validate_group_rules` | `validate(pen_up)`: ① 202×154·10바이트·`None` ② 901×700 ③ `ASSET_MAX_BYTES + 1` ④ 202×154, 기준 100×100 | ① `Ok` ② `TooLarge` ③ `TooManyBytes` ④ `PenPartMismatch { w: 202, h: 154, pw: 100, ph: 100 }`, `code() == "asset.canvas_mismatch"` |
| P4 | `pen_parts_ignore_canvas_and_mouse_parts` (tempdir) | `body` 450×350 → `mouse_base` 202×154 → `pen_up` 120×90 | 셋 다 `Ok`, `canvas` 450×350 불변(펜은 캔버스·마우스 파츠와 비교되지 않음) |
| P5 | `pen_parts_must_match_each_other` (tempdir) | `pen_up` 120×90 → `pen_down(0)` 120×90 → `pen_key_space` 100×90 → `pen_down(1)` 120×90 | ②·④ `Ok`, `assets/pen_down_1.png` 존재. ③ `Err(PenPartMismatch { pw: 120, ph: 90, .. })`, `pen_key_space.png` 없음 |
| P6 | `pen_part_alone_does_not_define_canvas` (tempdir) | 빈 폴더 `pen_up` 900×700 → `body` 450×350 → `remove(pen_up)` | ① `canvas == None` ② `Ok`, `canvas` 450×350 ③ `canvas` 450×350 유지 |
| P7 | `sole_pen_part_replace_and_mismatch` (tempdir) | `pen_up` 120×90 → `pen_up` 200×150(유일 항목 교체) → `pen_down(0)` 200×150 → `pen_up` 120×90 | ②·③ `Ok`, ④ `Err(PenPartMismatch { pw: 200, ph: 150, .. })` (기준 = 자신을 뺀 다른 펜 그림) |
| P8 | `manifest_with_pen_slots_round_trips` (tempdir) | `body` → `pen_up` → `pen_down(0)` → `pen_key_undo` 등록 후 `load_manifest` | `Ok`, 항목 4개 순서·슬롯 동일(건너뜀 없음), `canvas` 450×350 |
| P9 | `hand_anchor_ignores_pen_parts` (tempdir) | 매니페스트에 `pen_up` 항목만(파일은 헤더만 있는 가짜 PNG) → `compute_hand_anchor(.., shoulder, part_pos)` | `Ok(None)` — 펜 그림을 `mouse_base` 대신 쓰지 않음(파일을 읽지 않으므로 해독 오류도 없음) |

- 회귀: 기존 M1~M8·K1~K6·L1~L8·B1~B15·U·I 전건 PASS(펜 슬롯 미사용 — `is_canvas_layer` 본문 변경이 기존 슬롯 분류를 바꾸지 않음 증명).
- 완료 기준 같음(스킬 §9): `cargo fmt --check`·`cargo clippy -- -D warnings` 0·`cargo test` 전건 PASS, `cargo check --examples`(settings.md 6차 `pen_pos` 필드 추가로 `examples/import_sample.rs` 수리 필요).

### 8.11 CR-036 — 팔·손 파츠 크기 자유 (단위·tempdir, `mouse_part_tests.rs`·`pen_part_tests.rs`)

반전(기존 단언 — 행 번호는 2026-09-25 Grep 값, 구현자는 단언 내용으로 찾는다):

| 대상 | 지금 기대 | 바뀐 기대 |
|---|---|---|
| `mouse_part_tests.rs` 84행 부근 — `validate(마우스 파츠, 기준 Some(다른 크기))` | `Err(MousePartMismatch { .. })` | `Ok(())`(파츠는 기준 크기 무시) |
| `mouse_part_tests.rs` 145행 부근 — 다른 크기 마우스 파츠 `import` | `Err(MousePartMismatch { .. })` | `Ok`, 파일 존재, 매니페스트 항목이 각자 크기 |
| `mouse_part_tests.rs` 171행 부근 — 불일치 단언 | `Err(MousePartMismatch { .. })` | `Ok`. 테스트 이름에 "mismatch"가 있으면 이름도 바꾼다 |
| P3 ④ `pen_validate_group_rules` | `PenPartMismatch { w: 202, h: 154, pw: 100, ph: 100 }` | `Ok(())` |
| P5 `pen_parts_must_match_each_other` | ③ `Err(PenPartMismatch)`, `pen_key_space.png` 없음 | 이름 → `pen_parts_sizes_are_independent`. ②③④ 모두 `Ok`, `pen_key_space.png` 존재, 매니페스트 `pen_key_space` 100×90 |
| P7 `sole_pen_part_replace_and_mismatch` | ④ `Err(PenPartMismatch { pw: 200, ph: 150, .. })` | 이름 → `pen_part_replace_any_size`. ④ `Ok`, `pen_up` 항목 120×90, `pen_down_0` 200×150 불변 |

두 변형을 참조하는 코드가 남으면 컴파일이 실패한다 — `cargo test` 컴파일 성공이 삭제 완결의 증거다.

신규:

| # | 이름(안) | 준비·호출 | 기대 |
|---|---|---|---|
| F1 | `mouse_parts_sizes_are_independent` (tempdir, `mouse_part_tests.rs`) | `mouse_base` 202×154 → `mouse_left` 300×200 → `mouse_right` 64×64 → `mouse_left` 120×90(교체) | 넷 다 `Ok`, 파일 3개 존재, 항목 크기 = 202×154·120×90·64×64, `canvas == None` 불변 |
| F2 | `pen_down_frames_sizes_are_independent` (tempdir, `pen_part_tests.rs`) | `pen_up` 120×90 → `pen_down(0)` 90×154 → `pen_down(1)` 200×150 → `pen_key_undo` 900×700 | 넷 다 `Ok`, 파일 4개, 항목 크기 각자, `canvas == None` |
| F3 | `pen_up_replace_with_default_pen_down_present` (tempdir, `pen_part_tests.rs`) | 기본 `pen_down_0`(90×154) 등록 — CR-035 소스가 있으면 `restore_default(dir, AssetSlot::pen_down(0))`로 내장 기본을 넣고, 없으면 `png_header(90, 154)` 합성으로 `import` → `pen_up` 120×90 → `pen_up` 202×154(교체) | 셋 다 `Ok`, `pen_down_0` 항목 90×154 불변, `pen_up` 항목 202×154 |
| F4 | `parts_ignore_group_size_canvas_keeps_it` (단위, `pen_part_tests.rs`) | `validate(MouseLeft, 300×200, Some(202×154))` / `validate(pen_down(2), 50×50, Some(90×154))` / `validate(Body, 300×200, Some(450×350))` | `Ok` / `Ok` / `Err(CanvasMismatch { w: 300, h: 200, cw: 450, ch: 350 })` — 캔버스 규칙 유지 증명 |

- 상한 유지(≤900×700·≤1MB·RGBA)는 기존 P3 ②③·M1~M8의 상한 단언(불변)이 증명한다 — 새로 만들지 않는다.
- 회귀: K1~K6(특히 K3 ④·K4 ③ `CanvasMismatch`), B1~B15, L1~L8, P1·P2·P4·P6·P8·P9, I·U, CR-035 D 계열 전건 PASS.
- 완료 기준(스킬 §9): `cargo fmt --check`·`cargo clippy -- -D warnings` 0·`cargo test` 전건 PASS.

## 9. bridge 요구 명세 (계약 확정은 bridge-designer)

### 9.7 CR-024 — 펜 쥔 손 슬롯 추가 (계약 §3.1·§5.1·§6) — **호환성: 추가(저장 데이터 비파괴), TS 로직 수정 필요**

| # | 계약 위치 | 요구 | 호환성 분류 |
|---|---|---|---|
| 1 | TS `AssetSlot` 합집합 | `'pen_up' \| 'pen_key_space' \| 'pen_key_z' \| 'pen_key_question' \| 'pen_key_exclamation' \| 'pen_key_enter' \| 'pen_key_backspace' \| 'pen_key_undo' \| { kind: 'pen_down'; index: number }` 추가(🔒 이름) | 추가 |
| 2 | TS `slotKey`·`isKbDownSlot` (`src/bridge/types.ts:28-29`) | **현재 `isKbDownSlot(slot) ? \`kb_down_${slot.index}\` : slot`.** `isKbDownSlot`이 객체 여부만 보면 `pen_down`을 `kb_down_N`으로 잘못 만든다 → `slotKey`는 Rust `file_key`와 같은 규칙(객체면 `` `${slot.kind}_${slot.index}` ``), `isKbDownSlot`은 `kind === 'kb_down'`으로 좁히고 `isPenDownSlot` 추가 | **TS 로직 수정 필수**(bridge-implementer, 테스트 동반) |
| 3 | TS 분류 도우미 | `isMousePartSlot` 옆에 `isPenPartSlot`(Rust `is_pen_part`와 같은 집합). 이름·필요 여부는 bridge-designer 결정. `isMousePartSlot` 주석의 옛 "≤256×256 손바닥" 문구도 정정 대상 | 추가 |
| 4 | Rust 계약 블록 | `SimpleSlot` 8 변형(§2 선언 순서), `pub enum PenDownKind`, `AssetSlot::PenDown { kind: PenDownKind, index: u32 }` | 추가 — bridge Rust 코드 변경 없음(`AssetSlot` 전수 `match` 없음, Grep 2026-09-24) |
| 5 | §3.1 슬롯 표 | 펜 행: 분류 "펜 쥔 손 파츠", 크기 "≤900×700·≤1MB, **펜 그림끼리 같은 크기**, 캔버스·마우스 파츠와 무관", **선택**, 위치 `Settings.mouse.penPos`([settings.md](settings.md) §9.4), 대응 입력(§3.8 표) | 설명 |
| 6 | §5.1 창 크기 재계산 트리거 ③ | 펜 그림은 `is_canvas_layer() == false` → 트리거 아님(`bridge/commands.rs:95` 코드 불변) | 설명만 |
| 7 | §5.1 손 기준점 「재계산 안 함」 목록 | 펜 그림 등록·삭제 추가(`commands.rs:113` 코드 불변) | 설명만 |
| 8 | §6 `ASSET_CANVAS_MISMATCH` | 발생 조건에 "펜 그림끼리 크기 다름(`PenPartMismatch`)" 추가. 새 에러 코드 없음 | 설명만 |
| 9 | 분류 → 슬롯 대응 | `special` → 펜 슬롯 `` `pen_key_${special}` `` TS 상수(선택 — bridge-designer 결정). core에 대응 함수 없음 | 신규 TS 상수(선택) |
| 10 | 반영 묶음 | 새 ui + 옛 Rust면 `import_asset`에 펜 슬롯 → 명령 인자 역직렬화 실패. 옛 ui + 새 Rust는 무해(펜 슬롯을 보내지 않음). → **core(assets·settings)·bridge(Rust·TS)·ui 한 묶음** | 추가(순서 의존) |
| 11 | 변경 이력 | "AssetSlot: 펜 쥔 손 슬롯 `pen_up`·`pen_down`(순번)·`pen_key_*` 7개 추가(CR-024 — 추가). `ASSET_CANVAS_MISMATCH`에 펜 그룹. `Settings.mouse.penPos` 추가" | — |

- 새 command·event 없음.
- UI 요구(계층 밖, ui-manager 인계용): **UI-M8 (CR-024)** settings — 펜 그림 등록 칸(`pen_up`, `pen_down` 순번, `pen_key_*` 7개), `pen_up` 첫 등록 시 `penPos` 기본 위치를 정해 `set_settings`로 저장, 미리보기에서 손 그림을 끌어 `penPos` 조정. **UI-M9 (CR-024)** overlay — 팔 끝에 붙어 위치·각도는 팔을 따르고 크기는 불변, 키보드 입력 시 `pen_up`↔`pen_down_N`(순환)·`pen_key_{special}`(없으면 `pen_down`), 손 이미지가 있으면 키보드 레이어 `kb_up` 고정(확정사항 §3).

### 9.6 CR-021 — `AssetSlot`에 특수 키 슬롯 **7개** 추가 (계약 §3.1·§5.1) — **호환성: 추가**

- 5차: 아래 표의 "6개"는 모두 **7개**(`key_undo` 포함)로 읽는다. 행 2 변형에 `KeyUndo`, 행 3 슬롯 표에 `key_undo` 행(대응 `special` = `"undo"` — Shift 없는 Ctrl+Z, 계약 v0.11 §3.7 확정값), 행 5 대응 표에 `undo→key_undo`를 더한다.

| # | 계약 위치 | 요구 | 호환성 분류 |
|---|---|---|---|
| 1 | TS `AssetSlot` 합집합 | `'key_space' \| 'key_z' \| 'key_question' \| 'key_exclamation' \| 'key_enter' \| 'key_backspace' \| 'key_undo'` 추가(🔒 이름) | 추가 — 옛 ui는 이 값을 보내지 않는다. `AssetSlot`을 전수 `switch`하는 TS 코드가 있으면 새 값 처리 필요(bridge-implementer가 `yarn tsc`로 확인) |
| 2 | Rust 계약 블록 `SimpleSlot` | 변형 6개 추가(§2 선언 순서). 정의 파일이 `assets/slot.rs`로 바뀌어도 경로 `crate::assets::SimpleSlot` 불변 | 추가 — bridge Rust 코드 변경 없음(`SimpleSlot` 전수 `match`가 bridge에 없음, Grep 2026-09-24) |
| 3 | §3.1 슬롯 표 | 6행 추가: 분류 "키보드 파츠 — 특수 키 이미지", 크기 "캔버스 전체(≤900×700·≤1MB·캔버스 일치 — `kb_down`과 같음)", **선택**(필수 판정 제외), 대응 `input://keyboard` `special` 값(§3.7 표) | 설명 |
| 4 | §5.1 창 크기 재계산 트리거 ③ | `is_canvas_layer()` 설명에 `key_*` 6개 포함(판정 코드 불변) | 설명만 |
| 5 | 분류 → 슬롯 대응 | `special` → `AssetSlot` 대응 표를 bridge TS(또는 ui)에 둔다: `space→key_space`, `z→key_z`, `question→key_question`, `exclamation→key_exclamation`, `enter→key_enter`, `backspace→key_backspace`. core에는 대응 함수 없음(§3.7) | 신규 TS 상수(선택 — bridge-designer 결정) |
| 6 | 손 기준점 재계산 안 함 목록(§9.1-4) | `key_*` 등록·삭제는 재계산 대상 아님 | 설명 |
| 7 | 반영 묶음 | Rust 쪽은 단독으로 컴파일된다. 다만 [hook.md](hook.md) §9 `special`(bridge `events.rs` 컴파일 오류 유발)과 같은 CR이므로 **hook·assets·bridge(Rust·TS)를 한 묶음**으로 넣는 것을 권장 | — |
| 8 | 변경 이력 | "AssetSlot: 특수 키 이미지 슬롯 6개 추가(CR-021, OV-R-22 — 추가). `input://keyboard` `special` 추가" | — |

- 새 command·event 없음. 에러 코드 추가 없음(검증 실패는 기존 `ASSET_TOO_LARGE`·`ASSET_CANVAS_MISMATCH` 등 그대로).
- UI 요구(계층 밖, ui-manager 인계용): **UI-M6 (CR-021)** settings — 특수 키 6개 등록 칸(settings R-14 보류 범위, `src/settings/requirements.md`), **UI-M7 (CR-021)** overlay — 특수 키가 눌려 있는 동안 해당 슬롯 그림(없으면 `kb_down`) + 바운스, 떼면 `kb_up`(OV-R-22). 겹칠 때 우선순위는 ui 설계([hook.md](hook.md) §11 확인 필요 2).

### 9.5 CR-019 — 슬롯 `'slam'` 삭제 (계약 §3.1·§5.1·§6) — **호환성: TS·IPC 파괴, 저장 데이터 비파괴**

| # | 계약 위치 | 요구 | 호환성 분류 |
|---|---|---|---|
| 1 | TS `AssetSlot` 합집합 | `'slam'` 삭제 → `'background' \| 'body' \| 'idle' \| 'rest' \| 'kb_up' \| 'mouse_base' \| 'mouse_left' \| 'mouse_right' \| { kind: 'kb_down'; index: number }` (`src/bridge/types.ts:12`) | **TS 파괴** — `'slam'` 리터럴 사용처(테스트 픽스처 `src/overlay/test/*`의 슬롯 목록 등) 갱신 필요 |
| 2 | Rust 계약 블록 `SimpleSlot` | `Slam` 삭제 → `pub enum SimpleSlot { Background, Body, Idle, Rest, KbUp, MouseBase, MouseLeft, MouseRight }` | — |
| 3 | §3.1 슬롯 표 | `idle` / `rest` / ~~`slam`~~ 행 → **`idle` / `rest`**, 일반 상태, 캔버스, 필수. 필수 이미지 = **4장: `kb_up`, `kb_down`(0 이상), `idle`, `rest`**(확정사항 §4). v0.8 확인 필요 문구(`idle`·`rest`·`slam` 필수 여부)는 확정사항 §4로 해소 표시. core는 필수 슬롯을 검사하지 않는다(판정은 ui) | 설명 |
| 4 | §5.1 창 크기 재계산 트리거 ③ | `is_canvas_layer()` 나열에서 `slam` 삭제(판정 코드는 `is_canvas_layer()` 그대로라 bridge 코드 변경 없음) | 설명만 |
| 5 | §6 `ASSET_MANIFEST` 발생 조건 | "manifest.json 손상" → **"manifest.json 최상위 구조 손상(JSON 문법, `canvas`·`entries` 모양). 항목 하나가 해석되지 않으면(폐기된 `slam` 슬롯 등) 그 항목만 빠진 매니페스트를 정상 반환(core 경고 로그)"** | 완화(비파괴) |
| 6 | `get_manifest`·`import_asset`·`remove_asset` 설명 | 옛 `slam` 항목이 있는 사용자 폴더에서도 성공한다. `assets/slam.png`는 지우지 않으며 매니페스트에 나타나지 않는다. 다음 등록·삭제 때 manifest.json에서 `slam` 줄이 사라진다 | 비파괴 |
| 7 | 전환 위험 | 옛 ui가 `import_asset`/`remove_asset`에 `'slam'`을 보내면 새 Rust는 **명령 인자 역직렬화 실패**(Tauri 인자 오류 — `CommandError` 아님). 따라서 **core·bridge(Rust·TS)·ui를 한 반영 묶음**으로 넣는다. [settings.md](settings.md) §9.0(`Settings.slam` 삭제)과 같은 묶음 | 파괴(IPC) |
| 8 | 변경 이력 | "AssetSlot: `'slam'` 삭제(쾅 폐기, CR-019 — TS·IPC 파괴). 옛 manifest.json의 `slam` 항목은 건너뛰고 읽음(`ASSET_MANIFEST` 완화). 필수 이미지 4장" | — |

- 새 command·event 없음. 에러 코드 추가·삭제 없음.

### 9.1 손 기준점 — 기존 command·event 유지 (2차, 적용 완료)

| 종류 | 이름 | 필드·타입 | 빈도 | 실패 사유 |
|---|---|---|---|---|
| command(기존) | `get_hand_anchor` | 인자 없음 → `Point \| null`(캔버스 좌표, 소수 2자리) | 창 마운트 시 1회 | `state.poisoned`만 |
| event(기존) | `assets://hand-anchor-changed` | `{ anchor: Point \| null }` | 재계산 결과가 이전 캐시와 다를 때만 | — |

bridge가 지킬 것:

1. 캐시·잠금·실패 처리·emit 순서: 기존 계약 §5.1 그대로.
2. 호출 인자: `assets::compute_hand_anchor(&assets_dir, &manifest, m.shoulder, m.part_pos)`.
3. 재계산 시점(🔒): ① 앱 시작 ② `import_asset` 성공 + `mouse_base` ③ `remove_asset` 성공 + `mouse_base` ④ `set_settings` 성공 + `(shoulder, part_pos)` 또는 `mouse` 켜짐/꺼짐 변경.
4. 재계산 안 함 목록: 배율·유휴·표시·자동 실행·드래그 창 위치·`mouse_left/right`·`background`, `area`·`hand` 변경(**CR-019: 목록의 "쾅" 삭제** — [settings.md](settings.md) §9.0-6).

### 9.2 에러 — 새 계약 코드 없음 (2차, 적용 완료)

`ASSET_TOO_LARGE` "모든 이미지 >900×700 또는 >1MB", `ASSET_CANVAS_MISMATCH`에 마우스 파츠 문구, `MousePartMismatch` → `ASSET_CANVAS_MISMATCH`.

### 9.3 슬롯 표 (2차, 적용 완료)

마우스 파츠 행 "≤900×700·≤1MB. 셋이 같은 크기. 캔버스와 무관. 위치는 `Settings.mouse.partPos`".

### 9.4 UI 요구 명세 (계층 밖 — ui-manager 인계용, 요구만)

| # | 대상 | 요구 |
|---|---|---|
| UI-M1~M3 | overlay·settings | (2차, 적용 완료) 마우스 파츠 위치·회전·기준점 |
| **UI-M4 (CR-019)** | settings | 이미지 등록 화면에서 키연타(`slam`) 슬롯 제거. 필수 표시 4장(`kb_up`, `kb_down_0`+, `idle`, `rest`) |
| **UI-M5 (CR-019)** | overlay | 상태 기계에서 `'slam'` 상태·`slamUntil`·bounce 제거. `heldCount`는 `kbDown = heldCount > 0` 판정에 계속 쓴다([settings.md](settings.md) §11 D14) |

## 10. 요구 추적표

| 요구ID | 반영 절 | 상태 |
|---|---|---|
| **OV-R-22 (CR-021) — 특수 키 슬롯 6개(🔒 이름)** | §2, §3.7, §8.9 K1 | ✅ 설계 · 소스 반영 |
| **OV-R-22 보강(🔒 5차) — 되돌리기 슬롯 `KeyUndo`(`key_undo`)** | §2, §3.7, §8.9 K1·K2, §9.6 | ✅ 설계 · 소스 반영 |
| **OV-R-22 (CR-021) — 규격 §3 그대로(캔버스 레이어)** | §3.7, §8.9 K2~K5 | ✅ 설계 · 소스 반영 |
| **OV-R-22 (CR-021) — 선택(필수 아님)** | §3.7(core는 필수 판정 안 함) | 부분(core 해당 없음 — ui 판정) |
| **OV-R-22 (CR-021) — 없으면 `kb_down`, 누르는 동안 표시·바운스** | §9.6 UI-M7(요구만) | 부분(ui 몫) |
| **CR-019 — `SimpleSlot::Slam` 삭제(슬롯 폐기)** | §2, §3 표, §8.8 L6 | ✅ 설계 · 소스 반영 |
| **CR-019 — 옛 manifest.json `slam` 항목이 있어도 나머지를 읽음(건너뜀·경고)** | §2 `load_manifest`, §3.6, §6 `Manifest`, §8.8 L1~L5 | ✅ 설계 · 소스 반영 |
| **CR-019 — 캔버스 재계산(건너뛴 항목이 유일 캔버스 레이어일 때)** | §3.6 동작 표, §8.8 L2·L5·L8 | ✅ 설계 · 소스 반영 |
| **CR-019 — `slam.png` 남겨 둠, 다음 저장 때 항목 정리** | §3.6, §11 D21, §8.8 L7·L8 | ✅ 설계 · 소스 반영 |
| **CR-019 — 필수 이미지 4장** | §3.4(필수 판정은 ui), §9.5-3, §9.4 UI-M4 | 부분(core 해당 없음 — ui 판정) |
| ST-R-02 — 캔버스 레이어 규칙 | §3.5, §6 | ✅(기존) |
| ST-R-02 — 마우스 파츠 ≤900×700·1MB·셋 같은 크기 | §2 `validate`, §3.5, §6, §8.2 | ✅(구현 완료) |
| OV-R-02 | §2 `AssetSlot` | ✅(CR-019로 슬롯 1개 감소) |
| OV-R-08 — 단일 모드 | §2 삭제 항목, §3.5 | ✅(구현 완료, 요구 문서 문구 확인 필요 1) |
| OV-R-14 — 끝부분 무게중심·캔버스 좌표·클릭 이미지 공유 | §2, §3.2, §8.1, §8.3 | ✅(구현 완료) |
| OV-R-14 — 폴백 `hand` → 영역 중심 | §2 `Ok(None)` 조건, §7 | 부분(폴백 적용은 ui) |
| OV-R-14 / R-tmp-2 — 위치 변경 시 재계산 | §9.1-3 ④ | ✅(bridge 구현 완료) |
| R-tmp-2 — 위치 (x, y) | §7(인자), [settings.md](settings.md) | 부분(요구ID 미부여 — 확인 필요 2) |
| OV-R-17 — 배경 | §3.4, §8.6 | ✅(구현 완료) |
| **R-tmp-4 (CR-024) — 펜 슬롯 `pen_up`·`pen_down_{n}`·`pen_key_*` 7개(🔒 이름)** | §2, §3.8, §8.10 P1·P2 | ✅ 설계 · 소스 반영 |
| **R-tmp-4 — 규격 ≤900×700·≤1MB, 펜 그림끼리 같은 크기, 캔버스·마우스 파츠와 무관** | §3.8, §6 `PenPartMismatch`, §8.10 P3~P7 | ✅ 설계 · 소스 반영 |
| **R-tmp-4 — 캔버스 레이어 아님(`is_canvas_layer` false)** | §2, §3.8, §8.10 P2·P6 | ✅ 설계 · 소스 반영 |
| **R-tmp-4 — 손 기준점 계산에 쓰지 않음(확인)** | §3.8, §8.10 P9 | ✅ 설계 · 소스 반영(동작 불변 증명) |
| **R-tmp-4 — 옛 manifest 호환(양방향)** | §3.8 호환 표, §8.10 P8 | ✅ 설계 · 소스 반영 |
| **R-tmp-4 — 위치 `mouse.penPos`** | [settings.md](settings.md) 6차 | 부분(settings 몫) |
| **R-tmp-4 — 선택·그림 교체·팔 끝 추종·`kb_up` 고정** | §9.7 UI-M8·UI-M9(요구만) | 부분(ui 몫) |

- **상태 정정 (core-survey Q11-1, 2026-09-24):** 위 표의 「✅ 설계 · 소스 미적용」(OV-R-22·CR-019·R-tmp-4)과 §3.9의 SV2-07은 모두 **소스 적용 완료**다(`slot.rs:30-50·76-80`, `manifest_load.rs`, `pen_part_tests.rs`, `url.rs`). SV2-07의 수동 A-M1 실측 기록은 이 문서에 아직 없다.

CR-035 증분:

| 요구ID | 반영 절 | 상태 |
|---|---|---|
| DA-01 — 기본 세트 15장 내장(include_bytes!, 원본 `doc/assets/defaults/`) — **현재 6장(0.4.0, hair 제외, §3.16.0)** | §2, §3.10.1, §3.16.1, D1·D2·D3 | ✅ 설계 · 소스 반영 |
| **CR-053 (🔒 2026-09-27, CR-044 대체)** — 배포용 기본 세트 3차: `DEFAULT_ASSETS` 7장(hair·pomo_char 추가, kb_down_0 제거), 시딩·복원·내보내기 규칙 불변 | §1, §2, §3.16 | ✅ 설계 · 소스 반영 |
| DA-02 — 첫 실행 시딩, 기존 데이터 덮어쓰기 금지, 앱 시작 막지 않음 | §2, §3.10.2(lib.rs 포함), D4~D8 | ✅ 설계 · 소스 반영 |
| DA-03 — 기본값 복원(검증 먼저, 실패 시 사용자 그림 보존) | §2, §3.10.3, D9~D11 | ✅ 설계 · 소스 반영 |
| DA-03 — 복원 후처리(리사이즈·`assets://changed`·기준점) | §3.10.6-1 | 부분(bridge 몫) |
| DA-04 — 기본 없는 칸 비우기 | `remove` 불변 | 해당 없음(core 변경 없음) |
| DA-05 — 내보내기(절대 경로·충돌 미리 검사·임시 파일 + rename·부분 실패 보고) | §2, §3.10.4, D12~D16 | ✅ 설계 · 소스 반영 |
| DA-06 — `asset.no_default`·`asset.export_dir` | §6, D16·D17 | ✅ 설계 · 소스 반영 |
| DA-07 — 기본 `mouse_base` 손 기준점 실측(단언 없음) | §3.10.5 M1 | ✅ 설계 · 소스 반영. 값 변경은 [settings.md](settings.md) §3.7 |
| DA-08·DA-09 | — | 해당 없음(ui 몫) |

**CR-036 추적 (2026-09-25)**

| 요구 | 반영 절 | 상태 |
|---|---|---|
| CR-036 (🔒 2026-09-25, 확정사항 §6) — 팔·손 파츠 크기 자유, 상한(≤900×700·1MB·32bit)만 | §3.11.1~3.11.3, §8.11 | ✅ 설계 · 소스 반영 |
| ST-R-02 — 마우스 파츠 "셋이 같은 크기" 부분 | §3.11로 대체(폐기). 캔버스 레이어 같은 크기는 불변(§3.4, K3·K4) | 부분 — 요구 문서 문구 갱신 필요(C36-2) |
| R-tmp-4 — "펜 그림끼리 같은 크기" 부분 | §3.11로 대체(폐기) | 부분 — 같음(C36-2) |
| **TM-08 (CR-048, 저장소) — 알림음 형식 판별(매직)·1MiB 선검사·고정 이름 저장·다른 형식 삭제** | §3.15.1~§3.15.4, §3.15.5 A1~A10 | ✅ 설계 · 소스 반영 |
| **TM-08 — 조회(`current`, 오버레이 재생 TM-07의 원천)·삭제(멱등)** | §3.15.3, §3.15.5 A11~A13 | ✅ 설계 · 소스 반영 (재생·미리 듣기는 ui) |
| **TM-08 — `AssetSlot`·매니페스트와 분리(A-1), 사용자 경로 이름 불사용(SEC-002 원칙)** | §3.15.4, A10 | ✅ 설계 |
| **TM-13 — `SoundError` 원문 ko·code 3개** | §3.15.1, A14 | ✅ 설계 (3개 국어는 ui) |

## 11. 설계 결정 노트

### CR-036 결정 (2026-09-25)

| # | 결정 | 대안 | 채택 근거 |
|---|---|---|---|
| D31 | `MousePartMismatch`·`PenPartMismatch` **삭제** | 변형 유지(발생 안 함) | 발생 경로가 없는 변형은 요구로 역추적되지 않는다(스킬 §10). 참조는 assets 내부·테스트뿐, bridge는 `code()`·`to_string()`만 써서 파급 0(Grep 2026-09-25) |
| D32 | 파츠 무시를 `validate`(캔버스 레이어일 때만 비교)와 `group_size`(파츠 → `None`) **둘 다**에 둔다 | `group_size`만 `None` | `validate`는 공개 함수라 호출자가 파츠에 `Some`을 넘길 수 있다. 그때 `CanvasMismatch`("배경·몸통 등 캔버스 그림…") 문구가 파츠에 나오면 틀린 안내다. `group_size` 쪽 `None`은 불필요한 순회를 없앤다 |
| D33 | 마이그레이션 없음 | 저장된 파츠 크기 재검사 | 규칙 완화라 기존 매니페스트는 모두 유효. D18(옛 파츠 크기 불일치 방치)은 의미를 잃는다 |

### 확인 필요 — CR-036

- C36-1: 손 기준점은 `mouse_base`에서만 계산한다(불변). 클릭 그림(`mouse_left`·`mouse_right`)이나 펜 그림(`pen_up`↔`pen_down_N`)의 크기·손끝 위치가 서로 다르면 전환 순간 그림이 어긋나 보일 수 있다. core는 바꾸지 않는다 — 같은 `partPos`·`penPos`로 그리는 ui 표시 판단은 사용자·ui-manager 몫.
- C36-2: `src/settings/requirements.md` ST-R-02 문구와 R-tmp-4(요구ID 미부여)의 "같은 크기"를 CR-036에 맞게 고쳐야 한다(ui-designer 소관).

- CR-035 결정 D33~D40, 파급, 확인 필요는 **§3.10.7**에 있다.
- **CR-044 (🔒 사용자 확정, 2026-09-26, 구현 참고)**: 배포용 기본 세트 2차 교체로 `DEFAULT_ASSETS`가 7장→6장(hair 제외, 원본 hair.png 없음)이 됐다. 캔버스 3장(kb_up·kb_down_0·background) 900×700, `mouse_base` 168×151, `pen_up`·`pen_down_0` 119×196(`assets/defaults.rs`, `tests/default_assets.rs`).

### CR-024 결정 (2026-09-24)

| # | 결정 | 대안 | 채택 근거 |
|---|---|---|---|
| **D28** | 펜 누름 순번 슬롯은 **새 단일 변형 enum `PenDownKind` + 새 변형 `AssetSlot::PenDown { kind, index }`** (JSON 모양은 kb_down과 같음) | ① `KbDownKind`에 `PenDown` 변형을 더해 `AssetSlot::KbDown { kind, index }`를 함께 쓴다 ② `KbDown`을 `Frame { kind: FrameKind, index }`로 일반화(이름 변경) | ①은 기존 `AssetSlot::KbDown { .. }` 패턴이 펜 프레임까지 잡아 `file_key`(`kb_down_{n}` 고정)·분류가 **컴파일 오류 없이** 틀린다(조용한 결함), 타입 이름 `KbDownKind`도 거짓이 된다. ②는 공개 이름 변경으로 테스트·예제·계약 파급이 생기는데 요구가 없다. 채택안은 구조·JSON 모양을 그대로 재사용하면서 새 변형이라 `match` 누락을 컴파일러가 잡고, `KbDownKind`가 `"pen_down"`을 거부하므로 untagged 해석도 모호하지 않다(P2) |
| **D29** | 펜 그룹 기준 = **이 슬롯을 뺀 첫 번째 다른 펜 그림 크기** | `pen_up`만 기준(`pen_up`이 없으면 다른 펜 그림은 크기 자유 또는 거부) | 그룹 안 그림이 모두 같은 크기라 `pen_up`이 있으면 두 규칙의 결과가 같다(🔒 "pen_up 기준 그룹" 충족). 차이는 `pen_up`이 없을 때뿐인데 채택안은 그때도 펜끼리 크기를 맞춰 나중에 `pen_up`을 넣을 기준이 이미 있다. 마우스 파츠 D17과 같은 코드 모양. 등록 순서 강제는 요구 없음(확인 필요 A) |
| **D30** | 크기 불일치는 새 변형 **`PenPartMismatch`**, `code()`는 기존 `asset.canvas_mismatch` | `MousePartMismatch` 재사용 / 새 코드 `asset.pen_mismatch` | "마우스 파츠" 문구가 펜 그림 오류에 나오면 틀린 안내. `error.rs:39-41`이 `code()`·`to_string()`으로 옮기므로 계약·bridge 코드 파급 0(D15와 같은 근거) |
| **D31** | 분류 **`pub fn is_pen_part`** 신설, `is_canvas_layer = !mouse && !pen` | `pub(super)` / 그룹 enum `SlotGroup` 도입 | `is_mouse_part`와 대칭인 공개 분류 한 벌 — TS `isPenPartSlot`(§9.7-3)과 같은 집합을 문서·코드로 고정. 그룹 enum은 그룹 셋에 과하다(넷째 그룹이 생기면 재검토) |
| **D32** | 펜 테스트 P3~P9는 **새 파일 `pen_part_tests.rs`**, 직렬화·분류 P1·P2만 `slot.rs` | `mod.rs`에 추가 | `mod.rs` 적용 후 약 745줄(800 한계 근접). `mouse_part_tests.rs`와 같은 배치 |

### 파급 — CR-024 (Grep 2026-09-24)

| 파일·위치 | 변경 | 소관 | 컴파일 |
|---|---|---|---|
| `src-tauri/src/assets/slot.rs` | 변형 8·`PenDownKind`·`PenDown`·`pen_down`·`file_key` 9팔·`is_pen_part`·`is_canvas_layer`·`//!`·P1·P2 | core-implementer | — |
| `src-tauri/src/assets/mod.rs` | `pub use`에 `PenDownKind`, `PenPartMismatch`·`code()`, `mismatch_error`, `group_size` 분기, `mod pen_part_tests;`, `//!` | core-implementer | — |
| `src-tauri/src/assets/pen_part_tests.rs` | 신규(P3~P9) | core-implementer | — |
| `anchor.rs`·`manifest_load.rs`·`mouse_part_tests.rs`·`tests/*.rs` | 없음 | — | — |
| `src-tauri/examples/import_sample.rs` | 슬롯 파서 변경 불필요(요구 없음). `MouseSettings` 리터럴(`:69`)은 [settings.md](settings.md) CR-024 파급 | — | settings 쪽 **깨짐** |
| `src-tauri/src/bridge/commands.rs:95,113,146`·`error.rs:39` | 없음(`is_canvas_layer()`·`MouseBase` 비교·`code()` 경유) | — | — |
| `doc/200_설계/bridge/contract.md` §3.1·§5.1·§6·변경 이력 | §9.7 | bridge-designer | — |
| `src/bridge/types.ts:12,28-32` | `AssetSlot` 추가, **`slotKey`·`isKbDownSlot` 수정**, 분류 도우미 | bridge-implementer | TS |
| `src/settings/`·`src/overlay/` | UI-M8·UI-M9 | ui | — |

### 확인 필요 — CR-024

- A. **등록 순서**: `pen_up` 없이 `pen_down`·`pen_key_*`만 등록하는 것을 core는 허용한다(D29). ui가 막거나 안내할지 ui-designer 판단.
- B. **요구ID**: R-tmp-4(펜 쥔 손)는 화면 요구 문서(OV-R·ST-R)에 부여 필요 — ui-designer 소관.
- C. **붙는 점**: 펜 손이 팔 끝의 어느 점을 따라가는지(권장: `get_hand_anchor` 손 기준점 — 쉬는 자세에서 `penPos`와의 상대 위치를 유지한 채 팔의 회전·늘어나기로 그 점을 옮기고, 그림은 같은 각도로 회전·크기 불변)는 ui 설계. core는 기준점만 제공하고 펜 그림을 읽지 않는다.
- D. `pen_*` 그림 삭제 시 `penPos` 유지 여부 — assets는 설정을 쓰지 않는다(§7). ui 판단(권장: 유지 — 같은 그림을 다시 넣으면 자리 그대로).

### CR-021 결정 (2026-09-24)

| # | 결정 | 대안 | 채택 근거 |
|---|---|---|---|
| **D24** | 특수 키 그림을 **`SimpleSlot` 변형 6개**로 둔다 | ① `KbDown`처럼 `{ kind: "key", which: "space" }` 객체 슬롯 ② 슬롯 1개 + 인덱스 | 🔒 이름 고정(`SimpleSlot::Key*`, 파일 키 `key_*`). 6종은 닫힌 목록이라 문자열 슬롯이 계약·TS에서 가장 단순하다. 객체 슬롯은 untagged 해석 분기를 늘린다 |
| **D25** | 슬롯 정의를 **새 파일 `slot.rs`로 옮기고** `pub use`로 재노출 | ① `mod.rs`에 그대로 추가 ② `mod.rs`의 배경 테스트(B1~B15)를 다른 파일로 빼서 줄 수 확보 | ①은 783 + 변형 6 + 팔 6 + 주석·`//!` ≈ 797~800줄로 한계(800, 골든 원칙 §1)에 닿고 테스트를 넣을 자리가 없다. ②는 테스트만 옮기는 일이라 늘어나는 슬롯과 무관하다. 슬롯은 CR마다 바뀌는 응집 단위(CR-014 배경, CR-019 삭제, CR-021 추가)라 한 파일에 모으면 다음 변경도 그 파일 하나다. 외부 경로·시그니처 불변 |
| **D26** | 새 슬롯은 **분류 메서드 본문을 바꾸지 않고** 캔버스 레이어가 된다(`is_canvas_layer = !is_mouse_part`) | 명시적 `is_special_key()` 메서드 추가 | 요구된 동작(규격·캔버스 규칙)이 기존 분류로 모두 성립한다. 새 메서드는 쓰는 곳이 없다(스킬 §10) |
| **D27** | 분류(`SpecialKey`) → 슬롯 대응을 core에 두지 **않는다** | `impl From<hook::SpecialKey> for SimpleSlot` | hook·assets 사이 의존 방향이 없다(스킬 §1 — hook은 아무 모듈도 의존하지 않고, assets → hook도 허용 목록에 없다). 그림 선택은 ui 책임. 이름 규칙 `key_{special}`(K1)으로 TS 대응 표가 기계적이다 |

### 파급 — CR-021 (Grep 2026-09-24)

| 파일·위치 | 변경 | 소관 | 컴파일 |
|---|---|---|---|
| `src-tauri/src/assets/mod.rs:48-117`, `//!` | 슬롯 구획을 `slot.rs`로 이동, `mod slot;`·`pub use` | core-implementer | — |
| `src-tauri/src/assets/slot.rs` | 신규(§3.7 + §8.9 K1~K6) | core-implementer | — |
| `src-tauri/src/assets/{anchor,manifest_load,mouse_part_tests}.rs`, `tests/*.rs` | 없음(`SimpleSlot::…` 경로는 재노출로 유지) | — | — |
| `src-tauri/examples/import_sample.rs:12-19` | 변경 불필요(문자열 파서 — 새 슬롯은 기존 기타 분기). 예시 도구에 키 이름을 넣는 것은 요구 없음 | — | — |
| `src-tauri/src/bridge/commands.rs:113`, `lib.rs` | 없음(`MouseBase` 비교·`is_canvas_layer()`만) | — | — |
| `doc/200_설계/bridge/contract.md` §3.1·§5.1·변경 이력 | §9.6 | bridge-designer | — |
| `src/bridge/types.ts:12` `AssetSlot` | 6개 추가 | bridge-implementer | TS |
| `src/settings/`·`src/overlay/` | UI-M6·UI-M7 | ui | — |

### CR-019 결정 (2026-09-24)

| # | 결정 | 대안 | 채택 근거 |
|---|---|---|---|
| **D20** | 매니페스트를 **최상위 → 항목 단위 두 단계로 해석**, 해석 안 되는 항목은 건너뛰고 경고 로그(원인 무관 — 알 수 없는 슬롯·필드 누락 모두) | ① `SimpleSlot`에 `#[serde(other)] Unknown` 변형을 두어 흡수 ② `Slam`을 `#[deprecated]`로 남겨 읽기만 허용 ③ 전체 실패 유지 ④ 알 수 없는 슬롯만 골라 건너뛰고 다른 항목 오류는 전체 실패 | ①·②는 폐기된 값이 공개 enum·계약(TS `AssetSlot`)에 남아 ui까지 번진다 — 🔒 "슬롯 삭제"와 충돌. ③은 §3.6 표대로 등록·삭제가 영구히 막힌다. ④는 오류 종류를 가르는 코드가 늘지만 얻는 것이 없다 — 항목 하나 손상 때문에 다른 그림을 모두 잃는 것은 어떤 원인이든 과한 대가다(settings D9와 같은 판단). 최상위 손상은 복구할 기준이 없으므로 기존대로 오류 |
| **D21** | **`assets/slam.png`는 남겨 둔다**(자동 삭제 안 함) | ① 로드 시 삭제 ② 다음 `save_manifest` 때 매니페스트에 없는 PNG 정리 ③ 앱 시작 1회 정리 | ① 읽기 경로(`load_manifest` — 호출자 5곳)에 파일 삭제 부수 효과가 생기고 매 호출 시도된다. ②·③은 "매니페스트에 없는 파일 = 쓰레기" 규칙을 새로 만드는 것으로 요구가 없다(스킬 §10), 사용자가 손으로 넣은 파일까지 지울 위험. 공통: 앱 데이터 삭제는 되돌릴 수 없고(원본이 없으면 영구 손실) 프로젝트 정책도 앱 데이터 삭제를 막는다. 남겨 둬도 해가 없다 — 최대 1MB, 매니페스트에 없어 읽히지도 표시되지도 않고, `"slam"` 파일 키를 쓰는 슬롯이 없어 충돌도 없다. 정리 기능은 후보로만(확인 필요 6) |
| **D22** | 건너뛴 항목이 **하나라도 있을 때만** `recompute_canvas` | ① 항상 재계산 ② 재계산 안 함 | ②는 `slam`이 유일한 캔버스 레이어였던 경우 `canvas`가 유령 값으로 남아 창 크기(window)·표시가 어긋난다. ①도 정상 파일에선 같은 결과지만, 옛 버전이 저장한 `canvas`가 규칙과 다를 가능성(마우스 파츠 규칙 변경 이력)을 건드리지 않는 쪽이 기존 동작 보존에 안전하다(L5가 증명) |
| **D23** | 관대한 로드를 **새 비공개 파일 `manifest_load.rs`**에 둔다 | `mod.rs`에 직접 | `mod.rs` 782줄 — 직접 넣으면(코드 약 25줄 + 테스트) 800줄 한계 초과(골든 원칙 §1). 자식 모듈이라 `recompute_canvas` 가시성 변경 없이 호출 가능. 공개 API 표면 불변 |

### 이전 결정

| # | 결정 | 대안 | 채택 근거 |
|---|---|---|---|
| D1 | 끝부분 무게중심(상위 25%, 알파 가중) | 전체 무게중심 | 🔒 사용자 지정(CR-007) |
| D2 | Rust(assets)에서 계산 | TS canvas `getImageData` | asset 프로토콜 이미지 CORS 오염 위험. 픽셀 접근은 assets 책임 |
| D3 | 해독에 `tauri::image::Image::from_bytes` | `png` 크레이트 직접 / inflate 직접 | 새 의존성·승인 불필요 |
| D4 | 문턱 동점 전부 포함 | 정확히 k개 | 순서 무관·대칭 |
| D5 | k = ⌈n/4⌉, 최소 1 | ⌊n/4⌋ | 픽셀 1~3개도 결과 |
| D6 | 픽셀 중심 +0.5, 소수 2자리 | 정수 좌표 | 기존 규칙 유지 |
| D7 | 계산은 별도 함수(`import`에 넣지 않음) | `import`/`remove`가 계산 | 기준점이 설정(어깨·위치)에 의존 |
| ~~D8~~ | ~~손바닥 모드는 `None`~~ | — | 폐기(2026-09-23) |
| D9 | 해독 실패는 `Err(Decode)`, bridge가 `None`으로 강등 | assets가 삼킴 | 원인 로그 보존 |
| D10~D12 | 배경 = `SimpleSlot` 첫 변형, 캔버스 레이어, 배경만으로도 캔버스 결정 | — | 기존 결정 유지 |
| D13 | `compute_hand_anchor`에 `part_pos: Point` 인자를 따로 추가 | `&MouseSettings` 통째 전달 | 결과가 인자에만 의존, assets는 `Point` 타입만 의존 |
| D14 | 거리·무게중심을 처음부터 캔버스 좌표로 계산, 마지막에 한 번 반올림 | 그림 좌표 계산 후 더함 | 이중 반올림 회피, 요구를 코드 모양 그대로 |
| D15 | 마우스 파츠 크기 불일치는 새 변형 `MousePartMismatch`, `code()`는 기존 `asset.canvas_mismatch` | `CanvasMismatch` 재사용 / 새 코드 | 문구 정확성 + 계약 파급 0 |
| D16 | `validate` 4번째 인자를 "같은 그룹 기준 크기"로 재정의 | 인자 추가 | 호출 형태 불변 |
| D17 | 마우스 파츠 그룹 기준 = 이 슬롯을 뺀 첫 번째 다른 마우스 파츠 크기 | 매니페스트에 `mouse_size` 저장 | 캔버스 규칙과 대칭, 매니페스트 모양 불변 |
| D18 | 옛 데이터 마이그레이션 없음 | 로드 시 검사·거부 | `load_manifest`는 재검증하지 않는 기존 원칙(CR-019도 항목 **해석**만 하고 규격 재검증은 하지 않음) |
| D19 | `part_pos`와 캔버스·그림 크기의 범위 검사 없음 | 캔버스 밖이면 거부 | 요구 없음 |

### 파급 — CR-019 (Grep 2026-09-24)

| 파일·위치 | 변경 | 소관 | 컴파일 |
|---|---|---|---|
| `src-tauri/src/assets/mod.rs:54,92` | `Slam` 변형·`file_key` 팔 삭제 | core-implementer | — |
| `src-tauri/src/assets/mod.rs:31-33,307-314`, `//!` | `mod manifest_load;`, `load_manifest` 본문 교체, 문서주석 | core-implementer | — |
| `src-tauri/src/assets/manifest_load.rs` | 신규(§3.6 코드 + §8.8 L1~L8) | core-implementer | — |
| `src-tauri/examples/import_sample.rs:3,16` | 문서주석 슬롯 목록에서 `slam` 삭제, 파서의 `"slam" => simple(SimpleSlot::Slam),` 팔 삭제(이후 `"slam"` 입력은 파서의 기존 기타 분기로 간다). `:70-72,76`의 설정 `slam`은 [settings.md](settings.md) §11 CR-019 파급 | core-implementer | **깨짐**(`SimpleSlot::Slam` 없음) |
| `src-tauri/tests/sample_assets.rs`, `tests/mouse_area_defaults.rs` | 없음(`slam` 미사용 확인) | — | — |
| `src-tauri/src/bridge/commands.rs`, `lib.rs`, `error.rs` | 코드 변경 없음(슬롯 명시 나열 없음 — `is_canvas_layer()`·`MouseBase` 비교만) | — | — |
| `doc/200_설계/bridge/contract.md` §3.1·§5.1·§6·변경 이력 | §9.5 | bridge-designer | — |
| `src/bridge/types.ts:12` | `AssetSlot`에서 `'slam'` 삭제 | bridge-implementer | TS 컴파일 오류로 사용처 드러남 |
| `src/overlay/components/LayerStack.tsx:42`, `src/state/inputMachine.ts`, 테스트(`src/overlay/test/{handPart,layers,OverlayApp,OverlayApp.mouse}.test.tsx` 등의 `'slam'` 슬롯·상태) | 쾅 상태·슬롯 제거 | ui | 같음 |

- core 슬롯 삭제는 bridge Rust 코드 변경 없이 컴파일된다. 단 settings 쪽 `SlamSettings` 재노출(`bridge/types.rs:17`)이 함께 깨지므로 **core·bridge Rust를 한 묶음**으로 반영한다([settings.md](settings.md) §11 CR-019 파급). IPC 파괴(§9.5-7) 때문에 ui까지 같은 반영 묶음 권장.

### 확인 필요

1. **요구 문서 문구**: `src/overlay/requirements.md` R-08·R-02·R-16, `src/settings/requirements.md` R-07이 폐기 전 문구일 수 있다 — ui-designer 소관. **CR-019: OV-R-02 슬롯 목록·OV-R-06(쾅)·ST-R-05의 키연타 문구와 필수 이미지 수(5 → 4)도 갱신 필요.**
2. **R-tmp-2 요구ID**: 마우스 파츠 위치 (x, y)에 화면 요구ID가 없다. settings 화면 요구(ST-R-xx)로 부여 필요.
3. S2 전제(`mouse_pen_layer.png`와 `mouse_pen_hand.png` 픽셀 일치) — 기존 기록.
4. 계약 §3.3 `hand` 설명·§3.6 문구의 "레이어 이동 모드" 표현 — 기존 기록.
5. 후보(요구 없음, 미설계): 등록 시 `mouse_base` 전체 해독으로 손상 파일을 미리 거부하는 검증 6단계.
6. **(CR-019) 후보(요구 없음, 미설계): 고아 파일 정리** — 매니페스트에 없는 `assets/*.png`(예: 옛 `slam.png`)를 설정 화면에서 사용자가 확인 후 지우는 기능. 필요하면 요구로 승격 후 설계(§11 D21).
7. **(CR-019) 스킬 문서**: `.claude/skills/core-design-strategy/SKILL.md` §6 파일명 목록의 `state_slam.png`(및 `state_idle.png` 등 실제 `file_key`와 다른 이름)와 쾅 기본값 — 스킬 소유자(메인 세션) 갱신 필요.
