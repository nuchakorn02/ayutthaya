'use client';

import { Player } from '@/lib/types';

interface PlayerRowProps {
  player: Player;
  rank: number;
  isSortedByScore: boolean;
}

function calculateDefaultPosition(score: number, division: string): string {
  if (division === 'กองทัพมหาเสือพิทักษ์') {
    return 'ทหารเสือประจำพระองค์';
  }
  if (division === 'กองทัพธรณินพิทักษ์') {
    return 'ทหารธรณินพิทักษ์';
  }
  if (division === 'กองทัพอาทมาต') {
    return 'หมื่นอาทมาต';
  }

  if (score >= 600) return 'นายพันเวร | Battalion Commander of Guardsmen';
  if (score >= 315) return 'นายกองเวร | Company Head Guardsmen';
  if (score >= 210) return 'นายหมวดเวร | Platoon Head Guardsmen';
  if (score >= 110) return 'นายหมู่เวร | Squad Head Guardsmen';
  if (score >= 60) return 'พลทหารยามอาวุโส | Senior Guardsmen';
  if (score >= 45) return 'พลทหารราชวัลลภพิเศษ | Royal Elite Guardsmen';
  if (score >= 20) return 'พลทหารยาม | Guardsmen';
  return 'พลอาสาสมัครทหารยาม | Junior Guardsmen';
}

// Traditional Thai color palettes for the 8 divisions based on Image 1
const divisionColors: Record<string, { bg: string; text: string; border: string }> = {
  'กองทัพธรณินพิทักษ์': { bg: 'bg-violet-600/15', text: 'text-violet-400', border: 'border-violet-500/30' },
  'กองทัพมหาเสือพิทักษ์': { bg: 'bg-amber-800/15', text: 'text-amber-500', border: 'border-amber-700/30 shadow-[0_0_8px_rgba(217,119,6,0.15)]' },
  'กองทัพอาทมาต': { bg: 'bg-zinc-800/20', text: 'text-zinc-400', border: 'border-zinc-700/30' },
  'กองพระตำรวจหลวง': { bg: 'bg-amber-800/15', text: 'text-amber-500', border: 'border-amber-700/30 shadow-[0_0_8px_rgba(217,119,6,0.15)]' },
  'กองทัพที่ 1 ปัญจะซันยะ': { bg: 'bg-slate-400/15', text: 'text-slate-300', border: 'border-slate-500/30' },
  'กองทัพที่ 2 วัชรนาถ': { bg: 'bg-rose-600/15', text: 'text-rose-400', border: 'border-rose-500/30 shadow-[0_0_8px_rgba(225,29,72,0.15)]' },
  'กองทัพที่ 3 ปุณฑริก': { bg: 'bg-violet-600/15', text: 'text-violet-400', border: 'border-violet-500/30' },
  'กองทัพที่ 4 เกาโมทก': { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30 shadow-[0_0_8px_rgba(14,165,233,0.15)]' },
};

function getRankDisplay(rank: number) {
  switch (rank) {
    case 1:
      return {
        emoji: '👑',
        glowClass: 'glow-gold border-gold-royal',
        textClass: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent font-black text-xl filter drop-shadow-[0_1px_3px_rgba(212,175,55,0.4)]',
        rankBg: 'bg-gradient-to-br from-yellow-400/30 to-amber-600/30 border border-accent-gold shadow-[0_0_12px_rgba(212,175,55,0.35)]',
      };
    case 2:
      return {
        emoji: '🥈',
        glowClass: 'border-white/20',
        textClass: 'text-gray-200 font-bold text-lg',
        rankBg: 'bg-gradient-to-br from-gray-300/15 to-gray-500/15 border border-gray-400/30 shadow-[0_0_8px_rgba(209,213,219,0.2)]',
      };
    case 3:
      return {
        emoji: '🥉',
        glowClass: 'border-orange-500/20',
        textClass: 'text-amber-600 font-bold text-lg',
        rankBg: 'bg-gradient-to-br from-orange-400/15 to-amber-700/15 border border-orange-400/30 shadow-[0_0_8px_rgba(205,127,50,0.2)]',
      };
    default:
      return {
        emoji: null,
        glowClass: '',
        textClass: 'text-text-secondary font-medium',
        rankBg: 'bg-white/5 border border-white/5',
      };
  }
}

export default function PlayerRow({ player, rank, isSortedByScore }: PlayerRowProps) {
  const displayPosition = player.position || calculateDefaultPosition(player.total_score, player.division);

  const rankInfo = isSortedByScore
    ? getRankDisplay(rank)
    : {
        emoji: null,
        glowClass: '',
        textClass: 'text-text-primary font-medium',
        rankBg: 'bg-white/5 border border-white/5',
      };

  const divColor = divisionColors[player.division] || divisionColors['กองทัพธรณินพิทักษ์'];

  return (
    <>
      {/* Desktop Row */}
      <tr
        className={`player-row hidden border-b border-white/5 md:table-row ${rankInfo.glowClass}`}
      >
        {/* Rank */}
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${rankInfo.rankBg}`}
            >
              {rankInfo.emoji ? (
                <span className="text-lg">{rankInfo.emoji}</span>
              ) : (
                <span className="text-sm font-semibold text-accent-gold">
                  {rank}
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Player Name */}
        <td className="px-6 py-4">
          <span className={`${(isSortedByScore && rank <= 3) ? rankInfo.textClass : 'text-text-primary font-medium'}`}>
            {player.player_name}
          </span>
        </td>

        {/* Position */}
        <td className="px-6 py-4">
          <span className={`text-xs font-semibold ${
            (displayPosition?.includes('ปลัด') || displayPosition === 'พระยามหาเสือ' || displayPosition === 'พระยาอัครอารักษ์' || displayPosition === 'พระยาอาทมาตราชภักดี')
              ? 'text-accent-gold-glowing font-bold drop-shadow-[0_0_6px_rgba(255,200,55,0.4)]'
              : 'text-text-secondary'
          }`}>
            {displayPosition}
          </span>
        </td>

        {/* Division */}
        <td className="px-6 py-4">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide transition-all duration-300
              ${divColor.bg} ${divColor.text} ${divColor.border}`}
          >
            {player.division}
          </span>
        </td>

        {/* Score */}
        <td className="px-6 py-4 text-right">
          <span
            className={`font-mono text-lg font-bold ${
              isSortedByScore && rank === 1
                ? 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent font-extrabold filter drop-shadow-[0_1px_4px_rgba(212,175,55,0.4)]'
                : isSortedByScore && rank <= 3
                  ? 'text-accent-gold'
                  : 'text-text-primary'
            }`}
          >
            {player.total_score.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        </td>
      </tr>

      {/* Mobile Card */}
      <tr className="md:hidden">
        <td colSpan={4}>
          <div
            className={`glass-card mx-2 mb-3 p-4 border border-white/5 ${rankInfo.glowClass}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${rankInfo.rankBg}`}
                >
                  {rankInfo.emoji ? (
                    <span className="text-xl">{rankInfo.emoji}</span>
                  ) : (
                    <span className="text-base font-bold text-accent-gold">
                      #{rank}
                    </span>
                  )}
                </div>

                <div>
                  <p
                    className={`font-semibold ${
                      (isSortedByScore && rank <= 3) ? rankInfo.textClass : 'text-text-primary'
                    }`}
                  >
                    {player.player_name}
                  </p>
                  <p className={`text-[10px] font-medium mt-0.5 ${
                    (displayPosition?.includes('ปลัด') || displayPosition === 'พระยามหาเสือ' || displayPosition === 'พระยาอัครอารักษ์' || displayPosition === 'พระยาอาทมาตราชภักดี')
                      ? 'text-accent-gold-glowing font-bold'
                      : 'text-text-secondary'
                  }`}>
                    {displayPosition}
                  </p>
                  <span
                    className={`mt-1.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide
                      ${divColor.bg} ${divColor.text} ${divColor.border}`}
                  >
                    {player.division}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">คะแนน</p>
                <p
                  className={`font-mono text-xl font-bold ${
                    isSortedByScore && rank === 1
                      ? 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent font-extrabold filter drop-shadow-[0_1px_4px_rgba(212,175,55,0.45)]'
                      : isSortedByScore && rank <= 3
                        ? 'text-accent-gold'
                        : 'text-text-primary'
                  }`}
                >
                  {player.total_score.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}
