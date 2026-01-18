
import React, { useState } from 'react';
import { X, Trophy, Users, Swords, Coins, Lock, Clock } from 'lucide-react';
import { UserProfile } from '../types';
import { FriendlyMatchSetup } from './FriendlyMatchSetup';

interface ChallengeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  startChallenge: (stake: number, isRoom?: boolean, roomCode?: string, amIHost?: boolean) => boolean;
}

export const ChallengeSetupModal: React.FC<ChallengeSetupModalProps> = ({ 
  isOpen, onClose, user, startChallenge 
}) => {
  const [tab, setTab] = useState<'MATCH' | 'FRIEND'>('MATCH');

  if (!isOpen) return null;

  const stakes = [100, 200, 300, 500];
  const isGuest = !user.isGoogleLinked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 rounded-full text-white/50 hover:text-white">
            <X size={20} />
          </button>
          <Swords size={48} className="text-white mx-auto mb-2" />
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">Challenge Mode</h2>
          <p className="text-white/70 text-sm">Win big against players worldwide!</p>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-2 bg-black/20 mx-4 mt-4 rounded-xl">
          <button 
            onClick={() => setTab('MATCH')} 
            className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${tab === 'MATCH' ? 'bg-white text-slate-900' : 'text-white/50 hover:bg-white/5'}`}
          >
            <Trophy size={16} /> Ranked Match
          </button>
          <button 
            onClick={() => setTab('FRIEND')} 
            className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${tab === 'FRIEND' ? 'bg-white text-slate-900' : 'text-white/50 hover:bg-white/5'}`}
          >
            <Users size={16} /> Play w/ Friend
          </button>
        </div>

        <div className="p-6">
          {/* Guest Lock Overlay for Friendly */}
          {isGuest && tab === 'FRIEND' && (
             <div className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 mt-[200px]">
                <Lock size={40} className="text-red-400 mb-2" />
                <h3 className="text-xl font-bold text-white mb-1">Login Required</h3>
                <p className="text-white/60 text-sm mb-4">Guest accounts cannot play Friendly matches.</p>
                <button 
                   onClick={onClose} 
                   className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold"
                >
                   Go Back
                </button>
             </div>
          )}

          {tab === 'MATCH' && (
             <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in space-y-4">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center relative overflow-hidden border border-white/10">
                   <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 animate-pulse"></div>
                   <Swords size={40} className="text-white/30" />
                </div>
                
                <div>
                   <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">Ranked Attack</h3>
                   <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
                      <Clock size={12} />
                      <span>COMING SOON</span>
                   </div>
                </div>
                
                <p className="text-white/40 text-sm max-w-[260px] leading-relaxed">
                   Global matchmaking is currently being upgraded. Check back later for high-stakes battles!
                </p>
             </div>
          )}

          {tab === 'FRIEND' && (
             <FriendlyMatchSetup user={user} startChallenge={startChallenge} onClose={onClose} />
          )}
        </div>

      </div>
    </div>
  );
}
