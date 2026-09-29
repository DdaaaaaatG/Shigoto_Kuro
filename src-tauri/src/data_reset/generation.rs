//! 데이터 세대 표식(`data-generation.json`) 읽기·쓰기·삭제(R-A1).
//!
//! [목적] 데이터 폴더 루트의 표식 파일 하나로 「지금 앱 데이터가 어느 세대인지」를 기록한다.
//! [공개 API] 모두 `pub(super)`. `read_marker`·`write_marker`·`remove_marker`, `#[cfg(test)] fingerprint`.
//! [스레드] 없음. 호출자 스레드에서 동기 실행.
//! [unsafe] 없음.
//! [에러] 쓰기·삭제는 `std::io::Error`. 읽기는 실패를 삼키고 `None`을 돌려준다(§3.5). 1MiB
//!        상한(SEC-205, `settings::MAX_TEXT_FILE_BYTES`) 초과도 같은 경로로 `None`이 된다.
//! [설정] 없음. settings 스키마 밖의 별도 파일이다.
//! [테스트] `marker_roundtrip`·`marker_missing_is_none`·`marker_corrupt_is_none`·
//!        `marker_over_size_cap_is_none`(SEC-205)·
//!        `generation_fingerprint_guard`(이 파일 `#[cfg(test)] mod tests`).

use std::path::Path;

use serde::{Deserialize, Serialize};

use super::MARKER_FILE;
#[cfg(test)]
use crate::assets::defaults::DefaultAsset;

/// 표식 파일 읽기용 — 모르는 필드는 무시한다.
#[derive(Debug, Deserialize)]
struct MarkerIn {
    generation: u32,
}

/// 표식 파일 쓰기용. `app_version`은 진단용이며 판정에 쓰지 않는다.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MarkerOut<'a> {
    generation: u32,
    app_version: &'a str,
}

/// 표식을 읽는다. 없음·읽기 실패·파싱 실패·필드 없음·형식 오류는 모두 `None`이다.
pub(super) fn read_marker(data_dir: &Path) -> Option<u32> {
    // SEC-205: 1MiB 상한 초과는 다른 읽기 실패와 같이 None(표식 없음으로 본다).
    let text = crate::settings::read_capped_string(
        &data_dir.join(MARKER_FILE),
        crate::settings::MAX_TEXT_FILE_BYTES,
    )
    .ok()?;
    let parsed: MarkerIn = serde_json::from_str(&text).ok()?;
    Some(parsed.generation)
}

/// 표식을 원자적으로 쓴다. `app_version`은 `CARGO_PKG_VERSION`이다.
pub(super) fn write_marker(data_dir: &Path, generation: u32) -> std::io::Result<()> {
    let marker = MarkerOut {
        generation,
        app_version: env!("CARGO_PKG_VERSION"),
    };
    let bytes = serde_json::to_vec(&marker).map_err(std::io::Error::other)?;
    crate::settings::write_atomic(&data_dir.join(MARKER_FILE), &bytes)
}

/// 표식을 지운다. 파일이 없으면 `Ok(())`. 같은 이름의 폴더가 있으면 실패한다(테스트 실패 주입에 쓴다).
pub(super) fn remove_marker(data_dir: &Path) -> std::io::Result<()> {
    match std::fs::remove_file(data_dir.join(MARKER_FILE)) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e),
    }
}

/// 내장 기본 그림 지문(테스트 전용) — 장수, 바이트 합, FNV-1a 64. 기본 그림이 바뀌면(세대를
/// 올리지 않고) 이 값이 바뀌어 `generation_fingerprint_guard`가 실패한다.
#[cfg(test)]
pub(super) fn fingerprint(assets: &[DefaultAsset]) -> (usize, u64, u64) {
    const FNV_OFFSET: u64 = 0xcbf2_9ce4_8422_2325;
    const FNV_PRIME: u64 = 0x0000_0100_0000_01b3;

    let mut hash = FNV_OFFSET;
    let mut byte_sum: u64 = 0;
    let feed = |hash: &mut u64, byte: u8| {
        *hash ^= u64::from(byte);
        *hash = hash.wrapping_mul(FNV_PRIME);
    };
    for asset in assets {
        for b in asset.slot.file_key().as_bytes() {
            feed(&mut hash, *b);
        }
        feed(&mut hash, 0x00);
        for b in asset.bytes {
            feed(&mut hash, *b);
        }
        byte_sum += asset.bytes.len() as u64;
    }
    (assets.len(), byte_sum, hash)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn marker_roundtrip() {
        let dir = tempfile::tempdir().expect("tempdir");
        write_marker(dir.path(), 4).expect("write");
        assert_eq!(read_marker(dir.path()), Some(4));
        let text = std::fs::read_to_string(dir.path().join(MARKER_FILE)).expect("read");
        assert!(text.contains("appVersion"));
    }

    #[test]
    fn marker_missing_is_none() {
        let dir = tempfile::tempdir().expect("tempdir");
        assert_eq!(read_marker(dir.path()), None);
        assert!(remove_marker(dir.path()).is_ok());
    }

    #[test]
    fn marker_corrupt_is_none() {
        let dir = tempfile::tempdir().expect("tempdir");
        for content in ["{", "{\"x\":1}", "[]", "{\"generation\":\"4\"}"] {
            std::fs::write(dir.path().join(MARKER_FILE), content).expect("write");
            assert_eq!(read_marker(dir.path()), None, "content={content}");
        }
    }

    /// SEC-205: 1MiB 를 넘는 표식 파일은 읽지 않고 None(표식 없음)으로 본다.
    #[test]
    fn marker_over_size_cap_is_none() {
        let dir = tempfile::tempdir().expect("tempdir");
        let mut content = br#"{"generation": 5, "pad": ""#.to_vec();
        content.extend(vec![b'x'; crate::settings::MAX_TEXT_FILE_BYTES as usize]);
        content.extend_from_slice(br#""}"#);
        std::fs::write(dir.path().join(MARKER_FILE), &content).expect("write");
        assert_eq!(read_marker(dir.path()), None);
    }

    #[test]
    fn generation_fingerprint_guard() {
        let actual = fingerprint(&crate::assets::defaults::DEFAULT_ASSETS);
        assert_eq!(
            actual,
            super::super::DEFAULT_ASSETS_FINGERPRINT,
            "기본 그림이 바뀌었습니다. DATA_GENERATION을 올리고 옛 세트를 defaults-v{{N}}으로 \
             옮긴 뒤 지문을 갱신하세요"
        );
    }
}
