//! 사용자 이미지(에셋) 검증·저장·매니페스트.
//!
//! [목적] 확정사항 §3·§4 — PNG 32bit RGBA 만, 상태 레이어(캔버스 레이어) ≤900×700·≤1MB·서로 같은 크기.
//!        마우스 파츠(`mouse_base`·`mouse_left`·`mouse_right`)는 각각 ≤900×700·≤1MB만 만족하면 되고
//!        셋이 서로 같은 크기일 필요는 없다(CR-036, 2026-09-25 확정 「팔·손 파츠 크기 자유」). 검증을
//!        통과한 파일만 앱 데이터 `assets/` 로 복사하고 manifest.json 에 기록.
//!        OV-R-14(CR-007·CR-008)는 `mouse_base` 의 손 기준점(끝부분 무게중심)을 캔버스 좌표(그림 좌표 +
//!        `part_pos`)로 계산한다.
//!        OV-R-17(CR-014)은 배경 슬롯(맨 아래·전체 캔버스·선택)을 추가한다.
//!        OV-R-22(CR-021)는 특수 키 이미지 슬롯 7개(스페이스·ㅋ(Z)·?·!·Enter·Backspace·되돌리기)를
//!        캔버스 레이어로 추가한다(slot.rs).
//!        R-tmp-4(CR-024)는 펜 쥔 손 파츠 그룹(`pen_up`·`pen_down_N`·`pen_key_*` 7개)을 추가한다
//!        — 캔버스 레이어도 마우스 파츠도 아닌 세 번째 그룹, 펜 그림끼리만 같은 크기(slot.rs).
//!        CR-035 내장 기본 세트(defaults.rs)·내보내기(export.rs) — `DEFAULT_ASSETS` 전부를 exe 에
//!        `include_bytes!`로 담아 첫 실행 시딩·기본값 복원·사용자 폴더 내보내기를 지원한다.
//! [공개 API] `AssetSlot`, `SimpleSlot`, `KbDownKind`, `PenDownKind`(slot.rs 재노출), `AssetManifest`,
//!            `parse_png_header`, `validate`, `load_manifest`, `import`, `import_bytes`, `remove`,
//!            `AssetError`, `compute_hand_anchor`(anchor.rs 재노출, OV-R-14), `defaults`·`export`
//!            (CR-035, `pub mod`).
//! [슬롯] 단순 슬롯은 문자열("body" …), 키보드 누름 프레임 `{"kind":"kb_down","index":N}`, 펜 쥔 손
//!        누름 프레임 `{"kind":"pen_down","index":N}` — serde untagged 로 세 형태를 한 enum 에 담는다.
//!        TS 쪽 `AssetSlot` 과 동일.
//!        슬롯 타입 정의는 `slot.rs`(CR-021 §11 D25)에 있고 이 파일은 `pub use`로만 재노출한다.
//!        `background`(OV-R-17)는 캔버스 레이어이지만 필수 3장(kb_up·kb_down_0·mouse_base, SV2-08)에
//!        포함되지 않는다. `idle`·`rest`(SV2-08부터 선택 — 없으면 ui가 kb_up만 보인다), 특수 키
//!        슬롯 7개(OV-R-22)·펜 쥔 손 슬롯 전체(CR-024)도 선택이다. 필수 판정은 ui가 한다.
//!        `slam` 은 CR-019 로 폐기 — 옛 매니페스트의 `slam` 항목은 로드 시
//!        건너뛴다(manifest_load.rs).
//! [캔버스 규칙] 첫 캔버스 레이어(배경 포함, OV-R-17)의 크기가 캔버스가 된다. 이후 캔버스 레이어는
//!        같아야 하고, 캔버스 레이어가 모두 지워지면 캔버스는 다시 비어 있다(None). 마우스 파츠·펜
//!        그림은 캔버스에 참여하지 않는다(캔버스를 정하지도, 캔버스와 비교되지도 않는다). CR-036
//!        (2026-09-25, 사용자 확정 「팔·손 파츠 크기 자유」)부터 마우스 파츠·펜 그림은 그룹 안에서도
//!        서로 크기가 같을 필요가 없다 — 각 파츠는 상한(≤900×700·≤1MB·32bit RGBA)만 만족하면 된다.
//! [PNG 검사] 시그니처 8바이트 + IHDR 청크(길이 13, 타입 "IHDR", width/height BE u32,
//!        bit depth 8, color type 6=RGBA). 외부 크레이트 없이 직접 파싱한다.
//! [URL] `AssetEntry.url` 은 Tauri asset 프로토콜 URL — 프론트 `convertFileSrc` 와 같은 규칙으로
//!        Rust 에서 만들어 준다(`asset_url`, `url.rs`). 스코프는 tauri.conf.json `$APPDATA/assets/**`.
//!        `import`는 `?v={수정 시각 ms}`를 붙인다(SV2-07). asset 프로토콜은 쿼리를 무시한다.
//! [보안] CR-047 — manifest.json 의 `fileName` 은 신뢰하지 않는다. 저장 파일 경로는 항상
//!        `stored_file_name(slot)`(= `{file_key}.png`)로 다시 만들고, 읽을 때 `fileName`이
//!        그 값과 다르면 항목을 건너뛴다(manifest_load.rs, SEC-002). `import`는 `metadata`로
//!        크기를 먼저 보고 1MB 초과면 읽지 않으며, 읽을 때도 `read_capped`로 상한까지만
//!        읽는다(SEC-003). `save_manifest`는 `settings::write_atomic`을 쓴다(CORE-002).
//! [unsafe] 없음.
//! [테스트] PNG 헤더 파싱·검증·캔버스 규칙·import/remove(tempdir), 배경 슬롯(B1~B15), 손 기준점(anchor.rs),
//!          관대한 매니페스트 로드(manifest_load.rs L1~L8), 특수 키 슬롯(slot.rs K1~K6),
//!          펜 쥔 손 그룹(slot.rs P1·P2), url 버전(url.rs V1~V5),
//!          내장 기본 세트(tests/default_assets.rs D1~D17, M1),
//!          마우스·펜 파츠 크기 자유(CR-036, mouse_part_tests.rs M1~M6, pen_part_tests.rs P3~P6),
//!          manifest fileName 불신·가져오기 크기 선검사(CR-047, security_tests.rs FN1~FN7, RC1~RC6),
//!          알림음 저장소(CR-048, `sound.rs` `#[cfg(test)]` A1~A14 — `AssetSlot`·매니페스트와 분리),
//!          manifest.json 1MiB 상한 초과 거부(SEC-205, 이 파일 `#[cfg(test)]`).
//! [알림음] CR-048 TM-08 — `sound.rs`(`pub mod sound;`)가 `assets/alarm.{wav|mp3|ogg}`를 이 모듈의
//!        PNG·매니페스트 경로와 분리해 관리한다. 보안 규칙(`read_capped`·`write_atomic`)만 재사용한다.

use std::fs;
use std::io::Read;
use std::path::Path;

use serde::{Deserialize, Serialize};

pub mod defaults;
pub mod export;
pub mod sound;

mod anchor;
mod manifest_load;
#[cfg(test)]
mod mouse_part_tests;
#[cfg(test)]
mod pen_part_tests;
#[cfg(test)]
mod security_tests;
mod slot;
mod url;

pub use anchor::compute_hand_anchor;
pub use slot::{AssetSlot, KbDownKind, PenDownKind, SimpleSlot};
pub use url::asset_url;
pub(crate) use url::versioned_asset_url;

pub const CANVAS_MAX_WIDTH: u32 = 900;
pub const CANVAS_MAX_HEIGHT: u32 = 700;
pub const ASSET_MAX_BYTES: u64 = 1024 * 1024;
pub const MANIFEST_FILE: &str = "manifest.json";

const PNG_SIGNATURE: [u8; 8] = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];

// ─── 매니페스트 ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasSize {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetEntry {
    pub slot: AssetSlot,
    pub file_name: String,
    pub width: u32,
    pub height: u32,
    pub bytes: u64,
    pub url: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetManifest {
    pub canvas: Option<CanvasSize>,
    pub entries: Vec<AssetEntry>,
}

impl AssetManifest {
    pub fn find(&self, slot: &AssetSlot) -> Option<&AssetEntry> {
        let key = slot.file_key();
        self.entries.iter().find(|e| e.slot.file_key() == key)
    }

    pub(crate) fn recompute_canvas(&mut self) {
        self.canvas = self
            .entries
            .iter()
            .find(|e| e.slot.is_canvas_layer())
            .map(|e| CanvasSize {
                width: e.width,
                height: e.height,
            });
    }
}

// ─── 에러 ──────────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum AssetError {
    #[error("PNG 파일이 아닙니다.")]
    NotPng,
    #[error("PNG 헤더가 손상되었습니다.")]
    BadHeader,
    #[error("32bit RGBA PNG 만 지원합니다 (투명 배경 필요).")]
    NotRgba,
    #[error("이미지가 너무 큽니다. 최대 {max_w}×{max_h} (현재 {w}×{h}).")]
    TooLarge {
        w: u32,
        h: u32,
        max_w: u32,
        max_h: u32,
    },
    #[error("파일 용량이 1 MB 를 넘습니다 ({bytes} 바이트).")]
    TooManyBytes { bytes: u64 },
    #[error("배경·몸통 등 캔버스 그림은 모두 같은 크기여야 합니다. 캔버스 {cw}×{ch}, 이 이미지 {w}×{h}.")]
    CanvasMismatch { w: u32, h: u32, cw: u32, ch: u32 },
    #[error("이 칸에는 내장 기본 그림이 없습니다: {0}")]
    NoDefault(String),
    #[error("저장할 폴더를 찾을 수 없습니다.")]
    ExportDir,
    #[error("등록되지 않은 슬롯입니다: {0}")]
    NotFound(String),
    #[error("파일 처리 중 오류가 발생했습니다: {0}")]
    Io(#[from] std::io::Error),
    #[error("매니페스트를 읽거나 쓸 수 없습니다: {0}")]
    Manifest(#[from] serde_json::Error),
    #[error("이미지 픽셀을 읽을 수 없습니다: {0}")]
    Decode(#[from] tauri::Error),
}

impl AssetError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::NotPng => "asset.not_png",
            Self::BadHeader => "asset.bad_header",
            Self::NotRgba => "asset.not_rgba",
            Self::TooLarge { .. } => "asset.too_large",
            Self::TooManyBytes { .. } => "asset.too_many_bytes",
            Self::CanvasMismatch { .. } => "asset.canvas_mismatch",
            Self::NotFound(_) => "asset.not_found",
            Self::Io(_) => "asset.io",
            Self::Manifest(_) => "asset.manifest",
            Self::Decode(_) => "asset.decode",
            Self::NoDefault(_) => "asset.no_default",
            Self::ExportDir => "asset.export_dir",
        }
    }
}

// ─── PNG 검사 ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PngInfo {
    pub width: u32,
    pub height: u32,
    pub bit_depth: u8,
    pub color_type: u8,
}

/// 시그니처 + IHDR 만 읽는다 (최소 29바이트).
pub fn parse_png_header(bytes: &[u8]) -> Result<PngInfo, AssetError> {
    if bytes.len() < 8 || bytes[..8] != PNG_SIGNATURE {
        return Err(AssetError::NotPng);
    }
    if bytes.len() < 29 || &bytes[12..16] != b"IHDR" {
        return Err(AssetError::BadHeader);
    }
    let be = |i: usize| u32::from_be_bytes([bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]]);
    if be(8) != 13 {
        return Err(AssetError::BadHeader);
    }
    Ok(PngInfo {
        width: be(16),
        height: be(20),
        bit_depth: bytes[24],
        color_type: bytes[25],
    })
}

/// 슬롯 종류·캔버스 기준 크기에 맞는 규격 검사.
///
/// `group_size`: 캔버스 레이어끼리에서 이 슬롯을 뺀 나머지가 정하는 기준 크기(캔버스 레이어에만
/// 적용). 마우스 파츠·펜 그림은 그룹 크기 일치를 요구하지 않는다(CR-036, 2026-09-25 사용자 확정
/// 「팔·손 파츠 크기 자유」) — 항상 `None`을 넘겨도 되고, 상한(≤900×700·≤1MB·32bit RGBA)만 검사한다.
/// `slot` 인자는 시그니처 호환을 위해 남긴다(현재 판정에는 쓰이지 않는다 — `group_size`가 호출자
/// 쪽에서 슬롯별 규칙을 이미 반영했다).
pub fn validate(
    info: &PngInfo,
    bytes: u64,
    _slot: &AssetSlot,
    group_size: Option<CanvasSize>,
) -> Result<(), AssetError> {
    if info.bit_depth != 8 || info.color_type != 6 {
        return Err(AssetError::NotRgba);
    }
    if bytes > ASSET_MAX_BYTES {
        return Err(AssetError::TooManyBytes { bytes });
    }
    let (w, h) = (info.width, info.height);
    if w == 0 || h == 0 || w > CANVAS_MAX_WIDTH || h > CANVAS_MAX_HEIGHT {
        return Err(AssetError::TooLarge {
            w,
            h,
            max_w: CANVAS_MAX_WIDTH,
            max_h: CANVAS_MAX_HEIGHT,
        });
    }
    match group_size {
        Some(g) if g.width != w || g.height != h => Err(AssetError::CanvasMismatch {
            w,
            h,
            cw: g.width,
            ch: g.height,
        }),
        _ => Ok(()),
    }
}

/// 캔버스 레이어끼리에서 이 슬롯을 뺀 나머지가 정하는 기준 크기. 마우스 파츠·펜 그림은 그룹 크기
/// 규칙이 없으므로 항상 `None`(CR-036). 없으면 첫 등록·유일 항목 교체로 보고 크기 자유(≤900×700).
fn group_size(manifest: &AssetManifest, slot: &AssetSlot) -> Option<CanvasSize> {
    if !slot.is_canvas_layer() {
        return None;
    }
    let key = slot.file_key();
    let mut others = manifest.entries.iter().filter(|e| e.slot.file_key() != key);
    // 기존 규칙 그대로: 다른 캔버스 레이어가 있을 때만 캔버스가 기준
    others
        .any(|e| e.slot.is_canvas_layer())
        .then_some(manifest.canvas)
        .flatten()
}

// ─── 저장소 ────────────────────────────────────────────────────────────────

/// 슬롯의 저장 파일 이름 — 경로는 항상 이것으로 만든다. manifest.json의 `fileName`은 신뢰하지
/// 않는다(SEC-002) — 위조·오염된 경로로 앱 데이터 밖 파일을 읽거나 지우는 것을 막는다.
pub(crate) fn stored_file_name(slot: &AssetSlot) -> String {
    format!("{}.png", slot.file_key())
}

pub fn load_manifest(assets_dir: &Path) -> Result<AssetManifest, AssetError> {
    let path = assets_dir.join(MANIFEST_FILE);
    if !path.exists() {
        return Ok(AssetManifest::default());
    }
    // SEC-205: 상한(1MiB, settings::MAX_TEXT_FILE_BYTES)을 넘는 매니페스트는 읽지 않는다 —
    // Io 오류가 돼 기존 오류 전파 경로(호출자가 그대로 실패로 본다)를 그대로 탄다.
    let text = crate::settings::read_capped_string(&path, crate::settings::MAX_TEXT_FILE_BYTES)?;
    manifest_load::parse_manifest(&text)
}

/// `settings::write_atomic`(CR-047 CORE-002)로 고유 임시 파일 → `sync_all` → rename 한 번으로
/// 교체한다 — 쓰기 도중 종료돼도 manifest.json 이 없어지는 순간이 없다.
pub fn save_manifest(assets_dir: &Path, manifest: &AssetManifest) -> Result<(), AssetError> {
    let json = serde_json::to_string_pretty(manifest)?;
    crate::settings::write_atomic(&assets_dir.join(MANIFEST_FILE), json.as_bytes())?;
    Ok(())
}

/// 검증 → `assets/{key}.png` 로 쓰기 → manifest 갱신. 같은 슬롯은 덮어쓴다.
/// CR-035: 바이트 입력판 — 파일 등록(`import`)과 내장 기본 시딩·복원(defaults.rs)이 함께 쓴다.
pub fn import_bytes(
    assets_dir: &Path,
    slot: AssetSlot,
    bytes: &[u8],
) -> Result<AssetManifest, AssetError> {
    let info = parse_png_header(bytes)?;
    let mut manifest = load_manifest(assets_dir)?;

    let group = group_size(&manifest, &slot);
    validate(&info, bytes.len() as u64, &slot, group)?;

    fs::create_dir_all(assets_dir)?;
    let file_name = stored_file_name(&slot);
    let dest = assets_dir.join(&file_name);
    fs::write(&dest, bytes)?;

    let entry = AssetEntry {
        slot,
        file_name,
        width: info.width,
        height: info.height,
        bytes: bytes.len() as u64,
        url: url::versioned_asset_url(&dest),
    };
    manifest
        .entries
        .retain(|e| e.slot.file_key() != slot.file_key());
    manifest.entries.push(entry);
    manifest.recompute_canvas();
    save_manifest(assets_dir, &manifest)?;
    Ok(manifest)
}

/// 원본 크기를 `metadata`로 먼저 보고, 상한까지만 읽어 `import_bytes`로 넘긴다(SEC-003) —
/// 수 GB 파일을 골라도 메모리에 전부 올리지 않는다. 시그니처·순서·동작은 1MB 이하일 때 불변.
pub fn import(assets_dir: &Path, slot: AssetSlot, src: &Path) -> Result<AssetManifest, AssetError> {
    let len = fs::metadata(src)?.len();
    if len > ASSET_MAX_BYTES {
        return Err(AssetError::TooManyBytes { bytes: len });
    }
    let bytes = read_capped(src, ASSET_MAX_BYTES)?;
    import_bytes(assets_dir, slot, &bytes)
}

/// 최대 `max + 1`바이트만 읽는다. 넘으면 `TooManyBytes`(검사 뒤 파일이 커진 드문 경쟁 조건).
pub(crate) fn read_capped(src: &Path, max: u64) -> Result<Vec<u8>, AssetError> {
    let file = fs::File::open(src)?;
    let mut buf = Vec::new();
    file.take(max + 1).read_to_end(&mut buf)?;
    let n = buf.len() as u64;
    if n > max {
        return Err(AssetError::TooManyBytes { bytes: n });
    }
    Ok(buf)
}

pub fn remove(assets_dir: &Path, slot: AssetSlot) -> Result<AssetManifest, AssetError> {
    let mut manifest = load_manifest(assets_dir)?;
    let key = slot.file_key();
    let Some(pos) = manifest
        .entries
        .iter()
        .position(|e| e.slot.file_key() == key)
    else {
        return Err(AssetError::NotFound(key));
    };
    let entry = manifest.entries.remove(pos);
    // SEC-002: manifest 의 fileName 을 신뢰하지 않고 슬롯에서 경로를 다시 만든다.
    let path = assets_dir.join(stored_file_name(&entry.slot));
    if path.exists() {
        fs::remove_file(path)?;
    }
    manifest.recompute_canvas();
    save_manifest(assets_dir, &manifest)?;
    Ok(manifest)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 시그니처 + IHDR 청크(CRC 는 검사하지 않으므로 0). `mouse_part_tests`가 재사용한다.
    pub(super) fn png_header(w: u32, h: u32, depth: u8, color: u8) -> Vec<u8> {
        let mut v = PNG_SIGNATURE.to_vec();
        v.extend_from_slice(&13u32.to_be_bytes());
        v.extend_from_slice(b"IHDR");
        v.extend_from_slice(&w.to_be_bytes());
        v.extend_from_slice(&h.to_be_bytes());
        v.extend_from_slice(&[depth, color, 0, 0, 0]);
        v.extend_from_slice(&[0, 0, 0, 0]);
        v
    }

    #[test]
    fn rejects_non_png_signature() {
        let bytes = b"GIF89a....................................".to_vec();
        assert!(matches!(parse_png_header(&bytes), Err(AssetError::NotPng)));
    }

    #[test]
    fn rejects_non_rgba() {
        let info = parse_png_header(&png_header(100, 100, 8, 2)).expect("header");
        let err = validate(&info, 10, &AssetSlot::Simple(SimpleSlot::Body), None).unwrap_err();
        assert!(matches!(err, AssetError::NotRgba));
    }

    #[test]
    fn rejects_oversized_canvas_layer_and_mouse_part() {
        let big = parse_png_header(&png_header(901, 700, 8, 6)).expect("header");
        assert!(matches!(
            validate(&big, 10, &AssetSlot::Simple(SimpleSlot::Idle), None),
            Err(AssetError::TooLarge { .. })
        ));
        // 마우스 파츠도 900×700 상한은 그대로. 256 규칙은 없다(기준 그룹이 없으면 자유).
        let ok = parse_png_header(&png_header(257, 100, 8, 6)).expect("header");
        assert!(validate(&ok, 10, &AssetSlot::Simple(SimpleSlot::MouseBase), None).is_ok());
        let too_wide = parse_png_header(&png_header(901, 100, 8, 6)).expect("header");
        assert!(matches!(
            validate(
                &too_wide,
                10,
                &AssetSlot::Simple(SimpleSlot::MouseBase),
                None
            ),
            Err(AssetError::TooLarge {
                max_w: 900,
                max_h: 700,
                ..
            })
        ));
        let ok2 = parse_png_header(&png_header(900, 700, 8, 6)).expect("header");
        assert!(validate(&ok2, 10, &AssetSlot::Simple(SimpleSlot::Idle), None).is_ok());
    }

    #[test]
    fn rejects_bytes_over_1mb_and_canvas_mismatch() {
        let info = parse_png_header(&png_header(450, 350, 8, 6)).expect("header");
        assert!(matches!(
            validate(
                &info,
                ASSET_MAX_BYTES + 1,
                &AssetSlot::Simple(SimpleSlot::Body),
                None
            ),
            Err(AssetError::TooManyBytes { .. })
        ));
        let canvas = Some(CanvasSize {
            width: 900,
            height: 700,
        });
        assert!(matches!(
            validate(&info, 10, &AssetSlot::kb_down(0), canvas),
            Err(AssetError::CanvasMismatch { .. })
        ));
        // 마우스 파츠는 캔버스와도, 다른 마우스 파츠와도 무관하게 크기 자유(CR-036).
        let hand = parse_png_header(&png_header(120, 120, 8, 6)).expect("header");
        assert!(validate(&hand, 10, &AssetSlot::Simple(SimpleSlot::MouseLeft), None).is_ok());
    }

    #[test]
    fn slot_serde_round_trip() {
        let s: AssetSlot = serde_json::from_str("\"kb_up\"").expect("simple");
        assert_eq!(s, AssetSlot::Simple(SimpleSlot::KbUp));
        let k: AssetSlot = serde_json::from_str(r#"{"kind":"kb_down","index":2}"#).expect("kb");
        assert_eq!(k, AssetSlot::kb_down(2));
        assert_eq!(
            serde_json::to_string(&k).expect("ser"),
            r#"{"kind":"kb_down","index":2}"#
        );
        assert_eq!(serde_json::to_string(&s).expect("ser"), "\"kb_up\"");
        assert!(serde_json::from_str::<AssetSlot>(r#"{"kind":"nope","index":2}"#).is_err());
    }

    #[test]
    fn import_sets_canvas_then_remove_clears_it() {
        let dir = tempfile::tempdir().expect("tempdir");
        let src = dir.path().join("src.png");
        fs::write(&src, png_header(450, 350, 8, 6)).expect("write");
        let assets = dir.path().join("assets");

        let m = import(&assets, AssetSlot::Simple(SimpleSlot::Body), &src).expect("import");
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 450,
                height: 350
            })
        );
        assert_eq!(m.entries.len(), 1);
        assert!(assets.join("body.png").exists());
        assert!(m.entries[0].url.starts_with("http://asset.localhost/"));

        // 다른 크기의 상태 레이어는 거부
        let other = dir.path().join("other.png");
        fs::write(&other, png_header(900, 700, 8, 6)).expect("write");
        assert!(import(&assets, AssetSlot::Simple(SimpleSlot::Idle), &other).is_err());

        // 유일한 캔버스 레이어(body)를 다른 크기로 교체하는 것은 허용
        let m = import(&assets, AssetSlot::Simple(SimpleSlot::Body), &other).expect("replace");
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 900,
                height: 700
            })
        );

        let m = remove(&assets, AssetSlot::Simple(SimpleSlot::Body)).expect("remove");
        assert_eq!(m.canvas, None);
        assert!(m.entries.is_empty());
        assert!(!assets.join("body.png").exists());
        assert!(matches!(
            remove(&assets, AssetSlot::Simple(SimpleSlot::Body)),
            Err(AssetError::NotFound(_))
        ));
    }

    // ─── 배경 슬롯 (OV-R-17, CR-014) ────────────────────────────────────────

    /// B1: 직렬화 왕복.
    #[test]
    fn background_slot_serde_round_trip() {
        let s: AssetSlot = serde_json::from_str("\"background\"").expect("de");
        assert_eq!(s, AssetSlot::Simple(SimpleSlot::Background));
        assert_eq!(serde_json::to_string(&s).expect("ser"), "\"background\"");
    }

    /// B2: 분류·키.
    #[test]
    fn background_slot_key_and_classification() {
        let s = AssetSlot::Simple(SimpleSlot::Background);
        assert_eq!(s.file_key(), "background");
        assert!(!s.is_mouse_part());
        assert!(s.is_canvas_layer());
    }

    /// B3: 900×700 RGBA, 캔버스 없음 → 통과.
    #[test]
    fn background_validate_ok_at_max_canvas() {
        let info = parse_png_header(&png_header(900, 700, 8, 6)).expect("header");
        assert!(validate(&info, 10, &AssetSlot::Simple(SimpleSlot::Background), None).is_ok());
    }

    /// B4: 캔버스 상한 초과·0 크기는 거부.
    #[test]
    fn background_validate_rejects_oversize_and_zero() {
        let slot = AssetSlot::Simple(SimpleSlot::Background);
        for (w, h) in [(901, 700), (900, 701), (0, 700)] {
            let info = parse_png_header(&png_header(w, h, 8, 6)).expect("header");
            assert!(matches!(
                validate(&info, 10, &slot, None),
                Err(AssetError::TooLarge { .. })
            ));
        }
    }

    /// B5: RGBA 가 아니면 거부.
    #[test]
    fn background_validate_rejects_non_rgba() {
        let slot = AssetSlot::Simple(SimpleSlot::Background);
        let info = parse_png_header(&png_header(900, 700, 8, 2)).expect("header");
        assert!(matches!(
            validate(&info, 10, &slot, None),
            Err(AssetError::NotRgba)
        ));
        let info16 = parse_png_header(&png_header(900, 700, 16, 6)).expect("header");
        assert!(matches!(
            validate(&info16, 10, &slot, None),
            Err(AssetError::NotRgba)
        ));
    }

    /// B6: 1MB 초과는 거부.
    #[test]
    fn background_validate_rejects_over_1mb() {
        let slot = AssetSlot::Simple(SimpleSlot::Background);
        let info = parse_png_header(&png_header(900, 700, 8, 6)).expect("header");
        assert!(matches!(
            validate(&info, ASSET_MAX_BYTES + 1, &slot, None),
            Err(AssetError::TooManyBytes { .. })
        ));
    }

    /// B7: 캔버스 레이어는 크기와 무관하게 캔버스와 다르면 거부.
    #[test]
    fn background_validate_does_not_use_palm_rule() {
        let slot = AssetSlot::Simple(SimpleSlot::Background);
        let info = parse_png_header(&png_header(256, 256, 8, 6)).expect("header");
        let canvas = Some(CanvasSize {
            width: 900,
            height: 700,
        });
        assert!(matches!(
            validate(&info, 10, &slot, canvas),
            Err(AssetError::CanvasMismatch { .. })
        ));
    }

    /// B8: 빈 폴더에 배경만 등록하면 배경이 캔버스를 정한다.
    #[test]
    fn background_alone_sets_canvas() {
        let dir = tempfile::tempdir().expect("tempdir");
        let src = dir.path().join("bg.png");
        fs::write(&src, png_header(900, 700, 8, 6)).expect("write");
        let assets = dir.path().join("assets");

        let m = import(&assets, AssetSlot::Simple(SimpleSlot::Background), &src).expect("import");
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 900,
                height: 700
            })
        );
        assert!(assets.join("background.png").exists());
        assert_eq!(m.entries.len(), 1);
    }

    /// B9: 배경이 캔버스를 정하면 다른 크기의 몸통은 거부, 같은 크기는 허용.
    #[test]
    fn background_then_body_must_match_canvas() {
        let dir = tempfile::tempdir().expect("tempdir");
        let bg = dir.path().join("bg.png");
        fs::write(&bg, png_header(900, 700, 8, 6)).expect("write");
        let assets = dir.path().join("assets");
        import(&assets, AssetSlot::Simple(SimpleSlot::Background), &bg).expect("bg import");

        let small_body = dir.path().join("small_body.png");
        fs::write(&small_body, png_header(450, 350, 8, 6)).expect("write");
        assert!(matches!(
            import(&assets, AssetSlot::Simple(SimpleSlot::Body), &small_body),
            Err(AssetError::CanvasMismatch { .. })
        ));

        let ok_body = dir.path().join("ok_body.png");
        fs::write(&ok_body, png_header(900, 700, 8, 6)).expect("write");
        let m = import(&assets, AssetSlot::Simple(SimpleSlot::Body), &ok_body).expect("body ok");
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 900,
                height: 700
            })
        );
    }

    /// B10: 배경만 있는 유일한 캔버스 레이어는 다른 크기로 교체할 수 있다(몸통 교체와 같은 규칙).
    #[test]
    fn background_alone_can_be_replaced_with_new_size() {
        let dir = tempfile::tempdir().expect("tempdir");
        let bg1 = dir.path().join("bg1.png");
        fs::write(&bg1, png_header(900, 700, 8, 6)).expect("write");
        let assets = dir.path().join("assets");
        import(&assets, AssetSlot::Simple(SimpleSlot::Background), &bg1).expect("first");

        let bg2 = dir.path().join("bg2.png");
        fs::write(&bg2, png_header(612, 354, 8, 6)).expect("write");
        let m = import(&assets, AssetSlot::Simple(SimpleSlot::Background), &bg2).expect("replace");
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 612,
                height: 354
            })
        );
    }

    /// B11: 배경·몸통이 함께 있을 때 몸통을 지워도 캔버스 유지, 배경까지 지우면 캔버스가 사라진다.
    #[test]
    fn background_and_body_removal_order() {
        let dir = tempfile::tempdir().expect("tempdir");
        let bg = dir.path().join("bg.png");
        let body = dir.path().join("body.png");
        fs::write(&bg, png_header(900, 700, 8, 6)).expect("write");
        fs::write(&body, png_header(900, 700, 8, 6)).expect("write");
        let assets = dir.path().join("assets");
        import(&assets, AssetSlot::Simple(SimpleSlot::Background), &bg).expect("bg");
        import(&assets, AssetSlot::Simple(SimpleSlot::Body), &body).expect("body");

        let m = remove(&assets, AssetSlot::Simple(SimpleSlot::Body)).expect("remove body");
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 900,
                height: 700
            })
        );
        let m = remove(&assets, AssetSlot::Simple(SimpleSlot::Background)).expect("remove bg");
        assert_eq!(m.canvas, None);
    }

    /// B12: 배경이 캔버스를 정해도 마우스 파츠 크기는 캔버스와 무관하다(2026-09-23 재정의).
    #[test]
    fn background_canvas_does_not_constrain_mouse_parts() {
        let dir = tempfile::tempdir().expect("tempdir");
        let bg = dir.path().join("bg.png");
        fs::write(&bg, png_header(900, 700, 8, 6)).expect("write");
        let assets = dir.path().join("assets");
        import(&assets, AssetSlot::Simple(SimpleSlot::Background), &bg).expect("bg");

        let arm_ok = dir.path().join("arm_ok.png");
        fs::write(&arm_ok, png_header(900, 700, 8, 6)).expect("write");
        assert!(import(&assets, AssetSlot::Simple(SimpleSlot::MouseBase), &arm_ok).is_ok());

        // 캔버스와 다른(612×354) mouse_base 도 통과해야 한다 — 캔버스와 무관.
        let arm_other = dir.path().join("arm_other.png");
        fs::write(&arm_other, png_header(612, 354, 8, 6)).expect("write");
        let m = import(
            &assets,
            AssetSlot::Simple(SimpleSlot::MouseBase),
            &arm_other,
        )
        .expect("mouse part size is independent of canvas");
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 900,
                height: 700
            })
        );
    }

    /// SEC-205: 1MiB 를 넘는 manifest.json 은 파싱 전에 거부한다(Io 오류).
    #[test]
    fn load_manifest_rejects_oversized_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        let assets = dir.path().join("assets");
        fs::create_dir_all(&assets).expect("mkdir");
        let huge = vec![b'x'; (ASSET_MAX_BYTES + 1) as usize];
        fs::write(assets.join(MANIFEST_FILE), &huge).expect("write huge manifest");
        assert!(matches!(load_manifest(&assets), Err(AssetError::Io(_))));
    }

    /// B13: 배경이 캔버스를 붙잡고 있으면 몸통을 다른 크기로 재등록해도 거부된다.
    #[test]
    fn background_holds_canvas_against_body_resize() {
        let dir = tempfile::tempdir().expect("tempdir");
        let bg = dir.path().join("bg.png");
        let body = dir.path().join("body.png");
        fs::write(&bg, png_header(900, 700, 8, 6)).expect("write");
        fs::write(&body, png_header(900, 700, 8, 6)).expect("write");
        let assets = dir.path().join("assets");
        import(&assets, AssetSlot::Simple(SimpleSlot::Background), &bg).expect("bg");
        import(&assets, AssetSlot::Simple(SimpleSlot::Body), &body).expect("body");

        let smaller_body = dir.path().join("smaller_body.png");
        fs::write(&smaller_body, png_header(450, 350, 8, 6)).expect("write");
        assert!(matches!(
            import(&assets, AssetSlot::Simple(SimpleSlot::Body), &smaller_body),
            Err(AssetError::CanvasMismatch { .. })
        ));
    }
}
