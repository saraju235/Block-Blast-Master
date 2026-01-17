
import { useState, useEffect, useCallback, useRef } from 'react';
import { GameMode, Grid, DraggableBlock, UserProfile, GameSettings, Theme, ThemeId, BlockDefinition, ChallengeState, UserStats, MissionType, DailyMission, FloatingText } from '../types';
import { BOARD_SIZE, SHAPES, SHAPES_EASY, SHAPES_MEDIUM, SHAPES_HARD, THEMES, ACHIEVEMENTS_DATA, DAILY_MISSION_TEMPLATES } from '../constants';
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

// --- Hook ---
export const useGameEngine = () => {
  // --- Persistent State (Mocking Cloud/Local Storage) ---
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('bbm_user');
    const parsed = saved ? JSON.parse(saved) : {
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
    
    if (!parsed.lastDailyRewardClaim) parsed.lastDailyRewardClaim = '';
    if (typeof parsed.dailyStreak !== 'number') parsed.dailyStreak = 0;
    if (!parsed.stats) parsed.stats = DEFAULT_STATS;
    else {
        if (typeof parsed.stats.offlineHighScore === 'undefined') parsed.stats.offlineHighScore = 0;
    }
    if (!parsed.claimedAchievements) parsed.claimedAchievements = [];
    if (!parsed.dailyMissions) parsed.dailyMissions = [];
    if (typeof parsed.isGoogleLinked === 'undefined') parsed.isGoogleLinked = false;
    // For legacy users who already played but don't have this flag, assume they finished onboarding
    if (typeof parsed.hasCompletedOnboarding === 'undefined') parsed.hasCompletedOnboarding = true; 

    return parsed;
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

  // --- Theme Access ---
  const currentTheme: Theme = THEMES[activeThemeId] || THEMES['default'];
  
  // --- Leveling Logic ---
  // Level 1: 0-1000, Level 2: 1000-2500, Level 3: 2500-5000, Level 4: 5000+
  const currentLevel = Math.max(1, Math.min(10, Math.floor(score / 800) + 1));

  // --- Block Generator with Difficulty ---
  const getWeightedBlock = useCallback((level: number): DraggableBlock => {
    const palette = currentTheme.blockPalette;
    const color = palette[Math.floor(Math.random() * palette.length)];
    
    // Probabilities based on Level (1 to 10)
    // Level 1: 80% Easy, 20% Medium, 0% Hard
    // Level 5: 40% Easy, 40% Medium, 20% Hard
    // Level 10: 15% Easy, 35% Medium, 50% Hard
    
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

  // Clean up floating texts after animation
  useEffect(() => {
    if (floatingTexts.length > 0) {
      const timer = setTimeout(() => {
        setFloatingTexts(prev => prev.slice(1));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [floatingTexts]);

  // Check Daily Missions Reset
  useEffect(() => {
     if (user.missionDate !== today) {
         setUser(prev => ({
             ...prev,
             missionDate: today,
             dailyMissions: generateDailyMissions()
         }));
     }
  }, [today, user.missionDate]);

  // --- Stats & Mission Helpers ---
  const trackEvent = (key: keyof UserStats, amount: number = 1) => {
     setUser(prev => ({
        ...prev,
        stats: {
           ...prev.stats,
           [key]: prev.stats[key] + amount
        }
     }));
  };

  const trackMissionProgress = (type: MissionType, amount: number = 1) => {
     setUser(prev => {
        const newMissions = prev.dailyMissions.map(m => {
           if (m.type === type && !m.isClaimed) {
              // Special logic for Single Score: we replace progress with best score if higher
              if (type === 'SCORE_SINGLE') {
                 return { ...m, progress: Math.max(m.progress, amount) };
              }
              // Normal cumulative logic
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

  const incrementCoins = (amount: number) => {
     setUser(prev => ({
        ...prev,
        coins: prev.coins + amount,
        stats: {
           ...prev.stats,
           totalCoinsEarned: prev.stats.totalCoinsEarned + amount
        }
     }));
  };

  const claimAchievement = (achievementId: string, tierIndex: 0 | 1 | 2): boolean => {
      const claimId = `${achievementId}_${tierIndex + 1}`;
      if (user.claimedAchievements.includes(claimId)) return false;

      const achievement = ACHIEVEMENTS_DATA.find(a => a.id === achievementId);
      if (!achievement) return false;

      const tier = achievement.tiers[tierIndex];
      const currentValue = user.stats[achievement.statKey];

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

  const signInWithGoogle = () => {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            setUser(prev => ({
                ...prev,
                isGoogleLinked: true,
                hasCompletedOnboarding: true,
                username: "Google Player", // Simulate fetch
                avatarUrl: "https://lh3.googleusercontent.com/a/default-user=s96-c"
            }));
            if (settings.soundEnabled) playSound('click');
            resolve();
        }, 1500);
    });
  };

  const playAsGuest = () => {
      setUser(prev => ({
          ...prev,
          isGoogleLinked: false,
          hasCompletedOnboarding: true,
          username: "Guest Player",
          avatarUrl: undefined
      }));
  };

  const signOutGoogle = () => {
      setUser(prev => ({
          ...prev,
          isGoogleLinked: false,
          username: "Player 1",
          avatarUrl: undefined
      }));
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


  // Challenge Mode Timer
  useEffect(() => {
    if (gameMode !== 'CHALLENGE' || challenge.status !== 'PLAYING' || isGameOver) return;

    const timer = setInterval(() => {
      setChallenge(prev => {
        if (prev.timeLeft <= 1) {
          // Time Up
          setIsGameOver(true);
          return { ...prev, timeLeft: 0, status: 'FINISHED' };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameMode, challenge.status, isGameOver]);

  // Realistic AI Scoring Logic
  useEffect(() => {
    if (gameMode !== 'CHALLENGE' || challenge.status !== 'PLAYING' || isGameOver) return;
    
    // STRICT CHECK: Double ensure this never runs for a friendly room match
    if (challenge.roomCode || !challenge.opponent.isAi) return; 

    let timeoutId: ReturnType<typeof setTimeout>;

    const simulateAiTurn = () => {
      // Thinking time: 2-4 seconds
      const thinkingTime = Math.random() * 2000 + 2000; 

      timeoutId = setTimeout(() => {
        setChallenge(prev => {
          if (prev.status !== 'PLAYING' || isGameOver) return prev;
          
          // 28% chance for big move
          const isBigMove = Math.random() < 0.28;
          
          let points = 0;
          if (isBigMove) {
            // Big move: ~25-85 points
            const lines = Math.floor(Math.random() * 3) + 1; 
            // 1 line: 25-35, 2 lines: 50-60, 3 lines: 75-85
            points = (lines * 25) + Math.floor(Math.random() * 11);
          } else {
            // Regular move: 4-20 points
            points = Math.floor(Math.random() * 16) + 4;
          }
          return {
            ...prev,
            opponent: { ...prev.opponent, score: prev.opponent.score + points }
          };
        });
        simulateAiTurn();
      }, thinkingTime);
    };

    simulateAiTurn();
    return () => clearTimeout(timeoutId);
  }, [gameMode, challenge.status, isGameOver, challenge.opponent.isAi, challenge.roomCode]);

  // Calculate Challenge Result on Game Over
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
            incrementCoins(winnings); 
            trackEvent('rankedWins', 1);
        }
        trackEvent('challengeWins', 1);
        if (settings.soundEnabled) playSound('clear'); 
      }
      
      trackMissionProgress('SCORE_SINGLE', score);
    }
  }, [isGameOver, gameMode, challenge.status, challenge.result, score, challenge.opponent.score, challenge.stake]);


  // Initialize/Refill Tray (Only if not animating/locked)
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

  // --- Gameplay Methods (Defined before usage in checkStuckCondition) ---

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
       
       // Handle High Score
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

  // Check Game Over logic (Classic & Offline)
  useEffect(() => {
    if (isGameOver || gameMode === 'CHALLENGE' || isInputLocked) return; 
    checkStuckCondition();
  }, [grid, tray, isGameOver, gameMode, isInputLocked]);

  // Check stuck condition for Challenge Mode
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
      x: 50, // Center
      y: 40,
      color
    }]);
  };

  const placeBlock = (block: DraggableBlock, x: number, y: number) => {
    if (isInputLocked) return false;
    if (!canPlaceBlock(grid, block.shape, x, y)) return false;

    // 1. Place Block (Immediate Visual)
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
    
    // Remove block from tray immediately
    setTray(prev => prev.map(b => (b?.instanceId === block.instanceId ? null : b)));

    // --- TARGET SYSTEM (Classic Only) ---
    // Capture current targets locally to ensure we calculate consistently inside this closure
    // before the async state update has happened for the next render.
    let currentTargets = new Set(targetCells);
    let addedTarget: string | null = null;
    
    if (gameMode === 'CLASSIC' && newlyOccupiedCells.length > 0) {
        // 30% chance for this block placement to spawn a target
        if (Math.random() < 0.3) {
            const randomCell = newlyOccupiedCells[Math.floor(Math.random() * newlyOccupiedCells.length)];
            if (!currentTargets.has(randomCell)) {
                addedTarget = randomCell;
                currentTargets.add(randomCell);
            }
        }
    }

    // Update the visual state for targets
    if (addedTarget) {
        setTargetCells(prev => new Set(prev).add(addedTarget!));
    }

    // 2. Identify Lines to Clear
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];
    const clearingCells = new Set<string>(); // "y,x"

    for (let r = 0; r < BOARD_SIZE; r++) {
      if (newGrid[r].every(cell => cell !== null)) rowsToClear.push(r);
    }
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (newGrid.every(row => row[c] !== null)) colsToClear.push(c);
    }

    const totalLines = rowsToClear.length + colsToClear.length;
    
    // 3. Process Logic
    if (totalLines > 0) {
       // --- ANIMATION PHASE ---
       
       // Populate clearing cells set
       rowsToClear.forEach(r => {
         for(let c=0; c<BOARD_SIZE; c++) clearingCells.add(`${r},${c}`);
       });
       colsToClear.forEach(c => {
         for(let r=0; r<BOARD_SIZE; r++) clearingCells.add(`${r},${c}`);
       });

       // Lock input and show animation
       setIsInputLocked(true);
       setGrid(newGrid);
       setAnimatingCells(Array.from(clearingCells));
       if (settings.soundEnabled) playSound('blast');
       if (settings.vibrationEnabled && navigator.vibrate) navigator.vibrate(50);

       // --- DELAYED CLEANUP PHASE (0.35s) ---
       setTimeout(() => {
          // A. Check Targets Cleared
          const clearedTargets: string[] = [];
          clearingCells.forEach(cell => {
             if (currentTargets.has(cell)) {
                clearedTargets.push(cell);
             }
          });

          // B. Calculate Scores
          const cellsClearedCount = clearingCells.size;
          
          // Multipliers
          let lineMult = 1;
          if (totalLines === 2) lineMult = 2;
          else if (totalLines >= 3) lineMult = 3;

          const streakBonus = comboStreak > 0 ? (comboStreak * 0.2) : 0;
          const totalMult = lineMult + streakBonus;

          // REDUCED SCORING FACTOR (from 10 to 3) to achieve 25-80 points per line clear base
          const clearScore = Math.floor((cellsClearedCount * 3) * totalMult);
          const totalScoreGained = clearScore + cellsPlaced; // Add placement points

          // C. Visual Feedback
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
          
          // D. Target Reward
          if (clearedTargets.length > 0) {
              const coinBonus = clearedTargets.length * 1; // 1 coin per target per feedback
              incrementCoins(coinBonus);
              addFloatingText(`+${coinBonus} Coins!`, 'text-yellow-400');
              if (settings.soundEnabled) playSound('perfect'); // Nice sound for money
              
              // Remove cleared targets from state
              setTargetCells(prev => {
                  const next = new Set(prev);
                  clearedTargets.forEach(t => next.delete(t));
                  return next;
              });
          }

          // E. Update Grid & Stats
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
          
          // F. Update Score
          updateScore(totalScoreGained);
          
          // Track
          trackEvent('totalLinesCleared', totalLines);
          trackMissionProgress('CLEAR_LINES', totalLines);
          confetti({
             particleCount: totalLines * 15,
             spread: 60,
             origin: { y: 0.5 },
             colors: currentTheme.blockPalette
          });

       }, 350); // Matches CSS animation duration

    } else {
       // --- NO LINES CLEARED ---
       setGrid(newGrid);
       setComboStreak(0); // Reset streak
       updateScore(cellsPlaced); // Just placement points
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

  // Called when user actively quits a match via the confirmation dialog
  const quitCurrentMatch = () => {
      // Logic to "save profile" is handled implicitly by state updates in updateScore
      // But we ensure strict saving here if needed.
      // For now, reset game and return to menu state handled by UI
      // If we wanted to add current score to coins or something:
      // const coinsEarned = Math.floor(score / 100);
      // incrementCoins(coinsEarned); 
      resetGame();
  };

  const startChallenge = (stake: number, isRoom: boolean = false, roomCode?: string) => {
    const finalStake = isRoom ? 0 : stake;
    
    if (user.coins < finalStake) return false;

    if (finalStake > 0) {
        setUser(prev => ({ ...prev, coins: prev.coins - finalStake }));
        trackMissionProgress('PLAY_RANKED', 1);
    }

    trackEvent('challengeMatchesPlayed', 1);
    if (finalStake > 0) trackEvent('rankedMatchesPlayed', 1);
    else trackEvent('friendlyMatchesPlayed', 1);

    const botNames = ['SpeedyBot', 'BlockMaster', 'PuzzleKing', 'TheCrusher', 'GridNinja', 'Luna', 'Kai', 'Nova', 'Rex'];
    const randomName = botNames[Math.floor(Math.random() * botNames.length)];
    const opponentName = isRoom ? 'Friend (P2)' : randomName;

    // Initial status differs for private rooms (Friend is already "there") vs Matchmaking
    const initialStatus = isRoom ? 'VS_ANIMATION' : 'MATCHMAKING';

    setChallenge({
      isActive: true,
      stake: finalStake,
      timeLeft: 180, 
      opponent: {
        name: opponentName,
        score: 0,
        avatarBg: 'bg-gradient-to-br from-red-500 to-orange-500',
        isAi: !isRoom 
      },
      roomCode,
      isHost: !roomCode, 
      status: initialStatus,
      result: null
    });

    setGameMode('CHALLENGE');
    resetGame();
    
    if (isRoom) {
        // Skip matchmaking delay for private rooms to avoid confusion
        setTimeout(() => {
            setChallenge(prev => ({ ...prev, status: 'PLAYING' }));
        }, 3000); // 3 seconds for VS Animation
    } else {
        const searchTime = Math.random() * 4000 + 6000; 
        
        setTimeout(() => {
          setChallenge(prev => ({ ...prev, status: 'VS_ANIMATION' }));
          setTimeout(() => {
            setChallenge(prev => ({ ...prev, status: 'PLAYING' }));
          }, 3000);
        }, searchTime);
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

  const surrenderMatch = () => {
    if (gameMode === 'CHALLENGE' && !isGameOver) {
        setChallenge(prev => ({ ...prev, status: 'FINISHED', result: 'LOSS' }));
        setIsGameOver(true);
        if (settings.soundEnabled) playSound('gameover');
    }
  };

  const reviveGame = () => {
    const newGrid = grid.map(row => [...row]);
    // Naive clear for rescue
    for (let i = 0; i < 3; i++) {
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
        incrementCoins(20); 
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

      incrementCoins(rewardCoins);
      
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
    signOutGoogle,
    playAsGuest,
    quitCurrentMatch,
    // New exports for UI
    animatingCells, 
    floatingTexts,
    isInputLocked,
    currentLevel,
    targetCells
  };
};

// Simple Sound Mock
// In a real app, these would play actual Audio objects
const playSound = (type: 'place' | 'clear' | 'gameover' | 'click' | 'blast' | 'combo' | 'perfect') => {
    // console.log(`Playing sound: ${type}`);
};
