require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');
const config = require('./config');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

app.use(express.static('public'));
app.use(express.json());

// ── Game State ────────────────────────────────────────────────────────────────

const gameState = {
  countries: config.countries.map(c => ({
    ...c,
    score: 0,
    ballStep: 0,
    totalGifts: 0
  })),
  recentDonations: [],
  goalQueue: [],     // queued goals to avoid animation collision
  startTime: Date.now()
};

// ── Anti-spam ─────────────────────────────────────────────────────────────────

const spamTracker = new Map(); // userId → { count, resetAt }

function isSpam(userId) {
  const now = Date.now();
  let t = spamTracker.get(userId);
  if (!t || now > t.resetAt) {
    t = { count: 0, resetAt: now + config.antispam.windowMs };
  }
  t.count++;
  spamTracker.set(userId, t);
  return t.count > config.antispam.maxPerWindow;
}

// Clean spam map every minute to avoid memory leak
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of spamTracker) {
    if (now > v.resetAt) spamTracker.delete(k);
  }
}, 60_000);

// ── User team assignments (via chat commands) ─────────────────────────────────

const userTeams = new Map(); // userId → countryId

function findCountryByGift(giftName) {
  const lower = giftName.toLowerCase();
  return gameState.countries.find(c =>
    c.gifts.some(g => g.toLowerCase() === lower)
  ) || null;
}

function findCountryById(id) {
  return gameState.countries.find(c => c.id === id) || null;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

function getLeaderboard() {
  return [...gameState.countries]
    .sort((a, b) => b.score - a.score || b.totalGifts - a.totalGifts)
    .map((c, i) => ({
      rank: i + 1,
      id: c.id,
      name: c.name,
      flag: c.flag,
      color: c.color,
      accent: c.accent,
      score: c.score,
      totalGifts: c.totalGifts,
      ballStep: c.ballStep
    }));
}

// ── Gift processing ───────────────────────────────────────────────────────────

let prevLeaderId = null;

function processBallAdvance(country, steps, donation) {
  country.totalGifts += steps;
  country.ballStep += steps;

  const goals = Math.floor(country.ballStep / config.ballSteps);
  country.ballStep = country.ballStep % config.ballSteps;

  if (goals > 0) {
    country.score += goals;

    const leaderboard = getLeaderboard();
    const newLeader = leaderboard[0];
    const isNewLeader = newLeader.id === country.id && newLeader.id !== prevLeaderId;
    if (isNewLeader) prevLeaderId = newLeader.id;

    io.emit('goalScored', {
      countryId: country.id,
      countryName: country.name,
      flag: country.flag,
      color: country.color,
      accent: country.accent,
      score: country.score,
      goals,
      ballStep: country.ballStep,
      isNewLeader,
      leaderboard,
      donation
    });
  } else {
    io.emit('ballMove', {
      countryId: country.id,
      ballStep: country.ballStep,
      totalGifts: country.totalGifts,
      donation
    });
  }
}

function addDonation(donation) {
  gameState.recentDonations.unshift(donation);
  if (gameState.recentDonations.length > 30) gameState.recentDonations.pop();
}

// ── TikTok Live Connection ───────────────────────────────────────────────────

let tiktokConn = null;
let reconnectTimer = null;
let reconnectDelay = 5_000;

function connectToTikTok() {
  const username = config.tiktokUsername;

  if (!username || username === 'your_username') {
    console.log('⚠️  No TikTok username set → running in DEMO mode');
    console.log('   Set TIKTOK_USERNAME in .env or config.js to go live');
    io.emit('tiktokStatus', { connected: false, demo: true });
    startDemoMode();
    return;
  }

  console.log(`📡 Connecting to TikTok Live: @${username.replace('@', '')}…`);

  tiktokConn = new WebcastPushConnection(username, {
    processInitialData: false,
    enableExtendedGiftInfo: true,
    enableWebsocketUpgrade: true,
    requestPollingIntervalMs: 2000
  });

  tiktokConn.connect()
    .then(state => {
      reconnectDelay = 5_000;
      console.log(`✅ Connected! roomId: ${state.roomId}`);
      io.emit('tiktokStatus', { connected: true, username, roomId: state.roomId });
    })
    .catch(err => {
      console.error('❌ Connection failed:', err.message);
      io.emit('tiktokStatus', { connected: false, error: err.message });
      scheduleReconnect();
    });

  tiktokConn.on('gift', handleGift);
  tiktokConn.on('chat', handleChat);

  tiktokConn.on('disconnected', () => {
    console.warn('⚠️  TikTok disconnected');
    io.emit('tiktokStatus', { connected: false });
    scheduleReconnect();
  });

  tiktokConn.on('error', err => {
    console.error('TikTok error:', err.message || err);
  });
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  console.log(`🔄 Reconnecting in ${reconnectDelay / 1000}s…`);
  reconnectTimer = setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 2, 60_000);
    connectToTikTok();
  }, reconnectDelay);
}

// ── Gift handler ──────────────────────────────────────────────────────────────

function handleGift(data) {
  // Skip ongoing streaks; wait for repeatEnd
  if (data.giftType === 1 && !data.repeatEnd) return;

  const diamonds = data.diamondCount ?? data.gift?.diamondCount ?? 0;
  if (diamonds !== 1) return; // only 1-coin gifts

  const userId = data.userId;
  if (isSpam(userId)) return;

  // Determine country: gift mapping first, then user team assignment
  let country = findCountryByGift(data.giftName || '');
  if (!country) {
    const teamId = userTeams.get(userId);
    if (teamId) country = findCountryById(teamId);
  }
  if (!country) return; // gift has no mapped country → ignore

  const repeatCount = Math.max(1, data.repeatCount || 1);

  const donation = {
    id: `${userId}-${Date.now()}`,
    username: data.uniqueId || `user_${userId}`,
    nickname: data.nickname || data.uniqueId || 'Anonymous',
    giftName: data.giftName || 'Gift',
    repeatCount,
    countryId: country.id,
    countryName: country.name,
    flag: country.flag,
    timestamp: Date.now()
  };

  addDonation(donation);
  processBallAdvance(country, repeatCount, donation);
}

// ── Chat handler (team selection) ─────────────────────────────────────────────

function handleChat(data) {
  const msg = (data.comment || '').toLowerCase().trim();
  const userId = data.userId;

  for (const c of config.countries) {
    if (msg === `!${c.id}` || msg === `!${c.name.toLowerCase()}`) {
      userTeams.set(userId, c.id);
      io.emit('teamJoin', {
        username: data.uniqueId || 'anonymous',
        nickname: data.nickname || data.uniqueId || 'Anonymous',
        countryId: c.id,
        countryName: c.name,
        flag: c.flag
      });
      return;
    }
  }
}

// ── Demo Mode ─────────────────────────────────────────────────────────────────

const demoNames = [
  '@TikFan99', '@GoalKing', '@LiveLover', '@SportsFan', '@CoolViewer',
  '@StreamPro', '@BallzDeep', '@GoForIt', '@FootballFreak', '@LegendZ'
];

function startDemoMode() {
  const gifts = ['rose', 'heart', 'thunder', 'star', 'sunflower', 'pizza', 'monkey', 'crown'];

  setInterval(() => {
    const country = gameState.countries[Math.floor(Math.random() * gameState.countries.length)];
    const username = demoNames[Math.floor(Math.random() * demoNames.length)];
    const giftName = country.gifts[0] || gifts[0];
    const repeat = Math.random() < 0.2 ? Math.floor(Math.random() * 3) + 2 : 1;

    const donation = {
      id: `demo-${Date.now()}`,
      username,
      nickname: username,
      giftName,
      repeatCount: repeat,
      countryId: country.id,
      countryName: country.name,
      flag: country.flag,
      timestamp: Date.now()
    };

    addDonation(donation);
    processBallAdvance(country, repeat, donation);
  }, 600 + Math.random() * 1200);
}

// ── REST API ──────────────────────────────────────────────────────────────────

app.get('/api/state', (_req, res) => {
  res.json({
    countries: getLeaderboard(),
    recentDonations: gameState.recentDonations,
    ballSteps: config.ballSteps,
    uptime: Math.floor((Date.now() - gameState.startTime) / 1000)
  });
});

app.post('/api/reset', (_req, res) => {
  gameState.countries.forEach(c => {
    c.score = 0;
    c.ballStep = 0;
    c.totalGifts = 0;
  });
  gameState.recentDonations = [];
  prevLeaderId = null;
  io.emit('gameReset', { countries: getLeaderboard() });
  res.json({ ok: true });
});

// Manual gift injection for testing
app.post('/api/gift', (req, res) => {
  const { countryId, steps = 1 } = req.body;
  const country = findCountryById(countryId);
  if (!country) return res.status(404).json({ error: 'Country not found' });

  const donation = {
    id: `manual-${Date.now()}`,
    username: '@ADMIN',
    nickname: 'Admin',
    giftName: 'rose',
    repeatCount: steps,
    countryId: country.id,
    countryName: country.name,
    flag: country.flag,
    timestamp: Date.now()
  };
  addDonation(donation);
  processBallAdvance(country, steps, donation);
  res.json({ ok: true, country: country.name, newStep: country.ballStep, score: country.score });
});

// ── Socket.io ─────────────────────────────────────────────────────────────────

io.on('connection', socket => {
  socket.emit('initialState', {
    countries: getLeaderboard(),
    recentDonations: gameState.recentDonations,
    ballSteps: config.ballSteps
  });

  socket.on('disconnect', () => {});
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = config.port;
httpServer.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   ⚽  TikTok Football Live  ⚽       ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`🚀  http://localhost:${PORT}`);
  console.log(`📺  OBS Source: http://localhost:${PORT}`);
  console.log(`🔄  Reset API: POST http://localhost:${PORT}/api/reset`);
  console.log('');
  connectToTikTok();
});
