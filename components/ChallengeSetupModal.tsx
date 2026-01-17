
import React, { useState, useEffect } from 'react';
import { X, Trophy, Users, Swords, Copy, Coins, Loader2, Play, DoorOpen, Lock } from 'lucide-react';
import { UserProfile } from '../types';

interface ChallengeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  startChallenge: (stake: number, isRoom?: boolean, roomCode?: string) => boolean;
}

export const ChallengeSetupModal: React.FC<ChallengeSetupModalProps> = ({ 
  isOpen, onClose, user, startChallenge 
}) => {
  const [tab, setTab] = useState<'MATCH' | 'FRIEND'>('MATCH');
  const [roomCode, setRoomCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [friendJoined, setFriendJoined] = useState(false);

  // Simulation: When room is generated, simulate friend joining after delay
  useEffect(() => {
    let timer: number;
    if (generatedCode) {
      setFriendJoined(false);
      // Simulate waiting 3-5 seconds for friend
      timer = window.setTimeout(() => {
        setFriendJoined(true);
      }, Math.random() * 2000 + 3000); 
    }
    return () => clearTimeout(timer);
  }, [generatedCode]);

  if (!isOpen) return null;

  const stakes = [100, 200, 300, 500];
  const isGuest = !user.isGoogleLinked;

  const handleJoinRoom = () => {
     if (roomCode.length > 3) {
       // Simulate joining a friend room - pass 0 stake for friendly match logic
       startChallenge(0, true, roomCode); 
       onClose();
     }
  };

  const generateRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedCode(code);
  };

  const closeRoom = () => {
    setGeneratedCode('');
    setFriendJoined(false);
  };

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
          {/* Guest Lock Overlay */}
          {isGuest && (
             <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 mt-[200px]">
                <Lock size={40} className="text-red-400 mb-2" />
                <h3 className="text-xl font-bold text-white mb-1">Login Required</h3>
                <p className="text-white/60 text-sm mb-4">Guest accounts cannot play Ranked or Friendly matches.</p>
                <button 
                   onClick={onClose} 
                   className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold"
                >
                   Go Back
                </button>
             </div>
          )}

          {tab === 'MATCH' && (
            <div className="grid grid-cols-2 gap-4">
               {stakes.map(stake => {
                 const canAfford = user.coins >= stake;
                 return (
                   <button
                     key={stake}
                     disabled={!canAfford || isGuest}
                     onClick={() => {
                        startChallenge(stake);
                        onClose();
                     }}
                     className={`relative p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all
                       ${canAfford ? 'border-indigo-500/50 bg-indigo-500/10 hover:bg-indigo-500/20 hover:scale-105' : 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed'}
                     `}
                   >
                     <span className="text-xs font-bold text-white/50 uppercase mb-1">Entry Fee</span>
                     <div className="flex items-center gap-1 mb-2">
                        <Coins size={20} className="text-yellow-400" />
                        <span className="text-2xl font-black text-white">{stake}</span>
                     </div>
                     <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">
                        Win {stake * 2}
                     </div>
                   </button>
                 );
               })}
            </div>
          )}

          {tab === 'FRIEND' && (
             <div className="space-y-6">
                {!generatedCode ? (
                  <div className="space-y-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                       <label className="block text-xs font-bold text-white/50 uppercase mb-2">Join Room</label>
                       <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Enter Room ID"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white font-mono tracking-widest placeholder:tracking-normal focus:outline-none focus:border-indigo-500"
                          />
                          <button 
                            onClick={handleJoinRoom}
                            disabled={roomCode.length < 4 || isGuest}
                            className="px-6 bg-indigo-600 text-white font-bold rounded-lg disabled:opacity-50"
                          >
                            JOIN
                          </button>
                       </div>
                    </div>

                    <div className="relative flex items-center justify-center">
                       <div className="h-px bg-white/10 w-full absolute"></div>
                       <span className="relative bg-slate-900 px-2 text-white/30 text-xs font-bold">OR</span>
                    </div>

                    <button 
                      onClick={generateRoom}
                      disabled={isGuest}
                      className="w-full py-4 bg-white/10 border border-white/10 rounded-xl text-white font-bold hover:bg-white/15 transition-colors disabled:opacity-50"
                    >
                      Create Private Room (Free)
                    </button>
                  </div>
                ) : (
                  <div className="text-center animate-fade-in">
                     <p className="text-white/60 mb-4">Share this code with your friend:</p>
                     
                     <div className={`p-6 rounded-2xl border-2 mb-6 flex flex-col items-center gap-2 transition-colors duration-300 ${friendJoined ? 'bg-green-500/10 border-green-500/50' : 'bg-black/40 border-indigo-500/50'}`}>
                        <span className="text-4xl font-mono font-black text-white tracking-[0.5em]">{generatedCode}</span>
                        
                        {!friendJoined ? (
                            <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-xs font-bold">WAITING FOR PLAYER...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-green-400 animate-bounce-in">
                                <Users size={16} />
                                <span className="text-xs font-bold">FRIEND JOINED!</span>
                            </div>
                        )}
                     </div>

                     {/* Dynamic Action Button */}
                     {!friendJoined ? (
                       <button 
                          onClick={closeRoom}
                          className="w-full py-4 bg-red-500/10 text-red-400 border border-red-500/20 font-bold rounded-xl hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                        >
                          <DoorOpen size={20} /> CLOSE ROOM
                        </button>
                     ) : (
                       <button 
                          onClick={() => {
                             startChallenge(0, true);
                             onClose();
                          }}
                          className="w-full py-4 bg-green-600 text-white font-bold rounded-xl animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                        >
                          <Play size={20} fill="currentColor" /> START MATCH
                        </button>
                     )}
                     
                     <p className="text-white/30 text-[10px] mt-4">Friendly matches do not require coins.</p>
                  </div>
                )}
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
