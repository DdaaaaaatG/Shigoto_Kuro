//! 알림음 저장소(CR-048 TM-08·TM-13) — `AssetSlot`·매니페스트·PNG 경로와 분리(A-1).
//!
//! [목적] 카운트다운 타이머가 0에 닿을 때 재생할 사용자 알림음(wav·mp3·ogg)을 검증·저장·조회·
//!        삭제한다. 저장 이름은 `alarm.wav`·`alarm.mp3`·`alarm.ogg` 중 하나로 고정이고, 형식은
//!        확장자가 아니라 파일 앞 바이트(매직)로 판별한다.
//! [공개 API] `AlarmFormat`, `AlarmSound`, `ALARM_MAX_BYTES`, `detect_format`, `alarm_file_name`,
//!        `current`, `import`, `remove`, `SoundError`(`code`).
//! [보안] 저장 경로는 항상 `alarm_file_name(format)`으로만 만든다 — 사용자 경로의 이름·확장자는
//!        쓰지 않는다(CR-047 SEC-002 원칙). 크기는 `metadata`로 먼저 보고 1MiB 초과면 읽지 않으며,
//!        읽을 때도 부모의 `read_capped`로 상한까지만 읽는다(SEC-003). 쓰기는 `settings::write_atomic`
//!        (임시 파일 → `rename`, CORE-002).
//! [unsafe] 없음.
//! [테스트] 형식 판별(매직 바이트)·크기 선검사·고정 이름 저장·다른 형식 삭제·조회(최신 우선)·
//!        멱등 삭제·에러 code(아래 `#[cfg(test)] mod tests`).

use std::fs;
use std::path::Path;
use std::time::SystemTime;

use serde::{Deserialize, Serialize};

use super::{read_capped, AssetError, ASSET_MAX_BYTES};

/// 알림음 형식. JSON "wav" | "mp3" | "ogg".
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AlarmFormat {
    Wav,
    Mp3,
    Ogg,
}

const ALL_FORMATS: [AlarmFormat; 3] = [AlarmFormat::Wav, AlarmFormat::Mp3, AlarmFormat::Ogg];

/// 저장된 알림음. JSON { "format", "bytes", "url" }.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlarmSound {
    pub format: AlarmFormat,
    pub bytes: u64,
    /// asset 프로토콜 URL + `?v={수정 시각 ms}`(`url::versioned_asset_url`, SV2-07과 같음).
    pub url: String,
}

pub const ALARM_MAX_BYTES: u64 = ASSET_MAX_BYTES; // 1 MiB

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
    pub fn code(&self) -> &'static str {
        match self {
            Self::NotAudio => "sound.not_audio",
            Self::TooManyBytes { .. } => "sound.too_many_bytes",
            Self::Io(_) => "sound.io",
        }
    }
}

/// 매직 바이트로만 판별한다(확장자는 보지 않는다). 순서: wav → ogg → mp3(ID3) → mp3(프레임 동기).
pub fn detect_format(bytes: &[u8]) -> Option<AlarmFormat> {
    if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WAVE" {
        return Some(AlarmFormat::Wav);
    }
    if bytes.len() >= 4 && &bytes[0..4] == b"OggS" {
        return Some(AlarmFormat::Ogg);
    }
    if bytes.len() >= 3 && &bytes[0..3] == b"ID3" {
        return Some(AlarmFormat::Mp3);
    }
    if bytes.len() >= 2 {
        let (b0, b1) = (bytes[0], bytes[1]);
        // Layer III 프레임 동기. AAC ADTS(FF F1/F9)는 (b1 & 0x06) != 0x02 라 걸러진다.
        if b0 == 0xFF && (b1 & 0xE0) == 0xE0 && (b1 & 0x06) == 0x02 && (b1 & 0x18) != 0x08 {
            return Some(AlarmFormat::Mp3);
        }
    }
    None
}

/// 고정 저장 파일 이름 — 경로는 항상 이것으로 만든다.
pub fn alarm_file_name(f: AlarmFormat) -> &'static str {
    match f {
        AlarmFormat::Wav => "alarm.wav",
        AlarmFormat::Mp3 => "alarm.mp3",
        AlarmFormat::Ogg => "alarm.ogg",
    }
}

/// 있는 알림음 1개(여럿이면 수정 시각이 가장 늦은 것, 같으면 `Wav`·`Mp3`·`Ogg` 순서로 앞선 것).
/// 내용은 읽지 않는다 — 형식은 파일 이름에서 나온다(이름은 `import`만 만든다). 없으면 `Ok(None)`.
pub fn current(assets_dir: &Path) -> Result<Option<AlarmSound>, SoundError> {
    let mut best: Option<(AlarmFormat, std::fs::Metadata, std::path::PathBuf)> = None;
    for format in ALL_FORMATS {
        let path = assets_dir.join(alarm_file_name(format));
        match fs::metadata(&path) {
            Ok(meta) => {
                let is_newer = match &best {
                    None => true,
                    Some((_, best_meta, _)) => {
                        modified_or_epoch(&meta) > modified_or_epoch(best_meta)
                    }
                };
                if is_newer {
                    best = Some((format, meta, path));
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(SoundError::Io(e)),
        }
    }
    Ok(best.map(|(format, meta, path)| AlarmSound {
        format,
        bytes: meta.len(),
        url: super::url::versioned_asset_url(&path),
    }))
}

fn modified_or_epoch(meta: &std::fs::Metadata) -> SystemTime {
    meta.modified().unwrap_or(SystemTime::UNIX_EPOCH)
}

/// 크기 오류가 형식 오류보다 먼저(PNG `import`와 같다). 순서: 크기 선검사(SEC-003) →
/// `read_capped` → `detect_format` → 저장(`write_atomic`, CORE-002) → 다른 두 형식 삭제.
pub fn import(assets_dir: &Path, src: &Path) -> Result<AlarmSound, SoundError> {
    let len = fs::metadata(src)?.len();
    if len > ALARM_MAX_BYTES {
        return Err(SoundError::TooManyBytes { bytes: len });
    }
    let bytes = read_capped(src, ALARM_MAX_BYTES).map_err(convert_asset_error)?;
    let format = detect_format(&bytes).ok_or(SoundError::NotAudio)?;

    fs::create_dir_all(assets_dir)?;
    let dest = assets_dir.join(alarm_file_name(format));
    crate::settings::write_atomic(&dest, &bytes)?;
    remove_other_formats(assets_dir, format);

    Ok(AlarmSound {
        format,
        bytes: bytes.len() as u64,
        url: super::url::versioned_asset_url(&dest),
    })
}

/// `read_capped`가 내는 변형만 변환한다(방어로 그 밖은 `Io`로 감싼다).
fn convert_asset_error(e: AssetError) -> SoundError {
    match e {
        AssetError::TooManyBytes { bytes } => SoundError::TooManyBytes { bytes },
        AssetError::Io(io_err) => SoundError::Io(io_err),
        other => SoundError::Io(std::io::Error::other(other.to_string())),
    }
}

/// 새로 저장한 형식을 뺀 나머지 삭제. `NotFound`는 무시, 그 밖 오류는 경고만(D48-3) — 사용자가
/// 고른 소리는 이미 저장됐고 `current`가 최신 수정 시각을 고르므로 결과가 맞다.
fn remove_other_formats(assets_dir: &Path, keep: AlarmFormat) {
    for other in ALL_FORMATS {
        if other == keep {
            continue;
        }
        let path = assets_dir.join(alarm_file_name(other));
        match fs::remove_file(&path) {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            // SEC-201: 절대 경로 대신 파일 이름과 오류 종류만 남긴다.
            Err(e) => log::warn!(
                "다른 형식 알림음 삭제 실패(file={:?}, kind={:?})",
                path.file_name(),
                e.kind()
            ),
        }
    }
}

/// 세 이름을 모두 지운다 — `NotFound` 무시, 그 밖 오류는 `Err`. 두 번 불러도 성공(멱등).
pub fn remove(assets_dir: &Path) -> Result<(), SoundError> {
    for format in ALL_FORMATS {
        let path = assets_dir.join(alarm_file_name(format));
        match fs::remove_file(&path) {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(SoundError::Io(e)),
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write(path: &Path, bytes: &[u8]) {
        fs::write(path, bytes).expect("write");
    }

    /// A1
    #[test]
    fn detect_wav() {
        let mut bytes = b"RIFF".to_vec();
        bytes.extend_from_slice(&[0, 0, 0, 0]);
        bytes.extend_from_slice(b"WAVE");
        assert_eq!(detect_format(&bytes), Some(AlarmFormat::Wav));
        assert_eq!(detect_format(&bytes[..11]), None);
    }

    /// A2
    #[test]
    fn detect_ogg() {
        assert_eq!(
            detect_format(b"OggS\x00\x02\x00\x00"),
            Some(AlarmFormat::Ogg)
        );
    }

    /// A3
    #[test]
    fn detect_mp3_id3() {
        assert_eq!(
            detect_format(b"ID3\x04\x00\x00\x00\x00\x00\x00"),
            Some(AlarmFormat::Mp3)
        );
    }

    /// A4
    #[test]
    fn detect_mp3_frame_sync() {
        assert_eq!(
            detect_format(&[0xFF, 0xFB, 0x90, 0x00]),
            Some(AlarmFormat::Mp3)
        );
    }

    /// A5
    #[test]
    fn reject_adts_aac() {
        assert_eq!(detect_format(&[0xFF, 0xF1, 0x50, 0x80]), None);
    }

    /// A6
    #[test]
    fn reject_png_and_empty() {
        assert_eq!(
            detect_format(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]),
            None
        );
        assert_eq!(detect_format(&[]), None);
    }

    /// A7
    #[test]
    fn import_too_large_rejected_before_read() {
        let dir = tempfile::tempdir().expect("tempdir");
        let src = dir.path().join("big.bin");
        write(&src, &vec![0u8; (ALARM_MAX_BYTES + 1) as usize]);
        let assets = dir.path().join("assets");
        let err = import(&assets, &src).unwrap_err();
        assert!(matches!(
            err,
            SoundError::TooManyBytes {
                bytes
            } if bytes == ALARM_MAX_BYTES + 1
        ));
        assert!(!assets.exists() || fs::read_dir(&assets).unwrap().next().is_none());
    }

    /// A8
    #[test]
    fn import_exact_limit_ok() {
        let dir = tempfile::tempdir().expect("tempdir");
        let src = dir.path().join("exact.wav");
        let mut bytes = b"RIFF".to_vec();
        bytes.extend_from_slice(&[0, 0, 0, 0]);
        bytes.extend_from_slice(b"WAVE");
        bytes.resize(ALARM_MAX_BYTES as usize, 0);
        write(&src, &bytes);
        let assets = dir.path().join("assets");
        let sound = import(&assets, &src).expect("import");
        assert_eq!(sound.bytes, ALARM_MAX_BYTES);
        assert!(assets.join("alarm.wav").exists());
    }

    /// A9
    #[test]
    fn import_writes_fixed_name_and_removes_others() {
        let dir = tempfile::tempdir().expect("tempdir");
        let assets = dir.path().join("assets");
        let wav_src = dir.path().join("a.wav");
        let mut wav = b"RIFF".to_vec();
        wav.extend_from_slice(&[0, 0, 0, 0]);
        wav.extend_from_slice(b"WAVE");
        write(&wav_src, &wav);
        import(&assets, &wav_src).expect("import wav");
        assert!(assets.join("alarm.wav").exists());

        let mp3_src = dir.path().join("b.mp3");
        write(&mp3_src, b"ID3\x04\x00\x00\x00\x00\x00\x00");
        import(&assets, &mp3_src).expect("import mp3");

        assert!(assets.join("alarm.mp3").exists());
        assert!(!assets.join("alarm.wav").exists());
        assert_eq!(
            current(&assets).expect("current").expect("some").format,
            AlarmFormat::Mp3
        );
    }

    /// A10
    #[test]
    fn import_ignores_source_file_name() {
        let dir = tempfile::tempdir().expect("tempdir");
        let assets = dir.path().join("assets");
        let evil_dir = dir.path().join("evil.traversal");
        fs::create_dir_all(&evil_dir).expect("mkdir");
        let src = evil_dir.join("x.mp3");
        write(&src, b"ID3\x04\x00\x00\x00\x00\x00\x00");
        let sound = import(&assets, &src).expect("import");
        assert_eq!(sound.format, AlarmFormat::Mp3);
        assert!(assets.join("alarm.mp3").exists());

        let src2 = dir.path().join("y.mp3"); // 확장자 mp3 지만 내용은 wav
        let mut wav = b"RIFF".to_vec();
        wav.extend_from_slice(&[0, 0, 0, 0]);
        wav.extend_from_slice(b"WAVE");
        write(&src2, &wav);
        let sound2 = import(&assets, &src2).expect("import2");
        assert_eq!(sound2.format, AlarmFormat::Wav);
        assert!(assets.join("alarm.wav").exists());
        assert!(!assets.join("alarm.mp3").exists());

        let entries: Vec<_> = fs::read_dir(&assets)
            .expect("read_dir")
            .map(|e| e.expect("entry").file_name())
            .collect();
        assert_eq!(entries.len(), 1);
    }

    /// A11
    #[test]
    fn current_none_when_empty() {
        let dir = tempfile::tempdir().expect("tempdir");
        let assets = dir.path().join("assets");
        fs::create_dir_all(&assets).expect("mkdir");
        assert_eq!(current(&assets).expect("current"), None);

        let missing = dir.path().join("missing");
        assert_eq!(current(&missing).expect("current"), None);
    }

    /// A12
    #[test]
    fn current_picks_latest_when_multiple() {
        let dir = tempfile::tempdir().expect("tempdir");
        let assets = dir.path().join("assets");
        fs::create_dir_all(&assets).expect("mkdir");
        let wav = assets.join("alarm.wav");
        let ogg = assets.join("alarm.ogg");
        write(&wav, b"RIFFxxxxWAVE");
        write(&ogg, b"OggSxxxx");

        let now = SystemTime::now();
        std::fs::OpenOptions::new()
            .write(true)
            .open(&wav)
            .expect("open wav")
            .set_modified(now - std::time::Duration::from_secs(10))
            .expect("set_modified wav");
        std::fs::OpenOptions::new()
            .write(true)
            .open(&ogg)
            .expect("open ogg")
            .set_modified(now)
            .expect("set_modified ogg");

        let sound = current(&assets).expect("current").expect("some");
        assert_eq!(sound.format, AlarmFormat::Ogg);
        assert_eq!(sound.bytes, ogg.metadata().expect("meta").len());
        assert!(sound.url.contains("alarm.ogg"));
        assert!(sound.url.contains("?v="));
    }

    /// A13
    #[test]
    fn remove_is_idempotent() {
        let dir = tempfile::tempdir().expect("tempdir");
        let assets = dir.path().join("assets");
        fs::create_dir_all(&assets).expect("mkdir");
        write(&assets.join("alarm.wav"), b"RIFFxxxxWAVE");

        assert!(remove(&assets).is_ok());
        assert!(!assets.join("alarm.wav").exists());
        assert!(remove(&assets).is_ok());
    }

    /// A14
    #[test]
    fn sound_error_codes() {
        assert_eq!(SoundError::NotAudio.code(), "sound.not_audio");
        assert_eq!(
            SoundError::TooManyBytes { bytes: 5 }.code(),
            "sound.too_many_bytes"
        );
        assert_eq!(
            SoundError::Io(std::io::Error::other("x")).code(),
            "sound.io"
        );
        assert_eq!(
            SoundError::NotAudio.to_string(),
            "wav·mp3·ogg 소리 파일이 아닙니다."
        );
    }
}
