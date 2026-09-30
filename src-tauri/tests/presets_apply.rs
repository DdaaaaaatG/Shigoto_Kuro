//! `presets::apply` 통합 테스트(설계 §8.2 적용·지연 영역, tempdir만 사용).
//! 도우미는 `presets.rs`의 작은 사본이다(§11.1 Δ5).

use std::collections::BTreeMap;
use std::path::Path;
use std::sync::Mutex;
use std::time::Instant;

use kuro_keyviewer_lib::assets::{self, AssetSlot, SimpleSlot};
use kuro_keyviewer_lib::presets::{self, PresetError};
use kuro_keyviewer_lib::settings::{self, Language, Settings};
use kuro_keyviewer_lib::AppPaths;

const ID_A: u64 = 1_790_000_000_000;

fn png_tagged(w: u32, h: u32, depth: u8, color: u8, tag: u8) -> Vec<u8> {
    let mut v = vec![0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
    v.extend_from_slice(&13u32.to_be_bytes());
    v.extend_from_slice(b"IHDR");
    v.extend_from_slice(&w.to_be_bytes());
    v.extend_from_slice(&h.to_be_bytes());
    v.extend_from_slice(&[depth, color, 0, 0, 0]);
    v.extend_from_slice(&[0, 0, 0, 0]);
    v.push(tag);
    v
}

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

fn simple(s: SimpleSlot) -> AssetSlot {
    AssetSlot::Simple(s)
}

fn put(paths: &AppPaths, slot: AssetSlot, w: u32, h: u32, tag: u8) {
    assets::import_bytes(&paths.assets_dir, slot, &png_tagged(w, h, 8, 6, tag)).expect("import");
}

/// kb_up(캔버스 w×h)·mouse_base(100×80)를 등록한다.
fn seed_basic(paths: &AppPaths, w: u32, h: u32, tag: u8) {
    put(paths, simple(SimpleSlot::KbUp), w, h, tag);
    put(paths, simple(SimpleSlot::MouseBase), 100, 80, tag);
}

/// 폴더 바로 아래 파일의 (이름 → 바이트).
fn snapshot(dir: &Path) -> BTreeMap<String, Vec<u8>> {
    std::fs::read_dir(dir)
        .expect("read_dir")
        .map(|e| e.expect("entry"))
        .filter(|e| e.path().is_file())
        .map(|e| {
            (
                e.file_name().to_string_lossy().to_string(),
                std::fs::read(e.path()).expect("read"),
            )
        })
        .collect()
}

fn state_of(paths: &AppPaths) -> (BTreeMap<String, Vec<u8>>, Option<Vec<u8>>) {
    (
        snapshot(&paths.assets_dir),
        std::fs::read(&paths.settings_file).ok(),
    )
}

fn clear_assets(paths: &AppPaths) {
    let keys: Vec<AssetSlot> = assets::load_manifest(&paths.assets_dir)
        .expect("manifest")
        .entries
        .iter()
        .map(|e| e.slot)
        .collect();
    for slot in keys {
        assets::remove(&paths.assets_dir, slot).expect("remove");
    }
}

fn scaled(scale: f64, idle: u32) -> Mutex<Settings> {
    Mutex::new(Settings {
        scale,
        idle_seconds: idle,
        ..Settings::default()
    })
}

/// 현재 assets(kb_up·mouse_base, 태그 `tag`)와 설정을 프리셋으로 저장하고 id를 돌려준다.
fn save_preset(paths: &AppPaths, settings: &Mutex<Settings>) -> String {
    presets::save(paths, settings, "p", ID_A).expect("save").id
}

#[test]
fn apply_replaces_all_and_clears_missing_slots() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths, 450, 350, 1);
    put(&paths, simple(SimpleSlot::Background), 450, 350, 1);
    let id = save_preset(&paths, &scaled(1.0, 300));
    let want = snapshot(&paths.presets_dir().join(&id));

    put(&paths, simple(SimpleSlot::Hair), 450, 350, 9);
    put(&paths, AssetSlot::kb_down(0), 450, 350, 9);
    put(&paths, simple(SimpleSlot::KbUp), 450, 350, 9);

    let applied = presets::apply(&paths, &id, &scaled(1.0, 300)).expect("apply");
    let keys: Vec<String> = applied
        .manifest
        .entries
        .iter()
        .map(|e| e.slot.file_key())
        .collect();
    assert_eq!(keys, ["kb_up", "mouse_base", "background"]);
    assert_eq!(
        applied.manifest,
        assets::load_manifest(&paths.assets_dir).expect("manifest")
    );
    assert!(applied
        .manifest
        .entries
        .iter()
        .all(|e| e.url.contains("?v=")));
    assert!(!paths.assets_dir.join("hair.png").exists());
    assert!(!paths.assets_dir.join("kb_down_0.png").exists());
    let now = snapshot(&paths.assets_dir);
    for name in ["kb_up.png", "mouse_base.png", "background.png"] {
        assert_eq!(now[name], want[name], "{name}");
    }
}

#[test]
fn apply_sets_ps02_settings_only() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths, 450, 350, 1);
    let mut preset_settings = Settings {
        scale: 1.5,
        idle_seconds: 600,
        mouse: None,
        ..Settings::default()
    };
    preset_settings.timer.enabled = true;
    preset_settings.timer.alarm_volume = 7;
    let id = save_preset(&paths, &Mutex::new(preset_settings.clone()));

    let current = scaled(0.5, 120);
    presets::apply(&paths, &id, &current).expect("apply");
    let after = current.lock().expect("lock").clone();
    assert_eq!((after.scale, after.idle_seconds), (1.5, 600));
    assert_eq!(after.mouse, None);
    assert_eq!(after.timer, preset_settings.timer);
    let on_disk = settings::load(&paths.settings_file)
        .expect("load")
        .expect("some");
    assert_eq!(on_disk, after);
}

#[test]
fn apply_keeps_pc_local_fields() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths, 450, 350, 1);
    let id = save_preset(&paths, &scaled(1.75, 900));

    let mut cur = scaled(1.0, 300).into_inner().expect("inner");
    cur.overlay.x = 555;
    cur.overlay.y = 666;
    cur.overlay.visible = false;
    cur.autostart = true;
    cur.language = Language::En;
    cur.position_lock = true;
    cur.show_in_taskbar = true;
    let before = cur.clone();
    let current = Mutex::new(cur);
    presets::apply(&paths, &id, &current).expect("apply");
    let after = current.lock().expect("lock").clone();
    assert_eq!(after.scale, 1.75);
    assert_eq!(after.overlay, before.overlay);
    assert_eq!(after.autostart, before.autostart);
    assert_eq!(after.language, before.language);
    assert_eq!(after.position_lock, before.position_lock);
    assert_eq!(after.show_in_taskbar, before.show_in_taskbar);
}

#[test]
fn apply_replaces_alarm_or_removes_it() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths, 450, 350, 1);
    std::fs::write(paths.assets_dir.join("alarm.mp3"), b"ID3-preset").expect("alarm");
    let with_alarm = presets::save(&paths, &scaled(1.0, 300), "a", 100)
        .expect("save")
        .id;
    std::fs::remove_file(paths.assets_dir.join("alarm.mp3")).expect("rm");
    let without = presets::save(&paths, &scaled(1.0, 300), "b", 200)
        .expect("save")
        .id;

    std::fs::write(paths.assets_dir.join("alarm.wav"), b"RIFF\0\0\0\0WAVE").expect("wav");
    presets::apply(&paths, &with_alarm, &scaled(1.0, 300)).expect("apply a");
    assert_eq!(
        std::fs::read(paths.assets_dir.join("alarm.mp3")).expect("mp3"),
        b"ID3-preset"
    );
    assert!(!paths.assets_dir.join("alarm.wav").exists());

    presets::apply(&paths, &without, &scaled(1.0, 300)).expect("apply b");
    for name in ["alarm.wav", "alarm.mp3", "alarm.ogg"] {
        assert!(!paths.assets_dir.join(name).exists(), "{name}");
    }
}

#[test]
fn apply_damaged_changes_nothing() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths, 450, 350, 1);
    let id = save_preset(&paths, &scaled(1.0, 300));
    std::fs::write(
        paths.presets_dir().join(&id).join("mouse_base.png"),
        png_tagged(100, 80, 8, 2, 0),
    )
    .expect("rgb");
    put(&paths, simple(SimpleSlot::Hair), 450, 350, 5);

    let before = state_of(&paths);
    let err = presets::apply(&paths, &id, &scaled(1.75, 900)).expect_err("damaged");
    assert!(
        matches!(&err, PresetError::Damaged { file_name } if file_name == "mouse_base.png"),
        "{err:?}"
    );
    assert_eq!(err.code(), "preset.damaged");
    assert_eq!(state_of(&paths), before);
}

#[test]
fn apply_rolls_back_on_settings_failure() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths, 450, 350, 1);
    let id = save_preset(&paths, &scaled(1.75, 900));
    // 현재 자산을 프리셋과 다르게 만든다(교체·삭제·알림음 모두 되돌려져야 한다).
    put(&paths, simple(SimpleSlot::KbUp), 450, 350, 9);
    put(&paths, simple(SimpleSlot::Hair), 450, 350, 9);
    std::fs::write(paths.assets_dir.join("alarm.ogg"), b"OggS-current").expect("alarm");
    std::fs::create_dir(&paths.settings_file).expect("settings.json을 폴더로 막는다");

    let before = snapshot(&paths.assets_dir);
    let current = scaled(1.0, 300);
    let err = presets::apply(&paths, &id, &current).expect_err("settings failure");
    assert!(matches!(err, PresetError::Settings { .. }), "{err:?}");
    assert!(!err.may_have_changed());
    assert_eq!(snapshot(&paths.assets_dir), before);
    assert_eq!(current.lock().expect("lock").scale, 1.0);
}

#[test]
fn apply_then_edit_does_not_touch_preset() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths, 450, 350, 1);
    let id = save_preset(&paths, &scaled(1.25, 300));
    let dir = paths.presets_dir().join(&id);
    let before = snapshot(&dir);

    presets::apply(&paths, &id, &scaled(1.0, 300)).expect("apply");
    put(&paths, simple(SimpleSlot::KbUp), 450, 350, 77);
    assets::remove(&paths.assets_dir, simple(SimpleSlot::MouseBase)).expect("remove");
    assert_eq!(snapshot(&dir), before);
}

#[test]
fn apply_canvas_from_preset_not_current() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths, 450, 350, 1);
    let id = save_preset(&paths, &scaled(1.0, 300));
    clear_assets(&paths);
    seed_basic(&paths, 900, 700, 2);
    put(&paths, simple(SimpleSlot::Body), 900, 700, 2);

    let applied = presets::apply(&paths, &id, &scaled(1.0, 300)).expect("apply");
    let canvas = applied.manifest.canvas.expect("canvas");
    assert_eq!((canvas.width, canvas.height), (450, 350));
    assert_eq!(applied.manifest.entries.len(), 2);
}

#[test]
fn apply_unknown_id_not_found() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths, 450, 350, 1);
    std::fs::create_dir_all(paths.data_dir.join("x")).expect("x");
    let before = state_of(&paths);
    for bad in ["nope", "../x", "..", "a\\b", ""] {
        let err = presets::apply(&paths, bad, &scaled(1.0, 300)).expect_err(bad);
        assert!(matches!(err, PresetError::NotFound), "{bad}: {err:?}");
    }
    assert_eq!(state_of(&paths), before);
}

#[test]
fn apply_latency_report_15_images() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths, 450, 350, 1);
    put(&paths, simple(SimpleSlot::Background), 450, 350, 1);
    put(&paths, simple(SimpleSlot::Body), 450, 350, 1);
    put(&paths, simple(SimpleSlot::Idle), 450, 350, 1);
    put(&paths, simple(SimpleSlot::Rest), 450, 350, 1);
    for i in 0..9 {
        put(&paths, AssetSlot::kb_down(i), 450, 350, 1);
    }
    let bulk = |p: &AppPaths| {
        // 파일당 약 200KB — 15장 약 3MB(설계 §7 측정 조건).
        for entry in assets::load_manifest(&p.assets_dir)
            .expect("manifest")
            .entries
        {
            let path = p.assets_dir.join(&entry.file_name);
            let mut bytes = std::fs::read(&path).expect("read");
            bytes.resize(200 * 1024, 0);
            std::fs::write(path, bytes).expect("grow");
        }
    };
    bulk(&paths);
    let id = save_preset(&paths, &scaled(1.5, 600));
    let start = Instant::now();
    let applied = presets::apply(&paths, &id, &scaled(1.0, 300)).expect("apply");
    let ms = start.elapsed().as_millis();
    assert_eq!(applied.manifest.entries.len(), 15);
    println!("apply 15 images (~3MB): {ms} ms (목표 <= 300 ms, 실패 조건 아님)");
}
