
import React, { useState, useEffect } from 'react';
import { Users, Copy, CheckCircle, Play, Loader2, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../services/supabase';

interface FriendlyMatchSetupProps {
  user: UserProfile;
  startChallenge: (stake: number, isRoom?: boolean, roomCode?: string, amIHost?: boolean, opponentName?: string, matchId?: number, opponentId?: string) => boolean;
  onClose: () => void;
}

interface MatchData {
  id: number;
  room_code: string;
  player1_name: string;
  player2_name?: string;
  player1_id: string;
  player2_id?: string;
  status: 'waiting' | 'starting' | 'in_progress' | 'completed';
}

export const FriendlyMatchSetup: React.FC<FriendlyMatchSetupProps> = ({ user, startChallenge, onClose }) => {
  const [roomCode, setRoomCode] = useState('');
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);

  // Robust check: User is guest only if no google link AND no email
  const isGuest = !user.isGoogleLinked && !user.email;

  // --- Realtime Listener ---
  useEffect(() => {
    if (!matchData) return;

    const channel = supabase.channel(`match_${matchData.room_code}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'challenge_matches',
          filter: `room_code=eq.${matchData.room_code}`
        },
        (payload) => {
          const newData = payload.new as MatchData;
          setMatchData(newData);

          // Handle Match Start Signal (from DB)
          if (newData.status === 'starting' && countdown === null) {
              startCountdown(newData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchData?.room_code]);

  const startCountdown = (data: MatchData) => {
    let count = 5;
    setCountdown(count);
    const timer = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
            clearInterval(timer);
            const isHost = data.player1_name === user.username;
            const opponentName = isHost ? (data.player2_name || 'Friend') : data.player1_name;
            // Determine opponent ID for surrender logic
            const opponentId = isHost ? data.player2_id : data.player1_id;
            
            if (!opponentId) {
                console.warn("Opponent ID missing, surrender logic might fail");
            }

            // Start the game with all necessary IDs
            startChallenge(0, true, data.room_code, isHost, opponentName, data.id, opponentId);
            onClose();
        }
    }, 1000);
  };

  // --- HOST: Create Room ---
  const createRoom = async () => {
    if (isGuest) return;
    setIsLoading(true);
    setError('');

    try {
      // 1. Explicitly check for valid session before attempting DB operation
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
          throw new Error("Session expired. Please log out and sign in again.");
      }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('challenge_matches')
        .insert({
           room_code: code,
           stake_points: 0,
           status: 'waiting',
           match_type: 'friend',
           player1_name: user.username,
           player1_email: authUser.email || user.email, // Prefer auth email
           player1_id: authUser.id, // Include ID for RLS policies
           is_player2_ai: false // Enforce NO AI
        })
        .select()
        .single();

      if (error) {
          console.error("Supabase insert error:", JSON.stringify(error, null, 2));
          if (error.code === 'PGRST205') {
             throw new Error("Database not setup. Please run the SUPABASE_SCHEMA.sql script.");
          }
          throw new Error(error.message || "Failed to create match on server.");
      }
      setMatchData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create room.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- JOINER: Join Room ---
  const joinRoom = async () => {
    if (isGuest || roomCode.length < 4) return;
    setIsLoading(true);
    setError('');

    try {
       // 1. Verify session
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
          throw new Error("Session expired. Please log out and sign in again.");
      }

      // 2. Find the match
      const { data: existingMatch, error: findError } = await supabase
        .from('challenge_matches')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (findError) {
           if (findError.code === 'PGRST205') {
               throw new Error("Database not setup. Missing 'challenge_matches' table.");
           }
           if (findError.code === 'PGRST116') {
               throw new Error('Room not found. Check the code.');
           }
           throw findError;
      }

      if (!existingMatch) {
          throw new Error('Room not found.');
      }

      if (existingMatch.player1_name === user.username) {
         // Re-joining own room
         setMatchData(existingMatch);
         setIsLoading(false);
         return;
      }

      // 3. Update player 2
      const { data: updatedMatch, error: updateError } = await supabase
        .from('challenge_matches')
        .update({
            player2_name: user.username,
            player2_email: authUser.email || user.email,
            player2_id: authUser.id // Include ID for RLS policies
        })
        .eq('id', existingMatch.id)
        .select()
        .single();

      if (updateError) {
          console.error("Supabase join error:", JSON.stringify(updateError, null, 2));
          throw new Error(updateError.message || "Failed to join room.");
      }
      setMatchData(updatedMatch);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not join room.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- START MATCH ACTION (Host or Friend) ---
  const triggerStartMatch = async () => {
     if (!matchData) return;
     try {
         await supabase
             .from('challenge_matches')
             .update({ status: 'starting' })
             .eq('id', matchData.id);
     } catch (err) {
         console.error('Error starting match:', err);
     }
  };

  // --- UI RENDER ---

  const isHost = matchData?.player1_name === user.username;
  const friendName = isHost ? matchData?.player2_name : matchData?.player1_name;
  const friendConnected = !!matchData?.player2_name;

  if (countdown !== null) {
      return (
          <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
              <div className="text-6xl font-black text-white mb-4 animate-ping">
                  {countdown}
              </div>
              <p className="text-white/60 text-lg uppercase font-bold tracking-widest">Starting Match...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
       {/* ERROR MESSAGE */}
       {error && (
           <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2 text-red-400 text-sm font-bold">
               <AlertCircle size={16} />
               {error}
           </div>
       )}

       {/* INITIAL VIEW */}
       {!matchData && (
          <div className="space-y-4 animate-fade-in">
             {/* Join Section */}
             <div className="bg-white/5 p-4 rounded-xl border border-white/10">
               <label className="block text-xs font-bold text-white/50 uppercase mb-2">Enter Friend's Code</label>
               <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="CODE"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white font-mono tracking-widest uppercase focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    onClick={joinRoom}
                    disabled={roomCode.length < 4 || isLoading || isGuest}
                    className="px-6 bg-indigo-600 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-indigo-500 transition-colors flex items-center gap-2"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'JOIN'}
                  </button>
               </div>
             </div>

             <div className="relative flex items-center justify-center">
               <div className="h-px bg-white/10 w-full absolute"></div>
               <span className="relative bg-slate-900 px-2 text-white/30 text-xs font-bold">OR</span>
            </div>

            <button 
              onClick={createRoom}
              disabled={isGuest || isLoading}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-bold shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
              Create Private Room
            </button>

            {isGuest && (
                <p className="text-center text-xs text-red-400 font-bold mt-2">
                    * You must login to play with friends.
                </p>
            )}
          </div>
       )}

       {/* ROOM LOBBY VIEW */}
       {matchData && (
           <div className="text-center animate-fade-in">
               <div className="flex items-center justify-between mb-6">
                   <div className="flex flex-col items-start">
                       <span className="text-[10px] text-white/40 uppercase font-bold">Room Code</span>
                       <div className="flex items-center gap-2">
                           <span className="text-3xl font-mono font-black text-white tracking-widest">{matchData.room_code}</span>
                           <button onClick={() => navigator.clipboard.writeText(matchData.room_code)} className="text-white/40 hover:text-white">
                               <Copy size={16} />
                           </button>
                       </div>
                   </div>
                   <div className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                       <span className="text-xs font-bold text-green-400">Live</span>
                   </div>
               </div>

               {/* Player Slots */}
               <div className="grid grid-cols-2 gap-4 mb-8">
                   {/* YOU */}
                   <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center">
                       <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center mb-2 font-bold text-white text-xl">
                          {user.username.charAt(0)}
                       </div>
                       <span className="text-sm font-bold text-white max-w-full truncate">{user.username}</span>
                       <span className="text-[10px] text-white/40 uppercase">You</span>
                   </div>

                   {/* OPPONENT */}
                   <div className={`border rounded-xl p-4 flex flex-col items-center transition-all ${friendConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/5 border-dashed'}`}>
                       {friendConnected ? (
                           <>
                               <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mb-2 font-bold text-white text-xl animate-bounce-in">
                                  {friendName?.charAt(0)}
                               </div>
                               <span className="text-sm font-bold text-white max-w-full truncate">{friendName}</span>
                               <span className="text-[10px] text-green-400 uppercase font-bold">Connected</span>
                           </>
                       ) : (
                           <>
                               <div className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center mb-2">
                                  <Loader2 size={20} className="text-white/30 animate-spin" />
                               </div>
                               <span className="text-xs text-white/40 font-bold animate-pulse">Waiting...</span>
                           </>
                       )}
                   </div>
               </div>

               {/* Actions */}
               {friendConnected ? (
                   <button 
                     onClick={triggerStartMatch}
                     className="w-full py-4 bg-green-500 text-white font-black rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                       <Play size={20} fill="currentColor" />
                       START MATCH
                   </button>
               ) : (
                   <div className="text-white/40 text-sm font-medium animate-pulse mb-4">
                       Share code <span className="text-white font-mono">{matchData.room_code}</span> with a friend
                   </div>
               )}
               
               <button onClick={onClose} className="mt-4 text-white/30 hover:text-white text-xs underline">
                   Leave Room
               </button>
           </div>
       )}
    </div>
  );
};
