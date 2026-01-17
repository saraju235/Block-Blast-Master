import React from 'react';
import { Gift, Check, X } from 'lucide-react';

interface DailyRewardModalProps {
  onClaim: () => void;
  onClose: () => void;
  streakDay: number; // 1-7
  isAvailable: boolean;
}

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({ onClaim, onClose, streakDay, isAvailable }) => {
  
  const days = [
    { day: 1, val: 50 },
    { day: 2, val: 50 },
    { day: 3, val: 50 },
    { day: 4, val: 100 },
    { day: 5, val: 100 },
    { day: 6, val: 100 },
    { day: 7, val: 200 },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-b from-indigo-900 to-slate-900 border border-white/10 rounded-3xl p-6 text-center shadow-2xl">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 rounded-full text-white/50 hover:text-white cursor-pointer z-50">
          <X size={20} />
        </button>

        <div className="mb-6">
           <h2 className="text-3xl font-black text-white mb-1 tracking-tight">DAILY REWARDS</h2>
           <p className="text-white/60 text-sm">Collect for 7 days to get a big prize!</p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {days.map((item) => {
            let isCompleted = item.day < streakDay;
            let isCurrent = item.day === streakDay;
            
            // If user has already claimed today (isAvailable = false), 
            // then the current streak day should visually appear as completed/claimed.
            if (!isAvailable && isCurrent) {
                isCompleted = true;
                isCurrent = false;
            }

            const isBig = item.day === 7;
            
            return (
              <div 
                key={item.day}
                className={`
                   relative flex flex-col items-center justify-center p-2 rounded-xl border
                   ${isBig ? 'col-span-2 aspect-[2/1]' : 'aspect-square'}
                   ${isCurrent ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-105 z-10' : ''}
                   ${isCompleted ? 'bg-indigo-950/50 border-indigo-500/30 opacity-60' : ''}
                   ${!isCurrent && !isCompleted ? 'bg-slate-800 border-white/5' : ''}
                `}
              >
                 {isCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl z-20">
                      <Check className="text-green-400 w-8 h-8" strokeWidth={3} />
                    </div>
                 )}
                 
                 <span className={`text-[10px] font-bold uppercase mb-1 ${isCurrent ? 'text-white' : 'text-white/40'}`}>Day {item.day}</span>
                 
                 <Gift 
                   size={isBig ? 32 : 24} 
                   className={`mb-1 ${isCurrent ? 'text-yellow-300 animate-bounce' : 'text-white/20'}`} 
                 />
                 
                 <span className={`font-black ${isCurrent ? 'text-white' : 'text-white/60'}`}>
                   {item.val}
                 </span>
              </div>
            );
          })}
        </div>

        {isAvailable ? (
          <button 
            onClick={onClaim}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-black text-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            CLAIM NOW
          </button>
        ) : (
          <button 
            onClick={onClose}
            className="w-full py-4 bg-white/10 rounded-xl text-white/60 font-bold text-lg hover:bg-white/20 transition-colors"
          >
            COME BACK TOMORROW
          </button>
        )}
        
      </div>
    </div>
  );
};