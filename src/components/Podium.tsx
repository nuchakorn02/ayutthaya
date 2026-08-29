import React from 'react';
import { Player } from '@/lib/types';
import { getDisplayPosition, calculateDefaultPosition } from '@/lib/positionUtils';

interface PodiumProps {
  topPlayers: Player[];
  rankChanges?: Record<string, number>;
}

export default function Podium({ topPlayers, rankChanges }: PodiumProps) {
  if (!topPlayers || topPlayers.length === 0) return null;

  // We want to arrange them as: [2nd, 1st, 3rd]
  const p1 = topPlayers[0];
  const p2 = topPlayers[1];
  const p3 = topPlayers[2];

  // Helper to render the rank change badge
  const renderRankChange = (player: Player) => {
    if (!rankChanges) return null;
    const change = rankChanges[player.id];
    // Only show badge if there is a change AND the player had score updates (latest_change !== 0)
    if (!change || player.latest_change === 0) return null;

    const isUp = change > 0;
    const absChange = Math.abs(change);
    const badgeColor = isUp
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30';
    
    return (
      <div className={`absolute -top-3 -right-3 z-20 flex h-6 items-center justify-center rounded-full border px-2 text-[10px] font-bold backdrop-blur-md ${badgeColor} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
        {isUp ? '▲' : '▼'}{absChange}
      </div>
    );
  };

  const getPositionStr = (p: Player) => {
    return getDisplayPosition(p.position, p.total_score, p.division, []); // Pass empty thresholds, it will fallback to calculation or position string
  };

  const cleanDivision = (div: string) => div.replace('กองทัพที่ ', 'ทัพ ').replace('กองทัพ', '');

  return (
    <div className="mb-10 mt-6 flex items-end justify-center gap-2 sm:gap-6 px-2">
      {/* 2nd Place */}
      {p2 && (
        <div className="flex w-1/3 max-w-[140px] flex-col items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="relative mb-3 flex flex-col items-center">
            {renderRankChange(p2)}
            <div className="relative flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-full border-4 border-slate-300 bg-[#0c0c1e] shadow-[0_0_20px_rgba(203,213,225,0.3)] z-10 overflow-hidden">
              <img
                src={`/api/roblox/avatar/${encodeURIComponent(p2.player_name)}`}
                alt={p2.player_name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="-mt-3 sm:-mt-4 z-20 text-lg sm:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">🥈</div>
            <div className="mt-1 text-center">
              <div className="font-bold text-text-primary text-xs sm:text-base truncate max-w-[100px] sm:max-w-[140px]">{p2.player_name}</div>
              <div className="text-[10px] sm:text-xs text-slate-300">{cleanDivision(p2.division)}</div>
              <div className="mt-1 font-mono text-xs sm:text-sm font-black text-slate-200">
                {p2.total_score.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="w-full rounded-t-xl bg-gradient-to-b from-slate-400/30 to-slate-400/5 border-t-2 border-slate-300 backdrop-blur-sm h-24 sm:h-32 flex justify-center pt-2">
            <span className="text-3xl font-black text-slate-300 opacity-50">2</span>
          </div>
        </div>
      )}

      {/* 1st Place */}
      {p1 && (
        <div className="flex w-1/3 max-w-[160px] flex-col items-center animate-slide-up z-10" style={{ animationDelay: '0.1s' }}>
          <div className="relative mb-3 flex flex-col items-center">
            {renderRankChange(p1)}
            <div className="absolute -top-7 sm:-top-10 z-20 animate-float text-3xl sm:text-5xl drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]">
              👑
            </div>
            <div className="relative flex h-16 w-16 sm:h-24 sm:w-24 items-center justify-center rounded-full border-4 border-amber-400 bg-[#0c0c1e] shadow-[0_0_30px_rgba(251,191,36,0.4)] z-10 overflow-hidden">
              <img
                src={`/api/roblox/avatar/${encodeURIComponent(p1.player_name)}`}
                alt={p1.player_name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="-mt-4 sm:-mt-5 z-20 text-xl sm:text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">🥇</div>
            <div className="mt-1 text-center">
              <div className="font-bold text-amber-400 text-sm sm:text-lg truncate max-w-[120px] sm:max-w-[160px]">{p1.player_name}</div>
              <div className="text-[10px] sm:text-xs text-amber-200/70">{cleanDivision(p1.division)}</div>
              <div className="mt-1 font-mono text-sm sm:text-base font-black text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]">
                {p1.total_score.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="w-full rounded-t-xl bg-gradient-to-b from-amber-400/40 to-amber-400/5 border-t-2 border-amber-400 backdrop-blur-sm h-32 sm:h-44 flex justify-center pt-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30" />
            <span className="text-4xl font-black text-amber-400 opacity-60">1</span>
          </div>
        </div>
      )}

      {/* 3rd Place */}
      {p3 && (
        <div className="flex w-1/3 max-w-[140px] flex-col items-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="relative mb-3 flex flex-col items-center">
            {renderRankChange(p3)}
            <div className="relative flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full border-4 border-[#cd7f32] bg-[#0c0c1e] shadow-[0_0_20px_rgba(205,127,50,0.3)] z-10 overflow-hidden">
              <img
                src={`/api/roblox/avatar/${encodeURIComponent(p3.player_name)}`}
                alt={p3.player_name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="-mt-3 sm:-mt-3.5 z-20 text-base sm:text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">🥉</div>
            <div className="mt-1 text-center">
              <div className="font-bold text-text-primary text-[10px] sm:text-sm truncate max-w-[100px] sm:max-w-[140px]">{p3.player_name}</div>
              <div className="text-[9px] sm:text-[11px] text-[#cd7f32]">{cleanDivision(p3.division)}</div>
              <div className="mt-1 font-mono text-[10px] sm:text-xs font-black text-[#cd7f32]">
                {p3.total_score.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="w-full rounded-t-xl bg-gradient-to-b from-[#cd7f32]/30 to-[#cd7f32]/5 border-t-2 border-[#cd7f32] backdrop-blur-sm h-20 sm:h-28 flex justify-center pt-2">
            <span className="text-2xl font-black text-[#cd7f32] opacity-50">3</span>
          </div>
        </div>
      )}
    </div>
  );
}
