//! 파일 원자적 쓰기(CR-047 CORE-002).
//!
//! [목적] settings.json·manifest.json을 "고유 임시 파일 → sync_all → rename 한 번"으로 교체해
//!        쓰기 도중 종료돼도 대상 파일이 없어지는 순간이 없게 한다. `assets::save_manifest`도
//!        이 함수를 재사용한다(사본 금지, D47-3).
//! [공개 API] `write_atomic(path, bytes) -> std::io::Result<()>`.
//! [스레드] 없음. 호출자 스레드에서 동기 실행. `settings::update`가 설정 잠금을 쥔 채 부른다
//!        (스킬 §4 예외, settings.md §3.9.7).
//! [절차] 1) 대상의 부모 폴더를 만든다. 2) 같은 폴더에 `{파일이름}.{pid}-{seq}.tmp`를
//!        `create_new`로 연다(이미 있으면 다음 seq로 최대 16회 재시도). 3) 쓰고 `sync_all` 후
//!        핸들을 닫는다. 4) `fs::rename(tmp, path)` — 대상을 먼저 지우지 않는다(Windows
//!        `rename`은 대상이 있으면 교체한다). 5) 실패하면 임시 파일을 지우고 원래 오류를 낸다.
//! [unsafe] 없음.
//! [테스트] AW1~AW6(이 파일 `#[cfg(test)]`).

use std::ffi::{OsStr, OsString};
use std::fs::{self, OpenOptions};
use std::io::{ErrorKind, Write};
use std::path::Path;
use std::sync::atomic::{AtomicU32, Ordering};

static TMP_SEQ: AtomicU32 = AtomicU32::new(0);
const MAX_RETRIES: u32 = 16;

/// 임시 파일 이름 — 원래 파일 이름으로 시작하고 `.tmp`로 끝난다(테스트 AW3).
fn temp_name(file_name: &OsStr, pid: u32, seq: u32) -> OsString {
    let mut s = file_name.to_os_string();
    s.push(format!(".{pid}-{seq}.tmp"));
    s
}

/// `path`를 `bytes`로 원자적으로 교체한다. 성공하면 `path`에 임시 파일 잔재가 남지 않는다.
pub fn write_atomic(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    let dir = match path.parent() {
        Some(p) if !p.as_os_str().is_empty() => p,
        _ => Path::new("."),
    };
    fs::create_dir_all(dir)?;
    let file_name = path.file_name().unwrap_or_else(|| OsStr::new("settings"));
    let pid = std::process::id();

    let mut last_err: Option<std::io::Error> = None;
    for _ in 0..MAX_RETRIES {
        let seq = TMP_SEQ.fetch_add(1, Ordering::Relaxed);
        let tmp = dir.join(temp_name(file_name, pid, seq));
        let file = match OpenOptions::new().write(true).create_new(true).open(&tmp) {
            Ok(f) => f,
            Err(e) if e.kind() == ErrorKind::AlreadyExists => {
                last_err = Some(e);
                continue;
            }
            Err(e) => return Err(e),
        };
        return write_and_replace(file, &tmp, path, bytes);
    }
    Err(last_err.unwrap_or_else(|| std::io::Error::other("임시 파일을 만들지 못했습니다")))
}

/// 열린 임시 파일에 쓰고 flush한 뒤 대상으로 교체한다. 실패하면 임시 파일을 지운다.
fn write_and_replace(
    mut file: fs::File,
    tmp: &Path,
    path: &Path,
    bytes: &[u8],
) -> std::io::Result<()> {
    let write_result = file.write_all(bytes).and_then(|_| file.sync_all());
    drop(file);
    if let Err(e) = write_result {
        let _ = fs::remove_file(tmp);
        return Err(e);
    }
    match fs::rename(tmp, path) {
        Ok(()) => Ok(()),
        Err(e) => {
            let _ = fs::remove_file(tmp);
            Err(e)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn no_tmp_left(dir: &Path) -> bool {
        fs::read_dir(dir)
            .expect("read_dir")
            .filter_map(|e| e.ok())
            .all(|e| !e.file_name().to_string_lossy().ends_with(".tmp"))
    }

    #[test]
    fn aw1_write_new_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        write_atomic(&path, b"hello").expect("write");
        assert_eq!(fs::read(&path).expect("read"), b"hello");
        assert!(no_tmp_left(dir.path()));
    }

    #[test]
    fn aw2_replaces_existing_target() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        fs::write(&path, b"old").expect("seed");
        write_atomic(&path, b"new content").expect("write");
        assert_eq!(fs::read(&path).expect("read"), b"new content");
        assert!(no_tmp_left(dir.path()));
    }

    #[test]
    fn aw3_temp_name_differs_by_seq() {
        let a = temp_name(OsStr::new("settings.json"), 42, 0);
        let b = temp_name(OsStr::new("settings.json"), 42, 1);
        assert_ne!(a, b);
        assert!(a.to_string_lossy().starts_with("settings.json"));
        assert!(a.to_string_lossy().ends_with(".tmp"));
    }

    #[test]
    fn aw4_target_is_directory_fails_and_cleans_tmp() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        fs::create_dir_all(&path).expect("mkdir as file target");
        write_atomic(&path, b"x").expect_err("must fail");
        assert!(path.is_dir());
        assert!(no_tmp_left(dir.path()));
    }

    #[test]
    fn aw5_creates_missing_parent_dirs() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("a").join("b").join("settings.json");
        write_atomic(&path, b"nested").expect("write");
        assert_eq!(fs::read(&path).expect("read"), b"nested");
    }

    #[test]
    fn aw6_concurrent_writers_never_corrupt_target() {
        use std::sync::Arc;
        let dir = Arc::new(tempfile::tempdir().expect("tempdir"));
        let path = Arc::new(dir.path().join("settings.json"));
        write_atomic(&path, b"seed").expect("seed");

        let handles: Vec<_> = (0..8)
            .map(|t| {
                let path = path.clone();
                std::thread::spawn(move || {
                    for i in 0..20 {
                        let content = format!("thread-{t}-{i}");
                        let _ = write_atomic(&path, content.as_bytes());
                    }
                })
            })
            .collect();
        for h in handles {
            h.join().expect("join");
        }
        assert!(no_tmp_left(dir.path()));
        // 마지막 값이 어떤 스레드 것이든 내용은 온전한 하나의 write 결과여야 한다(섞이지 않음).
        let final_content = fs::read_to_string(&*path).expect("read final");
        assert!(final_content == "seed" || final_content.starts_with("thread-"));
    }
}
