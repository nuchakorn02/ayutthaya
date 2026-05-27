'use client';

import { TopIncrease } from '@/lib/types';

interface TopIncreaseCardProps {
  data: TopIncrease | null;
  division: string;
}

const divisionAccents: Record<string, { glow: string; text: string; border: string; bg: string }> = {
  'กองทัพธรณินพิทักษ์': { glow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]', text: 'text-purple-400', border: 'border-purple-500/20', bg: 'from-purple-500/10' },
  'กองทัพมหาเสือพิทักษ์': { glow: 'hover:shadow-[0_0_30px_rgba(217,119,6,0.2)]', text: 'text-amber-500', border: 'border-amber-500/20', bg: 'from-amber-500/10' },
  'กองทัพอาทมาต': { glow: 'hover:shadow-[0_0_30px_rgba(148,163,184,0.15)]', text: 'text-slate-400', border: 'border-slate-500/20', bg: 'from-slate-500/10' },
  'กองพระตำรวจหลวง': { glow: 'hover:shadow-[0_0_30px_rgba(217,119,6,0.2)]', text: 'text-amber-500', border: 'border-amber-500/20', bg: 'from-amber-500/10' },
  'กองทัพที่ 1 ปัญจะซันยะ': { glow: 'hover:shadow-[0_0_30px_rgba(148,163,184,0.15)]', text: 'text-slate-300', border: 'border-slate-400/20', bg: 'from-slate-400/10' },
  'กองทัพที่ 2 วัชรนาถ': { glow: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]', text: 'text-rose-400', border: 'border-rose-500/20', bg: 'from-rose-500/10' },
  'กองทัพที่ 3 ปุณฑริก': { glow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]', text: 'text-purple-400', border: 'border-purple-500/20', bg: 'from-purple-500/10' },
  'กองทัพที่ 4 เกาโมทก': { glow: 'hover:shadow-[0_0_30px_rgba(14,165,233,0.2)]', text: 'text-sky-400', border: 'border-sky-500/20', bg: 'from-sky-500/10' },
};

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function TopIncreaseCard({ data, division }: TopIncreaseCardProps) {
  const accent = divisionAccents[division] || divisionAccents['กองทัพธรณินพิทักษ์'];

  return (
    <div
      className={`glass-card group relative overflow-hidden p-6 transition-all duration-300
        hover:scale-[1.02] ${accent.glow} ${accent.border}`}
    >
      {/* Division watermark */}
      <div
        className={`absolute -right-4 -top-8 text-7xl font-black opacity-[0.04] whitespace-nowrap ${accent.text}`}
      >
        {division}
      </div>

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${accent.text}`}>
          {division}
        </h3>
        <div className={`h-2 w-2 rounded-full ${accent.text} bg-current animate-pulse-glow`} />
      </div>

      {data ? (
        <div className="relative z-10 space-y-3">
          {/* Player Name */}
          <p className="text-lg font-bold text-text-primary">
            {data.player_name}
          </p>

          {/* Score Increase */}
          <div className="flex items-center gap-2">
            {/* Up Arrow */}
            <svg
              className={`h-5 w-5 ${accent.text}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className={`font-mono text-2xl font-black ${accent.text}`}>
              +{data.score_increase.toLocaleString()}
            </span>
          </div>

          {/* Last Updated */}
          <p className="text-xs text-text-secondary">
            อัปเดตล่าสุด: {formatDate(data.last_updated)}
          </p>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center py-4">
          <p className="text-sm text-text-secondary/60">ไม่มีข้อมูล</p>
        </div>
      )}

      {/* Bottom gradient accent */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${accent.bg} to-transparent
          opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
      />
    </div>
  );
}
