//! CR-035 내장 기본 이미지 세트 — 시딩·복원·내보내기 통합 테스트(D1~D17) + 실측 M1.
//! 0.4.0(사용자 확정 배포 세트): 6장(hair 제외, kb_down_0 제거), 캔버스 3장(kb_up·background·
//! pomo_char) 900×700, mouse_base 168×151, pen_up·pen_down_0 119×196.
//! 설계: `doc/200_설계/core/assets.md` §3.16.
use std::fs;
use std::path::PathBuf;

use kuro_keyviewer_lib::assets::defaults::{
    default_bytes, has_default, seed_if_empty, DefaultAsset, SeedOutcome, SeedSkip, DEFAULT_ASSETS,
};
use kuro_keyviewer_lib::assets::export::export_defaults;
use kuro_keyviewer_lib::assets::{
    self, import_bytes, load_manifest, parse_png_header, validate, AssetError, AssetSlot,
    CanvasSize, SimpleSlot, ASSET_MAX_BYTES,
};
use kuro_keyviewer_lib::settings::default_mouse;

const PNG_SIGNATURE: [u8; 8] = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];

/// 시그니처 + IHDR 청크(CRC 는 검사하지 않으므로 0). `tag`는 내장 바이트와 구별하기 위한 여분 바이트.
fn fake_png(w: u32, h: u32, tag: u8) -> Vec<u8> {
    let mut v = PNG_SIGNATURE.to_vec();
    v.extend_from_slice(&13u32.to_be_bytes());
    v.extend_from_slice(b"IHDR");
    v.extend_from_slice(&w.to_be_bytes());
    v.extend_from_slice(&h.to_be_bytes());
    v.extend_from_slice(&[8, 6, 0, 0, 0]);
    v.extend_from_slice(&[0, 0, 0, 0]);
    v.push(tag);
    v
}

fn expected_file_keys() -> Vec<&'static str> {
    vec![
        "kb_up",
        "background",
        "pomo_char",
        "mouse_base",
        "pen_up",
        "pen_down_0",
    ]
}

/// D1: 슬롯 집합·순서(0.4.0, 6장 — hair·kb_down_0 제외).
#[test]
fn default_assets_slot_set() {
    let keys: Vec<String> = DEFAULT_ASSETS.iter().map(|d| d.slot.file_key()).collect();
    assert_eq!(keys.len(), 6);
    let mut sorted = keys.clone();
    sorted.sort();
    sorted.dedup();
    assert_eq!(sorted.len(), 6, "중복 없음");
    let expected = expected_file_keys();
    assert_eq!(keys, expected);
    assert_eq!(keys.first().map(String::as_str), Some("kb_up"));
    assert_eq!(
        &keys[keys.len() - 3..],
        &["mouse_base", "pen_up", "pen_down_0"]
    );
    assert!(!keys.contains(&"kb_down_0".to_string()));
    assert!(!keys.contains(&"hair".to_string()));
}

/// D2: 전부 검증 통과. 캔버스 3장(kb_up·background·pomo_char) 900×700, mouse_base·펜 2장은
/// 실측 크기(0.4.0 사용자 확정 배포 세트 교체).
#[test]
fn default_assets_pass_validation() {
    for d in DEFAULT_ASSETS.iter() {
        let info = parse_png_header(d.bytes).expect("header");
        assert!(d.bytes.len() as u64 <= ASSET_MAX_BYTES);
        validate(&info, d.bytes.len() as u64, &d.slot, None).expect("validate");
        let key = d.slot.file_key();
        if key == "mouse_base" {
            assert_eq!((info.width, info.height), (168, 151));
        } else if key == "pen_up" || key == "pen_down_0" {
            assert_eq!((info.width, info.height), (119, 196));
        } else {
            assert_eq!((info.width, info.height), (900, 700));
        }
    }
}

/// D3: has_default 규칙(0.4.0) — pomo_char 는 내장 기본 유지, hair·kb_down_0 은 없다.
#[test]
fn has_default_rules() {
    assert!(has_default(&AssetSlot::pen_down(0)));
    assert!(!has_default(&AssetSlot::Simple(SimpleSlot::Hair)));
    assert!(has_default(&AssetSlot::Simple(SimpleSlot::PomoChar)));
    assert!(!has_default(&AssetSlot::kb_down(0)));
    assert!(!has_default(&AssetSlot::kb_down(1)));
    assert!(!has_default(&AssetSlot::pen_down(1)));
    assert!(!has_default(&AssetSlot::Simple(SimpleSlot::MouseLeft)));
    assert!(!has_default(&AssetSlot::Simple(SimpleSlot::MouseRight)));
    assert!(!has_default(&AssetSlot::Simple(SimpleSlot::PenKeySpace)));
    assert!(!has_default(&AssetSlot::Simple(SimpleSlot::Body)));
    assert!(!has_default(&AssetSlot::Simple(SimpleSlot::Idle)));
    assert!(!has_default(&AssetSlot::Simple(SimpleSlot::Rest)));
    assert!(!has_default(&AssetSlot::Simple(SimpleSlot::KeySpace)));
    assert!(!has_default(&AssetSlot::Simple(SimpleSlot::PomoBubble)));
}

/// D4: 빈 tempdir에 시딩.
#[test]
fn seed_fresh_dir() {
    let dir = tempfile::tempdir().expect("tempdir");
    let started = std::time::Instant::now();
    let outcome = seed_if_empty(dir.path());
    eprintln!("seed_fresh_dir: {} ms", started.elapsed().as_millis());
    assert_eq!(
        outcome,
        SeedOutcome::Seeded {
            count: 6,
            failed: vec![]
        }
    );
    let m = load_manifest(dir.path()).expect("load");
    assert_eq!(m.entries.len(), 6);
    assert_eq!(
        m.canvas,
        Some(CanvasSize {
            width: 900,
            height: 700
        })
    );
    assert!(dir.path().join("pomo_char.png").exists());
    assert!(!dir.path().join("hair.png").exists());
    assert!(!dir.path().join("kb_down_0.png").exists());
}

/// D5: 매니페스트에 항목이 있으면 건너뛴다.
#[test]
fn seed_skips_when_not_empty() {
    let dir = tempfile::tempdir().expect("tempdir");
    import_bytes(
        dir.path(),
        AssetSlot::Simple(SimpleSlot::Body),
        &fake_png(900, 700, 1),
    )
    .expect("import");
    let body_bytes_before = fs::read(dir.path().join("body.png")).expect("read");
    let manifest_before = fs::read_to_string(dir.path().join("manifest.json")).expect("read");

    let outcome = seed_if_empty(dir.path());
    assert_eq!(outcome, SeedOutcome::Skipped(SeedSkip::NotEmpty));
    assert_eq!(
        fs::read(dir.path().join("body.png")).expect("read"),
        body_bytes_before
    );
    assert_eq!(
        fs::read_to_string(dir.path().join("manifest.json")).expect("read"),
        manifest_before
    );
    assert!(!dir.path().join("kb_up.png").exists());
}

/// D6: 최상위 구조가 손상된 매니페스트는 건너뛴다.
#[test]
fn seed_skips_corrupt_manifest() {
    let dir = tempfile::tempdir().expect("tempdir");
    fs::create_dir_all(dir.path()).expect("mkdir");
    fs::write(dir.path().join("manifest.json"), "{ not json").expect("write");

    let outcome = seed_if_empty(dir.path());
    assert_eq!(outcome, SeedOutcome::Skipped(SeedSkip::ManifestUnreadable));
    assert_eq!(
        fs::read_to_string(dir.path().join("manifest.json")).expect("read"),
        "{ not json"
    );
    assert!(!dir.path().join("kb_up.png").exists());
}

/// D7: 매니페스트 없이 파일만 있으면 건너뛴다(사용자 파일 보호).
#[test]
fn seed_skips_orphan_files() {
    let dir = tempfile::tempdir().expect("tempdir");
    fs::create_dir_all(dir.path()).expect("mkdir");
    fs::write(dir.path().join("kb_up.png"), b"orphan-bytes").expect("write");

    let outcome = seed_if_empty(dir.path());
    assert_eq!(outcome, SeedOutcome::Skipped(SeedSkip::FilesPresent));
    assert_eq!(
        fs::read(dir.path().join("kb_up.png")).expect("read"),
        b"orphan-bytes"
    );
    assert!(!dir.path().join("manifest.json").exists());
}

/// D8: 시딩을 두 번 하면 두 번째는 아무 일도 하지 않는다.
#[test]
fn seed_twice_is_noop() {
    let dir = tempfile::tempdir().expect("tempdir");
    seed_if_empty(dir.path());
    let outcome = seed_if_empty(dir.path());
    assert_eq!(outcome, SeedOutcome::Skipped(SeedSkip::NotEmpty));
}

/// D9: 기본값 복원은 사용자 그림을 내장 기본으로 되돌린다.
#[test]
fn restore_replaces_user_image() {
    let dir = tempfile::tempdir().expect("tempdir");
    let kb_up = AssetSlot::Simple(SimpleSlot::KbUp);
    import_bytes(dir.path(), kb_up, &fake_png(900, 700, 7)).expect("import");

    let m = assets::defaults::restore_default(dir.path(), kb_up).expect("restore");
    let expected = default_bytes(&kb_up).expect("default bytes");
    assert_eq!(
        fs::read(dir.path().join("kb_up.png")).expect("read"),
        expected
    );
    let entry = m.find(&kb_up).expect("entry");
    assert_eq!(entry.bytes, expected.len() as u64);
}

/// D10: 내장 기본이 없는 슬롯은 NoDefault, 매니페스트를 건드리지 않는다.
#[test]
fn restore_no_default() {
    let dir = tempfile::tempdir().expect("tempdir");
    import_bytes(
        dir.path(),
        AssetSlot::Simple(SimpleSlot::Body),
        &fake_png(900, 700, 1),
    )
    .expect("import");
    let manifest_before = fs::read_to_string(dir.path().join("manifest.json")).expect("read");

    let err =
        assets::defaults::restore_default(dir.path(), AssetSlot::Simple(SimpleSlot::MouseLeft))
            .unwrap_err();
    assert_eq!(err.code(), "asset.no_default");
    assert_eq!(
        fs::read_to_string(dir.path().join("manifest.json")).expect("read"),
        manifest_before
    );
}

/// D11: 캔버스 불일치면 사용자 그림을 그대로 둔다.
#[test]
fn restore_canvas_mismatch_keeps_user() {
    let dir = tempfile::tempdir().expect("tempdir");
    let kb_up = AssetSlot::Simple(SimpleSlot::KbUp);
    let body = AssetSlot::Simple(SimpleSlot::Body);
    import_bytes(dir.path(), kb_up, &fake_png(450, 350, 1)).expect("import kb_up");
    import_bytes(dir.path(), body, &fake_png(450, 350, 2)).expect("import body");
    let kb_up_bytes_before = fs::read(dir.path().join("kb_up.png")).expect("read");
    let manifest_before = fs::read_to_string(dir.path().join("manifest.json")).expect("read");

    let err = assets::defaults::restore_default(dir.path(), kb_up).unwrap_err();
    assert_eq!(err.code(), "asset.canvas_mismatch");
    assert_eq!(
        fs::read(dir.path().join("kb_up.png")).expect("read"),
        kb_up_bytes_before
    );
    assert_eq!(
        fs::read_to_string(dir.path().join("manifest.json")).expect("read"),
        manifest_before
    );
}

/// D12: 빈 폴더에 내보내기.
#[test]
fn export_fresh_dir() {
    let dir = tempfile::tempdir().expect("tempdir");
    let started = std::time::Instant::now();
    let report = export_defaults(dir.path(), false).expect("export");
    eprintln!("export_fresh_dir: {} ms", started.elapsed().as_millis());

    let expected_names: Vec<String> = DEFAULT_ASSETS
        .iter()
        .map(|d: &DefaultAsset| format!("{}.png", d.slot.file_key()))
        .collect();
    assert_eq!(report.written, expected_names);
    assert!(report.conflicts.is_empty());
    assert!(report.failed.is_empty());
    for d in DEFAULT_ASSETS.iter() {
        let name = format!("{}.png", d.slot.file_key());
        assert_eq!(fs::read(dir.path().join(&name)).expect("read"), d.bytes);
        assert!(!dir.path().join(format!(".{name}.kuro-tmp")).exists());
    }
}

/// D13: 충돌 미리 검사 — overwrite=false면 아무것도 쓰지 않는다.
#[test]
fn export_conflict_no_overwrite() {
    let dir = tempfile::tempdir().expect("tempdir");
    fs::write(dir.path().join("kb_up.png"), b"existing").expect("write");

    let report = export_defaults(dir.path(), false).expect("export");
    assert!(report.written.is_empty());
    assert_eq!(report.conflicts, vec!["kb_up.png".to_string()]);
    assert!(report.failed.is_empty());
    assert_eq!(
        fs::read(dir.path().join("kb_up.png")).expect("read"),
        b"existing"
    );
    for d in DEFAULT_ASSETS.iter() {
        let name = format!("{}.png", d.slot.file_key());
        if name != "kb_up.png" {
            assert!(!dir.path().join(&name).exists());
        }
    }
}

/// D14: overwrite=true면 충돌해도 전부 쓴다.
#[test]
fn export_conflict_overwrite() {
    let dir = tempfile::tempdir().expect("tempdir");
    fs::write(dir.path().join("kb_up.png"), b"existing").expect("write");

    let report = export_defaults(dir.path(), true).expect("export");
    assert_eq!(report.written.len(), 6);
    assert_eq!(report.conflicts, vec!["kb_up.png".to_string()]);
    let kb_up_default = default_bytes(&AssetSlot::Simple(SimpleSlot::KbUp)).expect("default");
    assert_eq!(
        fs::read(dir.path().join("kb_up.png")).expect("read"),
        kb_up_default
    );
}

/// D15: 부분 실패 — 파일명과 같은 폴더가 있으면 그 한 건만 실패한다.
#[test]
fn export_partial_failure() {
    let dir = tempfile::tempdir().expect("tempdir");
    fs::create_dir_all(dir.path().join("kb_up.png")).expect("mkdir as file name");

    let report = export_defaults(dir.path(), true).expect("export");
    assert_eq!(
        report.failed,
        vec![kuro_keyviewer_lib::assets::export::ExportFailure {
            file_name: "kb_up.png".to_string(),
            code: "asset.io",
        }]
    );
    assert_eq!(report.written.len(), 5);
    assert!(!dir.path().join(".kb_up.png.kuro-tmp").exists());
}

/// D16: 잘못된 대상 폴더는 전부 ExportDir, 경로가 메시지에 없다.
#[test]
fn export_bad_dir() {
    let dir = tempfile::tempdir().expect("tempdir");
    let missing = dir.path().join("nope");
    let relative = PathBuf::from("relative_dir");
    let file_path = dir.path().join("a-file");
    fs::write(&file_path, b"x").expect("write");

    for bad in [missing, relative, file_path] {
        let err = export_defaults(&bad, false).unwrap_err();
        assert_eq!(err.code(), "asset.export_dir");
        assert!(!err.to_string().contains(&bad.display().to_string()));
    }
}

/// D17: 에러 코드.
#[test]
fn error_codes() {
    assert_eq!(
        AssetError::NoDefault("kb_up".to_string()).code(),
        "asset.no_default"
    );
    assert_eq!(AssetError::ExportDir.code(), "asset.export_dir");
}

/// D-H1 (0.4.0 교체, 다시 뒤집기): 헤어 슬롯은 내장 기본이 없다 — `has_default` 거짓,
/// `default_bytes` `None`, 빈 tempdir에 `restore_default(Hair)` → `asset.no_default`,
/// 파일·매니페스트 생기지 않음.
#[test]
fn hair_slot_has_no_default() {
    let hair = AssetSlot::Simple(SimpleSlot::Hair);

    assert!(!has_default(&hair));
    assert!(default_bytes(&hair).is_none());

    let dir = tempfile::tempdir().expect("tempdir");
    let err = assets::defaults::restore_default(dir.path(), hair).unwrap_err();
    assert_eq!(err.code(), "asset.no_default");
    assert!(!dir.path().join("hair.png").exists());
    assert!(!dir.path().join("manifest.json").exists());
}

/// D-H2 (0.4.0 교체, 다시 뒤집기): 헤어는 `DEFAULT_ASSETS`(6장)에 없어 시딩 대상이 아니다.
#[test]
fn seed_does_not_create_hair() {
    let dir = tempfile::tempdir().expect("tempdir");
    let outcome = seed_if_empty(dir.path());
    assert_eq!(
        outcome,
        SeedOutcome::Seeded {
            count: 6,
            failed: vec![]
        }
    );
    let m = load_manifest(dir.path()).expect("load");
    assert!(m.find(&AssetSlot::Simple(SimpleSlot::Hair)).is_none());
    assert!(!dir.path().join("hair.png").exists());
}

/// D53-2: kb_down_0 은 이제 내장 기본이 없다 — `has_default` 거짓, `default_bytes` `None`,
/// 빈 tempdir에 `restore_default(kb_down_0)` → `asset.no_default`, 파일·매니페스트 생기지 않음.
#[test]
fn kb_down_0_has_no_default() {
    let kb_down_0 = AssetSlot::kb_down(0);
    assert!(!has_default(&kb_down_0));
    assert!(default_bytes(&kb_down_0).is_none());

    let dir = tempfile::tempdir().expect("tempdir");
    let err = assets::defaults::restore_default(dir.path(), kb_down_0).unwrap_err();
    assert_eq!(err.code(), "asset.no_default");
    assert!(!dir.path().join("kb_down_0.png").exists());
    assert!(!dir.path().join("manifest.json").exists());
}

/// M1 (실측, 좌표 단언 없음): 시딩된 기본 mouse_base로 손 기준점을 계산할 수 있다.
/// `cargo test --test default_assets -- --nocapture`로 좌표를 완료 보고에 싣는다.
#[test]
fn measure_default_hand_anchor() {
    let dir = tempfile::tempdir().expect("tempdir");
    seed_if_empty(dir.path());
    let m = load_manifest(dir.path()).expect("load");
    let mouse = default_mouse();

    let anchor = assets::compute_hand_anchor(dir.path(), &m, mouse.shoulder, mouse.part_pos)
        .expect("compute");
    eprintln!("measure_default_hand_anchor: {anchor:?}");
    assert!(anchor.is_some());
}

/// D-PM1 (CR-045 → CR-053 나눔): pomo_char 는 내장 기본이 생겼고(참·시딩·복원 Ok),
/// pomo_bubble 은 여전히 내장 기본이 없다(거짓·`NoDefault`·파일 안 생김).
#[test]
fn pomo_char_has_builtin_default() {
    let slot = AssetSlot::Simple(SimpleSlot::PomoChar);
    assert!(has_default(&slot));
    assert!(default_bytes(&slot).is_some());
    assert!(DEFAULT_ASSETS
        .iter()
        .any(|d| d.slot.file_key() == slot.file_key()));

    let dir = tempfile::tempdir().expect("tempdir");
    let m = assets::defaults::restore_default(dir.path(), slot).expect("restore");
    assert!(m.find(&slot).is_some());
    assert!(dir.path().join("pomo_char.png").exists());
}

/// D-PM1b: pomo_bubble 은 내장 기본이 없다 — `has_default`/`default_bytes`는 None,
/// `DEFAULT_ASSETS`에 같은 file_key 항목 없음, `restore_default`는 `asset.no_default`이고
/// 파일·매니페스트를 만들지 않는다.
#[test]
fn pomo_bubble_has_no_builtin_default() {
    let slot = AssetSlot::Simple(SimpleSlot::PomoBubble);
    assert!(!has_default(&slot));
    assert!(default_bytes(&slot).is_none());
    assert!(!DEFAULT_ASSETS
        .iter()
        .any(|d| d.slot.file_key() == slot.file_key()));

    let dir = tempfile::tempdir().expect("tempdir");
    let err = assets::defaults::restore_default(dir.path(), slot).unwrap_err();
    assert_eq!(err.code(), "asset.no_default");
    assert!(!dir.path().join(format!("{}.png", slot.file_key())).exists());
    assert!(!dir.path().join("manifest.json").exists());
}

/// S-T11 (CR-045): 타이머 글자 위치 상한과 캔버스 최대 크기 상수는 같은 값이다.
#[test]
fn timer_text_pos_max_matches_canvas_max() {
    use kuro_keyviewer_lib::assets::{CANVAS_MAX_HEIGHT, CANVAS_MAX_WIDTH};
    use kuro_keyviewer_lib::settings::timer::{TEXT_POS_MAX_X, TEXT_POS_MAX_Y};

    assert_eq!(TEXT_POS_MAX_X, CANVAS_MAX_WIDTH as f64);
    assert_eq!(TEXT_POS_MAX_Y, CANVAS_MAX_HEIGHT as f64);
}
