//! [목적] CR-047 SEC-002(manifest `fileName` 불신)·SEC-003(가져오기 크기 선검사·상한 읽기)
//!        테스트. `manifest_load::parse_manifest`·`remove`·`compute_hand_anchor`·`import`을
//!        대상으로 한다.
//! [공개 API] 없음(테스트 전용 모듈).
//! [스레드] 없음.
//! [unsafe] 없음.
//! [에러] 없음(테스트 전용).
//! [설정] 없음.
//! [테스트] FN1~FN7, RC1~RC6 — 설계 `doc/200_설계/core/assets.md` §3.14.6.

use std::fs;

use super::tests::png_header;
use super::*;

fn manifest_json(entries_json: &str) -> String {
    format!(r##"{{"canvas": {{"width": 450, "height": 350}}, "entries": [{entries_json}]}}"##)
}

/// FN1: fileName 이 `..` 로 슬롯 밖을 가리키는 항목은 건너뛴다.
#[test]
fn fn1_traversal_file_name_is_skipped() {
    let json = manifest_json(
        r##"{"slot":"body","fileName":"..\\..\\evil.png","width":450,"height":350,"bytes":10,"url":"u"},
            {"slot":"kb_up","fileName":"kb_up.png","width":450,"height":350,"bytes":10,"url":"u"}"##,
    );
    let m = manifest_load::parse_manifest(&json).expect("parse");
    assert_eq!(m.entries.len(), 1);
    assert_eq!(m.entries[0].slot.file_key(), "kb_up");
    assert_eq!(
        m.canvas,
        Some(CanvasSize {
            width: 450,
            height: 350
        })
    );
}

/// FN2: 절대 경로 fileName 도 건너뛴다.
#[test]
fn fn2_absolute_path_file_name_is_skipped() {
    let json = manifest_json(
        r##"{"slot":"body","fileName":"C:\\Windows\\win.ini","width":450,"height":350,"bytes":10,"url":"u"}"##,
    );
    let m = manifest_load::parse_manifest(&json).expect("parse");
    assert!(m.entries.is_empty());
}

/// FN3: 정규 이름(`kb_down_3.png`)인 순번 슬롯 항목은 그대로 유지된다.
#[test]
fn fn3_normal_indexed_slot_is_kept() {
    let json = manifest_json(
        r##"{"slot":{"kind":"kb_down","index":3},"fileName":"kb_down_3.png","width":450,"height":350,"bytes":10,"url":"u"}"##,
    );
    let m = manifest_load::parse_manifest(&json).expect("parse");
    assert_eq!(m.entries.len(), 1);
    assert_eq!(m.entries[0].slot, AssetSlot::kb_down(3));
}

/// FN4: 대소문자가 다른 fileName(`Body.png`)도 엄격 비교로 건너뛴다.
#[test]
fn fn4_case_mismatch_file_name_is_skipped() {
    let json = manifest_json(
        r##"{"slot":"body","fileName":"Body.png","width":450,"height":350,"bytes":10,"url":"u"}"##,
    );
    let m = manifest_load::parse_manifest(&json).expect("parse");
    assert!(m.entries.is_empty());
}

/// FN5: `remove`는 위조된 fileName 대신 슬롯에서 다시 만든 정규 이름만 지운다.
#[test]
fn fn5_remove_never_touches_path_outside_stored_file_name() {
    let dir = tempfile::tempdir().expect("tempdir");
    let assets = dir.path().join("assets");
    fs::create_dir_all(&assets).expect("mkdir");
    let outside = dir.path().join("outside.png");
    fs::write(&outside, b"keep me").expect("write outside");
    let manifest_json = manifest_json(
        r##"{"slot":"body","fileName":"../outside.png","width":450,"height":350,"bytes":10,"url":"u"}"##,
    );
    fs::write(assets.join(MANIFEST_FILE), &manifest_json).expect("write manifest");

    let result = remove(&assets, AssetSlot::Simple(SimpleSlot::Body));
    assert!(matches!(result, Err(AssetError::NotFound(_))));
    assert!(outside.exists(), "바깥 파일은 그대로 있어야 한다");
}

/// FN6: `compute_hand_anchor`는 위조된 fileName(`../x.png`)을 쓰지 않고 슬롯에서 다시 만든
/// 정규 경로(`mouse_base.png`)만 읽는다. 둘 다 없으므로 `Io` 오류가 나야 정규 경로만
/// 시도했다는 증거다(위조 경로를 읽었다면 다른 결과가 나왔을 것).
#[test]
fn fn6_hand_anchor_reads_only_normal_path() {
    let dir = tempfile::tempdir().expect("tempdir");
    let assets = dir.path().join("assets");
    fs::create_dir_all(&assets).expect("mkdir");
    let manifest = AssetManifest {
        canvas: None,
        entries: vec![AssetEntry {
            slot: AssetSlot::Simple(SimpleSlot::MouseBase),
            file_name: "../x.png".to_string(),
            width: 1,
            height: 1,
            bytes: 10,
            url: "u".to_string(),
        }],
    };
    // `../x.png` 는 존재하지 않는다. 정규 경로(`mouse_base.png`)도 없다 → Io 오류가 나야
    // "정규 경로만 시도했다"는 증거다(위조 경로였다면 다른 오류거나 성공했을 것).
    let result = compute_hand_anchor(
        &assets,
        &manifest,
        crate::settings::Point { x: 0.0, y: 0.0 },
        crate::settings::Point { x: 0.0, y: 0.0 },
    );
    assert!(matches!(result, Err(AssetError::Io(_))));
    assert!(!dir.path().join("x.png").exists());
}

/// FN7: import → remove 왕복은 기존과 같고, manifest.json 임시 파일이 남지 않는다.
#[test]
fn fn7_import_remove_round_trip_leaves_no_tmp() {
    let dir = tempfile::tempdir().expect("tempdir");
    let src = dir.path().join("src.png");
    fs::write(&src, png_header(450, 350, 8, 6)).expect("write");
    let assets = dir.path().join("assets");

    import(&assets, AssetSlot::Simple(SimpleSlot::Body), &src).expect("import");
    remove(&assets, AssetSlot::Simple(SimpleSlot::Body)).expect("remove");

    let has_tmp = fs::read_dir(&assets)
        .expect("read_dir")
        .filter_map(|e| e.ok())
        .any(|e| e.file_name().to_string_lossy().contains(".tmp"));
    assert!(!has_tmp);
}

/// RC1: 원본이 1MB + 1바이트면 PNG 여부와 무관하게 `TooManyBytes`.
#[test]
fn rc1_over_1mb_is_rejected_before_png_check() {
    let dir = tempfile::tempdir().expect("tempdir");
    let mut bytes = png_header(1, 1, 8, 6);
    bytes.resize((ASSET_MAX_BYTES + 1) as usize, 0);
    let src = dir.path().join("big.png");
    fs::write(&src, &bytes).expect("write");
    let assets = dir.path().join("assets");

    match import(&assets, AssetSlot::Simple(SimpleSlot::Body), &src) {
        Err(AssetError::TooManyBytes { bytes }) => assert_eq!(bytes, ASSET_MAX_BYTES + 1),
        other => panic!("TooManyBytes 를 기대했으나 {other:?}"),
    }
    assert!(!assets.exists() || fs::read_dir(&assets).expect("read_dir").next().is_none());
}

/// RC2: 정확히 1MB, 정상 헤더는 통과한다.
#[test]
fn rc2_exactly_1mb_is_ok() {
    let dir = tempfile::tempdir().expect("tempdir");
    let mut bytes = png_header(900, 700, 8, 6);
    bytes.resize(ASSET_MAX_BYTES as usize, 0);
    let src = dir.path().join("exact.png");
    fs::write(&src, &bytes).expect("write");
    let assets = dir.path().join("assets");

    let m = import(&assets, AssetSlot::Simple(SimpleSlot::Body), &src).expect("import ok");
    assert_eq!(m.entries[0].bytes, ASSET_MAX_BYTES);
}

/// RC3: `read_capped`는 상한(`max + 1`)까지만 읽는다.
#[test]
fn rc3_read_capped_stops_at_limit() {
    let dir = tempfile::tempdir().expect("tempdir");
    let src = dir.path().join("three_mb.bin");
    fs::write(&src, vec![0u8; 3 * 1024 * 1024]).expect("write");

    let result = read_capped(&src, ASSET_MAX_BYTES);
    match result {
        Err(AssetError::TooManyBytes { bytes }) => assert_eq!(bytes, ASSET_MAX_BYTES + 1),
        other => panic!("TooManyBytes 를 기대했으나 {other:?}"),
    }
}

/// RC4: 1MB 이하인데 PNG 가 아니면 지금처럼 `NotPng`(순서 불변).
#[test]
fn rc4_small_non_png_is_not_png() {
    let dir = tempfile::tempdir().expect("tempdir");
    let src = dir.path().join("not_png.bin");
    fs::write(&src, vec![0u8; 100]).expect("write");
    let assets = dir.path().join("assets");

    let err = import(&assets, AssetSlot::Simple(SimpleSlot::Body), &src).unwrap_err();
    assert!(matches!(err, AssetError::NotPng));
}

/// RC5: 2MB 비 PNG 는 `NotPng` 가 아니라 `TooManyBytes`(순서 변화 고정, D47-2).
#[test]
fn rc5_large_non_png_is_too_many_bytes_not_not_png() {
    let dir = tempfile::tempdir().expect("tempdir");
    let src = dir.path().join("large_non_png.bin");
    fs::write(&src, vec![0u8; 2 * 1024 * 1024]).expect("write");
    let assets = dir.path().join("assets");

    let err = import(&assets, AssetSlot::Simple(SimpleSlot::Body), &src).unwrap_err();
    assert!(matches!(
        err,
        AssetError::TooManyBytes {
            bytes
        } if bytes == 2 * 1024 * 1024
    ));
}

/// RC6: 없는 경로는 `Io`.
#[test]
fn rc6_missing_source_is_io_error() {
    let dir = tempfile::tempdir().expect("tempdir");
    let src = dir.path().join("missing.png");
    let assets = dir.path().join("assets");
    let err = import(&assets, AssetSlot::Simple(SimpleSlot::Body), &src).unwrap_err();
    assert!(matches!(err, AssetError::Io(_)));
}
