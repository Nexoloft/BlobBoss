# BlobBoss

A desktop exercise reminder app that nags you to do pushups and squats every 30 minutes. Features an escalating cartoon blob mascot that gets progressively angrier if you ignore it.

## Features

- **Escalating reminders** — starts with a gentle wobble, escalates to screen-shaking full-screen takeover if ignored
- **Cartoon blob mascot** — gets angrier through 4 stages, celebrates when you complete exercises
- **Rep tracking** — log actual pushups/squats per session (editable defaults)
- **Lifetime stats** — total reps, sessions, longest streak, days active, consistency %
- **Achievements** — unlock milestones as you progress
- **Dashboard** — see countdown timer, today's progress, and all-time stats
- **Floating widget** — always-on-top mini countdown timer (configurable position/opacity)
- **Streak system** — blob evolves cosmetically the more you exercise (sparkles, crown, rainbow aura)
- **Windows notifications** — toast notification at stage 1
- **Auto-start** — optional launch on Windows login
- **Single .exe** — lightweight Tauri app (~5-10MB)

## Escalation Stages

| Stage | Delay | Behavior |
|-------|-------|----------|
| 1 — Nudge | 0 min | Small popup, gentle wobble, Windows notification |
| 2 — Poke | 2 min | Window grows, blob bouncing impatiently |
| 3 — Annoyed | 5 min | Larger window, blob turns red and vibrates |
| 4 — Takeover | 8 min | Near-fullscreen, screen shakes, blob fills view |

## Tech Stack

- **Tauri 2.x** (Rust backend + WebView2 frontend)
- **Vanilla HTML/CSS/JS** (no frameworks)
- **SVG + CSS animations** for the blob character
- Windows 11 target

## Development

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) (18+)
- WebView2 (pre-installed on Windows 11)

### Setup

```bash
npm install
```

### Dev mode

```bash
npx tauri dev
```

### Build release

```bash
npx tauri build
```

Output: `src-tauri/target/release/bundle/nsis/BlobBoss_0.1.0_x64-setup.exe`

## Configuration

Right-click the tray icon → Settings:

- **Timer interval** — 1-120 minutes (default: 30)
- **Exercise description** — what shows in the reminder
- **Default reps** — pre-filled pushup/squat counts
- **Widget** — show/hide, position (corner), opacity
- **Auto-start** — launch with Windows

## Project Structure

```
src/                  Frontend (HTML/CSS/JS)
├── index.html        Reminder popup
├── main.js           Event handling + blob control
├── blob.js           BlobCharacter SVG class
├── style.css         Animations + layout
├── dashboard.html    Stats dashboard
├── dashboard.js      Dashboard logic + achievements
├── dashboard.css     Dashboard styling
├── widget.html       Floating mini-widget
├── settings.html     Settings window
├── settings.js       Settings logic
└── settings.css      Settings styling

src-tauri/            Backend (Rust)
├── src/
│   ├── main.rs       Entry point
│   ├── lib.rs        App builder, commands, tray
│   ├── timer.rs      Timer + escalation logic
│   └── state.rs      State management + persistence
├── Cargo.toml        Rust dependencies
└── tauri.conf.json   App configuration
```
