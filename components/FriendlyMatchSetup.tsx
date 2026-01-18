
import React, { useState, useEffect } from 'react';
import { Users, Clock, DoorOpen, Play, Loader2, Copy, CheckCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface FriendlyMatchSetupProps {
  user: UserProfile;
  startChallenge: (stake: number, isRoom?: boolean, roomCode?: string, amIHost?: boolean) => boolean;
  onClose: () => void;
}

export const FriendlyMatchSetup: React.FC<FriendlyMatchSetupProps> = ({ user, startChallenge, onClose }) => {
  const [roomCode, setRoomCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [friendJoined, setFriendJoined] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [isJoinerWaiting, setIsJoinerWaiting] = useState(false);
  const [joinError, setJoinError] = useState('');

  const isGuest = !user.isGoogleLinked;

  // --- HOST LOGIC ---
  const generateRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedCode(code);
    setFriendJoined(false);
    setFriendName('');
  };

  const closeRoom = () => {
    setGeneratedCode('');
    setFriendJoined(false);
    setIsJoinerWaiting(false);
    setRoomCode('');
  };

  // Simulate Friend Joining (Host View)
  useEffect(() => {
    if (generatedCode && !friendJoined) {
       // Simulate a "real" friend joining after a random interval (5-15s)
       // This simulates network latency / waiting for friend
       const waitTime = Math.random() * 5000 + 5000; 
       const timer = setTimeout(() => {
           const names = ["Alex_Pro", "SarahSmith", "CoolGamer99", "DragonSlayer", "PuzzleQueen"];
           setFriendName(names[Math.floor(Math.random() * names.length)]);
           setFriendJoined(true);
       }, waitTime);
       return () => clearTimeout(timer);
    }
  }, [generatedCode, friendJoined]);

  // --- JOINER LOGIC ---
  const handleJoinRoom = () => {
     if (roomCode.length < 4) {
         setJoinError('Invalid Room Code');
         return;
     }
     setJoinError('');
     setIsJoinerWaiting(true);
     
     // Simulate Host Starting the Game
     setTimeout(() => {
         // Host starts match 3 seconds after we join (simulated)
         startChallenge(0, true, roomCode, false);
         onClose();
     }, 4000);
  };

  return (
    <div className="space-y-6">
        {/* INITIAL VIEW */}
        {!generatedCode && !isJoinerWaiting && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
               <label className="block text-xs font-bold text-white/50 uppercase mb-2">Join Room</label>
               <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="ENTER CODE"
                    value={roomCode}
                    onChange={(e) => {
                        setRoomCode(e.target.value.toUpperCase());
                        setJoinError('');
                    }}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white font-mono tracking-widest placeholder:tracking-normal focus:outline-none focus:border-indigo-500 uppercase"
                  />
                  <button 
                    onClick={handleJoinRoom}
                    disabled={roomCode.length < 4 || isGuest}
                    className="px-6 bg-indigo-600 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-indigo-500 transition-colors"
                  >
                    JOIN
                  </button>
               </div>
               {joinError && <p className="text-red-400 text-xs mt-2 font-bold">{joinError}</p>}
            </div>

            <div className="relative flex items-center justify-center">
               <div className="h-px bg-white/10 w-full absolute"></div>
               <span className="relative bg-slate-900 px-2 text-white/30 text-xs font-bold">OR</span>
            </div>

            <button 
              onClick={generateRoom}
              disabled={isGuest}
              className="w-full py-4 bg-white/10 border border-white/10 rounded-xl text-white font-bold hover:bg-white/15 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Users size={18} /> Create Private Room
            </button>
            <p className="text-center text-xs text-white/40">Only logged-in players can create/join rooms.</p>
          </div>
        )}

        {/* JOINER WAITING VIEW */}
        {isJoinerWaiting && (
            <div className="text-center animate-fade-in py-8">
                 <div className="flex justify-center mb-6">
                     <div className="relative w-20 h-20">
                         <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
                         <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                         <Users className="absolute inset-0 m-auto text-indigo-400" size={32} />
                     </div>
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">Connected to Room</h3>
                 <div className="bg-white/10 px-4 py-2 rounded-lg inline-block mb-4">
                    <span className="font-mono font-bold text-white tracking-widest">{roomCode}</span>
                 </div>
                 <p className="text-white/60 text-sm animate-pulse">Waiting for host to start...</p>
                 <button onClick={closeRoom} className="mt-8 text-white/40 hover:text-white text-xs underline">Cancel</button>
            </div>
        )}

        {/* HOST WAITING VIEW */}
        {generatedCode && !isJoinerWaiting && (
          <div className="text-center animate-fade-in">
             <div className="flex items-center justify-between mb-4">
                 <span className="text-white/60 text-xs font-bold uppercase">Room Code</span>
                 <div className="flex items-center gap-1 text-green-400 text-xs font-bold">
                     <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                     Online
                 </div>
             </div>
             
             <div className={`p-6 rounded-2xl border-2 mb-6 flex flex-col items-center gap-2 transition-colors duration-300 ${friendJoined ? 'bg-green-500/10 border-green-500/50' : 'bg-black/40 border-indigo-500/50'}`}>
                <div className="flex items-center gap-3">
                    <span className="text-4xl font-mono font-black text-white tracking-[0.5em] select-all">{generatedCode}</span>
                    <button onClick={() => navigator.clipboard.writeText(generatedCode)} className="p-2 hover:bg-white/10 rounded-full text-white/50">
                        <Copy size={16} />
                    </button>
                </div>
                
                {!friendJoined ? (
                    <div className="flex items-center gap-2 text-indigo-400 animate-pulse mt-4">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs font-bold">WAITING FOR FRIEND TO JOIN...</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center mt-2 animate-bounce-in">
                        <div className="flex items-center gap-2 text-green-400 mb-1">
                            <CheckCircle size={16} />
                            <span className="text-xs font-bold">PLAYER CONNECTED</span>
                        </div>
                        <span className="text-lg font-bold text-white">{friendName}</span>
                    </div>
                )}
             </div>

             {/* Action Buttons */}
             <div className="space-y-3">
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
                         startChallenge(0, true, generatedCode, true); // amIHost = true
                         onClose();
                      }}
                      className="w-full py-4 bg-green-600 text-white font-bold rounded-xl animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                    >
                      <Play size={20} fill="currentColor" /> START MATCH
                    </button>
               )}
             </div>
          </div>
        )}
    </div>
  );
};
