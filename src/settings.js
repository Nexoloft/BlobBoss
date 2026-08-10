const { invoke } = window.__TAURI__.core;
const { getCurrentWindow } = window.__TAURI__.window;

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

  const win = getCurrentWindow();
  win.close();
});

loadSettings();
