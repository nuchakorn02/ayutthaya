import React from 'react';
import { Player } from '@/lib/types';
import SearchBar from '@/components/SearchBar';
import DivisionFilter from '@/components/DivisionFilter';
import { getDisplayPosition, calculateDefaultPosition } from '@/lib/positionUtils';

interface AdminPlayerManagerProps {
  filteredPlayers: Player[];
  loading: boolean;
  search: string;
  setSearch: (val: string) => void;
  division: string;
  handleDivisionChange: (val: string) => void;
  handleRefreshAll: () => void;
  handleExportExcel: () => void;
  resetDatabase: () => void;
  isResetting: boolean;
  setRankSettingsOpen: (val: boolean) => void;
  setDiscordSettingsOpen: (val: boolean) => void;
  setIsAddModalOpen: (val: boolean) => void;
  handleEditPlayer: (player: Player) => void;
  handleDeletePlayer: (player: Player) => void;
  openHistory: (player: Player) => void;
  rankThresholds: any[];
  divisionCounts: Record<string, number>;
}

export default function AdminPlayerManager({
  filteredPlayers,
  loading,
  search,
  setSearch,
  division,
  handleDivisionChange,
  handleRefreshAll,
  handleExportExcel,
  resetDatabase,
  isResetting,
  setRankSettingsOpen,
  setDiscordSettingsOpen,
  setIsAddModalOpen,
  handleEditPlayer,
  handleDeletePlayer,
  openHistory,
  rankThresholds,
  divisionCounts
}: AdminPlayerManagerProps) {
  return (
    <section className="mb-10 animate-slide-up" style={{ animationDelay: '0.15s' }}>
      {/* Header with Actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-purple/15">
            <svg className="h-4 w-4 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text-primary">จัดการผู้เล่น</h2>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-mono text-text-secondary">
            {filteredPlayers.length} ผู้เล่น
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Refresh All Button */}
          <button
            onClick={handleRefreshAll}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5
              px-4 py-2 text-xs font-bold text-text-secondary tracking-wider uppercase
              transition-all duration-300 hover:border-white/25 hover:bg-white/10
              hover:text-text-primary cursor-pointer disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            รีโหลดข้อมูล
          </button>

          {/* Rank Settings Button */}
          <button
            onClick={() => setRankSettingsOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5
              px-4 py-2 text-xs font-bold text-text-secondary tracking-wider uppercase
              transition-all duration-300 hover:border-white/30 hover:bg-white/10
              hover:text-white cursor-pointer"
          >
            <span>⚙️</span> ตั้งค่าเกณฑ์ยศ
          </button>

          {/* Discord Settings Button */}
          <button
            onClick={() => setDiscordSettingsOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/5
              px-4 py-2 text-xs font-bold text-[#5865F2] tracking-wider uppercase
              transition-all duration-300 hover:border-[#5865F2]/50 hover:bg-[#5865F2]/10
              hover:text-white cursor-pointer"
          >
            <span>🔔</span> ตั้งค่า Discord
          </button>

          {/* Quick Add Player Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5
              px-4 py-2 text-xs font-bold text-accent-cyan tracking-wider uppercase
              transition-all duration-300 hover:border-accent-cyan/50 hover:bg-accent-cyan/10
              hover:shadow-[0_0_15px_rgba(0,240,255,0.1)] cursor-pointer"
          >
            <span>➕</span> เพิ่มทหารรายใหม่
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5
              px-4 py-2 text-xs font-bold text-green-400 tracking-wider uppercase
              transition-all duration-300 hover:border-green-500/50 hover:bg-green-500/10
              hover:shadow-[0_0_15px_rgba(34,197,94,0.1)] cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </button>

          {/* Reset Database Button */}
          <button
            onClick={resetDatabase}
            disabled={isResetting}
            className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5
              px-4 py-2 text-xs font-bold text-red-400 tracking-wider uppercase
              transition-all duration-300 hover:border-red-500/50 hover:bg-red-500/10
              hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] cursor-pointer disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {isResetting ? 'กำลังล้าง...' : 'ล้างฐานข้อมูล'}
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        <SearchBar value={search} onChange={setSearch} />
        <DivisionFilter value={division} onChange={handleDivisionChange} counts={divisionCounts} />
      </div>

      {/* Players Table */}
      <div className="glass-card glow-cyan overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-white/10 bg-[#160b0b]/95 backdrop-blur-md">
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
                คะแนนสะสม
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold tracking-wider text-text-secondary uppercase">
                อัปเดตล่าสุด
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold tracking-wider text-text-secondary uppercase">
                จัดการ
              </th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50' : ''}>
            {filteredPlayers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                  ไม่พบข้อมูลผู้เล่นที่ตรงกับเงื่อนไข
                </td>
              </tr>
            ) : (
              filteredPlayers.map((player) => {
                const finalPosition = getDisplayPosition(player.position, player.total_score, player.division, rankThresholds);
                return (
                  <tr key={player.id} className="border-b border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-8 w-8 rounded-full overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
                          <img
                            src={`/api/roblox/avatar/${encodeURIComponent(player.player_name)}`}
                            alt={player.player_name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                          <span>{player.player_name}</span>
                          <a
                            href={`https://www.roblox.com/users/profile?username=${encodeURIComponent(player.player_name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`ดูโปรไฟล์ Roblox ของ ${player.player_name}`}
                            className="text-text-secondary/50 hover:text-accent-gold transition-colors inline-flex p-0.5 rounded hover:bg-white/5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-text-secondary">
                        {finalPosition}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-text-secondary">
                        {player.division}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono text-lg font-bold text-accent-gold">
                        {player.total_score.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-text-secondary">
                      {new Date(player.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openHistory(player)}
                          className="rounded-lg bg-blue-500/10 p-2 text-blue-400 transition-colors hover:bg-blue-500/20"
                          title="ดูประวัติคะแนน"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditPlayer(player)}
                          className="rounded-lg bg-accent-cyan/10 p-2 text-accent-cyan transition-colors hover:bg-accent-cyan/20"
                          title="แก้ไขผู้เล่น"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(player)}
                          className="rounded-lg bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
                          title="ลบผู้เล่น"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
