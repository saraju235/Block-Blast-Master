
import React from 'react';
import { ADMOB_IDS } from '../constants';

interface BannerAdProps {
  placement: 'top' | 'bottom';
  className?: string;
}

export const BannerAd: React.FC<BannerAdProps> = ({ placement, className = '' }) => {
  return (
    <div className={`w-full h-[50px] sm:h-[90px] bg-[#202124] flex items-center justify-center overflow-hidden border-y border-white/5 relative shadow-lg ${className}`}>
       
       {/* Placeholder Content simulating a loaded ad */}
       <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-3 h-3 bg-[#fbbc04] rounded-sm"></div>
             <span className="text-[10px] font-bold text-white/50 tracking-wider">AdMob Banner</span>
          </div>
          <span className="text-[8px] font-mono text-white/20 select-all">
             {ADMOB_IDS.BANNER}
          </span>
       </div>

       {/* Video/Animation Simulation */}
       <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
       </div>
       
       {/* Label tag typically found on ads */}
       <div className="absolute top-0 right-0 bg-[#fbbc04] text-black text-[8px] font-bold px-1 rounded-bl-md z-20">
          Ad
       </div>
    </div>
  );
};
