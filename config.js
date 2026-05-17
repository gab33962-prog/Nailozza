module.exports = {
  tiktokUsername: process.env.TIKTOK_USERNAME || 'your_username',
  ballSteps: 10,
  port: process.env.PORT || 3000,
  antispam: { maxPerWindow: 10, windowMs: 1000 },

  // Tip: users can type !<id> in chat to join a team, then any 1-coin gift counts for them.
  countries: [
    // ── Western Europe ───────────────────────────────────────
    { id: 'france',       name: 'France',        flag: '🇫🇷', color: '#003189', accent: '#EF4135', gifts: ['rose', 'rosa'] },
    { id: 'spain',        name: 'Espagne',        flag: '🇪🇸', color: '#AA151B', accent: '#F1BF00', gifts: ['heart', 'coeur'] },
    { id: 'germany',      name: 'Allemagne',      flag: '🇩🇪', color: '#222222', accent: '#FFCE00', gifts: ['thunder', 'lightning'] },
    { id: 'italy',        name: 'Italie',         flag: '🇮🇹', color: '#003DA5', accent: '#009246', gifts: ['fire', 'pizza'] },
    { id: 'portugal',     name: 'Portugal',       flag: '🇵🇹', color: '#006600', accent: '#FF2200', gifts: ['sunflower'] },
    { id: 'england',      name: 'Angleterre',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#CF142B', accent: '#FFFFFF', gifts: ['crown'] },
    { id: 'netherlands',  name: 'Pays-Bas',       flag: '🇳🇱', color: '#FF6B00', accent: '#1D3A7A', gifts: ['orange'] },
    { id: 'belgium',      name: 'Belgique',       flag: '🇧🇪', color: '#EF3340', accent: '#FDDA24', gifts: ['waffle'] },
    { id: 'switzerland',  name: 'Suisse',         flag: '🇨🇭', color: '#CC0000', accent: '#FFFFFF', gifts: ['cheese'] },
    { id: 'sweden',       name: 'Suède',          flag: '🇸🇪', color: '#006AA7', accent: '#FECC02', gifts: ['star'] },
    { id: 'norway',       name: 'Norvège',        flag: '🇳🇴', color: '#BA0C2F', accent: '#00205B', gifts: [] },
    { id: 'denmark',      name: 'Danemark',       flag: '🇩🇰', color: '#C60C30', accent: '#FFFFFF', gifts: [] },

    // ── Eastern / Balkan Europe ──────────────────────────────
    { id: 'romania',      name: 'Roumanie',       flag: '🇷🇴', color: '#002B7F', accent: '#FCD116', gifts: [] },
    { id: 'bulgaria',     name: 'Bulgarie',       flag: '🇧🇬', color: '#00966E', accent: '#D62612', gifts: [] },
    { id: 'greece',       name: 'Grèce',          flag: '🇬🇷', color: '#0D5EAF', accent: '#FFFFFF', gifts: ['etoile'] },
    { id: 'hungary',      name: 'Hongrie',        flag: '🇭🇺', color: '#CE2939', accent: '#FFFFFF', gifts: [] },
    { id: 'croatia',      name: 'Croatie',        flag: '🇭🇷', color: '#FF0000', accent: '#0000FF', gifts: [] },
    { id: 'serbia',       name: 'Serbie',         flag: '🇷🇸', color: '#C6363C', accent: '#0C4076', gifts: [] },
    { id: 'slovenia',     name: 'Slovénie',       flag: '🇸🇮', color: '#003DA5', accent: '#E90024', gifts: [] },
    { id: 'northmacedonia', name: 'Macédoine N.', flag: '🇲🇰', color: '#CE2028', accent: '#F7E017', gifts: [] },
    { id: 'albania',      name: 'Albanie',        flag: '🇦🇱', color: '#E41E20', accent: '#FFCC00', gifts: [] },
    { id: 'bosnia',       name: 'Bosnie',         flag: '🇧🇦', color: '#002395', accent: '#FECB00', gifts: [] },
    { id: 'montenegro',   name: 'Monténégro',     flag: '🇲🇪', color: '#D4AF37', accent: '#D32011', gifts: [] },
    { id: 'czech',        name: 'Rép. Tchèque',   flag: '🇨🇿', color: '#D7141A', accent: '#11457E', gifts: [] },
    { id: 'austria',      name: 'Autriche',       flag: '🇦🇹', color: '#ED2939', accent: '#FFFFFF', gifts: [] },
    { id: 'poland',       name: 'Pologne',        flag: '🇵🇱', color: '#DC143C', accent: '#FFFFFF', gifts: [] },
    { id: 'ukraine',      name: 'Ukraine',        flag: '🇺🇦', color: '#005BBB', accent: '#FFD500', gifts: [] },
    { id: 'russia',       name: 'Russie',         flag: '🇷🇺', color: '#0039A6', accent: '#D52B1E', gifts: [] },
    { id: 'turkey',       name: 'Turquie',        flag: '🇹🇷', color: '#E30A17', accent: '#FFFFFF', gifts: [] },

    // ── Rest of the world ────────────────────────────────────
    { id: 'brazil',       name: 'Brésil',         flag: '🇧🇷', color: '#009C3B', accent: '#FFDF00', gifts: ['monkey', 'banana'] },
    { id: 'argentina',    name: 'Argentine',      flag: '🇦🇷', color: '#74ACDF', accent: '#FFFFFF', gifts: ['mate'] },
    { id: 'usa',          name: 'USA',            flag: '🇺🇸', color: '#3C3B6E', accent: '#B22234', gifts: [] },
    { id: 'morocco',      name: 'Maroc',          flag: '🇲🇦', color: '#C1272D', accent: '#006233', gifts: [] },
    { id: 'senegal',      name: 'Sénégal',        flag: '🇸🇳', color: '#00853F', accent: '#FDEF42', gifts: [] },
    { id: 'algeria',      name: 'Algérie',        flag: '🇩🇿', color: '#006233', accent: '#D21034', gifts: [] },
  ]
};
