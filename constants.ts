
import { BlockShape, Theme, ThemeId, AchievementDef, DailyMission } from './types';

export const BOARD_SIZE = 10;
export const ANIMATION_SPEED = 0.2;

// --- ADMOB CONFIGURATION ---
export const ADMOB_IDS = {
  // Live IDs
  APP_ID: 'ca-app-pub-7473434201985195~2603072364',
  BANNER: 'ca-app-pub-7473434201985195/3317867168',
  REWARDED: 'ca-app-pub-7473434201985195/8101428163',
  INTERSTITIAL: 'ca-app-pub-7473434201985195/5660480544'
};

// --- SHAPE DEFINITIONS ---

export const SHAPES_EASY: BlockShape[] = [
  [[1]], // Dot
  [[1, 1]], // 2-h
  [[1], [1]], // 2-v
  [[1, 1], [1, 1]], // Square
  [[1, 1], [1, 0]], // Small corner
];

export const SHAPES_MEDIUM: BlockShape[] = [
  [[1, 1, 1]], // 3-h
  [[1], [1], [1]], // 3-v
  [[1, 1, 1], [0, 1, 0]], // T
  [[0, 1, 0], [1, 1, 1]], // T inverted
  [[1, 0], [1, 0], [1, 1]], // L
  [[1, 1], [1, 0], [1, 0]], // L inverted
  [[0, 1], [0, 1], [1, 1]], // J
  [[1, 1], [0, 1], [0, 1]], // J inverted
];

export const SHAPES_HARD: BlockShape[] = [
  [[1, 1, 1, 1]], // 4-h
  [[1], [1], [1], [1]], // 4-v
  [[1, 1, 1, 1, 1]], // 5-h
  [[1], [1], [1], [1], [1]], // 5-v
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]], // 3x3 block
  [[1, 1, 0], [0, 1, 1]], // Z
  [[0, 1, 1], [1, 1, 0]], // S
  [[1, 1, 1], [1, 0, 1]], // U-shape
  [[1, 0, 0], [1, 0, 0], [1, 1, 1]], // Big L
];

// Combined for legacy reference if needed, though engine now uses pools
export const SHAPES: BlockShape[] = [
  ...SHAPES_EASY,
  ...SHAPES_MEDIUM,
  ...SHAPES_HARD
];

export const THEMES: Record<ThemeId, Theme> = {
  default: {
    id: 'default',
    name: 'Classic Midnight',
    price: 0,
    isLocked: false,
    colors: {
      background: 'bg-slate-900',
      gridBackground: '#1e293b',
      cellEmpty: '#334155',
      uiPanel: 'rgba(30, 41, 59, 0.8)',
      text: '#f8fafc',
      accent: '#38bdf8',
    },
    blockPalette: ['#ef4444', '#f97316', '#facc15', '#4ade80', '#3b82f6', '#a855f7', '#ec4899'],
  },
  neon: {
    id: 'neon',
    name: 'Neon Glow',
    price: 500,
    isLocked: true,
    colors: {
      background: 'bg-black',
      gridBackground: '#0a0a0a',
      cellEmpty: '#262626',
      uiPanel: 'rgba(0, 0, 0, 0.9)',
      text: '#ffffff',
      accent: '#d946ef',
    },
    blockPalette: ['#ff00ff', '#00ffff', '#ffff00', '#00ff00', '#ff0000', '#7b00ff', '#ffffff'],
  },
  crystal: {
    id: 'crystal',
    name: 'Crystal Glass',
    price: 1000,
    isLocked: true,
    colors: {
      background: 'bg-indigo-950',
      gridBackground: '#1e1b4b',
      cellEmpty: '#312e81',
      uiPanel: 'rgba(49, 46, 129, 0.6)',
      text: '#e0e7ff',
      accent: '#818cf8',
    },
    blockPalette: ['#c4b5fd', '#a5b4fc', '#67e8f9', '#f0abfc', '#86efac', '#fca5a5', '#fdba74'],
  },
  dark: {
    id: 'dark',
    name: 'Deep Dark',
    price: 800,
    isLocked: true,
    colors: {
      background: 'bg-zinc-950',
      gridBackground: '#18181b',
      cellEmpty: '#27272a',
      uiPanel: 'rgba(24, 24, 27, 0.9)',
      text: '#a1a1aa',
      accent: '#71717a',
    },
    blockPalette: ['#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#3f3f46', '#27272a', '#18181b'],
  },
  cartoon: {
    id: 'cartoon',
    name: 'Cartoon Soft',
    price: 1200,
    isLocked: true,
    colors: {
      background: 'bg-sky-200',
      gridBackground: '#e0f2fe',
      cellEmpty: '#bae6fd',
      uiPanel: 'rgba(255, 255, 255, 0.9)',
      text: '#0c4a6e',
      accent: '#0ea5e9',
    },
    blockPalette: ['#fb7185', '#f472b6', '#c084fc', '#818cf8', '#60a5fa', '#34d399', '#fde047'],
  },
};

export const ACHIEVEMENTS_DATA: AchievementDef[] = [
  {
    id: 'play_time',
    title: 'Play Time Milestones',
    description: 'Total time spent playing',
    statKey: 'totalPlayTimeSeconds',
    tiers: [
      { stars: 1, target: 200 * 60, reward: 100 }, // 200 mins
      { stars: 2, target: 400 * 60, reward: 250 },
      { stars: 3, target: 800 * 60, reward: 1000 },
    ]
  },
  {
    id: 'ranked_matches',
    title: 'Ranked Match Participation',
    description: 'Play Ranked matches (Stake > 0)',
    statKey: 'rankedMatchesPlayed',
    tiers: [
      { stars: 1, target: 30, reward: 300 },
      { stars: 2, target: 50, reward: 700 },
      { stars: 3, target: 100, reward: 2000 },
    ]
  },
  {
    id: 'classic_matches',
    title: 'Classic Mode Participation',
    description: 'Play Classic Mode games',
    statKey: 'classicMatchesPlayed',
    tiers: [
      { stars: 1, target: 50, reward: 500 },
      { stars: 2, target: 150, reward: 1500 },
      { stars: 3, target: 300, reward: 4000 },
    ]
  },
  {
    id: 'friendly_matches',
    title: 'Friendly Challenge Battles',
    description: 'Play Friendly Room matches',
    statKey: 'friendlyMatchesPlayed',
    tiers: [
      { stars: 1, target: 50, reward: 300 },
      { stars: 2, target: 150, reward: 1200 },
      { stars: 3, target: 300, reward: 2500 },
    ]
  },
  {
    id: 'ranked_wins',
    title: 'Ranked Match Wins',
    description: 'Win Ranked matches',
    statKey: 'rankedWins',
    tiers: [
      { stars: 1, target: 20, reward: 400 },
      { stars: 2, target: 50, reward: 1500 },
      { stars: 3, target: 100, reward: 4000 },
    ]
  },
  {
    id: 'watch_ads',
    title: 'Watch Ads & Earn',
    description: 'Support us by watching ads',
    statKey: 'adsWatched',
    tiers: [
      { stars: 1, target: 50, reward: 500 },
      { stars: 2, target: 100, reward: 1200 },
      { stars: 3, target: 150, reward: 2500 },
    ]
  },
  {
    id: 'coins_collector',
    title: 'Coins Collector',
    description: 'Total lifetime coins earned',
    statKey: 'totalCoinsEarned',
    tiers: [
      { stars: 1, target: 5000, reward: 300 },
      { stars: 2, target: 15000, reward: 1000 },
      { stars: 3, target: 50000, reward: 3000 },
    ]
  },
  {
    id: 'classic_scorer',
    title: 'Classic Scorer Master',
    description: 'Reach high scores in Classic',
    statKey: 'classicHighScore',
    tiers: [
      { stars: 1, target: 3000, reward: 300 },
      { stars: 2, target: 5000, reward: 1000 },
      { stars: 3, target: 7000, reward: 2500 },
    ]
  },
  {
    id: 'block_destroyer',
    title: 'Block Destroyer',
    description: 'Total lines cleared',
    statKey: 'totalLinesCleared',
    tiers: [
      { stars: 1, target: 1000, reward: 500 },
      { stars: 2, target: 3000, reward: 1500 },
      { stars: 3, target: 7000, reward: 3500 },
    ]
  },
  {
    id: 'daily_streak',
    title: 'Daily Login Streak',
    description: 'Consecutive days logged in',
    statKey: 'loginStreakMax',
    tiers: [
      { stars: 1, target: 7, reward: 300 },
      { stars: 2, target: 15, reward: 1000 },
      { stars: 3, target: 30, reward: 3000 },
    ]
  },
  {
    id: 'puzzle_salvager',
    title: 'Puzzle Salvager',
    description: 'Lose with 0 tiles left (Empty Tray)',
    statKey: 'zeroTilesLosses',
    tiers: [
      { stars: 1, target: 1, reward: 200 },
      { stars: 2, target: 10, reward: 500 },
      { stars: 3, target: 20, reward: 800 },
    ]
  },
  {
    id: 'challenge_champ',
    title: 'Challenge Mode Champion',
    description: 'Play any Challenge matches',
    statKey: 'challengeMatchesPlayed',
    tiers: [
      { stars: 1, target: 20, reward: 400 },
      { stars: 2, target: 50, reward: 2000 },
      { stars: 3, target: 100, reward: 6000 },
    ]
  },
];

export const DAILY_MISSION_TEMPLATES: Omit<DailyMission, 'id' | 'progress' | 'isClaimed'>[] = [
  {
    type: 'CLEAR_LINES',
    title: 'Block Breaker',
    description: 'Clear 30 lines in any game mode',
    target: 30,
    reward: 150
  },
  {
    type: 'PLAY_CLASSIC',
    title: 'Quick Match',
    description: 'Play 3 matches in Classic Mode',
    target: 3,
    reward: 200
  },
  {
    type: 'SCORE_SINGLE',
    title: 'Puzzle Survivor',
    description: 'Score 2,000 points in a single match',
    target: 2000,
    reward: 200
  },
  {
    type: 'WATCH_ADS',
    title: 'Ad Helper',
    description: 'Watch 3 rewarded video ads',
    target: 3,
    reward: 150
  },
  {
    type: 'PLAY_RANKED',
    title: 'Ranked Match Play',
    description: 'Play 1 Ranked Match',
    target: 1,
    reward: 150
  }
];
