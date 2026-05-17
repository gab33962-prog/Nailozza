module.exports = {
  // TikTok live username (with or without @)
  // Can also be set via TIKTOK_USERNAME env variable or .env file
  tiktokUsername: process.env.TIKTOK_USERNAME || 'your_username',

  // Number of ball steps needed to score a goal
  ballSteps: 10,

  // Server port
  port: process.env.PORT || 3000,

  // Anti-spam: max gifts counted per user per time window
  antispam: {
    maxPerWindow: 10,
    windowMs: 1000
  },

  // Countries configuration
  // gifts: list of TikTok gift names (case-insensitive) that advance this team
  // Users can also type !<id> or !<name> in chat to join a team, then any 1-coin gift counts
  countries: [
    {
      id: 'france',
      name: 'France',
      flag: '🇫🇷',
      color: '#003189',
      accent: '#EF4135',
      gifts: ['rose', 'rosa', 'flower']
    },
    {
      id: 'spain',
      name: 'Espagne',
      flag: '🇪🇸',
      color: '#AA151B',
      accent: '#F1BF00',
      gifts: ['heart', 'coeur', 'love']
    },
    {
      id: 'germany',
      name: 'Allemagne',
      flag: '🇩🇪',
      color: '#333333',
      accent: '#FFCE00',
      gifts: ['thunder', 'lightning', 'zap']
    },
    {
      id: 'greece',
      name: 'Grèce',
      flag: '🇬🇷',
      color: '#0D5EAF',
      accent: '#FFFFFF',
      gifts: ['star', 'etoile', 'shooting star']
    },
    {
      id: 'portugal',
      name: 'Portugal',
      flag: '🇵🇹',
      color: '#006600',
      accent: '#FF0000',
      gifts: ['sunflower', 'tournesol', 'sun']
    },
    {
      id: 'italy',
      name: 'Italie',
      flag: '🇮🇹',
      color: '#003DA5',
      accent: '#009246',
      gifts: ['pizza', 'fire', 'flamme']
    },
    {
      id: 'brazil',
      name: 'Brésil',
      flag: '🇧🇷',
      color: '#009C3B',
      accent: '#FFDF00',
      gifts: ['monkey', 'singe', 'banana']
    },
    {
      id: 'england',
      name: 'Angleterre',
      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      color: '#CF142B',
      accent: '#FFFFFF',
      gifts: ['crown', 'couronne', 'king']
    }
  ]
};
