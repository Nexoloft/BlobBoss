mod state;
mod timer;

use state::{AppState, Settings};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager,
};

#[tauri::command]
fn dismiss(app: tauri::AppHandle, did_exercise: bool, pushups: u32, squats: u32) {
    let state = app.state::<AppState>();
    *state.current_stage.lock().unwrap() = 0;

    if did_exercise {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let mut date = state.last_streak_date.lock().unwrap();
        let mut streak = state.streak.lock().unwrap();

        if *date != today {
            *streak = 0;
            *date = today.clone();
        }
        *streak += 1;

        let mut stats = state.lifetime_stats.lock().unwrap();
        stats.total_pushups += pushups as u64;
        stats.total_squats += squats as u64;
        stats.total_sessions += 1;

        if *streak > stats.longest_streak {
            stats.longest_streak = *streak;
        }

        if !stats.active_dates.contains(&today) {
            stats.active_dates.push(today.clone());
            stats.days_active = stats.active_dates.len() as u32;
        }

        if stats.first_active_date.is_empty() {
            stats.first_active_date = today;
        }
    }

    // Reset timer
    {
        let settings = state.settings.lock().unwrap();
        *state.timer_remaining_secs.lock().unwrap() = settings.interval_minutes as u64 * 60;
    }

    state.save(&app);

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_decorations(true);
        let _ = window.set_always_on_top(false);
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(550.0, 600.0)));
    }
}

#[tauri::command]
fn snooze(app: tauri::AppHandle, minutes: u32) {
    let current_stage = {
        let state = app.state::<AppState>();
        let stage = *state.current_stage.lock().unwrap();
        *state.current_stage.lock().unwrap() = 0;
        stage
    };

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }

    let next_stage = (current_stage + 1).min(4);
    let delay_secs = (minutes as u64) * 60;

    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(delay_secs)).await;

        let state = app.state::<AppState>();
        let current = *state.current_stage.lock().unwrap();
        if current != 0 {
            return;
        }
        *state.current_stage.lock().unwrap() = next_stage;
        drop(state);

        let _ = app.emit("escalation-stage", next_stage);
        timer::resize_for_stage(&app, next_stage);
    });
}

#[tauri::command]
fn start_doing(app: tauri::AppHandle) {
    let state = app.state::<AppState>();
    *state.doing_exercise.lock().unwrap() = true;
    *state.current_stage.lock().unwrap() = 0;
}

#[tauri::command]
fn finish_doing(app: tauri::AppHandle, pushups: u32, squats: u32) {
    {
        let state = app.state::<AppState>();
        *state.doing_exercise.lock().unwrap() = false;
    }
    dismiss(app, true, pushups, squats);
}

#[tauri::command]
fn get_state(app: tauri::AppHandle) -> serde_json::Value {
    let state = app.state::<AppState>();
    let streak = *state.streak.lock().unwrap();
    let settings = state.settings.lock().unwrap().clone();
    let stage = *state.current_stage.lock().unwrap();
    let stats = state.lifetime_stats.lock().unwrap().clone();
    let remaining = *state.timer_remaining_secs.lock().unwrap();

    serde_json::json!({
        "streak": streak,
        "stage": stage,
        "settings": settings,
        "lifetime_stats": stats,
        "timer_remaining_secs": remaining
    })
}

#[tauri::command]
fn update_settings(app: tauri::AppHandle, new_settings: Settings) {
    let state = app.state::<AppState>();
    *state.settings.lock().unwrap() = new_settings;
    state.save(&app);
}

#[tauri::command]
fn get_timer_remaining(app: tauri::AppHandle) -> u64 {
    let state = app.state::<AppState>();
    let val = *state.timer_remaining_secs.lock().unwrap();
    val
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![dismiss, get_state, update_settings, get_timer_remaining, snooze, start_doing, finish_doing])
        .setup(|app| {
            let state = AppState::load(&app.handle());
            app.manage(state);

            let dashboard_item = MenuItem::with_id(app, "dashboard", "Dashboard", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let reset_item = MenuItem::with_id(app, "reset", "Reset Streak", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&dashboard_item, &settings_item, &reset_item, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("BlobBoss - Exercise Reminder")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "reset" => {
                        let state = app.state::<AppState>();
                        *state.streak.lock().unwrap() = 0;
                        state.save(app);
                    }
                    "dashboard" => {
                        if let Some(w) = app.get_webview_window("dashboard") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        } else {
                            let _ = tauri::WebviewWindowBuilder::new(
                                app,
                                "dashboard",
                                tauri::WebviewUrl::App("dashboard.html".into()),
                            )
                            .title("BlobBoss Dashboard")
                            .inner_size(420.0, 520.0)
                            .center()
                            .resizable(true)
                            .build();
                        }
                    }
                    "settings" => {
                        if let Some(w) = app.get_webview_window("settings") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        } else {
                            let _ = tauri::WebviewWindowBuilder::new(
                                app,
                                "settings",
                                tauri::WebviewUrl::App("settings.html".into()),
                            )
                            .title("BlobBoss Settings")
                            .inner_size(380.0, 480.0)
                            .center()
                            .resizable(false)
                            .build();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("dashboard") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        } else {
                            let _ = tauri::WebviewWindowBuilder::new(
                                app,
                                "dashboard",
                                tauri::WebviewUrl::App("dashboard.html".into()),
                            )
                            .title("BlobBoss Dashboard")
                            .inner_size(420.0, 520.0)
                            .center()
                            .resizable(true)
                            .build();
                        }
                    }
                })
                .build(app)?;

            timer::start_timer(app.handle().clone());

            // Show widget if enabled
            let show_widget = {
                let state = app.state::<AppState>();
                let val = state.settings.lock().unwrap().show_widget;
                val
            };
            if show_widget {
                let _ = tauri::WebviewWindowBuilder::new(
                    app,
                    "widget",
                    tauri::WebviewUrl::App("widget.html".into()),
                )
                .title("")
                .inner_size(160.0, 60.0)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .transparent(true)
                .resizable(false)
                .build();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
