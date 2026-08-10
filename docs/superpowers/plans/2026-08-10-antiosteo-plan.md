# AntiOsteo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri 2.x desktop app that reminds the user to exercise every 30 minutes with an escalating cartoon blob mascot and daily streak tracking.

**Architecture:** Rust backend handles timer, tray icon, window management, and persistence via tauri-plugin-store. Vanilla HTML/CSS/JS frontend renders the blob character with SVG + CSS animations. Events flow from Rust → JS to trigger escalation stages, and JS → Rust to report dismissals.

**Tech Stack:** Tauri 2.x, Rust, HTML/CSS/JS, SVG, tauri-plugin-store, tauri-plugin-autostart

## Global Constraints

- Windows 11 target, single `.exe` output
- Tauri 2.x (not 1.x) — use `tauri = "2"`, `tauri-build = "2"`
- No JS frameworks — vanilla HTML/CSS/JS only
- No external CSS libraries — all animations are hand-written CSS
- WebView2 is pre-installed on Windows 11, no need to bundle it
- All blob visuals are SVG + CSS transforms (no images/sprites)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/icons/icon.ico`
- Create: `src/index.html`
- Create: `src/main.js`
- Create: `src/style.css`
- Create: `package.json`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: A buildable Tauri app skeleton that opens an empty window

- [ ] **Step 1: Create package.json**

```json
{
  "name": "antiosteo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "tauri": "tauri"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2"
  },
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-autostart": "^2",
    "@tauri-apps/plugin-store": "^2"
  }
}
```

- [ ] **Step 2: Create src-tauri/Cargo.toml**

```toml
[package]
name = "antiosteo"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-autostart = "2"
tauri-plugin-store = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["time"] }
```

- [ ] **Step 3: Create src-tauri/build.rs**

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 4: Create src-tauri/tauri.conf.json**

```json
{
  "$schema": "https://raw.githubusercontent.com/nicedoc/tauri/v2/packages/tauri/schema.json",
  "productName": "AntiOsteo",
  "version": "0.1.0",
  "identifier": "com.antiosteo.app",
  "build": {
    "frontendDist": "../src",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "",
    "beforeBuildCommand": ""
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "AntiOsteo",
        "width": 300,
        "height": 300,
        "visible": false,
        "resizable": false,
        "decorations": false,
        "alwaysOnTop": true,
        "skipTaskbar": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "icon": [
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "installMode": "currentUser"
      }
    }
  }
}
```

- [ ] **Step 5: Create src-tauri/capabilities/default.json**

```json
{
  "identifier": "default",
  "description": "Default permissions for AntiOsteo",
  "windows": ["*"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-close",
    "core:window:allow-set-size",
    "core:window:allow-set-position",
    "core:window:allow-set-focus",
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-set-always-on-top",
    "autostart:allow-enable",
    "autostart:allow-disable",
    "autostart:allow-is-enabled",
    "store:default"
  ]
}
```

- [ ] **Step 6: Create src-tauri/src/main.rs**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    antiosteo_lib::run()
}
```

- [ ] **Step 7: Create src-tauri/src/lib.rs**

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 8: Create minimal src/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AntiOsteo</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <div id="blob-container"></div>
    <div id="message"></div>
    <div id="actions"></div>
  </div>
  <script type="module" src="main.js"></script>
</body>
</html>
```

- [ ] **Step 9: Create empty src/style.css and src/main.js**

```css
/* src/style.css */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Segoe UI', sans-serif;
  overflow: hidden;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
#app {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  height: 100%;
}
```

```javascript
// src/main.js
console.log('AntiOsteo loaded');
```

- [ ] **Step 10: Generate a placeholder icon**

Create a simple 256x256 `.ico` file for the tray. Use a green circle as placeholder. (Generate with any icon tool or use a minimal embedded ICO.)

- [ ] **Step 11: Install dependencies and verify build**

```bash
cd d:/Code/AntiOsteo
npm install
cd src-tauri
cargo build
```

- [ ] **Step 12: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Tauri 2.x project structure"
```

---

### Task 2: System Tray & Timer Backend

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/timer.rs`
- Create: `src-tauri/src/state.rs`

**Interfaces:**
- Consumes: Tauri app skeleton from Task 1
- Produces: `AppState` struct with timer control, tray icon with menu, Rust→JS events `escalation-stage` and `timer-tick`

- [ ] **Step 1: Create src-tauri/src/state.rs**

```rust
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
```

- [ ] **Step 2: Create src-tauri/src/timer.rs**

```rust
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
                *state.timer_running.lock().unwrap()
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
            *state.current_stage.lock().unwrap()
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
```

- [ ] **Step 3: Update src-tauri/src/lib.rs with tray and timer**

```rust
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
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![dismiss, get_state, update_settings])
        .setup(|app| {
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
                    }
                    "settings" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
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
```

- [ ] **Step 4: Add chrono dependency to Cargo.toml**

Add to `[dependencies]`:
```toml
chrono = "0.4"
```

- [ ] **Step 5: Build and verify**

```bash
cd d:/Code/AntiOsteo/src-tauri
cargo build
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add system tray, timer, and escalation backend"
```

---

### Task 3: Blob SVG Character & CSS Animations

**Files:**
- Modify: `src/index.html`
- Modify: `src/style.css`
- Create: `src/blob.js`

**Interfaces:**
- Consumes: HTML shell from Task 1
- Produces: `BlobCharacter` class with methods `setStage(n)`, `setStreak(n)`, `celebrate()`, `lookSad()`

- [ ] **Step 1: Create src/blob.js with BlobCharacter class**

```javascript
export class BlobCharacter {
  constructor(container) {
    this.container = container;
    this.stage = 0;
    this.streak = 0;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <svg viewBox="0 0 200 200" id="blob-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="blob-gradient" cx="50%" cy="40%">
            <stop offset="0%" id="grad-inner" stop-color="#a8e6a0"/>
            <stop offset="100%" id="grad-outer" stop-color="#4caf50"/>
          </radialGradient>
          <filter id="blob-shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="3" flood-opacity="0.2"/>
          </filter>
        </defs>
        <g id="blob-group" filter="url(#blob-shadow)">
          <path id="blob-body" d="M100,30 C140,30 170,60 170,100 C170,140 140,170 100,170 C60,170 30,140 30,100 C30,60 60,30 100,30 Z" fill="url(#blob-gradient)"/>
          <g id="blob-face">
            <circle id="eye-left" cx="75" cy="90" r="8" fill="#2d2d2d"/>
            <circle id="eye-right" cx="125" cy="90" r="8" fill="#2d2d2d"/>
            <ellipse id="eye-left-shine" cx="72" cy="87" rx="3" ry="3" fill="white" opacity="0.8"/>
            <ellipse id="eye-right-shine" cx="122" cy="87" rx="3" ry="3" fill="white" opacity="0.8"/>
            <path id="mouth" d="M85,125 Q100,140 115,125" stroke="#2d2d2d" stroke-width="3" fill="none" stroke-linecap="round"/>
          </g>
          <g id="accessories"></g>
        </g>
      </svg>
    `;
  }

  setStage(stage) {
    this.stage = stage;
    const svg = this.container.querySelector('#blob-svg');
    const body = this.container.querySelector('#blob-body');
    const gradInner = this.container.querySelector('#grad-inner');
    const gradOuter = this.container.querySelector('#grad-outer');
    const mouth = this.container.querySelector('#mouth');
    const eyeL = this.container.querySelector('#eye-left');
    const eyeR = this.container.querySelector('#eye-right');

    svg.classList.remove('stage-1', 'stage-2', 'stage-3', 'stage-4', 'celebrate', 'sad');

    if (stage === 0) return;

    svg.classList.add(`stage-${stage}`);

    if (stage >= 3) {
      gradInner.setAttribute('stop-color', '#ffab91');
      gradOuter.setAttribute('stop-color', '#e53935');
      mouth.setAttribute('d', 'M80,130 Q100,115 120,130');
      eyeL.setAttribute('r', '6');
      eyeR.setAttribute('r', '6');
    } else {
      gradInner.setAttribute('stop-color', '#a8e6a0');
      gradOuter.setAttribute('stop-color', '#4caf50');
      mouth.setAttribute('d', 'M85,125 Q100,140 115,125');
      eyeL.setAttribute('r', '8');
      eyeR.setAttribute('r', '8');
    }
  }

  setStreak(streak) {
    this.streak = streak;
    const accessories = this.container.querySelector('#accessories');
    const svg = this.container.querySelector('#blob-svg');
    accessories.innerHTML = '';

    svg.classList.remove('streak-sparkle', 'streak-rainbow');

    if (streak >= 5) {
      accessories.innerHTML = `
        <polygon points="100,15 105,25 115,25 107,32 110,42 100,36 90,42 93,32 85,25 95,25"
                 fill="#FFD700" stroke="#FFA000" stroke-width="1"/>
      `;
    }
    if (streak >= 3) {
      svg.classList.add('streak-sparkle');
    }
    if (streak >= 10) {
      svg.classList.add('streak-rainbow');
    }
  }

  celebrate() {
    const svg = this.container.querySelector('#blob-svg');
    svg.classList.add('celebrate');
    setTimeout(() => svg.classList.remove('celebrate'), 1500);
  }

  lookSad() {
    const svg = this.container.querySelector('#blob-svg');
    const mouth = this.container.querySelector('#mouth');
    mouth.setAttribute('d', 'M85,135 Q100,120 115,135');
    svg.classList.add('sad');
    setTimeout(() => {
      svg.classList.remove('sad');
      mouth.setAttribute('d', 'M85,125 Q100,140 115,125');
    }, 1500);
  }
}
```

- [ ] **Step 2: Add CSS animations to src/style.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Segoe UI', sans-serif;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  border-radius: 20px;
}

#app {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  height: 100%;
  padding: 20px;
}

#blob-container {
  width: 60%;
  max-width: 200px;
  aspect-ratio: 1;
}

#blob-svg {
  width: 100%;
  height: 100%;
}

#message {
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  color: #333;
}

#actions {
  display: flex;
  gap: 12px;
}

.btn {
  border: none;
  border-radius: 12px;
  padding: 10px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s;
}

.btn:active { transform: scale(0.95); }

.btn-primary {
  background: #4caf50;
  color: white;
}

.btn-secondary {
  background: #eee;
  color: #666;
  font-size: 0.85rem;
}

/* Stage animations */
.stage-1 {
  animation: gentle-wobble 2s ease-in-out infinite;
}

.stage-2 {
  animation: bounce 0.6s ease-in-out infinite;
}

.stage-3 {
  animation: vibrate 0.1s linear infinite;
}

.stage-4 {
  animation: vibrate 0.05s linear infinite, grow-huge 0.5s forwards;
}

@keyframes gentle-wobble {
  0%, 100% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(-3deg) scale(1.02); }
  75% { transform: rotate(3deg) scale(1.02); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

@keyframes vibrate {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-2px, 2px); }
  50% { transform: translate(2px, -2px); }
  75% { transform: translate(-2px, -1px); }
  100% { transform: translate(1px, 2px); }
}

@keyframes grow-huge {
  to { transform: scale(1.5); }
}

/* Streak effects */
.streak-sparkle #blob-face circle {
  animation: sparkle 1s ease-in-out infinite alternate;
}

@keyframes sparkle {
  to { filter: brightness(1.3) drop-shadow(0 0 4px gold); }
}

.streak-rainbow #blob-body {
  animation: rainbow-aura 3s linear infinite;
}

@keyframes rainbow-aura {
  0% { filter: drop-shadow(0 0 8px #ff0000); }
  33% { filter: drop-shadow(0 0 8px #00ff00); }
  66% { filter: drop-shadow(0 0 8px #0000ff); }
  100% { filter: drop-shadow(0 0 8px #ff0000); }
}

/* Celebrate */
.celebrate {
  animation: celebrate-bounce 0.3s ease-in-out 5;
}

@keyframes celebrate-bounce {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.2) rotate(5deg); }
}

/* Sad */
.sad {
  animation: shrink-sad 0.5s ease-in-out;
}

@keyframes shrink-sad {
  50% { transform: scale(0.85); opacity: 0.7; }
}

/* Streak display */
#streak-display {
  font-size: 0.9rem;
  color: #666;
  position: absolute;
  top: 10px;
  right: 16px;
}
```

- [ ] **Step 3: Update src/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AntiOsteo</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="streak-display"></div>
  <div id="app">
    <div id="blob-container"></div>
    <div id="message"></div>
    <div id="actions"></div>
  </div>
  <script type="module" src="main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify blob renders in browser**

Open `src/index.html` directly in a browser to check SVG renders. Add temporary test code in `main.js`:

```javascript
import { BlobCharacter } from './blob.js';

const blob = new BlobCharacter(document.getElementById('blob-container'));
// Test each stage
blob.setStage(1);
setTimeout(() => blob.setStage(2), 2000);
setTimeout(() => blob.setStage(3), 4000);
setTimeout(() => blob.setStage(4), 6000);
setTimeout(() => { blob.setStage(0); blob.setStreak(5); }, 8000);
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add blob SVG character with CSS escalation animations"
```

---

### Task 4: Frontend Logic — Connecting Events to UI

**Files:**
- Modify: `src/main.js`
- Modify: `src/index.html`

**Interfaces:**
- Consumes: `BlobCharacter` class from Task 3, Tauri events `escalation-stage` from Task 2, Tauri commands `dismiss`, `get_state` from Task 2
- Produces: Fully interactive popup — listens for escalation events, shows appropriate UI, sends dismiss commands back

- [ ] **Step 1: Write src/main.js with event handling**

```javascript
import { BlobCharacter } from './blob.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { getCurrentWindow } = window.__TAURI__.window;

const blob = new BlobCharacter(document.getElementById('blob-container'));
const message = document.getElementById('message');
const actions = document.getElementById('actions');
const streakDisplay = document.getElementById('streak-display');

const STAGE_MESSAGES = [
  '',
  'Hey! Time to move! 💪',
  'Come on, get up! Your body needs this!',
  'I\'m getting ANGRY! DO YOUR EXERCISES!',
  'I WILL NOT BE IGNORED!!!'
];

let currentExercises = '30 pushups + 30 squats';

async function init() {
  const state = await invoke('get_state');
  blob.setStreak(state.streak);
  currentExercises = state.settings.exercises;
  updateStreakDisplay(state.streak);

  if (state.stage > 0) {
    showReminder(state.stage);
  }
}

function updateStreakDisplay(streak) {
  streakDisplay.textContent = streak > 0 ? `🔥 ${streak} today` : '';
}

function showReminder(stage) {
  blob.setStage(stage);
  message.innerHTML = `<div>${STAGE_MESSAGES[stage]}</div><div style="margin-top:8px;font-size:0.9rem;color:#555;">${currentExercises}</div>`;
  actions.innerHTML = `
    <button class="btn btn-primary" id="btn-done">I did them!</button>
    <button class="btn btn-secondary" id="btn-skip">Skip</button>
  `;
  document.getElementById('btn-done').onclick = () => handleDismiss(true);
  document.getElementById('btn-skip').onclick = () => handleDismiss(false);

  const win = getCurrentWindow();
  win.show();
  win.setFocus();
}

async function handleDismiss(didExercise) {
  if (didExercise) {
    blob.celebrate();
  } else {
    blob.lookSad();
  }

  await invoke('dismiss', { didExercise });

  setTimeout(async () => {
    const state = await invoke('get_state');
    blob.setStreak(state.streak);
    updateStreakDisplay(state.streak);
    blob.setStage(0);
    message.textContent = '';
    actions.innerHTML = '';
    const win = getCurrentWindow();
    win.hide();
  }, 1500);
}

listen('escalation-stage', (event) => {
  showReminder(event.payload);
});

init();
```

- [ ] **Step 2: Update src/index.html script tag for Tauri**

Ensure the script module works with Tauri's IPC by adding to the `<head>`:

```html
<script>
  // Tauri injects __TAURI__ on the window object
</script>
```

No change actually needed — Tauri 2.x injects `window.__TAURI__` automatically when `withGlobalTauri` is set. Add to `tauri.conf.json` under `app`:

```json
"withGlobalTauri": true
```

- [ ] **Step 3: Update tauri.conf.json to enable global Tauri API**

Add `"withGlobalTauri": true` inside the `"app"` object in `src-tauri/tauri.conf.json`.

- [ ] **Step 4: Build and test end-to-end**

```bash
cd d:/Code/AntiOsteo
npx tauri dev
```

Verify: app starts in tray, after timer fires the window pops up with blob animation, clicking "I did them!" dismisses and increments streak.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: connect frontend to backend events and commands"
```

---

### Task 5: Window Resizing for Escalation Stages

**Files:**
- Modify: `src-tauri/src/timer.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: `escalation-stage` event from Task 2, window management APIs
- Produces: Window automatically resizes at each escalation stage (300→300, 300→300, 500→500, 90% screen)

- [ ] **Step 1: Add window resizing to escalation events in timer.rs**

After each `app.emit("escalation-stage", ...)`, add window resize logic:

```rust
use tauri::Manager;

fn resize_for_stage(app: &AppHandle, stage: u8) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();

        match stage {
            1 => {
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(300.0, 300.0)));
                let _ = window.set_always_on_top(true);
            }
            2 => {
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(350.0, 350.0)));
            }
            3 => {
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(500.0, 500.0)));
            }
            4 => {
                if let Ok(monitor) = window.current_monitor() {
                    if let Some(monitor) = monitor {
                        let size = monitor.size();
                        let w = (size.width as f64 * 0.9) as f64;
                        let h = (size.height as f64 * 0.9) as f64;
                        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(w, h)));
                        let _ = window.center();
                    }
                }
            }
            _ => {}
        }
    }
}
```

- [ ] **Step 2: Call resize_for_stage after each stage emission**

In `start_escalation` and the initial stage 1 trigger, call `resize_for_stage(&app, stage)` right after emitting.

- [ ] **Step 3: Hide and reset window size on dismiss**

In the `dismiss` command handler in `lib.rs`, hide and reset:

```rust
if let Some(window) = app.get_webview_window("main") {
    let _ = window.hide();
    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(300.0, 300.0)));
}
```

- [ ] **Step 4: Test escalation flow**

```bash
npx tauri dev
```

Temporarily set timer to 5 seconds for testing. Verify window grows through stages.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: window resizes through escalation stages"
```

---

### Task 6: Settings Window

**Files:**
- Create: `src/settings.html`
- Create: `src/settings.js`
- Create: `src/settings.css`
- Modify: `src-tauri/tauri.conf.json` (add settings window config)
- Modify: `src-tauri/src/lib.rs` (open settings window from tray)

**Interfaces:**
- Consumes: `update_settings` and `get_state` commands from Task 2, autostart plugin JS API
- Produces: A separate settings window accessible from tray right-click menu

- [ ] **Step 1: Create src/settings.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AntiOsteo Settings</title>
  <link rel="stylesheet" href="settings.css">
</head>
<body>
  <div id="settings-app">
    <h2>Settings</h2>
    <div class="field">
      <label for="interval">Reminder interval (minutes)</label>
      <input type="number" id="interval" min="1" max="120" value="30">
    </div>
    <div class="field">
      <label for="exercises">Exercises</label>
      <input type="text" id="exercises" value="30 pushups + 30 squats">
    </div>
    <div class="field checkbox-field">
      <input type="checkbox" id="autostart">
      <label for="autostart">Start with Windows</label>
    </div>
    <button class="btn btn-primary" id="btn-save">Save</button>
  </div>
  <script type="module" src="settings.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create src/settings.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Segoe UI', sans-serif;
  padding: 24px;
  background: #fafafa;
}
#settings-app {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
h2 { color: #333; margin-bottom: 8px; }
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field label { font-size: 0.9rem; color: #555; }
.field input[type="number"],
.field input[type="text"] {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}
.checkbox-field {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.btn {
  border: none;
  border-radius: 12px;
  padding: 10px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary { background: #4caf50; color: white; }
.btn:active { transform: scale(0.95); }
```

- [ ] **Step 3: Create src/settings.js**

```javascript
const { invoke } = window.__TAURI__.core;

const intervalInput = document.getElementById('interval');
const exercisesInput = document.getElementById('exercises');
const autostartInput = document.getElementById('autostart');
const saveBtn = document.getElementById('btn-save');

async function loadSettings() {
  const state = await invoke('get_state');
  intervalInput.value = state.settings.interval_minutes;
  exercisesInput.value = state.settings.exercises;
  autostartInput.checked = state.settings.auto_start;
}

saveBtn.addEventListener('click', async () => {
  const newSettings = {
    interval_minutes: parseInt(intervalInput.value, 10),
    auto_start: autostartInput.checked,
    exercises: exercisesInput.value,
  };
  await invoke('update_settings', { newSettings });

  // Handle autostart toggle
  if (newSettings.auto_start) {
    const { enable } = await import('@tauri-apps/plugin-autostart');
    await enable();
  } else {
    const { disable } = await import('@tauri-apps/plugin-autostart');
    await disable();
  }

  const win = window.__TAURI__.window.getCurrentWindow();
  win.close();
});

loadSettings();
```

- [ ] **Step 4: Add settings window to tauri.conf.json**

Add a second window entry in `app.windows`:

```json
{
  "label": "settings",
  "title": "AntiOsteo Settings",
  "url": "settings.html",
  "width": 350,
  "height": 300,
  "visible": false,
  "resizable": false,
  "center": true
}
```

- [ ] **Step 5: Update tray "Settings" handler in lib.rs**

```rust
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
        .build();
    }
}
```

- [ ] **Step 6: Test settings window**

```bash
npx tauri dev
```

Right-click tray → Settings. Verify it opens, loads current values, saves, and closes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add settings window with interval, exercises, and autostart"
```

---

### Task 7: Persistence with tauri-plugin-store

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/state.rs`

**Interfaces:**
- Consumes: `tauri-plugin-store` API, `AppState` from Task 2
- Produces: State loads from disk on startup and saves on every change (dismiss, settings update, streak reset)

- [ ] **Step 1: Add load/save functions to state.rs**

```rust
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

impl AppState {
    pub fn load(app: &AppHandle) -> Self {
        let store = app.store("data.json").unwrap();

        let streak = store.get("streak")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as u32;

        let last_streak_date = store.get("last_streak_date")
            .and_then(|v| v.as_str().map(String::from))
            .unwrap_or_default();

        let settings = store.get("settings")
            .and_then(|v| serde_json::from_value::<Settings>(v.clone()).ok())
            .unwrap_or_default();

        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let actual_streak = if last_streak_date == today { streak } else { 0 };

        Self {
            streak: Mutex::new(actual_streak),
            last_streak_date: Mutex::new(if last_streak_date == today { last_streak_date } else { today }),
            settings: Mutex::new(settings),
            timer_running: Mutex::new(true),
            current_stage: Mutex::new(0),
        }
    }

    pub fn save(&self, app: &AppHandle) {
        if let Ok(store) = app.store("data.json") {
            let streak = *self.streak.lock().unwrap();
            let date = self.last_streak_date.lock().unwrap().clone();
            let settings = self.settings.lock().unwrap().clone();

            store.set("streak", serde_json::json!(streak));
            store.set("last_streak_date", serde_json::json!(date));
            store.set("settings", serde_json::json!(settings));
        }
    }
}
```

- [ ] **Step 2: Update lib.rs setup to load state**

Replace `.manage(AppState::default())` with loading from store:

```rust
.setup(|app| {
    let state = AppState::load(&app.handle());
    app.manage(state);
    // ... rest of setup
})
```

- [ ] **Step 3: Add save calls after state mutations**

In the `dismiss` command, after modifying streak:
```rust
let state = app.state::<AppState>();
state.save(&app);
```

In `update_settings`:
```rust
let state = app.state::<AppState>();
state.save(&app);
```

In the tray "reset" handler:
```rust
"reset" => {
    let state = app.state::<AppState>();
    *state.streak.lock().unwrap() = 0;
    state.save(app);
}
```

- [ ] **Step 4: Test persistence**

```bash
npx tauri dev
```

Complete an exercise, quit app, restart. Verify streak is preserved.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: persist streak and settings to disk via tauri-plugin-store"
```

---

### Task 8: System Tray Notification (Stage 1)

**Files:**
- Modify: `src-tauri/Cargo.toml` (add notification plugin)
- Modify: `src-tauri/src/timer.rs`
- Modify: `src-tauri/capabilities/default.json`

**Interfaces:**
- Consumes: Timer escalation from Task 2
- Produces: Windows notification toast at Stage 1 before popup appears

- [ ] **Step 1: Add tauri-plugin-notification**

Add to `Cargo.toml` dependencies:
```toml
tauri-plugin-notification = "2"
```

Add to `lib.rs` builder:
```rust
.plugin(tauri_plugin_notification::init())
```

Add to `capabilities/default.json` permissions:
```json
"notification:default",
"notification:allow-notify",
"notification:allow-request-permission",
"notification:allow-is-permission-granted"
```

- [ ] **Step 2: Send notification at stage 1 in timer.rs**

```rust
use tauri_plugin_notification::NotificationExt;

// At stage 1, before showing window:
let _ = app.notification()
    .builder()
    .title("AntiOsteo")
    .body("Hey! Time for your exercises! 💪")
    .show();
```

- [ ] **Step 3: Test notification**

```bash
npx tauri dev
```

Wait for timer (set short for testing). Verify Windows toast appears.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: show Windows notification at escalation stage 1"
```

---

### Task 9: Polish & Build

**Files:**
- Modify: `src/style.css` (final tweaks)
- Modify: `src-tauri/tauri.conf.json` (bundle config)
- Create: `src-tauri/icons/icon.ico` (proper icon)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Final polished `.exe` ready for distribution

- [ ] **Step 1: Create a proper app icon**

Create a simple green blob icon as an ICO file (256x256, 48x48, 32x32, 16x16 sizes embedded). Use an SVG-to-ICO tool or create a minimal green circle ICO.

- [ ] **Step 2: Ensure window starts hidden on launch**

In `tauri.conf.json`, verify main window has `"visible": false`. The window only shows when an escalation fires.

- [ ] **Step 3: Add screen-shake CSS for stage 4**

Add to `style.css`:
```css
body.stage-4-active {
  animation: screen-shake 0.1s linear infinite;
}

@keyframes screen-shake {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-3px, 3px); }
  50% { transform: translate(3px, -3px); }
  75% { transform: translate(-1px, -2px); }
  100% { transform: translate(2px, 1px); }
}
```

Update `main.js` to add class to body at stage 4:
```javascript
if (stage === 4) {
  document.body.classList.add('stage-4-active');
} else {
  document.body.classList.remove('stage-4-active');
}
```

- [ ] **Step 4: Build release .exe**

```bash
cd d:/Code/AntiOsteo
npx tauri build
```

Output will be in `src-tauri/target/release/bundle/nsis/AntiOsteo_0.1.0_x64-setup.exe`.

- [ ] **Step 5: Test the built .exe**

Run the installer/exe. Verify:
- App starts in system tray
- Timer fires after configured interval
- Escalation stages work (blob grows angrier, window resizes)
- "I did them!" increments streak and blob evolves
- Settings window works
- App persists state between restarts

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: polish UI and configure release build"
```

---

## File Structure Summary

```
d:/Code/AntiOsteo/
├── package.json
├── src/
│   ├── index.html          (main popup window)
│   ├── main.js             (frontend logic + Tauri event handling)
│   ├── blob.js             (BlobCharacter class — SVG + animations)
│   ├── style.css           (all styling + CSS animations)
│   ├── settings.html       (settings window)
│   ├── settings.js         (settings logic)
│   └── settings.css        (settings styling)
└── src-tauri/
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json
    ├── capabilities/
    │   └── default.json
    ├── icons/
    │   └── icon.ico
    └── src/
        ├── main.rs         (entry point)
        ├── lib.rs          (app builder, commands, tray setup)
        ├── timer.rs        (timer + escalation logic)
        └── state.rs        (AppState struct, persistence)
```
