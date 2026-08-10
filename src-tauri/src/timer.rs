use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

use crate::state::AppState;

fn resize_for_stage(app: &AppHandle, stage: u8) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();

        match stage {
            1 => {
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(300.0, 300.0)));
                let _ = window.set_always_on_top(true);
                let _ = window.center();
            }
            2 => {
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(350.0, 350.0)));
                let _ = window.center();
            }
            3 => {
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(500.0, 500.0)));
                let _ = window.center();
            }
            4 => {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let size = monitor.size();
                    let w = size.width as f64 * 0.9;
                    let h = size.height as f64 * 0.9;
                    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(w, h)));
                    let _ = window.center();
                }
            }
            _ => {}
        }
    }
}

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
            resize_for_stage(&app, 1);

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
        resize_for_stage(&app, next_stage);
    }
}
