const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const ACHIEVEMENTS = [
  { id: 'first', icon: '🎉', label: 'First Session', check: s => s.total_sessions >= 1 },
  { id: 'ten', icon: '💪', label: '10 Sessions', check: s => s.total_sessions >= 10 },
  { id: 'fifty', icon: '🔥', label: '50 Sessions', check: s => s.total_sessions >= 50 },
  { id: 'hundred', icon: '💯', label: '100 Sessions', check: s => s.total_sessions >= 100 },
  { id: 'push500', icon: '🏋️', label: '500 Pushups', check: s => s.total_pushups >= 500 },
  { id: 'push1k', icon: '⭐', label: '1,000 Pushups', check: s => s.total_pushups >= 1000 },
  { id: 'push5k', icon: '🌟', label: '5,000 Pushups', check: s => s.total_pushups >= 5000 },
  { id: 'squat500', icon: '🦵', label: '500 Squats', check: s => s.total_squats >= 500 },
  { id: 'squat1k', icon: '🏆', label: '1,000 Squats', check: s => s.total_squats >= 1000 },
  { id: 'streak5', icon: '🔥', label: '5 Streak', check: s => s.longest_streak >= 5 },
  { id: 'streak10', icon: '🌋', label: '10 Streak', check: s => s.longest_streak >= 10 },
  { id: 'week', icon: '📅', label: '7 Days Active', check: s => s.days_active >= 7 },
  { id: 'month', icon: '🗓️', label: '30 Days Active', check: s => s.days_active >= 30 },
];

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function renderBlobMini(container) {
  container.innerHTML = `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="40%">
          <stop offset="0%" stop-color="#a8e6a0"/>
          <stop offset="100%" stop-color="#4caf50"/>
        </radialGradient>
      </defs>
      <path d="M100,30 C140,30 170,60 170,100 C170,140 140,170 100,170 C60,170 30,140 30,100 C30,60 60,30 100,30 Z" fill="url(#g)"/>
      <circle cx="75" cy="90" r="8" fill="#2d2d2d"/>
      <circle cx="125" cy="90" r="8" fill="#2d2d2d"/>
      <ellipse cx="72" cy="87" rx="3" ry="3" fill="white" opacity="0.8"/>
      <ellipse cx="122" cy="87" rx="3" ry="3" fill="white" opacity="0.8"/>
      <path d="M85,125 Q100,140 115,125" stroke="#2d2d2d" stroke-width="3" fill="none" stroke-linecap="round"/>
    </svg>
  `;
}

function calcConsistency(stats) {
  if (!stats.first_active_date) return '0%';
  const start = new Date(stats.first_active_date);
  const now = new Date();
  const totalDays = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1);
  const pct = Math.round((stats.days_active / totalDays) * 100);
  return `${pct}%`;
}

function renderAchievements(stats) {
  const list = document.getElementById('achievements-list');
  list.innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = a.check(stats);
    return `<div class="achievement ${unlocked ? 'unlocked' : 'locked'}">
      <span class="achievement-icon">${a.icon}</span>
      <span>${a.label}</span>
    </div>`;
  }).join('');
}

async function loadDashboard() {
  const state = await invoke('get_state');
  const stats = state.lifetime_stats;

  document.getElementById('timer-display').textContent = `Next reminder in ${formatTime(state.timer_remaining_secs)}`;
  document.getElementById('today-sessions').textContent = state.streak;
  document.getElementById('today-streak').textContent = state.streak;
  document.getElementById('total-pushups').textContent = stats.total_pushups.toLocaleString();
  document.getElementById('total-squats').textContent = stats.total_squats.toLocaleString();
  document.getElementById('total-sessions').textContent = stats.total_sessions.toLocaleString();
  document.getElementById('longest-streak').textContent = stats.longest_streak;
  document.getElementById('days-active').textContent = stats.days_active;
  document.getElementById('consistency').textContent = calcConsistency(stats);

  renderAchievements(stats);
}

renderBlobMini(document.getElementById('blob-mini'));
loadDashboard();

listen('timer-tick', (event) => {
  document.getElementById('timer-display').textContent = `Next reminder in ${formatTime(event.payload)}`;
});

// Refresh stats when a session is completed
listen('escalation-stage', () => {
  loadDashboard();
});

setInterval(loadDashboard, 30000);
