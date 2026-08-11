# BlobBoss (AntiOsteo) — App breakdown

## Purpose
Desktop exercise reminder that nags you to do pushups/squats with an escalating cartoon blob mascot.

## High-level
- **Behavior:** Timer → reminder popup → escalation if ignored → user dismisses (complete/skip) → update streaks/stats.
- **Platform:** Windows desktop via Tauri (single .exe).
- **Repo summary:** See README.md in the project root.

## Tech stack
- **Backend:** Rust + Tauri (async timer, tray, persistence). See `src-tauri/src/lib.rs` and `src-tauri/src/timer.rs`.
- **Frontend:** Vanilla HTML/CSS/JS, SVG animations. Key files: `src/index.html`, `src/main.js`, `src/blob.js`, `src/style.css`.
- **Plugins:** `tauri-plugin-store` (persistence), `tauri-plugin-autostart`, notification plugin.

## Core features
- **Escalating reminders:** 4 stages (Nudge → Poke → Annoyed → Takeover). Triggered in `src-tauri/src/timer.rs` and emitted as `escalation-stage`.
- **Popup UI:** Blob, message, rep inputs, action buttons. Implemented in `src/index.html` + `src/main.js`.
- **"I did them!" / Skip:** `dismiss` command (records reps, updates streak/stats) in `src-tauri/src/lib.rs` and called by `src/main.js`.
- **Blob character:** SVG + CSS that reflects stages and streaks (crown, sparkles, rainbow). See `src/blob.js` and `src/style.css`.
- **Floating widget:** Always-on-top mini timer & streak, configurable. Frontend: `src/widget.html`; widget creation in `src-tauri/src/lib.rs`.
- **Dashboard:** Today + lifetime stats, achievements. See `src/dashboard.html` and `src/dashboard.js`.
- **Settings window:** Timer interval, exercise text, default reps, widget options, autostart toggle. See `src/settings.html` and `src/settings.js`.
- **System tray:** Right-click menu (Dashboard, Settings, Reset Streak, Quit) and left-click opens dashboard — logic in `src-tauri/src/lib.rs`.

## State & persistence
- **Data model:** `Settings`, `LifetimeStats`, `AppState` in `src-tauri/src/state.rs`.
- **Persistence:** JSON store via `tauri-plugin-store` (load/save via `AppState::load` / `save`).
- **Exposed commands:** `get_state`, `dismiss`, `update_settings`, `get_timer_remaining` in `src-tauri/src/lib.rs`.

## Timer & escalation details
- **Tick frequency:** 1s background loop emits `timer-tick` for UI countdowns (`src-tauri/src/timer.rs`).
- **Escalation timing:** initial trigger when remaining == 0, then delays between stages (configured in `start_escalation`).
- **Window resizing per stage:** `resize_for_stage` scales popup up to near-fullscreen at stage 4.

## Stats & achievements
- **Tracked:** total pushups, total squats, sessions, longest streak, days active, first active date (see `LifetimeStats`).
- **Achievements:** defined and rendered in `src/dashboard.js`.

## UX notes
- **Stage 4:** near-fullscreen overlay + CSS screen-shake (`body.stage-4-active` in `src/style.css`).
- **Blob animations:** CSS keyframes (wobble, bounce, vibrate, rainbow).
- **Widget interactions:** double-click refresh; tray click opens dashboard.
- **Autostart:** managed via plugin; toggle available in settings.

## Where to look to extend or modify
- Change timings / escalation logic: `src-tauri/src/timer.rs`.
- Change UI texts / layout / animations: `src/index.html`, `src/style.css`, `src/blob.js`.
- Add/modify achievements: `src/dashboard.js`.
- Persisted schema or defaults: `src-tauri/src/state.rs`.

---

Created from repository analysis on 2026-08-11.
