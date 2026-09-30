# data_reset 모듈 설계

- 상태: 감사 반영(범위·정책은 사용자 확정 🔒 2026-09-27, 배포 전 검증 WARN 6건 반영 🔒 2026-09-27) · 최종 갱신: 2026-09-30(presets U-1)
- 변경이력:
  - 2026-09-30 (5차, presets — 🔒 확정사항 §6 「프리셋」 결정 U-1 = A 「초기화 때 프리셋 유지」, 새 모듈 문서 [presets.md](presets.md)) **data_reset 변경 없음.** 프리셋 폴더(`presets/`, 데이터 폴더 바로 아래 하위 폴더)는 전체 초기화·세대 초기화 대상이 아니다 — `wipe`가 하위 폴더에 들어가지 않으므로 코드 변경 0. §3.4 표 「지우지 않는 것」에 한 줄. 공개 API·`ResetError`·`code()`·화이트리스트 불변. U-1이 B(함께 삭제)로 바뀌면 이 문서를 다시 받는다.
  - 2026-09-30 (4차, doc-sync — **설계 변경 아님, 소스가 정본**, 커밋 2be41ce 기준) 3차 ①에서 「작성 시점 값」으로 남겨 둔 본문 값을 현재 소스 값으로 고쳤다: §2 `DATA_GENERATION` 표 행·§2 코드 조각(`= 5`, 세대 주석 1~5, `DEFAULT_ASSETS_FINGERPRINT` = `(6, 336_217, 0x4522_7552_5289_deea)` — `data_reset/mod.rs:39-52`)·§2 지문 설명, §3 `//!` 조각 [순서] ③(「내장 기본 전부(`DEFAULT_ASSETS.len()`) 시딩」 — `mod.rs:8`과 일치), R-A 표 `(=5)`, §6 `Seed` 원인·§11.2 DR-3(「내장 전부 성공」), 비용 목표(내장 6장), §8.2 통합 테스트 기대값(표식 5·내장 6장·`DEFAULT_ASSETS` 6개·`["generation"] == DATA_GENERATION`), 수동 M3 로그(세대 5). v3 픽스처(`defaults-v3` 6장)·§11.4 C-6 이력 문구는 옛 세트 서술이라 그대로 둔다. 공개 API·`ResetError`·`code()` 불변.
  - 2026-09-29 (3차, 소스 동기화 — **설계 변경 아님, 소스가 정본**: 0.4.0 + 2026-09-29 보강, 근거 `doc/300_검증/verify-20260929-1928.md`) ① **세대 5·내장 6장**: `pub const DATA_GENERATION: u32 = 5`(주석: 1=defaults-v1 CR-035, 2=defaults-v2 CR-038, 3=defaults-v3 CR-044, 4=defaults-v4 CR-053 hair 포함 7장, 5 = 0.4.0 사용자 확정 배포 세트 hair 제외 6장), `#[cfg(test)] const DEFAULT_ASSETS_FINGERPRINT: (usize, u64, u64) = (6, 336_217, 0x4522_7552_5289_deea)`(실측 2026-09-28 — §11.4 C-6 해소). 이 문서의 「`DATA_GENERATION`(=4)」「세대 4」「표식 4」「내장 7장」「(7, 376_708, 0x0…)」「376 708」은 작성 시점 값이다(→ 4차 변경이력에서 본문을 현재 값으로 고침) — 현재는 각각 `DATA_GENERATION`(5)·`DEFAULT_ASSETS.len()`(6)·위 지문으로 읽는다. 통합 테스트(`tests/data_reset.rs`)는 리터럴이 아니라 두 상수로 단언하고, `mod.rs` `//!` [순서] ③도 「내장 기본 전부(`DEFAULT_ASSETS.len()`) 시딩」이다. 표 내용은 [assets.md](assets.md) §3.16.0. ② **SEC-205 텍스트 크기 상한**: `generation::read_marker`·`attempts::read_attempts`가 `fs::read_to_string` 대신 `crate::settings::read_capped_string(…, crate::settings::MAX_TEXT_FILE_BYTES)`(1MiB)로 읽는다 — 상한 초과는 다른 읽기 실패와 같은 경로로 **표식 없음(`None`) / 시도 0**. §3.5 「읽기」·§3.6.1 `read_attempts` 주석을 이 뜻으로 읽는다. 새 단위 테스트 `marker_over_size_cap_is_none`(generation.rs)·`attempts_over_size_cap_is_zero`(attempts.rs) — §8.1 증분(attempts.rs 단위 테스트는 3개). 공개 API·`ResetError`·`code()` 불변. ③ **표기 정리**: 1·2차의 「소스 미적용」은 모두 소스에 반영됨(`data_reset/{mod,generation,wipe,attempts}.rs`, `tests/data_reset.rs`). C-5(데이터 폴더 경로 `com.kuro.keyviewer`)는 2026-09-28 해소 그대로.
  - 2026-09-27 (2차, 배포 전 검증 WARN 6건 — 사용자 승인 2026-09-27: HIGH·MEDIUM 전부 + core LOW 2건) **SEC-001**(R-A4 보강: ⓪ 시작 폴더 자체가 링크·재분석 지점이면 아무것도 안 하고 `reset.io`, §3.4.1) · **CORE-001**(R-A7 신설: 시작 경로 연속 실패 상한 3회, 새 파일 `data-reset-attempts.json`, §3.6.1) · **CORE-002**(R-A8 신설: `tauri-plugin-single-instance` 첫 플러그인, 두 번째 실행 = 설정 창 표시, §3.10) · **CORE-003**(항목별 NotFound 건너뜀, §3.4) · **CORE-004**(확장자 판정 `Path::extension`, §3.4) · **CORE-005**(시작 실패 로그에 단계·`io::ErrorKind`, 비공개 `Stage`, §3.6). **공개 API·`ResetError` 변형·`code()` 문자열 불변**(bridge 영향 없음). `assets/defaults.rs`는 바꾸지 않는다(§11.2 DR-12). 델타는 §11.5, 한계는 §11.6. **소스 미적용.**
  - 2026-09-27 (1차, 신규 문서, 🔒 사용자 결정 R-A·R-B·R-C, D-1~D-6(D-2 = **언어 유지**로 확정), 인계 패킷 `doc/200_설계/architecture/data-reset-03-packet-core.md`, 근거 `data-reset-02-design.md` §0·§4·§5·§8, 현황 `.claude/reports/core-survey-20260927-1400.md`) **새 모듈 `data_reset`**(`mod.rs`·`generation.rs`·`wipe.rs`). 세대 표식 `data-generation.json`, 판정 `decide` 한 곳, 공통 초기화 `reset_data`(순서 ①~⑤), 시작 진입점 `run_startup`, 에러 `ResetError`(`reset.io`·`reset.seed`, 설정 실패는 `SettingsError::code()` 그대로). `lib.rs` 시작 순서 변경(§3.7), `tray::refresh_overlay` `pub(crate)`(§3.8), 버전 0.1.1(§3.9). **패킷 대비 델타는 §11.1**(언어 유지, `settings.json` 본체를 지우지 않음, 실패 주입 테스트 교체, 테스트 3건 추가). **소스 미적용.**
- 요구ID 표기: `R-A1`~`R-A6`·`R-A2'`·`R-B2`·`R-B3`·`R-C1` = 아키텍처 횡단 ID(`doc/200_설계/architecture/data-reset-02-design.md` §0). `R-A7`·`R-A8` = 배포 전 검증 WARN(CORE-001·CORE-002)에서 이 문서가 R-A 체계 다음 번호로 신설(사용자 승인 2026-09-27, 02-design에는 없음). 모두 `doc/100_요구조건/`에는 없다(§11.4 C-2).
- 상대 문서: [assets.md](assets.md) §3.17(시딩과의 관계·시작 순서) · [settings.md](settings.md) §3.11(시작 순서·`update` 사용) · [tray.md](tray.md) §3.4(`refresh_overlay` 가시성) · [window.md](window.md) §2.0.1(두 번째 실행 시 `show_settings_window` 재사용, 2차) · 계약 `doc/200_설계/bridge/contract.md`(v0.25 `reset_app_data`, bridge-designer 소관)

## 1. 목적

결론: `data_reset`은 **앱 데이터의 「세대」를 확인하고, 세대가 다르거나 없으면 앱 데이터를 새 기본으로 전부 초기화**한다. 설정 창 「전체 초기화」 버튼도 같은 함수 `reset_data`를 쓴다. **베타 정책이며, 정식 배포 전에 다시 정한다**(`decide`/`POLICY` 한 곳만 바꾼다 — 02-design §8).

비유: 진열대 딱지 관리인이다. 딱지(표식 파일)를 읽고, 번호가 틀리거나 딱지가 없으면 먼저 딱지를 떼고 진열대를 비운 뒤 새 견본을 채운다. 딱지는 맨 마지막에 붙인다. 중간에 정전이 나면 딱지가 없으니 다음 개점 때 처음부터 다시 한다.

| 요구ID | 내용 | 이 모듈의 몫 |
|---|---|---|
| R-A1 | 세대 표식 저장·읽기(없음·손상 = 「없음」) | `generation::{read_marker, write_marker, remove_marker}`, `MARKER_FILE`(§3.5) |
| R-A2 | 시작 시 비교, 불일치·없음이면 전체 초기화(그림·manifest·알림음·settings, 보존 항목 제외) | `run_startup` → `decide` → `reset_data`(§3.6), `lib.rs` 호출 위치(§3.7) |
| R-A3 | 원자성: 표식 무효화 → 삭제 → 시딩 → 설정 → 표식 기록. 실패 시 표식 없음·앱 계속·다음 시작 재시도 | `reset_data` 순서 ①~⑤(§3.3, 2차에 ⓪ 검사·⑥ 시도 기록 삭제를 앞뒤로 더함), `run_startup` 무전파 |
| R-A4 | 삭제 범위는 앱 데이터 폴더 안 화이트리스트만. 하위 폴더·링크 제외. **시작 폴더(`data_dir`·`assets_dir`) 자체가 링크·재분석 지점이면 아무것도 지우지·채우지 않고 중단**(SEC-001). 확장자는 실제 확장자로 판정(CORE-004), 그 사이 사라진 항목은 건너뜀(CORE-003) | `wipe::check_start_dirs`(§3.4.1), `wipe::wipe`(§3.4) |
| R-A5 | 로그: 판정·결과·소요 시간·에러 code. 경로 금지. **시작 경로 실패 로그에는 실패 단계와 `io::ErrorKind`**(CORE-005) | `run_startup`·`reset_data`의 `log::info!/warn!`(§3.6), 비공개 `Stage`·`io_kind`(§3.6) |
| R-A6 | 정책 분기 한 곳 + 정식 배포 전환 메모 | `decide`·`ResetPolicy`·`POLICY`(§3.1), 전환안은 02-design §8(구현 안 함) |
| **R-A7** (신설, CORE-001) | 시작 경로 반복 상한: 시작 때 초기화가 **연속 3회** 끝나지 못했으면 더 지우지 않고 경고 로그만 남긴 채 앱을 계속 띄운다. 버튼 경로는 상한과 무관하고, 성공하면 시도 기록을 지운다(상한 해제 수단) | `attempts`(§3.6.1), `run_startup` 비공개 `startup_wipe`, `reset_data` ⑥ |
| **R-A8** (신설, CORE-002) | 단일 인스턴스: 앱이 이미 떠 있으면 두 번째 실행은 초기화·훅·트레이에 닿기 전에 끝나고, 기존 인스턴스가 설정 창을 보여 준다(두 프로세스가 같은 데이터 폴더를 동시에 초기화하지 않게) | `lib.rs` `tauri_plugin_single_instance` 첫 등록(§3.10) |
| R-A2' | 기본 그림을 바꾸고 세대를 안 올리는 실수 방지 | 지문 가드 테스트 `generation_fingerprint_guard`(§8) |
| R-B2 (core 부분) | 버튼이 부를 공통 초기화 함수, 오버레이 새로고침 공개 | `reset_data` 공개, `tray::refresh_overlay` → `pub(crate)`(§3.8) |
| R-B3 (core 부분) | 새 에러 코드 `reset.io`·`reset.seed` | `ResetError::code()`(§6) |
| R-C1 (core 부분) | 버전 0.1.1 | `Cargo.toml`·`tauri.conf.json`(§3.9). 표식 `appVersion`이 이 값을 쓴다 |

🔒 사용자 결정(2026-09-27) 요약 — 이 문서의 모든 절이 따른다.

| ID | 결정 | 반영 |
|---|---|---|
| R-A 베타 정책 | 표식이 없거나 `DATA_GENERATION`(=5)과 다르면(큰 값 포함) 전체 초기화 | §3.1 `decide` |
| D-1 | 수동 세대 번호 + 지문 가드 테스트 | §2 `DATA_GENERATION`, §8 `generation_fingerprint_guard` |
| D-2 | **언어 유지** | §3.2 `reset_settings` |
| D-3 | `autostart` 값·작업 스케줄러 등록 유지 | §3.2(값), §3.4(스케줄러는 건드리지 않음) |
| D-4 | 알림음 파일(wav·mp3·ogg) 삭제 | §3.4 |
| D-5 | 오버레이 위치 기본값으로 | §3.2(`overlay` = 기본값). 실제 창 이동은 bridge(§9) |
| D-6 | 표식 값이 exe보다 커도 초기화 | §3.1 |

## 2. 공개 API

모두 `crate::data_reset`(`lib.rs`에 `pub mod data_reset;`). 자식 모듈 `generation`·`wipe`는 비공개다(§3).

| 이름 | 인자 | 반환 | 실패 조건 | 요구ID |
|---|---|---|---|---|
| `pub const DATA_GENERATION: u32 = 5` | — | 현재 exe의 데이터 세대 | — | R-A1·R-A2, D-1 |
| `pub const MARKER_FILE: &str = "data-generation.json"` | — | 표식 파일 이름(데이터 폴더 루트) | — | R-A1 |
| `pub enum ResetPolicy { WipeAll }` | — | 정책(변형 1개만. 미리 늘리지 않음) | — | R-A6 |
| `pub const POLICY: ResetPolicy = ResetPolicy::WipeAll` | — | 현재 정책 | — | R-A6 |
| `pub enum StartupAction { Keep, WipeAll }` | — | 판정 결과 | — | R-A2·R-A6 |
| `pub fn decide(stored: Option<u32>, current: u32, policy: ResetPolicy) -> StartupAction` | 저장 세대(없음·손상 = `None`), 현재 세대, 정책 | `Keep`/`WipeAll` | 없음(순수) | R-A2·R-A6, D-6 |
| `pub struct ResetOutcome { pub removed: usize, pub seeded: usize, pub elapsed_ms: u128 }` | — | 초기화 결과(지운 파일 수·채운 그림 수·소요 ms) | — | R-A5 |
| `pub enum ResetError { Io(std::io::Error), Seed, Settings(SettingsError) }` + `pub fn code(&self) -> &'static str` | — | §6 | — | R-A3·R-B3 |
| `pub fn reset_settings(current: &Settings) -> Settings` | 현재 메모리 설정 | 보존 규칙을 적용한 새 설정(§3.2) | 없음(순수) | R-A2, D-2·D-3·D-5 |
| `pub fn reset_data(paths: &AppPaths, settings: &Mutex<Settings>) -> Result<ResetOutcome, ResetError>` | 앱 경로, 설정 상태(`AppState.settings`와 같은 `Mutex`) | 결과. 성공하면 시도 기록(`data-reset-attempts.json`)도 지운다(⑥, R-A7) | `Io`(⓪ 시작 폴더가 링크·재분석 지점, ①②⑤), `Seed`(③), `Settings`(④). **상한(R-A7)과 무관** — 버튼 경로는 항상 실행 | R-A2·R-A3·R-A4·R-A7·R-B2 |
| `pub fn run_startup(paths: &AppPaths, settings: &Mutex<Settings>)` | 같음 | 없음 | **실패를 전파하지 않는다**(로그만, 패닉 없음). WipeAll 판정이어도 연속 실패 시도가 3회 이상이면 지우지 않는다(R-A7) | R-A2·R-A3·R-A5·R-A7 |

- **2차(검증 WARN 반영)에서 공개 API는 바뀌지 않는다**(추가 0·변경 0). 시그니처 그대로 동작만 넓힌다: `reset_data` = ⓪ 검사 + ⑥ 시도 기록 삭제, `run_startup` = 상한·단계 로그. 새 함수·상수·타입은 모두 비공개(`fn`) 또는 `pub(super)`다(§3).

구현자가 그대로 옮길 선언(🔒 이름·시그니처):

```rust
//! (문서주석 필수 문구는 §3 끝)

use std::sync::Mutex;
use std::time::Instant;

use crate::settings::{Settings, SettingsError};
use crate::AppPaths;

mod attempts; // 2차(R-A7) — 시작 경로 연속 실패 시도 기록
mod generation;
mod wipe;

/// 시작 경로 연속 실패 상한(R-A7, CORE-001). 비공개. 이 횟수 이상이면 run_startup이 지우지 않는다.
const MAX_STARTUP_ATTEMPTS: u32 = 3;

/// 앱 데이터 세대. doc/assets/defaults/ = 내장 DEFAULT_ASSETS = 세대 5 (0.4.0, 사용자 확정 배포
/// 세트 — hair 제외 6장). 1=defaults-v1(CR-035), 2=defaults-v2(CR-038), 3=defaults-v3(CR-044),
/// 4=defaults-v4(CR-053, hair 포함 7장). 기본 그림을 바꾸면: 옛 폴더를 doc/assets/defaults-v{N}으로
/// 옮기고, 이 값을 +1 하고, 아래 DEFAULT_ASSETS_FINGERPRINT를 새로 잰 값으로 바꾼다
/// (generation_fingerprint_guard가 강제).
pub const DATA_GENERATION: u32 = 5;

/// 내장 기본 그림 지문(장수, 바이트 합, FNV-1a 64 — generation::fingerprint). 테스트 전용.
#[cfg(test)]
const DEFAULT_ASSETS_FINGERPRINT: (usize, u64, u64) = (
    6,
    336_217,
    0x4522_7552_5289_deea, /* 실측(2026-09-28) */
);

pub const MARKER_FILE: &str = "data-generation.json";

/// 베타 정책(🔒 2026-09-27). 정식 배포 전에 다시 정한다 — 02-design §8 메모. 변형을 미리 늘리지 않는다.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResetPolicy {
    /// 세대가 다르거나 없으면 앱 데이터 전부 초기화(R-A)
    WipeAll,
}
pub const POLICY: ResetPolicy = ResetPolicy::WipeAll;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StartupAction { Keep, WipeAll }

pub fn decide(stored: Option<u32>, current: u32, policy: ResetPolicy) -> StartupAction;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResetOutcome { pub removed: usize, pub seeded: usize, pub elapsed_ms: u128 }

#[derive(Debug, thiserror::Error)]
pub enum ResetError { /* §6 */ }
impl ResetError { pub fn code(&self) -> &'static str; }

pub fn reset_settings(current: &Settings) -> Settings;
pub fn reset_data(paths: &AppPaths, settings: &Mutex<Settings>) -> Result<ResetOutcome, ResetError>;
pub fn run_startup(paths: &AppPaths, settings: &Mutex<Settings>);
```

- `AppPaths`(lib.rs:34, 필드 3개 모두 `pub`)를 그대로 받는다. 테스트는 `AppPaths { data_dir, assets_dir, settings_file }`를 tempdir로 직접 만든다.
- `DEFAULT_ASSETS_FINGERPRINT`는 세대 5 내장 6장(`assets/defaults.rs` `DEFAULT_ASSETS: [DefaultAsset; 6]`)의 실측값 (6장, 바이트 합 336 217, FNV-1a 64 `0x4522_7552_5289_deea`, 2026-09-28)이다. (이력: 1차 설계 때는 세대 4·7장·바이트 합 376 708(core-survey Q9 크기 합)에 FNV 미정이었다 — §11.4 C-6, 해소.) `#[cfg(test)]`인 이유는 §11.2 DR-5.

## 3. 내부 구조

| 파일 | 책임 | 예상 줄 수 |
|---|---|---|
| `src-tauri/src/data_reset/mod.rs` (신규) | 상수·정책·`decide`·`reset_settings`·`reset_data`·`run_startup`·`ResetOutcome`·`ResetError`, 비공개 `seed_fresh`. 단위 테스트(`decide_table`·`reset_settings_keeps_autostart_and_language`·`reset_error_codes`). **2차**: 비공개 `MAX_STARTUP_ATTEMPTS`·`Stage`·`reset_data_staged`·`startup_wipe`·`at`·`io_kind`(§3.3·§3.6), 단위 테스트 `reset_error_io_kind` | 약 200 → 약 290 |
| `src-tauri/src/data_reset/generation.rs` (신규) | 표식 읽기·쓰기·삭제(`pub(super)`), `#[cfg(test)] fingerprint`. 단위 테스트(`marker_*` 3건·`generation_fingerprint_guard`) | 약 130 |
| `src-tauri/src/data_reset/wipe.rs` (신규) | 화이트리스트 삭제(`pub(super) fn wipe`), 판정 함수 2개. **2차**: ⓪ 시작 폴더 검사 `pub(super) fn check_start_dirs`·순수 판정 `is_link_like`(§3.4.1), NotFound 건너뜀 `skip_not_found`, `is_assets_target` 확장자 판정 교체, `is_data_target`에 시도 기록 tmp 추가(§3.4). 단위 테스트 4개(§8.1) | 약 90 → 약 170 |
| `src-tauri/src/data_reset/attempts.rs` (**2차 신규**) | 시작 경로 연속 실패 시도 기록 읽기·쓰기·삭제(`pub(super)`), `ATTEMPTS_FILE`(§3.6.1). 단위 테스트 2개 | 약 80 |
| `src-tauri/tests/data_reset.rs` (신규) | 통합 테스트(tempdir, §8.2). **2차**: 6개 추가·도우미 `make_dir_link`·`attempts_value`·`snapshot` | 약 300 → 약 480 |
| `src-tauri/src/lib.rs` | `pub mod data_reset;`, `//!` [계층]에 `data_reset` 추가, 시작 순서(§3.7), 비공개 도우미 `startup_settings`. **2차**: 첫 플러그인 `tauri_plugin_single_instance::init(on_second_instance)`·비공개 `fn on_second_instance`(§3.10) | +10 → +20 |
| `src-tauri/src/tray/mod.rs` | `fn refresh_overlay` → `pub(crate) fn refresh_overlay`(§3.8) | ±0 |
| `src-tauri/Cargo.toml`·`src-tauri/tauri.conf.json`(·`Cargo.lock` 자동) | 버전 0.1.1(§3.9) | ±0 |

- 모듈 의존: `data_reset → assets`(`defaults::{seed_if_empty, SeedOutcome, DEFAULT_ASSETS}`), `data_reset → settings`(`Settings`·`SettingsError`·`update`·`write_atomic`), `data_reset → crate::AppPaths`. 역방향 없음. `hook`·`window`·`tray`를 부르지 않는다(창 반영은 bridge). 2차의 단일 인스턴스 콜백(`window::show_settings_window` 호출)은 `lib.rs`에 있고 `data_reset`은 모른다(§3.10).
- `src-tauri/src/assets/defaults.rs`는 **2차에서도 바꾸지 않는다**(`seed_if_empty`의 `exists()` 유지 — §11.2 DR-12).
- 상태(struct)·정적 상태 없음. 모든 함수가 인자로만 일한다.
- 새 크레이트 없음. `thiserror`·`serde`·`serde_json`·`log`는 이미 의존성이다. FNV-1a는 직접 구현한다(10줄 안팎).

`mod.rs` 상단 `//!` 필수 항목(스킬 §11, 패킷 수용 기준):

```rust
//! 앱 데이터 세대 초기화(R-A)·전체 초기화(R-B) — doc/200_설계/core/data_reset.md
//!
//! [목적] 표식(data-generation.json)의 세대가 DATA_GENERATION과 다르거나 없으면 앱 데이터를
//!        새 기본으로 초기화한다. 설정 창 「전체 초기화」도 같은 reset_data를 쓴다.
//! [정책] ★ 베타 정책, 정식 배포 전 재결정. 판정은 decide()/POLICY 한 곳. 정식 배포 전환안
//!        (옛 기본 그대로인 칸·좌표만 교체)은 doc/200_설계/architecture/data-reset-02-design.md §8 메모 — 미구현.
//! [순서] ⓪ 시작 폴더 검사(data_dir·assets_dir 자체가 링크·재분석 지점이면 중단) → ① 표식 삭제
//!        → ② 화이트리스트 삭제 → ③ 내장 기본 전부(`DEFAULT_ASSETS.len()`) 시딩 → ④ settings::update(보존 규칙)
//!        → ⑤ 표식 기록(원자적) → ⑥ 시도 기록 삭제(실패해도 경고만). 어디서 끊겨도 표식이 없으므로
//!        다음 시작 때 처음부터 다시 한다.
//! [상한] 시작 경로만: 연속 실패 시도(data-reset-attempts.json)가 3회 이상이면 지우지 않고 경고만.
//!        시도 +1은 ⓪ 뒤·① 전에 기록한다. 버튼 경로(reset_data)는 상한과 무관, 성공하면 ⑥이 해제.
//! [보존] autostart(D-3)·language(D-2)만 유지. 나머지 설정은 기본값(오버레이 위치 포함, D-5).
//! [삭제 화이트리스트] assets/ 바로 아래 일반 파일 중 실제 확장자 png·tmp·wav·mp3·ogg, 이름 manifest.json,
//!        데이터 폴더 바로 아래 settings.json*.tmp·data-generation.json*.tmp·data-reset-attempts.json*.tmp.
//!        settings.json 본체는 ④가 덮어쓰고, data-reset-attempts.json 본체는 지우지 않는다(⑥만 지움).
//!        하위 폴더·링크·그 밖의 파일은 건드리지 않는다. 그 사이 사라진 항목(NotFound)은 건너뛴다.
//! [스레드] 없음. 호출자 스레드에서 동기 실행(시작 = setup, 버튼 = bridge command).
//! [unsafe] 없음.
//! [에러] ResetError — reset.io / reset.seed / Settings(SettingsError::code 그대로).
//!        메시지·로그에 경로를 넣지 않는다. 시작 실패 로그 = 단계(Stage::label)·code·io::ErrorKind.
//! [테스트] 단위: decide_table·reset_settings_keeps_autostart_and_language·reset_error_codes·
//!        reset_error_io_kind, generation.rs marker_*·generation_fingerprint_guard, wipe.rs 4개,
//!        attempts.rs 2개. 통합: tests/data_reset.rs.
```

`wipe.rs`의 `//!` [테스트] 줄은 「없음」에서 단위 4개(§8.1)로 바꾼다. `attempts.rs` `//!`는 generation.rs와 같은 항목([목적][공개 API][스레드][unsafe][에러][설정][테스트])을 둔다.

### 3.1 판정 `decide` (R-A6, D-6)

```rust
pub fn decide(stored: Option<u32>, current: u32, policy: ResetPolicy) -> StartupAction {
    match policy {
        ResetPolicy::WipeAll if stored == Some(current) => StartupAction::Keep,
        ResetPolicy::WipeAll => StartupAction::WipeAll, // None·작음·큼(D-6) 모두
    }
}
```

- 정책 분기는 이 함수와 `POLICY` 상수뿐이다. 다른 함수는 정책을 모른다.
- 정식 배포 전환(02-design §8)은 `ResetPolicy`에 변형을 더하고 이 `match`에 팔을 더하는 일이다. 이번에는 하지 않는다(사용자 결정, 스킬 §10).

### 3.2 보존 규칙 `reset_settings` (D-2·D-3·D-5)

```rust
pub fn reset_settings(current: &Settings) -> Settings {
    Settings {
        autostart: current.autostart, // D-3: OS 작업 등록의 거울 — 값 유지(등록도 건드리지 않음)
        language: current.language,   // D-2(🔒 유지): Language는 Copy — .clone() 쓰지 않음(clippy::clone_on_copy)
        ..Settings::default()         // 오버레이 위치(100,100)·표시 포함 전부 기본값(D-5)
    }
}
```

- **초기화 전에 설정 파일을 못 읽은 경우(없음·손상 → `load_or_default`가 기본값을 돌려줌)에는 메모리 값이 기본이므로 언어도 기본값(`Ko`)이 된다.** `autostart`도 `false`가 되지만, 같은 실행의 자동 실행 보정 스레드(`spawn_autostart_sync`, lib.rs:165)가 실제 작업 등록 상태로 되돌린다(tray.md §4). 언어에는 이런 보정이 없다. 이 동작은 테스트 `language_defaults_when_settings_unreadable`로 고정한다.
- `keep_core_owned`(window)를 쓰지 않는다. 그 함수는 `overlay`를 보존하는데, 초기화는 `overlay`를 기본으로 돌린다(D-5).
- `Settings`에 필드가 늘어나도 이 함수는 기본값으로 채운다(`..Settings::default()`). 새 필드를 보존하려면 이 함수에 한 줄을 더한다.

### 3.3 `reset_data` 순서 ⓪~⑥ (R-A3, 🔒 순서 고정 — ①~⑤는 1차 그대로, 2차에 앞뒤로 ⓪·⑥만 더함)

| 단계 | 동작 | 실패 시 |
|---|---|---|
| 시작 | `let started = Instant::now();` | — |
| **⓪** (2차, SEC-001) | `wipe::check_start_dirs(paths)`(§3.4.1) — `data_dir`·`assets_dir` 자체가 링크·재분석 지점이면 실패, 없으면 통과 | `Err(Io)`. **아무것도 바꾸지 않은 상태**(표식·파일·설정·시도 기록 모두 그대로) |
| ① | `generation::remove_marker(&paths.data_dir)` — 파일이 없으면 통과 | `Err(Io)`. 아무것도 지우지 않은 상태 |
| ② | `wipe::wipe(paths)` → `removed`(§3.4) | `Err(Io)`. 이미 지운 파일은 되돌리지 않는다. 표식이 없으므로 다음 시작 때 재시도 |
| ③ | 비공개 `seed_fresh(&paths.assets_dir)` → `seeded`. 내부는 `assets::defaults::seed_if_empty`이고, 결과가 `SeedOutcome::Seeded { count, failed }`이면서 `failed.is_empty() && count == DEFAULT_ASSETS.len()`일 때만 성공 | 그 밖(`Skipped(_)`·일부 실패)은 `log::warn!("data-reset: 기본 그림 시딩 결과 {outcome:?}")`(file_key·code만, 경로 없음) 뒤 `Err(Seed)` |
| ④ | `settings::update(settings, &paths.settings_file, \|cur\| *cur = reset_settings(cur))` — **CR-047 단일 저장 창구**. 클로저 안에서는 대입만 한다(IO·다른 잠금·emit 금지) | `Err(Settings(e))`(잠금 poison 포함). 메모리·파일은 `update` 규칙대로 이전 값 |
| ⑤ | `generation::write_marker(&paths.data_dir, DATA_GENERATION)` — `settings::write_atomic` 원자 기록 | `Err(Io)` |
| **⑥** (2차, R-A7) | `attempts::clear_attempts(&paths.data_dir)` — 시도 기록 파일 삭제(없으면 통과) | **전파하지 않는다.** `log::warn!("data-reset: 시도 기록을 지우지 못했습니다 kind={:?}", e.kind())`(경로 없음) 뒤 `Ok`. 표식이 이미 있으므로 초기화는 완료다. 남은 값의 영향은 §11.6 L-3 |
| 끝 | `Ok(ResetOutcome { removed, seeded, elapsed_ms: started.elapsed().as_millis() })` | — |

- 전제: `paths.assets_dir`가 이미 있다(시작 = lib.rs:96 `create_dir_all`, 버튼 = 앱 실행 중). `reset_data`는 폴더를 만들지 않는다. 폴더가 없으면 ③이 실패해 `Err(Seed)`가 된다. ⓪은 폴더가 없으면 통과하므로 이 규칙을 바꾸지 않는다.
- **구현 형태(2차, CORE-005).** 단계 정보를 로그에 싣기 위해 본문을 비공개 `reset_data_staged`로 옮기고, 공개 `reset_data`는 단계를 떼어 낸다. `ResetError`의 공개 변형·`code()`는 그대로다(bridge가 씀).

```rust
/// 실패 단계 — 로그 전용, 비공개(CORE-005). ResetError·code()에는 싣지 않는다.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Stage { Guard, Attempts, RemoveMarker, Wipe, Seed, Settings, WriteMarker }

impl Stage {
    /// 로그 표기(ASCII, 검색용). Attempts는 run_startup의 시도 기록 쓰기 단계다(§3.6.1).
    fn label(self) -> &'static str {
        match self {
            Self::Guard => "0-guard",
            Self::Attempts => "attempts",
            Self::RemoveMarker => "1-remove-marker",
            Self::Wipe => "2-wipe",
            Self::Seed => "3-seed",
            Self::Settings => "4-settings",
            Self::WriteMarker => "5-write-marker",
        }
    }
}

/// `?`용 변환 — 에러를 ResetError로 바꾸고 단계를 붙인다.
fn at<E: Into<ResetError>>(stage: Stage) -> impl FnOnce(E) -> (Stage, ResetError) {
    move |e| (stage, e.into())
}

pub fn reset_data(paths: &AppPaths, settings: &Mutex<Settings>) -> Result<ResetOutcome, ResetError> {
    reset_data_staged(paths, settings).map_err(|(_, e)| e)
}

/// ⓪~⑥ 본문. 순서 고정.
fn reset_data_staged(paths: &AppPaths, settings: &Mutex<Settings>)
    -> Result<ResetOutcome, (Stage, ResetError)>
{
    let started = Instant::now();
    wipe::check_start_dirs(paths).map_err(at(Stage::Guard))?;                          // ⓪
    generation::remove_marker(&paths.data_dir).map_err(at(Stage::RemoveMarker))?;       // ①
    let removed = wipe::wipe(paths).map_err(at(Stage::Wipe))?;                          // ②
    let seeded = seed_fresh(&paths.assets_dir).map_err(at(Stage::Seed))?;               // ③
    crate::settings::update(settings, &paths.settings_file, |cur| *cur = reset_settings(cur))
        .map_err(at(Stage::Settings))?;                                                 // ④
    generation::write_marker(&paths.data_dir, DATA_GENERATION).map_err(at(Stage::WriteMarker))?; // ⑤
    if let Err(e) = attempts::clear_attempts(&paths.data_dir) {                          // ⑥
        log::warn!("data-reset: 시도 기록을 지우지 못했습니다 kind={:?}", e.kind());
    }
    Ok(ResetOutcome { removed, seeded, elapsed_ms: started.elapsed().as_millis() })
}
```

- 본문은 50줄 한계 안이다. `seed_fresh`는 이미 `Result<usize, ResetError>`라 `at`의 `Into`는 항등 변환이다. `std::io::Error`·`SettingsError`는 `#[from]`으로 바뀐다(§6).
- **④와 `settings.json` 본체의 관계(패킷과 다름, §11.1 Δ2).** `update`는 새 값이 메모리 값과 같으면 파일을 쓰지 않는다(store.rs:35). 그래서 ②가 `settings.json`을 지우면, 메모리가 이미 「기본값 + 보존 필드」와 같을 때(예: 버튼을 두 번 연속 누름, 언어 `ja`) 파일이 없는 채로 남고, 다음 시작 때 언어가 기본값으로 돌아간다(D-2 위반). 따라서 **②는 `settings.json` 본체를 지우지 않는다.** ④가 값이 다르면 원자적으로 덮어쓰고, 같으면 디스크가 이미 그 값을 담고 있다.
  - 남는 경우 하나: 파일이 손상돼 메모리가 기본값이고, 보존 필드도 기본값이면 ④가 저장을 생략하므로 손상 파일이 남는다. 이 파일은 읽을 때마다 기본값으로 읽힌다. 기존 `load_or_default` 정책(손상 파일은 덮어쓰지 않고 다음 저장 때 교체, settings.md)과 같다. 값은 틀리지 않는다(§11.4 C-1).
- 버튼 경로에서 ①~④ 중 어디서 끊기든 표식이 없으므로 다음 앱 시작 때 `run_startup`이 처음부터 다시 한다. PNG 본체 비원자 쓰기(CORE-001, assets/mod.rs:310)도 이 규칙으로 흡수한다. CORE-001 자체는 고치지 않는다(범위 밖).
- 잠금: 설정 `Mutex`는 ④의 `update` 안에서만 잡는다. 호출자는 `reset_data`를 부르는 동안 설정 잠금을 쥐고 있으면 안 된다(교착, §9).

### 3.4 삭제 화이트리스트 `wipe` (R-A4, D-4)

```rust
/// 반환 = 지운 파일 수. 하위 폴더에 들어가지 않고, 링크를 따라가지 않는다.
pub(super) fn wipe(paths: &AppPaths) -> std::io::Result<usize>;
```

| 위치 | 지우는 것(**일반 파일만**) | 지우지 않는 것 |
|---|---|---|
| `paths.assets_dir` 바로 아래 | **실제 확장자**(`Path::extension`, 대소문자 무시) `png`·`tmp`·`wav`·`mp3`·`ogg`, 이름 `manifest.json` | 그 밖의 파일(예: `keep_me.txt`, **확장자 없는 `png`·`tmp` 같은 이름**, 점으로 시작하는 `.png`), 모든 하위 폴더와 그 안, 심볼릭 링크·재분석 지점 |
| `paths.data_dir` 바로 아래 | 이름이 `settings.json`·`data-generation.json`·**`data-reset-attempts.json`**(2차) 중 하나로 시작하고 `.tmp`로 끝나는 파일(`write_atomic` 잔여 임시 파일) | **`settings.json` 본체**(④가 덮어씀, §3.3), `data-generation.json` 본체(①이 지움), **`data-reset-attempts.json` 본체**(지우면 시도 횟수가 매번 0으로 돌아가 상한이 무력해짐 — ⑥만 지움, §3.6.1), 그 밖의 모든 것(예: `EBWebView` 폴더, 사용자가 둔 파일) |

- **프리셋 폴더(`presets/`)는 초기화 대상이 아니다(U-1, 2026-09-30).** 데이터 폴더 바로 아래 하위 폴더라 위 규칙(하위 폴더에 들어가지 않음)대로 그대로 남는다 — 전체 초기화(버튼)·세대 초기화(시작) 모두. 코드 변경 없음. 정본 [presets.md](presets.md) §3.8.

판정 함수(비공개, 2차 확정형):

```rust
/// assets/ 바로 아래 대상(CORE-004): 이름 manifest.json, 또는 실제 확장자 png·tmp·wav·mp3·ogg.
/// Path::new("png").extension() == None 이라 확장자 없는 "png"·"tmp"는 대상이 아니다.
fn is_assets_target(name: &str) -> bool {
    if name.eq_ignore_ascii_case("manifest.json") {
        return true;
    }
    Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .is_some_and(|ext| matches!(ext.to_ascii_lowercase().as_str(), "png" | "tmp" | "wav" | "mp3" | "ogg"))
}

/// 데이터 폴더 바로 아래 대상: 아래 접두어로 시작하고 .tmp로 끝나는 잔여 임시 파일만(본체 제외).
fn is_data_target(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.ends_with(".tmp")
        && ["settings.json", super::MARKER_FILE, super::attempts::ATTEMPTS_FILE]
            .iter()
            .any(|p| lower.starts_with(p))
}
```

- `Option::is_some_and`는 Rust 1.70 안정화라 `rust-version = "1.77"` 안이다.

절차(비공개 도우미 `fn remove_matching(dir: &Path, is_target: fn(&str) -> bool) -> std::io::Result<usize>`를 두 번 부른다):

1. `fs::read_dir(dir)` — `NotFound`이면 `Ok(0)`(폴더 없음 = 지울 것 없음). 그 밖의 오류는 `Err`.
2. 항목마다 `fs::symlink_metadata(entry.path())`로 판정한다. **결과가 `NotFound`이면 그 항목을 건너뛴다**(2차, CORE-003 — 읽은 뒤 그 사이 사라짐). `file_type().is_file()`이 아니면 건너뛴다(폴더·심볼릭 링크·정션). **링크를 따라가는 `metadata`를 쓰지 않는다.**
3. 이름이 UTF-8이 아니면 건너뛴다(우리 파일은 모두 ASCII 이름).
4. `is_target(name)`이면 `fs::remove_file(entry.path())`. **`NotFound`이면 건너뛰고 개수에 넣지 않는다**(CORE-003). 성공이면 개수 +1. 그 밖의 실패는 즉시 `Err`(이미 지운 것은 되돌리지 않음).

```rust
/// CORE-003: 항목이 그 사이 사라졌으면(NotFound) None, 그 밖의 오류는 그대로.
/// 예: 다른 스레드의 settings 저장이 settings.json.{pid}-{seq}.tmp를 rename으로 치운 직후.
fn skip_not_found<T>(r: std::io::Result<T>) -> std::io::Result<Option<T>> {
    match r {
        Ok(v) => Ok(Some(v)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e),
    }
}
// 사용: let Some(meta) = skip_not_found(fs::symlink_metadata(&path))? else { continue };
//       if is_target(name) && skip_not_found(fs::remove_file(&path))?.is_some() { removed += 1; }
```

- 경합 자체(초기화 중 다른 명령의 저장)는 없애지 않는다. 결과만 「없어진 것은 이미 지워진 것」으로 본다. 반대 순서(wipe가 tmp를 먼저 지워 저장 쪽 rename이 실패)는 저장 쪽 에러로 남는다(§9 동시 실행, ui가 pending 동안 막음).

- 삭제 대상 경로는 `read_dir` 항목뿐이다. 경로를 조립하지 않으므로 두 폴더 밖으로 나갈 수 없다.
- 알림음은 D-4에 따라 지운다(`assets/alarm.{wav,mp3,ogg}`, CR-048). 작업 스케줄러 등록은 건드리지 않는다(D-3). 데이터 폴더 밖(예: `%LOCALAPPDATA%`의 WebView2 데이터)은 건드리지 않는다.
- `removed`에는 ①에서 지운 표식 파일이 들어가지 않는다(②의 개수만).

### 3.4.1 ⓪ 시작 폴더 검사 `check_start_dirs` (R-A4 보강, SEC-001)

비유: 창고 청소부가 창고 문을 열기 전에 문패부터 본다. 「이 문은 다른 건물로 이어지는 통로」라고 적혀 있으면 들어가지 않고 돌아선다.

`remove_matching`은 항목 단위로 링크를 걸렀지만, **시작 폴더 자체**(`data_dir`·`assets_dir`)가 정션·심볼릭 링크면 `read_dir`가 링크 대상 폴더를 열어 그 안의 `*.png` 등을 지운다(데이터 폴더 밖 삭제). ⓪이 이를 막는다.

```rust
use std::os::windows::fs::MetadataExt; // file_attributes() — Windows 전용 앱(확정사항 §1)

/// Windows FILE_ATTRIBUTE_REPARSE_POINT — 심볼릭 링크·정션·마운트 지점 등 재분석 지점 전부.
const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;

/// 순수 판정(단위 테스트 대상). 링크이거나 재분석 지점 속성이 있으면 true.
fn is_link_like(is_symlink: bool, file_attributes: u32) -> bool {
    is_symlink || file_attributes & FILE_ATTRIBUTE_REPARSE_POINT != 0
}

/// ⓪ data_dir → assets_dir 순서로 자기 자신을 symlink_metadata(링크를 따라가지 않음)로 본다.
/// 없으면(NotFound) 통과 — 기존 동작(read_dir NotFound = 지울 것 없음) 유지. 경로를 에러에 넣지 않는다.
pub(super) fn check_start_dirs(paths: &AppPaths) -> std::io::Result<()> {
    for dir in [&paths.data_dir, &paths.assets_dir] {
        let meta = match fs::symlink_metadata(dir) {
            Ok(m) => m,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => continue,
            Err(e) => return Err(e),
        };
        if is_link_like(meta.file_type().is_symlink(), meta.file_attributes()) {
            return Err(std::io::Error::other("data-reset: 시작 폴더가 링크·재분석 지점"));
        }
    }
    Ok(())
}
```

| 항목 | 결정 |
|---|---|
| 검사 위치 | **`reset_data_staged`의 맨 처음(⓪) — ① 표식 삭제 전, 아무 변경 전.** 시작 경로는 `startup_wipe`가 시도 기록 쓰기 **전에** 한 번 더 부른다(시도 기록이 링크 너머에 쓰이지 않게, §3.6). 시작 경로에서는 두 번 불리지만 메타데이터 조회 4회라 비용은 무시한다 |
| 실패 결과 | `ResetError::Io`(`reset.io`) — 새 code 없음(bridge 불변). 지우기·시딩·설정·표식·시도 기록 모두 건드리지 않는다. 시작 경로는 `단계=0-guard kind=Other` 경고 로그 뒤 앱 계속(§3.6) |
| 검사 범위 | 두 폴더 **자신만**. 조상 폴더(`%APPDATA%` 등)의 링크·폴더 리디렉션은 보지 않는다(확정 결정 범위, §11.6 L-2) |
| unsafe | 없음. `std::os::windows::fs::MetadataExt::file_attributes()`는 안전한 std API다 |
| 플랫폼 | `std::os::windows`를 직접 쓴다(Windows 전용 앱). `#[cfg]` 분기를 두지 않는다 |

### 3.5 세대 표식 `generation` (R-A1)

파일: 데이터 폴더 루트 `data-generation.json`. 내용 `{"generation":4,"appVersion":"0.1.1"}`. settings 스키마 밖에 둔다(02-design §4 근거 3가지).

```rust
pub(super) fn read_marker(data_dir: &Path) -> Option<u32>;                         // 없음·읽기 실패·파싱 실패·필드 없음·형식 오류 = None
pub(super) fn write_marker(data_dir: &Path, generation: u32) -> std::io::Result<()>; // settings::write_atomic
pub(super) fn remove_marker(data_dir: &Path) -> std::io::Result<()>;                // NotFound = Ok
#[cfg(test)]
pub(super) fn fingerprint(assets: &[DefaultAsset]) -> (usize, u64, u64);          // 장수, 바이트 합, FNV-1a 64
```

- 읽기: `fs::read_to_string` → `serde_json::from_str::<MarkerIn>`(비공개 `struct MarkerIn { generation: u32 }`, 모르는 필드 무시). 어느 단계든 실패하면 `None`이다. 로그는 남기지 않는다(`run_startup`이 `stored:?`로 남김).
- 쓰기: 비공개 `#[serde(rename_all = "camelCase")] struct MarkerOut<'a> { generation: u32, app_version: &'a str }`를 `serde_json::to_vec`로 만들고(실패는 `std::io::Error::other`로 감쌈) `crate::settings::write_atomic(&data_dir.join(MARKER_FILE), &bytes)`로 쓴다. `app_version = env!("CARGO_PKG_VERSION")`는 진단용이며 판정에 쓰지 않는다.
- 삭제: `fs::remove_file`. `ErrorKind::NotFound`만 `Ok(())`로 바꾼다. 같은 이름의 폴더가 있으면 실패한다(`Err`, 테스트 실패 주입에 쓴다).
- 지문(테스트 전용): `DEFAULT_ASSETS` 순서대로 장마다 `file_key()`의 UTF-8 바이트, 구분 바이트 `0x00`, 그림 바이트를 FNV-1a 64(오프셋 `0xcbf2_9ce4_8422_2325`, 소수 `0x0000_0100_0000_01b3`)에 차례로 넣는다. 바이트 합은 그림 바이트 길이의 합이다. 슬롯 이름이 바뀌어도 지문이 바뀐다.

### 3.6 시작 진입점 `run_startup` (R-A2·R-A3·R-A5)

```rust
pub fn run_startup(paths: &AppPaths, settings: &Mutex<Settings>) {
    let started = Instant::now();
    let stored = generation::read_marker(&paths.data_dir);
    match decide(stored, DATA_GENERATION, POLICY) {
        StartupAction::Keep => log::info!(
            "data-reset: 세대 {DATA_GENERATION} 일치 — 건너뜀 ({} ms)", started.elapsed().as_millis()),
        StartupAction::WipeAll => match startup_wipe(paths, settings) {
            Ok(Some(o)) => log::info!(
                "data-reset: 저장 세대 {stored:?} → {DATA_GENERATION}, 정책 {POLICY:?}, 삭제 {} · 기본 그림 {} ({} ms)",
                o.removed, o.seeded, o.elapsed_ms),
            Ok(None) => {} // 상한 도달 — startup_wipe가 경고를 남겼다(R-A7)
            Err((stage, e)) => log::warn!(
                "data-reset: 초기화 실패 단계={} code={} kind={:?} — 앱은 계속 시작, 다음 시작 때 재시도",
                stage.label(), e.code(), io_kind(&e)),
        },
    }
}

/// WipeAll 판정 뒤 시작 경로 전용(R-A7): ⓪ 검사 → 상한 확인 → 시도 +1 기록 → ⓪~⑥.
/// Ok(None) = 상한 도달로 지우지 않음.
fn startup_wipe(paths: &AppPaths, settings: &Mutex<Settings>)
    -> Result<Option<ResetOutcome>, (Stage, ResetError)>
{
    wipe::check_start_dirs(paths).map_err(at(Stage::Guard))?; // 시도 기록이 링크 너머에 쓰이지 않게 먼저
    let tried = attempts::read_attempts(&paths.data_dir);
    if tried >= MAX_STARTUP_ATTEMPTS {
        log::warn!(
            "data-reset: 시작 초기화가 연속 {tried}회 끝나지 못해 상한({MAX_STARTUP_ATTEMPTS})에 도달 — \
             지우지 않고 계속 시작(설정 창 「전체 초기화」가 성공하면 해제)");
        return Ok(None);
    }
    attempts::write_attempts(&paths.data_dir, tried + 1).map_err(at(Stage::Attempts))?;
    reset_data_staged(paths, settings).map(Some)
}

/// 로그용 io::ErrorKind(CORE-005). io::Error를 품은 변형만 Some. Display·경로는 쓰지 않는다.
fn io_kind(e: &ResetError) -> Option<std::io::ErrorKind> {
    match e {
        ResetError::Io(io) | ResetError::Settings(SettingsError::Io(io)) => Some(io.kind()),
        _ => None,
    }
}
```

- 반환값이 없고 패닉도 없다(`unwrap`·`expect`·`panic!` 금지). 설정 잠금 poison은 `update`가 `StatePoisoned`로 돌려주므로 `Err(Settings)` → 경고 로그로 끝난다(시작 시점에는 다른 스레드가 없어 실제로는 생기지 않는다).
- **로그에 경로·사용자 이름을 넣지 않는다**(데이터 폴더 경로에 Windows 사용자 이름이 들어간다). 파일 수·code·ms·세대 번호·**단계 이름·`io::ErrorKind`**(2차)만 남긴다. 에러 `Display`(`{e}`)도 로그에 넣지 않는다 — OS 오류 문구 대신 code·kind만 남긴다. `ErrorKind`의 `Debug`(예: `PermissionDenied`)에는 경로가 없다.
- **단계 로그 방식(CORE-005 결정).** 비공개 `Stage`를 `reset_data_staged`가 에러와 함께 돌려주고 `run_startup`만 로그에 쓴다. `ResetError`에 단계를 싣지 않는다(공개 변형·`code()` 불변 — bridge `From<ResetError>`·계약 코드표 영향 없음). `kind`는 `ResetError::Io`와 `Settings(SettingsError::Io)`에서만 꺼내고, 그 밖(`Seed`·`Settings(Invalid|Format|StatePoisoned)`)은 `None`이다. 로그 예: `단계=2-wipe code=reset.io kind=Some(PermissionDenied)`, `단계=3-seed code=reset.seed kind=None`, `단계=0-guard code=reset.io kind=Some(Other)`.
- 버튼 경로(`reset_data`)는 단계를 버린다(bridge는 `code()`만 쓴다). 버튼 실패 로그는 bridge 소관이다.

### 3.6.1 시작 경로 반복 상한 `attempts` (R-A7, CORE-001)

비유: 자동 재시동 장치에 「세 번 연속 시동이 안 걸리면 더 돌리지 않는다」는 카운터를 단다. 카운터는 시동을 걸기 **전에** 올리고(도중에 멈춰도 한 번으로 센다), 시동이 걸리면 0으로 돌린다. 운전자가 직접 키를 돌리는 것(버튼)은 카운터와 상관없이 되고, 성공하면 카운터도 풀린다.

| 항목 | 결정 |
|---|---|
| 파일 | 데이터 폴더 바로 아래 **`data-reset-attempts.json`**, 내용 `{"attempts":2}`. 표식과 별도(표식은 「완료 증거」, 이건 「시도 횟수」 — 섞으면 ①이 지울 때 횟수도 사라진다). settings 스키마 밖 |
| 상한 N | **3**(`MAX_STARTUP_ATTEMPTS`, mod.rs 비공개) |
| 판정 | `tried = read_attempts()`. `tried >= 3`이면 지우지 않고 경고만(표식 없음 상태 유지 → 매 시작마다 같은 경고). 아니면 `write_attempts(tried + 1)`(원자적) 뒤 `reset_data_staged` |
| 셈 시점 | **⓪ 검사 뒤·① 전에 +1.** 실패 반환뿐 아니라 초기화 도중 강제 종료·정전도 1회로 센다(실패 후에 올리면 이런 경우를 놓친다) |
| 해제 | `reset_data_staged` 성공 끝의 ⑥ `clear_attempts`(시작·버튼 공통). 버튼 경로는 상한을 보지 않으므로 상한에 걸린 사용자의 해제 수단이다 |
| 읽기 실패 | 파일 없음·읽기 실패·JSON 손상·필드 없음·형식 오류(`"2"`, 음수) = **0**. 카운터 손상으로 초기화가 영영 막히지 않게 한다(열린 쪽 실패). `write_atomic`이라 찢어진 쓰기는 생기지 않는다 |
| 쓰기 실패 | `Stage::Attempts`로 **초기화하지 않고** 경고 로그(`단계=attempts code=reset.io kind=…`). 횟수를 못 남기면 상한이 무력해지므로 지우지 않는 쪽(닫힌 쪽 실패)을 택한다. 쓰기가 안 되는 폴더면 어차피 ①~⑤도 실패한다 |
| wipe와의 관계 | 본체는 화이트리스트 **밖**(②가 지우면 매 시도가 1회째가 됨). 잔여 임시 파일 `data-reset-attempts.json*.tmp`만 ②가 지운다(§3.4) — 같은 스레드에서 쓰기(rename 완료) 뒤에 ②가 돌므로 경합이 없다 |
| 오버플로 | `tried >= 3`이면 더하지 않으므로 `u32` 넘침이 없다 |

```rust
// src-tauri/src/data_reset/attempts.rs (비공개 모듈)
pub(super) const ATTEMPTS_FILE: &str = "data-reset-attempts.json";

#[derive(Debug, Serialize, Deserialize)]
struct AttemptsFile { attempts: u32 } // 모르는 필드 무시

pub(super) fn read_attempts(data_dir: &Path) -> u32;                               // 없음·실패·손상 = 0
pub(super) fn write_attempts(data_dir: &Path, attempts: u32) -> std::io::Result<()>; // serde_json::to_vec → settings::write_atomic
pub(super) fn clear_attempts(data_dir: &Path) -> std::io::Result<()>;               // remove_file, NotFound = Ok
```

- `ATTEMPTS_FILE`은 `pub(super)`다(형제 `wipe`가 tmp 접두어로 쓴다). 통합 테스트는 파일 이름 문자열과 JSON을 직접 읽고 쓴다(DR-4와 같은 이유 — 테스트 전용 공개 항목을 만들지 않는다).
- 상한에 걸린 상태에서 lib.rs의 `seed_default_assets`(CR-035)는 그대로 돈다. 부분 삭제로 manifest가 비고 기본 그림 파일이 없으면 그것이 채운다(기존 동작).

### 3.7 `lib.rs` 시작 순서 (🔒 순서, core-implementer)

현재(lib.rs:95-99): AppPaths → create_dir_all → `seed_default_assets` → `load_or_default` → `load_manifest`.

목표:

```
:95  let paths = AppPaths::new(&handle)?;
:96  std::fs::create_dir_all(&paths.assets_dir)?;
 ★   let settings = startup_settings(&paths);         // load_or_default → data_reset::run_startup → 값 꺼내기
:97  seed_default_assets(&paths.assets_dir);           // 유지(CR-035 S1 — 사용자가 전부 비운 경우). 초기화 직후엔 Skipped(NotEmpty)
:99  let manifest = assets::load_manifest(..) …        // 이후 기존 순서 그대로 — 손 기준점·타이머 from_settings·AppState.settings가 초기화 뒤 값을 쓴다
```

```rust
// run() 밖, seed_default_assets 옆의 비공개 도우미
/// 설정 로드 + 데이터 세대 검사(R-A2). 세대가 다르거나 없으면 전체 초기화한 뒤의 값을 돌려준다.
/// 반드시 seed_default_assets·load_manifest보다 먼저 부른다.
fn startup_settings(paths: &AppPaths) -> Settings {
    let state = Mutex::new(settings::load_or_default(&paths.settings_file));
    data_reset::run_startup(paths, &state);
    state.into_inner().unwrap_or_else(std::sync::PoisonError::into_inner)
}
```

- `AppState { settings: Mutex::new(settings.clone()), … }`(lib.rs:125)은 **그대로 둔다.** 패킷은 `settings_state`를 AppState에 옮겨 넣고 중간 코드가 잠금 복사본을 쓰게 했지만, `into_inner`로 값을 꺼내면 setup의 나머지 줄이 바뀌지 않는다(결과 동일, §11.1 Δ4). setup 클로저는 이미 50줄을 넘으므로(기존 부채) 줄을 늘리지 않는다 — 기존 `let settings = settings::load_or_default(..)` 한 줄이 `startup_settings` 한 줄로 바뀌고 `seed_default_assets` 줄과 자리를 바꾼다.
- `seed_default_assets` 주석은 「CR-035 DA-02 — data-reset 뒤에 돈다(초기화 직후엔 Skipped)」로 고친다.
- 창·훅·트레이·자동 실행 보정 스레드의 순서와 내용은 바꾸지 않는다. 보정 스레드(:165)는 기존대로 `autostart`를 실제 등록 상태에 맞춘다.
- 2차: setup 이전, Builder의 첫 플러그인으로 단일 인스턴스를 등록한다(§3.10). setup 안의 순서는 위와 같다.
- `//!` [계층] 줄의 모듈 목록에 `data_reset`을 더한다. `generate_handler!` 목록은 건드리지 않는다(bridge 패킷이 `reset_app_data`를 등록한다 — §9).

### 3.8 `tray::refresh_overlay` 가시성 (R-B2)

- `tray/mod.rs:246` `fn refresh_overlay(app: &AppHandle) -> Result<(), BridgeError>` → `pub(crate) fn`. 본문은 바꾸지 않는다([tray.md](tray.md) §3.4). bridge `reset_app_data`가 마지막 단계에서 부른다.

### 3.9 버전 0.1.1 (R-C1 core 부분)

| 파일 | 줄 | 변경 |
|---|---|---|
| `src-tauri/tauri.conf.json` | `"version"`(:4) | `"0.1.0"` → `"0.1.1"` |
| `src-tauri/Cargo.toml` | `[package] version`(:3) | `"0.1.0"` → `"0.1.1"` |
| `src-tauri/Cargo.lock` | `kuro_keyviewer` 항목 | `cargo check`가 자동 갱신(손으로 고치지 않음) |

- `package.json`은 ui 패킷 몫이다. 버전과 세대는 서로 독립이다(버전을 올려도 `DATA_GENERATION`은 그대로).

### 3.10 단일 인스턴스 (R-A8, CORE-002 — `lib.rs`, core-implementer)

결론: `tauri_plugin_single_instance`를 Builder의 **첫 플러그인**으로 등록한다. 두 번째 실행은 플러그인 setup에서 끝나므로 앱 setup(`startup_settings` → `run_startup`의 ⓪~⑥, 훅, 트레이)에 닿지 않는다. 기존 인스턴스는 설정 창을 보여 준다.

비유: 가게 문에 「영업 중」 팻말을 건다. 두 번째 점원이 와서 팻말을 보면 가게에 들어가 진열대를 치우는 대신, 안에 있는 점원에게 「손님이 찾는다」고 전하고 돌아간다.

```rust
// lib.rs run()
let result = tauri::Builder::default()
    // R-A8: 반드시 첫 번째 플러그인. 플러그인 setup은 등록 순서대로, 앱 .setup보다 먼저 돈다.
    .plugin(tauri_plugin_single_instance::init(on_second_instance))
    .plugin(tauri_plugin_dialog::init())
    .on_window_event(/* 기존 그대로 */)
    // …

/// 두 번째 실행 알림(R-A8). 기존 인스턴스의 메인 스레드에서 불린다. 설정 창을 보이거나(숨김 포함)
/// 없으면 재생성한다 — CR-041 경로(window::show_settings_window) 재사용. 실패는 경고만.
/// argv·cwd에는 exe 경로·사용자 이름이 들어가므로 로그에 남기지 않는다.
fn on_second_instance(app: &tauri::AppHandle, _argv: Vec<String>, _cwd: String) {
    if let Err(e) = window::show_settings_window(app) {
        log::warn!("두 번째 실행 감지 — 설정 창 표시 실패: {e}");
    }
}
```

| 항목 | 사실·결정 (근거) |
|---|---|
| 의존성 | `tauri-plugin-single-instance = "2"`(Cargo.toml:35, 잠금 2.5.0) — 메인 세션이 사용자 승인으로 이미 추가. 기능 플래그 없음(`semver` 끔 → 뮤텍스 이름에 버전이 안 들어가 **버전이 달라도 서로 막는다**) |
| 등록 순서 | 첫 `.plugin(...)`. 플러그인 README·`Builder::build` 문서가 첫 등록을 요구한다. Tauri 2(잠금 tauri 2.12.0 `app.rs`)는 `initialize_plugins`를 앱 `setup` 클로저보다 먼저 부른다 → 두 번째 프로세스는 `run_startup`에 닿지 않는다 |
| 감지 방식(Windows) | identifier(`com.kuro.keyviewer`) 기반 이름의 커널 뮤텍스 + 숨은 메시지 창. 두 번째 프로세스는 `WM_COPYDATA`로 인자를 넘기고 `cleanup_before_exit` 뒤 `std::process::exit(0)` — **두 번째 프로세스 종료는 플러그인이 한다** |
| 콜백 스레드 | 기존 인스턴스의 메인 스레드(숨은 창의 `WM_COPYDATA` 처리). 트레이 「설정 열기」(`tray/mod.rs:74`, 메뉴 이벤트 = 메인 스레드)와 같은 문맥에서 같은 함수를 부르므로 창 재생성(`WebviewWindowBuilder::build`)도 같은 조건이다 |
| 해제 | `RunEvent::Exit`에서 플러그인이 뮤텍스를 푼다(트레이 「종료」 = `app.exit(0)` 경로). 강제 종료·`process::exit(1)`(lib.rs 실행 실패)는 OS가 핸들을 닫아 뮤텍스가 사라진다 — 다음 실행이 막히지 않는다 |
| capabilities | **추가 불필요.** 이 플러그인 크레이트(2.5.0)에는 `permissions/`·`build.rs`·command가 없다(JS API 없음, Rust 전용). `src-tauri/capabilities/*.json` 불변 |
| dev·release | 같은 identifier라 `yarn tauri dev`와 설치본(0.1.1)을 동시에 띄울 수 없다(나중 것이 즉시 끝나고 먼저 것의 설정 창이 뜬다). 수동 확인 전에 한쪽을 트레이에서 종료한다 |
| 자동 테스트 | 불가(프로세스 2개·Tauri 런타임). 수동 M6~M8(§8.3) |
| 한계 | 0.1.0에는 이 플러그인이 없다 → §11.6 L-1 |

## 4. 스레드·채널

없음. 새 스레드·채널·정적 상태가 없다.

```
[시작]  setup(메인 스레드) ── startup_settings ── run_startup ── (WipeAll이면) reset_data  ── 동기, 창 생성 전
[버튼]  bridge reset_app_data(동기 command) ── reset_data ── (bridge가 이어서 창·이벤트 반영)
[2번째] (다른 프로세스) exe 재실행 ─ 플러그인 setup: 뮤텍스 있음 → WM_COPYDATA → exit(0)   ── run_startup 미도달
        (기존 프로세스) 메인 스레드 WM_COPYDATA ── on_second_instance ── window::show_settings_window
잠금:   settings Mutex — ④ update 안에서만(짧게, 잠금 안 파일 쓰기는 settings.md §3.9.7 D47-1 예외)
emit:   없음(이벤트는 bridge가 잠금 밖에서 보낸다)
```

- 2차에도 `data_reset`에는 새 스레드·채널·정적 상태가 없다. 시도 기록(§3.6.1)은 파일이고 시작 경로의 setup 스레드에서만 쓴다(버튼 경로는 ⑥ 삭제만). 단일 인스턴스 콜백은 `lib.rs` 소관이다(§3.10).

- 시작 경로에는 아직 AppState·창·훅이 없으므로 파일 작업만 한다(core-survey Q2).
- 비용 목표(02-design §7): Keep 경로 ≤ 5 ms(작은 파일 1개 읽기), 초기화 1회 ≤ 300 ms(삭제 + 내장 6장 시딩 + 설정·표식 원자 쓰기). 측정은 로그의 ms와 테스트 `reset_elapsed_under_budget` 출력으로 한다(단언하지 않음).

## 5. unsafe

없음. `data_reset/` 안에 `unsafe` 0건(패킷 수용 기준). 2차의 ⓪ 검사는 안전한 std API(`fs::symlink_metadata`, `std::os::windows::fs::MetadataExt::file_attributes`)만 쓴다. 단일 인스턴스 플러그인 내부의 Win32 호출(뮤텍스·`WM_COPYDATA`)은 외부 크레이트 안이며 우리 코드에는 `unsafe`가 생기지 않는다(`lib.rs`는 `init` 한 줄).

## 6. 에러 타입

`ResetError` (`#[derive(Debug, thiserror::Error)]`, 관례는 `AssetError`·`SettingsError`와 같다). **`Display`에 경로·OS 오류 문구를 넣지 않는다**(`{0}` 없음). 원인은 `#[source]`/`#[from]`으로 보존한다.

| 변형 | 한국어 메시지 | 원인 | `code()` |
|---|---|---|---|
| `Io(#[from] std::io::Error)` | 앱 데이터를 초기화하지 못했습니다. 다음에 앱을 시작할 때 다시 시도합니다. | ⓪ 시작 폴더가 링크·재분석 지점이거나 메타데이터 조회 실패(2차), ① 표식 삭제, ② 파일 삭제·폴더 읽기(NotFound 제외 — 2차), ⑤ 표식 기록 실패. 시작 경로 전용으로 시도 기록 쓰기 실패(로그만, 밖으로 안 나감) | **`reset.io`** |
| `Seed` | 기본 그림을 다시 채우지 못했습니다. 다음에 앱을 시작할 때 다시 시도합니다. | ③ 시딩 결과가 「내장 전부(`DEFAULT_ASSETS.len()` = 6장) 성공」이 아님(`Skipped`·일부 실패) | **`reset.seed`** |
| `Settings(#[from] SettingsError)` | `#[error(transparent)]` — `SettingsError`의 메시지 그대로 | ④ `settings::update` 실패 | **`SettingsError::code()` 그대로**(`settings.io`·`settings.invalid`·`settings.format`·`state.poisoned`) |

```rust
impl ResetError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Io(_) => "reset.io",
            Self::Seed => "reset.seed",
            Self::Settings(e) => e.code(),
        }
    }
}
```

- **2차: 변형·메시지·`code()` 문자열은 바꾸지 않는다**(bridge·계약 코드표 불변). 단계는 비공개 `Stage`로 따로 운반한다(§3.3·§3.6).

로그 전용 단계 표(비공개 `Stage::label`, CORE-005):

| `Stage` | label | 단계 | 나오는 code | `kind` |
|---|---|---|---|---|
| `Guard` | `0-guard` | ⓪ 시작 폴더 검사 | `reset.io` | `Some(Other)`(링크) 또는 조회 실패 kind |
| `Attempts` | `attempts` | 시작 경로 시도 기록 쓰기 | `reset.io` | 쓰기 실패 kind |
| `RemoveMarker` | `1-remove-marker` | ① | `reset.io` | 삭제 실패 kind |
| `Wipe` | `2-wipe` | ② | `reset.io` | 읽기·삭제 실패 kind |
| `Seed` | `3-seed` | ③ | `reset.seed` | `None` |
| `Settings` | `4-settings` | ④ | `settings.*`·`state.poisoned` | `settings.io`만 `Some(..)` |
| `WriteMarker` | `5-write-marker` | ⑤ | `reset.io` | 쓰기 실패 kind |

- `impl From<ResetError> for BridgeError`는 bridge 쪽에 둔다(스킬 §5). core는 bridge 타입을 모른다.
- `reset.io`·`reset.seed`는 계약 새 코드다(02-design §3, contract v0.25 — bridge-designer 확정). ui 표시 문구는 코드별 3개 국어 사전이 맡고, 위 한국어 메시지는 대체 문구다.

## 7. 설정 의존

| 방향 | 필드 | 기본값 | 비고 |
|---|---|---|---|
| 읽음 | `autostart` | `false` | 보존(D-3) |
| 읽음 | `language` | `Ko` | 보존(D-2). 초기화 전 설정 파일을 못 읽었으면 기본값(§3.2) |
| 씀(전체) | `Settings` 전부 | `Settings::default()` | `update` 한 번으로 교체(④). `overlay`는 (100,100)·표시(D-5) |
| 씀(별도 파일) | `data-generation.json` | 없음 | settings 스키마 밖(02-design §4). `version` 필드는 settings에 추가하지 않는다(settings.md D19 유지) |
| 씀(별도 파일, 2차) | `data-reset-attempts.json` `{"attempts":u32}` | 없음 = 0 | 시작 경로가 +1, ⑥이 삭제(§3.6.1). settings 스키마 밖 |

- 시작 때 `run_startup`에 넘기는 `Mutex<Settings>`는 `load_or_default` 결과다. 버튼 경로는 `AppState.settings`다.

## 8. 테스트 계획

공통 픽스처(`tempfile::tempdir()`, **실제 `%APPDATA%` 사용 금지**):

- `AppPaths { data_dir: tmp/"data", assets_dir: tmp/"data/assets", settings_file: tmp/"data/settings.json" }`. 먼저 `create_dir_all(assets_dir)`를 한다(lib.rs:96과 같은 전제 — `reset_data`는 폴더를 만들지 않는다).
- **v3 세트 설치**: `doc/assets/defaults-v3/*.png` 6장을 `concat!(env!("CARGO_MANIFEST_DIR"), "/../doc/assets/defaults-v3/", …)`로 읽어(`tests/sample_assets.rs` 전례) `assets::import_bytes`로 등록한다. 파일명 = 슬롯 file_key. manifest가 만들어진다.
- **커스텀 settings.json**: shoulder (1,2), part_pos (3,4), pen_pos (5,6), pen_mode false, timer.text_pos (7,8)·rotation 0, scale 1.5, **language `ja`**, **autostart true**, overlay x/y 지정. `serde_json`으로 써 둔다.
- 잡동사니: `assets/alarm.wav`(아무 바이트), `assets/kb_up.png.123-1.tmp`, `data/settings.json.123-1.tmp`, `assets/keep_me.txt`, `assets/sub/x.png`(하위 폴더), `data/EBWebView/x`(루트 하위 폴더), `tmp/outside.png`(데이터 폴더 밖 감시 파일).
- 표식 값 확인: 통합 테스트는 `data/data-generation.json`을 `serde_json::Value`로 읽어 `["generation"] == DATA_GENERATION`(5)를 본다(`generation`은 비공개 모듈, §11.2 DR-4).

### 8.1 단위 (`#[cfg(test)] mod tests`)

| 테스트 | 파일 | 단언 |
|---|---|---|
| `decide_table` | mod.rs | (None,4)→WipeAll · (Some(3),4)→WipeAll · (Some(4),4)→Keep · (Some(5),4)→WipeAll(D-6) |
| `marker_roundtrip` | generation.rs | tempdir에 `write_marker(dir, 4)` → `read_marker(dir) == Some(4)`. 파일에 `"appVersion"` 문자열이 있다 |
| `marker_missing_is_none` | generation.rs | 파일이 없으면 `None`. `remove_marker`는 파일이 없어도 `Ok` |
| `marker_corrupt_is_none` | generation.rs | 내용 `{`, `{"x":1}`, `[]`, `{"generation":"4"}`이면 각각 `None` |
| **`reset_settings_keeps_autostart_and_language`** (패킷 `keeps_autostart_only` 대체) | mod.rs | 커스텀 값(language `Ja`, autostart true, scale·overlay·mouse·timer 변경)에 대해 결과 == `Settings { autostart: true, language: Language::Ja, ..Settings::default() }` |
| `reset_error_codes` | mod.rs | `Io`→`reset.io`, `Seed`→`reset.seed`, `Settings(SettingsError::Io(..))`→`settings.io`, `Settings(StatePoisoned)`→`state.poisoned`. `Io`·`Seed`의 `to_string()`에 `\`·`:`(경로 흔적)이 없다 |
| `generation_fingerprint_guard` | generation.rs | `fingerprint(&DEFAULT_ASSETS) == DEFAULT_ASSETS_FINGERPRINT`. 실패 메시지: 「기본 그림이 바뀌었습니다. DATA_GENERATION을 올리고 옛 세트를 defaults-v{N}으로 옮긴 뒤 지문을 갱신하세요」 |
| **`link_like_table`** (2차, SEC-001) | wipe.rs | `is_link_like`: (false, 0x10 폴더)→false · (false, 0x20)→false · (true, 0x10)→true · (false, 0x400)→true · (false, 0x410)→true · (true, 0x400)→true |
| **`assets_target_uses_real_extension`** (2차, CORE-004) | wipe.rs | true: `a.png`·`B.PNG`·`kb_up.png.123-1.tmp`·`alarm.WAV`·`x.mp3`·`y.ogg`·`manifest.json`·`MANIFEST.JSON`. false: `png`·`tmp`·`wav`·`.png`(점으로 시작, 확장자 없음)·`keep_me.txt`·`png.txt`·`manifest.json.bak` |
| **`data_target_keeps_attempts_body`** (2차, R-A7) | wipe.rs | true: `settings.json.1-1.tmp`·`data-generation.json.1-1.tmp`·`data-reset-attempts.json.1-1.tmp`. false: `settings.json`·`data-generation.json`·**`data-reset-attempts.json`**·`other.tmp`·`EBWebView` |
| **`not_found_is_skipped`** (2차, CORE-003) | wipe.rs | `skip_not_found(Ok(1)) == Ok(Some(1))`, `skip_not_found(Err(NotFound))` → `Ok(None)`, `Err(PermissionDenied)` → `Err`이고 kind 유지 |
| **`attempts_roundtrip_and_clear`** (2차, R-A7) | attempts.rs | tempdir: 없음 → `read_attempts == 0` · `write_attempts(dir, 2)` → 2 · `clear_attempts` → 0 · 파일이 없어도 `clear_attempts`는 `Ok` |
| **`attempts_missing_or_corrupt_is_zero`** (2차, R-A7) | attempts.rs | 내용 `{`·`[]`·`{"x":1}`·`{"attempts":"2"}`·`{"attempts":-1}`이면 각각 0 |
| **`reset_error_io_kind`** (2차, CORE-005) | mod.rs | `io_kind(Io(NotFound)) == Some(NotFound)` · `io_kind(Settings(SettingsError::Io(PermissionDenied))) == Some(PermissionDenied)` · `Seed`·`Settings(StatePoisoned)` → `None`. `Stage` 7개의 `label()`이 서로 다르고 ASCII다 |

### 8.2 통합 (`src-tauri/tests/data_reset.rs`, tempdir)

| 테스트 | 절차 | 단언 |
|---|---|---|
| `reset_from_v3_with_custom_settings` | 픽스처 전부 + 표식 없음 → `m = Mutex::new(load_or_default)` → `run_startup(&paths, &m)` | assets 폴더 바로 아래 png가 **정확히 내장 6장**이고 각 바이트가 `DEFAULT_ASSETS`와 같다. v3에만 있던 `kb_down_0.png`가 없다. manifest 항목 슬롯 = `DEFAULT_ASSETS` 6개. `alarm.wav`·`.tmp` 두 개가 없다. **메모리 값과 `load_or_default(settings_file)` 모두 == `reset_settings(커스텀)` — 즉 language `ja`·autostart true 유지, 나머지 기본값.** 표식 = 5 |
| `wipe_keeps_unknown_files_and_subdirs` | 위와 같은 실행 뒤 | `keep_me.txt`·`assets/sub/x.png`·`data/EBWebView/x` 그대로 |
| `wipe_never_touches_outside_data_dir` | 위와 같은 실행 뒤 | `tmp/outside.png` 바이트 그대로 |
| `startup_skips_when_generation_matches` | 초기화 뒤 사용자가 `import_bytes`로 커스텀 kb_up을 넣고 `settings::update`로 scale을 바꿈 → `run_startup` 재실행 | 둘 다 그대로(Keep) |
| `fresh_empty_dir_is_seeded` | 빈 폴더 → `run_startup` | 내장 6장, 표식 5, 메모리·`load_or_default` 모두 `Settings::default()` |
| `failure_leaves_no_marker_and_retries` (**실패 주입 교체**, §11.1 Δ3) | 픽스처 + `data/data-generation.json`을 **폴더로**(안에 파일 1개) 만든다(① 실패) → `reset_data` | `Err`, `code() == "reset.io"`. v3 파일·커스텀 settings.json이 그대로(아무것도 안 지움). 그 폴더를 `remove_dir_all`한 뒤 `run_startup` → 표식 5, 내장 6장 |
| `startup_never_panics_on_failure` | 위 실패 상태에서 `run_startup` | 반환한다(패닉 없음). 표식 폴더가 그대로라 `read_marker`는 여전히 `None` |
| **`seed_failure_leaves_no_marker_and_retries`** (신규) | 픽스처 설치 뒤 `assets/kb_up.png` **파일을 지우고 같은 이름의 폴더**를 만든다(②는 폴더라 건너뜀 → ③ `seed_if_empty`가 `exists()`로 `FilesPresent`, defaults.rs:118) → `reset_data` | `Err`, `code() == "reset.seed"`. 표식 없음. 다른 png·manifest는 이미 지워짐(부분 삭제). 그 폴더를 지운 뒤 `run_startup` → 표식 5, 내장 6장 |
| **`language_defaults_when_settings_unreadable`** (신규, 🔒 사용자 지정) | `data/settings.json` = `{`(손상) + 표식 없음 → `m = Mutex::new(load_or_default)` → `run_startup` | 메모리 `language == Language::default()`(Ko), `load_or_default(settings_file) == Settings::default()`, 표식 5 |
| **`reset_twice_keeps_language_on_disk`** (신규, §11.1 Δ2 회귀 방지) | 커스텀(language `ja`) → `reset_data` 성공 → 곧바로 `reset_data` 한 번 더(메모리가 이미 보존 결과와 같음) | 두 번째도 `Ok`. `load_or_default(settings_file).language == Language::Ja`(디스크에 남음), 메모리와 같다 |
| `reset_elapsed_under_budget` (측정만) | 픽스처 → `reset_data` | `ResetOutcome`의 `removed`·`seeded`·`elapsed_ms`를 `println!`. 단언하지 않는다(목표 ≤ 300 ms). 완료 보고에 실측값을 싣는다 |
| **`start_dir_link_data_is_refused`** (2차, SEC-001) | `tmp/real_data/`에 v3 세트(`assets/`)·커스텀 settings.json·`assets/alarm.wav`를 둔다. `tmp/data` → `tmp/real_data` 링크(`make_dir_link`). `AppPaths`는 링크 경로로 직접 조립(`make_paths`가 폴더를 먼저 만들면 링크를 못 만든다). 스냅숏 → `reset_data` → `run_startup` | `reset_data`가 `Err`, `code() == "reset.io"`. 두 호출 뒤 `real_data` 아래 **파일 목록·바이트가 스냅숏과 같다**(삭제·시딩·설정·표식·시도 기록 모두 없음). 메모리 language `Ja` 그대로 |
| **`start_dir_link_assets_is_refused`** (2차, SEC-001) | `tmp/data`는 실제 폴더(커스텀 settings.json). `tmp/real_assets`에 v3 세트·`alarm.wav`. `tmp/data/assets` → `tmp/real_assets` 링크. 스냅숏 → `reset_data` → `run_startup` | `Err(reset.io)`. `real_assets` 스냅숏 동일. `tmp/data`에 `data-generation.json`·`data-reset-attempts.json`이 없다(⓪이 시도 기록 쓰기보다 먼저). settings.json 바이트 그대로 |
| **`startup_counts_failed_attempts_up_to_limit`** (2차, R-A7) | 픽스처(v3) + `assets/kb_up.png`를 폴더로 바꿔 ③ 실패 주입(`seed_failure_…`와 같은 방법 — ②가 도는 실패라 시도 기록이 ②를 살아남는지도 본다) → `run_startup` 3회 → `assets/sentinel.png` 생성 → 4번째 `run_startup` | 1·2·3회 뒤 시도 값 = 1·2·3. 4번째 뒤에도 3이고 **`sentinel.png`가 남아 있다**(②가 돌지 않음). 표식 없음 |
| **`startup_skips_wipe_at_limit`** (2차, R-A7) | 픽스처 전부(v3·커스텀 settings·잡동사니) + `data/data-reset-attempts.json` = `{"attempts":3}`, 표식 없음, 실패 주입 없음 → `run_startup` | v3 6장·`alarm.wav`·`.tmp` 그대로, 메모리·디스크 language `ja`·커스텀 값 그대로, 표식 없음, 시도 값 3 그대로 |
| **`success_clears_attempts`** (2차, R-A7) | 픽스처 + `{"attempts":2}`, 표식 없음 → `run_startup` | 표식 5, 내장 6장, **시도 기록 파일 없음** |
| **`button_reset_ignores_limit_and_clears`** (2차, R-A7) | 픽스처 + `{"attempts":3}`, 표식 없음 → `reset_data` 직접 → `run_startup` | `reset_data`가 `Ok`(상한 무관), 표식 5, 시도 기록 파일 없음. 이어진 `run_startup`은 Keep(내장 6장 그대로) |

- 2차 도우미(tests/data_reset.rs 안, 비공개):
  - `fn make_dir_link(link: &Path, target: &Path) -> bool` — ① `cmd /C mklink /J <link> <target>`(정션, 관리자 권한 불필요) ② 실패하면 `std::os::windows::fs::symlink_dir(target, link)`(개발자 모드·관리자) ③ 만든 뒤 `symlink_metadata(link)`의 `file_attributes() & 0x400 != 0`을 확인. 셋 다 안 되면 `false`. 테스트는 `false`면 `println!("SKIP {테스트 이름}: 디렉터리 링크를 만들 수 없음(권한)")`을 남기고 반환한다(경로는 출력하지 않는다). 완료 보고에 SKIP 여부를 싣는다.
  - `fn attempts_value(data_dir: &Path) -> Option<u64>` — `data-reset-attempts.json`을 `serde_json::Value`로 읽어 `["attempts"]`. 파일 없으면 `None`.
  - `fn snapshot(dir: &Path) -> Vec<(PathBuf, Vec<u8>)>` — 재귀로 일반 파일의 (상대 경로, 바이트)를 정렬해 모은다.
  - tempdir 정리: `remove_dir_all`은 정션을 따라 들어가지 않고 링크만 지운다(Rust std Windows 동작). 링크 대상도 같은 tempdir 안이다.
- 기존 11개는 그대로 통과해야 한다. `startup_never_panics_on_failure`는 시작 경로에서 ①이 실패하므로 이제 시도 기록 1이 남는다(단언 추가 없음). `seed_failure_leaves_no_marker_and_retries`의 주입 원리(`seed_if_empty`의 `exists()`)는 defaults.rs를 바꾸지 않으므로 유지된다(DR-12).
- 합계: 단위 14개(1차 7 + 2차 7) + 통합 17개(1차 11 + 2차 6) = **31개**. 패킷 §8의 13행(15개 테스트)에서 `keeps_autostart_only` → `keeps_autostart_and_language`로 바꾸고, 1차 신규 3개(`seed_failure_…`·`language_defaults_…`·`reset_twice_…`), 2차 신규 13개를 더했다. CORE-003의 실제 경합(다른 스레드 rename)은 결정적으로 재현할 수 없어 판정 도우미 단위 테스트로 대신한다. CORE-005 로그 문구는 자동 검사하지 않는다(코드 리뷰 + 수동 M9).
- 완료 기준: `cd src-tauri && cargo fmt --check` · `cargo clippy --all-targets -- -D warnings` 경고 0 · `cargo test` 전체 PASS, `cargo check` exit 0이고 `Cargo.lock`의 `kuro_keyviewer` 버전이 0.1.1.

### 8.3 수동 체크리스트 (앱 실행 — **D-7 백업 뒤에만**, 메인 세션)

> ⚠ dev(`yarn tauri dev`)와 release는 같은 데이터 폴더(`%APPDATA%\com.kuro.keyviewer\`)를 쓴다. 개발 PC에는 표식이 없어서 새 코드로 처음 실행하는 순간 데이터가 초기화된다. 구현자는 앱을 실행하지 않고 `cargo test`로만 검증한다. 수동 확인은 메인 세션이 사용자 승인으로 데이터 폴더를 백업한 뒤 한다(02-design D-7).

| # | 절차 | 기대 |
|---|---|---|
| M1 | 백업 뒤 첫 실행, 로그(stderr) 확인 | `data-reset: 저장 세대 None → 4, 정책 WipeAll, 삭제 N · 기본 그림 7 (… ms)`. 오버레이에 기본 그림, 위치 (100,100) |
| M2 | 설정 창 언어가 초기화 전과 같다(예: 일본어) | D-2 |
| M3 | 앱 재시작 | `data-reset: 세대 5 일치 — 건너뜀`. 데이터 그대로 |
| M4 | 로그 전체에서 데이터 폴더 경로·사용자 이름 검색 | 0건(R-A5) |
| M5 | 설정 창 「전체 초기화」(bridge·ui 구현 뒤) | 즉시 기본 그림·기본 위치. 실패하면 `reset.io` 문구, 다음 시작 때 재시도 로그 |
| M6 (2차, R-A8) | 0.1.1 실행 중에 같은 exe를 한 번 더 실행 | 두 번째 프로세스가 곧바로 끝난다(작업 관리자에 `kuro-keyviewer` 1개). 기존 인스턴스의 설정 창이 앞으로 나온다. 트레이 아이콘 1개 |
| M7 (2차, R-A8) | 설정 창을 X로 닫은(숨김) 상태에서 M6 반복 | 숨겨진 설정 창이 다시 보이고 포커스를 받는다(CR-041 경로) |
| M8 (2차, R-A8) | M6 직전·직후 데이터 폴더 `data-generation.json`·`settings.json`·`assets\` 수정 시각 비교 | 바뀌지 않는다(두 번째 프로세스가 `run_startup`에 닿지 않음) |
| M9 (2차, R-A5·CORE-005) | 코드 리뷰: `run_startup` 실패 로그 한 줄 | `단계=… code=… kind=…`만 있고 경로·`{e}`·argv·cwd가 없다. `on_second_instance`도 argv·cwd를 로그에 넣지 않는다 |

> 2차 주의: 0.1.0이 실행 중이면 M6~M8이 성립하지 않는다(§11.6 L-1). **테스터 안내: 0.1.0을 트레이 「종료」로 끈 뒤 0.1.1을 설치·실행한다.** dev(`yarn tauri dev`)와 설치본도 서로 막으므로 한쪽을 끄고 확인한다(§3.10).

## 9. bridge 요구 명세 (계약 확정은 bridge-designer)

core가 새로 **내보내는 사건은 없다.** 받을 명령과 core 쪽 사실만 적는다.

| 항목 | 내용 |
|---|---|
| 명령(이름 후보) | `reset_app_data`(02-design §3). 동작 = `data_reset::reset_data(&state.paths, &state.settings)` 호출 뒤, **결과와 관계없이** 디스크 사실로 두 창을 맞춘다(bridge `reapply_after_reset`). 인자 없음, 반환 `()` |
| 실패 사유 | `ResetError::code()` — `reset.io`(①②⑤), `reset.seed`(③), 그리고 ④에서 `SettingsError::code()` 그대로(`settings.io`·`settings.invalid`·`settings.format`·`state.poisoned`). 실사용은 `reset.io`·`reset.seed`·`settings.io`·`state.poisoned` 4개(02-design §3과 같음). `From<ResetError> for BridgeError`는 bridge가 `code()`·`to_string()`으로 옮긴다 |
| 잠금 조건 | `reset_data`를 부르는 동안 설정 잠금을 쥐고 있으면 안 된다(④ `update`가 같은 잠금을 잡음 → 교착). 패킷의 `lock_settings(&state)?.timer.clone()`처럼 **문장 끝에서 풀리는 임시 잠금**은 괜찮다 |
| 동기 여부 | 동기(≤ 300 ms 목표). `set_settings`와 같은 동기 command로 충분하다 |
| 빈도 | 사용자 조작 1회당 1번 |
| 부분 성공 | `Err`여도 일부 파일이 이미 지워졌을 수 있다. 메모리 설정은 ④ 전 실패면 이전 값, ④ 뒤(⑤) 실패면 새 값이다. 그래서 bridge는 결과와 무관하게 메모리 `Settings`·디스크 manifest를 다시 읽어 이벤트를 보낸다(패킷 bridge §2와 일치) |
| 동시 실행 | assets에는 잠금이 없다. 초기화 중 `import_asset` 등이 끼면 결과가 섞일 수 있다. ui가 pending 동안 다른 조작을 막는다(02-design §2 `resetPhase`). bridge 직렬화가 필요하면 bridge-designer 판단(§11.4 C-4) |
| Windows 파일 잠금 | WebView가 asset 프로토콜로 PNG를 읽는 중이면 삭제가 실패할 수 있다(미검증, core-survey Q5). 그 경우 `reset.io` → 다음 시작 때 재시도. 수동 M5로 확인 |
| 오버레이 새로고침 | `tray::refresh_overlay(&AppHandle) -> Result<(), BridgeError>`가 `pub(crate)`가 된다(§3.8). 실패 코드 `window.not_found`·`window.reload_failed`를 command 에러로 내보낼지는 bridge 계약 소관(패킷 bridge §2는 경고 로그로 처리) |
| 노출하지 않는 것 | 세대 번호·앱 버전·`ResetOutcome`은 ui에 보내지 않는다(요구 없음 — 02-design §10). 2차의 시도 횟수·실패 단계(`Stage`)도 보내지 않는다 |
| **2차 영향(계약 변경 없음)** | ⓪ 시작 폴더가 링크면 버튼도 `reset.io`로 실패한다(새 code 없음). 성공한 버튼 초기화는 시도 기록을 지워 시작 경로 상한을 푼다(bridge가 할 일 없음). `reset_data` 시그니처·`ResetError` 변형·`code()` 문자열 불변 → `From<ResetError> for BridgeError`·`contract.md` 코드표 수정 불필요. 두 번째 실행 → 설정 창 표시는 command·event가 아니라 `lib.rs` 콜백이 core `window` 함수를 직접 부른다(§3.10) |

## 10. 요구 추적표

| 요구ID | 반영 절 | 테스트 | 상태 |
|---|---|---|---|
| R-A1 | §2 `MARKER_FILE`, §3.5 | `marker_roundtrip`·`marker_missing_is_none`·`marker_corrupt_is_none` | ✅ 설계 |
| R-A2 | §3.2·§3.6·§3.7 | `reset_from_v3_with_custom_settings`·`fresh_empty_dir_is_seeded`·`startup_skips_when_generation_matches`·`language_defaults_when_settings_unreadable`·`reset_twice_keeps_language_on_disk` | ✅ 설계 |
| R-A3 | §3.3·§3.6 | `failure_leaves_no_marker_and_retries`·`seed_failure_leaves_no_marker_and_retries`·`startup_never_panics_on_failure` | ✅ 설계 |
| R-A4 | §3.4·§3.4.1(2차 ⓪)·§3.3 ⓪ | `wipe_keeps_unknown_files_and_subdirs`·`wipe_never_touches_outside_data_dir`, 2차 `link_like_table`·`start_dir_link_data_is_refused`·`start_dir_link_assets_is_refused`(SEC-001), `assets_target_uses_real_extension`(CORE-004), `not_found_is_skipped`(CORE-003) | ✅ 설계(링크 테스트는 권한 없으면 SKIP — 보고 필수) |
| R-A5 | §3.3 ③ 로그·§3.6(2차 단계·kind)·§6 단계 표 | 코드 리뷰 + 수동 M1·M3·M4·M9, 2차 `reset_error_io_kind` | ✅ 설계 |
| R-A6 | §3.1 | `decide_table` | ✅ 설계 |
| **R-A7** (2차) | §2·§3.3 ⑥·§3.6·§3.6.1·§3.4(tmp만) | `attempts_roundtrip_and_clear`·`attempts_missing_or_corrupt_is_zero`·`data_target_keeps_attempts_body`·`startup_counts_failed_attempts_up_to_limit`·`startup_skips_wipe_at_limit`·`success_clears_attempts`·`button_reset_ignores_limit_and_clears` | ✅ 설계 |
| **R-A8** (2차) | §3.10·§4 | 자동 테스트 불가 — 수동 M6·M7·M8 | ✅ 설계(수동 검증 대기) |
| R-A2' | §2 `DATA_GENERATION` 주석, §3.5 지문 | `generation_fingerprint_guard` | ✅ 설계 |
| R-B2 (core 부분) | §2 `reset_data`, §3.8, §9 | 통합 테스트 전부(`reset_data` 직접 호출 포함). 창 반영은 bridge 테스트 | ✅ 설계 |
| R-B3 (core 부분) | §6 | `reset_error_codes`, `failure_…`(`reset.io`), `seed_failure_…`(`reset.seed`) | ✅ 설계 |
| R-C1 (core 부분) | §3.9 | `cargo check` exit 0 + `Cargo.lock` 0.1.1 대조 | ✅ 설계 |

## 11. 설계 결정 노트

### 11.1 패킷(`data-reset-03-packet-core.md`) 대비 델타

| # | 패킷 | 이 문서 | 근거 |
|---|---|---|---|
| Δ1 | `reset_settings` = `autostart`만 보존, language 초기화(D-2 결정 대기) | **`autostart`·`language` 보존**. `language: current.language`(`.clone()` 없음) | 🔒 사용자 결정 D-2 = 유지(2026-09-27). `Language`는 `Copy`(settings/mod.rs:123)라 `.clone()`이면 `clippy::clone_on_copy` 경고 → `-D warnings` 실패. 의미는 같다 |
| Δ2 | `wipe`가 데이터 폴더의 `settings.json` 본체를 지운다. 「④가 저장을 생략해도 파일이 없으면 다음 로드는 기본값」 | **`settings.json` 본체는 지우지 않는다**(`.tmp`만). ④가 덮어쓴다 | `update`는 값이 같으면 쓰지 않는다(store.rs:35). 언어를 보존하게 되면서 「메모리 == 보존 결과」인 경우(버튼 두 번 연속, 아무것도 안 바꾼 `ja` 사용자의 시작 초기화)에 파일이 사라진 채 남아 **다음 시작 때 언어가 기본값으로 돌아간다**(D-2 위반, 메모리↔디스크 불일치). 대안 비교는 §11.2 DR-2 |
| Δ3 | 실패 주입 = `data/settings.json`을 폴더로 → ② 실패 → `reset.io` | `data/data-generation.json`을 폴더로 → ① 실패 → `reset.io`. ③ 실패 테스트 추가(`assets/kb_up.png` 폴더 → `reset.seed`) | 화이트리스트는 「일반 파일만」이라 폴더인 `settings.json`은 ②가 건너뛴다. 그러면 ④에서 `settings.io`가 나거나(Δ2 전), 값이 같아 성공한다(Δ2 뒤). 패킷의 기대(`reset.io`)와 맞지 않았다. ① 폴더 주입은 Windows·Linux 모두 `remove_file`이 실패해 결정적이다. 부분 삭제 뒤 재시도(R-A3 핵심)는 ③ 실패 테스트가 증명한다 |
| Δ4 | `AppState.settings`에 `settings_state`를 넣고 중간 코드는 잠금 복사본 | 도우미 `startup_settings`가 `into_inner`로 값을 꺼낸다. `AppState` 줄 불변 | 결과 동일. setup 클로저(이미 50줄 초과) 줄 수를 늘리지 않는다 |
| Δ5 | `wipe` 반환 `Result<usize, ResetError>`, 자식 함수 `pub` | `std::io::Result<usize>`, 자식 함수 `pub(super)`, 자식 모듈 비공개 | `ResetError::Io`는 `#[from]`으로 `?` 변환. 밖에 보일 필요가 없다(스킬 §10) |
| Δ6 | 테스트 13행(15개) | 18개(신규 3: `seed_failure_…`·`language_defaults_…`·`reset_twice_…`) | Δ2·Δ3 회귀 방지와 사용자 지정 테스트 |

### 11.2 결정

| ID | 결정 | 대안 | 채택 근거 |
|---|---|---|---|
| DR-1 | 판정을 `decide` 한 곳, `ResetPolicy` 변형 1개 | 정식 배포 변형을 미리 추가 | 🔒 사용자 결정·스킬 §10. 전환은 02-design §8 메모대로 이 함수와 상수만 바꾼다 |
| DR-2 | ② `settings.json` 본체 제외, ④ `update`가 덮어씀 | (a) 패킷대로 지움 → D-2 위반(Δ2) (b) settings에 「같아도 저장」 공개 함수 추가 → 손상 파일까지 정리되지만 settings 공개 API 변경(이번 자원 경계 밖) (c) `reset_data`가 `write_atomic`으로 settings.json을 직접 씀 → CR-047 단일 저장 창구 위반·직렬화 중복 | 값의 정확성을 settings 변경 없이 보장한다. 대가는 손상 파일이 한 경우에 남는 것(§3.3, 값은 기본값으로 정확) — (b)를 원하면 §11.4 C-1로 사용자 판단 |
| DR-3 | ③은 「`Seeded` + 내장 전부(`DEFAULT_ASSETS.len()`) 성공」만 성공 | 일부 성공 허용 | 표식은 완전한 초기화의 증거다. 일부만 채운 채 표식을 쓰면 재시도 기회가 사라진다 |
| DR-4 | 자식 모듈 비공개. 통합 테스트는 표식 JSON을 직접 읽는다 | `generation`을 `pub mod`로 | 테스트만을 위한 공개 항목을 만들지 않는다(스킬 §10) |
| DR-5 | 지문 함수·상수는 `#[cfg(test)]` | 공개 상수·함수 | 비공개 모듈의 미사용 항목은 `dead_code` 경고 → `clippy -D warnings` 실패. 가드 테스트만 쓰므로 테스트 빌드에만 둔다. 상수는 `DATA_GENERATION` 바로 아래에 둬 함께 고치게 한다 |
| DR-6 | `ResetError` `Display`에 `{0}` 없음, 로그는 `code`만 | `AssetError::Io`처럼 원문 포함 | 경로·사용자 이름 금지(적용 메모리·R-A5). 원인은 `#[source]`로 남는다 |
| DR-7 | `removed`는 ②의 개수만 | 표식 포함 | 표식은 「초기화 대상 데이터」가 아니라 완료 기록이다 |
| DR-8 | 확장자 비교는 대소문자 무시 | 정확히 일치 | Windows 파일 시스템은 대소문자를 구분하지 않는다. `ALARM.WAV`처럼 옮겨진 파일도 지운다 |
| DR-9 (2차, SEC-001) | ⓪ = `reset_data_staged` 맨 처음(① 전) + 시작 경로는 시도 기록 쓰기 전에 한 번 더. 판정은 `is_symlink() \|\| attrs & 0x400` | (a) `wipe` 안에서만 검사 (b) 시작 경로에서만 검사 (c) `canonicalize`로 실제 경로 비교 | (a)는 ①이 링크 너머의 표식을 먼저 지운다 (b)는 버튼 경로가 빠진다 (c)는 `\\?\` 접두어·드라이브 매핑 차이로 오판하기 쉽다. 속성 비트는 정션·심볼릭 링크·마운트 지점을 한 번에 잡는다 |
| DR-10 (2차, CORE-005) | 단계는 비공개 `Stage`를 `(Stage, ResetError)`로 운반, `reset_data`는 떼어 냄 | (a) `ResetError::Io`에 단계 필드 추가 (b) `thread_local`/전역에 마지막 단계 저장 | (a)는 공개 변형 변경 금지 위반(bridge가 씀) (b)는 정적 상태 추가. 튜플 운반은 공개 API를 그대로 두고 `?` 한 줄씩 `.map_err(at(..))`만 더한다 |
| DR-11 (2차, R-A7) | 시도 기록은 별도 파일, 시도 **전** +1, 읽기 실패 = 0, 쓰기 실패 = 지우지 않음, 성공 시 삭제(⑥, 시작·버튼 공통) | (a) 표식 파일에 횟수 필드 (b) 실패 뒤 +1 (c) 버튼 경로가 따로 삭제 | (a) ①이 표식을 지우므로 횟수도 사라진다 (b) 강제 종료·정전을 못 센다 (c) 삭제 위치가 둘로 갈린다 — ⑥ 한 곳이 두 경로를 덮는다 |
| DR-12 (2차, CORE-001 검토) | **`assets/defaults.rs`의 `seed_if_empty` `exists()`를 `is_file()`로 바꾸지 않는다** | `is_file()`로 교체 | ① 바꿔도 반복 실패가 없어지지 않는다 — 슬롯 이름의 폴더가 있으면 `import_bytes`가 그 자리에 쓰지 못해 `Seeded{failed:[..]}` → 여전히 `Err(Seed)`. 폴더는 R-A4상 지우지 않으므로 반복의 끝은 R-A7 상한이 맡는다 ② `exists()`는 「슬롯 이름을 무엇이든 차지하고 있으면 손대지 않는다」는 CR-035 보수 규칙과 같은 방향이다(사용자 파일 보호 유지) ③ assets 공개 동작·`tests/default_assets.rs`·`seed_failure_leaves_no_marker_and_retries`의 주입 원리가 그대로다. 대가: 드물게 슬롯 이름 폴더가 있으면 시작 초기화 뒤 그림이 비어 있을 수 있다(상한 3회 뒤 설정 창에서 원인 폴더를 치우고 「전체 초기화」) |
| DR-13 (2차, CORE-002) | 두 번째 실행 콜백 = `window::show_settings_window` 재사용, 실패는 경고 | 오버레이 표시·새 창·알림 | 요구는 「두 번째 실행을 막고 기존 인스턴스를 드러낸다」까지다. 트레이 「설정 열기」와 같은 함수라 새 창 로직이 없다(CR-041 재생성 포함) |
| DR-14 (2차, CORE-003·004) | NotFound 건너뜀은 항목 단위 두 곳(`symlink_metadata`·`remove_file`)만, 확장자는 `Path::extension` | 폴더 `read_dir` 항목 반복 오류도 건너뜀 / 수동 `rsplit` 유지 | 경합 창은 항목을 읽은 뒤 메타데이터·삭제 사이다. `rsplit('.')`은 점이 없는 이름 전체(`png`)를 확장자로 본다 |

### 11.3 파급 (Grep 2026-09-27)

| 대상 | 영향 |
|---|---|
| `lib.rs` setup(:95-99, :125) | 순서 변경(§3.7). `AppState` 리터럴 불변 |
| `tray/mod.rs:246` `refresh_overlay` | 가시성만(`pub(crate)`). 호출자 `tray/mod.rs:75` 불변 |
| `assets::defaults::seed_if_empty`·`DEFAULT_ASSETS` | 호출만 추가(시그니처 불변). `tests/default_assets.rs` 영향 없음 |
| `settings::update`·`write_atomic` | 호출만 추가. store.rs SU1~SU7 영향 없음 |
| bridge | 새 호출자(`reset_app_data`, bridge 패킷). 이 문서는 bridge 파일을 바꾸지 않는다 |
| 기존 공개 API 변경 | 없음(추가만) |
| **2차** `data_reset` 공개 API | 변경 0·추가 0. 호출자 `lib.rs`(`startup_settings` → `run_startup`), bridge `reset_app_data`(`reset_data`), `tests/data_reset.rs` 모두 수정 불필요(테스트는 추가만). `src-tauri/src/bridge/commands/tests.rs`의 `ResetError::Io`·`code()` 단언도 그대로 통과 |
| **2차** `lib.rs` Builder | 첫 `.plugin(tauri_plugin_single_instance::init(on_second_instance))` + 비공개 `on_second_instance`. `generate_handler!`·setup 본문 불변 |
| **2차** `window::show_settings_window` | 호출자 추가(`lib.rs` 콜백). 시그니처·본문 불변. [window.md](window.md) §2.0.1 끝에 교차 참조 한 줄(반영함) |
| **2차** `assets/defaults.rs`·capabilities | 불변(DR-12, §3.10) |

### 11.4 확인 필요

- **C-1** (DR-2) 손상된 `settings.json`이 「메모리 == 보존 결과(모두 기본값)」일 때 남는다. 값은 기본값으로 정확하고 기존 `load_or_default` 정책과 같다. 초기화가 손상 파일까지 반드시 지우길 원하면 settings에 강제 저장 함수를 더하는 별건(settings.md 공개 API 변경)이 필요하다 — 사용자 판단.
- **C-2** 요구ID R-A*/R-B*/R-C*는 02-design §0의 아키텍처 횡단 ID다. `doc/100_요구조건/`에는 없다.
- **C-3** D-7: 이 코드가 들어간 앱을 처음 실행하기 전에 개발 PC 데이터 폴더를 백업한다(메인 세션, 사용자 승인). 구현·테스트 단계에서는 앱을 실행하지 않는다.
- **C-4** 버튼 초기화 중 다른 에셋 명령과의 동시 실행·WebView 파일 잠금(§9). core는 실패를 `reset.io`로 돌려주고 다음 시작 때 재시도한다. bridge 직렬화 여부는 bridge-designer 판단.
- **C-5** 데이터 폴더 실제 경로는 `%APPDATA%\com.kuro.keyviewer\`(identifier)다. CLAUDE.md·스킬 §6의 옛 표기 `%APPDATA%\kuro_keyviewer\`와 달랐다(CORE-005) — **2026-09-28 메인 세션이 CLAUDE.md·스킬·명령·화면 테스트 문서를 `com.kuro.keyviewer`로 정정해 해소.**
- **C-6** `DEFAULT_ASSETS_FINGERPRINT`의 FNV 값은 구현 때 실측해 채운다(실측 게이트). 장수 7·바이트 합 376 708이 실측과 다르면 core-survey Q9 크기표가 낡은 것이므로 실측값을 따르고 보고한다.
- **C-8** (2차) `R-A7`·`R-A8`은 이 문서가 R-A 체계 다음 번호로 붙였다. 02-design §0 목록에 올릴지는 메인 세션 판단.
- **C-9** (2차, 사실 기록) `tauri-plugin-single-instance` 2.5.0은 `rust-version = "1.90"`인데 우리 `Cargo.toml`은 `rust-version = "1.77"`이다. 이 PC 툴체인으로 `cargo check`가 되면 빌드 문제는 없지만 선언이 실제 최소 버전보다 낮다. 고칠지는 메인 세션 판단(이 문서 범위 밖, Cargo.toml은 designer가 쓰지 않음).
- **C-10** (2차, 실측 게이트) 링크 테스트 2개는 `mklink /J`가 이 PC에서 되면 실제로 돈다. SKIP이 나오면 SEC-001은 단위 테스트(`link_like_table`)와 코드 리뷰로만 증명된 것이므로 완료 보고에 그 사실을 적는다. 또한 `symlink_metadata`가 정션에 대해 `file_attributes()`에 0x400을 돌려주는지 첫 실행에서 확인한다(안 되면 구현자는 테스트를 고치지 말고 보고).
- **C-7** (실측 게이트) `failure_leaves_no_marker_and_retries`는 「비어 있지 않은 폴더에 `fs::remove_file`을 하면 실패한다」에 기댄다(Windows `DeleteFileW`·Linux `unlink` 모두 폴더 삭제 불가 — 이 PC에 rust-src가 없어 std 소스로는 확인하지 못함). 첫 실행에서 실패하지 않으면 구현자는 테스트를 고치지 말고 보고한다.

### 11.5 2차 델타 — 배포 전 검증 WARN 6건 (사용자 승인 2026-09-27)

| 검증 ID | 심각도 | 요구 | 바뀐 설계 | 절 |
|---|---|---|---|---|
| SEC-001 | HIGH | R-A4 보강 | ⓪ `check_start_dirs` — `data_dir`·`assets_dir` 자체가 링크·재분석 지점(0x400)이면 `reset.io`, 아무 변경 없음. 없으면 통과 | §3.3·§3.4.1·§3.6 |
| CORE-001 | MEDIUM | R-A7 신설 | `data-reset-attempts.json` 시도 기록, 상한 3, 시도 전 +1, ⑥ 성공 시 삭제(시작·버튼 공통), 버튼은 상한 무관. `defaults.rs` 불변(DR-12) | §3.3 ⑥·§3.6·§3.6.1 |
| CORE-002 | MEDIUM | R-A8 신설 | `tauri_plugin_single_instance` 첫 플러그인, 콜백 = `show_settings_window`, capabilities 불변 | §3.10·§4 |
| CORE-003 | LOW | R-A4 | 항목별 `symlink_metadata`·`remove_file`의 NotFound 건너뜀(`skip_not_found`) | §3.4 |
| CORE-004 | LOW | R-A4 | `is_assets_target` = `Path::extension` | §3.4 |
| CORE-005 | LOW | R-A5 | 시작 실패 로그 = `단계`·`code`·`kind`. 비공개 `Stage`·`reset_data_staged`·`at`·`io_kind`. `ResetError`·`code()` 불변 | §3.3·§3.6·§6 |

새·바뀐 비공개 항목(구현 목록):

| 파일 | 항목 | 새/바뀜 |
|---|---|---|
| mod.rs | `const MAX_STARTUP_ATTEMPTS: u32 = 3` | 새 |
| mod.rs | `enum Stage { Guard, Attempts, RemoveMarker, Wipe, Seed, Settings, WriteMarker }` + `fn label(self) -> &'static str` | 새 |
| mod.rs | `fn at<E: Into<ResetError>>(stage: Stage) -> impl FnOnce(E) -> (Stage, ResetError)` | 새 |
| mod.rs | `fn reset_data_staged(paths: &AppPaths, settings: &Mutex<Settings>) -> Result<ResetOutcome, (Stage, ResetError)>` | 새(기존 `reset_data` 본문 + ⓪·⑥) |
| mod.rs | `fn startup_wipe(paths: &AppPaths, settings: &Mutex<Settings>) -> Result<Option<ResetOutcome>, (Stage, ResetError)>` | 새 |
| mod.rs | `fn io_kind(e: &ResetError) -> Option<std::io::ErrorKind>` | 새 |
| mod.rs | `pub fn reset_data` / `pub fn run_startup` | 본문만 바뀜(시그니처 불변) |
| wipe.rs | `const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400`, `fn is_link_like(is_symlink: bool, file_attributes: u32) -> bool`, `pub(super) fn check_start_dirs(paths: &AppPaths) -> std::io::Result<()>` | 새 |
| wipe.rs | `fn skip_not_found<T>(r: std::io::Result<T>) -> std::io::Result<Option<T>>` | 새 |
| wipe.rs | `fn is_assets_target`·`fn is_data_target`·`fn remove_matching` | 본문만 바뀜 |
| attempts.rs | `pub(super) const ATTEMPTS_FILE`, `struct AttemptsFile`, `pub(super) fn read_attempts`·`write_attempts`·`clear_attempts` | 새 파일 |
| lib.rs | `.plugin(tauri_plugin_single_instance::init(on_second_instance))`(첫 플러그인), `fn on_second_instance(app: &tauri::AppHandle, _argv: Vec<String>, _cwd: String)` | 새 |

### 11.6 한계 (알려진 제한)

- **L-1 0.1.0 공존.** 0.1.0에는 단일 인스턴스 플러그인이 없어 뮤텍스를 만들지 않는다. 그래서 ① 0.1.0 실행 중 0.1.1을 띄우면 0.1.1은 「첫 인스턴스」로 떠서 `run_startup`이 0.1.0이 쓰는 데이터 폴더를 초기화한다(0.1.0이 그 뒤 설정·manifest를 다시 쓰면 섞일 수 있다). ② 0.1.1 실행 중 0.1.0을 띄우면 0.1.0은 검사 없이 뜬다. 코드로 막을 수 없다(이미 배포된 0.1.0은 못 고친다). **테스터 안내: 0.1.0을 트레이 「종료」로 끈 뒤 0.1.1을 설치·실행한다.** 0.1.1 이후 버전끼리는 서로 막는다(`semver` 기능 끔).
- **L-2 조상 링크.** ⓪은 `data_dir`·`assets_dir` 자신만 본다. `%APPDATA%`가 통째로 다른 드라이브로 옮겨진(폴더 리디렉션·조상 정션) 환경에서는 두 폴더 자신이 링크가 아니므로 정상 초기화한다 — 삭제 범위는 여전히 두 폴더 바로 아래 화이트리스트뿐이다. 반대로 사용자가 앱 데이터 폴더 자체를 정션으로 옮겨 두었으면 **초기화가 영영 일어나지 않는다**(매 시작 `단계=0-guard` 경고, 버튼도 `reset.io`). 확정 결정(SEC-001)의 대가다. 재분석 지점 속성은 클라우드 자리표시자 등에도 붙으므로 그런 폴더도 같은 취급이다.
- **L-3 남은 시도 값.** ⑥ 삭제가 실패하면(경고만) 값이 남는다. 표식이 있어 평소엔 영향이 없고, 다음에 WipeAll 판정이 날 때(세대를 올린 다음 버전 등) 남은 값만큼 재시도 기회가 줄어든다. 값이 3으로 남았으면 그 버전의 시작 초기화는 건너뛰고 버튼으로만 된다. 삭제 실패는 폴더 권한 이상 같은 드문 경우라 따로 막지 않는다.
- **L-4 상한 도달 뒤 상태.** 상한에 걸리면 표식 없는 부분 초기화 상태가 남을 수 있다(예: ②까지 지우고 ③ 실패). lib.rs `seed_default_assets`(CR-035)가 가능한 만큼 채우고, 해제는 설정 창 「전체 초기화」 성공뿐이다.
