//! 내장 기본 이미지 세트(CR-035).
//!
//! [목적] DA-01 기본 그림 6장(0.4.0, 사용자 확정 배포 세트 — hair 제외)을 exe 에 내장한다
//!        (원본 `doc/assets/defaults/*.png`, manifest.snapshot.json 제외).
//!        DA-02 첫 실행 시딩(매니페스트 비어 있음 + 같은 이름 파일 없음), DA-03 슬롯 하나를 내장 기본으로 복원.
//! [내장 방식] include_bytes! — 포터블 exe 에도 따라가야 해서 Tauri resources(설치본에만 깔림) 대신 쓴다
//!        (02-design U-6). 바이트는 exe 정적 영역(힙 복사 없음). 그림을 바꾸려면 다시 빌드한다.
//! [순서] DEFAULT_ASSETS 순서 = 시딩 등록 순서: 캔버스 레이어(kb_up → background → pomo_char)
//!        → mouse_base → pen_up → pen_down_0. hair·kb_down_N·pomo_bubble·idle·rest·특수 키·펜 특수 키·
//!        클릭 파츠는 내장 기본이 없다(has_default 는 false, 사용자가 직접 등록해야 한다).
//!        hair 는 CR-053(세대 4)에서 내장됐다가 0.4.0(세대 5)에서 다시 뺐다 — 사용자 지정 배포
//!        세트에 뒷머리를 넣지 않기로 함.
//! [에러] seed_if_empty 는 Err 를 내지 않는다(앱 시작을 막지 않음). restore_default 는 NoDefault·import_bytes 오류.
//! [설정] settings.json 을 읽지도 쓰지도 않는다.
//! [unsafe] 없음.
//! [테스트] tests/default_assets.rs(통합, tempdir).

use std::path::Path;

use super::{
    import_bytes, load_manifest, AssetError, AssetManifest, AssetSlot, PenDownKind, SimpleSlot,
};

/// 내장 기본 그림 1장. 바이트는 exe 정적 영역(힙 복사 없음).
#[derive(Debug, Clone, Copy)]
pub struct DefaultAsset {
    pub slot: AssetSlot,
    pub bytes: &'static [u8],
}

impl DefaultAsset {
    /// 저장·내보내기 파일명 `{file_key}.png`(export.rs 와 공유).
    pub(super) fn file_name(&self) -> String {
        format!("{}.png", self.slot.file_key())
    }
}

macro_rules! default_png {
    ($name:literal) => {
        include_bytes!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../doc/assets/defaults/",
            $name
        ))
    };
}

const fn simple(slot: SimpleSlot, bytes: &'static [u8]) -> DefaultAsset {
    DefaultAsset {
        slot: AssetSlot::Simple(slot),
        bytes,
    }
}

/// 순서 고정: 캔버스 레이어(kb_up → background → pomo_char) → mouse_base → pen_up →
/// pen_down_0. 시딩이 이 순서로 등록한다(0.4.0, 6장 — hair·kb_down_0 제외).
pub static DEFAULT_ASSETS: [DefaultAsset; 6] = [
    simple(SimpleSlot::KbUp, default_png!("kb_up.png")),
    simple(SimpleSlot::Background, default_png!("background.png")),
    simple(SimpleSlot::PomoChar, default_png!("pomo_char.png")),
    simple(SimpleSlot::MouseBase, default_png!("mouse_base.png")),
    simple(SimpleSlot::PenUp, default_png!("pen_up.png")),
    DefaultAsset {
        slot: AssetSlot::PenDown {
            kind: PenDownKind::PenDown,
            index: 0,
        },
        bytes: default_png!("pen_down_0.png"),
    },
];

/// 내장 기본 바이트. file_key 기준 비교 — pen_down_0 만 있고 kb_down_N·index 1 이상은 None.
pub fn default_bytes(slot: &AssetSlot) -> Option<&'static [u8]> {
    let key = slot.file_key();
    DEFAULT_ASSETS
        .iter()
        .find(|d| d.slot.file_key() == key)
        .map(|d| d.bytes)
}

/// `default_bytes(slot).is_some()`.
pub fn has_default(slot: &AssetSlot) -> bool {
    default_bytes(slot).is_some()
}

/// 시딩을 건너뛴 사유.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SeedSkip {
    /// manifest.json 에 항목이 1개 이상 있다
    NotEmpty,
    /// manifest.json 최상위 구조 손상·읽기 실패(load_manifest Err) — 손상 파일을 덮어쓰지 않는다
    ManifestUnreadable,
    /// 매니페스트는 비었지만 DEFAULT_ASSETS 파일명(6개) 중 하나 이상이 폴더에 있다 — 매니페스트만
    /// 사라진 사용자 파일 보호
    FilesPresent,
}

/// 시딩 결과.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SeedOutcome {
    /// count = 성공 장수, failed = (file_key, AssetError::code())
    Seeded {
        count: usize,
        failed: Vec<(String, &'static str)>,
    },
    Skipped(SeedSkip),
}

/// Err 를 내지 않는다(앱 시작을 막지 않기 위해). 결과는 호출자(lib.rs)가 로그로 남긴다.
pub fn seed_if_empty(assets_dir: &Path) -> SeedOutcome {
    match load_manifest(assets_dir) {
        Err(_) => return SeedOutcome::Skipped(SeedSkip::ManifestUnreadable),
        Ok(m) if !m.entries.is_empty() => return SeedOutcome::Skipped(SeedSkip::NotEmpty),
        Ok(_) => {}
    }
    if DEFAULT_ASSETS
        .iter()
        .any(|d| assets_dir.join(d.file_name()).exists())
    {
        return SeedOutcome::Skipped(SeedSkip::FilesPresent);
    }
    seed_all(assets_dir)
}

/// DEFAULT_ASSETS 순서대로 import_bytes. 한 장 실패는 기록하고 다음 장을 계속한다.
fn seed_all(assets_dir: &Path) -> SeedOutcome {
    let mut count = 0;
    let mut failed = Vec::new();
    for d in DEFAULT_ASSETS.iter() {
        match import_bytes(assets_dir, d.slot, d.bytes) {
            Ok(_) => count += 1,
            Err(e) => failed.push((d.slot.file_key(), e.code())),
        }
    }
    SeedOutcome::Seeded { count, failed }
}

/// 내장 기본이 없으면 NoDefault. 검증을 쓰기 전에 하므로(import_bytes 순서) 실패하면 사용자 그림이 그대로 남는다.
pub fn restore_default(assets_dir: &Path, slot: AssetSlot) -> Result<AssetManifest, AssetError> {
    let bytes = default_bytes(&slot).ok_or_else(|| AssetError::NoDefault(slot.file_key()))?;
    import_bytes(assets_dir, slot, bytes)
}
