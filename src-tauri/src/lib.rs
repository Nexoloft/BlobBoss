mod state;
mod timer;

use state::{AppState, Settings};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

#[tauri::command]
fn dismiss(app: tauri::AppHandle, did_exercise: bool) {
    let state = app.state::<AppState>();
    *state.current_stage.lock().unwrap() = 0;

    if did_exercise {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let mut date = state.last_streak_date.lock().unwrap();
        let mut streak = state.streak.lock().unwrap();

        if *date != today {
            *streak = 0;
            *date = today;
        }
        *streak += 1;
    }

    state.save(&app);

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(300.0, 300.0)));
    }
}

#[tauri::command]
fn get_state(app: tauri::AppHandle) -> serde_json::Value {
    let state = app.state::<AppState>();
    let streak = *state.streak.lock().unwrap();
    let settings = state.settings.lock().unwrap().clone();
    let stage = *state.current_stage.lock().unwrap();

    serde_json::json!({
        "streak": streak,
        "stage": stage,
        "settings": settings
    })
}

#[tauri::command]
fn update_settings(app: tauri::AppHandle, new_settings: Settings) {
    let state = app.state::<AppState>();
    *state.settings.lock().unwrap() = new_settings;
    state.save(&app);
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![dismiss, get_state, update_settings])
        .setup(|app| {
            let state = AppState::load(&app.handle());
            app.manage(state);

            let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let reset_item = MenuItem::with_id(app, "reset", "Reset Streak", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&settings_item, &reset_item, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("AntiOsteo - Exercise Reminder")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "reset" => {
                        let state = app.state::<AppState>();
                        *state.streak.lock().unwrap() = 0;
                        state.save(app);
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
                            .title("AntiOsteo Settings")
                            .inner_size(350.0, 300.0)
                            .center()
                            .resizable(false)
                            .build();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            timer::start_timer(app.handle().clone());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
