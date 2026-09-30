//! 내장 프리셋 시딩 통합 테스트(PS-11, 설계 §8.2 — tempdir만 사용).

use std::collections::BTreeSet;
use std::path::Path;
use std::sync::Mutex;

use kuro_keyviewer_lib::presets::{self, SeedOutcome, SeedSkip};
use kuro_keyviewer_lib::settings::{Language, Settings};
use kuro_keyviewer_lib::AppPaths;

fn make_paths(tmp: &Path) -> AppPaths {
    let data_dir = tmp.join("data");
    let assets_dir = data_dir.join("assets");
    std::fs::create_dir_all(&assets_dir).expect("assets_dir");
    AppPaths {
        settings_file: data_dir.join("settings.json"),
        data_dir,
        assets_dir,
    }
}

fn names(dir: &Path) -> BTreeSet<String> {
    std::fs::read_dir(dir)
        .expect("read_dir")
        .map(|e| e.expect("entry").file_name().to_string_lossy().to_string())
        .collect()
}

fn set(items: &[&str]) -> BTreeSet<String> {
    items.iter().map(|s| s.to_string()).collect()
}

#[test]
fn seed_creates_two_when_dir_missing() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    let dir = paths.presets_dir();
    let out = presets::seed_builtin(&dir).expect("seed");
    assert_eq!(
        out,
        SeedOutcome::Seeded {
            count: 2,
            failed: vec![]
        }
    );
    assert_eq!(names(&dir), set(&["builtin-1", "builtin-2"]));
    assert_eq!(
        names(&dir.join("builtin-1")),
        set(&[
            "preset.json",
            "kb_up.png",
            "background.png",
            "pomo_char.png",
            "mouse_base.png",
            "pen_up.png",
            "pen_down_0.png",
            "alarm.mp3"
        ])
    );
    assert_eq!(names(&dir.join("builtin-2")).len(), 9);
    assert!(!paths.data_dir.join(".presets-seed").exists());

    let before: Vec<Vec<u8>> = ["builtin-1", "builtin-2"]
        .iter()
        .map(|i| std::fs::read(dir.join(i).join("preset.json")).expect("json"))
        .collect();
    let again = presets::seed_builtin(&dir).expect("seed again");
    assert_eq!(again, SeedOutcome::Skipped(SeedSkip::Exists));
    assert_eq!(names(&dir), set(&["builtin-1", "builtin-2"]));
    let after: Vec<Vec<u8>> = ["builtin-1", "builtin-2"]
        .iter()
        .map(|i| std::fs::read(dir.join(i).join("preset.json")).expect("json"))
        .collect();
    assert_eq!(before, after);
}

#[test]
fn seed_skips_when_dir_exists_even_if_empty() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    let dir = paths.presets_dir();
    std::fs::create_dir(&dir).expect("empty presets");
    assert_eq!(
        presets::seed_builtin(&dir).expect("seed"),
        SeedOutcome::Skipped(SeedSkip::Exists)
    );
    assert!(names(&dir).is_empty());

    std::fs::create_dir(dir.join("42")).expect("user preset");
    assert_eq!(
        presets::seed_builtin(&dir).expect("seed"),
        SeedOutcome::Skipped(SeedSkip::Exists)
    );
    assert_eq!(names(&dir), set(&["42"]));
}

#[test]
fn seed_output_listed_and_applicable() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    presets::seed_builtin(&paths.presets_dir()).expect("seed");

    let list = presets::list(&paths.presets_dir()).expect("list");
    let got: Vec<(&str, &str, u64, u32, bool)> = list
        .iter()
        .map(|s| {
            (
                s.id.as_str(),
                s.name.as_str(),
                s.saved_at,
                s.image_count,
                s.has_alarm,
            )
        })
        .collect();
    assert_eq!(
        got,
        [
            ("builtin-2", "게님드림", 1_790_765_304_848, 7, true),
            ("builtin-1", "세바시에-기본", 1_790_764_144_068, 6, true),
        ]
    );

    let mut cur = Settings::default();
    cur.overlay.x = 321;
    cur.autostart = true;
    cur.language = Language::En;
    cur.position_lock = true;
    cur.show_in_taskbar = true;
    let before = cur.clone();
    let state = Mutex::new(cur);
    let applied = presets::apply(&paths, "builtin-2", &state).expect("apply");
    assert_eq!(applied.manifest.entries.len(), 7);
    assert!(applied
        .manifest
        .entries
        .iter()
        .any(|e| e.slot.file_key() == "hair"));
    let after = state.lock().expect("lock").clone();
    assert_eq!(
        (
            after.timer.text_pos.x,
            after.timer.text_pos.y,
            after.timer.rotation
        ),
        (142.0, 456.0, 11.0)
    );
    assert_eq!(after.overlay, before.overlay);
    assert_eq!(after.language, before.language);
    assert!(after.autostart && after.position_lock && after.show_in_taskbar);
    assert!(paths.assets_dir.join("alarm.mp3").exists());
}

#[test]
fn seed_clears_leftover_staging() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    let leftover = paths.data_dir.join(".presets-seed");
    std::fs::create_dir_all(leftover.join("builtin-1")).expect("leftover");
    std::fs::write(leftover.join("junk.txt"), b"x").expect("junk");
    let out = presets::seed_builtin(&paths.presets_dir()).expect("seed");
    assert_eq!(
        out,
        SeedOutcome::Seeded {
            count: 2,
            failed: vec![]
        }
    );
    assert!(!leftover.exists());
    assert_eq!(
        names(&paths.presets_dir()),
        set(&["builtin-1", "builtin-2"])
    );
}
