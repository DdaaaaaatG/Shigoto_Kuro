//! `presets` 미리보기 통합 테스트(PS-09 개정, CR-065 — tempdir만 사용).
//! 도우미는 `presets.rs`의 작은 사본이다(파일 800줄 한계, 설계 §11.1 Δ5와 같은 방식).

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use kuro_keyviewer_lib::assets::{self, AssetSlot, SimpleSlot};
use kuro_keyviewer_lib::presets::{self, PresetError, PresetSummary};
use kuro_keyviewer_lib::settings::Settings;
use kuro_keyviewer_lib::AppPaths;

const ID_A: u64 = 1_790_000_000_000;

fn png(w: u32, h: u32) -> Vec<u8> {
    let mut v = vec![0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
    v.extend_from_slice(&13u32.to_be_bytes());
    v.extend_from_slice(b"IHDR");
    v.extend_from_slice(&w.to_be_bytes());
    v.extend_from_slice(&h.to_be_bytes());
    v.extend_from_slice(&[8, 6, 0, 0, 0, 0, 0, 0, 0, 0]);
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

fn seed_basic(paths: &AppPaths) {
    assets::import_bytes(
        &paths.assets_dir,
        AssetSlot::Simple(SimpleSlot::KbUp),
        &png(450, 350),
    )
    .expect("kb_up");
    assets::import_bytes(
        &paths.assets_dir,
        AssetSlot::Simple(SimpleSlot::MouseBase),
        &png(100, 80),
    )
    .expect("mouse");
}

fn save(paths: &AppPaths, name: &str, now: u64) -> Result<PresetSummary, PresetError> {
    presets::save(paths, &Mutex::new(Settings::default()), name, now)
}

fn presets_dir_of(tmp: &Path) -> PathBuf {
    tmp.join("data").join("presets")
}

fn write_src(dir: &Path, images: &[(&str, &str, Vec<u8>)]) {
    std::fs::create_dir_all(dir).expect("src dir");
    let slots: Vec<&str> = images.iter().map(|i| i.0).collect();
    let json = format!(
        r#"{{"formatVersion":1,"name":"원본","savedAt":1,"images":[{}],"alarm":null}}"#,
        slots.join(",")
    );
    std::fs::write(dir.join("preset.json"), json).expect("preset.json");
    for (_, file, bytes) in images {
        std::fs::write(dir.join(file), bytes).expect("image");
    }
}

fn basic_images() -> Vec<(&'static str, &'static str, Vec<u8>)> {
    vec![
        ("\"kb_up\"", "kb_up.png", png(450, 350)),
        ("\"mouse_base\"", "mouse_base.png", png(100, 80)),
    ]
}

// ─── 미리보기(PS-09 개정, CR-065) ─────────────────────────────────────────

fn only(paths: &AppPaths) -> PresetSummary {
    let mut list = presets::list(&paths.presets_dir()).expect("list");
    assert_eq!(list.len(), 1);
    list.remove(0)
}

#[test]
fn preview_layers_have_url_and_size() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let s = save(&paths, "p", ID_A).expect("save");
    let layers = &s.preview.layers;
    let got: Vec<(String, u32, u32)> = layers
        .iter()
        .map(|l| (l.slot.file_key(), l.width, l.height))
        .collect();
    assert_eq!(
        got,
        [("kb_up".into(), 450, 350), ("mouse_base".into(), 100, 80)]
    );
    for l in layers {
        assert!(l.url.starts_with("http://asset.localhost/"), "{}", l.url);
        assert!(
            l.url.contains("presets%5C") && l.url.contains(&s.id),
            "{}",
            l.url
        );
        assert!(!l.url.contains(".staging-"), "{}", l.url);
        assert!(l.url.contains("?v="), "{}", l.url);
    }
}

#[test]
fn preview_canvas_from_first_canvas_layer() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let s = save(&paths, "p", ID_A).expect("save");
    let canvas = s.preview.canvas.expect("canvas");
    assert_eq!((canvas.width, canvas.height), (450, 350));

    // 캔버스 레이어가 없으면 None(mouse_base만 있는 손으로 만든 프리셋).
    let src = tmp.path().join("src");
    write_src(&src, &[("\"mouse_base\"", "mouse_base.png", png(100, 80))]);
    let dir = tmp.path().join("other");
    std::fs::create_dir_all(dir.join("100")).expect("dir");
    for f in ["preset.json", "mouse_base.png"] {
        std::fs::copy(src.join(f), dir.join("100").join(f)).expect("copy");
    }
    let list = presets::list(&dir).expect("list");
    assert_eq!(list[0].preview.canvas, None);
    assert_eq!(list[0].preview.layers.len(), 1);
}

#[test]
fn preview_uses_default_mouse_when_none() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let s = save(&paths, "p", ID_A).expect("save");
    let d = kuro_keyviewer_lib::settings::default_mouse();
    assert_eq!(
        (s.preview.part_pos, s.preview.pen_pos),
        (d.part_pos, d.pen_pos)
    );

    // 설정의 mouse가 null이면 기본값으로 대체한다.
    let json_path = paths.presets_dir().join(&s.id).join("preset.json");
    let mut v: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&json_path).expect("read")).expect("json");
    v["settings"]["mouse"] = serde_json::Value::Null;
    std::fs::write(&json_path, v.to_string()).expect("write");
    let after = only(&paths);
    assert_eq!(
        (after.preview.part_pos, after.preview.pen_pos),
        (d.part_pos, d.pen_pos)
    );

    // 값이 있으면 그 값을 쓴다.
    v["settings"]["mouse"] = serde_json::to_value(kuro_keyviewer_lib::settings::MouseSettings {
        part_pos: kuro_keyviewer_lib::settings::Point { x: 1.0, y: 2.0 },
        pen_pos: None,
        ..d
    })
    .expect("mouse");
    std::fs::write(&json_path, v.to_string()).expect("write");
    let custom = only(&paths);
    assert_eq!(
        custom.preview.part_pos,
        kuro_keyviewer_lib::settings::Point { x: 1.0, y: 2.0 }
    );
    assert_eq!(custom.preview.pen_pos, None);
}

#[test]
fn preview_skips_unreadable_png() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let s = save(&paths, "p", ID_A).expect("save");
    let dir = paths.presets_dir().join(&s.id);
    std::fs::write(dir.join("mouse_base.png"), b"not a png").expect("break");
    let after = only(&paths);
    let keys: Vec<String> = after
        .preview
        .layers
        .iter()
        .map(|l| l.slot.file_key())
        .collect();
    assert_eq!(keys, ["kb_up"]);
    assert_eq!(after.image_count, 2);
    std::fs::remove_file(dir.join("kb_up.png")).expect("rm");
    assert!(only(&paths).preview.layers.is_empty());
}

#[test]
fn list_summary_includes_preview() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let saved = save(&paths, "p", ID_A).expect("save");
    assert_eq!(only(&paths), saved);
    let json = serde_json::to_value(&saved).expect("json");
    assert!(json["preview"]["partPos"].is_object());
    assert!(json["preview"].get("penPos").is_some());
    assert_eq!(json["preview"]["layers"].as_array().map(Vec::len), Some(2));
}

#[test]
fn rename_keeps_preview_urls() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let s = save(&paths, "before", ID_A).expect("save");
    let r = presets::rename(&paths.presets_dir(), &s.id, "after").expect("rename");
    assert_eq!(r.preview, s.preview);
}

#[test]
fn import_summary_has_preview() {
    let tmp = tempfile::tempdir().expect("tmp");
    let src = tmp.path().join("src");
    write_src(&src, &basic_images());
    let dir = presets_dir_of(tmp.path());
    let r = presets::import_from(&dir, &src, ID_A).expect("report");
    let s = r.preset.expect("registered");
    assert_eq!(s.preview.layers.len(), 2);
    assert!(s
        .preview
        .layers
        .iter()
        .all(|l| l.url.contains(&s.id) && !l.url.contains(".staging-")));
    assert_eq!(
        s.preview.canvas.map(|c| (c.width, c.height)),
        Some((450, 350))
    );
}
