//! manifest.json 관대한 해석(CR-019).
//!
//! [목적] 폐기된 슬롯(예: "slam")처럼 해석되지 않는 항목이 있어도 그 항목만 건너뛰고 나머지를 읽는다.
//!        최상위 구조(JSON 문법, `canvas`, `entries` 배열)가 깨졌으면 기존처럼 `AssetError::Manifest`.
//! [캔버스] 하나라도 건너뛰었으면 남은 항목으로 캔버스를 다시 계산한다(건너뛴 항목이 유일한 캔버스
//!        레이어였을 수 있다).
//! [파일] 건너뛴 항목의 PNG 파일은 지우지 않는다(읽기 경로에 부수 효과 없음).
//! [unsafe] 없음.
//! [테스트] L1~L8(이 파일 `#[cfg(test)]`).

use serde::Deserialize;

use super::{AssetEntry, AssetError, AssetManifest, CanvasSize};

/// manifest.json 원문 모양 — `AssetManifest` 와 같되 항목은 해석 전 JSON 값.
#[derive(Deserialize)]
struct RawManifest {
    canvas: Option<CanvasSize>,
    entries: Vec<serde_json::Value>,
}

/// manifest.json 텍스트 → 매니페스트. 해석되지 않는 항목은 경고 로그 후 건너뛴다.
pub(super) fn parse_manifest(text: &str) -> Result<AssetManifest, AssetError> {
    let raw: RawManifest = serde_json::from_str(text)?;
    let total = raw.entries.len();
    let entries: Vec<AssetEntry> = raw.entries.into_iter().filter_map(parse_entry).collect();
    let mut manifest = AssetManifest {
        canvas: raw.canvas,
        entries,
    };
    if manifest.entries.len() != total {
        manifest.recompute_canvas();
    }
    Ok(manifest)
}

/// 항목 하나 해석. 실패하면 슬롯 값과 원인을 경고 로그로 남기고 None.
///
/// SEC-002(CR-047): `fileName`이 슬롯에서 다시 만든 정규 이름과 다르면 위조·오염으로 보고
/// 건너뛴다. 로그에 `fileName` 값 자체는 넣지 않는다(위조 경로·사용자명 노출 방지).
fn parse_entry(value: serde_json::Value) -> Option<AssetEntry> {
    let slot = value
        .get("slot")
        .map(ToString::to_string)
        .unwrap_or_default();
    match serde_json::from_value::<AssetEntry>(value) {
        Ok(entry) => {
            if entry.file_name != super::stored_file_name(&entry.slot) {
                log::warn!("manifest.json 항목을 건너뜁니다(파일 이름이 슬롯과 다름, slot={slot})");
                return None;
            }
            Some(entry)
        }
        Err(_) => {
            // SEC-201: serde_json 오류 메시지는 항목의 원본 값을 그대로 담을 수 있어(예: 잘못된
            // 타입의 필드 값) 로그에 넣지 않는다. slot 은 이미 문자열화된 값이라 안전하다.
            log::warn!(
                "manifest.json 항목을 건너뜁니다(알 수 없는 슬롯이거나 형식 오류, slot={slot})"
            );
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::super::tests::png_header;
    use super::super::{import, remove, AssetSlot, SimpleSlot};
    use super::*;
    use std::fs;

    /// L1: 옛 `slam` 항목은 건너뛰고 나머지는 순서대로 읽힌다.
    #[test]
    fn old_slam_entry_is_skipped() {
        let json = r##"{
            "canvas": {"width": 450, "height": 350},
            "entries": [
                {"slot":"body","fileName":"body.png","width":450,"height":350,"bytes":10,"url":"u"},
                {"slot":"slam","fileName":"slam.png","width":450,"height":350,"bytes":10,"url":"u"},
                {"slot":"kb_up","fileName":"kb_up.png","width":450,"height":350,"bytes":10,"url":"u"},
                {"slot":{"kind":"kb_down","index":0},"fileName":"kb_down_0.png","width":450,"height":350,"bytes":10,"url":"u"}
            ]
        }"##;
        let m = parse_manifest(json).expect("parse");
        assert_eq!(m.entries.len(), 3);
        assert!(m.entries.iter().all(|e| e.slot.file_key() != "slam"));
        assert_eq!(
            m.entries
                .iter()
                .map(|e| e.slot.file_key())
                .collect::<Vec<_>>(),
            vec![
                "body".to_string(),
                "kb_up".to_string(),
                "kb_down_0".to_string()
            ]
        );
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 450,
                height: 350
            })
        );
    }

    /// L2: `slam`이 유일한 캔버스 레이어였으면 건너뛴 뒤 캔버스가 사라진다.
    #[test]
    fn slam_as_only_canvas_layer_clears_canvas() {
        let json = r##"{
            "canvas": {"width": 450, "height": 350},
            "entries": [
                {"slot":"slam","fileName":"slam.png","width":450,"height":350,"bytes":10,"url":"u"},
                {"slot":"mouse_base","fileName":"mouse_base.png","width":202,"height":154,"bytes":10,"url":"u"}
            ]
        }"##;
        let m = parse_manifest(json).expect("parse");
        assert_eq!(m.entries.len(), 1);
        assert_eq!(m.entries[0].slot.file_key(), "mouse_base");
        assert_eq!(m.canvas, None);
    }

    /// L3: 형식이 잘못된(폭 누락) 항목만 건너뛰고 나머지는 읽힌다.
    #[test]
    fn malformed_entry_is_skipped() {
        let json = r##"{
            "canvas": {"width": 450, "height": 350},
            "entries": [
                {"slot":"body","fileName":"body.png","width":450,"height":350,"bytes":10,"url":"u"},
                {"slot":"idle","fileName":"idle.png","height":350,"bytes":10,"url":"u"}
            ]
        }"##;
        let m = parse_manifest(json).expect("parse");
        assert_eq!(m.entries.len(), 1);
        assert_eq!(m.entries[0].slot.file_key(), "body");
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 450,
                height: 350
            })
        );
    }

    /// L4: 최상위 구조가 깨지면 지금처럼 `Manifest` 오류.
    #[test]
    fn broken_top_level_is_manifest_error() {
        for json in [
            "{ not json",
            r#"{"canvas":null,"entries":{}}"#,
            r#"{"canvas":"x","entries":[]}"#,
        ] {
            let err = parse_manifest(json).expect_err("must fail");
            assert!(matches!(err, AssetError::Manifest(_)));
            assert_eq!(err.code(), "asset.manifest");
        }
    }

    /// L5: 건너뛴 항목이 없으면 파일에 적힌 canvas 값을 그대로 쓴다(재계산하지 않음).
    #[test]
    fn well_formed_manifest_keeps_stored_canvas() {
        let json = r##"{
            "canvas": {"width": 100, "height": 100},
            "entries": [
                {"slot":"body","fileName":"body.png","width":450,"height":350,"bytes":10,"url":"u"},
                {"slot":"idle","fileName":"idle.png","width":450,"height":350,"bytes":10,"url":"u"}
            ]
        }"##;
        let m = parse_manifest(json).expect("parse");
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 100,
                height: 100
            })
        );
    }

    /// L6: `"slam"` 문자열은 더 이상 유효한 슬롯이 아니다.
    #[test]
    fn slam_string_is_not_a_slot() {
        assert!(serde_json::from_str::<AssetSlot>("\"slam\"").is_err());
        assert!(serde_json::from_str::<AssetSlot>("\"idle\"").is_ok());
        assert!(serde_json::from_str::<AssetSlot>("\"rest\"").is_ok());
    }

    /// L7: 옛 `slam` 항목이 있는 폴더에서 로드·등록이 성공하고, `slam.png` 파일은 남는다.
    #[test]
    fn import_after_old_slam_drops_entry_keeps_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        let assets = dir.path().join("assets");
        fs::create_dir_all(&assets).expect("mkdir");
        fs::write(assets.join("body.png"), png_header(450, 350, 8, 6)).expect("write body png");
        fs::write(assets.join("slam.png"), png_header(450, 350, 8, 6)).expect("write slam png");
        let manifest_json = r##"{
            "canvas": {"width": 450, "height": 350},
            "entries": [
                {"slot":"body","fileName":"body.png","width":450,"height":350,"bytes":10,"url":"u"},
                {"slot":"slam","fileName":"slam.png","width":450,"height":350,"bytes":10,"url":"u"}
            ]
        }"##;
        fs::write(assets.join("manifest.json"), manifest_json).expect("write manifest");

        let loaded = super::super::load_manifest(&assets).expect("load");
        assert_eq!(loaded.entries.len(), 1);

        let src = dir.path().join("kb_up.png");
        fs::write(&src, png_header(450, 350, 8, 6)).expect("write src");
        import(&assets, AssetSlot::Simple(SimpleSlot::KbUp), &src).expect("import");

        let text = fs::read_to_string(assets.join("manifest.json")).expect("read back");
        assert!(!text.contains("\"slam\""));
        assert!(assets.join("slam.png").exists());
    }

    /// L8: 옛 `slam` 항목이 있는 폴더에서 삭제도 성공한다.
    #[test]
    fn remove_works_with_old_slam_entry() {
        let dir = tempfile::tempdir().expect("tempdir");
        let assets = dir.path().join("assets");
        fs::create_dir_all(&assets).expect("mkdir");
        fs::write(assets.join("body.png"), png_header(450, 350, 8, 6)).expect("write body png");
        fs::write(assets.join("slam.png"), png_header(450, 350, 8, 6)).expect("write slam png");
        let manifest_json = r##"{
            "canvas": {"width": 450, "height": 350},
            "entries": [
                {"slot":"body","fileName":"body.png","width":450,"height":350,"bytes":10,"url":"u"},
                {"slot":"slam","fileName":"slam.png","width":450,"height":350,"bytes":10,"url":"u"}
            ]
        }"##;
        fs::write(assets.join("manifest.json"), manifest_json).expect("write manifest");

        let m = remove(&assets, AssetSlot::Simple(SimpleSlot::Body)).expect("remove");
        assert!(m.entries.is_empty());
        assert_eq!(m.canvas, None);
        let text = fs::read_to_string(assets.join("manifest.json")).expect("read back");
        assert!(!text.contains("\"slam\""));
    }
}
