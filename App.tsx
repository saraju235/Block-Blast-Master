
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, Play, Trophy, RotateCcw, Coins, Video, User, WifiOff, Plus, Wifi, Gift, Swords, Clock, Flag, AlertTriangle, Target, Crown, BarChart2, ArrowLeft, LogOut, CheckCircle } from 'lucide-react';
import { useGameEngine } from './hooks/useGameEngine';
import { BlockPiece } from './components/BlockPiece';
import { SettingsModal } from './components/SettingsModal';
import { DailyRewardModal } from './components/DailyRewardModal';
import { ChallengeSetupModal } from './components/ChallengeSetupModal';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { BannerAd } from './components/BannerAd';
import { RewardedAd } from './components/RewardedAd';
import { GoogleSignInBtn } from './components/GoogleSignInBtn';
import { DragState, DraggableBlock } from './types';
import { BOARD_SIZE, ADMOB_IDS } from './constants';

export default function App() {
  const {
    user, setUser,
    settings, setSettings,
    activeThemeId, setActiveThemeId,
    currentTheme,
    grid, score, tray, isGameOver,
    gameMode, setGameMode,
    placeBlock, canPlaceBlock, resetGame,
    showInterstitial, setShowInterstitial,
    showRewarded, setShowRewarded,
    watchAd, handleAdComplete,
    buyTheme, adsWatchedToday,
    reviveCount,
    isDailyRewardAvailable,
    claimDailyReward,
    streakDay,
    challenge, startChallenge,
    surrenderMatch,
    claimAchievement,
    claimMissionReward,
    signInWithGoogle,
    signOutGoogle,
    playAsGuest,
    quitCurrentMatch,
    animatingCells,
    floatingTexts,
    isInputLocked,
    currentLevel,
    targetCells
  } = useGameEngine();

  const [screen, setScreen] = useState<'MENU' | 'GAME'>('MENU');
  const [showSettings, setShowSettings] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showChallengeSetup, setShowChallengeSetup] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // Network State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Surrender confirmation state
  const [confirmSurrender, setConfirmSurrender] = useState(false);
  
  // Ad Reward State
  const [adRewardEarned, setAdRewardEarned] = useState(false);

  // Google Sign In Loading State
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // Responsive sizing
  const [boardSizePx, setBoardSizePx] = useState(300);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSize = () => {
      // Calculate available width, keeping some padding
      const w = Math.min(window.innerWidth - 32, 450); 
      setBoardSizePx(w);
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    
    // Network listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Reset ad reward state when ad opens
  useEffect(() => {
     if (showRewarded || showInterstitial) {
         setAdRewardEarned(false);
     }
  }, [showRewarded, showInterstitial]);

  const handleAdClose = () => {
      if (showRewarded) {
          if (adRewardEarned) {
              handleAdComplete(); // Grants coins
          } else {
              setShowRewarded(false); // Just close
          }
      } else {
          setShowInterstitial(false);
      }
  };
  
  const handleGoogleSignIn = async () => {
      if (signInWithGoogle) {
          setIsGoogleSigningIn(true);
          await signInWithGoogle();
          setIsGoogleSigningIn(false);
      }
  };

  const handleBackNavigation = () => {
    setShowExitConfirm(true);
  };

  const confirmExitGame = () => {
    quitCurrentMatch();
    setShowExitConfirm(false);
    setScreen('MENU');
  };

  const cellSize = boardSizePx / BOARD_SIZE;

  // --- Custom Pointer Drag Logic ---
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    block: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    touchOffset: { x: 0, y: 0 },
    originTrayIndex: -1
  });

  const handlePointerDown = (e: React.PointerEvent, block: DraggableBlock, index: number) => {
    if (isInputLocked) return; // Prevent drag if locked

    e.preventDefault(); 
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLDivElement;
    // CRITICAL: Capture pointer to track outside div and smooth out touch events
    target.setPointerCapture(e.pointerId);
    
    const rect = target.getBoundingClientRect();
    // Position of touch inside the SMALL tray block
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    // Calculate ratio (0 to 1) of where we touched relative to the tray item size
    // We use this to scale the offset for the FULL size dragged block
    const ratioX = localX / rect.width;
    const ratioY = localY / rect.height;

    // The dragged block will be rendered at full `cellSize`.
    // Calculate full dimensions:
    const cols = block.shape[0].length;
    const rows = block.shape.length;
    const fullWidth = cols * cellSize;
    const fullHeight = rows * cellSize;

    const scaledOffsetX = fullWidth * ratioX;
    const scaledOffsetY = fullHeight * ratioY;

    // We lift the block up by ~3 cells so the finger is at the bottom of the block
    // allowing the user to see where they are placing it.
    const liftAmount = cellSize * 3;

    setDragState({
      isDragging: true,
      block,
      startPosition: { x: e.clientX, y: e.clientY },
      currentPosition: { x: e.clientX, y: e.clientY },
      touchOffset: { 
          x: scaledOffsetX, 
          y: scaledOffsetY + liftAmount 
      }, 
      originTrayIndex: index
    });
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragState.isDragging) return;
    e.preventDefault();
    setDragState(prev => ({
      ...prev,
      currentPosition: { x: e.clientX, y: e.clientY }
    }));
  }, [dragState.isDragging]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!dragState.isDragging || !dragState.block) return;
    
    e.preventDefault();

    let placed = false;
    if (boardRef.current) {
      const boardRect = boardRef.current.getBoundingClientRect();
      const ghostX = dragState.currentPosition.x - dragState.touchOffset.x;
      const ghostY = dragState.currentPosition.y - dragState.touchOffset.y;
      
      const relativeX = ghostX - boardRect.left;
      const relativeY = ghostY - boardRect.top;
      
      // Calculate grid position based on the top-left of the ghost block
      // Adding cellSize/2 to snap to the nearest cell when "close enough"
      const gridX = Math.round(relativeX / cellSize);
      const gridY = Math.round(relativeY / cellSize);

      // Attempt Place
      placed = placeBlock(dragState.block, gridX, gridY);
    }

    setDragState({
      isDragging: false,
      block: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      touchOffset: { x: 0, y: 0 },
      originTrayIndex: -1
    });
  }, [dragState, cellSize, placeBlock]);

  // Global listeners for drag
  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      // Prevent scrolling while dragging on touch devices
      window.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    } else {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState.isDragging, handlePointerMove, handlePointerUp]);

  // --- Ghost Calc ---
  let ghostPos = null;
  if (dragState.isDragging && dragState.block && boardRef.current) {
    const boardRect = boardRef.current.getBoundingClientRect();
    const ghostX = dragState.currentPosition.x - dragState.touchOffset.x;
    const ghostY = dragState.currentPosition.y - dragState.touchOffset.y;
    const relativeX = ghostX - boardRect.left;
    const relativeY = ghostY - boardRect.top;
    const gx = Math.round(relativeX / cellSize);
    const gy = Math.round(relativeY / cellSize);

    if (canPlaceBlock(grid, dragState.block.shape, gx, gy)) {
      ghostPos = { x: gx, y: gy };
    }
  }

  // --- Handlers ---
  const handleStartGame = (mode: 'CLASSIC' | 'OFFLINE') => {
    setGameMode(mode);
    setScreen('GAME');
    if (isGameOver) resetGame();
  };

  const handleHome = () => {
    setScreen('MENU');
    resetGame();
  };

  const handleDailyClaim = () => {
    claimDailyReward();
    setShowDailyReward(false);
  };
  
  const handleChallengeStart = (stake: number, isRoom?: boolean, roomCode?: string) => {
    const success = startChallenge(stake, isRoom, roomCode);
    if (success) {
      setScreen('GAME');
      setConfirmSurrender(false); // Reset surrender state
    }
    return success;
  };

  const handleSurrenderClick = () => {
    if (!confirmSurrender) {
      setConfirmSurrender(true);
      // Auto-reset confirmation after 3 seconds if not clicked
      setTimeout(() => setConfirmSurrender(false), 3000);
    } else {
      surrenderMatch();
      setConfirmSurrender(false);
    }
  };

  const handleClaimMission = (id: string) => {
    claimMissionReward(id);
  };

  // --- Format Time ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- Render ---

  // Common UI background
  const appStyle = {
    backgroundColor: currentTheme.colors.background.startsWith('#') ? currentTheme.colors.background : undefined,
  };
  const bgClass = currentTheme.colors.background.startsWith('bg-') ? currentTheme.colors.background : '';

  // Check if any missions are claimable to show a dot
  const hasClaimableMissions = user.dailyMissions.some(m => !m.isClaimed && m.progress >= m.target);

  // --- ONBOARDING VIEW ---
  if (!user.hasCompletedOnboarding) {
      return (
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 animate-fade-in">
              <div className="w-full max-w-sm flex flex-col items-center text-center space-y-8">
                  {/* Logo Animation */}
                  <div className="relative mb-4">
                      <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                      <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl rotate-12 flex items-center justify-center shadow-2xl relative z-10">
                          <Trophy size={48} className="text-white drop-shadow-md" />
                      </div>
                  </div>

                  <div>
                      <h1 className="text-4xl font-black mb-2 tracking-tight">Block Blast<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Master</span></h1>
                      <p className="text-slate-400 text-lg">The ultimate puzzle challenge awaits!</p>
                  </div>

                  <div className="w-full space-y-4 pt-4">
                      {/* Google Sign In */}
                      <div className="w-full flex justify-center">
                          <GoogleSignInBtn onClick={handleGoogleSignIn} isLoading={isGoogleSigningIn} />
                      </div>

                      <div className="relative flex items-center justify-center py-2">
                         <div className="h-px bg-white/10 w-full absolute"></div>
                         <span className="relative bg-slate-900 px-2 text-white/30 text-xs font-bold uppercase">Or</span>
                      </div>

                      <button 
                         onClick={playAsGuest}
                         className="w-full py-3 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 font-bold transition-colors"
                      >
                         Play as Guest
                      </button>
                      <p className="text-xs text-slate-500 mt-2">
                          *Guest accounts cannot access Ranked Matches.
                      </p>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className={`min-h-screen w-full flex flex-col relative overflow-hidden transition-colors duration-500 ${bgClass}`} style={appStyle}>
      
      {/* --- Modals --- */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        settings={settings}
        setSettings={setSettings}
        user={user}
        setUser={setUser}
        activeThemeId={activeThemeId}
        setActiveThemeId={setActiveThemeId}
        buyTheme={buyTheme}
        watchAd={watchAd}
        adsWatchedToday={adsWatchedToday}
        claimAchievement={claimAchievement}
        signInWithGoogle={signInWithGoogle}
        signOutGoogle={signOutGoogle}
      />

      {showDailyReward && (
        <DailyRewardModal 
          onClaim={handleDailyClaim} 
          onClose={() => setShowDailyReward(false)}
          streakDay={streakDay}
          isAvailable={isDailyRewardAvailable}
        />
      )}

      <ChallengeSetupModal 
         isOpen={showChallengeSetup}
         onClose={() => setShowChallengeSetup(false)}
         user={user}
         startChallenge={handleChallengeStart}
      />

      <DailyMissionsModal 
         isOpen={showMissions}
         onClose={() => setShowMissions(false)}
         missions={user.dailyMissions}
         onClaim={handleClaimMission}
      />

      <LeaderboardModal 
         isOpen={showLeaderboard}
         onClose={() => setShowLeaderboard(false)}
         user={user}
      />
      
      {/* --- Exit Confirmation Modal --- */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
               <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogOut className="text-red-500" size={32} />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">Exit Match?</h3>
               <p className="text-white/60 mb-6 text-sm">Your progress and profile stats will be saved, but the current game board will be lost.</p>
               <div className="flex gap-3">
                  <button 
                     onClick={() => setShowExitConfirm(false)}
                     className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white transition-colors"
                  >
                     Resume
                  </button>
                  <button 
                     onClick={confirmExitGame}
                     className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white transition-colors"
                  >
                     Exit
                  </button>
               </div>
           </div>
        </div>
      )}

      {/* --- Simulated AdMob Rewarded/Interstitial --- */}
      {(showInterstitial || showRewarded) && (
        <RewardedAd 
           unitId={showRewarded ? ADMOB_IDS.REWARDED : ADMOB_IDS.INTERSTITIAL} 
           onClose={handleAdClose}
           onReward={() => setAdRewardEarned(true)}
        />
      )}

      {/* --- Matchmaking Overlay --- */}
      {screen === 'GAME' && gameMode === 'CHALLENGE' && challenge.status === 'MATCHMAKING' && (
         <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-fade-in">
            <div className="relative w-32 h-32 mb-8">
               <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
               <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
               <div className="absolute inset-4 rounded-full bg-indigo-500/20 animate-pulse"></div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Finding Opponent...</h2>
            <p className="text-white/50 font-mono animate-pulse">Scanning Region...</p>
            <div className="mt-4 px-4 py-2 bg-white/5 rounded-full border border-white/10">
               <span className="text-sm text-yellow-400 font-bold">Stake: {challenge.stake} Coins</span>
            </div>
         </div>
      )}

      {/* --- VS Fight Animation Overlay --- */}
      {screen === 'GAME' && gameMode === 'CHALLENGE' && challenge.status === 'VS_ANIMATION' && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center animate-fade-in overflow-hidden">
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black"></div>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full max-w-4xl relative z-10">
                
                {/* Player 1 (You) */}
                <div className="flex flex-col items-center animate-slide-in-left">
                    <div className="w-32 h-32 rounded-full border-4 border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.5)] bg-slate-800 flex items-center justify-center mb-4 relative overflow-hidden">
                        <User size={64} className="text-white relative z-10" />
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20"></div>
                    </div>
                    <h3 className="text-3xl font-black text-white uppercase tracking-wider drop-shadow-lg">{user.username}</h3>
                    <div className="px-6 py-1 bg-indigo-600 rounded-full text-xs font-bold text-white mt-2 shadow-lg">YOU</div>
                </div>

                {/* VS Badge */}
                <div className="relative animate-bounce-in delay-300">
                    <Swords size={100} className="text-white relative z-10 drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
                </div>

                {/* Opponent */}
                <div className="flex flex-col items-center animate-slide-in-right">
                    <div className={`w-32 h-32 rounded-full border-4 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)] ${challenge.opponent.avatarBg} flex items-center justify-center mb-4 relative overflow-hidden`}>
                         <User size={64} className="text-white relative z-10" />
                    </div>
                    <h3 className="text-3xl font-black text-white uppercase tracking-wider drop-shadow-lg">{challenge.opponent.name}</h3>
                    <div className="px-6 py-1 bg-red-600 rounded-full text-xs font-bold text-white mt-2 shadow-lg">OPPONENT</div>
                </div>

            </div>
            
            <div className="absolute bottom-24 text-white/50 font-mono animate-pulse tracking-widest text-sm">
                PREPARING BATTLEFIELD...
            </div>
        </div>
      )}

      {/* --- MENU SCREEN --- */}
      {screen === 'MENU' && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative pt-16">
          
          {/* Top Banner Ad - Fixed Position */}
          <div className="absolute top-0 left-0 w-full z-0">
             <BannerAd placement="top" />
          </div>

          {/* SINGLE LINE HEADER (Fixed Layout) */}
          <div className="absolute top-14 left-0 w-full px-4 flex items-center justify-between z-10">
              
              {/* Left Group: Profile + Status */}
              <div className="flex items-center gap-2">
                  {/* Profile Pill */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-lg cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setShowSettings(true)}>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center border border-white/20 overflow-hidden">
                        {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <User size={14} className="text-white" />}
                    </div>
                    <span className="font-bold text-sm text-white pr-1 truncate max-w-[80px] sm:max-w-none">{user.username}</span>
                  </div>

                  {/* Online/Offline Badge */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-md shadow-lg transition-all duration-300 ${isOnline ? 'bg-green-950/60 border-green-500/30' : 'bg-slate-800/80 border-slate-600/30'}`}>
                     {isOnline ? <Wifi size={12} className="text-green-400" /> : <WifiOff size={12} className="text-slate-400" />}
                     <span className={`text-xs font-bold ${isOnline ? 'text-green-400' : 'text-slate-400'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                     </span>
                  </div>
              </div>

              {/* Right Side: Coins, Settings */}
              <div className="flex items-center gap-2">
                 
                 {/* Coins Pill */}
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                    <Coins size={14} className="text-yellow-400" />
                    <span className="font-bold text-sm text-yellow-400 min-w-[20px] text-right">{user.coins}</span>
                    <button 
                      onClick={() => watchAd('COINS')}
                      disabled={adsWatchedToday >= 10}
                      className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale"
                      title="Watch Ad for Coins"
                    >
                      <Plus size={12} className="text-white" />
                    </button>
                 </div>

                 {/* Settings Button */}
                 <button 
                   onClick={() => setShowSettings(true)}
                   className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shadow-lg"
                 >
                   <Settings size={20} className="text-white/80" />
                 </button>
              </div>

          </div>

          {/* Daily Missions Button - Floating Right */}
          <button 
            onClick={() => setShowMissions(true)}
            className="absolute top-28 right-4 w-12 h-12 rounded-full bg-indigo-600 border border-white/20 flex items-center justify-center hover:bg-indigo-500 transition-all shadow-xl z-20 hover:scale-110 active:scale-95 group"
          >
             <div className="relative">
                <Target size={24} className="text-white group-hover:rotate-12 transition-transform" />
                {hasClaimableMissions && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-indigo-600 animate-pulse" />}
             </div>
          </button>
          
          {/* Leaderboard Button - Floating Left (Below Profile) */}
          <button 
            onClick={() => setShowLeaderboard(true)}
            className="absolute top-28 left-4 w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 border border-white/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl z-20 group"
          >
             <Crown size={24} className="text-white drop-shadow-md" fill="currentColor" />
          </button>


          <div className="mb-8 text-center mt-8">
            <h1 className="text-5xl font-black text-white mb-2 tracking-tighter drop-shadow-lg">
              BLOCK<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500">BLAST</span><br/>MASTER
            </h1>
          </div>

          <div className="w-full max-w-xs space-y-3">
            <button 
              onClick={() => handleStartGame('CLASSIC')}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Wifi size={16} className="text-white" />
              </div>
              <span className="text-lg font-bold text-white">Classic Mode</span>
            </button>
            
            <button 
              onClick={() => setShowChallengeSetup(true)}
              className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden"
            >
               {/* Shine effect */}
               <div className="absolute top-0 -left-[100%] w-[100%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_3s_infinite]" />
               <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Swords size={16} className="text-white" />
              </div>
              <span className="text-lg font-bold text-white">Challenge Mode</span>
            </button>

            <button 
              onClick={() => handleStartGame('OFFLINE')}
              className="w-full py-4 bg-slate-700 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:bg-slate-600 active:scale-[0.98] transition-all"
            >
               <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <WifiOff size={16} className="text-white/70" />
              </div>
              <span className="text-lg font-bold text-white/80">Offline Mode</span>
            </button>
            
            <div className="grid grid-cols-2 gap-3 mt-2">
                {/* Daily Reward Button */}
                <button 
                    onClick={() => setShowDailyReward(true)}
                    className={`relative py-3 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all ${isDailyRewardAvailable ? 'bg-gradient-to-br from-pink-500 to-rose-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer' : 'bg-slate-800 cursor-pointer hover:bg-slate-700'}`}
                >
                    {isDailyRewardAvailable && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />}
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-1">
                        <Gift size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-white">Daily Gift</span>
                    <span className="text-[10px] text-white/70">{isDailyRewardAvailable ? 'Claim Now' : `Day ${streakDay}/7`}</span>
                </button>

                {/* Watch Ad Button */}
                <button 
                    onClick={() => watchAd('COINS')}
                    disabled={adsWatchedToday >= 10}
                    className="py-3 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex flex-col items-center justify-center shadow-lg disabled:opacity-50 disabled:grayscale hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-1">
                        <Video size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-white">Free Coins</span>
                    <span className="text-[10px] text-white/70">{adsWatchedToday}/10 Left</span>
                </button>
            </div>
            
          </div>

           {/* Bottom Banner Ad - Flex Item */}
           <div className="absolute bottom-0 w-full z-0">
             <BannerAd placement="bottom" />
          </div>
        </div>
      )}

      {/* --- GAME SCREEN --- */}
      {screen === 'GAME' && (
        <div className="flex-1 flex flex-col items-center relative min-h-0">
          
           {/* Top Banner Ad - Flex Item */}
           <div className="w-full flex-shrink-0 z-10">
              <BannerAd placement="top" />
           </div>

          {/* Header */}
          {gameMode !== 'CHALLENGE' ? (
             <div className="w-full max-w-md px-4 py-4 flex items-center justify-between">
                <div className="flex gap-4">
                   {/* Back Navigation Button */}
                   <button 
                     onClick={handleBackNavigation}
                     className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-colors mr-2"
                   >
                      <ArrowLeft size={20} className="text-white" />
                   </button>

                   <div className="glass-panel px-4 py-2 rounded-xl flex flex-col items-center min-w-[80px]">
                      <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Score</span>
                      <span className="text-2xl font-black text-white leading-none">{score}</span>
                   </div>
                   <div className="glass-panel px-4 py-2 rounded-xl flex flex-col items-center min-w-[80px]">
                      <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">High</span>
                      <span className="text-xl font-bold text-yellow-400 leading-none">{user.highScore}</span>
                   </div>
                   <div className="glass-panel px-3 py-2 rounded-xl flex flex-col items-center min-w-[60px] bg-indigo-500/20 border-indigo-500/30">
                      <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider flex items-center gap-1"><BarChart2 size={10} /> LVL</span>
                      <span className="text-xl font-black text-white leading-none">{currentLevel}</span>
                   </div>
                </div>
                <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-colors">
                   <Settings size={20} className="text-white/80" />
                </button>
             </div>
          ) : (
             <div className="w-full max-w-md px-4 py-2 flex flex-col gap-2">
                {/* Challenge Header */}
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="bg-black/40 px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
                         {/* BLINKING GREEN LIGHT */}
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-blink shadow-[0_0_10px_#22c55e]"></div>
                         <span className="text-xs font-bold text-white">LIVE MATCH</span>
                      </div>
                   </div>
                   
                   {/* Surrender Button */}
                   <button 
                      onClick={handleSurrenderClick}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all duration-200 group border
                        ${confirmSurrender 
                           ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300 hover:bg-yellow-500/30' 
                           : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                        }
                      `}
                   >
                      {confirmSurrender ? <AlertTriangle size={12} /> : <Flag size={12} />}
                      <span className="text-[10px] font-bold uppercase">
                        {confirmSurrender ? 'Confirm?' : 'Surrender'}
                      </span>
                   </button>
                   
                   <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-white/10">
                      <Clock size={14} className={challenge.timeLeft < 30 ? "text-red-500 animate-pulse" : "text-white/50"} />
                      <span className={`font-mono font-bold ${challenge.timeLeft < 30 ? "text-red-400" : "text-white"}`}>
                         {formatTime(challenge.timeLeft)}
                      </span>
                   </div>
                </div>

                {/* Score VS Bar */}
                <div className="flex items-center justify-between text-xs font-bold text-white/70 mb-1">
                   <span>YOU: {score}</span>
                   <span>OPP: {challenge.opponent.score}</span>
                </div>
                <div className="h-4 bg-slate-800 rounded-full overflow-hidden relative border border-white/10">
                   <div className="absolute inset-0 flex">
                      {/* Player Bar */}
                      <div 
                         className="h-full bg-blue-500 transition-all duration-500"
                         style={{ width: `${(score / (score + challenge.opponent.score + 1)) * 100}%` }}
                      />
                      {/* Opponent Bar */}
                      <div 
                         className="h-full bg-red-500 flex-1 transition-all duration-500"
                      />
                   </div>
                   {/* Center Marker */}
                   <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/50 z-10 -translate-x-1/2"></div>
                </div>
                <div className="flex justify-between text-[10px] text-white/30 uppercase tracking-wider">
                   <span>{user.username}</span>
                   <span>{challenge.opponent.name}</span>
                </div>
             </div>
          )}

          {/* Board Area */}
          <div className="flex-1 flex flex-col items-center justify-center w-full relative">
             <div 
               ref={boardRef}
               className="relative shadow-2xl rounded-lg overflow-hidden transition-all duration-300"
               style={{ 
                 width: boardSizePx, 
                 height: boardSizePx,
                 backgroundColor: currentTheme.colors.gridBackground
               }}
             >
                {/* Grid */}
                <div className="absolute inset-0 grid" style={{ 
                  gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                  gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`
                }}>
                  {grid.map((row, y) => row.map((cell, x) => {
                    const isAnimating = animatingCells.includes(`${y},${x}`);
                    const isTarget = targetCells.has(`${y},${x}`);
                    return (
                        <div 
                          key={`${y}-${x}`}
                          className={`border border-white/5 relative flex items-center justify-center ${isAnimating ? 'animate-destroy' : ''}`}
                          style={{ 
                            backgroundColor: cell || 'transparent',
                            boxShadow: cell ? 'inset 0 0 8px rgba(0,0,0,0.2)' : 'none'
                          }}
                        >
                          {/* Inner bevel for filled cells */}
                          {cell && <div className="absolute inset-0 border-t border-l border-white/20 rounded-sm" />}
                          
                          {/* Target Overlay */}
                          {isTarget && !isAnimating && (
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                  <div className="w-full h-full bg-yellow-400/20 animate-pulse rounded-sm absolute" />
                                  <Target size={cellSize * 0.6} className="text-yellow-300 drop-shadow-md animate-bounce" strokeWidth={3} />
                              </div>
                          )}

                          {/* Empty cell indicator */}
                          {!cell && <div className="absolute inset-1 rounded-sm opacity-20" style={{backgroundColor: currentTheme.colors.cellEmpty}} />}
                        </div>
                    );
                  }))}
                </div>

                {/* Floating Score Texts */}
                {floatingTexts.map(ft => (
                    <div 
                        key={ft.id}
                        className={`absolute pointer-events-none font-black text-xl drop-shadow-md whitespace-nowrap z-30 animate-float-up ${ft.color}`}
                        style={{ left: `${ft.x}%`, top: `${ft.y}%` }}
                    >
                        {ft.text}
                    </div>
                ))}

                {/* Ghost */}
                {ghostPos && (
                   <div 
                     className="absolute pointer-events-none transition-all duration-100 z-10"
                     style={{
                       top: ghostPos.y * cellSize,
                       left: ghostPos.x * cellSize,
                       opacity: 0.4
                     }}
                   >
                     <BlockPiece block={{...dragState.block!, color: 'white'}} cellSize={cellSize} isGhost />
                   </div>
                )}
             </div>
          </div>

          {/* Tray Area */}
          <div className="w-full max-w-md h-32 mb-4 flex items-center justify-around px-2">
             {tray.map((block, i) => (
               <div key={i} className={`w-1/3 h-full flex items-center justify-center relative ${isInputLocked ? 'opacity-50 grayscale' : ''}`}>
                 {block && (
                    <div 
                      className={`touch-none ${isInputLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
                      onPointerDown={(e) => handlePointerDown(e, block, i)}
                      style={{ opacity: dragState.block?.instanceId === block.instanceId ? 0 : 1 }}
                    >
                      <BlockPiece block={block} cellSize={cellSize * 0.55} />
                    </div>
                 )}
               </div>
             ))}
          </div>
          
          {/* --- DRAG LAYER --- */}
          {dragState.isDragging && dragState.block && (
            <div 
              className="fixed pointer-events-none z-[100]"
              style={{
                left: dragState.currentPosition.x,
                top: dragState.currentPosition.y,
                transform: `translate(-${dragState.touchOffset.x}px, -${dragState.touchOffset.y}px)`,
              }}
            >
               {/* Drop Shadow / Scale Effect for lifting */}
               <div className="scale-110 drop-shadow-2xl opacity-90">
                 <BlockPiece block={dragState.block} cellSize={cellSize} />
               </div>
            </div>
          )}

          {/* Bottom Banner Ad - Flex Item */}
          <div className="w-full flex-shrink-0 z-10">
              <BannerAd placement="bottom" />
          </div>

          {/* Game Over Overlay */}
          {isGameOver && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in">
              
              {/* Challenge Result Logic vs Standard Game Over */}
              {gameMode === 'CHALLENGE' ? (
                 <>
                   {challenge.result === 'WIN' ? (
                      <div className="text-center animate-bounce-in">
                         <Trophy className="text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" size={80} />
                         <h2 className="text-5xl font-black text-white mb-2 tracking-tighter">VICTORY!</h2>
                         <p className="text-white/70 text-lg mb-6">You outscored {challenge.opponent.name}</p>
                         <div className="bg-white/10 p-4 rounded-xl border border-white/10 mb-8">
                            <span className="text-xs text-white/50 uppercase font-bold">Prize</span>
                            <div className="flex items-center justify-center gap-2 mt-1">
                               <Coins size={24} className="text-yellow-400" />
                               <span className="text-3xl font-black text-white">+{challenge.stake * 2}</span>
                            </div>
                         </div>
                      </div>
                   ) : (
                      <div className="text-center">
                         <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <WifiOff className="text-red-500" size={40} />
                         </div>
                         <h2 className="text-4xl font-black text-white mb-2">DEFEAT</h2>
                         <p className="text-white/60 mb-6">
                           {challenge.status === 'FINISHED' && score < challenge.opponent.score 
                             ? "Better luck next time!" 
                             : "You surrendered the match."}
                         </p>
                         <div className="text-sm text-white/40 mb-8">
                            Final Score: {score} vs {challenge.opponent.score}
                         </div>
                      </div>
                   )}
                   
                   {/* Handle Room Flow vs Ranked Flow */}
                   {challenge.roomCode ? (
                       <button 
                         onClick={() => {
                             handleHome();
                             setShowChallengeSetup(true);
                         }}
                         className="w-full max-w-xs py-4 bg-indigo-600 rounded-xl font-bold text-white border border-indigo-400 hover:bg-indigo-500 transition-colors shadow-lg animate-pulse"
                       >
                          Create New Room
                       </button>
                   ) : (
                       <button 
                          onClick={handleHome}
                          className="w-full max-w-xs py-4 bg-white/10 rounded-xl font-bold text-white border border-white/20 hover:bg-white/20 transition-colors"
                       >
                          Return to Menu
                       </button>
                   )}
                 </>
              ) : (
                 // Classic / Offline Game Over
                 <>
                  <div className="text-center mb-8 animate-bounce-in">
                    <h2 className="text-5xl font-black text-white mb-2 tracking-tighter drop-shadow-lg">GAME OVER</h2>
                    <p className="text-white/60 text-lg">No more moves!</p>
                  </div>
                  
                  <div className="bg-white/10 p-6 rounded-2xl border border-white/10 backdrop-blur-md mb-8 w-full max-w-xs">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-white/50 text-sm font-bold uppercase tracking-wider">Score</span>
                      <span className="text-4xl font-black text-white">{score}</span>
                    </div>
                    {score >= user.highScore && score > 0 && (
                      <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold bg-yellow-400/10 px-3 py-1 rounded-full w-fit">
                        <Trophy size={12} /> NEW HIGH SCORE!
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 w-full max-w-xs">
                    <button 
                      onClick={() => handleStartGame(gameMode === 'OFFLINE' ? 'OFFLINE' : 'CLASSIC')}
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl font-bold text-white shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={20} /> Play Again
                    </button>
                    
                    {/* Revive Button (Only if count < 1) */}
                    {reviveCount < 1 && (
                      <button 
                        onClick={() => watchAd('REVIVE')}
                        className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl font-bold text-white shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Video size={20} /> Revive (Watch Ad)
                      </button>
                    )}

                    <button 
                      onClick={handleHome}
                      className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-white/60 transition-colors"
                    >
                      Main Menu
                    </button>
                  </div>
                 </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
