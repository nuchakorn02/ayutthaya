'use client';

import { ScoreHistory } from '@/lib/types';
import LoadingSpinner from './LoadingSpinner';

interface ScoreHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  division: string;
  historyData: ScoreHistory[];
  isLoading: boolean;
}

export default function ScoreHistoryModal({
  isOpen,
  onClose,
  playerName,
  division,
  historyData,
  isLoading
}: ScoreHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c1e] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gold/15 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <span className="text-xl">📜</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">ประวัติแต้มรบรายบุคคล</h2>
              <p className="text-xs font-medium text-text-secondary mt-0.5">
                <span className="text-accent-gold">{playerName}</span> • {division.replace('กองทัพที่ ', 'ทัพ ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : historyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-text-secondary">
              <span className="text-4xl opacity-50 mb-4">📭</span>
              <p>ไม่พบประวัติการเปลี่ยนแปลงคะแนนของกำลังพลนายนี้</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-white/10 ml-4 space-y-6 pb-4 pt-2">
              {historyData.map((log) => {
                const isRetirement = log.new_score === -999;
                const diffSign = log.score_diff > 0 ? '+' : '';
                const isPositive = log.score_diff > 0;
                const isNegative = log.score_diff < 0;
                const date = new Date(log.updated_at);
                
                return (
                  <div key={log.id} className="relative pl-6 group">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-[#0c0c1e] transition-transform group-hover:scale-125 ${
                      isRetirement ? 'bg-zinc-500 shadow-[0_0_8px_rgba(113,113,122,0.6)]' :
                      isPositive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                      isNegative ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                      'bg-zinc-400'
                    }`} />
                    
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono font-medium text-text-secondary">
                          {date.toLocaleDateString('th-TH')} • {date.toLocaleTimeString('th-TH')} น.
                        </span>
                        {isRetirement ? (
                          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border text-zinc-400 bg-zinc-500/10 border-zinc-500/20">
                            💔 พ้นสภาพ
                          </span>
                        ) : (
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold font-mono border ${
                            isPositive ? 'text-green-400 bg-green-500/10 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' :
                            isNegative ? 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]' :
                            'text-zinc-400 bg-white/5 border-white/10'
                          }`}>
                            {diffSign}{log.score_diff}
                          </span>
                        )}
                      </div>
                      
                      {/* Score before/after — ซ่อนถ้าเป็น retirement event */}
                      {isRetirement ? (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-xs text-zinc-400">สถานะเดิม:</span>
                          <span className="font-mono text-text-primary font-medium">{log.old_score.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} แต้ม</span>
                          <span className="text-white/20 mx-1">→</span>
                          <span className="font-mono font-bold text-zinc-400 text-sm">ปลดประจำการ</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-5 text-sm">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">แต้มเดิม</span>
                            <span className="font-mono text-text-primary font-medium">{log.old_score.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center text-white/20 mt-4">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-accent-gold uppercase tracking-wider mb-0.5">แต้มใหม่</span>
                            <span className="font-mono font-bold text-accent-gold text-lg">{log.new_score.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Reason (if any) */}
                      {log.reason && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <span className="text-accent-cyan">📝</span> เหตุผล
                          </p>
                          <p className="text-xs font-medium text-text-primary bg-black/20 p-2.5 rounded-lg border border-white/5">
                            {log.reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
