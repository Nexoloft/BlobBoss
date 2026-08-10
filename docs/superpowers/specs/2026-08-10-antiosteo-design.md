# AntiOsteo — Exercise Reminder App

## Overview

A Tauri 2.x desktop app shipped as a single `.exe` (~5-10MB) that lives in the system tray and reminds the user to do 30 pushups + 30 squats every 30 minutes. A wobbly blob mascot escalates from gentle to dramatic if ignored. A daily streak counter makes the blob progressively cuter.

## Target Platform

- Windows 11 (single `.exe` via Tauri's bundler)
- Uses WebView2 (pre-installed on Windows 11)

## Architecture

### Backend (Rust / Tauri)

- **Timer management:** 30-minute countdown, resets on dismissal. Tracks elapsed time since last reminder to trigger escalation stages.
- **System tray:** Icon with right-click menu (Settings, Reset Streak, Quit). Tooltip shows current streak count.
- **Auto-start:** Toggle that adds/removes a registry entry under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
- **Persistence:** JSON file stored in Tauri's app data directory. Contains: daily streak count, last completion timestamp, settings (interval, auto-start, exercise text).
- **Window management:** Creates/resizes the popup window at each escalation stage. Stage 4 uses a near-fullscreen always-on-top window.

### Frontend (HTML / CSS / JS)

- Vanilla HTML/CSS/JS — no framework.
- Single `index.html` with the blob character and UI.
- CSS animations drive all blob behavior (wobble, bounce, vibrate, grow, color shifts).
- SVG-based blob shape with animated `path` transforms for organic movement.
- JS handles: receiving events from Tauri backend (stage transitions, streak updates), sending events back (dismissed, skipped).

## Blob Character

The blob is a simple rounded SVG shape with two dot eyes and a small mouth. Its expressiveness comes from CSS transforms and color.

### Resting States (based on streak)

| Streak | Appearance |
|--------|------------|
| 0 | Sleepy — half-closed eyes, slow gentle wobble, pale green |
| 1-2 | Awake — open eyes, slight smile, green |
| 3-4 | Happy — sparkly eyes (CSS shimmer), wide smile, brighter green |
| 5-9 | Proud — tiny SVG crown on top, sparkly eyes, vibrant green |
| 10+ | Legendary — rainbow gradient aura (CSS animation), crown, sparkles |

### Escalation States (when reminder fires)

| Stage | Delay After Reminder | Behavior |
|-------|---------------------|----------|
| 1 — Nudge | 0 min | System tray notification. Blob peeks from bottom-right corner of a small popup. Gentle wobble. |
| 2 — Poke | 2 min ignored | Popup window grows to ~300x300px. Blob bouncing up and down impatiently. Eyes wide. |
| 3 — Annoyed | 5 min ignored | Window grows to ~500x500px. Blob turns orange-red, vibrates aggressively, eyes narrow angrily. |
| 4 — Takeover | 8 min ignored | Near-fullscreen overlay (90% of screen), always-on-top. Blob fills the view, screen shakes via CSS. Mouth open yelling. |

## Interactions

- **"I did them!" button:** Dismisses popup, resets timer, increments daily streak. Blob does a happy celebration animation before closing.
- **"Skip" button (small, de-emphasized):** Dismisses popup, resets timer, does NOT increment streak. Blob looks sad briefly.
- **Tray icon click:** Opens a small status window showing current streak, time until next reminder, and the resting blob.
- **Tray right-click menu:** Settings, Reset Streak, Quit.

## Settings

Accessible from tray right-click → Settings. Opens a small settings window.

- **Timer interval:** Slider or input, 10–120 minutes, default 30.
- **Auto-start with Windows:** Toggle checkbox.
- **Exercises:** Editable text field, default "30 pushups + 30 squats".

## Data Persistence

Single JSON file in Tauri app data directory:

```json
{
  "streak": 4,
  "last_completion": "2026-08-10T14:30:00Z",
  "last_streak_date": "2026-08-10",
  "settings": {
    "interval_minutes": 30,
    "auto_start": false,
    "exercises": "30 pushups + 30 squats"
  }
}
```

Streak resets when `last_streak_date` is not today.

## Build & Distribution

- `cargo tauri build` produces a single `.exe` installer (NSIS) or standalone `.exe`.
- Target: standalone `.exe` that runs without installation if possible, otherwise a minimal NSIS installer.
- No external runtime dependencies (WebView2 is bundled or already present on Win11).

## Scope Boundaries

- No network features, no accounts, no cloud sync.
- No sound (keeps it simple; can add later).
- No multi-monitor handling beyond default window positioning.
- Desktop only — no mobile.
