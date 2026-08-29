import React from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

export interface AuditLog {
  id: string;
  old_score: number;
  new_score: number;
  score_diff: number;
  reason?: string | null;
  updated_at: string;
  players: {
    player_name: string;
    division: string;
  } | null;
}

interface AdminAuditLogsProps {
  logs: AuditLog[];
  loading: boolean;
}

export default function AdminAuditLogs({ logs, loading }: AdminAuditLogsProps) {
  return (
    <section className="mb-10 animate-slide-up" style={{ animationDelay: '0.25s' }}>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-gold/15 shadow-[0_0_10px_rgba(212,175,55,0.1)]">
          <svg className="h-4 w-4 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-text-primary">บันทึกประวัติการปรับแต้มแอดมิน (Live Activity)</h2>
        <span className="ml-auto rounded-full bg-white/5 px-3 py-1 text-xs font-mono text-text-secondary">
          30 รายการล่าสุด
        </span>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-12">
          <p className="text-text-secondary">ยังไม่มีบันทึกประวัติกิจกรรมในระบบ</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-text-secondary uppercase">
                    เวลาที่ดำเนินการ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-text-secondary uppercase">
                    ทหารรักษาพระองค์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-text-secondary uppercase">
                    สังกัดกองทัพ
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold tracking-wider text-text-secondary uppercase">
                    กิจกรรม
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-text-secondary uppercase">
                    เหตุผล
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold tracking-wider text-text-secondary uppercase">
                    คะแนนสะสมใหม่
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const formattedTime = new Date(log.updated_at).toLocaleString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });
                  const diffSign = log.score_diff > 0 ? '+' : '';
                  const diffColor = log.score_diff > 0 ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20';

                  return (
                    <tr key={log.id} className="border-b border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-text-secondary">
                        {formattedTime}
                      </td>
                      <td className="px-6 py-4 font-medium text-text-primary">
                        {log.players?.player_name || 'ไม่ทราบชื่อ'}
                      </td>
                      <td className="px-6 py-4 text-xs text-text-secondary">
                        {log.players?.division || 'ไม่ทราบสังกัด'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold font-mono ${diffColor}`}>
                          {diffSign}{log.score_diff.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} แต้ม
                        </span>
                      </td>
                      <td className="px-6 py-4 text-left text-xs text-text-secondary italic">
                        {log.reason || <span className="opacity-30">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-accent-gold">
                        {log.new_score.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
