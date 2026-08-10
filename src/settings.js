const { invoke } = window.__TAURI__.core;
const { getCurrentWindow } = window.__TAURI__.window;

const intervalInput = document.getElementById('interval');
const exercisesInput = document.getElementById('exercises');
const defaultPushupsInput = document.getElementById('default-pushups');
const defaultSquatsInput = document.getElementById('default-squats');
const showWidgetInput = document.getElementById('show-widget');
const widgetPositionInput = document.getElementById('widget-position');
const widgetOpacityInput = document.getElementById('widget-opacity');
const autostartInput = document.getElementById('autostart');
const saveBtn = document.getElementById('btn-save');

async function loadSettings() {
  const state = await invoke('get_state');
  const s = state.settings;
  intervalInput.value = s.interval_minutes;
  exercisesInput.value = s.exercises;
  defaultPushupsInput.value = s.default_pushups;
  defaultSquatsInput.value = s.default_squats;
  showWidgetInput.checked = s.show_widget;
  widgetPositionInput.value = s.widget_position;
  widgetOpacityInput.value = s.widget_opacity;
  autostartInput.checked = s.auto_start;
}

saveBtn.addEventListener('click', async () => {
  const newSettings = {
    interval_minutes: parseInt(intervalInput.value, 10),
    auto_start: autostartInput.checked,
    exercises: exercisesInput.value,
    default_pushups: parseInt(defaultPushupsInput.value, 10),
    default_squats: parseInt(defaultSquatsInput.value, 10),
    show_widget: showWidgetInput.checked,
    widget_position: widgetPositionInput.value,
    widget_opacity: parseFloat(widgetOpacityInput.value),
  };
  await invoke('update_settings', { newSettings });

  const win = getCurrentWindow();
  win.close();
});

loadSettings();
