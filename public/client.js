/* ═══════════════════════════════════════════════════════════
   TikTok Football Live – Client
   ═══════════════════════════════════════════════════════════ */

'use strict';

if (new URLSearchParams(location.search).get('transparent') === '1') {
  document.body.classList.add('transparent-bg');
}

// ── Audio ─────────────────────────────────────────────────
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
document.addEventListener('click', () => getAudio(), { once: true });
document.addEventListener('pointerdown', () => { try { getAudio().resume(); } catch(_){} }, { once: true });

function playTone(freq, type = 'sine', dur = 0.12, vol = 0.3, delay = 0) {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur + 0.05);
  } catch(_) {}
}
function playCoinSound()  { playTone(880,'sine',0.09,0.18); playTone(1320,'sine',0.06,0.1,0.04); }
function playKickSound()  { playTone(120,'sawtooth',0.08,0.25); playTone(80,'square',0.12,0.2,0.02); }
function playGoalSound()  { [523,659,784,1047,1319].forEach((f,i)=>playTone(f,'sine',0.7,0.4,i*0.08)); playTone(80,'sawtooth',0.2,0.5,0); }
function playLeaderSound(){ playTone(698,'sine',0.4,0.35,0); playTone(880,'sine',0.4,0.35,0.1); playTone(1047,'sine',0.5,0.4,0.2); }
function playCrowdNoise() {
  try {
    const ctx = getAudio(), dur = 2.2;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*0.6;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const lp = ctx.createBiquadFilter(); lp.type='bandpass'; lp.frequency.value=700; lp.Q.value=0.5;
    const g = ctx.createGain(); const t = ctx.currentTime;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.35,t+0.15);
    g.gain.setValueAtTime(0.35,t+dur-0.7); g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.connect(lp); lp.connect(g); g.connect(ctx.destination);
    src.start(); src.stop(t+dur);
  } catch(_) {}
}

// ── State ─────────────────────────────────────────────────
let state = { countries:[], ballSteps:10, totalGifts:0, goalLock:false };

// ── DOM helpers ───────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Build runner HTML ─────────────────────────────────────
function runnerHTML(color, flag) {
  return `<div class="runner" style="--c:${color}" id="runner-${flag.codePointAt(0)}">
    <div class="r-head"></div>
    <div class="r-body-wrap">
      <div class="r-arm r-arm-l"></div>
      <div class="r-torso"><span class="r-flag-mini">${flag}</span></div>
      <div class="r-arm r-arm-r"></div>
    </div>
    <div class="r-shorts"></div>
    <div class="r-legs">
      <div class="r-leg r-leg-l"></div>
      <div class="r-leg r-leg-r"></div>
    </div>
  </div>`;
}

// ── Build all lanes ───────────────────────────────────────
function buildLanes(countries) {
  const wrapper = $('lanes-wrapper');
  if (!wrapper) return;
  wrapper.innerHTML = '';

  countries.forEach(c => {
    const lane = document.createElement('div');
    lane.className = 'country-lane';
    lane.id = `lane-${c.id}`;
    lane.style.setProperty('--cc', c.color);

    lane.innerHTML = `
      ${runnerHTML(c.color, c.flag)}
      <div class="lane-info">
        <span class="lane-flag">${c.flag}</span>
        <span class="lane-name">${c.name}</span>
      </div>
      <div class="lane-track" id="track-${c.id}">
        <div class="lane-track-fill" id="fill-${c.id}" style="background:${c.color}; width:0%"></div>
        <div class="lane-ball" id="ball-${c.id}" style="left:4%">⚽</div>
        <div class="lane-track-label">${c.name}</div>
      </div>
      <span class="lane-goal" id="goal-post-${c.id}">🥅</span>
      <span class="lane-score" id="score-${c.id}" style="color:${c.accent||'#fff'}">0</span>
    `;

    wrapper.appendChild(lane);
  });
}

// ── Auto-scroll ───────────────────────────────────────────
let scrollY = 0;
let scrollPaused = false;
let scrollAnimId = null;
let lastScrollTime = 0;
const SCROLL_SPEED = 28; // px/sec

function startAutoScroll() {
  let lastTs = performance.now();

  function tick(ts) {
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;

    if (!scrollPaused) {
      const wrapper = $('lanes-wrapper');
      const field   = $('game-field');
      if (wrapper && field) {
        const maxScroll = Math.max(0, wrapper.scrollHeight - field.clientHeight);
        scrollY += SCROLL_SPEED * dt;

        if (scrollY >= maxScroll) {
          scrollY = maxScroll;
          scrollPaused = true;
          setTimeout(() => { scrollY = 0; scrollPaused = false; }, 2800);
        }
        wrapper.style.transform = `translateY(-${scrollY}px)`;
      }
    }

    scrollAnimId = requestAnimationFrame(tick);
  }

  if (scrollAnimId) cancelAnimationFrame(scrollAnimId);
  scrollAnimId = requestAnimationFrame(tick);
}

// ── Ball position ─────────────────────────────────────────
function updateBallPosition(countryId, step, animate = true) {
  const ball = $(`ball-${countryId}`);
  const fill = $(`fill-${countryId}`);
  if (!ball || !fill) return;

  const pct = Math.min(100, (step / state.ballSteps) * 100);
  const left = 4 + (pct * 0.88);

  if (animate) {
    ball.classList.remove('kick');
    void ball.offsetWidth;
    ball.classList.add('kick');
    setTimeout(() => ball.classList.remove('kick'), 380);
  }
  ball.style.left = `${Math.min(92, left)}%`;
  fill.style.width = `${pct}%`;
}

// ── Leaderboard ───────────────────────────────────────────
function renderLeaderboard(lb) {
  const list = $('leaderboard-list');
  if (!list) return;
  const maxScore = Math.max(1, ...lb.map(c => c.score));

  list.innerHTML = lb.slice(0, 5).map(c => {
    const medals = {1:'🥇',2:'🥈',3:'🥉'};
    const rankLabel = medals[c.rank] || `#${c.rank}`;
    const rankClass = c.rank <= 3 ? `rank-${c.rank}` : 'rank-other';
    const bar = Math.max(3, Math.round((c.score / maxScore) * 100));
    return `<div class="lb-item ${c.rank===1?'is-leader':''}"
         style="--cc:${c.color}">
      <span class="lb-rank ${rankClass}">${rankLabel}</span>
      <span class="lb-flag">${c.flag}</span>
      <span class="lb-name">${c.name}</span>
      <div class="lb-bar-wrap"><div class="lb-bar" style="width:${bar}%;background:linear-gradient(90deg,${c.color},${c.accent||'#aaa'})"></div></div>
      <span class="lb-score">${c.score}</span>
      <span class="lb-gifts">🎁${c.totalGifts}</span>
    </div>`;
  }).join('');
}

// ── Score update ──────────────────────────────────────────
function updateScore(id, score) {
  const el = $(`score-${id}`);
  if (!el) return;
  el.textContent = score;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 500);
}

// ── Runner celebration ─────────────────────────────────────
function celebrateRunner(countryId) {
  const lane = $(`lane-${countryId}`);
  if (!lane) return;
  const runner = lane.querySelector('.runner');
  if (!runner) return;
  runner.classList.add('celebrate');
  setTimeout(() => runner.classList.remove('celebrate'), 2800);
}

// ── Goal overlay ──────────────────────────────────────────
let goalTimeout = null;
function showGoal(data) {
  if (state.goalLock) return;
  state.goalLock = true;

  $('goal-flag').textContent    = data.flag;
  $('goal-country').textContent = data.countryName.toUpperCase();
  $('goal-score').textContent   = data.score;
  $('goal-overlay').classList.remove('hidden');

  spawnConfetti(data.color||'#FFD700', data.accent||'#FF4444');
  playGoalSound();
  playCrowdNoise();
  celebrateRunner(data.countryId);

  const lane = $(`lane-${data.countryId}`);
  if (lane) { lane.classList.remove('scored'); void lane.offsetWidth; lane.classList.add('scored'); }

  const post = $(`goal-post-${data.countryId}`);
  if (post) { post.classList.remove('vibrate'); void post.offsetWidth; post.classList.add('vibrate'); setTimeout(()=>post.classList.remove('vibrate'),500); }

  updateScore(data.countryId, data.score);
  updateBallPosition(data.countryId, data.ballStep || 0, false);

  if (goalTimeout) clearTimeout(goalTimeout);
  goalTimeout = setTimeout(() => {
    $('goal-overlay').classList.add('hidden');
    $('confetti-container').innerHTML = '';
    state.goalLock = false;
    if (data.isNewLeader) setTimeout(() => showNewLeader(data), 80);
  }, 3000);
}

// ── New leader overlay ────────────────────────────────────
let leaderTimeout = null;
function showNewLeader(data) {
  $('leader-flag').textContent = data.flag;
  $('leader-name').textContent = data.countryName.toUpperCase();
  $('leader-overlay').classList.remove('hidden');
  playLeaderSound();
  if (leaderTimeout) clearTimeout(leaderTimeout);
  leaderTimeout = setTimeout(() => $('leader-overlay').classList.add('hidden'), 2500);
}

// ── Confetti ──────────────────────────────────────────────
const CONFETTI_COLORS = ['#FFD700','#FF4444','#00E5FF','#39FF14','#FF69B4','#FFA500','#FFFFFF'];
function spawnConfetti(c1, c2) {
  const ct = $('confetti-container');
  ct.innerHTML = '';
  const palette = [...CONFETTI_COLORS, c1, c2];
  for (let i = 0; i < 65; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const col = palette[Math.floor(Math.random() * palette.length)];
    const sz = 6 + Math.random() * 9;
    p.style.cssText = `
      left:${Math.random()*100}%;
      background:${col};
      width:${sz}px; height:${sz}px;
      border-radius:${Math.random()>.5?'50%':'2px'};
      --drift:${(Math.random()-.5)*130}px;
      --spin:${Math.random()*720*(Math.random()>.5?1:-1)}deg;
      --dur:${1.2+Math.random()*1.2}s;
      --del:${Math.random()*0.5}s;
    `;
    ct.appendChild(p);
  }
}

// ── Donation feed ─────────────────────────────────────────
function addFeedItem(d) {
  const list = $('feed-list');
  if (!list) return;
  const item = document.createElement('div');
  item.className = 'feed-item';
  const repeat = d.repeatCount > 1 ? ` ×${d.repeatCount}` : '';
  item.innerHTML = `
    <span class="feed-flag">${d.flag||'🎁'}</span>
    <span class="feed-user">${esc(d.nickname||d.username)}</span>
    <span class="feed-gift">${esc(d.giftName)}${repeat}</span>
    <span class="feed-arrow">→</span>
    <span class="feed-team">${esc(d.countryName)}</span>
  `;
  list.prepend(item);
  while (list.children.length > 5) list.removeChild(list.lastChild);

  state.totalGifts += d.repeatCount || 1;
  const c = $('total-gifts-count');
  if (c) c.textContent = state.totalGifts.toLocaleString();
}

// ── Toast ─────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, dur = 3000) {
  const t = $('status-toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), dur);
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Socket.io ─────────────────────────────────────────────
const socket = io({ reconnectionDelay: 2000, reconnectionDelayMax: 10000 });

socket.on('connect', () => {});
socket.on('disconnect', () => showToast('⚡ Reconnexion…'));

socket.on('initialState', data => {
  state.ballSteps  = data.ballSteps;
  state.countries  = data.countries;
  state.totalGifts = data.countries.reduce((s,c)=>s+(c.totalGifts||0),0);

  buildLanes(data.countries);
  renderLeaderboard(data.countries);

  data.countries.forEach(c => {
    updateBallPosition(c.id, c.ballStep||0, false);
    updateScore(c.id, c.score||0);
  });

  if (data.recentDonations) {
    [...data.recentDonations].reverse().forEach(d => addFeedItem(d));
  }

  const ct = $('total-gifts-count');
  if (ct) ct.textContent = state.totalGifts.toLocaleString();

  // Start auto-scroll after DOM is painted
  requestAnimationFrame(() => startAutoScroll());
});

socket.on('ballMove', data => {
  updateBallPosition(data.countryId, data.ballStep, true);
  if (data.donation) { addFeedItem(data.donation); playCoinSound(); setTimeout(playKickSound, 60); }
});

socket.on('goalScored', data => {
  showGoal(data);
  renderLeaderboard(data.leaderboard || []);
  if (data.leaderboard) {
    data.leaderboard.forEach(c => {
      if (c.id !== data.countryId) {
        updateBallPosition(c.id, c.ballStep||0, false);
        const el = $(`score-${c.id}`);
        if (el) el.textContent = c.score;
      }
    });
  }
  if (data.donation) addFeedItem(data.donation);
});

socket.on('teamJoin', data => {
  showToast(`${data.nickname} rejoint ${data.flag} ${data.countryName} !`, 2000);
});

socket.on('tiktokStatus', data => {
  const badge = $('live-label');
  const wrap = badge?.closest('#tiktok-badge');
  if (data.connected) {
    badge.textContent = 'LIVE';
    if (wrap) wrap.style.background = '#ff0050';
    showToast(`✅ Connecté @${data.username}`, 3000);
  } else if (data.demo) {
    badge.textContent = 'DEMO';
    if (wrap) wrap.style.background = '#ff8c00';
    showToast('🎮 Mode DEMO – Configurez TIKTOK_USERNAME', 5000);
  } else {
    badge.textContent = 'OFF';
    if (wrap) wrap.style.background = '#555';
    showToast('⚠️ Déconnecté – Reconnexion…', 4000);
  }
});

socket.on('gameReset', data => {
  state.totalGifts = 0;
  const ct = $('total-gifts-count');
  if (ct) ct.textContent = '0';
  if (data.countries) {
    data.countries.forEach(c => {
      updateBallPosition(c.id, 0, false);
      const sc = $(`score-${c.id}`);
      if (sc) sc.textContent = '0';
    });
    renderLeaderboard(data.countries);
  }
  showToast('🔄 Jeu réinitialisé !', 2000);
});

// Ctrl+Shift+R → admin reset
document.addEventListener('keydown', e => {
  if (e.key==='r' && e.ctrlKey && e.shiftKey) {
    if (confirm('Reset le jeu ?')) fetch('/api/reset', {method:'POST'});
  }
});
