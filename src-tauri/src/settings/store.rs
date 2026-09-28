//! 설정 저장 단일 창구(CR-047 CORE-001).
//!
//! [목적] 설정을 바꾸는 모든 경로가 `update` 하나만 쓰게 한다. 잠금을 쥔 채 「사본 변경 →
//!        검증 → 파일 원자 교체 → 메모리 대입」을 한 번에 해서 메모리와 파일이 항상 같은
//!        값으로 남는다(스킬 §4 예외 근거는 settings.md §3.9.7).
//! [공개 API] `SaveOutcome { settings, changed }`, `update(state, path, f)`.
//! [스레드] 없음. 호출자 스레드에서 잠금을 잡고 동기 실행.
//! [unsafe] 없음.
//! [에러] `SettingsError::{StatePoisoned, Invalid, Format, Io}` — 실패하면 메모리·파일 모두
//!        이전 값 그대로.
//! [테스트] SU1~SU7(이 파일 `#[cfg(test)]`).

use std::path::Path;
use std::sync::Mutex;

use super::{Settings, SettingsError};

/// `update` 호출 결과. `settings`는 호출 뒤 메모리 값(성공하면 파일 값과도 같다),
/// `changed`는 파일을 실제로 다시 썼는가.
#[derive(Debug, Clone, PartialEq)]
pub struct SaveOutcome {
    pub settings: Settings,
    pub changed: bool,
}

/// 설정을 바꾸는 유일한 창구. `f`는 사본을 고친다 — 잠금 안에서 불리므로 그 안에서 설정
/// 잠금 재획득·IO·emit·창 호출을 하면 안 된다(교착·지연 위험). 필드 대입·순수 병합만 한다.
pub fn update<F>(state: &Mutex<Settings>, path: &Path, f: F) -> Result<SaveOutcome, SettingsError>
where
    F: FnOnce(&mut Settings),
{
    let mut guard = state.lock().map_err(|_| SettingsError::StatePoisoned)?;
    let mut next = guard.clone();
    f(&mut next);
    if next == *guard {
        return Ok(SaveOutcome {
            settings: next,
            changed: false,
        });
    }
    super::save(path, &next)?;
    *guard = next.clone();
    Ok(SaveOutcome {
        settings: next,
        changed: true,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::load;

    #[test]
    fn su1_update_changes_memory_and_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let m = Mutex::new(Settings::default());
        let out = update(&m, &path, |s| s.scale = 1.5).expect("update");
        assert!(out.changed);
        assert_eq!(out.settings.scale, 1.5);
        assert_eq!(m.lock().expect("lock").scale, 1.5);
        assert_eq!(load(&path).expect("load").expect("some").scale, 1.5);
    }

    #[test]
    fn su2_update_same_value_does_not_write_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let m = Mutex::new(Settings::default());
        let out = update(&m, &path, |s| s.scale = Settings::default().scale).expect("update");
        assert!(!out.changed);
        assert!(!path.exists());
    }

    #[test]
    fn su3_update_rejects_invalid_and_leaves_state_unchanged() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let m = Mutex::new(Settings::default());
        update(&m, &path, |s| s.scale = 1.2).expect("seed");
        let before_file = std::fs::read_to_string(&path).expect("read");

        let err = update(&m, &path, |s| s.scale = 5.0).expect_err("must fail");
        assert!(matches!(err, SettingsError::Invalid(_)));
        assert_eq!(m.lock().expect("lock").scale, 1.2);
        let after_file = std::fs::read_to_string(&path).expect("read");
        assert_eq!(before_file, after_file);
    }

    #[test]
    fn su4_update_io_error_leaves_memory_unchanged() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        std::fs::create_dir_all(&path).expect("make path a directory");
        let m = Mutex::new(Settings::default());
        let err = update(&m, &path, |s| s.scale = 1.5).expect_err("must fail");
        assert!(matches!(err, SettingsError::Io(_)));
        assert_eq!(m.lock().expect("lock").scale, Settings::default().scale);
    }

    #[test]
    fn su5_update_poisoned_lock() {
        use std::sync::Arc;
        let m = Arc::new(Mutex::new(Settings::default()));
        let m_clone = m.clone();
        let handle = std::thread::spawn(move || {
            let _g = m_clone.lock().expect("lock");
            panic!("poison it");
        });
        let _ = handle.join();
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let err = update(&m, &path, |s| s.scale = 1.5).expect_err("must fail");
        assert!(matches!(err, SettingsError::StatePoisoned));
        assert_eq!(err.code(), "state.poisoned");
    }

    #[test]
    fn su6_concurrent_updates_keep_memory_and_file_in_sync() {
        use std::sync::Arc;
        let dir = tempfile::tempdir().expect("tempdir");
        let path = Arc::new(dir.path().join("settings.json"));
        let m = Arc::new(Mutex::new(Settings::default()));

        let m_a = m.clone();
        let path_a = path.clone();
        let a = std::thread::spawn(move || {
            for i in 0..50i32 {
                let _ = update(&m_a, &path_a, |s| s.overlay.x = i);
            }
        });
        let m_b = m.clone();
        let path_b = path.clone();
        let b = std::thread::spawn(move || {
            for i in 0..50u32 {
                let secs = 60 + (i % 3540);
                let _ = update(&m_b, &path_b, |s| s.idle_seconds = secs);
            }
        });
        a.join().expect("join a");
        b.join().expect("join b");

        let from_file = load(&path).expect("load").expect("some");
        let from_memory = m.lock().expect("lock").clone();
        assert_eq!(from_file, from_memory);
    }

    #[test]
    fn su7_private_save_round_trip_still_works() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let s = Settings {
            scale: 1.75,
            ..Default::default()
        };
        super::super::save(&path, &s).expect("save");
        assert_eq!(load(&path).expect("load"), Some(s));
    }
}
