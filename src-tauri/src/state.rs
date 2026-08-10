use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub interval_minutes: u32,
    pub auto_start: bool,
    pub exercises: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            interval_minutes: 30,
            auto_start: false,
            exercises: "30 pushups + 30 squats".to_string(),
        }
    }
}

#[derive(Debug)]
pub struct AppState {
    pub streak: Mutex<u32>,
    pub last_streak_date: Mutex<String>,
    pub settings: Mutex<Settings>,
    pub timer_running: Mutex<bool>,
    pub current_stage: Mutex<u8>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            streak: Mutex::new(0),
            last_streak_date: Mutex::new(String::new()),
            settings: Mutex::new(Settings::default()),
            timer_running: Mutex::new(true),
            current_stage: Mutex::new(0),
        }
    }
}
