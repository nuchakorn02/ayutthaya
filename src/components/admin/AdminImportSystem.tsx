import React from 'react';
import { ImportSession, ImportLog } from '@/lib/types';
import CsvImporter from '@/components/CsvImporter';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AdminImportSystemProps {
  handleImportComplete: () => void;
  importSessions: ImportSession[];
  selectedSession: ImportSession | null;
  setSelectedSession: (s: ImportSession | null) => void;
  sessionLogs: ImportLog[];
  sessionsLoading: boolean;
  sessionLogsLoading: boolean;
  sessionSearchQuery: string;
  setSessionSearchQuery: (val: string) => void;
  sessionFilterType: 'all' | 'updates' | 'new' | 'resigned';
  setSessionFilterType: (val: 'all' | 'updates' | 'new' | 'resigned') => void;
  handleRollbackSession: (session: ImportSession) => void;
  rollingBackSessionId: string | null;
  rollbackProgress: number;
}

export default function AdminImportSystem({
  handleImportComplete,
  importSessions,
  selectedSession,
  setSelectedSession,
  sessionLogs,
  sessionsLoading,
  sessionLogsLoading,
  sessionSearchQuery,
  setSessionSearchQuery,
  sessionFilterType,
  setSessionFilterType,
  handleRollbackSession,
  rollingBackSessionId,
  rollbackProgress
}: AdminImportSystemProps) {
  
  const divisionColors: Record<string, string> = {
    'คณะผู้บริหาร': 'text-purple-400',
    'กองทัพธรณินพิทักษ์': 'text-violet-400',
    'กองทัพมหาเสือพิทักษ์': 'text-amber-500',
    'กองทัพอาทมาต': 'text-zinc-400',
    'กองพระตำรวจหลวง': 'text-amber-500',
    'กองทัพที่ 1 ปัญจะซันยะ': 'text-slate-300',
    'กองทัพที่ 2 วัชรนาถ': 'text-rose-400',
    'กองทัพที่ 3 ปุณฑริก': 'text-emerald-400',
    'กองทัพที่ 4 เกาโมทก': 'text-sky-400',
  };

  return (
    <>
      {/* Section 3: CSV Import */}
      <section className="mb-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/15 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
            <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text-primary">นำเข้าไฟล์รายชื่อและอัปเดตคะแนน (CSV)</h2>
        </div>
        <CsvImporter onImportComplete={handleImportComplete} />
      </section>

      {/* Section 4: Individual Import Delta History */}
      <section className="mb-10 animate-slide-up" style={{ animationDelay: '0.25s' }}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">ประวัติการนำเข้าไฟล์ และสถานะรายบุคคล</h2>
            <p className="text-[10px] text-text-secondary mt-1">
              แสดงการเพิ่ม/ลดคะแนนจากการนำเข้าไฟล์แต่ละครั้ง (ย้อนกลับได้)
            </p>
          </div>
        </div>

        {sessionsLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
            {/* Left Column: Import Sessions List */}
            <div className="lg:col-span-3 flex flex-col gap-2 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
              {importSessions.length === 0 ? (
                <div className="glass-card p-5 text-center text-xs text-text-secondary">
                  ไม่พบประวัติการนำเข้าไฟล์
                </div>
              ) : (
                importSessions.map((session) => {
                  const isSelected = selectedSession?.id === session.id;
                  const formattedDate = new Date(session.created_at).toLocaleString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className={`relative overflow-hidden glass-card p-4 text-left transition-all duration-300 border ${
                        isSelected 
                          ? 'border-accent-gold shadow-[0_0_15px_rgba(212,175,55,0.15)] bg-accent-gold/5 scale-[1.02] z-10' 
                          : 'border-white/5 hover:border-white/20 hover:bg-white/[0.03]'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-12 h-12 bg-accent-gold/10 rounded-bl-full flex items-center justify-center">
                          <span className="text-accent-gold text-xs font-bold pl-3 pb-3">✓</span>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <span className="text-lg">📁</span>
                        <div className="pr-4">
                          <p className={`font-bold text-sm truncate ${isSelected ? 'text-accent-gold' : 'text-text-primary'}`}>
                            {session.filename}
                          </p>
                          <p className="text-[10px] text-text-secondary mt-1">{formattedDate}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-[10px] font-mono font-semibold text-text-secondary border-t border-white/5 pt-2">
                        <span className="bg-green-500/10 text-green-400 border border-green-500/15 px-2 py-0.5 rounded">
                          เพิ่มใหม่: +{session.imported_count}
                        </span>
                        <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 px-2 py-0.5 rounded">
                          ปรับปรุงแต้ม: {session.updated_count}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Right Column: Individual Deltas in Selected Session */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div className="glass-card p-5 border-white/5 h-full flex flex-col">
                {selectedSession ? (
                  <>
                    {/* Header */}
                    <div className="mb-5 pb-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-accent-gold flex items-center gap-2">
                            <span>🔍</span> เจาะลึกรายชื่อทหารในไฟล์
                          </h3>
                          <p className="text-[10px] text-text-secondary mt-0.5 truncate max-w-[200px]">
                            ไฟล์: {selectedSession.filename}
                          </p>
                        </div>
                        
                        {/* Rollback Session Button */}
                        <button
                          onClick={() => handleRollbackSession(selectedSession)}
                          disabled={rollingBackSessionId === selectedSession.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5
                            px-2.5 py-1 text-[10px] font-bold text-red-400 uppercase tracking-wider
                            transition-all duration-300 hover:border-red-500/50 hover:bg-red-500/10
                            hover:shadow-[0_0_10px_rgba(239,68,68,0.1)] cursor-pointer disabled:opacity-50"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          {rollingBackSessionId === selectedSession.id ? `ย้อนกลับ (${rollbackProgress}%)` : '↩️ ย้อนกลับไฟล์นี้'}
                        </button>
                      </div>
                      
                      {/* Filter Tabs */}
                      <div className="mb-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => setSessionFilterType('all')}
                          className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all border ${sessionFilterType === 'all' ? 'bg-white/20 text-white border-white/50' : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'}`}
                        >
                          📋 ทั้งหมด
                        </button>
                        <button
                          onClick={() => setSessionFilterType('updates')}
                          className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all border ${sessionFilterType === 'updates' ? 'bg-accent-gold/20 text-accent-gold border-accent-gold/50 shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'}`}
                        >
                          🔄 อัปเดตคะแนน
                        </button>
                        <button
                          onClick={() => setSessionFilterType('new')}
                          className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all border ${sessionFilterType === 'new' ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'}`}
                        >
                          🌟 เข้าใหม่
                        </button>
                        <button
                          onClick={() => setSessionFilterType('resigned')}
                          className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all border ${sessionFilterType === 'resigned' ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'}`}
                        >
                          💔 ลาออก
                        </button>
                      </div>

                      {/* Search Input for individual in import */}
                      <div className="relative w-full sm:w-64 mb-5">
                        <input
                          type="text"
                          value={sessionSearchQuery}
                          onChange={(e) => setSessionSearchQuery(e.target.value)}
                          placeholder="ค้นหารายชื่อทหาร..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-gold transition-colors font-sans pr-8"
                        />
                        <span className="absolute right-2.5 top-2 text-text-secondary text-xs">🔍</span>
                      </div>
                    </div>

                    {/* Rollback Progress Bar */}
                    {rollingBackSessionId === selectedSession.id && (
                      <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-pulse">
                        <div className="flex justify-between text-xs text-red-400 mb-2">
                          <span className="font-bold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse-glow" />
                            กำลังย้อนกลับฐานข้อมูล (ลบกำลังพลใหม่ & คืนค่าคะแนนเดิม)...
                          </span>
                          <span className="font-mono text-sm">{rollbackProgress}%</span>
                        </div>
                        <div className="w-full bg-[#1c0c0c] border border-red-500/15 rounded-full h-2.5 overflow-hidden p-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
                          <div
                            className="bg-gradient-to-r from-red-600 to-red-500 h-full rounded-full transition-all duration-300 relative overflow-hidden"
                            style={{ width: `${rollbackProgress}%` }}
                          >
                            <div 
                              className="absolute inset-0" 
                              style={{ 
                                backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer-gold 2s infinite'
                              }} 
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Table View */}
                    {sessionLogsLoading ? (
                      <div className="py-20 flex justify-center">
                        <LoadingSpinner />
                      </div>
                    ) : (() => {
                      const filteredLogs = sessionLogs.filter((log) => {
                        const matchesSearch = log.player_name.toLowerCase().includes(sessionSearchQuery.toLowerCase());
                        if (!matchesSearch) return false;
                        
                        const isNew = log.old_score === 0;
                        const isResigned = log.new_score === -999;
                        
                        if (sessionFilterType === 'new') return isNew && !isResigned;
                        if (sessionFilterType === 'resigned') return isResigned;
                        if (sessionFilterType === 'updates') return !isNew && !isResigned;
                        
                        return true; // 'all'
                      });

                      if (filteredLogs.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-20 text-center text-xs text-text-secondary">
                            <span>📭</span>
                            <p className="mt-2">ไม่พบรายชื่อทหารที่ตรงกับเงื่อนไขการค้นหา/ตัวกรอง</p>
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-white/5 text-left text-text-secondary text-xs">
                                <th className="pb-2 text-xs font-semibold text-text-secondary">ชื่อทหาร</th>
                                <th className="pb-2 text-xs font-semibold text-text-secondary">กองทัพ</th>
                                <th className="pb-2 text-center text-xs font-semibold text-text-secondary">แต้มเดิม</th>
                                <th className="pb-2 text-center text-xs font-semibold text-text-secondary">สถานะ</th>
                                <th className="pb-2 text-right text-xs font-semibold text-text-secondary">แต้มใหม่</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredLogs.map((log) => {
                                const isNew = log.old_score === 0 && log.new_score !== -999;
                                const isResigned = log.new_score === -999;
                                const diffSign = log.score_diff > 0 ? '+' : '';
                                
                                let diffColor = log.score_diff > 0 
                                  ? 'text-green-400 bg-green-500/10 border-green-500/20' 
                                  : log.score_diff < 0 
                                    ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                    : 'text-text-secondary bg-white/5 border-white/10';
                                    
                                if (isNew) diffColor = 'text-green-400 bg-green-500/10 border-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.3)]';
                                if (isResigned) diffColor = 'text-red-400 bg-red-500/10 border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.3)]';

                                return (
                                  <tr key={log.id} className={`border-b border-white/5 text-xs transition-colors ${isResigned ? 'opacity-80 bg-red-500/[0.03]' : isNew ? 'bg-green-500/[0.03]' : 'hover:bg-white/[0.02]'}`}>
                                    <td className="py-2.5 font-medium text-text-primary flex items-center gap-1.5">
                                      {isNew && <span className="text-[10px]">🌟</span>}
                                      {isResigned && <span className="text-[10px]">💔</span>}
                                      {log.player_name}
                                    </td>
                                    <td className="py-2.5">
                                      <span className={`font-semibold ${divisionColors[log.division] || 'text-text-secondary'} ${isResigned ? 'line-through opacity-50' : ''}`}>
                                        {log.division.replace('กองทัพที่ ', 'ทัพ ')}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-center font-mono text-text-secondary">
                                      {isNew ? '-' : log.old_score}
                                    </td>
                                    <td className="py-2.5 text-center">
                                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold font-mono border ${diffColor}`}>
                                        {isResigned ? 'ลาออก' : isNew ? 'เข้าใหม่' : `${diffSign}${log.score_diff}`}
                                      </span>
                                    </td>
                                    <td className={`py-2.5 text-right font-mono font-bold ${isResigned ? 'text-red-400' : 'text-accent-gold'}`}>
                                      {isResigned ? 'ลาออก' : log.new_score}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-xs text-text-secondary">
                    <span>👈</span>
                    <p className="mt-2">โปรดเลือกประวัติการนำเข้าไฟล์ด้านซ้ายเพื่อดูสถิติเจาะลึกรายบุคคล</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
