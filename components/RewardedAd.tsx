
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface RewardedAdProps {
  unitId: string;
  onClose: () => void;
  onReward: () => void;
}

export const RewardedAd: React.FC<RewardedAdProps> = ({ unitId, onClose, onReward }) => {
  const [timeLeft, setTimeLeft] = useState(5);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanClose(true);
          onReward(); // Reward is available
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onReward]);

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center animate-fade-in font-sans">
      {/* Top Bar with Close Button */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-gray-50">
        <span className="text-xs text-gray-400 font-bold tracking-widest uppercase">AdMob Test Ad</span>
        {canClose ? (
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors"
          >
            <X size={20} className="text-black" />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-xs font-bold text-black/50">
            {timeLeft}
          </div>
        )}
      </div>

      {/* Test Ad Content - Mimicking Google Test Ad */}
      <div className="flex flex-col items-center justify-center p-8 gap-6 max-w-sm w-full">
         <div className="w-24 h-24 bg-[#4285F4] rounded-2xl flex items-center justify-center shadow-lg mb-2">
            <span className="text-white text-4xl font-bold">Ad</span>
         </div>
         
         <div className="text-center">
             <h2 className="text-3xl font-bold text-gray-800 mb-2">Nice job!</h2>
             <p className="text-gray-500 text-sm">You're displaying a rewarded video test ad from AdMob.</p>
         </div>

         <div className="w-full bg-gray-100 p-4 rounded-xl border border-gray-200 mt-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1 text-center">Ad Unit ID</p>
            <p className="text-xs font-mono text-center text-gray-600 break-all select-all">{unitId}</p>
         </div>
      </div>
    </div>
  );
};
