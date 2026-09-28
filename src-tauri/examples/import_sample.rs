//! 개발용 예제: 설정 화면 없이 에셋을 등록하고 데모 설정을 쓴다.
//! 사용: cargo run --example import_sample -- <app_data_dir> [--demo-settings] slot=path ...
//! slot: background hair pomo_char pomo_bubble body idle rest kb_up kb_down_N mouse_base
//!       mouse_left mouse_right key_space key_z key_question key_exclamation key_enter
//!       key_backspace key_undo pen_up pen_down_N pen_key_space pen_key_z pen_key_question
//!       pen_key_exclamation pen_key_enter pen_key_backspace pen_key_undo
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use kuro_keyviewer_lib::assets::{self, AssetSlot, SimpleSlot};
use kuro_keyviewer_lib::settings::{self, MouseSettings, Point, Settings};

fn parse_slot(s: &str) -> Option<AssetSlot> {
    let simple = |v| Some(AssetSlot::Simple(v));
    match s {
        "background" => simple(SimpleSlot::Background),
        "hair" => simple(SimpleSlot::Hair),
        "pomo_char" => simple(SimpleSlot::PomoChar),
        "pomo_bubble" => simple(SimpleSlot::PomoBubble),
        "body" => simple(SimpleSlot::Body),
        "idle" => simple(SimpleSlot::Idle),
        "rest" => simple(SimpleSlot::Rest),
        "kb_up" => simple(SimpleSlot::KbUp),
        "mouse_base" => simple(SimpleSlot::MouseBase),
        "mouse_left" => simple(SimpleSlot::MouseLeft),
        "mouse_right" => simple(SimpleSlot::MouseRight),
        "key_space" => simple(SimpleSlot::KeySpace),
        "key_z" => simple(SimpleSlot::KeyZ),
        "key_question" => simple(SimpleSlot::KeyQuestion),
        "key_exclamation" => simple(SimpleSlot::KeyExclamation),
        "key_enter" => simple(SimpleSlot::KeyEnter),
        "key_backspace" => simple(SimpleSlot::KeyBackspace),
        "key_undo" => simple(SimpleSlot::KeyUndo),
        "pen_up" => simple(SimpleSlot::PenUp),
        "pen_key_space" => simple(SimpleSlot::PenKeySpace),
        "pen_key_z" => simple(SimpleSlot::PenKeyZ),
        "pen_key_question" => simple(SimpleSlot::PenKeyQuestion),
        "pen_key_exclamation" => simple(SimpleSlot::PenKeyExclamation),
        "pen_key_enter" => simple(SimpleSlot::PenKeyEnter),
        "pen_key_backspace" => simple(SimpleSlot::PenKeyBackspace),
        "pen_key_undo" => simple(SimpleSlot::PenKeyUndo),
        _ => s
            .strip_prefix("pen_down_")
            .and_then(|n| n.parse::<u32>().ok())
            .map(AssetSlot::pen_down)
            .or_else(|| {
                s.strip_prefix("kb_down_")
                    .and_then(|n| n.parse::<u32>().ok())
                    .map(AssetSlot::kb_down)
            }),
    }
}

fn main() {
    let mut args = std::env::args().skip(1);
    let data_dir = PathBuf::from(args.next().expect("app_data_dir 인자 필요"));
    let assets_dir = data_dir.join("assets");
    let mut demo = false;
    for arg in args {
        if arg == "--demo-settings" {
            demo = true;
            continue;
        }
        if let Some(slot) = arg.strip_prefix("remove=") {
            let slot = parse_slot(slot).unwrap_or_else(|| panic!("알 수 없는 슬롯: {slot}"));
            match assets::remove(&assets_dir, slot) {
                Ok(m) => println!("제거 {slot:?} (항목 {})", m.entries.len()),
                Err(e) => println!("제거 실패 {slot:?}: {e}"),
            }
            continue;
        }
        let (slot, path) = arg.split_once('=').expect("slot=path 형식");
        let slot = parse_slot(slot).unwrap_or_else(|| panic!("알 수 없는 슬롯: {slot}"));
        match assets::import(&assets_dir, slot, Path::new(path)) {
            Ok(m) => println!(
                "등록 {slot:?} ← {path}  (캔버스 {:?}, 항목 {})",
                m.canvas,
                m.entries.len()
            ),
            Err(e) => println!("실패 {slot:?} ← {path}: {e}"),
        }
    }
    if demo {
        let path = data_dir.join("settings.json");
        let state = Mutex::new(settings::load_or_default(&path));
        settings::update(&state, &path, |s: &mut Settings| {
            s.idle_seconds = settings::IDLE_SECONDS_MIN;
            // 마우스 파츠는 캐릭터 왼쪽(이미지 왼쪽 아래, 둥근 마우스 위) — 2026-09-23 사용자 캡처 기준.
            // shoulder = 회전축, part_pos = 마우스 파츠 그림을 놓을 캔버스 좌표(왼쪽 위 모서리).
            s.mouse = Some(MouseSettings {
                shoulder: Point { x: 620.0, y: 530.0 },
                area: settings::default_mouse().area,
                part_pos: settings::default_mouse().part_pos,
                hand: Some(Point { x: 495.0, y: 570.0 }), // 펜 쥔 손 조각의 손 중심
                pen_pos: None,
                pen_mode: false,
            });
        })
        .expect("settings 저장");
        println!(
            "데모 설정 저장: {} (idle {}s, 마우스 파츠 on(왼쪽 팔))",
            path.display(),
            settings::IDLE_SECONDS_MIN
        );
    }
    let m = assets::load_manifest(&assets_dir).expect("manifest");
    println!(
        "최종 manifest: 캔버스 {:?}, 항목 {}",
        m.canvas,
        m.entries.len()
    );
    for e in &m.entries {
        println!(
            "  {:12} {}×{} {} bytes  {}",
            e.slot.file_key(),
            e.width,
            e.height,
            e.bytes,
            e.file_name
        );
    }
}
