# Notification System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the BlobBoss notification system to use a two-phase approach (OS notification → popup), add snooze/acknowledgment buttons, make the blob kawaii, and fix popup sizing.

**Architecture:** The timer backend fires an OS notification first, waits 60s, then shows a decorated popup. New Tauri commands handle snooze (with escalation) and "doing it now" (shrink to mini-state). The frontend gets a kawaii blob SVG redesign, larger layout, and new button actions.

**Tech Stack:** Tauri 2.x (Rust), vanilla HTML/CSS/JS, tauri-plugin-notification, tauri-plugin-store

## Global Constraints

- Tauri 2.x API (not v1)
- No JS frameworks — vanilla only
- Windows target (NSIS installer)
- All state persisted via tauri-plugin-store

---

### Task 1: Update Tauri Window Configuration

**Files:**
- Modify: `src-tauri/tauri.conf.json`

**Interfaces:**
- Consumes: nothing
- Produces: Main window configured as 550x600, decorated, not always-on-top, not skip-taskbar, starts hidden

- [ ] **Step 1: Update main window config**

In `src-tauri/tauri.conf.json`, replace the `windows` array entry:

```json
{
  "label": "main",
  "title": "BlobBoss",
  "width": 550,
  "height": 600,
  "visible": false,
  "resizable": true,
  "decorations": true,
  "alwaysOnTop": false,
  "skipTaskbar": false,
  "center": true
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: update main window config for notification redesign"
```

---

### Task 2: Add Backend State & Commands for Snooze and "Doing It Now"

**Files:**
- Modify: `src-tauri/src/state.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: Existing `AppState`, `dismiss` command pattern
- Produces:
  - `AppState.doing_exercise: Mutex<bool>` — flag for "I'm doing it now" state
  - `snooze(app: AppHandle, minutes: u32)` — Tauri command that hides popup, schedules return at current_stage+1
  - `start_doing(app: AppHandle)` — Tauri command that sets doing_exercise=true, stops escalation, hides main window
  - `finish_doing(app: AppHandle, pushups: u32, squats: u32)` — Tauri command that logs reps, resets state like `dismiss(true)`

- [ ] **Step 1: Add `doing_exercise` field to AppState**

In `src-tauri/src/state.rs`, add to the `AppState` struct:

```rust
pub doing_exercise: Mutex<bool>,
```

Add to `Default` impl:

```rust
doing_exercise: Mutex::new(false),
```

Add to `load()` method's returned struct:

```rust
doing_exercise: Mutex::new(false),
```

- [ ] **Step 2: Add `snooze` command in lib.rs**

```rust
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
```

- [ ] **Step 3: Add `start_doing` command in lib.rs**

```rust
#[tauri::command]
fn start_doing(app: tauri::AppHandle) {
    let state = app.state::<AppState>();
    *state.doing_exercise.lock().unwrap() = true;
    *state.current_stage.lock().unwrap() = 0;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }

    let _ = app.emit("doing-exercise-started", ());
}
```

- [ ] **Step 4: Add `finish_doing` command in lib.rs**

```rust
#[tauri::command]
fn finish_doing(app: tauri::AppHandle, pushups: u32, squats: u32) {
    let state = app.state::<AppState>();
    *state.doing_exercise.lock().unwrap() = false;

    drop(state);
    dismiss(app, true, pushups, squats);
}
```

- [ ] **Step 5: Register new commands in invoke_handler**

Update the `.invoke_handler()` call:

```rust
.invoke_handler(tauri::generate_handler![dismiss, get_state, update_settings, get_timer_remaining, snooze, start_doing, finish_doing])
```

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/state.rs src-tauri/src/lib.rs
git commit -m "feat: add snooze, start_doing, finish_doing backend commands"
```

---

### Task 3: Redesign Timer for Two-Phase Notification (OS First, Popup After 60s)

**Files:**
- Modify: `src-tauri/src/timer.rs`

**Interfaces:**
- Consumes: `AppState.current_stage`, `AppState.doing_exercise`
- Produces:
  - `resize_for_stage(app: &AppHandle, stage: u8)` — made `pub` for use by `snooze` command
  - Timer fires OS notification at t=0, waits 60s, then shows popup at stage 1
  - Escalation stages: stage 2 at +120s, stage 3 at +180s, stage 4 at +180s (from popup appearance)

- [ ] **Step 1: Make `resize_for_stage` pub and update sizes**

```rust
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
```

- [ ] **Step 2: Update `start_timer` to use two-phase approach**

Replace the `if remaining == 0` block in `start_timer`:

```rust
if remaining == 0 {
    // Check if user is currently doing exercise
    {
        let state = app.state::<AppState>();
        if *state.doing_exercise.lock().unwrap() {
            // Don't fire while user is actively exercising
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

    // Check if dismissed during the 60s wait (e.g., user acted on OS notification)
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
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/timer.rs
git commit -m "feat: two-phase notification (OS first, popup after 60s)"
```

---

### Task 4: Kawaii Blob SVG Redesign

**Files:**
- Modify: `src/blob.js`

**Interfaces:**
- Consumes: nothing
- Produces: `BlobCharacter` class with same API (`setStage`, `setStreak`, `celebrate`, `lookSad`) but kawaii SVG design

- [ ] **Step 1: Replace the `render()` method with kawaii blob SVG**

```javascript
render() {
  this.container.innerHTML = `
    <svg viewBox="0 0 200 200" id="blob-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="blob-gradient" cx="50%" cy="35%">
          <stop offset="0%" id="grad-inner" stop-color="#c8f7c0"/>
          <stop offset="100%" id="grad-outer" stop-color="#7ed67a"/>
        </radialGradient>
        <radialGradient id="blush-gradient">
          <stop offset="0%" stop-color="#ffb3b3" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#ffb3b3" stop-opacity="0"/>
        </radialGradient>
        <filter id="blob-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.15"/>
        </filter>
        <filter id="eye-glow">
          <feGaussianBlur stdDeviation="0.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g id="blob-group" filter="url(#blob-shadow)">
        <path id="blob-body" d="M100,28 C145,28 172,55 175,98 C178,141 150,172 100,174 C50,172 22,141 25,98 C28,55 55,28 100,28 Z" fill="url(#blob-gradient)"/>
        <g id="blob-face">
          <!-- Big kawaii eyes -->
          <ellipse id="eye-left" cx="72" cy="92" rx="14" ry="15" fill="#2d2d2d"/>
          <ellipse id="eye-right" cx="128" cy="92" rx="14" ry="15" fill="#2d2d2d"/>
          <!-- Large primary highlights -->
          <ellipse id="eye-left-shine" cx="67" cy="85" rx="6" ry="7" fill="white" opacity="0.9"/>
          <ellipse id="eye-right-shine" cx="123" cy="85" rx="6" ry="7" fill="white" opacity="0.9"/>
          <!-- Small secondary highlights -->
          <circle cx="78" cy="97" r="3" fill="white" opacity="0.6"/>
          <circle cx="134" cy="97" r="3" fill="white" opacity="0.6"/>
          <!-- Blush cheeks -->
          <ellipse id="blush-left" cx="52" cy="112" rx="12" ry="8" fill="url(#blush-gradient)"/>
          <ellipse id="blush-right" cx="148" cy="112" rx="12" ry="8" fill="url(#blush-gradient)"/>
          <!-- Small kawaii mouth -->
          <path id="mouth" d="M93,130 Q100,137 107,130" stroke="#2d2d2d" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </g>
        <g id="accessories"></g>
      </g>
    </svg>
  `;
}
```

- [ ] **Step 2: Update `setStage()` for new eye dimensions**

```javascript
setStage(stage) {
  this.stage = stage;
  const svg = this.container.querySelector('#blob-svg');
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
    mouth.setAttribute('d', 'M90,133 Q100,126 110,133');
    eyeL.setAttribute('rx', '11');
    eyeL.setAttribute('ry', '12');
    eyeR.setAttribute('rx', '11');
    eyeR.setAttribute('ry', '12');
  } else {
    gradInner.setAttribute('stop-color', '#c8f7c0');
    gradOuter.setAttribute('stop-color', '#7ed67a');
    mouth.setAttribute('d', 'M93,130 Q100,137 107,130');
    eyeL.setAttribute('rx', '14');
    eyeL.setAttribute('ry', '15');
    eyeR.setAttribute('rx', '14');
    eyeR.setAttribute('ry', '15');
  }
}
```

- [ ] **Step 3: Update `lookSad()` for new mouth position**

```javascript
lookSad() {
  const svg = this.container.querySelector('#blob-svg');
  const mouth = this.container.querySelector('#mouth');
  mouth.setAttribute('d', 'M93,136 Q100,129 107,136');
  svg.classList.add('sad');
  setTimeout(() => {
    svg.classList.remove('sad');
    mouth.setAttribute('d', 'M93,130 Q100,137 107,130');
  }, 1500);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/blob.js
git commit -m "feat: kawaii blob redesign with big eyes, blush cheeks, small mouth"
```

---

### Task 5: Redesign Frontend Layout and Add New Action Buttons

**Files:**
- Modify: `src/index.html`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `snooze(minutes)`, `start_doing()`, `finish_doing(pushups, squats)` Tauri commands; `doing-exercise-started` event
- Produces: Updated popup UI with snooze buttons, "I'm doing it now" button, proper text display, and mini "doing" state

- [ ] **Step 1: Update index.html for better layout**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BlobBoss</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="streak-display"></div>
  <div id="app">
    <div id="blob-container"></div>
    <div id="message"></div>
    <div id="actions"></div>
  </div>
  <div id="doing-state" class="hidden">
    <div id="doing-blob-container"></div>
    <p>You're doing great! Tap when done.</p>
    <button class="btn btn-primary" id="btn-finish-doing">Done!</button>
  </div>
  <script type="module" src="main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Replace main.js with updated logic**

```javascript
import { BlobCharacter } from './blob.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { getCurrentWindow } = window.__TAURI__.window;

const blob = new BlobCharacter(document.getElementById('blob-container'));
const message = document.getElementById('message');
const actions = document.getElementById('actions');
const streakDisplay = document.getElementById('streak-display');
const doingState = document.getElementById('doing-state');
const appEl = document.getElementById('app');

const STAGE_MESSAGES = [
  '',
  'Hey! Time to move!',
  'Come on, get up! Your body needs this!',
  "I'm getting ANGRY! DO YOUR EXERCISES!",
  'I WILL NOT BE IGNORED!!!'
];

let currentExercises = '30 pushups + 30 squats';
let defaultPushups = 30;
let defaultSquats = 30;
let currentStage = 0;

async function init() {
  const state = await invoke('get_state');
  blob.setStreak(state.streak);
  currentExercises = state.settings.exercises;
  defaultPushups = state.settings.default_pushups;
  defaultSquats = state.settings.default_squats;
  updateStreakDisplay(state.streak);

  if (state.stage > 0) {
    showReminder(state.stage);
  }
}

function updateStreakDisplay(streak) {
  streakDisplay.textContent = streak > 0 ? `${streak} today` : '';
}

function showReminder(stage) {
  currentStage = stage;
  doingState.classList.add('hidden');
  appEl.classList.remove('hidden');

  blob.setStage(stage);
  if (stage === 4) {
    document.body.classList.add('stage-4-active');
  } else {
    document.body.classList.remove('stage-4-active');
  }

  message.innerHTML = `
    <div class="reminder-text">${STAGE_MESSAGES[stage]}</div>
    <div class="exercise-text">${currentExercises}</div>
  `;

  const snoozeDisabled = stage >= 4;
  actions.innerHTML = `
    <div class="rep-inputs">
      <div class="rep-field">
        <label>Pushups</label>
        <input type="number" id="input-pushups" value="${defaultPushups}" min="0" max="999">
      </div>
      <div class="rep-field">
        <label>Squats</label>
        <input type="number" id="input-squats" value="${defaultSquats}" min="0" max="999">
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" id="btn-done">I did them!</button>
      <button class="btn btn-doing" id="btn-doing">I'm doing it now!</button>
    </div>
    <div class="btn-row secondary-row">
      <button class="btn btn-secondary" id="btn-skip">Skip</button>
      ${snoozeDisabled ? '' : `
        <div class="snooze-group">
          <span class="snooze-label">Snooze:</span>
          <button class="btn btn-snooze" data-minutes="1">1m</button>
          <button class="btn btn-snooze" data-minutes="2">2m</button>
          <button class="btn btn-snooze" data-minutes="3">3m</button>
          <button class="btn btn-snooze" data-minutes="5">5m</button>
        </div>
      `}
    </div>
  `;

  document.getElementById('btn-done').onclick = () => handleDismiss(true);
  document.getElementById('btn-doing').onclick = () => handleStartDoing();
  document.getElementById('btn-skip').onclick = () => handleDismiss(false);

  if (!snoozeDisabled) {
    document.querySelectorAll('.btn-snooze').forEach(btn => {
      btn.onclick = () => handleSnooze(parseInt(btn.dataset.minutes, 10));
    });
  }

  const win = getCurrentWindow();
  win.show();
  win.setFocus();
}

async function handleDismiss(didExercise) {
  const pushups = didExercise ? parseInt(document.getElementById('input-pushups').value, 10) || 0 : 0;
  const squats = didExercise ? parseInt(document.getElementById('input-squats').value, 10) || 0 : 0;

  if (didExercise) {
    blob.celebrate();
  } else {
    blob.lookSad();
  }

  await invoke('dismiss', { didExercise, pushups, squats });

  setTimeout(async () => {
    const state = await invoke('get_state');
    blob.setStreak(state.streak);
    updateStreakDisplay(state.streak);
    blob.setStage(0);
    document.body.classList.remove('stage-4-active');
    message.textContent = '';
    actions.innerHTML = '';
    const win = getCurrentWindow();
    win.hide();
  }, 1500);
}

async function handleSnooze(minutes) {
  await invoke('snooze', { minutes });
  const win = getCurrentWindow();
  win.hide();
  message.textContent = '';
  actions.innerHTML = '';
  blob.setStage(0);
}

async function handleStartDoing() {
  await invoke('start_doing');
  appEl.classList.add('hidden');
  doingState.classList.remove('hidden');

  const win = getCurrentWindow();
  win.setSize(new window.__TAURI__.window.LogicalSize(280, 200));
  win.setAlwaysOnTop(false);
  win.center();
}

document.getElementById('btn-finish-doing').onclick = async () => {
  doingState.classList.add('hidden');
  appEl.classList.remove('hidden');

  const win = getCurrentWindow();
  win.setSize(new window.__TAURI__.window.LogicalSize(550, 600));
  win.center();

  actions.innerHTML = `
    <div class="rep-inputs">
      <div class="rep-field">
        <label>Pushups</label>
        <input type="number" id="input-pushups" value="${defaultPushups}" min="0" max="999">
      </div>
      <div class="rep-field">
        <label>Squats</label>
        <input type="number" id="input-squats" value="${defaultSquats}" min="0" max="999">
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" id="btn-log-reps">Log & Celebrate!</button>
    </div>
  `;
  message.innerHTML = '<div class="reminder-text">Great job! How many did you do?</div>';
  blob.setStage(0);

  document.getElementById('btn-log-reps').onclick = async () => {
    const pushups = parseInt(document.getElementById('input-pushups').value, 10) || 0;
    const squats = parseInt(document.getElementById('input-squats').value, 10) || 0;

    blob.celebrate();
    await invoke('finish_doing', { pushups, squats });

    setTimeout(async () => {
      const state = await invoke('get_state');
      blob.setStreak(state.streak);
      updateStreakDisplay(state.streak);
      message.textContent = '';
      actions.innerHTML = '';
      const win = getCurrentWindow();
      win.hide();
    }, 1500);
  };
};

listen('escalation-stage', (event) => {
  showReminder(event.payload);
});

init();
```

- [ ] **Step 3: Commit**

```bash
git add src/index.html src/main.js
git commit -m "feat: add snooze, doing-it-now buttons, and improved popup layout"
```

---

### Task 6: Update CSS for New Layout and Buttons

**Files:**
- Modify: `src/style.css`

**Interfaces:**
- Consumes: New HTML structure from Task 5
- Produces: Styled layout that fills 550x600 properly, snooze buttons, doing state, reminder text sizing

- [ ] **Step 1: Replace style.css with updated styles**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Segoe UI', sans-serif;
  overflow: hidden;
  background: #ffffff;
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
  gap: 20px;
  width: 100%;
  height: 100%;
  padding: 30px;
}

#app.hidden, .hidden {
  display: none !important;
}

#blob-container {
  width: 220px;
  height: 220px;
}

#blob-svg {
  width: 100%;
  height: 100%;
}

#message {
  text-align: center;
  color: #333;
}

.reminder-text {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.exercise-text {
  font-size: 1.1rem;
  color: #555;
  font-weight: 500;
}

#actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 400px;
}

.btn {
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, background 0.2s;
}

.btn:hover {
  filter: brightness(1.05);
}

.btn:active { transform: scale(0.95); }

.btn-primary {
  background: #4caf50;
  color: white;
  font-size: 1.1rem;
  padding: 14px 32px;
}

.btn-doing {
  background: #2196f3;
  color: white;
  padding: 12px 24px;
}

.btn-secondary {
  background: #eee;
  color: #666;
  font-size: 0.9rem;
  padding: 10px 20px;
}

.btn-snooze {
  background: #fff3e0;
  color: #e65100;
  font-size: 0.85rem;
  padding: 8px 14px;
  border-radius: 8px;
}

.btn-snooze:hover {
  background: #ffe0b2;
}

.rep-inputs {
  display: flex;
  gap: 16px;
  margin-bottom: 4px;
}

.rep-field {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.rep-field label {
  font-size: 0.8rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rep-field input {
  width: 80px;
  padding: 8px 10px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1.2rem;
  text-align: center;
  font-weight: 600;
}

.rep-field input:focus {
  outline: none;
  border-color: #4caf50;
}

.btn-row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
}

.secondary-row {
  margin-top: 4px;
}

.snooze-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.snooze-label {
  font-size: 0.8rem;
  color: #999;
  margin-right: 2px;
}

/* Doing state */
#doing-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100vh;
  padding: 20px;
  text-align: center;
}

#doing-state p {
  font-size: 1rem;
  color: #555;
  font-weight: 500;
}

#doing-blob-container {
  width: 80px;
  height: 80px;
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
.streak-sparkle #blob-face ellipse[id^="eye-"] {
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

/* Screen shake for stage 4 */
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

/* Streak display */
#streak-display {
  font-size: 0.9rem;
  color: #666;
  position: absolute;
  top: 12px;
  right: 18px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/style.css
git commit -m "feat: update CSS for larger popup, snooze buttons, doing state"
```

---

### Task 7: Update dismiss command window size reset

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: New window size (550x600)
- Produces: `dismiss` resets window to 550x600 and re-enables decorations

- [ ] **Step 1: Update window reset in dismiss function**

In `lib.rs`, change the dismiss function's window reset at the bottom:

```rust
if let Some(window) = app.get_webview_window("main") {
    let _ = window.set_decorations(true);
    let _ = window.set_always_on_top(false);
    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(550.0, 600.0)));
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "fix: reset window to correct size and decorations on dismiss"
```

---

### Task 8: Build Verification

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: All prior tasks
- Produces: Verified build

- [ ] **Step 1: Run cargo check**

```bash
cd src-tauri && cargo check
```

Fix any compilation errors.

- [ ] **Step 2: Run the app for smoke test**

```bash
cd src-tauri && cargo tauri dev
```

Verify:
- App starts, tray icon appears
- After timer expires: OS notification fires, no popup for 60 seconds
- After 60s: popup appears at 550x600 with title bar
- Blob is kawaii (big eyes, blush, small mouth)
- All buttons visible: "I did them!", "I'm doing it now!", "Skip", snooze (1m-5m)
- Snooze hides window, returns escalated
- "I'm doing it now" shrinks to mini state
- "Done!" in mini state shows rep logging, then celebrates and hides

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address build issues from notification redesign"
```
