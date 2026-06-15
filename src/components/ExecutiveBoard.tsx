'use client';

import { Player } from '@/lib/types';

interface ExecutiveBoardProps {
  players: Player[];
}

export default function ExecutiveBoard({ players }: ExecutiveBoardProps) {
  if (players.length === 0) return null;

  // Sort players by created_at ascending to strictly respect Excel row sequence
  const sortedPlayers = [...players].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Helper to determine if we should show score
  const shouldShowScore = (position: string | null | undefined) => {
    if (!position) return false;
    // Show score if position contains 'ผู้ช่วย' (Assistant)
    return position.includes('ผู้ช่วย');
  };

  return (
    <section className="mb-12 w-full animate-slide-up" style={{ animationDelay: '0.05s' }}>
      {/* Section Header */}
      <div className="mb-6 flex items-center justify-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gold/15 border border-accent-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
          <span className="text-xl">👑</span>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-accent-gold via-accent-gold-glowing to-accent-gold bg-clip-text text-transparent filter drop-shadow-[0_1px_5px_rgba(212,175,55,0.3)]">
            คณะผู้บริหารสูงสุด
          </h2>
          <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary mt-0.5">
            Executive Command Board
          </p>
        </div>
      </div>

      {/* Grid of Executive Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 justify-center max-w-4xl mx-auto">
        {sortedPlayers.map((player, index) => {
          const showScore = shouldShowScore(player.position);
          const isChief = player.position?.includes('เจ้ากรม') && !player.position?.includes('รอง') && !player.position?.includes('ผู้ช่วย');
          
          return (
            <div
              key={player.id}
              className={`glass-card p-5 relative overflow-hidden transition-all duration-300 hover:scale-105 flex flex-col justify-between
                ${
                  isChief 
                    ? 'border-accent-gold/30 bg-accent-gold/5 shadow-[0_0_20px_rgba(212,175,55,0.1)] col-span-1 sm:col-span-2 md:col-span-3 max-w-md mx-auto w-full'
                    : 'border-white/5 bg-white/[0.01] hover:border-accent-gold/20'
                }`}
            >
              {/* Top Decorative Line */}
              <div className={`absolute top-0 left-0 w-full h-[2px] ${isChief ? 'bg-gradient-to-r from-transparent via-accent-gold to-transparent' : 'bg-gradient-to-r from-transparent via-purple-500/50 to-transparent'}`} />

              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="truncate">
                  {/* Roblox Name */}
                  <h3 className="font-mono text-base font-bold text-text-primary truncate">
                    {player.player_name}
                  </h3>
                  
                  {/* Position Badge */}
                  <p className={`text-xs font-semibold mt-1 ${isChief ? 'text-accent-gold' : 'text-purple-300'}`}>
                    {player.position || 'คณะผู้บริหารส่วนกลาง'}
                  </p>
                </div>

                {/* Avatar Rank Stamp */}
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm select-none
                  ${isChief ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/20' : 'bg-white/5 text-text-secondary'}`}
                >
                  {isChief ? '🎖️' : `0${index + 1}`}
                </div>
              </div>

              {/* Bottom Row - Score or Honor Tag */}
              <div className="mt-4 border-t border-white/5 pt-3 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary/60">
                  {showScore ? 'แต้มผลงานกิจกรรม' : 'สถานะการประเมิน'}
                </span>

                {showScore ? (
                  <span className="font-mono text-base font-black text-accent-gold flex items-center gap-1">
                    <span className="text-xs font-medium text-text-secondary/80">แต้ม</span>
                    {player.total_score.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider
                    ${
                      isChief
                        ? 'text-accent-gold bg-accent-gold/10 border-accent-gold/20'
                        : 'text-purple-300 bg-purple-500/10 border-purple-500/25'
                    }`}
                  >
                    {isChief ? '👑 บัญชาการสูงสุด' : '✨ บอร์ดเกียรติยศ'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
