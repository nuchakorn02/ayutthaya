'use client';

import { useState, useEffect } from 'react';
import { Player, ScoreHistory } from '@/lib/types';
import AnimatedCounter from '@/components/AnimatedCounter';

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

  const isPolice = division === 'กองพระตำรวจหลวง';

  if (score >= 600) return isPolice ? 'พันตำรวจหลวง | Royal Police Colonel' : 'นายพันเวร | Battalion Commander of Guardsmen';
  if (score >= 315) return isPolice ? 'นายกองตำรวจหลวง | Royal Police Battalion Commander' : 'นายกองเวร | Company Head Guardsmen';
  if (score >= 210) return isPolice ? 'นายหมวดตำรวจหลวง | Royal Police Platoon Officer' : 'นายหมวดเวร | Platoon Head Guardsmen';
  if (score >= 110) return isPolice ? 'นายหมู่ตำรวจหลวง | Royal Police Squad Leader' : 'นายหมู่เวร | Squad Head Guardsmen';
  if (score >= 60) return isPolice ? 'พลตำรวจหลวงอาวุโส | Senior Royal Police Trooper' : 'พลทหารยามอาวุโส | Senior Guardsmen';
  if (score >= 45) return isPolice ? 'พลตำรวจหลวงพิเศษ | Senior Royal Police Special Royal Police Trooper' : 'พลทหารราชวัลลภพิเศษ | Royal Elite Guardsmen';
  if (score >= 20) return isPolice ? 'พลประจำการตำรวจหลวง | Active Royal Police Trooper' : 'พลทหารยาม | Guardsmen';
  return isPolice ? 'พลตำรวจหลวง สายขาว | Royal Police Trooper (White Line)' : 'พลอาสาสมัครทหารยาม | Junior Guardsmen';
}

function getDisplayPosition(position: string | undefined, score: number, division: string): string {
  const basePos = position || calculateDefaultPosition(score, division);
  if (division === 'กองพระตำรวจหลวง' && basePos) {
    if (basePos.includes('ครูฝึกทหารราชองครักษ์') || basePos.includes('Drill Master of the Royal Guards')) {
      return 'ครูฝึกตำรวจหลวง สายทอง | Royal Police Instructor (Golden Line)';
    }
    if (basePos.startsWith('นายพันเวร')) return 'พันตำรวจหลวง | Royal Police Colonel';
    if (basePos.startsWith('นายกองเวร')) return 'นายกองตำรวจหลวง | Royal Police Battalion Commander';
    if (basePos.startsWith('นายหมวดเวร')) return 'นายหมวดตำรวจหลวง | Royal Police Platoon Officer';
    if (basePos.startsWith('นายหมู่เวร')) return 'นายหมู่ตำรวจหลวง | Royal Police Squad Leader';
    if (basePos.startsWith('พลทหารยามอาวุโส')) return 'พลตำรวจหลวงอาวุโส | Senior Royal Police Trooper';
    if (basePos.startsWith('พลทหารราชวัลลภพิเศษ')) return 'พลตำรวจหลวงพิเศษ | Senior Royal Police Special Royal Police Trooper';
    if (basePos.startsWith('พลทหารยาม')) return 'พลประจำการตำรวจหลวง | Active Royal Police Trooper';
    if (basePos.startsWith('พลอาสาสมัครทหารยาม')) return 'พลตำรวจหลวง สายขาว | Royal Police Trooper (White Line)';
  }
  return basePos;
}

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState<ScoreHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const displayPosition = getDisplayPosition(player.position, player.total_score, player.division);

  const rankInfo = isSortedByScore
    ? getRankDisplay(rank)
    : {
        emoji: null,
        glowClass: '',
        textClass: 'text-text-primary font-medium',
        rankBg: 'bg-white/5 border border-white/5',
      };

  const divColor = divisionColors[player.division] || divisionColors['กองทัพธรณินพิทักษ์'];

  useEffect(() => {
    if (isExpanded && !hasLoaded) {
      setLoading(true);
      fetch(`/api/players/${player.id}/history`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData.data) {
            setHistory(resData.data);
          }
          setHasLoaded(true);
        })
        .catch((err) => console.error('Error fetching player history:', err))
        .finally(() => setLoading(false));
    }
  }, [isExpanded, player.id, hasLoaded]);

  const drawScoreChart = () => {
    const scores = [player.starting_score ?? player.total_score];
    const dates = ['เริ่มแรก'];

    history.forEach((h) => {
      scores.push(h.new_score);
      const d = new Date(h.updated_at);
      dates.push(d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' }));
    });

    if (scores.length <= 1) {
      scores.push(player.total_score);
      dates.push('ปัจจุบัน');
    }

    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min === 0 ? 10 : max - min;
    const pad = 20;
    const width = 450;
    const height = 110;

    const points = scores.map((val, idx) => {
      const x = pad + (idx * (width - 2 * pad)) / (scores.length - 1);
      const y = height - pad - ((val - min) * (height - 2 * pad)) / range;
      return { x, y, val, date: dates[idx] };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`;

    return (
      <div className="flex flex-col items-center w-full max-w-md mx-auto py-2">
        <p className="text-[9px] uppercase tracking-widest font-black text-accent-gold mb-3 animate-pulse">
          📈 ประวัติคะแนนสะสมย้อนหลัง
        </p>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id={`grad-${player.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(251, 191, 36, 0.25)" />
              <stop offset="100%" stopColor="rgba(251, 191, 36, 0)" />
            </linearGradient>
          </defs>

          {/* Horizontal lines */}
          <line x1={pad} y1={pad} x2={width - pad} y2={pad} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
          <line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
          <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

          {/* Fill Area */}
          <path d={areaD} fill={`url(#grad-${player.id})`} />

          {/* Outline path */}
          <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

          {/* Points */}
          {points.map((p, idx) => (
            <g key={idx} className="group/dot">
              <circle cx={p.x} cy={p.y} r={3.5} fill="#0a0a1a" stroke="#fbbf24" strokeWidth={2} className="transition-all duration-300 group-hover/dot:r-5" />
              <text x={p.x} y={p.y - 8} textAnchor="middle" className="font-mono text-[9px] font-bold fill-amber-300">
                {p.val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </text>
              <text x={p.x} y={height - 2} textAnchor="middle" className="text-[8px] font-medium fill-text-secondary">
                {p.date}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Row */}
      <tr
        onClick={() => setIsExpanded(!isExpanded)}
        className={`player-row hidden border-b border-white/5 md:table-row cursor-pointer select-none transition-all duration-300 ${
          isExpanded ? 'bg-white/[0.02] border-l-4 border-l-accent-gold' : ''
        } ${rankInfo.glowClass}`}
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
          <div className="flex items-center gap-3">
            {/* Roblox Avatar */}
            <div className={`relative h-8 w-8 rounded-full overflow-hidden border bg-white/5 flex-shrink-0 ${
              isSortedByScore && rank === 1 ? 'border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' :
              isSortedByScore && rank === 2 ? 'border-gray-300 shadow-[0_0_6px_rgba(209,213,219,0.3)]' :
              isSortedByScore && rank === 3 ? 'border-amber-700 shadow-[0_0_6px_rgba(205,127,50,0.3)]' :
              'border-white/10'
            }`}>
              <img
                src={`/api/roblox/avatar/${encodeURIComponent(player.player_name)}`}
                alt={player.player_name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <span className={`${(isSortedByScore && rank <= 3) ? rankInfo.textClass : 'text-text-primary font-medium'}`}>
              {player.player_name}
            </span>
          </div>
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
            <AnimatedCounter value={player.total_score} />
          </span>
        </td>
      </tr>

      {/* Expanded Chart (Desktop) */}
      {isExpanded && (
        <tr className="hidden md:table-row bg-white/[0.01]">
          <td colSpan={5} className="px-6 py-4 border-b border-white/5">
            {loading ? (
              <div className="flex justify-center items-center py-4 text-xs text-text-secondary gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
                กำลังโหลดประวัติคะแนน...
              </div>
            ) : history.length === 0 && hasLoaded ? (
              <p className="text-center text-xs text-text-secondary py-4">ไม่มีประวัติการอัปเดตแต้มของทหารรายนี้</p>
            ) : (
              drawScoreChart()
            )}
          </td>
        </tr>
      )}

      {/* Mobile Card */}
      <tr className="md:hidden">
        <td colSpan={5}>
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className={`glass-card mx-2 mb-3 p-4 border border-white/5 cursor-pointer select-none transition-all duration-300 ${
              isExpanded ? 'border-accent-gold/40 bg-white/[0.04]' : ''
            } ${rankInfo.glowClass}`}
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

                {/* Roblox Avatar (Mobile) */}
                <div className={`relative h-9 w-9 rounded-full overflow-hidden border bg-white/5 flex-shrink-0 ${
                  isSortedByScore && rank === 1 ? 'border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' :
                  isSortedByScore && rank === 2 ? 'border-gray-300 shadow-[0_0_6px_rgba(209,213,219,0.3)]' :
                  isSortedByScore && rank === 3 ? 'border-amber-700 shadow-[0_0_6px_rgba(205,127,50,0.3)]' :
                  'border-white/10'
                }`}>
                  <img
                    src={`/api/roblox/avatar/${encodeURIComponent(player.player_name)}`}
                    alt={player.player_name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
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
                  <AnimatedCounter value={player.total_score} />
                </p>
              </div>
            </div>

            {/* Expanded Chart (Mobile) */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                {loading ? (
                  <div className="flex justify-center items-center py-2 text-xs text-text-secondary gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
                    กำลังโหลดประวัติคะแนน...
                  </div>
                ) : history.length === 0 && hasLoaded ? (
                  <p className="text-center text-xs text-text-secondary py-2">ไม่มีประวัติการอัปเดตแต้ม</p>
                ) : (
                  drawScoreChart()
                )}
              </div>
            )}
          </div>
        </td>
      </tr>
    </>
  );
}
