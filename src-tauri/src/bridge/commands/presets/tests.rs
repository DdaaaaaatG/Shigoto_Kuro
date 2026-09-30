//! 프리셋 command 테스트 — contract.md §5.11 「테스트」. tauri 없이 tempdir로 `do_*`를 부른다.
//! 뒤처리(emit·리사이즈·손 기준점·타이머)는 수동 확인(dev 앱).

use super::*;
use crate::assets::{self, AssetSlot, SimpleSlot};

fn png(w: u32, h: u32, tag: u8) -> Vec<u8> {
    let mut v = vec![0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
    v.extend_from_slice(&13u32.to_be_bytes());
    v.extend_from_slice(b"IHDR");
    v.extend_from_slice(&w.to_be_bytes());
    v.extend_from_slice(&h.to_be_bytes());
    v.extend_from_slice(&[8, 6, 0, 0, 0]);
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

fn seed_basic(paths: &AppPaths) {
    for (slot, w, h) in [
        (SimpleSlot::KbUp, 300, 200),
        (SimpleSlot::MouseBase, 100, 80),
    ] {
        assets::import_bytes(&paths.assets_dir, AssetSlot::Simple(slot), &png(w, h, 1))
            .expect("import");
    }
}

#[test]
fn preset_error_maps_to_bridge_codes() {
    let dir = tempfile::tempdir().expect("tempdir");
    let leak_probe = dir.path().to_string_lossy().into_owned();
    let cases: Vec<(PresetError, &str)> = vec![
        (PresetError::NotFound, "preset.not_found"),
        (PresetError::InvalidName, "preset.invalid_name"),
        (PresetError::MissingRequired, "preset.missing_required"),
        (PresetError::NotPreset, "preset.not_preset"),
        (PresetError::Format("사유".into()), "preset.format"),
        (
            PresetError::InvalidSettings("사유".into()),
            "preset.invalid_settings",
        ),
        (
            PresetError::Damaged {
                file_name: "kb_up.png".into(),
            },
            "preset.damaged",
        ),
        (PresetError::BadDir, "preset.bad_dir"),
        (PresetError::ExportExists, "preset.export_exists"),
        (
            PresetError::Io {
                source: std::io::Error::other("x"),
                changed: false,
            },
            "preset.io",
        ),
        (
            PresetError::Settings {
                source: crate::settings::SettingsError::Io(std::io::Error::other("x")),
                changed: false,
            },
            "settings.io",
        ),
    ];
    for (err, code) in cases {
        let mapped = BridgeError::from(err);
        assert_eq!(mapped.code, code);
        assert!(!mapped.message.contains(&leak_probe), "{}", mapped.message);
        assert!(!mapped.message.contains('\\'), "{}", mapped.message);
    }
}

#[test]
fn ensure_preset_caller_rejects_non_settings() {
    assert!(ensure_preset_caller("settings").is_ok());
    let err = ensure_preset_caller("overlay").expect_err("거부");
    assert_eq!(err.code, "preset.forbidden");
    assert_eq!(err.message, "프리셋은 설정 창에서만 바꿀 수 있습니다.");
    assert!(!err.message.contains("overlay"));
}

#[test]
fn do_list_empty_when_no_presets_dir() {
    let dir = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(dir.path());
    assert!(do_list(&paths).expect("list").is_empty());
}

#[test]
fn do_save_missing_required_maps_code() {
    let dir = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(dir.path());
    let settings = Mutex::new(Settings::default());
    let err = do_save(&paths, &settings, "이름", 1_790_000_000_000).expect_err("필수 없음");
    assert_eq!(err.code, "preset.missing_required");
    assert!(do_list(&paths).expect("list").is_empty());
}

#[test]
fn do_save_then_list_returns_summary() {
    let dir = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(dir.path());
    seed_basic(&paths);
    let settings = Mutex::new(Settings::default());
    let saved = do_save(&paths, &settings, "  고양이 A  ", 1_790_000_000_000).expect("save");
    assert_eq!(saved.name, "고양이 A");
    assert_eq!(saved.image_count, 2);
    assert!(!saved.has_alarm);
    assert_eq!(saved.saved_at, 1_790_000_000_000);
    assert_eq!(saved.preview.layers.len(), 2);
    assert_eq!(
        saved.preview.canvas.map(|c| (c.width, c.height)),
        Some((300, 200))
    );
    for layer in &saved.preview.layers {
        assert!(layer.url.contains("presets"), "{}", layer.url);
        assert!(!layer.url.contains(".staging-"), "{}", layer.url);
    }
    assert_eq!(do_list(&paths).expect("list"), vec![saved]);
}

#[test]
fn do_rename_then_list_shows_new_name() {
    let dir = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(dir.path());
    seed_basic(&paths);
    let settings = Mutex::new(Settings::default());
    let saved = do_save(&paths, &settings, "A", 1_790_000_000_000).expect("save");
    let renamed = do_rename(&paths, &saved.id, " B ").expect("rename");
    assert_eq!(renamed.name, "B");
    assert_eq!(do_list(&paths).expect("list")[0].name, "B");
    let err = do_rename(&paths, &saved.id, "  ").expect_err("빈 이름");
    assert_eq!(err.code, "preset.invalid_name");
}

#[test]
fn do_delete_then_list_empty() {
    let dir = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(dir.path());
    seed_basic(&paths);
    let settings = Mutex::new(Settings::default());
    let saved = do_save(&paths, &settings, "A", 1_790_000_000_000).expect("save");
    do_delete(&paths, &saved.id).expect("delete");
    assert!(do_list(&paths).expect("list").is_empty());
    let err = do_delete(&paths, &saved.id).expect_err("이미 없음");
    assert_eq!(err.code, "preset.not_found");
}

#[test]
fn do_export_returns_folder_name_and_rejects_duplicate() {
    let dir = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(dir.path());
    seed_basic(&paths);
    let settings = Mutex::new(Settings::default());
    let saved = do_save(&paths, &settings, "고양이 A", 1_790_000_000_000).expect("save");
    let out = dir.path().join("out");
    std::fs::create_dir_all(&out).expect("out");
    let res = do_export(&paths, &saved.id, &out).expect("export");
    assert_eq!(res.folder_name, "고양이 A");
    let err = do_export(&paths, &saved.id, &out).expect_err("중복");
    assert_eq!(err.code, "preset.export_exists");
    let err = do_export(&paths, &saved.id, Path::new("relative")).expect_err("상대 경로");
    assert_eq!(err.code, "preset.bad_dir");
}

#[test]
fn do_import_report_serializes_camel_case() {
    let dir = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(dir.path());
    seed_basic(&paths);
    let settings = Mutex::new(Settings::default());
    let saved = do_save(&paths, &settings, "A", 1_790_000_000_000).expect("save");
    let out = dir.path().join("out");
    std::fs::create_dir_all(&out).expect("out");
    let exported = do_export(&paths, &saved.id, &out).expect("export");
    let folder = out.join(exported.folder_name);

    let ok = do_import(&paths, &folder, 1_790_000_000_123).expect("import");
    assert!(ok.problems.is_empty());
    let json = serde_json::to_value(&ok).expect("ser");
    assert_eq!(json["preset"]["savedAt"], 1_790_000_000_000u64);
    assert_eq!(json["preset"]["imageCount"], 2);
    assert_eq!(json["problems"], serde_json::json!([]));

    std::fs::write(folder.join("kb_up.png"), b"not png").expect("corrupt");
    let bad = do_import(&paths, &folder, 1).expect("problems는 Ok");
    assert!(bad.preset.is_none());
    assert!(!bad.problems.is_empty());
    let json = serde_json::to_value(&bad).expect("ser");
    assert!(json["preset"].is_null());
    assert_eq!(json["problems"][0]["fileName"], "kb_up.png");
    assert!(json["problems"][0]["code"].is_string());

    let err = do_import(&paths, &dir.path().join("nope"), 1).expect_err("없는 폴더");
    assert_eq!(err.code, "preset.bad_dir");
}

#[test]
fn do_apply_returns_manifest() {
    let dir = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(dir.path());
    seed_basic(&paths);
    let settings = Mutex::new(Settings::default());
    let saved = do_save(&paths, &settings, "A", 1_790_000_000_000).expect("save");
    let applied = do_apply(&paths, &settings, &saved.id).expect("apply");
    assert_eq!(applied.manifest.entries.len(), 2);
    assert_eq!(
        applied.manifest.canvas.map(|c| (c.width, c.height)),
        Some((300, 200))
    );

    let err = do_apply(&paths, &settings, "no-such").expect_err("없음");
    assert_eq!(err.code(), "preset.not_found");
    assert!(!err.may_have_changed());
}
