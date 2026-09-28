//! 마감 시각 스레드 — 카운트다운 0 도달·끝남 만료를 감지한다(CR-048 TM-06).
//!
//! [목적] `Timer::next_wake`가 돌려주는 다음 마감까지 자다가, 마감에 닿으면 `on_due`를 부른다.
//!        할 일이 없으면(`None`) 무기한 잔다 — 주기 깨움·주기 emit이 없다(02-design §10).
//! [공개 API] `TimerWaker`(`wake`), `spawn(next_wake, on_due) -> io::Result<TimerWaker>`.
//! [스레드] 전용 OS 스레드 `timer-deadline` 1개. 잠금·Tauri를 모른다 — 콜백 2개만 받는다(T-D12).
//! [unsafe] 없음.
//! [에러] `spawn`은 `std::io::Error`(스레드 생성 실패)만 낸다.
//! [설정] 없음.
//! [테스트] 실제 스레드로 D1~D4(마감 호출·재계산·유휴 무호출·waker drop 시 종료).

use std::sync::mpsc::{self, RecvTimeoutError};
use std::time::Instant;

/// 마감 스레드를 깨우는 손잡이. 복제 가능, `Send + Sync`(std `mpsc::Sender`는 Rust 1.72부터
/// `Sync`). 스레드가 끝났으면(수신 끊김) `wake()`는 조용히 무시한다.
#[derive(Clone)]
pub struct TimerWaker {
    tx: mpsc::Sender<()>,
}

impl TimerWaker {
    /// 다음 마감을 다시 계산하게 한다.
    pub fn wake(&self) {
        let _ = self.tx.send(());
    }
}

/// 마감 시각 스레드를 띄운다. `next_wake`: 다음 마감(없으면 `None`) 조회. `on_due`: 마감 도달 시
/// 호출(호출자가 `tick` + 바뀌면 publish한다). 콜백은 잠금을 쥔 채 불리지 않는다 — 콜백 **안에서**
/// 잠그고 곧바로 푼다.
pub fn spawn(
    next_wake: impl Fn() -> Option<Instant> + Send + 'static,
    on_due: impl Fn() + Send + 'static,
) -> std::io::Result<TimerWaker> {
    let (tx, rx) = mpsc::channel::<()>();
    std::thread::Builder::new()
        .name("timer-deadline".into())
        .spawn(move || loop {
            let got = match next_wake() {
                Some(t) => rx.recv_timeout(t.saturating_duration_since(Instant::now())),
                None => rx.recv().map_err(|_| RecvTimeoutError::Disconnected),
            };
            match got {
                Ok(()) => {}
                Err(RecvTimeoutError::Timeout) => on_due(),
                Err(RecvTimeoutError::Disconnected) => break,
            }
        })?;
    Ok(TimerWaker { tx })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};
    use std::time::Duration;

    /// D1
    #[test]
    fn driver_calls_on_due_at_deadline() {
        let start = Instant::now();
        let called = Arc::new(Mutex::new(false));
        let arrival = Arc::new(Mutex::new(None::<Instant>));
        let (done_tx, done_rx) = mpsc::channel::<()>();

        let called_nw = Arc::clone(&called);
        let deadline = start + Duration::from_millis(100);
        let next_wake = move || {
            if *called_nw.lock().unwrap() {
                None
            } else {
                Some(deadline)
            }
        };
        let arrival_cb = Arc::clone(&arrival);
        let called_cb = Arc::clone(&called);
        let on_due = move || {
            *called_cb.lock().unwrap() = true;
            *arrival_cb.lock().unwrap() = Some(Instant::now());
            let _ = done_tx.send(());
        };

        let waker = spawn(next_wake, on_due).expect("spawn");
        done_rx.recv_timeout(Duration::from_secs(1)).expect("도착");
        let arrived = arrival.lock().unwrap().expect("arrival set");
        let elapsed = arrived.saturating_duration_since(start);
        assert!(elapsed >= Duration::from_millis(100), "elapsed={elapsed:?}");
        assert!(elapsed < Duration::from_millis(150), "elapsed={elapsed:?}");
        drop(waker);
    }

    /// D2
    #[test]
    fn driver_wake_recomputes() {
        let shared: Arc<Mutex<Option<Instant>>> = Arc::new(Mutex::new(None));
        let (done_tx, done_rx) = mpsc::channel::<()>();

        let shared_nw = Arc::clone(&shared);
        let next_wake = move || *shared_nw.lock().unwrap();
        let on_due = move || {
            let _ = done_tx.send(());
        };
        let waker = spawn(next_wake, on_due).expect("spawn");

        *shared.lock().unwrap() = Some(Instant::now() + Duration::from_millis(50));
        waker.wake();

        done_rx.recv_timeout(Duration::from_secs(1)).expect("도착");
    }

    /// D3
    #[test]
    fn driver_idle_never_calls_on_due() {
        let calls = Arc::new(Mutex::new(0u32));
        let calls_cb = Arc::clone(&calls);
        let waker = spawn(|| None, move || *calls_cb.lock().unwrap() += 1).expect("spawn");
        std::thread::sleep(Duration::from_millis(300));
        assert_eq!(*calls.lock().unwrap(), 0);
        drop(waker);
    }

    /// D4
    #[test]
    fn driver_exits_when_waker_dropped() {
        let (done_tx, done_rx) = mpsc::channel::<()>();
        let waker = spawn(
            || None,
            move || {
                let _ = &done_tx;
            },
        )
        .expect("spawn");
        drop(waker);
        assert_eq!(
            done_rx.recv_timeout(Duration::from_secs(1)),
            Err(mpsc::RecvTimeoutError::Disconnected)
        );
    }
}
