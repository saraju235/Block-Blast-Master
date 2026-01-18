
import React, { useState, useRef } from 'react';
import { X, Volume2, VolumeX, Smartphone, Monitor, User, Info, Palette, Lock, CheckCircle, Video, Coins, Star, Trophy, Medal, LogOut, Edit2, Camera, Upload, Mail } from 'lucide-react';
import { GameSettings, UserProfile, ThemeId, Theme } from '../types';
import { THEMES, ACHIEVEMENTS_DATA } from '../constants';
import { GoogleSignInBtn } from './GoogleSignInBtn';
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
  signInWithGoogle?: () => Promise<void>;
  signOutGoogle?: () => void;
  // New Handlers
  updateUsername?: (name: string) => void;
  updateAvatar?: (url: string) => void;
  purchaseCustomAvatar?: (data: string) => boolean;
}

const FREE_AVATARS = [
   "Felix", "Aneka", "Jack", "Milo", "Sora", "Luna", "Oliver", "Leo"
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, settings, setSettings, user, setUser, activeThemeId, setActiveThemeId, buyTheme, watchAd, adsWatchedToday, claimAchievement, signInWithGoogle, signOutGoogle, updateUsername, updateAvatar, purchaseCustomAvatar
}) => {
  const [tab, setTab] = useState<'GENERAL' | 'THEMES' | 'ACHIEVEMENTS' | 'DEV'>('GENERAL');
  
  // Modal Overlay States
  const [overlayState, setOverlayState] = useState<'NONE' | 'SUCCESS' | 'NO_FUNDS'>('NONE');
  // Replaced simple selectedTheme with a generic purchase item state
  const [purchaseItem, setPurchaseItem] = useState<{ id: string, name: string, price: number, type: 'THEME' | 'AVATAR' } | null>(null);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const toggleSetting = (key: keyof GameSettings) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (updateUsername) updateUsername(e.target.value);
  };

  const attemptUnlockTheme = (theme: Theme) => {
    const success = buyTheme(theme.id);
    if (success) {
      setPurchaseItem({ id: theme.id, name: theme.name, price: theme.price, type: 'THEME' });
      setOverlayState('SUCCESS');
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 },
        zIndex: 1000
      });
    } else {
      setPurchaseItem({ id: theme.id, name: theme.name, price: theme.price, type: 'THEME' });
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
    setPurchaseItem(null);
  };

  const handleWatchAd = () => {
     watchAd('COINS');
     closeOverlay(); 
  };

  const handleGoogleSignIn = async () => {
      if (signInWithGoogle) {
          setIsSigningIn(true);
          await signInWithGoogle();
          setIsSigningIn(false);
      }
  };

  const formatValue = (val: number, id: string) => {
    if (id === 'play_time') {
      return `${Math.floor(val / 60)}m`;
    }
    return val.toLocaleString();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          const base64String = reader.result as string;
          if (purchaseCustomAvatar) {
              const success = purchaseCustomAvatar(base64String);
              if (success) {
                  setIsEditingAvatar(false);
                  confetti({
                     particleCount: 50,
                     spread: 50,
                     origin: { y: 0.5 }
                  });
              } else {
                  // Show the No Funds Overlay
                  setPurchaseItem({ id: 'custom_avatar', name: 'Custom Photo', price: 1000, type: 'AVATAR' });
                  setOverlayState('NO_FUNDS');
              }
          }
      };
      reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
      fileInputRef.current?.click();
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
                
                {user.isGoogleLinked ? (
                    <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img src={user.avatarUrl} className="w-8 h-8 rounded-full" alt="Profile" />
                            <div className="flex flex-col">
                                {user.email ? (
                                    <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                                        <Mail size={10} /> {user.email}
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-green-400">Connected with Google</span>
                                )}
                                <span className="text-[10px] text-white/50">{user.username}</span>
                            </div>
                        </div>
                        {signOutGoogle && (
                            <button onClick={signOutGoogle} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white" title="Disconnect">
                                <LogOut size={16} />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="mb-4 text-center">
                        <p className="text-xs text-white/50 mb-2">Sign in to save progress and access leaderboards.</p>
                        <GoogleSignInBtn onClick={handleGoogleSignIn} isLoading={isSigningIn} />
                    </div>
                )}

                {/* Avatar & Username Edit Section */}
                <div className="flex flex-col gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                            className="relative group w-16 h-16 rounded-full flex-shrink-0"
                        >
                            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/20">
                                {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <User size={32} className="text-white m-auto mt-4" />}
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit2 size={16} className="text-white" />
                            </div>
                             <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                                <Edit2 size={10} className="text-white" />
                             </div>
                        </button>
                        
                        <div className="flex-1">
                            <label className="text-[10px] text-white/40 uppercase font-bold mb-1 block">Username</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={user.username} 
                                    onChange={handleNameChange}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="Enter Username"
                                />
                                <Edit2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Avatar Selection Area */}
                    {isEditingAvatar && (
                        <div className="bg-black/30 rounded-xl p-3 border border-white/5 animate-fade-in mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-white/60">Choose Avatar (Free)</span>
                                <button onClick={() => setIsEditingAvatar(false)}><X size={14} className="text-white/40" /></button>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                {FREE_AVATARS.map((seed) => {
                                    const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                                    const isSelected = user.avatarUrl === url;
                                    return (
                                        <button 
                                            key={seed}
                                            onClick={() => updateAvatar && updateAvatar(url)}
                                            className={`aspect-square rounded-full border-2 overflow-hidden bg-slate-700 transition-all ${isSelected ? 'border-green-500 scale-105 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'border-transparent hover:border-white/30'}`}
                                        >
                                            <img src={url} alt={seed} className="w-full h-full object-cover" />
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="h-px bg-white/10 w-full mb-3"></div>
                            
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-bold text-white/60">Custom Photo</span>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={handleFileUpload}
                                />
                                <button 
                                    onClick={triggerFileUpload}
                                    className="w-full py-2 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                                >
                                    <Camera size={16} className="text-white" />
                                    <span className="text-xs font-bold text-white">Upload / Camera</span>
                                    <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded text-[10px] text-yellow-300">
                                        <Coins size={10} /> 1000
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
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
                         onClick={() => attemptUnlockTheme(theme)} 
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
               <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-1.5 shadow-[0_0_30px_rgba(168,85,247,0.4)] mb-6 hover:scale-105 transition-transform duration-300">
                 <img 
                   src="https://img.wapka.org/00gsw3.jpeg" 
                   alt="Taiyeba Afrin" 
                   className="w-full h-full rounded-full bg-slate-800 object-cover border-4 border-white/10"
                 />
               </div>
               
               <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Taiyeba Afrin</h3>
               
               <div className="flex items-center gap-2 mb-1">
                   <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                       Lead Developer
                   </span>
               </div>
               
               <p className="text-white/60 font-medium mb-6">Age: 11 Years</p>
               
               <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                   <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-bold text-white/40 uppercase">Version</span>
                       <span className="text-xs font-mono font-bold text-white">v1.0.0</span>
                   </div>
                   <div className="h-px bg-white/10 w-full mb-2"></div>
               </div>
            </div>
          )}

        </div>

        {/* --- OVERLAYS --- */}
        
        {/* Success Overlay */}
        {overlayState === 'SUCCESS' && purchaseItem && (
           <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-bounce">
                 <CheckCircle size={40} className="text-white" />
              </div>
              <h3 className="text-3xl font-black text-white mb-2 leading-none">CONGRATULATIONS!</h3>
              <p className="text-white/70 mb-6">{purchaseItem.type === 'THEME' ? 'Theme Unlocked' : 'Purchase Successful'}</p>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-8 w-full max-w-[200px]">
                 <span className="text-lg font-bold text-pink-400">{purchaseItem.name}</span>
              </div>

              <div className="w-full space-y-3">
                {purchaseItem.type === 'THEME' && (
                    <button 
                      onClick={() => { setActiveThemeId(purchaseItem.id as ThemeId); closeOverlay(); }}
                      className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl font-bold text-white shadow-lg hover:scale-105 transition-transform"
                    >
                      Equip Now
                    </button>
                )}
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
        {overlayState === 'NO_FUNDS' && purchaseItem && (
           <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
               <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                 <Coins size={40} className="text-white" />
               </div>
               
               <h3 className="text-2xl font-black text-white mb-2">NOT ENOUGH COINS!</h3>
               <p className="text-white/60 text-sm mb-6 max-w-[260px] mx-auto">
                 You need <span className="text-yellow-400 font-bold">{Math.max(0, purchaseItem.price - user.coins)}</span> more coins to unlock {purchaseItem.name}.
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
