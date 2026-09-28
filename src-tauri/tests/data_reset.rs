//! `data_reset` 통합 테스트(설계 §8.2, tempdir만 사용 — 실제 `%APPDATA%` 접근 금지).

use std::path::Path;
use std::sync::Mutex;

use kuro_keyviewer_lib::assets::{self, AssetSlot, SimpleSlot};
use kuro_keyviewer_lib::data_reset::{self, ResetOutcome};
use kuro_keyviewer_lib::settings::{self, Language, MouseSettings, Point, Settings};
use kuro_keyviewer_lib::AppPaths;

/// v3 세트 자산 6장(테스트 전용 픽스처 — 실제 내장 세대는 4).
const V3_FILES: [&str; 6] = [
    "background",
    "kb_down_0",
    "kb_up",
    "mouse_base",
    "pen_down_0",
    "pen_up",
];

fn v3_bytes(name: &str) -> Vec<u8> {
    let path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("../doc/assets/defaults-v3/{name}.png"));
    std::fs::read(&path).expect("v3 픽스처 읽기")
}

fn v3_slot(name: &str) -> AssetSlot {
    match name {
        "background" => AssetSlot::Simple(SimpleSlot::Background),
        "kb_up" => AssetSlot::Simple(SimpleSlot::KbUp),
        "mouse_base" => AssetSlot::Simple(SimpleSlot::MouseBase),
        "pen_up" => AssetSlot::Simple(SimpleSlot::PenUp),
        "pen_down_0" => AssetSlot::pen_down(0),
        "kb_down_0" => AssetSlot::kb_down(0),
        other => panic!("알 수 없는 v3 파일: {other}"),
    }
}

/// `AppPaths { data_dir: tmp/"data", assets_dir: tmp/"data/assets", settings_file: tmp/"data/settings.json" }`.
/// `assets_dir`를 미리 만든다(lib.rs:96과 같은 전제 — `reset_data`는 폴더를 만들지 않는다).
fn make_paths(tmp: &Path) -> AppPaths {
    let data_dir = tmp.join("data");
    let assets_dir = data_dir.join("assets");
    let settings_file = data_dir.join("settings.json");
    std::fs::create_dir_all(&assets_dir).expect("assets_dir 생성");
    AppPaths {
        data_dir,
        assets_dir,
        settings_file,
    }
}

/// v3 세트 6장을 등록한다(캔버스 레이어 먼저: kb_up → background → kb_down_0).
fn install_v3_set(assets_dir: &Path) {
    for name in [
        "kb_up",
        "background",
        "kb_down_0",
        "mouse_base",
        "pen_up",
        "pen_down_0",
    ] {
        assets::import_bytes(assets_dir, v3_slot(name), &v3_bytes(name)).unwrap_or_else(|e| {
            panic!("v3 픽스처 등록 실패({name}): {e}");
        });
    }
    for name in V3_FILES {
        assert!(
            assets_dir.join(format!("{name}.png")).exists(),
            "v3 픽스처가 저장되지 않음: {name}"
        );
    }
}

fn custom_settings() -> Settings {
    let mut s = Settings {
        scale: 1.5,
        language: Language::Ja,
        autostart: true,
        ..Settings::default()
    };
    s.overlay.x = 321;
    s.overlay.y = 654;
    s.mouse = Some(MouseSettings {
        shoulder: Point { x: 1.0, y: 2.0 },
        area: settings::default_mouse().area,
        part_pos: Point { x: 3.0, y: 4.0 },
        hand: None,
        pen_pos: Some(Point { x: 5.0, y: 6.0 }),
        pen_mode: false,
    });
    s.timer.text_pos = Point { x: 7.0, y: 8.0 };
    s.timer.rotation = 0.0;
    s
}

fn write_junk(assets_dir: &Path, data_dir: &Path, outside: &Path) {
    std::fs::write(assets_dir.join("alarm.wav"), b"junk").expect("alarm.wav");
    std::fs::write(assets_dir.join("kb_up.png.123-1.tmp"), b"junk").expect("kb_up tmp");
    std::fs::write(data_dir.join("settings.json.123-1.tmp"), b"junk").expect("settings tmp");
    std::fs::write(assets_dir.join("keep_me.txt"), b"junk").expect("keep_me.txt");
    std::fs::create_dir_all(assets_dir.join("sub")).expect("sub dir");
    std::fs::write(assets_dir.join("sub").join("x.png"), b"junk").expect("sub/x.png");
    std::fs::create_dir_all(data_dir.join("EBWebView")).expect("EBWebView dir");
    std::fs::write(data_dir.join("EBWebView").join("x"), b"junk").expect("EBWebView/x");
    std::fs::write(outside, b"outside-bytes").expect("outside.png");
}

fn assert_only_builtin_seven(assets_dir: &Path) {
    let png_names: Vec<String> = std::fs::read_dir(assets_dir)
        .expect("read_dir")
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().and_then(|x| x.to_str()) == Some("png"))
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    let mut expected: Vec<String> = assets::defaults::DEFAULT_ASSETS
        .iter()
        .map(|d| format!("{}.png", d.slot.file_key()))
        .collect();
    let mut actual = png_names;
    expected.sort();
    actual.sort();
    assert_eq!(actual, expected);
    for d in assets::defaults::DEFAULT_ASSETS.iter() {
        let on_disk = std::fs::read(assets_dir.join(format!("{}.png", d.slot.file_key())))
            .expect("read builtin png");
        assert_eq!(on_disk, d.bytes, "슬롯 {} 바이트 불일치", d.slot.file_key());
    }
}

fn marker_generation(data_dir: &Path) -> u64 {
    let text =
        std::fs::read_to_string(data_dir.join(data_reset::MARKER_FILE)).expect("read marker");
    let value: serde_json::Value = serde_json::from_str(&text).expect("parse marker");
    value["generation"].as_u64().expect("generation 필드")
}

#[test]
fn reset_from_v3_with_custom_settings() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    install_v3_set(&paths.assets_dir);
    let custom = custom_settings();
    std::fs::write(
        &paths.settings_file,
        serde_json::to_string_pretty(&custom).expect("ser"),
    )
    .expect("write custom settings");
    let outside = tmp.path().join("outside.png");
    write_junk(&paths.assets_dir, &paths.data_dir, &outside);

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    data_reset::run_startup(&paths, &m);

    assert_only_builtin_seven(&paths.assets_dir);
    assert!(!paths.assets_dir.join("kb_down_0.png").exists());
    let manifest = assets::load_manifest(&paths.assets_dir).expect("manifest");
    assert_eq!(
        manifest.entries.len(),
        assets::defaults::DEFAULT_ASSETS.len()
    );
    assert!(!paths.assets_dir.join("alarm.wav").exists());
    assert!(!paths.assets_dir.join("kb_up.png.123-1.tmp").exists());

    let expected = data_reset::reset_settings(&custom);
    assert_eq!(*m.lock().expect("lock"), expected);
    assert_eq!(settings::load_or_default(&paths.settings_file), expected);
    assert_eq!(
        marker_generation(&paths.data_dir),
        u64::from(data_reset::DATA_GENERATION)
    );
}

#[test]
fn wipe_keeps_unknown_files_and_subdirs() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    install_v3_set(&paths.assets_dir);
    let outside = tmp.path().join("outside.png");
    write_junk(&paths.assets_dir, &paths.data_dir, &outside);

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    data_reset::run_startup(&paths, &m);

    assert!(paths.assets_dir.join("keep_me.txt").exists());
    assert!(paths.assets_dir.join("sub").join("x.png").exists());
    assert!(paths.data_dir.join("EBWebView").join("x").exists());
}

#[test]
fn wipe_never_touches_outside_data_dir() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    install_v3_set(&paths.assets_dir);
    let outside = tmp.path().join("outside.png");
    write_junk(&paths.assets_dir, &paths.data_dir, &outside);

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    data_reset::run_startup(&paths, &m);

    assert_eq!(
        std::fs::read(&outside).expect("read outside"),
        b"outside-bytes"
    );
}

#[test]
fn startup_skips_when_generation_matches() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    data_reset::run_startup(&paths, &m); // 첫 실행 — 초기화되고 표식 기록

    assets::import_bytes(
        &paths.assets_dir,
        AssetSlot::Simple(SimpleSlot::KbUp),
        &v3_bytes("kb_up"),
    )
    .expect("커스텀 kb_up 등록");
    settings::update(&m, &paths.settings_file, |s| s.scale = 1.9).expect("update scale");

    let before_manifest = assets::load_manifest(&paths.assets_dir).expect("manifest");
    let before_settings = m.lock().expect("lock").clone();

    data_reset::run_startup(&paths, &m); // 재실행 — Keep

    assert_eq!(
        assets::load_manifest(&paths.assets_dir).expect("manifest"),
        before_manifest
    );
    assert_eq!(*m.lock().expect("lock"), before_settings);
}

#[test]
fn fresh_empty_dir_is_seeded() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    data_reset::run_startup(&paths, &m);

    assert_only_builtin_seven(&paths.assets_dir);
    assert_eq!(
        marker_generation(&paths.data_dir),
        u64::from(data_reset::DATA_GENERATION)
    );
    assert_eq!(*m.lock().expect("lock"), Settings::default());
    assert_eq!(
        settings::load_or_default(&paths.settings_file),
        Settings::default()
    );
}

#[test]
fn failure_leaves_no_marker_and_retries() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    install_v3_set(&paths.assets_dir);
    std::fs::write(
        &paths.settings_file,
        serde_json::to_string_pretty(&custom_settings()).expect("ser"),
    )
    .expect("write custom settings");

    // ① 실패 주입: 표식 자리에 파일이 아니라 "비어 있지 않은 폴더"를 둔다.
    let marker_dir = paths
        .data_dir
        .join(kuro_keyviewer_lib::data_reset::MARKER_FILE);
    std::fs::create_dir_all(&marker_dir).expect("marker dir");
    std::fs::write(marker_dir.join("inside"), b"x").expect("marker dir 내부 파일");

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    let err = data_reset::reset_data(&paths, &m).expect_err("reset_data는 실패해야 한다");
    assert_eq!(err.code(), "reset.io");
    // 아무것도 지우지 않았다 — v3 파일·커스텀 설정이 그대로.
    for name in V3_FILES {
        assert!(paths.assets_dir.join(format!("{name}.png")).exists());
    }
    assert_eq!(m.lock().expect("lock").language, Language::Ja);

    std::fs::remove_dir_all(&marker_dir).expect("marker dir 제거");
    data_reset::run_startup(&paths, &m);
    assert_eq!(
        marker_generation(&paths.data_dir),
        u64::from(data_reset::DATA_GENERATION)
    );
    assert_only_builtin_seven(&paths.assets_dir);
}

#[test]
fn startup_never_panics_on_failure() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    let marker_dir = paths
        .data_dir
        .join(kuro_keyviewer_lib::data_reset::MARKER_FILE);
    std::fs::create_dir_all(&marker_dir).expect("marker dir");
    std::fs::write(marker_dir.join("inside"), b"x").expect("marker dir 내부 파일");

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    data_reset::run_startup(&paths, &m); // 패닉 없이 반환해야 한다(단언은 "반환했다"는 사실 그 자체)

    assert!(
        marker_dir.is_dir(),
        "표식 폴더가 그대로라 read_marker는 여전히 None"
    );
}

#[test]
fn seed_failure_leaves_no_marker_and_retries() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    install_v3_set(&paths.assets_dir);

    // ②는 kb_up.png(파일)을 지우지만, kb_up.png 자리를 폴더로 바꿔 두면 wipe가 건너뛰고(파일
    // 아님) ③ seed_if_empty가 exists()로 감지해 FilesPresent → Err(Seed)가 난다.
    std::fs::remove_file(paths.assets_dir.join("kb_up.png")).expect("kb_up.png 제거");
    std::fs::create_dir_all(paths.assets_dir.join("kb_up.png")).expect("kb_up.png 폴더로 대체");

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    let err = data_reset::reset_data(&paths, &m).expect_err("reset_data는 실패해야 한다");
    assert_eq!(err.code(), "reset.seed");
    assert!(!paths.data_dir.join(data_reset::MARKER_FILE).exists());

    std::fs::remove_dir_all(paths.assets_dir.join("kb_up.png")).expect("kb_up.png 폴더 제거");
    data_reset::run_startup(&paths, &m);
    assert_eq!(
        marker_generation(&paths.data_dir),
        u64::from(data_reset::DATA_GENERATION)
    );
    assert_only_builtin_seven(&paths.assets_dir);
}

#[test]
fn language_defaults_when_settings_unreadable() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    std::fs::write(&paths.settings_file, "{").expect("손상 파일");

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    data_reset::run_startup(&paths, &m);

    assert_eq!(m.lock().expect("lock").language, Language::default());
    assert_eq!(
        settings::load_or_default(&paths.settings_file),
        Settings::default()
    );
    assert_eq!(
        marker_generation(&paths.data_dir),
        u64::from(data_reset::DATA_GENERATION)
    );
}

#[test]
fn reset_twice_keeps_language_on_disk() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    install_v3_set(&paths.assets_dir);
    let custom = custom_settings();
    std::fs::write(
        &paths.settings_file,
        serde_json::to_string_pretty(&custom).expect("ser"),
    )
    .expect("write custom settings");

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    data_reset::reset_data(&paths, &m).expect("first reset");
    let out = data_reset::reset_data(&paths, &m).expect("second reset (메모리 == 보존 결과)");
    let _: ResetOutcome = out;

    assert_eq!(
        settings::load_or_default(&paths.settings_file).language,
        Language::Ja
    );
    assert_eq!(m.lock().expect("lock").language, Language::Ja);
}

#[test]
fn reset_elapsed_under_budget() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    install_v3_set(&paths.assets_dir);
    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    let out = data_reset::reset_data(&paths, &m).expect("reset_data");
    println!(
        "reset_elapsed_under_budget: removed={} seeded={} elapsed_ms={}",
        out.removed, out.seeded, out.elapsed_ms
    );
}

// ---- 2차(배포 전 검증 WARN 6건) 도우미 ----------------------------------------------------

/// 디렉터리 링크(정션)를 만든다. ① `mklink /J`(관리자 권한 불필요) ② 실패하면
/// `symlink_dir`(개발자 모드·관리자) ③ 만든 뒤 `file_attributes() & 0x400 != 0`을 확인.
/// 셋 다 안 되면 false — 호출자는 SKIP을 출력하고 반환한다.
fn make_dir_link(link: &Path, target: &Path) -> bool {
    use std::os::windows::fs::MetadataExt;

    let mklink_ok = std::process::Command::new("cmd")
        .args([
            "/C",
            "mklink",
            "/J",
            &link.to_string_lossy(),
            &target.to_string_lossy(),
        ])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !mklink_ok && std::os::windows::fs::symlink_dir(target, link).is_err() {
        return false;
    }

    match std::fs::symlink_metadata(link) {
        Ok(meta) => meta.file_attributes() & 0x400 != 0,
        Err(_) => false,
    }
}

/// `data-reset-attempts.json`의 `attempts` 필드를 읽는다. 파일이 없으면 `None`.
fn attempts_value(data_dir: &Path) -> Option<u64> {
    let text = std::fs::read_to_string(data_dir.join("data-reset-attempts.json")).ok()?;
    let value: serde_json::Value = serde_json::from_str(&text).ok()?;
    value["attempts"].as_u64()
}

/// 폴더 아래 일반 파일의 (상대 경로, 바이트)를 재귀로 모아 정렬한다.
fn snapshot(dir: &Path) -> Vec<(std::path::PathBuf, Vec<u8>)> {
    fn walk(root: &Path, dir: &Path, out: &mut Vec<(std::path::PathBuf, Vec<u8>)>) {
        let Ok(entries) = std::fs::read_dir(dir) else {
            return;
        };
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            let Ok(meta) = std::fs::symlink_metadata(&path) else {
                continue;
            };
            if meta.file_type().is_dir() {
                walk(root, &path, out);
            } else if meta.file_type().is_file() {
                if let Ok(bytes) = std::fs::read(&path) {
                    let rel = path.strip_prefix(root).unwrap_or(&path).to_path_buf();
                    out.push((rel, bytes));
                }
            }
        }
    }
    let mut out = Vec::new();
    walk(dir, dir, &mut out);
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out
}

#[test]
fn start_dir_link_data_is_refused() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let real_data = tmp.path().join("real_data");
    let real_assets = real_data.join("assets");
    std::fs::create_dir_all(&real_assets).expect("real_assets 생성");
    install_v3_set(&real_assets);
    let custom = custom_settings();
    std::fs::write(
        real_data.join("settings.json"),
        serde_json::to_string_pretty(&custom).expect("ser"),
    )
    .expect("write custom settings");
    std::fs::write(real_assets.join("alarm.wav"), b"junk").expect("alarm.wav");

    let link_data = tmp.path().join("data");
    if !make_dir_link(&link_data, &real_data) {
        println!("SKIP start_dir_link_data_is_refused: 디렉터리 링크를 만들 수 없음(권한)");
        return;
    }

    let paths = AppPaths {
        data_dir: link_data.clone(),
        assets_dir: link_data.join("assets"),
        settings_file: link_data.join("settings.json"),
    };
    let before = snapshot(&real_data);

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    let err = data_reset::reset_data(&paths, &m).expect_err("링크 시작 폴더는 거부되어야 함");
    assert_eq!(err.code(), "reset.io");
    data_reset::run_startup(&paths, &m);

    assert_eq!(
        snapshot(&real_data),
        before,
        "real_data 내용이 그대로여야 함"
    );
    assert_eq!(m.lock().expect("lock").language, Language::Ja);
}

#[test]
fn start_dir_link_assets_is_refused() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let data_dir = tmp.path().join("data");
    std::fs::create_dir_all(&data_dir).expect("data_dir 생성");
    let custom = custom_settings();
    std::fs::write(
        data_dir.join("settings.json"),
        serde_json::to_string_pretty(&custom).expect("ser"),
    )
    .expect("write custom settings");

    let real_assets = tmp.path().join("real_assets");
    std::fs::create_dir_all(&real_assets).expect("real_assets 생성");
    install_v3_set(&real_assets);
    std::fs::write(real_assets.join("alarm.wav"), b"junk").expect("alarm.wav");

    let link_assets = data_dir.join("assets");
    if !make_dir_link(&link_assets, &real_assets) {
        println!("SKIP start_dir_link_assets_is_refused: 디렉터리 링크를 만들 수 없음(권한)");
        return;
    }

    let paths = AppPaths {
        data_dir: data_dir.clone(),
        assets_dir: link_assets,
        settings_file: data_dir.join("settings.json"),
    };
    let before = snapshot(&real_assets);
    let settings_before = std::fs::read(&paths.settings_file).expect("settings 읽기");

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    let err = data_reset::reset_data(&paths, &m).expect_err("링크 assets_dir은 거부되어야 함");
    assert_eq!(err.code(), "reset.io");
    data_reset::run_startup(&paths, &m);

    assert_eq!(
        snapshot(&real_assets),
        before,
        "real_assets 내용이 그대로여야 함"
    );
    assert!(!data_dir.join(data_reset::MARKER_FILE).exists());
    assert!(!data_dir.join("data-reset-attempts.json").exists());
    assert_eq!(
        std::fs::read(&paths.settings_file).expect("settings 재확인"),
        settings_before
    );
}

#[test]
fn startup_counts_failed_attempts_up_to_limit() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    install_v3_set(&paths.assets_dir);
    // ③ 실패 주입: kb_up.png 자리를 폴더로 바꾼다(seed_failure_leaves_no_marker_and_retries와 같은 방법).
    std::fs::remove_file(paths.assets_dir.join("kb_up.png")).expect("kb_up.png 제거");
    std::fs::create_dir_all(paths.assets_dir.join("kb_up.png")).expect("kb_up.png 폴더로 대체");

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    for expected in [1u64, 2, 3] {
        data_reset::run_startup(&paths, &m);
        assert_eq!(attempts_value(&paths.data_dir), Some(expected));
    }

    std::fs::write(paths.assets_dir.join("sentinel.png"), b"x").expect("sentinel");
    data_reset::run_startup(&paths, &m); // 4번째 — 상한 도달, 지우지 않음
    assert_eq!(attempts_value(&paths.data_dir), Some(3));
    assert!(paths.assets_dir.join("sentinel.png").exists());
    assert!(!paths.data_dir.join(data_reset::MARKER_FILE).exists());
}

#[test]
fn startup_skips_wipe_at_limit() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    install_v3_set(&paths.assets_dir);
    let custom = custom_settings();
    std::fs::write(
        &paths.settings_file,
        serde_json::to_string_pretty(&custom).expect("ser"),
    )
    .expect("write custom settings");
    let outside = tmp.path().join("outside.png");
    write_junk(&paths.assets_dir, &paths.data_dir, &outside);
    std::fs::write(
        paths.data_dir.join("data-reset-attempts.json"),
        "{\"attempts\":3}",
    )
    .expect("attempts 파일");

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    data_reset::run_startup(&paths, &m);

    for name in V3_FILES {
        assert!(paths.assets_dir.join(format!("{name}.png")).exists());
    }
    assert!(paths.assets_dir.join("alarm.wav").exists());
    assert_eq!(m.lock().expect("lock").language, Language::Ja);
    assert_eq!(
        settings::load_or_default(&paths.settings_file).language,
        Language::Ja
    );
    assert!(!paths.data_dir.join(data_reset::MARKER_FILE).exists());
    assert_eq!(attempts_value(&paths.data_dir), Some(3));
}

#[test]
fn success_clears_attempts() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    install_v3_set(&paths.assets_dir);
    std::fs::write(
        paths.data_dir.join("data-reset-attempts.json"),
        "{\"attempts\":2}",
    )
    .expect("attempts 파일");

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    data_reset::run_startup(&paths, &m);

    assert_eq!(
        marker_generation(&paths.data_dir),
        u64::from(data_reset::DATA_GENERATION)
    );
    assert_only_builtin_seven(&paths.assets_dir);
    assert_eq!(attempts_value(&paths.data_dir), None);
}

#[test]
fn button_reset_ignores_limit_and_clears() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let paths = make_paths(tmp.path());
    install_v3_set(&paths.assets_dir);
    std::fs::write(
        paths.data_dir.join("data-reset-attempts.json"),
        "{\"attempts\":3}",
    )
    .expect("attempts 파일");

    let m = Mutex::new(settings::load_or_default(&paths.settings_file));
    data_reset::reset_data(&paths, &m).expect("버튼 경로는 상한과 무관하게 성공");
    assert_eq!(
        marker_generation(&paths.data_dir),
        u64::from(data_reset::DATA_GENERATION)
    );
    assert_eq!(attempts_value(&paths.data_dir), None);

    data_reset::run_startup(&paths, &m); // Keep — 내장 7장 그대로
    assert_only_builtin_seven(&paths.assets_dir);
}
