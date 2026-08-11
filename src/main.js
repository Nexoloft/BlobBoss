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
  await win.setSize(new window.__TAURI__.window.LogicalSize(280, 200));
  await win.setAlwaysOnTop(false);
  await win.center();
}

document.getElementById('btn-finish-doing').onclick = async () => {
  doingState.classList.add('hidden');
  appEl.classList.remove('hidden');

  const win = getCurrentWindow();
  await win.setSize(new window.__TAURI__.window.LogicalSize(550, 600));
  await win.center();

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
