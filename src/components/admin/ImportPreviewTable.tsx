'use client';

import { useState } from 'react';
import type { ImportPreview } from '@/lib/types';
import { paginatePreviewRows } from '@/lib/import/previewPagination.mjs';

interface ImportPreviewTableProps {
  preview: ImportPreview;
}

const ACTION_LABELS: Record<ImportPreview['rows'][number]['action'], string> = {
  new: 'ใหม่',
  update: 'อัปเดต',
  retire: 'ปลดประจำการ',
  error: 'ข้อผิดพลาด',
};

const ACTION_CLASSES: Record<ImportPreview['rows'][number]['action'], string> = {
  new: 'text-accent-gold',
  update: 'text-accent-cyan',
  retire: 'text-red-400',
  error: 'text-red-400',
};

export default function ImportPreviewTable({ preview }: ImportPreviewTableProps) {
  const [page, setPage] = useState(1);
  const { pageRows, totalPages, hasPrev, hasNext, start, end } = paginatePreviewRows(
    preview.rows,
    page,
    25
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 text-center text-sm">
        <div className="rounded-lg bg-bg-secondary p-2">
          <p className="text-accent-gold font-bold">{preview.counts.new}</p>
          <p className="text-xs text-text-secondary">ใหม่</p>
        </div>
        <div className="rounded-lg bg-bg-secondary p-2">
          <p className="text-accent-cyan font-bold">{preview.counts.updated}</p>
          <p className="text-xs text-text-secondary">อัปเดต</p>
        </div>
        <div className="rounded-lg bg-bg-secondary p-2">
          <p className="text-red-400 font-bold">{preview.counts.retired}</p>
          <p className="text-xs text-text-secondary">ปลดประจำการ</p>
        </div>
        <div className="rounded-lg bg-bg-secondary p-2">
          <p className="text-text-secondary font-bold">{preview.counts.errors}</p>
          <p className="text-xs text-text-secondary">ข้อผิดพลาด</p>
        </div>
      </div>

      {preview.rows.length > 0 && (
        <div className="rounded-lg border border-white/10">
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-bg-secondary text-text-secondary">
                <tr>
                  <th className="p-2 text-left">แถว</th>
                  <th className="p-2 text-left">ชื่อ</th>
                  <th className="p-2 text-left">กองทัพ</th>
                  <th className="p-2 text-left">การกระทำ</th>
                  <th className="p-2 text-right">คะแนนปัจจุบัน</th>
                  <th className="p-2 text-right">คะแนนใหม่</th>
                  <th className="p-2 text-right">+/-</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, idx) => (
                  <tr key={`${row.source_row ?? idx}-${row.player_name}-${idx}`} className="border-t border-white/5">
                    <td className="p-2">{row.source_row ?? '-'}</td>
                    <td className="p-2">{row.player_name}</td>
                    <td className="p-2">{row.division}</td>
                    <td className="p-2">
                      <span className={ACTION_CLASSES[row.action]}>
                        {ACTION_LABELS[row.action]}
                      </span>
                      {row.message && (
                        <span className="ml-2 text-text-secondary/70">{row.message}</span>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      {row.current_score?.toLocaleString() ?? '-'}
                    </td>
                    <td className="p-2 text-right">
                      {row.proposed_score?.toLocaleString() ?? '-'}
                    </td>
                    <td className={`p-2 text-right ${row.score_diff && row.score_diff > 0 ? 'text-green-400' : row.score_diff && row.score_diff < 0 ? 'text-red-400' : 'text-text-secondary'}`}>
                      {row.score_diff !== null && row.score_diff !== undefined
                        ? `${row.score_diff > 0 ? '+' : ''}${row.score_diff.toLocaleString()}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 p-2">
              <p className="text-xs text-text-secondary">
                แถว {start}–{end} จาก {preview.rows.length} แถว
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={!hasPrev}
                  className="rounded-lg bg-white/5 px-3 py-1 text-xs text-text-primary hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  ก่อนหน้า
                </button>
                <span className="text-xs text-text-secondary">
                  หน้า {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNext}
                  className="rounded-lg bg-white/5 px-3 py-1 text-xs text-text-primary hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {preview.errors.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-red-400">ข้อผิดพลาด:</p>
          {preview.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-400/80">
              {err.source_row ? `แถวที่ ${err.source_row}: ` : ''}{err.reason}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
