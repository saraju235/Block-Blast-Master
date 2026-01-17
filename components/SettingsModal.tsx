
import React, { useState } from 'react';
import { X, Volume2, VolumeX, Smartphone, Monitor, User, Info, Palette, Lock, CheckCircle, Video, Coins, Star, Trophy, Medal } from 'lucide-react';
import { GameSettings, UserProfile, ThemeId, Theme } from '../types';
import { THEMES, ACHIEVEMENTS_DATA } from '../constants';
import confetti from 'canvas-confetti';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  setSettings: (s: GameSettings) => void;
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  activeThemeId: ThemeId;
  setActiveThemeId: (id: ThemeId) => void;
  buyTheme: (id: ThemeId) => boolean;
  watchAd: (type: 'COINS') => void;
  adsWatchedToday: number;
  claimAchievement: (id: string, tier: 0 | 1 | 2) => boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, settings, setSettings, user, setUser, activeThemeId, setActiveThemeId, buyTheme, watchAd, adsWatchedToday, claimAchievement
}) => {
  const [tab, setTab] = useState<'GENERAL' | 'THEMES' | 'ACHIEVEMENTS' | 'DEV'>('GENERAL');
  
  // Modal Overlay States
  const [overlayState, setOverlayState] = useState<'NONE' | 'SUCCESS' | 'NO_FUNDS'>('NONE');
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);

  if (!isOpen) return null;

  const toggleSetting = (key: keyof GameSettings) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUser({ ...user, username: e.target.value });
  };

  const attemptUnlock = (theme: Theme) => {
    setSelectedTheme(theme);
    const success = buyTheme(theme.id);
    if (success) {
      setOverlayState('SUCCESS');
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 },
        zIndex: 1000
      });
    } else {
      setOverlayState('NO_FUNDS');
    }
  };
  
  const handleClaimAchievement = (achId: string, tierIdx: 0 | 1 | 2) => {
      const success = claimAchievement(achId, tierIdx);
      if (success) {
          confetti({
             particleCount: 100,
             spread: 60,
             origin: { y: 0.6 },
             zIndex: 2000 // Higher than modal
          });
      }
  };

  const closeOverlay = () => {
    setOverlayState('NONE');
    setSelectedTheme(null);
  };

  const handleWatchAd = () => {
     watchAd('COINS');
     closeOverlay(); 
  };

  const formatValue = (val: number, id: string) => {
    if (id === 'play_time') {
      return `${Math.floor(val / 60)}m`;
    }
    return val.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/10 bg-slate-900 z-10">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Tabs - Fixed */}
        <div className="flex-shrink-0 flex p-2 gap-2 bg-black/20 overflow-x-auto no-scrollbar border-b border-white/5">
          <button onClick={() => setTab('GENERAL')} className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${tab === 'GENERAL' ? 'bg-indigo-600 text-white' : 'text-white/50 hover:bg-white/5'}`}>General</button>
          <button onClick={() => setTab('THEMES')} className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${tab === 'THEMES' ? 'bg-pink-600 text-white' : 'text-white/50 hover:bg-white/5'}`}>Themes</button>
          <button onClick={() => setTab('ACHIEVEMENTS')} className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${tab === 'ACHIEVEMENTS' ? 'bg-yellow-600 text-white' : 'text-white/50 hover:bg-white/5'}`}>Achievements</button>
          <button onClick={() => setTab('DEV')} className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${tab === 'DEV' ? 'bg-sky-600 text-white' : 'text-white/50 hover:bg-white/5'}`}>Info</button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 relative custom-scrollbar touch-pan-y">
          
          {tab === 'GENERAL' && (
            <div className="space-y-6">
              {/* Profile */}
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider font-bold mb-2 block">Player Profile</label>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <User size={24} />
                  </div>
                  <input 
                    type="text" 
                    value={user.username} 
                    onChange={handleNameChange}
                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Stats Display */}
                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-white/50 font-bold uppercase mb-1">Classic Best</span>
                      <span className="text-xl font-black text-yellow-400">{user.stats.classicHighScore.toLocaleString()}</span>
                   </div>
                   <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-white/50 font-bold uppercase mb-1">Offline Best</span>
                      <span className="text-xl font-black text-white">{user.stats.offlineHighScore?.toLocaleString() || '0'}</span>
                   </div>
                </div>
              </div>

              {/* Toggles */}
              <div>
                 <label className="text-xs text-white/50 uppercase tracking-wider font-bold mb-2 block">Audio & Haptics</label>
                 <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <span className="flex items-center gap-2"><Volume2 size={18}/> Sound Effects</span>
                     <button onClick={() => toggleSetting('soundEnabled')} className={`w-12 h-6 rounded-full relative transition-colors ${settings.soundEnabled ? 'bg-green-500' : 'bg-gray-600'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.soundEnabled ? 'left-7' : 'left-1'}`} />
                     </button>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="flex items-center gap-2"><Monitor size={18}/> Background Music</span>
                     <button onClick={() => toggleSetting('musicEnabled')} className={`w-12 h-6 rounded-full relative transition-colors ${settings.musicEnabled ? 'bg-green-500' : 'bg-gray-600'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.musicEnabled ? 'left-7' : 'left-1'}`} />
                     </button>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="flex items-center gap-2"><Smartphone size={18}/> Vibration</span>
                     <button onClick={() => toggleSetting('vibrationEnabled')} className={`w-12 h-6 rounded-full relative transition-colors ${settings.vibrationEnabled ? 'bg-green-500' : 'bg-gray-600'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.vibrationEnabled ? 'left-7' : 'left-1'}`} />
                     </button>
                   </div>
                 </div>
              </div>
            </div>
          )}

          {tab === 'THEMES' && (
            <div className="grid grid-cols-2 gap-3 pb-20">
               {Object.values(THEMES).map((theme) => {
                 const isOwned = user.inventory.themes.includes(theme.id);
                 const isActive = activeThemeId === theme.id;
                 return (
                   <div 
                    key={theme.id} 
                    className={`p-3 rounded-xl border relative overflow-hidden transition-all ${isActive ? 'border-pink-500 ring-2 ring-pink-500/20 shadow-lg scale-[1.02]' : 'border-white/10 hover:border-white/30'}`}
                    style={{ background: theme.colors.gridBackground }}
                   >
                     <div className="flex gap-1 mb-2">
                       {theme.blockPalette.slice(0,3).map(c => <div key={c} className="w-3 h-3 rounded-full shadow-sm" style={{background:c}}/>)}
                     </div>
                     <h3 className="font-bold text-sm mb-1">{theme.name}</h3>
                     
                     {isActive ? (
                       <span className="text-xs text-green-400 font-bold flex items-center gap-1 mt-2">
                         <CheckCircle size={12} /> Active
                       </span>
                     ) : isOwned ? (
                       <button onClick={() => setActiveThemeId(theme.id)} className="w-full py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-bold mt-2">
                         Select
                       </button>
                     ) : (
                       <button 
                         onClick={() => attemptUnlock(theme)} 
                         className="w-full py-1 bg-yellow-500 hover:bg-yellow-600 text-black rounded text-xs font-bold mt-2 flex items-center justify-center gap-1 shadow-md hover:scale-105 transition-transform"
                       >
                         <Lock size={10} /> Unlock {theme.price}
                       </button>
                     )}
                   </div>
                 );
               })}
            </div>
          )}

          {tab === 'ACHIEVEMENTS' && (
             <div className="space-y-4 pb-12">
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-center gap-3">
                   <Trophy className="text-yellow-400" size={24} />
                   <div>
                      <h3 className="text-sm font-bold text-white">Earn Coins!</h3>
                      <p className="text-xs text-white/60">Complete tasks to claim rewards.</p>
                   </div>
                </div>

                {ACHIEVEMENTS_DATA.map((ach) => {
                   const currentValue = Math.floor(user.stats[ach.statKey]);
                   const maxTarget = ach.tiers[2].target;
                   
                   // Determine next target for display
                   const nextTier = ach.tiers.find(t => currentValue < t.target) || ach.tiers[2];
                   const remaining = Math.max(0, nextTier.target - currentValue);
                   const isCompletedAll = currentValue >= ach.tiers[2].target;

                   // Calculate simplified progress for bar (0-100% of max tier)
                   const progressPercent = Math.min((currentValue / maxTarget) * 100, 100);
                   
                   return (
                      <div key={ach.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                         <div className="flex items-center justify-between mb-2">
                            <div>
                               <h4 className="font-bold text-white text-sm">{ach.title}</h4>
                               <p className="text-[10px] text-white/50">{ach.description}</p>
                            </div>
                         </div>
                         
                         {/* Detailed Status Text */}
                         <div className="flex justify-between items-end mb-2">
                             <div className="text-xs text-yellow-400 font-bold">
                                {isCompletedAll 
                                   ? "ALL TIERS COMPLETED!" 
                                   : `Next: ${formatValue(remaining, ach.id)} more to reach ${nextTier.stars}★`
                                }
                             </div>
                             <div className="text-xs font-mono font-bold text-white/60">
                               {formatValue(currentValue, ach.id)} <span className="text-white/30">/ {formatValue(maxTarget, ach.id)}</span>
                            </div>
                         </div>

                         {/* Progress Bar */}
                         <div className="h-2 bg-black/40 rounded-full overflow-hidden mb-3">
                            <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500" style={{width: `${progressPercent}%`}} />
                         </div>

                         {/* Tiers */}
                         <div className="grid grid-cols-3 gap-2">
                            {ach.tiers.map((tier, index) => {
                               const claimId = `${ach.id}_${index + 1}`;
                               const isClaimed = user.claimedAchievements.includes(claimId);
                               const isUnlocked = currentValue >= tier.target;
                               const isNext = isUnlocked && !isClaimed;
                               
                               return (
                                  <button
                                     key={index}
                                     disabled={!isNext && !isClaimed} // Disable if locked or already claimed
                                     onClick={() => handleClaimAchievement(ach.id, index as 0|1|2)}
                                     className={`
                                        flex flex-col items-center justify-center p-2 rounded-lg border relative transition-all min-h-[70px]
                                        ${isClaimed ? 'bg-green-500/10 border-green-500/30' : ''}
                                        ${isNext ? 'bg-yellow-500 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)] animate-pulse' : ''}
                                        ${!isClaimed && !isNext ? 'bg-white/5 border-white/5 opacity-60' : ''}
                                     `}
                                  >
                                     <div className="flex items-center gap-1 mb-1">
                                        {[...Array(tier.stars)].map((_, i) => (
                                           <Star key={i} size={8} className={`${isClaimed || isNext ? 'text-white fill-current' : 'text-white/30'}`} />
                                        ))}
                                     </div>
                                     
                                     {/* Target Info */}
                                     <div className={`text-[10px] font-bold mb-1 ${isNext ? 'text-black' : 'text-white/50'}`}>
                                        Goal: {formatValue(tier.target, ach.id)}
                                     </div>

                                     <div className="flex items-center gap-1">
                                         <Coins size={10} className={`${isNext ? 'text-black' : 'text-yellow-400'}`} />
                                         <span className={`text-xs font-black ${isNext ? 'text-black' : 'text-white'}`}>{tier.reward}</span>
                                     </div>
                                     
                                     {isClaimed && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg backdrop-blur-[1px] z-10">
                                            <CheckCircle size={20} className="text-green-500" />
                                        </div>
                                     )}
                                  </button>
                               );
                            })}
                         </div>
                      </div>
                   );
                })}
             </div>
          )}

          {tab === 'DEV' && (
            <div className="flex flex-col items-center justify-center text-center py-8">
               <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-1 shadow-xl mb-4">
                 <img 
                   src="https://api.dicebear.com/7.x/avataaars/svg?seed=Taiyeba&gender=female" 
                   alt="Developer" 
                   className="w-full h-full rounded-full bg-white"
                 />
               </div>
               <h3 className="text-2xl font-bold text-white mb-1">Taiyeba Afrin</h3>
               <p className="text-white/50 text-sm">Lead Developer</p>
               <div className="mt-6 p-4 bg-white/5 rounded-xl text-xs text-white/40 max-w-xs">
                 Block Blast Master v1.0.0
                 <br/>Built with React & Tailwind
               </div>
            </div>
          )}

        </div>

        {/* --- OVERLAYS --- */}
        
        {/* Success Overlay */}
        {overlayState === 'SUCCESS' && selectedTheme && (
           <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-bounce">
                 <CheckCircle size={40} className="text-white" />
              </div>
              <h3 className="text-3xl font-black text-white mb-2 leading-none">CONGRATULATIONS!</h3>
              <p className="text-white/70 mb-6">Theme Unlocked</p>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-8 w-full max-w-[200px]">
                 <span className="text-lg font-bold text-pink-400">{selectedTheme.name}</span>
              </div>

              <div className="w-full space-y-3">
                <button 
                  onClick={() => { setActiveThemeId(selectedTheme.id); closeOverlay(); }}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl font-bold text-white shadow-lg hover:scale-105 transition-transform"
                >
                  Equip Now
                </button>
                <button 
                  onClick={closeOverlay}
                  className="w-full py-3 bg-white/10 rounded-xl font-bold text-white/60 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
           </div>
        )}

        {/* Insufficient Funds Overlay */}
        {overlayState === 'NO_FUNDS' && selectedTheme && (
           <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
               <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                 <Coins size={40} className="text-white" />
               </div>
               
               <h3 className="text-2xl font-black text-white mb-2">NOT ENOUGH COINS!</h3>
               <p className="text-white/60 text-sm mb-6 max-w-[260px] mx-auto">
                 You need <span className="text-yellow-400 font-bold">{selectedTheme.price - user.coins}</span> more coins to unlock {selectedTheme.name}.
               </p>

               <div className="w-full space-y-3">
                 <button 
                   onClick={handleWatchAd}
                   disabled={adsWatchedToday >= 10}
                   className="w-full py-4 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:grayscale"
                 >
                   <Video size={20} /> Watch Video (+20 Coins)
                 </button>
                 
                 <button 
                   onClick={closeOverlay}
                   className="w-full py-3 text-white/40 hover:text-white transition-colors text-sm font-medium"
                 >
                   Maybe Later
                 </button>
               </div>
           </div>
        )}

      </div>
    </div>
  );
};
