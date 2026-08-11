use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

use crate::state::AppState;

pub fn resize_for_stage(app: &AppHandle, stage: u8) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();

        match stage {
            1 => {
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(550.0, 600.0)));
                let _ = window.set_always_on_top(false);
                let _ = window.set_decorations(true);
                let _ = window.center();
            }
            2 => {
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(550.0, 600.0)));
                let _ = window.set_always_on_top(true);
                let _ = window.center();
            }
            3 => {
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(650.0, 700.0)));
                let _ = window.set_always_on_top(true);
                let _ = window.center();
            }
            4 => {
                let _ = window.set_decorations(false);
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
            tokio::time::sleep(Duration::from_secs(1)).await;

            let is_running = {
                let state = app.state::<AppState>();
                let val = *state.timer_running.lock().unwrap();
                val
            };

            if !is_running {
                continue;
            }

            let remaining = {
                let state = app.state::<AppState>();
                let mut rem = state.timer_remaining_secs.lock().unwrap();
                if *rem > 0 {
                    *rem -= 1;
                }
                *rem
            };

            let _ = app.emit("timer-tick", remaining);

            if remaining == 0 {
                // Don't fire while user is actively exercising
                {
                    let state = app.state::<AppState>();
                    if *state.doing_exercise.lock().unwrap() {
                        let settings = state.settings.lock().unwrap();
                        *state.timer_remaining_secs.lock().unwrap() = settings.interval_minutes as u64 * 60;
                        continue;
                    }
                }

                // Phase 1: OS notification only (no popup)
                let _ = app.notification()
                    .builder()
                    .title("BlobBoss")
                    .body("Hey! Time for your exercises!")
                    .show();

                // Wait 60 seconds before showing popup
                tokio::time::sleep(Duration::from_secs(60)).await;

                // Check if dismissed during the 60s wait
                {
                    let state = app.state::<AppState>();
                    if *state.doing_exercise.lock().unwrap() {
                        let settings = state.settings.lock().unwrap();
                        *state.timer_remaining_secs.lock().unwrap() = settings.interval_minutes as u64 * 60;
                        continue;
                    }
                }

                // Phase 2: Show popup at stage 1
                {
                    let state = app.state::<AppState>();
                    *state.current_stage.lock().unwrap() = 1;
                }
                let _ = app.emit("escalation-stage", 1u8);
                resize_for_stage(&app, 1);

                start_escalation(app.clone()).await;

                // After escalation ends, reset timer
                let interval = {
                    let state = app.state::<AppState>();
                    let settings = state.settings.lock().unwrap();
                    settings.interval_minutes
                };
                let state = app.state::<AppState>();
                *state.timer_remaining_secs.lock().unwrap() = interval as u64 * 60;
            }
        }
    });
}

async fn start_escalation(app: AppHandle) {
    let delays = [120, 180, 180]; // seconds between stage 1→2, 2→3, 3→4

    for (i, delay) in delays.iter().enumerate() {
        tokio::time::sleep(Duration::from_secs(*delay)).await;

        let current = {
            let state = app.state::<AppState>();
            let val = *state.current_stage.lock().unwrap();
            val
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
