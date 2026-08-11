# Notification System Redesign

## Summary

Redesign the BlobBoss notification/reminder system to be less intrusive at first contact, provide snooze and acknowledgment options, make the blob character cuter (kawaii-style), and ensure the popup is large enough to display all content properly.

## Notification Flow

### Phase 1: OS Notification Only (t=0)

When the timer expires, send ONLY a system tray notification via `tauri-plugin-notification`. No window is shown. The notification title is "BlobBoss" with a brief reminder message (e.g., "Time for your exercises!").

### Phase 2: Popup Stage 1 — Gentle (t+60s)

If the user has not interacted with the OS notification within 60 seconds, show the popup window:

- **Size:** 550x600 pixels
- **Window type:** Decorated (standard title bar with close/minimize/maximize buttons)
- **Always-on-top:** No
- **Skip taskbar:** No (appears in taskbar)
- **Movable:** Yes (via title bar)
- Content: kawaii blob, reminder text, action buttons

### Phase 3: Popup Stage 2 — Poke (t+180s, 2 min after popup appears)

- Blob starts bouncing animation
- Window becomes always-on-top

### Phase 4: Popup Stage 3 — Annoyed (t+360s, 3 min after stage 2)

- Blob turns red, vibrates, eyes narrow
- Window grows larger

### Phase 5: Popup Stage 4 — Takeover (t+540s, 3 min after stage 3)

- Near-fullscreen (90% of screen)
- Screen shake effect
- Modal behavior (cannot be easily dismissed)

## Action Buttons

All buttons visible from Stage 1 onward:

### "I'm doing it now!"

1. Popup shrinks to a small non-intrusive widget-like state (similar to the existing floating widget)
2. Escalation stops
3. Widget shows a "Done!" button
4. When user clicks "Done!" — shows rep logging form (pushups/squats inputs)
5. After logging — celebrate animation, dismiss, reset timer, increment streak

### "I did them!"

Same as current behavior:
1. Show rep logging inputs
2. Celebrate animation
3. Dismiss, reset timer, increment streak

### "Snooze"

- Presents options: 1, 2, 3, 4, 5 minutes (as individual buttons or a dropdown)
- Dismisses the popup immediately
- After the selected duration, popup returns ONE STAGE MORE ESCALATED than when it was snoozed
  - Snoozed at Stage 1 → returns at Stage 2
  - Snoozed at Stage 2 → returns at Stage 3
  - Snoozed at Stage 3 → returns at Stage 4
  - Snoozed at Stage 4 → cannot snooze (button disabled/hidden)

### "Skip"

Same as current behavior:
1. Blob looks sad animation
2. Dismiss, reset timer, streak resets to 0

## Kawaii Blob Redesign

Replace the current blob SVG with a cuter kawaii-style design:

### Body
- Rounder, softer shape with smoother curves
- Pastel green gradient (lighter, softer than current)
- Slightly squished/pudgy proportions
- Softer drop shadow

### Eyes
- Significantly larger than current (roughly 40% of face width)
- Large dark irises with multiple highlight spots (star or circle shapes)
- Subtle gradient on irises for depth
- Gentle curved upper eyelid lines

### Cheeks
- Two rosy pink ellipses positioned below and to the outside of each eye
- Soft edges (slight blur or opacity)

### Mouth
- Small, simple curved arc (much smaller than current)
- Happy: tiny upward curve
- Sad: tiny downward curve
- Excited: small open circle (o-shape)

### Retained Features
- Streak accessories (crown at 5+, sparkles at 3+, rainbow aura at 10+)
- Stage-based color shifts (green → red at stages 3-4)
- All existing CSS animations (wobble, bounce, vibrate, grow, celebrate, sad)

## Window Size by Stage

| Stage | Size | Decorations | Always-on-top |
|-------|------|-------------|---------------|
| 1 (Gentle) | 550x600 | Yes (title bar) | No |
| 2 (Poke) | 550x600 | Yes (title bar) | Yes |
| 3 (Annoyed) | 650x700 | Yes (title bar) | Yes |
| 4 (Takeover) | 90% screen | No (borderless) | Yes |

## Backend Changes (timer.rs)

- Remove immediate popup show from stage 1 trigger
- Add 60-second delay between OS notification and first popup
- Add snooze command: accepts duration (1-5 min) and current stage, schedules return at stage+1
- Add "doing it now" command: hides main window, shows widget-like mini state, stops escalation
- Add "done after doing" command: triggers rep logging flow from the mini state

## Frontend Changes

### main.js / index.html
- Add snooze button group (1-5 min options)
- Add "I'm doing it now" button
- Handle transition to mini/widget state
- Handle return from mini state to rep logging
- Ensure all text content fits within the larger window dimensions
- Proper text wrapping and spacing for reminder messages

### blob.js
- Complete SVG redesign for kawaii style
- Larger eyes with sparkle highlights
- Add blush cheek elements
- Smaller mouth path
- Softer body path curves
- Maintain stage/streak visual change system

### style.css
- Update animations for new blob proportions
- Ensure button layout works at new window sizes
- Add styles for snooze button group
- Add styles for "doing it now" mini state

## Tauri Configuration Changes (tauri.conf.json)

- Main window: change default size to 550x600
- Main window: enable decorations (`"decorations": true`)
- Main window: disable skip-taskbar (`"skipTaskbar": false`)
- Main window: set `"alwaysOnTop": false` (will be toggled programmatically at stage 2+)

## State Tracking

New fields needed in app state:
- `snooze_stage`: tracks what stage to return to after snooze
- `snooze_timer`: handle for the snooze countdown
- `doing_exercise`: boolean flag for "I'm doing it now" state
- `notification_sent_at`: timestamp of OS notification to track the 60s delay
