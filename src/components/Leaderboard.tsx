'use client';

import { Player } from '@/lib/types';
import PlayerRow from './PlayerRow';

interface LeaderboardProps {
  players: Player[];
  isSortedByScore: boolean;
  rankChanges?: Record<string, number>;
}

export default function Leaderboard({ players, isSortedByScore, rankChanges }: LeaderboardProps) {
  if (players.length === 0) {
    return (
      <div className="glass-card glow-cyan flex flex-col items-center justify-center px-8 py-20">
        <div className="mb-4 text-6xl opacity-30">🎮</div>
        <h3 className="mb-2 text-xl font-semibold text-text-primary">
          ไม่พบผู้เล่น
        </h3>
        <p className="text-center text-text-secondary">
          ยังไม่มีข้อมูลผู้เล่นในระบบ หรือไม่พบผู้เล่นที่ตรงกับการค้นหา
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card glow-cyan overflow-x-auto">
      <table className="w-full min-w-[700px]">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02]">
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
  );
}
