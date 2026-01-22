
import { useState, useEffect, useCallback, useRef } from 'react';
import { GameMode, Grid, DraggableBlock, UserProfile, GameSettings, Theme, ThemeId, ChallengeState, UserStats, MissionType, DailyMission, FloatingText } from '../types';
import { BOARD_SIZE, SHAPES_EASY, SHAPES_MEDIUM, SHAPES_HARD, THEMES, ACHIEVEMENTS_DATA, DAILY_MISSION_TEMPLATES } from '../constants';
import { supabase } from '../services/supabase';
import confetti from 'canvas-confetti';

// --- Utils ---
const createEmptyGrid = (): Grid => Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const getDaysDifference = (date1: string, date2: string) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

// --- Random Name Generator ---
const ADJECTIVES = ['Swift', 'Brave', 'Cosmic', 'Neon', 'Epic', 'Lucky', 'Hyper', 'Shadow', 'Pixel', 'Turbo', 'Mighty', 'Frozen'];
const NOUNS = ['Panda', 'Tiger', 'Ninja', 'Falcon', 'Ghost', 'Wizard', 'Knight', 'Rocket', 'Dragon', 'Eagle', 'Wolf', 'Star'];

const generateRandomUsername = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 999);
  return `${adj}${noun}${num}`;
};

// Default Stats for new users
const DEFAULT_STATS: UserStats = {
  totalPlayTimeSeconds: 0,
  rankedMatchesPlayed: 0,
  classicMatchesPlayed: 0,
  friendlyMatchesPlayed: 0,
  rankedWins: 0,
  challengeMatchesPlayed: 0,
  challengeWins: 0,
  adsWatched: 0,
  totalCoinsEarned: 0,
  classicCoinsEarned: 0, // New Stat
  classicHighScore: 0,
  offlineHighScore: 0,
  totalLinesCleared: 0,
  loginStreakMax: 0,
  zeroTilesLosses: 0
};

// Generate fresh missions
const generateDailyMissions = (): DailyMission[] => {
  return DAILY_MISSION_TEMPLATES.map((tmpl, index) => ({
    ...tmpl,
    id: `mission_${getTodayDateString()}_${index}`,
    progress: 0,
    isClaimed: false
  }));
};

const DEFAULT_USER: UserProfile = {
    username: 'Player 1',
    avatarUrl: '',
    coins: 100,
    highScore: 0,
    inventory: { themes: ['default'] },
    lastDailyRewardClaim: '',
    dailyStreak: 0,
    stats: DEFAULT_STATS,
    claimedAchievements: [],
    missionDate: '',
    dailyMissions: [],
    isGoogleLinked: false,
    hasCompletedOnboarding: false
};

// --- Hook ---
export const useGameEngine = () => {
  // --- Persistent State (Mocking Cloud/Local Storage) ---
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('bbm_user');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (!parsed.stats) parsed.stats = DEFAULT_STATS;
            if (!parsed.username || parsed.username === 'Player 1') {
                parsed.username = generateRandomUsername();
            }
            return parsed;
        } catch (e) {
            return { ...DEFAULT_USER, username: generateRandomUsername() };
        }
    }
    return { ...DEFAULT_USER, username: generateRandomUsername() };
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('bbm_settings');
    return saved ? JSON.parse(saved) : { soundEnabled: true, musicEnabled: true, vibrationEnabled: true };
  });

  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(() => {
    return (localStorage.getItem('bbm_theme') as ThemeId) || 'default';
  });

  // --- Game State ---
  const [grid, setGrid] = useState<Grid>(createEmptyGrid());
  const [score, setScore] = useState(0);
  const [tray, setTray] = useState<(DraggableBlock | null)[]>([null, null, null]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [reviveCount, setReviveCount] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  
  // --- Combo & Animation State ---
  const [comboStreak, setComboStreak] = useState(0);
  const [animatingCells, setAnimatingCells] = useState<string[]>([]); // "y,x"
  const [isInputLocked, setIsInputLocked] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  
  // --- Special Blocks (Target Cells) ---
  const [targetCells, setTargetCells] = useState<Set<string>>(new Set());
  
  // --- Challenge Mode State ---
  const [challenge, setChallenge] = useState<ChallengeState>({
    isActive: false,
    stake: 0,
    timeLeft: 180, // 3 minutes
    opponent: { name: 'Opponent', score: 0, avatarBg: 'bg-gray-500', isAi: true },
    status: 'FINISHED',
    result: null
  });

  // --- Ads State ---
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showRewarded, setShowRewarded] = useState(false);
  const [rewardType, setRewardType] = useState<'REVIVE' | 'COINS' | 'THEME' | null>(null);
  const [adsWatchedToday, setAdsWatchedToday] = useState(0);
  const gameTimerRef = useRef<number>(0);
  const scoreSyncTimeoutRef = useRef<any>(null);
  
  // --- Sync State ---
  const isSyncing = useRef(false);
  const isProfileLoaded = useRef(false); // CRITICAL: Prevents overwriting cloud data with local empty state

  // --- Theme Access ---
  const currentTheme: Theme = THEMES[activeThemeId] || THEMES['default'];
  const currentLevel = Math.max(1, Math.min(10, Math.floor(score / 800) + 1));

  // --- Block Generator with Difficulty ---
  const getWeightedBlock = useCallback((level: number): DraggableBlock => {
    const palette = currentTheme.blockPalette;
    const color = palette[Math.floor(Math.random() * palette.length)];
    
    let easyWeight = Math.max(15, 85 - (level * 7));
    let hardWeight = Math.min(50, (level - 1) * 6);
    let mediumWeight = 100 - easyWeight - hardWeight;

    const roll = Math.random() * 100;
    let shapePool = SHAPES_EASY;

    if (roll < easyWeight) {
        shapePool = SHAPES_EASY;
    } else if (roll < easyWeight + mediumWeight) {
        shapePool = SHAPES_MEDIUM;
    } else {
        shapePool = SHAPES_HARD;
    }

    const shape = shapePool[Math.floor(Math.random() * shapePool.length)];

    return { 
      id: Math.random().toString(36).substr(2, 9), 
      instanceId: Math.random().toString(36),
      shape, 
      color 
    };
  }, [currentTheme]);

  
  // --- Daily Reward Logic ---
  const today = getTodayDateString();
  const isDailyRewardAvailable = user.lastDailyRewardClaim !== today;
  
  const getStreakDay = () => {
    if (!user.lastDailyRewardClaim) return 1;
    if (user.lastDailyRewardClaim === today) return (user.dailyStreak % 7) || 7; 
    
    const diff = getDaysDifference(user.lastDailyRewardClaim, today);
    if (diff === 1) return ((user.dailyStreak + 1) % 7) || 7; 
    else return 1;
  };

  // --- Effects ---
  useEffect(() => { localStorage.setItem('bbm_user', JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem('bbm_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('bbm_theme', activeThemeId); }, [activeThemeId]);

  // --- REALTIME SCORE SYNCING (For Friendly Rooms) ---
  useEffect(() => {
    if (gameMode !== 'CHALLENGE' || !challenge.matchId || !challenge.roomCode) return;
    
    // Clear previous pending update
    if (scoreSyncTimeoutRef.current) {
        clearTimeout(scoreSyncTimeoutRef.current);
    }

    // Debounce the score update to avoid spamming DB
    scoreSyncTimeoutRef.current = setTimeout(async () => {
        const field = challenge.isHost ? 'player1_score' : 'player2_score';
        try {
            await supabase
                .from('challenge_matches')
                .update({ [field]: score })
                .eq('id', challenge.matchId);
        } catch (err) {
            console.error("Failed to sync score:", err);
        }
    }, 1000); // 1 second debounce

    return () => clearTimeout(scoreSyncTimeoutRef.current);

  }, [score, gameMode, challenge.matchId, challenge.roomCode, challenge.isHost]);

  // --- REALTIME MATCH LISTENER (Opponent Score & Surrender) ---
  useEffect(() => {
    if (gameMode !== 'CHALLENGE' || !challenge.matchId || !challenge.roomCode) return;

    const channel = supabase.channel(`live_match_${challenge.matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'challenge_matches',
          filter: `id=eq.${challenge.matchId}`
        },
        (payload) => {
          const newData = payload.new;
          
          // 1. Update Opponent Score
          // If I am Host (P1), I read P2's score. If I am Guest (P2), I read P1's score.
          const oppScore = challenge.isHost ? newData.player2_score : newData.player1_score;
          if (typeof oppScore === 'number') {
              setChallenge(prev => ({
                 ...prev,
                 opponent: { ...prev.opponent, score: oppScore }
              }));
          }

          // 2. Check for Win/Surrender
          // If a winner is declared in DB (via surrender or match end)
          if (newData.status === 'completed' && newData.winner_id) {
               // Determine if I am the winner based on current authenticated user ID
               const amIWinner = newData.winner_id === user.id;

               setChallenge(prev => ({ 
                   ...prev, 
                   status: 'FINISHED', 
                   result: amIWinner ? 'WIN' : 'LOSS' 
               }));
               setIsGameOver(true);
               
               if (settings.soundEnabled) {
                   playSound(amIWinner ? 'clear' : 'gameover');
               }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameMode, challenge.matchId, challenge.roomCode, challenge.isHost, user.id, settings.soundEnabled]);


  // --- SYNC TO CLOUD ---
  useEffect(() => {
      // 1. If user is not logged in, do not sync
      if (!user.isGoogleLinked && !user.email) return;
      // 2. If already syncing, wait
      if (isSyncing.current) return;
      // 3. CRITICAL: If we haven't loaded the profile from cloud yet, DO NOT SYNC.
      if (!isProfileLoaded.current) return;

      const syncToCloud = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          
          isSyncing.current = true;

          const updates = {
              id: session.user.id,
              username: user.username,
              avatar_url: user.avatarUrl,
              coins: user.coins,
              high_score: user.highScore,
              inventory: user.inventory,
              stats: user.stats,
              last_daily_reward_claim: user.lastDailyRewardClaim,
              daily_streak: user.dailyStreak,
              daily_missions: user.dailyMissions,
              updated_at: new Date()
          };

          const { error } = await supabase.from('profiles').upsert(updates);
          if (error) {
              console.error('Error syncing profile:', error);
          }
          setTimeout(() => { isSyncing.current = false; }, 1000);
      };

      const timer = setTimeout(syncToCloud, 2000); 
      return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (floatingTexts.length > 0) {
      const timer = setTimeout(() => {
        setFloatingTexts(prev => prev.slice(1));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [floatingTexts]);

  useEffect(() => {
     if (user.missionDate !== today) {
         setUser(prev => ({
             ...prev,
             missionDate: today,
             dailyMissions: generateDailyMissions()
         }));
     }
  }, [today, user.missionDate]);

  // --- Profile Loading Logic ---
  const fetchAndSetProfile = async (userId: string, email: string) => {
      isSyncing.current = true; // Lock sync so we don't overwrite while fetching
      try {
          // Attempt to load existing profile
          const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();

          if (data) {
              // Found Cloud Profile -> LOAD IT
              setUser({
                  ...DEFAULT_USER, // Ensure shape
                  id: userId,
                  username: data.username || generateRandomUsername(),
                  avatarUrl: data.avatar_url,
                  coins: data.coins ?? 100,
                  highScore: data.high_score ?? 0,
                  stats: data.stats || DEFAULT_STATS,
                  inventory: data.inventory || { themes: ['default'] },
                  isGoogleLinked: true,
                  email: email,
                  hasCompletedOnboarding: true,
                  dailyMissions: data.daily_missions || generateDailyMissions(),
                  lastDailyRewardClaim: data.last_daily_reward_claim || '',
                  dailyStreak: data.daily_streak || 0,
                  claimedAchievements: [] 
              });
              isProfileLoaded.current = true; // Mark safe to sync
          } else {
              // No Cloud Profile -> CREATE from Local
              const newProfile = {
                  id: userId,
                  username: user.username && user.username !== 'Player 1' ? user.username : generateRandomUsername(),
                  coins: user.coins,
                  stats: user.stats,
                  high_score: user.highScore,
                  inventory: user.inventory,
                  created_at: new Date()
              };
              
              const { error: insertError } = await supabase.from('profiles').insert(newProfile);
              
              // If insert fails (e.g. duplicate key or network), we should STILL log the user in locally
              // to prevent getting stuck on onboarding. We will try to sync later.
              if (insertError) {
                  console.error("Profile creation error (handled):", insertError);
              }

              setUser(prev => ({
                  ...prev,
                  id: userId,
                  isGoogleLinked: true,
                  email: email,
                  hasCompletedOnboarding: true
              }));
              isProfileLoaded.current = true; 
          }
      } catch (err) {
          console.error("Profile load failed:", err);
          // Graceful degradation: Allow login even if DB fails
          setUser(prev => ({ 
             ...prev, 
             id: userId, 
             hasCompletedOnboarding: true, 
             email: email, 
             isGoogleLinked: true 
          }));
      } finally {
          setTimeout(() => { isSyncing.current = false; }, 500);
      }
  };

  // --- Auth Listeners ---
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
         fetchAndSetProfile(session.user.id, session.user.email || '');
      }
    });

    // Listen for auth changes (like OAuth redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
         fetchAndSetProfile(session.user.id, session.user.email || '');
      } else if (event === 'SIGNED_OUT') {
         isProfileLoaded.current = false;
         setUser({ ...DEFAULT_USER, username: generateRandomUsername() });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const trackEvent = (key: keyof UserStats, amount: number = 1) => {
     setUser(prev => ({
        ...prev,
        stats: {
           ...prev.stats,
           [key]: (prev.stats[key] || 0) + amount
        }
     }));
  };

  const trackMissionProgress = (type: MissionType, amount: number = 1) => {
     setUser(prev => {
        const newMissions = prev.dailyMissions.map(m => {
           if (m.type === type && !m.isClaimed) {
              if (type === 'SCORE_SINGLE') {
                 return { ...m, progress: Math.max(m.progress, amount) };
              }
              return { ...m, progress: Math.min(m.target, m.progress + amount) };
           }
           return m;
        });
        return { ...prev, dailyMissions: newMissions };
     });
  };

  const claimMissionReward = (missionId: string) => {
      const mission = user.dailyMissions.find(m => m.id === missionId);
      if (!mission || mission.isClaimed || mission.progress < mission.target) return;

      setUser(prev => ({
          ...prev,
          coins: prev.coins + mission.reward,
          dailyMissions: prev.dailyMissions.map(m => 
             m.id === missionId ? { ...m, isClaimed: true } : m
          )
      }));
      
      confetti({
         particleCount: 80,
         spread: 60,
         origin: { y: 0.7 }
      });
  };

  const incrementCoins = (amount: number, source: 'CLASSIC' | 'OTHER' = 'OTHER') => {
     setUser(prev => ({
        ...prev,
        coins: prev.coins + amount,
        stats: {
           ...prev.stats,
           totalCoinsEarned: (prev.stats.totalCoinsEarned || 0) + amount,
           classicCoinsEarned: source === 'CLASSIC' 
               ? (prev.stats.classicCoinsEarned || 0) + amount 
               : (prev.stats.classicCoinsEarned || 0)
        }
     }));
  };

  const claimAchievement = (achievementId: string, tierIndex: 0 | 1 | 2): boolean => {
      const claimId = `${achievementId}_${tierIndex + 1}`;
      if (user.claimedAchievements.includes(claimId)) return false;

      const achievement = ACHIEVEMENTS_DATA.find(a => a.id === achievementId);
      if (!achievement) return false;

      const tier = achievement.tiers[tierIndex];
      const currentValue = user.stats[achievement.statKey] || 0;

      if (currentValue >= tier.target) {
          setUser(prev => ({
             ...prev,
             coins: prev.coins + tier.reward,
             claimedAchievements: [...prev.claimedAchievements, claimId]
          }));
          return true;
      }
      return false;
  };

  const updateUsername = (name: string) => {
    setUser(prev => ({ ...prev, username: name }));
  };

  const updateAvatar = (url: string) => {
    setUser(prev => ({ ...prev, avatarUrl: url }));
  };

  const purchaseCustomAvatar = (imageBase64: string): boolean => {
    if (user.coins >= 1000) {
       setUser(prev => ({
          ...prev,
          coins: prev.coins - 1000,
          avatarUrl: imageBase64
       }));
       if (settings.soundEnabled) playSound('perfect');
       return true;
    }
    return false;
  };

  // --- AUTH ACTIONS ---
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    });
    if (error) console.error("Google Sign In Error:", error);
  };
  
  const signInWithEmail = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { error: error.message };
    // onAuthStateChange will handle fetching profile
    return { error: null };
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signUp({ 
        email, 
        password: pass,
        options: {
            data: {
                username: email.split('@')[0],
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
            }
        }
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const logout = async () => {
      await supabase.auth.signOut();
      isProfileLoaded.current = false;
      setUser({
          ...DEFAULT_USER,
          username: generateRandomUsername(),
          hasCompletedOnboarding: false 
      });
  };

  const playAsGuest = () => {
      setUser(prev => ({
          ...prev,
          isGoogleLinked: false,
          hasCompletedOnboarding: true,
          username: prev.username && prev.username !== 'Player 1' ? prev.username : generateRandomUsername(),
      }));
  };
  
  const returnToOnboarding = () => {
      setUser(prev => ({ ...prev, hasCompletedOnboarding: false }));
  };

  // --- Global Timers ---
  useEffect(() => {
     if (!isGameOver && (gameMode === 'CLASSIC' || (gameMode === 'CHALLENGE' && challenge.status === 'PLAYING'))) {
        const timer = setInterval(() => {
           gameTimerRef.current += 1;
           if (gameTimerRef.current % 5 === 0) {
               trackEvent('totalPlayTimeSeconds', 5);
           }
           if (gameTimerRef.current > 0 && gameTimerRef.current % 300 === 0 && !showInterstitial && !showRewarded) {
               setShowInterstitial(true);
           }
        }, 1000);
        return () => clearInterval(timer);
     }
  }, [isGameOver, gameMode, challenge.status, showInterstitial, showRewarded]);

  // Challenge Timer
  useEffect(() => {
    if (gameMode !== 'CHALLENGE' || challenge.status !== 'PLAYING' || isGameOver) return;

    const timer = setInterval(() => {
      setChallenge(prev => {
        if (prev.timeLeft <= 1) {
          setIsGameOver(true);
          return { ...prev, timeLeft: 0, status: 'FINISHED' };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameMode, challenge.status, isGameOver]);

  // Calculate Challenge Result on Game Over (For normal finish)
  useEffect(() => {
    if (isGameOver && gameMode === 'CHALLENGE' && challenge.status !== 'FINISHED') {
       setChallenge(prev => ({ ...prev, status: 'FINISHED' }));
    }

    if (isGameOver && gameMode === 'CHALLENGE' && !challenge.result) {
      let result: 'WIN' | 'LOSS' | 'DRAW' = 'DRAW';
      if (score > challenge.opponent.score) result = 'WIN';
      else if (score < challenge.opponent.score) result = 'LOSS';

      setChallenge(prev => ({ ...prev, result }));

      if (result === 'WIN') {
        const winnings = challenge.stake * 2;
        if (challenge.stake > 0) {
            incrementCoins(winnings, 'OTHER'); 
            trackEvent('rankedWins', 1);
        }
        trackEvent('challengeWins', 1);
        if (settings.soundEnabled) playSound('clear'); 
      }
      
      trackMissionProgress('SCORE_SINGLE', score);
    }
  }, [isGameOver, gameMode, challenge.status, challenge.result, score, challenge.opponent.score, challenge.stake]);


  useEffect(() => {
    if (tray.every(b => b === null) && !isGameOver && !isInputLocked) {
      const newTray = [
        getWeightedBlock(currentLevel),
        getWeightedBlock(currentLevel),
        getWeightedBlock(currentLevel)
      ];
      setTray(newTray);
    }
  }, [tray, isGameOver, isInputLocked, getWeightedBlock, currentLevel]);

  const canPlaceBlock = (currentGrid: Grid, shape: number[][], x: number, y: number): boolean => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c] === 1) {
          const targetX = x + c;
          const targetY = y + r;
          if (
            targetX < 0 || targetX >= BOARD_SIZE || 
            targetY < 0 || targetY >= BOARD_SIZE ||
            currentGrid[targetY][targetX] !== null
          ) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const updateScore = (points: number) => {
    setScore(prevScore => {
       const newScore = prevScore + points;
       
       if (gameMode === 'CLASSIC') {
           if (newScore > user.highScore) {
               setUser(prev => ({ 
                   ...prev, 
                   highScore: newScore,
                   stats: { ...prev.stats, classicHighScore: Math.max(prev.stats.classicHighScore, newScore) } 
               }));
           } else if (newScore > user.stats.classicHighScore) {
               trackEvent('classicHighScore', newScore - user.stats.classicHighScore); 
           }
       } else if (gameMode === 'OFFLINE') {
           if (newScore > (user.stats.offlineHighScore || 0)) {
               setUser(prev => ({
                   ...prev,
                   stats: { ...prev.stats, offlineHighScore: newScore }
               }));
           }
       }
       return newScore;
    });
  };

  const checkStuckCondition = () => {
    const activeBlocks = tray.filter(b => b !== null);
    if (activeBlocks.length === 0) return; 

    let possibleMove = false;
    for (const block of activeBlocks) {
      if (!block) continue;
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          if (canPlaceBlock(grid, block.shape, x, y)) {
            possibleMove = true;
            break;
          }
        }
        if (possibleMove) break;
      }
      if (possibleMove) break;
    }

    if (!possibleMove) {
      setIsGameOver(true);
      if (activeBlocks.length === 1) {
          trackEvent('zeroTilesLosses', 1);
      }
      if (gameMode === 'CLASSIC') {
          trackMissionProgress('SCORE_SINGLE', score);
      }
      if (settings.soundEnabled) playSound('gameover');
    }
  }

  useEffect(() => {
    if (isGameOver || gameMode === 'CHALLENGE' || isInputLocked) return; 
    checkStuckCondition();
  }, [grid, tray, isGameOver, gameMode, isInputLocked]);

  useEffect(() => {
    if (gameMode === 'CHALLENGE' && !isGameOver && challenge.status === 'PLAYING' && !isInputLocked) {
      checkStuckCondition();
    }
  }, [grid, tray, isGameOver, gameMode, challenge.status, isInputLocked]);


  const addFloatingText = (text: string, color: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setFloatingTexts(prev => [...prev, {
      id,
      text,
      x: 50, 
      y: 40,
      color
    }]);
  };

  const placeBlock = (block: DraggableBlock, x: number, y: number) => {
    if (isInputLocked) return false;
    if (!canPlaceBlock(grid, block.shape, x, y)) return false;

    const newGrid = grid.map(row => [...row]);
    const newlyOccupiedCells: string[] = [];
    let cellsPlaced = 0;
    
    for (let r = 0; r < block.shape.length; r++) {
      for (let c = 0; c < block.shape[0].length; c++) {
        if (block.shape[r][c] === 1) {
          newGrid[y + r][x + c] = block.color;
          newlyOccupiedCells.push(`${y + r},${x + c}`);
          cellsPlaced++;
        }
      }
    }
    
    setTray(prev => prev.map(b => (b?.instanceId === block.instanceId ? null : b)));

    let currentTargets = new Set(targetCells);
    let addedTarget: string | null = null;
    
    if (gameMode === 'CLASSIC' && newlyOccupiedCells.length > 0) {
        if (Math.random() < 0.3) {
            const randomCell = newlyOccupiedCells[Math.floor(Math.random() * newlyOccupiedCells.length)];
            if (!currentTargets.has(randomCell)) {
                addedTarget = randomCell;
                currentTargets.add(randomCell);
            }
        }
    }

    if (addedTarget) {
        setTargetCells(prev => new Set(prev).add(addedTarget!));
    }

    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];
    const clearingCells = new Set<string>();

    for (let r = 0; r < BOARD_SIZE; r++) {
      if (newGrid[r].every(cell => cell !== null)) rowsToClear.push(r);
    }
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (newGrid.every(row => row[c] !== null)) colsToClear.push(c);
    }

    const totalLines = rowsToClear.length + colsToClear.length;
    
    if (totalLines > 0) {
       rowsToClear.forEach(r => {
         for(let c=0; c<BOARD_SIZE; c++) clearingCells.add(`${r},${c}`);
       });
       colsToClear.forEach(c => {
         for(let r=0; r<BOARD_SIZE; r++) clearingCells.add(`${r},${c}`);
       });

       setIsInputLocked(true);
       setGrid(newGrid);
       setAnimatingCells(Array.from(clearingCells));
       if (settings.soundEnabled) playSound('blast');
       if (settings.vibrationEnabled && navigator.vibrate) navigator.vibrate(50);

       setTimeout(() => {
          const clearedTargets: string[] = [];
          clearingCells.forEach(cell => {
             if (currentTargets.has(cell)) {
                clearedTargets.push(cell);
             }
          });

          const cellsClearedCount = clearingCells.size;
          
          let lineMult = 1;
          if (totalLines === 2) lineMult = 2;
          else if (totalLines >= 3) lineMult = 3;

          const streakBonus = comboStreak > 0 ? (comboStreak * 0.2) : 0;
          const totalMult = lineMult + streakBonus;

          const clearScore = Math.floor((cellsClearedCount * 3) * totalMult);
          const totalScoreGained = clearScore + cellsPlaced;

          let feedbackText = "";
          let feedbackColor = "text-white";
          
          if (totalLines >= 3) {
             feedbackText = "3X MEGA COMBO!";
             feedbackColor = "text-pink-400";
             if (settings.soundEnabled) playSound('perfect');
          } else if (totalLines === 2) {
             feedbackText = "2X BONUS!";
             feedbackColor = "text-orange-400";
             if (settings.soundEnabled) playSound('combo');
          } else if (comboStreak > 0) {
             feedbackText = `COMBO STREAK x${(1 + streakBonus + 0.2).toFixed(1)}`;
             feedbackColor = "text-yellow-300";
             if (settings.soundEnabled) playSound('combo');
          }

          if (feedbackText) addFloatingText(feedbackText, feedbackColor);
          
          if (clearedTargets.length > 0) {
              const coinBonus = clearedTargets.length * 1; 
              incrementCoins(coinBonus, 'CLASSIC');
              
              addFloatingText(`+${coinBonus} Coins!`, 'text-yellow-400');
              if (settings.soundEnabled) playSound('perfect');
              
              setTargetCells(prev => {
                  const next = new Set(prev);
                  clearedTargets.forEach(t => next.delete(t));
                  return next;
              });
          }

          const clearedGrid = newGrid.map(row => [...row]);
          rowsToClear.forEach(r => {
             for(let c=0; c<BOARD_SIZE; c++) clearedGrid[r][c] = null;
          });
          colsToClear.forEach(c => {
             for(let r=0; r<BOARD_SIZE; r++) clearedGrid[r][c] = null;
          });

          setGrid(clearedGrid);
          setAnimatingCells([]);
          setComboStreak(prev => prev + 1);
          setIsInputLocked(false);
          
          updateScore(totalScoreGained);
          
          trackEvent('totalLinesCleared', totalLines);
          trackMissionProgress('CLEAR_LINES', totalLines);
          confetti({
             particleCount: totalLines * 15,
             spread: 60,
             origin: { y: 0.5 },
             colors: currentTheme.blockPalette
          });

       }, 350); 

    } else {
       setGrid(newGrid);
       setComboStreak(0); 
       updateScore(cellsPlaced); 
       if (settings.soundEnabled) playSound('place');
    }

    return true;
  };

  const resetGame = () => {
    setGrid(createEmptyGrid());
    setScore(0);
    setTray([null, null, null]); 
    setIsGameOver(false);
    setReviveCount(0);
    setComboStreak(0);
    setAnimatingCells([]);
    setIsInputLocked(false);
    setFloatingTexts([]);
    setTargetCells(new Set());
  };

  const quitCurrentMatch = () => {
      resetGame();
  };

  const startChallenge = (
    stake: number, 
    isRoom: boolean = false, 
    roomCode?: string, 
    amIHost: boolean = false, 
    opponentName: string = 'Opponent',
    matchId?: number,
    opponentId?: string
  ) => {
    const finalStake = isRoom ? 0 : stake;
    
    if (user.coins < finalStake) return false;

    if (finalStake > 0) {
        setUser(prev => ({ ...prev, coins: prev.coins - finalStake }));
        trackMissionProgress('PLAY_RANKED', 1);
    }

    trackEvent('challengeMatchesPlayed', 1);
    if (finalStake > 0) trackEvent('rankedMatchesPlayed', 1);
    else trackEvent('friendlyMatchesPlayed', 1);

    const isAi = isRoom ? false : (finalStake > 0); 
    const initialStatus = isRoom ? 'VS_ANIMATION' : 'MATCHMAKING';

    setChallenge({
      isActive: true,
      stake: finalStake,
      timeLeft: 180, 
      opponent: {
        name: opponentName,
        score: 0,
        avatarBg: 'bg-gradient-to-br from-red-500 to-orange-500',
        isAi: isAi 
      },
      roomCode,
      matchId,
      opponentId,
      isHost: amIHost, 
      status: initialStatus,
      result: null
    });

    setGameMode('CHALLENGE');
    resetGame();
    
    if (isRoom) {
        // Slight delay for UI transition
        setTimeout(() => setChallenge(prev => ({ ...prev, status: 'PLAYING' })), 2000);
    } 

    return true;
  };
  
  const handleStartGame = (mode: 'CLASSIC' | 'OFFLINE') => {
      setGameMode(mode);
      if (mode === 'CLASSIC') {
          trackEvent('classicMatchesPlayed', 1);
          trackMissionProgress('PLAY_CLASSIC', 1);
      }
      resetGame();
  }

  const surrenderMatch = async () => {
    if (gameMode === 'CHALLENGE' && !isGameOver) {
        // If it is a real match, notify server that opponent won
        if (challenge.matchId && challenge.opponentId) {
            try {
                await supabase
                    .from('challenge_matches')
                    .update({ 
                        status: 'completed', 
                        winner_id: challenge.opponentId // Declare opponent as winner
                    })
                    .eq('id', challenge.matchId);
            } catch (err) {
                console.error("Failed to surrender on server", err);
            }
        }

        // Local state update for the person surrendering
        setChallenge(prev => ({ ...prev, status: 'FINISHED', result: 'LOSS' }));
        setIsGameOver(true);
        if (settings.soundEnabled) playSound('gameover');
    }
  };

  const reviveGame = () => {
    const newGrid = grid.map(row => [...row]);
    for (let i = 3; i < 3; i++) {
        const isRow = Math.random() > 0.5;
        const index = Math.floor(Math.random() * BOARD_SIZE);
        if (isRow) {
            for(let c=0; c<BOARD_SIZE; c++) newGrid[index][c] = null;
        } else {
            for(let r=0; r<BOARD_SIZE; r++) newGrid[r][index] = null;
        }
    }
    setGrid(newGrid);
    setIsGameOver(false);
    setReviveCount(prev => prev + 1);
  };

  const watchAd = (type: 'REVIVE' | 'COINS') => {
    setRewardType(type);
    setShowRewarded(true);
  };

  const handleAdComplete = () => {
    setShowRewarded(false);
    trackEvent('adsWatched', 1);
    trackMissionProgress('WATCH_ADS', 1);
    
    if (rewardType === 'REVIVE') {
      reviveGame();
    } else if (rewardType === 'COINS') {
      if (adsWatchedToday < 10) {
        incrementCoins(20, 'OTHER'); 
        setAdsWatchedToday(prev => prev + 1);
      }
    }
    setRewardType(null);
  };

  const buyTheme = (themeId: ThemeId): boolean => {
    const theme = THEMES[themeId];
    if (user.coins >= theme.price) {
      setUser(prev => ({
        ...prev,
        coins: prev.coins - theme.price,
        inventory: { ...prev.inventory, themes: [...prev.inventory.themes, themeId] }
      }));
      return true;
    }
    return false;
  };

  const claimDailyReward = () => {
    if (isDailyRewardAvailable) {
      let newStreak = 1;
      if (user.lastDailyRewardClaim) {
        const diff = getDaysDifference(user.lastDailyRewardClaim, today);
        if (diff === 1) newStreak = user.dailyStreak + 1;
        else newStreak = 1;
      }

      if (newStreak > user.stats.loginStreakMax) {
          trackEvent('loginStreakMax', newStreak - user.stats.loginStreakMax);
      }

      const dayIndex = ((newStreak - 1) % 7) + 1;
      let rewardCoins = 50;
      if (dayIndex === 7) rewardCoins = 200;
      else if (dayIndex >= 4) rewardCoins = 100;

      incrementCoins(rewardCoins, 'OTHER');
      
      setUser(prev => ({
        ...prev,
        lastDailyRewardClaim: today,
        dailyStreak: newStreak
      }));
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  return {
    user, setUser,
    settings, setSettings,
    activeThemeId, setActiveThemeId,
    currentTheme,
    grid, score, tray, isGameOver,
    gameMode, setGameMode: handleStartGame, 
    placeBlock, canPlaceBlock, resetGame,
    showInterstitial, setShowInterstitial,
    showRewarded, setShowRewarded,
    watchAd, handleAdComplete,
    buyTheme, adsWatchedToday,
    reviveCount,
    isDailyRewardAvailable,
    claimDailyReward,
    streakDay: getStreakDay(),
    challenge, startChallenge,
    surrenderMatch,
    claimAchievement,
    claimMissionReward,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    playAsGuest,
    returnToOnboarding,
    quitCurrentMatch,
    animatingCells, 
    floatingTexts,
    isInputLocked,
    currentLevel,
    targetCells,
    updateUsername,
    updateAvatar,
    purchaseCustomAvatar
  };
};

const playSound = (type: 'place' | 'clear' | 'gameover' | 'click' | 'blast' | 'combo' | 'perfect') => {
    // console.log(`Playing sound: ${type}`);
};
