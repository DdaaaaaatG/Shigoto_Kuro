# bridge 계약 (command · event) — 단일 소스

- 버전: **v0.27** (초안 — 사용자 확정 후 매니저가 v1로 올린다) — CR-058/059 타이머 기본값 문서 정정(아래 (v0.27) 줄, 코드 변경 없음). 이하 v0.26 기록: `reset_app_data` 호출 창 제한(배포 전 검증 SEC-002)·ui 보조 문구 정정(CR-003)·머리말 반영 상태 정정(아래 (v0.26) 줄). **소스 반영 상태**(2026-09-27 bridge-designer 실물 확인): v0.25까지 Rust·TS 핸들러·테스트 구현 완료, `src-tauri/src/lib.rs:193` `generate_handler!`에 `bridge::commands::reset_app_data` **등록됨**(v0.25 개정 때 적은 「`generate_handler!` 1줄 등록 미반영」은 그 뒤 해소된 옛 기록). **v0.26 소스 반영 완료**(2026-09-27, bridge-implementer — `src-tauri/src/bridge/commands/mod.rs`의 `ensure_reset_caller`·`reset_app_data`(주입 인자 `caller: tauri::WebviewWindow` 추가), `src-tauri/src/bridge/commands/tests.rs`의 `ensure_reset_caller_allows_settings_only`. TS 변경 없음). 작성: 2026-09-22 · 개정: 2026-09-29
- (v0.27) CR-058/059 기본값 반영(🔒 사용자 지정 2026-09-28, 0.4.0 배포 기본 세트 — overlay CR-058·settings CR-059, 배포 전 검증 `doc/300_검증/verify-20260929-1928.md` 리뷰 CR-201): **문서 정정, 코드 변경 없음** — 0.4.0에 이미 구현·배포된 값에 계약을 맞춘다. §3.3 `TimerSettings` 기본값 `textPos` (142, 458) → **(268, 402)**, `rotation` 9 → **7**, `alarmVolume` 80 → **44**(TS 코드블록·Rust 주석·JSON 예시·기본값 표·관대한 역직렬화 대체값·옛 파일 호환 문장). 기본 알림음 서술을 「ui가 합성한 Blob URL」 → 「ui에 번들된 정적 mp3(`src/assets/sounds/default-alarm.mp3`, CSP `media-src 'self'`)」로 정정(§3.10·§5.9-4·5·§7·§9 TM-09). `enabled`·`mode`·`countdownSecs`·`fontSize`·`color` 기본값은 코드와 같아 불변. 필드·타입·command·event·에러 code·권한 불변. 정본 값: core `src-tauri/src/settings/timer.rs` `TimerSettings::default()`·`DEFAULT_ALARM_VOLUME`, TS `src/bridge/types.ts` `DEFAULT_TIMER_SETTINGS`.
- (v0.26) 배포 전 검증 WARN 수정(사용자 승인 2026-09-27, 상위 세션 경유): ① **SEC-002(MEDIUM)** `reset_app_data`가 오버레이 창에서도 호출될 수 있던 문제(확인 절차는 settings UI에만 있음) — 핸들러가 Tauri 자동 주입 인자 `window: tauri::WebviewWindow`로 호출 창 라벨을 받아 `"settings"`가 아니면 설정 잠금·core 호출·emit·창 조작보다 **먼저** 새 code `reset.forbidden`으로 거부한다(§5·§5.10 0단계·「호출 창 제한」·§6·§6.2). 판정은 tauri 의존 없는 순수 함수 `ensure_reset_caller(label: &str) -> Result<(), BridgeError>`. JS 인자·TS 래퍼 `resetAppData()`·반환 불변, TS 타입 변경 없음(`BridgeError.code: string`). ② **CR-003(LOW)** §5.10 「소비자」·「ui 보조」의 「pending 동안 다른 조작을 막는다」 → 「초기화 버튼 재진입만 막는다」(settings `src/settings/design/general-tab.md` §7 해석 결정과 일치). ③ 머리말 반영 상태 정정(위 줄). 권한·capabilities·`tauri.conf.json` 불변(§7). 새 command·event·타입·필드 없음. 호환성 **비파괴**(호출 조건 강화이지만 ui 사용처가 settings 창 `src/settings/components/ResetAllCard.tsx:48` 1곳뿐) + **추가**(code 1).
- (v0.25) data-reset(🔒 사용자 결정 2026-09-27, 설계 `doc/200_설계/architecture/data-reset-02-design.md` §0·§3, 인계 패킷 `data-reset-03-packet-bridge.md`, core `doc/200_설계/core/data_reset.md` §9): 요구 `R-B2`·`R-B3`·`R-A2`(아키텍처 횡단 ID — §9 v0.25). 신규 command `reset_app_data() -> void`(동기, **🔒 베타 전용** — 정식 배포 때 정책 재결정)와 상세 §5.10(보존 규칙·처리 순서·부분 실패·동시 실행 직렬화 불변식 C-4), §4 기존 이벤트 4종 발신 지점 추가 + 「두 스냅숏 이벤트 도착 순서 비의존」 주석 + 시작 초기화 무이벤트 주석, §5 `get_settings`·`get_asset_manifest` 시작 초기화 주석(R-A2), 에러 code `reset.io`·`reset.seed`(§6·§6.1·§6.2 — 24 → 26). 새 이벤트·타입·필드·권한 없음. 호환성 **추가**(파괴 없음). **소스 반영**(2026-09-27, bridge-implementer): `src-tauri/src/bridge/types.rs`(`From<ResetError> for BridgeError`), `src-tauri/src/bridge/commands/mod.rs`(`reset_app_data`·`reapply_after_reset`), `src-tauri/src/bridge/commands/tests.rs`(`reset_error_maps_to_bridge_codes`), `src/bridge/commands.ts`(`resetAppData`), `src/bridge/__tests__/commands.test.ts`. ~~**미반영**: `src-tauri/src/lib.rs`의 `generate_handler!` 등록(가드 차단 — 이 command는 아직 앱에서 호출 불가).~~ **(v0.26 정정) 등록 완료** — `src-tauri/src/lib.rs:193`(2026-09-27 Read 확인).
- (v0.24 머리말) 버전 v0.24 — CR-053 배포용 기본 세트 3차(v0.20 CR-044 마우스 기본값은 그대로, 내장 기본 슬롯 목록·타이머 좌표만 재조정). **소스 반영**(2026-09-27, bridge-implementer): `src-tauri/src/bridge/commands/tests.rs`(내보내기 개수 6→7), `src/bridge/types.ts`(`DEFAULT_ASSET_SLOTS` 7개·`DEFAULT_TIMER_SETTINGS.textPos`·`.rotation`), `src/bridge/__tests__/types.test.ts`. core 선행 완료(2026-09-27 — `src-tauri/src/assets/defaults.rs` `DEFAULT_ASSETS`·`src-tauri/src/settings/timer.rs::default()`). 작성: 2026-09-22 · 개정: 2026-09-27
- (v0.24) CR-053 배포용 기본 세트 3차(🔒 사용자 확정 2026-09-27, 확정사항 §6 「배포용 기본 세트 3차」, CR-044 일부 대체): §3.1 `DEFAULT_ASSET_SLOTS`(§6·§9 함께 갱신) **6개 → 7개** — `kb_up`, `background`, `hair`, `pomo_char`, `mouse_base`, `pen_up`, `pen_down_0`(순서 = core `DEFAULT_ASSETS` 동일). `kb_down_0`은 v0.18~v0.22엔 내장 기본이 있었으나 **CR-053부터 다시 없음**. `hair`는 v0.20(CR-044)~v0.22엔 없었으나 **다시 있음**. `pomo_char`는 v0.21(CR-045) 도입 이후 처음으로 내장 기본이 **생김**. `pomo_bubble`은 계속 없음. §3.3 `DEFAULT_TIMER_SETTINGS`(§5.8 `timer` 표) `textPos` `(268, 403)` → **`(142, 458)`**, `rotation` `5` → **`9`**(`fontSize`·`color`·`enabled`·`mode`·`countdownSecs`·`alarmVolume`은 변경 없음). `DEFAULT_MOUSE_SETTINGS`(v0.20 CR-044 `shoulder`·`partPos`·`penPos`)는 이번 변경 대상 아님(값 불변). `REQUIRED_SLOTS`·`Settings`·`AssetSlot` 유니온 멤버·command·event·에러 code·권한 불변 — **비파괴**(상수 값·목록 재조정, 모양·타입 불변). 화면(ui) 파급은 §9 v0.24에 목록만(수정 안 함). 작성 근거: 원본 설계 문서 없음 — 확정사항 §6 「배포용 기본 세트 3차」가 유일한 소스(core-implementer가 core 값을 먼저 반영, bridge는 그 값을 따라갔다).
- (v0.23) CR-048 타이머 모드(🔒 확정사항 §6 103~107행, 설계 `doc/200_설계/architecture/timer-mode-02-design.md` §4, 인계 패킷 `timer-mode-03-packet-bridge.md`, 사용자 결정 D-1~D-11 권고안 확정, 아키텍트 결정 A-1~A-5): 요구 `TM-01`·`TM-04`~`TM-11`·`TM-13`(아키텍처 ID — §9 v0.23). `TimerSettings` 선택 필드 `mode`·`countdownSecs`·`alarmVolume`과 TS 상수(§3.3), `TimerMode`·`TimerStatus` `'finished'`·`TimerSnapshot` 선택 필드 `mode`·`durationMs`(§3.9), 신규 타입 `AlarmFormat`·`AlarmSound`(§3.10), `timer://changed` 발신 지점 교체(§4 — 모든 경로가 core 깔때기 `crate::publish_timer_change`), 신규 command `get_alarm_sound`·`import_alarm_sound`·`remove_alarm_sound`(§5·§5.9 — **이벤트 없음**, A-1), `control_timer`·`set_resting` 설명 보강(§5), `set_settings` 타이머 부수 효과 교체(§5.3 6단계 — 이력·패킷상 「7단계」), TS 래퍼 `pickAudioFile`(§5.4), 카운트다운 전이표·규칙 1·5·7·8(§5.8), 에러 code `sound.not_audio`·`sound.too_many_bytes`·`sound.io` + `timer.disabled` 문구 변경(§6·§6.1·§6.2). 호환성: **추가·비파괴**(새 TS 필드는 선택 표기 — ui 픽스처 tsc 영향 없음). capabilities 추가 없음, `tauri.conf.json` 변경 요청 2건은 메인 세션 반영 완료(§7 — 2026-09-26 실물 확인).
- (v0.22 반영 상태) 버전 v0.22 — CR-047 점검 후 정리(저장 단일 창구·자동 실행 승격 제거). **소스 반영**(2026-09-26, bridge-implementer): Rust `src-tauri/src/bridge/commands.rs`(`set_settings`·`set_overlay_position`·`set_overlay_visible`를 `settings::update` 경유로 교체, `set_autostart` 문서주석에서 `autostart.cancelled`·UAC·승격 문구 제거), `types.rs`(`AutostartError` 변환 문서주석 갱신 — 로직은 `e.code()`/`e.to_string()` 그대로라 변경 없음). `settings::save`·`AutostartError::Cancelled`는 core가 CR-047로 이미 정리(확인만). 증거: `cargo fmt --check`·`cargo clippy -- -D warnings`(0 경고)·`cargo test`(300 유닛 + 30 통합 PASS), `yarn test --run src/bridge`(68 PASS). TS 소스 변경 없음(command·event·타입 표면 불변). 작성: 2026-09-22 · 개정: 2026-09-26
- (v0.22) CR-047 점검 후 정리(🔒 확정사항 §6 「점검 후 정리」 2026-09-26, 설계 `doc/200_설계/core/settings.md` §3.9·`tray.md` §3.5): **B2** `set_settings` — 저장을 `settings::save`(잠금 밖) → `settings::update`(잠금 안에서 core 소유 필드 병합·검증·원자 저장·메모리 대입 한 번)로 교체, 저장 뒤 재병합 단계 삭제, `settings://changed`를 창 적용(`apply_overlay_window`)보다 먼저 emit(§5.3 절차 갱신). **B3** `set_overlay_position`·`set_overlay_visible` — 같은 방식으로 `update` 교체, emit은 잠금 밖(§5 표 갱신). **B1** `set_autostart` — 시그니처·에러 목록 불변, **`autostart.cancelled` 폐기**(승격 경로 삭제로 UAC 취소 자체가 없다 — SEC-001), 설명 문구를 "일반 권한(LeastPrivilege), 승격 없음, 보통 1초 안팎"으로 정정(§5·§5.5). **B4** §6·§6.1·§6.2에서 `autostart.cancelled` code·매핑·발생 목록 삭제(폐기 표기), `settings::save` 언급을 `settings::update`로. 새 command·event·필드 없음 — **호환성: 비파괴**(에러 code 하나 폐기 = 발생 경로가 없어졌을 뿐 타입·이름 불변, 사실상 미사용이라 파괴 아님). 권한 추가 없음. **소스 반영 완료(2026-09-26, bridge-implementer)** — 아래 줄.
- (v0.21) CR-045 뽀모도 타이머 계약. **소스 반영**(2026-09-26, bridge-implementer): Rust `src-tauri/src/bridge/{types,commands,events}.rs`(`get_timer`·`control_timer`·`set_resting` 핸들러, `TIMER_CHANGED` 상수·`emit_timer_changed`, `TimerSettings`·`TimerSnapshot`·`TimerAction`·`TimerStatus` 재수출, `From<TimerError> for BridgeError`), TS `src/bridge/{types,commands,events}.ts`(슬롯 2·`TimerSettings`·`DEFAULT_TIMER_SETTINGS`·`TIMER_*_MIN/MAX`·`Settings.timer`·`getTimer`·`controlTimer`·`setResting`·`onTimerChanged`). `generate_handler!` 3줄 등록(`get_timer`·`control_timer`·`set_resting`)은 `lib.rs`가 core 소관이라 bridge-implementer가 하지 않음 — core 변경 요구로 메인 세션에 보고. 작성: 2026-09-22 · 개정: 2026-09-26
- (v0.21) CR-045 뽀모도 타이머(🔒 확정사항 §6 CR-045, 설계 `doc/200_설계/architecture/pomodoro-02-design.md`, 인계 패킷 `pomodoro-03-packet-bridge.md`, 사용자 결정 U-1~U-8 권고안 채택): 요구 `PT-01`·`PT-03`~`PT-10`(아키텍처 ID — 화면 ID 확정 시 교체, §9 v0.21). 슬롯 `'pomo_char'`·`'pomo_bubble'`(§3.1 — 캔버스 레이어·선택·내장 기본 없음), `Settings.timer: TimerSettings`와 TS 상수 `DEFAULT_TIMER_SETTINGS`·`TIMER_*_MIN/MAX`(§3.3), 타입 `TimerStatus`·`TimerSnapshot`·`TimerAction`(§3.9), 신규 event 도메인 `timer://changed`(§4), 신규 command `get_timer`·`control_timer(action)`·`set_resting(resting)`(§5·§5.8), `set_settings` 끔 부수 효과(§5.3 7단계), 에러 code `timer.disabled`(§6). 호환성: IPC·저장 데이터 **추가**(옛 settings.json은 기본값 — 비파괴), TS `Settings.timer` **필수 필드 추가(TS 파괴 — `Settings` 리터럴 픽스처 tsc)**. 권한 추가 없음(§7). core·bridge·ui 한 묶음 반영.
- (v0.20 반영 상태) CR-044 마우스 기본값 재조정 + hair 내장 기본 제외. bridge(TS) 소스 반영 완료(2026-09-26, bridge-implementer: `src/bridge/types.ts` `DEFAULT_ASSET_SLOTS`·`DEFAULT_MOUSE_SETTINGS`, `src/bridge/__tests__/types.test.ts`). **core 미반영** — `settings::default_mouse()`·`assets::defaults::DEFAULT_ASSETS`가 아직 옛 값(§3.1·§3.3 「core 반영 대기」 참고, core-implementer 몫). 작성: 2026-09-22 · 개정: 2026-09-26
- (v0.20) CR-044 마우스 기본값 재조정 + hair 내장 기본 제외(🔒 사용자 확정 2026-09-26): `DEFAULT_MOUSE_SETTINGS`(§3.3)의 `shoulder` (558,500)→**(582,484)**, `partPos` (389,492)→**(411,464)**, `penPos` (356,504)→**(372,476)**. `penMode`·`area`·`hand`는 변경 없음. `DEFAULT_ASSET_SLOTS`(§3.1)에서 `hair`를 뺐다(7개 → **6개**, `hasBuiltinDefault('hair')`가 다시 `false`). 새 command·event·타입·에러 code·권한 없음. 호환성: 상수 **값 변경**(모양 불변) — 저장 파일 `settings.json`에 이미 값이 있으면 영향 없음(기본값은 새 설치·리셋 때만 쓰인다), **비파괴**로 분류하되 `restore_default_asset('hair')`가 core에서 여전히 성공하는 동안은 TS `hasBuiltinDefault('hair') === false`와 core 동작이 어긋난다(§3.1 「core 반영 대기」) — core 동기화 전까지 임시 불일치로 명시. 화면·화면 테스트는 bridge 소관 밖이라 고치지 않았다(아래 「영향」).
- (v0.19) CR-043 타자 입력 1 선택 강등(🔒 사용자 확정, 확정사항 §6 「타자 입력 1 선택 강등」): 필수 이미지 3장(`kb_up`·`kb_down_0`·`mouse_base`) → **2장**(`kb_up`·`mouse_base`). `{kind:'kb_down', index:0}`을 `REQUIRED_SLOTS`(§3.1)에서 뺐다. 새 command·event·타입·에러 code·권한 없음. 호환성: TS 상수 값 축소(안내 기준 완화) — **비파괴**. 영향: `src/settings`의 `REQUIRED_SLOTS`·`isRequiredSlot` 사용처(안내 문구·테스트)가 영향받을 수 있음 — 화면·화면 테스트는 bridge 소관 밖이라 고치지 않았다(§9 v0.19 목록).
- (v0.17) CR-037 헤어(뒷머리) 파츠(🔒 사용자 결정 2026-09-25, 확정사항 §6 「헤어(뒷머리) 파츠」): `AssetSlot`에 문자열 슬롯 `'hair'`(Rust `SimpleSlot::Hair`, JSON `"hair"`)를 더했다(§3.1). 캔버스 레이어(core `is_canvas_layer()` = true — 크기 한도·캔버스 일치·창 리사이즈 규칙이 `background`와 같다), 1장 고정, 위치 설정 없음, **선택**(`REQUIRED_SLOTS` 불변), **내장 기본 없음**(`DEFAULT_ASSET_SLOTS` 15개 불변, `hasBuiltinDefault('hair')` = false → 「기본값」 = `remove_asset`). 새 command·event·`Settings` 필드·에러 code·권한 없음. 호환성: IPC·저장 데이터 **추가**, TS 유니온 멤버 추가 **비파괴**(비테스트 소스에 `AssetSlot` 전수 `switch`·`Record<…Slot, …>` 없음 — 영향 지점 §9 v0.17). core·bridge·ui 한 묶음 반영(새 ui + 옛 Rust = 인자 역직렬화 실패). 화면 요구ID 미부여 — 추적 키 `CR-037`(§8·§9 v0.17).
- (v0.16a) CR-036 팔·손 파츠 크기 규칙 폐기(🔒 2026-09-25, 확정사항 §6 「팔·손 파츠 크기 자유」): §3.1 마우스 파츠·펜 그림끼리 크기 일치 규칙 삭제, §6 `asset.canvas_mismatch`를 캔버스 레이어 불일치로 한정. command·event·타입·code 목록·권한 불변, bridge Rust 코드 변경 없음(TS 주석 정정만 — §9 v0.16a). 호환성 비파괴(검증 완화). (머리말 줄은 v0.17에서 보충)
- (v0.16 반영 상태) CR-035 기본 이미지 세트 **소스 반영 완료**(2026-09-25, bridge-implementer). core 선행 완료(`assets::defaults`·`assets::export`·`AssetError::{NoDefault, ExportDir}`·`default_mouse().pen_pos = Some(380,496)` 확인) → bridge 구현: Rust `restore_default_asset`·`export_default_assets` 핸들러(`src-tauri/src/bridge/commands.rs`, 공용 후처리 `after_asset_change`로 `import_asset`·`remove_asset`과 통합) + `ExportReport`·`ExportFailure` 재수출(`types.rs`) + TS `DEFAULT_ASSET_SLOTS`·`hasBuiltinDefault`·`ExportReport`·`ExportFailure`·`restoreDefaultAsset`·`exportDefaultAssets`·`pickFolder`·`DEFAULT_MOUSE_SETTINGS.penPos`(`src/bridge/`). §9 v0.16 「소스 주석 불일치 정정 목록」 #2~#6 반영. **`lib.rs` `generate_handler!` 미등록 — core 변경 요구로 남음**(bridge-implementer는 lib.rs를 쓰지 않는다, 아래). 작성: 2026-09-22 · 개정: 2026-09-25
- (v0.16) CR-035 기본 이미지 세트(🔒 사용자 결정 2026-09-24, 설계 `doc/200_설계/architecture/default-assets-02-design.md`, 인계 패킷 `default-assets-03-packet-bridge.md`): 요구 `DA-01`·`DA-02`·`DA-03`·`DA-05`·`DA-06`·`DA-07`(아키텍처 ID — 화면 ID 확정 시 교체, §9). 신규 command `restore_default_asset(slot) -> AssetManifest`(후처리·이벤트 = `import_asset`과 같음)·`export_default_assets(dir, overwrite) -> ExportReport`(이벤트 없음)(§5·§5.7), 타입 `ExportReport`·`ExportFailure`(§3.2.1), TS 상수 `DEFAULT_ASSET_SLOTS`(15)·`hasBuiltinDefault`와 첫 실행 시딩(§3.1), TS 래퍼 `pickFolder`(§5.4 — 기존 `dialog:allow-open`), `MouseSettings.penPos` 기본 `null` → `{x:380, y:496}`(🔒 U-2 = B, §3.3), 에러 code `asset.no_default`·`asset.export_dir`(§6). 호환성: **추가**(command 2·타입 2·TS 상수·래퍼·code 2)·**비파괴**(`penPos` 기본값 — 모양 불변). 권한 추가 없음(§7). 문서 정정: §3.2 Rust `Size` → 실물 `CanvasSize`. 소스 주석 불일치 5건은 bridge-implementer 몫(§9 v0.16).
- (v0.15 반영 상태) CR-033 **소스 반영 완료**(2026-09-24). TS `MouseSettings.penMode: boolean` + `DEFAULT_MOUSE_SETTINGS.penMode = false`(`src/bridge/types.ts`), Rust `types.rs`는 `crate::settings::MouseSettings` 재수출이라 core `pen_mode: bool` 반영이 곧 bridge 반영 — 문서주석 머리말만 v0.15로 갱신. 새 command·event·에러 코드·권한 없음(비고 그대로). 이 변경으로 `src/overlay`·`src/settings`의 `MouseSettings` 리터럴 픽스처 13곳이 `yarn tsc --noEmit`에서 깨진다(목록은 §8 v0.15 행) — 그 파일들은 bridge 소관이 아니라 고치지 않았다. 작성: 2026-09-22 · 개정: 2026-09-24
- (v0.15) CR-033 펜 손 사용 토글(🔒 사용자 결정 2026-09-24, 확정사항 §3 「펜 손 사용 토글」): 펜 모드를 `pen_up` 등록 여부가 아니라 설정 스위치로 켜고 끈다. `Settings.mouse.penMode: boolean`(기본 `false`, Rust `pen_mode: bool` + `#[serde(default)]`)을 더했다(§3.3). 새 command·event·에러 코드·권한 없음 — 저장은 기존 `set_settings`, 창 간 동기화는 기존 `settings://changed`. 호환성: IPC·저장 데이터 **추가**, TS **필수 필드 추가(파괴)**. core `settings` 선행(core 변경 요구 — §9 v0.15), core·bridge·ui 한 묶음 반영. 화면 요구ID 미부여 — 추적 키 `CR-033`(§8 v0.15, §9 v0.15).
- (v0.14) settings-v2 설정 창 개편(🔒 사용자 결정 2026-09-24, 확정사항 §6 「설정 창 개편」, 설계 `doc/200_설계/architecture/settings-v2-02-design.md` D-1~D-10, 인계 패킷 `settings-v2-03-packet-bridge.md`): 요구 `SV2-02`~`SV2-08`·`SV2-11`·`SV2-12`(아키텍처 ID — 화면 ID가 정해지면 `ST-R-xx`로 교체, §9). `Settings`에 `language`·`positionLock`·`showInTaskbar`(§3.3), `set_settings`가 입력 `autostart`를 무시하고 위치 잠금·작업표시줄을 적용(§5.3 — **의미 변경**), `set_autostart` async·작업 스케줄러·UAC 취소 code(§5.5), 신규 `reset_overlay_position -> Position`(§5.6), TS `REQUIRED_SLOTS`·`isRequiredSlot`(§3.1)·`Position`(§3.4)·`pickPngFile(title?)`·`setSettingsWindowTitle`(§5.4), 에러 code 정본을 실물 `영역.사유` 표기로(§6 — D-3), capabilities를 실물 기준으로 정리(§7). 호환성: 추가 + TS 필수 필드 3개(파괴) + `set_settings` 의미 변경(파괴 가능 — 실사용 영향 없음)(§8 v0.14).
- (v0.13) CR-024 펜 쥔 손 파츠(🔒 사용자 결정 2026-09-24, 확정사항 §3 「펜 쥔 손 파츠」): 요구 `OV-R-25`(`src/overlay/requirements.md` v2.2)·`ST-R-18`(`src/settings/requirements.md` v1.6). `AssetSlot`에 펜 쥔 손 슬롯 9형태(`pen_up`·`{kind:'pen_down', index}`·`pen_key_*` 7개 — 캔버스 레이어도 마우스 파츠도 아닌 세 번째 그룹, 펜 그림끼리 같은 크기)를 더하고 TS 슬롯 도우미(`slotKey`·`isKbDownSlot`·`isPenDownSlot`·`isMousePartSlot`)를 고정했으며(§3.1), `Settings.mouse.penPos: Point | null`(기본 `null`)을 더했다(§3.3). 창 리사이즈·손 기준점 재계산 대상 아님(§5.1·§5.2), `ASSET_CANVAS_MISMATCH`에 펜 그룹(§6). 저장 데이터·IPC 값은 추가, TS는 파괴(필수 필드·합집합 객체 변형) — **core(assets·settings)·bridge(Rust·TS)·ui 한 묶음 반영**. 근거 core `assets.md` §3.8·§9.7, `settings.md` §3.1.1·§9.4. core 문서의 임시 요구ID `R-tmp-4`는 `OV-R-25`·`ST-R-18`로 읽는다(§8 v0.13, §9 v0.13).
- (v0.12) CR-023 키 꾹 누름 부르르(🔒 사용자 결정 2026-09-24, 확정사항 §4 키보드 파츠 행): 요구 `OV-R-24`(`src/overlay/requirements.md` v2.1). `input://keyboard`에 `repeat: boolean`(항상 포함, TS 필수)을 추가했다 — 이미 눌린 키의 OS 자동 반복 누름이 이제 `repeat: true` 누름 이벤트로 온다(§3.7·§3.7.1·§4). 모양은 추가지만 `pressed: true`가 누르고 있는 동안 반복해서 오므로 **의미 변경 — ui 선행 또는 core·bridge·ui 한 묶음 반영 필요**(§3.7.1 「전환 위험」). 근거 core `hook.md` §3.5(A1~A7)·§9.2(RB1~RB9). core 문서의 임시 요구ID `R-tmp-1`은 `OV-R-24`로 읽는다(§8 v0.12, §9 v0.12).
- (v0.11) CR-021 특수 키 이미지(🔒 사용자 결정 2026-09-24, 확정사항 §5 「특수 키 이미지」): 요구 `OV-R-22`(`src/overlay/requirements.md` v1.8). `input://keyboard`에 `special`(7종 분류값 또는 `null`)을 추가하고(§3.7·§4), 키보드 입력 개인정보 규칙을 새로 두고(§3.8), `AssetSlot`에 특수 키 슬롯 7개를 추가했다(§3.1). 7번째 `undo`(Ctrl+Z)와 「Ctrl을 누른 채 누른 다른 키는 `null`」 규칙은 같은 날 사용자 결정(🔒 확정사항 §5 7종)이다. 근거 core `hook.md` §9(B1~B9)·`assets.md` §9.6 — 이 두 문서에는 `undo`·Ctrl 규칙이 아직 없다(§3.7 「core 선행 필요」)(§8 v0.11, §9 v0.11).
- (v0.10) CR-019·CR-020 쾅(키연타) 메커니즘 폐기(🔒 사용자 결정 2026-09-24): 폐기 요구 `OV-R-06`(`src/overlay/requirements.md` v1.7)·`ST-R-05`(`src/settings/requirements.md` v1.5), 대체 요구 없음. 이 두 요구에만 닿던 계약 항목(`Settings.slam`·`SlamSettings`·`AssetSlot` `'slam'`)을 삭제했다(§8 v0.10, §9 v0.10).
- 이 문서가 `src/bridge/types.ts`(TS 타입)와 `src-tauri/src/bridge/`(Rust 구조체·핸들러)의 **유일한 기준**이다. 셋이 어긋나면 bridge 결함이다.
- 규칙의 단일 소스는 `.claude/skills/bridge-design-strategy`. 제품 확정값은 `doc/000_프로젝트_확정사항.md`.
- 요구ID 표기: `OV-R-xx` = `src/overlay/requirements.md`, `ST-R-xx` = `src/settings/requirements.md`(`doc/100_요구조건/`에는 아직 R-xx 목록이 없다). v0.3~v0.9에서 새로 만들거나 바꾼 항목만 매핑했고, 나머지 `미정` 열은 요구 매핑 작업 때 채운다. 요구 추적표는 §9. (v0.9) CR-017은 overlay `OV-R-20`(목표점·모니터)·`OV-R-21`(팔 변형·폴백), CR-018은 settings `ST-R-15`·`ST-R-16`·`ST-R-17`(리셋)로 매핑한다. 폐기된 `OV-R-14` 인용은 기준점 규칙을 이어받은 `OV-R-21`로, 폐기된 리셋 요구 `ST-R-09` 인용은 `ST-R-17`로 바꿨다(§8 변경 이력 행은 기록이라 그대로 둔다).

---

## 1. 개요와 위상

```
ui (React)  →  bridge (command · event)  →  core (Rust 모듈)
```

- **command**: UI → Rust. `invoke('이름', 인자)`로 호출하고 결과를 받는다. 실패는 항상 `BridgeError`로 reject.
- **event**: Rust → UI. `emit('도메인://동작', 페이로드)`로 밀어 준다. UI는 구독만 한다.
- 화면 코드(`src/overlay`, `src/settings`)는 `src/bridge/` 래퍼만 호출한다. `@tauri-apps/api`의 `invoke`·`listen`을 화면에서 직접 쓰지 않는다.
- core 모듈은 이 계약을 모른다. core는 `src-tauri/src/bridge/`를 통해서만 밖으로 나간다.

## 2. 직렬화 규약

| 항목 | 규칙 |
|---|---|
| 필드 이름 | Rust `#[serde(rename_all = "camelCase")]` → JSON·TS는 camelCase |
| 시각 | `ts: number` = Unix epoch **밀리초** |
| 좌표 | 가상 화면(모든 모니터 합) 절대 좌표, 물리 픽셀, 원점은 주 모니터 좌상단 |
| 열거 | 문자열 리터럴(`'left' | 'right'`) — 숫자 열거 금지 |
| 없음 | `null` (TS `| null`, Rust `Option<T>`), `undefined`는 쓰지 않는다 |
| 색 | CSS 색 문자열 (`'#RRGGBB'` 또는 `'rgba(...)'`) |

## 3. 타입 정의

### 3.1 `AssetSlot` — 이미지 슬롯

레이어 모델(확정사항 §4)의 슬롯. `kb_down`만 인덱스를 가진다(누름 이미지 여러 장 순환).

**TS**
```ts
export type AssetSlot =
  | 'background'                                   // v0.6 — 맨 아래 레이어라 맨 앞
  | 'hair'                                         // (v0.17, CR-037) 헤어(뒷머리) — 캔버스 레이어, 겹침은 배경 바로 위. JSON "hair"(문자열 형태). 실물은 SimpleAssetSlot 유니온
  | 'body' | 'idle' | 'rest' | 'kb_up'              // (v0.10, CR-019) 'slam' 삭제
  | { kind: 'kb_down'; index: number }
  | 'key_space' | 'key_z' | 'key_question'          // (v0.11, CR-021 · OV-R-22) 특수 키 이미지 = 'key_' + SpecialKey (§3.7)
  | 'key_exclamation' | 'key_enter' | 'key_backspace'
  | 'key_undo'                                      // (v0.11) Ctrl+Z 「뒤로가기」 그림
  | 'mouse_base' | 'mouse_left' | 'mouse_right'
  | 'pen_up'                                        // (v0.13, CR-024 · OV-R-25 · ST-R-18) 펜 쥔 손 — 평소(키가 하나도 안 눌림)
  | { kind: 'pen_down'; index: number }             // (v0.13) 펜 쥔 손 — 키 누름(index 0부터, kb_down과 같은 순번 구조)
  | 'pen_key_space' | 'pen_key_z' | 'pen_key_question'   // (v0.13) 펜 쥔 손 — 특수 키 = 'pen_key_' + SpecialKey (§3.7)
  | 'pen_key_exclamation' | 'pen_key_enter' | 'pen_key_backspace'
  | 'pen_key_undo'
```

**TS 슬롯 도우미 (v0.13 — `src/bridge/types.ts`, 계약으로 고정)**

(v0.13) 인덱스를 가진 슬롯이 `kb_down`·`pen_down` 둘이 된다(위 「`kb_down`만 인덱스를 가진다」는 v0.12까지의 문장이다). v0.12까지의 도우미는 「객체면 `kb_down`」으로 판정해 `pen_down`을 `kb_down_N`으로 오인한다 — 아래로 바꾼다.

```ts
export type KbDownSlot = { kind: 'kb_down'; index: number }
export type PenDownSlot = { kind: 'pen_down'; index: number }            // (v0.13) 신규
export const isKbDownSlot = (slot: AssetSlot): slot is KbDownSlot =>
  typeof slot === 'object' && slot.kind === 'kb_down'                   // (v0.13) 객체 여부 → kind 비교로 좁힘
export const isPenDownSlot = (slot: AssetSlot): slot is PenDownSlot =>  // (v0.13) 신규
  typeof slot === 'object' && slot.kind === 'pen_down'
export const slotKey = (slot: AssetSlot): string =>
  typeof slot === 'object' ? `${slot.kind}_${slot.index}` : slot         // (v0.13) = Rust AssetSlot::file_key() — "kb_down_N"·"pen_down_N"·문자열 슬롯은 그대로
export const isMousePartSlot = (slot: AssetSlot): boolean =>
  typeof slot === 'string' && slot.startsWith('mouse_')                 // (v0.13) `!isKbDownSlot(slot)` 전제가 pen_down 객체에서 깨져 문자열 판정으로
```

- 기존 값의 결과는 그대로다: `slotKey({kind:'kb_down', index:2})` = `"kb_down_2"`, 문자열 슬롯은 자기 자신. 달라지는 것은 `pen_down`뿐(`"pen_down_N"`, `isKbDownSlot` = false). `isMousePartSlot`은 마우스 파츠 3종만 true(펜 그림·`kb_down`·`pen_down`은 false). 그 주석의 옛 「≤256×256 손바닥」 문구는 v0.8에서 폐기된 규격이라 지운다.
- 펜 그룹 판정 도우미(`isPenPartSlot`)·`special` → `pen_key_*` 대응 상수는 두지 않는다 — 요구에서 역추적되는 bridge 사용처가 없다(대응 규칙 `pen_key_{special}`만 아래 슬롯 표로 고정, v0.11 `key_{special}`와 같은 근거). ui 설계가 필요로 하면 요구와 함께 요청한다.
- 테스트(bridge-implementer): `slotKey` — `kb_down`·`pen_down`·문자열 각 1건, `isKbDownSlot`·`isPenDownSlot` — 서로의 객체에 false, `isMousePartSlot` — `pen_up`·`pen_down`에 false.

**Rust**
```rust
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(untagged)]
pub enum AssetSlot {
    Simple(SimpleSlot),
    KbDown { kind: KbDownKind, index: u32 },
    PenDown { kind: PenDownKind, index: u32 },   // (v0.13, CR-024) 파일 키 "pen_down_{index}". untagged 해석 순서 Simple → KbDown → PenDown — "kb_down"은 KbDownKind만, "pen_down"은 PenDownKind만 받아 모호함 없음(core assets.md §3.8)
}
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum SimpleSlot {
    Background, Hair, Body, Idle, Rest, KbUp,   // (v0.17, CR-037) Hair → "hair". 겹침 순서(배경 바로 위)에 맞춰 Background 다음 — serde는 이름 기반이라 순서는 직렬화 무관. core 변경 요구(§9 v0.17)
    KeySpace, KeyZ, KeyQuestion, KeyExclamation, KeyEnter, KeyBackspace, KeyUndo,   // (v0.11, CR-021) → "key_space" … "key_backspace"·"key_undo"(KeyZ → "key_z"). 정의 파일 crate::assets::slot, 경로 crate::assets::SimpleSlot 불변(core assets.md §3.7·D25 — KeyUndo는 core 미반영, §3.7 「core 선행 필요」)
    MouseBase, MouseLeft, MouseRight,
    PenUp,                                                                                              // (v0.13, CR-024) → "pen_up"
    PenKeySpace, PenKeyZ, PenKeyQuestion, PenKeyExclamation, PenKeyEnter, PenKeyBackspace, PenKeyUndo,  // (v0.13) → "pen_key_space" … "pen_key_undo"(PenKeyZ → "pen_key_z"). 선언 순서 = core assets.md §3.8
}
// (v0.10, CR-019) Slam 삭제. 옛 manifest.json의 "slam" 항목은 core load_manifest가 건너뛴다(아래 「옛 매니페스트 호환」)
// v0.6: Background는 레이어 순서(맨 아래)에 맞춘 첫 변형. serde는 이름 기반이라 순서가 직렬화에 영향 없음(core assets.md §3.4, D12)
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum KbDownKind { KbDown }
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum PenDownKind { #[serde(rename = "pen_down")] PenDown }   // (v0.13) kind가 정확히 "pen_down"인지 강제(KbDownKind와 같은 구조). 정의 crate::assets::slot, 공개 경로 crate::assets::PenDownKind. derive 목록은 core 정의를 따른다
```

**JSON 직렬화 예시 (고정)**
```json
"background"
"body"
"kb_up"
{ "kind": "kb_down", "index": 0 }
"key_space"          // (v0.11) "key_z" · "key_question" · "key_exclamation" · "key_enter" · "key_backspace" · "key_undo"도 같은 문자열 형태
"mouse_left"
"pen_up"                              // (v0.13)
{ "kind": "pen_down", "index": 0 }    // (v0.13) { "kind": "kb_down", … }와 kind 값만 다르다
"pen_key_space"                       // (v0.13) "pen_key_z" · "pen_key_question" · "pen_key_exclamation" · "pen_key_enter" · "pen_key_backspace" · "pen_key_undo"도 같은 문자열 형태
```

| 슬롯 | 분류 | 크기 규칙 | 필수 |
|---|---|---|---|
| `background` | 배경 (v0.6) — 가장 맨 아래(마우스 파츠 z=0보다도 아래), 어떤 반응도 없음, 비면 투명. 표시는 ui 몫 | 캔버스 (캔버스 레이어 — core `is_canvas_layer()` = true. 크기 한도·캔버스 일치·창 리사이즈 규칙이 몸통과 같다. 저장 파일 `assets/background.png`) | **선택** |
| `hair` | 헤어(뒷머리) (v0.17, CR-037 · 🔒 확정사항 §6 「헤어(뒷머리) 파츠」) — 장발 캐릭터의 뒷머리만 따로 그린 그림. **1장 고정**(상태·키 입력으로 바뀌지 않음), 위치 설정 없음(`Settings` 필드 없음), 비면 투명. 겹침 순서(아래→위) **배경 → 헤어 → 팔·손(마우스 파츠·펜 쥔 손) → 본체(키보드 그림)**, 젤리·부르르는 본체와 한 덩어리(배경만 고정) — 표시·변환은 ui 몫. JSON `"hair"`(문자열 형태 — `"background"`와 같음). 내장 기본 그림 **없음**: `hasBuiltinDefault('hair')` = false → 「기본값」 = `remove_asset`(비우기), `restore_default_asset('hair')` = `asset.no_default` | 캔버스 (캔버스 레이어 — core `is_canvas_layer()` = true, `!is_mouse_part() && !is_pen_part()`로 자동. 크기 한도 ≤900×700·≤1MB·캔버스 일치(`asset.canvas_mismatch`)·창 리사이즈(§5.2-2 ③) 규칙이 `background`와 같다. 캔버스 레이어가 없을 때 먼저 넣으면 그 크기가 캔버스. 손 기준점 재계산 대상 아님 — `mouse_base`만 읽는다(§5.1). 저장 파일 `assets/hair.png`) | **선택** (`REQUIRED_SLOTS` 불변) |
| `pomo_char` / `pomo_bubble` | 뽀모도 인물 / 뽀모도 말풍선 (v0.21, CR-045 · PT-01 · 🔒 확정사항 §6 CR-045) — 배경 그룹 선택 슬롯 2개. 각 **1장 고정**(상태·입력으로 바뀌지 않음), 위치 설정 없음, 비면 투명. 겹침(아래→위) 배경 → 인물 → 말풍선 → 시간 글자(§3.3 `timer`) → 본체 덩어리, 고정(젤리·부르르 없음) — 표시는 ui 몫(PT-02). **TS**: 위 TS 블록의 `SimpleAssetSlot` 유니온에 `'pomo_char' \| 'pomo_bubble'`를 더한 것이 정본. **Rust**: `SimpleSlot::PomoChar`·`SimpleSlot::PomoBubble`(snake_case → **JSON `"pomo_char"`·`"pomo_bubble"`**, 문자열 형태 — `"hair"`와 같음. 위 Rust 블록에 두 변형을 더한 것이 정본, 선언 위치는 core 결정). 내장 기본 **없음**: `DEFAULT_ASSET_SLOTS`·`REQUIRED_SLOTS`·`isRequiredSlot`·`hasBuiltinDefault` **불변**(두 슬롯은 자동으로 false) → 「기본값」 = `remove_asset`(비우기), `restore_default_asset` = `asset.no_default` | 캔버스 (캔버스 레이어 — core `is_canvas_layer()` = true. `hair`·`background`와 같은 규칙: ≤900×700·≤1MB·캔버스 일치(`asset.canvas_mismatch`)·창 리사이즈(§5.2-2 ③). 손 기준점 재계산 대상 아님(§5.1). 저장 파일 `assets/pomo_char.png`·`assets/pomo_bubble.png`) | **선택** |
| `body` | 몸통 — (v0.8, OV-R-19) 있으면 항상 표시·고정, 비면 투명 | 캔버스 | **선택** (v0.8, OV-R-19. v0.7까지 필수) |
| `idle` / `rest` | 일반 상태 (v0.10, CR-019: `slam` 삭제). (v0.14, SV2-08) 없으면 오버레이는 `kb_up`만 보인다(상태 레이어 투명 — ui 몫) | 캔버스 | **선택** (v0.14, SV2-08. v0.13까지 필수) |
| `kb_up` | 키보드 파츠 들림 | 캔버스 | 필수 |
| `{kind:'kb_down', index}` | 키보드 파츠 누름 (index 0부터, 연속) | 캔버스 | **선택** (v0.19, CR-043. v0.14~v0.18: index 0 필수) |
| `key_space` / `key_z` / `key_question` / `key_exclamation` / `key_enter` / `key_backspace` / `key_undo` | 키보드 파츠 — 특수 키 이미지 (v0.11, OV-R-22 · 확정사항 §5 7종). `key_undo` = Ctrl+Z 「뒤로가기」 그림(`key_z`와 별개). 대응: `input://keyboard`의 `special` 값 → 슬롯 **`key_{special}`**(7개 모두 성립, 표 §3.7). 대응 함수·상수는 core·bridge에 두지 않는다 — core는 hook·assets가 서로 모르고(core assets.md D27), 계약은 규칙만 고정한다. 언제 어느 그림을 보일지(누르는 동안·겹칠 때·없으면 `kb_down`)는 ui 몫 | 캔버스 (캔버스 레이어 — core `is_canvas_layer()` = true, 분류 본문 불변 D26. 크기 한도 ≤900×700·≤1MB·캔버스 일치·창 리사이즈(§5.2-2 ③) 규칙이 `kb_down`과 같다. 캔버스 레이어가 없을 때 먼저 넣으면 그 크기가 캔버스. 손 기준점 재계산 대상 아님 — `compute_hand_anchor`는 `mouse_base`만 읽는다(core assets.md §9.6-6). 저장 파일 `assets/key_space.png` 등 슬롯 이름 그대로) | **선택** (필수 3장에 들지 않음 — v0.14) |
| `mouse_base` / `mouse_left` / `mouse_right` | 마우스 파츠 — (v0.8, OV-R-18) 모드 하나: 손만 그린 그림을 `Settings.mouse.partPos`(§3.3)에 놓고 어깨 축으로 회전. z=0(몸통 아래) | **≤900×700·≤1MB**(모든 이미지 공통). **크기 자유**(v0.16a, CR-036 — 마우스 파츠끼리 크기 일치 규칙 폐기. 셋이 서로 다른 크기여도 등록되며 크기 불일치 에러 없음). ~~v0.8~v0.16: 셋이 서로 같은 크기(둘 이상이면 나머지 마우스 파츠와 일치 — 위반 `ASSET_CANVAS_MISMATCH`)~~ **캔버스와 같을 필요 없음** — 캔버스를 정하지도 막지도 않는다(core `is_canvas_layer()` = false). 놓는 위치는 `Settings.mouse.partPos`. (v0.8: 손바닥 모드 ≤256×256·크기로 모드 자동 판별 폐기) | `mouse_base` **필수**(v0.14, SV2-08. v0.13까지 선택) / `mouse_left`·`mouse_right` 선택 |
| `pen_up` / `{kind:'pen_down', index}` / `pen_key_space` / `pen_key_z` / `pen_key_question` / `pen_key_exclamation` / `pen_key_enter` / `pen_key_backspace` / `pen_key_undo` | 펜 쥔 손 파츠 (v0.13, OV-R-25 · ST-R-18 · 확정사항 §3 「펜 쥔 손 파츠」) — 캔버스 레이어도 마우스 파츠도 아닌 **세 번째 그룹**(core `is_pen_part()` = true). `pen_up` = 평소, `pen_down` = 키 누름(index 0부터, 여러 장이면 순환 — `kb_down`과 같은 순번 구조), `pen_key_*` = 특수 키 7종 — 대응: `input://keyboard`의 `special` 값 → 슬롯 **`pen_key_{special}`**(없으면 `pen_down`). 놓는 위치 `Settings.mouse.penPos`(§3.3). 대응 함수·상수는 core·bridge에 두지 않는다(core assets.md §3.8). 언제 어느 그림을 보일지·팔을 따라가는 변환은 ui 몫 | **≤900×700·≤1MB**(모든 이미지 공통). **크기 자유**(v0.16a, CR-036 — 펜 그림끼리 크기 일치 규칙 폐기, 크기 불일치 에러 없음). ~~v0.13~v0.16: 펜 그림끼리 같은 크기(둘 이상이면 이 슬롯을 뺀 첫 번째 다른 펜 그림과 일치 — 위반 `ASSET_CANVAS_MISMATCH`)~~ **캔버스·마우스 파츠와 비교 안 함** — 캔버스를 정하지도 막지도 않는다(core `is_canvas_layer()` = false. 캔버스가 비어 있어도 등록된다). 창 리사이즈 대상 아님(§5.2-2 ③), 손 기준점 재계산 대상 아님(§5.1-3). 저장 파일 `assets/pen_up.png`·`assets/pen_down_N.png`·`assets/pen_key_space.png` 등 슬롯 이름 그대로 | **선택** |

- (v0.16a, CR-036) **크기 일치 그룹은 캔버스 레이어(캔버스와) 하나뿐이다.** 마우스 파츠·펜 그림은 한도(≤900×700·≤1MB)만 검사하고 서로 크기를 비교하지 않는다. ~~(v0.13) 크기 일치 그룹은 셋: 캔버스 레이어(캔버스와), 마우스 파츠(마우스 파츠끼리), 펜 그림(펜 그림끼리).~~ 이 절 밖(§3.3 `partPos`·`penPos` 의미의 「같은 크기·같은 위치」, §5.7 에러 열의 「마우스 파츠·펜 그림과 크기가 다를 때」)에 남은 파츠 크기 일치 서술은 v0.16a부터 「같은 위치」만 유효로 읽는다. §3.2 `canvas` 주석의 「마우스 파츠는 캔버스에 참여하지 않는다」와 §5 `import_asset`·`remove_asset` 설명의 「캔버스 레이어(마우스 파츠 3종 외 전부)」는 v0.13부터 펜 그림도 제외한 것으로 읽는다(판정 정본 core `is_canvas_layer()` = `!is_mouse_part() && !is_pen_part()`).
- (v0.13) **펜 슬롯 옛 매니페스트 호환(core assets.md §3.8)**: 새 앱 + 옛 manifest(펜 항목 없음) → 그대로 읽힌다. CR-019 이후 옛 앱(관대한 로드) + 새 manifest → `"pen_*"`·`{"kind":"pen_down"}` 항목만 건너뛰고 `canvas`는 같은 값(펜은 캔버스 레이어 아님). 옛 앱이 등록·삭제를 하면 manifest에서 펜 항목이 빠지고 PNG는 남는다 — 새 앱으로 돌아오면 다시 등록한다. CR-019 이전 앱은 manifest 전체 오류(`key_*`와 같은 기존 한계).
- **전환 위험 (v0.13, CR-024) — core(assets·settings)·bridge(Rust·TS)·ui 한 묶음.** ① 새 ui + 옛 Rust: `import_asset`·`remove_asset`에 펜 슬롯을 보내면 명령 인자 역직렬화 실패(Tauri 인자 오류 — `BridgeError` 형태 아님). 옛 ui + 새 Rust는 무해(펜 슬롯을 보내지 않음). ② TS: `AssetSlot`에 객체 변형이 늘어 v0.12 `isKbDownSlot`(객체 여부 판정)이 `pen_down`을 잘못 잡고 `isMousePartSlot`(`!isKbDownSlot(slot) && slot.startsWith`)은 `yarn tsc` 오류가 난다 — 합집합 확장과 위 도우미 수정은 같은 커밋. 옛 `slotKey`가 남으면 `pen_down_N`이 `kb_down_N`으로 겹쳐 overlay의 엔트리 찾기(`src/overlay/components/LayerStack.tsx:16`)·누름 프레임 수(`:20`)가 틀린다. ③ bridge Rust 핸들러 코드 변경 없음(`AssetSlot` 전수 `match` 없음 — core assets.md §9.7-4). `types.rs` 문서주석 표만 갱신. `penPos`의 순서 위험은 §3.3 「전환 위험 (v0.13)」.
- 「필수」 열은 ui(설정 창)가 등록을 안내하는 기준이다. core는 필수 슬롯을 검사하지 않는다(core assets.md §3.4). (v0.14) 판정 정본은 아래 TS 상수 `REQUIRED_SLOTS`다.
- (v0.10) ~~필수 이미지 4장: `kb_up`, `kb_down` index 0 이상, `idle`, `rest`~~ → ~~(v0.14, SV2-08 · 🔒 확정사항 §6 「설정 창 개편」) 필수 이미지 3장: `kb_up`, `kb_down` index 0, `mouse_base`.~~ → **(v0.19, CR-043 · 🔒 사용자 확정, 확정사항 §6 「타자 입력 1 선택 강등」) 필수 이미지 2장: `kb_up`, `mouse_base`.** `{kind:'kb_down', index:0}`은 v0.19부터 선택으로 강등. `idle`·`rest`는 선택(없으면 오버레이는 `kb_up`만 보인다 — 현행 overlay가 이미 그렇게 그린다, 02-design §2.1). 배경·몸통·특수 키·클릭 그림(`mouse_left`·`mouse_right`)·펜 쥔 손 그림도 선택. 필수 슬롯도 비울 수 있다(🔒 D-1 — 캔버스 크기를 바꾸려면 캔버스 그림을 모두 비워야 한다). 「필수 · 미등록」 표시는 ui 몫.

**TS 필수 슬롯 상수 (v0.19, CR-043 — `src/bridge/types.ts`, 계약으로 고정. v0.14~v0.18: 3장 — `kb_down` index 0 포함)**

```ts
/** 필수 이미지 2장. 판정은 ui만 한다 — core는 검사하지 않는다 */
export const REQUIRED_SLOTS: readonly AssetSlot[] = ['kb_up', 'mouse_base']
export const isRequiredSlot = (slot: AssetSlot): boolean =>
  REQUIRED_SLOTS.some((r) => slotKey(r) === slotKey(slot))   // slotKey 비교 — 객체 슬롯도 값으로 비교
```

- 결과(테스트 고정 — bridge-implementer): `'kb_up'`·`'mouse_base'` → true, `'idle'`·`'rest'`·`{kind:'kb_down', index:0}`·`{kind:'kb_down', index:1}`·`{kind:'pen_down', index:0}`·`'pen_up'`·`'mouse_left'`·`'body'` → false.
- Rust 대응 없음(TS 전용). core `assets/mod.rs`·`slot.rs` 문서주석의 「필수 4장」은 core 패킷 §4에서 「필수 3장」으로 고친다(로직 변경 없음).
- **옛 매니페스트 호환 (v0.10, CR-019)**: 옛 `manifest.json`에 `"slot": "slam"` 항목이 있어도 core `assets::load_manifest`는 그 항목만 건너뛰고(경고 로그) 나머지를 정상 반환한다. 건너뛴 항목이 하나라도 있으면 `canvas`를 남은 항목으로 다시 계산한다(`slam`이 유일한 캔버스 레이어였다면 `null`). `assets/slam.png`는 지우지 않으며 매니페스트·`url`에 나타나지 않는다. 다음 `import_asset`·`remove_asset` 저장 때 manifest.json에서 `slam` 항목이 사라진다(core assets.md §3.6·§11 D20~D22). 따라서 `get_asset_manifest`·`import_asset`·`remove_asset`은 옛 사용자 폴더에서도 성공한다. 오류는 최상위 구조 손상일 때만(§6 `IO_ERROR`).

**TS 내장 기본 슬롯 상수 (v0.23, CR-053 · 🔒 사용자 확정 — 배포용 기본 세트 3차. `src/bridge/types.ts`, 계약으로 고정. v0.20~v0.22: 6개 — hair 제외. v0.18~v0.19: 7개 — hair 포함이나 목록이 다름)**

```ts
/** 내장 기본 그림이 있는 슬롯 7개. 원본 = Rust assets::defaults::DEFAULT_ASSETS(순서 동일). TS는 사본 */
export const DEFAULT_ASSET_SLOTS: readonly AssetSlot[] = [
  'kb_up', 'background', 'hair', 'pomo_char',
  'mouse_base', 'pen_up', { kind: 'pen_down', index: 0 },
]
export const hasBuiltinDefault = (slot: AssetSlot): boolean =>
  DEFAULT_ASSET_SLOTS.some((d) => slotKey(d) === slotKey(slot))   // slotKey 비교 — isRequiredSlot과 같은 방식
```

- **목록의 원본은 core `assets::defaults::DEFAULT_ASSETS`**(내장 PNG `include_bytes!`, 순서 = 시딩 순서: 캔버스 레이어(`kb_up` → `background` → `hair` → `pomo_char`) → `mouse_base` → `pen_up` → `pen_down_0`). TS는 사본이며 **불일치(항목·순서)는 bridge 결함**이다. core 완료 보고(2026-09-27, CR-053)의 순서를 그대로 따랐다. 파일 키(`slotKey` = Rust `file_key`) 7개 고정: `kb_up`, `background`, `hair`, `pomo_char`, `mouse_base`, `pen_up`, `pen_down_0`. **`kb_down_0`은 CR-053부터 제외**(v0.18~v0.22에는 있었다). (v0.20~v0.22: 6개 — `hair` 제외, `kb_down_0` 포함. v0.18~v0.19: 7개 — `hair` 포함, `kb_down_0`도 포함. v0.17까지 15개 — `idle`·`rest`·`key_space`·`key_z`·`key_question`·`key_exclamation`·`key_enter`·`key_backspace`·`key_undo` 9개는 v0.18(CR-038)부터 내장 기본이 없다. `hair`는 v0.17(CR-037) 도입 때는 내장 기본이 없었고, v0.18~v0.19에는 있었고, v0.20(CR-044)~v0.22엔 없었으며, v0.23(CR-053)부터 다시 있다. `pomo_char`는 v0.21(CR-045) 도입 때부터 v0.22까지 내장 기본이 없었고, v0.23(CR-053)부터 있다.)
- core 반영 완료(2026-09-27): Rust `assets::defaults::DEFAULT_ASSETS`가 이미 이 7개·순서로 되어 있다(core-implementer 완료, `src-tauri/src/assets/defaults.rs`) — 이번 절은 core를 뒤따라 TS·contract를 맞춘 것이라 core 반영 대기 항목이 없다.
- 내장 기본 없음(v0.23): `body`, `idle`, `rest`, `key_space`·`key_z`·`key_question`·`key_exclamation`·`key_enter`·`key_backspace`·`key_undo`, `pomo_bubble`, `kb_down` index ≥ 0, `mouse_left`, `mouse_right`, `pen_down` index ≥ 1, `pen_key_*` 7개.
- 쓰임(ui 몫, 🔒 U-1 = B): 카드 「기본값」 단추가 `hasBuiltinDefault(slot)`이면 `restore_default_asset`(§5.7), 아니면 기존 `remove_asset`(비우기)을 부른다. ui는 기본 그림이 있는 칸에서 `remove_asset`을 부르지 않는다 — `remove_asset` 의미·에러 불변(계약 변경 없음).
- Rust 대응: `assets::defaults::has_default(&AssetSlot) -> bool`. 핸들러는 부르지 않는다 — `restore_default`가 스스로 `asset.no_default`로 거부한다.
- 테스트(bridge-implementer): 위 7개 → true, `idle`·`rest`·`key_space`·`{kind:'kb_down', index:0}`·`{kind:'kb_down', index:1}`·`{kind:'pen_down', index:1}`·`'mouse_left'`·`'mouse_right'`·`'pen_key_space'`·`'body'`·`'pomo_bubble'` → false. `DEFAULT_ASSET_SLOTS` 길이 7·`slotKey` 중복 없음.
- **첫 실행 시딩 (v0.16, DA-02 — 계약 표면 변경 없음)**: 앱 시작 setup이 §5.2 「앱 시작 순서」 0단계의 매니페스트 로드 **앞**에서 core `assets::defaults::seed_if_empty(assets_dir) -> SeedOutcome`를 부른다. 매니페스트가 없거나 항목이 0개이고 15개 `{file_key}.png`가 하나도 없을 때만 `DEFAULT_ASSETS` 순서로 등록한다(`Err` 없음 — 실패 장은 건너뛰고 로그). 매니페스트 구조 손상·항목 있음·파일 있음이면 건너뛴다. settings.json은 건드리지 않는다. **새 command·event 없음, emit 없음** — setup(메인 스레드) 안에서 끝나므로 동기 command `get_asset_manifest`는 시딩 뒤 값을 받는다(§5.1-7 스레드 전제). 0단계 창 리사이즈·손 기준점 초깃값도 시딩 결과를 쓴다(core 패킷 §2 — 호출 위치는 core `lib.rs` 몫).

### 3.2 `AssetEntry` · `AssetManifest`

```ts
export interface AssetEntry {
  slot: AssetSlot
  fileName: string     // 앱 데이터 폴더 안 저장 파일명
  width: number
  height: number
  bytes: number
  url: string          // asset protocol URL (<img src>에 그대로 사용)
}
export interface AssetManifest {
  canvas: { width: number; height: number } | null   // 첫 캔버스 레이어(배경 포함)가 정한 캔버스. 배경만 있으면 배경 크기. 없으면 null (v0.6). 마우스 파츠는 캔버스에 참여하지 않는다 (v0.8)
  entries: AssetEntry[]
}
```

```rust
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AssetEntry { pub slot: AssetSlot, pub file_name: String, pub width: u32, pub height: u32, pub bytes: u64, pub url: String }

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct AssetManifest { pub canvas: Option<CanvasSize>, pub entries: Vec<AssetEntry> }

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct CanvasSize { pub width: u32, pub height: u32 }   // (v0.16 표기 정정) v0.15까지 `Size`로 적었으나 실물 이름은 crate::assets::CanvasSize(bridge types.rs 재수출, TS도 CanvasSize). JSON {width,height} 동일 — 문서 정정만
```

- (v0.14, SV2-07) **`AssetEntry.url` 버전 규칙**: `url`은 불투명 문자열이다 — ui는 해석·조립·비교하지 않고 그대로 `<img src>`에 넣는다. **같은 슬롯에 다른 파일을 넣으면 `url`이 달라진다**(WebView가 옛 그림을 캐시로 보이지 않게). 현재 방식: 기존 url 끝에 `?v={파일 수정 시각 ms}`(메타데이터를 못 읽으면 쿼리 없이 기존 url) — core `assets`가 만든다(core 패킷 §4). **확인 필요(core 실측 대기)**: Tauri asset 프로토콜이 쿼리 때문에 404를 내면 core가 파일명 리비전 방식(`fileName`도 바뀜)으로 바꾼다 — 그때는 이 「현재 방식」 문장과 `fileName` 주석만 바뀌고 ui 규칙(그대로 넣기)은 같다. 페이로드 모양 불변 — 비파괴.
- (v0.16) `restore_default_asset`(§5.7)으로 기본 그림을 되돌리면 같은 슬롯의 파일이 바뀌므로 위 규칙대로 `url`도 달라진다(`import_asset`과 같은 경로 — core `import_bytes`).

#### 3.2.1 `ExportReport` · `ExportFailure` (v0.16, CR-035 · DA-05)

`export_default_assets`(§5.7)의 반환값이다. 모든 값은 **파일명**(`kb_up.png` 등 — 내장 표의 `file_key + ".png"`)이며 경로를 싣지 않는다.

```ts
export interface ExportFailure {
  fileName: string   // 쓰지 못한 파일명(예: 'kb_up.png'). 경로 아님
  code: string       // '영역.사유' — 현재 'asset.io'뿐
}
export interface ExportReport {
  written: string[]          // 쓴 파일명(DEFAULT_ASSETS 순서)
  conflicts: string[]        // 호출 전에 이미 있던 파일명(폴더 포함). overwrite=false이고 비어 있지 않으면 written = [](아무것도 쓰지 않음). overwrite=true면 덮어쓴 목록(정보용)
  failed: ExportFailure[]    // 파일별 실패. 일부만 실패해도 나머지는 written에 있다
}
```

```rust
// = crate::assets::export::{ExportReport, ExportFailure}(core 정의 그대로 — bridge types.rs는 재수출만, 사본 타입 두지 않음)
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExportFailure { pub file_name: String, pub code: &'static str }
#[derive(Serialize, Debug, Clone, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExportReport { pub written: Vec<String>, pub conflicts: Vec<String>, pub failed: Vec<ExportFailure> }
// 반환 전용이라 Deserialize 없음(core 결정). 세 필드 모두 skip_serializing_if 없음 — 빈 배열도 항상 키가 있다
```

**JSON 직렬화 예시 (고정)**
```json
{ "written": ["kb_up.png", "kb_down_0.png", "…(15개)"], "conflicts": [], "failed": [] }              // 충돌 없음 → 15장 씀
{ "written": [], "conflicts": ["kb_up.png", "idle.png"], "failed": [] }                            // overwrite=false + 충돌 → 아무것도 안 씀
{ "written": ["kb_up.png", "…"], "conflicts": ["kb_up.png"], "failed": [ { "fileName": "idle.png", "code": "asset.io" } ] }   // overwrite=true, 1장 실패
```

- 판정 규칙(ui 몫): `conflicts.length > 0 && written.length === 0 && failed.length === 0` = 「덮어쓸까요?」 확인 대상(🔒 U-5 = A — 확인 뒤 `overwrite: true`로 다시 부름). `failed.length > 0` = 부분 실패 보고.

### 3.3 `Settings`

```ts
export interface Point { x: number; y: number }   // 캔버스 좌표(소수 가능). 창 위치(§3.4 Position, 정수 물리 px)와 모양만 같고 뜻이 다르다

export interface Settings {
  scale: number                       // 0.25 ~ 2, 기본 1 (2 = 900×700 원본 크기)
  idleSeconds: number                 // 기본 300 (5분)
  // (v0.10, CR-019·CR-020) slam 삭제 — 쾅(키연타) 메커니즘 폐기. SlamSettings·DEFAULT_SETTINGS.slam도 삭제
  overlay: { x: number; y: number; visible: boolean }   // x/y = 창 좌상단(가상 화면 물리 px). 드래그 이동이 멎으면 core window가 저장(§4 settings://changed). (v0.5) x/y 쓰기는 core window 저장(드래그·시작 보정)과 set_overlay_position만 — set_settings 입력 x/y는 무시하고 core 현재값 유지(§5.3). visible은 set_settings로 적용된다
  mouse: {
    shoulder: Point                                          // 캔버스 좌표. 손 기준점(§3.6) 재계산의 입력
    area: [Point, Point, Point, Point]                       // (v0.9, CR-017) 캔버스 좌표. 손이 움직이는 자유 사각형 이동 영역 — [왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래]. 기본 [(375,525),(495,525),(495,625),(375,625)]. (v0.9) pad 삭제
    partPos: Point                                           // (v0.8) 캔버스 좌표. 마우스 파츠 그림(3장 공통) 왼쪽 위 모서리를 놓는 자리. 전체 캔버스 그림이면 {0,0}. 기본 {x:389, y:492}. 손 기준점(§3.6) 재계산의 입력
    hand: Point | null                                       // 회전 기준점의 폴백(캔버스 좌표). 자동 기준점(get_hand_anchor)을 못 구할 때만 쓴다. 기본 null
    penPos: Point | null                                     // (v0.13, CR-024 · OV-R-25 · ST-R-18) 캔버스 좌표. 펜 쥔 손 그림(pen_up·pen_down_N·pen_key_* 공통) 왼쪽 위 모서리 — 쉬는 자세(팔 회전 0°·늘어남 없음) 기준. null = 아직 놓지 않음(옛 settings.json 호환 — pen_up 첫 등록 때 ui가 기본 위치를 정해 set_settings로 저장). (v0.16, CR-035 · DA-07) 기본 {x:380, y:496}(v0.15까지 null). 필수 필드(penPos? 아님) — Rust가 항상 키를 보낸다
    penMode: boolean                                         // (v0.15, CR-033) 펜 손 사용 토글. true = 키보드 입력(·CR-027 클릭) 때 펜 손 그림 교체 + 키보드 레이어 kb_up 고정. false = pen_up 그림은 팔 끝에 붙어 따라다니되 바뀌지 않고 키보드 그림은 기존대로. 기본 false. 필수 필드(penMode? 아님) — Rust가 항상 키를 보낸다. 실제 펜 모드 판정(penMode && pen_up 등록)은 ui 몫(「penMode 의미」)
  } | null                                                   // 마우스 파츠 미사용이면 null
  autostart: boolean                  // 기본 false. (v0.14, SV2-05) 쓰기 경로는 set_autostart(§5.5)·앱 시작 조회 보정(§4)뿐 — set_settings 입력값은 무시하고 core 현재값 유지(§5.3 「core 소유 필드」)
  language: Language                  // (v0.14, SV2-02) 설정 창 표시 언어. 기본 'ko'. core는 저장만 한다(번역은 ui 몫)
  positionLock: boolean               // (v0.14, SV2-03) 기본 false. true = 오버레이 창이 마우스 입력을 통과시킨다(클릭 통과 — 끌기·Ctrl+휠이 오버레이에 닿지 않음). core가 적용(§5.3 4단계·앱 시작)
  showInTaskbar: boolean              // (v0.14, SV2-04) 기본 false(= 현행 skipTaskbar 동작). true = 오버레이 창이 작업표시줄에 보인다(대상은 오버레이 창만 — D-9). core가 적용
}

export type Language = 'ko' | 'ja' | 'en'   // (v0.14) 문자열 열거. 알 수 없는 값은 core가 'ko'로 읽는다
```

```rust
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase", default)]   // (v0.14 표기 정정) 실물은 컨테이너 default — 키 없음 = Settings::default() 값
pub struct Settings {
    pub scale: f64,
    pub idle_seconds: u32,
    pub overlay: OverlaySettings,
    pub mouse: Option<MouseSettings>,
    pub autostart: bool,             // (v0.14) set_settings 입력값 무시 — core 소유 필드 병합(§5.3 2·5단계)
    pub language: Language,          // (v0.14) 키 없음 = Ko
    pub position_lock: bool,         // (v0.14) JSON positionLock, 키 없음 = false
    pub show_in_taskbar: bool,       // (v0.14) JSON showInTaskbar, 키 없음 = false
}
// (v0.14) = crate::settings::Settings(core 정의 그대로 — bridge types.rs는 재노출만). 새 필드 3개 모두 skip_serializing_if 없음 — 항상 직렬화
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum Language { #[default] Ko, Ja, En }
// (v0.14) = crate::settings::Language. "ko" | "ja" | "en". 알 수 없는 값·잘못된 형식 → Ko(파일 읽기·set_settings 입력 모두 관용 —
//         설정 파일 전체 기본값 대체·명령 거부 금지. 수단(커스텀 Deserialize 등)은 core 결정, core 패킷 §1). derive 목록은 core 정의를 따른다
// (v0.10, CR-019·CR-020) slam 필드·SlamSettings 삭제. 옛 settings.json·옛 ui 입력의 slam 키는 모르는 키로 무시한다
//        (아래 deny_unknown_fields 금지와 같은 이유, core settings.md §3.3). bridge types.rs의 SlamSettings 재노출도 삭제
#[derive(Serialize, Deserialize, Clone, Debug)] #[serde(rename_all = "camelCase")]
pub struct OverlaySettings { pub x: i32, pub y: i32, pub visible: bool }   // x/y: set_settings 입력값은 무시(core window::keep_overlay_position, §5.3)
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)] #[serde(rename_all = "camelCase")]
pub struct MouseSettings {
    pub shoulder: Point,
    #[serde(default = "default_area")]       // (v0.9, CR-017) 키가 없는 옛 settings.json → 기본 영역. settings::default_area()(비공개)
    pub area: [Point; 4],                    // [왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래]. JSON은 길이 4 배열 — 길이 ≠ 4는 역직렬화(형식) 오류
    #[serde(default = "default_part_pos")]   // (v0.8) 키가 없는 옛 settings.json → (389, 492). settings::default_part_pos()
    pub part_pos: Point,
    #[serde(default)]          // 키가 없는 옛 settings.json → None
    pub hand: Option<Point>,
    #[serde(default)]          // (v0.13, CR-024) 키가 없는 옛 settings.json → None. skip_serializing_if 두지 않는다 — None도 "penPos": null로 항상 직렬화
    pub pen_pos: Option<Point>,   // = crate::settings::MouseSettings.pen_pos(core settings.md §3.1.1). 검증 없음
    #[serde(default)]          // (v0.15, CR-033) 키가 없는 옛 settings.json·옛 ui 입력 → false. skip_serializing_if 두지 않는다 — 항상 "penMode": true|false로 직렬화
    pub pen_mode: bool,        // = crate::settings::MouseSettings.pen_mode(core 변경 요구 — §9 v0.15). 검증 없음. 손 기준점 재계산·창 리사이즈 입력 아님
}
// (v0.8) arm_width·arm_color 삭제. MouseSettings·Settings에 #[serde(deny_unknown_fields)]를 붙이지 않는다 —
//        옛 settings.json에 남은 armWidth·armColor 키를 무시하고 읽기 위해서다(core settings.md)
// (v0.9) pad 삭제 — 옛 settings.json의 pad 키도 같은 이유로 무시한다(area로 변환하지 않음, core settings.md D10)
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)] #[serde(rename_all = "camelCase")]
pub struct Point { pub x: f64, pub y: f64 }   // = crate::settings::Point. PartialEq는 손 기준점 입력(어깨·파츠 위치) 변경 판정(§5.1-2 ④)에 쓴다
// (v0.9, CR-017) Rect 삭제 — 유일한 사용처가 pad였다(core settings.md D12). TS Rect(src/bridge/types.ts)도 함께 삭제한다
```

**`hand` 의미 (CR-007, OV-R-21)**: 마우스 파츠 회전 기준점은 ① `get_hand_anchor`(§3.6, 자동) → ② `mouse.hand` → ③ 이동 영역 중심(v0.9 — `mouse.area` 네 꼭짓점 평균 = 쌍선형 (0.5, 0.5). v0.8까지 패드 중심) 순서로 정한다. 폴백 적용은 ui 몫이다. 기존 settings.json에 저장된 `hand` 값은 마이그레이션하지 않는다(core settings.md D2).

**`partPos` 의미 (v0.8, OV-R-18)**: 종이 인형의 손을 도화지에 꽂는 핀 자리다. 마우스 파츠 그림(`mouse_base`·`mouse_left`·`mouse_right` 공통 — 같은 크기·같은 위치)의 왼쪽 위 모서리를 놓는 **캔버스 좌표**. 설정 창 미리보기에서 손 그림을 끌어다 놓아 정한다(ui 몫). 전체 캔버스 크기 그림은 `{0,0}`이면 이전과 같게 동작한다. 손 기준점(§3.6)은 이 값을 이미 더한 캔버스 좌표로 온다. 검증 없음(범위·캔버스 안 여부 검사 안 함 — core settings.md D5, assets.md D19).

**마우스 기본값** — Rust `settings::default_mouse()`와 TS `DEFAULT_MOUSE_SETTINGS`가 1:1 (ST-R-17 「기본값으로 리셋」의 대상):

| 필드 | 기본값 |
|---|---|
| `shoulder` | **(582, 484)** (v0.20, CR-044 · 🔒 사용자 확정. v0.18~v0.19: (558, 500). v0.9~v0.17: (620, 530)) |
| `area` | **[(375, 525), (495, 525), (495, 625), (375, 625)]** (v0.9 — 예시 그림의 실측 손 기준점 (435, 575) 중심 120×100 직사각형. Rust는 `default_area()` 한 곳에서 serde 기본값과 `default_mouse()`가 함께 쓴다. 근거 core settings.md §11 D8. v0.18·v0.20: 값 불변) |
| `partPos` | **(411, 464)** (v0.20, CR-044 · 🔒 사용자 확정. v0.8~v0.19: (389, 492) — 예시 `mouse_pen_hand.png`(202×154)가 900×700 그림에서 놓여 있던 자리. Rust는 `default_part_pos()` 한 곳에서 serde 기본값과 `default_mouse()`가 함께 쓴다) |
| `hand` | **`null`** (CR-007, 2026-09-23. 이전 기본값 `{x:495, y:570}`은 Rust·TS 양쪽 코드 주석으로만 보존. v0.18·v0.20: 값 불변) |
| `penPos` | **(372, 476)** (v0.20, CR-044 · 🔒 사용자 확정. Rust `default_mouse()`의 `pen_pos` ↔ TS `DEFAULT_MOUSE_SETTINGS.penPos = { x: 372, y: 476 }`. v0.18~v0.19: (356, 504). v0.16~v0.17: (380, 496, CR-035 · DA-07). v0.13~v0.15: `null`) |
| `penMode` | **`true`** (v0.18, CR-038 · 🔒 사용자 확정. v0.20(CR-044)도 그대로 유지 — 변경 대상 아님. v0.15~v0.17: `false`) |

(v0.8) `armWidth` / `armColor`(기본 22 / `"#e53935"`) 행 삭제 — 손바닥 모드·팔 곡선과 함께 폐기(OV-R-18).
(v0.9) `pad`(기본 (250, 560, 160, 90)) 행 삭제 — 이동 영역 `area`로 대체(CR-017).

```json
{ "shoulder": { "x": 582.0, "y": 484.0 },
  "area": [ { "x": 375.0, "y": 525.0 }, { "x": 495.0, "y": 525.0 }, { "x": 495.0, "y": 625.0 }, { "x": 375.0, "y": 625.0 } ],
  "partPos": { "x": 411.0, "y": 464.0 }, "hand": null, "penPos": { "x": 372.0, "y": 476.0 }, "penMode": true }
```
(v0.20) 위 JSON은 CR-044 확정값(TS·contract 기준) — v0.18~v0.19: `shoulder` (558, 500)·`partPos` (389, 492)·`penPos` (356, 504). v0.16~v0.17: `shoulder` (620, 530)·`penPos` (380, 496)·`penMode` false. v0.15까지 `penPos`는 `null`.
**core 반영 대기(v0.20)**: 2026-09-26 확인 시점 Rust `settings::default_mouse()`는 아직 v0.18~v0.19 값(`shoulder` (558, 500)·`partPos` (389, 492)·`penPos` (356, 504))을 반환한다 — core-implementer가 위 JSON에 맞춰 `default_mouse()`(및 관련 단위 테스트)를 갱신해야 셋이 일치한다(§8 셋 대조표 참고).

**`penPos` 의미 (v0.13, CR-024 · OV-R-25 · ST-R-18)**: 장부의 「팔」 칸 아래 새로 만든 「펜 쥔 손 자리」 칸이다 — 처음엔 비어 있고(`null`), 손 그림을 처음 붙일 때 ui가 자리를 적는다. 펜 쥔 손 그림(`pen_up`·`pen_down_N`·`pen_key_*` 공통 — 같은 크기·같은 위치, §3.1)의 왼쪽 위 모서리를 놓는 **캔버스 좌표**이며, 기준은 **쉬는 자세**(팔 회전 0°·늘어남 없음)다. 팔이 회전·늘어날 때 손을 팔 끝에 붙여 옮기고 돌리는 변환은 ui 몫이다(overlay OV-R-25).
- (v0.16, CR-035 · DA-07 · 🔒 U-2 = B) **기본값은 `{x:380, y:496}`**(기본 세트 `pen_up` 자리). 새 설치·`Settings::default()`·마우스 파츠 「기본값으로 리셋」(ST-R-17, TS `DEFAULT_MOUSE_SETTINGS`)이 이 값을 쓴다. 위 비유의 「처음엔 비어 있다」와 아래 `null` 첫 등록 규칙은 이제 **옛 settings.json 호환 경로**에만 해당한다 — 모양(`Point | null`)·필수 여부·검증 불변.
- `null` = 아직 놓지 않음. `pen_up` 첫 등록 때 ui(설정 창, ST-R-18)가 기본 위치를 정해 기존 `set_settings`로 저장하고, 미리보기에서 끌어 조정한다. ~~계약·core에는 기본 좌표가 없다(core settings.md §3.1.1)~~ → (v0.16) 기본 좌표는 `default_mouse()`의 (380, 496). serde 필드 기본값(`#[serde(default)]` = `None`)은 바꾸지 않는다 — `mouse`에 `penPos` 키가 없는 옛 파일은 계속 `null`로 읽는다(아래 표).
- 검증 없음(범위·캔버스 안 여부 검사 안 함 — core settings.md D17). `mouse`가 `null`이면 `penPos`도 없다.
- 손 기준점(§3.6)의 입력이 **아니다** — 재계산 트리거 아님(§5.1-3).
- 직렬화: 값이 있으면 `"penPos": { "x": 410.0, "y": 505.0 }`, 없으면 `"penPos": null` — `get_settings`·`set_settings` 반환·`settings://changed`에 항상 키가 있다. TS는 필수 필드 `penPos: Point | null`(`hand`와 같은 모양).

| 옛/새 조합 (v0.13) | 결과 |
|---|---|
| 옛 settings.json(`mouse`에 `penPos` 없음) → 새 앱 | `penPos` = `null` |
| 새 settings.json → 옛 앱 | 모르는 키로 무시, 다음 저장 때 사라짐(새 앱으로 돌아오면 ui가 기본 위치를 다시 정한다) |

**전환 위험 (v0.13, CR-024) — core·bridge(Rust·TS)·ui 한 묶음(§3.1 「전환 위험 (v0.13)」과 같은 묶음).**
- 옛 ui + 새 Rust: `set_settings` 입력 `mouse`에 `penPos` 키가 없으면 serde 기본값 `None`으로 저장된다 — **저장해 둔 `penPos`가 지워진다**(v0.8 `partPos` 「Rust만 먼저」와 같은 성격, core settings.md §9.4-5).
- 새 ui + 옛 Rust: 모르는 키로 무시(오류 없음), 값은 저장되지 않는다.
- TS 필수 필드라 `MouseSettings` 객체 리터럴(`DEFAULT_MOUSE_SETTINGS`·테스트 픽스처)에 `penPos`가 없으면 `yarn tsc` 오류 — 묶음 범위에 ui 픽스처 포함(§9 v0.13 「파괴 영향」).
- 묶음 범위: core `settings`(`MouseSettings.pen_pos`·`default_mouse`)·`assets`(펜 슬롯·`PenPartMismatch`), bridge TS(`src/bridge/types.ts` `AssetSlot`·슬롯 도우미·`MouseSettings.penPos`·`DEFAULT_MOUSE_SETTINGS.penPos = null`), bridge Rust(`types.rs` 문서주석), ui(설정 창 펜 그림 등록·`penPos` 끌어 놓기 — core assets.md §9.7 UI-M8, overlay 펜 손 표시 — UI-M9).

**`penMode` 의미 (v0.15, CR-033 — 🔒 확정사항 §3 「펜 손 사용 토글」)**: 펜 쥔 손의 「글씨 쓰기」 스위치다. 그림(`pen_up`)이 있어도 스위치가 꺼져 있으면 손은 팔 끝에 붙어 따라다니기만 한다.
- `true` = 펜 손 모드: 키보드 누름(·CR-027 왼·오른 클릭 누름)에 펜 손 그림을 `pen_down_N`·`pen_key_*`로 바꾸고, 키보드 레이어는 `kb_up`에 고정, 클릭 바운스(CR-027) 적용.
- `false` = `pen_up` 그림이 있으면 팔 끝에 붙어 따라다니되 바뀌지 않고, 키보드 입력은 키보드 그림(`kb_down`·특수 키 그림)으로, 클릭 바운스 없음.
- 실제 펜 모드 = `penMode && pen_up 등록`. 이 판단·토글 비활성(`pen_up` 없음)·안내 상자·확인창(켤 때, `pen_up` 첫 등록 때)은 ui 몫이다. core는 저장만 하고 매니페스트와 대조하지 않는다 — **검증 없음**(`SETTINGS_INVALID` 새 규칙 없음). `pen_up` 등록·삭제가 `penMode`를 바꾸지 않는다(assets는 설정을 쓰지 않는다 — 확인창 결과 저장은 ui가 `set_settings`로).
- 저장은 기존 `set_settings`, 다른 창 반영은 기존 `settings://changed`(페이로드 `Settings` 전체라 자기 완결). 새 command·event 없음.
- 손 기준점 재계산·창 리사이즈 대상 아님(§5.1-3, §5.2-3 「배율 외 설정 변경」). `mouse`가 `null`이면 `penMode`도 없다.
- 직렬화: 항상 `"penMode": true` 또는 `"penMode": false` — `get_settings`·`set_settings` 반환·`settings://changed`에 항상 키가 있다.

| 옛/새 조합 (v0.15) | 결과 |
|---|---|
| 옛 settings.json(`mouse`에 `penMode` 없음) → 새 앱 | `penMode` = `false` — `pen_up`을 등록해 둔 상태면 업그레이드 후 펜 모드가 꺼진다(토글로 다시 켬, §9 v0.15 확인 필요) |
| 새 settings.json → 옛 앱 | 모르는 키로 무시, 다음 저장 때 사라짐(옛 앱은 `pen_up` 등록 여부로 판정) |

**전환 위험 (v0.15, CR-033) — core settings·bridge(Rust·TS)·ui 한 묶음.**
- 옛 ui + 새 Rust: `set_settings` 입력 `mouse`에 `penMode` 키가 없으면 serde 기본값 `false`로 저장된다 — **켜 둔 펜 모드가 꺼진다**(v0.13 `penPos`와 같은 성격).
- 새 ui + 옛 Rust: 모르는 키로 무시, 저장되지 않는다. 돌아오는 `Settings`에 키가 없어 TS 런타임 값은 `undefined`(꺼짐으로 동작).
- TS 필수 필드라 `MouseSettings` **전체 객체 리터럴**(`DEFAULT_MOUSE_SETTINGS`·테스트 픽스처)에 `penMode`가 없으면 `yarn tsc` 오류. 스프레드(`{ ...MOUSE, penPos }`)는 물려받고, `as MouseSettings` 캐스팅은 통과한다 — 영향 지점 §9 v0.15.
- 묶음 범위: core `settings`(`MouseSettings.pen_mode`·`default_mouse`·구조체 리터럴), bridge TS(`src/bridge/types.ts` `MouseSettings.penMode`·`DEFAULT_MOUSE_SETTINGS.penMode = false`), bridge Rust(`types.rs` 문서주석 — 핸들러 코드 불변), ui(설정 창 토글·안내·확인창, overlay 펜 모드 판정 교체).

**`area` 의미 (v0.9, CR-017 · CR-018)**: 손이 움직이는 **자유 사각형 이동 영역**. 꼭짓점 네 개의 **캔버스 좌표**이며 인덱스 의미가 고정이다(🔒 확정사항 §3) — `area[0]` 왼쪽 위, `area[1]` 오른쪽 위, `area[2]` 오른쪽 아래, `area[3]` 왼쪽 아래. ui는 커서가 든 모니터 m(`get_monitors`, §5)에서 `u = (cx − m.x) / m.width`, `v = (cy − m.y) / m.height`(0~1 고정)를 구해 `(1−u)(1−v)·P0 + u(1−v)·P1 + u·v·P2 + (1−u)·v·P3`를 손 목표점으로 쓴다(계산은 ui 몫 — 인덱스 의미를 고정하려고 적는다). 설정 창에서 네 점을 차례로 찍어 정하고 저장은 기존 `set_settings`(ui 몫). 모양(볼록·순서·자기 교차)·캔버스 안 여부는 검사하지 않는다 — 쌍선형 정방향 계산이라 어떤 모양이든 결과가 유한하다(core settings.md D9). 손 기준점(§3.6)의 입력이 **아니다**(§5.1-3).

검증 규칙(`set_settings`에서 적용, 위반 시 `SETTINGS_INVALID`): `0.25 ≤ scale ≤ 2`(2 = 900×700 원본 크기; 기본 표시 450×350; 2026-09-23 확정), `60 ≤ idleSeconds ≤ 3600`(v0.14 정정 — 실물 `settings::IDLE_SECONDS_MIN`·`IDLE_SECONDS_MAX`. 옛 문구 `idleSeconds ≥ 10`은 실물과 달랐다, §3.3 하단 「현황 메모」 해소), (v0.9) `mouse`가 있으면 `area` 네 점의 x·y가 모두 유한수. (v0.9) `pad.width/height > 0` 삭제 — `area`의 볼록성·순서·캔버스 안 여부는 검사 없음. JSON은 NaN·무한대를 싣지 못해 ui 입력으로는 새 규칙이 걸리지 않는다(사실상 완화). (v0.8) `armWidth > 0` 삭제(검증 완화). `partPos` 검증 없음. (v0.10, CR-019·CR-020) `slam.keys ≥ 2`·`slam.durationMs ≥ 50` 삭제(필드 삭제에 따른 검증 완화).

**옛 settings.json 호환 (v0.8 · v0.9 · v0.10)** — 마이그레이션 코드 없음. 정본 core settings.md §3.3 호환 표.

| 옛 파일 상태 | 읽기 결과 |
|---|---|
| `mouse`에 `armWidth`·`armColor`가 남아 있음 | 무시하고 읽는다(`deny_unknown_fields` 없음) |
| (v0.9) `mouse`에 `pad`가 있음(CR-017 이전 파일 전부) | 무시하고 읽는다. **`area`로 변환하지 않는다**(🔒 사용자 결정, core settings.md D10) |
| (v0.9) `mouse`에 `area`가 없음 | `area` = 기본 영역(위 표) |
| (v0.9) `area`가 배열이 아니거나 길이 ≠ 4, 원소에 `x`/`y` 누락 | 형식 오류 → 파일 전체를 기본값으로 대체(경고 로그. 다른 필드 형식 오류와 같은 기존 동작, 손으로 고친 파일에서만 생긴다) |
| `mouse`에 `partPos`가 없음 | `partPos` = (389, 492) |
| `mouse`에 `hand`가 없음 | `hand` = `null`(기존) |
| (v0.10) 최상위에 `slam`이 있음(CR-019 이전 파일 전부) — 값이 정상이든, 옛 규칙 위반(`keys: 1` 등)이든, 형식이 다르든 | 무시하고 읽는다(`deny_unknown_fields` 없음). 이전엔 쾅 규칙 위반 파일이 검증 실패 → 파일 전체 기본값이었지만 이제 나머지 값을 그대로 읽는다(core settings.md §3.3) |
| 다음 저장 | 파일에서 `armWidth`·`armColor`·`pad`·(v0.10) `slam`이 사라지고 `partPos`·`area`가 생긴다 |

**전환 위험 (v0.8) — core·bridge(Rust·TS)·ui를 한 묶음으로 반영한다.** 반쪽만 바뀐 빌드는 두 방향 모두 깨진다.
- Rust만 먼저: ui가 아직 `partPos`를 보내지 않으므로 `set_settings` 입력 `mouse`가 serde 기본값 (389, 492)으로 채워져 저장된다 — 사용자가 정한 위치를 덮어쓴다.
- TS만 먼저: 옛 Rust `MouseSettings`는 `armWidth`·`armColor`가 필수라 이 키가 없는 `mouse`를 역직렬화하지 못해 `set_settings`가 인자 오류로 실패하고, `partPos`는 무시된다.
- 묶음 범위: core `settings`(`MouseSettings`·`default_mouse`·`validate`)·`assets`(`compute_hand_anchor` 인자·마우스 파츠 검증), bridge Rust(`refresh_hand_anchor`·`set_settings` 재계산 조건·setup 초기 계산), bridge TS(`src/bridge/types.ts` `Settings.mouse`·`DEFAULT_MOUSE_SETTINGS`), ui(팔 곡선 제거·`partPos` 배치·설정 화면 끌어 놓기 — core assets.md §9.4 UI-M1~M3).

**전환 위험 (v0.9, CR-017) — 같은 이유로 한 묶음 반영한다.**
- Rust만 먼저: 옛 ui가 보낸 `pad`는 무시되고 `area`는 기본 영역으로 저장된다(사용자가 정한 `area`가 아직 없어 데이터 손실은 없음). 그러나 `get_settings`·`settings://changed`로 받은 `mouse`에 `pad`가 없어 옛 ui 매핑(`mouse.pad.width` 등)이 깨진다.
- TS만 먼저: 옛 Rust `MouseSettings.pad`는 serde 기본값이 없는 필수 필드라 `pad` 없는 `mouse`를 역직렬화하지 못해 `set_settings`가 인자 오류로 실패한다.
- 묶음 범위: core `settings`(`MouseSettings`·`default_area`·`default_mouse`·`validate`·`Rect` 삭제)·`window`(`monitor_rects` → 공개 `list_monitors`)·예제 `src-tauri/examples/import_sample.rs`, bridge Rust(`get_monitors` 핸들러·`invoke_handler` 등록·`types.rs` 문서주석의 `Rect` 삭제), bridge TS(`src/bridge/types.ts` `Settings.mouse.area`·`Rect` 삭제·`DEFAULT_MOUSE_SETTINGS.area`, `src/bridge/commands.ts` `getMonitors`), ui(모니터별 쌍선형 매핑·팔 늘어나기·설정 화면 네 점 지정 — §9 v0.9 「파괴 영향」). `get_monitors`는 추가라 이것만 먼저 넣어도 안전하다.

**전환 위험 (v0.10, CR-019·CR-020) — core·bridge(Rust·TS)·ui를 한 묶음으로 반영한다.**
- `Settings.slam` 쪽은 런타임 순서와 무관하게 안전하다: 새 Rust는 옛 ui가 보낸 `slam`을 모르는 키로 무시하고, 옛 Rust는 `slam` 없는 입력을 `Settings` 기본값으로 채운다. 옛 settings.json의 `slam`도 무시한다(데이터 손실 없음, core settings.md §9.0-5). 단 TS 타입 삭제는 ui 코드(`settings.slam` 사용처)와 같은 묶음이어야 `yarn tsc`가 통과한다.
- `AssetSlot` `'slam'` 쪽은 **IPC 파괴**다: Rust만 먼저 바뀌면 옛 ui가 `import_asset`·`remove_asset`에 `'slam'`을 보낼 때 명령 인자 역직렬화가 실패한다(Tauri 인자 오류 — `BridgeError { code, message }` 형태가 아니다). 저장 데이터는 어느 순서든 안전하다(§3.1 「옛 매니페스트 호환」).
- 묶음 범위: core `settings`(`Settings`·`SlamSettings`·`validate`)·`assets`(`SimpleSlot::Slam`·관대한 `load_manifest` — core assets.md §3.6), bridge Rust(`types.rs` `SlamSettings` 재노출·문서주석, `events.rs` `heldCount` 문서주석), bridge TS(`src/bridge/types.ts` `AssetSlot`·`SlamSettings`·`Settings.slam`·`DEFAULT_SETTINGS.slam`), ui(쾅 상태·바운스 제거, 설정 픽스처 — §9 v0.10 「파괴 영향」).

**v0.14 필드 3개 (SV2-02 · SV2-03 · SV2-04) — 기본값·검증·적용·호환**

설정 장부에 칸 세 개(언어·잠금·작업표시줄)를 새로 긋는다. 옛 장부에는 칸이 없으니 빈칸은 기본값으로 읽는다. 그리고 「자동 실행」 칸은 이제 장부 주인(core)만 고쳐 쓴다 — ui가 사본을 돌려줘도 그 칸은 보지 않는다.

| 필드 | TS | Rust | 기본값 | 검증 | 적용 주체 |
|---|---|---|---|---|---|
| `language` | `Language` = `'ko' \| 'ja' \| 'en'` | `Language` enum, `lowercase` | `'ko'` | 없음 — 알 수 없는 값·키 없음은 `'ko'`로 읽는다(파일·`set_settings` 입력 모두, 거부하지 않음) | ui(문구 사전 선택). core는 저장만 |
| `positionLock` | `boolean` | `bool` | `false` | 없음 | core `window` — 오버레이 창 `set_ignore_cursor_events(positionLock)` |
| `showInTaskbar` | `boolean` | `bool` | `false` | 없음 | core `window` — 오버레이 창 `set_skip_taskbar(!showInTaskbar)` |
| `autostart`(기존) | `boolean` | `bool` | `false` | 없음 | core `tray::autostart` — **`set_settings`로는 바뀌지 않는다**(§5.3). `set_autostart`(§5.5)·앱 시작 조회 보정(§4)만 |

```json
{ "scale": 1.0, "idleSeconds": 300, "overlay": { "x": 100, "y": 100, "visible": true }, "mouse": { … }, "autostart": false,
  "language": "ko", "positionLock": false, "showInTaskbar": false }
```

- TS **필수** 필드(`language?` 아님) — Rust가 항상 세 키를 보낸다. 선택 필드면 리터럴·픽스처의 누락이 `undefined`로 새어 `set_settings` 입력에서 빠지고, 새 Rust가 기본값으로 채워 저장된 값을 덮는다(v0.13 `penPos`와 같은 판단). TS `DEFAULT_SETTINGS`에 `language: 'ko'`, `positionLock: false`, `showInTaskbar: false`.
- 위치 잠금 중에도 `set_settings`(설정 창 배율 슬라이더 — SV2-11)·`set_overlay_position`·`reset_overlay_position`(프로그램 이동)은 동작한다. 잠금이 막는 것은 오버레이 창에 닿는 마우스 입력(끌기·Ctrl+휠)뿐이다. 잠금을 푸는 경로는 설정 창뿐이다(02-design §5.1 R-4).
- 다시 보이게 하는 모든 경로(`set_settings` `visible: true`·`set_overlay_visible(true)`·트레이 표시)와 앱 시작에서 잠금·작업표시줄 상태를 (다시) 적용하는 것은 core `window`·`lib.rs` 몫이다(core 패킷 §2·§3.3 — 숨김→표시 후 초기화 여부 실측). bridge 핸들러 시그니처 불변.
- 새 필드는 손 기준점 재계산·창 리사이즈 트리거가 아니다(§5.1-3).

| 옛/새 조합 (v0.14) | 결과 |
|---|---|
| 옛 settings.json(세 키 없음) → 새 앱 | 기본값(`'ko'`·`false`·`false`). 다른 값 보존 |
| settings.json에 `"language": "fr"` 등 알 수 없는 값 | `'ko'`로 읽는다(파일 전체 기본값 대체 없음) |
| 새 settings.json → 옛 앱 | 모르는 키로 무시(`deny_unknown_fields` 없음), 다음 저장 때 사라짐 |

**전환 위험 (v0.14) — core `settings`·`window`·`tray`, bridge(Rust·TS), ui 설정 창 한 묶음.**
- 옛 ui + 새 Rust: 현행 `set_settings` 호출자 두 곳(`src/overlay/index.tsx` Ctrl+휠, `src/settings/components/MousePartsTab.tsx`)은 받은 설정 사본을 펼쳐 보내므로(v0.5 조사) 런타임 객체에 새 키가 실려 값이 보존된다. 자동 실행 반영이 `set_settings`에서 빠지지만 옛 ui는 `autostart`를 바꾼 적이 없다(설정 창 R-06 보류) — 동작 차이 없음.
- 새 ui + 옛 Rust: 새 키는 모르는 키로 무시(저장 안 됨, 잠금·작업표시줄 미적용), `reset_overlay_position`은 command 없음(Tauri 오류 → TS `unknown`).
- TS 필수 필드 3개라 `Settings` 리터럴 픽스처는 `yarn tsc` 오류 — §9 v0.14 「파괴 영향」.

**v0.21 `timer` 필드 (CR-045 · PT-04 · PT-07 · PT-08 · PT-09) — 뽀모도 타이머 표시 설정(영속)**

위 TS `Settings`·Rust `Settings` 블록에 필드 `timer` 하나를 더한 것이 정본이다. 경과·실행 상태는 여기 없다(§3.9 `TimerSnapshot` — 휘발, 저장 안 함).

```ts
export interface Settings {
  // … 위 필드 그대로
  timer: TimerSettings                // (v0.21, CR-045) 필수 필드(timer? 아님) — Rust가 항상 키를 보낸다
}
/** (v0.21, CR-045) 뽀모도 타이머 표시 설정 — 영속 */
export interface TimerSettings {
  enabled: boolean     // 타이머 사용(on/off). 꺼도 글자 표시 여부는 ui 규칙(U-1 = B), 시간만 멈춘다
  textPos: Point       // 시간 글자 상자 **중심**, 캔버스 좌표(위 Point — 소수 가능). 0 ≤ x ≤ 900, 0 ≤ y ≤ 700
  rotation: number     // 회전(도, 시계 방향 +). −180 ~ 180
  fontSize: number     // 글자 크기(캔버스 px). 12 ~ 200
  color: string        // 글자 색 '#rrggbb'
}
export const TIMER_ROTATION_MIN = -180
export const TIMER_ROTATION_MAX = 180
export const TIMER_FONT_SIZE_MIN = 12
export const TIMER_FONT_SIZE_MAX = 200
/** Rust settings::timer::TimerSettings::default()와 1:1 (U-6 권고값. CR-053: textPos (142, 458)·rotation 9 → v0.27 CR-058/059(0.4.0): (268, 402)·7) */
export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  enabled: false, textPos: { x: 268, y: 402 }, rotation: 7, fontSize: 36, color: '#333333',
}   // v0.23 필드(mode·countdownSecs·alarmVolume)를 더한 전체 값은 아래 v0.23 블록
// DEFAULT_SETTINGS에 timer: DEFAULT_TIMER_SETTINGS
```

```rust
// crate::settings::Settings에 추가 (bridge types.rs는 재노출만)
pub timer: TimerSettings,       // (v0.21) JSON "timer". 키 없음 = TimerSettings::default() (컨테이너 default). skip_serializing_if 없음 — 항상 직렬화

// = crate::settings::timer::TimerSettings
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]   // 일부 필드만 있는 옛 파일도 형식 오류가 되지 않게
pub struct TimerSettings {
    pub enabled: bool,      // 기본 false
    pub text_pos: Point,    // crate::settings::Point {f64} — 캔버스 좌표(창 위치 Position 아님). 기본 (268, 402)(v0.27 CR-058/059, 0.4.0. CR-053: (142, 458). v0.21~v0.22: (268, 403))
    pub rotation: f64,      // 기본 7(v0.27 CR-058/059, 0.4.0. CR-053: 9. v0.21~v0.22: 5)
    pub font_size: f64,     // 기본 36
    pub color: String,      // 기본 "#333333"
}
```

```json
"timer": { "enabled": false, "textPos": { "x": 268, "y": 402 }, "rotation": 7, "fontSize": 36, "color": "#333333" }
```

| 필드 | 기본값 | `set_settings` 검증(밖이면 `settings.invalid`, 값을 고치지 않음) | 읽을 때 보정(core `load`) |
|---|---|---|---|
| `enabled` | `false` | — | — |
| `textPos` | `{x: 268, y: 402}` (v0.27, CR-058/059 · 🔒 사용자 지정 2026-09-28, 0.4.0. CR-053: `{x: 142, y: 458}`. v0.21~v0.22: `{x: 268, y: 403}`) | 유한수, `0 ≤ x ≤ 900`, `0 ≤ y ≤ 700` | 범위로 자르기, 비유한수 → 기본값 |
| `rotation` | `7` (v0.27, CR-058/059 · 🔒 사용자 지정 2026-09-28, 0.4.0. CR-053: `9`. v0.21~v0.22: `5`) | 유한수, `−180 ≤ r ≤ 180` | 자르기 |
| `fontSize` | `36` | 유한수, `12 ≤ s ≤ 200` | 자르기 |
| `color` | `"#333333"` | `#` + 16진 6자리(대소문자 허용) | 형식 오류 → 기본값, 소문자로 |

- core 의존: `settings::timer::validate(&TimerSettings) -> Result<(), SettingsError>`(`Settings::validate()` 끝에서 호출 — §5.3 1단계에 포함), `settings::timer::normalize(TimerSettings) -> TimerSettings`(`load`). **새 에러 code 없음** — 기존 `settings.invalid`.
- **ui 소유 필드**: core 소유 필드 병합(`keep_core_owned`, §5.3)의 보호 대상이 아니다. ui는 늘 `{...settings, timer: {...settings.timer, …}}`로 보낸다.
- `enabled` true→false는 타이머 일시정지 부수 효과(§5.3 7단계·§5.8). false→true는 타이머 상태를 바꾸지 않는다(U-2).
- 손 기준점 재계산·창 리사이즈 트리거가 아니다(§5.1-3·§5.2-3 비교 조건 코드 불변).
- 캔버스가 900×700보다 작으면 범위 안이어도 글자가 캔버스 밖일 수 있다 — 오버레이는 그대로 그린다(ui 몫, 02-design §5).
- 호환: 옛 settings.json(`timer` 없음·일부만) → 새 앱은 빠진 값만 기본값, 다른 설정 보존(마이그레이션·버전 필드 없음). 새 settings.json → 옛 앱은 모르는 키로 무시, 다음 저장 때 사라짐.
- **전환 위험 (v0.21)**: 새 ui + 옛 Rust — `timer` 키 무시(저장 안 됨), 새 command 없음 → TS `unknown`. 옛 ui + 새 Rust — 받은 설정 사본을 펼쳐 보내므로 `timer` 보존(v0.14와 같은 근거). TS 필수 필드라 `Settings` 리터럴 픽스처는 `yarn tsc` 오류 — §9 v0.21 「파괴 영향」.

**v0.23 `timer` 새 필드 (CR-048 · TM-01 · TM-04 · TM-10) — 모드·시작 시간·알림음 음량(영속)**

부엌 타이머 설정 카드에 칸 세 개(「어느 쪽 — 스톱워치/거꾸로 세기」·「돌려 둘 시간」·「벨 소리 크기」)를 더 긋는다. 옛 카드에는 칸이 없으니 빈칸은 기본값으로 읽는다.

위 v0.21 `TimerSettings`(TS·Rust)에 필드 세 개를 더한 것이 정본이다. `enabled`는 이름·값 불변, **뜻만** 「스톱워치 **또는** 타이머 켜짐」으로 넓어진다(🔒 D-1 A — 어느 쪽이 켜졌는지는 `mode`. 둘 다 켜진 상태는 표현할 수 없다).

```ts
// TimerMode = 'stopwatch' | 'countdown' — 정의는 §3.9
export interface TimerSettings {
  /** 스톱워치 또는 타이머 켜짐(v0.23 의미 확장, 값 불변) */
  enabled: boolean
  /** (v0.23) Rust는 항상 보낸다. 없으면 'stopwatch' */
  mode?: TimerMode
  /** (v0.23) 카운트다운 시작 시간(초) 1 ~ 359999(99:59:59). Rust는 항상 보낸다. 없으면 1500 */
  countdownSecs?: number
  /** (v0.23) 알림음 음량 % 0 ~ 100 정수. Rust는 항상 보낸다. 없으면 44(v0.27 CR-058/059 — 이전 80) */
  alarmVolume?: number
  textPos: Point; rotation: number; fontSize: number; color: string   // v0.21 그대로
}
export const TIMER_COUNTDOWN_SECS_MIN = 1
export const TIMER_COUNTDOWN_SECS_MAX = 359_999
export const TIMER_ALARM_VOLUME_MAX = 100
// DEFAULT_TIMER_SETTINGS = { enabled: false, mode: 'stopwatch', countdownSecs: 1500, alarmVolume: 44,
//                            textPos: { x: 268, y: 402 }, rotation: 7, fontSize: 36, color: '#333333' }   // v0.27 CR-058/059(0.4.0). CR-053: 80·(142, 458)·9
```

```rust
// = crate::settings::timer::TimerSettings (bridge types.rs는 재노출만) — v0.21 필드에 추가(선언 순서 = 직렬화 순서: enabled, mode, countdownSecs, alarmVolume, textPos, …)
#[serde(deserialize_with = "deserialize_mode")]           pub mode: TimerMode,       // 기본 Stopwatch
#[serde(deserialize_with = "deserialize_countdown_secs")] pub countdown_secs: u32,   // 기본 1500 (DEFAULT_COUNTDOWN_SECS)
#[serde(deserialize_with = "deserialize_alarm_volume")]   pub alarm_volume: u32,     // 기본 44 (DEFAULT_ALARM_VOLUME — v0.27 CR-058/059, 0.4.0. 이전 80)
// = crate::settings::timer::TimerMode (§3.9 스냅숏도 같은 타입을 쓴다)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimerMode { #[default] Stopwatch, Countdown }
// 상수(settings::timer): COUNTDOWN_SECS_MIN = 1, COUNTDOWN_SECS_MAX = 359_999, ALARM_VOLUME_MAX = 100
```

```json
"timer": { "enabled": true, "mode": "countdown", "countdownSecs": 1500, "alarmVolume": 44, "textPos": { "x": 268, "y": 402 }, "rotation": 7, "fontSize": 36, "color": "#333333" }
```

| 필드 | TS | Rust | 기본값 | `set_settings` 검증(밖이면 `settings.invalid`, 값을 고치지 않음) | 역직렬화(파일·`set_settings` 입력 공통) · 읽을 때 보정(core `load`) |
|---|---|---|---|---|---|
| `mode` | `TimerMode?` | `TimerMode` | `'stopwatch'` | — | 문자열 `"countdown"`만 `Countdown`, 그 밖 문자열·다른 타입·키 없음 → `Stopwatch`(형식 오류 없음 — 설정 전체가 무너지지 않는다) |
| `countdownSecs` | `number?` | `u32` | `1500`(00:25:00, D-2) | `1 ≤ s ≤ 359999`(D-3 — 0 금지). message "타이머 시작 시간은 00:00:01 ~ 99:59:59 사이여야 합니다." | 0 이상 정수·소수(**내림**)만 값, 음수·문자열·`null`·bool → 1500. `load` 보정: 0 → 1500, 상한 초과 → 359999 |
| `alarmVolume` | `number?` | `u32` | `44`(v0.27, CR-058/059 · 🔒 사용자 지정 2026-09-28, 0.4.0. v0.23~v0.26: `80`, D-10) | `≤ 100`. message "알림음 음량은 0 ~ 100 사이여야 합니다." | 같은 관대한 규칙 → 44. `load` 보정: 100 초과 → 100 |

- **Rust는 항상 보낸다. 선택 표기(`?`)는 TS 호환용이다** — `get_settings`·`set_settings` 반환·`settings://changed`에 세 키가 늘 있다. 선택으로 둔 이유: ui 테스트 25개 이상 파일이 `TimerSettings` 리터럴을 직접 만든다(필수면 `yarn tsc --noEmit` 파괴 — 패킷 §2, `Settings.timer?` 선례). ui는 값이 없으면 `DEFAULT_TIMER_SETTINGS` 값으로 읽는다.
- **선택 표기의 대가**: ui가 `timer` 객체를 스프레드 없이 새로 만들어 보내면 빠진 키를 Rust가 기본값으로 채워 **저장된 모드·시작 시간·음량을 덮는다**(v0.13 `penPos` 판단과 같은 위험). 위 v0.21 규칙 「ui는 늘 `{...settings, timer: {...settings.timer, …}}`로 보낸다」를 그대로 지킨다.
- 소수 입력(예: `countdownSecs: 90.7`)은 역직렬화에서 내림(90)되어 검증을 통과한다 — ui는 정수만 보낸다(TS `number`는 정수 여부를 막지 못한다).
- `mode`·`countdownSecs` 변경은 `set_settings` 타이머 부수 효과(§5.3 6단계 — core `Timer::configure`)로 타이머에 반영된다. `alarmVolume`은 저장만 한다(재생 음량 `volume = alarmVolume / 100`은 ui — 02-design §6.4).
- core 소유 필드가 아니다(`keep_core_owned` 보호 대상 아님). 손 기준점 재계산·창 리사이즈 트리거 아님.
- 호환(🔒 TM-02, D-1 A): 옛 settings.json(`timer` 없음·`{"enabled":true}`만) → `mode: 'stopwatch'`·1500·44(v0.27 — 이전 80), 즉 `enabled: true`는 「스톱워치 켜짐」. 이행 코드·버전 필드 없음. 새 settings.json → 옛 앱은 모르는 키로 무시, 다음 저장 때 사라짐.
- **전환 위험 (v0.23)**: 옛 ui + 새 Rust — 받은 설정 사본을 펼쳐 보내므로 세 키 보존. 새 ui + 옛 Rust — 세 키 무시(저장 안 됨), 새 command 없음 → TS `unknown`. TS 선택 필드라 tsc 파괴 없음.

### 3.4 `ScreenBounds` · `Position`

```ts
export interface ScreenBounds { x: number; y: number; width: number; height: number }  // 사각형(물리 px, 가상 화면 좌표 — input://mouse-move 커서 좌표와 같은 좌표계). get_screen_bounds = 모든 모니터 합집합 1개, get_monitors = 모니터 하나당 1개(v0.9)
export interface Position { x: number; y: number }   // 창 좌상단(가상 화면 물리 px, 정수). (v0.14, BRG-012) src/bridge/types.ts에 실제로 둔다 — get_overlay_position·reset_overlay_position 반환. 캔버스 좌표 Point(§3.3)와 모양만 같다
```

```rust
// src-tauri/src/bridge/types.rs 는 재수출만: pub use crate::window::{Point as WindowPoint, ScreenBounds}
pub struct ScreenBounds { pub x: i32, pub y: i32, pub width: u32, pub height: u32 }   // = crate::window::ScreenBounds, camelCase
pub struct Point { pub x: i32, pub y: i32 }   // = crate::window::Point = 계약 Position(물리 px, 정수). (v0.14) core가 Position 이름을 두면 그 이름(core 패킷 §2 default_overlay_position() -> Position) — 직렬화 {"x","y"} 동일
```

- (v0.14) TS `getOverlayPosition` 반환 표기 `Point` → `Position`(모양 동일 — 비파괴, BRG-012). `Position` JSON: `{ "x": 100, "y": 100 }`.

**JSON 직렬화 예시**
```json
{ "x": 0, "y": 0, "width": 2560, "height": 1440 }            // get_screen_bounds — 합집합 1개
[ { "x": 0, "y": 0, "width": 2560, "height": 1440 },
  { "x": 320, "y": 1440, "width": 1920, "height": 1080 } ]   // get_monitors (v0.9) — WQHD + 아래 1080p, OS 열거 순서
```

- (v0.9) `get_monitors` 원소는 **모니터 전체** 사각형이다(작업 영역·작업 표시줄 제외 영역이 아님 — 커서는 작업 표시줄 위에도 간다). 주 모니터 좌상단이 (0, 0), 왼쪽·위쪽 보조 모니터는 x/y가 음수. 혼합 DPI에서도 커서 좌표와 단위가 같다(core window.md §2.3). 순서는 OS 열거 순서(정렬·중복 제거 없음), 주 모니터 표시 필드 없음(요구 없음). 모니터 경계 판정은 반열린 구간 `[x, x+width)`·`[y, y+height)`(ui 몫).

### 3.5 `BridgeError`

```ts
export interface BridgeError { code: string; message: string }   // message는 한국어, 사용자에게 그대로 표시 가능
```
```rust
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BridgeError { pub code: String, pub message: String }
```
모든 command의 반환 타입은 Rust에서 `Result<T, BridgeError>`이며, UI에서는 `Promise<T>`가 `BridgeError`로 reject된다.

### 3.6 손 기준점 — `Point | null` · `HandAnchorEvent` (v0.3, OV-R-21 / CR-007 · v0.8, OV-R-18)

`mouse_base` 그림을 `mouse.partPos`에 놓았을 때(v0.8) 어깨(`mouse.shoulder`)와 먼 상위 25% 픽셀의 알파 가중 무게중심. 거리·무게중심 모두 캔버스 좌표로 잰다. 비유하면 어깨에 줄자를 대고 가장 멀리 닿는 부분만 모아 찍은 점이다. 계산은 core `assets::compute_hand_anchor`가 하고, bridge는 결과를 **캐시해 두었다가** 돌려주기만 한다.

- 값: `Point`(§3.3, **캔버스 좌표** = 그림 좌표 + `mouse.partPos`, 소수 2자리) 또는 `null`. (v0.8) 값은 이미 캔버스 좌표다 — ui는 `partPos`를 다시 더하지 않는다. 전체 캔버스 그림 + `partPos` `{0,0}`이면 v0.7과 같은 값이다.
- `null`인 경우(오류 아님, ui가 폴백 `mouse.hand` → 이동 영역 중심(v0.9, §3.3. v0.8까지 패드 중심)을 쓴다): `mouse_base` 없음 · 전부 투명 · `settings.mouse`가 `null` · 계산 실패(해독·파일 오류 — 경고 로그만 남김). (v0.8: 「`mouse_base`가 손바닥 모드(≤256×256)」 조건 삭제 — 작은 그림도 계산한다)
- `mouse_left`/`mouse_right`는 따로 계산하지 않는다. 클릭 이미지도 이 값을 공유한다.

**TS** (`src/bridge/types.ts`)
```ts
// get_hand_anchor 반환: Point | null  (Point는 §3.3)
export interface HandAnchorEvent { anchor: Point | null }   // assets://hand-anchor-changed 페이로드
```

**Rust** (`src-tauri/src/bridge/events.rs`)
```rust
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HandAnchorPayload { pub anchor: Option<crate::settings::Point> }
// get_hand_anchor 반환: Result<Option<crate::settings::Point>, BridgeError>
```

**JSON 직렬화 예시 (고정)**
```json
{ "x": 262.5, "y": 1.5 }                    // get_hand_anchor 반환 — 값 있음
null                                        // get_hand_anchor 반환 — 없음
{ "anchor": { "x": 262.5, "y": 1.5 } }      // assets://hand-anchor-changed
{ "anchor": null }                          // assets://hand-anchor-changed — 기준점이 사라짐
```

- 래퍼(`src/bridge/`): `getHandAnchor(): Promise<Point | null>`, `onHandAnchorChanged(cb: (e: HandAnchorEvent) => void)`. 이벤트 이름 상수는 TS `EVENTS.handAnchorChanged` · Rust `EVENT_HAND_ANCHOR_CHANGED`.
- ui 사용 순서: **구독 먼저 → `getHandAnchor()`**. 구독 전에 바뀐 값을 놓치지 않기 위해서다.

### 3.7 특수 키 분류 — `SpecialKey` · `KeyboardInputEvent` (v0.11, OV-R-22 / CR-021)

키보드 이벤트는 편지를 열지 않고 겉봉에 붙은 색 스티커만 알려 주는 우편 알림이다. 스티커는 7가지뿐이고, 나머지 편지는 스티커 없음(`null`)으로 온다. 분류는 core `hook`만 하고(판정 규칙 정본 core hook.md §3.1 J1~J9 — 단 `undo`·Ctrl 규칙은 core 미반영, 아래 「core 선행 필요」), bridge는 core가 준 값을 그대로 싣는다.

**TS** (`src/bridge/types.ts`)
```ts
export type SpecialKey = 'space' | 'z' | 'question' | 'exclamation' | 'enter' | 'backspace' | 'undo'   // (v0.11) 🔒 이름. 'undo' = Ctrl+Z

export interface KeyboardInputEvent {   // input://keyboard 페이로드
  pressed: boolean              // true 누름 / false 뗌
  heldCount: number             // 이 이벤트 직후 동시에 눌려 있는 키 수(§4)
  special: SpecialKey | null    // (v0.11) 필수 — 항상 온다(없으면 null). 선택(?) 필드가 아니다
  repeat: boolean               // (v0.12, OV-R-24) 필수 — 항상 온다. true = 이미 눌린 키의 OS 자동 반복 누름(그때 pressed는 항상 true, §3.7.1). 선택(?) 필드가 아니다
  ts: number                    // epoch ms
}
```

**Rust** (`src-tauri/src/bridge/events.rs` · `SpecialKey`는 `crate::hook::SpecialKey`를 `bridge/types.rs`에서 재노출)
```rust
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardPayload {
    pub pressed: bool,
    pub held_count: u32,                 // 키보드 누름 표시용 — 0이면 들림
    pub special: Option<SpecialKey>,     // (v0.11) skip_serializing_if 두지 않는다 — None도 "special": null로 항상 직렬화
    pub repeat: bool,                    // (v0.12) skip_serializing_if 두지 않는다 — false도 "repeat": false로 항상 직렬화
    pub ts: u64,
}
// (v0.12) 필드 순서 = core hook::InputEvent::Keyboard { pressed, held, special, repeat, ts }(🔒 core hook.md §2).
//         emit_input은 InputEvent::Keyboard { pressed, held, special, repeat, ts } → KeyboardPayload { pressed, held_count: held, special, repeat, ts }로 옮겨 담기만 한다(core hook.md §9.2 RB6)
// 정의는 core hook.md §2: #[derive(Serialize, …)] #[serde(rename_all = "snake_case")] — Deserialize 없음(D9)
pub enum SpecialKey { Space, Z, Question, Exclamation, Enter, Backspace, Undo }   // Undo → "undo"(core 미반영 — 아래 「core 선행 필요」)
```

**JSON 직렬화 예시 (고정)**
```json
{ "pressed": true,  "heldCount": 1, "special": "space",    "repeat": false, "ts": 1760000000000 }   // 스페이스 누름
{ "pressed": false, "heldCount": 0, "special": "space",    "repeat": false, "ts": 1760000000080 }   // 스페이스 뗌 — 누를 때 값 그대로
{ "pressed": true,  "heldCount": 1, "special": null,       "repeat": false, "ts": 1760000000200 }   // 왼쪽 Shift 누름(Shift 자체는 7종 밖)
{ "pressed": true,  "heldCount": 2, "special": "question", "repeat": false, "ts": 1760000000250 }   // Shift를 누른 채 / 누름
{ "pressed": false, "heldCount": 1, "special": null,       "repeat": false, "ts": 1760000000300 }   // Shift 먼저 뗌
{ "pressed": false, "heldCount": 0, "special": "question", "repeat": false, "ts": 1760000000350 }   // / 뗌 — Shift가 이미 떼어졌어도 누를 때 값 그대로
{ "pressed": true,  "heldCount": 1, "special": null,       "repeat": false, "ts": 1760000000400 }   // 왼쪽 Ctrl 누름(Ctrl 자체는 7종 밖)
{ "pressed": true,  "heldCount": 2, "special": "undo",     "repeat": false, "ts": 1760000000450 }   // Ctrl을 누른 채 Z 누름 — "z"가 아니다
{ "pressed": true,  "heldCount": 3, "special": null,       "repeat": false, "ts": 1760000000500 }   // Ctrl을 누른 채 Enter 누름 — Ctrl+Z 외 조합은 일반 키
{ "pressed": false, "heldCount": 2, "special": null,       "repeat": false, "ts": 1760000000550 }   // Ctrl 먼저 뗌
{ "pressed": false, "heldCount": 1, "special": "undo",     "repeat": false, "ts": 1760000000600 }   // Z 뗌 — Ctrl이 이미 떼어졌어도 누를 때 값 그대로
```
(v0.12) 모든 페이로드에 `"repeat"`가 붙는다. 자동 반복(`"repeat": true`) 예시는 §3.7.1.

| `special` 값 (🔒) | 사용자 키 | 대응 슬롯(§3.1, `key_{special}`) |
|---|---|---|
| `'space'` | 스페이스바 | `key_space` |
| `'z'` | ㅋ·z·Z (물리 키 Z, Ctrl 없이) | `key_z` |
| `'question'` | ?(Shift+`/`) | `key_question` |
| `'exclamation'` | !(Shift+`1`) | `key_exclamation` |
| `'enter'` | Enter(숫자패드 포함) | `key_enter` |
| `'backspace'` | Backspace | `key_backspace` |
| `'undo'` | Ctrl+Z(「뒤로가기」 — ㅋ 그림이 아님) | `key_undo` |
| `null` | 그 밖의 모든 키(Shift·Ctrl 등 수식 키 자체 포함), Ctrl을 누른 채 누른 Z 외의 키, 누름을 못 본 뗌 | 특수 키 슬롯 안 씀 |

| 경우 | `special` (🔒 core hook.md §9 B4 · 확정사항 §5) |
|---|---|
| 누름 | 누른 순간의 분류 |
| Ctrl을 누른 채 누름 | 물리 키 Z면 `undo`, 그 밖의 키는 전부 `null`(Ctrl+Enter·Ctrl+Space·Ctrl+Backspace 등). Ctrl+Shift+Z(다시 실행)도 `null`(일반 누름) — `undo`는 **Shift 없는 Ctrl+Z만**(🔒 메인 세션 결정 2026-09-24) |
| 뗌 | **그 물리 키를 누를 때 보낸 값과 같은 값**. Shift·Ctrl을 먼저 떼도 `question`·`exclamation`·`undo` 그대로 |
| 누름을 보지 못한 뗌(앱 시작 전부터 누르고 있던 키) | `null` |
| 7종 밖 키 | 누름·뗌 모두 `null` |
| 같은 키 자동 반복 | (v0.12) `repeat: true` 누름 이벤트로 온다(수식 키 좌우 Shift·Ctrl·Alt·Win의 자동 반복은 이벤트 없음, §3.7.1). `special`은 **그 키를 처음 누를 때 보낸 값**(재판정 없음 — 그사이 Shift·Ctrl을 바꿔도 그대로, §3.7.1). v0.11까지는 이벤트 없음 |

- (v0.11) **core 선행 필요**: core hook.md(2026-09-24 1차)는 6종 `SpecialKey`와 J9 「Ctrl·Alt·Win 조합은 보지 않는다(Ctrl+Z도 `Z`)」로 되어 있어 이 계약과 어긋난다. core-designer가 `SpecialKey::Undo`(직렬화 `"undo"`)와 Ctrl 판정(눌린 키 표에서 좌·우 Ctrl)을 반영해야 한다. core assets.md §3.7도 `SimpleSlot::KeyUndo`(`"key_undo"`, 캔버스 레이어·선택)가 없다. 계약은 확정사항 §5(🔒 7종)를 따른다. Alt·Win은 확정사항이 정하지 않았으므로 판정에 쓰지 않는다.

- `special`은 누름·뗌이 같은 값으로 짝지어 오므로 ui는 "지금 눌려 있는 특수 키"를 이 이벤트만으로 유지할 수 있다(자기 완결 — 되묻는 command 없음). 여러 키가 겹칠 때 어떤 그림을 보일지는 ui 설계 몫(overlay design.md).
- 래퍼·이벤트 이름·빈도 불변: `onKeyboard(cb: (e: KeyboardInputEvent) => void)`, `input://keyboard`, 즉시.

**전환 위험 (v0.11, CR-021) — core hook·assets·bridge(Rust·TS)를 한 묶음으로 반영한다.**
- Rust 컴파일: core `InputEvent::Keyboard`에 `special`이 생기면 `bridge/events.rs`의 `emit_input` 패턴이 필드 누락으로 **컴파일 오류**다(core hook.md §9 B9). hook과 bridge Rust는 반드시 같은 묶음.
- 런타임(IPC): Rust만 먼저면 옛 ui는 모르는 필드 `special`을 무시한다(비파괴). TS만 먼저면 옛 Rust가 필드를 보내지 않아 실제 값은 `undefined`다 — overlay 설계는 이를 `null`로 다룬다(overlay design/functions.md 키보드 핸들러 `isSpecialKey`).
- `AssetSlot` `key_*`: Rust만 먼저면 안전(옛 ui는 새 값을 보내지 않음). ui만 먼저면 옛 Rust가 `import_asset`·`remove_asset` 인자 `'key_*'`를 역직렬화하지 못해 Tauri 인자 오류(`BridgeError` 형태 아님). 저장 데이터: `key_*` 항목이 든 manifest.json을 CR-021 이전 빌드가 읽으면 v0.10 관대한 로드가 그 항목만 건너뛴다(§3.1 「옛 매니페스트 호환」과 같은 경로).

#### 3.7.1 자동 반복 — `repeat` (v0.12, OV-R-24 / CR-023)

초인종을 꾹 누르고 있으면 "딩-딩-딩" 계속 울린다. v0.11까지 bridge는 첫 "딩"만 알렸고, v0.12부터는 이어지는 "딩"마다 "아까 그 초인종이 또 울렸다"(`repeat: true`)고 알린다. 어느 초인종인지(어떤 키인지)는 여전히 적지 않는다. 반복 판정은 core `hook`만 한다(정본 core hook.md §3.5 A1~A7) — bridge는 core가 준 값을 그대로 싣는다.

| 경우 (🔒 core hook.md §9.2 RB3) | `pressed` | `heldCount` | `special` | `repeat` |
|---|---|---|---|---|
| 첫 누름(떼져 있던 키, 훅 재시작 뒤 처음 보는 누름 포함) | `true` | 이벤트 직후 수(직전 + 1) | 누른 순간의 분류(§3.7) | `false` |
| 자동 반복 누름(이미 눌린 키의 OS 반복) | `true` | **직전 이벤트와 같음**(늘지 않음) | **그 키를 처음 누를 때 보낸 값**(재판정 없음) | `true` |
| 뗌 | `false` | 이벤트 직후 수 | 누를 때 값(§3.7) | **항상 `false`** |
| 뗀 뒤 다시 누름 | `true` | 이벤트 직후 수 | 새로 판정 | `false`(첫 누름) |
| 수식 키(좌우 Shift·Ctrl·Alt·Win) 꾹 누름의 OS 자동 반복 | — | — | — | **이벤트 없음**(🔒 사용자 결정 2026-09-24, 확정사항 §4 3행 — hook이 수식 키의 자동 반복을 이벤트로 내지 않는다. 수식 키만 꾹 눌러도 떨지 않는다). 수식 키의 첫 누름·뗌은 기존대로 `repeat: false`로 온다 |

- 불변식: `repeat: true` ⇒ `pressed: true`. `repeat: true`인 뗌은 없다.
- 어떤 키가 반복되는지는 담지 않는다(§3.8 1). `special`이 7종일 때 그 분류값이 보이는 것은 v0.11과 같은 노출이다.

**JSON 직렬화 예시 (고정)**
```json
{ "pressed": true,  "heldCount": 1, "special": "space", "repeat": false, "ts": 1760000000000 }   // 스페이스 첫 누름 — 젤리
{ "pressed": true,  "heldCount": 1, "special": "space", "repeat": true,  "ts": 1760000000500 }   // 약 0.5초 뒤 첫 자동 반복 — heldCount 불변
{ "pressed": true,  "heldCount": 1, "special": "space", "repeat": true,  "ts": 1760000000533 }   // 이어지는 반복(약 33ms 간격)
{ "pressed": false, "heldCount": 0, "special": "space", "repeat": false, "ts": 1760000000900 }   // 뗌 — 뗌은 항상 repeat false
{ "pressed": true,  "heldCount": 1, "special": null,    "repeat": true,  "ts": 1760000001500 }   // 일반 키(7종 밖) 반복 — special null. 수식 키만 꾹 누르면 이런 반복 이벤트가 없다
```

**빈도 (core hook.md §9.2 RB4)**: 스로틀·병합 없음(`input://keyboard` 기존 「즉시」 규칙). 빈도는 Windows 키보드 설정을 따른다 — 첫 반복까지 약 250ms~1s(기본 약 500ms), 반복 간격 약 33ms(≈30Hz)~400ms(≈2.5Hz). Windows는 마지막에 누른 키 하나만 반복하므로 추가 부하는 최대 약 30건/초다.

**멈춤 알림 없음 (core hook.md §3.5 A7)**: 「반복이 멈췄다」 이벤트는 없다(훅에 타이머가 없다). ui는 ① 뗌(`pressed: false`) 또는 ② 마지막 `repeat: true` 이후 일정 시간 무수신으로 멈춤을 판단한다. ②가 필요한 예: `a`를 누른 채 `b`를 눌렀다 떼면 `a`는 눌려 있어도 OS가 `a` 반복을 다시 보내지 않는다(core hook.md §8.3 R3). 타임아웃 값은 ui 결정이며 가장 느린 반복 간격(≈400ms)보다 길어야 떨림이 끊기지 않는다.

**ui 요구 (core hook.md §9.2 RB5 — 계약은 의미만 고정, 처리는 overlay design)**: `pressed: true`는 더 이상 「새 누름」만을 뜻하지 않는다. ui는 `repeat: true`일 때 누름 프레임 순환·젤리(바운스) 시작·특수 키 목록 갱신을 하지 않고 부르르 상태만 갱신한다. 쉬는중 해제·유휴 타이머 갱신 여부는 ui 결정.

**전환 위험 (v0.12, CR-023) — 모양은 추가, 의미는 파괴. core hook·bridge(Rust·TS)·ui를 한 묶음으로 반영한다(core hook.md §9.2 RB9).**
- Rust 컴파일: core `InputEvent::Keyboard`에 `repeat`가 생기면 `bridge/events.rs`의 `emit_input` 패턴과 테스트의 `KeyboardPayload` 리터럴이 필드 누락으로 **컴파일 오류**다(RB6). hook과 bridge Rust는 반드시 같은 묶음. 직렬화 테스트는 `"repeat":false`·`"repeat":true`를 단언한다.
- 런타임(IPC) 모양: Rust만 먼저면 옛 ui는 모르는 필드 `repeat`를 무시한다(추가).
- 런타임 의미: core·bridge만 먼저 들어가면 옛 ui는 반복 누름을 새 누름으로 세어 **누르고 있는 동안 누름 프레임이 최대 약 30Hz로 순환**하고 특수 키 목록을 다시 쓴다(연타 오동작, core hook.md §8.3 R2). 부득이 나누면 **ui가 `repeat === true`를 무시하도록 먼저** 넣고 core·bridge를 넣는다(역순 금지).
- TS만 먼저: 옛 Rust는 `repeat`를 보내지 않아 실제 값은 `undefined`다. 옛 Rust는 반복 이벤트 자체를 보내지 않으므로 ui는 `repeat`가 없으면 반복 아님으로 다룬다(overlay design.md 특수 키 규칙 9번 「`repeat` 필드가 없는 이벤트」).
- TS **필수** 필드로 둔다(`repeat?` 아님): 의미가 바뀌는 변경이라 선택 필드면 누락이 조용히 `undefined`로 새어 첫 누름으로 오인된다. 필수면 페이로드를 손으로 만드는 곳(테스트 픽스처)의 누락을 `yarn tsc`가 잡는다(RB8).

### 3.8 키보드 입력 개인정보 규칙 (v0.11, 🔒 OV-R-22 · 확정사항 §5)

계약은 "무엇을 눌렀는지"를 담지 않는다. 담는 것은 "눌렀다/뗐다·몇 개·7종 중 무엇인지·(v0.12) 자동 반복인지·언제"뿐이다(정본 core hook.md §1.1 P1~P6).

| # | 규칙 |
|---|---|
| 1 | 계약에는 가상 키 코드·스캔 코드·문자 필드가 **없다**. 키보드 정보는 `pressed`·`heldCount`·`special`(7종 분류값 또는 `null`)·(v0.12) `repeat`(자동 반복 여부 한 비트 — 어떤 키가 반복되는지는 담지 않는다, OV-R-24)·`ts`뿐이다. Ctrl 눌림 여부도 따로 내보내지 않는다(`undo`/`null`에 이미 반영). 키를 식별하는 필드를 더하려면 요구 변경(사용자 결정)이 먼저다 |
| 2 | bridge Rust(`lib.rs` 입력 전달 스레드·`events::emit_input`)·bridge TS 래퍼·ui는 키보드 이벤트·페이로드·`special` 값을 **로그·콘솔·파일·저장소(settings.json·localStorage 등)에 남기지 않고, command로 Rust에 되돌려 보내지도 않는다**. emit 실패 로그는 오류 값만 싣는다(현행 `"입력 이벤트 emit 실패: {e}"` — 페이로드 미포함, core hook.md §9 B5). (v0.12) 자동 반복 이벤트와 `repeat` 값도 같다(core hook.md §9.2 RB7) |
| 3 | ui는 `special`을 "지금 눌려 있는 것"으로만 잠시 들고 떼면 버린다. 이력·횟수·순서를 쌓지 않는다(구체 규칙은 overlay design.md — 계약은 금지만 고정). (v0.12) `repeat`도 「지금 반복 중」 상태로만 들고, 반복 횟수·지속 시간을 누적·저장하지 않는다(RB7) |

### 3.9 뽀모도 타이머 — `TimerMode` · `TimerStatus` · `TimerSnapshot` · `TimerAction` (v0.21, CR-045 · PT-03 · PT-05 · PT-06 · PT-09 · v0.23, CR-048 · TM-01 · TM-05 · TM-06)

타이머는 core가 하나만 가진 스톱워치 **또는 카운트다운**이다(v0.23 — 모드는 설정 `timer.mode`에서 온다. 휘발 — 경과·남은 시간은 저장하지 않는다, PT-09). ui는 사진(`TimerSnapshot`)을 받아 `running`이면 받은 뒤 흐른 시간을 스스로 더해 그린다. 규칙·전이표는 §5.8.

**TS** (`src/bridge/types.ts`)
```ts
/** (v0.23) stopwatch = 0부터 올라감, countdown = 시작 시간에서 0까지 내려감 */
export type TimerMode = 'stopwatch' | 'countdown'
/** restPaused = 쉬는중이라 자동 일시정지(입력 시 자동 재개 — 스톱워치 전용), paused = 사용자 일시정지·타이머 끔(자동 재개 없음),
 *  finished = (v0.23) 카운트다운 0 도달 뒤 10초(깜빡임). core가 10초 뒤 stopped로 되돌린다(카운트다운 전용) */
export type TimerStatus = 'stopped' | 'running' | 'paused' | 'restPaused' | 'finished'
/** 이 순간의 타이머. elapsedMs = core가 보낸 순간의 경과(ms, 정수 ≥ 0) */
export interface TimerSnapshot {
  status: TimerStatus
  elapsedMs: number
  /** (v0.23) Rust는 항상 보낸다. 없으면 'stopwatch'(옛 픽스처 호환) */
  mode?: TimerMode
  /** (v0.23) 카운트다운 이번 회차 시작 시간(ms), 스톱워치는 0. Rust는 항상 보낸다. 없으면 0 */
  durationMs?: number
}
/** 사용자 조작. stop = 대기로 초기화(스톱워치 00:00:00, 카운트다운 시작 시간) */
export type TimerAction = 'start' | 'pause' | 'stop'
```

**Rust** (= core — `TimerStatus`·`TimerAction`·`TimerSnapshot`은 `crate::timer`, `TimerMode`는 `crate::settings::timer`(§3.3 v0.23). bridge `types.rs`는 재노출만 — `TimerMode`는 timer 모듈이 재노출하지 않으므로 settings 경로에서 가져온다)
```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimerStatus { Stopped, Running, Paused, RestPaused, Finished }   // (v0.23) Finished 추가
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimerAction { Start, Pause, Stop }            // control_timer 인자 — Deserialize 필수. 불변
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerSnapshot {                             // 필드 선언 순서 = 직렬화 순서
    pub status: TimerStatus,
    pub elapsed_ms: u64,
    pub mode: TimerMode,     // (v0.23) = crate::settings::timer::TimerMode
    pub duration_ms: u64,    // (v0.23) 카운트다운 = 이번 회차 시작 시간(core `active`) ms, 스톱워치 = 0
}
```

**JSON 직렬화 예시 (고정)**
```json
{ "status": "stopped", "elapsedMs": 0, "mode": "stopwatch", "durationMs": 0 }
{ "status": "running", "elapsedMs": 83250, "mode": "stopwatch", "durationMs": 0 }
{ "status": "restPaused", "elapsedMs": 300412, "mode": "stopwatch", "durationMs": 0 }
{ "status": "stopped", "elapsedMs": 0, "mode": "countdown", "durationMs": 1500000 }
{ "status": "running", "elapsedMs": 83250, "mode": "countdown", "durationMs": 1500000 }
{ "status": "finished", "elapsedMs": 1500000, "mode": "countdown", "durationMs": 1500000 }
"start"   "pause"   "stop"                  // TimerAction — invoke 인자는 { "action": "start" }
"stopwatch"   "countdown"                   // TimerMode
```

**상태 × 모드 (v0.23, 02-design §3.1)** — 전이는 §5.8.

| `status` | 스톱워치 | 카운트다운 | `elapsedMs` |
|---|---|---|---|
| `stopped` | 00:00:00 대기 | 시작 시간 대기(남은 = `durationMs`) | 0 |
| `running` | 올라감 | 내려감 | 스톱워치 상한 없음, 카운트다운 `≤ durationMs` |
| `paused` | 사용자 일시정지·끔 | 같음 | 멈춘 값 |
| `restPaused` | 쉬는중 자동 일시정지 | **생기지 않음**(쉬는중에도 계속 줄어듦 — 🔒 103행) | 멈춘 값 |
| `finished` | **생기지 않음** | 0 도달 뒤 10초(core `FINISHED_HOLD`, **감지 시각부터** — A-2) | `= durationMs` |

- 열거 표기: `rename_all = "camelCase"` — 여러 단어 변형은 **`"restPaused"`**(`"rest_paused"` 아님). §3.1 슬롯(snake_case)·`Language`(lowercase)와 규칙이 다르지만 확정 명세(패킷 §1.3) 값이다. 한 단어 값은 차이 없음.
- `elapsed_ms: u64`는 JS number로 안전하다(2^53 ms ≈ 28만 년). core는 `as_millis()`를 포화 변환한다(panic 없음).
- 창별 정보·시각(`ts`)은 없다 — 받은 시각은 ui가 `performance.now()`로 잰다(§5.8-2).
- (v0.23) **ui 표시 식**(ui 몫, 02-design §3.6 — 계약은 식만 고정): 스톱워치 = `elapsedNow`(내림), 카운트다운 = `max(0, durationMs − elapsedNow)`(올림 `ceil` — 시작 순간 `00:25:00`, 0에 닿는 순간 `00:00:00`). `finished`는 `00:00:00` + 깜빡임. `mode`·`durationMs`가 없으면 `'stopwatch'`·0으로 본다.
- (v0.23) **선택 표기 이유**: Rust는 `mode`·`durationMs`를 항상 보낸다. TS `?`는 ui 테스트 픽스처(`TimerSnapshot` 리터럴) 호환용이다(패킷 §2). 필수로 바꾸는 것은 ui 픽스처 정리 뒤 별도 결정(파괴 변경).
- (v0.23) **`'finished'` 유니온 멤버 추가**: TS 소스에 `TimerStatus` 전수 `switch`·`Record<TimerStatus, …>`가 있으면 `yarn tsc`가 잡는다 — ui 분기 보강(표시·버튼·깜빡임·알림음)은 ui 패킷 몫(§9 v0.23).

### 3.10 알림음 — `AlarmFormat` · `AlarmSound` (v0.23 신규, CR-048 · TM-07 · TM-08)

사진첩(매니페스트) 옆에 벨소리 칸 하나를 따로 둔다. 칸 이름표(`alarm.*`)는 미리 붙어 있고, 사용자가 가져온 봉투의 이름은 보지 않는다.

**TS** (`src/bridge/types.ts`)
```ts
export type AlarmFormat = 'wav' | 'mp3' | 'ogg'
/** 등록한 알림음. url = asset 프로토콜(?v=수정 시각 ms). 미등록이면 get_alarm_sound가 null을 돌려준다 */
export interface AlarmSound { format: AlarmFormat; bytes: number; url: string }
```

**Rust** (= core `crate::assets::sound`, bridge `types.rs`는 재노출만)
```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AlarmFormat { Wav, Mp3, Ogg }
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlarmSound { pub format: AlarmFormat, pub bytes: u64, pub url: String }
```

**JSON 직렬화 예시 (고정)**
```json
{ "format": "mp3", "bytes": 312004, "url": "http://asset.localhost/…/assets/alarm.mp3?v=1758870000000" }
null                                        // get_alarm_sound — 미등록
"wav"   "mp3"   "ogg"                       // AlarmFormat
```

- 알림음은 **이미지 슬롯이 아니다**(A-1): `AssetSlot`·`AssetManifest`·`assets://changed`와 무관하고 매니페스트·이미지 카드·캔버스 계산에 나타나지 않는다.
- `format`은 파일 **앞 바이트(매직)**로 판별한다 — 확장자는 보지 않는다(core assets.md §3.15.2). 저장 이름은 `assets/alarm.wav`·`alarm.mp3`·`alarm.ogg` 중 하나로 고정.
- `bytes` = 저장 파일 크기(`u64`, ≤ 1,048,576 — JS number 안전). `url` = `AssetEntry.url`과 같은 `versioned_asset_url`(`?v=` 수정 시각 ms — 같은 이름으로 다시 등록해도 webview 캐시가 갈린다).
- 열거 표기 `lowercase`(한 단어라 camelCase·snake_case와 결과 같음). `AlarmSound`는 Serialize만(ui 입력으로 받지 않음).
- 내장 기본음은 계약에 없다 — ui에 번들된 정적 mp3(`src/assets/sounds/default-alarm.mp3`, Vite 정적 asset import URL — webview 자체 출처 `'self'`, TM-09. v0.27 CR-058 정정 — v0.23~v0.26 문서: ui가 합성한 WAV Blob URL, 02-design §6.3). 재생 음량은 `Settings.timer.alarmVolume`(§3.3 v0.23). 규칙은 §5.9.

## 4. 이벤트 (Rust → UI)

| 이벤트 이름 | 페이로드 | 빈도 | 설명 | 요구ID |
|---|---|---|---|---|
| `timer://changed` | `TimerSnapshot`(§3.9 — v0.23 `mode`·`durationMs` 포함) | **상태가 바뀔 때만** — 분당 수 회 이하, **주기 이벤트 없음**(매초 emit 금지). (v0.23) 카운트다운 1회당 조작 수 + 2건(`finished` 진입·대기 복귀) | (v0.21, CR-045 신규 도메인 `timer`. **v0.23, CR-048 발신 지점 교체**) **발신 지점**: ① 사용자 조작 — 설정 창 `control_timer`, **트레이 메뉴**(core `tray`) ② `set_settings` 타이머 부수 효과 — 타이머 끔·**모드 전환·대기 중 시작 시간 변경**(§5.3 6단계). (v0.25) `reset_app_data`의 타이머 설정 반영도 같은 판정·같은 깔때기(§5.10 8단계) ③ 쉬는중 진입·해제 `set_resting`(스톱워치만 — 카운트다운은 변화 없음) ④ **카운트다운 0 도달(`finished`)·끝남 10초 만료(`stopped`)** — core 마감 시각 스레드. **모든 지점은 core가 「바뀜」(`true`)을 돌려줬을 때 core 깔때기 `crate::publish_timer_change(app, &snap)` 한 곳을 거친다**(emit → 트레이 메뉴 동기화 → 마감 스레드 깨움). bridge는 `events::emit_timer_changed`를 직접 부르지 않는다(§5.8-1). 모든 창에 `app.emit`(오버레이·설정 창 모두 소비 — `emit_to` 금지). 앱 시작 때는 emit하지 않는다(ui는 `get_timer`). ui는 **구독 먼저 → `get_timer`**(§5.8-3). emit 실패는 경고 로그(원래 command는 성공). 상수 Rust `TIMER_CHANGED`·TS `EVENTS.timerChanged`, 래퍼 `onTimerChanged`(기존 `Subscriber<T>` 패턴). 이름·페이로드 타입 불변, 새 이벤트 없음(알림음 변경 이벤트도 없음 — A-1) | PT-03, PT-05, PT-06, TM-05, TM-06, TM-11, R-B2(v0.25) |
| `input://keyboard` | `KeyboardInputEvent` = `{ pressed: boolean; heldCount: number; special: SpecialKey \| null; repeat: boolean; ts: number }` (§3.7·§3.7.1) | 즉시(스로틀 없음). (v0.12) 자동 반복 중 최대 약 30건/초(Windows 반복 간격 33~400ms, 한 번에 한 키) | 아무 키 누름/뗌. `heldCount` = 이 이벤트 직후 동시에 눌려 있는 키 수 — 키보드 누름 표시용: 0이면 모든 키가 떼어져 들림, 1 이상이면 누름 유지((v0.10) 쾅 판정 용도 폐기, 필드·페이로드 불변). (v0.11) `special` = 특수 키 7종 분류값 또는 `null`, 항상 포함. Ctrl을 누른 채 누른 키는 Shift 없는 Z(`undo`) 외에는 `null`. 뗌은 그 키를 누를 때 보낸 값과 같다(§3.7). 키 코드·스캔 코드·문자는 보내지 않는다(§3.8). (v0.12) `repeat` = 항상 포함. 누른 채 OS 자동 반복이 들어오면 `repeat: true` 누름을 보낸다(`heldCount` 불변·`special` 처음 값) — **`pressed: true`가 곧 새 누름은 아니다**. 반복 멈춤 이벤트는 없다(ui는 뗌 또는 타임아웃, §3.7.1) | OV-R-22(`special`), OV-R-24(`repeat`), 그 외 미정 |
| `input://mouse-move` | `{ x: number; y: number; ts: number }` | ≤60Hz 스로틀 | 커서 절대 좌표 | 미정 |
| `input://mouse-button` | `{ button: 'left' \| 'right'; pressed: boolean; ts: number }` | 즉시 | 좌/우 버튼 누름/뗌 | 미정 |
| `settings://changed` | `Settings` | 변경 시. 드래그 저장은 드래그 종료당 최대 1회 | `set_settings` 성공 또는 트레이 조작으로 설정이 바뀌면 모든 창에 브로드캐스트. **v0.3: 오버레이 창을 드래그로 옮기고 이동이 멎은 뒤(500ms) core window가 위치를 저장했을 때도 emit**(`window::persist_overlay_position`이 `Some(설정)`을 돌려준 경우만 — 같은 자리·프로그램 이동은 emit 없음). 앱 시작 시 화면 밖 위치 보정 저장은 emit하지 않는다(창이 아직 구독 전일 수 있음 — 창은 `get_settings`로 보정값을 받는다). **(v0.14) 발신 지점**: ① `set_autostart` 성공(기존 — `autostart` 반영, §5.5) ② `reset_overlay_position` 성공(신규 — 옮긴 위치, §5.6) ③ 앱 시작 자동 실행 조회 보정 — core 백그라운드 스레드가 작업 스케줄러 실제 상태가 저장값과 **다를 때만** 저장 후 emit(아래 목록). ③은 창이 뜬 뒤 언제든 올 수 있으므로 ui는 **구독 먼저 → `get_settings`** 순서를 지킨다(§3.6과 같은 규칙). **(v0.25) ④ `reset_app_data`** — 성공·실패와 무관하게 초기화 뒤 메모리 설정으로 1회(부분 실패로 6단계가 위치를 바꾸면 1회 더, §5.10). 앱 시작 세대 초기화(R-A2)는 창 생성 전이라 emit하지 않는다 | OV-R-13, SV2-02~SV2-06, SV2-11·SV2-12(§9), R-B2(v0.25) (그 외 미정) |
| `assets://changed` | `AssetManifest` | 변경 시 | `import_asset`/`remove_asset`/(v0.16) `restore_default_asset` 성공 후 브로드캐스트. (v0.16) `export_default_assets`(사용자 폴더에 쓰기 — 매니페스트 무관)·첫 실행 시딩(setup, §3.1)은 emit하지 않는다. **(v0.25) `reset_app_data`** — 성공·실패와 무관하게 디스크 매니페스트로 1회(`settings://changed` 뒤, §5.10 3단계). 앱 시작 세대 초기화(R-A2)는 emit하지 않는다 | DA-03(v0.16), R-B2(v0.25), 그 외 미정 |
| `assets://hand-anchor-changed` | `HandAnchorEvent` = `{ anchor: Point \| null }` (§3.6) | 값이 **이전 캐시와 다를 때만** 1회(사용자 조작 단위, 드묾) | 손 기준점 재계산 결과가 바뀌면 모든 창에 브로드캐스트(소비자는 overlay). 재계산 시점은 §5 `import_asset`·`remove_asset`·(v0.16) `restore_default_asset`·`set_settings`·(v0.25) `reset_app_data`(항상 재계산, §5.10 7단계) 설명과 앱 시작뿐. 앱 시작 때 계산값은 캐시 초깃값이 되고 **emit하지 않는다**(ui는 `get_hand_anchor`로 받는다). 같은 command 안에서는 주 이벤트(`assets://changed` 또는 `settings://changed`)를 먼저, 이 이벤트를 뒤에 보낸다. emit 실패는 경고 로그(원래 command는 성공) | OV-R-21, OV-R-18, R-B2(v0.25) |

- 이벤트 이름 상수는 **`src/bridge/events.ts`와 `src-tauri/src/bridge/events.rs` 한 곳씩**에만 정의한다. 다른 파일에서 문자열 리터럴 재기입 금지.
- 입력 이벤트는 **오버레이 창과 설정 창 모두**에 emit한다(설정 창의 미리보기도 반응).
- 드래그 저장 경로의 `settings://changed`는 command가 아니라 core window의 저장 스레드 콜백(`lib.rs` setup에서 조립)이 `bridge::events::emit_settings_changed`를 불러 보낸다. core는 emit 함수를 직접 모른다 — 콜백으로 넘겨받는다(core window.md §4).
- (v0.14) 앱 시작 자동 실행 조회 보정의 `settings://changed`도 같은 방식이다 — `lib.rs` setup이 조립한 백그라운드 스레드가 core `tray::autostart::query()` 결과로 설정을 고친 뒤, 주입받은 콜백으로 `bridge::events::emit_settings_changed`를 부른다(core 패킷 §3.3). 이벤트 이름·페이로드 불변, 새 event 없음.
- **(v0.25, R-B2) 한 조작이 스냅숏 이벤트 둘을 함께 보낼 때 — 순서 규칙(비파괴 주석).** `reset_app_data`는 `settings://changed`와 `assets://changed`를 한 번에 보낸다(§5.10 2·3단계). 보내는 순서는 **settings → assets로 고정**한다. 그러나 두 페이로드는 각각 전체 스냅숏(`Settings`·`AssetManifest`)이므로 **소비자는 도착 순서에 의존하지 않는다** — 어느 쪽을 먼저 받아도 둘 다 받은 뒤의 화면이 같아야 한다(한쪽 이벤트를 받고 다른 쪽 상태를 command로 다시 묻지 않는다). 부분 실패 때는 `settings://changed`가 뒤에 한 번 더 올 수 있다(§5.10 6단계). 이벤트 이름·페이로드·빈도 규칙 불변, **새 이벤트 없음**.
- **(v0.25, R-A2) 앱 시작 세대 초기화는 이벤트를 보내지 않는다.** core `data_reset::run_startup`은 `lib.rs` setup에서 창을 만들기 **전에** 끝난다. 창은 첫 `get_settings`·`get_asset_manifest`로 초기화 뒤 값을 받는다(§5 두 행). 기존 「구독 먼저 → 조회」 순서 규칙은 그대로다.

## 5. 명령 (UI → Rust)

- (v0.14, D-3) 「에러 코드」 열은 실물 `BridgeError.code`(§6 정본 `영역.사유`)로 적는다. 아래 표에 대문자(`IO_ERROR` 등)로 남은 칸은 v0.13까지의 **별칭**이며, 실제 발생 code의 정본은 §6.2 command별 표다.

| command | 인자 | 반환 | 에러 코드 | 설명 | 요구ID |
|---|---|---|---|---|---|
| `get_settings` | 없음 | `Settings` | `state.poisoned` | 메모리의 현재 설정을 복제해 반환 — 파일을 읽지 않는다(앱 시작 때 core가 읽어 둔 값. 파일이 없거나 형식 오류면 기본값으로 시작). (v0.14 정정, BRG-006: v0.13까지 「설정 JSON 로드」·`IO_ERROR`로 적었으나 실물과 달랐다). **(v0.25, R-A2) 앱 시작 때 데이터 세대가 다르거나 없으면 core(`data_reset::run_startup`)가 창을 만들기 전에 앱 데이터를 초기화한다 — 첫 조회 값이 곧 초기화 뒤의 값이고, 시작 경로에서는 이벤트를 보내지 않는다(§4). 시그니처·동작 불변** | R-A2(v0.25 주석), 그 외 미정 |
| `set_settings` | `settings: Settings` | `Settings` | `settings.invalid`, `settings.io`, `window.not_found`, `tauri.error`, `state.poisoned` ((v0.14) `autostart.error` 삭제) | 검증 후 저장, 적용된 값 반환. **(v0.14, SV2-03·04·05) 입력 `autostart`는 무시한다 — core 현재값 유지(`overlay.x/y`와 같은 core 소유 필드). 자동 실행을 바꾸지 않는다(`set_autostart`만). `positionLock`·`showInTaskbar`는 오버레이 창에 적용, `language`는 저장만.** **(v0.5) `settings.overlay.x/y`는 무시한다 — 창 위치는 드래그·앱 시작 복원·`set_overlay_position`으로만 바뀐다(core window.md §2.1.1). 저장·반환·emit되는 `overlay.x/y`는 core 현재값. `overlay.visible`은 그대로 적용.** **(v0.22, CR-047) 처리 순서(정본 §5.3): 1 검증 → 2 `settings::update` 한 번(잠금 안에서 core 소유 필드 병합 → 검증 → 원자 저장 → 메모리 대입, 이전 값은 클로저 안에서 복사) → 3 `settings://changed` emit(창 적용보다 먼저 — 창 적용이 실패해도 ui가 저장된 값을 안다) → 4 창 속성 적용(표시/숨김·위치 잠금·작업표시줄) → **(v0.4) 이전 `scale` ≠ 새 `scale`이면 오버레이 창을 표시 크기로 리사이즈**(§5.2 — 논리 px, 캔버스를 450×350 상자에 비율 유지로 맞춘 크기 × 배율, 여백 없음. core `window::resize_overlay`) → 5 (v0.3·v0.8) `mouse.shoulder` 또는 `mouse.partPos`가 바뀌었거나 `mouse`가 켜짐·꺼짐이면 손 기준점 재계산(§5.1-2 ④), 값이 바뀌었으면 `assets://hand-anchor-changed` → 6 (v0.21) 타이머 끔 부수 효과 → 반환. **저장 뒤 재병합 단계는 없다**(v0.21까지의 「5 위치 재병합·메모리 반영」은 삭제 — 병합·검증·저장·메모리 대입이 이미 한 잠금 안에서 끝난다, settings.md §3.9.10 B2). 리사이즈·재계산·타이머 부수 효과 실패는 경고 로그만 남기고 명령은 성공한다** | OV-R-03, OV-R-13, OV-R-21, OV-R-18 (그 외 미정) |
| `get_asset_manifest` | 없음 | `AssetManifest` | `IO_ERROR` | 현재 등록 이미지 목록. **(v0.22, CR-047 · SEC-002) manifest.json의 `fileName`은 신뢰하지 않는다** — core는 슬롯에서 저장 파일명을 다시 만들어 그것과 다른 `fileName`이 적힌 항목은 건너뛴다(위조·손상된 경로로 앱 데이터 밖 파일에 닿는 것을 막는다). 걸러진 항목이 있으면 `canvas`도 남은 항목으로 다시 계산한다(§3.1 「옛 매니페스트 호환」과 같은 방식). 오류 아님 — 조용히 제외. **(v0.25, R-A2) 앱 시작 세대 초기화는 창 생성 전에 끝나므로 첫 조회 값이 곧 초기화 뒤의 매니페스트(내장 기본 7장)다. 시작 경로에서는 이벤트를 보내지 않는다(§4). 시그니처·동작 불변** | R-A2(v0.25 주석), 그 외 미정 |
| `import_asset` | `slot: AssetSlot`, `path: string` | `AssetManifest` | `ASSET_INVALID_FORMAT`, `ASSET_TOO_LARGE`, `ASSET_CANVAS_MISMATCH`, `ASSET_SLOT_INVALID`, `IO_ERROR` | PNG RGBA·크기·용량·그룹 크기 일치 검증 후 앱 데이터 폴더로 복사, `assets://changed` emit. **(v0.22, CR-047 · SEC-003) 파일이 1MB를 넘으면 PNG 서명·헤더를 읽기도 전에 `asset.too_many_bytes`를 먼저 돌려준다**(파일 크기부터 확인 — 큰 파일을 굳이 읽지 않는다). PNG 자체가 아니어도 1MB 초과가 우선한다. **v0.8 (OV-R-18)**: 크기 한도는 모든 슬롯 ≤900×700·≤1MB, 크기 일치는 그룹별 — 캔버스 레이어는 캔버스와, 마우스 파츠는 다른 마우스 파츠와(캔버스와 비교 안 함. §3.1, core assets.md §3.5). 에러 코드 불변. **v0.4 부수 효과**: 슬롯이 캔버스 레이어(마우스 파츠 3종 외 전부)이면 **`assets://changed` emit 전에** 새 `canvas`로 오버레이 창 리사이즈(§5.2). **v0.3 부수 효과**: 슬롯이 `mouse_base`이면 손 기준점 재계산(§5.1) → `assets://changed` 뒤에 (값이 바뀌었으면) `assets://hand-anchor-changed`. 리사이즈·재계산 실패로 명령이 실패하지 않는다. **v0.6**: `slot: 'background'` 허용 — 캔버스 레이어라 검증(한도·캔버스 일치)·캔버스 결정·리사이즈가 몸통과 같고, 손 기준점 재계산은 없다(§5.1-3). 에러 코드는 기존 그대로(새 코드 없음, §6) | OV-R-03, OV-R-21, OV-R-17, OV-R-18 (그 외 미정) |
| `remove_asset` | `slot: AssetSlot` | `AssetManifest` | `ASSET_SLOT_INVALID`, `IO_ERROR` | 슬롯 비우기, `assets://changed` emit. 마지막 캔버스 레이어(v0.6: 배경 포함)를 지우면 `canvas`는 `null`. **v0.4 부수 효과**: 슬롯이 캔버스 레이어이면 **`assets://changed` emit 전에** 오버레이 창 리사이즈(§5.2. `canvas`가 `null`이면 450×350 상자 × 배율). **v0.3 부수 효과**: 슬롯이 `mouse_base`이면 손 기준점 재계산(§5.1, 결과는 `null`) → `assets://changed` 뒤에 (값이 바뀌었으면) `assets://hand-anchor-changed`. 리사이즈·재계산 실패로 명령이 실패하지 않는다. **v0.6**: `slot: 'background'` 허용(미등록이면 `ASSET_SLOT_INVALID`) — 리사이즈 대상, 손 기준점 재계산 없음 | OV-R-03, OV-R-21, OV-R-17 (그 외 미정) |
| `restore_default_asset` | `slot: AssetSlot` | `AssetManifest` | `asset.no_default`, `asset.not_png`·`asset.bad_header`·`asset.not_rgba`·`asset.too_large`·`asset.too_many_bytes`(내장 그림이라 실제로는 나지 않지만 같은 검증 경로라 표기), `asset.canvas_mismatch`, `asset.io`, `asset.manifest`, `tauri.error`(emit), `state.poisoned` | **v0.16 신규(CR-035).** 슬롯을 앱에 내장된 기본 그림으로 되돌린다 — core `assets::defaults::restore_default`(검증 먼저 → 같은 파일명 교체, 실패하면 사용자 그림 그대로). 내장 기본이 없는 슬롯(§3.1 `hasBuiltinDefault` = false)은 `asset.no_default`로 거부(매니페스트 불변). **부수 효과는 `import_asset`과 같다**: 캔버스 레이어면 `assets://changed` 전 오버레이 리사이즈 → `assets://changed` emit → 슬롯이 `mouse_base`면 손 기준점 재계산 → 값이 바뀌었으면 `assets://hand-anchor-changed`. 리사이즈·재계산 실패로 명령이 실패하지 않는다. 상세 §5.7 | DA-03 |
| `export_default_assets` | `dir: string`(절대 경로 — `pickFolder` 결과 그대로), `overwrite: boolean` | `ExportReport`(§3.2.1) | `asset.export_dir` | **v0.16 신규(CR-035).** 내장 기본 그림 15장의 원본 바이트를 `dir`에 `{file_key}.png` 이름으로 쓴다 — core `assets::export::export_defaults`. `overwrite: false`이고 이미 있는 파일이 하나라도 있으면 **아무것도 쓰지 않고** `conflicts`만 채워 반환(🔒 U-5 = A 2단계 호출). 파일별 실패는 `Err`가 아니라 `failed`에 담는다. **부수 효과 없음** — 이벤트·매니페스트·앱 데이터 폴더 무관. 상세 §5.7 | DA-05 |
| `get_hand_anchor` | 없음 | `Point \| null` (§3.6, 캔버스 좌표) | `STATE_POISONED` | **v0.3 신규.** 손 기준점 캐시를 그대로 반환. 해독·계산·파일 접근 없음, 부수 효과 없음. `null`이면 ui가 `mouse.hand` → 이동 영역 중심(v0.9, §3.3. v0.8까지 패드 중심) 폴백 | OV-R-21 |
| `get_screen_bounds` | 없음 | `ScreenBounds` | `WINDOW_ERROR` | 가상 화면 전체 영역(모든 모니터 합집합 1개). **(v0.9) 제거 후보** — overlay가 `get_monitors`로 옮기면 ui 사용처가 0이 된다. 제거는 파괴 변경이라 ui 전환 뒤 사용처 grep으로 확인하고 따로 결정한다(core window.md §11 D24). 이번 버전에서 시그니처·동작 불변 | 미정 (v0.9 제거 후보) |
| `get_monitors` | 없음 | `ScreenBounds[]` (§3.4, 모니터마다 1개, 물리 px, 가상 화면 좌표) | `WINDOW_ERROR` | **v0.9 신규(CR-017).** 연결된 모니터마다 **모니터 전체** 사각형 1개를 OS 열거 순서로 반환. 부수 효과 없음, 캐시 없음(호출마다 OS 조회). core `window::list_monitors`. 커서 좌표(`input://mouse-move`)와 같은 좌표계라 ui가 변환 없이 커서가 든 모니터와 그 안의 비율 (u, v)를 구한다(§3.3 「`area` 의미」). **빈 목록이면 `WINDOW_ERROR`**(핸들러가 `WindowError::NoMonitor`로 바꿈, "모니터 정보를 읽을 수 없습니다.") — 성공 결과는 항상 1개 이상. OS 조회 실패도 `WINDOW_ERROR`. **모니터 구성 변경 event는 없다** — ui 재조회 규칙(ui 몫, core window.md §9.4): 커서가 받아 둔 어느 사각형에도 들지 않으면 다시 부른다(1초에 최대 1회), 결과가 올 때까지는 가장 가까운 모니터 기준으로 (u, v)를 0~1로 고정. 래퍼 `getMonitors(): Promise<ScreenBounds[]>`(🔒 이름) | OV-R-20 |
| `get_overlay_position` | 없음 | `Position`(§3.4) | `window.not_found`, `tauri.error` | 오버레이 창 좌상단 | 미정 |
| `set_overlay_position` | `x: number`, `y: number` | `void` | `window.not_found`, `tauri.error`, `state.poisoned`, `settings.io` | 창 이동 + 설정 저장 + `settings://changed` emit. **(v0.22, CR-047) 저장은 `settings::update`(잠금 안에서 대입·검증·원자 저장·메모리 대입 한 번), emit은 잠금 밖** | 미정 |
| `reset_overlay_position` | 없음 | `Position`(§3.4 — 옮긴 뒤 창 좌상단, 물리 px) | `window.not_found`, `tauri.error`, `state.poisoned`, `settings.io` | **v0.14 신규(SV2-06).** 오버레이를 기본 위치(core `window::default_overlay_position()` = (100, 100))로 옮기고 저장 → `settings://changed` emit → 새 위치 반환. 숨김이어도 옮기고 표시 상태는 바꾸지 않는다. 위치 잠금 중에도 동작(프로그램 이동). 리사이즈·손 기준점 재계산 없음. 상세 §5.6 | SV2-06 |
| `set_overlay_visible` | `visible: boolean` | `void` | `window.not_found`, `tauri.error`, `state.poisoned`, `settings.io` | 오버레이 표시/숨김 + 설정 저장 + `settings://changed` emit. (v0.14) 표시로 바꿀 때 위치 잠금·작업표시줄 재적용은 core `window` 몫(§3.3 「v0.14 필드 3개」) — 핸들러·시그니처 불변. **(v0.22, CR-047) 저장은 `settings::update`, emit은 잠금 밖**(`set_overlay_position`과 같다) | 미정 |
| `set_autostart` | `enabled: boolean` | `boolean`(실제 등록 상태) | `autostart.error`, `io.error`, `tauri.error`, `state.poisoned`, `settings.io` (**(v0.22, CR-047 · SEC-001) `autostart.cancelled` 폐기** — 승격 경로 삭제로 UAC 취소 자체가 없다) | Windows 로그온 시 자동 실행 등록/해제, 실제 상태 반환. **(v0.14, SV2-05) 시그니처 불변·구현 교체**: 작업 스케줄러 등록. **(v0.22, CR-047) 일반 권한(`RunLevel=LeastPrivilege`), 승격 없음** — 토글은 자식 프로세스(schtasks) 실행만 기다리며 **보통 1초 안팎**. `async` command, 블로킹 호출은 별도 스레드. 성공 → `autostart` 저장(`persist_autostart` → `settings::update`) + `settings://changed` emit(값이 바뀐 경우만). 실패 → 설정 불변·emit 없음. 상세 §5.5 | SV2-05 |
| `open_settings_window` | 없음 | `void` | `window.not_found`, `tauri.error` | 설정 창 열기(이미 열려 있으면 포커스) | 미정 |
| `get_timer` | 없음 | `TimerSnapshot`(§3.9) | `state.poisoned` | **v0.21 신규(CR-045).** 지금 타이머 사진 — `AppState.timer` 잠금 → core `Timer::snapshot(Instant::now())`. **부수 효과 없음**(emit 없음). 앱 시작 직후 = `{status:'stopped', elapsedMs:0}`(경과 비저장·자동 시작 없음 — U-3). 창은 `onTimerChanged` 구독 **뒤에** 부른다(§5.8-3). 래퍼 `getTimer(): Promise<TimerSnapshot>` | PT-03, PT-09 |
| `control_timer` | `action: TimerAction`(§3.9) | `TimerSnapshot`(적용 뒤) | `timer.disabled`, `state.poisoned` | **v0.21 신규(CR-045).** 사용자 조작 — 시작·일시정지·멈춤. ① 설정 잠금으로 `timer.enabled` 복사 → **즉시 해제** ② 타이머 잠금 → core `Timer::apply(action, enabled, now)` → snapshot → 해제 ③ `Ok(true)`면 **(v0.23) core 깔때기 `crate::publish_timer_change(&app, &snap)`**(emit → 트레이 메뉴 → 마감 스레드 깨움. 실패는 경고, command 성공. v0.21~v0.22는 `events::emit_timer_changed` 직접 호출) ④ snapshot 반환. `enabled == false`면 `timer.disabled`(상태 불변·emit 없음. (v0.23) 문구 「스톱워치나 타이머가 꺼져 있습니다. …」 — §6). **(v0.23, CR-048) 카운트다운 전이**: 모드는 core `Timer`가 이미 안다(`set_settings`의 `configure`·앱 시작 `with_config`로 받음 — 인자 불변). `start` = 대기에서 내려가기 시작·일시정지에서 이어서, **`finished`에서 `start` = 곧바로 새 회차**(시작 시간 = 설정값, D-7), `stop` = 시작 시간 대기로(`finished` 깜빡임도 멈춤). 전이표 §5.8. 전이표의 「—」(예: 멈춤 상태에서 일시정지)는 에러가 아니라 변화 없음 — 깔때기 없이 현재 snapshot 반환. 두 잠금을 동시에 쥐지 않는다. 시그니처·래퍼 불변 `controlTimer(action: TimerAction): Promise<TimerSnapshot>` | PT-05, TM-05, TM-06 |
| `set_resting` | `resting: boolean` | `TimerSnapshot`(적용 뒤) | `state.poisoned` | **v0.21 신규(CR-045).** 오버레이가 쉬는중 진입(`true`)·해제(`false`)를 알린다 — 판정 주체는 오버레이 상태기계, core는 판정하지 않는다(§5.8-5). 타이머 잠금 → core `Timer::set_resting(resting, now)` → snapshot → 해제 → `true`(바뀜)면 **(v0.23) `crate::publish_timer_change(&app, &snap)`** → 반환. 설정 잠금은 쓰지 않는다. 멱등(같은 값 반복·`stopped`·`paused`에서는 변화 없음, 깔때기 없음). **(v0.23, CR-048) 카운트다운이면 core가 항상 `false`(변화 없음)** — 쉬는중에도 계속 줄어든다(🔒 103행). 오버레이는 모드를 보지 않고 그대로 부른다(판정 한 곳 = core). 시그니처·래퍼 불변 `setResting(resting: boolean): Promise<TimerSnapshot>` | PT-06, TM-05 |
| `get_alarm_sound` | 없음 | `AlarmSound \| null`(§3.10) | `sound.io` | **v0.23 신규(CR-048).** 등록한 알림음 1개 — core `assets::sound::current(&paths.assets_dir)`(여럿 남아 있으면 수정 시각 최신, 없음·폴더 없음 = `null`, 파일 내용은 읽지 않음). **부수 효과 없음**(emit 없음). 오버레이가 `finished` 진입 때 1회(없으면 ui 내장 기본음), 설정 창 마운트 때. 래퍼 `getAlarmSound(): Promise<AlarmSound \| null>` → `invoke('get_alarm_sound')`. 상세 §5.9 | TM-07, TM-08 |
| `import_alarm_sound` | `path: string`(절대 경로 — `pickAudioFile` 결과 그대로) | `AlarmSound`(§3.10 — 저장된 것) | `sound.too_many_bytes`, `sound.not_audio`, `sound.io` | **v0.23 신규(CR-048).** 사용자 소리 파일 등록 — core `assets::sound::import(&paths.assets_dir, Path::new(&path))`. **크기(> 1MiB) 검사가 형식 검사보다 먼저**(파일을 읽기 전에 `sound.too_many_bytes` — `import_asset` SEC-003과 같다) → 앞 바이트로 wav·mp3·ogg 판별(확장자 무시) → `assets/alarm.{wav\|mp3\|ogg}`에 원자 저장 → 다른 두 형식 파일 삭제. 원본 파일명·확장자는 쓰지 않는다. 실패하면 기존 알림음 그대로. **이벤트 없음**(A-1 — 다른 창은 쓸 때 `get_alarm_sound`로 조회). 래퍼 `importAlarmSound(path: string): Promise<AlarmSound>` → `invoke('import_alarm_sound', { path })`. 상세 §5.9 | TM-08 |
| `remove_alarm_sound` | 없음 | `void` | `sound.io` | **v0.23 신규(CR-048).** 알림음을 지워 기본음으로 되돌린다 — core `assets::sound::remove(&paths.assets_dir)`(세 이름 모두 삭제, 없으면 무시 — **멱등**). **이벤트 없음**(A-1). 래퍼 `removeAlarmSound(): Promise<void>` → `invoke('remove_alarm_sound')`. 상세 §5.9 | TM-08 |
| `reset_app_data` | 없음 (JS 인자 없음. (v0.26) Rust 쪽 `window: tauri::WebviewWindow`는 Tauri가 호출 창으로 채우는 주입 인자 — JS가 보내지 않는다) | `void`(JSON `null`) | **(v0.26) `reset.forbidden`**(호출 창이 settings가 아님 — 가장 먼저), `reset.io`, `reset.seed`, `settings.io`, `state.poisoned` (+ `ResetError::Settings`로 그대로 올라오는 `settings.invalid`·`settings.format` — 이론상, §6.2) | **v0.25 신규(data-reset). 🔒 베타 전용** 앱 데이터 전체 초기화 — core `data_reset::reset_data(&paths, &settings)`(그림·매니페스트·알림음 삭제 → 내장 기본 7장 → 설정 보존 규칙 적용 → 세대 표식). **결과와 무관하게** 두 창을 디스크에 남은 실제 상태로 맞춘다: `settings://changed` → `assets://changed` → 오버레이 창 적용·크기 재계산·기본 위치 이동·저장 → 손 기준점 재계산(바뀌면 `assets://hand-anchor-changed`) → 타이머 설정 반영(바뀌면 `timer://changed`) → 오버레이 WebView 새로고침. 설정 창은 새로고침하지 않는다. 보존: 언어·자동 실행. 이벤트 두 개 뒤 단계 실패는 경고 로그만. **동기 command**(동시 실행 직렬화 — §5.10 C-4 불변식). 반환 데이터 없음(세대·버전·결과 수치 비노출). 래퍼 `resetAppData(): Promise<void>` → `invoke('reset_app_data')`. 소비자 settings 창. **(v0.26, SEC-002) settings 창 호출만 허용** — 다른 창(오버레이 등)에서 부르면 잠금·core·emit·창 조작 없이 `reset.forbidden`(§5.10 0단계·「호출 창 제한」). 상세 §5.10 | R-B2, R-B3 |

- (v0.21, CR-045 · PT-04) **`set_settings` 부수 효과 추가**: 저장 전 `timer.enabled == true`이고 적용된 값이 `false`이면 타이머를 일시정지하고(core `Timer::disable`), 바뀌었으면 `settings://changed`·`assets://hand-anchor-changed` **뒤에** `timer://changed`를 보낸다. 실패해도 command는 성공(경고 로그), 에러 code 불변. 위 `set_settings` 행의 처리 순서는 이 단계를 더해 읽는다(정본 §5.3 7단계).
- (v0.23, CR-048 · TM-01 · TM-04 · TM-11) **`set_settings` 타이머 부수 효과 교체**: 끔(`Timer::disable`)에 더해 모드·시작 시간 변경을 core `Timer::configure`로 넘기고, 둘 중 하나라도 바뀌었으면 `crate::publish_timer_change`(emit·트레이·깨움), 아니면 `tray::sync_timer_menu`만 부른다(켜기·끄기는 스냅숏이 그대로여도 트레이 메뉴가 바뀐다). 순서 규칙(`settings://changed`·`assets://hand-anchor-changed` **뒤**)·실패 처리(경고 로그, command 성공)·시그니처·에러 code 불변. 정본 §5.3 6단계.

인자 규칙: Tauri command 인자는 Rust 쪽 `snake_case` 이름을 UI에서 **camelCase**로 넘긴다(Tauri 기본 변환). 예: Rust `fn set_overlay_position(x: i32, y: i32)` ↔ TS `invoke('set_overlay_position', { x, y })`.

### 5.1 손 기준점 캐시·재계산 규칙 (v0.3, OV-R-21 / CR-007)

손 기준점은 "메모해 둔 답"이다. 이미지나 어깨가 바뀔 때만 다시 풀고, 물어보면 메모만 읽어 준다. 해독이 무거워서 매 프레임·매 조회마다 계산하지 않는다.

| # | 규칙 |
|---|---|
| 1 | **캐시**: 앱 상태에 `Mutex<Option<Point>>` 1개(`Point` = `crate::settings::Point`). `get_hand_anchor`는 이것만 읽는다 |
| 2 | **재계산 시점(🔒 이 넷뿐)**: ① 앱 시작 — setup에서 설정·매니페스트를 읽은 직후 계산해 캐시 **초깃값**으로 넣는다(emit 없음) ② `import_asset` 성공 + 슬롯 `mouse_base` ③ `remove_asset` 성공 + 슬롯 `mouse_base` ④ `set_settings` 성공 + (v0.8) `old.mouse.map(\|m\| (m.shoulder, m.part_pos)) != new.mouse.map(\|m\| (m.shoulder, m.part_pos))`(어깨 변경·**파츠 위치 변경**·`mouse` 켜짐·꺼짐. v0.7의 어깨만 비교를 그대로 두면 위치만 바꿀 때 재계산이 빠진다). **(v0.16, CR-035) ⑤ `restore_default_asset` 성공 + 슬롯 `mouse_base`** — ②와 같은 처리(매니페스트는 core가 돌려준 값). 「이 넷뿐」은 v0.15까지의 문장이고 v0.16부터 **이 다섯뿐**이다. `export_default_assets`·첫 실행 시딩은 재계산 시점이 아니다(시딩 결과는 ① 앱 시작 계산이 그대로 쓴다). 같은 이유로 §5.2-2 ③ 리사이즈 호출 시점의 `import_asset`은 v0.16부터 `restore_default_asset`을 포함한다 |
| 3 | **재계산 안 함**: 배율·유휴·표시·자동 실행 변경, `set_overlay_position`·`set_overlay_visible`·`set_autostart`, 드래그 위치 저장, `mouse_left`/`mouse_right` 등록·삭제, (v0.6) `background` 등록·삭제(`compute_hand_anchor`는 `mouse_base`만 읽는다 — core assets.md §3.4), (v0.9) `mouse.area`·`mouse.hand` 변경(결과가 `mouse_base`·`shoulder`·`partPos`에만 의존 — core assets.md §9.1-4, settings.md §9.1-7. v0.8까지 `mouse.pad`. bridge `set_settings` 재계산 조건 코드 불변), (v0.13) 펜 그림(`pen_up`·`pen_down`·`pen_key_*`) 등록·삭제와 `mouse.penPos` 변경(`compute_hand_anchor`는 `mouse_base`만 읽고 인자는 `(shoulder, part_pos)`뿐 — core assets.md §3.8, settings.md §3.1.1·§9.4-6. bridge 재계산 조건 `slot == MouseBase`·`(shoulder, part_pos)` 비교 코드 불변), `get_monitors`, (v0.15, CR-033) `mouse.penMode` 변경(재계산 조건 `(shoulder, part_pos)` 비교 코드 불변 — 창 리사이즈도 없음, §5.2-3 「배율 외 설정 변경」), (v0.14) `language`·`positionLock`·`showInTaskbar` 변경(재계산 조건 `(shoulder, part_pos)` 비교 코드 불변)·`reset_overlay_position`·`set_autostart`(구현 교체 후에도). 이 v0.14 항목들은 창 리사이즈도 하지 않는다 — §5.2-3 「호출 안 함」 칸은 v0.13 문구 그대로 두고 이 줄로 갈음 |
| 4 | **입력**: `settings.mouse`가 `null`이면 계산 없이 `None`. 아니면 어깨·파츠 위치 값(`shoulder`, `partPos`)을 복사하고 설정 잠금을 푼 뒤 core `assets::compute_hand_anchor(assets_dir: &Path, manifest: &AssetManifest, shoulder: Point, part_pos: Point) -> Result<Option<Point>, AssetError>`(v0.8 인자 `part_pos` 추가 — 호출 지점은 `refresh_hand_anchor`와 setup 두 곳)를 부른다. 매니페스트는 `import_asset`·`remove_asset`이면 core가 돌려준 값, `set_settings`·앱 시작이면 `assets::load_manifest(assets_dir)`. **계산 중 어떤 `Mutex`도 쥐지 않는다** |
| 5 | **실패**: `compute_hand_anchor`의 `Err(Io \| Decode)`나 매니페스트 읽기 실패는 `log::warn!` 후 `None`으로 취급한다. 원래 command는 실패시키지 않는다 |
| 6 | **비교·emit**: 캐시 잠금 안에서 이전 값과 비교·갱신만 하고, 잠금을 푼 뒤 값이 달랐을 때만 `assets://hand-anchor-changed` emit(§4). 순서는 주 이벤트 → 기준점 이벤트 |
| 7 | **스레드 전제**: 재계산은 setup과 동기 command 안에서만 일어난다. 동기 command는 Tauri 메인 스레드에서 차례로 실행되므로 캐시 갱신 순서가 꼬이지 않는다. 해당 command를 `async`로 바꾸면 이 규칙을 다시 설계한다. 비용은 조작 1회당 900×700 해독 1회 + 픽셀 2회 순회 |

### 5.2 오버레이 창 리사이즈 부수 효과 (v0.4, OV-R-03)

창은 그림(캔버스)에 맞춰 자르는 액자다. 그림을 450×350 틀 안에 비율 그대로 넣은 크기에 배율을 곱해 액자를 다시 자르고, 틀의 남는 부분은 액자에 넣지 않는다. 계산·적용은 core `window::resize_overlay`가 하고, bridge는 호출 시점과 입력만 정한다. **새 command·event·페이로드·에러 코드는 없다** — 창 크기는 ui에 알리지 않으며 ui는 같은 입력(캔버스·배율)으로 스스로 그린다(core window.md §9.1·§11 D11).

| # | 규칙 |
|---|---|
| 1 | **크기 규칙(정본 core window.md §2.2 `overlay_display_size`)**: 단위는 **논리 px**(= ui CSS px. 창 위치 `overlay.x/y`의 물리 px와 단위가 다르다). `fit = min(450 / 캔버스 가로, 350 / 캔버스 세로)`, 창 안쪽 크기 = `ceil(캔버스 가로 × fit × scale)` × `ceil(캔버스 세로 × fit × scale)`. 캔버스가 `null`이면 450×350 상자 자체(fit = 1). **여백 없음** — 비율이 9:7이 아니면 창은 맞춘 캔버스 크기만큼만 잡힌다(예: 612×354 캔버스, 배율 1 → 450×261). 배율 2의 상한은 900×700. 좌상단 고정(위치 불변) |
| 2 | **호출 시점(이 셋뿐)**: ① 앱 시작 setup — 아래 「앱 시작 순서」 0단계 ② `set_settings` 성공 + 이전 `scale` ≠ 새 `scale` ③ `import_asset`·`remove_asset` 성공 + 슬롯이 캔버스 레이어(core `assets::AssetSlot::is_canvas_layer()` = `background`(v0.6)·`body`·`idle`·`rest`·`kb_up`·`kb_down`((v0.10) `slam` 삭제)·(v0.11) 특수 키 슬롯 `key_space`·`key_z`·`key_question`·`key_exclamation`·`key_enter`·`key_backspace`·`key_undo`. 마우스 파츠 3종·(v0.13) 펜 그림(`pen_up`·`pen_down`·`pen_key_*` — `is_canvas_layer()` = `!is_mouse_part() && !is_pen_part()` = false, core assets.md §3.8) 제외. 판정은 `is_canvas_layer()` 그대로라, 핸들러가 슬롯을 명시 나열하지 않는 한 bridge 코드 변경 없음(`bridge/commands.rs:95` 불변)) |
| 3 | **호출 안 함**: 배율 외 설정 변경(v0.13 `mouse.penPos` 포함), 마우스 파츠·(v0.13) 펜 그림 등록·삭제, `set_overlay_position`·`set_overlay_visible`·`set_autostart`, 드래그 위치 저장. `resize_overlay`는 멱등이라 이 조건은 매니페스트 IO를 줄이는 최적화일 뿐이다(core window.md §11 D15) |
| 4 | **입력**: `canvas = manifest.canvas.map(\|c\| (c.width, c.height))`, `scale` = 설정 값(잠금 한 줄로 복사). 매니페스트는 `import_asset`·`remove_asset`이면 core가 돌려준 값, `set_settings`·앱 시작이면 `assets::load_manifest(assets_dir)` — 같은 흐름에서 손 기준점 재계산(§5.1-4)도 매니페스트를 읽으면 한 번만 읽어 함께 쓴다. **설정 `Mutex`를 쥔 채 호출하지 않는다** |
| 5 | **실패**: 매니페스트 읽기 실패(`set_settings`·앱 시작에서만 가능)는 `log::warn!` 후 **`canvas = null`(450×350 상자 기준)로 리사이즈를 계속**한다 — 앱 시작 0단계와 같은 처리(v0.5 확정). `resize_overlay`의 `Err(WindowError)`는 `log::warn!`만 남긴다. 어느 경우든 원래 command는 **성공**한다. 설정·이미지는 이미 저장됐으므로 실패로 돌려주면 ui가 저장 실패로 오해한다(core window.md §11 D16). 다음 배율 변경·재시작 때 다시 맞춘다 |
| 6 | **이벤트 순서**: **(v0.22, CR-047)** `set_settings`는 `settings::update`(검증·저장·메모리 대입 한 번) → `settings://changed` → 리사이즈(§5.3 2~4단계 — v0.21까지의 「저장 → 리사이즈 → 메모리 반영 → emit」에서 emit이 리사이즈보다 앞으로 옮겨졌다), 에셋 command는 core 처리 → 리사이즈 → `assets://changed`. 리사이즈는 위치를 바꾸지 않아(`SWP_NOMOVE`) `Moved`가 생기지 않으므로 드래그 위치 저장·추가 `settings://changed`도 없다. (v0.5) `set_settings`도 창을 옮기지 않으므로(§5.3) 같은 이유로 `Moved`가 생기지 않는다 |
| 7 | **스레드 전제**: §5.1-7과 같다(setup과 동기 command 안, Tauri 메인 스레드) |

**앱 시작 순서** (setup. 계약에 드러나는 부분만 — 정본 core window.md §4 「앱 시작 순서」)

| 단계 | 동작 | emit |
|---|---|---|
| 0 | 설정·매니페스트 로드(매니페스트 실패 → 경고, `canvas = null`) → `window::resize_overlay(canvas, settings.scale)`(실패 → 경고 후 계속) | 없음 |
| 1 | `window::restore_overlay_position` — 저장 위치 복원(모니터 밖이면 기본 위치) | 없음 |
| 2 | 복원 위치 ≠ 저장 위치이면 `window::persist_overlay_position`으로 보정 저장 | 없음(§4 — 창은 `get_settings`로 받는다) |
| 3 | `window::watch_overlay_moves` — 드래그 위치 저장 감시 시작 | 이후 드래그 저장 때 `settings://changed`(§4) |

- **리사이즈(0)가 위치 복원(1)보다 먼저**: 복원은 창의 실제 바깥 크기로 모니터 밖 여부를 판정한다. 리사이즈 전이면 `tauri.conf.json` 초기 크기 450×350으로 판정해 25%·200% 창의 가시 영역을 잘못 잰다.
- 0단계의 매니페스트는 손 기준점 캐시 초깃값 계산(§5.1-2 ①)에도 그대로 쓴다(한 번만 읽는다).

### 5.3 `set_settings` 처리 순서·위치 불간섭 (v0.5, OV-R-13 — 2026-09-23 사용자 신고. v0.22, CR-047로 저장 절차 갱신)

ui가 들고 있는 설정은 "어제 찍은 사진"이다. 배율 한 칸을 바꾸려고 사진을 통째로 돌려줘도, core는 사진 속 캐릭터 자리는 보지 않고 자기 메모장의 자리를 그대로 옮겨 적는다. 신고 증상(오버레이를 옮긴 뒤 Ctrl+휠 → 기본 자리로 튀며 확대·축소)은 `set_settings`가 사본의 낡은 `overlay.x/y`로 창을 옮기던 것이 원인이다. 정본은 core window.md §2.1.1·§9.3·§11 D17~D20이고, 이 절은 v0.3·v0.4 부수 효과(§5.1·§5.2)와 합친 **`set_settings`의 유일한 처리 순서**다.

- **위치를 바꾸는 경로(🔒 이것뿐)**: ① 사용자 드래그 ② 앱 시작 복원·화면 밖 보정(§5.2 앱 시작 순서 1·2단계) ③ `set_overlay_position` command ④ (v0.14, SV2-06) `reset_overlay_position` command(§5.6). `set_settings`·리사이즈·트레이는 창 위치를 바꾸지 않는다.
- **(v0.14) core 소유 필드**: `overlay.x`·`overlay.y`(v0.5)와 `autostart`(v0.14, SV2-05). `set_settings` 입력의 이 값들은 무시하고 core 현재값을 저장·반환·emit한다. 병합은 `window::keep_core_owned(input: Settings, current: &Settings) -> Settings`(core 결정, `window::keep_overlay_position`을 넓힌 것) 하나로 한다.
- **(v0.22, CR-047) 저장 단일 창구**: 병합·검증·저장·메모리 대입을 `settings::update(state, path, f)` 한 번으로 한다 — `f`는 설정 잠금을 쥔 채 사본을 고치는 클로저(이전 값 복사·`keep_core_owned` 병합만, 그 안에서 IO·emit·다른 잠금 금지). 저장이 성공한 뒤에만 메모리에 대입하므로 **저장 뒤 재병합 단계가 없다** — v0.21까지의 「2 위치 병합 → 3 저장 → 5 위치 재병합·메모리 반영」 3단계가 「2 `update`」 한 단계로 줄었다(settings.md §3.9). `set_autostart`(async, §5.5)가 `set_settings`의 `update` 도중에 끝나도, `update`는 설정 잠금 하나만 쥐므로 두 호출은 순서대로 직렬화되고 어느 쪽이 나중에 끝나든 메모리·파일이 그 값으로 일치한다(레이스 조건 해소 — CORE-001).

| # | 단계 | 실패 시 |
|---|---|---|
| 1 | 검증 `settings.validate()`(§3.3 규칙 — v0.14 새 규칙 없음. `language` 알 수 없는 값은 역직렬화 단계에서 `'ko'`) | `settings.invalid`. 아무것도 바뀌지 않음 |
| 2 | **(v0.22, CR-047)** `settings::update(&state, path, \|current\| { ... })` 한 번 — 클로저 안에서 이전 `scale`·이전 `(mouse.shoulder, mouse.partPos)`(v0.8. `mouse` 유무 포함, §5.1-2 ④ 비교용)·이전 `timer.enabled`(v0.21, 7단계용) 복사 → `*current = keep_core_owned(입력, current)`(`overlay.x/y`·`autostart`는 core 현재값, `overlay.visible`·`language`·`positionLock`·`showInTaskbar`·나머지는 입력값) → `update`가 잠금 안에서 검증·원자 저장·메모리 대입까지 끝낸다. 반환 `SaveOutcome { settings: fin, changed }` | `state.poisoned`(잠금 오염) · `settings.invalid`(update 내부 재검증 실패 — 이론상 1에서 이미 걸러짐) · `settings.io`(원자 저장 실패). 실패하면 메모리·파일 모두 이전 값(update 계약) |
| 3 | `settings://changed`(`fin`) emit — **창 적용보다 먼저**(§3.9.10 권고: 창 적용이 실패해도 ui가 저장된 값을 안다) | emit 실패 `tauri.error` |
| 4 | `window::apply_overlay_window(&fin)` — 표시/숨김 + 위치 잠금(`set_ignore_cursor_events`) + 작업표시줄(`set_skip_taskbar`), 멱등, **창 위치는 읽지도 옮기지도 않음** → 이전 `scale` ≠ `fin.scale`이면 리사이즈(§5.2, 설정 잠금 없이 호출). **(v0.14) 자동 실행 반영 없음**(자동 실행은 `set_autostart`만) | 창 속성 적용 실패(`window.not_found`·`tauri.error`)는 **명령 실패** — 그러나 (v0.22) 설정은 이미 2단계에서 저장·메모리 반영이 끝났다(v0.21까지는 「메모리는 옛 값」이었으나 CR-047로 달라짐). 리사이즈 실패는 경고 로그 후 계속(§5.2-5) |
| 5 | 어깨 변경·파츠 위치 변경(v0.8)·`mouse` 켜짐/꺼짐이면 손 기준점 재계산(§5.1, 설정 잠금 없이), 값이 바뀌었으면 `assets://hand-anchor-changed` | 재계산 실패는 경고 로그(§5.1-5) |
| 6 | (v0.21, CR-045 · PT-04 → **v0.23, CR-048 교체** · TM-01 · TM-04 · TM-11) **타이머 부수 효과**(이력·패킷에서는 「7단계」로 부른다) — (v0.23) 2단계 클로저에서 이전 `timer` **전체**를 복사해 둔다(`old_timer = current.timer.clone()` — v0.21의 `timer.enabled`만 복사를 넓힘). 저장 성공 뒤: a. 타이머 잠금 b. `old_timer.enabled && !fin.timer.enabled`이면 core `Timer::disable(now)` → `changed \|=` c. core `Timer::configure(TimerConfig::from_settings(&fin.timer), now)` → `changed \|=`(모드 전환 = 새 모드 대기, 대기 중 시작 시간 변경 = 새 시작 시간, 흐르는 중·끝남이면 다음 대기부터 — §5.8. 순서 `disable` → `configure` 고정) d. `changed`면 snapshot 복사 e. 잠금 해제 f. `changed`면 `crate::publish_timer_change(app, &snap)`(emit → 트레이 → 깨움 — 3단계 `settings://changed`·5단계 손 기준점 이벤트 **뒤**), 아니면 `tray::sync_timer_menu(app)`만(켜기·끄기는 스냅숏이 그대로여도 트레이 메뉴 보기가 바뀐다 — 보기가 같으면 no-op). 설정 잠금과 타이머 잠금을 동시에 쥐지 않는다. 켜기(false→true)는 타이머 상태를 바꾸지 않는다(U-2 — 같은 저장에서 모드·시작 시간이 바뀐 경우만 `configure`가 반영). 판정은 tauri 없는 비공개 함수 `do_timer_config_side_effect(timer, before: &TimerSettings, after: &TimerSettings, now) -> Option<TimerSnapshot>`(패킷 §3.1 — v0.21 `apply_timer_side_effect(…, before_enabled, after_enabled)` 대체, 기존 테스트 3개의 판정을 이 함수로 이전) → `Ok(fin)` 반환 | 잠금 오염·emit 실패는 경고 로그, command는 **성공**(설정은 이미 저장·반영됨) |

- **(v0.22) 왜 재병합이 필요 없어졌나(CORE-001)**: v0.21까지는 「2 잠금 병합 → 3 잠금 밖 저장 → 5 잠금 재병합·메모리 대입」 3단계였다 — 3에서 잠금을 놓는 순간부터 5에서 다시 잡을 때까지 다른 스레드(드래그 저장·`set_autostart`)가 끼어들면 파일=나중에 저장한 값, 메모리=나중에 대입한 값이 서로 어긋날 수 있었다(그래서 5의 재병합이 필요했다). CR-047의 `update`는 검증·저장·메모리 대입을 **잠금 하나 안에서** 끝내므로 그 창이 없다 — 재병합 단계 자체가 불필요해졌다(settings.md §3.9.1 CORE-001).
- **드래그 후 500ms 안의 Ctrl+휠**: 창은 제자리다. `update`가 잠금을 쥔 순간의 메모리 값을 기준으로 병합하므로, 드래그 디바운스 저장(`persist_overlay_position`)이 `set_settings`의 `update`보다 먼저 끝나면 그 위치가 반영되고, 나중에 끝나면 그 결과가 이긴다 — 어느 쪽이든 최종적으로 메모리=파일이 일치한다(레이스는 남지만 불일치는 없다).
- **반환·emit 값**: `overlay.x/y` = core 현재값(`fin`). ui 사본의 낡은 x/y는 반환값·`settings://changed`로 자연히 교정되므로 ui가 위치를 동기화할 필요가 없다. 창이 움직이지 않으므로 `Moved`·추가 드래그 저장 emit도 없다(§5.2-6).
- **스레드 전제**: §5.1-7과 같다. `update`는 동기 호출이라 스레드 모델은 바뀌지 않는다(settings.md §3.9.7 — 잠금 안 파일 쓰기는 수 ms, 훅 스레드는 설정 잠금을 잡지 않는다).
- **확인 필요(v0.5 표기, v0.14에서 해소)**: §6 에러 코드 열은 D-3로 실물 code(`state.poisoned`·`window.not_found`·`tauri.error`)를 쓴다 — 위 표·§5 표가 정본.

- (v0.14) 위 「확인 필요(현행 불일치)」는 **해소** — D-3로 §5 에러 코드 열을 실물 code로 고쳤다(`set_settings` = `settings.invalid`·`settings.io`·`window.not_found`·`tauri.error`·`state.poisoned`. `autostart.error`는 v0.14에서 발생 경로 삭제). `src/settings/design.md` bridge 사용 표의 표기 정정은 ui 몫.
- (v0.14 구현 메모, BRG-007) `set_settings` 본문(현행 약 58줄)을 단계별 비공개 함수로 나눠 50줄 이하로 — 동작·순서 불변.

### 5.4 TS 전용 래퍼 — 플러그인·창 API (v0.14 명문화, SV2-02 · SV2-07)

command가 아니라 `src/bridge/commands.ts`가 Tauri 플러그인·창 API를 직접 감싼 함수다. 화면 코드는 `@tauri-apps/plugin-*`·`@tauri-apps/api/*`를 import하지 않고 이 래퍼만 쓴다(`src/main.tsx`의 기존 예외는 이번 범위 밖 — BRG-004). Rust 핸들러·`invoke_handler` 등록 없음.

| 래퍼 | 인자 | 반환 | 실패 | 감싸는 API · 권한(§7) | 요구ID |
|---|---|---|---|---|---|
| `pickPngFile` | `title?: string` — (v0.14) 선택 인자 **추가**. 생략하면 현행 제목 `'PNG 이미지 선택'` | `Promise<string \| null>` — 고른 파일 절대 경로, 취소면 `null` | reject → `toBridgeError`로 정규화(`unknown`, §6). (v0.14) 현행 구현은 정규화 없이 원래 오류를 던진다 — 같이 맞춘다 | `@tauri-apps/plugin-dialog` `open({ multiple: false, directory: false, title, filters: [{ name: 'PNG', extensions: ['png'] }] })` · `dialog:allow-open` | SV2-02(제목 번역), SV2-07(「이미지 변경」) |
| `setSettingsWindowTitle` | `title: string` | `Promise<void>` | reject → `toBridgeError`(`unknown`) | `@tauri-apps/api/window` `getCurrentWindow().setTitle(title)` · `core:window:allow-set-title`(**settings 창 한정**, 🔒 D-6) — **설정 창에서만 부른다**(오버레이 창에는 권한이 없어 reject) | SV2-02(설정 창 제목 표시줄 번역) |
| `pickFolder` | `title?: string` — 생략하면 제목 `'폴더 선택'` | `Promise<string \| null>` — 고른 폴더 절대 경로, 취소면 `null`. 플러그인이 배열을 돌려주면 첫 요소(`pickPngFile`과 같은 방어 처리) | reject → `toBridgeError`로 정규화(`unknown`, §6) | `@tauri-apps/plugin-dialog` `open({ directory: true, multiple: false, title })` · **기존 `dialog:allow-open`**(settings 창 — plugin-dialog 2.7.3 acl `commands.allow ["open"]`이 `directory: true`까지 허용, bridge-survey Q5). 권한 추가 없음 | DA-05(v0.16 신규 — 기본 이미지 다운로드 폴더 선택. 결과는 `exportDefaultAssets(dir, …)`에 그대로 넘긴다) |
| `pickAudioFile` | `title?: string` — 생략하면 제목 `'소리 파일 선택'` | `Promise<string \| null>` — 고른 파일 절대 경로, 취소면 `null`. 플러그인이 배열을 돌려주면 첫 요소(`pickFolder`와 같은 방어 처리) | reject → `toBridgeError`로 정규화(`unknown`, §6) | `@tauri-apps/plugin-dialog` `open({ multiple: false, directory: false, title, filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg'] }] })` · **기존 `dialog:allow-open`**(settings 창). 권한 추가 없음. 필터는 고르기 편의일 뿐 — 형식 판정은 core(앞 바이트, §5.9-2). 테스트(bridge-implementer): `pickAudioFile('t')` → `open` 인자(필터·`title: 't'`) 1회, `pickAudioFile()` → `title: '소리 파일 선택'`, 취소 → `null`, 배열 → 첫 요소, reject → `{ code: 'unknown', message }` | TM-08(v0.23 신규 — 알림음 파일 선택. 결과는 `importAlarmSound(path)`에 그대로 넘긴다) |

- (v0.16) `pickFolder` 테스트(bridge-implementer): `pickFolder('t')` → `open({ directory: true, multiple: false, title: 't' })` 1회, 취소(`null`) → `null`, 배열 반환 → 첫 요소, reject → `{ code: 'unknown', message }`.
- `title`은 TS 함수의 선택 인자다(IPC 페이로드가 아니므로 §2 「없음 = `null`」 규칙 대상 아님). 빈 문자열도 그대로 넘긴다(검증 없음 — 문구는 ui 사전 몫).
- 테스트(bridge-implementer): `pickPngFile('X')` → `open` 인자 `title: 'X'`, `pickPngFile()` → `title: 'PNG 이미지 선택'`, 취소 → `null`, reject → `{ code: 'unknown', message }`. `setSettingsWindowTitle('설정')` → `setTitle('설정')` 1회, reject → `BridgeError` 형태.

### 5.5 `set_autostart` — 작업 스케줄러·async (v0.14, SV2-05. v0.22, CR-047로 승격 제거)

~~지금까지는 현관 메모(레지스트리 Run)에 적어 두면 로그인 때 일반 권한으로 켜졌다. 이제는 관리실 일정표(작업 스케줄러)에 「로그인하면 관리자 권한으로 켜기」를 올린다. 일정표를 고치는 일 자체가 관리자 일이라 토글할 때마다 Windows 권한 확인 창(UAC)이 뜨고 사용자가 누를 때까지 기다린다.~~ **(v0.22 정정)** 관리실 일정표(작업 스케줄러)에 적어 두는 것은 같지만, 이번엔 「평소 권한으로 켜기」를 올린다. 평소 권한 항목은 본인이 직접 올리고 내릴 수 있어 관리실 허락(UAC)이 필요 없다 — 그래도 일정표를 고치는 일은 자식 프로그램(`schtasks.exe`)을 실행해 끝날 때까지 기다려야 하므로, 앱이 멈추면 안 되니 기다리는 일은 별도 스레드가 한다.

| # | 단계 | 실패 시 |
|---|---|---|
| 1 | `async fn` 핸들러. `tauri::async_runtime::spawn_blocking`(또는 동등)으로 core `tray::autostart::set_enabled(enabled) -> Result<bool, AutostartError>`를 별도 스레드에서 호출(블로킹 — **일반 권한, 승격 없음**, 자식 프로세스 종료만 기다린다). 해제 요청인데 작업이 이미 없으면 `schtasks` 호출 없이 `Ok(false)`(core 몫) | `AutostartError` → §6.1: 실패 `autostart.error`, 임시 작업 XML 파일 `io.error`(**`Cancelled`·`autostart.cancelled`는 v0.22부터 없다** — 승격 경로 자체가 삭제됨). 스레드 합류 실패 `tauri.error`. **설정 불변, emit 없음** |
| 2 | **(v0.22, CR-047)** core `autostart::persist_autostart(&state.settings, path, actual) -> Result<Option<Settings>, AutostartError>` — 내부가 `settings::update`(잠금 안에서 `autostart` 대입·검증·원자 저장·메모리 대입 한 번, tray.md §3.5.3) | `AutostartError::Settings(e)` → `e.code()`(잠금 오염 `state.poisoned`, 검증 실패는 사실상 발생 안 함 — bool 필드) |
| 3 | `Some(saved)`(바뀜)이면 `settings://changed`(`saved`) emit → `Ok(반환값)` (`None`이면 emit 없이 바로 반환) | `tauri.error` |

- **(v0.22) 저장 뒤 재병합 단계는 없다** — v0.21까지의 「2 잠금 대입·복제 → 3 잠금 밖 `settings::save`」 2단계가 `persist_autostart` 한 번(update)으로 줄었다. **소요 시간**: **보통 1초 안팎**(자식 프로세스 실행·종료만 기다린다 — UAC 대기 없음). bridge 제한 시간 없음. 그 동안 Tauri 메인 스레드·다른 command·입력 이벤트는 막히지 않는다(async + 별도 스레드).
- **동시 호출**: bridge는 직렬화하지 않는다. 응답 전 재호출은 ui가 막는다(02-design §2.2 `autostartPending` — 이름은 승격 대기 시절 그대로지만 지금은 자식 프로세스 대기용으로 읽는다).
- **스레드 전제(§5.1-7 예외)**: `set_autostart`는 async라 Tauri 메인 스레드 밖에서 끝난다. 손 기준점 캐시·창 리사이즈를 건드리지 않으므로 §5.1-7·§5.2-7 전제와 충돌하지 않는다. `set_settings`와 겹치면 두 호출 모두 `settings::update`(설정 잠금 하나)를 거치므로 직렬화되어 메모리·파일이 항상 일치한다(§5.3 「저장 단일 창구」 — v0.21까지의 「5단계 재병합이 지킨다」 설명은 CR-047로 대체).
- **반환 = 실제 상태**: core가 등록·해제 뒤 조회한 값(조회 불가면 요청 값). 요청과 다를 수 있다.
- **권한 범위(🔒 D-5, v0.22 정정)**: 자동 실행·수동 실행 모두 **일반 권한**(승격 없음). 관리자 권한으로 실행된 게임 안 입력은 못 받는다(UIPI) — 필요하면 사용자가 exe를 직접 관리자로 실행한다(설명 문구는 ui 몫). ~~v0.14~v0.21: 자동 실행만 관리자 권한.~~
- **(v0.22) 옛 관리자 작업 보정**: 시작 시 1회(`lib.rs spawn_autostart_sync` → core `reconcile()`) 옛 버전이 등록한 관리자 권한(`HighestAvailable`) 작업을 발견하면 일반 권한으로 다시 등록한다 — bridge 표면 변화 없음(같은 `settings://changed` 발신 지점, §4). 실패하면 로그만(README 안내, tray.md §3.5.4).
- **옛 방식 제거(🔒 D-4)**: `tauri-plugin-autostart` 호출(`commands.rs` `apply_autostart`·`ManagerExt`)·`From<tauri_plugin_autostart::Error>` 삭제는 bridge-implementer, `lib.rs` 플러그인 초기화 삭제는 core, `Cargo.toml`·`package.json`·capabilities는 메인 세션. 남은 레지스트리 Run 값 정리 코드는 넣지 않는다(core 패킷 §3.1).
- 래퍼 불변: `setAutostart(enabled: boolean): Promise<boolean>`.

### 5.6 `reset_overlay_position` — 위치 초기화 (v0.14 신규, SV2-06)

| 항목 | 값 |
|---|---|
| 인자 | 없음 |
| 반환 | `Position`(§3.4) — 옮긴 뒤 창 좌상단(물리 px). Rust `Result<window::Point, BridgeError>`. JSON `{ "x": 100, "y": 100 }` |
| 에러 | `window.not_found`, `tauri.error`, `state.poisoned`, `settings.io` |
| core | `window::reset_overlay_position(app: &AppHandle, state: &AppState) -> Result<Settings, WindowError>`(core 패킷 §2 — 기본 위치 `window::default_overlay_position()` = (100, 100) = `Settings::default().overlay`로 이동 + 저장, 옮긴 뒤 설정 반환. 드래그 저장 디바운스와 겹쳐도 최종 위치는 기본 위치). 이름·시그니처는 core 완료 보고의 실제 값을 따른다 |
| 순서 | core 호출 → `settings://changed`(반환 설정) emit → `Ok(Position { x: s.overlay.x, y: s.overlay.y })`. 이미 기본 위치여도 emit 1회(멱등) |
| 부수 효과 | 창 이동·`overlay.x/y` 저장·`settings://changed`. 숨김이어도 옮기고 `visible`은 그대로. 위치 잠금 중에도 동작. 창 리사이즈·손 기준점 재계산 없음(§5.1-3). 뒤따르는 드래그 저장 감시는 저장된 위치와 같아 추가 emit 없음(§4) |
| 래퍼 | `resetOverlayPosition(): Promise<Position>` → `invoke('reset_overlay_position')` |

- 판정: 신규 command. ui가 기존 `set_overlay_position(100, 100)`을 부르게 하면 기본 위치가 ui에 복제된다(단일 출처는 core `default_overlay_position`).
- 권한: 앱 command(`invoke_handler` 등록만으로 허용 — §7). `lib.rs` `invoke_handler` 등록이 필요하다.

### 5.7 기본 이미지 복원·내보내기 (v0.16 신규, CR-035 — DA-03 · DA-05)

견본 사진첩(앱에 내장된 기본 그림 15장)이 생겼다. 「복원」은 사진첩에서 한 장을 꺼내 액자(슬롯)에 다시 끼우는 일이고, 「내보내기」는 사진첩 원판을 사용자가 고른 서랍(폴더)에 복사해 주는 일이다 — 서랍에 같은 이름이 있으면 먼저 넣지 않고 「덮어쓸까요?」를 묻게 한다.

| 항목 | `restore_default_asset` | `export_default_assets` |
|---|---|---|
| 인자 | `slot: AssetSlot` | `dir: string`(절대 경로), `overwrite: boolean` — Tauri 인자 키 = Rust 이름 그대로(`slot`·`dir`·`overwrite`, 한 단어라 camelCase 변환 영향 없음) |
| 반환 | `AssetManifest`(§3.2 — 복원 뒤 전체) | `ExportReport`(§3.2.1) |
| 에러(§6.2) | `asset.no_default`, 검증 5종(`asset.not_png`·`asset.bad_header`·`asset.not_rgba`·`asset.too_large`·`asset.too_many_bytes` — 내장 그림은 통과하도록 core 테스트가 고정, 표기만), `asset.canvas_mismatch`(다른 캔버스 레이어·마우스 파츠·펜 그림과 크기가 다를 때 — 기존 그룹 규칙 그대로, 새 예외 없음), `asset.io`, `asset.manifest`, `tauri.error`(emit), `state.poisoned` | `asset.export_dir`(절대 경로 아님·없음·폴더 아님). 파일별 쓰기 실패는 `Err`가 아니라 `failed[].code = 'asset.io'`. 핸들러가 앱 상태를 쓰지 않으므로 `state.poisoned` 없음 |
| core | `assets::defaults::restore_default(assets_dir: &Path, slot: AssetSlot) -> Result<AssetManifest, AssetError>` — 내장 없음 `NoDefault(file_key)`, 있으면 `assets::import_bytes`(기존 `import`와 같은 순서: 검증 → 쓰기 → 교체 → 캔버스 재계산 → 저장) | `assets::export::export_defaults(dest_dir: &Path, overwrite: bool) -> Result<ExportReport, AssetError>` — 임시 파일에 쓰고 `rename`(파일 단위 원자 교체), 파일명은 내장 표에서만 만든다(사용자 입력 파일명 없음) |
| 순서 | core 호출 → 캔버스 레이어면 리사이즈(§5.2) → `assets://changed` emit → `mouse_base`면 손 기준점 재계산(§5.1-2 ⑤) → 값이 바뀌었으면 `assets://hand-anchor-changed` → `Ok(manifest)` | core 호출 → `Ok(report)`. emit 없음 |
| 부수 효과 | 슬롯 파일 교체·manifest.json 저장·리사이즈·`assets://changed`·(조건부) `assets://hand-anchor-changed` — **`import_asset`과 같다** | 사용자 폴더에 PNG 최대 15개 쓰기(임시 파일 `.{name}.kuro-tmp`는 실패 시 best-effort 삭제). 매니페스트·앱 데이터 폴더·설정·이벤트 무관 |
| 래퍼(`src/bridge/commands.ts`) | `restoreDefaultAsset(slot: AssetSlot): Promise<AssetManifest>` → `invoke('restore_default_asset', { slot })` | `exportDefaultAssets(dir: string, overwrite: boolean): Promise<ExportReport>` → `invoke('export_default_assets', { dir, overwrite })` |
| Rust 핸들러(`src-tauri/src/bridge/commands.rs`) | 동기 `#[tauri::command] pub fn restore_default_asset(app: AppHandle, state: State<'_, AppState>, slot: AssetSlot) -> Result<AssetManifest, BridgeError>` — 패턴은 `remove_asset`과 같다. 후처리가 `import_asset`·`remove_asset`과 겹치면 비공개 `after_asset_change(app, state, &slot, &manifest)`로 묶는다(3곳 공유, 핸들러 30줄 이하) | 동기 `#[tauri::command] pub fn export_default_assets(dir: String, overwrite: bool) -> Result<ExportReport, BridgeError>` = `export_defaults(Path::new(&dir), overwrite)` + `?`(변환은 `From<AssetError>` 한 곳) |
| 등록 | `src-tauri/src/lib.rs` `generate_handler!`에 2줄 — `lib.rs`는 core 소관. bridge-implementer가 가드에 막히면 우회하지 않고 「core 변경 요구: `bridge::commands::restore_default_asset`·`bridge::commands::export_default_assets` 등록」으로 보고(v0.9·v0.14 전례) | 같음 |

- **판정**: 둘 다 **신규 command** — 같은 자원(에셋)의 새 동작이다. 복원을 `import_asset`에 「경로 없음 = 기본」 인자로 얹으면 한 command가 두 가지 일(외부 파일 가져오기·내장 복원)을 하고 `path`의 뜻이 바뀐다. `remove_asset`에 얹으면 「비우기」 의미가 바뀐다(파괴). 내보내기는 앱 데이터가 아니라 사용자 폴더에 쓰는 새 동작이다.
- **왜 `dir`만 받고 파일명은 받지 않나**: 쓰는 이름을 내장 표 15개로 고정해 임의 경로 쓰기를 막는다(`fs` 권한 없이 Rust만 파일에 닿는 원칙, §7). `dir`는 절대 경로만 받는다 — 상대 경로는 실행 위치에 따라 뜻이 달라지므로 `asset.export_dir`.
- **message에 경로 없음**: `asset.no_default`는 슬롯 키만, `asset.export_dir`는 고정 문구(§6). `failed`에도 파일명만 싣는다.
- **스레드 전제**: 두 command 모두 동기(Tauri 메인 스레드) — §5.1-7 그대로. 내보내기는 15장 × 최대 1MB 쓰기라 메인 스레드를 잠시 막는다(확인 필요 — 체감 지연이 있으면 async + `spawn_blocking`으로 바꾸는 것은 비파괴. 상태·캐시를 건드리지 않아 §5.5와 같은 전환이 안전하다).
- **테스트(bridge-implementer)**: vitest — `restoreDefaultAsset(slot)` → `invoke('restore_default_asset', { slot })`, `exportDefaultAssets('C:\\x', true)` → `invoke('export_default_assets', { dir: 'C:\\x', overwrite: true })`, reject → `BridgeError` 형태 그대로. cargo — `ExportReport` JSON 키 = `written`·`conflicts`·`failed`, `ExportFailure` = `fileName`·`code`(§3.2.1 예시), 핸들러 본문을 tauri 없는 순수 함수로 분리해 `asset.no_default`(예: `mouse_left`)·`asset.export_dir`(없는 경로·상대 경로) 에러 경로 1건씩.

### 5.8 뽀모도 타이머 규칙 (v0.21 신규, CR-045 — PT-03 · PT-05 · PT-06 · PT-09)

부엌 타이머 하나를 두 방(오버레이·설정 창)이 함께 본다. 타이머 본체(core)는 버튼이 눌리거나 멈출 때만 "지금 이렇다"고 외치고, 각 방은 들은 순간부터 제 시계로 초를 센다.

**전이표 — 스톱워치** (`mode == 'stopwatch'`. v0.21과 같다. 정본 core `Timer` — pomodoro 02-design §3.1·core timer.md §3.2)

| 현재 \ 입력 | `start` | `pause` | `stop` | `resting=true` | `resting=false` | `disable`(설정 끔) |
|---|---|---|---|---|---|---|
| `stopped` | `running`(0부터) | — | — | — | — | — |
| `running` | — | `paused` | `stopped`(0) | **`restPaused`** | — | `paused` |
| `paused` | `running` | — | `stopped`(0) | — | — | — |
| `restPaused` | `running` | `paused` | `stopped`(0) | — | **`running`** | `paused` |

**전이표 — 카운트다운** (v0.23, CR-048 · TM-05 · TM-06 — `mode == 'countdown'`. 정본 core timer.md §3.5.1 = timer-mode 02-design §3.2. 「D」 = 이번 회차 시작 시간 `durationMs`)

| 현재 \ 입력 | `start` | `pause` | `stop` | `resting=±` | `disable`(설정 끔) | 마감 도달(core 마감 스레드) | 끝남 10초 만료(core 마감 스레드) |
|---|---|---|---|---|---|---|---|
| `stopped` | `running`(남은 = D) | — | — | — | — | — | — |
| `running` | — | `paused` | `stopped`(D) | — | `paused`(남은 유지) | **`finished`** | — |
| `paused` | `running`(이어서) | — | `stopped`(D) | — | — | — | — |
| `finished` | **`running`**(새 회차 — D = 설정의 시작 시간, D-7) | — | `stopped`(D) | — | **`stopped`**(D) | — | **`stopped`**(D) |

**설정 변경 — `configure`** (v0.23 — `set_settings` §5.3 6단계가 core `Timer::configure`를 부른다, core timer.md §3.5.3)
- **모드가 바뀌면** 어느 상태에서든 새 모드의 `stopped`로 초기화한다(스톱워치 0, 카운트다운 D — 이전 모드 값은 버린다, D-4).
- 모드는 같고 **시작 시간만 바뀌면**: 카운트다운 `stopped`면 곧바로 새 D로 대기(스냅숏 바뀜 → emit), `running`·`paused`·`finished`면 **다음 대기부터**(ui는 흐르는 동안 입력을 잠근다 — D-5, core 규칙은 안전망). 스톱워치에서 시작 시간만 바뀌면 변화 없음.
- `enabled` 끔은 `disable`이 먼저, 그다음 `configure`(순서 고정).

- `—` = 변화 없음(에러 아님, emit 없음, 현재 snapshot 반환).
- `start`·`pause`·`stop`은 전이표보다 먼저 `timer.enabled`를 본다 — `false`면 어떤 action이든 `timer.disabled`, 상태 불변(두 모드 공통).
- 불변식: `enabled == false` ⇒ `stopped` 또는 `paused`((v0.23) `finished` 중 끄면 `stopped`). 그래서 끈 동안 `set_resting`은 효과가 없다(에러도 아님).
- 켜기(false→true)는 상태 불변 — 다시 흐르려면 「시작」(U-2). 앱 시작 = `stopped`(스톱워치 0, (v0.23) 카운트다운은 설정의 시작 시간 대기 — core `Timer::with_config`), `enabled`가 true로 저장돼 있어도 자동 시작 없음(U-3). 경과·남은 시간은 저장하지 않는다(PT-09).
- 경과는 core `Instant`(단조 시계) 기준 — 시스템 시각 변경과 무관. 쉬는중 진입 전 무입력 대기 시간(기본 5분)은 경과에 포함(U-4, 스톱워치). (v0.23) 끝남 10초는 **감지 시각부터** 잰다(A-2) — 절전 복귀 뒤 한참 지나 감지해도 `finished`를 거친다.

| # | 규칙 |
|---|---|
| 1 | **(v0.23 교체) emit은 상태가 바뀔 때만, 깔때기 하나로**: 타이머를 바꾸는 모든 경로 — `control_timer`·`set_resting`·`set_settings` 6단계(bridge), 트레이 메뉴·마감 스레드(core) — 는 core가 「바뀜」(`true`)을 돌려줬을 때만 core `crate::publish_timer_change(app, &snap)`(`pub(crate)`, `src-tauri/src/lib.rs`)을 부른다: ① `timer://changed` emit ② `tray::sync_timer_menu` ③ 마감 스레드 깨움. **bridge에는 `events::emit_timer_changed`를 직접 부르는 곳이 남으면 안 된다**(`src-tauri/src/bridge`에서 `emit_timer_changed(` grep = `events.rs` 정의 1건 외 0건). **core 마감 시각 스레드 1개**(`timer/driver.rs`, 스레드 이름 `timer-deadline`)가 카운트다운 0 도달과 끝남 10초 만료를 판정한다 — 다음 마감까지 자고(없으면 무기한), 주기 깨움·주기 emit은 없다. bridge에는 스레드를 만들지 않는다. ~~v0.21: bridge·core에 타이머 스레드를 만들지 않는다~~ |
| 2 | **ui 표시 계산**(ui 몫 — `src/components/utils/timerClock.ts`, 계약은 식만 고정): `elapsedNow(snapshot, receivedAt, now) = snapshot.elapsedMs + (snapshot.status === 'running' ? max(0, now − receivedAt) : 0)`, `receivedAt`·`now` = `performance.now()`. 표시 `HH:MM:SS`(02-design §3.3). 래퍼에는 계산을 넣지 않는다(bridge-design-strategy §11) |
| 3 | **구독 순서**: 창은 `onTimerChanged` 구독 **먼저** → `getTimer()`(§3.6·`settings://changed`와 같은 규칙). 앱 시작 때는 emit하지 않는다 |
| 4 | **반환값 = 이벤트 값**: `control_timer`·`set_resting`의 반환 snapshot은 같은 호출이 emit한 `timer://changed` 페이로드와 같은 값이다(바뀌지 않았으면 emit 없이 현재값만 반환). ui는 화면 갱신 경로를 이벤트와 첫 `getTimer` 하나로 둔다(02-design §3.3) |
| 5 | **쉬는중 판정 주체 = 오버레이 상태기계**(`src/state/inputMachine.ts`, 변경 없음). 오버레이가 `layer` 변화 때 `setResting(true/false)`, 마운트 때 한 번 `setResting(false)`를 부른다(재로드 후 남은 `restPaused` 해제 — core에서 멱등). core는 입력·무입력 시간으로 판정하지 않는다. **(v0.23) 카운트다운이면 core `set_resting`이 항상 변화 없음**(쉬는중에도 계속 줄어든다) — 오버레이는 모드를 보지 않고 그대로 부른다(판정 한 곳 = core) |
| 6 | **잠금**: `AppState.timer: Mutex<Timer>`. 설정 잠금과 타이머 잠금을 동시에 쥐지 않는다(`control_timer`는 `enabled` 복사 후 설정 잠금 해제 → 타이머 잠금, `set_settings` 7단계도 같다). emit은 잠금을 푼 뒤. 잠금 독은 `state.poisoned`(`set_settings` 7단계에서는 경고 로그) |
| 7 | **스레드 전제**: 타이머 command 셋과 (v0.23) 알림음 command 셋 모두 동기(Tauri 메인 스레드) — §5.1-7과 같다. (v0.23) 마감 스레드(core)는 콜백 안에서 타이머 잠금만 잡고 풀며 publish는 잠금 밖 — bridge command와 잠금 순서 충돌 없음(설정 잠금을 잡지 않는다) |
| 8 | **core 의존**(v0.23 정본 `doc/200_설계/core/timer.md` §2.3·§3.7·§3.9 — 실물 확인 2026-09-26, 차이 없음): `crate::timer::{Timer, TimerStatus, TimerAction, TimerSnapshot, TimerError, TimerConfig}` — `Timer::snapshot(&self, now: Instant) -> TimerSnapshot`, `Timer::apply(&mut self, action: TimerAction, enabled: bool, now: Instant) -> Result<bool, TimerError>`, `Timer::set_resting(&mut self, resting: bool, now: Instant) -> bool`, `Timer::disable(&mut self, now: Instant) -> bool`, (v0.23) `Timer::configure(&mut self, cfg: TimerConfig, now: Instant) -> bool`, `TimerConfig::from_settings(t: &TimerSettings) -> TimerConfig`, `crate::settings::timer::{TimerMode, TimerSettings}`, 깔때기 `crate::publish_timer_change(app: &tauri::AppHandle, snap: &TimerSnapshot)`(`pub(crate)`, 실패하지 않음 — 내부 경고 로그), `crate::tray::sync_timer_menu(app: &AppHandle)`. `bool` = 바뀜 여부. `Timer::tick`·`next_wake`·`timer::driver`는 core 내부(lib.rs 조립) — bridge가 부르지 않는다 |

- **Rust 이벤트**: `events.rs` 상수 `TIMER_CHANGED = "timer://changed"`, `emit_timer_changed(app, &TimerSnapshot)`. 상수는 `events.rs`·`events.ts` 한 곳씩에만. (v0.23) `emit_timer_changed`의 호출자는 core 깔때기 `publish_timer_change` 하나뿐이다(규칙 1).
- **(v0.23) 테스트(bridge-implementer, 패킷 §7)**: cargo — `control_timer_countdown_start_changes`, `set_resting_countdown_noop`, `set_settings_mode_switch_resets_timer`, `set_settings_duration_change_updates_stopped_countdown`, `set_settings_duration_change_running_no_snapshot_change`, 기존 `set_settings_*` 3개(판정을 `do_timer_config_side_effect`로 이전), `timer_snapshot_json_shape`(4필드), `timer_settings_json_roundtrip`(새 필드). vitest — `DEFAULT_TIMER_SETTINGS` 새 필드 값, `TIMER_COUNTDOWN_SECS_MIN/MAX`·`TIMER_ALARM_VOLUME_MAX` 값. grep — 위 규칙 1.
- **TS 래퍼**(`src/bridge/`): `getTimer()` → `invoke('get_timer')`, `controlTimer(action)` → `invoke('control_timer', { action })`, `setResting(resting)` → `invoke('set_resting', { resting })`, `onTimerChanged(handler)` → `EVENTS.timerChanged` 구독(기존 `Subscriber<T>` 패턴). 에러는 삼키지 않는다.
- **테스트(bridge-implementer, 패킷 §5)**: cargo — `control_timer_rejects_when_disabled`(code `timer.disabled`, emit 없음)·`control_timer_start_emits_changed_once`·`control_timer_noop_does_not_emit`·`set_resting_true_pauses_running_and_emits`·`set_resting_noop_when_stopped`·`set_settings_disable_pauses_running_timer_and_emits_after_settings_changed`(순서 단언)·`set_settings_enable_does_not_change_timer`·`get_timer_initial_is_stopped_zero`·`timer_snapshot_json_shape`·`timer_action_json`·`settings_timer_json_roundtrip`. vitest — 세 래퍼의 invoke 이름·인자, reject → `BridgeError` 그대로, `onTimerChanged` 구독·해제.

### 5.9 알림음 규칙 (v0.23 신규, CR-048 — TM-07 · TM-08 · TM-09 · TM-13)

벨소리 칸은 하나뿐이다. 새 봉투를 넣으면 옛 봉투는 버리고, 비우면 앱에 내장된 기본 벨소리로 돌아간다. 칸을 바꿨다고 방송(이벤트)하지 않는다 — 울릴 차례가 된 쪽이 그때 칸을 열어 본다.

| # | 규칙 |
|---|---|
| 1 | **이벤트 없음(A-1)**: 알림음 등록·삭제는 이벤트를 보내지 않는다(`alarm://…` 도메인 없음). 오버레이는 `timer://changed`에서 `finished` 진입(`prev.status !== 'finished' && next.status === 'finished'`)을 볼 때 `getAlarmSound()`를 불러 그 순간의 값을 쓴다(첫 `getTimer`가 이미 `finished`면 울리지 않음 — ui 몫). 설정 창은 마운트 때 조회, 등록·삭제 뒤에는 반환값(삭제면 `null`)으로 갱신 |
| 2 | **저장 규칙**(core `assets::sound`, assets.md §3.15): 저장 이름 `assets/alarm.{wav\|mp3\|ogg}` 고정 — 사용자 파일명·확장자 불사용. 크기 1MiB(1,048,576바이트) 초과 → **읽기 전** `sound.too_many_bytes`(형식 검사보다 먼저). 형식은 앞 바이트(wav `RIFF…WAVE`, ogg `OggS`, mp3 `ID3` 또는 Layer III 프레임 동기 — AAC ADTS 제외)로 판별, 아니면 `sound.not_audio`. 원자 저장(임시 파일 → rename) 뒤 다른 두 형식 파일 삭제(삭제 실패는 경고 — `current`가 최신 수정 시각을 고른다). 디코딩 가능 여부는 보지 않는다(재생 실패 → ui가 기본음으로 1회 대체, A-4) |
| 3 | **Rust 핸들러**(bridge-implementer): 세 command 모두 동기 `#[tauri::command]`, `State<'_, AppState>`의 `paths.assets_dir`만 쓴다(설정·타이머 잠금 없음, `AppHandle` 불필요). 본문은 core 호출 + `?` — 변환은 `From<SoundError> for BridgeError` 한 곳(§6.1). tauri 없는 순수 함수로 분리해 테스트(이름 재량) |
| 4 | **재생·기본음·음량은 ui 몫**: 오버레이 webview `HTMLAudioElement`(`volume = timer.alarmVolume / 100`, 1회 재생, `finished`를 떠나면 정지 — D-6). 미등록이면 ui에 번들된 내장 기본음 정적 mp3(`src/assets/sounds/default-alarm.mp3`, TM-09 — v0.27 CR-058 정정, v0.23~v0.26 문서: 합성 WAV Blob URL). 계약에는 기본음이 없다 |
| 5 | **webview 전제(§7 — 메인 세션 반영 완료)**: 사용자 소리는 asset URL(`http://asset.localhost/…`), 기본음은 번들 정적 자산(`'self'` — v0.27 CR-058 정정, v0.23~v0.26 문서: `blob:`) — CSP `media-src 'self' asset: http://asset.localhost blob:`(D-9. `blob:`은 현재 제품 코드에서 쓰는 곳이 없다 — §7 v0.27). 오버레이는 사용자 제스처 없이 재생하므로 두 창 `additionalBrowserArgs`에 `--autoplay-policy=no-user-gesture-required`(D-8). 자동 재생 실측은 ui 패킷 첫 작업(스파이크) |
| 6 | **권한**: 새 command 3개는 앱 command(`generate_handler!` 등록만으로 허용 — `src-tauri/src/lib.rs` 3줄, 패킷 §1). `pickAudioFile`은 기존 `dialog:allow-open`(settings 창). `fs` 권한 없음 — 파일 접근은 Rust 안에서만 |

- 테스트(bridge-implementer, 패킷 §7): cargo — `get_alarm_sound_none_when_empty`, `import_alarm_sound_error_codes`(`sound.too_many_bytes`·`sound.not_audio`), `import_alarm_sound_returns_versioned_url`, `remove_alarm_sound_idempotent`, `alarm_sound_json_shape`, `sound_error_to_bridge_error`. vitest — `getAlarmSound`·`importAlarmSound`·`removeAlarmSound`의 invoke 이름·인자(`{ path }`), reject → `BridgeError` 그대로.

### 5.10 `reset_app_data` — 앱 데이터 전체 초기화 (v0.25 신규, data-reset — R-B2 · R-B3 · R-A2)

창고(core)를 통째로 비우고 견본 7장을 다시 채운 뒤, 매장 두 곳(오버레이·설정 창)에 「진열 바뀜」을 알리고 오버레이 간판(창 크기·위치)을 다시 단다. 창고 정리가 도중에 멈춰도 알림은 한다 — 매장은 창고에 **실제로 남은 것**을 보여 줘야 하기 때문이다.

> 🔒 **베타 전용 (사용자 결정 2026-09-27, 02-design §0 R-A·R-B).** 사용자 커스텀까지 전부 지우는 정책은 베타 동안만 쓴다. **정식 배포 때 정책을 다시 정한다**(02-design §8 메모 — 「옛 기본 그대로인 칸·좌표만 교체」 안). 전환은 core `data_reset::decide`·`reset_settings`에서만 하고, 이 command의 이름·인자·반환·에러 code는 그대로 두는 것을 목표로 한다. 전환 때 이 절의 보존 규칙 표를 다시 쓴다.

| 항목 | 값 |
|---|---|
| 인자 | 없음 |
| 반환 | `void` — Rust `Result<(), BridgeError>`, JSON `null`. 새 상태는 반환값이 아니라 이벤트로 받는다. 세대 번호·앱 버전·`ResetOutcome`(지운 수·시딩 수·소요 ms)은 **노출하지 않는다**(요구 없음, 스킬 §12 — 로그 전용) |
| 에러(§6.2) | **(v0.26) `reset.forbidden`**(0단계 — 호출 창이 settings가 아님, 아래 「호출 창 제한」), `reset.io`, `reset.seed`, `settings.io`, `state.poisoned`. `ResetError::Settings(e)`는 `e.code()`를 그대로 싣는다 — `settings.invalid`·`settings.format`도 형식상 가능하지만 보존 규칙 결과가 항상 유효하고 직렬화가 실패하지 않아 실제로는 나지 않는다 |
| core | `data_reset::reset_data(paths: &AppPaths, settings: &Mutex<Settings>) -> Result<ResetOutcome, ResetError>`(core data_reset.md §3.3 — ① 세대 표식 삭제 ② 화이트리스트 삭제 ③ 내장 기본 7장 시딩 ④ `settings::update`로 보존 규칙 적용 ⑤ 세대 표식 원자 기록). 뒤처리는 기존 함수 재사용: `assets::load_manifest`, `window::apply_overlay_window(&AppHandle, &Settings) -> Result<(), WindowError>`, `window::resize_overlay(app, canvas, scale)`, `window::reset_overlay_position(app, &Mutex<Settings>, &Path) -> Result<Settings, WindowError>`(§5.6이 부르는 것과 같은 함수), `tray::refresh_overlay(&AppHandle) -> Result<(), BridgeError>`(core가 `pub(crate)`로 연다 — data_reset.md §3.8), bridge 비공개 헬퍼 `refresh_hand_anchor`·`apply_timer_config_side_effect`·`load_manifest_or_warn`·`lock_settings` |
| 래퍼 | `resetAppData(): Promise<void>` → `invoke('reset_app_data')`(인자 객체 없음). `src/bridge/commands.ts`, 기존 `call<T>` 패턴 |
| 소비자 | settings 창 — 확인 창(ui 몫) 뒤에 호출, 응답 전까지 **초기화 버튼 재진입만 막는다**(버튼 `disabled`·`aria-busy` — settings `design/general-tab.md` §7 해석 결정, 02-design §2 `resetPhase`). 다른 카드 조작은 막지 않는다 — 다른 command와의 직렬화는 아래 C-4(동기 command)가 보장한다. (v0.26, CR-003 정정 — v0.25의 「다른 조작을 막는다」는 실제 설계와 달랐다.) 오버레이는 이 command를 부르지 않는다(새로고침으로 초기 상태에서 다시 시작) — **(v0.26, SEC-002) 불러도 핸들러가 0단계에서 `reset.forbidden`으로 거부한다** |
| 권한 | 앱 command — `generate_handler!` 1줄 등록만(§7 — 등록 완료 `src-tauri/src/lib.rs:193`). 추가 권한 없음. (v0.26) 호출 창 제한은 capability가 아니라 핸들러 0단계에서 한다(권한 층 대안은 보류 — §7 v0.26) |
| Rust 핸들러 | 동기 `#[tauri::command] pub fn reset_app_data(app: AppHandle, window: tauri::WebviewWindow, state: State<'_, AppState>) -> Result<(), BridgeError>`(**v0.26** — `window` 추가. Tauri 주입 인자라 JS 인자·TS 래퍼 불변. 인자 순서는 자유 — 주입은 이름·순서가 아니라 타입으로 한다) + 첫 문장 `ensure_reset_caller(window.label())?;`(아래 「호출 창 제한」) + 비공개 뒤처리 헬퍼(패킷 이름 `reapply_after_reset`). 함수마다 50줄 이하 — 넘으면 4~6단계와 7~9단계를 헬퍼로 나눈다. 문서주석 `/// [계약] contract.md §5·§5.10 reset_app_data [요구] R-B2, R-B3 [에러] reset.forbidden, reset.io, reset.seed, settings.io, state.poisoned [부수효과] …`(v0.26 — `[에러]`에 `reset.forbidden` 추가, 「settings 창 호출만 허용」 한 줄 추가) |

**호출 창 제한 (v0.26 신규, 배포 전 검증 SEC-002 — 사용자 승인 2026-09-27)**

전체 초기화는 「계산대(설정 창)에서만 받는 주문」이다. 매장 진열대(오버레이)에서 같은 주문서가 들어와도 창고는 받지 않는다 — 확인 절차가 계산대에만 있기 때문이다.

| 항목 | 값 |
|---|---|
| 판정 함수 | `fn ensure_reset_caller(label: &str) -> Result<(), BridgeError>` — `src-tauri/src/bridge/commands/mod.rs` 비공개 함수(`tests.rs`에서 `super::`로 접근). tauri 타입을 받지 않는 **순수 함수**라 `#[cfg(test)]`에서 바로 부른다(스킬 §10) |
| 규칙 | `label == window::SETTINGS_LABEL`(= `"settings"`, core `src-tauri/src/window/mod.rs:51` 기존 상수 — 문자열 리터럴을 새로 쓰지 않는다)이면 `Ok(())`. 그 밖은 전부 `Err(BridgeError::new("reset.forbidden", "전체 초기화는 설정 창에서만 할 수 있습니다."))` — 오버레이 `"overlay"`, 빈 문자열, 대소문자·공백이 다른 값 포함(정확 일치, 변환 없음). message에 라벨·경로를 넣지 않는다 |
| 라벨 출처 | Tauri가 IPC를 보낸 WebView의 창으로 `window: tauri::WebviewWindow` 인자를 채운다. 값은 JS 인자가 아니어서 호출 쪽이 보내거나 바꿀 수 없다. 두 창 모두 `WebviewWindowBuilder`로 만든 단일 WebView 창이라 창 라벨 = WebView 라벨(`tauri::Window`를 받아도 같은 값 — 구현자가 고른다). 인자 이름은 `window`를 기본으로 하되, 같은 파일의 `crate::window` 모듈 경로(`window::…`)와 읽기가 헷갈리면 `caller` 등으로 바꿔도 된다(주입은 타입 기준 — 계약 표면 불변) |
| 위치 | 핸들러 **첫 문장**(0단계) — 가(설정 잠금)보다 먼저. 거부하면 설정 잠금·core `data_reset::reset_data`·이벤트 emit·창 조작·오버레이 새로고침을 **하나도 하지 않고** 즉시 반환한다(데이터·창 불변). 경고 로그 1줄은 남겨도 된다(선택 — 라벨만, 경로 없음) |
| code 선택 근거 | 기존 code 재사용을 먼저 검토했으나 맞는 것이 없다: `window.not_found`(창을 못 찾음 — 사실과 다르고 ui가 창 문제로 오인), `state.poisoned`(「앱을 다시 시작하세요」 — 틀린 안내), `tauri.error`(Tauri 실패 원문), `settings.invalid`(설정값 검증), `unknown`(TS 전용 정규화). 그래서 새 code 1개. 이름은 이 command 전용 도메인 `reset.*`(`reset.io`·`reset.seed`와 같은 영역)에 사유 `forbidden` — §6 `영역.사유` 규칙 |
| core 의존 | 없음(라벨 비교만). core `window::SETTINGS_LABEL`은 이미 `pub const` — core 변경 요구 없음 |
| 대안(보류) | 권한 층 차단(`build.rs` app manifest + settings capability에만 이 command 허용) — 이번 범위 밖(§7 v0.26) |


**보존 규칙 (🔒 사용자 결정 2026-09-27 — core `data_reset::reset_settings`·`wipe`가 정본, 계약은 결과만 적는다)**

| 대상 | 초기화 뒤 | 근거 |
|---|---|---|
| 그림 `assets/*.png` · `manifest.json` | 전부 지우고 내장 기본 7장(§3.1 `DEFAULT_ASSET_SLOTS`)으로 다시 채움 | R-A |
| 알림음 `assets/alarm.{wav,mp3,ogg}` | **삭제**(ui 내장 기본음으로 돌아감 — §5.9-4) | D-4 |
| `language` | **유지** | D-2 🔒 |
| `autostart` + 작업 스케줄러 등록 | **유지**(등록도 건드리지 않는다) | D-3 |
| `overlay` 위치 | **기본 위치**(core `window::default_overlay_position()` = (100, 100)) — 창도 옮긴다 | D-5 |
| 그 밖의 설정(`overlay.visible`·배율·위치 잠금·작업표시줄·마우스·타이머 등) | `Settings::default()` | R-A |
| 초기화 전에 설정 파일을 읽지 못한 경우(없음·손상) | 메모리가 이미 기본값이라 언어도 기본값(`'ko'`) | core data_reset.md §3.2 |
| 타이머 진행 상태(경과·실행 중) | 앱 데이터가 아니므로 초기화 대상 아님 — 설정 변경에 따른 판정만 8단계가 `set_settings`와 같게 반영 | 패킷 §2 |

**처리 순서** (0 = 호출 창 확인(v0.26), 가·나·다 = 핸들러, 1~9 = 뒤처리 — 패킷 §2 표 번호와 같다)

| # | 단계 | 실패 시 |
|---|---|---|
| 0 | (v0.26, SEC-002) 호출 창 확인 `ensure_reset_caller(window.label())?` — 위 「호출 창 제한」 | `reset.forbidden` — **아무것도 하지 않고** 즉시 반환(설정 잠금·core·emit·창 조작 전) |
| 가 | 설정 잠금으로 이전 `timer` 전체 복사(`old_timer`) — **문장 끝에서 잠금을 푼다**(나 ④의 `settings::update`가 같은 잠금을 잡으므로 쥔 채 부르면 교착, data_reset.md §9) | `state.poisoned` — **아무것도 하지 않고** 즉시 반환 |
| 나 | core `data_reset::reset_data(&state.paths, &state.settings)` | `Err`면 `code`만 경고 로그(경로 없음)하고 **1단계로 계속**. 결과는 다 단계에서 반환 |
| 1 | 메모리 설정 복제 `fin` + 디스크 매니페스트(`load_manifest_or_warn` — 읽기 실패면 경고 후 빈 매니페스트) | 설정 잠금 오염이면 이후 단계 없이 `state.poisoned`(나의 code는 이미 로그. 메모리 설정을 못 읽으면 창을 맞출 근거가 없다) |
| 2 | `settings://changed`(`fin`) emit | 경고 로그, 계속 |
| 3 | `assets://changed`(매니페스트) emit — **2 뒤 고정**(§4 순서 주석) | 경고 로그, 계속 |
| 4 | `window::apply_overlay_window(&fin)` — 표시/숨김·위치 잠금·작업표시줄(초기화 뒤 기본값) | 경고 로그, 계속 |
| 5 | `window::resize_overlay(manifest.canvas, fin.scale)` — 캔버스·배율이 모두 바뀌었을 수 있으므로 **항상**(§5.2) | 경고 로그, 계속 |
| 6 | `window::reset_overlay_position(...)` — 기본 위치로 이동·저장(D-5). 돌려준 설정의 `overlay`가 `fin.overlay`와 **다르면** 그 설정으로 `settings://changed`를 1회 더 보낸다. 이 경우는 나가 ④ 전에 실패해 메모리 위치가 옛 값일 때만 생긴다 — 성공 경로에서는 ④가 이미 기본 위치를 저장해 같으므로 추가 emit이 없다 | 경고 로그, 계속 |
| 7 | 손 기준점 **항상** 재계산(`refresh_hand_anchor(&manifest, fin.mouse)`) — 캐시와 다르면 `assets://hand-anchor-changed`(§5.1, 주 이벤트 2·3 뒤) | 경고 로그, 계속(캐시 잠금 오염 포함) |
| 8 | 타이머 설정 반영 `apply_timer_config_side_effect(old_timer, fin.timer)` — `set_settings` 6단계(§5.3)와 같은 판정. 바뀌면 core 깔때기 `publish_timer_change`(`timer://changed`·트레이 메뉴·마감 스레드), 아니면 `tray::sync_timer_menu`만 | 경고 로그(헬퍼가 이미 처리) |
| 9 | `tray::refresh_overlay(app)` — 훅의 눌린 키 표를 비우고 오버레이 WebView 새로고침(앱 재시작과 같은 초기 상태, 트레이 「새로고침」 CR-046과 같은 경로). **설정 창은 새로고침하지 않는다** — 2·3 이벤트로 갱신된다 | 경고 로그(`window.not_found`·`window.reload_failed`는 command code로 노출하지 않는다) |
| 다 | 나의 결과 반환 — `Ok` → `Ok(())`, `Err(e)` → `Err(BridgeError::from(e))`(§6.1) | — |

- **이벤트 두 개 뒤 단계(4~9) 실패는 경고 로그만** — `set_settings`의 「`settings://changed` 먼저, 이후 실패는 경고」 규칙(§5.3)과 같다. **2·3의 emit 실패도 경고 로그만 남긴다**(`set_settings`는 emit 실패를 `tauri.error`로 돌려주지만 여기서는 다르다): 초기화 결과(나)를 command 결과로 온전히 돌려주고, emit이 실패해도 4~9(창 적용·새로고침)는 끝까지 해야 오버레이가 디스크 상태로 돌아가기 때문이다. 그래서 `tauri.error`는 이 command의 발생 code가 아니다.
- **에러 우선순위**: (v0.26) 0의 `reset.forbidden` > 가·1의 `state.poisoned` > 나의 code. 나머지 실패는 반환값에 섞이지 않는다.
- **부분 실패와 두 창**: 결과와 무관하게 1단계가 메모리 설정·디스크 매니페스트를 **다시 읽어** 보낸다 — 두 창은 언제나 디스크에 실제로 남은 상태를 본다(R-B2). 모든 실패에서 세대 표식이 없으므로 **다음 앱 시작 때 core `run_startup`이 처음부터 자동 재시도**한다(R-A3).

| 나 실패 지점(core ①~⑤) | code | 디스크·메모리 | 두 창이 받는 것 |
|---|---|---|---|
| ① 표식 삭제 | `reset.io` | 아무것도 지우지 않음 | 이전 설정·이전 그림. 위치만 6단계로 기본 위치(추가 `settings://changed`) |
| ② 파일 삭제 도중 | `reset.io` | 일부 그림·알림음만 지워짐(되돌리지 않음), 설정 이전 값 | 남은 매니페스트·이전 설정, 위치는 기본(추가 emit) |
| ③ 기본 그림 시딩 | `reset.seed` | 그림 비었거나 일부만, 설정 이전 값 | 〃 |
| ④ 설정 저장 | `settings.io` | 그림은 기본 7장, 메모리·파일 설정은 이전 값(`update` 계약) | 기본 그림 + 이전 설정, 위치는 기본(추가 emit). (설정 잠금 오염 `state.poisoned`는 보통 가에서 먼저 걸려 초기화 자체를 하지 않는다. 가와 ④ 사이에 오염되면 1단계에서도 걸려 이벤트 없이 `state.poisoned`) |
| ⑤ 표식 기록 | `reset.io` | 그림·설정 모두 초기화 뒤 값, 표식만 없음 | 초기화 뒤 값(추가 emit 없음). 다음 시작 때 한 번 더 초기화된다 — 그 사이 사용자가 바꾼 것도 지워진다(message가 「다음에 앱을 시작할 때 다시 시도」라고 알린다) |

**동시 실행 직렬화 (C-4 판정, core data_reset.md §11.4) — 별도 잠금 없음. 동기 command로 직렬화한다.**

`assets/`에는 잠금이 없어서, 초기화 도중 다른 에셋 command가 끼면 결과가 섞일 수 있다(data_reset.md §9). 판정 근거(2026-09-27 실물 조사):
1. Tauri 2는 `async`가 아닌 `#[tauri::command]`를 **메인 스레드에서 하나씩** 실행한다. 동기 command끼리는 겹치지 않는다.
2. `src-tauri/src/bridge/commands/mod.rs`에서 앱 데이터 폴더(`assets/`)를 쓰는 `import_asset`·`remove_asset`·`restore_default_asset`·`import_alarm_sound`·`remove_alarm_sound`와 설정을 쓰는 `set_settings`·`set_overlay_position`·`set_overlay_visible`·`reset_overlay_position`은 **모두 동기 `pub fn` + 속성 없는 `#[tauri::command]`**다(`(async)` 속성 없음). async command는 `set_autostart` 하나뿐이다. 이 command는 `assets/`를 건드리지 않고 설정은 `settings::update`(설정 잠금)로만 쓴다. 그래서 나 ④와 잠금으로 직렬화되고, 초기화가 `autostart`를 보존하므로 어느 쪽이 나중에 끝나도 결과가 같다.
3. command 밖에서 쓰는 주체도 확인했다. 드래그 위치 저장 스레드는 `overlay.x/y`만, 시작 자동 실행 보정 스레드는 `autostart`만 쓰고 둘 다 `settings::update`를 거친다. 트레이 메뉴는 메인 스레드에서 돌고, 첫 실행 시딩과 시작 세대 초기화는 창 생성 전에 끝난다. `assets/`를 쓰는 비-메인 스레드는 없다.
4. 6단계 창 이동 뒤 드래그 저장 감시가 도는 것은 §5.6과 같다 — 저장된 위치와 같아 추가 emit이 없다. 위치 저장 스레드를 다시 등록하지 않는다.

- **🔒 불변식(계약)**: 「앱 데이터 폴더(`assets/`)나 설정을 바꾸는 command와 `reset_app_data`는 **동기 command로 유지**한다. 이 중 하나라도 `async`(또는 `#[tauri::command(async)]`)로 바꾸려면 **먼저 공용 잠금을 도입**하고 이 절을 고친다.」 §5.7의 「`export_default_assets` async 전환은 비파괴」 메모는 이 불변식과 충돌하지 않는다 — 내보내기는 사용자 폴더에만 쓰고 앱 데이터 폴더를 쓰지 않는다.
- **ui 보조(정합성 근거 아님)**: settings 창은 pending 동안 **초기화 버튼 재진입만** 막는다(버튼 `disabled`·`aria-busy` — settings `design/general-tab.md` §7 해석 결정, 02-design §2 `resetPhase`). 다른 카드 조작은 막지 않는다. 직렬화는 1~3이 보장하고, 이것은 같은 초기화 요청이 두 번 나가지 않게 하는 UX 장치다. (v0.26, CR-003 정정 — v0.25의 「pending 동안 다른 조작을 막는다」는 실제 설계와 달랐다.)
- **대가**: 초기화 동안(목표 ≤ 300 ms, 02-design §7) 메인 스레드가 잠시 막혀 두 창의 IPC 응답이 늦어진다. 입력 훅은 별도 스레드라 영향이 없다. 목표를 넘는 실측이 나오면 async로 바꾸기 전에 위 불변식부터 푼다.
- **남는 위험(범위 밖)**: 다른 프로세스가 파일을 열고 있어 삭제가 실패하면(WebView asset 읽기 중 등 — 미검증, core-survey Q5) `reset.io`가 되고 다음 시작 때 재시도한다. 공용 잠금용 새 `AppState` 필드는 `lib.rs` 수정 범위 밖이라 선택지에서 뺐다.

- **판정**: 신규 command. 「앱 데이터 전체」라는 새 범위의 새 동작이다. 기존 `restore_default_asset`(슬롯 하나)이나 `reset_overlay_position`(위치만)에 얹으면 한 command가 두 가지 일을 하거나 기존 의미가 바뀐다(스킬 §5). 창 반영은 새 이벤트 없이 기존 전체 스냅숏 이벤트 두 개와 오버레이 새로고침으로 한다.
- **테스트(bridge-implementer, 패킷 §5)**: cargo — `reset_error_maps_to_bridge_codes`: `ResetError::{Io, Seed, Settings(io)}` → `BridgeError.code` = `reset.io`·`reset.seed`·`settings.io`이고 message에 tempdir 경로 문자열이 없다. 창·emit이 들어간 뒤처리(1~9)는 tauri 없이 테스트할 수 없어 수동 확인(패킷 §5 — dev 앱, 사용자 승인 뒤 백업 데이터로)으로 대신한다. vitest — `resetAppData()`가 `invoke('reset_app_data')`를 인자 없이 1회 부르고 `undefined`로 resolve, reject `{code:'reset.io', message}` → `BridgeError` 그대로(code `reset.io`).
- **테스트 추가 (v0.26, SEC-002)**: cargo — `ensure_reset_caller`: 정상 `"settings"` → `Ok(())`. 거부 `"overlay"`·`""`·`"Settings"`·`"settings "` → `Err`, `code == "reset.forbidden"`, message = 「전체 초기화는 설정 창에서만 할 수 있습니다.」이고 입력 라벨 문자열을 담지 않는다. 핸들러가 이 함수를 **첫 문장**에서 부르는지(가보다 앞)는 tauri 없이 테스트할 수 없어 코드 리뷰로 확인하고, 실물 확인은 수동(오버레이 WebView 개발자 도구에서 `invoke('reset_app_data')` → reject `reset.forbidden`, 데이터·창 불변 — 사용자 승인 뒤 백업 데이터로, 패킷 §5와 같은 조건). vitest 변경 없음(래퍼·인자 불변 — 기존 reject 전달 테스트가 모든 code에 적용된다).

## 6. 에러 코드

**(v0.14, 🔒 D-3) 정본 = 실물 `BridgeError.code`(`영역.사유` snake_case).** core `code()` 값이 그대로 실린다 — Rust 값은 바꾸지 않았다. v0.13까지의 대문자 이름은 「별칭」 열에만 남긴다(본문·§8 이력의 대문자 표기는 별칭으로 읽는다). ui(설정 창)는 이 code로 3개 국어 문구를 고르므로(SV2-02) 목록은 빠짐없어야 한다. 모르는 code는 `message`(한국어)로 폴백하는 것을 권한다(ui 몫). 새 code 추가는 비파괴다. (v0.21) code 수 21 → 22(+ TS 전용 `unknown`). **(v0.22, CR-047 · SEC-001) `autostart.cancelled` 폐기 — 22 → 21**(승격 경로 삭제로 발생 경로 자체가 없어졌다. 타입·이름은 지우지 않고 아래 표에 「폐기」로만 표기 — 사실상 미사용이라 비파괴로 분류한다). **(v0.23, CR-048 · TM-13) `sound.not_audio`·`sound.too_many_bytes`·`sound.io` 추가 — 21 → 24**(+ TS 전용 `unknown`). `timer.disabled`는 code 불변, 문구만 변경. **(v0.25, data-reset R-B3) `reset.io`·`reset.seed` 추가 — 24 → 26**(+ TS 전용 `unknown`. 폐기 표기 `autostart.cancelled`는 세지 않는다 — 2026-09-27 이 표와 ui 사전 `src/settings/i18n/types.ts` 24키를 세어 확인). TS `BridgeError.code`는 `string`이라(§3.5) bridge TS 타입 변경은 없다 — code 목록을 가진 ui 사전·i18n 테스트가 2개를 더한다(ui 몫). **(v0.26, SEC-002) `reset.forbidden` 추가 — 26 → 27**(+ TS 전용 `unknown`). bridge 판정 함수가 `BridgeError::new`로 직접 만드는 code다(core 에러 아님 — §6.1 변환 표 대상 아님, 아래 현황 메모 ③과 같은 방식). TS 타입 변경 없음(`code: string`). **ui 사전 추가 대상 아님** — 허용 창이 settings뿐이라 이 code를 받는 화면이 없다(오버레이는 부르지 않는다). 이 code만 위 「목록은 빠짐없어야 한다」의 예외로 둔다(만일 받더라도 ko는 `message`, ja·en은 `errors.unknown`으로 폴백 — settings `design.md` 「실패 표시 규칙」).

| 코드(정본) | 별칭(~v0.13) | 발생 | message 예(실물) |
|---|---|---|---|
| `timer.disabled` | — (v0.21 신규, CR-045 · PT-05 · PT-10) | `control_timer` — `timer.enabled == false`일 때 모든 action 거부(core `TimerError::Disabled`). 상태 불변·emit 없음. (v0.23) `enabled`의 뜻이 「스톱워치 또는 타이머 켜짐」으로 넓어져 문구를 바꿨다(code 불변) | (v0.23) "스톱워치나 타이머가 꺼져 있습니다. 먼저 둘 중 하나를 켜 주세요." (v0.21~v0.22: ~~"타이머가 꺼져 있습니다. 먼저 「타이머 사용」을 켜 주세요."~~) |
| `sound.not_audio` | — (v0.23 신규, CR-048 · TM-08 · TM-13) | `import_alarm_sound` — 파일 앞 바이트가 wav·mp3·ogg가 아님(빈 파일 포함, 확장자는 보지 않음). 기존 알림음 불변 | "wav·mp3·ogg 소리 파일이 아닙니다." |
| `sound.too_many_bytes` | — (v0.23 신규, CR-048 · TM-08 · TM-13) | `import_alarm_sound` — 파일 > 1MiB(1,048,576바이트). **형식 검사보다 먼저**(읽기 전 거부). 기존 알림음 불변 | "알림음 파일은 1MB 이하여야 합니다. (현재 {bytes}바이트)" |
| `sound.io` | — (v0.23 신규, CR-048 · TM-08 · TM-13) | 알림음 command 3개 — 원본 읽기·`assets/alarm.*` 쓰기·조회·삭제 실패(`NotFound`는 오류 아님 — 없음은 `null`·멱등 성공) | "알림음 파일을 읽거나 쓰지 못했습니다: {OS 오류}" |
| `reset.io` | — (v0.25 신규, data-reset · R-B3) | `reset_app_data` — core `ResetError::Io`: ① 세대 표식 삭제 ② 앱 데이터 파일 삭제·폴더 읽기 ⑤ 세대 표식 기록 실패. **일부만 초기화됐을 수 있다**(지운 파일은 되돌리지 않음). 표식이 없으므로 **다음 앱 시작 때 자동 재시도**. 두 창은 남은 디스크 상태로 맞춰진다(§5.10) | "앱 데이터를 초기화하지 못했습니다. 다음에 앱을 시작할 때 다시 시도합니다." (**경로·OS 원문 없음** — core `Display`에 `{0}` 없음, data_reset.md §6) |
| `reset.seed` | — (v0.25 신규, data-reset · R-B3) | `reset_app_data` — core `ResetError::Seed`: 비운 뒤 내장 기본 그림 7장을 전부 등록하지 못함(일부 실패·건너뜀). 표식이 없으므로 **다음 앱 시작 때 자동 재시도**. 두 창은 남은 디스크 상태로 맞춰진다 | "기본 그림을 다시 채우지 못했습니다. 다음에 앱을 시작할 때 다시 시도합니다." (경로 없음) |
| `reset.forbidden` | — (v0.26 신규, 배포 전 검증 SEC-002) | `reset_app_data` — 호출 창 라벨이 `"settings"`가 아님(오버레이 등). bridge 순수 함수 `ensure_reset_caller`가 만든다(core 에러 아님). 설정 잠금·core 호출·emit·창 조작 **전에** 거부 — 데이터·창 불변(§5.10 0단계). settings 창은 받지 않는다(유일한 허용 창) — ui 사전 추가 대상 아님 | "전체 초기화는 설정 창에서만 할 수 있습니다." (라벨·경로 없음) |
| `asset.not_png` | `ASSET_INVALID_FORMAT` | PNG 서명 아님 | "PNG 파일이 아닙니다." |
| `asset.bad_header` | `ASSET_INVALID_FORMAT` | PNG 헤더 손상 | "PNG 헤더가 손상되었습니다." |
| `asset.not_rgba` | `ASSET_INVALID_FORMAT` | 32bit RGBA 아님 | "32bit RGBA PNG 만 지원합니다 (투명 배경 필요)." |
| `asset.too_large` | `ASSET_TOO_LARGE` | 모든 이미지(캔버스 레이어·마우스 파츠·(v0.13) 펜 그림 공통) >900×700 (v0.8: 마우스 파츠 256×256 규칙 삭제) | "이미지가 너무 큽니다. 최대 900×700 (현재 {w}×{h})." |
| `asset.too_many_bytes` | `ASSET_TOO_LARGE` | 파일 >1MB | "파일 용량이 1 MB 를 넘습니다 ({bytes} 바이트)." |
| `asset.canvas_mismatch` | `ASSET_CANVAS_MISMATCH` | 캔버스 레이어(배경·몸통·상태·키보드·특수 키) 크기가 기존 캔버스와 다름(`CanvasMismatch`) — **캔버스 레이어 불일치에만 발생**(v0.16a, CR-036). 마우스 파츠·펜 그림은 크기 불일치로 거절하지 않는다. ~~마우스 파츠끼리 다름(v0.8, `MousePartMismatch`) / 펜 그림끼리 다름(v0.13, `PenPartMismatch`). 세 변형이 같은 code~~ — 두 변형은 core에서 삭제(core assets.md §3.11) | 캔버스: "배경·몸통 등 캔버스 그림은 모두 같은 크기여야 합니다. 캔버스 {cw}×{ch}, 이 이미지 {w}×{h}." / ~~마우스 파츠: "마우스 파츠(기본·왼클릭·오른클릭)는 모두 같은 크기여야 합니다. …"~~ / ~~펜: "펜 쥔 손 그림(평소·누름·특수 키)은 모두 같은 크기여야 합니다. …"~~ (v0.16a 폐기) |
| `asset.not_found` | `ASSET_SLOT_INVALID` | `remove_asset`에 등록되지 않은 슬롯 | "등록되지 않은 슬롯입니다: {슬롯 키}" |
| `asset.io` | `IO_ERROR` | 이미지 파일 읽기·복사·삭제 실패 | "파일 처리 중 오류가 발생했습니다: {OS 오류}" |
| `asset.manifest` | `IO_ERROR` | manifest.json 최상위 구조 손상(JSON 문법, `canvas`·`entries` 모양) 또는 쓰기 실패. 해석 안 되는 항목(폐기된 `slam`, 손으로 고친 항목)은 오류 없이 그 항목만 건너뜀(v0.10, §3.1 「옛 매니페스트 호환」) | "매니페스트를 읽거나 쓸 수 없습니다: {원인}" |
| `asset.no_default` | — (v0.16 신규, CR-035 · DA-06) | `restore_default_asset`에 내장 기본 그림이 없는 슬롯(§3.1 `hasBuiltinDefault` = false — `body`·`kb_down` 1+·`mouse_left`·`mouse_right`·`pen_down` 1+·`pen_key_*`). 매니페스트·파일 불변 | "이 칸에는 내장 기본 그림이 없습니다: {슬롯 키}" (경로 없음) |
| `asset.export_dir` | — (v0.16 신규, CR-035 · DA-06) | `export_default_assets`의 `dir`가 절대 경로가 아니거나, 없거나, 폴더가 아님. 아무것도 쓰지 않음 | "저장할 폴더를 찾을 수 없습니다." (경로 넣지 않음) |
| `settings.invalid` | `SETTINGS_INVALID` | §3.3 검증 규칙 위반 | "설정값이 올바르지 않습니다: {규칙}" (배율 25%~200%, 이동 영역 네 꼭짓점 유한수) |
| `settings.io` | `IO_ERROR` | settings.json 쓰기 실패 | "설정 파일을 읽거나 쓸 수 없습니다: {OS 오류}" |
| `settings.format` | `IO_ERROR` | settings.json 직렬화 실패(사실상 발생 안 함 — 읽기 형식 오류는 앱 시작 때 기본값 대체라 command로 나가지 않는다) | "설정 파일 형식이 올바르지 않습니다: {원인}" |
| `io.error` | `IO_ERROR` | 그 밖의 파일 오류(`From<std::io::Error>`), (v0.14) 자동 실행 임시 작업 XML 쓰기 실패(`AutostartError::Io`) | "파일 처리 중 오류가 발생했습니다: {OS 오류}" / (v0.14) "자동 실행 설정 파일을 만들지 못했습니다." |
| `window.not_found` | `WINDOW_ERROR` | 오버레이·설정 창을 찾지 못함 | "overlay 창을 찾을 수 없습니다." |
| `window.no_monitor` | `WINDOW_ERROR` | 모니터 정보 없음 — `get_screen_bounds`, (v0.9) `get_monitors` 빈 목록 | "모니터 정보를 읽을 수 없습니다." |
| `tauri.error` | `WINDOW_ERROR` | Tauri 창 조작 실패(`WindowError::Tauri` — (v0.9) `get_monitors` OS 조회 실패 포함), 이벤트 emit 실패·(v0.14) `set_autostart` 작업 스레드 합류 실패(`From<tauri::Error>`) | "창을 제어하지 못했습니다: {원인}" / emit 등: Tauri 원문 |
| `state.poisoned` | `STATE_POISONED` | 앱 상태 `Mutex` 독(다른 스레드가 잠근 채 panic) — 설정 상태, `get_hand_anchor` 캐시 | "설정 상태가 손상되었습니다. 앱을 다시 시작하세요." |
| `autostart.error` | `AUTOSTART_ERROR` | 자동 실행 등록/해제 실패 — `schtasks` 종료 코드 ≠ 0(`AutostartError::Failed`). (v0.22, CR-047) 일반 권한(승격 없음)으로 바뀌었을 뿐 발생 조건은 같다 | "자동 실행 설정을 바꾸지 못했습니다. (schtasks 종료 코드 N)" |
| ~~`autostart.cancelled`~~ | ~~— (v0.14 신규)~~ | **폐기(v0.22, CR-047 · SEC-001)** — 자동 실행 작업이 일반 권한(`RunLevel=LeastPrivilege`)으로 바뀌어 UAC 승격 자체가 없어졌다. 옛 문구: ~~사용자가 UAC 권한 확인 창에서 「아니요」·닫기(`ERROR_CANCELLED`) — 설정·등록 상태 불변~~ | ~~"권한 확인이 취소되어 자동 실행 설정을 바꾸지 않았습니다."~~ |
| `unknown` | — (TS 전용) | TS 래퍼 `toBridgeError`가 `{code, message}` 형태가 아닌 실패를 정규화: Tauri command 인자 역직렬화 실패(옛·새 빌드 혼용 — §3 각 「전환 위험」), 권한 거부, 없는 command, 플러그인·창 API 실패(§5.4) | 원래 오류 문자열 / "알 수 없는 오류" |

- **command 노출 안 함**(로그 전용): `asset.decode`(손 기준점 재계산, §5.1-5), `window.thread`(setup 이동 감시), `tray.no_icon`(setup 트레이 생성).
- **현황 메모(확인 필요 — v0.14에서 고치지 않음)**: ① `asset.io`·`asset.manifest`·`settings.*`·`io.error`·`tauri.error`의 message에 OS·내부 원문(`{0}`)이 붙는다 — bridge-design-strategy §3·§4 「내부 경로·스택은 message에 넣지 않는다」와 어긋난다(ui가 code로 문구를 고르면 사용자 노출은 줄어든다). ② v0.13까지 `ASSET_SLOT_INVALID`의 발생으로 적은 「`kb_down` index 불연속」은 실물에서 발생하지 않는다 — core `assets::import`는 index 연속성을 검사하지 않고 `AssetError::NotFound`는 `remove`에서만 난다. 불연속 등록을 막는 것은 ui(D-2 「+ 누름 그림 추가」 = 다음 index)다. 02-design D-2의 「core `import`는 불연속 index를 거부한다」와도 다르다. ③ `state.poisoned`와 tray의 `window.not_found`는 핸들러가 `BridgeError::new`로 직접 만든다(BRG-008). (v0.26) `reset.forbidden`도 bridge 판정 함수 `ensure_reset_caller`가 `BridgeError::new`로 만든다 — 대응하는 core 에러가 없는 bridge 고유 판정이라서다(핸들러마다 흩어진 `map_err`가 아니라 함수 한 곳).

### 6.1 core 에러 → `BridgeError` 변환 (`src-tauri/src/error.rs` 한 곳)

핸들러마다 `map_err` 문자열을 만들지 않고 `From<CoreError> for BridgeError`로만 변환한다. 방식은 모두 `BridgeError { code: e.code(), message: e.to_string() }` — core `code()` 값이 곧 계약 code(§6)다. 「노출 안 함」 변형은 bridge·setup이 로그로만 남긴다.

| core 에러 | 변형 → code(§6) | 비고 |
|---|---|---|
| `AssetError` | `NotPng` → `asset.not_png` / `BadHeader` → `asset.bad_header` / `NotRgba` → `asset.not_rgba` / `TooLarge` → `asset.too_large` / `TooManyBytes` → `asset.too_many_bytes` / `CanvasMismatch`·`MousePartMismatch`(v0.8)·`PenPartMismatch`(v0.13) → `asset.canvas_mismatch` / `NotFound` → `asset.not_found` / `Io` → `asset.io` / `Manifest` → `asset.manifest` / `Decode`(v0.3) → `asset.decode`(노출 안 함) / (v0.16) `NoDefault(String)` → `asset.no_default` / `ExportDir` → `asset.export_dir` | (v0.10) `Manifest`는 최상위 구조 손상만(core assets.md §3.6·§6). `Decode`는 손 기준점 재계산에서만 — 경고 로그 후 `null`(§5.1-5) |
| `SettingsError` | `Invalid` → `settings.invalid` / `Io` → `settings.io` / `Format` → `settings.format` / **`StatePoisoned`(v0.22, CR-047) → `state.poisoned`**(기존 code 재사용 — `settings::update`가 오염된 잠금을 만났을 때) | `?`로 `settings::update` 실패를 그대로 전파하면 이 변환이 적용된다(기존 `From<SettingsError>`에 변형 하나 추가, `error.rs`는 core 소관이라 core-implementer가 추가) |
| `WindowError` (v0.3, core window.md §6) | `NotFound` → `window.not_found` / `NoMonitor` → `window.no_monitor` / `Tauri` → `tauri.error` / `StatePoisoned` → `state.poisoned` / `Settings(e)` → 위 `SettingsError` 행 / `Thread` → `window.thread`(노출 안 함) | `Thread`는 setup `watch_overlay_moves` 실패(경고 로그). 드래그 저장 실패도 command가 아니라 경고 로그. (v0.9) `get_monitors` 빈 `Vec`은 핸들러가 `NoMonitor`로 바꾼다 |
| **`tray::autostart::AutostartError` (v0.14 신규, `impl From<AutostartError> for BridgeError`)** | `Failed(String)` → `autostart.error` / `Io` → `io.error` / **`Settings(SettingsError)`(v0.22, CR-047) → `e.code()`**(잠금 오염은 `state.poisoned`, 기존 code 재사용) | (v0.22) **`Cancelled` 변형 삭제 — `autostart.cancelled` 폐기**(승격 경로 삭제, SEC-001). `From` 구현은 `e.code()`/`e.to_string()` 그대로라 이 변환 자체는 코드 변경 없음(`types.rs` 문서주석만 갱신) |
| **`timer::TimerError` (v0.21 신규, `impl From<TimerError> for BridgeError`)** | `Disabled` → `timer.disabled` | core 패킷 §2. 방식은 위와 같다(`code: e.code()`, `message: e.to_string()`). (v0.23) 메시지 원문만 변경(§6) — 변환 코드 불변 |
| **`assets::sound::SoundError` (v0.23 신규, `impl From<SoundError> for BridgeError`)** | `NotAudio` → `sound.not_audio` / `TooManyBytes { bytes }` → `sound.too_many_bytes` / `Io(std::io::Error)` → `sound.io` | core assets.md §3.15.1. 방식은 위와 같다(`code: e.code()`, `message: e.to_string()`). 위치 `src-tauri/src/error.rs` 한 곳(패킷 §1). `sound.io` message에 OS 원문이 붙는다(§6 현황 메모 ①과 같은 성격 — ui는 code로 문구를 고른다) |
| **`data_reset::ResetError` (v0.25 신규, `impl From<ResetError> for BridgeError`)** | `Io(std::io::Error)` → `reset.io` / `Seed` → `reset.seed` / `Settings(SettingsError)` → `e.code()` 그대로(`settings.io`·`settings.invalid`·`settings.format`·`state.poisoned`) | 방식은 위와 같다(`code: e.code()`, `message: e.to_string()`). **위치: `src-tauri/src/bridge/types.rs`** — `AutostartError`·`TimerError`·`SoundError` 변환과 같은 파일(`error.rs`는 core 쓰기 가드 대상, 패킷 「변경 대상」). message에 경로·OS 원문이 없다(core `Display`에 `{0}` 없음 — 위 현황 메모 ①의 예외가 아니라 규칙 준수). `Settings(e)`는 `#[error(transparent)]`라 `SettingsError` 문구 그대로 |
| `tauri::Error` | → `tauri.error` | emit 실패, (v0.14) `spawn_blocking` 합류 실패 |
| `std::io::Error` | → `io.error` | — |
| ~~`tauri_plugin_autostart::Error`~~ | ~~→ `autostart.error`~~ | **(v0.14) 삭제** — 플러그인 제거(🔒 D-4) |

- (v0.14) v0.13까지의 「현황 불일치(확인 필요)」(계약 대문자 ↔ 실물 `영역.사유`)는 **해소** — D-3 A안(실물을 정본으로 올림). Rust·TS code 값 변경 없음(`autostart.cancelled` 추가·플러그인 변환 삭제 제외).

### 6.2 command별 발생 code (v0.14 정본, BRG-006)

| command | 발생 code |
|---|---|
| `get_settings` | `state.poisoned` |
| `set_settings` | `settings.invalid`, `settings.io`, `window.not_found`, `tauri.error`, `state.poisoned` |
| `get_asset_manifest` | `asset.io`, `asset.manifest` |
| `import_asset` | `asset.not_png`, `asset.bad_header`, `asset.not_rgba`, `asset.too_large`, `asset.too_many_bytes`, `asset.canvas_mismatch`, `asset.io`, `asset.manifest`, `tauri.error`(emit), `state.poisoned` |
| `remove_asset` | `asset.not_found`, `asset.io`, `asset.manifest`, `tauri.error`(emit), `state.poisoned` |
| `restore_default_asset`(v0.16) | `asset.no_default`, `asset.not_png`, `asset.bad_header`, `asset.not_rgba`, `asset.too_large`, `asset.too_many_bytes`, `asset.canvas_mismatch`, `asset.io`, `asset.manifest`, `tauri.error`(emit), `state.poisoned` |
| `export_default_assets`(v0.16) | `asset.export_dir` (파일별 실패는 반환값 `ExportReport.failed[].code` = `asset.io` — reject 아님) |
| `get_hand_anchor` | `state.poisoned` |
| `get_screen_bounds` · `get_monitors` | `window.no_monitor`, `tauri.error` |
| `get_overlay_position` · `open_settings_window` | `window.not_found`, `tauri.error` |
| `set_overlay_position` · `reset_overlay_position`(v0.14) · `set_overlay_visible` | `window.not_found`, `tauri.error`, `state.poisoned`, `settings.io` |
| `set_autostart` | `autostart.error`, `io.error`, `tauri.error`, `state.poisoned`, `settings.io` (**(v0.22) `autostart.cancelled` 폐기**) |
| `get_timer`(v0.21) · `set_resting`(v0.21) | `state.poisoned` (emit 실패는 경고 로그 — reject 아님) |
| `control_timer`(v0.21) | `timer.disabled`, `state.poisoned` (emit 실패는 경고 로그 — reject 아님) |
| `get_alarm_sound`(v0.23) · `remove_alarm_sound`(v0.23) | `sound.io` |
| `import_alarm_sound`(v0.23) | `sound.too_many_bytes`, `sound.not_audio`, `sound.io` (크기 오류가 형식 오류보다 먼저) |
| `reset_app_data`(v0.25) | **(v0.26) `reset.forbidden`**(0단계 — 호출 창이 settings가 아님, 다른 code보다 먼저), `reset.io`, `reset.seed`, `settings.io`, `state.poisoned` (이론상 `settings.invalid`·`settings.format` — `ResetError::Settings` 그대로 전달, 실제로는 나지 않음). 이벤트 emit·창 적용·리사이즈·위치·손 기준점·타이머·오버레이 새로고침 실패는 경고 로그 — reject 아님(`tauri.error`·`window.*` 없음, §5.10) |
| 모든 command · §5.4 래퍼 (TS) | `unknown`(형태 없는 실패 정규화) |

- 리사이즈·손 기준점 재계산 실패는 경고 로그만 남기고 command를 실패시키지 않는다(§5.1-5·§5.2-5) — 위 표에 없다. (v0.21) `set_settings` 7단계(타이머 끔) 실패도 같다 — `set_settings` 행 불변. (v0.25) `reset_app_data` 뒤처리 2~9단계 실패도 같다(§5.10).

## 7. capabilities (최소 권한)

- **v0.27: 추가 권한 없음(capabilities·`tauri.conf.json` 변경 없음 — 문서 정정).** CR-058부터 내장 기본음은 번들 정적 mp3(`src/assets/sounds/default-alarm.mp3`)라 CSP `media-src`의 `'self'`로 재생된다(v0.23에서 기본음용으로 연 `blob:`은 2026-09-29 `src/` 제품 코드 `createObjectURL`·`blob:` 사용 0건 — 테스트·문서만). `blob:` 제거 여부는 CSP 강화라 사용자 판단·메인 세션 몫이며 이번 정정 범위 밖(「확인 필요」로 보고).
- **v0.26: 추가 권한 없음(capabilities·`tauri.conf.json` 변경 없음 — 2026-09-27 확인).** `reset_app_data` 호출 창 제한(SEC-002)은 핸들러 0단계의 라벨 비교다(§5.10 「호출 창 제한」). `tauri::WebviewWindow` 주입 인자는 command 인자 주입이라 JS 창 API 권한이 필요 없다. **대안(보류)**: `src-tauri/build.rs`에 app manifest(`tauri_build::AppManifest`)를 두고 settings 창 capability에만 이 command를 허용하는 권한 층 차단 — 앱 command 권한 체계(목록 등록·창별 허용)를 새로 짜야 해서 이번 범위 밖. 심층 방어가 더 필요해지면 별도 요구로 올린다.
- **v0.25: 추가 권한 없음(capabilities·`tauri.conf.json` 변경 없음).** `reset_app_data`는 앱 command다 — `src-tauri/build.rs`가 `tauri_build::build()`뿐(app manifest 없음)이라 `generate_handler!` 1줄 등록만으로 허용된다(2026-09-27 실물 확인). 파일 삭제·시딩·표식 기록은 Rust 안에서만 하므로 `fs` 권한이 필요 없다. 오버레이 창 적용·리사이즈·이동·WebView 새로고침(`reload`)은 Rust가 직접 부르므로 JS 창 권한도 필요 없다. 이벤트는 기존 두 창 `core:default`로 받는다. 기본 그림은 기존 asset scope `assets/**` 안이라 scope 변경도 없다.
- **v0.23: 추가 권한 없음(capabilities 변경 없음).** `get_alarm_sound`·`import_alarm_sound`·`remove_alarm_sound`는 앱 command(`generate_handler!` 등록만으로 허용). `pickAudioFile`은 기존 `dialog:allow-open`(settings 창 — 필터만 다름). 사용자 소리는 기존 asset scope `$APPDATA/assets/**`(`assets/alarm.*`) 안이라 scope 변경 없음. `fs` 권한 불필요. `timer://changed` 구독은 기존 `core:default`.
  - **`tauri.conf.json` 변경 요청 2건(🔒 D-8·D-9 사용자 승인, 메인 세션 몫 — bridge-implementer는 고치지 않는다)**: ① `app.security.csp`에 `media-src 'self' asset: http://asset.localhost blob:`(사용자 소리 = asset URL, 기본음 = Blob URL) ② `app.windows`의 overlay·settings 두 항목에 **같은** `"additionalBrowserArgs": "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --autoplay-policy=no-user-gesture-required"`(Tauri 기본 인자 앞부분 포함 — 두 창이 WebView2 환경 하나를 공유하므로 인자가 달라서는 안 된다. 두 창은 `create: false`로 설정에서 만들어지므로 설정값이 적용된다).
  - **반영 상태(2026-09-26, bridge-designer가 `src-tauri/tauri.conf.json` 실물 확인)**: ① CSP 끝에 `media-src 'self' asset: http://asset.localhost blob:` 있음 ② overlay·settings 두 창에 같은 `additionalBrowserArgs` 문자열 있음 — **둘 다 반영 완료**. `connect-src`·`img-src`·asset scope 불변. 자동 재생 실측은 ui 패킷 스파이크 몫.
- **v0.22: 추가 권한 없음(capabilities·`tauri.conf.json` 변경 없음).** CR-047은 저장 절차(`settings::update`)와 자동 실행 권한 수준(`RunLevel=LeastPrivilege`, core `tray::autostart`) 변경뿐이다. 둘 다 Rust 안에서 끝나고 JS 쪽 창·플러그인 권한과 무관하다. `Cargo.toml`의 `windows` 기능(`Win32_UI_Shell`·`Win32_System_Registry`) 제거는 core 승격 코드 삭제에 딸린 것으로 core-implementer·메인 세션 몫(bridge 범위 밖).
- **v0.21: 추가 권한 없음(capabilities·`tauri.conf.json` 변경 없음).** `get_timer`·`control_timer`·`set_resting`은 앱 command(`build.rs`에 app manifest가 없어 `generate_handler!` 등록만으로 허용 — 등록은 `src-tauri/src/lib.rs`). `timer://changed` 구독은 두 창의 `core:default` 이벤트 권한으로 충분. 새 슬롯 PNG는 기존 asset scope `assets/**`(`assets/pomo_char.png`·`assets/pomo_bubble.png`). `fs` 권한 불필요.

(v0.14, BRG-002) **실물 capability 파일 기준으로 정리했다.** v0.13까지의 표(`core:event:default`·`core:window:allow-set-position`·`allow-show`·`allow-hide`·`allow-set-focus`·`autostart:default`)는 실물과 달랐다 — 창 이동·표시·포커스·크기는 전부 Rust command·core가 하므로 JS 창 권한이 필요 없고, 이벤트 구독은 `core:default`에 들어 있다. 추가·삭제는 bridge-manager 보고 → 사용자 승인 → **메인 세션이 파일 수정**(bridge-implementer는 capabilities를 만지지 않는다). 앱 command(§5)는 `build.rs`에 app manifest가 없어 `invoke_handler` 등록만으로 허용된다.

**v0.13 실물** — `src-tauri/capabilities/default.json` 하나, `"windows": ["overlay", "settings"]`(두 창 공유):

| 권한 | 이유 | v0.14 |
|---|---|---|
| `core:default` | 기본 창·앱·이벤트(`listen`·`unlisten` — §4 구독) | 유지(두 창) |
| `core:window:allow-start-dragging` | 오버레이 창 끌어 옮기기(드래그 이동, OV-R-13) | 유지 → overlay 창만 |
| `dialog:allow-open` | 이미지 파일 선택 `pickPngFile`(§5.4, 설정 창) | 유지 → settings 창만 |
| `autostart:default` | `tauri-plugin-autostart` | **삭제**(🔒 D-4 승인 — 플러그인 제거. `set_autostart`는 앱 command) |
| asset protocol scope: 앱 데이터 폴더의 `assets/**` | `AssetEntry.url` 로드(`tauri.conf.json` `app.security.assetProtocol`) | 불변 |

**v0.14 목표 (🔒 승인 2026-09-24 — 메인 세션 반영 대상)**: `core:window:allow-set-title`을 **settings 창 한정**(🔒 D-6, `setSettingsWindowTitle` §5.4)으로 주기 위해 창 라벨별 파일로 나눈다(bridge-design-strategy §9 「화면별로 필요한 것이 다르면 창 라벨로 나눈다」). `default.json`은 삭제하고 아래 두 파일로 대체한다.

`src-tauri/capabilities/overlay.json` (신규)
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "overlay",
  "description": "오버레이 창 — 끌어 옮기기만. 창 제어·설정·에셋은 Rust command 가 처리한다.",
  "windows": ["overlay"],
  "permissions": ["core:default", "core:window:allow-start-dragging"]
}
```

`src-tauri/capabilities/settings.json` (신규)
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "settings",
  "description": "설정 창 — 이미지 파일 선택·제목 표시줄 번역. 창 제어·설정·에셋은 Rust command 가 처리한다.",
  "windows": ["settings"],
  "permissions": ["core:default", "dialog:allow-open", "core:window:allow-set-title"]
}
```

- 분리의 부수 효과(최소 권한 강화): 오버레이 창에서 `dialog:allow-open`, 설정 창에서 `allow-start-dragging`이 빠진다. **확인 필요(메인 세션, 반영 전)**: `grep -rn "startDragging\|pickPngFile\|data-tauri-drag-region" src`로 반대 창 사용 0을 확인한다(`src/main.tsx`의 `getCurrentWindow` 사용 포함 — BRG-004). `tauri.conf.json`이 `app.security.capabilities`로 파일을 명시 나열하면 목록도 함께 고친다. 분리를 원하지 않으면 동등안: `default.json`에서 `autostart:default`만 삭제하고, `core:window:allow-set-title`만 담은 `settings-title.json`(`"windows": ["settings"]`)을 추가한다(Tauri는 같은 창에 걸린 capability를 합친다).
- (v0.14) 위치 잠금·작업표시줄(SV2-03·04)은 **JS 권한 추가 없음** — Rust가 `set_ignore_cursor_events`·`set_skip_taskbar`를 직접 부른다(v0.4 리사이즈와 같은 근거). `reset_overlay_position`은 앱 command라 권한 추가 없음. 새 event 없음.

`fs` 권한은 주지 않는다. 파일 접근은 전부 Rust command 안에서 한다.

- **v0.3: 추가 권한 없음.** `get_hand_anchor`는 앱 command(`build.rs`에 app manifest가 없어 `invoke_handler` 등록만으로 허용), `assets://hand-anchor-changed` 구독은 `core:default`에 들어 있는 이벤트 권한으로 충분하다. 손 기준점 해독은 Rust가 앱 데이터 폴더 파일을 직접 읽으므로 `fs`·asset scope 변경도 없다. R-13 이동 감시(`on_window_event`)는 Rust 쪽이라 창 권한 추가가 없다.
- **v0.4: 추가 권한 없음.** 오버레이 리사이즈(OV-R-03)는 Rust가 `set_size`를 직접 부르므로 JS 창 권한(`core:window:allow-set-size`)이 필요 없다. 새 command·event가 없어 `invoke_handler` 등록·이벤트 권한도 그대로다.
- **v0.5: 추가 권한 없음.** `set_settings` 위치 불간섭(OV-R-13)은 Rust 핸들러 안의 병합·호출 순서 변경뿐이다. 창을 옮기는 호출이 오히려 하나 줄어든다.
- **v0.9: 추가 권한 없음.** `get_monitors`는 앱 command(`invoke_handler` 등록만으로 허용 — v0.3과 같은 근거). 모니터 조회는 Rust가 `available_monitors()`를 직접 부르므로 JS 창 권한(`core:window:allow-available-monitors`)이 필요 없다. `MouseSettings.area`는 기존 `get_settings`·`set_settings`·`settings://changed` 페이로드의 필드 변경뿐이다.
- **v0.10: 추가 권한 없음.** 삭제만 있다(`Settings.slam`·`AssetSlot` `'slam'`). 새 command·event 없음, asset scope 불변(`assets/slam.png`는 남지만 매니페스트에 없어 `url`이 발급되지 않는다).
- **v0.11: 추가 권한 없음.** 새 command·event 없음. `input://keyboard` 페이로드 필드 추가와 기존 `import_asset`·`remove_asset` 인자 값(슬롯) 7개 증가뿐이다. asset scope `assets/**`가 `assets/key_*.png`를 포함한다. 키 분류는 Rust hook 안에서만 하므로 JS 쪽 권한 변화도 없다.
- **v0.12: 추가 권한 없음.** 새 command·event 없음. 기존 `input://keyboard` 페이로드에 필드 하나(`repeat`)를 더할 뿐이고, 자동 반복 판정은 Rust hook 안에서만 한다.
- **v0.16: 추가 권한 없음(capabilities·`tauri.conf.json` 변경 없음).** `restore_default_asset`·`export_default_assets`는 앱 command(`invoke_handler` 등록만으로 허용 — `lib.rs` 등록은 core 몫). `pickFolder`의 `open({ directory: true })`는 기존 `dialog:allow-open`(settings 창)으로 허용된다(plugin-dialog 2.7.3 acl `commands.allow ["open"]`, bridge-survey Q5) — 실측에서 거부되면 bridge-implementer는 멈추고 보고(권한 추가는 메인 세션 몫). 내보내기 파일 쓰기는 Rust command 안에서만 하므로 `fs` 권한 불필요, 파일명은 내장 표로 고정. 내장 그림은 `include_bytes!`라 asset scope·resources 변경 없음(시딩·복원 결과는 기존 `assets/**`).

## 8. 변경 이력

| 버전 | 일자 | 변경 | 호환성 |
|---|---|---|---|
| v0 | 2026-09-22 | 초안. 확정사항 §3~§6에서 도출한 이벤트 5·command 11·타입 6·에러 코드 8 | 신규 |
| v0.1 | 2026-09-23 | `input://keyboard`에 `heldCount` 추가(비파괴). `Settings.slam`을 `{count,windowMs,durationMs}`→`{keys,durationMs}`로 교체(**파괴** — 저장된 settings.json은 기본값으로 복구됨). 마우스 파츠에 레이어 이동 모드(캔버스 크기) 허용 — 몸통 아래 z=0, 어깨 축 회전. `MouseSettings.hand: Point \| null`(회전 기준 = 그린 손 위치, 선택, 서버 `#[serde(default)]`) 추가(비파괴) | 변경 |
| v0.2 | 2026-09-23 | `Settings` 기본값의 `mouse`가 `null`→기본 마우스 설정(예시 몸통 기준)으로. `set_settings`의 자동 실행 반영을 멱등으로(현재 상태와 같으면 건드리지 않음 — 미등록 상태 해제 시 os error 2로 저장 전체가 실패하던 결함 수정) | 변경 |
| v0.3 | 2026-09-23 | CR-007(OV-R-10): command `get_hand_anchor`·event `assets://hand-anchor-changed`·타입 `HandAnchorEvent` 신규(§3.6, §4, §5), `set_settings`·`import_asset`·`remove_asset`에 기준점 재계산 부수 효과(§5.1) — **추가**. 기본 `mouse.hand` `{495,570}`→`null`, `hand` 의미를 "자동 기준점 폴백"으로(§3.3) — **비파괴**(필드·타입 동일, 기존 settings.json 마이그레이션 없음). R-13(OV-R-13): 드래그 위치 저장 후 `settings://changed` emit(§4) — **추가**. 에러 코드 `STATE_POISONED`, `From<WindowError>` 변환(§6, §6.1) — **비파괴**. 결함 정정: §3.3 Rust `MouseSettings.hand` 누락·TS 주석 깨짐, §6 message의 폐기 규격 1024×592 → 900×700, 머리말 버전 표기(v0.1 → v0.3) — **비파괴** | 추가·비파괴 |
| v0.4 | 2026-09-23 | OV-R-03(core window.md §2.2·§4·§9.1): `set_settings`의 리사이즈 설명을 core 크기 규칙으로 정정("표시 크기(캔버스×배율)" → 논리 px, 450×350 상자에 비율 유지 fit × 배율, 여백 없음)하고 처리 순서(저장 → scale 변경 시 리사이즈 → `settings://changed`)·실패 시 경고 로그·명령 성공을 명시. `import_asset`·`remove_asset`에 캔버스 레이어 슬롯이면 `assets://changed` emit 전 리사이즈 부수 효과 추가. §5.2 신설(리사이즈 규칙·앱 시작 순서 — 리사이즈가 위치 복원보다 먼저). 새 command·event·타입·에러 코드·권한 없음 — **비파괴**(시그니처·페이로드·이벤트 불변). 폐기 요구ID `OV-R-10`(CR-008로 대체) 참조를 `OV-R-14`로 교체(§3.3·§3.6·§4·§5·§5.1·§9. 이력 행 v0.3은 기록이라 그대로 둠) — **비파괴** | 비파괴 |
| v0.5 | 2026-09-23 | OV-R-13 위치 불간섭(사용자 신고 "옮겨 둔 뒤 Ctrl+휠 → 기본 자리로 튐", core window.md §2.1.1·§9.3·D17~D20): `set_settings`가 입력 `overlay.x/y`를 무시하고 core 현재값을 저장·반환·emit, 창 위치를 바꾸지 않음(`visible`만 적용). 처리 순서 1~6(위치 병합 2회 포함)을 §5.3에 통합하고 §5 표·§5.2-6을 맞춤. §3.3 `OverlaySettings` x/y 설명 갱신. §5.2-5 매니페스트 읽기 실패 시 `canvas = null`로 리사이즈 계속(앱 시작과 동일)으로 확정(v0.4 확인 필요 해소). 새 command·event·타입·필드·에러 코드·권한 없음 — **비파괴**: 타입·필드·필수 여부·이름·반환 타입이 같고, 창을 옮기려고 `set_settings`를 부르는 ui 호출자가 없다(`src/overlay/index.tsx:114`·`src/settings/components/MousePartsTab.tsx:49` 모두 사본 펼침), "적용된 값 반환" 의미도 유지(적용된 x/y = core 현재값) | 비파괴 |
| v0.6 | 2026-09-23 | OV-R-17 배경 레이어(🔒 확정사항 §4 「배경」 행, core assets.md §3.4·§9.4): §3.1 TS `AssetSlot`에 `'background'`(맨 앞)·Rust `SimpleSlot::Background`(첫 변형)·JSON 예시 `"background"`·슬롯 표 행(배경 \| 캔버스 \| 선택). §3.2 `canvas` 주석 "첫 상태 레이어" → "첫 캔버스 레이어(배경 포함), 배경만 있으면 배경 크기". §5 `import_asset`·`remove_asset` 설명(`background` 허용, 기존 에러 코드 그대로)·요구ID. §5.1-3 재계산 안 함에 `background` 등록·삭제. §5.2-2 ③ 리사이즈 대상에 `background`. 새 command·event·타입·필드·에러 코드 없음(§6 불변 — 배경도 기존 `ASSET_*`·`IO_ERROR`를 기존 조건으로 낸다), **추가 권한 없음**(§7 불변 — 기존 command 인자 값 하나 증가, asset scope `assets/**`가 `assets/background.png` 포함). 호환성 **확장·비파괴**: 기존 값·직렬화 형태(untagged 문자열)·시그니처·페이로드 형태 불변. ui에 `AssetSlot` 전수 분기(`switch`·`never`·`Record<AssetSlot,…>`)가 없어(`src/` grep — `slotKey`·`findEntry` 문자열 비교뿐) ui는 `background`를 몰라도 동작. 단 `background` 항목이 든 `manifest.json`을 이전 빌드가 읽으면 역직렬화 실패(`load_manifest` = `Err(Manifest)`) — 배포 전·1인 개발이라 기록만(core assets.md §9.4) | 추가·비파괴 |
| v0.7 | 2026-09-23 | OV-R-17 확정(`src/overlay/requirements.md` v1.4): 머리말·§5·§8 v0.6 행·§9의 `OV-R-17(예정)` → `OV-R-17`, 머리말의 「(예정)」 표기 설명 삭제. §6 `ASSET_CANVAS_MISMATCH` message 예 "이미지 크기가 기존 이미지(900×700)와 다릅니다." → "배경·몸통 등 캔버스 그림은 모두 같은 크기여야 합니다."(메인 세션 결정, 문구만). 코드·발생 조건·command·event·타입·필드·권한 불변 — **비파괴**(message 문구) | 비파괴 |
| v0.8 | 2026-09-23 | OV-R-18 마우스 파츠 한 모드·OV-R-19 몸통 선택(🔒 사용자 결정, 확정사항 §3·§4, `src/overlay/requirements.md` v1.5, core assets.md §9·settings.md). ① §3.3 `MouseSettings.partPos: Point` 추가(캔버스 좌표, 기본 (389, 492), Rust `#[serde(default = "default_part_pos")]`) — TS **필수 필드 추가(파괴)**, 저장 데이터 호환(누락 시 기본값) ② `armWidth`·`armColor` 삭제·검증 `armWidth > 0` 삭제 — TS **필드 삭제(파괴 — ui 팔 곡선 코드 제거 필요)**, 저장 데이터 호환(옛 키 무시, `deny_unknown_fields` 금지), 검증 완화 ③ §3.6 기준점 = 그림 좌표 + `partPos`(캔버스 좌표), `null` 조건에서 손바닥 모드 삭제 — 값 형태 불변(비파괴) ④ §5 `set_settings`·§5.1-2 ④·§5.3 2·6단계 재계산 트리거에 `mouse.partPos` 변경 추가, §5.1-4 `compute_hand_anchor` 인자 `part_pos` 추가 — 부수 효과 추가 ⑤ §3.1 마우스 파츠 ≤900×700·1MB·3장 같은 크기·캔버스 일치 없음, §3.2 주석, §5 `import_asset` 설명, `body` 필수 → 선택 — 검증 완화(비파괴) ⑥ §6 `ASSET_TOO_LARGE` 발생 문구, `ASSET_CANVAS_MISMATCH` 발생 문구·마우스 파츠 message 예, §6.1 `MousePartMismatch` → `ASSET_CANVAS_MISMATCH` — 비파괴(새 코드 없음). 새 command·event·타입·에러 코드 없음, **추가 권한 없음**(§7 불변 — 기존 페이로드의 필드와 Rust 내부 검증만 바뀜). **전환 위험: core·bridge(Rust·TS)·ui를 한 묶음으로 반영**(§3.3 「전환 위험」). 영향 ui 지점은 §9 v0.8 「파괴 영향」 — **bridge(Rust·TS) 구현 완료 (2026-09-23)**, ui(팔 곡선 제거·`partPos` 배치)는 별도 인계 대상 | **파괴**(TS 타입)·저장 데이터 호환 |
| v0.9 | 2026-09-23 | CR-017·CR-018 이동 영역·모니터별 매핑(🔒 사용자 결정, 확정사항 §3 「이동 영역·팔 늘어나기」, core settings.md §9·window.md §2.3·§9.4). ① §3.3 `MouseSettings.area: [Point, Point, Point, Point]` 추가(캔버스 좌표, [왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래], 기본 [(375,525),(495,525),(495,625),(375,625)] — 실측 손 기준점 (435, 575) 중심(메인 세션 정정 2026-09-23), Rust `[Point; 4]` + `#[serde(default = "default_area")]`)·「`area` 의미」·기본값 표·JSON 예시 — TS **필수 필드 추가(파괴)**, 저장 데이터 호환(누락 시 기본값) ② `pad` 삭제, Rust `Rect`·TS `Rect` 삭제 — **필드·타입 삭제(파괴 — ui 매핑 교체 필요)**, 저장 데이터 호환(옛 `pad` 무시, 변환 없음) ③ 검증 `pad.width/height > 0` → `area` 네 점 유한수 — 사실상 완화(비파괴) ④ 기준점 폴백 ③ 패드 중심 → 이동 영역 중심(네 점 평균)(§3.3 `hand` 의미·§5 `get_hand_anchor`) — 설명·ui 로직 ⑤ §5.1-3 재계산 안 함 `mouse.pad` → `mouse.area`(bridge 재계산 조건 코드 불변) ⑥ command `get_monitors() -> ScreenBounds[]` 신규(§5 — 모니터 전체 사각형·물리 px·가상 화면 좌표·빈 목록 `WINDOW_ERROR`, 래퍼 `getMonitors`), §3.4 `ScreenBounds` 주석·Rust·JSON 예시 — **추가**. 모니터 구성 변경 event 없음(ui 재조회) ⑦ `get_screen_bounds` 제거 후보 표기(동작 불변) ⑧ §3.3 「옛 settings.json 호환」·「전환 위험 (v0.9)」. 새 에러 코드 없음(`WindowError::NoMonitor` → 기존 `WINDOW_ERROR`). **추가 권한 없음**(`get_monitors`는 앱 command — `invoke_handler` 등록만, 모니터 조회는 Rust `available_monitors()`라 JS 창 권한 불필요). **전환 위험: core·bridge(Rust·TS)·ui 한 묶음**(`get_monitors`만은 단독 선반영 가능). 요구ID `OV-R-20`·`OV-R-21`·`ST-R-15`~`ST-R-17`(§9). 폐기 요구 재매핑 `OV-R-14` → `OV-R-21`, `ST-R-09` → `ST-R-17`(머리말·본문·§9. 이력 행 제외) — 비파괴(문서 표기). ⑨ §3.6 `null` 폴백 문구, §6 `WINDOW_ERROR`·`SETTINGS_INVALID` 발생·message 예, §6.1 `get_monitors` 변환, §7 v0.9 줄 — 비파괴. **bridge(Rust·TS) 구현 완료 (2026-09-23, bridge-implementer)** — `get_monitors` 핸들러(`src-tauri/src/bridge/commands.rs`), TS `MouseSettings.area`·`DEFAULT_MOUSE_SETTINGS.area`·`getMonitors`(`src/bridge/types.ts`·`commands.ts`), `Rect`(Rust·TS) 삭제. `invoke_handler` 등록(`src-tauri/src/lib.rs`)은 core 소관이라 가드에 막혀 core 변경 요구로 별도 보고함(등록 전까지 `get_monitors`는 JS에서 호출 불가) | **파괴**(TS 타입)·저장 데이터 호환·추가(command) |
| v0.10 | 2026-09-24 | CR-019·CR-020 쾅(키연타) 메커니즘 폐기(🔒 사용자 결정 2026-09-24, 확정사항 §4·§5·§6, core settings.md §9.0·assets.md §9.5). 폐기 요구 `OV-R-06`·`ST-R-05`(대체 없음). ① §3.3 `Settings.slam`·`SlamSettings`(TS·Rust)·TS `DEFAULT_SETTINGS.slam` 삭제, 검증 `slam.keys ≥ 2`·`slam.durationMs ≥ 50` 삭제, 옛 파일 호환 행 — TS **필드 삭제(파괴)**, 저장 데이터 안전(옛 `slam` 키 무시), IPC 런타임 비파괴, 검증 완화 ② §3.1 TS `AssetSlot` `'slam'`·Rust `SimpleSlot::Slam` 삭제, 슬롯 표 필수 4장(`kb_up`, `kb_down` 0+, `idle`, `rest`), v0.8 확인 필요(일반 상태 필수 여부) 해소, 「옛 매니페스트 호환」 — TS **값 삭제(파괴)**, **IPC 파괴**(옛 ui가 `import_asset`/`remove_asset`에 `'slam'`을 보내면 새 Rust에서 명령 인자 역직렬화 실패), 저장 데이터 안전(옛 manifest.json의 `slam` 항목은 건너뛰고 읽음, `slam.png` 보존) ③ §6 `IO_ERROR`·§6.1 `AssetError::Manifest` 발생 범위를 최상위 구조 손상으로 축소 — 비파괴(완화) ④ §4 `input://keyboard` `heldCount` 설명 "쾅 판정용" → "키보드 누름 표시용 — 0이면 들림" — 비파괴(페이로드 불변) ⑤ §5.1-3 「쾅」·§5.2-2 ③ `slam` 삭제 — 설명만(`is_canvas_layer()` 판정 그대로, bridge 재계산·리사이즈 코드 불변). 새 command·event·타입·에러 코드 없음, **추가 권한 없음**(§7). **전환 위험: core·bridge(Rust·TS)·ui 한 묶음**(§3.3 「전환 위험 (v0.10)」). 파괴 영향 ui 지점 §9 v0.10. **bridge(Rust·TS) 구현 완료 (2026-09-24, bridge-implementer)** — Rust `types.rs`(`SlamSettings` 재노출·문서주석 삭제)·`events.rs`(`heldCount` 문서주석 수정), TS `types.ts`(`SlamSettings`·`Settings.slam`·`DEFAULT_SETTINGS.slam`·`AssetSlot` `'slam'`·`heldCount` 주석). core `settings::SlamSettings`·`assets::SimpleSlot::Slam` 삭제는 core-implementer 선행 완료 상태였음(이 세션에서 확인만) | **파괴**(TS 타입·IPC `'slam'` 인자)·저장 데이터 안전 |
| v0.11 | 2026-09-24 | CR-021 특수 키 이미지(🔒 사용자 결정 2026-09-24, 확정사항 §5 「특수 키 이미지」, `src/overlay/requirements.md` v1.8 OV-R-22, core hook.md §9 B1~B9·assets.md §9.6). ① §3.7 신설 — 타입 `SpecialKey`(`'space' \| 'z' \| 'question' \| 'exclamation' \| 'enter' \| 'backspace'`, Rust = `crate::hook::SpecialKey` 재노출)·`KeyboardInputEvent.special: SpecialKey \| null`(TS **필수**, Rust `Option<SpecialKey>`에 `skip_serializing_if` 없음 — 항상 포함), 뗌 = 누를 때 값, 누름을 못 본 뗌·6종 밖 = `null`, 대응 표·전환 위험 — IPC 런타임 **추가·비파괴**(옛 ui는 모르는 필드를 무시. 이벤트 페이로드라 읽는 쪽 코드는 그대로 컴파일 — `src/`에 `KeyboardInputEvent`를 명시 타입으로 만드는 픽스처 없음, grep 2026-09-24) ② §4 `input://keyboard` 페이로드·설명·요구ID — 이름·빈도 불변 ③ §3.8 신설 — 키보드 입력 개인정보 규칙(키 코드·스캔 코드·문자는 계약에 없음, bridge·ui는 키보드 이벤트를 로그·저장·전송하지 않음) ④ §3.1 TS `AssetSlot`·Rust `SimpleSlot`에 `key_space`·`key_z`·`key_question`·`key_exclamation`·`key_enter`·`key_backspace`(캔버스 레이어·선택, 대응 규칙 `key_{special}`)·JSON 예시·슬롯 표 행 — **추가**(untagged 문자열 형태 불변) ⑤ §5.2-2 ③ 리사이즈 대상에 `key_*` — 설명만(`is_canvas_layer()` 판정·bridge 코드 불변). 새 command·event·에러 코드 없음(§6 불변 — 특수 키 슬롯도 기존 `ASSET_*`·`IO_ERROR`를 기존 조건으로 낸다), **추가 권한 없음**(§7). core hook·assets·bridge(Rust·TS) 한 묶음(§3.7 「전환 위험」). ⑥ (같은 날 🔒 사용자 결정, 확정사항 §5 7종) `SpecialKey`에 `'undo'`(Ctrl+Z 「뒤로가기」) 추가, Ctrl을 누른 채 누른 Z 외 키는 `null`(Ctrl 눌림 여부는 따로 내보내지 않음), `AssetSlot` `key_undo`·Rust `SimpleSlot::KeyUndo`(캔버스 레이어·선택), 대응 규칙 `key_{special}` 불변 — **추가**. 위 ①·④의 6종·6개는 7종·7개로 읽는다. core hook.md(J9 「Ctrl+Z도 `Z`」)·assets.md 미반영 — core 선행 필요(§3.7). 소스 미적용 | 추가·비파괴 |
| v0.12 | 2026-09-24 | CR-023 키 꾹 누름 부르르(🔒 사용자 결정 2026-09-24, 확정사항 §4 키보드 파츠 행, `src/overlay/requirements.md` v2.1 OV-R-24, core hook.md §3.5 A1~A7·§9.2 RB1~RB9 — core 문서의 임시 `R-tmp-1` = OV-R-24). ① §3.7 TS `KeyboardInputEvent.repeat: boolean`(**필수**)·Rust `KeyboardPayload.repeat: bool`(`skip_serializing_if` 없음 — 항상 포함, 필드 순서 `pressed, held_count, special, repeat, ts` = `InputEvent::Keyboard`), §3.7 JSON 예시 전부에 `"repeat": false`, 의미 표 「같은 키 자동 반복」 이벤트 없음 → `repeat: true`(`special` 처음 값) ② §3.7.1 신설 — 의미 표(반복 = `pressed: true`·`heldCount` 불변·`special` 처음 값, 뗌 = 항상 `false`, 뗀 뒤 재누름 = `false`, 수식 키 단독 반복 포함)·JSON 예시·빈도(스로틀 없음, 간격 33~400ms)·멈춤 이벤트 없음(ui는 뗌 또는 타임아웃)·ui 요구(RB5)·전환 위험 ③ §3.8 1~3에 `repeat`(한 비트, 로그·저장·누적 금지) ④ §4 `input://keyboard` 페이로드·빈도·설명·요구ID — 이벤트 이름 불변(🔒 필드 추가 방식, 새 event 없음). 새 command·event·타입·에러 코드 없음(§6 불변), **추가 권한 없음**(§7). 호환성: IPC 모양 **추가**(옛 ui는 모르는 필드 무시), **의미 파괴**(`pressed: true`가 누르고 있는 동안 반복해서 옴 — 옛 ui는 누름 프레임 순환 오동작) → ui 선행 또는 core hook·bridge(Rust·TS)·ui 한 묶음(§3.7.1 「전환 위험」). TS 필수 필드라 `KeyboardInputEvent` 리터럴 픽스처에 `repeat` 필요. ⑤ (같은 날 🔒 사용자 결정, 확정사항 §4 3행) 수식 키(좌우 Shift·Ctrl·Alt·Win)만 꾹 누를 때는 떨지 않는다 — hook이 수식 키의 자동 반복을 이벤트로 내지 않는다(`repeat: true` 이벤트 자체가 없음, 수식 키 첫 누름·뗌은 기존대로). ②의 「수식 키 단독 반복 포함」은 이 결정으로 정정한다 — §3.7 의미 표 행·§3.7.1 의미 표·JSON 예시·§9 v0.12 행 정정. core hook.md §3.5 A6·T17이 아직 「수식 키도 `repeat: true`」라면 core 선행 필요. 소스 미적용 | 추가(모양)·**의미 파괴**(ui 선행 필요) |
| v0.13 | 2026-09-24 | CR-024 펜 쥔 손 파츠(🔒 사용자 결정 2026-09-24, 확정사항 §3 「펜 쥔 손 파츠」, `src/overlay/requirements.md` v2.2 OV-R-25·`src/settings/requirements.md` v1.6 ST-R-18, core assets.md §3.8·§9.7·settings.md §3.1.1·§9.4 — core 문서의 임시 `R-tmp-4` = OV-R-25·ST-R-18). ① §3.1 TS `AssetSlot`에 `'pen_up'`·`{ kind: 'pen_down'; index: number }`·`'pen_key_space'`·`'pen_key_z'`·`'pen_key_question'`·`'pen_key_exclamation'`·`'pen_key_enter'`·`'pen_key_backspace'`·`'pen_key_undo'`, Rust `SimpleSlot` 8변형(`PenUp`·`PenKey*` 7)·`PenDownKind`(`"pen_down"`)·`AssetSlot::PenDown { kind, index }`, JSON 예시, 슬롯 표 행(세 번째 그룹 — ≤900×700·≤1MB, 펜 그림끼리 같은 크기, 캔버스 레이어 아님, 선택, 대응 `pen_key_{special}`), 크기 일치 그룹 셋·옛 매니페스트 호환·전환 위험 — IPC 값·저장 데이터 **추가** ② §3.1 TS 슬롯 도우미 고정: `slotKey` = `${kind}_${index}`(Rust `file_key`와 같은 규칙), `isKbDownSlot` → `kind === 'kb_down'`, `isPenDownSlot`·`PenDownSlot` 신규, `isMousePartSlot` → 문자열 판정 — 기존 값 결과 불변, `pen_down`을 `kb_down_N`으로 오인하는 결함 방지(TS 로직 수정) ③ §3.3 `MouseSettings.penPos: Point \| null`(캔버스 좌표, 쉬는 자세 기준, 기본 `null`, Rust `Option<Point>` + `#[serde(default)]`·항상 키 전송)·기본값 표·JSON 예시·「`penPos` 의미」·옛 파일 호환·전환 위험 — TS **필수 필드 추가(파괴)**, 저장 데이터 호환, 검증 추가 없음 ④ §5.1-3 재계산 안 함에 펜 그림 등록·삭제·`mouse.penPos` 변경, §5.2-2 ③·3 리사이즈 대상 아님 — 설명만(`is_canvas_layer()`·재계산 조건 코드 불변) ⑤ §6 `ASSET_TOO_LARGE`·`ASSET_CANVAS_MISMATCH`에 펜 그룹(`PenPartMismatch` → 기존 `asset.canvas_mismatch`)·message 예 — 비파괴(새 코드 없음). 새 command·event·에러 코드 없음, **추가 권한 없음**(§7 불변 — 기존 `import_asset`·`remove_asset` 인자 값 증가와 `Settings.mouse` 필드 하나. asset scope `assets/**`가 `assets/pen_*.png` 포함. 이 행으로 §7 v0.13 줄을 갈음). **전환 위험: core(assets·settings)·bridge(Rust·TS)·ui 한 묶음**(§3.1·§3.3 「전환 위험 (v0.13)」 — 옛 ui + 새 Rust는 저장된 `penPos`를 지우고, 새 ui + 옛 Rust는 펜 슬롯 인자 오류). 파괴 영향 ui 지점 §9 v0.13. 소스 미적용 | 추가(IPC 값·저장 데이터)·**파괴**(TS 타입 — 필수 필드·합집합 객체 변형)·반영 순서 한 묶음 |
| v0.14 | 2026-09-24 | settings-v2 설정 창 개편(🔒 사용자 결정 2026-09-24, 확정사항 §6, 02-design D-1~D-10, 패킷 `settings-v2-03-packet-bridge.md`, 요구 SV2-02~08·SV2-11·12). ① §3.3 `Settings.language: Language`(`'ko' \| 'ja' \| 'en'`, 기본 `'ko'`, 알 수 없는 값 → `'ko'`)·`positionLock: boolean`·`showInTaskbar: boolean`(기본 `false`), Rust = core `settings` 정의(컨테이너 `#[serde(default)]` 표기 정정 포함) — IPC·저장 데이터 **추가**, TS **필수 필드 3개(파괴 — `Settings` 리터럴 픽스처)** ② §5·§5.3 `set_settings`: 입력 `autostart` 무시(core 소유 필드 병합에 포함, 2·5단계), 4단계 자동 실행 반영 삭제, 위치 잠금·작업표시줄 적용 — **파괴 가능 변경(의미)**: 시그니처·타입 불변. 하위 호환 전략: 현행 ui는 `set_settings`로 `autostart`를 바꾼 적이 없어(설정 창 R-06 보류, 호출자 두 곳은 사본 펼침) 동시 지원 기간 불필요 — 자동 실행을 바꾸는 유일한 경로는 `set_autostart`로 고정 ③ §5·§5.5 `set_autostart`: 시그니처 불변, **구현 교체**(레지스트리 Run(plugin) → 작업 스케줄러 가장 높은 권한 + UAC), `async` + 별도 스레드, 수 초~수십 초 소요 명시, 새 code `autostart.cancelled` — 비파괴(code 추가)·동작 교체 ④ §5·§5.6 `reset_overlay_position() -> Position` 신규 — **추가** ⑤ §3.1 필수 3장(`kb_up`·`kb_down_0`·`mouse_base`, `idle`·`rest` 선택)·TS `REQUIRED_SLOTS`·`isRequiredSlot` — 추가(TS)·안내 기준 변경(core 검사 없음 — 비파괴) ⑥ §3.2 `AssetEntry.url` 버전 규칙(불투명, 교체 시 변경, 현재 `?v={수정 시각 ms}` — core 실측 대기) — 비파괴(값 규칙) ⑦ §3.4 TS `Position` 실제 정의·`getOverlayPosition` 반환 표기 `Point` → `Position` — 비파괴(모양 동일, BRG-012) ⑧ §5.4 TS 전용 래퍼 명문화: `pickPngFile(title?)` 선택 인자·실패 정규화, `setSettingsWindowTitle(title)` 신규(D-6) — 추가 ⑨ §6·§6.1·§6.2 에러 code 정본을 실물 `영역.사유`로(D-3 — 대문자는 별칭 열), 빠졌던 code(`asset.*` 세부·`settings.format`·`io.error`·`tauri.error`·`unknown`) 등재, command별 표 신설, §5 `get_settings`(`state.poisoned`, 메모리 복제)·`set_settings`·창 command 에러 열 실물화(BRG-006), `From<tauri_plugin_autostart::Error>` 삭제·`From<AutostartError>` 신규, 현황 메모(message 내부 원문·`kb_down` 불연속 미검사) — 문서 정정(실물 불변)·비파괴 ⑩ §4 `settings://changed` 발신 지점(`set_autostart`·`reset_overlay_position`·앱 시작 자동 실행 조회 보정), ui 「구독 먼저 → `get_settings`」 — 새 event 없음 ⑪ §7 capabilities 실물 기준 정리(BRG-002), `autostart:default` 삭제, `core:window:allow-set-title` settings 창 한정(창별 파일 분리안) — 파일 수정은 메인 세션 ⑫ §5.1-3 재계산·리사이즈 안 함에 새 필드·`reset_overlay_position`·`set_autostart` ⑬ 머리말 상태 정정(v0.13까지 소스 반영 — BRG-003. v0.11~v0.13 행의 「소스 미적용」은 당시 기록). 요구ID는 아키텍처 ID `SV2-xx`(화면 ID 확정 시 `ST-R-xx`로 교체, §9). **구현 완료 (2026-09-24)** — bridge Rust·TS 반영, `cargo fmt --check`·`cargo clippy -D warnings`·`cargo test`(211 pass)·`yarn test --run src/bridge`(36 pass) 확인. `From<AutostartError>`는 가드가 `error.rs`를 막아 `src-tauri/src/bridge/types.rs`에 둠(§9 v0.14 「영향 지점」 참고), `lib.rs` 두 변경(`invoke_handler` 등록·플러그인 삭제)은 core/메인 세션 잔여 작업 | 추가·**파괴**(TS 필수 필드 3개)·**파괴 가능 변경**(`set_settings` `autostart` 무시 — 실사용 영향 없음)·비파괴(code 추가·문서 정정) |
| v0.15 | 2026-09-24 | CR-033 펜 손 사용 토글(🔒 사용자 결정 2026-09-24, 확정사항 §3 「펜 손 사용 토글」 — 화면 요구ID 미부여). ① §3.3 `MouseSettings.penMode: boolean`(기본 `false`, Rust `pen_mode: bool` + `#[serde(default)]`·`skip_serializing_if` 없음 — 항상 키 전송)·기본값 표·JSON 예시·「`penMode` 의미」·옛 파일 호환·전환 위험 — IPC·저장 데이터 **추가**, TS **필수 필드 추가(파괴 — `MouseSettings` 전체 리터럴 픽스처)**, 검증 추가 없음 ② §5.1-3 재계산 안 함에 `mouse.penMode` — 설명만(재계산·리사이즈 조건 코드 불변). 새 command·event·타입·에러 코드 없음(`set_settings`·`settings://changed` 재사용), **추가 권한 없음**(§7 불변). core 변경 요구(`settings::MouseSettings.pen_mode`·`default_mouse()`) 선행. **전환 위험: core settings·bridge(Rust·TS)·ui 한 묶음**(옛 ui + 새 Rust는 켜 둔 `penMode`를 지운다). 파괴 영향 ui 지점 §9 v0.15. 소스 미적용 | 추가(IPC·저장 데이터)·**파괴**(TS 필수 필드)·반영 순서 한 묶음 |
| v0.16 | 2026-09-24 | CR-035 기본 이미지 세트(🔒 사용자 결정 2026-09-24 U-1 = B·U-2 = B·U-5 = A, 02-design, 패킷 `default-assets-03-packet-bridge.md`, 요구 DA-01~03·DA-05~07). ① command `restore_default_asset(slot) -> AssetManifest` 신규(§5·§5.7 — 후처리·이벤트 = `import_asset`) — **추가** ② command `export_default_assets(dir, overwrite) -> ExportReport` 신규(이벤트 없음, 파일별 실패는 반환값)·타입 `ExportReport`·`ExportFailure`(§3.2.1, core 재수출) — **추가** ③ TS `DEFAULT_ASSET_SLOTS`(15, core `DEFAULT_ASSETS` 사본)·`hasBuiltinDefault`(§3.1) — **추가** ④ TS 래퍼 `pickFolder(title?)`(§5.4, 기존 `dialog:allow-open`) — **추가**, 권한 추가 없음 ⑤ 에러 code `asset.no_default`·`asset.export_dir`(§6·§6.1·§6.2) — **비파괴**(code 추가) ⑥ `MouseSettings.penPos` 기본 `null` → `{x:380, y:496}`(§3.3 TS 주석·기본값 표·JSON 예시·「`penPos` 의미」, Rust `default_mouse()`와 1:1) — **비파괴**(모양·필수 여부·검증 불변, `penPos` 키 없는 옛 파일은 계속 `null`) ⑦ 첫 실행 시딩(§3.1 — 계약 표면 변경 없음), §4 두 이벤트 발신 지점·§5.1-2 ⑤·§5.2-2 ③에 `restore_default_asset` — 설명 ⑧ 문서 정정: §3.2 Rust `Size` → 실물 `CanvasSize`(bridge-survey Q8 #1) — 비파괴. 파괴 변경 없음(`import_asset`·`remove_asset` 의미·에러 불변). 소스 미적용(core 선행 — 머리말) | 추가·비파괴 |
| v0.16a | 2026-09-25 | CR-036 팔·손 파츠 크기 규칙 폐기(core assets.md §3.11.4). §3.1 마우스 파츠·펜 행 크기 열 「셋이 같은 크기」/「펜 그림끼리 같은 크기」 → 「≤900×700·≤1MB, 크기 자유」, 크기 일치 그룹 셋 → 캔버스 레이어 하나. §6 `asset.canvas_mismatch`(`ASSET_CANVAS_MISMATCH`)를 캔버스 레이어 불일치로 한정(core `MousePartMismatch`·`PenPartMismatch` 삭제). code 목록·command·event·타입·IPC·저장 데이터·권한 불변, bridge Rust 코드 변경 없음. TS 주석 정정 필요(§9 v0.16a) | 비파괴(검증 완화) |
| v0.17 | 2026-09-25 | CR-037 헤어(뒷머리) 파츠(확정사항 §6). §3.1 `AssetSlot`에 `'hair'`(Rust `SimpleSlot::Hair`, JSON `"hair"`) — 캔버스 레이어·1장 고정·위치 없음·선택·내장 기본 없음. `DEFAULT_ASSET_SLOTS`(15)·`REQUIRED_SLOTS`(3)·`Settings`·command·event·에러 code·권한 불변. core `assets::slot` 선행(§9 v0.17). 머리말에 v0.16a 줄 보충 | 추가(IPC·저장 데이터)·비파괴(TS 유니온 멤버 추가 — 전수 switch 없음) |
| v0.18 | 2026-09-25 | CR-038(🔒 사용자 확정, 값 변경만 — 새 command·event·타입·에러 code·권한 없음). ① §3.1 `DEFAULT_ASSET_SLOTS` 15개(v0.16 CR-035·v0.17 CR-037) → **7개**: `kb_up`, `kb_down_0`, `background`, `hair`, `mouse_base`, `pen_up`, `pen_down_0`(순서 = core `DEFAULT_ASSETS` 동일) — `idle`·`rest`·`key_*` 7종 9개는 내장 기본 제거, `hair`는 v0.17 도입 때 없던 내장 기본을 v0.18부터 보유. `hasBuiltinDefault` 결과만 바뀐다(로직 불변) ② §3.3 마우스 기본값 표·JSON 예시 — `shoulder` (620,530)→**(558,500)**, `penPos` (380,496)→**(356,504)**, `penMode` `false`→**`true`**. `area`·`partPos`·`hand`는 값 불변. `REQUIRED_SLOTS`(3)·`Settings` 필드 구성·command·event·에러 code·권한 불변. core `assets::defaults::DEFAULT_ASSETS`·`settings::default_mouse()` 동시 반영(core-implementer 병행) | 비파괴(상수·기본값 변경 — 필드·타입·이름 불변) |
| v0.19 | 2026-09-26 | CR-043 타자 입력 1 선택 강등(🔒 사용자 확정, 확정사항 §6 「타자 입력 1 선택 강등」). §3.1 필수 열의 `{kind:'kb_down', index:0}`을 **선택**으로 강등, 필수 이미지 **3장 → 2장**(`kb_up`, `mouse_base`). TS `REQUIRED_SLOTS`를 `['kb_up', { kind: 'kb_down', index: 0 }, 'mouse_base']` → `['kb_up', 'mouse_base']`로 축소(`isRequiredSlot` 로직 불변 — 판정 결과만 바뀐다). `DEFAULT_ASSET_SLOTS`·`Settings`·command·event·에러 code·권한 불변. core 필수 판정 없음(core 변경 없음). **bridge(TS) 구현 완료 (2026-09-26, bridge-implementer)** — `src/bridge/types.ts`·`src/bridge/__tests__/types.test.ts` 갱신, `yarn test --run src/bridge`·`yarn tsc --noEmit` 확인(하단 §9 v0.19) | 비파괴(TS 상수 값 축소 — 판정 완화, 필드·타입·이름 불변) |
| v0.20 | 2026-09-26 | CR-044 마우스 기본값 재조정 + hair 내장 기본 제외(🔒 사용자 확정). §3.3 `DEFAULT_MOUSE_SETTINGS` `shoulder` (558,500)→(582,484)·`partPos` (389,492)→(411,464)·`penPos` (356,504)→(372,476), §3.1 `DEFAULT_ASSET_SLOTS` 7개 → 6개(`hair` 제외). command·event·타입·에러 code·권한 불변. core 반영 대기(§3.1·§3.3). (v0.21에서 누락 행 보충 — BRG-002) | 비파괴(상수 값 변경 — 모양 불변) |
| v0.21 | 2026-09-26 | CR-045 뽀모도 타이머(확정사항 §6 CR-045, `pomodoro-02-design.md`·`pomodoro-03-packet-bridge.md`, U-1~U-8 권고안). §3.1 슬롯 `pomo_char`·`pomo_bubble`(캔버스 레이어·선택·내장 기본 없음 — `DEFAULT_ASSET_SLOTS`·`REQUIRED_SLOTS` 불변), §3.3 `Settings.timer: TimerSettings`(5필드)·TS `DEFAULT_TIMER_SETTINGS`·`TIMER_*_MIN/MAX`, §3.9 `TimerStatus`·`TimerSnapshot`·`TimerAction`, §4 `timer://changed`(새 도메인 `timer`), §5 `get_timer`·`control_timer`·`set_resting` + `set_settings` 부수 효과, §5.3 7단계, §5.8 타이머 규칙, §6 `timer.disabled`(code 21 → 22)·§6.1 `TimerError` 변환·§6.2 행. 권한 불변(§7). core `timer`·`settings::timer` 선행 | 추가(IPC·저장 데이터 — command 3·event 1·code 1·슬롯 2·설정 키, serde default로 옛 파일 비파괴)·**TS 파괴**(`Settings.timer` 필수 필드 — `Settings` 리터럴 픽스처 tsc, §9 v0.21) |
| v0.22 | 2026-09-26 | CR-047 점검 후 정리(🔒 확정사항 §6, core `settings.md` §3.9·`tray.md` §3.5, verify-20260926-1821 CORE-001·002·SEC-001·002·003). ① **B2** `set_settings`(§5·§5.3): 저장을 `settings::save`(잠금 밖) → `settings::update`(잠금 안에서 병합·검증·원자 저장·메모리 대입 한 번)로 교체, 저장 뒤 재병합 단계 삭제, `settings://changed`를 창 적용보다 먼저 emit — 처리 순서 6단계 → **4단계**로 축소(설명 변경, 반환 타입·필드·에러 code 불변) ② **B3** `set_overlay_position`·`set_overlay_visible`(§5): 같은 방식(`update`), emit은 잠금 밖 — 시그니처·반환·에러 code 불변 ③ **B1** `set_autostart`(§5·§5.5): 시그니처·반환 불변, **`autostart.cancelled` code 폐기**(승격 경로 삭제 — SEC-001, `AutostartError::Cancelled` 변형 삭제), 설명을 "일반 권한(LeastPrivilege), 승격 없음, 보통 1초 안팎"으로 정정, `persist_autostart` 내부가 `settings::update` 하나로 ④ **B4** §6·§6.1·§6.2에서 `autostart.cancelled` 삭제 표기(code 22 → **21** + TS `unknown`), `SettingsError::StatePoisoned` → `state.poisoned`(기존 code 재사용) 매핑 추가, `settings::save` 언급을 `settings::update`로 정정 ⑤ `get_asset_manifest`(§5, SEC-002): manifest의 `fileName`을 신뢰하지 않고 슬롯에서 다시 만든 이름과 다른 항목은 조용히 제외 — 이미 core 구현(§3.14), 계약 설명 보강 ⑥ `import_asset`(§5, SEC-003): 1MB 초과 시 PNG 서명 확인보다 `asset.too_many_bytes`를 먼저 반환 — 이미 core 구현, 계약 설명 보강. 새 command·event·타입·필드 없음. **소스 반영 완료(2026-09-26, bridge-implementer)** — `cargo fmt --check`·`cargo clippy -D warnings`(0)·`cargo test`(300 유닛 + 30 통합 PASS)·`yarn test --run src/bridge`(68 PASS). ui 파급(수정 안 함, 목록만): `src/settings/components/GeneralTab.tsx:71`의 `autostart.cancelled` 분기, i18n `types.ts:63,88`·`ko.ts`·`ja.ts`·`en.ts`, 테스트 `GeneralTab.test.tsx` TC-114·`i18n.test.ts:45`·`SettingsApp.test.tsx` — 죽은 분기가 되지만 남겨도 무해 | 비파괴(내부 저장 절차 변경·설명 정정, code 하나 폐기 = 발생 경로 소멸으로 사실상 미사용, command·event·타입 표면 불변) |
| v0.24 | 2026-09-27 | CR-053 배포용 기본 세트 3차(🔒 사용자 확정, 확정사항 §6 「배포용 기본 세트 3차」, CR-044 일부 대체). §3.1 `DEFAULT_ASSET_SLOTS` 6개(v0.20 CR-044) → **7개**: `kb_up`, `background`, `hair`, `pomo_char`, `mouse_base`, `pen_up`, `pen_down_0`(순서 = core `DEFAULT_ASSETS` 동일, `kb_down_0` 제외). `hair`(v0.20~v0.22 제외)·`pomo_char`(도입 이래 처음)는 내장 기본이 **생김**, `kb_down_0`(v0.18~v0.22 있었음)은 내장 기본이 **없어짐**. §3.3 `DEFAULT_TIMER_SETTINGS.textPos` `(268,403)`→**`(142,458)`**, `.rotation` `5`→**`9`**(다른 필드·`DEFAULT_MOUSE_SETTINGS`는 불변). `REQUIRED_SLOTS`·`Settings`·command·event·에러 code·권한 불변. **bridge(Rust·TS) 구현 완료 (2026-09-27, bridge-implementer)** — `src-tauri/src/bridge/commands/tests.rs`(내보내기 개수 6→7), `src/bridge/types.ts`·`src/bridge/__tests__/types.test.ts`. core 선행 완료(2026-09-27, `assets::defaults::DEFAULT_ASSETS`·`settings::timer::TimerSettings::default()`). 화면(ui) 파급은 §9 v0.24 목록만(수정 안 함) | 비파괴(상수 값·목록 재조정 — 모양·타입 불변) |
| v0.23 | 2026-09-26 | CR-048 타이머 모드(🔒 확정사항 §6 103~107행, 설계 `timer-mode-02-design.md` §4, 패킷 `timer-mode-03-packet-bridge.md`, 사용자 결정 D-1~D-11 권고안, A-1~A-5). ① §3.3 `TimerSettings` 선택 필드 `mode`·`countdownSecs`·`alarmVolume`(Rust 항상 직렬화·관대한 역직렬화·검증 2규칙), TS 상수 `TIMER_COUNTDOWN_SECS_MIN/MAX`·`TIMER_ALARM_VOLUME_MAX`, `DEFAULT_TIMER_SETTINGS` 새 값 ② §3.9 `TimerMode` 신규, `TimerStatus` +`'finished'`, `TimerSnapshot` 선택 필드 `mode`·`durationMs`, 상태×모드 표 ③ §3.10 신설 `AlarmFormat`·`AlarmSound` ④ §4 `timer://changed` 발신 지점 교체(트레이·모드 전환·대기 중 시작 시간·0 도달·끝남 만료 — 모두 core 깔때기 `publish_timer_change`), 이름·페이로드 타입 불변 ⑤ §5 신규 command `get_alarm_sound`·`import_alarm_sound`·`remove_alarm_sound`(이벤트 없음 — A-1), `control_timer`·`set_resting` 카운트다운 전이·깔때기(시그니처 불변) ⑥ §5.3 6단계(패킷상 7단계) `disable` → `configure` → publish 또는 트레이 동기화 ⑦ §5.4 `pickAudioFile` ⑧ §5.8 카운트다운 전이표·`configure` 규칙, 규칙 1(core 마감 스레드 1개·깔때기)·5·7·8 ⑨ §5.9 신설 알림음 규칙 ⑩ §6·§6.1·§6.2 `sound.not_audio`·`sound.too_many_bytes`·`sound.io`(21 → 24), `timer.disabled` 문구 변경 ⑪ §7 capabilities 불변, `tauri.conf.json` 요청 2건(CSP `media-src`·`additionalBrowserArgs`) 반영 확인. 소스 미반영(bridge-implementer 대기) | 추가(command 3·타입 3·선택 필드 5·code 3·TS 상수 3·래퍼 1)·비파괴(유니온 멤버 `'finished'` 추가, 문구 변경, 발신 지점·규칙 변경 — 시그니처 불변) |
| v0.25 | 2026-09-27 | data-reset(🔒 사용자 결정 2026-09-27, `data-reset-02-design.md` §0·§3, 패킷 `data-reset-03-packet-bridge.md`, core `data_reset.md` §9·§11.4 C-4). ① §5 신규 command `reset_app_data() -> void`(동기, 🔒 베타 전용) + §5.10 신설(보존 규칙: 언어·자동 실행 유지, 알림음 삭제, 위치 기본값 / 처리 순서 가·나·1~9·다 / 부분 실패 표 / C-4 판정 = 동기 command 직렬화 + 불변식) ② §4 `settings://changed`·`assets://changed`·`assets://hand-anchor-changed`·`timer://changed` 발신 지점에 `reset_app_data` 추가, 「settings → assets 고정, 소비자는 도착 순서 비의존」 주석, 시작 초기화 무이벤트 주석 ③ §5 `get_settings`·`get_asset_manifest` R-A2 주석 ④ §6·§6.1·§6.2 `reset.io`·`reset.seed`(24 → 26), `From<ResetError>` ⑤ §7 권한 변경 없음. 새 이벤트·타입·필드 없음. 소스 미반영(bridge-implementer 대기) | 추가(command 1·code 2·TS 래퍼 1)·비파괴(주석·발신 지점 추가) — **파괴 없음** |
| v0.26 | 2026-09-27 | 배포 전 검증 WARN 수정(사용자 승인 2026-09-27). ① **SEC-002(MEDIUM)** `reset_app_data` 호출 창 제한 — Rust 핸들러에 Tauri 주입 인자 `window: tauri::WebviewWindow` 추가, 첫 문장(0단계) 순수 함수 `ensure_reset_caller(label: &str) -> Result<(), BridgeError>`로 라벨이 `window::SETTINGS_LABEL`(`"settings"`)이 아니면 잠금·core·emit·창 조작 전에 거부. 새 code `reset.forbidden`(§6 — 26 → 27, 기존 code 중 맞는 것 없음 — §5.10 「호출 창 제한」 근거). §5 표 행·§5.10(에러·소비자·권한·Rust 핸들러 행, 「호출 창 제한」 신설, 처리 순서 0단계, 에러 우선순위, 테스트)·§6 머리글·표·현황 메모 ③·§6.2 행·§7 v0.26 줄(권한 불변, 대안(보류) 권한 층 차단). JS 인자·TS 래퍼·TS 타입 불변. ② **CR-003(LOW)** §5.10 「소비자」·「ui 보조」 문구 「pending 동안 다른 조작을 막는다」 → 「초기화 버튼 재진입만 막는다」(settings `design/general-tab.md` §7과 일치) — 문서 정정. ③ 머리말 반영 상태 정정 — `generate_handler!` 등록 완료(`src-tauri/src/lib.rs:193`), v0.25 줄의 「미반영」에 취소선. v0.25 이 행의 「소스 미반영」은 당시 기록이라 그대로 둔다. 파괴 영향 조사: `grep -rn resetAppData src` → 제품 코드 호출은 `src/settings/components/ResetAllCard.tsx:48` 1곳(settings 창), `src/overlay/` 0건. 새 command·event·타입·필드 없음. 소스 미반영(bridge-implementer 대기) | **비파괴**(호출 조건 강화 — 유일한 ui 호출 지점이 허용 창 안이라 실사용 영향 없음)·추가(code 1)·비파괴(문서 정정) |
| v0.27 | 2026-09-29 | CR-058/059 기본값 반영(문서 정정, 코드 변경 없음 — 0.4.0 구현·배포값에 계약을 맞춤, 배포 전 검증 verify-20260929-1928 리뷰 CR-201). §3.3 `TimerSettings` 기본값 `textPos` (142, 458)→(268, 402)·`rotation` 9→7·`alarmVolume` 80→44(TS 코드블록·Rust 주석·JSON 예시 2곳·기본값 표 3행·관대한 역직렬화 대체값·옛 파일 호환 문장). 기본 알림음 서술 「ui 합성 WAV Blob URL」→「ui 번들 정적 mp3 `src/assets/sounds/default-alarm.mp3`(`'self'`)」(§3.10·§5.9 머리·4·5·§7 v0.27·§9 TM-09). 필드·타입·command·event·에러 code·권한 불변. 셋 대조: 계약=TS `DEFAULT_TIMER_SETTINGS`=Rust `TimerSettings::default()` 8필드 일치 | 비파괴(기본값 문서 정정 — 모양 불변) |

- 호환성 분류: **추가**(새 command/event/선택 필드) · **비파괴 변경**(message 문구, 검증 완화) · **파괴 변경**(필드 삭제·이름·타입 변경, 필수 필드 추가, 이벤트 이름 변경). 파괴 변경은 ui 인계 절차(bridge-design-strategy §6)를 거친다.

## 9. 요구 추적표

v0.3~v0.17에서 만들거나 바꾼 항목만 싣는다. 기존 항목의 요구 매핑은 §4·§5의 `미정` 열을 채울 때 함께 옮긴다.

**v0.26 (R-B2 · R-B3 — 배포 전 검증 SEC-002 · CR-003, 사용자 승인 2026-09-27)** — 새 요구 없음. 기존 요구 R-B2(settings 창이 확인 뒤 부르는 초기화)·R-B3(초기화 에러 code)를 보안 결함 수정으로 좁힌다.

| 요구 | 계약 항목 | 판정 | 호환성 | core 의존 |
|---|---|---|---|---|
| R-B2 (SEC-002) | §5.10 「호출 창 제한」·처리 순서 0단계, Rust 핸들러 주입 인자 `window: tauri::WebviewWindow`, 순수 함수 `ensure_reset_caller` | **확장**(기존 command에 호출 조건 추가 — 이름·JS 인자·반환 불변) | 비파괴(ui 사용처 settings 창 1곳) | 없음(core `window::SETTINGS_LABEL` 상수만 참조) |
| R-B3 (SEC-002) | §6 `reset.forbidden`, §6.2 `reset_app_data` 행 | **신규** code 1 | 추가(비파괴) | 없음(bridge `BridgeError::new`) |
| R-B2 (CR-003) | §5.10 「소비자」·「ui 보조」 문구 | 문서 정정 | 비파괴 | — |

**v0.25 (R-B2 · R-B3 · R-A2 — data-reset)** — 아키텍처 횡단 ID(`doc/200_설계/architecture/data-reset-02-design.md` §0). `doc/100_요구조건/`에는 없다(core data_reset.md §11.4 C-2). R-A1·R-A3~R-A6·R-C*는 core 전용, R-B1(버튼·확인 창·3개 국어 문구)은 ui 전용이라 bridge 항목이 없다.

| 요구 | 계약 항목 | 판정 | 호환성 | core 의존 |
|---|---|---|---|---|
| R-B2 | §5 `reset_app_data`·§5.10(순서·부분 실패·C-4 불변식), TS 래퍼 `resetAppData(): Promise<void>` | **신규** command — 새 범위(앱 데이터 전체)의 새 동작. `restore_default_asset`(슬롯 1개)·`reset_overlay_position`(위치만)에 얹으면 의미가 바뀐다 | 추가 | `data_reset::reset_data(&AppPaths, &Mutex<Settings>) -> Result<ResetOutcome, ResetError>`, `window::{apply_overlay_window, resize_overlay, reset_overlay_position}`, `assets::load_manifest`, `tray::refresh_overlay`(`pub(crate)`) |
| R-B2 | §4 `settings://changed`·`assets://changed`·`assets://hand-anchor-changed`·`timer://changed` 발신 지점 + 순서 주석 | **확장**(발신 지점만 추가 — 이름·페이로드·빈도 불변, 새 이벤트 없음) | 비파괴 | 기존 emit 함수·`crate::publish_timer_change` |
| R-B3 | §6 `reset.io`·`reset.seed`, §6.1 `From<ResetError>`, §6.2 `reset_app_data` 행 | **신규** code 2 | 추가(비파괴) | `ResetError::code()` |
| R-A2 | §5 `get_settings`·`get_asset_manifest` 주석, §4 시작 무이벤트 주석 | **확장**(주석만 — 시그니처·동작 불변) | 비파괴 | `data_reset::run_startup`(`lib.rs` setup, 창 생성 전) |

**v0.23 (TM-01 · TM-04~TM-11 · TM-13 — CR-048 타이머 모드)** — 아키텍처 ID(`doc/200_설계/architecture/timer-mode-02-design.md` §9 RTM). 화면 ID는 ui-designer가 확정하면 교체한다. TM-02(옛 설정 이행)·TM-03(스톱워치 기존 동작)·TM-12(102행 결정의 모드별 적용)는 패킷 요구ID 목록 밖이고 새 계약 항목 없이 위 항목(§3.3 호환 문단·기존 `control_timer`/`set_resting`·§5.3 6단계 `disable`)으로 충족되므로 행을 두지 않는다.

| 요구 | 계약 항목 | 판정 | 호환성 | core 의존 |
|---|---|---|---|---|
| TM-01 | §3.3 `timer.mode`·§3.9 `TimerMode`, 기존 `set_settings`(§5.3 6단계 `configure` — 모드 전환 = 새 모드 대기)·`settings://changed`, `timer://changed` | 확장(`TimerSettings` 필드 + `set_settings` 부수 효과) | 추가(TS 선택 필드) | `settings::timer::TimerMode`, `Timer::configure`, `TimerConfig::from_settings` |
| TM-04 | §3.3 `timer.countdownSecs`·TS `TIMER_COUNTDOWN_SECS_MIN/MAX`, 기존 `set_settings`(`settings.invalid`) | 확장 | 추가 | `settings::timer::validate`·`normalize`, `Timer::configure` |
| TM-05 | §3.9 `TimerSnapshot.mode`·`durationMs`, 기존 `control_timer`(카운트다운 전이)·`set_resting`(카운트다운 no-op), §5.8 전이표 | 확장(스냅숏 필드·의미 확장, 시그니처 불변) | 추가·비파괴 | `Timer::apply`·`set_resting`·`snapshot` |
| TM-06 | §3.9 `TimerStatus` `'finished'`, §4 `timer://changed` 발신 지점(0 도달·끝남 만료), §5.8 규칙 1 | 확장(유니온 멤버·발신 지점) | 비파괴 | 깔때기 `crate::publish_timer_change`(마감 스레드 `timer::driver`·`Timer::tick`은 core 내부) |
| TM-07 | `get_alarm_sound`, §3.10 `AlarmSound`, §5.9-1 | 신규(새 자원 — 알림음) | 추가 | `assets::sound::current` |
| TM-08 | `import_alarm_sound`·`remove_alarm_sound`·`get_alarm_sound`, §3.10 `AlarmFormat`·`AlarmSound`, §5.4 `pickAudioFile`, §5.9 | 신규 | 추가 | `assets::sound::{import, remove, current}` |
| TM-09 | §7 CSP `media-src … blob:` 요청(메인 세션 반영 완료), §5.9-5 | 설정 파일 요청(계약 표면 없음) | — | 없음(기본음은 ui 번들 정적 mp3 — v0.27 CR-058 정정, v0.23~v0.26: ui 합성) |
| TM-10 | §3.3 `timer.alarmVolume`·TS `TIMER_ALARM_VOLUME_MAX`, 기존 `set_settings` | 확장 | 추가 | `settings::timer::validate`·`normalize` |
| TM-11 | §4 `timer://changed` 발신 지점(트레이 메뉴), §5.3 6단계 `tray::sync_timer_menu` | 확장(발신 지점) | 비파괴 | `tray::sync_timer_menu`, `crate::publish_timer_change` |
| TM-13 | §6 `sound.not_audio`·`sound.too_many_bytes`·`sound.io`, `timer.disabled` 문구 | 에러 code 추가·문구 변경 | 비파괴 | `SoundError::code()`, `TimerError` 메시지 |

- **판정 근거**: 모드·시작 시간·음량은 설정 자원의 같은 동작(저장·창 간 동기화) → `set_settings`·`settings://changed` 확장. 카운트다운·끝남은 타이머 자원의 같은 동작(시작·일시정지·멈춤·쉬는중) → `control_timer`·`set_resting`·`timer://changed` 확장(시그니처 불변, 새 command·event 없음). 알림음은 PNG 슬롯과 다른 새 자원(A-1 — `AssetSlot` 비재사용) → 신규 타입 2·command 3, 이벤트 없음.
- **파괴 영향**: 없음(TS 선택 필드). `'finished'` 추가로 ui의 `TimerStatus` 분기(표시·버튼·트레이 대응)는 ui 패킷에서 보강 — tsc가 전수 분기를 잡으면 bridge-implementer가 파일·줄을 tsc 출력으로 보고.
- **ui 인계**: 래퍼 `getAlarmSound`·`importAlarmSound`·`removeAlarmSound`·`pickAudioFile`, 타입 `TimerMode`·`AlarmFormat`·`AlarmSound`, 상수 `TIMER_COUNTDOWN_SECS_MIN/MAX`·`TIMER_ALARM_VOLUME_MAX`·`DEFAULT_TIMER_SETTINGS`(새 값), code 3개(ui `ErrorCode`·`ERROR_CODES`·3개 국어 사전 — ui 소유), `timer.disabled` 새 문구.
- **core 변경 요구**: 없음(core 선행 완료 — 실물 시그니처 확인 2026-09-26). `lib.rs` `generate_handler!` 3줄은 패킷 §1이 bridge-implementer에게 허용했다(다른 부분 수정 금지) — 가드에 막히면 우회하지 않고 「core 변경 요구: 등록 3줄」로 보고(v0.16·v0.21 전례).

**v0.21 (PT-01 · PT-03~PT-10 — CR-045 뽀모도 타이머)** — 아키텍처 ID(`doc/200_설계/architecture/pomodoro-02-design.md` §6 RTM). 화면 ID는 ui-designer가 확정하면 교체한다. PT-02(겹침·고정)는 ui 전용 — bridge 항목 없음.

| 요구 | 계약 항목 | 판정 | 호환성 | core 의존 |
|---|---|---|---|---|
| PT-01 | §3.1 `AssetSlot` `'pomo_char'`·`'pomo_bubble'`, 기존 `import_asset`·`remove_asset`·`restore_default_asset`(→ `asset.no_default`)·`assets://changed` | 확장(슬롯 값 추가) | 추가·TS 유니온 멤버 추가 비파괴 | `assets::SimpleSlot::{PomoChar, PomoBubble}`, `is_canvas_layer()` |
| PT-03 | §3.9 `TimerSnapshot`·`TimerStatus`, `get_timer`, `timer://changed`, §5.8-2 표시식 | 신규(새 자원 — 타이머) | 추가 | `Timer::snapshot` |
| PT-04 | §3.3 `Settings.timer.enabled`, `set_settings` 7단계(§5.3), `timer://changed` | 확장(`Settings` 필드 + `set_settings` 부수 효과) | 추가(저장)·TS 필수 필드(파괴) | `settings::timer::TimerSettings`, `Timer::disable` |
| PT-05 | `control_timer`, `TimerAction`, `timer.disabled`, `timer://changed` | 신규 | 추가 | `Timer::apply`, `TimerError::Disabled` |
| PT-06 | `set_resting`, `timer://changed` | 신규 | 추가 | `Timer::set_resting` |
| PT-07 | §3.3 `timer.textPos`·`rotation`·`fontSize`, TS `TIMER_ROTATION_*`·`TIMER_FONT_SIZE_*`, 기존 `set_settings`(`settings.invalid`) | 확장 | 추가 | `settings::timer::validate`·`normalize` |
| PT-08 | §3.3 `timer.color`, 기존 `set_settings` | 확장 | 추가 | 같음(색 형식 검증·소문자화) |
| PT-09 | `get_timer`(앱 시작 `stopped`·0), §3.3 `timer.*` 영속, `DEFAULT_TIMER_SETTINGS` | 신규 + 확장 | 추가 | `Timer::new`, settings `load`·`save` |
| PT-10 | §6 `timer.disabled` | 에러 code 추가 | 비파괴 | `TimerError::code()` |

- **판정 근거**: 표시 스타일 5개는 기존 자원(설정)의 같은 동작(저장·창 간 동기화)이라 `set_settings`·`settings://changed` 확장. 실행 상태는 휘발·앱 전역의 새 자원이라 신규 타입·command·event(도메인 `timer`). 「설정 끔 = 시간 멈춤」은 한 동작의 부수 효과로 `set_settings`에 둔다(bridge-design-strategy §5 `set_overlay_position` 선례) — command로 나누면 ui가 두 번 부르고 그 사이에 시간이 흐른다.
- **파괴 영향(TS만)**: `Settings.timer` 필수 필드 → `src/overlay/test/`·`src/settings/test/`의 `Settings` 리터럴 픽스처가 `yarn tsc --noEmit`에서 깨질 수 있다. 파일·줄 목록은 bridge-implementer가 tsc 출력으로 확정해 ui 패킷 첫 작업으로 넘긴다(패킷 §5 예외). 화면 소스·ui 소유 `ErrorCode`·`ERROR_CODES`·i18n 사전(`timer.disabled` 문구)은 ui 몫.
- **ui 인계**: 래퍼 `getTimer`·`controlTimer`·`setResting`·`onTimerChanged`, 상수 `DEFAULT_TIMER_SETTINGS`·`TIMER_ROTATION_MIN/MAX`·`TIMER_FONT_SIZE_MIN/MAX`, code `timer.disabled`.

**v0.17 (CR-037 — 헤어(뒷머리) 파츠)** — 화면 요구ID 미부여, 추적 키 `CR-037`(근거 확정사항 §6 「헤어(뒷머리) 파츠」 🔒 2026-09-25). 화면 요구ID가 붙으면(ui-designer 몫) 교체한다.

| 요구 | 계약 항목 | 판정 | 호환성 | core 의존 |
|---|---|---|---|---|
| CR-037 헤어 슬롯 | §3.1 `AssetSlot` `'hair'`(TS)·`SimpleSlot::Hair`(Rust)·슬롯 표 행 | 확장(기존 `AssetSlot` 열거 멤버 추가 — v0.6 `background`·v0.11 `key_*`와 같은 방식. 등록·삭제·조회는 기존 `import_asset`·`remove_asset`·`get_asset_manifest`, 동기화는 기존 `assets://changed`) | 추가(IPC·저장 데이터)·비파괴(TS) | core 변경 요구(아래) |
| CR-037 선택·기본 없음 | §3.1 `REQUIRED_SLOTS`·`DEFAULT_ASSET_SLOTS` **값 불변**, 「내장 기본 없음」 목록에 `hair` | 변경 없음(판정 결과만 false) | 없음 | `assets::defaults::DEFAULT_ASSETS` 불변 → `has_default(Hair)` = false 자동 |

- v0.17 판정 근거: 헤어는 에셋이라는 같은 자원의 새 슬롯 값이고 동작은 기존 command 그대로다. 전용 command·event·`Settings` 필드(위치·표시 토글)를 만들지 않는다 — 캔버스 레이어라 위치가 없고, 1장 고정이라 상태 대응이 없다(bridge-design-strategy §12).
- v0.17 **core 변경 요구(core-manager 인계, core `assets` 선행)**: ① `crate::assets::slot::SimpleSlot`에 `Hair` 변형(serde `"hair"`, `Background` 다음). ② 전수 `match` — `src-tauri/src/assets/slot.rs:125` 부근 `file_key`(→ `"hair"`)는 추가 전까지 컴파일 오류. `:154` 부근 펜 목록·`is_mouse_part`에는 넣지 않는다(→ `is_canvas_layer()` = true 자동). `:356` 부근 직렬화 테스트 표에 `(SimpleSlot::Hair, "hair")`. ③ `assets::defaults::DEFAULT_ASSETS`에 넣지 않는다(시딩·내보내기 15장 불변). ④ `load_manifest`·검증·에러 로직 변경 없음 — 새 함수·입출력·에러 없음.
- v0.17 **영향 지점(bridge-implementer 몫, grep 2026-09-25)**: `src/bridge/types.ts:11` `SimpleAssetSlot`에 `| 'hair'`, `src-tauri/src/bridge/types.rs` 문서주석 표(슬롯 목록)만. bridge Rust 핸들러 변경 없음(`AssetSlot` 전수 `match` 없음 — v0.13 ③과 같음). 테스트: `slotKey('hair')` = `'hair'`, `hasBuiltinDefault('hair')`·`isRequiredSlot('hair')`·`isMousePartSlot('hair')` = false, `DEFAULT_ASSET_SLOTS` 길이 15 유지, cargo `"hair"` ↔ `AssetSlot::Simple(SimpleSlot::Hair)` 왕복.
- v0.17 **exhaustive 영향(TS)**: 비테스트 `src/`에 `AssetSlot`·`SimpleAssetSlot` 대상 `switch`·`Record<…Slot, …>` 전수 검사 없음(grep 0건) → `yarn tsc` 파괴 없음. 단 ui가 손으로 적은 슬롯 목록은 `hair`를 자동으로 모른다(ui 몫, ui-manager 인계): `src/settings/i18n/types.ts:12` `SlotMessageKey`(24개 — 사전 3개에 `hair` 문구), `src/settings/imageSlots.ts` 카드 목록·`SlotGroupId`, overlay 겹침 순서(`src/overlay/components/LayerStack.tsx` — 배경 → 헤어 → 팔·손 → 본체), 슬롯 전수 배열 픽스처(`src/settings/test/i18n.test.ts:69`·`src/settings/test/ImagesTab.test.tsx:152`·`src/overlay/test/penLayers.test.tsx:175` 부근).
- v0.17 **전환 위험**: ① 새 ui + 옛 Rust — `import_asset`·`remove_asset`에 `'hair'`를 보내면 인자 역직렬화 실패(`unknown`). core → bridge → ui 순, 한 묶음. ② 옛 앱(관대한 로드) + 새 manifest — `"hair"` 항목만 건너뛰고 `canvas`를 남은 항목으로 다시 계산(헤어가 유일한 캔버스 레이어였다면 `null`), `assets/hair.png`는 남는다(v0.10 「옛 매니페스트 호환」과 같음). 새 앱 + 옛 manifest는 그대로 읽힌다.
- v0.17 §6 `asset.no_default` 발생 조건의 괄호 목록에는 `hair`가 없지만 기준이 「§3.1 `hasBuiltinDefault` = false」라 `hair`도 해당한다.
- 확인 필요(v0.17): ① 헤어만 등록하고 다른 캔버스 그림이 없으면 헤어 크기가 캔버스가 된다(`background`와 같은 규칙) — 그대로 둘지. ② 겹침 「본체(키보드 그림)」에 `body`·`idle`·`rest`·`key_*`가 모두 드는지는 ui 설계 확인(계약 무관).

**v0.16a (CR-036 — 팔·손 파츠 크기 규칙 폐기)** — 화면 요구ID 미부여, 추적 키 `CR-036`(근거 core assets.md §3.11.4).

| 요구 | 계약 항목 | 판정 | 호환성 | core 의존 |
|---|---|---|---|---|
| CR-036 마우스 파츠·펜 그림 크기 자유 | §3.1 마우스 파츠·펜 행 크기 열·크기 일치 그룹 문단, §6 `asset.canvas_mismatch` 발생 조건 | 확장(기존 `import_asset`·`restore_default_asset` 검증 규칙 완화 — 새 코드 없음) | 비파괴(검증 완화) | `assets::import`(시그니처 불변) — 내부 `validate`·`group_size` 교체, `AssetError::{MousePartMismatch, PenPartMismatch}` 삭제(core-implementer, core assets.md §3.11.5) |

- v0.16a 기록 행: §9 v0.8(OV-R-18)·v0.13(ST-R-18)의 파츠 크기 규칙 행과 §8 옛 행은 기록이라 그대로 둔다 — v0.16a부터 무효.
- v0.16a **소스 정정 필요(bridge-implementer 몫)**: `src/bridge/types.ts:155` `MouseSettings.partPos` 주석 「(mouse_base·mouse_left·mouse_right 공통, 같은 크기·같은 위치)」 → 「같은 위치 — 크기는 자유(CR-036)」. 같은 파일 `penPos` 주석·슬롯 도우미 주석과 `src-tauri/src/bridge/types.rs` 문서주석 표에 파츠 「같은 크기」 문구가 더 있으면 함께 정정(이번에 전수 grep 안 함). bridge Rust 코드는 두 변형 참조 없음 — 변경 없음(core assets.md §3.11.5).
- v0.16a ui 요구(ui-manager 인계, core assets.md §3.11.4): 설정 창 카드·안내 문구의 파츠 「같은 크기」 안내와 마우스·펜 크기 불일치 message 매핑이 있으면 삭제.

**v0.16 (DA-01 · DA-02 · DA-03 · DA-05 · DA-06 · DA-07 — CR-035)** — 아키텍처 ID(`doc/200_설계/architecture/default-assets-02-design.md` RTM). 화면 ID가 정해지면 교체한다. 패킷 요구ID 목록 밖의 DA-xx는 bridge 요구가 아니다.

| 요구ID | 계약 항목 | 판정 | 호환성 | core 의존(핸들러가 부르는 함수) |
|---|---|---|---|---|
| DA-01 내장 기본 15장 목록 | §3.1 `DEFAULT_ASSET_SLOTS`·`hasBuiltinDefault` | 확장(TS 상수 — v0.14 `REQUIRED_SLOTS`와 같은 방식) | 추가(TS) | `assets::defaults::DEFAULT_ASSETS`(원본 — TS는 사본), `has_default(&AssetSlot) -> bool`(대응, 핸들러 미호출) |
| DA-02 첫 실행 시딩 | §3.1 「첫 실행 시딩」, §4 `assets://changed`(시딩 emit 없음) | 확장(설명만 — 계약 표면 변경 없음) | 비파괴 | `assets::defaults::seed_if_empty(&Path) -> SeedOutcome`(호출은 core `lib.rs` setup — bridge 핸들러 없음) |
| DA-03 카드 「기본값」 = 내장 그림 복원 | §5·§5.7 `restore_default_asset`, §4 두 이벤트, §5.1-2 ⑤, §5.2-2 ③, §3.2 `url` | **신규 command**(같은 자원의 새 동작 — `import_asset`·`remove_asset` 의미를 바꾸지 않으려고) | 추가 | `assets::defaults::restore_default(&Path, AssetSlot) -> Result<AssetManifest, AssetError>`, 후처리 기존 `window::resize_overlay`·`assets::compute_hand_anchor` |
| DA-05 기본 이미지 다운로드 | §5·§5.7 `export_default_assets`, §3.2.1 `ExportReport`·`ExportFailure`, §5.4 `pickFolder` | **신규 command** + 신규 타입 + 신규 TS 래퍼 | 추가 | `assets::export::export_defaults(&Path, bool) -> Result<ExportReport, AssetError>`, `assets::export::{ExportReport, ExportFailure}`(재수출). `pickFolder`는 core 없음(dialog 플러그인) |
| DA-06 에러 코드 | §6 `asset.no_default`·`asset.export_dir`, §6.1, §6.2 | 확장(code 추가) | 비파괴 | `AssetError::NoDefault(String)`·`AssetError::ExportDir`의 `code()`(변환은 기존 `From<AssetError>` 한 곳) |
| DA-07 `penPos` 기본값 (380, 496) | §3.3 TS 주석·기본값 표·JSON 예시·「`penPos` 의미」 | 확장(기본값) | 비파괴(모양 불변) | `settings::default_mouse()`(`pen_pos: Some(Point { x: 380.0, y: 496.0 })`) |
| (🔒 U-1 = B) 기본 있는 칸은 `remove_asset` 안 부름 | §3.1 「쓰임」 문장 | 계약 변경 없음(ui 분기) | — | — |

- v0.16 판정 근거: 복원·내보내기는 에셋이라는 같은 자원의 **새 동작**이라 신규 command다(§5.7 「판정」). 목록·도우미는 ui가 버튼 모드·문구를 고르려고 필요로 하는 값이라 TS 상수(core 원본의 사본)로 둔다 — 조회 command(`get_default_slots`)는 고정 목록이라 만들지 않는다(bridge-design-strategy §12). 새 event 없음(복원은 기존 `assets://changed`, 내보내기는 앱 상태 무관).
- v0.16 core 선행 **완료 확인**(2026-09-25, bridge-implementer grep): `src-tauri/src/assets/defaults.rs`·`export.rs` 있음, `AssetError::{NoDefault, ExportDir}` 있음, `default_mouse().pen_pos = Some(Point{x:380.0,y:496.0})`(`src-tauri/src/settings/mod.rs`). **core 변경 요구(lib.rs, 미해결)**: `generate_handler!`에 `bridge::commands::restore_default_asset`·`bridge::commands::export_default_assets` 2줄 등록이 아직 없다 — `lib.rs`는 core 소관이라 bridge-implementer는 쓰지 않았다(가드 대상). 등록 전까지 두 command는 컴파일은 되지만 `invoke`로 호출할 수 없다.
- v0.16 반영 지점(완료, 2026-09-25): `src-tauri/src/bridge/commands.rs`(핸들러 2 + 공용 후처리 `after_asset_change`로 `import_asset`·`remove_asset`과 통합 + 단위 테스트 8건), `src-tauri/src/bridge/types.rs`(`ExportReport`·`ExportFailure` 재수출·문서주석 표·직렬화 테스트 3건), `src/bridge/types.ts`(`ExportReport`·`ExportFailure`·`DEFAULT_ASSET_SLOTS`·`hasBuiltinDefault`, `DEFAULT_MOUSE_SETTINGS.penPos` → `{ x: 380, y: 496 }` + 주석), `src/bridge/commands.ts`(`restoreDefaultAsset`·`exportDefaultAssets`·`pickFolder`), `src/bridge/__tests__/`(vitest 13건 추가). `src/bridge/index.ts`는 배럴 re-export라 변경 없음.
- v0.16 **소스 주석 불일치 정정 목록 — 반영 완료**(2026-09-25): #2 `get_asset_manifest` `[에러]` → `asset.io, asset.manifest` · #3 `import_asset` `[에러]` → §6.2 목록 전체 · #4 `remove_asset` `[에러]` → `asset.not_found, asset.io, asset.manifest, tauri.error, state.poisoned` · #5 `import_asset`·`remove_asset` `[요구]` → `OV-R-21`(`OV-R-03, OV-R-21, OV-R-17(, OV-R-18)`) · #6 모듈 주석 「`state.hand_anchor`는 아직 `AppState`에 없다」 삭제. 인접: `commands.ts` `getHandAnchor` 주석 「패드 중심」 → 「이동 영역 중심」(v0.9).
- v0.16 `penPos` 기본값 영향(파괴 아님 — tsc 영향 없음, 실측 2026-09-25): `yarn tsc --noEmit`에서 `src/bridge` 관련 오류 0건. `yarn test --run`(전체) 실패 34건은 전부 `src/settings/test/**`(CR-035 ui 픽스처 — `imageSlots.ts`·`ImagesTab.tsx`·`Messages`·`ErrorCode` 등 ui 소스 미구현, ui-manager 몫)와 `src/overlay/test/overlayStyles.test.ts`(CSS raw import 로더 문제, bridge 무관 기존 결함) — bridge 변경으로 새로 깨진 것은 없다(`src/bridge` 테스트는 3파일 50건 전부 PASS). `mouseMapping.test.ts`는 실측 결과 실패 목록에 없다(영향 없음).
- 확인 필요(v0.16): ① 이미 `penPos: null`이 저장된 기존 settings.json은 `null` 그대로다(마이그레이션 없음) — U-2 = B를 기존 사용자에게도 적용할지. ② `export_default_assets`는 동기 command라 15장 쓰는 동안 메인 스레드를 잠시 막는다 — 체감되면 async 전환(비파괴). ③ `pickFolder` 생략 제목 `'폴더 선택'`은 계약 결정(ui는 번역 제목을 넘긴다).

**v0.15 (CR-033 — 화면 요구ID 미부여)** — 근거 확정사항 §3 「펜 손 사용 토글」(🔒 2026-09-24). `src/settings/requirements.md`·`src/overlay/requirements.md`에 ID가 붙으면(ui-designer 몫) `CR-033`을 교체한다.

| 요구ID | 계약 항목 | 판정 | 호환성 | core 의존(핸들러가 부르는 함수) |
|---|---|---|---|---|
| CR-033 펜 손 사용 토글(저장·창 간 동기화) | §3.3 `MouseSettings.penMode`·기본값 표·JSON 예시·「`penMode` 의미」·옛 파일 호환·전환 위험 | 확장(기존 `Settings` 필드 — `get_settings`·`set_settings`·`settings://changed` 재사용, v0.13 `penPos`와 같은 판단) | 추가(IPC·저장)·TS 파괴(필수 필드)·검증 추가 없음·반영 순서 한 묶음 | **core 변경 요구**: `settings::MouseSettings.pen_mode: bool`(`#[serde(default)]`, `skip_serializing_if` 없음), `settings::default_mouse()`(`pen_mode: false`), 구조체 리터럴 `src-tauri/src/settings/mod.rs:312`(테스트)·`src-tauri/examples/import_sample.rs:89`에 `pen_mode: false`. `settings::load`·`save`·`Settings::validate()` 시그니처·규칙 불변 |
| CR-033 손 기준점·창 크기와 무관 | §5.1-3 | 확장(설명만) | 비파괴 | 없음(`set_settings` 재계산 조건 `(shoulder, part_pos)`·리사이즈 조건 `scale` 비교 코드 불변) |

- v0.15 판정 근거: 펜 모드 켜고 끄기는 사용자가 저장하는 마우스 설정값이라 `MouseSettings` 확장이다 — 전용 `set_pen_mode` command는 만들지 않는다(설정 저장은 `set_settings` 한 경로, v0.14 판단과 같음). TS 필수 필드로 둔 이유는 v0.13 `penPos`와 같다(선택 필드면 리터럴 누락이 `undefined`로 새어 「옛 ui + 새 Rust → 켜 둔 값 지움」을 `yarn tsc`가 못 잡는다). 실제 펜 모드 판정 도우미(`penMode && pen_up`)는 bridge 사용처가 없어 두지 않는다(bridge-design-strategy §12). 새 command·event·에러 코드·권한 없음.
- v0.15 영향 지점(bridge-implementer 몫, grep 2026-09-24): `src/bridge/types.ts:122` 부근 `MouseSettings.penMode: boolean`·`:243` 부근 `DEFAULT_MOUSE_SETTINGS.penMode = false`, `src/bridge/__tests__/`(기본값 단언이 있으면), `src-tauri/src/bridge/types.rs:10` 문서주석 표(`MouseSettings(v0.15: penMode 추가)`). bridge Rust 핸들러 코드 변경 없음(`types.rs`는 `settings::*` 재노출).
- v0.15 파괴 영향(ui 호출 지점 후보, `src/`에서 `penPos:` grep 2026-09-24 — `MouseSettings` 전체 리터럴만 깨지고 스프레드·`as` 캐스팅은 통과. 확정 목록은 bridge 반영 후 `yarn tsc --noEmit` 실물로): settings `src/settings/test/SettingsApp.test.tsx:141,160`·`mouseWizard.test.ts:39,140,159`·`MousePartsTab.test.tsx:116,137`·`ImagesTab.test.tsx:55`; overlay `src/overlay/test/OverlayApp.test.tsx:126`·`OverlayApp.special.test.tsx:111`·`OverlayApp.shiver.test.tsx:112`·`OverlayApp.mouse.test.tsx:118`·`OverlayApp.lock.test.tsx:116`·`OverlayApp.jelly.test.tsx:116`·`OverlayApp.pen.test.tsx:133`·`OverlayApp.penClick.test.tsx:120`·`penClick.test.tsx:101`·`PenHand.test.tsx:96`·`MouseArm.test.tsx:78`·`handPart.test.tsx:111`, 기본값 단언 `src/overlay/test/mouseMapping.test.ts:260`(`toEqual`에 `penMode: false` 필요). `penMapping.test.ts:50`은 `as MouseSettings` 캐스팅이라 제외. ui 로직(펜 모드 판정을 `pen_up` 등록 → `penMode && pen_up`으로 교체, 설정 창 토글·안내·확인창)은 ui-manager 인계 대상.
- 확인 필요(v0.15): ① 옛 settings.json에 `penMode`가 없고 `pen_up`이 등록된 상태 → 기본 `false`라 펜 모드가 꺼진다(위임 지시대로 serde 기본 `false` 유지, 이관 없음 — 배포 전·1인 개발이라 기록만). ② 마우스 파츠 「기본값으로 리셋」(ST-R-17)이 `DEFAULT_MOUSE_SETTINGS` 전체를 쓰면 `penMode`도 `false`로 돌아간다 — 유지할지 ui 판단. ③ `pen_up` 삭제 후 다시 등록할 때 「첫 등록」 확인창을 다시 띄울지(삭제 시 `penMode` 유지 여부 포함) — ui 판단.

**v0.14 (SV2-02~SV2-08 · SV2-11 · SV2-12 — settings-v2)** — 아키텍처 ID(`doc/200_설계/architecture/settings-v2-02-design.md` §0). 화면 ID 제안(02-design §0): SV2-02 = ST-R-20, SV2-03 = ST-R-21·OV-R-28, SV2-04 = ST-R-22, SV2-05 = ST-R-23(R-06 대체), SV2-06 = ST-R-24, SV2-07·08 = ST-R-25(SV2-08은 OV-R-27도), SV2-11 = ST-R-03, SV2-12 = ST-R-04 — `src/settings/requirements.md`·`src/overlay/requirements.md` 확정 시 교체.

| 요구ID | 계약 항목 | 판정 | 호환성 | core 의존(핸들러가 부르는 함수) |
|---|---|---|---|---|
| SV2-02 언어 3개 국어 | §3.3 `Settings.language`·`Language` | 확장(기존 `Settings` 필드 — `get_settings`·`set_settings`·`settings://changed` 재사용) | 추가(IPC·저장)·TS 필수 | `settings::Language`(관용 역직렬화), `settings::Settings.language`, `settings::load`·`save`(시그니처 불변) |
| SV2-02 파일 대화상자·설정 창 제목 번역 | §5.4 `pickPngFile(title?)`·`setSettingsWindowTitle`, §7 `core:window:allow-set-title` | 확장(기존 래퍼 선택 인자) / 신규 TS 래퍼(🔒 D-6 — command 아님) | 추가 | 없음(TS 전용 — dialog 플러그인·창 API) |
| SV2-02 오류 문구 3개 국어(code → 문구) | §6·§6.1·§6.2 code 정본·전체 목록 | 확장(문서 정정 — 🔒 D-3) | 비파괴(실물 불변) | 없음(`code()` 값 불변) |
| SV2-03 위치 잠금 | §3.3 `Settings.positionLock`, §5.3 4단계 | 확장(설정 필드 + 기존 `set_settings` 부수 효과) | 추가·TS 필수 | `window::apply_overlay_settings`(v0.14 — `set_ignore_cursor_events`), 시작 시 적용(core `lib.rs`) |
| SV2-04 작업표시줄 표시 | §3.3 `Settings.showInTaskbar`, §5.3 4단계 | 확장(위와 같음) | 추가·TS 필수 | `window::apply_overlay_settings`(v0.14 — `set_skip_taskbar(!show)`), 시작 시 적용 |
| SV2-05 자동 실행(작업 스케줄러·관리자) | §5·§5.5 `set_autostart`, §6 `autostart.cancelled`, §6.1 `AutostartError`, §5.3 `autostart` 무시, §4 시작 보정 emit, §7 `autostart:default` 삭제 | 확장(기존 command 구현 교체 — 같은 자원·같은 동작, 시그니처 불변) | 비파괴(code 추가)·**파괴 가능**(`set_settings` 의미) | `tray::autostart::set_enabled(bool) -> Result<bool, AutostartError>`(블로킹), `AutostartError::code()`, `tray::autostart::query() -> Option<bool>`(시작 보정 — core `lib.rs`), core 소유 필드 병합 함수(`autostart` 포함 — 이름 core 결정) |
| SV2-06 위치 초기화 | §5·§5.6 `reset_overlay_position`, §3.4 `Position`, §4 발신 지점 | **신규 command**(같은 자원(창 위치)의 새 동작 — 기본 위치의 단일 출처는 core) | 추가 | `window::reset_overlay_position(&AppHandle, &AppState) -> Result<Settings, WindowError>`, `window::default_overlay_position() -> Position` |
| SV2-07 이미지 설정 카드(교체·비우기) | §3.2 `url` 버전 규칙, §5.4 `pickPngFile`, 기존 `import_asset`·`remove_asset`·`assets://changed` | 확장(기존 재사용, 값 규칙) | 비파괴 | `assets::import`·`remove`(시그니처 불변), url 버전 쿼리(core 패킷 §4 — 실측 대기) |
| SV2-08 필수 3장 | §3.1 필수 열·`REQUIRED_SLOTS`·`isRequiredSlot` | 확장(TS 상수 — 안내 기준) | 추가(TS)·비파괴 | 없음(core 필수 판정 없음 — 문서주석만) |
| SV2-11 배율 슬라이더(ST-R-03, D-7) · SV2-12 유휴 시간(ST-R-04, D-7) | §5 `set_settings`·§4 `settings://changed`(기존 `scale`·`idleSeconds`) | 확장(기존 경로 그대로 — **계약 변경 없음**) | 없음 | `Settings::validate()`(배율 0.25~2·유한수), `window::resize_overlay`(기존) |

- v0.14 판정 근거: 새 필드 3개는 사용자가 저장하는 설정값이라 `Settings` 확장이다 — 개별 `set_position_lock`·언어 전용 command는 만들지 않는다(창 속성은 `set_settings` 한 경로, 패킷 §9). 위치 초기화는 `set_overlay_position(100, 100)`으로도 되지만 기본 위치가 ui에 복제되므로 신규 command로 core에 둔다. 자동 실행은 같은 동작(등록·해제)의 구현 교체라 기존 command를 유지하고, `set_settings`에서 자동 실행을 떼어 「한 command 한 가지 일」로 만든다(bridge-design-strategy §5). 새 event 없음.
- v0.14 영향 지점(bridge-implementer 몫, grep 2026-09-24, 구현 완료 2026-09-24): `src-tauri/src/bridge/commands.rs`(`ManagerExt` import 삭제, `set_settings` — `keep_overlay_position`→`keep_core_owned`·`apply_overlay_settings`→`apply_overlay_window`·`apply_autostart` 호출 삭제, `set_autostart` async+`spawn_blocking`+`tray::autostart::persist_autostart` 재구현, `apply_autostart` 함수 삭제, `reset_overlay_position` 핸들러 신규), `src/bridge/types.rs`(`Language`·`tray::autostart::AutostartError` 재노출), `src/bridge/commands.ts:55`(`getOverlayPosition` → `Position`)·`pickPngFile(title?)`·정규화·`resetOverlayPosition`·`setSettingsWindowTitle` 신규, `src/bridge/types.ts`(`Language`·`Settings` 3필드·`DEFAULT_SETTINGS`·`REQUIRED_SLOTS`·`isRequiredSlot`·`Position`), `src/bridge/__tests__/`. **실물 확인(가드 차단)**: `src-tauri/src/error.rs`는 bridge-implementer 쓰기 가드(`validate-bridge-implementer-write.py`, 허용 경로 `src-tauri/src/bridge/`만)가 막아 편집하지 못했다 — 대신 `impl From<AutostartError> for BridgeError`를 **`src-tauri/src/bridge/types.rs`**에 두었다(orphan rule상 유효, crate 로컬 타입 둘 다). `error.rs`의 옛 `impl From<tauri_plugin_autostart::Error>` 삭제와 `src-tauri/src/lib.rs`(`invoke_handler`에 `reset_overlay_position` 등록, `.plugin(tauri_plugin_autostart::init(...))` 삭제)는 core/메인 세션 몫으로 남는다(아래 §5.5 텍스트도 이 결과에 맞춰 「core 의존」으로 갱신 필요 — 다음 감사 때 반영).
- v0.14 파괴 영향(`yarn tsc --noEmit` 실물 확인, 2026-09-24): ① TS 필수 필드 3개 — 실제로 깨지는 곳은 `Settings` 객체 리터럴을 직접 쓰는 두 파일뿐이다: `src/settings/test/MousePartsTab.test.tsx:117`·`src/settings/test/SettingsApp.test.tsx:131`(각 `language`·`positionLock`·`showInTaskbar` 필요, TS2739). overlay 쪽 8개 픽스처(`handPart.test.tsx` 등)는 `{ ...DEFAULT_SETTINGS, ... }`로 짓고 있어 새 필드를 자동으로 물려받는다 — 깨지지 않는다(2026-09-24 이전 조사의 「8개 픽스처 수정 필요」 추정은 실물과 달랐다, 정정). ② `set_settings` `autostart` 무시 — ui 로직 변경 없음: 설정 창은 `setAutostart`를 부르지 않고(`SettingsApp.test.tsx:224`·`MousePartsTab.test.tsx:628` 부재 단언), `setSettings` 인자에 사본의 `autostart`를 싣기만 한다(`MousePartsTab.test.tsx:611` TC-028 — 그대로 통과). `src/settings/test/change-requests.md` CR-004(`set_settings` 자동 실행 멱등)·`manual-checklist.md` M-08(레지스트리 Run 확인)은 전제가 사라진다 — ui-manager 정리 대상. ③ `src/settings/requirements.md:84,101`(R-06·plugin-autostart 기술)은 ui-designer 갱신 대상.
- **현황 메모 — 해소(v0.14, bridge-implementer 구현 시 실물 확인, 2026-09-24)**: 실물 `Settings::validate()`(`src-tauri/src/settings/mod.rs`)는 `idle_seconds`를 `IDLE_SECONDS_MIN..=IDLE_SECONDS_MAX`(60~3600)로 검사한다(이 절 옛 문구 「`idleSeconds ≥ 10`」·「검사 없음」은 모두 실물과 달랐다) — §3.3 위 검증 규칙 문장을 이 값으로 정정했다. 02-design D-7 「≥1」과의 불일치는 ui 설계 쪽 확인 필요로 남는다(SV2-12 입력 하한 표시 문구, ui-manager 몫).

**v0.13 (OV-R-25 · ST-R-18 — CR-024)** — core assets.md·settings.md의 임시 요구ID `R-tmp-4`는 overlay `OV-R-25`(`src/overlay/requirements.md` v2.2 — 펜 쥔 손 표시)와 settings `ST-R-18`(`src/settings/requirements.md` v1.6 — 펜 그림 등록·위치 조정)로 매핑한다.

| 요구ID | 계약 항목 | 판정 | 호환성 | core 의존(핸들러가 부르는 함수) |
|---|---|---|---|---|
| ST-R-18 · OV-R-25 펜 쥔 손 그림(평소·누름 순번·특수 키 7종) 등록·삭제·수신 | §3.1 TS `AssetSlot` 펜 9형태·Rust `SimpleSlot` 8변형·`PenDownKind`·`AssetSlot::PenDown`·JSON 예시·슬롯 표 행·옛 매니페스트 호환 | 확장(기존 `import_asset`·`remove_asset`·`get_asset_manifest`·`assets://changed` 재사용 — 같은 자원(에셋)의 같은 동작, 열거 값만 추가) | 추가(IPC 값·저장 데이터)·TS 합집합 확장·반영 순서 한 묶음 | `assets::import(assets_dir, slot, src)`·`assets::remove(assets_dir, slot)`·`assets::load_manifest(&Path)`(시그니처 불변), `assets::SimpleSlot::{PenUp, PenKeySpace … PenKeyUndo}`·`assets::AssetSlot::PenDown`·`assets::PenDownKind`·`AssetSlot::is_pen_part()`(core assets.md §3.8 — 설계 완료, 소스 미적용) |
| ST-R-18 펜 그림끼리 같은 크기 | §3.1 슬롯 표 크기 열, §6 `ASSET_TOO_LARGE`·`ASSET_CANVAS_MISMATCH` | 확장(기존 command 검증 규칙 — 새 코드 없음) | 비파괴(새 슬롯에만 걸림, 기존 코드 재사용) | `assets::import` 내부 `validate`·`group_size`(펜 그림끼리), `AssetError::PenPartMismatch` — `code()` = `asset.canvas_mismatch`(`error.rs` 변경 없음) |
| OV-R-25 · ST-R-18 슬롯 식별(`pen_down` 순번 세기·엔트리 찾기) | §3.1 TS 슬롯 도우미 `slotKey`·`isKbDownSlot`·`isPenDownSlot`·`isMousePartSlot` | 확장(기존 TS 도우미 규칙을 Rust `file_key`와 같게 일반화, `isPenDownSlot` 1개 추가) | TS 로직 수정(기존 값 결과 불변) | 없음(TS 전용 — Rust `AssetSlot::file_key()`와 같은 규칙) |
| ST-R-18 · OV-R-25 펜 쥔 손 위치(끌어 놓아 저장·표시 기준) | §3.3 `MouseSettings.penPos`·기본값 표·JSON 예시·「`penPos` 의미」·옛 파일 호환·전환 위험 | 확장(기존 `Settings` 필드 — `get_settings`·`set_settings`·`settings://changed` 재사용, v0.8 `partPos`와 같은 판단) | TS 파괴(필수 필드)·저장 데이터 호환·검증 추가 없음·반영 순서 한 묶음 | `settings::MouseSettings.pen_pos: Option<Point>`(`#[serde(default)]`), `settings::default_mouse()`(`pen_pos: None`), `settings::load`·`settings::save`·`Settings::validate()`(시그니처·규칙 불변 — core settings.md §3.1.1) |
| OV-R-25 캔버스·창 크기·손 기준점과 무관 | §5.1-3, §5.2-2 ③·3, §3.1 「크기 일치 그룹은 셋」 | 확장(부수 효과 대상 설명만) | 비파괴 | `assets::AssetSlot::is_canvas_layer()`(본문 `!is_mouse_part() && !is_pen_part()`), `window::resize_overlay`(기존 — 펜 슬롯에 호출 안 함). `compute_hand_anchor` 호출 안 함 |

- v0.13 판정 근거: 펜 그림은 이미지 슬롯이라는 같은 자원이라 기존 에셋 command를 그대로 쓰고 열거 값만 늘린다(v0.6 배경·v0.11 특수 키와 같은 판단). `penPos`는 사용자가 저장하는 마우스 설정값이라 `MouseSettings` 확장이다. TS 필수 필드로 둔 이유: Rust가 항상 키를 보내고(`hand`와 같은 모양), 선택 필드(`penPos?`)면 리터럴·픽스처의 누락이 `undefined`로 새어 「옛 ui + 새 Rust → 저장된 `penPos` 지움」과 같은 누락을 `yarn tsc`가 잡지 못한다. 펜 그룹 판정 도우미·`special` → `pen_key_*` 대응 상수는 bridge 사용처가 없어 두지 않는다(bridge-design-strategy §12). 새 command·event·에러 코드 없음.
- v0.13 영향 지점(bridge-implementer 몫, grep 2026-09-24): `src/bridge/types.ts` `AssetSlot`(펜 9형태)·`:24-33` `isKbDownSlot`·`slotKey`·`isMousePartSlot`(+ `PenDownSlot`·`isPenDownSlot`, `isMousePartSlot` 주석의 「≤256×256」 정정)·`MouseSettings.penPos`·`:175-190` `DEFAULT_MOUSE_SETTINGS.penPos = null`, `src/bridge/__tests__/`(도우미 테스트), `src-tauri/src/bridge/types.rs` 문서주석 표. bridge Rust 핸들러 코드 변경 없음(`AssetSlot` 전수 `match` 없음, 재계산 조건 `commands.rs:113,146`·리사이즈 조건 `:95` 불변 — core assets.md §3.8·§9.7).
- v0.13 파괴 영향(ui 호출 지점, `src/`에서 `slotKey|isKbDownSlot|hand: null|DEFAULT_MOUSE_SETTINGS` grep, 2026-09-24): ① `penPos` 필수 — `MouseSettings` 리터럴 픽스처 `src/settings/test/MousePartsTab.test.tsx:127,571`·`src/settings/test/SettingsApp.test.tsx:141`, `src/overlay/test/handPart.test.tsx:109`·`MouseArm.test.tsx:76`·`OverlayApp.test.tsx:124`·`OverlayApp.mouse.test.tsx:116`·`OverlayApp.jelly.test.tsx:114`·`OverlayApp.shiver.test.tsx:110`·`OverlayApp.special.test.tsx:109`, 기본값 단언 `src/overlay/test/mouseMapping.test.ts:254-261`(`toEqual`에 `penPos: null` 필요), mouse 키 목록 단언 `MousePartsTab.test.tsx`(v0.9 인용 `:532` 부근). ② 슬롯 도우미 — 소비처 `src/overlay/components/LayerStack.tsx:16,20`(`slotKey`·`isKbDownSlot` — 수정 후 기존 값 결과 불변, `pen_down` 오인만 사라짐)·`src/settings/index.tsx:75-76`(등록 목록 표시 — `pen_down_N` 표기)·테스트 헬퍼의 `slotKey` 사용 12개 파일(결과 불변). ui 코드에 `AssetSlot` 전수 분기 없음. ui 요구는 core assets.md §9.7 UI-M8(settings)·UI-M9(overlay) — ui-manager 인계 대상.

**v0.12 (OV-R-24 — CR-023)** — core hook.md의 임시 요구ID `R-tmp-1`은 OV-R-24로 매핑한다(`src/overlay/requirements.md` v2.1 R-24 원문이 「어떤 키든 누른 채 자동 반복 입력이 들어오는 동안 … 떼거나 반복이 멈추면 정지, 처음 누름은 기존 젤리」를 포함).

| 요구ID | 계약 항목 | 판정 | 호환성 | core 의존(핸들러가 부르는 함수) |
|---|---|---|---|---|
| OV-R-24 자동 반복 누름 구분(어떤 키든 — 단 수식 키 좌우 Shift·Ctrl·Alt·Win의 자동 반복은 이벤트 없음, 🔒 2026-09-24 확정사항 §4 3행) | §3.7 TS `KeyboardInputEvent.repeat`·Rust `KeyboardPayload.repeat`·JSON 예시·의미 표 행, §3.7.1 의미 표·JSON 예시, §4 `input://keyboard` | 확장(기존 event에 필드 추가 — 같은 자원(키보드 입력)의 같은 동작(누름 알림), 새 event 없음 🔒) | 추가(IPC 모양)·TS 필수·**의미 파괴**(ui 선행) | **core 변경 요구(core-designer 설계 완료, 소스 미적용)**: `hook::InputEvent::Keyboard { pressed, held, special, repeat: bool, ts }`(core hook.md §2, §3.2 `KeyTable::apply`·`keyboard_event`, §3.5 A1~A6). command 핸들러 없음 — `events::emit_input`이 옮겨 담기만 |
| OV-R-24 떼면·반복이 멈추면 정지 | §3.7.1 「멈춤 알림 없음」(뗌 이벤트 + ui 타임아웃) | 확장(설명 — 새 event 없음) | 비파괴 | 없음(core hook.md §3.5 A7 — 훅에 타이머 없음) |
| OV-R-24 반복 빈도 | §3.7.1 「빈도」, §4 빈도 열 | 확장(설명) | 비파괴(스로틀 없음 — 기존 즉시 규칙) | 없음(core hook.md §3.5 A5) |
| OV-R-24 처음 누름은 기존 젤리 · 반복은 프레임·젤리·특수 키 목록 불변 | §3.7.1 「ui 요구」·「전환 위험」 | 확장(의미 명시) | 의미 파괴 — ui 요구(core hook.md §9.2 RB5) | 없음 |
| OV-R-24 · OV-R-22 입력 내용 기록 금지 유지 | §3.8 1~3 | 확장(규칙) | 비파괴 | 없음(core hook.md §1.1 P1·P6, §9.2 RB7) |

- v0.12 판정 근거: 자동 반복은 「키 누름 알림」이라는 같은 동작의 한 경우라 `input://keyboard` 필드 확장이다(🔒 사용자 결정 — core hook.md D19. 별도 event `input://keyboard-repeat`는 옛 ui에 비파괴라는 장점이 있으나 결정과 다르다). 필드는 **필수**로 둔다 — 의미가 바뀌는 변경이라 선택 필드면 누락이 `undefined`로 새어 첫 누름으로 오인된다(RB8).
- v0.12 영향 지점(grep 2026-09-24 — 현재 `src/bridge`·`src-tauri/src/bridge`·`src/state`에 `repeat` 구현 없음). bridge-implementer 몫: `src-tauri/src/bridge/events.rs:25` `KeyboardPayload`, `:67-74` `emit_input` 패턴·생성, 테스트 리터럴 `:148`·`:163`·`:180`(+ `"repeat":false`·`"repeat":true` 직렬화 단언), `src-tauri/src/bridge/types.rs:13` 문서주석 표, `src/bridge/types.ts:115` `KeyboardInputEvent`, `src/bridge/__tests__/events.test.ts:62-83`(`KeyboardInputEvent` 리터럴 — 필수 필드라 `repeat` 없으면 tsc 오류). 의미 파괴 영향(ui-manager 인계, overlay CR-023): `src/state/inputMachine.ts`(키 누름 처리 — 프레임 순환·젤리·특수 키 목록 갱신. core hook.md §10 인용 `:45·126-148`), `src/overlay/index.tsx`(`onKeyboard` → 상태 기계 전달, 같은 인용 `:144-151`), 키 이벤트 픽스처(`src/overlay/test/inputMachine.*.test.ts`·`OverlayApp.special.test.tsx`). overlay `design.md`·`design/functions.md`는 이미 `repeat`를 전제로 설계돼 있다(`repeating`·`REPEAT_TIMEOUT_MS` 500ms — 타임아웃은 ui 결정).

**v0.11 (OV-R-22 — CR-021)** — `undo`(Ctrl+Z)·Ctrl 규칙은 확정사항 §5(🔒 2026-09-24 7종)가 근거다. `src/overlay/requirements.md` v1.8 R-22 원문은 아직 6종이다(ui-designer 갱신 대상).

| 요구ID | 계약 항목 | 판정 | 호환성 | core 의존(핸들러가 부르는 함수) |
|---|---|---|---|---|
| OV-R-22(확정사항 §5) Ctrl+Z 「뒤로가기」·Ctrl 조합 제외 | §3.7 `SpecialKey` `'undo'`·JSON 예시·대응 표·의미 표 「Ctrl을 누른 채 누름」, §3.1 `key_undo` | 확장(같은 필드·같은 슬롯 열거에 값 추가) | 추가 | **core 변경 요구**: `hook::SpecialKey::Undo`(직렬화 `"undo"`)·`classify`에 Ctrl 판정(좌·우 Ctrl, 눌린 키 표 기준)·J9 개정, `assets::SimpleSlot::KeyUndo`(`"key_undo"`, 캔버스 레이어) |
| OV-R-22 특수 키 7종 분류값(누름·뗌 짝) | §3.7 `SpecialKey`·`KeyboardInputEvent.special`·JSON 예시·의미 표, §4 `input://keyboard` | 확장(기존 event에 필드 추가 — 같은 자원(키보드 입력)의 같은 동작, 새 event 없음) | 추가(IPC 런타임 비파괴)·TS 필수 필드(이벤트 페이로드 — 읽는 쪽 영향 없음) | `hook::InputEvent::Keyboard { pressed, held, special: Option<hook::SpecialKey>, ts }`·`hook::SpecialKey`(core hook.md §2·§3.1, Serialize snake_case D9). command 핸들러 없음 — `events::emit_input`이 필드를 옮겨 담기만 |
| OV-R-22 입력 내용 기록 금지 | §3.8 1~3 | 확장(규칙) | 비파괴 | 없음(core hook.md §1.1 P1~P6이 core 쪽 정본) |
| OV-R-22 특수 키 전용 그림(선택) | §3.1 TS `AssetSlot` `key_*` 7개·Rust `SimpleSlot` 7변형·JSON 예시·슬롯 표 행·대응 규칙 `key_{special}` | 확장(기존 `import_asset`·`remove_asset`·`get_asset_manifest`·`assets://changed` 재사용, 슬롯 값만 추가) | 추가 | `assets::import`·`assets::remove`·`assets::load_manifest`(시그니처 불변), `assets::SimpleSlot::{KeySpace, KeyZ, KeyQuestion, KeyExclamation, KeyEnter, KeyBackspace}`(core assets.md §3.7) + `KeyUndo`(core 변경 요구 — §3.7 「core 선행 필요」) |
| OV-R-22 캔버스 규칙·창 리사이즈 | §3.1 슬롯 표 크기 열, §5.2-2 ③ | 확장(부수 효과 대상 설명) | 비파괴 | `assets::AssetSlot::is_canvas_layer()`(본문 불변 — `Key*` → true, D26), `window::resize_overlay`(기존). `compute_hand_anchor`는 호출 안 함 |

- v0.11 판정 근거: 특수 키 분류는 "키 누름·뗌 알림"이라는 같은 동작의 정보 추가라 새 event가 아니라 `input://keyboard` 필드 확장이다. 특수 키 그림은 이미지 슬롯이라는 같은 자원이므로 기존 에셋 command를 그대로 쓰고 열거 값만 늘린다. 분류 → 슬롯 대응 상수는 요구가 없어 bridge에 두지 않는다(규칙 `key_{special}`만 고정, §3.1).
- v0.11 영향 지점(bridge-implementer 몫, grep 2026-09-24): `src-tauri/src/bridge/events.rs:25-30` `KeyboardPayload`에 `special`, `:64` `emit_input` 패턴에 `special`(core hook과 같은 묶음 — 컴파일 오류 B9), `src-tauri/src/bridge/types.rs:13,20` 문서주석 표·`SpecialKey` 재노출, `src/bridge/types.ts:106` `KeyboardInputEvent.special`·`SpecialKey` 타입, `:12` `AssetSlot` 6개. ui 소비처 `src/overlay/index.tsx:134`(현재 `special` 미전달 — 읽기 전용이라 컴파일은 그대로, 사용은 overlay CR-021 ui 인계). 파괴 변경 없음.

**v0.10 (폐기 요구 OV-R-06 · ST-R-05 — CR-019 · CR-020)** — 요구가 폐기되어 역추적이 끊긴 항목을 삭제한 버전이다(bridge-design-strategy §12). 「판정」 열의 「삭제」는 확장·신규 어느 쪽도 아니다.

| 요구ID | 계약 항목 | 판정 | 호환성 | core 의존(핸들러가 부르는 함수) |
|---|---|---|---|---|
| ~~OV-R-06~~ (폐기, CR-019) 쾅 상태·이미지 | §3.1 TS `AssetSlot` `'slam'`·Rust `SimpleSlot::Slam`·슬롯 표 행 삭제, 필수 4장, §5.2-2 ③ | 삭제(열거 값) | TS·IPC 파괴·저장 데이터 안전 | `assets::import`·`assets::remove`(시그니처 불변), `assets::AssetSlot::is_canvas_layer()`(본문 불변 — `Slam` 변형만 사라짐) |
| ~~OV-R-06~~ (폐기, CR-019) 옛 사용자 폴더 호환 | §3.1 「옛 매니페스트 호환」, §6 `IO_ERROR`, §6.1 `Manifest` | 확장(기존 `get_asset_manifest`·`import_asset`·`remove_asset` 동작 완화, 새 command·코드 없음) | 비파괴(완화) | `assets::load_manifest(&Path) -> Result<AssetManifest, AssetError>`(시그니처 불변 — 내부 비공개 `manifest_load::parse_manifest`로 항목 단위 해석·건너뜀·캔버스 재계산, core assets.md §3.6) |
| ~~ST-R-05~~ (폐기, CR-020) · ~~OV-R-06~~ 쾅 기준 설정 | §3.3 `Settings.slam`·`SlamSettings`·TS `DEFAULT_SETTINGS.slam`·검증 2개 삭제, 옛 settings.json 호환 행 | 삭제(필드·타입) | TS 파괴·IPC 런타임 비파괴·저장 데이터 안전·검증 완화 | `settings::Settings`(`slam` 삭제), `Settings::validate()`(slam 규칙 삭제), `settings::load`·`settings::save`(시그니처 불변) |
| 키보드 누름·들림 표시(요구ID 매핑 미정 — §4 열 `미정`) | §4 `input://keyboard` `heldCount` 설명 | 확장(설명만) | 비파괴 | 없음(hook 모듈 불변. 유지 근거 core settings.md §11 D14) |

- v0.10 판정 근거: 삭제 대상 셋은 폐기 요구 OV-R-06·ST-R-05에만 닿아 있었다(§12 「어떤 요구에도 닿지 않으면 제거」). `heldCount`는 쾅 외에 키보드 누름 유지(여러 키를 누른 채 하나를 떼도 누름 유지) 판정에 계속 쓰이므로 필드를 남기고 설명만 고친다. 옛 매니페스트 관대 해석은 새 동작이 아니라 기존 조회·등록·삭제 command가 옛 폴더에서 실패하지 않게 하는 완화라 확장이다.
- v0.10 파괴 영향(ui 호출 지점, `src/`에서 `slam|Slam` grep, 2026-09-24): 타입·기본값 `src/bridge/types.ts:12`(`AssetSlot` `'slam'`)·`:60`(`SlamSettings`)·`:101`(`Settings.slam`)·`:180`(`DEFAULT_SETTINGS.slam`). ui 로직 `src/overlay/index.tsx:72,75`(`settings.slam` → 상태 기계 설정), `src/overlay/components/LayerStack.tsx:42`(`machine.layer === 'slam'` 바운스), `src/state/inputMachine.ts`(`LayerState` `'slam'`·`slamUntil`·`MachineConfig.slam` — 22곳). 픽스처 `src/settings/test/MousePartsTab.test.tsx:118`·`src/settings/test/SettingsApp.test.tsx:133`(`slam: {…}` — 필드 삭제 후 초과 속성 오류), `src/state/inputMachine.test.ts`(10곳). `src/overlay/test/`의 `OverlayApp`·`OverlayApp.mouse`·`handPart`·`layers`·`inputMachine.transitions` 테스트는 이미 CR-019 기준(슬롯 목록에 `slam` 없음, `slamUntil` 부재 단언)이다. Rust bridge 쪽 `src-tauri/src/bridge/types.rs:10`(문서주석 표)·`:17`(`SlamSettings` 재노출 — core 삭제와 동시에 지워야 컴파일됨), `src-tauri/src/bridge/events.rs:27`(`heldCount` 문서주석)은 bridge-implementer 몫. ui 요구는 overlay CR-019·settings CR-020(ui-manager 인계 대상).

**v0.9 (OV-R-20 · OV-R-21 · ST-R-15 · ST-R-16 · ST-R-17 — CR-017 · CR-018)**

| 요구ID | 계약 항목 | 판정 | 호환성 | core 의존(핸들러가 부르는 함수) |
|---|---|---|---|---|
| OV-R-20 · ST-R-15 자유 사각형 이동 영역 네 점(지정·저장) | §3.3 `MouseSettings.area`·「`area` 의미」·JSON 예시·검증·옛 파일 호환 | 확장(기존 `Settings` 필드. 같은 자원(설정)의 같은 동작 — `get_settings`·`set_settings`·`settings://changed` 재사용, 새 command 없음) | TS 파괴(필수 필드)·저장 데이터 호환 | `settings::default_mouse()`(`area` 포함), 비공개 `default_area()`(serde 기본값), `Settings::validate()`(네 점 유한수), `settings::load`·`settings::save`(기존) |
| ST-R-16 이동 영역 선·값 목록 표시 | §3.3 `area` 읽기(`get_settings`·`settings://changed`) | 확장(읽기만, 계약 추가 없음) | 위 행과 같음 | 없음 |
| ST-R-17 리셋 기본값(이동 영역 포함) | §3.3 마우스 기본값 표 `area` 행(TS `DEFAULT_MOUSE_SETTINGS.area` ↔ Rust `default_mouse()` 1:1) | 확장(기본값) | 비파괴(값) | `settings::default_mouse()` |
| OV-R-20 패드 구역 폐기 | §3.3 `pad`·Rust `Rect`·TS `Rect` 삭제, 기본값 `pad` 행·검증 `pad` 삭제 | 확장(필드·타입 삭제) | TS 파괴·저장 데이터 호환 | core `Rect` 삭제(core settings.md D12) |
| OV-R-20 커서가 있는 모니터 기준 | §5 `get_monitors`, §3.4 `ScreenBounds` 주석·Rust·JSON 예시, §6 `WINDOW_ERROR`, §6.1 | 신규 command(모니터별 목록은 새 동작. `get_screen_bounds`를 배열로 바꾸면 반환 형태 변경 = 파괴이고 이름이 반환을 거짓 설명) | 추가 | `window::list_monitors(&AppHandle) -> Result<Vec<ScreenBounds>, WindowError>`(core window.md §2.3 — 비공개 `monitor_rects` 공개 승격). 빈 `Vec` → 핸들러가 `WindowError::NoMonitor` |
| OV-R-21 폴백 ③ 이동 영역 중심 | §3.3 `hand` 의미, §3.6 `null` 설명, §5 `get_hand_anchor` | 확장(설명만) | 비파괴(값·형태 불변, ui 폴백 로직 변경) | 없음 |
| OV-R-21 영역 변경은 기준점 재계산 대상 아님 | §5.1-3 | 확장(설명만) | 비파괴 | 없음(`compute_hand_anchor` 인자·`set_settings` 재계산 조건 코드 불변) |

- v0.9 판정 근거: `area`는 사용자가 저장하는 마우스 설정값이라 `MouseSettings` 확장이다(v0.8 `partPos`와 같은 판단). 모니터 구성 변경 event는 두지 않는다 — Tauri 2가 `WM_DISPLAYCHANGE`를 노출하지 않아 hook 모듈 unsafe 래퍼가 필요하고, 변경이 드물며 ui 재조회(§5 `get_monitors` 설명)로 복구된다(core window.md §9.4). 남는 한계: 배치가 같고 해상도·배율만 바뀌면 재조회 조건이 걸리지 않는다 — 앱 재시작으로 해소.
- 빈 목록을 `Ok([])` 대신 `WINDOW_ERROR`로 돌려주는 이유: ui 실패 경로가 하나가 된다(기존 `get_screen_bounds` 실패와 같다). core `list_monitors`는 빈 `Vec`을 그대로 돌려주므로(판단은 호출자) 핸들러의 한 줄 분기다 — 새 core 함수·변형 불필요.
- `get_screen_bounds`는 v0.9 이후 어떤 유효 요구에도 닿지 않는다(overlay 요구 §3 「사용 중단」). 제거는 파괴 변경이라 ui 전환 뒤 사용처 0을 grep으로 확인하고 따로 정한다(core window.md D24). `WindowError::NoMonitor`는 `get_monitors`가 계속 쓴다.
- v0.9 파괴 영향(ui 호출 지점, `src/`에서 `\bpad\b|\bRect\b|getScreenBounds` grep, 2026-09-23): 타입·기본값 `src/bridge/types.ts:60`(`Rect`)·`:84`(`pad`)·`:164`(`DEFAULT_MOUSE_SETTINGS.pad`). ui 로직 `src/state/mouseMapping.ts:10,33-34,40-43`, `src/overlay/components/MouseArm.tsx:46-47`. 픽스처 `pad` — `src/settings/test/MousePartsTab.test.tsx:95,112,551`·`:532`(mouse 키 목록 단언), `SettingsApp.test.tsx:107,121`, `mouseWizard.test.ts:24,81,85`, `src/overlay/test/handPart.test.tsx:91`, `MouseArm.test.tsx:56,118,251`, `mouseMapping.test.ts:81`, `OverlayApp.mouse.test.tsx:96`, `OverlayApp.test.tsx:106`. `getScreenBounds` → `getMonitors` 전환(파괴 아님): `src/overlay/index.tsx:26,94`, 목 `src/overlay/test/`의 `handPart`·`OverlayApp.mouse`·`OverlayApp.scale`·`OverlayApp` 테스트. ui 요구는 OV-R-20·OV-R-21·ST-R-15~17(ui-manager 인계 대상).

**v0.8 (OV-R-18 · OV-R-19)** — core 문서의 임시 요구ID `R-tmp-2`(마우스 파츠 위치)는 OV-R-18로 매핑한다(R-18 원문이 `mouse.partPos`·기본 (389, 492)를 포함).

| 요구ID | 계약 항목 | 판정 | 호환성 | core 의존(핸들러가 부르는 함수) |
|---|---|---|---|---|
| OV-R-18 마우스 파츠 위치 (x, y) | §3.3 `MouseSettings.partPos`·「`partPos` 의미」·기본값 표·JSON 예시·옛 파일 호환 | 확장(기존 `Settings` 타입에 필드. 같은 자원(설정)의 같은 동작 — `get_settings`·`set_settings`·`settings://changed` 재사용) | TS 파괴(필수 필드)·저장 데이터 호환 | `settings::default_mouse()`(`part_pos` (389, 492) 포함), 비공개 `default_part_pos()`(serde 기본값), `settings::load`·`settings::save`(기존) |
| OV-R-18 팔 곡선·팔 굵기·색 폐기 | §3.3 `armWidth`·`armColor` 삭제, 검증 `armWidth > 0` 삭제 | 확장(필드 삭제) | TS 파괴·저장 데이터 호환·검증 완화 | `Settings::validate()`(pad 크기 검사만 남음) |
| OV-R-18 · OV-R-21 기준점 = 그림 좌표 + 위치 | §3.6 값·`null` 조건, §5.1-4 호출 인자 | 확장(기존 command·event 값 의미) | 비파괴(값 형태 불변) | `assets::compute_hand_anchor(&Path, &AssetManifest, settings::Point, settings::Point) -> Result<Option<settings::Point>, AssetError>`(인자 `part_pos` 추가 — `refresh_hand_anchor`·setup) |
| OV-R-18 위치 변경 시 재계산 | §5 `set_settings`, §5.1-2 ④·3, §5.3 2·6단계, §4 `assets://hand-anchor-changed` 요구ID | 확장(기존 부수 효과 트리거) | 추가 | 위와 같음 |
| OV-R-18 마우스 파츠 크기 규칙 | §3.1 마우스 파츠 행, §3.2 `canvas` 주석, §5 `import_asset`, §6 `ASSET_TOO_LARGE`·`ASSET_CANVAS_MISMATCH`, §6.1 | 확장(기존 command 검증 규칙) | 비파괴(검증 완화·message 추가, 새 코드 없음) | `assets::import(assets_dir, slot, src) -> Result<AssetManifest, AssetError>`(시그니처 불변 — 내부 `validate(.., group_size)`, `AssetError::MousePartMismatch`의 `code()` = `asset.canvas_mismatch`) |
| OV-R-19 몸통 선택 | §3.1 `body` 「필수」 → 선택 | 확장(설명만) | 비파괴 | 없음(core는 필수 슬롯을 검사하지 않는다) |

- v0.8 판정 근거: `partPos`는 사용자가 저장하는 마우스 설정값이라 `MouseSettings` 확장이다(새 자원 아님). 손 기준점 command·event는 형태가 그대로이고 입력만 늘어 확장이다. 마우스 파츠 크기 불일치는 새 코드 대신 `ASSET_CANVAS_MISMATCH`를 재사용한다 — §6 발생 조건에 이미 "마우스 파츠끼리 크기 다름"이 있다(core assets.md D15).
- v0.8 파괴 영향(ui 호출 지점, `src/`에서 `armWidth|armColor` grep, 2026-09-23): `src/bridge/types.ts:88,90`(타입)·`:165-166`(`DEFAULT_MOUSE_SETTINGS`), `src/overlay/components/MouseArm.tsx:102-103`(팔 곡선 stroke), 테스트 `src/overlay/test/`의 `MouseArm.test.tsx`·`OverlayApp.mouse.test.tsx`·`OverlayApp.test.tsx`·`mouseMapping.test.ts`, `src/settings/test/`의 `MousePartsTab.test.tsx`·`mouseWizard.test.ts`·`SettingsApp.test.tsx`. `partPos`가 TS 필수라 같은 파일들의 `MouseSettings` 객체 리터럴에 `partPos`가 필요하다. ui 요구는 core assets.md §9.4 UI-M1~M3(ui-manager 인계 대상).

**v0.3~v0.7**

| 요구ID | 계약 항목 | 판정 | 호환성 | core 의존(핸들러가 부르는 함수) |
|---|---|---|---|---|
| OV-R-21 (CR-007) 기준점 자동·클릭 이미지 공유 | §3.6 `Point \| null`·`HandAnchorEvent`, §5 `get_hand_anchor` | 신규 command | 추가 | 없음(캐시 읽기만) |
| OV-R-21 기준점 변경 통지 | §4 `assets://hand-anchor-changed` | 신규 event | 추가 | — |
| OV-R-21 재계산 시점 | §5 `import_asset`·`remove_asset`·`set_settings` 부수 효과, §5.1 | 확장(기존 command에 부수 효과만) | 추가 | `assets::compute_hand_anchor(&Path, &AssetManifest, settings::Point) -> Result<Option<settings::Point>, AssetError>`, `assets::load_manifest(&Path) -> Result<AssetManifest, AssetError>` |
| OV-R-21 · ST-R-17 기본 `hand` 없음(폴백 전용) | §3.3 `MouseSettings.hand` 의미·기본값 표, TS `DEFAULT_MOUSE_SETTINGS.hand = null` | 확장(기본값·설명) | 비파괴 | `settings::default_mouse()` (`hand: None`) |
| OV-R-13 드래그 위치 저장 | §4 `settings://changed` 발생 조건 | 확장(기존 event 재사용) | 추가 | `window::watch_overlay_moves`, `window::persist_overlay_position(&Mutex<Settings>, &Path, window::Point) -> Result<Option<Settings>, WindowError>`, `window::restore_overlay_position` (조립은 `lib.rs` setup) |
| OV-R-13 창 에러 변환 | §6 `WINDOW_ERROR`·`STATE_POISONED`, §6.1 `From<WindowError>` | 확장(에러 코드 추가) | 비파괴 | `window::*` 전부 `Result<_, WindowError>` 반환(core window.md §2) |
| OV-R-03 배율 변경 시 창 리사이즈 | §5 `set_settings` 설명(크기 규칙·처리 순서 정정), §5.2 | 확장(기존 command 부수 효과 정정) | 비파괴 | `window::resize_overlay(&AppHandle, Option<(u32, u32)>, f64) -> Result<OverlaySize, WindowError>`(크기 식 `window::overlay_display_size`), `assets::load_manifest(&Path) -> Result<AssetManifest, AssetError>` |
| OV-R-03 캔버스 변경 시 창 리사이즈 | §5 `import_asset`·`remove_asset` 부수 효과, §5.2 | 확장(기존 command에 부수 효과만) | 비파괴 | `window::resize_overlay`(위와 같음), `assets::AssetSlot::is_canvas_layer()` |
| OV-R-03 시작 시 저장 배율 복원 | §5.2 앱 시작 순서 0단계(리사이즈 → 위치 복원) | 확장(setup 조립, 계약 표면 변경 없음) | 비파괴 | `assets::load_manifest`, `window::resize_overlay`, `window::restore_overlay_position` |
| OV-R-13 `set_settings` 위치 불간섭(사용자 신고 2026-09-23) | §5 `set_settings` 설명, §5.3 처리 순서, §3.3 `OverlaySettings` x/y 설명, §5.2-5·6 | 확장(기존 command 입력 필드 의미 변경 — 무시) | 비파괴 | `window::keep_overlay_position(Settings, &Settings) -> Settings`(순수, 2·5단계), `window::apply_overlay_settings(&AppHandle, &OverlaySettings) -> Result<(), WindowError>`(재정의: `visible`만), `settings::save` |
| OV-R-17 배경 레이어 — 등록·삭제 | §3.1 `AssetSlot` `'background'`·Rust `SimpleSlot::Background`·JSON 예시·슬롯 표 행, §5 `import_asset`·`remove_asset`(인자 값 확장, 에러 코드 불변) | 확장(기존 열거에 값 추가. 같은 자원(에셋)의 같은 동작(등록·삭제)이라 새 command 없음) | 추가·비파괴 | `assets::import(assets_dir, slot, src) -> Result<AssetManifest, AssetError>`, `assets::remove(assets_dir, slot) -> Result<AssetManifest, AssetError>`(기존, 시그니처 불변. core 변경은 `SimpleSlot::Background` 변형 + `file_key` 매치 한 줄 — core assets.md §3.4) |
| OV-R-17 배경이 정하는 캔버스·수신 | §3.2 `AssetManifest.canvas` 주석, §5 `get_asset_manifest`·§4 `assets://changed`(페이로드 형태 불변, `entries`에 `background` 항목이 올 수 있음) | 확장(설명만) | 비파괴 | `assets::load_manifest(&Path) -> Result<AssetManifest, AssetError>`(기존) |
| OV-R-17 창 리사이즈·손 기준점 | §5.2-2 ③ 리사이즈 대상에 `background`, §5.1-3 재계산 안 함에 `background` | 확장(부수 효과 대상 설명) | 비파괴 | `assets::AssetSlot::is_canvas_layer()`(`Background` → true, 본문 불변), `window::resize_overlay`(기존). `compute_hand_anchor`는 호출 안 함 |

- 판정 근거(확장 vs 신규): 손 기준점은 매니페스트(이미지)와 설정(어깨) 둘에서 나오는 **파생값**이다. `AssetManifest`에 필드로 붙이면(대안 A) 어깨만 바뀌어도 `assets://changed`를 다시 쏴야 하고 `manifest.json`에 설정 파생값이 저장된다. `Settings`에 붙이면 사용자가 저장하는 값과 계산값이 섞인다. 같은 자원의 같은 동작이 없으므로 신규 command·event로 분리했다(bridge-design-strategy §5). 이벤트만 두면 창이 구독하기 전(앱 시작)의 값을 받을 길이 없어 조회 command도 필요하다.
- R-13은 새 자원·동작이 아니라 "설정이 바뀌었다"는 기존 사건의 새 발생 경로라 `settings://changed`를 재사용한다.
- OV-R-03은 새 자원·동작이 아니라 기존 command(`set_settings`·`import_asset`·`remove_asset`)와 setup의 **부수 효과**라 확장으로 판정했다. 창 크기는 ui가 같은 입력(캔버스·배율)으로 스스로 계산하므로 알릴 이벤트가 필요 없고, 크기를 요청하는 command도 두지 않는다(core window.md §11 D11). 시그니처·페이로드·이벤트가 그대로라 호환성은 비파괴다. 단 창이 더 이상 450×350 고정이 아니므로 overlay `.root`를 창 전체로 바꾸는 ui 요구(core window.md §9.2 UI-1)는 계약 변경과 별개로 ui-manager 인계 대상이다.
- OV-R-13 위치 불간섭(v0.5)은 새 자원·동작이 아니라 기존 `set_settings`가 받는 `overlay.x/y`를 "무시(core 현재값 유지)"로 바꾸는 것이라 확장으로 판정했다. 위치를 옮기는 동작은 이미 `set_overlay_position`이 따로 있어(§5 "하나의 command는 한 가지 일") 새 command가 필요 없다. 비파괴 근거: ① 타입·필드·필수 여부·command·이벤트 이름·반환 타입이 그대로다(§8 파괴 조건 해당 없음) ② `set_settings`로 창을 옮기려는 ui 호출자가 없다 — 호출자 두 곳(`src/overlay/index.tsx:114` Ctrl+휠, `src/settings/components/MousePartsTab.tsx:49` 마우스 탭)은 사본을 펼쳐 x/y를 되돌려 보낼 뿐이고, `setOverlayPosition` 호출은 `src/bridge/__tests__/commands.test.ts`뿐이다 ③ "적용된 값 반환"이 유지된다(적용된 x/y = core 현재값). ui 코드 변경 없음.

