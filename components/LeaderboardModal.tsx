
import React, { useState, useEffect } from 'react';
import { X, Trophy, Coins, Globe, Calendar, Crown, Medal, Info, Lock, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../services/supabase';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

type LeaderboardTab = 'MONTHLY' | 'GLOBAL' | 'COINS';

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  avatarUrl?: string; 
  isUser: boolean;
  rank: number;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, user }) => {
  const [tab, setTab] = useState<LeaderboardTab>('GLOBAL');
  const [showRules, setShowRules] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  const isGuest = !user.isGoogleLinked && !user.email;

  // Fetch real data when open/tab changes
  useEffect(() => {
      if (isOpen && !isGuest) {
          fetchLeaderboard();
      }
  }, [isOpen, tab]);

  const fetchLeaderboard = async () => {
      setLoading(true);
      try {
          let query = supabase.from('profiles').select('username, avatar_url, high_score, coins, stats, id');

          if (tab === 'GLOBAL' || tab === 'MONTHLY') {
              query = query.order('high_score', { ascending: false });
          } else {
              query = query.limit(100); 
          }

          const { data, error } = await query.limit(50);
          
          if (error) throw error;
          
          if (data) {
              let processed = data.map(p => {
                  let score = 0;
                  if (tab === 'COINS') {
                      score = p.stats?.classicCoinsEarned || 0;
                  } else {
                      score = p.high_score;
                  }
                  
                  return {
                      id: p.id,
                      name: p.username || 'Unknown',
                      score: score,
                      avatarUrl: p.avatar_url,
                      isUser: false 
                  };
              });

              if (tab === 'COINS') {
                  processed.sort((a, b) => b.score - a.score);
              }
              
              processed = processed.map((p, i) => ({ ...p, rank: i + 1 }));
              
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                  processed = processed.map(p => ({
                      ...p,
                      isUser: p.id === session.user.id
                  }));
              }
              
              setEntries(processed);
          }
      } catch (err) {
          console.error("Leaderboard fetch error:", err);
      } finally {
          setLoading(false);
      }
  };

  const top3 = entries.slice(0, 3);
  const restList = entries.slice(3);
  const userRankEntry = entries.find(e => e.isUser);

  const getDaysLeft = () => {
    const date = new Date();
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return lastDay.getDate() - date.getDate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-6 flex-shrink-0 relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 rounded-full text-white/50 hover:text-white z-20">
            <X size={20} />
          </button>
          
          <div className="flex flex-col items-center justify-center mb-2">
            <Crown size={40} className="text-yellow-200 drop-shadow-lg mb-2" fill="currentColor" />
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Leaderboard</h2>
            <div className="flex items-center gap-2 text-xs font-bold text-yellow-100 bg-black/20 px-3 py-1 rounded-full mt-2">
               <Calendar size={12} />
               <span>Resets in {getDaysLeft()} days</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-2 bg-slate-800 border-b border-white/5 flex-shrink-0">
           <button 
             onClick={() => setTab('GLOBAL')} 
             className={`flex-1 py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors ${tab === 'GLOBAL' ? 'bg-white/10 text-white' : 'text-white/40'}`}
           >
              <Globe size={16} /> Global
           </button>
           <button 
             onClick={() => setTab('MONTHLY')} 
             className={`flex-1 py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors ${tab === 'MONTHLY' ? 'bg-white/10 text-white' : 'text-white/40'}`}
           >
              <Calendar size={16} /> Monthly
           </button>
           <button 
             onClick={() => setTab('COINS')} 
             className={`flex-1 py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors ${tab === 'COINS' ? 'bg-white/10 text-white' : 'text-white/40'}`}
           >
              <Coins size={16} /> Tycoon
           </button>
        </div>

        {/* Info Banner for Coins Tab */}
        {tab === 'COINS' && !isGuest && (
            <div className="bg-slate-800 px-4 py-2 border-b border-white/5 text-[10px] text-white/50 text-center flex-shrink-0">
                *Only coins earned from Classic Mode gameplay are counted.
            </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900 pb-20 min-h-0 touch-pan-y overscroll-contain relative">
           
           {/* GUEST LOCK OVERLAY */}
           {isGuest && (
              <div className="absolute inset-0 z-10 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                  <Lock size={48} className="text-indigo-400 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Login Required</h3>
                  <p className="text-white/60 text-sm mb-6">Connect your account to access global rankings.</p>
                  <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors">
                      Go Back
                  </button>
              </div>
           )}

           {loading && !isGuest && (
               <div className="absolute inset-0 flex items-center justify-center">
                   <Loader2 className="animate-spin text-white/50" size={32} />
               </div>
           )}

           {/* Top 3 Podium */}
           {!isGuest && !loading && (
               <>
                   {entries.length > 0 ? (
                       <>
                           <div className="flex items-end justify-center gap-2 p-6 pb-8 bg-gradient-to-b from-slate-800 to-slate-900 min-h-[220px]">
                              {/* 2nd Place */}
                              <div className="flex flex-col items-center w-20">
                                 {top3[1] ? (
                                    <>
                                        <div className="w-16 h-16 rounded-full border-2 border-gray-400 p-1 mb-2 relative">
                                            <img src={top3[1].avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[1].name}`} className="w-full h-full rounded-full bg-slate-700 object-cover" alt="2nd" />
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs font-bold text-black border-2 border-slate-800">2</div>
                                        </div>
                                        <span className="text-xs font-bold text-white max-w-[80px] truncate">{top3[1].name}</span>
                                        <span className="text-[10px] font-mono text-gray-400">{top3[1].score.toLocaleString()}</span>
                                    </>
                                 ) : null}
                              </div>

                              {/* 1st Place */}
                              <div className="flex flex-col items-center -mt-6 w-24">
                                 {top3[0] ? (
                                    <>
                                         <Crown size={24} className="text-yellow-400 mb-1 animate-bounce" fill="currentColor" />
                                         <div className="w-20 h-20 rounded-full border-4 border-yellow-400 p-1 mb-2 relative shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                                            <img src={top3[0].avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[0].name}`} className="w-full h-full rounded-full bg-slate-700 object-cover" alt="1st" />
                                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm font-bold text-black border-4 border-slate-800">1</div>
                                         </div>
                                         <span className="text-sm font-bold text-white max-w-[100px] truncate">{top3[0].name}</span>
                                         <span className="text-xs font-mono text-yellow-400 font-bold">{top3[0].score.toLocaleString()}</span>
                                    </>
                                 ) : null}
                              </div>

                              {/* 3rd Place */}
                              <div className="flex flex-col items-center w-20">
                                 {top3[2] ? (
                                    <>
                                        <div className="w-16 h-16 rounded-full border-2 border-orange-700 p-1 mb-2 relative">
                                            <img src={top3[2].avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[2].name}`} className="w-full h-full rounded-full bg-slate-700 object-cover" alt="3rd" />
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-orange-700 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-slate-800">3</div>
                                        </div>
                                        <span className="text-xs font-bold text-white max-w-[80px] truncate">{top3[2].name}</span>
                                        <span className="text-[10px] font-mono text-orange-400">{top3[2].score.toLocaleString()}</span>
                                    </>
                                 ) : null}
                              </div>
                           </div>

                           {/* List 4+ */}
                           <div className="px-4 space-y-2">
                              {restList.map((entry) => (
                                 <div 
                                   key={entry.id} 
                                   className={`flex items-center justify-between p-3 rounded-xl border ${entry.isUser ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/5'}`}
                                 >
                                    <div className="flex items-center gap-3">
                                       <span className={`w-6 text-center font-mono font-bold ${entry.isUser ? 'text-white' : 'text-white/40'}`}>
                                          {entry.rank}
                                       </span>
                                       <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                                          <img src={entry.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.name}`} className="w-full h-full object-cover" alt="avatar" />
                                       </div>
                                       <span className={`text-sm font-bold ${entry.isUser ? 'text-white' : 'text-white/80'}`}>
                                          {entry.name} {entry.isUser && '(You)'}
                                       </span>
                                    </div>
                                    <span className={`font-mono font-bold ${entry.isUser ? 'text-white' : 'text-white/60'}`}>
                                       {entry.score.toLocaleString()}
                                    </span>
                                 </div>
                              ))}
                           </div>
                       </>
                   ) : (
                       <div className="text-center py-10 text-white/40">
                           <p>No players found yet.</p>
                       </div>
                   )}
               </>
           )}
        </div>

        {/* User Sticky Footer */}
        {userRankEntry && !isGuest && (
           <div className="absolute bottom-0 w-full bg-slate-800 border-t border-white/10 p-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-8">
                       <span className="text-[10px] text-white/40 uppercase">Rank</span>
                       <span className="text-lg font-black text-white leading-none">{userRankEntry.rank}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-500 p-0.5 border border-white/20">
                        <img src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} className="w-full h-full rounded-full bg-black/20 object-cover" alt="Me" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-sm font-bold text-white">My Position</span>
                       <span className="text-[10px] text-white/50">
                          {userRankEntry.rank <= 10 ? 'Top 10!' : 'Keep Climbing!'}
                       </span>
                    </div>
                 </div>
                 <div className="text-right">
                    <span className="block text-sm font-mono font-black text-yellow-400">{userRankEntry.score.toLocaleString()}</span>
                 </div>
              </div>
           </div>
        )}

      </div>
    </div>
  );
};
