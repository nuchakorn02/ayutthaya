'use client';

import { useState, useEffect } from 'react';
import { Player, ScoreHistory, RankThreshold } from '@/lib/types';
import AnimatedCounter from '@/components/AnimatedCounter';
import { calculateDefaultPosition, getDisplayPosition, getRankProgression } from '@/lib/positionUtils';
import { DIVISION_COLORS } from '@/lib/constants';


/** Small sub-component so each chart dot can manage its own hover state without violating Rules of Hooks */
function ChartDot({ cx, cy, val, date, chartHeight }: { cx: number; cy: number; val: number; date: string; chartHeight: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible larger hit area */}
      <circle cx={cx} cy={cy} r={10} fill="transparent" />
      <circle
        cx={cx}
        cy={cy}
        r={hovered ? 5.5 : 3.5}
        fill={hovered ? '#fbbf24' : '#0a0a1a'}
        stroke="#fbbf24"
        strokeWidth={2}
        style={{ transition: 'r 0.2s ease, fill 0.2s ease' }}
      />
      <text x={cx} y={cy - 8} textAnchor="middle" className="font-mono text-[9px] font-bold fill-amber-300">
        {val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
      </text>
      <text x={cx} y={chartHeight - 2} textAnchor="middle" className="text-[8px] font-medium fill-text-secondary">
        {date}
      </text>
    </g>
  );
}

interface PlayerRowProps {
  player: Player;
  rank: number;
  isSortedByScore: boolean;
  rankChange?: number;
  thresholds?: RankThreshold[];
}


const divisionColors = DIVISION_COLORS;

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

export default function PlayerRow({ player, rank, isSortedByScore, rankChange, thresholds }: PlayerRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState<ScoreHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const displayPosition = getDisplayPosition(player.position, player.total_score, player.division, thresholds);

  const rankInfo = isSortedByScore
    ? getRankDisplay(rank)
    : {
        emoji: null,
        glowClass: '',
        textClass: 'text-text-primary font-medium',
        rankBg: 'bg-white/5 border border-white/5',
      };

  const divColor = divisionColors[player.division] || divisionColors['กองทัพธรณินพิทักษ์'];

  // Reset history state whenever the player changes (prevents stale cache between rows)
  useEffect(() => {
    setHistory([]);
    setHasLoaded(false);
    setIsExpanded(false);
  }, [player.id]);

  useEffect(() => {
    if (isExpanded && !hasLoaded) {
      setLoading(true);
      fetch(`/api/players/${player.id}/history`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData.data) {
            setHistory(resData.data);
          } else {
            setHistory([]);
          }
          setHasLoaded(true);
        })
        .catch((err) => {
          console.error('Error fetching player history:', err);
          setHasLoaded(true); // mark as loaded even on error so we show empty state
        })
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

          {/* Points — each dot is its own component to safely use useState for hover */}
          {points.map((p, idx) => (
            <ChartDot key={idx} cx={p.x} cy={p.y} val={p.val} date={p.date} chartHeight={height} />
          ))}

        </svg>
      </div>
    );
  };

  const drawActivityHistory = () => {
    // Show updates, newest first
    const reversedHistory = [...history].reverse();

    return (
      <div className="mt-4 w-full max-w-md mx-auto">
        <p className="text-[9px] uppercase tracking-widest font-black text-accent-gold mb-3 text-center">
          📜 บันทึกเหตุผลการปรับปรุงคะแนน
        </p>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {reversedHistory.map((h, idx) => {
            const dateStr = new Date(h.updated_at).toLocaleString('th-TH', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });
            const diffSign = h.score_diff > 0 ? `+${h.score_diff}` : `${h.score_diff}`;
            const diffColor = h.score_diff > 0 ? 'text-green-400' : 'text-red-400';

            return (
              <div
                key={h.id || idx}
                className="flex flex-col p-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 text-left"
              >
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-text-secondary font-mono">{dateStr}</span>
                  <span className={`font-mono font-bold ${diffColor}`}>
                    {diffSign} แต้ม ({h.old_score} ➔ {h.new_score})
                  </span>
                </div>
                <p className="text-xs text-text-primary mt-1 font-medium pl-1 border-l-2 border-accent-gold/50">
                  {h.reason || <span className="text-text-secondary/50 italic font-normal">ไม่มีระบุเหตุผล (การนำเข้าไฟล์หรือการปรับปรุงทั่วไป)</span>}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const drawNextRankProgress = () => {
    const progression = getRankProgression(player.total_score, player.division, thresholds);

    if (progression.isSpecialDivision) {
      return (
        <div className="mt-4 p-4 rounded-xl border border-accent-gold/20 bg-accent-gold/5 text-center w-full max-w-md mx-auto">
          <p className="text-xs font-bold text-accent-gold uppercase tracking-wider">🏅 กองพิเศษ — ไม่ใช้ระบบยศตามคะแนน</p>
          <p className="text-[10px] text-text-secondary mt-1">
            กองนี้มีตำแหน่งพิเศษเฉพาะสังกัด คะแนนปัจจุบัน: <span className="font-mono font-bold text-accent-gold-glowing">{player.total_score.toLocaleString()}</span> แต้ม
          </p>
        </div>
      );
    }

    if (progression.isMaxRank) {
      return (
        <div className="mt-4 p-4 rounded-xl border border-accent-gold/20 bg-accent-gold/5 text-center w-full max-w-md mx-auto">
          <p className="text-xs font-bold text-accent-gold uppercase tracking-wider">🏆 บรรลุระดับยศสูงสุดทางคะแนนแล้ว 🏆</p>
          <p className="text-[10px] text-text-secondary mt-1">
            คะแนนปัจจุบัน: <span className="font-mono font-bold text-accent-gold-glowing">{player.total_score}</span> แต้ม (ระดับผู้บัญชาการทหารอาวุโส)
          </p>
        </div>
      );
    }

    const {
      nextRankName,
      pointsNeeded = 0,
      percentage = 0,
      currentMilestoneScore = 0,
      nextMilestoneScore = 0,
    } = progression;

    return (
      <div className="mt-4 p-4 rounded-xl border border-white/5 bg-white/[0.01] w-full max-w-md mx-auto">
        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
          <span className="text-text-secondary">ยศถัดไป: <span className="text-accent-gold font-bold">{nextRankName}</span></span>
          <span className="text-text-secondary/70 font-mono">อีก {pointsNeeded.toFixed(2).replace(/\.00$/, '')} แต้ม</span>
        </div>
        
        {/* Progress Bar */}
        <div className="relative w-full h-3 bg-white/5 border border-white/5 rounded-full overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-gold to-amber-500 shadow-[0_0_8px_#d4af37] transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-text-secondary/50 mt-1.5 font-mono">
          <span>{currentMilestoneScore} แต้ม</span>
          <span className="text-accent-gold font-bold">{percentage.toFixed(0)}% ({player.total_score.toFixed(2).replace(/\.00$/, '')} / {nextMilestoneScore} แต้ม)</span>
          <span>{nextMilestoneScore} แต้ม</span>
        </div>
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
          <div className="relative inline-flex">
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

            {/* Score Change Badge — floats over corner of rank box */}
            {isSortedByScore && rankChange !== undefined && rankChange !== 0 && (
              <span
                title={`${rankChange > 0 ? 'ขึ้น' : 'ลง'} ${Math.abs(rankChange)} อันดับ จากการอัปเดตล่าสุด`}
                className={`absolute -top-1.5 -right-1.5 inline-flex items-center justify-center text-[8px] font-black h-5 px-1.5 min-w-5 rounded-full border border-[#0a0a1a] ${
                rankChange > 0
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
                {rankChange > 0 ? '▲' : '▼'}{Math.abs(rankChange)}
              </span>
            )}
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
            {/* Badges */}
            <div className="flex gap-1.5 ml-2 flex-shrink-0">
              {player.total_score >= 500 && (
                <span className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)] select-none whitespace-nowrap" title="ทหารอาวุโส (มีแต้มสะสมตั้งแต่ 500 แต้มขึ้นไป)">
                  🎖️ Veteran
                </span>
              )}
              {player.latest_change !== undefined && player.latest_change > 30 && (
                <span className="inline-flex items-center rounded bg-green-500/10 px-1.5 py-0.5 text-[9px] font-bold text-green-400 border border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.1)] select-none whitespace-nowrap" title="Active (มีแต้มเพิ่มขึ้นเกิน 30 แต้มในการอัปเดตล่าสุด)">
                  🔥 Active
                </span>
              )}
            </div>
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
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <p className="text-center text-xs text-text-secondary">ไม่มีประวัติการอัปเดตแต้มของทหารรายนี้</p>
                {drawNextRankProgress()}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4">
                {drawScoreChart()}
                {drawActivityHistory()}
                {drawNextRankProgress()}
              </div>
            )}
          </td>
        </tr>
      )}

      {/* Mobile Card */}
      <tr className="md:hidden">
        <td colSpan={5}>
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className={`glass-card mx-2 mb-3 p-4 border border-white/5 cursor-pointer select-none transition-all duration-300 animate-slide-up opacity-0 ${
              isExpanded ? 'border-accent-gold/40 bg-white/[0.04]' : ''
            } ${rankInfo.glowClass}`}
            style={{ animationDelay: `${Math.min((rank - 1) * 0.05, 1)}s`, animationFillMode: 'forwards' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                <div className="relative">
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
                  {/* Rank Change Indicator Badge (Mobile) */}
                  {isSortedByScore && rankChange !== undefined && rankChange !== 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 inline-flex items-center justify-center text-[8px] font-black h-5 px-1.5 min-w-5 rounded-full border border-[#0a0a1a] ${
                      rankChange > 0 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {rankChange > 0 ? '▲' : '▼'}{Math.abs(rankChange)}
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
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p
                      className={`font-semibold ${
                        (isSortedByScore && rank <= 3) ? rankInfo.textClass : 'text-text-primary'
                      }`}
                    >
                      {player.player_name}
                    </p>
                    {/* Badges (Mobile) */}
                    {player.total_score >= 500 && (
                      <span className="inline-flex items-center rounded bg-amber-500/10 px-1 py-0.5 text-[8px] font-bold text-amber-400 border border-amber-500/20 whitespace-nowrap select-none">
                        🎖️ Veteran
                      </span>
                    )}
                    {player.latest_change !== undefined && player.latest_change > 30 && (
                      <span className="inline-flex items-center rounded bg-green-500/10 px-1 py-0.5 text-[8px] font-bold text-green-400 border border-green-500/20 whitespace-nowrap select-none">
                        🔥 Active
                      </span>
                    )}
                  </div>
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
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-center text-xs text-text-secondary py-2">ไม่มีประวัติการอัปเดตแต้ม</p>
                    {drawNextRankProgress()}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    {drawScoreChart()}
                    {drawActivityHistory()}
                    {drawNextRankProgress()}
                  </div>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>
    </>
  );
}
