module.exports = {
  tiktokUsername: process.env.TIKTOK_USERNAME || 'your_username',
  ballSteps: 10,
  port: process.env.PORT || 3000,
  antispam: { maxPerWindow: 10, windowMs: 1000 },

  // Tip: users type !<id> in chat to join a team, then any 1-coin gift counts for them.
  // gifts: TikTok gift names (case-insensitive) auto-assigned to this country.
  countries: [
    { id: 'france',      name: 'France',      flag: '🇫🇷', color: '#003189', accent: '#EF4135', gifts: ['rose', 'rosa', 'flower'] },
    { id: 'spain',       name: 'Espagne',     flag: '🇪🇸', color: '#AA151B', accent: '#F1BF00', gifts: ['heart', 'coeur'] },
    { id: 'germany',     name: 'Allemagne',   flag: '🇩🇪', color: '#222222', accent: '#FFCE00', gifts: ['thunder', 'lightning'] },
    { id: 'italy',       name: 'Italie',      flag: '🇮🇹', color: '#003DA5', accent: '#009246', gifts: ['fire', 'pizza'] },
    { id: 'portugal',    name: 'Portugal',    flag: '🇵🇹', color: '#006600', accent: '#FF2200', gifts: ['sunflower'] },
    { id: 'england',     name: 'Angleterre',  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#CF142B', accent: '#FFFFFF', gifts: ['crown', 'king'] },
    { id: 'netherlands', name: 'Pays-Bas',    flag: '🇳🇱', color: '#E17000', accent: '#1D3A7A', gifts: ['orange'] },
    { id: 'belgium',     name: 'Belgique',    flag: '🇧🇪', color: '#2D2A4A', accent: '#FDDA24', gifts: ['star', 'etoile'] },
    { id: 'greece',      name: 'Grèce',       flag: '🇬🇷', color: '#0D5EAF', accent: '#FFFFFF', gifts: ['sun', 'soleil'] },
    { id: 'turkey',      name: 'Turquie',     flag: '🇹🇷', color: '#E30A17', accent: '#FFFFFF', gifts: ['moon', 'lune'] },
    { id: 'poland',      name: 'Pologne',     flag: '🇵🇱', color: '#DC143C', accent: '#FFFFFF', gifts: ['eagle', 'aigle'] },
    { id: 'romania',     name: 'Roumanie',    flag: '🇷🇴', color: '#002B7F', accent: '#FCD116', gifts: ['wolf', 'loup'] },
    { id: 'croatia',     name: 'Croatie',     flag: '🇭🇷', color: '#CC0000', accent: '#0030A0', gifts: ['chess', 'echecs'] },
    { id: 'serbia',      name: 'Serbie',      flag: '🇷🇸', color: '#C6363C', accent: '#0C4076', gifts: ['bear', 'ours'] },
    { id: 'switzerland', name: 'Suisse',      flag: '🇨🇭', color: '#CC0000', accent: '#FFFFFF', gifts: ['cheese', 'fromage'] },
  ]
};
