

export type Cell = string | null; // Color hex or null
export type Grid = Cell[][];
export type BlockShape = number[][]; // 0/1 matrix

export interface BlockDefinition {
  id: string;
  shape: BlockShape;
  color: string;
}

export interface DraggableBlock extends BlockDefinition {
  instanceId: string;
}

export type ThemeId = 'default' | 'neon' | 'crystal' | 'dark' | 'cartoon' | 'forest';

export interface Theme {
  id: ThemeId;
  name: string;
  price: number;
  isLocked: boolean;
  colors: {
    background: string;
    gridBackground: string;
    cellEmpty: string;
    uiPanel: string;
    text: string;
    accent: string;
  };
  blockPalette: string[];
}

// --- Achievement Types ---
export interface AchievementTier {
  stars: 1 | 2 | 3;
  target: number;
  reward: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  statKey: keyof UserStats;
  tiers: [AchievementTier, AchievementTier, AchievementTier]; // Always 3 tiers
}

export interface UserStats {
  totalPlayTimeSeconds: number;
  rankedMatchesPlayed: number;
  classicMatchesPlayed: number;
  friendlyMatchesPlayed: number;
  rankedWins: number;
  challengeMatchesPlayed: number; // Total VS matches
  challengeWins: number; 
  adsWatched: number;
  totalCoinsEarned: number; // Total lifetime coins (all sources)
  classicCoinsEarned: number; // Coins earned ONLY in classic mode
  classicHighScore: number;
  offlineHighScore: number; // New stat
  totalLinesCleared: number;
  loginStreakMax: number;
  // Specific internal stats
  zeroTilesLosses: number; // For Puzzle Salvager
}

export type MissionType = 'CLEAR_LINES' | 'PLAY_CLASSIC' | 'SCORE_SINGLE' | 'WATCH_ADS' | 'PLAY_RANKED';

export interface DailyMission {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  target: number;
  reward: number;
  progress: number;
  isClaimed: boolean;
}

export interface UserProfile {
  id?: string; // Supabase Auth ID
  username: string;
  avatarUrl?: string;
  email?: string; // Added for Email Auth
  isGoogleLinked?: boolean; 
  hasCompletedOnboarding?: boolean; 
  coins: number;
  highScore: number;
  inventory: {
    themes: ThemeId[];
  };
  lastDailyRewardClaim?: string; // YYYY-MM-DD
  dailyStreak: number;
  // New Stats & Achievements
  stats: UserStats;
  claimedAchievements: string[]; // Strings formatted as "ID_TIER" (e.g., "play_time_1")
  // Daily Missions
  missionDate?: string; // YYYY-MM-DD
  dailyMissions: DailyMission[];
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
}

export type GameMode = 'CLASSIC' | 'OFFLINE' | 'CHALLENGE';
export type ScreenState = 'MENU' | 'GAME' | 'GAMEOVER' | 'SETTINGS' | 'LEADERBOARD';

export interface DragState {
  isDragging: boolean;
  block: DraggableBlock | null;
  startPosition: { x: number; y: number }; // Where the pointer started
  currentPosition: { x: number; y: number }; // Where the pointer is now
  touchOffset: { x: number; y: number }; // Offset from block top-left to pointer
  originTrayIndex: number; // Which tray slot it came from
}

export interface ChallengeState {
  isActive: boolean;
  stake: number;
  timeLeft: number; // Seconds
  opponent: {
    name: string;
    score: number;
    avatarBg: string;
    isAi: boolean;
  };
  // Room code for friendly matches
  roomCode?: string;
  matchId?: number; // DB ID
  opponentId?: string; // UUID of opponent
  isHost?: boolean;
  status: 'MATCHMAKING' | 'VS_ANIMATION' | 'PLAYING' | 'FINISHED';
  result: 'WIN' | 'LOSS' | 'DRAW' | null;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number; // percentage 0-100 (relative to board center or specific pos)
  y: number; // percentage 0-100
  color: string;
  scale?: number;
}