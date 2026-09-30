//! 프리셋 카드 미리보기 재료(PS-09 개정, CR-065).
//!
//! [목적] 목록 카드가 그림을 합성해 보이도록 프리셋 폴더의 PNG마다 URL·크기를, `settings.mouse`에서 팔·펜 손
//!        위치를 모아 준다. 합성(겹침 순서·슬롯 선택·축소)은 ui 몫 — 여기서는 재료만 만든다.
//! [공개 API] `PresetPreview`·`PresetPreviewLayer`(Serialize·camelCase, mod.rs 재노출). `preview`는 비공개.
//! [스레드] 없음. 호출자 스레드에서 동기 실행.
//! [unsafe] 없음.
//! [에러] 없음 — 그림별 실패는 그 그림만 뺀다(경로 없는 경고 로그).
//! [설정] `PresetFile.settings.mouse`의 `part_pos`·`pen_pos`만 읽는다. `mouse`가 없으면 `default_mouse()`.
//! [테스트] `tests/presets.rs`의 `preview_*`·`list_summary_includes_preview`·`rename_keeps_preview_urls`·
//!        `import_summary_has_preview`.

use std::io::Read;
use std::path::Path;

use serde::Serialize;

use super::format::PresetFile;
use super::scan::is_plain_file;
use crate::assets::{
    parse_png_header, stored_file_name, versioned_asset_url, AssetSlot, CanvasSize,
};
use crate::settings::{default_mouse, Point};

/// PNG 시그니처 8 + IHDR 청크(길이 4·타입 4·너비 4·높이 4·깊이·색 유형) = 헤더 파싱에 필요한 앞 29바이트.
const HEADER_BYTES: u64 = 29;

/// 미리보기 재료 한 장 = 프리셋 폴더의 그림 1장. `url`은 불투명 문자열(그대로 `<img src>`).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetPreviewLayer {
    pub slot: AssetSlot,
    pub url: String,
    pub width: u32,
    pub height: u32,
}

/// 카드 미리보기 재료. 겹침·슬롯 선택·축소는 ui 몫.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetPreview {
    pub canvas: Option<CanvasSize>,
    pub layers: Vec<PresetPreviewLayer>,
    pub part_pos: Point,
    pub pen_pos: Option<Point>,
}

/// 파일 앞 29바이트만 읽어 (너비, 높이). 일반 파일이 아니거나 헤더가 깨졌으면 `None`.
fn read_size(path: &Path) -> Option<(u32, u32)> {
    if !matches!(is_plain_file(path), Ok(true)) {
        return None;
    }
    let mut buf = Vec::with_capacity(HEADER_BYTES as usize);
    std::fs::File::open(path)
        .ok()?
        .take(HEADER_BYTES)
        .read_to_end(&mut buf)
        .ok()?;
    let info = parse_png_header(&buf).ok()?;
    Some((info.width, info.height))
}

/// `preset_dir`(정규 id 폴더)의 그림들로 미리보기 재료를 만든다. 에러를 내지 않는다.
pub(super) fn preview(preset_dir: &Path, id: &str, file: &PresetFile) -> PresetPreview {
    let mut layers = Vec::with_capacity(file.images.len());
    for slot in &file.images {
        let path = preset_dir.join(stored_file_name(slot));
        match read_size(&path) {
            Some((width, height)) => layers.push(PresetPreviewLayer {
                slot: *slot,
                url: versioned_asset_url(&path),
                width,
                height,
            }),
            None => log::warn!(
                "preset: 미리보기 그림 제외 id={id} slot={}",
                slot.file_key()
            ),
        }
    }
    let canvas = layers
        .iter()
        .find(|l| l.slot.is_canvas_layer())
        .map(|l| CanvasSize {
            width: l.width,
            height: l.height,
        });
    let mouse = file.settings.mouse.clone().unwrap_or_else(default_mouse);
    PresetPreview {
        canvas,
        layers,
        part_pos: mouse.part_pos,
        pen_pos: mouse.pen_pos,
    }
}
