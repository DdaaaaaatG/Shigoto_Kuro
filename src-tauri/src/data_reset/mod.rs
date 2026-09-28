//! 앱 데이터 세대 초기화(R-A)·전체 초기화(R-B) — doc/200_설계/core/data_reset.md
//!
//! [목적] 표식(data-generation.json)의 세대가 DATA_GENERATION과 다르거나 없으면 앱 데이터를
//!        새 기본으로 초기화한다. 설정 창 「전체 초기화」도 같은 reset_data를 쓴다.
//! [정책] ★ 베타 정책, 정식 배포 전 재결정. 판정은 decide()/POLICY 한 곳. 정식 배포 전환안
//!        (옛 기본 그대로인 칸·좌표만 교체)은 doc/200_설계/architecture/data-reset-02-design.md §8 메모 — 미구현.
//! [순서] ⓪ 시작 폴더 검사(data_dir·assets_dir 자체가 링크·재분석 지점이면 중단) → ① 표식 삭제
//!        → ② 화이트리스트 삭제 → ③ 내장 기본 7장 시딩 → ④ settings::update(보존 규칙)
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
pub enum StartupAction {
    Keep,
    WipeAll,
}

/// 정책 분기는 이 함수와 `POLICY` 상수뿐이다(R-A6). `stored`는 표식 값(없음·손상 = `None`).
pub fn decide(stored: Option<u32>, current: u32, policy: ResetPolicy) -> StartupAction {
    match policy {
        ResetPolicy::WipeAll if stored == Some(current) => StartupAction::Keep,
        ResetPolicy::WipeAll => StartupAction::WipeAll, // None·작음·큼(D-6) 모두
    }
}

/// 초기화 결과(지운 파일 수·채운 그림 수·소요 ms).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResetOutcome {
    pub removed: usize,
    pub seeded: usize,
    pub elapsed_ms: u128,
}

#[derive(Debug, thiserror::Error)]
pub enum ResetError {
    #[error("앱 데이터를 초기화하지 못했습니다. 다음에 앱을 시작할 때 다시 시도합니다.")]
    Io(#[from] std::io::Error),
    #[error("기본 그림을 다시 채우지 못했습니다. 다음에 앱을 시작할 때 다시 시도합니다.")]
    Seed,
    #[error(transparent)]
    Settings(#[from] SettingsError),
}

impl ResetError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Io(_) => "reset.io",
            Self::Seed => "reset.seed",
            Self::Settings(e) => e.code(),
        }
    }
}

/// 보존 규칙(D-2·D-3·D-5): `autostart`·`language`만 유지하고 나머지는 기본값(오버레이 위치 포함).
pub fn reset_settings(current: &Settings) -> Settings {
    Settings {
        autostart: current.autostart, // D-3: OS 작업 등록의 거울 — 값 유지(등록도 건드리지 않음)
        language: current.language,   // D-2(🔒 유지): Language는 Copy — .clone() 쓰지 않음
        ..Settings::default()         // 오버레이 위치(100,100)·표시 포함 전부 기본값(D-5)
    }
}

/// 비공개 ③단계 — 내장 기본 7장을 전부 채웠을 때만 성공으로 본다(DR-3).
fn seed_fresh(assets_dir: &std::path::Path) -> Result<usize, ResetError> {
    use crate::assets::defaults::{seed_if_empty, SeedOutcome, DEFAULT_ASSETS};
    let outcome = seed_if_empty(assets_dir);
    match &outcome {
        SeedOutcome::Seeded { count, failed }
            if failed.is_empty() && *count == DEFAULT_ASSETS.len() =>
        {
            Ok(*count)
        }
        _ => {
            log::warn!("data-reset: 기본 그림 시딩 결과 {outcome:?}");
            Err(ResetError::Seed)
        }
    }
}

/// 실패 단계 — 로그 전용, 비공개(CORE-005). ResetError·code()에는 싣지 않는다.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Stage {
    Guard,
    Attempts,
    RemoveMarker,
    Wipe,
    Seed,
    Settings,
    WriteMarker,
}

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

/// 시작·버튼 공통 초기화(R-A2·R-A3·R-B2). 순서 고정 ⓪~⑥.
pub fn reset_data(
    paths: &AppPaths,
    settings: &Mutex<Settings>,
) -> Result<ResetOutcome, ResetError> {
    reset_data_staged(paths, settings).map_err(|(_, e)| e)
}

/// ⓪~⑥ 본문. 순서 고정.
fn reset_data_staged(
    paths: &AppPaths,
    settings: &Mutex<Settings>,
) -> Result<ResetOutcome, (Stage, ResetError)> {
    let started = Instant::now();
    wipe::check_start_dirs(paths).map_err(at(Stage::Guard))?; // ⓪
    generation::remove_marker(&paths.data_dir).map_err(at(Stage::RemoveMarker))?; // ①
    let removed = wipe::wipe(paths).map_err(at(Stage::Wipe))?; // ②
    let seeded = seed_fresh(&paths.assets_dir).map_err(at(Stage::Seed))?; // ③
    crate::settings::update(settings, &paths.settings_file, |cur| {
        *cur = reset_settings(cur);
    })
    .map_err(at(Stage::Settings))?; // ④
    generation::write_marker(&paths.data_dir, DATA_GENERATION).map_err(at(Stage::WriteMarker))?; // ⑤
    if let Err(e) = attempts::clear_attempts(&paths.data_dir) {
        // ⑥
        log::warn!(
            "data-reset: 시도 기록을 지우지 못했습니다 kind={:?}",
            e.kind()
        );
    }
    Ok(ResetOutcome {
        removed,
        seeded,
        elapsed_ms: started.elapsed().as_millis(),
    })
}

/// 시작 경로 진입점(R-A2·R-A3·R-A5). 절대 실패를 전파하지 않는다(패닉 없음, 로그만).
pub fn run_startup(paths: &AppPaths, settings: &Mutex<Settings>) {
    let started = Instant::now();
    let stored = generation::read_marker(&paths.data_dir);
    match decide(stored, DATA_GENERATION, POLICY) {
        StartupAction::Keep => log::info!(
            "data-reset: 세대 {DATA_GENERATION} 일치 — 건너뜀 ({} ms)",
            started.elapsed().as_millis()
        ),
        StartupAction::WipeAll => match startup_wipe(paths, settings) {
            Ok(Some(o)) => log::info!(
                "data-reset: 저장 세대 {stored:?} → {DATA_GENERATION}, 정책 {POLICY:?}, 삭제 {} · 기본 그림 {} ({} ms)",
                o.removed,
                o.seeded,
                o.elapsed_ms
            ),
            Ok(None) => {} // 상한 도달 — startup_wipe가 경고를 남겼다(R-A7)
            Err((stage, e)) => log::warn!(
                "data-reset: 초기화 실패 단계={} code={} kind={:?} — 앱은 계속 시작, 다음 시작 때 재시도",
                stage.label(),
                e.code(),
                io_kind(&e)
            ),
        },
    }
}

/// WipeAll 판정 뒤 시작 경로 전용(R-A7): ⓪ 검사 → 상한 확인 → 시도 +1 기록 → ⓪~⑥.
/// Ok(None) = 상한 도달로 지우지 않음.
fn startup_wipe(
    paths: &AppPaths,
    settings: &Mutex<Settings>,
) -> Result<Option<ResetOutcome>, (Stage, ResetError)> {
    wipe::check_start_dirs(paths).map_err(at(Stage::Guard))?; // 시도 기록이 링크 너머에 쓰이지 않게 먼저
    let tried = attempts::read_attempts(&paths.data_dir);
    if tried >= MAX_STARTUP_ATTEMPTS {
        log::warn!(
            "data-reset: 시작 초기화가 연속 {tried}회 끝나지 못해 상한({MAX_STARTUP_ATTEMPTS})에 도달 — \
             지우지 않고 계속 시작(설정 창 「전체 초기화」가 성공하면 해제)"
        );
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decide_table() {
        assert_eq!(decide(None, 5, POLICY), StartupAction::WipeAll);
        assert_eq!(decide(Some(4), 5, POLICY), StartupAction::WipeAll);
        assert_eq!(decide(Some(5), 5, POLICY), StartupAction::Keep);
        assert_eq!(decide(Some(6), 5, POLICY), StartupAction::WipeAll); // D-6
    }

    #[test]
    fn reset_settings_keeps_autostart_and_language() {
        let mut current = Settings {
            language: crate::settings::Language::Ja,
            autostart: true,
            scale: 1.75,
            mouse: None,
            ..Settings::default()
        };
        current.overlay.x = 999;

        let result = reset_settings(&current);
        let expected = Settings {
            autostart: true,
            language: crate::settings::Language::Ja,
            ..Settings::default()
        };
        assert_eq!(result, expected);
    }

    #[test]
    fn reset_error_codes() {
        let io = ResetError::Io(std::io::Error::other("x"));
        assert_eq!(io.code(), "reset.io");
        assert!(!io.to_string().contains('\\'));
        assert!(!io.to_string().contains(':'));

        let seed = ResetError::Seed;
        assert_eq!(seed.code(), "reset.seed");
        assert!(!seed.to_string().contains('\\'));
        assert!(!seed.to_string().contains(':'));

        let settings_io = ResetError::Settings(SettingsError::Io(std::io::Error::other("x")));
        assert_eq!(settings_io.code(), "settings.io");

        let poisoned = ResetError::Settings(SettingsError::StatePoisoned);
        assert_eq!(poisoned.code(), "state.poisoned");
    }

    #[test]
    fn reset_error_io_kind() {
        assert_eq!(
            io_kind(&ResetError::Io(std::io::Error::from(
                std::io::ErrorKind::NotFound
            ))),
            Some(std::io::ErrorKind::NotFound)
        );
        assert_eq!(
            io_kind(&ResetError::Settings(SettingsError::Io(
                std::io::Error::from(std::io::ErrorKind::PermissionDenied)
            ))),
            Some(std::io::ErrorKind::PermissionDenied)
        );
        assert_eq!(io_kind(&ResetError::Seed), None);
        assert_eq!(
            io_kind(&ResetError::Settings(SettingsError::StatePoisoned)),
            None
        );

        let labels = [
            Stage::Guard.label(),
            Stage::Attempts.label(),
            Stage::RemoveMarker.label(),
            Stage::Wipe.label(),
            Stage::Seed.label(),
            Stage::Settings.label(),
            Stage::WriteMarker.label(),
        ];
        for label in labels {
            assert!(label.is_ascii(), "label은 ASCII: {label}");
        }
        let unique: std::collections::HashSet<_> = labels.iter().collect();
        assert_eq!(unique.len(), labels.len(), "label은 서로 달라야 함");
    }
}
