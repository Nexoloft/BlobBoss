use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

use crate::state::AppState;

pub fn start_timer(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            let interval = {
                let state = app.state::<AppState>();
                let settings = state.settings.lock().unwrap();
                settings.interval_minutes
            };

            tokio::time::sleep(Duration::from_secs(interval as u64 * 60)).await;

            let is_running = {
                let state = app.state::<AppState>();
                let guard = state.timer_running.lock().unwrap();
                *guard
            };

            if !is_running {
                continue;
            }

            {
                let state = app.state::<AppState>();
                *state.current_stage.lock().unwrap() = 1;
            }
            let _ = app.emit("escalation-stage", 1u8);

            start_escalation(app.clone()).await;
        }
    });
}

async fn start_escalation(app: AppHandle) {
    let delays = [120, 180, 180]; // seconds between stage 1→2, 2→3, 3→4

    for (i, delay) in delays.iter().enumerate() {
        tokio::time::sleep(Duration::from_secs(*delay)).await;

        let current = {
            let state = app.state::<AppState>();
            let guard = state.current_stage.lock().unwrap();
            *guard
        };

        if current == 0 {
            return; // dismissed
        }

        let next_stage = (i + 2) as u8;
        {
            let state = app.state::<AppState>();
            *state.current_stage.lock().unwrap() = next_stage;
        }
        let _ = app.emit("escalation-stage", next_stage);
    }
}
