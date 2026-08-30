'use client';

import { Player } from '@/lib/types';
import PlayerRow from './PlayerRow';
import Podium from './Podium';

interface LeaderboardProps {
  players: Player[];
  isSortedByScore: boolean;
  rankChanges?: Record<string, number>;
  searchQuery?: string;
  onClearSearch?: () => void;
}

export default function Leaderboard({ players, isSortedByScore, rankChanges, searchQuery, onClearSearch }: LeaderboardProps) {
  if (players.length === 0) {
    return (
      <div className="glass-card glow-cyan flex flex-col items-center justify-center px-8 py-20">
        {searchQuery ? (
          <>
            <div className="mb-4 text-5xl">🔍</div>
            <h3 className="mb-2 text-xl font-semibold text-text-primary">
              ไม่พบผู้เล่นที่ตรงกับ &ldquo;{searchQuery}&rdquo;
            </h3>
            <p className="text-center text-text-secondary text-sm mb-6">
              ลองตรวจสอบตัวสะกด หรือค้นหาด้วยชื่ออื่น
            </p>
            {onClearSearch && (
              <button
                onClick={onClearSearch}
                className="flex items-center gap-2 rounded-xl border border-accent-gold/30 bg-accent-gold/5 px-5 py-2.5 text-sm font-bold text-accent-gold transition-all hover:border-accent-gold/60 hover:scale-105 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                ล้างการค้นหา
              </button>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 text-6xl opacity-30">🎮</div>
            <h3 className="mb-2 text-xl font-semibold text-text-primary">
              ไม่พบผู้เล่น
            </h3>
            <p className="text-center text-text-secondary">
              ยังไม่มีข้อมูลผู้เล่นในระบบ หรือไม่พบผู้เล่นที่ตรงกับการค้นหา
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Top 3 Podium (Only show if not searching and sorted by score) */}
      {!searchQuery && isSortedByScore && players.length >= 3 && (
        <Podium topPlayers={players.slice(0, 3)} />
      )}

      {/* Mobile: Card List (shown only below md) */}
      <div className="md:hidden space-y-0">
        <table className="w-full">
          <tbody>
            {players.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={index + 1}
                isSortedByScore={isSortedByScore}
                rankChange={rankChanges ? rankChanges[player.id] : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Desktop: Full Table (shown only at md+) */}
      <div className="hidden md:block glass-card glow-cyan overflow-x-auto">
        <table className="w-full min-w-[700px]">
          {/* Sticky Table Header */}
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-white/10 bg-[#160b0b]/95 backdrop-blur-md">
              <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-text-secondary uppercase">
                {isSortedByScore ? 'อันดับ' : 'ลำดับ'}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-text-secondary uppercase">
                ชื่อผู้เล่น
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-text-secondary uppercase">
                ตำแหน่ง
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-text-secondary uppercase">
                กอง
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold tracking-wider text-text-secondary uppercase">
                คะแนนรวม
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {players.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={index + 1}
                isSortedByScore={isSortedByScore}
                rankChange={rankChanges ? rankChanges[player.id] : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
