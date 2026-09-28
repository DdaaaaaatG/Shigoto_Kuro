//! bridge 계층 — ui(React) 와 core(Rust 모듈) 사이의 계약.
//!
//! [목적] 확정사항 §8 — ui 는 이 계층의 command/event 만 본다. core 는 이 계층을 통해서만 밖으로 낸다.
//! [단일 소스] doc/200_설계/bridge/contract.md ↔ 이 모듈(types/commands/events) ↔ src/bridge/*.ts
//! [구성] types.rs(계약 타입 표면), commands/(invoke 핸들러 22개 — mod.rs·tests.rs, v0.3 get_hand_anchor·v0.9 get_monitors·v0.14 reset_overlay_position·v0.21 get_timer·control_timer·set_resting·v0.23 get_alarm_sound·import_alarm_sound·remove_alarm_sound 포함, 800줄 한계로 테스트 분리), events.rs(emit 이름·헬퍼).
//! [unsafe] 없음.

pub mod commands;
pub mod events;
pub mod types;
