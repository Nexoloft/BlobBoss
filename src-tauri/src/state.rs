use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub interval_minutes: u32,
    pub auto_start: bool,
    pub exercises: String,
    pub default_pushups: u32,
    pub default_squats: u32,
    pub show_widget: bool,
    pub widget_position: String,
    pub widget_opacity: f64,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            interval_minutes: 30,
            auto_start: false,
            exercises: "30 pushups + 30 squats".to_string(),
            default_pushups: 30,
            default_squats: 30,
            show_widget: true,
            widget_position: "bottom-right".to_string(),
            widget_opacity: 0.9,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LifetimeStats {
    pub total_pushups: u64,
    pub total_squats: u64,
    pub total_sessions: u64,
    pub longest_streak: u32,
    pub days_active: u32,
    pub first_active_date: String,
    pub active_dates: Vec<String>,
}

#[derive(Debug)]
pub struct AppState {
    pub streak: Mutex<u32>,
    pub last_streak_date: Mutex<String>,
    pub settings: Mutex<Settings>,
    pub timer_running: Mutex<bool>,
    pub current_stage: Mutex<u8>,
    pub lifetime_stats: Mutex<LifetimeStats>,
    pub timer_remaining_secs: Mutex<u64>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            streak: Mutex::new(0),
            last_streak_date: Mutex::new(String::new()),
            settings: Mutex::new(Settings::default()),
            timer_running: Mutex::new(true),
            current_stage: Mutex::new(0),
            lifetime_stats: Mutex::new(LifetimeStats::default()),
            timer_remaining_secs: Mutex::new(0),
        }
    }
}

impl AppState {
    pub fn load(app: &AppHandle) -> Self {
        let store = match app.store("data.json") {
            Ok(s) => s,
            Err(_) => return Self::default(),
        };

        let streak = store.get("streak")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;

        let last_streak_date = store.get("last_streak_date")
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_default();

        let settings = store.get("settings")
            .and_then(|v| serde_json::from_value::<Settings>(v.clone()).ok())
            .unwrap_or_default();

        let lifetime_stats = store.get("lifetime_stats")
            .and_then(|v| serde_json::from_value::<LifetimeStats>(v.clone()).ok())
            .unwrap_or_default();

        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let actual_streak = if last_streak_date == today { streak } else { 0 };

        let interval = settings.interval_minutes;

        Self {
            streak: Mutex::new(actual_streak),
            last_streak_date: Mutex::new(if last_streak_date == today { last_streak_date } else { today }),
            settings: Mutex::new(settings),
            timer_running: Mutex::new(true),
            current_stage: Mutex::new(0),
            lifetime_stats: Mutex::new(lifetime_stats),
            timer_remaining_secs: Mutex::new(interval as u64 * 60),
        }
    }

    pub fn save(&self, app: &AppHandle) {
        if let Ok(store) = app.store("data.json") {
            let streak = *self.streak.lock().unwrap();
            let date = self.last_streak_date.lock().unwrap().clone();
            let settings = self.settings.lock().unwrap().clone();
            let stats = self.lifetime_stats.lock().unwrap().clone();

            store.set("streak", serde_json::json!(streak));
            store.set("last_streak_date", serde_json::json!(date));
            store.set("settings", serde_json::json!(settings));
            store.set("lifetime_stats", serde_json::json!(stats));
        }
    }
}
