//! 오버레이 창 위치 저장·복원(OV-R-13)과 `set_settings` 위치 불간섭(§2.1.1).
//!
//! [목적] 드래그 이동이 멎으면 위치를 설정에 저장하고, 앱 시작 때 저장된 위치로 복원한다
//!        (화면 밖이면 기본 위치). `set_settings`가 들어온 설정의 낡은 위치로 창을 옮기지
//!        않도록 위치만 core 메모리 현재값으로 유지하는 순수 병합 함수도 제공한다.
//! [공개 API] `MOVE_SAVE_DEBOUNCE`, `MIN_VISIBLE_PX`, `resolve_overlay_position`(순수),
//!        `restore_overlay_position`, `watch_overlay_moves`, `persist_overlay_position`,
//!        `keep_overlay_position`(순수), `keep_core_owned`(순수, SV2-05), `reset_overlay_position`(SV2-06).
//! [스레드] `watch_overlay_moves`가 저장 스레드 `overlay-move-saver` 1개를 spawn한다.
//!        메인 스레드의 `on_window_event` 클로저는 채널에 `send`만 하고 잠금·IO·로그를
//!        하지 않는다. 저장 스레드는 `recv`/`recv_timeout`으로 블로킹 대기한다(바쁜 대기 없음).
//! [저수준 호출] 없음. 이동 감지는 Tauri `WindowEvent::Moved`, 모니터는 `available_monitors()`.
//! [저장] `persist_overlay_position`·`reset_overlay_position`은 `settings::update`(CR-047) 하나로
//!        저장한다 — 잠금 안에서 검증·원자적 교체·메모리 대입이 끝난다.
//! [에러] `WindowError::{NotFound, Tauri, StatePoisoned, Settings, Thread}`
//!        (모듈 상위 `mod.rs` 정의).
//! [설정] 읽음: `overlay.x/y/visible`, `Settings::default().overlay`(화면 밖 폴백). 씀:
//!        `overlay.x/y`(이동이 500ms 멎은 뒤 값이 다를 때만, 시작 시 화면 밖 보정 때).
//! [테스트] 단위: `resolve_overlay_position` U1~U8, `intersection` U9, `MoveDebounce` U10~U12,
//!        `is_minimized_sentinel` U13, `run_saver` U14, `keep_overlay_position` K1~K5. 통합:
//!        `persist_overlay_position` I1~I4(tempdir). `restore_overlay_position`·
//!        `watch_overlay_moves`는 Tauri 런타임 의존이라 자동 테스트하지 않는다(수동 체크리스트
//!        는 설계 문서 §8.3 참조).

use std::path::Path;
use std::sync::mpsc::{self, Receiver, RecvTimeoutError};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{AppHandle, PhysicalPosition, Position};

use crate::settings::Settings;

use super::{Point, ScreenBounds, WindowError};

/// 이동이 멎었다고 판단하기까지의 대기 시간.
pub const MOVE_SAVE_DEBOUNCE: Duration = Duration::from_millis(500);
/// 모니터 교집합 가로·세로가 이 값 이상이면 "보인다"고 판단한다.
pub const MIN_VISIBLE_PX: u32 = 48;
/// Windows 가 최소화된 창에 주는 좌표(양쪽 모두 이 이하).
const MINIMIZED_COORD: i32 = -32000;

fn is_minimized_sentinel(p: Point) -> bool {
    p.x <= MINIMIZED_COORD && p.y <= MINIMIZED_COORD
}

/// 두 사각형의 교집합. 겹치지 않으면 `None`.
fn intersection(a: &ScreenBounds, b: &ScreenBounds) -> Option<ScreenBounds> {
    let x1 = a.x.max(b.x);
    let y1 = a.y.max(b.y);
    let x2 = (a.x + a.width as i32).min(b.x + b.width as i32);
    let y2 = (a.y + a.height as i32).min(b.y + b.height as i32);
    if x2 <= x1 || y2 <= y1 {
        return None;
    }
    Some(ScreenBounds {
        x: x1,
        y: y1,
        width: (x2 - x1) as u32,
        height: (y2 - y1) as u32,
    })
}

/// 저장된 위치가 화면 안에서 잡을 수 있는 자리에 있는지 판단해 적용할 위치를 정한다(순수).
///
/// 규칙(설계 §2.1): 모니터 정보가 없으면 저장값 그대로. 창 사각형과 모니터 사각형의 교집합
/// 가로·세로가 `min(MIN_VISIBLE_PX, 창 크기)` 이상인 모니터가 하나라도 있으면 저장값을 유지한다.
/// 아니면 기본 위치(`Settings::default().overlay`)로 되돌린다.
pub fn resolve_overlay_position(
    saved: Point,
    width: u32,
    height: u32,
    monitors: &[ScreenBounds],
) -> Point {
    if monitors.is_empty() {
        return saved;
    }
    let rect = ScreenBounds {
        x: saved.x,
        y: saved.y,
        width,
        height,
    };
    let min_w = MIN_VISIBLE_PX.min(width);
    let min_h = MIN_VISIBLE_PX.min(height);
    let visible = monitors.iter().any(|m| match intersection(&rect, m) {
        Some(i) => i.width >= min_w && i.height >= min_h,
        None => false,
    });
    if visible {
        saved
    } else {
        super::default_overlay_position()
    }
}

/// 앱 시작 시 1회: 저장된 위치를 화면 밖 보정 후 적용하고, 실제로 적용한 위치를 반환한다.
///
/// `outer_size()`가 실제 표시 크기를 돌려주려면 `resize_overlay`가 먼저 호출돼 있어야 한다
/// (설계 §4 시작 순서 0단계).
pub fn restore_overlay_position(
    app: &AppHandle,
    saved: &crate::settings::OverlaySettings,
) -> Result<Point, WindowError> {
    let win = super::overlay(app)?;
    let size = win.outer_size()?;
    let monitors = super::list_monitors(app)?;
    let pos = resolve_overlay_position(
        Point {
            x: saved.x,
            y: saved.y,
        },
        size.width,
        size.height,
        &monitors,
    );
    win.set_position(Position::Physical(PhysicalPosition { x: pos.x, y: pos.y }))?;
    if saved.visible {
        win.show()?;
    } else {
        win.hide()?;
    }
    Ok(pos)
}

/// 디바운스 순수 상태. 시각을 인자로 받아 테스트 가능하게 한다.
struct MoveDebounce {
    pending: Option<(Point, Instant)>,
    delay: Duration,
}

impl MoveDebounce {
    fn new(delay: Duration) -> Self {
        Self {
            pending: None,
            delay,
        }
    }

    /// 대기 위치를 최신값으로 교체하고 시각을 갱신한다.
    fn push(&mut self, pos: Point, now: Instant) {
        self.pending = Some((pos, now));
    }

    /// 대기 위치가 없으면 `None`(무기한 대기), 있으면 남은 시간(최소 0).
    fn wait_for(&self, now: Instant) -> Option<Duration> {
        self.pending.map(|(_, t)| {
            let elapsed = now.saturating_duration_since(t);
            self.delay.saturating_sub(elapsed)
        })
    }

    /// 마지막 push 후 `delay` 이상 지났으면 꺼내고 비운다.
    fn take_if_settled(&mut self, now: Instant) -> Option<Point> {
        match self.pending {
            Some((p, t)) if now.saturating_duration_since(t) >= self.delay => {
                self.pending = None;
                Some(p)
            }
            _ => None,
        }
    }

    /// 채널이 닫혔을 때 남은 위치를 꺼낸다.
    fn take(&mut self) -> Option<Point> {
        self.pending.take().map(|(p, _)| p)
    }
}

/// 저장 스레드 루프. 채널이 닫히면 남은 위치를 flush 하고 종료한다.
fn run_saver<F: Fn(Point)>(rx: Receiver<Point>, delay: Duration, on_settled: F) {
    let mut debounce = MoveDebounce::new(delay);
    loop {
        let now = Instant::now();
        let recv_result = match debounce.wait_for(now) {
            None => rx.recv().map_err(|_| RecvTimeoutError::Disconnected),
            Some(remaining) => rx.recv_timeout(remaining),
        };
        match recv_result {
            Ok(p) => debounce.push(p, Instant::now()),
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => {
                if let Some(p) = debounce.take() {
                    on_settled(p);
                }
                return;
            }
        }
        if let Some(p) = debounce.take_if_settled(Instant::now()) {
            on_settled(p);
        }
    }
}

/// 오버레이 창 이동을 감시해 500ms 멎은 뒤 `on_settled`를 1회 부른다.
///
/// 앱 수명 동안 1회만 호출한다(호출자 = setup). 두 번 부르면 저장 스레드가 둘이 된다.
pub fn watch_overlay_moves<F>(app: &AppHandle, on_settled: F) -> Result<(), WindowError>
where
    F: Fn(Point) + Send + 'static,
{
    let win = super::overlay(app)?;
    let (tx, rx) = mpsc::channel::<Point>();
    std::thread::Builder::new()
        .name("overlay-move-saver".to_string())
        .spawn(move || run_saver(rx, MOVE_SAVE_DEBOUNCE, on_settled))
        .map_err(WindowError::Thread)?;
    win.on_window_event(move |event| {
        if let tauri::WindowEvent::Moved(p) = event {
            let pos = Point { x: p.x, y: p.y };
            if !is_minimized_sentinel(pos) {
                // SEND 실패(수신 스레드 종료)는 앱 종료 중일 뿐이므로 무시한다.
                let _ = tx.send(pos);
            }
        }
    });
    Ok(())
}

/// 위치가 바뀌었으면 메모리에 반영하고 파일에 저장한다. 같으면 아무것도 하지 않는다.
///
/// 저장은 `settings::update`(CR-047) 하나로 한다 — 검증·원자적 교체·메모리 대입이 잠금 하나
/// 안에서 끝난다(settings.md §3.9.6 S2).
pub fn persist_overlay_position(
    settings: &Mutex<Settings>,
    path: &Path,
    pos: Point,
) -> Result<Option<Settings>, WindowError> {
    let out = crate::settings::update(settings, path, |s| {
        s.overlay.x = pos.x;
        s.overlay.y = pos.y;
    })?;
    Ok(out.changed.then_some(out.settings))
}

/// `incoming`의 `overlay.x/y`만 `current`(core 메모리) 값으로 바꿔 반환한다(순수).
///
/// 위치의 주인은 창(core)이다 — `set_settings`가 낡은 사본의 x/y로 창을 옮기지 않도록,
/// 위치를 제외한 나머지 필드(`visible` 포함)는 `incoming` 값을 그대로 쓴다(설계 §2.1.1).
pub fn keep_overlay_position(incoming: Settings, current: &Settings) -> Settings {
    Settings {
        overlay: crate::settings::OverlaySettings {
            x: current.overlay.x,
            y: current.overlay.y,
            ..incoming.overlay
        },
        ..incoming
    }
}

/// `set_settings` 입력에서 core 만 바꾸는 필드를 현재값으로 되돌린다(순수, SV2-05).
///
/// 대상: `overlay.x/y`(위치 주인 = 창, `keep_overlay_position`이 처리), `autostart`(주인 =
/// `set_autostart`·시작 보정, tray.md §7). `language`·`position_lock`·`show_in_taskbar` 는
/// `set_settings`가 그대로 바꿀 수 있다.
pub fn keep_core_owned(incoming: Settings, current: &Settings) -> Settings {
    Settings {
        autostart: current.autostart,
        ..keep_overlay_position(incoming, current)
    }
}

/// 기본 위치로 옮기고 저장한다(SV2-06). 표시·잠금·작업표시줄은 바꾸지 않는다. 숨김이어도,
/// 위치 잠금 중에도 옮긴다(프로그램 이동). 이미 기본 위치면 저장 없이 현재 스냅샷을 돌려준다.
pub fn reset_overlay_position(
    app: &AppHandle,
    settings: &Mutex<Settings>,
    path: &Path,
) -> Result<Settings, WindowError> {
    let pos = super::default_overlay_position();
    super::overlay(app)?
        .set_position(Position::Physical(PhysicalPosition { x: pos.x, y: pos.y }))?;
    let out = crate::settings::update(settings, path, |s| {
        s.overlay.x = pos.x;
        s.overlay.y = pos.y;
    })?;
    Ok(out.settings)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn monitor_a() -> ScreenBounds {
        ScreenBounds {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        }
    }

    fn monitor_b() -> ScreenBounds {
        ScreenBounds {
            x: -1920,
            y: 0,
            width: 1920,
            height: 1080,
        }
    }

    const WIN_W: u32 = 450;
    const WIN_H: u32 = 350;

    #[test]
    fn u1_resolve_inside_monitor_kept() {
        let saved = Point { x: 500, y: 300 };
        assert_eq!(
            resolve_overlay_position(saved, WIN_W, WIN_H, &[monitor_a()]),
            saved
        );
    }

    #[test]
    fn u2_resolve_edge_barely_visible_kept() {
        let saved = Point { x: 1860, y: 100 };
        assert_eq!(
            resolve_overlay_position(saved, WIN_W, WIN_H, &[monitor_a()]),
            saved
        );
    }

    #[test]
    fn u3_resolve_edge_not_enough_visible_falls_back() {
        let saved = Point { x: 1880, y: 100 };
        let fallback = Settings::default().overlay;
        assert_eq!(
            resolve_overlay_position(saved, WIN_W, WIN_H, &[monitor_a()]),
            Point {
                x: fallback.x,
                y: fallback.y
            }
        );
    }

    #[test]
    fn u4_resolve_off_all_monitors_falls_back() {
        let saved = Point { x: -1500, y: 200 };
        let fallback = Settings::default().overlay;
        assert_eq!(
            resolve_overlay_position(saved, WIN_W, WIN_H, &[monitor_a()]),
            Point {
                x: fallback.x,
                y: fallback.y
            }
        );
    }

    #[test]
    fn u5_resolve_visible_on_secondary_monitor_kept() {
        let saved = Point { x: -1500, y: 200 };
        assert_eq!(
            resolve_overlay_position(saved, WIN_W, WIN_H, &[monitor_a(), monitor_b()]),
            saved
        );
    }

    #[test]
    fn u6_resolve_above_screen_falls_back() {
        let saved = Point { x: 100, y: -330 };
        let fallback = Settings::default().overlay;
        assert_eq!(
            resolve_overlay_position(saved, WIN_W, WIN_H, &[monitor_a()]),
            Point {
                x: fallback.x,
                y: fallback.y
            }
        );
    }

    #[test]
    fn u7_resolve_no_monitor_info_kept() {
        let saved = Point { x: -5000, y: -5000 };
        assert_eq!(resolve_overlay_position(saved, WIN_W, WIN_H, &[]), saved);
    }

    #[test]
    fn u8_resolve_small_window_uses_window_size_as_min() {
        let saved = Point { x: 10, y: 10 };
        assert_eq!(
            resolve_overlay_position(saved, 30, 30, &[monitor_a()]),
            saved
        );
    }

    #[test]
    fn u9_intersection_overlap_and_none() {
        let overlap = ScreenBounds {
            x: 1900,
            y: 0,
            width: 100,
            height: 100,
        };
        assert_eq!(
            intersection(&monitor_a(), &overlap),
            Some(ScreenBounds {
                x: 1900,
                y: 0,
                width: 20,
                height: 100
            })
        );
        let far = ScreenBounds {
            x: 5000,
            y: 0,
            width: 10,
            height: 10,
        };
        assert_eq!(intersection(&monitor_a(), &far), None);
    }

    #[test]
    fn u10_debounce_wait_for_returns_remaining() {
        let t0 = Instant::now();
        let mut d = MoveDebounce::new(Duration::from_millis(500));
        d.push(Point { x: 1, y: 1 }, t0);
        assert_eq!(
            d.wait_for(t0 + Duration::from_millis(100)),
            Some(Duration::from_millis(400))
        );
    }

    #[test]
    fn u11_debounce_settles_on_latest_push() {
        let t0 = Instant::now();
        let mut d = MoveDebounce::new(Duration::from_millis(500));
        let p1 = Point { x: 1, y: 1 };
        let p2 = Point { x: 2, y: 2 };
        d.push(p1, t0);
        d.push(p2, t0 + Duration::from_millis(300));
        assert_eq!(d.take_if_settled(t0 + Duration::from_millis(700)), None);
        assert_eq!(d.take_if_settled(t0 + Duration::from_millis(800)), Some(p2));
        assert_eq!(d.wait_for(t0 + Duration::from_millis(900)), None);
    }

    #[test]
    fn u12_debounce_take_flushes_once() {
        let mut d = MoveDebounce::new(Duration::from_millis(500));
        d.push(Point { x: 1, y: 1 }, Instant::now());
        assert!(d.take().is_some());
        assert!(d.take().is_none());
    }

    #[test]
    fn u13_is_minimized_sentinel() {
        assert!(is_minimized_sentinel(Point {
            x: -32000,
            y: -32000
        }));
        assert!(!is_minimized_sentinel(Point { x: -1920, y: 0 }));
    }

    #[test]
    fn u14_run_saver_flushes_latest_on_disconnect() {
        use std::sync::{Arc, Mutex as StdMutex};
        let (tx, rx) = mpsc::channel::<Point>();
        let p1 = Point { x: 1, y: 1 };
        let p2 = Point { x: 2, y: 2 };
        tx.send(p1).expect("send p1");
        tx.send(p2).expect("send p2");
        drop(tx);
        let calls: Arc<StdMutex<Vec<Point>>> = Arc::new(StdMutex::new(Vec::new()));
        let calls_clone = calls.clone();
        run_saver(rx, Duration::from_millis(10), move |p| {
            calls_clone.lock().expect("lock").push(p);
        });
        let recorded = calls.lock().expect("lock");
        assert_eq!(recorded.as_slice(), &[p2]);
    }

    fn settings_with_overlay(x: i32, y: i32, visible: bool) -> Settings {
        Settings {
            overlay: crate::settings::OverlaySettings { x, y, visible },
            ..Settings::default()
        }
    }

    #[test]
    fn i1_persist_no_change_returns_none_and_no_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let m = Mutex::new(Settings::default());
        let result =
            persist_overlay_position(&m, &path, Point { x: 100, y: 100 }).expect("persist ok");
        assert_eq!(result, None);
        assert!(!path.exists());
    }

    #[test]
    fn i2_persist_change_saves_and_updates_memory() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let m = Mutex::new(Settings::default());
        let result = persist_overlay_position(&m, &path, Point { x: 300, y: 400 })
            .expect("persist ok")
            .expect("changed");
        assert_eq!(result.overlay.x, 300);
        assert_eq!(result.overlay.y, 400);
        let loaded = crate::settings::load(&path)
            .expect("load ok")
            .expect("some");
        assert_eq!(loaded.overlay.x, 300);
        assert_eq!(loaded.overlay.y, 400);
        assert_eq!(m.lock().expect("lock").overlay.x, 300);
        assert_eq!(result.scale, Settings::default().scale);
    }

    #[test]
    fn i3_persist_same_position_again_is_noop() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let m = Mutex::new(Settings::default());
        persist_overlay_position(&m, &path, Point { x: 300, y: 400 }).expect("first");
        let modified_before = std::fs::metadata(&path).expect("meta").modified().ok();
        let result = persist_overlay_position(&m, &path, Point { x: 300, y: 400 }).expect("second");
        assert_eq!(result, None);
        let modified_after = std::fs::metadata(&path).expect("meta").modified().ok();
        assert_eq!(modified_before, modified_after);
    }

    #[test]
    fn i4_persist_poisoned_lock_returns_error() {
        let m = std::sync::Arc::new(Mutex::new(Settings::default()));
        let m_clone = m.clone();
        let handle = std::thread::spawn(move || {
            let _g = m_clone.lock().expect("lock");
            panic!("poison it");
        });
        let _ = handle.join();
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let result = persist_overlay_position(&m, &path, Point { x: 1, y: 1 });
        // CR-047: settings::update 이 SettingsError::StatePoisoned 을 내고, WindowError::Settings
        // 로 옮겨 붙는다(#[from]) — WindowError::StatePoisoned 직접 변형이 아니다.
        assert!(matches!(
            result,
            Err(WindowError::Settings(
                crate::settings::SettingsError::StatePoisoned
            ))
        ));
    }

    #[test]
    fn k1_keep_overlay_position_overrides_stale_default_xy() {
        let cur = settings_with_overlay(1500, 800, true);
        let mut incoming = cur.clone();
        incoming.scale = 1.5;
        incoming.overlay = crate::settings::OverlaySettings {
            x: 100,
            y: 100,
            visible: true,
        };
        let merged = keep_overlay_position(incoming, &cur);
        assert_eq!(merged.overlay.x, 1500);
        assert_eq!(merged.overlay.y, 800);
        assert_eq!(merged.scale, 1.5);
    }

    #[test]
    fn k2_keep_overlay_position_ignores_any_incoming_xy() {
        let cur = settings_with_overlay(1500, 800, true);
        let mut incoming = cur.clone();
        incoming.overlay = crate::settings::OverlaySettings {
            x: -1920,
            y: 0,
            visible: true,
        };
        let merged = keep_overlay_position(incoming, &cur);
        assert_eq!(merged.overlay.x, 1500);
        assert_eq!(merged.overlay.y, 800);
    }

    #[test]
    fn k3_keep_overlay_position_preserves_incoming_visible() {
        let cur = settings_with_overlay(1500, 800, true);
        let mut incoming = cur.clone();
        incoming.overlay = crate::settings::OverlaySettings {
            x: 100,
            y: 100,
            visible: false,
        };
        let merged = keep_overlay_position(incoming, &cur);
        assert!(!merged.overlay.visible);
        assert_eq!(merged.overlay.x, 1500);
        assert_eq!(merged.overlay.y, 800);
    }

    #[test]
    fn k4_keep_overlay_position_leaves_other_fields_from_incoming() {
        let cur = settings_with_overlay(1500, 800, true);
        let mut incoming = cur.clone();
        incoming.idle_seconds = 999;
        incoming.mouse = None;
        incoming.autostart = true;
        incoming.scale = 0.5;
        let merged = keep_overlay_position(incoming.clone(), &cur);
        assert_eq!(merged.idle_seconds, incoming.idle_seconds);
        assert_eq!(merged.mouse, incoming.mouse);
        assert_eq!(merged.autostart, incoming.autostart);
        assert_eq!(merged.scale, incoming.scale);
    }

    #[test]
    fn k5_keep_overlay_position_remerge_uses_latest_memory() {
        let cur = settings_with_overlay(1500, 800, true);
        let mut incoming = cur.clone();
        incoming.scale = 1.5;
        incoming.overlay = crate::settings::OverlaySettings {
            x: 100,
            y: 100,
            visible: true,
        };
        let merged = keep_overlay_position(incoming, &cur);

        let cur2 = settings_with_overlay(1600, 900, true);
        let merged2 = keep_overlay_position(merged, &cur2);
        assert_eq!(merged2.overlay.x, 1600);
        assert_eq!(merged2.overlay.y, 900);
        assert_eq!(merged2.scale, 1.5);
    }

    fn cur_with_autostart(x: i32, y: i32, autostart: bool) -> Settings {
        Settings {
            overlay: crate::settings::OverlaySettings {
                x,
                y,
                visible: false,
            },
            autostart,
            ..Settings::default()
        }
    }

    #[test]
    fn k6_keep_core_owned_keeps_autostart_and_position() {
        let cur = cur_with_autostart(1500, 800, false);
        let mut incoming = cur.clone();
        incoming.autostart = true;
        incoming.overlay = crate::settings::OverlaySettings {
            x: 100,
            y: 100,
            visible: false,
        };
        incoming.scale = 1.5;
        incoming.language = crate::settings::Language::Ja;
        incoming.position_lock = true;
        incoming.show_in_taskbar = true;

        let merged = keep_core_owned(incoming, &cur);
        assert!(!merged.autostart);
        assert_eq!(merged.overlay.x, 1500);
        assert_eq!(merged.overlay.y, 800);
        assert!(!merged.overlay.visible);
        assert_eq!(merged.scale, 1.5);
        assert_eq!(merged.language, crate::settings::Language::Ja);
        assert!(merged.position_lock);
        assert!(merged.show_in_taskbar);
    }

    #[test]
    fn k7_keep_core_owned_remerge_uses_latest_autostart() {
        let cur = cur_with_autostart(1500, 800, false);
        let mut incoming = cur.clone();
        incoming.autostart = true;
        incoming.overlay = crate::settings::OverlaySettings {
            x: 100,
            y: 100,
            visible: false,
        };
        let merged = keep_core_owned(incoming, &cur);

        let cur2 = cur_with_autostart(1600, 900, true);
        let merged2 = keep_core_owned(merged, &cur2);
        assert!(merged2.autostart);
        assert_eq!(merged2.overlay.x, 1600);
        assert_eq!(merged2.overlay.y, 900);
    }

    #[test]
    fn d1_default_overlay_position_is_settings_default() {
        let p = super::super::default_overlay_position();
        let d = Settings::default().overlay;
        assert_eq!(p, Point { x: 100, y: 100 });
        assert_eq!(p, Point { x: d.x, y: d.y });
    }

    #[test]
    fn d2_resolve_fallback_uses_default_overlay_position() {
        let saved = Point { x: -1500, y: 200 };
        assert_eq!(
            resolve_overlay_position(saved, WIN_W, WIN_H, &[monitor_a()]),
            super::super::default_overlay_position()
        );
    }
}
