
import React, { useState, useMemo } from 'react';
import { X, Trophy, Coins, Globe, Calendar, Crown, Medal, Info } from 'lucide-react';
import { UserProfile } from '../types';

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
  avatarId: string; // seed for dicebear
  isUser: boolean;
  rank?: number;
}

// Mock Data Generators
const generateMockData = (type: LeaderboardTab, user: UserProfile): LeaderboardEntry[] => {
  // Use realistic names, excluding the specific "AI Bot" names used in Challenge Mode (e.g. SpeedyBot, Kai, Luna, etc.)
  const names = [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Jamie', 'Riley', 'Avery', 
    'Parker', 'Quinn', 'Sam', 'Danny', 'Drew', 'Ellis', 'Finn', 'Gaby', 
    'Harper', 'Hayden', 'Jesse', 'Kit', 'Kris', 'Liam', 'Logan', 'Micah', 
    'Nicky', 'Noah', 'Pat', 'Peyton', 'Reese', 'Robin', 'Rory', 'Rowan', 
    'Ryan', 'Sage', 'Sasha', 'Sawyer', 'Shay', 'Sid', 'Skyler', 'Stevie', 
    'Toby', 'Tyler', 'Val', 'Vic', 'Zion', 'Austin', 'Blake', 'Cameron',
    'Dakota', 'Charlie', 'Emerson', 'Frankie', 'Gray', 'Hunter', 'Indigo',
    'Jules', 'Kendall', 'Lake', 'Marley', 'Oakley', 'Phoenix', 'Rain',
    'River', 'Skylar', 'Storm', 'Tatum', 'West', 'Winter'
  ];
  
  const entries: LeaderboardEntry[] = [];

  // Generate 99 random players
  for (let i = 0; i < 99; i++) {
    const name = names[i % names.length] + (Math.floor(Math.random() * 999));
    let score = 0;

    if (type === 'MONTHLY') {
      // Monthly scores usually around 2k - 15k
      score = Math.floor(Math.random() * 15000) + 2000;
    } else if (type === 'GLOBAL') {
      // All time highs can be 5k - 50k
      score = Math.floor(Math.random() * 45000) + 5000;
    } else {
      // Coins
      score = Math.floor(Math.random() * 100000) + 1000;
    }

    entries.push({
      // Use "uid_" to simulate real user IDs, avoiding "bot_" prefix
      id: `uid_${Math.random().toString(36).substr(2, 9)}`, 
      name: name,
      score: score,
      avatarId: `avatar_${name}`,
      isUser: false
    });
  }

  // Add Current User
  let userScore = 0;
  if (type === 'MONTHLY') userScore = user.stats.classicHighScore; // Simplified: Using classic high as monthly proxy
  else if (type === 'GLOBAL') userScore = user.highScore;
  else userScore = user.stats.totalCoinsEarned;

  entries.push({
    id: 'user_current',
    name: user.username,
    score: userScore,
    avatarId: user.username,
    isUser: true
  });

  // Sort Descending
  return entries.sort((a, b) => b.score - a.score).map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));
};

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, user }) => {
  const [tab, setTab] = useState<LeaderboardTab>('MONTHLY');
  const [showRules, setShowRules] = useState(false);

  // Memoize data so it doesn't jitter on re-renders, recalculates only when opening/tab change
  const leaderboardData = useMemo(() => {
    if (!isOpen) return [];
    return generateMockData(tab, user);
  }, [isOpen, tab, user]);

  const top3 = leaderboardData.slice(0, 3);
  const restList = leaderboardData.slice(3, 100);
  const userRankEntry = leaderboardData.find(e => e.isUser);

  // Helper for time remaining
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
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 rounded-full text-white/50 hover:text-white">
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
        <div className="flex p-2 gap-2 bg-slate-800 border-b border-white/5">
           <button 
             onClick={() => setTab('MONTHLY')} 
             className={`flex-1 py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors ${tab === 'MONTHLY' ? 'bg-white/10 text-white' : 'text-white/40'}`}
           >
              <Calendar size={16} /> Monthly
           </button>
           <button 
             onClick={() => setTab('GLOBAL')} 
             className={`flex-1 py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors ${tab === 'GLOBAL' ? 'bg-white/10 text-white' : 'text-white/40'}`}
           >
              <Globe size={16} /> Global
           </button>
           <button 
             onClick={() => setTab('COINS')} 
             className={`flex-1 py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-colors ${tab === 'COINS' ? 'bg-white/10 text-white' : 'text-white/40'}`}
           >
              <Coins size={16} /> Tycoon
           </button>
        </div>

        {/* Reward Rules Toggle */}
        {tab === 'MONTHLY' && (
           <div className="bg-slate-800 px-4 py-2 border-b border-white/5">
              <button onClick={() => setShowRules(!showRules)} className="w-full flex items-center justify-between text-xs font-bold text-yellow-400">
                 <span className="flex items-center gap-1"><Info size={12} /> Monthly Rewards</span>
                 <span>{showRules ? 'Hide' : 'Show'}</span>
              </button>
              
              {showRules && (
                 <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-white/70 animate-fade-in">
                    <div className="bg-black/20 p-2 rounded flex justify-between"><span>🥇 Top 1</span> <span className="text-yellow-400">30,000</span></div>
                    <div className="bg-black/20 p-2 rounded flex justify-between"><span>🥈 Top 2</span> <span className="text-gray-300">20,000</span></div>
                    <div className="bg-black/20 p-2 rounded flex justify-between"><span>🥉 Top 3</span> <span className="text-orange-400">10,000</span></div>
                    <div className="bg-black/20 p-2 rounded flex justify-between"><span>Top 4-50</span> <span className="text-white">3,000</span></div>
                 </div>
              )}
           </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900 pb-20 min-h-0 touch-pan-y">
           
           {/* Top 3 Podium */}
           <div className="flex items-end justify-center gap-2 p-6 pb-8 bg-gradient-to-b from-slate-800 to-slate-900">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                 <div className="w-16 h-16 rounded-full border-2 border-gray-400 p-1 mb-2 relative">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[1].avatarId}`} className="w-full h-full rounded-full bg-slate-700" alt="2nd" />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs font-bold text-black border-2 border-slate-800">2</div>
                 </div>
                 <span className="text-xs font-bold text-white max-w-[80px] truncate">{top3[1].name}</span>
                 <span className="text-[10px] font-mono text-gray-400">{top3[1].score.toLocaleString()}</span>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center -mt-6">
                 <Crown size={24} className="text-yellow-400 mb-1 animate-bounce" fill="currentColor" />
                 <div className="w-20 h-20 rounded-full border-4 border-yellow-400 p-1 mb-2 relative shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[0].avatarId}`} className="w-full h-full rounded-full bg-slate-700" alt="1st" />
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm font-bold text-black border-4 border-slate-800">1</div>
                 </div>
                 <span className="text-sm font-bold text-white max-w-[100px] truncate">{top3[0].name}</span>
                 <span className="text-xs font-mono text-yellow-400 font-bold">{top3[0].score.toLocaleString()}</span>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                 <div className="w-16 h-16 rounded-full border-2 border-orange-700 p-1 mb-2 relative">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[2].avatarId}`} className="w-full h-full rounded-full bg-slate-700" alt="3rd" />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-orange-700 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-slate-800">3</div>
                 </div>
                 <span className="text-xs font-bold text-white max-w-[80px] truncate">{top3[2].name}</span>
                 <span className="text-[10px] font-mono text-orange-400">{top3[2].score.toLocaleString()}</span>
              </div>
           </div>

           {/* List 4-100 */}
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
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.avatarId}`} alt="avatar" />
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
        </div>

        {/* User Sticky Footer (if not in view or just always show) */}
        {userRankEntry && (
           <div className="absolute bottom-0 w-full bg-slate-800 border-t border-white/10 p-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-8">
                       <span className="text-[10px] text-white/40 uppercase">Rank</span>
                       <span className="text-lg font-black text-white leading-none">{userRankEntry.rank}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-500 p-0.5 border border-white/20">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} className="w-full h-full rounded-full bg-black/20" alt="Me" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-sm font-bold text-white">My Position</span>
                       <span className="text-[10px] text-white/50">{userRankEntry.rank && userRankEntry.rank <= 50 ? 'In Reward Zone!' : 'Play more to rank up!'}</span>
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
