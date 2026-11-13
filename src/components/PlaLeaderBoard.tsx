'use client';

import { Player } from '@/lib/types';
import { RobloxProfileLink } from './RobloxProfileLink';

interface PlaLeaderBoardProps {
  players: Player[];
}

function isPlaLeader(position: string | null | undefined): boolean {
  if (!position) return false;
  return (
    position.includes('ปลัด') ||
    position === 'พระยามหาเสือ' ||
    position === 'พระยาอัครอารักษ์' ||
    position === 'พระยาอาทมาตราชภักดี'
  );
}

export default function PlaLeaderBoard({ players }: PlaLeaderBoardProps) {
  const leaders = players
    .filter((p) => isPlaLeader(p.position))
    .sort((a, b) => b.total_score - a.total_score);

  if (leaders.length === 0) return null;

  return (
    <section className="mb-12 w-full animate-slide-up" style={{ animationDelay: '0.1s' }}>
      {/* Section Header */}
      <div className="mb-6 flex items-center justify-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-400/30 shadow-[0_0_15px_rgba(14,165,233,0.2)]">
          <span className="text-xl">⚔️</span>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-sky-300 via-sky-400 to-sky-300 bg-clip-text text-transparent filter drop-shadow-[0_1px_5px_rgba(14,165,233,0.3)]">
            หัวหน้าปลัดราชวัลลภ
          </h2>
          <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary mt-0.5">
            Chief of the Royal Guard
          </p>
        </div>
      </div>

      {/* Grid of Chief Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 justify-center max-w-5xl mx-auto">
        {leaders.map((player, index) => {
          const isTop = index === 0;

          return (
            <div
              key={player.id}
              className={`glass-card p-5 relative overflow-hidden transition-all duration-300 hover:scale-105 flex flex-col justify-between
                ${
                  isTop
                    ? 'border-sky-400/30 bg-sky-500/5 shadow-[0_0_20px_rgba(14,165,233,0.1)] col-span-1 sm:col-span-2 md:col-span-2 max-w-md mx-auto w-full'
                    : 'border-white/5 bg-white/[0.01] hover:border-sky-400/20'
                }`}
            >
              {/* Top Decorative Line */}
              <div className={`absolute top-0 left-0 w-full h-[2px] ${isTop ? 'bg-gradient-to-r from-transparent via-sky-400 to-transparent' : 'bg-gradient-to-r from-transparent via-sky-500/50 to-transparent'}`} />

              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 truncate">
                  {/* Roblox Avatar */}
                  <div className={`relative h-12 w-12 rounded-full overflow-hidden border bg-white/5 flex-shrink-0 ${
                    isTop ? 'border-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.3)]' : 'border-white/10'
                  }`}>
                    <img
                      src={`/api/roblox/avatar/${encodeURIComponent(player.player_name)}`}
                      alt={player.player_name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="truncate">
                    {/* Roblox Name */}
                    <RobloxProfileLink
                      playerName={player.player_name}
                      className="font-mono text-base font-bold text-text-primary truncate hover:text-sky-400 transition-colors"
                    >
                      {player.player_name}
                    </RobloxProfileLink>

                    {/* Position Badge */}
                    <p className={`text-xs font-semibold mt-1 ${isTop ? 'text-sky-400' : 'text-sky-300/80'}`}>
                      {player.position}
                    </p>
                  </div>
                </div>

                {/* Rank Stamp */}
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm select-none flex-shrink-0
                  ${isTop ? 'bg-sky-400/15 text-sky-400 border border-sky-400/20' : 'bg-white/5 text-text-secondary'}`}
                >
                  {isTop ? '🎖️' : `0${index + 1}`}
                </div>
              </div>

              {/* Bottom Row - Score */}
              <div className="mt-4 border-t border-white/5 pt-3 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary/60">
                  แต้มผลงานกิจกรรม
                </span>

                <span className="font-mono text-base font-black text-sky-400 flex items-center gap-1">
                  <span className="text-xs font-medium text-text-secondary/80">แต้ม</span>
                  {player.total_score.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
