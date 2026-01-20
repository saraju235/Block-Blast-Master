
import React from 'react';
import { X, CheckCircle, Target, Coins, RefreshCw } from 'lucide-react';
import { DailyMission } from '../types';

interface DailyMissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  missions: DailyMission[];
  onClaim: (id: string) => void;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({ 
  isOpen, onClose, missions, onClaim 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex-shrink-0 relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 rounded-full text-white/50 hover:text-white">
            <X size={20} />
          </button>
          
          <div className="flex items-center justify-center gap-3 mb-2">
            <Target size={32} className="text-white" />
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Daily Missions</h2>
          </div>
          <p className="text-white/80 text-center text-sm font-medium">Complete Today's Missions and Earn Rewards!</p>
          <div className="flex items-center justify-center gap-1 mt-2 text-white/50 text-xs">
             <RefreshCw size={10} /> New missions refresh every 24 hours
          </div>
        </div>

        {/* Content - Added touch-pan-y and ensure overflow works */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-3 custom-scrollbar touch-pan-y overscroll-contain">
          {missions.map((mission) => {
            const isCompleted = mission.progress >= mission.target;
            const progressPercent = Math.min((mission.progress / mission.target) * 100, 100);

            return (
              <div 
                key={mission.id} 
                className={`border rounded-xl p-4 transition-all ${isCompleted && !mission.isClaimed ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg' : 'bg-white/5 border-white/10'}`}
              >
                <div className="flex justify-between items-start mb-2">
                   <div>
                      <h3 className="text-sm font-bold text-white mb-1">{mission.title}</h3>
                      <p className="text-xs text-white/60">{mission.description}</p>
                   </div>
                   {mission.isClaimed ? (
                      <div className="flex items-center gap-1 text-green-400 font-bold text-xs bg-green-400/10 px-2 py-1 rounded-full">
                         <CheckCircle size={12} /> Claimed
                      </div>
                   ) : (
                      <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                         <Coins size={12} className="text-yellow-400" />
                         <span className="text-xs font-bold text-white">{mission.reward}</span>
                      </div>
                   )}
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 bg-black/40 rounded-full overflow-hidden mb-3">
                   <div 
                     className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-indigo-500'}`} 
                     style={{ width: `${progressPercent}%` }}
                   />
                </div>
                
                <div className="flex items-center justify-between">
                   <span className="text-xs font-mono font-bold text-white/50">
                     {mission.progress} / {mission.target}
                   </span>
                   
                   {!mission.isClaimed && (
                     <button
                       onClick={() => onClaim(mission.id)}
                       disabled={!isCompleted}
                       className={`
                          px-4 py-1.5 rounded-lg text-xs font-bold transition-all
                          ${isCompleted 
                             ? 'bg-green-500 text-white shadow-lg hover:scale-105 active:scale-95 animate-pulse' 
                             : 'bg-white/5 text-white/20 cursor-not-allowed'}
                       `}
                     >
                        {isCompleted ? 'CLAIM' : 'IN PROGRESS'}
                     </button>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
