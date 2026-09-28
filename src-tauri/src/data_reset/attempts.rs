//! 시작 경로 연속 실패 시도 기록(`data-reset-attempts.json`, R-A7, CORE-001).
//!
//! [목적] 시작 때 초기화가 연속으로 끝나지 못한 횟수를 기록한다. 상한(mod.rs
//!        `MAX_STARTUP_ATTEMPTS`)에 닿으면 `run_startup`이 더 지우지 않는다.
//! [공개 API] 모두 `pub(super)`. `ATTEMPTS_FILE`(형제 `wipe`가 tmp 접두어로 쓴다),
//!        `read_attempts`·`write_attempts`·`clear_attempts`.
//! [스레드] 없음. 호출자 스레드에서 동기 실행.
//! [unsafe] 없음.
//! [에러] 쓰기·삭제는 `std::io::Error`. 읽기는 실패를 삼키고 `0`을 돌려준다(카운터 손상으로
//!        초기화가 영영 막히지 않게 — 열린 쪽 실패).
//! [설정] 없음. settings 스키마 밖의 별도 파일이다.
//! [테스트] `attempts_roundtrip_and_clear`·`attempts_missing_or_corrupt_is_zero`
//!        (이 파일 `#[cfg(test)] mod tests`).

use std::path::Path;

use serde::{Deserialize, Serialize};

pub(super) const ATTEMPTS_FILE: &str = "data-reset-attempts.json";

/// 모르는 필드는 무시한다.
#[derive(Debug, Serialize, Deserialize)]
struct AttemptsFile {
    attempts: u32,
}

/// 시도 횟수를 읽는다. 없음·읽기 실패·JSON 손상·필드 없음·형식 오류(문자열·음수 등)는 모두 `0`이다.
pub(super) fn read_attempts(data_dir: &Path) -> u32 {
    let text = match std::fs::read_to_string(data_dir.join(ATTEMPTS_FILE)) {
        Ok(t) => t,
        Err(_) => return 0,
    };
    serde_json::from_str::<AttemptsFile>(&text)
        .map(|f| f.attempts)
        .unwrap_or(0)
}

/// 시도 횟수를 원자적으로 쓴다.
pub(super) fn write_attempts(data_dir: &Path, attempts: u32) -> std::io::Result<()> {
    let bytes = serde_json::to_vec(&AttemptsFile { attempts }).map_err(std::io::Error::other)?;
    crate::settings::write_atomic(&data_dir.join(ATTEMPTS_FILE), &bytes)
}

/// 시도 기록 파일을 지운다. 파일이 없으면 `Ok(())`.
pub(super) fn clear_attempts(data_dir: &Path) -> std::io::Result<()> {
    match std::fs::remove_file(data_dir.join(ATTEMPTS_FILE)) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn attempts_roundtrip_and_clear() {
        let dir = tempfile::tempdir().expect("tempdir");
        assert_eq!(read_attempts(dir.path()), 0);
        write_attempts(dir.path(), 2).expect("write");
        assert_eq!(read_attempts(dir.path()), 2);
        clear_attempts(dir.path()).expect("clear");
        assert_eq!(read_attempts(dir.path()), 0);
        // 파일이 없어도 clear_attempts는 Ok.
        assert!(clear_attempts(dir.path()).is_ok());
    }

    #[test]
    fn attempts_missing_or_corrupt_is_zero() {
        let dir = tempfile::tempdir().expect("tempdir");
        for content in [
            "{",
            "[]",
            "{\"x\":1}",
            "{\"attempts\":\"2\"}",
            "{\"attempts\":-1}",
        ] {
            std::fs::write(dir.path().join(ATTEMPTS_FILE), content).expect("write");
            assert_eq!(read_attempts(dir.path()), 0, "content={content}");
        }
    }
}
