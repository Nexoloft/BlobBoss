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
  'Hey! Time to move!',
  'Come on, get up! Your body needs this!',
  'I\'m getting ANGRY! DO YOUR EXERCISES!',
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
  blob.setStage(stage);
  if (stage === 4) {
    document.body.classList.add('stage-4-active');
  } else {
    document.body.classList.remove('stage-4-active');
  }
  message.innerHTML = `<div>${STAGE_MESSAGES[stage]}</div><div style="margin-top:8px;font-size:0.9rem;color:#555;">${currentExercises}</div>`;
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
      <button class="btn btn-secondary" id="btn-skip">Skip</button>
    </div>
  `;
  document.getElementById('btn-done').onclick = () => handleDismiss(true);
  document.getElementById('btn-skip').onclick = () => handleDismiss(false);

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

listen('escalation-stage', (event) => {
  showReminder(event.payload);
});

init();
