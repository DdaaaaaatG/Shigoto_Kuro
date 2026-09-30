//! `presets` 통합 테스트 — 저장·목록·가져오기·이름·삭제·내보내기(설계 §8.2, tempdir만 사용).
//! 적용 영역은 `presets_apply.rs`(설계 §11.1 Δ5).

use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use kuro_keyviewer_lib::assets::{self, AssetSlot, SimpleSlot};
use kuro_keyviewer_lib::presets::{self, PresetError, PresetSummary};
use kuro_keyviewer_lib::settings::Settings;
use kuro_keyviewer_lib::AppPaths;

const ID_A: u64 = 1_790_000_000_000;

/// IHDR만 있는 최소 PNG + 구분용 꼬리 바이트.
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

fn png(w: u32, h: u32) -> Vec<u8> {
    png_tagged(w, h, 8, 6, 0)
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

/// 필수 2장(kb_up 450×350 캔버스, mouse_base 100×80)을 assets에 등록한다.
fn seed_basic(paths: &AppPaths) {
    assets::import_bytes(&paths.assets_dir, simple(SimpleSlot::KbUp), &png(450, 350))
        .expect("kb_up");
    assets::import_bytes(
        &paths.assets_dir,
        simple(SimpleSlot::MouseBase),
        &png(100, 80),
    )
    .expect("mouse");
}

fn save(paths: &AppPaths, name: &str, now: u64) -> Result<PresetSummary, PresetError> {
    presets::save(paths, &Mutex::new(Settings::default()), name, now)
}

fn file_names(dir: &Path) -> BTreeSet<String> {
    std::fs::read_dir(dir)
        .expect("read_dir")
        .map(|e| e.expect("entry").file_name().to_string_lossy().to_string())
        .collect()
}

/// 가져오기 원본 폴더를 손으로 만든다. images = (슬롯 JSON, 파일 이름, 바이트), alarm = (형식, 파일 이름, 바이트).
fn write_src(
    dir: &Path,
    saved_at: u64,
    images: &[(&str, &str, Vec<u8>)],
    alarm: Option<(&str, &str, Vec<u8>)>,
) {
    std::fs::create_dir_all(dir).expect("src dir");
    let slots: Vec<&str> = images.iter().map(|i| i.0).collect();
    let alarm_json = alarm
        .as_ref()
        .map_or("null".to_string(), |a| format!("\"{}\"", a.0));
    let json = format!(
        r#"{{"formatVersion":1,"name":"원본","savedAt":{saved_at},"images":[{}],"alarm":{alarm_json}}}"#,
        slots.join(",")
    );
    std::fs::write(dir.join("preset.json"), json).expect("preset.json");
    for (_, file, bytes) in images {
        std::fs::write(dir.join(file), bytes).expect("image");
    }
    if let Some((_, file, bytes)) = alarm {
        std::fs::write(dir.join(file), bytes).expect("alarm");
    }
}

fn basic_images() -> Vec<(&'static str, &'static str, Vec<u8>)> {
    vec![
        ("\"kb_up\"", "kb_up.png", png(450, 350)),
        ("\"mouse_base\"", "mouse_base.png", png(100, 80)),
    ]
}

fn problem_codes(r: &presets::PresetImportReport) -> Vec<(&str, &str)> {
    r.problems
        .iter()
        .map(|p| (p.file_name.as_str(), p.code))
        .collect()
}

fn import(presets_dir: &Path, src: &Path) -> Result<presets::PresetImportReport, PresetError> {
    presets::import_from(presets_dir, src, ID_A)
}

// ─── 저장 ────────────────────────────────────────────────────────────────

#[test]
fn save_creates_folder_with_all_files() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let s = save(&paths, "  내 세트 ", ID_A).expect("save");
    assert_eq!(s.id, ID_A.to_string());
    assert_eq!(s.name, "내 세트");
    assert_eq!((s.saved_at, s.image_count, s.has_alarm), (ID_A, 2, false));
    let dir = paths.presets_dir().join(&s.id);
    let expected: BTreeSet<String> = ["preset.json", "kb_up.png", "mouse_base.png"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    assert_eq!(file_names(&dir), expected);
    assert_eq!(file_names(&paths.presets_dir()).len(), 1);
}

#[test]
fn save_copies_every_manifest_slot_and_alarm() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    assets::import_bytes(
        &paths.assets_dir,
        AssetSlot::kb_down(0),
        &png_tagged(450, 350, 8, 6, 1),
    )
    .expect("down");
    assets::import_bytes(&paths.assets_dir, simple(SimpleSlot::Hair), &png(450, 350))
        .expect("hair");
    std::fs::write(paths.assets_dir.join("alarm.mp3"), b"ID3-alarm").expect("alarm");
    let s = save(&paths, "전부", ID_A).expect("save");
    assert_eq!((s.image_count, s.has_alarm), (4, true));
    let dir = paths.presets_dir().join(&s.id);
    for name in ["kb_up.png", "mouse_base.png", "kb_down_0.png", "hair.png"] {
        let same = std::fs::read(dir.join(name)).expect("copied")
            == std::fs::read(paths.assets_dir.join(name)).expect("orig");
        assert!(same, "{name}");
    }
    assert_eq!(
        std::fs::read(dir.join("alarm.mp3")).expect("alarm"),
        b"ID3-alarm"
    );
}

#[test]
fn save_without_required_rejected() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    assets::import_bytes(&paths.assets_dir, simple(SimpleSlot::KbUp), &png(450, 350))
        .expect("kb_up");
    let err = save(&paths, "x", ID_A).expect_err("missing mouse_base");
    assert!(matches!(err, PresetError::MissingRequired));
    assert!(!paths.presets_dir().exists());
}

#[test]
fn save_rejects_invalid_name_before_touching_disk() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    assert!(matches!(
        save(&paths, "   ", ID_A),
        Err(PresetError::InvalidName)
    ));
    assert!(matches!(
        save(&paths, &"가".repeat(51), ID_A),
        Err(PresetError::InvalidName)
    ));
    assert!(!paths.presets_dir().exists());
}

#[test]
fn save_failure_leaves_no_folder() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    std::fs::remove_file(paths.assets_dir.join("kb_up.png")).expect("rm");
    std::fs::create_dir(paths.assets_dir.join("kb_up.png")).expect("dir in place of png");
    let err = save(&paths, "x", ID_A).expect_err("io");
    assert_eq!(err.code(), "preset.io");
    assert!(!err.may_have_changed());
    let left = if paths.presets_dir().exists() {
        file_names(&paths.presets_dir())
    } else {
        BTreeSet::new()
    };
    assert!(left.is_empty(), "{left:?}");
}

#[test]
fn duplicate_names_allowed() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let a = save(&paths, "같은 이름", ID_A).expect("a");
    let b = save(&paths, "같은 이름", ID_A).expect("b, same ms");
    assert_ne!(a.id, b.id);
    assert_eq!(b.id, format!("{ID_A}-1"));
    assert_eq!(presets::list(&paths.presets_dir()).expect("list").len(), 2);
}

// ─── 목록 ────────────────────────────────────────────────────────────────

#[test]
fn list_empty_when_no_dir() {
    let tmp = tempfile::tempdir().expect("tmp");
    assert!(presets::list(&tmp.path().join("presets"))
        .expect("list")
        .is_empty());
}

#[test]
fn list_sorted_newest_first() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    save(&paths, "old", 100).expect("old");
    save(&paths, "new", 300).expect("new");
    save(&paths, "mid", 200).expect("mid");
    let names: Vec<String> = presets::list(&paths.presets_dir())
        .expect("list")
        .into_iter()
        .map(|s| s.name)
        .collect();
    assert_eq!(names, ["new", "mid", "old"]);

    // savedAt 같으면 id 내림차순.
    let src = tmp.path().join("src");
    write_src(&src, 300, &basic_images(), None);
    import(&paths.presets_dir(), &src).expect("import");
    let list = presets::list(&paths.presets_dir()).expect("list");
    assert_eq!(list[0].saved_at, 300);
    assert!(list[0].id > list[1].id, "{list:?}");
}

#[test]
fn list_skips_broken_and_staging() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    save(&paths, "good", 100).expect("good");
    let dir = paths.presets_dir();
    std::fs::create_dir(dir.join("200")).expect("no json");
    std::fs::create_dir(dir.join("300")).expect("bad json");
    std::fs::write(dir.join("300").join("preset.json"), "{ nope").expect("bad");
    std::fs::create_dir(dir.join(".staging-400")).expect("staging");
    std::fs::create_dir(dir.join(".trash-500")).expect("trash");
    std::fs::write(dir.join("600"), b"file").expect("stray file");
    let list = presets::list(&dir).expect("list");
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].name, "good");
    assert!(dir.join(".staging-400").exists(), "list는 부수 효과가 없다");
}

#[test]
fn list_skips_link_dirs() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let s = save(&paths, "real", 100).expect("real");
    let dir = paths.presets_dir();
    let link = dir.join("999");
    let made = std::process::Command::new("cmd")
        .args(["/C", "mklink", "/J"])
        .arg(&link)
        .arg(dir.join(&s.id))
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
    if !made {
        eprintln!("정션 생성 불가 — scan.rs is_link_like_table 단위 테스트로 대체");
        return;
    }
    let ids: Vec<String> = presets::list(&dir)
        .expect("list")
        .into_iter()
        .map(|s| s.id)
        .collect();
    assert_eq!(ids, std::slice::from_ref(&s.id));
    std::fs::remove_dir(&link).expect("remove junction");
}

// ─── 가져오기 ────────────────────────────────────────────────────────────

fn presets_dir_of(tmp: &Path) -> PathBuf {
    tmp.join("data").join("presets")
}

#[test]
fn import_rejects_missing_file() {
    let tmp = tempfile::tempdir().expect("tmp");
    let src = tmp.path().join("src");
    write_src(&src, 1, &basic_images(), None);
    std::fs::remove_file(src.join("kb_up.png")).expect("rm");
    let r = import(&presets_dir_of(tmp.path()), &src).expect("report");
    assert_eq!(problem_codes(&r), [("kb_up.png", "preset.file_missing")]);
    assert!(r.preset.is_none());
}

#[test]
fn import_rejects_canvas_mismatch() {
    let tmp = tempfile::tempdir().expect("tmp");
    let src = tmp.path().join("src");
    let mut images = basic_images();
    images.push(("\"idle\"", "idle.png", png(100, 100)));
    write_src(&src, 1, &images, None);
    let r = import(&presets_dir_of(tmp.path()), &src).expect("report");
    assert_eq!(problem_codes(&r), [("idle.png", "asset.canvas_mismatch")]);
}

#[test]
fn import_rejects_non_rgba() {
    let tmp = tempfile::tempdir().expect("tmp");
    let src = tmp.path().join("src");
    let mut images = basic_images();
    images[0].2 = png_tagged(450, 350, 8, 2, 0);
    write_src(&src, 1, &images, None);
    let r = import(&presets_dir_of(tmp.path()), &src).expect("report");
    assert_eq!(problem_codes(&r), [("kb_up.png", "asset.not_rgba")]);
}

#[test]
fn import_rejects_over_1mib_before_read() {
    let tmp = tempfile::tempdir().expect("tmp");
    let src = tmp.path().join("src");
    let mut images = basic_images();
    let mut big = png(450, 350);
    big.resize(1024 * 1024 + 1, 0);
    images[0].2 = big;
    write_src(&src, 1, &images, None);
    let r = import(&presets_dir_of(tmp.path()), &src).expect("report");
    assert_eq!(problem_codes(&r), [("kb_up.png", "asset.too_many_bytes")]);
}

#[test]
fn import_rejects_wrong_alarm_format() {
    let tmp = tempfile::tempdir().expect("tmp");
    let src = tmp.path().join("src");
    write_src(
        &src,
        1,
        &basic_images(),
        Some(("mp3", "alarm.mp3", b"RIFF\0\0\0\0WAVEdata".to_vec())),
    );
    let r = import(&presets_dir_of(tmp.path()), &src).expect("report");
    assert_eq!(problem_codes(&r), [("alarm.mp3", "sound.not_audio")]);
}

#[test]
fn import_reports_all_problems() {
    let tmp = tempfile::tempdir().expect("tmp");
    let src = tmp.path().join("src");
    let mut images = basic_images();
    images[0].2 = png_tagged(450, 350, 8, 2, 0);
    images.push(("\"body\"", "body.png", png(450, 350)));
    std::fs::create_dir_all(&src).expect("src");
    write_src(
        &src,
        1,
        &images,
        Some(("ogg", "alarm.ogg", b"nope".to_vec())),
    );
    std::fs::remove_file(src.join("body.png")).expect("rm body");
    let r = import(&presets_dir_of(tmp.path()), &src).expect("report");
    assert_eq!(
        problem_codes(&r),
        [
            ("kb_up.png", "asset.not_rgba"),
            ("body.png", "preset.file_missing"),
            ("alarm.ogg", "sound.not_audio"),
        ]
    );
}

#[test]
fn import_reports_missing_required() {
    let tmp = tempfile::tempdir().expect("tmp");
    let src = tmp.path().join("src");
    write_src(&src, 1, &[("\"body\"", "body.png", png(450, 350))], None);
    let r = import(&presets_dir_of(tmp.path()), &src).expect("report");
    assert_eq!(
        problem_codes(&r),
        [
            ("kb_up.png", "preset.missing_required"),
            ("mouse_base.png", "preset.missing_required"),
        ]
    );
}

#[test]
fn import_writes_nothing_on_problem() {
    let tmp = tempfile::tempdir().expect("tmp");
    let src = tmp.path().join("src");
    write_src(&src, 1, &basic_images(), None);
    std::fs::remove_file(src.join("mouse_base.png")).expect("rm");
    let dir = presets_dir_of(tmp.path());
    std::fs::create_dir_all(&dir).expect("presets");
    let r = import(&dir, &src).expect("report");
    assert!(r.preset.is_none() && !r.problems.is_empty());
    assert!(file_names(&dir).is_empty());
}

#[test]
fn import_not_preset_folder() {
    let tmp = tempfile::tempdir().expect("tmp");
    let src = tmp.path().join("empty");
    std::fs::create_dir(&src).expect("dir");
    let err = import(&presets_dir_of(tmp.path()), &src).expect_err("not preset");
    assert!(matches!(err, PresetError::NotPreset));
}

#[test]
fn import_bad_dir() {
    let tmp = tempfile::tempdir().expect("tmp");
    let dir = presets_dir_of(tmp.path());
    let file = tmp.path().join("f.txt");
    std::fs::write(&file, b"x").expect("file");
    for bad in [
        Path::new("relative/dir"),
        file.as_path(),
        tmp.path().join("nope").as_path(),
    ] {
        assert!(
            matches!(import(&dir, bad), Err(PresetError::BadDir)),
            "{bad:?}"
        );
    }
}

#[test]
fn import_ignores_extra_files() {
    let tmp = tempfile::tempdir().expect("tmp");
    let src = tmp.path().join("src");
    write_src(&src, 1, &basic_images(), None);
    std::fs::write(src.join("evil.png"), png(1, 1)).expect("evil");
    std::fs::create_dir(src.join("sub")).expect("sub");
    std::fs::write(src.join("sub").join("x.png"), png(1, 1)).expect("x");
    let dir = presets_dir_of(tmp.path());
    let r = import(&dir, &src).expect("report");
    let id = r.preset.expect("registered").id;
    let expected: BTreeSet<String> = ["preset.json", "kb_up.png", "mouse_base.png"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    assert_eq!(file_names(&dir.join(id)), expected);
    assert_eq!(file_names(&dir).len(), 1);
}

#[test]
fn import_keeps_saved_at() {
    let tmp = tempfile::tempdir().expect("tmp");
    let src = tmp.path().join("src");
    write_src(&src, 42, &basic_images(), None);
    let r = presets::import_from(&presets_dir_of(tmp.path()), &src, 999_999).expect("report");
    let s = r.preset.expect("registered");
    assert_eq!(s.saved_at, 42);
    assert_eq!(s.id, "999999");
    assert_eq!(s.name, "원본");
    assert!(r.problems.is_empty());
}

#[test]
fn import_round_trip_equals_export() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    assets::import_bytes(
        &paths.assets_dir,
        simple(SimpleSlot::Hair),
        &png_tagged(450, 350, 8, 6, 7),
    )
    .expect("hair");
    std::fs::write(paths.assets_dir.join("alarm.ogg"), b"OggS-alarm").expect("alarm");
    let s = save(&paths, "왕복: 테스트?", ID_A).expect("save");

    let out = tmp.path().join("out");
    std::fs::create_dir(&out).expect("out");
    let exported = presets::export_to(&paths.presets_dir(), &s.id, &out).expect("export");
    assert_eq!(exported.folder_name, "왕복_ 테스트_");

    let dest = tmp.path().join("other").join("presets");
    let r = presets::import_from(&dest, &out.join(&exported.folder_name), 555).expect("import");
    let imported = r.preset.expect("registered");
    assert_eq!(
        (imported.saved_at, imported.image_count, imported.has_alarm),
        (ID_A, 3, true)
    );

    let (a, b) = (paths.presets_dir().join(&s.id), dest.join(&imported.id));
    for name in ["kb_up.png", "mouse_base.png", "hair.png", "alarm.ogg"] {
        assert_eq!(
            std::fs::read(a.join(name)).expect("a"),
            std::fs::read(b.join(name)).expect("b"),
            "{name}"
        );
    }
    let json = |d: &Path| -> serde_json::Value {
        serde_json::from_slice(&std::fs::read(d.join("preset.json")).expect("json")).expect("parse")
    };
    assert_eq!(json(&a), json(&b));
}

// ─── 이름·삭제·내보내기 ───────────────────────────────────────────────────

#[test]
fn rename_keeps_id() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let s = save(&paths, "before", ID_A).expect("save");
    let r = presets::rename(&paths.presets_dir(), &s.id, "  after ").expect("rename");
    assert_eq!(
        (r.id.as_str(), r.name.as_str(), r.saved_at),
        (s.id.as_str(), "after", ID_A)
    );
    let listed = presets::list(&paths.presets_dir()).expect("list");
    assert_eq!(listed, [r]);
}

#[test]
fn rename_blank_rejected() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let s = save(&paths, "keep", ID_A).expect("save");
    assert!(matches!(
        presets::rename(&paths.presets_dir(), &s.id, "  "),
        Err(PresetError::InvalidName)
    ));
    assert!(matches!(
        presets::rename(&paths.presets_dir(), "nope", "x"),
        Err(PresetError::NotFound)
    ));
    assert_eq!(
        presets::list(&paths.presets_dir()).expect("list")[0].name,
        "keep"
    );
}

#[test]
fn delete_removes_folder() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let s = save(&paths, "gone", ID_A).expect("save");
    presets::delete(&paths.presets_dir(), &s.id).expect("delete");
    assert!(file_names(&paths.presets_dir()).is_empty());
}

#[test]
fn delete_unknown_not_found() {
    let tmp = tempfile::tempdir().expect("tmp");
    let dir = tmp.path().join("presets");
    std::fs::create_dir(&dir).expect("dir");
    std::fs::create_dir(tmp.path().join("victim")).expect("victim");
    for bad in ["nope", "../victim", "..", "a/b", ""] {
        assert!(
            matches!(presets::delete(&dir, bad), Err(PresetError::NotFound)),
            "{bad}"
        );
    }
    assert!(tmp.path().join("victim").exists());
}

#[test]
fn export_copies_listed_files_only() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let s = save(&paths, "내보내기", ID_A).expect("save");
    std::fs::write(paths.presets_dir().join(&s.id).join("stray.txt"), b"x").expect("stray");
    let out = tmp.path().join("out");
    std::fs::create_dir(&out).expect("out");
    let r = presets::export_to(&paths.presets_dir(), &s.id, &out).expect("export");
    assert_eq!(r.folder_name, "내보내기");
    let expected: BTreeSet<String> = ["preset.json", "kb_up.png", "mouse_base.png"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    assert_eq!(file_names(&out.join("내보내기")), expected);
}

#[test]
fn export_existing_folder_rejected() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let s = save(&paths, "dup", ID_A).expect("save");
    let out = tmp.path().join("out");
    std::fs::create_dir_all(out.join("dup")).expect("existing");
    std::fs::write(out.join("dup").join("mine.txt"), b"keep").expect("mine");
    let err = presets::export_to(&paths.presets_dir(), &s.id, &out).expect_err("exists");
    assert!(matches!(err, PresetError::ExportExists));
    assert_eq!(file_names(&out.join("dup")).len(), 1);
}

#[test]
fn export_bad_dir() {
    let tmp = tempfile::tempdir().expect("tmp");
    let paths = make_paths(tmp.path());
    seed_basic(&paths);
    let s = save(&paths, "x", ID_A).expect("save");
    let file = tmp.path().join("f.txt");
    std::fs::write(&file, b"x").expect("file");
    for bad in [
        Path::new("relative"),
        file.as_path(),
        tmp.path().join("nope").as_path(),
    ] {
        let r = presets::export_to(&paths.presets_dir(), &s.id, bad);
        assert!(matches!(r, Err(PresetError::BadDir)), "{bad:?}");
    }
    let r = presets::export_to(&paths.presets_dir(), "../x", tmp.path());
    assert!(matches!(r, Err(PresetError::NotFound)));
}
