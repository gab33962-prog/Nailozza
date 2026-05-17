/* ═══════════════════════════════════════════════════════════
   TikTok Football Live – Client
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ── OBS transparent bg ────────────────────────────────────
if (new URLSearchParams(location.search).get('transparent') === '1') {
  document.body.classList.add('transparent-bg');
}

// ── Audio Context (lazy init on first user gesture) ───────
let audioCtx = null;
function getAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}
document.addEventListener('click', () => getAudio(), { once: true });

// ── Sound primitives ──────────────────────────────────────
function playTone(freq, type = 'sine', dur = 0.12, vol = 0.3, delay = 0) {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch (_) {}
}

function playCoinSound() {
  playTone(880, 'sine', 0.09, 0.18);
  playTone(1320, 'sine', 0.06, 0.1, 0.04);
}

function playKickSound() {
  playTone(120, 'sawtooth', 0.08, 0.25);
  playTone(80, 'square', 0.12, 0.2, 0.02);
}

function playGoalSound() {
  // Triumphant fanfare
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((f, i) => playTone(f, 'sine', 0.7, 0.4, i * 0.08));
  // Low punch
  playTone(80, 'sawtooth', 0.2, 0.5, 0);
}

function playCrowdNoise() {
  try {
    const ctx = getAudio();
    const dur = 2;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const lp = ctx.createBiquadFilter();
    lp.type = 'bandpass'; lp.frequency.value = 700; lp.Q.value = 0.5;

    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.15);
    gain.gain.setValueAtTime(0.35, t + dur - 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    src.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
    src.start(); src.stop(t + dur);
  } catch (_) {}
}

function playLeaderSound() {
  playTone(698, 'sine', 0.4, 0.35, 0);
  playTone(880, 'sine', 0.4, 0.35, 0.1);
  playTone(1047, 'sine', 0.5, 0.4, 0.2);
}

// ── State ─────────────────────────────────────────────────
let state = {
  countries: [],        // array from server
  ballSteps: 10,
  totalGifts: 0,
  goalLock: false,      // prevent goal overlay spam
  leaderPrevId: null
};

// ── DOM helpers ───────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ── Build initial lanes ───────────────────────────────────
function buildLanes(countries) {
  const field = $('game-field');
  field.innerHTML = '';

  countries.forEach(c => {
    const lane = document.createElement('div');
    lane.className = 'country-lane';
    lane.id = `lane-${c.id}`;
    lane.style.setProperty('--country-color', c.color);

    lane.innerHTML = `
      <span class="lane-flag">${c.flag}</span>
      <span class="lane-name">${c.name}</span>
      <div class="lane-track" id="track-${c.id}">
        <div class="lane-track-fill" id="fill-${c.id}" style="background:${c.color}; width:0%"></div>
        <div class="lane-ball" id="ball-${c.id}" style="left:4%">⚽</div>
      </div>
      <span class="lane-goal" id="goal-post-${c.id}">🥅</span>
      <span class="lane-score" id="score-${c.id}" style="color:${c.accent || c.color}">0</span>
    `;

    field.appendChild(lane);
    updateBallPosition(c.id, c.ballStep || 0, false);
  });
}

// ── Update ball position ──────────────────────────────────
function updateBallPosition(countryId, step, animate = true) {
  const ball = $(`ball-${countryId}`);
  const fill = $(`fill-${countryId}`);
  if (!ball || !fill) return;

  const pct = (step / state.ballSteps) * 100;
  const ballLeft = 4 + (pct * 0.88); // 4%..92% of track width

  if (animate) {
    ball.classList.remove('kick');
    void ball.offsetWidth;
    ball.classList.add('kick');
    setTimeout(() => ball.classList.remove('kick'), 400);
  }

  ball.style.left = `${Math.min(92, ballLeft)}%`;
  fill.style.width = `${Math.min(100, pct)}%`;
}

// ── Leaderboard render ────────────────────────────────────
function renderLeaderboard(leaderboard) {
  const list = $('leaderboard-list');
  if (!list) return;

  const maxScore = Math.max(1, ...leaderboard.map(c => c.score));

  list.innerHTML = leaderboard.slice(0, 5).map(c => {
    const rankClass = c.rank <= 3 ? `rank-${c.rank}` : 'rank-other';
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const rankLabel = medals[c.rank] || `#${c.rank}`;
    const barPct = Math.max(3, Math.round((c.score / maxScore) * 100));
    const isLeader = c.rank === 1;
    return `
      <div class="lb-item ${isLeader ? 'is-leader' : ''} rank-${Math.min(c.rank,4)}"
           style="--country-color:${c.color}; --country-accent:${c.accent || c.color}">
        <span class="lb-rank ${rankClass}">${rankLabel}</span>
        <span class="lb-flag">${c.flag}</span>
        <span class="lb-name">${c.name}</span>
        <div class="lb-bar-wrap">
          <div class="lb-bar" style="width:${barPct}%; --country-color:${c.color}; --country-accent:${c.accent || '#fff'}"></div>
        </div>
        <span class="lb-score">${c.score}</span>
        <span class="lb-gifts">🎁${c.totalGifts}</span>
      </div>`;
  }).join('');
}

// ── Update score display ──────────────────────────────────
function updateScore(countryId, score) {
  const el = $(`score-${countryId}`);
  if (!el) return;
  el.textContent = score;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 500);
}

// ── Goal animation ────────────────────────────────────────
let goalTimeout = null;

function showGoal(data) {
  if (state.goalLock) return;
  state.goalLock = true;

  const overlay = $('goal-overlay');
  $('goal-flag').textContent    = data.flag;
  $('goal-country').textContent = data.countryName.toUpperCase();
  $('goal-score').textContent   = data.score;

  overlay.classList.remove('hidden');

  spawnConfetti(data.color || '#FFD700', data.accent || '#FF4444');

  playGoalSound();
  playCrowdNoise();

  // Lane flash
  const lane = $(`lane-${data.countryId}`);
  if (lane) {
    lane.classList.remove('scored');
    void lane.offsetWidth;
    lane.classList.add('scored');
  }

  // Goal post shake
  const post = $(`goal-post-${data.countryId}`);
  if (post) {
    post.classList.remove('vibrate');
    void post.offsetWidth;
    post.classList.add('vibrate');
    setTimeout(() => post.classList.remove('vibrate'), 500);
  }

  // Update score
  updateScore(data.countryId, data.score);

  // Reset ball to start after goal
  updateBallPosition(data.countryId, data.ballStep || 0, false);

  if (goalTimeout) clearTimeout(goalTimeout);
  goalTimeout = setTimeout(() => {
    overlay.classList.add('hidden');
    $('confetti-container').innerHTML = '';
    state.goalLock = false;

    // Show leader overlay after goal if new leader
    if (data.isNewLeader) {
      setTimeout(() => showNewLeader(data), 100);
    }
  }, 3000);
}

// ── New leader overlay ────────────────────────────────────
let leaderTimeout = null;

function showNewLeader(data) {
  const overlay = $('leader-overlay');
  $('leader-flag').textContent = data.flag;
  $('leader-name').textContent = data.countryName.toUpperCase();
  overlay.classList.remove('hidden');
  playLeaderSound();

  if (leaderTimeout) clearTimeout(leaderTimeout);
  leaderTimeout = setTimeout(() => {
    overlay.classList.add('hidden');
  }, 2500);
}

// ── Confetti ──────────────────────────────────────────────
const CONFETTI_COLORS = ['#FFD700','#FF4444','#00E5FF','#39FF14','#FF69B4','#FFA500','#FFFFFF'];

function spawnConfetti(primaryColor, accentColor) {
  const container = $('confetti-container');
  container.innerHTML = '';
  const colors = [...CONFETTI_COLORS, primaryColor, accentColor];

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const col = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const drift = (Math.random() - 0.5) * 120;
    const spin  = Math.random() * 720 * (Math.random() > 0.5 ? 1 : -1);
    const dur   = 1.2 + Math.random() * 1.2;
    const delay = Math.random() * 0.5;
    const size  = 6 + Math.random() * 8;

    piece.style.cssText = `
      left: ${left}%;
      background: ${col};
      width: ${size}px; height: ${size}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      --drift: ${drift}px;
      --spin: ${spin}deg;
      --duration: ${dur}s;
      --delay: ${delay}s;
    `;
    container.appendChild(piece);
  }
}

// ── Donation feed ─────────────────────────────────────────
const MAX_FEED_ITEMS = 5;

function addFeedItem(donation) {
  const list = $('feed-list');
  if (!list) return;

  const item = document.createElement('div');
  item.className = 'feed-item';
  const repeat = donation.repeatCount > 1 ? ` ×${donation.repeatCount}` : '';
  item.innerHTML = `
    <span class="feed-flag">${donation.flag || '🎁'}</span>
    <span class="feed-user">${escapeHtml(donation.nickname || donation.username)}</span>
    <span class="feed-gift">${escapeHtml(donation.giftName)}${repeat}</span>
    <span class="feed-arrow">→</span>
    <span class="feed-team">${escapeHtml(donation.countryName)}</span>
  `;

  list.prepend(item);

  while (list.children.length > MAX_FEED_ITEMS) {
    list.removeChild(list.lastChild);
  }

  // Update global gift counter
  state.totalGifts += donation.repeatCount || 1;
  const counter = $('total-gifts-count');
  if (counter) counter.textContent = state.totalGifts.toLocaleString();
}

// ── Status toast ──────────────────────────────────────────
let toastTimer = null;
function showToast(msg, duration = 3000) {
  const toast = $('status-toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
}

// ── Helpers ───────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Socket.io connection ──────────────────────────────────
const socket = io({ reconnectionDelay: 2000, reconnectionDelayMax: 10000 });

socket.on('connect', () => {
  console.log('🔗 Connected to server');
});

socket.on('disconnect', () => {
  showToast('⚡ Reconnexion en cours…');
});

// ── Initial state ─────────────────────────────────────────
socket.on('initialState', data => {
  state.ballSteps  = data.ballSteps;
  state.countries  = data.countries;
  state.totalGifts = data.countries.reduce((s, c) => s + (c.totalGifts || 0), 0);

  buildLanes(data.countries);
  renderLeaderboard(data.countries);

  // Apply existing ball positions
  data.countries.forEach(c => {
    updateBallPosition(c.id, c.ballStep || 0, false);
    updateScore(c.id, c.score || 0);
  });

  // Fill feed with recent donations
  if (data.recentDonations) {
    [...data.recentDonations].reverse().forEach(d => addFeedItem(d));
  }

  // Update gift counter
  const counter = $('total-gifts-count');
  if (counter) counter.textContent = state.totalGifts.toLocaleString();
});

// ── Ball move (gift received, no goal) ───────────────────
socket.on('ballMove', data => {
  updateBallPosition(data.countryId, data.ballStep, true);
  if (data.donation) {
    addFeedItem(data.donation);
    playCoinSound();
    setTimeout(playKickSound, 60);
  }
});

// ── Goal scored ───────────────────────────────────────────
socket.on('goalScored', data => {
  showGoal(data);
  renderLeaderboard(data.leaderboard || []);

  // Update all ball positions from leaderboard
  if (data.leaderboard) {
    data.leaderboard.forEach(c => {
      updateBallPosition(c.id, c.ballStep || 0, c.id === data.countryId ? false : false);
      const scoreEl = $(`score-${c.id}`);
      if (scoreEl) scoreEl.textContent = c.score;
    });
  }

  if (data.donation) addFeedItem(data.donation);
});

// ── Team join notification ────────────────────────────────
socket.on('teamJoin', data => {
  showToast(`${data.nickname} rejoint ${data.flag} ${data.countryName} !`, 2000);
});

// ── TikTok connection status ──────────────────────────────
socket.on('tiktokStatus', data => {
  const badge = $('live-label');
  if (data.connected) {
    badge.textContent = 'LIVE';
    showToast(`✅ Connecté à @${data.username}`, 3000);
  } else if (data.demo) {
    badge.textContent = 'DEMO';
    badge.closest('#tiktok-badge').style.background = '#ff8c00';
    showToast('🎮 Mode DEMO actif – Configurez TIKTOK_USERNAME', 5000);
  } else {
    badge.textContent = 'OFF';
    badge.closest('#tiktok-badge').style.background = '#555';
    showToast('⚠️ Déconnecté – Reconnexion…', 4000);
  }
});

// ── Game reset ────────────────────────────────────────────
socket.on('gameReset', data => {
  state.totalGifts = 0;
  const counter = $('total-gifts-count');
  if (counter) counter.textContent = '0';

  if (data.countries) {
    data.countries.forEach(c => {
      updateBallPosition(c.id, 0, false);
      const score = $(`score-${c.id}`);
      if (score) score.textContent = '0';
    });
    renderLeaderboard(data.countries);
  }

  showToast('🔄 Jeu réinitialisé !', 2000);
});

// ── Keyboard shortcut: R to reset (admin) ────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'r' && e.ctrlKey && e.shiftKey) {
    if (confirm('Reset le jeu ?')) {
      fetch('/api/reset', { method: 'POST' });
    }
  }
});

// ── Preload audio on first interaction ───────────────────
document.addEventListener('pointerdown', () => {
  try { getAudio().resume(); } catch (_) {}
}, { once: true });
