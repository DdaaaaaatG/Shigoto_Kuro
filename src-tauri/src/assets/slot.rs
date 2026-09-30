//! 에셋 슬롯 타입(CR-021 §11 D25로 `mod.rs`에서 분리).
//!
//! [목적] `SimpleSlot`·`KbDownKind`·`AssetSlot`과 `file_key`·`is_mouse_part`·`is_canvas_layer`를
//!        한 파일에 모은다. 슬롯은 CR마다 바뀌는 응집 단위(CR-014 배경, CR-019 슬램 삭제,
//!        CR-021 특수 키 7개 추가)라 여기 한 곳만 고치면 된다. 공개 항목은 `mod.rs`의
//!        `pub use`로만 밖에 보인다(외부 경로 `crate::assets::SimpleSlot` 등 불변).
//! [특수 키 슬롯] OV-R-22(CR-021) — 스페이스·ㅋ(Z)·?·!·Enter·Backspace·되돌리기(Ctrl+Z) 7개.
//!        모두 캔버스 레이어(선택, 필수 3장(kb_up·kb_down_0·mouse_base, SV2-08)에 포함되지 않음). 짝이 되는 hook 분류값은
//!        `crate::hook::SpecialKey`([hook.md](../../../doc/200_설계/core/hook.md) §3.7) — 이름 규칙은
//!        `"key_" + 분류 직렬화`. hook·assets는 서로 의존하지 않으므로 분류→슬롯 대응 함수는
//!        여기 두지 않는다(그림 선택은 ui 몫, 설계 §3.7 D27).
//! [펜 슬롯] R-tmp-4(CR-024) — 펜 쥔 손 파츠 그룹(`pen_up`·`pen_down_N`·`pen_key_*` 7개). 캔버스
//!        레이어도 마우스 파츠도 아닌 세 번째 그룹(`is_pen_part`)이라 `is_canvas_layer`가 이 그룹을
//!        제외한다. 크기 규칙(펜 그림끼리만 같은 크기)은 `mod.rs`의 `group_size`·`validate`가 처리한다.
//! [헤어 슬롯] CR-037 — "hair" 1장, 캔버스 레이어·선택·내장 기본 없음(0.4.0 에서 DEFAULT_ASSETS 제외).
//! [뽀모도 슬롯] CR-045(PT-01) — "pomo_char"·"pomo_bubble" 각 1장, 캔버스 레이어·선택. pomo_char 는
//!        내장 기본 있음(DEFAULT_ASSETS 포함), pomo_bubble 은 없음.
//! [테스트] K1~K6(§8.9) — 직렬화·분류·검증 규칙·import/remove(tempdir). P1·P2(§8.10) — 펜 슬롯
//!        직렬화·분류·untagged 해석 순서. H1~H4(§3.12.5) — 헤어 슬롯 직렬화·분류·load_manifest·
//!        import/remove(tempdir). PM1~PM3(§3.13.5) — 뽀모도 슬롯 직렬화·file_key·분류.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SimpleSlot {
    /// 배경(OV-R-17, CR-014) — 맨 아래 캔버스 레이어, 선택. `is_canvas_layer() == true`.
    Background,
    /// 헤어(뒷머리, CR-037) — 캔버스 레이어(배경·키보드와 같은 크기), 1장 고정, 선택,
    /// 내장 기본 없음(0.4.0 에서 제외). 직렬화 "hair". 겹침 순서(CR-051: 헤어 → 배경 → 뽀모도 → 팔 →
    /// 본체 묶음 → 펜 손)는 ui 몫.
    Hair,
    /// 뽀모도 인물(두 번째 캐릭터, CR-045 PT-01) — 캔버스 레이어(배경과 같은 크기), 1장 고정, 선택,
    /// 내장 기본 있음(DEFAULT_ASSETS 포함). 직렬화 "pomo_char". 겹침(배경 → 인물 → 말풍선 → 시간 글자 → 본체)·고정 표시는
    /// ui 몫.
    PomoChar,
    /// 뽀모도 말풍선(CR-045 PT-01) — 캔버스 레이어, 1장 고정, 선택, 내장 기본 없음. 직렬화 "pomo_bubble".
    PomoBubble,
    Body,
    Idle,
    Rest,
    KbUp,
    /// 특수 키 이미지(OV-R-22, CR-021) — 캔버스 레이어, 선택. 직렬화 "key_space" … "key_backspace".
    KeySpace,
    KeyZ,
    KeyQuestion,
    KeyExclamation,
    KeyEnter,
    KeyBackspace,
    /// 되돌리기(Shift 없는 Ctrl+Z, 5차) — 캔버스 레이어, 선택. 직렬화 "key_undo".
    KeyUndo,
    MouseBase,
    MouseLeft,
    MouseRight,
    /// 펜 쥔 손 — 평소(CR-024). 팔 끝에 붙는 작은 그림, 선택. 펜 그룹(캔버스·마우스 파츠와 무관).
    PenUp,
    /// 펜 쥔 손 — 특수 키 전용(CR-024). 직렬화 "pen_key_space" … "pen_key_undo". 펜 그룹, 선택.
    PenKeySpace,
    PenKeyZ,
    PenKeyQuestion,
    PenKeyExclamation,
    PenKeyEnter,
    PenKeyBackspace,
    PenKeyUndo,
}

/// `kind` 필드가 정확히 "kb_down" 인지 강제하기 위한 단일 변형 enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum KbDownKind {
    #[serde(rename = "kb_down")]
    KbDown,
}

/// `kind` 필드가 정확히 "pen_down" 인지 강제하기 위한 단일 변형 enum(CR-024, `KbDownKind`와 같은 구조).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PenDownKind {
    #[serde(rename = "pen_down")]
    PenDown,
}

/// 직렬화 예: `"body"` / `"kb_up"` / `{"kind":"kb_down","index":0}` / `{"kind":"pen_down","index":0}`
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum AssetSlot {
    Simple(SimpleSlot),
    KbDown {
        kind: KbDownKind,
        index: u32,
    },
    /// 펜 쥔 손 — 키 누름 프레임(CR-024). 파일 키 "pen_down_{index}".
    PenDown {
        kind: PenDownKind,
        index: u32,
    },
}

impl AssetSlot {
    pub fn kb_down(index: u32) -> Self {
        Self::KbDown {
            kind: KbDownKind::KbDown,
            index,
        }
    }

    /// 펜 쥔 손 — 키 누름 프레임(CR-024).
    pub fn pen_down(index: u32) -> Self {
        Self::PenDown {
            kind: PenDownKind::PenDown,
            index,
        }
    }

    /// 파일명·비교용 키 (TS `slotKey` 와 동일 규칙)
    pub fn file_key(&self) -> String {
        match self {
            Self::Simple(s) => match s {
                SimpleSlot::Background => "background",
                SimpleSlot::Hair => "hair",
                SimpleSlot::PomoChar => "pomo_char",
                SimpleSlot::PomoBubble => "pomo_bubble",
                SimpleSlot::Body => "body",
                SimpleSlot::Idle => "idle",
                SimpleSlot::Rest => "rest",
                SimpleSlot::KbUp => "kb_up",
                SimpleSlot::KeySpace => "key_space",
                SimpleSlot::KeyZ => "key_z",
                SimpleSlot::KeyQuestion => "key_question",
                SimpleSlot::KeyExclamation => "key_exclamation",
                SimpleSlot::KeyEnter => "key_enter",
                SimpleSlot::KeyBackspace => "key_backspace",
                SimpleSlot::KeyUndo => "key_undo",
                SimpleSlot::MouseBase => "mouse_base",
                SimpleSlot::MouseLeft => "mouse_left",
                SimpleSlot::MouseRight => "mouse_right",
                SimpleSlot::PenUp => "pen_up",
                SimpleSlot::PenKeySpace => "pen_key_space",
                SimpleSlot::PenKeyZ => "pen_key_z",
                SimpleSlot::PenKeyQuestion => "pen_key_question",
                SimpleSlot::PenKeyExclamation => "pen_key_exclamation",
                SimpleSlot::PenKeyEnter => "pen_key_enter",
                SimpleSlot::PenKeyBackspace => "pen_key_backspace",
                SimpleSlot::PenKeyUndo => "pen_key_undo",
            }
            .to_string(),
            Self::KbDown { index, .. } => format!("kb_down_{index}"),
            Self::PenDown { index, .. } => format!("pen_down_{index}"),
        }
    }

    /// 마우스 파츠(≤900×700·≤1MB, 셋이 서로 같은 크기, 캔버스와 무관)
    pub fn is_mouse_part(&self) -> bool {
        matches!(
            self,
            Self::Simple(SimpleSlot::MouseBase | SimpleSlot::MouseLeft | SimpleSlot::MouseRight)
        )
    }

    /// 펜 쥔 손 그림(CR-024) — ≤900×700·≤1MB, 펜 그림끼리 같은 크기, 캔버스·마우스 파츠와 무관
    pub fn is_pen_part(&self) -> bool {
        matches!(
            self,
            Self::PenDown { .. }
                | Self::Simple(
                    SimpleSlot::PenUp
                        | SimpleSlot::PenKeySpace
                        | SimpleSlot::PenKeyZ
                        | SimpleSlot::PenKeyQuestion
                        | SimpleSlot::PenKeyExclamation
                        | SimpleSlot::PenKeyEnter
                        | SimpleSlot::PenKeyBackspace
                        | SimpleSlot::PenKeyUndo
                )
        )
    }

    /// 캔버스 레이어(배경·몸통·상태·키보드 파츠·특수 키) — 마우스 파츠·펜 그림 제외
    pub fn is_canvas_layer(&self) -> bool {
        !self.is_mouse_part() && !self.is_pen_part()
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;
    use crate::assets::{
        import, load_manifest, parse_png_header, remove, validate, AssetError, CanvasSize,
        ASSET_MAX_BYTES,
    };

    /// 시그니처 + IHDR 청크(CRC 는 검사하지 않으므로 0). `mod.rs` 테스트의 헬퍼와 동일 규칙.
    fn png_header(w: u32, h: u32, depth: u8, color: u8) -> Vec<u8> {
        let mut v = vec![0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
        v.extend_from_slice(&13u32.to_be_bytes());
        v.extend_from_slice(b"IHDR");
        v.extend_from_slice(&w.to_be_bytes());
        v.extend_from_slice(&h.to_be_bytes());
        v.extend_from_slice(&[depth, color, 0, 0, 0]);
        v.extend_from_slice(&[0, 0, 0, 0]);
        v
    }

    const KEY_SLOTS: [(SimpleSlot, &str); 7] = [
        (SimpleSlot::KeySpace, "key_space"),
        (SimpleSlot::KeyZ, "key_z"),
        (SimpleSlot::KeyQuestion, "key_question"),
        (SimpleSlot::KeyExclamation, "key_exclamation"),
        (SimpleSlot::KeyEnter, "key_enter"),
        (SimpleSlot::KeyBackspace, "key_backspace"),
        (SimpleSlot::KeyUndo, "key_undo"),
    ];

    /// K1: 직렬화·역직렬화 왕복 + `file_key()` 7개 전부.
    #[test]
    fn key_slots_serialize_and_file_key() {
        for (variant, expected) in KEY_SLOTS {
            let slot = AssetSlot::Simple(variant);
            let json = serde_json::to_string(&slot).expect("ser");
            assert_eq!(json, format!("\"{expected}\""));
            let back: AssetSlot = serde_json::from_str(&json).expect("de");
            assert_eq!(back, slot);
            assert_eq!(slot.file_key(), expected);
        }
    }

    /// K2: 특수 키 슬롯 7개는 모두 캔버스 레이어이고 마우스 파츠가 아니다.
    #[test]
    fn key_slots_are_canvas_layers() {
        for (variant, _) in KEY_SLOTS {
            let slot = AssetSlot::Simple(variant);
            assert!(slot.is_canvas_layer());
            assert!(!slot.is_mouse_part());
        }
    }

    /// K3: `validate`는 특수 키 슬롯에도 캔버스 레이어 규칙(마우스 파츠 규칙 아님)을 적용한다.
    #[test]
    fn key_slot_validate_uses_canvas_rules() {
        let slot = AssetSlot::Simple(SimpleSlot::KeySpace);

        let ok = parse_png_header(&png_header(900, 700, 8, 6)).expect("header");
        assert!(validate(&ok, 10, &slot, None).is_ok());

        let too_wide = parse_png_header(&png_header(901, 700, 8, 6)).expect("header");
        assert!(matches!(
            validate(&too_wide, 10, &slot, None),
            Err(AssetError::TooLarge { .. })
        ));

        let too_heavy = parse_png_header(&png_header(900, 700, 8, 6)).expect("header");
        assert!(matches!(
            validate(&too_heavy, ASSET_MAX_BYTES + 1, &slot, None),
            Err(AssetError::TooManyBytes { .. })
        ));

        let mismatched = parse_png_header(&png_header(450, 350, 8, 6)).expect("header");
        let canvas = Some(CanvasSize {
            width: 900,
            height: 700,
        });
        assert!(matches!(
            validate(&mismatched, 10, &slot, canvas),
            Err(AssetError::CanvasMismatch { .. })
        ));
    }

    /// K4: 캔버스가 이미 정해진 뒤 특수 키 슬롯을 등록하면 캔버스 규칙을 따른다.
    #[test]
    fn import_key_slot_matches_existing_canvas() {
        let dir = tempfile::tempdir().expect("tempdir");
        let assets = dir.path().join("assets");

        let body_src = dir.path().join("body.png");
        fs::write(&body_src, png_header(450, 350, 8, 6)).expect("write");
        import(&assets, AssetSlot::Simple(SimpleSlot::Body), &body_src).expect("body");

        let key_space_src = dir.path().join("key_space.png");
        fs::write(&key_space_src, png_header(450, 350, 8, 6)).expect("write");
        let m = import(
            &assets,
            AssetSlot::Simple(SimpleSlot::KeySpace),
            &key_space_src,
        )
        .expect("key_space import");
        assert!(assets.join("key_space.png").exists());
        assert!(m.find(&AssetSlot::Simple(SimpleSlot::KeySpace)).is_some());
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 450,
                height: 350
            })
        );

        let key_enter_src = dir.path().join("key_enter.png");
        fs::write(&key_enter_src, png_header(300, 200, 8, 6)).expect("write");
        assert!(matches!(
            import(
                &assets,
                AssetSlot::Simple(SimpleSlot::KeyEnter),
                &key_enter_src
            ),
            Err(AssetError::CanvasMismatch { .. })
        ));
        assert!(!assets.join("key_enter.png").exists());
    }

    /// K5: 특수 키 슬롯 하나만 등록해도 캔버스를 정하고, 지우면 다시 비운다.
    #[test]
    fn key_slot_alone_defines_and_clears_canvas() {
        let dir = tempfile::tempdir().expect("tempdir");
        let assets = dir.path().join("assets");
        let src = dir.path().join("key_z.png");
        fs::write(&src, png_header(900, 700, 8, 6)).expect("write");

        let m = import(&assets, AssetSlot::Simple(SimpleSlot::KeyZ), &src).expect("import");
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 900,
                height: 700
            })
        );

        let m = remove(&assets, AssetSlot::Simple(SimpleSlot::KeyZ)).expect("remove");
        assert_eq!(m.canvas, None);
        assert!(m.entries.is_empty());
    }

    /// K6: `load_manifest`가 특수 키 슬롯 항목을 정상 해석하고 다른 항목과 함께 왕복한다.
    #[test]
    fn manifest_with_key_slots_round_trips() {
        let dir = tempfile::tempdir().expect("tempdir");
        let assets = dir.path().join("assets");

        let body_src = dir.path().join("body.png");
        fs::write(&body_src, png_header(450, 350, 8, 6)).expect("write");
        import(&assets, AssetSlot::Simple(SimpleSlot::Body), &body_src).expect("body");

        let key_space_src = dir.path().join("key_space.png");
        fs::write(&key_space_src, png_header(450, 350, 8, 6)).expect("write");
        import(
            &assets,
            AssetSlot::Simple(SimpleSlot::KeySpace),
            &key_space_src,
        )
        .expect("key_space");

        let m = load_manifest(&assets).expect("load");
        assert_eq!(m.entries.len(), 2);
        assert_eq!(m.entries[0].slot.file_key(), "body");
        assert_eq!(m.entries[1].slot.file_key(), "key_space");
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 450,
                height: 350
            })
        );
    }

    // ─── CR-024: 펜 쥔 손 파츠 ───────────────────────────────────────────────

    const PEN_SIMPLE_SLOTS: [(SimpleSlot, &str); 8] = [
        (SimpleSlot::PenUp, "pen_up"),
        (SimpleSlot::PenKeySpace, "pen_key_space"),
        (SimpleSlot::PenKeyZ, "pen_key_z"),
        (SimpleSlot::PenKeyQuestion, "pen_key_question"),
        (SimpleSlot::PenKeyExclamation, "pen_key_exclamation"),
        (SimpleSlot::PenKeyEnter, "pen_key_enter"),
        (SimpleSlot::PenKeyBackspace, "pen_key_backspace"),
        (SimpleSlot::PenKeyUndo, "pen_key_undo"),
    ];

    /// P1: 펜 단순 슬롯 8개 + `pen_down` 직렬화·왕복·`file_key()`.
    #[test]
    fn pen_slots_serialize_and_file_key() {
        for (variant, expected) in PEN_SIMPLE_SLOTS {
            let slot = AssetSlot::Simple(variant);
            let json = serde_json::to_string(&slot).expect("ser");
            assert_eq!(json, format!("\"{expected}\""));
            let back: AssetSlot = serde_json::from_str(&json).expect("de");
            assert_eq!(back, slot);
            assert_eq!(slot.file_key(), expected);
        }

        for index in [0u32, 3u32] {
            let slot = AssetSlot::pen_down(index);
            let json = serde_json::to_string(&slot).expect("ser");
            assert_eq!(json, format!(r#"{{"kind":"pen_down","index":{index}}}"#));
            let back: AssetSlot = serde_json::from_str(&json).expect("de");
            assert_eq!(back, slot);
            assert_eq!(slot.file_key(), format!("pen_down_{index}"));
        }
    }

    /// P2: 펜 슬롯 분류(캔버스·마우스 파츠 아님) + untagged 해석 순서(kb_down vs pen_down 모호함 없음).
    #[test]
    fn pen_slots_classification_and_untagged_order() {
        for (variant, _) in PEN_SIMPLE_SLOTS {
            let slot = AssetSlot::Simple(variant);
            assert!(slot.is_pen_part());
            assert!(!slot.is_mouse_part());
            assert!(!slot.is_canvas_layer());
        }
        for index in [0u32, 3u32] {
            let slot = AssetSlot::pen_down(index);
            assert!(slot.is_pen_part());
            assert!(!slot.is_mouse_part());
            assert!(!slot.is_canvas_layer());
        }

        assert!(!AssetSlot::kb_down(0).is_pen_part());
        assert!(!AssetSlot::Simple(SimpleSlot::MouseBase).is_pen_part());

        let kb: AssetSlot = serde_json::from_str(r#"{"kind":"kb_down","index":1}"#).expect("kb");
        assert_eq!(kb, AssetSlot::kb_down(1));
        let pen: AssetSlot = serde_json::from_str(r#"{"kind":"pen_down","index":1}"#).expect("pen");
        assert_eq!(pen, AssetSlot::pen_down(1));
        assert!(serde_json::from_str::<AssetSlot>(r#"{"kind":"other","index":0}"#).is_err());
    }

    // ─── CR-037: 헤어(뒷머리) 슬롯 ────────────────────────────────────────────

    /// H1: 직렬화·역직렬화 왕복 + `file_key()`.
    #[test]
    fn hair_slot_serializes_and_file_key() {
        let slot = AssetSlot::Simple(SimpleSlot::Hair);
        let json = serde_json::to_string(&slot).expect("ser");
        assert_eq!(json, "\"hair\"");
        let back: AssetSlot = serde_json::from_str(&json).expect("de");
        assert_eq!(back, slot);
        assert_eq!(slot.file_key(), "hair");
    }

    /// H2: 캔버스 레이어 분류(마우스 파츠·펜 그림 아님).
    #[test]
    fn hair_slot_is_canvas_layer() {
        let slot = AssetSlot::Simple(SimpleSlot::Hair);
        assert!(slot.is_canvas_layer());
        assert!(!slot.is_mouse_part());
        assert!(!slot.is_pen_part());
    }

    /// H3: `load_manifest`가 헤어 항목을 다른 캔버스 레이어와 함께 정상 해석한다.
    #[test]
    fn hair_slot_manifest_round_trips() {
        let dir = tempfile::tempdir().expect("tempdir");
        let assets = dir.path().join("assets");

        let hair_src = dir.path().join("hair.png");
        fs::write(&hair_src, png_header(900, 700, 8, 6)).expect("write");
        import(&assets, AssetSlot::Simple(SimpleSlot::Hair), &hair_src).expect("hair");

        let kb_up_src = dir.path().join("kb_up.png");
        fs::write(&kb_up_src, png_header(900, 700, 8, 6)).expect("write");
        import(&assets, AssetSlot::Simple(SimpleSlot::KbUp), &kb_up_src).expect("kb_up");

        let m = load_manifest(&assets).expect("load");
        assert_eq!(m.entries.len(), 2);
        assert!(m.find(&AssetSlot::Simple(SimpleSlot::Hair)).is_some());
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 900,
                height: 700
            })
        );
    }

    /// H4: 헤어 등록 → 캔버스 확정 → 다른 캔버스 레이어 등록 → 크기 불일치 재등록 실패 →
    /// 헤어 제거(캔버스 유지) → 마지막 캔버스 레이어 제거(캔버스 비움).
    #[test]
    fn hair_slot_import_remove_lifecycle() {
        let dir = tempfile::tempdir().expect("tempdir");
        let assets = dir.path().join("assets");

        let hair_src = dir.path().join("hair.png");
        fs::write(&hair_src, png_header(600, 400, 8, 6)).expect("write");
        let m = import(&assets, AssetSlot::Simple(SimpleSlot::Hair), &hair_src).expect("hair");
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 600,
                height: 400
            })
        );
        assert!(assets.join("hair.png").exists());

        let kb_up_src = dir.path().join("kb_up.png");
        fs::write(&kb_up_src, png_header(600, 400, 8, 6)).expect("write");
        import(&assets, AssetSlot::Simple(SimpleSlot::KbUp), &kb_up_src).expect("kb_up");

        let hair_mismatch_src = dir.path().join("hair2.png");
        fs::write(&hair_mismatch_src, png_header(500, 400, 8, 6)).expect("write");
        let hair_bytes_before = fs::read(assets.join("hair.png")).expect("read");
        let manifest_before = fs::read_to_string(assets.join("manifest.json")).expect("read");
        assert!(matches!(
            import(
                &assets,
                AssetSlot::Simple(SimpleSlot::Hair),
                &hair_mismatch_src
            ),
            Err(AssetError::CanvasMismatch { .. })
        ));
        assert_eq!(
            fs::read(assets.join("hair.png")).expect("read"),
            hair_bytes_before
        );
        assert_eq!(
            fs::read_to_string(assets.join("manifest.json")).expect("read"),
            manifest_before
        );

        let m = remove(&assets, AssetSlot::Simple(SimpleSlot::Hair)).expect("remove hair");
        assert!(m.find(&AssetSlot::Simple(SimpleSlot::Hair)).is_none());
        assert_eq!(
            m.canvas,
            Some(CanvasSize {
                width: 600,
                height: 400
            })
        );

        let m = remove(&assets, AssetSlot::Simple(SimpleSlot::KbUp)).expect("remove kb_up");
        assert_eq!(m.canvas, None);
    }

    // ─── CR-045: 뽀모도 슬롯(pomo_char·pomo_bubble) ───────────────────────────

    const POMO_SLOTS: [(SimpleSlot, &str); 2] = [
        (SimpleSlot::PomoChar, "pomo_char"),
        (SimpleSlot::PomoBubble, "pomo_bubble"),
    ];

    /// PM1: 직렬화·역직렬화 왕복.
    #[test]
    fn pomo_slots_serde_round_trip() {
        for (variant, expected) in POMO_SLOTS {
            let slot = AssetSlot::Simple(variant);
            let json = serde_json::to_string(&slot).expect("ser");
            assert_eq!(json, format!("\"{expected}\""));
            let back: AssetSlot = serde_json::from_str(&json).expect("de");
            assert_eq!(back, slot);
        }
    }

    /// PM2: `file_key()`.
    #[test]
    fn pomo_slots_file_key() {
        for (variant, expected) in POMO_SLOTS {
            assert_eq!(AssetSlot::Simple(variant).file_key(), expected);
        }
    }

    /// PM3: 캔버스 레이어 분류(마우스 파츠·펜 그림 아님).
    #[test]
    fn pomo_slots_are_canvas_layers() {
        for (variant, _) in POMO_SLOTS {
            let slot = AssetSlot::Simple(variant);
            assert!(slot.is_canvas_layer());
            assert!(!slot.is_mouse_part());
            assert!(!slot.is_pen_part());
        }
    }
}
